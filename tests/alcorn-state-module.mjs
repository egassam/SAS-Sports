import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {alcornStateSchool} from '../src/schools/alcorn-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='alcorn-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,alcornStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/alcorn-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit alcornsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['alcorn-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',alcornStateSchool.scheduleUrls],['roster',alcornStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('alcorn-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'alcornsports.com',`${key} must stay on alcornsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://alcornsports.com/sports/baseball/schedule"],"roster":["https://alcornsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://alcornsports.com/sports/mens-basketball/schedule","https://alcornsports.com/sports/womens-basketball/schedule"],"roster":["https://alcornsports.com/sports/mens-basketball/roster","https://alcornsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://alcornsports.com/sports/womens-cross-country/schedule","https://alcornsports.com/sports/mens-cross-country/schedule"],"roster":["https://alcornsports.com/sports/womens-cross-country/roster","https://alcornsports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://alcornsports.com/sports/football/schedule"],"roster":["https://alcornsports.com/sports/football/roster"],"combined":false},"Soccer":{"schedule":["https://alcornsports.com/sports/womens-soccer/schedule"],"roster":["https://alcornsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://alcornsports.com/sports/softball/schedule"],"roster":["https://alcornsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://alcornsports.com/sports/womens-tennis/schedule","https://alcornsports.com/sports/mens-tennis/schedule"],"roster":["https://alcornsports.com/sports/womens-tennis/roster","https://alcornsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://alcornsports.com/sports/womens-track-and-field/schedule","https://alcornsports.com/sports/mens-track-and-field/schedule"],"roster":["https://alcornsports.com/sports/womens-track-and-field/roster","https://alcornsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://alcornsports.com/sports/womens-volleyball/schedule"],"roster":["https://alcornsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'alcorn-state|"+sport+"':"),`${sport} routes must live in the Alcorn State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://alcornsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.alcornStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=alcorn-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · Alcorn State at Ole Miss | ",
 "Upcoming Nov 5, 6:00 PM Men's · Alcorn State vs Howard | ",
 "Upcoming Nov 10 Men's · Alcorn State at Murray State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Alcorn State at Tarleton State | ",
 "Upcoming Nov 16, 5:00 PM Men's · Alcorn State at Maryland | ",
 "Upcoming Nov 18, 8:00 PM Men's · Alcorn State at Missouri | ",
 "Upcoming Nov 24, 6:30 PM Men's · Alcorn State at Louisiana Tech | ",
 "Upcoming Nov 25 Men's · Alcorn State vs Texas State | ",
 "Upcoming Nov 28 Men's · Alcorn State at Georgia Tech | ",
 "Upcoming Dec 1 Men's · Alcorn State at Iowa State | ",
 "Upcoming Dec 13, 11:00 AM Men's · Alcorn State at Florida Gulf Coast | ",
 "Upcoming Dec 16, 6:00 PM Men's · Alcorn State at Miami | ",
 "Upcoming Dec 20, 1:00 PM Men's · Alcorn State at Minnesota | ",
 "Upcoming Dec 29, 7:00 PM Men's · Alcorn State at Vanderbilt | ",
 "Upcoming Jan 2, 3:00 PM Men's · Alcorn State vs Jackson State | ",
 "Upcoming Jan 9, 3:00 PM Men's · Alcorn State vs Alabama A&M | ",
 "Upcoming Jan 11, 6:00 PM Men's · Alcorn State vs Alabama State | ",
 "Upcoming Jan 16, 3:00 PM Men's · Alcorn State at Texas Southern | ",
 "Upcoming Jan 18, 6:00 PM Men's · Alcorn State at Prairie View A&M | ",
 "Upcoming Jan 23, 3:00 PM Men's · Alcorn State vs Florida A&M | ",
 "Upcoming Jan 25, 6:00 PM Men's · Alcorn State vs Bethune-Cookman | ",
 "Upcoming Jan 30, 3:00 PM Men's · Alcorn State at Southern | ",
 "Upcoming Feb 1, 6:00 PM Men's · Alcorn State at Grambling State | ",
 "Upcoming Feb 6, 3:00 PM Men's · Alcorn State vs Arkansas - Pine Bluff | ",
 "Upcoming Feb 8, 6:00 PM Men's · Alcorn State vs Mississippi Valley State | ",
 "Upcoming Feb 13, 3:00 PM Men's · Alcorn State at Bethune-Cookman | ",
 "Upcoming Feb 15, 6:00 PM Men's · Alcorn State at Florida A&M | ",
 "Upcoming Feb 20, 3:30 PM Men's · Alcorn State at Jackson State | ",
 "Upcoming Feb 25, 7:30 PM Men's · Alcorn State vs Prairie View A&M | ",
 "Upcoming Feb 27, 3:00 PM Men's · Alcorn State vs Texas Southern | ",
 "Upcoming Mar 2, 8:00 PM Men's · Alcorn State at Mississippi Valley State | ",
 "Upcoming Mar 4, 8:00 PM Men's · Alcorn State at Arkansas - Pine Bluff | ",
 "Upcoming Mar 9 Men's · Alcorn State at SWAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Alcorn State at Ole Miss | ",
 "Upcoming Nov 11 Women's · Alcorn State vs Mississippi University for Women | ",
 "Upcoming Nov 18 Women's · Alcorn State at Nicholls | ",
 "Upcoming Nov 20 Women's · Alcorn State at Tulane | ",
 "Upcoming Nov 23, 11:00 AM Women's · Alcorn State vs Michigan State | ",
 "Upcoming Nov 24, 11:00 AM Women's · Alcorn State vs Virginia Tech or UT Martin | ",
 "Upcoming Dec 1, 6:00 PM Women's · Alcorn State vs Rust College | ",
 "Upcoming Dec 3, 6:00 PM Women's · Alcorn State vs Arkansas Baptist College | ",
 "Upcoming Dec 16 Women's · Alcorn State at Alabama | ",
 "Upcoming Dec 18 Women's · Alcorn State at North Texas | ",
 "Upcoming Dec 27 Women's · Alcorn State at Louisiana State | ",
 "Upcoming Jan 2, 1:00 PM Women's · Alcorn State vs Jackson State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Alcorn State vs Alabama State | ",
 "Upcoming Jan 9, 1:00 PM Women's · Alcorn State vs Alabama A&M | ",
 "Upcoming Jan 14, 6:00 PM Women's · Alcorn State at Prairie View A&M | ",
 "Upcoming Jan 16, 1:00 PM Women's · Alcorn State at Texas Southern | ",
 "Upcoming Jan 23, 1:00 PM Women's · Alcorn State vs Florida A&M | ",
 "Upcoming Jan 25, 6:00 PM Women's · Alcorn State vs Bethune-Cookman | ",
 "Upcoming Jan 28, 6:00 PM Women's · Alcorn State at Grambling State | ",
 "Upcoming Jan 30, 1:00 PM Women's · Alcorn State at Southern | ",
 "Upcoming Feb 4, 6:00 PM Women's · Alcorn State vs Mississippi Valley State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Alcorn State vs Arkansas - Pine Bluff | ",
 "Upcoming Feb 11, 6:00 PM Women's · Alcorn State at Florida A&M | ",
 "Upcoming Feb 13, 1:00 PM Women's · Alcorn State at Bethune-Cookman | ",
 "Upcoming Feb 20, 1:00 PM Women's · Alcorn State at Jackson State | ",
 "Upcoming Feb 25, 5:30 PM Women's · Alcorn State vs Prairie View A&M | ",
 "Upcoming Feb 27, 1:00 PM Women's · Alcorn State vs Texas Southern | ",
 "Upcoming Mar 2, 6:00 PM Women's · Alcorn State at Mississippi Valley State | ",
 "Upcoming Mar 4, 6:00 PM Women's · Alcorn State at Arkansas - Pine Bluff | ",
 "Upcoming Mar 9 Women's · Alcorn State at SWAC Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Alcorn State at Mississippi Christian Opener | Completed",
 "Final Sep 25 Women's · Alcorn State at ULM Warhawk Invitational | Completed",
 "Final Oct 3 Women's · Alcorn State at Belhaven Cross Country Invitational | Completed",
 "Final Oct 16 Women's · Alcorn State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27, 8:00 AM Women's · Alcorn State at SWAC Championships | ",
 "Upcoming Nov 13 Women's · Alcorn State at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Women's · Alcorn State at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Alcorn State at Mississippi Christian Opener | Completed",
 "Final Sep 25 Men's · Alcorn State at ULM Warhawk Invitational | Completed",
 "Final Oct 3 Men's · Alcorn State at Belhaven Cross Country Invitational | Completed",
 "Final Oct 16 Men's · Alcorn State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27, 8:00 AM Men's · Alcorn State at SWAC Championships | ",
 "Upcoming Nov 13 Men's · Alcorn State at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Men's · Alcorn State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Alcorn State vs Miles | W, 56-7",
 "Final Sep 5 Alcorn State at Southern Miss | L, 3-49",
 "Final Sep 12 Alcorn State vs Arkansas - Pine Bluff | W, 53-51",
 "Final Sep 19 Alcorn State at North Alabama | L, 20-38",
 "Final Sep 26 Alcorn State vs Texas Southern | W, 43-40",
 "Final Oct 3 Alcorn State at Grambling State | L, 59-63",
 "Final Oct 10 Alcorn State vs Arkansas Baptist | W, 63-7",
 "Final Oct 17 Alcorn State at Prairie View A&M | L, 38-41",
 "Upcoming Oct 31, 2:00 PM Alcorn State at Mississippi Valley State | ",
 "Upcoming Nov 7, 2:00 PM Alcorn State vs Florida A&M | ",
 "Upcoming Nov 14, 2:00 PM Alcorn State at Southern | ",
 "Upcoming Nov 21, 2:00 PM Alcorn State vs Jackson State | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Alcorn State vs McNeese | L, 1-2",
 "Final Aug 16 Alcorn State at Louisiana-Monroe | L, 1-6",
 "Final Aug 20 Alcorn State at Nicholls | W, 7-4",
 "Final Aug 30 Alcorn State at Mississippi State | L, 0-2",
 "Final Sep 3 Alcorn State vs Northwestern State | W, 3-1",
 "Final Sep 10 Alcorn State vs Jacksonville State | W, 4-1",
 "Final Sep 13 Alcorn State at Troy | T, 3-3",
 "Final Sep 20 Alcorn State at North Carolina | L, 0-5",
 "Final Sep 27 Alcorn State at Alabama State | T, 0-0",
 "Final Oct 2 Alcorn State vs Grambling State | T, 2-2",
 "Final Oct 8 Alcorn State vs Arkansas - Pine Bluff | W, 17-0",
 "Final Oct 16 Alcorn State vs Southern (La.) | W, 4-0",
 "Final Oct 22 Alcorn State at Jackson State | T, 2-2",
 "Upcoming Oct 25, 1:00 PM Alcorn State at Texas Southern | ",
 "Upcoming Oct 30, 1:00 PM Alcorn State at Prairie View A&M | ",
 "Upcoming Nov 5, 6:00 PM Alcorn State vs Alabama A&M | ",
 "Upcoming Nov 11 Alcorn State at SWAC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Alcorn State at Jackson State | Completed",
 "Final Sep 17 Women's · Alcorn State at HBCU National Championship | Completed",
 "Final Oct 19 Women's · Alcorn State at Southwestern Athletic Conference | Completed",
 "Upcoming Oct 30 Women's · Alcorn State at West Florida | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Alcorn State at Jackson State | Completed",
 "Final Sep 17 Men's · Alcorn State at HBCU National Championship | Completed",
 "Final Oct 19 Men's · Alcorn State at Southwestern Athletic Conference | Completed",
 "Upcoming Oct 30 Men's · Alcorn State at West Florida | ",
 "Upcoming Nov 5 Men's · Alcorn State at ITA Conference Masters Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 21 Alcorn State at Northwestern State (Exhibition) | L, 0-4",
 "Final Aug 28 Alcorn State at LSU New Orleans | L, 0-3",
 "Final Aug 29 Alcorn State vs Nicholls | L, 2-3",
 "Final Aug 29 Alcorn State vs Stonehill | L, 0-3",
 "Final Sep 3 Alcorn State vs Dillard (La.) | L, 2-3",
 "Final Sep 4 Alcorn State vs Nicholls | L, 1-3",
 "Final Sep 8 Alcorn State at Louisiana Tech | L, 0-3",
 "Final Sep 10 Alcorn State at Memphis | L, 0-3",
 "Final Sep 11 Alcorn State vs Mississippi State | L, 0-3",
 "Final Sep 12 Alcorn State vs Boston College | L, 0-3",
 "Final Sep 16 Alcorn State at Alabama | L, 0-3",
 "Final Sep 25 Alcorn State vs Grambling State | L, 0-3",
 "Final Sep 27 Alcorn State vs Arkansas - Pine Bluff | W, 3-0",
 "Final Oct 2 Alcorn State at Texas Southern | L, 0-3",
 "Final Oct 4 Alcorn State at Prairie View A&M | L, 0-3",
 "Final Oct 7 Alcorn State at Southern (La.) | W, 3-1",
 "Final Oct 9 Alcorn State vs Jackson State | L, 2-3",
 "Final Oct 11 Alcorn State vs Mississippi Valley State | W, 3-1",
 "Final Oct 23 Alcorn State at Bethune-Cookman | L, 0-3",
 "Upcoming Oct 25 Alcorn State at Florida A&M | ",
 "Upcoming Oct 28, 6:00 PM Alcorn State vs Southern (La.) | ",
 "Upcoming Oct 30, 6:00 PM Alcorn State vs Prairie View A&M | ",
 "Upcoming Nov 1 Alcorn State vs Texas Southern | ",
 "Upcoming Nov 6, 6:00 PM Alcorn State at Grambling State | ",
 "Upcoming Nov 8 Alcorn State at Arkansas - Pine Bluff | ",
 "Upcoming Nov 13, 6:00 PM Alcorn State at Alabama State | ",
 "Upcoming Nov 15 Alcorn State at Alabama A&M | ",
 "Upcoming Nov 20 Alcorn State at SWAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Alcorn State module checks passed");
