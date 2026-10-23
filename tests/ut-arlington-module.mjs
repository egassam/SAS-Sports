import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utArlingtonSchool} from '../src/schools/ut-arlington.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ut-arlington');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utArlingtonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ut-arlington-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utamavs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ut-arlington'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',utArlingtonSchool.scheduleUrls],['roster',utArlingtonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ut-arlington|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utamavs.com',`${key} must stay on utamavs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://utamavs.com/sports/baseball/schedule"],"roster":["https://utamavs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://utamavs.com/sports/mens-basketball/schedule","https://utamavs.com/sports/womens-basketball/schedule"],"roster":["https://utamavs.com/sports/mens-basketball/roster","https://utamavs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utamavs.com/sports/cross-country/schedule"],"roster":["https://utamavs.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://utamavs.com/sports/womens-golf/schedule","https://utamavs.com/sports/mens-golf/schedule"],"roster":["https://utamavs.com/sports/womens-golf/roster","https://utamavs.com/sports/mens-golf/roster"],"combined":true},"Softball":{"schedule":["https://utamavs.com/sports/softball/schedule"],"roster":["https://utamavs.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://utamavs.com/sports/womens-tennis/schedule","https://utamavs.com/sports/mens-tennis/schedule"],"roster":["https://utamavs.com/sports/womens-tennis/roster","https://utamavs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://utamavs.com/sports/track-and-field/schedule"],"roster":["https://utamavs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://utamavs.com/sports/womens-volleyball/schedule"],"roster":["https://utamavs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ut-arlington|"+sport+"':"),`${sport} routes must live in the UT Arlington module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://utamavs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utArlingtonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ut-arlington)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UT Arlington vs UNT Dallas | ",
 "Upcoming Nov 6, 9:30 PM Men's · UT Arlington vs Portland | ",
 "Upcoming Nov 8, 10:00 PM Men's · UT Arlington at Hawai'i | ",
 "Upcoming Nov 9, 9:30 PM Men's · UT Arlington vs Bethesda | ",
 "Upcoming Nov 14, 6:00 PM Men's · UT Arlington vs UTRGV | ",
 "Upcoming Nov 17, 7:00 PM Men's · UT Arlington at Southern Miss. | ",
 "Upcoming Nov 20, 6:30 PM Men's · UT Arlington at Northwestern State | ",
 "Upcoming Nov 24, 7:00 PM Men's · UT Arlington vs Oral Roberts | ",
 "Upcoming Dec 1, 8:00 PM Men's · UT Arlington at Colorado State | ",
 "Upcoming Dec 9, 6:30 PM Men's · UT Arlington at Stephen F. Austin | ",
 "Upcoming Dec 13, 4:00 PM Men's · UT Arlington at Arkansas | ",
 "Upcoming Dec 15, 11:00 AM Men's · UT Arlington vs LeTourneau | ",
 "Upcoming Dec 19, 5:00 PM Men's · UT Arlington vs North Florida | ",
 "Upcoming Dec 21, 12:00 PM Men's · UT Arlington vs Arlington Baptist | ",
 "Upcoming Dec 31, 2:00 PM Men's · UT Arlington vs Jacksonville | ",
 "Upcoming Jan 2, 1:00 PM Men's · UT Arlington at Stetson | ",
 "Upcoming Jan 5, 6:00 PM Men's · UT Arlington at FGCU | ",
 "Upcoming Jan 9, 2:00 PM Men's · UT Arlington vs Central Arkansas | ",
 "Upcoming Jan 13, 7:00 PM Men's · UT Arlington vs Austin Peay | ",
 "Upcoming Jan 16, 2:00 PM Men's · UT Arlington at Abilene Christian | ",
 "Upcoming Jan 20, 6:00 PM Men's · UT Arlington at West Georgia | ",
 "Upcoming Jan 23, 5:00 PM Men's · UT Arlington at North Alabama | ",
 "Upcoming Jan 27, 7:00 PM Men's · UT Arlington vs Little Rock | ",
 "Upcoming Jan 30, 5:00 PM Men's · UT Arlington vs Abilene Christian | ",
 "Upcoming Feb 3, 7:00 PM Men's · UT Arlington at Eastern Kentucky | ",
 "Upcoming Feb 6, 4:30 PM Men's · UT Arlington at Austin Peay | ",
 "Upcoming Feb 13, 5:00 PM Men's · UT Arlington vs Tarleton State | ",
 "Upcoming Feb 17, 8:00 PM Men's · UT Arlington vs West Georgia | ",
 "Upcoming Feb 20, 2:00 PM Men's · UT Arlington vs North Alabama | ",
 "Upcoming Feb 24, 7:00 PM Men's · UT Arlington at Little Rock | ",
 "Upcoming Feb 27, 4:00 PM Men's · UT Arlington at Tarleton State | ",
 "Upcoming Mar 3, 6:30 PM Men's · UT Arlington at Central Arkansas | ",
 "Upcoming Mar 6, 7:00 PM Men's · UT Arlington vs Eastern Kentucky | ",
 "Upcoming Mar 10 Men's · UT Arlington at UAC Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · UT Arlington vs Sacramento State | ",
 "Upcoming Nov 5, 6:30 PM Women's · UT Arlington vs Lamar | ",
 "Upcoming Nov 10, 7:30 PM Women's · UT Arlington at Wyoming | ",
 "Upcoming Nov 14, 3:00 PM Women's · UT Arlington vs LSU-Shreveport | ",
 "Upcoming Nov 18, 6:30 PM Women's · UT Arlington at TCU | ",
 "Upcoming Nov 22, 2:00 PM Women's · UT Arlington at Tennessee State | ",
 "Upcoming Nov 27, 12:00 PM Women's · UT Arlington vs West Florida | ",
 "Upcoming Nov 28, 2:30 PM Women's · UT Arlington vs Fresno State | ",
 "Upcoming Dec 12, 2:00 PM Women's · UT Arlington vs Stetson | ",
 "Upcoming Dec 16, 6:30 PM Women's · UT Arlington at Missouri State | ",
 "Upcoming Dec 19, 2:00 PM Women's · UT Arlington vs FGCU | ",
 "Upcoming Dec 28, 6:00 PM Women's · UT Arlington at West Florida | ",
 "Upcoming Jan 2, 1:00 PM Women's · UT Arlington at North Florida | ",
 "Upcoming Jan 6, 6:30 PM Women's · UT Arlington vs Abilene Christian | ",
 "Upcoming Jan 13, 5:00 PM Women's · UT Arlington at Central Arkansas | ",
 "Upcoming Jan 16, 1:00 PM Women's · UT Arlington at Little Rock | ",
 "Upcoming Jan 20, 7:00 PM Women's · UT Arlington at Tarleton State | ",
 "Upcoming Jan 23, 2:00 PM Women's · UT Arlington vs Austin Peay | ",
 "Upcoming Jan 27, 4:00 PM Women's · UT Arlington vs West Georgia | ",
 "Upcoming Jan 30, 1:00 PM Women's · UT Arlington vs North Alabama | ",
 "Upcoming Feb 3, 5:00 PM Women's · UT Arlington at Eastern Kentucky | ",
 "Upcoming Feb 6, 2:00 PM Women's · UT Arlington at Austin Peay | ",
 "Upcoming Feb 10, 6:00 PM Women's · UT Arlington at Abilene Christian | ",
 "Upcoming Feb 13, 2:00 PM Women's · UT Arlington vs Central Arkansas | ",
 "Upcoming Feb 17, 5:00 PM Women's · UT Arlington vs Eastern Kentucky | ",
 "Upcoming Feb 24, 6:00 PM Women's · UT Arlington at West Georgia | ",
 "Upcoming Feb 27, 5:00 PM Women's · UT Arlington at North Alabama | ",
 "Upcoming Mar 3, 6:30 PM Women's · UT Arlington vs Tarleton State | ",
 "Upcoming Mar 6, 2:00 PM Women's · UT Arlington vs Little Rock | ",
 "Upcoming Mar 10 Women's · UT Arlington at UAC Women's Basketball Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 UT Arlington at Gerald Richey UTA Invitational | Women's team: 2nd / Men's team: 1st",
 "Final Oct 3 UT Arlington at 38th Annual Chile Pepper Festival | Women's team: 4th / Men's team: 7th",
 "Final Oct 16 UT Arlington at Arturo Barrios Invitational | Women's team: 15th / Men's team: 22nd",
 "Upcoming Oct 30 UT Arlington at UAC Championships | ",
 "Upcoming Nov 13 UT Arlington at NCAA South Central Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UT Arlington at 2026 Lady Clerico | 6th of 8",
 "Final Sep 22 Women's · UT Arlington at Red Raider Invitational | 10th of 12",
 "Final Oct 12 Women's · UT Arlington at Golf Iconic Classic | 18th of 19",
 "Final Oct 18 Women's · UT Arlington at Diamante Invitational | 19th of 20",
 "Upcoming Feb 1 Women's · UT Arlington at Battle at Bentwater | ",
 "Upcoming Feb 8 Women's · UT Arlington at Golf Club of Houston - Member Invitational | ",
 "Upcoming Mar 1 Women's · UT Arlington at West Texas Classic | ",
 "Upcoming Mar 8 Women's · UT Arlington at Riverbend Intercollegiate | ",
 "Upcoming Mar 20 Women's · UT Arlington at More than Golf Invitational | ",
 "Upcoming Mar 29 Women's · UT Arlington at ULM Invitational | ",
 "Upcoming Apr 23 Women's · UT Arlington at United Athletic Conference Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · UT Arlington at Sandestin Collegiate Classic | T10th of 14",
 "Final Sep 21 Men's · UT Arlington at Bayou City Collegiate Classic | 3rd of 13",
 "Final Oct 12 Men's · UT Arlington at Tall City Collegiate | 6th of 12",
 "Upcoming Nov 4 Men's · UT Arlington at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 21 Men's · UT Arlington at Military City Collegiate | ",
 "Upcoming Mar 8 Men's · UT Arlington at R.E Lamkin Invitational | ",
 "Upcoming Mar 12 Men's · UT Arlington at Seminole Intercollegiate | ",
 "Upcoming Mar 22 Men's · UT Arlington at The Duck Invitational | ",
 "Upcoming Mar 29 Men's · UT Arlington at Wyoming Cowboy Classic | ",
 "Upcoming Apr 12 Men's · UT Arlington at Everett Buick GMC Classic | ",
 "Upcoming Apr 19 Men's · UT Arlington at Chambers Bay Invitational | ",
 "Upcoming Apr 30 Men's · UT Arlington at UAC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · UT Arlington at ACU Invite | Completed",
 "Final Oct 8 Women's · UT Arlington at ITA Texas Regional Championships | Completed",
 "Final Oct 12 Women's · UT Arlington at ITA Texas Regionals | Completed",
 "Today Oct 22 Women's · UT Arlington at Battle for the Boot JAE Foundation Open | ",
 "Today Oct 23 Women's · UT Arlington at UAC Fall Invite | ",
 "Upcoming Nov 6 Women's · UT Arlington at Texas State Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 8 Men's · UT Arlington at ITA Texas Regional | Completed",
 "Final Oct 12 Men's · UT Arlington at ITA Texas Regionals | Completed",
 "Final Oct 16 Men's · UT Arlington at Ralph O'Connor Invitational | Completed",
 "Today Oct 22 Men's · UT Arlington at ASUN Individual Tournament | ",
 "Today Oct 23 Men's · UT Arlington at Baylor Invite | ",
 "Upcoming Oct 30 Men's · UT Arlington at SMU Invite | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UT Arlington vs UTSA | W, 3-1",
 "Final Aug 29 UT Arlington vs SIUE | W, 3-2",
 "Final Aug 29 UT Arlington at Arkansas | L, 0-3",
 "Final Sep 4 UT Arlington vs Kent State | W, 3-2",
 "Final Sep 5 UT Arlington vs Army | L, 0-3",
 "Final Sep 5 UT Arlington vs Sam Houston | L, 2-3",
 "Final Sep 10 UT Arlington vs North Texas | W, 3-1",
 "Final Sep 11 UT Arlington vs Texas State | L, 2-3",
 "Final Sep 12 UT Arlington at Stephen F. Austin | L, 0-3",
 "Final Sep 18 UT Arlington vs Jackson State | W, 3-0",
 "Final Sep 18 UT Arlington at Louisiana Lafayette | W, 3-2",
 "Final Sep 19 UT Arlington vs Mississippi State | L, 0-3",
 "Final Sep 22 UT Arlington at Tarleton State | L, 1-3",
 "Final Sep 24 UT Arlington vs West Georgia | W, 3-2",
 "Final Oct 1 UT Arlington vs Little Rock | L, 0-3",
 "Final Oct 3 UT Arlington vs Eastern Kentucky | L, 0-3",
 "Final Oct 8 UT Arlington at Abilene Christian | L, 1-3",
 "Final Oct 10 UT Arlington at Little Rock | W, 3-1",
 "Final Oct 15 UT Arlington at North Alabama | L, 2-3",
 "Final Oct 17 UT Arlington at West Georgia | W, 3-1",
 "Final Oct 20 UT Arlington vs Tarleton State | W, 3-1",
 "Upcoming Oct 24, 1:00 PM UT Arlington vs North Alabama | ",
 "Upcoming Oct 29, 5:00 PM UT Arlington at Eastern Kentucky | ",
 "Upcoming Oct 31, 11:00 AM UT Arlington at Austin Peay | ",
 "Upcoming Nov 5, 6:00 PM UT Arlington at Central Arkansas | ",
 "Upcoming Nov 7, 11:30 AM UT Arlington vs Abilene Christian | ",
 "Upcoming Nov 12, 6:00 PM UT Arlington vs Austin Peay | ",
 "Upcoming Nov 14, 11:30 AM UT Arlington vs Central Arkansas | ",
 "Upcoming Nov 19 UT Arlington at United Athletic Conference Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UT Arlington module checks passed");
