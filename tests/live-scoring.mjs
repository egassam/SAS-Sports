// School-entered live scoring: the sport rules and the whole API, run against
// a local SQLite database shaped like D1.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {applyAction,initialState,gameSummary} from '../src/live-scoring/sports.mjs';
import {handleLiveScoring,hashSecret,verifySecret,resetSchemaCacheForTests} from '../src/live-scoring/api.mjs';

// --- a D1 stand-in over node:sqlite ---------------------------------------------
function fakeD1(){
  const sqlite=new DatabaseSync(':memory:');
  const statement=(sql,args=[])=>({
    bind:(...a)=>statement(sql,a),
    async first(){return sqlite.prepare(sql).get(...args)??null},
    async all(){return{results:sqlite.prepare(sql).all(...args)}},
    async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}},
    exec(){if(/^\s*(SELECT)/i.test(sql))return{results:sqlite.prepare(sql).all(...args)};const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}}},
  });
  return{
    sqlite,
    prepare:sql=>statement(sql),
    async batch(list){sqlite.exec('BEGIN');try{const out=list.map(s=>s.exec());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}},
  };
}

// --- sport rules ----------------------------------------------------------------
{
  let s=initialState('Baseball'),status='scheduled';
  const go=(type,extra={})=>({state:s,status}=applyAction('Baseball',s,status,{type,...extra},1000));
  assert.throws(()=>applyAction('Baseball',s,status,{type:'run'}),/start the game first/);
  go('start');assert.equal(status,'live');
  assert.equal(gameSummary('Baseball',s,status).label,'Top 1st · 0 outs');
  go('ball');go('ball');go('strike');assert.deepEqual([s.balls,s.strikes],[2,1]);
  go('foul');go('foul');assert.equal(s.strikes,2,'a foul with two strikes is not strike three');
  go('strike');assert.deepEqual([s.balls,s.strikes,s.outs],[0,0,1],'strike three is an out and resets the count');
  go('ball');go('ball');go('ball');go('ball');assert.deepEqual(s.bases,[true,false,false],'ball four puts the batter on first');
  go('walk');assert.deepEqual(s.bases,[true,true,false],'a walk forces the runner to second');
  go('run');go('run');assert.equal(s.runs.away,2);assert.equal(s.line[0].away,2);
  go('hit');assert.equal(s.hits.away,1);
  go('error');assert.equal(s.errors.home,1,'an error in the top half is charged to the home team');
  go('out');go('out');
  assert.equal(s.half,'bottom');assert.equal(s.outs,0);assert.deepEqual(s.bases,[false,false,false],'three outs clear the bases');
  assert.equal(gameSummary('Baseball',s,status).label,'Bot 1st · 0 outs');
  go('run');assert.equal(s.line[0].home,1);
  go('run_minus',{side:'away'});assert.equal(s.runs.away,1,'a correction for the fielding team lands on its last inning');assert.equal(s.line[0].away,1);
  go('end_half');assert.equal(s.inning,2);assert.equal(s.half,'top');
  go('end_half');assert.equal(s.line[1].away,0,'a scoreless half is recorded as 0');
  go('final');assert.equal(status,'final');assert.equal(gameSummary('Baseball',s,status).label,'Final');
  assert.deepEqual(gameSummary('Baseball',s,status).score,{away:1,home:1});
  assert.throws(()=>applyAction('Baseball',s,status,{type:'run'}),/start the game first/,'a final game takes no score until reopened');
  go('reopen');assert.equal(status,'live');
}
{
  // Extra innings read "Final/8".
  let s=initialState('Softball'),status='scheduled';
  const go=type=>({state:s,status}=applyAction('Softball',s,status,{type},0));
  go('start');for(let i=0;i<14;i++)go('end_half');go('run');go('final');
  assert.equal(gameSummary('Softball',s,status).label,'Final/8');
}
{
  let s=initialState('Soccer'),status='scheduled';
  const go=(type,extra={},now=0)=>({state:s,status}=applyAction('Soccer',s,status,{type,...extra},now));
  go('start',{},10_000);assert.equal(s.clock.running,true);assert.equal(s.clock.started_at,10_000);
  go('goal',{side:'home'});go('goal',{side:'home'});go('goal_minus',{side:'home'});go('goal',{side:'away'});
  assert.deepEqual(gameSummary('Soccer',s,status).score,{away:1,home:1});
  go('clock_stop',{},70_000);assert.equal(s.clock.elapsed_ms,60_000);assert.equal(s.clock.running,false);
  go('next_period');assert.equal(s.clock.elapsed_ms,40*60*1000,'the second half starts at 40:00');
  assert.equal(gameSummary('Soccer',s,status).label,'2nd Half');
  go('next_period');go('next_period');go('next_period');assert.equal(s.period,5);
  go('goal',{side:'away'});assert.equal(s.pks.away,1,'goals in the shootout are penalty kicks');assert.equal(s.goals.away,1);
  go('final');assert.equal(gameSummary('Soccer',s,status).label,'Final (PKs)');
  assert.throws(()=>applyAction('Soccer',s,'live',{type:'goal_kick'}),/unknown action/);
}

