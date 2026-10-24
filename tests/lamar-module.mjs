import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lamarSchool} from '../src/schools/lamar.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lamar');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lamarHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lamar-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lamarcardinals.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lamar'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',lamarSchool.scheduleUrls],['roster',lamarSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lamar|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lamarcardinals.com',`${key} must stay on lamarcardinals.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lamarcardinals.com/sports/baseball/schedule"],"roster":["https://lamarcardinals.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lamarcardinals.com/sports/mens-basketball/schedule","https://lamarcardinals.com/sports/womens-basketball/schedule"],"roster":["https://lamarcardinals.com/sports/mens-basketball/roster","https://lamarcardinals.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://lamarcardinals.com/sports/cross-country/schedule"],"roster":["https://lamarcardinals.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://lamarcardinals.com/sports/football/schedule"],"roster":["https://lamarcardinals.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://lamarcardinals.com/sports/womens-golf/schedule","https://lamarcardinals.com/sports/mens-golf/schedule"],"roster":["https://lamarcardinals.com/sports/womens-golf/roster","https://lamarcardinals.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://lamarcardinals.com/sports/womens-soccer/schedule"],"roster":["https://lamarcardinals.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://lamarcardinals.com/sports/softball/schedule"],"roster":["https://lamarcardinals.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://lamarcardinals.com/sports/womens-tennis/schedule","https://lamarcardinals.com/sports/mens-tennis/schedule"],"roster":["https://lamarcardinals.com/sports/womens-tennis/roster","https://lamarcardinals.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://lamarcardinals.com/sports/track-and-field/schedule"],"roster":["https://lamarcardinals.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://lamarcardinals.com/sports/womens-volleyball/schedule"],"roster":["https://lamarcardinals.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lamar|"+sport+"':"),`${sport} routes must live in the Lamar module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://lamarcardinals.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lamarHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lamar)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · Lamar vs Schreiner | ",
 "Upcoming Nov 7, 1:00 PM Men's · Lamar at Abilene Christian | ",
 "Upcoming Nov 11, 6:00 PM Men's · Lamar vs Centenary | ",
 "Upcoming Nov 17, 7:00 PM Men's · Lamar at Omaha | ",
 "Upcoming Nov 22, 4:00 PM Men's · Lamar vs Rice | ",
 "Upcoming Nov 24, 5:30 PM Men's · Lamar vs Robert Morris | ",
 "Upcoming Dec 2, 6:00 PM Men's · Lamar vs UL Monroe | ",
 "Upcoming Dec 5, 6:00 PM Men's · Lamar vs Northwestern State | ",
 "Upcoming Dec 7, 6:00 PM Men's · Lamar vs East Texas A&M | ",
 "Upcoming Dec 10, 1:00 PM Men's · Lamar at Portland | ",
 "Upcoming Dec 11, 8:30 PM Men's · Lamar at Oregon State | ",
 "Upcoming Dec 19, 3:30 PM Men's · Lamar at Texas A&M - Corpus Christi | ",
 "Upcoming Dec 21, 6:30 PM Men's · Lamar at UT Rio Grande Valley | ",
 "Upcoming Dec 29, 8:00 PM Men's · Lamar at Boise State | ",
 "Upcoming Jan 2, 4:00 PM Men's · Lamar at McNeese | ",
 "Upcoming Jan 4, 6:00 PM Men's · Lamar vs Southeastern Louisiana | ",
 "Upcoming Jan 9, 4:00 PM Men's · Lamar at UIW | ",
 "Upcoming Jan 11, 7:00 PM Men's · Lamar at Houston Christian | ",
 "Upcoming Jan 16, 6:00 PM Men's · Lamar vs Nicholls | ",
 "Upcoming Jan 18, 6:00 PM Men's · Lamar vs LSU New Orleans | ",
 "Upcoming Jan 23, 3:30 PM Men's · Lamar at Southeastern Louisiana | ",
 "Upcoming Jan 26, 6:00 PM Men's · Lamar vs McNeese | ",
 "Upcoming Jan 30, 4:30 PM Men's · Lamar at Stephen F. Austin | ",
 "Upcoming Feb 1, 6:30 PM Men's · Lamar at East Texas A&M | ",
 "Upcoming Feb 6, 6:00 PM Men's · Lamar vs Stephen F. Austin | ",
 "Upcoming Feb 8, 6:30 PM Men's · Lamar at Northwestern State | ",
 "Upcoming Feb 13, 6:00 PM Men's · Lamar vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 15, 6:00 PM Men's · Lamar vs UT Rio Grande Valley | ",
 "Upcoming Feb 20, 5:00 PM Men's · Lamar at LSU New Orleans | ",
 "Upcoming Feb 22, 6:30 PM Men's · Lamar at Nicholls | ",
 "Upcoming Feb 27, 6:00 PM Men's · Lamar vs UIW | ",
 "Upcoming Mar 1, 6:00 PM Men's · Lamar vs Houston Christian | ",
 "Upcoming Mar 7 Men's · Lamar at SLC Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Lamar vs North American (Exhibition) | ",
 "Upcoming Nov 2, 5:30 PM Women's · Lamar vs Louisiana Christian | ",
 "Upcoming Nov 5, 6:30 PM Women's · Lamar at UT Arlington | ",
 "Upcoming Nov 9, 6:00 PM Women's · Lamar at Texas Tech | ",
 "Upcoming Nov 12, 7:00 PM Women's · Lamar vs Arlington Baptist | ",
 "Upcoming Nov 16, 4:00 PM Women's · Lamar at Texas A&M | ",
 "Upcoming Nov 20, 6:30 PM Women's · Lamar vs Texas State | ",
 "Upcoming Nov 25, 3:00 PM Women's · Lamar vs UIC | ",
 "Upcoming Nov 27, 3:00 PM Women's · Lamar at Rice | ",
 "Upcoming Dec 3, 6:30 PM Women's · Lamar vs East Texas A&M | ",
 "Upcoming Dec 7, 11:00 AM Women's · Lamar vs Prairie View A&M | ",
 "Upcoming Dec 15, 7:00 PM Women's · Lamar at Texas A&M-Corpus Christi | ",
 "Upcoming Dec 17, 6:30 PM Women's · Lamar at UT Rio Grande Valley | ",
 "Upcoming Dec 21, 6:30 PM Women's · Lamar vs Northwestern State | ",
 "Upcoming Dec 31, 3:00 PM Women's · Lamar vs Southeastern Louisiana | ",
 "Upcoming Jan 2, 1:00 PM Women's · Lamar at McNeese | ",
 "Upcoming Jan 7, 6:00 PM Women's · Lamar at Houston Christian | ",
 "Upcoming Jan 9, 1:00 PM Women's · Lamar at UIW | ",
 "Upcoming Jan 14, 6:30 PM Women's · Lamar vs LSU New Orleans | ",
 "Upcoming Jan 16, 3:00 PM Women's · Lamar vs Nicholls | ",
 "Upcoming Jan 21, 6:30 PM Women's · Lamar vs McNeese | ",
 "Upcoming Jan 23, 1:00 PM Women's · Lamar at Southeastern Louisiana | ",
 "Upcoming Jan 28, 6:30 PM Women's · Lamar at Northwestern State | ",
 "Upcoming Jan 30, 2:30 PM Women's · Lamar at East Texas A&M | ",
 "Upcoming Feb 6, 3:00 PM Women's · Lamar vs Stephen F. Austin | ",
 "Upcoming Feb 11, 6:30 PM Women's · Lamar vs UT Rio Grande Valley | ",
 "Upcoming Feb 13, 3:00 PM Women's · Lamar vs Texas A&M-Corpus Christi | ",
 "Upcoming Feb 18, 6:30 PM Women's · Lamar at Nicholls | ",
 "Upcoming Feb 20, 2:00 PM Women's · Lamar at LSU New Orleans | ",
 "Upcoming Feb 25, 6:30 PM Women's · Lamar vs Houston Christian | ",
 "Upcoming Feb 27, 3:00 PM Women's · Lamar vs UIW | ",
 "Upcoming Mar 2, 6:30 PM Women's · Lamar at Stephen F. Austin | ",
 "Upcoming Mar 8 Women's · Lamar at Southland Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Lamar at McNeese Season Opener | Women's team: 3rd / Men's team: 3rd",
 "Final Sep 11 Lamar at Texas A&M Invitational | Women's team: 8th / Men's team: 6th",
 "Final Sep 26 Lamar at Cowboy Jamboree | Women's team: 10th / Men's team: 10th",
 "Final Oct 16 Lamar at Arturo Barrios Invitational | Women's team: 34th / Men's team: 23rd",
 "Upcoming Oct 30 Lamar at Southland Conference Championships | ",
 "Upcoming Nov 13 Lamar at NCAA South Central Regional Championships | ",
 "Upcoming Nov 21 Lamar at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Lamar vs Abilene Christian | W, 21-14",
 "Final Sep 5 Lamar at UL Lafayette | L, 7-38",
 "Final Sep 12 Lamar at Idaho | W, 23-17",
 "Final Sep 26 Lamar at Nicholls | W, 49-18",
 "Final Oct 3 Lamar vs Northwestern State | W, 42-14",
 "Final Oct 10 Lamar vs UIW | W, 38-35",
 "Final Oct 17 Lamar at Southeastern Louisiana | L, 31-34",
 "Today Oct 24, 3:00 PM Lamar vs Houston Christian | ",
 "Upcoming Oct 31, 7:00 PM Lamar at UT Rio Grande Valley | ",
 "Upcoming Nov 7, 3:00 PM Lamar vs Stephen F. Austin | ",
 "Upcoming Nov 14, 3:00 PM Lamar vs East Texas A&M | ",
 "Upcoming Nov 21, 6:00 PM Lamar at McNeese | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Lamar at Tulane Classic | Completed",
 "Final Sep 14 Women's · Lamar at Lady Clerico | Completed",
 "Final Oct 12 Women's · Lamar at The Robbie | Completed",
 "Upcoming Oct 26 Women's · Lamar at The Judson | ",
 "Upcoming Feb 1 Women's · Lamar at Battle at Bentwater | ",
 "Upcoming Feb 8 Women's · Lamar at Golf Club of Houston Invitational | ",
 "Upcoming Feb 15 Women's · Lamar at Islanders Collegiate Invitational | ",
 "Upcoming Mar 1 Women's · Lamar at West Texas Classic | ",
 "Upcoming Mar 8 Women's · Lamar at Riverbend Intercollegiate | ",
 "Upcoming Mar 15 Women's · Lamar at Magnolia Collegiate | ",
 "Upcoming Mar 29 Women's · Lamar at Golfweek Spring Challenge | ",
 "Upcoming Apr 12 Women's · Lamar at Southland Conference Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Lamar at Sandestin Collegiate Classic | Completed",
 "Final Sep 21 Men's · Lamar at Bayou City Collegiate Classic | Completed",
 "Final Sep 27 Men's · Lamar at Argent Financial Classic | Completed",
 "Final Oct 5 Men's · Lamar at West Bay Collegiate Invitational | Completed",
 "Final Oct 19 Men's · Lamar at Bank of Tennessee | Completed",
 "Upcoming Feb 15 Men's · Lamar at Border Olympics | ",
 "Upcoming Mar 8 Men's · Lamar at Louisiana Classics | ",
 "Upcoming Mar 15 Men's · Lamar at All-American Intercollegiate | ",
 "Upcoming Mar 29 Men's · Lamar at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 12 Men's · Lamar at Everett Buick GMC Classic | ",
 "Upcoming Apr 26 Men's · Lamar at Southland Conference Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Lamar at UTEP | L, 0-2",
 "Final Aug 16 Lamar vs Sam Houston | T, 0-0",
 "Final Aug 20 Lamar at Louisiana Tech | W, 1-0",
 "Final Aug 23 Lamar at Rice | T, 1-1",
 "Final Aug 30 Lamar at Tarleton State | T, 1-1",
 "Final Sep 3 Lamar vs Our Lady of the Lake | W, 5-0",
 "Final Sep 10 Lamar vs Texas A&M University-San Antonio | W, 13-0",
 "Final Sep 17 Lamar vs UTRGV | W, 1-0",
 "Final Sep 24 Lamar at Northwestern State | L, 0-2",
 "Final Sep 27 Lamar vs Nicholls | T, 2-2",
 "Final Oct 2 Lamar at East Texas A&M | W, 2-1",
 "Final Oct 11 Lamar at Stephen F. Austin | W, 2-1",
 "Final Oct 15 Lamar vs UIW | W, 1-0",
 "Final Oct 22 Lamar vs Texas A&M-Corpus Christi | W, 3-0",
 "Upcoming Oct 25, 5:00 PM Lamar at Southeastern Louisiana | ",
 "Upcoming Nov 1, 3:30 PM Lamar at Houston Christian | ",
 "Upcoming Nov 5, 7:00 PM Lamar vs McNeese | ",
 "Upcoming Nov 10 Lamar at Southland Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Nov 4, 5:30 PM Lamar vs San Jacinto College | ",
 "Upcoming Nov 5, 5:00 PM Lamar vs LSU-Eunice | ",
 "Upcoming Nov 6, 4:30 PM Lamar vs Blinn College | ",
 "Upcoming Nov 9, 5:00 PM Lamar vs Lamar State College | ",
 "Upcoming Nov 11, 5:30 PM Lamar vs Angelina College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Lamar at Lady Demon Invitational | Completed",
 "Final Sep 25 Women's · Lamar at UL Lafayette Invitational | Completed",
 "Today Oct 21 Women's · Lamar at Southland Masters Tournament | ",
 "Today Oct 23 Women's · Lamar at Sam Houston Invitational | ",
 "Upcoming Oct 30 Women's · Lamar at SLU Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Lamar at Jake Frederick Memorial Islander Open | Completed",
 "Final Oct 8 Men's · Lamar at ITA Texas Regionals | Completed",
 "Final Oct 16 Men's · Lamar at Ralph O'Connor Invitational | Completed",
 "Today Oct 22 Men's · Lamar at Southland Tennis Masters Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Lamar vs CSU Bakersfield | L, 0-3",
 "Final Aug 28 Lamar at Abilene Christian | L, 1-3",
 "Final Aug 29 Lamar vs North Texas | L, 1-3",
 "Final Sep 4 Lamar at Liberty | L, 0-3",
 "Final Sep 5 Lamar vs High Point | L, 0-3",
 "Final Sep 8 Lamar at Houston | L, 0-3",
 "Final Sep 11 Lamar vs Southern | W, 3-0",
 "Final Sep 11 Lamar at Southern Miss | L, 1-3",
 "Final Sep 12 Lamar vs Jackson State | W, 3-0",
 "Final Sep 15 Lamar at Prairie View A&M | W, 3-0",
 "Final Sep 18 Lamar vs North Dakota | L, 0-3",
 "Final Sep 18 Lamar vs UL Monroe | L, 0-3",
 "Final Sep 19 Lamar vs Sam Houston | L, 0-3",
 "Final Sep 24 Lamar vs LSU New Orleans | W, 3-0",
 "Final Sep 26 Lamar vs Southeastern Louisiana | L, 2-3",
 "Final Oct 1 Lamar at Nicholls | L, 0-3",
 "Final Oct 3 Lamar at McNeese | L, 0-3",
 "Final Oct 8 Lamar vs Houston Christian | W, 3-2",
 "Final Oct 10 Lamar vs UIW | L, 0-3",
 "Final Oct 15 Lamar at Texas A&M - Corpus Christi | W, 3-1",
 "Final Oct 17 Lamar at UTRGV | L, 0-3",
 "Final Oct 21 Lamar at Northwestern State | W, 3-1",
 "Today Oct 24, 11:00 AM Lamar vs East Texas A&M | ",
 "Upcoming Oct 29, 6:00 PM Lamar at Stephen F. Austin | ",
 "Upcoming Oct 31, 1:00 PM Lamar vs Stephen F. Austin | ",
 "Upcoming Nov 5, 6:00 PM Lamar vs Nicholls | ",
 "Upcoming Nov 7, 11:00 AM Lamar vs McNeese | ",
 "Upcoming Nov 12, 6:30 PM Lamar at LSU New Orleans | ",
 "Upcoming Nov 14, 12:00 PM Lamar at Southeastern Louisiana | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
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
console.log("Lamar module checks passed");
