import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {oleMissSchool} from '../src/schools/ole-miss.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ole-miss');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,oleMissHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ole-miss-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit olemisssports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ole-miss'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',oleMissSchool.scheduleUrls],['roster',oleMissSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ole-miss|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'olemisssports.com',`${key} must stay on olemisssports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://olemisssports.com/sports/baseball/schedule"],"roster":["https://olemisssports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://olemisssports.com/sports/mens-basketball/schedule","https://olemisssports.com/sports/womens-basketball/schedule"],"roster":["https://olemisssports.com/sports/mens-basketball/roster","https://olemisssports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://olemisssports.com/sports/cross-country/schedule"],"roster":["https://olemisssports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://olemisssports.com/sports/football/schedule"],"roster":["https://olemisssports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://olemisssports.com/sports/mens-golf/schedule","https://olemisssports.com/sports/womens-golf/schedule"],"roster":["https://olemisssports.com/sports/mens-golf/roster","https://olemisssports.com/sports/womens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://olemisssports.com/sports/womens-rifle/schedule"],"roster":["https://olemisssports.com/sports/womens-rifle/roster"],"combined":false},"Soccer":{"schedule":["https://olemisssports.com/sports/womens-soccer/schedule"],"roster":["https://olemisssports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://olemisssports.com/sports/softball/schedule"],"roster":["https://olemisssports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://olemisssports.com/sports/mens-tennis/schedule","https://olemisssports.com/sports/womens-tennis/schedule"],"roster":["https://olemisssports.com/sports/mens-tennis/roster","https://olemisssports.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://olemisssports.com/sports/track-and-field/schedule"],"roster":["https://olemisssports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://olemisssports.com/sports/womens-volleyball/schedule"],"roster":["https://olemisssports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ole-miss|"+sport+"':"),`${sport} routes must live in the Ole Miss module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://olemisssports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.oleMissHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ole-miss)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 10, 12:00 PM Ole Miss vs Samford (Exhibition) | ",
 "Upcoming Oct 24 Ole Miss vs Arkansas State (Exhibition) | ",
 "Upcoming Mar 19 Ole Miss vs Arkansas | ",
 "Upcoming Mar 20 Ole Miss vs Arkansas | ",
 "Upcoming Mar 21 Ole Miss vs Arkansas | ",
 "Upcoming Mar 25 Ole Miss at Vanderbilt | ",
 "Upcoming Mar 26 Ole Miss at Vanderbilt | ",
 "Upcoming Mar 27 Ole Miss at Vanderbilt | ",
 "Upcoming Apr 2 Ole Miss at Mississippi State | ",
 "Upcoming Apr 3 Ole Miss at Mississippi State | ",
 "Upcoming Apr 4 Ole Miss at Mississippi State | ",
 "Upcoming Apr 9 Ole Miss vs South Carolina | ",
 "Upcoming Apr 10 Ole Miss vs South Carolina | ",
 "Upcoming Apr 11 Ole Miss vs South Carolina | ",
 "Upcoming Apr 16 Ole Miss at LSU | ",
 "Upcoming Apr 17 Ole Miss at LSU | ",
 "Upcoming Apr 18 Ole Miss at LSU | ",
 "Upcoming Apr 23 Ole Miss vs Alabama | ",
 "Upcoming Apr 24 Ole Miss vs Alabama | ",
 "Upcoming Apr 25 Ole Miss vs Alabama | ",
 "Upcoming Apr 30 Ole Miss vs Missouri | ",
 "Upcoming May 1 Ole Miss vs Missouri | ",
 "Upcoming May 2 Ole Miss vs Missouri | ",
 "Upcoming May 7 Ole Miss at Auburn | ",
 "Upcoming May 8 Ole Miss at Auburn | ",
 "Upcoming May 9 Ole Miss at Auburn | ",
 "Upcoming May 14 Ole Miss vs Oklahoma | ",
 "Upcoming May 15 Ole Miss vs Oklahoma | ",
 "Upcoming May 16 Ole Miss vs Oklahoma | ",
 "Upcoming May 20 Ole Miss at Texas A&M | ",
 "Upcoming May 21 Ole Miss at Texas A&M | ",
 "Upcoming May 22 Ole Miss at Texas A&M | ",
 "Upcoming May 25 Ole Miss at SEC Baseball Tournament | ",
 "Upcoming Jun 4 Ole Miss at NCAA Regionals | ",
 "Upcoming Jun 11 Ole Miss at NCAA Super Regionals | ",
 "Upcoming Jun 18 Ole Miss at College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 15, 8:00 PM Men's · Ole Miss vs Alabama (Exhibition) | ",
 "Upcoming Oct 27, 7:30 PM Men's · Ole Miss vs UAB (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Ole Miss vs Alcorn State | ",
 "Upcoming Nov 6, 7:30 PM Men's · Ole Miss vs Central Arkansas | ",
 "Upcoming Nov 10, 7:30 PM Men's · Ole Miss vs Southeastern Louisiana University | ",
 "Upcoming Nov 17, 7:30 PM Men's · Ole Miss vs Nicholls | ",
 "Upcoming Nov 23, 1:30 PM Men's · Ole Miss vs Clemson | ",
 "Upcoming Nov 24 Men's · Ole Miss vs BYU or Washington | ",
 "Upcoming Nov 25 Men's · Ole Miss vs Arizona/Colorado State/Providence/VCU | ",
 "Upcoming Dec 1, 8:00 PM Men's · Ole Miss at Virginia Tech | ",
 "Upcoming Dec 7, 7:00 PM Men's · Ole Miss vs William & Mary | ",
 "Upcoming Dec 12, 1:00 PM Men's · Ole Miss vs ULM | ",
 "Upcoming Dec 15, 6:00 PM Men's · Ole Miss vs Youngstown State | ",
 "Upcoming Dec 19, 6:00 PM Men's · Ole Miss vs NC State | ",
 "Upcoming Dec 22, 3:00 PM Men's · Ole Miss vs Southern Miss | ",
 "Upcoming Dec 28, 6:00 PM Men's · Ole Miss vs Jackson State | ",
 "Upcoming Jan 2, 12:00 PM Men's · Ole Miss vs Georgia | ",
 "Upcoming Jan 5, 6:00 PM Men's · Ole Miss at Kentucky | ",
 "Upcoming Jan 9, 8:00 PM Men's · Ole Miss vs Texas | ",
 "Upcoming Jan 13, 8:00 PM Men's · Ole Miss at Alabama | ",
 "Upcoming Jan 16, 7:30 PM Men's · Ole Miss at Auburn | ",
 "Upcoming Jan 23, 5:00 PM Men's · Ole Miss vs Texas A&M | ",
 "Upcoming Jan 27, 8:00 PM Men's · Ole Miss vs Vanderbilt | ",
 "Upcoming Jan 30, 5:00 PM Men's · Ole Miss at Missouri | ",
 "Upcoming Feb 2, 8:00 PM Men's · Ole Miss vs Kentucky | ",
 "Upcoming Feb 5, 3:00 PM Men's · Ole Miss at Louisiana State | ",
 "Upcoming Feb 9, 8:00 PM Men's · Ole Miss at Arkansas | ",
 "Upcoming Feb 13, 7:30 PM Men's · Ole Miss vs Mississippi State | ",
 "Upcoming Feb 17, 6:00 PM Men's · Ole Miss vs Tennessee | ",
 "Upcoming Feb 20, 2:30 PM Men's · Ole Miss at South Carolina | ",
 "Upcoming Feb 24, 8:00 PM Men's · Ole Miss at Florida | ",
 "Upcoming Feb 27, 2:30 PM Men's · Ole Miss vs Oklahoma | ",
 "Upcoming Mar 2, 9:00 PM Men's · Ole Miss vs Auburn | ",
 "Upcoming Mar 6, 3:00 PM Men's · Ole Miss at Mississippi State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · Ole Miss vs Lane College (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Ole Miss vs Alcorn State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Ole Miss vs North Alabama | ",
 "Upcoming Nov 11, 6:00 PM Women's · Ole Miss vs Albany | ",
 "Upcoming Nov 15, 2:00 PM Women's · Ole Miss vs Louisiana Tech | ",
 "Upcoming Nov 18, 6:00 PM Women's · Ole Miss at Ohio State | ",
 "Upcoming Nov 22, 2:00 PM Women's · Ole Miss vs Alabama A&M | ",
 "Upcoming Nov 29, 2:00 PM Women's · Ole Miss vs Memphis | ",
 "Upcoming Dec 2, 6:15 PM Women's · Ole Miss vs NC State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Ole Miss vs ULM | ",
 "Upcoming Dec 12, 12:00 PM Women's · Ole Miss vs SC State | ",
 "Upcoming Dec 15, 6:00 PM Women's · Ole Miss at Norfolk State | ",
 "Upcoming Dec 20, 12:15 PM Women's · Ole Miss vs Saint Louis | ",
 "Upcoming Dec 21, 12:15 PM Women's · Ole Miss vs Temple | ",
 "Upcoming Dec 27, 2:00 PM Women's · Ole Miss vs Mississippi Valley State | ",
 "Upcoming Dec 31, 7:00 PM Women's · Ole Miss vs Oklahoma | ",
 "Upcoming Jan 3, 4:00 PM Women's · Ole Miss at Tennessee | ",
 "Upcoming Jan 7, 6:30 PM Women's · Ole Miss at Arkansas | ",
 "Upcoming Jan 11, 6:00 PM Women's · Ole Miss vs Alabama | ",
 "Upcoming Jan 14, 6:00 PM Women's · Ole Miss vs Missouri | ",
 "Upcoming Jan 21, 6:00 PM Women's · Ole Miss at Auburn | ",
 "Upcoming Jan 24, 2:00 PM Women's · Ole Miss vs Florida | ",
 "Upcoming Jan 28, 7:00 PM Women's · Ole Miss at Texas A&M | ",
 "Upcoming Feb 1, 7:00 PM Women's · Ole Miss at LSU | ",
 "Upcoming Feb 4, 8:00 PM Women's · Ole Miss vs Georgia | ",
 "Upcoming Feb 7, 3:00 PM Women's · Ole Miss at Mississippi State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Ole Miss vs Kentucky | ",
 "Upcoming Feb 14, 12:00 PM Women's · Ole Miss vs South Carolina | ",
 "Upcoming Feb 21, 11:00 AM Women's · Ole Miss at Vanderbilt | ",
 "Upcoming Feb 25, 8:00 PM Women's · Ole Miss at Alabama | ",
 "Upcoming Feb 28, 1:00 PM Women's · Ole Miss vs Texas | ",
 "Upcoming Mar 3 Women's · Ole Miss at SEC Tournament | ",
 "Upcoming Mar 17 Women's · Ole Miss at NCAA Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Ole Miss at Memphis Twilight | Women's team: 1st / Men's team: 2nd",
 "Final Sep 25 Ole Miss at Gans Creek Classic | Women's team: 8th / Men's team: 5th",
 "Upcoming Oct 9 Ole Miss at Nuttycombe Invitational (Men) | ",
 "Upcoming Oct 16 Ole Miss at Pre Nationals (Women) | ",
 "Upcoming Oct 30 Ole Miss at SEC Championships | ",
 "Upcoming Nov 13 Ole Miss at NCAA South Regional | ",
 "Upcoming Nov 21 Ole Miss at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 6 Ole Miss vs Louisville | W, 41-38",
 "Final Sep 12 Ole Miss vs Charlotte | W, 41-9",
 "Final Sep 19 Ole Miss vs LSU | W, 32-24",
 "Final Sep 26 Ole Miss at Florida | L, 28-52",
 "Upcoming Oct 10, 2:30 PM Ole Miss at Vanderbilt | ",
 "Upcoming Oct 17, 2:30 PM Ole Miss vs Missouri | ",
 "Upcoming Oct 24 Ole Miss at Texas | ",
 "Upcoming Oct 31 Ole Miss vs Auburn | ",
 "Upcoming Nov 7 Ole Miss vs Georgia | ",
 "Upcoming Nov 14 Ole Miss at Oklahoma | ",
 "Upcoming Nov 21, 11:00 AM Ole Miss vs Wofford | ",
 "Upcoming Nov 27, 11:00 AM Ole Miss vs Mississippi State | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Ole Miss at Inverness Intercollegiate | 17th of 18",
 "Final Sep 28 Men's · Ole Miss at Bryan Bros Collegiate | 1st of 16",
 "Final Oct 5 Men's · Ole Miss at Hamptons Intercollegiate | 6th of 12",
 "Upcoming Oct 17 Men's · Ole Miss at Fallen Oak Collegiate Invitational | ",
 "Upcoming Jan 30 Men's · Ole Miss at Thomas Sharkey Individual | ",
 "Upcoming Feb 15 Men's · Ole Miss at Watersound Invitational | ",
 "Upcoming Feb 28 Men's · Ole Miss at Cabo Collegiate | ",
 "Upcoming Mar 15 Men's · Ole Miss at Black Desert Collegiate | ",
 "Upcoming Apr 2 Men's · Ole Miss at Mason Rudolph Championship | ",
 "Upcoming Apr 5 Men's · Ole Miss at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · Ole Miss at Mossy Oak Collegiate | ",
 "Upcoming Apr 21 Men's · Ole Miss at SEC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Ole Miss at Boilermaker Classic | 2nd of 16",
 "Final Sep 7 Women's · Ole Miss at Cougar Classic | 7th of 18",
 "Final Oct 5 Women's · Ole Miss at The Ally | 2nd of 17",
 "Upcoming Oct 12 Women's · Ole Miss at Illini Women’s Invitational | ",
 "Upcoming Jan 31 Women's · Ole Miss at Grand Reservation Dominican Republic Classic | ",
 "Upcoming Feb 14 Women's · Ole Miss at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Ole Miss at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 21 Women's · Ole Miss at Clemson Invitational | ",
 "Upcoming Apr 5 Women's · Ole Miss at Birmingham Collegiate Classic | ",
 "Upcoming Apr 16 Women's · Ole Miss at SEC Championship | ",
 "Upcoming May 10 Women's · Ole Miss at NCAA Regionals | ",
 "Upcoming May 21 Women's · Ole Miss at NCAA Championships | "
]);
  const v_womensrifle=parse("Rifle","womens-rifle");
  assert.deepEqual(v_womensrifle.map(line),[
 "Final Sep 26 Ole Miss vs UT Martin | W, 4711-4597",
 "Final Sep 26 Ole Miss vs Ohio State | W, 4711-4651",
 "Upcoming Oct 10, 8:00 AM Ole Miss at Memphis | ",
 "Upcoming Oct 10, 8:00 AM Ole Miss at Nebraska | ",
 "Upcoming Oct 17 Ole Miss at Air Force | ",
 "Upcoming Oct 18 Ole Miss at Air Force | ",
 "Upcoming Oct 24, 8:00 AM Ole Miss at Georgia Southern | ",
 "Upcoming Nov 7 Ole Miss at TCU | ",
 "Upcoming Nov 14 Ole Miss at West Virginia | ",
 "Upcoming Nov 15 Ole Miss at West Virginia | ",
 "Upcoming Jan 16, 8:00 AM Ole Miss at UTEP | ",
 "Upcoming Jan 17, 8:00 AM Ole Miss at Kentucky | ",
 "Upcoming Jan 23 Ole Miss at UTEP | ",
 "Upcoming Feb 5 Ole Miss at PRC Championships | ",
 "Upcoming Feb 13, 8:00 AM Ole Miss at Murray State | ",
 "Upcoming Feb 20 Ole Miss at NCAA Qualifier | ",
 "Upcoming Mar 11 Ole Miss at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Ole Miss vs Murray State | W, 1-0",
 "Final Aug 16 Ole Miss at Louisiana | W, 2-1",
 "Final Aug 20 Ole Miss at College of Charleston | W, 1-0",
 "Final Aug 23 Ole Miss at UAB | W, 2-0",
 "Final Aug 27 Ole Miss vs Memphis | L, 1-3",
 "Final Aug 30 Ole Miss vs ULM | W, 2-0",
 "Final Sep 3 Ole Miss vs South Alabama | W, 1-0",
 "Final Sep 6 Ole Miss vs Belmont | W, 1-0",
 "Final Sep 11 Ole Miss vs Mississippi State | L, 1-4",
 "Final Sep 18 Ole Miss at Auburn | L, 0-3",
 "Final Sep 24 Ole Miss vs Vanderbilt | L, 0-4",
 "Final Sep 27 Ole Miss vs Texas | L, 0-2",
 "Final Oct 2 Ole Miss at Alabama | L, 0-2",
 "Upcoming Oct 9, 6:30 PM Ole Miss at Georgia | ",
 "Upcoming Oct 15, 6:00 PM Ole Miss vs Missouri | ",
 "Upcoming Oct 18, 3:00 PM Ole Miss vs Oklahoma | ",
 "Upcoming Oct 23, 7:30 PM Ole Miss at Kentucky | ",
 "Upcoming Nov 1, 12:00 PM Ole Miss at Texas A&M | ",
 "Upcoming Nov 8 Ole Miss at SEC Soccer Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 2:00 PM Ole Miss vs Jacksonville State (Exhibition) | ",
 "Upcoming Oct 9, 4:30 PM Ole Miss vs Itawamba CC (Exhibition) | ",
 "Upcoming Oct 22, 4:30 PM Ole Miss vs NEMCC (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Ole Miss at Mississippi State (Exhibition) | ",
 "Upcoming Nov 5, 4:30 PM Ole Miss vs Pearl River CC (Exhibition) | ",
 "Upcoming Mar 12 Ole Miss vs Auburn | ",
 "Upcoming Mar 13 Ole Miss vs Auburn | ",
 "Upcoming Mar 14 Ole Miss vs Auburn | ",
 "Upcoming Mar 19 Ole Miss at Arkansas | ",
 "Upcoming Mar 20 Ole Miss at Arkansas | ",
 "Upcoming Mar 21 Ole Miss at Arkansas | ",
 "Upcoming Mar 26 Ole Miss vs Kentucky | ",
 "Upcoming Mar 27 Ole Miss vs Kentucky | ",
 "Upcoming Mar 28 Ole Miss vs Kentucky | ",
 "Upcoming Apr 2 Ole Miss at Alabama | ",
 "Upcoming Apr 3 Ole Miss at Alabama | ",
 "Upcoming Apr 4 Ole Miss at Alabama | ",
 "Upcoming Apr 9 Ole Miss vs Georgia | ",
 "Upcoming Apr 10 Ole Miss vs Georgia | ",
 "Upcoming Apr 11 Ole Miss vs Georgia | ",
 "Upcoming Apr 16 Ole Miss at Missouri | ",
 "Upcoming Apr 17 Ole Miss at Missouri | ",
 "Upcoming Apr 18 Ole Miss at Missouri | ",
 "Upcoming Apr 23 Ole Miss vs South Carolina | ",
 "Upcoming Apr 24 Ole Miss vs South Carolina | ",
 "Upcoming Apr 25 Ole Miss vs South Carolina | ",
 "Upcoming May 6 Ole Miss at Florida | ",
 "Upcoming May 7 Ole Miss at Florida | ",
 "Upcoming May 8 Ole Miss at Florida | ",
 "Upcoming May 11 Ole Miss at SEC Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Ole Miss at Milwaukee Classic | No Team Scores",
 "Final Sep 19 Men's · Ole Miss at ITA All-Americans | No Team Scores",
 "Final Sep 28 Men's · Ole Miss at ITF Fayetteville | No Team Scores",
 "Final Oct 2 Men's · Ole Miss at Black and Gold Invitational | No Team Scores",
 "Upcoming Oct 9 Men's · Ole Miss at ITA Southern Regional | ",
 "Upcoming Oct 23 Men's · Ole Miss at Rome, GA Invite | ",
 "Upcoming Oct 26 Men's · Ole Miss at ITF Norman | ",
 "Upcoming Nov 5 Men's · Ole Miss at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Ole Miss at NCAA Singles and Doubles | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Ole Miss at Blue and Gray Invitational | No Team Scores",
 "Upcoming Oct 8 Women's · Ole Miss at ITA Southern Regional | ",
 "Upcoming Oct 19 Women's · Ole Miss at ITF W35 Bakersfield | ",
 "Upcoming Oct 19 Women's · Ole Miss at ITF W50 Austin | ",
 "Upcoming Oct 23 Women's · Ole Miss at TCU Invitational | ",
 "Upcoming Oct 26 Women's · Ole Miss at ITF W15 Sumter | ",
 "Upcoming Oct 26 Women's · Ole Miss at ITF W35 Norman | ",
 "Upcoming Oct 30 Women's · Ole Miss at Alabama | ",
 "Upcoming Nov 5 Women's · Ole Miss at ITF Sectionals | ",
 "Upcoming Nov 6 Women's · Ole Miss at Vanderbilt Invitational | ",
 "Upcoming Nov 9 Women's · Ole Miss at UTR PTT Oxford | ",
 "Upcoming Nov 18 Women's · Ole Miss at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Jul 23 Ole Miss at USATF Outdoor Championships | Completed"
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Ole Miss vs Southeastern Louisiana | W, 3-2",
 "Final Aug 29 Ole Miss vs Northern Arizona | W, 3-1",
 "Final Aug 30 Ole Miss vs LMU | L, 1-3",
 "Final Sep 2 Ole Miss vs Ohio State | W, 3-1",
 "Final Sep 3 Ole Miss vs Washington | L, 2-3",
 "Final Sep 5 Ole Miss vs Southern Miss | W, 3-1",
 "Final Sep 6 Ole Miss vs Central Arkansas | W, 3-0",
 "Final Sep 8 Ole Miss vs Clemson | W, 3-2",
 "Final Sep 15 Ole Miss at Memphis | L, 1-3",
 "Final Sep 18 Ole Miss at Kansas | L, 0-3",
 "Final Sep 19 Ole Miss vs Grand Canyon | L, 1-3",
 "Final Sep 27 Ole Miss at Alabama | W, 3-0",
 "Final Oct 2 Ole Miss vs Missouri | W, 3-1",
 "Final Oct 4 Ole Miss vs Vanderbilt | L, 0-3",
 "Upcoming Oct 9, 5:30 PM Ole Miss at Tennessee | ",
 "Upcoming Oct 11, 1:00 PM Ole Miss at Kentucky | ",
 "Upcoming Oct 16, 6:00 PM Ole Miss vs Georgia | ",
 "Upcoming Oct 18, 12:00 PM Ole Miss vs South Carolina | ",
 "Upcoming Oct 23, 8:00 PM Ole Miss at Auburn | ",
 "Upcoming Oct 25, 12:00 PM Ole Miss at Florida | ",
 "Upcoming Oct 30, 6:00 PM Ole Miss vs Mississippi State | ",
 "Upcoming Nov 1, 2:00 PM Ole Miss vs LSU | ",
 "Upcoming Nov 6, 3:00 PM Ole Miss vs Oklahoma | ",
 "Upcoming Nov 8, 2:00 PM Ole Miss vs Arkansas | ",
 "Upcoming Nov 13, 6:30 PM Ole Miss at Texas | ",
 "Upcoming Nov 15, 12:00 PM Ole Miss at Texas A&M | ",
 "Upcoming Nov 20 Ole Miss at SEC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensrifle,"Rifle womens-rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Stories from a sport's archive: the listing and every saved story it links.
const fromArchive=(host,slug)=>{
  const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://${host}/sports/${slug}/archives`,listing);
  for(const path of new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){
    try{recapFixtures.set(`https://${host}${path}`,fixture(recapFile(path)));}catch{}
  }
};
// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>{
  const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
  const published=[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')];
  const computed=worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual(computed,[published],`${sport}: the computed records are the official ones`);
  return published;
};

// Golf: the place in the field and the team score ("17th/18 --" with
// "901 (+49)"; "2nd/16--859 (-5)").
{
  const men=parse('Golf','mens-golf'),women=parse('Golf','womens-golf');
  assert.deepEqual(men.find(e=>e.opponent==='Inverness Intercollegiate').results,[{label:'Result',value:'17th of 18'},{label:'Team score',value:'901 (+49)'}]);
  assert.deepEqual(women.find(e=>e.opponent==='Boilermaker Classic').results,[{label:'Result',value:'2nd of 16'},{label:'Team score',value:'859 (-5)'}]);
  // The Ally's last round was cancelled (its no-play note): the second
  // round's place is final that day.
  const ally=women.find(e=>e.opponent==='The Ally');
  assert.deepEqual([ally.status,ally.headline,ally.results[1].value],['Final','2nd of 17','576 (E)']);
  // The Boilermaker's last round links another tournament's story; the
  // archive's final story is used. The Ally's only stories are from before
  // its last round, so it waits for its own.
  fromArchive('olemisssports.com','womens-golf');
  for(const event of [ally,women.find(e=>e.opponent==='Boilermaker Classic')])if(worker.oleMissHandlers.isFinalWithoutStory(event))await worker.oleMissHandlers.attachArchiveStory(event);
  assert.equal(women.find(e=>e.opponent==='Boilermaker Classic').recap_url,'https://olemisssports.com/news/2026/9/1/womens-golf-no-19-ole-miss-womens-golf-finishes-second-at-boilermaker-classic');
  assert.equal(ally.recap_url,undefined);
  recapFixtures.clear();requests.length=0;
}

// A leading "*" (individuals-only golf) is not part of the name.
assert.ok(parse('Golf','mens-golf').some(e=>e.title==="Men's · Ole Miss at Thomas Sharkey Individual"));
// Rifle: each opponent of a tri-meet is its own match.
assert.deepEqual(parse('Rifle','womens-rifle').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[['Ole Miss vs UT Martin','W, 4711-4597'],['Ole Miss vs Ohio State','W, 4711-4651']]);

// Cross Country: TFRRS confirms both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/MS_college_f_Mississippi.html',Men:'https://www.tfrrs.org/teams/xc/MS_college_m_Mississippi.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['Memphis Twilight',"Women's team: 1st · 34 pts / Men's team: 2nd · 56 pts",true],['Gans Creek Classic',"Women's team: 8th · 261 pts / Men's team: 5th · 202 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Ole Miss's game only.
{
  live('Football','football-espn-2026-09-26.json.gz',parse('Football','football'),new Date('2026-09-27T12:00:00Z'),[['Ole Miss at Florida','Final','L, 28-52']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Ole Miss vs Vanderbilt','Final','L, 0-3']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Ole Miss at Alabama','Final','L, 0-2']]);
}

// Records equal the ones the official pages publish.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>records(sport,slug)),[["3-1","1-1"],["8-6","2-1"],["7-6","0-5"]]);

// Other schools and other hosts never reach the Ole Miss reader.
assert.equal(worker.oleMissHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://olemisssports.com/',now),null);
assert.equal(worker.oleMissHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Ole Miss module checks passed');
