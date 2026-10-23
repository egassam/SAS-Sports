import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westFloridaSchool} from '../src/schools/west-florida.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='west-florida');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westFloridaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/west-florida-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goargos.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['west-florida'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',westFloridaSchool.scheduleUrls],['roster',westFloridaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('west-florida|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goargos.com',`${key} must stay on goargos.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goargos.com/sports/baseball/schedule"],"roster":["https://goargos.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goargos.com/sports/mens-basketball/schedule","https://goargos.com/sports/womens-basketball/schedule"],"roster":["https://goargos.com/sports/mens-basketball/roster","https://goargos.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goargos.com/sports/womens-cross-country/schedule","https://goargos.com/sports/mens-cross-country/schedule"],"roster":["https://goargos.com/sports/womens-cross-country/roster","https://goargos.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goargos.com/sports/football/schedule"],"roster":["https://goargos.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goargos.com/sports/womens-golf/schedule","https://goargos.com/sports/mens-golf/schedule"],"roster":["https://goargos.com/sports/womens-golf/roster","https://goargos.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goargos.com/sports/womens-soccer/schedule","https://goargos.com/sports/mens-soccer/schedule"],"roster":["https://goargos.com/sports/womens-soccer/roster","https://goargos.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goargos.com/sports/softball/schedule"],"roster":["https://goargos.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goargos.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://goargos.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goargos.com/sports/womens-tennis/schedule","https://goargos.com/sports/mens-tennis/schedule"],"roster":["https://goargos.com/sports/womens-tennis/roster","https://goargos.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://goargos.com/sports/womens-volleyball/schedule"],"roster":["https://goargos.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'west-florida|"+sport+"':"),`${sport} routes must live in the West Florida module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goargos.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westFloridaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=west-florida)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · West Florida vs Southeastern Baptist | ",
 "Upcoming Nov 6 Men's · West Florida at FIU | ",
 "Upcoming Nov 9, 6:00 PM Men's · West Florida vs Baptist University of Florida | ",
 "Upcoming Nov 12, 7:00 PM Men's · West Florida at Alabama A&M | ",
 "Upcoming Nov 13, 2:00 PM Men's · West Florida vs Cleveland State | ",
 "Upcoming Nov 17, 6:00 PM Men's · West Florida vs Wisconsin Green Bay | ",
 "Upcoming Nov 22 Men's · West Florida at South Alabama | ",
 "Upcoming Nov 25 Men's · West Florida at Northwestern State | ",
 "Upcoming Nov 29, 2:00 PM Men's · West Florida at Florida State | ",
 "Upcoming Dec 2 Men's · West Florida at South Florida | ",
 "Upcoming Dec 5, 1:00 PM Men's · West Florida vs Pensacola Christian | ",
 "Upcoming Dec 13, 12:00 PM Men's · West Florida vs Navy | ",
 "Upcoming Dec 16, 6:00 PM Men's · West Florida vs Alabama State | ",
 "Upcoming Dec 19, 2:00 PM Men's · West Florida at West Georgia | ",
 "Upcoming Dec 21 Men's · West Florida at North Alabama | ",
 "Upcoming Dec 28 Men's · West Florida at Tarleton State | ",
 "Upcoming Dec 31, 6:00 PM Men's · West Florida vs Eastern Kentucky | ",
 "Upcoming Jan 2, 1:00 PM Men's · West Florida vs Austin Peay | ",
 "Upcoming Jan 9, 2:30 PM Men's · West Florida vs Queens | ",
 "Upcoming Jan 14, 6:00 PM Men's · West Florida vs North Florida | ",
 "Upcoming Jan 16, 1:00 PM Men's · West Florida vs Jacksonville | ",
 "Upcoming Jan 21, 6:00 PM Men's · West Florida at FGCU | ",
 "Upcoming Jan 23, 1:00 PM Men's · West Florida at Stetson | ",
 "Upcoming Jan 28, 6:00 PM Men's · West Florida vs Lipscomb | ",
 "Upcoming Jan 30, 1:00 PM Men's · West Florida vs Bellarmine | ",
 "Upcoming Feb 6, 3:00 PM Men's · West Florida at Queens | ",
 "Upcoming Feb 11 Men's · West Florida at Jacksonville | ",
 "Upcoming Feb 13 Men's · West Florida at North Florida | ",
 "Upcoming Feb 18, 6:00 PM Men's · West Florida vs Stetson | ",
 "Upcoming Feb 20, 1:00 PM Men's · West Florida vs FGCU | ",
 "Upcoming Feb 25 Men's · West Florida at Bellarmine | ",
 "Upcoming Feb 27 Men's · West Florida at Lipscomb | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · West Florida at East Tennessee State | ",
 "Upcoming Nov 5, 5:00 PM Women's · West Florida at Western Carolina | ",
 "Upcoming Nov 9, 10:30 AM Women's · West Florida vs Pensacola Christian | ",
 "Upcoming Nov 11 Women's · West Florida at Florida State | ",
 "Upcoming Nov 15, 1:00 PM Women's · West Florida vs Florida A&M | ",
 "Upcoming Nov 18, 6:00 PM Women's · West Florida vs Spring Hill (Ala.) | ",
 "Upcoming Nov 22, 6:00 PM Women's · West Florida at Texas A&M Corpus Christi | ",
 "Upcoming Nov 27, 12:00 PM Women's · West Florida vs UT Arlington | ",
 "Upcoming Nov 28, 12:00 PM Women's · West Florida vs Southern Illinois | ",
 "Upcoming Dec 2, 10:00 AM Women's · West Florida at West Georgia | ",
 "Upcoming Dec 6, 1:00 PM Women's · West Florida vs Southeastern Baptist | ",
 "Upcoming Dec 13, 2:30 PM Women's · West Florida vs New Orleans | ",
 "Upcoming Dec 19, 1:00 PM Women's · West Florida vs West Georgia | ",
 "Upcoming Dec 21, 6:00 PM Women's · West Florida vs North Alabama | ",
 "Upcoming Dec 28, 6:00 PM Women's · West Florida vs UT Arlington | ",
 "Upcoming Dec 31 Women's · West Florida at Eastern Kentucky | ",
 "Upcoming Jan 2 Women's · West Florida at Austin Peay | ",
 "Upcoming Jan 9, 12:00 PM Women's · West Florida vs Queens | ",
 "Upcoming Jan 14 Women's · West Florida at Stetson | ",
 "Upcoming Jan 16, 11:00 AM Women's · West Florida at Florida Gulf Coast | ",
 "Upcoming Jan 21, 6:00 PM Women's · West Florida vs North Florida | ",
 "Upcoming Jan 23, 1:00 PM Women's · West Florida vs Jacksonville | ",
 "Upcoming Jan 28 Women's · West Florida at Lipscomb | ",
 "Upcoming Jan 30, 12:00 PM Women's · West Florida at Bellarmine | ",
 "Upcoming Feb 6 Women's · West Florida at Queens | ",
 "Upcoming Feb 11, 6:00 PM Women's · West Florida vs Florida Gulf Coast | ",
 "Upcoming Feb 13, 1:00 PM Women's · West Florida vs Stetson | ",
 "Upcoming Feb 18 Women's · West Florida at Jacksonville | ",
 "Upcoming Feb 20 Women's · West Florida at North Florida | ",
 "Upcoming Feb 25, 6:00 PM Women's · West Florida vs Bellarmine | ",
 "Upcoming Feb 27, 1:00 PM Women's · West Florida vs Lipscomb | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · West Florida at Jacksonville State - Foothills Invitational | 5th of 20",
 "Final Sep 18 Women's · West Florida at Southern Showcase | 27th of 31",
 "Final Oct 2 Women's · West Florida at Georgia Tech Invitational | 5th of 16",
 "Final Oct 16 Women's · West Florida at UNA Kennemer Classic | 4th of 12",
 "Upcoming Oct 30 Women's · West Florida at Atlantic Sun Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · West Florida at Jacksonville State - Foothills Invitational | 7th of 17",
 "Final Sep 18 Men's · West Florida at Southern Showcase | 29th of 29",
 "Final Oct 2 Men's · West Florida at Georgia Tech Invitational | 6th of 13",
 "Final Oct 16 Men's · West Florida at UNA Kennemer Classic | 2nd of 12",
 "Upcoming Oct 30 Men's · West Florida at Atlantic Sun Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 West Florida vs Southern Illinois | W, 34-31",
 "Final Sep 5 West Florida at Central Arkansas | W, 42-14",
 "Final Sep 19 West Florida vs Austin Peay | L, 16-38",
 "Final Sep 26 West Florida at Southeast Missouri State | W, 20-17",
 "Final Oct 3 West Florida at Abilene Christian | L, 7-35",
 "Final Oct 17 West Florida vs West Alabama | W, 37-3",
 "Upcoming Oct 24, 2:00 PM West Florida at Eastern Kentucky | ",
 "Upcoming Nov 7, 6:00 PM West Florida at North Alabama | ",
 "Upcoming Nov 14, 2:00 PM West Florida vs Tarleton State | ",
 "Upcoming Nov 21, 1:00 PM West Florida at West Georgia | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · West Florida at Tulane Classic | Completed",
 "Final Sep 14 Women's · West Florida at The Velvet Classic | Completed",
 "Upcoming Oct 25 Women's · West Florida at The Judson | ",
 "Upcoming Nov 1 Women's · West Florida at Samford Intercollegiate | ",
 "Upcoming Feb 1 Women's · West Florida at Battle at Bentwater | ",
 "Upcoming Feb 22 Women's · West Florida at Hatter Invitational | ",
 "Upcoming Mar 7 Women's · West Florida at Chris Banister Classic | ",
 "Upcoming Mar 22 Women's · West Florida at Ozarks National Invitational | ",
 "Upcoming Mar 29 Women's · West Florida at ULM Invitational | ",
 "Upcoming Apr 11 Women's · West Florida at ASUN Conference Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · West Florida at Sandestin Collegiate Classic | Completed",
 "Final Sep 20 Men's · West Florida at Graeme McDowell Invitational | Completed",
 "Final Sep 27 Men's · West Florida at Argent Financial Classic | Completed",
 "Final Oct 5 Men's · West Florida at Cullan Brown Collegiate | Completed",
 "Upcoming Feb 21 Men's · West Florida at Military City Collegiate | ",
 "Upcoming Mar 12 Men's · West Florida at Seminole Intercollegiate | ",
 "Upcoming Mar 15 Men's · West Florida at Tiger Invitational | ",
 "Upcoming Mar 29 Men's · West Florida at Wyoming Cowboy Classic | ",
 "Upcoming Apr 5 Men's · West Florida at Tiger Intercollegiate | ",
 "Upcoming Apr 20 Men's · West Florida at ASUN Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 27 Women's · West Florida vs McNeese State | W, 3-1",
 "Final Sep 3 Women's · West Florida vs Stetson | W, 2-0",
 "Final Sep 7 Women's · West Florida at Troy | W, 3-1",
 "Final Sep 11 Women's · West Florida at Southeastern Louisiana | W, 2-0",
 "Final Sep 18 Women's · West Florida at Southern | T, 1-1",
 "Final Sep 24 Women's · West Florida at Stetson | L, 1-2",
 "Final Sep 27 Women's · West Florida at Florida Gulf Coast | T, 0-0",
 "Final Oct 1 Women's · West Florida vs North Florida | L, 0-1",
 "Final Oct 8 Women's · West Florida vs Lipscomb | W, 3-0",
 "Final Oct 15 Women's · West Florida vs Jacksonville | W, 3-1",
 "Final Oct 18 Women's · West Florida vs Queens University of Charlotte | W, 1-0",
 "Final Oct 22 Women's · West Florida at Bellarmine | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · West Florida at Lipscomb | ",
 "Upcoming Oct 28, 12:00 PM Women's · West Florida vs Bellarmine | ",
 "Upcoming Oct 31, 3:00 PM Women's · West Florida at Queens University of Charlotte | ",
 "Upcoming Nov 5 Women's · West Florida at ASUN Quarterfinal | ",
 "Upcoming Nov 8 Women's · West Florida at ASUN Semifinal | ",
 "Upcoming Nov 13 Women's · West Florida vs ASUN Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · West Florida vs Texas Rio Grande Valley | L, 2-3",
 "Final Aug 23 Men's · West Florida at USF | L, 1-3",
 "Final Aug 27 Men's · West Florida at South Carolina - Upstate | L, 0-3",
 "Final Aug 30 Men's · West Florida at Georgia State | T, 0-0",
 "Final Sep 5 Men's · West Florida vs Florida Gulf Coast | W, 3-0",
 "Final Sep 12 Men's · West Florida at Stetson | L, 0-2",
 "Final Sep 19 Men's · West Florida at North Florida | L, 1-3",
 "Final Sep 26 Men's · West Florida vs Bellarmine | W, 3-2",
 "Final Sep 30 Men's · West Florida at North Carolina | L, 0-2",
 "Final Oct 3 Men's · West Florida at Queens | L, 0-1",
 "Final Oct 17 Men's · West Florida at Lipscomb | W, 1-0",
 "Upcoming Oct 24, 2:00 PM Men's · West Florida vs Jacksonville | ",
 "Upcoming Oct 28, 7:00 PM Men's · West Florida vs Central Arkansas | ",
 "Upcoming Oct 31, 5:00 PM Men's · West Florida vs Spring Hill | ",
 "Upcoming Nov 7 Men's · West Florida at ASUN Quarterfinal | ",
 "Upcoming Nov 9 Men's · West Florida at ASUN Semifinal | ",
 "Upcoming Nov 14 Men's · West Florida vs ASUN Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · West Florida vs Loyola (La.) | W, 196-28",
 "Final Sep 25 Women's · West Florida vs Thomas (Ga.) | W, 196-11",
 "Final Sep 26 Women's · West Florida at Moultrie Diving Invite | Completed",
 "Today Oct 23, 1:00 PM Women's · West Florida at Florida State | ",
 "Today Oct 23, 1:00 PM Women's · West Florida at North Florida | ",
 "Upcoming Nov 19 Women's · West Florida at Small College Championship Cup | ",
 "Upcoming Dec 16, 12:30 PM Women's · West Florida vs The University of Texas Rio Grande Valley | ",
 "Upcoming Jan 23, 10:00 AM Women's · West Florida vs Georgia Southern | ",
 "Upcoming Jan 30, 11:00 AM Women's · West Florida at Tulane | ",
 "Upcoming Feb 17 Women's · West Florida at Atlantic Sun Conference Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · West Florida at UNO Invitational | Completed",
 "Upcoming Oct 30 Women's · West Florida at UWF Fall Fling | ",
 "Upcoming Nov 6 Women's · West Florida at UWF Fall Fling II | ",
 "Upcoming Jan 17 Women's · West Florida at Auburn | ",
 "Upcoming Jan 30 Women's · West Florida at Mississippi State | ",
 "Upcoming Jan 31 Women's · West Florida vs Louisiana Tech | ",
 "Upcoming Feb 14 Women's · West Florida at Alabama State | ",
 "Upcoming Feb 15 Women's · West Florida vs New Orleans | ",
 "Upcoming Feb 19 Women's · West Florida at Stetson | ",
 "Upcoming Feb 21 Women's · West Florida at North Florida | ",
 "Upcoming Feb 22 Women's · West Florida at Florida A&M | ",
 "Upcoming Feb 27 Women's · West Florida vs FGCU | ",
 "Upcoming Mar 2 Women's · West Florida vs Bellarmine | ",
 "Upcoming Mar 7 Women's · West Florida vs Lipscomb | ",
 "Upcoming Mar 9 Women's · West Florida vs Alcorn State | ",
 "Upcoming Mar 11 Women's · West Florida vs Illinois State | ",
 "Upcoming Mar 15 Women's · West Florida vs Murray State | ",
 "Upcoming Mar 20 Women's · West Florida at Queens | ",
 "Upcoming Mar 27 Women's · West Florida at LSU | ",
 "Upcoming Mar 31 Women's · West Florida at Troy | ",
 "Upcoming Apr 7 Women's · West Florida at South Alabama | ",
 "Upcoming Apr 10 Women's · West Florida at Jackson State | ",
 "Upcoming Apr 11 Women's · West Florida at North Alabama | ",
 "Upcoming Apr 16 Women's · West Florida at Southeastern LA | ",
 "Upcoming Apr 17 Women's · West Florida at Tulane | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · West Florida at Sugarcane Classic | Completed",
 "Final Oct 2 Men's · West Florida at UNO Invitational | Completed",
 "Today Oct 23 Men's · West Florida at ASUN Men's Tennis Individual Tournament | ",
 "Upcoming Oct 30 Men's · West Florida at UWF Fall Fling | ",
 "Upcoming Nov 6 Men's · West Florida at UWF Fall Fling II | ",
 "Upcoming Jan 9 Men's · West Florida at FSU | ",
 "Upcoming Jan 9 Men's · West Florida at Georgia Southern | ",
 "Upcoming Jan 9 Men's · West Florida at Southern Mississippi | ",
 "Upcoming Feb 6 Men's · West Florida at UAB | ",
 "Upcoming Feb 7 Men's · West Florida vs South Alabama | ",
 "Upcoming Feb 12 Men's · West Florida vs Jacksonville State | ",
 "Upcoming Feb 14 Men's · West Florida at Alabama State | ",
 "Upcoming Feb 15 Men's · West Florida vs New Orleans | ",
 "Upcoming Feb 19 Men's · West Florida at Mississippi State | ",
 "Upcoming Feb 27 Men's · West Florida at Alabama | ",
 "Upcoming Mar 7 Men's · West Florida vs UT Arlington | ",
 "Upcoming Mar 9 Men's · West Florida vs Alcorn State | ",
 "Upcoming Mar 13 Men's · West Florida at North Florida | ",
 "Upcoming Mar 14 Men's · West Florida at Stetson | ",
 "Upcoming Mar 20 Men's · West Florida at Queens | ",
 "Upcoming Mar 24 Men's · West Florida at Marquette | ",
 "Upcoming Mar 27 Men's · West Florida vs Abilene Christian | ",
 "Upcoming Mar 30 Men's · West Florida vs Louisiana Lafayette | ",
 "Upcoming Apr 3 Men's · West Florida at Austin Peay | ",
 "Upcoming Apr 4 Men's · West Florida at Eastern Kentucky | ",
 "Upcoming Apr 10 Men's · West Florida at Jackson State | ",
 "Upcoming Apr 11 Men's · West Florida at North Alabama | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 West Florida vs Wheeling | W, 3-0",
 "Final Aug 29 West Florida vs Southwest Minnesota State | W, 3-1",
 "Final Sep 4 West Florida vs Alabama State | W, 3-0",
 "Final Sep 5 West Florida vs UNC Wilmington | W, 3-0",
 "Final Sep 5 West Florida at USC Upstate | W, 3-1",
 "Final Sep 11 West Florida vs Florida Southern | W, 3-1",
 "Final Sep 12 West Florida vs Tampa | L, 1-3",
 "Final Sep 18 West Florida at Iowa | L, 2-3",
 "Final Sep 18 West Florida vs Texas Tech | W, 3-1",
 "Final Sep 19 West Florida vs Central Arkansas | W, 3-1",
 "Final Sep 26 West Florida at Queens | W, 3-0",
 "Final Oct 2 West Florida at Stetson | W, 3-0",
 "Final Oct 4 West Florida at FGCU | L, 2-3",
 "Final Oct 16 West Florida vs Bellarmine | W, 3-2",
 "Final Oct 18 West Florida vs Lipscomb | W, 3-0",
 "Today Oct 23, 5:00 PM West Florida at North Florida | ",
 "Upcoming Oct 24, 4:00 PM West Florida at Jacksonville | ",
 "Upcoming Oct 30, 6:00 PM West Florida at Lipscomb | ",
 "Upcoming Oct 31, 3:00 PM West Florida at Bellarmine | ",
 "Upcoming Nov 6, 6:00 PM West Florida vs FGCU | ",
 "Upcoming Nov 8, 1:00 PM West Florida vs Stetson | ",
 "Upcoming Nov 10, 1:00 PM West Florida vs North Florida | ",
 "Upcoming Nov 11, 4:00 PM West Florida vs Jacksonville | ",
 "Upcoming Nov 13, 12:00 PM West Florida vs Queens | ",
 "Upcoming Nov 19 West Florida at ASUN Championships | "
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
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("West Florida module checks passed");
