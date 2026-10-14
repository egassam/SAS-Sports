import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {virginiaSchool,VIRGINIA_TFRRS_TEAMS} from '../src/schools/virginia.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='virginia');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,virginiaHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/virginia-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit virginiasports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['virginia'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',virginiaSchool.scheduleUrls],['roster',virginiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('virginia|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'virginiasports.com',`${key} must stay on virginiasports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://virginiasports.com/sports/baseball/schedule"],"roster":["https://virginiasports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://virginiasports.com/sports/mbball/schedule","https://virginiasports.com/sports/wbball/schedule"],"roster":["https://virginiasports.com/sports/mbball/roster","https://virginiasports.com/sports/wbball/roster"],"combined":true},"Cross Country":{"schedule":["https://virginiasports.com/sports/xc/schedule"],"roster":["https://virginiasports.com/sports/xc/roster"],"combined":false},"Field Hockey":{"schedule":["https://virginiasports.com/sports/fhockey/schedule"],"roster":["https://virginiasports.com/sports/fhockey/roster"],"combined":false},"Football":{"schedule":["https://virginiasports.com/sports/football/schedule"],"roster":["https://virginiasports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://virginiasports.com/sports/mgolf/schedule","https://virginiasports.com/sports/wgolf/schedule"],"roster":["https://virginiasports.com/sports/mgolf/roster","https://virginiasports.com/sports/wgolf/roster"],"combined":true},"Lacrosse":{"schedule":["https://virginiasports.com/sports/mlax/schedule","https://virginiasports.com/sports/wlax/schedule"],"roster":["https://virginiasports.com/sports/mlax/roster","https://virginiasports.com/sports/wlax/roster"],"combined":true},"Rowing":{"schedule":["https://virginiasports.com/sports/wrow/schedule"],"roster":["https://virginiasports.com/sports/wrow/roster"],"combined":false},"Soccer":{"schedule":["https://virginiasports.com/sports/wsoc/schedule","https://virginiasports.com/sports/msoc/schedule"],"roster":["https://virginiasports.com/sports/wsoc/roster","https://virginiasports.com/sports/msoc/roster"],"combined":true},"Softball":{"schedule":["https://virginiasports.com/sports/softball/schedule"],"roster":["https://virginiasports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://virginiasports.com/sports/swimming/schedule"],"roster":["https://virginiasports.com/sports/swimming/roster"],"combined":false},"Tennis":{"schedule":["https://virginiasports.com/sports/mten/schedule","https://virginiasports.com/sports/wten/schedule"],"roster":["https://virginiasports.com/sports/mten/roster","https://virginiasports.com/sports/wten/roster"],"combined":true},"Track & Field":{"schedule":["https://virginiasports.com/sports/xctrack/schedule"],"roster":["https://virginiasports.com/sports/xctrack/roster"],"combined":false},"Volleyball":{"schedule":["https://virginiasports.com/sports/wvball/schedule"],"roster":["https://virginiasports.com/sports/wvball/roster"],"combined":false},"Wrestling":{"schedule":["https://virginiasports.com/sports/wrestling/schedule"],"roster":["https://virginiasports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'virginia|"+sport+"':"),`${sport} routes must live in the Virginia module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://virginiasports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.virginiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];





// BEGIN generated (scripts/generate-module-tests.mjs --school=virginia)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 1:00 PM Virginia vs James Madison | ",
 "Upcoming Feb 19, 4:00 PM Virginia vs TCU | ",
 "Upcoming Feb 20, 12:00 PM Virginia vs Arizona | ",
 "Upcoming Feb 21, 3:30 PM Virginia vs Texas | ",
 "Upcoming Feb 23 Virginia vs VMI | ",
 "Upcoming Feb 26 Virginia vs Cornell | ",
 "Upcoming Feb 27 Virginia vs Cornell | ",
 "Upcoming Feb 28 Virginia vs Cornell | ",
 "Upcoming Mar 2 Virginia at Old Dominion | ",
 "Upcoming Mar 5 Virginia vs Bucknell | ",
 "Upcoming Mar 6 Virginia vs Bucknell | ",
 "Upcoming Mar 7 Virginia vs Bucknell | ",
 "Upcoming Mar 9 Virginia vs Gardner-Webb | ",
 "Upcoming Mar 12 Virginia at Stanford | ",
 "Upcoming Mar 13 Virginia at Stanford | ",
 "Upcoming Mar 14 Virginia at Stanford | ",
 "Upcoming Mar 17 Virginia vs James Madison | ",
 "Upcoming Mar 19 Virginia vs NC State | ",
 "Upcoming Mar 20 Virginia vs NC State | ",
 "Upcoming Mar 21 Virginia vs NC State | ",
 "Upcoming Mar 23 Virginia vs Virginia Tech | ",
 "Upcoming Mar 25 Virginia vs Louisville | ",
 "Upcoming Mar 26 Virginia vs Louisville | ",
 "Upcoming Mar 27 Virginia vs Louisville | ",
 "Upcoming Mar 30 Virginia at Liberty | ",
 "Upcoming Apr 2 Virginia vs Notre Dame | ",
 "Upcoming Apr 3 Virginia vs Notre Dame | ",
 "Upcoming Apr 4 Virginia vs Notre Dame | ",
 "Upcoming Apr 6 Virginia at William & Mary | ",
 "Upcoming Apr 9 Virginia at Clemson | ",
 "Upcoming Apr 10 Virginia at Clemson | ",
 "Upcoming Apr 11 Virginia at Clemson | ",
 "Upcoming Apr 13 Virginia vs Liberty | ",
 "Upcoming Apr 15 Virginia vs North Carolina | ",
 "Upcoming Apr 16 Virginia vs North Carolina | ",
 "Upcoming Apr 17 Virginia vs North Carolina | ",
 "Upcoming Apr 20 Virginia vs Norfolk State | ",
 "Upcoming Apr 21 Virginia vs Old Dominion | ",
 "Upcoming Apr 23 Virginia at Duke | ",
 "Upcoming Apr 24 Virginia at Duke | ",
 "Upcoming Apr 25 Virginia at Duke | ",
 "Upcoming Apr 27 Virginia vs William & Mary | ",
 "Upcoming Apr 30 Virginia at Miami | ",
 "Upcoming May 1 Virginia at Miami | ",
 "Upcoming May 2 Virginia at Miami | ",
 "Upcoming May 5 Virginia vs VCU | ",
 "Upcoming May 9 Virginia vs Gardner-Webb (DH) | ",
 "Upcoming May 9 Virginia vs Gardner Webb (DH) | ",
 "Upcoming May 12 Virginia vs West Virginia | ",
 "Upcoming May 14 Virginia vs Georgia Tech | ",
 "Upcoming May 15 Virginia vs Georgia Tech | ",
 "Upcoming May 16 Virginia vs Georgia Tech | ",
 "Upcoming May 18 Virginia vs Richmond | ",
 "Upcoming May 20 Virginia at Wake Forest | ",
 "Upcoming May 21 Virginia at Wake Forest | ",
 "Upcoming May 22 Virginia at Wake Forest | ",
 "Upcoming May 25 Virginia at ACC Baseball Championship | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Final Sep 27 Men's · Virginia vs Vanderbilt (Exhibition) | L, 73-82",
 "Final Oct 9 Men's · Virginia vs Richmond (Exhibition) | W, 96-53",
 "Upcoming Oct 22, 7:00 PM Men's · Virginia at Villanova (Exhibition) | ",
 "Upcoming Nov 3, 7:30 PM Men's · Virginia vs Drexel | ",
 "Upcoming Nov 6, 5:00 PM Men's · Virginia vs Northeastern | ",
 "Upcoming Nov 8, 1:00 PM Men's · Virginia vs Arkansas | ",
 "Upcoming Nov 10, 9:00 PM Men's · Virginia vs Bucknell | ",
 "Upcoming Nov 13, 8:00 PM Men's · Virginia at Maryland | ",
 "Upcoming Nov 17, 9:00 PM Men's · Virginia vs Old Dominion | ",
 "Upcoming Nov 20, 7:00 PM Men's · Virginia vs Loyola Maryland | ",
 "Upcoming Nov 25, 12:00 PM Men's · Virginia vs Marquette | ",
 "Upcoming Nov 27, 11:00 AM Men's · Virginia vs Xavier | ",
 "Upcoming Dec 2, 7:15 PM Men's · Virginia vs Kentucky | ",
 "Upcoming Dec 8, 7:00 PM Men's · Virginia vs Bethune-Cookman | ",
 "Upcoming Dec 13, 12:00 PM Men's · Virginia vs Western Carolina | ",
 "Upcoming Dec 20, 3:00 PM Men's · Virginia vs UConn | ",
 "Upcoming Dec 29, 6:00 PM Men's · Virginia at Clemson | ",
 "Upcoming Jan 2, 6:00 PM Men's · Virginia vs SMU | ",
 "Upcoming Jan 6, 9:00 PM Men's · Virginia at Stanford | ",
 "Upcoming Jan 9, 4:00 PM Men's · Virginia at California | ",
 "Upcoming Jan 13, 8:00 PM Men's · Virginia vs Boston College | ",
 "Upcoming Jan 16, 6:00 PM Men's · Virginia at Miami | ",
 "Upcoming Jan 19, 9:00 PM Men's · Virginia at North Carolina | ",
 "Upcoming Jan 27, 8:00 PM Men's · Virginia vs Georgia Tech | ",
 "Upcoming Jan 30, 6:00 PM Men's · Virginia vs Virginia Tech | ",
 "Upcoming Feb 3, 9:00 PM Men's · Virginia at Syracuse | ",
 "Upcoming Feb 6 Men's · Virginia vs Duke | ",
 "Upcoming Feb 9, 7:00 PM Men's · Virginia at PIttsburgh | ",
 "Upcoming Feb 13, 2:00 PM Men's · Virginia vs Notre Dame | ",
 "Upcoming Feb 15, 7:00 PM Men's · Virginia vs Louisville | ",
 "Upcoming Feb 23, 7:00 PM Men's · Virginia at Virginia Tech | ",
 "Upcoming Feb 27, 2:00 PM Men's · Virginia vs Florida State | ",
 "Upcoming Mar 1, 7:00 PM Men's · Virginia at Duke | ",
 "Upcoming Mar 6, 12:00 PM Men's · Virginia vs NC State | ",
 "Upcoming Mar 9 Men's · Virginia vs TBD | ",
 "Upcoming Mar 10 Men's · Virginia vs TBD | ",
 "Upcoming Mar 11 Men's · Virginia vs TBD | ",
 "Upcoming Mar 12 Men's · Virginia vs TBD | ",
 "Upcoming Mar 13 Men's · Virginia vs TBD | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Virginia vs Maryland Eastern Shore | ",
 "Upcoming Nov 5, 7:00 PM Women's · Virginia at Davidson | ",
 "Upcoming Nov 8, 2:00 PM Women's · Virginia vs William & Mary | ",
 "Upcoming Nov 11, 6:00 PM Women's · Virginia vs Drexel | ",
 "Upcoming Nov 15, 2:00 PM Women's · Virginia at Old Dominion | ",
 "Upcoming Nov 19, 6:00 PM Women's · Virginia vs JMU | ",
 "Upcoming Nov 23, 2:30 PM Women's · Virginia vs Oklahoma | ",
 "Upcoming Nov 24, 9:00 PM Women's · Virginia vs UAB | ",
 "Upcoming Nov 29, 6:00 PM Women's · Virginia at SMU | ",
 "Upcoming Dec 3, 9:00 PM Women's · Virginia at Mississippi State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Virginia vs Boston College | ",
 "Upcoming Dec 9, 11:00 AM Women's · Virginia vs American | ",
 "Upcoming Dec 13, 6:00 PM Women's · Virginia vs Navy | ",
 "Upcoming Dec 20, 3:30 PM Women's · Virginia vs Kentucky | ",
 "Upcoming Dec 22, 1:00 PM Women's · Virginia vs Stony Brook | ",
 "Upcoming Dec 28, 6:00 PM Women's · Virginia vs Norfolk State | ",
 "Upcoming Dec 31, 8:00 PM Women's · Virginia vs Duke | ",
 "Upcoming Jan 3, 12:00 PM Women's · Virginia vs Georgia Tech | ",
 "Upcoming Jan 10, 2:00 PM Women's · Virginia vs Virginia Tech | ",
 "Upcoming Jan 14, 7:00 PM Women's · Virginia at Miami | ",
 "Upcoming Jan 17, 2:00 PM Women's · Virginia at Clemson | ",
 "Upcoming Jan 21, 6:00 PM Women's · Virginia vs Wake Forest | ",
 "Upcoming Jan 24, 2:00 PM Women's · Virginia at Pitt | ",
 "Upcoming Jan 28, 6:00 PM Women's · Virginia vs Cal | ",
 "Upcoming Feb 1, 6:00 PM Women's · Virginia at NC State | ",
 "Upcoming Feb 7, 2:00 PM Women's · Virginia vs Louisville | ",
 "Upcoming Feb 11, 6:00 PM Women's · Virginia at Notre Dame | ",
 "Upcoming Feb 14, 2:00 PM Women's · Virginia at Syracuse | ",
 "Upcoming Feb 18, 6:00 PM Women's · Virginia vs Florida State | ",
 "Upcoming Feb 21, 2:00 PM Women's · Virginia vs Stanford | ",
 "Upcoming Feb 25, 8:00 PM Women's · Virginia at North Carolina | ",
 "Upcoming Feb 28, 6:00 PM Women's · Virginia at Virginia Tech | ",
 "Upcoming Mar 3 Women's · Virginia at ACC Tournament | "
]);
  const v_xc=parse("Cross Country","xc");
  assert.deepEqual(v_xc.map(line),[
 "Final Sep 11 Virginia at Virginia Invitational | Completed",
 "Final Sep 25 Virginia at Sean Earl Loyola Lakefront Invitational | Completed",
 "Final Oct 2 Virginia at Paul Short Run | Completed",
 "Upcoming Oct 16, 9:30 AM Virginia at Panorama Farms Invitational | ",
 "Upcoming Oct 30 Virginia at ACC Cross Country Championships | ",
 "Upcoming Nov 13 Virginia at NCAA Southeast Regional | ",
 "Upcoming Nov 21 Virginia at NCAA Cross Country Championships | "
]);
  const v_fhockey=parse("Field Hockey","fhockey");
  assert.deepEqual(v_fhockey.map(line),[
 "Final Aug 28 Virginia at Penn State | W, 4-3",
 "Final Sep 4 Virginia at Rutgers | W, 2-1",
 "Final Sep 6 Virginia vs Ohio State | L, 1-2",
 "Final Sep 11 Virginia at Liberty | W, 2-1",
 "Final Sep 13 Virginia vs James Madison | W, 7-0",
 "Final Sep 18 Virginia at Duke | L, 0-1",
 "Final Sep 20 Virginia at North Carolina | W, 2-1",
 "Final Sep 25 Virginia vs Syracuse | L, 0-3",
 "Final Oct 2 Virginia vs Stanford | W, 5-2",
 "Final Oct 4 Virginia vs California | L, 1-2",
 "Final Oct 9 Virginia at Boston College | L, 1-4",
 "Upcoming Oct 16, 6:00 PM Virginia at Wake Forest | ",
 "Upcoming Oct 18, 12:00 PM Virginia vs Monmouth | ",
 "Upcoming Oct 23, 3:00 PM Virginia vs Louisville | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Virginia vs NC State | W, 34-8",
 "Final Sep 11 Virginia vs Norfolk State | W, 59-3",
 "Final Sep 19 Virginia vs West Virginia | L, 27-38",
 "Final Sep 26 Virginia vs Delaware | W, 42-3",
 "Final Oct 3 Virginia at Florida State | L, 7-38",
 "Final Oct 10 Virginia vs Syracuse | W, 28-25",
 "Upcoming Oct 17, 12:00 PM Virginia at SMU | ",
 "Upcoming Oct 23, 7:00 PM Virginia vs Duke | ",
 "Upcoming Oct 31 Virginia at Wake Forest | ",
 "Upcoming Nov 14 Virginia vs Cal | ",
 "Upcoming Nov 21 Virginia vs North Carolina | ",
 "Upcoming Nov 28 Virginia at Virginia Tech | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 13 Men's · Virginia at Inverness Intercollegiate | 16th of 18",
 "Final Sep 28 Men's · Virginia at Ben Hogan Collegiate Invitational presented by Charles Schwab | T14th of 16",
 "Upcoming Oct 16 Men's · Virginia at Golf Club of Georgia Collegiate Invitational | ",
 "Upcoming Oct 31 Men's · Virginia at Steelwood Collegiate Invitational | ",
 "Upcoming Feb 14 Men's · Virginia at Purdue Dominican Republic Classic | ",
 "Upcoming Feb 28 Men's · Virginia at Las Vegas Collegiate | ",
 "Upcoming Mar 12 Men's · Virginia at Seminole Intercollegiate | ",
 "Upcoming Apr 2 Men's · Virginia at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · Virginia at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 22 Men's · Virginia at ACC Championship | ",
 "Upcoming May 17 Men's · Virginia at NCAA Regionals | ",
 "Upcoming May 28 Men's · Virginia at NCAA Championship | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · Virginia at ANNIKA Intercollegiate | T6th of 12",
 "Final Sep 21 Women's · Virginia at Canadian Collegiate Invitational | Completed",
 "Final Oct 5 Women's · Virginia at Windy City Collegiate Invitational | Completed",
 "Upcoming Oct 16 Women's · Virginia at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · Virginia at Keswick Cup | ",
 "Upcoming Jan 29 Women's · Virginia at Collegiate Invitational at GCC | ",
 "Upcoming Feb 14 Women's · Virginia at Spartan Suncoast Invitational | ",
 "Upcoming Mar 6 Women's · Virginia at Gators Invitational | ",
 "Upcoming Mar 21 Women's · Virginia at City of Oaks Collegiate | ",
 "Upcoming Apr 5 Women's · Virginia at Huntington Bank Collegiate | ",
 "Upcoming Apr 15 Women's · Virginia at ACC Women's Golf Championship | ",
 "Upcoming May 10 Women's · Virginia at NCAA Women's Golf Regionals | ",
 "Upcoming May 21 Women's · Virginia at NCAA Women's Golf Championships | "
]);
  const v_mlax=parse("Lacrosse","mlax");
  assert.deepEqual(v_mlax.map(line),[]);
  const v_wlax=parse("Lacrosse","wlax");
  assert.deepEqual(v_wlax.map(line),[]);
  const v_wrow=parse("Rowing","wrow");
  assert.deepEqual(v_wrow.map(line),[
 "Upcoming Oct 18 Virginia at Head Of The Charles Regatta | ",
 "Upcoming Nov 1 Virginia at Princeton Chase | ",
 "Upcoming Nov 8 Virginia at Rivanna Romp | ",
 "Upcoming Nov 14 Virginia at USRowing Small Boats Nationals | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Women's · Virginia vs Northwestern | W, 3-1",
 "Final Aug 16 Women's · Virginia vs Liberty | W, 2-0",
 "Final Aug 20 Women's · Virginia vs La Salle | W, 7-0",
 "Final Aug 30 Women's · Virginia vs Yale | W, 2-1",
 "Final Sep 3 Women's · Virginia vs Tennessee | T, 1-1",
 "Final Sep 6 Women's · Virginia at Georgetown | T, 0-0",
 "Final Sep 12 Women's · Virginia at Wake Forest | L, 0-1",
 "Final Sep 17 Women's · Virginia vs Miami | W, 3-0",
 "Final Sep 25 Women's · Virginia vs North Carolina | L, 1-3",
 "Final Oct 3 Women's · Virginia vs Syracuse | W, 4-0",
 "Final Oct 8 Women's · Virginia at Notre Dame | L, 0-1",
 "Final Oct 11 Women's · Virginia at SMU | W, 5-1",
 "Upcoming Oct 16, 7:00 PM Women's · Virginia at Virginia Tech | ",
 "Upcoming Oct 22, 7:00 PM Women's · Virginia vs Clemson | ",
 "Upcoming Oct 29, 6:00 PM Women's · Virginia vs Louisville | ",
 "Upcoming Nov 5, 6:00 PM Women's · Virginia at Duke | ",
 "Upcoming Nov 8 Women's · Virginia vs ACC Quarterfinal | ",
 "Upcoming Nov 12 Women's · Virginia vs ACC Semifinal & Final | ",
 "Upcoming Nov 20 Women's · Virginia at NCAA First Round | ",
 "Upcoming Nov 26 Women's · Virginia at NCAA Second & Third Round | ",
 "Upcoming Dec 4 Women's · Virginia vs NCAA Quarterfinal | ",
 "Upcoming Dec 11 Women's · Virginia vs College Cup | "
]);
  const v_msoc=parse("Soccer","msoc");
  assert.deepEqual(v_msoc.map(line),[
 "Final Aug 20 Men's · Virginia vs UCLA | L, 1-2",
 "Final Aug 24 Men's · Virginia vs High Point | L, 2-3",
 "Final Aug 28 Men's · Virginia vs American | W, 4-0",
 "Final Aug 31 Men's · Virginia vs Florida Gulf Coast | L, 1-2",
 "Final Sep 4 Men's · Virginia vs Boston College | W, 2-0",
 "Final Sep 8 Men's · Virginia vs Oregon State | T, 1-1",
 "Final Sep 12 Men's · Virginia vs Liberty | W, 3-2",
 "Final Sep 19 Men's · Virginia at Wake Forest | L, 2-3",
 "Final Sep 25 Men's · Virginia at Stanford | W, 3-2",
 "Final Oct 2 Men's · Virginia vs Virginia Tech | L, 1-2",
 "Final Oct 6 Men's · Virginia vs Queens | W, 4-3",
 "Final Oct 9 Men's · Virginia vs California | W, 1-0",
 "Final Oct 13 Men's · Virginia vs Gardner-Webb | W, 4-0",
 "Upcoming Oct 16, 7:00 PM Men's · Virginia at Duke | ",
 "Upcoming Oct 24, 1:00 PM Men's · Virginia at Syracuse | ",
 "Upcoming Oct 30, 6:00 PM Men's · Virginia vs Pittsburgh | ",
 "Upcoming Nov 3 Men's · Virginia at ACC First Round | ",
 "Upcoming Nov 7 Men's · Virginia vs ACC Quarterfinals | ",
 "Upcoming Nov 11 Men's · Virginia vs ACC Semifinals | ",
 "Upcoming Nov 14 Men's · Virginia at ACC Championship | ",
 "Upcoming Nov 18 Men's · Virginia at NCAA First Round | ",
 "Upcoming Nov 21 Men's · Virginia at NCAA Second Round | ",
 "Upcoming Nov 26 Men's · Virginia at NCAA Third Round | ",
 "Upcoming Dec 3 Men's · Virginia vs NCAA Quarterfinals | ",
 "Upcoming Dec 10 Men's · Virginia vs NCAA Semifinals | ",
 "Upcoming Dec 13 Men's · Virginia vs NCAA Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimming=parse("Swimming & Diving","swimming");
  assert.deepEqual(v_swimming.map(line),[
 "Final Sep 25 Virginia at College Swimming League | Completed",
 "Final Oct 3 Virginia vs NAVY | Completed",
 "Final Oct 9 Virginia at College Swimming League | Completed",
 "Final Oct 10 Virginia at UNC Wilmington | Completed",
 "Upcoming Oct 15, 6:00 PM Virginia at SCM World Prep Pro Am | ",
 "Upcoming Oct 17, 11:00 AM Virginia vs Florida | ",
 "Upcoming Oct 28 Virginia at Short Course World Championship Trials | ",
 "Upcoming Nov 6, 4:00 PM Virginia at College Swimming League | ",
 "Upcoming Nov 7, 11:00 AM Virginia vs West Virginia | ",
 "Upcoming Nov 18 Virginia at Tennessee Invite | ",
 "Upcoming Dec 2 Virginia at Toyota US Open Championships | ",
 "Upcoming Dec 5, 11:00 AM Virginia at Penn State | ",
 "Upcoming Jan 16 Virginia vs Virginia Tech | ",
 "Upcoming Jan 22 Virginia vs NC State | ",
 "Upcoming Feb 4 Virginia at Cavalier Invite | ",
 "Upcoming Feb 16 Virginia at ACC Swimming & Diving Championships | ",
 "Upcoming Feb 26 Virginia at Cavalier Last Chance Meet | ",
 "Upcoming Mar 17 Virginia at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 Virginia at NCAA Men's Swimming & Diving Championship | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[
 "Final Sep 11 Men's · Virginia at Orange and Blue Classic | Completed",
 "Final Sep 19 Men's · Virginia at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Virginia at Liberty Invite | Completed",
 "Final Oct 8 Men's · Virginia at ITA Atlantic Regional | Completed",
 "Upcoming Oct 23 Men's · Virginia at Wake Forest Invite | ",
 "Upcoming Nov 5 Men's · Virginia at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Virginia at NCAA Individual Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Sep 11 Women's · Virginia at Kitty Harrison Invitational | Completed",
 "Final Sep 19 Women's · Virginia at ITA All-American Championships | Completed",
 "Final Oct 11 Women's · Virginia at Wahoowa Invitational | Completed",
 "Upcoming Oct 16 Women's · Virginia at ITA Atlantic Regional | ",
 "Upcoming Nov 5 Women's · Virginia at ITA Masters | ",
 "Upcoming Nov 5 Women's · Virginia at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Virginia at NCAA Individual Championships | "
]);
  const v_xctrack=parse("Track & Field","xctrack");
  assert.deepEqual(v_xctrack.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 30 Virginia vs American | L, 1-3",
 "Final Sep 1 Virginia vs Liberty | W, 3-1",
 "Final Sep 4 Virginia vs William & Mary | W, 3-1",
 "Final Sep 5 Virginia at VCU | W, 3-0",
 "Final Sep 9 Virginia vs Alabama | L, 1-3",
 "Final Sep 12 Virginia at UCF | L, 0-3",
 "Final Sep 15 Virginia vs George Washington | W, 3-1",
 "Final Sep 18 Virginia vs Ohio State | L, 2-3",
 "Final Sep 19 Virginia vs Ohio State | L, 0-3",
 "Final Sep 25 Virginia at Clemson | W, 3-2",
 "Final Sep 27 Virginia at Georgia Tech | L, 0-3",
 "Final Oct 2 Virginia at Cal | L, 1-3",
 "Final Oct 3 Virginia at Stanford | L, 0-3",
 "Final Oct 9 Virginia vs Duke | L, 2-3",
 "Final Oct 11 Virginia vs North Carolina | L, 0-3",
 "Today Oct 14, 7:00 PM Virginia vs Virginia Tech | ",
 "Upcoming Oct 16, 6:00 PM Virginia at Virginia Tech | ",
 "Upcoming Oct 23, 6:00 PM Virginia at Syracuse | ",
 "Upcoming Oct 25, 1:00 PM Virginia at Boston College | ",
 "Upcoming Oct 30, 7:00 PM Virginia vs Miami | ",
 "Upcoming Nov 1, 1:00 PM Virginia vs Florida State | ",
 "Upcoming Nov 6, 7:00 PM Virginia vs Louisville | ",
 "Upcoming Nov 8, 1:00 PM Virginia vs Notre Dame | ",
 "Upcoming Nov 13, 7:00 PM Virginia at Wake Forest | ",
 "Upcoming Nov 15, 1:00 PM Virginia at NC State | ",
 "Upcoming Nov 20, 7:00 PM Virginia vs Pittsburgh | ",
 "Upcoming Nov 22, 1:00 PM Virginia vs SMU | ",
 "Upcoming Nov 25, 2:00 PM Virginia vs Boston College | ",
 "Upcoming Nov 28, 1:00 PM Virginia at Florida State | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Virginia at Navy Classic | ",
 "Upcoming Nov 7, 1:00 PM Virginia vs Gardner Webb | ",
 "Upcoming Nov 8, 1:00 PM Virginia vs Glenville State | ",
 "Upcoming Nov 22, 12:00 PM Virginia at Maryland | ",
 "Upcoming Nov 22, 2:00 PM Virginia vs Ohio | ",
 "Upcoming Dec 4, 7:00 PM Virginia vs Davidson | ",
 "Upcoming Dec 6 Virginia at Patriot Open | ",
 "Upcoming Dec 20 Virginia at Nebraska | ",
 "Upcoming Dec 20 Virginia vs Campbell | ",
 "Upcoming Dec 21, 7:00 PM Virginia vs Doane | ",
 "Upcoming Jan 2 Virginia at Southern Scuffle | ",
 "Upcoming Jan 10, 1:00 PM Virginia at Morgan State | ",
 "Upcoming Jan 15, 7:00 PM Virginia at North Carolina | ",
 "Upcoming Jan 17, 1:00 PM Virginia at Presbyterian | ",
 "Upcoming Jan 22, 7:00 PM Virginia vs Pittsburgh | ",
 "Upcoming Jan 29, 7:00 PM Virginia at Virginia Tech | ",
 "Upcoming Feb 5, 7:00 PM Virginia vs NC State | ",
 "Upcoming Feb 12, 7:00 PM Virginia at Stanford | ",
 "Upcoming Feb 19, 7:00 PM Virginia vs Duke | ",
 "Upcoming Mar 6 Virginia at ACC Championships | ",
 "Upcoming Mar 18 Virginia at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_mlax,"Lacrosse mlax");
  ownRecapsOnly(v_wlax,"Lacrosse wlax");
  ownRecapsOnly(v_wrow,"Rowing wrow");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_xctrack,"Track & Field xctrack");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Conference games from the cards' "(ACC)" flags: football's nine ACC games;
// West Virginia, Delaware and Norfolk State carry none. Baseball's midweek
// game against Virginia Tech (Mar 23) is not flagged: membership alone would
// count it.
{
  const football=parse('Football','football');
  assert.deepEqual(football.filter(e=>e.conference_game).map(e=>e.opponent),['NC State','Florida State','Syracuse','SMU','Duke','Wake Forest','Cal','North Carolina','Virginia Tech']);
  assert.deepEqual(football.filter(e=>e.conference_game===false).map(e=>e.opponent),['Norfolk State','West Virginia','Delaware']);
  // The Yale card's Recap link has "Rec" pasted on its slug (the link is a 404).
  assert.equal(parse('Soccer','wsoc').find(e=>e.opponent==='Yale').recap_url,'https://virginiasports.com/news/2026/08/30/bradleys-goal-lifts-no-13-virginia-past-yale');
  assert.deepEqual(parse('Baseball','baseball').filter(e=>e.opponent==='Virginia Tech').map(e=>[e.start_time.slice(0,10),e.conference_game]),[['2027-03-23',false]]);
}
// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
// Cross Country: one card per meet for both teams; the TFRRS meet page holds
// both races.
{
  fromTfrrs(VIRGINIA_TFRRS_TEAMS);
  const xc=parse('Cross Country','xc').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Virginia Invitational","Women's team: 2nd · 28 pts / Men's team: 3rd · 80 pts",true],["Sean Earl Loyola Lakefront Invitational","Women's team: 1st · 71 pts / Men's team: 13th · 300 pts",true],["Paul Short Run","Women's: Ella Woehlcke 12th / Men's: Brenden McMahon 120th",true]]);
  recapFixtures.clear();requests.length=0;
}
// Golf places from the final stories' headlines when the card has none.
{
  const {virginiaGolfPlace}=await import('../src/schools/virginia.mjs');
  assert.deepEqual(['Laha Medals, Leads Virginia to Win at Canadian Collegiate Invitational','Virginia Ties for Sixth at ANNIKA Intercollegiate','Play Concludes at Ben Hogan Collegiate Invitational'].map(virginiaGolfPlace),["1",null,null]);
}
assert.equal(requests.length,0,'no unexpected network requests');
console.log('Virginia module checks passed');
