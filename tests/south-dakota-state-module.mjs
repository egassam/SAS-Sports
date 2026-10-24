import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southDakotaStateSchool} from '../src/schools/south-dakota-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-dakota-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southDakotaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-dakota-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gojacks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-dakota-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',southDakotaStateSchool.scheduleUrls],['roster',southDakotaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-dakota-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gojacks.com',`${key} must stay on gojacks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gojacks.com/sports/baseball/schedule"],"roster":["https://gojacks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gojacks.com/sports/mens-basketball/schedule","https://gojacks.com/sports/womens-basketball/schedule"],"roster":["https://gojacks.com/sports/mens-basketball/roster","https://gojacks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gojacks.com/sports/womens-cross-country/schedule","https://gojacks.com/sports/mens-cross-country/schedule"],"roster":["https://gojacks.com/sports/womens-cross-country/roster","https://gojacks.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://gojacks.com/sports/equestrian/schedule"],"roster":["https://gojacks.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://gojacks.com/sports/football/schedule"],"roster":["https://gojacks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gojacks.com/sports/womens-golf/schedule","https://gojacks.com/sports/mens-golf/schedule"],"roster":["https://gojacks.com/sports/womens-golf/roster","https://gojacks.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gojacks.com/sports/womens-soccer/schedule"],"roster":["https://gojacks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gojacks.com/sports/softball/schedule"],"roster":["https://gojacks.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gojacks.com/sports/womens-swimming-and-diving/schedule","https://gojacks.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gojacks.com/sports/womens-swimming-and-diving/roster","https://gojacks.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gojacks.com/sports/womens-track-and-field/schedule","https://gojacks.com/sports/mens-track-and-field/schedule"],"roster":["https://gojacks.com/sports/womens-track-and-field/roster","https://gojacks.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gojacks.com/sports/womens-volleyball/schedule"],"roster":["https://gojacks.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gojacks.com/sports/wrestling/schedule"],"roster":["https://gojacks.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-dakota-state|"+sport+"':"),`${sport} routes must live in the South Dakota State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://gojacks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southDakotaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-dakota-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · South Dakota State at Kansas State | ",
 "Upcoming Nov 6, 8:30 PM Men's · South Dakota State vs Briar Cliff | ",
 "Upcoming Nov 11, 7:00 PM Men's · South Dakota State vs Valparaiso | ",
 "Upcoming Nov 14, 3:00 PM Men's · South Dakota State vs Northern Colorado | ",
 "Upcoming Nov 16, 7:00 PM Men's · South Dakota State vs Mayville State | ",
 "Upcoming Nov 20, 3:00 PM Men's · South Dakota State at Idaho State | ",
 "Upcoming Nov 25, 1:00 PM Men's · South Dakota State vs Abilene Christian | ",
 "Upcoming Nov 28, 4:30 PM Men's · South Dakota State vs South Alabama | ",
 "Upcoming Nov 29, 4:30 PM Men's · South Dakota State vs Fresno State | ",
 "Upcoming Dec 5, 6:00 PM Men's · South Dakota State at Abilene Christian | ",
 "Upcoming Dec 8, 7:00 PM Men's · South Dakota State vs Milwaukee | ",
 "Upcoming Dec 12 Men's · South Dakota State vs Idaho | ",
 "Upcoming Dec 14, 7:00 PM Men's · South Dakota State vs Buena Vista | ",
 "Upcoming Dec 18, 6:00 PM Men's · South Dakota State at Eastern Kentucky | ",
 "Upcoming Dec 21, 7:00 PM Men's · South Dakota State vs Green Bay | ",
 "Upcoming Dec 29, 9:00 PM Men's · South Dakota State at Nevada | ",
 "Upcoming Jan 2, 4:30 PM Men's · South Dakota State vs Dakota Wesleyan | ",
 "Upcoming Jan 7, 7:00 PM Men's · South Dakota State at Kansas City | ",
 "Upcoming Jan 9, 7:00 PM Men's · South Dakota State at Oral Roberts | ",
 "Upcoming Jan 15, 7:00 PM Men's · South Dakota State at South Dakota | ",
 "Upcoming Jan 21, 7:00 PM Men's · South Dakota State vs North Dakota State | ",
 "Upcoming Jan 23, 2:00 PM Men's · South Dakota State vs North Dakota | ",
 "Upcoming Jan 28, 7:00 PM Men's · South Dakota State at St. Thomas | ",
 "Upcoming Jan 31, 1:00 PM Men's · South Dakota State at Omaha | ",
 "Upcoming Feb 4, 7:00 PM Men's · South Dakota State vs Oral Roberts | ",
 "Upcoming Feb 6, 2:00 PM Men's · South Dakota State vs Kansas City | ",
 "Upcoming Feb 13, 1:00 PM Men's · South Dakota State vs South Dakota | ",
 "Upcoming Feb 18, 7:00 PM Men's · South Dakota State at North Dakota | ",
 "Upcoming Feb 20, 1:00 PM Men's · South Dakota State at North Dakota State | ",
 "Upcoming Feb 25, 7:00 PM Men's · South Dakota State vs Omaha | ",
 "Upcoming Feb 27, 2:00 PM Men's · South Dakota State vs St. Thomas | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · South Dakota State vs St. Cloud State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · South Dakota State vs Creighton | ",
 "Upcoming Nov 6, 6:00 PM Women's · South Dakota State vs Northern Iowa | ",
 "Upcoming Nov 11, 6:00 PM Women's · South Dakota State at Texas | ",
 "Upcoming Nov 15, 1:00 PM Women's · South Dakota State vs Oklahoma State | ",
 "Upcoming Nov 18, 7:00 PM Women's · South Dakota State vs Wyoming | ",
 "Upcoming Nov 22, 1:30 PM Women's · South Dakota State vs Kansas | ",
 "Upcoming Nov 27, 6:00 PM Women's · South Dakota State vs Rutgers | ",
 "Upcoming Nov 28, 2:30 PM Women's · South Dakota State vs Kentucky | ",
 "Upcoming Dec 2, 7:00 PM Women's · South Dakota State vs Dakota Wesleyan | ",
 "Upcoming Dec 6, 2:00 PM Women's · South Dakota State at Illinois State | ",
 "Upcoming Dec 9, 7:00 PM Women's · South Dakota State vs Dakota State | ",
 "Upcoming Dec 13, 2:00 PM Women's · South Dakota State at Montana State | ",
 "Upcoming Dec 19, 10:00 AM Women's · South Dakota State vs IU Indy | ",
 "Upcoming Dec 21, 12:15 PM Women's · South Dakota State vs Ole Miss | ",
 "Upcoming Dec 30, 6:00 PM Women's · South Dakota State at Gonzaga | ",
 "Upcoming Jan 2, 2:00 PM Women's · South Dakota State vs Black Hills State | ",
 "Upcoming Jan 7, 7:00 PM Women's · South Dakota State vs Kansas City | ",
 "Upcoming Jan 9, 1:00 PM Women's · South Dakota State vs Oral Roberts | ",
 "Upcoming Jan 16, 2:00 PM Women's · South Dakota State vs South Dakota | ",
 "Upcoming Jan 21, 7:00 PM Women's · South Dakota State at North Dakota State | ",
 "Upcoming Jan 23, 1:00 PM Women's · South Dakota State at North Dakota | ",
 "Upcoming Jan 28, 7:00 PM Women's · South Dakota State vs St. Thomas | ",
 "Upcoming Jan 30, 2:00 PM Women's · South Dakota State vs Omaha | ",
 "Upcoming Feb 4, 7:00 PM Women's · South Dakota State at Oral Roberts | ",
 "Upcoming Feb 6, 2:00 PM Women's · South Dakota State at Kansas City | ",
 "Upcoming Feb 13 Women's · South Dakota State at South Dakota | ",
 "Upcoming Feb 18, 7:00 PM Women's · South Dakota State vs North Dakota | ",
 "Upcoming Feb 20, 2:00 PM Women's · South Dakota State vs North Dakota State | ",
 "Upcoming Feb 25, 6:30 PM Women's · South Dakota State at Omaha | ",
 "Upcoming Feb 27, 6:00 PM Women's · South Dakota State at St. Thomas | ",
 "Upcoming Mar 4 Women's · South Dakota State at Summit League Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · South Dakota State at Augustana Twilight | 2nd of 28 · 63 pts",
 "Final Sep 25 Women's · South Dakota State at Gans Creek Classic | 15th of 29 · 406 pts",
 "Final Sep 25 Women's · South Dakota State at Augustana Invitational | 9th of 20 · 249 pts",
 "Final Oct 3 Women's · South Dakota State at Briar Cliff Invitational | 2nd of 9 · 71 pts",
 "Final Oct 16 Women's · South Dakota State at Under Armour Pre-National Invitational | 42nd of 43 · 1155 pts",
 "Final Oct 16 Women's · South Dakota State at Platte River Rumble | 2nd of 10 · 108 pts",
 "Upcoming Oct 31, 11:00 AM Women's · South Dakota State at The Summit League Championship | ",
 "Upcoming Nov 13 Women's · South Dakota State at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Women's · South Dakota State at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · South Dakota State at Augustana Twilight | 1st of 33 · 30 pts",
 "Final Sep 19 Men's · South Dakota State at St. Olaf Invitational | 1st of 18 · 24 pts",
 "Final Sep 25 Men's · South Dakota State at Gans Creek Classic | 11th of 30 · 283 pts",
 "Final Oct 3 Men's · South Dakota State at Briar Cliff Invitational | 2nd of 8 · 48 pts",
 "Final Oct 16 Men's · South Dakota State at Under Armour Pre-National Invitational | 26th of 44 · 643 pts",
 "Final Oct 16 Men's · South Dakota State at Platte River Rumble | 1st of 7 · 26 pts",
 "Upcoming Oct 31, 10:00 AM Men's · South Dakota State at The Summit League Championship | ",
 "Upcoming Nov 13 Men's · South Dakota State at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Men's · South Dakota State at NCAA Championship | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 17 South Dakota State at Baylor | W, 12-8",
 "Final Sep 18 South Dakota State at TCU | L, 2-16",
 "Final Oct 10 South Dakota State vs Minnesota Crookston | W, 11-9",
 "Final Oct 23 South Dakota State at Delaware State | L, 5-14",
 "Upcoming Oct 30 South Dakota State vs UT Martin | ",
 "Upcoming Nov 20 South Dakota State at UT Martin | ",
 "Upcoming Nov 21 South Dakota State vs South Carolina | ",
 "Upcoming Jan 22 South Dakota State vs Delaware State | ",
 "Upcoming Feb 13 South Dakota State vs SMU | ",
 "Upcoming Feb 19 South Dakota State vs TCU | ",
 "Upcoming Feb 26 South Dakota State at Minnesota Crookston | ",
 "Upcoming Mar 26 South Dakota State at ECAC Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 South Dakota State vs Stetson | W, 70-7",
 "Final Sep 5 South Dakota State at Northwestern | L, 18-34",
 "Final Sep 12 South Dakota State vs New Haven | W, 57-14",
 "Final Sep 19 South Dakota State vs Youngstown State | W, 27-20",
 "Final Sep 26 South Dakota State vs Eastern Illinois | W, 42-7",
 "Final Oct 3 South Dakota State at Illinois State | W, 31-14",
 "Final Oct 17 South Dakota State at North Dakota | L, 10-21",
 "Today Oct 24, 2:00 PM South Dakota State vs Murray State | ",
 "Upcoming Oct 31, 3:00 PM South Dakota State vs South Dakota | ",
 "Upcoming Nov 7, 1:00 PM South Dakota State at Northern Iowa | ",
 "Upcoming Nov 14, 1:00 PM South Dakota State at Southern Illinois | ",
 "Upcoming Nov 21, 2:00 PM South Dakota State vs Indiana State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · South Dakota State at Redbird Invitational | 10th of 13",
 "Final Sep 21 Women's · South Dakota State at Johnie Imes Invitational | 4th of 9",
 "Final Sep 28 Women's · South Dakota State at Powercat Classic | T4th of 12",
 "Final Oct 12 Women's · South Dakota State at MSU Payne Stewart Invitational | 8th of 12",
 "Upcoming Oct 25 Women's · South Dakota State at NAU Clash at Boulder Creek | ",
 "Upcoming Feb 14 Women's · South Dakota State at Spartan Suncoast Collegiate Invitational | ",
 "Upcoming Feb 26 Women's · South Dakota State at Reynolds Lake Oconee Invitationa | ",
 "Upcoming Mar 15 Women's · South Dakota State at Jackrabbits Invitational | ",
 "Upcoming Mar 20 Women's · South Dakota State at More Than Golf Invitational | ",
 "Upcoming Apr 11 Women's · South Dakota State at Boilermaker Spring Invite | ",
 "Upcoming Apr 25 Women's · South Dakota State at The Summit League Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · South Dakota State at Island Resort Intercollegiate | 8th of 12",
 "Final Sep 14 Men's · South Dakota State at Kansas State Wildcat Invitational | 3rd of 15",
 "Final Sep 27 Men's · South Dakota State at Badger Invitational | 2nd of 19",
 "Final Oct 5 Men's · South Dakota State at Kemper Lakes Intercollegiate | 3rd of 12",
 "Final Oct 12 Men's · South Dakota State at USF Invitational | Completed",
 "Final Oct 19 Men's · South Dakota State at Zach Johnson Invitational | T1st of 13",
 "Upcoming Feb 28 Men's · South Dakota State at Loyola Intercollegiate | ",
 "Upcoming Mar 12 Men's · South Dakota State at Jackrabbits Invitational | ",
 "Upcoming Mar 30 Men's · South Dakota State at Maridoe Collegiate | ",
 "Upcoming Apr 5 Men's · South Dakota State at Missouri Tiger Intercollegiate | ",
 "Upcoming Apr 18 Men's · South Dakota State at Hawkeye Invitational | ",
 "Upcoming May 2 Men's · South Dakota State at Summit League Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 South Dakota State vs Manitoba | W, 6-0",
 "Final Aug 16 South Dakota State vs MSU Moorhead | W, 11-0",
 "Final Aug 20 South Dakota State vs Washington State | W, 3-0",
 "Final Aug 23 South Dakota State at Kansas State | L, 0-2",
 "Final Aug 27 South Dakota State vs Western Illinois | W, 5-0",
 "Final Sep 3 South Dakota State vs Colorado College | T, 1-1",
 "Final Sep 10 South Dakota State at Weber State | W, 3-2",
 "Final Sep 13 South Dakota State at Utah State | L, 0-3",
 "Final Sep 24 South Dakota State at South Dakota | T, 0-0",
 "Final Sep 27 South Dakota State vs North Dakota | W, 2-1",
 "Final Oct 3 South Dakota State at North Dakota State | T, 0-0",
 "Final Oct 8 South Dakota State vs Oral Roberts | L, 1-2",
 "Final Oct 11 South Dakota State vs Kansas City | W, 3-0",
 "Final Oct 15 South Dakota State at St. Thomas | L, 0-1",
 "Final Oct 18 South Dakota State at Omaha | W, 2-0",
 "Final Oct 22 South Dakota State vs South Dakota | W, 3-2",
 "Upcoming Oct 29, 3:00 PM South Dakota State at North Dakota | ",
 "Upcoming Nov 1, 1:00 PM South Dakota State vs North Dakota State | ",
 "Upcoming Nov 6 South Dakota State at Summit League Tournament | ",
 "Upcoming Nov 11 South Dakota State at Summit League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · South Dakota State at Augustana | W, 155-71",
 "Final Oct 17 Women's · South Dakota State at Omaha | L, 113.5-184.5",
 "Final Oct 17 Women's · South Dakota State vs Nebraska | L, 67-231",
 "Upcoming Oct 30 Women's · South Dakota State at Coyote Extravaganza | ",
 "Upcoming Nov 19 Women's · South Dakota State at USD Invite | ",
 "Upcoming Jan 22 Women's · South Dakota State vs St. Thomas | ",
 "Upcoming Jan 22 Women's · South Dakota State at Minnesota | ",
 "Upcoming Jan 23 Women's · South Dakota State vs South Dakota | ",
 "Upcoming Feb 5 Women's · South Dakota State at USD Invite | ",
 "Upcoming Feb 24 Women's · South Dakota State at Summit League Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · South Dakota State at Augustana | W, 135-77",
 "Final Oct 17 Men's · South Dakota State at Omaha | L, 111-183",
 "Upcoming Oct 30 Men's · South Dakota State at Coyote Extravaganza | ",
 "Upcoming Nov 19 Men's · South Dakota State at USD Invite | ",
 "Upcoming Jan 15 Men's · South Dakota State vs St. Cloud State | ",
 "Upcoming Jan 22 Men's · South Dakota State vs St. Thomas | ",
 "Upcoming Jan 22 Men's · South Dakota State at Minnesota | ",
 "Upcoming Jan 23 Men's · South Dakota State vs South Dakota | ",
 "Upcoming Feb 5 Men's · South Dakota State at USD Invite | ",
 "Upcoming Feb 24 Men's · South Dakota State at Summit League Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 South Dakota State vs Sacramento State | W, 3-2",
 "Final Aug 29 South Dakota State at Pepperdine | L, 0-3",
 "Final Aug 30 South Dakota State vs Villanova | L, 2-3",
 "Final Sep 2 South Dakota State vs Nebraska | L, 0-3",
 "Final Sep 4 South Dakota State vs Western Illinois | W, 3-0",
 "Final Sep 4 South Dakota State vs Northern Arizona | W, 3-1",
 "Final Sep 5 South Dakota State vs Bradley | W, 3-0",
 "Final Sep 11 South Dakota State at Kansas | L, 0-3",
 "Final Sep 12 South Dakota State vs Tulsa | L, 2-3",
 "Final Sep 18 South Dakota State vs Washington | L, 0-3",
 "Final Sep 19 South Dakota State vs Minnesota | L, 1-3",
 "Final Sep 25 South Dakota State at South Dakota | W, 3-0",
 "Final Oct 1 South Dakota State at Omaha | L, 2-3",
 "Final Oct 3 South Dakota State at St. Thomas | W, 3-2",
 "Final Oct 8 South Dakota State vs Kansas City | W, 3-1",
 "Final Oct 10 South Dakota State vs Oral Roberts | W, 3-0",
 "Final Oct 15 South Dakota State at North Dakota State | W, 3-2",
 "Final Oct 17 South Dakota State at North Dakota | W, 3-1",
 "Final Oct 23 South Dakota State vs South Dakota | L, 2-3",
 "Upcoming Oct 29, 7:00 PM South Dakota State vs St. Thomas | ",
 "Upcoming Oct 31 South Dakota State vs Omaha | ",
 "Upcoming Nov 5 South Dakota State at Oral Roberts | ",
 "Upcoming Nov 7, 1:00 PM South Dakota State at Kansas City | ",
 "Upcoming Nov 12, 7:00 PM South Dakota State vs North Dakota | ",
 "Upcoming Nov 14, 1:00 PM South Dakota State vs North Dakota State | ",
 "Upcoming Nov 22 South Dakota State at Summit League Volleyball Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7 South Dakota State vs Buffalo | ",
 "Upcoming Nov 8 South Dakota State at Warren Williamson Daktronics Invitational | ",
 "Upcoming Nov 14 South Dakota State at Tiger Style Invite | ",
 "Upcoming Nov 25 South Dakota State vs Northern State | ",
 "Upcoming Dec 4 South Dakota State at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 18 South Dakota State vs North Carolina | ",
 "Upcoming Jan 2 South Dakota State at Soldier Salute | ",
 "Upcoming Jan 8 South Dakota State at NWCA National Duals | ",
 "Upcoming Jan 22 South Dakota State at Cal Poly | ",
 "Upcoming Jan 24 South Dakota State at CSU Bakersfield | ",
 "Upcoming Jan 29 South Dakota State at Northern Colorado | ",
 "Upcoming Jan 31 South Dakota State at Wyoming | ",
 "Upcoming Feb 5 South Dakota State vs Little Rock | ",
 "Upcoming Feb 7 South Dakota State vs Northern Illinois | ",
 "Upcoming Feb 12 South Dakota State vs Oregon State | ",
 "Upcoming Feb 14 South Dakota State vs Air Force | ",
 "Upcoming Feb 21 South Dakota State at North Dakota State | ",
 "Upcoming Mar 4 South Dakota State at Pac-12 Wrestling Championships | ",
 "Upcoming Mar 18 South Dakota State at NCAA Division I Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("South Dakota State module checks passed");
