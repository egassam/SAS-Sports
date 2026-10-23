import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utMartinSchool} from '../src/schools/ut-martin.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ut-martin');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utMartinHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ut-martin-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utmsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ut-martin'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',utMartinSchool.scheduleUrls],['roster',utMartinSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ut-martin|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utmsports.com',`${key} must stay on utmsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://utmsports.com/sports/baseball/schedule"],"roster":["https://utmsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://utmsports.com/sports/mens-basketball/schedule","https://utmsports.com/sports/womens-basketball/schedule"],"roster":["https://utmsports.com/sports/mens-basketball/roster","https://utmsports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://utmsports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://utmsports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://utmsports.com/sports/womens-cross-country/schedule","https://utmsports.com/sports/mens-cross-country/schedule"],"roster":["https://utmsports.com/sports/womens-cross-country/roster","https://utmsports.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://utmsports.com/sports/equestrian/schedule"],"roster":["https://utmsports.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://utmsports.com/sports/football/schedule"],"roster":["https://utmsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utmsports.com/sports/mens-golf/schedule"],"roster":["https://utmsports.com/sports/mens-golf/roster"],"combined":false},"Rifle":{"schedule":["https://utmsports.com/sports/rifle/schedule"],"roster":["https://utmsports.com/sports/rifle/roster"],"combined":false},"STUNT":{"schedule":["https://utmsports.com/sports/stunt/schedule"],"roster":["https://utmsports.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://utmsports.com/sports/womens-soccer/schedule"],"roster":["https://utmsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://utmsports.com/sports/softball/schedule"],"roster":["https://utmsports.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://utmsports.com/sports/womens-track-and-field/schedule","https://utmsports.com/sports/mens-track-and-field/schedule"],"roster":["https://utmsports.com/sports/womens-track-and-field/roster","https://utmsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://utmsports.com/sports/womens-volleyball/schedule"],"roster":["https://utmsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ut-martin|"+sport+"':"),`${sport} routes must live in the UT Martin module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://utmsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utMartinHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ut-martin)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UT Martin at Tulane | ",
 "Upcoming Nov 7, 4:00 PM Men's · UT Martin at IU Indy | ",
 "Upcoming Nov 10, 7:00 PM Men's · UT Martin at Arkansas State | ",
 "Upcoming Nov 13, 6:00 PM Men's · UT Martin vs Champion Christian | ",
 "Upcoming Nov 15, 4:30 PM Men's · UT Martin vs Ecclesia | ",
 "Upcoming Nov 20, 4:30 PM Men's · UT Martin vs Southern Illinois | ",
 "Upcoming Nov 21 Men's · UT Martin at Paradise Jam | ",
 "Upcoming Nov 23 Men's · UT Martin at Paradise Jam | ",
 "Upcoming Nov 28, 2:00 PM Men's · UT Martin vs Kentucky Christian | ",
 "Upcoming Dec 2, 6:00 PM Men's · UT Martin at Eastern Kentucky | ",
 "Upcoming Dec 6, 11:00 AM Men's · UT Martin at South Carolina | ",
 "Upcoming Dec 9, 6:30 PM Men's · UT Martin at North Alabama | ",
 "Upcoming Dec 14, 6:00 PM Men's · UT Martin vs Northwestern State | ",
 "Upcoming Dec 16, 5:30 PM Men's · UT Martin at Penn State | ",
 "Upcoming Dec 19, 2:00 PM Men's · UT Martin vs Champion Christian | ",
 "Upcoming Dec 22, 1:00 PM Men's · UT Martin at Davidson | ",
 "Upcoming Dec 30, 8:00 PM Men's · UT Martin vs Morehead State | ",
 "Upcoming Jan 2, 3:30 PM Men's · UT Martin at Lindenwood | ",
 "Upcoming Jan 7, 8:00 PM Men's · UT Martin vs Southeast Missouri | ",
 "Upcoming Jan 9, 3:30 PM Men's · UT Martin vs Southern Indiana | ",
 "Upcoming Jan 14, 7:30 PM Men's · UT Martin at SIUE | ",
 "Upcoming Jan 16, 3:30 PM Men's · UT Martin at Western Illinois | ",
 "Upcoming Jan 23, 3:30 PM Men's · UT Martin at Eastern Illinois | ",
 "Upcoming Jan 28, 8:00 PM Men's · UT Martin vs SIUE | ",
 "Upcoming Jan 30, 3:30 PM Men's · UT Martin at Tennessee State | ",
 "Upcoming Feb 4, 8:00 PM Men's · UT Martin vs Western Illinois | ",
 "Upcoming Feb 6, 3:30 PM Men's · UT Martin vs Lindenwood | ",
 "Upcoming Feb 11, 7:30 PM Men's · UT Martin at Southeast Missouri | ",
 "Upcoming Feb 13, 3:30 PM Men's · UT Martin vs Eastern Illinois | ",
 "Upcoming Feb 18, 7:30 PM Men's · UT Martin at Southern Indiana | ",
 "Upcoming Feb 20, 3:30 PM Men's · UT Martin at Morehead State | ",
 "Upcoming Feb 25, 8:00 PM Men's · UT Martin vs Tennessee State | ",
 "Upcoming Mar 3 Men's · UT Martin at OVC Championship Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · UT Martin vs Eastern Kentucky | ",
 "Upcoming Nov 5, 7:00 PM Women's · UT Martin vs Christian Brothers | ",
 "Upcoming Nov 8, 2:00 PM Women's · UT Martin vs Mississippi State | ",
 "Upcoming Nov 12, 6:30 PM Women's · UT Martin at Missouri | ",
 "Upcoming Nov 15, 2:00 PM Women's · UT Martin vs Butler | ",
 "Upcoming Nov 18, 6:00 PM Women's · UT Martin vs Champion Christian | ",
 "Upcoming Nov 20, 6:00 PM Women's · UT Martin at Southern Illinois | ",
 "Upcoming Nov 23, 1:30 PM Women's · UT Martin vs Virginia Tech | ",
 "Upcoming Nov 24 Women's · UT Martin vs Alcorn State/Michigan State | ",
 "Upcoming Nov 29, 11:00 AM Women's · UT Martin at Purdue | ",
 "Upcoming Dec 5, 1:00 PM Women's · UT Martin vs North Alabama | ",
 "Upcoming Dec 10, 7:00 PM Women's · UT Martin at Evansville | ",
 "Upcoming Dec 13, 2:00 PM Women's · UT Martin at Tulsa | ",
 "Upcoming Dec 18, 6:00 PM Women's · UT Martin vs Southern Arkansas | ",
 "Upcoming Dec 20, 12:00 PM Women's · UT Martin at Samford | ",
 "Upcoming Dec 22, 11:00 AM Women's · UT Martin at UAB | ",
 "Upcoming Dec 30, 5:30 PM Women's · UT Martin vs Morehead State | ",
 "Upcoming Jan 2, 1:00 PM Women's · UT Martin at Lindenwood | ",
 "Upcoming Jan 7, 5:30 PM Women's · UT Martin vs Southeast Missouri | ",
 "Upcoming Jan 9, 1:00 PM Women's · UT Martin vs Southern Indiana | ",
 "Upcoming Jan 14, 5:00 PM Women's · UT Martin at SIUE | ",
 "Upcoming Jan 16, 1:00 PM Women's · UT Martin at Western Illinois | ",
 "Upcoming Jan 23, 1:00 PM Women's · UT Martin at Eastern Illinois | ",
 "Upcoming Jan 28, 5:30 PM Women's · UT Martin vs SIUE | ",
 "Upcoming Jan 30, 1:00 PM Women's · UT Martin at Tennessee State | ",
 "Upcoming Feb 4, 5:30 PM Women's · UT Martin vs Western Illinois | ",
 "Upcoming Feb 6, 1:00 PM Women's · UT Martin vs Lindenwood | ",
 "Upcoming Feb 11, 5:00 PM Women's · UT Martin at Southeast Missouri | ",
 "Upcoming Feb 13, 1:00 PM Women's · UT Martin vs Eastern Illinois | ",
 "Upcoming Feb 18, 5:00 PM Women's · UT Martin at Southern Indiana | ",
 "Upcoming Feb 20, 12:00 PM Women's · UT Martin at Morehead State | ",
 "Upcoming Feb 25, 5:30 PM Women's · UT Martin vs Tennessee State | ",
 "Upcoming Mar 3 Women's · UT Martin at Ohio Valley Conference Women's Basketball Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · UT Martin at Memphis Twilight | 7th",
 "Final Sep 18 Women's · UT Martin at SIUE Cougar Cross Country Challenge | 1st",
 "Final Oct 3 Women's · UT Martin at CBU Invitational | 1st",
 "Final Oct 16 Women's · UT Martin at Under Armour Pre-National Invitational | 19th",
 "Upcoming Oct 30 Women's · UT Martin at OVC Cross Country Championships | ",
 "Upcoming Nov 13 Women's · UT Martin at NCAA South Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · UT Martin at Memphis Twilight | 7th",
 "Final Sep 18 Men's · UT Martin at SIUE Cougar Cross Country Challenge | 1st",
 "Final Oct 3 Men's · UT Martin at CBU Invitational | 2nd",
 "Final Oct 16 Men's · UT Martin at Under Armour Pre-National Invitational | 16th",
 "Upcoming Oct 30 Men's · UT Martin at OVC Cross Country Championships | ",
 "Upcoming Nov 13 Men's · UT Martin at NCAA South Regional | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Oct 2 UT Martin vs Baylor | L, 6-9",
 "Final Oct 3 UT Martin at Delaware State | L, 6-10",
 "Upcoming Oct 30 UT Martin at South Dakota State | ",
 "Upcoming Oct 31 UT Martin vs Minnesota-Crookston | ",
 "Upcoming Nov 20 UT Martin vs South Dakota State | ",
 "Upcoming Nov 21 UT Martin vs South Carolina | ",
 "Upcoming Feb 5 UT Martin at Auburn | ",
 "Upcoming Feb 5 UT Martin vs Minnesota-Crookston | ",
 "Upcoming Feb 6 UT Martin at Georgia | ",
 "Upcoming Feb 12 UT Martin vs Texas A&M | ",
 "Upcoming Feb 26 UT Martin vs Delaware State | ",
 "Upcoming Feb 27 UT Martin vs SMU | ",
 "Upcoming Mar 26 UT Martin at Eastern College Athletic Conference Championship | ",
 "Upcoming Apr 15 UT Martin at National Collegiate Equestrian Association Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 UT Martin vs Central Arkansas | L, 24-36",
 "Final Sep 5 UT Martin vs Chicago State | W, 42-7",
 "Final Sep 12 UT Martin at West Virginia | L, 7-52",
 "Final Sep 19 UT Martin at Memphis | L, 21-45",
 "Final Sep 26 UT Martin at Austin Peay | L, 12-35",
 "Final Oct 10 UT Martin at Tennessee State | W, 42-28",
 "Final Oct 17 UT Martin vs Gardner-Webb | W, 17-6",
 "Upcoming Oct 24, 3:00 PM UT Martin at Western Illinois | ",
 "Upcoming Oct 31, 2:00 PM UT Martin vs Eastern Illinois | ",
 "Upcoming Nov 7, 1:00 PM UT Martin at Charleston Southern | ",
 "Upcoming Nov 14, 2:00 PM UT Martin vs Lindenwood | ",
 "Upcoming Nov 21, 1:00 PM UT Martin at Southeast Missouri | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 UT Martin at Golfweek Fall Challenge | 5th",
 "Final Sep 14 UT Martin at Grover Page Classic | 1st",
 "Final Sep 28 UT Martin at SIUE Dolenc Invitational | 3rd",
 "Final Oct 12 UT Martin at The Scrappy at Pinetree | 2nd",
 "Final Oct 19 UT Martin at Twin Oaks Intercollegiate | 1st",
 "Upcoming Feb 28 UT Martin at Loyola Intercollegiate | ",
 "Upcoming Mar 12 UT Martin at Jackrabbits Invitational | ",
 "Upcoming Mar 20 UT Martin at Carpenter/Chaney Classic | ",
 "Upcoming Mar 22 UT Martin at Skyhawk Invitational | ",
 "Upcoming Apr 5 UT Martin at Racer Intercollegiate | ",
 "Upcoming Apr 12 UT Martin at Everett Buick GMC Classic | ",
 "Upcoming Apr 25 UT Martin at Ohio Valley Conference Golf Championships | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 26 UT Martin at Ole Miss | L, 4597-4711",
 "Final Sep 26 UT Martin vs Ohio State | L, 4597-4651",
 "Final Oct 23 UT Martin at Morehead State | L, 4582-4672",
 "Upcoming Oct 24, 8:00 AM UT Martin at Morehead State | ",
 "Upcoming Nov 8, 9:00 AM UT Martin at Morehead State | ",
 "Upcoming Nov 15, 9:00 AM UT Martin at Memphis | ",
 "Upcoming Jan 16, 9:00 AM UT Martin at Murray State | ",
 "Upcoming Jan 22, 9:00 AM UT Martin at UAB | ",
 "Upcoming Jan 23, 9:00 AM UT Martin at UAB | ",
 "Upcoming Jan 30, 9:00 AM UT Martin at Jacksonville State | ",
 "Upcoming Feb 6, 8:00 AM UT Martin at Ohio Valley Conference Rifle Championship - Smallbore | ",
 "Upcoming Feb 7, 8:00 AM UT Martin at Ohio Valley Conference Rifle Championship - Air Rifle | ",
 "Upcoming Feb 20, 9:00 AM UT Martin at Murray State | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 UT Martin at Chattanooga | T, 1-1",
 "Final Aug 16 UT Martin at Chicago State | W, 4-0",
 "Final Aug 20 UT Martin vs Middle Tennessee | T, 0-0",
 "Final Aug 23 UT Martin at Illinois State | T, 1-1",
 "Final Aug 27 UT Martin at Murray State | T, 2-2",
 "Final Aug 30 UT Martin vs Marshall | L, 0-1",
 "Final Sep 3 UT Martin vs Belmont | T, 1-1",
 "Final Sep 6 UT Martin at Central Arkansas | L, 0-1",
 "Final Sep 10 UT Martin at Austin Peay | L, 0-1",
 "Final Sep 13 UT Martin vs Southern Illinois | L, 0-1",
 "Final Sep 20 UT Martin vs Jacksonville State | W, 1-0",
 "Final Sep 27 UT Martin at Southern Indiana | T, 0-0",
 "Final Oct 4 UT Martin vs Lindenwood | W, 1-0",
 "Final Oct 10 UT Martin at SIUE | L, 1-2",
 "Final Oct 15 UT Martin vs Morehead State | T, 0-0",
 "Final Oct 18 UT Martin at Western Illinois | W, 2-0",
 "Upcoming Oct 24, 6:00 PM UT Martin vs Southeast Missouri | ",
 "Upcoming Nov 1, 1:00 PM UT Martin at Eastern Illinois | ",
 "Upcoming Nov 5 UT Martin at Ohio Valley Conference Soccer Championships | ",
 "Upcoming Nov 8 UT Martin at Ohio Valley Conference Soccer Championships | ",
 "Upcoming Nov 12 UT Martin at Ohio Valley Conference Soccer Championships | ",
 "Upcoming Nov 15 UT Martin at Ohio Valley Conference Soccer Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UT Martin at Austin Peay | L, 0-3",
 "Final Aug 28 UT Martin vs Kansas City | L, 2-3",
 "Final Aug 29 UT Martin vs Jackson State | L, 1-3",
 "Final Sep 4 UT Martin vs Chattanooga | L, 0-3",
 "Final Sep 4 UT Martin vs Jackson State | L, 0-3",
 "Final Sep 5 UT Martin at North Alabama | L, 0-3",
 "Final Sep 15 UT Martin vs Evansville | W, 3-1",
 "Final Sep 18 UT Martin vs Arkansas-Pine Bluff | W, 3-0",
 "Final Sep 18 UT Martin vs West Georgia | W, 3-1",
 "Final Sep 19 UT Martin vs West Georgia | W, 3-1",
 "Final Sep 19 UT Martin vs Arkansas-Pine Bluff | W, 3-0",
 "Final Sep 25 UT Martin at SIUE | W, 3-0",
 "Final Sep 26 UT Martin at SIUE | L, 2-3",
 "Final Oct 2 UT Martin vs Morehead State | L, 1-3",
 "Final Oct 3 UT Martin vs Morehead State | L, 1-3",
 "Final Oct 9 UT Martin vs Eastern Illinois | W, 3-1",
 "Final Oct 10 UT Martin vs Eastern Illinois | L, 0-3",
 "Final Oct 16 UT Martin at Western Illinois | W, 3-1",
 "Final Oct 17 UT Martin at Western Illinois | W, 3-0",
 "Today Oct 23, 6:00 PM UT Martin vs Southeast Missouri | ",
 "Upcoming Oct 24, 2:00 PM UT Martin vs Southeast Missouri | ",
 "Upcoming Oct 29, 6:00 PM UT Martin at Southern Indiana | ",
 "Upcoming Oct 30, 6:00 PM UT Martin at Southern Indiana | ",
 "Upcoming Nov 5, 6:00 PM UT Martin vs Lindenwood | ",
 "Upcoming Nov 6, 5:00 PM UT Martin vs Lindenwood | ",
 "Upcoming Nov 17, 6:00 PM UT Martin at Tennessee State | ",
 "Upcoming Nov 18, 6:00 PM UT Martin at Tennessee State | ",
 "Upcoming Nov 22 UT Martin at OVC Championship Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UT Martin module checks passed");
