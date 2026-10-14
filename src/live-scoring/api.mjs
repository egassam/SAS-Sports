// School-entered live scoring: the API behind /score (the scorer app),
// /scoreboard (the TV display) and the public app's "Live from the field" cards.
//
// Storage is D1 (binding SCORE_DB). A Durable Object would push updates over
// WebSockets, but Cloudflare does not build branch previews for a Worker that
// implements one, and every school gate depends on previews; the screens poll
// instead (about once a second), which D1 serves consistently.
//
// Access: only people a school allows. A scorer signs in with the school, the
// school's code, a username and a password; a school admin adds scorers. The
// school code and passwords are stored as PBKDF2 hashes, never in the clear.

import {SPORTS,SCORING_SPORTS,initialState,applyAction,gameSummary} from './sports.mjs';

const PBKDF2_ITERATIONS=100000; // the Workers maximum
const SESSION_MS=14*60*60*1000; // one long game day
const LOGIN_WINDOW_MS=15*60*1000,LOGIN_MAX_FAILURES=8;
const HISTORY_KEEP=60,RECENT_ACTION_IDS=40;
const ACTIVE_FINAL_MS=6*60*60*1000; // a final stays on the public card for 6 h

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fail=(detail,status=400)=>json({detail},status);

const SCHEMA=[
  `CREATE TABLE IF NOT EXISTS score_schools(school_id TEXT PRIMARY KEY,name TEXT NOT NULL,code_hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS score_users(school_id TEXT NOT NULL,username TEXT NOT NULL,display_name TEXT,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'scorer',created_at INTEGER NOT NULL,created_by TEXT,PRIMARY KEY(school_id,username))`,
  `CREATE TABLE IF NOT EXISTS score_sessions(token_hash TEXT PRIMARY KEY,school_id TEXT NOT NULL,username TEXT NOT NULL,expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS score_login_failures(key TEXT PRIMARY KEY,count INTEGER NOT NULL,window_start INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS score_games(id TEXT PRIMARY KEY,school_id TEXT NOT NULL,sport TEXT NOT NULL,home_name TEXT NOT NULL,away_name TEXT NOT NULL,school_side TEXT NOT NULL,start_at TEXT,venue TEXT,status TEXT NOT NULL,state_json TEXT NOT NULL,version INTEGER NOT NULL,created_by TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT)`,
  `CREATE INDEX IF NOT EXISTS score_games_school ON score_games(school_id,updated_at)`,
  `CREATE TABLE IF NOT EXISTS score_history(game_id TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL,state_json TEXT NOT NULL,PRIMARY KEY(game_id,version))`,
];
let schemaReady=null;
function ensureSchema(db){
  schemaReady??=db.batch(SCHEMA.map(sql=>db.prepare(sql))).catch(error=>{schemaReady=null;throw error});
  return schemaReady;
}
export function resetSchemaCacheForTests(){schemaReady=null}

// --- crypto -----------------------------------------------------------------
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64url=bytes=>b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function sha256Hex(text){const d=await crypto.subtle.digest('SHA-256',enc.encode(text));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function pbkdf2(secret,salt,iterations){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256));
}
export async function hashSecret(secret,{iterations=PBKDF2_ITERATIONS,salt=crypto.getRandomValues(new Uint8Array(16))}={}){
  return`pbkdf2$${iterations}$${b64(salt)}$${b64(await pbkdf2(secret,salt,iterations))}`;
}
function sameBytes(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0}
export async function verifySecret(secret,stored){
  const [kind,iter,salt,hash]=String(stored||'').split('$');
  if(kind!=='pbkdf2'||!salt||!hash)return false;
  return sameBytes(await pbkdf2(String(secret??''),unb64(salt),Number(iter)),unb64(hash));
}
// Spends the same work for an unknown user as for a wrong password.
const DUMMY_HASH='pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

