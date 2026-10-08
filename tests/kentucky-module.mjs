import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kentuckySchool,kentuckySwimDuals} from '../src/schools/kentucky.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kentucky');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,kentuckyHandlers,attachOfficialMeetResults,decodeHtml,recapArticleText};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/kentucky-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ukathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['kentucky'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',kentuckySchool.scheduleUrls],['roster',kentuckySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('kentucky|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ukathletics.com',`${key} must stay on ukathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ukathletics.com/sports/baseball/schedule/"],"roster":["https://ukathletics.com/sports/baseball/roster/"],"combined":false},"Basketball":{"schedule":["https://ukathletics.com/sports/mbball/schedule/","https://ukathletics.com/sports/wbball/schedule/"],"roster":["https://ukathletics.com/sports/mbball/roster/","https://ukathletics.com/sports/wbball/roster/"],"combined":true},"Cross Country":{"schedule":["https://ukathletics.com/sports/cross/schedule/"],"roster":["https://ukathletics.com/sports/cross/roster/"],"combined":false},"Football":{"schedule":["https://ukathletics.com/sports/football/schedule/"],"roster":["https://ukathletics.com/sports/football/roster/"],"combined":false},"Golf":{"schedule":["https://ukathletics.com/sports/mgolf/schedule/","https://ukathletics.com/sports/wgolf/schedule/"],"roster":["https://ukathletics.com/sports/mgolf/roster/","https://ukathletics.com/sports/wgolf/roster/"],"combined":true},"Gymnastics":{"schedule":["https://ukathletics.com/sports/wgym/schedule/"],"roster":["https://ukathletics.com/sports/wgym/roster/"],"combined":false},"Rifle":{"schedule":["https://ukathletics.com/sports/rifle/schedule/"],"roster":["https://ukathletics.com/sports/rifle/roster/"],"combined":false},"STUNT":{"schedule":["https://ukathletics.com/sports/stunt/schedule/"],"roster":["https://ukathletics.com/sports/stunt/roster/"],"combined":false},"Soccer":{"schedule":["https://ukathletics.com/sports/msoc/schedule/","https://ukathletics.com/sports/wsoc/schedule/"],"roster":["https://ukathletics.com/sports/msoc/roster/","https://ukathletics.com/sports/wsoc/roster/"],"combined":true},"Softball":{"schedule":["https://ukathletics.com/sports/softball/schedule/"],"roster":["https://ukathletics.com/sports/softball/roster/"],"combined":false},"Swimming & Diving":{"schedule":["https://ukathletics.com/sports/swimming/schedule/"],"roster":["https://ukathletics.com/sports/swimming/roster/"],"combined":false},"Tennis":{"schedule":["https://ukathletics.com/sports/mten/schedule/","https://ukathletics.com/sports/wten/schedule/"],"roster":["https://ukathletics.com/sports/mten/roster/","https://ukathletics.com/sports/wten/roster/"],"combined":true},"Track & Field":{"schedule":["https://ukathletics.com/sports/track/schedule/"],"roster":["https://ukathletics.com/sports/track/roster/"],"combined":false},"Volleyball":{"schedule":["https://ukathletics.com/sports/wvball/schedule/"],"roster":["https://ukathletics.com/sports/wvball/roster/"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'kentucky|"+sport+"':"),`${sport} routes must live in the Kentucky module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://ukathletics.com/sports/${slug}/schedule/`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.kentuckyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=kentucky)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 4 Kentucky vs Cincinnati (Exhibition) | L, 4-13 (14 inn.)",
 "Upcoming Oct 11, 2:00 PM Kentucky vs Xavier (Exhibition) | ",
 "Upcoming Oct 16, 5:00 PM Kentucky at Indiana (Exhibition) | ",
 "Upcoming Oct 25, 12:30 PM Kentucky vs Morehead State (Exhibition) | ",
 "Upcoming Mar 19 Kentucky vs Georgia | ",
 "Upcoming Mar 20 Kentucky vs Georgia | ",
 "Upcoming Mar 21 Kentucky vs Georgia | ",
 "Upcoming Mar 26 Kentucky at Missouri | ",
 "Upcoming Mar 27 Kentucky at Missouri | ",
 "Upcoming Mar 28 Kentucky at Missouri | ",
 "Upcoming Apr 2 Kentucky vs Texas A&M | ",
 "Upcoming Apr 3 Kentucky vs Texas A&M | ",
 "Upcoming Apr 4 Kentucky vs Texas A&M | ",
 "Upcoming Apr 9 Kentucky at Vanderbilt | ",
 "Upcoming Apr 10 Kentucky at Vanderbilt | ",
 "Upcoming Apr 11 Kentucky at Vanderbilt | ",
 "Upcoming Apr 16 Kentucky at Oklahoma | ",
 "Upcoming Apr 17 Kentucky at Oklahoma | ",
 "Upcoming Apr 18 Kentucky at Oklahoma | ",
 "Upcoming Apr 23 Kentucky vs Florida | ",
 "Upcoming Apr 24 Kentucky vs Florida | ",
 "Upcoming Apr 25 Kentucky vs Florida | ",
 "Upcoming Apr 30 Kentucky at Alabama | ",
 "Upcoming May 1 Kentucky at Alabama | ",
 "Upcoming May 2 Kentucky at Alabama | ",
 "Upcoming May 7 Kentucky vs South Carolina | ",
 "Upcoming May 8 Kentucky vs South Carolina | ",
 "Upcoming May 9 Kentucky vs South Carolina | ",
 "Upcoming May 14 Kentucky at Arkansas | ",
 "Upcoming May 15 Kentucky at Arkansas | ",
 "Upcoming May 16 Kentucky at Arkansas | ",
 "Upcoming May 20 Kentucky vs LSU | ",
 "Upcoming May 21 Kentucky vs LSU | ",
 "Upcoming May 22 Kentucky vs LSU | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Oct 16, 7:00 PM Men's · Kentucky vs Little Rock (Exhibition) | ",
 "Upcoming Oct 23, 7:00 PM Men's · Kentucky vs Texas Tech (Exhibition) | ",
 "Upcoming Oct 28, 6:00 PM Men's · Kentucky vs UCF (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Kentucky vs Manhattan | ",
 "Upcoming Nov 6, 7:00 PM Men's · Kentucky vs James Madison | ",
 "Upcoming Nov 10, 9:30 PM Men's · Kentucky vs Kansas | ",
 "Upcoming Nov 13, 7:00 PM Men's · Kentucky vs Northern Arizona | ",
 "Upcoming Nov 16, 7:00 PM Men's · Kentucky vs Grambling State | ",
 "Upcoming Nov 20, 8:00 PM Men's · Kentucky vs Indiana | ",
 "Upcoming Nov 27, 9:00 PM Men's · Kentucky vs Wichita State | ",
 "Upcoming Dec 2, 7:15 PM Men's · Kentucky at Virginia | ",
 "Upcoming Dec 5, 1:00 PM Men's · Kentucky vs Appalachian State | ",
 "Upcoming Dec 8, 7:30 PM Men's · Kentucky vs Bryant | ",
 "Upcoming Dec 12, 4:00 PM Men's · Kentucky vs Louisville | ",
 "Upcoming Dec 19, 2:30 PM Men's · Kentucky vs North Carolina | ",
 "Upcoming Dec 22, 1:00 PM Men's · Kentucky vs Sacred Heart | ",
 "Upcoming Dec 28, 7:00 PM Men's · Kentucky vs Gardner-Webb | ",
 "Upcoming Jan 2, 12:00 PM Men's · Kentucky at Oklahoma | ",
 "Upcoming Jan 5, 7:00 PM Men's · Kentucky vs Ole Miss | ",
 "Upcoming Jan 9, 4:00 PM Men's · Kentucky at Missouri | ",
 "Upcoming Jan 13, 7:00 PM Men's · Kentucky vs LSU | ",
 "Upcoming Jan 16, 4:00 PM Men's · Kentucky vs Vanderbilt | ",
 "Upcoming Jan 20, 8:30 PM Men's · Kentucky at Mississippi State | ",
 "Upcoming Jan 23, 2:00 PM Men's · Kentucky vs Tennessee | ",
 "Upcoming Jan 30, 12:00 PM Men's · Kentucky at Texas | ",
 "Upcoming Feb 2, 9:00 PM Men's · Kentucky at Ole Miss | ",
 "Upcoming Feb 6, 2:00 PM Men's · Kentucky vs Alabama | ",
 "Upcoming Feb 10, 8:00 PM Men's · Kentucky vs South Carolina | ",
 "Upcoming Feb 13, 4:00 PM Men's · Kentucky at Tennessee | ",
 "Upcoming Feb 16, 7:00 PM Men's · Kentucky at Georgia | ",
 "Upcoming Feb 20, 6:00 PM Men's · Kentucky vs Arkansas | ",
 "Upcoming Feb 23, 9:00 PM Men's · Kentucky at Vanderbilt | ",
 "Upcoming Feb 27, 4:00 PM Men's · Kentucky vs Auburn | ",
 "Upcoming Mar 3, 7:00 PM Men's · Kentucky vs Texas A&M | ",
 "Upcoming Mar 6, 4:00 PM Men's · Kentucky at Florida | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Kentucky vs Morehead State | ",
 "Upcoming Nov 5, 6:30 PM Women's · Kentucky vs NKU | ",
 "Upcoming Nov 8, 3:00 PM Women's · Kentucky vs NC State | ",
 "Upcoming Nov 11, 6:30 PM Women's · Kentucky vs Evansville | ",
 "Upcoming Nov 15, 12:00 PM Women's · Kentucky vs Eastern Michigan | ",
 "Upcoming Nov 20, 6:00 PM Women's · Kentucky vs Marshall | ",
 "Upcoming Nov 27, 3:30 PM Women's · Kentucky vs Maine | ",
 "Upcoming Nov 28, 3:30 PM Women's · Kentucky vs South Dakota State | ",
 "Upcoming Dec 3, 7:00 PM Women's · Kentucky vs Clemson | ",
 "Upcoming Dec 6, 2:00 PM Women's · Kentucky vs Bellarmine | ",
 "Upcoming Dec 9, 9:00 PM Women's · Kentucky vs Louisville | ",
 "Upcoming Dec 13, 12:00 PM Women's · Kentucky at Le Moyne | ",
 "Upcoming Dec 20, 3:30 PM Women's · Kentucky vs Virginia | ",
 "Upcoming Dec 28, 3:00 PM Women's · Kentucky vs Kent State | ",
 "Upcoming Dec 31, 3:00 PM Women's · Kentucky at Florida | ",
 "Upcoming Jan 3, 12:00 PM Women's · Kentucky vs Auburn | ",
 "Upcoming Jan 7, 7:30 PM Women's · Kentucky at Missouri | ",
 "Upcoming Jan 10, 2:00 PM Women's · Kentucky vs Texas | ",
 "Upcoming Jan 14, 7:30 PM Women's · Kentucky vs Arkansas | ",
 "Upcoming Jan 21, 8:00 PM Women's · Kentucky vs Tennessee | ",
 "Upcoming Jan 24, 2:00 PM Women's · Kentucky at Oklahoma | ",
 "Upcoming Jan 28, 8:30 PM Women's · Kentucky vs Alabama | ",
 "Upcoming Jan 31, 3:00 PM Women's · Kentucky at South Carolina | ",
 "Upcoming Feb 4, 8:00 PM Women's · Kentucky vs LSU | ",
 "Upcoming Feb 7, 12:00 PM Women's · Kentucky at Georgia | ",
 "Upcoming Feb 11, 7:00 PM Women's · Kentucky at Ole Miss | ",
 "Upcoming Feb 15, 6:00 PM Women's · Kentucky vs Vanderbilt | ",
 "Upcoming Feb 21, 1:00 PM Women's · Kentucky at Tennessee | ",
 "Upcoming Feb 25, 8:00 PM Women's · Kentucky at Texas A&M | ",
 "Upcoming Feb 28, 2:00 PM Women's · Kentucky vs Mississippi State | ",
 "Upcoming Mar 3 Women's · Kentucky vs SEC Championship | "
]);
  const v_cross=parse("Cross Country","cross");
  assert.deepEqual(v_cross.map(line),[
 "Final Sep 11 Kentucky at Tennessee Invitational | Women's team: 2nd · 40 pts / Men's team: 3rd · 48 pts",
 "Final Sep 25 Kentucky at Gans Creek Classic | Women's team: 2nd · 130 pts / Men's team: 12th · 311 pts",
 "Upcoming Oct 16 Kentucky at Pre-National Invitational | ",
 "Upcoming Oct 30 Kentucky at SEC Championships | ",
 "Upcoming Nov 13 Kentucky at NCAA Southeast Regional | ",
 "Upcoming Nov 21 Kentucky at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Kentucky vs Youngstown State | W, 45-13",
 "Final Sep 12 Kentucky vs Alabama | L, 17-45",
 "Final Sep 19 Kentucky at Texas A&M | W, 31-21",
 "Final Sep 26 Kentucky vs South Alabama | W, 45-21",
 "Final Oct 3 Kentucky at South Carolina | W, 35-34 (OT)",
 "Upcoming Oct 10, 7:00 PM Kentucky vs LSU | ",
 "Upcoming Oct 17, 7:30 PM Kentucky at Oklahoma | ",
 "Upcoming Oct 24 Kentucky vs Vanderbilt | ",
 "Upcoming Nov 7 Kentucky at Tennessee | ",
 "Upcoming Nov 14 Kentucky vs Florida | ",
 "Upcoming Nov 21 Kentucky at Missouri | ",
 "Upcoming Nov 28 Kentucky vs Louisville | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Aug 31 Men's · Kentucky at Visit Knox Collegiate | 15th of 17",
 "Final Sep 14 Men's · Kentucky at Bearcat Invitational | T7th of 17",
 "Final Sep 28 Men's · Kentucky at Windon Memorial Classic | T9th of 16",
 "Final Oct 5 Men's · Kentucky at Cullan Brown Collegiate | 4th of 15",
 "Upcoming Oct 18 Men's · Kentucky at Williams Cup | ",
 "Upcoming Feb 15 Men's · Kentucky at Watersound Invitational | ",
 "Upcoming Mar 7 Men's · Kentucky at Colleton River Collegiate | ",
 "Upcoming Mar 19 Men's · Kentucky at Schenkel Invitational | ",
 "Upcoming Apr 2 Men's · Kentucky at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · Kentucky at Mountaineer Invitational | ",
 "Upcoming Apr 21 Men's · Kentucky at SEC Championship | ",
 "Upcoming May 17 Men's · Kentucky at NCAA Regionals | ",
 "Upcoming May 28 Men's · Kentucky at NCAA National Championship | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · Kentucky at Folds of Honor Collegiate | 8th",
 "Final Sep 21 Women's · Kentucky at Bettie Lou Evans Invitational | 1st",
 "Final Oct 5 Women's · Kentucky at The Ally | T4th",
 "Upcoming Oct 23 Women's · Kentucky at The Landfall Tradition | ",
 "Upcoming Feb 1 Women's · Kentucky at Paradise Invitational | ",
 "Upcoming Feb 15 Women's · Kentucky at Texas Golf Throwdown | ",
 "Upcoming Mar 1 Women's · Kentucky at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 14 Women's · Kentucky at Mountain View Collegiate | ",
 "Upcoming Apr 5 Women's · Kentucky at Olde Stone Intercollegiate | ",
 "Upcoming Apr 16 Women's · Kentucky at SEC Championship | ",
 "Upcoming May 10 Women's · Kentucky at NCAA Regionals | ",
 "Upcoming May 21 Women's · Kentucky at NCAA Championship | "
]);
  const v_wgym=parse("Gymnastics","wgym");
  assert.deepEqual(v_wgym.map(line),[
 "Upcoming Jan 8 Kentucky vs Ohio State | ",
 "Upcoming Jan 15 Kentucky at Oklahoma | ",
 "Upcoming Jan 22 Kentucky vs LSU | ",
 "Upcoming Jan 29 Kentucky at Missouri | ",
 "Upcoming Feb 6 Kentucky at Metroplex Challenge | ",
 "Upcoming Feb 12 Kentucky vs Auburn | ",
 "Upcoming Feb 19 Kentucky at Georgia | ",
 "Upcoming Feb 26 Kentucky vs Alabama | ",
 "Upcoming Mar 5 Kentucky at Florida | ",
 "Upcoming Mar 12 Kentucky vs Arkansas | ",
 "Upcoming Mar 20 Kentucky at SEC Championships | ",
 "Upcoming Mar 31 Kentucky at NCAA Regionals | ",
 "Upcoming Apr 15 Kentucky at NCAA National Championships | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 3 Kentucky at Georgia Southern | W, 4723-4722",
 "Upcoming Oct 10, 9:00 AM Kentucky vs Murray State | ",
 "Upcoming Oct 17 Kentucky vs Akron | ",
 "Upcoming Oct 24 Kentucky at Nebraska | ",
 "Upcoming Oct 31 Kentucky vs Navy | ",
 "Upcoming Nov 14 Kentucky at Smallbore and Air Rifle | ",
 "Upcoming Nov 21 Kentucky at Alaska & Air Force | ",
 "Upcoming Jan 16 Kentucky at Memphis | ",
 "Upcoming Jan 17 Kentucky at Ole Miss | ",
 "Upcoming Jan 23 Kentucky at Withrow Invitational | ",
 "Upcoming Jan 30 Kentucky vs Army West Point | ",
 "Upcoming Feb 13 Kentucky vs West Virginia | ",
 "Upcoming Feb 20 Kentucky at NCAA Qualifier | ",
 "Upcoming Feb 27 Kentucky at GARC Championships | ",
 "Upcoming Mar 12 Kentucky at NCAA Championships | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_msoc=parse("Soccer","msoc");
  assert.deepEqual(v_msoc.map(line),[
 "Final Aug 20 Men's · Kentucky vs Western Michigan | T, 2-2",
 "Final Aug 24 Men's · Kentucky vs Louisville | L, 2-3",
 "Final Aug 28 Men's · Kentucky at Virginia Tech | L, 0-3",
 "Final Sep 4 Men's · Kentucky vs Evansville | T, 1-1",
 "Final Sep 8 Men's · Kentucky vs Ohio State | L, 1-4",
 "Final Sep 18 Men's · Kentucky vs Marshall | L, 0-1",
 "Final Sep 22 Men's · Kentucky at Lipscomb | L, 1-2",
 "Final Sep 27 Men's · Kentucky at UCF | T, 1-1",
 "Final Oct 2 Men's · Kentucky vs Old Dominion | W, 4-2",
 "Final Oct 6 Men's · Kentucky at Indiana | L, 1-3",
 "Upcoming Oct 10, 7:00 PM Men's · Kentucky at South Carolina | ",
 "Upcoming Oct 16, 7:00 PM Men's · Kentucky at West Virginia | ",
 "Upcoming Oct 21, 7:00 PM Men's · Kentucky vs Coastal Carolina | ",
 "Upcoming Oct 25, 6:00 PM Men's · Kentucky at James Madison | ",
 "Upcoming Oct 30, 7:00 PM Men's · Kentucky vs Georgia Southern | ",
 "Upcoming Nov 3, 7:00 PM Men's · Kentucky at Georgia State | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Women's · Kentucky vs Detroit Mercy | W, 6-0",
 "Final Aug 17 Women's · Kentucky vs Kent State | W, 5-2",
 "Final Aug 20 Women's · Kentucky at Dayton | W, 5-0",
 "Final Aug 27 Women's · Kentucky at Ohio State | L, 1-2",
 "Final Aug 30 Women's · Kentucky vs Wright State | W, 9-1",
 "Final Sep 3 Women's · Kentucky vs Louisville | L, 1-2",
 "Final Sep 6 Women's · Kentucky vs Bowling Green | L, 1-2",
 "Final Sep 11 Women's · Kentucky vs Texas A&M | W, 3-2",
 "Final Sep 18 Women's · Kentucky at Missouri | W, 2-1",
 "Final Sep 24 Women's · Kentucky at South Carolina | L, 0-2",
 "Final Sep 27 Women's · Kentucky vs Mississippi State | T, 0-0",
 "Final Oct 2 Women's · Kentucky at Vanderbilt | L, 0-2",
 "Upcoming Oct 9, 7:30 PM Women's · Kentucky vs Texas | ",
 "Upcoming Oct 15, 7:30 PM Women's · Kentucky at Auburn | ",
 "Upcoming Oct 18, 2:00 PM Women's · Kentucky at Tennessee | ",
 "Upcoming Oct 23, 7:30 PM Women's · Kentucky vs Ole Miss | ",
 "Upcoming Nov 1, 1:00 PM Women's · Kentucky vs Arkansas | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 13 Kentucky vs Louisville | W, 9-1",
 "Final Sep 20 Kentucky vs Eastern Kentucky | W, 14-1",
 "Final Sep 25 Kentucky vs Georgetown | W, 7-3",
 "Final Oct 3 Kentucky vs Danville Area CC (Game 1) | W, 17-2",
 "Final Oct 3 Kentucky vs Danville Area CC (Game 2) | W, 17-6",
 "Final Oct 4 Kentucky at Miami (OH) (Game 1) | W, 7-4",
 "Final Oct 4 Kentucky at Miami (OH) (Game 2) | W, 26-0",
 "Upcoming Oct 17, 2:00 PM Kentucky vs Marshall | "
]);
  const v_swimming=parse("Swimming & Diving","swimming");
  assert.deepEqual(v_swimming.map(line),[
 "Final Oct 2 Kentucky vs Florida | Women's team: L, 115-183 / Men's team: L, 103-194",
 "Upcoming Oct 16 Kentucky at South Carolina | ",
 "Upcoming Oct 23, 2:00 PM Kentucky at Indiana & South California | ",
 "Upcoming Oct 28, 4:00 PM Kentucky at US World Championship Trials | ",
 "Upcoming Nov 6, 5:00 PM Kentucky vs Ohio State | ",
 "Upcoming Nov 17 Kentucky at OSU Invite | ",
 "Upcoming Dec 1 Kentucky at World Championships | ",
 "Upcoming Dec 9 Kentucky at Winter Diving Nationals | ",
 "Upcoming Dec 11, 4:00 PM Kentucky at Tennessee | ",
 "Upcoming Jan 9, 12:00 PM Kentucky at Alabama | ",
 "Upcoming Jan 23, 1:00 PM Kentucky vs Louisville | ",
 "Upcoming Jan 29, 11:30 AM Kentucky at Cincinnati | ",
 "Upcoming Feb 4 Kentucky at Louisville | ",
 "Upcoming Feb 14 Kentucky at SEC Championships | ",
 "Upcoming Mar 8 Kentucky at NCAA Diving Zones | ",
 "Upcoming Mar 11 Kentucky at CSCAA National Invitational | ",
 "Upcoming Mar 17 Kentucky at Women's NCAA Championship | ",
 "Upcoming Mar 24 Kentucky at Men's NCAA Championship | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Sep 18 Women's · Kentucky at Big Blue Invite | Completed",
 "Final Sep 19 Women's · Kentucky at ITA All-American Championships | Completed",
 "Today Oct 8 Women's · Kentucky at ITA Regional Championships | ",
 "Upcoming Nov 5 Women's · Kentucky at ITA Sectional Championships | ",
 "Upcoming Nov 13 Women's · Kentucky at Wildcat Invite | "
]);
  const v_track=parse("Track & Field","track");
  assert.deepEqual(v_track.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 8 Kentucky vs Ohio (Exhibition) | W, 4-0",
 "Final Aug 14 Kentucky vs Dayton (Exhibition) | W, 4-0",
 "Final Aug 21 Kentucky vs Wisconsin | W, 3-0",
 "Final Aug 23 Kentucky vs Pittsburgh | L, 1-3",
 "Final Aug 28 Kentucky vs Utah State | W, 3-0",
 "Final Aug 29 Kentucky vs South Florida | W, 3-0",
 "Final Sep 2 Kentucky vs UCLA | W, 3-0",
 "Final Sep 6 Kentucky vs Penn State | W, 3-1",
 "Final Sep 9 Kentucky vs North Carolina | W, 3-0",
 "Final Sep 12 Kentucky vs SMU | L, 1-3",
 "Final Sep 13 Kentucky vs Houston | W, 3-0",
 "Final Sep 20 Kentucky vs Louisville | W, 3-1",
 "Final Sep 23 Kentucky at Vanderbilt | W, 3-1",
 "Final Sep 27 Kentucky vs Texas | W, 3-0",
 "Final Oct 2 Kentucky at Auburn | W, 3-1",
 "Final Oct 4 Kentucky at Florida | L, 2-3",
 "Upcoming Oct 9, 7:00 PM Kentucky vs LSU | ",
 "Upcoming Oct 11, 2:00 PM Kentucky vs Ole Miss | ",
 "Upcoming Oct 16, 7:00 PM Kentucky at Oklahoma | ",
 "Upcoming Oct 18, 3:00 PM Kentucky at Arkansas | ",
 "Upcoming Oct 21, 7:00 PM Kentucky at Tennessee | ",
 "Upcoming Oct 25, 1:00 PM Kentucky vs Texas A&M | ",
 "Upcoming Oct 30, 7:00 PM Kentucky vs Missouri | ",
 "Upcoming Nov 6, 7:00 PM Kentucky vs Alabama | ",
 "Upcoming Nov 8, 1:00 PM Kentucky vs Mississippi State | ",
 "Upcoming Nov 13, 7:00 PM Kentucky at South Carolina | ",
 "Upcoming Nov 15, 2:00 PM Kentucky at Georgia | ",
 "Upcoming Nov 20 Kentucky vs SEC Tournament - Opening Round | ",
 "Upcoming Nov 21 Kentucky vs SEC Tournament - Second Round | ",
 "Upcoming Nov 22 Kentucky vs SEC Tournament - Quarterfinals | ",
 "Upcoming Nov 23 Kentucky vs SEC Tournament - Semifinals | ",
 "Upcoming Nov 24, 7:00 PM Kentucky vs SEC Tournament - Championship Match | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_cross,"Cross Country cross");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_wgym,"Gymnastics wgym");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_msoc,"Soccer msoc");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimming,"Swimming & Diving swimming");
  ownRecapsOnly(v_mten,"Tennis mten");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_track,"Track & Field track");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.name,r.conference?.text]).flat();
