import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {easternKentuckySchool} from '../src/schools/eastern-kentucky.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='eastern-kentucky');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,easternKentuckyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/eastern-kentucky-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ekusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['eastern-kentucky'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',easternKentuckySchool.scheduleUrls],['roster',easternKentuckySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('eastern-kentucky|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ekusports.com',`${key} must stay on ekusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ekusports.com/sports/baseball/schedule"],"roster":["https://ekusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ekusports.com/sports/mens-basketball/schedule","https://ekusports.com/sports/womens-basketball/schedule"],"roster":["https://ekusports.com/sports/mens-basketball/roster","https://ekusports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://ekusports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://ekusports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://ekusports.com/sports/cross-country/schedule"],"roster":["https://ekusports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ekusports.com/sports/football/schedule"],"roster":["https://ekusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ekusports.com/sports/womens-golf/schedule","https://ekusports.com/sports/mens-golf/schedule"],"roster":["https://ekusports.com/sports/womens-golf/roster","https://ekusports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://ekusports.com/sports/womens-soccer/schedule"],"roster":["https://ekusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ekusports.com/sports/softball/schedule"],"roster":["https://ekusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://ekusports.com/sports/womens-tennis/schedule","https://ekusports.com/sports/mens-tennis/schedule"],"roster":["https://ekusports.com/sports/womens-tennis/roster","https://ekusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ekusports.com/sports/track-and-field/schedule"],"roster":["https://ekusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ekusports.com/sports/womens-volleyball/schedule"],"roster":["https://ekusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'eastern-kentucky|"+sport+"':"),`${sport} routes must live in the Eastern Kentucky module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://ekusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.easternKentuckyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=eastern-kentucky)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Eastern Kentucky vs Morehead State (Exhibition) | W, 78-67",
 "Upcoming Nov 2, 7:00 PM Men's · Eastern Kentucky vs Kentucky Christian | ",
 "Upcoming Nov 6, 7:00 PM Men's · Eastern Kentucky vs Midway | ",
 "Upcoming Nov 10, 7:00 PM Men's · Eastern Kentucky at Georgia Tech | ",
 "Upcoming Nov 13, 7:00 PM Men's · Eastern Kentucky vs Kentucky State | ",
 "Upcoming Nov 16, 7:00 PM Men's · Eastern Kentucky at Kent State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Eastern Kentucky vs Bellarmine | ",
 "Upcoming Nov 22, 4:00 PM Men's · Eastern Kentucky vs Alice Lloyd College | ",
 "Upcoming Nov 25, 2:00 PM Men's · Eastern Kentucky at Miami (Ohio) | ",
 "Upcoming Nov 28, 4:00 PM Men's · Eastern Kentucky vs Tennessee Tech | ",
 "Upcoming Dec 2, 7:00 PM Men's · Eastern Kentucky vs Tennessee-Martin | ",
 "Upcoming Dec 6, 4:00 PM Men's · Eastern Kentucky at Auburn | ",
 "Upcoming Dec 13, 4:00 PM Men's · Eastern Kentucky vs Lipscomb | ",
 "Upcoming Dec 18, 7:00 PM Men's · Eastern Kentucky vs South Dakota State | ",
 "Upcoming Dec 21, 3:00 PM Men's · Eastern Kentucky at Air Force | ",
 "Upcoming Dec 31, 7:00 PM Men's · Eastern Kentucky at West Florida | ",
 "Upcoming Jan 2, 2:00 PM Men's · Eastern Kentucky at Queens University of Charlotte | ",
 "Upcoming Jan 6, 8:30 PM Men's · Eastern Kentucky at Austin Peay | ",
 "Upcoming Jan 9, 4:00 PM Men's · Eastern Kentucky vs West Georgia | ",
 "Upcoming Jan 13, 8:00 PM Men's · Eastern Kentucky vs Tarleton State | ",
 "Upcoming Jan 16, 4:00 PM Men's · Eastern Kentucky vs North Alabama | ",
 "Upcoming Jan 20, 8:00 PM Men's · Eastern Kentucky at Little Rock | ",
 "Upcoming Jan 23, 2:00 PM Men's · Eastern Kentucky at Central Arkansas | ",
 "Upcoming Jan 30, 2:00 PM Men's · Eastern Kentucky at West Georgia | ",
 "Upcoming Feb 3, 8:00 PM Men's · Eastern Kentucky vs Texas-Arlington | ",
 "Upcoming Feb 6, 7:30 PM Men's · Eastern Kentucky at North Alabama | ",
 "Upcoming Feb 10, 7:00 PM Men's · Eastern Kentucky vs Central Arkansas | ",
 "Upcoming Feb 13, 4:00 PM Men's · Eastern Kentucky vs Abilene Christian | ",
 "Upcoming Feb 17, 7:00 PM Men's · Eastern Kentucky vs Austin Peay | ",
 "Upcoming Feb 20, 5:15 PM Men's · Eastern Kentucky at Tarleton State | ",
 "Upcoming Feb 27, 4:00 PM Men's · Eastern Kentucky vs Little Rock | ",
 "Upcoming Mar 3, 8:00 PM Men's · Eastern Kentucky at Abilene Christian | ",
 "Upcoming Mar 6, 8:00 PM Men's · Eastern Kentucky at Texas-Arlington | ",
 "Upcoming Mar 10 Men's · Eastern Kentucky at United Athletic Conference Tournament First Round | ",
 "Upcoming Mar 11 Men's · Eastern Kentucky at United Athletic Conference Tournament Quarterfinals | ",
 "Upcoming Mar 12 Men's · Eastern Kentucky at United Athletic Conference Tournament Semifinals | ",
 "Upcoming Mar 13 Men's · Eastern Kentucky at United Athletic Conference Tournament Finals | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Eastern Kentucky at UT Martin | ",
 "Upcoming Nov 5, 7:45 PM Women's · Eastern Kentucky at Morehead State | ",
 "Upcoming Nov 7, 3:00 PM Women's · Eastern Kentucky vs Radford | ",
 "Upcoming Nov 10, 6:00 PM Women's · Eastern Kentucky vs Midway | ",
 "Upcoming Nov 12, 6:00 PM Women's · Eastern Kentucky vs Southern Illinois | ",
 "Upcoming Nov 17, 6:00 PM Women's · Eastern Kentucky vs Northern Kentucky | ",
 "Upcoming Nov 20, 4:00 PM Women's · Eastern Kentucky vs Simmons College | ",
 "Upcoming Nov 24, 9:00 PM Women's · Eastern Kentucky at New Mexico | ",
 "Upcoming Nov 29, 2:00 PM Women's · Eastern Kentucky vs Transylvania | ",
 "Upcoming Dec 2 Women's · Eastern Kentucky vs Presbyterian College | ",
 "Upcoming Dec 6, 4:00 PM Women's · Eastern Kentucky at Louisville | ",
 "Upcoming Dec 13, 3:00 PM Women's · Eastern Kentucky at Milwaukee | ",
 "Upcoming Dec 19, 2:30 PM Women's · Eastern Kentucky at Lipscomb | ",
 "Upcoming Dec 21, 6:30 PM Women's · Eastern Kentucky at Bellarmine | ",
 "Upcoming Dec 31, 6:00 PM Women's · Eastern Kentucky vs West Florida | ",
 "Upcoming Jan 2, 2:00 PM Women's · Eastern Kentucky vs Queens (NC) | ",
 "Upcoming Jan 6, 7:00 PM Women's · Eastern Kentucky at Austin Peay | ",
 "Upcoming Jan 9, 3:00 PM Women's · Eastern Kentucky at Tarleton State | ",
 "Upcoming Jan 13, 5:00 PM Women's · Eastern Kentucky vs North Alabama | ",
 "Upcoming Jan 16, 1:00 PM Women's · Eastern Kentucky vs Abilene Christian | ",
 "Upcoming Jan 20, 6:00 PM Women's · Eastern Kentucky at West Georgia | ",
 "Upcoming Jan 27, 8:00 PM Women's · Eastern Kentucky at Little Rock | ",
 "Upcoming Jan 30, 2:00 PM Women's · Eastern Kentucky at Central Arkansas | ",
 "Upcoming Feb 3, 5:00 PM Women's · Eastern Kentucky vs UT Arlington | ",
 "Upcoming Feb 6, 1:00 PM Women's · Eastern Kentucky vs Tarleton State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Eastern Kentucky vs Little Rock | ",
 "Upcoming Feb 17, 6:00 PM Women's · Eastern Kentucky at UT Arlington | ",
 "Upcoming Feb 20, 2:00 PM Women's · Eastern Kentucky at Abilene Christian | ",
 "Upcoming Feb 24, 6:30 PM Women's · Eastern Kentucky at North Alabama | ",
 "Upcoming Feb 27, 1:00 PM Women's · Eastern Kentucky vs West Georgia | ",
 "Upcoming Mar 3, 6:00 PM Women's · Eastern Kentucky vs Central Arkansas | ",
 "Upcoming Mar 6, 1:00 PM Women's · Eastern Kentucky vs Austin Peay | ",
 "Upcoming Mar 10 Women's · Eastern Kentucky at United Athletic Conference Tournament First Round | ",
 "Upcoming Mar 11 Women's · Eastern Kentucky at United Athletic Conference Tournament Quarterfinals | ",
 "Upcoming Mar 12 Women's · Eastern Kentucky at United Athletic Conference Tournament Semifinals | ",
 "Upcoming Mar 14 Women's · Eastern Kentucky at United Athletic Conference Tournament Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24 Eastern Kentucky at AVCA Central Bid Qualifier | ",
 "Upcoming Nov 5 Eastern Kentucky at AVCA Pairs National Championship | ",
 "Upcoming Nov 14 Eastern Kentucky vs Alumni Weekend | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Eastern Kentucky at EKU Invitational | Completed",
 "Final Sep 19 Eastern Kentucky at John McNichols Invitational | Completed",
 "Final Oct 9 Eastern Kentucky at Nuttycombe Invitational | Completed",
 "Final Oct 16 Eastern Kentucky at Morehead State Invitational | Completed",
 "Final Oct 16 Eastern Kentucky at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30 Eastern Kentucky at UAC Championships | ",
 "Upcoming Nov 13 Eastern Kentucky at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Eastern Kentucky at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Eastern Kentucky at Western Carolina | L, 21-45",
 "Final Sep 5 Eastern Kentucky at Jacksonville State | L, 7-49",
 "Final Sep 12 Eastern Kentucky vs Chattanooga | W, 22-17",
 "Final Sep 19 Eastern Kentucky vs Dayton | L, 14-17",
 "Final Oct 3 Eastern Kentucky vs North Alabama | L, 16-20",
 "Final Oct 10 Eastern Kentucky vs West Georgia | W, 30-20",
 "Final Oct 17 Eastern Kentucky at Tennessee Tech | L, 20-49",
 "Upcoming Oct 24, 3:00 PM Eastern Kentucky vs West Florida | ",
 "Upcoming Oct 31, 7:00 PM Eastern Kentucky at Tarleton State | ",
 "Upcoming Nov 7, 4:00 PM Eastern Kentucky at Austin Peay | ",
 "Upcoming Nov 14, 2:00 PM Eastern Kentucky vs Central Arkansas | ",
 "Upcoming Nov 21, 2:00 PM Eastern Kentucky at Abilene Christian | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Eastern Kentucky at Redbird Invitational | 6th",
 "Final Sep 21 Women's · Eastern Kentucky at Bettie Lou Evans Invitational | 10th",
 "Final Oct 4 Women's · Eastern Kentucky at Mercedes Benz Intercollegiate | 11th",
 "Final Oct 12 Women's · Eastern Kentucky at Terrier Intercollegiate | 3rd",
 "Final Oct 19 Women's · Eastern Kentucky at Dayton Flyer Invitational | 2nd",
 "Upcoming Feb 22 Women's · Eastern Kentucky at Babs Steffens Invitational | ",
 "Upcoming Mar 12 Women's · Eastern Kentucky at Red Rocks Invitational | ",
 "Upcoming Mar 22 Women's · Eastern Kentucky at Ozarks National Invitational | ",
 "Upcoming Apr 5 Women's · Eastern Kentucky at Colonel Classic | ",
 "Upcoming Apr 11 Women's · Eastern Kentucky at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Eastern Kentucky at United Athletic Conference Championship | ",
 "Upcoming May 10 Women's · Eastern Kentucky at NCAA Regional | ",
 "Upcoming May 21 Women's · Eastern Kentucky at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Eastern Kentucky at Golfweek Fall Challenge | 9th",
 "Final Sep 14 Men's · Eastern Kentucky at Joe Feaganes Marshall Invitational | 3rd",
 "Final Sep 26 Men's · Eastern Kentucky at Earl Yestingsmeier Intercollegiate | 6th",
 "Final Oct 5 Men's · Eastern Kentucky at Cullan Brown Intercollegiate | 15th",
 "Final Oct 19 Men's · Eastern Kentucky at Bank of Tennessee Intercollegiate | Completed",
 "Upcoming Feb 15 Men's · Eastern Kentucky at Wexford Intercollegiate | ",
 "Upcoming Mar 5 Men's · Eastern Kentucky at Bandon Dunes Championship | ",
 "Upcoming Mar 12 Men's · Eastern Kentucky at Seminole Intercollegiate | ",
 "Upcoming Apr 5 Men's · Eastern Kentucky at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · Eastern Kentucky at Mountaineer Invitational | ",
 "Upcoming Apr 30 Men's · Eastern Kentucky at UAC Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Eastern Kentucky at Cincinnati | L, 0-3",
 "Final Aug 16 Eastern Kentucky vs Cleveland State | W, 5-0",
 "Final Aug 23 Eastern Kentucky at Youngstown State | W, 4-0",
 "Final Aug 27 Eastern Kentucky vs Morehead State | W, 1-0",
 "Final Aug 30 Eastern Kentucky at Chattanooga | L, 1-2",
 "Final Sep 3 Eastern Kentucky vs Miami (Ohio) | L, 0-1",
 "Final Sep 6 Eastern Kentucky vs USC Upstate | W, 2-1",
 "Final Sep 10 Eastern Kentucky at Northern Kentucky | T, 2-2",
 "Final Sep 17 Eastern Kentucky vs Xavier | L, 0-2",
 "Final Sep 24 Eastern Kentucky vs Austin Peay | W, 3-0",
 "Final Sep 27 Eastern Kentucky vs West Georgia | W, 2-1",
 "Final Oct 4 Eastern Kentucky at North Alabama | W, 3-2",
 "Final Oct 8 Eastern Kentucky vs Central Arkansas | W, 1-0",
 "Final Oct 11 Eastern Kentucky vs Little Rock | T, 0-0",
 "Final Oct 15 Eastern Kentucky at Tarleton State | L, 0-2",
 "Final Oct 18 Eastern Kentucky at Abilene Christian | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Eastern Kentucky vs North Alabama | ",
 "Upcoming Oct 29, 6:00 PM Eastern Kentucky at West Georgia | ",
 "Upcoming Nov 1, 2:00 PM Eastern Kentucky at Austin Peay | ",
 "Upcoming Nov 8 Eastern Kentucky at United Athletic Conference Tournament Quarterfinals | ",
 "Upcoming Nov 11 Eastern Kentucky at United Athletic Conference Tournament Semifinals | ",
 "Upcoming Nov 14 Eastern Kentucky at United Athletic Conference Tournament Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Eastern Kentucky at Northern Kentucky Invitational | Completed",
 "Final Oct 2 Women's · Eastern Kentucky at Mountaineer Hidden Dual | Completed",
 "Final Oct 8 Women's · Eastern Kentucky at ITA Regionals | Completed",
 "Today Oct 23 Women's · Eastern Kentucky at UAC Fall Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Eastern Kentucky at Northern Kentucky Invitational | Completed",
 "Final Oct 2 Men's · Eastern Kentucky at Louisville Invitational | Completed",
 "Final Oct 8 Men's · Eastern Kentucky at ITA Regionals | Completed",
 "Today Oct 22 Men's · Eastern Kentucky at ASUN Men's Tennis Individual Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Eastern Kentucky vs South Florida | W, 3-2",
 "Final Aug 29 Eastern Kentucky vs Utah State | W, 3-1",
 "Final Sep 4 Eastern Kentucky vs Radford | W, 3-2",
 "Final Sep 5 Eastern Kentucky vs Prairie View A&M | W, 3-1",
 "Final Sep 6 Eastern Kentucky at Georgia Southern | L, 2-3",
 "Final Sep 10 Eastern Kentucky vs James Madison | W, 3-2",
 "Final Sep 11 Eastern Kentucky vs Pepperdine | L, 0-3",
 "Final Sep 12 Eastern Kentucky at Western Kentucky | W, 3-1",
 "Final Sep 15 Eastern Kentucky vs Marshall | W, 3-0",
 "Final Sep 18 Eastern Kentucky vs Presbyterian College | W, 3-0",
 "Final Sep 18 Eastern Kentucky vs Tennessee Tech | W, 3-1",
 "Final Sep 19 Eastern Kentucky vs Appalachian State | W, 3-2",
 "Final Sep 24 Eastern Kentucky at Central Arkansas | W, 3-1",
 "Final Sep 26 Eastern Kentucky at Little Rock | W, 3-0",
 "Final Oct 1 Eastern Kentucky vs Tarleton State | W, 3-0",
 "Final Oct 3 Eastern Kentucky at Texas-Arlington | W, 3-0",
 "Final Oct 6 Eastern Kentucky vs Austin Peay | W, 3-0",
 "Final Oct 10 Eastern Kentucky vs North Alabama | W, 3-0",
 "Final Oct 15 Eastern Kentucky at West Georgia | W, 3-0",
 "Final Oct 17 Eastern Kentucky vs Abilene Christian | W, 3-0",
 "Final Oct 22 Eastern Kentucky vs Little Rock | W, 3-0",
 "Today Oct 23, 6:00 PM Eastern Kentucky vs Central Arkansas | ",
 "Upcoming Oct 29, 6:00 PM Eastern Kentucky vs Texas-Arlington | ",
 "Upcoming Oct 31, 2:00 PM Eastern Kentucky at North Alabama | ",
 "Upcoming Nov 3, 7:00 PM Eastern Kentucky at Austin Peay | ",
 "Upcoming Nov 5, 6:00 PM Eastern Kentucky vs West Georgia | ",
 "Upcoming Nov 12, 7:00 PM Eastern Kentucky at Tarleton State | ",
 "Upcoming Nov 14, 1:00 PM Eastern Kentucky at Abilene Christian | ",
 "Upcoming Nov 19 Eastern Kentucky at United Athletic Conference Tournament Quarterfinals | ",
 "Upcoming Nov 20 Eastern Kentucky at United Athletic Conference Tournament Semifinals | ",
 "Upcoming Nov 21 Eastern Kentucky at United Athletic Conference Tournament Finals | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
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
console.log("Eastern Kentucky module checks passed");