// --- input ------------------------------------------------------------------
const cleanText=(v,max)=>String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const cleanUsername=v=>String(v??'').trim().toLowerCase();
const USERNAME=/^[a-z0-9][a-z0-9._-]{2,31}$/;
const SCHOOL_ID=/^[a-z0-9-]{2,64}$/;
async function body(request){try{const b=await request.json();return b&&typeof b==='object'?b:{}}catch{return{}}}

// --- sessions ---------------------------------------------------------------
async function session(request,db){
  const m=(request.headers.get('authorization')||'').match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/);
  if(!m)return null;
  const row=await db.prepare(`SELECT s.school_id,s.username,s.expires_at,u.role,u.display_name FROM score_sessions s JOIN score_users u ON u.school_id=s.school_id AND u.username=s.username WHERE s.token_hash=?`).bind(await sha256Hex(m[1])).first();
  if(!row||row.expires_at<Date.now())return null;
  return{school_id:row.school_id,username:row.username,role:row.role,display_name:row.display_name||row.username};
}

async function loginFailures(db,keys,now){
  const rows=(await db.prepare(`SELECT key,count,window_start FROM score_login_failures WHERE key IN (${keys.map(()=>'?').join(',')})`).bind(...keys).all()).results||[];
  return rows.some(r=>now-r.window_start<LOGIN_WINDOW_MS&&r.count>=LOGIN_MAX_FAILURES);
}
async function noteFailure(db,keys,now){
  await db.batch(keys.map(key=>db.prepare(`INSERT INTO score_login_failures(key,count,window_start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN ?-window_start<? THEN count+1 ELSE 1 END,window_start=CASE WHEN ?-window_start<? THEN window_start ELSE ? END`).bind(key,now,now,LOGIN_WINDOW_MS,now,LOGIN_WINDOW_MS,now)));
}

async function login(request,db){
  const b=await body(request),now=Date.now();
  const schoolId=String(b.school||'').trim(),username=cleanUsername(b.username);
  if(!SCHOOL_ID.test(schoolId)||!USERNAME.test(username)||!b.code||!b.password)return fail('School, school code, username and password are required.');
  const ip=request.headers.get('cf-connecting-ip')||'unknown';
  const keys=[`user:${schoolId}:${username}`,`ip:${ip}`];
  if(await loginFailures(db,keys,now))return fail('Too many sign-in attempts. Wait 15 minutes and try again.',429);
  const school=await db.prepare(`SELECT school_id,name,code_hash,enabled FROM score_schools WHERE school_id=?`).bind(schoolId).first();
  const user=school?await db.prepare(`SELECT username,display_name,password_hash,role FROM score_users WHERE school_id=? AND username=?`).bind(schoolId,username).first():null;
  const codeOk=await verifySecret(String(b.code).trim().toUpperCase(),school?.code_hash||DUMMY_HASH);
  const passwordOk=await verifySecret(String(b.password),user?.password_hash||DUMMY_HASH);
  if(!school||!school.enabled||!user||!codeOk||!passwordOk){await noteFailure(db,keys,now);return fail('Those sign-in details do not match.',401)}
  const token=b64url(crypto.getRandomValues(new Uint8Array(32)));
  await db.batch([
    db.prepare(`DELETE FROM score_sessions WHERE expires_at<?`).bind(now),
    db.prepare(`INSERT INTO score_sessions(token_hash,school_id,username,expires_at) VALUES(?,?,?,?)`).bind(await sha256Hex(token),schoolId,username,now+SESSION_MS),
    db.prepare(`DELETE FROM score_login_failures WHERE key=?`).bind(keys[0]),
  ]);
  return json({token,expires_at:now+SESSION_MS,user:{school_id:schoolId,school_name:school.name,username,display_name:user.display_name||username,role:user.role}});
}

// --- games ------------------------------------------------------------------
const newGameId=()=>b64url(crypto.getRandomValues(new Uint8Array(9))).replace(/[-_]/g,'x');