// --- hashing ----------------------------------------------------------------------
{
  const h=await hashSecret('MHS-TEST-CODE',{iterations:1000});
  assert.ok(await verifySecret('MHS-TEST-CODE',h));
  assert.ok(!await verifySecret('MHS-TEST-COD',h));
  assert.ok(!h.includes('MHS-TEST-CODE'),'the code is never stored in the clear');
}

// --- API ----------------------------------------------------------------------------
const db=fakeD1();resetSchemaCacheForTests();
const env={SCORE_DB:db};
async function call(method,path,{body,token,ip='1.1.1.1'}={}){
  const url=new URL(`https://local.test${path}`);
  const headers={'content-type':'application/json','cf-connecting-ip':ip};
  if(token)headers.authorization=`Bearer ${token}`;
  const res=await handleLiveScoring(new Request(url,{method,headers,body:body?JSON.stringify(body):undefined}),env,url);
  return{status:res.status,body:await res.json()};
}
assert.equal(await handleLiveScoring(new Request('https://local.test/api/status'),env,new URL('https://local.test/api/status')),null);
assert.equal((await handleLiveScoring(new Request('https://local.test/api/score/schools'),{},new URL('https://local.test/api/score/schools'))).status,503,'no database binding answers 503, not a crash');

await call('GET','/api/score/schools'); // creates the schema
const now=Date.now();
db.sqlite.prepare(`INSERT INTO score_schools(school_id,name,code_hash,enabled,created_at) VALUES(?,?,?,1,?)`).run('manhattan-ks','Manhattan',await hashSecret('MHS-TEST-2026'),now);
db.sqlite.prepare(`INSERT INTO score_schools(school_id,name,code_hash,enabled,created_at) VALUES(?,?,?,1,?)`).run('other-hs','Other',await hashSecret('OTHER-TEST-2026'),now);
db.sqlite.prepare(`INSERT INTO score_users(school_id,username,password_hash,role,created_at) VALUES(?,?,?,?,?)`).run('manhattan-ks','owner',await hashSecret('owner-password-1'),'admin',now);
db.sqlite.prepare(`INSERT INTO score_users(school_id,username,password_hash,role,created_at) VALUES(?,?,?,?,?)`).run('other-hs','rival',await hashSecret('rival-password-1'),'admin',now);

{
  const r=await call('GET','/api/score/schools');
  assert.deepEqual(r.body.schools.map(s=>s.school_id),['manhattan-ks','other-hs']);
  assert.ok(!JSON.stringify(r.body).includes('pbkdf2'),'the school list never carries hashes');
}

// Sign-in needs all four: school, school code, username, password.
const login=(over={})=>call('POST','/api/score/login',{body:{school:'manhattan-ks',code:'mhs-test-2026',username:'Owner',password:'owner-password-1',...over}});
assert.equal((await login({code:'MHS-WRONG-0000'})).status,401);
assert.equal((await login({password:'nope-nope-nope'})).status,401);
assert.equal((await login({school:'other-hs'})).status,401,'a user signs in only to their own school');
assert.equal((await login({code:''})).status,400);
const signedIn=await login();
assert.equal(signedIn.status,200,JSON.stringify(signedIn.body));
const owner=signedIn.body.token;
assert.equal(signedIn.body.user.role,'admin');
assert.ok(!JSON.stringify(db.sqlite.prepare('SELECT * FROM score_sessions').all()).includes(owner),'sessions are stored hashed');

assert.equal((await call('POST','/api/score/games',{body:{sport:'Baseball',opponent:'X'}})).status,401,'scoring needs a sign-in');
assert.equal((await call('POST','/api/score/games',{body:{sport:'Baseball',opponent:'X'},token:'not-a-real-token-at-all-xx'})).status,401);

// Admin adds a scorekeeper; a scorekeeper cannot manage accounts.
assert.equal((await call('POST','/api/score/users',{token:owner,body:{username:'coach.k',password:'short'}})).status,400);
assert.equal((await call('POST','/api/score/users',{token:owner,body:{username:'coach.k',password:'scorer-password-1',display_name:'Coach K'}})).status,201);
const scorer=(await login({username:'coach.k',password:'scorer-password-1'})).body.token;
assert.ok(scorer);
assert.equal((await call('GET','/api/score/users',{token:scorer})).status,403);
assert.deepEqual((await call('GET','/api/score/users',{token:owner})).body.users.map(u=>u.username),['owner','coach.k']);

