import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {montanaStateSchool} from '../src/schools/montana-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='montana-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,montanaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/montana-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit msubobcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['montana-state'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',montanaStateSchool.scheduleUrls],['roster',montanaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('montana-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'msubobcats.com',`${key} must stay on msubobcats.com`);
  }
}
const parity={"Basketball":{"schedule":["https://msubobcats.com/sports/mens-basketball/schedule","https://msubobcats.com/sports/womens-basketball/schedule"],"roster":["https://msubobcats.com/sports/mens-basketball/roster","https://msubobcats.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://msubobcats.com/sports/womens-cross-country/schedule","https://msubobcats.com/sports/mens-cross-country/schedule"],"roster":["https://msubobcats.com/sports/womens-cross-country/roster","https://msubobcats.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://msubobcats.com/sports/football/schedule"],"roster":["https://msubobcats.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://msubobcats.com/sports/womens-golf/schedule"],"roster":["https://msubobcats.com/sports/womens-golf/roster"],"combined":false},"Skiing":{"schedule":["https://msubobcats.com/sports/ski/schedule"],"roster":["https://msubobcats.com/sports/ski/roster"],"combined":false},"Tennis":{"schedule":["https://msubobcats.com/sports/womens-tennis/schedule","https://msubobcats.com/sports/mens-tennis/schedule"],"roster":["https://msubobcats.com/sports/womens-tennis/roster","https://msubobcats.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://msubobcats.com/sports/womens-track-and-field/schedule","https://msubobcats.com/sports/mens-track-and-field/schedule"],"roster":["https://msubobcats.com/sports/womens-track-and-field/roster","https://msubobcats.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://msubobcats.com/sports/womens-volleyball/schedule"],"roster":["https://msubobcats.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'montana-state|"+sport+"':"),`${sport} routes must live in the Montana State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://msubobcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.montanaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=montana-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 10:30 AM Men's · Montana State at Kansas City (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · Montana State at Colorado State | ",
 "Upcoming Nov 7, 1:00 PM Men's · Montana State vs Long Beach State | ",
 "Upcoming Nov 12, 7:00 PM Men's · Montana State at BYU | ",
 "Upcoming Nov 15, 4:00 PM Men's · Montana State vs Cal Poly | ",
 "Upcoming Nov 17 Men's · Montana State at Gonzaga | ",
 "Upcoming Nov 19, 5:00 PM Men's · Montana State at High Point | ",
 "Upcoming Nov 25, 7:00 PM Men's · Montana State vs Northwest Indian College | ",
 "Upcoming Nov 30 Men's · Montana State at South Dakota | ",
 "Upcoming Dec 5, 6:00 PM Men's · Montana State at Northern Arizona | ",
 "Upcoming Dec 7, 7:00 PM Men's · Montana State vs West Coast Baptist | ",
 "Upcoming Dec 11 Men's · Montana State at San Diego State | ",
 "Upcoming Dec 20, 4:00 PM Men's · Montana State vs North Dakota | ",
 "Upcoming Dec 22, 1:00 PM Men's · Montana State vs Northwest | ",
 "Upcoming Dec 31, 2:00 PM Men's · Montana State vs Portland State | ",
 "Upcoming Jan 2, 6:00 PM Men's · Montana State vs Northern Colorado | ",
 "Upcoming Jan 7, 7:00 PM Men's · Montana State at Idaho State | ",
 "Upcoming Jan 9, 4:00 PM Men's · Montana State at Weber State | ",
 "Upcoming Jan 14, 7:00 PM Men's · Montana State vs Eastern Washington | ",
 "Upcoming Jan 16, 2:00 PM Men's · Montana State vs Idaho | ",
 "Upcoming Jan 18, 6:30 PM Men's · Montana State at Southern Utah | ",
 "Upcoming Jan 23, 7:00 PM Men's · Montana State vs Montana | ",
 "Upcoming Jan 25, 6:00 PM Men's · Montana State vs Utah Tech | ",
 "Upcoming Jan 28, 7:00 PM Men's · Montana State vs Northern Arizona | ",
 "Upcoming Feb 4, 6:00 PM Men's · Montana State at Northern Colorado | ",
 "Upcoming Feb 6, 3:00 PM Men's · Montana State at Portland State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Montana State at Idaho | ",
 "Upcoming Feb 13, 3:00 PM Men's · Montana State at Eastern Washington | ",
 "Upcoming Feb 18, 7:00 PM Men's · Montana State vs Weber State | ",
 "Upcoming Feb 20, 6:00 PM Men's · Montana State vs Idaho State | ",
 "Upcoming Feb 22, 7:00 PM Men's · Montana State vs Southern Utah | ",
 "Upcoming Feb 27, 7:00 PM Men's · Montana State at Montana | ",
 "Upcoming Mar 1, 7:00 PM Men's · Montana State at Utah Tech | ",
 "Upcoming Mar 5 Men's · Montana State at Big Sky Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 1:00 PM Women's · Montana State vs South Dakota Mines (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Montana State vs Black Hills State | ",
 "Upcoming Nov 8, 2:00 PM Women's · Montana State vs Portland | ",
 "Upcoming Nov 15, 2:00 PM Women's · Montana State at UNLV | ",
 "Upcoming Nov 19, 6:00 PM Women's · Montana State at Iowa | ",
 "Upcoming Nov 24, 2:00 PM Women's · Montana State vs Oklahoma | ",
 "Upcoming Nov 25, 2:00 PM Women's · Montana State vs Middle Tennessee | ",
 "Upcoming Dec 5, 2:00 PM Women's · Montana State vs Northern Arizona | ",
 "Upcoming Dec 7, 6:00 PM Women's · Montana State at Houston | ",
 "Upcoming Dec 10, 7:00 PM Women's · Montana State vs MSU Billings | ",
 "Upcoming Dec 13, 2:00 PM Women's · Montana State vs South Dakota State | ",
 "Upcoming Dec 19, 3:00 PM Women's · Montana State at Oregon | ",
 "Upcoming Dec 21, 2:00 PM Women's · Montana State at Santa Clara | ",
 "Upcoming Dec 31, 3:00 PM Women's · Montana State at Portland State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Montana State at Northern Colorado | ",
 "Upcoming Jan 7, 7:00 PM Women's · Montana State vs Idaho State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Montana State vs Weber State | ",
 "Upcoming Jan 14, 7:00 PM Women's · Montana State at Eastern Washington | ",
 "Upcoming Jan 16, 2:00 PM Women's · Montana State at Idaho | ",
 "Upcoming Jan 18, 7:00 PM Women's · Montana State vs Southern Utah | ",
 "Upcoming Jan 23, 2:00 PM Women's · Montana State vs Montana | ",
 "Upcoming Jan 25, 7:00 PM Women's · Montana State at Utah Tech | ",
 "Upcoming Jan 28, 6:00 PM Women's · Montana State at Northern Arizona | ",
 "Upcoming Feb 4, 7:00 PM Women's · Montana State vs Northern Colorado | ",
 "Upcoming Feb 6, 2:00 PM Women's · Montana State vs Portland State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Montana State vs Idaho | ",
 "Upcoming Feb 13, 2:00 PM Women's · Montana State vs Eastern Washington | ",
 "Upcoming Feb 18, 6:00 PM Women's · Montana State at Weber State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Montana State at Idaho State | ",
 "Upcoming Feb 22, 6:30 PM Women's · Montana State at Southern Utah | ",
 "Upcoming Feb 27, 2:00 PM Women's · Montana State at Montana | ",
 "Upcoming Mar 1, 7:00 PM Women's · Montana State vs Utah Tech | ",
 "Upcoming Mar 5 Women's · Montana State at Big Sky Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Montana State at MSU Bobcat Twilight | 1st of 7",
 "Final Sep 18 Women's · Montana State at Montana Invite | 1st of 9",
 "Final Oct 3 Women's · Montana State at Frank Knott Classic | 1st of 17",
 "Final Oct 16 Women's · Montana State at Pre-National Invitational | 28th of 43",
 "Upcoming Oct 30, 12:00 PM Women's · Montana State at Big Sky Cross Country Championships | ",
 "Upcoming Nov 13, 11:00 AM Women's · Montana State at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21, 8:20 AM Women's · Montana State at NCAA Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Montana State at MSU Bobcat Twilight | 1st of 9",
 "Final Sep 18 Men's · Montana State at Montana Invite | 1st of 11",
 "Final Oct 3 Men's · Montana State at Frank Knott Classic | 1st of 18",
 "Final Oct 16 Men's · Montana State at Pre-National Invitational | 12th of 44",
 "Upcoming Oct 30, 11:00 AM Men's · Montana State at Big Sky Cross Country Championships | ",
 "Upcoming Nov 13, 12:00 PM Men's · Montana State at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21, 9:10 AM Men's · Montana State at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Montana State at Utah Tech | W, 54-0",
 "Final Sep 5 Montana State vs Butler | W, 51-24",
 "Final Sep 12 Montana State at Nevada | W, 20-7",
 "Final Sep 19 Montana State vs Central Connecticut State | W, 35-30",
 "Final Sep 26 Montana State vs Northern Arizona | W, 28-14",
 "Final Oct 2 Montana State at Idaho | L, 34-35",
 "Final Oct 17 Montana State at Eastern Washington | W, 56-20",
 "Upcoming Oct 24, 1:00 PM Montana State vs Weber State | ",
 "Upcoming Oct 31, 1:00 PM Montana State vs Cal Poly | ",
 "Upcoming Nov 7, 4:00 PM Montana State at Idaho State | ",
 "Upcoming Nov 14 Montana State at Northern Colorado | ",
 "Upcoming Nov 21 Montana State vs Montana | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Montana State at Branch Law Firm/McGuire Invitational | 4th of 13",
 "Final Sep 21 Montana State at Yellowstone Intercollegiate | 1st of 11",
 "Final Sep 28 Montana State at Diane Thomason Invitational | 7th of 13",
 "Final Oct 12 Montana State at Big O Classic | No team score (individuals only)",
 "Final Oct 19 Montana State at Route 66 Invitational | 12th of 16",
 "Upcoming Feb 8 Montana State at Mountain Classic Match Play | ",
 "Upcoming Feb 15 Montana State at The Molly Collegiate Invitational | ",
 "Upcoming Feb 22 Montana State at Causeway Invitational | ",
 "Upcoming Mar 12 Montana State at Red Rocks Invitational | ",
 "Upcoming Mar 22 Montana State at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 12 Montana State at Bobcat Desert Classic | ",
 "Upcoming Apr 21 Montana State at Big Sky Women's Golf Championship | ",
 "Upcoming May 10 Montana State at NCAA Regionals | ",
 "Upcoming May 20 Montana State at NCAA Championships | "
]);
  const v_ski=parse("Skiing","ski");
  assert.deepEqual(v_ski.map(line),[
 "Upcoming Oct 24 Montana State at Frozen Thunder Opener | ",
 "Upcoming Nov 28 Montana State at Yellowstone Ski Festival | ",
 "Upcoming Jan 2 Montana State at Utah Invitational (Nordic) | ",
 "Upcoming Jan 6 Montana State at RMISA Nordic Qualifiers | ",
 "Upcoming Jan 15 Montana State at Denver Invitational (Alpine) | ",
 "Upcoming Jan 16 Montana State at Colorado Invitational (Alpine) | ",
 "Upcoming Jan 28 Montana State at Utah Invitational (Alpine) | ",
 "Upcoming Jan 29 Montana State at Colorado Invitational (Nordic) | ",
 "Upcoming Feb 1 Montana State at RMISA Alpine Qualifiers (Alpine) | ",
 "Upcoming Feb 2 Montana State at Nevada Invitational | ",
 "Upcoming Feb 5 Montana State at Denver Invitational (Nordic) | ",
 "Upcoming Feb 13 Montana State at Ski for Soren | ",
 "Upcoming Feb 14 Montana State at Crosscut Classic | ",
 "Upcoming Feb 21 Montana State at Alaska Fairbanks Invitational | ",
 "Upcoming Feb 24 Montana State at RMISA Alpine Qualifiers (Alpine) | ",
 "Upcoming Feb 25 Montana State at RMISA Championships | ",
 "Upcoming Mar 10 Montana State at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Montana State at Idaho State Invitational | Completed",
 "Final Oct 2 Women's · Montana State at Big Sky Individual Championships | Completed",
 "Final Oct 13 Women's · Montana State at ITA Mountain Regionals | Completed",
 "Upcoming Oct 23 Women's · Montana State at Colorado Cup | ",
 "Upcoming Oct 30 Women's · Montana State at Bobcat Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Montana State at Bedford Cup at Air Force Academy | Completed",
 "Final Sep 25 Men's · Montana State at Dar Walters Invitational | Completed",
 "Final Oct 6 Men's · Montana State at ITA Fall Regionals | Completed",
 "Upcoming Oct 23 Men's · Montana State at Bobcat Invitational | ",
 "Upcoming Nov 6 Men's · Montana State at Gonzaga Fall Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Montana State vs Delaware | W, 3-2",
 "Final Aug 29 Montana State at Lafayette | W, 3-0",
 "Final Aug 30 Montana State vs Marist | W, 3-2",
 "Final Sep 3 Montana State at St. Thomas | L, 1-3",
 "Final Sep 4 Montana State vs Milwaukee | L, 2-3",
 "Final Sep 5 Montana State vs UIC | W, 3-0",
 "Final Sep 10 Montana State vs North Dakota State | W, 3-2",
 "Final Sep 12 Montana State vs Portland | L, 1-3",
 "Final Sep 17 Montana State at Mercer | W, 3-2",
 "Final Sep 18 Montana State vs Charleston Southern | L, 1-3",
 "Final Sep 19 Montana State vs Georgia State | W, 3-2",
 "Final Sep 22 Montana State at Montana | W, 3-1",
 "Final Sep 26 Montana State at Northern Colorado | L, 0-3",
 "Final Oct 1 Montana State vs Idaho | W, 3-0",
 "Final Oct 3 Montana State vs Eastern Washington | W, 3-1",
 "Final Oct 8 Montana State at Northern Arizona | L, 1-3",
 "Final Oct 10 Montana State at Portland State | W, 3-0",
 "Final Oct 15 Montana State vs Utah Tech | L, 2-3",
 "Final Oct 17 Montana State vs Southern Utah | W, 3-1",
 "Upcoming Oct 22, 6:00 PM Montana State at Weber State | ",
 "Upcoming Oct 24, 7:00 PM Montana State vs Idaho State | ",
 "Upcoming Oct 29, 6:30 PM Montana State at Southern Utah | ",
 "Upcoming Oct 30, 7:00 PM Montana State at Utah Tech | ",
 "Upcoming Nov 5, 8:00 PM Montana State vs Portland State | ",
 "Upcoming Nov 7, 7:00 PM Montana State vs Northern Arizona | ",
 "Upcoming Nov 12, 7:00 PM Montana State at Eastern Washington | ",
 "Upcoming Nov 14, 7:00 PM Montana State at Idaho | ",
 "Upcoming Nov 18, 7:00 PM Montana State vs Northern Colorado | ",
 "Upcoming Nov 20, 7:00 PM Montana State vs Montana | ",
 "Upcoming Nov 23 Montana State at Big Sky Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_ski,"Skiing ski");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf places from final stories whose cards publish none: a "Team
// Champions" headline (Yellowstone Intercollegiate, Sep 22) and a place whose
// suffix is in superscript, "finish 12 th" (Route 66 Invitational, Oct 20).
{
  const team="(?:Bobcats|Cats|Montana State|MSU|(?:Men's|Women's) Golf)";
  assert.deepEqual(['recap-2026-9-22-womens-golf-bobcats-repeat-as-yellowston.html.gz','recap-2026-10-20-womens-golf-montana-state-finishes-stron.html.gz'].map(name=>golfStoryPlace(fixture(name),{team})),['1st','12th']);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Montana State module checks passed");