const rows=e=>e.results.map(r=>`${r.label||r.group}: ${r.value ?? r.result}`).join(' / ');

// Seasons: a card shows the month and day only; the page heading names the
// season ("2026-27": July-December in 2026; "2027": baseball's October
// exhibitions, listed before the spring season, in 2026).
{
  assert.deepEqual(parse('Baseball','baseball').slice(0,2).map(e=>e.start_time.slice(0,10)),["2026-10-04","2026-10-11"]);
  assert.equal(parse('Baseball','baseball').at(-1).start_time.slice(0,10),'2027-05-22');
  assert.deepEqual(parse('Golf','mgolf').map(e=>e.start_time.slice(0,10)).filter(d=>d<'2026-07-01'),[]);
  assert.ok(parse('Golf','mgolf').some(e=>e.start_time.startsWith('2027-02-15')));
}

// Golf: one event per tournament from its day cards, with the last played
// day's place and team score ("15th/17 (852)", "T7 (296, +8)"); The Ally's
// cancelled final round ends it the day before.
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,rows(e),e.end_time?.slice(0,10)]);
  assert.deepEqual(final('mgolf'),[["Visit Knox Collegiate","15th of 17","Result: 15th of 17 / Team score: 852","2026-09-01"],["Bearcat Invitational","T7th of 17","Result: T7th of 17 / Team score: 853","2026-09-15"],["Windon Memorial Classic","T9th of 16","Result: T9th of 16 / Team score: 848","2026-09-29"],["Cullan Brown Collegiate","4th of 15","Result: 4th of 15 / Team score: 855","2026-10-06"]]);
  assert.deepEqual(final('wgolf'),[["Folds of Honor Collegiate","8th","Result: 8th / Team score: 886 (+22)","2026-09-09"],["Bettie Lou Evans Invitational","1st","Result: 1st / Team score: 839 (-25)","2026-09-22"],["The Ally","T4th","Result: T4th / Team score: 581 (+5)","2026-10-06"]]);
}

