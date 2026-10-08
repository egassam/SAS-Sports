import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {illinoisSchool} from '../src/schools/illinois.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='illinois');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,illinoisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/illinois-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fightingillini.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['illinois'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',illinoisSchool.scheduleUrls],['roster',illinoisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('illinois|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fightingillini.com',`${key} must stay on fightingillini.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fightingillini.com/sports/baseball/schedule"],"roster":["https://fightingillini.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fightingillini.com/sports/mens-basketball/schedule","https://fightingillini.com/sports/womens-basketball/schedule"],"roster":["https://fightingillini.com/sports/mens-basketball/roster","https://fightingillini.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://fightingillini.com/sports/womens-cross-country/schedule","https://fightingillini.com/sports/mens-cross-country/schedule"],"roster":["https://fightingillini.com/sports/womens-cross-country/roster","https://fightingillini.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://fightingillini.com/sports/football/schedule"],"roster":["https://fightingillini.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://fightingillini.com/sports/womens-golf/schedule","https://fightingillini.com/sports/mens-golf/schedule"],"roster":["https://fightingillini.com/sports/womens-golf/roster","https://fightingillini.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://fightingillini.com/sports/womens-gymnastics/schedule","https://fightingillini.com/sports/mens-gymnastics/schedule"],"roster":["https://fightingillini.com/sports/womens-gymnastics/roster","https://fightingillini.com/sports/mens-gymnastics/roster"],"combined":true},"Soccer":{"schedule":["https://fightingillini.com/sports/womens-soccer/schedule"],"roster":["https://fightingillini.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://fightingillini.com/sports/softball/schedule"],"roster":["https://fightingillini.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://fightingillini.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://fightingillini.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://fightingillini.com/sports/womens-tennis/schedule","https://fightingillini.com/sports/mens-tennis/schedule"],"roster":["https://fightingillini.com/sports/womens-tennis/roster","https://fightingillini.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://fightingillini.com/sports/womens-track-and-field/schedule","https://fightingillini.com/sports/mens-track-and-field/schedule"],"roster":["https://fightingillini.com/sports/womens-track-and-field/roster","https://fightingillini.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://fightingillini.com/sports/womens-volleyball/schedule"],"roster":["https://fightingillini.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://fightingillini.com/sports/wrestling/schedule"],"roster":["https://fightingillini.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'illinois|"+sport+"':"),`${sport} routes must live in the Illinois module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://fightingillini.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.illinoisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=illinois)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 10, 1:00 PM Illinois vs Wake Forest (Exhibition) | ",
 "Upcoming Mar 12 Illinois at Nebraska | ",
 "Upcoming Mar 13 Illinois at Nebraska | ",
 "Upcoming Mar 14 Illinois at Nebraska | ",
 "Upcoming Mar 19 Illinois vs Ohio State | ",
 "Upcoming Mar 20 Illinois vs Ohio State | ",
 "Upcoming Mar 21 Illinois vs Ohio State | ",
 "Upcoming Mar 26 Illinois vs Iowa | ",
 "Upcoming Mar 27 Illinois vs Iowa | ",
 "Upcoming Mar 28 Illinois vs Iowa | ",
 "Upcoming Apr 2 Illinois at Northwestern | ",
 "Upcoming Apr 3 Illinois at Northwestern | ",
 "Upcoming Apr 4 Illinois at Northwestern | ",
 "Upcoming Apr 9 Illinois at Maryland | ",
 "Upcoming Apr 10 Illinois at Maryland | ",
 "Upcoming Apr 11 Illinois at Maryland | ",
 "Upcoming Apr 16 Illinois vs Michigan | ",
 "Upcoming Apr 17 Illinois vs Michigan | ",
 "Upcoming Apr 18 Illinois vs Michigan | ",
 "Upcoming Apr 30 Illinois at UCLA | ",
 "Upcoming May 1 Illinois at UCLA | ",
 "Upcoming May 2 Illinois at UCLA | ",
 "Upcoming May 7 Illinois vs Washington | ",
 "Upcoming May 8 Illinois vs Washington | ",
 "Upcoming May 9 Illinois vs Washington | ",
 "Upcoming May 14 Illinois at Michigan State | ",
 "Upcoming May 15 Illinois at Michigan State | ",
 "Upcoming May 16 Illinois at Michigan State | ",
 "Upcoming May 20 Illinois vs Penn State | ",
 "Upcoming May 21 Illinois vs Penn State | ",
 "Upcoming May 22 Illinois vs Penn State | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 17, 4:00 PM Men's · Illinois at Cincinnati (Exhibition) | ",
 "Upcoming Oct 23, 7:00 PM Men's · Illinois vs Baylor (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · Illinois vs UIC (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Illinois vs FDU | ",
 "Upcoming Nov 5, 7:30 PM Men's · Illinois vs Penn | ",
 "Upcoming Nov 10 Men's · Illinois at Texas Tech | ",
 "Upcoming Nov 13, 6:00 PM Men's · Illinois vs Sam Houston | ",
 "Upcoming Nov 17 Men's · Illinois at Duke | ",
 "Upcoming Nov 20, 8:00 PM Men's · Illinois vs Eastern Illinois | ",
 "Upcoming Nov 23, 7:00 PM Men's · Illinois vs Winthrop | ",
 "Upcoming Nov 27, 5:00 PM Men's · Illinois vs Western Kentucky | ",
 "Upcoming Dec 4, 6:00 PM Men's · Illinois vs UConn | ",
 "Upcoming Dec 8, 6:00 PM Men's · Illinois at Minnesota | ",
 "Upcoming Dec 12, 1:00 PM Men's · Illinois vs Penn State | ",
 "Upcoming Dec 20 Men's · Illinois vs Missouri | ",
 "Upcoming Dec 29, 6:00 PM Men's · Illinois vs Seattle | ",
 "Upcoming Jan 2, 7:00 PM Men's · Illinois at Wisconsin | ",
 "Upcoming Jan 5, 8:00 PM Men's · Illinois vs Purdue | ",
 "Upcoming Jan 9, 3:00 PM Men's · Illinois vs Ohio State | ",
 "Upcoming Jan 13, 8:00 PM Men's · Illinois at Northwestern | ",
 "Upcoming Jan 16, 1:00 PM Men's · Illinois at Maryland | ",
 "Upcoming Jan 19, 8:00 PM Men's · Illinois vs Nebraska | ",
 "Upcoming Jan 24, 11:00 AM Men's · Illinois at Indiana | ",
 "Upcoming Jan 27, 8:00 PM Men's · Illinois vs USC | ",
 "Upcoming Jan 30 Men's · Illinois vs North Carolina | ",
 "Upcoming Feb 2, 8:00 PM Men's · Illinois vs UCLA | ",
 "Upcoming Feb 5, 7:00 PM Men's · Illinois vs Michigan State | ",
 "Upcoming Feb 9, 6:00 PM Men's · Illinois at Michigan | ",
 "Upcoming Feb 12, 7:00 PM Men's · Illinois at Purdue | ",
 "Upcoming Feb 16, 8:00 PM Men's · Illinois vs Northwestern | ",
 "Upcoming Feb 20, 4:00 PM Men's · Illinois at Oregon | ",
 "Upcoming Feb 23, 9:00 PM Men's · Illinois at Washington | ",
 "Upcoming Feb 28, 12:30 PM Men's · Illinois vs Wisconsin | ",
 "Upcoming Mar 3, 5:30 PM Men's · Illinois at Rutgers | ",
 "Upcoming Mar 6, 7:00 PM Men's · Illinois vs Iowa | ",
 "Upcoming Mar 9 Men's · Illinois at Big Ten Tournament | ",
 "Upcoming Mar 16 Men's · Illinois at NCAA Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30 Women's · Illinois vs UIS (Exhibition) | ",
 "Upcoming Nov 4 Women's · Illinois vs Detroit Mercy | ",
 "Upcoming Nov 7 Women's · Illinois vs Southern | ",
 "Upcoming Nov 15 Women's · Illinois vs SEMO | ",
 "Upcoming Nov 18, 5:30 PM Women's · Illinois at Ball State | ",
 "Upcoming Nov 27, 10:00 AM Women's · Illinois vs Marquette | ",
 "Upcoming Nov 29, 10:00 AM Women's · Illinois vs Saint Joseph's | ",
 "Upcoming Dec 5 Women's · Illinois at Wisconsin | ",
 "Upcoming Dec 7 Women's · Illinois vs Chicago State | ",
 "Upcoming Dec 10, 7:00 PM Women's · Illinois vs Missouri | ",
 "Upcoming Dec 13 Women's · Illinois vs Evansville | ",
 "Upcoming Dec 18 Women's · Illinois vs Western Illinois | ",
 "Upcoming Dec 20 Women's · Illinois vs Wright State | ",
 "Upcoming Dec 22 Women's · Illinois vs Old Dominion | ",
 "Upcoming Dec 29, 12:00 PM Women's · Illinois vs Iowa | ",
 "Upcoming Jan 2 Women's · Illinois at Rutgers | ",
 "Upcoming Jan 7, 8:00 PM Women's · Illinois vs Washington | ",
 "Upcoming Jan 10, 1:30 PM Women's · Illinois vs Purdue | ",
 "Upcoming Jan 13 Women's · Illinois at Ohio State | ",
 "Upcoming Jan 17 Women's · Illinois vs Michigan State | ",
 "Upcoming Jan 20, 7:00 PM Women's · Illinois vs Michigan | ",
 "Upcoming Jan 23 Women's · Illinois at Northwestern | ",
 "Upcoming Jan 26 Women's · Illinois vs Nebraska | ",
 "Upcoming Jan 30, 2:00 PM Women's · Illinois at UCLA | ",
 "Upcoming Feb 2, 9:00 PM Women's · Illinois at USC | ",
 "Upcoming Feb 7, 3:00 PM Women's · Illinois vs Northwestern | ",
 "Upcoming Feb 13 Women's · Illinois vs Oregon | ",
 "Upcoming Feb 17 Women's · Illinois at Maryland | ",
 "Upcoming Feb 21, 1:00 PM Women's · Illinois at Indiana | ",
 "Upcoming Feb 25, 7:30 PM Women's · Illinois vs Penn State | ",
 "Upcoming Feb 28, 2:00 PM Women's · Illinois at Minnesota | ",
 "Upcoming Mar 3 Women's · Illinois at Allstate Big Ten Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Illinois at Fighting Illini Invitational | 1st of 4, 28 pts.",
 "Final Sep 25 Women's · Illinois at Gans Creek Classic | 11th of 29, 323 pts.",
 "Upcoming Oct 16 Women's · Illinois at Pre-Nationals | ",
 "Upcoming Oct 30 Women's · Illinois at Big Ten Championships | ",
 "Upcoming Nov 13 Women's · Illinois at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Women's · Illinois at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Illinois at Fighting Illini Invitational | 1st of 5, 20pts.",
 "Final Sep 25 Men's · Illinois at Gans Creek Classic | 9th of 30, 269 pts.",
 "Upcoming Oct 16 Men's · Illinois at Pre-Nationals | ",
 "Upcoming Oct 30 Men's · Illinois at Big Ten Championships | ",
 "Upcoming Nov 13 Men's · Illinois at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Men's · Illinois at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Illinois vs UAB | W, 42-23",
 "Final Sep 12 Illinois vs Duke | L, 27-31",
 "Final Sep 19 Illinois vs Southern Illinois | W, 48-10",
 "Final Sep 26 Illinois at Ohio State | L, 19-42",
 "Final Oct 3 Illinois vs Purdue | L, 17-24",
 "Upcoming Oct 10, 2:30 PM Illinois at Michigan State | ",
 "Upcoming Oct 24 Illinois vs Oregon | ",
 "Upcoming Oct 31 Illinois at Maryland | ",
 "Upcoming Nov 6, 7:00 PM Illinois vs Nebraska | ",
 "Upcoming Nov 13, 8:00 PM Illinois at UCLA | ",
 "Upcoming Nov 21 Illinois vs Iowa | ",
 "Upcoming Nov 28 Illinois at Northwestern | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Illinois at The Bruzzy | T4th of 11",
 "Final Sep 13 Women's · Illinois at Badger Invitational | 7th of 16",
 "Final Oct 5 Women's · Illinois at Windy City Classic | T7th of 12",
 "Upcoming Oct 12 Women's · Illinois at Illini Women's Invitational at Medinah | ",
 "Upcoming Oct 26 Women's · Illinois at French Broad Collegiate Invitational | ",
 "Upcoming Feb 8 Women's · Illinois at Golf Club of Houston Invitational | ",
 "Upcoming Feb 14 Women's · Illinois at Spartan Suncoast Collegiate Invitational | ",
 "Upcoming Feb 22 Women's · Illinois at The Chevron Collegiate | ",
 "Upcoming Mar 14 Women's · Illinois at Mountain View Collegiate | ",
 "Upcoming Apr 5 Women's · Illinois at Olde Stone Collegiate | ",
 "Upcoming Apr 11 Women's · Illinois at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Illinois at Big Ten Championships | ",
 "Upcoming May 10 Women's · Illinois at NCAA Regionals | ",
 "Upcoming May 21 Women's · Illinois at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Illinois at Sahalee Players Championship | 4th of 12",
 "Final Sep 18 Men's · Illinois at OFCC / Fighting Illini Invitational | 2nd of 15",
 "Final Oct 4 Men's · Illinois at Fighting Irish Classic | 6th of 14",
 "Upcoming Oct 17 Men's · Illinois at Fallen Oak Collegiate Invitational | ",
 "Upcoming Feb 15 Men's · Illinois at Hal Williams Collegiate | ",
 "Upcoming Feb 28 Men's · Illinois at Las Vegas Collegiate | ",
 "Upcoming Mar 15 Men's · Illinois at Black Desert Collegiate | ",
 "Upcoming Apr 3 Men's · Illinois at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 12 Men's · Illinois at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 24 Men's · Illinois at Fighting Illini Spring Collegiate | ",
 "Upcoming Apr 30 Men's · Illinois at Big Ten Championship | ",
 "Upcoming May 17 Men's · Illinois at NCAA Regional | ",
 "Upcoming May 28 Men's · Illinois at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Illinois vs Georgia | T, 0-0",
 "Final Aug 20 Illinois vs Cincinnati | W, 2-1",
 "Final Aug 23 Illinois vs UIC | T, 0-0",
 "Final Aug 27 Illinois vs Saint Louis | T, 1-1",
 "Final Sep 3 Illinois at Western Michigan | W, 3-0",
 "Final Sep 6 Illinois at Virginia Tech | W, 1-0",
 "Final Sep 10 Illinois vs Wisconsin | T, 0-0",
 "Final Sep 13 Illinois vs Michigan | L, 0-2",
 "Final Sep 18 Illinois at Iowa | T, 0-0",
 "Final Sep 24 Illinois at Purdue | L, 0-3",
 "Final Sep 27 Illinois vs Oregon | W, 2-0",
 "Final Oct 4 Illinois vs Michigan State | L, 0-1",
 "Today Oct 8, 9:30 PM Illinois at USC | ",
 "Upcoming Oct 11, 3:00 PM Illinois at UCLA | ",
 "Upcoming Oct 18, 1:00 PM Illinois at Nebraska | ",
 "Upcoming Oct 22, 6:00 PM Illinois vs Northwestern | ",
 "Upcoming Oct 25, 11:00 AM Illinois at Ohio State | ",
 "Upcoming Oct 30, 6:00 PM Illinois vs Minnesota | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 10, 12:00 PM Illinois vs Illinois Wesleyan | ",
 "Upcoming Oct 10, 4:00 PM Illinois vs Spoon River | ",
 "Upcoming Oct 16, 6:00 PM Illinois vs Danville | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Illinois vs Purdue | L, 132.5-167.5",
 "Upcoming Oct 16, 5:00 PM Illinois vs Iowa State | ",
 "Upcoming Nov 7 Illinois at Arkansas | ",
 "Upcoming Nov 7 Illinois vs Texas A&M University | ",
 "Upcoming Nov 17 Illinois at Hawkeye Invite | ",
 "Upcoming Dec 2 Illinois at U.S. Open Championships | ",
 "Upcoming Dec 5, 12:00 PM Illinois vs Indiana State | ",
 "Upcoming Dec 11 Illinois at USA Diving Winter Nationals | ",
 "Upcoming Jan 9, 12:00 PM Illinois at House of Paign Invite | ",
 "Upcoming Jan 15, 5:00 PM Illinois at Iowa | ",
 "Upcoming Jan 15, 5:00 PM Illinois at Nebraska | ",
 "Upcoming Feb 5 Illinois at Wisconsin | ",
 "Upcoming Feb 17 Illinois at Big Ten Championships | ",
 "Upcoming Mar 7 Illinois at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 11 Illinois at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Illinois at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Illinois at Milwaukee Tennis Classic | Completed",
 "Final Sep 11 Women's · Illinois at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 19 Women's · Illinois at ITA All-American Championships | Completed",
 "Today Oct 8 Women's · Illinois at ITA Midwest Regionals | ",
 "Upcoming Nov 5 Women's · Illinois at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Illinois at ITA Sectionals | ",
 "Upcoming Nov 6 Women's · Illinois at Spartan Invite | ",
 "Upcoming Nov 17 Women's · Illinois at NCAA Individual & Doubles Championships | ",
 "Upcoming Jan 22 Women's · Illinois at Georgia | ",
 "Upcoming Jan 23 Women's · Illinois at Charlotte or Yale | ",
 "Upcoming Apr 22 Women's · Illinois at Big Ten Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Illinois at Harvard Chowderfest | Completed",
 "Final Sep 19 Men's · Illinois at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Illinois at Fighting Irish Mini Duals | Completed",
 "Final Oct 2 Men's · Illinois at Hope College Invite | Completed",
 "Upcoming Oct 14 Men's · Illinois at ITA Midwest Regional Championship | ",
 "Upcoming Oct 23 Men's · Illinois at RTC Collegiate Invite | ",
 "Upcoming Oct 23 Men's · Illinois at Louisville Invite 2 | ",
 "Upcoming Oct 25 Men's · Illinois at Sioux Falls Challenger | ",
 "Upcoming Oct 29 Men's · Illinois at Big Ten Singles and Doubles Championships | ",
 "Upcoming Nov 1 Men's · Illinois at Charlottesville Challenger | ",
 "Upcoming Nov 5 Men's · Illinois at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Men's · Illinois at ITA Central Sectional Championship | ",
 "Upcoming Nov 16 Men's · Illinois at Paine Schwartz Partners Champaign Challenger | ",
 "Upcoming Nov 17 Men's · Illinois at NCAA Singles and Doubles Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Jan 15 Women's · Illinois at Fighting Illini Open | ",
 "Upcoming Jan 29 Women's · Illinois at Razorback Invite | ",
 "Upcoming Feb 5 Women's · Illinois at Fairgrounds Invitational | ",
 "Upcoming Feb 12 Women's · Illinois at Tyson Invitational | ",
 "Upcoming Feb 25 Women's · Illinois at Big Ten Indoor Championships | ",
 "Upcoming Mar 12 Women's · Illinois at NCAA Indoor Championships | ",
 "Upcoming Apr 2 Women's · Illinois at Jim Click Invitational | ",
 "Upcoming Apr 14 Women's · Illinois at UNF Invitational (Combined Events Only) | ",
 "Upcoming Apr 15 Women's · Illinois at Wake Forest Invitational (Distance Only) | ",
 "Upcoming Apr 16 Women's · Illinois at Tom Jones Memorial Invitational | ",
 "Upcoming May 1 Women's · Illinois at LSU Invite | ",
 "Upcoming May 7 Women's · Illinois at Gary Wieneke Memorial | ",
 "Upcoming May 14 Women's · Illinois at Big Ten Outdoor Championships | ",
 "Upcoming May 26 Women's · Illinois at NCAA West Preliminaries | ",
 "Upcoming Jun 9 Women's · Illinois at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Jan 15 Men's · Illinois at Fighting Illini Open | ",
 "Upcoming Jan 29 Men's · Illinois at Razorback Invite | ",
 "Upcoming Feb 5 Men's · Illinois at Fairgrounds Invitational | ",
 "Upcoming Feb 12 Men's · Illinois at Tyson Invitational | ",
 "Upcoming Feb 25 Men's · Illinois at Big Ten Indoor Championships | ",
 "Upcoming Mar 12 Men's · Illinois at NCAA Indoor Championships | ",
 "Upcoming Apr 2 Men's · Illinois at Jim Click Invitational | ",
 "Upcoming Apr 14 Men's · Illinois at UNF Invitational (Combined Events Only) | ",
 "Upcoming Apr 15 Men's · Illinois at Wake Forest Invitational (Distance Only) | ",
 "Upcoming Apr 16 Men's · Illinois at Tom Jones Memorial Invitational | ",
 "Upcoming May 1 Men's · Illinois at LSU Invite | ",
 "Upcoming May 7 Men's · Illinois at Gary Wieneke Memorial | ",
 "Upcoming May 14 Men's · Illinois at Big Ten Outdoor Championships | ",
 "Upcoming May 26 Men's · Illinois at NCAA West Preliminaries | ",
 "Upcoming Jun 9 Men's · Illinois at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Illinois vs Cincinnati | L, 2-3",
 "Final Aug 30 Illinois vs Syracuse | W, 3-0",
 "Final Sep 1 Illinois at Tennessee | L, 0-3",
 "Final Sep 5 Illinois vs McNeese State | W, 3-0",
 "Final Sep 6 Illinois at Rice | W, 3-0",
 "Final Sep 9 Illinois vs Lindenwood | W, 3-0",
 "Final Sep 11 Illinois at Marquette | L, 0-3",
 "Final Sep 13 Illinois vs Marquette | W, 3-2",
 "Final Sep 16 Illinois at Eastern Illinois | W, 3-1",
 "Final Sep 19 Illinois vs Arkansas | W, 3-0",
 "Final Sep 20 Illinois at Arkansas State | W, 3-0",
 "Final Sep 24 Illinois vs Minnesota | W, 3-1",
 "Final Sep 26 Illinois vs USC | W, 3-0",
 "Final Oct 2 Illinois at Washington | W, 3-0",
 "Final Oct 4 Illinois at Oregon | L, 1-3",
 "Today Oct 8, 7:30 PM Illinois vs Wisconsin | ",
 "Upcoming Oct 11, 5:00 PM Illinois at Purdue | ",
 "Upcoming Oct 15, 6:00 PM Illinois vs Michigan State | ",
 "Upcoming Oct 18, 1:00 PM Illinois vs Michigan | ",
 "Upcoming Oct 23, 6:00 PM Illinois at Maryland | ",
 "Upcoming Oct 24, 6:00 PM Illinois at Rutgers | ",
 "Upcoming Oct 29, 8:00 PM Illinois vs Northwestern | ",
 "Upcoming Nov 1, 12:00 PM Illinois vs Ohio State | ",
 "Upcoming Nov 5, 7:00 PM Illinois vs UCLA | ",
 "Upcoming Nov 8, 1:00 PM Illinois at Indiana | ",
 "Upcoming Nov 12, 6:00 PM Illinois at Nebraska | ",
 "Upcoming Nov 14, 7:00 PM Illinois vs Penn State | ",
 "Upcoming Nov 17, 6:00 PM Illinois at Iowa | ",
 "Upcoming Nov 20 Illinois at Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Illinois vs Southeast Open | ",
 "Upcoming Nov 7, 9:00 AM Illinois at Hofstra | ",
 "Upcoming Nov 8, 8:00 AM Illinois at Journeymen Collegiate Classic | ",
 "Upcoming Nov 14 Illinois at The Citadel | ",
 "Upcoming Dec 6 Illinois vs Cougar Clash | ",
 "Upcoming Dec 28 Illinois at Midlands Championships | ",
 "Upcoming Jan 8 Illinois vs Northwestern | ",
 "Upcoming Jan 10 Illinois at Indiana | ",
 "Upcoming Jan 15 Illinois vs Iowa | ",
 "Upcoming Jan 24 Illinois at Nebraska | ",
 "Upcoming Jan 29 Illinois vs Michigan | ",
 "Upcoming Jan 31 Illinois vs Maryland | ",
 "Upcoming Feb 12 Illinois at Minnesota | ",
 "Upcoming Feb 14 Illinois at Wisconsin | ",
 "Upcoming Mar 6 Illinois at Big Ten Championships | ",
 "Upcoming Mar 18 Illinois at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
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
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();

// Golf: women's "T-4th of 11"; men's "4th / 12 | 290-297-304--891 (+27)"
// (the place in the field, the rounds, the total to par).
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value ?? r.result}`).join(' / ')]);
  assert.deepEqual(final('womens-golf'),[["The Bruzzy","T4th of 11","Result: T4th of 11"],["Badger Invitational","7th of 16","Result: 7th of 16"],["Windy City Classic","T7th of 12","Result: T7th of 12"]]);
  assert.deepEqual(final('mens-golf'),[["Sahalee Players Championship","4th of 12","Result: 4th of 12 / Team score: 891 (+27)"],["OFCC / Fighting Illini Invitational","2nd of 15","Result: 2nd of 15 / Team score: 802 (-38)"],["Fighting Irish Classic","6th of 14","Result: 6th of 14 / Team score: 850 (+10)"]]);
}

// Cross Country: each team's page is its own event with its own TFRRS race.
{
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/IL_college_f_Illinois.html',Men:'https://www.tfrrs.org/teams/xc/IL_college_m_Illinois.html'});
  const read=async slug=>{const xc=parse('Cross Country',slug).filter(e=>e.status==='Final');for(const meet of xc)await worker.attachOfficialMeetResults(meet);return xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified),[...new Set(e.results.map(r=>r.group.split(' ')[0]))].join()]);};
  assert.deepEqual(await read('womens-cross-country'),[["Fighting Illini Invitational","Women's team: 1st · 28 pts",true,"Women's"],["Gans Creek Classic","Women's team: 11th · 324 pts",true,"Women's"]]);
  assert.deepEqual(await read('mens-cross-country'),[["Fighting Illini Invitational","Men's team: 1st · 20 pts",true,"Men's"],["Gans Creek Classic","Men's team: 9th · 269 pts",true,"Men's"]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Illinois's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Illinois vs Purdue","Final","L, 17-24"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Illinois at Oregon","Final","L, 1-3"]]);
  live('Soccer','soccer-espn-2026-10-04.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-05T12:00:00Z'),[["Illinois vs Michigan St","Final","L, 0-1"]]);
}

// Records, counted from the finals (football 2-3, Big Ten 0-2; volleyball
// 11-4, Big Ten 3-1; soccer 4-3-5, Big Ten 1-3-2).
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>records(sport,slug)),[["2-3","0-2"],["11-4","3-1"],["4-3-5","1-3-2"]]);

// Other schools and other hosts never reach the Illinois reader.
assert.equal(worker.illinoisHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://fightingillini.com/',now),null);
assert.equal(worker.illinoisHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='indiana'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Illinois module checks passed');
