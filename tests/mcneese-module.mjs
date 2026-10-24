import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mcneeseSchool} from '../src/schools/mcneese.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mcneese');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mcneeseHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mcneese-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mcneesesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mcneese'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',mcneeseSchool.scheduleUrls],['roster',mcneeseSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mcneese|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mcneesesports.com',`${key} must stay on mcneesesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mcneesesports.com/sports/baseball/schedule"],"roster":["https://mcneesesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mcneesesports.com/sports/mens-basketball/schedule","https://mcneesesports.com/sports/womens-basketball/schedule"],"roster":["https://mcneesesports.com/sports/mens-basketball/roster","https://mcneesesports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://mcneesesports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://mcneesesports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://mcneesesports.com/sports/womens-cross-country/schedule","https://mcneesesports.com/sports/mens-cross-country/schedule"],"roster":["https://mcneesesports.com/sports/womens-cross-country/roster","https://mcneesesports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://mcneesesports.com/sports/football/schedule"],"roster":["https://mcneesesports.com/sports/football/roster"],"combined":false},"Soccer":{"schedule":["https://mcneesesports.com/sports/womens-soccer/schedule"],"roster":["https://mcneesesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://mcneesesports.com/sports/softball/schedule"],"roster":["https://mcneesesports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://mcneesesports.com/sports/womens-tennis/schedule"],"roster":["https://mcneesesports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://mcneesesports.com/sports/womens-track-and-field/schedule","https://mcneesesports.com/sports/mens-track-and-field/schedule"],"roster":["https://mcneesesports.com/sports/womens-track-and-field/roster","https://mcneesesports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://mcneesesports.com/sports/womens-volleyball/schedule"],"roster":["https://mcneesesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mcneese|"+sport+"':"),`${sport} routes must live in the McNeese module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://mcneesesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mcneeseHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mcneese)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 24, 2:00 PM McNeese at Louisiana | ",
 "Upcoming Nov 5, 5:00 PM McNeese vs Banana Game | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 8 Men's · McNeese vs LSU (Exhibition) | L, 60-63",
 "Upcoming Oct 25, 2:00 PM Men's · McNeese vs Southern (Exhibition) | ",
 "Upcoming Nov 2, 4:30 PM Men's · McNeese vs UAB | ",
 "Upcoming Nov 5 Men's · McNeese at North Texas | ",
 "Upcoming Nov 9, 6:30 PM Men's · McNeese vs College of Biblical Studies | ",
 "Upcoming Nov 22 Men's · McNeese at Texas State | ",
 "Upcoming Nov 28, 3:00 PM Men's · McNeese at UL-Lafayette | ",
 "Upcoming Nov 30, 6:30 PM Men's · McNeese vs Champion Christian College | ",
 "Upcoming Dec 5, 4:00 PM Men's · McNeese vs Houston Christian | ",
 "Upcoming Dec 7, 6:30 PM Men's · McNeese vs Incarnate Word | ",
 "Upcoming Dec 10, 6:30 PM Men's · McNeese vs Southern Miss | ",
 "Upcoming Dec 13 Men's · McNeese vs LMU | ",
 "Upcoming Dec 14 Men's · McNeese vs Santa Clara | ",
 "Upcoming Dec 19, 3:30 PM Men's · McNeese at Northwestern State | ",
 "Upcoming Dec 21, 6:30 PM Men's · McNeese at East Texas A&M | ",
 "Upcoming Jan 2, 4:00 PM Men's · McNeese vs Lamar | ",
 "Upcoming Jan 4, 6:30 PM Men's · McNeese vs Stephen F. Austin | ",
 "Upcoming Jan 9, 3:30 PM Men's · McNeese at Southeastern | ",
 "Upcoming Jan 11, 6:30 PM Men's · McNeese at Nicholls | ",
 "Upcoming Jan 16, 4:00 PM Men's · McNeese vs UTRGV | ",
 "Upcoming Jan 18, 6:30 PM Men's · McNeese vs Texas A&M - Corpus Christi | ",
 "Upcoming Jan 23, 4:30 PM Men's · McNeese at Stephen F. Austin | ",
 "Upcoming Jan 26, 6:00 PM Men's · McNeese at Lamar | ",
 "Upcoming Jan 30, 4:00 PM Men's · McNeese vs Southeastern | ",
 "Upcoming Feb 1, 6:30 PM Men's · McNeese at LSU New Orleans | ",
 "Upcoming Feb 6 Men's · McNeese at Incarnate Word | ",
 "Upcoming Feb 8, 7:00 PM Men's · McNeese at Houston Christian | ",
 "Upcoming Feb 13, 4:00 PM Men's · McNeese vs East Texas A&M | ",
 "Upcoming Feb 15, 6:30 PM Men's · McNeese vs Northwestern State | ",
 "Upcoming Feb 20, 5:30 PM Men's · McNeese at Texas A&M - Corpus Christi | ",
 "Upcoming Feb 22, 6:30 PM Men's · McNeese at UTRGV | ",
 "Upcoming Feb 27, 4:00 PM Men's · McNeese vs Nicholls | ",
 "Upcoming Mar 1, 6:30 PM Men's · McNeese vs LSU New Orleans | ",
 "Upcoming Mar 7 Men's · McNeese at Southland Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · McNeese vs Texas A&M - Kingsville | ",
 "Upcoming Nov 5, 6:30 PM Women's · McNeese vs Grambling | ",
 "Upcoming Nov 8, 1:00 PM Women's · McNeese vs Louisiana Tech | ",
 "Upcoming Nov 10, 7:00 PM Women's · McNeese at LSU | ",
 "Upcoming Nov 13, 6:30 PM Women's · McNeese vs College of Biblical Studies | ",
 "Upcoming Nov 16, 6:30 PM Women's · McNeese at Tulane | ",
 "Upcoming Nov 18, 6:00 PM Women's · McNeese at Southern Miss | ",
 "Upcoming Nov 26, 12:00 PM Women's · McNeese vs College of Charleston | ",
 "Upcoming Nov 28, 11:00 AM Women's · McNeese vs North Dakota State | ",
 "Upcoming Dec 3, 6:30 PM Women's · McNeese vs Incarnate Word | ",
 "Upcoming Dec 5, 1:00 PM Women's · McNeese vs Houston Christian | ",
 "Upcoming Dec 9, 6:30 PM Women's · McNeese vs UL-Lafayette | ",
 "Upcoming Dec 17, 6:30 PM Women's · McNeese at East Texas A&M | ",
 "Upcoming Dec 19, 1:00 PM Women's · McNeese at Northwestern State | ",
 "Upcoming Dec 31, 1:00 PM Women's · McNeese vs Stephen F. Austin | ",
 "Upcoming Jan 2, 1:00 PM Women's · McNeese vs Lamar | ",
 "Upcoming Jan 7, 6:00 PM Women's · McNeese at Southeastern | ",
 "Upcoming Jan 9, 1:00 PM Women's · McNeese at Nicholls | ",
 "Upcoming Jan 14, 6:30 PM Women's · McNeese vs Texas A&M - Corpus Christi | ",
 "Upcoming Jan 16, 1:00 PM Women's · McNeese vs UTRGV | ",
 "Upcoming Jan 21, 6:30 PM Women's · McNeese at Lamar | ",
 "Upcoming Jan 23, 2:00 PM Women's · McNeese at Stephen F. Austin | ",
 "Upcoming Jan 28, 6:30 PM Women's · McNeese at LSU New Orleans | ",
 "Upcoming Jan 30, 1:00 PM Women's · McNeese vs Southeastern | ",
 "Upcoming Feb 4, 6:00 PM Women's · McNeese at Houston Christian | ",
 "Upcoming Feb 6, 1:00 PM Women's · McNeese at Incarnate Word | ",
 "Upcoming Feb 11, 6:30 PM Women's · McNeese vs Northwestern State | ",
 "Upcoming Feb 18, 6:30 PM Women's · McNeese at UTRGV | ",
 "Upcoming Feb 20, 1:00 PM Women's · McNeese at Texas A&M - Corpus Christi | ",
 "Upcoming Feb 25, 6:30 PM Women's · McNeese vs LSU New Orleans | ",
 "Upcoming Feb 27, 1:00 PM Women's · McNeese vs Nicholls | ",
 "Upcoming Mar 2, 6:30 PM Women's · McNeese vs East Texas A&M | ",
 "Upcoming Mar 8 Women's · McNeese at Southland Conference Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 10 McNeese at AVCA Central Qualifier | Completed",
 "Final Oct 16 McNeese at HCU Fall Event | Completed",
 "Upcoming Oct 31 McNeese at LSU | ",
 "Upcoming Nov 6 McNeese at Friday Night Lights | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · McNeese at McNeese Season Opener | Completed",
 "Final Sep 16 Women's · McNeese at McNeese HS 2-Mile | Completed",
 "Final Sep 18 Women's · McNeese at LSU XC Invitational | Completed",
 "Final Sep 26 Women's · McNeese at McNeese Cowboy Stampede | 3rd women/2nd men",
 "Final Oct 16 Women's · McNeese at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30, 8:30 AM Women's · McNeese at Southland Conference XC Championships | ",
 "Upcoming Nov 13 Women's · McNeese at NCAA South Central Regional XC Championships | ",
 "Upcoming Nov 21 Women's · McNeese at NCAA XC Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · McNeese at McNeese Season Opener | Completed",
 "Final Sep 16 Men's · McNeese at McNeese HS 2-Mile | Completed",
 "Final Sep 18 Men's · McNeese at LSU XC Invitational | Completed",
 "Final Sep 26 Men's · McNeese at McNeese Cowboy Stampede | 3rd women/2nd men",
 "Final Oct 16 Men's · McNeese at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30, 8:30 AM Men's · McNeese at Southland Conference XC Championships | ",
 "Upcoming Nov 13 Men's · McNeese at NCAA South Central Regional XC Championships | ",
 "Upcoming Nov 21 Men's · McNeese at NCAA XC Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 McNeese vs Stephen F. Austin | L, 27-38",
 "Final Sep 5 McNeese vs Texas Wesleyan | W, 52-0",
 "Final Sep 12 McNeese vs Tarleton State | L, 24-27",
 "Final Sep 19 McNeese at UTRGV | L, 10-27",
 "Final Sep 26 McNeese vs East Texas A&M | W, 27-24",
 "Final Oct 3 McNeese at LSU | L, 14-63",
 "Final Oct 17 McNeese at Northwestern State | W, 24-21",
 "Today Oct 24, 4:00 PM McNeese at Incarnate Word | ",
 "Upcoming Oct 31, 2:00 PM McNeese vs Nicholls | ",
 "Upcoming Nov 7, 4:00 PM McNeese at Houston Christian | ",
 "Upcoming Nov 14, 6:00 PM McNeese at Southeastern | ",
 "Upcoming Nov 21, 6:00 PM McNeese vs Lamar | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 McNeese vs LSU-Eunice (Exhib.) | W, 7-0",
 "Final Aug 13 McNeese at Alcorn State | W, 2-1",
 "Final Aug 16 McNeese vs Southern Miss | W, 1-0",
 "Final Aug 20 McNeese vs Jackson State | W, 2-0",
 "Final Aug 23 McNeese vs North Texas | L, 2-4",
 "Final Aug 27 McNeese at West Florida | L, 1-3",
 "Final Aug 30 McNeese vs UL-Lafayette | L, 1-4",
 "Final Sep 3 McNeese at Louisiana Tech | W, 2-0",
 "Final Sep 6 McNeese at Grambling | W, 1-0",
 "Final Sep 13 McNeese at Sam Houston | L, 0-1",
 "Final Sep 17 McNeese at Southeastern | L, 1-2",
 "Final Sep 24 McNeese vs Stephen F. Austin | W, 3-2",
 "Final Sep 27 McNeese at Texas A&M - Corpus Christi | W, 2-0",
 "Final Oct 2 McNeese vs Nicholls | T, 0-0",
 "Final Oct 8 McNeese at UTRGV | W, 2-0",
 "Final Oct 11 McNeese vs Houston Christian | T, 1-1",
 "Final Oct 22 McNeese vs Incarnate Word | L, 1-2",
 "Upcoming Oct 25, 1:00 PM McNeese at East Texas A&M | ",
 "Upcoming Nov 1, 1:00 PM McNeese vs Northwestern State | ",
 "Upcoming Nov 5, 7:00 PM McNeese at Lamar | ",
 "Upcoming Nov 10 McNeese at Southland Conference Championship | ",
 "Upcoming Nov 12 McNeese at Southland Conference Championship | ",
 "Upcoming Nov 15 McNeese at Southland Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 27, 6:00 PM McNeese at UL-Lafayette | ",
 "Upcoming Oct 29 McNeese at LSU | ",
 "Upcoming Nov 4, 4:30 PM McNeese vs Copiah-Lincoln Community College | ",
 "Upcoming Nov 5, 4:00 PM McNeese vs Lamar State College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 McNeese at Cowgirl Invite | Completed",
 "Final Sep 25 McNeese at Ragin' Cajun Hidden Duals | Completed",
 "Final Oct 8 McNeese at ITA Southern Regionals | Completed",
 "Today Oct 23, 9:00 AM McNeese at SLC Individual Championship | ",
 "Upcoming Nov 5 McNeese at ITA Conference Masters | ",
 "Upcoming Nov 7 McNeese at States Up Slam | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 McNeese vs Miami (OH) | L, 0-3",
 "Final Aug 28 McNeese vs Cal State Fullerton | L, 0-3",
 "Final Aug 29 McNeese at Sam Houston | L, 0-3",
 "Final Sep 1 McNeese at UL-Lafayette | L, 0-3",
 "Final Sep 4 McNeese at Rice | L, 0-3",
 "Final Sep 5 McNeese vs Illinois | L, 0-3",
 "Final Sep 10 McNeese at UL-Monroe | L, 1-3",
 "Final Sep 11 McNeese at Grambling | W, 3-0",
 "Final Sep 12 McNeese at Louisiana Tech | W, 3-0",
 "Final Sep 17 McNeese vs Grambling | W, 3-0",
 "Final Sep 19 McNeese vs Oral Roberts | W, 3-1",
 "Final Sep 23 McNeese vs UTRGV | L, 0-3",
 "Final Sep 26 McNeese at Texas A&M - Corpus Christi | L, 1-3",
 "Final Oct 1 McNeese vs Stephen F. Austin | L, 1-3",
 "Final Oct 3 McNeese vs Lamar | W, 3-0",
 "Final Oct 8 McNeese at Southeastern | L, 1-3",
 "Final Oct 10 McNeese at LSU New Orleans | W, 3-1",
 "Final Oct 15 McNeese vs East Texas A&M | W, 3-2",
 "Final Oct 17 McNeese vs Northwestern State | W, 3-0",
 "Final Oct 22 McNeese at Incarnate Word | L, 2-3",
 "Today Oct 24, 11:00 AM McNeese at Houston Christian | ",
 "Upcoming Oct 29, 6:00 PM McNeese vs Southeastern | ",
 "Upcoming Oct 31, 10:00 AM McNeese vs LSU New Orleans | ",
 "Upcoming Nov 5, 6:00 PM McNeese at Stephen F. Austin | ",
 "Upcoming Nov 7, 11:00 AM McNeese at Lamar | ",
 "Upcoming Nov 12, 6:00 PM McNeese vs Nicholls | ",
 "Upcoming Nov 14, 1:00 PM McNeese at Nicholls | ",
 "Upcoming Nov 20 McNeese at Southland Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("McNeese module checks passed");
