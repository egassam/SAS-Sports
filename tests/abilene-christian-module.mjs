import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {abileneChristianSchool} from '../src/schools/abilene-christian.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='abilene-christian');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,abileneChristianHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/abilene-christian-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit acusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['abilene-christian'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',abileneChristianSchool.scheduleUrls],['roster',abileneChristianSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('abilene-christian|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'acusports.com',`${key} must stay on acusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://acusports.com/sports/baseball/schedule"],"roster":["https://acusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://acusports.com/sports/mens-basketball/schedule","https://acusports.com/sports/womens-basketball/schedule"],"roster":["https://acusports.com/sports/mens-basketball/roster","https://acusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://acusports.com/sports/cross-country/schedule"],"roster":["https://acusports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://acusports.com/sports/football/schedule"],"roster":["https://acusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://acusports.com/sports/womens-golf/schedule","https://acusports.com/sports/mens-golf/schedule"],"roster":["https://acusports.com/sports/womens-golf/roster","https://acusports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://acusports.com/sports/womens-soccer/schedule"],"roster":["https://acusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://acusports.com/sports/softball/schedule"],"roster":["https://acusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://acusports.com/sports/womens-tennis/schedule","https://acusports.com/sports/mens-tennis/schedule"],"roster":["https://acusports.com/sports/womens-tennis/roster","https://acusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://acusports.com/sports/track-and-field/schedule"],"roster":["https://acusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://acusports.com/sports/womens-volleyball/schedule"],"roster":["https://acusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'abilene-christian|"+sport+"':"),`${sport} routes must live in the Abilene Christian module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://acusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.abileneChristianHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=abilene-christian)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Mar 1, 7:00 PM Abilene Christian vs Air Force | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Abilene Christian at Colorado | ",
 "Upcoming Nov 7, 1:00 PM Men's · Abilene Christian vs Lamar | ",
 "Upcoming Nov 11, 7:00 PM Men's · Abilene Christian vs Stephen F. Austin | ",
 "Upcoming Nov 16, 7:00 PM Men's · Abilene Christian at Missouri State | ",
 "Upcoming Nov 18, 8:00 PM Men's · Abilene Christian vs McMurry | ",
 "Upcoming Nov 21, 7:00 PM Men's · Abilene Christian vs Southwestern Adventist | ",
 "Upcoming Nov 25, 1:00 PM Men's · Abilene Christian at South Dakota State | ",
 "Upcoming Nov 28, 7:00 PM Men's · Abilene Christian vs Dallas | ",
 "Upcoming Dec 1, 7:00 PM Men's · Abilene Christian vs Pepperdine | ",
 "Upcoming Dec 5, 6:00 PM Men's · Abilene Christian vs South Dakota State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Abilene Christian vs Hardin-Simmons | ",
 "Upcoming Dec 13, 2:00 PM Men's · Abilene Christian at Utah | ",
 "Upcoming Dec 19, 1:00 PM Men's · Abilene Christian at Stetson | ",
 "Upcoming Dec 21, 6:00 PM Men's · Abilene Christian at Florida Gulf Coast | ",
 "Upcoming Dec 31, 3:00 PM Men's · Abilene Christian vs North Florida | ",
 "Upcoming Jan 2, 6:00 PM Men's · Abilene Christian vs Jacksonville | ",
 "Upcoming Jan 6, 7:00 PM Men's · Abilene Christian vs Little Rock | ",
 "Upcoming Jan 13, 7:30 PM Men's · Abilene Christian at Central Arkansas | ",
 "Upcoming Jan 16, 6:00 PM Men's · Abilene Christian vs UT Arlington | ",
 "Upcoming Jan 20, 7:45 PM Men's · Abilene Christian at North Alabama | ",
 "Upcoming Jan 23, 3:30 PM Men's · Abilene Christian at West Georgia | ",
 "Upcoming Jan 27, 7:00 PM Men's · Abilene Christian vs Austin Peay | ",
 "Upcoming Jan 30, 5:00 PM Men's · Abilene Christian at UT Arlington | ",
 "Upcoming Feb 3, 7:00 PM Men's · Abilene Christian vs Central Arkansas | ",
 "Upcoming Feb 6, 6:00 PM Men's · Abilene Christian vs Tarleton State | ",
 "Upcoming Feb 10, 7:30 PM Men's · Abilene Christian at Austin Peay | ",
 "Upcoming Feb 13, 3:00 PM Men's · Abilene Christian at Eastern Kentucky | ",
 "Upcoming Feb 17, 8:00 PM Men's · Abilene Christian vs North Alabama | ",
 "Upcoming Feb 20, 6:00 PM Men's · Abilene Christian vs West Georgia | ",
 "Upcoming Feb 24, 7:45 PM Men's · Abilene Christian at Tarleton State | ",
 "Upcoming Mar 3, 7:00 PM Men's · Abilene Christian vs Eastern Kentucky | ",
 "Upcoming Mar 6, 7:00 PM Men's · Abilene Christian at Little Rock | ",
 "Upcoming Mar 10 Men's · Abilene Christian at 2026-27 UAC Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Abilene Christian vs Howard Payne | ",
 "Upcoming Nov 6, 6:00 PM Women's · Abilene Christian at Houston Christian | ",
 "Upcoming Nov 11, 6:30 PM Women's · Abilene Christian at UT Rio Grande Valley | ",
 "Upcoming Nov 15, 2:00 PM Women's · Abilene Christian at TCU | ",
 "Upcoming Nov 18, 5:30 PM Women's · Abilene Christian vs Northwestern | ",
 "Upcoming Nov 22, 1:00 PM Women's · Abilene Christian at Samford | ",
 "Upcoming Nov 27, 10:00 AM Women's · Abilene Christian vs North Carolina A&T | ",
 "Upcoming Nov 28, 10:00 AM Women's · Abilene Christian vs South Dakota | ",
 "Upcoming Dec 1, 11:00 AM Women's · Abilene Christian vs McMurry | ",
 "Upcoming Dec 14, 6:00 PM Women's · Abilene Christian vs Stetson | ",
 "Upcoming Dec 16, 6:00 PM Women's · Abilene Christian vs Southwest | ",
 "Upcoming Dec 21, 12:00 PM Women's · Abilene Christian vs Florida Gulf Coast | ",
 "Upcoming Dec 28, 1:00 PM Women's · Abilene Christian vs Nelson | ",
 "Upcoming Dec 31, 1:00 PM Women's · Abilene Christian at North Florida | ",
 "Upcoming Jan 2, 1:00 PM Women's · Abilene Christian at Jacksonville | ",
 "Upcoming Jan 6, 6:30 PM Women's · Abilene Christian at UT Arlington | ",
 "Upcoming Jan 9, 1:00 PM Women's · Abilene Christian vs Central Arkansas | ",
 "Upcoming Jan 13, 6:00 PM Women's · Abilene Christian at Austin Peay | ",
 "Upcoming Jan 16, 12:00 PM Women's · Abilene Christian at Eastern Kentucky | ",
 "Upcoming Jan 20, 6:00 PM Women's · Abilene Christian vs Little Rock | ",
 "Upcoming Jan 23, 1:00 PM Women's · Abilene Christian vs North Alabama | ",
 "Upcoming Jan 30, 1:00 PM Women's · Abilene Christian vs Tarleton State | ",
 "Upcoming Feb 3, 6:00 PM Women's · Abilene Christian at West Georgia | ",
 "Upcoming Feb 6, 3:30 PM Women's · Abilene Christian at North Alabama | ",
 "Upcoming Feb 10, 6:00 PM Women's · Abilene Christian vs UT Arlington | ",
 "Upcoming Feb 13, 2:00 PM Women's · Abilene Christian at Tarleton State | ",
 "Upcoming Feb 17, 5:30 PM Women's · Abilene Christian vs West Georgia | ",
 "Upcoming Feb 20, 1:00 PM Women's · Abilene Christian vs Eastern Kentucky | ",
 "Upcoming Feb 24, 6:30 PM Women's · Abilene Christian at Central Arkansas | ",
 "Upcoming Feb 27, 1:00 PM Women's · Abilene Christian vs Austin Peay | ",
 "Upcoming Mar 3, 5:00 PM Women's · Abilene Christian at Little Rock | ",
 "Upcoming Mar 10 Women's · Abilene Christian at UAC Women's Basketball Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Abilene Christian at Naimadu Classic | Women's team: 1st / Men's team: 2nd",
 "Final Sep 11 Abilene Christian at Gerald Richey UTA Invitational | Women's team: 4th / Men's team: T2nd",
 "Final Sep 26 Abilene Christian at Cowboy Jamboree | Women's team: 16th / Men's team: 15th",
 "Final Oct 16 Abilene Christian at Arturo Barrios Invitational | Women's team: 44th / Men's team: 28th",
 "Upcoming Oct 30 Abilene Christian at UAC Cross Country Championships | ",
 "Upcoming Nov 13 Abilene Christian at NCAA South Central Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Abilene Christian at Lamar | L, 14-21",
 "Final Sep 5 Abilene Christian at Texas Tech | L, 10-33",
 "Final Sep 12 Abilene Christian vs Stephen F. Austin | L, 7-26",
 "Final Sep 19 Abilene Christian at Idaho | W, 41-39",
 "Final Sep 26 Abilene Christian vs Mercer | L, 17-34",
 "Final Oct 3 Abilene Christian vs West Florida | W, 35-7",
 "Final Oct 10 Abilene Christian vs Central Arkansas | W, 20-14",
 "Final Oct 17 Abilene Christian at North Alabama | W, 31-28",
 "Upcoming Oct 31, 3:00 PM Abilene Christian vs West Georgia | ",
 "Upcoming Nov 7, 6:00 PM Abilene Christian at Tarleton State | ",
 "Upcoming Nov 14, 1:00 PM Abilene Christian at Austin Peay | ",
 "Upcoming Nov 21, 1:00 PM Abilene Christian vs Eastern Kentucky | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Abilene Christian at Boilermaker Classic | T15th",
 "Final Sep 22 Women's · Abilene Christian at Red Raider Invitational | 4th",
 "Final Oct 4 Women's · Abilene Christian at Mercedes-Benz Intercollegiate | 7th",
 "Final Oct 19 Women's · Abilene Christian at Abilene Christian Intercollegiate | 9th",
 "Upcoming Jan 31 Women's · Abilene Christian at Golf Reservations Center Dominican Republic Classic | ",
 "Upcoming Feb 14 Women's · Abilene Christian at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Abilene Christian at West Texas Classic | ",
 "Upcoming Mar 25 Women's · Abilene Christian at PING ASU Invitational | ",
 "Upcoming Apr 5 Women's · Abilene Christian at \"Mo\" Morial Invitational | ",
 "Upcoming Apr 23 Women's · Abilene Christian at UAC Championship | ",
 "Upcoming May 10 Women's · Abilene Christian at NCAA Regionals | ",
 "Upcoming May 21 Women's · Abilene Christian at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Abilene Christian at Canadian Collegiate Invitational | T11th",
 "Final Sep 21 Men's · Abilene Christian at Bayou City Collegiate Classic | 5th",
 "Final Oct 4 Men's · Abilene Christian at Trinity Forest Invitational | 11th",
 "Final Oct 19 Men's · Abilene Christian at Abilene Christian Intercollegiate | 9th",
 "Upcoming Feb 1 Men's · Abilene Christian at National Invitational Tournament | ",
 "Upcoming Feb 21 Men's · Abilene Christian at Military City Collegiate | ",
 "Upcoming Mar 5 Men's · Abilene Christian at Bandon Dunes Championship | ",
 "Upcoming Mar 15 Men's · Abilene Christian at All-American Intercollegiate | ",
 "Upcoming Apr 10 Men's · Abilene Christian at Aggie Invitational | ",
 "Upcoming Apr 30 Men's · Abilene Christian at UAC Championship | ",
 "Upcoming May 17 Men's · Abilene Christian at NCAA Regionals | ",
 "Upcoming May 28 Men's · Abilene Christian at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 15 Abilene Christian vs Jackson State | W, 3-1",
 "Final Aug 20 Abilene Christian vs New Mexico State | L, 0-1",
 "Final Aug 23 Abilene Christian vs UTEP | T, 0-0",
 "Final Aug 27 Abilene Christian vs Houston | T, 0-0",
 "Final Aug 30 Abilene Christian vs East Texas A&M | W, 3-0",
 "Final Sep 3 Abilene Christian at Tulsa | L, 0-2",
 "Final Sep 13 Abilene Christian at Incarnate Word | T, 0-0",
 "Final Sep 20 Abilene Christian vs Texas Southern | W, 5-0",
 "Final Sep 24 Abilene Christian at Little Rock | T, 1-1",
 "Final Sep 27 Abilene Christian at Tarleton State | W, 3-2",
 "Final Oct 4 Abilene Christian vs Central Arkansas | T, 1-1",
 "Final Oct 8 Abilene Christian at North Alabama | W, 1-0",
 "Final Oct 11 Abilene Christian at Austin Peay | W, 2-1",
 "Final Oct 16 Abilene Christian vs West Georgia | W, 4-0",
 "Final Oct 18 Abilene Christian vs Eastern Kentucky | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Abilene Christian at Central Arkansas | ",
 "Upcoming Oct 29, 7:00 PM Abilene Christian vs Tarleton State | ",
 "Upcoming Nov 1, 1:00 PM Abilene Christian vs Little Rock | ",
 "Upcoming Nov 8 Abilene Christian at UAC Women's Soccer Championship | ",
 "Upcoming Nov 20 Abilene Christian at NCAA Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 3:00 PM Abilene Christian vs Weatherford College (Exhibition) | ",
 "Upcoming Oct 28, 4:00 PM Abilene Christian vs Temple College (Exhibition) | ",
 "Upcoming Oct 30, 1:00 PM Abilene Christian vs Cisco College (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Abilene Christian at ACU Invite | Completed",
 "Final Oct 8 Women's · Abilene Christian at ITA Texas Regional | Completed",
 "Today Oct 23 Women's · Abilene Christian at United Athletic Conference Fall Invitational | ",
 "Upcoming Oct 31 Women's · Abilene Christian at Louisiana Tech Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Abilene Christian at Islander Open | Completed",
 "Final Oct 2 Men's · Abilene Christian at U.S. College Cup Invitational | Completed",
 "Final Oct 8 Men's · Abilene Christian at ITA Texas Regionals | Completed",
 "Final Oct 16 Men's · Abilene Christian at Rice Invitational | Completed",
 "Today Oct 22 Men's · Abilene Christian at ASUN Men's Tennis Individual Tournament | ",
 "Today Oct 23 Men's · Abilene Christian at Baylor Invitational | ",
 "Upcoming Oct 30 Men's · Abilene Christian at SMU Invitational | ",
 "Upcoming Nov 5 Men's · Abilene Christian at ITA Master/Sectionals | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 4 Abilene Christian at Evelyn LeTourneau Invitational | ",
 "Upcoming Jan 15 Abilene Christian at Corky Classic | ",
 "Upcoming Jan 22 Abilene Christian at Stan Scott Invite | ",
 "Upcoming Feb 5 Abilene Christian at Charlie Thomas Invitational | ",
 "Upcoming Feb 13 Abilene Christian at Jarvis Scott Invitational | ",
 "Upcoming Feb 27 Abilene Christian at UAC Indoor Championships | ",
 "Upcoming Mar 12 Abilene Christian at NCAA Indoor Championships | ",
 "Upcoming Mar 19 Abilene Christian at Wes Kittley Invitational | ",
 "Upcoming Mar 26 Abilene Christian at Miner Invitational | ",
 "Upcoming Mar 31 Abilene Christian at Texas Relays | ",
 "Upcoming Apr 10 Abilene Christian at War Hawk Classic | ",
 "Upcoming Apr 16 Abilene Christian at Michael Johnson Invitational | ",
 "Upcoming Apr 23 Abilene Christian at David Noble Relays | ",
 "Upcoming May 13 Abilene Christian at UAC Outdoor Championships | ",
 "Upcoming May 26 Abilene Christian at NCAA Outdoor Preliminary | ",
 "Upcoming Jun 9 Abilene Christian at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Abilene Christian vs Lamar | W, 3-1",
 "Final Aug 29 Abilene Christian vs Cal State Bakersfield | L, 1-3",
 "Final Aug 29 Abilene Christian vs North Texas | L, 1-3",
 "Final Sep 3 Abilene Christian at Houston | L, 2-3",
 "Final Sep 4 Abilene Christian vs Houston Christian | W, 3-1",
 "Final Sep 4 Abilene Christian at Texas Southern | W, 3-1",
 "Final Sep 11 Abilene Christian at Oral Roberts | W, 3-1",
 "Final Sep 12 Abilene Christian at Oral Roberts | W, 3-0",
 "Final Sep 13 Abilene Christian at Oklahoma | L, 0-3",
 "Final Sep 17 Abilene Christian vs Louisiana Tech | W, 3-0",
 "Final Sep 18 Abilene Christian vs Prairie View A&M | W, 3-1",
 "Final Sep 19 Abilene Christian vs Stephen F. Austin | W, 3-1",
 "Final Sep 24 Abilene Christian at North Alabama | L, 2-3",
 "Final Sep 26 Abilene Christian at West Georgia | W, 3-0",
 "Final Oct 1 Abilene Christian vs Austin Peay | W, 3-0",
 "Final Oct 3 Abilene Christian vs Little Rock | W, 3-1",
 "Final Oct 8 Abilene Christian vs UT Arlington | W, 3-1",
 "Final Oct 10 Abilene Christian at Tarleton State | L, 0-3",
 "Final Oct 15 Abilene Christian at Austin Peay | W, 3-0",
 "Final Oct 17 Abilene Christian at Eastern Kentucky | L, 0-3",
 "Final Oct 22 Abilene Christian vs North Alabama | W, 3-1",
 "Upcoming Oct 24, 1:00 PM Abilene Christian vs West Georgia | ",
 "Upcoming Oct 29, 6:00 PM Abilene Christian at Central Arkansas | ",
 "Upcoming Oct 31, 1:00 PM Abilene Christian at Little Rock | ",
 "Upcoming Nov 5, 6:00 PM Abilene Christian vs Tarleton State | ",
 "Upcoming Nov 7, 11:30 AM Abilene Christian at UT Arlington | ",
 "Upcoming Nov 12, 6:00 PM Abilene Christian vs Central Arkansas | ",
 "Upcoming Nov 14, 12:00 PM Abilene Christian vs Eastern Kentucky | ",
 "Upcoming Nov 19 Abilene Christian at UAC Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Abilene Christian module checks passed");
