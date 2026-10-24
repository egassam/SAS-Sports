import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {stephenFAustinSchool} from '../src/schools/stephen-f-austin.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='stephen-f-austin');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,stephenFAustinHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/stephen-f-austin-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit sfajacks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['stephen-f-austin'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',stephenFAustinSchool.scheduleUrls],['roster',stephenFAustinSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('stephen-f-austin|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'sfajacks.com',`${key} must stay on sfajacks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://sfajacks.com/sports/baseball/schedule"],"roster":["https://sfajacks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://sfajacks.com/sports/mens-basketball/schedule","https://sfajacks.com/sports/womens-basketball/schedule"],"roster":["https://sfajacks.com/sports/mens-basketball/roster","https://sfajacks.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://sfajacks.com/sports/womens-beach-volleyball/schedule"],"roster":["https://sfajacks.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://sfajacks.com/sports/womens-cross-country/schedule","https://sfajacks.com/sports/mens-cross-country/schedule"],"roster":["https://sfajacks.com/sports/womens-cross-country/roster","https://sfajacks.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://sfajacks.com/sports/football/schedule"],"roster":["https://sfajacks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://sfajacks.com/sports/womens-golf/schedule"],"roster":["https://sfajacks.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://sfajacks.com/sports/womens-soccer/schedule"],"roster":["https://sfajacks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://sfajacks.com/sports/softball/schedule"],"roster":["https://sfajacks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://sfajacks.com/sports/womens-tennis/schedule"],"roster":["https://sfajacks.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://sfajacks.com/sports/track-and-field/schedule"],"roster":["https://sfajacks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://sfajacks.com/sports/womens-volleyball/schedule"],"roster":["https://sfajacks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'stephen-f-austin|"+sport+"':"),`${sport} routes must live in the Stephen F. Austin module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://sfajacks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.stephenFAustinHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=stephen-f-austin)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 24 SFA vs Prairie View A&M (Exhibition) | ",
 "Upcoming Oct 25 SFA vs Galveston College (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 6:00 PM Men's · SFA vs Sam Houston (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · SFA vs Lyon College (Ark.) | ",
 "Upcoming Nov 6, 6:30 PM Men's · SFA vs Texas Lutheran | ",
 "Upcoming Nov 11 Men's · SFA at Abilene Christian | ",
 "Upcoming Nov 14, 1:00 PM Men's · SFA vs Rice | ",
 "Upcoming Nov 20, 2:00 PM Men's · SFA vs Indiana State | ",
 "Upcoming Nov 21 Men's · SFA at Paradise Jam | ",
 "Upcoming Nov 23 Men's · SFA at Paradise Jam | ",
 "Upcoming Dec 1 Men's · SFA at SMU | ",
 "Upcoming Dec 5, 4:30 PM Men's · SFA vs East Texas A&M | ",
 "Upcoming Dec 9, 6:30 PM Men's · SFA vs UT Arlington | ",
 "Upcoming Dec 12 Men's · SFA at Louisiana Tech | ",
 "Upcoming Dec 19 Men's · SFA at UTRGV | ",
 "Upcoming Dec 21 Men's · SFA at Texas A&M - Corpus Christi | ",
 "Upcoming Dec 29, 6:30 PM Men's · SFA vs Northwestern State | ",
 "Upcoming Jan 2, 4:30 PM Men's · SFA vs Southeastern Louisiana | ",
 "Upcoming Jan 4 Men's · SFA at McNeese State | ",
 "Upcoming Jan 9 Men's · SFA at Houston Christian | ",
 "Upcoming Jan 11 Men's · SFA at Incarnate Word | ",
 "Upcoming Jan 16, 4:30 PM Men's · SFA vs LSU New Orleans | ",
 "Upcoming Jan 18, 6:30 PM Men's · SFA vs Nicholls | ",
 "Upcoming Jan 23, 4:30 PM Men's · SFA vs McNeese State | ",
 "Upcoming Jan 26 Men's · SFA at Southeastern Louisiana | ",
 "Upcoming Jan 30, 4:30 PM Men's · SFA vs Lamar | ",
 "Upcoming Feb 1 Men's · SFA at Northwestern State | ",
 "Upcoming Feb 6, 6:00 PM Men's · SFA at Lamar | ",
 "Upcoming Feb 8 Men's · SFA at East Texas A&M | ",
 "Upcoming Feb 13, 4:30 PM Men's · SFA vs UTRGV | ",
 "Upcoming Feb 15, 6:30 PM Men's · SFA vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 20 Men's · SFA at Nicholls | ",
 "Upcoming Feb 22 Men's · SFA at LSU New Orleans | ",
 "Upcoming Feb 27, 4:30 PM Men's · SFA vs Houston Christian | ",
 "Upcoming Mar 1, 6:30 PM Men's · SFA vs Incarnate Word | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 11:00 AM Women's · SFA vs Dallas | ",
 "Upcoming Nov 10, 7:00 PM Women's · SFA at Houston | ",
 "Upcoming Nov 17, 6:30 PM Women's · SFA vs Texas A&M-Texarkana | ",
 "Upcoming Nov 22, 4:00 PM Women's · SFA vs Tulsa | ",
 "Upcoming Nov 24, 6:00 PM Women's · SFA vs Arkansas State | ",
 "Upcoming Dec 2, 6:30 PM Women's · SFA vs NSU | ",
 "Upcoming Dec 4, 6:30 PM Women's · SFA at Nebraska - Omaha | ",
 "Upcoming Dec 6, 1:00 PM Women's · SFA at Kansas State | ",
 "Upcoming Dec 10, 6:30 PM Women's · SFA vs LA Tech | ",
 "Upcoming Dec 17, 7:00 PM Women's · SFA at Texas A&M - Corpus Christi | ",
 "Upcoming Dec 19, 2:00 PM Women's · SFA at UTRGV | ",
 "Upcoming Dec 31, 1:00 PM Women's · SFA at McNeese | ",
 "Upcoming Jan 2, 2:00 PM Women's · SFA vs SLU | ",
 "Upcoming Jan 7, 6:00 PM Women's · SFA at UIW | ",
 "Upcoming Jan 9, 1:00 PM Women's · SFA at HCU | ",
 "Upcoming Jan 14, 6:30 PM Women's · SFA vs Nicholls | ",
 "Upcoming Jan 16, 2:00 PM Women's · SFA vs LSU - New Orleans | ",
 "Upcoming Jan 21, 6:00 PM Women's · SFA at SLU | ",
 "Upcoming Jan 23, 2:00 PM Women's · SFA vs McNeese | ",
 "Upcoming Jan 28, 6:30 PM Women's · SFA at East Texas A&M | ",
 "Upcoming Jan 30, 1:00 PM Women's · SFA at NSU | ",
 "Upcoming Feb 4, 6:30 PM Women's · SFA vs East Texas A&M | ",
 "Upcoming Feb 6, 3:00 PM Women's · SFA at Lamar | ",
 "Upcoming Feb 11, 6:30 PM Women's · SFA vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 13, 2:00 PM Women's · SFA vs UTRGV | ",
 "Upcoming Feb 18, 6:30 PM Women's · SFA at LSU - New Orleans | ",
 "Upcoming Feb 20, 1:00 PM Women's · SFA at Nicholls | ",
 "Upcoming Feb 25, 6:30 PM Women's · SFA vs UIW | ",
 "Upcoming Feb 27, 2:00 PM Women's · SFA vs HCU | ",
 "Upcoming Mar 2, 6:30 PM Women's · SFA vs Lamar | ",
 "Upcoming Mar 8 Women's · SFA at Southland Conference Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 31 SFA vs SFA Spooktacular (Exhibition) | ",
 "Upcoming Nov 6 SFA at AVCA Beach National Championship | ",
 "Upcoming Feb 26 SFA at Tulane | ",
 "Upcoming Mar 5, 3:00 PM SFA at Texas Wesleyan | ",
 "Upcoming Mar 6, 10:00 AM SFA at Texas A&M-Texarkana | ",
 "Upcoming Mar 6, 2:00 PM SFA at Sam Houston | ",
 "Upcoming Mar 19 SFA at UAB Tournament | ",
 "Upcoming Mar 25 SFA at SLC Midseason Tournament | ",
 "Upcoming Apr 3 SFA vs Texas Wesleyan | ",
 "Upcoming Apr 9, 3:00 PM SFA at ULM | ",
 "Upcoming Apr 10, 10:00 AM SFA at Texas A&M-Texarkana | ",
 "Upcoming Apr 10, 2:00 PM SFA at Texas A&M - Kingsville | ",
 "Upcoming Apr 16 SFA at Jacksonville | ",
 "Upcoming Apr 17 SFA at Jacksonville | ",
 "Upcoming Apr 23 SFA at San Diego | ",
 "Upcoming Apr 24 SFA at San Diego | ",
 "Upcoming Apr 28 SFA at SLC Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Aug 29 Women's · SFA at Lumberjack HS/MS | Completed",
 "Final Sep 4 Women's · SFA at McNeese Opener | 1st of 4",
 "Final Sep 11 Women's · SFA at Texas A&M Invitational | 4th of 13",
 "Final Sep 26 Women's · SFA at Cowboy Jamboree | 7th of 20",
 "Final Oct 16 Women's · SFA at Arturo Barrios Invitational | 6th of 46",
 "Upcoming Oct 30 Women's · SFA at Southland Conference Championships | ",
 "Upcoming Nov 13 Women's · SFA at NCAA South Central Region | ",
 "Upcoming Nov 21 Women's · SFA at NCAA National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Aug 29 Men's · SFA at Lumberjack HS/MS | Completed",
 "Final Sep 4 Men's · SFA at McNeese Opener | 1st of 4",
 "Final Sep 11 Men's · SFA at Texas A&M Invitational | 1st of 14",
 "Final Sep 26 Men's · SFA at Cowboy Jamboree | 4th of 20",
 "Final Oct 16 Men's · SFA at Arturo Barrios Invitational | Completed",
 "Final Oct 16 Men's · SFA at Under Armour Pre-National Invitational | 15th of 44",
 "Upcoming Oct 30 Men's · SFA at Southland Conference Championships | ",
 "Upcoming Nov 13 Men's · SFA at NCAA South Central Region | ",
 "Upcoming Nov 21 Men's · SFA at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 SFA at McNeese State | W, 38-27",
 "Final Sep 5 SFA vs East Texas A&M | W, 44-7",
 "Final Sep 12 SFA at Abilene Christian | W, 26-7",
 "Final Sep 19 SFA at Prairie View A&M | W, 31-10",
 "Final Sep 26 SFA vs Northeastern State | W, 63-14",
 "Final Oct 3 SFA vs Incarnate Word | W, 28-26",
 "Final Oct 17 SFA at Nicholls | W, 56-0",
 "Today Oct 24, 5:00 PM SFA vs Southeastern Louisiana | ",
 "Upcoming Oct 31, 2:00 PM SFA vs Houston Christian | ",
 "Upcoming Nov 7, 3:00 PM SFA at Lamar | ",
 "Upcoming Nov 14, 5:00 PM SFA at UTRGV | ",
 "Upcoming Nov 19, 6:00 PM SFA vs Northwestern State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 SFA at Golfweek | 22nd of 23",
 "Final Sep 14 SFA at ORU Lady Clerico | 8th of 8",
 "Final Sep 22 SFA at Texas Tech Red Raider Invitational | 12th of 12",
 "Final Oct 18 SFA at UALR Diamante Intercollegiate | 20th of 20",
 "Upcoming Feb 1 SFA at SHSU Battle at Bentwater | ",
 "Upcoming Feb 8 SFA at Houston Member Invitational | ",
 "Upcoming Mar 2 SFA at ACU West Texas Classic | ",
 "Upcoming Mar 29 SFA at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 19 SFA at Southland Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 SFA vs Sul Ross State | W, 6-0",
 "Final Aug 16 SFA at Oklahoma State | L, 0-3",
 "Final Aug 20 SFA vs Tulsa | L, 1-4",
 "Final Aug 27 SFA at Arkansas State | L, 1-2",
 "Final Aug 30 SFA vs Louisiana Tech | L, 1-3",
 "Final Sep 3 SFA at ULM | L, 0-2",
 "Final Sep 6 SFA at Texas A&M | L, 0-4",
 "Final Sep 10 SFA at Texas Southern | W, 3-0",
 "Final Sep 13 SFA vs Jackson State | W, 4-2",
 "Final Sep 17 SFA vs Texas A&M - Corpus Christi | W, 2-1",
 "Final Sep 24 SFA at McNeese | L, 2-3",
 "Final Sep 27 SFA vs Northwestern State | L, 3-4",
 "Final Oct 1 SFA at HCU | L, 0-2",
 "Final Oct 8 SFA at Nicholls | L, 1-2",
 "Final Oct 11 SFA vs Lamar | L, 1-2",
 "Final Oct 15 SFA vs SLU | L, 0-1",
 "Final Oct 22 SFA at UTRGV | W, 3-1",
 "Upcoming Nov 1, 1:00 PM SFA vs UIW | ",
 "Upcoming Nov 5, 7:00 PM SFA at East Texas A&M | ",
 "Upcoming Nov 10 SFA at Southland Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 3:00 PM SFA vs Tyler Junior College (Game 1) | ",
 "Upcoming Oct 23, 5:30 PM SFA vs Tyler Junior College (Game 2) | ",
 "Upcoming Oct 29, 5:00 PM SFA vs Kilgore College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 SFA at Northwestern State | Completed",
 "Final Oct 8 SFA at ITA Texas Fall Regional | Completed",
 "Final Oct 16 SFA at Sam Houston | Completed",
 "Today Oct 22 SFA at SLC Fall Invite | ",
 "Upcoming Nov 5 SFA at ITA Conference Masters | ",
 "Upcoming Nov 7 SFA at States Up Slam | ",
 "Upcoming Nov 17 SFA at Individual NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 SFA vs Idaho State | L, 1-3",
 "Final Aug 28 SFA at Wichita State | L, 0-3",
 "Final Aug 29 SFA vs Missouri State | W, 3-2",
 "Final Sep 3 SFA vs Loyola Chicago | W, 3-1",
 "Final Sep 5 SFA vs California | L, 2-3",
 "Final Sep 8 SFA at Sam Houston | W, 3-1",
 "Final Sep 10 SFA vs Texas State | L, 0-3",
 "Final Sep 11 SFA vs UNT | L, 1-3",
 "Final Sep 12 SFA vs UT Arlington | W, 3-0",
 "Final Sep 15 SFA at Texas A&M | L, 0-3",
 "Final Sep 18 SFA vs Prairie View A&M | W, 3-0",
 "Final Sep 18 SFA vs La Tech | W, 3-1",
 "Final Sep 19 SFA at ACU | L, 1-3",
 "Final Sep 24 SFA vs Southeastern LA | W, 3-0",
 "Final Sep 26 SFA vs New Orleans | W, 3-0",
 "Final Oct 1 SFA at McNeese | W, 3-1",
 "Final Oct 3 SFA at Nicholls | W, 3-0",
 "Final Oct 8 SFA vs UIW | L, 2-3",
 "Final Oct 10 SFA vs Houston Christian | W, 3-1",
 "Final Oct 15 SFA at UTRGV | L, 1-3",
 "Final Oct 17 SFA at Texas A&M - Corpus | W, 3-1",
 "Final Oct 21 SFA at East Texas A&M | W, 3-0",
 "Today Oct 24, 12:00 PM SFA vs Northwestern State | ",
 "Upcoming Oct 29, 6:00 PM SFA vs Lamar | ",
 "Upcoming Oct 31, 1:00 PM SFA at Lamar | ",
 "Upcoming Nov 5, 6:00 PM SFA vs McNeese | ",
 "Upcoming Nov 7, 12:00 PM SFA vs Nicholls | ",
 "Upcoming Nov 12, 6:30 PM SFA at Southeastern LA | ",
 "Upcoming Nov 14, 1:00 PM SFA at New Orleans | ",
 "Upcoming Nov 20 SFA at Southland Conference Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Stephen F. Austin module checks passed");
