import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westernIllinoisSchool} from '../src/schools/western-illinois.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='western-illinois');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westernIllinoisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/western-illinois-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goleathernecks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['western-illinois'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',westernIllinoisSchool.scheduleUrls],['roster',westernIllinoisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('western-illinois|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goleathernecks.com',`${key} must stay on goleathernecks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goleathernecks.com/sports/baseball/schedule"],"roster":["https://goleathernecks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goleathernecks.com/sports/mens-basketball/schedule","https://goleathernecks.com/sports/womens-basketball/schedule"],"roster":["https://goleathernecks.com/sports/mens-basketball/roster","https://goleathernecks.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://goleathernecks.com/sports/womens-bowling/schedule"],"roster":["https://goleathernecks.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://goleathernecks.com/sports/womens-cross-country/schedule","https://goleathernecks.com/sports/mens-cross-country/schedule"],"roster":["https://goleathernecks.com/sports/womens-cross-country/roster","https://goleathernecks.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goleathernecks.com/sports/football/schedule"],"roster":["https://goleathernecks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goleathernecks.com/sports/womens-golf/schedule","https://goleathernecks.com/sports/mens-golf/schedule"],"roster":["https://goleathernecks.com/sports/womens-golf/roster","https://goleathernecks.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goleathernecks.com/sports/womens-soccer/schedule","https://goleathernecks.com/sports/mens-soccer/schedule"],"roster":["https://goleathernecks.com/sports/womens-soccer/roster","https://goleathernecks.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goleathernecks.com/sports/softball/schedule"],"roster":["https://goleathernecks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goleathernecks.com/sports/womens-tennis/schedule"],"roster":["https://goleathernecks.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://goleathernecks.com/sports/womens-track-and-field/schedule","https://goleathernecks.com/sports/mens-track-and-field/schedule"],"roster":["https://goleathernecks.com/sports/womens-track-and-field/roster","https://goleathernecks.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goleathernecks.com/sports/womens-volleyball/schedule"],"roster":["https://goleathernecks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'western-illinois|"+sport+"':"),`${sport} routes must live in the Western Illinois module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goleathernecks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westernIllinoisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=western-illinois)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Western Illinois at Valparaiso | ",
 "Upcoming Nov 7, 6:00 PM Men's · Western Illinois vs Houston Christian | ",
 "Upcoming Nov 9, 6:00 PM Men's · Western Illinois vs Simpson College | ",
 "Upcoming Nov 12, 6:00 PM Men's · Western Illinois vs CSU Bakersfield | ",
 "Upcoming Nov 16, 7:00 PM Men's · Western Illinois at Minnesota | ",
 "Upcoming Nov 20, 2:00 PM Men's · Western Illinois vs University at Albany | ",
 "Upcoming Nov 21, 12:30 PM Men's · Western Illinois vs Mercyhurst | ",
 "Upcoming Nov 22, 12:00 PM Men's · Western Illinois at Canisius | ",
 "Upcoming Nov 28, 2:00 PM Men's · Western Illinois at Coastal Carolina | ",
 "Upcoming Nov 30, 7:00 PM Men's · Western Illinois at Houston Christian | ",
 "Upcoming Dec 3, 5:00 PM Men's · Western Illinois at Indiana | ",
 "Upcoming Dec 8 Men's · Western Illinois vs St. Ambrose | ",
 "Upcoming Dec 11 Men's · Western Illinois vs Tennessee State | ",
 "Upcoming Dec 13, 5:00 PM Men's · Western Illinois at Iowa | ",
 "Upcoming Dec 21 Men's · Western Illinois vs East-West | ",
 "Upcoming Dec 30, 1:00 PM Men's · Western Illinois vs Culver-Stockton | ",
 "Upcoming Jan 2, 3:30 PM Men's · Western Illinois vs SIUE | ",
 "Upcoming Jan 7, 7:30 PM Men's · Western Illinois at Tennessee State | ",
 "Upcoming Jan 9, 3:30 PM Men's · Western Illinois at SEMO | ",
 "Upcoming Jan 14, 7:30 PM Men's · Western Illinois vs Eastern Illinois | ",
 "Upcoming Jan 16, 3:30 PM Men's · Western Illinois vs UT Martin | ",
 "Upcoming Jan 21, 6:45 PM Men's · Western Illinois at Morehead State | ",
 "Upcoming Jan 23, 3:30 PM Men's · Western Illinois at Southern Indiana | ",
 "Upcoming Jan 28, 7:30 PM Men's · Western Illinois vs SEMO | ",
 "Upcoming Jan 30, 3:30 PM Men's · Western Illinois at SIUE | ",
 "Upcoming Feb 4, 7:30 PM Men's · Western Illinois at UT Martin | ",
 "Upcoming Feb 11, 7:30 PM Men's · Western Illinois vs Lindenwood | ",
 "Upcoming Feb 13, 3:30 PM Men's · Western Illinois vs Morehead State | ",
 "Upcoming Feb 18, 7:30 PM Men's · Western Illinois at Eastern Illinois | ",
 "Upcoming Feb 25, 7:30 PM Men's · Western Illinois vs Southern Indiana | ",
 "Upcoming Feb 27, 3:30 PM Men's · Western Illinois at Lindenwood | ",
 "Upcoming Mar 3 Men's · Western Illinois at Ohio Valley Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · Western Illinois vs Clarke | ",
 "Upcoming Nov 7, 2:00 PM Women's · Western Illinois at Nebraska | ",
 "Upcoming Nov 9, 6:30 PM Women's · Western Illinois at Omaha | ",
 "Upcoming Nov 11, 6:00 PM Women's · Western Illinois vs Cornell College (Iowa) | ",
 "Upcoming Nov 17, 11:00 AM Women's · Western Illinois vs Purdue Fort Wayne | ",
 "Upcoming Nov 21, 1:00 PM Women's · Western Illinois vs Loyola | ",
 "Upcoming Nov 24, 6:00 PM Women's · Western Illinois at Chicago State | ",
 "Upcoming Nov 30, 6:00 PM Women's · Western Illinois vs Hannibal-LaGrange College | ",
 "Upcoming Dec 2, 6:00 PM Women's · Western Illinois at Valparaiso | ",
 "Upcoming Dec 5, 2:00 PM Women's · Western Illinois at Bradley | ",
 "Upcoming Dec 8, 5:30 PM Women's · Western Illinois at Kansas State | ",
 "Upcoming Dec 12, 1:00 PM Women's · Western Illinois vs Northern Illinois | ",
 "Upcoming Dec 18, 6:00 PM Women's · Western Illinois at Illinois | ",
 "Upcoming Dec 30, 3:00 PM Women's · Western Illinois vs Culver-Stockton College | ",
 "Upcoming Jan 2, 1:00 PM Women's · Western Illinois vs SIUE | ",
 "Upcoming Jan 7, 5:00 PM Women's · Western Illinois at Tennessee State | ",
 "Upcoming Jan 9, 1:00 PM Women's · Western Illinois at SEMO | ",
 "Upcoming Jan 14, 5:00 PM Women's · Western Illinois vs Eastern Illinois | ",
 "Upcoming Jan 16, 1:00 PM Women's · Western Illinois vs UT Martin | ",
 "Upcoming Jan 21, 5:00 PM Women's · Western Illinois at Morehead State | ",
 "Upcoming Jan 23, 1:00 PM Women's · Western Illinois at Southern Indiana | ",
 "Upcoming Jan 28, 5:00 PM Women's · Western Illinois vs SEMO | ",
 "Upcoming Jan 30, 1:00 PM Women's · Western Illinois at SIUE | ",
 "Upcoming Feb 4, 5:00 PM Women's · Western Illinois at UT Martin | ",
 "Upcoming Feb 11, 5:00 PM Women's · Western Illinois vs Lindenwood | ",
 "Upcoming Feb 13, 1:00 PM Women's · Western Illinois vs Morehead State | ",
 "Upcoming Feb 18, 5:00 PM Women's · Western Illinois at Eastern Illinois | ",
 "Upcoming Feb 20, 1:00 PM Women's · Western Illinois vs Tennessee State | ",
 "Upcoming Feb 25, 5:00 PM Women's · Western Illinois vs Southern Indiana | ",
 "Upcoming Feb 27, 1:00 PM Women's · Western Illinois at Lindenwood | ",
 "Upcoming Mar 3 Women's · Western Illinois at Ohio Valley Conference Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 14 Western Illinois at Penguin Classic | Completed",
 "Today Oct 23 Western Illinois at Warhawk Classic | ",
 "Upcoming Oct 30 Western Illinois at Windy City Halloween Classic | ",
 "Upcoming Nov 13 Western Illinois at Bearcat Invitational | ",
 "Upcoming Jan 23 Western Illinois at Viking Classic | ",
 "Upcoming Jan 29 Western Illinois at Saints Invite | ",
 "Upcoming Feb 5 Western Illinois at Flyer Classic | ",
 "Upcoming Feb 19 Western Illinois at Big Red Invite | ",
 "Upcoming Mar 5 Western Illinois at Vanderbilt | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Western Illinois at Northern Illinois | 2nd of 5",
 "Final Sep 19 Women's · Western Illinois at Indiana State | 26th of 28",
 "Final Oct 2 Women's · Western Illinois at Notre Dame | 17th of 24",
 "Final Oct 16 Women's · Western Illinois at Bradley | 20th of 25",
 "Upcoming Oct 30, 10:00 AM Women's · Western Illinois at Ohio Valley Conference | ",
 "Upcoming Nov 13, 10:00 AM Women's · Western Illinois at NCAA Midwest Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Western Illinois at Northern Illinois | 3rd of 3",
 "Final Sep 19 Men's · Western Illinois at Indiana State | 32nd of 34",
 "Final Oct 2 Men's · Western Illinois at Notre Dame | 20th of 21",
 "Final Oct 16 Men's · Western Illinois at Bradley | 22nd of 25",
 "Upcoming Oct 30, 10:00 AM Men's · Western Illinois at Ohio Valley Conference | ",
 "Upcoming Nov 13, 10:00 AM Men's · Western Illinois at NCAA Midwest Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Western Illinois vs Northwestern College (Iowa) | W, 65-14",
 "Final Sep 5 Western Illinois vs Illinois State | L, 10-41",
 "Final Sep 12 Western Illinois at Wisconsin | L, 9-36",
 "Final Sep 19 Western Illinois vs Morehead State | W, 59-2",
 "Final Sep 26 Western Illinois at North Alabama | L, 20-23",
 "Final Oct 3 Western Illinois vs Tennessee State | W, 28-21",
 "Final Oct 17 Western Illinois at Southeast Missouri State | L, 30-40",
 "Upcoming Oct 24, 3:00 PM Western Illinois vs UT Martin | ",
 "Upcoming Oct 31, 1:00 PM Western Illinois at Charleston Southern | ",
 "Upcoming Nov 7, 2:00 PM Western Illinois at Eastern Illinois | ",
 "Upcoming Nov 14, 1:00 PM Western Illinois vs Gardner-Webb | ",
 "Upcoming Nov 21, 2:00 PM Western Illinois at Lindenwood | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Western Illinois at The Brittany Kelly Classic | Completed",
 "Final Oct 5 Women's · Western Illinois at Butler Fall Invitational | Completed",
 "Final Oct 12 Women's · Western Illinois at MoState/Payne Stewart Memorial | Completed",
 "Upcoming Oct 30 Women's · Western Illinois at Western Cup | ",
 "Upcoming Mar 1 Women's · Western Illinois at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 29 Women's · Western Illinois at NKU Julie Invitational | ",
 "Upcoming Apr 5 Women's · Western Illinois at TPC Deere Run | ",
 "Upcoming Apr 10 Women's · Western Illinois at Jan Weaver Invitational | ",
 "Upcoming Apr 18 Women's · Western Illinois at OVC Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Western Illinois at ANF (America Needs Farmers) Fall Classic | Completed",
 "Final Sep 28 Men's · Western Illinois at SIUE Dolenc Invitational | Completed",
 "Final Oct 19 Men's · Western Illinois at Zach Johnson Invitational | Completed",
 "Upcoming Oct 30 Men's · Western Illinois at Western Cup | ",
 "Upcoming Mar 12 Men's · Western Illinois at Jackrabbits Invitational | ",
 "Upcoming Mar 22 Men's · Western Illinois at Skyhawk Invitational | ",
 "Upcoming Apr 5 Men's · Western Illinois at TPC Deere Run | ",
 "Upcoming Apr 18 Men's · Western Illinois at Hawkeye Invitational | ",
 "Upcoming Apr 25 Men's · Western Illinois at OVC Men's Golf Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Western Illinois vs Indiana State | L, 0-3",
 "Final Aug 16 Women's · Western Illinois at Southern Illinois | L, 0-5",
 "Final Aug 20 Women's · Western Illinois at Valparaiso | L, 0-4",
 "Final Aug 23 Women's · Western Illinois vs Eastern Washington | L, 1-3",
 "Final Aug 27 Women's · Western Illinois at South Dakota State | L, 0-5",
 "Final Aug 30 Women's · Western Illinois vs Green Bay | L, 0-1",
 "Final Sep 2 Women's · Western Illinois at Drake | L, 0-5",
 "Final Sep 6 Women's · Western Illinois vs Northern Iowa | W, 2-1",
 "Final Sep 10 Women's · Western Illinois at UIC | L, 0-2",
 "Final Sep 13 Women's · Western Illinois vs Illinois State | L, 1-3",
 "Final Sep 19 Women's · Western Illinois at Butler | L, 1-7",
 "Final Sep 27 Women's · Western Illinois vs SEMO | L, 0-1",
 "Final Oct 4 Women's · Western Illinois at Eastern Illinois | L, 1-2",
 "Final Oct 11 Women's · Western Illinois at Southern Indiana | L, 0-2",
 "Final Oct 15 Women's · Western Illinois vs SIUE | W, 2-0",
 "Final Oct 18 Women's · Western Illinois vs UT Martin | L, 0-2",
 "Upcoming Oct 25, 1:00 PM Women's · Western Illinois vs Morehead State | ",
 "Upcoming Nov 1, 1:00 PM Women's · Western Illinois at Lindenwood | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 22 Men's · Western Illinois vs Quincy | W, 3-2",
 "Final Aug 27 Men's · Western Illinois at DePaul | L, 1-3",
 "Final Aug 30 Men's · Western Illinois vs Illinois Springfield | W, 4-0",
 "Final Sep 2 Men's · Western Illinois at Bradley | T, 1-1",
 "Final Sep 5 Men's · Western Illinois at Green Bay | L, 1-2",
 "Final Sep 10 Men's · Western Illinois at UIC | L, 0-2",
 "Final Sep 17 Men's · Western Illinois vs Omaha | L, 0-1",
 "Final Sep 22 Men's · Western Illinois at IU Indy | T, 3-3",
 "Final Sep 26 Men's · Western Illinois at Eastern Illinois | W, 2-1",
 "Final Oct 1 Men's · Western Illinois at SIUE | L, 0-1",
 "Final Oct 4 Men's · Western Illinois vs Southern Indiana | L, 1-3",
 "Final Oct 8 Men's · Western Illinois vs Eastern Illinois | W, 4-1",
 "Final Oct 11 Men's · Western Illinois at Lindenwood | T, 1-1",
 "Final Oct 15 Men's · Western Illinois vs Houston Christian | L, 0-3",
 "Final Oct 18 Men's · Western Illinois vs Incarnate Word | L, 0-1",
 "Upcoming Oct 24, 6:30 PM Men's · Western Illinois at UTRGV | ",
 "Upcoming Oct 29, 3:00 PM Men's · Western Illinois vs SIUE | ",
 "Upcoming Nov 1, 3:00 PM Men's · Western Illinois at Southern Indiana | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Western Illinois at SEMO Fall Invite | Completed",
 "Final Sep 25 Western Illinois at OVC Fall Tournament | Completed",
 "Final Oct 8 Western Illinois at ITA | Completed",
 "Final Oct 16 Western Illinois at Marquette Invitational | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Western Illinois at Missouri | L, 0-3",
 "Final Aug 29 Western Illinois vs Towson | L, 1-3",
 "Final Aug 30 Western Illinois vs Idaho | L, 0-3",
 "Final Sep 4 Western Illinois at South Dakota State | L, 0-3",
 "Final Sep 4 Western Illinois vs Bradley | L, 0-3",
 "Final Sep 5 Western Illinois vs Northern Arizona | L, 2-3",
 "Final Sep 11 Western Illinois at Illinois State | L, 0-3",
 "Final Sep 12 Western Illinois vs Purdue Fort Wayne | L, 0-3",
 "Final Sep 18 Western Illinois at Green Bay | L, 0-3",
 "Final Sep 19 Western Illinois at Green Bay | L, 0-3",
 "Final Sep 25 Western Illinois vs SEMO | L, 0-3",
 "Final Sep 26 Western Illinois vs SEMO | L, 0-3",
 "Final Oct 2 Western Illinois at Tennessee State | W, 3-1",
 "Final Oct 3 Western Illinois at Tennessee State | W, 3-0",
 "Final Oct 16 Western Illinois vs UT Martin | L, 1-3",
 "Final Oct 17 Western Illinois vs UT Martin | L, 0-3",
 "Today Oct 23, 6:00 PM Western Illinois at Southern Indiana | ",
 "Upcoming Oct 24, 2:00 PM Western Illinois at Southern Indiana | ",
 "Upcoming Oct 30, 6:00 PM Western Illinois vs SIUE | ",
 "Upcoming Oct 31, 2:00 PM Western Illinois vs SIUE | ",
 "Upcoming Nov 5, 6:00 PM Western Illinois at Eastern Illinois | ",
 "Upcoming Nov 6, 4:00 PM Western Illinois at Eastern Illinois | ",
 "Upcoming Nov 12, 5:00 PM Western Illinois at Morehead State | ",
 "Upcoming Nov 13, 4:00 PM Western Illinois at Morehead State | ",
 "Upcoming Nov 17, 6:00 PM Western Illinois vs Lindenwood | ",
 "Upcoming Nov 18, 6:00 PM Western Illinois vs Lindenwood | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Western Illinois module checks passed");
