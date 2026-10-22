import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southernMissSchool} from '../src/schools/southern-miss.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southern-miss');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southernMissHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southern-miss-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit southernmiss.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southern-miss'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southernMissSchool.scheduleUrls],['roster',southernMissSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southern-miss|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'southernmiss.com',`${key} must stay on southernmiss.com`);
  }
}
const parity={"Baseball":{"schedule":["https://southernmiss.com/sports/baseball/schedule"],"roster":["https://southernmiss.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://southernmiss.com/sports/mens-basketball/schedule","https://southernmiss.com/sports/womens-basketball/schedule"],"roster":["https://southernmiss.com/sports/mens-basketball/roster","https://southernmiss.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://southernmiss.com/sports/bvb/schedule"],"roster":["https://southernmiss.com/sports/bvb/roster"],"combined":false},"Cross Country":{"schedule":["https://southernmiss.com/sports/womens-cross-country/schedule"],"roster":["https://southernmiss.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://southernmiss.com/sports/football/schedule"],"roster":["https://southernmiss.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://southernmiss.com/sports/womens-golf/schedule","https://southernmiss.com/sports/mens-golf/schedule"],"roster":["https://southernmiss.com/sports/womens-golf/roster","https://southernmiss.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://southernmiss.com/sports/womens-soccer/schedule"],"roster":["https://southernmiss.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://southernmiss.com/sports/softball/schedule"],"roster":["https://southernmiss.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://southernmiss.com/sports/womens-tennis/schedule","https://southernmiss.com/sports/mens-tennis/schedule"],"roster":["https://southernmiss.com/sports/womens-tennis/roster","https://southernmiss.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://southernmiss.com/sports/track-and-field/schedule"],"roster":["https://southernmiss.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://southernmiss.com/sports/womens-volleyball/schedule"],"roster":["https://southernmiss.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southern-miss|"+sport+"':"),`${sport} routes must live in the Southern Miss module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://southernmiss.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southernMissHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southern-miss)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Southern Miss vs LSU New Orleans (Exhibition) | L, 72-82",
 "Upcoming Oct 28, 6:00 PM Men's · Southern Miss at Houston Christian (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Southern Miss vs Tougaloo | ",
 "Upcoming Nov 6, 7:00 PM Men's · Southern Miss at Iowa State | ",
 "Upcoming Nov 11, 7:00 PM Men's · Southern Miss vs Jackson State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Southern Miss at Texas State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Southern Miss vs UT Arlington | ",
 "Upcoming Nov 19, 6:00 PM Men's · Southern Miss at Grambling State | ",
 "Upcoming Nov 21, 4:00 PM Men's · Southern Miss vs Nicholls | ",
 "Upcoming Nov 22, 5:00 PM Men's · Southern Miss vs Valparaiso | ",
 "Upcoming Nov 29, 3:00 PM Men's · Southern Miss vs Grambling State | ",
 "Upcoming Dec 2, 7:30 PM Men's · Southern Miss vs Tulane | ",
 "Upcoming Dec 5, 7:30 PM Men's · Southern Miss at Oregon State | ",
 "Upcoming Dec 10, 6:30 PM Men's · Southern Miss at McNeese | ",
 "Upcoming Dec 14, 7:00 PM Men's · Southern Miss vs Tuskegee | ",
 "Upcoming Dec 19, 2:00 PM Men's · Southern Miss vs James Madison | ",
 "Upcoming Dec 22, 3:00 PM Men's · Southern Miss vs Ole Miss | ",
 "Upcoming Dec 31, 12:00 PM Men's · Southern Miss at Georgia State | ",
 "Upcoming Jan 2, 2:00 PM Men's · Southern Miss at Georgia Southern | ",
 "Upcoming Jan 7, 7:00 PM Men's · Southern Miss vs Coastal Carolina | ",
 "Upcoming Jan 9, 2:00 PM Men's · Southern Miss vs Old Dominion | ",
 "Upcoming Jan 13, 7:30 PM Men's · Southern Miss vs Troy | ",
 "Upcoming Jan 16, 2:30 PM Men's · Southern Miss at Arkansas State | ",
 "Upcoming Jan 20, 7:00 PM Men's · Southern Miss vs ULM | ",
 "Upcoming Jan 23, 3:00 PM Men's · Southern Miss at South Alabama | ",
 "Upcoming Jan 28, 7:30 PM Men's · Southern Miss at Louisiana Tech | ",
 "Upcoming Jan 30, 2:00 PM Men's · Southern Miss vs Louisiana | ",
 "Upcoming Feb 6, 12:00 PM Men's · Southern Miss at App State | ",
 "Upcoming Feb 11, 7:30 PM Men's · Southern Miss vs Louisiana Tech | ",
 "Upcoming Feb 13, 4:00 PM Men's · Southern Miss at Louisiana | ",
 "Upcoming Feb 17, 6:30 PM Men's · Southern Miss at ULM | ",
 "Upcoming Feb 20, 4:15 PM Men's · Southern Miss at Troy | ",
 "Upcoming Feb 24, 7:30 PM Men's · Southern Miss vs Arkansas State | ",
 "Upcoming Feb 26, 8:00 PM Men's · Southern Miss vs South Alabama | ",
 "Upcoming Mar 2 Men's · Southern Miss at Sun Belt Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · Southern Miss vs East Texas Baptist (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Southern Miss vs Mississippi Christian | ",
 "Upcoming Nov 5 Women's · Southern Miss at Auburn | ",
 "Upcoming Nov 9, 6:00 PM Women's · Southern Miss vs Mississippi Valley State | ",
 "Upcoming Nov 12, 6:00 PM Women's · Southern Miss vs Jackson State | ",
 "Upcoming Nov 16, 6:00 PM Women's · Southern Miss vs Jacksonville State | ",
 "Upcoming Nov 18, 6:00 PM Women's · Southern Miss vs McNeese | ",
 "Upcoming Nov 22, 2:00 PM Women's · Southern Miss vs Mississippi State | ",
 "Upcoming Nov 27, 1:30 PM Women's · Southern Miss vs Drexel | ",
 "Upcoming Nov 28, 10:00 AM Women's · Southern Miss vs Iona -or- UMBC | ",
 "Upcoming Dec 2, 5:00 PM Women's · Southern Miss vs West Alabama | ",
 "Upcoming Dec 6, 2:00 PM Women's · Southern Miss at UAB | ",
 "Upcoming Dec 11, 8:30 PM Women's · Southern Miss at Fresno State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Southern Miss vs South Alabama | ",
 "Upcoming Dec 19 Women's · Southern Miss at Old Dominion | ",
 "Upcoming Dec 21, 12:00 PM Women's · Southern Miss at VCU | ",
 "Upcoming Dec 31, 6:00 PM Women's · Southern Miss vs App State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Southern Miss vs Georgia Southern | ",
 "Upcoming Jan 6, 5:00 PM Women's · Southern Miss at James Madison | ",
 "Upcoming Jan 9, 12:00 PM Women's · Southern Miss at Coastal Carolina | ",
 "Upcoming Jan 13, 5:00 PM Women's · Southern Miss vs Troy | ",
 "Upcoming Jan 16, 2:00 PM Women's · Southern Miss vs ULM | ",
 "Upcoming Jan 20, 11:30 AM Women's · Southern Miss at South Alabama | ",
 "Upcoming Jan 23, 1:00 PM Women's · Southern Miss at Louisiana | ",
 "Upcoming Jan 28, 5:00 PM Women's · Southern Miss at Louisiana Tech | ",
 "Upcoming Jan 30, 2:30 PM Women's · Southern Miss at Arkansas State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Southern Miss vs Louisiana | ",
 "Upcoming Feb 11, 5:00 PM Women's · Southern Miss vs Arkansas State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Southern Miss vs Louisiana Tech | ",
 "Upcoming Feb 17, 6:00 PM Women's · Southern Miss at Troy | ",
 "Upcoming Feb 20, 12:00 PM Women's · Southern Miss at ULM | ",
 "Upcoming Feb 26, 6:00 PM Women's · Southern Miss vs Georgia State | ",
 "Upcoming Mar 2, 11:30 AM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship First Round | ",
 "Upcoming Mar 3, 11:30 AM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship Second Round | ",
 "Upcoming Mar 4, 11:30 AM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship Third Round | ",
 "Upcoming Mar 5, 11:30 AM Women's · Southern Miss at Fourth Round | ",
 "Upcoming Mar 6, 12:00 PM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship Quarterfinals | ",
 "Upcoming Mar 7, 11:30 AM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship Semifinals | ",
 "Upcoming Mar 8, 1:00 PM Women's · Southern Miss at 2027 Sun Belt Conference Women's Basketball Championship Championship | "
]);
  const v_bvb=parse("Beach Volleyball","bvb");
  assert.deepEqual(v_bvb.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Southern Miss at Battle for New Orleans | 2nd of 10",
 "Final Sep 18 Southern Miss at Florida State Pre-Regional | 2nd of 28",
 "Final Oct 3 Southern Miss at 38th Annual Chile Pepper Festival | 10th of 28",
 "Final Oct 16 Southern Miss at Alabama Crimson Classic | 12th of 19",
 "Upcoming Oct 30, 9:15 AM Southern Miss at Sun Belt Conference Women's Cross Country Championship | ",
 "Upcoming Nov 13 Southern Miss at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Southern Miss at NCAA Women's Cross Country Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Southern Miss vs Alcorn State | W, 49-3",
 "Final Sep 12 Southern Miss at Auburn | L, 8-43",
 "Final Sep 19 Southern Miss vs UConn | L, 20-48",
 "Final Sep 26 Southern Miss at Tulane | L, 21-24",
 "Final Oct 6 Southern Miss at Troy | L, 34-55",
 "Final Oct 17 Southern Miss vs Arkansas State | L, 13-23",
 "Upcoming Oct 24, 4:00 PM Southern Miss vs Louisiana | ",
 "Upcoming Oct 31, 2:30 PM Southern Miss at ULM | ",
 "Upcoming Nov 5, 7:00 PM Southern Miss vs James Madison | ",
 "Upcoming Nov 14, 4:00 PM Southern Miss at Louisiana Tech | ",
 "Upcoming Nov 21 Southern Miss vs South Alabama | ",
 "Upcoming Nov 28 Southern Miss at Old Dominion | ",
 "Upcoming Dec 4 Southern Miss at 2026 Credit Union 1 Sun Belt Football Championship presented by Visit Pensacola | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Southern Miss at Tulane Classic | 3rd of 12",
 "Final Sep 21 Women's · Southern Miss at Ben Connell Classic | T11th of 13",
 "Final Oct 5 Women's · Southern Miss at The Ally | T15th of 17",
 "Final Oct 16 Women's · Southern Miss at Ruth's Chris Tar Heel Invitational | 14th of 14",
 "Upcoming Oct 26 Women's · Southern Miss at The Judson | ",
 "Upcoming Feb 1 Women's · Southern Miss at UCF Challenge | ",
 "Upcoming Mar 1 Women's · Southern Miss at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 15 Women's · Southern Miss at Magnolia Collegiate | ",
 "Upcoming Mar 29 Women's · Southern Miss at ULM Invitational | ",
 "Upcoming Apr 19 Women's · Southern Miss at Sun Belt Championships | ",
 "Upcoming May 10 Women's · Southern Miss at NCAA Regionals | ",
 "Upcoming May 21 Women's · Southern Miss at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Southern Miss at JT Poston Invitational | 4th of 16",
 "Final Sep 27 Men's · Southern Miss at Badger Invitational | 1st of 19",
 "Final Oct 3 Men's · Southern Miss at Blessings Collegiate | 4th of 9",
 "Final Oct 17 Men's · Southern Miss at Fallen Oak Collegiate | Completed",
 "Upcoming Feb 7 Men's · Southern Miss at Campadres Collegiate | ",
 "Upcoming Feb 15 Men's · Southern Miss at Hal Williams Collegiate | ",
 "Upcoming Mar 8 Men's · Southern Miss at Louisiana Classics | ",
 "Upcoming Mar 14 Men's · Southern Miss at Michael A. Marino Classic | ",
 "Upcoming Apr 12 Men's · Southern Miss at Mossy Oak Collegiate | ",
 "Upcoming Apr 26 Men's · Southern Miss at Sun Belt Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Southern Miss at Alabama State | W, 4-0",
 "Final Aug 16 Southern Miss at McNeese | L, 0-1",
 "Final Aug 23 Southern Miss at Mississippi State | L, 0-4",
 "Final Aug 27 Southern Miss vs Southeastern | T, 2-2",
 "Final Sep 3 Southern Miss vs Jacksonville State | T, 1-1",
 "Final Sep 6 Southern Miss vs Southern | W, 8-0",
 "Final Sep 10 Southern Miss at Nicholls | W, 2-1",
 "Final Sep 18 Southern Miss vs James Madison | L, 0-5",
 "Final Sep 24 Southern Miss at Arkansas State | W, 1-0",
 "Final Sep 27 Southern Miss vs Louisiana Tech | W, 2-1",
 "Final Oct 3 Southern Miss vs Louisiana | L, 0-2",
 "Final Oct 8 Southern Miss at Coastal Carolina | L, 1-4",
 "Final Oct 11 Southern Miss vs Troy | T, 2-2",
 "Final Oct 16 Southern Miss at South Alabama | W, 1-0",
 "Final Oct 21 Southern Miss at App State | L, 1-3",
 "Upcoming Oct 25, 1:00 PM Southern Miss vs Georgia Southern | ",
 "Upcoming Nov 1, 1:00 PM Southern Miss at ULM | ",
 "Upcoming Nov 9 Southern Miss vs Quarterifnals | ",
 "Upcoming Nov 11 Southern Miss at 2026 Sun Belt Conference Women's Soccer Championship Semifinals | ",
 "Upcoming Nov 14 Southern Miss at 2026 Sun Belt Conference Women's Soccer Championship Championship Game | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 5:00 PM Southern Miss vs William Carey (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Southern Miss at Itawamba Community College (Exhibition) | ",
 "Upcoming Oct 25, 3:00 PM Southern Miss vs Alabama (Exhibition) | ",
 "Upcoming Oct 28, 5:00 PM Southern Miss vs Mississippi Gulf Coast Community College (Exhibition) | ",
 "Upcoming Oct 30, 5:00 PM Southern Miss vs Pearl River Community College (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Southern Miss at Ragin' Cajun Invitational | Completed",
 "Final Oct 8 Women's · Southern Miss at ITA Regionals | Completed",
 "Upcoming Oct 30 Women's · Southern Miss at 8th Annual Hatters Invitational | ",
 "Upcoming Nov 4 Women's · Southern Miss at Big Easy Fall Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Southern Miss at Spartan Fall Invitational | Completed",
 "Final Oct 8 Men's · Southern Miss at ITA D1 Men's Southern Regional Championships | Completed",
 "Upcoming Oct 23 Men's · Southern Miss at CCB Collegiate Invitational | ",
 "Upcoming Oct 30 Men's · Southern Miss at UWF Fall Fling Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 Southern Miss vs Nicholls (Exhibition) | W, 3-0",
 "Final Aug 28 Southern Miss vs Southern | W, 3-0",
 "Final Aug 29 Southern Miss vs Jacksonville | W, 3-2",
 "Final Aug 29 Southern Miss at Jacksonville State | W, 3-0",
 "Final Sep 5 Southern Miss vs Central Arkansas | W, 3-0",
 "Final Sep 5 Southern Miss at Ole Miss | L, 1-3",
 "Final Sep 10 Southern Miss vs Houston Christian | W, 3-0",
 "Final Sep 11 Southern Miss vs Lamar | W, 3-1",
 "Final Sep 12 Southern Miss vs Southern | W, 3-0",
 "Final Sep 12 Southern Miss vs Jackson State | W, 3-0",
 "Final Sep 17 Southern Miss at Memphis | L, 0-3",
 "Final Sep 18 Southern Miss vs Little Rock | W, 3-2",
 "Final Sep 25 Southern Miss at Louisiana Tech | W, 3-0",
 "Final Sep 26 Southern Miss at Louisiana Tech | W, 3-1",
 "Final Oct 2 Southern Miss vs Troy | L, 1-3",
 "Final Oct 3 Southern Miss vs Troy | L, 1-3",
 "Final Oct 8 Southern Miss vs Georgia State | L, 1-3",
 "Final Oct 9 Southern Miss vs Georgia State | W, 3-1",
 "Final Oct 15 Southern Miss at ULM | W, 3-0",
 "Final Oct 16 Southern Miss at ULM | W, 3-1",
 "Today Oct 22, 6:00 PM Southern Miss vs Arkansas State | ",
 "Upcoming Oct 23, 6:00 PM Southern Miss vs Arkansas State | ",
 "Upcoming Oct 30, 6:00 PM Southern Miss at Louisiana | ",
 "Upcoming Oct 31, 2:00 PM Southern Miss at Louisiana | ",
 "Upcoming Nov 6, 6:00 PM Southern Miss vs South Alabama | ",
 "Upcoming Nov 7, 2:00 PM Southern Miss vs South Alabama | ",
 "Upcoming Nov 12, 6:30 PM Southern Miss at Marshall | ",
 "Upcoming Nov 13, 5:00 PM Southern Miss at Marshall | ",
 "Upcoming Nov 19 Southern Miss at 2026 Sun Belt Conference Volleyball Championship First Round | ",
 "Upcoming Nov 20 Southern Miss at 2026 Sun Belt Conference Volleyball Championship Quarterfinals | ",
 "Upcoming Nov 21 Southern Miss at 2026 Sun Belt Conference Volleyball Championship Semifinals | ",
 "Upcoming Nov 22 Southern Miss at 2026 Sun Belt Conference Volleyball Championship Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bvb,"Beach Volleyball bvb");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southern Miss module checks passed");
