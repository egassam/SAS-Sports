import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kansasCitySchool} from '../src/schools/kansas-city.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kansas-city');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,kansasCityHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/kansas-city-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit kcroos.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['kansas-city'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',kansasCitySchool.scheduleUrls],['roster',kansasCitySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('kansas-city|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'kcroos.com',`${key} must stay on kcroos.com`);
  }
}
const parity={"Basketball":{"schedule":["https://kcroos.com/sports/mens-basketball/schedule","https://kcroos.com/sports/womens-basketball/schedule"],"roster":["https://kcroos.com/sports/mens-basketball/roster","https://kcroos.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://kcroos.com/sports/cross-country/schedule"],"roster":["https://kcroos.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://kcroos.com/sports/mens-golf/schedule"],"roster":["https://kcroos.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://kcroos.com/sports/womens-soccer/schedule","https://kcroos.com/sports/mens-soccer/schedule"],"roster":["https://kcroos.com/sports/womens-soccer/roster","https://kcroos.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://kcroos.com/sports/softball/schedule"],"roster":["https://kcroos.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://kcroos.com/sports/womens-tennis/schedule"],"roster":["https://kcroos.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://kcroos.com/sports/track-and-field/schedule"],"roster":["https://kcroos.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://kcroos.com/sports/womens-volleyball/schedule"],"roster":["https://kcroos.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'kansas-city|"+sport+"':"),`${sport} routes must live in the Kansas City module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://kcroos.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.kansasCityHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=kansas-city)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 24, 11:30 AM Men's · Kansas City vs Montana State (Exhibition) | ",
 "Upcoming Nov 2 Men's · Kansas City at Creighton | ",
 "Upcoming Nov 6, 7:30 PM Men's · Kansas City vs Southern Illinois | ",
 "Upcoming Nov 9 Men's · Kansas City at Jacksonville | ",
 "Upcoming Nov 11 Men's · Kansas City vs Florida A&M | ",
 "Upcoming Nov 12 Men's · Kansas City vs George Mason | ",
 "Upcoming Nov 17, 7:00 PM Men's · Kansas City vs Newman | ",
 "Upcoming Nov 20 Men's · Kansas City at Iona | ",
 "Upcoming Nov 24, 7:00 PM Men's · Kansas City vs Green Bay | ",
 "Upcoming Nov 28, 2:00 PM Men's · Kansas City vs SEMO | ",
 "Upcoming Nov 30, 7:00 PM Men's · Kansas City vs Peru State | ",
 "Upcoming Dec 5 Men's · Kansas City at Duquesne | ",
 "Upcoming Dec 8, 5:30 PM Men's · Kansas City vs Denver | ",
 "Upcoming Dec 9, 5:30 PM Men's · Kansas City vs Eastern Illinois | ",
 "Upcoming Dec 12 Men's · Kansas City at SEMO | ",
 "Upcoming Dec 19, 2:00 PM Men's · Kansas City vs Lindenwood | ",
 "Upcoming Dec 21, 2:00 PM Men's · Kansas City vs SIUE | ",
 "Upcoming Dec 30, 7:30 PM Men's · Kansas City vs Lincoln | ",
 "Upcoming Jan 2, 2:00 PM Men's · Kansas City vs Spurgeon | ",
 "Upcoming Jan 7, 7:00 PM Men's · Kansas City vs South Dakota State | ",
 "Upcoming Jan 9, 2:00 PM Men's · Kansas City vs South Dakota | ",
 "Upcoming Jan 14 Men's · Kansas City at North Dakota State | ",
 "Upcoming Jan 16 Men's · Kansas City at North Dakota | ",
 "Upcoming Jan 21, 7:00 PM Men's · Kansas City vs Omaha | ",
 "Upcoming Jan 23, 7:00 PM Men's · Kansas City vs St. Thomas | ",
 "Upcoming Jan 30, 7:00 PM Men's · Kansas City vs Oral Roberts | ",
 "Upcoming Feb 4 Men's · Kansas City at South Dakota | ",
 "Upcoming Feb 6 Men's · Kansas City at South Dakota State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Kansas City vs North Dakota | ",
 "Upcoming Feb 13, 2:00 PM Men's · Kansas City vs North Dakota State | ",
 "Upcoming Feb 18 Men's · Kansas City at St. Thomas | ",
 "Upcoming Feb 21 Men's · Kansas City at Omaha | ",
 "Upcoming Feb 27 Men's · Kansas City at Oral Roberts | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Today Oct 24, 1:30 PM Women's · Kansas City vs Newman (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Kansas City vs Baker | ",
 "Upcoming Nov 6, 5:30 PM Women's · Kansas City vs Wichita State | ",
 "Upcoming Nov 9, 6:30 PM Women's · Kansas City at Arkansas | ",
 "Upcoming Nov 13, 7:00 PM Women's · Kansas City vs SEMO | ",
 "Upcoming Nov 16, 7:00 PM Women's · Kansas City at New Mexico State | ",
 "Upcoming Nov 18, 12:30 PM Women's · Kansas City at UTEP | ",
 "Upcoming Nov 22, 11:00 AM Women's · Kansas City vs Missouri State | ",
 "Upcoming Nov 24, 7:00 PM Women's · Kansas City at Nebraska | ",
 "Upcoming Nov 29, 2:00 PM Women's · Kansas City vs Park | ",
 "Upcoming Dec 3, 6:00 PM Women's · Kansas City at Austin Peay | ",
 "Upcoming Dec 6, 12:00 PM Women's · Kansas City at Kansas | ",
 "Upcoming Dec 9, 7:30 PM Women's · Kansas City at Air Force | ",
 "Upcoming Dec 12, 2:00 PM Women's · Kansas City at Minnesota | ",
 "Upcoming Dec 17, 7:00 PM Women's · Kansas City vs Denver | ",
 "Upcoming Dec 22, 2:00 PM Women's · Kansas City vs Lindenwood | ",
 "Upcoming Dec 30, 5:30 PM Women's · Kansas City vs Saint Mary | ",
 "Upcoming Jan 7, 7:00 PM Women's · Kansas City at South Dakota State | ",
 "Upcoming Jan 9, 1:00 PM Women's · Kansas City at South Dakota | ",
 "Upcoming Jan 14, 7:00 PM Women's · Kansas City vs North Dakota State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Kansas City vs North Dakota | ",
 "Upcoming Jan 21, 6:30 PM Women's · Kansas City at Omaha | ",
 "Upcoming Jan 24, 1:00 PM Women's · Kansas City at St. Thomas | ",
 "Upcoming Jan 30, 2:00 PM Women's · Kansas City at Oral Roberts | ",
 "Upcoming Feb 4, 7:00 PM Women's · Kansas City vs South Dakota | ",
 "Upcoming Feb 6, 2:00 PM Women's · Kansas City vs South Dakota State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Kansas City at North Dakota | ",
 "Upcoming Feb 13, 1:00 PM Women's · Kansas City at North Dakota State | ",
 "Upcoming Feb 18, 7:00 PM Women's · Kansas City vs St. Thomas | ",
 "Upcoming Feb 20, 2:00 PM Women's · Kansas City vs Omaha | ",
 "Upcoming Feb 27, 2:00 PM Women's · Kansas City vs Oral Roberts | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Kansas City at Bob Timmons Classic | Women's team: 6th / Men's team: 5th",
 "Final Oct 3 Kansas City at Chile Pepper Festival | Women's team: 28th / Men's team: 18th",
 "Final Oct 16 Kansas City at Bradley Pink Classic | Women's team: 25th / Men's team: 20th",
 "Upcoming Oct 31 Kansas City at Summit League Cross Country Championships | ",
 "Upcoming Nov 13 Kansas City at NCAA Midwest Regional Championships | ",
 "Upcoming Nov 21 Kansas City at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Kansas City at Island Resort Intercollegiate | 9th of 12",
 "Final Sep 14 Kansas City at Wildcat Invitational | 8th of 15",
 "Final Sep 29 Kansas City at Mark Simpson Invitational | 6th of 17",
 "Final Oct 12 Kansas City at Tall City Collegiate | 3rd of 12",
 "Final Oct 19 Kansas City at Twin Oaks Intercollegiate | 1st of 7",
 "Upcoming Feb 22 Kansas City at Desert Intercollegiate | ",
 "Upcoming Mar 12 Kansas City at Jackrabbit Invitational | ",
 "Upcoming Mar 22 Kansas City at Bell Bank Pay It Forward Collegiate | ",
 "Upcoming Apr 12 Kansas City at Everett Buick GMC Classic | ",
 "Upcoming Apr 18 Kansas City at Hawkeye Invitational | ",
 "Upcoming May 2 Kansas City at Summit League Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Women's · Kansas City at Arkansas (Exhibition) | L, 0-3",
 "Final Aug 9 Women's · Kansas City vs Butler CC (Exhibition) | W, 4-1",
 "Final Aug 16 Women's · Kansas City at Iowa State | L, 0-4",
 "Final Aug 21 Women's · Kansas City vs Rockhurst | T, 0-0",
 "Final Aug 23 Women's · Kansas City vs UC Riverside | L, 1-3",
 "Final Aug 27 Women's · Kansas City at Creighton | L, 0-1",
 "Final Sep 3 Women's · Kansas City at Kansas | L, 0-3",
 "Final Sep 10 Women's · Kansas City vs Missouri State | W, 2-0",
 "Final Sep 13 Women's · Kansas City at Memphis | L, 0-1",
 "Final Sep 19 Women's · Kansas City vs Little Rock | L, 0-3",
 "Final Sep 24 Women's · Kansas City vs Oral Roberts | T, 1-1",
 "Final Sep 27 Women's · Kansas City at St. Thomas | W, 1-0",
 "Final Oct 3 Women's · Kansas City at Omaha | L, 0-1",
 "Final Oct 8 Women's · Kansas City at South Dakota | T, 2-2",
 "Final Oct 11 Women's · Kansas City at South Dakota State | L, 0-3",
 "Final Oct 15 Women's · Kansas City vs North Dakota | L, 0-1",
 "Final Oct 18 Women's · Kansas City vs North Dakota State | L, 1-3",
 "Today Oct 24, 7:00 PM Women's · Kansas City at Oral Roberts | ",
 "Upcoming Oct 29, 6:00 PM Women's · Kansas City vs St. Thomas | ",
 "Upcoming Nov 1, 1:00 PM Women's · Kansas City vs Omaha | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Kansas City vs SIUE | W, 5-0",
 "Final Aug 25 Men's · Kansas City vs UNLV | W, 1-0",
 "Final Aug 30 Men's · Kansas City vs San Francisco | L, 2-3",
 "Final Sep 4 Men's · Kansas City at SMU | T, 1-1",
 "Final Sep 7 Men's · Kansas City at Drake | W, 1-0",
 "Final Sep 11 Men's · Kansas City vs Michigan State | W, 3-1",
 "Final Sep 16 Men's · Kansas City at Missouri State | T, 3-3",
 "Final Sep 20 Men's · Kansas City vs San Diego | W, 1-0",
 "Final Sep 26 Men's · Kansas City vs Oral Roberts | W, 3-1",
 "Final Oct 3 Men's · Kansas City at St. Thomas | W, 1-0",
 "Final Oct 7 Men's · Kansas City vs Tulsa | W, 3-1",
 "Final Oct 11 Men's · Kansas City at NC State | L, 0-3",
 "Final Oct 17 Men's · Kansas City at Delaware | W, 2-0",
 "Final Oct 20 Men's · Kansas City at Pennsylvania | W, 2-1",
 "Upcoming Oct 25, 12:00 PM Men's · Kansas City vs Massachusetts | ",
 "Upcoming Oct 31, 5:00 PM Men's · Kansas City at Omaha | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Today Sep 25 Kansas City at Omaha | ",
 "Final Oct 16 Kansas City at Intercollegiate Tennis Association | Completed",
 "Upcoming Jan 22 Kansas City at Kansas | ",
 "Upcoming Jan 29 Kansas City at Tulsa | ",
 "Upcoming Jan 30 Kansas City vs Arkansas | ",
 "Upcoming Feb 17 Kansas City vs Emporia State | ",
 "Upcoming Feb 19 Kansas City vs The University of Texas Rio Grande Valley | ",
 "Upcoming Feb 20 Kansas City vs North Texas | ",
 "Upcoming Feb 24 Kansas City vs Western Illinois | ",
 "Upcoming Feb 25 Kansas City at Drake | ",
 "Upcoming Feb 27 Kansas City at Arkansas Fort Smith | ",
 "Upcoming Mar 6 Kansas City at St. Thomas | ",
 "Upcoming Mar 17, 2:00 PM Kansas City vs Creighton | ",
 "Upcoming Mar 20, 2:00 PM Kansas City vs South Dakota | ",
 "Upcoming Mar 24 Kansas City vs Missouri State | ",
 "Upcoming Apr 7 Kansas City vs Oral Roberts | ",
 "Upcoming Apr 17 Kansas City at Nebraska at Omaha | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Kansas City vs Jackson State | W, 3-0",
 "Final Aug 28 Kansas City vs UT Martin | W, 3-2",
 "Final Aug 29 Kansas City at Austin Peay | L, 0-3",
 "Final Sep 4 Kansas City vs Purdue Fort Wayne | W, 3-1",
 "Final Sep 4 Kansas City at Miami (OH) | L, 0-3",
 "Final Sep 5 Kansas City vs Evansville | W, 3-1",
 "Final Sep 11 Kansas City vs Radford | W, 3-1",
 "Final Sep 11 Kansas City vs Utah Valley | L, 2-3",
 "Final Sep 12 Kansas City vs Drake | L, 2-3",
 "Final Sep 17 Kansas City vs Missouri State | L, 0-3",
 "Final Sep 18 Kansas City vs Saint Louis | W, 3-0",
 "Final Sep 19 Kansas City vs SEMO | L, 0-3",
 "Final Sep 26 Kansas City vs Oral Roberts | W, 3-0",
 "Final Oct 1 Kansas City vs North Dakota | W, 3-0",
 "Final Oct 3 Kansas City vs North Dakota State | W, 3-2",
 "Final Oct 8 Kansas City at South Dakota State | L, 1-3",
 "Final Oct 10 Kansas City at South Dakota | L, 1-3",
 "Final Oct 15 Kansas City vs St. Thomas | L, 0-3",
 "Final Oct 17 Kansas City vs Omaha | L, 2-3",
 "Today Oct 24, 12:00 PM Kansas City at Oral Roberts | ",
 "Upcoming Oct 29, 7:00 PM Kansas City at North Dakota State | ",
 "Upcoming Oct 31, 11:00 AM Kansas City at North Dakota | ",
 "Upcoming Nov 5, 7:00 PM Kansas City vs South Dakota | ",
 "Upcoming Nov 7, 1:00 PM Kansas City vs South Dakota State | ",
 "Upcoming Nov 12, 6:30 PM Kansas City at Omaha | ",
 "Upcoming Nov 14, 12:00 PM Kansas City at St. Thomas | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Kansas City module checks passed");
