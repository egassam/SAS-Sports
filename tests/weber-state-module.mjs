import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {weberStateSchool} from '../src/schools/weber-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='weber-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,weberStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/weber-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit weberstatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['weber-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',weberStateSchool.scheduleUrls],['roster',weberStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('weber-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'weberstatesports.com',`${key} must stay on weberstatesports.com`);
  }
}
const parity={"Basketball":{"schedule":["https://weberstatesports.com/sports/mens-basketball/schedule","https://weberstatesports.com/sports/womens-basketball/schedule"],"roster":["https://weberstatesports.com/sports/mens-basketball/roster","https://weberstatesports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://weberstatesports.com/sports/womens-cross-country/schedule","https://weberstatesports.com/sports/mens-cross-country/schedule"],"roster":["https://weberstatesports.com/sports/womens-cross-country/roster","https://weberstatesports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://weberstatesports.com/sports/football/schedule"],"roster":["https://weberstatesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://weberstatesports.com/sports/womens-golf/schedule","https://weberstatesports.com/sports/mens-golf/schedule"],"roster":["https://weberstatesports.com/sports/womens-golf/roster","https://weberstatesports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://weberstatesports.com/sports/womens-soccer/schedule"],"roster":["https://weberstatesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://weberstatesports.com/sports/softball/schedule"],"roster":["https://weberstatesports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://weberstatesports.com/sports/womens-tennis/schedule","https://weberstatesports.com/sports/mens-tennis/schedule"],"roster":["https://weberstatesports.com/sports/womens-tennis/roster","https://weberstatesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://weberstatesports.com/sports/track-and-field/schedule","https://weberstatesports.com/sports/mens-track-and-field/schedule"],"roster":["https://weberstatesports.com/sports/track-and-field/roster","https://weberstatesports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://weberstatesports.com/sports/womens-volleyball/schedule"],"roster":["https://weberstatesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'weber-state|"+sport+"':"),`${sport} routes must live in the Weber State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://weberstatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.weberStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=weber-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Weber State vs Colorado Christian (Exhibition) | W, 90-76",
 "Upcoming Oct 24, 4:00 PM Men's · Weber State vs Westminster (Exhibition) | ",
 "Upcoming Oct 28, 6:00 PM Men's · Weber State vs Colorado Mesa (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Weber State at Oregon State | ",
 "Upcoming Nov 7, 7:00 PM Men's · Weber State vs Utah Valley | ",
 "Upcoming Nov 10, 7:00 PM Men's · Weber State at Utah | ",
 "Upcoming Nov 14, 4:00 PM Men's · Weber State vs Lincoln | ",
 "Upcoming Nov 18, 7:00 PM Men's · Weber State at Utah State | ",
 "Upcoming Nov 24, 5:00 PM Men's · Weber State vs Tarleton State | ",
 "Upcoming Nov 25, 4:00 PM Men's · Weber State vs CSUN | ",
 "Upcoming Nov 28, 3:00 PM Men's · Weber State at Cal State Fullerton | ",
 "Upcoming Dec 3, 7:00 PM Men's · Weber State at Utah Tech | ",
 "Upcoming Dec 5, 6:30 PM Men's · Weber State at Southern Utah | ",
 "Upcoming Dec 9, 12:00 PM Men's · Weber State vs Washington State | ",
 "Upcoming Dec 15, 7:00 PM Men's · Weber State at BYU | ",
 "Upcoming Dec 18, 7:00 PM Men's · Weber State at UC Santa Barbara | ",
 "Upcoming Dec 31, 2:00 PM Men's · Weber State vs Northern Arizona | ",
 "Upcoming Jan 7, 6:00 PM Men's · Weber State vs Montana | ",
 "Upcoming Jan 9, 4:00 PM Men's · Weber State vs Montana State | ",
 "Upcoming Jan 14, 8:00 PM Men's · Weber State at Portland State | ",
 "Upcoming Jan 16, 6:00 PM Men's · Weber State at Northern Colorado | ",
 "Upcoming Jan 18, 6:00 PM Men's · Weber State vs Idaho | ",
 "Upcoming Jan 23, 7:00 PM Men's · Weber State at Idaho State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Weber State at Eastern Washington | ",
 "Upcoming Jan 28, 6:00 PM Men's · Weber State vs Southern Utah | ",
 "Upcoming Jan 30, 1:00 PM Men's · Weber State vs Utah Tech | ",
 "Upcoming Feb 6, 6:00 PM Men's · Weber State at Northern Arizona | ",
 "Upcoming Feb 11, 6:00 PM Men's · Weber State vs Northern Colorado | ",
 "Upcoming Feb 13, 4:00 PM Men's · Weber State vs Portland State | ",
 "Upcoming Feb 18, 7:00 PM Men's · Weber State at Montana State | ",
 "Upcoming Feb 20, 4:00 PM Men's · Weber State at Montana | ",
 "Upcoming Feb 22, 7:00 PM Men's · Weber State at Idaho | ",
 "Upcoming Feb 27, 5:00 PM Men's · Weber State vs Idaho State | ",
 "Upcoming Mar 1, 6:00 PM Men's · Weber State vs Eastern Washington | ",
 "Upcoming Mar 5 Men's · Weber State at Big Sky Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · Weber State vs Westminster | ",
 "Upcoming Nov 7, 4:00 PM Women's · Weber State vs Denver | ",
 "Upcoming Nov 14, 1:00 PM Women's · Weber State vs Houston Christian | ",
 "Upcoming Nov 16, 11:00 AM Women's · Weber State vs Northern New Mexico | ",
 "Upcoming Nov 19, 8:00 PM Women's · Weber State at Cal State Fullerton | ",
 "Upcoming Nov 22, 1:00 PM Women's · Weber State at Colorado State | ",
 "Upcoming Nov 25 Women's · Weber State at Seattle | ",
 "Upcoming Dec 3, 6:00 PM Women's · Weber State vs Utah Tech | ",
 "Upcoming Dec 5, 2:00 PM Women's · Weber State vs Southern Utah | ",
 "Upcoming Dec 12 Women's · Weber State at Utah State | ",
 "Upcoming Dec 15, 2:00 PM Women's · Weber State at BYU | ",
 "Upcoming Dec 19, 6:00 PM Women's · Weber State vs La Sierra | ",
 "Upcoming Dec 31, 1:00 PM Women's · Weber State at Northern Arizona | ",
 "Upcoming Jan 7, 7:00 PM Women's · Weber State at Montana | ",
 "Upcoming Jan 9, 2:00 PM Women's · Weber State at Montana State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Weber State vs Portland State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Weber State vs Northern Colorado | ",
 "Upcoming Jan 18, 6:00 PM Women's · Weber State at Idaho | ",
 "Upcoming Jan 23, 4:00 PM Women's · Weber State at Idaho State | ",
 "Upcoming Jan 25, 6:00 PM Women's · Weber State vs Eastern Washington | ",
 "Upcoming Jan 28, 6:30 PM Women's · Weber State at Southern Utah | ",
 "Upcoming Jan 30, 1:00 PM Women's · Weber State at Utah Tech | ",
 "Upcoming Feb 6, 2:00 PM Women's · Weber State vs Northern Arizona | ",
 "Upcoming Feb 11, 6:00 PM Women's · Weber State at Northern Colorado | ",
 "Upcoming Feb 13, 1:00 PM Women's · Weber State at Portland State | ",
 "Upcoming Feb 18, 6:00 PM Women's · Weber State vs Montana State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Weber State vs Montana | ",
 "Upcoming Feb 22, 6:00 PM Women's · Weber State vs Idaho | ",
 "Upcoming Feb 27, 2:00 PM Women's · Weber State vs Idaho State | ",
 "Upcoming Mar 1, 6:00 PM Women's · Weber State at Eastern Washington | ",
 "Upcoming Mar 5 Women's · Weber State at Big Sky Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Weber State at Utah State Alumni Challenge | Completed",
 "Final Sep 19 Women's · Weber State at Indiana State John McNichols Invitational | Completed",
 "Final Oct 2 Women's · Weber State at Idaho State Invitational | Completed",
 "Final Oct 9 Women's · Weber State at Bill Dellinger Invitational | Completed",
 "Final Oct 9 Women's · Weber State at CSI Invitational | Completed",
 "Upcoming Oct 30 Women's · Weber State at Big Sky Championships | ",
 "Upcoming Nov 13 Women's · Weber State at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21 Women's · Weber State at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Weber State at Utah State Alumni Challenge | Completed",
 "Final Sep 19 Men's · Weber State at Indiana State John McNichols Invitational | Completed",
 "Final Oct 2 Men's · Weber State at Idaho State Invitational | Completed",
 "Final Oct 9 Men's · Weber State at Bill Dellinger Invitational | Completed",
 "Final Oct 9 Men's · Weber State at CSI Invitational | Completed",
 "Upcoming Oct 30 Men's · Weber State at Big Sky Championships | ",
 "Upcoming Nov 13 Men's · Weber State at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21 Men's · Weber State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Weber State at Northern Colorado | W, 30-29",
 "Final Sep 5 Weber State at Southern Utah | L, 42-47",
 "Final Sep 12 Weber State at Colorado | L, 21-52",
 "Final Sep 19 Weber State vs Northwestern State | W, 49-20",
 "Final Sep 26 Weber State vs Portland State | L, 41-44",
 "Final Oct 3 Weber State at Cal Poly | W, 42-34",
 "Final Oct 10 Weber State vs Idaho | W, 38-27",
 "Final Oct 17 Weber State vs Idaho State | W, 27-20",
 "Upcoming Oct 24, 1:00 PM Weber State at Montana State | ",
 "Upcoming Oct 31, 1:00 PM Weber State vs UC Davis | ",
 "Upcoming Nov 14, 2:00 PM Weber State at Northern Arizona | ",
 "Upcoming Nov 21, 1:00 PM Weber State vs Utah Tech | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Weber State at Wolverine Invitational | 4th of 10",
 "Final Sep 21 Women's · Weber State at Yellowstone Intercollegiate | 2nd of 11",
 "Final Oct 5 Women's · Weber State at Pat Lesser Harbottle Invitational | 11th of 17",
 "Upcoming Oct 24 Women's · Weber State at The Clash at Boulder Creek | ",
 "Upcoming Feb 22 Women's · Weber State at Longwood Invitational at Jekyll Island | ",
 "Upcoming Mar 5 Women's · Weber State at Pizza Hut Lady Thunderbird Invitational | ",
 "Upcoming Mar 13 Women's · Weber State at Red Rocks Invitational | ",
 "Upcoming Mar 22 Women's · Weber State at Ozarks National Invitational | ",
 "Upcoming Apr 5 Women's · Weber State at Colonel Classic | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Weber State at Gene Miranda Falcon Invitational | 17th of 18",
 "Final Sep 28 Men's · Weber State at SIUe Dolenc Invitational | 10th of 17",
 "Final Oct 5 Men's · Weber State at Kemper Lakes Intercollegiate | 9th of 12",
 "Final Oct 12 Men's · Weber State at Tall City Collegiate | 11th of 12",
 "Upcoming Mar 1 Men's · Weber State at The Monty Invitational | ",
 "Upcoming Mar 5 Men's · Weber State at Bandon Dunes Championship | ",
 "Upcoming Mar 21 Men's · Weber State at UC San Diego Invitational | ",
 "Upcoming Apr 5 Men's · Weber State at Memphis Intercollegiate | ",
 "Upcoming Apr 19 Men's · Weber State at Redhawk Invitational | ",
 "Upcoming Apr 26 Men's · Weber State at Big Sky Conference Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 7 Weber State vs SLCC (Exhibition) | W, 6-1",
 "Final Aug 12 Weber State at Utah | T, 0-0",
 "Final Aug 16 Weber State vs Boise State | L, 1-4",
 "Final Aug 20 Weber State at Wyoming | W, 2-1",
 "Final Aug 23 Weber State vs Oregon State | W, 2-1",
 "Final Aug 29 Weber State at Long Beach State | L, 0-3",
 "Final Sep 3 Weber State at Pacific | W, 1-0",
 "Final Sep 10 Weber State vs South Dakota State | L, 2-3",
 "Final Sep 13 Weber State vs UC Santa Barbara | L, 1-2",
 "Final Sep 19 Weber State at Utah Valley | L, 0-3",
 "Final Sep 25 Weber State vs Colorado State | W, 3-1",
 "Final Oct 1 Weber State at Idaho | T, 1-1",
 "Final Oct 4 Weber State at Eastern Washington | W, 3-2",
 "Final Oct 8 Weber State vs Utah Tech | W, 5-0",
 "Final Oct 11 Weber State vs Southern Utah | W, 1-0",
 "Final Oct 15 Weber State at Portland State | L, 1-2",
 "Final Oct 18 Weber State at Montana | W, 3-0",
 "Upcoming Oct 29, 7:00 PM Weber State vs Northern Colorado | ",
 "Upcoming Nov 1, 1:00 PM Weber State vs Northern Arizona | ",
 "Upcoming Nov 5, 1:00 PM Weber State vs Idaho State | ",
 "Upcoming Nov 11 Weber State at Big Sky Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Weber State at Barb Chandler Tournament | Completed",
 "Final Oct 2 Women's · Weber State at Big Sky Individual Championships | Completed",
 "Final Oct 13 Women's · Weber State at ITA Mountain Regionals | Completed",
 "Upcoming Oct 30 Women's · Weber State at Bobcat Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Weber State at Bedford Cup | Completed",
 "Final Sep 25 Men's · Weber State at Boise State Invite | Completed",
 "Final Oct 6 Men's · Weber State at ITA Mountain Regionals | Completed",
 "Upcoming Oct 23 Men's · Weber State at Bobcat Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Weber State at Utah (Exhibition) | L, 1-3",
 "Final Aug 21 Weber State vs Westminster (Exhibition) | W, 4-0",
 "Final Aug 28 Weber State vs San Francisco | W, 3-1",
 "Final Aug 29 Weber State vs San Jose State | W, 3-0",
 "Final Aug 29 Weber State vs Belmont | W, 3-2",
 "Final Sep 4 Weber State at CSU Bakersfield | W, 3-1",
 "Final Sep 5 Weber State at CSU Bakersfield | L, 2-3",
 "Final Sep 10 Weber State at Nevada | W, 3-0",
 "Final Sep 11 Weber State vs Kansas State | L, 1-3",
 "Final Sep 15 Weber State vs Utah State | W, 3-2",
 "Final Sep 17 Weber State vs BYU | L, 0-3",
 "Final Sep 19 Weber State at Utah Valley | W, 3-1",
 "Final Sep 24 Weber State at Eastern Washington | L, 1-3",
 "Final Sep 26 Weber State at Idaho | W, 3-1",
 "Final Oct 1 Weber State vs Portland State | W, 3-1",
 "Final Oct 3 Weber State vs Northern Arizona | L, 0-3",
 "Final Oct 8 Weber State at Utah Tech | L, 1-3",
 "Final Oct 10 Weber State at Southern Utah | W, 3-1",
 "Final Oct 13 Weber State at Idaho State | W, 3-1",
 "Final Oct 17 Weber State vs Northern Colorado | W, 3-1",
 "Upcoming Oct 22, 6:00 PM Weber State vs Montana State | ",
 "Upcoming Oct 24, 2:00 PM Weber State at Montana | ",
 "Upcoming Oct 27, 6:00 PM Weber State vs Idaho State | ",
 "Upcoming Oct 29, 6:00 PM Weber State at Northern Colorado | ",
 "Upcoming Nov 5, 6:00 PM Weber State vs Southern Utah | ",
 "Upcoming Nov 7, 1:00 PM Weber State vs Utah Tech | ",
 "Upcoming Nov 12, 6:30 PM Weber State at Northern Arizona | ",
 "Upcoming Nov 14, 6:00 PM Weber State at Portland State | ",
 "Upcoming Nov 18, 6:00 PM Weber State vs Idaho | ",
 "Upcoming Nov 20, 6:00 PM Weber State vs Eastern Washington | ",
 "Upcoming Nov 23 Weber State at Big Sky Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Weber State module checks passed");