export function publicGame(row,now=Date.now()){
  const state=JSON.parse(row.state_json);
  const {label,score}=gameSummary(row.sport,state,row.status);
  return{
    id:row.id,school_id:row.school_id,sport:row.sport,status:row.status,summary:label,
    home:{name:row.home_name,score:score.home,is_school:row.school_side==='home'},
    away:{name:row.away_name,score:score.away,is_school:row.school_side==='away'},
    start_at:row.start_at,venue:row.venue,state,version:row.version,updated_at:row.updated_at,
    source:'school-scorekeeper',source_label:'Reported live by the school scorekeeper',
    server_now:now,
  };
}

async function listGames(url,db){
  const schoolId=String(url.searchParams.get('school')||'');
  if(!SCHOOL_ID.test(schoolId))return fail('school is required');
  const now=Date.now(),all=url.searchParams.get('all')==='1';
  // Public view: live games, today's scheduled games, finals from the last 6 h.
  const rows=(await db.prepare(`SELECT * FROM score_games WHERE school_id=? AND updated_at>? ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,updated_at DESC LIMIT 50`).bind(schoolId,now-(all?30*24*60*60*1000:36*60*60*1000)).all()).results||[];
  const games=rows.filter(r=>all||r.status==='live'||r.status==='scheduled'||now-r.updated_at<ACTIVE_FINAL_MS).map(r=>publicGame(r,now));
  return json({school_id:schoolId,games,server_now:now});
}

async function getGame(id,url,db){
  const row=await db.prepare(`SELECT * FROM score_games WHERE id=?`).bind(id).first();
  if(!row)return fail('Game not found.',404);
  const since=Number(url.searchParams.get('since'));
  // Pollers send the version they hold; an unchanged game answers in a few bytes.
  if(Number.isFinite(since)&&since===row.version)return json({id,version:row.version,unchanged:true,server_now:Date.now()});
  return json(publicGame(row));
}

async function createGame(request,db,user){
  const b=await body(request);
  const sport=String(b.sport||'');
  if(!SPORTS[sport])return fail(`Sport must be one of: ${SCORING_SPORTS.join(', ')}.`);
  const opponent=cleanText(b.opponent,40);
  if(!opponent)return fail('Opponent is required.');
  const side=b.home_away==='away'?'away':'home';
  const school=await db.prepare(`SELECT name FROM score_schools WHERE school_id=?`).bind(user.school_id).first();
  const schoolName=cleanText(b.school_name,40)||school?.name||user.school_id;
  const home=side==='home'?schoolName:opponent,away=side==='home'?opponent:schoolName;
  const now=Date.now(),id=newGameId();
  const startAt=/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(String(b.start_at||''))?b.start_at:null;
  const state=initialState(sport);
  if(sport!=='Soccer'&&Number(b.innings)>=1)state.innings_scheduled=Math.min(12,Math.trunc(Number(b.innings)));
  if(sport==='Soccer'&&Number(b.half_minutes)>=10)state.half_minutes=Math.min(60,Math.trunc(Number(b.half_minutes)));
  await db.prepare(`INSERT INTO score_games(id,school_id,sport,home_name,away_name,school_side,start_at,venue,status,state_json,version,created_by,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,'scheduled',?,1,?,?,?,?)`)
    .bind(id,user.school_id,sport,home,away,side,startAt,cleanText(b.venue,60)||null,JSON.stringify(state),user.username,now,now,user.username).run();
  return json(publicGame(await db.prepare(`SELECT * FROM score_games WHERE id=?`).bind(id).first()),201);
}

