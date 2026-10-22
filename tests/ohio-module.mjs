import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ohioSchool} from '../src/schools/ohio.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ohio');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ohioHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ohio-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ohiobobcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ohio'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',ohioSchool.scheduleUrls],['roster',ohioSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ohio|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ohiobobcats.com',`${key} must stay on ohiobobcats.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ohiobobcats.com/sports/baseball/schedule"],"roster":["https://ohiobobcats.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ohiobobcats.com/sports/wbball/schedule","https://ohiobobcats.com/sports/mbball/schedule"],"roster":["https://ohiobobcats.com/sports/wbball/roster","https://ohiobobcats.com/sports/mbball/roster"],"combined":true},"Cross Country":{"schedule":["https://ohiobobcats.com/sports/wcross/schedule","https://ohiobobcats.com/sports/mcross/schedule"],"roster":["https://ohiobobcats.com/sports/wcross/roster","https://ohiobobcats.com/sports/mcross/roster"],"combined":true},"Field Hockey":{"schedule":["https://ohiobobcats.com/sports/fhockey/schedule"],"roster":["https://ohiobobcats.com/sports/fhockey/roster"],"combined":false},"Football":{"schedule":["https://ohiobobcats.com/sports/football/schedule"],"roster":["https://ohiobobcats.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ohiobobcats.com/sports/wgolf/schedule","https://ohiobobcats.com/sports/mgolf/schedule"],"roster":["https://ohiobobcats.com/sports/wgolf/roster","https://ohiobobcats.com/sports/mgolf/roster"],"combined":true},"Soccer":{"schedule":["https://ohiobobcats.com/sports/wsoc/schedule"],"roster":["https://ohiobobcats.com/sports/wsoc/roster"],"combined":false},"Softball":{"schedule":["https://ohiobobcats.com/sports/softball/schedule"],"roster":["https://ohiobobcats.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ohiobobcats.com/sports/wswim/schedule"],"roster":["https://ohiobobcats.com/sports/wswim/roster"],"combined":false},"Track & Field":{"schedule":["https://ohiobobcats.com/sports/wtrack/schedule"],"roster":["https://ohiobobcats.com/sports/wtrack/roster"],"combined":false},"Volleyball":{"schedule":["https://ohiobobcats.com/sports/wvball/schedule"],"roster":["https://ohiobobcats.com/sports/wvball/roster"],"combined":false},"Wrestling":{"schedule":["https://ohiobobcats.com/sports/wrestling/schedule"],"roster":["https://ohiobobcats.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ohio|"+sport+"':"),`${sport} routes must live in the Ohio module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ohiobobcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ohioHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ohio)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 2:00 PM Ohio vs Wright State | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Oct 21, 7:00 PM Women's · Ohio vs Denison (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Ohio vs Louisiana Monroe | ",
 "Upcoming Nov 9, 11:00 AM Women's · Ohio vs Otterbein | ",
 "Upcoming Nov 14, 1:00 PM Women's · Ohio vs Georgia | ",
 "Upcoming Nov 18, 7:00 PM Women's · Ohio at Howard | ",
 "Upcoming Nov 21, 1:00 PM Women's · Ohio vs Xavier | ",
 "Upcoming Nov 30, 6:00 PM Women's · Ohio at Marshall | ",
 "Upcoming Dec 5, 1:00 PM Women's · Ohio vs Radford | ",
 "Upcoming Dec 14, 11:00 AM Women's · Ohio at Southern Illinois | ",
 "Upcoming Dec 16, 8:00 PM Women's · Ohio at Saint Louis | ",
 "Upcoming Dec 22, 1:00 PM Women's · Ohio vs Davidson | ",
 "Upcoming Dec 29, 12:00 PM Women's · Ohio vs Ohio Wesleyan | ",
 "Upcoming Jan 2, 1:00 PM Women's · Ohio vs Bowling Green | ",
 "Upcoming Jan 6, 7:00 PM Women's · Ohio at Western Michigan | ",
 "Upcoming Jan 9, 1:00 PM Women's · Ohio at Eastern Michigan | ",
 "Upcoming Jan 13, 7:00 PM Women's · Ohio vs Toledo | ",
 "Upcoming Jan 16, 12:00 PM Women's · Ohio at Akron | ",
 "Upcoming Jan 20, 7:00 PM Women's · Ohio vs Buffalo | ",
 "Upcoming Jan 23, 1:00 PM Women's · Ohio vs Miami | ",
 "Upcoming Jan 27, 7:00 PM Women's · Ohio at Toledo | ",
 "Upcoming Jan 30, 1:00 PM Women's · Ohio vs UMass | ",
 "Upcoming Feb 3, 7:00 PM Women's · Ohio at Kent State | ",
 "Upcoming Feb 6 Women's · Ohio at Sun Belt | ",
 "Upcoming Feb 10, 7:00 PM Women's · Ohio vs Ball State | ",
 "Upcoming Feb 13, 5:00 PM Women's · Ohio at Bowling Green | ",
 "Upcoming Feb 17, 6:30 PM Women's · Ohio at Central Michigan | ",
 "Upcoming Feb 20, 1:00 PM Women's · Ohio vs Eastern Michigan | ",
 "Upcoming Feb 24, 6:00 PM Women's · Ohio at Buffalo | ",
 "Upcoming Feb 27, 1:00 PM Women's · Ohio vs Western Michigan | ",
 "Upcoming Mar 3, 7:00 PM Women's · Ohio vs Akron | ",
 "Upcoming Mar 6 Women's · Ohio at Miami | ",
 "Upcoming Mar 10 Women's · Ohio at Mid-American Conference Tournament | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Ohio at South Alabama | ",
 "Upcoming Nov 7, 1:00 PM Men's · Ohio vs NC A&T | ",
 "Upcoming Nov 13, 7:00 PM Men's · Ohio at Purdue | ",
 "Upcoming Nov 18, 7:00 PM Men's · Ohio vs Morehead State | ",
 "Upcoming Nov 24, 11:00 AM Men's · Ohio vs New Mexico State | ",
 "Upcoming Nov 25, 11:00 AM Men's · Ohio vs Rice | ",
 "Upcoming Dec 2, 7:00 PM Men's · Ohio vs Toledo | ",
 "Upcoming Dec 5 Men's · Ohio at Central Michigan | ",
 "Upcoming Dec 13, 4:00 PM Men's · Ohio vs Kent State – Tuscarawas | ",
 "Upcoming Dec 16, 7:00 PM Men's · Ohio at Ball State | ",
 "Upcoming Dec 19, 2:00 PM Men's · Ohio vs Buffalo | ",
 "Upcoming Dec 23, 2:00 PM Men's · Ohio at Robert Morris | ",
 "Upcoming Dec 29, 3:00 PM Men's · Ohio vs Bryant and Stratton (OH) | ",
 "Upcoming Jan 2, 2:00 PM Men's · Ohio at Bowling Green | ",
 "Upcoming Jan 5, 7:00 PM Men's · Ohio vs Akron | ",
 "Upcoming Jan 9, 2:00 PM Men's · Ohio vs UMass | ",
 "Upcoming Jan 12, 7:00 PM Men's · Ohio at Kent State | ",
 "Upcoming Jan 16, 2:00 PM Men's · Ohio vs Eastern Michigan | ",
 "Upcoming Jan 19, 7:00 PM Men's · Ohio vs Western Michigan | ",
 "Upcoming Jan 23, 12:00 PM Men's · Ohio at UMass | ",
 "Upcoming Jan 26, 7:00 PM Men's · Ohio at Akron | ",
 "Upcoming Jan 29, 7:00 PM Men's · Ohio vs Miami (OH) | ",
 "Upcoming Feb 2, 6:30 PM Men's · Ohio at Buffalo | ",
 "Upcoming Feb 6, 2:00 PM Men's · Ohio vs Sun Belt | ",
 "Upcoming Feb 9, 7:00 PM Men's · Ohio at Western Michigan | ",
 "Upcoming Feb 13, 2:00 PM Men's · Ohio vs Central Michigan | ",
 "Upcoming Feb 16, 6:30 PM Men's · Ohio at Eastern Michigan | ",
 "Upcoming Feb 20, 4:00 PM Men's · Ohio vs Ball State | ",
 "Upcoming Feb 23, 7:00 PM Men's · Ohio vs Kent State | ",
 "Upcoming Feb 27 Men's · Ohio at Miami (OH) | ",
 "Upcoming Mar 2, 7:00 PM Men's · Ohio vs Bowling Green | ",
 "Upcoming Mar 5, 7:00 PM Men's · Ohio at Toledo | "
]);
  const v_wcross=parse("Cross Country","wcross");
  assert.deepEqual(v_wcross.map(line),[
 "Final Sep 4 Women's · Ohio at Mel Brodt Collegiate Open | 1st Place (22 Points)",
 "Final Sep 11 Women's · Ohio at Spartan Invitational | 4th Place (111 Points)",
 "Final Sep 25 Women's · Ohio at Sean Earl Loyola Lakefront Invitational | 16th Place (409 Points)",
 "Final Oct 16 Women's · Ohio at Under Armour Pre National Invitational | 40th",
 "Upcoming Oct 30 Women's · Ohio at Mid-American Conference Championships | ",
 "Upcoming Nov 13 Women's · Ohio at NCAA Great Lakes Regional Championships | ",
 "Upcoming Nov 21 Women's · Ohio at NCAA Championships | "
]);
  const v_mcross=parse("Cross Country","mcross");
  assert.deepEqual(v_mcross.map(line),[
 "Final Sep 4 Men's · Ohio at Mel Brodt Collegiate Open | 1st Place (19 Points)",
 "Final Sep 11 Men's · Ohio at Spartan Invitational | 4th Place (119 Points)",
 "Final Sep 25 Men's · Ohio at Sean Earl Loyola Lakefront Invitational | 17th Place (520 Points)",
 "Final Oct 16 Men's · Ohio at Under Armour Pre National Invitational | 44th",
 "Upcoming Oct 30 Men's · Ohio at Mid-American Conference Championships | ",
 "Upcoming Nov 13 Men's · Ohio at NCAA Great Lakes Regional Championships | ",
 "Upcoming Nov 21 Men's · Ohio at NCAA Championships | "
]);
  const v_fhockey=parse("Field Hockey","fhockey");
  assert.deepEqual(v_fhockey.map(line),[
 "Final Aug 28 Ohio vs Michigan State | L, 1-3",
 "Final Aug 30 Ohio vs Saint Louis | W, 2-1",
 "Final Sep 4 Ohio at Queens | W, 3-2",
 "Final Sep 6 Ohio at Wake Forest | L, 1-6",
 "Final Sep 13 Ohio vs Davidson | L, 1-2",
 "Final Sep 18 Ohio at UMass | L, 0-6",
 "Final Sep 25 Ohio vs Appalachian State | W, 2-1",
 "Final Sep 27 Ohio at Bellarmine | W, 3-2",
 "Final Oct 2 Ohio vs Central Michigan | W, 2-1",
 "Final Oct 4 Ohio vs Mercyhurst | W, 14-0",
 "Final Oct 9 Ohio at Miami (OH) | L, 0-10",
 "Final Oct 11 Ohio at Indiana | L, 0-5",
 "Final Oct 16 Ohio vs James Madison | L, 0-6",
 "Final Oct 18 Ohio at Longwood | W, 3-1",
 "Upcoming Oct 23, 12:00 PM Ohio at Ball State | ",
 "Upcoming Oct 30, 3:00 PM Ohio vs Kent State | ",
 "Upcoming Nov 4 Ohio at Mid-American Conference Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Ohio at Nebraska | L, 21-49",
 "Final Sep 12 Ohio vs Jacksonville State | W, 29-27",
 "Final Sep 19 Ohio at South Alabama | L, 36-41",
 "Final Sep 26 Ohio vs Stonehill | W, 35-7",
 "Final Oct 3 Ohio at Kent State | W, 13-10",
 "Final Oct 10 Ohio vs Central Michigan | W, 31-14",
 "Final Oct 17 Ohio at Sacramento State | W, 48-7",
 "Upcoming Oct 24, 4:00 PM Ohio vs Eastern Michigan | ",
 "Upcoming Nov 3, 7:00 PM Ohio at Akron | ",
 "Upcoming Nov 10, 7:00 PM Ohio at Miami (OH) | ",
 "Upcoming Nov 17, 7:00 PM Ohio vs Ball State | ",
 "Upcoming Nov 27, 12:00 PM Ohio vs Toledo | ",
 "Upcoming Dec 5, 12:00 PM Ohio at MAC Championship | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 6 Women's · Ohio at A-Ga-Ming Invitational | 9th",
 "Final Sep 14 Women's · Ohio at Rocket Classic | 6th",
 "Final Sep 20 Women's · Ohio at Mary Fossum Invitational | Completed",
 "Final Oct 5 Women's · Ohio at Butler Fall Invitational | Completed",
 "Final Oct 19 Women's · Ohio at Dayton Flyer Invitational | 5th"
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 14 Men's · Ohio at 2026 RedHawk Intercollegiate | Completed",
 "Final Sep 27 Men's · Ohio at Badger Invitational | 14th",
 "Final Oct 2 Men's · Ohio at Indy at Forest Hills | Completed",
 "Final Oct 12 Men's · Ohio at Moraine Intercollegiate | 12th",
 "Final Oct 12 Men's · Ohio at Raider Individual | No team score (individuals only)",
 "Final Oct 19 Men's · Ohio at Dayton Flyer Invitational | 5th",
 "Upcoming Feb 7 Men's · Ohio at Compadres Collegiate | ",
 "Upcoming Feb 28 Men's · Ohio at Lake Jovita Invitational | ",
 "Upcoming Mar 8 Men's · Ohio at Donald Ross Collegiate | ",
 "Upcoming Mar 27 Men's · Ohio at Sweetens Cove Intercollegiate | ",
 "Upcoming Apr 12 Men's · Ohio at Indian Ridge Shootout | ",
 "Upcoming Apr 30 Men's · Ohio at Mid-American Conference Championships | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Ohio vs UIC | W, 2-1",
 "Final Aug 23 Ohio at Northern Kentucky | L, 2-3",
 "Final Aug 30 Ohio vs Mercyhurst | W, 6-0",
 "Final Sep 3 Ohio vs Pittsburgh | L, 0-3",
 "Final Sep 6 Ohio vs Indiana | L, 2-3",
 "Final Sep 13 Ohio at Duquesne | W, 2-1",
 "Final Sep 17 Ohio vs Western Michigan | L, 2-3",
 "Final Sep 20 Ohio vs UMass | L, 0-2",
 "Final Sep 27 Ohio at Akron | L, 0-1",
 "Final Oct 1 Ohio vs Central Michigan | T, 2-2",
 "Final Oct 4 Ohio at Buffalo | W, 1-0",
 "Final Oct 11 Ohio vs Kent State | L, 0-4",
 "Final Oct 15 Ohio at Miami (OH) | L, 0-1",
 "Final Oct 18 Ohio vs Eastern Michigan | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Ohio at Ball State | ",
 "Upcoming Oct 29, 3:00 PM Ohio vs Toledo | ",
 "Upcoming Nov 1, 1:00 PM Ohio at Bowling Green | ",
 "Upcoming Nov 7 Ohio at Mid-American Conference Tournament | ",
 "Upcoming Nov 10 Ohio at Mid-American Conference Tournament | ",
 "Upcoming Nov 13 Ohio at Mid-American Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_wswim=parse("Swimming & Diving","wswim");
  assert.deepEqual(v_wswim.map(line),[
 "Final Oct 2 Ohio at Miami | L, 106.00-193.00",
 "Final Oct 2 Ohio at North Florida | W, 221.00-72.00",
 "Final Oct 15 Ohio vs Illinois State | W, 293.00-57.00",
 "Upcoming Nov 6, 2:00 PM Ohio at Marshall | ",
 "Upcoming Nov 19 Ohio at Navy Fall Invitational | ",
 "Upcoming Dec 2 Ohio at Toyota US Open | ",
 "Upcoming Dec 3 Ohio at Ohio BSC Invite | ",
 "Upcoming Jan 15, 4:00 PM Ohio at Toledo | ",
 "Upcoming Jan 16, 11:00 AM Ohio at Eastern Michigan | ",
 "Upcoming Feb 5, 5:00 PM Ohio vs Miami (OH) and Youngstown State | ",
 "Upcoming Feb 24 Ohio at Mid-American Conference Championships | ",
 "Upcoming Mar 8 Ohio at Zone C Diving Championships | ",
 "Upcoming Mar 11 Ohio at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Ohio at NCAA Championships | "
]);
  const v_wtrack=parse("Track & Field","wtrack");
  assert.deepEqual(v_wtrack.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 28 Ohio vs Bucknell | W, 3-0",
 "Final Aug 28 Ohio vs Niagara | W, 3-0",
 "Final Aug 29 Ohio at Marshall | W, 3-0",
 "Final Sep 3 Ohio at IU Indy | L, 0-3",
 "Final Sep 4 Ohio vs Youngstown State | W, 3-1",
 "Final Sep 5 Ohio at Butler | L, 0-3",
 "Final Sep 12 Ohio at Penn State | L, 0-3",
 "Final Sep 13 Ohio vs Stanford | L, 0-3",
 "Final Sep 18 Ohio vs Morgan State | W, 3-1",
 "Final Sep 18 Ohio vs UNC Asheville | W, 3-0",
 "Final Sep 19 Ohio vs Mercyhurst | W, 3-1",
 "Final Sep 25 Ohio at Eastern Michigan | W, 3-1",
 "Final Sep 26 Ohio at Central Michigan | W, 3-0",
 "Final Oct 2 Ohio vs Akron | W, 3-1",
 "Final Oct 3 Ohio vs Akron | W, 3-1",
 "Final Oct 9 Ohio at Bowling Green | L, 2-3",
 "Final Oct 10 Ohio at Bowling Green | L, 0-3",
 "Final Oct 16 Ohio vs Ball State | L, 0-3",
 "Final Oct 17 Ohio vs Ball State | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Ohio at Toledo | ",
 "Upcoming Oct 24, 4:30 PM Ohio at Toledo | ",
 "Upcoming Oct 27, 6:00 PM Ohio vs Kent State | ",
 "Upcoming Oct 30, 6:00 PM Ohio vs Western Michigan | ",
 "Upcoming Nov 3, 6:00 PM Ohio at Kent State | ",
 "Upcoming Nov 8, 4:00 PM Ohio vs Miami (OH) | ",
 "Upcoming Nov 12, 6:00 PM Ohio at Miami (OH) | ",
 "Upcoming Nov 13, 5:00 PM Ohio vs Buffalo | ",
 "Upcoming Nov 20 Ohio at Mid-American Conference Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Ohio vs Southeast Open | ",
 "Upcoming Nov 7, 7:00 PM Ohio at Bellarmine | ",
 "Upcoming Nov 14, 10:00 AM Ohio at Princeton | ",
 "Upcoming Nov 14, 10:00 AM Ohio at Duke | ",
 "Upcoming Nov 14, 10:00 AM Ohio at Chattanooga | ",
 "Upcoming Nov 22 Ohio at Maryland | ",
 "Upcoming Nov 22 Ohio at Morgan State | ",
 "Upcoming Dec 4 Ohio at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 20, 1:00 PM Ohio vs Gardner-Webb | ",
 "Upcoming Jan 3, 1:00 PM Ohio vs Lock Haven | ",
 "Upcoming Jan 8, 6:00 PM Ohio at SIUE | ",
 "Upcoming Jan 15 Ohio at Rider | ",
 "Upcoming Jan 22, 6:00 PM Ohio at VMI | ",
 "Upcoming Jan 29, 7:00 PM Ohio vs Central Michigan | ",
 "Upcoming Feb 5, 7:00 PM Ohio vs Kent State | ",
 "Upcoming Feb 7, 1:00 PM Ohio vs Clarion | ",
 "Upcoming Feb 11, 7:00 PM Ohio at Edinboro | ",
 "Upcoming Feb 21, 12:00 PM Ohio at Buffalo | ",
 "Upcoming Mar 5 Ohio at Mid-American Conference Championships | ",
 "Upcoming Mar 18 Ohio at NCAA Championshipso | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wcross,"Cross Country wcross");
  ownRecapsOnly(v_mcross,"Cross Country mcross");
  ownRecapsOnly(v_fhockey,"Field Hockey fhockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_wswim,"Swimming & Diving wswim");
  ownRecapsOnly(v_wtrack,"Track & Field wtrack");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Ohio module checks passed");
