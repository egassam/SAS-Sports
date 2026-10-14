import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {wisconsinSchool,WISCONSIN_TFRRS_TEAMS} from '../src/schools/wisconsin.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='wisconsin');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,wisconsinHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/wisconsin-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uwbadgers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['wisconsin'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',wisconsinSchool.scheduleUrls],['roster',wisconsinSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('wisconsin|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uwbadgers.com',`${key} must stay on uwbadgers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://uwbadgers.com/sports/mens-basketball/schedule","https://uwbadgers.com/sports/womens-basketball/schedule"],"roster":["https://uwbadgers.com/sports/mens-basketball/roster","https://uwbadgers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uwbadgers.com/sports/womens-cross-country/schedule","https://uwbadgers.com/sports/mens-cross-country/schedule"],"roster":["https://uwbadgers.com/sports/womens-cross-country/roster","https://uwbadgers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://uwbadgers.com/sports/football/schedule"],"roster":["https://uwbadgers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uwbadgers.com/sports/womens-golf/schedule","https://uwbadgers.com/sports/mens-golf/schedule"],"roster":["https://uwbadgers.com/sports/womens-golf/roster","https://uwbadgers.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://uwbadgers.com/sports/mens-ice-hockey/schedule","https://uwbadgers.com/sports/womens-ice-hockey/schedule"],"roster":["https://uwbadgers.com/sports/mens-ice-hockey/roster","https://uwbadgers.com/sports/womens-ice-hockey/roster"],"combined":true},"Rowing":{"schedule":["https://uwbadgers.com/sports/womens-rowing/schedule","https://uwbadgers.com/sports/rowing/schedule"],"roster":["https://uwbadgers.com/sports/womens-rowing/roster","https://uwbadgers.com/sports/rowing/roster"],"combined":true},"Soccer":{"schedule":["https://uwbadgers.com/sports/womens-soccer/schedule","https://uwbadgers.com/sports/mens-soccer/schedule"],"roster":["https://uwbadgers.com/sports/womens-soccer/roster","https://uwbadgers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uwbadgers.com/sports/softball/schedule"],"roster":["https://uwbadgers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://uwbadgers.com/sports/womens-swimming-and-diving/schedule","https://uwbadgers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://uwbadgers.com/sports/womens-swimming-and-diving/roster","https://uwbadgers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://uwbadgers.com/sports/womens-tennis/schedule","https://uwbadgers.com/sports/mens-tennis/schedule"],"roster":["https://uwbadgers.com/sports/womens-tennis/roster","https://uwbadgers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uwbadgers.com/sports/womens-track-and-field/schedule","https://uwbadgers.com/sports/mens-track-and-field/schedule"],"roster":["https://uwbadgers.com/sports/womens-track-and-field/roster","https://uwbadgers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://uwbadgers.com/sports/womens-volleyball/schedule"],"roster":["https://uwbadgers.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://uwbadgers.com/sports/wrestling/schedule"],"roster":["https://uwbadgers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'wisconsin|"+sport+"':"),`${sport} routes must live in the Wisconsin module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://uwbadgers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.wisconsinHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=wisconsin)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 10 Men's · Wisconsin vs UW-Parkside (Exhibition) | W, 94-71",
 "Upcoming Oct 15, 6:30 PM Men's · Wisconsin at Green Bay (Exhibition) | ",
 "Upcoming Oct 27, 6:00 PM Men's · Wisconsin vs Oklahoma State (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Wisconsin vs Denver | ",
 "Upcoming Nov 6, 6:30 PM Men's · Wisconsin vs Delaware | ",
 "Upcoming Nov 10, 7:30 PM Men's · Wisconsin vs Fairfield | ",
 "Upcoming Nov 15, 7:00 PM Men's · Wisconsin vs Coastal Carolina | ",
 "Upcoming Nov 19, 7:30 PM Men's · Wisconsin vs Seton Hall | ",
 "Upcoming Nov 20 Men's · Wisconsin vs NC State/Murray State | ",
 "Upcoming Nov 25, 6:00 PM Men's · Wisconsin vs Northeastern | ",
 "Upcoming Dec 1, 8:00 PM Men's · Wisconsin at Northwestern | ",
 "Upcoming Dec 5, 1:00 PM Men's · Wisconsin at Marquette | ",
 "Upcoming Dec 8, 8:00 PM Men's · Wisconsin vs Purdue | ",
 "Upcoming Dec 12, 11:00 AM Men's · Wisconsin vs Villanova | ",
 "Upcoming Dec 19, 3:00 PM Men's · Wisconsin vs Auburn | ",
 "Upcoming Dec 22, 7:00 PM Men's · Wisconsin vs Purdue Fort Wayne | ",
 "Upcoming Dec 30, 7:00 PM Men's · Wisconsin vs Colorado State | ",
 "Upcoming Jan 2, 7:00 PM Men's · Wisconsin vs Illinois | ",
 "Upcoming Jan 6, 7:30 PM Men's · Wisconsin at Iowa | ",
 "Upcoming Jan 9, 11:00 AM Men's · Wisconsin vs Minnesota | ",
 "Upcoming Jan 13, 6:00 PM Men's · Wisconsin vs Penn State | ",
 "Upcoming Jan 16, 5:00 PM Men's · Wisconsin at USC | ",
 "Upcoming Jan 19, 9:30 PM Men's · Wisconsin at UCLA | ",
 "Upcoming Jan 23, 1:00 PM Men's · Wisconsin vs Washington | ",
 "Upcoming Jan 26, 6:00 PM Men's · Wisconsin at Maryland | ",
 "Upcoming Jan 31, 12:00 PM Men's · Wisconsin at Minnesota | ",
 "Upcoming Feb 3, 7:30 PM Men's · Wisconsin vs Oregon | ",
 "Upcoming Feb 6 Men's · Wisconsin vs Michigan | ",
 "Upcoming Feb 9, 7:30 PM Men's · Wisconsin at Ohio State | ",
 "Upcoming Feb 13, 11:00 AM Men's · Wisconsin at Rutgers | ",
 "Upcoming Feb 19, 7:00 PM Men's · Wisconsin vs Indiana | ",
 "Upcoming Feb 24, 7:30 PM Men's · Wisconsin vs Iowa | ",
 "Upcoming Feb 28, 12:30 PM Men's · Wisconsin at Illinois | ",
 "Upcoming Mar 3, 7:30 PM Men's · Wisconsin vs Nebraska | ",
 "Upcoming Mar 6, 2:45 PM Men's · Wisconsin at Michigan State | ",
 "Upcoming Mar 9 Men's · Wisconsin at Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Wisconsin vs UW-Eau Claire (Exhibition) | ",
 "Upcoming Nov 3, 6:30 PM Women's · Wisconsin vs Bradley | ",
 "Upcoming Nov 5, 6:30 PM Women's · Wisconsin vs Oakland | ",
 "Upcoming Nov 8, 2:00 PM Women's · Wisconsin vs Grambling State | ",
 "Upcoming Nov 11, 6:30 PM Women's · Wisconsin vs Delaware | ",
 "Upcoming Nov 14, 1:00 PM Women's · Wisconsin at Green Bay | ",
 "Upcoming Nov 17, 6:30 PM Women's · Wisconsin vs Marquette | ",
 "Upcoming Nov 22, 12:00 PM Women's · Wisconsin vs Lafayette | ",
 "Upcoming Nov 25, 11:30 AM Women's · Wisconsin vs Auburn | ",
 "Upcoming Nov 26, 11:30 AM Women's · Wisconsin vs Syracuse | ",
 "Upcoming Dec 2, 6:30 PM Women's · Wisconsin vs Western Michigan | ",
 "Upcoming Dec 5, 2:00 PM Women's · Wisconsin vs Illinois | ",
 "Upcoming Dec 10, 6:00 PM Women's · Wisconsin at Valparaiso | ",
 "Upcoming Dec 17, 11:00 AM Women's · Wisconsin vs Delaware State | ",
 "Upcoming Dec 20, 11:00 AM Women's · Wisconsin vs Omaha | ",
 "Upcoming Dec 29, 2:00 PM Women's · Wisconsin vs USC | ",
 "Upcoming Jan 2 Women's · Wisconsin at Washington | ",
 "Upcoming Jan 5 Women's · Wisconsin at Oregon | ",
 "Upcoming Jan 10, 2:00 PM Women's · Wisconsin vs Ohio State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Wisconsin at Purdue | ",
 "Upcoming Jan 17, 2:00 PM Women's · Wisconsin vs Northwestern | ",
 "Upcoming Jan 21, 7:30 PM Women's · Wisconsin at Minnesota | ",
 "Upcoming Jan 24, 2:00 PM Women's · Wisconsin vs Rutgers | ",
 "Upcoming Jan 28, 6:00 PM Women's · Wisconsin vs Maryland | ",
 "Upcoming Jan 31, 2:00 PM Women's · Wisconsin at Iowa | ",
 "Upcoming Feb 4, 6:30 PM Women's · Wisconsin vs Minnesota | ",
 "Upcoming Feb 11, 8:00 PM Women's · Wisconsin vs UCLA | ",
 "Upcoming Feb 14 Women's · Wisconsin at Indiana | ",
 "Upcoming Feb 17, 7:00 PM Women's · Wisconsin at Nebraska | ",
 "Upcoming Feb 20, 1:00 PM Women's · Wisconsin vs Michigan | ",
 "Upcoming Feb 25, 5:00 PM Women's · Wisconsin at Michigan State | ",
 "Upcoming Feb 28 Women's · Wisconsin at Penn State | ",
 "Upcoming Mar 3 Women's · Wisconsin at Big Ten Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Wisconsin at Badger Classic | 1st, 15 points",
 "Final Sep 19 Women's · Wisconsin at John McNichols Invitational | 16th, 422 points",
 "Final Sep 25 Women's · Wisconsin at Sean Earl Lakefront Invitational | 15th, 371 points",
 "Final Oct 9 Women's · Wisconsin at Nuttycombe Wisconsin Invitational Presented by Under Armour | 33rd, 810 Points",
 "Upcoming Oct 30, 10:35 AM Women's · Wisconsin at Big Ten Championships | ",
 "Upcoming Nov 13 Women's · Wisconsin at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Wisconsin at NCAA | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Wisconsin at Badger Classic | 1st, 15 points",
 "Final Sep 19 Men's · Wisconsin at John McNichols Invitational | 9th, 267 points",
 "Final Sep 25 Men's · Wisconsin at Sean Earl Lakefront Invitational | 8th, 201 points",
 "Final Oct 9 Men's · Wisconsin at Nuttycombe Wisconsin Invitational Presented by Under Armour | 9th, 356 Points",
 "Upcoming Oct 30, 11:35 AM Men's · Wisconsin at Big Ten Championships | ",
 "Upcoming Nov 13 Men's · Wisconsin at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Wisconsin at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 6 Wisconsin vs Notre Dame | L, 13-41",
 "Final Sep 12 Wisconsin vs Western Illinois | W, 36-9",
 "Final Sep 19 Wisconsin vs Eastern Michigan | W, 54-10",
 "Final Sep 26 Wisconsin at Penn State | W, 24-20",
 "Final Oct 3 Wisconsin vs Michigan State | W, 31-3",
 "Upcoming Oct 17, 6:30 PM Wisconsin at UCLA | ",
 "Upcoming Oct 24, 6:30 PM Wisconsin vs USC | ",
 "Upcoming Oct 31 Wisconsin at Iowa | ",
 "Upcoming Nov 7 Wisconsin vs Rutgers | ",
 "Upcoming Nov 14 Wisconsin at Maryland | ",
 "Upcoming Nov 21 Wisconsin at Purdue | ",
 "Upcoming Nov 27, 6:30 PM Wisconsin vs Minnesota | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Wisconsin at Cougar Classic | 15th of 18",
 "Final Sep 13 Women's · Wisconsin at Badger Invitational | 3rd of 16",
 "Final Sep 26 Women's · Wisconsin at Fighting Irish Classic | 3rd of 14",
 "Final Oct 12 Women's · Wisconsin at Illini Invitational at Medinah | 12th of 15",
 "Upcoming Oct 19 Women's · Wisconsin at Dale McNamara Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Wisconsin at J.T. Poston Invitational | 8th of 17",
 "Final Sep 21 Men's · Wisconsin at Bush Cup | Match play: 0-0-1",
 "Final Sep 27 Men's · Wisconsin at Badger Invitational | T3rd of 19",
 "Final Oct 12 Men's · Wisconsin at Moraine Intercollegiate | 3rd of 16",
 "Upcoming Oct 17 Men's · Wisconsin at Fallen Oak Collegiate Invitational | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Wisconsin vs Robert Morris | W, 4-2",
 "Final Oct 3 Men's · Wisconsin vs Robert Morris | W, 1-0",
 "Final Oct 9 Men's · Wisconsin at Minnesota State | W, 4-0",
 "Final Oct 10 Men's · Wisconsin at Minnesota State | W, 4-1",
 "Upcoming Oct 24, 5:00 PM Men's · Wisconsin at Western Michigan (Exhibition) | ",
 "Upcoming Oct 30 Men's · Wisconsin vs Notre Dame | ",
 "Upcoming Oct 31 Men's · Wisconsin vs Notre Dame | ",
 "Upcoming Nov 5 Men's · Wisconsin at Minnesota | ",
 "Upcoming Nov 7 Men's · Wisconsin at Minnesota | ",
 "Upcoming Nov 13 Men's · Wisconsin vs Ohio State | ",
 "Upcoming Nov 14 Men's · Wisconsin vs Ohio State | ",
 "Upcoming Nov 20 Men's · Wisconsin vs Penn State | ",
 "Upcoming Nov 21 Men's · Wisconsin vs Penn State | ",
 "Upcoming Nov 28, 6:00 PM Men's · Wisconsin vs Canisius | ",
 "Upcoming Nov 29, 5:00 PM Men's · Wisconsin vs Canisius | ",
 "Upcoming Dec 4 Men's · Wisconsin at Michigan | ",
 "Upcoming Dec 5 Men's · Wisconsin at Michigan | ",
 "Upcoming Dec 10, 7:00 PM Men's · Wisconsin vs Omaha | ",
 "Upcoming Dec 11, 8:00 PM Men's · Wisconsin vs Omaha | ",
 "Upcoming Dec 29, 7:30 PM Men's · Wisconsin vs Northern Michigan | ",
 "Upcoming Dec 30, 7:30 PM Men's · Wisconsin vs Kwik Trip Holiday Face-Off (Arizona State, UMass) | ",
 "Upcoming Jan 8 Men's · Wisconsin vs Michigan State | ",
 "Upcoming Jan 9 Men's · Wisconsin vs Michigan State | ",
 "Upcoming Jan 21 Men's · Wisconsin at Penn State | ",
 "Upcoming Jan 22 Men's · Wisconsin at Penn State | ",
 "Upcoming Jan 29 Men's · Wisconsin at Ohio State | ",
 "Upcoming Jan 30 Men's · Wisconsin at Ohio State | ",
 "Upcoming Feb 5 Men's · Wisconsin vs Minnesota | ",
 "Upcoming Feb 7 Men's · Wisconsin vs Minnesota | ",
 "Upcoming Feb 12 Men's · Wisconsin at Michigan State | ",
 "Upcoming Feb 13 Men's · Wisconsin at Michigan State | ",
 "Upcoming Feb 18 Men's · Wisconsin vs Michigan | ",
 "Upcoming Feb 20 Men's · Wisconsin vs Michigan | ",
 "Upcoming Mar 4, 6:00 PM Men's · Wisconsin at Notre Dame | ",
 "Upcoming Mar 5, 6:00 PM Men's · Wisconsin at Notre Dame | ",
 "Upcoming Mar 25 Men's · Wisconsin at NCAA Regionals | ",
 "Upcoming Apr 8 Men's · Wisconsin at NCAA Frozen Four | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · Wisconsin at St. Lawrence University | W, 6-2",
 "Final Sep 26 Women's · Wisconsin at St. Lawrence University | W, 6-0",
 "Final Oct 1 Women's · Wisconsin vs Boston University | W, 7-0",
 "Final Oct 2 Women's · Wisconsin vs Boston University | W, 4-1",
 "Final Oct 9 Women's · Wisconsin at Ohio State University | L, 1-2",
 "Final Oct 10 Women's · Wisconsin at Ohio State University | L, 3-5",
 "Upcoming Oct 16, 7:00 PM Women's · Wisconsin vs Minnesota State University, Mankato | ",
 "Upcoming Oct 17, 2:00 PM Women's · Wisconsin vs Minnesota State University, Mankato | ",
 "Upcoming Oct 30, 2:00 PM Women's · Wisconsin at St. Cloud State University | ",
 "Upcoming Oct 31, 1:00 PM Women's · Wisconsin at St. Cloud State University | ",
 "Upcoming Nov 14, 2:00 PM Women's · Wisconsin vs University of St. Thomas | ",
 "Upcoming Nov 15, 1:00 PM Women's · Wisconsin vs University of St. Thomas | ",
 "Upcoming Nov 21, 2:00 PM Women's · Wisconsin vs Bemidji State University | ",
 "Upcoming Nov 22, 12:00 PM Women's · Wisconsin vs Bemidji State University | ",
 "Upcoming Nov 28, 2:00 PM Women's · Wisconsin vs Union College | ",
 "Upcoming Nov 29, 1:00 PM Women's · Wisconsin vs Union College | ",
 "Upcoming Dec 4, 6:00 PM Women's · Wisconsin at University of Minnesota | ",
 "Upcoming Dec 5, 7:00 PM Women's · Wisconsin at University of Minnesota | ",
 "Upcoming Dec 11, 5:00 PM Women's · Wisconsin vs University of Minnesota Duluth | ",
 "Upcoming Dec 12, 2:00 PM Women's · Wisconsin vs University of Minnesota Duluth | ",
 "Upcoming Jan 8, 2:00 PM Women's · Wisconsin at University of St. Thomas | ",
 "Upcoming Jan 9, 2:00 PM Women's · Wisconsin at University of St. Thomas | ",
 "Upcoming Jan 15, 3:00 PM Women's · Wisconsin at Minnesota State University, Mankato | ",
 "Upcoming Jan 16, 2:00 PM Women's · Wisconsin at Minnesota State University, Mankato | ",
 "Upcoming Jan 22, 7:00 PM Women's · Wisconsin vs St. Cloud State University | ",
 "Upcoming Jan 23 Women's · Wisconsin vs St. Cloud State University | ",
 "Upcoming Jan 29, 12:00 PM Women's · Wisconsin at Bemidji State University | ",
 "Upcoming Jan 30, 12:00 PM Women's · Wisconsin at Bemidji State University | ",
 "Upcoming Feb 6 Women's · Wisconsin vs University of Minnesota | ",
 "Upcoming Feb 7 Women's · Wisconsin vs University of Minnesota | ",
 "Upcoming Feb 12, 3:00 PM Women's · Wisconsin at University of Minnesota Duluth | ",
 "Upcoming Feb 13, 2:00 PM Women's · Wisconsin at University of Minnesota Duluth | ",
 "Upcoming Feb 18 Women's · Wisconsin vs Ohio State University | ",
 "Upcoming Feb 20 Women's · Wisconsin vs Ohio State University | ",
 "Upcoming Feb 26 Women's · Wisconsin vs WCHA | ",
 "Upcoming Feb 27 Women's · Wisconsin vs WCHA | ",
 "Upcoming Feb 28 Women's · Wisconsin vs WCHA | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 3 Women's · Wisconsin at Milwaukee River Challenge | Completed",
 "Final Oct 10 Women's · Wisconsin at Eastern Michigan | Completed",
 "Upcoming Oct 18 Women's · Wisconsin at Head of the Charles | ",
 "Upcoming Oct 31 Women's · Wisconsin at Minnesota | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Final Oct 3 Lightweight · Wisconsin at Milwaukee River Challenge | Completed",
 "Final Oct 10 Lightweight · Wisconsin at Eastern Michigan | Completed",
 "Upcoming Oct 18 Lightweight · Wisconsin at Head of the Charles | ",
 "Upcoming Oct 31 Lightweight · Wisconsin at Minnesota | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Wisconsin vs TCU | L, 0-1",
 "Final Aug 19 Women's · Wisconsin vs BYU | W, 1-0",
 "Final Aug 23 Women's · Wisconsin vs Marquette | T, 1-1",
 "Final Aug 30 Women's · Wisconsin vs UIC | W, 5-1",
 "Final Sep 3 Women's · Wisconsin at Milwaukee | W, 2-0",
 "Final Sep 6 Women's · Wisconsin at Central Michigan | W, 6-2",
 "Final Sep 10 Women's · Wisconsin at Illinois | T, 0-0",
 "Final Sep 13 Women's · Wisconsin vs Northwestern | W, 2-0",
 "Final Sep 20 Women's · Wisconsin vs Indiana | W, 2-0",
 "Final Sep 24 Women's · Wisconsin at Maryland | W, 1-0",
 "Final Sep 27 Women's · Wisconsin at Rutgers | L, 1-3",
 "Final Oct 4 Women's · Wisconsin at Nebraska | T, 0-0",
 "Final Oct 8 Women's · Wisconsin vs Ohio State | L, 2-3",
 "Final Oct 11 Women's · Wisconsin at Michigan | L, 0-1",
 "Upcoming Oct 18, 1:00 PM Women's · Wisconsin vs Minnesota | ",
 "Upcoming Oct 22, 7:00 PM Women's · Wisconsin vs Oregon | ",
 "Upcoming Oct 25, 1:00 PM Women's · Wisconsin vs Washington | ",
 "Upcoming Oct 30, 7:00 PM Women's · Wisconsin at Iowa | ",
 "Upcoming Nov 4 Women's · Wisconsin at Big Ten Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Wisconsin vs Saint Mary's (CA) | W, 5-0",
 "Final Aug 23 Men's · Wisconsin vs Oakland | W, 5-0",
 "Final Aug 27 Men's · Wisconsin at Western Michigan | W, 1-0",
 "Final Aug 31 Men's · Wisconsin vs Marquette | W, 3-1",
 "Final Sep 5 Men's · Wisconsin at Portland | W, 2-1",
 "Final Sep 11 Men's · Wisconsin vs Ohio State | T, 1-1",
 "Final Sep 18 Men's · Wisconsin at Maryland | L, 0-1",
 "Final Sep 22 Men's · Wisconsin vs Indiana | T, 1-1",
 "Final Sep 25 Men's · Wisconsin at Michigan State | L, 0-3",
 "Final Oct 2 Men's · Wisconsin at Washington | T, 0-0",
 "Final Oct 6 Men's · Wisconsin vs Lakeland | W, 8-0",
 "Final Oct 10 Men's · Wisconsin vs Rutgers | W, 1-0",
 "Upcoming Oct 16, 7:00 PM Men's · Wisconsin vs UCLA | ",
 "Upcoming Oct 20, 5:00 PM Men's · Wisconsin vs Evansville | ",
 "Upcoming Oct 24, 6:00 PM Men's · Wisconsin at Penn State | ",
 "Upcoming Oct 30, 7:00 PM Men's · Wisconsin vs Michigan | ",
 "Upcoming Nov 4, 7:00 PM Men's · Wisconsin at Northwestern | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 17, 12:00 PM Women's · Wisconsin vs University of Notre Dame | ",
 "Upcoming Nov 6, 5:00 PM Women's · Wisconsin vs University of Minnesota | ",
 "Upcoming Nov 18 Women's · Wisconsin at Texas Invitational | ",
 "Upcoming Nov 19 Women's · Wisconsin at SMU Invitational | ",
 "Upcoming Dec 2 Women's · Wisconsin at U.S. Open Championships | ",
 "Upcoming Dec 9 Women's · Wisconsin at USA Diving Winter National Championships | ",
 "Upcoming Jan 2, 12:00 PM Women's · Wisconsin at UC San Diego | ",
 "Upcoming Jan 16, 4:00 PM Women's · Wisconsin at Northwestern University | ",
 "Upcoming Feb 5 Women's · Wisconsin at Badger Invitational | ",
 "Upcoming Feb 17 Women's · Wisconsin at Big Ten Championships | ",
 "Upcoming Feb 28 Women's · Wisconsin vs Women's Last Chance | ",
 "Upcoming Mar 5 Women's · Wisconsin at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 Women's · Wisconsin at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Oct 17, 12:00 PM Men's · Wisconsin vs University of Notre Dame | ",
 "Upcoming Nov 6, 12:00 PM Men's · Wisconsin vs University of Minnesota | ",
 "Upcoming Nov 18 Men's · Wisconsin at Texas Invitational | ",
 "Upcoming Nov 19 Men's · Wisconsin at SMU Invitational | ",
 "Upcoming Dec 2 Men's · Wisconsin at U.S. Open Championships | ",
 "Upcoming Dec 5, 12:00 PM Men's · Wisconsin vs Purdue University | ",
 "Upcoming Dec 9 Men's · Wisconsin at USA Diving Winter National Championships | ",
 "Upcoming Jan 2, 12:00 PM Men's · Wisconsin at UC San Diego | ",
 "Upcoming Jan 16, 4:00 PM Men's · Wisconsin at Northwestern University | ",
 "Upcoming Feb 5 Men's · Wisconsin at Badger Invitational | ",
 "Upcoming Feb 24 Men's · Wisconsin at Big Ten Championships | ",
 "Upcoming Mar 5 Men's · Wisconsin at NCAA Zone Diving Championships | ",
 "Upcoming Mar 24 Men's · Wisconsin at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Wisconsin at Milwaukee Tennis Classic | Completed",
 "Final Sep 19 Women's · Wisconsin at ITA All-Americans | Completed",
 "Final Oct 8 Women's · Wisconsin at ITA Regionals | Completed",
 "Upcoming Oct 23 Women's · Wisconsin at Rome Invite | ",
 "Upcoming Oct 27 Women's · Wisconsin at PTT Knoxville | ",
 "Upcoming Nov 5 Women's · Wisconsin at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Wisconsin at ITA Conference Masters | ",
 "Upcoming Nov 17 Women's · Wisconsin at NCAA SIngles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Wisconsin at ITA Men's All-American Championships | Completed",
 "Final Sep 25 Men's · Wisconsin at Fighting Irish Mini Duals | Completed",
 "Final Oct 2 Men's · Wisconsin at MSU Invite at Hope College | Completed",
 "Today Oct 14 Men's · Wisconsin at ITA Regional Championships | ",
 "Upcoming Oct 29 Men's · Wisconsin at Big Ten Individual Championships | ",
 "Upcoming Nov 5 Men's · Wisconsin at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Wisconsin at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Men's · Wisconsin at NCAA Individual Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 14 Wisconsin vs Butler (Exhibition) | W, 3-0",
 "Final Aug 21 Wisconsin vs Kentucky | L, 0-3",
 "Final Aug 22 Wisconsin vs Louisville | W, 3-0",
 "Final Aug 28 Wisconsin vs Stanford | L, 1-3",
 "Final Aug 30 Wisconsin at Pittsburgh | L, 0-3",
 "Final Sep 2 Wisconsin vs Florida | W, 3-2",
 "Final Sep 3 Wisconsin vs Auburn | W, 3-0",
 "Final Sep 11 Wisconsin at Texas A&M | W, 3-2",
 "Final Sep 13 Wisconsin at Texas | L, 1-3",
 "Final Sep 17 Wisconsin vs Marquette | W, 3-1",
 "Final Sep 18 Wisconsin vs Milwaukee | W, 3-1",
 "Final Sep 24 Wisconsin vs Oregon | W, 3-1",
 "Final Sep 27 Wisconsin at Purdue | W, 3-0",
 "Final Oct 1 Wisconsin vs Indiana | W, 3-2",
 "Final Oct 4 Wisconsin at Minnesota | W, 3-1",
 "Final Oct 8 Wisconsin at Illinois | W, 3-0",
 "Final Oct 10 Wisconsin at Nebraska | L, 0-3",
 "Upcoming Oct 16, 7:00 PM Wisconsin vs Maryland | ",
 "Upcoming Oct 18, 1:00 PM Wisconsin at Iowa | ",
 "Upcoming Oct 23, 8:00 PM Wisconsin vs Washington | ",
 "Upcoming Oct 25, 12:00 PM Wisconsin vs Michigan | ",
 "Upcoming Oct 30, 5:00 PM Wisconsin at USC | ",
 "Upcoming Nov 1, 4:00 PM Wisconsin at UCLA | ",
 "Upcoming Nov 5, 7:00 PM Wisconsin vs Michigan State | ",
 "Upcoming Nov 8 Wisconsin vs Penn State | ",
 "Upcoming Nov 12, 5:00 PM Wisconsin at Rutgers | ",
 "Upcoming Nov 13, 6:00 PM Wisconsin at Ohio State | ",
 "Upcoming Nov 17, 7:00 PM Wisconsin vs Northwestern | ",
 "Upcoming Nov 20 Wisconsin at 2026 Big Ten Volleyball Tournament | ",
 "Upcoming Dec 3 Wisconsin at NCAA 1st & 2nd Round | ",
 "Upcoming Dec 10 Wisconsin at NCAA Regionals | ",
 "Upcoming Dec 17 Wisconsin at NCAA National Semifinals | ",
 "Upcoming Dec 20 Wisconsin at NCAA National Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Wisconsin vs Bloomsburg University | ",
 "Upcoming Nov 7 Wisconsin at Michigan State Open | ",
 "Upcoming Nov 9 Wisconsin vs Army | ",
 "Upcoming Nov 14, 12:00 PM Wisconsin at University of Pennsylvania | ",
 "Upcoming Nov 14, 2:00 PM Wisconsin at North Dakota State University | ",
 "Upcoming Nov 20 Wisconsin vs Princeton University | ",
 "Upcoming Dec 5 Wisconsin at Cougar Clash | ",
 "Upcoming Dec 19 Wisconsin at Utah Valley University | ",
 "Upcoming Dec 21 Wisconsin at Arizona State University | ",
 "Upcoming Dec 29 Wisconsin at Midlands Championships | ",
 "Upcoming Jan 2 Wisconsin at Soldier Salute | ",
 "Upcoming Jan 9 Wisconsin at University of Michigan | ",
 "Upcoming Jan 15 Wisconsin vs University of Minnesota | ",
 "Upcoming Jan 22 Wisconsin vs Rutgers University | ",
 "Upcoming Jan 24 Wisconsin at Penn State University | ",
 "Upcoming Jan 30 Wisconsin vs University of Iowa | ",
 "Upcoming Feb 5 Wisconsin at Indiana University | ",
 "Upcoming Feb 7 Wisconsin at Michigan State University | ",
 "Upcoming Feb 14 Wisconsin vs University of Illinois | ",
 "Upcoming Feb 21 Wisconsin vs University of Northern Iowa | ",
 "Upcoming Mar 6 Wisconsin at 2027 Big Ten Championships | ",
 "Upcoming Mar 18 Wisconsin at 2027 NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: each team's page with its own TFRRS team page (Illinois's
// split); each event keeps its own race.
{
  fromTfrrs(WISCONSIN_TFRRS_TEAMS);
  const xc=[...parse('Cross Country','womens-cross-country'),...parse('Cross Country','mens-cross-country')].filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  // Each team's card lists only its own races (the first preview showed the
  // women's card with the men's 8K too).
  assert.ok(xc.every(e=>e.results.length&&e.results.every(row=>row.group.startsWith(e.team_label))),'each team keeps its own races');
  assert.deepEqual(xc.map(e=>[e.title,e.headline,Boolean(e.meet_results_verified)]),[["Women's · Wisconsin at Badger Classic","Women's team: 1st · 15 pts",true],["Women's · Wisconsin at John McNichols Invitational","Women's team: 16th · 422 pts",true],["Women's · Wisconsin at Sean Earl Lakefront Invitational","Women's team: 15th · 371 pts",true],["Women's · Wisconsin at Nuttycombe Wisconsin Invitational Presented by Under Armour","Women's team: 33rd · 810 pts",true],["Men's · Wisconsin at Badger Classic","Men's team: 1st · 15 pts",true],["Men's · Wisconsin at John McNichols Invitational","Men's team: 9th · 267 pts",true],["Men's · Wisconsin at Sean Earl Lakefront Invitational","Men's team: 8th · 201 pts",true],["Men's · Wisconsin at Nuttycombe Wisconsin Invitational Presented by Under Armour","Men's team: 9th · 356 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Records equal the published ones: football 4-1 (2-0), volleyball 11-5
// (5-1), women's soccer 7-4-3 (3-3-2), men's soccer 7-2-3 (1-2-3), men's
// hockey 4-0 (0-0), women's hockey 4-2 (WCHA 0-2).
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?[own.conference.name,own.conference.text].join(' '):null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Hockey','mens-ice-hockey'],['Hockey','womens-ice-hockey']].map(([sport,slug])=>records(sport,slug)),[["4-1","Big Ten 2-0"],["11-5","Big Ten 5-1"],["7-4-3","Big Ten 3-3-2"],["7-2-3","Big Ten 1-2-3"],["4-0",null],["4-2","WCHA 0-2"]]);
}

// Tennis: an archive story must name its tournament in its address: the
// Sep 23 "...-continues-fall-season-at-fighting-irish-mini-duals" story is
// not the men's ITA All-American Championships' (Sep 19-27), and the women's
// "...-set-for-ita-all-americans" is the women's.
{
  const saved=url=>{const {pathname}=new URL(url),news=pathname.match(/^\/news\/(\d+)\/(\d+)\/(\d+)\/([^/?#]+)/),archive=pathname.match(/^\/sports\/([^/]+)\/(?:archives|news\/?$)/);for(const name of news?[`story-${news[1]}-${news[2]}-${news[3]}-${news[4].slice(0,40)}.html.gz`,`recap-${news[1]}-${news[2]}-${news[3]}-${news[4].slice(0,40)}.html.gz`]:archive?[`${archive[1]}-archives.html.gz`]:[]){try{return fixture(name);}catch{}}return null;};
  const listed=[];
  for(const slug of ['womens-tennis','mens-tennis']){
    const archive=`https://uwbadgers.com/sports/${slug}/archives`;recapFixtures.set(archive,saved(archive));
    for(const [path] of saved(archive).replace(/\\u002F/gi,'/').matchAll(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)){const body=saved(`https://uwbadgers.com${path}`);if(body)recapFixtures.set(`https://uwbadgers.com${path}`,body);}
    for(const event of parse('Tennis',slug).filter(e=>e.status==='Final')){if(worker.wisconsinHandlers.isFinalWithoutStory(event))await worker.wisconsinHandlers.attachArchiveStory(event);listed.push([event.title,event.recap_url?.replace(/^.*\/news\//,'')||null]);}
  }
  assert.deepEqual(listed,[["Women's · Wisconsin at Milwaukee Tennis Classic","2026/9/16/womens-tennis-badgers-battle-through-milwaukee-tennis-classic"],["Women's · Wisconsin at ITA All-Americans","2026/9/23/womens-tennis-set-for-ita-all-americans"],["Women's · Wisconsin at ITA Regionals","2026/10/13/womens-tennis-badgers-compete-at-ita-midwest-regionals"],["Men's · Wisconsin at ITA Men's All-American Championships",null],["Men's · Wisconsin at Fighting Irish Mini Duals",null],["Men's · Wisconsin at MSU Invite at Hope College",null]]);
  recapFixtures.clear();requests.length=0;
}

// A page whose games this season are all past without a published result
// (softball's fall exhibitions, Sep 11-Oct 7) is a valid empty schedule, not
// a failed source (the first preview answered 502).
{
  const raw=fixture('softball-schedule.html.gz'),url=page('softball');
  const events=worker.wisconsinHandlers.parseSchedule(raw,school,'Softball',url,now);
  assert.deepEqual([events,worker.wisconsinHandlers.isEmptySchedule(events)],[[],true]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Wisconsin module checks passed');
