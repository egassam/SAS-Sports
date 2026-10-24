import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {houstonChristianSchool} from '../src/schools/houston-christian.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='houston-christian');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,houstonChristianHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/houston-christian-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hcuhuskies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['houston-christian'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',houstonChristianSchool.scheduleUrls],['roster',houstonChristianSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('houston-christian|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hcuhuskies.com',`${key} must stay on hcuhuskies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://hcuhuskies.com/sports/baseball/schedule"],"roster":["https://hcuhuskies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hcuhuskies.com/sports/mens-basketball/schedule","https://hcuhuskies.com/sports/womens-basketball/schedule"],"roster":["https://hcuhuskies.com/sports/mens-basketball/roster","https://hcuhuskies.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://hcuhuskies.com/sports/womens-beach-volleyball/schedule"],"roster":["https://hcuhuskies.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://hcuhuskies.com/sports/cross-country/schedule"],"roster":["https://hcuhuskies.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://hcuhuskies.com/sports/football/schedule"],"roster":["https://hcuhuskies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hcuhuskies.com/sports/womens-golf/schedule","https://hcuhuskies.com/sports/mens-golf/schedule"],"roster":["https://hcuhuskies.com/sports/womens-golf/roster","https://hcuhuskies.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://hcuhuskies.com/sports/womens-soccer/schedule","https://hcuhuskies.com/sports/mens-soccer/schedule"],"roster":["https://hcuhuskies.com/sports/womens-soccer/roster","https://hcuhuskies.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://hcuhuskies.com/sports/softball/schedule"],"roster":["https://hcuhuskies.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://hcuhuskies.com/sports/track-and-field/schedule"],"roster":["https://hcuhuskies.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://hcuhuskies.com/sports/womens-volleyball/schedule"],"roster":["https://hcuhuskies.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'houston-christian|"+sport+"':"),`${sport} routes must live in the Houston Christian module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://hcuhuskies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.houstonChristianHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=houston-christian)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · Houston Christian vs Texas A&M - Kingsville (Exhibition) | L, 67-74",
 "Today Oct 24, 4:15 PM Men's · Houston Christian at Tarleton State (Exhibition) | ",
 "Upcoming Oct 28, 6:00 PM Men's · Houston Christian vs Southern Mississippi (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Houston Christian vs Louisiana Christian | ",
 "Upcoming Nov 7, 6:00 PM Men's · Houston Christian vs Western Illinois | ",
 "Upcoming Nov 10, 7:00 PM Men's · Houston Christian at South Dakota | ",
 "Upcoming Nov 13, 7:00 PM Men's · Houston Christian vs College of Biblical Studies - Houston | ",
 "Upcoming Nov 19, 7:00 PM Men's · Houston Christian vs Georgia Southern | ",
 "Upcoming Nov 24, 6:30 PM Men's · Houston Christian at Louisiana-Monroe | ",
 "Upcoming Nov 30, 7:00 PM Men's · Houston Christian vs Western Illinois | ",
 "Upcoming Dec 2, 7:00 PM Men's · Houston Christian at Louisiana | ",
 "Upcoming Dec 5, 4:00 PM Men's · Houston Christian at McNeese | ",
 "Upcoming Dec 7, 6:00 PM Men's · Houston Christian at Southeastern Louisiana | ",
 "Upcoming Dec 17, 7:30 PM Men's · Houston Christian vs Nicholls | ",
 "Upcoming Dec 19, 3:30 PM Men's · Houston Christian vs LSU New Orleans | ",
 "Upcoming Dec 22, 7:00 PM Men's · Houston Christian at TCU | ",
 "Upcoming Dec 29, 7:00 PM Men's · Houston Christian at Oklahoma State | ",
 "Upcoming Jan 2, 3:30 PM Men's · Houston Christian vs Incarnate Word | ",
 "Upcoming Jan 4, 7:00 PM Men's · Houston Christian at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 9, 3:30 PM Men's · Houston Christian vs Stephen F. Austin | ",
 "Upcoming Jan 11, 7:00 PM Men's · Houston Christian vs Lamar | ",
 "Upcoming Jan 16, 5:00 PM Men's · Houston Christian at East Texas A&M | ",
 "Upcoming Jan 18, 6:30 PM Men's · Houston Christian at Northwestern State | ",
 "Upcoming Jan 23, 3:30 PM Men's · Houston Christian vs UT Rio Grande Valley | ",
 "Upcoming Jan 26, 7:00 PM Men's · Houston Christian vs Texas A&M - Corpus Christi | ",
 "Upcoming Jan 30, 4:30 PM Men's · Houston Christian at UT Rio Grande Valley | ",
 "Upcoming Feb 1, 5:00 PM Men's · Houston Christian at Incarnate Word | ",
 "Upcoming Feb 6, 3:30 PM Men's · Houston Christian vs Southeastern Louisiana | ",
 "Upcoming Feb 8, 7:00 PM Men's · Houston Christian vs McNeese | ",
 "Upcoming Feb 13, 5:00 PM Men's · Houston Christian at LSU New Orleans | ",
 "Upcoming Feb 15, 6:30 PM Men's · Houston Christian at Nicholls | ",
 "Upcoming Feb 20, 7:00 PM Men's · Houston Christian vs Northwestern State | ",
 "Upcoming Feb 22, 7:00 PM Men's · Houston Christian vs East Texas A&M | ",
 "Upcoming Feb 27, 4:30 PM Men's · Houston Christian at Stephen F. Austin | ",
 "Upcoming Mar 1, 6:00 PM Men's · Houston Christian at Lamar | ",
 "Upcoming Mar 7 Men's · Houston Christian at Southland Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 8:25 PM Women's · Houston Christian at Rice | ",
 "Upcoming Nov 4, 11:00 AM Women's · Houston Christian vs LeTourneau | ",
 "Upcoming Nov 6, 6:00 PM Women's · Houston Christian vs Abilene Christian | ",
 "Upcoming Nov 11, 11:00 AM Women's · Houston Christian at North Texas | ",
 "Upcoming Nov 14, 2:00 PM Women's · Houston Christian at Weber State | ",
 "Upcoming Nov 16, 8:00 PM Women's · Houston Christian at Utah | ",
 "Upcoming Nov 21, 1:00 PM Women's · Houston Christian at Houston | ",
 "Upcoming Nov 29, 1:00 PM Women's · Houston Christian vs St. Thomas (TX) | ",
 "Upcoming Dec 3, 6:00 PM Women's · Houston Christian at Southeastern | ",
 "Upcoming Dec 5, 1:00 PM Women's · Houston Christian at McNeese | ",
 "Upcoming Dec 7, 6:00 PM Women's · Houston Christian vs Princeton | ",
 "Upcoming Dec 12, 2:00 PM Women's · Houston Christian at Utah Tech | ",
 "Upcoming Dec 17, 5:00 PM Women's · Houston Christian vs Nicholls | ",
 "Upcoming Dec 19, 1:00 PM Women's · Houston Christian vs LSU New Orleans | ",
 "Upcoming Dec 31, 1:00 PM Women's · Houston Christian at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 2, 1:00 PM Women's · Houston Christian vs UIW | ",
 "Upcoming Jan 7, 6:00 PM Women's · Houston Christian vs Lamar | ",
 "Upcoming Jan 9, 1:00 PM Women's · Houston Christian vs Stephen F. Austin | ",
 "Upcoming Jan 14, 6:30 PM Women's · Houston Christian at Northwestern State | ",
 "Upcoming Jan 16, 2:30 PM Women's · Houston Christian at East Texas A&M | ",
 "Upcoming Jan 21, 6:00 PM Women's · Houston Christian vs Texas A&M - Corpus Christi | ",
 "Upcoming Jan 23, 1:00 PM Women's · Houston Christian vs UT Rio Grande Valley | ",
 "Upcoming Jan 28, 6:00 PM Women's · Houston Christian at UIW | ",
 "Upcoming Jan 30, 2:00 PM Women's · Houston Christian at UT Rio Grande Valley | ",
 "Upcoming Feb 4, 6:00 PM Women's · Houston Christian vs McNeese | ",
 "Upcoming Feb 6, 1:00 PM Women's · Houston Christian vs Southeastern | ",
 "Upcoming Feb 11, 6:30 PM Women's · Houston Christian at Nicholls | ",
 "Upcoming Feb 13, 2:00 PM Women's · Houston Christian at LSU New Orleans | ",
 "Upcoming Feb 18, 6:00 PM Women's · Houston Christian vs East Texas A&M | ",
 "Upcoming Feb 20, 4:00 PM Women's · Houston Christian vs Northwestern State | ",
 "Upcoming Feb 25, 6:30 PM Women's · Houston Christian at Lamar | ",
 "Upcoming Feb 27, 2:00 PM Women's · Houston Christian at Stephen F. Austin | ",
 "Upcoming Mar 8 Women's · Houston Christian at Southland Conference Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Houston Christian at Aggie Opener | Completed",
 "Final Sep 11 Houston Christian at Rice Invitational | Completed",
 "Final Oct 3 Houston Christian at Chile Pepper Festival | Completed",
 "Final Oct 16 Houston Christian at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30 Houston Christian at Southland Conference Championship | ",
 "Upcoming Nov 13 Houston Christian at NCAA South Central Regional Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Houston Christian at Southeastern | W, 34-28",
 "Final Sep 5 Houston Christian at Rice | L, 3-31",
 "Final Sep 12 Houston Christian vs Arkansas Baptist | W, 88-0",
 "Final Sep 19 Houston Christian at UIW | L, 23-30",
 "Final Sep 26 Houston Christian at North Texas | L, 14-63",
 "Final Oct 3 Houston Christian vs Nicholls | W, 16-2",
 "Final Oct 17 Houston Christian vs East Texas A&M | W, 43-24",
 "Today Oct 24, 3:00 PM Houston Christian at Lamar | ",
 "Upcoming Oct 31, 2:00 PM Houston Christian at Stephen F. Austin | ",
 "Upcoming Nov 7, 4:00 PM Houston Christian vs McNeese | ",
 "Upcoming Nov 14, 1:00 PM Houston Christian at Northwestern State | ",
 "Upcoming Nov 21, 4:00 PM Houston Christian vs UT Rio Grande Valley | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Houston Christian at Lady Clerico Invitational | Completed",
 "Final Sep 22 Women's · Houston Christian at Texas Tech Red Raider Invite | Completed",
 "Final Oct 12 Women's · Houston Christian at Golf Iconic Classic | Completed",
 "Final Oct 18 Women's · Houston Christian at Diamante Intercollegiate | Completed",
 "Upcoming Feb 8 Women's · Houston Christian at Houston Match | ",
 "Upcoming Feb 15 Women's · Houston Christian at Texas Golf Throwdown | ",
 "Upcoming Feb 22 Women's · Houston Christian at Chevron Collegiate | ",
 "Upcoming Mar 8 Women's · Houston Christian at Wildcat Invitational | ",
 "Upcoming Mar 29 Women's · Houston Christian at ULM Invitational | ",
 "Upcoming Apr 19 Women's · Houston Christian at Southland Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Houston Christian at Sandestin Collegiate Classic | Completed",
 "Final Sep 21 Men's · Houston Christian at Bayou City Collegiate Classic | Completed",
 "Final Oct 5 Men's · Houston Christian at West Bay Collegiate Invitational | Completed",
 "Final Oct 19 Men's · Houston Christian at LaTour Intercollegiate | Completed",
 "Upcoming Feb 8 Men's · Houston Christian at Bentwater Intercollegiate | ",
 "Upcoming Feb 15 Men's · Houston Christian at Border Olympics | ",
 "Upcoming Mar 1 Men's · Houston Christian at The Monty Invitational | ",
 "Upcoming Mar 15 Men's · Houston Christian at The All-American Intercollegiate | ",
 "Upcoming Mar 29 Men's · Houston Christian at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 12 Men's · Houston Christian at Austin Peay Intercollegiate | ",
 "Upcoming Apr 26 Men's · Houston Christian at Southland Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Houston Christian at Texas | L, 0-3",
 "Final Aug 16 Women's · Houston Christian at Texas Southern | W, 1-0",
 "Final Aug 20 Women's · Houston Christian vs Rice | T, 1-1",
 "Final Aug 27 Women's · Houston Christian vs Louisiana Tech | L, 0-1",
 "Final Aug 30 Women's · Houston Christian at SMU | L, 0-2",
 "Final Sep 3 Women's · Houston Christian at Grambling State | W, 4-2",
 "Final Sep 6 Women's · Houston Christian vs Tarleton State | T, 4-4",
 "Final Sep 11 Women's · Houston Christian vs Southern | W, 3-1",
 "Final Sep 13 Women's · Houston Christian at Prairie View A&M | W, 3-1",
 "Final Sep 17 Women's · Houston Christian vs Nicholls | T, 1-1",
 "Final Sep 27 Women's · Houston Christian at UT Rio Grande Valley | W, 4-1",
 "Final Oct 1 Women's · Houston Christian vs Stephen F. Austin | W, 2-0",
 "Final Oct 8 Women's · Houston Christian vs Southeastern | T, 1-1",
 "Final Oct 11 Women's · Houston Christian at McNeese | T, 1-1",
 "Final Oct 15 Women's · Houston Christian at Northwestern State | W, 3-1",
 "Final Oct 22 Women's · Houston Christian vs East Texas A&M | T, 1-1",
 "Upcoming Oct 25, 12:00 PM Women's · Houston Christian at Texas A&M - Corpus Christi | ",
 "Upcoming Nov 1, 3:30 PM Women's · Houston Christian vs Lamar | ",
 "Upcoming Nov 5, 7:00 PM Women's · Houston Christian at UIW | ",
 "Upcoming Nov 10 Women's · Houston Christian at Southland Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Houston Christian vs Jacksonville | L, 0-2",
 "Final Aug 23 Men's · Houston Christian vs UMass Lowell | W, 1-0",
 "Final Aug 27 Men's · Houston Christian vs UC San Diego | L, 0-1",
 "Final Aug 31 Men's · Houston Christian at SMU | L, 0-6",
 "Final Sep 4 Men's · Houston Christian at Cal State Northridge | T, 2-2",
 "Final Sep 7 Men's · Houston Christian at Grand Canyon | W, 1-0",
 "Final Sep 16 Men's · Houston Christian vs Florida Gulf Coast | L, 1-3",
 "Final Sep 19 Men's · Houston Christian at Oral Roberts | T, 1-1",
 "Final Sep 26 Men's · Houston Christian vs UIW | W, 2-1",
 "Final Oct 4 Men's · Houston Christian at Lindenwood | T, 1-1",
 "Final Oct 8 Men's · Houston Christian vs Southern Indiana | T, 1-1",
 "Final Oct 11 Men's · Houston Christian vs SIUE | L, 1-2",
 "Final Oct 15 Men's · Houston Christian at Western Illinois | W, 3-0",
 "Final Oct 18 Men's · Houston Christian at Eastern Illinois | L, 1-3",
 "Final Oct 21 Men's · Houston Christian at UT Rio Grande Valley | T, 2-2",
 "Upcoming Oct 25, 6:00 PM Men's · Houston Christian at UIW | ",
 "Upcoming Oct 29, 7:00 PM Men's · Houston Christian vs Lindenwood | ",
 "Upcoming Nov 1, 1:00 PM Men's · Houston Christian vs UT Rio Grande Valley | ",
 "Upcoming Nov 8 Men's · Houston Christian at Ohio Valley Confererence Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Houston Christian vs Little Rock | L, 2-3",
 "Final Aug 29 Houston Christian at Louisiana Tech | L, 2-3",
 "Final Aug 30 Houston Christian vs Iona | L, 2-3",
 "Final Sep 3 Houston Christian at Texas Southern | W, 3-1",
 "Final Sep 4 Houston Christian vs Abilene Christian | L, 1-3",
 "Final Sep 4 Houston Christian at Houston | L, 0-3",
 "Final Sep 10 Houston Christian at Southern Miss | L, 0-3",
 "Final Sep 11 Houston Christian vs Jackson State | L, 2-3",
 "Final Sep 11 Houston Christian vs Southern | W, 3-1",
 "Final Sep 17 Houston Christian vs UTSA | L, 1-3",
 "Final Sep 18 Houston Christian vs Texas State | L, 0-3",
 "Final Sep 19 Houston Christian at Houston | L, 0-3",
 "Final Sep 24 Houston Christian vs Northwestern State | L, 1-3",
 "Final Sep 26 Houston Christian vs East Texas A&M | L, 2-3",
 "Final Oct 1 Houston Christian at Texas A&M - Corpus Christi | L, 0-3",
 "Final Oct 3 Houston Christian at UT Rio Grande Valley | L, 0-3",
 "Final Oct 8 Houston Christian at Lamar | L, 2-3",
 "Final Oct 10 Houston Christian at Stephen F. Austin | L, 1-3",
 "Final Oct 15 Houston Christian vs LSU New Orleans | W, 3-0",
 "Final Oct 17 Houston Christian at Southeastern | L, 1-3",
 "Final Oct 22 Houston Christian vs Nicholls | W, 3-1",
 "Today Oct 24, 11:00 AM Houston Christian vs McNeese | ",
 "Upcoming Oct 29, 6:30 PM Houston Christian at Northwestern State | ",
 "Upcoming Oct 31, 11:00 AM Houston Christian at East Texas A&M | ",
 "Upcoming Nov 4, 6:30 PM Houston Christian vs UIW | ",
 "Upcoming Nov 7, 1:00 PM Houston Christian at UIW | ",
 "Upcoming Nov 12, 6:30 PM Houston Christian vs Texas A&M - Corpus Christi | ",
 "Upcoming Nov 14, 1:00 PM Houston Christian vs UT Rio Grande Valley | ",
 "Upcoming Nov 19 Houston Christian at Southland Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Houston Christian module checks passed");
