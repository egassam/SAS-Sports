import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {texasSchool} from '../src/schools/texas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='texas');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,texasHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/texas-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit texaslonghorns.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['texas'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',texasSchool.scheduleUrls],['roster',texasSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('texas|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'texaslonghorns.com',`${key} must stay on texaslonghorns.com`);
  }
}
const parity={"Baseball":{"schedule":["https://texaslonghorns.com/sports/baseball/schedule"],"roster":["https://texaslonghorns.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://texaslonghorns.com/sports/mens-basketball/schedule","https://texaslonghorns.com/sports/womens-basketball/schedule"],"roster":["https://texaslonghorns.com/sports/mens-basketball/roster","https://texaslonghorns.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://texaslonghorns.com/sports/wbvball/schedule"],"roster":["https://texaslonghorns.com/sports/wbvball/roster"],"combined":false},"Cross Country":{"schedule":["https://texaslonghorns.com/sports/track-and-field/schedule"],"roster":["https://texaslonghorns.com/sports/track-and-field/roster"],"combined":false},"Football":{"schedule":["https://texaslonghorns.com/sports/football/schedule"],"roster":["https://texaslonghorns.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://texaslonghorns.com/sports/mens-golf/schedule","https://texaslonghorns.com/sports/womens-golf/schedule"],"roster":["https://texaslonghorns.com/sports/mens-golf/roster","https://texaslonghorns.com/sports/womens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://texaslonghorns.com/sports/womens-rowing/schedule"],"roster":["https://texaslonghorns.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://texaslonghorns.com/sports/womens-soccer/schedule"],"roster":["https://texaslonghorns.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://texaslonghorns.com/sports/softball/schedule"],"roster":["https://texaslonghorns.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://texaslonghorns.com/sports/mens-swimming-and-diving/schedule","https://texaslonghorns.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://texaslonghorns.com/sports/mens-swimming-and-diving/roster","https://texaslonghorns.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://texaslonghorns.com/sports/mens-tennis/schedule","https://texaslonghorns.com/sports/womens-tennis/schedule"],"roster":["https://texaslonghorns.com/sports/mens-tennis/roster","https://texaslonghorns.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://texaslonghorns.com/sports/track-and-field/schedule"],"roster":["https://texaslonghorns.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://texaslonghorns.com/sports/womens-volleyball/schedule"],"roster":["https://texaslonghorns.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'texas|"+sport+"':"),`${sport} routes must live in the Texas module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://texaslonghorns.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.texasHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=texas)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 7:00 PM Texas vs Clemson | ",
 "Upcoming Feb 20, 7:00 PM Texas vs TCU | ",
 "Upcoming Feb 21, 2:30 PM Texas at Virginia | ",
 "Upcoming Mar 19 Texas at LSU | ",
 "Upcoming Mar 20 Texas at LSU | ",
 "Upcoming Mar 21 Texas at LSU | ",
 "Upcoming Mar 25 Texas vs South Carolina | ",
 "Upcoming Mar 26 Texas vs South Carolina | ",
 "Upcoming Mar 27 Texas vs South Carolina | ",
 "Upcoming Apr 2 Texas at Alabama | ",
 "Upcoming Apr 3 Texas at Alabama | ",
 "Upcoming Apr 4 Texas at Alabama | ",
 "Upcoming Apr 9 Texas vs Tennessee | ",
 "Upcoming Apr 10 Texas vs Tennessee | ",
 "Upcoming Apr 11 Texas vs Tennessee | ",
 "Upcoming Apr 16 Texas at Florida | ",
 "Upcoming Apr 17 Texas at Florida | ",
 "Upcoming Apr 18 Texas at Florida | ",
 "Upcoming Apr 23 Texas vs Arkansas | ",
 "Upcoming Apr 24 Texas vs Arkansas | ",
 "Upcoming Apr 25 Texas vs Arkansas | ",
 "Upcoming Apr 30 Texas vs Vanderbilt | ",
 "Upcoming May 1 Texas vs Vanderbilt | ",
 "Upcoming May 2 Texas vs Vanderbilt | ",
 "Upcoming May 7 Texas at Oklahoma | ",
 "Upcoming May 8 Texas at Oklahoma | ",
 "Upcoming May 9 Texas at Oklahoma | ",
 "Upcoming May 14 Texas vs Texas A&M | ",
 "Upcoming May 15 Texas vs Texas A&M | ",
 "Upcoming May 16 Texas vs Texas A&M | ",
 "Upcoming May 20 Texas at Georgia | ",
 "Upcoming May 21 Texas at Georgia | ",
 "Upcoming May 22 Texas at Georgia | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 11:00 AM Men's · Texas at St. John's (Exhibition Game) (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · Texas vs Chicago State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Texas vs Gardner-Webb | ",
 "Upcoming Nov 9, 6:00 PM Men's · Texas vs Grambling State | ",
 "Upcoming Nov 15, 2:00 PM Men's · Texas vs Baylor | ",
 "Upcoming Nov 19, 7:00 PM Men's · Texas vs Southern Utah | ",
 "Upcoming Nov 22, 2:00 PM Men's · Texas vs Southern Indiana | ",
 "Upcoming Nov 26, 1:30 PM Men's · Texas vs Georgetown | ",
 "Upcoming Nov 27, 1:30 PM Men's · Texas vs Saint Mary's OR UCLA | ",
 "Upcoming Dec 1, 8:00 PM Men's · Texas at Louisville | ",
 "Upcoming Dec 8, 7:00 PM Men's · Texas vs Jackson State | ",
 "Upcoming Dec 12, 4:30 PM Men's · Texas vs Miami (Fla.) | ",
 "Upcoming Dec 16, 8:00 PM Men's · Texas vs Memphis | ",
 "Upcoming Dec 21, 7:00 PM Men's · Texas vs Prairie View A&M | ",
 "Upcoming Dec 29, 7:00 PM Men's · Texas vs East Texas A&M | ",
 "Upcoming Jan 2, 5:00 PM Men's · Texas vs Florida | ",
 "Upcoming Jan 5, 8:00 PM Men's · Texas at Georgia | ",
 "Upcoming Jan 9, 11:00 AM Men's · Texas at Ole Miss | ",
 "Upcoming Jan 12, 8:00 PM Men's · Texas vs Auburn | ",
 "Upcoming Jan 16, 11:00 AM Men's · Texas vs Oklahoma | ",
 "Upcoming Jan 19, 8:00 PM Men's · Texas at LSU | ",
 "Upcoming Jan 23, 5:00 PM Men's · Texas vs Arkansas | ",
 "Upcoming Jan 27, 7:00 PM Men's · Texas at South Carolina | ",
 "Upcoming Jan 30, 11:00 AM Men's · Texas vs Kentucky | ",
 "Upcoming Feb 6, 11:00 AM Men's · Texas at Florida | ",
 "Upcoming Feb 9, 6:00 PM Men's · Texas vs Alabama | ",
 "Upcoming Feb 13, 1:00 PM Men's · Texas at Vanderbilt | ",
 "Upcoming Feb 17, 8:00 PM Men's · Texas vs Texas A&M | ",
 "Upcoming Feb 20, 7:30 PM Men's · Texas at Oklahoma | ",
 "Upcoming Feb 24, 6:00 PM Men's · Texas at Mississippi State | ",
 "Upcoming Feb 27 Men's · Texas vs Tennessee | ",
 "Upcoming Mar 2, 6:00 PM Men's · Texas vs Missouri | ",
 "Upcoming Mar 6, 7:00 PM Men's · Texas at Texas A&M | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 19, 6:00 PM Women's · Texas at UConn (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Women's · Texas vs UCLA (Exhibition) | ",
 "Upcoming Oct 29, 7:00 PM Women's · Texas vs Eastern New Mexico (Exhibition) | ",
 "Upcoming Nov 4, 7:00 PM Women's · Texas vs Fairleigh Dickinson | ",
 "Upcoming Nov 7, 7:00 PM Women's · Texas vs Northern Colorado | ",
 "Upcoming Nov 11, 6:00 PM Women's · Texas vs South Dakota State | ",
 "Upcoming Nov 14 Women's · Texas vs Tarleton State | ",
 "Upcoming Nov 18, 6:30 PM Women's · Texas at Green Bay | ",
 "Upcoming Nov 22, 12:00 PM Women's · Texas vs Ohio State | ",
 "Upcoming Nov 25, 6:00 PM Women's · Texas vs Southeastern Louisiana | ",
 "Upcoming Nov 29, 2:00 PM Women's · Texas at Southeast Missouri State | ",
 "Upcoming Dec 2, 8:15 PM Women's · Texas vs Louisville | ",
 "Upcoming Dec 6, 12:00 PM Women's · Texas vs TCU | ",
 "Upcoming Dec 10, 7:00 PM Women's · Texas vs Arkansas State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Texas vs UTRGV | ",
 "Upcoming Dec 16, 11:00 AM Women's · Texas vs Little Rock | ",
 "Upcoming Dec 19, 5:00 PM Women's · Texas vs Duke | ",
 "Upcoming Dec 20, 4:00 PM Women's · Texas vs UCLA | ",
 "Upcoming Dec 28, 7:00 PM Women's · Texas vs Harvard | ",
 "Upcoming Dec 31, 1:00 PM Women's · Texas at Georgia | ",
 "Upcoming Jan 3, 2:00 PM Women's · Texas vs South Carolina | ",
 "Upcoming Jan 7, 6:00 PM Women's · Texas vs Tennessee | ",
 "Upcoming Jan 10, 1:00 PM Women's · Texas at Kentucky | ",
 "Upcoming Jan 14 Women's · Texas vs Alabama | ",
 "Upcoming Jan 17, 12:00 PM Women's · Texas vs Vanderbilt | ",
 "Upcoming Jan 21, 8:00 PM Women's · Texas at Texas A&M | ",
 "Upcoming Jan 24, 4:00 PM Women's · Texas at Mississippi State | ",
 "Upcoming Jan 28 Women's · Texas vs Missouri | ",
 "Upcoming Feb 4, 6:00 PM Women's · Texas at Auburn | ",
 "Upcoming Feb 8, 6:30 PM Women's · Texas vs Arkansas | ",
 "Upcoming Feb 11, 6:00 PM Women's · Texas at LSU | ",
 "Upcoming Feb 14, 3:00 PM Women's · Texas vs Texas A&M | ",
 "Upcoming Feb 21, 2:00 PM Women's · Texas vs Florida | ",
 "Upcoming Feb 25, 7:00 PM Women's · Texas at Oklahoma | ",
 "Upcoming Feb 28, 1:00 PM Women's · Texas at Ole Miss | "
]);
  const v_wbvball=parse("Beach Volleyball","wbvball");
  assert.deepEqual(v_wbvball.map(line),[
 "Upcoming Oct 9 Texas at SCE West Coast Championships (Exhibition) | ",
 "Upcoming Nov 6 Texas at TCU (Exhibition) | ",
 "Upcoming Nov 6 Texas at AVCA Beach National Championships (Exhibition) | "
]);
  const v_trackandfield=parse("Cross Country","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Sep 4 Texas at Floyd Farms Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 11 Texas at Texas A&M Invitational | Women's team: 7th / Men's team: 2nd",
 "Final Sep 25 Texas at Gans Creek Classic | Women's team: 20th / Men's team: 14th",
 "Final Oct 3 Texas at Chile Pepper Festival | Women's team: 6th / Men's team: 1st",
 "Upcoming Oct 16 Texas at Arturo Barrios Invitational | ",
 "Upcoming Oct 30 Texas at SEC Cross Country Championships | ",
 "Upcoming Nov 13 Texas at NCAA South Central Regional | ",
 "Upcoming Nov 21 Texas at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Texas vs Texas State | W, 59-7",
 "Final Sep 12 Texas vs Ohio State | W, 24-23",
 "Final Sep 19 Texas vs UTSA | W, 30-6",
 "Final Sep 26 Texas at Tennessee | W, 20-17",
 "Upcoming Oct 10, 2:30 PM Texas vs Oklahoma | ",
 "Upcoming Oct 17, 11:00 AM Texas vs Florida | ",
 "Upcoming Oct 24 Texas vs Ole Miss | ",
 "Upcoming Oct 31 Texas vs Mississippi State | ",
 "Upcoming Nov 7 Texas at Missouri | ",
 "Upcoming Nov 14 Texas at LSU | ",
 "Upcoming Nov 21 Texas vs Arkansas | ",
 "Upcoming Nov 27, 6:30 PM Texas at Texas A&M | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Texas at Folds of Honor Collegiate | T2nd of 14",
 "Final Sep 14 Men's · Texas at Jackson T. Stephens Cup | 1st of 6",
 "Final Sep 16 Men's · Texas at Texas A&M (Championship Match) | W, 3-1",
 "Final Sep 21 Men's · Texas at Bayou City Collegiate Classic (Individuals only) | Completed",
 "Final Sep 28 Men's · Texas at Ben Hogan Collegiate Invitational Presented by Charles Schwab | T5th of 16",
 "Upcoming Oct 12 Men's · Texas at St Andrews Links Collegiate | ",
 "Upcoming Jan 25 Men's · Texas at Southwestern Intercollegiate | ",
 "Upcoming Feb 4 Men's · Texas at Amer Ari Invitational | ",
 "Upcoming Feb 28 Men's · Texas at Cabo Collegiate | ",
 "Upcoming Mar 8 Men's · Texas at Desimone Invitational | ",
 "Upcoming Mar 22 Men's · Texas at Valspar Collegiate Invitational | ",
 "Upcoming Apr 3 Men's · Texas at Haskins Award Invitational | ",
 "Upcoming Apr 12 Men's · Texas at The Ford Collegiate | ",
 "Upcoming Apr 21 Men's · Texas at SEC Championship | ",
 "Upcoming Apr 24 Men's · Texas at SEC Championship Match Play | ",
 "Upcoming May 17 Men's · Texas at NCAA Regional Championship | ",
 "Upcoming May 28 Men's · Texas at NCAA Championship Stroke Play | ",
 "Upcoming Jun 1 Men's · Texas at NCAA Championship Match Play | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Texas at Jackson T. Stephens Cup | 4th of 6",
 "Final Sep 16 Women's · Texas vs Oregon | W, 4-1",
 "Upcoming Oct 12 Women's · Texas at St Andrews Links Collegiate | ",
 "Upcoming Oct 26 Women's · Texas at Nanea Invitational | ",
 "Upcoming Jan 31 Women's · Texas at Therese Hession Regional Challenge | ",
 "Upcoming Feb 8 Women's · Texas at Golf Club of Houston Invitational | ",
 "Upcoming Feb 13 Women's · Texas at Alice and John Wallace Classic | ",
 "Upcoming Mar 1 Women's · Texas at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 11 Women's · Texas at Nanea Cup | ",
 "Upcoming Mar 22 Women's · Texas at Charles Schwab Women's Collegiate | ",
 "Upcoming Apr 5 Women's · Texas at Women's Collegiate Challenge | ",
 "Upcoming Apr 16 Women's · Texas at SEC Championship Stroke Play | ",
 "Upcoming Apr 19 Women's · Texas at SEC Championship Match Play | ",
 "Upcoming May 10 Women's · Texas at NCAA Regional Championship | ",
 "Upcoming May 21 Women's · Texas at NCAA Championship Stroke Play | ",
 "Upcoming May 25 Women's · Texas at NCAA Championship Match Play | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Texas vs HCU | W, 3-0",
 "Final Aug 16 Texas at Pitt | W, 1-0",
 "Final Aug 20 Texas at Arizona State | T, 1-1",
 "Final Aug 23 Texas at Grand Canyon | W, 1-0",
 "Final Aug 27 Texas vs Baylor | L, 1-2",
 "Final Aug 30 Texas vs Incarnate Word | W, 6-0",
 "Final Sep 6 Texas at TCU | W, 1-0",
 "Final Sep 10 Texas at Arkansas | L, 1-3",
 "Final Sep 18 Texas vs Tennessee | T, 2-2",
 "Final Sep 24 Texas at Florida | T, 1-1",
 "Final Sep 27 Texas at Ole Miss | W, 2-0",
 "Final Oct 4 Texas vs Oklahoma | W, 2-1",
 "Upcoming Oct 9, 6:30 PM Texas at Kentucky | ",
 "Upcoming Oct 15, 7:00 PM Texas vs LSU | ",
 "Upcoming Oct 18, 12:00 PM Texas vs South Carolina | ",
 "Upcoming Oct 23, 7:00 PM Texas at Vanderbilt | ",
 "Upcoming Nov 1, 12:00 PM Texas vs Auburn | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 13, 6:00 PM Texas vs Texas State (Exhibition) | ",
 "Upcoming Oct 20, 6:00 PM Texas vs Temple CC (Exhibition) | ",
 "Upcoming Oct 27, 6:00 PM Texas vs McLennan CC (Exhibition) | ",
 "Upcoming Oct 29, 7:00 PM Texas vs UTSA (Exhibition) | ",
 "Upcoming Nov 6, 7:00 PM Texas vs Texas A&M (Exhibition) | ",
 "Upcoming Mar 12 Texas vs Florida | ",
 "Upcoming Mar 13 Texas vs Florida | ",
 "Upcoming Mar 14 Texas vs Florida | ",
 "Upcoming Mar 19 Texas at Tennessee Lady Volunteers | ",
 "Upcoming Mar 20 Texas at Tennessee Lady Volunteers | ",
 "Upcoming Mar 21 Texas at Tennessee Lady Volunteers | ",
 "Upcoming Mar 26 Texas vs Alabama | ",
 "Upcoming Mar 27 Texas vs Alabama | ",
 "Upcoming Mar 28 Texas vs Alabama | ",
 "Upcoming Apr 2 Texas at Arkansas | ",
 "Upcoming Apr 3 Texas at Arkansas | ",
 "Upcoming Apr 4 Texas at Arkansas | ",
 "Upcoming Apr 9 Texas vs Missouri | ",
 "Upcoming Apr 10 Texas vs Missouri | ",
 "Upcoming Apr 11 Texas vs Missouri | ",
 "Upcoming Apr 16 Texas at LSU | ",
 "Upcoming Apr 17 Texas at LSU | ",
 "Upcoming Apr 18 Texas at LSU | ",
 "Upcoming Apr 30 Texas vs Mississippi State | ",
 "Upcoming May 2 Texas vs Mississippi State | ",
 "Upcoming May 6 Texas at Auburn | ",
 "Upcoming May 7 Texas at Auburn | ",
 "Upcoming May 8 Texas at Auburn | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 25 Men's · Texas at Sam Kendricks Dust Off Your Boots Classic | Completed",
 "Upcoming Oct 9, 11:00 AM Men's · Texas at Indiana | ",
 "Upcoming Oct 9, 11:00 AM Men's · Texas vs Northwestern | ",
 "Upcoming Oct 28 Men's · Texas at USA Swimming Short Course Worlds Selection Meet | ",
 "Upcoming Oct 30, 11:00 AM Men's · Texas at South Carolina | ",
 "Upcoming Nov 12 Men's · Texas at Texas Diving Invitational | ",
 "Upcoming Nov 18, 10:00 AM Men's · Texas at Texas Swimming Invitational | ",
 "Upcoming Dec 2 Men's · Texas vs U.S. Open | ",
 "Upcoming Dec 9 Men's · Texas at USA Diving Winter Nationals | ",
 "Upcoming Jan 8 Men's · Texas at SMU | ",
 "Upcoming Jan 22, 10:00 AM Men's · Texas vs Eddie Reese Showdown | ",
 "Upcoming Jan 29, 3:00 PM Men's · Texas vs Texas A&M | ",
 "Upcoming Jan 30, 11:00 AM Men's · Texas at The Sterkel Classic | ",
 "Upcoming Feb 14, 12:00 PM Men's · Texas at SEC Championship | ",
 "Upcoming Mar 4 Men's · Texas at Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Texas at NCAA Zone D Diving | ",
 "Upcoming Mar 24, 10:00 AM Men's · Texas at NCAA Championship | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · Texas at Sam Kendricks Dust Off Your Boots Classic | Completed",
 "Upcoming Oct 9, 11:00 AM Women's · Texas at Indiana | ",
 "Upcoming Oct 9, 11:00 AM Women's · Texas vs Northwestern | ",
 "Upcoming Oct 28 Women's · Texas at USA Swimming Short Course Worlds Selection Meet | ",
 "Upcoming Oct 30, 11:00 AM Women's · Texas at South Carolina | ",
 "Upcoming Nov 12 Women's · Texas at Texas Diving Invitational | ",
 "Upcoming Nov 18, 10:00 AM Women's · Texas at Texas Swimming Invitational | ",
 "Upcoming Dec 2 Women's · Texas vs U.S. Open | ",
 "Upcoming Dec 9 Women's · Texas at USA Diving Winter Nationals | ",
 "Upcoming Dec 16, 2:00 PM Women's · Texas vs Vanderbilt | ",
 "Upcoming Jan 8 Women's · Texas at SMU | ",
 "Upcoming Jan 22, 10:00 AM Women's · Texas vs Eddie Reese Showdown | ",
 "Upcoming Jan 29, 3:00 PM Women's · Texas vs Texas A&M | ",
 "Upcoming Jan 30, 11:00 AM Women's · Texas at The Sterkel Classic | ",
 "Upcoming Feb 14, 12:00 PM Women's · Texas at SEC Championship | ",
 "Upcoming Feb 25 Women's · Texas at Last Chance Meet | ",
 "Upcoming Mar 8 Women's · Texas at NCAA Zone D Diving | ",
 "Upcoming Mar 17, 10:00 AM Women's · Texas at NCAA Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Texas at ITA All-American Championships | Completed",
 "Today Oct 8 Men's · Texas at ITA Texas Regional Championships | ",
 "Upcoming Oct 19 Men's · Texas at Fort Worth Challenger | ",
 "Upcoming Oct 23 Men's · Texas at Baylor Invitational | ",
 "Upcoming Oct 26 Men's · Texas at Sioux Falls Challenger | ",
 "Upcoming Oct 26 Men's · Texas at Norman 25K | ",
 "Upcoming Nov 2 Men's · Texas at Charlottesville Challenger | ",
 "Upcoming Nov 2 Men's · Texas at Harlingen 25K | ",
 "Upcoming Nov 5 Men's · Texas at ITA Central Sectional Championships | ",
 "Upcoming Nov 5 Men's · Texas at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Texas at NCAA Singles and Doubles Championships | ",
 "Upcoming Jan 8 Men's · Texas vs Lamar | ",
 "Upcoming Jan 10 Men's · Texas vs Ohio State | ",
 "Upcoming Jan 15 Men's · Texas at Stanford | ",
 "Upcoming Jan 17 Men's · Texas at Arizona State | ",
 "Upcoming Jan 23 Men's · Texas at UNLV | ",
 "Upcoming Jan 24 Men's · Texas at San Diego or Boise State | ",
 "Upcoming Jan 29 Men's · Texas at Wake Forest | ",
 "Upcoming Feb 6 Men's · Texas vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 12 Men's · Texas at ITA National Indoor Championships | ",
 "Upcoming Feb 25 Men's · Texas vs South Carolina | ",
 "Upcoming Feb 27 Men's · Texas vs Vanderbilt | ",
 "Upcoming Mar 4 Men's · Texas at Georgia | ",
 "Upcoming Mar 6 Men's · Texas at Louisiana State | ",
 "Upcoming Mar 13 Men's · Texas vs Alabama | ",
 "Upcoming Mar 18 Men's · Texas vs Ole Miss | ",
 "Upcoming Mar 20 Men's · Texas vs Kentucky | ",
 "Upcoming Mar 25 Men's · Texas at Texas A&M | ",
 "Upcoming Mar 27 Men's · Texas at Oklahoma | ",
 "Upcoming Apr 1 Men's · Texas vs Arkansas | ",
 "Upcoming Apr 3 Men's · Texas at Tennessee | ",
 "Upcoming Apr 9 Men's · Texas vs Auburn | ",
 "Upcoming Apr 11 Men's · Texas vs Mississippi State | ",
 "Upcoming Apr 18 Men's · Texas vs Florida | ",
 "Upcoming Apr 21 Men's · Texas at SEC Championships | ",
 "Upcoming May 7 Men's · Texas at NCAA First and Second Rounds | ",
 "Upcoming May 14 Men's · Texas at NCAA Super Regionals | ",
 "Upcoming May 21 Men's · Texas at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Texas at ITA All-American Championships | Completed",
 "Upcoming Nov 5 Women's · Texas at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Texas at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Texas at NCAA Individual Championships | ",
 "Upcoming Jan 15 Women's · Texas vs LMU | ",
 "Upcoming Jan 17 Women's · Texas at Pepperdine | ",
 "Upcoming Jan 22 Women's · Texas at ITA Kickoff | ",
 "Upcoming Jan 29 Women's · Texas vs Arizona State | ",
 "Upcoming Jan 31 Women's · Texas vs Wisconsin | ",
 "Upcoming Feb 5 Women's · Texas at ITA National Indoors | ",
 "Upcoming Feb 28 Women's · Texas vs Texas A&M | ",
 "Upcoming Mar 5 Women's · Texas vs Ole Miss | ",
 "Upcoming Mar 7 Women's · Texas vs LSU | ",
 "Upcoming Mar 12 Women's · Texas at Mississippi State | ",
 "Upcoming Mar 14 Women's · Texas at Alabama | ",
 "Upcoming Mar 19 Women's · Texas at South Carolina | ",
 "Upcoming Mar 21 Women's · Texas at Georgia | ",
 "Upcoming Mar 25 Women's · Texas vs Vanderbilt | ",
 "Upcoming Mar 27 Women's · Texas vs Missouri | ",
 "Upcoming Apr 2 Women's · Texas at Tennessee | ",
 "Upcoming Apr 4 Women's · Texas vs Kentucky | ",
 "Upcoming Apr 9 Women's · Texas at Florida | ",
 "Upcoming Apr 11 Women's · Texas at Auburn | ",
 "Upcoming Apr 16 Women's · Texas vs Arkansas | ",
 "Upcoming Apr 18 Women's · Texas vs Oklahoma | ",
 "Upcoming Apr 21 Women's · Texas at SEC Tournament | ",
 "Upcoming May 7 Women's · Texas at NCAA First and Second Rounds | ",
 "Upcoming May 14 Women's · Texas at NCAA Super Regionals | ",
 "Upcoming May 20 Women's · Texas at NCAA Championships | "
]);
  const v_trackandfield_trackfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 Texas vs Arizona State | L, 1-3",
 "Final Aug 24 Texas vs Marquette | W, 3-2",
 "Final Aug 29 Texas vs TCU | W, 3-0",
 "Final Aug 30 Texas vs Nebraska | L, 0-3",
 "Final Sep 2 Texas vs USC | W, 3-0",
 "Final Sep 6 Texas vs Louisville | L, 0-3",
 "Final Sep 9 Texas at SMU | L, 2-3",
 "Final Sep 13 Texas vs Wisconsin | W, 3-1",
 "Final Sep 25 Texas at Tennessee | W, 3-2",
 "Final Sep 27 Texas at Kentucky | L, 0-3",
 "Final Oct 2 Texas vs Mississippi State | W, 3-0",
 "Final Oct 4 Texas vs Alabama | W, 3-1",
 "Upcoming Oct 9, 7:00 PM Texas at Arkansas | ",
 "Upcoming Oct 11, 2:00 PM Texas at Oklahoma | ",
 "Upcoming Oct 16, 6:30 PM Texas vs Auburn | ",
 "Upcoming Oct 18, 7:30 PM Texas vs Florida | ",
 "Upcoming Oct 25, 12:00 PM Texas at South Carolina | ",
 "Upcoming Oct 28, 7:00 PM Texas vs Georgia | ",
 "Upcoming Nov 1, 12:00 PM Texas vs Texas A&M | ",
 "Upcoming Nov 6, 7:00 PM Texas at Missouri | ",
 "Upcoming Nov 8, 1:00 PM Texas at Vanderbilt | ",
 "Upcoming Nov 13, 6:30 PM Texas vs Ole Miss | ",
 "Upcoming Nov 15, 1:00 PM Texas vs LSU | ",
 "Upcoming Nov 20 Texas at SEC Volleyball Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_wbvball,"Beach Volleyball wbvball");
  ownRecapsOnly(v_trackandfield,"Cross Country track-and-field");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield_trackfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
// Texas's pages publish no record: the computed ones are checked against
// the finals by hand (football 4-0, SEC 1-0: Tennessee).
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();

// One page ("Track & Field / Cross Country") lists both seasons: the fall
// meets are cross country; track keeps the rest (none published yet).
{
  const months=sport=>parse(sport,'track-and-field').map(e=>e.start_time.slice(5,7));
  assert.ok(months('Cross Country').length&&months('Cross Country').every(m=>m>='08'&&m<='11'));
  assert.deepEqual(parse('Track & Field','track-and-field').map(e=>e.title),[]);
}

// Golf: the place in the field, then the team score in brackets
// ("T-2nd of 14 (839)"), from the last round's result.
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value ?? r.result}`).join(' / ')]);
  assert.deepEqual(final('mens-golf'),[["Folds of Honor Collegiate","T2nd of 14","Result: T2nd of 14 / Team score: 839"],["Jackson T. Stephens Cup","1st of 6","Result: 1st of 6 / Team score: 839"],["Texas A&M (Championship Match)","W, 3-1","Result: W, 3-1"],["Bayou City Collegiate Classic (Individuals only)","Completed","Result: Completed"],["Ben Hogan Collegiate Invitational Presented by Charles Schwab","T5th of 16","Result: T5th of 16 / Team score: 854"]]);
  assert.deepEqual(final('womens-golf'),[["Jackson T. Stephens Cup","4th of 6","Result: 4th of 6 / Team score: 883"],["Oregon","W, 4-1","Result: W, 4-1"]]);
}

