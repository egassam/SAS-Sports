import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {newHampshireSchool} from '../src/schools/new-hampshire.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='new-hampshire');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,newHampshireHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/new-hampshire-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit unhwildcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['new-hampshire'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',newHampshireSchool.scheduleUrls],['roster',newHampshireSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('new-hampshire|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'unhwildcats.com',`${key} must stay on unhwildcats.com`);
  }
}
const parity={"Basketball":{"schedule":["https://unhwildcats.com/sports/mens-basketball/schedule","https://unhwildcats.com/sports/womens-basketball/schedule"],"roster":["https://unhwildcats.com/sports/mens-basketball/roster","https://unhwildcats.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://unhwildcats.com/sports/womens-cross-country/schedule","https://unhwildcats.com/sports/mens-cross-country/schedule"],"roster":["https://unhwildcats.com/sports/womens-cross-country/roster","https://unhwildcats.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://unhwildcats.com/sports/field-hockey/schedule"],"roster":["https://unhwildcats.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://unhwildcats.com/sports/football/schedule"],"roster":["https://unhwildcats.com/sports/football/roster"],"combined":false},"Gymnastics":{"schedule":["https://unhwildcats.com/sports/womens-gymnastics/schedule"],"roster":["https://unhwildcats.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://unhwildcats.com/sports/mens-ice-hockey/schedule","https://unhwildcats.com/sports/womens-ice-hockey/schedule"],"roster":["https://unhwildcats.com/sports/mens-ice-hockey/roster","https://unhwildcats.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://unhwildcats.com/sports/womens-lacrosse/schedule"],"roster":["https://unhwildcats.com/sports/womens-lacrosse/roster"],"combined":false},"Skiing":{"schedule":["https://unhwildcats.com/sports/skiing/schedule"],"roster":["https://unhwildcats.com/sports/skiing/roster"],"combined":false},"Soccer":{"schedule":["https://unhwildcats.com/sports/womens-soccer/schedule","https://unhwildcats.com/sports/mens-soccer/schedule"],"roster":["https://unhwildcats.com/sports/womens-soccer/roster","https://unhwildcats.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://unhwildcats.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://unhwildcats.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://unhwildcats.com/sports/womens-track-and-field/schedule","https://unhwildcats.com/sports/mens-track-and-field/schedule"],"roster":["https://unhwildcats.com/sports/womens-track-and-field/roster","https://unhwildcats.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://unhwildcats.com/sports/womens-volleyball/schedule"],"roster":["https://unhwildcats.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'new-hampshire|"+sport+"':"),`${sport} routes must live in the New Hampshire module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://unhwildcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.newHampshireHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=new-hampshire)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · New Hampshire at Brown | ",
 "Upcoming Nov 5, 7:00 PM Men's · New Hampshire at Rider | ",
 "Upcoming Nov 8, 1:00 PM Men's · New Hampshire vs Sacred Heart | ",
 "Upcoming Nov 11, 6:00 PM Men's · New Hampshire vs Thomas College | ",
 "Upcoming Nov 15, 1:30 PM Men's · New Hampshire at Boston College | ",
 "Upcoming Nov 18, 8:00 PM Men's · New Hampshire at Stonehill | ",
 "Upcoming Nov 21 Men's · New Hampshire at New Haven | ",
 "Upcoming Nov 24, 7:00 PM Men's · New Hampshire at Seton Hall | ",
 "Upcoming Nov 29, 2:00 PM Men's · New Hampshire at Holy Cross | ",
 "Upcoming Dec 2, 6:00 PM Men's · New Hampshire vs Harvard | ",
 "Upcoming Dec 5, 4:30 PM Men's · New Hampshire at Boston U. | ",
 "Upcoming Dec 9, 7:30 PM Men's · New Hampshire at Marquette | ",
 "Upcoming Dec 12, 1:00 PM Men's · New Hampshire vs Dartmouth | ",
 "Upcoming Dec 20, 1:00 PM Men's · New Hampshire vs Manhattan | ",
 "Upcoming Dec 22, 1:00 PM Men's · New Hampshire vs Fairfield | ",
 "Upcoming Dec 29, 8:00 PM Men's · New Hampshire at Iowa State | ",
 "Upcoming Jan 2, 2:00 PM Men's · New Hampshire at UMass Lowell | ",
 "Upcoming Jan 7, 6:00 PM Men's · New Hampshire vs UMBC | ",
 "Upcoming Jan 9, 12:00 PM Men's · New Hampshire vs NJIT | ",
 "Upcoming Jan 14, 6:00 PM Men's · New Hampshire vs Vermont | ",
 "Upcoming Jan 21, 6:30 PM Men's · New Hampshire at UAlbany | ",
 "Upcoming Jan 23, 2:00 PM Men's · New Hampshire at Binghamton | ",
 "Upcoming Jan 28, 6:00 PM Men's · New Hampshire vs Bryant | ",
 "Upcoming Jan 30, 2:00 PM Men's · New Hampshire at Maine | ",
 "Upcoming Feb 4, 7:00 PM Men's · New Hampshire at Vermont | ",
 "Upcoming Feb 6, 2:00 PM Men's · New Hampshire vs UMass Lowell | ",
 "Upcoming Feb 11, 7:00 PM Men's · New Hampshire at NJIT | ",
 "Upcoming Feb 13, 1:00 PM Men's · New Hampshire at UMBC | ",
 "Upcoming Feb 20, 1:00 PM Men's · New Hampshire vs Maine | ",
 "Upcoming Feb 25, 6:00 PM Men's · New Hampshire vs UAlbany | ",
 "Upcoming Feb 27, 12:00 PM Men's · New Hampshire vs Binghamton | ",
 "Upcoming Mar 2, 6:00 PM Men's · New Hampshire at Bryant | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · New Hampshire vs NEC | ",
 "Upcoming Nov 5, 6:00 PM Women's · New Hampshire vs Canisius | ",
 "Upcoming Nov 8, 1:00 PM Women's · New Hampshire at Niagara | ",
 "Upcoming Nov 11, 6:30 PM Women's · New Hampshire at Dartmouth | ",
 "Upcoming Nov 14, 7:00 PM Women's · New Hampshire vs Colgate | ",
 "Upcoming Nov 18, 4:30 PM Women's · New Hampshire at Yale | ",
 "Upcoming Nov 22, 2:00 PM Women's · New Hampshire at Boston University | ",
 "Upcoming Nov 24, 7:00 PM Women's · New Hampshire at Providence | ",
 "Upcoming Nov 29, 1:00 PM Women's · New Hampshire at CCSU | ",
 "Upcoming Dec 3, 6:00 PM Women's · New Hampshire vs Vermont State Johnson | ",
 "Upcoming Dec 6, 1:00 PM Women's · New Hampshire at New Haven | ",
 "Upcoming Dec 9, 6:00 PM Women's · New Hampshire vs Brown | ",
 "Upcoming Dec 13, 2:00 PM Women's · New Hampshire at VCU | ",
 "Upcoming Dec 19, 2:00 PM Women's · New Hampshire vs UMass | ",
 "Upcoming Dec 28, 4:00 PM Women's · New Hampshire vs Stonehill | ",
 "Upcoming Dec 31, 4:00 PM Women's · New Hampshire vs Bryant | ",
 "Upcoming Jan 3, 1:00 PM Women's · New Hampshire vs UMass Lowell | ",
 "Upcoming Jan 7, 6:00 PM Women's · New Hampshire at NJIT | ",
 "Upcoming Jan 9, 2:00 PM Women's · New Hampshire at UMBC | ",
 "Upcoming Jan 14, 11:00 AM Women's · New Hampshire at Vermont | ",
 "Upcoming Jan 21, 11:00 AM Women's · New Hampshire vs UAlbany | ",
 "Upcoming Jan 23, 1:00 PM Women's · New Hampshire vs Binghamton | ",
 "Upcoming Jan 28, 6:00 PM Women's · New Hampshire at Bryant | ",
 "Upcoming Jan 30, 1:00 PM Women's · New Hampshire vs Maine | ",
 "Upcoming Feb 4, 6:00 PM Women's · New Hampshire vs Vermont | ",
 "Upcoming Feb 6, 2:00 PM Women's · New Hampshire at UMass Lowell | ",
 "Upcoming Feb 11, 6:00 PM Women's · New Hampshire vs NJIT | ",
 "Upcoming Feb 13, 12:00 PM Women's · New Hampshire vs UMBC | ",
 "Upcoming Feb 20, 1:00 PM Women's · New Hampshire at Maine | ",
 "Upcoming Feb 25, 6:30 PM Women's · New Hampshire at UAlbany | ",
 "Upcoming Feb 27, 2:00 PM Women's · New Hampshire at Binghamton | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · New Hampshire at Suffolk Short Course Classic | 1st · 36 pts",
 "Final Sep 19 Women's · New Hampshire at UMass Dartmouth XC Invitational | Gold team: 6th · 177 pts",
 "Final Oct 9 Women's · New Hampshire at New England Championship | 6th · 191 pts",
 "Upcoming Oct 30, 12:00 PM Women's · New Hampshire at America East Championship | ",
 "Upcoming Nov 13, 11:00 AM Women's · New Hampshire at NCAA Northeast Regional Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · New Hampshire at Suffolk Short Course Classic | 1st · 21 pts",
 "Final Sep 19 Men's · New Hampshire at UMass Dartmouth XC Invitational | Gold team: 5th · 192 pts / Navy team: 3rd · 96 pts",
 "Final Oct 9 Men's · New Hampshire at New England Championship | 9th · 221 pts",
 "Upcoming Oct 30, 11:00 AM Men's · New Hampshire at America East Championship | ",
 "Upcoming Nov 13, 12:00 PM Men's · New Hampshire at NCAA Northeast Regional Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 New Hampshire at Saint Joseph's | L, 1-2",
 "Final Aug 29 New Hampshire vs UConn | L, 0-5",
 "Final Sep 4 New Hampshire at Indiana | L, 0-4",
 "Final Sep 6 New Hampshire vs Central Michigan | W, 2-1",
 "Final Sep 13 New Hampshire at UMass | L, 0-6",
 "Final Sep 20 New Hampshire vs Boston U. | L, 1-5",
 "Final Oct 2 New Hampshire vs Vermont | W, 1-0",
 "Final Oct 4 New Hampshire vs Miami (Ohio) | L, 0-5",
 "Final Oct 9 New Hampshire at Maine | W, 4-3",
 "Final Oct 11 New Hampshire vs New Haven | W, 2-0",
 "Final Oct 16 New Hampshire vs UMass Lowell | L, 0-4",
 "Final Oct 18 New Hampshire at Temple | L, 2-3",
 "Today Oct 23, 12:00 PM New Hampshire vs UAlbany | ",
 "Upcoming Oct 25, 12:00 PM New Hampshire vs Cornell | ",
 "Upcoming Oct 29, 1:00 PM New Hampshire at Bryant | ",
 "Upcoming Nov 1 New Hampshire at America East First Round | ",
 "Upcoming Nov 3 New Hampshire at America East Semifinal | ",
 "Upcoming Nov 6 New Hampshire at America East Final | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 New Hampshire at UAlbany | L, 14-28",
 "Final Sep 5 New Hampshire at Syracuse | L, 3-66",
 "Final Sep 12 New Hampshire vs Stonehill | W, 42-35",
 "Final Sep 19 New Hampshire vs Harvard | L, 7-31",
 "Final Sep 26 New Hampshire at Sacred Heart | L, 13-20",
 "Final Oct 3 New Hampshire vs Elon | W, 30-23",
 "Final Oct 10 New Hampshire at North Carolina A&T | L, 27-30",
 "Final Oct 17 New Hampshire vs Monmouth | L, 21-42",
 "Upcoming Oct 24, 12:00 PM New Hampshire at Merrimack | ",
 "Upcoming Nov 7, 1:00 PM New Hampshire vs Rhode Island | ",
 "Upcoming Nov 14, 1:00 PM New Hampshire vs Stony Brook | ",
 "Upcoming Nov 21, 1:00 PM New Hampshire at Maine | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · New Hampshire at Quinnipiac | L, 2-10",
 "Final Oct 8 Men's · New Hampshire at Merrimack | T, 3-3",
 "Final Oct 16 Men's · New Hampshire at Colgate | W, 5-2",
 "Final Oct 17 Men's · New Hampshire at Colgate | W, 2-0",
 "Today Oct 23, 7:00 PM Men's · New Hampshire vs Michigan State | ",
 "Upcoming Oct 24, 7:00 PM Men's · New Hampshire vs Michigan State | ",
 "Upcoming Oct 30, 7:00 PM Men's · New Hampshire at Vermont | ",
 "Upcoming Oct 31, 4:00 PM Men's · New Hampshire at Vermont | ",
 "Upcoming Nov 6, 7:15 PM Men's · New Hampshire at UMass Lowell | ",
 "Upcoming Nov 7, 7:00 PM Men's · New Hampshire vs UMass Lowell | ",
 "Upcoming Nov 13, 7:00 PM Men's · New Hampshire vs RPI | ",
 "Upcoming Nov 14, 7:00 PM Men's · New Hampshire vs Union | ",
 "Upcoming Nov 19, 7:00 PM Men's · New Hampshire at UConn | ",
 "Upcoming Nov 21, 5:00 PM Men's · New Hampshire vs UConn | ",
 "Upcoming Nov 28, 4:00 PM Men's · New Hampshire vs Brown | ",
 "Upcoming Dec 4, 7:00 PM Men's · New Hampshire vs Maine | ",
 "Upcoming Dec 5, 7:00 PM Men's · New Hampshire vs Maine | ",
 "Upcoming Dec 11, 7:00 PM Men's · New Hampshire at Providence | ",
 "Upcoming Dec 13, 3:00 PM Men's · New Hampshire at Dartmouth | ",
 "Upcoming Jan 2, 7:00 PM Men's · New Hampshire vs RIT | ",
 "Upcoming Jan 9, 4:00 PM Men's · New Hampshire vs Merrimack | ",
 "Upcoming Jan 15, 7:00 PM Men's · New Hampshire vs Northeastern | ",
 "Upcoming Jan 16, 7:00 PM Men's · New Hampshire vs Northeastern | ",
 "Upcoming Jan 22, 7:00 PM Men's · New Hampshire at Boston College | ",
 "Upcoming Jan 23, 7:00 PM Men's · New Hampshire vs Boston College | ",
 "Upcoming Jan 29, 7:00 PM Men's · New Hampshire vs Merrimack | ",
 "Upcoming Feb 6, 7:00 PM Men's · New Hampshire vs UMass | ",
 "Upcoming Feb 12, 7:00 PM Men's · New Hampshire at UMass | ",
 "Upcoming Feb 13, 7:00 PM Men's · New Hampshire at UMass | ",
 "Upcoming Feb 19, 7:00 PM Men's · New Hampshire at Boston University | ",
 "Upcoming Feb 20, 7:00 PM Men's · New Hampshire vs Boston University | ",
 "Upcoming Feb 26, 7:00 PM Men's · New Hampshire vs Providence | ",
 "Upcoming Feb 27, 7:00 PM Men's · New Hampshire at Providence | ",
 "Upcoming Mar 4, 7:00 PM Men's · New Hampshire vs UConn | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 19 Women's · New Hampshire at Maine (Exhibition) | W, 5-2",
 "Final Sep 25 Women's · New Hampshire at St. Thomas | L, 2-7",
 "Final Sep 26 Women's · New Hampshire at St. Thomas | L, 1-3",
 "Final Oct 2 Women's · New Hampshire at LIU | W, 5-2",
 "Final Oct 3 Women's · New Hampshire at LIU | W, 3-0",
 "Final Oct 9 Women's · New Hampshire vs Boston University | T, 4-4",
 "Final Oct 11 Women's · New Hampshire at Northeastern | L, 3-6",
 "Final Oct 15 Women's · New Hampshire vs St. Lawrence | W, 3-1",
 "Final Oct 16 Women's · New Hampshire vs St. Lawrence | L, 2-3",
 "Today Oct 23, 2:00 PM Women's · New Hampshire vs Stonehill | ",
 "Upcoming Oct 24, 7:00 PM Women's · New Hampshire at Harvard | ",
 "Upcoming Oct 30, 2:00 PM Women's · New Hampshire at Merrimack | ",
 "Upcoming Oct 31, 2:00 PM Women's · New Hampshire vs Merrimack | ",
 "Upcoming Nov 6, 6:00 PM Women's · New Hampshire vs Providence | ",
 "Upcoming Nov 7, 2:00 PM Women's · New Hampshire at Providence | ",
 "Upcoming Nov 12, 6:00 PM Women's · New Hampshire vs Vermont | ",
 "Upcoming Nov 13, 2:00 PM Women's · New Hampshire vs Vermont | ",
 "Upcoming Nov 19, 7:00 PM Women's · New Hampshire at Holy Cross | ",
 "Upcoming Nov 20, 6:00 PM Women's · New Hampshire vs Holy Cross | ",
 "Upcoming Dec 4, 6:00 PM Women's · New Hampshire at Maine | ",
 "Upcoming Dec 5, 5:00 PM Women's · New Hampshire at Maine | ",
 "Upcoming Jan 1, 6:00 PM Women's · New Hampshire vs RIT | ",
 "Upcoming Jan 2, 2:00 PM Women's · New Hampshire vs RIT | ",
 "Upcoming Jan 8, 6:00 PM Women's · New Hampshire at Boston University | ",
 "Upcoming Jan 16, 2:00 PM Women's · New Hampshire vs Northeastern | ",
 "Upcoming Jan 22, 6:00 PM Women's · New Hampshire vs Boston College | ",
 "Upcoming Jan 23, 2:00 PM Women's · New Hampshire at Boston College | ",
 "Upcoming Jan 29, 2:00 PM Women's · New Hampshire vs UConn | ",
 "Upcoming Jan 30, 6:00 PM Women's · New Hampshire at UConn | ",
 "Upcoming Feb 4, 6:00 PM Women's · New Hampshire at Northeastern | ",
 "Upcoming Feb 6, 6:00 PM Women's · New Hampshire at UConn | ",
 "Upcoming Feb 12, 6:00 PM Women's · New Hampshire vs Merrimack | ",
 "Upcoming Feb 13, 2:00 PM Women's · New Hampshire vs Boston University | ",
 "Upcoming Feb 18, 6:00 PM Women's · New Hampshire vs Holy Cross | ",
 "Upcoming Feb 20, 2:00 PM Women's · New Hampshire at Providence | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_skiing=parse("Skiing","skiing");
  assert.deepEqual(v_skiing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · New Hampshire at Stonehill | T, 1-1",
 "Final Aug 16 Women's · New Hampshire at Siena | L, 0-1",
 "Final Aug 23 Women's · New Hampshire vs Dartmouth | T, 0-0",
 "Final Aug 27 Women's · New Hampshire vs Rhode Island | W, 1-0",
 "Final Aug 30 Women's · New Hampshire at Northeastern | W, 4-1",
 "Final Sep 2 Women's · New Hampshire at Merrimack | W, 4-2",
 "Final Sep 6 Women's · New Hampshire vs Yale | L, 0-1",
 "Final Sep 13 Women's · New Hampshire vs Harvard | L, 0-6",
 "Final Sep 20 Women's · New Hampshire at NJIT | L, 2-3",
 "Final Sep 27 Women's · New Hampshire at UMBC | L, 1-2",
 "Final Oct 1 Women's · New Hampshire vs Bryant | L, 0-2",
 "Final Oct 4 Women's · New Hampshire at Binghamton | L, 1-2",
 "Final Oct 18 Women's · New Hampshire vs Maine | L, 1-2",
 "Final Oct 22 Women's · New Hampshire at UMass Lowell | W, 4-3",
 "Upcoming Oct 25, 2:00 PM Women's · New Hampshire vs Vermont | ",
 "Upcoming Nov 1, 2:00 PM Women's · New Hampshire vs UAlbany | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · New Hampshire at Colgate | L, 0-1",
 "Final Aug 23 Men's · New Hampshire at Syracuse | W, 3-2",
 "Final Aug 27 Men's · New Hampshire vs St. John's | W, 2-1",
 "Final Sep 4 Men's · New Hampshire at Boston University | T, 0-0",
 "Final Sep 8 Men's · New Hampshire vs New Haven | W, 6-2",
 "Final Sep 12 Men's · New Hampshire at UMass | W, 1-0",
 "Final Sep 15 Men's · New Hampshire vs Harvard | W, 2-0",
 "Final Sep 19 Men's · New Hampshire at Portland | L, 0-2",
 "Final Sep 26 Men's · New Hampshire at UAlbany | L, 0-2",
 "Final Sep 29 Men's · New Hampshire vs Dartmouth | T, 0-0",
 "Final Oct 3 Men's · New Hampshire vs Binghamton | T, 1-1",
 "Final Oct 10 Men's · New Hampshire at NJIT | L, 3-6",
 "Final Oct 17 Men's · New Hampshire at Vermont | L, 2-3",
 "Upcoming Oct 24, 3:00 PM Men's · New Hampshire vs UMBC | ",
 "Upcoming Oct 30, 6:00 PM Men's · New Hampshire vs UMass Lowell | ",
 "Upcoming Nov 3, 7:00 PM Men's · New Hampshire at Bryant | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · New Hampshire vs Vermont | W, 164-136",
 "Today Oct 22, 5:00 PM Women's · New Hampshire at CCSU Dual Meet | ",
 "Upcoming Oct 31, 11:00 AM Women's · New Hampshire at Siena | ",
 "Upcoming Oct 31, 11:00 AM Women's · New Hampshire at Merrimack | ",
 "Upcoming Nov 19, 5:00 PM Women's · New Hampshire at Harold Anderson Invitational | ",
 "Upcoming Dec 12, 12:00 PM Women's · New Hampshire vs Northeastern | ",
 "Upcoming Jan 4 Women's · New Hampshire at Puerto Rico Training Camp | ",
 "Upcoming Jan 15, 2:00 PM Women's · New Hampshire at Rhode Island | ",
 "Upcoming Jan 16, 11:00 AM Women's · New Hampshire at UConn | ",
 "Upcoming Jan 22, 5:00 PM Women's · New Hampshire vs Maine | ",
 "Upcoming Feb 24 Women's · New Hampshire at America East Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 New Hampshire vs New Haven | W, 3-2",
 "Final Aug 29 New Hampshire vs Saint Peter's | W, 3-0",
 "Final Aug 29 New Hampshire vs Providence College | W, 3-1",
 "Final Sep 4 New Hampshire vs Bucknell | W, 3-0",
 "Final Sep 4 New Hampshire vs Stonehill | W, 3-0",
 "Final Sep 5 New Hampshire at Boston College | L, 1-3",
 "Final Sep 8 New Hampshire at Merrimack | W, 3-1",
 "Final Sep 11 New Hampshire vs FDU | W, 3-1",
 "Final Sep 11 New Hampshire at UConn | L, 0-3",
 "Final Sep 12 New Hampshire vs Yale | L, 0-3",
 "Final Sep 18 New Hampshire vs Furman | W, 3-1",
 "Final Sep 18 New Hampshire at Clemson | W, 3-0",
 "Final Sep 23 New Hampshire at Dartmouth | L, 0-3",
 "Final Sep 27 New Hampshire vs Binghamton | W, 3-0",
 "Final Sep 30 New Hampshire vs Stonehill | W, 3-0",
 "Final Oct 4 New Hampshire at UAlbany | W, 3-0",
 "Final Oct 9 New Hampshire vs Bryant | L, 2-3",
 "Final Oct 11 New Hampshire vs NJIT | W, 3-0",
 "Final Oct 18 New Hampshire at UMBC | L, 0-3",
 "Upcoming Oct 25, 1:00 PM New Hampshire at Binghamton | ",
 "Upcoming Nov 1, 1:00 PM New Hampshire at NJIT | ",
 "Upcoming Nov 6, 7:00 PM New Hampshire vs UMBC | ",
 "Upcoming Nov 13, 7:00 PM New Hampshire at Bryant | ",
 "Upcoming Nov 15, 1:00 PM New Hampshire vs UAlbany | ",
 "Upcoming Nov 20 New Hampshire at America East Semifinal | ",
 "Upcoming Nov 22 New Hampshire at America East Final | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_skiing,"Skiing skiing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("New Hampshire module checks passed");