// Applies one action with optimistic concurrency: two scorers tapping at once
// both land, because each retry re-applies its action to the newest state.
async function act(request,id,db,user){
  const b=await body(request);
  const action=b.action&&typeof b.action==='object'?b.action:{type:b.type,...b};
  const actionId=cleanText(b.action_id,40)||null;
  for(let attempt=0;attempt<4;attempt++){
    const row=await db.prepare(`SELECT * FROM score_games WHERE id=?`).bind(id).first();
    if(!row)return fail('Game not found.',404);
    if(row.school_id!==user.school_id)return fail('This game belongs to another school.',403);
    const stored=JSON.parse(row.state_json);
    const recent=stored._recent||[];
    // A retried request (weak signal) must not count a run twice.
    if(actionId&&recent.includes(actionId))return json(publicGame(row));
    let next;
    if(action.type==='undo'){
      const prev=await db.prepare(`SELECT version,status,state_json FROM score_history WHERE game_id=? AND version<? ORDER BY version DESC LIMIT 1`).bind(id,row.version).first();
      if(!prev)return fail('Nothing to undo.',409);
      const state=JSON.parse(prev.state_json);
      next={state,status:prev.status,undo_from:prev.version};
    }else{
      try{next=applyAction(row.sport,stored,row.status,action)}catch(error){return fail(error.message)}
    }
    delete next.state._recent;
    next.state._recent=actionId?[...recent,actionId].slice(-RECENT_ACTION_IDS):recent;
    const now=Date.now(),version=row.version+1,stateJson=JSON.stringify(next.state);
    const statements=[
      db.prepare(`UPDATE score_games SET state_json=?,status=?,version=?,updated_at=?,updated_by=? WHERE id=? AND version=?`).bind(stateJson,next.status,version,now,user.username,id,row.version),
    ];
    if(action.type==='undo'){
      // Undo steps back through history: drop the entries it passed over.
      statements.push(db.prepare(`DELETE FROM score_history WHERE game_id=? AND version>=?`).bind(id,next.undo_from));
    }else{
      statements.push(db.prepare(`INSERT OR REPLACE INTO score_history(game_id,version,status,state_json) VALUES(?,?,?,?)`).bind(id,row.version,row.status,row.state_json));
      statements.push(db.prepare(`DELETE FROM score_history WHERE game_id=? AND version<?`).bind(id,row.version-HISTORY_KEEP));
    }
    const results=await db.batch(statements);
    if((results[0]?.meta?.changes??0)===1){
      return json(publicGame({...row,state_json:stateJson,status:next.status,version,updated_at:now},now));
    }
  }
  return fail('The game changed while saving. Try again.',409);
}

async function deleteGame(id,db,user){
  const row=await db.prepare(`SELECT school_id FROM score_games WHERE id=?`).bind(id).first();
  if(!row)return fail('Game not found.',404);
  if(row.school_id!==user.school_id)return fail('This game belongs to another school.',403);
  if(user.role!=='admin')return fail('Only a school admin can delete a game.',403);
  await db.batch([db.prepare(`DELETE FROM score_games WHERE id=?`).bind(id),db.prepare(`DELETE FROM score_history WHERE game_id=?`).bind(id)]);
  return json({deleted:id});
}

// --- school admin -----------------------------------------------------------
async function listUsers(db,user){
  const rows=(await db.prepare(`SELECT username,display_name,role,created_at,created_by FROM score_users WHERE school_id=? ORDER BY role,username`).bind(user.school_id).all()).results||[];
  return json({users:rows});
}
async function addUser(request,db,user){
  const b=await body(request);
  const username=cleanUsername(b.username),password=String(b.password||'');
  if(!USERNAME.test(username))return fail('Username: 3-32 letters, numbers, dots, dashes or underscores.');
  if(password.length<10)return fail('Password must be at least 10 characters.');
  const role=b.role==='admin'?'admin':'scorer';
  const now=Date.now();
  await db.prepare(`INSERT INTO score_users(school_id,username,display_name,password_hash,role,created_at,created_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(school_id,username) DO UPDATE SET display_name=excluded.display_name,password_hash=excluded.password_hash,role=excluded.role`)
    .bind(user.school_id,username,cleanText(b.display_name,40)||null,await hashSecret(password),role,now,user.username).run();
  // A reset password signs that person out everywhere.
  await db.prepare(`DELETE FROM score_sessions WHERE school_id=? AND username=?`).bind(user.school_id,username).run();
  return json({username,role},201);
}
async function removeUser(username,db,user){
  username=cleanUsername(username);
  if(username===user.username)return fail('You cannot remove yourself.');
  await db.batch([
    db.prepare(`DELETE FROM score_users WHERE school_id=? AND username=?`).bind(user.school_id,username),
    db.prepare(`DELETE FROM score_sessions WHERE school_id=? AND username=?`).bind(user.school_id,username),
  ]);
  return json({removed:username});
}
async function changeOwnPassword(request,db,user){
  const b=await body(request);
  const row=await db.prepare(`SELECT password_hash FROM score_users WHERE school_id=? AND username=?`).bind(user.school_id,user.username).first();
  if(!row||!await verifySecret(String(b.current_password||''),row.password_hash))return fail('Current password is wrong.',401);
  const password=String(b.new_password||'');
  if(password.length<10)return fail('Password must be at least 10 characters.');
  await db.prepare(`UPDATE score_users SET password_hash=? WHERE school_id=? AND username=?`).bind(await hashSecret(password),user.school_id,user.username).run();
  return json({changed:true});
}
async function changeSchoolCode(request,db,user){
  const b=await body(request);
  const code=String(b.code||'').trim().toUpperCase();
  if(!/^[A-Z0-9-]{8,32}$/.test(code))return fail('School code: 8-32 letters, numbers or dashes.');
  await db.prepare(`UPDATE score_schools SET code_hash=? WHERE school_id=?`).bind(await hashSecret(code),user.school_id).run();
  return json({changed:true});
}

