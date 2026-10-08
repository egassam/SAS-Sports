import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southCarolinaSchool,southCarolinaGolfPlace,southCarolinaTeamPlaces,southCarolinaSwimDuals} from '../src/schools/south-carolina.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-carolina');
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
const worker=Function(...Object.keys(deps),source+';return {recapArticleText,rosterProfiles,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southCarolinaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-carolina-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gamecocksonline.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-carolina'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',southCarolinaSchool.scheduleUrls],['roster',southCarolinaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-carolina|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gamecocksonline.com',`${key} must stay on gamecocksonline.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gamecocksonline.com/sports/baseball/schedule/"],"roster":["https://gamecocksonline.com/sports/baseball/roster/"],"combined":false},"Basketball":{"schedule":["https://gamecocksonline.com/sports/mbball/schedule/","https://gamecocksonline.com/sports/wbball/schedule/"],"roster":["https://gamecocksonline.com/sports/mbball/roster/","https://gamecocksonline.com/sports/wbball/roster/"],"combined":true},"Beach Volleyball":{"schedule":["https://gamecocksonline.com/sports/bvball/schedule/"],"roster":["https://gamecocksonline.com/sports/bvball/roster/"],"combined":false},"Cross Country":{"schedule":["https://gamecocksonline.com/sports/wcross/schedule/"],"roster":["https://gamecocksonline.com/sports/wcross/roster/"],"combined":false},"Equestrian":{"schedule":["https://gamecocksonline.com/sports/equestrian/schedule/"],"roster":["https://gamecocksonline.com/sports/equestrian/roster/"],"combined":false},"Football":{"schedule":["https://gamecocksonline.com/sports/football/schedule/"],"roster":["https://gamecocksonline.com/sports/football/roster/"],"combined":false},"Golf":{"schedule":["https://gamecocksonline.com/sports/mgolf/schedule/","https://gamecocksonline.com/sports/wgolf/schedule/"],"roster":["https://gamecocksonline.com/sports/mgolf/roster/","https://gamecocksonline.com/sports/wgolf/roster/"],"combined":true},"Soccer":{"schedule":["https://gamecocksonline.com/sports/msoc/schedule/","https://gamecocksonline.com/sports/wsoc/schedule/"],"roster":["https://gamecocksonline.com/sports/msoc/roster/","https://gamecocksonline.com/sports/wsoc/roster/"],"combined":true},"Softball":{"schedule":["https://gamecocksonline.com/sports/softball/schedule/"],"roster":["https://gamecocksonline.com/sports/softball/roster/"],"combined":false},"Swimming & Diving":{"schedule":["https://gamecocksonline.com/sports/swimming/schedule/"],"roster":["https://gamecocksonline.com/sports/swimming/roster/"],"combined":false},"Tennis":{"schedule":["https://gamecocksonline.com/sports/mten/schedule/","https://gamecocksonline.com/sports/wten/schedule/"],"roster":["https://gamecocksonline.com/sports/mten/roster/","https://gamecocksonline.com/sports/wten/roster/"],"combined":true},"Track & Field":{"schedule":["https://gamecocksonline.com/sports/track/schedule/"],"roster":["https://gamecocksonline.com/sports/track/roster/"],"combined":false},"Volleyball":{"schedule":["https://gamecocksonline.com/sports/wvball/schedule/"],"roster":["https://gamecocksonline.com/sports/wvball/roster/"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-carolina|"+sport+"':"),`${sport} routes must live in the South Carolina module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://gamecocksonline.com/sports/${slug}/schedule/`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southCarolinaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-carolina)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 9, 4:00 PM South Carolina vs High Point (Exhibition) | ",
 "Upcoming Oct 16, 6:30 PM South Carolina vs College of Charleston (Exhibition) | ",
 "Upcoming Oct 23, 4:00 PM South Carolina vs Winthrop (Exhibition) | ",
 "Upcoming Nov 1, 1:00 PM South Carolina vs Duke (Exhibition) | ",
 "Upcoming Mar 19 South Carolina vs Vanderbilt | ",
 "Upcoming Mar 20 South Carolina vs Vanderbilt | ",
 "Upcoming Mar 21 South Carolina vs Vanderbilt | ",
 "Upcoming Mar 25 South Carolina at Texas | ",
 "Upcoming Mar 26 South Carolina at Texas | ",
 "Upcoming Mar 27 South Carolina at Texas | ",
 "Upcoming Apr 2 South Carolina vs Florida | ",
 "Upcoming Apr 3 South Carolina vs Florida | ",
 "Upcoming Apr 4 South Carolina vs Florida | ",
 "Upcoming Apr 9 South Carolina at Ole Miss | ",
 "Upcoming Apr 10 South Carolina at Ole Miss | ",
 "Upcoming Apr 11 South Carolina at Ole Miss | ",
 "Upcoming Apr 16 South Carolina at Alabama | ",
 "Upcoming Apr 17 South Carolina at Alabama | ",
 "Upcoming Apr 18 South Carolina at Alabama | ",
 "Upcoming Apr 23 South Carolina vs Auburn | ",
 "Upcoming Apr 24 South Carolina vs Auburn | ",
 "Upcoming Apr 25 South Carolina vs Auburn | ",
 "Upcoming Apr 30 South Carolina vs Texas A&M | ",
 "Upcoming May 1 South Carolina vs Texas A&M | ",
 "Upcoming May 2 South Carolina vs Texas A&M | ",
 "Upcoming May 7 South Carolina at Kentucky | ",
 "Upcoming May 8 South Carolina at Kentucky | ",
 "Upcoming May 9 South Carolina at Kentucky | ",
 "Upcoming May 14 South Carolina vs Missouri | ",
 "Upcoming May 15 South Carolina vs Missouri | ",
 "Upcoming May 16 South Carolina vs Missouri | ",
 "Upcoming May 20 South Carolina at Oklahoma | ",
 "Upcoming May 21 South Carolina at Oklahoma | ",
 "Upcoming May 22 South Carolina at Oklahoma | ",
 "Upcoming May 25 South Carolina at SEC Tournament | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Final Aug 8 Men's · South Carolina vs Victoria (Canada) (Exhibition) | W, 94-81",
 "Final Aug 10 Men's · South Carolina vs The Bahamas National Team (Exhibition) | W, 86-46",
 "Upcoming Oct 15, 6:00 PM Men's · South Carolina vs Wake Forest (Exhibition) | ",
 "Upcoming Oct 25, 2:00 PM Men's · South Carolina vs Campbell (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · South Carolina vs Stetson | ",
 "Upcoming Nov 8, 1:00 PM Men's · South Carolina vs Southeast Missouri State | ",
 "Upcoming Nov 11, 7:00 PM Men's · South Carolina vs Saint Peter's | ",
 "Upcoming Nov 14, 2:00 PM Men's · South Carolina vs Gardner-Webb | ",
 "Upcoming Nov 18, 7:00 PM Men's · South Carolina vs Elon | ",
 "Upcoming Nov 25, 4:30 PM Men's · South Carolina vs Southern California | ",
 "Upcoming Nov 26, 2:00 PM Men's · South Carolina vs Arizona State | ",
 "Upcoming Dec 1, 7:00 PM Men's · South Carolina at N.C. State | ",
 "Upcoming Dec 6, 12:00 PM Men's · South Carolina vs UT Martin | ",
 "Upcoming Dec 12, 4:00 PM Men's · South Carolina vs Youngstown State | ",
 "Upcoming Dec 15, 9:00 PM Men's · South Carolina vs Clemson | ",
 "Upcoming Dec 19, 1:00 PM Men's · South Carolina vs Maryland | ",
 "Upcoming Dec 22, 4:00 PM Men's · South Carolina vs North Carolina Central | ",
 "Upcoming Dec 29 Men's · South Carolina vs South Carolina State | ",
 "Upcoming Jan 2, 3:30 PM Men's · South Carolina at LSU | ",
 "Upcoming Jan 6, 9:00 PM Men's · South Carolina vs Arkansas | ",
 "Upcoming Jan 9, 3:30 PM Men's · South Carolina vs Texas A&M | ",
 "Upcoming Jan 12, 9:00 PM Men's · South Carolina at Vanderbilt | ",
 "Upcoming Jan 16, 1:00 PM Men's · South Carolina at Missouri | ",
 "Upcoming Jan 20, 6:00 PM Men's · South Carolina vs Alabama | ",
 "Upcoming Jan 23, 1:00 PM Men's · South Carolina at Mississippi State | ",
 "Upcoming Jan 27, 8:00 PM Men's · South Carolina vs Texas | ",
 "Upcoming Jan 30, 1:00 PM Men's · South Carolina at Oklahoma | ",
 "Upcoming Feb 2, 7:00 PM Men's · South Carolina at Florida | ",
 "Upcoming Feb 6, 8:30 PM Men's · South Carolina vs Georgia | ",
 "Upcoming Feb 10, 8:00 PM Men's · South Carolina at Kentucky | ",
 "Upcoming Feb 13, 6:00 PM Men's · South Carolina vs Auburn | ",
 "Upcoming Feb 20, 3:30 PM Men's · South Carolina vs Ole Miss | ",
 "Upcoming Feb 23, 7:00 PM Men's · South Carolina at Tennessee | ",
 "Upcoming Feb 27, 1:00 PM Men's · South Carolina vs Mississippi State | ",
 "Upcoming Mar 2, 8:00 PM Men's · South Carolina vs Florida | ",
 "Upcoming Mar 6, 12:00 PM Men's · South Carolina at Georgia | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Final Sep 27 Women's · South Carolina vs College of Charleston (Exhibition) | W, 91-60",
 "Upcoming Oct 23, 7:00 PM Women's · South Carolina vs Benedict (Exhibition) | ",
 "Upcoming Nov 2, 12:00 PM Women's · South Carolina vs Maryland | ",
 "Upcoming Nov 8, 5:30 PM Women's · South Carolina vs North Carolina | ",
 "Upcoming Nov 12, 7:00 PM Women's · South Carolina at Clemson | ",
 "Upcoming Nov 15, 1:00 PM Women's · South Carolina vs Southern Cal | ",
 "Upcoming Nov 17, 7:00 PM Women's · South Carolina vs FGCU | ",
 "Upcoming Nov 21, 1:30 PM Women's · South Carolina at Providence | ",
 "Upcoming Nov 24, 8:00 PM Women's · South Carolina vs UConn | ",
 "Upcoming Nov 28, 2:30 PM Women's · South Carolina vs Tennessee State | ",
 "Upcoming Nov 29 Women's · South Carolina vs NC Central or Alabama A&M | ",
 "Upcoming Dec 3, 7:00 PM Women's · South Carolina at Duke | ",
 "Upcoming Dec 6, 4:00 PM Women's · South Carolina vs Oklahoma State | ",
 "Upcoming Dec 12, 12:00 PM Women's · South Carolina vs Wofford | ",
 "Upcoming Dec 16, 7:00 PM Women's · South Carolina vs Albany | ",
 "Upcoming Dec 19, 8:30 PM Women's · South Carolina vs UCLA | ",
 "Upcoming Dec 20, 7:30 PM Women's · South Carolina vs Notre Dame | ",
 "Upcoming Dec 28, 6:00 PM Women's · South Carolina vs Gardner-Webb | ",
 "Upcoming Dec 31, 7:00 PM Women's · South Carolina vs Alabama | ",
 "Upcoming Jan 3, 3:00 PM Women's · South Carolina at Texas | ",
 "Upcoming Jan 7, 7:00 PM Women's · South Carolina at Mississippi State | ",
 "Upcoming Jan 10, 4:00 PM Women's · South Carolina vs Arkansas | ",
 "Upcoming Jan 14, 7:30 PM Women's · South Carolina vs Oklahoma | ",
 "Upcoming Jan 17, 4:00 PM Women's · South Carolina at Missouri | ",
 "Upcoming Jan 21, 7:00 PM Women's · South Carolina vs Florida | ",
 "Upcoming Jan 28, 6:30 PM Women's · South Carolina at Tennessee | ",
 "Upcoming Jan 31, 3:00 PM Women's · South Carolina vs Kentucky | ",
 "Upcoming Feb 4, 7:00 PM Women's · South Carolina at Vanderbilt | ",
 "Upcoming Feb 8, 7:00 PM Women's · South Carolina at Oklahoma | ",
 "Upcoming Feb 11, 6:00 PM Women's · South Carolina vs Texas A&M | ",
 "Upcoming Feb 14, 1:00 PM Women's · South Carolina at Ole Miss | ",
 "Upcoming Feb 21, 3:00 PM Women's · South Carolina vs LSU | ",
 "Upcoming Feb 25, 7:00 PM Women's · South Carolina vs Auburn | ",
 "Upcoming Feb 28, 12:00 PM Women's · South Carolina at Georgia | ",
 "Upcoming Mar 3 Women's · South Carolina at SEC Tournament | "
]);
  const v_bvball=parse("Beach Volleyball","bvball");
  assert.deepEqual(v_bvball.map(line),[]);
  const v_wcross=parse("Cross Country","wcross");
  assert.deepEqual(v_wcross.map(line),[
 "Final Sep 4 South Carolina at Eye Opener | Women's team: 1st of 13",
 "Final Sep 18 South Carolina at Adidas XC Challenge | Women's team: 2nd of 16",
 "Final Oct 2 South Carolina at Joe Piane XC Invite | Women's team: 3rd of 20",
 "Upcoming Oct 16 South Carolina at Crimson Classic | ",
 "Upcoming Oct 30, 10:08 AM South Carolina at SEC Championship | ",
 "Upcoming Nov 13 South Carolina at NCAA Southeast Regional | ",
 "Upcoming Nov 21 South Carolina at NCAA Championship | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 25 South Carolina vs Hollins (Exhibition) | W, 5-5",
 "Final Sep 26 South Carolina vs Sewanee (Exhibition) | W, 8-1",
 "Final Oct 1 South Carolina vs SMU | W, 10-9",
 "Final Oct 2 South Carolina vs TCU | W, 14-5",
 "Upcoming Oct 9, 4:00 PM South Carolina at Auburn | ",
 "Upcoming Oct 23, 11:00 AM South Carolina vs Georgia | ",
 "Upcoming Oct 29, 11:00 AM South Carolina vs Fresno State | ",
 "Upcoming Nov 5 South Carolina at Texas A&M | ",
 "Upcoming Nov 6 South Carolina at TCU | ",
 "Upcoming Nov 20 South Carolina at UT Martin | ",
 "Upcoming Nov 21 South Carolina at SDSU | ",
 "Upcoming Feb 6, 11:00 AM South Carolina vs Sweet Briar (Exhibition) | ",
 "Upcoming Feb 20, 11:00 AM South Carolina vs Texas A&M | ",
 "Upcoming Feb 27, 11:00 AM South Carolina vs Auburn | ",
 "Upcoming Mar 6 South Carolina at Georgia | ",
 "Upcoming Mar 26 South Carolina at SEC Championship (Exhibition) | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 South Carolina vs Kent State | W, 57-0",
 "Final Sep 12 South Carolina vs Towson | W, 45-9",
 "Final Sep 19 South Carolina vs Mississippi State | L, 34-41",
 "Final Sep 26 South Carolina at Alabama | L, 18-49",
 "Final Oct 3 South Carolina vs Kentucky | L, 34-35 (OT)",
 "Upcoming Oct 10, 12:45 PM South Carolina at Florida | ",
 "Upcoming Oct 24 South Carolina vs Tennessee | ",
 "Upcoming Oct 31 South Carolina at Oklahoma | ",
 "Upcoming Nov 7 South Carolina vs Texas A&M | ",
 "Upcoming Nov 14 South Carolina at Arkansas | ",
 "Upcoming Nov 21 South Carolina vs Georgia | ",
 "Upcoming Nov 28 South Carolina at Clemson | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Aug 31 Men's · South Carolina at Visit Knoxville Collegiate | 12th",
 "Final Sep 13 Men's · South Carolina at J.T. Poston Invitational | 1st",
 "Final Sep 28 Men's · South Carolina at Bryan Bros Collegiate | 6th",
 "Upcoming Oct 17 Men's · South Carolina at Fallen Oak Invitational | ",
 "Upcoming Feb 14 Men's · South Carolina at Dominican Republic Classic | ",
 "Upcoming Mar 6 Men's · South Carolina at The Hayt | ",
 "Upcoming Mar 15 Men's · South Carolina at Pauma Valley Invitational | ",
 "Upcoming Mar 28 Men's · South Carolina at Hootie at Bulls Bay Intercollegiate | ",
 "Upcoming Apr 12 Men's · South Carolina at Mossy Oak Collegiate | ",
 "Upcoming Apr 20 Men's · South Carolina at SEC Championships | ",
 "Upcoming May 17 Men's · South Carolina at NCAA Regionals | ",
 "Upcoming May 28 Men's · South Carolina at NCAA Championships | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · South Carolina at ANNIKA Intercollegiate | 5th",
 "Final Sep 14 Women's · South Carolina at Stephens Cup | Won final vs. Wake Forest, 3-2",
 "Final Sep 28 Women's · South Carolina at Tot Hill Farm Invitational | Completed",
 "Upcoming Oct 9 Women's · South Carolina at Evie Odom Invitational | ",
 "Upcoming Oct 23 Women's · South Carolina at Landfall Tradition | ",
 "Upcoming Jan 31 Women's · South Carolina at Therese Hession Regional Challenge | ",
 "Upcoming Feb 22 Women's · South Carolina at UNF Collegiate | ",
 "Upcoming Mar 1 Women's · South Carolina at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 13 Women's · South Carolina at Valspar Augusta Invitational | ",
 "Upcoming Apr 5 Women's · South Carolina at Country Club of Birmingham Women's Collegiate Classic | ",
 "Upcoming Apr 16 Women's · South Carolina at SEC Championship | ",
 "Upcoming May 10 Women's · South Carolina at NCAA Regionals | ",
 "Upcoming May 21 Women's · South Carolina at NCAA Championships | "
]);
  const v_msoc=parse("Soccer","msoc");
  assert.deepEqual(v_msoc.map(line),[
 "Final Aug 20 Men's · South Carolina at North Florida | W, 4-1",
 "Final Aug 24 Men's · South Carolina vs USC Upstate | W, 4-0",
 "Final Aug 28 Men's · South Carolina vs Clemson | W, 3-2",
 "Final Sep 3 Men's · South Carolina at Charlotte | W, 2-1",
 "Final Sep 7 Men's · South Carolina vs High Point | W, 2-0",
 "Final Sep 11 Men's · South Carolina vs UNCG | W, 1-0",
 "Final Sep 18 Men's · South Carolina at Old Dominion | W, 2-1",
 "Final Sep 22 Men's · South Carolina vs Charleston | L, 1-2",
 "Final Sep 27 Men's · South Carolina vs James Madison | T, 1-1",
 "Final Oct 3 Men's · South Carolina at West Virginia | T, 1-1",
 "Upcoming Oct 10, 7:00 PM Men's · South Carolina vs Kentucky | ",
 "Upcoming Oct 12, 7:00 PM Men's · South Carolina vs Columbia College | ",
 "Upcoming Oct 17, 7:00 PM Men's · South Carolina at Georgia State | ",
 "Upcoming Oct 21, 7:00 PM Men's · South Carolina vs Georgia Southern | ",
 "Upcoming Oct 25, 5:00 PM Men's · South Carolina at UCF | ",
 "Upcoming Oct 30, 7:00 PM Men's · South Carolina vs Marshall | ",
 "Upcoming Nov 3, 7:00 PM Men's · South Carolina at Coastal Carolina | ",
 "Upcoming Nov 8 Men's · South Carolina at Sun Belt Tournament | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Women's · South Carolina vs Oregon State | W, 2-0",
 "Final Aug 16 Women's · South Carolina at Wake Forest | L, 0-3",
 "Final Aug 20 Women's · South Carolina vs Clemson | W, 1-0",
 "Final Aug 23 Women's · South Carolina vs Furman | W, 4-0",
 "Final Aug 27 Women's · South Carolina at Wyoming | W, 2-1",
 "Final Aug 30 Women's · South Carolina at Colorado State | W, 1-0",
 "Final Sep 6 Women's · South Carolina vs College of Charleston | W, 6-1",
 "Final Sep 10 Women's · South Carolina vs Florida | W, 1-0",
 "Final Sep 18 Women's · South Carolina at LSU | W, 3-1",
 "Final Sep 24 Women's · South Carolina vs Kentucky | W, 2-0",
 "Final Sep 27 Women's · South Carolina vs Missouri | W, 3-0",
 "Final Oct 2 Women's · South Carolina at Mississippi State | T, 0-0",
 "Upcoming Oct 9, 7:00 PM Women's · South Carolina vs Tennessee | ",
 "Upcoming Oct 15, 8:00 PM Women's · South Carolina at Texas A&M | ",
 "Upcoming Oct 18, 1:00 PM Women's · South Carolina at Texas | ",
 "Upcoming Oct 23, 7:00 PM Women's · South Carolina vs Georgia | ",
 "Upcoming Nov 1, 1:00 PM Women's · South Carolina at Vanderbilt | ",
 "Upcoming Nov 8 Women's · South Carolina at SEC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 6:00 PM South Carolina vs Winthrop (Exhibition) | ",
 "Upcoming Oct 10, 12:00 PM South Carolina vs USC Beaufort (Exhibition) | ",
 "Upcoming Oct 16, 5:00 PM South Carolina at Charleston Southern (Exhibition) | ",
 "Upcoming Oct 17, 3:00 PM South Carolina at College of Charleston (Exhibition) | ",
 "Upcoming Oct 23, 6:00 PM South Carolina vs Spartanburg Methodist (Exhibition) | "
]);
  const v_swimming=parse("Swimming & Diving","swimming");
  assert.deepEqual(v_swimming.map(line),[
 "Final Sep 25 South Carolina at UNCW | Women's team: W, 250-50 / Men's team: W, 165-135",
 "Upcoming Oct 16 South Carolina at The Dual Meet Tournament | ",
 "Upcoming Oct 30, 12:00 PM South Carolina vs Texas | ",
 "Upcoming Nov 6, 11:00 AM South Carolina vs Florida State | ",
 "Upcoming Nov 17 South Carolina at Georgia Diving Invitational | ",
 "Upcoming Nov 17 South Carolina at Gamecock Invitational | ",
 "Upcoming Jan 2, 11:00 AM South Carolina vs Queens | ",
 "Upcoming Jan 16, 12:00 PM South Carolina at Tennessee | ",
 "Upcoming Jan 29, 2:00 PM South Carolina vs Georgia Tech | ",
 "Upcoming Feb 14 South Carolina at SEC Championships | ",
 "Upcoming Feb 26 South Carolina at Auburn Last Chance Invitational | ",
 "Upcoming Mar 6 South Carolina at NCAA Zone B Diving | ",
 "Upcoming Mar 17 South Carolina at NCAA Championships | ",
 "Upcoming Mar 24 South Carolina at Men's NCAA Championships | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[
 "Today Oct 8 Men's · South Carolina at ITA Carolina Regionals | ",
 "Upcoming Oct 23 Men's · South Carolina at Wake Forest Fall Invite | ",
 "Upcoming Nov 5 Men's · South Carolina at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · South Carolina at NCAA Individual Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Sep 11 Women's · South Carolina at Debbie Southern Furman Fall Classic | Completed",
 "Upcoming Oct 15 Women's · South Carolina at ITA Carolina Regionals | ",
 "Upcoming Nov 5 Women's · South Carolina at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · South Carolina at NCAA Individual Championships | "
]);
  const v_track=parse("Track & Field","track");
  assert.deepEqual(v_track.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 28 South Carolina vs UNCG | W, 3-0",
 "Final Aug 30 South Carolina vs Northeastern | W, 3-0",
 "Final Sep 1 South Carolina at Michigan | W, 3-2",
 "Final Sep 2 South Carolina vs Michigan State | L, 0-3",
 "Final Sep 6 South Carolina vs Troy | W, 3-1",
 "Final Sep 8 South Carolina vs Cal | L, 1-3",
 "Final Sep 11 South Carolina at Clemson | W, 3-1",
 "Final Sep 12 South Carolina at Wofford | W, 3-1",
 "Final Sep 15 South Carolina at ETSU | L, 2-3",
 "Final Sep 18 South Carolina vs Virginia Tech | W, 3-0",
 "Final Sep 23 South Carolina at Georgia | L, 2-3",
 "Final Sep 27 South Carolina at Texas A&M | L, 0-3",
 "Final Oct 2 South Carolina vs Oklahoma | L, 1-3",
 "Final Oct 4 South Carolina vs Arkansas | W, 3-2",
 "Upcoming Oct 9, 7:00 PM South Carolina at Alabama | ",
 "Upcoming Oct 11, 3:00 PM South Carolina at Mississippi State | ",
 "Upcoming Oct 16, 8:00 PM South Carolina at LSU | ",
 "Upcoming Oct 18, 1:00 PM South Carolina at Ole Miss | ",
 "Upcoming Oct 23, 7:00 PM South Carolina vs Missouri | ",
 "Upcoming Oct 25, 1:00 PM South Carolina vs Texas | ",
 "Upcoming Oct 30, 7:00 PM South Carolina vs Vanderbilt | ",
 "Upcoming Nov 6, 7:00 PM South Carolina at Florida | ",
 "Upcoming Nov 8, 3:00 PM South Carolina at Auburn | ",
 "Upcoming Nov 13, 7:00 PM South Carolina vs Kentucky | ",
 "Upcoming Nov 15, 1:00 PM South Carolina vs Tennessee | ",
 "Upcoming Nov 20 South Carolina at SEC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_bvball,"Beach Volleyball bvball");
  ownRecapsOnly(v_wcross,"Cross Country wcross");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_msoc,"Soccer msoc");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimming,"Swimming & Diving swimming");
  ownRecapsOnly(v_mten,"Tennis mten");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_track,"Track & Field track");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('South Carolina module checks passed');

