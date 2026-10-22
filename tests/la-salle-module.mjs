import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {laSalleSchool} from '../src/schools/la-salle.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='la-salle');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,laSalleHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/la-salle-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goexplorers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['la-salle'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',laSalleSchool.scheduleUrls],['roster',laSalleSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('la-salle|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goexplorers.com',`${key} must stay on goexplorers.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://goexplorers.com/sports/acrobatics-tumbling/schedule"],"roster":["https://goexplorers.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://goexplorers.com/sports/baseball/schedule"],"roster":["https://goexplorers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goexplorers.com/sports/mens-basketball/schedule","https://goexplorers.com/sports/womens-basketball/schedule"],"roster":["https://goexplorers.com/sports/mens-basketball/roster","https://goexplorers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goexplorers.com/sports/womens-cross-country/schedule","https://goexplorers.com/sports/mens-cross-country/schedule"],"roster":["https://goexplorers.com/sports/womens-cross-country/roster","https://goexplorers.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://goexplorers.com/sports/field-hockey/schedule"],"roster":["https://goexplorers.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://goexplorers.com/sports/womens-golf/schedule","https://goexplorers.com/sports/mens-golf/schedule"],"roster":["https://goexplorers.com/sports/womens-golf/roster","https://goexplorers.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://goexplorers.com/sports/womens-lacrosse/schedule"],"roster":["https://goexplorers.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://goexplorers.com/sports/womens-rowing/schedule","https://goexplorers.com/sports/mens-rowing/schedule"],"roster":["https://goexplorers.com/sports/womens-rowing/roster","https://goexplorers.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://goexplorers.com/sports/womens-soccer/schedule","https://goexplorers.com/sports/mens-soccer/schedule"],"roster":["https://goexplorers.com/sports/womens-soccer/roster","https://goexplorers.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://goexplorers.com/sports/womens-swimming-and-diving/schedule","https://goexplorers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goexplorers.com/sports/womens-swimming-and-diving/roster","https://goexplorers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://goexplorers.com/sports/womens-track-and-field/schedule","https://goexplorers.com/sports/mens-track-and-field/schedule"],"roster":["https://goexplorers.com/sports/womens-track-and-field/roster","https://goexplorers.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://goexplorers.com/sports/triathlon/schedule"],"roster":["https://goexplorers.com/sports/triathlon/roster"],"combined":false},"Water Polo":{"schedule":["https://goexplorers.com/sports/womens-water-polo/schedule"],"roster":["https://goexplorers.com/sports/womens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'la-salle|"+sport+"':"),`${sport} routes must live in the La Salle module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://goexplorers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.laSalleHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=la-salle)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · La Salle vs Neumann (Exhibition) | ",
 "Upcoming Nov 2, 9:00 PM Men's · La Salle at Houston | ",
 "Upcoming Nov 7, 3:30 PM Men's · La Salle vs LIU | ",
 "Upcoming Nov 10, 7:00 PM Men's · La Salle at Villanova | ",
 "Upcoming Nov 15, 2:00 PM Men's · La Salle vs Temple | ",
 "Upcoming Nov 18, 7:00 PM Men's · La Salle vs Coppin State | ",
 "Upcoming Nov 21, 4:00 PM Men's · La Salle vs Penn | ",
 "Upcoming Nov 23, 7:00 PM Men's · La Salle vs Penn State Brandywine | ",
 "Upcoming Nov 27, 3:30 PM Men's · La Salle vs Bucknell | ",
 "Upcoming Dec 1, 7:00 PM Men's · La Salle vs Wofford | ",
 "Upcoming Dec 5 Men's · La Salle at Big 5 Classic | ",
 "Upcoming Dec 8, 7:00 PM Men's · La Salle at Monmouth | ",
 "Upcoming Dec 12, 2:00 PM Men's · La Salle at Stony Brook | ",
 "Upcoming Dec 18, 7:00 PM Men's · La Salle vs Delaware Valley | ",
 "Upcoming Dec 22, 9:00 PM Men's · La Salle at BYU | ",
 "Upcoming Dec 30, 7:00 PM Men's · La Salle at Dayton | ",
 "Upcoming Jan 2, 4:00 PM Men's · La Salle vs Fordham | ",
 "Upcoming Jan 6, 7:00 PM Men's · La Salle vs George Washington | ",
 "Upcoming Jan 9, 1:00 PM Men's · La Salle at Rhode Island | ",
 "Upcoming Jan 13, 6:00 PM Men's · La Salle at VCU | ",
 "Upcoming Jan 20, 7:00 PM Men's · La Salle vs Saint Louis | ",
 "Upcoming Jan 23, 2:00 PM Men's · La Salle vs Davidson | ",
 "Upcoming Jan 27, 7:00 PM Men's · La Salle at Fordham | ",
 "Upcoming Jan 30, 2:00 PM Men's · La Salle vs Rhode Island | ",
 "Upcoming Feb 6, 12:30 PM Men's · La Salle at Saint Joseph's | ",
 "Upcoming Feb 10, 7:00 PM Men's · La Salle vs Duquesne | ",
 "Upcoming Feb 13, 6:00 PM Men's · La Salle at George Washington | ",
 "Upcoming Feb 17, 7:00 PM Men's · La Salle at George Mason | ",
 "Upcoming Feb 20, 2:00 PM Men's · La Salle vs Loyola Chicago | ",
 "Upcoming Feb 24, 8:00 PM Men's · La Salle at Saint Louis | ",
 "Upcoming Feb 27, 4:30 PM Men's · La Salle vs Richmond | ",
 "Upcoming Mar 3, 7:00 PM Men's · La Salle at St. Bonaventure | ",
 "Upcoming Mar 6, 4:00 PM Men's · La Salle vs Saint Joseph's | ",
 "Upcoming Mar 10 Men's · La Salle at Atlantic 10 Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 7:00 PM Women's · La Salle at Rutgers | ",
 "Upcoming Nov 7, 12:00 PM Women's · La Salle vs Loyola (MD) | ",
 "Upcoming Nov 11, 6:30 PM Women's · La Salle vs Temple | ",
 "Upcoming Nov 15, 6:00 PM Women's · La Salle at Virginia Tech | ",
 "Upcoming Nov 18, 4:30 PM Women's · La Salle vs Rowan | ",
 "Upcoming Nov 21, 1:00 PM Women's · La Salle at American | ",
 "Upcoming Nov 24, 11:30 AM Women's · La Salle at Villanova | ",
 "Upcoming Dec 2, 6:30 PM Women's · La Salle vs George Mason | ",
 "Upcoming Dec 6 Women's · La Salle at Big 5 Championship | ",
 "Upcoming Dec 12, 1:00 PM Women's · La Salle at Iona | ",
 "Upcoming Dec 15, 6:30 PM Women's · La Salle vs Maryland Eastern Shore | ",
 "Upcoming Dec 19 Women's · La Salle vs UC San Diego | ",
 "Upcoming Dec 20 Women's · La Salle vs FDU / Youngstown St | ",
 "Upcoming Dec 30, 6:30 PM Women's · La Salle vs George Washington | ",
 "Upcoming Jan 2, 3:00 PM Women's · La Salle at Fordham | ",
 "Upcoming Jan 6, 7:00 PM Women's · La Salle at Saint Joseph's | ",
 "Upcoming Jan 9, 2:00 PM Women's · La Salle vs Rhode Island | ",
 "Upcoming Jan 13, 7:00 PM Women's · La Salle at Davidson | ",
 "Upcoming Jan 16, 2:00 PM Women's · La Salle vs St. Bonaventure | ",
 "Upcoming Jan 20, 7:00 PM Women's · La Salle at Dayton | ",
 "Upcoming Jan 23, 2:00 PM Women's · La Salle at VCU | ",
 "Upcoming Jan 27, 11:00 AM Women's · La Salle vs Loyola Chicago | ",
 "Upcoming Jan 30 Women's · La Salle at George Washington | ",
 "Upcoming Feb 3, 6:30 PM Women's · La Salle vs Duquesne | ",
 "Upcoming Feb 6, 2:00 PM Women's · La Salle vs Saint Joseph's | ",
 "Upcoming Feb 10 Women's · La Salle at Saint Louis | ",
 "Upcoming Feb 14, 1:00 PM Women's · La Salle at Loyola Chicago | ",
 "Upcoming Feb 21, 2:00 PM Women's · La Salle vs Fordham | ",
 "Upcoming Feb 24, 6:30 PM Women's · La Salle vs Richmond | ",
 "Upcoming Feb 27, 2:00 PM Women's · La Salle at Rhode Island | ",
 "Upcoming Mar 3 Women's · La Salle at Atlantic 10 Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 18 Women's · La Salle at Main Line Invite | 4th/13, 91 pts",
 "Final Oct 2 Women's · La Salle at Paul Short Run | 26th/37, 751 pts",
 "Final Oct 16 Women's · La Salle at Princeton Fall Classic | 9th/18, 240 pts",
 "Upcoming Oct 31, 10:00 AM Women's · La Salle at Atlantic 10 Championships | ",
 "Upcoming Nov 13, 11:00 AM Women's · La Salle at NCAA Mid-Atlantic Region | ",
 "Upcoming Nov 21, 11:00 AM Women's · La Salle at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 18 Men's · La Salle at Main Line Invite | 5th/8, 132 pts",
 "Final Sep 26 Men's · La Salle at Meadows Challenge | 15th/15, 416 pts",
 "Final Oct 2 Men's · La Salle at Paul Short Run | Completed",
 "Final Oct 16 Men's · La Salle at Princeton Fall Classic | 10th/20, 263 pts",
 "Upcoming Oct 31, 10:00 AM Men's · La Salle at Atlantic 10 Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · La Salle at NCAA Mid-Atlantic Region | ",
 "Upcoming Nov 21, 11:00 AM Men's · La Salle at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 30 La Salle vs Villanova | L, 0-7",
 "Final Sep 4 La Salle at Cornell | L, 0-5",
 "Final Sep 6 La Salle at Colgate | L, 2-3",
 "Final Sep 11 La Salle at Penn | L, 1-7",
 "Final Sep 13 La Salle vs Queens | W, 3-2",
 "Final Sep 18 La Salle vs VCU | L, 1-2",
 "Final Sep 20 La Salle vs New Haven | W, 8-0",
 "Final Sep 25 La Salle at Lock Haven | W, 2-1",
 "Final Sep 27 La Salle at Rutgers | L, 0-5",
 "Final Oct 2 La Salle at Richmond | L, 1-8",
 "Final Oct 4 La Salle vs LIU | W, 4-2",
 "Final Oct 9 La Salle vs Davidson | L, 1-2",
 "Final Oct 11 La Salle vs Columbia | L, 1-2",
 "Final Oct 16 La Salle vs Saint Louis | W, 2-1",
 "Final Oct 18 La Salle at Bucknell | L, 0-1",
 "Upcoming Oct 25, 3:00 PM La Salle at Drexel | ",
 "Upcoming Oct 30, 3:00 PM La Salle at Saint Joseph's | ",
 "Upcoming Nov 5 La Salle vs Atlantic 10 | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 Women's · La Salle at Bucknell Invitational | Completed",
 "Final Sep 20 Women's · La Salle at Ron Jaworski Golf Tri-Match | 1st of 3",
 "Final Sep 23 Women's · La Salle at Jefferson Invitational | 4th of 8",
 "Final Sep 28 Women's · La Salle at Autumn Harvest | 9th of 11",
 "Final Oct 18 Women's · La Salle at Wagner-Saint Joseph's Tri Match | 3rd of 4",
 "Upcoming Oct 26 Women's · La Salle at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · La Salle at Bryan National Collegiate | 9th of 13",
 "Final Sep 21 Men's · La Salle at Temple Invitational | T4th of 12",
 "Final Oct 4 Men's · La Salle at Matthews Auto Collegiate Invitational | 2nd of 13",
 "Final Oct 12 Men's · La Salle at Bucknell Invitational | 7th of 18",
 "Upcoming Oct 25 Men's · La Salle at ODU/OBX Invitational | ",
 "Upcoming Oct 28 Men's · La Salle at City Six | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · La Salle at Head of the Schuylkill | ",
 "Upcoming Nov 1 Women's · La Salle vs Princeton Chase Regatta | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24 Men's · La Salle at Head of the Schuylkill | ",
 "Upcoming Nov 1 Men's · La Salle vs Princeton Chase Regatta | ",
 "Upcoming Nov 4 Men's · La Salle at USRowing Small Boat National Championships | ",
 "Upcoming Nov 5 Men's · La Salle at USRowing Small Boat National Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · La Salle vs American | W, 2-1",
 "Final Aug 20 Women's · La Salle at Virginia | L, 0-7",
 "Final Aug 23 Women's · La Salle at Bucknell | L, 0-4",
 "Final Aug 28 Women's · La Salle vs Drexel | T, 1-1",
 "Final Aug 30 Women's · La Salle vs Columbia | L, 1-2",
 "Final Sep 3 Women's · La Salle at Lafayette | T, 2-2",
 "Final Sep 6 Women's · La Salle vs Howard | W, 7-4",
 "Final Sep 10 Women's · La Salle at Lehigh | W, 2-0",
 "Final Sep 19 Women's · La Salle vs Davidson | W, 2-1",
 "Final Sep 24 Women's · La Salle at Loyola Chicago | T, 1-1",
 "Final Sep 27 Women's · La Salle vs Rhode Island | L, 2-3",
 "Final Oct 2 Women's · La Salle at Dayton | W, 2-0",
 "Final Oct 8 Women's · La Salle vs Richmond | W, 2-0",
 "Final Oct 11 Women's · La Salle at VCU | W, 5-2",
 "Final Oct 18 Women's · La Salle at Fordham | T, 2-2",
 "Today Oct 22, 7:00 PM Women's · La Salle vs Saint Louis | ",
 "Upcoming Oct 25, 1:00 PM Women's · La Salle at George Mason | ",
 "Upcoming Oct 31 Women's · La Salle vs Duquesne | ",
 "Upcoming Nov 6 Women's · La Salle at Atlantic 10 Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 21 Men's · La Salle at Lehigh | W, 4-1",
 "Final Aug 24 Men's · La Salle vs FDU | L, 1-2",
 "Final Aug 29 Men's · La Salle vs Keystone | W, 9-0",
 "Final Sep 1 Men's · La Salle at Lafayette | W, 1-0",
 "Final Sep 6 Men's · La Salle at Monmouth | W, 4-2",
 "Final Sep 12 Men's · La Salle vs Rider | L, 2-3",
 "Final Sep 15 Men's · La Salle at Drexel | L, 1-3",
 "Final Sep 19 Men's · La Salle at George Washington | W, 3-2",
 "Final Sep 26 Men's · La Salle vs Dayton | T, 1-1",
 "Final Oct 3 Men's · La Salle at Delaware | L, 1-2",
 "Final Oct 7 Men's · La Salle at Saint Joseph's | T, 2-2",
 "Final Oct 10 Men's · La Salle vs Saint Louis | L, 2-3",
 "Final Oct 13 Men's · La Salle vs NJIT | T, 3-3",
 "Final Oct 17 Men's · La Salle at Rhode Island | L, 0-5",
 "Final Oct 21 Men's · La Salle vs George Mason | L, 0-1",
 "Upcoming Oct 24, 1:00 PM Men's · La Salle at St. Bonaventure | ",
 "Upcoming Oct 31, 5:00 PM Men's · La Salle vs Duquesne | ",
 "Upcoming Nov 6 Men's · La Salle at Atlantic 10 Tournament | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · La Salle vs Towson | Completed",
 "Final Oct 17 Women's · La Salle at Drexel | Completed",
 "Upcoming Nov 14 Women's · La Salle at UMBC | ",
 "Upcoming Nov 19 Women's · La Salle at Queens | ",
 "Upcoming Nov 19 Women's · La Salle at WVU | ",
 "Upcoming Dec 5 Women's · La Salle at UMass | ",
 "Upcoming Dec 5 Women's · La Salle at Rhode Island | ",
 "Upcoming Jan 14 Women's · La Salle vs GMU | ",
 "Upcoming Jan 23 Women's · La Salle at Fordham | ",
 "Upcoming Jan 30 Women's · La Salle vs Monmouth | ",
 "Upcoming Feb 17 Women's · La Salle at A10 Championship | ",
 "Upcoming Mar 17 Women's · La Salle at NCAA Champiosnships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · La Salle vs Towson | Completed",
 "Final Oct 17 Men's · La Salle at Drexel | Completed",
 "Upcoming Nov 14 Men's · La Salle at UMBC | ",
 "Upcoming Nov 19 Men's · La Salle at Queens | ",
 "Upcoming Nov 19 Men's · La Salle at WVU | ",
 "Upcoming Jan 9 Men's · La Salle at Penn | ",
 "Upcoming Jan 9 Men's · La Salle at Villanova | ",
 "Upcoming Jan 14 Men's · La Salle vs GMU | ",
 "Upcoming Jan 23 Men's · La Salle at Fordham | ",
 "Upcoming Jan 30 Men's · La Salle vs Monmouth | ",
 "Upcoming Feb 17 Men's · La Salle at A10 Championship | ",
 "Upcoming Mar 24 Men's · La Salle at NCAA Champiosnships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Aug 30 La Salle at Duquesne Collegiate Cup | Completed",
 "Final Sep 19 La Salle at Beaver County Collegiate Cup | Completed",
 "Final Oct 4 La Salle at Navy Collegiate Cup | Completed",
 "Final Oct 17 La Salle at NCAA East Regionals | Completed",
 "Upcoming Nov 8 La Salle at NCAA Championships | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("La Salle module checks passed");
