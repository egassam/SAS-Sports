import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southeastMissouriSchool} from '../src/schools/southeast-missouri.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southeast-missouri');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southeastMissouriHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southeast-missouri-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit semoredhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southeast-missouri'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southeastMissouriSchool.scheduleUrls],['roster',southeastMissouriSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southeast-missouri|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'semoredhawks.com',`${key} must stay on semoredhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://semoredhawks.com/sports/baseball/schedule"],"roster":["https://semoredhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://semoredhawks.com/sports/mens-basketball/schedule","https://semoredhawks.com/sports/womens-basketball/schedule"],"roster":["https://semoredhawks.com/sports/mens-basketball/roster","https://semoredhawks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://semoredhawks.com/sports/cross-country/schedule"],"roster":["https://semoredhawks.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://semoredhawks.com/sports/football/schedule"],"roster":["https://semoredhawks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://semoredhawks.com/sports/mens-golf/schedule"],"roster":["https://semoredhawks.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://semoredhawks.com/sports/womens-gymnastics/schedule"],"roster":["https://semoredhawks.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://semoredhawks.com/sports/womens-soccer/schedule"],"roster":["https://semoredhawks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://semoredhawks.com/sports/softball/schedule"],"roster":["https://semoredhawks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://semoredhawks.com/sports/womens-tennis/schedule"],"roster":["https://semoredhawks.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://semoredhawks.com/sports/track-and-field/schedule"],"roster":["https://semoredhawks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://semoredhawks.com/sports/womens-volleyball/schedule"],"roster":["https://semoredhawks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southeast-missouri|"+sport+"':"),`${sport} routes must live in the Southeast Missouri module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://semoredhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southeastMissouriHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southeast-missouri)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 2:00 PM SEMO vs Central Missouri | ",
 "Upcoming Oct 24, 6:00 PM SEMO at Missouri | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · SEMO at Evansville (Exhibition) | W, 89-81",
 "Upcoming Nov 2, 6:30 PM Men's · SEMO vs Lipscomb | ",
 "Upcoming Nov 4, 6:30 PM Men's · SEMO vs Webster | ",
 "Upcoming Nov 8, 12:00 PM Men's · SEMO at South Carolina | ",
 "Upcoming Nov 13, 6:30 PM Men's · SEMO at Middle Tennessee | ",
 "Upcoming Nov 16, 6:30 PM Men's · SEMO vs Midway | ",
 "Upcoming Nov 19, 7:00 PM Men's · SEMO at St. Thomas | ",
 "Upcoming Nov 24, 6:30 PM Men's · SEMO vs Purdue Fort Wayne | ",
 "Upcoming Nov 28, 2:00 PM Men's · SEMO at Kansas City | ",
 "Upcoming Nov 30, 6:30 PM Men's · SEMO at Wichita State | ",
 "Upcoming Dec 3, 6:30 PM Men's · SEMO vs Mission | ",
 "Upcoming Dec 6, 1:00 PM Men's · SEMO at Saint Louis | ",
 "Upcoming Dec 9, 7:00 PM Men's · SEMO at Southern Illinois | ",
 "Upcoming Dec 12, 3:30 PM Men's · SEMO vs Kansas City | ",
 "Upcoming Dec 19, 4:00 PM Men's · SEMO at Lipscomb | ",
 "Upcoming Dec 22, 11:00 AM Men's · SEMO vs Saint Mary of the Woods | ",
 "Upcoming Dec 31, 3:30 PM Men's · SEMO at Eastern Illinois | ",
 "Upcoming Jan 2, 3:30 PM Men's · SEMO vs Southern Indiana | ",
 "Upcoming Jan 7, 8:00 PM Men's · SEMO at UT Martin | ",
 "Upcoming Jan 9, 3:30 PM Men's · SEMO vs Western Illinois | ",
 "Upcoming Jan 14, 7:30 PM Men's · SEMO at Lindenwood | ",
 "Upcoming Jan 16, 3:30 PM Men's · SEMO at SIU Edwardsville | ",
 "Upcoming Jan 21, 7:30 PM Men's · SEMO vs Eastern Illinois | ",
 "Upcoming Jan 23, 3:30 PM Men's · SEMO vs Tennessee State | ",
 "Upcoming Jan 28, 7:30 PM Men's · SEMO at Western Illinois | ",
 "Upcoming Feb 4, 6:45 PM Men's · SEMO at Morehead State | ",
 "Upcoming Feb 6, 7:30 PM Men's · SEMO at Southern Indiana | ",
 "Upcoming Feb 11, 7:30 PM Men's · SEMO vs UT Martin | ",
 "Upcoming Feb 13, 3:30 PM Men's · SEMO vs SIU Edwardsville | ",
 "Upcoming Feb 17, 6:30 PM Men's · SEMO vs Lindenwood | ",
 "Upcoming Feb 25, 7:30 PM Men's · SEMO vs Morehead State | ",
 "Upcoming Feb 27, 3:30 PM Men's · SEMO at Tennessee State | ",
 "Upcoming Mar 3 Men's · SEMO at OVC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · SEMO at Missouri State | ",
 "Upcoming Nov 5, 11:00 AM Women's · SEMO vs Miami (OH) | ",
 "Upcoming Nov 10, 6:00 PM Women's · SEMO at Purdue | ",
 "Upcoming Nov 13, 7:00 PM Women's · SEMO at Kansas City | ",
 "Upcoming Nov 15, 2:00 PM Women's · SEMO at Illinois | ",
 "Upcoming Nov 17, 6:30 PM Women's · SEMO vs Hannibal-LaGrange | ",
 "Upcoming Nov 19, 6:30 PM Women's · SEMO vs Indiana State | ",
 "Upcoming Nov 21, 6:00 PM Women's · SEMO at Saint Louis | ",
 "Upcoming Nov 24, 6:00 PM Women's · SEMO at Evansville | ",
 "Upcoming Nov 27, 2:00 PM Women's · SEMO vs Missouri Valley | ",
 "Upcoming Nov 29, 2:00 PM Women's · SEMO vs Texas | ",
 "Upcoming Dec 1, 6:30 PM Women's · SEMO vs Southern Illinois | ",
 "Upcoming Dec 7, 8:00 PM Women's · SEMO at Grand Canyon | ",
 "Upcoming Dec 9, 1:00 PM Women's · SEMO at Arizona | ",
 "Upcoming Dec 12, 1:00 PM Women's · SEMO vs Purdue Fort Wayne | ",
 "Upcoming Dec 21, 1:00 PM Women's · SEMO at Central Arkansas | ",
 "Upcoming Dec 31, 1:00 PM Women's · SEMO at Eastern Illinois | ",
 "Upcoming Jan 2, 1:00 PM Women's · SEMO vs Southern Indiana | ",
 "Upcoming Jan 7, 5:30 PM Women's · SEMO at UT Martin | ",
 "Upcoming Jan 9, 1:00 PM Women's · SEMO vs Western Illinois | ",
 "Upcoming Jan 14, 5:00 PM Women's · SEMO at Lindenwood | ",
 "Upcoming Jan 16, 1:00 PM Women's · SEMO at SIUE | ",
 "Upcoming Jan 21, 5:00 PM Women's · SEMO vs Eastern Illinois | ",
 "Upcoming Jan 23, 1:00 PM Women's · SEMO vs Tennessee State | ",
 "Upcoming Jan 28, 5:00 PM Women's · SEMO at Western Illinois | ",
 "Upcoming Feb 4, 4:15 PM Women's · SEMO at Morehead State | ",
 "Upcoming Feb 6, 5:00 PM Women's · SEMO at Southern Indiana | ",
 "Upcoming Feb 11, 5:00 PM Women's · SEMO vs UT Martin | ",
 "Upcoming Feb 13, 1:00 PM Women's · SEMO vs SIUE | ",
 "Upcoming Feb 18, 6:30 PM Women's · SEMO vs Lindenwood | ",
 "Upcoming Feb 25, 5:00 PM Women's · SEMO vs Morehead State | ",
 "Upcoming Feb 27, 1:00 PM Women's · SEMO at Tennessee State | ",
 "Upcoming Mar 3 Women's · SEMO at OVC Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 SEMO at Redhawks Invite | Women's team: 1st / Men's team: 1st",
 "Final Sep 18 SEMO at OVC Conference Preview | Women's team: 1st / Men's team: 2nd",
 "Final Oct 2 SEMO at Nike XC Town Twilight | Women's team: 4th / Men's team: 5th",
 "Final Oct 16 SEMO at Bradley Pink Classic | Women's team: 12th / Men's team: 12th",
 "Upcoming Oct 30, 9:00 AM SEMO at OVC Championships | ",
 "Upcoming Nov 13, 10:00 AM SEMO at NCAA Midwest Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 SEMO at Indiana State | W, 23-21",
 "Final Sep 5 SEMO at Iowa State | L, 10-38",
 "Final Sep 12 SEMO at Southern Illinois | L, 20-34",
 "Final Sep 19 SEMO vs Central Arkansas | W, 27-9",
 "Final Sep 26 SEMO vs West Florida | L, 17-20",
 "Final Oct 10 SEMO at Lindenwood | W, 38-27",
 "Final Oct 17 SEMO vs Western Illinois | W, 40-30",
 "Upcoming Oct 24, 2:00 PM SEMO at Eastern Illinois | ",
 "Upcoming Oct 31, 1:00 PM SEMO vs Gardner-Webb | ",
 "Upcoming Nov 7, 2:30 PM SEMO at Tennessee State | ",
 "Upcoming Nov 14, 1:00 PM SEMO at Charleston Southern | ",
 "Upcoming Nov 21, 1:00 PM SEMO vs UT Martin | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 SEMO vs Southern Illinois | W, 1-0",
 "Final Aug 20 SEMO at Evansville | L, 0-2",
 "Final Aug 27 SEMO at Missouri State | T, 0-0",
 "Final Aug 30 SEMO at North Alabama | L, 1-2",
 "Final Sep 4 SEMO at Missouri | L, 0-5",
 "Final Sep 6 SEMO at Oklahoma State | L, 0-2",
 "Final Sep 9 SEMO at Saint Louis | L, 0-4",
 "Final Sep 13 SEMO vs Belmont | T, 0-0",
 "Final Sep 17 SEMO at Western Kentucky | L, 1-4",
 "Final Sep 20 SEMO vs Central Arkansas | T, 1-1",
 "Final Sep 27 SEMO at Western Illinois | W, 1-0",
 "Final Oct 4 SEMO vs Southern Indiana | T, 1-1",
 "Final Oct 11 SEMO vs Morehead State | W, 2-1",
 "Final Oct 15 SEMO at Eastern Illinois | W, 2-1",
 "Final Oct 18 SEMO vs Lindenwood | L, 0-2",
 "Upcoming Oct 24, 6:00 PM SEMO at UT Martin | ",
 "Upcoming Nov 1, 1:00 PM SEMO vs SIUE | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 SEMO at 2nd Annual Redhawk Fall Tournament | Completed",
 "Final Sep 25 SEMO at OVC Fall Tournament | Completed",
 "Upcoming Nov 5 SEMO at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 SEMO at NCAA National Championships | ",
 "Upcoming Jan 16 SEMO vs Indiana | ",
 "Upcoming Jan 17 SEMO at Bradley | ",
 "Upcoming Jan 23 SEMO at Eastern Kentucky | ",
 "Upcoming Jan 29 SEMO vs Arkansas State | ",
 "Upcoming Feb 1 SEMO at Missouri State | ",
 "Upcoming Feb 5 SEMO vs Ole Miss | ",
 "Upcoming Feb 6 SEMO at Alcorn State | ",
 "Upcoming Feb 7 SEMO at Jackson State | ",
 "Upcoming Feb 12 SEMO at UT Southern | ",
 "Upcoming Feb 13 SEMO at Vanderbilt | ",
 "Upcoming Feb 14 SEMO vs Belmont | ",
 "Upcoming Feb 20 SEMO at UT Chattanooga | ",
 "Upcoming Feb 22 SEMO vs Presbyterian | ",
 "Upcoming Feb 27 SEMO at Western Kentucky | ",
 "Upcoming Mar 7 SEMO at Hillsboro CC | ",
 "Upcoming Mar 20 SEMO at Lindenwood | ",
 "Upcoming Mar 27 SEMO at SIUE | ",
 "Upcoming Apr 2 SEMO vs Western Illinois | ",
 "Upcoming Apr 4 SEMO vs Washington University in St. Louis | ",
 "Upcoming Apr 6 SEMO vs Missouri - St. Louis | ",
 "Upcoming Apr 11 SEMO at Southern Indiana | ",
 "Upcoming Apr 17 SEMO vs Tennessee State | ",
 "Upcoming Apr 23 SEMO at OVC Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 4 SEMO at Saluki Fast Start | ",
 "Upcoming Jan 8 SEMO at Redhawks Invite | ",
 "Upcoming Jan 15 SEMO at Indiana Invitational | ",
 "Upcoming Jan 22 SEMO at Don DeNoon Invitational | ",
 "Upcoming Jan 29 SEMO at Rick McGuire Invitational | ",
 "Upcoming Feb 12 SEMO at Heartland Invitational | ",
 "Upcoming Feb 19 SEMO at Redhawks Open | ",
 "Upcoming Feb 23 SEMO at OVC Championships | ",
 "Upcoming Mar 12 SEMO at NCAA Indoor Track & Field Championships | ",
 "Upcoming Mar 19 SEMO at Ole Miss Classic | ",
 "Upcoming Mar 25 SEMO at Jim Vargo Invitational | ",
 "Upcoming Apr 2 SEMO at Joey Haines Invitational | ",
 "Upcoming Apr 9 SEMO at Tennessee Invite | ",
 "Upcoming Apr 16 SEMO at Georgia Tech Invite | ",
 "Upcoming Apr 23 SEMO at Bill Cornell Invite | ",
 "Upcoming Apr 30 SEMO at Music City Challenge | ",
 "Upcoming May 7 SEMO at Billy Hayes Invite | ",
 "Upcoming May 7 SEMO at Sycamore Open | ",
 "Upcoming May 13 SEMO at OVC Championships | ",
 "Upcoming May 26 SEMO at NCAA West Preliminary | ",
 "Upcoming Jun 9 SEMO at NCAA Outdoor Track & Field Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 SEMO vs Western Kentucky | L, 0-3",
 "Final Aug 29 SEMO vs Western Kentucky | L, 0-3",
 "Final Aug 29 SEMO vs Oregon | L, 1-3",
 "Final Sep 1 SEMO at Evansville | W, 3-1",
 "Final Sep 4 SEMO at Southern Illinois | L, 2-3",
 "Final Sep 5 SEMO vs Merrimack | W, 3-0",
 "Final Sep 10 SEMO at Loyola | L, 2-3",
 "Final Sep 11 SEMO vs Bradley | W, 3-2",
 "Final Sep 11 SEMO vs Alabama A&M | W, 3-1",
 "Final Sep 16 SEMO vs Little Rock | W, 3-0",
 "Final Sep 18 SEMO vs Saint Louis | W, 3-1",
 "Final Sep 18 SEMO vs Missouri State | L, 1-3",
 "Final Sep 19 SEMO at Kansas City | W, 3-0",
 "Final Sep 25 SEMO at Western Illinois | W, 3-0",
 "Final Sep 26 SEMO at Western Illinois | W, 3-0",
 "Final Oct 2 SEMO vs SIU Edwardsville | W, 3-0",
 "Final Oct 3 SEMO vs SIU Edwardsville | W, 3-0",
 "Final Oct 9 SEMO vs Lindenwood | L, 1-3",
 "Final Oct 10 SEMO vs Lindenwood | W, 3-1",
 "Final Oct 16 SEMO at Morehead State | W, 3-0",
 "Final Oct 17 SEMO at Morehead State | W, 3-0",
 "Today Oct 23, 6:00 PM SEMO at UT Martin | ",
 "Upcoming Oct 24, 2:00 PM SEMO at UT Martin | ",
 "Upcoming Oct 29, 6:00 PM SEMO vs Tennessee State | ",
 "Upcoming Oct 30, 4:00 PM SEMO vs Tennessee State | ",
 "Upcoming Nov 12, 6:00 PM SEMO at Southern Indiana | ",
 "Upcoming Nov 13, 5:00 PM SEMO at Southern Indiana | ",
 "Upcoming Nov 17, 6:00 PM SEMO vs Eastern Illinois | ",
 "Upcoming Nov 18, 4:00 PM SEMO vs Eastern Illinois | ",
 "Upcoming Nov 22 SEMO at OVC Tournament | ",
 "Upcoming Nov 23 SEMO at OVC Tournament | ",
 "Upcoming Nov 24 SEMO at OVC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southeast Missouri module checks passed");
