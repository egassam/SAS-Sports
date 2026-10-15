import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {floridaStateSchool,floridaStateGolfStoryPlace} from '../src/schools/florida-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='florida-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,floridaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/florida-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit seminoles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['florida-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',floridaStateSchool.scheduleUrls],['roster',floridaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('florida-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'seminoles.com',`${key} must stay on seminoles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://seminoles.com/sports/baseball/schedule"],"roster":["https://seminoles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://seminoles.com/sports/mens-basketball/schedule","https://seminoles.com/sports/womens-basketball/schedule"],"roster":["https://seminoles.com/sports/mens-basketball/roster","https://seminoles.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://seminoles.com/sports/womens-beach-volleyball/schedule"],"roster":["https://seminoles.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://seminoles.com/sports/womens-cross-country/schedule","https://seminoles.com/sports/mens-cross-country/schedule"],"roster":["https://seminoles.com/sports/womens-cross-country/roster","https://seminoles.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://seminoles.com/sports/football/schedule"],"roster":["https://seminoles.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://seminoles.com/sports/womens-golf/schedule","https://seminoles.com/sports/mens-golf/schedule"],"roster":["https://seminoles.com/sports/womens-golf/roster","https://seminoles.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://seminoles.com/sports/womens-lacrosse/schedule"],"roster":["https://seminoles.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://seminoles.com/sports/womens-soccer/schedule"],"roster":["https://seminoles.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://seminoles.com/sports/softball/schedule"],"roster":["https://seminoles.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://seminoles.com/sports/womens-swimming-and-diving/schedule","https://seminoles.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://seminoles.com/sports/womens-swimming-and-diving/roster","https://seminoles.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://seminoles.com/sports/womens-tennis/schedule","https://seminoles.com/sports/mens-tennis/schedule"],"roster":["https://seminoles.com/sports/womens-tennis/roster","https://seminoles.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://seminoles.com/sports/womens-track-and-field/schedule","https://seminoles.com/sports/mens-track-and-field/schedule"],"roster":["https://seminoles.com/sports/womens-track-and-field/roster","https://seminoles.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://seminoles.com/sports/womens-volleyball/schedule"],"roster":["https://seminoles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'florida-state|"+sport+"':"),`${sport} routes must live in the Florida State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://seminoles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.floridaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=florida-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 16, 5:00 PM Florida State vs Jacksonville (Exhibition) | ",
 "Upcoming Oct 17, 1:00 PM Florida State vs North Florida (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Florida State vs South Florida (Exhibition) | ",
 "Upcoming Oct 30, 6:00 PM Florida State vs Garnet & Gold All-Star Game | ",
 "Upcoming Feb 19, 6:00 PM Florida State vs USC - Upstate | ",
 "Upcoming Feb 20, 2:00 PM Florida State vs USC - Upstate | ",
 "Upcoming Feb 21, 1:00 PM Florida State vs USC - Upstate | ",
 "Upcoming Feb 23, 5:00 PM Florida State at South Florida | ",
 "Upcoming Feb 26, 6:00 PM Florida State vs Western Carolina | ",
 "Upcoming Feb 27, 2:00 PM Florida State vs Western Carolina | ",
 "Upcoming Feb 28, 1:00 PM Florida State vs Western Carolina | ",
 "Upcoming Mar 2, 6:00 PM Florida State at Jacksonville | ",
 "Upcoming Mar 5, 6:00 PM Florida State vs Seton Hall | ",
 "Upcoming Mar 6, 2:00 PM Florida State vs Seton Hall | ",
 "Upcoming Mar 7, 1:00 PM Florida State vs Seton Hall | ",
 "Upcoming Mar 9, 6:00 PM Florida State vs North Florida | ",
 "Upcoming Mar 10, 5:00 PM Florida State vs Bethune-Cookman | ",
 "Upcoming Mar 12, 6:00 PM Florida State vs Gardner-Webb | ",
 "Upcoming Mar 13, 2:00 PM Florida State vs Gardner-Webb | ",
 "Upcoming Mar 14, 1:00 PM Florida State vs Gardner-Webb | ",
 "Upcoming Mar 16, 6:00 PM Florida State vs Florida | ",
 "Upcoming Mar 18, 7:00 PM Florida State at North Carolina | ",
 "Upcoming Mar 19, 6:00 PM Florida State at North Carolina | ",
 "Upcoming Mar 20, 2:00 PM Florida State at North Carolina | ",
 "Upcoming Mar 23, 6:00 PM Florida State vs Jacksonville | ",
 "Upcoming Mar 25, 6:00 PM Florida State vs Cal | ",
 "Upcoming Mar 26, 6:00 PM Florida State vs Cal | ",
 "Upcoming Mar 27, 2:00 PM Florida State vs Cal | ",
 "Upcoming Mar 30, 6:00 PM Florida State vs Florida | ",
 "Upcoming Apr 2, 6:00 PM Florida State at Duke | ",
 "Upcoming Apr 3, 3:00 PM Florida State at Duke | ",
 "Upcoming Apr 4, 12:00 PM Florida State at Duke | ",
 "Upcoming Apr 6, 6:00 PM Florida State vs Miami | ",
 "Upcoming Apr 9 Florida State at Boston College | ",
 "Upcoming Apr 10 Florida State at Boston College | ",
 "Upcoming Apr 11 Florida State at Boston College | ",
 "Upcoming Apr 13, 5:00 PM Florida State vs South Florida | ",
 "Upcoming Apr 16, 6:00 PM Florida State vs Virginia Tech | ",
 "Upcoming Apr 17, 2:00 PM Florida State vs Virginia Tech | ",
 "Upcoming Apr 18, 1:00 PM Florida State vs Virginia Tech | ",
 "Upcoming Apr 20, 6:00 PM Florida State vs Mercer | ",
 "Upcoming Apr 22, 7:00 PM Florida State vs Georgia Tech | ",
 "Upcoming Apr 23, 6:00 PM Florida State vs Georgia Tech | ",
 "Upcoming Apr 24, 2:00 PM Florida State vs Georgia Tech | ",
 "Upcoming Apr 27, 6:30 PM Florida State at Florida | ",
 "Upcoming Apr 30, 6:00 PM Florida State vs Louisville | ",
 "Upcoming May 1, 6:00 PM Florida State vs Louisville | ",
 "Upcoming May 2, 1:00 PM Florida State vs Louisville | ",
 "Upcoming May 4, 6:00 PM Florida State vs Stetson | ",
 "Upcoming May 7, 6:00 PM Florida State at Pitt | ",
 "Upcoming May 8, 3:00 PM Florida State at Pitt | ",
 "Upcoming May 9, 1:00 PM Florida State at Pitt | ",
 "Upcoming May 11, 6:00 PM Florida State vs Jacksonville | ",
 "Upcoming May 14, 6:00 PM Florida State at NC State | ",
 "Upcoming May 15, 3:00 PM Florida State at NC State | ",
 "Upcoming May 16, 1:00 PM Florida State at NC State | ",
 "Upcoming May 20, 6:00 PM Florida State vs Stanford | ",
 "Upcoming May 21, 6:00 PM Florida State vs Stanford | ",
 "Upcoming May 22, 2:00 PM Florida State vs Stanford University | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 14, 8:00 PM Men's · Florida State vs Auburn (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Men's · Florida State vs LSU (Exhibition) | ",
 "Upcoming Nov 2, 8:30 PM Men's · Florida State vs Florida A&M | ",
 "Upcoming Nov 6, 7:00 PM Men's · Florida State vs Troy | ",
 "Upcoming Nov 10, 6:00 PM Men's · Florida State vs Florida | ",
 "Upcoming Nov 13, 5:00 PM Men's · Florida State vs Texas A&M - Corpus Christi | ",
 "Upcoming Nov 17, 7:00 PM Men's · Florida State vs Ball State | ",
 "Upcoming Nov 20, 8:00 PM Men's · Florida State vs Green Bay | ",
 "Upcoming Nov 24, 9:00 PM Men's · Florida State vs UNC Asheville | ",
 "Upcoming Nov 29, 3:00 PM Men's · Florida State vs West Florida | ",
 "Upcoming Dec 1, 7:00 PM Men's · Florida State at Tennessee | ",
 "Upcoming Dec 5, 12:00 PM Men's · Florida State vs Dayton | ",
 "Upcoming Dec 12, 3:00 PM Men's · Florida State vs Texas A&M | ",
 "Upcoming Dec 16, 7:00 PM Men's · Florida State vs Jacksonville | ",
 "Upcoming Dec 20, 1:00 PM Men's · Florida State vs Houston | ",
 "Upcoming Dec 22, 6:00 PM Men's · Florida State vs Bethune-Cookman | ",
 "Upcoming Dec 29, 6:00 PM Men's · Florida State vs Syracuse | ",
 "Upcoming Jan 6, 9:00 PM Men's · Florida State at Cal | ",
 "Upcoming Jan 9, 5:30 PM Men's · Florida State at Stanford | ",
 "Upcoming Jan 13, 7:00 PM Men's · Florida State vs North Carolina | ",
 "Upcoming Jan 16, 4:30 PM Men's · Florida State at Wake Forest | ",
 "Upcoming Jan 20, 7:00 PM Men's · Florida State vs Virginia Tech | ",
 "Upcoming Jan 23, 12:00 PM Men's · Florida State at Clemson | ",
 "Upcoming Jan 26, 7:00 PM Men's · Florida State vs Notre Dame | ",
 "Upcoming Jan 30, 3:00 PM Men's · Florida State vs Pitt | ",
 "Upcoming Feb 3, 6:00 PM Men's · Florida State at NC State | ",
 "Upcoming Feb 6, 2:00 PM Men's · Florida State at Miami | ",
 "Upcoming Feb 13, 3:15 PM Men's · Florida State vs Clemson | ",
 "Upcoming Feb 16, 7:00 PM Men's · Florida State at Duke | ",
 "Upcoming Feb 21, 4:00 PM Men's · Florida State vs Louisville | ",
 "Upcoming Feb 23, 6:00 PM Men's · Florida State vs Georgia Tech | ",
 "Upcoming Feb 27, 2:00 PM Men's · Florida State at Virginia | ",
 "Upcoming Mar 3, 6:30 PM Men's · Florida State at Boston College | ",
 "Upcoming Mar 6, 2:00 PM Men's · Florida State vs Miami | ",
 "Upcoming Mar 9 Men's · Florida State at ACC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 18, 2:00 PM Women's · Florida State vs Tampa (Exhibition) | ",
 "Upcoming Oct 22, 6:00 PM Women's · Florida State vs Palm Beach Atlantic (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Florida State vs Merrimack | ",
 "Upcoming Nov 5, 11:00 AM Women's · Florida State vs North Florida | ",
 "Upcoming Nov 8, 2:00 PM Women's · Florida State vs Florida A&M | ",
 "Upcoming Nov 11, 6:00 PM Women's · Florida State vs West Florida | ",
 "Upcoming Nov 15, 2:00 PM Women's · Florida State vs Florida | ",
 "Upcoming Nov 19, 11:00 AM Women's · Florida State vs Purdue | ",
 "Upcoming Nov 21, 12:00 PM Women's · Florida State vs UCF | ",
 "Upcoming Nov 27, 5:00 PM Women's · Florida State vs Dayton | ",
 "Upcoming Nov 29, 12:00 PM Women's · Florida State vs VCU | ",
 "Upcoming Dec 3, 7:00 PM Women's · Florida State vs Missouri | ",
 "Upcoming Dec 6, 12:00 PM Women's · Florida State at Notre Dame | ",
 "Upcoming Dec 13, 2:00 PM Women's · Florida State vs South Alabama | ",
 "Upcoming Dec 17, 6:00 PM Women's · Florida State vs NC State | ",
 "Upcoming Dec 20 Women's · Florida State at Indiana | ",
 "Upcoming Dec 31, 2:00 PM Women's · Florida State at Georgia Tech | ",
 "Upcoming Jan 3, 2:00 PM Women's · Florida State at Boston College | ",
 "Upcoming Jan 7, 6:00 PM Women's · Florida State vs Louisville | ",
 "Upcoming Jan 10, 12:00 PM Women's · Florida State vs Syracuse | ",
 "Upcoming Jan 17, 2:00 PM Women's · Florida State at Miami | ",
 "Upcoming Jan 21, 6:00 PM Women's · Florida State vs Pittsburgh | ",
 "Upcoming Jan 24, 2:00 PM Women's · Florida State at Virginia Tech | ",
 "Upcoming Jan 28, 8:00 PM Women's · Florida State vs Duke | ",
 "Upcoming Jan 31, 2:00 PM Women's · Florida State vs Wake Forest | ",
 "Upcoming Feb 4, 9:00 PM Women's · Florida State at Cal | ",
 "Upcoming Feb 7, 4:00 PM Women's · Florida State at Stanford | ",
 "Upcoming Feb 11, 6:00 PM Women's · Florida State vs Clemson | ",
 "Upcoming Feb 14, 2:00 PM Women's · Florida State vs Miami | ",
 "Upcoming Feb 18, 6:30 PM Women's · Florida State at Virginia | ",
 "Upcoming Feb 21, 12:00 PM Women's · Florida State at North Carolina | ",
 "Upcoming Feb 28, 2:00 PM Women's · Florida State vs SMU | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 9 Florida State at SCE West Coast Championship | Completed",
 "Final Oct 10 Florida State at AVCA East Bid Tournament | Completed",
 "Upcoming Oct 24 Florida State at Hickory Point Bid Event | ",
 "Upcoming Nov 6 Florida State at UNF Fall Invitational | ",
 "Upcoming Nov 6 Florida State at AVCA Pairs Championship | ",
 "Upcoming Nov 14 Florida State vs Garnet and Gold (Exhibition) | ",
 "Upcoming Nov 20 Florida State at Kauai Beach College Invitational | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 18 Women's · Florida State at Pre-Regionals | M; 1st | W; 1st",
 "Final Sep 25 Women's · Florida State at Gans Creek Classic | W; 3rd | M; 7th",
 "Final Oct 9 Women's · Florida State at FSU XC Invite | W;3rd | M; 3rd",
 "Upcoming Oct 16, 10:00 AM Women's · Florida State at Pre-Nationals | ",
 "Upcoming Oct 30 Women's · Florida State at ACC Championships | ",
 "Upcoming Nov 13 Women's · Florida State at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Women's · Florida State at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 18 Men's · Florida State at Pre-Regional | M; 1st | W; 1st",
 "Final Sep 25 Men's · Florida State at Gans Creek Classic | W;3rd | W; 7th",
 "Final Oct 9 Men's · Florida State at FSU XC Invite | W;3rd | M; 3rd",
 "Upcoming Oct 16, 10:40 AM Men's · Florida State at Pre-Nationals | ",
 "Upcoming Oct 30 Men's · Florida State at ACC Championships | ",
 "Upcoming Nov 13 Men's · Florida State at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Men's · Florida State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Florida State vs New Mexico State | W, 34-17",
 "Final Sep 7 Florida State vs SMU | L, 24-27",
 "Final Sep 19 Florida State at Alabama | L, 36-50",
 "Final Sep 26 Florida State vs Central Arkansas | W, 34-7",
 "Final Oct 3 Florida State vs Virginia | W, 38-7",
 "Final Oct 9 Florida State at Louisville | L, 20-44",
 "Upcoming Oct 17, 7:00 PM Florida State at Miami | ",
 "Upcoming Oct 31 Florida State vs Clemson | ",
 "Upcoming Nov 7 Florida State at Boston College | ",
 "Upcoming Nov 13, 7:00 PM Florida State at Pitt | ",
 "Upcoming Nov 21 Florida State vs NC State | ",
 "Upcoming Nov 27, 3:30 PM Florida State vs Florida | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Florida State at Folds of Honor | 1st of 12",
 "Final Sep 14 Women's · Florida State at Jackson T. Stephens Cup | 5th of 6",
 "Final Sep 19 Women's · Florida State at Schooner Fall Classic | 3rd of 16",
 "Upcoming Oct 23 Women's · Florida State at Landfall Tradition | ",
 "Upcoming Jan 29 Women's · Florida State at Collegiate Invitational at Guadalajara Country Club | ",
 "Upcoming Feb 14 Women's · Florida State at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Florida State at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 20 Women's · Florida State at Florida State Match Up | ",
 "Upcoming Apr 5 Women's · Florida State at Country Club of Birmingham Match Play | ",
 "Upcoming Apr 15 Women's · Florida State at ACC Championships | ",
 "Upcoming May 10 Women's · Florida State at NCAA Regional Championships | ",
 "Upcoming May 21 Women's · Florida State at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Florida State at Folds of Honor Collegiate | Completed",
 "Final Sep 18 Men's · Florida State at Olympia Fields | 14th",
 "Final Oct 5 Men's · Florida State at Hamptons Intercollegiate | Completed",
 "Upcoming Oct 17 Men's · Florida State at Fallen Oak Invitational | ",
 "Upcoming Feb 14 Men's · Florida State at Watersound Invitational | ",
 "Upcoming Feb 28 Men's · Florida State at Cabo Collegiate | ",
 "Upcoming Mar 12 Men's · Florida State at Seminole Intercollegiate | ",
 "Upcoming Mar 22 Men's · Florida State at Valspar Collegiate Invitational | ",
 "Upcoming Apr 12 Men's · Florida State at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 22 Men's · Florida State at ACC Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 17, 1:00 PM Florida State at Tampa (Exhibition) | ",
 "Upcoming Oct 24, 12:00 PM Florida State vs Florida (Exhibition) | ",
 "Upcoming Oct 24, 4:00 PM Florida State vs Mercer (Exhibition) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Florida State at Stetson | W, 4-0",
 "Final Aug 16 Florida State at FIU | W, 2-0",
 "Final Aug 20 Florida State vs Florida Atlantic | W, 3-0",
 "Final Aug 23 Florida State at Florida | L, 1-3",
 "Final Sep 3 Florida State at Georgia | W, 2-1",
 "Final Sep 6 Florida State vs Rice | T, 1-1",
 "Final Sep 11 Florida State vs NC State | T, 2-2",
 "Final Sep 27 Florida State at Louisville | T, 0-0",
 "Final Oct 4 Florida State at Clemson | W, 2-1",
 "Today Oct 15, 6:00 PM Florida State at Wake Forest | ",
 "Upcoming Oct 18, 1:00 PM Florida State at Pitt | ",
 "Upcoming Oct 24, 7:00 PM Florida State vs Notre Dame | ",
 "Upcoming Oct 29, 8:00 PM Florida State vs Duke | ",
 "Upcoming Nov 1, 4:00 PM Florida State at Miami | ",
 "Upcoming Nov 5, 6:30 PM Florida State vs Virginia Tech | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 17, 12:00 PM Florida State vs Gulf Coast State College (Exhibition) | ",
 "Upcoming Oct 18, 1:00 PM Florida State vs Auburn (Exhibition) | ",
 "Upcoming Oct 24, 5:00 PM Florida State vs LSU (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Florida State vs LSU (Exhibition) | ",
 "Upcoming Nov 8, 12:00 PM Florida State vs Florida A&M (Exhibition) | ",
 "Upcoming Nov 13, 6:00 PM Florida State at Florida (Exhibition) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Florida State vs Iowa State | W, 391-284",
 "Upcoming Oct 16, 7:30 AM Women's · Florida State at Georgia Tech | ",
 "Upcoming Oct 23, 2:00 PM Women's · Florida State at All Florida Invite | ",
 "Upcoming Oct 28 Women's · Florida State at USA SCM World Championship Trials | ",
 "Upcoming Nov 6, 11:00 AM Women's · Florida State at South Carolina | ",
 "Upcoming Nov 19, 9:30 AM Women's · Florida State at Georgia Invite | ",
 "Upcoming Jan 5, 2:00 PM Women's · Florida State vs Villanova | ",
 "Upcoming Jan 8, 11:00 AM Women's · Florida State at Texas A&M/Auburn | ",
 "Upcoming Jan 22, 2:00 PM Women's · Florida State vs Miami | ",
 "Upcoming Jan 29, 12:00 PM Women's · Florida State vs Florida | ",
 "Upcoming Feb 16 Women's · Florida State at ACC Championships | ",
 "Upcoming Mar 17 Women's · Florida State at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · Florida State vs Purdue | L, 347.50-352.50",
 "Upcoming Oct 16, 7:30 AM Men's · Florida State at Georgia Tech | ",
 "Upcoming Oct 23, 2:00 PM Men's · Florida State at All Florida Invite | ",
 "Upcoming Oct 28 Men's · Florida State at USA SCM World Championship Trials | ",
 "Upcoming Nov 6, 11:00 AM Men's · Florida State at South Carolina | ",
 "Upcoming Nov 19 Men's · Florida State at Georgia Invite | ",
 "Upcoming Jan 5, 2:00 PM Men's · Florida State vs Villanova | ",
 "Upcoming Jan 8, 11:00 AM Men's · Florida State at Texas A&M/Auburn | ",
 "Upcoming Jan 29, 12:00 PM Men's · Florida State vs Florida | ",
 "Upcoming Feb 16 Men's · Florida State at ACC Championships | ",
 "Upcoming Mar 24 Men's · Florida State at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 7 Women's · Florida State at PTT Tallahassee | Completed",
 "Final Sep 19 Women's · Florida State at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Florida State at Bedford Cup | Completed",
 "Final Oct 7 Women's · Florida State at ITA Regional Championships | Completed",
 "Upcoming Nov 5 Women's · Florida State at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Florida State at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · Florida State at UNF Fall Invitational | ",
 "Upcoming Nov 17 Women's · Florida State at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 7 Men's · Florida State at UTR PTT $25K Tallahassee Men | Completed",
 "Final Oct 2 Men's · Florida State at Bedford Cup | Completed",
 "Upcoming Oct 14 Men's · Florida State at ITA Regional Championships | ",
 "Upcoming Nov 5 Men's · Florida State at ITA Sectionals Championships | ",
 "Upcoming Jan 9 Men's · Florida State vs University of West Florida | ",
 "Upcoming Jan 9 Men's · Florida State vs University of Southern Mississippi | ",
 "Upcoming Jan 10 Men's · Florida State vs Georgia Southern University | ",
 "Upcoming Jan 15 Men's · Florida State vs College of Charleston | ",
 "Upcoming Jan 18 Men's · Florida State at University of Georgia | ",
 "Upcoming Jan 22 Men's · Florida State at University of Arkansas | ",
 "Upcoming Jan 29 Men's · Florida State vs Florida | ",
 "Upcoming Feb 13 Men's · Florida State vs University of North Carolina Wilmington | ",
 "Upcoming Feb 13 Men's · Florida State vs Georgia State University | ",
 "Upcoming Feb 19 Men's · Florida State vs Auburn University | ",
 "Upcoming Feb 21 Men's · Florida State vs University of South Alabama | ",
 "Upcoming Mar 5 Men's · Florida State at Wake Forest University | ",
 "Upcoming Mar 7 Men's · Florida State at NC State University | ",
 "Upcoming Mar 12 Men's · Florida State at University of North Carolina | ",
 "Upcoming Mar 14 Men's · Florida State at Duke University | ",
 "Upcoming Mar 21 Men's · Florida State vs Georgia Tech | ",
 "Upcoming Mar 21 Men's · Florida State vs Clemson University | ",
 "Upcoming Mar 26 Men's · Florida State vs Southern Methodist University | ",
 "Upcoming Mar 28 Men's · Florida State vs Boston College | ",
 "Upcoming Apr 2 Men's · Florida State at University of Virginia | ",
 "Upcoming Apr 4 Men's · Florida State at Virginia Tech | ",
 "Upcoming Apr 9 Men's · Florida State vs University of California | ",
 "Upcoming Apr 11 Men's · Florida State vs Stanford University | ",
 "Upcoming Apr 11 Men's · Florida State vs University of Miami | ",
 "Upcoming Apr 20 Men's · Florida State at ACC Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Florida State at Boston Invite | ",
 "Upcoming Jan 15 Women's · Florida State at Clemson Orange and Purple | ",
 "Upcoming Jan 22 Women's · Florida State at Stan Scott Invitational | ",
 "Upcoming Jan 29 Women's · Florida State at Razorback Invitational | ",
 "Upcoming Feb 12 Women's · Florida State at Boston Valentine Invite | ",
 "Upcoming Feb 12 Women's · Florida State at Clemson Tiger Paw | ",
 "Upcoming Feb 25 Women's · Florida State at ACC Indoor Championships | ",
 "Upcoming Mar 12 Women's · Florida State at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Women's · Florida State at Raleigh Relays | ",
 "Upcoming Mar 25 Women's · Florida State at Terry Long FSU Relays | ",
 "Upcoming Apr 2 Women's · Florida State at Dick Roberts Seminole Invite | ",
 "Upcoming Apr 10 Women's · Florida State at Alabama Twilight | ",
 "Upcoming Apr 15 Women's · Florida State at Tom Jones Invite | ",
 "Upcoming Apr 17 Women's · Florida State at Azusa Pacific Invite | ",
 "Upcoming Apr 24 Women's · Florida State at LSU Alumni Gold Invite | ",
 "Upcoming May 1 Women's · Florida State at UNF East Coast Relays | ",
 "Upcoming May 13 Women's · Florida State at ACC Outdoor Championships | ",
 "Upcoming May 27 Women's · Florida State at NCAA East First Round | ",
 "Upcoming Jun 9 Women's · Florida State at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · Florida State at Boston Invite | ",
 "Upcoming Jan 15 Men's · Florida State at Clemson Orange and Purple | ",
 "Upcoming Jan 22 Men's · Florida State at Stan Scott Invitational | ",
 "Upcoming Jan 29 Men's · Florida State at Razorback Invitational | ",
 "Upcoming Feb 12 Men's · Florida State at Valentine Invite | ",
 "Upcoming Feb 12 Men's · Florida State at Tiger Paw Invitational | ",
 "Upcoming Feb 25 Men's · Florida State at ACC Indoor Championships | ",
 "Upcoming Mar 12 Men's · Florida State at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Men's · Florida State at Raleigh Relays | ",
 "Upcoming Mar 25 Men's · Florida State at Terry Long FSU Relays | ",
 "Upcoming Apr 2 Men's · Florida State at Dick Roberts Seminole Invite | ",
 "Upcoming Apr 10 Men's · Florida State at Alabama Twilight | ",
 "Upcoming Apr 15 Men's · Florida State at Tom Jones Invite | ",
 "Upcoming Apr 17 Men's · Florida State at Azusa Pacific Invite | ",
 "Upcoming Apr 24 Men's · Florida State at LSU Alumni Gold Invite | ",
 "Upcoming May 1 Men's · Florida State at UNF East Coast Relays | ",
 "Upcoming May 13 Men's · Florida State at ACC Outdoor Championships | ",
 "Upcoming May 26 Men's · Florida State at NCAA East First Round | ",
 "Upcoming Jun 9 Men's · Florida State at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Florida State vs BYU | L, 2-3",
 "Final Aug 29 Florida State vs VCU | W, 3-1",
 "Final Aug 30 Florida State at FGCU | W, 3-1",
 "Final Sep 4 Florida State vs Kansas | W, 3-2",
 "Final Sep 5 Florida State at Lipscomb | L, 1-3",
 "Final Sep 8 Florida State vs Auburn | L, 1-3",
 "Final Sep 9 Florida State vs Louisiana | W, 3-1",
 "Final Sep 13 Florida State vs FIU | L, 0-3",
 "Final Sep 14 Florida State vs North Alabama | W, 3-0",
 "Final Sep 18 Florida State vs Florida | L, 1-3",
 "Final Sep 23 Florida State vs Miami | W, 3-2",
 "Final Sep 27 Florida State at Miami | L, 0-3",
 "Final Oct 2 Florida State vs NC State | W, 3-0",
 "Final Oct 4 Florida State vs Wake Forest | W, 3-0",
 "Final Oct 7 Florida State vs Jacksonville | W, 3-1",
 "Final Oct 11 Florida State vs Clemson | W, 3-0",
 "Upcoming Oct 16, 7:00 PM Florida State at Pittsburgh | ",
 "Upcoming Oct 18, 2:00 PM Florida State at SMU | ",
 "Upcoming Oct 23, 6:00 PM Florida State vs Louisville | ",
 "Upcoming Oct 25, 1:00 PM Florida State vs Notre Dame | ",
 "Upcoming Oct 30, 6:00 PM Florida State at Virginia Tech | ",
 "Upcoming Nov 1, 1:00 PM Florida State at Virginia | ",
 "Upcoming Nov 3, 6:00 PM Florida State vs Georgia Tech | ",
 "Upcoming Nov 6, 6:00 PM Florida State vs California | ",
 "Upcoming Nov 8, 1:00 PM Florida State vs Stanford | ",
 "Upcoming Nov 13, 7:00 PM Florida State at Boston College | ",
 "Upcoming Nov 15, 1:00 PM Florida State at Syracuse | ",
 "Upcoming Nov 20, 12:00 PM Florida State at Duke | ",
 "Upcoming Nov 22, 1:00 PM Florida State at North Carolina | ",
 "Upcoming Nov 24, 2:00 PM Florida State at Clemson | ",
 "Upcoming Nov 28, 2:00 PM Florida State vs Virginia | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf: a card without a place takes the team's from its final story: the
// headline, else the summary and first paragraphs (Hamptons Intercollegiate,
// Oct 6: "The Seminoles finished the tournament 16-over, 880, placing
// fourth."). The men's Folds of Honor (Sep 7-9) links only a round-two story
// (Sep 8): no final story, so it is not listed. A player's finish gives none.
{
  const h=worker.floridaStateHandlers,decode=worker.decodeHtml;
  assert.deepEqual(['recap-2026-9-9-womens-golf-seminoles-win-folds-of-honor','recap-2026-9-15-womens-golf-seminoles-finish-fifth-at-ja','recap-2026-9-21-womens-golf-landgraf-nakatani-lead-semin','recap-2026-9-7-womens-golf-seminoles-tied-for-second-af','story-2026-10-6-mens-golf-weaver-bock-produce-top-10-fin','recap-2026-9-8-mens-golf-edero-leads-noles-in-round-two','recap-2026-9-19-mens-golf-no-20-noles-close-out-ofcc-oly'].map(name=>floridaStateGolfStoryPlace(fixture(`${name}.html.gz`),decode)),["1st","5th","3rd","T2nd","4th",null,null]);
  const listed=[];
  recapFixtures.set('https://seminoles.com/sports/mens-golf/archives',fixture('mens-golf-archives.html.gz'));
  for(const name of ['story-2026-10-5-mens-golf-played-called-due-to-darkness-','story-2026-10-6-mens-golf-weaver-bock-produce-top-10-fin']){const [y,m,d]=name.split('-').slice(1,4);const slug=(fixture('mens-golf-archives.html.gz').match(new RegExp(`/news/${y}/${m}/${d}/(${name.split('-').slice(4).join('-')}[A-Za-z0-9-]*)`))||[])[1];recapFixtures.set(`https://seminoles.com/news/${y}/${m}/${d}/${slug}`,fixture(`${name}.html.gz`));}
  for(const slug of ['womens-golf','mens-golf'])for(const event of parse('Golf',slug).filter(e=>e.status==='Final')){
    if(event.recap_url&&!recapFixtures.has(event.recap_url))recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
    if(h.isFinalWithoutStory(event))await h.attachArchiveStory(event);
    if(h.isFloridaStateGolf(event))await h.attachGolfPlace(event);
    if(!h.isGolfWithoutStory(event))listed.push(line(event));
  }
  assert.deepEqual(listed,["Final Sep 7 Women's · Florida State at Folds of Honor | 1st of 12","Final Sep 14 Women's · Florida State at Jackson T. Stephens Cup | 5th of 6","Final Sep 19 Women's · Florida State at Schooner Fall Classic | 3rd of 16","Final Sep 18 Men's · Florida State at Olympia Fields | 14th","Final Oct 5 Men's · Florida State at Hamptons Intercollegiate | 4th"]);
  recapFixtures.clear();requests.length=0;
}

// Beach volleyball's fall tournaments (Oct 9-11) publish no result or story:
// not listed. Swimming's "Garnet & Gold Meet" (Sep 18) is an intrasquad.
{
  const h=worker.floridaStateHandlers;
  assert.deepEqual(parse('Beach Volleyball','womens-beach-volleyball').filter(e=>e.status==='Final').map(e=>[line(e),h.isTennisWithoutStory(e)]),[["Final Oct 9 Florida State at SCE West Coast Championship | Completed",true],["Final Oct 10 Florida State at AVCA East Bid Tournament | Completed",true]]);
  assert.deepEqual(['womens-swimming-and-diving','mens-swimming-and-diving'].flatMap(slug=>parse('Swimming & Diving',slug)).filter(e=>/Garnet/.test(e.title)).length,0);
}

// Cross country: each team's page is its own event with its own TFRRS race
// (FSU XC Invitational, Oct 9: both teams 3rd with 83 points).
{
  const h=worker.floridaStateHandlers;
  recapFixtures.set('https://www.tfrrs.org/teams/xc/FL_college_f_Florida_State.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/FL_college_m_Florida_State.html',fixture('tfrrs-team-m.html.gz'));
  for(const [number,name] of [['28896','FSU_XC_Invitational'],['28714','Gans_Creek_Classic'],['28647','FSU_Pre-Regional']])for(const url of [`https://www.tfrrs.org/results/xc/${number}/${name}`,`https://www.tfrrs.org/results/xc/${number}/${name}/`])recapFixtures.set(url,fixture(`tfrrs-${number}.html.gz`));
  const rows=[];
  for(const slug of ['womens-cross-country','mens-cross-country'])for(const event of parse('Cross Country',slug).filter(e=>e.status==='Final')){
    if(h.isCrossCountry(event))await h.attachMeetResults(event);
    rows.push([line(event),event.results.map(r=>r.group||r.label).filter((v,i,a)=>a.indexOf(v)===i)]);
  }
  assert.deepEqual(rows,[["Final Sep 18 Women's · Florida State at Pre-Regionals | Women's team: 1st · 17 pts",["Women's 6K"]],["Final Sep 25 Women's · Florida State at Gans Creek Classic | Women's team: 3rd · 151 pts",["Women's 6K"]],["Final Oct 9 Women's · Florida State at FSU XC Invite | Women's team: 3rd · 83 pts",["Women's 6K"]],["Final Sep 18 Men's · Florida State at Pre-Regional | Men's team: 1st · 26 pts",["Men's 8K"]],["Final Sep 25 Men's · Florida State at Gans Creek Classic | Men's team: 7th · 253 pts",["Men's 8K"]],["Final Oct 9 Men's · Florida State at FSU XC Invite | Men's team: 3rd · 83 pts",["Men's 8K"]]]);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Florida State module checks passed');
