import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {murrayStateSchool} from '../src/schools/murray-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='murray-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,murrayStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/murray-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goracers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['murray-state'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',murrayStateSchool.scheduleUrls],['roster',murrayStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('murray-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goracers.com',`${key} must stay on goracers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goracers.com/sports/baseball/schedule"],"roster":["https://goracers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goracers.com/sports/mens-basketball/schedule","https://goracers.com/sports/womens-basketball/schedule"],"roster":["https://goracers.com/sports/mens-basketball/roster","https://goracers.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://goracers.com/sports/bvb/schedule"],"roster":["https://goracers.com/sports/bvb/roster"],"combined":false},"Bowling":{"schedule":["https://goracers.com/sports/bowling/schedule"],"roster":["https://goracers.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://goracers.com/sports/womens-cross-country/schedule","https://goracers.com/sports/mens-cross-country/schedule"],"roster":["https://goracers.com/sports/womens-cross-country/roster","https://goracers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goracers.com/sports/football/schedule"],"roster":["https://goracers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goracers.com/sports/womens-golf/schedule","https://goracers.com/sports/mens-golf/schedule"],"roster":["https://goracers.com/sports/womens-golf/roster","https://goracers.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://goracers.com/sports/rifle/schedule"],"roster":["https://goracers.com/sports/rifle/roster"],"combined":false},"Rowing":{"schedule":["https://goracers.com/sports/rowing/schedule"],"roster":["https://goracers.com/sports/rowing/roster"],"combined":false},"STUNT":{"schedule":["https://goracers.com/sports/stunt/schedule"],"roster":["https://goracers.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://goracers.com/sports/womens-soccer/schedule"],"roster":["https://goracers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goracers.com/sports/softball/schedule"],"roster":["https://goracers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goracers.com/sports/womens-tennis/schedule"],"roster":["https://goracers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://goracers.com/sports/womens-track-and-field/schedule"],"roster":["https://goracers.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goracers.com/sports/womens-volleyball/schedule"],"roster":["https://goracers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'murray-state|"+sport+"':"),`${sport} routes must live in the Murray State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goracers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.murrayStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=murray-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 7 Men's · Murray State at Wichita State (Exhibition) | W, 93-87",
 "Final Oct 22 Men's · Murray State at Florida International | W, 86-79",
 "Upcoming Nov 2, 10:30 AM Men's · Murray State vs Tennessee State | ",
 "Upcoming Nov 7, 7:00 PM Men's · Murray State vs Northwestern State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Murray State vs Alcorn State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Murray State vs Texas Southern | ",
 "Upcoming Nov 17, 11:00 AM Men's · Murray State vs Hofstra | ",
 "Upcoming Nov 19, 5:00 PM Men's · Murray State vs NC State | ",
 "Upcoming Nov 20, 6:00 PM Men's · Murray State vs Wisconsin / Seton Hall | ",
 "Upcoming Nov 30, 7:00 PM Men's · Murray State vs Washington State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Murray State vs Chicago State | ",
 "Upcoming Dec 6, 3:00 PM Men's · Murray State vs Georgia Tech | ",
 "Upcoming Dec 9, 7:00 PM Men's · Murray State vs Arkansas-Pine Bluff | ",
 "Upcoming Dec 12 Men's · Murray State vs Santa Clara | ",
 "Upcoming Dec 17, 5:00 PM Men's · Murray State vs Illinois State | ",
 "Upcoming Dec 19 Men's · Murray State at Indiana State | ",
 "Upcoming Dec 29 Men's · Murray State vs UIC | ",
 "Upcoming Jan 1 Men's · Murray State vs Drake | ",
 "Upcoming Jan 4 Men's · Murray State at Bradley | ",
 "Upcoming Jan 9 Men's · Murray State vs Evansville | ",
 "Upcoming Jan 12 Men's · Murray State at Southern Illinois | ",
 "Upcoming Jan 16 Men's · Murray State vs Indiana State | ",
 "Upcoming Jan 21 Men's · Murray State at Northern Iowa | ",
 "Upcoming Jan 24 Men's · Murray State at Drake | ",
 "Upcoming Jan 27 Men's · Murray State vs Bradley | ",
 "Upcoming Jan 30 Men's · Murray State vs Valparaiso | ",
 "Upcoming Feb 3 Men's · Murray State at UIC | ",
 "Upcoming Feb 6 Men's · Murray State vs Belmont | ",
 "Upcoming Feb 9 Men's · Murray State at Evansville | ",
 "Upcoming Feb 12 Men's · Murray State at Illinois State | ",
 "Upcoming Feb 15 Men's · Murray State vs Southern Illinois | ",
 "Upcoming Feb 20 Men's · Murray State at Belmont | ",
 "Upcoming Feb 24 Men's · Murray State vs Northern Iowa | ",
 "Upcoming Feb 27 Men's · Murray State at Valparaiso | ",
 "Upcoming Mar 3 Men's · Murray State at Arch Madness | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Murray State at Southern Indiana | ",
 "Upcoming Nov 6 Women's · Murray State vs Rice | ",
 "Upcoming Nov 8 Women's · Murray State vs Princeton | ",
 "Upcoming Nov 12 Women's · Murray State vs Morehead State | ",
 "Upcoming Nov 17 Women's · Murray State at Oregon | ",
 "Upcoming Nov 21 Women's · Murray State vs Eastern Illinois | ",
 "Upcoming Nov 25 Women's · Murray State at Purdue | ",
 "Upcoming Nov 28 Women's · Murray State vs Northern Kentucky | ",
 "Upcoming Dec 1 Women's · Murray State at UAB | ",
 "Upcoming Dec 5 Women's · Murray State vs SIUE | ",
 "Upcoming Dec 13 Women's · Murray State vs Austin Peay | ",
 "Upcoming Dec 15 Women's · Murray State at Bellarmine | ",
 "Upcoming Dec 18 Women's · Murray State at Indiana State | ",
 "Upcoming Dec 20 Women's · Murray State vs Bradley | ",
 "Upcoming Dec 29 Women's · Murray State at Southern Illinois | ",
 "Upcoming Dec 31 Women's · Murray State vs Illinois State | ",
 "Upcoming Jan 3 Women's · Murray State vs UIC | ",
 "Upcoming Jan 7 Women's · Murray State vs Valparaiso | ",
 "Upcoming Jan 11 Women's · Murray State vs Evansville | ",
 "Upcoming Jan 14 Women's · Murray State at Drake | ",
 "Upcoming Jan 16 Women's · Murray State at Northern Iowa | ",
 "Upcoming Jan 22 Women's · Murray State at Valparaiso | ",
 "Upcoming Jan 24 Women's · Murray State at Illinois State | ",
 "Upcoming Jan 28 Women's · Murray State at Bradley | ",
 "Upcoming Jan 30 Women's · Murray State vs Belmont | ",
 "Upcoming Feb 5 Women's · Murray State vs Northern Iowa | ",
 "Upcoming Feb 7 Women's · Murray State vs Drake | ",
 "Upcoming Feb 12 Women's · Murray State at UIC | ",
 "Upcoming Feb 19 Women's · Murray State vs Southern Illinois | ",
 "Upcoming Feb 21 Women's · Murray State at Belmont | ",
 "Upcoming Feb 25 Women's · Murray State at Evansville | ",
 "Upcoming Feb 27 Women's · Murray State vs Indiana State | ",
 "Upcoming Mar 3 Women's · Murray State at Arch Madness | "
]);
  const v_bvb=parse("Beach Volleyball","bvb");
  assert.deepEqual(v_bvb.map(line),[]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Murray State at Walt Crawford Invite | Completed",
 "Final Sep 18 Women's · Murray State at OVC Preview | Completed",
 "Final Sep 25 Women's · Murray State at Gans Creek Classic | Completed",
 "Final Oct 16 Women's · Murray State at Under Armour Pre-National Invitational | Completed",
 "Upcoming Oct 30 Women's · Murray State at MVC Championships | ",
 "Upcoming Nov 13 Women's · Murray State at NCAA | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Murray State at Walt Crawford Invite | Completed",
 "Final Sep 18 Men's · Murray State at OVC Preview | Completed",
 "Final Sep 25 Men's · Murray State at Gans Creek Classic | Completed",
 "Final Oct 16 Men's · Murray State at Under Armour Pre-National Invitational | Completed",
 "Upcoming Oct 30 Men's · Murray State at MVC Championships | ",
 "Upcoming Nov 13 Men's · Murray State at NCAA | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Murray State vs Eastern Illinois | L, 14-28",
 "Final Sep 5 Murray State at Middle Tennessee | L, 14-38",
 "Final Sep 12 Murray State vs Valparaiso | W, 27-18",
 "Final Sep 19 Murray State at Oklahoma State | L, 0-59",
 "Final Sep 26 Murray State vs Southern Illinois | L, 6-46",
 "Final Oct 3 Murray State at North Dakota | L, 28-55",
 "Final Oct 17 Murray State vs South Dakota | L, 20-48",
 "Upcoming Oct 24, 2:00 PM Murray State at South Dakota State | ",
 "Upcoming Oct 31, 1:00 PM Murray State at Illinois State | ",
 "Upcoming Nov 7, 1:00 PM Murray State vs Youngstown State | ",
 "Upcoming Nov 14, 12:00 PM Murray State at Indiana State | ",
 "Upcoming Nov 21, 1:00 PM Murray State vs Northern Iowa | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Murray State at A Ga Ming Invitational | T5th of 13",
 "Final Sep 14 Women's · Murray State at The Velvet | 4th of 14",
 "Final Sep 21 Women's · Murray State at Kalispel Invitational | 7th of 15",
 "Final Sep 27 Women's · Murray State at Battle of the Border/ Austin Peay | Match play: 1-0",
 "Final Oct 12 Women's · Murray State at Lady Red Wolves Classic | 2nd of 13",
 "Upcoming Oct 26 Women's · Murray State at French Broad Collegiate Invitational | ",
 "Upcoming Feb 19 Women's · Murray State at Rio Verde Invitational | ",
 "Upcoming Mar 2 Women's · Murray State at Puerto Rico Iguana Invitational | ",
 "Upcoming Mar 20 Women's · Murray State at Annika Foundation More Than Golf Invitational | ",
 "Upcoming Apr 5 Women's · Murray State at Olde Stone Collegiate | ",
 "Upcoming Apr 10 Women's · Murray State at Jan Weaver Invitational | ",
 "Upcoming Apr 18 Women's · Murray State at Missouri Valley Conference Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Murray State at Golfweek Fall Challenge | 10th of 16",
 "Final Sep 14 Men's · Murray State at Joe Feaganes Marshall Invitational | 6th of 14",
 "Final Oct 5 Men's · Murray State at Nemacolin Collegiate Invitational | 11th of 16",
 "Final Oct 12 Men's · Murray State at Bubba Barnett Intercollegiate | 5th of 17",
 "Upcoming Oct 25 Men's · Murray State at ODU/OBX Intercollegiate | ",
 "Upcoming Feb 26 Men's · Murray State at Peoples Golf Championship | ",
 "Upcoming Mar 12 Men's · Murray State at Seminole Intercollegiate | ",
 "Upcoming Mar 22 Men's · Murray State at Skyhawk Invitational | ",
 "Upcoming Apr 5 Men's · Murray State at Racer Intercollegiate | ",
 "Upcoming Apr 12 Men's · Murray State at APSU Intercollegiate | ",
 "Upcoming Apr 17 Men's · Murray State at Spring Boilermaker Shootout | ",
 "Upcoming Apr 25 Men's · Murray State at Missouri Valley Conference Tournament | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 10 Murray State at Kentucky | L, 4702-4724",
 "Final Oct 17 Murray State at Morehead State | W, 4712-4660",
 "Upcoming Oct 24, 9:00 AM Murray State at Jacksonville State | ",
 "Upcoming Oct 31, 9:00 AM Murray State at Ohio State | ",
 "Upcoming Nov 1, 9:00 AM Murray State at UTEP | ",
 "Upcoming Nov 14, 9:00 AM Murray State at Georgia Southern | ",
 "Upcoming Nov 20, 9:00 AM Murray State at Jacksonville State | ",
 "Upcoming Jan 16, 9:00 AM Murray State at UT Martin | ",
 "Upcoming Jan 23 Murray State at Withrow Invitational | ",
 "Upcoming Jan 30, 9:00 AM Murray State at Memphis | ",
 "Upcoming Feb 6 Murray State at OVC Championship | ",
 "Upcoming Feb 13, 9:00 AM Murray State at Ole Miss | ",
 "Upcoming Feb 14, 9:00 AM Murray State at Jacksonville State | ",
 "Upcoming Feb 20 Murray State at NCAA Qualifiers | ",
 "Upcoming Mar 12 Murray State at NCAA Rifle Championships | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Murray State at Western Kentucky (Exhibition) | L, 1-4",
 "Final Aug 8 Murray State at Bellarmine (Exhibition) | W, 2-1",
 "Final Aug 12 Murray State at Ole Miss | L, 0-1",
 "Final Aug 16 Murray State vs Missouri | L, 1-3",
 "Final Aug 23 Murray State at Notre Dame | L, 0-3",
 "Final Aug 27 Murray State vs UT Martin | T, 2-2",
 "Final Aug 30 Murray State vs Georgia Southern | L, 0-1",
 "Final Sep 3 Murray State at Marshall | T, 0-0",
 "Final Sep 6 Murray State vs Austin Peay | W, 3-0",
 "Final Sep 10 Murray State at Tennessee Tech | L, 1-2",
 "Final Sep 13 Murray State at Lindenwood | L, 0-1",
 "Final Sep 20 Murray State vs Illinois State | L, 0-1",
 "Final Sep 26 Murray State at Southern Illinois | L, 1-2",
 "Final Oct 4 Murray State vs Valparaiso | W, 3-0",
 "Final Oct 11 Murray State vs UIC | W, 1-0",
 "Final Oct 15 Murray State at Drake | T, 1-1",
 "Final Oct 18 Murray State at UNI | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Murray State vs Indiana State | ",
 "Upcoming Nov 1, 1:00 PM Murray State at Evansville | ",
 "Upcoming Nov 5, 1:00 PM Murray State vs Belmont | ",
 "Upcoming Nov 8 Murray State at Missouri Valley Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 22 Murray State vs Lincoln Trail College (Exhibition) | W, 14-1",
 "Final Sep 27 Murray State vs Wabash Valley College (Exhibition) | W, 12-7",
 "Final Sep 30 Murray State vs Austin Peay (Exhibition) | W, 2-1",
 "Final Oct 3 Murray State at UT Martin (Exhibition) | W, 8-3",
 "Final Oct 4 Murray State vs Dyersburg State Community College (Exhibition) | W, 17-2",
 "Final Oct 6 Murray State vs Lake Land College (Exhibition) | W, 9-2",
 "Final Oct 16 Murray State vs John A. Logan College (Exhibition) | W, 8-4",
 "Final Oct 21 Murray State vs Bethel (Exhibition) | L, 7-9"
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Murray State at Memphis | Completed",
 "Final Sep 25 Murray State at Austin Peay Invitational | Completed",
 "Final Oct 2 Murray State at Redbird Invitational | Completed",
 "Final Oct 8 Murray State at ITA Ohio Valley Regionals | Completed",
 "Final Oct 16 Murray State vs Battle of the Border | W, 9-8"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Murray State at Southern Indiana | L, 1-3",
 "Final Aug 28 Murray State vs Northern Illinois | L, 0-3",
 "Final Aug 29 Murray State vs Eastern Michigan | L, 0-3",
 "Final Sep 4 Murray State at Northern Illinois | W, 3-0",
 "Final Sep 5 Murray State vs Lindenwood | L, 1-3",
 "Final Sep 5 Murray State vs Portland State | L, 0-3",
 "Final Sep 11 Murray State vs Northern Colorado | L, 2-3",
 "Final Sep 11 Murray State vs Georgia State | L, 0-3",
 "Final Sep 12 Murray State at Middle Tennessee | L, 1-3",
 "Final Sep 17 Murray State at Troy | L, 0-3",
 "Final Sep 18 Murray State vs The Citadel | W, 3-1",
 "Final Sep 18 Murray State vs Northwestern State | L, 1-3",
 "Final Sep 25 Murray State at Drake | L, 0-3",
 "Final Sep 26 Murray State at Northern Iowa | L, 0-3",
 "Final Oct 2 Murray State vs Evansville | L, 1-3",
 "Final Oct 3 Murray State vs Indiana State | L, 2-3",
 "Final Oct 9 Murray State at Valparaiso | L, 0-3",
 "Final Oct 10 Murray State at UIC | L, 0-3",
 "Final Oct 15 Murray State vs Belmont | L, 0-3",
 "Final Oct 16 Murray State vs SIU | W, 3-2",
 "Final Oct 22 Murray State at Belmont | L, 1-3",
 "Upcoming Oct 24, 5:00 PM Murray State at SIU | ",
 "Upcoming Oct 30, 6:00 PM Murray State vs UIC | ",
 "Upcoming Oct 31, 5:00 PM Murray State vs Drake | ",
 "Upcoming Nov 6, 6:00 PM Murray State at Evansville | ",
 "Upcoming Nov 7, 1:00 PM Murray State at Indiana State | ",
 "Upcoming Nov 13, 2:00 PM Murray State vs Illinois State | ",
 "Upcoming Nov 14, 5:00 PM Murray State vs Bradley | ",
 "Upcoming Nov 19 Murray State at MVC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bvb,"Beach Volleyball bvb");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Murray State module checks passed");
