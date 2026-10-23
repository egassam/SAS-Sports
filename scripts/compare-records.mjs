// Compares each game sport's season record on a preview (or production)
// with the record the school's own schedule page publishes, from the saved
// fixtures (tests/fixtures/<id>-module/<slug>-schedule.html.gz): overall and
// conference, per team. Every conference onboarding found records off this
// way (a played game left out for a stale "Postponed" note, a sport in
// another league, a sport wrongly listed as unsponsored).
//   NODE_USE_ENV_PROXY=1 node scripts/compare-records.mjs --branch=<branch> --school=a,b,c
//   NODE_USE_ENV_PROXY=1 node scripts/compare-records.mjs --prod --school=a
// Prints OK or DIFF per page; a page that publishes no record is named.
// With SAS_SOURCE_KEY set, each page is read live through the Worker's
// /api/source (the saved fixtures lag the latest results: Atlantic 10,
// Oct 23, three soccer records a day old); without it, the fixtures are read.
// The page's record box can still lag a same-day result.
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const base=args.includes('--prod')?'https://sas-sports.lovetogivepain.workers.dev':value('base')||(value('branch')?`https://${value('branch')}-sas-sports.lovetogivepain.workers.dev`:null);
const ids=(value('school')||'').split(',').filter(Boolean);
if(!base||!ids.length){console.error('usage: compare-records.mjs (--branch=<b> | --prod | --base=<url>) --school=<id>[,<id>]');process.exit(2)}
const SPORTS={football:'Football',volleyball:'Volleyball','womens-volleyball':'Volleyball','mens-volleyball':'Volleyball',soccer:'Soccer','womens-soccer':'Soccer','mens-soccer':'Soccer','field-hockey':'Field Hockey','ice-hockey':'Hockey','mens-ice-hockey':'Hockey','womens-ice-hockey':'Hockey','mens-water-polo':'Water Polo','womens-water-polo':'Water Polo','mens-basketball':'Basketball','womens-basketball':'Basketball'};
const text=raw=>raw.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
function pageRecord(raw){
  const value=key=>Number((raw.match(new RegExp(`schedule-record__${key}-value"[^>]*>(?:<span[^>]*>[^<]*</span>)?\\s*(\\d+)`))||[])[1]||0);
  if(raw.includes('schedule-record__overall-win-value'))return{overall:[value('overall-win'),value('overall-loss'),value('overall-tie')],conference:[value('conference-win'),value('conference-loss'),value('conference-tie')]};
  // Older SIDEARM pages write "Overall 12-9 ... Conf 3-5".
  const m=text(raw).match(/Overall\s*(\d+)-(\d+)(?:-(\d+))?.{0,80}?Conf(?:erence)?\s*(\d+)-(\d+)(?:-(\d+))?/);
  return m?{overall:[m[1],m[2],m[3]||0].map(Number),conference:[m[4],m[5],m[6]||0].map(Number)}:null;
}
const feeds=new Map();
async function records(id,sport){
  const key=`${id}|${sport}`;
  if(!feeds.has(key)){
    const r=await fetch(`${base}/live/feed/grouped?school=${encodeURIComponent(id)}&sport=${encodeURIComponent(sport)}`,{signal:AbortSignal.timeout(90000)});
    const body=r.ok?await r.json():[];feeds.set(key,(Array.isArray(body)?body[0]?.records:null)||[]);
  }
  return feeds.get(key);
}
const key=process.env.SAS_SOURCE_KEY;
async function livePage(id,slug){
  const host=(readFileSync(new URL(`../src/schools/${id}.mjs`,import.meta.url),'utf8').match(/const HOST='([^']+)'/)||[])[1];
  if(!key||!host)return null;
  try{const r=await fetch(`${base}/api/source?url=${encodeURIComponent(`https://${host}/sports/${slug}/schedule`)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(90000)});return r.ok?await r.text():null}catch{return null}
}
const zero=record=>[...record.overall,...record.conference].every(n=>n===0);
let diffs=0;
for(const id of ids){
  const dir=new URL(`../tests/fixtures/${id}-module/`,import.meta.url);
  if(!existsSync(dir)){console.log(`${id}: no fixtures`);continue}
  for(const file of readdirSync(dir).filter(f=>f.endsWith('-schedule.html.gz')).sort()){
    const slug=file.replace(/-schedule\.html\.gz$/,''),sport=SPORTS[slug];if(!sport)continue;
    const page=pageRecord(await livePage(id,slug)??gunzipSync(readFileSync(new URL(file,dir))).toString('utf8'));
    if(!page){console.log(`-    ${id} ${slug}: the page publishes no record`);continue}
    const list=await records(id,sport),label=/^womens/.test(slug)?"Women's":/^mens/.test(slug)?"Men's":null;
    const rec=list.find(r=>label&&r.team_label===label)||(list.length===1?list[0]:list.find(r=>!r.team_label));
    const app=rec?{overall:[rec.wins,rec.losses,rec.ties],conference:[rec.conference?.wins||0,rec.conference?.losses||0,rec.conference?.ties||0]}:null;
    // A season not begun: the page's 0-0 and the app's no record agree.
    const same=!app&&zero(page)||app&&page.overall.join()===app.overall.join()&&page.conference.join()===app.conference.join();
    if(!same)diffs++;
    console.log(`${same?'OK  ':'DIFF'} ${id} ${slug}: page ${page.overall.join('-')} (${page.conference.join('-')}), app ${app?`${app.overall.join('-')} (${app.conference.join('-')})`:'none'}`);
  }
}
process.exit(diffs?1:0);