// Cross country: the card's team places, then TFRRS's complete races.
{
  const xc=parse('Cross Country','cross').filter(e=>e.status==='Final');
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline]),[["Tennessee Invitational","Women's team: 2nd · 40 pts / Men's team: 3rd · 48 pts"],["Gans Creek Classic","Women's team: 2nd · 130 pts / Men's team: 12th · 311 pts"]]);
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/KY_college_f_Kentucky.html',Men:'https://www.tfrrs.org/teams/xc/KY_college_m_Kentucky.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Tennessee Invitational","Women's team: 2nd · 40 pts / Men's team: 3rd · 48 pts",true],["Gans Creek Classic","Women's team: 2nd · 136 pts / Men's team: 12th · 311 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Swimming: a dual per team, the scores read for Kentucky ("Women - UF 183,
// UK 115"); its story comes from the site's news search (the card links
// none), not the preview.
{
  const [dual]=parse('Swimming & Diving','swimming').filter(e=>e.status==='Final');
  assert.deepEqual([dual.title,dual.event_type,dual.headline,rows(dual)],["Kentucky vs Florida","MEET","Women's team: L, 115-183 / Men's team: L, 103-194","Women's Team: L, 115-183 / Men's Team: L, 103-194"]);
  assert.ok(worker.kentuckyHandlers.isFinalWithoutStory(dual));
  // Kentucky's score is read wherever it stands.
  assert.deepEqual(kentuckySwimDuals('Women - UK 150, IU 112; Men - UK 98, IU 164').headline,"Women's team: W, 150-112 / Men's team: L, 98-164");
  recapFixtures.set('https://ukathletics.com/wp-json/wp/v2/posts?search=florida&after=2026-10-01T00:00:00&before=2026-10-06T00:00:00&per_page=20&_fields=link,title,excerpt,date',fixture('archive-swim-florida.json.gz'));
  await worker.kentuckyHandlers.attachArchiveStory(dual);
  assert.equal(dual.recap_url,'https://ukathletics.com/news/2026/10/02/kentucky-swim-dive-fall-to-no-3-10-florida-in-first-dual-meet/');
  assert.ok(worker.kentuckyHandlers.matchesRecap(fixture('recap-2026-10-02-kentucky-swim-dive-fall-to-no-3-10-flor.html.gz'),dual,dual.recap_url));
  recapFixtures.clear();requests.length=0;
}

