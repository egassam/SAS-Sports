import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {unlvSchool} from '../src/schools/unlv.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='unlv');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,unlvHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/unlv-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit unlvrebels.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['unlv'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',unlvSchool.scheduleUrls],['roster',unlvSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('unlv|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'unlvrebels.com',`${key} must stay on unlvrebels.com`);
  }
}
const parity={"Baseball":{"schedule":["https://unlvrebels.com/sports/baseball/schedule"],"roster":["https://unlvrebels.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://unlvrebels.com/sports/mens-basketball/schedule","https://unlvrebels.com/sports/womens-basketball/schedule"],"roster":["https://unlvrebels.com/sports/mens-basketball/roster","https://unlvrebels.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://unlvrebels.com/sports/womens-cross-country/schedule"],"roster":["https://unlvrebels.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://unlvrebels.com/sports/football/schedule"],"roster":["https://unlvrebels.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://unlvrebels.com/sports/womens-golf/schedule","https://unlvrebels.com/sports/mens-golf/schedule"],"roster":["https://unlvrebels.com/sports/womens-golf/roster","https://unlvrebels.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://unlvrebels.com/sports/womens-soccer/schedule","https://unlvrebels.com/sports/mens-soccer/schedule"],"roster":["https://unlvrebels.com/sports/womens-soccer/roster","https://unlvrebels.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://unlvrebels.com/sports/softball/schedule"],"roster":["https://unlvrebels.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://unlvrebels.com/sports/swimming-and-diving/schedule"],"roster":["https://unlvrebels.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://unlvrebels.com/sports/womens-tennis/schedule","https://unlvrebels.com/sports/mens-tennis/schedule"],"roster":["https://unlvrebels.com/sports/womens-tennis/roster","https://unlvrebels.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://unlvrebels.com/sports/womens-track-and-field/schedule"],"roster":["https://unlvrebels.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://unlvrebels.com/sports/womens-volleyball/schedule"],"roster":["https://unlvrebels.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'unlv|"+sport+"':"),`${sport} routes must live in the UNLV module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://unlvrebels.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.unlvHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=unlv)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 7 Men's · UNLV vs Utah (Exhibition) | L, 69-79",
 "Upcoming Oct 24, 1:00 PM Men's · UNLV vs BYU (Exhibition) | ",
 "Upcoming Oct 29, 7:00 PM Men's · UNLV vs Missouri (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · UNLV vs Northern Arizona | ",
 "Upcoming Nov 7, 1:00 PM Men's · UNLV vs Samford | ",
 "Upcoming Nov 13, 6:00 PM Men's · UNLV vs Stanford | ",
 "Upcoming Nov 17, 6:30 PM Men's · UNLV vs Kansas | ",
 "Upcoming Nov 18 Men's · UNLV at Players Era Eight | ",
 "Upcoming Nov 23, 7:00 PM Men's · UNLV vs Eastern Washington | ",
 "Upcoming Nov 28, 12:00 PM Men's · UNLV vs UTRGV | ",
 "Upcoming Dec 2, 7:00 PM Men's · UNLV at San Francisco | ",
 "Upcoming Dec 5, 1:30 PM Men's · UNLV at San Diego State | ",
 "Upcoming Dec 12, 12:45 PM Men's · UNLV vs Washington State | ",
 "Upcoming Dec 19, 12:30 PM Men's · UNLV vs SMU | ",
 "Upcoming Dec 22, 7:00 PM Men's · UNLV vs Cal Poly | ",
 "Upcoming Dec 29, 4:00 PM Men's · UNLV vs Westminster | ",
 "Upcoming Jan 2, 5:00 PM Men's · UNLV vs North Dakota | ",
 "Upcoming Jan 5, 7:30 PM Men's · UNLV at Grand Canyon | ",
 "Upcoming Jan 9 Men's · UNLV at San Jose State | ",
 "Upcoming Jan 12, 7:30 PM Men's · UNLV vs New Mexico | ",
 "Upcoming Jan 15, 7:00 PM Men's · UNLV vs UTEP | ",
 "Upcoming Jan 19, 6:00 PM Men's · UNLV at UC Davis | ",
 "Upcoming Jan 23, 7:00 PM Men's · UNLV vs Hawaii | ",
 "Upcoming Jan 26, 6:00 PM Men's · UNLV at Wyoming | ",
 "Upcoming Jan 30, 7:00 PM Men's · UNLV vs UNR | ",
 "Upcoming Feb 2, 5:30 PM Men's · UNLV at Air Force | ",
 "Upcoming Feb 6, 3:00 PM Men's · UNLV vs San Jose State | ",
 "Upcoming Feb 10, 8:00 PM Men's · UNLV vs Wyoming | ",
 "Upcoming Feb 13, 3:00 PM Men's · UNLV at New Mexico | ",
 "Upcoming Feb 17, 5:00 PM Men's · UNLV at UTEP | ",
 "Upcoming Feb 20, 5:00 PM Men's · UNLV vs Grand Canyon | ",
 "Upcoming Feb 24, 7:30 PM Men's · UNLV vs Air Force | ",
 "Upcoming Feb 27, 7:30 PM Men's · UNLV at UNR | ",
 "Upcoming Mar 2, 7:00 PM Men's · UNLV vs UC Davis | ",
 "Upcoming Mar 6 Men's · UNLV at Hawaii | ",
 "Upcoming Mar 10 Men's · UNLV at Mountain West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · UNLV vs Cal State LA (Exhibition) | ",
 "Upcoming Nov 2, 1:00 PM Women's · UNLV vs USC | ",
 "Upcoming Nov 6, 6:30 PM Women's · UNLV vs UTSA | ",
 "Upcoming Nov 10, 6:30 PM Women's · UNLV vs Arizona State | ",
 "Upcoming Nov 15, 1:00 PM Women's · UNLV vs Montana State | ",
 "Upcoming Nov 17, 6:30 PM Women's · UNLV vs Rice | ",
 "Upcoming Nov 21, 2:00 PM Women's · UNLV vs Cincinnati | ",
 "Upcoming Nov 25, 12:00 PM Women's · UNLV vs LMU | ",
 "Upcoming Nov 27, 2:30 PM Women's · UNLV vs Butler | ",
 "Upcoming Dec 2, 3:30 PM Women's · UNLV at UConn | ",
 "Upcoming Dec 5, 11:00 AM Women's · UNLV at Boston | ",
 "Upcoming Dec 13, 1:00 PM Women's · UNLV vs UC Santa Barbara | ",
 "Upcoming Dec 16, 6:00 PM Women's · UNLV at Washington State | ",
 "Upcoming Dec 20, 1:00 PM Women's · UNLV vs Vanguard | ",
 "Upcoming Dec 30, 6:30 PM Women's · UNLV vs UC Davis | ",
 "Upcoming Jan 2, 2:00 PM Women's · UNLV vs UTEP | ",
 "Upcoming Jan 6, 7:00 PM Women's · UNLV at San Jose State | ",
 "Upcoming Jan 9 Women's · UNLV at Wyoming | ",
 "Upcoming Jan 13, 6:30 PM Women's · UNLV vs Air Force | ",
 "Upcoming Jan 16, 5:00 PM Women's · UNLV at New Mexico | ",
 "Upcoming Jan 20, 6:30 PM Women's · UNLV vs Hawai'i | ",
 "Upcoming Jan 24, 1:00 PM Women's · UNLV at UNR | ",
 "Upcoming Jan 27, 6:00 PM Women's · UNLV at UTEP | ",
 "Upcoming Jan 30, 2:00 PM Women's · UNLV vs Wyoming | ",
 "Upcoming Feb 3, 6:30 PM Women's · UNLV vs GCU | ",
 "Upcoming Feb 6, 12:00 PM Women's · UNLV at Air Force | ",
 "Upcoming Feb 13, 7:00 PM Women's · UNLV vs New Mexico | ",
 "Upcoming Feb 17, 6:00 PM Women's · UNLV at UC Davis | ",
 "Upcoming Feb 21, 12:00 PM Women's · UNLV at GCU | ",
 "Upcoming Feb 24, 5:30 PM Women's · UNLV vs San Jose State | ",
 "Upcoming Feb 27, 2:00 PM Women's · UNLV vs UNR | ",
 "Upcoming Mar 2, 7:00 PM Women's · UNLV at Hawai'i | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 UNLV at Coyote Challenge | Completed",
 "Final Sep 19 UNLV at UC Riverside Invitational | Completed",
 "Final Sep 25 UNLV at Duel In The Desert | Completed",
 "Final Oct 3 UNLV at TMU Invitational | Completed",
 "Final Oct 17 UNLV at Bronco Invite | Completed",
 "Upcoming Oct 30 UNLV at Mountain West Championships | ",
 "Upcoming Nov 13 UNLV at NCAA West Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 UNLV vs Memphis | L, 21-27",
 "Final Sep 5 UNLV at Hawai'i | W, 21-6",
 "Final Sep 12 UNLV at North Texas | L, 6-44",
 "Final Sep 26 UNLV at Akron | W, 38-10",
 "Final Oct 3 UNLV vs Cal | W, 39-31",
 "Final Oct 10 UNLV vs NDSU | W, 13-7",
 "Final Oct 17 UNLV at Air Force | L, 31-41",
 "Upcoming Oct 31, 7:30 PM UNLV vs NIU | ",
 "Upcoming Nov 7, 7:30 PM UNLV vs Wyoming | ",
 "Upcoming Nov 14, 4:30 PM UNLV at New Mexico | ",
 "Upcoming Nov 21, 4:00 PM UNLV at San José State | ",
 "Upcoming Nov 28, 6:00 PM UNLV vs UNR | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UNLV at Dick McGuire Invite | 1st",
 "Final Sep 21 Women's · UNLV at Ben Connell Ram Classic | 1st",
 "Final Oct 2 Women's · UNLV at Ron Moore Intercollegiate | 1st",
 "Final Oct 18 Women's · UNLV at Jim West Challenge | Completed",
 "Upcoming Oct 25 Women's · UNLV at The Clash at Boulder Creek | ",
 "Upcoming Feb 8 Women's · UNLV at Thunderbird Intercollegiate | ",
 "Upcoming Feb 21 Women's · UNLV at Westbrook Invite | ",
 "Upcoming Mar 1 Women's · UNLV at Lady Luck Invitational | ",
 "Upcoming Mar 15 Women's · UNLV at GameAbove Golf Invitational | ",
 "Upcoming Mar 22 Women's · UNLV at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 5 Women's · UNLV at Chevron Silverado Showdown | ",
 "Upcoming Apr 20 Women's · UNLV at Mountain West Championship | ",
 "Upcoming May 10 Women's · UNLV at NCAA Regionals | ",
 "Upcoming May 21 Women's · UNLV at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 18 Men's · UNLV at Fighting Illini Invitational | 11th",
 "Final Sep 25 Men's · UNLV at William H. Tucker Intercollegiate | 4th",
 "Final Oct 4 Men's · UNLV at Trinity Forest Invitational | 5th",
 "Final Oct 18 Men's · UNLV at The Williams Cup presented by STITCH Golf | 3rd",
 "Upcoming Jan 25 Men's · UNLV at Southwestern Invitational | ",
 "Upcoming Feb 11 Men's · UNLV at John Burns Intercollegiate | ",
 "Upcoming Feb 28 Men's · UNLV at Las Vegas Collegiate | ",
 "Upcoming Mar 15 Men's · UNLV at Black Desert Collegiate | ",
 "Upcoming Apr 3 Men's · UNLV at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 16 Men's · UNLV at The Thunderbird | ",
 "Upcoming Apr 27 Men's · UNLV at Mountain West Championship | ",
 "Upcoming May 17 Men's · UNLV at NCAA Regionals | ",
 "Upcoming May 28 Men's · UNLV at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UNLV at Cal Poly | L, 0-1",
 "Final Aug 16 Women's · UNLV vs Portland State | W, 1-0",
 "Final Aug 20 Women's · UNLV vs UC San Diego | L, 1-2",
 "Final Aug 23 Women's · UNLV at California Baptist | L, 0-1",
 "Final Aug 27 Women's · UNLV at Idaho State | T, 3-3",
 "Final Sep 3 Women's · UNLV at Cal State Fullerton | L, 1-6",
 "Final Sep 6 Women's · UNLV at CSUN | T, 2-2",
 "Final Sep 17 Women's · UNLV vs Pacific | W, 3-2",
 "Final Sep 24 Women's · UNLV vs UTEP | W, 2-1",
 "Final Sep 27 Women's · UNLV at Grand Canyon | T, 1-1",
 "Final Oct 3 Women's · UNLV at San José State | L, 1-4",
 "Final Oct 7 Women's · UNLV vs Air Force | L, 3-5",
 "Final Oct 11 Women's · UNLV vs Wyoming | L, 2-4",
 "Final Oct 15 Women's · UNLV at UC Davis | L, 0-1",
 "Final Oct 18 Women's · UNLV at New Mexico | L, 0-2",
 "Upcoming Oct 24, 7:00 PM Women's · UNLV vs UNR | ",
 "Upcoming Oct 28, 6:00 PM Women's · UNLV at Hawai'i | ",
 "Upcoming Nov 5, 7:00 PM Women's · UNLV vs Colorado College | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UNLV vs CSUN | W, 2-1",
 "Final Aug 25 Men's · UNLV at Kansas City | L, 0-1",
 "Final Aug 29 Men's · UNLV at CSU Bakersfield | W, 2-1",
 "Final Sep 2 Men's · UNLV at LMU | L, 0-1",
 "Final Sep 6 Men's · UNLV at UC Riverside | T, 1-1",
 "Final Sep 10 Men's · UNLV vs UC San Diego | W, 1-0",
 "Final Sep 13 Men's · UNLV at UC Irvine | W, 2-0",
 "Final Sep 20 Men's · UNLV vs Gonzaga | T, 1-1",
 "Final Sep 26 Men's · UNLV at Grand Canyon | L, 1-2",
 "Final Sep 30 Men's · UNLV vs San Jose State | W, 2-1",
 "Final Oct 4 Men's · UNLV at Air Force | W, 5-1",
 "Final Oct 10 Men's · UNLV at Utah Tech | W, 2-0",
 "Final Oct 14 Men's · UNLV vs UC Davis | W, 1-0",
 "Final Oct 18 Men's · UNLV at San Jose State | L, 1-2",
 "Upcoming Oct 23, 7:00 PM Men's · UNLV vs Grand Canyon | ",
 "Upcoming Oct 28, 6:00 PM Men's · UNLV at UC Davis | ",
 "Upcoming Nov 1, 6:00 PM Men's · UNLV vs Air Force | ",
 "Upcoming Nov 6, 7:00 PM Men's · UNLV vs Utah Tech | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 2:00 PM UNLV vs Salt Lake Community College (Exhibition) | ",
 "Upcoming Oct 24, 12:00 PM UNLV vs Utah Tech (Exhibition) | ",
 "Upcoming Oct 29, 2:00 PM UNLV vs CSN (Exhibition) | ",
 "Upcoming Oct 30, 5:00 PM UNLV vs Pima Community College (Exhibition) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 2 UNLV at Arizona State | Women's team: L, 68-231 / Men's team: L, 55-245",
 "Upcoming Oct 23 UNLV vs Simon Fraser (B.C.) | ",
 "Upcoming Oct 29, 5:00 PM UNLV at UNR (Women Only) | ",
 "Upcoming Oct 29, 5:00 PM UNLV vs CSU Bakersfield (Men Only) | ",
 "Upcoming Nov 6, 5:00 PM UNLV at Utah/Colorado Mesa | ",
 "Upcoming Nov 7, 11:00 AM UNLV at BYU | ",
 "Upcoming Nov 12 UNLV at Trojan Diving Invitational | ",
 "Upcoming Dec 14 UNLV at UNLV Invitational | ",
 "Upcoming Jan 15, 5:00 PM UNLV vs Air Force | ",
 "Upcoming Jan 28 UNLV at Lumberjack Diving Invitational | ",
 "Upcoming Jan 30, 11:00 AM UNLV vs GCU | ",
 "Upcoming Feb 5, 1:00 PM UNLV at USC (Men Only) | ",
 "Upcoming Feb 16 UNLV at Mountain West Championships | ",
 "Upcoming Feb 25 UNLV at Last Chance Invitational | ",
 "Upcoming Mar 8 UNLV at Zone E Diving Qualifier | ",
 "Upcoming Mar 17 UNLV at NCAA Championships (Women) | ",
 "Upcoming Mar 24 UNLV at NCAA Championships (Men) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 24 Women's · UNLV at USTA SoCal Tournament | Completed",
 "Final Oct 13 Women's · UNLV at ITA Regional | Completed",
 "Today Oct 21 Women's · UNLV at Mountain West Fall Qualifier | ",
 "Upcoming Nov 5 Women's · UNLV at ITA Sectionals | ",
 "Upcoming Nov 6 Women's · UNLV at Watanabe Classic | ",
 "Upcoming Jan 16, 10:00 AM Women's · UNLV vs Rice | ",
 "Upcoming Jan 18, 10:00 AM Women's · UNLV vs LMU | ",
 "Upcoming Jan 22 Women's · UNLV at ITA Kickoff Weekend | ",
 "Upcoming Jan 23 Women's · UNLV at ITA Kickoff Weekend | ",
 "Upcoming Jan 29 Women's · UNLV vs Weber State | ",
 "Upcoming Jan 30 Women's · UNLV vs Youngstown State | ",
 "Upcoming Jan 31 Women's · UNLV vs UTSA | ",
 "Upcoming Feb 12, 10:00 AM Women's · UNLV vs Buffalo | ",
 "Upcoming Feb 14, 10:00 AM Women's · UNLV vs Pacific | ",
 "Upcoming Feb 19 Women's · UNLV at Iowa State | ",
 "Upcoming Mar 5, 10:00 AM Women's · UNLV vs Idaho State | ",
 "Upcoming Mar 7, 10:00 AM Women's · UNLV vs CSUN | ",
 "Upcoming Mar 11, 10:00 AM Women's · UNLV vs Memphis | ",
 "Upcoming Mar 25 Women's · UNLV at Hawai'i | ",
 "Upcoming Apr 4 Women's · UNLV vs New Mexico | ",
 "Upcoming Apr 9 Women's · UNLV vs San Jose State | ",
 "Upcoming Apr 11 Women's · UNLV vs UC Davis | ",
 "Upcoming Apr 16 Women's · UNLV at Air Force | ",
 "Upcoming Apr 18 Women's · UNLV at Wyoming | ",
 "Upcoming Apr 23 Women's · UNLV vs GCU | ",
 "Upcoming Apr 25 Women's · UNLV at UNR | ",
 "Upcoming Apr 29 Women's · UNLV at Mountain West Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UNLV at Kinlen & Vivian Gee Wildcat Invite | Completed",
 "Final Sep 19 Men's · UNLV at ITA All-American Championships | Completed",
 "Final Oct 6 Men's · UNLV at ITA Regional | Completed",
 "Today Oct 21 Men's · UNLV at Mountain West Fall Qualifier | ",
 "Upcoming Nov 5 Men's · UNLV at ITA Sectional Championship | ",
 "Upcoming Nov 5 Men's · UNLV at ITA Conference Masters | ",
 "Upcoming Nov 6 Men's · UNLV at Easley Invite | ",
 "Upcoming Nov 17 Men's · UNLV at NCAA Singles and Doubles Championships | ",
 "Upcoming Jan 16 Men's · UNLV vs Creighton | ",
 "Upcoming Jan 23 Men's · UNLV at Texas | ",
 "Upcoming Jan 24 Men's · UNLV at ITA Kickoff Weekend | ",
 "Upcoming Jan 29 Men's · UNLV vs UC Riverside | ",
 "Upcoming Jan 30 Men's · UNLV vs New Mexico State | ",
 "Upcoming Jan 31 Men's · UNLV vs Weber State | ",
 "Upcoming Feb 5 Men's · UNLV vs Idaho State | ",
 "Upcoming Feb 7 Men's · UNLV at GCU | ",
 "Upcoming Feb 14 Men's · UNLV at Utah | ",
 "Upcoming Feb 19 Men's · UNLV vs Pacific | ",
 "Upcoming Feb 26 Men's · UNLV at Arizona State Invitational | ",
 "Upcoming Mar 13 Men's · UNLV vs Tennessee Tech | ",
 "Upcoming Mar 24 Men's · UNLV vs Santa Clara | ",
 "Upcoming Apr 2 Men's · UNLV vs GCU | ",
 "Upcoming Apr 11 Men's · UNLV vs New Mexico | ",
 "Upcoming Apr 16 Men's · UNLV at UC Davis | ",
 "Upcoming Apr 18 Men's · UNLV at UNR | ",
 "Upcoming Apr 23 Men's · UNLV at Air Force | ",
 "Upcoming Apr 25 Men's · UNLV vs Hawai'i | ",
 "Upcoming Apr 29 Men's · UNLV at Mountain West Championship | ",
 "Upcoming May 7 Men's · UNLV at NCAA First and Second Rounds Team Championship | ",
 "Upcoming May 14 Men's · UNLV at NCAA Super Regional Team Championship | ",
 "Upcoming May 21 Men's · UNLV at NCAA Team Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Jan 16 UNLV at UNR Invitational | ",
 "Upcoming Jan 22 UNLV at Ralph Lindeman Classic & Multi | ",
 "Upcoming Jan 29 UNLV at Wolf Pack Invitational | ",
 "Upcoming Feb 12 UNLV at Don Kirby Invite | ",
 "Upcoming Feb 25 UNLV at Mountain West Indoor Championships | ",
 "Upcoming Mar 12 UNLV at NCAA Indoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 UNLV at Utah Tech (Exhibition) | W, 3-2",
 "Final Aug 22 UNLV vs Colorado State (Exhibition) | L, 1-4",
 "Final Aug 29 UNLV vs Nebraska | L, 0-3",
 "Final Aug 30 UNLV vs TCU | L, 0-3",
 "Final Sep 3 UNLV vs Idaho State | L, 1-3",
 "Final Sep 4 UNLV at Boise State | L, 0-3",
 "Final Sep 5 UNLV vs North Dakota State | L, 2-3",
 "Final Sep 11 UNLV at CSUN | L, 2-3",
 "Final Sep 12 UNLV vs Fresno State | W, 3-2",
 "Final Sep 13 UNLV vs San Francisco | L, 2-3",
 "Final Sep 18 UNLV vs Southeastern Louisiana | W, 3-0",
 "Final Sep 19 UNLV vs UC Irvine | W, 3-1",
 "Final Sep 20 UNLV vs UC San Diego | W, 3-2",
 "Final Sep 24 UNLV vs UC Davis | L, 2-3",
 "Final Sep 26 UNLV vs UC Davis | L, 1-3",
 "Final Oct 1 UNLV at UTEP | W, 3-0",
 "Final Oct 3 UNLV at UTEP | L, 0-3",
 "Final Oct 8 UNLV vs Grand Canyon | W, 3-0",
 "Final Oct 10 UNLV at Grand Canyon | L, 2-3",
 "Final Oct 15 UNLV vs UNR | W, 3-0",
 "Final Oct 17 UNLV vs UNR | W, 3-1",
 "Upcoming Oct 23, 10:00 PM UNLV at Hawai‘i | ",
 "Upcoming Oct 24, 10:00 PM UNLV at Hawai'i | ",
 "Upcoming Oct 29, 6:00 PM UNLV vs Air Force | ",
 "Upcoming Oct 31, 12:00 PM UNLV vs Air Force | ",
 "Upcoming Nov 5, 5:30 PM UNLV at Wyoming | ",
 "Upcoming Nov 7, 2:00 PM UNLV at Wyoming | ",
 "Upcoming Nov 12, 6:00 PM UNLV vs New Mexico | ",
 "Upcoming Nov 14, 1:00 PM UNLV vs New Mexico | ",
 "Upcoming Nov 18, 4:00 PM UNLV at San José State | ",
 "Upcoming Nov 19, 3:00 PM UNLV at San José State | ",
 "Upcoming Nov 24 UNLV at Mountain West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UNLV module checks passed");
