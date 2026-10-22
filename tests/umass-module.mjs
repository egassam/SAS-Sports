import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {umassSchool} from '../src/schools/umass.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='umass');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,umassHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/umass-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit umassathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['umass'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',umassSchool.scheduleUrls],['roster',umassSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('umass|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'umassathletics.com',`${key} must stay on umassathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://umassathletics.com/sports/baseball/schedule"],"roster":["https://umassathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://umassathletics.com/sports/mens-basketball/schedule","https://umassathletics.com/sports/womens-basketball/schedule"],"roster":["https://umassathletics.com/sports/mens-basketball/roster","https://umassathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://umassathletics.com/sports/womens-cross-country/schedule","https://umassathletics.com/sports/mens-cross-country/schedule"],"roster":["https://umassathletics.com/sports/womens-cross-country/roster","https://umassathletics.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://umassathletics.com/sports/field-hockey/schedule"],"roster":["https://umassathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://umassathletics.com/sports/football/schedule"],"roster":["https://umassathletics.com/sports/football/roster"],"combined":false},"Hockey":{"schedule":["https://umassathletics.com/sports/mens-ice-hockey/schedule"],"roster":["https://umassathletics.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://umassathletics.com/sports/womens-lacrosse/schedule","https://umassathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://umassathletics.com/sports/womens-lacrosse/roster","https://umassathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://umassathletics.com/sports/womens-rowing/schedule"],"roster":["https://umassathletics.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://umassathletics.com/sports/womens-soccer/schedule","https://umassathletics.com/sports/mens-soccer/schedule"],"roster":["https://umassathletics.com/sports/womens-soccer/roster","https://umassathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://umassathletics.com/sports/softball/schedule"],"roster":["https://umassathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://umassathletics.com/sports/womens-swimming-and-diving/schedule","https://umassathletics.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://umassathletics.com/sports/womens-swimming-and-diving/roster","https://umassathletics.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://umassathletics.com/sports/womens-tennis/schedule"],"roster":["https://umassathletics.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://umassathletics.com/sports/womens-track-and-field/schedule","https://umassathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://umassathletics.com/sports/womens-track-and-field/roster","https://umassathletics.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'umass|"+sport+"':"),`${sport} routes must live in the UMass module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://umassathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.umassHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=umass)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · UMass vs Rhode Island (Exhibition) | W, 81-68",
 "Upcoming Oct 23, 7:00 PM Men's · UMass at Harvard (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · UMass at Troy | ",
 "Upcoming Nov 6, 4:00 PM Men's · UMass vs Boston College | ",
 "Upcoming Nov 11, 7:00 PM Men's · UMass vs UMass Lowell | ",
 "Upcoming Nov 17, 7:30 PM Men's · UMass vs Bryant | ",
 "Upcoming Nov 21, 6:00 PM Men's · UMass vs Maine | ",
 "Upcoming Nov 29, 1:00 PM Men's · UMass vs Loyola Chicago | ",
 "Upcoming Dec 2, 6:30 PM Men's · UMass at Eastern Michigan | ",
 "Upcoming Dec 6, 1:00 PM Men's · UMass vs Wake Forest | ",
 "Upcoming Dec 9, 7:00 PM Men's · UMass vs Western Michigan | ",
 "Upcoming Dec 12, 7:00 PM Men's · UMass at Kent State | ",
 "Upcoming Dec 19, 1:00 PM Men's · UMass vs Stonehill | ",
 "Upcoming Dec 21, 11:00 AM Men's · UMass vs UMass Boston | ",
 "Upcoming Dec 29, 7:00 PM Men's · UMass vs Akron | ",
 "Upcoming Jan 2, 2:00 PM Men's · UMass vs Ball State | ",
 "Upcoming Jan 5, 6:30 PM Men's · UMass at Buffalo | ",
 "Upcoming Jan 9 Men's · UMass at Ohio | ",
 "Upcoming Jan 12, 7:00 PM Men's · UMass vs Toledo | ",
 "Upcoming Jan 16, 3:30 PM Men's · UMass vs Central Michigan | ",
 "Upcoming Jan 19, 7:00 PM Men's · UMass at Bowling Green | ",
 "Upcoming Jan 23, 12:00 PM Men's · UMass vs Ohio | ",
 "Upcoming Jan 26, 6:00 PM Men's · UMass vs Miami (OH) | ",
 "Upcoming Jan 30 Men's · UMass at Akron | ",
 "Upcoming Feb 2, 7:00 PM Men's · UMass at Central Michigan | ",
 "Upcoming Feb 6, 7:00 PM Men's · UMass vs Sun Belt Opponent | ",
 "Upcoming Feb 9, 7:00 PM Men's · UMass vs Kent State | ",
 "Upcoming Feb 13, 12:30 PM Men's · UMass vs Eastern Michigan | ",
 "Upcoming Feb 16 Men's · UMass at Ball State | ",
 "Upcoming Feb 20 Men's · UMass at Western Michigan | ",
 "Upcoming Feb 23, 7:00 PM Men's · UMass vs Buffalo | ",
 "Upcoming Feb 27, 6:00 PM Men's · UMass vs Bowling Green | ",
 "Upcoming Mar 2 Men's · UMass at Toledo | ",
 "Upcoming Mar 5 Men's · UMass at Miami (OH) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 1:00 PM Women's · UMass vs Pace (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · UMass vs Marshall | ",
 "Upcoming Nov 7, 1:00 PM Women's · UMass at Providence | ",
 "Upcoming Nov 11, 7:00 PM Women's · UMass at Harvard | ",
 "Upcoming Nov 14, 1:00 PM Women's · UMass vs Central Connecticut State | ",
 "Upcoming Nov 17, 5:00 PM Women's · UMass vs Army | ",
 "Upcoming Nov 20, 6:00 PM Women's · UMass at Boston College | ",
 "Upcoming Nov 28, 1:30 PM Women's · UMass vs Oklahoma State | ",
 "Upcoming Nov 29, 1:30 PM Women's · UMass vs Washington | ",
 "Upcoming Dec 5, 1:00 PM Women's · UMass at Binghamton | ",
 "Upcoming Dec 7, 6:00 PM Women's · UMass vs Holy Cross | ",
 "Upcoming Dec 16, 6:00 PM Women's · UMass vs UMass Lowell | ",
 "Upcoming Dec 19, 2:00 PM Women's · UMass at New Hampshire | ",
 "Upcoming Dec 21, 1:30 PM Women's · UMass vs UAlbany | ",
 "Upcoming Jan 2, 4:00 PM Women's · UMass at Akron | ",
 "Upcoming Jan 6, 6:00 PM Women's · UMass vs Buffalo | ",
 "Upcoming Jan 9, 12:00 PM Women's · UMass vs Western Michigan | ",
 "Upcoming Jan 13 Women's · UMass at Miami (OH) | ",
 "Upcoming Jan 16, 1:00 PM Women's · UMass vs Kent State | ",
 "Upcoming Jan 20, 11:00 AM Women's · UMass vs Ball State | ",
 "Upcoming Jan 23, 1:00 PM Women's · UMass at Central Michigan | ",
 "Upcoming Jan 27, 6:00 PM Women's · UMass vs Akron | ",
 "Upcoming Jan 30 Women's · UMass at Ohio | ",
 "Upcoming Feb 3 Women's · UMass at Bowling Green | ",
 "Upcoming Feb 6 Women's · UMass at Sun Belt Opponent | ",
 "Upcoming Feb 10, 6:00 PM Women's · UMass vs Eastern Michigan | ",
 "Upcoming Feb 13 Women's · UMass at Western Michigan | ",
 "Upcoming Feb 17 Women's · UMass at Kent State | ",
 "Upcoming Feb 20, 1:00 PM Women's · UMass vs Toledo | ",
 "Upcoming Feb 24, 6:00 PM Women's · UMass vs Miami (OH) | ",
 "Upcoming Feb 27 Women's · UMass at Ball State | ",
 "Upcoming Mar 3, 6:00 PM Women's · UMass at Buffalo | ",
 "Upcoming Mar 6, 1:00 PM Women's · UMass vs Bowling Green | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · UMass at UMass Ken O'Brien Minutemen Invitational | 1st of 3",
 "Final Sep 19 Women's · UMass at Maribel Sanchez Souther Memorial Invitational (Dartmouth) | 1st of 9",
 "Final Oct 2 Women's · UMass at Paul Short Invitational (Lehigh) | 4th of 37",
 "Final Oct 17 Women's · UMass at ECAC Championships | 4th of 26",
 "Upcoming Oct 30 Women's · UMass at MAC Championships | ",
 "Upcoming Nov 13 Women's · UMass at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Women's · UMass at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · UMass at UMass Ken O'Brien Minutemen Invitational | 1st of 3",
 "Final Sep 19 Men's · UMass at Maribel Sanchez Souther Memorial Invitational (Dartmouth) | 5th of 10",
 "Final Oct 2 Men's · UMass at Paul Short Invitational (Lehigh) | 16th of 35",
 "Final Oct 17 Men's · UMass at IC4A Championships | 4th of 25",
 "Upcoming Oct 30 Men's · UMass at MAC Championships | ",
 "Upcoming Nov 13 Men's · UMass at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Men's · UMass at NCAA Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 UMass vs Liberty | W, 3-2",
 "Final Aug 30 UMass at Maine | W, 7-0",
 "Final Sep 4 UMass vs Boston University | W, 5-1",
 "Final Sep 6 UMass vs UMass Lowell | W, 3-1",
 "Final Sep 11 UMass at Harvard | W, 3-1",
 "Final Sep 13 UMass vs New Hampshire | W, 6-0",
 "Final Sep 18 UMass vs Ohio | W, 6-0",
 "Final Sep 20 UMass at UAlbany | W, 3-0",
 "Final Sep 25 UMass at Kent State | W, 7-0",
 "Final Sep 27 UMass at Central Michigan | W, 3-0",
 "Final Oct 2 UMass vs Miami (OH) | W, 3-2",
 "Final Oct 4 UMass at UConn | L, 1-2",
 "Final Oct 9 UMass vs Appalachian State | W, 5-0",
 "Final Oct 11 UMass at Brown | W, 4-0",
 "Final Oct 16 UMass at Ball State | W, 7-1",
 "Final Oct 18 UMass at Bellarmine | W, 11-0",
 "Upcoming Oct 23, 2:30 PM UMass at Longwood | ",
 "Upcoming Oct 30, 2:00 PM UMass vs James Madison | ",
 "Upcoming Nov 4 UMass at MAC Championship Quarterfinals | ",
 "Upcoming Nov 5 UMass at MAC Championship Semifinals | ",
 "Upcoming Nov 7 UMass at MAC Championship Championship Game | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 UMass at Rutgers | W, 37-21",
 "Final Sep 12 UMass vs Sacred Heart | W, 37-10",
 "Final Sep 19 UMass vs Stonehill | W, 36-14",
 "Final Sep 26 UMass at Sacramento State | W, 35-6",
 "Final Oct 3 UMass vs Eastern Michigan | L, 14-38",
 "Final Oct 10 UMass vs Miami (OH) | L, 19-20",
 "Final Oct 17 UMass at Buffalo | L, 18-25",
 "Upcoming Oct 23, 7:00 PM UMass at UConn | ",
 "Upcoming Nov 4 UMass vs Ball State | ",
 "Upcoming Nov 11 UMass at Toledo | ",
 "Upcoming Nov 18 UMass vs Akron | ",
 "Upcoming Nov 28, 12:00 PM UMass at Bowling Green | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 UMass at Colorado College | L, 0-2",
 "Final Oct 3 UMass at Colorado College | L, 1-6",
 "Final Oct 9 UMass vs RIT | T, 2-2",
 "Final Oct 10 UMass vs RIT | W, 5-1",
 "Final Oct 16 UMass vs Northeastern | W, 4-1",
 "Final Oct 17 UMass vs Northeastern | L, 1-4",
 "Upcoming Oct 24, 6:00 PM UMass vs Stonehill | ",
 "Upcoming Oct 29, 7:00 PM UMass at Harvard | ",
 "Upcoming Oct 30, 7:00 PM UMass vs Harvard | ",
 "Upcoming Nov 6, 7:00 PM UMass at Maine | ",
 "Upcoming Nov 7, 7:00 PM UMass at Maine | ",
 "Upcoming Nov 13, 7:00 PM UMass vs Boston College | ",
 "Upcoming Nov 14, 7:00 PM UMass at Boston College | ",
 "Upcoming Nov 19, 6:00 PM UMass vs Providence | ",
 "Upcoming Nov 21 UMass at Providence | ",
 "Upcoming Dec 4, 7:00 PM UMass vs Northeastern | ",
 "Upcoming Dec 5, 6:00 PM UMass vs Northeastern | ",
 "Upcoming Dec 11, 7:00 PM UMass at Merrimack | ",
 "Upcoming Dec 12, 7:00 PM UMass vs Merrimack | ",
 "Upcoming Dec 29, 4:00 PM UMass vs Wisconsin/Arizona State/Northern Michigan | ",
 "Upcoming Dec 30 UMass vs Wisconsin/Arizona State/Northern Michigan | ",
 "Upcoming Jan 8, 7:00 PM UMass at Boston University | ",
 "Upcoming Jan 9, 7:00 PM UMass vs Boston University | ",
 "Upcoming Jan 22, 7:00 PM UMass vs Vermont | ",
 "Upcoming Jan 23, 7:00 PM UMass vs Vermont | ",
 "Upcoming Feb 2, 7:00 PM UMass vs UMass Lowell | ",
 "Upcoming Feb 6, 7:00 PM UMass at New Hampshire | ",
 "Upcoming Feb 12, 7:00 PM UMass vs New Hampshire | ",
 "Upcoming Feb 13, 7:30 PM UMass vs New Hampshire | ",
 "Upcoming Feb 19, 7:00 PM UMass vs UMass Lowell | ",
 "Upcoming Feb 20, 6:05 PM UMass at UMass Lowell | ",
 "Upcoming Feb 25, 7:00 PM UMass vs UConn | ",
 "Upcoming Feb 27, 2:00 PM UMass at UConn | ",
 "Upcoming Mar 5, 7:00 PM UMass at Boston College | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Nov 1 UMass vs Princeton Chase | ",
 "Upcoming Mar 26 UMass at Sarasota 2K | ",
 "Upcoming Apr 10 UMass at Knecht Cup | ",
 "Upcoming Apr 17 UMass vs Holy Cross/Boston College/UConn | ",
 "Upcoming May 2 UMass vs Eastern Sprints | ",
 "Upcoming May 15 UMass at MAC Rowing Championships | ",
 "Upcoming May 28 UMass at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UMass at St. John's | W, 2-1",
 "Final Aug 20 Women's · UMass vs NJIT | W, 1-0",
 "Final Aug 24 Women's · UMass at Harvard | W, 4-3",
 "Final Sep 3 Women's · UMass at Brown | L, 1-4",
 "Final Sep 6 Women's · UMass vs UMass Lowell | W, 4-1",
 "Final Sep 10 Women's · UMass vs Yale | W, 5-1",
 "Final Sep 13 Women's · UMass at Northeastern | W, 3-0",
 "Final Sep 17 Women's · UMass at Ball State | W, 1-0",
 "Final Sep 20 Women's · UMass at Ohio | W, 2-0",
 "Final Sep 26 Women's · UMass vs Kent State | W, 1-0",
 "Final Oct 1 Women's · UMass at Bowling Green | T, 2-2",
 "Final Oct 4 Women's · UMass vs Toledo | T, 0-0",
 "Final Oct 11 Women's · UMass vs Akron | T, 1-1",
 "Final Oct 15 Women's · UMass at Buffalo | T, 0-0",
 "Final Oct 18 Women's · UMass vs Miami (OH) | W, 3-2",
 "Upcoming Oct 24, 12:00 PM Women's · UMass vs Central Michigan | ",
 "Upcoming Oct 29, 3:00 PM Women's · UMass vs Western Michigan | ",
 "Upcoming Nov 1, 12:00 PM Women's · UMass at Eastern Michigan | ",
 "Upcoming Nov 7 Women's · UMass at MAC Quarterfinals | ",
 "Upcoming Nov 10 Women's · UMass at MAC Semifinals | ",
 "Upcoming Nov 13 Women's · UMass at MAC Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UMass at Bryant | T, 2-2",
 "Final Aug 23 Men's · UMass vs Connecticut | W, 3-1",
 "Final Aug 28 Men's · UMass at Harvard | L, 1-4",
 "Final Sep 2 Men's · UMass vs Massachusetts Lowell | W, 1-0",
 "Final Sep 7 Men's · UMass vs Princeton | L, 0-2",
 "Final Sep 12 Men's · UMass vs New Hampshire | L, 0-1",
 "Final Sep 16 Men's · UMass at Stonehill | W, 1-0",
 "Final Sep 19 Men's · UMass at Yale | W, 2-1",
 "Final Sep 23 Men's · UMass vs FDU | L, 1-2",
 "Final Sep 29 Men's · UMass at Vermont | L, 0-3",
 "Final Oct 3 Men's · UMass at Oral Roberts | T, 1-1",
 "Final Oct 10 Men's · UMass vs Nebraska at Omaha | L, 0-3",
 "Final Oct 13 Men's · UMass at Dartmouth | T, 1-1",
 "Final Oct 17 Men's · UMass vs St. Thomas | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Men's · UMass at Kansas City | ",
 "Upcoming Oct 31, 1:00 PM Men's · UMass vs Delaware | ",
 "Upcoming Nov 4 Men's · UMass at Summit League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · UMass at Colgate Invitational | Completed",
 "Upcoming Oct 31, 1:30 PM Women's · UMass at Boston University | ",
 "Upcoming Nov 20, 10:00 AM Women's · UMass at Terrier Invitational | ",
 "Upcoming Dec 5, 10:00 AM Women's · UMass vs La Salle | ",
 "Upcoming Dec 5, 10:00 AM Women's · UMass vs Rhode Island | ",
 "Upcoming Dec 10 Women's · UMass at USA Winter Diving Nationals | ",
 "Upcoming Jan 8 Women's · UMass at Buffalo Diving Invitational | ",
 "Upcoming Jan 9, 1:00 PM Women's · UMass vs UConn | ",
 "Upcoming Jan 16, 11:00 AM Women's · UMass vs Fordham | ",
 "Upcoming Jan 22, 5:00 PM Women's · UMass at Dartmouth Invitational | ",
 "Upcoming Jan 29, 12:00 PM Women's · UMass at Bryant | ",
 "Upcoming Jan 30, 10:00 AM Women's · UMass at Fairfield | ",
 "Upcoming Feb 13 Women's · UMass at Princeton Diving Invitational | ",
 "Upcoming Feb 24, 10:00 AM Women's · UMass at MAC Championships | ",
 "Upcoming Mar 8 Women's · UMass at NCAA Zone A Diving Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · UMass at Colgate Invitational | Completed",
 "Upcoming Oct 31, 1:30 PM Men's · UMass at Boston University | ",
 "Upcoming Nov 20, 10:00 AM Men's · UMass at Terrier Invitational | ",
 "Upcoming Dec 10 Men's · UMass at USA Winter Diving Nationals | ",
 "Upcoming Jan 8 Men's · UMass at Buffalo Diving Invitational | ",
 "Upcoming Jan 13, 12:00 PM Men's · UMass at Harvard | ",
 "Upcoming Jan 16, 11:00 AM Men's · UMass vs Fordham | ",
 "Upcoming Jan 22, 5:00 PM Men's · UMass at Dartmouth Invitational | ",
 "Upcoming Jan 29, 12:00 PM Men's · UMass at Bryant | ",
 "Upcoming Jan 30, 10:00 AM Men's · UMass at Fairfield | ",
 "Upcoming Feb 13 Men's · UMass at Princeton Diving Invitational | ",
 "Upcoming Feb 17 Men's · UMass at Missouri Valley Conference Championships | ",
 "Upcoming Mar 8 Men's · UMass at NCAA Zone A Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 UMass at ITA All-American Championships | Completed",
 "Final Sep 25 UMass at 2026 Fall Tennis | Completed",
 "Final Oct 8 UMass at New England Regionals | Completed",
 "Final Oct 17 UMass at Brown Invitational | Completed",
 "Upcoming Oct 23 UMass at MAC Individual Championships | ",
 "Upcoming Nov 6 UMass at Big Green Invite | "
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
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UMass module checks passed");
