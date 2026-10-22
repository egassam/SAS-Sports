import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southAlabamaSchool} from '../src/schools/south-alabama.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-alabama');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southAlabamaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-alabama-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit usajaguars.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-alabama'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',southAlabamaSchool.scheduleUrls],['roster',southAlabamaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-alabama|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'usajaguars.com',`${key} must stay on usajaguars.com`);
  }
}
const parity={"Baseball":{"schedule":["https://usajaguars.com/sports/baseball/schedule"],"roster":["https://usajaguars.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://usajaguars.com/sports/mens-basketball/schedule","https://usajaguars.com/sports/womens-basketball/schedule"],"roster":["https://usajaguars.com/sports/mens-basketball/roster","https://usajaguars.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://usajaguars.com/sports/cross-country/schedule"],"roster":["https://usajaguars.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://usajaguars.com/sports/football/schedule"],"roster":["https://usajaguars.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://usajaguars.com/sports/womens-golf/schedule","https://usajaguars.com/sports/mens-golf/schedule"],"roster":["https://usajaguars.com/sports/womens-golf/roster","https://usajaguars.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://usajaguars.com/sports/womens-soccer/schedule"],"roster":["https://usajaguars.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://usajaguars.com/sports/softball/schedule"],"roster":["https://usajaguars.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://usajaguars.com/sports/womens-tennis/schedule","https://usajaguars.com/sports/mens-tennis/schedule"],"roster":["https://usajaguars.com/sports/womens-tennis/roster","https://usajaguars.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://usajaguars.com/sports/track-and-field/schedule"],"roster":["https://usajaguars.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://usajaguars.com/sports/womens-volleyball/schedule"],"roster":["https://usajaguars.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-alabama|"+sport+"':"),`${sport} routes must live in the South Alabama module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://usajaguars.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southAlabamaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-alabama)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 1:00 PM South Alabama vs Tulane | ",
 "Upcoming Oct 25, 3:00 PM South Alabama vs Nicholls | ",
 "Upcoming Oct 29, 6:00 PM South Alabama vs Fall World Series | ",
 "Upcoming Oct 30, 6:00 PM South Alabama vs Fall World Series | ",
 "Upcoming Nov 1, 1:00 PM South Alabama vs Fall World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Men's · South Alabama vs Mississippi Christian | ",
 "Upcoming Nov 2, 7:00 PM Men's · South Alabama vs Ohio | ",
 "Upcoming Nov 5, 7:00 PM Men's · South Alabama vs Jacksonville State | ",
 "Upcoming Nov 10, 6:00 PM Men's · South Alabama at UCF | ",
 "Upcoming Nov 12, 7:00 PM Men's · South Alabama vs LMU | ",
 "Upcoming Nov 14, 5:00 PM Men's · South Alabama at North Texas | ",
 "Upcoming Nov 17, 6:00 PM Men's · South Alabama vs Spring Hill | ",
 "Upcoming Nov 20, 7:00 PM Men's · South Alabama at SMU | ",
 "Upcoming Nov 22, 2:00 PM Men's · South Alabama vs West Florida | ",
 "Upcoming Nov 24, 7:00 PM Men's · South Alabama vs Florida A&M | ",
 "Upcoming Nov 27, 1:00 PM Men's · South Alabama vs Fresno State | ",
 "Upcoming Nov 28, 5:00 PM Men's · South Alabama vs South Dakota State | ",
 "Upcoming Dec 5, 2:00 PM Men's · South Alabama vs UTSA | ",
 "Upcoming Dec 16 Men's · South Alabama at Arkansas State | ",
 "Upcoming Dec 19, 4:30 PM Men's · South Alabama vs Old Dominion | ",
 "Upcoming Dec 28, 6:00 PM Men's · South Alabama vs Mobile | ",
 "Upcoming Dec 31, 3:00 PM Men's · South Alabama at Marshall | ",
 "Upcoming Jan 2 Men's · South Alabama at App State | ",
 "Upcoming Jan 7, 7:00 PM Men's · South Alabama vs Georgia Southern | ",
 "Upcoming Jan 9, 3:00 PM Men's · South Alabama vs Coastal Carolina | ",
 "Upcoming Jan 14, 6:30 PM Men's · South Alabama at ULM | ",
 "Upcoming Jan 16, 3:00 PM Men's · South Alabama vs Louisiana Tech | ",
 "Upcoming Jan 21, 7:30 PM Men's · South Alabama at Louisiana | ",
 "Upcoming Jan 23, 4:30 PM Men's · South Alabama vs Southern Miss | ",
 "Upcoming Jan 27, 6:00 PM Men's · South Alabama at Troy | ",
 "Upcoming Jan 30, 3:00 PM Men's · South Alabama at Louisiana Tech | ",
 "Upcoming Feb 3, 7:00 PM Men's · South Alabama vs Arkansas State | ",
 "Upcoming Feb 6 Men's · South Alabama at MAC-SBC Challenge | ",
 "Upcoming Feb 13 Men's · South Alabama at Georgia State | ",
 "Upcoming Feb 18, 7:00 PM Men's · South Alabama vs Troy | ",
 "Upcoming Feb 20, 3:00 PM Men's · South Alabama vs Louisiana | ",
 "Upcoming Feb 24, 7:00 PM Men's · South Alabama vs ULM | ",
 "Upcoming Feb 26, 8:00 PM Men's · South Alabama at Southern Miss | ",
 "Upcoming Mar 2 Men's · South Alabama at Sun Belt Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · South Alabama vs Southeastern Baptist (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · South Alabama at Akron | ",
 "Upcoming Nov 7, 1:00 PM Women's · South Alabama vs UAB | ",
 "Upcoming Nov 9, 5:30 PM Women's · South Alabama at UCF | ",
 "Upcoming Nov 11, 12:00 PM Women's · South Alabama at Florida Atlantic | ",
 "Upcoming Nov 15 Women's · South Alabama at Kennesaw State | ",
 "Upcoming Nov 19, 11:00 AM Women's · South Alabama at Memphis | ",
 "Upcoming Nov 23, 6:30 PM Women's · South Alabama vs Clayton State | ",
 "Upcoming Nov 28 Women's · South Alabama vs Wichita State | ",
 "Upcoming Nov 29 Women's · South Alabama vs South Carolina State | ",
 "Upcoming Dec 4, 6:00 PM Women's · South Alabama at North Florida | ",
 "Upcoming Dec 6, 1:00 PM Women's · South Alabama at Vanderbilt | ",
 "Upcoming Dec 13, 1:00 PM Women's · South Alabama at Florida State | ",
 "Upcoming Dec 16, 6:00 PM Women's · South Alabama at Southern Miss | ",
 "Upcoming Dec 19, 2:00 PM Women's · South Alabama vs Marshall | ",
 "Upcoming Dec 28 Women's · South Alabama at Auburn | ",
 "Upcoming Dec 31, 6:30 PM Women's · South Alabama vs Georgia State | ",
 "Upcoming Jan 2, 1:00 PM Women's · South Alabama vs App State | ",
 "Upcoming Jan 6, 5:00 PM Women's · South Alabama at Georgia Southern | ",
 "Upcoming Jan 9 Women's · South Alabama at Old Dominion | ",
 "Upcoming Jan 13, 7:00 PM Women's · South Alabama at Arkansas State | ",
 "Upcoming Jan 16, 2:00 PM Women's · South Alabama at Louisiana | ",
 "Upcoming Jan 20, 11:30 AM Women's · South Alabama vs Southern Miss | ",
 "Upcoming Jan 23, 2:00 PM Women's · South Alabama vs Arkansas State | ",
 "Upcoming Jan 30, 12:00 PM Women's · South Alabama at Coastal Carolina | ",
 "Upcoming Feb 3 Women's · South Alabama at Troy | ",
 "Upcoming Feb 6, 6:00 PM Women's · South Alabama vs MAC-SBC Challenge | ",
 "Upcoming Feb 11, 6:30 PM Women's · South Alabama vs Louisiana Tech | ",
 "Upcoming Feb 13, 2:00 PM Women's · South Alabama vs Troy | ",
 "Upcoming Feb 18, 6:30 PM Women's · South Alabama at ULM | ",
 "Upcoming Feb 20 Women's · South Alabama at Louisiana Tech | ",
 "Upcoming Feb 24, 5:00 PM Women's · South Alabama vs Louisiana | ",
 "Upcoming Feb 26, 6:30 PM Women's · South Alabama vs ULM | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 South Alabama at Battle for New Orleans | Completed",
 "Final Sep 18 South Alabama at Southern Showcase | 24th of 29",
 "Final Sep 25 South Alabama at Azalea City Classic | Completed",
 "Final Oct 16 South Alabama at Crimson Classic | Completed",
 "Upcoming Oct 30 South Alabama at Sun Belt Conference | ",
 "Upcoming Nov 13 South Alabama at NCAA South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 South Alabama vs Southeastern Louisiana | W, 39-14",
 "Final Sep 12 South Alabama at Tulane | L, 24-28",
 "Final Sep 19 South Alabama vs Ohio | W, 41-36",
 "Final Sep 26 South Alabama at Kentucky | L, 21-45",
 "Final Oct 3 South Alabama vs ULM | W, 52-35",
 "Final Oct 8 South Alabama at Arkansas State | W, 56-49",
 "Final Oct 20 South Alabama at Marshall | L, 13-20",
 "Upcoming Oct 31, 2:00 PM South Alabama vs Louisiana Tech | ",
 "Upcoming Nov 7 South Alabama at Louisiana | ",
 "Upcoming Nov 14 South Alabama vs Troy | ",
 "Upcoming Nov 21 South Alabama at Southern Miss | ",
 "Upcoming Nov 27, 2:00 PM South Alabama vs App State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · South Alabama at Bettie Lou Evans Invitational | Completed",
 "Final Oct 4 Women's · South Alabama at 29th Mercedes-Benz Collegiate Championship | Completed",
 "Final Oct 9 Women's · South Alabama at Sixth Annual Evie Odom Invitational | Completed",
 "Upcoming Oct 26 Women's · South Alabama at The Judson | ",
 "Upcoming Feb 8 Women's · South Alabama at Arizona Thunderbird Intercollegiate | ",
 "Upcoming Feb 22 Women's · South Alabama at Momentum Transportation UNF Collegiate | ",
 "Upcoming Mar 6 Women's · South Alabama at Gators Invitational | ",
 "Upcoming Mar 15 Women's · South Alabama at Magnolia Collegiate | ",
 "Upcoming Mar 27 Women's · South Alabama at 55th Annual Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 19 Women's · South Alabama at Sun Belt Conference Championship | ",
 "Upcoming May 10 Women's · South Alabama at NCAA DI Women's Golf Regional | ",
 "Upcoming May 21 Women's · South Alabama at NCAA DI Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · South Alabama at SANDESTIN COLLEGIATE CLASSIC | Completed",
 "Final Oct 4 Men's · South Alabama at TRINITY FOREST INVITATIONAL | Completed",
 "Final Oct 19 Men's · South Alabama at THE CLERICO | Completed",
 "Upcoming Oct 31 Men's · South Alabama at STEELWOOD COLLEGIATE | ",
 "Upcoming Feb 1 Men's · South Alabama at SEA BEST INVITATIONAL | ",
 "Upcoming Feb 15 Men's · South Alabama at HAL WILLIAMS COLLEGIATE | ",
 "Upcoming Mar 8 Men's · South Alabama at LOUISIANA CLASSICS | ",
 "Upcoming Mar 19 Men's · South Alabama at LINGER LONGER INVITATIONAL | ",
 "Upcoming Mar 29 Men's · South Alabama at MOBILE BAY INTERCOLLEGIATE | ",
 "Upcoming Apr 18 Men's · South Alabama at MOSSY OAK COLLEGIATE | ",
 "Upcoming Apr 26 Men's · South Alabama at Sun Belt Conference Championship | ",
 "Upcoming May 18 Men's · South Alabama at NCAA Regionals | ",
 "Upcoming May 29 Men's · South Alabama at NCAA Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 South Alabama at Mississippi State | L, 0-3",
 "Final Aug 16 South Alabama at Tennessee | L, 0-2",
 "Final Aug 20 South Alabama vs Alabama State | W, 4-0",
 "Final Aug 23 South Alabama vs Samford | T, 1-1",
 "Final Aug 30 South Alabama at Alabama | L, 0-3",
 "Final Sep 3 South Alabama at Ole Miss | L, 0-1",
 "Final Sep 6 South Alabama vs Southeastern Louisiana | W, 3-1",
 "Final Sep 17 South Alabama vs Troy | W, 2-0",
 "Final Sep 23 South Alabama at Coastal Carolina | T, 2-2",
 "Final Sep 27 South Alabama vs Georgia State | L, 1-2",
 "Final Oct 3 South Alabama at Old Dominion | L, 0-1",
 "Final Oct 8 South Alabama at Louisiana | W, 2-0",
 "Final Oct 16 South Alabama vs Southern Miss | L, 0-1",
 "Today Oct 22, 4:00 PM South Alabama at Arkansas State | ",
 "Upcoming Oct 25, 1:00 PM South Alabama vs ULM | ",
 "Upcoming Oct 28, 2:00 PM South Alabama vs Georgia Southern | ",
 "Upcoming Nov 1, 1:00 PM South Alabama at Louisiana Tech | ",
 "Upcoming Nov 9 South Alabama at Sun Belt Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 22, 6:00 PM South Alabama vs Mobile (Ala.) | ",
 "Upcoming Oct 28, 5:00 PM South Alabama vs Chipola College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · South Alabama at Samford Round Robin | Completed",
 "Final Oct 8 Women's · South Alabama at ITA Southern Regional | Completed",
 "Upcoming Oct 30 Women's · South Alabama at Roberta Alison Fall Classic | ",
 "Upcoming Nov 5 Women's · South Alabama at ITA Sectionals | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · South Alabama at Sugarcane Classic | Completed",
 "Final Oct 2 Men's · South Alabama at Blue Gray Classic | Completed",
 "Final Oct 8 Men's · South Alabama at ITA Southern Regionals | Completed",
 "Upcoming Oct 23 Men's · South Alabama at Country Club of Birmingham Invitational | ",
 "Upcoming Nov 5 Men's · South Alabama at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · South Alabama at Battle at the Beach | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 South Alabama vs Rice | L, 2-3",
 "Final Aug 29 South Alabama vs Mississippi State | L, 0-3",
 "Final Aug 30 South Alabama vs Georgia State | W, 3-1",
 "Final Sep 4 South Alabama at Belmont | W, 3-2",
 "Final Sep 5 South Alabama vs Middle Tennessee | L, 1-3",
 "Final Sep 6 South Alabama at Lipscomb | L, 0-3",
 "Final Sep 11 South Alabama vs Kennesaw State | W, 3-2",
 "Final Sep 12 South Alabama vs Georgia | L, 0-3",
 "Final Sep 13 South Alabama vs Tulane | L, 1-3",
 "Final Sep 17 South Alabama vs Samford | W, 3-0",
 "Final Sep 18 South Alabama vs UAB | W, 3-1",
 "Final Sep 19 South Alabama at Auburn | L, 1-3",
 "Final Sep 25 South Alabama at James Madison | L, 0-3",
 "Final Sep 26 South Alabama at James Madison | L, 0-3",
 "Final Oct 1 South Alabama vs Louisiana Tech | W, 3-0",
 "Final Oct 3 South Alabama vs Louisiana Tech | W, 3-1",
 "Final Oct 9 South Alabama at Arkansas State | L, 0-3",
 "Final Oct 10 South Alabama at Arkansas State | L, 1-3",
 "Final Oct 16 South Alabama vs Louisiana | L, 1-3",
 "Final Oct 17 South Alabama vs Louisiana | W, 3-2",
 "Today Oct 22, 6:00 PM South Alabama at Troy | ",
 "Upcoming Oct 23, 6:00 PM South Alabama at Troy | ",
 "Upcoming Oct 29, 6:00 PM South Alabama vs ULM | ",
 "Upcoming Oct 30, 6:00 PM South Alabama vs ULM | ",
 "Upcoming Nov 6, 6:00 PM South Alabama at Southern Miss | ",
 "Upcoming Nov 7, 2:00 PM South Alabama at Southern Miss | ",
 "Upcoming Nov 12, 6:00 PM South Alabama vs Georgia Southern | ",
 "Upcoming Nov 13, 6:00 PM South Alabama vs Georgia Southern | ",
 "Upcoming Nov 19 South Alabama at Sun Belt Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("South Alabama module checks passed");
