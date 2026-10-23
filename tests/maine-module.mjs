import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {maineSchool} from '../src/schools/maine.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='maine');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,maineHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/maine-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goblackbears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['maine'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',maineSchool.scheduleUrls],['roster',maineSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('maine|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goblackbears.com',`${key} must stay on goblackbears.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goblackbears.com/sports/baseball/schedule"],"roster":["https://goblackbears.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goblackbears.com/sports/mens-basketball/schedule","https://goblackbears.com/sports/womens-basketball/schedule"],"roster":["https://goblackbears.com/sports/mens-basketball/roster","https://goblackbears.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goblackbears.com/sports/womens-cross-country/schedule","https://goblackbears.com/sports/mens-cross-country/schedule"],"roster":["https://goblackbears.com/sports/womens-cross-country/roster","https://goblackbears.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://goblackbears.com/sports/field-hockey/schedule"],"roster":["https://goblackbears.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goblackbears.com/sports/football/schedule"],"roster":["https://goblackbears.com/sports/football/roster"],"combined":false},"Hockey":{"schedule":["https://goblackbears.com/sports/mens-ice-hockey/schedule","https://goblackbears.com/sports/womens-ice-hockey/schedule"],"roster":["https://goblackbears.com/sports/mens-ice-hockey/roster","https://goblackbears.com/sports/womens-ice-hockey/roster"],"combined":true},"Soccer":{"schedule":["https://goblackbears.com/sports/womens-soccer/schedule"],"roster":["https://goblackbears.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goblackbears.com/sports/softball/schedule"],"roster":["https://goblackbears.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goblackbears.com/sports/womens-swimming-and-diving/schedule","https://goblackbears.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goblackbears.com/sports/womens-swimming-and-diving/roster","https://goblackbears.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://goblackbears.com/sports/womens-track-and-field/schedule","https://goblackbears.com/sports/mens-track-and-field/schedule"],"roster":["https://goblackbears.com/sports/womens-track-and-field/roster","https://goblackbears.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'maine|"+sport+"':"),`${sport} routes must live in the Maine module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goblackbears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.maineHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=maine)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 4:30 PM Men's · Maine vs Husson (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Maine at Providence College | ",
 "Upcoming Nov 5, 7:00 PM Men's · Maine at Sacred Heart | ",
 "Upcoming Nov 8, 1:00 PM Men's · Maine vs Manhattan | ",
 "Upcoming Nov 10, 7:00 PM Men's · Maine at Rhode Island | ",
 "Upcoming Nov 14, 1:00 PM Men's · Maine vs Drexel | ",
 "Upcoming Nov 19, 7:00 PM Men's · Maine at Quinnipiac | ",
 "Upcoming Nov 21, 6:00 PM Men's · Maine at UMass | ",
 "Upcoming Nov 27, 2:00 PM Men's · Maine vs Le Moyne College | ",
 "Upcoming Nov 28, 4:30 PM Men's · Maine at Lafayette | ",
 "Upcoming Nov 29, 12:00 PM Men's · Maine vs Niagara | ",
 "Upcoming Dec 1, 6:00 PM Men's · Maine vs UMA | ",
 "Upcoming Dec 5, 1:00 PM Men's · Maine vs Stony Brook | ",
 "Upcoming Dec 8, 9:00 PM Men's · Maine at DePaul | ",
 "Upcoming Dec 12, 1:00 PM Men's · Maine vs Boston University | ",
 "Upcoming Dec 21, 2:00 PM Men's · Maine vs Merrimack | ",
 "Upcoming Dec 29, 6:00 PM Men's · Maine at Brown | ",
 "Upcoming Jan 2, 4:00 PM Men's · Maine at Bryant | ",
 "Upcoming Jan 7, 6:00 PM Men's · Maine vs NJIT | ",
 "Upcoming Jan 9, 12:30 PM Men's · Maine vs UMBC | ",
 "Upcoming Jan 18, 2:00 PM Men's · Maine vs UMass Lowell | ",
 "Upcoming Jan 21, 6:00 PM Men's · Maine at Binghamton | ",
 "Upcoming Jan 23 Men's · Maine at UAlbany | ",
 "Upcoming Jan 28, 6:00 PM Men's · Maine vs Vermont | ",
 "Upcoming Jan 30, 2:00 PM Men's · Maine vs New Hampshire | ",
 "Upcoming Feb 4, 6:00 PM Men's · Maine at UMass Lowell | ",
 "Upcoming Feb 11, 6:00 PM Men's · Maine at UMBC | ",
 "Upcoming Feb 13, 4:00 PM Men's · Maine at NJIT | ",
 "Upcoming Feb 17, 6:00 PM Men's · Maine vs Bryant | ",
 "Upcoming Feb 20, 1:00 PM Men's · Maine at New Hampshire | ",
 "Upcoming Feb 25, 6:00 PM Men's · Maine vs Binghamton | ",
 "Upcoming Feb 27, 2:00 PM Men's · Maine vs UAlbany | ",
 "Upcoming Mar 2, 7:00 PM Men's · Maine at Vermont | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 6:00 PM Women's · Maine vs Siena College | ",
 "Upcoming Nov 8, 2:00 PM Women's · Maine at Merrimack | ",
 "Upcoming Nov 13, 7:00 PM Women's · Maine vs Oregon | ",
 "Upcoming Nov 15, 1:00 PM Women's · Maine vs Brown | ",
 "Upcoming Nov 19, 6:00 PM Women's · Maine vs VCU | ",
 "Upcoming Nov 22, 11:30 AM Women's · Maine vs Penn | ",
 "Upcoming Nov 27, 3:30 PM Women's · Maine vs Kentucky | ",
 "Upcoming Nov 28, 11:00 AM Women's · Maine vs Tulane | ",
 "Upcoming Dec 3 Women's · Maine at Michigan State | ",
 "Upcoming Dec 6, 1:00 PM Women's · Maine vs Quinnipiac | ",
 "Upcoming Dec 9, 6:00 PM Women's · Maine vs Fairfield | ",
 "Upcoming Dec 13 Women's · Maine at Rhode Island | ",
 "Upcoming Dec 21 Women's · Maine at George Washington | ",
 "Upcoming Dec 31, 1:00 PM Women's · Maine vs Vermont | ",
 "Upcoming Jan 2, 1:00 PM Women's · Maine vs Bryant | ",
 "Upcoming Jan 7, 6:00 PM Women's · Maine at UMBC | ",
 "Upcoming Jan 9 Women's · Maine at NJIT | ",
 "Upcoming Jan 16 Women's · Maine at UMass Lowell | ",
 "Upcoming Jan 21, 6:00 PM Women's · Maine vs Binghamton | ",
 "Upcoming Jan 23, 1:00 PM Women's · Maine vs UAlbany | ",
 "Upcoming Jan 28, 6:00 PM Women's · Maine at Vermont | ",
 "Upcoming Jan 30 Women's · Maine at New Hampshire | ",
 "Upcoming Feb 4, 5:00 PM Women's · Maine vs UMass Lowell | ",
 "Upcoming Feb 11, 6:00 PM Women's · Maine vs UMBC | ",
 "Upcoming Feb 13, 1:00 PM Women's · Maine vs NJIT | ",
 "Upcoming Feb 18 Women's · Maine at Bryant | ",
 "Upcoming Feb 20, 1:00 PM Women's · Maine vs New Hampshire | ",
 "Upcoming Feb 25, 6:07 PM Women's · Maine at Binghamton | ",
 "Upcoming Feb 27 Women's · Maine at UAlbany | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Maine vs Army | W, 20-37",
 "Final Sep 19 Women's · Maine at Maine State Meet | 1st, 19",
 "Final Oct 2 Women's · Maine at Paul Short Run | 29th, 785",
 "Final Oct 17 Women's · Maine at IC4A/ECAC | 12th, 323",
 "Upcoming Oct 30 Women's · Maine at America East Championships | ",
 "Upcoming Nov 13 Women's · Maine at NCAA Regionals | ",
 "Upcoming Nov 21 Women's · Maine at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Maine vs Army | W, 25-35",
 "Final Sep 19 Men's · Maine at Maine State Meet | 2nd, 47",
 "Final Oct 2 Men's · Maine at Paul Short Run | 32nd, 784",
 "Final Oct 17 Men's · Maine at IC4A/ECAC | 17th, 433",
 "Upcoming Oct 30 Men's · Maine at America East Championships | ",
 "Upcoming Nov 13 Men's · Maine at NCAA Regionals | ",
 "Upcoming Nov 21 Men's · Maine at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Maine vs Liberty | L, 0-5",
 "Final Aug 30 Maine vs UMass | L, 0-7",
 "Final Sep 4 Maine vs Stonehill | W, 4-0",
 "Final Sep 6 Maine vs Davidson College | W, 1-0",
 "Final Sep 11 Maine vs Boston College | L, 0-5",
 "Final Sep 13 Maine at Boston University | W, 3-2",
 "Final Sep 20 Maine vs Dartmouth | W, 1-0",
 "Final Sep 25 Maine at American | L, 0-3",
 "Final Sep 27 Maine at Towson | L, 0-1",
 "Final Oct 2 Maine vs UAlbany | W, 3-1",
 "Final Oct 9 Maine vs New Hampshire | L, 3-4",
 "Final Oct 11 Maine vs Merrimack | W, 3-0",
 "Final Oct 16 Maine at Bryant | W, 3-0",
 "Final Oct 18 Maine at Northeastern | L, 1-3",
 "Today Oct 23, 3:00 PM Maine at UMass Lowell | ",
 "Upcoming Oct 29, 3:00 PM Maine vs Vermont | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Maine at Towson | W, 21-18",
 "Final Sep 5 Maine at App State | L, 3-55",
 "Final Sep 12 Maine vs Merrimack | L, 14-23",
 "Final Sep 19 Maine at Boston College | L, 16-22",
 "Final Sep 26 Maine at Elon | L, 17-43",
 "Final Oct 3 Maine vs Sacred Heart | L, 16-24",
 "Final Oct 17 Maine vs Bryant | L, 14-17",
 "Upcoming Oct 24, 1:00 PM Maine vs Campbell | ",
 "Upcoming Oct 31, 12:00 PM Maine at Rhode Island | ",
 "Upcoming Nov 14, 12:00 PM Maine at UAlbany | ",
 "Upcoming Nov 21, 1:00 PM Maine vs New Hampshire | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Maine at Holy Cross | W, 4-1",
 "Final Oct 3 Men's · Maine at Holy Cross | L, 2-3",
 "Final Oct 9 Men's · Maine vs Quinnipiac | L, 1-2",
 "Final Oct 10 Men's · Maine vs Quinnipiac | W, 5-3",
 "Today Oct 23, 7:00 PM Men's · Maine vs Colgate | ",
 "Upcoming Oct 24, 7:00 PM Men's · Maine vs Colgate | ",
 "Upcoming Oct 30, 7:00 PM Men's · Maine at Boston University | ",
 "Upcoming Oct 31, 6:00 PM Men's · Maine at Boston University | ",
 "Upcoming Nov 6, 7:00 PM Men's · Maine vs UMass | ",
 "Upcoming Nov 7, 7:00 PM Men's · Maine vs UMass | ",
 "Upcoming Nov 13, 7:00 PM Men's · Maine at Vermont | ",
 "Upcoming Nov 14, 5:00 PM Men's · Maine at Vermont | ",
 "Upcoming Nov 20, 7:00 PM Men's · Maine vs Boston College | ",
 "Upcoming Nov 21, 7:00 PM Men's · Maine vs Boston College | ",
 "Upcoming Nov 28, 12:00 PM Men's · Maine vs Cornell | ",
 "Upcoming Dec 4, 7:00 PM Men's · Maine at New Hampshire | ",
 "Upcoming Dec 5, 7:00 PM Men's · Maine at New Hampshire | ",
 "Upcoming Dec 11, 7:15 PM Men's · Maine at UMass Lowell | ",
 "Upcoming Dec 19, 4:00 PM Men's · Maine vs Army | ",
 "Upcoming Jan 1, 7:00 PM Men's · Maine vs Miami University (OH) | ",
 "Upcoming Jan 2, 7:00 PM Men's · Maine vs Miami University (OH) | ",
 "Upcoming Jan 8, 7:00 PM Men's · Maine vs Providence College | ",
 "Upcoming Jan 9, 7:00 PM Men's · Maine vs Providence College | ",
 "Upcoming Jan 15, 7:00 PM Men's · Maine at UConn | ",
 "Upcoming Jan 16, 4:00 PM Men's · Maine at UConn | ",
 "Upcoming Jan 22, 7:00 PM Men's · Maine vs UMass Lowell | ",
 "Upcoming Jan 23, 7:00 PM Men's · Maine vs UMass Lowell | ",
 "Upcoming Jan 30 Men's · Maine at Providence College | ",
 "Upcoming Feb 5, 7:00 PM Men's · Maine vs Boston University | ",
 "Upcoming Feb 12, 7:00 PM Men's · Maine at Merrimack | ",
 "Upcoming Feb 13, 6:00 PM Men's · Maine at Merrimack | ",
 "Upcoming Feb 26, 7:00 PM Men's · Maine vs Northeastern | ",
 "Upcoming Feb 27, 7:00 PM Men's · Maine vs Northeastern | ",
 "Upcoming Mar 5, 7:00 PM Men's · Maine vs Vermont | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 19 Women's · Maine vs New Hampshire (Exhibition) | L, 2-5",
 "Final Sep 25 Women's · Maine vs Quinnipiac | L, 1-2",
 "Final Sep 26 Women's · Maine vs Quinnipiac | L, 1-4",
 "Final Oct 1 Women's · Maine vs St. Lawrence | W, 4-3",
 "Final Oct 2 Women's · Maine vs St. Lawrence | L, 0-3",
 "Final Oct 9 Women's · Maine at Minnesota | L, 0-4",
 "Final Oct 10 Women's · Maine vs Bemidji State | L, 1-4",
 "Final Oct 16 Women's · Maine at RPI | W, 5-3",
 "Final Oct 17 Women's · Maine at RPI | W, 3-1",
 "Upcoming Oct 30, 6:00 PM Women's · Maine vs Providence College | ",
 "Upcoming Oct 31, 2:00 PM Women's · Maine vs Providence College | ",
 "Upcoming Nov 6, 6:00 PM Women's · Maine at Boston University | ",
 "Upcoming Nov 7, 4:00 PM Women's · Maine at Boston University | ",
 "Upcoming Nov 13, 5:00 PM Women's · Maine vs Holy Cross | ",
 "Upcoming Nov 14, 4:00 PM Women's · Maine vs Holy Cross | ",
 "Upcoming Nov 19, 7:00 PM Women's · Maine vs Northeastern | ",
 "Upcoming Nov 20, 6:00 PM Women's · Maine vs Northeastern | ",
 "Upcoming Dec 4, 6:00 PM Women's · Maine vs New Hampshire | ",
 "Upcoming Dec 5, 5:00 PM Women's · Maine vs New Hampshire | ",
 "Upcoming Jan 1, 6:00 PM Women's · Maine at Dartmouth | ",
 "Upcoming Jan 8 Women's · Maine at UConn | ",
 "Upcoming Jan 9 Women's · Maine at UConn | ",
 "Upcoming Jan 15, 6:00 PM Women's · Maine vs Vermont | ",
 "Upcoming Jan 16, 3:00 PM Women's · Maine vs Vermont | ",
 "Upcoming Jan 22, 2:00 PM Women's · Maine at Merrimack | ",
 "Upcoming Jan 23, 1:00 PM Women's · Maine at Merrimack | ",
 "Upcoming Jan 29, 6:00 PM Women's · Maine vs Boston College | ",
 "Upcoming Jan 30, 6:00 PM Women's · Maine vs Boston College | ",
 "Upcoming Feb 4, 7:00 PM Women's · Maine vs UConn | ",
 "Upcoming Feb 6, 2:00 PM Women's · Maine at Vermont | ",
 "Upcoming Feb 12, 6:00 PM Women's · Maine at Holy Cross | ",
 "Upcoming Feb 13, 1:00 PM Women's · Maine at Providence College | ",
 "Upcoming Feb 18, 6:00 PM Women's · Maine vs Northeastern | ",
 "Upcoming Feb 20, 5:00 PM Women's · Maine vs Merrimack | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Maine at Rhode Island | L, 0-1",
 "Final Aug 20 Maine vs Mercer | W, 3-1",
 "Final Aug 23 Maine vs Sacred Heart | L, 1-2",
 "Final Aug 27 Maine vs Merrimack | L, 1-2",
 "Final Aug 30 Maine at Colgate | T, 0-0",
 "Final Sep 3 Maine vs Army | W, 2-1",
 "Final Sep 10 Maine at Providence College | T, 1-1",
 "Final Sep 13 Maine at Holy Cross | W, 1-0",
 "Final Sep 20 Maine vs UAlbany | W, 2-0",
 "Final Sep 27 Maine vs UMass Lowell | T, 1-1",
 "Final Oct 4 Maine at Vermont | L, 1-2",
 "Final Oct 11 Maine vs NJIT | W, 2-0",
 "Final Oct 18 Maine at New Hampshire | W, 2-1",
 "Final Oct 22 Maine at Bryant | L, 0-1",
 "Upcoming Oct 25, 12:00 PM Maine vs Binghamton | ",
 "Upcoming Nov 1, 12:00 PM Maine at UMBC | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · Maine vs Maine Maritime Academy | Completed",
 "Upcoming Oct 31 Women's · Maine at Vermont | ",
 "Upcoming Nov 19 Women's · Maine at The Harold Anderson Invitational | ",
 "Upcoming Dec 4 Women's · Maine at Maine State Meet | ",
 "Upcoming Jan 16 Women's · Maine at Bowdoin College | ",
 "Upcoming Jan 22 Women's · Maine at New Hampshire | ",
 "Upcoming Jan 23 Women's · Maine at Providence College | ",
 "Upcoming Feb 24 Women's · Maine at America East Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 16 Men's · Maine vs Maine Maritime Academy | Completed",
 "Upcoming Oct 31 Men's · Maine at Saint Michael's | ",
 "Upcoming Nov 19 Men's · Maine at The Harold Anderson Invitational | ",
 "Upcoming Dec 4 Men's · Maine at Maine State Meet | ",
 "Upcoming Jan 16 Men's · Maine at Bowdoin College | ",
 "Upcoming Jan 23 Men's · Maine at Providence College | ",
 "Upcoming Feb 24 Men's · Maine at America East Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Maine module checks passed");
