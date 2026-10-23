import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northFloridaSchool} from '../src/schools/north-florida.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='north-florida');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northFloridaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/north-florida-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit unfospreys.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['north-florida'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',northFloridaSchool.scheduleUrls],['roster',northFloridaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('north-florida|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'unfospreys.com',`${key} must stay on unfospreys.com`);
  }
}
const parity={"Baseball":{"schedule":["https://unfospreys.com/sports/baseball/schedule"],"roster":["https://unfospreys.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://unfospreys.com/sports/mens-basketball/schedule","https://unfospreys.com/sports/womens-basketball/schedule"],"roster":["https://unfospreys.com/sports/mens-basketball/roster","https://unfospreys.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://unfospreys.com/sports/womens-beach-volleyball/schedule"],"roster":["https://unfospreys.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://unfospreys.com/sports/womens-cross-country/schedule","https://unfospreys.com/sports/mens-cross-country/schedule"],"roster":["https://unfospreys.com/sports/womens-cross-country/roster","https://unfospreys.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://unfospreys.com/sports/womens-golf/schedule","https://unfospreys.com/sports/mens-golf/schedule"],"roster":["https://unfospreys.com/sports/womens-golf/roster","https://unfospreys.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://unfospreys.com/sports/womens-soccer/schedule","https://unfospreys.com/sports/mens-soccer/schedule"],"roster":["https://unfospreys.com/sports/womens-soccer/roster","https://unfospreys.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://unfospreys.com/sports/softball/schedule"],"roster":["https://unfospreys.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://unfospreys.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://unfospreys.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://unfospreys.com/sports/womens-tennis/schedule","https://unfospreys.com/sports/mens-tennis/schedule"],"roster":["https://unfospreys.com/sports/womens-tennis/roster","https://unfospreys.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://unfospreys.com/sports/womens-track-and-field/schedule","https://unfospreys.com/sports/mens-track-and-field/schedule"],"roster":["https://unfospreys.com/sports/womens-track-and-field/roster","https://unfospreys.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://unfospreys.com/sports/womens-volleyball/schedule"],"roster":["https://unfospreys.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'north-florida|"+sport+"':"),`${sport} routes must live in the North Florida module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://unfospreys.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northFloridaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=north-florida)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · North Florida vs Virgin Islands (Exhibition) | ",
 "Upcoming Nov 3, 10:00 PM Men's · North Florida at California Baptist | ",
 "Upcoming Nov 6 Men's · North Florida at UCLA | ",
 "Upcoming Nov 9, 7:00 PM Men's · North Florida at Miami (FL) | ",
 "Upcoming Nov 14, 2:00 PM Men's · North Florida vs The Citadel | ",
 "Upcoming Nov 17, 7:00 PM Men's · North Florida vs Fort Lauderdale | ",
 "Upcoming Nov 21, 2:00 PM Men's · North Florida vs Arkansas Little Rock | ",
 "Upcoming Nov 23, 7:00 PM Men's · North Florida vs Central Arkansas | ",
 "Upcoming Nov 25, 2:00 PM Men's · North Florida vs Warner | ",
 "Upcoming Nov 28, 2:00 PM Men's · North Florida at Columbia | ",
 "Upcoming Dec 3, 7:00 PM Men's · North Florida vs South Dakota | ",
 "Upcoming Dec 5, 2:00 PM Men's · North Florida vs Florida Polytech | ",
 "Upcoming Dec 12 Men's · North Florida at South Dakota | ",
 "Upcoming Dec 16, 7:00 PM Men's · North Florida vs Charleston Southern | ",
 "Upcoming Dec 19 Men's · North Florida at UT Arlington | ",
 "Upcoming Dec 21 Men's · North Florida at Texas A&M | ",
 "Upcoming Dec 29 Men's · North Florida at Georgia | ",
 "Upcoming Dec 31, 4:00 PM Men's · North Florida at Abilene Christian | ",
 "Upcoming Jan 2 Men's · North Florida at Tarleton State | ",
 "Upcoming Jan 7, 7:00 PM Men's · North Florida vs Bellarmine | ",
 "Upcoming Jan 9, 2:00 PM Men's · North Florida vs Lipscomb | ",
 "Upcoming Jan 14, 7:00 PM Men's · North Florida at West Florida | ",
 "Upcoming Jan 16, 3:00 PM Men's · North Florida at Queens (NC) | ",
 "Upcoming Jan 22 Men's · North Florida at Jacksonville | ",
 "Upcoming Jan 28, 8:00 PM Men's · North Florida vs Stetson | ",
 "Upcoming Jan 30, 5:00 PM Men's · North Florida vs Florida Gulf Coast | ",
 "Upcoming Feb 4 Men's · North Florida at Lipscomb | ",
 "Upcoming Feb 6 Men's · North Florida at Bellarmine | ",
 "Upcoming Feb 11, 7:00 PM Men's · North Florida vs Queens (NC) | ",
 "Upcoming Feb 13, 2:00 PM Men's · North Florida vs West Florida | ",
 "Upcoming Feb 19, 7:00 PM Men's · North Florida vs Jacksonville | ",
 "Upcoming Feb 25, 7:30 PM Men's · North Florida at Florida Gulf Coast | ",
 "Upcoming Feb 27, 3:30 PM Men's · North Florida at Stetson | ",
 "Upcoming Mar 4 Men's · North Florida at ASUN Tournament First Round | ",
 "Upcoming Mar 5 Men's · North Florida at ASUN Tournament Quarterfinals | ",
 "Upcoming Mar 6 Men's · North Florida at ASUN Tournament Semifinals | ",
 "Upcoming Mar 7 Men's · North Florida at ASUN Tournament Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · North Florida vs Florida Southern College (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · North Florida vs Florida Tech | ",
 "Upcoming Nov 5, 11:00 AM Women's · North Florida at Florida State | ",
 "Upcoming Nov 10, 11:00 AM Women's · North Florida vs Edward Waters | ",
 "Upcoming Nov 12, 8:00 PM Women's · North Florida at Arkansas Little Rock | ",
 "Upcoming Nov 14, 2:00 PM Women's · North Florida at Central Arkansas | ",
 "Upcoming Nov 17, 11:00 AM Women's · North Florida at UCF | ",
 "Upcoming Nov 19, 6:00 PM Women's · North Florida at Bethune-Cookman | ",
 "Upcoming Nov 27, 1:30 PM Women's · North Florida vs South Dakota | ",
 "Upcoming Nov 28, 1:30 PM Women's · North Florida vs North Carolina A&T | ",
 "Upcoming Dec 4, 7:00 PM Women's · North Florida vs South Alabama | ",
 "Upcoming Dec 6, 2:45 PM Women's · North Florida at Florida | ",
 "Upcoming Dec 12, 4:00 PM Women's · North Florida vs Coastal Georgia | ",
 "Upcoming Dec 16, 12:30 PM Women's · North Florida at Texas Tech | ",
 "Upcoming Dec 19, 2:00 PM Women's · North Florida at Florida Atlantic | ",
 "Upcoming Dec 20, 12:00 PM Women's · North Florida vs SIUE | ",
 "Upcoming Dec 29, 7:00 PM Women's · North Florida vs Tarleton State | ",
 "Upcoming Dec 31, 2:00 PM Women's · North Florida vs Abilene Christian | ",
 "Upcoming Jan 2, 2:00 PM Women's · North Florida vs UT Arlington | ",
 "Upcoming Jan 9, 2:00 PM Women's · North Florida at Jacksonville | ",
 "Upcoming Jan 14, 7:00 PM Women's · North Florida vs Bellarmine | ",
 "Upcoming Jan 16, 2:00 PM Women's · North Florida vs Lipscomb | ",
 "Upcoming Jan 21, 7:00 PM Women's · North Florida at West Florida | ",
 "Upcoming Jan 23, 2:00 PM Women's · North Florida at Queens | ",
 "Upcoming Jan 28, 5:00 PM Women's · North Florida vs Stetson | ",
 "Upcoming Jan 30, 2:00 PM Women's · North Florida vs Florida Gulf Coast | ",
 "Upcoming Feb 6, 2:00 PM Women's · North Florida vs Jacksonville | ",
 "Upcoming Feb 11, 7:00 PM Women's · North Florida at Lipscomb | ",
 "Upcoming Feb 13, 2:00 PM Women's · North Florida at Bellarmine | ",
 "Upcoming Feb 18, 7:00 PM Women's · North Florida vs Queens | ",
 "Upcoming Feb 20, 2:00 PM Women's · North Florida vs West Florida | ",
 "Upcoming Feb 25, 5:00 PM Women's · North Florida at Florida Gulf Coast | ",
 "Upcoming Feb 27, 1:00 PM Women's · North Florida at Stetson | ",
 "Upcoming Mar 4 Women's · North Florida at ASUN Championship First Round | ",
 "Upcoming Mar 5 Women's · North Florida at ASUN Championship Quarterfinals | ",
 "Upcoming Mar 6 Women's · North Florida at ASUN Championship Semifinals | ",
 "Upcoming Mar 8 Women's · North Florida at ASUN Championship Final | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · North Florida at Florida Intercollegiate XC Invitational | 2nd of 19",
 "Final Sep 11 Women's · North Florida at Queens City Invite | 4th of 26",
 "Final Oct 2 Women's · North Florida at Georgia Tech XC Invitational | 2nd of 16",
 "Final Oct 16 Women's · North Florida at Joe Handelman '52 Fall Classic | 11th of 18",
 "Upcoming Oct 30 Women's · North Florida at ASUN XC Championship | ",
 "Upcoming Nov 13 Women's · North Florida at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Women's · North Florida at NCAA National Championship (Game 1) | ",
 "Upcoming Nov 21 Women's · North Florida at NCAA National Championship (Game 2) | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · North Florida at Florida Intercollegiate XC Invitational | 1st of 18",
 "Final Sep 11 Men's · North Florida at Queen City Invite | 2nd of 25",
 "Final Oct 2 Men's · North Florida at Georgia Tech XC Invitational | 2nd of 13",
 "Final Oct 16 Men's · North Florida at Joe Handelman '52 Fall Classic | 6th of 20",
 "Upcoming Oct 30 Men's · North Florida at ASUN XC Championship | ",
 "Upcoming Nov 13 Men's · North Florida at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Men's · North Florida at NCAA National Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · North Florida at Boilermaker Classic | 5th of 16",
 "Final Sep 26 Women's · North Florida at Fighting Irish Classic | T4th of 14",
 "Final Oct 9 Women's · North Florida at Evie Odom Invitational | 1st of 14",
 "Final Oct 19 Women's · North Florida at Route 66 Invitational | 14th of 16",
 "Upcoming Jan 25 Women's · North Florida at Sea Best Intercollegiate | ",
 "Upcoming Jan 31 Women's · North Florida at Grand Reservation Dominican Republic Classic | ",
 "Upcoming Feb 22 Women's · North Florida at Momentum Transportation UNF Collegiate | ",
 "Upcoming Mar 13 Women's · North Florida at Valspar Augusta Invitational | ",
 "Upcoming Mar 20 Women's · North Florida at Florida State Match Up | ",
 "Upcoming Mar 29 Women's · North Florida at Coach Mo Classic | ",
 "Upcoming Apr 11 Women's · North Florida at Atlantic Sun Conference Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · North Florida at Florida Atlantic Invitational | 2nd of 11",
 "Final Sep 28 Men's · North Florida at Bryan Bros Collegiate | T11th of 16",
 "Final Oct 18 Men's · North Florida at Williams Cup | 14th of 14",
 "Upcoming Oct 26 Men's · North Florida at Ka'Anapali Classic | ",
 "Upcoming Feb 7 Men's · North Florida at Dorado Beach Collegiate | ",
 "Upcoming Feb 13 Men's · North Florida at Gator Invitational | ",
 "Upcoming Mar 6 Men's · North Florida at The Hayt | ",
 "Upcoming Mar 14 Men's · North Florida at The Michael A. Marino Classic | ",
 "Upcoming Mar 21 Men's · North Florida at Players Collegiate | ",
 "Upcoming Apr 12 Men's · North Florida at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 20 Men's · North Florida at Atlantic Sun Conference Championship - Day 1 | ",
 "Upcoming Apr 21 Men's · North Florida at Atlantic Sun Conference Championship - Day 2 | ",
 "Upcoming Apr 22 Men's · North Florida at Atlantic Sun Conference Championship - Day 3 | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · North Florida at Georgia Southern | L, 1-2",
 "Final Aug 18 Women's · North Florida vs Saint Leo | W, 3-2",
 "Final Aug 23 Women's · North Florida at FIU | T, 1-1",
 "Final Aug 27 Women's · North Florida vs College of Charleston | T, 1-1",
 "Final Sep 3 Women's · North Florida at Alabama A&M | T, 1-1",
 "Final Sep 6 Women's · North Florida at Jacksonville State | W, 4-3",
 "Final Sep 10 Women's · North Florida at UCF | L, 0-1",
 "Final Sep 17 Women's · North Florida vs Kennesaw State | W, 3-2",
 "Final Sep 24 Women's · North Florida vs Bellarmine | T, 1-1",
 "Final Sep 27 Women's · North Florida vs Lipscomb | W, 1-0",
 "Final Oct 1 Women's · North Florida at West Florida | W, 1-0",
 "Final Oct 4 Women's · North Florida at Queens | W, 1-0",
 "Final Oct 8 Women's · North Florida at FGCU | L, 1-2",
 "Final Oct 11 Women's · North Florida at Stetson | W, 3-0",
 "Final Oct 18 Women's · North Florida vs Jacksonville | L, 3-4",
 "Final Oct 22 Women's · North Florida vs Stetson | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Women's · North Florida vs FGCU | ",
 "Upcoming Oct 31, 4:00 PM Women's · North Florida at Jacksonville | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · North Florida vs South Carolina | L, 1-4",
 "Final Aug 23 Men's · North Florida vs Mercer | T, 1-1",
 "Final Aug 27 Men's · North Florida at Florida Atlantic | L, 0-2",
 "Final Sep 1 Men's · North Florida at South Florida | W, 1-0",
 "Final Sep 5 Men's · North Florida at Jacksonville | W, 2-1",
 "Final Sep 9 Men's · North Florida vs Coastal Carolina | W, 2-0",
 "Final Sep 12 Men's · North Florida at FGCU | W, 2-1",
 "Final Sep 15 Men's · North Florida at Clemson | L, 1-5",
 "Final Sep 19 Men's · North Florida vs West Florida | W, 3-1",
 "Final Sep 22 Men's · North Florida vs Trinity College of Jacksonville | W, 3-0",
 "Final Sep 26 Men's · North Florida vs Stetson | W, 1-0",
 "Final Oct 3 Men's · North Florida vs Central Arkansas | W, 2-1",
 "Final Oct 6 Men's · North Florida at FIU | L, 0-2",
 "Final Oct 10 Men's · North Florida at Bellarmine | T, 0-0",
 "Final Oct 13 Men's · North Florida vs College of Charleston | W, 1-0",
 "Final Oct 17 Men's · North Florida vs Queens (NC) | W, 2-0",
 "Final Oct 20 Men's · North Florida at Saint Louis | T, 1-1",
 "Upcoming Oct 31, 7:00 PM Men's · North Florida at Lipscomb | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 6:00 PM North Florida at Florida (Exhibition) | ",
 "Upcoming Oct 30, 5:00 PM North Florida vs College of Central Florida (Exhibition) | ",
 "Upcoming Nov 6, 5:00 PM North Florida vs Chipola (Exhibition) (Game 1) | ",
 "Upcoming Nov 6, 7:00 PM North Florida vs Chipola (Exhibition) (Game 2) | ",
 "Upcoming Nov 13, 1:00 PM North Florida vs Florida State College at Jacksonville (Exhibition) (Game 1) | ",
 "Upcoming Nov 13, 3:00 PM North Florida vs Florida State College at Jacksonville (Exhibition) (Game 2) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · North Florida at Miami (FL) / Ohio | Completed",
 "Final Oct 9 Women's · North Florida at North Florida Invite | Completed",
 "Today Oct 23, 2:00 PM Women's · North Florida at Florida State | ",
 "Upcoming Nov 17 Women's · North Florida at Gamecock Invitational | ",
 "Upcoming Jan 9, 12:00 PM Women's · North Florida at Campbell | ",
 "Upcoming Jan 15, 12:00 PM Women's · North Florida at Georgia Southern | ",
 "Upcoming Jan 29, 6:00 PM Women's · North Florida at FGCU | ",
 "Upcoming Feb 17 Women's · North Florida at Atlantic Sun Conference Swimming & Diving Championship | ",
 "Upcoming Mar 11 Women's · North Florida at CSCAA National Invitational Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · North Florida at College of Charleston Invitational | Completed",
 "Final Sep 25 Women's · North Florida at Bedford Cup | Completed",
 "Final Oct 8 Women's · North Florida at ITA Southeast Regional Championship | Completed",
 "Today Oct 23, 9:00 AM Women's · North Florida at Georgia Southern Fall Shootout | ",
 "Upcoming Nov 5 Women's · North Florida at ITA Masters Championship | ",
 "Upcoming Nov 6, 9:00 AM Women's · North Florida at UNF Invite | ",
 "Upcoming Jan 15, 1:00 PM Women's · North Florida at Auburn | ",
 "Upcoming Jan 16, 1:00 PM Women's · North Florida vs Tulane | ",
 "Upcoming Jan 22, 4:00 PM Women's · North Florida at Nebraska | ",
 "Upcoming Jan 23 Women's · North Florida at Pepperdine / UC Santa Barbara | ",
 "Upcoming Jan 28 Women's · North Florida at FIU | ",
 "Upcoming Jan 29 Women's · North Florida vs North Texas | ",
 "Upcoming Feb 5, 10:00 AM Women's · North Florida vs Alabama | ",
 "Upcoming Feb 6, 11:00 AM Women's · North Florida vs Presbyterian | ",
 "Upcoming Feb 12, 11:00 AM Women's · North Florida vs College of Charleston | ",
 "Upcoming Feb 15, 11:00 AM Women's · North Florida vs Air Force | ",
 "Upcoming Feb 21, 10:00 AM Women's · North Florida vs West Florida | ",
 "Upcoming Mar 4 Women's · North Florida vs Coastal Carolina | ",
 "Upcoming Mar 8 Women's · North Florida vs Appalachian State | ",
 "Upcoming Mar 18, 10:00 AM Women's · North Florida at Bellarmine | ",
 "Upcoming Mar 20 Women's · North Florida at Lipscomb | ",
 "Upcoming Mar 21 Women's · North Florida vs Austin Peay | ",
 "Upcoming Mar 26, 10:00 AM Women's · North Florida vs Stetson | ",
 "Upcoming Mar 31 Women's · North Florida vs USF | ",
 "Upcoming Apr 3, 10:00 AM Women's · North Florida vs Queens (N.C.) | ",
 "Upcoming Apr 9, 11:00 AM Women's · North Florida vs FGCU | ",
 "Upcoming Apr 11, 1:00 PM Women's · North Florida at Georgia Southern | ",
 "Upcoming Apr 22 Women's · North Florida at Atlantic Sun Conference Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · North Florida at UNF Hidden Duals | Completed",
 "Final Oct 2 Men's · North Florida at Bedford Cup | Completed",
 "Final Oct 14 Men's · North Florida at ITA Southeast Regional Championship | Completed",
 "Today Oct 22 Men's · North Florida at ASUN Men's Tennis Individual Tournament | ",
 "Today Oct 23 Men's · North Florida at Wake Forest Invitational | ",
 "Upcoming Nov 5 Men's · North Florida at ITA Masters Championship | ",
 "Upcoming Nov 18 Men's · North Florida at NCAA Individual Championships | ",
 "Upcoming Jan 12, 6:00 PM Men's · North Florida at Miami | ",
 "Upcoming Jan 16, 1:00 PM Men's · North Florida vs Chattanooga | ",
 "Upcoming Jan 17, 2:00 PM Men's · North Florida vs UCF | ",
 "Upcoming Jan 22, 1:00 PM Men's · North Florida vs Florida Atlantic | ",
 "Upcoming Jan 29, 1:00 PM Men's · North Florida at South Alabama | ",
 "Upcoming Jan 30, 1:00 PM Men's · North Florida at Troy | ",
 "Upcoming Feb 5, 11:00 AM Men's · North Florida vs Jacksonville State | ",
 "Upcoming Feb 7, 11:00 AM Men's · North Florida at Mercer | ",
 "Upcoming Feb 19, 1:00 PM Men's · North Florida at UNC Wilmington | ",
 "Upcoming Feb 20, 11:00 AM Men's · North Florida at Coastal Carolina | ",
 "Upcoming Feb 25, 1:00 PM Men's · North Florida vs UAB | ",
 "Upcoming Mar 5, 2:00 PM Men's · North Florida at Lipscomb | ",
 "Upcoming Mar 7, 12:00 PM Men's · North Florida at Bellarmine | ",
 "Upcoming Mar 11, 10:00 AM Men's · North Florida vs VCU | ",
 "Upcoming Mar 13, 10:00 AM Men's · North Florida vs West Florida | ",
 "Upcoming Mar 19, 11:00 AM Men's · North Florida vs FGCU | ",
 "Upcoming Mar 21, 11:00 AM Men's · North Florida vs Kennesaw State | ",
 "Upcoming Mar 26, 2:00 PM Men's · North Florida vs Stetson | ",
 "Upcoming Apr 2, 1:00 PM Men's · North Florida at Georgia Southern | ",
 "Upcoming Apr 3, 1:00 PM Men's · North Florida vs Queens | ",
 "Upcoming Apr 9, 1:00 PM Men's · North Florida at Presbyterian College | ",
 "Upcoming Apr 10, 1:00 PM Men's · North Florida at Charlotte | ",
 "Upcoming Apr 16, 11:00 AM Men's · North Florida at Florida | ",
 "Upcoming Apr 21 Men's · North Florida at Atlantic Sun Conference Tournament | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 North Florida at Georgia | L, 0-3",
 "Final Aug 28 North Florida vs Furman | W, 3-1",
 "Final Aug 29 North Florida vs George Washington | W, 3-1",
 "Final Sep 3 North Florida vs FIU | W, 3-1",
 "Final Sep 4 North Florida vs Duke | L, 1-3",
 "Final Sep 5 North Florida vs Tulane | L, 0-3",
 "Final Sep 11 North Florida vs Western Carolina | W, 3-0",
 "Final Sep 12 North Florida at Appalachian State | W, 3-2",
 "Final Sep 13 North Florida vs William & Mary | L, 1-3",
 "Final Sep 18 North Florida vs Fordham | W, 3-0",
 "Final Sep 19 North Florida vs Kennesaw State | W, 3-2",
 "Final Sep 20 North Florida at Georgia Southern | L, 0-3",
 "Final Sep 26 North Florida at Jacksonville | W, 3-2",
 "Final Oct 2 North Florida at Lipscomb | L, 2-3",
 "Final Oct 3 North Florida at Bellarmine | L, 1-3",
 "Final Oct 9 North Florida at Queens | W, 3-1",
 "Final Oct 16 North Florida vs Stetson | W, 3-2",
 "Final Oct 17 North Florida vs FGCU | W, 3-0",
 "Today Oct 23, 6:00 PM North Florida vs West Florida | ",
 "Upcoming Oct 24, 6:00 PM North Florida vs Queens | ",
 "Upcoming Oct 30, 6:00 PM North Florida at FGCU | ",
 "Upcoming Nov 1, 1:00 PM North Florida at Stetson | ",
 "Upcoming Nov 6, 6:00 PM North Florida vs Bellarmine | ",
 "Upcoming Nov 7, 6:00 PM North Florida vs Lipscomb | ",
 "Upcoming Nov 10, 1:00 PM North Florida at West Florida | ",
 "Upcoming Nov 13, 6:00 PM North Florida vs Jacksonville | ",
 "Upcoming Nov 19 North Florida at Atlantic Sun Conference Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Florida module checks passed");
