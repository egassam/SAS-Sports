import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fresnoStateSchool,FRESNO_STATE_TFRRS_TEAMS} from '../src/schools/fresno-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='fresno-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,fresnoStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/fresno-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobulldogs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['fresno-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',fresnoStateSchool.scheduleUrls],['roster',fresnoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('fresno-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobulldogs.com',`${key} must stay on gobulldogs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gobulldogs.com/sports/baseball/schedule"],"roster":["https://gobulldogs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobulldogs.com/sports/mens-basketball/schedule","https://gobulldogs.com/sports/womens-basketball/schedule"],"roster":["https://gobulldogs.com/sports/mens-basketball/roster","https://gobulldogs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobulldogs.com/sports/cross-country/schedule"],"roster":["https://gobulldogs.com/sports/cross-country/roster"],"combined":false},"Equestrian":{"schedule":["https://gobulldogs.com/sports/equestrian/schedule"],"roster":["https://gobulldogs.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://gobulldogs.com/sports/football/schedule"],"roster":["https://gobulldogs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gobulldogs.com/sports/womens-golf/schedule","https://gobulldogs.com/sports/mens-golf/schedule"],"roster":["https://gobulldogs.com/sports/womens-golf/roster","https://gobulldogs.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gobulldogs.com/sports/womens-soccer/schedule"],"roster":["https://gobulldogs.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gobulldogs.com/sports/softball/schedule"],"roster":["https://gobulldogs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gobulldogs.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://gobulldogs.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://gobulldogs.com/sports/womens-tennis/schedule"],"roster":["https://gobulldogs.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gobulldogs.com/sports/track-and-field/schedule"],"roster":["https://gobulldogs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gobulldogs.com/sports/womens-volleyball/schedule"],"roster":["https://gobulldogs.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://gobulldogs.com/sports/womens-water-polo/schedule"],"roster":["https://gobulldogs.com/sports/womens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'fresno-state|"+sport+"':"),`${sport} routes must live in the Fresno State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-18T15:00:00Z");
const page=slug=>`https://gobulldogs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.fresnoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=fresno-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 2:00 PM Men's · Fresno State vs Cal State Fullerton (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Fresno State vs Fresno Pacific | ",
 "Upcoming Nov 7, 7:00 PM Men's · Fresno State at UC San Diego | ",
 "Upcoming Nov 10, 6:00 PM Men's · Fresno State vs Georgia State | ",
 "Upcoming Nov 14, 3:00 PM Men's · Fresno State vs UC Riverside | ",
 "Upcoming Nov 18, 6:00 PM Men's · Fresno State at San Jose State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Fresno State vs Alabama State | ",
 "Upcoming Nov 27, 11:00 AM Men's · Fresno State vs South Alabama | ",
 "Upcoming Nov 29, 3:00 PM Men's · Fresno State vs South Dakota State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Fresno State at Santa Clara | ",
 "Upcoming Dec 5, 11:30 AM Men's · Fresno State vs Southern | ",
 "Upcoming Dec 9, 6:00 PM Men's · Fresno State vs CSUN | ",
 "Upcoming Dec 12, 1:30 PM Men's · Fresno State vs San Francisco | ",
 "Upcoming Dec 19, 1:30 PM Men's · Fresno State vs Sacramento State | ",
 "Upcoming Dec 22, 4:00 PM Men's · Fresno State vs UC Santa Barbara | ",
 "Upcoming Dec 29, 7:00 PM Men's · Fresno State at UC Irvine | ",
 "Upcoming Jan 3, 1:00 PM Men's · Fresno State vs Washington State | ",
 "Upcoming Jan 9, 7:30 PM Men's · Fresno State at San Diego State | ",
 "Upcoming Jan 13, 8:00 PM Men's · Fresno State vs Gonzaga | ",
 "Upcoming Jan 17, 11:00 AM Men's · Fresno State at Colorado State | ",
 "Upcoming Jan 20, 6:00 PM Men's · Fresno State vs Boise State | ",
 "Upcoming Jan 23, 1:30 PM Men's · Fresno State vs Texas State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Fresno State at Gonzaga | ",
 "Upcoming Jan 30, 5:30 PM Men's · Fresno State at Washington State | ",
 "Upcoming Feb 4 Men's · Fresno State vs Colorado State | ",
 "Upcoming Feb 6, 3:45 PM Men's · Fresno State vs Utah State | ",
 "Upcoming Feb 13, 1:00 PM Men's · Fresno State at Boise State | ",
 "Upcoming Feb 18, 5:00 PM Men's · Fresno State at Texas State | ",
 "Upcoming Feb 20, 7:30 PM Men's · Fresno State vs Oregon State | ",
 "Upcoming Feb 27, 3:30 PM Men's · Fresno State at Utah State | ",
 "Upcoming Mar 3, 7:00 PM Men's · Fresno State vs San Diego State | ",
 "Upcoming Mar 6, 3:30 PM Men's · Fresno State at Oregon State | ",
 "Upcoming Mar 9 Men's · Fresno State at Pac-12 Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30, 6:30 PM Women's · Fresno State vs Stanislaus State (Exhibition) | ",
 "Upcoming Nov 4, 6:30 PM Women's · Fresno State vs UC Merced | ",
 "Upcoming Nov 7, 12:00 PM Women's · Fresno State at Colorado | ",
 "Upcoming Nov 11, 6:30 PM Women's · Fresno State vs New Mexico | ",
 "Upcoming Nov 14, 12:00 PM Women's · Fresno State vs NAU | ",
 "Upcoming Nov 24, 11:00 AM Women's · Fresno State at Florida Gulf Coast | ",
 "Upcoming Nov 27, 3:00 PM Women's · Fresno State vs Louisiana at Monroe | ",
 "Upcoming Nov 28, 12:30 PM Women's · Fresno State vs UT Arlington | ",
 "Upcoming Dec 2, 6:00 PM Women's · Fresno State at San Diego | ",
 "Upcoming Dec 5, 2:30 PM Women's · Fresno State vs Saint Mary's | ",
 "Upcoming Dec 11, 6:30 PM Women's · Fresno State vs Southern Mississippi | ",
 "Upcoming Dec 13, 2:00 PM Women's · Fresno State vs Grambling State | ",
 "Upcoming Dec 20, 2:00 PM Women's · Fresno State vs Texas A&M - Corpus Christi | ",
 "Upcoming Dec 22, 1:00 PM Women's · Fresno State vs Hawaii | ",
 "Upcoming Dec 28, 10:00 AM Women's · Fresno State at Bowling Green | ",
 "Upcoming Dec 30, 3:30 PM Women's · Fresno State at Ball State | ",
 "Upcoming Jan 7 Women's · Fresno State at Colorado State | ",
 "Upcoming Jan 9 Women's · Fresno State vs Gonzaga | ",
 "Upcoming Jan 16 Women's · Fresno State vs Utah State | ",
 "Upcoming Jan 20 Women's · Fresno State at Texas State | ",
 "Upcoming Jan 23, 8:00 PM Women's · Fresno State vs Oregon State | ",
 "Upcoming Jan 28 Women's · Fresno State at Washington State | ",
 "Upcoming Jan 31 Women's · Fresno State at Gonzaga | ",
 "Upcoming Feb 3 Women's · Fresno State vs Boise State | ",
 "Upcoming Feb 7 Women's · Fresno State vs Colorado State | ",
 "Upcoming Feb 10 Women's · Fresno State at San Diego State | ",
 "Upcoming Feb 13 Women's · Fresno State at Utah State | ",
 "Upcoming Feb 17 Women's · Fresno State vs Texas State | ",
 "Upcoming Feb 24 Women's · Fresno State vs Washington State | ",
 "Upcoming Feb 27 Women's · Fresno State vs San Diego State | ",
 "Upcoming Mar 3 Women's · Fresno State at Oregon State | ",
 "Upcoming Mar 6 Women's · Fresno State at Boise State | ",
 "Upcoming Mar 9 Women's · Fresno State at Pac-12 Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 3 Fresno State at Gaucho Twilight | W4k - 4th / M6k - 3rd",
 "Final Sep 19 Fresno State at Riverside Invitational | W6k - 13th / M8k - 4th",
 "Final Oct 3 Fresno State at Charles Bowles Invitational | W5k - 4th / M8k - 9th",
 "Final Oct 17 Fresno State at Bronco Invitational | Completed",
 "Upcoming Oct 30 Fresno State at Pac-12 Championship | ",
 "Upcoming Nov 13 Fresno State at NCAA West Regional | ",
 "Upcoming Nov 21 Fresno State at NCAA Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Oct 8 Fresno State at TCU | L, 4-15",
 "Final Oct 9 Fresno State at Baylor | L, 9-11",
 "Final Oct 17 Fresno State vs Oklahoma State | W, 11-8",
 "Upcoming Oct 29 Fresno State at South Carolina | ",
 "Upcoming Oct 30 Fresno State at Georgia | ",
 "Upcoming Oct 31 Fresno State at Auburn | ",
 "Upcoming Nov 14 Fresno State vs SMU | ",
 "Upcoming Feb 5 Fresno State vs TCU | ",
 "Upcoming Feb 6 Fresno State vs Delaware State | ",
 "Upcoming Feb 20 Fresno State vs Baylor | ",
 "Upcoming Mar 5 Fresno State at Oklahoma State | ",
 "Upcoming Mar 26 Fresno State at Big 12 Conference Championship | ",
 "Upcoming Apr 15 Fresno State at NCEA National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Fresno State at USC | L, 0-39",
 "Final Sep 12 Fresno State vs Sacramento State | W, 49-3",
 "Final Sep 19 Fresno State at San Jose State | W, 26-10",
 "Final Sep 26 Fresno State vs Rice | W, 38-24",
 "Final Oct 3 Fresno State at Washington State | W, 26-6",
 "Final Oct 10 Fresno State vs Boise State | L, 31-38",
 "Final Oct 17 Fresno State at San Diego State | L, 23-26",
 "Upcoming Oct 31, 8:00 PM Fresno State vs Oregon State | ",
 "Upcoming Nov 7, 6:30 PM Fresno State at Utah State | ",
 "Upcoming Nov 14, 1:00 PM Fresno State at Texas State | ",
 "Upcoming Nov 21, 4:30 PM Fresno State vs Colorado State | ",
 "Upcoming Nov 28 Fresno State vs Flex Game - TBD | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Fresno State at Branch Law Firm/McGuire Invitational | 8th of 13",
 "Final Sep 21 Women's · Fresno State at Kalispel Invitational | 3rd of 14",
 "Final Oct 5 Women's · Fresno State at Harbottle Invitational | 7th of 16",
 "Final Oct 12 Women's · Fresno State at Golf Iconic Invitational | 5th of 19",
 "Upcoming Oct 25 Women's · Fresno State at Clash at Boulder Creek | ",
 "Upcoming Feb 15 Women's · Fresno State at The Molly | ",
 "Upcoming Feb 22 Women's · Fresno State at Bruin Wave Intercollegiate | ",
 "Upcoming Mar 8 Women's · Fresno State at Fresno State Classic | ",
 "Upcoming Mar 21 Women's · Fresno State at The Nashville Invitational | ",
 "Upcoming Apr 6 Women's · Fresno State at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 25 Women's · Fresno State at PAC-12 Championships | ",
 "Upcoming May 10 Women's · Fresno State at NCAA Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Fresno State at Bombs Darts Birds Collegiate | 13th of 13",
 "Final Sep 21 Men's · Fresno State at CDA National Reserve Invitational | 13th of 16",
 "Final Oct 12 Men's · Fresno State at Visit Stockton Pacific Invitational | 7th of 18",
 "Upcoming Oct 19 Men's · Fresno State at St. Mary's Invitational | ",
 "Upcoming Feb 1 Men's · Fresno State at N.I.T. | ",
 "Upcoming Feb 11 Men's · Fresno State at John Burns Intercollegiate | ",
 "Upcoming Mar 1 Men's · Fresno State at The Watney Invite | ",
 "Upcoming Mar 8 Men's · Fresno State at The Lamkin | ",
 "Upcoming Mar 22 Men's · Fresno State at UCLA | ",
 "Upcoming Apr 19 Men's · Fresno State at Seattle U Redhawk Invitational | ",
 "Upcoming Apr 30 Men's · Fresno State at PAC-12 Championships | ",
 "Upcoming May 18 Men's · Fresno State at NCAA Regionals | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Fresno State vs UC Davis | L, 0-2",
 "Final Aug 16 Fresno State at Saint Mary's | L, 0-4",
 "Final Aug 20 Fresno State vs Long Beach State | L, 0-5",
 "Final Aug 23 Fresno State at UC Santa Barbara | L, 0-4",
 "Final Sep 3 Fresno State vs Sacramento State | T, 1-1",
 "Final Sep 6 Fresno State vs Texas A&M - Corpus Christi | W, 2-0",
 "Final Sep 10 Fresno State vs Pepperdine | L, 0-4",
 "Final Sep 13 Fresno State at Santa Clara | L, 0-4",
 "Final Sep 17 Fresno State at UC Irvine | L, 1-4",
 "Final Sep 20 Fresno State vs CSU Bakersfield | T, 2-2",
 "Final Sep 27 Fresno State at Cal | L, 0-2",
 "Final Oct 1 Fresno State vs Colorado State | L, 1-2",
 "Final Oct 4 Fresno State at Washington State | L, 0-4",
 "Final Oct 8 Fresno State vs Boise State | L, 0-4",
 "Final Oct 11 Fresno State at Gonzaga | L, 0-6",
 "Final Oct 17 Fresno State at Utah State | T, 0-0",
 "Upcoming Oct 22, 7:00 PM Fresno State vs Oregon State | ",
 "Upcoming Oct 25, 12:00 PM Fresno State at San Diego State | ",
 "Upcoming Nov 5, 7:00 PM Fresno State vs Texas State | ",
 "Upcoming Nov 11 Fresno State at Pac-12 Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 25, 11:00 AM Fresno State at CSU Bakersfield (Exhibition) (Game 1) | ",
 "Upcoming Oct 25, 2:00 PM Fresno State at CSU Bakersfield (Exhibition) (Game 2) | ",
 "Upcoming Oct 30, 6:00 PM Fresno State vs Reedley (Exhibition) | ",
 "Upcoming Mar 25 Fresno State vs Colorado State | ",
 "Upcoming Mar 26 Fresno State vs Colorado State | ",
 "Upcoming Mar 27 Fresno State vs Colorado State | ",
 "Upcoming Apr 2 Fresno State at Oregon State | ",
 "Upcoming Apr 3 Fresno State at Oregon State | ",
 "Upcoming Apr 4 Fresno State at Oregon State | ",
 "Upcoming Apr 16 Fresno State vs Texas State | ",
 "Upcoming Apr 17 Fresno State vs Texas State | ",
 "Upcoming Apr 18 Fresno State vs Texas State | ",
 "Upcoming Apr 23 Fresno State at Utah State | ",
 "Upcoming Apr 24 Fresno State at Utah State | ",
 "Upcoming Apr 25 Fresno State at Utah State | ",
 "Upcoming Apr 30 Fresno State at San Diego State | ",
 "Upcoming May 1 Fresno State at San Diego State | ",
 "Upcoming May 2 Fresno State at San Diego State | ",
 "Upcoming May 6 Fresno State vs Boise State | ",
 "Upcoming May 7 Fresno State vs Boise State | ",
 "Upcoming May 8 Fresno State vs Boise State | ",
 "Upcoming May 12 Fresno State at Pac-12 Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Fresno State at Gary Ota Memorial Invite | Completed",
 "Upcoming Oct 23, 6:00 PM Fresno State vs CSU Bakersfield | ",
 "Upcoming Nov 6, 5:00 PM Fresno State at Washington State | ",
 "Upcoming Nov 7, 11:00 AM Fresno State at Idaho | ",
 "Upcoming Nov 17 Fresno State at Hawkeye Invitational | ",
 "Upcoming Dec 2 Fresno State at USA Swimming | ",
 "Upcoming Dec 5, 12:00 PM Fresno State vs Fresno Pacific | ",
 "Upcoming Jan 8 Fresno State at UCLA Diving Invitational | ",
 "Upcoming Jan 9, 10:00 AM Fresno State at San Diego State | ",
 "Upcoming Jan 16, 12:00 PM Fresno State at UC Davis | ",
 "Upcoming Jan 23, 12:00 PM Fresno State vs San Jose State | ",
 "Upcoming Jan 28 Fresno State at Air Force Diving Invitational | ",
 "Upcoming Jan 30, 12:00 PM Fresno State vs Cal Baptist | ",
 "Upcoming Feb 24 Fresno State at Pac-12 Championships | ",
 "Upcoming Mar 8 Fresno State at NCAA Diving Zones | ",
 "Upcoming Mar 11 Fresno State at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Fresno State at NCAA Swim & Dive Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Fresno State at Cal Poly Invite | Completed",
 "Final Oct 2 Fresno State at San Diego Veterans Tennis Classic | Completed",
 "Final Oct 8 Fresno State at ITA Regional Championship | Completed",
 "Upcoming Oct 23 Fresno State at Pac-12 Fall Qualifier | ",
 "Upcoming Oct 30 Fresno State at Dennis Rizza Collegiate | ",
 "Upcoming Nov 13 Fresno State at Pomona Invite | ",
 "Upcoming Nov 17 Fresno State at NCAA | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Fresno State vs Northern Kentucky | L, 2-3",
 "Final Aug 29 Fresno State at Ohio State | L, 0-3",
 "Final Aug 30 Fresno State vs Bowling Green | L, 0-3",
 "Final Sep 3 Fresno State vs Southern Utah | W, 3-0",
 "Final Sep 4 Fresno State vs New Mexico State | L, 1-3",
 "Final Sep 5 Fresno State vs UC Irvine | W, 3-1",
 "Final Sep 11 Fresno State vs San Francisco | W, 3-2",
 "Final Sep 12 Fresno State vs UNLV | L, 2-3",
 "Final Sep 13 Fresno State at CSUN | L, 0-3",
 "Final Sep 18 Fresno State vs New Mexico | W, 3-1",
 "Final Sep 19 Fresno State at Saint Mary's | W, 3-2",
 "Final Sep 24 Fresno State vs Washington State | L, 0-3",
 "Final Sep 26 Fresno State vs San Diego State | L, 0-3",
 "Final Oct 1 Fresno State at Utah State | L, 1-3",
 "Final Oct 3 Fresno State at Oregon State | L, 2-3",
 "Final Oct 10 Fresno State vs Boise State | L, 0-3",
 "Final Oct 15 Fresno State at Gonzaga | W, 3-2",
 "Final Oct 17 Fresno State at Washington State | W, 3-2",
 "Upcoming Oct 22, 6:00 PM Fresno State vs Oregon State | ",
 "Upcoming Oct 29, 6:00 PM Fresno State vs Colorado State | ",
 "Upcoming Oct 31, 1:00 PM Fresno State vs Gonzaga | ",
 "Upcoming Nov 5, 6:00 PM Fresno State at San Diego State | ",
 "Upcoming Nov 7, 11:00 AM Fresno State at Texas State | ",
 "Upcoming Nov 12, 5:00 PM Fresno State at Colorado State | ",
 "Upcoming Nov 14, 11:00 AM Fresno State at Boise State | ",
 "Upcoming Nov 17, 6:00 PM Fresno State vs Utah State | ",
 "Upcoming Nov 19, 6:00 PM Fresno State vs Texas State | ",
 "Upcoming Nov 23 Fresno State at Pac-12 Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: TFRRS names the Riverside Invitational (Sep 19) "UCR XC
// Invite - 45th Annual": the teams' only meet that day (onlyMeetThatDay).
// Mutation: without it the card kept "W6k - 13th / M8k - 4th".
{
  fromTfrrs(FRESNO_STATE_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Gaucho Twilight","Women's team: 4th · 115 pts / Men's team: 3rd · 83 pts",true],["Riverside Invitational","Women's team: 13th · 363 pts / Men's team: 4th · 174 pts",true],["Charles Bowles Invitational","Women's team: 4th · 103 pts / Men's team: 9th · 247 pts",true],["Bronco Invitational","Women's team: 6th · 190 pts / Men's team: 10th · 307 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Equestrian at TCU (Oct 8): the schedule links the football game-day story;
// a story whose address names another sport is not the meet's (shared
// reader), and the meet takes its own from the archive ("'Dogs drop season
// opener at No. 6 TCU", 15-4). Mutation: without the rule the football story
// stayed; without DUAL in the archive rule it stayed storyless.
{
  const event=parse('Equestrian','equestrian').find(e=>e.opponent==='TCU'&&e.status==='Final');
  assert.equal(event.headline,'L, 4-15');assert.ok(!event.recap_url);
  recapFixtures.set('https://gobulldogs.com/sports/equestrian/archives',fixture('equestrian-archives.html.gz'));
  const story='https://gobulldogs.com/news/2026/10/8/equestrian-dogs-drop-season-opener-at-no-6-tcu';
  recapFixtures.set(story,fixture('story-2026-10-8-equestrian-dogs-drop-season-opener-at-no.html.gz'));
  assert.ok(worker.fresnoStateHandlers.isFinalWithoutStory(event));
  await worker.fresnoStateHandlers.attachArchiveStory(event);
  assert.equal(event.recap_url,story);
  // The archive also reads the next day's Baylor story (not saved here).
  assert.ok(requests.every(url=>recapFixtures.has(url)||url.endsWith('/2026/10/9/equestrian-dogs-fall-at-no-9-baylor-in-close-contest')),'only the archive and that day\'s stories are read');
  recapFixtures.clear();requests.length=0;
}
// Swimming's Alumni Meet (Oct 10, an exhibition, no result) is internal, and
// the women-only page is not labeled by team.
{
  const swim=parse('Swimming & Diving','womens-swimming-and-diving');
  assert.ok(!swim.some(e=>/alumni/i.test(e.opponent)));
  assert.ok(swim.every(e=>!/^Women's ·/.test(e.title)));
}
// The official NIL marketplace the site links (gobulldogs.com/feature/NIL).
assert.deepEqual(fresnoStateSchool.opendorse,{marketplace:'fresnostate-bulldogs',team:'Fresno State Bulldogs'});

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Fresno State module checks passed');
