import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setonHallSchool} from '../src/schools/seton-hall.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='seton-hall');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,setonHallHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/seton-hall-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit shupirates.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['seton-hall'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',setonHallSchool.scheduleUrls],['roster',setonHallSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('seton-hall|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'shupirates.com',`${key} must stay on shupirates.com`);
  }
}
const parity={"Baseball":{"schedule":["https://shupirates.com/sports/baseball/schedule"],"roster":["https://shupirates.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://shupirates.com/sports/mens-basketball/schedule","https://shupirates.com/sports/womens-basketball/schedule"],"roster":["https://shupirates.com/sports/mens-basketball/roster","https://shupirates.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://shupirates.com/sports/womens-cross-country/schedule","https://shupirates.com/sports/mens-cross-country/schedule"],"roster":["https://shupirates.com/sports/womens-cross-country/roster","https://shupirates.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://shupirates.com/sports/womens-golf/schedule","https://shupirates.com/sports/mens-golf/schedule"],"roster":["https://shupirates.com/sports/womens-golf/roster","https://shupirates.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://shupirates.com/sports/womens-soccer/schedule","https://shupirates.com/sports/mens-soccer/schedule"],"roster":["https://shupirates.com/sports/womens-soccer/roster","https://shupirates.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://shupirates.com/sports/softball/schedule"],"roster":["https://shupirates.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://shupirates.com/sports/womens-swimming-and-diving/schedule","https://shupirates.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://shupirates.com/sports/womens-swimming-and-diving/roster","https://shupirates.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://shupirates.com/sports/womens-tennis/schedule"],"roster":["https://shupirates.com/sports/womens-tennis/roster"],"combined":false},"Volleyball":{"schedule":["https://shupirates.com/sports/womens-volleyball/schedule"],"roster":["https://shupirates.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'seton-hall|"+sport+"':"),`${sport} routes must live in the Seton Hall module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://shupirates.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.setonHallHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=seton-hall)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 7:00 PM Men's · Seton Hall at Monmouth (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Seton Hall vs Saint Peter's | ",
 "Upcoming Nov 5, 6:30 PM Men's · Seton Hall vs LIU | ",
 "Upcoming Nov 9 Men's · Seton Hall vs Charlotte | ",
 "Upcoming Nov 13 Men's · Seton Hall at Alabama | ",
 "Upcoming Nov 19, 8:30 PM Men's · Seton Hall vs Wisconsin | ",
 "Upcoming Nov 20 Men's · Seton Hall vs Murray State/NC State | ",
 "Upcoming Nov 24, 7:00 PM Men's · Seton Hall vs New Hampshire | ",
 "Upcoming Nov 28, 12:00 PM Men's · Seton Hall vs Siena | ",
 "Upcoming Dec 4, 7:00 PM Men's · Seton Hall vs Kansas State | ",
 "Upcoming Dec 7, 7:00 PM Men's · Seton Hall vs NJIT | ",
 "Upcoming Dec 12, 4:30 PM Men's · Seton Hall at Rutgers | ",
 "Upcoming Dec 15, 7:00 PM Men's · Seton Hall vs UNC Greensboro | ",
 "Upcoming Dec 19, 12:00 PM Men's · Seton Hall at Georgetown | ",
 "Upcoming Dec 23, 8:00 PM Men's · Seton Hall vs St. John's | ",
 "Upcoming Dec 30, 4:00 PM Men's · Seton Hall at DePaul | ",
 "Upcoming Jan 2, 12:00 PM Men's · Seton Hall at Xavier | ",
 "Upcoming Jan 6, 6:00 PM Men's · Seton Hall vs Creighton | ",
 "Upcoming Jan 9, 7:00 PM Men's · Seton Hall vs UConn | ",
 "Upcoming Jan 12, 6:00 PM Men's · Seton Hall at Villanova | ",
 "Upcoming Jan 15, 8:00 PM Men's · Seton Hall vs Georgetown | ",
 "Upcoming Jan 23, 12:00 PM Men's · Seton Hall at St. John's | ",
 "Upcoming Jan 27, 6:30 PM Men's · Seton Hall vs Marquette | ",
 "Upcoming Jan 30, 12:00 PM Men's · Seton Hall at Providence | ",
 "Upcoming Feb 3, 6:30 PM Men's · Seton Hall vs Butler | ",
 "Upcoming Feb 7, 2:30 PM Men's · Seton Hall vs DePaul | ",
 "Upcoming Feb 10, 8:00 PM Men's · Seton Hall vs Villanova | ",
 "Upcoming Feb 14, 3:00 PM Men's · Seton Hall at Creighton | ",
 "Upcoming Feb 17, 8:00 PM Men's · Seton Hall at UConn | ",
 "Upcoming Feb 20, 8:30 PM Men's · Seton Hall vs Providence | ",
 "Upcoming Feb 23, 9:00 PM Men's · Seton Hall at Marquette | ",
 "Upcoming Feb 28, 12:00 PM Men's · Seton Hall vs Xavier | ",
 "Upcoming Mar 6, 1:30 PM Men's · Seton Hall at Butler | ",
 "Upcoming Mar 10 Men's · Seton Hall at BIG EAST Tournament First Round | ",
 "Upcoming Mar 11 Men's · Seton Hall at BIG EAST Tournament Quarterfinal | ",
 "Upcoming Mar 12 Men's · Seton Hall at BIG EAST Tournament Semifinal | ",
 "Upcoming Mar 13 Men's · Seton Hall at BIG EAST Tournament Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Women's · Seton Hall vs Jefferson (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Women's · Seton Hall vs Mercyhurst | ",
 "Upcoming Nov 6, 11:30 AM Women's · Seton Hall vs Indiana State | ",
 "Upcoming Nov 12, 7:00 PM Women's · Seton Hall vs Fairfield | ",
 "Upcoming Nov 15, 1:00 PM Women's · Seton Hall vs NC State | ",
 "Upcoming Nov 17, 7:00 PM Women's · Seton Hall at Auburn | ",
 "Upcoming Nov 20, 8:00 PM Women's · Seton Hall at Connecticut | ",
 "Upcoming Nov 23, 7:00 PM Women's · Seton Hall vs Rider | ",
 "Upcoming Nov 27, 8:00 PM Women's · Seton Hall vs USF | ",
 "Upcoming Nov 28, 8:00 PM Women's · Seton Hall vs Baylor or Penn State | ",
 "Upcoming Dec 2, 7:00 PM Women's · Seton Hall vs Princeton | ",
 "Upcoming Dec 4, 7:00 PM Women's · Seton Hall at Butler | ",
 "Upcoming Dec 8, 6:00 PM Women's · Seton Hall at Rutgers | ",
 "Upcoming Dec 10, 11:00 AM Women's · Seton Hall at Providence | ",
 "Upcoming Dec 13, 2:00 PM Women's · Seton Hall at Columbia | ",
 "Upcoming Dec 19, 1:00 PM Women's · Seton Hall vs Wagner | ",
 "Upcoming Dec 23, 12:00 PM Women's · Seton Hall vs Xavier | ",
 "Upcoming Dec 30, 1:00 PM Women's · Seton Hall vs Creighton | ",
 "Upcoming Jan 3, 3:00 PM Women's · Seton Hall at Marquette | ",
 "Upcoming Jan 7, 7:00 PM Women's · Seton Hall vs DePaul | ",
 "Upcoming Jan 10, 1:00 PM Women's · Seton Hall vs Butler | ",
 "Upcoming Jan 13, 7:00 PM Women's · Seton Hall at Georgetown | ",
 "Upcoming Jan 18, 2:30 PM Women's · Seton Hall vs Connecticut | ",
 "Upcoming Jan 23, 1:00 PM Women's · Seton Hall vs Marquette | ",
 "Upcoming Jan 27, 6:30 PM Women's · Seton Hall at Xavier | ",
 "Upcoming Jan 31, 2:00 PM Women's · Seton Hall at Creighton | ",
 "Upcoming Feb 4, 6:30 PM Women's · Seton Hall vs St. John's | ",
 "Upcoming Feb 7, 12:30 PM Women's · Seton Hall at Villanova | ",
 "Upcoming Feb 11, 7:00 PM Women's · Seton Hall vs Providence | ",
 "Upcoming Feb 14, 1:00 PM Women's · Seton Hall vs Georgetown | ",
 "Upcoming Feb 17, 7:00 PM Women's · Seton Hall at DePaul | ",
 "Upcoming Feb 24, 7:00 PM Women's · Seton Hall at St. John's | ",
 "Upcoming Feb 27, 5:00 PM Women's · Seton Hall vs Villanova | ",
 "Upcoming Mar 6 Women's · Seton Hall at BIG EAST Tournament Quarterfinals | ",
 "Upcoming Mar 7 Women's · Seton Hall at BIG EAST Tournament Semifinals | ",
 "Upcoming Mar 8 Women's · Seton Hall at BIG EAST Tournament Final | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Seton Hall at Temple Owl Invitational | 3rd of 5",
 "Final Sep 19 Women's · Seton Hall at Jasper Fall Invitational | 10th of 12",
 "Final Oct 17 Women's · Seton Hall at IC4A/ECAC Championships | 20th of 26",
 "Upcoming Oct 30 Women's · Seton Hall at Big East Championship | ",
 "Upcoming Nov 13 Women's · Seton Hall at NCAA Mid-Atlantic Regional Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Seton Hall at Temple Owl Invitational | 3rd of 5",
 "Final Sep 19 Men's · Seton Hall at Jasper Fall Invitational | 7th of 12",
 "Final Oct 17 Men's · Seton Hall at IC4A/ECAC Championships | 21st of 25",
 "Upcoming Oct 30 Men's · Seton Hall at Big East Championship | ",
 "Upcoming Nov 13 Men's · Seton Hall at NCAA Mid-Atlantic Regional Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Seton Hall at Nittany Lion Invitational | 15th of 18",
 "Final Sep 14 Women's · Seton Hall at Charge at Quail Valley | 1st of 9",
 "Final Sep 25 Women's · Seton Hall at Princeton Invitational | 11th of 12",
 "Final Oct 11 Women's · Seton Hall at UAlbany Invitational | 2nd of 10",
 "Upcoming Oct 24 Women's · Seton Hall at Delaware Lady Blue Hen Invitational | ",
 "Upcoming Feb 1 Women's · Seton Hall at Battle at Bentwater | ",
 "Upcoming Mar 8 Women's · Seton Hall at Space Coast Classic | ",
 "Upcoming Mar 22 Women's · Seton Hall at Henssler Financial Invitational | ",
 "Upcoming Apr 5 Women's · Seton Hall at Brickyard Collegiate | ",
 "Upcoming Apr 10 Women's · Seton Hall at Rutgers Invitational | ",
 "Upcoming Apr 24 Women's · Seton Hall at BIG EAST Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Seton Hall at Alex Lagowitz Memorial | 1st of 13",
 "Final Sep 14 Men's · Seton Hall at RedHawk Invitational | 3rd of 13",
 "Final Sep 25 Men's · Seton Hall at MacDonald Cup | 2nd of 11",
 "Final Oct 5 Men's · Seton Hall at Nemacolin Collegiate Invitational | Completed",
 "Final Oct 12 Men's · Seton Hall at The Bryson Invitational | 10th of 12",
 "Upcoming Feb 8 Men's · Seton Hall at BIG EAST Match Play | ",
 "Upcoming Mar 8 Men's · Seton Hall at Ross Collegiate Classic | ",
 "Upcoming Mar 15 Men's · Seton Hall at Tiger Invitational | ",
 "Upcoming Apr 5 Men's · Seton Hall at Wildcat Spring Invitational | ",
 "Upcoming Apr 10 Men's · Seton Hall at Princeton Invitational | ",
 "Upcoming Apr 17 Men's · Seton Hall at Rutgers Spring Invitational | ",
 "Upcoming May 1 Men's · Seton Hall at BIG EAST Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Seton Hall vs FDU | W, 2-1",
 "Final Aug 23 Women's · Seton Hall vs Drexel | W, 1-0",
 "Final Aug 30 Women's · Seton Hall at New Haven | W, 5-0",
 "Final Sep 3 Women's · Seton Hall vs Saint Peter's | W, 2-0",
 "Final Sep 10 Women's · Seton Hall vs Wagner | T, 0-0",
 "Final Sep 17 Women's · Seton Hall at Hofstra | T, 0-0",
 "Final Sep 26 Women's · Seton Hall at DePaul | T, 0-0",
 "Final Sep 30 Women's · Seton Hall vs Butler | T, 0-0",
 "Final Oct 3 Women's · Seton Hall at Xavier | L, 0-2",
 "Final Oct 7 Women's · Seton Hall at UConn | T, 0-0",
 "Final Oct 17 Women's · Seton Hall vs Providence | W, 1-0",
 "Today Oct 21, 6:00 PM Women's · Seton Hall vs Villanova | ",
 "Upcoming Oct 24, 7:00 PM Women's · Seton Hall at Georgetown | ",
 "Upcoming Oct 28, 6:00 PM Women's · Seton Hall vs Marquette | ",
 "Upcoming Oct 31, 1:00 PM Women's · Seton Hall vs Creighton | ",
 "Upcoming Nov 7, 7:00 PM Women's · Seton Hall at St. John's | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Seton Hall at Duke | L, 1-2",
 "Final Aug 23 Men's · Seton Hall vs Campbell | W, 3-2",
 "Final Aug 28 Men's · Seton Hall vs Iona | T, 0-0",
 "Final Sep 4 Men's · Seton Hall at Rutgers | W, 1-0",
 "Final Sep 8 Men's · Seton Hall vs Lehigh | T, 0-0",
 "Final Sep 12 Men's · Seton Hall at Penn | L, 1-2",
 "Final Sep 18 Men's · Seton Hall at UConn | W, 2-1",
 "Final Sep 22 Men's · Seton Hall at Princeton | T, 0-0",
 "Final Oct 2 Men's · Seton Hall at Butler | T, 0-0",
 "Final Oct 6 Men's · Seton Hall vs Sacred Heart | T, 1-1",
 "Final Oct 10 Men's · Seton Hall vs Xavier | T, 0-0",
 "Final Oct 16 Men's · Seton Hall at Georgetown | L, 0-4",
 "Final Oct 20 Men's · Seton Hall vs Liberty | W, 2-0",
 "Upcoming Oct 24, 6:00 PM Men's · Seton Hall vs St. John's | ",
 "Upcoming Oct 27, 7:00 PM Men's · Seton Hall vs DePaul | ",
 "Upcoming Oct 31, 7:00 PM Men's · Seton Hall at Providence | ",
 "Upcoming Nov 6, 6:56 PM Men's · Seton Hall vs Villanova | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Seton Hall vs Fordham | L, 115-183",
 "Final Oct 17 Women's · Seton Hall at Monmouth | W, 137-66",
 "Final Oct 17 Women's · Seton Hall vs Colgate (Diving Only) | Completed",
 "Upcoming Oct 24, 10:00 AM Women's · Seton Hall at Bucknell Fall Invite | ",
 "Upcoming Nov 6, 5:00 PM Women's · Seton Hall at Lehigh | ",
 "Upcoming Nov 7, 12:00 PM Women's · Seton Hall vs Drexel | ",
 "Upcoming Dec 4 Women's · Seton Hall at Bucknell Invitational | ",
 "Upcoming Jan 22, 5:00 PM Women's · Seton Hall vs NJIT (Diving Only) | ",
 "Upcoming Jan 23 Women's · Seton Hall vs Wagner | ",
 "Upcoming Jan 30 Women's · Seton Hall vs Georgetown | ",
 "Upcoming Feb 17 Women's · Seton Hall at BIG EAST Swim and Dive Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Seton Hall vs Fordham | W, 201.5-97.5",
 "Final Oct 17 Men's · Seton Hall at Monmouth | W, 112-93",
 "Final Oct 17 Men's · Seton Hall vs Colgate (Diving Only) | Completed",
 "Upcoming Oct 24, 10:00 AM Men's · Seton Hall at Bucknell Fall Invite | ",
 "Upcoming Nov 6, 5:00 PM Men's · Seton Hall at Lehigh | ",
 "Upcoming Nov 7, 12:00 PM Men's · Seton Hall vs Drexel | ",
 "Upcoming Dec 4 Men's · Seton Hall at Bucknell Invitational | ",
 "Upcoming Jan 22, 5:00 PM Men's · Seton Hall vs NJIT (Diving Only) | ",
 "Upcoming Jan 23 Men's · Seton Hall vs Wagner | ",
 "Upcoming Jan 30 Men's · Seton Hall vs Georgetown | ",
 "Upcoming Feb 17 Men's · Seton Hall at BIG EAST Swim and Dive Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Seton Hall at Lehigh Hidden Duals | Completed",
 "Final Sep 25 Seton Hall vs Saint Joseph's | W, 6-1",
 "Final Oct 15 Seton Hall at ITA Regionals | Completed",
 "Upcoming Oct 31, 10:00 AM Seton Hall at Hofstra | ",
 "Upcoming Oct 31, 4:00 PM Seton Hall at Stony Brook | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Seton Hall vs Illinois State | W, 3-0",
 "Final Aug 29 Seton Hall vs FDU | W, 3-0",
 "Final Aug 30 Seton Hall vs NJIT | W, 3-0",
 "Final Sep 4 Seton Hall vs Jacksonville State | W, 3-1",
 "Final Sep 5 Seton Hall at UNC Asheville | L, 0-3",
 "Final Sep 6 Seton Hall vs Western Carolina | W, 3-2",
 "Final Sep 11 Seton Hall at Maryland | L, 0-3",
 "Final Sep 12 Seton Hall vs Princeton | L, 2-3",
 "Final Sep 12 Seton Hall vs Saint Peter's | W, 3-1",
 "Final Sep 17 Seton Hall at NJIT | W, 3-2",
 "Final Sep 18 Seton Hall vs Iona | W, 3-1",
 "Final Sep 19 Seton Hall vs New Haven | L, 1-3",
 "Final Sep 23 Seton Hall at St. John's | L, 0-3",
 "Final Sep 25 Seton Hall vs Creighton | L, 0-3",
 "Final Oct 2 Seton Hall vs Butler | L, 0-3",
 "Final Oct 3 Seton Hall vs Xavier | L, 1-3",
 "Final Oct 9 Seton Hall at Providence | L, 0-3",
 "Final Oct 10 Seton Hall at Connecticut | L, 1-3",
 "Final Oct 16 Seton Hall vs DePaul | L, 1-3",
 "Final Oct 17 Seton Hall vs Marquette | L, 0-3",
 "Upcoming Oct 23, 7:00 PM Seton Hall at Georgetown | ",
 "Upcoming Oct 24, 7:00 PM Seton Hall at Villanova | ",
 "Upcoming Oct 30, 6:00 PM Seton Hall at Xavier | ",
 "Upcoming Oct 31, 7:00 PM Seton Hall at Butler | ",
 "Upcoming Nov 6, 5:00 PM Seton Hall vs Connecticut | ",
 "Upcoming Nov 7, 3:00 PM Seton Hall vs Providence | ",
 "Upcoming Nov 13, 8:00 PM Seton Hall at Marquette | ",
 "Upcoming Nov 14, 6:00 PM Seton Hall at DePaul | ",
 "Upcoming Nov 21 Seton Hall at BIG EAST Championships Semifinals | ",
 "Upcoming Nov 22 Seton Hall at BIG EAST Championships Final | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Swimming: a diving-only session scored "No Score" (Colgate, Oct 17, the day
// of the Monmouth dual) has no result of its own and is not listed.
{
  const h=worker.setonHallHandlers;
  const rows=['womens-swimming-and-diving','mens-swimming-and-diving'].flatMap(slug=>parse('Swimming & Diving',slug)).filter(e=>e.status==='Final').map(e=>[line(e),Boolean(h.isTennisWithoutStory({...e,recap_url:e.recap_url||'x'}))]);
  assert.deepEqual(rows,[["Final Oct 3 Women's · Seton Hall vs Fordham | L, 115-183",false],["Final Oct 17 Women's · Seton Hall at Monmouth | W, 137-66",false],["Final Oct 17 Women's · Seton Hall vs Colgate (Diving Only) | Completed",true],["Final Oct 3 Men's · Seton Hall vs Fordham | W, 201.5-97.5",false],["Final Oct 17 Men's · Seton Hall at Monmouth | W, 112-93",false],["Final Oct 17 Men's · Seton Hall vs Colgate (Diving Only) | Completed",true]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Seton Hall module checks passed');
