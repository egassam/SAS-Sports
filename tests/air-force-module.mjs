import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {airForceSchool} from '../src/schools/air-force.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='air-force');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,airForceHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/air-force-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goairforcefalcons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['air-force'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',airForceSchool.scheduleUrls],['roster',airForceSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('air-force|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goairforcefalcons.com',`${key} must stay on goairforcefalcons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goairforcefalcons.com/sports/baseball/schedule"],"roster":["https://goairforcefalcons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goairforcefalcons.com/sports/mens-basketball/schedule","https://goairforcefalcons.com/sports/womens-basketball/schedule"],"roster":["https://goairforcefalcons.com/sports/mens-basketball/roster","https://goairforcefalcons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goairforcefalcons.com/sports/cross-country/schedule"],"roster":["https://goairforcefalcons.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://goairforcefalcons.com/sports/fencing/schedule"],"roster":["https://goairforcefalcons.com/sports/fencing/roster"],"combined":false},"Football":{"schedule":["https://goairforcefalcons.com/sports/football/schedule"],"roster":["https://goairforcefalcons.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goairforcefalcons.com/sports/mens-golf/schedule"],"roster":["https://goairforcefalcons.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://goairforcefalcons.com/sports/womens-gymnastics/schedule","https://goairforcefalcons.com/sports/mens-gymnastics/schedule"],"roster":["https://goairforcefalcons.com/sports/womens-gymnastics/roster","https://goairforcefalcons.com/sports/mens-gymnastics/roster"],"combined":true},"Hockey":{"schedule":["https://goairforcefalcons.com/sports/mens-ice-hockey/schedule"],"roster":["https://goairforcefalcons.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://goairforcefalcons.com/sports/mens-lacrosse/schedule"],"roster":["https://goairforcefalcons.com/sports/mens-lacrosse/roster"],"combined":false},"Rifle":{"schedule":["https://goairforcefalcons.com/sports/rifle/schedule"],"roster":["https://goairforcefalcons.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://goairforcefalcons.com/sports/womens-soccer/schedule","https://goairforcefalcons.com/sports/mens-soccer/schedule"],"roster":["https://goairforcefalcons.com/sports/womens-soccer/roster","https://goairforcefalcons.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://goairforcefalcons.com/sports/womens-swimming-and-diving/schedule","https://goairforcefalcons.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goairforcefalcons.com/sports/womens-swimming-and-diving/roster","https://goairforcefalcons.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goairforcefalcons.com/sports/womens-tennis/schedule","https://goairforcefalcons.com/sports/mens-tennis/schedule"],"roster":["https://goairforcefalcons.com/sports/womens-tennis/roster","https://goairforcefalcons.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goairforcefalcons.com/sports/track-and-field/schedule"],"roster":["https://goairforcefalcons.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goairforcefalcons.com/sports/womens-volleyball/schedule"],"roster":["https://goairforcefalcons.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://goairforcefalcons.com/sports/mens-water-polo/schedule"],"roster":["https://goairforcefalcons.com/sports/mens-water-polo/roster"],"combined":false},"Wrestling":{"schedule":["https://goairforcefalcons.com/sports/wrestling/schedule"],"roster":["https://goairforcefalcons.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'air-force|"+sport+"':"),`${sport} routes must live in the Air Force module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://goairforcefalcons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.airForceHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=air-force)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Men's · Air Force at Wright State | ",
 "Upcoming Nov 5, 6:30 PM Men's · Air Force vs Calumet (IN) | ",
 "Upcoming Nov 8, 1:00 PM Men's · Air Force vs Idaho State | ",
 "Upcoming Nov 11, 1:00 PM Men's · Air Force vs Loyola Chicago | ",
 "Upcoming Nov 14, 2:00 PM Men's · Air Force at Pacific | ",
 "Upcoming Nov 21, 3:00 PM Men's · Air Force at UTSA | ",
 "Upcoming Nov 24, 2:00 PM Men's · Air Force vs Army | ",
 "Upcoming Nov 28, 1:00 PM Men's · Air Force vs Brown | ",
 "Upcoming Dec 1, 7:00 PM Men's · Air Force vs Denver | ",
 "Upcoming Dec 6, 12:00 PM Men's · Air Force vs Navy | ",
 "Upcoming Dec 10, 6:00 PM Men's · Air Force at Austin Peay | ",
 "Upcoming Dec 18, 6:30 PM Men's · Air Force vs Alabama State | ",
 "Upcoming Dec 21, 1:00 PM Men's · Air Force vs Eastern Kentucky | ",
 "Upcoming Dec 29, 8:00 PM Men's · Air Force at Utah | ",
 "Upcoming Jan 5, 6:30 PM Men's · Air Force vs San Jose State | ",
 "Upcoming Jan 9, 12:00 PM Men's · Air Force vs UTEP | ",
 "Upcoming Jan 12 Men's · Air Force at Hawai'i | ",
 "Upcoming Jan 16, 2:30 PM Men's · Air Force vs New Mexico | ",
 "Upcoming Jan 19, 8:00 PM Men's · Air Force at Nevada | ",
 "Upcoming Jan 22, 9:00 PM Men's · Air Force vs Wyoming | ",
 "Upcoming Jan 27, 8:30 PM Men's · Air Force at GCU | ",
 "Upcoming Jan 30, 6:30 PM Men's · Air Force at New Mexico | ",
 "Upcoming Feb 2, 6:30 PM Men's · Air Force vs UNLV | ",
 "Upcoming Feb 6, 5:00 PM Men's · Air Force at UC Davis | ",
 "Upcoming Feb 10, 6:30 PM Men's · Air Force vs Hawai'i | ",
 "Upcoming Feb 13 Men's · Air Force at San Jose State | ",
 "Upcoming Feb 16, 8:00 PM Men's · Air Force vs GCU | ",
 "Upcoming Feb 20, 1:00 PM Men's · Air Force vs UC Davis | ",
 "Upcoming Feb 24, 8:30 PM Men's · Air Force at UNLV | ",
 "Upcoming Feb 27, 1:00 PM Men's · Air Force at Wyoming | ",
 "Upcoming Mar 2, 6:30 PM Men's · Air Force vs Nevada | ",
 "Upcoming Mar 6, 2:00 PM Men's · Air Force at UTEP | ",
 "Upcoming Mar 10 Men's · Air Force at Mountain West Championship Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Air Force vs Denver | ",
 "Upcoming Nov 7, 1:00 PM Women's · Air Force vs Saint Mary's | ",
 "Upcoming Nov 11, 4:00 PM Women's · Air Force vs San Francisco | ",
 "Upcoming Nov 14, 1:00 PM Women's · Air Force at Navy | ",
 "Upcoming Nov 18, 6:30 PM Women's · Air Force vs Southern Utah | ",
 "Upcoming Nov 22, 12:00 PM Women's · Air Force at Omaha | ",
 "Upcoming Nov 26, 6:30 PM Women's · Air Force vs Texas Tech | ",
 "Upcoming Nov 28 Women's · Air Force vs Santa Clara or Xavier | ",
 "Upcoming Dec 1, 4:00 PM Women's · Air Force vs Chadron State | ",
 "Upcoming Dec 5, 1:00 PM Women's · Air Force vs Army | ",
 "Upcoming Dec 9, 6:30 PM Women's · Air Force vs Kansas City | ",
 "Upcoming Dec 18, 6:00 PM Women's · Air Force at Pepperdine | ",
 "Upcoming Dec 20, 11:00 AM Women's · Air Force at Cal State Fullerton | ",
 "Upcoming Dec 30, 6:30 PM Women's · Air Force vs Wyoming | ",
 "Upcoming Jan 2, 1:00 PM Women's · Air Force vs Grand Canyon | ",
 "Upcoming Jan 6, 6:00 PM Women's · Air Force at Nevada | ",
 "Upcoming Jan 9, 4:00 PM Women's · Air Force vs Hawaii | ",
 "Upcoming Jan 13, 6:30 PM Women's · Air Force at UNLV | ",
 "Upcoming Jan 16, 2:00 PM Women's · Air Force at San Jose State | ",
 "Upcoming Jan 20, 6:30 PM Women's · Air Force vs Nevada | ",
 "Upcoming Jan 23, 2:00 PM Women's · Air Force at UTEP | ",
 "Upcoming Jan 30, 1:00 PM Women's · Air Force vs New Mexico | ",
 "Upcoming Feb 3 Women's · Air Force at UC Davis | ",
 "Upcoming Feb 6, 1:00 PM Women's · Air Force vs UNLV | ",
 "Upcoming Feb 10 Women's · Air Force at Hawaii | ",
 "Upcoming Feb 13, 1:00 PM Women's · Air Force vs San Jose State | ",
 "Upcoming Feb 17, 6:30 PM Women's · Air Force vs UTEP | ",
 "Upcoming Feb 20 Women's · Air Force at Wyoming | ",
 "Upcoming Feb 24, 11:00 AM Women's · Air Force vs UC Davis | ",
 "Upcoming Feb 27, 1:00 PM Women's · Air Force at New Mexico | ",
 "Upcoming Mar 2, 6:00 PM Women's · Air Force at Grand Canyon | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Air Force at AFXC Classic | Completed",
 "Final Sep 19 Air Force at John McNichols Invitational | Women's team: 14th / Men's team: 20th",
 "Final Sep 19 Air Force at Greeno / Dirksen Invitational | Cancelled",
 "Final Sep 19 Air Force at Roadrunner Invitational | Women's team: 7th / Men's team: 3rd",
 "Final Oct 9 Air Force at Nuttycombe Invitational | Women's team: 29th / Men's team: 25th",
 "Upcoming Oct 24, 9:15 AM Air Force at Colorado Springs XC Open | ",
 "Upcoming Oct 30, 9:00 AM Air Force at MW Championships | ",
 "Upcoming Nov 13 Air Force at NCAA Mountain Regional | ",
 "Upcoming Nov 21 Air Force at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Final Sep 12 Air Force at Regional Open Circuit | Completed",
 "Final Oct 9 Air Force at USA Fencing October NAC | Completed",
 "Upcoming Nov 7 Air Force at Western Invititational | ",
 "Upcoming Nov 20 Air Force at USA Fencing November NAC | ",
 "Upcoming Jan 8 Air Force at USA Fencing Junior Olympics (Jan. NAC) | ",
 "Upcoming Jan 30 Air Force at Schiller Duals (@Northwestern) | ",
 "Upcoming Feb 6 Air Force at Beguinet Classic (Women - @Duke Univ.) | ",
 "Upcoming Feb 7 Air Force at Miller Invitational (Men - @North Carolina) | ",
 "Upcoming Feb 12 Air Force at USA Fencing February NAC | ",
 "Upcoming Mar 13 Air Force at NCAA West Regional | ",
 "Upcoming Mar 14 Air Force at MPSF Fencing Championships | ",
 "Upcoming Mar 18 Air Force at NCAA Fencing Championships | ",
 "Upcoming Apr 16 Air Force at USA Fencing April NAC | ",
 "Upcoming Jul 2 Air Force at USA Fencing Summer Nationals | ",
 "Upcoming Aug 1 Air Force at World University Games | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Air Force vs Duquesne | W, 34-0",
 "Final Sep 12 Air Force vs North Dakota State | L, 32-38",
 "Final Sep 26 Air Force at Nevada | W, 36-33",
 "Final Oct 3 Air Force vs Navy | W, 14-9",
 "Final Oct 10 Air Force at Northern Illinois | W, 28-7",
 "Final Oct 17 Air Force vs UNLV | W, 41-31",
 "Upcoming Oct 23, 7:00 PM Air Force at Wyoming | ",
 "Upcoming Oct 31, 1:00 PM Air Force vs UConn | ",
 "Upcoming Nov 7, 5:30 PM Air Force at Army | ",
 "Upcoming Nov 14, 5:00 PM Air Force vs San Jose State | ",
 "Upcoming Nov 20, 6:00 PM Air Force vs UTEP | ",
 "Upcoming Nov 27, 2:30 PM Air Force at New Mexico | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Air Force at GCAA/Folds of Honor Collegiate | Completed",
 "Final Sep 19 Air Force at Gene Miranda Falcon Invitational | Completed",
 "Final Sep 29 Air Force at CU Mark Simpson Invitational | Completed",
 "Final Oct 13 Air Force at Commander-in-Chief's Cup | Completed",
 "Upcoming Oct 26, 8:00 AM Air Force at UT Arlington Invite | ",
 "Upcoming Nov 4, 8:00 AM Air Force at The Pearl at Kalauao | ",
 "Upcoming Feb 21, 8:00 AM Air Force at Military City Collegiate | ",
 "Upcoming Mar 5, 8:00 AM Air Force at Bandon Dunes Collegiate | ",
 "Upcoming Mar 21, 8:00 AM Air Force at UC San Diego Invitational | ",
 "Upcoming Apr 9, 8:00 AM Air Force at El Macero Classic | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Air Force vs Omaha (Exhibition) | L, 1-4",
 "Final Oct 9 Air Force at St. Thomas | W, 5-1",
 "Final Oct 10 Air Force at St. Thomas | L, 2-4",
 "Final Oct 15 Air Force vs Lindenwood | W, 5-2",
 "Final Oct 16 Air Force vs Lindenwood | L, 4-7",
 "Upcoming Oct 23, 7:05 PM Air Force at Colorado College | ",
 "Upcoming Oct 24, 7:05 PM Air Force vs Colorado College | ",
 "Upcoming Oct 30, 5:05 PM Air Force at Robert Morris | ",
 "Upcoming Oct 31, 5:05 PM Air Force at Robert Morris | ",
 "Upcoming Nov 6, 7:05 PM Air Force vs Army | ",
 "Upcoming Nov 7, 5:05 PM Air Force vs Army | ",
 "Upcoming Nov 12, 7:05 PM Air Force vs Bentley | ",
 "Upcoming Nov 13, 7:05 PM Air Force vs Bentley | ",
 "Upcoming Nov 21, 5:05 PM Air Force at Princeton | ",
 "Upcoming Nov 22, 2:05 PM Air Force at Princeton | ",
 "Upcoming Nov 27, 5:05 PM Air Force at Holy Cross | ",
 "Upcoming Nov 28, 3:05 PM Air Force at Holy Cross | ",
 "Upcoming Dec 4, 7:05 PM Air Force vs Niagara | ",
 "Upcoming Dec 5, 5:05 PM Air Force vs Niagara | ",
 "Upcoming Jan 2, 5:05 PM Air Force vs Lake Superior State | ",
 "Upcoming Jan 3, 5:05 PM Air Force vs Lake Superior State | ",
 "Upcoming Jan 8, 5:05 PM Air Force at Sacred Heart | ",
 "Upcoming Jan 9, 3:05 PM Air Force at Sacred Heart | ",
 "Upcoming Jan 15, 7:05 PM Air Force vs RIT | ",
 "Upcoming Jan 16, 5:35 PM Air Force vs RIT | ",
 "Upcoming Jan 22, 5:05 PM Air Force at Niagara | ",
 "Upcoming Jan 23, 4:05 PM Air Force at Niagara | ",
 "Upcoming Feb 5, 5:05 PM Air Force at Canisius | ",
 "Upcoming Feb 6, 3:05 PM Air Force at Canisius | ",
 "Upcoming Feb 12, 7:05 PM Air Force vs Holy Cross | ",
 "Upcoming Feb 13, 5:05 PM Air Force vs Holy Cross | ",
 "Upcoming Feb 19, 5:05 PM Air Force at Army | ",
 "Upcoming Feb 20, 2:05 PM Air Force at Army | ",
 "Upcoming Feb 26, 7:05 PM Air Force vs Robert Morris | ",
 "Upcoming Feb 27, 5:05 PM Air Force vs Robert Morris | ",
 "Upcoming Mar 2 Air Force vs AHA First Round | ",
 "Upcoming Mar 5 Air Force at AHA Quarterfinals | ",
 "Upcoming Mar 6 Air Force at AHA Quarterfinals | ",
 "Upcoming Mar 7 Air Force at AHA Quarterfinals | ",
 "Upcoming Mar 12 Air Force at AHA Semifinals | ",
 "Upcoming Mar 13 Air Force at AHA Semifinals | ",
 "Upcoming Mar 14 Air Force at AHA Semifinals | ",
 "Upcoming Mar 20 Air Force at AHA Championship | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 17 Air Force at Ole Miss | Completed",
 "Final Oct 18 Air Force at Ole Miss | Completed",
 "Upcoming Nov 7, 7:00 AM Air Force at Army | ",
 "Upcoming Nov 8, 6:30 AM Air Force at President's Trophy | ",
 "Upcoming Nov 21, 10:00 AM Air Force at Alaska Fairbanks/Kentucky | ",
 "Upcoming Nov 22, 10:00 AM Air Force at Kentucky | ",
 "Upcoming Dec 10, 8:00 AM Air Force at Winter Air Gun | ",
 "Upcoming Dec 11, 8:00 AM Air Force at Winter Air Gun | ",
 "Upcoming Dec 12, 8:00 AM Air Force at Winter Air Gun | ",
 "Upcoming Dec 13, 8:00 AM Air Force at Winter Air Gun | ",
 "Upcoming Jan 23, 8:00 AM Air Force at Nebraska/Alaska | ",
 "Upcoming Jan 24, 8:00 AM Air Force at Nebraska/Alaska/TCU | ",
 "Upcoming Feb 5, 7:00 AM Air Force at Patriot Rifle Conference Championships | ",
 "Upcoming Feb 6, 7:00 AM Air Force at Patriot Rifle Conference Championships | ",
 "Upcoming Feb 13, 9:00 AM Air Force at TCU | ",
 "Upcoming Feb 20, 8:30 AM Air Force at NCAA Qualifer-TCU | ",
 "Upcoming Mar 12, 7:00 AM Air Force at NCAA | ",
 "Upcoming Mar 13, 7:00 AM Air Force at NCAA | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Air Force vs Army | W, 4-1",
 "Final Aug 16 Women's · Air Force vs Creighton | W, 3-1",
 "Final Aug 20 Women's · Air Force at Navy | W, 4-0",
 "Final Aug 27 Women's · Air Force at Texas A&M | L, 1-2",
 "Final Aug 30 Women's · Air Force at North Texas | W, 1-0",
 "Final Sep 10 Women's · Air Force at Northern Colorado | L, 1-2",
 "Final Sep 17 Women's · Air Force at Denver | W, 2-1",
 "Final Sep 20 Women's · Air Force vs Eastern Washington | T, 2-2",
 "Final Sep 24 Women's · Air Force vs UC Davis | W, 3-1",
 "Final Sep 27 Women's · Air Force vs Hawaii | L, 0-2",
 "Final Oct 2 Women's · Air Force at UTEP | L, 1-2",
 "Final Oct 7 Women's · Air Force at UNLV | W, 5-3",
 "Final Oct 11 Women's · Air Force vs Grand Canyon | W, 1-0",
 "Final Oct 18 Women's · Air Force at Nevada | W, 5-1",
 "Upcoming Oct 24, 4:00 PM Women's · Air Force vs San Jose State | ",
 "Upcoming Oct 28, 6:00 PM Women's · Air Force vs Colorado College | ",
 "Upcoming Nov 1, 1:00 PM Women's · Air Force at Wyoming | ",
 "Upcoming Nov 7, 7:30 PM Women's · Air Force at New Mexico | ",
 "Upcoming Nov 11 Women's · Air Force at Mountain West Conference Championships | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Air Force at Army | T, 1-1",
 "Final Aug 23 Men's · Air Force at Marist | T, 0-0",
 "Final Aug 30 Men's · Air Force vs UC San Diego | L, 0-1",
 "Final Sep 4 Men's · Air Force at San Francisco | L, 0-2",
 "Final Sep 7 Men's · Air Force at Saint Mary's | T, 2-2",
 "Final Sep 11 Men's · Air Force vs UC Riverside | L, 1-2",
 "Final Sep 18 Men's · Air Force vs UTRGV | W, 3-1",
 "Final Sep 26 Men's · Air Force vs Utah Tech | T, 1-1",
 "Final Sep 30 Men's · Air Force at UC Davis | W, 2-0",
 "Final Oct 4 Men's · Air Force vs UNLV | L, 1-5",
 "Final Oct 10 Men's · Air Force at San Jose State | L, 1-3",
 "Final Oct 14 Men's · Air Force at Grand Canyon | L, 0-2",
 "Final Oct 18 Men's · Air Force vs UC Davis | W, 2-1",
 "Upcoming Oct 24, 7:00 PM Men's · Air Force vs San Jose State | ",
 "Upcoming Oct 28, 7:00 PM Men's · Air Force at Utah Tech | ",
 "Upcoming Nov 1, 7:00 PM Men's · Air Force at UNLV | ",
 "Upcoming Nov 6, 6:00 PM Men's · Air Force vs Grand Canyon | ",
 "Upcoming Nov 8 Men's · Air Force at Mountain West Conference Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 13 Women's · Air Force at Horsetooth Open Water | Completed",
 "Final Sep 19 Women's · Air Force vs Blue/Silver (Exhibition) | Completed",
 "Final Oct 2 Women's · Air Force at Front Range Invite | Completed",
 "Final Oct 10 Women's · Air Force at Wyoming | L, 163-137",
 "Final Oct 16 Women's · Air Force vs Denver | W, 170.50-129.50",
 "Final Oct 16 Women's · Air Force vs Washington State | W, 157.00-137.00",
 "Upcoming Oct 24, 11:00 AM Women's · Air Force vs New Mexico State | ",
 "Upcoming Nov 6, 4:00 PM Women's · Air Force at Grand Canyon | ",
 "Upcoming Nov 17, 6:00 PM Women's · Air Force at Phil Hansel Invitational | ",
 "Upcoming Jan 8, 5:00 PM Women's · Air Force vs Colorado Mesa | ",
 "Upcoming Jan 8, 5:00 PM Women's · Air Force vs Colorado School of Mines | ",
 "Upcoming Jan 8, 5:00 PM Women's · Air Force vs Seattle | ",
 "Upcoming Jan 15, 6:00 PM Women's · Air Force at UNLV | ",
 "Upcoming Jan 23, 11:00 AM Women's · Air Force at Colorado State | ",
 "Upcoming Jan 28, 9:00 AM Women's · Air Force at Air Force Diving Invitational | ",
 "Upcoming Jan 30, 12:00 PM Women's · Air Force at Colorado Sprint Championships | ",
 "Upcoming Feb 5, 3:00 PM Women's · Air Force at Denver First Chance Invitational | ",
 "Upcoming Feb 16, 5:00 PM Women's · Air Force at Mountain West Conference Championships | ",
 "Upcoming Mar 8, 9:00 AM Women's · Air Force at NCAA Diving Zone E Qualifers | ",
 "Upcoming Mar 11 Women's · Air Force at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17 Women's · Air Force at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 13 Men's · Air Force at Horsetooth Open Water | Completed",
 "Final Sep 19 Men's · Air Force vs Blue/Silver (Exhibition) | Completed",
 "Final Oct 2 Men's · Air Force at Front Range Invite | Completed",
 "Final Oct 10 Men's · Air Force at Wyoming | L, 178-122",
 "Final Oct 16 Men's · Air Force vs Denver | W, 163.00-131.00",
 "Upcoming Nov 6, 4:00 PM Men's · Air Force at Grand Canyon | ",
 "Upcoming Nov 18, 7:00 PM Men's · Air Force at SMU Invitational | ",
 "Upcoming Jan 8, 5:00 PM Men's · Air Force vs Colorado Mesa | ",
 "Upcoming Jan 8, 5:00 PM Men's · Air Force vs Colorado School of Mines | ",
 "Upcoming Jan 8, 5:00 PM Men's · Air Force vs Seattle | ",
 "Upcoming Jan 15, 6:00 PM Men's · Air Force at UNLV | ",
 "Upcoming Jan 28, 9:00 AM Men's · Air Force at Air Force Diving Invitational | ",
 "Upcoming Jan 30, 12:00 PM Men's · Air Force at Colorado Sprint Championships | ",
 "Upcoming Feb 5, 3:00 PM Men's · Air Force at Denver First Chance Invitational | ",
 "Upcoming Feb 16, 5:00 PM Men's · Air Force at Mountain West Conference Championships | ",
 "Upcoming Mar 8, 9:00 AM Men's · Air Force at NCAA Diving Zone E Qualifers | ",
 "Upcoming Mar 11 Men's · Air Force at CSCAA National Invitational Championships | ",
 "Upcoming Mar 24 Men's · Air Force at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Air Force at Commander-In-Chief's Challenge | Completed",
 "Final Sep 18 Women's · Air Force at Jon Messick Invitational | Completed",
 "Final Sep 25 Women's · Air Force at ITA Bedford Cup In The Mountains | Completed",
 "Final Oct 13 Women's · Air Force at ITA Mountain Regional | Completed",
 "Today Oct 20, 8:00 AM Women's · Air Force at Mountain West Fall Qualifier | ",
 "Upcoming Nov 6 Women's · Air Force at UNF Invite | ",
 "Upcoming Jan 23 Women's · Air Force at Montana State | ",
 "Upcoming Jan 30 Women's · Air Force at Oklahoma | ",
 "Upcoming Jan 30 Women's · Air Force vs UT Arlington | ",
 "Upcoming Feb 5 Women's · Air Force vs Marquette | ",
 "Upcoming Feb 5 Women's · Air Force vs New Mexico State | ",
 "Upcoming Feb 7 Women's · Air Force vs Idaho | ",
 "Upcoming Feb 11 Women's · Air Force at North Florida | ",
 "Upcoming Feb 13, 5:00 PM Women's · Air Force at Navy | ",
 "Upcoming Feb 15 Women's · Air Force at Charleston | ",
 "Upcoming Feb 19 Women's · Air Force vs South Dakota | ",
 "Upcoming Feb 21 Women's · Air Force vs Gonzaga | ",
 "Upcoming Feb 26 Women's · Air Force vs Northern Arizona | ",
 "Upcoming Mar 7 Women's · Air Force at Colorado State | ",
 "Upcoming Mar 12 Women's · Air Force at Bryant | ",
 "Upcoming Mar 20 Women's · Air Force at UMass | ",
 "Upcoming Mar 25 Women's · Air Force at New Mexico | ",
 "Upcoming Mar 27 Women's · Air Force at Grand Canyon | ",
 "Upcoming Apr 2 Women's · Air Force vs San Jose State | ",
 "Upcoming Apr 4 Women's · Air Force at Wyoming | ",
 "Upcoming Apr 9 Women's · Air Force at Hawaii | ",
 "Upcoming Apr 16 Women's · Air Force vs UNLV | ",
 "Upcoming Apr 18 Women's · Air Force vs Nevada | ",
 "Upcoming Apr 25 Women's · Air Force vs UC Davis | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Air Force at Commander-In-Chief's Challenge | Completed",
 "Final Sep 18 Men's · Air Force at ITA Bedford Cup In The Mountains | Completed",
 "Final Oct 2 Men's · Air Force at Utah Invitational | Completed",
 "Final Oct 6 Men's · Air Force at ITA Fall Mountain Regional | Completed",
 "Today Oct 21 Men's · Air Force at MW Fall Individual Championships | ",
 "Upcoming Oct 30 Men's · Air Force at Colorado Cup | ",
 "Upcoming Jan 16, 5:00 PM Men's · Air Force at Cal Poly | ",
 "Upcoming Jan 17, 5:00 PM Men's · Air Force vs Army | ",
 "Upcoming Jan 23, 10:00 AM Men's · Air Force vs Gonzaga | ",
 "Upcoming Jan 24, 11:00 AM Men's · Air Force at Denver | ",
 "Upcoming Jan 29, 5:00 PM Men's · Air Force vs Queens | ",
 "Upcoming Jan 30, 4:00 PM Men's · Air Force vs Northern Arizona | ",
 "Upcoming Jan 31, 10:00 AM Men's · Air Force vs UC San Diego | ",
 "Upcoming Feb 6, 10:00 AM Men's · Air Force at Montana State | ",
 "Upcoming Feb 7, 10:00 AM Men's · Air Force at Montana | ",
 "Upcoming Feb 11, 3:00 PM Men's · Air Force at Florida Southern | ",
 "Upcoming Feb 13, 5:00 PM Men's · Air Force vs Navy (USTA MatchDay) | ",
 "Upcoming Feb 19, 5:00 PM Men's · Air Force vs Florida Gulf Coast | ",
 "Upcoming Mar 5, 5:00 PM Men's · Air Force at BYU | ",
 "Upcoming Mar 7, 10:00 AM Men's · Air Force at Utah State | ",
 "Upcoming Mar 11, 5:00 PM Men's · Air Force vs Cleveland State | ",
 "Upcoming Mar 13, 10:00 AM Men's · Air Force vs New Mexico | ",
 "Upcoming Apr 2 Men's · Air Force at Hawaii Pacific | ",
 "Upcoming Apr 4, 4:00 PM Men's · Air Force vs Hawaii | ",
 "Upcoming Apr 11, 10:00 AM Men's · Air Force vs Grand Canyon | ",
 "Upcoming Apr 16 Men's · Air Force at Nevada | ",
 "Upcoming Apr 18 Men's · Air Force at UC Davis | ",
 "Upcoming Apr 23, 11:00 AM Men's · Air Force vs UNLV | ",
 "Upcoming Apr 28 Men's · Air Force at MW Men's Tennis Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 4, 10:00 AM Air Force at Air Force Holiday Open | ",
 "Upcoming Jan 12, 5:00 PM Air Force at Crosstown Showdown | ",
 "Upcoming Jan 15 Air Force at Colorado Invitational | ",
 "Upcoming Jan 21, 1:00 PM Air Force at Ralph Lindeman Classic & Multis | ",
 "Upcoming Jan 29 Air Force at DeLoss Dodds Invitational | ",
 "Upcoming Feb 5 Air Force at Colorado Classic | ",
 "Upcoming Feb 9, 5:00 PM Air Force at Colorado Springs City Championships | ",
 "Upcoming Feb 11, 10:00 AM Air Force at Space Force Invitational | ",
 "Upcoming Feb 12 Air Force at Husky Classic | ",
 "Upcoming Feb 19, 10:00 AM Air Force at Air Force Last Chance Meet | ",
 "Upcoming Feb 25 Air Force at Mountain West Championships | ",
 "Upcoming Mar 12 Air Force at NCAA Championships | ",
 "Upcoming Mar 19 Air Force at Dr Dan Caprioglio Invitational | ",
 "Upcoming Mar 26 Air Force at Bob Larsen & Jim Bush Legends Meet | ",
 "Upcoming Apr 2 Air Force at Jerry Quiller Classic | ",
 "Upcoming Apr 2 Air Force at Mike Fanelli Track Classic | ",
 "Upcoming Apr 2 Air Force at Stanford Invitational | ",
 "Upcoming Apr 8 Air Force at Bryan Clay Multis | ",
 "Upcoming Apr 9 Air Force at Kit Mayer Classic | ",
 "Upcoming Apr 15 Air Force at Bryan Clay Invitational | ",
 "Upcoming Apr 15 Air Force at Pacific Coast Intercollegiate | ",
 "Upcoming Apr 16 Air Force at Beach Invitational | ",
 "Upcoming Apr 23 Air Force at Don Kirby Tailwind Invitational | ",
 "Upcoming Apr 30 Air Force at Payton Jordan Invitational | ",
 "Upcoming May 1 Air Force at Desert Heat Invitational | ",
 "Upcoming May 1 Air Force at Doug Max Invitational | ",
 "Upcoming May 7 Air Force at Air Force Twilight Open | ",
 "Upcoming May 13 Air Force at Mountain West Championships | ",
 "Upcoming May 26 Air Force at NCAA West Preliminary | ",
 "Upcoming Jun 9 Air Force at NCAA Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Air Force at Boston College | L, 0-3",
 "Final Aug 29 Air Force vs Quinnipiac | W, 3-0",
 "Final Sep 3 Air Force vs Northern Iowa | L, 1-3",
 "Final Sep 4 Air Force at South Dakota | L, 1-3",
 "Final Sep 5 Air Force vs Utah Valley | W, 3-0",
 "Final Sep 10 Air Force vs Little Rock | W, 3-0",
 "Final Sep 11 Air Force vs Tennessee Tech | W, 3-1",
 "Final Sep 12 Air Force vs Idaho State | L, 0-3",
 "Final Sep 16 Air Force at Denver | L, 0-3",
 "Final Sep 17 Air Force vs Utah | L, 0-3",
 "Final Sep 18 Air Force at Northern Colorado | L, 1-3",
 "Final Sep 24 Air Force vs San Jose State | W, 3-0",
 "Final Sep 26 Air Force vs San Jose State | W, 3-2",
 "Final Oct 1 Air Force at UC Davis | L, 0-3",
 "Final Oct 3 Air Force at UC Davis | L, 1-3",
 "Final Oct 8 Air Force at Wyoming | L, 1-3",
 "Final Oct 10 Air Force vs Wyoming | L, 1-3",
 "Final Oct 15 Air Force vs Grand Canyon | L, 1-3",
 "Final Oct 16 Air Force vs Grand Canyon | W, 3-2",
 "Today Oct 22, 6:00 PM Air Force at UTEP | ",
 "Upcoming Oct 24, 1:00 PM Air Force at UTEP | ",
 "Upcoming Oct 29, 7:00 PM Air Force at UNLV | ",
 "Upcoming Oct 31, 1:00 PM Air Force at UNLV | ",
 "Upcoming Nov 5, 6:00 PM Air Force vs New Mexico | ",
 "Upcoming Nov 7, 1:00 PM Air Force vs New Mexico | ",
 "Upcoming Nov 12, 10:00 PM Air Force at Hawaii | ",
 "Upcoming Nov 13, 10:00 PM Air Force at Hawaii | ",
 "Upcoming Nov 18, 6:00 PM Air Force vs Nevada | ",
 "Upcoming Nov 19, 6:00 PM Air Force vs Nevada | ",
 "Upcoming Nov 24 Air Force at First Round Match | ",
 "Upcoming Nov 25 Air Force at Championship Match | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Air Force vs MIT | W, 17-14",
 "Final Aug 29 Air Force at Harvard | L, 17-18",
 "Final Aug 30 Air Force vs LIU | W, 18-16",
 "Final Aug 30 Air Force vs Connecticut College | W, 24-7",
 "Final Aug 30 Air Force at Brown | L, 12-15",
 "Final Sep 2 Air Force vs Iona | W, 19-16",
 "Final Sep 5 Air Force vs Princeton | L, 9-20",
 "Final Sep 5 Air Force vs Johns Hopkins | W, 15-14",
 "Final Sep 6 Air Force vs Mount St. Mary's (Md.) | W, 17-13",
 "Final Sep 6 Air Force vs George Washington | W, 19-18",
 "Final Sep 11 Air Force vs Redlands | W, 19-10",
 "Final Sep 11 Air Force vs Chapman | W, 18-5",
 "Final Sep 12 Air Force at Cal State Fullerton | W, 17-11",
 "Final Sep 12 Air Force vs CUI | W, 19-17",
 "Final Sep 24 Air Force vs Navy | L, 13-14",
 "Final Sep 26 Air Force vs Biola (Calif.) | W, 18-13",
 "Final Sep 26 Air Force vs UC Santa Barbara | L, 14-21",
 "Final Sep 27 Air Force vs Wagner | W, 16-15",
 "Final Sep 27 Air Force vs OUAZ | W, 21-14",
 "Final Oct 2 Air Force vs Cal Lutheran | W, 13-6",
 "Final Oct 2 Air Force vs Cal Baptist | L, 8-15",
 "Final Oct 3 Air Force at Pomona-Pitzer | L, 10-13",
 "Final Oct 3 Air Force at Claremont-Mudd-Scripps | L, 13-15",
 "Final Oct 10 Air Force vs Pepperdine | L, 15-16",
 "Final Oct 10 Air Force vs Austin College | W, 14-8",
 "Final Oct 16 Air Force at Saint Mary's | L, 10-16",
 "Final Oct 18 Air Force at UC Davis | L, 11-16",
 "Upcoming Oct 24, 1:00 PM Air Force at USC | ",
 "Upcoming Oct 25, 1:00 PM Air Force at UC Irvine | ",
 "Upcoming Oct 30, 6:30 PM Air Force vs LMU | ",
 "Upcoming Nov 1, 12:00 PM Air Force vs Pacific | ",
 "Upcoming Nov 6, 1:00 PM Air Force at San Jose State | ",
 "Upcoming Nov 8, 1:00 PM Air Force at Santa Clara | ",
 "Upcoming Nov 20 Air Force at WCC Championships First Round | ",
 "Upcoming Nov 21 Air Force at WCC Championships Semifinals | ",
 "Upcoming Nov 22 Air Force at WCC Championships Final | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Oct 24, 9:00 AM Air Force vs Air Force Black & Blue Intersquad | ",
 "Upcoming Nov 1, 7:00 AM Air Force at Clarion Open | ",
 "Upcoming Nov 7, 10:30 AM Air Force at The Citadel | ",
 "Upcoming Nov 7, 12:30 PM Air Force at Purdue | ",
 "Upcoming Nov 12, 7:00 PM Air Force vs New Mexico Highlands | ",
 "Upcoming Nov 15, 11:00 AM Air Force at Army West Point | ",
 "Upcoming Nov 20, 6:00 PM Air Force at Little Rock | ",
 "Upcoming Dec 4, 8:00 AM Air Force at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 18, 7:00 PM Air Force vs Cal Poly | ",
 "Upcoming Jan 8, 7:00 AM Air Force at F&M David Lehman Open | ",
 "Upcoming Jan 15, 7:00 PM Air Force vs Oregon State | ",
 "Upcoming Jan 24, 1:00 PM Air Force vs Wyoming | ",
 "Upcoming Jan 30, 7:00 PM Air Force vs North Dakota State | ",
 "Upcoming Feb 5 Air Force at Bellarmine | ",
 "Upcoming Feb 5 Air Force at Campbell | ",
 "Upcoming Feb 5 Air Force at Presbyterian College | ",
 "Upcoming Feb 7, 7:00 PM Air Force vs CSU Bakersfield | ",
 "Upcoming Feb 12, 6:00 PM Air Force at Northern Illinois | ",
 "Upcoming Feb 14, 12:00 PM Air Force at South Dakota State | ",
 "Upcoming Feb 21, 2:00 PM Air Force at Northern Colorado | ",
 "Upcoming Mar 4, 9:00 AM Air Force at Pac-12 Championships | ",
 "Upcoming Mar 18, 9:00 AM Air Force at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Hockey plays in Atlantic Hockey America: a regular-season game against a
// member is a league game (Army, Nov 6); St. Thomas, Lindenwood and Colorado
// College are not members, the Omaha exhibition is none. Mutation: without
// the rule no game carries the league.
{
  const hockey=parse('Hockey','mens-ice-hockey'),game=(day,name)=>hockey.find(e=>e.display_time.startsWith(day)&&e.opponent.includes(name));
  assert.equal(game('Nov 6','Army').conference_game,true);
  assert.equal(game('Nov 6','Army').conference_name,'Atlantic Hockey America');
  assert.equal(game('Nov 12','Bentley').conference_game,true);
  for(const [day,name] of [['Oct 9','St. Thomas'],['Oct 15','Lindenwood'],['Oct 23','Colorado College'],['Oct 2','Omaha']])assert.equal(game(day,name).conference_game,false,`${day} ${name}`);
}

// Two days of rifle against Ole Miss (Oct 17 and 18) each take their own
// day's story: the story from the meet's last day on whose headline names it,
// the earliest first. Mutation: the newest first gives Oct 17 the Oct 18
// story.
{
  const rifle=parse('Rifle','rifle').filter(e=>e.status==='Final');
  recapFixtures.set('https://goairforcefalcons.com/sports/rifle/archives',fixture('rifle-archives.html.gz'));
  for(const [day,slug] of [['17','rifle-fifth-ranked-ole-miss-defeats-air-force-in-rifle-season-opener'],['18','rifle-no-5-ole-miss-wins-dual-match']]){
    const url=`https://goairforcefalcons.com/news/2026/10/${day}/${slug}`;
    recapFixtures.set(url,fixture(`story-2026-10-${day}-${slug.slice(0,40)}.html.gz`));
  }
  for(const event of rifle)await worker.airForceHandlers.attachArchiveStory(event);
  assert.deepEqual(rifle.map(e=>e.recap_url.replace(/^.*\/news\//,'')),['2026/10/17/rifle-fifth-ranked-ole-miss-defeats-air-force-in-rifle-season-opener','2026/10/18/rifle-no-5-ole-miss-wins-dual-match']);
  requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Air Force module checks passed");
