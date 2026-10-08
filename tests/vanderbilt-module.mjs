import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {vanderbiltSchool,vanderbiltGolfCardPlace} from '../src/schools/vanderbilt.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='vanderbilt');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official pages served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,vanderbiltHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/vanderbilt-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit vucommodores.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['vanderbilt'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',vanderbiltSchool.scheduleUrls],['roster',vanderbiltSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('vanderbilt|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'vucommodores.com',`${key} must stay on vucommodores.com`);
  }
}
const parity={"Baseball":{"schedule":["https://vucommodores.com/sports/baseball/schedule"],"roster":["https://vucommodores.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://vucommodores.com/sports/mbball/schedule","https://vucommodores.com/sports/wbball/schedule"],"roster":["https://vucommodores.com/sports/mbball/roster","https://vucommodores.com/sports/wbball/roster"],"combined":true},"Bowling":{"schedule":["https://vucommodores.com/sports/wbowl/schedule"],"roster":["https://vucommodores.com/sports/wbowl/roster"],"combined":false},"Cross Country":{"schedule":["https://vucommodores.com/sports/mcross/schedule","https://vucommodores.com/sports/wcross/schedule"],"roster":["https://vucommodores.com/sports/mcross/roster","https://vucommodores.com/sports/wcross/roster"],"combined":true},"Football":{"schedule":["https://vucommodores.com/sports/football/schedule"],"roster":["https://vucommodores.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://vucommodores.com/sports/mgolf/schedule","https://vucommodores.com/sports/wgolf/schedule"],"roster":["https://vucommodores.com/sports/mgolf/roster","https://vucommodores.com/sports/wgolf/roster"],"combined":true},"Lacrosse":{"schedule":["https://vucommodores.com/sports/wlax/schedule"],"roster":["https://vucommodores.com/sports/wlax/roster"],"combined":false},"Soccer":{"schedule":["https://vucommodores.com/sports/wsoc/schedule"],"roster":["https://vucommodores.com/sports/wsoc/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://vucommodores.com/sports/wswim/schedule"],"roster":["https://vucommodores.com/sports/wswim/roster"],"combined":false},"Tennis":{"schedule":["https://vucommodores.com/sports/mten/schedule","https://vucommodores.com/sports/wten/schedule"],"roster":["https://vucommodores.com/sports/mten/roster","https://vucommodores.com/sports/wten/roster"],"combined":true},"Track & Field":{"schedule":["https://vucommodores.com/sports/wtrack/schedule"],"roster":["https://vucommodores.com/sports/wtrack/roster"],"combined":false},"Volleyball":{"schedule":["https://vucommodores.com/sports/wvolley/schedule"],"roster":["https://vucommodores.com/sports/wvolley/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'vanderbilt|"+sport+"':"),`${sport} routes must live in the Vanderbilt module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://vucommodores.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.vanderbiltHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  for(const provider of worker.liveScoreboardProviders(school,sport))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];

// BEGIN generated (scripts/generate-module-tests.mjs --school=vanderbilt)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 5:30 PM Vanderbilt vs Oregon State | ",
 "Upcoming Feb 20, 9:00 PM Vanderbilt vs UC Santa Barbara | ",
 "Upcoming Feb 21, 9:00 PM Vanderbilt vs Nebraska | ",
 "Upcoming Feb 22 Vanderbilt at Arizona State | ",
 "Upcoming Feb 26 Vanderbilt vs Rutgers | ",
 "Upcoming Feb 27 Vanderbilt vs Rutgers | ",
 "Upcoming Feb 28 Vanderbilt vs Rutgers | ",
 "Upcoming Mar 2 Vanderbilt vs Evansville | ",
 "Upcoming Mar 3 Vanderbilt vs Miami (Ohio) | ",
 "Upcoming Mar 5, 7:00 PM Vanderbilt vs Ohio State | ",
 "Upcoming Mar 6, 7:00 PM Vanderbilt vs Virginia Tech | ",
 "Upcoming Mar 7, 4:00 PM Vanderbilt vs Cincinnati | ",
 "Upcoming Mar 9 Vanderbilt vs Indiana State | ",
 "Upcoming Mar 10 Vanderbilt vs Troy | ",
 "Upcoming Mar 12 Vanderbilt vs Bryant | ",
 "Upcoming Mar 13 Vanderbilt vs Bryant | ",
 "Upcoming Mar 14 Vanderbilt vs Bryant | ",
 "Upcoming Mar 16 Vanderbilt vs North Alabama | ",
 "Upcoming Mar 19 Vanderbilt at South Carolina | ",
 "Upcoming Mar 20 Vanderbilt at South Carolina | ",
 "Upcoming Mar 21 Vanderbilt at South Carolina | ",
 "Upcoming Mar 23 Vanderbilt vs Belmont | ",
 "Upcoming Mar 25 Vanderbilt vs Ole Miss | ",
 "Upcoming Mar 26 Vanderbilt vs Ole Miss | ",
 "Upcoming Mar 27 Vanderbilt vs Ole Miss | ",
 "Upcoming Mar 30 Vanderbilt vs Western Kentucky | ",
 "Upcoming Apr 2 Vanderbilt at LSU | ",
 "Upcoming Apr 3 Vanderbilt at LSU | ",
 "Upcoming Apr 4 Vanderbilt at LSU | ",
 "Upcoming Apr 6 Vanderbilt vs SEMO | ",
 "Upcoming Apr 9 Vanderbilt vs Kentucky | ",
 "Upcoming Apr 10 Vanderbilt vs Kentucky | ",
 "Upcoming Apr 11 Vanderbilt vs Kentucky | ",
 "Upcoming Apr 13 Vanderbilt vs Lipscomb | ",
 "Upcoming Apr 16 Vanderbilt at Georgia | ",
 "Upcoming Apr 17 Vanderbilt at Georgia | ",
 "Upcoming Apr 18 Vanderbilt at Georgia | ",
 "Upcoming Apr 20 Vanderbilt at Murray State | ",
 "Upcoming Apr 23 Vanderbilt vs Mississippi State | ",
 "Upcoming Apr 24 Vanderbilt vs Mississippi State | ",
 "Upcoming Apr 25 Vanderbilt vs Mississippi State | ",
 "Upcoming Apr 27 Vanderbilt vs Middle Tennessee | ",
 "Upcoming Apr 30 Vanderbilt at Texas | ",
 "Upcoming May 1 Vanderbilt at Texas | ",
 "Upcoming May 2 Vanderbilt at Texas | ",
 "Upcoming May 4 Vanderbilt at Louisville | ",
 "Upcoming May 7 Vanderbilt vs Florida | ",
 "Upcoming May 8 Vanderbilt vs Florida | ",
 "Upcoming May 9 Vanderbilt vs Florida | ",
 "Upcoming May 11 Vanderbilt vs Kansas | ",
 "Upcoming May 14 Vanderbilt vs Auburn | ",
 "Upcoming May 15 Vanderbilt vs Auburn | ",
 "Upcoming May 16 Vanderbilt vs Auburn | ",
 "Upcoming May 20 Vanderbilt at Tennessee | ",
 "Upcoming May 21 Vanderbilt at Tennessee | ",
 "Upcoming May 22 Vanderbilt at Tennessee | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Oct 19 Men's · Vanderbilt vs UAB (Exhibition) | ",
 "Upcoming Oct 23, 5:00 PM Men's · Vanderbilt at Miami (Exhibition) | ",
 "Upcoming Nov 2 Men's · Vanderbilt vs Bellarmine | ",
 "Upcoming Nov 5, 5:00 PM Men's · Vanderbilt vs Wake Forest | ",
 "Upcoming Nov 10 Men's · Vanderbilt vs Memphis | ",
 "Upcoming Nov 13 Men's · Vanderbilt vs Prairie View A&M | ",
 "Upcoming Nov 17 Men's · Vanderbilt vs Eastern Illinois | ",
 "Upcoming Nov 20 Men's · Vanderbilt vs UCF | ",
 "Upcoming Nov 24, 6:00 PM Men's · Vanderbilt at Ohio State | ",
 "Upcoming Nov 27 Men's · Vanderbilt vs Southern | ",
 "Upcoming Dec 2, 6:15 PM Men's · Vanderbilt at Notre Dame | ",
 "Upcoming Dec 6 Men's · Vanderbilt at California | ",
 "Upcoming Dec 12, 1:00 PM Men's · Vanderbilt vs West Georgia | ",
 "Upcoming Dec 18 Men's · Vanderbilt vs Southern Indiana | ",
 "Upcoming Dec 21 Men's · Vanderbilt vs Milwaukee | ",
 "Upcoming Dec 29, 7:00 PM Men's · Vanderbilt vs Alcorn State | ",
 "Upcoming Jan 2, 1:00 PM Men's · Vanderbilt at Tennessee | ",
 "Upcoming Jan 6, 6:00 PM Men's · Vanderbilt vs Mississippi State | ",
 "Upcoming Jan 9, 10:00 AM Men's · Vanderbilt at Florida | ",
 "Upcoming Jan 12, 8:00 PM Men's · Vanderbilt vs South Carolina | ",
 "Upcoming Jan 16, 3:00 PM Men's · Vanderbilt at Kentucky | ",
 "Upcoming Jan 19, 6:00 PM Men's · Vanderbilt vs Auburn | ",
 "Upcoming Jan 23, 7:00 PM Men's · Vanderbilt vs Missouri | ",
 "Upcoming Jan 27, 8:00 PM Men's · Vanderbilt at Ole Miss | ",
 "Upcoming Jan 30, 1:00 PM Men's · Vanderbilt vs Texas A&M | ",
 "Upcoming Feb 2, 8:00 PM Men's · Vanderbilt at LSU | ",
 "Upcoming Feb 6 Men's · Vanderbilt vs Arkansas | ",
 "Upcoming Feb 9, 6:00 PM Men's · Vanderbilt at Georgia | ",
 "Upcoming Feb 13, 1:00 PM Men's · Vanderbilt vs Texas | ",
 "Upcoming Feb 20, 3:00 PM Men's · Vanderbilt at Texas A&M | ",
 "Upcoming Feb 23, 8:00 PM Men's · Vanderbilt vs Kentucky | ",
 "Upcoming Feb 27, 7:30 PM Men's · Vanderbilt at Alabama | ",
 "Upcoming Mar 3, 8:00 PM Men's · Vanderbilt at Oklahoma | ",
 "Upcoming Mar 6, 1:00 PM Men's · Vanderbilt vs Tennessee | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Vanderbilt vs Lipscomb | ",
 "Upcoming Nov 4, 6:30 PM Women's · Vanderbilt vs Queens | ",
 "Upcoming Nov 9, 6:30 PM Women's · Vanderbilt vs Morehead State | ",
 "Upcoming Nov 11, 6:30 PM Women's · Vanderbilt vs Western Kentucky | ",
 "Upcoming Nov 15, 12:00 PM Women's · Vanderbilt vs Iowa | ",
 "Upcoming Nov 18, 6:30 PM Women's · Vanderbilt vs North Alabama | ",
 "Upcoming Nov 23, 4:00 PM Women's · Vanderbilt vs Arizona | ",
 "Upcoming Nov 25, 5:30 PM Women's · Vanderbilt vs Oregon State | ",
 "Upcoming Nov 29, 12:00 PM Women's · Vanderbilt vs Georgia State | ",
 "Upcoming Dec 3, 8:00 PM Women's · Vanderbilt vs Notre Dame | ",
 "Upcoming Dec 6, 1:00 PM Women's · Vanderbilt vs South Alabama | ",
 "Upcoming Dec 9, 4:00 PM Women's · Vanderbilt at Davidson | ",
 "Upcoming Dec 18, 7:30 PM Women's · Vanderbilt vs Belmont | ",
 "Upcoming Dec 21, 12:00 PM Women's · Vanderbilt vs Tennessee State | ",
 "Upcoming Dec 28, 6:30 PM Women's · Vanderbilt vs Little Rock | ",
 "Upcoming Dec 31, 8:00 PM Women's · Vanderbilt vs Arkansas | ",
 "Upcoming Jan 3, 12:00 PM Women's · Vanderbilt at LSU | ",
 "Upcoming Jan 7, 6:00 PM Women's · Vanderbilt at Auburn | ",
 "Upcoming Jan 10, 5:00 PM Women's · Vanderbilt vs Mississippi State | ",
 "Upcoming Jan 14, 8:30 PM Women's · Vanderbilt vs Texas A&M | ",
 "Upcoming Jan 17, 12:00 PM Women's · Vanderbilt at Texas | ",
 "Upcoming Jan 21, 6:30 PM Women's · Vanderbilt at Missouri | ",
 "Upcoming Jan 24, 2:00 PM Women's · Vanderbilt vs Georgia | ",
 "Upcoming Jan 28, 8:00 PM Women's · Vanderbilt at Oklahoma | ",
 "Upcoming Feb 4, 6:00 PM Women's · Vanderbilt vs South Carolina | ",
 "Upcoming Feb 7 Women's · Vanderbilt vs Tennessee | ",
 "Upcoming Feb 11, 7:30 PM Women's · Vanderbilt at Alabama | ",
 "Upcoming Feb 15, 5:00 PM Women's · Vanderbilt at Kentucky | ",
 "Upcoming Feb 21, 11:00 AM Women's · Vanderbilt vs Ole Miss | ",
 "Upcoming Feb 25, 6:30 PM Women's · Vanderbilt vs Missouri | ",
 "Upcoming Feb 28, 12:00 PM Women's · Vanderbilt at Florida | "
]);
  const v_wbowl=parse("Bowling","wbowl");
  assert.deepEqual(v_wbowl.map(line),[
 "Upcoming Oct 16 Vanderbilt at Chelsea Gilliam Penguin Classic | ",
 "Upcoming Oct 30 Vanderbilt at Destination Orlando | ",
 "Upcoming Nov 6 Vanderbilt at Bulldog Classic | ",
 "Upcoming Nov 20 Vanderbilt at FDU Jersey Jamboree | ",
 "Upcoming Jan 15 Vanderbilt at Northeast Classic | ",
 "Upcoming Jan 22 Vanderbilt at Prairie View Invitational | ",
 "Upcoming Feb 5 Vanderbilt at Flyer Classic | ",
 "Upcoming Feb 19 Vanderbilt at Big Red Invite | ",
 "Upcoming Mar 5 Vanderbilt at Music City Classic | ",
 "Upcoming Mar 17 Vanderbilt at Conference USA Championship | ",
 "Upcoming Apr 6 Vanderbilt at NCAA Championships | "
]);
  const v_mcross=parse("Cross Country","mcross");
  assert.deepEqual(v_mcross.map(line),[
 "Final Sep 1 Men's · Vanderbilt at Vanderbilt Invite | Completed",
 "Final Sep 25 Men's · Vanderbilt at Sean Earl Lakefront Invite | Completed",
 "Upcoming Oct 16 Men's · Vanderbilt at Pre-Nationals | ",
 "Upcoming Oct 30 Men's · Vanderbilt at SEC Championship | ",
 "Upcoming Nov 13 Men's · Vanderbilt at NCAA East Regionals | ",
 "Upcoming Nov 21 Men's · Vanderbilt at NCAA Championship | "
]);
  const v_wcross=parse("Cross Country","wcross");
  assert.deepEqual(v_wcross.map(line),[
 "Final Sep 1 Women's · Vanderbilt at Vanderbilt Invite | Completed",
 "Final Sep 25 Women's · Vanderbilt at Sean Earl Lakefront Invite | Completed",
 "Upcoming Oct 16 Women's · Vanderbilt at Pre-Nationals | ",
 "Upcoming Oct 30 Women's · Vanderbilt at SEC Championships | ",
 "Upcoming Nov 21 Women's · Vanderbilt at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Vanderbilt vs Austin Peay | W, 28-9",
 "Final Sep 12 Vanderbilt vs Delaware | W, 35-26",
 "Final Sep 19 Vanderbilt vs NC State | W, 35-31",
 "Final Sep 26 Vanderbilt at Auburn | L, 15-21",
 "Final Oct 3 Vanderbilt at Georgia | L, 14-38",
 "Upcoming Oct 10, 2:30 PM Vanderbilt vs Ole Miss | ",
 "Upcoming Oct 17 Vanderbilt vs Arkansas | ",
 "Upcoming Oct 24 Vanderbilt at Kentucky | ",
 "Upcoming Nov 7 Vanderbilt at Mississippi State | ",
 "Upcoming Nov 14 Vanderbilt vs Alabama | ",
 "Upcoming Nov 21 Vanderbilt at Florida | ",
 "Upcoming Nov 28 Vanderbilt vs Tennessee | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Aug 31 Men's · Vanderbilt at Visit Knoxville Collegiate | 5th of 17",
 "Final Sep 13 Men's · Vanderbilt at Inverness Intercollegiate | T6th of 18",
 "Final Sep 28 Men's · Vanderbilt at Ben Hogan Collegiate Invitational | T5th of 16",
 "Upcoming Oct 18 Men's · Vanderbilt at The Williams Cup | ",
 "Upcoming Feb 14 Men's · Vanderbilt at Watersound Invitational | ",
 "Upcoming Feb 28 Men's · Vanderbilt at Cabo Collegiate | ",
 "Upcoming Mar 15 Men's · Vanderbilt at Black Desert Collegiate | ",
 "Upcoming Apr 2 Men's · Vanderbilt at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · Vanderbilt at The Ford Collegiate | ",
 "Upcoming Apr 21 Men's · Vanderbilt at SEC Championships | ",
 "Upcoming May 17 Men's · Vanderbilt at NCAA Regional | ",
 "Upcoming May 28 Men's · Vanderbilt at NCAA Championships | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · Vanderbilt at Cougar Classic | 8th of 18",
 "Final Sep 18 Women's · Vanderbilt at Mason Rudolph Championship | 4th of 15",
 "Final Oct 5 Women's · Vanderbilt at The Ally | 9th of 17",
 "Upcoming Oct 19 Women's · Vanderbilt at The Fin at Freestone | ",
 "Upcoming Jan 31 Women's · Vanderbilt at Dominican Republic Classic | ",
 "Upcoming Feb 14 Women's · Vanderbilt at Moon Golf Invitational | ",
 "Upcoming Mar 7 Women's · Vanderbilt at Chris Banister Golf Classic | ",
 "Upcoming Mar 21 Women's · Vanderbilt at Clemson Invitational | ",
 "Upcoming Mar 30 Women's · Vanderbilt at Mini Mason | ",
 "Upcoming Apr 16 Women's · Vanderbilt at SEC Championship | ",
 "Upcoming May 10 Women's · Vanderbilt at NCAA Franklin Regional | ",
 "Upcoming May 21 Women's · Vanderbilt at NCAA Championships | "
]);
  const v_wlax=parse("Lacrosse","wlax");
  assert.deepEqual(v_wlax.map(line),[]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Vanderbilt vs SMU | W, 4-3",
 "Final Aug 16 Vanderbilt vs ETSU | W, 4-0",
 "Final Aug 21 Vanderbilt vs Memphis | W, 4-1",
 "Final Aug 27 Vanderbilt at Rice | W, 3-1",
 "Final Aug 30 Vanderbilt at Houston | W, 2-1",
 "Final Sep 3 Vanderbilt vs Tennessee Tech | W, 7-0",
 "Final Sep 6 Vanderbilt vs Xavier | W, 4-1",
 "Final Sep 10 Vanderbilt at Georgia | T, 1-1",
 "Final Sep 18 Vanderbilt vs Texas A&M | W, 5-0",
 "Final Sep 24 Vanderbilt at Ole Miss | W, 4-0",
 "Final Sep 27 Vanderbilt at Tennessee | W, 3-1",
 "Final Oct 2 Vanderbilt vs Kentucky | W, 2-0",
 "Upcoming Oct 9, 6:00 PM Vanderbilt at Missouri | ",
 "Upcoming Oct 15, 6:00 PM Vanderbilt vs Florida | ",
 "Upcoming Oct 18, 6:00 PM Vanderbilt at Alabama | ",
 "Upcoming Oct 23, 7:00 PM Vanderbilt vs Texas | ",
 "Upcoming Nov 1, 12:00 PM Vanderbilt vs South Carolina | ",
 "Upcoming Nov 8 Vanderbilt vs Southeastern Conference | "
]);
  const v_wswim=parse("Swimming & Diving","wswim");
  assert.deepEqual(v_wswim.map(line),[
 "Final Sep 26 Vanderbilt vs Florida | L, 55-206",
 "Upcoming Oct 23 Vanderbilt vs Liberty | ",
 "Upcoming Oct 23 Vanderbilt vs Florida International | ",
 "Upcoming Oct 23 Vanderbilt at Miami (Fla.) | ",
 "Upcoming Nov 6 Vanderbilt vs Rutgers | ",
 "Upcoming Nov 6 Vanderbilt at Queens | ",
 "Upcoming Nov 17 Vanderbilt at Phill Hansel Invitational | ",
 "Upcoming Dec 18 Vanderbilt at Texas | ",
 "Upcoming Jan 8 Vanderbilt vs Florida Gulf Coast | ",
 "Upcoming Jan 8 Vanderbilt vs Arkansas | ",
 "Upcoming Jan 8 Vanderbilt vs Indiana State | ",
 "Upcoming Jan 14 Vanderbilt vs TYR Pro Series | ",
 "Upcoming Feb 6 Vanderbilt at Louisville Invitational | ",
 "Upcoming Feb 16 Vanderbilt at SEC Championships | ",
 "Upcoming Feb 26 Vanderbilt vs NCAA Last Chance Meet | ",
 "Upcoming Mar 11 Vanderbilt at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Vanderbilt at NCAA Championships | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[
 "Today Oct 8 Men's · Vanderbilt at ITA Ohio Valley Regional Championships | ",
 "Upcoming Oct 23 Men's · Vanderbilt at RTC Collegiate Invite | ",
 "Upcoming Nov 5 Men's · Vanderbilt at ITA South Sectional Championships | ",
 "Upcoming Nov 17 Men's · Vanderbilt at NCAA Division I Individual Tennis Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Today Oct 8 Women's · Vanderbilt at ITA Regional Championships | ",
 "Upcoming Nov 5 Women's · Vanderbilt at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Vanderbilt at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · Vanderbilt at June Stewart Invitational | ",
 "Upcoming Nov 17 Women's · Vanderbilt at NCAA Division I Individual Championships | "
]);
  const v_wtrack=parse("Track & Field","wtrack");
  assert.deepEqual(v_wtrack.map(line),[]);
  const v_wvolley=parse("Volleyball","wvolley");
  assert.deepEqual(v_wvolley.map(line),[
 "Final Aug 28 Vanderbilt vs Charleston | W, 3-0",
 "Final Aug 29 Vanderbilt vs Memphis | W, 3-0",
 "Final Sep 1 Vanderbilt vs Maryland | W, 3-0",
 "Final Sep 2 Vanderbilt vs Rutgers | W, 3-1",
 "Final Sep 6 Vanderbilt vs Samford | W, 3-0",
 "Final Sep 9 Vanderbilt at Boston College | W, 3-0",
 "Final Sep 13 Vanderbilt vs North Carolina | W, 3-1",
 "Final Sep 17 Vanderbilt at Belmont | W, 3-1",
 "Final Sep 18 Vanderbilt vs Lipscomb | W, 3-0",
 "Final Sep 23 Vanderbilt vs Kentucky | L, 1-3",
 "Final Sep 27 Vanderbilt at Missouri | L, 1-3",
 "Final Sep 30 Vanderbilt at LSU | W, 3-0",
 "Final Oct 4 Vanderbilt at Ole Miss | W, 3-0",
 "Upcoming Oct 9, 7:00 PM Vanderbilt vs Auburn | ",
 "Upcoming Oct 11, 1:00 PM Vanderbilt vs Florida | ",
 "Upcoming Oct 16, 7:00 PM Vanderbilt vs Alabama | ",
 "Upcoming Oct 18, 1:00 PM Vanderbilt vs Mississippi State | ",
 "Upcoming Oct 25, 12:00 PM Vanderbilt at Tennessee | ",
 "Upcoming Oct 30, 6:00 PM Vanderbilt at South Carolina | ",
 "Upcoming Nov 1, 1:00 PM Vanderbilt at Georgia | ",
 "Upcoming Nov 6, 7:00 PM Vanderbilt vs Texas A&M | ",
 "Upcoming Nov 8, 1:00 PM Vanderbilt vs Texas | ",
 "Upcoming Nov 13, 7:00 PM Vanderbilt at Arkansas | ",
 "Upcoming Nov 15, 2:00 PM Vanderbilt at Oklahoma | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_wbowl,"Bowling wbowl");
  ownRecapsOnly(v_mcross,"Cross Country mcross");
  ownRecapsOnly(v_wcross,"Cross Country wcross");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_wlax,"Lacrosse wlax");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_wswim,"Swimming & Diving wswim");
  ownRecapsOnly(v_mten,"Tennis mten");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_wtrack,"Track & Field wtrack");
  ownRecapsOnly(v_wvolley,"Volleyball wvolley");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Vanderbilt module checks passed');

// Vanderbilt's cards (schedule-item-block): the day box carries the full date
// (datetime), the heading holds the divider, the ranking ("##21/20") and the
// opponent; the label under it marks an exhibition; times read "2:30 p.m.".
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();
const published=slug=>{const raw=fixture(`${slug}-schedule.html.gz`),stat=label=>(raw.match(new RegExp(`schedule-stats-item__label[^>]*>${label}</strong><strong class="schedule-stats-item__value">([^<]*)`))||[])[1];return[stat('Overall'),stat('Conf\\.')];};
{
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Vanderbilt vs Austin Peay","W, 28-9"],["Vanderbilt vs Delaware","W, 35-26"],["Vanderbilt vs NC State","W, 35-31"],["Vanderbilt at Auburn","L, 15-21"],["Vanderbilt at Georgia","L, 14-38"]]);
  assert.equal(parse('Football','football').find(e=>e.opponent==='Ole Miss').display_time,'Oct 10, 2:30 PM');
  assert.equal(parse('Soccer','wsoc').find(e=>e.start_time.startsWith('2026-08-21')).opponent,'Memphis');
  assert.deepEqual(parse('Basketball','mbball').slice(0,2).map(e=>e.opponent),['UAB (Exhibition)','Miami (Exhibition)']);
  // The records the schedule pages publish (Overall, Conf.).
  for(const [sport,slug] of [['Football','football'],['Volleyball','wvolley'],['Soccer','wsoc']])assert.deepEqual(records(sport,slug),published(slug),`${sport}: the computed records are the official ones`);
  assert.deepEqual(published('wvolley'),['11-2','2-2']);
  // Golf's round cards ("• Rounds 1 & 2", "• Round 3") are one tournament,
  // placed by its last round; a tournament played by individuals only is not
  // the team's.
  assert.deepEqual(parse('Golf','mgolf').filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.end_time]),[["Visit Knoxville Collegiate","5th of 17","2026-09-01T23:59:59Z"],["Inverness Intercollegiate","T6th of 18","2026-09-15T23:59:59Z"],["Ben Hogan Collegiate Invitational","T5th of 16","2026-09-29T23:59:59Z"]]);
  assert.ok(parse('Golf','wgolf').every(e=>e.title.includes(' at ')),'every golf tournament is a meet away');
  // A page still titled last season is empty until the new one is published.
  assert.deepEqual(parse('Track & Field','wtrack'),[]);
  // Players' pro events on the tennis pages are not team events.
  assert.ok(!parse('Tennis','mten').some(e=>/^ATP\b/.test(e.opponent)));
  // A swimming dual's score is read without its decimals; SEC Championships'
  // day cards are one meet.
  assert.equal(parse('Swimming & Diving','wswim')[0].headline,'L, 55-206');
  assert.equal(parse('Swimming & Diving','wswim').filter(e=>e.opponent==='SEC Championships').length,1);
}
// Cross country from TFRRS: the meet page holds both races; each team's event
// keeps its own.
{
  recapFixtures.set('https://www.tfrrs.org/teams/xc/TN_college_f_Vanderbilt.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/TN_college_m_Vanderbilt.html',fixture('tfrrs-team-m.html.gz'));
  for(const url of ['https://www.tfrrs.org/results/xc/28452/Vanderbilt_Opener','https://www.tfrrs.org/results/xc/28452/Vanderbilt_Opener/'])recapFixtures.set(url,fixture('tfrrs-28452.html.gz'));
  for(const [slug,headline] of [['wcross',"Women's team: 1st · 20 pts"],['mcross',"Men's team: 3rd · 75 pts"]]){
    const meet=parse('Cross Country',slug).find(e=>e.opponent==='Vanderbilt Invite');
    await worker.vanderbiltHandlers.attachMeetResults(meet);
    assert.equal(meet.headline,headline);
    assert.ok(meet.results.length&&meet.results.every(row=>row.group.startsWith(headline.split("'")[0])),`${slug}: only its own race`);
  }
  recapFixtures.clear();requests.length=0;
}
// A volleyball final whose card links no story takes the sport's news-list
// story dated the game day or the next whose opening names the opponent and
// the result; a preview ("SEC Startup", Kentucky) is not one.
{
  recapFixtures.set('https://vucommodores.com/sports/wvolley/news',fixture('wvolley-news.html.gz'));
  for(const name of ['2026-09-17-dores-around-nashville','2026-09-18-dores-best-belmont','2026-09-19-relentless-run','2026-09-23-sec-startup','2026-09-27-commodores-on-the-hunt','2026-09-28-vb-recap-at-mizzou']){
    const [y,m,d,...slug]=name.split('-');recapFixtures.set(`https://vucommodores.com/news/${y}/${m}/${d}/${slug.join('-')}`,fixture(`archive-${name}.html.gz`));
  }
  const missing=parse('Volleyball','wvolley').filter(e=>e.status==='Final'&&!e.recap_url);
  for(const event of missing)await worker.vanderbiltHandlers.attachArchiveStory(event);
  assert.deepEqual(missing.map(e=>[e.opponent,e.recap_url||null]),[["Belmont","https://vucommodores.com/news/2026/09/18/dores-best-belmont"],["Lipscomb","https://vucommodores.com/news/2026/09/19/relentless-run"],["Kentucky",null],["Missouri","https://vucommodores.com/news/2026/09/28/vb-recap-at-mizzou"]]);
  recapFixtures.clear();requests.length=0;
}
// A broken athlete link (Merritt Zieminick's profile: "instagram.com/merritt%20_zieminick")
// is no link: its prefix "merritt" is someone else's account. A doubled
// address keeps its final handle (Bowling).
assert.equal(worker.officialCardInstagram('https://www.instagram.com/merritt%20_zieminick'),null);
assert.equal(worker.verifiedInstagram('<a href="https://www.instagram.com/merritt%20_zieminick">Instagram</a>'),null);
assert.equal(worker.officialCardInstagram('https://www.instagram.com/https://www.instagram.com/lindsaygreim.bowling/'),'https://www.instagram.com/lindsaygreim.bowling/');
console.log('Vanderbilt hand-written checks passed');
