import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utahTechSchool} from '../src/schools/utah-tech.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah-tech');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utahTechHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utah-tech-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utahtechtrailblazers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['utah-tech'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',utahTechSchool.scheduleUrls],['roster',utahTechSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utah-tech|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utahtechtrailblazers.com',`${key} must stay on utahtechtrailblazers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://utahtechtrailblazers.com/sports/baseball/schedule"],"roster":["https://utahtechtrailblazers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://utahtechtrailblazers.com/sports/mens-basketball/schedule","https://utahtechtrailblazers.com/sports/womens-basketball/schedule"],"roster":["https://utahtechtrailblazers.com/sports/mens-basketball/roster","https://utahtechtrailblazers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utahtechtrailblazers.com/sports/womens-cross-country/schedule","https://utahtechtrailblazers.com/sports/mens-cross-country/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-cross-country/roster","https://utahtechtrailblazers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://utahtechtrailblazers.com/sports/football/schedule"],"roster":["https://utahtechtrailblazers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utahtechtrailblazers.com/sports/womens-golf/schedule","https://utahtechtrailblazers.com/sports/mens-golf/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-golf/roster","https://utahtechtrailblazers.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://utahtechtrailblazers.com/sports/womens-soccer/schedule","https://utahtechtrailblazers.com/sports/mens-soccer/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-soccer/roster","https://utahtechtrailblazers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://utahtechtrailblazers.com/sports/softball/schedule"],"roster":["https://utahtechtrailblazers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://utahtechtrailblazers.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://utahtechtrailblazers.com/sports/womens-tennis/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://utahtechtrailblazers.com/sports/womens-track-and-field/schedule","https://utahtechtrailblazers.com/sports/mens-track-field/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-track-and-field/roster","https://utahtechtrailblazers.com/sports/mens-track-field/roster"],"combined":true},"Volleyball":{"schedule":["https://utahtechtrailblazers.com/sports/womens-volleyball/schedule"],"roster":["https://utahtechtrailblazers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'utah-tech|"+sport+"':"),`${sport} routes must live in the Utah Tech module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://utahtechtrailblazers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utahTechHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utah-tech)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Utah Tech vs Utah Valley (Exhibition) | W, 92-80",
 "Upcoming Oct 24, 7:00 PM Men's · Utah Tech vs West Coast Baptist College (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Utah Tech at New Mexico | ",
 "Upcoming Nov 4, 7:00 PM Men's · Utah Tech vs Grace | ",
 "Upcoming Nov 10, 7:00 PM Men's · Utah Tech at Utah State | ",
 "Upcoming Nov 14, 3:00 PM Men's · Utah Tech at Cal | ",
 "Upcoming Nov 19, 7:00 PM Men's · Utah Tech at Washington | ",
 "Upcoming Nov 22, 12:00 PM Men's · Utah Tech vs South Dakota | ",
 "Upcoming Nov 25, 2:00 PM Men's · Utah Tech vs Bethesda | ",
 "Upcoming Nov 28, 5:00 PM Men's · Utah Tech at Santa Clara | ",
 "Upcoming Dec 3, 7:00 PM Men's · Utah Tech vs Weber State | ",
 "Upcoming Dec 5, 7:00 PM Men's · Utah Tech vs Idaho State | ",
 "Upcoming Dec 10, 7:00 PM Men's · Utah Tech vs Justice | ",
 "Upcoming Dec 14, 7:00 PM Men's · Utah Tech vs Denver | ",
 "Upcoming Dec 18, 6:00 PM Men's · Utah Tech at UC Riverside | ",
 "Upcoming Dec 20, 3:00 PM Men's · Utah Tech at Cal State Fullerton | ",
 "Upcoming Dec 31, 7:00 PM Men's · Utah Tech at Idaho | ",
 "Upcoming Jan 2, 3:00 PM Men's · Utah Tech at Eastern Washington | ",
 "Upcoming Jan 7, 7:00 PM Men's · Utah Tech vs Portland State | ",
 "Upcoming Jan 9, 7:00 PM Men's · Utah Tech vs Northern Colorado | ",
 "Upcoming Jan 14, 6:00 PM Men's · Utah Tech at Northern Arizona | ",
 "Upcoming Jan 16, 7:00 PM Men's · Utah Tech vs Southern Utah | ",
 "Upcoming Jan 18, 7:00 PM Men's · Utah Tech vs Montana | ",
 "Upcoming Jan 25, 6:00 PM Men's · Utah Tech at Montana State | ",
 "Upcoming Jan 28, 7:00 PM Men's · Utah Tech at Idaho State | ",
 "Upcoming Jan 30, 1:00 PM Men's · Utah Tech at Weber State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Utah Tech vs Eastern Washington | ",
 "Upcoming Feb 6, 7:00 PM Men's · Utah Tech vs Idaho | ",
 "Upcoming Feb 11, 7:00 PM Men's · Utah Tech vs Northern Arizona | ",
 "Upcoming Feb 13, 6:30 PM Men's · Utah Tech at Southern Utah | ",
 "Upcoming Feb 18, 6:00 PM Men's · Utah Tech at Northern Colorado | ",
 "Upcoming Feb 20, 3:00 PM Men's · Utah Tech at Portland State | ",
 "Upcoming Feb 22, 7:00 PM Men's · Utah Tech at Montana | ",
 "Upcoming Mar 1, 7:00 PM Men's · Utah Tech vs Montana State | ",
 "Upcoming Mar 5 Men's · Utah Tech at Big Sky Tournament First Round | ",
 "Upcoming Mar 6 Men's · Utah Tech at Big Sky Tournament Second Round | ",
 "Upcoming Mar 7 Men's · Utah Tech at Big Sky Tournament Quarterfinals | ",
 "Upcoming Mar 9 Men's · Utah Tech at Big Sky Tournament Semifinals | ",
 "Upcoming Mar 10 Men's · Utah Tech at Big Sky Tournament Championship | ",
 "Upcoming Mar 16 Men's · Utah Tech at NCAA Tournament Opening Round | ",
 "Upcoming Mar 18 Men's · Utah Tech at NCAA Tournament First & Second Rounds | ",
 "Upcoming Mar 25 Men's · Utah Tech at Sweet 16 & Elite 8 | ",
 "Upcoming Apr 3 Men's · Utah Tech at Final Four | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Utah Tech vs Life Pacific | ",
 "Upcoming Nov 6, 6:00 PM Women's · Utah Tech vs California Baptist | ",
 "Upcoming Nov 11, 7:00 PM Women's · Utah Tech vs Nelson (AZ) | ",
 "Upcoming Nov 15, 1:00 PM Women's · Utah Tech at Boise State | ",
 "Upcoming Nov 18, 7:30 PM Women's · Utah Tech at CSU Bakersfield | ",
 "Upcoming Nov 20, 7:00 PM Women's · Utah Tech at UC Santa Barbara | ",
 "Upcoming Nov 25, 7:00 PM Women's · Utah Tech vs San Diego | ",
 "Upcoming Nov 30, 7:00 PM Women's · Utah Tech vs Park University Gilbert (AZ) | ",
 "Upcoming Dec 3, 6:00 PM Women's · Utah Tech at Weber State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Utah Tech at Idaho State | ",
 "Upcoming Dec 12, 1:00 PM Women's · Utah Tech vs Houston Christian | ",
 "Upcoming Dec 15, 4:00 PM Women's · Utah Tech at Colorado | ",
 "Upcoming Dec 19, 1:00 PM Women's · Utah Tech vs Cal Poly | ",
 "Upcoming Dec 21, 1:00 PM Women's · Utah Tech vs La Sierra | ",
 "Upcoming Dec 31, 2:00 PM Women's · Utah Tech vs Idaho | ",
 "Upcoming Jan 2, 1:00 PM Women's · Utah Tech vs Eastern Washington | ",
 "Upcoming Jan 7, 8:00 PM Women's · Utah Tech at Portland State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Utah Tech at Northern Colorado | ",
 "Upcoming Jan 14, 7:00 PM Women's · Utah Tech vs Northern Arizona | ",
 "Upcoming Jan 16, 2:00 PM Women's · Utah Tech at Southern Utah | ",
 "Upcoming Jan 18, 2:00 PM Women's · Utah Tech at Montana | ",
 "Upcoming Jan 25, 7:00 PM Women's · Utah Tech vs Montana State | ",
 "Upcoming Jan 28, 7:00 PM Women's · Utah Tech vs Idaho State | ",
 "Upcoming Jan 30, 1:00 PM Women's · Utah Tech vs Weber State | ",
 "Upcoming Feb 4 Women's · Utah Tech at Eastern Washington | ",
 "Upcoming Feb 6, 3:00 PM Women's · Utah Tech at Idaho | ",
 "Upcoming Feb 11, 6:00 PM Women's · Utah Tech at Northern Arizona | ",
 "Upcoming Feb 13, 1:00 PM Women's · Utah Tech vs Southern Utah | ",
 "Upcoming Feb 17, 7:00 PM Women's · Utah Tech vs Northern Colorado | ",
 "Upcoming Feb 20, 1:00 PM Women's · Utah Tech vs Portland State | ",
 "Upcoming Feb 22, 7:00 PM Women's · Utah Tech vs Montana | ",
 "Upcoming Mar 1, 7:00 PM Women's · Utah Tech at Montana State | ",
 "Upcoming Mar 5 Women's · Utah Tech at 2027 Big Sky Women's Basketball Championships | ",
 "Upcoming Mar 17 Women's · Utah Tech at 2027 NCAA Division I Women's Basketball Tournament Opening Round | ",
 "Upcoming Mar 19 Women's · Utah Tech at 2027 NCAA Division I Women's Basketball Tournament First/Second Rounds | ",
 "Upcoming Mar 26 Women's · Utah Tech at 2027 NCAA Division I Women's Basketball Tournament Regional Semifinals and Finals | ",
 "Upcoming Apr 2 Women's · Utah Tech at 2027 NCAA Division I Women's Basketball Tournament Final Four | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 2 Women's · Utah Tech at NAU George Kyte Classic | 3rd of 5",
 "Final Sep 19 Women's · Utah Tech at UC Riverside Invitational | 15th of 30",
 "Final Oct 3 Women's · Utah Tech at Southern Utah Color Country Invitational | 2nd of 6",
 "Final Oct 16 Women's · Utah Tech at Under Armour Pre-National Invitational | 13th of 26",
 "Upcoming Oct 30, 12:00 PM Women's · Utah Tech at Big Sky Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Utah Tech at NCAA West Regional Championships | ",
 "Upcoming Nov 21, 8:20 AM Women's · Utah Tech at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 2 Men's · Utah Tech at NAU George Kyte Classic | 2nd of 5",
 "Final Sep 19 Men's · Utah Tech at UC Riverside Invitational | 5th of 25",
 "Final Oct 3 Men's · Utah Tech at Southern Utah Color Country Invitational | 3rd of 6",
 "Final Oct 16 Men's · Utah Tech at Under Armour Pre-National Invitational | 41st of 44",
 "Upcoming Oct 30, 11:00 AM Men's · Utah Tech at Big Sky Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · Utah Tech at NCAA West Regional Championships | ",
 "Upcoming Nov 21, 9:10 AM Men's · Utah Tech at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Utah Tech vs Montana State | L, 0-54",
 "Final Sep 5 Utah Tech at BYU | L, 7-63",
 "Final Sep 12 Utah Tech at Montana | L, 14-35",
 "Final Sep 19 Utah Tech vs Northern Arizona | L, 23-35",
 "Final Sep 26 Utah Tech at Northern Colorado | L, 13-37",
 "Final Oct 3 Utah Tech vs Southern Utah | L, 33-46",
 "Final Oct 10 Utah Tech at Portland State | L, 14-30",
 "Upcoming Oct 24, 3:00 PM Utah Tech at Cal Poly | ",
 "Upcoming Oct 31, 1:00 PM Utah Tech vs Idaho State | ",
 "Upcoming Nov 7, 5:00 PM Utah Tech at UC Davis | ",
 "Upcoming Nov 14, 2:00 PM Utah Tech vs Eastern Washington | ",
 "Upcoming Nov 21, 1:00 PM Utah Tech at Weber State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Utah Tech at Utah Valley Wolverine Invitational | T8th of 10",
 "Final Sep 21 Women's · Utah Tech at Eastern Washington Kalispel Invitational | 9th of 14",
 "Final Oct 18 Women's · Utah Tech at Little Rock Diamante Invitational | T14th of 20",
 "Upcoming Oct 25 Women's · Utah Tech at Northern Arizona Clash at Boulder Creek | ",
 "Upcoming Feb 8 Women's · Utah Tech at Lehigh Ventura Harbor Collegiate | ",
 "Upcoming Feb 19 Women's · Utah Tech at Western Michigan Rio Verde Collegiate | ",
 "Upcoming Mar 5 Women's · Utah Tech at Southern Utah Pizza Hut Lady Thunderbird Invitational | ",
 "Upcoming Mar 22 Women's · Utah Tech at Minnesota Bell Bank Pay It Forward Collegiate | ",
 "Upcoming Apr 12 Women's · Utah Tech at Montana State Bobcat Desert Classic | ",
 "Upcoming Apr 21 Women's · Utah Tech at 2027 Big Sky Women's Golf Championships | ",
 "Upcoming May 10 Women's · Utah Tech at 2027 NCAA Division I Women's Golf Regionals | ",
 "Upcoming May 21 Women's · Utah Tech at 2027 NCAA Division I Women's Golf Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Utah Tech at Colorado State Ram Masters | T2nd of 16",
 "Final Sep 19 Men's · Utah Tech at Air Force Gene Miranda Falcon Invitational | 12th of 18",
 "Final Oct 12 Men's · Utah Tech at Pacific Visit Stockton Invitational | 17th of 18",
 "Upcoming Oct 26 Men's · Utah Tech at George Washington Monterrey Collegiate Classic | ",
 "Upcoming Feb 22 Men's · Utah Tech at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 5 Men's · Utah Tech at Idaho Bandon Dunes Championship | ",
 "Upcoming Mar 15 Men's · Utah Tech at Utah Tech Black Desert Collegiate | ",
 "Upcoming Mar 22 Men's · Utah Tech at UCLA Bruin Invitational | ",
 "Upcoming Apr 5 Men's · Utah Tech at Missouri Tiger Intercollegiate | ",
 "Upcoming Apr 26 Men's · Utah Tech at 2027 Big Sky Men's Golf Championships | ",
 "Upcoming May 17 Men's · Utah Tech at 2027 NCAA Division I Men's Golf Regionals | ",
 "Upcoming May 28 Men's · Utah Tech at 2027 NCAA Division I Men's Golf Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 Women's · Utah Tech at UNLV (Exhibition) | W, 3-2",
 "Final Aug 12 Women's · Utah Tech at UC Irvine | T, 1-1",
 "Final Aug 15 Women's · Utah Tech at UC San Diego | L, 2-4",
 "Final Aug 20 Women's · Utah Tech vs Westminster (Utah) | W, 3-1",
 "Final Aug 23 Women's · Utah Tech vs Portland | L, 0-3",
 "Final Aug 27 Women's · Utah Tech at UC Riverside | W, 1-0",
 "Final Aug 30 Women's · Utah Tech vs Utah | W, 2-1",
 "Final Sep 3 Women's · Utah Tech at Utah State | L, 1-8",
 "Final Sep 6 Women's · Utah Tech vs Colorado State | W, 1-0",
 "Final Sep 10 Women's · Utah Tech vs CSUN | L, 2-4",
 "Final Oct 1 Women's · Utah Tech vs Portland State | W, 2-1",
 "Final Oct 4 Women's · Utah Tech vs Montana | W, 2-0",
 "Final Oct 8 Women's · Utah Tech at Weber State | L, 0-5",
 "Final Oct 11 Women's · Utah Tech at Idaho State | W, 5-0",
 "Final Oct 15 Women's · Utah Tech vs Northern Colorado | T, 0-0",
 "Final Oct 18 Women's · Utah Tech vs Northern Arizona | L, 0-2",
 "Upcoming Oct 22, 8:00 PM Women's · Utah Tech at Idaho | ",
 "Upcoming Oct 25, 2:00 PM Women's · Utah Tech at Eastern Washington | ",
 "Upcoming Nov 5, 1:00 PM Women's · Utah Tech at Southern Utah | ",
 "Upcoming Nov 11 Women's · Utah Tech at Big Sky Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 8 Men's · Utah Tech vs Salt Lake Community College (Exhibition) | L, 0-2",
 "Final Aug 15 Men's · Utah Tech vs Mohave CC (Exhibition) | W, 2-0",
 "Final Aug 20 Men's · Utah Tech at CSU Bakersfield | L, 0-1",
 "Final Aug 23 Men's · Utah Tech vs Pacific | L, 2-3",
 "Final Aug 27 Men's · Utah Tech at Gonzaga | L, 0-3",
 "Final Aug 31 Men's · Utah Tech vs Sacramento State | W, 1-0",
 "Final Sep 10 Men's · Utah Tech at Cal Poly | L, 0-2",
 "Final Sep 13 Men's · Utah Tech vs UC San Diego | L, 0-2",
 "Final Sep 18 Men's · Utah Tech vs St. Thomas | L, 1-2",
 "Final Sep 21 Men's · Utah Tech vs Utah Valley | T, 1-1",
 "Final Sep 26 Men's · Utah Tech at Air Force | T, 1-1",
 "Final Sep 30 Men's · Utah Tech vs Grand Canyon | L, 1-3",
 "Final Oct 4 Men's · Utah Tech vs UC Davis | L, 0-2",
 "Final Oct 10 Men's · Utah Tech vs UNLV | L, 0-2",
 "Final Oct 14 Men's · Utah Tech vs San Jose State | L, 0-2",
 "Final Oct 18 Men's · Utah Tech at Grand Canyon | L, 0-2",
 "Upcoming Oct 23, 7:00 PM Men's · Utah Tech at UC Davis | ",
 "Upcoming Oct 28, 7:00 PM Men's · Utah Tech vs Air Force | ",
 "Upcoming Nov 1, 7:00 PM Men's · Utah Tech at San Jose State | ",
 "Upcoming Nov 6, 8:00 PM Men's · Utah Tech at UNLV | ",
 "Upcoming Nov 10 Men's · Utah Tech at Mountain West Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 21, 6:00 PM Utah Tech vs Crestmont | ",
 "Upcoming Oct 24, 1:00 PM Utah Tech at UNLV | ",
 "Upcoming Oct 24, 4:00 PM Utah Tech at College of Southern Nevada | ",
 "Upcoming Oct 30, 3:00 PM Utah Tech vs Snow College | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Utah Tech at Colorado Mesa Intermountain Shootout | Completed",
 "Final Oct 9 Women's · Utah Tech at Pepperdine Rodionoff Invitational | Completed",
 "Upcoming Nov 5, 5:00 PM Women's · Utah Tech at Utah | ",
 "Upcoming Nov 6, 4:00 PM Women's · Utah Tech at BYU | ",
 "Upcoming Nov 18 Women's · Utah Tech at Utah Tech Trailblazer Invitational | ",
 "Upcoming Dec 5 Women's · Utah Tech at Northern Arizona | ",
 "Upcoming Dec 17 Women's · Utah Tech vs New Mexico State | ",
 "Upcoming Jan 8, 11:00 AM Women's · Utah Tech at San Diego State Tri-Dual (w/Pepperdine) | ",
 "Upcoming Jan 22, 5:00 PM Women's · Utah Tech vs Northern Arizona | ",
 "Upcoming Feb 17 Women's · Utah Tech at 2027 MPSF Women's Swimming Championships | ",
 "Upcoming Mar 17 Women's · Utah Tech at 2027 NCAA Division I Women's Swimming Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Utah Tech at Idaho State Fall Invitational | Completed",
 "Final Sep 25 Utah Tech at Lumberjack Classic | Completed",
 "Final Oct 2 Utah Tech at Big Sky Individual Championships | Completed",
 "Final Oct 13 Utah Tech at ITA Mountain Regionals | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackfield=parse("Track & Field","mens-track-field");
  assert.deepEqual(v_menstrackfield.map(line),[
 "Upcoming Feb 25 Men's · Utah Tech at Big Sky Indoor Track & Field Championships | ",
 "Upcoming May 12 Men's · Utah Tech at Big Sky Outdoor Track & Field Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Utah Tech vs UNLV (Exhibition) | L, 2-3",
 "Final Aug 22 Utah Tech at BYU (Exhibition) | L, 0-3",
 "Final Aug 28 Utah Tech at Utah Valley | W, 3-1",
 "Final Aug 28 Utah Tech vs Oregon State | W, 3-0",
 "Final Aug 29 Utah Tech vs Utah | L, 0-3",
 "Final Sep 3 Utah Tech at Hawaii | L, 0-3",
 "Final Sep 4 Utah Tech vs UC San Diego | W, 3-2",
 "Final Sep 6 Utah Tech vs Loyola Marymount | L, 1-3",
 "Final Sep 11 Utah Tech vs San Jose State | W, 3-0",
 "Final Sep 12 Utah Tech at UC Irvine | W, 3-0",
 "Final Sep 18 Utah Tech vs UC Riverside | W, 3-0",
 "Final Sep 19 Utah Tech vs Chicago State | W, 3-0",
 "Final Sep 24 Utah Tech at Portland State | W, 3-0",
 "Final Sep 26 Utah Tech at Northern Arizona | W, 3-2",
 "Final Sep 29 Utah Tech vs Southern Utah | W, 3-1",
 "Final Oct 1 Utah Tech vs Northern Colorado | W, 3-1",
 "Final Oct 8 Utah Tech vs Weber State | W, 3-1",
 "Final Oct 10 Utah Tech vs Idaho State | W, 3-0",
 "Final Oct 15 Utah Tech at Montana State | W, 3-2",
 "Final Oct 17 Utah Tech at Montana | W, 3-0",
 "Upcoming Oct 22, 6:00 PM Utah Tech vs Idaho | ",
 "Upcoming Oct 24, 3:00 PM Utah Tech at Eastern Washington | ",
 "Upcoming Oct 29, 6:00 PM Utah Tech vs Montana | ",
 "Upcoming Oct 30, 7:00 PM Utah Tech vs Montana State | ",
 "Upcoming Nov 5, 7:00 PM Utah Tech at Idaho State | ",
 "Upcoming Nov 7, 1:00 PM Utah Tech at Weber State | ",
 "Upcoming Nov 10, 6:30 PM Utah Tech at Southern Utah | ",
 "Upcoming Nov 13, 6:00 PM Utah Tech at Northern Colorado | ",
 "Upcoming Nov 18, 6:00 PM Utah Tech vs Northern Arizona | ",
 "Upcoming Nov 20, 6:00 PM Utah Tech vs Portland State | ",
 "Upcoming Nov 23, 10:00 AM Utah Tech at Big Sky Tournament Quarterfinals | ",
 "Upcoming Nov 24, 4:00 PM Utah Tech at Big Sky Tournament Semifinals | ",
 "Upcoming Nov 25, 6:00 PM Utah Tech at Big Sky Tournament Championship | ",
 "Upcoming Dec 3 Utah Tech at NCAA First & Second Rounds | ",
 "Upcoming Dec 10 Utah Tech at NCAA Sweet 16 & Elite 8 | ",
 "Upcoming Dec 17 Utah Tech at NCAA Semifinals | ",
 "Upcoming Dec 20 Utah Tech at NCAA Tournament Finals | "
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
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackfield,"Track & Field mens-track-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Utah Tech module checks passed");
