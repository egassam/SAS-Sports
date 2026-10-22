import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {louisianaTechSchool} from '../src/schools/louisiana-tech.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='louisiana-tech');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,louisianaTechHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/louisiana-tech-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit latechsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['louisiana-tech'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',louisianaTechSchool.scheduleUrls],['roster',louisianaTechSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('louisiana-tech|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'latechsports.com',`${key} must stay on latechsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://latechsports.com/sports/baseball/schedule"],"roster":["https://latechsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://latechsports.com/sports/mens-basketball/schedule","https://latechsports.com/sports/womens-basketball/schedule"],"roster":["https://latechsports.com/sports/mens-basketball/roster","https://latechsports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://latechsports.com/sports/womens-bowling/schedule"],"roster":["https://latechsports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://latechsports.com/sports/cross-country/schedule"],"roster":["https://latechsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://latechsports.com/sports/football/schedule"],"roster":["https://latechsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://latechsports.com/sports/mens-golf/schedule"],"roster":["https://latechsports.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://latechsports.com/sports/womens-soccer/schedule"],"roster":["https://latechsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://latechsports.com/sports/softball/schedule"],"roster":["https://latechsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://latechsports.com/sports/womens-tennis/schedule"],"roster":["https://latechsports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://latechsports.com/sports/track-and-field/schedule"],"roster":["https://latechsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://latechsports.com/sports/womens-volleyball/schedule"],"roster":["https://latechsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'louisiana-tech|"+sport+"':"),`${sport} routes must live in the Louisiana Tech module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://latechsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.louisianaTechHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=louisiana-tech)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Nov 1 Louisiana Tech vs Jacksonville State | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Men's · Louisiana Tech vs Kent State | ",
 "Upcoming Nov 5, 6:30 PM Men's · Louisiana Tech vs Arkansas-Monticello | ",
 "Upcoming Nov 9, 7:00 PM Men's · Louisiana Tech at LSU | ",
 "Upcoming Nov 14, 7:00 PM Men's · Louisiana Tech at Nicholls | ",
 "Upcoming Nov 17, 6:30 PM Men's · Louisiana Tech vs Jacksonville State | ",
 "Upcoming Nov 19, 6:30 PM Men's · Louisiana Tech vs Tulane | ",
 "Upcoming Nov 24, 6:30 PM Men's · Louisiana Tech vs Alcorn State | ",
 "Upcoming Nov 27, 2:00 PM Men's · Louisiana Tech vs Texas State | ",
 "Upcoming Dec 2 Men's · Louisiana Tech at Texas State | ",
 "Upcoming Dec 6, 3:00 PM Men's · Louisiana Tech at Jacksonville State | ",
 "Upcoming Dec 9, 6:30 PM Men's · Louisiana Tech vs Arkansas Baptist College | ",
 "Upcoming Dec 12, 3:00 PM Men's · Louisiana Tech vs Stephen F. Austin | ",
 "Upcoming Dec 16, 7:30 PM Men's · Louisiana Tech at Troy | ",
 "Upcoming Dec 19, 3:00 PM Men's · Louisiana Tech vs Appalachian State | ",
 "Upcoming Dec 22, 2:00 PM Men's · Louisiana Tech vs Jackson State | ",
 "Upcoming Dec 31, 2:00 PM Men's · Louisiana Tech at Coastal Carolina | ",
 "Upcoming Jan 2, 1:00 PM Men's · Louisiana Tech at Old Dominion | ",
 "Upcoming Jan 7, 6:30 PM Men's · Louisiana Tech vs James Madison | ",
 "Upcoming Jan 9, 3:00 PM Men's · Louisiana Tech vs Marshall | ",
 "Upcoming Jan 14, 6:30 PM Men's · Louisiana Tech vs Arkansas State | ",
 "Upcoming Jan 16 Men's · Louisiana Tech at South Alabama | ",
 "Upcoming Jan 21, 6:30 PM Men's · Louisiana Tech vs Troy | ",
 "Upcoming Jan 23, 2:30 PM Men's · Louisiana Tech at ULM | ",
 "Upcoming Jan 28, 7:30 PM Men's · Louisiana Tech vs Southern Miss | ",
 "Upcoming Jan 30, 3:00 PM Men's · Louisiana Tech vs South Alabama | ",
 "Upcoming Feb 3, 7:00 PM Men's · Louisiana Tech at UL-Lafayette | ",
 "Upcoming Feb 6 Men's · Louisiana Tech at MAC-SBC Challenge | ",
 "Upcoming Feb 11, 7:30 PM Men's · Louisiana Tech at Southern Miss | ",
 "Upcoming Feb 13, 3:00 PM Men's · Louisiana Tech vs ULM | ",
 "Upcoming Feb 20 Men's · Louisiana Tech at Georgia Southern | ",
 "Upcoming Feb 24, 6:30 PM Men's · Louisiana Tech vs UL-Lafayette | ",
 "Upcoming Feb 26 Men's · Louisiana Tech at Arkansas State | ",
 "Upcoming Mar 2 Men's · Louisiana Tech at Sun Belt Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Louisiana Tech at Toledo | ",
 "Upcoming Nov 5, 11:00 AM Women's · Louisiana Tech vs Texas A&M-Texarkana | ",
 "Upcoming Nov 8, 1:00 PM Women's · Louisiana Tech at McNeese | ",
 "Upcoming Nov 12, 6:30 PM Women's · Louisiana Tech vs Northwestern State | ",
 "Upcoming Nov 15, 2:00 PM Women's · Louisiana Tech at Ole Miss | ",
 "Upcoming Nov 18, 6:30 PM Women's · Louisiana Tech vs Arkansas-Pine Bluff | ",
 "Upcoming Nov 22, 2:00 PM Women's · Louisiana Tech at Georgia | ",
 "Upcoming Nov 25, 12:00 PM Women's · Louisiana Tech vs Mississippi Valley State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Louisiana Tech at Arkansas | ",
 "Upcoming Dec 7, 6:30 PM Women's · Louisiana Tech vs Memphis | ",
 "Upcoming Dec 10, 6:30 PM Women's · Louisiana Tech at Stephen F. Austin | ",
 "Upcoming Dec 13, 2:00 PM Women's · Louisiana Tech vs East Texas A&M | ",
 "Upcoming Dec 16, 6:30 PM Women's · Louisiana Tech vs UL-Lafayette | ",
 "Upcoming Dec 19, 1:00 PM Women's · Louisiana Tech at Appalachian State | ",
 "Upcoming Dec 21, 6:30 PM Women's · Louisiana Tech vs Central Baptist | ",
 "Upcoming Dec 31, 6:30 PM Women's · Louisiana Tech vs Coastal Carolina | ",
 "Upcoming Jan 2, 3:00 PM Women's · Louisiana Tech vs Old Dominion | ",
 "Upcoming Jan 7, 7:00 PM Women's · Louisiana Tech at Marshall | ",
 "Upcoming Jan 9, 1:00 PM Women's · Louisiana Tech at James Madison | ",
 "Upcoming Jan 16, 3:00 PM Women's · Louisiana Tech vs Georgia Southern | ",
 "Upcoming Jan 21, 5:00 PM Women's · Louisiana Tech at UL-Lafayette | ",
 "Upcoming Jan 23, 12:00 PM Women's · Louisiana Tech at ULM | ",
 "Upcoming Jan 28, 5:00 PM Women's · Louisiana Tech vs Southern Miss | ",
 "Upcoming Jan 30, 5:30 PM Women's · Louisiana Tech vs Troy | ",
 "Upcoming Feb 3, 6:30 PM Women's · Louisiana Tech vs ULM | ",
 "Upcoming Feb 6, 3:00 PM Women's · Louisiana Tech vs MAC-SBC Challenge | ",
 "Upcoming Feb 11, 6:30 PM Women's · Louisiana Tech at South Alabama | ",
 "Upcoming Feb 13, 2:00 PM Women's · Louisiana Tech at Southern Miss | ",
 "Upcoming Feb 17, 6:30 PM Women's · Louisiana Tech vs Arkansas State | ",
 "Upcoming Feb 20, 3:00 PM Women's · Louisiana Tech vs South Alabama | ",
 "Upcoming Feb 23, 6:00 PM Women's · Louisiana Tech at Troy | ",
 "Upcoming Feb 26, 7:00 PM Women's · Louisiana Tech at Arkansas State | ",
 "Upcoming Mar 2 Women's · Louisiana Tech at Sun Belt Conference Championship | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 3 Louisiana Tech at SWIBC I | 2nd",
 "Final Oct 4 Louisiana Tech at SWIBC II | 1st",
 "Final Oct 9 Louisiana Tech vs Florida A&M | W, 993-811",
 "Final Oct 9 Louisiana Tech vs Alabama State | W, 922-914",
 "Final Oct 9 Louisiana Tech vs UAB | W, 1051-855",
 "Final Oct 9 Louisiana Tech vs Jackson State | W, 961-894",
 "Final Oct 9 Louisiana Tech vs Alabama A&M | W, 929-784",
 "Final Oct 10 Louisiana Tech vs North Carolina A&T | L, 979-1063",
 "Final Oct 10 Louisiana Tech vs Emmanuel | W, 966-819",
 "Final Oct 10 Louisiana Tech vs Texas Southern | W, 1099-883",
 "Final Oct 10 Louisiana Tech vs Southern | W, 1036-690",
 "Final Oct 10 Louisiana Tech vs Sam Houston | W, 1085-973",
 "Final Oct 11 Louisiana Tech vs North Carolina A&T (Game 1) | W, 4-1",
 "Final Oct 11 Louisiana Tech vs Prairie View A&M | W, 4-2",
 "Final Oct 11 Louisiana Tech vs North Carolina A&T (Game 2) | W, 4.5-1.5",
 "Upcoming Oct 30 Louisiana Tech at Destination Orlando | ",
 "Upcoming Nov 6 Louisiana Tech at Bulldog Classic | ",
 "Upcoming Nov 13 Louisiana Tech at Track Kat Klash | ",
 "Upcoming Jan 15 Louisiana Tech at Northeast Classic | ",
 "Upcoming Jan 22 Louisiana Tech at Prairie View Invitational | ",
 "Upcoming Jan 29 Louisiana Tech at Columbia 300 Saints Invite | ",
 "Upcoming Feb 12 Louisiana Tech at TNBA Open | ",
 "Upcoming Feb 19 Louisiana Tech at Big Red Invite | ",
 "Upcoming Mar 5 Louisiana Tech at Music City Classic | ",
 "Upcoming Mar 12 Louisiana Tech at USBC ISC/ITC Sectionals | ",
 "Upcoming Apr 5 Louisiana Tech at NCAA Championships | ",
 "Upcoming Apr 14 Louisiana Tech at ISC/ITC Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Louisiana Tech at NSU Demon Invitational | Completed",
 "Final Sep 25 Louisiana Tech at Warhawk Invitational | Women's team: 2nd / Men's team: 3rd",
 "Final Oct 3 Louisiana Tech at Belhaven Invitational | Women's team: 1st / Men's team: 4th",
 "Final Oct 16 Louisiana Tech at Watson Cross Country Classic | Women's team: 5th / Men's team: 10th",
 "Upcoming Oct 30 Louisiana Tech at Sun Belt Conference Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Louisiana Tech vs Northwestern State | W, 80-6",
 "Final Sep 12 Louisiana Tech at LSU | L, 14-45",
 "Final Sep 19 Louisiana Tech at Baylor | L, 19-36",
 "Final Oct 3 Louisiana Tech vs Army | W, 31-29",
 "Final Oct 10 Louisiana Tech vs UL-Lafayette | W, 32-31",
 "Final Oct 17 Louisiana Tech at ULM | W, 24-0",
 "Upcoming Oct 24, 4:00 PM Louisiana Tech vs Old Dominion | ",
 "Upcoming Oct 31, 2:00 PM Louisiana Tech at South Alabama | ",
 "Upcoming Nov 7 Louisiana Tech at Troy | ",
 "Upcoming Nov 14 Louisiana Tech vs Southern Miss | ",
 "Upcoming Nov 21 Louisiana Tech vs Arkansas State | ",
 "Upcoming Nov 28 Louisiana Tech at Georgia Southern | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Louisiana Tech at Florida Atlantic Invitational | 7th",
 "Final Sep 27 Louisiana Tech at Argent Financial Classic | 3rd",
 "Final Oct 4 Louisiana Tech at Trinity Forest Invitational | Completed",
 "Final Oct 19 Louisiana Tech at The Clerico | Completed",
 "Upcoming Feb 1 Louisiana Tech at Sea Best Invitational | ",
 "Upcoming Feb 15 Louisiana Tech at Hal Williams Collegiate | ",
 "Upcoming Mar 8 Louisiana Tech at Louisiana Classics | ",
 "Upcoming Mar 15 Louisiana Tech at All-American Intercollegiate | ",
 "Upcoming Mar 30 Louisiana Tech at Maridoe Collegiate | ",
 "Upcoming Apr 12 Louisiana Tech at Everett Buick GMC Classic | ",
 "Upcoming Apr 26 Louisiana Tech at Sun Belt Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Louisiana Tech vs Nicholls | T, 2-2",
 "Final Aug 16 Louisiana Tech vs Southeastern Louisiana | L, 1-5",
 "Final Aug 20 Louisiana Tech vs Lamar | L, 0-1",
 "Final Aug 27 Louisiana Tech at Houston Christian | W, 1-0",
 "Final Aug 30 Louisiana Tech at Stephen F. Austin | W, 3-1",
 "Final Sep 3 Louisiana Tech vs McNeese | L, 0-2",
 "Final Sep 6 Louisiana Tech at Northwestern State | L, 2-5",
 "Final Sep 13 Louisiana Tech vs Texas State | L, 1-3",
 "Final Sep 19 Louisiana Tech at Marshall | T, 1-1",
 "Final Sep 24 Louisiana Tech vs Appalachian State | L, 0-2",
 "Final Sep 27 Louisiana Tech at Southern Miss | L, 1-2",
 "Final Oct 4 Louisiana Tech vs ULM | W, 3-2",
 "Final Oct 8 Louisiana Tech at Troy | L, 2-4",
 "Final Oct 11 Louisiana Tech vs Arkansas State | W, 2-0",
 "Final Oct 15 Louisiana Tech at James Madison | L, 1-3",
 "Today Oct 22, 7:30 PM Louisiana Tech vs Old Dominion | ",
 "Upcoming Oct 25, 1:00 PM Louisiana Tech at UL-Lafayette | ",
 "Upcoming Nov 1, 1:00 PM Louisiana Tech vs South Alabama | ",
 "Upcoming Nov 9 Louisiana Tech at SBC Championship Quarterfinals | ",
 "Upcoming Nov 11 Louisiana Tech at SBC Championship Semifinals | ",
 "Upcoming Nov 14 Louisiana Tech at SBC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 6:00 PM Louisiana Tech vs Grambling State (Exhibition) | ",
 "Upcoming Oct 28, 5:00 PM Louisiana Tech vs Grayson College | ",
 "Upcoming Oct 29, 5:00 PM Louisiana Tech vs Jones College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Louisiana Tech at ITA All-American Championships | Completed",
 "Final Sep 25 Louisiana Tech at Rice Fall Invitational | Completed",
 "Final Oct 8 Louisiana Tech at ITA Regionals | Completed",
 "Upcoming Oct 31 Louisiana Tech at Bulldog Invitational | ",
 "Upcoming Nov 5 Louisiana Tech at ITA Conference Masters | ",
 "Upcoming Nov 17 Louisiana Tech at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Louisiana Tech vs Iona | W, 3-0",
 "Final Aug 29 Louisiana Tech vs Houston Christian | W, 3-2",
 "Final Aug 30 Louisiana Tech vs Little Rock | L, 0-3",
 "Final Sep 3 Louisiana Tech vs Chicago State | W, 3-0",
 "Final Sep 4 Louisiana Tech at Omaha | L, 0-3",
 "Final Sep 5 Louisiana Tech vs Western Michigan | L, 1-3",
 "Final Sep 8 Louisiana Tech vs Alcorn State | W, 3-0",
 "Final Sep 10 Louisiana Tech vs Grambling | W, 3-1",
 "Final Sep 11 Louisiana Tech vs Mississippi Valley State | W, 3-0",
 "Final Sep 12 Louisiana Tech vs McNeese | L, 0-3",
 "Final Sep 15 Louisiana Tech at Northwestern State | L, 0-3",
 "Final Sep 17 Louisiana Tech at Abilene Christian | L, 0-3",
 "Final Sep 18 Louisiana Tech vs Stephen F. Austin | L, 1-3",
 "Final Sep 19 Louisiana Tech vs Prairie View A&M | W, 3-0",
 "Final Sep 25 Louisiana Tech vs Southern Miss | L, 0-3",
 "Final Sep 26 Louisiana Tech vs Southern Miss | L, 1-3",
 "Final Oct 1 Louisiana Tech at South Alabama | L, 0-3",
 "Final Oct 3 Louisiana Tech at South Alabama | L, 1-3",
 "Final Oct 9 Louisiana Tech at UL-Lafayette | L, 0-3",
 "Final Oct 10 Louisiana Tech at UL-Lafayette | L, 1-3",
 "Final Oct 16 Louisiana Tech vs Troy | L, 1-3",
 "Final Oct 17 Louisiana Tech vs Troy | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Louisiana Tech at ULM | ",
 "Upcoming Oct 24, 1:00 PM Louisiana Tech at ULM | ",
 "Upcoming Oct 27, 6:00 PM Louisiana Tech at Arkansas-Pine Bluff | ",
 "Upcoming Oct 30, 6:00 PM Louisiana Tech vs Old Dominion | ",
 "Upcoming Oct 31, 11:00 AM Louisiana Tech vs Old Dominion | ",
 "Upcoming Nov 6, 6:00 PM Louisiana Tech vs Arkansas State | ",
 "Upcoming Nov 7, 1:00 PM Louisiana Tech vs Arkansas State | ",
 "Upcoming Nov 12, 6:00 PM Louisiana Tech at Georgia State | ",
 "Upcoming Nov 13, 3:00 PM Louisiana Tech at Georgia State | ",
 "Upcoming Nov 19 Louisiana Tech at Sun Belt Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Louisiana Tech module checks passed");
