// How many people use the app (user, November 23, 2026: "Can we track how
// many people are using the app?", then "Both": this counter and Cloudflare
// Web Analytics). Each device sends one anonymous check-in a day per page
// (the app, the install page /get/): a random id the device keeps, hashed
// here before it is stored, whether the app is installed, nothing else. No
// names, accounts, cookies or outside service. It counts devices, not
// people. The owner's phone reads the totals (POST /api/push/stats).

export const USAGE_TABLE_SQL=`CREATE TABLE IF NOT EXISTS usage_days (
  scope TEXT NOT NULL,
  day TEXT NOT NULL,
  device TEXT NOT NULL,
  page TEXT NOT NULL,
  installed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, day, device, page)
)`;
export const USAGE_PAGES=['app','get'];
export const USAGE_KEEP_DAYS=400;
export const USAGE_MAX_PER_DAY=50000;
export const USAGE_TIME_ZONE='America/Chicago';

// The day in Central time (the user's), as YYYY-MM-DD.
export function usageDay(now=new Date(),offsetDays=0){
  const at=new Date(now.getTime()+offsetDays*86400000);
  return new Intl.DateTimeFormat('en-CA',{timeZone:USAGE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
}

export function cleanPing(body){
  if(!body||typeof body!=='object')return null;
  const id=String(body.id||'');
  if(!/^[A-Za-z0-9-]{16,64}$/.test(id))return null;
  const page=USAGE_PAGES.includes(body.page)?body.page:null;
  if(!page)return null;
  return{id,page,installed:body.installed===true?1:0};
}

async function hashDevice(id,scope){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${scope}|${id}`));
  return[...new Uint8Array(digest).slice(0,12)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function usageRoute(request,env,url,{json,now=()=>new Date()}){
  const db=env?.CATALOG_DB,scope=url.hostname;
  if(!db)return json({detail:'Not set up'},503);
  if(request.method!=='POST')return json({detail:'Use POST'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)return json({detail:'Not from this site'},403);
  const text=await request.text();
  if(text.length>1024)return json({detail:'Too long'},413);
  let body=null;try{body=JSON.parse(text)}catch{}
  const ping=cleanPing(body);
  if(!ping)return json({detail:'Not a check-in'},400);
  await db.prepare(USAGE_TABLE_SQL).run();
  const at=now(),day=usageDay(at),device=await hashDevice(ping.id,scope);
  const count=Number((await db.prepare('SELECT COUNT(*) AS n FROM usage_days WHERE scope=? AND day=?').bind(scope,day).first())?.n)||0;
  if(count>=USAGE_MAX_PER_DAY)return json({counted:false});
  await db.prepare('INSERT INTO usage_days (scope,day,device,page,installed) VALUES (?,?,?,?,?) ON CONFLICT(scope,day,device,page) DO UPDATE SET installed=MAX(installed,excluded.installed)').bind(scope,day,device,ping.page,ping.installed).run();
  // Old days go now and then (about one check-in in fifty).
  if(Math.random()<0.02)await db.prepare('DELETE FROM usage_days WHERE scope=? AND day<?').bind(scope,usageDay(at,-USAGE_KEEP_DAYS)).run();
  return json({counted:true});
}

// The totals the owner sees: devices on the app today, in the last 7 and 30
// days (Central days, today included), how many of the last 30 days' devices
// have it installed, devices that opened the install page, and the last 14
// days one by one.
export async function usageStats(db,scope,now=new Date()){
  await db.prepare(USAGE_TABLE_SQL).run();
  const today=usageDay(now),since=n=>usageDay(now,-(n-1));
  const devices=async(page,days,extra='')=>Number((await db.prepare(`SELECT COUNT(DISTINCT device) AS n FROM usage_days WHERE scope=? AND page=? AND day>=? AND day<=?${extra}`).bind(scope,page,since(days),today).first())?.n)||0;
  const series=(await db.prepare('SELECT day,COUNT(DISTINCT device) AS n FROM usage_days WHERE scope=? AND page=? AND day>=? AND day<=? GROUP BY day ORDER BY day').bind(scope,'app',since(14),today).all())?.results||[];
  const byDay=Object.fromEntries(series.map(r=>[r.day,Number(r.n)||0]));
  const first=(await db.prepare('SELECT MIN(day) AS d FROM usage_days WHERE scope=?').bind(scope).first())?.d||null;
  return{
    time_zone:USAGE_TIME_ZONE,counting_since:first,
    app:{today:await devices('app',1),week:await devices('app',7),month:await devices('app',30),installed_month:await devices('app',30,' AND installed=1')},
    install_page:{today:await devices('get',1),week:await devices('get',7),month:await devices('get',30)},
    days:Array.from({length:14},(_,i)=>{const d=usageDay(now,-(13-i));return{day:d,devices:byDay[d]||0}})
  };
}
