import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {valparaisoSchool} from '../src/schools/valparaiso.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='valparaiso');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,valparaisoHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/valparaiso-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit valpoathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['valparaiso'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',valparaisoSchool.scheduleUrls],['roster',valparaisoSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('valparaiso|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'valpoathletics.com',`${key} must stay on valpoathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://valpoathletics.com/sports/baseball/schedule"],"roster":["https://valpoathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://valpoathletics.com/sports/mens-basketball/schedule","https://valpoathletics.com/sports/womens-basketball/schedule"],"roster":["https://valpoathletics.com/sports/mens-basketball/roster","https://valpoathletics.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://valpoathletics.com/sports/womens-bowling/schedule"],"roster":["https://valpoathletics.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://valpoathletics.com/sports/mens-cross-country/schedule","https://valpoathletics.com/sports/womens-cross-country/schedule"],"roster":["https://valpoathletics.com/sports/mens-cross-country/roster","https://valpoathletics.com/sports/womens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://valpoathletics.com/sports/football/schedule"],"roster":["https://valpoathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://valpoathletics.com/sports/womens-golf/schedule","https://valpoathletics.com/sports/mens-golf/schedule"],"roster":["https://valpoathletics.com/sports/womens-golf/roster","https://valpoathletics.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://valpoathletics.com/sports/womens-soccer/schedule"],"roster":["https://valpoathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://valpoathletics.com/sports/softball/schedule"],"roster":["https://valpoathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://valpoathletics.com/sports/womens-swimming-and-diving/schedule","https://valpoathletics.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://valpoathletics.com/sports/womens-swimming-and-diving/roster","https://valpoathletics.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://valpoathletics.com/sports/womens-tennis/schedule"],"roster":["https://valpoathletics.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://valpoathletics.com/sports/mens-track-and-field/schedule","https://valpoathletics.com/sports/womens-track-and-field/schedule"],"roster":["https://valpoathletics.com/sports/mens-track-and-field/roster","https://valpoathletics.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://valpoathletics.com/sports/womens-volleyball/schedule"],"roster":["https://valpoathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'valparaiso|"+sport+"':"),`${sport} routes must live in the Valparaiso module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://valpoathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.valparaisoHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=valparaiso)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 12:00 PM Valparaiso vs Notre Dame | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · Valparaiso vs Olivet Nazarene (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Valparaiso vs Western Illinois | ",
 "Upcoming Nov 6, 5:30 PM Men's · Valparaiso at Purdue | ",
 "Upcoming Nov 11, 7:00 PM Men's · Valparaiso at South Dakota State | ",
 "Upcoming Nov 16, 7:00 PM Men's · Valparaiso vs CCSJ | ",
 "Upcoming Nov 21, 7:00 PM Men's · Valparaiso vs Troy | ",
 "Upcoming Nov 22, 5:00 PM Men's · Valparaiso vs Southern Miss | ",
 "Upcoming Nov 28, 2:00 PM Men's · Valparaiso vs Toledo | ",
 "Upcoming Dec 2, 6:00 PM Men's · Valparaiso at UIC | ",
 "Upcoming Dec 5, 6:00 PM Men's · Valparaiso at UNCW | ",
 "Upcoming Dec 8, 7:00 PM Men's · Valparaiso vs Saint Xavier | ",
 "Upcoming Dec 12, 2:00 PM Men's · Valparaiso vs Chicago State | ",
 "Upcoming Dec 18, 6:00 PM Men's · Valparaiso vs SIUE | ",
 "Upcoming Dec 22, 8:00 PM Men's · Valparaiso vs Evansville | ",
 "Upcoming Dec 29, 8:00 PM Men's · Valparaiso at Bradley | ",
 "Upcoming Jan 2, 2:00 PM Men's · Valparaiso vs Southern Illinois | ",
 "Upcoming Jan 5, 6:00 PM Men's · Valparaiso at UNI | ",
 "Upcoming Jan 8 Men's · Valparaiso vs UIC | ",
 "Upcoming Jan 12 Men's · Valparaiso at Drake | ",
 "Upcoming Jan 16, 4:00 PM Men's · Valparaiso at Illinois State | ",
 "Upcoming Jan 18, 7:00 PM Men's · Valparaiso vs UNI | ",
 "Upcoming Jan 21 Men's · Valparaiso vs Belmont | ",
 "Upcoming Jan 24 Men's · Valparaiso at Southern Illinois | ",
 "Upcoming Jan 27, 7:00 PM Men's · Valparaiso vs Indiana State | ",
 "Upcoming Jan 30 Men's · Valparaiso at Murray State | ",
 "Upcoming Feb 3 Men's · Valparaiso vs Drake | ",
 "Upcoming Feb 9 Men's · Valparaiso vs Illinois State | ",
 "Upcoming Feb 13, 12:00 PM Men's · Valparaiso at Indiana State | ",
 "Upcoming Feb 15 Men's · Valparaiso at Evansville | ",
 "Upcoming Feb 18, 7:00 PM Men's · Valparaiso vs Bradley | ",
 "Upcoming Feb 24, 6:00 PM Men's · Valparaiso at Belmont | ",
 "Upcoming Feb 27, 5:00 PM Men's · Valparaiso vs Murray State | ",
 "Upcoming Mar 4 Men's · Valparaiso at MVC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 26, 6:00 PM Women's · Valparaiso vs Judson (Exhibition) | ",
 "Upcoming Nov 3, 5:30 PM Women's · Valparaiso at Michigan State | ",
 "Upcoming Nov 7, 1:00 PM Women's · Valparaiso vs Detroit Mercy | ",
 "Upcoming Nov 10, 11:00 AM Women's · Valparaiso vs Culver-Stockton | ",
 "Upcoming Nov 13, 10:00 AM Women's · Valparaiso at Purdue Fort Wayne | ",
 "Upcoming Nov 15, 1:00 PM Women's · Valparaiso at Toledo | ",
 "Upcoming Nov 20, 6:00 PM Women's · Valparaiso vs South Dakota | ",
 "Upcoming Nov 22, 1:00 PM Women's · Valparaiso at SIUE | ",
 "Upcoming Nov 29, 1:00 PM Women's · Valparaiso at Loyola Chicago | ",
 "Upcoming Dec 2, 6:00 PM Women's · Valparaiso vs Western Illinois | ",
 "Upcoming Dec 6, 12:00 PM Women's · Valparaiso at Central Michigan | ",
 "Upcoming Dec 10, 6:00 PM Women's · Valparaiso vs Wisconsin | ",
 "Upcoming Dec 13, 12:00 PM Women's · Valparaiso at Eastern Michigan | ",
 "Upcoming Dec 20, 12:00 PM Women's · Valparaiso at Illinois State | ",
 "Upcoming Dec 22, 12:00 PM Women's · Valparaiso at UIC | ",
 "Upcoming Dec 29, 2:00 PM Women's · Valparaiso vs Indiana State | ",
 "Upcoming Jan 1, 6:00 PM Women's · Valparaiso at Bradley | ",
 "Upcoming Jan 3, 2:00 PM Women's · Valparaiso vs UNI | ",
 "Upcoming Jan 7, 6:00 PM Women's · Valparaiso at Murray State | ",
 "Upcoming Jan 9 Women's · Valparaiso at Southern Illinois | ",
 "Upcoming Jan 14, 6:00 PM Women's · Valparaiso at Evansville | ",
 "Upcoming Jan 19, 6:00 PM Women's · Valparaiso vs Drake | ",
 "Upcoming Jan 22, 6:00 PM Women's · Valparaiso vs Murray State | ",
 "Upcoming Jan 24, 2:00 PM Women's · Valparaiso vs Bradley | ",
 "Upcoming Jan 28, 6:30 PM Women's · Valparaiso at Belmont | ",
 "Upcoming Feb 4, 6:00 PM Women's · Valparaiso vs Evansville | ",
 "Upcoming Feb 7, 1:00 PM Women's · Valparaiso at Indiana State | ",
 "Upcoming Feb 12, 6:00 PM Women's · Valparaiso vs Illinois State | ",
 "Upcoming Feb 14, 2:00 PM Women's · Valparaiso vs UIC | ",
 "Upcoming Feb 19, 6:00 PM Women's · Valparaiso at UNI | ",
 "Upcoming Feb 21, 2:00 PM Women's · Valparaiso at Drake | ",
 "Upcoming Feb 25, 6:00 PM Women's · Valparaiso vs Belmont | ",
 "Upcoming Feb 27, 2:00 PM Women's · Valparaiso vs Southern Illinois | ",
 "Upcoming Mar 3 Women's · Valparaiso at MVC Tournament | ",
 "Upcoming Mar 5 Women's · Valparaiso at MVC Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 16 Valparaiso at Penguin Classic (Youngstown State) | 11th of 18 (6-7)",
 "Today Oct 23 Valparaiso at Warhawk Classic (UW-Whitewater) | ",
 "Upcoming Nov 6 Valparaiso at Bulldog Classic (Louisiana Tech) | ",
 "Upcoming Nov 13 Valparaiso at Bearcat Invitational (McKendree) | ",
 "Upcoming Jan 15 Valparaiso at Northeast Classic (Sacred Heart) | ",
 "Upcoming Jan 23 Valparaiso at Viking Classic (Augustana) | ",
 "Upcoming Feb 5 Valparaiso at Flyer Classic (Lewis) | ",
 "Upcoming Feb 19 Valparaiso at Big Red Invitational (Nebraska) | ",
 "Upcoming Mar 5 Valparaiso at Music City Classic (Vanderbilt) | ",
 "Upcoming Mar 17 Valparaiso at Conference USA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 18 Men's · Valparaiso at Roy Griak Invite | 7th of 18",
 "Final Oct 2 Men's · Valparaiso at Notre Dame Joe Piane Invite | 10th of 21",
 "Final Oct 16 Men's · Valparaiso at Indiana State Pre-Nationals | 9th of 16",
 "Upcoming Oct 30, 11:30 AM Men's · Valparaiso at MVC Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · Valparaiso at NCAA Great Lakes Regional | ",
 "Upcoming Nov 20 Men's · Valparaiso at NCAA Nationals | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 18 Women's · Valparaiso at Roy Griak Invite | 9th of 17",
 "Final Oct 2 Women's · Valparaiso at Notre Dame Joe Piane Invite | 16th of 24",
 "Final Oct 16 Women's · Valparaiso at Indiana State Pre-Nationals | 17th of 26",
 "Upcoming Oct 30, 10:30 AM Women's · Valparaiso at MVC Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Valparaiso at NCAA Great Lakes Regional | ",
 "Upcoming Nov 20 Women's · Valparaiso at NCAA Nationals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Valparaiso vs Lawrence Tech | W, 59-13",
 "Final Sep 12 Valparaiso at Murray State | L, 18-27",
 "Final Sep 19 Valparaiso at Indiana State | L, 16-39",
 "Final Sep 26 Valparaiso vs Butler | L, 28-33",
 "Final Oct 3 Valparaiso at Morehead State | W, 37-3",
 "Final Oct 10 Valparaiso vs Drake | W, 21-13",
 "Final Oct 17 Valparaiso at San Diego | L, 13-38",
 "Upcoming Oct 24, 12:00 PM Valparaiso vs Presbyterian | ",
 "Upcoming Nov 7, 11:00 AM Valparaiso at Dayton | ",
 "Upcoming Nov 14, 12:00 PM Valparaiso at Stetson | ",
 "Upcoming Nov 21, 1:00 PM Valparaiso vs St. Thomas | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Valparaiso at Brittany Kelly Classic | 14th of 14",
 "Final Sep 28 Women's · Valparaiso at NKU Invite | 10th of 11",
 "Final Oct 12 Women's · Valparaiso at Missouri State Payne Stewart Memorial | 9th of 12",
 "Final Oct 19 Women's · Valparaiso at Braun Intercollegiate | 6th of 11",
 "Upcoming Mar 8 Women's · Valparaiso at Lady Bison Spring Invitational | ",
 "Upcoming Mar 15 Women's · Valparaiso at Jackrabbits Invitational | ",
 "Upcoming Mar 22 Women's · Valparaiso at Ozarks National Invitational | ",
 "Upcoming Apr 11 Women's · Valparaiso at Indiana State Spring Invitational | ",
 "Upcoming Apr 18 Women's · Valparaiso at MVC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Valparaiso at ANF Fall Classic | 11th of 14",
 "Final Sep 21 Men's · Valparaiso at Bayou City Collegiate Classic | 7th of 13",
 "Final Sep 27 Men's · Valparaiso at Badger Invitational | 18th of 19",
 "Final Sep 27 Men's · Valparaiso at Badger Individual Tournament | No team score (individuals only)",
 "Final Oct 5 Men's · Valparaiso at Kemper Lakes Invitational | 6th of 12",
 "Final Oct 19 Men's · Valparaiso at Zach Johnson Invitational | 8th of 13",
 "Upcoming Feb 20 Men's · Valparaiso at Savannah Intercollegiate | ",
 "Upcoming Feb 26 Men's · Valparaiso at Peoples Golf Championship | ",
 "Upcoming Mar 8 Men's · Valparaiso at Surf Club Invitational | ",
 "Upcoming Mar 29 Men's · Valparaiso at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 5 Men's · Valparaiso at Racer Intercollegiate | ",
 "Upcoming Apr 17 Men's · Valparaiso at Boilermaker Shootout | ",
 "Upcoming Apr 25 Men's · Valparaiso at MVC Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Valparaiso at Eastern Illinois | L, 0-2",
 "Final Aug 16 Valparaiso at SIUE | T, 2-2",
 "Final Aug 20 Valparaiso vs Western Illinois | W, 4-0",
 "Final Aug 23 Valparaiso vs Detroit Mercy | L, 2-3",
 "Final Aug 30 Valparaiso at Western Michigan | L, 0-2",
 "Final Sep 3 Valparaiso at Purdue Fort Wayne | W, 2-0",
 "Final Sep 6 Valparaiso at Milwaukee | L, 0-2",
 "Final Sep 10 Valparaiso vs Oakland | W, 4-1",
 "Final Sep 13 Valparaiso vs Southern Indiana | W, 2-0",
 "Final Sep 20 Valparaiso vs Drake | L, 0-4",
 "Final Sep 27 Valparaiso vs Indiana State | W, 2-1",
 "Final Oct 4 Valparaiso at Murray State | L, 0-3",
 "Final Oct 11 Valparaiso at UNI | T, 1-1",
 "Final Oct 15 Valparaiso vs Southern Illinois | L, 0-3",
 "Final Oct 18 Valparaiso vs Evansville | W, 5-1",
 "Upcoming Oct 24, 2:00 PM Valparaiso at Belmont | ",
 "Upcoming Nov 1, 1:00 PM Valparaiso vs UIC | ",
 "Upcoming Nov 5, 1:00 PM Valparaiso at Illinois State | ",
 "Upcoming Nov 8 Valparaiso at MVC Tournament First Round | ",
 "Upcoming Nov 12 Valparaiso at MVC Tournament Semifinal | ",
 "Upcoming Nov 15 Valparaiso at MVC Tournament Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Valparaiso vs Southern Indiana | L, 93-169",
 "Final Oct 17 Women's · Valparaiso at Evansville | W, 157-105",
 "Today Oct 23, 4:30 PM Women's · Valparaiso at Franklin | ",
 "Upcoming Oct 24, 11:00 AM Women's · Valparaiso at Dan Ross Indiana Intercollegiate | ",
 "Upcoming Oct 30, 2:00 PM Women's · Valparaiso vs Green Bay & IU Indy | ",
 "Upcoming Nov 19 Women's · Valparaiso at Magnus Cup | ",
 "Upcoming Dec 4, 5:00 PM Women's · Valparaiso vs Lewis, Butler & Marquette | ",
 "Upcoming Jan 16, 2:00 PM Women's · Valparaiso at Saginaw Valley State | ",
 "Upcoming Jan 22, 5:00 PM Women's · Valparaiso vs Illinois State | ",
 "Upcoming Jan 23, 12:00 PM Women's · Valparaiso at Bethel | ",
 "Upcoming Jan 31, 11:00 AM Women's · Valparaiso at Butler Invitational | ",
 "Upcoming Feb 17 Women's · Valparaiso at MVC Championships | ",
 "Upcoming Feb 21 Women's · Valparaiso at Wabash Last-Chance Meet | ",
 "Upcoming Mar 11 Women's · Valparaiso at National Invitational Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · Valparaiso vs Southern Indiana | L, 110-152",
 "Final Oct 17 Men's · Valparaiso at Evansville | W, 145-117",
 "Today Oct 23, 4:30 PM Men's · Valparaiso at Franklin | ",
 "Upcoming Oct 24, 11:00 AM Men's · Valparaiso at Dan Ross Indiana Intercollegiate | ",
 "Upcoming Oct 30, 2:00 PM Men's · Valparaiso vs Green Bay & IU Indy | ",
 "Upcoming Nov 19 Men's · Valparaiso at Magnus Cup | ",
 "Upcoming Dec 4, 5:00 PM Men's · Valparaiso vs Lewis | ",
 "Upcoming Jan 16, 2:00 PM Men's · Valparaiso at Saginaw Valley State | ",
 "Upcoming Jan 22, 5:00 PM Men's · Valparaiso vs Ball State | ",
 "Upcoming Jan 23, 12:00 PM Men's · Valparaiso at Bethel | ",
 "Upcoming Jan 31, 11:00 AM Men's · Valparaiso at Butler Invitational | ",
 "Upcoming Feb 17 Men's · Valparaiso at MVC Championships | ",
 "Upcoming Feb 21 Men's · Valparaiso at Wabash Last-Chance Meet | ",
 "Upcoming Mar 11 Men's · Valparaiso at National Invitational Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Valparaiso vs Huntington (Ind.) | W, 4-3",
 "Final Sep 26 Valparaiso at Redbird Hidden Duals | No Team Score",
 "Final Oct 2 Valparaiso at Redbird Invitational | No Team Score",
 "Final Oct 8 Valparaiso at ITA Midwest Regional | No Team Score",
 "Upcoming Jan 16 Valparaiso at Indiana | ",
 "Upcoming Jan 18, 1:00 PM Valparaiso vs Chicago State | ",
 "Upcoming Jan 23, 10:30 AM Valparaiso at Northern Illinois | ",
 "Upcoming Feb 6, 3:30 PM Valparaiso at Western Illinois | ",
 "Upcoming Feb 13, 1:30 PM Valparaiso vs Oakland | ",
 "Upcoming Feb 14, 1:00 PM Valparaiso vs Arkansas | ",
 "Upcoming Feb 14, 4:00 PM Valparaiso at Wisconsin | ",
 "Upcoming Feb 20, 12:00 PM Valparaiso at Milwaukee | ",
 "Upcoming Feb 21, 11:00 AM Valparaiso at Marquette | ",
 "Upcoming Mar 7 Valparaiso at Southern Indiana | ",
 "Upcoming Mar 10, 12:00 PM Valparaiso vs Campbell | ",
 "Upcoming Mar 11, 12:00 PM Valparaiso at Charleston Southern | ",
 "Upcoming Mar 20, 2:30 PM Valparaiso at Eastern Michigan | ",
 "Upcoming Mar 27, 1:00 PM Valparaiso vs IU Indy | ",
 "Upcoming Mar 30 Valparaiso at Purdue Northwest | ",
 "Upcoming Apr 3 Valparaiso at Illinois State | ",
 "Upcoming Apr 4 Valparaiso at Bradley | ",
 "Upcoming Apr 11 Valparaiso at UIC | ",
 "Upcoming Apr 17 Valparaiso at Drake | ",
 "Upcoming Apr 18 Valparaiso at UNI | ",
 "Upcoming Apr 24 Valparaiso vs Murray State | ",
 "Upcoming Apr 25 Valparaiso vs Belmont | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Valparaiso vs UAB | W, 3-2",
 "Final Aug 28 Valparaiso at Chattanooga | W, 3-1",
 "Final Aug 29 Valparaiso vs Tennessee State | W, 3-0",
 "Final Sep 4 Valparaiso vs Cincinnati | L, 0-3",
 "Final Sep 5 Valparaiso vs Oakland | W, 3-1",
 "Final Sep 6 Valparaiso vs Michigan | L, 1-3",
 "Final Sep 10 Valparaiso vs Coppin State | L, 1-3",
 "Final Sep 11 Valparaiso at Cleveland State | W, 3-2",
 "Final Sep 12 Valparaiso at Akron | L, 1-3",
 "Final Sep 18 Valparaiso vs Le Moyne | W, 3-0",
 "Final Sep 18 Valparaiso at Niagara | W, 3-0",
 "Final Sep 19 Valparaiso at Canisius | W, 3-1",
 "Final Sep 25 Valparaiso vs Belmont | L, 1-3",
 "Final Sep 26 Valparaiso vs Illinois State | L, 2-3",
 "Final Sep 30 Valparaiso vs UIC | W, 3-1",
 "Final Oct 2 Valparaiso at Southern Illinois | L, 2-3",
 "Final Oct 8 Valparaiso vs Evansville | W, 3-1",
 "Final Oct 9 Valparaiso vs Murray State | W, 3-0",
 "Final Oct 16 Valparaiso at UNI | L, 0-3",
 "Final Oct 17 Valparaiso at Drake | L, 1-3",
 "Final Oct 22 Valparaiso at UIC | L, 0-3",
 "Upcoming Oct 24, 6:00 PM Valparaiso vs Indiana State | ",
 "Upcoming Oct 30, 6:00 PM Valparaiso at Illinois State | ",
 "Upcoming Oct 31, 5:00 PM Valparaiso at Bradley | ",
 "Upcoming Nov 6, 5:00 PM Valparaiso at Indiana State | ",
 "Upcoming Nov 7, 4:00 PM Valparaiso at Evansville | ",
 "Upcoming Nov 13, 6:00 PM Valparaiso vs Drake | ",
 "Upcoming Nov 14, 5:00 PM Valparaiso vs UNI | ",
 "Upcoming Nov 18 Valparaiso vs MVC First Round | ",
 "Upcoming Nov 21 Valparaiso at MVC Semifinal | ",
 "Upcoming Nov 24 Valparaiso at MVC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Valparaiso module checks passed");
