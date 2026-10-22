import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northTexasSchool} from '../src/schools/north-texas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='north-texas');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northTexasHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/north-texas-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit meangreensports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['north-texas'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',northTexasSchool.scheduleUrls],['roster',northTexasSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('north-texas|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'meangreensports.com',`${key} must stay on meangreensports.com`);
  }
}
const parity={"Basketball":{"schedule":["https://meangreensports.com/sports/mens-basketball/schedule","https://meangreensports.com/sports/womens-basketball/schedule"],"roster":["https://meangreensports.com/sports/mens-basketball/roster","https://meangreensports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://meangreensports.com/sports/track-and-field/schedule"],"roster":["https://meangreensports.com/sports/track-and-field/roster"],"combined":false},"Football":{"schedule":["https://meangreensports.com/sports/football/schedule"],"roster":["https://meangreensports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://meangreensports.com/sports/womens-golf/schedule","https://meangreensports.com/sports/mens-golf/schedule"],"roster":["https://meangreensports.com/sports/womens-golf/roster","https://meangreensports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://meangreensports.com/sports/womens-soccer/schedule"],"roster":["https://meangreensports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://meangreensports.com/sports/softball/schedule"],"roster":["https://meangreensports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://meangreensports.com/sports/swimming-and-diving/schedule"],"roster":["https://meangreensports.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://meangreensports.com/sports/womens-tennis/schedule"],"roster":["https://meangreensports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://meangreensports.com/sports/track-and-field/schedule"],"roster":["https://meangreensports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://meangreensports.com/sports/womens-volleyball/schedule"],"roster":["https://meangreensports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'north-texas|"+sport+"':"),`${sport} routes must live in the North Texas module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://meangreensports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northTexasHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=north-texas)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · North Texas vs Colorado (Exhibition) | L, 64-67",
 "Upcoming Oct 26, 7:00 PM Men's · North Texas vs Northwestern State IExhibition) (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · North Texas vs Southwestern Christian | ",
 "Upcoming Nov 5, 4:00 PM Men's · North Texas vs McNeese | ",
 "Upcoming Nov 11, 7:00 PM Men's · North Texas vs Santa Clara | ",
 "Upcoming Nov 14, 5:00 PM Men's · North Texas vs South Alabama | ",
 "Upcoming Nov 20, 5:30 PM Men's · North Texas at App State | ",
 "Upcoming Nov 27 Men's · North Texas vs North Dakota State | ",
 "Upcoming Nov 28 Men's · North Texas vs Boise State | ",
 "Upcoming Nov 29 Men's · North Texas vs Drake | ",
 "Upcoming Dec 4, 7:00 PM Men's · North Texas vs Bradley | ",
 "Upcoming Dec 6, 3:00 PM Men's · North Texas vs Mississippi Valley State | ",
 "Upcoming Dec 13 Men's · North Texas vs Texas State | ",
 "Upcoming Dec 16, 7:00 PM Men's · North Texas vs Winthrop | ",
 "Upcoming Dec 20, 3:00 PM Men's · North Texas vs Bethune-Cookman | ",
 "Upcoming Dec 22, 1:00 PM Men's · North Texas vs Southwest (N.M.) | ",
 "Upcoming Dec 31 Men's · North Texas at Wichita State | ",
 "Upcoming Jan 6 Men's · North Texas vs Florida Atlantic | ",
 "Upcoming Jan 10 Men's · North Texas at Rice | ",
 "Upcoming Jan 14 Men's · North Texas vs Tulane | ",
 "Upcoming Jan 17 Men's · North Texas vs Charlotte | ",
 "Upcoming Jan 20 Men's · North Texas vs Wichita State | ",
 "Upcoming Jan 23 Men's · North Texas at Memphis | ",
 "Upcoming Jan 28 Men's · North Texas at UTSA | ",
 "Upcoming Jan 31 Men's · North Texas vs Tulsa | ",
 "Upcoming Feb 4 Men's · North Texas vs Temple | ",
 "Upcoming Feb 11 Men's · North Texas at UAB | ",
 "Upcoming Feb 14 Men's · North Texas at Tulsa | ",
 "Upcoming Feb 17 Men's · North Texas vs Memphis | ",
 "Upcoming Feb 21 Men's · North Texas at Florida Atlantic | ",
 "Upcoming Feb 24 Men's · North Texas at South Florida | ",
 "Upcoming Feb 27 Men's · North Texas vs UTSA | ",
 "Upcoming Mar 2 Men's · North Texas at East Carolina | ",
 "Upcoming Mar 7 Men's · North Texas vs Rice | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Women's · North Texas vs Newman | ",
 "Upcoming Nov 5, 1:00 PM Women's · North Texas at San Diego State | ",
 "Upcoming Nov 8, 1:00 PM Women's · North Texas vs Duke | ",
 "Upcoming Nov 11, 11:00 AM Women's · North Texas vs HCU | ",
 "Upcoming Nov 14, 2:00 PM Women's · North Texas vs Incarnate Word | ",
 "Upcoming Nov 18, 6:30 PM Women's · North Texas vs Saint Francis | ",
 "Upcoming Nov 22, 1:00 PM Women's · North Texas vs Arkansas State | ",
 "Upcoming Nov 24, 6:30 PM Women's · North Texas vs Dallas | ",
 "Upcoming Nov 27, 6:30 PM Women's · North Texas vs Wofford | ",
 "Upcoming Dec 2, 6:30 PM Women's · North Texas vs Baylor | ",
 "Upcoming Dec 5 Women's · North Texas at Seattle | ",
 "Upcoming Dec 14, 6:30 PM Women's · North Texas at Oklahoma State | ",
 "Upcoming Dec 18, 6:30 PM Women's · North Texas vs Alcorn State | ",
 "Upcoming Dec 22, 2:00 PM Women's · North Texas at Northern Colorado | ",
 "Upcoming Dec 30 Women's · North Texas vs South Florida | ",
 "Upcoming Jan 3 Women's · North Texas vs Florida Atlantic | ",
 "Upcoming Jan 6 Women's · North Texas at UTSA | ",
 "Upcoming Jan 9 Women's · North Texas at Rice | ",
 "Upcoming Jan 13 Women's · North Texas vs Wichita State | ",
 "Upcoming Jan 16 Women's · North Texas at Temple | ",
 "Upcoming Jan 23 Women's · North Texas vs Tulane | ",
 "Upcoming Jan 27 Women's · North Texas vs Tulsa | ",
 "Upcoming Jan 30 Women's · North Texas at Memphis | ",
 "Upcoming Feb 2 Women's · North Texas at UAB | ",
 "Upcoming Feb 10 Women's · North Texas vs Charlotte | ",
 "Upcoming Feb 13 Women's · North Texas vs UTSA | ",
 "Upcoming Feb 17 Women's · North Texas at Tulane | ",
 "Upcoming Feb 21 Women's · North Texas vs Temple | ",
 "Upcoming Feb 24 Women's · North Texas at Charlotte | ",
 "Upcoming Feb 27 Women's · North Texas at ECU | ",
 "Upcoming Mar 3 Women's · North Texas vs Rice | ",
 "Upcoming Mar 6 Women's · North Texas at Tulsa | ",
 "Upcoming Mar 9 Women's · North Texas at American Conference Championship | "
]);
  const v_trackandfield=parse("Cross Country","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Sep 4 North Texas at John McKenzie Invitational | Women's team: 3rd / Men's team: 1st",
 "Final Oct 3 North Texas at Chile Pepper Cross Country Festival | Women's team: 9th / Men's team: 2nd",
 "Final Oct 16 North Texas at Arturo Barrios Invitational | Women's team: 25th / Men's team: 18th",
 "Upcoming Oct 31 North Texas at American Conference Championship | ",
 "Upcoming Nov 13 North Texas at NCAA South Central Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 North Texas at Indiana | L, 16-52",
 "Final Sep 12 North Texas vs UNLV | W, 44-6",
 "Final Sep 19 North Texas at Texas State | L, 35-49",
 "Final Sep 26 North Texas vs Houston Christian | W, 63-14",
 "Final Oct 1 North Texas at Tulsa | W, 45-44",
 "Final Oct 10 North Texas vs Charlotte | W, 50-10",
 "Upcoming Oct 24, 2:30 PM North Texas at Navy | ",
 "Upcoming Oct 29, 6:30 PM North Texas vs Florida Atlantic | ",
 "Upcoming Nov 7 North Texas vs Rice | ",
 "Upcoming Nov 14 North Texas at UTSA | ",
 "Upcoming Nov 21 North Texas at Tulane | ",
 "Upcoming Nov 28 North Texas vs UAB | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · North Texas at The Bruzzy | 8th of 12",
 "Final Oct 3 Women's · North Texas at Blessings Collegiate Invitational | 6th of 9",
 "Final Oct 18 Women's · North Texas at Jim West Challenge | Completed",
 "Upcoming Jan 31 Women's · North Texas at Dominican Republic Classic | ",
 "Upcoming Feb 22 Women's · North Texas at Chevron Collegiate | ",
 "Upcoming Mar 15 Women's · North Texas at Jackrabbits Invitational | ",
 "Upcoming Mar 22 Women's · North Texas at Charles Schwab Women's Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · North Texas at The \"Mo\"Morial | ",
 "Upcoming Apr 19 Women's · North Texas at American Conference Championship | ",
 "Upcoming May 3 Women's · North Texas at NCAA Regionals | ",
 "Upcoming May 25 Women's · North Texas at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · North Texas at Island Resort Intercollegiate | 3rd of 12",
 "Final Sep 27 Men's · North Texas at Argent Financial Classic | 2nd of 14",
 "Final Oct 3 Men's · North Texas at Blessings Collegiate Invitational | 3rd of 9",
 "Final Oct 19 Men's · North Texas at The Clerico | Completed",
 "Upcoming Feb 7 Men's · North Texas at Compadres Collegiate | ",
 "Upcoming Feb 15 Men's · North Texas at The Prestige | ",
 "Upcoming Mar 8 Men's · North Texas at Louisiana Classics | ",
 "Upcoming Mar 15 Men's · North Texas at All-American Intercollegiate | ",
 "Upcoming Mar 30 Men's · North Texas at Maridoe Collegiate | ",
 "Upcoming Apr 12 Men's · North Texas at Mossy Oak Collegiate | ",
 "Upcoming Apr 26 Men's · North Texas at American Conference Championship | ",
 "Upcoming May 17 Men's · North Texas at NCAA Regionals | ",
 "Upcoming May 28 Men's · North Texas at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 North Texas vs Navarro College (Exhibition) | W, 9-0",
 "Final Aug 16 North Texas at SMU | L, 0-2",
 "Final Aug 20 North Texas vs ULM | W, 1-0",
 "Final Aug 23 North Texas at McNeese State | W, 4-2",
 "Final Aug 27 North Texas vs Oral Roberts | T, 1-1",
 "Final Aug 30 North Texas vs Air Force | L, 0-1",
 "Final Sep 3 North Texas vs Oklahoma | L, 2-6",
 "Final Sep 10 North Texas vs Nelson | W, 10-0",
 "Final Sep 13 North Texas at DePaul | W, 1-0",
 "Final Sep 17 North Texas vs South Florida | T, 1-1",
 "Final Sep 24 North Texas at Charlotte | L, 0-3",
 "Final Sep 27 North Texas vs Temple | T, 1-1",
 "Final Oct 1 North Texas at UAB | L, 0-3",
 "Final Oct 8 North Texas vs FAU | L, 0-2",
 "Final Oct 15 North Texas at Rice | T, 3-3",
 "Today Oct 22, 6:00 PM North Texas at East Carolina | ",
 "Upcoming Oct 25, 1:00 PM North Texas vs Memphis | ",
 "Upcoming Oct 30, 7:00 PM North Texas vs UTSA | ",
 "Upcoming Nov 3, 7:00 PM North Texas at Tulsa | ",
 "Upcoming Nov 8 North Texas at 2026 American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 5:00 PM North Texas vs Temple College (Exhibition) | ",
 "Upcoming Nov 4, 5:00 PM North Texas vs Trinity Valley Community College (Exhibition) | ",
 "Upcoming Nov 5, 5:00 PM North Texas vs Eastern Oklahoma State College (Exhibition) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 26 North Texas at Sam Freas Invite (Exhibition) | Completed",
 "Final Oct 9 North Texas at New Mexico State | L, 110-133",
 "Final Oct 10 North Texas at New Mexico | W, 126-117",
 "Upcoming Oct 30 North Texas at Houston Invite | ",
 "Upcoming Nov 12 North Texas at Texas Diving Invite | ",
 "Upcoming Nov 17 North Texas at Phil Hansel Invite | ",
 "Upcoming Jan 6 North Texas at FIU Sprint Invite | ",
 "Upcoming Jan 8 North Texas at FAU | ",
 "Upcoming Jan 21 North Texas vs Rice | ",
 "Upcoming Jan 23 North Texas vs UTRGV | ",
 "Upcoming Feb 17 North Texas at The American Championship | ",
 "Upcoming Mar 8 North Texas at NCAA Zone Diving Championships | ",
 "Upcoming Mar 11 North Texas at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17 North Texas at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 North Texas at ACU Invite | Completed",
 "Final Sep 19 North Texas at ITA All-American Championships | Completed",
 "Final Sep 25 North Texas at Lumberjack Classic | Completed",
 "Final Oct 8 North Texas at ITA Texas Regional | Completed",
 "Today Oct 22 North Texas at American Conference Individual Championship | ",
 "Upcoming Oct 23 North Texas at TCU Invite | ",
 "Upcoming Nov 6 North Texas at Tulsa Invite | "
]);
  const v_trackandfield_trackfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 13 North Texas vs DBU (Exhibition) | W, 4-1",
 "Final Aug 28 North Texas vs CSU Bakersfield | W, 3-1",
 "Final Aug 29 North Texas vs Lamar | W, 3-1",
 "Final Aug 29 North Texas at Abilene Christian | W, 3-1",
 "Final Sep 3 North Texas at Baylor | L, 0-3",
 "Final Sep 6 North Texas vs Florida | L, 0-3",
 "Final Sep 10 North Texas vs UT Arlington | L, 1-3",
 "Final Sep 11 North Texas at Stephen F. Austin | W, 3-1",
 "Final Sep 12 North Texas vs Texas State | W, 3-1",
 "Final Sep 17 North Texas vs Tarleton State | W, 3-0",
 "Final Sep 18 North Texas vs West Virginia | L, 1-3",
 "Final Sep 19 North Texas vs East Texas A&M | W, 3-2",
 "Final Sep 25 North Texas vs Florida Atlantic | W, 3-2",
 "Final Sep 27 North Texas vs Tulane | L, 0-3",
 "Final Oct 2 North Texas at East Carolina | L, 0-3",
 "Final Oct 4 North Texas at Charlotte | L, 2-3",
 "Final Oct 9 North Texas vs South Florida | W, 3-2",
 "Final Oct 11 North Texas at Temple | L, 2-3",
 "Final Oct 14 North Texas at UTSA | L, 0-3",
 "Final Oct 18 North Texas vs Tulsa | W, 3-1",
 "Upcoming Oct 23, 6:00 PM North Texas vs Rice | ",
 "Upcoming Oct 25, 1:00 PM North Texas vs UAB | ",
 "Upcoming Oct 30, 6:00 PM North Texas at Wichita State | ",
 "Upcoming Nov 1, 1:00 PM North Texas at Tulsa | ",
 "Upcoming Nov 6, 6:00 PM North Texas vs Wichita State | ",
 "Upcoming Nov 8, 1:00 PM North Texas at Memphis | ",
 "Upcoming Nov 11, 5:00 PM North Texas vs UTSA | ",
 "Upcoming Nov 13, 6:30 PM North Texas at UAB | ",
 "Upcoming Nov 20 North Texas at 2026 American Conference Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_trackandfield,"Cross Country track-and-field");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield_trackfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Texas module checks passed");
