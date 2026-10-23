import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northernIowaSchool} from '../src/schools/northern-iowa.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='northern-iowa');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northernIowaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/northern-iowa-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit unipanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['northern-iowa'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',northernIowaSchool.scheduleUrls],['roster',northernIowaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('northern-iowa|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'unipanthers.com',`${key} must stay on unipanthers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://unipanthers.com/sports/mens-basketball/schedule","https://unipanthers.com/sports/womens-basketball/schedule"],"roster":["https://unipanthers.com/sports/mens-basketball/roster","https://unipanthers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://unipanthers.com/sports/cross-country/schedule"],"roster":["https://unipanthers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://unipanthers.com/sports/football/schedule"],"roster":["https://unipanthers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://unipanthers.com/sports/womens-golf/schedule","https://unipanthers.com/sports/mens-golf/schedule"],"roster":["https://unipanthers.com/sports/womens-golf/roster","https://unipanthers.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://unipanthers.com/sports/womens-soccer/schedule"],"roster":["https://unipanthers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://unipanthers.com/sports/softball/schedule"],"roster":["https://unipanthers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://unipanthers.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://unipanthers.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://unipanthers.com/sports/womens-tennis/schedule"],"roster":["https://unipanthers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://unipanthers.com/sports/track-and-field/schedule"],"roster":["https://unipanthers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://unipanthers.com/sports/womens-volleyball/schedule"],"roster":["https://unipanthers.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://unipanthers.com/sports/wrestling/schedule"],"roster":["https://unipanthers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'northern-iowa|"+sport+"':"),`${sport} routes must live in the Northern Iowa module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://unipanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northernIowaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=northern-iowa)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Men's · Northern Iowa vs Upper Iowa (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Northern Iowa vs Cornell (IA) | ",
 "Upcoming Nov 7, 5:30 PM Men's · Northern Iowa at Furman | ",
 "Upcoming Nov 10, 7:00 PM Men's · Northern Iowa vs Green Bay | ",
 "Upcoming Nov 13, 6:00 PM Men's · Northern Iowa at Michigan State | ",
 "Upcoming Nov 14, 4:00 PM Men's · Northern Iowa at Oakland | ",
 "Upcoming Nov 17, 7:00 PM Men's · Northern Iowa vs Lindenwood | ",
 "Upcoming Nov 23, 10:00 AM Men's · Northern Iowa vs Davidson | ",
 "Upcoming Nov 25, 10:00 AM Men's · Northern Iowa vs Charlotte | ",
 "Upcoming Nov 28, 12:00 PM Men's · Northern Iowa vs Robert Morris | ",
 "Upcoming Dec 1, 7:00 PM Men's · Northern Iowa at Kansas | ",
 "Upcoming Dec 4, 7:00 PM Men's · Northern Iowa vs Wartburg | ",
 "Upcoming Dec 11, 9:00 PM Men's · Northern Iowa at UC Irvine | ",
 "Upcoming Dec 18, 7:00 PM Men's · Northern Iowa at Southern Illinois | ",
 "Upcoming Dec 21, 6:00 PM Men's · Northern Iowa vs Bradley | ",
 "Upcoming Dec 29, 6:00 PM Men's · Northern Iowa at Belmont | ",
 "Upcoming Jan 2, 1:00 PM Men's · Northern Iowa vs Evansville | ",
 "Upcoming Jan 5, 6:00 PM Men's · Northern Iowa vs Valparaiso | ",
 "Upcoming Jan 9, 12:00 PM Men's · Northern Iowa at Indiana State | ",
 "Upcoming Jan 12 Men's · Northern Iowa vs Illinois State | ",
 "Upcoming Jan 18, 7:00 PM Men's · Northern Iowa at Valparaiso | ",
 "Upcoming Jan 21 Men's · Northern Iowa vs Murray State | ",
 "Upcoming Jan 24 Men's · Northern Iowa at Evansville | ",
 "Upcoming Jan 27, 8:00 PM Men's · Northern Iowa vs UIC | ",
 "Upcoming Jan 30 Men's · Northern Iowa at Drake | ",
 "Upcoming Feb 3 Men's · Northern Iowa at Illinois State | ",
 "Upcoming Feb 6 Men's · Northern Iowa vs Southern Illinois | ",
 "Upcoming Feb 9 Men's · Northern Iowa vs Indiana State | ",
 "Upcoming Feb 13, 2:00 PM Men's · Northern Iowa at UIC | ",
 "Upcoming Feb 15 Men's · Northern Iowa at Bradley | ",
 "Upcoming Feb 21 Men's · Northern Iowa vs Drake | ",
 "Upcoming Feb 24, 7:00 PM Men's · Northern Iowa at Murray State | ",
 "Upcoming Feb 28 Men's · Northern Iowa vs Belmont | ",
 "Upcoming Mar 4 Men's · Northern Iowa at State Farm MVC Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 26, 6:00 PM Women's · Northern Iowa vs Upper Iowa (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Northern Iowa vs St. Thomas | ",
 "Upcoming Nov 6, 6:00 PM Women's · Northern Iowa at South Dakota State | ",
 "Upcoming Nov 12, 7:30 PM Women's · Northern Iowa at Iowa | ",
 "Upcoming Nov 15, 2:00 PM Women's · Northern Iowa vs Creighton | ",
 "Upcoming Nov 18, 6:00 PM Women's · Northern Iowa vs Iowa State | ",
 "Upcoming Nov 23, 6:00 PM Women's · Northern Iowa vs Green Bay | ",
 "Upcoming Nov 25, 6:00 PM Women's · Northern Iowa vs Saint Louis | ",
 "Upcoming Dec 3, 6:30 PM Women's · Northern Iowa at Kansas State | ",
 "Upcoming Dec 6, 1:00 PM Women's · Northern Iowa at North Dakota State | ",
 "Upcoming Dec 9, 7:00 PM Women's · Northern Iowa at Minnesota | ",
 "Upcoming Dec 12, 2:00 PM Women's · Northern Iowa vs Toledo | ",
 "Upcoming Dec 20, 2:00 PM Women's · Northern Iowa vs Evansville | ",
 "Upcoming Dec 22, 6:00 PM Women's · Northern Iowa vs Southern Illinois | ",
 "Upcoming Dec 31, 1:00 PM Women's · Northern Iowa at Indiana State | ",
 "Upcoming Jan 3, 2:00 PM Women's · Northern Iowa at Valparaiso | ",
 "Upcoming Jan 7, 7:00 PM Women's · Northern Iowa at UIC | ",
 "Upcoming Jan 9, 4:00 PM Women's · Northern Iowa at Illinois State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Northern Iowa vs Belmont | ",
 "Upcoming Jan 16, 2:00 PM Women's · Northern Iowa vs Murray State | ",
 "Upcoming Jan 19, 6:00 PM Women's · Northern Iowa at Bradley | ",
 "Upcoming Jan 22, 6:00 PM Women's · Northern Iowa vs UIC | ",
 "Upcoming Jan 24, 2:00 PM Women's · Northern Iowa vs Indiana State | ",
 "Upcoming Jan 31, 2:00 PM Women's · Northern Iowa vs Drake | ",
 "Upcoming Feb 5, 6:00 PM Women's · Northern Iowa at Murray State | ",
 "Upcoming Feb 7, 2:00 PM Women's · Northern Iowa at Southern Illinois | ",
 "Upcoming Feb 11, 6:00 PM Women's · Northern Iowa at Evansville | ",
 "Upcoming Feb 13, 4:00 PM Women's · Northern Iowa at Belmont | ",
 "Upcoming Feb 19, 6:00 PM Women's · Northern Iowa vs Valparaiso | ",
 "Upcoming Feb 21 Women's · Northern Iowa vs Bradley | ",
 "Upcoming Feb 25, 6:00 PM Women's · Northern Iowa vs Illinois State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Northern Iowa at Drake | ",
 "Upcoming Mar 3 Women's · Northern Iowa at State Farm Missouri Valley Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Northern Iowa at Hawkeye Invite | Completed",
 "Final Sep 25 Northern Iowa at Gans Creek Classic | Completed",
 "Final Oct 3 Northern Iowa at Dan Huston Invite | Completed",
 "Final Oct 16 Northern Iowa at Bradley Pink Classic | Women's team: 12th / Men's team: 13th",
 "Upcoming Oct 30 Northern Iowa at MVC Championships | ",
 "Upcoming Nov 13 Northern Iowa at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Northern Iowa at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Northern Iowa at Eastern Washington | L, 24-34",
 "Final Sep 12 Northern Iowa vs Drake | W, 56-14",
 "Final Sep 19 Northern Iowa at Iowa | L, 0-55",
 "Final Sep 26 Northern Iowa vs Illinois State | W, 28-21",
 "Final Oct 10 Northern Iowa vs North Dakota | W, 24-17",
 "Final Oct 17 Northern Iowa at Youngstown State | L, 22-35",
 "Upcoming Oct 24, 1:00 PM Northern Iowa at Southern Illinois | ",
 "Upcoming Oct 31, 1:00 PM Northern Iowa vs Indiana State | ",
 "Upcoming Nov 7, 1:00 PM Northern Iowa vs South Dakota State | ",
 "Upcoming Nov 14, 1:00 PM Northern Iowa at South Dakota | ",
 "Upcoming Nov 21, 1:00 PM Northern Iowa at Murray State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Northern Iowa at Redbird Invitational | 12th of 13",
 "Final Sep 21 Women's · Northern Iowa at Stampede at the Creek | 2nd of 5",
 "Final Sep 28 Women's · Northern Iowa at Diane Thomason Invitational | 13th of 13",
 "Final Oct 5 Women's · Northern Iowa at Marilynn Smith Sunflower Invitational | 14th of 14",
 "Final Oct 12 Women's · Northern Iowa at Big O Classic | 5th of 7"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Northern Iowa at ANF Fall Classic | 8th of 14",
 "Final Sep 14 Men's · Northern Iowa at Wildcat Invitational | 15th of 15",
 "Final Sep 21 Men's · Northern Iowa at Bluejay Invitational | Completed",
 "Final Sep 28 Men's · Northern Iowa at SIUE Dolenc Invitational | 15th of 17",
 "Final Oct 12 Men's · Northern Iowa at Bubba Barnett Intercollegiate | 12th of 17",
 "Final Oct 19 Men's · Northern Iowa at Zach Johnson Invitational | 13th of 13"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 8 Northern Iowa vs Hawkeye (Exhibition) | W, 7-0",
 "Final Aug 12 Northern Iowa vs South Dakota | L, 0-4",
 "Final Aug 16 Northern Iowa vs Milwaukee | L, 0-4",
 "Final Aug 20 Northern Iowa vs Omaha | L, 0-1",
 "Final Aug 23 Northern Iowa at Northern Illinois | L, 0-3",
 "Final Aug 27 Northern Iowa vs St. Ambrose | T, 1-1",
 "Final Aug 30 Northern Iowa at Iowa State | L, 0-5",
 "Final Sep 6 Northern Iowa at Western Illinois | L, 1-2",
 "Final Sep 10 Northern Iowa vs St. Thomas | L, 1-2",
 "Final Sep 20 Northern Iowa at Indiana State | L, 0-2",
 "Final Sep 27 Northern Iowa vs Belmont | W, 1-0",
 "Final Oct 4 Northern Iowa at Illinois State | L, 0-6",
 "Final Oct 11 Northern Iowa vs Valparaiso | T, 1-1",
 "Final Oct 15 Northern Iowa at Evansville | L, 0-1",
 "Final Oct 18 Northern Iowa vs Murray State | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Northern Iowa at UIC | ",
 "Upcoming Nov 1, 1:00 PM Northern Iowa at Southern Illinois | ",
 "Upcoming Nov 5, 1:00 PM Northern Iowa vs Drake | ",
 "Upcoming Nov 8 Northern Iowa at MVC Tournament (First Round) | ",
 "Upcoming Nov 12 Northern Iowa at MVC Tournament (Semifinal) | ",
 "Upcoming Nov 15 Northern Iowa at MVC Tournament (Championship) | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Northern Iowa at Marquette | W, 103-102",
 "Final Oct 10 Women's · Northern Iowa at UIC | L, 128-172",
 "Final Oct 10 Women's · Northern Iowa vs Southern Indiana | W, 196-104",
 "Final Oct 16 Women's · Northern Iowa vs Southern Illinois | W, 188-163",
 "Final Oct 16 Women's · Northern Iowa vs St. Thomas | W, 243-110",
 "Upcoming Oct 30, 6:00 PM Women's · Northern Iowa at Coyote Extravaganza | ",
 "Upcoming Nov 17, 10:00 AM Women's · Northern Iowa at Hawkeye Invite | ",
 "Upcoming Jan 9, 2:00 PM Women's · Northern Iowa at Iowa State | ",
 "Upcoming Jan 15, 5:00 PM Women's · Northern Iowa vs Illinois State | ",
 "Upcoming Feb 5, 6:00 PM Women's · Northern Iowa at Coyote Invite | ",
 "Upcoming Feb 17, 10:30 AM Women's · Northern Iowa at MVC Championships | ",
 "Upcoming Mar 8 Women's · Northern Iowa at NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · Northern Iowa at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Northern Iowa at Gopher Invite | Completed",
 "Final Oct 2 Northern Iowa at Redbird Invite | Completed",
 "Upcoming Oct 24 Northern Iowa at Omaha/Creighton Invite | ",
 "Upcoming Oct 31 Northern Iowa at Drake | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Northern Iowa vs Georgia Tech | L, 0-3",
 "Final Aug 29 Northern Iowa vs Loyola-Chicago | W, 3-2",
 "Final Aug 30 Northern Iowa at Iowa State | L, 1-3",
 "Final Sep 3 Northern Iowa vs Air Force | W, 3-1",
 "Final Sep 4 Northern Iowa vs Utah Valley | W, 3-0",
 "Final Sep 5 Northern Iowa at South Dakota | L, 2-3",
 "Final Sep 11 Northern Iowa vs Creighton | L, 1-3",
 "Final Sep 12 Northern Iowa at Rice | W, 3-0",
 "Final Sep 13 Northern Iowa vs Louisville | L, 0-3",
 "Final Sep 18 Northern Iowa vs Wichita State | W, 3-0",
 "Final Sep 19 Northern Iowa vs Wichita State | W, 3-1",
 "Final Sep 22 Northern Iowa at Drake | W, 3-0",
 "Final Sep 26 Northern Iowa vs Murray State | W, 3-0",
 "Final Oct 1 Northern Iowa at Illinois State | W, 3-0",
 "Final Oct 2 Northern Iowa at Bradley | W, 3-0",
 "Final Oct 8 Northern Iowa vs Drake | W, 3-0",
 "Final Oct 10 Northern Iowa at Southern Illinois | W, 3-1",
 "Final Oct 16 Northern Iowa vs Valparaiso | W, 3-0",
 "Final Oct 17 Northern Iowa vs UIC | W, 3-0",
 "Today Oct 23, 6:00 PM Northern Iowa vs Evansville | ",
 "Upcoming Oct 24, 5:00 PM Northern Iowa vs Bradley | ",
 "Upcoming Oct 30, 5:00 PM Northern Iowa at Indiana State | ",
 "Upcoming Oct 31, 5:00 PM Northern Iowa at Evansville | ",
 "Upcoming Nov 6, 6:00 PM Northern Iowa vs Belmont | ",
 "Upcoming Nov 7, 5:00 PM Northern Iowa vs Southern Illinois | ",
 "Upcoming Nov 13, 6:00 PM Northern Iowa at UIC | ",
 "Upcoming Nov 14, 5:00 PM Northern Iowa at Valparaiso | ",
 "Upcoming Nov 19 Northern Iowa at MVC Tournament (Opening Round) | ",
 "Upcoming Nov 21 Northern Iowa at MVC Tournament (Semifinal) | ",
 "Upcoming Nov 24 Northern Iowa at MVC Tournament (Championship) | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 14, 9:00 AM Northern Iowa at Grand View Open | ",
 "Upcoming Nov 21, 2:00 PM Northern Iowa at North Carolina | ",
 "Upcoming Nov 22, 12:00 PM Northern Iowa at Duke | ",
 "Upcoming Dec 6, 10:00 AM Northern Iowa at Cougar Clash | ",
 "Upcoming Dec 11, 7:00 PM Northern Iowa vs Iowa | ",
 "Upcoming Dec 18, 6:00 PM Northern Iowa at West Virginia | ",
 "Upcoming Jan 2 Northern Iowa at Soldier Salute | ",
 "Upcoming Jan 8 Northern Iowa at NWCA Multi-Division National Dual Meet Championships | ",
 "Upcoming Jan 15, 7:00 PM Northern Iowa vs Wyoming | ",
 "Upcoming Jan 22, 6:30 PM Northern Iowa at Missouri | ",
 "Upcoming Jan 29, 7:00 PM Northern Iowa vs Oklahoma State | ",
 "Upcoming Jan 30, 7:00 PM Northern Iowa vs Oklahoma | ",
 "Upcoming Feb 4, 8:30 PM Northern Iowa at Utah Valley | ",
 "Upcoming Feb 6 Northern Iowa at Arizona State | ",
 "Upcoming Feb 12, 7:00 PM Northern Iowa vs Iowa State | ",
 "Upcoming Feb 13, 6:00 PM Northern Iowa vs Cornell | ",
 "Upcoming Feb 21, 1:00 PM Northern Iowa at Wisconsin | ",
 "Upcoming Mar 5 Northern Iowa at Big 12 Championships | ",
 "Upcoming Mar 18 Northern Iowa at NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Northern Iowa module checks passed");