// Games.
const created=await call('POST','/api/score/games',{token:scorer,body:{sport:'Baseball',opponent:'Junction City <b>',home_away:'home',start_at:'2027-03-30T16:30'}});
assert.equal(created.status,201,JSON.stringify(created.body));
const game=created.body;
assert.equal(game.home.name,'Manhattan');assert.equal(game.away.name,'Junction City b','markup is stripped from names');
assert.equal(game.status,'scheduled');
assert.equal((await call('POST','/api/score/games',{token:scorer,body:{sport:'Curling',opponent:'X'}})).status,400);

const act=(type,extra={},token=scorer,action_id)=>call('POST',`/api/score/games/${game.id}/action`,{token,body:{action:{type,...extra},action_id}});
assert.equal((await act('run')).status,400,'no score before the game starts');
assert.equal((await act('start')).body.status,'live');
await act('run',{},scorer,'tap-1');
const dup=await act('run',{},scorer,'tap-1');
assert.equal(dup.body.away.score,1,'a retried tap with the same id counts once');
await act('run');
let r=await act('out');
assert.equal(r.body.away.score,2);assert.equal(r.body.summary,'Top 1st · 1 out');
r=await act('undo');assert.equal(r.body.summary,'Top 1st · 0 outs','undo steps back one action');
r=await act('undo');assert.equal(r.body.away.score,1);
r=await act('undo');assert.equal(r.body.away.score,0);
r=await act('run');assert.equal(r.body.away.score,1,'scoring resumes after an undo');

// Another school's admin cannot touch this game.
const rival=(await call('POST','/api/score/login',{body:{school:'other-hs',code:'OTHER-TEST-2026',username:'rival',password:'rival-password-1'}})).body.token;
assert.equal((await act('run',{},rival)).status,403);

// Public reads: the list, one game, and the "unchanged" short answer.
const listed=await call('GET','/api/score/games?school=manhattan-ks');
assert.equal(listed.body.games.length,1);assert.equal(listed.body.games[0].status,'live');
assert.equal(listed.body.games[0].source_label,'Reported live by the school scorekeeper');
const one=await call('GET',`/api/score/games/${game.id}`);
assert.equal(one.body.away.score,1);
assert.deepEqual((await call('GET',`/api/score/games/${game.id}?since=${one.body.version}`)).body.unchanged,true);
assert.equal((await call('GET','/api/score/games?school=other-hs')).body.games.length,0,'schools see only their own games');

// Final, then delete (admin only).
r=await act('final');assert.equal(r.body.status,'final');assert.equal(r.body.summary,'Final');
assert.equal((await call('DELETE',`/api/score/games/${game.id}`,{token:scorer})).status,403);
assert.equal((await call('DELETE',`/api/score/games/${game.id}`,{token:owner})).status,200);
assert.equal((await call('GET',`/api/score/games/${game.id}`)).status,404);

// Password and school-code changes; removing a scorer signs them out.
assert.equal((await call('POST','/api/score/password',{token:scorer,body:{current_password:'wrong',new_password:'another-password-2'}})).status,401);
assert.equal((await call('POST','/api/score/password',{token:scorer,body:{current_password:'scorer-password-1',new_password:'another-password-2'}})).status,200);
assert.equal((await call('POST','/api/score/school-code',{token:scorer,body:{code:'NEW-CODE-2027'}})).status,403);
assert.equal((await call('POST','/api/score/school-code',{token:owner,body:{code:'NEW-CODE-2027'}})).status,200);
assert.equal((await login({code:'MHS-TEST-2026'})).status,401,'the old school code stops working');
assert.equal((await login({code:'new-code-2027'})).status,200);
assert.equal((await call('DELETE','/api/score/users/coach.k',{token:owner})).status,200);
assert.equal((await call('GET','/api/score/me',{token:scorer})).status,401,'a removed scorer is signed out');

// Repeated failures lock sign-in for that user for 15 minutes.
for(let i=0;i<8;i++)await login({password:'wrong-password-x'});
assert.equal((await login()).status,429);

console.log('Live scoring passed: baseball, softball and soccer rules; sign-in, accounts, games, undo, retries and school isolation.');

// The stream overlay is a transparent page that reads the same public API.
{
  const {readFileSync}=await import('node:fs');
  const overlay=readFileSync(new URL('../public/overlay/index.html',import.meta.url),'utf8');
  assert.match(overlay,/html,body\{[^}]*background:transparent/,'the overlay page must be transparent for OBS and vMix');
  assert.match(overlay,/\/api\/score\/games\?school=/);assert.match(overlay,/\/api\/score\/games\/\$\{/);
  assert.match(readFileSync(new URL('../public/score/index.html',import.meta.url),'utf8'),/\/overlay\/\?game=/,'the scorer app links each game to its overlay');
  console.log('Stream overlay page checks passed.');
}
