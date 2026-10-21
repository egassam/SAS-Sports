import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {idahoStateSchool,IDAHO_STATE_TFRRS_TEAMS} from '../src/schools/idaho-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {parseTfrrsResults} from '../src/tfrrs-results.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='idaho-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,idahoStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/idaho-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit isubengals.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['idaho-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',idahoStateSchool.scheduleUrls],['roster',idahoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('idaho-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'isubengals.com',`${key} must stay on isubengals.com`);
  }
}
const parity={"Basketball":{"schedule":["https://isubengals.com/sports/mens-basketball/schedule","https://isubengals.com/sports/womens-basketball/schedule"],"roster":["https://isubengals.com/sports/mens-basketball/roster","https://isubengals.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://isubengals.com/sports/womens-cross-country/schedule","https://isubengals.com/sports/mens-cross-country/schedule"],"roster":["https://isubengals.com/sports/womens-cross-country/roster","https://isubengals.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://isubengals.com/sports/football/schedule"],"roster":["https://isubengals.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://isubengals.com/sports/womens-golf/schedule"],"roster":["https://isubengals.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://isubengals.com/sports/womens-soccer/schedule"],"roster":["https://isubengals.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://isubengals.com/sports/softball/schedule"],"roster":["https://isubengals.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://isubengals.com/sports/womens-tennis/schedule","https://isubengals.com/sports/mens-tennis/schedule"],"roster":["https://isubengals.com/sports/womens-tennis/roster","https://isubengals.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://isubengals.com/sports/womens-track-and-field/schedule","https://isubengals.com/sports/mens-track-and-field/schedule"],"roster":["https://isubengals.com/sports/womens-track-and-field/roster","https://isubengals.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://isubengals.com/sports/womens-volleyball/schedule"],"roster":["https://isubengals.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'idaho-state|"+sport+"':"),`${sport} routes must live in the Idaho State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://isubengals.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.idahoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=idaho-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 8:00 PM Men's · Idaho State vs Montana Western (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Idaho State at Utah State | ",
 "Upcoming Nov 6, 6:30 PM Men's · Idaho State at Wyoming | ",
 "Upcoming Nov 8, 1:00 PM Men's · Idaho State at Air Force | ",
 "Upcoming Nov 14, 8:00 PM Men's · Idaho State at Seattle | ",
 "Upcoming Nov 20, 2:00 PM Men's · Idaho State vs South Dakota State | ",
 "Upcoming Nov 24, 7:00 PM Men's · Idaho State at Boise State | ",
 "Upcoming Nov 28, 2:00 PM Men's · Idaho State vs Azusa Pacific | ",
 "Upcoming Dec 3, 6:30 PM Men's · Idaho State at Southern Utah | ",
 "Upcoming Dec 5, 7:00 PM Men's · Idaho State at Utah Tech | ",
 "Upcoming Dec 10, 7:00 PM Men's · Idaho State vs Cal State Fullerton | ",
 "Upcoming Dec 12, 4:00 PM Men's · Idaho State vs Justice | ",
 "Upcoming Dec 17, 6:00 PM Men's · Idaho State at UC Davis | ",
 "Upcoming Dec 20, 1:00 PM Men's · Idaho State at North Dakota State | ",
 "Upcoming Dec 28, 7:00 PM Men's · Idaho State vs Northwest Indian College | ",
 "Upcoming Jan 2, 4:00 PM Men's · Idaho State vs Northern Arizona | ",
 "Upcoming Jan 7, 7:00 PM Men's · Idaho State vs Montana State | ",
 "Upcoming Jan 9, 4:00 PM Men's · Idaho State vs Montana | ",
 "Upcoming Jan 14, 6:00 PM Men's · Idaho State at Northern Colorado | ",
 "Upcoming Jan 16, 3:00 PM Men's · Idaho State at Portland State | ",
 "Upcoming Jan 18, 7:00 PM Men's · Idaho State at Eastern Washington | ",
 "Upcoming Jan 23, 7:00 PM Men's · Idaho State vs Weber State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Idaho State at Idaho | ",
 "Upcoming Jan 28, 7:00 PM Men's · Idaho State vs Utah Tech | ",
 "Upcoming Jan 30, 4:00 PM Men's · Idaho State vs Southern Utah | ",
 "Upcoming Feb 4, 6:00 PM Men's · Idaho State at Northern Arizona | ",
 "Upcoming Feb 11, 7:00 PM Men's · Idaho State vs Portland State | ",
 "Upcoming Feb 13, 4:00 PM Men's · Idaho State vs Northern Colorado | ",
 "Upcoming Feb 18, 7:00 PM Men's · Idaho State at Montana | ",
 "Upcoming Feb 20, 6:00 PM Men's · Idaho State at Montana State | ",
 "Upcoming Feb 22, 7:00 PM Men's · Idaho State vs Eastern Washington | ",
 "Upcoming Feb 27, 5:00 PM Men's · Idaho State at Weber State | ",
 "Upcoming Mar 1, 7:00 PM Men's · Idaho State vs Idaho | ",
 "Upcoming Mar 6 Men's · Idaho State at Big Sky Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 23, 5:00 PM Women's · Idaho State vs College of Idaho (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Women's · Idaho State at BYU | ",
 "Upcoming Nov 6, 7:00 PM Women's · Idaho State vs Westminster | ",
 "Upcoming Nov 9, 7:00 PM Women's · Idaho State vs Cal Poly | ",
 "Upcoming Nov 11, 4:00 PM Women's · Idaho State at Utah State | ",
 "Upcoming Nov 15, 1:00 PM Women's · Idaho State at South Dakota | ",
 "Upcoming Nov 18 Women's · Idaho State at UC Irvine | ",
 "Upcoming Nov 20, 7:00 PM Women's · Idaho State at LMU | ",
 "Upcoming Nov 22 Women's · Idaho State at UC Riverside | ",
 "Upcoming Nov 28, 5:00 PM Women's · Idaho State vs Utah Valley | ",
 "Upcoming Dec 3, 7:00 PM Women's · Idaho State vs Southern Utah | ",
 "Upcoming Dec 5, 2:00 PM Women's · Idaho State vs Utah Tech | ",
 "Upcoming Dec 18, 8:00 PM Women's · Idaho State at Oregon State | ",
 "Upcoming Dec 19, 5:30 PM Women's · Idaho State vs San Francisco | ",
 "Upcoming Jan 2, 2:00 PM Women's · Idaho State at Northern Arizona | ",
 "Upcoming Jan 7, 7:00 PM Women's · Idaho State at Montana State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Idaho State at Montana | ",
 "Upcoming Jan 14, 7:00 PM Women's · Idaho State vs Northern Colorado | ",
 "Upcoming Jan 16, 2:00 PM Women's · Idaho State vs Portland State | ",
 "Upcoming Jan 18, 7:00 PM Women's · Idaho State vs Eastern Washington | ",
 "Upcoming Jan 23, 4:00 PM Women's · Idaho State vs Weber State | ",
 "Upcoming Jan 25, 7:00 PM Women's · Idaho State vs Idaho | ",
 "Upcoming Jan 28, 7:00 PM Women's · Idaho State at Utah Tech | ",
 "Upcoming Jan 30, 2:00 PM Women's · Idaho State at Southern Utah | ",
 "Upcoming Feb 4, 7:00 PM Women's · Idaho State vs Northern Arizona | ",
 "Upcoming Feb 11, 7:00 PM Women's · Idaho State at Portland State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Idaho State at Northern Colorado | ",
 "Upcoming Feb 18, 7:00 PM Women's · Idaho State vs Montana | ",
 "Upcoming Feb 20, 2:00 PM Women's · Idaho State vs Montana State | ",
 "Upcoming Feb 22, 7:00 PM Women's · Idaho State at Eastern Washington | ",
 "Upcoming Feb 27, 2:00 PM Women's · Idaho State at Weber State | ",
 "Upcoming Mar 1, 7:00 PM Women's · Idaho State at Idaho | ",
 "Upcoming Mar 5 Women's · Idaho State at Big Sky Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Idaho State at Utah State Alumni Challenge | Completed",
 "Final Sep 18 Women's · Idaho State at Montana Invite | Completed",
 "Final Oct 2 Women's · Idaho State at Bengal Invitational | Completed",
 "Final Oct 16 Women's · Idaho State at Princeton Classic | Completed",
 "Upcoming Oct 30 Women's · Idaho State at Big Sky Championships | ",
 "Upcoming Nov 13 Women's · Idaho State at NCAA Mountain Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Idaho State at Utah State Alumni Challenge | Completed",
 "Final Sep 18 Men's · Idaho State at Montana Invite | Completed",
 "Final Oct 2 Men's · Idaho State at Bengal Invitational | Completed",
 "Final Oct 16 Men's · Idaho State at Princeton Invitational | Completed",
 "Upcoming Oct 30 Men's · Idaho State at Big Sky Championships | ",
 "Upcoming Nov 13 Men's · Idaho State at NCAA Mountain Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Idaho State vs VMI | W, 38-10",
 "Final Sep 5 Idaho State at Utah State | W, 29-17",
 "Final Sep 12 Idaho State vs San Diego | W, 59-17",
 "Final Sep 26 Idaho State at Southern Utah | W, 28-24",
 "Final Oct 3 Idaho State vs Northern Arizona | L, 31-38",
 "Final Oct 10 Idaho State vs Cal Poly | L, 24-25",
 "Final Oct 17 Idaho State at Weber State | L, 20-27",
 "Upcoming Oct 24, 4:00 PM Idaho State vs Portland State | ",
 "Upcoming Oct 31, 1:00 PM Idaho State at Utah Tech | ",
 "Upcoming Nov 7, 4:00 PM Idaho State vs Montana State | ",
 "Upcoming Nov 14, 8:30 PM Idaho State at Montana | ",
 "Upcoming Nov 21, 4:00 PM Idaho State vs Idaho | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Idaho State at Wolverine Invitational | 5th of 10",
 "Final Sep 21 Idaho State at Yellowstone Invitational | 6th of 11",
 "Final Sep 28 Idaho State at Sun Mountain Invitational | 2nd of 4",
 "Final Oct 4 Idaho State at Bradley Coyote Creek Classic | T1st of 9",
 "Final Oct 12 Idaho State at Golf Iconic Invitational | Completed",
 "Upcoming Mar 6 Idaho State at Pizza Hut Lady Thunderbird Invitational | ",
 "Upcoming Mar 12 Idaho State at Red Rocks Invitational | ",
 "Upcoming Mar 28 Idaho State at Canyon Clash | ",
 "Upcoming Apr 12 Idaho State at Bobcat Desert Invitational | ",
 "Upcoming Apr 18 Idaho State at Big Sky Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Idaho State at CSUN | L, 0-1",
 "Final Aug 23 Idaho State at CSU Bakersfield | W, 2-0",
 "Final Aug 27 Idaho State vs UNLV | T, 3-3",
 "Final Aug 30 Idaho State at Boise State | L, 1-3",
 "Final Sep 3 Idaho State at Nebraska at Omaha | W, 2-0",
 "Final Sep 6 Idaho State at SMU | L, 0-6",
 "Final Sep 10 Idaho State vs California Santa Barbara | L, 1-3",
 "Final Sep 17 Idaho State vs Utah State | L, 0-6",
 "Final Sep 20 Idaho State at New Mexico | T, 1-1",
 "Final Oct 1 Idaho State at Eastern Washington | T, 0-0",
 "Final Oct 4 Idaho State at Idaho | L, 0-3",
 "Final Oct 8 Idaho State vs Southern Utah | T, 0-0",
 "Final Oct 11 Idaho State vs Utah Tech | L, 0-5",
 "Final Oct 15 Idaho State at Montana | W, 2-0",
 "Final Oct 18 Idaho State at Portland State | W, 1-0",
 "Upcoming Oct 29, 7:00 PM Idaho State vs Northern Arizona | ",
 "Upcoming Nov 1, 1:00 PM Idaho State vs Northern Colorado | ",
 "Upcoming Nov 5, 1:00 PM Idaho State at Weber State | ",
 "Upcoming Nov 11 Idaho State at Big Sky Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Idaho State at Idaho State Invitational | Completed",
 "Final Sep 25 Women's · Idaho State at ITA Bedford Cup In The Mountains | Completed",
 "Final Oct 2 Women's · Idaho State at Big Sky Individual Championships | Completed",
 "Final Oct 13 Women's · Idaho State at ITA Mountain Regionals | Completed",
 "Upcoming Oct 30 Women's · Idaho State at Bobcat Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Idaho State at Dar Walters Invitational | Completed",
 "Final Oct 6 Men's · Idaho State at ITA Mountain Regionals | Completed",
 "Upcoming Oct 23 Men's · Idaho State at Bobcat Invitational | ",
 "Upcoming Nov 6 Men's · Idaho State at Easley Invite | ",
 "Upcoming Jan 23 Men's · Idaho State vs Montana State | ",
 "Upcoming Jan 29 Men's · Idaho State at Utah State | ",
 "Upcoming Jan 30 Men's · Idaho State at Utah | ",
 "Upcoming Feb 6, 11:30 AM Men's · Idaho State at Weber State | ",
 "Upcoming Feb 7, 9:00 AM Men's · Idaho State vs Colorado Mesa | ",
 "Upcoming Feb 20 Men's · Idaho State vs Pacific | ",
 "Upcoming Feb 21 Men's · Idaho State at UNLV | ",
 "Upcoming Feb 27 Men's · Idaho State at BYU | ",
 "Upcoming Mar 5 Men's · Idaho State at Boise State Spring Invitational | ",
 "Upcoming Mar 12 Men's · Idaho State at Montana State | ",
 "Upcoming Mar 14 Men's · Idaho State at Montana | ",
 "Upcoming Mar 16 Men's · Idaho State at Boise State | ",
 "Upcoming Mar 16 Men's · Idaho State vs Hawaii | ",
 "Upcoming Mar 20 Men's · Idaho State at Portland State | ",
 "Upcoming Apr 2, 2:00 PM Men's · Idaho State vs Idaho | ",
 "Upcoming Apr 4 Men's · Idaho State vs Northern Arizona | ",
 "Upcoming Apr 10, 11:00 AM Men's · Idaho State vs Weber State | ",
 "Upcoming Apr 22 Men's · Idaho State at Big Sky Conference Tournament | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 10 Women's · Idaho State at MSU Bobcat Preview | ",
 "Upcoming Jan 15 Women's · Idaho State at Colorado Invitational | ",
 "Upcoming Jan 22 Women's · Idaho State at Bobcat Performance | ",
 "Upcoming Jan 29 Women's · Idaho State at Wolf Pack Classic | ",
 "Upcoming Feb 6 Women's · Idaho State at Stacy Dragila Invitational | ",
 "Upcoming Feb 12 Women's · Idaho State at Mountain States Games | ",
 "Upcoming Feb 25 Women's · Idaho State at Big Sky Indoor Championships | ",
 "Upcoming Mar 12 Women's · Idaho State at NCAA Indoor Championships | ",
 "Upcoming Apr 2 Women's · Idaho State at Stanford Invitational | ",
 "Upcoming Apr 2 Women's · Idaho State at UNLV Rebel Elite | ",
 "Upcoming Apr 9 Women's · Idaho State at Utah/Weber Spring Classic | ",
 "Upcoming Apr 14 Women's · Idaho State at Bryan Clay Multi | ",
 "Upcoming Apr 15 Women's · Idaho State at Long Beach/Mt. SAC | ",
 "Upcoming Apr 23 Women's · Idaho State at Montana Open | ",
 "Upcoming Apr 30 Women's · Idaho State at Bengal Invitational | ",
 "Upcoming May 12 Women's · Idaho State at Big Sky Outdoor Championships | ",
 "Upcoming May 26 Women's · Idaho State at NCAA West Preliminary Round | ",
 "Upcoming Jun 9 Women's · Idaho State at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 10 Men's · Idaho State at MSU Bobcat Preview | ",
 "Upcoming Jan 15 Men's · Idaho State at Colorado Invitational | ",
 "Upcoming Jan 22 Men's · Idaho State at Bobcat Performance | ",
 "Upcoming Jan 29 Men's · Idaho State at Wolf Pack Classic | ",
 "Upcoming Feb 6 Men's · Idaho State at Stacy Dragila Invitational | ",
 "Upcoming Feb 12 Men's · Idaho State at Mountain States Games | ",
 "Upcoming Feb 25 Men's · Idaho State at Big Sky Indoor Championships | ",
 "Upcoming Mar 12 Men's · Idaho State at NCAA Indoor Championships | ",
 "Upcoming Apr 2 Men's · Idaho State at Stanford Invitational | ",
 "Upcoming Apr 2 Men's · Idaho State at UNLV Rebel Elite | ",
 "Upcoming Apr 9 Men's · Idaho State at Utah/Weber Spring Classic | ",
 "Upcoming Apr 14 Men's · Idaho State at Bryan Clay Multi | ",
 "Upcoming Apr 15 Men's · Idaho State at Long Beach/Mt. SAC | ",
 "Upcoming Apr 23 Men's · Idaho State at Montana Open | ",
 "Upcoming Apr 30 Men's · Idaho State at Bengal Invitational | ",
 "Upcoming May 12 Men's · Idaho State at Big Sky Outdoor Championships | ",
 "Upcoming May 26 Men's · Idaho State at NCAA West Preliminary Round | ",
 "Upcoming Jun 9 Men's · Idaho State at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Idaho State vs Stephen F. Austin | W, 3-1",
 "Final Aug 28 Idaho State vs Missouri State | L, 0-3",
 "Final Aug 29 Idaho State at Wichita State | W, 3-1",
 "Final Sep 3 Idaho State vs UNLV | W, 3-1",
 "Final Sep 4 Idaho State vs North Dakota State | L, 0-3",
 "Final Sep 5 Idaho State at Boise State | W, 3-2",
 "Final Sep 10 Idaho State vs Tennessee Tech | W, 3-1",
 "Final Sep 11 Idaho State vs Little Rock | W, 3-1",
 "Final Sep 12 Idaho State at Air Force | W, 3-0",
 "Final Sep 17 Idaho State vs Pacific | W, 3-0",
 "Final Sep 18 Idaho State vs Wyoming | L, 0-3",
 "Final Sep 19 Idaho State vs Boise State | L, 0-3",
 "Final Sep 24 Idaho State at Idaho | W, 3-0",
 "Final Sep 26 Idaho State at Eastern Washington | W, 3-0",
 "Final Oct 1 Idaho State vs Northern Arizona | W, 3-0",
 "Final Oct 3 Idaho State vs Portland State | W, 3-2",
 "Final Oct 8 Idaho State at Southern Utah | W, 3-0",
 "Final Oct 10 Idaho State at Utah Tech | L, 0-3",
 "Final Oct 13 Idaho State vs Weber State | L, 1-3",
 "Final Oct 15 Idaho State vs Northern Colorado | W, 3-2",
 "Upcoming Oct 22, 7:00 PM Idaho State vs Montana | ",
 "Upcoming Oct 24, 7:00 PM Idaho State at Montana State | ",
 "Upcoming Oct 27, 6:00 PM Idaho State at Weber State | ",
 "Upcoming Oct 31, 1:00 PM Idaho State at Northern Colorado | ",
 "Upcoming Nov 5, 7:00 PM Idaho State vs Utah Tech | ",
 "Upcoming Nov 7, 12:00 PM Idaho State vs Southern Utah | ",
 "Upcoming Nov 12, 8:00 PM Idaho State at Portland State | ",
 "Upcoming Nov 14 Idaho State at Northern Arizona | ",
 "Upcoming Nov 18, 7:00 PM Idaho State vs Eastern Washington | ",
 "Upcoming Nov 20, 7:00 PM Idaho State vs Idaho | ",
 "Upcoming Nov 23 Idaho State at Big Sky Conference Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// A TFRRS meet whose races name no team ("Bengal Invite Team Results (8k)",
// "(5k)", the Bengal Invitational, Oct 2): the longer race is the men's.
{
  const races=parseTfrrsResults(fixture('tfrrs-28375.html.gz'),{decodeHtml:worker.decodeHtml,ordinal:n=>`${n}.`,team:'Idaho State'});
  assert.deepEqual(races.map(race=>[race.group,race.result]),[["Women's 5K",{place:3,score:'61'}],["Men's 8K",{place:3,score:'66'}]]);
}

// The feed keeps a cross country meet the schedule gives no result or story
// for once TFRRS gives its results: the TFRRS step runs before the module's
// feed hook, which leaves out a "Completed" meet without a story (every Idaho
// State meet was dropped on the first preview).
{
  for(const slug of ['womens-cross-country','mens-cross-country'])recapFixtures.set(page(slug),fixture(`${slug}-schedule.html.gz`));
  recapFixtures.set(IDAHO_STATE_TFRRS_TEAMS.Women,fixture('tfrrs-team-f.html.gz'));recapFixtures.set(IDAHO_STATE_TFRRS_TEAMS.Men,fixture('tfrrs-team-m.html.gz'));
  for(const name of ['28102/USU_Alumni_Challenge','28599/Montana_XC_Invite','28375/Idaho_State_Bengal_Invitational','27843/Joe_Handelman_52_Fall_Classic'])recapFixtures.set(`https://www.tfrrs.org/results/xc/${name}`,fixture(`tfrrs-${name.split('/')[0]}.html.gz`));
  const {events}=await worker.fetchLive('idaho-state','Cross Country');
  assert.deepEqual(events.filter(e=>e.status==='Final').map(e=>`${e.team_label} ${e.opponent}: ${e.headline}`).sort(),[
    "Men's Bengal Invitational: Men's team: 3rd · 66 pts","Men's Montana Invite: Men's team: 5th · 131 pts","Men's Princeton Invitational: Men's team: 16th · 443 pts","Men's Utah State Alumni Challenge: Men's team: 3rd · 91 pts",
    "Women's Bengal Invitational: Women's team: 3rd · 61 pts","Women's Montana Invite: Women's team: 4th · 94 pts","Women's Princeton Classic: Women's team: 17th · 395 pts","Women's Utah State Alumni Challenge: Women's team: 3rd · 85 pts"]);
  // Each meet without a story also looks for one in its team's archive (none saved here).
  assert.deepEqual([...new Set(requests.filter(url=>!recapFixtures.has(url)))],['https://isubengals.com/sports/womens-cross-country/archives','https://isubengals.com/sports/mens-cross-country/archives']);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Idaho State module checks passed");
