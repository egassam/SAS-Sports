import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {binghamtonSchool} from '../src/schools/binghamton.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='binghamton');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,binghamtonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/binghamton-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit binghamtonbearcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['binghamton'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',binghamtonSchool.scheduleUrls],['roster',binghamtonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('binghamton|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'binghamtonbearcats.com',`${key} must stay on binghamtonbearcats.com`);
  }
}
const parity={"Baseball":{"schedule":["https://binghamtonbearcats.com/sports/baseball/schedule"],"roster":["https://binghamtonbearcats.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://binghamtonbearcats.com/sports/mens-basketball/schedule","https://binghamtonbearcats.com/sports/womens-basketball/schedule"],"roster":["https://binghamtonbearcats.com/sports/mens-basketball/roster","https://binghamtonbearcats.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://binghamtonbearcats.com/sports/womens-cross-country/schedule","https://binghamtonbearcats.com/sports/mens-cross-country/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-cross-country/roster","https://binghamtonbearcats.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://binghamtonbearcats.com/sports/mens-golf/schedule"],"roster":["https://binghamtonbearcats.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://binghamtonbearcats.com/sports/womens-lacrosse/schedule","https://binghamtonbearcats.com/sports/mens-lacrosse/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-lacrosse/roster","https://binghamtonbearcats.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://binghamtonbearcats.com/sports/womens-soccer/schedule","https://binghamtonbearcats.com/sports/mens-soccer/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-soccer/roster","https://binghamtonbearcats.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://binghamtonbearcats.com/sports/softball/schedule"],"roster":["https://binghamtonbearcats.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://binghamtonbearcats.com/sports/womens-swimming-and-diving/schedule","https://binghamtonbearcats.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-swimming-and-diving/roster","https://binghamtonbearcats.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://binghamtonbearcats.com/sports/womens-tennis/schedule","https://binghamtonbearcats.com/sports/mens-tennis/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-tennis/roster","https://binghamtonbearcats.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://binghamtonbearcats.com/sports/womens-track-and-field/schedule","https://binghamtonbearcats.com/sports/mens-track-and-field/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-track-and-field/roster","https://binghamtonbearcats.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://binghamtonbearcats.com/sports/womens-volleyball/schedule"],"roster":["https://binghamtonbearcats.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://binghamtonbearcats.com/sports/wrestling/schedule"],"roster":["https://binghamtonbearcats.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'binghamton|"+sport+"':"),`${sport} routes must live in the Binghamton module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://binghamtonbearcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.binghamtonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=binghamton)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 3:00 PM Binghamton at Georgia | ",
 "Upcoming Feb 20, 2:00 PM Binghamton at Georgia | ",
 "Upcoming Feb 21, 1:00 PM Binghamton at Georgia | ",
 "Upcoming Feb 26 Binghamton at UNC Greensboro | ",
 "Upcoming Feb 27 Binghamton at UNC Greensboro | ",
 "Upcoming Feb 28 Binghamton at UNC Greensboro | ",
 "Upcoming Mar 2, 3:00 PM Binghamton vs Lafayette College | ",
 "Upcoming Mar 5 Binghamton at Liberty | ",
 "Upcoming Mar 6 Binghamton at Liberty | ",
 "Upcoming Mar 7 Binghamton at Liberty | ",
 "Upcoming Mar 9, 3:00 PM Binghamton vs St. Bonaventure | ",
 "Upcoming Mar 12 Binghamton at Radford | ",
 "Upcoming Mar 13 Binghamton at Radford | ",
 "Upcoming Mar 14 Binghamton at Radford | ",
 "Upcoming Mar 16 Binghamton at St. Bonaventure | ",
 "Upcoming Mar 19 Binghamton at New Jersey Institute of Technology | ",
 "Upcoming Mar 20 Binghamton at New Jersey Institute of Technology | ",
 "Upcoming Mar 21 Binghamton at New Jersey Institute of Technology | ",
 "Upcoming Mar 23, 3:00 PM Binghamton vs Akron | ",
 "Upcoming Mar 26, 3:00 PM Binghamton vs UMBC | ",
 "Upcoming Mar 27, 2:00 PM Binghamton vs UMBC | ",
 "Upcoming Mar 28, 1:00 PM Binghamton vs UMBC | ",
 "Upcoming Mar 30, 3:00 PM Binghamton vs Le Moyne College | ",
 "Upcoming Apr 2 Binghamton at Seton Hall | ",
 "Upcoming Apr 3 Binghamton at Seton Hall | ",
 "Upcoming Apr 4 Binghamton at Seton Hall | ",
 "Upcoming Apr 6, 3:00 PM Binghamton vs Marist | ",
 "Upcoming Apr 9, 3:00 PM Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Apr 10, 2:00 PM Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Apr 11, 1:00 PM Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Apr 13 Binghamton at Cornell | ",
 "Upcoming Apr 16 Binghamton at UMBC | ",
 "Upcoming Apr 17 Binghamton at UMBC | ",
 "Upcoming Apr 18 Binghamton at UMBC | ",
 "Upcoming Apr 20, 6:30 PM Binghamton vs Cornell | ",
 "Upcoming Apr 23 Binghamton at Maine | ",
 "Upcoming Apr 24 Binghamton at Maine | ",
 "Upcoming Apr 25 Binghamton at Maine | ",
 "Upcoming Apr 27, 6:30 PM Binghamton vs Cornell | ",
 "Upcoming Apr 30, 6:00 PM Binghamton vs University at Albany | ",
 "Upcoming May 1, 2:00 PM Binghamton vs University at Albany | ",
 "Upcoming May 2, 1:00 PM Binghamton vs University at Albany | ",
 "Upcoming May 4 Binghamton at Le Moyne College | ",
 "Upcoming May 7, 6:00 PM Binghamton vs Massachusetts Lowell | ",
 "Upcoming May 8, 2:00 PM Binghamton vs Massachusetts Lowell | ",
 "Upcoming May 9, 1:00 PM Binghamton vs Massachusetts Lowell | ",
 "Upcoming May 14 Binghamton at Bryant | ",
 "Upcoming May 15 Binghamton at Bryant | ",
 "Upcoming May 16 Binghamton at Bryant | ",
 "Upcoming May 20 Binghamton at Mount St. Mary's (Md.) | ",
 "Upcoming May 22, 2:00 PM Binghamton vs Mount St. Mary's (Md.) | ",
 "Upcoming May 26 Binghamton at America East Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Binghamton at Northwestern | ",
 "Upcoming Nov 5, 7:00 PM Men's · Binghamton at Saint Peter's | ",
 "Upcoming Nov 8, 4:00 PM Men's · Binghamton vs Rider | ",
 "Upcoming Nov 11, 7:30 PM Men's · Binghamton at Misericordia | ",
 "Upcoming Nov 14, 7:30 PM Men's · Binghamton at Duquesne | ",
 "Upcoming Nov 18, 7:00 PM Men's · Binghamton at Lafayette College | ",
 "Upcoming Nov 21, 3:30 PM Men's · Binghamton vs Army | ",
 "Upcoming Nov 24, 7:00 PM Men's · Binghamton at Lehigh | ",
 "Upcoming Nov 30, 7:00 PM Men's · Binghamton at FDU | ",
 "Upcoming Dec 3, 7:00 PM Men's · Binghamton at Le Moyne College | ",
 "Upcoming Dec 5, 3:30 PM Men's · Binghamton vs Alfred State College | ",
 "Upcoming Dec 8, 7:30 PM Men's · Binghamton at Delaware State | ",
 "Upcoming Dec 18, 6:30 PM Men's · Binghamton at Niagara | ",
 "Upcoming Dec 22, 4:00 PM Men's · Binghamton at Syracuse | ",
 "Upcoming Dec 29, 6:07 PM Men's · Binghamton vs Marywood | ",
 "Upcoming Jan 2, 2:00 PM Men's · Binghamton vs Vermont | ",
 "Upcoming Jan 9, 4:00 PM Men's · Binghamton at University at Albany | ",
 "Upcoming Jan 14, 6:00 PM Men's · Binghamton at Massachusetts Lowell | ",
 "Upcoming Jan 18, 2:00 PM Men's · Binghamton at New Jersey Institute of Technology | ",
 "Upcoming Jan 21, 6:07 PM Men's · Binghamton vs Maine | ",
 "Upcoming Jan 23, 2:00 PM Men's · Binghamton vs New Hampshire | ",
 "Upcoming Jan 28, 6:07 PM Men's · Binghamton vs UMBC | ",
 "Upcoming Jan 30, 4:00 PM Men's · Binghamton at Bryant | ",
 "Upcoming Feb 6, 2:00 PM Men's · Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Feb 11, 6:00 PM Men's · Binghamton at Vermont | ",
 "Upcoming Feb 13, 2:00 PM Men's · Binghamton vs Massachusetts Lowell | ",
 "Upcoming Feb 17, 7:00 PM Men's · Binghamton vs University at Albany | ",
 "Upcoming Feb 20, 2:00 PM Men's · Binghamton vs Bryant | ",
 "Upcoming Feb 25, 6:00 PM Men's · Binghamton at Maine | ",
 "Upcoming Feb 27 Men's · Binghamton at New Hampshire | ",
 "Upcoming Mar 2, 6:00 PM Men's · Binghamton at UMBC | ",
 "Upcoming Mar 6 Men's · Binghamton at America East Quarterfinals | ",
 "Upcoming Mar 9 Men's · Binghamton at America East Semifinals | ",
 "Upcoming Mar 13 Men's · Binghamton vs America East Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Binghamton at Monmouth | ",
 "Upcoming Nov 6, 7:00 PM Women's · Binghamton at Fairfield | ",
 "Upcoming Nov 8, 4:00 PM Women's · Binghamton at Siena | ",
 "Upcoming Nov 11, 6:00 PM Women's · Binghamton at Colgate | ",
 "Upcoming Nov 14, 1:30 PM Women's · Binghamton at St. Bonaventure | ",
 "Upcoming Nov 18, 7:00 PM Women's · Binghamton at South Florida | ",
 "Upcoming Nov 21, 1:00 PM Women's · Binghamton vs Daemen | ",
 "Upcoming Nov 23, 7:00 PM Women's · Binghamton at Marist | ",
 "Upcoming Nov 26, 3:00 PM Women's · Binghamton vs UTSA | ",
 "Upcoming Nov 27, 1:30 PM Women's · Binghamton vs Providence College | ",
 "Upcoming Dec 2, 3:00 PM Women's · Binghamton at Army | ",
 "Upcoming Dec 5, 1:00 PM Women's · Binghamton vs Massachusetts | ",
 "Upcoming Dec 8 Women's · Binghamton at Temple | ",
 "Upcoming Dec 19 Women's · Binghamton at Pennsylvania | ",
 "Upcoming Dec 21, 11:00 AM Women's · Binghamton at Saint Francis | ",
 "Upcoming Dec 31, 1:00 PM Women's · Binghamton vs Maryland Baltimore County | ",
 "Upcoming Jan 2, 2:00 PM Women's · Binghamton at Vermont | ",
 "Upcoming Jan 9, 1:00 PM Women's · Binghamton at University at Albany | ",
 "Upcoming Jan 14, 11:00 AM Women's · Binghamton vs Massachusetts Lowell | ",
 "Upcoming Jan 16, 2:00 PM Women's · Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Jan 21, 6:00 PM Women's · Binghamton at Maine | ",
 "Upcoming Jan 23, 1:00 PM Women's · Binghamton at New Hampshire | ",
 "Upcoming Jan 28, 6:00 PM Women's · Binghamton at Maryland Baltimore County | ",
 "Upcoming Jan 30, 2:00 PM Women's · Binghamton vs Bryant | ",
 "Upcoming Feb 6, 3:00 PM Women's · Binghamton at New Jersey Institute of Technology | ",
 "Upcoming Feb 11, 6:07 PM Women's · Binghamton vs Vermont | ",
 "Upcoming Feb 13, 1:00 PM Women's · Binghamton at Massachusetts Lowell | ",
 "Upcoming Feb 18, 6:07 PM Women's · Binghamton vs University at Albany | ",
 "Upcoming Feb 20, 2:00 PM Women's · Binghamton at Bryant | ",
 "Upcoming Feb 25, 6:07 PM Women's · Binghamton vs Maine | ",
 "Upcoming Feb 27, 2:00 PM Women's · Binghamton vs New Hampshire | ",
 "Upcoming Mar 4 Women's · Binghamton at America East Quarterfinals | ",
 "Upcoming Mar 8 Women's · Binghamton at America East Semifinals | ",
 "Upcoming Mar 12 Women's · Binghamton at America East Final | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Binghamton at Colgate/ Harry Lang Invitational | 4 runners",
 "Final Sep 11 Women's · Binghamton at Iona Meet of Champions | 1st of 6",
 "Final Oct 16 Women's · Binghamton at UAlbany Invitational | 1st of 3",
 "Upcoming Oct 30 Women's · Binghamton at America East Championships | ",
 "Upcoming Nov 13 Women's · Binghamton at NCAA Northeast Regional Meet | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Binghamton at Colgate/ Harry Lang Invitational | 4 runners",
 "Final Sep 11 Men's · Binghamton at Iona Meet of Champions | 1st of 4",
 "Final Oct 16 Men's · Binghamton at UAlbany Invitational | 1st of 3",
 "Upcoming Oct 30 Men's · Binghamton at America East Championships | ",
 "Upcoming Nov 13 Men's · Binghamton at NCAA Northeast Regional Meet | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Binghamton at Alex Lagowitz Memorial | 11th of 14",
 "Final Sep 19 Binghamton at The Goat | 12th of 15",
 "Final Sep 27 Binghamton at Central New York Challenge Cup | 2nd of 3",
 "Final Oct 4 Binghamton at Matthews Auto Collegiate Golf Invitational | 8th of 13",
 "Final Oct 11 Binghamton at Bucknell Invitational | T11th of 18"
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Binghamton vs Lehigh | W, 3-0",
 "Final Aug 16 Women's · Binghamton vs Marist | W, 2-0",
 "Final Aug 23 Women's · Binghamton at Le Moyne College | W, 4-0",
 "Final Aug 27 Women's · Binghamton vs Siena | T, 0-0",
 "Final Aug 30 Women's · Binghamton at University at Buffalo | T, 0-0",
 "Final Sep 3 Women's · Binghamton vs Syracuse | W, 1-0",
 "Final Sep 6 Women's · Binghamton at Maryland | L, 1-2",
 "Final Sep 13 Women's · Binghamton vs Cornell | L, 0-1",
 "Final Sep 20 Women's · Binghamton vs Massachusetts Lowell | T, 1-1",
 "Final Sep 27 Women's · Binghamton vs Bryant | W, 3-0",
 "Final Oct 1 Women's · Binghamton at University at Albany | W, 6-0",
 "Final Oct 4 Women's · Binghamton vs New Hampshire | W, 2-1",
 "Final Oct 15 Women's · Binghamton at UMBC | T, 0-0",
 "Final Oct 22 Women's · Binghamton vs New Jersey Institute of Technology | W, 1-0",
 "Upcoming Oct 25 Women's · Binghamton at Maine | ",
 "Upcoming Nov 1, 1:00 PM Women's · Binghamton at Vermont | ",
 "Upcoming Nov 5 Women's · Binghamton at America East Quarterfinals | ",
 "Upcoming Nov 8 Women's · Binghamton at America East Semifinals | ",
 "Upcoming Nov 15 Women's · Binghamton at America East Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Binghamton at Mount St. Mary's (Md.) | T, 0-0",
 "Final Aug 23 Men's · Binghamton vs George Washington | L, 0-3",
 "Final Aug 26 Men's · Binghamton at Lafayette College | L, 2-3",
 "Final Sep 2 Men's · Binghamton vs Colgate | T, 0-0",
 "Final Sep 5 Men's · Binghamton vs Central Connecticut State | W, 1-0",
 "Final Sep 12 Men's · Binghamton vs Le Moyne College | T, 1-1",
 "Final Sep 19 Men's · Binghamton at Hofstra | L, 0-2",
 "Final Sep 22 Men's · Binghamton at Cornell | L, 1-3",
 "Final Sep 26 Men's · Binghamton at New Jersey Institute of Technology | L, 1-2",
 "Final Oct 3 Men's · Binghamton at New Hampshire | T, 1-1",
 "Final Oct 6 Men's · Binghamton vs St. Bonaventure | L, 0-2",
 "Final Oct 10 Men's · Binghamton vs Massachusetts Lowell | W, 2-1",
 "Final Oct 17 Men's · Binghamton vs Maryland Baltimore County | T, 1-1",
 "Upcoming Oct 25, 4:00 PM Men's · Binghamton at Bryant | ",
 "Upcoming Oct 30, 4:00 PM Men's · Binghamton at Vermont | ",
 "Upcoming Nov 3, 6:07 PM Men's · Binghamton vs University at Albany | ",
 "Upcoming Nov 7 Men's · Binghamton at America East Quarterfinals | ",
 "Upcoming Nov 11 Men's · Binghamton at America East Semifinals | ",
 "Upcoming Nov 15 Men's · Binghamton vs America East Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 18 Women's · Binghamton vs Green White Meet | Completed",
 "Final Sep 26 Women's · Binghamton at Le Moyne College | Completed",
 "Final Sep 26 Women's · Binghamton vs Stonehill College | Completed",
 "Final Oct 16 Women's · Binghamton vs Bryant | W, 206-147",
 "Upcoming Oct 31 Women's · Binghamton at Canisius | ",
 "Upcoming Nov 6, 5:00 PM Women's · Binghamton vs Central Connecticut State | ",
 "Upcoming Nov 19 Women's · Binghamton at Brown Invitational | ",
 "Upcoming Jan 23, 1:00 PM Women's · Binghamton vs Marist | ",
 "Upcoming Jan 30 Women's · Binghamton vs Le Moyne College | ",
 "Upcoming Feb 24 Women's · Binghamton at America East Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 18 Men's · Binghamton vs Green White Meet | Completed",
 "Final Sep 26 Men's · Binghamton at Le Moyne College | Completed",
 "Final Oct 16 Men's · Binghamton vs Bryant | W, 182-171",
 "Upcoming Oct 31 Men's · Binghamton at Canisius | ",
 "Upcoming Nov 7 Men's · Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Nov 19 Men's · Binghamton at Brown Invitational | ",
 "Upcoming Jan 23, 1:00 PM Men's · Binghamton vs Marist | ",
 "Upcoming Jan 30 Men's · Binghamton vs Le Moyne College | ",
 "Upcoming Feb 24 Men's · Binghamton at America East Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Binghamton at Carousel Classic Invitational | Completed",
 "Final Sep 25 Women's · Binghamton at NateRentals.com Binghamton Championships | Completed",
 "Final Oct 8 Women's · Binghamton at ITA New England Regionals | Completed",
 "Today Oct 23 Women's · Binghamton at NateRentals.com Hidden Duals | ",
 "Upcoming Nov 5 Women's · Binghamton at ITA Masters Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Binghamton at Carousel Classic Invitational | Completed",
 "Final Sep 25 Men's · Binghamton at NateRentals.com Binghamton Championships | Completed",
 "Final Oct 8 Men's · Binghamton at ITA New England Regional | Completed",
 "Today Oct 23 Men's · Binghamton at NateRentals.com Hidden Duals | ",
 "Upcoming Nov 6 Men's · Binghamton at Navy | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Binghamton at Greg Page Relays | ",
 "Upcoming Dec 5 Women's · Binghamton at Colyear-Danville Season Opener | ",
 "Upcoming Jan 16, 10:00 AM Women's · Binghamton at Upstate Challenge | ",
 "Upcoming Jan 23, 10:00 AM Women's · Binghamton at Gulden Invitational | ",
 "Upcoming Jan 29 Women's · Binghamton at National Open | ",
 "Upcoming Jan 29 Women's · Binghamton at Penn Invitational | ",
 "Upcoming Feb 6, 10:00 AM Women's · Binghamton at Sykes & Sabock Challenge | ",
 "Upcoming Feb 12 Women's · Binghamton at Valentine Invitational | ",
 "Upcoming Feb 13, 10:00 AM Women's · Binghamton at Kane Invitational | ",
 "Upcoming Feb 20, 10:00 AM Women's · Binghamton at Denault Invitational | ",
 "Upcoming Feb 26 Women's · Binghamton at America East Indoor Championships | ",
 "Upcoming Mar 12 Women's · Binghamton at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Women's · Binghamton at Raleigh Relays | ",
 "Upcoming Mar 27 Women's · Binghamton at Bucknell & UAlbany Tri-Meet | ",
 "Upcoming Mar 31 Women's · Binghamton at Texas Relays | ",
 "Upcoming Apr 2 Women's · Binghamton at Dalton Ebanks Invitational | ",
 "Upcoming Apr 10, 10:00 AM Women's · Binghamton at Big Red Invitational | ",
 "Upcoming Apr 10 Women's · Binghamton at Bison Outdoor Challenge | ",
 "Upcoming Apr 16 Women's · Binghamton at Virginia Challenge | ",
 "Upcoming Apr 16 Women's · Binghamton at Bobbi Palma Spring Classic | ",
 "Upcoming Apr 22 Women's · Binghamton at PENN Relays | ",
 "Upcoming May 1 Women's · Binghamton at Gary Truce Invitational | ",
 "Upcoming May 8 Women's · Binghamton at America East Outdoor Championships | ",
 "Upcoming May 26 Women's · Binghamton at NCAA East Region Meet | ",
 "Upcoming Jun 9 Women's · Binghamton at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · Binghamton at Greg Page Relays | ",
 "Upcoming Dec 5 Men's · Binghamton at Colyear-Danville Season Opener | ",
 "Upcoming Jan 16, 10:00 AM Men's · Binghamton at Upstate Challenge | ",
 "Upcoming Jan 23, 10:00 AM Men's · Binghamton at Gulden Invitational | ",
 "Upcoming Jan 29 Men's · Binghamton at National Open | ",
 "Upcoming Jan 29 Men's · Binghamton at Penn Invitational | ",
 "Upcoming Feb 6, 10:00 AM Men's · Binghamton at Sykes & Sabock Challenge | ",
 "Upcoming Feb 12 Men's · Binghamton at Valentine Invitational | ",
 "Upcoming Feb 13, 10:00 AM Men's · Binghamton at Kane Invitational | ",
 "Upcoming Feb 20, 10:00 AM Men's · Binghamton at Denault Invitational | ",
 "Upcoming Feb 26 Men's · Binghamton at America East Indoor Championships | ",
 "Upcoming Mar 12 Men's · Binghamton at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Men's · Binghamton at Raleigh Relays | ",
 "Upcoming Mar 27 Men's · Binghamton at Bucknell & UAlbany Tri-Meet | ",
 "Upcoming Mar 31 Men's · Binghamton at Texas Relays | ",
 "Upcoming Apr 2 Men's · Binghamton at Dalton Ebanks Invitational | ",
 "Upcoming Apr 10, 10:00 AM Men's · Binghamton at Big Red Invitational | ",
 "Upcoming Apr 10 Men's · Binghamton at Bison Outdoor Challenge | ",
 "Upcoming Apr 16 Men's · Binghamton at Virginia Challenge | ",
 "Upcoming Apr 16 Men's · Binghamton at Bobbi Palma Spring Classic | ",
 "Upcoming Apr 22 Men's · Binghamton at PENN Relays | ",
 "Upcoming May 1 Men's · Binghamton at Gary Truce Invitational | ",
 "Upcoming May 8 Men's · Binghamton at America East Outdoor Championships | ",
 "Upcoming May 26 Men's · Binghamton at NCAA East Region Meet | ",
 "Upcoming Jun 9 Men's · Binghamton at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Binghamton vs Bradley | L, 0-3",
 "Final Aug 28 Binghamton vs Oakland | L, 0-3",
 "Final Aug 29 Binghamton at Toledo | L, 0-3",
 "Final Sep 4 Binghamton vs Central Connecticut State | W, 3-1",
 "Final Sep 5 Binghamton at Sacred Heart | W, 3-2",
 "Final Sep 5 Binghamton vs Le Moyne College | W, 3-0",
 "Final Sep 10 Binghamton vs Temple | W, 3-2",
 "Final Sep 11 Binghamton vs Cornell | W, 3-2",
 "Final Sep 12 Binghamton vs New Haven | W, 3-0",
 "Final Sep 18 Binghamton at Dartmouth College | W, 3-1",
 "Final Sep 19 Binghamton vs Boston College | L, 0-3",
 "Final Sep 20 Binghamton vs Quinnipiac | W, 3-2",
 "Final Sep 27 Binghamton at New Hampshire | L, 0-3",
 "Final Oct 3 Binghamton vs Bryant | L, 2-3",
 "Final Oct 9 Binghamton vs Maryland Baltimore County | L, 0-3",
 "Final Oct 11 Binghamton vs University at Albany | W, 3-2",
 "Final Oct 16 Binghamton at New Jersey Institute of Technology | W, 3-0",
 "Final Oct 20 Binghamton at Fairleigh Dickinson | W, 3-0",
 "Upcoming Oct 25, 1:00 PM Binghamton vs New Hampshire | ",
 "Upcoming Oct 28, 6:00 PM Binghamton at Colgate | ",
 "Upcoming Nov 1, 1:00 PM Binghamton at Bryant | ",
 "Upcoming Nov 6, 6:00 PM Binghamton at University at Albany | ",
 "Upcoming Nov 8 Binghamton vs New Jersey Institute of Technology | ",
 "Upcoming Nov 15, 1:00 PM Binghamton at Maryland Baltimore County | ",
 "Upcoming Nov 20 Binghamton at America East Volleyball Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Binghamton vs Princeton Open | ",
 "Upcoming Nov 8, 9:00 AM Binghamton at Journeymen Collegiate Classic | ",
 "Upcoming Nov 20 Binghamton at University at Buffalo | ",
 "Upcoming Nov 22, 9:00 AM Binghamton at Big Red Invitational | ",
 "Upcoming Dec 4, 7:00 PM Binghamton vs Bloomsburg | ",
 "Upcoming Dec 20, 11:00 AM Binghamton at Northern Colorado | ",
 "Upcoming Dec 20, 1:00 PM Binghamton at Oregon State | ",
 "Upcoming Dec 20, 3:00 PM Binghamton at Penn State | ",
 "Upcoming Jan 2 Binghamton at Southern Scuffle, Day One | ",
 "Upcoming Jan 3 Binghamton at Southern Scuffle, Day Two | ",
 "Upcoming Jan 8, 9:00 AM Binghamton vs David H. Lehman '68 F&M Open | ",
 "Upcoming Jan 15, 7:00 PM Binghamton at Franklin and Marshall College | ",
 "Upcoming Jan 17 Binghamton at Drexel | ",
 "Upcoming Jan 24 Binghamton at Brown | ",
 "Upcoming Jan 24 Binghamton at Harvard | ",
 "Upcoming Jan 30, 5:30 PM Binghamton vs Bucknell | ",
 "Upcoming Feb 6, 5:30 PM Binghamton vs Sacred Heart | ",
 "Upcoming Feb 13 Binghamton at Hofstra | ",
 "Upcoming Feb 13 Binghamton at LIU | ",
 "Upcoming Feb 19, 6:00 PM Binghamton vs Cornell | ",
 "Upcoming Feb 21 Binghamton vs Patriot Last Chance Open | ",
 "Upcoming Mar 5 Binghamton at EIWA Championships, Day One | ",
 "Upcoming Mar 6 Binghamton at EIWA Championships, Day Two | ",
 "Upcoming Mar 18 Binghamton at NCAA Wrestling Championships, Day One | ",
 "Upcoming Mar 19 Binghamton at NCAA Wrestling Championships, Day Two | ",
 "Upcoming Mar 20 Binghamton at NCAA Wrestling Championships, Day Three | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Binghamton module checks passed");
