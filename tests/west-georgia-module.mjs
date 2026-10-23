import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westGeorgiaSchool} from '../src/schools/west-georgia.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='west-georgia');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westGeorgiaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/west-georgia-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uwgathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['west-georgia'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',westGeorgiaSchool.scheduleUrls],['roster',westGeorgiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('west-georgia|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uwgathletics.com',`${key} must stay on uwgathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uwgathletics.com/sports/baseball/schedule"],"roster":["https://uwgathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uwgathletics.com/sports/mens-basketball/schedule","https://uwgathletics.com/sports/womens-basketball/schedule"],"roster":["https://uwgathletics.com/sports/mens-basketball/roster","https://uwgathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uwgathletics.com/sports/womens-cross-country/schedule","https://uwgathletics.com/sports/mens-cross-country/schedule"],"roster":["https://uwgathletics.com/sports/womens-cross-country/roster","https://uwgathletics.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://uwgathletics.com/sports/football/schedule"],"roster":["https://uwgathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uwgathletics.com/sports/womens-golf/schedule","https://uwgathletics.com/sports/mens-golf/schedule"],"roster":["https://uwgathletics.com/sports/womens-golf/roster","https://uwgathletics.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://uwgathletics.com/sports/womens-soccer/schedule"],"roster":["https://uwgathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://uwgathletics.com/sports/softball/schedule"],"roster":["https://uwgathletics.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://uwgathletics.com/sports/womens-track-and-field/schedule","https://uwgathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://uwgathletics.com/sports/womens-track-and-field/roster","https://uwgathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://uwgathletics.com/sports/womens-volleyball/schedule"],"roster":["https://uwgathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'west-georgia|"+sport+"':"),`${sport} routes must live in the West Georgia module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://uwgathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westGeorgiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=west-georgia)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · West Georgia vs Kennesaw State (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · West Georgia at DePaul | ",
 "Upcoming Nov 5, 8:00 PM Men's · West Georgia at Loyola University Chicago | ",
 "Upcoming Nov 11, 7:00 PM Men's · West Georgia vs UNC Asheville | ",
 "Upcoming Nov 14, 7:00 PM Men's · West Georgia at Charleston Southern | ",
 "Upcoming Nov 18, 7:00 PM Men's · West Georgia vs Columbia College (S.C.) | ",
 "Upcoming Nov 20, 7:00 PM Men's · West Georgia vs Paine College | ",
 "Upcoming Nov 24, 7:30 PM Men's · West Georgia at Tennessee Tech | ",
 "Upcoming Nov 29, 2:00 PM Men's · West Georgia at South Carolina - Upstate | ",
 "Upcoming Dec 1, 11:00 AM Men's · West Georgia vs Southern Indiana | ",
 "Upcoming Dec 6, 6:00 PM Men's · West Georgia vs Life | ",
 "Upcoming Dec 12, 2:00 PM Men's · West Georgia at Vanderbilt | ",
 "Upcoming Dec 16, 6:00 PM Men's · West Georgia at Georgia | ",
 "Upcoming Dec 19, 2:00 PM Men's · West Georgia vs West Florida | ",
 "Upcoming Dec 21, 7:00 PM Men's · West Georgia vs Queens | ",
 "Upcoming Dec 31, 3:00 PM Men's · West Georgia at Lipscomb | ",
 "Upcoming Jan 2, 2:00 PM Men's · West Georgia at Bellarmine | ",
 "Upcoming Jan 6, 7:00 PM Men's · West Georgia vs North Alabama | ",
 "Upcoming Jan 9, 4:00 PM Men's · West Georgia at Eastern Kentucky | ",
 "Upcoming Jan 13, 8:00 PM Men's · West Georgia at Little Rock | ",
 "Upcoming Jan 16, 2:00 PM Men's · West Georgia at Central Arkansas | ",
 "Upcoming Jan 20, 7:45 PM Men's · West Georgia vs UT Arlington | ",
 "Upcoming Jan 23, 4:30 PM Men's · West Georgia vs Abilene Christian | ",
 "Upcoming Jan 27, 8:45 PM Men's · West Georgia at Tarleton State | ",
 "Upcoming Jan 30, 2:00 PM Men's · West Georgia vs Eastern Kentucky | ",
 "Upcoming Feb 3, 7:30 PM Men's · West Georgia at North Alabama | ",
 "Upcoming Feb 10, 7:00 PM Men's · West Georgia vs Little Rock | ",
 "Upcoming Feb 13, 2:00 PM Men's · West Georgia vs Austin Peay | ",
 "Upcoming Feb 17, 9:00 PM Men's · West Georgia at UT Arlington | ",
 "Upcoming Feb 20, 6:00 PM Men's · West Georgia at Abilene Christian | ",
 "Upcoming Feb 24, 8:00 PM Men's · West Georgia at Austin Peay | ",
 "Upcoming Feb 27, 7:00 PM Men's · West Georgia vs Central Arkansas | ",
 "Upcoming Mar 3, 7:45 PM Men's · West Georgia vs Tarleton State | ",
 "Upcoming Mar 10 Men's · West Georgia at UAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · West Georgia vs Shorter | ",
 "Upcoming Nov 2, 5:00 PM Women's · West Georgia at Georgia | ",
 "Upcoming Nov 7, 2:00 PM Women's · West Georgia vs Alabama State | ",
 "Upcoming Nov 10, 7:00 PM Women's · West Georgia vs Fort Valley State | ",
 "Upcoming Nov 13, 6:00 PM Women's · West Georgia at Stonehill College | ",
 "Upcoming Nov 15, 12:00 PM Women's · West Georgia at UMASS-Lowell | ",
 "Upcoming Nov 20, 1:00 PM Women's · West Georgia at Mississippi Valley State | ",
 "Upcoming Nov 24, 2:00 PM Women's · West Georgia vs Agnes Scott College | ",
 "Upcoming Nov 29, 2:00 PM Women's · West Georgia vs Samford | ",
 "Upcoming Dec 2, 11:00 AM Women's · West Georgia vs West Florida | ",
 "Upcoming Dec 6, 2:00 PM Women's · West Georgia at Queens | ",
 "Upcoming Dec 14, 11:00 AM Women's · West Georgia at Alabama | ",
 "Upcoming Dec 19, 2:00 PM Women's · West Georgia at West Florida | ",
 "Upcoming Dec 21, 1:00 PM Women's · West Georgia at Georgia Tech | ",
 "Upcoming Dec 28, 12:00 PM Women's · West Georgia vs Auburn Montgomery | ",
 "Upcoming Dec 31, 2:00 PM Women's · West Georgia vs Lipscomb | ",
 "Upcoming Jan 2 Women's · West Georgia vs Bellarmine | ",
 "Upcoming Jan 6, 7:30 PM Women's · West Georgia at Central Arkansas | ",
 "Upcoming Jan 9, 2:00 PM Women's · West Georgia at Little Rock | ",
 "Upcoming Jan 13, 7:00 PM Women's · West Georgia vs Tarleton State | ",
 "Upcoming Jan 16, 3:00 PM Women's · West Georgia at Austin Peay | ",
 "Upcoming Jan 20, 5:30 PM Women's · West Georgia vs Eastern Kentucky | ",
 "Upcoming Jan 23, 2:00 PM Women's · West Georgia vs Central Arkansas | ",
 "Upcoming Jan 27, 5:00 PM Women's · West Georgia at UT Arlington | ",
 "Upcoming Feb 3, 7:00 PM Women's · West Georgia vs Abilene Christian | ",
 "Upcoming Feb 6, 2:00 PM Women's · West Georgia vs Little Rock | ",
 "Upcoming Feb 10 Women's · West Georgia at North Alabama | ",
 "Upcoming Feb 17, 6:30 PM Women's · West Georgia at Abilene Christian | ",
 "Upcoming Feb 20, 3:00 PM Women's · West Georgia at Tarleton State | ",
 "Upcoming Feb 24, 7:00 PM Women's · West Georgia vs UT Arlington | ",
 "Upcoming Feb 27, 1:00 PM Women's · West Georgia at Eastern Kentucky | ",
 "Upcoming Mar 3, 5:30 PM Women's · West Georgia vs Austin Peay | ",
 "Upcoming Mar 6, 2:00 PM Women's · West Georgia vs North Alabama | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · West Georgia at Foothills Invitational | 12th",
 "Final Sep 18 Women's · West Georgia at Southern Showcase | 11th",
 "Final Sep 25 Women's · West Georgia at Tryon Western NC XC Showcase | 9th Race",
 "Final Oct 17 Women's · West Georgia at USC Upstate Invitational | 21st",
 "Upcoming Oct 30, 9:00 AM Women's · West Georgia at UAC Conference Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · West Georgia at Foothills Invitational | 6th",
 "Final Sep 18 Men's · West Georgia at Southern Showcase | 26th",
 "Final Sep 25 Men's · West Georgia at Tryon Western NC XC Showcase | 3rd",
 "Final Oct 17 Men's · West Georgia at USC Upstate Invitational | 14th",
 "Upcoming Oct 30, 9:00 AM Men's · West Georgia at UAC Conference Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 West Georgia vs Chattanooga | L, 24-10",
 "Final Sep 3 West Georgia at Kennesaw State | L, 47-0",
 "Final Sep 12 West Georgia at Arkansas State | L, 52-7",
 "Final Sep 19 West Georgia at East Tennessee State | L, 35-27",
 "Final Sep 26 West Georgia vs Fort Valley State | W, 49-7",
 "Final Oct 10 West Georgia at Eastern Kentucky | L, 30-20",
 "Final Oct 17 West Georgia vs Austin Peay | L, 24-10",
 "Upcoming Oct 24, 2:00 PM West Georgia vs Tarleton State | ",
 "Upcoming Oct 31, 4:00 PM West Georgia at Abilene Christian | ",
 "Upcoming Nov 7, 5:00 PM West Georgia at Central Arkansas | ",
 "Upcoming Nov 14, 2:00 PM West Georgia vs North Alabama | ",
 "Upcoming Nov 21, 2:00 PM West Georgia vs West Florida | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · West Georgia at Tiger Classic | 4th",
 "Final Sep 14 Women's · West Georgia at The Velvet | 3rd",
 "Final Sep 21 Women's · West Georgia at Johnie Imes Invitational | 3rd",
 "Final Oct 12 Women's · West Georgia at Lady Red Wolves Classic | 6th",
 "Final Oct 19 Women's · West Georgia at Edisto Island Invitational | 7th",
 "Upcoming Feb 1 Women's · West Georgia at UCF Challenge | ",
 "Upcoming Mar 7 Women's · West Georgia at Chris Banister Golf Classic | ",
 "Upcoming Mar 21 Women's · West Georgia at Georgia State Invitational | ",
 "Upcoming Mar 29 Women's · West Georgia at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 Women's · West Georgia at Brickyard Collegiate | ",
 "Upcoming Apr 23 Women's · West Georgia at UAC Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · West Georgia at Augusta Jaguar Invitational | 7th",
 "Final Sep 6 Men's · West Georgia at Golfweek Fall Challenge | 11th",
 "Final Sep 20 Men's · West Georgia at GMAC Invitational | 13th",
 "Final Oct 5 Men's · West Georgia at West Bay Invitational | 15th",
 "Final Oct 12 Men's · West Georgia at Elon Phoenix Invitational | 13th",
 "Upcoming Feb 26 Men's · West Georgia at The Peoples Championship | ",
 "Upcoming Mar 8 Men's · West Georgia at Surf Club Invitational | ",
 "Upcoming Mar 15 Men's · West Georgia at Auburn Tiger Invitational | ",
 "Upcoming Mar 19 Men's · West Georgia at Linger Longer Invitational | ",
 "Upcoming Apr 12 Men's · West Georgia at Stetson Invitational | ",
 "Upcoming Apr 30 Men's · West Georgia at UAC Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 West Georgia at Jax State | T, 1-1",
 "Final Aug 16 West Georgia vs Mercer | L, 1-0",
 "Final Aug 20 West Georgia at East Tennessee State | L, 1-0",
 "Final Aug 23 West Georgia vs Middle Tennessee | L, 2-0",
 "Final Sep 6 West Georgia vs Western Carolina | L, 1-0",
 "Final Sep 10 West Georgia vs Georgia State | L, 4-1",
 "Final Sep 13 West Georgia at Kennesaw State | T, 1-1",
 "Final Sep 24 West Georgia vs North Alabama | L, 1-0",
 "Final Sep 27 West Georgia at EKU | L, 2-1",
 "Final Oct 4 West Georgia vs Austin Peay | L, 3-1",
 "Final Oct 8 West Georgia vs Little Rock | L, 3-0",
 "Final Oct 11 West Georgia vs Central Arkansas | L, 3-1",
 "Final Oct 16 West Georgia at Abilene Christian | L, 4-0",
 "Final Oct 18 West Georgia at Tarleton State | L, 4-0",
 "Upcoming Oct 25, 2:00 PM West Georgia at Austin Peay | ",
 "Upcoming Oct 29, 6:00 PM West Georgia vs EKU | ",
 "Upcoming Nov 1, 2:00 PM West Georgia at North Alabama | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 West Georgia vs Northwestern State | W, 3-0",
 "Final Aug 28 West Georgia vs Grambling State | L, 3-2",
 "Final Aug 29 West Georgia vs Presbyterian College | L, 3-1",
 "Final Sep 4 West Georgia vs Alabama A&M | L, 3-2",
 "Final Sep 4 West Georgia at Kennesaw State | L, 3-0",
 "Final Sep 5 West Georgia at Georgia State | L, 3-0",
 "Final Sep 11 West Georgia vs Gardner-Webb | W, 3-1",
 "Final Sep 11 West Georgia vs New Orleans | W, 3-0",
 "Final Sep 12 West Georgia vs Mercer | L, 3-2",
 "Final Sep 18 West Georgia vs Arkansas - Pine Bluff | W, 3-0",
 "Final Sep 18 West Georgia at UT Martin | L, 3-1",
 "Final Sep 19 West Georgia at UT Martin | L, 3-1",
 "Final Sep 24 West Georgia at UT Arlington | L, 3-2",
 "Final Sep 26 West Georgia vs Abilene Christian | L, 3-0",
 "Final Sep 29 West Georgia vs North Alabama | L, 3-0",
 "Final Oct 1 West Georgia vs Central Arkansas | L, 3-1",
 "Final Oct 8 West Georgia at Little Rock | L, 3-1",
 "Final Oct 10 West Georgia at Central Arkansas | L, 3-0",
 "Final Oct 15 West Georgia vs Eastern Kentucky | L, 3-0",
 "Final Oct 17 West Georgia vs UT Arlington | L, 3-1",
 "Final Oct 22 West Georgia at Tarleton State | L, 3-1",
 "Upcoming Oct 24, 2:00 PM West Georgia at Abilene Christian | ",
 "Upcoming Oct 29, 6:00 PM West Georgia vs Austin Peay | ",
 "Upcoming Oct 31, 1:00 PM West Georgia vs Tarleton State | ",
 "Upcoming Nov 5, 6:00 PM West Georgia at Eastern Kentucky | ",
 "Upcoming Nov 7, 12:00 PM West Georgia at Austin Peay | ",
 "Upcoming Nov 10, 7:00 PM West Georgia at North Alabama | ",
 "Upcoming Nov 12, 6:00 PM West Georgia vs Little Rock | ",
 "Upcoming Nov 19 West Georgia at UAC Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("West Georgia module checks passed");
