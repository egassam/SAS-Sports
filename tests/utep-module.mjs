import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utepSchool} from '../src/schools/utep.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utep');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utepHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utep-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utepminers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['utep'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',utepSchool.scheduleUrls],['roster',utepSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utep|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utepminers.com',`${key} must stay on utepminers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://utepminers.com/sports/mens-basketball/schedule","https://utepminers.com/sports/womens-basketball/schedule"],"roster":["https://utepminers.com/sports/mens-basketball/roster","https://utepminers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utepminers.com/sports/cross-country/schedule"],"roster":["https://utepminers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://utepminers.com/sports/football/schedule"],"roster":["https://utepminers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utepminers.com/sports/womens-golf/schedule","https://utepminers.com/sports/mens-golf/schedule"],"roster":["https://utepminers.com/sports/womens-golf/roster","https://utepminers.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://utepminers.com/sports/womens-rifle/schedule"],"roster":["https://utepminers.com/sports/womens-rifle/roster"],"combined":false},"Soccer":{"schedule":["https://utepminers.com/sports/womens-soccer/schedule"],"roster":["https://utepminers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://utepminers.com/sports/softball/schedule"],"roster":["https://utepminers.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://utepminers.com/sports/track-and-field/schedule"],"roster":["https://utepminers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://utepminers.com/sports/womens-volleyball/schedule"],"roster":["https://utepminers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'utep|"+sport+"':"),`${sport} routes must live in the UTEP module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://utepminers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utepHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utep)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 12:00 PM Men's · UTEP vs Northern Kentucky | ",
 "Upcoming Nov 8, 5:00 PM Men's · UTEP vs UIW | ",
 "Upcoming Nov 12, 7:00 PM Men's · UTEP vs NM State | ",
 "Upcoming Nov 15, 6:00 PM Men's · UTEP vs Florida A&M | ",
 "Upcoming Nov 19, 7:00 PM Men's · UTEP at NM State | ",
 "Upcoming Nov 24, 6:30 PM Men's · UTEP vs College of Charleston | ",
 "Upcoming Nov 25 Men's · UTEP vs Eastern Michigan/Kennesaw State | ",
 "Upcoming Dec 1, 7:00 PM Men's · UTEP at Colorado | ",
 "Upcoming Dec 5, 2:00 PM Men's · UTEP vs North Dakota | ",
 "Upcoming Dec 16, 7:00 PM Men's · UTEP vs UTPB | ",
 "Upcoming Dec 20, 7:00 PM Men's · UTEP vs Howard | ",
 "Upcoming Dec 29, 7:00 PM Men's · UTEP vs New Mexico Highlands | ",
 "Upcoming Jan 2, 6:00 PM Men's · UTEP vs New Mexico | ",
 "Upcoming Jan 5, 7:00 PM Men's · UTEP vs Wyoming | ",
 "Upcoming Jan 9, 12:00 PM Men's · UTEP at Air Force | ",
 "Upcoming Jan 12, 8:00 PM Men's · UTEP vs Nevada | ",
 "Upcoming Jan 15, 8:00 PM Men's · UTEP at UNLV | ",
 "Upcoming Jan 19, 6:30 PM Men's · UTEP at Wyoming | ",
 "Upcoming Jan 23, 7:00 PM Men's · UTEP vs UC Davis | ",
 "Upcoming Jan 26, 9:00 PM Men's · UTEP at Nevada | ",
 "Upcoming Jan 30, 7:00 PM Men's · UTEP vs San Jose State | ",
 "Upcoming Feb 6, 10:00 PM Men's · UTEP at Hawai'i | ",
 "Upcoming Feb 9, 8:00 PM Men's · UTEP vs Grand Canyon | ",
 "Upcoming Feb 13, 5:00 PM Men's · UTEP at UC Davis | ",
 "Upcoming Feb 17, 6:00 PM Men's · UTEP vs UNLV | ",
 "Upcoming Feb 20, 8:30 PM Men's · UTEP at New Mexico | ",
 "Upcoming Feb 23, 8:00 PM Men's · UTEP at Grand Canyon | ",
 "Upcoming Feb 27, 7:00 PM Men's · UTEP vs Hawai'i | ",
 "Upcoming Mar 2 Men's · UTEP at San Jose State | ",
 "Upcoming Mar 6, 2:00 PM Men's · UTEP vs Air Force | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · UTEP vs WNMU | ",
 "Upcoming Nov 7 Women's · UTEP vs UIW | ",
 "Upcoming Nov 10, 7:00 PM Women's · UTEP vs NM State | ",
 "Upcoming Nov 14 Women's · UTEP vs Alabama State | ",
 "Upcoming Nov 18, 11:30 AM Women's · UTEP vs Kansas City | ",
 "Upcoming Nov 21, 2:00 PM Women's · UTEP vs Texas Southern | ",
 "Upcoming Nov 25, 2:00 PM Women's · UTEP vs Bradley | ",
 "Upcoming Nov 27, 4:00 PM Women's · UTEP vs Pacific | ",
 "Upcoming Nov 28, 3:00 PM Women's · UTEP at Texas State | ",
 "Upcoming Dec 5, 1:00 PM Women's · UTEP at NM State | ",
 "Upcoming Dec 12, 3:00 PM Women's · UTEP at UC Irvine | ",
 "Upcoming Dec 14, 7:30 PM Women's · UTEP at CSU Bakersfield | ",
 "Upcoming Dec 19, 12:00 PM Women's · UTEP vs UC Santa Barbara | ",
 "Upcoming Dec 30, 7:00 PM Women's · UTEP at New Mexico | ",
 "Upcoming Jan 2, 3:00 PM Women's · UTEP at UNLV | ",
 "Upcoming Jan 6, 7:00 PM Women's · UTEP vs UC Davis | ",
 "Upcoming Jan 9, 2:00 PM Women's · UTEP vs San Jose State | ",
 "Upcoming Jan 13, 7:00 PM Women's · UTEP at Grand Canyon | ",
 "Upcoming Jan 16, 2:00 PM Women's · UTEP vs Nevada | ",
 "Upcoming Jan 20, 6:30 PM Women's · UTEP at Wyoming | ",
 "Upcoming Jan 23, 2:00 PM Women's · UTEP vs Air Force | ",
 "Upcoming Jan 27, 7:00 PM Women's · UTEP vs UNLV | ",
 "Upcoming Jan 30, 2:00 PM Women's · UTEP at Nevada | ",
 "Upcoming Feb 6, 2:00 PM Women's · UTEP vs Hawaii | ",
 "Upcoming Feb 10, 7:00 PM Women's · UTEP at UC Davis | ",
 "Upcoming Feb 13, 2:00 PM Women's · UTEP vs Wyoming | ",
 "Upcoming Feb 17, 6:30 PM Women's · UTEP at Air Force | ",
 "Upcoming Feb 20 Women's · UTEP at San Jose State | ",
 "Upcoming Feb 24, 7:00 PM Women's · UTEP vs Grand Canyon | ",
 "Upcoming Feb 27 Women's · UTEP at Hawaii | ",
 "Upcoming Mar 2, 7:00 PM Women's · UTEP vs New Mexico | ",
 "Upcoming Mar 7 Women's · UTEP at 2027 Credit Union 1 Mountain West Women's Basketball Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 UTEP at Art Morgan Classic | Women's team: 2nd / Men's team: 3rd",
 "Final Sep 19 UTEP at 40th Lori Fitzgerald Invitational | Women's team: 1st / Men's team: 1st",
 "Final Oct 3 UTEP at Chile Pepper Festival | Men's team: 3rd",
 "Final Oct 16 UTEP at Arturo Barrios Invitational | Women's team: 42nd / Men's team: 15th",
 "Upcoming Oct 30 UTEP at Mountain West Cross Country Championships | ",
 "Upcoming Nov 13 UTEP at NCAA Cross Country Mountain Regional | ",
 "Upcoming Nov 21 UTEP at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 UTEP at Oklahoma | L, 0-51",
 "Final Sep 12 UTEP vs Texas Southern | W, 51-10",
 "Final Sep 19 UTEP at Michigan | L, 17-52",
 "Final Sep 26 UTEP vs Oregon State | L, 7-33",
 "Final Oct 3 UTEP at New Mexico | L, 7-61",
 "Final Oct 10 UTEP vs Nevada | L, 13-30",
 "Final Oct 17 UTEP vs San José State | L, 11-24",
 "Upcoming Oct 31, 1:30 PM UTEP at North Dakota State | ",
 "Upcoming Nov 7 UTEP vs Hawai'i | ",
 "Upcoming Nov 14 UTEP vs Wyoming | ",
 "Upcoming Nov 20, 6:00 PM UTEP at Air Force | ",
 "Upcoming Nov 28, 1:30 PM UTEP at NIU | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UTEP at Branch Law Firm/Dick McGuire Invitational | T9th of 13",
 "Final Sep 22 Women's · UTEP at Red Raider Invitational | 9th of 12",
 "Final Oct 12 Women's · UTEP at Golf Iconic Classic | 4th of 19",
 "Upcoming Oct 25 Women's · UTEP at The Clash at Boulder Creek | ",
 "Upcoming Feb 8 Women's · UTEP at Ventura Harbor Collegiate | ",
 "Upcoming Mar 2 Women's · UTEP at GCU Invitational | ",
 "Upcoming Mar 12 Women's · UTEP at Red Rocks Invitational | ",
 "Upcoming Apr 6 Women's · UTEP at Cowgirl Classic | ",
 "Upcoming Apr 20 Women's · UTEP at Mountain West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · UTEP at Bomb Darts Birds Intercollegiate | T7th of 13",
 "Final Sep 19 Men's · UTEP at Gene Miranda Falcon Invitational | T2nd of 18",
 "Final Sep 25 Men's · UTEP at William H. Tucker Invitational | 12th of 15",
 "Final Sep 29 Men's · UTEP at Mark Simpson Colorado Invitational | 10th of 17",
 "Final Oct 19 Men's · UTEP at The Clerico | Completed",
 "Upcoming Feb 1 Men's · UTEP at National Invitational Tournament | ",
 "Upcoming Feb 11 Men's · UTEP at John A. Burns Intercollegiate | ",
 "Upcoming Mar 15 Men's · UTEP at Arizona Thunderbirds Intercollegiate | ",
 "Upcoming Mar 21 Men's · UTEP at GameAbove Collegiate | ",
 "Upcoming Apr 5 Men's · UTEP at GolfWeek Intercollegiate | ",
 "Upcoming Apr 12 Men's · UTEP at Mossy Oak Collegiate | ",
 "Upcoming Apr 27 Men's · UTEP at Mountain West Men's Golf Championship | ",
 "Upcoming May 17 Men's · UTEP at NCAA Regional | ",
 "Upcoming May 28 Men's · UTEP at NCAA Championship | "
]);
  const v_womensrifle=parse("Rifle","womens-rifle");
  assert.deepEqual(v_womensrifle.map(line),[
 "Final Oct 17 UTEP vs Schreiner | W, 4661-3576",
 "Upcoming Oct 23 UTEP vs Alaska Fairbanks | ",
 "Upcoming Oct 24 UTEP vs TCU | ",
 "Upcoming Oct 31 UTEP at Ohio State | ",
 "Upcoming Nov 1 UTEP at Ohio State | ",
 "Upcoming Nov 21 UTEP vs Ohio State | ",
 "Upcoming Nov 22 UTEP vs Ohio State | ",
 "Upcoming Jan 9 UTEP at Nebraska | ",
 "Upcoming Jan 10 UTEP at Nebraska | ",
 "Upcoming Jan 16 UTEP at Ole Miss | ",
 "Upcoming Jan 23 UTEP vs Ole Miss | ",
 "Upcoming Jan 30 UTEP at TCU | ",
 "Upcoming Jan 31 UTEP at TCU | ",
 "Upcoming Feb 5 UTEP at Patriot Rifle Conference Championships | ",
 "Upcoming Feb 20 UTEP vs Schreiner | ",
 "Upcoming Mar 12 UTEP at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 UTEP vs Lamar | W, 2-0",
 "Final Aug 16 UTEP vs Sul Ross State | W, 5-0",
 "Final Aug 20 UTEP at Tarleton State | T, 1-1",
 "Final Aug 23 UTEP at ACU | T, 0-0",
 "Final Aug 30 UTEP at NAU | W, 1-0",
 "Final Sep 3 UTEP vs USD | W, 1-0",
 "Final Sep 10 UTEP at UTRGV | W, 2-1",
 "Final Sep 13 UTEP at Texas A&M - Corpus Christi | W, 2-1",
 "Final Sep 17 UTEP at NM State | T, 1-1",
 "Final Sep 24 UTEP at UNLV | L, 1-2",
 "Final Sep 27 UTEP vs San Jose State | W, 1-0",
 "Final Oct 2 UTEP vs Air Force | W, 2-1",
 "Final Oct 11 UTEP at Hawaii | L, 1-2",
 "Final Oct 15 UTEP vs Colorado College | L, 0-1",
 "Final Oct 18 UTEP at Wyoming | L, 0-2",
 "Upcoming Oct 24, 7:00 PM UTEP vs New Mexico | ",
 "Upcoming Oct 28, 7:00 PM UTEP at Nevada | ",
 "Upcoming Nov 1, 2:00 PM UTEP at UC Davis | ",
 "Upcoming Nov 6, 7:00 PM UTEP vs Grand Canyon | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 6, 10:00 AM UTEP at Winter All-Comers Meet | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 UTEP vs Tulsa | L, 2-3",
 "Final Aug 30 UTEP vs NM State | W, 3-2",
 "Final Sep 3 UTEP vs Texas State | W, 3-2",
 "Final Sep 4 UTEP at Texas A&M - Corpus Christi | W, 3-1",
 "Final Sep 5 UTEP vs UTRGV | W, 3-2",
 "Final Sep 10 UTEP at NM State | W, 3-0",
 "Final Sep 11 UTEP vs Pacific | W, 3-0",
 "Final Sep 12 UTEP vs UC San Diego | W, 3-1",
 "Final Sep 16 UTEP at TCU | L, 1-3",
 "Final Sep 17 UTEP vs UIW | W, 3-1",
 "Final Sep 18 UTEP at Baylor | L, 0-3",
 "Final Sep 22 UTEP vs Arizona | L, 1-3",
 "Final Sep 25 UTEP at Wyoming | W, 3-0",
 "Final Sep 26 UTEP at Wyoming | W, 3-1",
 "Final Oct 1 UTEP vs UNLV | L, 0-3",
 "Final Oct 3 UTEP vs UNLV | W, 3-0",
 "Final Oct 8 UTEP at Nevada | L, 2-3",
 "Final Oct 10 UTEP at Nevada | L, 0-3",
 "Final Oct 15 UTEP vs New Mexico | W, 3-0",
 "Final Oct 17 UTEP at New Mexico | L, 1-3",
 "Today Oct 22, 6:00 PM UTEP vs Air Force | ",
 "Upcoming Oct 24, 1:00 PM UTEP vs Air Force | ",
 "Upcoming Oct 29, 7:00 PM UTEP at San Jose State | ",
 "Upcoming Oct 30, 7:00 PM UTEP at San Jose State | ",
 "Upcoming Nov 6, 6:00 PM UTEP vs UC Davis | ",
 "Upcoming Nov 8, 12:00 PM UTEP vs UC Davis | ",
 "Upcoming Nov 12, 6:00 PM UTEP at Grand Canyon | ",
 "Upcoming Nov 14, 1:00 PM UTEP at Grand Canyon | ",
 "Upcoming Nov 18, 6:00 PM UTEP vs Hawaii | ",
 "Upcoming Nov 19, 6:00 PM UTEP vs Hawaii | ",
 "Upcoming Nov 24 UTEP at Mountain West Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensrifle,"Rifle womens-rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UTEP module checks passed");
