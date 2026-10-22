import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {calBaptistSchool} from '../src/schools/cal-baptist.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='cal-baptist');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,calBaptistHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cal-baptist-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cbulancers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['cal-baptist'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',calBaptistSchool.scheduleUrls],['roster',calBaptistSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cal-baptist|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cbulancers.com',`${key} must stay on cbulancers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://cbulancers.com/sports/baseball/schedule"],"roster":["https://cbulancers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://cbulancers.com/sports/mens-basketball/schedule","https://cbulancers.com/sports/womens-basketball/schedule"],"roster":["https://cbulancers.com/sports/mens-basketball/roster","https://cbulancers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://cbulancers.com/sports/xctrack/schedule"],"roster":["https://cbulancers.com/sports/xctrack/roster"],"combined":false},"Golf":{"schedule":["https://cbulancers.com/sports/womens-golf/schedule"],"roster":["https://cbulancers.com/sports/womens-golf/roster"],"combined":false},"STUNT":{"schedule":["https://cbulancers.com/sports/stunt/schedule"],"roster":["https://cbulancers.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://cbulancers.com/sports/womens-soccer/schedule","https://cbulancers.com/sports/mens-soccer/schedule"],"roster":["https://cbulancers.com/sports/womens-soccer/roster","https://cbulancers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://cbulancers.com/sports/softball/schedule"],"roster":["https://cbulancers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://cbulancers.com/sports/womens-swim/schedule"],"roster":["https://cbulancers.com/sports/womens-swim/roster"],"combined":false},"Track & Field":{"schedule":["https://cbulancers.com/sports/xctrack/schedule"],"roster":["https://cbulancers.com/sports/xctrack/roster"],"combined":false},"Volleyball":{"schedule":["https://cbulancers.com/sports/womens-volleyball/schedule"],"roster":["https://cbulancers.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://cbulancers.com/sports/womens-water-polo/schedule","https://cbulancers.com/sports/mens-water-polo/schedule"],"roster":["https://cbulancers.com/sports/womens-water-polo/roster","https://cbulancers.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'cal-baptist|"+sport+"':"),`${sport} routes must live in the California Baptist module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://cbulancers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.calBaptistHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=cal-baptist)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Cal Baptist at UCLA (Exhibition) | L, 53-100",
 "Upcoming Nov 3, 7:00 PM Men's · Cal Baptist vs North Florida | ",
 "Upcoming Nov 6, 6:30 PM Men's · Cal Baptist at Oregon State | ",
 "Upcoming Nov 11, 7:00 PM Men's · Cal Baptist vs Chicago State | ",
 "Upcoming Nov 13, 7:30 PM Men's · Cal Baptist vs Arkansas - Pine Bluff | ",
 "Upcoming Nov 17, 7:00 PM Men's · Cal Baptist vs Seattle | ",
 "Upcoming Nov 21, 4:00 PM Men's · Cal Baptist vs LMU | ",
 "Upcoming Nov 22, 4:00 PM Men's · Cal Baptist vs Portland | ",
 "Upcoming Dec 3, 7:30 PM Men's · Cal Baptist at UC San Diego | ",
 "Upcoming Dec 5 Men's · Cal Baptist at UC Riverside | ",
 "Upcoming Dec 9, 6:00 PM Men's · Cal Baptist at Utah | ",
 "Upcoming Dec 14, 6:00 PM Men's · Cal Baptist at UC Davis | ",
 "Upcoming Dec 21, 3:00 PM Men's · Cal Baptist at Purdue | ",
 "Upcoming Dec 31, 6:00 PM Men's · Cal Baptist vs UC Santa Barbara | ",
 "Upcoming Jan 2, 5:00 PM Men's · Cal Baptist vs Cal Poly | ",
 "Upcoming Jan 7, 7:00 PM Men's · Cal Baptist at CSUN | ",
 "Upcoming Jan 9, 2:00 PM Men's · Cal Baptist at CSU Bakersfield | ",
 "Upcoming Jan 14, 7:00 PM Men's · Cal Baptist vs UC Irvine | ",
 "Upcoming Jan 16, 7:00 PM Men's · Cal Baptist vs UC San Diego | ",
 "Upcoming Jan 21, 5:00 PM Men's · Cal Baptist at Utah Valley | ",
 "Upcoming Jan 23, 7:00 PM Men's · Cal Baptist at Sacramento State | ",
 "Upcoming Jan 28, 7:00 PM Men's · Cal Baptist vs Long Beach State | ",
 "Upcoming Jan 30, 5:00 PM Men's · Cal Baptist vs Cal State Fullerton | ",
 "Upcoming Feb 4, 7:00 PM Men's · Cal Baptist vs Sacramento State | ",
 "Upcoming Feb 6, 5:00 PM Men's · Cal Baptist vs Utah Valley | ",
 "Upcoming Feb 11, 7:00 PM Men's · Cal Baptist at Cal Poly | ",
 "Upcoming Feb 13, 6:00 PM Men's · Cal Baptist at UC Santa Barbara | ",
 "Upcoming Feb 18, 7:00 PM Men's · Cal Baptist at UC Irvine | ",
 "Upcoming Feb 20, 7:30 PM Men's · Cal Baptist vs UC Riverside | ",
 "Upcoming Feb 25, 7:00 PM Men's · Cal Baptist vs CSU Bakersfield | ",
 "Upcoming Feb 27, 5:00 PM Men's · Cal Baptist vs CSUN | ",
 "Upcoming Mar 4, 7:00 PM Men's · Cal Baptist at Cal State Fullerton | ",
 "Upcoming Mar 6, 6:00 PM Men's · Cal Baptist at Long Beach State | ",
 "Upcoming Mar 10 Men's · Cal Baptist at Big West Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 6:00 PM Women's · Cal Baptist at Oregon State | ",
 "Upcoming Nov 6, 6:00 PM Women's · Cal Baptist at Utah Tech | ",
 "Upcoming Nov 13, 5:00 PM Women's · Cal Baptist vs Pacific | ",
 "Upcoming Nov 18, 12:00 PM Women's · Cal Baptist at San Jose State | ",
 "Upcoming Nov 20, 5:00 PM Women's · Cal Baptist at UC Davis | ",
 "Upcoming Nov 27, 12:00 PM Women's · Cal Baptist vs Idaho | ",
 "Upcoming Nov 28, 12:00 PM Women's · Cal Baptist vs St. Thomas | ",
 "Upcoming Dec 3, 5:00 PM Women's · Cal Baptist at UC San Diego | ",
 "Upcoming Dec 5, 1:00 PM Women's · Cal Baptist at UC Riverside | ",
 "Upcoming Dec 9, 6:00 PM Women's · Cal Baptist vs Pepperdine | ",
 "Upcoming Dec 12, 3:30 PM Women's · Cal Baptist at BYU | ",
 "Upcoming Dec 18, 1:00 PM Women's · Cal Baptist vs Howard | ",
 "Upcoming Dec 31, 6:00 PM Women's · Cal Baptist at UC Santa Barbara | ",
 "Upcoming Jan 2, 2:00 PM Women's · Cal Baptist at Cal Poly | ",
 "Upcoming Jan 7, 6:00 PM Women's · Cal Baptist vs CSUN | ",
 "Upcoming Jan 9, 1:00 PM Women's · Cal Baptist vs CSU Bakersfield | ",
 "Upcoming Jan 14, 6:00 PM Women's · Cal Baptist at UC Irvine | ",
 "Upcoming Jan 16, 4:30 PM Women's · Cal Baptist vs UC San Diego | ",
 "Upcoming Jan 21, 11:00 AM Women's · Cal Baptist vs Utah Valley | ",
 "Upcoming Jan 23, 1:00 PM Women's · Cal Baptist vs Sacramento State | ",
 "Upcoming Jan 28, 6:00 PM Women's · Cal Baptist at Long Beach State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Cal Baptist at Cal State Fullerton | ",
 "Upcoming Feb 4, 6:30 PM Women's · Cal Baptist at Sacramento State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Cal Baptist at Utah Valley | ",
 "Upcoming Feb 11, 6:00 PM Women's · Cal Baptist vs Cal Poly | ",
 "Upcoming Feb 13, 1:00 PM Women's · Cal Baptist vs UC Santa Barbara | ",
 "Upcoming Feb 18, 6:00 PM Women's · Cal Baptist vs UC Irvine | ",
 "Upcoming Feb 20, 5:00 PM Women's · Cal Baptist vs UC Riverside | ",
 "Upcoming Feb 25, 6:30 PM Women's · Cal Baptist at CSU Bakersfield | ",
 "Upcoming Feb 27, 2:00 PM Women's · Cal Baptist at CSUN | ",
 "Upcoming Mar 4, 6:00 PM Women's · Cal Baptist vs Cal State Fullerton | ",
 "Upcoming Mar 6, 1:00 PM Women's · Cal Baptist vs Long Beach State | ",
 "Upcoming Mar 10 Women's · Cal Baptist at Big West Basketball Championships | "
]);
  const v_xctrack=parse("Cross Country","xctrack");
  assert.deepEqual(v_xctrack.map(line),[
 "Final Sep 4 Cal Baptist at USF Invite | Women's team: 4th / Men's team: 1st",
 "Final Sep 19 Cal Baptist at UCR Invite | Women's team: 6th / Men's team: 23rd",
 "Final Sep 19 Cal Baptist at John McNichols Invitational | Women's team: 17th / Men's team: 14th",
 "Final Oct 3 Cal Baptist at Cougar Challenge | Women's team: 1st / Men's team: 1st",
 "Final Oct 16 Cal Baptist at Under Armour Pre-National Invitational | Women's team: 33rd / Men's team: 10th",
 "Final Oct 17 Cal Baptist at Highlander Invitational | Women's team: 7th / Men's team: 4th",
 "Upcoming Oct 31 Cal Baptist at Big West Conference Championship | ",
 "Upcoming Nov 13, 10:00 AM Cal Baptist at NCAA West Regionals | ",
 "Upcoming Nov 21, 10:00 AM Cal Baptist at NCAA National Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Cal Baptist at Yellowstone Intercollegiate | 5th of 11",
 "Final Oct 5 Cal Baptist at Pat Lesser Harbottle Invite | 5th of 17",
 "Final Oct 18 Cal Baptist at Diamante Intercollegiate | 2nd of 20",
 "Upcoming Oct 25 Cal Baptist at The Clash at Boulder Creek | ",
 "Upcoming Feb 2 Cal Baptist at The Socal Ryder Cup | ",
 "Upcoming Feb 8 Cal Baptist at Ventura Habor Collegiate Championship | ",
 "Upcoming Feb 15 Cal Baptist at The Molly Collegiate Invitational | ",
 "Upcoming Mar 2 Cal Baptist at GCU Invitational | ",
 "Upcoming Mar 14 Cal Baptist at MSU SoCal Spring Invitational | ",
 "Upcoming Apr 12 Cal Baptist at Bobcat Desert Classic | ",
 "Upcoming Apr 18 Cal Baptist at Big West Conference Championship | ",
 "Upcoming May 10 Cal Baptist at NCAA West Regional Tournament | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Cal Baptist at California | T, 0-0",
 "Final Aug 20 Women's · Cal Baptist vs Portland State | W, 2-0",
 "Final Aug 23 Women's · Cal Baptist vs UNLV | W, 1-0",
 "Final Aug 27 Women's · Cal Baptist vs UC Santa Barbara | W, 2-0",
 "Final Sep 3 Women's · Cal Baptist vs North Alabama | W, 3-0",
 "Final Sep 17 Women's · Cal Baptist vs San Diego | W, 1-0",
 "Final Sep 23 Women's · Cal Baptist at Cal Poly | L, 1-2",
 "Final Sep 26 Women's · Cal Baptist at UC Riverside | W, 2-0",
 "Final Sep 30 Women's · Cal Baptist vs UC San Diego | T, 0-0",
 "Final Oct 3 Women's · Cal Baptist vs UC Santa Barbara | T, 0-0",
 "Final Oct 10 Women's · Cal Baptist at Long Beach State | L, 0-1",
 "Final Oct 14 Women's · Cal Baptist vs Utah Valley | L, 0-1",
 "Final Oct 17 Women's · Cal Baptist at CSUN | T, 0-0",
 "Final Oct 21 Women's · Cal Baptist vs UC Irvine | W, 4-0",
 "Upcoming Oct 24, 7:00 PM Women's · Cal Baptist vs CSU Bakersfield | ",
 "Upcoming Oct 28, 3:00 PM Women's · Cal Baptist at Sacramento State | ",
 "Upcoming Oct 31, 1:00 PM Women's · Cal Baptist at Cal State Fullerton | ",
 "Upcoming Nov 4 Women's · Cal Baptist at Big West Quarterfinals | ",
 "Upcoming Nov 7 Women's · Cal Baptist at Big West Semifinals | ",
 "Upcoming Nov 14 Women's · Cal Baptist at Big West Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Cal Baptist at Campbell | W, 2-0",
 "Final Aug 23 Men's · Cal Baptist at Duke | L, 1-3",
 "Final Aug 31 Men's · Cal Baptist vs Denver | W, 2-0",
 "Final Sep 5 Men's · Cal Baptist vs San Diego | L, 1-2",
 "Final Sep 11 Men's · Cal Baptist at LMU | W, 1-0",
 "Final Sep 16 Men's · Cal Baptist at Grand Canyon | W, 1-0",
 "Final Sep 20 Men's · Cal Baptist vs Pacific | W, 2-0",
 "Final Sep 24 Men's · Cal Baptist at UC Irvine | W, 1-0",
 "Final Sep 30 Men's · Cal Baptist at Gonzaga | W, 5-2",
 "Final Oct 4 Men's · Cal Baptist at Cal Poly | W, 3-1",
 "Final Oct 7 Men's · Cal Baptist vs Oregon State | L, 1-4",
 "Final Oct 10 Men's · Cal Baptist vs UC Riverside | W, 2-0",
 "Final Oct 14 Men's · Cal Baptist at Cal State Fullerton | W, 3-1",
 "Final Oct 17 Men's · Cal Baptist vs San Diego State | T, 0-0",
 "Upcoming Oct 21, 7:00 PM Men's · Cal Baptist at UC Santa Barbara | ",
 "Upcoming Oct 24, 7:00 PM Men's · Cal Baptist at UC San Diego | ",
 "Upcoming Oct 27, 7:00 PM Men's · Cal Baptist at UC Santa Barbara | ",
 "Upcoming Oct 31, 2:00 PM Men's · Cal Baptist vs UC Irvine | ",
 "Upcoming Nov 7 Men's · Cal Baptist at Pac-12 Semifinals | ",
 "Upcoming Nov 13 Men's · Cal Baptist at Pac-12 Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Feb 11, 3:00 PM Cal Baptist vs NC State | ",
 "Upcoming Feb 12, 1:00 PM Cal Baptist vs Auburn | ",
 "Upcoming Feb 12, 4:00 PM Cal Baptist vs Wisconsin | ",
 "Upcoming Feb 13, 7:00 AM Cal Baptist vs Notre Dame | ",
 "Upcoming Feb 13, 9:00 AM Cal Baptist vs North Carolina | ",
 "Upcoming Feb 18, 6:00 PM Cal Baptist vs Boise State | ",
 "Upcoming Feb 19 Cal Baptist at CBU Classic (Game 1) | ",
 "Upcoming Feb 19 Cal Baptist at CBU Classic (Game 2) | ",
 "Upcoming Feb 20 Cal Baptist at CBU Classic (Game 1) | ",
 "Upcoming Feb 20 Cal Baptist at CBU Classic (Game 2) | ",
 "Upcoming Feb 22 Cal Baptist vs Nevada | ",
 "Upcoming Feb 25 Cal Baptist at Mary Nutter Collegiate Classic (Game 1) | ",
 "Upcoming Feb 25 Cal Baptist at Mary Nutter Collegiate Classic (Game 2) | ",
 "Upcoming Feb 26 Cal Baptist at Mary Nutter Collegiate Classic (Game 1) | ",
 "Upcoming Feb 26 Cal Baptist at Mary Nutter Collegiate Classic (Game 2) | ",
 "Upcoming Feb 27 Cal Baptist at Mary Nutter Collegiate Classic | ",
 "Upcoming Mar 4 Cal Baptist at Judi Garman Classic | ",
 "Upcoming Mar 5 Cal Baptist at Judi Garman Classic (Game 1) | ",
 "Upcoming Mar 5 Cal Baptist at Judi Garman Classic (Game 2) | ",
 "Upcoming Mar 6 Cal Baptist at Judi Garman Classic | ",
 "Upcoming Mar 8 Cal Baptist vs Weber State | ",
 "Upcoming Mar 10, 4:00 PM Cal Baptist vs Idaho State (Game 1) | ",
 "Upcoming Mar 10, 6:00 PM Cal Baptist vs Idaho State (Game 2) | ",
 "Upcoming Mar 12 Cal Baptist vs CSU Bakersfield (Game 1) | ",
 "Upcoming Mar 12 Cal Baptist vs CSU Bakersfield (Game 2) | ",
 "Upcoming Mar 13 Cal Baptist vs CSU Bakersfield | ",
 "Upcoming Mar 16, 6:00 PM Cal Baptist at LMU | ",
 "Upcoming Mar 19 Cal Baptist at CSUN (Game 1) | ",
 "Upcoming Mar 19 Cal Baptist at CSUN (Game 2) | ",
 "Upcoming Mar 20 Cal Baptist at CSUN | ",
 "Upcoming Mar 23, 6:00 PM Cal Baptist vs UCLA | ",
 "Upcoming Mar 25, 4:00 PM Cal Baptist vs Pacific | ",
 "Upcoming Mar 25, 6:30 PM Cal Baptist vs Seattle | ",
 "Upcoming Mar 26, 6:00 PM Cal Baptist vs Seattle | ",
 "Upcoming Mar 27, 3:00 PM Cal Baptist vs Pacific | ",
 "Upcoming Apr 2 Cal Baptist at UC Santa Barbara (Game 1) | ",
 "Upcoming Apr 2 Cal Baptist at UC Santa Barbara (Game 2) | ",
 "Upcoming Apr 3 Cal Baptist at UC Santa Barbara | ",
 "Upcoming Apr 6, 6:00 PM Cal Baptist vs San Diego State | ",
 "Upcoming Apr 9 Cal Baptist vs UC San Diego (Game 1) | ",
 "Upcoming Apr 9 Cal Baptist vs UC San Diego (Game 2) | ",
 "Upcoming Apr 10 Cal Baptist vs UC San Diego | ",
 "Upcoming Apr 16 Cal Baptist at Cal State Fullerton (Game 1) | ",
 "Upcoming Apr 16 Cal Baptist at Cal State Fullerton (Game 2) | ",
 "Upcoming Apr 17 Cal Baptist at Cal State Fullerton | ",
 "Upcoming Apr 23 Cal Baptist vs UC Riverside (Game 1) | ",
 "Upcoming Apr 23 Cal Baptist vs UC Riverside (Game 2) | ",
 "Upcoming Apr 24 Cal Baptist vs UC Riverside | ",
 "Upcoming Apr 28, 5:00 PM Cal Baptist at UNLV | ",
 "Upcoming May 1 Cal Baptist at Utah Valley (Game 1) | ",
 "Upcoming May 1 Cal Baptist at Utah Valley (Game 2) | ",
 "Upcoming May 2 Cal Baptist at Utah Valley | ",
 "Upcoming May 7 Cal Baptist vs Long Beach State (Game 1) | ",
 "Upcoming May 7 Cal Baptist vs Long Beach State (Game 2) | ",
 "Upcoming May 8 Cal Baptist vs Long Beach State | ",
 "Upcoming May 12 Cal Baptist at Big West Conference Championship | "
]);
  const v_womensswim=parse("Swimming & Diving","womens-swim");
  assert.deepEqual(v_womensswim.map(line),[
 "Final Oct 9 Cal Baptist at Rodionoff Invite | Completed",
 "Final Oct 17 Cal Baptist at MPSF Open Water Championship | Completed",
 "Upcoming Oct 24 Cal Baptist at Pomona-Pitzer Invite | ",
 "Upcoming Nov 6, 11:00 AM Cal Baptist at Rick Rowland Joust | ",
 "Upcoming Nov 18 Cal Baptist at Trailblazer Invite | ",
 "Upcoming Dec 18, 2:00 PM Cal Baptist at Hawaii | ",
 "Upcoming Jan 8 Cal Baptist vs Colorado State | ",
 "Upcoming Jan 9, 12:00 PM Cal Baptist at UC San Diego | ",
 "Upcoming Jan 15, 1:00 PM Cal Baptist at Claremont-Mudd-Scripps Colleges | ",
 "Upcoming Jan 16, 1:00 PM Cal Baptist at Grand Canyon | ",
 "Upcoming Jan 30, 12:00 PM Cal Baptist at Fresno State | ",
 "Upcoming Feb 24 Cal Baptist at Pac-12 Swimming & Diving Championship | "
]);
  const v_xctrack_trackfield=parse("Track & Field","xctrack");
  assert.deepEqual(v_xctrack_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Cal Baptist at New Mexico | W, 3-1",
 "Final Aug 29 Cal Baptist at New Mexico State | L, 0-3",
 "Final Sep 3 Cal Baptist at Oregon State | L, 0-3",
 "Final Sep 4 Cal Baptist vs Seattle | W, 3-1",
 "Final Sep 5 Cal Baptist vs Montana | L, 2-3",
 "Final Sep 10 Cal Baptist vs North Dakota | L, 2-3",
 "Final Sep 11 Cal Baptist vs Sacred Heart | L, 1-3",
 "Final Sep 12 Cal Baptist vs Idaho | L, 2-3",
 "Final Sep 17 Cal Baptist vs Northern Arizona | L, 1-3",
 "Final Sep 18 Cal Baptist vs Texas Southern | W, 3-0",
 "Final Sep 19 Cal Baptist at San Francisco | L, 0-3",
 "Final Sep 24 Cal Baptist at Sacramento State | L, 0-3",
 "Final Sep 26 Cal Baptist at Utah Valley | L, 2-3",
 "Final Oct 1 Cal Baptist vs UC San Diego | L, 1-3",
 "Final Oct 3 Cal Baptist vs UC Irvine | L, 2-3",
 "Final Oct 9 Cal Baptist vs CSU Bakersfield | L, 0-3",
 "Final Oct 10 Cal Baptist vs CSUN | L, 1-3",
 "Final Oct 16 Cal Baptist at Cal Poly | L, 2-3",
 "Final Oct 17 Cal Baptist at California Santa Barbara | L, 2-3",
 "Upcoming Oct 23, 6:00 PM Cal Baptist at UC Riverside | ",
 "Upcoming Oct 24, 6:00 PM Cal Baptist vs UC Riverside | ",
 "Upcoming Oct 30, 6:00 PM Cal Baptist vs Utah Valley | ",
 "Upcoming Oct 31, 6:00 PM Cal Baptist vs Sacramento State | ",
 "Upcoming Nov 5, 6:00 PM Cal Baptist at CSUN | ",
 "Upcoming Nov 7, 6:00 PM Cal Baptist at CSU Bakersfield | ",
 "Upcoming Nov 13, 6:00 PM Cal Baptist at Cal State Fullerton | ",
 "Upcoming Nov 14, 6:00 PM Cal Baptist at Long Beach State | ",
 "Upcoming Nov 20, 6:00 PM Cal Baptist vs California Santa Barbara | ",
 "Upcoming Nov 21, 4:00 PM Cal Baptist vs Cal Poly | ",
 "Upcoming Nov 25 Cal Baptist at Big West Conference Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Jan 15, 12:10 PM Women's · Cal Baptist vs Pacific | ",
 "Upcoming Jan 15, 5:40 PM Women's · Cal Baptist vs Biola (Calif.) | ",
 "Upcoming Jan 16, 9:45 AM Women's · Cal Baptist vs Southern California | ",
 "Upcoming Jan 16, 4:45 PM Women's · Cal Baptist vs Fresno Pacific (Calif.) | ",
 "Upcoming Jan 22, 5:00 PM Women's · Cal Baptist at Arizona State | ",
 "Upcoming Jan 23, 10:15 AM Women's · Cal Baptist vs McKendree | ",
 "Upcoming Jan 23, 3:15 PM Women's · Cal Baptist vs Michigan | ",
 "Upcoming Jan 24, 10:30 AM Women's · Cal Baptist vs Princeton | ",
 "Upcoming Jan 30 Women's · Cal Baptist at Lancer Mini Invite | ",
 "Upcoming Feb 6, 1:00 PM Women's · Cal Baptist at San Diego State | ",
 "Upcoming Feb 13, 10:00 AM Women's · Cal Baptist vs UC San Diego | ",
 "Upcoming Feb 20, 2:00 PM Women's · Cal Baptist at Concordia University Irvine | ",
 "Upcoming Feb 27, 3:00 PM Women's · Cal Baptist vs Virginia Military Institute | ",
 "Upcoming Feb 28, 9:00 AM Women's · Cal Baptist vs LIU | ",
 "Upcoming Feb 28, 11:30 AM Women's · Cal Baptist vs Marist | ",
 "Upcoming Mar 4, 1:00 PM Women's · Cal Baptist vs Mount Saint Mary College (NY) | ",
 "Upcoming Mar 6, 2:00 PM Women's · Cal Baptist at California Santa Barbara | ",
 "Upcoming Mar 10, 9:00 PM Women's · Cal Baptist at Hawaii | ",
 "Upcoming Mar 19, 6:00 PM Women's · Cal Baptist vs Long Beach State | ",
 "Upcoming Mar 20, 3:00 PM Women's · Cal Baptist vs Cal State Fullerton | ",
 "Upcoming Mar 27, 12:00 PM Women's · Cal Baptist at CSUN | ",
 "Upcoming Apr 3, 12:00 PM Women's · Cal Baptist vs UC Irvine | ",
 "Upcoming Apr 9 Women's · Cal Baptist at Big West Conference Championship | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Cal Baptist vs Wagner College | W, 21-8",
 "Final Aug 28 Men's · Cal Baptist at Brown | L, 14-16",
 "Final Aug 29 Men's · Cal Baptist at Harvard | W, 16-15",
 "Final Aug 29 Men's · Cal Baptist vs MIT | W, 21-7",
 "Final Sep 4 Men's · Cal Baptist vs Concordia University Irvine | W, 21-8",
 "Final Sep 4 Men's · Cal Baptist vs California Lutheran | W, 20-10",
 "Final Sep 5 Men's · Cal Baptist vs Redlands | W, 18-7",
 "Final Sep 5 Men's · Cal Baptist vs Fresno Pacific (Calif.) | W, 16-6",
 "Final Sep 10 Men's · Cal Baptist vs Redlands | W, 15-8",
 "Final Sep 10 Men's · Cal Baptist vs Biola (Calif.) | W, 17-9",
 "Final Sep 18 Men's · Cal Baptist vs Southern California | L, 13-17",
 "Final Sep 19 Men's · Cal Baptist vs Princeton | L, 8-12",
 "Final Sep 19 Men's · Cal Baptist vs Santa Clara | W, 16-11",
 "Final Sep 20 Men's · Cal Baptist vs UC Davis | W, 17-16",
 "Final Sep 25 Men's · Cal Baptist vs Cal State Fullerton | W, 17-6",
 "Final Sep 25 Men's · Cal Baptist vs Toronto | W, 18-8",
 "Final Sep 26 Men's · Cal Baptist vs Toronto | W, 20-7",
 "Final Sep 26 Men's · Cal Baptist vs Fresno Pacific (Calif.) | W, 24-11",
 "Final Sep 28 Men's · Cal Baptist vs Fordham | L, 6-10",
 "Final Oct 2 Men's · Cal Baptist vs Pomona-Pitzer | W, 10-5",
 "Final Oct 2 Men's · Cal Baptist vs Air Force | W, 15-8",
 "Final Oct 3 Men's · Cal Baptist vs Chapman | W, 24-9",
 "Final Oct 3 Men's · Cal Baptist vs Biola (Calif.) | W, 15-7",
 "Final Oct 10 Men's · Cal Baptist at California Santa Barbara | W, 14-12",
 "Final Oct 10 Men's · Cal Baptist at UCLA | L, 9-21",
 "Final Oct 17 Men's · Cal Baptist vs UC Irvine | L, 9-12",
 "Today Oct 22, 6:00 PM Men's · Cal Baptist at Cal State Fullerton | ",
 "Upcoming Oct 23, 4:40 PM Men's · Cal Baptist vs Fresno Pacific (Calif.) | ",
 "Upcoming Oct 24, 9:00 AM Men's · Cal Baptist at San Jose State | ",
 "Upcoming Oct 24, 1:00 PM Men's · Cal Baptist vs Princeton | ",
 "Upcoming Oct 31, 12:00 PM Men's · Cal Baptist vs Long Beach State | ",
 "Upcoming Nov 6, 5:00 PM Men's · Cal Baptist vs UC San Diego | ",
 "Upcoming Nov 14, 1:00 PM Men's · Cal Baptist vs LMU | ",
 "Upcoming Nov 20 Men's · Cal Baptist at Big West Men's Water Polo Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_xctrack,"Cross Country xctrack");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswim,"Swimming & Diving womens-swim");
  ownRecapsOnly(v_xctrack_trackfield,"Track & Field xctrack");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("California Baptist module checks passed");
