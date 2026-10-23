import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tarletonStateSchool} from '../src/schools/tarleton-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tarleton-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tarletonStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tarleton-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tarletonsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tarleton-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',tarletonStateSchool.scheduleUrls],['roster',tarletonStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tarleton-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tarletonsports.com',`${key} must stay on tarletonsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://tarletonsports.com/sports/baseball/schedule"],"roster":["https://tarletonsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://tarletonsports.com/sports/mens-basketball/schedule","https://tarletonsports.com/sports/womens-basketball/schedule"],"roster":["https://tarletonsports.com/sports/mens-basketball/roster","https://tarletonsports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://tarletonsports.com/sports/beach-volleyball/schedule"],"roster":["https://tarletonsports.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://tarletonsports.com/sports/cross-country/schedule"],"roster":["https://tarletonsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://tarletonsports.com/sports/football/schedule"],"roster":["https://tarletonsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tarletonsports.com/sports/womens-golf/schedule","https://tarletonsports.com/sports/mens-golf/schedule"],"roster":["https://tarletonsports.com/sports/womens-golf/roster","https://tarletonsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://tarletonsports.com/sports/wsoc/schedule"],"roster":["https://tarletonsports.com/sports/wsoc/roster"],"combined":false},"Softball":{"schedule":["https://tarletonsports.com/sports/softball/schedule"],"roster":["https://tarletonsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://tarletonsports.com/sports/womens-tennis/schedule"],"roster":["https://tarletonsports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://tarletonsports.com/sports/track-and-field/schedule"],"roster":["https://tarletonsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://tarletonsports.com/sports/womens-volleyball/schedule"],"roster":["https://tarletonsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tarleton-state|"+sport+"':"),`${sport} routes must live in the Tarleton State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://tarletonsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tarletonStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=tarleton-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 4:15 PM Men's · Tarleton State vs Houston Christian (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Tarleton State vs Cameron | ",
 "Upcoming Nov 6, 8:30 PM Men's · Tarleton State at San Diego | ",
 "Upcoming Nov 10, 7:00 PM Men's · Tarleton State vs UT Dallas | ",
 "Upcoming Nov 13, 7:00 PM Men's · Tarleton State vs Alcorn State | ",
 "Upcoming Nov 16 Men's · Tarleton State at Drake | ",
 "Upcoming Nov 19, 10:00 PM Men's · Tarleton State at USC | ",
 "Upcoming Nov 24, 6:00 PM Men's · Tarleton State at Weber State | ",
 "Upcoming Nov 29 Men's · Tarleton State at Texas Southern | ",
 "Upcoming Dec 2, 7:00 PM Men's · Tarleton State vs Randall | ",
 "Upcoming Dec 5, 2:00 PM Men's · Tarleton State at Pittsburgh | ",
 "Upcoming Dec 8, 7:00 PM Men's · Tarleton State vs UNT Dallas | ",
 "Upcoming Dec 12, 4:00 PM Men's · Tarleton State vs Missouri State | ",
 "Upcoming Dec 19, 1:00 PM Men's · Tarleton State at FGCU | ",
 "Upcoming Dec 21, 6:00 PM Men's · Tarleton State at Stetson | ",
 "Upcoming Dec 28, 7:00 PM Men's · Tarleton State vs West Florida | ",
 "Upcoming Jan 2, 4:00 PM Men's · Tarleton State vs North Florida | ",
 "Upcoming Jan 6, 7:00 PM Men's · Tarleton State vs Central Arkansas | ",
 "Upcoming Jan 9, 4:15 PM Men's · Tarleton State vs Little Rock | ",
 "Upcoming Jan 13, 7:00 PM Men's · Tarleton State at Eastern Kentucky | ",
 "Upcoming Jan 16, 4:30 PM Men's · Tarleton State at Austin Peay | ",
 "Upcoming Jan 23, 7:00 PM Men's · Tarleton State at Little Rock | ",
 "Upcoming Jan 27, 7:45 PM Men's · Tarleton State vs West Georgia | ",
 "Upcoming Jan 30, 4:00 PM Men's · Tarleton State vs Austin Peay | ",
 "Upcoming Feb 6, 6:00 PM Men's · Tarleton State at Abilene Christian | ",
 "Upcoming Feb 10, 7:45 PM Men's · Tarleton State vs North Alabama | ",
 "Upcoming Feb 13, 5:00 PM Men's · Tarleton State at UT Arlington | ",
 "Upcoming Feb 17, 7:30 PM Men's · Tarleton State at Central Arkansas | ",
 "Upcoming Feb 20, 4:15 PM Men's · Tarleton State vs Eastern Kentucky | ",
 "Upcoming Feb 24, 7:45 PM Men's · Tarleton State vs Abilene Christian | ",
 "Upcoming Feb 27, 4:00 PM Men's · Tarleton State vs UT Arlington | ",
 "Upcoming Mar 3, 6:45 PM Men's · Tarleton State at West Georgia | ",
 "Upcoming Mar 6, 7:00 PM Men's · Tarleton State at North Alabama | ",
 "Upcoming Mar 10 Men's · Tarleton State at UAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 24, 2:00 PM Women's · Tarleton State vs Cameron (Exhibition) | ",
 "Upcoming Nov 4, 11:00 AM Women's · Tarleton State vs Arkansas - Pine Bluff | ",
 "Upcoming Nov 8, 2:00 PM Women's · Tarleton State at TCU | ",
 "Upcoming Nov 11, 7:00 PM Women's · Tarleton State vs Sul Ross State | ",
 "Upcoming Nov 14 Women's · Tarleton State at Texas | ",
 "Upcoming Nov 19, 6:00 PM Women's · Tarleton State at Louisiana | ",
 "Upcoming Nov 21, 1:00 PM Women's · Tarleton State at Nicholls | ",
 "Upcoming Nov 27, 3:00 PM Women's · Tarleton State vs UT Dallas | ",
 "Upcoming Nov 30, 7:00 PM Women's · Tarleton State vs East Texas A&M | ",
 "Upcoming Dec 5, 2:00 PM Women's · Tarleton State vs Schreiner | ",
 "Upcoming Dec 13, 6:00 PM Women's · Tarleton State at Texas Southern | ",
 "Upcoming Dec 15, 7:00 PM Women's · Tarleton State at Texas A&M | ",
 "Upcoming Dec 18, 12:00 PM Women's · Tarleton State at Dallas Christian | ",
 "Upcoming Dec 29, 6:00 PM Women's · Tarleton State at North Florida | ",
 "Upcoming Dec 31, 1:00 PM Women's · Tarleton State at Jacksonville | ",
 "Upcoming Jan 3, 1:00 PM Women's · Tarleton State vs Stetson | ",
 "Upcoming Jan 5, 7:00 PM Women's · Tarleton State vs Florida Gulf Coast | ",
 "Upcoming Jan 9, 2:00 PM Women's · Tarleton State vs Eastern Kentucky | ",
 "Upcoming Jan 13, 6:00 PM Women's · Tarleton State at West Georgia | ",
 "Upcoming Jan 16, 5:00 PM Women's · Tarleton State at North Alabama | ",
 "Upcoming Jan 20, 7:00 PM Women's · Tarleton State vs UT Arlington | ",
 "Upcoming Jan 23, 2:00 PM Women's · Tarleton State vs Little Rock | ",
 "Upcoming Jan 27, 5:30 PM Women's · Tarleton State vs North Alabama | ",
 "Upcoming Jan 30, 1:00 PM Women's · Tarleton State at Abilene Christian | ",
 "Upcoming Feb 3, 5:00 PM Women's · Tarleton State at Austin Peay | ",
 "Upcoming Feb 6, 12:00 PM Women's · Tarleton State at Eastern Kentucky | ",
 "Upcoming Feb 10, 5:30 PM Women's · Tarleton State vs Central Arkansas | ",
 "Upcoming Feb 13, 2:00 PM Women's · Tarleton State vs Abilene Christian | ",
 "Upcoming Feb 17, 7:00 PM Women's · Tarleton State at Little Rock | ",
 "Upcoming Feb 20, 2:00 PM Women's · Tarleton State vs West Georgia | ",
 "Upcoming Feb 24, 5:30 PM Women's · Tarleton State vs Austin Peay | ",
 "Upcoming Mar 3, 6:30 PM Women's · Tarleton State at UT Arlington | ",
 "Upcoming Mar 6, 1:00 PM Women's · Tarleton State at Central Arkansas | ",
 "Upcoming Mar 10 Women's · Tarleton State at UAC Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Tarleton State at John McKenzie Invitational | Women's team: 4th / Men's team: 3rd",
 "Final Sep 26 Tarleton State at Cowboy Jamboree | Women's team: 15th / Men's team: 16th",
 "Final Oct 16 Tarleton State at Arturo Barrios Invitational | Women's team: T39th / Men's team: 31st",
 "Upcoming Oct 30 Tarleton State at UAC Cross Country Championships | ",
 "Upcoming Nov 13, 9:00 AM Tarleton State at NCAA South Central Regional Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Tarleton State vs Prairie View A&M | W, 49-30",
 "Final Sep 5 Tarleton State at Bowling Green | W, 20-13",
 "Final Sep 12 Tarleton State at McNeese | W, 27-24",
 "Final Sep 19 Tarleton State vs Merrimack | W, 45-20",
 "Final Oct 3 Tarleton State vs Chicago State | W, 56-21",
 "Final Oct 10 Tarleton State at Austin Peay | W, 40-32",
 "Final Oct 17 Tarleton State vs Central Arkansas | W, 49-35",
 "Upcoming Oct 24, 1:00 PM Tarleton State at West Georgia | ",
 "Upcoming Oct 31, 6:00 PM Tarleton State vs Eastern Kentucky | ",
 "Upcoming Nov 7, 6:00 PM Tarleton State vs Abilene Christian | ",
 "Upcoming Nov 14, 2:00 PM Tarleton State at West Florida | ",
 "Upcoming Nov 21, 3:00 PM Tarleton State at North Alabama | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Tarleton State at Tulane Classic | 7th",
 "Final Sep 21 Women's · Tarleton State at Yellowstone Intercollegiate | 8th",
 "Final Sep 28 Women's · Tarleton State at Powercat Classic | 7th",
 "Final Oct 12 Women's · Tarleton State at Golf Iconic Classic | 10th",
 "Upcoming Oct 25 Women's · Tarleton State at The Clash at Boulder Creek | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Tarleton State at Ram Masters | 15th",
 "Final Sep 21 Men's · Tarleton State at CDA National Reserve Invitational | 11th",
 "Final Sep 27 Men's · Tarleton State at Argent Financial Classic | 10th",
 "Final Oct 12 Men's · Tarleton State at Tall City Collegiate | 5th",
 "Upcoming Feb 15 Men's · Tarleton State at Border Olympics | ",
 "Upcoming Feb 21 Men's · Tarleton State at Military City Collegiate | ",
 "Upcoming Mar 15 Men's · Tarleton State at All-American Intercollegiate | ",
 "Upcoming Apr 5 Men's · Tarleton State at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · Tarleton State at Sandy Edinger Collegiate | ",
 "Upcoming Apr 30 Men's · Tarleton State at UAC Men's Golf Championship | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Tarleton State at Texas A&M-Corpus Christi | T, 2-2",
 "Final Aug 20 Tarleton State vs UTEP | T, 1-1",
 "Final Aug 23 Tarleton State at Houston | L, 1-4",
 "Final Aug 27 Tarleton State vs UTRGV | L, 0-1",
 "Final Aug 30 Tarleton State vs Lamar | T, 1-1",
 "Final Sep 3 Tarleton State at Incarnate Word | T, 0-0",
 "Final Sep 6 Tarleton State at Houston Christian | T, 4-4",
 "Final Sep 11 Tarleton State at Prairie View A&M | W, 4-0",
 "Final Sep 17 Tarleton State vs Texas Southern | W, 2-1",
 "Final Sep 24 Tarleton State at Central Arkansas | W, 2-1",
 "Final Sep 27 Tarleton State vs Abilene Christian | L, 2-3",
 "Final Oct 4 Tarleton State at Little Rock | T, 3-3",
 "Final Oct 8 Tarleton State at Austin Peay | W, 3-1",
 "Final Oct 11 Tarleton State at North Alabama | T, 1-1",
 "Final Oct 15 Tarleton State vs Eastern Kentucky | W, 2-0",
 "Final Oct 18 Tarleton State vs West Georgia | W, 4-0",
 "Upcoming Oct 25, 1:00 PM Tarleton State vs Little Rock | ",
 "Upcoming Oct 29, 7:00 PM Tarleton State at Abilene Christian | ",
 "Upcoming Nov 1, 1:00 PM Tarleton State vs Central Arkansas | ",
 "Upcoming Nov 8 Tarleton State at UAC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Tarleton State at Cowgirl Invite | Completed",
 "Final Sep 18 Tarleton State at ACU Invite | Completed",
 "Final Oct 2 Tarleton State at Fordham Four Invite | Completed",
 "Final Oct 8 Tarleton State at ITA Texas Regional Championship | Completed",
 "Today Oct 23 Tarleton State at UAC Fall Individual Championship | ",
 "Upcoming Nov 5 Tarleton State at ITA Conference Masters Championship | ",
 "Upcoming Nov 7 Tarleton State at States Up Slam | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 5 Tarleton State at Winter Commodore Challenge | ",
 "Upcoming Jan 15 Tarleton State at Corky Classic | ",
 "Upcoming Jan 22 Tarleton State at Stan Scott Invite | ",
 "Upcoming Feb 5 Tarleton State at Charlie Thomas Invitational | ",
 "Upcoming Feb 5 Tarleton State at Frank Sevigne Invitational | ",
 "Upcoming Feb 12 Tarleton State at Tyson Invitational | ",
 "Upcoming Feb 12 Tarleton State at Jarvis Scott Invite | ",
 "Upcoming Feb 27 Tarleton State at UAC Indoor Track & Field Championships | ",
 "Upcoming Mar 12 Tarleton State at NCAA D1 Indoor Track & Field Championships Day 1 | ",
 "Upcoming Mar 13 Tarleton State at NCAA D1 Indoor Track and Field Championships Day 2 | ",
 "Upcoming Mar 19 Tarleton State at ACU Invitational | ",
 "Upcoming Mar 26 Tarleton State at Clyde Hart Invitational | ",
 "Upcoming Apr 2 Tarleton State at Bobcat Invitational | ",
 "Upcoming Apr 2 Tarleton State at Jim Click Shootout | ",
 "Upcoming Apr 16 Tarleton State at Michael Johnson Invitational | ",
 "Upcoming Apr 30 Tarleton State at Alumni Muster | ",
 "Upcoming May 14 Tarleton State at UAC Outdoor Track & Field Championships | ",
 "Upcoming May 26 Tarleton State at NCAA West Preliminary Championships | ",
 "Upcoming Jun 9 Tarleton State at NCAA Outdoor Track & Field Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Tarleton State vs UC Santa Barbara | L, 2-3",
 "Final Aug 29 Tarleton State at Arizona | L, 0-3",
 "Final Aug 30 Tarleton State vs Prairie View A&M | W, 3-0",
 "Final Sep 2 Tarleton State at Rice | L, 1-3",
 "Final Sep 4 Tarleton State at UTSA | L, 0-3",
 "Final Sep 5 Tarleton State at Incarnate Word | L, 1-3",
 "Final Sep 10 Tarleton State vs Sam Houston | W, 3-0",
 "Final Sep 11 Tarleton State vs Denver | W, 3-2",
 "Final Sep 12 Tarleton State vs Texas A&M-Corpus Christi | L, 0-3",
 "Final Sep 15 Tarleton State at Texas Tech | L, 1-3",
 "Final Sep 17 Tarleton State at North Texas | L, 0-3",
 "Final Sep 18 Tarleton State vs East Texas A&M | W, 3-1",
 "Final Sep 19 Tarleton State vs West Virginia | L, 0-3",
 "Final Sep 22 Tarleton State vs UT Arlington | W, 3-1",
 "Final Sep 26 Tarleton State vs North Alabama | W, 3-0",
 "Final Oct 1 Tarleton State at Eastern Kentucky | L, 0-3",
 "Final Oct 3 Tarleton State at Austin Peay | L, 2-3",
 "Final Oct 8 Tarleton State vs Central Arkansas | L, 2-3",
 "Final Oct 10 Tarleton State vs Abilene Christian | W, 3-0",
 "Final Oct 15 Tarleton State at Little Rock | W, 3-0",
 "Final Oct 17 Tarleton State at Central Arkansas | L, 2-3",
 "Final Oct 20 Tarleton State at UT Arlington | L, 1-3",
 "Final Oct 22 Tarleton State vs West Georgia | W, 3-1",
 "Upcoming Oct 29, 6:00 PM Tarleton State at North Alabama | ",
 "Upcoming Oct 31, 1:00 PM Tarleton State at West Georgia | ",
 "Upcoming Nov 5, 6:00 PM Tarleton State at Abilene Christian | ",
 "Upcoming Nov 7, 1:00 PM Tarleton State vs Little Rock | ",
 "Upcoming Nov 12, 6:00 PM Tarleton State vs Eastern Kentucky | ",
 "Upcoming Nov 14, 12:00 PM Tarleton State vs Austin Peay | ",
 "Upcoming Nov 19 Tarleton State at UAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Tarleton State module checks passed");