// South Carolina's cards (div.event.schedule-table_row): the start is a Unix
// time (data-order), the day and time are written out ("Sat Sep 5 12:45 pm"),
// the opponent's strong follows any promotion ("Salute the Troops") and is
// followed by its marks ("(EXH)", "(SEC)"); results read "W 57-0", South
// Carolina's score first.
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.name,r.conference?.text]).flat();
{
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["South Carolina vs Kent State","W, 57-0"],["South Carolina vs Towson","W, 45-9"],["South Carolina vs Mississippi State","L, 34-41"],["South Carolina at Alabama","L, 18-49"],["South Carolina vs Kentucky","L, 34-35 (OT)"]]);
  // A TBA start is midnight UTC: the written day stays the day.
  assert.equal(parse('Football','football').find(e=>e.opponent==='Tennessee').start_time.slice(0,10),'2026-10-24');
  // Exhibitions are marked after the opponent.
  assert.deepEqual(parse('Baseball','baseball').slice(0,2).map(e=>e.opponent),['High Point (Exhibition)','College of Charleston (Exhibition)']);
  assert.equal(parse('Basketball','mbball')[0].opponent,'Victoria (Canada) (Exhibition)');
  // Conference games are marked "(SEC)", men's soccer's "(Sun Belt)".
  assert.deepEqual([['Football','football'],['Volleyball','wvball'],['Soccer','wsoc'],['Soccer','msoc']].map(([sport,slug])=>records(sport,slug)),[["2-3","SEC","0-3"],["8-6","SEC","1-3"],["10-1-1","SEC","4-0-1"],["7-1-2","Sun Belt","1-0-2"]]);
  // Golf's round cards ("R1 & R2", "R3") are one tournament, placed by its
  // last round ("12th, 842 (+2)"); the Stephens Cup closes with its
  // match-play final.
  assert.deepEqual(southCarolinaGolfPlace('t-4th, 551 (-17)').results,[{label:'Result',value:'T4th'},{label:'Team score',value:'551 (-17)'}]);
  assert.deepEqual(parse('Golf','mgolf').filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.end_time]),[["Visit Knoxville Collegiate","12th","2026-09-01T23:59:59Z"],["J.T. Poston Invitational","1st","2026-09-15T23:59:59Z"],["Bryan Bros Collegiate","6th","2026-09-29T23:59:59Z"]]);
  assert.deepEqual(parse('Golf','wgolf').filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline]),[["ANNIKA Intercollegiate","5th"],["Stephens Cup","Won final vs. Wake Forest, 3-2"],["Tot Hill Farm Invitational","Completed"]]);
  // Cross country's place in the field ("1st/13"); track's per team.
  assert.equal(southCarolinaTeamPlaces('1st/13','Cross Country').headline,"Women's team: 1st of 13");
  assert.equal(southCarolinaTeamPlaces('M: -- | W: T15th','Track & Field').headline,"Women's team: T15th");
  assert.equal(southCarolinaTeamPlaces('M: 11th | W: 5th','Track & Field').headline,"Women's team: 5th / Men's team: 11th");
  // A swimming dual per team.
  assert.equal(parse('Swimming & Diving','swimming')[0].headline,"Women's team: W, 250-50 / Men's team: W, 165-135");
  assert.deepEqual(southCarolinaSwimDuals('Women: L 120-180; Men: W 151.5-148.5').results.map(r=>r.result),['L, 120-180','W, 151.5-148.5']);
  // Last season's pages (track, beach volleyball) are empty until the new one is published.
  assert.deepEqual(parse('Track & Field','track'),[]);
  assert.deepEqual(parse('Beach Volleyball','bvball'),[]);
  // Players' pro events and past tournaments without a story are not the team's.
  assert.deepEqual(parse('Tennis','wten').map(e=>e.opponent),["Debbie Southern Furman Fall Classic","ITA Carolina Regionals","ITA Sectional Championships","NCAA Individual Championships"]);
}
// A profile page's menu lists the school's team accounts (gamecockbaseball)
// before the athlete's own link: the athlete's is taken.
assert.equal(worker.verifiedInstagram(fixture('profile-baseball-brandon-cromer.html.gz')),'https://www.instagram.com/brandon_cromer2/');
// The roster is one roster-card holding a schema.org athlete item per player:
// each item's own socials name its athlete (the whole card once gave Peyton
// Williams's account to the first player, Lex Cyrus).
{
  const profiles=worker.rosterProfiles(fixture('football-roster.html.gz'),'https://gamecocksonline.com/sports/football/roster/');
  assert.equal(profiles.length,111);
  assert.ok(profiles.every(p=>p.image_url));
  assert.deepEqual(profiles.filter(p=>p.instagram_url).map(p=>[p.name,p.instagram_url]),[["Peyton Williams","https://www.instagram.com/peyton31williams/"],["Maurice Brown II","https://www.instagram.com/bigmoe.44/"]]);
}
// Stories come in two templates: section.article_text and div.article__paragraphs.
{
  const files=['recap-2026-10-03-football-falls-to-no-24-kentucky-in-over.html.gz','recap-2026-10-03-no-11-gamecocks-play-to-draw-at-no-16-we.html.gz'];
  for(const file of files)assert.ok(worker.recapArticleText(fixture(file)).length>400,`${file}: story text`);
  assert.match(worker.recapArticleText(fixture(files[1])),/^MORGANTOWN, W\. Va\. – The 11th ranked South Carolina men’s soccer team/);
}
console.log('South Carolina hand-written checks passed');
