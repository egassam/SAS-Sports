import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utahStateSchool} from '../src/schools/utah-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,utahStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utah-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utahstateaggies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['utah-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',utahStateSchool.scheduleUrls],['roster',utahStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utah-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utahstateaggies.com',`${key} must stay on utahstateaggies.com`);
  }
}
const parity={"Basketball":{"schedule":["https://utahstateaggies.com/sports/mens-basketball/schedule","https://utahstateaggies.com/sports/womens-basketball/schedule"],"roster":["https://utahstateaggies.com/sports/mens-basketball/roster","https://utahstateaggies.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utahstateaggies.com/sports/cross-country/schedule"],"roster":["https://utahstateaggies.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://utahstateaggies.com/sports/football/schedule"],"roster":["https://utahstateaggies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utahstateaggies.com/sports/mens-golf/schedule"],"roster":["https://utahstateaggies.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://utahstateaggies.com/sports/womens-gymnastics/schedule"],"roster":["https://utahstateaggies.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://utahstateaggies.com/sports/womens-soccer/schedule"],"roster":["https://utahstateaggies.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://utahstateaggies.com/sports/softball/schedule"],"roster":["https://utahstateaggies.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://utahstateaggies.com/sports/womens-tennis/schedule","https://utahstateaggies.com/sports/mens-tennis/schedule"],"roster":["https://utahstateaggies.com/sports/womens-tennis/roster","https://utahstateaggies.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://utahstateaggies.com/sports/track-and-field/schedule"],"roster":["https://utahstateaggies.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://utahstateaggies.com/sports/womens-volleyball/schedule"],"roster":["https://utahstateaggies.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'utah-state|"+sport+"':"),`${sport} routes must live in the Utah State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-19T15:00:00Z");
const page=slug=>`https://utahstateaggies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utahStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utah-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 10 Men's · Utah State vs Denver (Exhibition) | W, 86-76",
 "Final Oct 17 Men's · Utah State at Saint Mary's (Exhibition) | W, 97-89",
 "Upcoming Oct 24, 2:00 PM Men's · Utah State vs Santa Clara (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Utah State vs Idaho State | ",
 "Upcoming Nov 7, 2:00 PM Men's · Utah State vs Omaha | ",
 "Upcoming Nov 10, 7:00 PM Men's · Utah State vs Utah Tech | ",
 "Upcoming Nov 13, 8:00 PM Men's · Utah State vs UC San Diego | ",
 "Upcoming Nov 18, 7:00 PM Men's · Utah State vs Weber State | ",
 "Upcoming Nov 25, 5:00 PM Men's · Utah State vs SMU | ",
 "Upcoming Nov 26, 2:30 PM Men's · Utah State vs USC | ",
 "Upcoming Nov 29, 12:00 PM Men's · Utah State at New Mexico | ",
 "Upcoming Dec 5, 4:30 PM Men's · Utah State vs Montana | ",
 "Upcoming Dec 9, 8:00 PM Men's · Utah State at BYU | ",
 "Upcoming Dec 12, 8:00 PM Men's · Utah State vs Winthrop | ",
 "Upcoming Dec 19, 6:30 PM Men's · Utah State vs Tulsa | ",
 "Upcoming Dec 21, 4:30 PM Men's · Utah State vs George Washington | ",
 "Upcoming Dec 29, 7:00 PM Men's · Utah State vs Pacific | ",
 "Upcoming Jan 1, 2:00 PM Men's · Utah State vs Westminster | ",
 "Upcoming Jan 6, 8:00 PM Men's · Utah State vs Boise State | ",
 "Upcoming Jan 10, 11:00 AM Men's · Utah State at Texas State | ",
 "Upcoming Jan 16, 4:45 PM Men's · Utah State at Oregon State | ",
 "Upcoming Jan 21, 6:00 PM Men's · Utah State vs Gonzaga | ",
 "Upcoming Jan 23, 4:45 PM Men's · Utah State vs Washington State | ",
 "Upcoming Jan 27, 8:00 PM Men's · Utah State at Boise State | ",
 "Upcoming Jan 30, 2:45 PM Men's · Utah State vs Oregon State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Utah State at San Diego State | ",
 "Upcoming Feb 6, 4:45 PM Men's · Utah State at Fresno State | ",
 "Upcoming Feb 10 Men's · Utah State vs Colorado State | ",
 "Upcoming Feb 13, 6:00 PM Men's · Utah State at Gonzaga | ",
 "Upcoming Feb 17, 6:00 PM Men's · Utah State vs San Diego State | ",
 "Upcoming Feb 20 Men's · Utah State at Memphis | ",
 "Upcoming Feb 25, 8:00 PM Men's · Utah State at Colorado State | ",
 "Upcoming Feb 27, 4:30 PM Men's · Utah State vs Fresno State | ",
 "Upcoming Mar 3, 6:00 PM Men's · Utah State vs Texas State | ",
 "Upcoming Mar 6, 6:00 PM Men's · Utah State at Washington State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 4:00 PM Women's · Utah State at Grand Canyon (Exhibition) | ",
 "Upcoming Nov 2, 4:00 PM Women's · Utah State vs Westminster | ",
 "Upcoming Nov 6, 2:00 PM Women's · Utah State vs LMU | ",
 "Upcoming Nov 8, 6:00 PM Women's · Utah State at USC | ",
 "Upcoming Nov 11, 4:00 PM Women's · Utah State vs Idaho State | ",
 "Upcoming Nov 13, 11:00 AM Women's · Utah State vs Bethune-Cookman | ",
 "Upcoming Nov 18, 2:00 PM Women's · Utah State at BYU | ",
 "Upcoming Nov 22, 1:30 PM Women's · Utah State at TCU | ",
 "Upcoming Nov 27, 5:30 PM Women's · Utah State vs Wyoming | ",
 "Upcoming Nov 28, 5:30 PM Women's · Utah State at UC Irvine | ",
 "Upcoming Dec 1, 7:00 PM Women's · Utah State at Utah | ",
 "Upcoming Dec 5, 12:00 PM Women's · Utah State vs San Jose State | ",
 "Upcoming Dec 9, 6:00 PM Women's · Utah State at Utah Valley | ",
 "Upcoming Dec 12, 12:00 PM Women's · Utah State vs Weber State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Utah State at Idaho | ",
 "Upcoming Dec 19, 12:00 PM Women's · Utah State vs San Diego | ",
 "Upcoming Jan 6 Women's · Utah State at San Diego State | ",
 "Upcoming Jan 9, 9:00 PM Women's · Utah State vs Oregon State | ",
 "Upcoming Jan 13, 7:00 PM Women's · Utah State vs Colorado State | ",
 "Upcoming Jan 16 Women's · Utah State at Fresno State | ",
 "Upcoming Jan 20, 7:00 PM Women's · Utah State vs Boise State | ",
 "Upcoming Jan 23, 12:00 PM Women's · Utah State vs Washington State | ",
 "Upcoming Jan 28 Women's · Utah State at Gonzaga | ",
 "Upcoming Jan 30 Women's · Utah State at Oregon State | ",
 "Upcoming Feb 3, 7:00 PM Women's · Utah State vs Texas State | ",
 "Upcoming Feb 11 Women's · Utah State at Boise State | ",
 "Upcoming Feb 13, 12:00 PM Women's · Utah State vs Fresno State | ",
 "Upcoming Feb 17 Women's · Utah State at Colorado State | ",
 "Upcoming Feb 20 Women's · Utah State at Texas State | ",
 "Upcoming Feb 24, 7:00 PM Women's · Utah State vs San Diego State | ",
 "Upcoming Feb 27 Women's · Utah State vs Gonzaga | ",
 "Upcoming Mar 3 Women's · Utah State at Washington State | ",
 "Upcoming Mar 9 Women's · Utah State at Pac-12 Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Utah State at Utah State Alumni Challenge | Women's team: 1st of 3 · 15 pts / Men's team: 1st of 4 · 25 pts",
 "Final Sep 19 Utah State at John McNichols Invitational | Men's team: 13th of 34 · 328 pts",
 "Final Sep 25 Utah State at Gans Creek Classic | Women's team: 10th of 29 · 291 pts",
 "Final Oct 2 Utah State at Bengal Invitational | Women's team: 2nd of 3 · 52 pts / Men's team: 1st of 3 · 15 pts",
 "Final Oct 9 Utah State at Steve T. Reeder Memorial Invitational | Women's team: 1st of 3 · 30 pts / Men's team: 1st of 5 · 20 pts",
 "Final Oct 16 Utah State at Under Armour Pre-National Invitational | Women's team: 21st of 43 · 562 pts / Men's team: 13th of 44 · 342 pts",
 "Upcoming Oct 30 Utah State at Pac-12 Championships | ",
 "Upcoming Nov 13 Utah State at NCAA Mountain Regionals | ",
 "Upcoming Nov 21 Utah State at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Utah State vs Idaho State | L, 17-29",
 "Final Sep 12 Utah State at Washington | L, 14-16",
 "Final Sep 19 Utah State at Utah | L, 0-33",
 "Final Sep 26 Utah State vs Troy | W, 21-10",
 "Final Oct 3 Utah State at Boise State | L, 18-37",
 "Final Oct 9 Utah State vs Washington State | W, 17-16",
 "Upcoming Oct 24, 5:30 PM Utah State at Texas State | ",
 "Upcoming Oct 31, 1:30 PM Utah State vs Colorado State | ",
 "Upcoming Nov 7, 7:30 PM Utah State vs Fresno State | ",
 "Upcoming Nov 14, 7:30 PM Utah State at San Diego State | ",
 "Upcoming Nov 21, 8:30 PM Utah State at Oregon State | ",
 "Upcoming Dec 4, 6:00 PM Utah State vs Pac-12 Championship Game | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Utah State at Ram Masters Invitational | 9th of 16",
 "Final Sep 19 Utah State at Gene Miranda Falcon Invitational | 4th of 18",
 "Final Sep 29 Utah State at Mark Simpson Colorado Invitational | 13th of 17",
 "Final Oct 5 Utah State at Oregon State Invitational | T5th of 12",
 "Upcoming Oct 26 Utah State at Monterrey International Invitational | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Utah State at Kansas | L, 0-2",
 "Final Aug 16 Utah State vs Michigan | T, 2-2",
 "Final Aug 20 Utah State vs Portland | W, 2-0",
 "Final Aug 24 Utah State at Utah Valley | W, 1-0",
 "Final Aug 27 Utah State at Utah | W, 1-0",
 "Final Sep 3 Utah State vs Utah Tech | W, 8-1",
 "Final Sep 6 Utah State at Colorado | L, 0-2",
 "Final Sep 10 Utah State vs BYU | W, 4-0",
 "Final Sep 13 Utah State vs South Dakota State | W, 3-0",
 "Final Sep 17 Utah State at Idaho State | W, 6-0",
 "Final Sep 20 Utah State vs Saint Mary's | T, 1-1",
 "Final Oct 1 Utah State vs Texas State | W, 2-1",
 "Final Oct 4 Utah State at Colorado State | W, 3-0",
 "Final Oct 8 Utah State vs Washington State | W, 2-0",
 "Final Oct 11 Utah State at Boise State | W, 1-0",
 "Final Oct 17 Utah State vs Fresno State | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Utah State at Gonzaga | ",
 "Upcoming Oct 30, 7:00 PM Utah State at Oregon State | ",
 "Upcoming Nov 5, 7:30 PM Utah State vs San Diego State | ",
 "Upcoming Nov 11 Utah State vs Pac-12 Semifinals | ",
 "Upcoming Nov 14, 7:30 PM Utah State at Pac-12 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 4:00 PM Utah State vs Utah Valley (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Utah State at Jon Messick Invitational | Completed",
 "Final Sep 25 Women's · Utah State at Bedford Cup | Completed",
 "Final Oct 13 Women's · Utah State at ITA Regionals | Completed",
 "Upcoming Oct 23 Women's · Utah State at Pac-12 Individual Championship | ",
 "Upcoming Nov 6 Women's · Utah State at Watanabe Classic | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Utah State at Dar Walters Fall Classic | Completed",
 "Final Oct 1 Men's · Utah State at Utah Invite | Completed",
 "Final Oct 6 Men's · Utah State at ITA Regionals | Completed",
 "Upcoming Oct 23 Men's · Utah State at Pac-12 Qualifier | ",
 "Upcoming Nov 6 Men's · Utah State at Easley Memorial Classic | ",
 "Upcoming Nov 13 Men's · Utah State at LMU Invite | ",
 "Upcoming Nov 17 Men's · Utah State at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Utah State at Kentucky | L, 0-3",
 "Final Aug 29 Utah State vs Eastern Kentucky | L, 1-3",
 "Final Aug 30 Utah State vs South Florida | L, 0-3",
 "Final Sep 4 Utah State vs Iowa State | L, 1-3",
 "Final Sep 5 Utah State at UC Santa Barbara | L, 1-3",
 "Final Sep 9 Utah State vs UCLA | L, 0-3",
 "Final Sep 11 Utah State vs Utah | L, 0-3",
 "Final Sep 15 Utah State at Weber State | L, 2-3",
 "Final Sep 17 Utah State vs Utah Valley | W, 3-1",
 "Final Sep 19 Utah State at BYU | L, 0-3",
 "Final Sep 24 Utah State at Texas State | L, 0-3",
 "Final Sep 26 Utah State vs Gonzaga | W, 3-1",
 "Final Oct 1 Utah State vs Fresno State | W, 3-1",
 "Final Oct 3 Utah State vs Colorado State | L, 2-3",
 "Final Oct 8 Utah State vs Boise State | L, 1-3",
 "Final Oct 15 Utah State at San Diego State | L, 2-3",
 "Final Oct 17 Utah State at Colorado State | L, 0-3",
 "Upcoming Oct 22, 6:00 PM Utah State at Boise State | ",
 "Upcoming Oct 24, 1:00 PM Utah State at Oregon State | ",
 "Upcoming Oct 29, 7:00 PM Utah State vs Washington State | ",
 "Upcoming Nov 4, 7:00 PM Utah State vs Texas State | ",
 "Upcoming Nov 6, 7:00 PM Utah State vs Oregon State | ",
 "Upcoming Nov 12, 7:00 PM Utah State at Washington State | ",
 "Upcoming Nov 14, 1:00 PM Utah State at Gonzaga | ",
 "Upcoming Nov 17, 7:00 PM Utah State at Fresno State | ",
 "Upcoming Nov 19, 7:00 PM Utah State vs San Diego State | ",
 "Upcoming Nov 23 Utah State at Pac-12 Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf cards: the place in the field, then the team total and score to par
// ("4th/18  (858, -6)", "9th of 16 (865, +25)", "T-5th/12  (843, -9)").
// Mutation: without the rule the Gene Miranda Falcon Invitational reads
// "Completed".
{
  const results=name=>parse('Golf','mens-golf').find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('Gene Miranda Falcon Invitational'),["Result: 4th of 18","Team score: 858 (-6)"]);
  assert.deepEqual(results('Ram Masters Invitational'),["Result: 9th of 16","Team score: 865 (+25)"]);
  assert.deepEqual(results('Oregon State Invitational'),["Result: T5th of 12","Team score: 843 (-9)"]);
}
// Cross country's two teams on one line: "M: 1/3, 15 pts; W: 2/3, 52 pts".
assert.deepEqual(parse('Cross Country','cross-country').find(e=>/Bengal/.test(e.opponent)).results.map(r=>`${r.label}: ${r.value}`),["Women's team: 2nd of 3 · 52 pts","Men's team: 1st of 3 · 15 pts"]);
// Missing team pages answered with the site's generic page are not routes;
// Golf (men's only) and Gymnastics (women's only) are single teams.
assert.equal(utahStateSchool.scheduleUrls['utah-state|Golf'],'https://utahstateaggies.com/sports/mens-golf/schedule');
assert.ok(!utahStateSchool.combinedSports.has('Golf')&&!utahStateSchool.combinedSports.has('Gymnastics'));
assert.deepEqual(utahStateSchool.inflcr,{school:'utah-state-university'});

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Utah State module checks passed');
