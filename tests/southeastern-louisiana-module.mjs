import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southeasternLouisianaSchool} from '../src/schools/southeastern-louisiana.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southeastern-louisiana');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southeasternLouisianaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southeastern-louisiana-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lionsports.net routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southeastern-louisiana'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southeasternLouisianaSchool.scheduleUrls],['roster',southeasternLouisianaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southeastern-louisiana|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lionsports.net',`${key} must stay on lionsports.net`);
  }
}
const parity={"Baseball":{"schedule":["https://lionsports.net/sports/baseball/schedule"],"roster":["https://lionsports.net/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lionsports.net/sports/mens-basketball/schedule","https://lionsports.net/sports/womens-basketball/schedule"],"roster":["https://lionsports.net/sports/mens-basketball/roster","https://lionsports.net/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://lionsports.net/sports/womens-beach-volleyball/schedule"],"roster":["https://lionsports.net/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://lionsports.net/sports/cross-country/schedule"],"roster":["https://lionsports.net/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://lionsports.net/sports/football/schedule"],"roster":["https://lionsports.net/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://lionsports.net/sports/mens-golf/schedule"],"roster":["https://lionsports.net/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://lionsports.net/sports/womens-soccer/schedule"],"roster":["https://lionsports.net/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://lionsports.net/sports/softball/schedule"],"roster":["https://lionsports.net/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://lionsports.net/sports/womens-tennis/schedule"],"roster":["https://lionsports.net/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://lionsports.net/sports/mens-track-and-field/schedule"],"roster":["https://lionsports.net/sports/mens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://lionsports.net/sports/womens-volleyball/schedule"],"roster":["https://lionsports.net/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southeastern-louisiana|"+sport+"':"),`${sport} routes must live in the Southeastern Louisiana module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://lionsports.net/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southeasternLouisianaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southeastern-louisiana)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 24, 12:00 PM Southeastern vs Memphis | ",
 "Upcoming Oct 30, 3:00 PM Southeastern vs Jones College | ",
 "Upcoming Nov 6, 3:00 PM Southeastern vs Southern | ",
 "Upcoming Nov 13 Southeastern at LSU | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 4, 7:00 PM Men's · Southeastern at Auburn | ",
 "Upcoming Nov 7, 7:00 PM Men's · Southeastern at Little Rock | ",
 "Upcoming Nov 10, 7:30 PM Men's · Southeastern at Ole Miss | ",
 "Upcoming Nov 16, 7:30 PM Men's · Southeastern at Texas A&M | ",
 "Upcoming Nov 20, 6:00 PM Men's · Southeastern at Kennesaw State | ",
 "Upcoming Nov 24 Men's · Southeastern at Cancun Challenge | ",
 "Upcoming Dec 1, 6:00 PM Men's · Southeastern at George Washington | ",
 "Upcoming Dec 5, 1:00 PM Men's · Southeastern vs UIW | ",
 "Upcoming Dec 7, 6:00 PM Men's · Southeastern vs HCU | ",
 "Upcoming Dec 10, 9:00 PM Men's · Southeastern at California | ",
 "Upcoming Dec 13, 12:00 AM Men's · Southeastern at Hawaii | ",
 "Upcoming Dec 19, 5:00 PM Men's · Southeastern at East Texas A&M | ",
 "Upcoming Dec 21, 6:30 PM Men's · Southeastern at Northwestern State | ",
 "Upcoming Dec 23, 6:00 PM Men's · Southeastern at Dayton | ",
 "Upcoming Jan 2, 4:30 PM Men's · Southeastern at Stephen F. Austin | ",
 "Upcoming Jan 4, 6:00 PM Men's · Southeastern at Lamar | ",
 "Upcoming Jan 9, 3:30 PM Men's · Southeastern vs McNeese | ",
 "Upcoming Jan 11, 6:30 PM Men's · Southeastern at LSU New Orleans | ",
 "Upcoming Jan 16, 3:30 PM Men's · Southeastern vs Texas A&M-Corpus Christi | ",
 "Upcoming Jan 18, 6:00 PM Men's · Southeastern vs UTRGV | ",
 "Upcoming Jan 23, 3:30 PM Men's · Southeastern vs Lamar | ",
 "Upcoming Jan 26, 6:00 PM Men's · Southeastern vs Stephen F. Austin | ",
 "Upcoming Jan 30, 4:00 PM Men's · Southeastern at McNeese | ",
 "Upcoming Feb 1, 6:00 PM Men's · Southeastern vs Nicholls | ",
 "Upcoming Feb 6, 3:30 PM Men's · Southeastern at HCU | ",
 "Upcoming Feb 8, 5:00 PM Men's · Southeastern at UIW | ",
 "Upcoming Feb 13, 3:30 PM Men's · Southeastern vs Northwestern State | ",
 "Upcoming Feb 15, 6:00 PM Men's · Southeastern vs East Texas A&M | ",
 "Upcoming Feb 20, 4:30 PM Men's · Southeastern at UTRGV | ",
 "Upcoming Feb 22, 7:00 PM Men's · Southeastern at Texas A&M-Corpus Christi | ",
 "Upcoming Feb 27, 3:30 PM Men's · Southeastern vs LSU New Orleans | ",
 "Upcoming Mar 1, 6:30 PM Men's · Southeastern at Nicholls | ",
 "Upcoming Mar 7 Men's · Southeastern at Southland Conference Men's Basketball Championship Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:00 PM Women's · Southeastern vs Southern-New Orleans (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Southeastern at LSU | ",
 "Upcoming Nov 5, 11:00 AM Women's · Southeastern vs Arkansas Monticello | ",
 "Upcoming Nov 12, 6:30 PM Women's · Southeastern at TCU | ",
 "Upcoming Nov 15 Women's · Southeastern at Texas Tech | ",
 "Upcoming Nov 18, 6:00 PM Women's · Southeastern at Grambling | ",
 "Upcoming Nov 22, 1:00 PM Women's · Southeastern vs UL Lafayette | ",
 "Upcoming Nov 25, 7:00 PM Women's · Southeastern at Texas | ",
 "Upcoming Dec 3, 6:00 PM Women's · Southeastern vs HCU | ",
 "Upcoming Dec 5, 11:00 AM Women's · Southeastern vs UIW | ",
 "Upcoming Dec 9, 7:00 PM Women's · Southeastern at Tulane | ",
 "Upcoming Dec 14, 6:00 PM Women's · Southeastern vs Alabama State | ",
 "Upcoming Dec 17, 6:00 PM Women's · Southeastern vs Northwestern State | ",
 "Upcoming Dec 19, 2:30 PM Women's · Southeastern at East Texas A&M | ",
 "Upcoming Dec 28, 6:00 PM Women's · Southeastern vs Louisiana Christian | ",
 "Upcoming Dec 31, 3:00 PM Women's · Southeastern at Lamar | ",
 "Upcoming Jan 2, 2:00 PM Women's · Southeastern at Stephen F. Austin | ",
 "Upcoming Jan 7, 6:00 PM Women's · Southeastern vs McNeese | ",
 "Upcoming Jan 9, 2:00 PM Women's · Southeastern at LSU New Orleans | ",
 "Upcoming Jan 14, 6:00 PM Women's · Southeastern vs UTRGV | ",
 "Upcoming Jan 16, 1:00 PM Women's · Southeastern vs Texas A&M-Corpus Christi | ",
 "Upcoming Jan 21, 6:00 PM Women's · Southeastern vs Stephen F. Austin | ",
 "Upcoming Jan 23, 1:00 PM Women's · Southeastern vs Lamar | ",
 "Upcoming Jan 28, 6:30 PM Women's · Southeastern at Nicholls | ",
 "Upcoming Jan 30, 1:00 PM Women's · Southeastern at McNeese | ",
 "Upcoming Feb 4, 6:00 PM Women's · Southeastern at UIW | ",
 "Upcoming Feb 6, 1:00 PM Women's · Southeastern at HCU | ",
 "Upcoming Feb 11, 6:00 PM Women's · Southeastern vs East Texas A&M | ",
 "Upcoming Feb 18, 7:00 PM Women's · Southeastern at Texas A&M-Corpus Christi | ",
 "Upcoming Feb 20, 2:00 PM Women's · Southeastern at UTRGV | ",
 "Upcoming Feb 25, 6:00 PM Women's · Southeastern vs Nicholls | ",
 "Upcoming Feb 27, 1:00 PM Women's · Southeastern vs LSU New Orleans | ",
 "Upcoming Mar 1, 5:30 PM Women's · Southeastern at Northwestern State | ",
 "Upcoming Mar 8 Women's · Southeastern at Southland Conference Women's Basketball Championship Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 10 Southeastern at Coconut Beach Pairs Qualifier | Completed",
 "Upcoming Oct 23 Southeastern vs LSU New Orleans (Exhibition) | ",
 "Upcoming Nov 1 Southeastern at LSU | ",
 "Upcoming Nov 6 Southeastern at Gulf Shores Pairs Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Southeastern at Battle for New Orleans | Women's team: 8th / Men's team: 6th",
 "Final Sep 25 Southeastern at Azalea City Classic | Women's team: 5th / Men's team: 3rd",
 "Final Oct 16 Southeastern at Watson Collegiate Classic | Women's team: 20th / Men's team: 13th",
 "Upcoming Oct 30 Southeastern at Southland Conference Championships | ",
 "Upcoming Nov 13 Southeastern at NCAA Division I South-Central Region Championships | ",
 "Upcoming Nov 21 Southeastern at NCAA Cross Country National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Southeastern vs HCU | L, 28-34",
 "Final Sep 5 Southeastern at South Alabama | L, 14-39",
 "Final Sep 12 Southeastern vs North Alabama | W, 30-25",
 "Final Sep 19 Southeastern at ULM | W, 38-35",
 "Final Sep 26 Southeastern at Northwestern State | W, 52-21",
 "Final Oct 10 Southeastern at UTRGV | L, 3-13",
 "Final Oct 17 Southeastern vs Lamar | W, 34-31",
 "Today Oct 24, 5:00 PM Southeastern at Stephen F. Austin | ",
 "Upcoming Oct 31, 3:00 PM Southeastern at East Texas A&M | ",
 "Upcoming Nov 7, 6:00 PM Southeastern vs UIW | ",
 "Upcoming Nov 14, 6:00 PM Southeastern vs McNeese | ",
 "Upcoming Nov 19, 6:00 PM Southeastern at Nicholls | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Southeastern at Grover Page Classic | 7th of 10",
 "Final Sep 20 Southeastern at GMAC Invitational | 11th of 13",
 "Final Oct 12 Southeastern at Bubba Barnett Intercollegiate | 8th of 17",
 "Final Oct 19 Southeastern at LaTour Intercollegiate | 2nd of 9",
 "Upcoming Feb 23, 7:30 AM Southeastern at Big Easy Match Play | ",
 "Upcoming Mar 1 Southeastern at Colin Montgomerie Invitational | ",
 "Upcoming Mar 22 Southeastern at Skyhawk Invitational | ",
 "Upcoming Apr 5 Southeastern at Racer Intercollegiate | ",
 "Upcoming Apr 12 Southeastern at Austin Peay Intercollegiate | ",
 "Upcoming Apr 26 Southeastern at Southland Conference Golf Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Southeastern vs UL Lafayette | L, 1-4",
 "Final Aug 16 Southeastern at Louisiana Tech | W, 5-1",
 "Final Aug 20 Southeastern vs Troy | W, 1-0",
 "Final Aug 23 Southeastern vs Spring Hill | W, 3-0",
 "Final Aug 27 Southeastern at Southern Miss | T, 2-2",
 "Final Sep 3 Southeastern at Southern | W, 3-1",
 "Final Sep 6 Southeastern at South Alabama | L, 1-3",
 "Final Sep 11 Southeastern vs West Florida | L, 0-2",
 "Final Sep 17 Southeastern vs McNeese | W, 2-1",
 "Final Sep 24 Southeastern at East Texas A&M | L, 0-3",
 "Final Sep 27 Southeastern vs UIW | L, 1-2",
 "Final Oct 1 Southeastern at Texas A&M-Corpus Christi | L, 0-1",
 "Final Oct 8 Southeastern at HCU | T, 1-1",
 "Final Oct 11 Southeastern vs UTRGV | W, 1-0",
 "Final Oct 15 Southeastern at Stephen F. Austin | W, 1-0",
 "Final Oct 22 Southeastern vs Northwestern State | W, 1-0",
 "Upcoming Oct 25, 5:00 PM Southeastern vs Lamar | ",
 "Upcoming Nov 5, 7:00 PM Southeastern at Nicholls | ",
 "Upcoming Nov 10 Southeastern at Southland Conference Soccer Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 1 Southeastern vs Pearl River CC | ",
 "Upcoming Oct 7 Southeastern vs Jones College | ",
 "Upcoming Oct 16 Southeastern vs East Central CC | ",
 "Upcoming Oct 21 Southeastern vs Copiah-Lincoln CC | ",
 "Upcoming Oct 23 Southeastern vs Baton Rouge CC | ",
 "Upcoming Oct 28, 5:00 PM Southeastern vs LSU Eunice | ",
 "Upcoming Oct 30, 5:00 PM Southeastern vs Mississippi Gulf Coast CC | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Today Oct 23 Southeastern at Southland Conference Tennis Masters | ",
 "Upcoming Oct 30 Southeastern at George E. Fourmaux Fed Cup Invitational | ",
 "Upcoming Jan 29 Southeastern vs UL Lafayette | ",
 "Upcoming Feb 5 Southeastern vs Grambling | ",
 "Upcoming Feb 6 Southeastern vs Louisiana Christian | ",
 "Upcoming Feb 9 Southeastern vs Dillard | ",
 "Upcoming Feb 19 Southeastern at LSUA | ",
 "Upcoming Feb 25 Southeastern vs Jackson State | ",
 "Upcoming Feb 26 Southeastern at Alcorn State | ",
 "Upcoming Feb 27 Southeastern vs Mississippi Valley State | ",
 "Upcoming Feb 28 Southeastern at Copiah-Lincoln CC | ",
 "Upcoming Mar 6 Southeastern vs UIW | ",
 "Upcoming Mar 8 Southeastern vs Lamar | ",
 "Upcoming Mar 9 Southeastern at Southern | ",
 "Upcoming Mar 11 Southeastern vs Presbyterian | ",
 "Upcoming Mar 13 Southeastern vs McNeese | ",
 "Upcoming Mar 19 Southeastern at Tulane | ",
 "Upcoming Mar 27 Southeastern at UTRGV | ",
 "Upcoming Mar 29 Southeastern at Texas A&M-Corpus Christi | ",
 "Upcoming Apr 3 Southeastern at Stephen F. Austin | ",
 "Upcoming Apr 5 Southeastern at Northwestern State | ",
 "Upcoming Apr 10 Southeastern vs LSU New Orleans | ",
 "Upcoming Apr 12 Southeastern vs Nicholls | ",
 "Upcoming Apr 22 Southeastern at Southland Conference Tennis Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 13 Southeastern vs Xavier (La.) | W, 3-0",
 "Final Aug 19 Southeastern vs Tulane | L, 2-3",
 "Final Aug 28 Southeastern at Ole Miss | L, 2-3",
 "Final Aug 29 Southeastern vs LMU | L, 0-3",
 "Final Aug 30 Southeastern vs Northern Arizona | L, 1-3",
 "Final Sep 3 Southeastern vs UL Lafayette | L, 1-3",
 "Final Sep 4 Southeastern vs Memphis | W, 3-1",
 "Final Sep 8 Southeastern vs Southern | L, 1-3",
 "Final Sep 11 Southeastern vs Texas Southern | W, 3-0",
 "Final Sep 11 Southeastern vs Charlotte | W, 3-1",
 "Final Sep 13 Southeastern vs LSU | L, 0-3",
 "Final Sep 15 Southeastern vs UL Lafayette | L, 1-3",
 "Final Sep 18 Southeastern vs UC Irvine | L, 1-3",
 "Final Sep 18 Southeastern at UNLV | L, 0-3",
 "Final Sep 19 Southeastern vs UC San Diego | L, 0-3",
 "Final Sep 24 Southeastern at Stephen F. Austin | L, 0-3",
 "Final Sep 26 Southeastern at Lamar | W, 3-2",
 "Final Oct 1 Southeastern at Northwestern State | W, 3-2",
 "Final Oct 3 Southeastern at East Texas A&M | W, 3-0",
 "Final Oct 8 Southeastern vs McNeese | W, 3-1",
 "Final Oct 10 Southeastern vs Nicholls | W, 3-0",
 "Final Oct 14 Southeastern at UIW | W, 3-2",
 "Final Oct 17 Southeastern vs HCU | W, 3-1",
 "Final Oct 22 Southeastern vs UTRGV | W, 3-2",
 "Today Oct 24, 12:00 PM Southeastern vs Texas A&M-Corpus Christi | ",
 "Upcoming Oct 29, 6:00 PM Southeastern at McNeese | ",
 "Upcoming Oct 31, 1:00 PM Southeastern at Nicholls | ",
 "Upcoming Nov 3, 6:30 PM Southeastern vs LSU New Orleans | ",
 "Upcoming Nov 5, 6:30 PM Southeastern at LSU New Orleans | ",
 "Upcoming Nov 12, 6:30 PM Southeastern vs Stephen F. Austin | ",
 "Upcoming Nov 14, 12:00 PM Southeastern vs Lamar | ",
 "Upcoming Nov 20 Southeastern at Southland Conference Volleyball Championship Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southeastern Louisiana module checks passed");
