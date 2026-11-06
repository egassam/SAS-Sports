// Whole feeds through the Worker for each way a middle or high school team
// gets its schedule (user, November 5: "What can we learn from this to
// optimize the next", then "Yes, do all of them"). Wabaunsee's Nov 6 playoff
// game at Olpe was missing on the first preview of PR #523: the Bound
// game-sports path returned before the `maxprepsSchedule` step, and no test
// built a Bound + MaxPreps feed. Pairings:
//   Bound alone, MaxPreps for finals only (Abilene football);
//   Bound + MaxPreps' schedule (`maxprepsSchedule`: Wabaunsee football).
// MaxPreps alone (`maxprepsOnly`) is built in tests/kas-ks-module.mjs.
// Fixtures are the real sources of November 5 (tests/fixtures/ks-counties).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {BOUND_ACTS,boundEventsUrl} from '../src/high-school.mjs';
import {KS_COUNTY_HIGH_SCHOOLS} from '../src/schools/ks-counties.mjs';
import {GEARY_HIGH_SCHOOLS} from '../src/schools/geary-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ks-counties/'+name,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const by=id=>[...KS_COUNTY_HIGH_SCHOOLS,...GEARY_HIGH_SCHOOLS].find(m=>m.id===id);
const YEAR={start:'2026-07-01',end:'2027-06-30'};
const bound=(id,file)=>BOUND_ACTS.Football.map(act=>[boundEventsUrl(by(id).bound.school,{...YEAR,act}),fixture(file)]);
const pages=new Map([
  ...bound('abilene-ks','bound-abilene-2026-11-05.json.gz'),
  ...bound('wabaunsee-ks','bound-wabaunsee-2026-11-05.json.gz'),
  [`${by('wabaunsee-ks').maxpreps.base}football/schedule/`,fixture('maxpreps-wabaunsee-football-2026-11-05.html.gz')],
  // Last winter's Bound entries (read November 6, 2026): Junction City's
  // girls' wrestling (both act ids) and boys' swimming.
  ...['h20240520120020666fd407ba14fec4f','h20240528042647438f458375a138041','h202502030938188603c9b78ae239440'].map(act=>[boundEventsUrl(by('junction-city-ks').bound.school,{start:'2025-07-01',end:'2026-06-30',act}),fixture(`bound-junction-city-${act}-2025-26.json.gz`)])]);
const requests=[];
// Anything else (Abilene's MaxPreps page, Bound's scores) answers 404: the
// feed must still list its schedule.
const fetch=async(url,init={})=>{
  const key=String(url);requests.push(key);
  const body=pages.get(key);
  if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>'',json:async()=>null};
  return{ok:true,status:200,url:key,headers:new Headers({'content-type':'text/html'}),text:async()=>body,json:async()=>JSON.parse(body)};
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents}')(...Object.values(deps));

// November 5, 2026, 9 AM in Kansas: Wabaunsee plays at Olpe tomorrow.
const RealDate=Date,at=new RealDate('2026-11-05T15:00:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
try{
  // Bound + MaxPreps' schedule: Bound has one game, MaxPreps the season.
  const wab=await worker.fetchLive('wabaunsee-ks','Football');
  assert.equal(wab.error,null);
  const [w]=worker.groupEvents(wab.events,at);
  assert.deepEqual(w.results.map(line),[
    'Final Oct 30, 7:00 PM Wabaunsee at Valley Heights | W, 26-19','Final Oct 23, 7:00 PM Wabaunsee at Mission Valley | W, 30-14',
    'Final Oct 16, 7:00 PM Wabaunsee vs St. Marys | L, 14-45','Final Oct 9 Wabaunsee at Rossville | L, 0-49','Final Oct 2, 7:00 PM Wabaunsee at Jackson Heights | L, 14-18',
    'Final Sep 25 Wabaunsee vs Atchison County | W, 24-8','Final Sep 18, 7:00 PM Wabaunsee at Onaga | L, 8-14','Final Sep 11 Wabaunsee vs Olpe | L, 14-35','Final Sep 4, 7:00 PM Wabaunsee vs West Franklin | W, 45-3'],
    'every MaxPreps final, the Bound game once');
  assert.deepEqual(w.upcoming.map(line),['Upcoming Nov 6, 7:00 PM Wabaunsee vs Olpe | '],'the game Bound lacks, from MaxPreps');
  assert.equal(w.upcoming[0].source.name,'MaxPreps (team schedule)');

  // Bound alone (MaxPreps refused): the schedule and Bound's own finals; the
  // playoff "TBD" rows are placeholders, not games.
  const abi=await worker.fetchLive('abilene-ks','Football');
  assert.equal(abi.error,null);
  const [a]=worker.groupEvents(abi.events,at);
  assert.ok(a.results.some(e=>/Clay Center/.test(e.title)&&e.headline==='W, 17-14'),'a Bound final');
  assert.ok(a.results.some(e=>/Rock Creek/.test(e.title)&&e.headline==='No score posted'),'a played game with no score anywhere');
  assert.ok(!a.results.some(e=>/\bTBD\b/.test(e.title)),'a past playoff "TBD" (Oct 30) is a round not reached, not a game');
  assert.deepEqual(a.upcoming.map(line),['Upcoming Nov 6, 7:00 PM Abilene vs TBD | ','Upcoming Nov 13, 7:00 PM Abilene vs TBD | ','Upcoming Nov 20, 7:00 PM Abilene vs TBD | '],'coming playoff dates stay on the schedule');
  assert.equal(a.results.length,10);
  assert.ok(requests.some(u=>u.startsWith('https://www.maxpreps.com/ks/abilene/abilene-cowboys/football/schedule/')),'MaxPreps was asked for its finals');
}finally{globalThis.Date=RealDate}

// Winter meets with the team scores the host entered on Bound (November 6,
// the winter session): wrestling and swimming points, high wins. January 20,
// 2026 in Kansas.
const winter=new RealDate('2026-01-20T18:00:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[winter.getTime()]))}static now(){return winter.getTime()}};
try{
  const wr=await worker.fetchLive('junction-city-ks','Wrestling');
  const girls=worker.groupEvents(wr.events,winter).flatMap(g=>g.results).filter(e=>e.team_label==='Girls');
  const mcp=girls.find(e=>e.start_time.startsWith('2025-12-06'));
  assert.ok(mcp,'the McPherson girls\' invitational is listed');
  assert.equal(mcp.headline,'1st of 17','Junction City won it: 203.5 points, the most of the 17 teams with a score');
  assert.ok(mcp.results.some(r=>/203\.5 pts/.test(r.result)),'the points');
  assert.ok(girls.some(e=>e.headline==='No results posted'),'a meet with no scores entered reads as played without results');
  const sw=await worker.fetchLive('junction-city-ks','Swimming & Diving');
  const tw=worker.groupEvents(sw.events,winter).flatMap(g=>g.results).find(e=>e.start_time.startsWith('2026-01-13'));
  assert.ok(tw,'the Topeka West swimming meet is listed');
  assert.equal(tw.headline,'6th of 14','138 points: 6th of the 14 teams with a score (high wins)');
}finally{globalThis.Date=RealDate}
console.log('hs-schedule-pairings: ok (Bound alone; Bound + MaxPreps schedule; Bound winter team scores)');
