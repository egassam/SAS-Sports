import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {robertMorrisSchool} from '../src/schools/robert-morris.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='robert-morris');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,robertMorrisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/robert-morris-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit rmucolonials.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['robert-morris'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',robertMorrisSchool.scheduleUrls],['roster',robertMorrisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('robert-morris|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'rmucolonials.com',`${key} must stay on rmucolonials.com`);
  }
}
const parity={"Basketball":{"schedule":["https://rmucolonials.com/sports/mens-basketball/schedule","https://rmucolonials.com/sports/womens-basketball/schedule"],"roster":["https://rmucolonials.com/sports/mens-basketball/roster","https://rmucolonials.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://rmucolonials.com/sports/womens-cross-country/schedule","https://rmucolonials.com/sports/mens-cross-country/schedule"],"roster":["https://rmucolonials.com/sports/womens-cross-country/roster","https://rmucolonials.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://rmucolonials.com/sports/football/schedule"],"roster":["https://rmucolonials.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://rmucolonials.com/sports/mens-golf/schedule"],"roster":["https://rmucolonials.com/sports/mens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://rmucolonials.com/sports/mens-ice-hockey/schedule","https://rmucolonials.com/sports/womens-ice-hockey/schedule"],"roster":["https://rmucolonials.com/sports/mens-ice-hockey/roster","https://rmucolonials.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://rmucolonials.com/sports/womens-lacrosse/schedule","https://rmucolonials.com/sports/mens-lacrosse/schedule"],"roster":["https://rmucolonials.com/sports/womens-lacrosse/roster","https://rmucolonials.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://rmucolonials.com/sports/rowing/schedule"],"roster":["https://rmucolonials.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://rmucolonials.com/sports/womens-soccer/schedule","https://rmucolonials.com/sports/mens-soccer/schedule"],"roster":["https://rmucolonials.com/sports/womens-soccer/roster","https://rmucolonials.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://rmucolonials.com/sports/softball/schedule"],"roster":["https://rmucolonials.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://rmucolonials.com/sports/womens-track-and-field/schedule"],"roster":["https://rmucolonials.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://rmucolonials.com/sports/womens-volleyball/schedule"],"roster":["https://rmucolonials.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'robert-morris|"+sport+"':"),`${sport} routes must live in the Robert Morris module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://rmucolonials.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.robertMorrisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=robert-morris)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · Robert Morris vs Canisius | ",
 "Upcoming Nov 2, 10:00 PM Men's · Robert Morris at Nevada | ",
 "Upcoming Nov 6, 8:00 PM Men's · Robert Morris at Illinois Chicago | ",
 "Upcoming Nov 11, 8:00 PM Men's · Robert Morris at Arkansas | ",
 "Upcoming Nov 15, 2:00 PM Men's · Robert Morris vs Capital | ",
 "Upcoming Nov 19 Men's · Robert Morris at Toledo | ",
 "Upcoming Nov 22, 2:30 PM Men's · Robert Morris vs New Mexico State | ",
 "Upcoming Nov 24, 6:30 PM Men's · Robert Morris vs Lamar | ",
 "Upcoming Nov 28 Men's · Robert Morris at Northern Iowa | ",
 "Upcoming Dec 2, 6:30 PM Men's · Robert Morris at IU Indy | ",
 "Upcoming Dec 5, 1:00 PM Men's · Robert Morris vs Youngstown State | ",
 "Upcoming Dec 9, 8:30 PM Men's · Robert Morris vs Duquesne | ",
 "Upcoming Dec 13, 2:00 PM Men's · Robert Morris vs Monmouth | ",
 "Upcoming Dec 20, 2:00 PM Men's · Robert Morris vs Vermont | ",
 "Upcoming Dec 23, 2:00 PM Men's · Robert Morris vs Ohio | ",
 "Upcoming Dec 30, 7:00 PM Men's · Robert Morris at Purdue Fort Wayne | ",
 "Upcoming Jan 3, 2:00 PM Men's · Robert Morris vs Northern Illinois | ",
 "Upcoming Jan 6, 7:00 PM Men's · Robert Morris vs Detroit Mercy | ",
 "Upcoming Jan 9, 2:00 PM Men's · Robert Morris vs Oakland | ",
 "Upcoming Jan 14, 7:00 PM Men's · Robert Morris at Wright State | ",
 "Upcoming Jan 17, 2:00 PM Men's · Robert Morris at Cleveland State | ",
 "Upcoming Jan 20, 7:00 PM Men's · Robert Morris vs Purdue Fort Wayne | ",
 "Upcoming Jan 23, 1:00 PM Men's · Robert Morris vs IU Indy | ",
 "Upcoming Jan 27, 8:00 PM Men's · Robert Morris at Milwaukee | ",
 "Upcoming Jan 30, 2:00 PM Men's · Robert Morris at Green Bay | ",
 "Upcoming Feb 4, 7:00 PM Men's · Robert Morris vs Cleveland State | ",
 "Upcoming Feb 7, 2:00 PM Men's · Robert Morris at Youngstown State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Robert Morris at Detroit Mercy | ",
 "Upcoming Feb 13, 3:00 PM Men's · Robert Morris at Oakland | ",
 "Upcoming Feb 18, 7:00 PM Men's · Robert Morris vs Northern Kentucky | ",
 "Upcoming Feb 21, 2:00 PM Men's · Robert Morris at Northern Illinois | ",
 "Upcoming Feb 24, 7:00 PM Men's · Robert Morris vs Milwaukee | ",
 "Upcoming Feb 27, 1:00 PM Men's · Robert Morris vs Green Bay | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · Robert Morris vs St. Bonaventure | ",
 "Upcoming Nov 5, 4:00 PM Women's · Robert Morris vs UIC | ",
 "Upcoming Nov 8, 2:00 PM Women's · Robert Morris vs Delaware State | ",
 "Upcoming Nov 11, 6:00 PM Women's · Robert Morris vs Eastern Michigan | ",
 "Upcoming Nov 16, 6:00 PM Women's · Robert Morris at Duquesne | ",
 "Upcoming Nov 20, 11:00 AM Women's · Robert Morris at Akron | ",
 "Upcoming Nov 25, 1:15 PM Women's · Robert Morris vs Stetson | ",
 "Upcoming Nov 26, 11:00 AM Women's · Robert Morris vs Clemson | ",
 "Upcoming Nov 29, 1:00 PM Women's · Robert Morris at Ball State | ",
 "Upcoming Dec 3, 6:00 PM Women's · Robert Morris vs Green Bay | ",
 "Upcoming Dec 5, 4:00 PM Women's · Robert Morris vs Milwaukee | ",
 "Upcoming Dec 11, 7:00 PM Women's · Robert Morris vs Shippensburg | ",
 "Upcoming Dec 15, 7:00 PM Women's · Robert Morris at WVU | ",
 "Upcoming Dec 20, 11:00 AM Women's · Robert Morris vs Mercyhurst | ",
 "Upcoming Dec 31, 1:00 PM Women's · Robert Morris at Detroit Mercy | ",
 "Upcoming Jan 2, 4:00 PM Women's · Robert Morris vs Northern Illinois | ",
 "Upcoming Jan 7, 6:00 PM Women's · Robert Morris vs IU Indy | ",
 "Upcoming Jan 10, 2:00 PM Women's · Robert Morris at Wright State | ",
 "Upcoming Jan 12, 6:00 PM Women's · Robert Morris at Northern Kentucky | ",
 "Upcoming Jan 16, 2:00 PM Women's · Robert Morris vs Purdue Fort Wayne | ",
 "Upcoming Jan 21, 6:00 PM Women's · Robert Morris vs Detroit Mercy | ",
 "Upcoming Jan 23, 4:00 PM Women's · Robert Morris vs Oakland | ",
 "Upcoming Jan 28, 7:30 PM Women's · Robert Morris at Green Bay | ",
 "Upcoming Jan 31, 1:00 PM Women's · Robert Morris at Milwaukee | ",
 "Upcoming Feb 3, 11:00 AM Women's · Robert Morris vs Cleveland State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Robert Morris at Youngstown State | ",
 "Upcoming Feb 10, 6:30 PM Women's · Robert Morris at IU Indy | ",
 "Upcoming Feb 13, 2:00 PM Women's · Robert Morris at Northern Illinois | ",
 "Upcoming Feb 17, 6:00 PM Women's · Robert Morris vs Northern Kentucky | ",
 "Upcoming Feb 20, 2:00 PM Women's · Robert Morris at Purdue Fort Wayne | ",
 "Upcoming Feb 25, 7:00 PM Women's · Robert Morris at Cleveland State | ",
 "Upcoming Feb 27, 4:00 PM Women's · Robert Morris vs Youngstown State | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Robert Morris at Panther Open | 2nd of 4 (38 Points)",
 "Final Sep 11 Women's · Robert Morris at RMU Colonial Invitational | 2nd of 11 (43 Points)",
 "Final Sep 26 Women's · Robert Morris at Youngstown State Invitational | 1st of 8 (24 Points)",
 "Final Oct 16 Women's · Robert Morris at John Handelman '52 Fall Classic | 3rd of 18 (139 Points)",
 "Upcoming Oct 31 Women's · Robert Morris at Horizon League Championships | ",
 "Upcoming Nov 14 Women's · Robert Morris at NCAA Mid-Atlantic Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Robert Morris at Panther Open | 3rd of 4 (73 Points)",
 "Final Sep 11 Men's · Robert Morris at RMU Colonial Invitational | 3rd of 10 (72 Points)",
 "Final Sep 26 Men's · Robert Morris at Youngstown State Invitational | 1st of 5 (28 Points)",
 "Final Oct 16 Men's · Robert Morris at John Handelman '52 Fall Classic | 12th of 20 (321 Points)",
 "Upcoming Oct 31 Men's · Robert Morris at Horizon League Championships | ",
 "Upcoming Nov 14 Men's · Robert Morris at NCAA Mid-Atlantic Regional Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Robert Morris at Wagner | W, 28-7",
 "Final Sep 5 Robert Morris vs West Virginia State | W, 29-9",
 "Final Sep 12 Robert Morris at Akron | L, 10-45",
 "Final Sep 26 Robert Morris at Buffalo | L, 28-31",
 "Final Oct 3 Robert Morris vs Norfolk State | W, 33-31",
 "Final Oct 10 Robert Morris at Morgan State | L, 27-28",
 "Final Oct 17 Robert Morris vs New Haven | L, 15-26",
 "Upcoming Oct 24, 2:00 PM Robert Morris vs Mercyhurst | ",
 "Upcoming Oct 31, 12:00 PM Robert Morris at Central Connecticut State | ",
 "Upcoming Nov 7, 12:00 PM Robert Morris at Duquesne | ",
 "Upcoming Nov 14, 12:00 PM Robert Morris vs Stonehill | ",
 "Upcoming Nov 21, 12:00 PM Robert Morris vs LIU | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Robert Morris at Virtues Intercollegiate | 8th of 12",
 "Final Sep 14 Robert Morris at RedHawk Intercollegiate | 11th of 14",
 "Final Sep 21 Robert Morris at River Run Collegiate | 12th of 13",
 "Final Oct 5 Robert Morris at Nemacolin Collegiate Invitational | 15th of 16",
 "Final Oct 11 Robert Morris at Bucknell Invitational | T5th of 18",
 "Upcoming Oct 24 Robert Morris at ODU/OBX Invitational | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Robert Morris at Wisconsin | L, 2-4",
 "Final Oct 3 Men's · Robert Morris at Wisconsin | L, 0-1",
 "Final Oct 15 Men's · Robert Morris at Miami University (OH) | L, 1-7",
 "Final Oct 17 Men's · Robert Morris vs Miami University (OH) | L, 2-3",
 "Final Oct 20 Men's · Robert Morris at Penn State | W, 5-2",
 "Today Oct 23, 7:00 PM Men's · Robert Morris at Bentley | ",
 "Upcoming Oct 24, 6:00 PM Men's · Robert Morris at Bentley | ",
 "Upcoming Oct 30, 7:00 PM Men's · Robert Morris vs Air Force | ",
 "Upcoming Oct 31, 7:00 PM Men's · Robert Morris vs Air Force | ",
 "Upcoming Nov 6, 7:30 PM Men's · Robert Morris at LIU | ",
 "Upcoming Nov 7, 7:30 PM Men's · Robert Morris at LIU | ",
 "Upcoming Nov 20, 7:00 PM Men's · Robert Morris at Sacred Heart | ",
 "Upcoming Nov 21, 5:00 PM Men's · Robert Morris at Sacred Heart | ",
 "Upcoming Nov 27, 7:00 PM Men's · Robert Morris vs Niagara | ",
 "Upcoming Nov 28, 7:00 PM Men's · Robert Morris vs Niagara | ",
 "Upcoming Dec 4, 7:00 PM Men's · Robert Morris at Canisius | ",
 "Upcoming Dec 5, 5:00 PM Men's · Robert Morris at Canisius | ",
 "Upcoming Jan 2, 7:00 PM Men's · Robert Morris vs St. Lawrence | ",
 "Upcoming Jan 3, 4:00 PM Men's · Robert Morris vs St. Lawrence | ",
 "Upcoming Jan 8, 7:00 PM Men's · Robert Morris at RIT | ",
 "Upcoming Jan 9, 2:00 PM Men's · Robert Morris at RIT | ",
 "Upcoming Jan 15, 7:00 PM Men's · Robert Morris vs Army | ",
 "Upcoming Jan 16, 7:00 PM Men's · Robert Morris vs Army | ",
 "Upcoming Jan 22, 7:00 PM Men's · Robert Morris vs Sacred Heart | ",
 "Upcoming Jan 23, 4:00 PM Men's · Robert Morris vs Sacred Heart | ",
 "Upcoming Jan 30, 4:00 PM Men's · Robert Morris at Holy Cross | ",
 "Upcoming Jan 31, 2:00 PM Men's · Robert Morris at Holy Cross | ",
 "Upcoming Feb 7, 2:00 PM Men's · Robert Morris vs Penn State | ",
 "Upcoming Feb 12, 7:00 PM Men's · Robert Morris vs Canisius | ",
 "Upcoming Feb 13, 7:00 PM Men's · Robert Morris vs Canisius | ",
 "Upcoming Feb 19, 7:00 PM Men's · Robert Morris vs RIT | ",
 "Upcoming Feb 20, 6:00 PM Men's · Robert Morris vs RIT | ",
 "Upcoming Feb 26, 9:00 PM Men's · Robert Morris at Air Force | ",
 "Upcoming Feb 27, 5:00 PM Men's · Robert Morris at Air Force | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · Robert Morris vs Post | W, 8-3",
 "Final Sep 26 Women's · Robert Morris vs Post | L, 1-2",
 "Final Oct 2 Women's · Robert Morris at Penn State | L, 3-5",
 "Final Oct 3 Women's · Robert Morris at Penn State | L, 1-4",
 "Final Oct 9 Women's · Robert Morris at Rensselaer Polytechnic Institute | W, 2-1",
 "Final Oct 10 Women's · Robert Morris at Rensselaer Polytechnic Institute | W, 4-2",
 "Final Oct 16 Women's · Robert Morris vs Syracuse | L, 1-2",
 "Final Oct 17 Women's · Robert Morris vs Syracuse | L, 2-6",
 "Today Oct 23, 4:00 PM Women's · Robert Morris vs Minnesota State University, Mankato | ",
 "Upcoming Oct 24 Women's · Robert Morris vs Yale / BU | ",
 "Upcoming Oct 29, 7:15 PM Women's · Robert Morris at Lindenwood | ",
 "Upcoming Oct 30, 12:00 PM Women's · Robert Morris at Lindenwood | ",
 "Upcoming Nov 6, 7:00 PM Women's · Robert Morris vs RIT | ",
 "Upcoming Nov 7, 3:00 PM Women's · Robert Morris vs RIT | ",
 "Upcoming Nov 12, 6:00 PM Women's · Robert Morris at Delaware | ",
 "Upcoming Nov 13, 2:00 PM Women's · Robert Morris at Delaware | ",
 "Upcoming Nov 20, 6:00 PM Women's · Robert Morris vs Mercyhurst | ",
 "Upcoming Nov 21, 2:00 PM Women's · Robert Morris at Mercyhurst | ",
 "Upcoming Dec 4, 7:00 PM Women's · Robert Morris at Assumption | ",
 "Upcoming Dec 5, 4:00 PM Women's · Robert Morris at Assumption | ",
 "Upcoming Jan 8, 3:00 PM Women's · Robert Morris at RIT | ",
 "Upcoming Jan 9, 2:00 PM Women's · Robert Morris at RIT | ",
 "Upcoming Jan 15, 3:00 PM Women's · Robert Morris vs Penn State | ",
 "Upcoming Jan 16, 3:00 PM Women's · Robert Morris vs Penn State | ",
 "Upcoming Jan 22, 3:00 PM Women's · Robert Morris vs Delaware | ",
 "Upcoming Jan 23, 12:00 PM Women's · Robert Morris vs Delaware | ",
 "Upcoming Jan 29, 6:00 PM Women's · Robert Morris at Mercyhurst | ",
 "Upcoming Jan 30, 2:00 PM Women's · Robert Morris vs Mercyhurst | ",
 "Upcoming Feb 5, 7:00 PM Women's · Robert Morris vs Lindenwood | ",
 "Upcoming Feb 6, 12:00 PM Women's · Robert Morris vs Lindenwood | ",
 "Upcoming Feb 12, 6:00 PM Women's · Robert Morris at Syracuse | ",
 "Upcoming Feb 13, 1:00 PM Women's · Robert Morris at Syracuse | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 31 Robert Morris at Head of the Occoquan | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Robert Morris at Navy | L, 0-4",
 "Final Aug 16 Women's · Robert Morris at Bowling Green | L, 0-2",
 "Final Aug 20 Women's · Robert Morris at Canisius | W, 3-1",
 "Final Aug 27 Women's · Robert Morris vs Mercyhurst | L, 0-1",
 "Final Aug 30 Women's · Robert Morris vs Eastern Michigan | T, 0-0",
 "Final Sep 6 Women's · Robert Morris vs Akron | W, 1-0",
 "Final Sep 10 Women's · Robert Morris vs UMBC | W, 1-0",
 "Final Sep 19 Women's · Robert Morris at Wright State | L, 0-1",
 "Final Sep 24 Women's · Robert Morris vs Purdue Fort Wayne | W, 2-0",
 "Final Sep 27 Women's · Robert Morris vs Cleveland State | W, 1-0",
 "Final Oct 1 Women's · Robert Morris at Detroit Mercy | T, 0-0",
 "Final Oct 4 Women's · Robert Morris at Oakland | T, 0-0",
 "Final Oct 10 Women's · Robert Morris vs Northern Kentucky | L, 0-2",
 "Final Oct 15 Women's · Robert Morris at Green Bay | L, 1-3",
 "Final Oct 18 Women's · Robert Morris at Milwaukee | L, 1-5",
 "Final Oct 22 Women's · Robert Morris vs IU Indy | L, 0-4",
 "Upcoming Oct 25, 1:00 PM Women's · Robert Morris vs Northern Illinois | ",
 "Upcoming Oct 31, 1:00 PM Women's · Robert Morris vs Youngstown State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Robert Morris vs Drexel | L, 1-2",
 "Final Aug 23 Men's · Robert Morris at Canisius | W, 1-0",
 "Final Aug 27 Men's · Robert Morris vs Waynesburg | W, 2-1",
 "Final Aug 30 Men's · Robert Morris vs Duquesne | T, 1-1",
 "Final Sep 4 Men's · Robert Morris at St. Bonaventure | W, 2-0",
 "Final Sep 9 Men's · Robert Morris at Detroit Mercy | W, 5-2",
 "Final Sep 14 Men's · Robert Morris vs Mercyhurst | L, 0-1",
 "Final Sep 19 Men's · Robert Morris vs Oakland | T, 1-1",
 "Final Sep 22 Men's · Robert Morris at Akron | L, 2-5",
 "Final Sep 26 Men's · Robert Morris at Green Bay | T, 0-0",
 "Final Oct 3 Men's · Robert Morris vs Milwaukee | L, 0-1",
 "Final Oct 7 Men's · Robert Morris at IU Indy | T, 1-1",
 "Final Oct 10 Men's · Robert Morris vs Purdue Fort Wayne | T, 0-0",
 "Final Oct 17 Men's · Robert Morris at Northern Kentucky | W, 3-1",
 "Upcoming Oct 24, 3:00 PM Men's · Robert Morris vs Wright State | ",
 "Upcoming Oct 30, 7:00 PM Men's · Robert Morris at Cleveland State | ",
 "Upcoming Nov 3, 2:00 PM Men's · Robert Morris vs Northern Illinois | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Robert Morris vs Stony Brook | L, 2-3",
 "Final Aug 28 Robert Morris at UCF | L, 1-3",
 "Final Aug 29 Robert Morris vs NC State | L, 0-3",
 "Final Sep 4 Robert Morris vs Elon | L, 0-3",
 "Final Sep 4 Robert Morris vs Eastern Michigan | L, 0-3",
 "Final Sep 5 Robert Morris at Duquesne | L, 0-3",
 "Final Sep 11 Robert Morris vs Arkansas | L, 0-3",
 "Final Sep 11 Robert Morris vs Howard | L, 2-3",
 "Final Sep 12 Robert Morris at Towson | L, 0-3",
 "Final Sep 18 Robert Morris vs Siena | W, 3-0",
 "Final Sep 19 Robert Morris vs UMES | W, 3-0",
 "Final Sep 22 Robert Morris vs Youngstown State | W, 3-2",
 "Final Sep 25 Robert Morris at IU Indy | L, 0-3",
 "Final Sep 26 Robert Morris at IU Indy | L, 2-3",
 "Final Oct 2 Robert Morris vs Purdue Fort Wayne | L, 2-3",
 "Final Oct 3 Robert Morris vs Purdue Fort Wayne | L, 2-3",
 "Final Oct 6 Robert Morris at Youngstown State | L, 0-3",
 "Final Oct 16 Robert Morris vs Oakland | L, 2-3",
 "Final Oct 17 Robert Morris vs Oakland | L, 1-3",
 "Today Oct 23, 6:00 PM Robert Morris at Northern Kentucky | ",
 "Upcoming Oct 24, 2:00 PM Robert Morris at Wright State | ",
 "Upcoming Oct 30, 7:00 PM Robert Morris at Northern Illinois | ",
 "Upcoming Oct 31, 3:00 PM Robert Morris at Northern Illinois | ",
 "Upcoming Nov 6, 5:00 PM Robert Morris vs Cleveland State | ",
 "Upcoming Nov 7, 5:00 PM Robert Morris at Cleveland State | ",
 "Upcoming Nov 13, 4:00 PM Robert Morris vs Milwaukee | ",
 "Upcoming Nov 14, 3:00 PM Robert Morris vs Green Bay | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Robert Morris module checks passed");
