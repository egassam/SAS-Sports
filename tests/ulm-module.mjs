import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ulmSchool} from '../src/schools/ulm.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ulm');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ulmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ulm-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ulmwarhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ulm'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',ulmSchool.scheduleUrls],['roster',ulmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ulm|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ulmwarhawks.com',`${key} must stay on ulmwarhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ulmwarhawks.com/sports/baseball/schedule"],"roster":["https://ulmwarhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ulmwarhawks.com/sports/mens-basketball/schedule","https://ulmwarhawks.com/sports/womens-basketball/schedule"],"roster":["https://ulmwarhawks.com/sports/mens-basketball/roster","https://ulmwarhawks.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://ulmwarhawks.com/"],"roster":["https://ulmwarhawks.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://ulmwarhawks.com/sports/cross-country/schedule"],"roster":["https://ulmwarhawks.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ulmwarhawks.com/sports/football/schedule"],"roster":["https://ulmwarhawks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ulmwarhawks.com/sports/womens-golf/schedule","https://ulmwarhawks.com/sports/mens-golf/schedule"],"roster":["https://ulmwarhawks.com/sports/womens-golf/roster","https://ulmwarhawks.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://ulmwarhawks.com/sports/womens-soccer/schedule"],"roster":["https://ulmwarhawks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ulmwarhawks.com/sports/softball/schedule"],"roster":["https://ulmwarhawks.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://ulmwarhawks.com/sports/track-and-field/schedule"],"roster":["https://ulmwarhawks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ulmwarhawks.com/sports/womens-volleyball/schedule"],"roster":["https://ulmwarhawks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ulm|"+sport+"':"),`${sport} routes must live in the ULM module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ulmwarhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ulmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ulm)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Men's · ULM vs Centenary | ",
 "Upcoming Nov 2, 6:30 PM Men's · ULM vs Central Michigan | ",
 "Upcoming Nov 4, 6:30 PM Men's · ULM vs Champion Christian | ",
 "Upcoming Nov 9 Men's · ULM at Texas A&M | ",
 "Upcoming Nov 10 Men's · ULM at TCU | ",
 "Upcoming Nov 13 Men's · ULM at Arizona State | ",
 "Upcoming Nov 14 Men's · ULM at Grand Canyon | ",
 "Upcoming Nov 16, 7:30 PM Men's · ULM vs Dallas Christian | ",
 "Upcoming Nov 18 Men's · ULM at LSU | ",
 "Upcoming Nov 24, 6:30 PM Men's · ULM vs HCU | ",
 "Upcoming Nov 29 Men's · ULM at Tulane | ",
 "Upcoming Dec 2 Men's · ULM at Lamar | ",
 "Upcoming Dec 5, 1:00 PM Men's · ULM vs Georgia State | ",
 "Upcoming Dec 12 Men's · ULM vs Ole Miss | ",
 "Upcoming Dec 16 Men's · ULM at Ragin' Cajuns | ",
 "Upcoming Dec 28 Men's · ULM at Oklahoma | ",
 "Upcoming Dec 31 Men's · ULM at Old Dominion | ",
 "Upcoming Jan 2 Men's · ULM at Coastal Carolina | ",
 "Upcoming Jan 7, 6:30 PM Men's · ULM vs Marshall | ",
 "Upcoming Jan 9, 2:00 PM Men's · ULM vs App State | ",
 "Upcoming Jan 14, 6:30 PM Men's · ULM vs South Alabama | ",
 "Upcoming Jan 16 Men's · ULM at Troy | ",
 "Upcoming Jan 20 Men's · ULM at Southern Miss | ",
 "Upcoming Jan 23, 2:30 PM Men's · ULM vs Louisiana Tech | ",
 "Upcoming Jan 30 Men's · ULM at James Madison | ",
 "Upcoming Feb 3, 6:30 PM Men's · ULM vs Troy | ",
 "Upcoming Feb 6 Men's · ULM at MAC/SBC Challenge | ",
 "Upcoming Feb 10 Men's · ULM at Arkansas State | ",
 "Upcoming Feb 13 Men's · ULM at Louisiana Tech | ",
 "Upcoming Feb 17, 6:30 PM Men's · ULM vs Southern Miss | ",
 "Upcoming Feb 20, 2:30 PM Men's · ULM vs Arkansas State | ",
 "Upcoming Feb 24 Men's · ULM at South Alabama | ",
 "Upcoming Feb 26, 6:30 PM Men's · ULM vs Ragin' Cajuns | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · ULM at Ohio | ",
 "Upcoming Nov 5, 6:30 PM Women's · ULM vs Centenary | ",
 "Upcoming Nov 9, 6:30 PM Women's · ULM vs Central Arkansas | ",
 "Upcoming Nov 16, 5:00 PM Women's · ULM vs Arkansas - Pine Bluff | ",
 "Upcoming Nov 19, 6:30 PM Women's · ULM vs Sam Houston | ",
 "Upcoming Nov 24 Women's · ULM at Alabama | ",
 "Upcoming Nov 27, 5:00 PM Women's · ULM vs Fresno State | ",
 "Upcoming Nov 28, 5:00 PM Women's · ULM vs Purdue Fort Wayne | ",
 "Upcoming Dec 3, 6:30 PM Women's · ULM vs Mississippi Valley State | ",
 "Upcoming Dec 6 Women's · ULM at Ole Miss | ",
 "Upcoming Dec 10, 11:00 AM Women's · ULM vs Central Baptist | ",
 "Upcoming Dec 16 Women's · ULM at Troy | ",
 "Upcoming Dec 19, 2:00 PM Women's · ULM vs James Madison | ",
 "Upcoming Dec 21 Women's · ULM at Oklahoma | ",
 "Upcoming Dec 28 Women's · ULM at Arkansas | ",
 "Upcoming Dec 31, 6:30 PM Women's · ULM vs Old Dominion | ",
 "Upcoming Jan 2 Women's · ULM vs Coastal Carolina | ",
 "Upcoming Jan 7 Women's · ULM at App State | ",
 "Upcoming Jan 9 Women's · ULM at Georgia State | ",
 "Upcoming Jan 14, 11:00 AM Women's · ULM at Ragin' Cajuns | ",
 "Upcoming Jan 16 Women's · ULM at Southern Miss | ",
 "Upcoming Jan 21, 6:30 PM Women's · ULM vs Arkansas State | ",
 "Upcoming Jan 23 Women's · ULM vs Louisiana Tech | ",
 "Upcoming Jan 28, 6:30 PM Women's · ULM vs Troy | ",
 "Upcoming Jan 30, 2:00 PM Women's · ULM vs Ragin' Cajuns | ",
 "Upcoming Feb 3 Women's · ULM at Louisiana Tech | ",
 "Upcoming Feb 6, 2:00 PM Women's · ULM vs MAC-SBC Challenge | ",
 "Upcoming Feb 13 Women's · ULM at Marshall | ",
 "Upcoming Feb 18, 6:30 PM Women's · ULM vs South Alabama | ",
 "Upcoming Feb 20 Women's · ULM vs Southern Miss | ",
 "Upcoming Feb 23 Women's · ULM at Arkansas State | ",
 "Upcoming Feb 26 Women's · ULM at South Alabama | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 ULM at Mississippi Christian Opener | Women's team: 1st / Men's team: 2nd",
 "Final Sep 18 ULM at Southern Showcase | Women's team: 18th / Men's team: 21st",
 "Final Sep 25 ULM at Warhawk Invitational | Women's team: 1st / Men's team: 1st",
 "Final Oct 16 ULM at Arturo Barrios Invitational | Women's team: 41st / Men's team: 25th",
 "Upcoming Oct 30 ULM at Sun Belt Conference Championships | ",
 "Upcoming Nov 13 ULM at NCAA South Central Regional | ",
 "Upcoming Nov 22 ULM at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 ULM at Mississippi State | L, 13-62",
 "Final Sep 12 ULM at UAB | L, 20-26",
 "Final Sep 19 ULM vs Southeastern | L, 35-38",
 "Final Sep 26 ULM vs FAU | L, 17-45",
 "Final Oct 3 ULM at South Alabama | L, 35-52",
 "Final Oct 17 ULM vs Louisiana Tech | L, 0-24",
 "Upcoming Oct 24, 3:00 PM ULM at Troy | ",
 "Upcoming Oct 31, 2:30 PM ULM vs Southern Miss | ",
 "Upcoming Nov 7, 2:00 PM ULM at Arkansas State | ",
 "Upcoming Nov 12, 8:00 PM ULM vs Ragin' Cajuns | ",
 "Upcoming Nov 21 ULM at App State | ",
 "Upcoming Nov 28 ULM vs Marshall | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · ULM at The Bruzzy | 11th of 11",
 "Final Sep 14 Women's · ULM at Leadership & Golf Invitational | 15th of 17",
 "Final Sep 21 Women's · ULM at Golfweek Colorado | 19th of 20",
 "Final Oct 5 Women's · ULM at The Ally | T12th of 17",
 "Final Oct 18 Women's · ULM at Diamante Intercollegiate | T5th of 20",
 "Upcoming Feb 1 Women's · ULM at UCF Challenge | ",
 "Upcoming Mar 8 Women's · ULM at Lady Bison Invitational | ",
 "Upcoming Mar 22 Women's · ULM at Charles Schwab Invitational | ",
 "Upcoming Mar 29 Women's · ULM at ULM Invitational | ",
 "Upcoming Apr 5 Women's · ULM at \"Mo\" Morial Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · ULM at Bombs Darts Birds Collegiate | 11th of 13",
 "Final Sep 14 Men's · ULM at Sandestin Collegiate Classic | 5th of 14",
 "Final Sep 27 Men's · ULM at Argent Financial Classic | 7th of 14",
 "Final Oct 5 Men's · ULM at West Bay Collegiate Invitational | T3rd of 15",
 "Upcoming Feb 7 Men's · ULM at Compadres Collegiate | ",
 "Upcoming Feb 21 Men's · ULM at Military City Collegiate | ",
 "Upcoming Mar 15 Men's · ULM at All-American Intercollegiate | ",
 "Upcoming Mar 30 Men's · ULM at Maridoe Intercollegiate | ",
 "Upcoming Apr 5 Men's · ULM at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · ULM at Everett Buick GMC | ",
 "Upcoming Apr 26 Men's · ULM at Sun Belt Conference Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 ULM at Little Rock | T, 1-1",
 "Final Aug 16 ULM vs Alcorn State | W, 6-1",
 "Final Aug 20 ULM at North Texas | L, 0-1",
 "Final Aug 23 ULM vs Jackson State | W, 5-1",
 "Final Aug 27 ULM at Grambling State | L, 0-2",
 "Final Aug 30 ULM at Ole Miss | L, 0-2",
 "Final Sep 3 ULM vs Stephen F. Austin | W, 2-0",
 "Final Sep 6 ULM vs UAB | L, 1-2",
 "Final Sep 10 ULM at Rice | L, 0-3",
 "Final Sep 18 ULM vs Old Dominion | L, 0-1",
 "Final Sep 24 ULM at James Madison | L, 0-1",
 "Final Sep 27 ULM vs Arkansas State | L, 2-3",
 "Final Oct 4 ULM at Louisiana Tech | L, 2-3",
 "Final Oct 8 ULM vs Georgia State | W, 2-1",
 "Final Oct 11 ULM at Marshall | L, 0-1",
 "Final Oct 17 ULM at Troy | T, 1-1",
 "Today Oct 22, 7:00 PM ULM vs Ragin' Cajuns | ",
 "Upcoming Oct 25, 1:00 PM ULM at South Alabama | ",
 "Upcoming Nov 1, 1:00 PM ULM vs Southern Miss | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 ULM vs Southern Illinois | L, 1-3",
 "Final Aug 29 ULM vs Texas Southern | W, 3-0",
 "Final Aug 30 ULM at East Texas A&M | L, 2-3",
 "Final Sep 1 ULM vs Northwestern State | W, 3-0",
 "Final Sep 4 ULM at Grand Canyon | L, 0-3",
 "Final Sep 5 ULM vs Temple | L, 0-3",
 "Final Sep 6 ULM vs San Francisco | L, 0-3",
 "Final Sep 10 ULM vs McNeese | W, 3-1",
 "Final Sep 11 ULM vs Northwestern State | L, 1-3",
 "Final Sep 12 ULM vs Mississippi Valley State | W, 3-1",
 "Final Sep 18 ULM vs Sam Houston | L, 1-3",
 "Final Sep 18 ULM at Lamar | W, 3-0",
 "Final Sep 19 ULM vs North Dakota | L, 1-3",
 "Final Sep 24 ULM at Arkansas State | L, 0-3",
 "Final Sep 25 ULM at Arkansas State | L, 0-3",
 "Final Oct 2 ULM vs Marshall | L, 1-3",
 "Final Oct 3 ULM vs Marshall | W, 3-2",
 "Final Oct 5 ULM at Arkansas - Pine Bluff | W, 3-0",
 "Final Oct 9 ULM at Troy | L, 1-3",
 "Final Oct 10 ULM at Troy | L, 0-3",
 "Final Oct 15 ULM vs Southern Miss | L, 0-3",
 "Final Oct 16 ULM vs Southern Miss | L, 1-3",
 "Upcoming Oct 23, 6:00 PM ULM vs Louisiana Tech | ",
 "Upcoming Oct 24, 1:00 PM ULM vs Louisiana Tech | ",
 "Upcoming Oct 29, 6:00 PM ULM at South Alabama | ",
 "Upcoming Oct 30, 6:00 PM ULM at South Alabama | ",
 "Upcoming Nov 6, 6:00 PM ULM vs Ragin' Cajuns | ",
 "Upcoming Nov 7, 1:00 PM ULM vs Ragin' Cajuns | ",
 "Upcoming Nov 13, 5:00 PM ULM at Old Dominion | ",
 "Upcoming Nov 14, 1:00 PM ULM at Old Dominion | "
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
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("ULM module checks passed");
