import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {louisianaSchool} from '../src/schools/louisiana.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='louisiana');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,louisianaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/louisiana-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ragincajuns.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['louisiana'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',louisianaSchool.scheduleUrls],['roster',louisianaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('louisiana|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ragincajuns.com',`${key} must stay on ragincajuns.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ragincajuns.com/sports/baseball/schedule"],"roster":["https://ragincajuns.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ragincajuns.com/sports/mens-basketball/schedule","https://ragincajuns.com/sports/womens-basketball/schedule"],"roster":["https://ragincajuns.com/sports/mens-basketball/roster","https://ragincajuns.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ragincajuns.com/sports/cross-country/schedule"],"roster":["https://ragincajuns.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ragincajuns.com/sports/football/schedule"],"roster":["https://ragincajuns.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ragincajuns.com/sports/golf/schedule"],"roster":["https://ragincajuns.com/sports/golf/roster"],"combined":false},"Soccer":{"schedule":["https://ragincajuns.com/sports/womens-soccer/schedule"],"roster":["https://ragincajuns.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ragincajuns.com/sports/softball/schedule"],"roster":["https://ragincajuns.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://ragincajuns.com/sports/womens-tennis/schedule","https://ragincajuns.com/sports/mens-tennis/schedule"],"roster":["https://ragincajuns.com/sports/womens-tennis/roster","https://ragincajuns.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ragincajuns.com/sports/track-and-field/schedule"],"roster":["https://ragincajuns.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ragincajuns.com/sports/womens-volleyball/schedule"],"roster":["https://ragincajuns.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'louisiana|"+sport+"':"),`${sport} routes must live in the Louisiana module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ragincajuns.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.louisianaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=louisiana)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 1 Louisiana at Nicholls (Exhibition) | W, 9-4",
 "Final Oct 16 Louisiana vs Northwestern State (Exhibition) | W, 11-9",
 "Upcoming Oct 24, 1:00 PM Louisiana vs McNeese (Exhibition) | ",
 "Upcoming Oct 30, 5:00 PM Louisiana vs Lamar (Exhibition) | ",
 "Upcoming Mar 5, 3:00 PM Louisiana vs Utah | ",
 "Upcoming Mar 6, 7:00 PM Louisiana vs Texas A&M | ",
 "Upcoming Mar 7, 1:00 PM Louisiana vs UConn | ",
 "Upcoming May 25 Louisiana at SBC Championships | ",
 "Upcoming Jun 4 Louisiana at NCAA Regionals | ",
 "Upcoming Jun 10 Louisiana at NCAA Super Regionals | ",
 "Upcoming Jun 18 Louisiana at College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Louisiana vs Akron | ",
 "Upcoming Nov 6, 7:00 PM Men's · Louisiana vs Texas A&M-Corpus Christi | ",
 "Upcoming Nov 9, 7:00 PM Men's · Louisiana vs Southern-New Orleans | ",
 "Upcoming Nov 14, 7:00 PM Men's · Louisiana at UNCW | ",
 "Upcoming Nov 18, 9:00 PM Men's · Louisiana at San Francisco | ",
 "Upcoming Nov 22, 7:00 PM Men's · Louisiana at USC | ",
 "Upcoming Nov 24, 7:30 PM Men's · Louisiana vs Louisiana Christian | ",
 "Upcoming Nov 28, 3:00 PM Men's · Louisiana vs McNeese | ",
 "Upcoming Dec 2, 7:00 PM Men's · Louisiana vs Houston Christian | ",
 "Upcoming Dec 6, 1:00 PM Men's · Louisiana at Tulane | ",
 "Upcoming Dec 12, 7:00 PM Men's · Louisiana at Oral Roberts | ",
 "Upcoming Dec 16, 7:00 PM Men's · Louisiana vs ULM | ",
 "Upcoming Dec 19, 3:00 PM Men's · Louisiana vs Marshall | ",
 "Upcoming Dec 22, 5:00 PM Men's · Louisiana at LSU | ",
 "Upcoming Dec 31, 2:00 PM Men's · Louisiana at Georgia Southern | ",
 "Upcoming Jan 2, 12:00 PM Men's · Louisiana at Georgia State | ",
 "Upcoming Jan 7, 7:00 PM Men's · Louisiana vs Old Dominion | ",
 "Upcoming Jan 9, 3:00 PM Men's · Louisiana vs James Madison | ",
 "Upcoming Jan 15, 7:00 PM Men's · Louisiana at Coastal Carolina | ",
 "Upcoming Jan 21, 7:30 PM Men's · Louisiana vs South Alabama | ",
 "Upcoming Jan 23, 4:00 PM Men's · Louisiana vs Troy | ",
 "Upcoming Jan 27, 7:00 PM Men's · Louisiana at Arkansas State | ",
 "Upcoming Jan 30, 2:00 PM Men's · Louisiana at Southern Miss | ",
 "Upcoming Feb 3, 7:00 PM Men's · Louisiana vs Louisiana Tech | ",
 "Upcoming Feb 6 Men's · Louisiana at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 6:00 PM Men's · Louisiana at Troy | ",
 "Upcoming Feb 13, 4:00 PM Men's · Louisiana vs Southern Miss | ",
 "Upcoming Feb 17, 7:00 PM Men's · Louisiana vs Arkansas State | ",
 "Upcoming Feb 20, 3:00 PM Men's · Louisiana at South Alabama | ",
 "Upcoming Feb 24, 6:30 PM Men's · Louisiana at Louisiana Tech | ",
 "Upcoming Feb 26, 6:30 PM Men's · Louisiana at ULM | ",
 "Upcoming Mar 2 Men's · Louisiana at Sun Belt Conference Championship Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Today Oct 22, 6:00 PM Women's · Louisiana vs LSU Alexandria (Exhibition) | ",
 "Upcoming Oct 29, 6:00 PM Women's · Louisiana vs Mississippi Christian (Exhibition) | ",
 "Upcoming Nov 3, 6:00 PM Women's · Louisiana vs Xavier (La.) | ",
 "Upcoming Nov 5, 8:00 PM Women's · Louisiana at Texas A&M | ",
 "Upcoming Nov 11, 6:30 PM Women's · Louisiana at East Texas A&M | ",
 "Upcoming Nov 16, 6:30 PM Women's · Louisiana at UTSA | ",
 "Upcoming Nov 19, 6:00 PM Women's · Louisiana vs Tarleton State | ",
 "Upcoming Nov 22, 1:00 PM Women's · Louisiana at Southeastern Louisiana | ",
 "Upcoming Nov 24, 5:00 PM Women's · Louisiana vs Nicholls | ",
 "Upcoming Nov 27, 2:00 PM Women's · Louisiana at Northwestern State | ",
 "Upcoming Nov 29, 4:00 PM Women's · Louisiana vs Jackson State | ",
 "Upcoming Dec 2, 4:15 PM Women's · Louisiana at Morehead State | ",
 "Upcoming Dec 9, 6:30 PM Women's · Louisiana at McNeese | ",
 "Upcoming Dec 13, 2:00 PM Women's · Louisiana at Tulane | ",
 "Upcoming Dec 16, 6:30 PM Women's · Louisiana at Louisiana Tech | ",
 "Upcoming Dec 19, 12:00 PM Women's · Louisiana vs Coastal Carolina | ",
 "Upcoming Dec 29, 6:00 PM Women's · Louisiana vs Dillard | ",
 "Upcoming Dec 31, 2:00 PM Women's · Louisiana vs Georgia Southern | ",
 "Upcoming Jan 2, 1:00 PM Women's · Louisiana vs Georgia State | ",
 "Upcoming Jan 6, 5:30 PM Women's · Louisiana at Old Dominion | ",
 "Upcoming Jan 9, 12:00 PM Women's · Louisiana at Marshall | ",
 "Upcoming Jan 14, 11:00 AM Women's · Louisiana vs ULM | ",
 "Upcoming Jan 16, 2:00 PM Women's · Louisiana vs South Alabama | ",
 "Upcoming Jan 21, 5:00 PM Women's · Louisiana vs Louisiana Tech | ",
 "Upcoming Jan 23, 1:00 PM Women's · Louisiana vs Southern Miss | ",
 "Upcoming Jan 28, 7:00 PM Women's · Louisiana at Arkansas State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Louisiana at ULM | ",
 "Upcoming Feb 6, 1:00 PM Women's · Louisiana at Southern Miss | ",
 "Upcoming Feb 11, 6:00 PM Women's · Louisiana vs Troy | ",
 "Upcoming Feb 13, 1:00 PM Women's · Louisiana vs Arkansas State | ",
 "Upcoming Feb 20, 1:00 PM Women's · Louisiana at James Madison | ",
 "Upcoming Feb 24, 5:00 PM Women's · Louisiana at South Alabama | ",
 "Upcoming Feb 26, 6:00 PM Women's · Louisiana at Troy | ",
 "Upcoming Mar 2 Women's · Louisiana at Sun Belt Conference Championship Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Louisiana at Texas A&M Invitational | Women's team: 6th / Men's team: 10th",
 "Final Sep 26 Louisiana at McNeese Cowboy Stampede | Women's team: 1st / Men's team: 3rd",
 "Final Oct 16 Louisiana at Arturo Barrios Invitational | Women's team: 21st / Men's team: 33rd",
 "Upcoming Oct 30 Louisiana at Sun Belt Conference | ",
 "Upcoming Nov 13 Louisiana at NCAA South Central Regional | ",
 "Upcoming Nov 21 Louisiana at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Louisiana vs Lamar | W, 38-7",
 "Final Sep 12 Louisiana at USC | L, 30-49",
 "Final Sep 19 Louisiana vs UAB | W, 21-14",
 "Final Sep 26 Louisiana at Charlotte | W, 34-7",
 "Final Oct 3 Louisiana vs Arkansas State | W, 23-20",
 "Final Oct 10 Louisiana at Louisiana Tech | L, 31-32",
 "Final Oct 17 Louisiana vs Troy | W, 33-6",
 "Upcoming Oct 24, 4:00 PM Louisiana at Southern Miss | ",
 "Upcoming Nov 7 Louisiana vs South Alabama | ",
 "Upcoming Nov 12, 8:00 PM Louisiana at ULM | ",
 "Upcoming Nov 21 Louisiana vs Coastal Carolina | ",
 "Upcoming Nov 28 Louisiana at Georgia State | ",
 "Upcoming Dec 4, 6:00 PM Louisiana at Credit Union 1 Sun Belt Football Championship presented by Visit Pensacola | "
]);
  const v_golf=parse("Golf","golf");
  assert.deepEqual(v_golf.map(line),[
 "Final Sep 14 Louisiana at Sandestin Collegiate Classic | 4th of 14",
 "Final Sep 21 Louisiana at Highlands Invitational | 9th of 12",
 "Final Sep 27 Louisiana at Argent Financial Classic | T11th of 14",
 "Final Oct 12 Louisiana at Moraine Intercollegiate | Completed",
 "Final Oct 19 Louisiana at The Clerico | 8th of 13",
 "Upcoming Feb 15 Louisiana at Border Olympics | ",
 "Upcoming Mar 8 Louisiana at Louisiana Classics | ",
 "Upcoming Mar 14 Louisiana at The Michael A. Marino Classic | ",
 "Upcoming Mar 30 Louisiana at Maridoe Collegiate | ",
 "Upcoming Apr 10 Louisiana at Aggie Invitational | ",
 "Upcoming Apr 26 Louisiana at SBC Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Louisiana at Southeastern Louisiana | W, 4-1",
 "Final Aug 16 Louisiana vs Ole Miss | L, 1-2",
 "Final Aug 20 Louisiana at East Texas A&M | T, 3-3",
 "Final Aug 23 Louisiana vs Northwestern State | W, 4-1",
 "Final Aug 27 Louisiana vs Nicholls | W, 2-0",
 "Final Aug 30 Louisiana at McNeese | W, 4-1",
 "Final Sep 3 Louisiana at Mississippi State | L, 1-2",
 "Final Sep 10 Louisiana vs Texas State | W, 3-2",
 "Final Sep 15 Louisiana at Southern | W, 5-0",
 "Final Sep 20 Louisiana vs Coastal Carolina | W, 3-2",
 "Final Sep 24 Louisiana at Old Dominion | T, 0-0",
 "Final Sep 27 Louisiana vs Troy | W, 5-0",
 "Final Oct 3 Louisiana at Southern Miss | W, 2-0",
 "Final Oct 8 Louisiana vs South Alabama | L, 0-2",
 "Final Oct 11 Louisiana at Georgia State | L, 0-1",
 "Final Oct 18 Louisiana vs Marshall | T, 1-1",
 "Today Oct 22, 7:00 PM Louisiana at ULM | ",
 "Upcoming Oct 25, 1:00 PM Louisiana vs Louisiana Tech | ",
 "Upcoming Nov 1, 1:00 PM Louisiana at Arkansas State | ",
 "Upcoming Nov 9 Louisiana at SBC Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 27, 6:00 PM Louisiana vs McNeese | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Louisiana at Cowgirl Invite | Completed",
 "Final Sep 25 Women's · Louisiana at Ragin' Cajuns Invitational | Completed",
 "Final Oct 8 Women's · Louisiana at ITA Southern Regionals | Completed",
 "Upcoming Oct 31 Women's · Louisiana at Bulldog Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Louisiana at Sugarcane Classic | Completed",
 "Final Oct 8 Men's · Louisiana at ITA Southern Regionals | Completed",
 "Upcoming Oct 23 Men's · Louisiana at Country Club of Birmingham Invite | ",
 "Upcoming Oct 30 Men's · Louisiana at UWF Fall Fling | ",
 "Upcoming Nov 13 Men's · Louisiana at Samford Hidden Dual | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Louisiana vs Oklahoma | L, 0-3",
 "Final Aug 30 Louisiana at Texas State | L, 0-3",
 "Final Sep 1 Louisiana vs McNeese | W, 3-0",
 "Final Sep 3 Louisiana vs Southeastern Louisiana | W, 3-1",
 "Final Sep 5 Louisiana vs Memphis | L, 2-3",
 "Final Sep 9 Louisiana at Florida State | L, 1-3",
 "Final Sep 10 Louisiana at Florida A&M | L, 2-3",
 "Final Sep 11 Louisiana vs Hampton | W, 3-0",
 "Final Sep 12 Louisiana vs FIU | L, 2-3",
 "Final Sep 15 Louisiana at Southeastern Louisiana | W, 3-1",
 "Final Sep 17 Louisiana vs Mississippi State | L, 0-3",
 "Final Sep 18 Louisiana vs UT Arlington | L, 2-3",
 "Final Sep 19 Louisiana vs Jackson State | W, 3-1",
 "Final Sep 25 Louisiana at Troy | L, 1-3",
 "Final Sep 26 Louisiana at Troy | W, 3-2",
 "Final Oct 1 Louisiana vs Arkansas State | L, 1-3",
 "Final Oct 2 Louisiana vs Arkansas State | W, 3-2",
 "Final Oct 9 Louisiana vs Louisiana Tech | W, 3-0",
 "Final Oct 10 Louisiana vs Louisiana Tech | W, 3-1",
 "Final Oct 16 Louisiana at South Alabama | W, 3-1",
 "Final Oct 17 Louisiana at South Alabama | L, 2-3",
 "Upcoming Oct 23, 5:00 PM Louisiana at App State | ",
 "Upcoming Oct 24, 12:00 PM Louisiana at App State | ",
 "Upcoming Oct 30, 6:00 PM Louisiana vs Southern Miss | ",
 "Upcoming Oct 31, 2:00 PM Louisiana vs Southern Miss | ",
 "Upcoming Nov 6, 6:00 PM Louisiana at ULM | ",
 "Upcoming Nov 7, 1:00 PM Louisiana at ULM | ",
 "Upcoming Nov 13, 6:00 PM Louisiana vs Coastal Carolina | ",
 "Upcoming Nov 14, 2:00 PM Louisiana vs Coastal Carolina | ",
 "Upcoming Nov 19 Louisiana at Sun Belt Conference Championship Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_golf,"Golf golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Louisiana module checks passed");
