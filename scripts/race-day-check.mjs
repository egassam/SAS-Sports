// Race-day check for the high school live meets (user, October 31, 2026:
// "we need to learn from this and optimize for later"). That morning
// Flint Hills Christian's KAS state card stayed empty through the girls'
// race: the reader had been tested on the 2025 meet's finished documents,
// and on the day the timer posted live finishers only to its live
// database (trackmeet-io.firebaseio.com), not to the race documents. KC
// Metro Academy was also entered under a name the module did not list.
//
//   npm run check:race-day -- --date=2026-10-31            (production)
//   npm run check:race-day -- --date=2026-10-31 --branch=<branch>
//
// For every meet a high school module names on that day (AthleticLIVE
// `meetPro.athleticLive`, KSHSAA `midwestTiming`):
//   - before the race: the timer's meet exists, its races are listed, every
//     school the module names matches a team on the timer's entry list (an
//     unmatched timer team is printed: it may be one of ours under another
//     name), the live database answers;
//   - on the day: each school's card in the app (status, live count, rows,
//     live link) next to the timer's own finisher count, with LAG when the
//     timer has finishers and the card does not.
//   - after the races (user, October 31: "Create a rule and fix it", after
//     Manhattan's card stayed Live hours after both races were scored):
//     STUCK when a card is still Live 3 hours after the meet's last start,
//     NOT ENTERED when a school missing from the timer's entry lists reads
//     Live.
// Exit 1 on any FAIL, LAG, STUCK or NOT ENTERED.
import {readFileSync} from 'node:fs';
import {meetProTrackTeam,ATHLETIC_LIVE_DOCS,ATHLETIC_LIVE_FIREBASE,athleticLiveFirebaseRaces} from '../src/high-school.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')).map(([k,v])=>[k,v??true]));
const PROD='https://sas-sports.lovetogivepain.workers.dev';
const base=args.base||(args.branch?`https://${String(args.branch).toLowerCase().replace(/[^a-z0-9-]/g,'-')}-sas-sports.lovetogivepain.workers.dev`:PROD);
const date=args.date||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date());

// The modules index.js serves (its HIGH_SCHOOL_MODULES line and its
// ./schools imports), so a new school needs no change here.
const index=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const names={};
for(const [,list,path] of index.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"](\.\/schools\/[^'"]+)['"]/gm)){
  const module=await import(new URL(`../src/${path.slice(2)}`,import.meta.url));
  for(const name of list.split(',').map(s=>s.trim()).filter(Boolean))names[name]=module[name];
}
const expr=index.match(/^const HIGH_SCHOOL_MODULES=(\[[^\n]*\]);/m)?.[1];
if(!expr)throw Error('HIGH_SCHOOL_MODULES not found in src/index.js');
const MODULES=Function(...Object.keys(names),`return ${expr}`)(...Object.values(names));

let bad=0;
const say=(tag,text)=>{if(['FAIL','LAG','STUCK','NOT ENTERED'].includes(tag))bad++;console.log(`${tag.padEnd(4)} ${text}`);};
// Minutes past the meet's last start in Kansas (negative before it).
const LIVE_HOURS=3;
const minutesPast=times=>{
  const now=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(now);
  if(day!==date)return day>date?Infinity:-Infinity;
  const [h,m]=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now).split(':').map(Number);
  const last=Math.max(...times.filter(Boolean).map(t=>Number(t.split(':')[0])*60+Number(t.split(':')[1])));
  return h*60+m-last;
};
const stuck=(e,times)=>e&&e.status==='Live'&&times.length&&minutesPast(times)>LIVE_HOURS*60;
const get=async(url,tries=2)=>{for(let i=0;;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(90000)});return{status:r.status,text:await r.text()}}catch(e){if(i+1>=tries)return{status:0,text:String(e)}}}};
const json=async url=>{const r=await get(url);try{return r.status===200?JSON.parse(r.text):null}catch{return null}};
const placed=r=>(r||[]).filter(x=>Number(x.p)>0&&x.m).length;

// The school's card for the day in the app's feed.
async function card(school,sport){
  const r=await get(`${base}/live/feed/grouped?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}&refresh=1`);
  if(r.status!==200)return{error:`HTTP ${r.status}`};
  const events=[];const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if('event_type' in o&&'status' in o){events.push(o);return}Object.values(o).forEach(walk)}};
  walk(JSON.parse(r.text));
  return events.find(e=>String(e.start_time||'').startsWith(date))||null;
}
const cardText=e=>!e?'no card for the day':e.error?e.error:`${e.status} · ${e.recency_label||''}${e.headline?` · ${e.headline}`:''} · ${e.result_count??0} rows${e.recap_url?` · ${e.recap_label}`:' · NO LIVE LINK'}`;
const started=e=>e&&(e.status==='Live'||e.status==='Final'||e.meet_live);

