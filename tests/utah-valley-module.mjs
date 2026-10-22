import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utahValleySchool} from '../src/schools/utah-valley.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah-valley');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utahValleyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utah-valley-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gouvu.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['utah-valley'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',utahValleySchool.scheduleUrls],['roster',utahValleySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utah-valley|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gouvu.com',`${key} must stay on gouvu.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gouvu.com/sports/baseball/schedule"],"roster":["https://gouvu.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gouvu.com/sports/mens-basketball/schedule","https://gouvu.com/sports/womens-basketball/schedule"],"roster":["https://gouvu.com/sports/mens-basketball/roster","https://gouvu.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gouvu.com/sports/cross-country/schedule"],"roster":["https://gouvu.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gouvu.com/sports/womens-golf/schedule","https://gouvu.com/sports/mens-golf/schedule"],"roster":["https://gouvu.com/sports/womens-golf/roster","https://gouvu.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gouvu.com/sports/womens-soccer/schedule","https://gouvu.com/sports/mens-soccer/schedule"],"roster":["https://gouvu.com/sports/womens-soccer/roster","https://gouvu.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gouvu.com/sports/softball/schedule"],"roster":["https://gouvu.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://gouvu.com/sports/track-and-field/schedule"],"roster":["https://gouvu.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gouvu.com/sports/womens-volleyball/schedule"],"roster":["https://gouvu.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gouvu.com/sports/wrestling/schedule"],"roster":["https://gouvu.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'utah-valley|"+sport+"':"),`${sport} routes must live in the Utah Valley module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gouvu.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utahValleyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utah-valley)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 31 Utah Valley vs Wolverine World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Utah Valley at Utah Tech | L, 80-92",
 "Upcoming Nov 2, 6:00 PM Men's · Utah Valley vs Western Colorado | ",
 "Upcoming Nov 7, 7:00 PM Men's · Utah Valley at Weber State | ",
 "Upcoming Nov 14, 8:00 PM Men's · Utah Valley at Nevada | ",
 "Upcoming Nov 20, 7:00 PM Men's · Utah Valley vs East Carolina | ",
 "Upcoming Nov 21 Men's · Utah Valley at U.S. Virgin Islands Paradise Jam | ",
 "Upcoming Nov 28, 2:00 PM Men's · Utah Valley vs San Jose State | ",
 "Upcoming Dec 3, 8:00 PM Men's · Utah Valley at Long Beach State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Utah Valley vs Sacramento State | ",
 "Upcoming Dec 12 Men's · Utah Valley at Pacific | ",
 "Upcoming Dec 16, 7:00 PM Men's · Utah Valley at Boise State | ",
 "Upcoming Dec 21, 6:00 PM Men's · Utah Valley vs Justice | ",
 "Upcoming Dec 31, 2:00 PM Men's · Utah Valley vs Cal State Bakersfield | ",
 "Upcoming Jan 2, 2:00 PM Men's · Utah Valley vs CSUN | ",
 "Upcoming Jan 7, 8:00 PM Men's · Utah Valley at UC San Diego | ",
 "Upcoming Jan 9, 8:00 PM Men's · Utah Valley at UC Irvine | ",
 "Upcoming Jan 14, 6:00 PM Men's · Utah Valley vs UC Santa Barbara | ",
 "Upcoming Jan 16, 2:00 PM Men's · Utah Valley vs Cal Poly | ",
 "Upcoming Jan 21, 6:00 PM Men's · Utah Valley vs California Baptist | ",
 "Upcoming Jan 23, 2:00 PM Men's · Utah Valley vs UC Riverside | ",
 "Upcoming Jan 28, 8:00 PM Men's · Utah Valley at CSUN | ",
 "Upcoming Jan 30, 3:00 PM Men's · Utah Valley at Cal State Bakersfield | ",
 "Upcoming Feb 4, 8:00 PM Men's · Utah Valley at UC Riverside | ",
 "Upcoming Feb 6, 6:00 PM Men's · Utah Valley at California Baptist | ",
 "Upcoming Feb 11, 6:00 PM Men's · Utah Valley vs UC Irvine | ",
 "Upcoming Feb 13, 2:00 PM Men's · Utah Valley vs UC San Diego | ",
 "Upcoming Feb 18, 8:00 PM Men's · Utah Valley at Cal State Fullerton | ",
 "Upcoming Feb 20, 8:00 PM Men's · Utah Valley at Sacramento State | ",
 "Upcoming Feb 25, 6:00 PM Men's · Utah Valley vs Long Beach State | ",
 "Upcoming Feb 27, 2:00 PM Men's · Utah Valley vs Cal State Fullerton | ",
 "Upcoming Mar 4, 8:00 PM Men's · Utah Valley at Cal Poly | ",
 "Upcoming Mar 6, 7:00 PM Men's · Utah Valley at UC Santa Barbara | ",
 "Upcoming Mar 10 Men's · Utah Valley at The Big West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · Utah Valley vs Park | ",
 "Upcoming Nov 7, 4:00 PM Women's · Utah Valley vs Santa Clara | ",
 "Upcoming Nov 14, 2:00 PM Women's · Utah Valley vs Nevada | ",
 "Upcoming Nov 20, 7:00 PM Women's · Utah Valley at Utah | ",
 "Upcoming Nov 24, 6:00 PM Women's · Utah Valley vs BYU | ",
 "Upcoming Nov 28, 5:00 PM Women's · Utah Valley at Idaho State | ",
 "Upcoming Dec 3, 6:00 PM Women's · Utah Valley vs Long Beach State | ",
 "Upcoming Dec 5, 12:00 PM Women's · Utah Valley at Sacramento State | ",
 "Upcoming Dec 9, 6:00 PM Women's · Utah Valley vs Utah State | ",
 "Upcoming Dec 12 Women's · Utah Valley at Pepperdine | ",
 "Upcoming Dec 17, 6:00 PM Women's · Utah Valley vs UC Davis | ",
 "Upcoming Dec 19, 12:00 PM Women's · Utah Valley vs Western Colorado | ",
 "Upcoming Dec 31, 6:00 PM Women's · Utah Valley at Cal State Bakersfield | ",
 "Upcoming Jan 2, 3:00 PM Women's · Utah Valley at CSUN | ",
 "Upcoming Jan 7, 6:00 PM Women's · Utah Valley vs UC San Diego | ",
 "Upcoming Jan 9, 2:00 PM Women's · Utah Valley vs UC Irvine | ",
 "Upcoming Jan 14, 7:00 PM Women's · Utah Valley at UC Santa Barbara | ",
 "Upcoming Jan 16, 3:00 PM Women's · Utah Valley at Cal Poly | ",
 "Upcoming Jan 21, 7:00 PM Women's · Utah Valley at California Baptist | ",
 "Upcoming Jan 23, 3:00 PM Women's · Utah Valley at UC Riverside | ",
 "Upcoming Jan 28, 6:00 PM Women's · Utah Valley vs CSUN | ",
 "Upcoming Jan 30, 2:00 PM Women's · Utah Valley vs Cal State Bakersfield | ",
 "Upcoming Feb 4, 5:00 PM Women's · Utah Valley vs UC Riverside | ",
 "Upcoming Feb 6, 2:00 PM Women's · Utah Valley vs California Baptist | ",
 "Upcoming Feb 11, 7:00 PM Women's · Utah Valley at UC Irvine | ",
 "Upcoming Feb 13, 2:00 PM Women's · Utah Valley at UC San Diego | ",
 "Upcoming Feb 18, 6:00 PM Women's · Utah Valley vs Cal State Fullerton | ",
 "Upcoming Feb 20, 2:00 PM Women's · Utah Valley vs Sacramento State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Utah Valley at Long Beach State | ",
 "Upcoming Feb 27, 3:00 PM Women's · Utah Valley at Cal State Fullerton | ",
 "Upcoming Mar 4, 6:00 PM Women's · Utah Valley vs Cal Poly | ",
 "Upcoming Mar 6, 2:00 PM Women's · Utah Valley vs UC Santa Barbara | ",
 "Upcoming Mar 10 Women's · Utah Valley at The Big West Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Utah Valley at UVU Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 11 Utah Valley at Wolverine Invite | Women's team: 1st / Men's team: 1st",
 "Final Sep 19 Utah Valley at John McNichols Invitational | Women's team: 11th / Men's team: 8th",
 "Final Oct 3 Utah Valley at Color Country Invitational | Women's team: 1st / Men's team: 1st",
 "Final Oct 16 Utah Valley at Under Armour Pre-National Invitational | Women's team: 19th / Men's team: 25th",
 "Upcoming Oct 31 Utah Valley at Big West Championships | ",
 "Upcoming Nov 13 Utah Valley at NCAA Mountain Regionals | ",
 "Upcoming Nov 21 Utah Valley at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Utah Valley at Wolverine Invitational | 1st of 10",
 "Final Sep 21 Women's · Utah Valley at Kalispel Invitational | 12th of 14",
 "Final Oct 5 Women's · Utah Valley at Pat Lesser Harbottle Invitational | 15th of 17",
 "Upcoming Oct 25 Women's · Utah Valley at The Clash at Boulder Creek | ",
 "Upcoming Feb 8 Women's · Utah Valley at Mountain Classic Match Play | ",
 "Upcoming Feb 22 Women's · Utah Valley at Longwood Invitational | ",
 "Upcoming Mar 5 Women's · Utah Valley at Pizza Hut Lady Thunderbird Invitational | ",
 "Upcoming Mar 22 Women's · Utah Valley at Ozarks National Invitational | ",
 "Upcoming Apr 12 Women's · Utah Valley at Bobcat Desert Classic | ",
 "Upcoming Apr 18 Women's · Utah Valley at The Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Utah Valley at Colorado State Ram Masters | 4th of 16",
 "Final Sep 19 Men's · Utah Valley at Gene Miranda Falcon Invitational | 13th of 18",
 "Final Sep 29 Men's · Utah Valley at Mark Simpson Colorado Invitational | 17th of 17",
 "Final Oct 12 Men's · Utah Valley at Visit Stockton Pacific Invitational | 5th of 18",
 "Upcoming Feb 1 Men's · Utah Valley at Bill Cullum Invitational | ",
 "Upcoming Mar 5 Men's · Utah Valley at Bandon Dunes Championship | ",
 "Upcoming Mar 21 Men's · Utah Valley at UC San Diego Invitational | ",
 "Upcoming Apr 5 Men's · Utah Valley at Gaucho Invitational | ",
 "Upcoming Apr 19 Men's · Utah Valley at Redhawk Invitational | ",
 "Upcoming May 2 Men's · Utah Valley at The Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Utah Valley vs Michigan | T, 1-1",
 "Final Aug 17 Women's · Utah Valley vs Utah | L, 0-2",
 "Final Aug 24 Women's · Utah Valley vs Utah State | L, 0-1",
 "Final Aug 27 Women's · Utah Valley vs Kansas | W, 2-1",
 "Final Sep 3 Women's · Utah Valley vs Washington State | W, 1-0",
 "Final Sep 6 Women's · Utah Valley vs New Mexico State | W, 4-0",
 "Final Sep 12 Women's · Utah Valley vs San Diego State | L, 1-2",
 "Final Sep 16 Women's · Utah Valley at Gonzaga | L, 1-2",
 "Final Sep 19 Women's · Utah Valley vs Weber State | W, 3-0",
 "Final Sep 23 Women's · Utah Valley vs Cal State Bakersfield | W, 7-1",
 "Final Sep 26 Women's · Utah Valley at UC San Diego | T, 2-2",
 "Final Sep 30 Women's · Utah Valley at UC Irvine | W, 3-1",
 "Final Oct 3 Women's · Utah Valley vs Cal State Fullerton | T, 1-1",
 "Final Oct 10 Women's · Utah Valley at Cal Poly | W, 2-1",
 "Final Oct 14 Women's · Utah Valley at California Baptist | W, 1-0",
 "Final Oct 17 Women's · Utah Valley vs UC Riverside | W, 3-0",
 "Final Oct 21 Women's · Utah Valley vs Sacramento State | W, 6-1",
 "Upcoming Oct 24, 7:00 PM Women's · Utah Valley at UC Santa Barbara | ",
 "Upcoming Oct 28, 6:00 PM Women's · Utah Valley vs Long Beach State | ",
 "Upcoming Oct 31, 2:00 PM Women's · Utah Valley at CSUN | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Utah Valley vs Pacific | W, 2-1",
 "Final Aug 24 Men's · Utah Valley vs Central Arkansas | W, 1-0",
 "Final Aug 30 Men's · Utah Valley at Santa Clara | W, 1-0",
 "Final Sep 3 Men's · Utah Valley vs Omaha | T, 1-1",
 "Final Sep 11 Men's · Utah Valley at Marshall | W, 2-1",
 "Final Sep 21 Men's · Utah Valley at Utah Tech | T, 1-1",
 "Final Sep 30 Men's · Utah Valley vs UC Irvine | W, 2-0",
 "Final Oct 3 Men's · Utah Valley at UC Santa Barbara | L, 2-3",
 "Final Oct 7 Men's · Utah Valley at Cal State Fullerton | W, 2-1",
 "Final Oct 10 Men's · Utah Valley vs Sacramento State | W, 3-0",
 "Final Oct 14 Men's · Utah Valley at Cal Poly | L, 1-3",
 "Final Oct 17 Men's · Utah Valley vs CSUN | W, 1-0",
 "Final Oct 21 Men's · Utah Valley at San Diego State | T, 2-2",
 "Upcoming Oct 24, 6:00 PM Men's · Utah Valley vs Oregon State | ",
 "Upcoming Oct 31, 8:00 PM Men's · Utah Valley at Cal State Bakersfield | ",
 "Upcoming Nov 7 Men's · Utah Valley at Big West Semifinal | ",
 "Upcoming Nov 13 Men's · Utah Valley at Big West Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 4:00 PM Utah Valley at Utah State | ",
 "Today Oct 22, 4:00 PM Utah Valley vs Snow College | ",
 "Upcoming Oct 24, 12:00 PM Utah Valley vs Southern Utah | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Utah Valley vs Utah Tech | L, 1-3",
 "Final Aug 28 Utah Valley vs Utah | L, 0-3",
 "Final Aug 29 Utah Valley vs Oregon State | L, 1-3",
 "Final Sep 3 Utah Valley at South Dakota | L, 0-3",
 "Final Sep 4 Utah Valley vs Northern Iowa | L, 0-3",
 "Final Sep 5 Utah Valley vs Air Force | L, 0-3",
 "Final Sep 11 Utah Valley vs Drake | L, 0-3",
 "Final Sep 11 Utah Valley at Kansas City | W, 3-2",
 "Final Sep 12 Utah Valley vs Radford | W, 3-2",
 "Final Sep 15 Utah Valley at BYU | L, 0-3",
 "Final Sep 17 Utah Valley at Utah State | L, 1-3",
 "Final Sep 19 Utah Valley vs Weber State | L, 1-3",
 "Final Sep 24 Utah Valley vs UC Riverside | W, 3-0",
 "Final Sep 26 Utah Valley vs California Baptist | W, 3-2",
 "Final Oct 1 Utah Valley vs UC Santa Barbara | L, 0-3",
 "Final Oct 3 Utah Valley vs Cal Poly | L, 0-3",
 "Final Oct 9 Utah Valley at UC Irvine | L, 0-3",
 "Final Oct 10 Utah Valley at UC San Diego | L, 0-3",
 "Final Oct 15 Utah Valley vs Long Beach State | L, 2-3",
 "Final Oct 17 Utah Valley vs Cal State Fullerton | W, 3-0",
 "Today Oct 22, 8:00 PM Utah Valley at Sacramento State | ",
 "Upcoming Oct 24, 1:00 PM Utah Valley vs Sacramento State | ",
 "Upcoming Oct 30, 7:00 PM Utah Valley at California Baptist | ",
 "Upcoming Oct 31, 2:00 PM Utah Valley at UC Riverside | ",
 "Upcoming Nov 5, 6:00 PM Utah Valley vs UC San Diego | ",
 "Upcoming Nov 7, 1:00 PM Utah Valley vs UC Irvine | ",
 "Upcoming Nov 13, 7:00 PM Utah Valley at Cal Poly | ",
 "Upcoming Nov 14, 7:00 PM Utah Valley at UC Santa Barbara | ",
 "Upcoming Nov 19, 12:00 PM Utah Valley at CSU Bakersfield | ",
 "Upcoming Nov 20, 8:00 PM Utah Valley at CSUN | ",
 "Upcoming Nov 25 Utah Valley at The Big West Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 7:00 AM Utah Valley at Clarion Open | ",
 "Upcoming Nov 6, 7:00 PM Utah Valley vs Iowa State | ",
 "Upcoming Nov 19, 7:00 PM Utah Valley vs West Virginia | ",
 "Upcoming Dec 4, 10:00 AM Utah Valley at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 19, 7:00 PM Utah Valley vs Wisconsin | ",
 "Upcoming Jan 2 Utah Valley at Southern Scuffle | ",
 "Upcoming Jan 10 Utah Valley at Rockwell UVU Open | ",
 "Upcoming Jan 16 Utah Valley at The Citadel | ",
 "Upcoming Jan 16 Utah Valley at Chattanooga | ",
 "Upcoming Jan 17 Utah Valley at Wildcat Open | ",
 "Upcoming Jan 22 Utah Valley at Wyoming | ",
 "Upcoming Jan 24 Utah Valley at Northern Colorado | ",
 "Upcoming Jan 30 Utah Valley at Arizona State | ",
 "Upcoming Feb 4, 7:30 PM Utah Valley vs Northern Iowa | ",
 "Upcoming Feb 5, 7:00 PM Utah Valley vs Missouri | ",
 "Upcoming Feb 12 Utah Valley at Oklahoma | ",
 "Upcoming Feb 13 Utah Valley at Oklahoma State | ",
 "Upcoming Feb 19 Utah Valley at Little Rock | ",
 "Upcoming Mar 5 Utah Valley at Big 12 Championships | ",
 "Upcoming Mar 18 Utah Valley at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Men's soccer at Cal Poly (Oct 14) is billed "Pac-12 Crossover": Cal Poly's
// men's soccer plays in the Pac-12, so gouvu.com counts Big West play 4-1.
// Mutation: without the crossover rule membership makes it 4-2.
assert.deepEqual(worker.groupEvents([...parse('Soccer','mens-soccer'),...parse('Soccer','womens-soccer')],now)[0].records.map(r=>`${r.team_label} ${r.text} ${r.conference?.text}`),["Men's 8-2-3 4-1","Women's 10-4-3 6-0-2"]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Utah Valley module checks passed");
