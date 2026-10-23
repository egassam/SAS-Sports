import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {centralArkansasSchool} from '../src/schools/central-arkansas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='central-arkansas');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,centralArkansasHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/central-arkansas-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ucasports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['central-arkansas'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',centralArkansasSchool.scheduleUrls],['roster',centralArkansasSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('central-arkansas|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ucasports.com',`${key} must stay on ucasports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ucasports.com/sports/baseball/schedule"],"roster":["https://ucasports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ucasports.com/sports/mens-basketball/schedule","https://ucasports.com/sports/womens-basketball/schedule"],"roster":["https://ucasports.com/sports/mens-basketball/roster","https://ucasports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://ucasports.com/sports/beach-volleyball/schedule"],"roster":["https://ucasports.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://ucasports.com/sports/womens-cross-country/schedule","https://ucasports.com/sports/cross-country/schedule"],"roster":["https://ucasports.com/sports/womens-cross-country/roster","https://ucasports.com/sports/cross-country/roster"],"combined":true},"Football":{"schedule":["https://ucasports.com/sports/football/schedule"],"roster":["https://ucasports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ucasports.com/sports/womens-golf/schedule","https://ucasports.com/sports/mens-golf/schedule"],"roster":["https://ucasports.com/sports/womens-golf/roster","https://ucasports.com/sports/mens-golf/roster"],"combined":true},"STUNT":{"schedule":["https://ucasports.com/sports/stunt/schedule"],"roster":["https://ucasports.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://ucasports.com/sports/womens-soccer/schedule","https://ucasports.com/sports/mens-soccer/schedule"],"roster":["https://ucasports.com/sports/womens-soccer/roster","https://ucasports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ucasports.com/sports/softball/schedule"],"roster":["https://ucasports.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://ucasports.com/sports/womens-track-and-field/schedule","https://ucasports.com/sports/mens-track-and-field/schedule"],"roster":["https://ucasports.com/sports/womens-track-and-field/roster","https://ucasports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://ucasports.com/sports/womens-volleyball/schedule"],"roster":["https://ucasports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'central-arkansas|"+sport+"':"),`${sport} routes must live in the Central Arkansas module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://ucasports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.centralArkansasHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=central-arkansas)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · Central Arkansas vs Oral Roberts | ",
 "Upcoming Nov 6 Men's · Central Arkansas at Ole Miss | ",
 "Upcoming Nov 10, 6:30 PM Men's · Central Arkansas vs Ecclesia | ",
 "Upcoming Nov 13 Men's · Central Arkansas at Arkansas | ",
 "Upcoming Nov 16 Men's · Central Arkansas at Oklahoma State | ",
 "Upcoming Nov 21, 3:00 PM Men's · Central Arkansas at Jacksonville | ",
 "Upcoming Nov 23, 6:00 PM Men's · Central Arkansas at North Florida | ",
 "Upcoming Nov 28, 1:00 PM Men's · Central Arkansas vs Southwestern Christian | ",
 "Upcoming Dec 2 Men's · Central Arkansas at Houston | ",
 "Upcoming Dec 5, 1:00 PM Men's · Central Arkansas vs Kansas Christian College | ",
 "Upcoming Dec 12 Men's · Central Arkansas at Colorado | ",
 "Upcoming Dec 15, 6:30 PM Men's · Central Arkansas vs East Texas A&M | ",
 "Upcoming Dec 17, 6:30 PM Men's · Central Arkansas vs Champion Christian College | ",
 "Upcoming Dec 19 Men's · Central Arkansas at Oral Roberts | ",
 "Upcoming Dec 28, 6:30 PM Men's · Central Arkansas vs Stetson | ",
 "Upcoming Dec 31, 1:00 PM Men's · Central Arkansas vs Florida Gulf Coast | ",
 "Upcoming Jan 6 Men's · Central Arkansas at Tarleton State | ",
 "Upcoming Jan 9 Men's · Central Arkansas at UT Arlington | ",
 "Upcoming Jan 13, 7:30 PM Men's · Central Arkansas vs Abilene Christian | ",
 "Upcoming Jan 16, 1:00 PM Men's · Central Arkansas vs West Georgia | ",
 "Upcoming Jan 20 Men's · Central Arkansas at Austin Peay State | ",
 "Upcoming Jan 23, 1:00 PM Men's · Central Arkansas vs Eastern Kentucky | ",
 "Upcoming Jan 27, 7:30 PM Men's · Central Arkansas vs North Alabama | ",
 "Upcoming Feb 3 Men's · Central Arkansas at Abilene Christian | ",
 "Upcoming Feb 6 Men's · Central Arkansas at Little Rock | ",
 "Upcoming Feb 10 Men's · Central Arkansas at Eastern Kentucky | ",
 "Upcoming Feb 17, 7:30 PM Men's · Central Arkansas vs Tarleton State | ",
 "Upcoming Feb 20, 1:00 PM Men's · Central Arkansas vs Little Rock | ",
 "Upcoming Feb 24 Men's · Central Arkansas at North Alabama | ",
 "Upcoming Feb 27 Men's · Central Arkansas at West Georgia | ",
 "Upcoming Mar 3, 6:30 PM Men's · Central Arkansas vs UT Arlington | ",
 "Upcoming Mar 6, 3:30 PM Men's · Central Arkansas vs Austin Peay State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Central Arkansas vs Hendrix | ",
 "Upcoming Nov 5 Women's · Central Arkansas at Baylor | ",
 "Upcoming Nov 9 Women's · Central Arkansas at ULM | ",
 "Upcoming Nov 14, 1:00 PM Women's · Central Arkansas vs North Florida | ",
 "Upcoming Nov 20, 11:00 AM Women's · Central Arkansas vs Grambling State | ",
 "Upcoming Nov 23, 6:30 PM Women's · Central Arkansas vs Ozarks | ",
 "Upcoming Nov 29 Women's · Central Arkansas at Arkansas State | ",
 "Upcoming Dec 1 Women's · Central Arkansas at Kansas State | ",
 "Upcoming Dec 6 Women's · Central Arkansas at Missouri State | ",
 "Upcoming Dec 15 Women's · Central Arkansas at Arkansas | ",
 "Upcoming Dec 21, 1:00 PM Women's · Central Arkansas vs Southeast Missouri State | ",
 "Upcoming Dec 29 Women's · Central Arkansas at Stetson | ",
 "Upcoming Dec 31 Women's · Central Arkansas at Florida Gulf Coast | ",
 "Upcoming Jan 6, 6:30 PM Women's · Central Arkansas vs West Georgia | ",
 "Upcoming Jan 9 Women's · Central Arkansas at Abilene Christian | ",
 "Upcoming Jan 13, 5:00 PM Women's · Central Arkansas vs UT Arlington | ",
 "Upcoming Jan 20 Women's · Central Arkansas at North Alabama | ",
 "Upcoming Jan 23 Women's · Central Arkansas at West Georgia | ",
 "Upcoming Jan 27, 5:00 PM Women's · Central Arkansas vs Austin Peay | ",
 "Upcoming Jan 30, 1:00 PM Women's · Central Arkansas vs EKU | ",
 "Upcoming Feb 3 Women's · Central Arkansas at Little Rock | ",
 "Upcoming Feb 10 Women's · Central Arkansas at Tarleton State | ",
 "Upcoming Feb 13 Women's · Central Arkansas at UT Arlington | ",
 "Upcoming Feb 17, 5:00 PM Women's · Central Arkansas vs North Alabama | ",
 "Upcoming Feb 20 Women's · Central Arkansas at Austin Peay | ",
 "Upcoming Feb 24, 6:30 PM Women's · Central Arkansas vs Abilene Christian | ",
 "Upcoming Feb 27, 1:00 PM Women's · Central Arkansas vs Little Rock | ",
 "Upcoming Mar 3 Women's · Central Arkansas at EKU | ",
 "Upcoming Mar 6, 1:00 PM Women's · Central Arkansas vs Tarleton State | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Central Arkansas at UCA Bear Invitational | Completed",
 "Final Sep 26 Women's · Central Arkansas at Cowboy Jamboree (Oklahoma State) | Completed",
 "Final Oct 16 Women's · Central Arkansas at Crimson Classic (University of Alabama) | Completed",
 "Upcoming Oct 30, 8:00 AM Women's · Central Arkansas at UAC Conference Championship | ",
 "Upcoming Nov 13, 8:00 AM Women's · Central Arkansas at NCAA South Central Championship | ",
 "Upcoming Nov 21, 8:00 AM Women's · Central Arkansas at NCAA National Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Men's · Central Arkansas at UCA Bear Invitational | Completed",
 "Final Sep 26 Men's · Central Arkansas at Cowboy Jamboree (Oklahoma State) | Completed",
 "Final Oct 16 Men's · Central Arkansas at Crimson Classic (University of Alabama) | Completed",
 "Upcoming Oct 30, 8:00 AM Men's · Central Arkansas at UAC Conference Championship | ",
 "Upcoming Nov 13, 8:00 AM Men's · Central Arkansas at NCAA South Central Championship | ",
 "Upcoming Nov 21, 8:00 AM Men's · Central Arkansas at NCAA National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Central Arkansas at UT Martin | W, 36-24",
 "Final Sep 5 Central Arkansas vs West Florida | L, 14-42",
 "Final Sep 12 Central Arkansas vs Central Oklahoma | W, 59-20",
 "Final Sep 19 Central Arkansas at Southeast Missouri State | L, 9-27",
 "Final Sep 26 Central Arkansas at Florida State | L, 7-34",
 "Final Oct 10 Central Arkansas at Abilene Christian | L, 14-20",
 "Final Oct 17 Central Arkansas at Tarleton State | L, 35-49",
 "Upcoming Oct 24, 4:00 PM Central Arkansas vs The University of Texas Rio Grande Valley | ",
 "Upcoming Oct 31, 4:00 PM Central Arkansas vs North Alabama | ",
 "Upcoming Nov 7, 4:00 PM Central Arkansas vs West Georgia | ",
 "Upcoming Nov 14, 1:00 PM Central Arkansas at Eastern Kentucky | ",
 "Upcoming Nov 21, 4:00 PM Central Arkansas vs Austin Peay State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Central Arkansas at Golfweek Fall Challenge | Completed",
 "Final Sep 28 Women's · Central Arkansas at Powercat Classic | Completed",
 "Final Oct 5 Women's · Central Arkansas at Marilynn Smith Sunflower Invitational | Completed",
 "Final Oct 12 Women's · Central Arkansas at Lady Red Wolves Classic | Completed",
 "Final Oct 18 Women's · Central Arkansas at Diamante Intercollegiate | Completed",
 "Upcoming Feb 1 Women's · Central Arkansas at UCF Challenge | ",
 "Upcoming Feb 26 Women's · Central Arkansas at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 7 Women's · Central Arkansas at Riverbend Intercollegiate | ",
 "Upcoming Mar 29 Women's · Central Arkansas at ULM Invitational | ",
 "Upcoming Apr 5 Women's · Central Arkansas at Huntington Bank Collegiate | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Central Arkansas at Golfweek Fall Challenge | Completed",
 "Final Sep 14 Men's · Central Arkansas at Sandestin Collegiate Classic | Completed",
 "Final Sep 20 Men's · Central Arkansas at GMAC Invitational | Completed",
 "Final Oct 12 Men's · Central Arkansas at Bubba Barnett Intercollegiate | Completed",
 "Upcoming Feb 12 Men's · Central Arkansas at Palmas del Mar Collegiate | ",
 "Upcoming Mar 1 Men's · Central Arkansas at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 15 Men's · Central Arkansas at Arizona Thunderbirds Intercollegiate | ",
 "Upcoming Mar 29 Men's · Central Arkansas at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 5 Men's · Central Arkansas at Tiger Invitational | ",
 "Upcoming Apr 12 Men's · Central Arkansas at Everett Buick GMC Classic | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Central Arkansas vs Oral Roberts | L, 1-4",
 "Final Aug 16 Women's · Central Arkansas at Tulsa | L, 1-2",
 "Final Aug 23 Women's · Central Arkansas at Arkansas State | T, 2-2",
 "Final Aug 27 Women's · Central Arkansas vs Alabama State | W, 7-0",
 "Final Aug 30 Women's · Central Arkansas at Missouri State | L, 0-3",
 "Final Sep 6 Women's · Central Arkansas vs UT Martin | W, 1-0",
 "Final Sep 10 Women's · Central Arkansas vs Nevada | W, 1-0",
 "Final Sep 13 Women's · Central Arkansas at Oklahoma State | L, 0-5",
 "Final Sep 20 Women's · Central Arkansas at SEMO | T, 1-1",
 "Final Sep 24 Women's · Central Arkansas vs Tarleton State | L, 1-2",
 "Final Sep 27 Women's · Central Arkansas vs Little Rock | W, 3-0",
 "Final Oct 4 Women's · Central Arkansas at Abilene Christian | T, 1-1",
 "Final Oct 8 Women's · Central Arkansas at EKU | L, 0-1",
 "Final Oct 11 Women's · Central Arkansas at West Georgia | W, 3-1",
 "Final Oct 15 Women's · Central Arkansas vs Austin Peay | W, 2-0",
 "Final Oct 18 Women's · Central Arkansas vs North Alabama | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Women's · Central Arkansas vs Abilene Christian | ",
 "Upcoming Oct 29, 6:00 PM Women's · Central Arkansas at Little Rock | ",
 "Upcoming Nov 1, 1:00 PM Women's · Central Arkansas at Tarleton State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Central Arkansas at Drake | T, 1-1",
 "Final Aug 24 Men's · Central Arkansas at Utah Valley | L, 0-1",
 "Final Aug 28 Men's · Central Arkansas vs Belmont | W, 2-0",
 "Final Sep 4 Men's · Central Arkansas vs Oral Roberts | W, 2-1",
 "Final Sep 7 Men's · Central Arkansas vs Central Baptist | W, 3-0",
 "Final Sep 11 Men's · Central Arkansas vs Lipscomb | W, 1-0",
 "Final Sep 15 Men's · Central Arkansas at UAB | L, 1-2",
 "Final Sep 19 Men's · Central Arkansas at Bellarmine | W, 2-1",
 "Final Sep 26 Men's · Central Arkansas vs Jacksonville | T, 1-1",
 "Final Sep 29 Men's · Central Arkansas at Missouri State | L, 0-2",
 "Final Oct 3 Men's · Central Arkansas at North Florida | L, 1-2",
 "Final Oct 17 Men's · Central Arkansas vs Florida Gulf Coast | W, 6-0",
 "Final Oct 20 Men's · Central Arkansas at SMU | L, 2-5",
 "Upcoming Oct 25, 7:00 PM Men's · Central Arkansas vs Queens | ",
 "Upcoming Oct 28, 7:00 PM Men's · Central Arkansas at West Florida | ",
 "Upcoming Oct 31, 6:00 PM Men's · Central Arkansas at Stetson | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 3:00 PM Central Arkansas vs National Park College | ",
 "Upcoming Oct 30, 6:30 PM Central Arkansas vs Harding | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Central Arkansas vs Denver | L, 1-3",
 "Final Aug 29 Central Arkansas at Colorado | L, 0-3",
 "Final Aug 30 Central Arkansas vs CSUN | L, 1-3",
 "Final Sep 5 Central Arkansas vs Southern Miss | L, 0-3",
 "Final Sep 6 Central Arkansas at Ole Miss | L, 0-3",
 "Final Sep 11 Central Arkansas at Hawaii | L, 0-3",
 "Final Sep 12 Central Arkansas at Hawaii | L, 0-3",
 "Final Sep 18 Central Arkansas vs Texas Tech | L, 1-3",
 "Final Sep 19 Central Arkansas vs West Florida | L, 1-3",
 "Final Sep 20 Central Arkansas at Iowa | L, 0-3",
 "Final Sep 24 Central Arkansas vs Eastern Kentucky | L, 1-3",
 "Final Sep 26 Central Arkansas vs Austin Peay | W, 3-2",
 "Final Oct 1 Central Arkansas at West Georgia | W, 3-1",
 "Final Oct 3 Central Arkansas at North Alabama | L, 1-3",
 "Final Oct 8 Central Arkansas at Tarleton State | W, 3-2",
 "Final Oct 10 Central Arkansas vs West Georgia | W, 3-0",
 "Final Oct 13 Central Arkansas vs Little Rock | W, 3-2",
 "Final Oct 17 Central Arkansas vs Tarleton State | W, 3-2",
 "Final Oct 21 Central Arkansas at Austin Peay | W, 3-1",
 "Today Oct 23, 5:00 PM Central Arkansas at Eastern Kentucky | ",
 "Upcoming Oct 27, 6:00 PM Central Arkansas at Little Rock | ",
 "Upcoming Oct 29, 6:00 PM Central Arkansas vs Abilene Christian | ",
 "Upcoming Nov 5, 6:00 PM Central Arkansas vs UT Arlington | ",
 "Upcoming Nov 6, 6:00 PM Central Arkansas vs North Alabama | ",
 "Upcoming Nov 12, 6:00 PM Central Arkansas at Abilene Christian | ",
 "Upcoming Nov 14, 11:30 AM Central Arkansas at UT Arlington | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Central Arkansas module checks passed");
