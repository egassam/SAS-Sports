import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {montanaSchool} from '../src/schools/montana.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='montana');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,montanaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/montana-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gogriz.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['montana'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',montanaSchool.scheduleUrls],['roster',montanaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('montana|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gogriz.com',`${key} must stay on gogriz.com`);
  }
}
const parity={"Basketball":{"schedule":["https://gogriz.com/sports/mens-basketball/schedule","https://gogriz.com/sports/womens-basketball/schedule"],"roster":["https://gogriz.com/sports/mens-basketball/roster","https://gogriz.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gogriz.com/sports/womens-cross-country/schedule","https://gogriz.com/sports/mens-cross-country/schedule"],"roster":["https://gogriz.com/sports/womens-cross-country/roster","https://gogriz.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gogriz.com/sports/football/schedule"],"roster":["https://gogriz.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gogriz.com/sports/womens-golf/schedule"],"roster":["https://gogriz.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://gogriz.com/sports/womens-soccer/schedule"],"roster":["https://gogriz.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gogriz.com/sports/softball/schedule"],"roster":["https://gogriz.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gogriz.com/sports/womens-tennis/schedule","https://gogriz.com/sports/mens-tennis/schedule"],"roster":["https://gogriz.com/sports/womens-tennis/roster","https://gogriz.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gogriz.com/sports/womens-track-and-field/schedule","https://gogriz.com/sports/mens-track-and-field/schedule"],"roster":["https://gogriz.com/sports/womens-track-and-field/roster","https://gogriz.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gogriz.com/sports/womens-volleyball/schedule"],"roster":["https://gogriz.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'montana|"+sport+"':"),`${sport} routes must live in the Montana module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://gogriz.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.montanaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=montana)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 7:00 PM Men's · Montana vs CSU Bakersfield (Exhibition) | ",
 "Upcoming Nov 2 Men's · Montana at Oregon | ",
 "Upcoming Nov 4, 7:00 PM Men's · Montana vs Salish Kootenai | ",
 "Upcoming Nov 10 Men's · Montana at San Francisco | ",
 "Upcoming Nov 14 Men's · Montana at North Dakota | ",
 "Upcoming Nov 16 Men's · Montana at Kansas State | ",
 "Upcoming Nov 23, 7:00 PM Men's · Montana vs Carroll College | ",
 "Upcoming Nov 30 Men's · Montana at Arizona State | ",
 "Upcoming Dec 3 Men's · Montana at Northern Arizona | ",
 "Upcoming Dec 5 Men's · Montana at Utah State | ",
 "Upcoming Dec 8, 7:00 PM Men's · Montana vs South Dakota | ",
 "Upcoming Dec 12 Men's · Montana at Cal Poly | ",
 "Upcoming Dec 18, 7:00 PM Men's · Montana vs Pepperdine | ",
 "Upcoming Dec 21, 7:00 PM Men's · Montana vs Providence (Mont.) | ",
 "Upcoming Dec 31, 4:00 PM Men's · Montana vs Northern Colorado | ",
 "Upcoming Jan 2, 2:00 PM Men's · Montana vs Portland State | ",
 "Upcoming Jan 7 Men's · Montana at Weber State | ",
 "Upcoming Jan 9 Men's · Montana at Idaho State | ",
 "Upcoming Jan 14, 7:00 PM Men's · Montana vs Idaho | ",
 "Upcoming Jan 16, 4:00 PM Men's · Montana vs Eastern Washington | ",
 "Upcoming Jan 18 Men's · Montana at Utah Tech | ",
 "Upcoming Jan 23 Men's · Montana at Montana State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Montana vs Southern Utah | ",
 "Upcoming Jan 30, 4:00 PM Men's · Montana vs Northern Arizona | ",
 "Upcoming Feb 4 Men's · Montana at Portland State | ",
 "Upcoming Feb 6 Men's · Montana at Northern Colorado | ",
 "Upcoming Feb 11 Men's · Montana at Eastern Washington | ",
 "Upcoming Feb 13 Men's · Montana at Idaho | ",
 "Upcoming Feb 18, 7:00 PM Men's · Montana vs Idaho State | ",
 "Upcoming Feb 20, 4:00 PM Men's · Montana vs Weber State | ",
 "Upcoming Feb 22, 7:00 PM Men's · Montana vs Utah Tech | ",
 "Upcoming Feb 27, 7:00 PM Men's · Montana vs Montana State | ",
 "Upcoming Mar 1 Men's · Montana at Southern Utah | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Montana vs Montana Western | ",
 "Upcoming Nov 7, 2:00 PM Women's · Montana at BYU | ",
 "Upcoming Nov 10, 10:00 AM Women's · Montana at Kansas State | ",
 "Upcoming Nov 13, 7:00 PM Women's · Montana vs Houston | ",
 "Upcoming Nov 18, 7:00 PM Women's · Montana at Gonzaga | ",
 "Upcoming Nov 22, 2:00 PM Women's · Montana vs MSU Northern | ",
 "Upcoming Nov 24, 7:00 PM Women's · Montana vs Carroll | ",
 "Upcoming Nov 29, 2:00 PM Women's · Montana at Seattle | ",
 "Upcoming Dec 3, 7:00 PM Women's · Montana vs Northern Arizona | ",
 "Upcoming Dec 13, 3:00 PM Women's · Montana at UC Davis | ",
 "Upcoming Dec 15, 7:00 PM Women's · Montana at Utah | ",
 "Upcoming Dec 19, 2:00 PM Women's · Montana vs South Dakota | ",
 "Upcoming Dec 31, 2:00 PM Women's · Montana at Northern Colorado | ",
 "Upcoming Jan 2, 3:00 PM Women's · Montana at Portland State | ",
 "Upcoming Jan 7, 7:00 PM Women's · Montana vs Weber State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Montana vs Idaho State | ",
 "Upcoming Jan 14, 7:00 PM Women's · Montana at Idaho | ",
 "Upcoming Jan 16, 3:00 PM Women's · Montana at Eastern Washington | ",
 "Upcoming Jan 18, 2:00 PM Women's · Montana vs Utah Tech | ",
 "Upcoming Jan 23, 2:00 PM Women's · Montana at Montana State | ",
 "Upcoming Jan 25, 6:30 PM Women's · Montana at Southern Utah | ",
 "Upcoming Jan 30, 2:00 PM Women's · Montana at Northern Arizona | ",
 "Upcoming Feb 4, 7:00 PM Women's · Montana vs Portland State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Montana vs Northern Colorado | ",
 "Upcoming Feb 11, 7:00 PM Women's · Montana vs Eastern Washington | ",
 "Upcoming Feb 13, 2:00 PM Women's · Montana vs Idaho | ",
 "Upcoming Feb 18, 7:00 PM Women's · Montana at Idaho State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Montana at Weber State | ",
 "Upcoming Feb 22, 7:00 PM Women's · Montana at Utah Tech | ",
 "Upcoming Feb 27, 2:00 PM Women's · Montana vs Montana State | ",
 "Upcoming Mar 1, 7:00 PM Women's · Montana vs Southern Utah | ",
 "Upcoming Mar 5 Women's · Montana at Big Sky Conference Play-In | ",
 "Upcoming Mar 6 Women's · Montana at Big Sky Conference First Round | ",
 "Upcoming Mar 7 Women's · Montana at Big Sky Conference Championship | ",
 "Upcoming Mar 9 Women's · Montana at Big Sky Conference Semifinals | ",
 "Upcoming Mar 10 Women's · Montana at Big Sky Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Montana at MSU Bobcat Twilight | Completed",
 "Final Sep 11 Women's · Montana at WSU Cougar Classic | Completed",
 "Final Sep 18 Women's · Montana at Montana Invite | Completed",
 "Final Oct 3 Women's · Montana at Frank Knott Classic | Completed",
 "Final Oct 17 Women's · Montana at LC State Invite | Completed",
 "Upcoming Oct 30, 12:00 PM Women's · Montana at Big Sky Conference Championship | ",
 "Upcoming Nov 13 Women's · Montana at NCAA Mountain Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Montana at MSU Bobcat Twilight | Completed",
 "Final Sep 11 Men's · Montana at WSU Cougar Classic | Completed",
 "Final Sep 18 Men's · Montana at Montana Invite | Completed",
 "Final Oct 3 Men's · Montana at Frank Knott Classic | Completed",
 "Final Oct 17 Men's · Montana at LC State Invite | Completed",
 "Upcoming Oct 30, 11:00 AM Men's · Montana at Big Sky Conference Championship | ",
 "Upcoming Nov 13 Men's · Montana at NCAA Mountain Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Montana vs Southern Utah | W, 28-21",
 "Final Sep 5 Montana vs Drake | W, 45-10",
 "Final Sep 12 Montana vs Utah Tech | W, 35-14",
 "Final Sep 19 Montana at Oregon State | L, 17-52",
 "Final Sep 26 Montana at UC Davis | W, 62-22",
 "Final Oct 3 Montana vs Northern Colorado | W, 36-14",
 "Final Oct 10 Montana at Northern Arizona | L, 44-49",
 "Final Oct 17 Montana vs Idaho | L, 35-42",
 "Upcoming Oct 31, 2:00 PM Montana at Eastern Washington | ",
 "Upcoming Nov 7, 1:00 PM Montana vs Portland State | ",
 "Upcoming Nov 14, 8:30 PM Montana vs Idaho State | ",
 "Upcoming Nov 21, 12:00 PM Montana at Montana State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Montana at Bear Brawl | 6th of 6",
 "Final Sep 21 Montana at Yellowstone Intercollegiate | 10th of 11",
 "Final Sep 28 Montana at Sun Mountain Intercollegiate | 1st of 4",
 "Upcoming Oct 26 Montana at French Broad Collegiate Invitational | ",
 "Upcoming Feb 8 Montana at Mountain Classic Match Play | ",
 "Upcoming Mar 2 Montana at Grand Canyon Invitational | ",
 "Upcoming Mar 12 Montana at Red Rocks Invitational | ",
 "Upcoming Apr 6 Montana at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 12 Montana at Bobcat Desert Classic | ",
 "Upcoming Apr 21 Montana at Big Sky Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Montana vs Bucknell | L, 0-1",
 "Final Aug 20 Montana at Seattle | L, 0-4",
 "Final Aug 23 Montana at Washington | L, 0-4",
 "Final Aug 27 Montana vs Lethbridge | W, 2-0",
 "Final Aug 30 Montana vs MSU Billings | W, 2-1",
 "Final Sep 6 Montana at Denver | L, 0-2",
 "Final Sep 11 Montana vs Wyoming | L, 1-3",
 "Final Sep 20 Montana at Gonzaga | L, 0-4",
 "Final Oct 1 Montana at Southern Utah | W, 1-0",
 "Final Oct 4 Montana at Utah Tech | L, 0-2",
 "Final Oct 15 Montana vs Idaho State | L, 0-2",
 "Final Oct 18 Montana vs Weber State | L, 0-3",
 "Upcoming Oct 22, 8:00 PM Montana at Northern Arizona | ",
 "Upcoming Oct 25, 12:00 PM Montana at Northern Colorado | ",
 "Upcoming Oct 29, 3:00 PM Montana vs Eastern Washington | ",
 "Upcoming Nov 1, 1:00 PM Montana vs Idaho | ",
 "Upcoming Nov 5, 1:00 PM Montana vs Portland State | ",
 "Upcoming Nov 11, 11:00 AM Montana at Big Sky Conference Quarterfinals (Game 1) | ",
 "Upcoming Nov 11, 2:00 PM Montana at Big Sky Conference Quarterfinals (Game 2) | ",
 "Upcoming Nov 13, 11:00 AM Montana at Big Sky Conference Semifinals (Game 1) | ",
 "Upcoming Nov 13, 2:00 PM Montana at Big Sky Conference Semifinals (Game 2) | ",
 "Upcoming Nov 15, 1:00 PM Montana at Big Sky Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Oct 10 Montana vs Black Hills State (Exhibition) (Game 1) | W, 13-9",
 "Final Oct 10 Montana vs Black Hills State (Game 2) | W, 15-6",
 "Final Oct 18 Montana vs North Idaho (Exhibition) (Game 1) | W, 17-0",
 "Final Oct 18 Montana vs North Idaho (Exhibition) (Game 2) | W, 17-0",
 "Upcoming Oct 24, 11:00 AM Montana vs MSU Billings (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM Montana vs Carroll (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Montana at Washington State Cougar Classic | Completed",
 "Final Sep 18 Women's · Montana at Idaho State Bengal Invite | Completed",
 "Final Oct 2 Women's · Montana at Weber State Invitational | Completed",
 "Final Oct 13 Women's · Montana at ITA Mountain Regional | Completed",
 "Upcoming Oct 30 Women's · Montana at Gonzaga Bulldog Classic | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 17 Men's · Montana at Bedford Cup | Completed",
 "Final Sep 24 Men's · Montana at Dar Walters Classic | Completed",
 "Final Oct 5 Men's · Montana at ITA Mountain Regional | Completed",
 "Upcoming Oct 29 Men's · Montana at Colorado Cup | ",
 "Upcoming Nov 5 Men's · Montana at ITA West Sectional | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Montana vs Central Michigan | W, 3-0",
 "Final Aug 29 Montana at Washington State | L, 1-3",
 "Final Sep 3 Montana vs Seattle U | W, 3-0",
 "Final Sep 4 Montana at Oregon State | L, 1-3",
 "Final Sep 5 Montana vs Cal Baptist | W, 3-2",
 "Final Sep 11 Montana vs Eastern Michigan | L, 0-3",
 "Final Sep 11 Montana at Oakland | L, 0-3",
 "Final Sep 12 Montana vs UAB | L, 0-3",
 "Final Sep 17 Montana vs North Dakota State | L, 1-3",
 "Final Sep 18 Montana vs Seattle U | W, 3-0",
 "Final Sep 19 Montana at Gonzaga | L, 0-3",
 "Final Sep 22 Montana vs Montana State | L, 1-3",
 "Final Sep 24 Montana at Northern Colorado | L, 1-3",
 "Final Oct 1 Montana vs Eastern Washington | L, 1-3",
 "Final Oct 3 Montana vs Idaho | W, 3-0",
 "Final Oct 8 Montana at Portland State | L, 1-3",
 "Final Oct 10 Montana at Northern Arizona | L, 0-3",
 "Final Oct 15 Montana vs Southern Utah | W, 3-1",
 "Final Oct 17 Montana vs Utah Tech | L, 0-3",
 "Upcoming Oct 22, 7:00 PM Montana at Idaho State | ",
 "Upcoming Oct 24, 2:00 PM Montana vs Weber State | ",
 "Upcoming Oct 29, 6:00 PM Montana at Utah Tech | ",
 "Upcoming Oct 31, 6:30 PM Montana at Southern Utah | ",
 "Upcoming Nov 5, 7:00 PM Montana vs Northern Arizona | ",
 "Upcoming Nov 7, 7:00 PM Montana vs Portland State | ",
 "Upcoming Nov 12, 7:00 PM Montana at Idaho | ",
 "Upcoming Nov 14, 3:00 PM Montana at Eastern Washington | ",
 "Upcoming Nov 16, 7:00 PM Montana vs Northern Colorado | ",
 "Upcoming Nov 20, 7:00 PM Montana at Montana State | ",
 "Upcoming Nov 23 Montana at Big Sky Conference Tournament | "
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

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Montana module checks passed");
