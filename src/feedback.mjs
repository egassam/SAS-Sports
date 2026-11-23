// Feedback from the download page (user, November 23, 2026: "We need to make a
// download page for this app with instructions on how it works and how you
// customize so I can start sharing it. I need to start getting more
// feedback."). Anyone can send a note from /get/#feedback; it is kept in D1
// (CATALOG_DB, table feedback, per host so a preview's are its own). Reading
// the notes takes the source key (GET /api/feedback with Bearer
// SOURCE_FETCH_KEY), the owner's phone (the app with ?feedback=1, after the
// owner code), or the Cloudflare D1 console:
//   SELECT * FROM feedback ORDER BY id DESC;

export const FEEDBACK_TABLE_SQL=`CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  contact TEXT,
  team TEXT,
  device TEXT
)`;
export const FEEDBACK_KINDS=['idea','bug','missing','praise','other'];
export const FEEDBACK_LIMITS={message:2000,contact:120,team:120,device:200,perHour:60};

const clean=(value,max)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max);

// A note as it will be stored, or {error} for one that cannot be. "website"
// is a field people never see (bots fill it in): such a note is accepted
// and dropped.
export function cleanFeedback(body){
  if(!body||typeof body!=='object')return{error:'A JSON body is required'};
  if(clean(body.website,200))return{spam:true};
  const message=clean(body.message,FEEDBACK_LIMITS.message);
  if(message.length<3)return{error:'Write a few words of feedback first'};
  const kind=FEEDBACK_KINDS.includes(body.kind)?body.kind:'other';
  return{kind,message,contact:clean(body.contact,FEEDBACK_LIMITS.contact)||null,team:clean(body.team,FEEDBACK_LIMITS.team)||null,device:clean(body.device,FEEDBACK_LIMITS.device)||null};
}

export async function feedbackRoute(request,env,url,{json,sameSecret,notify=null,now=()=>new Date()}){
  const db=env?.CATALOG_DB,scope=url.hostname;
  if(!db)return json({detail:'Feedback is not set up'},503);
  if(request.method==='GET'){
    const secret=env?.SOURCE_FETCH_KEY,given=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!secret||!given||!(await sameSecret(given,secret)))return json({detail:'Unauthorized'},401);
    await db.prepare(FEEDBACK_TABLE_SQL).run();
    const rows=await db.prepare('SELECT id,at,kind,message,contact,team,device FROM feedback WHERE scope=? ORDER BY id DESC LIMIT 500').bind(scope).all();
    return json({scope,feedback:rows?.results||[]});
  }
  if(request.method!=='POST')return json({detail:'Use POST'},405);
  // Only this site's own page sends notes.
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return json({detail:'Send feedback from the SAS Sports page'},403);
  const text=await request.text();
  if(text.length>8192)return json({detail:'That note is too long'},413);
  let body=null;try{body=JSON.parse(text)}catch{}
  const note=cleanFeedback(body);
  if(note.spam)return json({received:true});
  if(note.error)return json({detail:note.error},400);
  await db.prepare(FEEDBACK_TABLE_SQL).run();
  const at=now().toISOString(),hourAgo=new Date(Date.parse(at)-3600000).toISOString();
  const recent=Number((await db.prepare('SELECT COUNT(*) AS n FROM feedback WHERE scope=? AND at>?').bind(scope,hourAgo).first())?.n)||0;
  if(recent>=FEEDBACK_LIMITS.perHour)return json({detail:'Lots of feedback right now. Try again in a little while.'},429);
  const saved=await db.prepare('INSERT INTO feedback (scope,at,kind,message,contact,team,device) VALUES (?,?,?,?,?,?,?)').bind(scope,at,note.kind,note.message,note.contact,note.team,note.device).run();
  // The owner's phones get an alert (user, November 23: "I want to be notified
  // when I get feedback"). The note is stored either way.
  if(notify)try{await notify({...note,id:saved?.meta?.last_row_id??null,at},scope)}catch{}
  return json({received:true});
}
