import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {indianaSchool} from '../src/schools/indiana.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='indiana');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,indianaHandlers,attachOfficialMeetResults,decodeHtml,schoolModule};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/indiana-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit iuhoosiers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['indiana'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',indianaSchool.scheduleUrls],['roster',indianaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('indiana|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'iuhoosiers.com',`${key} must stay on iuhoosiers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://iuhoosiers.com/sports/baseball/schedule"],"roster":["https://iuhoosiers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://iuhoosiers.com/sports/mens-basketball/schedule","https://iuhoosiers.com/sports/womens-basketball/schedule"],"roster":["https://iuhoosiers.com/sports/mens-basketball/roster","https://iuhoosiers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://iuhoosiers.com/sports/cross-country/schedule"],"roster":["https://iuhoosiers.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://iuhoosiers.com/sports/field-hockey/schedule"],"roster":["https://iuhoosiers.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://iuhoosiers.com/sports/football/schedule"],"roster":["https://iuhoosiers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://iuhoosiers.com/sports/womens-golf/schedule","https://iuhoosiers.com/sports/mens-golf/schedule"],"roster":["https://iuhoosiers.com/sports/womens-golf/roster","https://iuhoosiers.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://iuhoosiers.com/sports/womens-rowing/schedule"],"roster":["https://iuhoosiers.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://iuhoosiers.com/sports/womens-soccer/schedule","https://iuhoosiers.com/sports/mens-soccer/schedule"],"roster":["https://iuhoosiers.com/sports/womens-soccer/roster","https://iuhoosiers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://iuhoosiers.com/sports/softball/schedule"],"roster":["https://iuhoosiers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://iuhoosiers.com/sports/womens-swimming-and-diving/schedule","https://iuhoosiers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://iuhoosiers.com/sports/womens-swimming-and-diving/roster","https://iuhoosiers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://iuhoosiers.com/sports/womens-tennis/schedule","https://iuhoosiers.com/sports/mens-tennis/schedule"],"roster":["https://iuhoosiers.com/sports/womens-tennis/roster","https://iuhoosiers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://iuhoosiers.com/sports/track-and-field/schedule"],"roster":["https://iuhoosiers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://iuhoosiers.com/sports/womens-volleyball/schedule"],"roster":["https://iuhoosiers.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://iuhoosiers.com/sports/womens-water-polo/schedule"],"roster":["https://iuhoosiers.com/sports/womens-water-polo/roster"],"combined":false},"Wrestling":{"schedule":["https://iuhoosiers.com/sports/wrestling/schedule"],"roster":["https://iuhoosiers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'indiana|"+sport+"':"),`${sport} routes must live in the Indiana module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://iuhoosiers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.indianaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=indiana)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 26, 1:30 PM Indiana vs UNCW | ",
 "Upcoming Feb 27, 6:00 PM Indiana vs Wofford | ",
 "Upcoming Feb 28, 10:30 AM Indiana vs Austin Peay | ",
 "Upcoming Mar 19 Indiana vs Nebraska | ",
 "Upcoming Mar 20 Indiana vs Nebraska | ",
 "Upcoming Mar 21 Indiana vs Nebraska | ",
 "Upcoming Mar 26 Indiana at Rutgers | ",
 "Upcoming Mar 27 Indiana at Rutgers | ",
 "Upcoming Mar 28 Indiana at Rutgers | ",
 "Upcoming Apr 2 Indiana at Minnesota | ",
 "Upcoming Apr 3 Indiana at Minnesota | ",
 "Upcoming Apr 4 Indiana at Minnesota | ",
 "Upcoming Apr 9 Indiana vs Oregon | ",
 "Upcoming Apr 10 Indiana vs Oregon | ",
 "Upcoming Apr 11 Indiana vs Oregon | ",
 "Upcoming Apr 16 Indiana vs Penn State | ",
 "Upcoming Apr 17 Indiana vs Penn State | ",
 "Upcoming Apr 18 Indiana vs Penn State | ",
 "Upcoming Apr 23 Indiana at USC | ",
 "Upcoming Apr 24 Indiana at USC | ",
 "Upcoming Apr 25 Indiana at USC | ",
 "Upcoming Apr 30 Indiana vs Purdue | ",
 "Upcoming May 1 Indiana vs Purdue | ",
 "Upcoming May 2 Indiana vs Purdue | ",
 "Upcoming May 7 Indiana at Michigan State | ",
 "Upcoming May 8 Indiana at Michigan State | ",
 "Upcoming May 9 Indiana at Michigan State | ",
 "Upcoming May 14 Indiana at Ohio State | ",
 "Upcoming May 15 Indiana at Ohio State | ",
 "Upcoming May 16 Indiana at Ohio State | ",
 "Upcoming May 20 Indiana vs Maryland | ",
 "Upcoming May 21 Indiana vs Maryland | ",
 "Upcoming May 22 Indiana vs Maryland | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 11, 6:30 PM Men's · Indiana at Butler (Exhibition) | ",
 "Upcoming Oct 18, 5:00 PM Men's · Indiana vs North Carolina (Exhibition) | ",
 "Upcoming Oct 25, 4:00 PM Men's · Indiana vs Western Kentucky (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Indiana vs Eastern Illinois | ",
 "Upcoming Nov 5, 6:00 PM Men's · Indiana vs Bellarmine | ",
 "Upcoming Nov 9, 6:30 PM Men's · Indiana vs Syracuse | ",
 "Upcoming Nov 12, 6:30 PM Men's · Indiana vs Tennessee Tech | ",
 "Upcoming Nov 17, 7:30 PM Men's · Indiana vs Arkansas | ",
 "Upcoming Nov 20, 8:00 PM Men's · Indiana vs Kentucky | ",
 "Upcoming Nov 24, 7:00 PM Men's · Indiana vs Jacksonville | ",
 "Upcoming Nov 27, 6:00 PM Men's · Indiana vs Bowling Green | ",
 "Upcoming Dec 1, 8:00 PM Men's · Indiana vs Rutgers | ",
 "Upcoming Dec 3, 6:00 PM Men's · Indiana vs Western Illinois | ",
 "Upcoming Dec 7, 7:00 PM Men's · Indiana at Iowa | ",
 "Upcoming Dec 12, 12:00 PM Men's · Indiana vs UCF | ",
 "Upcoming Dec 18, 6:00 PM Men's · Indiana vs Missouri | ",
 "Upcoming Dec 22, 7:00 PM Men's · Indiana vs FDU | ",
 "Upcoming Jan 2, 2:00 PM Men's · Indiana vs USC | ",
 "Upcoming Jan 6, 10:30 PM Men's · Indiana at Oregon | ",
 "Upcoming Jan 9, 3:00 PM Men's · Indiana at Washington | ",
 "Upcoming Jan 12, 6:00 PM Men's · Indiana vs Maryland | ",
 "Upcoming Jan 16, 1:00 PM Men's · Indiana vs Michigan | ",
 "Upcoming Jan 20, 8:30 PM Men's · Indiana at Minnesota | ",
 "Upcoming Jan 24, 12:00 PM Men's · Indiana vs Illinois | ",
 "Upcoming Jan 27, 7:00 PM Men's · Indiana at Northwestern | ",
 "Upcoming Jan 30, 12:00 PM Men's · Indiana vs UCLA | ",
 "Upcoming Feb 2, 6:00 PM Men's · Indiana at Penn State | ",
 "Upcoming Feb 6 Men's · Indiana at Nebraska | ",
 "Upcoming Feb 9, 7:30 PM Men's · Indiana vs Northwestern | ",
 "Upcoming Feb 13, 12:00 PM Men's · Indiana at Maryland | ",
 "Upcoming Feb 16, 7:00 PM Men's · Indiana vs Purdue | ",
 "Upcoming Feb 19, 8:00 PM Men's · Indiana at Wisconsin | ",
 "Upcoming Feb 23, 7:00 PM Men's · Indiana vs Michigan State | ",
 "Upcoming Feb 28, 3:45 PM Men's · Indiana vs Ohio State | ",
 "Upcoming Mar 5, 8:00 PM Men's · Indiana at Purdue | ",
 "Upcoming Mar 9 Men's · Indiana at Big Ten Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28 Women's · Indiana vs Marian (Exhibition) | ",
 "Upcoming Nov 3 Women's · Indiana vs FGCU | ",
 "Upcoming Nov 6 Women's · Indiana vs Southern Illinois | ",
 "Upcoming Nov 9 Women's · Indiana vs Bradley | ",
 "Upcoming Nov 13 Women's · Indiana vs Samford | ",
 "Upcoming Nov 15 Women's · Indiana vs Milwaukee | ",
 "Upcoming Nov 18 Women's · Indiana vs Coastal Carolina | ",
 "Upcoming Nov 22 Women's · Indiana vs Southern Indiana | ",
 "Upcoming Nov 27, 11:30 AM Women's · Indiana vs Mississippi State | ",
 "Upcoming Nov 28, 1:30 PM Women's · Indiana vs Georgia Tech | ",
 "Upcoming Dec 2 Women's · Indiana vs Boston College | ",
 "Upcoming Dec 5 Women's · Indiana at Northwestern | ",
 "Upcoming Dec 9 Women's · Indiana vs Northern Kentucky | ",
 "Upcoming Dec 13 Women's · Indiana vs Illinois State | ",
 "Upcoming Dec 20 Women's · Indiana vs Florida State | ",
 "Upcoming Dec 29 Women's · Indiana vs Rutgers | ",
 "Upcoming Jan 2 Women's · Indiana at Minnesota | ",
 "Upcoming Jan 5 Women's · Indiana vs Maryland | ",
 "Upcoming Jan 8 Women's · Indiana vs UCLA | ",
 "Upcoming Jan 12 Women's · Indiana at Penn State | ",
 "Upcoming Jan 17 Women's · Indiana at Iowa | ",
 "Upcoming Jan 24 Women's · Indiana at Michigan State | ",
 "Upcoming Jan 27 Women's · Indiana vs USC | ",
 "Upcoming Jan 31 Women's · Indiana vs Purdue | ",
 "Upcoming Feb 3 Women's · Indiana vs Ohio State | ",
 "Upcoming Feb 7 Women's · Indiana at Washington | ",
 "Upcoming Feb 10 Women's · Indiana at Oregon | ",
 "Upcoming Feb 14 Women's · Indiana vs Wisconsin | ",
 "Upcoming Feb 17 Women's · Indiana at Purdue | ",
 "Upcoming Feb 21 Women's · Indiana vs Illinois | ",
 "Upcoming Feb 24 Women's · Indiana at Michigan | ",
 "Upcoming Feb 27 Women's · Indiana vs Nebraska | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Indiana at Sam Bell Invitational | 2nd (M), 1st (W)",
 "Final Sep 19 Indiana at John McNichols Invitational | 23rd (M), 12th (W)",
 "Final Oct 2 Indiana at Notre Dame Joe Piane Invitational | 9th (M), 4th (W)",
 "Upcoming Oct 16 Indiana at Indiana State Pre-Nationals | ",
 "Upcoming Oct 30 Indiana at Big Ten Championships | ",
 "Upcoming Nov 13 Indiana at NCAA Grat Lakes Regional | ",
 "Upcoming Nov 21 Indiana at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 Indiana vs Miami (Ohio) | L, 1-2",
 "Final Aug 30 Indiana at Louisville | L, 1-2",
 "Final Sep 4 Indiana vs New Hampshire | W, 4-0",
 "Final Sep 7 Indiana vs Central Michigan | W, 5-0",
 "Final Sep 11 Indiana vs Cornell | W, 2-1",
 "Final Sep 13 Indiana at Ball State | W, 7-1",
 "Final Sep 18 Indiana at Iowa | W, 3-1",
 "Final Sep 20 Indiana at Iowa | L, 1-2",
 "Final Sep 26 Indiana vs Michigan | W, 1-0",
 "Final Oct 2 Indiana at Michigan State | W, 1-0",
 "Final Oct 4 Indiana at Ohio State | W, 2-1",
 "Upcoming Oct 11, 12:00 PM Indiana vs Ohio | ",
 "Upcoming Oct 16, 3:00 PM Indiana vs Northwestern | ",
 "Upcoming Oct 23, 3:00 PM Indiana vs Penn State | ",
 "Upcoming Oct 25, 12:00 PM Indiana vs Maryland | ",
 "Upcoming Oct 30, 12:00 PM Indiana at Rutgers | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Indiana vs North Texas | W, 52-16",
 "Final Sep 12 Indiana vs Howard | W, 55-0",
 "Final Sep 19 Indiana vs Western Kentucky | W, 38-0",
 "Final Sep 25 Indiana vs Northwestern | W, 29-23",
 "Final Oct 3 Indiana at Rutgers | W, 47-15",
 "Upcoming Oct 10, 12:00 PM Indiana at Nebraska | ",
 "Upcoming Oct 17 Indiana vs Ohio State | ",
 "Upcoming Oct 24 Indiana at Michigan | ",
 "Upcoming Oct 31 Indiana vs Minnesota | ",
 "Upcoming Nov 14 Indiana vs USC | ",
 "Upcoming Nov 21 Indiana at Washington | ",
 "Upcoming Nov 28 Indiana vs Purdue | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Indiana at Boilermaker Classic | T9th",
 "Final Sep 21 Women's · Indiana at Bettie Lou Evans Invitational | T3rd",
 "Final Oct 5 Women's · Indiana at The Ally | T12th",
 "Upcoming Oct 12 Women's · Indiana at Illini Women's Invitational at Medinah | ",
 "Upcoming Oct 23 Women's · Indiana at Landfall Tradition | ",
 "Upcoming Feb 1 Women's · Indiana at Paradise Invitational | ",
 "Upcoming Feb 21 Women's · Indiana at Westbrook Invitational | ",
 "Upcoming Mar 25 Women's · Indiana at PING ASU Invitational | ",
 "Upcoming Apr 5 Women's · Indiana at Olde Stone Collegiate | ",
 "Upcoming Apr 17 Women's · Indiana at Therese Hession Buckeye Invitational | ",
 "Upcoming Apr 23 Women's · Indiana at Big Ten Championships | ",
 "Upcoming May 8 Women's · Indiana at NCAA Regionals | ",
 "Upcoming May 16 Women's · Indiana at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Indiana at Visit Knoxville Collegiate | T16th",
 "Final Sep 21 Men's · Indiana at Highlands Invitational | T7th",
 "Final Sep 28 Men's · Indiana at Windon Memorial Classic | T5th",
 "Final Oct 4 Men's · Indiana at Fighting Irish Classic | 10th",
 "Final Oct 5 Men's · Indiana at Golfweek Invitational | Completed",
 "Upcoming Oct 12 Men's · Indiana at Purdue Fall Invitational | ",
 "Upcoming Feb 15 Men's · Indiana at Battle at Briar's Creek | ",
 "Upcoming Mar 7 Men's · Indiana at Colleton River Collegiate | ",
 "Upcoming Mar 15 Men's · Indiana at Johnnie-O at Sea Island | ",
 "Upcoming Mar 19 Men's · Indiana at The Schenkel Invitational | ",
 "Upcoming Mar 29 Men's · Indiana at Butler Spring Invitational | ",
 "Upcoming Apr 9 Men's · Indiana at The Kepler | ",
 "Upcoming Apr 17 Men's · Indiana at Boilermaker Invitational | ",
 "Upcoming Apr 24 Men's · Indiana at Illini Spring Invitational | ",
 "Upcoming Apr 30 Men's · Indiana at Big Ten Championships | ",
 "Upcoming May 17 Men's · Indiana at NCAA Regionals | ",
 "Upcoming May 28 Men's · Indiana at NCAA Championships | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Nov 14 Indiana at USRowing Small Boat Championships | ",
 "Upcoming Mar 16 Indiana at Spring Break Training Trip | ",
 "Upcoming Mar 20 Indiana at University of Louisville | ",
 "Upcoming Mar 27 Indiana at The Spring Regatta at Ohio State | ",
 "Upcoming Apr 2 Indiana at Ohio State Double Dual | ",
 "Upcoming Apr 17 Indiana at Big Ten Invitational | ",
 "Upcoming Apr 24 Indiana at 18th Annual Dale England Cup | ",
 "Upcoming May 15 Indiana at Big Ten Championships | ",
 "Upcoming May 28 Indiana at NCAA Rowing Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Indiana vs Hampton | W, 2-1",
 "Final Aug 16 Women's · Indiana vs Youngstown State | W, 3-1",
 "Final Aug 21 Women's · Indiana vs Bellarmine | T, 1-1",
 "Final Aug 26 Women's · Indiana at Xavier | L, 2-3",
 "Final Aug 30 Women's · Indiana vs Saint Louis | L, 0-2",
 "Final Sep 6 Women's · Indiana at Ohio | W, 3-2",
 "Final Sep 10 Women's · Indiana at Nebraska | W, 1-0",
 "Final Sep 13 Women's · Indiana vs Ohio State | L, 0-3",
 "Final Sep 20 Women's · Indiana at Wisconsin | L, 0-2",
 "Final Sep 24 Women's · Indiana vs Minnesota | L, 1-2",
 "Final Sep 27 Women's · Indiana at Northwestern | L, 0-2",
 "Final Oct 4 Women's · Indiana vs Michigan | L, 2-3",
 "Today Oct 8, 10:00 PM Women's · Indiana at UCLA | ",
 "Upcoming Oct 11, 4:00 PM Women's · Indiana at USC | ",
 "Upcoming Oct 16, 7:30 PM Women's · Indiana vs Michigan State | ",
 "Upcoming Oct 22, 7:00 PM Women's · Indiana vs Purdue | ",
 "Upcoming Oct 25, 1:00 PM Women's · Indiana vs Rutgers | ",
 "Upcoming Oct 30, 7:00 PM Women's · Indiana at Penn State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Indiana vs Notre Dame | W, 3-1",
 "Final Aug 23 Men's · Indiana vs Evansville | W, 3-0",
 "Final Aug 27 Men's · Indiana vs Butler | W, 1-0",
 "Final Aug 31 Men's · Indiana at Louisville | T, 1-1",
 "Final Sep 4 Men's · Indiana vs Cal Poly | W, 2-0",
 "Final Sep 7 Men's · Indiana vs Denver | W, 3-1",
 "Final Sep 11 Men's · Indiana at Michigan | W, 1-0",
 "Final Sep 18 Men's · Indiana vs Washington | W, 1-0",
 "Final Sep 22 Men's · Indiana at Wisconsin | T, 1-1",
 "Final Sep 25 Men's · Indiana vs Penn State | W, 2-1",
 "Final Oct 2 Men's · Indiana vs Maryland | W, 3-1",
 "Final Oct 6 Men's · Indiana vs Kentucky | W, 3-1",
 "Upcoming Oct 9, 7:30 PM Men's · Indiana vs Hanover College | ",
 "Upcoming Oct 16, 7:00 PM Men's · Indiana at Rutgers | ",
 "Upcoming Oct 20, 7:00 PM Men's · Indiana at Ohio State | ",
 "Upcoming Oct 23, 7:00 PM Men's · Indiana vs Northwestern | ",
 "Upcoming Oct 30, 10:00 PM Men's · Indiana at UCLA | ",
 "Upcoming Nov 4, 8:00 PM Men's · Indiana vs Michigan State | ",
 "Upcoming Dec 11 Men's · Indiana at 2026 NCAA College Cup | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 10, 1:00 PM Indiana vs Lakeland CC (10 Innings) | ",
 "Upcoming Oct 11, 2:00 PM Indiana vs Danville Area CC (10 Innings) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 24 Women's · Indiana at College Swimming League | Completed",
 "Upcoming Oct 9, 12:00 PM Women's · Indiana vs Texas (SCM) | ",
 "Upcoming Oct 9, 12:00 PM Women's · Indiana vs Northwestern (SCM) | ",
 "Upcoming Oct 16 Women's · Indiana at College Swimming League | ",
 "Upcoming Oct 23, 2:00 PM Women's · Indiana vs Kentucky | ",
 "Upcoming Oct 23, 2:00 PM Women's · Indiana vs USC | ",
 "Upcoming Nov 5 Women's · Indiana at College Swimming League | ",
 "Upcoming Nov 17 Women's · Indiana at Ohio State Invitational | ",
 "Upcoming Nov 17 Women's · Indiana at Tennessee Diving Invitational | ",
 "Upcoming Jan 8, 12:00 PM Women's · Indiana vs Michigan | ",
 "Upcoming Jan 23 Women's · Indiana at Purdue | ",
 "Upcoming Jan 29 Women's · Indiana at Louisville | ",
 "Upcoming Feb 17 Women's · Indiana at Big Ten Championships | ",
 "Upcoming Mar 8 Women's · Indiana at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 17 Women's · Indiana at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 24 Men's · Indiana at College Swimming League | 1st · 575.5 pts",
 "Upcoming Oct 9, 12:00 PM Men's · Indiana vs Texas (SCM) | ",
 "Upcoming Oct 9, 12:00 PM Men's · Indiana vs Northwestern (SCM) | ",
 "Upcoming Oct 16 Men's · Indiana at College Swimming League | ",
 "Upcoming Oct 23, 2:00 PM Men's · Indiana vs Kentucky | ",
 "Upcoming Oct 23, 2:00 PM Men's · Indiana vs USC | ",
 "Upcoming Nov 5 Men's · Indiana at College Swimming League | ",
 "Upcoming Nov 17 Men's · Indiana at Ohio State Invitational | ",
 "Upcoming Nov 17 Men's · Indiana at Tennessee Diving Invitational | ",
 "Upcoming Jan 8, 12:00 PM Men's · Indiana vs Michigan | ",
 "Upcoming Jan 23 Men's · Indiana at Purdue | ",
 "Upcoming Jan 29 Men's · Indiana at Louisville | ",
 "Upcoming Feb 24 Men's · Indiana at Big Ten Championships | ",
 "Upcoming Mar 8 Men's · Indiana at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 24 Men's · Indiana at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Indiana at Debbie Southern Furman Fall classic | Completed",
 "Final Sep 19 Women's · Indiana at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Indiana at Hoosier Classic | Completed",
 "Today Oct 8 Women's · Indiana at ITA Regional Championships | ",
 "Upcoming Nov 5 Women's · Indiana at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Indiana at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · Indiana at June Stewart Invitational | ",
 "Upcoming Nov 17 Women's · Indiana at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Indiana at UT Hidden Duals | Completed",
 "Final Sep 19 Men's · Indiana at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Indiana at Louisville Invite | Completed",
 "Today Oct 8 Men's · Indiana at ITA Ohio Valley Regional Championships | ",
 "Upcoming Oct 29 Men's · Indiana at Big Ten Individual Championships | ",
 "Upcoming Nov 5 Men's · Indiana at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Indiana at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Indiana at Louisville | L, 0-3",
 "Final Sep 1 Indiana vs Georgia | W, 3-1",
 "Final Sep 2 Indiana vs Texas A&M | W, 3-2",
 "Final Sep 6 Indiana vs Tennessee | L, 0-3",
 "Final Sep 7 Indiana at Southern Indiana | W, 3-1",
 "Final Sep 10 Indiana vs Cal Poly | W, 3-0",
 "Final Sep 11 Indiana vs Eastern Illinois | W, 3-0",
 "Final Sep 18 Indiana at Coastal Carolina | W, 3-1",
 "Final Sep 19 Indiana vs NC State | W, 3-1",
 "Final Sep 24 Indiana vs UCLA | W, 3-0",
 "Final Sep 26 Indiana vs Maryland | W, 3-0",
 "Final Oct 1 Indiana at Wisconsin | L, 2-3",
 "Final Oct 4 Indiana at Rutgers | W, 3-1",
 "Today Oct 8, 6:30 PM Indiana vs Nebraska | ",
 "Upcoming Oct 11, 2:00 PM Indiana vs USC | ",
 "Upcoming Oct 16, 9:00 PM Indiana at Oregon | ",
 "Upcoming Oct 18, 5:00 PM Indiana at Washington | ",
 "Upcoming Oct 23, 7:00 PM Indiana at Ohio State | ",
 "Upcoming Oct 25, 3:00 PM Indiana vs Penn State | ",
 "Upcoming Oct 30, 6:00 PM Indiana at Michigan State | ",
 "Upcoming Oct 31, 7:00 PM Indiana at Michigan | ",
 "Upcoming Nov 6, 7:00 PM Indiana vs Iowa | ",
 "Upcoming Nov 8, 2:00 PM Indiana vs Illinois | ",
 "Upcoming Nov 11, 8:00 PM Indiana at Minnesota | ",
 "Upcoming Nov 14, 8:00 PM Indiana vs Northwestern | ",
 "Upcoming Nov 17, 7:00 PM Indiana vs Purdue | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7 Indiana at Lock Haven | ",
 "Upcoming Nov 7 Indiana at Lehigh University | ",
 "Upcoming Nov 7 Indiana vs Michigan State Open | ",
 "Upcoming Nov 8 Indiana at Journeymen Collegiate Classic | ",
 "Upcoming Nov 15, 2:00 PM Indiana at Central Michigan | ",
 "Upcoming Nov 20, 7:00 PM Indiana vs Oklahoma | ",
 "Upcoming Dec 6 Indiana vs Cougar Clash | ",
 "Upcoming Dec 20 Indiana vs Kent State Open | ",
 "Upcoming Dec 20, 1:00 PM Indiana at Rider | ",
 "Upcoming Dec 22, 11:00 AM Indiana at Brown | ",
 "Upcoming Dec 29 Indiana at Ken Kraft Midlands Championships | ",
 "Upcoming Jan 10, 2:00 PM Indiana vs Illinois | ",
 "Upcoming Jan 17 Indiana at Rutgers | ",
 "Upcoming Jan 22, 8:00 PM Indiana vs Ohio State | ",
 "Upcoming Jan 29 Indiana at Nebraska | ",
 "Upcoming Feb 5, 7:00 PM Indiana vs Wisconsin | ",
 "Upcoming Feb 7, 2:00 PM Indiana vs Michigan | ",
 "Upcoming Feb 12 Indiana at Northwestern | ",
 "Upcoming Feb 14 Indiana at Purdue | ",
 "Upcoming Feb 21 Indiana vs Patriots Last Chance Open | ",
 "Upcoming Mar 6 Indiana at Big Ten Championships | ",
 "Upcoming Mar 18 Indiana at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
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
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();

// Golf: the place without the field size, then the team score to par
// ("t-9th Place \u2022 903 (+39)").
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value ?? r.result}`).join(' / ')]);
  assert.deepEqual(final('womens-golf'),[["Boilermaker Classic","T9th","Result: T9th / Team score: 903 (+39)"],["Bettie Lou Evans Invitational","T3rd","Result: T3rd / Team score: 863 (-1)"],["The Ally","T12th","Result: T12th / Team score: 604 (+28)"]]);
  assert.deepEqual(final('mens-golf'),[["Visit Knoxville Collegiate","T16th","Result: T16th / Team score: 854 (+14)"],["Highlands Invitational","T7th","Result: T7th / Team score: 877 (+13)"],["Windon Memorial Classic","T5th","Result: T5th / Team score: 846 (+6)"],["Fighting Irish Classic","10th","Result: 10th / Team score: 859 (+19)"],["Golfweek Invitational","Completed","Result: Completed"]]);
}

// A ranking or seed in brackets ("(RV) Cal Poly") is not part of the name;
// swimming's intrasquad "Cream & Crimson" is not listed; a league match
// reads its place and points ("1st place, 575.5 points").
{
  assert.ok(parse('Volleyball','womens-volleyball').some(e=>e.title==='Indiana vs Cal Poly'));
  for(const slug of ['womens-swimming-and-diving','mens-swimming-and-diving'])assert.equal(parse('Swimming & Diving',slug).filter(e=>/Cream/.test(e.opponent)).length,0,slug);
  assert.deepEqual(parse('Swimming & Diving','mens-swimming-and-diving').filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline]),[["College Swimming League","1st · 575.5 pts"]]);
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/IN_college_f_Indiana_IN.html',Men:'https://www.tfrrs.org/teams/xc/IN_college_m_Indiana_IN.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Sam Bell Invitational","Women's team: 1st · 21 pts / Men's team: 2nd · 34 pts",true],["John McNichols Invitational","Women's team: 12th · 311 pts / Men's team: 23rd · 669 pts",true],["Notre Dame Joe Piane Invitational","Women's team: 5th · 159 pts / Men's team: 9th · 239 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Indiana's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Indiana at Rutgers","Final","W, 47-15"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Indiana at Rutgers","Final","W, 3-1"]]);
  // Soccer has a scoreboard per team; the women's payload goes through the
  // women's provider.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Soccer').map(p=>[p.path,p.team_label]),[['soccer/usa.ncaa.m.1',"Men's"],['soccer/usa.ncaa.w.1',"Women's"]]);
  {
    const payload=JSON.parse(fixture('soccer-espn-2026-10-04.json.gz')),provider=worker.liveScoreboardProviders(school,'Soccer').find(p=>p.team_label==="Women's"),events=parse('Soccer','womens-soccer');
    const scored=worker.parseScoreboardPayload(payload,school,'Soccer',provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,new Date('2026-10-05T12:00:00Z'));
    assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[["Women's · Indiana vs Michigan","Final","L, 2-3"]]);
    assert.equal(worker.reconcileScoreboardEvents(events,scored).length,events.length,'Soccer: the scoreboard joins the official card; no second card');
  }
}

// Records, counted from the finals (football 5-0, Big Ten 2-0; volleyball
// 10-3, 3-1; women's soccer 4-7-1, 1-5; men's soccer 10-0-2, 4-0-1; field
// hockey 8-3, 4-0, as the Ohio State story publishes).
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey']].map(([sport,slug])=>records(sport,slug)),[["5-0","2-0"],["10-3","3-1"],["4-7-1","1-5"],["10-0-2","4-0-1"],["8-3","4-0"]]);

// Other schools and other hosts never reach the Indiana reader.
assert.equal(worker.indianaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://iuhoosiers.com/',now),null);
assert.equal(worker.indianaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

// A past tennis tournament without a story is not listed (K-State's rule,
// applied by the feed): the women's ITA All-American has none published.
{
  // The archive and its saved stories (Furman Fall Classic, Hoosier Classic).
  const archive=fixture('womens-tennis-archives.html.gz');recapFixtures.set('https://iuhoosiers.com/sports/womens-tennis/archives',archive);
  for(const [,path,y,m,d,slug] of archive.matchAll(/href="(\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+))"/g))try{recapFixtures.set(`https://iuhoosiers.com${path}`,fixture(`story-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`));}catch{}
  const events=parse('Tennis','womens-tennis'),listed=await worker.schoolModule('indiana').feed(events);
  assert.deepEqual(listed.filter(e=>e.status==='Final').map(e=>e.opponent),["Debbie Southern Furman Fall classic","Hoosier Classic"]);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Indiana module checks passed');
