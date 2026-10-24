import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {indianaStateSchool} from '../src/schools/indiana-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='indiana-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,indianaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/indiana-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gosycamores.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['indiana-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',indianaStateSchool.scheduleUrls],['roster',indianaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('indiana-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gosycamores.com',`${key} must stay on gosycamores.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gosycamores.com/sports/baseball/schedule"],"roster":["https://gosycamores.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gosycamores.com/sports/mens-basketball/schedule","https://gosycamores.com/sports/womens-basketball/schedule"],"roster":["https://gosycamores.com/sports/mens-basketball/roster","https://gosycamores.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gosycamores.com/sports/cross-country/schedule"],"roster":["https://gosycamores.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gosycamores.com/sports/football/schedule"],"roster":["https://gosycamores.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gosycamores.com/sports/womens-golf/schedule"],"roster":["https://gosycamores.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://gosycamores.com/sports/womens-soccer/schedule"],"roster":["https://gosycamores.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gosycamores.com/sports/softball/schedule"],"roster":["https://gosycamores.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gosycamores.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://gosycamores.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Track & Field":{"schedule":["https://gosycamores.com/sports/track-and-field/schedule"],"roster":["https://gosycamores.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gosycamores.com/sports/womens-volleyball/schedule"],"roster":["https://gosycamores.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'indiana-state|"+sport+"':"),`${sport} routes must live in the Indiana State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gosycamores.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.indianaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=indiana-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Indiana State at Butler | L, 81-74",
 "Upcoming Oct 24, 6:00 PM Men's · Indiana State vs Rose-Hulman | ",
 "Upcoming Nov 2, 7:00 PM Men's · Indiana State vs Charlotte | ",
 "Upcoming Nov 6, 7:00 PM Men's · Indiana State at Ball State | ",
 "Upcoming Nov 11, 7:00 PM Men's · Indiana State vs Milwaukee | ",
 "Upcoming Nov 14, 7:00 PM Men's · Indiana State vs Earlham | ",
 "Upcoming Nov 20, 3:00 PM Men's · Indiana State vs Stephen F. Austin | ",
 "Upcoming Nov 21 Men's · Indiana State at 2026 Paradise Jam | ",
 "Upcoming Nov 23 Men's · Indiana State vs Paradise Jam Game No. 3 | ",
 "Upcoming Nov 28, 1:00 PM Men's · Indiana State vs IU Columbus | ",
 "Upcoming Dec 2, 7:00 PM Men's · Indiana State vs SIUE | ",
 "Upcoming Dec 6, 1:00 PM Men's · Indiana State vs Southern Indiana | ",
 "Upcoming Dec 12, 4:00 PM Men's · Indiana State at Oregon | ",
 "Upcoming Dec 15 Men's · Indiana State at UIC | ",
 "Upcoming Dec 19 Men's · Indiana State vs Murray State | ",
 "Upcoming Dec 22, 6:00 PM Men's · Indiana State at Kansas | ",
 "Upcoming Dec 29 Men's · Indiana State vs Drake | ",
 "Upcoming Jan 2 Men's · Indiana State at Illinois State | ",
 "Upcoming Jan 5 Men's · Indiana State at Evansville | ",
 "Upcoming Jan 9 Men's · Indiana State vs Northern Iowa | ",
 "Upcoming Jan 12 Men's · Indiana State vs Bradley | ",
 "Upcoming Jan 16 Men's · Indiana State at Murray State | ",
 "Upcoming Jan 18 Men's · Indiana State at Belmont | ",
 "Upcoming Jan 21 Men's · Indiana State vs Southern Illinois | ",
 "Upcoming Jan 27 Men's · Indiana State at Valparaiso | ",
 "Upcoming Jan 30 Men's · Indiana State vs Evansville | ",
 "Upcoming Feb 3 Men's · Indiana State at Southern Illinois | ",
 "Upcoming Feb 6 Men's · Indiana State vs Illinois State | ",
 "Upcoming Feb 9 Men's · Indiana State at Northern Iowa | ",
 "Upcoming Feb 13 Men's · Indiana State vs Valparaiso | ",
 "Upcoming Feb 15 Men's · Indiana State vs Belmont | ",
 "Upcoming Feb 18 Men's · Indiana State at Drake | ",
 "Upcoming Feb 21 Men's · Indiana State vs UIC | ",
 "Upcoming Feb 24 Men's · Indiana State at Bradley | ",
 "Upcoming Mar 3 Men's · Indiana State at State Farm MVC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Indiana State at Northern Illinois | ",
 "Upcoming Nov 6, 11:30 AM Women's · Indiana State at Seton Hall | ",
 "Upcoming Nov 8, 2:00 PM Women's · Indiana State at Rutgers | ",
 "Upcoming Nov 10, 7:00 PM Women's · Indiana State vs IU Indy | ",
 "Upcoming Nov 13, 7:00 PM Women's · Indiana State vs Wright State | ",
 "Upcoming Nov 17, 7:00 PM Women's · Indiana State vs Bellarmine | ",
 "Upcoming Nov 19, 7:30 PM Women's · Indiana State at Southeast Missouri State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Indiana State vs Chicago State | ",
 "Upcoming Dec 2, 11:00 AM Women's · Indiana State vs SIU Edwardsville | ",
 "Upcoming Dec 6, 1:00 PM Women's · Indiana State at Miami (Ohio) | ",
 "Upcoming Dec 9, 7:00 PM Women's · Indiana State at Eastern Illinois | ",
 "Upcoming Dec 13, 2:00 PM Women's · Indiana State at Butler | ",
 "Upcoming Dec 18, 6:00 PM Women's · Indiana State vs Murray State | ",
 "Upcoming Dec 20 Women's · Indiana State at UIC | ",
 "Upcoming Dec 29, 3:00 PM Women's · Indiana State at Valparaiso | ",
 "Upcoming Dec 31, 2:00 PM Women's · Indiana State vs Northern Iowa | ",
 "Upcoming Jan 3, 2:00 PM Women's · Indiana State vs Drake | ",
 "Upcoming Jan 7, 6:00 PM Women's · Indiana State vs Bradley | ",
 "Upcoming Jan 9, 5:00 PM Women's · Indiana State at Belmont | ",
 "Upcoming Jan 15, 7:00 PM Women's · Indiana State vs Illinois State | ",
 "Upcoming Jan 17, 3:00 PM Women's · Indiana State at Southern Illinois | ",
 "Upcoming Jan 22, 7:00 PM Women's · Indiana State at Drake | ",
 "Upcoming Jan 24 Women's · Indiana State at Northern Iowa | ",
 "Upcoming Jan 28, 7:00 PM Women's · Indiana State at Evansville | ",
 "Upcoming Jan 30 Women's · Indiana State vs UIC | ",
 "Upcoming Feb 4, 7:00 PM Women's · Indiana State vs Belmont | ",
 "Upcoming Feb 7, 2:00 PM Women's · Indiana State vs Valparaiso | ",
 "Upcoming Feb 12, 7:00 PM Women's · Indiana State at Bradley | ",
 "Upcoming Feb 14, 2:00 PM Women's · Indiana State at Illinois State | ",
 "Upcoming Feb 21 Women's · Indiana State vs Evansville | ",
 "Upcoming Feb 25, 7:00 PM Women's · Indiana State vs Southern Illinois | ",
 "Upcoming Feb 27 Women's · Indiana State at Murray State | ",
 "Upcoming Mar 3 Women's · Indiana State at Missouri Valley Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Indiana State at Fighting Illini Invitational | Women's team: 3rd / Men's team: 5th",
 "Final Sep 19 Indiana State at John McNichols Invitational | Women's team: 18th / Men's team: 29th",
 "Final Oct 2 Indiana State at Joe Piane Invitational | Women's team: 15th / Men's team: 14th",
 "Final Oct 2 Indiana State at Nike XC Town Twilight | Women's team: 7th",
 "Final Oct 16 Indiana State at Under Armour Pre-National Invitational | Women's team: 37th / Men's team: 4th",
 "Upcoming Oct 30 Indiana State at Missouri Valley Conference Championships | ",
 "Upcoming Nov 13 Indiana State at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Indiana State at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Indiana State vs SEMO | L, 23-21",
 "Final Sep 4 Indiana State at Purdue | L, 44-19",
 "Final Sep 12 Indiana State at Eastern Illinois | W, 42-35",
 "Final Sep 19 Indiana State vs Valparaiso | W, 39-16",
 "Final Sep 26 Indiana State vs North Dakota | L, 42-35",
 "Final Oct 3 Indiana State at South Dakota | L, 44-14",
 "Final Oct 10 Indiana State vs Youngstown State | L, 57-24",
 "Upcoming Oct 24, 3:00 PM Indiana State at Illinois State | ",
 "Upcoming Oct 31, 2:00 PM Indiana State at Northern Iowa | ",
 "Upcoming Nov 7, 6:00 PM Indiana State vs Southern Illinois | ",
 "Upcoming Nov 14, 1:00 PM Indiana State vs Murray State | ",
 "Upcoming Nov 21, 3:00 PM Indiana State at South Dakota State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Indiana State at A-Ga-Ming Invitational | 3rd of 13",
 "Final Sep 13 Indiana State at Redbird Invitational | 9th of 13",
 "Final Sep 28 Indiana State at NKU Invitational | 4th of 11",
 "Final Oct 5 Indiana State at Butler Fall Invitational | 7th of 14",
 "Final Oct 19 Indiana State at Braun Intercollegiate | Completed"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 Indiana State at Ball State (Exhibition) | W, 1-0",
 "Final Aug 12 Indiana State at Western Illinois | W, 3-0",
 "Final Aug 16 Indiana State vs Western Kentucky | L, 1-0",
 "Final Aug 20 Indiana State vs Saint Mary-of-the-Woods | W, 12-0",
 "Final Aug 22 Indiana State vs Chicago State | W, 5-1",
 "Final Aug 27 Indiana State at Eastern Illinois | T, 0-0",
 "Final Aug 30 Indiana State at Austin Peay | T, 1-1",
 "Final Sep 6 Indiana State at SIUE | T, 2-2",
 "Final Sep 10 Indiana State at Morehead State | W, 2-1",
 "Final Sep 13 Indiana State at Wright State | W, 2-1",
 "Final Sep 20 Indiana State vs Northern Iowa | W, 2-0",
 "Final Sep 27 Indiana State at Valparaiso | L, 2-1",
 "Final Oct 3 Indiana State vs Evansville | W, 1-0",
 "Final Oct 11 Indiana State vs Drake | T, 1-1",
 "Final Oct 15 Indiana State at UIC | T, 0-0",
 "Final Oct 18 Indiana State at Illinois State | T, 1-1",
 "Upcoming Oct 25, 2:00 PM Indiana State at Murray State | ",
 "Upcoming Nov 1, 1:00 PM Indiana State vs Belmont | ",
 "Upcoming Nov 5, 2:00 PM Indiana State vs Southern Illinois | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Indiana State vs Illinois State | W, 240-58",
 "Final Oct 16 Indiana State at Missouri | L, 259-94",
 "Final Oct 16 Indiana State at Missouri State | W, 192-161",
 "Upcoming Oct 24 Indiana State at Dan Ross Invite (Divers) | ",
 "Upcoming Oct 31, 1:00 PM Indiana State vs Northern Kentucky | ",
 "Upcoming Nov 6, 3:00 PM Indiana State vs UIC | ",
 "Upcoming Nov 6, 3:00 PM Indiana State vs Evansville | ",
 "Upcoming Nov 17 Indiana State at Hawkeye Invite | ",
 "Upcoming Dec 5 Indiana State at llinois | ",
 "Upcoming Dec 16, 10:00 AM Indiana State at Florida International | ",
 "Upcoming Dec 16, 10:00 AM Indiana State vs Marshall | ",
 "Upcoming Dec 16, 10:00 AM Indiana State vs Barry | ",
 "Upcoming Jan 8 Indiana State at Vanderbilt | ",
 "Upcoming Jan 8 Indiana State at Arkansas | ",
 "Upcoming Jan 8 Indiana State at Florida Gulf Coast | ",
 "Upcoming Jan 22, 10:00 AM Indiana State at Tim Welsh Classic | ",
 "Upcoming Jan 30, 2:00 PM Indiana State vs Ball State | ",
 "Upcoming Jan 30, 2:00 PM Indiana State vs Southern Illinois | ",
 "Upcoming Feb 6 Indiana State at UIC Diving Invite | ",
 "Upcoming Feb 17 Indiana State at Missouri Valley Championships | ",
 "Upcoming Mar 8 Indiana State at NCAA Diving Zone C | ",
 "Upcoming Mar 11 Indiana State at CSCAA National Invitational | ",
 "Upcoming Mar 17 Indiana State at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 11 Indiana State at Blue-White Classic | ",
 "Upcoming Jan 29 Indiana State at John Gartland Invitational | ",
 "Upcoming Feb 20 Indiana State at ISU Open | ",
 "Upcoming Feb 28 Indiana State at Missouri Valley Conference Championships | ",
 "Upcoming Mar 12 Indiana State at NCAA Indoor National Championships | ",
 "Upcoming Apr 2 Indiana State at Pacesetter Sports Invitational | ",
 "Upcoming Apr 15 Indiana State at Gibson Invitational | ",
 "Upcoming May 7 Indiana State at Sycamore Open | ",
 "Upcoming May 15 Indiana State at Missouri Valley Conference Championships | ",
 "Upcoming May 26 Indiana State at NCAA East First Round | ",
 "Upcoming Jun 9 Indiana State at NCAA Outdoor National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Indiana State vs Navy | W, 3-2",
 "Final Aug 29 Indiana State vs Green Bay | W, 3-0",
 "Final Aug 30 Indiana State at Western Michigan | L, 3-0",
 "Final Sep 4 Indiana State vs Northwestern State | W, 3-2",
 "Final Sep 4 Indiana State vs Little Rock | L, 3-2",
 "Final Sep 5 Indiana State at Missouri State | L, 3-1",
 "Final Sep 10 Indiana State vs Milwaukee | L, 3-2",
 "Final Sep 11 Indiana State vs Milwaukee | L, 3-1",
 "Final Sep 18 Indiana State vs Stonehill | W, 3-1",
 "Final Sep 18 Indiana State vs Columbia | W, 3-2",
 "Final Sep 19 Indiana State at Purdue Fort Wayne | W, 3-1",
 "Final Sep 25 Indiana State vs Bradley | L, 3-0",
 "Final Sep 26 Indiana State vs Southern Illinois | L, 3-0",
 "Final Oct 2 Indiana State at Belmont | L, 3-0",
 "Final Oct 3 Indiana State at Murray State | W, 3-2",
 "Final Oct 9 Indiana State at Illinois State | L, 3-1",
 "Final Oct 10 Indiana State vs Drake | L, 3-1",
 "Final Oct 15 Indiana State at Bradley | L, 3-1",
 "Final Oct 17 Indiana State vs Illinois State | L, 3-1",
 "Today Oct 23, 7:00 PM Indiana State at UIC | ",
 "Upcoming Oct 24, 7:00 PM Indiana State at Valparaiso | ",
 "Upcoming Oct 27, 6:00 PM Indiana State vs Evansville | ",
 "Upcoming Oct 30, 6:00 PM Indiana State vs Northern Iowa | ",
 "Upcoming Nov 6, 6:00 PM Indiana State vs Valparaiso | ",
 "Upcoming Nov 7, 1:00 PM Indiana State vs Murray State | ",
 "Upcoming Nov 10, 7:00 PM Indiana State at Evansville | ",
 "Upcoming Nov 14, 6:00 PM Indiana State at Southern Illinois | ",
 "Upcoming Nov 18 Indiana State at MVC Tournament First Round | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Indiana State module checks passed");
