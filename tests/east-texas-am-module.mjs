import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {eastTexasAmSchool} from '../src/schools/east-texas-am.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='east-texas-am');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,eastTexasAmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/east-texas-am-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lionathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['east-texas-am'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',eastTexasAmSchool.scheduleUrls],['roster',eastTexasAmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('east-texas-am|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lionathletics.com',`${key} must stay on lionathletics.com`);
  }
}
const parity={"Basketball":{"schedule":["https://lionathletics.com/sports/mens-basketball/schedule","https://lionathletics.com/sports/womens-basketball/schedule"],"roster":["https://lionathletics.com/sports/mens-basketball/roster","https://lionathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://lionathletics.com/sports/womens-cross-country/schedule","https://lionathletics.com/sports/mens-cross-country/schedule"],"roster":["https://lionathletics.com/sports/womens-cross-country/roster","https://lionathletics.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://lionathletics.com/sports/football/schedule"],"roster":["https://lionathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://lionathletics.com/sports/womens-golf/schedule","https://lionathletics.com/sports/mens-golf/schedule"],"roster":["https://lionathletics.com/sports/womens-golf/roster","https://lionathletics.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://lionathletics.com/sports/womens-soccer/schedule"],"roster":["https://lionathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://lionathletics.com/sports/softball/schedule"],"roster":["https://lionathletics.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://lionathletics.com/sports/womens-track-and-field/schedule","https://lionathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://lionathletics.com/sports/womens-track-and-field/roster","https://lionathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://lionathletics.com/sports/womens-volleyball/schedule"],"roster":["https://lionathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'east-texas-am|"+sport+"':"),`${sport} routes must live in the East Texas A&M module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://lionathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.eastTexasAmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=east-texas-am)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · East Texas A&M at Oklahoma | ",
 "Upcoming Nov 5, 7:00 PM Men's · East Texas A&M at Rice | ",
 "Upcoming Nov 11, 10:30 AM Men's · East Texas A&M vs FDU | ",
 "Upcoming Nov 13, 7:00 PM Men's · East Texas A&M at Portland | ",
 "Upcoming Nov 16, 6:30 PM Men's · East Texas A&M at Oregon State | ",
 "Upcoming Nov 19, 7:00 PM Men's · East Texas A&M at Cal | ",
 "Upcoming Nov 24, 6:30 PM Men's · East Texas A&M vs Arlington Baptist | ",
 "Upcoming Nov 28, 4:00 PM Men's · East Texas A&M at Marshall | ",
 "Upcoming Dec 5, 4:30 PM Men's · East Texas A&M at SFA | ",
 "Upcoming Dec 7, 6:00 PM Men's · East Texas A&M at Lamar | ",
 "Upcoming Dec 15, 6:30 PM Men's · East Texas A&M at Central Arkansas | ",
 "Upcoming Dec 19, 5:00 PM Men's · East Texas A&M vs Southeastern La. | ",
 "Upcoming Dec 21, 6:30 PM Men's · East Texas A&M vs McNeese | ",
 "Upcoming Dec 29, 7:00 PM Men's · East Texas A&M at Texas | ",
 "Upcoming Jan 2, 5:00 PM Men's · East Texas A&M vs Nicholls | ",
 "Upcoming Jan 4, 6:30 PM Men's · East Texas A&M vs LSU New Orleans | ",
 "Upcoming Jan 9, 4:30 PM Men's · East Texas A&M at UTRGV | ",
 "Upcoming Jan 11, 7:00 PM Men's · East Texas A&M at A&M-Corpus Christi | ",
 "Upcoming Jan 16, 5:00 PM Men's · East Texas A&M vs HCU | ",
 "Upcoming Jan 18, 1:00 PM Men's · East Texas A&M vs UIW | ",
 "Upcoming Jan 23, 5:00 PM Men's · East Texas A&M at LSU New Orleans | ",
 "Upcoming Jan 25, 6:30 PM Men's · East Texas A&M at Nicholls | ",
 "Upcoming Jan 30, 3:30 PM Men's · East Texas A&M at Northwestern State | ",
 "Upcoming Feb 1, 6:30 PM Men's · East Texas A&M vs Lamar | ",
 "Upcoming Feb 6, 5:00 PM Men's · East Texas A&M vs Northwestern State | ",
 "Upcoming Feb 8, 6:30 PM Men's · East Texas A&M vs SFA | ",
 "Upcoming Feb 13, 4:00 PM Men's · East Texas A&M at McNeese | ",
 "Upcoming Feb 15, 6:00 PM Men's · East Texas A&M at Southeastern La. | ",
 "Upcoming Feb 20, 4:00 PM Men's · East Texas A&M at UIW | ",
 "Upcoming Feb 22, 7:00 PM Men's · East Texas A&M at HCU | ",
 "Upcoming Feb 27, 5:00 PM Men's · East Texas A&M vs UTRGV | ",
 "Upcoming Mar 1, 6:30 PM Men's · East Texas A&M vs A&M-Corpus Christi | ",
 "Upcoming Mar 7 Men's · East Texas A&M at SLC Tournament | ",
 "Upcoming Mar 16 Men's · East Texas A&M at NCAA Tournament-Opening Round | ",
 "Upcoming Mar 18 Men's · East Texas A&M at NCAA Tournament-First & Second Rounds | ",
 "Upcoming Mar 25 Men's · East Texas A&M at NCAA Tournament-Sweet 16 & Elite Eight | ",
 "Upcoming Apr 3 Men's · East Texas A&M at NCAA Men's Final Four | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 10:30 AM Women's · East Texas A&M vs Oklahoma Christian | ",
 "Upcoming Nov 4, 5:30 PM Women's · East Texas A&M at Cincinnati | ",
 "Upcoming Nov 8, 6:00 PM Women's · East Texas A&M at SMU | ",
 "Upcoming Nov 11, 6:30 PM Women's · East Texas A&M vs Louisiana | ",
 "Upcoming Nov 15, 2:00 PM Women's · East Texas A&M at Baylor | ",
 "Upcoming Nov 18 Women's · East Texas A&M at Texas A&M | ",
 "Upcoming Nov 24, 5:30 PM Women's · East Texas A&M at Arkansas-Pine Bluff | ",
 "Upcoming Nov 30, 7:00 PM Women's · East Texas A&M at Tarleton | ",
 "Upcoming Dec 3, 6:30 PM Women's · East Texas A&M at Lamar | ",
 "Upcoming Dec 13, 2:00 PM Women's · East Texas A&M at Louisiana Tech | ",
 "Upcoming Dec 14, 6:30 PM Women's · East Texas A&M vs UNT Dallas | ",
 "Upcoming Dec 17, 6:30 PM Women's · East Texas A&M vs McNeese | ",
 "Upcoming Dec 19, 2:30 PM Women's · East Texas A&M vs Southeastern La. | ",
 "Upcoming Dec 31, 11:00 AM Women's · East Texas A&M vs LSU New Orleans | ",
 "Upcoming Jan 2, 2:30 PM Women's · East Texas A&M vs Nicholls | ",
 "Upcoming Jan 7, 11:00 AM Women's · East Texas A&M at A&M-Corpus Christi | ",
 "Upcoming Jan 9, 2:00 PM Women's · East Texas A&M at UTRGV | ",
 "Upcoming Jan 14, 1:00 PM Women's · East Texas A&M vs UIW | ",
 "Upcoming Jan 16, 2:30 PM Women's · East Texas A&M vs HCU | ",
 "Upcoming Jan 21, 6:30 PM Women's · East Texas A&M at Nicholls | ",
 "Upcoming Jan 23, 2:00 PM Women's · East Texas A&M at LSU New Orleans | ",
 "Upcoming Jan 28, 6:30 PM Women's · East Texas A&M vs SFA | ",
 "Upcoming Jan 30, 2:30 PM Women's · East Texas A&M vs Lamar | ",
 "Upcoming Feb 4, 6:30 PM Women's · East Texas A&M at SFA | ",
 "Upcoming Feb 6, 2:30 PM Women's · East Texas A&M vs Northwestern State | ",
 "Upcoming Feb 11, 6:00 PM Women's · East Texas A&M at Southeastern La. | ",
 "Upcoming Feb 13, 1:00 PM Women's · East Texas A&M at Northwestern State | ",
 "Upcoming Feb 18, 6:00 PM Women's · East Texas A&M at HCU | ",
 "Upcoming Feb 20 Women's · East Texas A&M at UIW | ",
 "Upcoming Feb 25, 6:30 PM Women's · East Texas A&M vs A&M-Corpus Christi | ",
 "Upcoming Feb 27, 2:30 PM Women's · East Texas A&M vs UTRGV | ",
 "Upcoming Mar 2, 6:30 PM Women's · East Texas A&M at McNeese | ",
 "Upcoming Mar 8 Women's · East Texas A&M at SLC Tournament | ",
 "Upcoming Mar 17 Women's · East Texas A&M at NCAA Tournament-Opening Round | ",
 "Upcoming Mar 19 Women's · East Texas A&M at NCAA Tournament-Sub Regionals | ",
 "Upcoming Mar 26 Women's · East Texas A&M at NCAA Tournament-Regionals | ",
 "Upcoming Apr 2 Women's · East Texas A&M at NCAA Women's Final Four | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 Women's · East Texas A&M at Gerald Richey Invitational | 3rd · 83 pts",
 "Final Oct 3 Women's · East Texas A&M at Southwestern Showdown | 3rd · 72 pts",
 "Final Oct 17 Women's · East Texas A&M at Weis-Crockett Invitational | 4th · 106 pts",
 "Upcoming Oct 30 Women's · East Texas A&M at Southland Conference Championships | ",
 "Upcoming Nov 13 Women's · East Texas A&M at NCAA South Central Championships | ",
 "Upcoming Nov 21 Women's · East Texas A&M at NCAA National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · East Texas A&M at John McKenzie Invitational | 4th · 104 pts",
 "Final Sep 11 Men's · East Texas A&M at Gerald Richey Invitational | 4th · 105 pts",
 "Final Oct 3 Men's · East Texas A&M at Southwestern Showdown | 3rd · 75 pts",
 "Upcoming Oct 30 Men's · East Texas A&M at Southland Conference Championships | ",
 "Upcoming Nov 13 Men's · East Texas A&M at NCAA South Central Championships | ",
 "Upcoming Nov 21 Men's · East Texas A&M at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 East Texas A&M vs Mercer | L, 15-23",
 "Final Sep 5 East Texas A&M at SFA | L, 7-44",
 "Final Sep 12 East Texas A&M vs Northwestern State | W, 38-14",
 "Final Sep 19 East Texas A&M at Tulsa | L, 0-42",
 "Final Sep 26 East Texas A&M at McNeese | L, 24-27",
 "Final Oct 3 East Texas A&M vs UTRGV | W, 20-17",
 "Final Oct 17 East Texas A&M at HCU | L, 24-43",
 "Today Oct 24, 6:00 PM East Texas A&M vs Prairie View A&M | ",
 "Upcoming Oct 31, 3:00 PM East Texas A&M vs Southeastern La. | ",
 "Upcoming Nov 7, 3:00 PM East Texas A&M at Nicholls | ",
 "Upcoming Nov 14, 3:00 PM East Texas A&M at Lamar | ",
 "Upcoming Nov 21, 3:00 PM East Texas A&M vs UIW | ",
 "Upcoming Nov 28 East Texas A&M at NCAA Playoffs-First Round | ",
 "Upcoming Dec 5 East Texas A&M at NCAA Playoffs-Second Round | ",
 "Upcoming Dec 12 East Texas A&M at NCAA Playoffs-Quarterfinals | ",
 "Upcoming Dec 20 East Texas A&M at NCAA Playoffs-Semifinals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · East Texas A&M at The Lady Clerico | 4th of 8",
 "Final Sep 21 Women's · East Texas A&M at Johnie Imes Invitational | 8th of 9",
 "Final Oct 12 Women's · East Texas A&M at MSU/Payne Stewart Memorial | 6th of 12",
 "Final Oct 18 Women's · East Texas A&M at Diamante Intercollegiate | 18th of 20",
 "Upcoming Oct 26 Women's · East Texas A&M at The Judson | ",
 "Upcoming Feb 8 Women's · East Texas A&M at Golf Club of Houston Invitational | ",
 "Upcoming Mar 10 Women's · East Texas A&M at Riverbend Intercollegiate | ",
 "Upcoming Mar 29 Women's · East Texas A&M at ULM Invitational | ",
 "Upcoming Apr 5 Women's · East Texas A&M at Huntington Bank Collegiate | ",
 "Upcoming Apr 19 Women's · East Texas A&M at SLC Championships | ",
 "Upcoming May 10 Women's · East Texas A&M at NCAA Regionals | ",
 "Upcoming May 21 Women's · East Texas A&M at NCAA National Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · East Texas A&M at Sandestin Collegiate | 13th of 14",
 "Final Sep 27 Men's · East Texas A&M at Argent Financial Classic | T7th of 14",
 "Final Oct 12 Men's · East Texas A&M at Tall City Collegiate | 10th of 12",
 "Final Oct 19 Men's · East Texas A&M at LaTour Intercollegiate | 1st of 9",
 "Upcoming Nov 4 Men's · East Texas A&M at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 8 Men's · East Texas A&M at Bentwater Intercollegiate | ",
 "Upcoming Feb 22 Men's · East Texas A&M at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · East Texas A&M at The Monty Invitational | ",
 "Upcoming Mar 29 Men's · East Texas A&M at Golfweek/AGT Intercollegiate | ",
 "Upcoming Apr 12 Men's · East Texas A&M at Sam Ryder Intercollegiate | ",
 "Upcoming Apr 26 Men's · East Texas A&M at SLC Championships | ",
 "Upcoming May 16 Men's · East Texas A&M at NCAA Regionals | ",
 "Upcoming May 28 Men's · East Texas A&M at NCAA National Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 East Texas A&M at Grambling | W, 1-0",
 "Final Aug 16 East Texas A&M vs Oklahoma | L, 0-2",
 "Final Aug 20 East Texas A&M vs Louisiana | T, 3-3",
 "Final Aug 27 East Texas A&M at Texas State | L, 0-2",
 "Final Aug 30 East Texas A&M at Abilene Christian | L, 0-3",
 "Final Sep 3 East Texas A&M vs UTSA | L, 1-2",
 "Final Sep 6 East Texas A&M at Tulsa | T, 1-1",
 "Final Sep 10 East Texas A&M vs Alabama A&M | T, 1-1",
 "Final Sep 17 East Texas A&M at UIW | L, 1-2",
 "Final Sep 24 East Texas A&M vs Southeastern La. | W, 3-0",
 "Final Oct 2 East Texas A&M vs Lamar | L, 1-2",
 "Final Oct 8 East Texas A&M at Northwestern State | L, 1-3",
 "Final Oct 11 East Texas A&M at Nicholls | W, 1-0",
 "Final Oct 15 East Texas A&M vs A&M-Corpus Christi | T, 1-1",
 "Final Oct 22 East Texas A&M at HCU | T, 1-1",
 "Upcoming Oct 25, 1:00 PM East Texas A&M vs McNeese | ",
 "Upcoming Nov 1 East Texas A&M at UTRGV | ",
 "Upcoming Nov 5, 7:00 PM East Texas A&M vs SFA | ",
 "Upcoming Nov 10 East Texas A&M at SLC Tournament | ",
 "Upcoming Nov 20 East Texas A&M at NCAA Tournament-First Round | ",
 "Upcoming Nov 27 East Texas A&M at NCAA Tournament-Second & Third Round | ",
 "Upcoming Dec 4 East Texas A&M at NCAA Tounament-Quarterfinals | ",
 "Upcoming Dec 11 East Texas A&M at NCAA Women's College Cup | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Sep 30 East Texas A&M vs North Central Texas College | ",
 "Upcoming Oct 8 East Texas A&M vs Northeast Texas CC | ",
 "Upcoming Oct 13 East Texas A&M vs Paris JC | ",
 "Upcoming Oct 20 East Texas A&M vs Murray State College | ",
 "Upcoming Oct 26, 6:00 PM East Texas A&M vs Eastern Oklahoma State College | ",
 "Upcoming Oct 29, 6:00 PM East Texas A&M vs McLennan CC | ",
 "Upcoming Nov 2, 6:00 PM East Texas A&M vs Trinity Valley CC | ",
 "Upcoming Nov 4, 6:00 PM East Texas A&M at Oklahoma | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 East Texas A&M vs Texas Southern | W, 3-0",
 "Final Aug 29 East Texas A&M vs Southern Illinois | L, 1-3",
 "Final Aug 30 East Texas A&M vs ULM | W, 3-2",
 "Final Sep 4 East Texas A&M vs UAB | W, 3-1",
 "Final Sep 4 East Texas A&M vs Rider | W, 3-1",
 "Final Sep 5 East Texas A&M at St. John's | W, 3-1",
 "Final Sep 11 East Texas A&M vs IU Indianapolis | L, 1-3",
 "Final Sep 11 East Texas A&M at UTSA | L, 0-3",
 "Final Sep 12 East Texas A&M vs Gonzaga | W, 3-2",
 "Final Sep 15 East Texas A&M at Oklahoma | L, 0-3",
 "Final Sep 17 East Texas A&M vs West Virginia | L, 1-3",
 "Final Sep 18 East Texas A&M vs Tarleton | L, 1-3",
 "Final Sep 19 East Texas A&M at North Texas | L, 2-3",
 "Final Sep 24 East Texas A&M at UIW | L, 1-3",
 "Final Sep 26 East Texas A&M at HCU | W, 3-2",
 "Final Oct 1 East Texas A&M vs LSU New Orleans | W, 3-1",
 "Final Oct 3 East Texas A&M vs Southeastern La. | L, 0-3",
 "Final Oct 8 East Texas A&M vs A&M-Corpus Christi | L, 1-3",
 "Final Oct 10 East Texas A&M vs UTRGV | L, 0-3",
 "Final Oct 15 East Texas A&M at McNeese | L, 2-3",
 "Final Oct 17 East Texas A&M at Nicholls | W, 3-0",
 "Final Oct 21 East Texas A&M vs SFA | L, 0-3",
 "Today Oct 24, 11:00 AM East Texas A&M at Lamar | ",
 "Upcoming Oct 29, 6:30 PM East Texas A&M vs UIW | ",
 "Upcoming Oct 31, 11:00 AM East Texas A&M vs HCU | ",
 "Upcoming Nov 5, 6:30 PM East Texas A&M at UTRGV | ",
 "Upcoming Nov 7, 1:00 PM East Texas A&M at A&M-Corpus Christi | ",
 "Upcoming Nov 12, 6:30 PM East Texas A&M at Northwestern State | ",
 "Upcoming Nov 14, 1:00 PM East Texas A&M vs Northwestern State | ",
 "Upcoming Nov 20 East Texas A&M at SLC Tournament | ",
 "Upcoming Dec 3 East Texas A&M at NCAA Tournament-First & Second Round | ",
 "Upcoming Dec 10 East Texas A&M at NCAA Tournament-Regionals | ",
 "Upcoming Dec 17 East Texas A&M at NCAA Championship Weekend | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("East Texas A&M module checks passed");