// The story text is in div.article_text (WordPress).
assert.match(worker.recapArticleText(fixture('recap-2026-09-05-kentucky-tops-youngstown-state-for-stein.html.gz')),/^Quarterback Kenny Minchey connected on 18 of 27/);

// Internal events are not listed (the spring game, Big Blue Madness,
// swimming's Blue vs. White); exhibitions read "(Exhibition)"; a page still
// showing last season (men's tennis 2025-26, track 2025-26, STUNT 2026) is a
// valid empty schedule.
{
  assert.equal(parse('Football','football').filter(e=>/Spring/.test(e.opponent)).length,0);
  assert.equal(parse('Basketball','mbball',new Date('2026-09-20T15:00:00Z')).filter(e=>/Madness/.test(e.opponent)).length,0);
  assert.equal(parse('Swimming & Diving','swimming').filter(e=>/White/.test(e.opponent)).length,0);
  assert.deepEqual(parse('Volleyball','wvball').filter(e=>/Exhibition/.test(e.opponent)).map(line),["Final Aug 8 Kentucky vs Ohio (Exhibition) | W, 4-0","Final Aug 14 Kentucky vs Dayton (Exhibition) | W, 4-0"]);
  for(const [sport,slug] of [['Tennis','mten'],['Track & Field','track'],['STUNT','stunt']]){
    const events=worker.kentuckyHandlers.parseSchedule(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),now);
    assert.deepEqual(events,[],slug);assert.ok(worker.kentuckyHandlers.isEmptySchedule(events),slug);
  }
  // Last season, men's tennis listed its players' pro events and individual
  // NCAA matches; neither is the team's.
  const spring=parse('Tennis','mten',new Date('2026-05-02T15:00:00Z'));
  assert.equal(spring.filter(e=>/ITF|ATP|Open Junior|\(UK\)/.test(e.opponent)).length,0);
  assert.deepEqual(spring.filter(e=>e.opponent.startsWith('Dayton')).map(e=>[e.id.endsWith('-2'),e.headline]),[[false,'W, 6-1'],[true,'W, 4-0']]);
}

