import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {highPointSchool} from '../src/schools/high-point.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='high-point');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,highPointHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/high-point-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit highpointpanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['high-point'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',highPointSchool.scheduleUrls],['roster',highPointSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('high-point|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'highpointpanthers.com',`${key} must stay on highpointpanthers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://highpointpanthers.com/sports/baseball/schedule"],"roster":["https://highpointpanthers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://highpointpanthers.com/sports/mens-basketball/schedule","https://highpointpanthers.com/sports/womens-basketball/schedule"],"roster":["https://highpointpanthers.com/sports/mens-basketball/roster","https://highpointpanthers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://highpointpanthers.com/sports/womens-cross-country/schedule","https://highpointpanthers.com/sports/mens-cross-country/schedule"],"roster":["https://highpointpanthers.com/sports/womens-cross-country/roster","https://highpointpanthers.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://highpointpanthers.com/sports/womens-golf/schedule","https://highpointpanthers.com/sports/mens-golf/schedule"],"roster":["https://highpointpanthers.com/sports/womens-golf/roster","https://highpointpanthers.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://highpointpanthers.com/sports/womens-lacrosse/schedule","https://highpointpanthers.com/sports/mens-lacrosse/schedule"],"roster":["https://highpointpanthers.com/sports/womens-lacrosse/roster","https://highpointpanthers.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://highpointpanthers.com/sports/womens-rowing/schedule"],"roster":["https://highpointpanthers.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://highpointpanthers.com/sports/womens-soccer/schedule","https://highpointpanthers.com/sports/mens-soccer/schedule"],"roster":["https://highpointpanthers.com/sports/womens-soccer/roster","https://highpointpanthers.com/sports/mens-soccer/roster"],"combined":true},"Track & Field":{"schedule":["https://highpointpanthers.com/sports/womens-track-and-field/schedule","https://highpointpanthers.com/sports/mens-track-and-field/schedule"],"roster":["https://highpointpanthers.com/sports/womens-track-and-field/roster","https://highpointpanthers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://highpointpanthers.com/sports/womens-volleyball/schedule"],"roster":["https://highpointpanthers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'high-point|"+sport+"':"),`${sport} routes must live in the High Point module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://highpointpanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.highPointHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=high-point)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 4:00 PM Men's · High Point at East Tennessee State | ",
 "Upcoming Nov 2, 12:00 AM Men's · High Point vs Liberty | ",
 "Upcoming Nov 4, 7:00 PM Men's · High Point vs Md.-Eastern Shore | ",
 "Upcoming Nov 7, 5:00 PM Men's · High Point vs Washington State | ",
 "Upcoming Nov 12, 7:00 PM Men's · High Point vs Southern Utah | ",
 "Upcoming Nov 15, 3:00 PM Men's · High Point at Saint Louis | ",
 "Upcoming Nov 19, 7:00 PM Men's · High Point vs Montana State | ",
 "Upcoming Nov 24, 8:15 PM Men's · High Point vs Duquesne | ",
 "Upcoming Nov 28, 2:00 PM Men's · High Point vs The Citadel | ",
 "Upcoming Dec 2, 7:00 PM Men's · High Point vs George Mason | ",
 "Upcoming Dec 4, 7:00 PM Men's · High Point vs Wagner | ",
 "Upcoming Dec 6, 2:00 PM Men's · High Point vs William Peace | ",
 "Upcoming Dec 12, 1:00 PM Men's · High Point vs Miami U. (OH) | ",
 "Upcoming Dec 15, 7:00 PM Men's · High Point vs N.C. Central | ",
 "Upcoming Dec 18, 8:00 PM Men's · High Point at LSU | ",
 "Upcoming Dec 21, 7:00 PM Men's · High Point vs Loyola (Md.) | ",
 "Upcoming Dec 28, 7:00 PM Men's · High Point vs Pfeiffer | ",
 "Upcoming Jan 3, 2:00 PM Men's · High Point vs USC Upstate | ",
 "Upcoming Jan 6 Men's · High Point at Presbyterian College | ",
 "Upcoming Jan 9 Men's · High Point at Radford | ",
 "Upcoming Jan 13, 7:00 PM Men's · High Point vs Gardner-Webb | ",
 "Upcoming Jan 16 Men's · High Point at Charleston Southern | ",
 "Upcoming Jan 20 Men's · High Point at Winthrop | ",
 "Upcoming Jan 23, 7:00 PM Men's · High Point vs Longwood | ",
 "Upcoming Jan 28, 7:00 PM Men's · High Point vs UNC Asheville | ",
 "Upcoming Jan 30 Men's · High Point at USC Upstate | ",
 "Upcoming Feb 6, 7:00 PM Men's · High Point vs Charleston Southern | ",
 "Upcoming Feb 11 Men's · High Point at UNC Asheville | ",
 "Upcoming Feb 13 Men's · High Point at Gardner-Webb | ",
 "Upcoming Feb 18, 7:00 PM Men's · High Point vs Winthrop | ",
 "Upcoming Feb 20, 2:00 PM Men's · High Point vs Presbyterian College | ",
 "Upcoming Feb 25 Men's · High Point at Longwood | ",
 "Upcoming Feb 27, 7:00 PM Men's · High Point vs Radford | ",
 "Upcoming Mar 3 Men's · High Point at Big South Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · High Point vs Lees-McRae | ",
 "Upcoming Nov 4, 12:00 PM Women's · High Point vs Wingate | ",
 "Upcoming Nov 7, 1:00 PM Women's · High Point at Ball State | ",
 "Upcoming Nov 11, 7:00 PM Women's · High Point at East Carolina | ",
 "Upcoming Nov 14, 2:00 PM Women's · High Point vs South Carolina State | ",
 "Upcoming Nov 16, 7:00 PM Women's · High Point vs Hampton | ",
 "Upcoming Nov 19, 6:00 PM Women's · High Point at Vermont | ",
 "Upcoming Nov 23, 1:00 PM Women's · High Point vs Grand Canyon | ",
 "Upcoming Nov 24, 3:30 PM Women's · High Point vs Arkansas | ",
 "Upcoming Nov 29, 2:00 PM Women's · High Point vs Army | ",
 "Upcoming Dec 2, 6:30 PM Women's · High Point at Furman | ",
 "Upcoming Dec 5, 2:00 PM Women's · High Point vs N.C. Central | ",
 "Upcoming Dec 13, 2:00 PM Women's · High Point at James Madison | ",
 "Upcoming Dec 16, 7:00 PM Women's · High Point vs Mercer | ",
 "Upcoming Dec 23, 12:00 PM Women's · High Point vs Norfolk State | ",
 "Upcoming Dec 30, 6:00 PM Women's · High Point at Winthrop | ",
 "Upcoming Jan 2, 2:00 PM Women's · High Point at Charleston Southern | ",
 "Upcoming Jan 6, 7:00 PM Women's · High Point vs USC Upstate | ",
 "Upcoming Jan 9, 2:00 PM Women's · High Point vs Radford | ",
 "Upcoming Jan 13 Women's · High Point at Gardner-Webb | ",
 "Upcoming Jan 16, 2:00 PM Women's · High Point at UNC Asheville | ",
 "Upcoming Jan 20, 7:00 PM Women's · High Point vs Longwood | ",
 "Upcoming Jan 27, 6:00 PM Women's · High Point at Presbyterian | ",
 "Upcoming Jan 30, 7:00 PM Women's · High Point vs UNC Asheville | ",
 "Upcoming Feb 3, 7:00 PM Women's · High Point vs Gardner-Webb | ",
 "Upcoming Feb 6, 4:00 PM Women's · High Point at USC Upstate | ",
 "Upcoming Feb 10, 7:00 PM Women's · High Point at Radford | ",
 "Upcoming Feb 13, 7:00 PM Women's · High Point vs Charleston Southern | ",
 "Upcoming Feb 17, 7:00 PM Women's · High Point vs Presbyterian | ",
 "Upcoming Feb 20, 2:00 PM Women's · High Point at Longwood | ",
 "Upcoming Feb 24, 7:00 PM Women's · High Point vs Winthrop | ",
 "Upcoming Mar 3 Women's · High Point at Big South Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · High Point at Elon Opener | 6th",
 "Final Sep 18 Women's · High Point at NC State Adidas XC Challenge | 5th",
 "Final Oct 2 Women's · High Point at Richmond Invitational | 4th",
 "Final Oct 16 Women's · High Point at Joe Handelman '52 Fall Classic | 10th",
 "Upcoming Oct 30, 9:00 AM Women's · High Point at Big South Conference Championship | ",
 "Upcoming Nov 13 Women's · High Point at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Women's · High Point at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · High Point at Elon Opener | 3rd",
 "Final Sep 18 Men's · High Point at NC State Adidas XC Challenge | 4th",
 "Final Oct 2 Men's · High Point at Richmond Invitational | 1st",
 "Final Oct 16 Men's · High Point at Joe Handelman '52 Fall Classic | 5th",
 "Upcoming Oct 30, 9:45 AM Men's · High Point at Big South Conference Championship | ",
 "Upcoming Nov 13 Men's · High Point at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Men's · High Point at NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · High Point at Golfweek Fall Challenge | 4th",
 "Final Sep 18 Women's · High Point at Lady Paladin Invitational | 2nd",
 "Final Sep 26 Women's · High Point at Fighting Irish Classic | 8th",
 "Final Oct 4 Women's · High Point at Mercedes-Benz Intercollegiate | 3rd",
 "Final Oct 19 Women's · High Point at Edisto Island Invitational | 1st",
 "Final Oct 19 Women's · High Point at UNCG Collegiate | Completed",
 "Upcoming Feb 8 Women's · High Point at Oyster Shuck Match Play | ",
 "Upcoming Mar 1 Women's · High Point at Daniel Island Invitational | ",
 "Upcoming Mar 8 Women's · High Point at Sapona Women's Intercollegiate | ",
 "Upcoming Mar 20 Women's · High Point at Florida State Match Up | ",
 "Upcoming Mar 27 Women's · High Point at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 11 Women's · High Point at Terps Invitational | ",
 "Upcoming Apr 18 Women's · High Point at Big South Conference Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · High Point at Augusta Invite | 2nd",
 "Final Sep 14 Men's · High Point at 2026 Sandestin Intercollegiate | 6th",
 "Final Sep 28 Men's · High Point at Ironwood Collegiate Classic | 3rd",
 "Final Oct 5 Men's · High Point at Testudo Cup | 3rd",
 "Final Oct 19 Men's · High Point at Qubein Cup | 8th",
 "Upcoming Feb 7 Men's · High Point at Compadres Collegiate | ",
 "Upcoming Mar 8 Men's · High Point at Surf Club Invitational | ",
 "Upcoming Mar 12 Men's · High Point at Sapona Intercollegiate | ",
 "Upcoming Mar 29 Men's · High Point at ECU Intercollegiate | ",
 "Upcoming Apr 12 Men's · High Point at Wofford Invitational | ",
 "Upcoming Apr 25 Men's · High Point at Big South Men's Golf Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Today Oct 23, 6:00 PM Women's · High Point vs Queens U. (N.C.) | ",
 "Upcoming Oct 24, 10:00 AM Women's · High Point vs Alumni Game | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 High Point vs High Point Autumn Rowing Festival | ",
 "Upcoming Oct 31 High Point at Head of the Occoquan | ",
 "Upcoming Nov 8 High Point at Rivanna Romp | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · High Point vs UNC Greensboro | L, 0-1",
 "Final Aug 16 Women's · High Point vs Davidson | L, 0-1",
 "Final Aug 20 Women's · High Point vs Marshall | W, 4-0",
 "Final Aug 23 Women's · High Point at East Carolina | T, 2-2",
 "Final Aug 27 Women's · High Point vs NC State | L, 0-3",
 "Final Aug 30 Women's · High Point at Elon | L, 1-2",
 "Final Sep 6 Women's · High Point at UNC Wilmington | L, 2-4",
 "Final Sep 12 Women's · High Point at Florida Gulf Coast | L, 0-2",
 "Final Sep 19 Women's · High Point at Longwood | W, 2-1",
 "Final Sep 26 Women's · High Point at UNC Asheville | L, 0-1",
 "Final Oct 3 Women's · High Point vs Radford | W, 3-0",
 "Final Oct 10 Women's · High Point vs USC Upstate | L, 0-1",
 "Final Oct 14 Women's · High Point at Gardner-Webb | T, 0-0",
 "Final Oct 21 Women's · High Point at Presbyterian College | W, 4-0",
 "Upcoming Oct 28, 7:00 PM Women's · High Point vs Charleston Southern | ",
 "Upcoming Oct 31, 4:00 PM Women's · High Point vs Winthrop | ",
 "Upcoming Nov 5 Women's · High Point at Big South Quarterfinal | ",
 "Upcoming Nov 10 Women's · High Point at Big South Semifinal | ",
 "Upcoming Nov 15 Women's · High Point vs Big South Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · High Point vs LIU | W, 5-2",
 "Final Aug 24 Men's · High Point at Virginia | W, 3-2",
 "Final Aug 29 Men's · High Point at Maryland | L, 0-1",
 "Final Sep 2 Men's · High Point vs VCU | T, 1-1",
 "Final Sep 7 Men's · High Point at South Carolina | L, 0-2",
 "Final Sep 11 Men's · High Point at Georgetown | L, 1-5",
 "Final Sep 15 Men's · High Point at Davidson | W, 1-0",
 "Final Sep 19 Men's · High Point vs Gardner-Webb | W, 2-1",
 "Final Sep 25 Men's · High Point vs Guilford | W, 5-1",
 "Final Sep 29 Men's · High Point at Winthrop | W, 2-0",
 "Final Oct 3 Men's · High Point vs Longwood | W, 2-0",
 "Final Oct 9 Men's · High Point at USC Upstate | W, 2-1",
 "Final Oct 13 Men's · High Point vs George Washington | W, 2-0",
 "Final Oct 17 Men's · High Point at Presbyterian College | W, 8-0",
 "Final Oct 20 Men's · High Point vs UNC Greensboro | T, 1-1",
 "Upcoming Oct 24, 7:00 PM Men's · High Point vs Radford | ",
 "Upcoming Oct 31, 7:30 PM Men's · High Point vs UNC Asheville | ",
 "Upcoming Nov 8, 6:00 PM Men's · High Point at Big South Semifinal | ",
 "Upcoming Nov 14, 6:00 PM Men's · High Point vs Big South Final | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 High Point vs UConn | W, 3-2",
 "Final Aug 29 High Point vs Hofstra | L, 1-3",
 "Final Aug 30 High Point at Penn State | L, 2-3",
 "Final Sep 5 High Point vs Lamar | W, 3-0",
 "Final Sep 6 High Point at Liberty | W, 3-1",
 "Final Sep 11 High Point vs Wright State | L, 1-3",
 "Final Sep 12 High Point at Pitt | L, 0-3",
 "Final Sep 13 High Point vs Jacksonville | W, 3-1",
 "Final Sep 17 High Point vs Wofford | W, 3-0",
 "Final Sep 18 High Point vs N.C. A&T | W, 3-2",
 "Final Sep 25 High Point vs Radford | W, 3-0",
 "Final Oct 2 High Point at USC Upstate | W, 3-0",
 "Final Oct 3 High Point at UNC Asheville | W, 3-0",
 "Final Oct 6 High Point at College of Charleston | L, 2-3",
 "Final Oct 9 High Point vs Gardner-Webb | W, 3-1",
 "Final Oct 10 High Point vs Winthrop | W, 3-1",
 "Final Oct 16 High Point at Charleston Southern | W, 3-0",
 "Final Oct 17 High Point at Presbyterian College | W, 3-1",
 "Today Oct 23, 6:00 PM High Point vs UNC Asheville | ",
 "Upcoming Oct 24, 4:00 PM High Point vs USC Upstate | ",
 "Upcoming Oct 30, 6:00 PM High Point vs Presbyterian College | ",
 "Upcoming Oct 31, 2:00 PM High Point vs Charleston Southern | ",
 "Upcoming Nov 6, 6:00 PM High Point at Winthrop | ",
 "Upcoming Nov 7, 6:00 PM High Point at Gardner-Webb | ",
 "Upcoming Nov 13, 6:00 PM High Point at Radford | ",
 "Upcoming Nov 20 High Point at Big South Tournament | ",
 "Upcoming Nov 28, 2:00 PM High Point at Minnesota | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("High Point module checks passed");