// --- router -----------------------------------------------------------------
export async function handleLiveScoring(request,env,url){
  if(!url.pathname.startsWith('/api/score/'))return null;
  if(!env.SCORE_DB)return fail('Live scoring is not configured on this deployment.',503);
  try{return await route(request,env.SCORE_DB,url)}
  catch(error){console.error('live scoring',error);return fail('Live scoring is unavailable right now. Try again.',503)}
}

async function route(request,db,url){
  const path=url.pathname;
  await ensureSchema(db);
  const method=request.method;
  const parts=path.slice('/api/score/'.length).split('/').filter(Boolean);
  const [head,id,tail]=parts;

  // Public reads.
  if(method==='GET'&&head==='schools'){
    const rows=(await db.prepare(`SELECT school_id,name FROM score_schools WHERE enabled=1 ORDER BY name`).all()).results||[];
    return json({schools:rows,sports:SCORING_SPORTS});
  }
  if(method==='GET'&&head==='games'&&!id)return listGames(url,db);
  if(method==='GET'&&head==='games'&&id&&!tail)return getGame(id,url,db);
  if(method==='POST'&&head==='login')return login(request,db);

  // Everything else needs a signed-in scorer.
  if(method!=='GET'&&method!=='POST'&&method!=='DELETE')return fail('Method not allowed.',405);
  const user=await session(request,db);
  if(!user)return fail('Sign in to score games.',401);
  if(method==='GET'&&head==='me')return json({user});
  if(method==='POST'&&head==='logout'){
    const m=(request.headers.get('authorization')||'').match(/^Bearer\s+(\S+)$/);
    await db.prepare(`DELETE FROM score_sessions WHERE token_hash=?`).bind(await sha256Hex(m[1])).run();
    return json({signed_out:true});
  }
  if(method==='POST'&&head==='password')return changeOwnPassword(request,db,user);
  if(method==='POST'&&head==='games'&&!id)return createGame(request,db,user);
  if(method==='POST'&&head==='games'&&id&&tail==='action')return act(request,id,db,user);
  if(method==='DELETE'&&head==='games'&&id&&!tail)return deleteGame(id,db,user);
  if(head==='users'||head==='school-code'){
    if(user.role!=='admin')return fail('Only a school admin can manage scorekeepers.',403);
    if(method==='GET'&&head==='users')return listUsers(db,user);
    if(method==='POST'&&head==='users')return addUser(request,db,user);
    if(method==='DELETE'&&head==='users'&&id)return removeUser(id,db,user);
    if(method==='POST'&&head==='school-code')return changeSchoolCode(request,db,user);
  }
  return fail('Not found.',404);
}
