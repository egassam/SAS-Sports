import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mississippiValleyStateSchool} from '../src/schools/mississippi-valley-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mississippi-valley-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mississippiValleyStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mississippi-valley-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mvsusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mississippi-valley-state'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',mississippiValleyStateSchool.scheduleUrls],['roster',mississippiValleyStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mississippi-valley-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mvsusports.com',`${key} must stay on mvsusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mvsusports.com/sports/baseball/schedule"],"roster":["https://mvsusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mvsusports.com/sports/mens-basketball/schedule","https://mvsusports.com/sports/womens-basketball/schedule"],"roster":["https://mvsusports.com/sports/mens-basketball/roster","https://mvsusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://mvsusports.com/sports/mens-cross-country/schedule","https://mvsusports.com/sports/womens-cross-country/schedule"],"roster":["https://mvsusports.com/sports/mens-cross-country/roster","https://mvsusports.com/sports/womens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://mvsusports.com/sports/football/schedule"],"roster":["https://mvsusports.com/sports/football/roster"],"combined":false},"Softball":{"schedule":["https://mvsusports.com/sports/softball/schedule"],"roster":["https://mvsusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://mvsusports.com/sports/mens-tennis/schedule","https://mvsusports.com/sports/womens-tennis/schedule"],"roster":["https://mvsusports.com/sports/mens-tennis/roster","https://mvsusports.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://mvsusports.com/sports/mens-track-and-field/schedule","https://mvsusports.com/sports/womens-track-and-field/schedule"],"roster":["https://mvsusports.com/sports/mens-track-and-field/roster","https://mvsusports.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://mvsusports.com/sports/womens-volleyball/schedule"],"roster":["https://mvsusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mississippi-valley-state|"+sport+"':"),`${sport} routes must live in the Mississippi Valley State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://mvsusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mississippiValleyStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mississippi-valley-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 6, 7:00 PM Men's · Mississippi Valley State at Oklahoma | ",
 "Upcoming Nov 9, 9:00 PM Men's · Mississippi Valley State at Washington | ",
 "Upcoming Nov 11, 9:00 PM Men's · Mississippi Valley State at Oregon | ",
 "Upcoming Nov 13, 8:30 PM Men's · Mississippi Valley State at Oregon State | ",
 "Upcoming Nov 20 Men's · Mississippi Valley State at Arkansas | ",
 "Upcoming Nov 25, 9:00 PM Men's · Mississippi Valley State at New Mexico | ",
 "Upcoming Dec 1, 7:00 PM Men's · Mississippi Valley State at Michigan | ",
 "Upcoming Dec 6, 3:00 PM Men's · Mississippi Valley State at North Texas | ",
 "Upcoming Dec 8, 6:00 PM Men's · Mississippi Valley State at Connecticut | ",
 "Upcoming Dec 15, 6:30 PM Men's · Mississippi Valley State at Mississippi State | ",
 "Upcoming Dec 18, 6:30 PM Men's · Mississippi Valley State at Tulane | ",
 "Upcoming Dec 22, 3:00 PM Men's · Mississippi Valley State at Ohio State | ",
 "Upcoming Dec 28, 6:30 PM Men's · Mississippi Valley State at Texas Tech | ",
 "Upcoming Dec 29, 6:00 PM Men's · Mississippi Valley State at Baylor | ",
 "Upcoming Jan 2, 3:00 PM Men's · Mississippi Valley State at Alabama State | ",
 "Upcoming Jan 4, 7:30 PM Men's · Mississippi Valley State at Alabama A&M | ",
 "Upcoming Jan 9, 3:00 PM Men's · Mississippi Valley State vs Prairie View A&M | ",
 "Upcoming Jan 11, 6:30 PM Men's · Mississippi Valley State vs Texas Southern | ",
 "Upcoming Jan 16 Men's · Mississippi Valley State at Bethune-Cookman | ",
 "Upcoming Jan 18 Men's · Mississippi Valley State at Florida A&M | ",
 "Upcoming Jan 23, 3:00 PM Men's · Mississippi Valley State vs Grambling State | ",
 "Upcoming Jan 25, 6:30 PM Men's · Mississippi Valley State vs Southern | ",
 "Upcoming Jan 30 Men's · Mississippi Valley State at Arkansas-Pine Bluff | ",
 "Upcoming Feb 6, 2:30 PM Men's · Mississippi Valley State at Jackson State | ",
 "Upcoming Feb 8 Men's · Mississippi Valley State at Alcorn State | ",
 "Upcoming Feb 13, 3:00 PM Men's · Mississippi Valley State vs Alabama A&M | ",
 "Upcoming Feb 15, 6:30 PM Men's · Mississippi Valley State vs Alabama State | ",
 "Upcoming Feb 18 Men's · Mississippi Valley State at Prairie View A&M | ",
 "Upcoming Feb 20 Men's · Mississippi Valley State at Texas Southern | ",
 "Upcoming Feb 27, 3:00 PM Men's · Mississippi Valley State vs Arkansas-Pine Bluff | ",
 "Upcoming Mar 2, 7:30 PM Men's · Mississippi Valley State vs Alcorn State | ",
 "Upcoming Mar 6, 7:30 PM Men's · Mississippi Valley State vs Jackson State | ",
 "Upcoming Mar 9 Men's · Mississippi Valley State at SWAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:30 PM Women's · Mississippi Valley State vs Tougaloo | ",
 "Upcoming Nov 3, 6:00 PM Women's · Mississippi Valley State at Marquette | ",
 "Upcoming Nov 5, 6:00 PM Women's · Mississippi Valley State at Chicago State | ",
 "Upcoming Nov 9, 6:00 PM Women's · Mississippi Valley State at Southern Miss | ",
 "Upcoming Nov 12, 6:00 PM Women's · Mississippi Valley State at Lipscomb | ",
 "Upcoming Nov 14, 11:00 AM Women's · Mississippi Valley State at Tennessee State | ",
 "Upcoming Nov 20, 12:00 PM Women's · Mississippi Valley State vs West Georgia | ",
 "Upcoming Nov 25, 1:00 PM Women's · Mississippi Valley State at Louisiana Tech | ",
 "Upcoming Nov 29, 2:00 PM Women's · Mississippi Valley State at UAB | ",
 "Upcoming Dec 3, 6:30 PM Women's · Mississippi Valley State at Louisiana-Monroe | ",
 "Upcoming Dec 5, 2:00 PM Women's · Mississippi Valley State vs Mercer | ",
 "Upcoming Dec 11, 5:30 PM Women's · Mississippi Valley State vs South Carolina State | ",
 "Upcoming Dec 14, 2:00 PM Women's · Mississippi Valley State at Arkansas State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Mississippi Valley State at Memphis | ",
 "Upcoming Dec 27, 2:00 PM Women's · Mississippi Valley State at Ole Miss | ",
 "Upcoming Jan 2, 1:00 PM Women's · Mississippi Valley State at Alabama State | ",
 "Upcoming Jan 4, 5:30 PM Women's · Mississippi Valley State at Alabama A&M | ",
 "Upcoming Jan 7, 6:30 PM Women's · Mississippi Valley State vs Texas Southern | ",
 "Upcoming Jan 9, 1:00 PM Women's · Mississippi Valley State vs Prairie View A&M | ",
 "Upcoming Jan 14, 6:30 PM Women's · Mississippi Valley State at Florida A&M | ",
 "Upcoming Jan 16, 3:00 PM Women's · Mississippi Valley State at Bethune-Cookman | ",
 "Upcoming Jan 21, 6:30 PM Women's · Mississippi Valley State vs Southern | ",
 "Upcoming Jan 23, 1:00 PM Women's · Mississippi Valley State vs Grambling State | ",
 "Upcoming Jan 30, 3:00 PM Women's · Mississippi Valley State at Arkansas-Pine Bluff | ",
 "Upcoming Feb 4, 6:00 PM Women's · Mississippi Valley State at Alcorn State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Mississippi Valley State at Jackson State | ",
 "Upcoming Feb 11, 6:30 PM Women's · Mississippi Valley State vs Alabama State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Mississippi Valley State vs Alabama A&M | ",
 "Upcoming Feb 18, 6:00 PM Women's · Mississippi Valley State at Prairie View A&M | ",
 "Upcoming Feb 20, 2:00 PM Women's · Mississippi Valley State at Texas Southern | ",
 "Upcoming Feb 27, 1:00 PM Women's · Mississippi Valley State vs Arkansas-Pine Bluff | ",
 "Upcoming Mar 2, 5:30 PM Women's · Mississippi Valley State vs Alcorn State | ",
 "Upcoming Mar 4, 5:30 PM Women's · Mississippi Valley State vs Jackson State | ",
 "Upcoming Mar 9 Women's · Mississippi Valley State at SWAC Tournament | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Mississippi Valley State at Mississippi College Opener | Completed",
 "Final Sep 11 Men's · Mississippi Valley State at AAMU Invitational | Completed",
 "Final Oct 3 Men's · Mississippi Valley State at Belhaven Invitational | Completed",
 "Final Oct 16 Men's · Mississippi Valley State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27 Men's · Mississippi Valley State at SWAC Championship | ",
 "Upcoming Nov 13 Men's · Mississippi Valley State at NCAA | ",
 "Upcoming Nov 21 Men's · Mississippi Valley State at NCAA | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Mississippi Valley State at Mississippi College Opener | Completed",
 "Final Sep 11 Women's · Mississippi Valley State at AAMU Invitational | Completed",
 "Final Oct 3 Women's · Mississippi Valley State at Belhaven Invitational | Completed",
 "Final Oct 16 Women's · Mississippi Valley State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27 Women's · Mississippi Valley State at SWAC Championships | ",
 "Upcoming Nov 13 Women's · Mississippi Valley State at NCAA | ",
 "Upcoming Nov 21 Women's · Mississippi Valley State at NCAA | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Mississippi Valley State at Nicholls | L, 10-44",
 "Final Sep 5 Mississippi Valley State at Sacramento State | L, 0-52",
 "Final Sep 12 Mississippi Valley State vs Lincoln (Pennsylvania) | W, 31-20",
 "Final Sep 19 Mississippi Valley State vs Delta State | L, 6-21",
 "Final Sep 26 Mississippi Valley State at Alabama State | L, 15-41",
 "Final Oct 3 Mississippi Valley State vs Prairie View A&M | W, 28-27",
 "Final Oct 10 Mississippi Valley State at Texas Southern | W, 38-34",
 "Final Oct 17 Mississippi Valley State vs Bethune-Cookman | L, 14-34",
 "Upcoming Oct 31, 2:00 PM Mississippi Valley State vs Alcorn | ",
 "Upcoming Nov 7, 2:00 PM Mississippi Valley State at Jackson State | ",
 "Upcoming Nov 14, 2:00 PM Mississippi Valley State at Florida A&M | ",
 "Upcoming Nov 21, 2:00 PM Mississippi Valley State vs Alabama A&M | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Oct 12 Mississippi Valley State vs Mississippi Delta (Game 1) | W, 21-17",
 "Final Oct 12 Mississippi Valley State vs Mississippi Delta (Game 2) | W, 12-11",
 "Upcoming Oct 28, 3:00 PM Mississippi Valley State at Itawamba CC | ",
 "Upcoming Oct 28, 5:00 PM Mississippi Valley State at Itawamba CC | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Mississippi Valley State vs MUW / Huntingdon | L, 3-4",
 "Final Oct 7 Men's · Mississippi Valley State at Southwest Mississippi | L, 4-5",
 "Final Oct 19 Men's · Mississippi Valley State at SWAC Fall Tennis Tournament | Completed",
 "Today Oct 24, 10:00 AM Men's · Mississippi Valley State at East Central CC Tournament | ",
 "Upcoming Jan 24, 4:00 PM Men's · Mississippi Valley State at Memphis | ",
 "Upcoming Jan 31, 2:00 PM Men's · Mississippi Valley State vs Southwest Mississippi | ",
 "Upcoming Feb 13 Men's · Mississippi Valley State at KWC / USI | ",
 "Upcoming Feb 19 Men's · Mississippi Valley State at Delta State | ",
 "Upcoming Feb 26 Men's · Mississippi Valley State vs Incarnate Word | ",
 "Upcoming Mar 5 Men's · Mississippi Valley State at SWAC Roundup | ",
 "Upcoming Mar 9, 1:30 PM Men's · Mississippi Valley State at Rust | ",
 "Upcoming Mar 13, 10:00 AM Men's · Mississippi Valley State at Jacksonville State | ",
 "Upcoming Mar 17, 6:00 PM Men's · Mississippi Valley State vs Lamar | ",
 "Upcoming Mar 20, 5:00 PM Men's · Mississippi Valley State at Alabama | ",
 "Upcoming Mar 21, 1:00 PM Men's · Mississippi Valley State at Troy | ",
 "Upcoming Mar 26 Men's · Mississippi Valley State at SWAC Roundup | ",
 "Upcoming Apr 3, 5:00 PM Men's · Mississippi Valley State at Mississippi State | ",
 "Upcoming Apr 11, 5:00 PM Men's · Mississippi Valley State at Georgia | ",
 "Upcoming Apr 16 Men's · Mississippi Valley State at SWAC Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Mississippi Valley State at MUW / Huntingdon | L, 2-5",
 "Final Oct 7 Women's · Mississippi Valley State at Southwest Mississippi | L, 4-5",
 "Final Oct 19 Women's · Mississippi Valley State at SWAC Fall Tennis Tournament | Completed",
 "Today Oct 24, 10:00 AM Women's · Mississippi Valley State at East Central CC Tournament | ",
 "Upcoming Jan 31, 2:00 PM Women's · Mississippi Valley State vs Southwest Mississippi | ",
 "Upcoming Feb 13 Women's · Mississippi Valley State at KWC / USI | ",
 "Upcoming Feb 19 Women's · Mississippi Valley State at Delta State | ",
 "Upcoming Feb 27 Women's · Mississippi Valley State at Southeastern Louisiana | ",
 "Upcoming Mar 5 Women's · Mississippi Valley State at SWAC Roundup | ",
 "Upcoming Mar 9, 1:30 PM Women's · Mississippi Valley State at Rust | ",
 "Upcoming Mar 11, 10:00 AM Women's · Mississippi Valley State at Southern Miss | ",
 "Upcoming Mar 13, 10:00 AM Women's · Mississippi Valley State at Jacksonville State | ",
 "Upcoming Mar 21, 1:00 PM Women's · Mississippi Valley State at Troy | ",
 "Upcoming Mar 26 Women's · Mississippi Valley State at SWAC Roundup | ",
 "Upcoming Apr 16 Women's · Mississippi Valley State at SWAC Tournament | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Mississippi Valley State at Armory Collegiate Distance Carnival | ",
 "Upcoming Dec 6 Women's · Mississippi Valley State at Commodore Winter Challenge | ",
 "Upcoming Dec 12 Women's · Mississippi Valley State at Indiana Early Bird | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Mississippi Valley State vs South Carolina State | L, 2-3",
 "Final Aug 28 Mississippi Valley State vs UMES | L, 0-3",
 "Final Aug 29 Mississippi Valley State vs Delaware State | L, 0-3",
 "Final Sep 5 Mississippi Valley State vs Wiley | W, 3-1",
 "Final Sep 5 Mississippi Valley State vs Nicholls | L, 0-3",
 "Final Sep 10 Mississippi Valley State vs Northwestern State | L, 0-3",
 "Final Sep 11 Mississippi Valley State at Louisiana Tech | L, 0-3",
 "Final Sep 12 Mississippi Valley State at Louisiana-Monroe | L, 1-3",
 "Final Sep 16 Mississippi Valley State vs Dillard | L, 0-3",
 "Final Sep 25 Mississippi Valley State vs Texas Southern | L, 0-3",
 "Final Sep 27 Mississippi Valley State vs Prairie View A&M | L, 0-3",
 "Final Sep 30 Mississippi Valley State vs Jackson State | L, 0-3",
 "Final Oct 2 Mississippi Valley State vs Florida A&M | L, 1-3",
 "Final Oct 4 Mississippi Valley State vs Bethune-Cookman | L, 0-3",
 "Final Oct 9 Mississippi Valley State at Southern | L, 1-3",
 "Final Oct 11 Mississippi Valley State at Alcorn State | L, 1-3",
 "Final Oct 15 Mississippi Valley State at Alabama State | L, 0-3",
 "Final Oct 19 Mississippi Valley State at Alabama A&M | L, 0-3",
 "Upcoming Oct 30, 6:00 PM Mississippi Valley State vs Arkansas-Pine Bluff | ",
 "Upcoming Nov 1, 12:00 PM Mississippi Valley State vs Grambling State | ",
 "Upcoming Nov 4, 6:00 PM Mississippi Valley State at Jackson State | ",
 "Upcoming Nov 6, 6:00 PM Mississippi Valley State vs Alabama State | ",
 "Upcoming Nov 8, 12:00 PM Mississippi Valley State vs Alabama A&M | ",
 "Upcoming Nov 13, 6:00 PM Mississippi Valley State at Florida A&M | ",
 "Upcoming Nov 15, 12:00 PM Mississippi Valley State at Bethune-Cookman | ",
 "Upcoming Nov 20 Mississippi Valley State at SWAC Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Mississippi Valley State module checks passed");
