import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southernUtahSchool} from '../src/schools/southern-utah.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southern-utah');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southernUtahHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southern-utah-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit suutbirds.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southern-utah'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',southernUtahSchool.scheduleUrls],['roster',southernUtahSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southern-utah|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'suutbirds.com',`${key} must stay on suutbirds.com`);
  }
}
const parity={"Basketball":{"schedule":["https://suutbirds.com/sports/mens-basketball/schedule","https://suutbirds.com/sports/womens-basketball/schedule"],"roster":["https://suutbirds.com/sports/mens-basketball/roster","https://suutbirds.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://suutbirds.com/sports/womens-cross-country/schedule","https://suutbirds.com/sports/mens-cross-country/schedule"],"roster":["https://suutbirds.com/sports/womens-cross-country/roster","https://suutbirds.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://suutbirds.com/sports/football/schedule"],"roster":["https://suutbirds.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://suutbirds.com/sports/womens-golf/schedule","https://suutbirds.com/sports/mens-golf/schedule"],"roster":["https://suutbirds.com/sports/womens-golf/roster","https://suutbirds.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://suutbirds.com/sports/womens-gymnastics/schedule"],"roster":["https://suutbirds.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://suutbirds.com/sports/womens-soccer/schedule"],"roster":["https://suutbirds.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://suutbirds.com/sports/softball/schedule"],"roster":["https://suutbirds.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://suutbirds.com/sports/womens-track-and-field/schedule","https://suutbirds.com/sports/mens-track-and-field/schedule"],"roster":["https://suutbirds.com/sports/womens-track-and-field/roster","https://suutbirds.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://suutbirds.com/sports/womens-volleyball/schedule"],"roster":["https://suutbirds.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southern-utah|"+sport+"':"),`${sport} routes must live in the Southern Utah module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://suutbirds.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southernUtahHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southern-utah)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Southern Utah vs West Coast Baptist College | ",
 "Upcoming Nov 5, 6:30 PM Men's · Southern Utah vs Grace (California) | ",
 "Upcoming Nov 7, 6:30 PM Men's · Southern Utah vs Bethesda University of California | ",
 "Upcoming Nov 12, 5:00 PM Men's · Southern Utah at High Point | ",
 "Upcoming Nov 14 Men's · Southern Utah at Wake Forest | ",
 "Upcoming Nov 19 Men's · Southern Utah at Texas | ",
 "Upcoming Nov 23 Men's · Southern Utah at FIU MTE | ",
 "Upcoming Dec 3, 6:30 PM Men's · Southern Utah vs Idaho State | ",
 "Upcoming Dec 5, 6:30 PM Men's · Southern Utah vs Weber State | ",
 "Upcoming Dec 8 Men's · Southern Utah at Washington | ",
 "Upcoming Dec 12, 3:00 PM Men's · Southern Utah at San Jose State | ",
 "Upcoming Dec 22, 7:00 PM Men's · Southern Utah at Utah | ",
 "Upcoming Dec 31, 6:00 PM Men's · Southern Utah at Eastern Washington | ",
 "Upcoming Jan 2, 3:00 PM Men's · Southern Utah at Idaho | ",
 "Upcoming Jan 7, 6:30 PM Men's · Southern Utah vs Northern Colorado | ",
 "Upcoming Jan 9, 6:30 PM Men's · Southern Utah vs Portland State | ",
 "Upcoming Jan 16, 7:00 PM Men's · Southern Utah at Utah Tech | ",
 "Upcoming Jan 18, 6:30 PM Men's · Southern Utah vs Montana State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Southern Utah at Montana | ",
 "Upcoming Jan 28, 6:00 PM Men's · Southern Utah at Weber State | ",
 "Upcoming Jan 30, 4:00 PM Men's · Southern Utah at Idaho State | ",
 "Upcoming Feb 4, 6:30 PM Men's · Southern Utah vs Idaho | ",
 "Upcoming Feb 6, 6:30 PM Men's · Southern Utah vs Eastern Washington | ",
 "Upcoming Feb 8, 6:00 PM Men's · Southern Utah at Northern Arizona | ",
 "Upcoming Feb 13, 6:30 PM Men's · Southern Utah vs Utah Tech | ",
 "Upcoming Feb 18, 8:00 PM Men's · Southern Utah at Portland State | ",
 "Upcoming Feb 20, 2:00 PM Men's · Southern Utah at Northern Colorado | ",
 "Upcoming Feb 22, 7:00 PM Men's · Southern Utah at Montana State | ",
 "Upcoming Feb 27, 6:30 PM Men's · Southern Utah vs Northern Arizona | ",
 "Upcoming Mar 1, 6:30 PM Men's · Southern Utah vs Montana | ",
 "Upcoming Mar 5 Men's · Southern Utah at Starch Madness | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Southern Utah vs Redlands | ",
 "Upcoming Nov 6 Women's · Southern Utah at New Mexico State | ",
 "Upcoming Nov 9, 6:30 PM Women's · Southern Utah vs Park University Gilbert (AZ) | ",
 "Upcoming Nov 13 Women's · Southern Utah at Washington State | ",
 "Upcoming Nov 18 Women's · Southern Utah at Air Force | ",
 "Upcoming Nov 22, 1:00 PM Women's · Southern Utah vs Eastern Washington | ",
 "Upcoming Nov 24, 6:30 PM Women's · Southern Utah vs Nelson (AZ) | ",
 "Upcoming Nov 28, 2:00 PM Women's · Southern Utah vs San Diego | ",
 "Upcoming Dec 3 Women's · Southern Utah at Idaho State | ",
 "Upcoming Dec 5 Women's · Southern Utah at Weber State | ",
 "Upcoming Dec 9 Women's · Southern Utah at BYU | ",
 "Upcoming Dec 12 Women's · Southern Utah at San Jose State | ",
 "Upcoming Dec 18, 6:30 PM Women's · Southern Utah vs Cal State Fullerton | ",
 "Upcoming Dec 22 Women's · Southern Utah at California | ",
 "Upcoming Dec 31, 6:30 PM Women's · Southern Utah vs Eastern Washington | ",
 "Upcoming Jan 2, 2:00 PM Women's · Southern Utah vs Idaho | ",
 "Upcoming Jan 7 Women's · Southern Utah at Northern Colorado | ",
 "Upcoming Jan 9 Women's · Southern Utah at Portland State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Southern Utah vs Utah Tech | ",
 "Upcoming Jan 18 Women's · Southern Utah at Montana State | ",
 "Upcoming Jan 25, 6:30 PM Women's · Southern Utah vs Montana | ",
 "Upcoming Jan 28, 6:30 PM Women's · Southern Utah vs Weber State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Southern Utah vs Idaho State | ",
 "Upcoming Feb 4 Women's · Southern Utah at Idaho | ",
 "Upcoming Feb 6 Women's · Southern Utah at Eastern Washington | ",
 "Upcoming Feb 8, 7:00 PM Women's · Southern Utah vs Northern Arizona | ",
 "Upcoming Feb 13 Women's · Southern Utah at Utah Tech | ",
 "Upcoming Feb 17, 6:30 PM Women's · Southern Utah vs Portland State | ",
 "Upcoming Feb 20, 12:00 PM Women's · Southern Utah vs Northern Colorado | ",
 "Upcoming Feb 22, 6:30 PM Women's · Southern Utah vs Montana State | ",
 "Upcoming Feb 27 Women's · Southern Utah at Northern Arizona | ",
 "Upcoming Mar 1 Women's · Southern Utah at Montana | ",
 "Upcoming Mar 5 Women's · Southern Utah at Big Sky Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Southern Utah at UVU Invite | Completed",
 "Final Sep 19 Women's · Southern Utah at UCR Invitational | Completed",
 "Final Oct 3 Women's · Southern Utah at SUU Color Country Invitational | Completed",
 "Final Oct 9 Women's · Southern Utah at Bill Dellinger Invite | Completed",
 "Upcoming Oct 30 Women's · Southern Utah at Big Sky Conference XC Championships | ",
 "Upcoming Nov 13 Women's · Southern Utah at UNM Mountain Regionals | ",
 "Upcoming Nov 21 Women's · Southern Utah at NCAA DI National XC Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Southern Utah at UVU Invite | Completed",
 "Final Sep 19 Men's · Southern Utah at UCR Invitational | Completed",
 "Final Oct 3 Men's · Southern Utah at SUU Color Country Invitational | Completed",
 "Final Oct 9 Men's · Southern Utah at Bill Dellinger Invite | Completed",
 "Final Oct 16 Men's · Southern Utah at Pre-Nationals Invitational | Completed",
 "Upcoming Oct 30 Men's · Southern Utah at Big Sky Conference XC Championships | ",
 "Upcoming Nov 13 Men's · Southern Utah at UNM Mountain Regionals | ",
 "Upcoming Nov 21 Men's · Southern Utah at NCAA DI National XC Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Southern Utah at Montana | L, 21-28",
 "Final Sep 5 Southern Utah vs Weber State | W, 47-42",
 "Final Sep 12 Southern Utah at Colorado State | L, 24-58",
 "Final Sep 19 Southern Utah at St. Thomas | L, 26-28",
 "Final Sep 26 Southern Utah vs Idaho State | L, 24-28",
 "Final Oct 3 Southern Utah at Utah Tech | W, 46-33",
 "Final Oct 17 Southern Utah vs UC Davis | W, 38-17",
 "Upcoming Oct 24, 3:00 PM Southern Utah at Idaho | ",
 "Upcoming Oct 31, 1:00 PM Southern Utah vs Northern Arizona | ",
 "Upcoming Nov 7, 1:00 PM Southern Utah vs Northern Colorado | ",
 "Upcoming Nov 13, 8:00 PM Southern Utah at Portland State | ",
 "Upcoming Nov 21, 12:00 PM Southern Utah vs Chicago State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Southern Utah at Wolverine Invitational | 3rd of 10",
 "Final Sep 21 Women's · Southern Utah at Yellowstone Intercollegiate | 7th of 11",
 "Final Oct 12 Women's · Southern Utah at Golf Iconic Classic | 19th of 19",
 "Upcoming Oct 25 Women's · Southern Utah at Clash at Boulder Creek Golf Club | ",
 "Upcoming Feb 8 Women's · Southern Utah at Ventura Harbor Collegiate | ",
 "Upcoming Mar 6 Women's · Southern Utah at Pizza Hut Lady Thunderbird Invitational | ",
 "Upcoming Mar 12 Women's · Southern Utah at Red Rocks Invitational | ",
 "Upcoming Mar 22 Women's · Southern Utah at Ozarks National Invitational | ",
 "Upcoming Apr 12 Women's · Southern Utah at Bobcat Desert Classic | ",
 "Upcoming Apr 21 Women's · Southern Utah at Big Sky Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Southern Utah at Gene Miranda Falcon Invitational | 15th of 18",
 "Final Sep 28 Men's · Southern Utah at SIUE Dolenc Invitational | 6th of 17",
 "Final Oct 12 Men's · Southern Utah at Visit Stockton Pacific Invitational | 18th of 18",
 "Final Oct 19 Men's · Southern Utah at Twin Oaks Intercollegiate | 6th of 7",
 "Upcoming Feb 1 Men's · Southern Utah at Bill Cullum Invitational | ",
 "Upcoming Feb 22 Men's · Southern Utah at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · Southern Utah at The Watney Invitational | ",
 "Upcoming Mar 12 Men's · Southern Utah at Jackrabbit Invitational | ",
 "Upcoming Mar 21 Men's · Southern Utah at UC San Diego Invitational | ",
 "Upcoming Mar 29 Men's · Southern Utah at Wyoming Cowboy Classic | ",
 "Upcoming Apr 26 Men's · Southern Utah at Big Sky Conference Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Southern Utah at College of Charleston | L, 1-3",
 "Final Aug 14 Southern Utah at South Carolina State | W, 1-0",
 "Final Aug 17 Southern Utah at The Citadel | W, 1-0",
 "Final Aug 22 Southern Utah at Utah | L, 0-3",
 "Final Aug 27 Southern Utah at Sacramento State | L, 1-2",
 "Final Sep 3 Southern Utah vs UC Irvine | L, 0-1",
 "Final Sep 6 Southern Utah vs Justice College | W, 18-0",
 "Final Sep 13 Southern Utah vs CSUN | T, 2-2",
 "Final Sep 17 Southern Utah at Boise State | L, 0-2",
 "Final Oct 1 Southern Utah vs Montana | L, 0-1",
 "Final Oct 4 Southern Utah vs Portland State | W, 1-0",
 "Final Oct 8 Southern Utah at Idaho State | T, 0-0",
 "Final Oct 11 Southern Utah at Weber State | L, 0-1",
 "Final Oct 15 Southern Utah vs Northern Arizona | T, 1-1",
 "Final Oct 18 Southern Utah vs Northern Colorado | L, 1-2",
 "Upcoming Oct 22, 4:00 PM Southern Utah at Eastern Washington | ",
 "Upcoming Oct 25, 2:00 PM Southern Utah at Idaho | ",
 "Upcoming Nov 5, 1:00 PM Southern Utah vs Utah Tech | ",
 "Upcoming Nov 12 Southern Utah at Big Sky Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 11:00 AM Southern Utah vs Crestmont | ",
 "Upcoming Oct 24, 12:00 PM Southern Utah at Utah Valley | ",
 "Upcoming Oct 24, 4:00 PM Southern Utah at BYU | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Southern Utah vs Gonzaga | L, 0-3",
 "Final Aug 29 Southern Utah at Saint Mary's College of California | L, 0-3",
 "Final Aug 30 Southern Utah at Pacific | L, 2-3",
 "Final Sep 3 Southern Utah at Fresno State | L, 0-3",
 "Final Sep 4 Southern Utah vs UC Irvine | L, 0-3",
 "Final Sep 5 Southern Utah vs New Mexico State | L, 1-3",
 "Final Sep 11 Southern Utah at Seattle | L, 1-3",
 "Final Sep 12 Southern Utah at Washington State | L, 0-3",
 "Final Sep 18 Southern Utah vs Chicago State | W, 3-0",
 "Final Sep 19 Southern Utah vs UC Riverside | L, 0-3",
 "Final Sep 24 Southern Utah at Northern Arizona | L, 0-3",
 "Final Sep 26 Southern Utah at Portland State | L, 1-3",
 "Final Sep 29 Southern Utah at Utah Tech | L, 1-3",
 "Final Oct 3 Southern Utah vs Northern Colorado | L, 0-3",
 "Final Oct 8 Southern Utah vs Idaho State | L, 0-3",
 "Final Oct 10 Southern Utah vs Weber State | L, 1-3",
 "Final Oct 15 Southern Utah at Montana | L, 1-3",
 "Final Oct 17 Southern Utah at Montana State | L, 1-3",
 "Upcoming Oct 22, 6:30 PM Southern Utah vs Eastern Washington | ",
 "Upcoming Oct 24, 6:00 PM Southern Utah at Idaho | ",
 "Upcoming Oct 29, 6:30 PM Southern Utah vs Montana State | ",
 "Upcoming Oct 31, 6:30 PM Southern Utah vs Montana | ",
 "Upcoming Nov 5, 6:00 PM Southern Utah at Weber State | ",
 "Upcoming Nov 7, 2:00 PM Southern Utah at Idaho State | ",
 "Upcoming Nov 10, 6:30 PM Southern Utah vs Utah Tech | ",
 "Upcoming Nov 12, 6:00 PM Southern Utah at Northern Colorado | ",
 "Upcoming Nov 18, 6:30 PM Southern Utah vs Portland State | ",
 "Upcoming Nov 20, 6:30 PM Southern Utah vs Northern Arizona | ",
 "Upcoming Nov 23 Southern Utah at Big Sky Conference Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southern Utah module checks passed");
