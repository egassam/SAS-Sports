import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southDakotaSchool} from '../src/schools/south-dakota.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-dakota');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southDakotaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-dakota-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goyotes.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-dakota'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southDakotaSchool.scheduleUrls],['roster',southDakotaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-dakota|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goyotes.com',`${key} must stay on goyotes.com`);
  }
}
const parity={"Basketball":{"schedule":["https://goyotes.com/sports/mens-basketball/schedule","https://goyotes.com/sports/womens-basketball/schedule"],"roster":["https://goyotes.com/sports/mens-basketball/roster","https://goyotes.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goyotes.com/sports/cross-country/schedule"],"roster":["https://goyotes.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goyotes.com/sports/football/schedule"],"roster":["https://goyotes.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goyotes.com/sports/womens-golf/schedule","https://goyotes.com/sports/mens-golf/schedule"],"roster":["https://goyotes.com/sports/womens-golf/roster","https://goyotes.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goyotes.com/sports/womens-soccer/schedule"],"roster":["https://goyotes.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goyotes.com/sports/softball/schedule"],"roster":["https://goyotes.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goyotes.com/sports/swimming-and-diving/schedule"],"roster":["https://goyotes.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goyotes.com/sports/womens-tennis/schedule"],"roster":["https://goyotes.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://goyotes.com/sports/track-and-field/schedule"],"roster":["https://goyotes.com/sports/track-and-field/roster"],"combined":false},"Triathlon":{"schedule":["https://goyotes.com/sports/triathlon/schedule"],"roster":["https://goyotes.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://goyotes.com/sports/womens-volleyball/schedule"],"roster":["https://goyotes.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-dakota|"+sport+"':"),`${sport} routes must live in the South Dakota module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goyotes.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southDakotaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-dakota)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Men's · South Dakota vs Mount Marty | ",
 "Upcoming Nov 4, 7:00 PM Men's · South Dakota vs Northern Kentucky | ",
 "Upcoming Nov 7, 1:00 PM Men's · South Dakota vs Cal State Fullerton | ",
 "Upcoming Nov 10, 7:00 PM Men's · South Dakota vs Houston Christian | ",
 "Upcoming Nov 13, 6:30 PM Men's · South Dakota at Drake | ",
 "Upcoming Nov 15, 3:30 PM Men's · South Dakota vs Doane | ",
 "Upcoming Nov 18, 7:30 PM Men's · South Dakota at Nebraska | ",
 "Upcoming Nov 22, 1:00 PM Men's · South Dakota vs Utah Tech | ",
 "Upcoming Nov 25, 1:00 PM Men's · South Dakota vs Arkansas Pine Bluff | ",
 "Upcoming Nov 27, 1:00 PM Men's · South Dakota vs Clarke | ",
 "Upcoming Nov 30, 7:00 PM Men's · South Dakota vs Montana State | ",
 "Upcoming Dec 3, 6:00 PM Men's · South Dakota at North Florida | ",
 "Upcoming Dec 5, 6:00 PM Men's · South Dakota at San Francisco | ",
 "Upcoming Dec 8, 8:00 PM Men's · South Dakota at Montana | ",
 "Upcoming Dec 12, 1:00 PM Men's · South Dakota vs North Florida | ",
 "Upcoming Dec 19, 1:00 PM Men's · South Dakota vs Chicago State | ",
 "Upcoming Dec 29, 7:30 PM Men's · South Dakota at Iowa | ",
 "Upcoming Jan 2, 4:00 PM Men's · South Dakota vs Ozark Christian | ",
 "Upcoming Jan 7, 7:00 PM Men's · South Dakota at Oral Roberts | ",
 "Upcoming Jan 9, 2:00 PM Men's · South Dakota at Kansas City | ",
 "Upcoming Jan 15, 7:00 PM Men's · South Dakota vs South Dakota State | ",
 "Upcoming Jan 21, 7:00 PM Men's · South Dakota vs North Dakota | ",
 "Upcoming Jan 23, 1:00 PM Men's · South Dakota vs North Dakota State | ",
 "Upcoming Jan 28, 7:00 PM Men's · South Dakota at Omaha | ",
 "Upcoming Jan 30, 6:00 PM Men's · South Dakota at St. Thomas | ",
 "Upcoming Feb 4, 7:00 PM Men's · South Dakota vs Kansas City | ",
 "Upcoming Feb 6, 1:00 PM Men's · South Dakota vs Oral Roberts | ",
 "Upcoming Feb 13, 1:00 PM Men's · South Dakota at South Dakota State | ",
 "Upcoming Feb 18, 7:00 PM Men's · South Dakota at North Dakota State | ",
 "Upcoming Feb 20, 1:00 PM Men's · South Dakota at North Dakota | ",
 "Upcoming Feb 25, 7:00 PM Men's · South Dakota vs St. Thomas | ",
 "Upcoming Feb 27, 1:00 PM Men's · South Dakota vs Omaha | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Women's · South Dakota vs York (Neb.) | ",
 "Upcoming Nov 6, 11:00 AM Women's · South Dakota vs UTRGV | ",
 "Upcoming Nov 11, 6:00 PM Women's · South Dakota vs Creighton | ",
 "Upcoming Nov 15, 1:00 PM Women's · South Dakota vs Idaho State | ",
 "Upcoming Nov 18, 1:00 PM Women's · South Dakota at Chicago State | ",
 "Upcoming Nov 20, 6:00 PM Women's · South Dakota at Valparaiso | ",
 "Upcoming Nov 23, 7:00 PM Women's · South Dakota vs Nebraska Wesleyan | ",
 "Upcoming Nov 27, 1:30 PM Women's · South Dakota at North Florida | ",
 "Upcoming Nov 28, 11:00 AM Women's · South Dakota vs Abilene Christian | ",
 "Upcoming Dec 1, 7:00 PM Women's · South Dakota vs Waldorf | ",
 "Upcoming Dec 4, 6:00 PM Women's · South Dakota at Lindenwood | ",
 "Upcoming Dec 8, 7:00 PM Women's · South Dakota vs Bradley | ",
 "Upcoming Dec 15, 7:00 PM Women's · South Dakota vs Drake | ",
 "Upcoming Dec 19, 3:00 PM Women's · South Dakota at Montana | ",
 "Upcoming Dec 22, 11:00 AM Women's · South Dakota vs Bellevue | ",
 "Upcoming Dec 31, 3:00 PM Women's · South Dakota at Boise State | ",
 "Upcoming Jan 7, 7:00 PM Women's · South Dakota vs Oral Roberts | ",
 "Upcoming Jan 9, 1:00 PM Women's · South Dakota vs Kansas City | ",
 "Upcoming Jan 16, 2:00 PM Women's · South Dakota at South Dakota State | ",
 "Upcoming Jan 21, 7:00 PM Women's · South Dakota at North Dakota | ",
 "Upcoming Jan 23, 1:00 PM Women's · South Dakota at North Dakota State | ",
 "Upcoming Jan 28, 7:00 PM Women's · South Dakota vs Omaha | ",
 "Upcoming Jan 30, 1:00 PM Women's · South Dakota vs St. Thomas | ",
 "Upcoming Feb 4, 7:00 PM Women's · South Dakota at Kansas City | ",
 "Upcoming Feb 6, 2:00 PM Women's · South Dakota at Oral Roberts | ",
 "Upcoming Feb 12, 7:00 PM Women's · South Dakota vs South Dakota State | ",
 "Upcoming Feb 18, 7:00 PM Women's · South Dakota vs North Dakota State | ",
 "Upcoming Feb 20, 1:00 PM Women's · South Dakota vs North Dakota | ",
 "Upcoming Feb 25, 7:00 PM Women's · South Dakota at St. Thomas | ",
 "Upcoming Feb 27, 1:00 PM Women's · South Dakota at Omaha | ",
 "Upcoming Mar 4 Women's · South Dakota at Summit League Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 South Dakota at Augustana Twilight | Women's team: 1st / Men's team: 2nd",
 "Final Sep 25 South Dakota at Gans Creek Classic | Women's team: 16th / Men's team: 18th",
 "Final Oct 16 South Dakota at Bradley Pink Classic | Women's team: 3rd / Men's team: 8th",
 "Upcoming Oct 31, 10:00 AM South Dakota at Summit League Championships | ",
 "Upcoming Nov 13, 10:00 AM South Dakota at NCAA Midwest Regional | ",
 "Upcoming Nov 21, 10:00 AM South Dakota at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 South Dakota vs Central Connecticut State | W, 59-20",
 "Final Sep 5 South Dakota at Northern Colorado | W, 38-23",
 "Final Sep 12 South Dakota vs Eastern Washington | W, 41-23",
 "Final Sep 19 South Dakota at Boise State | L, 24-38",
 "Final Sep 26 South Dakota at Youngstown State | L, 28-47",
 "Final Oct 3 South Dakota vs Indiana State | W, 44-14",
 "Final Oct 10 South Dakota vs Southern Illinois | W, 31-10",
 "Final Oct 17 South Dakota at Murray State | W, 48-20",
 "Today Oct 24, 1:00 PM South Dakota vs North Dakota | ",
 "Upcoming Oct 31, 3:00 PM South Dakota at South Dakota State | ",
 "Upcoming Nov 14, 1:00 PM South Dakota vs Northern Iowa | ",
 "Upcoming Nov 21, 12:00 PM South Dakota at Illinois State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · South Dakota at NDSU Invitational | 2nd of 3",
 "Final Sep 13 Women's · South Dakota at Redbird Invitational | 8th of 13",
 "Final Sep 21 Women's · South Dakota at Johnnie Imes Invitational | 5th of 9",
 "Final Sep 28 Women's · South Dakota at Diane Thomason Invitational | 10th of 13",
 "Final Oct 13 Women's · South Dakota at MSU/Payne Stewart Memorial | 3rd of 12",
 "Upcoming Feb 19 Women's · South Dakota at Rio Verde Collegiate Invitational | ",
 "Upcoming Mar 8 Women's · South Dakota at Babs Steffens Invitational | ",
 "Upcoming Mar 22 Women's · South Dakota at Ozarks National Invitational | ",
 "Upcoming Apr 12 Women's · South Dakota at Stampede at the Creek | ",
 "Upcoming Apr 25 Women's · South Dakota at Summit League Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · South Dakota at ANF Fall Clasic | 3rd of 14",
 "Final Sep 14 Men's · South Dakota at Wildcat Invitational | 6th of 15",
 "Final Sep 27 Men's · South Dakota at Badger Invite | 7th of 19",
 "Final Oct 5 Men's · South Dakota at Kemper Lakes Intercollegiate | 2nd of 12",
 "Final Oct 19 Men's · South Dakota at Zach Johnson Invite | 3rd of 13"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 South Dakota at Northern Iowa | W, 4-0",
 "Final Aug 16 South Dakota at Nebraska | T, 1-1",
 "Final Aug 20 South Dakota at Green Bay | L, 0-1",
 "Final Aug 23 South Dakota vs Morningside | W, 3-0",
 "Final Aug 27 South Dakota at Northern Colorado | T, 0-0",
 "Final Aug 30 South Dakota at Wyoming | L, 2-5",
 "Final Sep 3 South Dakota vs Idaho | L, 0-1",
 "Final Sep 6 South Dakota vs Drake | W, 2-0",
 "Final Sep 24 South Dakota vs South Dakota State | T, 0-0",
 "Final Sep 27 South Dakota at North Dakota State | L, 1-2",
 "Final Oct 4 South Dakota at North Dakota | W, 2-0",
 "Final Oct 8 South Dakota vs Kansas City | T, 2-2",
 "Final Oct 11 South Dakota vs Oral Roberts | T, 1-1",
 "Final Oct 15 South Dakota at Omaha | W, 1-0",
 "Final Oct 18 South Dakota at St. Thomas | W, 3-0",
 "Final Oct 22 South Dakota at South Dakota State | L, 2-3",
 "Upcoming Oct 29, 6:00 PM South Dakota vs North Dakota State | ",
 "Upcoming Nov 1, 1:00 PM South Dakota vs North Dakota | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 2 South Dakota at Minnesota State | W, 177-129",
 "Final Oct 16 South Dakota at Kansas Tri-Dual | Completed",
 "Final Oct 23 South Dakota vs Minnesota & Nebraska | Completed",
 "Upcoming Oct 30, 6:00 PM South Dakota vs Coyote Extravaganza | ",
 "Upcoming Nov 6, 5:00 PM South Dakota at Iowa State | ",
 "Upcoming Nov 19, 10:00 AM South Dakota at Coyote Mid-Season Classic | ",
 "Upcoming Dec 2 South Dakota at Toyota U.S. Open Championships | ",
 "Upcoming Jan 8 South Dakota at St. Thomas | ",
 "Upcoming Jan 22, 6:00 PM South Dakota vs Omaha | ",
 "Upcoming Jan 30, 1:00 PM South Dakota at South Dakota State | ",
 "Upcoming Feb 5 South Dakota at Coyote Invite | ",
 "Upcoming Feb 24 South Dakota at The Summit League | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 South Dakota at Augustana Invite | Completed",
 "Today Oct 24, 10:00 AM South Dakota at Creighton Invite | ",
 "Upcoming Oct 31, 12:00 PM South Dakota at Drake Invite | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 5 South Dakota at Southern Hills Collegiate Cup | 5th · 208 pts",
 "Final Sep 27 South Dakota at Desert's Edge Collegiate Cup | Completed",
 "Final Oct 3 South Dakota at Prairie State Collegiate Cup | Completed",
 "Final Oct 18 South Dakota at West Regional Championship | 7th · 296 pts",
 "Upcoming Nov 8 South Dakota at Collegiate National Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 South Dakota at Drake | W, 3-1",
 "Final Aug 29 South Dakota vs Milwaukee | W, 3-0",
 "Final Aug 30 South Dakota vs DePaul | L, 1-3",
 "Final Sep 3 South Dakota vs Utah Valley | W, 3-0",
 "Final Sep 4 South Dakota vs Air Force | W, 3-1",
 "Final Sep 5 South Dakota vs Northern Iowa | W, 3-2",
 "Final Sep 10 South Dakota at Colorado State | L, 0-3",
 "Final Sep 11 South Dakota at Wyoming | W, 3-1",
 "Final Sep 12 South Dakota vs UC Santa Barbara | W, 3-0",
 "Final Sep 18 South Dakota vs Minnesota | L, 1-3",
 "Final Sep 19 South Dakota vs Washington | L, 0-3",
 "Final Sep 25 South Dakota vs South Dakota State | L, 0-3",
 "Final Oct 1 South Dakota at St. Thomas | W, 3-0",
 "Final Oct 3 South Dakota at Omaha | W, 3-0",
 "Final Oct 8 South Dakota vs Oral Roberts | W, 3-0",
 "Final Oct 10 South Dakota vs Kansas City | W, 3-1",
 "Final Oct 15 South Dakota at North Dakota | W, 3-1",
 "Final Oct 17 South Dakota at North Dakota State | W, 3-2",
 "Final Oct 23 South Dakota at South Dakota State | W, 3-2",
 "Upcoming Oct 29, 7:00 PM South Dakota vs Omaha | ",
 "Upcoming Oct 31, 1:00 PM South Dakota vs St. Thomas | ",
 "Upcoming Nov 5, 7:00 PM South Dakota at Kansas City | ",
 "Upcoming Nov 7, 12:00 PM South Dakota at Oral Roberts | ",
 "Upcoming Nov 12, 7:00 PM South Dakota vs North Dakota State | ",
 "Upcoming Nov 14, 5:00 PM South Dakota vs North Dakota | ",
 "Upcoming Nov 22 South Dakota at Summit League Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("South Dakota module checks passed");