// A finished tennis tournament with neither a place nor a story (the Big
// Blue Invite, the ITA All-American) is not listed.
assert.deepEqual(parse('Tennis','wten').filter(e=>e.status==='Final').map(e=>[e.opponent,worker.kentuckyHandlers.isUnlisted(e)]),[["Big Blue Invite",true],["ITA All-American Championships",true]]);

// Live: ESPN joins the official card for Kentucky's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Kentucky at South Carolina","Final","W, 35-34"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','wvball'),new Date('2026-10-05T12:00:00Z'),[["Kentucky at Florida","Final","L, 2-3"]]);
}

// Records: women's soccer and men's soccer equal the ones the stories publish
// ("6-5-1, 2-2-1 SEC"; "1-6-3, 1-1-1 SBC": men's soccer plays in the Sun
// Belt); football and volleyball are counted from the finals by hand
// (football 4-1, SEC 2-1: Alabama, Texas A&M, South Carolina; volleyball
// 11-3, SEC 3-1).
assert.deepEqual([['Football','football'],['Volleyball','wvball'],['Soccer','wsoc'],['Soccer','msoc']].map(([sport,slug])=>records(sport,slug)),[["4-1","SEC","2-1"],["11-3","SEC","3-1"],["6-5-1","SEC","2-2-1"],["1-6-3","Sun Belt","1-1-1"]]);

// Other schools and other hosts never reach the Kentucky reader.
assert.equal(worker.kentuckyHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://ukathletics.com/',now),null);
assert.equal(worker.kentuckyHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Kentucky module checks passed');