console.log(`Race-day check ${date} on ${base}`);
const seen=new Set();
for(const module of MODULES){
  for(const meet of module.meetPro?.athleticLive||[]){
    if(meet.date!==date||seen.has(`al|${meet.meet}`))continue;seen.add(`al|${meet.meet}`);
    console.log(`\n${meet.name} (AthleticLIVE ${meet.meet}, ${meet.time||'no time'})`);
    const info=(await json(`${ATHLETIC_LIVE_DOCS}live_results_meet_list/_doc/${meet.meet}`))?._source;
    if(!info){say('FAIL','the timer has no meet document yet');continue;}
    const races=(info.xcp||[]).filter(r=>!(meet.exclude&&meet.exclude.test(r.n)));
    say(races.length?'PASS':'FAIL',`${races.length} races: ${races.map(r=>r.n).join(', ')}`);
    const docs=await Promise.all(races.map(async r=>({race:r,results:(await json(`${ATHLETIC_LIVE_DOCS}ind_res_list/_doc/${r.i}`))?._source,entries:(await json(`${ATHLETIC_LIVE_DOCS}ind_ent_list/_doc/${r.i}`))?._source})));
    const [list,bySplit]=await Promise.all([json(`${ATHLETIC_LIVE_FIREBASE}meet_${meet.meet}/liveRunEventList.json`),json(`${ATHLETIC_LIVE_FIREBASE}meet_${meet.meet}/liveBySplit.json`)]);
    const shallow=await get(`${ATHLETIC_LIVE_FIREBASE}meet_${meet.meet}.json?shallow=true`);
    say(shallow.status===200?'PASS':'FAIL',`live database answers (HTTP ${shallow.status}${shallow.text==='null'?', nothing posted yet':''})`);
    const fire=athleticLiveFirebaseRaces(list,bySplit);
    // Team names on the entry lists against the module's names.
    const timerTeams=new Set(docs.flatMap(d=>(d.entries?.en||[]).map(e=>e.a?.t?.n)).filter(Boolean));
    const ours=new Map(Object.entries(meet.schools).flatMap(([id,list])=>list.map(n=>[meetProTrackTeam(n),id])));
    for(const [id,list] of Object.entries(meet.schools)){
      const hit=[...timerTeams].filter(t=>list.some(n=>meetProTrackTeam(n)===meetProTrackTeam(t)));
      say(hit.length?'PASS':'WARN',`${id}: ${hit.length?`entered as ${hit.join(', ')}`:'not on the entry lists (not entered, or under another name)'}`);
    }
    const others=[...timerTeams].filter(t=>!ours.has(meetProTrackTeam(t)));
    if(others.length)say('INFO',`other teams on the timer: ${others.join(', ')}`);
    // Finishers: the race document, else the live database.
    const counts=docs.map(d=>{const doc=placed(d.results?.r),live=fire[String(d.race.i)]?.results.r.length||0;return{race:d.race.n,doc,live,n:Math.max(doc,live),entries:(d.entries?.en||[]).length};});
    for(const c of counts)say('INFO',`${c.race}: ${c.n} of ${c.entries} finished (race document ${c.doc}, live database ${c.live})`);
    const finished=counts.some(c=>c.n);
    for(const id of Object.keys(meet.schools)){
      const e=await card(id,meet.sport);
      const ran=docs.some(d=>(d.entries?.en||[]).some(x=>(meet.schools[id]||[]).some(n=>meetProTrackTeam(n)===meetProTrackTeam(x.a?.t?.n))));
      const tag=e?.error?'FAIL':!ran&&timerTeams.size&&e?.status==='Live'?'NOT ENTERED':stuck(e,[meet.time])?'STUCK':finished&&ran&&!started(e)?'LAG':'PASS';
      say(tag,`${id} card: ${cardText(e)}`);
    }
  }
  for(const meet of module.midwestTiming||[]){
    if(meet.date!==date)continue;
    const key=`mt|${meet.milesplit||meet.name}|${Object.keys(meet.schools)}`;if(seen.has(key))continue;seen.add(key);
    console.log(`\n${meet.name} (${meet.site}; MileSplit Live ${meet.milesplit||'none'})`);
    for(const id of Object.keys(meet.schools)){
      const e=await card(id,meet.sport);
      say(!e||e.error?'FAIL':stuck(e,meet.races.map(r=>r.time))?'STUCK':'PASS',`${id} card: ${cardText(e)}`);
    }
  }
}
if(!seen.size)console.log(`No live meet is configured for ${date}.`);
console.log(bad?`\n${bad} problem(s).`:'\nNo problems found.');
process.exit(bad?1:0);
