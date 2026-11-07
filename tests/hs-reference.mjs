// The middle and high school baseline, as K-State XC 18/20 and KU 26/21 are
// for college (user, November 6, 2026: "We need to make the Manhattan schools
// the next that they can be so we can create rules for every other school.
// There's been too many mess ups. Like we did with KSTATE being the base for
// all of college"). Every sponsored sport of Manhattan High School, Anthony
// MS and Eisenhower MS is rebuilt through the Worker's own fetchLive from the
// real sources saved by scripts/record-reference.mjs, at the moment they were
// read, and compared card by card with the cards read and checked by eye that
// day. A change that moves any card fails here: update the baseline only by
// recording again and reading every changed card (docs/HIGH_SCHOOL_REFERENCE.md).
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {REFERENCE_SCHOOLS,cardLine} from './hs-reference-lib.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const dir=new URL('./fixtures/hs-reference/',import.meta.url);
const date=readdirSync(dir).filter(f=>/^expected-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().at(-1).slice(9,19);
const saved=JSON.parse(gunzipSync(readFileSync(new URL(`sources-${date}.json.gz`,dir))).toString('utf8'));
const expected=JSON.parse(readFileSync(new URL(`expected-${date}.json`,dir),'utf8'));
const requestKey=(url,init={})=>`${String(init.method||'GET').toUpperCase()} ${url}${init.body?` #${createHash('sha1').update(String(init.body)).digest('hex').slice(0,12)}`:''}`;
const unsaved=new Set();
const fetch=async(url,init={})=>{
  const k=requestKey(String(url?.url||url),init),hit=saved[k];
  if(!hit){unsaved.add(k);return new Response('',{status:404});}
  return new Response(hit.status?Buffer.from(hit.body,'base64'):null,{status:hit.status||599,headers:{'content-type':hit.type||'text/plain'}});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents}')(...Object.values(deps));

const at=new Date(expected.recorded_at),RealDate=Date;
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
let cards=0;const built={};
try{
  for(const id of REFERENCE_SCHOOLS){
    assert.deepEqual(Object.keys(expected.schools[id]).sort(),[...sponsoredSports[id]].sort(),`${id}: the baseline holds every sponsored sport`);
    built[id]={};
    for(const sport of sponsoredSports[id]){
      const result=await worker.fetchLive(id,sport),[g]=worker.groupEvents(result.events,at),want=expected.schools[id][sport];
      const got={error:result.error||null,rankings:(result.rankings||[]).map(r=>`${r.team_label?`${r.team_label} `:''}No. ${r.rank} ${r.poll}`),live:(g?.live||[]).map(cardLine),results:(g?.results||[]).map(cardLine),upcoming:(g?.upcoming||[]).map(cardLine)};
      built[id][sport]={result,g};
      assert.deepEqual(got,want,`${id} ${sport}: the feed matches the reference cards of ${date}`);
      cards+=got.live.length+got.results.length+got.upcoming.length;
    }
  }
}finally{globalThis.Date=RealDate;}
assert.equal(unsaved.size,0,`every source read was saved: ${[...unsaved].slice(0,5).join(', ')}`);

// The reference rules, read off the cards (docs/HIGH_SCHOOL_REFERENCE.md).
const all=(id,sport)=>{const g=built[id][sport].g;return g?[...g.live,...g.results,...g.upcoming]:[];};
for(const id of REFERENCE_SCHOOLS)for(const sport of sponsoredSports[id]){
  const events=all(id,sport),g=built[id][sport].g;
  // 1. Every sponsored sport lists its schedule.
  assert.ok(events.length,`${id} ${sport}: the schedule is listed`);
  for(const e of events){
    // 2. A past game or meet is a result or "played" with no result posted; never left upcoming.
    if(String(e.start_time).slice(0,10)<at.toISOString().slice(0,10)&&!e.end_time)assert.ok(e.status==='Final',`${id} ${sport}: ${e.title} is past and reads ${e.status}`);
    if(e.no_result_posted)assert.match(e.headline,/^No (?:score|results) posted$/,`${id} ${sport}: ${e.title}`);
    // 3. No calendar shorthand or notes in a title.
    assert.doesNotMatch(e.title,/ - (?:HOME|AWAY)\b|\b(?:GRAPPLE|DOUBLE DUAL|CONCORDIA)\b|\bNorht\b|\bStare Park\b|\d(?:AM|PM) \((?:Girls|Boys)\)/,`${id} ${sport}: "${e.title}" reads as typed`);
    // 4. A round never reached is not listed after its day; a named round reads "·", not "at" or "vs".
    if(/\b(?:TBD|Sub-?\s?State|Quarter|State Tourn)/i.test(e.opponent||'')&&e.event_type==='GAME')assert.ok(e.status!=='Final'||e.school_score!=null,`${id} ${sport}: placeholder ${e.title} is not a game played`);
    // 5. Middle and high schools carry no college ranks.
    for(const r of [e.school_rank,e.opponent_rank].filter(Boolean))assert.match(r.poll,/^MaxPreps/,`${id} ${sport}: ${e.title}`);
  }
  // 6. Season records come from the finals.
  if(g?.results?.some(e=>e.school_score!=null))assert.ok(g.records?.length,`${id} ${sport}: a record from the finals`);
}
// 7. MaxPreps' state and class ranks for the team (Nov 7, 2026: football No. 10 Kansas, No. 3 6A).
assert.deepEqual(built['manhattan-ks'].Football.result.rankings.map(r=>[r.poll,r.rank]),[['Kansas',10],['6A',3]]);
// 7a. A round MaxPreps booked after the calendar's last game is the team's
// next game (user, November 7, 2026: the page's next event was the Dec 2 swim
// meet while football played Maize at home on Nov 13).
assert.deepEqual(built['manhattan-ks'].Football.g.upcoming.map(e=>`${e.title} ${e.start_time.slice(0,10)}`),['Manhattan vs Maize 2026-11-13']);
// 8. No featured athletes for minors.
for(const id of REFERENCE_SCHOOLS)for(const sport of sponsoredSports[id])assert.ok(!built[id][sport].g?.featured_athletes?.length,`${id} ${sport}: no featured athletes`);
// 9. The page's season table names every sport the Worker has a season for
// (Manhattan's bowling was never read on its team page, Nov 7, 2026).
{
  const page=read('../public/index.html'),worker=read('../src/index.js');
  const keys=text=>[...text.matchAll(/(?:'([^']+)'|"([^"]+)"):\[\[/g)].map(m=>m[1]||m[2]);
  const pageSports=new Set(keys(page.match(/const AUTO_SEASON_WINDOWS=\{[\s\S]*?\n\};/)[0])),workerSports=keys(worker.match(/const SEASONS=\{[\s\S]*?\n\};/)[0]);
  assert.deepEqual(workerSports.filter(s=>!pageSports.has(s)),[],'every Worker season is on the page');
}
console.log(`hs-reference: ok (${REFERENCE_SCHOOLS.length} schools, ${Object.values(expected.schools).reduce((n,s)=>n+Object.keys(s).length,0)} sports, ${cards} cards from the sources of ${date})`);
