import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {princetonSchool} from '../src/schools/princeton.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='princeton');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,princetonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/princeton-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goprincetontigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['princeton'];
assert.equal(sports.length,18);
for(const [name,map] of [['schedule',princetonSchool.scheduleUrls],['roster',princetonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('princeton|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goprincetontigers.com',`${key} must stay on goprincetontigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goprincetontigers.com/sports/baseball/schedule"],"roster":["https://goprincetontigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goprincetontigers.com/sports/mens-basketball/schedule","https://goprincetontigers.com/sports/womens-basketball/schedule"],"roster":["https://goprincetontigers.com/sports/mens-basketball/roster","https://goprincetontigers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goprincetontigers.com/sports/womens-cross-country/schedule","https://goprincetontigers.com/sports/mens-cross-country/schedule"],"roster":["https://goprincetontigers.com/sports/womens-cross-country/roster","https://goprincetontigers.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://goprincetontigers.com/sports/womens-fencing/schedule","https://goprincetontigers.com/sports/mens-fencing/schedule"],"roster":["https://goprincetontigers.com/sports/womens-fencing/roster","https://goprincetontigers.com/sports/mens-fencing/roster"],"combined":true},"Field Hockey":{"schedule":["https://goprincetontigers.com/sports/field-hockey/schedule"],"roster":["https://goprincetontigers.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goprincetontigers.com/sports/football/schedule"],"roster":["https://goprincetontigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goprincetontigers.com/sports/womens-golf/schedule","https://goprincetontigers.com/sports/mens-golf/schedule"],"roster":["https://goprincetontigers.com/sports/womens-golf/roster","https://goprincetontigers.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://goprincetontigers.com/sports/mens-ice-hockey/schedule","https://goprincetontigers.com/sports/womens-ice-hockey/schedule"],"roster":["https://goprincetontigers.com/sports/mens-ice-hockey/roster","https://goprincetontigers.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://goprincetontigers.com/sports/womens-lacrosse/schedule","https://goprincetontigers.com/sports/mens-lacrosse/schedule"],"roster":["https://goprincetontigers.com/sports/womens-lacrosse/roster","https://goprincetontigers.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goprincetontigers.com/sports/womens-rowing/schedule","https://goprincetontigers.com/sports/mens-rowing/schedule"],"roster":["https://goprincetontigers.com/sports/womens-rowing/roster","https://goprincetontigers.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://goprincetontigers.com/sports/womens-soccer/schedule","https://goprincetontigers.com/sports/mens-soccer/schedule"],"roster":["https://goprincetontigers.com/sports/womens-soccer/roster","https://goprincetontigers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goprincetontigers.com/sports/softball/schedule"],"roster":["https://goprincetontigers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goprincetontigers.com/sports/womens-swimming-and-diving/schedule","https://goprincetontigers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goprincetontigers.com/sports/womens-swimming-and-diving/roster","https://goprincetontigers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goprincetontigers.com/sports/womens-tennis/schedule","https://goprincetontigers.com/sports/mens-tennis/schedule"],"roster":["https://goprincetontigers.com/sports/womens-tennis/roster","https://goprincetontigers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goprincetontigers.com/sports/womens-track-and-field/schedule","https://goprincetontigers.com/sports/mens-track-and-field/schedule"],"roster":["https://goprincetontigers.com/sports/womens-track-and-field/roster","https://goprincetontigers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goprincetontigers.com/sports/womens-volleyball/schedule","https://goprincetontigers.com/sports/mens-volleyball/schedule"],"roster":["https://goprincetontigers.com/sports/womens-volleyball/roster","https://goprincetontigers.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://goprincetontigers.com/sports/womens-water-polo/schedule","https://goprincetontigers.com/sports/mens-water-polo/schedule"],"roster":["https://goprincetontigers.com/sports/womens-water-polo/roster","https://goprincetontigers.com/sports/mens-water-polo/roster"],"combined":true},"Wrestling":{"schedule":["https://goprincetontigers.com/sports/wrestling/schedule"],"roster":["https://goprincetontigers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'princeton|"+sport+"':"),`${sport} routes must live in the Princeton module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goprincetontigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.princetonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=princeton)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 4:00 PM Men's · Princeton vs Carnegie Mellon | ",
 "Upcoming Nov 5, 7:00 PM Men's · Princeton vs Hofstra | ",
 "Upcoming Nov 8, 1:00 PM Men's · Princeton at Siena | ",
 "Upcoming Nov 11, 7:00 PM Men's · Princeton vs Stony Brook | ",
 "Upcoming Nov 15, 2:00 PM Men's · Princeton at Rhode Island | ",
 "Upcoming Nov 20, 7:00 PM Men's · Princeton vs Monmouth | ",
 "Upcoming Nov 25 Men's · Princeton vs Liberty | ",
 "Upcoming Nov 27 Men's · Princeton vs UNCW | ",
 "Upcoming Nov 28 Men's · Princeton vs St. Thomas | ",
 "Upcoming Dec 3, 7:00 PM Men's · Princeton at Vermont | ",
 "Upcoming Dec 6, 1:00 PM Men's · Princeton at Northeastern | ",
 "Upcoming Dec 8, 7:00 PM Men's · Princeton vs Bryant and Stratton College | ",
 "Upcoming Dec 12 Men's · Princeton at LIU | ",
 "Upcoming Dec 22, 7:00 PM Men's · Princeton vs Temple | ",
 "Upcoming Dec 29, 10:00 PM Men's · Princeton at St. Mary's | ",
 "Upcoming Jan 4, 7:00 PM Men's · Princeton vs Penn | ",
 "Upcoming Jan 9, 2:00 PM Men's · Princeton at Yale | ",
 "Upcoming Jan 16, 2:00 PM Men's · Princeton vs Dartmouth | ",
 "Upcoming Jan 18, 2:00 PM Men's · Princeton vs Harvard | ",
 "Upcoming Jan 23, 2:00 PM Men's · Princeton at Brown | ",
 "Upcoming Jan 29, 7:00 PM Men's · Princeton vs Columbia | ",
 "Upcoming Jan 30, 6:00 PM Men's · Princeton vs Cornell | ",
 "Upcoming Feb 6 Men's · Princeton at Penn | ",
 "Upcoming Feb 12 Men's · Princeton at Columbia | ",
 "Upcoming Feb 13 Men's · Princeton at Cornell | ",
 "Upcoming Feb 19, 7:00 PM Men's · Princeton vs Brown | ",
 "Upcoming Feb 26, 7:00 PM Men's · Princeton at Dartmouth | ",
 "Upcoming Feb 27, 6:00 PM Men's · Princeton at Harvard | ",
 "Upcoming Mar 6, 2:00 PM Men's · Princeton vs Yale | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Women's · Princeton vs Belmont | ",
 "Upcoming Nov 6 Women's · Princeton at Richmond | ",
 "Upcoming Nov 8 Women's · Princeton vs Murray State | ",
 "Upcoming Nov 10, 7:00 PM Women's · Princeton vs Villanova | ",
 "Upcoming Nov 13 Women's · Princeton at Pepperdine | ",
 "Upcoming Nov 15 Women's · Princeton at UCLA | ",
 "Upcoming Nov 18, 7:00 PM Women's · Princeton vs George Mason | ",
 "Upcoming Nov 22, 1:00 PM Women's · Princeton vs Georgia Tech | ",
 "Upcoming Nov 25, 12:00 PM Women's · Princeton vs Rutgers | ",
 "Upcoming Dec 2, 7:00 PM Women's · Princeton at Seton Hall | ",
 "Upcoming Dec 5 Women's · Princeton at Rice | ",
 "Upcoming Dec 7 Women's · Princeton at Houston Christian | ",
 "Upcoming Dec 10, 11:00 AM Women's · Princeton vs Rhode Island | ",
 "Upcoming Dec 13, 1:00 PM Women's · Princeton vs Portland | ",
 "Upcoming Jan 1, 1:00 PM Women's · Princeton vs Oregon State | ",
 "Upcoming Jan 5, 6:00 PM Women's · Princeton vs Penn | ",
 "Upcoming Jan 9, 2:00 PM Women's · Princeton vs Yale | ",
 "Upcoming Jan 16 Women's · Princeton at Harvard | ",
 "Upcoming Jan 18 Women's · Princeton at Dartmouth | ",
 "Upcoming Jan 23, 2:00 PM Women's · Princeton vs Brown | ",
 "Upcoming Jan 29 Women's · Princeton at Cornell | ",
 "Upcoming Jan 30 Women's · Princeton at Columbia | ",
 "Upcoming Feb 6 Women's · Princeton at Penn | ",
 "Upcoming Feb 12, 7:00 PM Women's · Princeton vs Cornell | ",
 "Upcoming Feb 13, 5:00 PM Women's · Princeton vs Columbia | ",
 "Upcoming Feb 20 Women's · Princeton at Brown | ",
 "Upcoming Feb 26, 7:00 PM Women's · Princeton vs Harvard | ",
 "Upcoming Feb 27, 5:00 PM Women's · Princeton vs Dartmouth | ",
 "Upcoming Mar 6 Women's · Princeton at Yale | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Princeton at Friar Invitational | 2nd of 9",
 "Final Sep 26 Women's · Princeton at Meadows Challenge | 8th of 17",
 "Final Oct 2 Women's · Princeton at Paul Short Run | Completed",
 "Final Oct 9 Women's · Princeton at Nuttycombe Invitational | 15th of 33",
 "Final Oct 16 Women's · Princeton at Joe Handelman '52 Princeton Fall Classic | 6th of 18",
 "Upcoming Oct 31 Women's · Princeton at Ivy League Heptagonal Championships | ",
 "Upcoming Nov 13 Women's · Princeton at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21 Women's · Princeton at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Princeton at Friar Invitational | 6th of 9",
 "Final Sep 26 Men's · Princeton at Meadows Challenge | 6th of 15",
 "Final Oct 9 Men's · Princeton at Nuttycombe Invitational | 17th of 35",
 "Final Oct 16 Men's · Princeton at Joe Handelman '52 Princeton Fall Classic | 11th of 20",
 "Upcoming Oct 31 Men's · Princeton at Ivy League Heptagonal Championships | ",
 "Upcoming Nov 13 Men's · Princeton at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21 Men's · Princeton at NCAA Championships | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Nov 15 Women's · Princeton at Elite Invitational | ",
 "Upcoming Dec 6 Women's · Princeton at Sacred Heart Duals | ",
 "Upcoming Jan 13 Women's · Princeton at NJIT | ",
 "Upcoming Jan 13 Women's · Princeton at Wagner | ",
 "Upcoming Jan 16 Women's · Princeton at St. John's Cup | ",
 "Upcoming Jan 19, 10:00 AM Women's · Princeton at Cornell | ",
 "Upcoming Jan 23 Women's · Princeton at Penn State Invitational | ",
 "Upcoming Feb 6 Women's · Princeton at Ivy League Championships | ",
 "Upcoming Feb 21 Women's · Princeton at Temple Invitational | ",
 "Upcoming Mar 13 Women's · Princeton at NCAA Regional | ",
 "Upcoming Mar 25 Women's · Princeton at NCAA Championships | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Nov 15 Men's · Princeton at Elite Invitational | ",
 "Upcoming Dec 6 Men's · Princeton at Sacred Heart Duals | ",
 "Upcoming Jan 13 Men's · Princeton at NJIT | ",
 "Upcoming Jan 13 Men's · Princeton at Wagner College | ",
 "Upcoming Jan 16 Men's · Princeton at St. John's Cup | ",
 "Upcoming Jan 23 Men's · Princeton at Penn State Invitational | ",
 "Upcoming Feb 6 Men's · Princeton at Ivy League Championships | ",
 "Upcoming Feb 21 Men's · Princeton at Temple Invitational | ",
 "Upcoming Mar 13 Men's · Princeton at NCAA Regional | ",
 "Upcoming Mar 25 Men's · Princeton at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 4 Princeton vs Old Dominion | W, 4-0",
 "Final Sep 6 Princeton at North Carolina | L, 0-1",
 "Final Sep 11 Princeton vs Rutgers | W, 2-0",
 "Final Sep 13 Princeton at Penn State | W, 2-1",
 "Final Sep 18 Princeton at Penn | W, 1-0",
 "Final Sep 20 Princeton at UConn | L, 1-2",
 "Final Sep 26 Princeton at Harvard | L, 1-2",
 "Final Sep 29 Princeton vs Maryland | L, 3-4",
 "Final Oct 2 Princeton vs Yale | W, 2-1",
 "Final Oct 4 Princeton vs Temple | W, 3-0",
 "Final Oct 9 Princeton vs Dartmouth | W, 4-0",
 "Final Oct 11 Princeton vs Northwestern | W, 2-1",
 "Final Oct 16 Princeton at Cornell | W, 2-1",
 "Today Oct 23, 4:00 PM Princeton vs Brown | ",
 "Upcoming Oct 25, 12:00 PM Princeton vs Saint Joseph's | ",
 "Upcoming Oct 30, 6:00 PM Princeton at Columbia | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Princeton at Bryant | L, 14-21",
 "Final Sep 26 Princeton vs UAlbany | W, 22-0",
 "Final Oct 3 Princeton at Columbia | W, 35-7",
 "Final Oct 10 Princeton at Wagner | W, 28-13",
 "Final Oct 17 Princeton vs Brown | W, 16-10",
 "Upcoming Oct 24, 3:00 PM Princeton at Harvard | ",
 "Upcoming Oct 31, 12:00 PM Princeton vs Cornell | ",
 "Upcoming Nov 7, 12:00 PM Princeton vs Dartmouth | ",
 "Upcoming Nov 14, 12:00 PM Princeton at Yale | ",
 "Upcoming Nov 21, 12:00 PM Princeton vs Penn | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 25 Women's · Princeton at Princeton Invitational | 1st of 12",
 "Final Oct 3 Women's · Princeton at Blessings Collegiate Invitational | 3rd of 9",
 "Final Oct 16 Women's · Princeton at Ruth’s Chris Tar Heel Invitational | 9th of 14",
 "Upcoming Feb 14 Women's · Princeton at Spartan Suncoast Invitational | ",
 "Upcoming Mar 15 Women's · Princeton at GameAbove Golf Invitational Hosted By USC/EMU | ",
 "Upcoming Mar 21 Women's · Princeton at Clemson Invitational | ",
 "Upcoming Apr 17 Women's · Princeton at Yale | ",
 "Upcoming Apr 23 Women's · Princeton at Ivy League Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Princeton at Rod Myers Invitational | 12th of 13",
 "Final Sep 25 Men's · Princeton at MacDonald Cup | 3rd of 11",
 "Final Oct 5 Men's · Princeton at Hamptons Intercollegiate | 7th of 12",
 "Upcoming Mar 15 Men's · Princeton at Johnnie-O Intercollegiate | ",
 "Upcoming Mar 25 Men's · Princeton at The Goodwin | ",
 "Upcoming Apr 2 Men's · Princeton at Mason Rudolph Invitational | ",
 "Upcoming Apr 10 Men's · Princeton at Princeton Invitational | ",
 "Upcoming Apr 23 Men's · Princeton at Ivy League Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 17 Men's · Princeton vs Maryville (Exhibition) | L, 1-2",
 "Upcoming Oct 30, 7:00 PM Men's · Princeton at Stonehill | ",
 "Upcoming Oct 31, 7:00 PM Men's · Princeton at Stonehill | ",
 "Upcoming Nov 6, 7:00 PM Men's · Princeton at Colgate | ",
 "Upcoming Nov 7, 7:00 PM Men's · Princeton at Cornell | ",
 "Upcoming Nov 13, 7:00 PM Men's · Princeton vs Harvard | ",
 "Upcoming Nov 14, 7:00 PM Men's · Princeton vs Dartmouth | ",
 "Upcoming Nov 21, 7:00 PM Men's · Princeton vs Air Force | ",
 "Upcoming Nov 22, 4:00 PM Men's · Princeton vs Air Force | ",
 "Upcoming Nov 27, 5:00 PM Men's · Princeton at Penn State | ",
 "Upcoming Nov 29, 4:00 PM Men's · Princeton vs Quinnipiac | ",
 "Upcoming Dec 4, 7:00 PM Men's · Princeton vs Clarkson | ",
 "Upcoming Dec 5, 7:00 PM Men's · Princeton vs St. Lawrence | ",
 "Upcoming Jan 1, 7:00 PM Men's · Princeton vs UMass Lowell | ",
 "Upcoming Jan 2, 4:00 PM Men's · Princeton vs UMass Lowell | ",
 "Upcoming Jan 8, 7:00 PM Men's · Princeton at Dartmouth | ",
 "Upcoming Jan 9, 7:00 PM Men's · Princeton at Harvard | ",
 "Upcoming Jan 15, 7:00 PM Men's · Princeton vs Cornell | ",
 "Upcoming Jan 16, 7:00 PM Men's · Princeton vs Colgate | ",
 "Upcoming Jan 22, 7:00 PM Men's · Princeton at Yale | ",
 "Upcoming Jan 23, 7:00 PM Men's · Princeton at Brown | ",
 "Upcoming Jan 26, 7:00 PM Men's · Princeton at Quinnipiac | ",
 "Upcoming Jan 30, 7:00 PM Men's · Princeton at Brown | ",
 "Upcoming Feb 5, 7:00 PM Men's · Princeton vs Union | ",
 "Upcoming Feb 6, 7:00 PM Men's · Princeton vs RPI | ",
 "Upcoming Feb 12, 7:00 PM Men's · Princeton at St. Lawrence | ",
 "Upcoming Feb 13, 7:00 PM Men's · Princeton at Clarkson | ",
 "Upcoming Feb 19, 7:00 PM Men's · Princeton at RPI | ",
 "Upcoming Feb 20, 7:00 PM Men's · Princeton at Union | ",
 "Upcoming Feb 26, 7:00 PM Men's · Princeton vs Brown | ",
 "Upcoming Feb 27, 7:00 PM Men's · Princeton vs Yale | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 16 Women's · Princeton vs UConn | W, 2-1",
 "Final Oct 17 Women's · Princeton vs UConn | W, 6-5",
 "Today Oct 23, 6:00 PM Women's · Princeton at RPI | ",
 "Upcoming Oct 24, 3:00 PM Women's · Princeton at Union | ",
 "Upcoming Oct 30, 6:00 PM Women's · Princeton vs Brown | ",
 "Upcoming Oct 31, 3:00 PM Women's · Princeton vs Yale | ",
 "Upcoming Nov 6, 6:00 PM Women's · Princeton vs Colgate | ",
 "Upcoming Nov 7, 6:00 PM Women's · Princeton vs Cornell | ",
 "Upcoming Nov 20, 6:00 PM Women's · Princeton at Clarkson | ",
 "Upcoming Nov 21, 3:00 PM Women's · Princeton at St. Lawrence | ",
 "Upcoming Nov 24, 10:30 AM Women's · Princeton vs Delaware | ",
 "Upcoming Nov 27, 2:00 PM Women's · Princeton vs Minnesota | ",
 "Upcoming Nov 28, 2:00 PM Women's · Princeton vs Boston College | ",
 "Upcoming Dec 4, 6:00 PM Women's · Princeton at Harvard | ",
 "Upcoming Dec 5, 3:00 PM Women's · Princeton at Dartmouth | ",
 "Upcoming Dec 9, 6:00 PM Women's · Princeton vs Penn State | ",
 "Upcoming Jan 5, 10:30 AM Women's · Princeton at Delaware | ",
 "Upcoming Jan 6, 6:00 PM Women's · Princeton at Penn State | ",
 "Upcoming Jan 8, 6:00 PM Women's · Princeton vs Union | ",
 "Upcoming Jan 9, 3:00 PM Women's · Princeton vs RPI | ",
 "Upcoming Jan 14, 6:00 PM Women's · Princeton at Quinnipiac | ",
 "Upcoming Jan 16, 3:00 PM Women's · Princeton vs Quinnipiac | ",
 "Upcoming Jan 22, 6:00 PM Women's · Princeton vs Dartmouth | ",
 "Upcoming Jan 23, 3:00 PM Women's · Princeton vs Harvard | ",
 "Upcoming Jan 29, 6:00 PM Women's · Princeton at Yale | ",
 "Upcoming Jan 30, 3:00 PM Women's · Princeton at Brown | ",
 "Upcoming Feb 5, 6:00 PM Women's · Princeton at Cornell | ",
 "Upcoming Feb 6, 3:00 PM Women's · Princeton at Colgate | ",
 "Upcoming Feb 12, 6:00 PM Women's · Princeton vs St. Lawrence | ",
 "Upcoming Feb 13 Women's · Princeton vs Clarkson | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Nov 1, 9:00 AM Men's Heavyweight · Princeton vs Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Women's · Princeton vs Loyola (Md.) | W, 3-0",
 "Final Aug 23 Women's · Princeton at Syracuse | L, 0-3",
 "Final Aug 30 Women's · Princeton vs James Madison | W, 2-0",
 "Final Sep 3 Women's · Princeton at Ohio State | L, 0-4",
 "Final Sep 6 Women's · Princeton at Rutgers | L, 2-4",
 "Final Sep 10 Women's · Princeton vs Colgate | W, 3-0",
 "Final Sep 13 Women's · Princeton at Lehigh | W, 3-0",
 "Final Sep 20 Women's · Princeton at Villanova | T, 1-1",
 "Final Sep 26 Women's · Princeton vs Harvard | L, 3-4",
 "Final Oct 3 Women's · Princeton at Yale | W, 2-1",
 "Final Oct 10 Women's · Princeton vs Penn | L, 0-1",
 "Final Oct 17 Women's · Princeton at Cornell | W, 3-0",
 "Upcoming Oct 25, 12:00 PM Women's · Princeton vs Dartmouth | ",
 "Upcoming Oct 31, 6:00 PM Women's · Princeton at Columbia | ",
 "Upcoming Nov 7, 6:00 PM Women's · Princeton vs Brown | ",
 "Upcoming Nov 12 Women's · Princeton at Ivy League Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 28 Men's · Princeton vs Villanova | T, 1-1",
 "Final Aug 31 Men's · Princeton vs Portland | W, 2-0",
 "Final Sep 4 Men's · Princeton vs JMU | W, 2-0",
 "Final Sep 7 Men's · Princeton at UMass | W, 2-0",
 "Final Sep 12 Men's · Princeton at Albany | W, 1-0",
 "Final Sep 15 Men's · Princeton at Rutgers | L, 0-2",
 "Final Sep 19 Men's · Princeton at Bryant | W, 2-1",
 "Final Sep 22 Men's · Princeton vs Seton Hall | T, 0-0",
 "Final Sep 26 Men's · Princeton at Dartmouth | L, 0-1",
 "Final Oct 3 Men's · Princeton vs Yale | W, 2-1",
 "Final Oct 6 Men's · Princeton at Hofstra | T, 0-0",
 "Final Oct 10 Men's · Princeton at Columbia | T, 1-1",
 "Final Oct 17 Men's · Princeton vs Cornell | L, 0-1",
 "Upcoming Oct 24, 3:30 PM Men's · Princeton at Brown | ",
 "Upcoming Oct 31, 5:00 PM Men's · Princeton vs Harvard | ",
 "Upcoming Nov 7, 3:00 PM Men's · Princeton vs Penn | ",
 "Upcoming Nov 12 Men's · Princeton at Ivy League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · Princeton vs Villanova (Exhibition) | Completed",
 "Upcoming Oct 30, 6:00 PM Women's · Princeton at Rutgers | ",
 "Upcoming Nov 6, 2:00 PM Women's · Princeton at Columbia | ",
 "Upcoming Nov 6, 2:00 PM Women's · Princeton at Dartmouth | ",
 "Upcoming Nov 14, 11:00 AM Women's · Princeton at Penn | ",
 "Upcoming Nov 20 Women's · Princeton at Big AI Invitational | ",
 "Upcoming Dec 2 Women's · Princeton at US Open | ",
 "Upcoming Dec 7 Women's · Princeton at USA Diving Winter Nationals | ",
 "Upcoming Jan 8, 5:00 PM Women's · Princeton vs Notre Dame | ",
 "Upcoming Jan 8, 5:00 PM Women's · Princeton vs Navy | ",
 "Upcoming Jan 8, 5:00 PM Women's · Princeton vs Delaware | ",
 "Upcoming Jan 16, 11:00 AM Women's · Princeton at Brown | ",
 "Upcoming Jan 16, 11:00 AM Women's · Princeton at Cornell | ",
 "Upcoming Jan 29, 5:00 PM Women's · Princeton vs Harvard | ",
 "Upcoming Jan 29, 5:00 PM Women's · Princeton vs Yale | ",
 "Upcoming Feb 6, 11:00 AM Women's · Princeton vs Tower Diving Event | ",
 "Upcoming Feb 17, 6:00 PM Women's · Princeton at Ivy League Championships | ",
 "Upcoming Mar 8 Women's · Princeton at NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · Princeton at NCAA Championships | ",
 "Upcoming Mar 19 Women's · Princeton at NCAA Championshipsip | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 16 Men's · Princeton vs Villanova (Exhibition) | Completed",
 "Upcoming Nov 6, 2:00 PM Men's · Princeton at Columbia | ",
 "Upcoming Nov 6, 2:00 PM Men's · Princeton at Dartmouth | ",
 "Upcoming Nov 14, 10:00 AM Men's · Princeton at Penn | ",
 "Upcoming Nov 20 Men's · Princeton at Big AI Invitational | ",
 "Upcoming Dec 2 Men's · Princeton at US Open | ",
 "Upcoming Dec 7 Men's · Princeton at USA Diving Winter Nationals | ",
 "Upcoming Jan 8, 5:00 PM Men's · Princeton vs Navy | ",
 "Upcoming Jan 8, 5:00 PM Men's · Princeton vs Notre Dame | ",
 "Upcoming Jan 8, 5:00 PM Men's · Princeton vs Delaware | ",
 "Upcoming Jan 16, 11:00 AM Men's · Princeton at Brown | ",
 "Upcoming Jan 16, 11:00 AM Men's · Princeton at Cornell | ",
 "Upcoming Jan 29, 5:00 PM Men's · Princeton vs Harvard | ",
 "Upcoming Jan 29, 5:00 PM Men's · Princeton vs Yale | ",
 "Upcoming Feb 4 Men's · Princeton at Cavalier Invitational | ",
 "Upcoming Feb 6, 11:00 AM Men's · Princeton vs Tower Diving Event | ",
 "Upcoming Feb 24 Men's · Princeton at Ivy League Championships | ",
 "Upcoming Mar 6, 11:00 AM Men's · Princeton vs Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Princeton at NCAA Diving Zones | ",
 "Upcoming Mar 24 Men's · Princeton at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Princeton at ITA All Americans | Completed",
 "Final Sep 25 Women's · Princeton at Columbia Invite | Completed",
 "Final Oct 9 Women's · Princeton at Hall Of Fame Invitational | Completed",
 "Final Oct 9 Women's · Princeton at Cissie Leary Invitational | Completed",
 "Final Oct 15 Women's · Princeton at ITA Regionals | Completed",
 "Today Oct 23 Women's · Princeton at Ivy League Championships | ",
 "Upcoming Nov 5 Women's · Princeton at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Princeton at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Princeton at Orange and Blue Invitational | Completed",
 "Final Sep 18 Men's · Princeton at ITA All-Americans | Completed",
 "Final Sep 25 Men's · Princeton at Farnsworth Invitational | Completed",
 "Final Sep 30 Men's · Princeton at Battle Of The Bay | Completed",
 "Final Oct 15 Men's · Princeton at ITA Regionals | Completed",
 "Today Oct 23 Men's · Princeton at Ivy League Championships | ",
 "Upcoming Nov 5 Men's · Princeton at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · Princeton at ITA Masters | ",
 "Upcoming Nov 17 Men's · Princeton at NCAA Individual Championships | ",
 "Upcoming Jan 16, 1:00 PM Men's · Princeton vs North Carolina | ",
 "Upcoming Jan 18, 5:00 PM Men's · Princeton at Tulsa | ",
 "Upcoming Jan 19, 5:00 PM Men's · Princeton at Oklahoma State | ",
 "Upcoming Jan 23 Men's · Princeton at Michigan | ",
 "Upcoming Jan 24 Men's · Princeton at BYU or Wake Forest | ",
 "Upcoming Jan 30, 10:00 AM Men's · Princeton vs James Madison | ",
 "Upcoming Jan 30, 3:00 PM Men's · Princeton vs Lehigh | ",
 "Upcoming Feb 5, 1:00 PM Men's · Princeton vs Liberty | ",
 "Upcoming Feb 5, 5:00 PM Men's · Princeton vs Boston University | ",
 "Upcoming Feb 7, 10:00 AM Men's · Princeton vs Penn State | ",
 "Upcoming Feb 7, 3:00 PM Men's · Princeton vs Buffalo | ",
 "Upcoming Feb 11 Men's · Princeton at ITA National Indoors | ",
 "Upcoming Feb 12 Men's · Princeton at ECAC Championships | ",
 "Upcoming Feb 21, 12:00 PM Men's · Princeton vs Michigan | ",
 "Upcoming Feb 21, 5:00 PM Men's · Princeton vs Delaware | ",
 "Upcoming Mar 5, 5:00 PM Men's · Princeton vs Arizona | ",
 "Upcoming Mar 9, 12:00 PM Men's · Princeton at Pepperdine | ",
 "Upcoming Mar 11, 12:00 PM Men's · Princeton at San Diego | ",
 "Upcoming Mar 13, 1:00 PM Men's · Princeton at San Diego State | ",
 "Upcoming Mar 27, 2:00 PM Men's · Princeton vs St. John's | ",
 "Upcoming Apr 3, 2:00 PM Men's · Princeton vs Penn | ",
 "Upcoming Apr 10, 1:00 PM Men's · Princeton at Brown | ",
 "Upcoming Apr 11, 1:00 PM Men's · Princeton at Yale | ",
 "Upcoming Apr 17, 1:00 PM Men's · Princeton vs Dartmouth | ",
 "Upcoming Apr 18, 1:00 PM Men's · Princeton vs Harvard | ",
 "Upcoming Apr 23, 2:00 PM Men's · Princeton at Cornell | ",
 "Upcoming Apr 25 Men's · Princeton vs Columbia | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Women's · Princeton vs Villanova | L, 2-3",
 "Final Sep 4 Women's · Princeton vs Arizona State | L, 0-3",
 "Final Sep 5 Women's · Princeton at Colgate | L, 0-3",
 "Final Sep 11 Women's · Princeton vs Saint Peter's | W, 3-0",
 "Final Sep 12 Women's · Princeton vs Seton Hall | W, 3-2",
 "Final Sep 12 Women's · Princeton at Maryland | L, 0-3",
 "Final Sep 18 Women's · Princeton vs Temple | L, 2-3",
 "Final Sep 19 Women's · Princeton at Villanova | L, 0-3",
 "Final Sep 25 Women's · Princeton vs Penn | W, 3-2",
 "Final Oct 2 Women's · Princeton vs Columbia | W, 3-0",
 "Final Oct 3 Women's · Princeton vs Cornell | L, 0-3",
 "Final Oct 9 Women's · Princeton vs Yale | L, 0-3",
 "Final Oct 10 Women's · Princeton vs Brown | W, 3-2",
 "Final Oct 16 Women's · Princeton at Harvard | W, 3-1",
 "Final Oct 17 Women's · Princeton at Dartmouth | W, 3-0",
 "Today Oct 23, 6:00 PM Women's · Princeton at Penn | ",
 "Upcoming Oct 30, 5:00 PM Women's · Princeton at Cornell | ",
 "Upcoming Oct 31, 5:00 PM Women's · Princeton at Columbia | ",
 "Upcoming Nov 6, 6:00 PM Women's · Princeton vs Dartmouth | ",
 "Upcoming Nov 7, 5:00 PM Women's · Princeton vs Harvard | ",
 "Upcoming Nov 13, 6:00 PM Women's · Princeton at Brown | ",
 "Upcoming Nov 14, 5:00 PM Women's · Princeton at Yale | ",
 "Upcoming Nov 20 Women's · Princeton at Ivy League Tournament | ",
 "Upcoming Nov 21 Women's · Princeton at Ivy League Tournament | ",
 "Upcoming Nov 22 Women's · Princeton at Ivy League Tournament | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Sep 4 Men's · Princeton vs George Washington | W, 23-12",
 "Final Sep 5 Men's · Princeton vs Air Force | W, 20-9",
 "Final Sep 5 Men's · Princeton vs Salem | W, 19-4",
 "Final Sep 11 Men's · Princeton vs St. Mary's | W, 15-8",
 "Final Sep 12 Men's · Princeton vs Navy | W, 16-15",
 "Final Sep 12 Men's · Princeton vs San Jose State | W, 15-11",
 "Final Sep 13 Men's · Princeton vs Pepperdine | W, 12-9",
 "Final Sep 13 Men's · Princeton vs Mt. St. Mary's | W, 18-5",
 "Final Sep 18 Men's · Princeton vs San Jose State | L, 12-14",
 "Final Sep 19 Men's · Princeton vs Cal Baptist | W, 12-8",
 "Final Sep 19 Men's · Princeton vs California - Santa Barbara | W, 15-14",
 "Final Sep 20 Men's · Princeton vs Loyola Marymount | W, 10-9",
 "Final Oct 3 Men's · Princeton vs Harvard | W, 15-8",
 "Final Oct 3 Men's · Princeton vs MIT | W, 20-14",
 "Final Oct 4 Men's · Princeton vs Brown | W, 16-8",
 "Final Oct 10 Men's · Princeton at Fordham | L, 14-16",
 "Final Oct 10 Men's · Princeton at Iona | W, 14-7",
 "Final Oct 10 Men's · Princeton at LIU | W, 15-12",
 "Final Oct 18 Men's · Princeton at Pacific | W, 11-10",
 "Final Oct 21 Men's · Princeton at Cal | L, 4-19",
 "Upcoming Oct 22, 5:30 PM Men's · Princeton at Santa Clara | ",
 "Upcoming Oct 24, 4:00 PM Men's · Princeton vs Cal Baptist | ",
 "Upcoming Oct 25, 11:00 AM Men's · Princeton vs UC Davis | ",
 "Upcoming Oct 30, 6:00 PM Men's · Princeton vs Fordham | ",
 "Upcoming Oct 31, 11:00 AM Men's · Princeton vs Iona | ",
 "Upcoming Oct 31, 4:00 PM Men's · Princeton vs LIU | ",
 "Upcoming Nov 7, 12:00 PM Men's · Princeton at Harvard | ",
 "Upcoming Nov 7, 7:00 PM Men's · Princeton at MIT | ",
 "Upcoming Nov 8, 3:00 PM Men's · Princeton at Brown | ",
 "Upcoming Nov 20 Men's · Princeton at NWPC Tournament | ",
 "Upcoming Nov 21 Men's · Princeton at NWPC Tournament | ",
 "Upcoming Nov 22 Men's · Princeton at NWPC Tournament | ",
 "Upcoming Dec 4 Men's · Princeton at NCAA Tournament | ",
 "Upcoming Dec 5 Men's · Princeton at NCAA Tournament | ",
 "Upcoming Dec 6 Men's · Princeton at NCAA Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Princeton vs Princeton Open | ",
 "Upcoming Nov 14, 10:00 AM Princeton at Duke | ",
 "Upcoming Nov 14, 12:00 PM Princeton at Ohio | ",
 "Upcoming Nov 14, 2:00 PM Princeton at UTC | ",
 "Upcoming Nov 20, 7:00 PM Princeton at Wisconsin | ",
 "Upcoming Nov 22, 11:00 AM Princeton vs SIUE | ",
 "Upcoming Nov 22, 1:00 PM Princeton at Northwestern | ",
 "Upcoming Dec 4 Princeton at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Jan 3, 1:00 PM Princeton at Hofstra | ",
 "Upcoming Jan 8 Princeton at David H. Lehman '68 F&M Open | ",
 "Upcoming Jan 10, 12:00 PM Princeton vs Pittsburgh | ",
 "Upcoming Jan 22, 7:00 PM Princeton at Columbia | ",
 "Upcoming Jan 24, 2:00 PM Princeton at Lehigh | ",
 "Upcoming Jan 30, 12:00 PM Princeton vs Rider | ",
 "Upcoming Jan 31, 12:00 PM Princeton vs Brown | ",
 "Upcoming Jan 31, 5:00 PM Princeton vs Harvard | ",
 "Upcoming Feb 6, 1:00 PM Princeton at Cornell | ",
 "Upcoming Feb 11, 7:00 PM Princeton at Penn | ",
 "Upcoming Feb 14, 12:00 PM Princeton vs Rutgers | ",
 "Upcoming Mar 7 Princeton at Ivy League Tournament | ",
 "Upcoming Mar 18 Princeton at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
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
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Princeton module checks passed");
