import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {texasAmSchool,texasAmGolfPlace} from '../src/schools/texas-am.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='texas-am');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,texasAmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/texas-am-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit 12thman.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['texas-am'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',texasAmSchool.scheduleUrls],['roster',texasAmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('texas-am|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'12thman.com',`${key} must stay on 12thman.com`);
  }
}
const parity={"Baseball":{"schedule":["https://12thman.com/sports/baseball/schedule"],"roster":["https://12thman.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://12thman.com/sports/mens-basketball/schedule","https://12thman.com/sports/womens-basketball/schedule"],"roster":["https://12thman.com/sports/mens-basketball/roster","https://12thman.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://12thman.com/sports/cross-country/schedule"],"roster":["https://12thman.com/sports/cross-country/roster"],"combined":false},"Equestrian":{"schedule":["https://12thman.com/sports/equestrian/schedule"],"roster":["https://12thman.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://12thman.com/sports/football/schedule"],"roster":["https://12thman.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://12thman.com/sports/mens-golf/schedule","https://12thman.com/sports/womens-golf/schedule"],"roster":["https://12thman.com/sports/mens-golf/roster","https://12thman.com/sports/womens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://12thman.com/sports/soccer/schedule"],"roster":["https://12thman.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://12thman.com/sports/softball/schedule"],"roster":["https://12thman.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://12thman.com/sports/swimdive/schedule"],"roster":["https://12thman.com/sports/swimdive/roster"],"combined":false},"Tennis":{"schedule":["https://12thman.com/sports/mens-tennis/schedule","https://12thman.com/sports/womens-tennis/schedule"],"roster":["https://12thman.com/sports/mens-tennis/roster","https://12thman.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://12thman.com/sports/track-and-field/schedule"],"roster":["https://12thman.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://12thman.com/sports/volleyball/schedule"],"roster":["https://12thman.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'texas-am|"+sport+"':"),`${sport} routes must live in the Texas A&M module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://12thman.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.texasAmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=texas-am)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 9 Texas A&M vs Rice (Exhibition) | ",
 "Upcoming Oct 16 Texas A&M vs McNeese (Exhibition) | ",
 "Upcoming Mar 5 Texas A&M vs Louisville | ",
 "Upcoming Mar 6 Texas A&M vs Louisiana | ",
 "Upcoming Mar 7 Texas A&M vs Houston | ",
 "Upcoming Mar 19 Texas A&M at Alabama | ",
 "Upcoming Mar 20 Texas A&M at Alabama | ",
 "Upcoming Mar 21 Texas A&M at Alabama | ",
 "Upcoming Mar 26 Texas A&M vs Tennessee | ",
 "Upcoming Mar 27 Texas A&M vs Tennessee | ",
 "Upcoming Mar 28 Texas A&M vs Tennessee | ",
 "Upcoming Apr 2 Texas A&M at Kentucky | ",
 "Upcoming Apr 3 Texas A&M at Kentucky | ",
 "Upcoming Apr 4 Texas A&M at Kentucky | ",
 "Upcoming Apr 9 Texas A&M vs Oklahoma | ",
 "Upcoming Apr 10 Texas A&M vs Oklahoma | ",
 "Upcoming Apr 11 Texas A&M vs Oklahoma | ",
 "Upcoming Apr 16 Texas A&M at Mississippi State | ",
 "Upcoming Apr 17 Texas A&M at Mississippi State | ",
 "Upcoming Apr 18 Texas A&M at Mississippi State | ",
 "Upcoming Apr 23 Texas A&M vs LSU | ",
 "Upcoming Apr 24 Texas A&M vs LSU | ",
 "Upcoming Apr 25 Texas A&M vs LSU | ",
 "Upcoming Apr 30 Texas A&M at South Carolina | ",
 "Upcoming May 1 Texas A&M at South Carolina | ",
 "Upcoming May 2 Texas A&M at South Carolina | ",
 "Upcoming May 7 Texas A&M vs Arkansas | ",
 "Upcoming May 8 Texas A&M vs Arkansas | ",
 "Upcoming May 9 Texas A&M vs Arkansas | ",
 "Upcoming May 14 Texas A&M at Texas | ",
 "Upcoming May 15 Texas A&M at Texas | ",
 "Upcoming May 16 Texas A&M at Texas | ",
 "Upcoming May 20 Texas A&M vs Ole Miss | ",
 "Upcoming May 21 Texas A&M vs Ole Miss | ",
 "Upcoming May 22 Texas A&M vs Ole Miss | ",
 "Upcoming May 25 Texas A&M at SEC Tournament | ",
 "Upcoming Jun 4 Texas A&M at NCAA Regional | ",
 "Upcoming Jun 11 Texas A&M at NCAA Super Regional | ",
 "Upcoming Jun 17 Texas A&M at College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25 Men's · Texas A&M at SMU (Exhibition) | ",
 "Upcoming Nov 3 Men's · Texas A&M vs Alabama State | ",
 "Upcoming Nov 6 Men's · Texas A&M vs Northern Kentucky | ",
 "Upcoming Nov 9 Men's · Texas A&M vs ULM | ",
 "Upcoming Nov 12 Men's · Texas A&M vs Oklahoma State | ",
 "Upcoming Nov 16 Men's · Texas A&M vs Southeastern Louisiana | ",
 "Upcoming Nov 19 Men's · Texas A&M at TCU | ",
 "Upcoming Nov 25 Men's · Texas A&M vs Xavier | ",
 "Upcoming Nov 27 Men's · Texas A&M vs Marquette | ",
 "Upcoming Dec 2 Men's · Texas A&M vs Stanford | ",
 "Upcoming Dec 6 Men's · Texas A&M vs UAPB | ",
 "Upcoming Dec 12 Men's · Texas A&M vs Florida State | ",
 "Upcoming Dec 17 Men's · Texas A&M vs Holy Cross | ",
 "Upcoming Dec 21 Men's · Texas A&M vs North Florida | ",
 "Upcoming Dec 29 Men's · Texas A&M vs Prairie View | ",
 "Upcoming Jan 2 Men's · Texas A&M vs Auburn | ",
 "Upcoming Jan 5 Men's · Texas A&M at Missouri | ",
 "Upcoming Jan 9 Men's · Texas A&M at South Carolina | ",
 "Upcoming Jan 12 Men's · Texas A&M vs Arkansas | ",
 "Upcoming Jan 16 Men's · Texas A&M vs LSU | ",
 "Upcoming Jan 20 Men's · Texas A&M at Florida | ",
 "Upcoming Jan 23 Men's · Texas A&M at Ole Miss | ",
 "Upcoming Jan 26 Men's · Texas A&M vs Tennessee | ",
 "Upcoming Jan 30 Men's · Texas A&M at Vanderbilt | ",
 "Upcoming Feb 2 Men's · Texas A&M vs Oklahoma | ",
 "Upcoming Feb 6 Men's · Texas A&M at Mississippi State | ",
 "Upcoming Feb 13 Men's · Texas A&M vs Georgia | ",
 "Upcoming Feb 17 Men's · Texas A&M at Texas | ",
 "Upcoming Feb 20 Men's · Texas A&M vs Vanderbilt | ",
 "Upcoming Feb 23 Men's · Texas A&M vs Alabama | ",
 "Upcoming Feb 27 Men's · Texas A&M at LSU | ",
 "Upcoming Mar 3 Men's · Texas A&M at Kentucky | ",
 "Upcoming Mar 6 Men's · Texas A&M vs Texas | ",
 "Upcoming Mar 10 Men's · Texas A&M at SEC Tournament | ",
 "Upcoming Mar 16 Men's · Texas A&M at NCAA Opening Round | ",
 "Upcoming Mar 18 Men's · Texas A&M at NCAA 1st/2nd Rounds | ",
 "Upcoming Mar 25 Men's · Texas A&M at NCAA Regionals | ",
 "Upcoming Apr 3 Men's · Texas A&M at NCAA Final Four | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Texas A&M vs UAPB | ",
 "Upcoming Nov 5 Women's · Texas A&M vs Louisiana | ",
 "Upcoming Nov 7 Women's · Texas A&M vs LSU New Orleans | ",
 "Upcoming Nov 16 Women's · Texas A&M vs Lamar | ",
 "Upcoming Nov 18 Women's · Texas A&M vs East Texas A&M | ",
 "Upcoming Nov 21 Women's · Texas A&M vs UIW | ",
 "Upcoming Nov 27 Women's · Texas A&M vs Bowling Green | ",
 "Upcoming Nov 28 Women's · Texas A&M vs Charlotte | ",
 "Upcoming Dec 3 Women's · Texas A&M at Cal | ",
 "Upcoming Dec 6 Women's · Texas A&M vs Hofstra | ",
 "Upcoming Dec 12 Women's · Texas A&M at Nebraska | ",
 "Upcoming Dec 15 Women's · Texas A&M vs Tarleton State | ",
 "Upcoming Dec 17 Women's · Texas A&M vs Sam Houston | ",
 "Upcoming Dec 22 Women's · Texas A&M vs Prairie View | ",
 "Upcoming Dec 31 Women's · Texas A&M vs Tennessee | ",
 "Upcoming Jan 3 Women's · Texas A&M at Mississippi State | ",
 "Upcoming Jan 7 Women's · Texas A&M at LSU | ",
 "Upcoming Jan 10 Women's · Texas A&M vs Missouri | ",
 "Upcoming Jan 14 Women's · Texas A&M at Vanderbilt | ",
 "Upcoming Jan 21 Women's · Texas A&M vs Texas | ",
 "Upcoming Jan 24 Women's · Texas A&M at Auburn | ",
 "Upcoming Jan 28 Women's · Texas A&M vs Ole Miss | ",
 "Upcoming Jan 31 Women's · Texas A&M vs Oklahoma | ",
 "Upcoming Feb 4 Women's · Texas A&M at Arkansas | ",
 "Upcoming Feb 7 Women's · Texas A&M vs Florida | ",
 "Upcoming Feb 11 Women's · Texas A&M at South Carolina | ",
 "Upcoming Feb 14 Women's · Texas A&M at Texas | ",
 "Upcoming Feb 22 Women's · Texas A&M vs Georgia | ",
 "Upcoming Feb 25 Women's · Texas A&M vs Kentucky | ",
 "Upcoming Feb 28 Women's · Texas A&M at Alabama | ",
 "Upcoming Mar 3 Women's · Texas A&M at SEC Tournament | ",
 "Upcoming Mar 17 Women's · Texas A&M at NCAA Opening Round | ",
 "Upcoming Mar 19 Women's · Texas A&M at NCAA 1st & 2nd Rounds | ",
 "Upcoming Mar 26 Women's · Texas A&M at NCAA Regionals | ",
 "Upcoming Apr 2 Women's · Texas A&M at NCAA Women's Final Four | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Texas A&M at Aggie Opener | Completed",
 "Final Sep 11 Texas A&M at Texas A&M Invitational | Completed",
 "Final Sep 26 Texas A&M at Princeton Meadows Challenge | Completed",
 "Upcoming Oct 16 Texas A&M at Arturo Barrios Invitational | ",
 "Upcoming Oct 30 Texas A&M at SEC Cross Country Championships | ",
 "Upcoming Nov 13 Texas A&M vs NCAA South Central Regional | ",
 "Upcoming Nov 21 Texas A&M at NCAA Cross Country Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 24 Texas A&M at Delaware State | W, 13-5",
 "Final Sep 24 Texas A&M vs Minnesota Crookston | W, 11-5",
 "Upcoming Oct 10 Texas A&M at Georgia | ",
 "Upcoming Oct 23 Texas A&M at Auburn | ",
 "Upcoming Oct 29 Texas A&M vs SMU | ",
 "Upcoming Nov 5 Texas A&M vs South Carolina | ",
 "Upcoming Jan 30 Texas A&M at SMU | ",
 "Upcoming Feb 5 Texas A&M vs Oklahoma State | ",
 "Upcoming Feb 12 Texas A&M at UT Martin | ",
 "Upcoming Feb 20 Texas A&M at South Carolina | ",
 "Upcoming Feb 27 Texas A&M vs Georgia | ",
 "Upcoming Mar 6 Texas A&M vs Auburn | ",
 "Upcoming Mar 26 Texas A&M at SEC Equestrian Championship | ",
 "Upcoming Apr 15 Texas A&M at NCEA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Texas A&M vs Missouri State | W, 50-0",
 "Final Sep 12 Texas A&M vs Arizona State | W, 48-20",
 "Final Sep 19 Texas A&M vs Kentucky | L, 21-31",
 "Final Sep 26 Texas A&M at LSU | L, 6-35",
 "Final Oct 3 Texas A&M vs Arkansas | W, 34-7",
 "Upcoming Oct 10 Texas A&M at Missouri | ",
 "Upcoming Oct 17 Texas A&M vs The Citadel | ",
 "Upcoming Oct 24 Texas A&M at Alabama | ",
 "Upcoming Nov 7 Texas A&M at South Carolina | ",
 "Upcoming Nov 14 Texas A&M vs Tennessee | ",
 "Upcoming Nov 21 Texas A&M at Oklahoma | ",
 "Upcoming Nov 27 Texas A&M vs Texas | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Texas A&M at Jackson T. Stephens Cup | Completed",
 "Final Sep 18 Men's · Texas A&M at OFCC/Fighting Illini Invitational | Completed",
 "Final Sep 21 Men's · Texas A&M at Bayou City Collegiate Classic (indiv.) | Completed",
 "Final Oct 4 Men's · Texas A&M at Fighting Irish Classic | Completed",
 "Upcoming Oct 19 Men's · Texas A&M at Abilene Christian Intercollegiate | ",
 "Upcoming Oct 31 Men's · Texas A&M at Steelwood Collegiate Invitational | ",
 "Upcoming Feb 1 Men's · Texas A&M at Arizona N.I.T. | ",
 "Upcoming Feb 11 Men's · Texas A&M at John A. Burns Intercollegiate | ",
 "Upcoming Mar 8 Men's · Texas A&M at The Desimone Invitational | ",
 "Upcoming Mar 15 Men's · Texas A&M at Pauma Valley Invitational | ",
 "Upcoming Mar 22 Men's · Texas A&M at Valspar Collegiate Invitational | ",
 "Upcoming Apr 10 Men's · Texas A&M at The Aggie Invitational | ",
 "Upcoming Apr 20 Men's · Texas A&M at SEC Championship | ",
 "Upcoming May 16 Men's · Texas A&M at NCAA Regional | ",
 "Upcoming May 28 Men's · Texas A&M at NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Texas A&M at Folds of Honor Collegiate | Completed",
 "Final Sep 21 Women's · Texas A&M at Golfweek Red Sky Classic | Completed",
 "Upcoming Oct 19 Women's · Texas A&M at The Fin | ",
 "Upcoming Oct 26 Women's · Texas A&M at Nanea Invitational | ",
 "Upcoming Jan 31 Women's · Texas A&M at Therese Hession Regional Challenge | ",
 "Upcoming Feb 14 Women's · Texas A&M at Moon Golf Invitational | ",
 "Upcoming Mar 11 Women's · Texas A&M at The Nanea Cup | ",
 "Upcoming Mar 22 Women's · Texas A&M at Charles Schwab Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · Texas A&M vs The \"Mo\"Morial | ",
 "Upcoming Apr 16 Women's · Texas A&M at SEC Championship | ",
 "Upcoming May 10 Women's · Texas A&M at NCAA Regional | ",
 "Upcoming May 21 Women's · Texas A&M at NCAA Championship | "
]);
  const v_soccer=parse("Soccer","soccer");
  assert.deepEqual(v_soccer.map(line),[
 "Final Aug 5 Texas A&M vs UIW (Exhibition) | W, 3-0",
 "Final Aug 8 Texas A&M at Texas (Exhibition) | L, 0-1",
 "Final Aug 12 Texas A&M at Rice | W, 2-1",
 "Final Aug 16 Texas A&M at Baylor | L, 1-2",
 "Final Aug 19 Texas A&M at Texas State | L, 2-3",
 "Final Aug 22 Texas A&M vs Sam Houston | W, 5-0",
 "Final Aug 27 Texas A&M vs Air Force | W, 2-1",
 "Final Sep 3 Texas A&M vs TCU | L, 0-3",
 "Final Sep 6 Texas A&M vs SFA | W, 4-0",
 "Final Sep 11 Texas A&M at Kentucky | L, 2-3",
 "Final Sep 18 Texas A&M at Vanderbilt | L, 0-5",
 "Final Sep 24 Texas A&M vs Alabama | L, 0-1",
 "Final Sep 27 Texas A&M vs Florida | L, 2-5",
 "Final Oct 2 Texas A&M at Georgia | L, 1-2",
 "Upcoming Oct 9 Texas A&M at Mississippi State | ",
 "Upcoming Oct 15 Texas A&M vs South Carolina | ",
 "Upcoming Oct 18 Texas A&M vs LSU | ",
 "Upcoming Oct 22 Texas A&M at Missouri | ",
 "Upcoming Nov 1 Texas A&M vs Ole Miss | ",
 "Upcoming Nov 8 Texas A&M at SEC Tournament | ",
 "Upcoming Nov 20 Texas A&M at NCAA 1st Round | ",
 "Upcoming Nov 27 Texas A&M at NCAA 2nd/3rd Rounds | ",
 "Upcoming Dec 4 Texas A&M at NCAA Quarterfinals | ",
 "Upcoming Dec 10 Texas A&M at NCAA Women's College Cup | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 30 Texas A&M vs Murray State College (Exhibition) | W, 18-3",
 "Upcoming Oct 9 Texas A&M vs Temple College (Exhibition) | ",
 "Upcoming Oct 22 Texas A&M vs McLennan CC (Exhibition) | ",
 "Upcoming Oct 30 Texas A&M vs Texas State (Exhibition) | ",
 "Upcoming Nov 4 Texas A&M vs Grayson College (Exhibition) | ",
 "Upcoming Nov 6 Texas A&M vs Texas (Exhibition) | ",
 "Upcoming Mar 12 Texas A&M vs Tennessee | ",
 "Upcoming Mar 13 Texas A&M vs Tennessee | ",
 "Upcoming Mar 14 Texas A&M vs Tennessee | ",
 "Upcoming Mar 19 Texas A&M at Alabama | ",
 "Upcoming Mar 20 Texas A&M at Alabama | ",
 "Upcoming Mar 21 Texas A&M at Alabama | ",
 "Upcoming Mar 26 Texas A&M at Florida | ",
 "Upcoming Mar 27 Texas A&M at Florida | ",
 "Upcoming Mar 28 Texas A&M at Florida | ",
 "Upcoming Apr 2 Texas A&M vs Auburn | ",
 "Upcoming Apr 3 Texas A&M vs Auburn | ",
 "Upcoming Apr 4 Texas A&M vs Auburn | ",
 "Upcoming Apr 16 Texas A&M at Arkansas | ",
 "Upcoming Apr 17 Texas A&M at Arkansas | ",
 "Upcoming Apr 18 Texas A&M at Arkansas | ",
 "Upcoming Apr 23 Texas A&M vs Missouri | ",
 "Upcoming Apr 24 Texas A&M vs Missouri | ",
 "Upcoming Apr 25 Texas A&M vs Missouri | ",
 "Upcoming Apr 30 Texas A&M at Kentucky | ",
 "Upcoming May 1 Texas A&M at Kentucky | ",
 "Upcoming May 2 Texas A&M at Kentucky | ",
 "Upcoming May 6 Texas A&M vs South Carolina | ",
 "Upcoming May 7 Texas A&M vs South Carolina | ",
 "Upcoming May 8 Texas A&M vs South Carolina | ",
 "Upcoming May 11 Texas A&M at SEC Tournament | ",
 "Upcoming May 20 Texas A&M at NCAA Regional | ",
 "Upcoming May 27 Texas A&M at NCAA Super Regional | ",
 "Upcoming Jun 3 Texas A&M at Women's College World Series | "
]);
  const v_swimdive=parse("Swimming & Diving","swimdive");
  assert.deepEqual(v_swimdive.map(line),[
 "Upcoming Oct 10 Texas A&M vs (#15/12) Georgia | ",
 "Upcoming Oct 23 Texas A&M at LSU | ",
 "Upcoming Nov 7 Texas A&M at Arkansas | ",
 "Upcoming Nov 7 Texas A&M vs Illinois | ",
 "Upcoming Nov 12 Texas A&M at Texas Diving Invitational | ",
 "Upcoming Nov 18 Texas A&M at Texas Swimming Invitational | ",
 "Upcoming Dec 2 Texas A&M at U.S. Open | ",
 "Upcoming Dec 9 Texas A&M at USA Diving Winter Nationals | ",
 "Upcoming Jan 8 Texas A&M vs Auburn | ",
 "Upcoming Jan 8 Texas A&M vs Florida State | ",
 "Upcoming Jan 9 Texas A&M vs Auburn | ",
 "Upcoming Jan 23 Texas A&M vs SMU | ",
 "Upcoming Jan 29 Texas A&M at Texas | ",
 "Upcoming Jan 30 Texas A&M at Texas | ",
 "Upcoming Feb 14 Texas A&M at SEC Championships | ",
 "Upcoming Mar 8 Texas A&M at NCAA Zone D Diving Championships | ",
 "Upcoming Mar 17 Texas A&M at NCAA Women's Championship | ",
 "Upcoming Mar 24 Texas A&M at NCAA Men's Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Today Oct 8 Men's · Texas A&M at ITA Regional Championships | ",
 "Upcoming Nov 5 Men's · Texas A&M at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Texas A&M at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Men's · Texas A&M at NCAA Singles & Doubles Championships | ",
 "Upcoming Jan 23 Men's · Texas A&M vs Samford | ",
 "Upcoming Jan 24 Men's · Texas A&M vs Rice/GCU | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Today Oct 8 Women's · Texas A&M at ITA Regional Championships | ",
 "Upcoming Oct 22 Women's · Texas A&M at TCU JAE Foundation Battle | ",
 "Upcoming Oct 30 Women's · Texas A&M at H-E-B Invitational | ",
 "Upcoming Nov 5 Women's · Texas A&M at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Texas A&M at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Women's · Texas A&M at NCAA Singles & Doubles Championships | ",
 "Upcoming Jan 6 Women's · Texas A&M at Hawai'i Invitational | ",
 "Upcoming Jan 17 Women's · Texas A&M vs TCU | ",
 "Upcoming Jan 23 Women's · Texas A&M vs Elon | ",
 "Upcoming Jan 24 Women's · Texas A&M vs Rice/Boise State | ",
 "Upcoming Jan 29 Women's · Texas A&M vs Pepperdine | ",
 "Upcoming Feb 5 Women's · Texas A&M at ITA National Team Indoor Championships | ",
 "Upcoming Feb 21 Women's · Texas A&M vs McNeese | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 16 Texas A&M at Baylor (Exhibition) | W, 3-1",
 "Final Aug 21 Texas A&M vs Louisville | L, 1-3",
 "Final Aug 23 Texas A&M vs SMU | L, 0-3",
 "Final Aug 28 Texas A&M vs GCU | W, 3-1",
 "Final Aug 28 Texas A&M vs Arkansas State | W, 3-0",
 "Final Aug 29 Texas A&M vs Cal Poly | W, 3-0",
 "Final Sep 1 Texas A&M at Purdue | L, 0-3",
 "Final Sep 2 Texas A&M vs Indiana | L, 2-3",
 "Final Sep 9 Texas A&M vs Stanford | W, 3-1",
 "Final Sep 11 Texas A&M vs Wisconsin | L, 2-3",
 "Final Sep 15 Texas A&M vs SFA | W, 3-0",
 "Final Sep 20 Texas A&M at Creighton | W, 3-1",
 "Final Sep 22 Texas A&M vs Rice | W, 3-0",
 "Final Sep 27 Texas A&M vs South Carolina | W, 3-0",
 "Final Oct 2 Texas A&M vs Alabama | W, 3-0",
 "Final Oct 4 Texas A&M vs Mississippi State | W, 3-0",
 "Final Oct 7 Texas A&M at Oklahoma | L, 2-3",
 "Upcoming Oct 11 Texas A&M at Arkansas | ",
 "Upcoming Oct 16 Texas A&M vs Florida | ",
 "Upcoming Oct 18 Texas A&M vs Auburn | ",
 "Upcoming Oct 23 Texas A&M at Georgia | ",
 "Upcoming Oct 25 Texas A&M at Kentucky | ",
 "Upcoming Oct 30 Texas A&M vs Tennessee | ",
 "Upcoming Nov 1 Texas A&M at Texas | ",
 "Upcoming Nov 6 Texas A&M at Vanderbilt | ",
 "Upcoming Nov 8 Texas A&M at Missouri | ",
 "Upcoming Nov 13 Texas A&M vs LSU | ",
 "Upcoming Nov 15 Texas A&M vs Ole Miss | ",
 "Upcoming Nov 20 Texas A&M at SEC Tournament | ",
 "Upcoming Dec 3 Texas A&M at NCAA 1st/2nd Rounds | ",
 "Upcoming Dec 10 Texas A&M at NCAA Regionals | ",
 "Upcoming Dec 17 Texas A&M at NCAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_soccer,"Soccer soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimdive,"Swimming & Diving swimdive");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_volleyball,"Volleyball volleyball");
}
// END generated

// Texas A&M's cards (schedule-event-default__*): the date box is the card's
// top row; a home or neutral card has no divider, its date box names the
// venue; rankings are bracketed ("(#21) Baylor"); results read "W, Win 3-1".
{
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Texas A&M vs Missouri State","W, 50-0"],["Texas A&M vs Arizona State","W, 48-20"],["Texas A&M vs Kentucky","L, 21-31"],["Texas A&M at LSU","L, 6-35"],["Texas A&M vs Arkansas","W, 34-7"]]);
  assert.deepEqual(parse('Volleyball','volleyball').slice(0,4).map(e=>[e.title,e.headline]),[["Texas A&M at Baylor (Exhibition)","W, 3-1"],["Texas A&M vs Louisville","L, 1-3"],["Texas A&M vs SMU","L, 0-3"],["Texas A&M vs GCU","W, 3-1"]]);
  // A home meet named "Opener" is "at".
  assert.equal(parse('Cross Country','cross-country')[0].title,'Texas A&M at Aggie Opener');
}

// Golf: the cards publish no place; the final story's headline gives it
// ("Earns Runner-Up Finish", "Aggies Finish Second").
{
  assert.equal(texasAmGolfPlace('Men’s Golf Earns Runner-Up Finish at Jackson T. Stephens Cup'),'2');
  assert.equal(texasAmGolfPlace('Schartz Leads Aggies to Runner-Up Finish at Folds of Honor'),'2');
  assert.equal(texasAmGolfPlace('Ennis Wins Individual Title at Fighting Irish Classic, Aggies Finish Second'),'2');
  assert.equal(texasAmGolfPlace('Men’s Golf Concludes Fighting Illini Invitational'),null);
  assert.equal(texasAmGolfPlace('Ennis Earns Runner-Up Finish'),null);
}

// A past golf tournament whose card links no story (the Fighting Irish
// Classic, Oct 4-5) takes the archive story dated its last day or the two
// after that names it; the individuals' Bayou City Classic finds none and
// leaves the feed.
{
  const golf=parse('Golf','mens-golf').filter(worker.texasAmHandlers.isGolfWithoutStory);
  assert.deepEqual(golf.map(e=>e.opponent),["Bayou City Collegiate Classic (indiv.)","Fighting Irish Classic"]);
  recapFixtures.set('https://12thman.com/sports/mens-golf/archives',fixture('mens-golf-archives.html.gz'));
  for(const [path,file] of [['/news/2026/10/6/ennis-wins-individual-title-at-fighting-irish-classic-aggies-finish-second','story-2026-10-6-ennis-wins-individual-title-at-fighting-.html.gz'],['/news/2026/10/5/ennis-and-aggies-tied-for-second-after-day-one-of-fighting-irish-classic','story-2026-10-5-ennis-and-aggies-tied-for-second-after-d.html.gz']])recapFixtures.set(`https://12thman.com${path}`,fixture(file));
  for(const event of golf)await worker.texasAmHandlers.attachArchiveStory(event);
  const irish=golf.find(e=>/Fighting Irish/.test(e.opponent));
  assert.equal(irish.recap_url,'https://12thman.com/news/2026/10/6/ennis-wins-individual-title-at-fighting-irish-classic-aggies-finish-second');
  assert.equal(golf.find(e=>/Bayou City/.test(e.opponent)).recap_url,undefined);
  recapFixtures.set(irish.recap_url,fixture('story-2026-10-6-ennis-wins-individual-title-at-fighting-.html.gz'));
  await worker.texasAmHandlers.attachGolfPlace(irish);
  assert.equal(irish.headline,'2nd');
  recapFixtures.clear();requests.length=0;
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/TX_college_f_Texas_AM.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/TX_college_m_Texas_AM.html','tfrrs-team-m.html.gz']]){
    const page=fixture(file);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Aggie Opener","Women's team: 1st · 34 pts / Men's team: 1st · 33 pts",true],["Texas A&M Invitational","Women's team: 2nd · 81 pts / Men's team: 5th · 129 pts",true],["Princeton Meadows Challenge","Women's team: 12th · 297 pts / Men's team: 13th · 356 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Texas A&M's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Texas A&M vs Arkansas","Final","W, 34-7"]]);
  live('Volleyball','volleyball-espn-2026-10-07.json.gz',parse('Volleyball','volleyball'),new Date('2026-10-08T12:00:00Z'),[["Texas A&M at Oklahoma","Final","L, 2-3"]]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','soccer'),new Date('2026-10-03T12:00:00Z'),[["Texas A&M at Georgia","Final","L, 1-2"]]);
}

// Records: each sport's overall and SEC record equals the one its page
// publishes (the first two win-loss records in the page data).
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const [overall,conference]=data.filter(value=>value&&!Array.isArray(value)&&typeof value==='object'&&Object.keys(value).sort().join()==='loses,pct,ties,wins').map(r=>[data[r.wins],data[r.loses],data[r.ties]]).map(([w,l,t])=>`${w}-${l}${t?`-${t}`:''}`);
    return[overall,conference];
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual([['Football','football'],['Volleyball','volleyball'],['Soccer','soccer']].map(([sport,slug])=>{assert.deepEqual(record(sport,slug),[published(slug)],`${sport}: the computed records are the official ones`);return published(slug);}),[["3-2","1-2"],["10-6","3-1"],["4-8","0-5"]]);
}

// Other schools and other hosts never reach the Texas A&M reader.
assert.equal(worker.texasAmHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://12thman.com/',now),null);
assert.equal(worker.texasAmHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Texas A&M module checks passed');
