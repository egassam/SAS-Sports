import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {depaulSchool} from '../src/schools/depaul.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='depaul');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,depaulHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/depaul-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit depaulbluedemons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['depaul'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',depaulSchool.scheduleUrls],['roster',depaulSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('depaul|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'depaulbluedemons.com',`${key} must stay on depaulbluedemons.com`);
  }
}
const parity={"Basketball":{"schedule":["https://depaulbluedemons.com/sports/mens-basketball/schedule","https://depaulbluedemons.com/sports/womens-basketball/schedule"],"roster":["https://depaulbluedemons.com/sports/mens-basketball/roster","https://depaulbluedemons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://depaulbluedemons.com/sports/cross-country/schedule"],"roster":["https://depaulbluedemons.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://depaulbluedemons.com/sports/mens-golf/schedule"],"roster":["https://depaulbluedemons.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://depaulbluedemons.com/sports/womens-soccer/schedule","https://depaulbluedemons.com/sports/mens-soccer/schedule"],"roster":["https://depaulbluedemons.com/sports/womens-soccer/roster","https://depaulbluedemons.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://depaulbluedemons.com/sports/softball/schedule"],"roster":["https://depaulbluedemons.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://depaulbluedemons.com/sports/womens-tennis/schedule","https://depaulbluedemons.com/sports/mens-tennis/schedule"],"roster":["https://depaulbluedemons.com/sports/womens-tennis/roster","https://depaulbluedemons.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://depaulbluedemons.com/sports/track-and-field/schedule"],"roster":["https://depaulbluedemons.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://depaulbluedemons.com/sports/womens-volleyball/schedule"],"roster":["https://depaulbluedemons.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'depaul|"+sport+"':"),`${sport} routes must live in the DePaul module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://depaulbluedemons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.depaulHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=depaul)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · DePaul at Loyola Chicago (Exhibition) | W, 72-65",
 "Upcoming Oct 23, 7:00 PM Men's · DePaul vs Notre Dame (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · DePaul vs West Georgia | ",
 "Upcoming Nov 5, 7:30 PM Men's · DePaul vs USF | ",
 "Upcoming Nov 9, 8:00 PM Men's · DePaul vs Alabama A&M | ",
 "Upcoming Nov 13 Men's · DePaul at Northwestern | ",
 "Upcoming Nov 17, 7:00 PM Men's · DePaul vs Maryland Eastern Shore | ",
 "Upcoming Nov 24, 5:00 PM Men's · DePaul vs Purdue | ",
 "Upcoming Nov 26, 6:00 PM Men's · DePaul vs Pitt | ",
 "Upcoming Dec 1, 7:00 PM Men's · DePaul vs North Alabama | ",
 "Upcoming Dec 5, 4:30 PM Men's · DePaul vs SMU | ",
 "Upcoming Dec 8, 8:00 PM Men's · DePaul vs Maine | ",
 "Upcoming Dec 12, 5:30 PM Men's · DePaul at Saint Louis | ",
 "Upcoming Dec 19, 7:30 PM Men's · DePaul at St. John's | ",
 "Upcoming Dec 22, 7:00 PM Men's · DePaul vs Canisius | ",
 "Upcoming Dec 30, 3:00 PM Men's · DePaul vs Seton Hall | ",
 "Upcoming Jan 2, 1:00 PM Men's · DePaul vs Providence | ",
 "Upcoming Jan 6, 5:30 PM Men's · DePaul at UConn | ",
 "Upcoming Jan 9, 3:00 PM Men's · DePaul vs Butler | ",
 "Upcoming Jan 13, 8:00 PM Men's · DePaul at Creighton | ",
 "Upcoming Jan 16, 12:30 PM Men's · DePaul at Marquette | ",
 "Upcoming Jan 19, 6:30 PM Men's · DePaul vs St. John's | ",
 "Upcoming Jan 22, 6:00 PM Men's · DePaul vs Villanova | ",
 "Upcoming Jan 30, 1:00 PM Men's · DePaul vs Xavier | ",
 "Upcoming Feb 3, 7:30 PM Men's · DePaul at Georgetown | ",
 "Upcoming Feb 7, 1:30 PM Men's · DePaul at Seton Hall | ",
 "Upcoming Feb 10, 7:30 PM Men's · DePaul vs UConn | ",
 "Upcoming Feb 13, 11:00 AM Men's · DePaul at Providence | ",
 "Upcoming Feb 16, 8:00 PM Men's · DePaul vs Georgetown | ",
 "Upcoming Feb 20, 2:00 PM Men's · DePaul at Xavier | ",
 "Upcoming Feb 23, 7:00 PM Men's · DePaul at Butler | ",
 "Upcoming Feb 27, 6:00 PM Men's · DePaul vs Creighton | ",
 "Upcoming Mar 3, 6:00 PM Men's · DePaul at Villanova | ",
 "Upcoming Mar 6, 6:00 PM Men's · DePaul vs Marquette | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 16 Women's · DePaul vs UIC (Exhibition) | W, 72-66",
 "Upcoming Nov 3, 6:00 PM Women's · DePaul vs Evansville | ",
 "Upcoming Nov 6, 11:00 AM Women's · DePaul vs Purdue Fort Wayne | ",
 "Upcoming Nov 8, 2:00 PM Women's · DePaul vs Stonehill | ",
 "Upcoming Nov 11, 6:00 PM Women's · DePaul vs Northern Illinois | ",
 "Upcoming Nov 14, 12:00 PM Women's · DePaul vs Notre Dame | ",
 "Upcoming Nov 18, 6:00 PM Women's · DePaul vs Bradley | ",
 "Upcoming Nov 21, 2:00 PM Women's · DePaul vs IU Indy | ",
 "Upcoming Nov 24, 7:00 PM Women's · DePaul at Loyola Chicago | ",
 "Upcoming Nov 27, 11:00 AM Women's · DePaul at Northwestern | ",
 "Upcoming Nov 29, 2:00 PM Women's · DePaul vs Bucknell | ",
 "Upcoming Dec 3, 6:00 PM Women's · DePaul at Villanova | ",
 "Upcoming Dec 6, 1:00 PM Women's · DePaul at Georgetown | ",
 "Upcoming Dec 10, 6:00 PM Women's · DePaul vs Butler | ",
 "Upcoming Dec 13, 1:00 PM Women's · DePaul at Michigan State | ",
 "Upcoming Dec 17, 11:00 AM Women's · DePaul vs Eastern Illinois | ",
 "Upcoming Dec 20, 2:00 PM Women's · DePaul vs Creighton | ",
 "Upcoming Jan 3, 3:00 PM Women's · DePaul vs Connecticut | ",
 "Upcoming Jan 7, 6:00 PM Women's · DePaul at Seton Hall | ",
 "Upcoming Jan 10, 2:00 PM Women's · DePaul vs Marquette | ",
 "Upcoming Jan 13, 5:30 PM Women's · DePaul at Xavier | ",
 "Upcoming Jan 17, 1:00 PM Women's · DePaul at St. John's | ",
 "Upcoming Jan 20, 6:00 PM Women's · DePaul vs Providence | ",
 "Upcoming Jan 23, 2:00 PM Women's · DePaul vs Georgetown | ",
 "Upcoming Jan 28, 5:30 PM Women's · DePaul at Connecticut | ",
 "Upcoming Feb 4, 8:00 PM Women's · DePaul vs Villanova | ",
 "Upcoming Feb 7, 2:00 PM Women's · DePaul vs St. John's | ",
 "Upcoming Feb 10, 6:30 PM Women's · DePaul at Creighton | ",
 "Upcoming Feb 14, 12:00 PM Women's · DePaul at Providence | ",
 "Upcoming Feb 17, 6:00 PM Women's · DePaul vs Seton Hall | ",
 "Upcoming Feb 21, 1:00 PM Women's · DePaul at Butler | ",
 "Upcoming Feb 24, 6:30 PM Women's · DePaul at Marquette | ",
 "Upcoming Feb 28, 2:00 PM Women's · DePaul vs Xavier | ",
 "Upcoming Mar 5 Women's · DePaul at BIG EAST Tournament First Round | ",
 "Upcoming Mar 6 Women's · DePaul at BIG EAST Tournament Quarterfinals | ",
 "Upcoming Mar 7 Women's · DePaul at BIG EAST Tournament Semifinals | ",
 "Upcoming Mar 8 Women's · DePaul at BIG EAST Tournament Final | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 DePaul at Huskie Opener | Women's team: 3rd / Men's team: 1st",
 "Final Sep 18 DePaul at National Catholic Championships | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 25 DePaul at Loyola Lakefront Invitational | Women's team: 6th / Men's team: 1st",
 "Final Oct 16 DePaul at Under Armour Pre-National Invitational | Men Blue: 42nd/44, Women White: 8th/26",
 "Upcoming Oct 30 DePaul at BIG EAST Championships | ",
 "Upcoming Nov 13 DePaul at NCAA Midwest Regional Championships | ",
 "Upcoming Nov 21 DePaul at NCAA Cross Country Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 DePaul at Florida Atlantic Invitational | 6th of 11",
 "Final Oct 12 DePaul at Purdue Fall Invitational | 10th of 13",
 "Final Oct 19 DePaul at Dayton Flyer Invitational | 9th of 13",
 "Upcoming Feb 8 DePaul at BIG EAST Match Play | ",
 "Upcoming Feb 15 DePaul at The Border Olympics | ",
 "Upcoming Feb 28 DePaul at Loyola Intercollegiate | ",
 "Upcoming Mar 12 DePaul at Seminole Intercollegiate | ",
 "Upcoming Mar 25 DePaul at The Goodwin | ",
 "Upcoming Apr 12 DePaul at The Mountaineer Invitational | ",
 "Upcoming Apr 17 DePaul at Rutherford Intercollegiate | ",
 "Upcoming May 2 DePaul at BIG EAST Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · DePaul vs NIU | T, 2-2",
 "Final Aug 20 Women's · DePaul vs Denver | W, 2-1",
 "Final Aug 23 Women's · DePaul at Lindenwood | W, 1-0",
 "Final Aug 27 Women's · DePaul at UIC | W, 1-0",
 "Final Sep 3 Women's · DePaul vs Western Kentucky | L, 0-1",
 "Final Sep 6 Women's · DePaul at Loyola Chicago | T, 0-0",
 "Final Sep 13 Women's · DePaul vs North Texas | L, 0-1",
 "Final Sep 17 Women's · DePaul vs Southern Indiana | T, 1-1",
 "Final Sep 26 Women's · DePaul vs Seton Hall | T, 0-0",
 "Final Sep 30 Women's · DePaul at Xavier | T, 1-1",
 "Final Oct 3 Women's · DePaul vs Butler | L, 2-3",
 "Final Oct 10 Women's · DePaul vs Marquette | L, 0-1",
 "Final Oct 17 Women's · DePaul at UConn | W, 1-0",
 "Today Oct 21, 3:00 PM Women's · DePaul vs Georgetown | ",
 "Upcoming Oct 24, 12:00 PM Women's · DePaul at Providence | ",
 "Upcoming Oct 28, 2:00 PM Women's · DePaul at Villanova | ",
 "Upcoming Oct 31, 1:00 PM Women's · DePaul vs St. John's | ",
 "Upcoming Nov 7, 1:00 PM Women's · DePaul at Creighton | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · DePaul at Bradley | T, 2-2",
 "Final Aug 24 Men's · DePaul at Ohio State | L, 0-6",
 "Final Aug 27 Men's · DePaul vs Western Illinois | W, 3-1",
 "Final Aug 30 Men's · DePaul at Loyola Chicago | T, 3-3",
 "Final Sep 6 Men's · DePaul vs Chicago State | W, 3-0",
 "Final Sep 11 Men's · DePaul at Bowling Green | T, 2-2",
 "Final Sep 18 Men's · DePaul vs Xavier | T, 1-1",
 "Final Oct 2 Men's · DePaul vs Akron | L, 0-2",
 "Final Oct 6 Men's · DePaul at Louisville | L, 1-4",
 "Final Oct 10 Men's · DePaul at UConn | W, 2-1",
 "Final Oct 16 Men's · DePaul vs St. John's | T, 0-0",
 "Final Oct 20 Men's · DePaul vs Western Michigan | W, 5-1",
 "Upcoming Oct 24, 2:00 PM Men's · DePaul vs Marquette | ",
 "Upcoming Oct 27, 6:00 PM Men's · DePaul at Seton Hall | ",
 "Upcoming Oct 31, 6:00 PM Men's · DePaul at Butler | ",
 "Upcoming Nov 6, 6:00 PM Men's · DePaul at Creighton | ",
 "Upcoming Nov 12 Men's · DePaul at BIG EAST Championship Semifinals | ",
 "Upcoming Nov 15 Men's · DePaul at BIG EAST Championship Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23 DePaul at Northwestern | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · DePaul at Spartan Invite | Completed",
 "Final Oct 8 Women's · DePaul at ITA Midwest Regionals | Completed",
 "Upcoming Oct 30 Women's · DePaul at Toledo Hidden Duals | ",
 "Upcoming Jan 16 Women's · DePaul at FGCU | ",
 "Upcoming Jan 18 Women's · DePaul vs Arkansas State | ",
 "Upcoming Jan 22 Women's · DePaul at Toledo | ",
 "Upcoming Jan 24 Women's · DePaul at Purdue | ",
 "Upcoming Jan 29 Women's · DePaul at NIU | ",
 "Upcoming Jan 30 Women's · DePaul at Northwestern | ",
 "Upcoming Feb 12 Women's · DePaul at Georgetown | ",
 "Upcoming Feb 13 Women's · DePaul at Villanova | ",
 "Upcoming Feb 19 Women's · DePaul at Connecticut | ",
 "Upcoming Feb 20 Women's · DePaul vs Boston | ",
 "Upcoming Feb 27 Women's · DePaul vs Western Michigan | ",
 "Upcoming Feb 28 Women's · DePaul vs Butler | ",
 "Upcoming Mar 5 Women's · DePaul vs St. John's | ",
 "Upcoming Mar 6 Women's · DePaul at Notre Dame | ",
 "Upcoming Mar 12 Women's · DePaul at Xavier | ",
 "Upcoming Mar 20 Women's · DePaul vs Seton Hall | ",
 "Upcoming Mar 26 Women's · DePaul at USF | ",
 "Upcoming Apr 9 Women's · DePaul at UNO | ",
 "Upcoming Apr 10 Women's · DePaul at Creighton | ",
 "Upcoming Apr 22 Women's · DePaul at BIG EAST Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · DePaul at River Forest Invitational | Completed",
 "Final Sep 19 Men's · DePaul at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · DePaul at WMU/Vredevelt Invitational | Completed",
 "Final Sep 25 Men's · DePaul at Fighting Irish Mini Duals | Completed",
 "Final Oct 2 Men's · DePaul at Louisville Invitational | Completed",
 "Final Oct 2 Men's · DePaul at Hope College RSM Invite | Completed",
 "Final Oct 15 Men's · DePaul at ITA Midwest Regional | Completed",
 "Upcoming Oct 23 Men's · DePaul at Louisville Classic | ",
 "Upcoming Nov 5 Men's · DePaul at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · DePaul at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · DePaul at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 DePaul vs Milwaukee | W, 3-0",
 "Final Aug 29 DePaul at Drake | W, 3-0",
 "Final Aug 30 DePaul vs South Dakota | W, 3-1",
 "Final Sep 2 DePaul vs Portland State | W, 3-1",
 "Final Sep 4 DePaul vs Nebraska | L, 0-3",
 "Final Sep 7 DePaul vs Penn State | L, 0-3",
 "Final Sep 11 DePaul vs Central Michigan | W, 3-0",
 "Final Sep 12 DePaul vs Western Michigan | W, 3-0",
 "Final Sep 13 DePaul vs Auburn | L, 1-3",
 "Final Sep 18 DePaul vs Loyola | W, 3-2",
 "Final Sep 19 DePaul vs UIC | W, 3-0",
 "Final Sep 25 DePaul at Providence | W, 3-0",
 "Final Sep 26 DePaul at Connecticut | W, 3-1",
 "Final Sep 30 DePaul vs Marquette | W, 3-2",
 "Final Oct 2 DePaul at Creighton | L, 1-3",
 "Final Oct 9 DePaul vs Villanova | W, 3-1",
 "Final Oct 10 DePaul vs Georgetown | L, 2-3",
 "Final Oct 16 DePaul at Seton Hall | W, 3-1",
 "Final Oct 18 DePaul at St. John's | W, 3-2",
 "Upcoming Oct 24, 5:00 PM DePaul vs Xavier | ",
 "Upcoming Oct 25, 3:00 PM DePaul vs Butler | ",
 "Upcoming Oct 30, 7:00 PM DePaul vs Creighton | ",
 "Upcoming Nov 1, 1:00 PM DePaul at Marquette | ",
 "Upcoming Nov 6, 5:00 PM DePaul at Georgetown | ",
 "Upcoming Nov 7, 4:00 PM DePaul at Villanova | ",
 "Upcoming Nov 13, 7:00 PM DePaul vs St. John's | ",
 "Upcoming Nov 14, 5:00 PM DePaul vs Seton Hall | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('DePaul module checks passed');
