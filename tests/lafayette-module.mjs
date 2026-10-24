import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lafayetteSchool} from '../src/schools/lafayette.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lafayette');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lafayetteHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lafayette-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goleopards.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lafayette'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',lafayetteSchool.scheduleUrls],['roster',lafayetteSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lafayette|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goleopards.com',`${key} must stay on goleopards.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goleopards.com/sports/baseball/schedule"],"roster":["https://goleopards.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goleopards.com/sports/mens-basketball/schedule","https://goleopards.com/sports/womens-basketball/schedule"],"roster":["https://goleopards.com/sports/mens-basketball/roster","https://goleopards.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goleopards.com/sports/cross-country/schedule"],"roster":["https://goleopards.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://goleopards.com/sports/fencing/schedule"],"roster":["https://goleopards.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://goleopards.com/sports/field-hockey/schedule"],"roster":["https://goleopards.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goleopards.com/sports/football/schedule"],"roster":["https://goleopards.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goleopards.com/sports/mens-golf/schedule"],"roster":["https://goleopards.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://goleopards.com/sports/womens-lacrosse/schedule","https://goleopards.com/sports/mens-lacrosse/schedule"],"roster":["https://goleopards.com/sports/womens-lacrosse/roster","https://goleopards.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://goleopards.com/sports/womens-soccer/schedule","https://goleopards.com/sports/mens-soccer/schedule"],"roster":["https://goleopards.com/sports/womens-soccer/roster","https://goleopards.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goleopards.com/sports/softball/schedule"],"roster":["https://goleopards.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goleopards.com/sports/swimming-and-diving/schedule"],"roster":["https://goleopards.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://goleopards.com/sports/womens-tennis/schedule","https://goleopards.com/sports/mens-tennis/schedule"],"roster":["https://goleopards.com/sports/womens-tennis/roster","https://goleopards.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goleopards.com/sports/track-and-field/schedule"],"roster":["https://goleopards.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goleopards.com/sports/womens-volleyball/schedule"],"roster":["https://goleopards.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lafayette|"+sport+"':"),`${sport} routes must live in the Lafayette module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goleopards.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lafayetteHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lafayette)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Lafayette at Butler | ",
 "Upcoming Nov 5, 6:00 PM Men's · Lafayette vs King's College | ",
 "Upcoming Nov 7, 4:00 PM Men's · Lafayette at St. Joseph's | ",
 "Upcoming Nov 10, 7:00 PM Men's · Lafayette vs Penn State Lehigh Valley | ",
 "Upcoming Nov 14, 4:00 PM Men's · Lafayette at St. Bonaventure | ",
 "Upcoming Nov 18, 7:00 PM Men's · Lafayette vs Binghamton | ",
 "Upcoming Nov 21, 2:00 PM Men's · Lafayette at Syracuse | ",
 "Upcoming Nov 27, 4:30 PM Men's · Lafayette vs Niagara | ",
 "Upcoming Nov 28, 4:30 PM Men's · Lafayette vs Maine | ",
 "Upcoming Nov 29, 2:30 PM Men's · Lafayette vs Le Moyne | ",
 "Upcoming Dec 4, 7:00 PM Men's · Lafayette at FDU | ",
 "Upcoming Dec 7, 7:00 PM Men's · Lafayette vs Penn | ",
 "Upcoming Dec 19, 2:30 PM Men's · Lafayette at Penn State | ",
 "Upcoming Dec 21, 7:00 PM Men's · Lafayette at Richmond | ",
 "Upcoming Dec 30, 4:00 PM Men's · Lafayette at Navy | ",
 "Upcoming Jan 2, 1:00 PM Men's · Lafayette vs Colgate | ",
 "Upcoming Jan 6, 7:00 PM Men's · Lafayette vs Loyola | ",
 "Upcoming Jan 9, 4:00 PM Men's · Lafayette at American | ",
 "Upcoming Jan 13, 7:00 PM Men's · Lafayette vs Boston U. | ",
 "Upcoming Jan 17, 2:00 PM Men's · Lafayette at Army | ",
 "Upcoming Jan 20, 7:00 PM Men's · Lafayette at Loyola | ",
 "Upcoming Jan 23, 1:00 PM Men's · Lafayette vs American | ",
 "Upcoming Jan 27 Men's · Lafayette at Boston U. | ",
 "Upcoming Jan 30, 7:30 PM Men's · Lafayette at Lehigh | ",
 "Upcoming Feb 1, 6:30 PM Men's · Lafayette vs Holy Cross | ",
 "Upcoming Feb 6, 2:00 PM Men's · Lafayette at Colgate | ",
 "Upcoming Feb 10, 7:00 PM Men's · Lafayette vs Army | ",
 "Upcoming Feb 13, 2:00 PM Men's · Lafayette at Bucknell | ",
 "Upcoming Feb 17, 7:00 PM Men's · Lafayette vs Navy | ",
 "Upcoming Feb 20, 4:00 PM Men's · Lafayette vs Lehigh | ",
 "Upcoming Feb 24, 7:00 PM Men's · Lafayette at Holy Cross | ",
 "Upcoming Feb 27, 1:00 PM Men's · Lafayette vs Bucknell | ",
 "Upcoming Mar 2 Men's · Lafayette at Patriot League Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 2:00 PM Women's · Lafayette at St. John's | ",
 "Upcoming Nov 5, 8:30 PM Women's · Lafayette vs Wagner | ",
 "Upcoming Nov 11, 6:00 PM Women's · Lafayette vs New Jersey Institute of Technology | ",
 "Upcoming Nov 15, 2:00 PM Women's · Lafayette at Marist | ",
 "Upcoming Nov 18, 6:00 PM Women's · Lafayette at Saint Peter's | ",
 "Upcoming Nov 22, 12:00 PM Women's · Lafayette at Wisconsin | ",
 "Upcoming Nov 29, 1:00 PM Women's · Lafayette at Le Moyne | ",
 "Upcoming Dec 2, 6:00 PM Women's · Lafayette vs FDU | ",
 "Upcoming Dec 6, 1:00 PM Women's · Lafayette vs Rider | ",
 "Upcoming Dec 17, 6:00 PM Women's · Lafayette vs Penn State Brandywine | ",
 "Upcoming Dec 20, 5:00 PM Women's · Lafayette at Rutgers | ",
 "Upcoming Dec 30, 1:00 PM Women's · Lafayette vs Navy | ",
 "Upcoming Jan 2 Women's · Lafayette at Colgate | ",
 "Upcoming Jan 6 Women's · Lafayette at Loyola Maryland | ",
 "Upcoming Jan 9, 1:00 PM Women's · Lafayette vs American | ",
 "Upcoming Jan 13 Women's · Lafayette at Boston U. | ",
 "Upcoming Jan 16, 1:00 PM Women's · Lafayette vs Army | ",
 "Upcoming Jan 20, 11:00 AM Women's · Lafayette vs Loyola Maryland | ",
 "Upcoming Jan 23 Women's · Lafayette at American | ",
 "Upcoming Jan 27, 6:00 PM Women's · Lafayette vs Boston U. | ",
 "Upcoming Jan 30 Women's · Lafayette at Lehigh | ",
 "Upcoming Feb 3 Women's · Lafayette at Holy Cross | ",
 "Upcoming Feb 6, 1:00 PM Women's · Lafayette vs Colgate | ",
 "Upcoming Feb 10 Women's · Lafayette at Army | ",
 "Upcoming Feb 13, 1:00 PM Women's · Lafayette vs Bucknell | ",
 "Upcoming Feb 17 Women's · Lafayette at Navy | ",
 "Upcoming Feb 20, 1:00 PM Women's · Lafayette vs Lehigh | ",
 "Upcoming Feb 23, 6:00 PM Women's · Lafayette vs Holy Cross | ",
 "Upcoming Feb 26 Women's · Lafayette at Bucknell | ",
 "Upcoming Mar 1 Women's · Lafayette at Patriot League Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Lafayette at Bucknell Preview | Completed",
 "Final Sep 11 Lafayette at Lafayette Invite | Completed",
 "Final Oct 17 Lafayette at Aubrey Shenk Invitational | Completed",
 "Upcoming Oct 31, 12:00 PM Lafayette at Patriot League Championships | ",
 "Upcoming Nov 13, 12:00 PM Lafayette at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21 Lafayette at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Lafayette vs Kent State | W, 2-1",
 "Final Aug 30 Lafayette at Northwestern | L, 0-1",
 "Final Sep 4 Lafayette vs Temple | W, 4-3",
 "Final Sep 7 Lafayette vs Cornell | W, 2-1",
 "Final Sep 11 Lafayette vs Rider | W, 3-0",
 "Final Sep 13 Lafayette at Drexel | W, 4-1",
 "Final Sep 18 Lafayette at Colgate | W, 2-0",
 "Final Sep 20 Lafayette vs VCU | W, 2-0",
 "Final Sep 25 Lafayette at Holy Cross | W, 1-0",
 "Final Oct 2 Lafayette vs American | W, 1-0",
 "Final Oct 4 Lafayette at Penn State | L, 2-3",
 "Final Oct 9 Lafayette at Bucknell | W, 2-1",
 "Final Oct 11 Lafayette vs Delaware | W, 1-0",
 "Final Oct 16 Lafayette vs Lehigh | W, 11-0",
 "Final Oct 18 Lafayette vs William & Mary | W, 6-0",
 "Upcoming Oct 25, 12:00 PM Lafayette vs Brown | ",
 "Upcoming Oct 30, 6:00 PM Lafayette vs Boston U. | ",
 "Upcoming Nov 5 Lafayette at Patriot League Tournament | ",
 "Upcoming Nov 7 Lafayette at Patriot League Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Lafayette at Connecticut | L, 7-56",
 "Final Sep 12 Lafayette vs Marist | W, 13-9",
 "Final Sep 19 Lafayette at Columbia | L, 34-40",
 "Final Sep 26 Lafayette vs Holy Cross | L, 30-38",
 "Final Oct 3 Lafayette vs Richmond | L, 31-40",
 "Final Oct 17 Lafayette at Bucknell | W, 20-7",
 "Today Oct 24, 1:00 PM Lafayette at Fordham | ",
 "Upcoming Oct 31, 12:30 PM Lafayette vs Villanova | ",
 "Upcoming Nov 7, 1:00 PM Lafayette at William & Mary | ",
 "Upcoming Nov 14, 1:00 PM Lafayette at Colgate | ",
 "Upcoming Nov 21, 12:30 PM Lafayette vs Lehigh | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Lafayette at Doc Gimmler Invitational | 8th of 14",
 "Final Sep 19 Lafayette at Navy Invitational | 11th of 15",
 "Final Sep 27 Lafayette at Connecticut Cup | 10th of 14",
 "Final Oct 4 Lafayette at Matthews Auto Collegiate Invitational | 7th of 13",
 "Final Oct 12 Lafayette at The Metropolis Intercollegiate | 9th of 12",
 "Today Oct 23 Lafayette at Fripp Island Invitational | ",
 "Upcoming Feb 12 Lafayette at Palmas del Mar Collegiate | ",
 "Upcoming Mar 28 Lafayette at ECU Intercollegiate | ",
 "Upcoming Apr 11 Lafayette at Abarta Coca-Cola Collegiate Invitational | ",
 "Upcoming Apr 17 Lafayette at Roar-EE Invitational | ",
 "Upcoming Apr 22 Lafayette at President's Cup | ",
 "Upcoming Apr 30 Lafayette at Patriot League Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Lafayette at Central Connecticut State | L, 0-2",
 "Final Aug 19 Women's · Lafayette at Iona | T, 0-0",
 "Final Aug 23 Women's · Lafayette vs St. Joseph's | T, 1-1",
 "Final Aug 27 Women's · Lafayette at Cornell | L, 0-2",
 "Final Aug 30 Women's · Lafayette vs Wagner | W, 2-0",
 "Final Sep 3 Women's · Lafayette vs La Salle | T, 2-2",
 "Final Sep 6 Women's · Lafayette at Drexel | L, 1-2",
 "Final Sep 10 Women's · Lafayette vs Buffalo | T, 0-0",
 "Final Sep 19 Women's · Lafayette at Colgate | W, 2-1",
 "Final Sep 26 Women's · Lafayette at American | W, 1-0",
 "Final Sep 30 Women's · Lafayette vs Bucknell | L, 0-1",
 "Final Oct 4 Women's · Lafayette vs Boston | W, 2-1",
 "Final Oct 10 Women's · Lafayette at Holy Cross | L, 1-3",
 "Final Oct 17 Women's · Lafayette at Army | L, 0-4",
 "Today Oct 24, 3:00 PM Women's · Lafayette vs Loyola | ",
 "Upcoming Oct 30, 7:00 PM Women's · Lafayette vs Navy | ",
 "Upcoming Nov 4, 6:00 PM Women's · Lafayette at Lehigh | ",
 "Upcoming Nov 8 Women's · Lafayette at Patriot League Tournament | ",
 "Upcoming Nov 11 Women's · Lafayette at Patriot League Tournament | ",
 "Upcoming Nov 15 Women's · Lafayette at Patriot League Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Lafayette at Duquesne | T, 0-0",
 "Final Aug 26 Men's · Lafayette vs Binghamton | W, 3-2",
 "Final Aug 29 Men's · Lafayette vs Bryant | L, 0-3",
 "Final Sep 1 Men's · Lafayette vs La Salle | L, 0-1",
 "Final Sep 5 Men's · Lafayette vs Fordham | L, 0-2",
 "Final Sep 12 Men's · Lafayette at Bucknell | L, 0-1",
 "Final Sep 15 Men's · Lafayette at Le Moyne | L, 0-3",
 "Final Sep 19 Men's · Lafayette vs Holy Cross | T, 1-1",
 "Final Sep 26 Men's · Lafayette at Colgate | T, 1-1",
 "Final Oct 3 Men's · Lafayette at Army | W, 1-0",
 "Final Oct 6 Men's · Lafayette vs Temple | L, 0-1",
 "Final Oct 10 Men's · Lafayette vs Loyola | W, 1-0",
 "Final Oct 17 Men's · Lafayette vs Navy | L, 1-4",
 "Final Oct 20 Men's · Lafayette vs Drexel | L, 1-3",
 "Today Oct 24, 1:00 PM Men's · Lafayette at American | ",
 "Upcoming Oct 30, 7:00 PM Men's · Lafayette at Boston | ",
 "Upcoming Nov 3, 6:00 PM Men's · Lafayette vs Lehigh | ",
 "Upcoming Nov 7 Men's · Lafayette vs Patriot League First Round | ",
 "Upcoming Nov 10 Men's · Lafayette at Patriot League Semifinal | ",
 "Upcoming Nov 14 Men's · Lafayette vs Patriot League Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 17 Lafayette vs Loyola, Md. | Completed",
 "Today Oct 24, 12:00 PM Lafayette at Colgate | ",
 "Upcoming Nov 7, 12:00 PM Lafayette at Bucknell, Navy, American | ",
 "Upcoming Nov 19, 6:00 PM Lafayette vs Lehigh | ",
 "Upcoming Jan 14, 1:00 PM Lafayette at Women at Siena | ",
 "Upcoming Jan 21, 5:00 PM Lafayette at Rider | ",
 "Upcoming Jan 23, 1:00 PM Lafayette at Men at NJIT | ",
 "Upcoming Jan 30, 12:00 PM Lafayette at Bison Invite | ",
 "Upcoming Feb 6, 11:00 AM Lafayette at Towson Diving Invite | ",
 "Upcoming Feb 17, 10:00 AM Lafayette at Patriot League Championships | ",
 "Upcoming Mar 8, 10:00 AM Lafayette at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 17, 10:00 AM Lafayette at Women's NCAA Championships | ",
 "Upcoming Mar 24, 10:00 AM Lafayette at Men's NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Lafayette at Lehigh Invitational | Completed",
 "Final Sep 19 Women's · Lafayette vs Haverford | L, 2-5",
 "Final Sep 24 Women's · Lafayette at Monmouth | L, 2-5",
 "Final Oct 3 Women's · Lafayette at East Stroudsburg Invitational | Completed",
 "Final Oct 9 Women's · Lafayette at Cissie Leary Invitational | Completed",
 "Today Oct 23 Women's · Lafayette at Patriot League Masters Tournament | ",
 "Upcoming Oct 28, 4:30 PM Women's · Lafayette vs Wagner | ",
 "Upcoming Feb 6, 9:00 AM Women's · Lafayette vs George Washington | ",
 "Upcoming Feb 7, 2:00 PM Women's · Lafayette at Stony Brook | ",
 "Upcoming Feb 12, 10:00 AM Women's · Lafayette at Saint Joseph's | ",
 "Upcoming Feb 13, 5:00 PM Women's · Lafayette vs FDU | ",
 "Upcoming Feb 21, 2:30 PM Women's · Lafayette vs Le Moyne | ",
 "Upcoming Feb 27, 5:00 PM Women's · Lafayette vs Morgan State | ",
 "Upcoming Mar 6, 11:00 AM Women's · Lafayette at New Jersey Institute of Technology | ",
 "Upcoming Mar 13 Women's · Lafayette at Army, Holy Cross and Loyola Md. | ",
 "Upcoming Mar 15 Women's · Lafayette at Spring Break Trip | ",
 "Upcoming Mar 21, 1:00 PM Women's · Lafayette vs Bucknell | ",
 "Upcoming Mar 23, 3:30 PM Women's · Lafayette at Villanova | ",
 "Upcoming Mar 26, 4:00 PM Women's · Lafayette vs Hofstra | ",
 "Upcoming Mar 27, 12:00 PM Women's · Lafayette vs Fairfield | ",
 "Upcoming Apr 3, 11:00 AM Women's · Lafayette vs Wagner | ",
 "Upcoming Apr 4 Women's · Lafayette vs Mercyhurst | ",
 "Upcoming Apr 8, 4:00 PM Women's · Lafayette vs Moravian | ",
 "Upcoming Apr 10, 1:00 PM Women's · Lafayette at Fordham | ",
 "Upcoming Apr 11, 10:00 AM Women's · Lafayette vs Saint Francis | ",
 "Upcoming Apr 17, 10:00 AM Women's · Lafayette at Colgate | ",
 "Upcoming Apr 25, 11:00 AM Women's · Lafayette vs Lehigh | ",
 "Upcoming Apr 29 Women's · Lafayette at Patriot League Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 16 Men's · Lafayette vs Kutztown | W, 6-1",
 "Final Sep 23 Men's · Lafayette vs Monmouth | L, 0-7",
 "Final Sep 26 Men's · Lafayette at Lehigh Invitational | Completed",
 "Final Oct 2 Men's · Lafayette at Saint Joseph's Invitational | Completed",
 "Today Oct 23 Men's · Lafayette at Patriot League Masters Tournament | ",
 "Upcoming Oct 28, 4:30 PM Men's · Lafayette vs Wagner | ",
 "Upcoming Oct 31, 10:30 AM Men's · Lafayette at Haverford | ",
 "Upcoming Jan 31 Men's · Lafayette at New Jersey Institute of Technology | ",
 "Upcoming Feb 12, 10:00 AM Men's · Lafayette at Saint Joseph's | ",
 "Upcoming Feb 13, 5:00 PM Men's · Lafayette vs FDU | ",
 "Upcoming Feb 21, 2:30 PM Men's · Lafayette vs Le Moyne | ",
 "Upcoming Feb 27, 5:00 PM Men's · Lafayette vs Morgan State | ",
 "Upcoming Mar 13 Men's · Lafayette at Army, Holy Cross and Loyola Md. | ",
 "Upcoming Mar 15 Men's · Lafayette at Spring Break Trip | ",
 "Upcoming Mar 23, 3:30 PM Men's · Lafayette at Villanova | ",
 "Upcoming Mar 27, 12:00 PM Men's · Lafayette vs Fairfield | ",
 "Upcoming Apr 3, 11:00 AM Men's · Lafayette vs Wagner | ",
 "Upcoming Apr 4, 11:00 AM Men's · Lafayette vs Mercyhurst | ",
 "Upcoming Apr 8, 4:00 PM Men's · Lafayette vs Moravian | ",
 "Upcoming Apr 11, 10:00 AM Men's · Lafayette vs Saint Francis | ",
 "Upcoming Apr 13 Men's · Lafayette vs Lehigh | ",
 "Upcoming Apr 17, 10:00 AM Men's · Lafayette at Colgate | ",
 "Upcoming Apr 18, 12:00 PM Men's · Lafayette at Bucknell | ",
 "Upcoming Apr 22 Men's · Lafayette at Patriot League Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Lafayette vs Marist | W, 3-1",
 "Final Aug 29 Lafayette vs Montana State | L, 0-3",
 "Final Aug 30 Lafayette vs Delaware | W, 3-2",
 "Final Sep 4 Lafayette at Iona | L, 1-3",
 "Final Sep 5 Lafayette at FDU | W, 3-0",
 "Final Sep 5 Lafayette at Columbia | L, 1-3",
 "Final Sep 9 Lafayette at NJIT | W, 3-1",
 "Final Sep 12 Lafayette vs Rhode Island | W, 3-2",
 "Final Sep 13 Lafayette vs Quinnipiac | W, 3-0",
 "Final Sep 13 Lafayette vs Penn | L, 0-3",
 "Final Sep 18 Lafayette vs Bucknell | L, 2-3",
 "Final Sep 20 Lafayette at Lehigh | L, 0-3",
 "Final Sep 25 Lafayette at Navy | L, 1-3",
 "Final Sep 26 Lafayette at American | L, 0-3",
 "Final Oct 2 Lafayette vs Holy Cross | L, 2-3",
 "Final Oct 3 Lafayette at Army | L, 0-3",
 "Final Oct 10 Lafayette vs Loyola | L, 0-3",
 "Final Oct 11 Lafayette at Colgate | L, 0-3",
 "Final Oct 17 Lafayette at Loyola | L, 1-3",
 "Upcoming Oct 23, 7:00 PM Lafayette vs Lehigh | ",
 "Upcoming Oct 25, 2:00 PM Lafayette at Bucknell | ",
 "Upcoming Oct 30, 7:00 PM Lafayette vs Navy | ",
 "Upcoming Oct 31, 6:00 PM Lafayette vs American | ",
 "Upcoming Nov 6, 6:00 PM Lafayette at Holy Cross | ",
 "Upcoming Nov 8, 1:00 PM Lafayette vs Army | ",
 "Upcoming Nov 14, 1:00 PM Lafayette vs Colgate | ",
 "Upcoming Nov 17 Lafayette at Patriot League Tournament | ",
 "Upcoming Dec 3 Lafayette at NCAA First Round | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Lafayette module checks passed");
