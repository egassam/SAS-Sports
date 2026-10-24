import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northwesternStateSchool} from '../src/schools/northwestern-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='northwestern-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northwesternStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/northwestern-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit nsudemons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['northwestern-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',northwesternStateSchool.scheduleUrls],['roster',northwesternStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('northwestern-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'nsudemons.com',`${key} must stay on nsudemons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://nsudemons.com/sports/baseball/schedule"],"roster":["https://nsudemons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://nsudemons.com/sports/mens-basketball/schedule","https://nsudemons.com/sports/womens-basketball/schedule"],"roster":["https://nsudemons.com/sports/mens-basketball/roster","https://nsudemons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://nsudemons.com/sports/womens-cross-country/schedule","https://nsudemons.com/sports/cross-country/schedule"],"roster":["https://nsudemons.com/sports/womens-cross-country/roster","https://nsudemons.com/sports/cross-country/roster"],"combined":true},"Football":{"schedule":["https://nsudemons.com/sports/football/schedule"],"roster":["https://nsudemons.com/sports/football/roster"],"combined":false},"Soccer":{"schedule":["https://nsudemons.com/sports/womens-soccer/schedule"],"roster":["https://nsudemons.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://nsudemons.com/sports/softball/schedule"],"roster":["https://nsudemons.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://nsudemons.com/sports/womens-tennis/schedule"],"roster":["https://nsudemons.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://nsudemons.com/sports/womens-track-and-field/schedule","https://nsudemons.com/sports/mens-track-and-field/schedule"],"roster":["https://nsudemons.com/sports/womens-track-and-field/roster","https://nsudemons.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://nsudemons.com/sports/womens-volleyball/schedule"],"roster":["https://nsudemons.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'northwestern-state|"+sport+"':"),`${sport} routes must live in the Northwestern State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://nsudemons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northwesternStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=northwestern-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 26 Men's · NSU at North Texas (Exhibition) | ",
 "Upcoming Nov 2, 8:30 PM Men's · NSU at Baylor | ",
 "Upcoming Nov 5, 6:30 PM Men's · NSU at Mississippi State | ",
 "Upcoming Nov 7, 7:00 PM Men's · NSU at Murray State | ",
 "Upcoming Nov 10, 6:30 PM Men's · NSU vs Millsaps College | ",
 "Upcoming Nov 14, 7:00 PM Men's · NSU at Little Rock | ",
 "Upcoming Nov 20, 6:30 PM Men's · NSU vs UT Arlington | ",
 "Upcoming Nov 25, 5:00 PM Men's · NSU vs West Florida | ",
 "Upcoming Dec 1 Men's · NSU vs Ecclesia College | ",
 "Upcoming Dec 5, 6:00 PM Men's · NSU at Lamar | ",
 "Upcoming Dec 8, 8:00 PM Men's · NSU at Grand Canyon | ",
 "Upcoming Dec 14, 6:00 PM Men's · NSU at UT Martin | ",
 "Upcoming Dec 19, 3:30 PM Men's · NSU vs McNeese | ",
 "Upcoming Dec 21, 6:30 PM Men's · NSU vs Southeastern Louisiana | ",
 "Upcoming Dec 29, 6:30 PM Men's · NSU at Stephen F. Austin | ",
 "Upcoming Jan 2, 3:30 PM Men's · NSU vs LSU-New Orleans | ",
 "Upcoming Jan 4, 6:30 PM Men's · NSU at Nicholls | ",
 "Upcoming Jan 9, 3:30 PM Men's · NSU at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 11, 6:30 PM Men's · NSU at UTRGV | ",
 "Upcoming Jan 16, 3:30 PM Men's · NSU vs UIW | ",
 "Upcoming Jan 18, 6:30 PM Men's · NSU vs Houston Christian | ",
 "Upcoming Jan 23, 3:30 PM Men's · NSU vs Nicholls | ",
 "Upcoming Jan 26, 6:30 PM Men's · NSU at LSU-New Orleans | ",
 "Upcoming Jan 30, 3:30 PM Men's · NSU vs East Texas A&M | ",
 "Upcoming Feb 1, 6:30 PM Men's · NSU vs Stephen F. Austin | ",
 "Upcoming Feb 6, 5:00 PM Men's · NSU at East Texas A&M | ",
 "Upcoming Feb 8, 6:30 PM Men's · NSU vs Lamar | ",
 "Upcoming Feb 13, 3:30 PM Men's · NSU at Southeastern Louisiana | ",
 "Upcoming Feb 15, 6:30 PM Men's · NSU at McNeese | ",
 "Upcoming Feb 20, 7:00 PM Men's · NSU at Houston Christian | ",
 "Upcoming Feb 22, 5:00 PM Men's · NSU at UIW | ",
 "Upcoming Feb 27, 3:30 PM Men's · NSU vs Texas A&M - Corpus Christi | ",
 "Upcoming Mar 1, 8:00 PM Men's · NSU vs UTRGV | ",
 "Upcoming Mar 7 Men's · NSU at Southland Conference Tournament First Round | ",
 "Upcoming Mar 8 Men's · NSU at Southland Conference Tournament Quarterfinals | ",
 "Upcoming Mar 9 Men's · NSU at Southland Conference Tournament Semifinals | ",
 "Upcoming Mar 10 Men's · NSU at Southland Conference Tournament Championship Game | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · NSU vs Ecclesia College | ",
 "Upcoming Nov 6, 10:30 AM Women's · NSU at Arkansas | ",
 "Upcoming Nov 9, 11:00 AM Women's · NSU at Oklahoma State | ",
 "Upcoming Nov 12, 6:30 PM Women's · NSU at Louisiana Tech | ",
 "Upcoming Nov 16, 6:30 PM Women's · NSU vs LSU-Shreveport | ",
 "Upcoming Nov 19, 6:00 PM Women's · NSU at Oklahoma | ",
 "Upcoming Nov 24, 6:30 PM Women's · NSU vs Alabama State | ",
 "Upcoming Nov 27, 2:00 PM Women's · NSU vs UL Lafayette | ",
 "Upcoming Dec 2, 6:30 PM Women's · NSU at Stephen F. Austin | ",
 "Upcoming Dec 6, 2:00 PM Women's · NSU vs LSU | ",
 "Upcoming Dec 11, 12:00 PM Women's · NSU vs Jackson State | ",
 "Upcoming Dec 17, 6:00 PM Women's · NSU at Southeastern Louisiana | ",
 "Upcoming Dec 19, 1:00 PM Women's · NSU vs McNeese | ",
 "Upcoming Dec 21, 6:30 PM Women's · NSU at Lamar | ",
 "Upcoming Dec 31, 1:00 PM Women's · NSU at Nicholls | ",
 "Upcoming Jan 2, 1:00 PM Women's · NSU vs LSU-New Orleans | ",
 "Upcoming Jan 7, 6:30 PM Women's · NSU at UTRGV | ",
 "Upcoming Jan 9, 1:00 PM Women's · NSU at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 14, 6:30 PM Women's · NSU vs Houston Christian | ",
 "Upcoming Jan 16, 1:00 PM Women's · NSU vs UIW | ",
 "Upcoming Jan 21, 6:30 PM Women's · NSU at LSU-New Orleans | ",
 "Upcoming Jan 23, 1:00 PM Women's · NSU vs Nicholls | ",
 "Upcoming Jan 28, 6:30 PM Women's · NSU vs Lamar | ",
 "Upcoming Jan 30, 1:00 PM Women's · NSU vs Stephen F. Austin | ",
 "Upcoming Feb 6, 2:30 PM Women's · NSU at East Texas A&M | ",
 "Upcoming Feb 11, 6:30 PM Women's · NSU at McNeese | ",
 "Upcoming Feb 13, 1:00 PM Women's · NSU vs East Texas A&M | ",
 "Upcoming Feb 18, 6:00 PM Women's · NSU at UIW | ",
 "Upcoming Feb 20, 4:00 PM Women's · NSU at Houston Christian | ",
 "Upcoming Feb 25, 6:30 PM Women's · NSU vs UTRGV | ",
 "Upcoming Feb 27, 1:00 PM Women's · NSU vs Texas A&M - Corpus Christi | ",
 "Upcoming Mar 1, 5:30 PM Women's · NSU vs Southeastern Louisiana | ",
 "Upcoming Mar 8 Women's · NSU at Southland Conference Tournament First Round | ",
 "Upcoming Mar 9 Women's · NSU at Southland Conference Tournament Quarterfinals | ",
 "Upcoming Mar 10 Women's · NSU at Southland Conference Tournament Semifinals | ",
 "Upcoming Mar 11 Women's · NSU at Southland Conference Tournament Championship Game | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · NSU at McNeese Season Opener | Completed",
 "Final Sep 11 Women's · NSU at NSU Demon Invitational | Completed",
 "Final Sep 26 Women's · NSU at Cowboy Stampede | Completed",
 "Final Oct 16 Women's · NSU at Watson Cross Country Classic | Completed",
 "Upcoming Oct 30 Women's · NSU at Southland Conference Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Men's · NSU at McNeese Season Opener | Completed",
 "Final Sep 11 Men's · NSU at NSU Demon Invitational | Completed",
 "Final Sep 26 Men's · NSU at Cowboy Stampede | Completed",
 "Final Oct 16 Men's · NSU at Watson Cross Country Classic | Completed",
 "Upcoming Oct 30 Men's · NSU at Southland Conference Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 NSU vs Louisiana Christian | L, 37-42",
 "Final Sep 5 NSU at Louisiana Tech | L, 6-80",
 "Final Sep 12 NSU at East Texas A&M | L, 14-38",
 "Final Sep 19 NSU at Weber State | L, 20-49",
 "Final Sep 26 NSU vs Southeastern Louisiana | L, 21-52",
 "Final Oct 3 NSU at Lamar | L, 14-42",
 "Final Oct 17 NSU vs McNeese | L, 21-24",
 "Today Oct 24, 2:00 PM NSU vs Nicholls | ",
 "Upcoming Oct 31, 1:00 PM NSU at UIW | ",
 "Upcoming Nov 7, 1:00 PM NSU vs UTRGV | ",
 "Upcoming Nov 14, 1:00 PM NSU vs Houston Christian | ",
 "Upcoming Nov 19, 6:00 PM NSU at Stephen F. Austin | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 NSU at Oklahoma | L, 0-9",
 "Final Aug 16 NSU at LSU | L, 0-5",
 "Final Aug 20 NSU at Houston | L, 0-5",
 "Final Aug 23 NSU at UL Lafayette | L, 1-4",
 "Final Sep 3 NSU at Alcorn State | L, 1-3",
 "Final Sep 6 NSU vs Louisiana Tech | W, 5-2",
 "Final Sep 10 NSU vs Arkansas - Pine Bluff | W, 24-1",
 "Final Sep 17 NSU at Grambling | W, 4-2",
 "Final Sep 24 NSU vs Lamar | W, 2-0",
 "Final Sep 27 NSU at Stephen F. Austin | W, 4-3",
 "Final Oct 2 NSU at UIW | L, 0-2",
 "Final Oct 8 NSU vs East Texas A&M | W, 3-1",
 "Final Oct 11 NSU at Texas A&M - Corpus Christi | W, 2-0",
 "Final Oct 15 NSU vs Houston Christian | L, 1-3",
 "Final Oct 22 NSU at Southeastern Louisiana | L, 0-1",
 "Upcoming Oct 25, 1:00 PM NSU vs Nicholls | ",
 "Upcoming Nov 1, 1:00 PM NSU at McNeese | ",
 "Upcoming Nov 5, 11:00 AM NSU vs UTRGV | ",
 "Upcoming Nov 10 NSU at Southland Conference Tournament Quarterfinals | ",
 "Upcoming Nov 12 NSU at Southland Conference Tournament Semifinals | ",
 "Upcoming Nov 15 NSU at Championship Match | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 7, 5:00 PM NSU vs Tyler Junior College | ",
 "Upcoming Oct 14, 5:00 PM NSU vs Northeast Texas Community College | ",
 "Upcoming Oct 15, 5:00 PM NSU at LSU | ",
 "Upcoming Oct 21, 5:00 PM NSU vs LSU-Eunice | ",
 "Upcoming Oct 27, 5:00 PM NSU vs Angelina College | ",
 "Upcoming Oct 28, 5:00 PM NSU vs Copiah-Lincoln Community College | ",
 "Upcoming Nov 11, 5:00 PM NSU vs Bossier Parish Community College | ",
 "Upcoming Nov 12, 5:00 PM NSU vs Pearl River Community College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 NSU at Lady Demon Invitational | Completed",
 "Final Sep 25 NSU at Rice Invite | Completed",
 "Final Oct 2 NSU at River State Shoot-Out | Completed",
 "Final Oct 16 NSU at Bearkat Invitational | Completed",
 "Upcoming Oct 31 NSU at Louisiana Tech Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 21 NSU vs Alcorn State (Exhibition) | W, 4-0",
 "Final Aug 28 NSU at West Georgia | L, 0-3",
 "Final Aug 29 NSU vs Presbyterian College | L, 0-3",
 "Final Aug 29 NSU vs Grambling | W, 3-1",
 "Final Sep 1 NSU at ULM | L, 0-3",
 "Final Sep 4 NSU vs Indiana State | L, 2-3",
 "Final Sep 4 NSU at Missouri State | L, 0-3",
 "Final Sep 5 NSU vs Little Rock | L, 0-3",
 "Final Sep 8 NSU vs Jackson State | W, 3-1",
 "Final Sep 10 NSU vs Mississippi Valley State | W, 3-0",
 "Final Sep 11 NSU vs ULM | W, 3-1",
 "Final Sep 12 NSU at Grambling | W, 3-1",
 "Final Sep 15 NSU vs Louisiana Tech | W, 3-0",
 "Final Sep 18 NSU vs Murray State | W, 3-1",
 "Final Sep 19 NSU vs The Citadel | W, 3-1",
 "Final Sep 19 NSU at Troy | L, 0-3",
 "Final Sep 24 NSU at Houston Christian | W, 3-1",
 "Final Sep 26 NSU at UIW | L, 1-3",
 "Final Oct 1 NSU vs Southeastern Louisiana | L, 2-3",
 "Final Oct 3 NSU vs LSU-New Orleans | W, 3-0",
 "Final Oct 8 NSU vs UTRGV | L, 0-3",
 "Final Oct 10 NSU vs Texas A&M - Corpus Christi | W, 3-1",
 "Final Oct 15 NSU at Nicholls | W, 3-0",
 "Final Oct 17 NSU at McNeese | L, 0-3",
 "Final Oct 21 NSU vs Lamar | L, 1-3",
 "Today Oct 24 NSU at Stephen F. Austin | ",
 "Upcoming Oct 29, 6:30 PM NSU vs Houston Christian | ",
 "Upcoming Oct 31, 1:00 PM NSU vs UIW | ",
 "Upcoming Nov 5, 6:30 PM NSU at Texas A&M - Corpus Christi | ",
 "Upcoming Nov 7, 1:00 PM NSU at UTRGV | ",
 "Upcoming Nov 12, 6:30 PM NSU vs East Texas A&M | ",
 "Upcoming Nov 14, 1:00 PM NSU at East Texas A&M | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Northwestern State module checks passed");
