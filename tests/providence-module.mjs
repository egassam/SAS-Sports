import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {providenceSchool} from '../src/schools/providence.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='providence');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,providenceHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/providence-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit friars.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['providence'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',providenceSchool.scheduleUrls],['roster',providenceSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('providence|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'friars.com',`${key} must stay on friars.com`);
  }
}
const parity={"Basketball":{"schedule":["https://friars.com/sports/mens-basketball/schedule","https://friars.com/sports/womens-basketball/schedule"],"roster":["https://friars.com/sports/mens-basketball/roster","https://friars.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://friars.com/sports/womens-cross-country/schedule","https://friars.com/sports/mens-cross-country/schedule"],"roster":["https://friars.com/sports/womens-cross-country/roster","https://friars.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://friars.com/sports/field-hockey/schedule"],"roster":["https://friars.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://friars.com/sports/womens-golf/schedule","https://friars.com/sports/mens-golf/schedule"],"roster":["https://friars.com/sports/womens-golf/roster","https://friars.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://friars.com/sports/mens-ice-hockey/schedule","https://friars.com/sports/womens-ice-hockey/schedule"],"roster":["https://friars.com/sports/mens-ice-hockey/roster","https://friars.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://friars.com/sports/mens-lacrosse/schedule"],"roster":["https://friars.com/sports/mens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://friars.com/sports/womens-soccer/schedule","https://friars.com/sports/mens-soccer/schedule"],"roster":["https://friars.com/sports/womens-soccer/roster","https://friars.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://friars.com/sports/softball/schedule"],"roster":["https://friars.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://friars.com/sports/swimming-and-diving/schedule"],"roster":["https://friars.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://friars.com/sports/womens-tennis/schedule"],"roster":["https://friars.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://friars.com/sports/womens-track-and-field/schedule","https://friars.com/sports/mens-track-and-field/schedule"],"roster":["https://friars.com/sports/womens-track-and-field/roster","https://friars.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://friars.com/sports/womens-volleyball/schedule"],"roster":["https://friars.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'providence|"+sport+"':"),`${sport} routes must live in the Providence module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://friars.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.providenceHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=providence)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Providence vs Pittsburgh (Exhibition) | W, 87-64",
 "Upcoming Oct 24, 12:00 PM Men's · Providence vs Georgia Tech (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Providence vs Maine | ",
 "Upcoming Nov 7, 7:00 PM Men's · Providence vs Nebraska | ",
 "Upcoming Nov 10, 7:00 PM Men's · Providence vs Bryant | ",
 "Upcoming Nov 14, 6:00 PM Men's · Providence vs Colorado | ",
 "Upcoming Nov 17, 7:00 PM Men's · Providence vs Sacred Heart | ",
 "Upcoming Nov 23, 9:00 PM Men's · Providence vs VCU | ",
 "Upcoming Nov 24, 5:00 PM Men's · Providence vs Arizona/Colorado State | ",
 "Upcoming Nov 25, 2:30 PM Men's · Providence vs Washington/Ole Miss/BYU/Clemson | ",
 "Upcoming Dec 1, 7:00 PM Men's · Providence vs Stonehill | ",
 "Upcoming Dec 5, 12:00 PM Men's · Providence at Rhode Island | ",
 "Upcoming Dec 8, 7:00 PM Men's · Providence vs Fairfield | ",
 "Upcoming Dec 12, 2:00 PM Men's · Providence vs Butler | ",
 "Upcoming Dec 19, 12:00 PM Men's · Providence vs Syracuse | ",
 "Upcoming Dec 22, 6:30 PM Men's · Providence at Villanova | ",
 "Upcoming Dec 30, 6:00 PM Men's · Providence vs St. John's | ",
 "Upcoming Jan 2, 2:00 PM Men's · Providence at DePaul | ",
 "Upcoming Jan 5, 8:00 PM Men's · Providence at Marquette | ",
 "Upcoming Jan 9, 1:00 PM Men's · Providence vs Xavier | ",
 "Upcoming Jan 13, 7:00 PM Men's · Providence at St. John's | ",
 "Upcoming Jan 20, 7:00 PM Men's · Providence vs Connecticut | ",
 "Upcoming Jan 23, 6:00 PM Men's · Providence at Georgetown | ",
 "Upcoming Jan 27, 7:00 PM Men's · Providence at Butler | ",
 "Upcoming Jan 30, 12:00 PM Men's · Providence vs Seton Hall | ",
 "Upcoming Feb 3, 9:00 PM Men's · Providence at Creighton | ",
 "Upcoming Feb 10, 7:00 PM Men's · Providence vs Marquette | ",
 "Upcoming Feb 13, 12:00 PM Men's · Providence vs DePaul | ",
 "Upcoming Feb 17, 6:30 PM Men's · Providence vs Villanova | ",
 "Upcoming Feb 20, 8:30 PM Men's · Providence at Seton Hall | ",
 "Upcoming Feb 23, 8:00 PM Men's · Providence vs Georgetown | ",
 "Upcoming Feb 27, 8:00 PM Men's · Providence at Connecticut | ",
 "Upcoming Mar 3, 7:00 PM Men's · Providence at Xavier | ",
 "Upcoming Mar 6, 8:00 PM Men's · Providence vs Creighton | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Women's · Providence vs Southern New Hampshire (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Women's · Providence vs Stonehill College | ",
 "Upcoming Nov 7, 1:00 PM Women's · Providence vs Massachusetts | ",
 "Upcoming Nov 11, 7:00 PM Women's · Providence vs Bryant | ",
 "Upcoming Nov 14, 12:00 PM Women's · Providence at Boston College | ",
 "Upcoming Nov 17, 7:00 PM Women's · Providence vs Northeastern | ",
 "Upcoming Nov 21, 1:30 PM Women's · Providence vs South Carolina | ",
 "Upcoming Nov 24, 7:00 PM Women's · Providence vs New Hampshire | ",
 "Upcoming Nov 27, 12:30 PM Women's · Providence vs Binghamton | ",
 "Upcoming Nov 28, 12:00 PM Women's · Providence vs George Mason | ",
 "Upcoming Dec 4, 2:00 PM Women's · Providence at St. John's | ",
 "Upcoming Dec 7, 6:00 PM Women's · Providence at Rhode Island | ",
 "Upcoming Dec 10, 11:00 AM Women's · Providence vs Seton Hall | ",
 "Upcoming Dec 12, 1:00 PM Women's · Providence vs UMass Lowell | ",
 "Upcoming Dec 20, 1:00 PM Women's · Providence vs Villanova | ",
 "Upcoming Dec 23, 12:00 PM Women's · Providence at Georgetown | ",
 "Upcoming Dec 31, 1:00 PM Women's · Providence vs Marquette | ",
 "Upcoming Jan 3, 1:00 PM Women's · Providence at Xavier | ",
 "Upcoming Jan 6, 7:00 PM Women's · Providence at Butler | ",
 "Upcoming Jan 10, 1:00 PM Women's · Providence vs St. John's | ",
 "Upcoming Jan 17, 1:00 PM Women's · Providence vs Creighton | ",
 "Upcoming Jan 20, 7:00 PM Women's · Providence at DePaul | ",
 "Upcoming Jan 23, 2:00 PM Women's · Providence at Villanova | ",
 "Upcoming Jan 27, 7:00 PM Women's · Providence vs Butler | ",
 "Upcoming Jan 31, 12:00 PM Women's · Providence at Connecticut | ",
 "Upcoming Feb 3, 7:00 PM Women's · Providence vs Georgetown | ",
 "Upcoming Feb 6, 1:00 PM Women's · Providence vs Xavier | ",
 "Upcoming Feb 11, 7:00 PM Women's · Providence at Seton Hall | ",
 "Upcoming Feb 14, 1:00 PM Women's · Providence vs DePaul | ",
 "Upcoming Feb 18, 7:30 PM Women's · Providence at Creighton | ",
 "Upcoming Feb 21, 4:00 PM Women's · Providence at Marquette | ",
 "Upcoming Feb 25, 7:00 PM Women's · Providence vs Connecticut | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Providence at Friar Invitational | Completed",
 "Final Sep 26 Women's · Providence at Princeton Meadows Challenge | Completed",
 "Final Oct 9 Women's · Providence at Wisconsin Nuttycombe Invitational | Completed",
 "Final Oct 9 Women's · Providence at New England Championship | Completed",
 "Upcoming Oct 23, 4:30 PM Women's · Providence at Brown Rothenberg Run | ",
 "Upcoming Oct 30, 10:00 AM Women's · Providence at BIG EAST Championship | ",
 "Upcoming Nov 13, 11:00 AM Women's · Providence at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Women's · Providence at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Providence at Friar Invitational | Completed",
 "Final Sep 26 Men's · Providence at Princeton Meadows Challenge | Completed",
 "Final Oct 9 Men's · Providence at Wisconsin Nuttycombe Invitational | Completed",
 "Final Oct 9 Men's · Providence at New England Championship | Completed",
 "Upcoming Oct 23, 5:00 PM Men's · Providence at Brown Rothenberg Run | ",
 "Upcoming Oct 30, 10:50 AM Men's · Providence at BIG EAST Championship | ",
 "Upcoming Nov 13, 12:00 PM Men's · Providence at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Men's · Providence at NCAA Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Providence at Boston College | L, 1-3",
 "Final Aug 30 Providence vs Boston University | W, 3-2",
 "Final Sep 4 Providence vs New Haven | W, 11-0",
 "Final Sep 6 Providence at Bryant | W, 3-0",
 "Final Sep 11 Providence vs Sacred Heart | W, 4-1",
 "Final Sep 13 Providence at Hofstra | W, 2-1",
 "Final Sep 18 Providence at Old Dominion | W, 2-0",
 "Final Sep 20 Providence at Brown | L, 3-4",
 "Final Sep 25 Providence at Georgetown | W, 1-0",
 "Final Sep 27 Providence at American | W, 2-1",
 "Final Oct 2 Providence vs Connecticut | L, 1-2",
 "Final Oct 4 Providence vs UMass Lowell | W, 1-0",
 "Final Oct 11 Providence vs Holy Cross | L, 1-2",
 "Final Oct 16 Providence vs Liberty | L, 1-3",
 "Upcoming Oct 23, 2:00 PM Providence vs Villanova | ",
 "Upcoming Oct 25, 12:00 PM Providence vs Fairfield | ",
 "Upcoming Oct 30, 12:00 PM Providence at Temple | ",
 "Upcoming Nov 6 Providence at BIG EAST Championship | ",
 "Upcoming Nov 8 Providence at BIG EAST Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Providence at Warrior Invitational | 5th of 9",
 "Final Sep 28 Women's · Providence at Sacred Heart Fall Classic | 5th of 8",
 "Final Oct 12 Women's · Providence at Quinnipiac Classic | T9th of 10",
 "Final Oct 19 Women's · Providence at Crusader Invitational | 9th of 13",
 "Upcoming Oct 26 Women's · Providence at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Providence at Doc Gimmler Invitational | 12th of 14",
 "Final Sep 19 Men's · Providence at Ryan T. Lee Memorial | 12th of 18",
 "Final Sep 27 Men's · Providence at UConn Invitational | 4th of 14",
 "Final Oct 12 Men's · Providence at The Scrappy at Pinetree | 9th of 11",
 "Final Oct 19 Men's · Providence at Xavier Invitational | 4th of 9"
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Providence vs Stonehill (Exhibition) | T, 3-3",
 "Final Oct 9 Men's · Providence vs St. Lawrence | W, 6-2",
 "Final Oct 10 Men's · Providence vs Clarkson | W, 4-0",
 "Final Oct 16 Men's · Providence at Union | W, 3-2",
 "Upcoming Oct 23, 7:05 PM Men's · Providence at UMass Lowell | ",
 "Upcoming Oct 24, 6:00 PM Men's · Providence vs UMass Lowell | ",
 "Upcoming Oct 31, 12:00 PM Men's · Providence at Quinnipiac | ",
 "Upcoming Nov 5, 7:00 PM Men's · Providence vs UConn | ",
 "Upcoming Nov 7, 5:00 PM Men's · Providence at UConn | ",
 "Upcoming Nov 13, 7:00 PM Men's · Providence vs Merrimack | ",
 "Upcoming Nov 14, 7:00 PM Men's · Providence at Merrimack | ",
 "Upcoming Nov 19, 7:00 PM Men's · Providence at UMass | ",
 "Upcoming Nov 21, 5:00 PM Men's · Providence vs UMass | ",
 "Upcoming Nov 27, 9:00 AM Men's · Providence vs Minnesota Duluth | ",
 "Upcoming Nov 28 Men's · Providence vs UConn/Colgate | ",
 "Upcoming Dec 5, 5:00 PM Men's · Providence at Vermont | ",
 "Upcoming Dec 11, 7:00 PM Men's · Providence vs New Hampshire | ",
 "Upcoming Jan 1, 5:00 PM Men's · Providence vs St. Thomas | ",
 "Upcoming Jan 2, 5:00 PM Men's · Providence vs St. Thomas | ",
 "Upcoming Jan 8, 7:00 PM Men's · Providence at Maine | ",
 "Upcoming Jan 9, 7:00 PM Men's · Providence at Maine | ",
 "Upcoming Jan 15, 7:00 PM Men's · Providence at Boston College | ",
 "Upcoming Jan 16, 6:00 PM Men's · Providence vs Boston College | ",
 "Upcoming Jan 22, 7:00 PM Men's · Providence at Boston University | ",
 "Upcoming Jan 23, 5:30 PM Men's · Providence vs Boston University | ",
 "Upcoming Jan 30, 6:00 PM Men's · Providence vs Maine | ",
 "Upcoming Feb 2, 7:00 PM Men's · Providence vs Brown | ",
 "Upcoming Feb 6, 4:00 PM Men's · Providence vs LIU | ",
 "Upcoming Feb 12, 7:00 PM Men's · Providence vs Vermont | ",
 "Upcoming Feb 13, 6:00 PM Men's · Providence vs Vermont | ",
 "Upcoming Feb 19, 7:00 PM Men's · Providence vs Northeastern | ",
 "Upcoming Feb 20, 6:00 PM Men's · Providence vs Northeastern | ",
 "Upcoming Feb 26, 7:00 PM Men's · Providence at New Hampshire | ",
 "Upcoming Feb 27, 7:00 PM Men's · Providence vs New Hampshire | ",
 "Upcoming Mar 6, 2:00 PM Men's · Providence at UConn | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · Providence at Sacred Heart | W, 4-2",
 "Final Sep 26 Women's · Providence vs Sacred Heart | W, 3-0",
 "Final Oct 2 Women's · Providence at Quinnipiac | L, 1-3",
 "Final Oct 3 Women's · Providence vs Quinnipiac | L, 1-6",
 "Final Oct 9 Women's · Providence vs Northeastern | L, 0-2",
 "Final Oct 10 Women's · Providence at Boston College | W, 3-2",
 "Upcoming Oct 23, 6:00 PM Women's · Providence at Clarkson | ",
 "Upcoming Oct 24, 3:00 PM Women's · Providence at Clarkson | ",
 "Upcoming Oct 30, 5:00 PM Women's · Providence at Maine | ",
 "Upcoming Oct 31, 1:00 PM Women's · Providence at Maine | ",
 "Upcoming Nov 6, 6:00 PM Women's · Providence at New Hampshire | ",
 "Upcoming Nov 7, 2:00 PM Women's · Providence vs New Hampshire | ",
 "Upcoming Nov 13, 2:00 PM Women's · Providence at Connecticut | ",
 "Upcoming Nov 14, 2:00 PM Women's · Providence vs Connecticut | ",
 "Upcoming Nov 20, 11:00 AM Women's · Providence vs Boston University | ",
 "Upcoming Nov 21, 4:00 PM Women's · Providence at Boston University | ",
 "Upcoming Nov 28, 3:00 PM Women's · Providence vs Brown | ",
 "Upcoming Dec 4, 5:00 PM Women's · Providence at Merrimack College | ",
 "Upcoming Dec 5, 2:00 PM Women's · Providence vs Merrimack College | ",
 "Upcoming Jan 1, 12:00 PM Women's · Providence vs St. Thomas | ",
 "Upcoming Jan 2, 12:00 PM Women's · Providence vs St. Thomas | ",
 "Upcoming Jan 8, 7:00 PM Women's · Providence at Northeastern | ",
 "Upcoming Jan 15, 2:00 PM Women's · Providence vs Boston College | ",
 "Upcoming Jan 18, 4:00 PM Women's · Providence vs Yale | ",
 "Upcoming Jan 22, 6:00 PM Women's · Providence vs College of the Holy Cross | ",
 "Upcoming Jan 23, 7:00 PM Women's · Providence at College of the Holy Cross | ",
 "Upcoming Jan 29, 6:00 PM Women's · Providence vs Vermont | ",
 "Upcoming Jan 30, 1:00 PM Women's · Providence vs Vermont | ",
 "Upcoming Feb 4, 6:00 PM Women's · Providence vs Boston University | ",
 "Upcoming Feb 5, 5:00 PM Women's · Providence vs Merrimack College | ",
 "Upcoming Feb 12, 2:00 PM Women's · Providence at Boston College | ",
 "Upcoming Feb 13, 1:00 PM Women's · Providence vs Maine | ",
 "Upcoming Feb 18, 4:00 PM Women's · Providence at Vermont | ",
 "Upcoming Feb 20, 2:00 PM Women's · Providence vs New Hampshire | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Providence vs UMass Lowell | T, 1-1",
 "Final Aug 15 Women's · Providence vs Rhode Island | W, 3-0",
 "Final Aug 20 Women's · Providence vs Monmouth | T, 1-1",
 "Final Aug 23 Women's · Providence at Northeastern | T, 0-0",
 "Final Aug 27 Women's · Providence vs Stonehill | W, 2-1",
 "Final Aug 30 Women's · Providence at Rutgers | T, 3-3",
 "Final Sep 6 Women's · Providence at Boston University | T, 1-1",
 "Final Sep 10 Women's · Providence vs Maine | T, 1-1",
 "Final Sep 17 Women's · Providence at Brown | L, 0-4",
 "Final Sep 26 Women's · Providence at Creighton | T, 1-1",
 "Final Oct 3 Women's · Providence at Connecticut | L, 1-2",
 "Final Oct 7 Women's · Providence vs Georgetown | T, 1-1",
 "Final Oct 10 Women's · Providence vs Villanova | T, 3-3",
 "Final Oct 17 Women's · Providence at Seton Hall | L, 0-1",
 "Today Oct 21, 6:00 PM Women's · Providence vs St. John's | ",
 "Upcoming Oct 24, 1:00 PM Women's · Providence vs DePaul | ",
 "Upcoming Oct 28, 6:30 PM Women's · Providence at Xavier | ",
 "Upcoming Oct 31, 12:30 PM Women's · Providence vs Butler | ",
 "Upcoming Nov 7, 7:00 PM Women's · Providence at Marquette | ",
 "Upcoming Nov 11 Women's · Providence at BIG EAST Tournament | ",
 "Upcoming Nov 14 Women's · Providence at BIG EAST Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Providence vs Sacred Heart | W, 4-1",
 "Final Aug 24 Men's · Providence at Quinnipiac | L, 2-3",
 "Final Aug 28 Men's · Providence vs LIU | W, 3-2",
 "Final Aug 31 Men's · Providence vs Boston University | T, 1-1",
 "Final Sep 4 Men's · Providence at Harvard | W, 3-1",
 "Final Sep 7 Men's · Providence vs Rhode Island | W, 3-0",
 "Final Sep 12 Men's · Providence at Bryant | L, 2-3",
 "Final Sep 18 Men's · Providence at Creighton | L, 0-3",
 "Final Sep 22 Men's · Providence vs Brown | W, 2-1",
 "Final Oct 2 Men's · Providence at Georgetown | L, 1-6",
 "Final Oct 10 Men's · Providence at Villanova | T, 3-3",
 "Final Oct 16 Men's · Providence vs Akron | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Men's · Providence at Connecticut | ",
 "Upcoming Oct 31, 7:00 PM Men's · Providence vs Seton Hall | ",
 "Upcoming Nov 6, 7:00 PM Men's · Providence vs St. John's | ",
 "Upcoming Nov 12 Men's · Providence at BIG EAST Tournament | ",
 "Upcoming Nov 15 Men's · Providence at BIG EAST Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 10 Providence at Friar Invitational | Completed",
 "Final Oct 17 Providence at Fairfield | Men's team: L, 66-232 / Women's team: L, 90-209",
 "Upcoming Oct 24, 11:00 AM Providence vs Stonehill College | ",
 "Upcoming Oct 30, 5:00 PM Providence vs Bryant | ",
 "Upcoming Nov 4, 5:00 PM Providence at Rhode Island | ",
 "Upcoming Nov 7, 12:00 PM Providence at Villanova | ",
 "Upcoming Nov 19, 10:00 AM Providence at Harold Anderson Invitational | ",
 "Upcoming Jan 20, 5:00 PM Providence at Holy Cross | ",
 "Upcoming Jan 23, 11:00 AM Providence vs Maine | ",
 "Upcoming Feb 6, 12:00 PM Providence at Connecticut | ",
 "Upcoming Feb 17, 10:00 AM Providence at BIG EAST Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Providence at Bryant Invitational | Completed",
 "Final Oct 8 Providence at ITA Regionals (at Yale) | Completed",
 "Final Oct 17 Providence at Holy Cross Invitational | Completed",
 "Upcoming Oct 24 Providence at URI Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Providence at Brown Alden Invitational | ",
 "Upcoming Dec 5 Women's · Providence at Boston University Season Opener | ",
 "Upcoming Jan 16 Women's · Providence at Harvard Beantown Challenge | ",
 "Upcoming Jan 29 Women's · Providence at Boston University Terrier Classic | ",
 "Upcoming Feb 13 Women's · Providence at Boston University Valentine Invitational | ",
 "Upcoming Feb 13 Women's · Providence at URI Coaches Invitational | ",
 "Upcoming Feb 20 Women's · Providence at Brown Invitational | ",
 "Upcoming Feb 26 Women's · Providence at BIG EAST Championships | ",
 "Upcoming Mar 5 Women's · Providence at New England Championships | ",
 "Upcoming Mar 12 Women's · Providence at NCAA Indoor Championship | ",
 "Upcoming Mar 25 Women's · Providence at Raleigh Relays | ",
 "Upcoming Apr 3 Women's · Providence at Ocean State Cup | ",
 "Upcoming Apr 9 Women's · Providence at Friar Invitational | ",
 "Upcoming Apr 22 Women's · Providence at Penn Relays | ",
 "Upcoming Apr 30 Women's · Providence at Jay Carisella Coaches Invitational | ",
 "Upcoming May 6 Women's · Providence at BIG EAST Outdoor Championships | ",
 "Upcoming May 26 Women's · Providence at NCAA First Round | ",
 "Upcoming Jun 9 Women's · Providence at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · Providence at Brown Alden Invitational | ",
 "Upcoming Dec 5 Men's · Providence at Boston University Season Opener | ",
 "Upcoming Jan 16 Men's · Providence at Harvard Beantown Challenge | ",
 "Upcoming Jan 30 Men's · Providence at Boston University Terrier Classic | ",
 "Upcoming Feb 12 Men's · Providence at Boston University Valentine Invitational | ",
 "Upcoming Feb 13 Men's · Providence at URI Coaches Invitational | ",
 "Upcoming Feb 20 Men's · Providence at Brown Invitational | ",
 "Upcoming Feb 26 Men's · Providence at BIG EAST Championships | ",
 "Upcoming Mar 5 Men's · Providence at New England Championships | ",
 "Upcoming Mar 12 Men's · Providence at NCAA Indoor Championship | ",
 "Upcoming Mar 25 Men's · Providence at Raleigh Relays | ",
 "Upcoming Apr 3 Men's · Providence at Ocean State Cup | ",
 "Upcoming Apr 9 Men's · Providence at Friar Invitational | ",
 "Upcoming Apr 22 Men's · Providence at Penn Relays | ",
 "Upcoming Apr 30 Men's · Providence at Jay Carisella Coaches Invitational | ",
 "Upcoming May 6 Men's · Providence at BIG EAST Outdoor Championships | ",
 "Upcoming May 26 Men's · Providence at NCAA First Round | ",
 "Upcoming Jun 9 Men's · Providence at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Providence vs Saint Peter's | W, 3-0",
 "Final Aug 29 Providence vs New Haven | W, 3-0",
 "Final Aug 29 Providence at New Hampshire | L, 1-3",
 "Final Sep 4 Providence vs Brown | W, 3-2",
 "Final Sep 5 Providence vs Bryant | W, 3-1",
 "Final Sep 6 Providence at Rhode Island | W, 3-0",
 "Final Sep 11 Providence vs Manhattan | W, 3-0",
 "Final Sep 12 Providence vs Stonehill College | W, 3-0",
 "Final Sep 12 Providence vs Holy Cross | W, 3-0",
 "Final Sep 18 Providence at Harvard | L, 0-3",
 "Final Sep 19 Providence vs Sacred Heart | L, 2-3",
 "Final Sep 25 Providence vs DePaul | L, 0-3",
 "Final Sep 26 Providence vs Marquette | L, 0-3",
 "Final Oct 2 Providence at Villanova | L, 0-3",
 "Final Oct 3 Providence at Georgetown | L, 1-3",
 "Final Oct 9 Providence vs Seton Hall | W, 3-0",
 "Final Oct 10 Providence vs St. John's | L, 1-3",
 "Final Oct 16 Providence at Xavier | W, 3-0",
 "Final Oct 17 Providence at Butler | W, 3-2",
 "Upcoming Oct 23, 7:00 PM Providence at Creighton | ",
 "Upcoming Oct 25, 4:00 PM Providence vs Connecticut | ",
 "Upcoming Oct 30, 5:00 PM Providence vs Georgetown | ",
 "Upcoming Oct 31, 3:00 PM Providence vs Villanova | ",
 "Upcoming Nov 6, 7:00 PM Providence at St. John's | ",
 "Upcoming Nov 7, 3:00 PM Providence at Seton Hall | ",
 "Upcoming Nov 13, 5:00 PM Providence vs Butler | ",
 "Upcoming Nov 14, 3:00 PM Providence vs Xavier | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Hockey: both teams play in Hockey East, which names their conference
// record (the Big East sponsors no hockey).
{
  const names=['mens-ice-hockey','womens-ice-hockey'].flatMap(slug=>parse('Hockey',slug)).map(e=>e.conference_name);
  assert.ok(names.length>0&&names.every(name=>name==='Hockey East'));
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Providence module checks passed');
