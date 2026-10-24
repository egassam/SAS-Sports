import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utrgvSchool} from '../src/schools/utrgv.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utrgv');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utrgvHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utrgv-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goutrgv.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['utrgv'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',utrgvSchool.scheduleUrls],['roster',utrgvSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utrgv|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goutrgv.com',`${key} must stay on goutrgv.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goutrgv.com/sports/baseball/schedule"],"roster":["https://goutrgv.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goutrgv.com/sports/mens-basketball/schedule","https://goutrgv.com/sports/womens-basketball/schedule"],"roster":["https://goutrgv.com/sports/mens-basketball/roster","https://goutrgv.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goutrgv.com/sports/womens-cross-country/schedule","https://goutrgv.com/sports/mens-cross-country/schedule"],"roster":["https://goutrgv.com/sports/womens-cross-country/roster","https://goutrgv.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goutrgv.com/sports/football/schedule"],"roster":["https://goutrgv.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goutrgv.com/sports/womens-golf/schedule","https://goutrgv.com/sports/mens-golf/schedule"],"roster":["https://goutrgv.com/sports/womens-golf/roster","https://goutrgv.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goutrgv.com/sports/womens-soccer/schedule","https://goutrgv.com/sports/mens-soccer/schedule"],"roster":["https://goutrgv.com/sports/womens-soccer/roster","https://goutrgv.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://goutrgv.com/sports/womens-swimming-diving/schedule"],"roster":["https://goutrgv.com/sports/womens-swimming-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goutrgv.com/sports/womens-tennis/schedule","https://goutrgv.com/sports/mens-tennis/schedule"],"roster":["https://goutrgv.com/sports/womens-tennis/roster","https://goutrgv.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goutrgv.com/sports/womens-track-and-field/schedule","https://goutrgv.com/sports/mens-track-and-field/schedule"],"roster":["https://goutrgv.com/sports/womens-track-and-field/roster","https://goutrgv.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goutrgv.com/sports/womens-volleyball/schedule"],"roster":["https://goutrgv.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'utrgv|"+sport+"':"),`${sport} routes must live in the UT Rio Grande Valley module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goutrgv.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utrgvHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utrgv)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · UTRGV vs Texas A&M-Kingsville | ",
 "Upcoming Nov 7, 4:30 PM Men's · UTRGV vs Prairie View A&M | ",
 "Upcoming Nov 10, 6:30 PM Men's · UTRGV vs Texas State | ",
 "Upcoming Nov 14, 6:00 PM Men's · UTRGV at UT Arlington | ",
 "Upcoming Nov 18, 6:30 PM Men's · UTRGV vs College of Biblical Studies | ",
 "Upcoming Nov 21, 2:00 PM Men's · UTRGV at Austin Peay | ",
 "Upcoming Nov 28, 2:00 PM Men's · UTRGV at UNLV | ",
 "Upcoming Dec 3, 7:00 PM Men's · UTRGV at Nicholls | ",
 "Upcoming Dec 5, 5:00 PM Men's · UTRGV at LSU New Orleans | ",
 "Upcoming Dec 8, 7:00 PM Men's · UTRGV at Texas State | ",
 "Upcoming Dec 15, 7:00 PM Men's · UTRGV at Dayton | ",
 "Upcoming Dec 19, 4:30 PM Men's · UTRGV vs Stephen F. Austin | ",
 "Upcoming Dec 21, 6:30 PM Men's · UTRGV vs Lamar | ",
 "Upcoming Dec 29, 7:00 PM Men's · UTRGV at Arkansas | ",
 "Upcoming Jan 2, 4:30 PM Men's · UTRGV vs Texas A&M-Corpus Christi | ",
 "Upcoming Jan 4, 6:00 PM Men's · UTRGV at UIW | ",
 "Upcoming Jan 9, 4:30 PM Men's · UTRGV vs East Texas A&M | ",
 "Upcoming Jan 11, 6:30 PM Men's · UTRGV vs Northwestern State | ",
 "Upcoming Jan 16, 4:00 PM Men's · UTRGV at McNeese | ",
 "Upcoming Jan 18, 6:00 PM Men's · UTRGV at Southeastern | ",
 "Upcoming Jan 23, 3:30 PM Men's · UTRGV at Houston Christian | ",
 "Upcoming Jan 26, 6:30 PM Men's · UTRGV vs UIW | ",
 "Upcoming Jan 30, 4:30 PM Men's · UTRGV vs Houston Christian | ",
 "Upcoming Feb 1, 7:00 PM Men's · UTRGV at Texas A&M-Corpus Christi | ",
 "Upcoming Feb 6, 4:30 PM Men's · UTRGV vs LSU New Orleans | ",
 "Upcoming Feb 8, 6:30 PM Men's · UTRGV vs Nicholls | ",
 "Upcoming Feb 13, 4:30 PM Men's · UTRGV at Stephen F. Austin | ",
 "Upcoming Feb 15, 6:00 PM Men's · UTRGV at Lamar | ",
 "Upcoming Feb 20, 4:30 PM Men's · UTRGV vs Southeastern | ",
 "Upcoming Feb 22, 6:30 PM Men's · UTRGV vs McNeese | ",
 "Upcoming Feb 27, 5:00 PM Men's · UTRGV at East Texas A&M | ",
 "Upcoming Mar 1, 8:00 PM Men's · UTRGV at Northwestern State | ",
 "Upcoming Mar 7 Men's · UTRGV at Southland Conference Tournament First Round | ",
 "Upcoming Mar 8 Men's · UTRGV at Southland Conference Tournament Quarterfinals | ",
 "Upcoming Mar 9 Men's · UTRGV at Southland Conference Tournament Semifinals | ",
 "Upcoming Mar 10 Men's · UTRGV at Southland Conference Tournament Championship | ",
 "Upcoming Mar 16 Men's · UTRGV at NCAA Tournament | ",
 "Upcoming Mar 18 Men's · UTRGV at NCAA Tournament First Round | ",
 "Upcoming Mar 20 Men's · UTRGV at NCAA Tournament Second Round | ",
 "Upcoming Mar 25 Men's · UTRGV at NCAA Tournament | ",
 "Upcoming Mar 27 Men's · UTRGV at NCAA Tournament | ",
 "Upcoming Apr 3 Men's · UTRGV vs Final Four | ",
 "Upcoming Apr 5 Men's · UTRGV at NCAA Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · UTRGV vs Arlington Baptist | ",
 "Upcoming Nov 6, 11:00 AM Women's · UTRGV at South Dakota | ",
 "Upcoming Nov 8, 12:00 PM Women's · UTRGV at Kansas State | ",
 "Upcoming Nov 11, 6:30 PM Women's · UTRGV vs Abilene Christian | ",
 "Upcoming Nov 19, 6:30 PM Women's · UTRGV vs North Dakota State | ",
 "Upcoming Nov 25, 12:00 PM Women's · UTRGV at Rice | ",
 "Upcoming Nov 27, 12:00 PM Women's · UTRGV vs UIC | ",
 "Upcoming Nov 30, 6:30 PM Women's · UTRGV at Sam Houston State | ",
 "Upcoming Dec 3, 5:00 PM Women's · UTRGV at Nicholls | ",
 "Upcoming Dec 5, 2:00 PM Women's · UTRGV at LSU New Orleans | ",
 "Upcoming Dec 8, 6:00 PM Women's · UTRGV at Arizona State | ",
 "Upcoming Dec 13, 2:00 PM Women's · UTRGV at Texas | ",
 "Upcoming Dec 17, 6:30 PM Women's · UTRGV vs Lamar | ",
 "Upcoming Dec 19, 2:00 PM Women's · UTRGV vs Stephen F. Austin | ",
 "Upcoming Dec 31, 6:30 PM Women's · UTRGV at UIW | ",
 "Upcoming Jan 2, 2:00 PM Women's · UTRGV vs Texas A&M-Corpus Christi | ",
 "Upcoming Jan 7, 6:30 PM Women's · UTRGV vs Northwestern State | ",
 "Upcoming Jan 9, 2:00 PM Women's · UTRGV vs East Texas A&M | ",
 "Upcoming Jan 14, 6:00 PM Women's · UTRGV at Southeastern | ",
 "Upcoming Jan 16, 1:00 PM Women's · UTRGV at McNeese | ",
 "Upcoming Jan 21, 6:30 PM Women's · UTRGV vs UIW | ",
 "Upcoming Jan 23, 1:00 PM Women's · UTRGV at Houston Christian | ",
 "Upcoming Jan 28, 7:00 PM Women's · UTRGV at Texas A&M-Corpus Christi | ",
 "Upcoming Jan 30, 2:00 PM Women's · UTRGV vs Houston Christian | ",
 "Upcoming Feb 4, 12:00 PM Women's · UTRGV vs Nicholls | ",
 "Upcoming Feb 6, 2:00 PM Women's · UTRGV vs LSU New Orleans | ",
 "Upcoming Feb 11, 6:30 PM Women's · UTRGV at Lamar | ",
 "Upcoming Feb 13, 2:00 PM Women's · UTRGV at Stephen F. Austin | ",
 "Upcoming Feb 18, 6:30 PM Women's · UTRGV vs McNeese | ",
 "Upcoming Feb 20, 2:00 PM Women's · UTRGV vs Southeastern | ",
 "Upcoming Feb 25, 6:30 PM Women's · UTRGV at Northwestern State | ",
 "Upcoming Feb 27, 2:30 PM Women's · UTRGV at East Texas A&M | ",
 "Upcoming Mar 8 Women's · UTRGV at Southland Conference Tournament First Round | ",
 "Upcoming Mar 9 Women's · UTRGV at Southland Conference Tournament Quarterfinals | ",
 "Upcoming Mar 10 Women's · UTRGV at Southland Conference Tournament Semifinals | ",
 "Upcoming Mar 11 Women's · UTRGV at Southland Conference Tournament Championship | ",
 "Upcoming Mar 17 Women's · UTRGV at NCAA Tournament | ",
 "Upcoming Mar 19 Women's · UTRGV at NCAA Tournament First Round | ",
 "Upcoming Mar 21 Women's · UTRGV at NCAA Tournament Second Round | ",
 "Upcoming Mar 26 Women's · UTRGV at NCAA Tournament | ",
 "Upcoming Mar 28 Women's · UTRGV at NCAA Tournament | ",
 "Upcoming Apr 2 Women's · UTRGV vs Final Four | ",
 "Upcoming Apr 4 Women's · UTRGV at NCAA Tournament Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · UTRGV at UIW Invitational | 6-of-11",
 "Final Oct 16 Women's · UTRGV at Arturo Barrios Invitational | 24-of-46",
 "Upcoming Oct 30 Women's · UTRGV at Southland Conference Championships | ",
 "Upcoming Nov 13 Women's · UTRGV at South Central Regional | ",
 "Upcoming Nov 21 Women's · UTRGV at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · UTRGV at UIW Invitational | 7-of-10",
 "Final Oct 16 Men's · UTRGV at Arturo Barrios Invitational | 36-of-38",
 "Upcoming Oct 30 Men's · UTRGV at Southland Conference Championships | ",
 "Upcoming Nov 13 Men's · UTRGV at South Central Regional | ",
 "Upcoming Nov 21 Men's · UTRGV at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 UTRGV vs UT Permian Basin | W, 44-0",
 "Final Sep 5 UTRGV at UTSA | L, 16-45",
 "Final Sep 12 UTRGV at Nicholls | L, 28-31",
 "Final Sep 19 UTRGV vs McNeese | W, 27-10",
 "Final Oct 3 UTRGV at East Texas A&M | L, 17-20",
 "Final Oct 10 UTRGV vs Southeastern | W, 13-3",
 "Final Oct 17 UTRGV at UIW | L, 16-41",
 "Today Oct 24, 4:00 PM UTRGV at Central Arkansas | ",
 "Upcoming Oct 31, 7:00 PM UTRGV vs Lamar | ",
 "Upcoming Nov 7, 1:00 PM UTRGV at Northwestern State | ",
 "Upcoming Nov 14, 5:00 PM UTRGV vs Stephen F. Austin | ",
 "Upcoming Nov 21, 4:00 PM UTRGV at Houston Christian | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · UTRGV at Bear Brawl | Completed",
 "Final Sep 14 Women's · UTRGV at Lady Clerico | Completed",
 "Final Oct 5 Women's · UTRGV at PD Intercollegiate | Completed",
 "Final Oct 18 Women's · UTRGV at Diamante Intercollegiate | Completed",
 "Upcoming Feb 8 Women's · UTRGV at GCOH Invitational | ",
 "Upcoming Feb 15 Women's · UTRGV at South Texas Showdown, presented by Rally Credit Union | ",
 "Upcoming Mar 1 Women's · UTRGV at West Texas Intercollegiate | ",
 "Upcoming Mar 8 Women's · UTRGV at Riverbend Intercollegiate | ",
 "Upcoming Mar 20 Women's · UTRGV at More Than Golf Invitational | ",
 "Upcoming Apr 2 Women's · UTRGV at South Texas Showdown, presented by Rally Credit Union | ",
 "Upcoming Apr 11 Women's · UTRGV at Boilermaker Spring Classic | ",
 "Upcoming Apr 19 Women's · UTRGV at SLC Championships | ",
 "Upcoming May 10 Women's · UTRGV at NCAA Regionals | ",
 "Upcoming May 21 Women's · UTRGV at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · UTRGV at JT Poston Invitational | Completed",
 "Final Sep 21 Men's · UTRGV at Bayou City Collegiate | Completed",
 "Final Oct 5 Men's · UTRGV at West Bay Collegiate | Completed",
 "Final Oct 19 Men's · UTRGV at The Clerico | Completed",
 "Upcoming Feb 7 Men's · UTRGV at Compadres Collegiate | ",
 "Upcoming Feb 21 Men's · UTRGV at Military City Collegiate | ",
 "Upcoming Mar 8 Men's · UTRGV at Babygrande Donald Ross Collegiate | ",
 "Upcoming Mar 15 Men's · UTRGV at All-American Intercollegiate | ",
 "Upcoming Mar 30 Men's · UTRGV at Maridoe Collegiate | ",
 "Upcoming Apr 12 Men's · UTRGV at Everett Buick Classic | ",
 "Upcoming Apr 26 Men's · UTRGV at SLC Championship | ",
 "Upcoming May 17 Men's · UTRGV at NCAA Regionals | ",
 "Upcoming May 28 Men's · UTRGV at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UTRGV vs Texas Southern | L, 0-2",
 "Final Aug 16 Women's · UTRGV at Texas State | L, 1-4",
 "Final Aug 20 Women's · UTRGV vs Prairie View A&M | W, 4-0",
 "Final Aug 27 Women's · UTRGV at Tarleton | W, 1-0",
 "Final Aug 30 Women's · UTRGV vs Texas A&M International | W, 1-0",
 "Final Sep 3 Women's · UTRGV at Sam Houston | L, 2-4",
 "Final Sep 10 Women's · UTRGV vs UTEP | L, 1-2",
 "Final Sep 13 Women's · UTRGV vs Concordia | W, 5-1",
 "Final Sep 17 Women's · UTRGV at Lamar | L, 0-1",
 "Final Sep 24 Women's · UTRGV at Texas A&M-Corpus Christi | T, 1-1",
 "Final Sep 27 Women's · UTRGV vs Houston Christian | L, 1-4",
 "Final Oct 8 Women's · UTRGV vs McNeese | L, 0-2",
 "Final Oct 11 Women's · UTRGV at Southeastern | L, 0-1",
 "Final Oct 15 Women's · UTRGV vs Nicholls | L, 1-2",
 "Final Oct 22 Women's · UTRGV vs Stephen F. Austin | L, 1-3",
 "Upcoming Oct 25, 1:00 PM Women's · UTRGV at UIW | ",
 "Upcoming Nov 1, 11:00 AM Women's · UTRGV vs East Texas A&M | ",
 "Upcoming Nov 5, 11:00 AM Women's · UTRGV at Northwestern State | ",
 "Upcoming Nov 10 Women's · UTRGV at SLC Tournament Quarterfinals | ",
 "Upcoming Nov 12 Women's · UTRGV at SLC Tournament Semifinals | ",
 "Upcoming Nov 15 Women's · UTRGV at SLC Tournament Championship | ",
 "Upcoming Nov 20 Women's · UTRGV at NCAA First Round | ",
 "Upcoming Nov 26 Women's · UTRGV at NCAA Second Round | ",
 "Upcoming Nov 28 Women's · UTRGV at NCAA Third Round | ",
 "Upcoming Dec 4 Women's · UTRGV at NCAA Quarterfinals | ",
 "Upcoming Dec 10 Women's · UTRGV at NCAA Semifinals | ",
 "Upcoming Dec 13 Women's · UTRGV at NCAA Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UTRGV at West Florida | W, 3-2",
 "Final Aug 23 Men's · UTRGV vs Stetson | T, 1-1",
 "Final Sep 6 Men's · UTRGV at South Florida | W, 5-0",
 "Final Sep 15 Men's · UTRGV at Oral Roberts | L, 0-2",
 "Final Sep 18 Men's · UTRGV at Air Force | L, 1-3",
 "Final Sep 26 Men's · UTRGV vs Lindenwood | T, 0-0",
 "Final Oct 4 Men's · UTRGV at UIW | L, 1-2",
 "Final Oct 8 Men's · UTRGV at Lindenwood | L, 1-3",
 "Final Oct 11 Men's · UTRGV vs Eastern Illinois | T, 1-1",
 "Final Oct 15 Men's · UTRGV at Southern Indiana | W, 4-3",
 "Final Oct 18 Men's · UTRGV at SIUE | L, 0-3",
 "Final Oct 21 Men's · UTRGV vs HCU | T, 2-2",
 "Today Oct 24, 6:30 PM Men's · UTRGV vs Western Illinois | ",
 "Upcoming Oct 29, 6:30 PM Men's · UTRGV vs UIW | ",
 "Upcoming Nov 1, 1:00 PM Men's · UTRGV at HCU | ",
 "Upcoming Nov 8 Men's · UTRGV at OVC Tournament Quarterfinals | ",
 "Upcoming Nov 11 Men's · UTRGV at OVC Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · UTRGV at OVC Tournament Championship | ",
 "Upcoming Nov 19 Men's · UTRGV at NCAA First Round | ",
 "Upcoming Nov 22 Men's · UTRGV at NCAA Second Round | ",
 "Upcoming Nov 28 Men's · UTRGV at NCAA Third Round | ",
 "Upcoming Dec 4 Men's · UTRGV at NCAA Quarterfinals | ",
 "Upcoming Dec 11 Men's · UTRGV at NCAA Semifinals | ",
 "Upcoming Dec 14 Men's · UTRGV at NCAA Championship | "
]);
  const v_womensswimmingdiving=parse("Swimming & Diving","womens-swimming-diving");
  assert.deepEqual(v_womensswimmingdiving.map(line),[
 "Final Oct 9 Women's · UTRGV at Rice Fall Splash | Completed",
 "Final Oct 16 Women's · UTRGV at New Mexico | L, 110-184",
 "Final Oct 17 Women's · UTRGV at New Mexico State | L, 102-193",
 "Upcoming Nov 6 Women's · UTRGV vs Bowling Green | ",
 "Upcoming Nov 19 Women's · UTRGV at UIW Invite | ",
 "Upcoming Nov 19 Women's · UTRGV at NAU Diving Invite | ",
 "Upcoming Dec 16, 12:30 PM Women's · UTRGV at West Florida | ",
 "Upcoming Jan 9, 11:00 AM Women's · UTRGV at Pepperdine | ",
 "Upcoming Jan 22 Women's · UTRGV at North Texas | ",
 "Upcoming Feb 17 Women's · UTRGV at MPSF Swimming Championships | ",
 "Upcoming Feb 17 Women's · UTRGV at MPSF Diving Championships | ",
 "Upcoming Mar 8 Women's · UTRGV at NCAA Zone \"D\" Diving Championships | ",
 "Upcoming Mar 10 Women's · UTRGV at CSCAA National Invite | ",
 "Upcoming Mar 17 Women's · UTRGV at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · UTRGV at Jake Frederick Memorial Islander Open | Completed",
 "Final Sep 25 Women's · UTRGV at Rice Invite | Completed",
 "Final Oct 8 Women's · UTRGV at ITA Texas Regional | Completed",
 "Today Oct 23 Women's · UTRGV at SLC Fall Championship | ",
 "Upcoming Nov 7 Women's · UTRGV at Bobcat Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UTRGV at Jake Frederick Memorial Islander Open | Completed",
 "Final Oct 8 Men's · UTRGV at ITA Texas Regional | Completed",
 "Final Oct 16 Men's · UTRGV at Ralph O'Connor Invitational | Completed",
 "Today Oct 23 Men's · UTRGV at SLC Fall Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UTRGV at West Virginia | L, 1-3",
 "Final Aug 29 UTRGV vs UMBC | L, 0-3",
 "Final Sep 4 UTRGV vs Texas State | W, 3-0",
 "Final Sep 5 UTRGV vs UTEP | L, 2-3",
 "Final Sep 8 UTRGV vs Texas Southern | W, 3-0",
 "Final Sep 10 UTRGV at Texas Tech | L, 1-3",
 "Final Sep 10 UTRGV vs Portland State | L, 0-3",
 "Final Sep 11 UTRGV vs Prairie View A&M | W, 3-0",
 "Final Sep 18 UTRGV at Bradley | L, 2-3",
 "Final Sep 18 UTRGV vs Lindenwood | L, 0-3",
 "Final Sep 19 UTRGV vs New Mexico State | W, 3-2",
 "Final Sep 23 UTRGV at McNeese | W, 3-0",
 "Final Sep 26 UTRGV vs Nicholls | W, 3-0",
 "Final Oct 1 UTRGV vs UIW | W, 3-1",
 "Final Oct 3 UTRGV vs Houston Christian | W, 3-0",
 "Final Oct 8 UTRGV at Northwestern State | W, 3-0",
 "Final Oct 10 UTRGV at East Texas A&M | W, 3-0",
 "Final Oct 15 UTRGV vs Stephen F. Austin | W, 3-1",
 "Final Oct 17 UTRGV vs Lamar | W, 3-0",
 "Final Oct 22 UTRGV at Southeastern | L, 2-3",
 "Today Oct 24, 1:00 PM UTRGV at LSU New Orleans | ",
 "Upcoming Oct 29, 6:30 PM UTRGV at Texas A&M-Corpus Christi | ",
 "Upcoming Oct 31, 12:00 PM UTRGV vs Texas A&M-Corpus Christi | ",
 "Upcoming Nov 5, 6:30 PM UTRGV vs East Texas A&M | ",
 "Upcoming Nov 7, 12:00 PM UTRGV vs Northwestern State | ",
 "Upcoming Nov 12, 6:00 PM UTRGV at UIW | ",
 "Upcoming Nov 14, 1:00 PM UTRGV at Houston Christian | ",
 "Upcoming Nov 20 UTRGV at SLC Tournament Quarterfinals | ",
 "Upcoming Nov 21 UTRGV at SLC Tournament Semifinals | ",
 "Upcoming Nov 22 UTRGV at SLC Tournament Championship | ",
 "Upcoming Dec 3 UTRGV at NCAA First Round | ",
 "Upcoming Dec 5 UTRGV at NCAA Second Round | ",
 "Upcoming Dec 10 UTRGV at NCAA Regional Semifinals | ",
 "Upcoming Dec 12 UTRGV at NCAA Regional Finals | ",
 "Upcoming Dec 17 UTRGV at NCAA Semifinals | ",
 "Upcoming Dec 20 UTRGV at NCAA National Championship | "
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
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimmingdiving,"Swimming & Diving womens-swimming-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UT Rio Grande Valley module checks passed");
