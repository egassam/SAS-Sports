import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {gonzagaSchool} from '../src/schools/gonzaga.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='gonzaga');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,gonzagaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/gonzaga-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gozags.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['gonzaga'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',gonzagaSchool.scheduleUrls],['roster',gonzagaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('gonzaga|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gozags.com',`${key} must stay on gozags.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gozags.com/sports/baseball/schedule"],"roster":["https://gozags.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gozags.com/sports/mens-basketball/schedule","https://gozags.com/sports/womens-basketball/schedule"],"roster":["https://gozags.com/sports/mens-basketball/roster","https://gozags.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gozags.com/sports/cross-country/schedule"],"roster":["https://gozags.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gozags.com/sports/womens-golf/schedule","https://gozags.com/sports/mens-golf/schedule"],"roster":["https://gozags.com/sports/womens-golf/roster","https://gozags.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://gozags.com/sports/womens-rowing/schedule","https://gozags.com/sports/mens-rowing/schedule"],"roster":["https://gozags.com/sports/womens-rowing/roster","https://gozags.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://gozags.com/sports/womens-soccer/schedule","https://gozags.com/sports/mens-soccer/schedule"],"roster":["https://gozags.com/sports/womens-soccer/roster","https://gozags.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://gozags.com/sports/womens-tennis/schedule","https://gozags.com/sports/mens-tennis/schedule"],"roster":["https://gozags.com/sports/womens-tennis/roster","https://gozags.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gozags.com/sports/track-and-field/schedule"],"roster":["https://gozags.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gozags.com/sports/womens-volleyball/schedule"],"roster":["https://gozags.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'gonzaga|"+sport+"':"),`${sport} routes must live in the Gonzaga module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-18T15:00:00Z");
const page=slug=>`https://gozags.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.gonzagaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=gonzaga)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Apr 9 Gonzaga at Texas State | ",
 "Upcoming Apr 10 Gonzaga at Texas State | ",
 "Upcoming Apr 11 Gonzaga at Texas State | ",
 "Upcoming Apr 16 Gonzaga vs Fresno State | ",
 "Upcoming Apr 17 Gonzaga vs Fresno State | ",
 "Upcoming Apr 18 Gonzaga vs Fresno State | ",
 "Upcoming Apr 23 Gonzaga vs Oregon State | ",
 "Upcoming Apr 24 Gonzaga vs Oregon State | ",
 "Upcoming Apr 25 Gonzaga vs Oregon State | ",
 "Upcoming Apr 30 Gonzaga at Washington State | ",
 "Upcoming May 1 Gonzaga at Washington State | ",
 "Upcoming May 2 Gonzaga at Washington State | ",
 "Upcoming May 7 Gonzaga vs Dallas Baptist | ",
 "Upcoming May 8 Gonzaga vs Dallas Baptist | ",
 "Upcoming May 9 Gonzaga vs Dallas Baptist | ",
 "Upcoming May 20 Gonzaga at San Diego State | ",
 "Upcoming May 21 Gonzaga at San Diego State | ",
 "Upcoming May 22 Gonzaga at San Diego State | ",
 "Upcoming May 27 Gonzaga at Pac-12 Baseball Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 1:00 PM Men's · Gonzaga at Arkansas (Exhibition) | ",
 "Upcoming Oct 28, 6:00 PM Men's · Gonzaga vs Lewis-Clark State (Exhibition) | ",
 "Upcoming Nov 2, 4:30 PM Men's · Gonzaga vs Purdue | ",
 "Upcoming Nov 7, 2:00 PM Men's · Gonzaga vs New Mexico State | ",
 "Upcoming Nov 14, 12:30 PM Men's · Gonzaga vs LSU | ",
 "Upcoming Nov 17, 8:00 PM Men's · Gonzaga vs Montana State | ",
 "Upcoming Nov 24, 9:30 PM Men's · Gonzaga vs Kansas State | ",
 "Upcoming Nov 26 Men's · Gonzaga vs Alabama or Baylor | ",
 "Upcoming Nov 27 Men's · Gonzaga at Players Era 16 | ",
 "Upcoming Dec 2, 7:00 PM Men's · Gonzaga vs Eastern Oregon | ",
 "Upcoming Dec 5, 8:30 PM Men's · Gonzaga vs UCLA | ",
 "Upcoming Dec 9, 6:00 PM Men's · Gonzaga vs Incarnate Word | ",
 "Upcoming Dec 12, 7:00 PM Men's · Gonzaga at Creighton | ",
 "Upcoming Dec 19, 2:00 PM Men's · Gonzaga vs Michigan State | ",
 "Upcoming Dec 31, 5:00 PM Men's · Gonzaga vs Cornell | ",
 "Upcoming Jan 6, 6:00 PM Men's · Gonzaga at Washington State | ",
 "Upcoming Jan 9 Men's · Gonzaga vs Colorado State | ",
 "Upcoming Jan 13, 8:00 PM Men's · Gonzaga at Fresno State | ",
 "Upcoming Jan 16 Men's · Gonzaga vs Boise State | ",
 "Upcoming Jan 21, 5:00 PM Men's · Gonzaga at Utah State | ",
 "Upcoming Jan 24, 11:00 AM Men's · Gonzaga at Oregon State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Gonzaga vs Fresno State | ",
 "Upcoming Jan 30, 11:00 AM Men's · Gonzaga vs Oregon | ",
 "Upcoming Feb 4, 7:00 PM Men's · Gonzaga vs Texas State | ",
 "Upcoming Feb 6, 3:30 PM Men's · Gonzaga at San Diego State | ",
 "Upcoming Feb 10, 5:00 PM Men's · Gonzaga at Boise State | ",
 "Upcoming Feb 13, 5:00 PM Men's · Gonzaga vs Utah State | ",
 "Upcoming Feb 17, 7:00 PM Men's · Gonzaga vs Washington State | ",
 "Upcoming Feb 20, 5:00 PM Men's · Gonzaga vs Duke | ",
 "Upcoming Feb 25, 5:00 PM Men's · Gonzaga at Texas State | ",
 "Upcoming Feb 27, 1:00 PM Men's · Gonzaga vs San Diego State | ",
 "Upcoming Mar 3, 6:00 PM Men's · Gonzaga vs Oregon State | ",
 "Upcoming Mar 6, 5:30 PM Men's · Gonzaga at Colorado State | ",
 "Upcoming Mar 9 Men's · Gonzaga at Pac-12 Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · Gonzaga vs Westmont College (Calif.) (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Gonzaga vs North Dakota State | ",
 "Upcoming Nov 6, 6:00 PM Women's · Gonzaga vs Idaho | ",
 "Upcoming Nov 8, 2:00 PM Women's · Gonzaga vs UC Riverside | ",
 "Upcoming Nov 13, 5:00 PM Women's · Gonzaga at Grand Canyon | ",
 "Upcoming Nov 15, 2:00 PM Women's · Gonzaga at Stanford | ",
 "Upcoming Nov 18, 6:00 PM Women's · Gonzaga vs Montana | ",
 "Upcoming Nov 21, 4:00 PM Women's · Gonzaga vs Hawaii | ",
 "Upcoming Nov 23, 2:00 PM Women's · Gonzaga vs California | ",
 "Upcoming Nov 29, 2:00 PM Women's · Gonzaga at Eastern Washington | ",
 "Upcoming Dec 4, 6:00 PM Women's · Gonzaga vs Yale | ",
 "Upcoming Dec 6, 1:00 PM Women's · Gonzaga at Arizona State | ",
 "Upcoming Dec 10, 6:00 PM Women's · Gonzaga vs LMU | ",
 "Upcoming Dec 19, 11:00 AM Women's · Gonzaga vs Michigan State | ",
 "Upcoming Dec 30, 6:00 PM Women's · Gonzaga vs South Dakota State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Gonzaga vs St. Thomas | ",
 "Upcoming Jan 6, 6:00 PM Women's · Gonzaga vs Oregon State | ",
 "Upcoming Jan 9 Women's · Gonzaga at Fresno State | ",
 "Upcoming Jan 13, 6:00 PM Women's · Gonzaga vs Texas State | ",
 "Upcoming Jan 16 Women's · Gonzaga at Boise State | ",
 "Upcoming Jan 21 Women's · Gonzaga at San Diego State | ",
 "Upcoming Jan 28, 6:00 PM Women's · Gonzaga vs Utah State | ",
 "Upcoming Jan 31, 2:00 PM Women's · Gonzaga vs Fresno State | ",
 "Upcoming Feb 3, 7:00 PM Women's · Gonzaga at Colorado State | ",
 "Upcoming Feb 6, 8:00 PM Women's · Gonzaga vs San Diego State | ",
 "Upcoming Feb 11, 8:00 PM Women's · Gonzaga at Oregon State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Gonzaga at Washington State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Gonzaga vs Boise State | ",
 "Upcoming Feb 24, 7:00 PM Women's · Gonzaga vs Colorado State | ",
 "Upcoming Feb 27 Women's · Gonzaga at Utah State | ",
 "Upcoming Mar 3, 5:00 PM Women's · Gonzaga at Texas State | ",
 "Upcoming Mar 6, 7:00 PM Women's · Gonzaga vs Washington State | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Gonzaga at Clash of the Inland Northwest | Women's team: 1st / Men's team: 1st",
 "Final Sep 25 Gonzaga at Lakefront Invite | Women's team: 6th / Men's team: 7th",
 "Final Oct 3 Gonzaga at Frank Knott Classic | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 9 Gonzaga at Nuttycombe Invite | Women's team: 23rd / Men's team: 33rd",
 "Final Oct 17 Gonzaga at Inland Empire Classic | Women's team: 1st / Men's team: 1st",
 "Upcoming Oct 23 Gonzaga at Tyson Invitational | ",
 "Upcoming Oct 30, 9:30 AM Gonzaga at Pac-12 Championship | ",
 "Upcoming Nov 13 Gonzaga at NCAA West Regional Championships | ",
 "Upcoming Nov 21 Gonzaga at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Gonzaga at Leadership and Golf Invitational | 16th",
 "Final Sep 21 Women's · Gonzaga at Kalispel Invitational | 6th",
 "Final Oct 5 Women's · Gonzaga at Pat Lesser Harbottle Invitational | 9th",
 "Upcoming Oct 19 Women's · Gonzaga at Route 66 Invitational | ",
 "Upcoming Feb 15 Women's · Gonzaga at The Molly Collegiate | ",
 "Upcoming Feb 22 Women's · Gonzaga at The Causeway Invitational | ",
 "Upcoming Mar 12 Women's · Gonzaga at Red Rocks Invitational | ",
 "Upcoming Mar 22 Women's · Gonzaga at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 12 Women's · Gonzaga at Bobcat Spring Classic | ",
 "Upcoming Apr 25 Women's · Gonzaga at Pac-12 Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Gonzaga at Gene Miranda Falcon Invitational | 11th",
 "Final Oct 5 Men's · Gonzaga at Oregon State Invitational | 12th",
 "Upcoming Oct 19 Men's · Gonzaga at St. Mary's Invitational | ",
 "Upcoming Oct 26 Men's · Gonzaga at Ka'anapali Classic | ",
 "Upcoming Feb 1 Men's · Gonzaga at Bill Cullum Invitational | ",
 "Upcoming Feb 15 Men's · Gonzaga at The Prestige | ",
 "Upcoming Mar 8 Men's · Gonzaga at R.E. Lamkin Invitational | ",
 "Upcoming Mar 22 Men's · Gonzaga at Duck Invitational | ",
 "Upcoming Apr 5 Men's · Gonzaga at Gaucho Invitational | ",
 "Upcoming Apr 19 Men's · Gonzaga at SeattleU Redhawk Invitational | ",
 "Upcoming Apr 30 Men's · Gonzaga at Pac-12 Championships | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 10 Women's · Gonzaga at Head of the Snake | Completed",
 "Final Oct 17 Women's · Gonzaga at Head of the Spokane | Completed",
 "Upcoming Oct 24, 8:00 AM Women's · Gonzaga at Head of the American | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Final Oct 2 Men's · Gonzaga at Head of the Snake | Completed",
 "Final Oct 17 Men's · Gonzaga at Head of the Spokane | Completed",
 "Upcoming Nov 8 Men's · Gonzaga at San Diego Fall Classic | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Gonzaga vs South Florida | W, 5-1",
 "Final Aug 16 Women's · Gonzaga at Oregon | L, 0-3",
 "Final Aug 20 Women's · Gonzaga vs Arizona | L, 1-2",
 "Final Aug 23 Women's · Gonzaga at New Mexico | W, 3-1",
 "Final Aug 27 Women's · Gonzaga at Washington | T, 1-1",
 "Final Aug 30 Women's · Gonzaga at Seattle | L, 2-3",
 "Final Sep 3 Women's · Gonzaga vs Wyoming | L, 0-1",
 "Final Sep 13 Women's · Gonzaga at Creighton | W, 3-0",
 "Final Sep 16 Women's · Gonzaga vs Utah Valley | W, 2-1",
 "Final Sep 20 Women's · Gonzaga vs Montana | W, 4-0",
 "Final Sep 25 Women's · Gonzaga at Idaho | T, 1-1",
 "Final Oct 4 Women's · Gonzaga at Boise State | L, 0-3",
 "Final Oct 8 Women's · Gonzaga at Colorado State | L, 0-1",
 "Final Oct 11 Women's · Gonzaga vs Fresno State | W, 6-0",
 "Final Oct 17 Women's · Gonzaga vs Washington State | W, 2-0",
 "Upcoming Oct 22, 5:00 PM Women's · Gonzaga at Texas State | ",
 "Upcoming Oct 25, 12:00 PM Women's · Gonzaga vs Utah State | ",
 "Upcoming Oct 30, 7:00 PM Women's · Gonzaga at San Diego State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Gonzaga vs Oregon State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Gonzaga vs Fordham | T, 0-0",
 "Final Aug 23 Men's · Gonzaga vs Washington | L, 0-4",
 "Final Aug 27 Men's · Gonzaga vs Utah Tech | W, 3-0",
 "Final Aug 30 Men's · Gonzaga vs Northwest | W, 7-0",
 "Final Sep 4 Men's · Gonzaga at Creighton | L, 0-2",
 "Final Sep 7 Men's · Gonzaga vs Loyola Chicago | L, 0-1",
 "Final Sep 12 Men's · Gonzaga at CSU Bakersfield | W, 1-0",
 "Final Sep 20 Men's · Gonzaga at UNLV | T, 1-1",
 "Final Sep 30 Men's · Gonzaga vs California Baptist | L, 2-5",
 "Final Oct 3 Men's · Gonzaga vs UC San Diego | L, 1-2",
 "Final Oct 7 Men's · Gonzaga at Sacramento State | W, 3-1",
 "Final Oct 10 Men's · Gonzaga at San Diego State | L, 0-1",
 "Final Oct 14 Men's · Gonzaga vs UC Santa Barbara | L, 1-2",
 "Final Oct 17 Men's · Gonzaga at UC Riverside | L, 1-2",
 "Upcoming Oct 21, 6:00 PM Men's · Gonzaga vs CSU Fullerton | ",
 "Upcoming Oct 24, 6:00 PM Men's · Gonzaga vs Cal Poly | ",
 "Upcoming Oct 31, 7:00 PM Men's · Gonzaga at Oregon State | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Gonzaga at Cal Poly Hidden Dual | Completed",
 "Final Oct 2 Women's · Gonzaga at Duck Invite | Completed",
 "Final Oct 8 Women's · Gonzaga at ITA Regionals | Completed",
 "Upcoming Oct 23 Women's · Gonzaga at Pac-12 Fall Qualifier | ",
 "Upcoming Oct 30 Women's · Gonzaga at Gonzaga Invite | ",
 "Upcoming Nov 6 Women's · Gonzaga at UNLV Classic | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Gonzaga at Western Michigan Invite | Completed",
 "Today Oct 15 Men's · Gonzaga at ITA Regionals | ",
 "Upcoming Oct 23 Men's · Gonzaga at Pac-12 Fall Championship | ",
 "Upcoming Oct 23 Men's · Gonzaga at Duck Invite | ",
 "Upcoming Oct 30 Men's · Gonzaga at Denver Colorado Cup | ",
 "Upcoming Nov 5 Men's · Gonzaga at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · Gonzaga at Gonzaga Fall Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Gonzaga vs Southern Utah | W, 3-0",
 "Final Aug 29 Gonzaga vs Pacific | L, 1-3",
 "Final Aug 30 Gonzaga vs UC San Diego | L, 1-3",
 "Final Sep 3 Gonzaga vs Cal State Fullerton | W, 3-0",
 "Final Sep 4 Gonzaga vs Oral Roberts | L, 2-3",
 "Final Sep 5 Gonzaga vs Eastern Washington | L, 2-3",
 "Final Sep 10 Gonzaga at UTSA | L, 0-3",
 "Final Sep 11 Gonzaga vs IU Indy | W, 3-2",
 "Final Sep 12 Gonzaga vs East Texas A&M | L, 2-3",
 "Final Sep 17 Gonzaga vs Seattle | W, 3-1",
 "Final Sep 18 Gonzaga vs North Dakota State | L, 0-3",
 "Final Sep 19 Gonzaga vs Montana | W, 3-0",
 "Final Sep 24 Gonzaga at Boise State | L, 1-3",
 "Final Sep 26 Gonzaga at Utah State | L, 1-3",
 "Final Oct 1 Gonzaga vs Colorado State | L, 2-3",
 "Final Oct 8 Gonzaga at Texas State | L, 1-3",
 "Final Oct 10 Gonzaga at San Diego State | L, 0-3",
 "Final Oct 15 Gonzaga vs Fresno State | L, 2-3",
 "Final Oct 17 Gonzaga vs Boise State | W, 3-2",
 "Upcoming Oct 22, 6:00 PM Gonzaga vs Texas State | ",
 "Upcoming Oct 24, 12:00 PM Gonzaga vs San Diego State | ",
 "Upcoming Oct 29, 6:00 PM Gonzaga at Oregon State | ",
 "Upcoming Oct 31, 1:00 PM Gonzaga at Fresno State | ",
 "Upcoming Nov 5, 5:00 PM Gonzaga at Colorado State | ",
 "Upcoming Nov 7, 12:00 PM Gonzaga vs Washington State | ",
 "Upcoming Nov 12, 6:00 PM Gonzaga vs Oregon State | ",
 "Upcoming Nov 14, 12:00 PM Gonzaga vs Utah State | ",
 "Upcoming Nov 19, 6:00 PM Gonzaga at Washington State | ",
 "Upcoming Nov 23 Gonzaga at Pac-12 Volleyball Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf cards give the place, the team score to par and the total: "16th,
// +55 (919)", "12th, +20 (872)". Mutation: without the rule the Leadership
// and Golf Invitational read "Completed" and the Oregon State Invitational
// "T19th" (an individual's place from the story).
{
  const results=(slug,name)=>parse('Golf',slug).find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('womens-golf','Leadership and Golf Invitational'),['Result: 16th','Team score: 919 (+55)']);
  assert.deepEqual(results('womens-golf','Kalispel Invitational'),['Result: 6th','Team score: 890 (+26)']);
  assert.deepEqual(results('mens-golf','Gene Miranda Falcon Invitational'),['Result: 11th','Team score: 867 (+3)']);
  assert.deepEqual(results('mens-golf','Oregon State Invitational'),['Result: 12th','Team score: 872 (+20)']);
}
// Rowing: both teams' pages, each labeled; a head race whose card names no
// tournament is a meet (women's Head of the Snake, Oct 10, was dropped;
// Head of the American read "vs"). Mutation: without the Rowing meet rule.
{
  assert.ok(gonzagaSchool.combinedSports.has('Rowing'));
  const women=parse('Rowing','womens-rowing');
  assert.deepEqual(women.map(e=>`${e.status} ${e.title}`),["Final Women's · Gonzaga at Head of the Snake","Final Women's · Gonzaga at Head of the Spokane","Upcoming Women's · Gonzaga at Head of the American"]);
}
// Gonzaga sponsors no football: no route, no athletes.
assert.ok(!gonzagaSchool.pageDataSports.has('Football')&&!gonzagaSchool.scheduleUrls['gonzaga|Football']);

// gozags.com's nav links its INFLCR Exchange (found Oct 18 by add-school).
assert.deepEqual(gonzagaSchool.inflcr,{school:'gonzaga-university'});
assert.equal(requests.length,0,'no unexpected network requests');
console.log('Gonzaga module checks passed');