// Two polls are rankings ("#1/1 Ohio State"); the women's tennis page's pro
// events ("ITF Berkley W50") are the players', not the team's.
{
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>e.title),["Texas vs Texas State","Texas vs Ohio State","Texas vs UTSA","Texas at Tennessee"]);
  assert.deepEqual(parse('Tennis','womens-tennis').filter(e=>/\bITF\b/.test(e.opponent)).length,0);
  assert.deepEqual(parse('Tennis','womens-tennis').filter(e=>e.status==='Final').map(e=>e.opponent),["ITA All-American Championships"]);
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','track-and-field').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/TX_college_f_Texas.html',Men:'https://www.tfrrs.org/teams/xc/TX_college_m_Texas.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Floyd Farms Invitational","Women's team: 1st · 15 pts / Men's team: 1st · 15 pts",true],["Texas A&M Invitational","Women's team: 7th · 166 pts / Men's team: 2nd · 58 pts",true],["Gans Creek Classic","Women's team: 20th · 532 pts / Men's team: 14th · 380 pts",true],["Chile Pepper Festival","Women's team: 6th / Men's team: 1st",false]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Texas's game only.
{
  live('Football','football-espn-2026-09-26.json.gz',parse('Football','football'),new Date('2026-09-27T12:00:00Z'),[["Texas at Tennessee","Final","W, 20-17"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Texas vs Alabama","Final","W, 3-1"]]);
  live('Soccer','soccer-espn-2026-10-04.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-05T12:00:00Z'),[["Texas vs Oklahoma","Final","W, 2-1"]]);
}

// Records equal the ones the official pages publish.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>records(sport,slug)),[["4-0","1-0"],["7-5","3-1"],["7-2-3","2-1-2"]]);

// Other schools and other hosts never reach the Texas reader.
assert.equal(worker.texasHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://texaslonghorns.com/',now),null);
assert.equal(worker.texasHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Texas module checks passed');
