import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mercerSchool} from '../src/schools/mercer.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mercer');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mercerHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mercer-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mercerbears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mercer'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',mercerSchool.scheduleUrls],['roster',mercerSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mercer|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mercerbears.com',`${key} must stay on mercerbears.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mercerbears.com/sports/baseball/schedule"],"roster":["https://mercerbears.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mercerbears.com/sports/mens-basketball/schedule","https://mercerbears.com/sports/womens-basketball/schedule"],"roster":["https://mercerbears.com/sports/mens-basketball/roster","https://mercerbears.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://mercerbears.com/sports/womens-beach-volleyball/schedule"],"roster":["https://mercerbears.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://mercerbears.com/sports/womens-cross-country/schedule","https://mercerbears.com/sports/mens-cross-country/schedule"],"roster":["https://mercerbears.com/sports/womens-cross-country/roster","https://mercerbears.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://mercerbears.com/sports/football/schedule"],"roster":["https://mercerbears.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://mercerbears.com/sports/womens-golf/schedule","https://mercerbears.com/sports/mens-golf/schedule"],"roster":["https://mercerbears.com/sports/womens-golf/roster","https://mercerbears.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://mercerbears.com/sports/womens-lacrosse/schedule","https://mercerbears.com/sports/mens-lacrosse/schedule"],"roster":["https://mercerbears.com/sports/womens-lacrosse/roster","https://mercerbears.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://mercerbears.com/sports/womens-soccer/schedule","https://mercerbears.com/sports/mens-soccer/schedule"],"roster":["https://mercerbears.com/sports/womens-soccer/roster","https://mercerbears.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://mercerbears.com/sports/softball/schedule"],"roster":["https://mercerbears.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://mercerbears.com/sports/womens-tennis/schedule","https://mercerbears.com/sports/mens-tennis/schedule"],"roster":["https://mercerbears.com/sports/womens-tennis/roster","https://mercerbears.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://mercerbears.com/sports/womens-track-and-field/schedule"],"roster":["https://mercerbears.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://mercerbears.com/sports/womens-volleyball/schedule"],"roster":["https://mercerbears.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mercer|"+sport+"':"),`${sport} routes must live in the Mercer module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://mercerbears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mercerHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mercer)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 24, 5:00 PM Mercer at Jacksonville (Exhibition) | ",
 "Upcoming Nov 1, 2:00 PM Mercer at Florida (Exhibition) | ",
 "Upcoming Nov 7, 1:00 PM Mercer at USC Upstate (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Men's · Mercer vs Reinhardt | ",
 "Upcoming Nov 5, 7:00 PM Men's · Mercer at Virginia Tech | ",
 "Upcoming Nov 7, 7:00 PM Men's · Mercer at Davidson | ",
 "Upcoming Nov 10, 7:00 PM Men's · Mercer at Georgia Southern | ",
 "Upcoming Nov 12, 7:00 PM Men's · Mercer at West Virginia | ",
 "Upcoming Nov 18, 7:00 PM Men's · Mercer at Presbyterian | ",
 "Upcoming Nov 21, 7:00 PM Men's · Mercer vs Charleston Southern | ",
 "Upcoming Nov 24, 6:00 PM Men's · Mercer at Florida Atlantic | ",
 "Upcoming Nov 29, 2:00 PM Men's · Mercer vs Georgia Southern-East Georgia | ",
 "Upcoming Dec 1, 7:00 PM Men's · Mercer at Georgia State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Mercer vs Wofford | ",
 "Upcoming Dec 8, 10:00 PM Men's · Mercer at Arizona State | ",
 "Upcoming Dec 15, 9:00 PM Men's · Mercer at New Mexico | ",
 "Upcoming Dec 19, 2:00 PM Men's · Mercer at Chattanooga | ",
 "Upcoming Dec 22, 7:30 PM Men's · Mercer at Tennessee Tech | ",
 "Upcoming Dec 30, 6:00 PM Men's · Mercer vs East Tennessee State | ",
 "Upcoming Jan 6, 6:00 PM Men's · Mercer vs Western Carolina | ",
 "Upcoming Jan 9, 2:00 PM Men's · Mercer at Wofford | ",
 "Upcoming Jan 11, 7:00 PM Men's · Mercer vs Samford | ",
 "Upcoming Jan 16, 4:00 PM Men's · Mercer at Furman | ",
 "Upcoming Jan 18, 6:00 PM Men's · Mercer at Western Carolina | ",
 "Upcoming Jan 20, 6:00 PM Men's · Mercer vs VMI | ",
 "Upcoming Jan 23, 2:00 PM Men's · Mercer vs UNC Greensboro | ",
 "Upcoming Jan 27, 7:00 PM Men's · Mercer at East Tennessee State | ",
 "Upcoming Jan 30, 2:00 PM Men's · Mercer vs The Citadel | ",
 "Upcoming Feb 6, 4:30 PM Men's · Mercer vs Furman | ",
 "Upcoming Feb 11, 6:00 PM Men's · Mercer at VMI | ",
 "Upcoming Feb 13, 12:00 PM Men's · Mercer at UNC Greensboro | ",
 "Upcoming Feb 18, 6:00 PM Men's · Mercer vs Tennessee Tech | ",
 "Upcoming Feb 20, 2:00 PM Men's · Mercer vs Chattanooga | ",
 "Upcoming Feb 24 Men's · Mercer at Samford | ",
 "Upcoming Feb 27, 1:00 PM Men's · Mercer at The Citadel | ",
 "Upcoming Mar 5 Men's · Mercer at Southern Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Mercer vs North Greenville | ",
 "Upcoming Nov 5, 7:00 PM Women's · Mercer vs Georgia Southern | ",
 "Upcoming Nov 8, 12:30 PM Women's · Mercer at Wake Forest | ",
 "Upcoming Nov 11, 7:00 PM Women's · Mercer vs Charleston Southern | ",
 "Upcoming Nov 15, 3:00 PM Women's · Mercer at Alabama | ",
 "Upcoming Nov 22, 2:00 PM Women's · Mercer at Gardner-Webb | ",
 "Upcoming Nov 25, 6:00 PM Women's · Mercer vs Campbell | ",
 "Upcoming Nov 28, 2:00 PM Women's · Mercer vs Shorter | ",
 "Upcoming Dec 2, 11:00 AM Women's · Mercer vs Jacksonville State | ",
 "Upcoming Dec 5, 3:00 PM Women's · Mercer at Mississippi Valley State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Mercer at Bellarmine | ",
 "Upcoming Dec 16, 7:00 PM Women's · Mercer at High Point | ",
 "Upcoming Dec 19, 2:00 PM Women's · Mercer vs Winthrop | ",
 "Upcoming Dec 29, 6:00 PM Women's · Mercer at Western Carolina | ",
 "Upcoming Jan 2, 2:00 PM Women's · Mercer vs Chattanooga | ",
 "Upcoming Jan 5, 5:00 PM Women's · Mercer at Samford | ",
 "Upcoming Jan 9, 2:00 PM Women's · Mercer vs UNC Greensboro | ",
 "Upcoming Jan 12, 7:00 PM Women's · Mercer vs Tennessee Tech | ",
 "Upcoming Jan 16, 1:00 PM Women's · Mercer at Furman | ",
 "Upcoming Jan 23, 4:00 PM Women's · Mercer at East Tennessee State | ",
 "Upcoming Jan 26, 7:00 PM Women's · Mercer vs Samford | ",
 "Upcoming Jan 30 Women's · Mercer at UNC Greensboro | ",
 "Upcoming Feb 2, 7:00 PM Women's · Mercer vs Wofford | ",
 "Upcoming Feb 6, 2:00 PM Women's · Mercer vs Furman | ",
 "Upcoming Feb 9, 7:30 PM Women's · Mercer at Tennessee Tech | ",
 "Upcoming Feb 13, 2:00 PM Women's · Mercer vs East Tennessee State | ",
 "Upcoming Feb 16, 6:00 PM Women's · Mercer at Chattanooga | ",
 "Upcoming Feb 23, 7:00 PM Women's · Mercer vs Western Carolina | ",
 "Upcoming Feb 27, 2:00 PM Women's · Mercer at Wofford | ",
 "Upcoming Mar 3 Women's · Mercer at Southern Conference Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Today Oct 24 Mercer at AVCA Collegiate Beach Championships Qualifier | ",
 "Upcoming Nov 6 Mercer at UNF Invitational | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Mercer at MGA/Julius Johnson Invitational | 1st of 9",
 "Final Sep 18 Women's · Mercer at Southern Showcase | 4th of 31",
 "Final Oct 2 Women's · Mercer at Paul Short Run | 16th of 37",
 "Final Oct 17 Women's · Mercer at Upstate Invite | 2nd of 36",
 "Upcoming Oct 31, 10:00 AM Women's · Mercer at Southern Conference | ",
 "Upcoming Nov 13, 8:30 AM Women's · Mercer at NCAA South Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Mercer at MGA/Julius Johnson Invitational | 1st of 7",
 "Final Sep 18 Men's · Mercer at Southern Showcase | 20th of 29",
 "Final Oct 2 Men's · Mercer at Paul Short Run | 35th of 35",
 "Final Oct 17 Men's · Mercer at Upstate Invite | 11th of 37",
 "Upcoming Oct 31, 10:45 AM Men's · Mercer at Southern Conference | ",
 "Upcoming Nov 13, 9:30 AM Men's · Mercer at NCAA South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Mercer vs East Texas A&M | W, 23-15",
 "Final Sep 5 Mercer vs Presbyterian | W, 62-3",
 "Final Sep 12 Mercer vs Furman | L, 13-20",
 "Final Sep 19 Mercer at Georgia Tech | L, 11-44",
 "Final Sep 26 Mercer at Abilene Christian | W, 34-17",
 "Final Oct 3 Mercer at VMI | W, 54-3",
 "Final Oct 10 Mercer vs Western Carolina | W, 17-14",
 "Final Oct 17 Mercer at Samford | W, 31-21",
 "Upcoming Oct 31, 3:00 PM Mercer vs The Citadel | ",
 "Upcoming Nov 7, 1:00 PM Mercer at Chattanooga | ",
 "Upcoming Nov 14, 2:30 PM Mercer at Tennessee Tech | ",
 "Upcoming Nov 21, 3:00 PM Mercer vs East Tennessee State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Mercer at Golfweek Fall Challenge | 15th of 23",
 "Final Sep 21 Women's · Mercer at Golfweek Red Sky Classic | T15th of 20",
 "Final Oct 5 Women's · Mercer at The Ally | 17th of 17",
 "Final Oct 12 Women's · Mercer at Haskins Women's Intercollegiate | 12th of 13",
 "Upcoming Feb 1 Women's · Mercer at FAU Paradise Invitational | ",
 "Upcoming Feb 26 Women's · Mercer at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 15 Women's · Mercer at Game Above Golf Invitational | ",
 "Upcoming Mar 27 Women's · Mercer at Liz Murphey Collegiate | ",
 "Upcoming Apr 5 Women's · Mercer at Brickyard Collegiate | ",
 "Upcoming Apr 20 Women's · Mercer at Southern Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Mercer at Golfweek Fall Challenge | T5th of 16",
 "Final Sep 14 Men's · Mercer at Sandestin Collegiate Classic | T1st of 14",
 "Final Sep 28 Men's · Mercer at Bryan Bros Collegiate | 13th of 16",
 "Final Oct 19 Men's · Mercer at Bank of Tennessee Intercollegiate | 12th of 13",
 "Upcoming Feb 15 Men's · Mercer at Wexford Intercollegiate | ",
 "Upcoming Mar 8 Men's · Mercer at Palmetto Intercollegiate | ",
 "Upcoming Mar 19 Men's · Mercer at Linger Longer Invitational | ",
 "Upcoming Mar 29 Men's · Mercer at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 9 Men's · Mercer at Robert Kepler Intercollegiate | ",
 "Upcoming Apr 26 Men's · Mercer at Southern Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Today Oct 24, 2:00 PM Women's · Mercer vs Florida | ",
 "Today Oct 24, 4:00 PM Women's · Mercer at Florida State | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Mercer at Jackson State | W, 2-1",
 "Final Aug 16 Women's · Mercer at West Georgia | W, 1-0",
 "Final Aug 20 Women's · Mercer at Maine | L, 1-3",
 "Final Aug 23 Women's · Mercer vs South Carolina State | W, 8-0",
 "Final Aug 27 Women's · Mercer vs Georgia Southern | L, 1-4",
 "Final Aug 30 Women's · Mercer vs Georgia | L, 0-2",
 "Final Sep 3 Women's · Mercer at Winthrop | W, 4-0",
 "Final Sep 6 Women's · Mercer vs Alabama State | W, 5-0",
 "Final Sep 10 Women's · Mercer at South Florida | T, 2-2",
 "Final Sep 17 Women's · Mercer at East Tennessee State | L, 0-1",
 "Final Sep 25 Women's · Mercer at Samford | L, 0-2",
 "Final Oct 1 Women's · Mercer vs The Citadel | T, 0-0",
 "Final Oct 4 Women's · Mercer at UNC Greensboro | L, 0-3",
 "Final Oct 9 Women's · Mercer vs Tennessee Tech | L, 0-1",
 "Final Oct 15 Women's · Mercer at Wofford | W, 2-0",
 "Final Oct 18 Women's · Mercer vs VMI | W, 4-1",
 "Final Oct 23 Women's · Mercer at Western Carolina | T, 2-2",
 "Upcoming Oct 29, 7:00 PM Women's · Mercer vs Furman | ",
 "Upcoming Nov 1, 2:00 PM Women's · Mercer vs Chattanooga | ",
 "Upcoming Nov 5 Women's · Mercer at Southern Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Mercer vs Florida Atlantic | L, 0-3",
 "Final Aug 23 Men's · Mercer at North Florida | T, 1-1",
 "Final Aug 27 Men's · Mercer vs UNCW | L, 0-1",
 "Final Aug 31 Men's · Mercer vs UAB | L, 0-1",
 "Final Sep 4 Men's · Mercer at Belmont | T, 1-1",
 "Final Sep 9 Men's · Mercer at Georgia State | L, 0-1",
 "Final Sep 13 Men's · Mercer at Georgia Southern | L, 1-2",
 "Final Sep 19 Men's · Mercer at Furman | L, 0-1",
 "Final Sep 26 Men's · Mercer vs UNC Greensboro | T, 0-0",
 "Final Oct 3 Men's · Mercer at Liberty | L, 0-3",
 "Final Oct 6 Men's · Mercer at Charlotte | L, 0-6",
 "Final Oct 9 Men's · Mercer vs Wofford | L, 0-2",
 "Final Oct 14 Men's · Mercer at NC State | L, 0-3",
 "Final Oct 17 Men's · Mercer vs East Tennessee State | T, 0-0",
 "Final Oct 20 Men's · Mercer at Jacksonville | L, 2-3",
 "Today Oct 24, 12:30 PM Men's · Mercer at VMI | ",
 "Upcoming Oct 30, 5:00 PM Men's · Mercer vs College of Charleston | ",
 "Upcoming Nov 3 Men's · Mercer at Southern Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:30 PM Mercer vs Georgia College | ",
 "Today Oct 24, 12:00 PM Mercer vs North Georgia | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Mercer at Georgia Mid-Major Mayhem | Completed",
 "Final Sep 25 Women's · Mercer at CSU Invitational | Completed",
 "Final Oct 1 Women's · Mercer at Mercer Gridiron Classic | Completed",
 "Final Oct 7 Women's · Mercer at ITA Regional Championships | Completed",
 "Upcoming Oct 30 Women's · Mercer at Wofford Invite | ",
 "Upcoming Jan 13 Women's · Mercer at Clemson | ",
 "Upcoming Jan 23 Women's · Mercer at Appalachian State | ",
 "Upcoming Jan 31 Women's · Mercer vs Texas Tech | ",
 "Upcoming Feb 3 Women's · Mercer at Jacksonville State | ",
 "Upcoming Feb 5 Women's · Mercer vs Emmanuel (Ga.) | ",
 "Upcoming Feb 8 Women's · Mercer vs Charleston Southern | ",
 "Upcoming Feb 9 Women's · Mercer vs North Georgia | ",
 "Upcoming Feb 13 Women's · Mercer vs Florida A&M | ",
 "Upcoming Feb 22 Women's · Mercer vs Georgia Tech | ",
 "Upcoming Feb 22 Women's · Mercer vs Auburn | ",
 "Upcoming Feb 27 Women's · Mercer vs Alabama State | ",
 "Upcoming Feb 28 Women's · Mercer vs Troy | ",
 "Upcoming Mar 2 Women's · Mercer vs Western Carolina | ",
 "Upcoming Mar 12 Women's · Mercer at Florida Gulf Coast | ",
 "Upcoming Mar 20 Women's · Mercer at Georgia Southern | ",
 "Upcoming Mar 24 Women's · Mercer vs Samford | ",
 "Upcoming Mar 26 Women's · Mercer vs Chattanooga | ",
 "Upcoming Apr 1 Women's · Mercer at East Tennessee State | ",
 "Upcoming Apr 5 Women's · Mercer vs Wofford | ",
 "Upcoming Apr 13 Women's · Mercer at Furman | ",
 "Upcoming Apr 15 Women's · Mercer at UNC Greensboro | ",
 "Upcoming Apr 22 Women's · Mercer at Southern Conference Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 1 Men's · Mercer at Mercer Gridiron Classic | Completed",
 "Final Oct 14 Men's · Mercer at ITA Regional Championships | Completed",
 "Today Oct 23 Men's · Mercer at Wake Forest Invitational | ",
 "Upcoming Nov 6 Men's · Mercer at Wofford Challenge | ",
 "Upcoming Jan 16 Men's · Mercer at Florida | ",
 "Upcoming Jan 18 Men's · Mercer at Alabama | ",
 "Upcoming Jan 29 Men's · Mercer at Georgia Southern | ",
 "Upcoming Feb 5 Men's · Mercer vs Emmanuel | ",
 "Upcoming Feb 7 Men's · Mercer vs North Florida | ",
 "Upcoming Feb 10 Men's · Mercer vs Augusta | ",
 "Upcoming Feb 11 Men's · Mercer vs Troy | ",
 "Upcoming Feb 13 Men's · Mercer at Stetson | ",
 "Upcoming Feb 15 Men's · Mercer at USF | ",
 "Upcoming Feb 20 Men's · Mercer at Georgia | ",
 "Upcoming Feb 27 Men's · Mercer vs Alabama State | ",
 "Upcoming Mar 3 Men's · Mercer vs Georgia State | ",
 "Upcoming Mar 8 Men's · Mercer at Florida Gulf Coast | ",
 "Upcoming Mar 21 Men's · Mercer vs UNC Greensboro | ",
 "Upcoming Mar 26 Men's · Mercer vs East Tennessee State | ",
 "Upcoming Mar 28 Men's · Mercer vs Kennesaw State | ",
 "Upcoming Apr 2 Men's · Mercer at Furman | ",
 "Upcoming Apr 4 Men's · Mercer at Wofford | ",
 "Upcoming Apr 7 Men's · Mercer at The Citadel | ",
 "Upcoming Apr 11 Men's · Mercer at Chattanooga | ",
 "Upcoming Apr 17 Men's · Mercer vs Tennessee Tech | ",
 "Upcoming Apr 22 Men's · Mercer at Southern Conference Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Mercer at Troy | L, 0-3",
 "Final Aug 29 Mercer vs Alabama State | W, 3-2",
 "Final Aug 30 Mercer vs North Alabama | L, 0-3",
 "Final Sep 4 Mercer at North Dakota | W, 3-1",
 "Final Sep 5 Mercer at North Dakota | L, 1-3",
 "Final Sep 11 Mercer vs New Orleans | W, 3-0",
 "Final Sep 12 Mercer vs Gardner-Webb | L, 2-3",
 "Final Sep 12 Mercer at West Georgia | W, 3-2",
 "Final Sep 15 Mercer vs Florida A&M | W, 3-0",
 "Final Sep 17 Mercer vs Montana State | L, 2-3",
 "Final Sep 18 Mercer vs Georgia State | W, 3-0",
 "Final Sep 19 Mercer vs Charleston Southern | L, 1-3",
 "Final Sep 25 Mercer vs The Citadel | W, 3-0",
 "Final Sep 26 Mercer vs The Citadel | W, 3-0",
 "Final Oct 2 Mercer at East Tennessee State | W, 3-0",
 "Final Oct 3 Mercer at East Tennessee State | L, 0-3",
 "Final Oct 6 Mercer at Samford | L, 1-3",
 "Final Oct 9 Mercer vs Tennessee Tech | W, 3-0",
 "Final Oct 10 Mercer vs Tennessee Tech | W, 3-1",
 "Final Oct 16 Mercer at Furman | W, 3-1",
 "Final Oct 17 Mercer at Furman | W, 3-2",
 "Final Oct 22 Mercer at Western Carolina | L, 0-3",
 "Final Oct 23 Mercer at Western Carolina | L, 2-3",
 "Upcoming Oct 27, 6:00 PM Mercer vs Samford | ",
 "Upcoming Oct 30, 6:00 PM Mercer at Wofford | ",
 "Upcoming Oct 31, 4:00 PM Mercer at Wofford | ",
 "Upcoming Nov 5, 6:00 PM Mercer at Chattanooga | ",
 "Upcoming Nov 6, 6:00 PM Mercer at Chattanooga | ",
 "Upcoming Nov 13, 6:00 PM Mercer vs UNC Greensboro | ",
 "Upcoming Nov 14, 2:00 PM Mercer vs UNC Greensboro | ",
 "Upcoming Nov 19 Mercer at Southern Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Mercer module checks passed");
