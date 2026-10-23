import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {riderSchool} from '../src/schools/rider.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='rider');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,riderHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/rider-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobroncs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['rider'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',riderSchool.scheduleUrls],['roster',riderSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('rider|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobroncs.com',`${key} must stay on gobroncs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gobroncs.com/sports/baseball/schedule"],"roster":["https://gobroncs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobroncs.com/sports/mens-basketball/schedule","https://gobroncs.com/sports/womens-basketball/schedule"],"roster":["https://gobroncs.com/sports/mens-basketball/roster","https://gobroncs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobroncs.com/sports/womens-cross-country/schedule","https://gobroncs.com/sports/mens-cross-country/schedule"],"roster":["https://gobroncs.com/sports/womens-cross-country/roster","https://gobroncs.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://gobroncs.com/sports/field-hockey/schedule"],"roster":["https://gobroncs.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://gobroncs.com/sports/mens-golf/schedule"],"roster":["https://gobroncs.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gobroncs.com/sports/womens-lacrosse/schedule"],"roster":["https://gobroncs.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gobroncs.com/sports/womens-soccer/schedule","https://gobroncs.com/sports/mens-soccer/schedule"],"roster":["https://gobroncs.com/sports/womens-soccer/roster","https://gobroncs.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gobroncs.com/sports/softball/schedule"],"roster":["https://gobroncs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gobroncs.com/sports/womens-swimming-and-diving/schedule","https://gobroncs.com/sports/mens-swimming-and-diving/schedule","https://gobroncs.com/sports/swimming-and-diving/schedule"],"roster":["https://gobroncs.com/sports/womens-swimming-and-diving/roster","https://gobroncs.com/sports/mens-swimming-and-diving/roster","https://gobroncs.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gobroncs.com/sports/womens-tennis/schedule","https://gobroncs.com/sports/mens-tennis/schedule"],"roster":["https://gobroncs.com/sports/womens-tennis/roster","https://gobroncs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gobroncs.com/sports/womens-track-and-field/schedule","https://gobroncs.com/sports/mens-track-and-field/schedule"],"roster":["https://gobroncs.com/sports/womens-track-and-field/roster","https://gobroncs.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gobroncs.com/sports/womens-volleyball/schedule"],"roster":["https://gobroncs.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gobroncs.com/sports/wrestling/schedule"],"roster":["https://gobroncs.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'rider|"+sport+"':"),`${sport} routes must live in the Rider module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gobroncs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.riderHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=rider)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 4:00 PM Men's · Rider vs Alvernia (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Rider at Pittsburgh | ",
 "Upcoming Nov 5, 7:00 PM Men's · Rider vs New Hampshire | ",
 "Upcoming Nov 8, 4:00 PM Men's · Rider at Binghamton | ",
 "Upcoming Nov 11, 7:00 PM Men's · Rider vs William Paterson | ",
 "Upcoming Nov 14, 7:00 PM Men's · Rider at Villanova | ",
 "Upcoming Nov 17, 7:00 PM Men's · Rider at Miami (FL) | ",
 "Upcoming Nov 21, 2:00 PM Men's · Rider vs Navy | ",
 "Upcoming Nov 24, 7:00 PM Men's · Rider at Loyola (MD) | ",
 "Upcoming Nov 28, 1:00 PM Men's · Rider at Army West Point | ",
 "Upcoming Nov 30, 6:30 PM Men's · Rider at Connecticut | ",
 "Upcoming Dec 4, 7:00 PM Men's · Rider at Canisius | ",
 "Upcoming Dec 6, 2:00 PM Men's · Rider at Niagara | ",
 "Upcoming Dec 9, 6:30 PM Men's · Rider at Georgetown | ",
 "Upcoming Dec 29, 7:00 PM Men's · Rider vs Quinnipiac | ",
 "Upcoming Jan 1, 7:00 PM Men's · Rider vs Fairfield | ",
 "Upcoming Jan 3, 2:00 PM Men's · Rider at Saint Peter's | ",
 "Upcoming Jan 8, 7:00 PM Men's · Rider vs Mount St. Mary's | ",
 "Upcoming Jan 13, 7:00 PM Men's · Rider at Iona | ",
 "Upcoming Jan 16, 1:00 PM Men's · Rider at Manhattan | ",
 "Upcoming Jan 18, 2:00 PM Men's · Rider vs Marist | ",
 "Upcoming Jan 22, 7:00 PM Men's · Rider at Fairfield | ",
 "Upcoming Jan 24, 2:00 PM Men's · Rider vs Saint Peter's | ",
 "Upcoming Jan 29, 7:00 PM Men's · Rider vs Sacred Heart | ",
 "Upcoming Jan 31, 2:00 PM Men's · Rider at Quinnipiac | ",
 "Upcoming Feb 7, 2:00 PM Men's · Rider vs Merrimack | ",
 "Upcoming Feb 11, 7:00 PM Men's · Rider at Mount St. Mary's | ",
 "Upcoming Feb 13, 7:00 PM Men's · Rider vs Manhattan | ",
 "Upcoming Feb 19, 7:00 PM Men's · Rider at Siena | ",
 "Upcoming Feb 21, 2:00 PM Men's · Rider at Marist | ",
 "Upcoming Feb 26, 7:00 PM Men's · Rider vs Niagara | ",
 "Upcoming Feb 28, 2:00 PM Men's · Rider vs Canisius | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Rider at NJIT | ",
 "Upcoming Nov 12, 7:00 PM Women's · Rider at Central Connecticut State | ",
 "Upcoming Nov 14, 11:00 AM Women's · Rider at Yale | ",
 "Upcoming Nov 17, 7:00 PM Women's · Rider at FDU | ",
 "Upcoming Nov 20, 7:00 PM Women's · Rider at Wagner | ",
 "Upcoming Nov 23, 7:00 PM Women's · Rider at Seton Hall | ",
 "Upcoming Dec 2, 6:00 PM Women's · Rider vs LIU | ",
 "Upcoming Dec 6, 1:00 PM Women's · Rider at Lafayette | ",
 "Upcoming Dec 12, 2:00 PM Women's · Rider at George Washington | ",
 "Upcoming Dec 19, 2:00 PM Women's · Rider vs Canisius | ",
 "Upcoming Dec 21, 4:00 PM Women's · Rider vs Niagara | ",
 "Upcoming Dec 29, 6:30 PM Women's · Rider at Quinnipiac | ",
 "Upcoming Jan 1, 2:00 PM Women's · Rider at Fairfield | ",
 "Upcoming Jan 3, 2:00 PM Women's · Rider vs Saint Peter's | ",
 "Upcoming Jan 7, 7:00 PM Women's · Rider at Mount St. Mary's | ",
 "Upcoming Jan 13, 6:00 PM Women's · Rider vs Iona | ",
 "Upcoming Jan 16, 6:00 PM Women's · Rider vs Manhattan | ",
 "Upcoming Jan 18, 2:00 PM Women's · Rider at Marist | ",
 "Upcoming Jan 21, 6:00 PM Women's · Rider vs Fairfield | ",
 "Upcoming Jan 23, 2:00 PM Women's · Rider at Saint Peter's | ",
 "Upcoming Jan 28, 7:00 PM Women's · Rider at Sacred Heart | ",
 "Upcoming Jan 30, 1:00 PM Women's · Rider vs Quinnipiac | ",
 "Upcoming Feb 6, 12:00 PM Women's · Rider at Merrimack | ",
 "Upcoming Feb 11, 6:00 PM Women's · Rider vs Mount St. Mary's | ",
 "Upcoming Feb 13, 2:00 PM Women's · Rider at Manhattan | ",
 "Upcoming Feb 18, 6:00 PM Women's · Rider vs Siena | ",
 "Upcoming Feb 20, 2:00 PM Women's · Rider vs Marist | ",
 "Upcoming Feb 25, 6:00 PM Women's · Rider at Niagara | ",
 "Upcoming Feb 27, 1:00 PM Women's · Rider at Canisius | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Rider at Temple XC Invite | 4th Place/5 Teams",
 "Final Sep 11 Women's · Rider at Lafayette Invite | 2nd Place/4 Teams",
 "Final Sep 19 Women's · Rider at Jaspers XC Invitational | 4th Place/12 Teams",
 "Final Oct 2 Women's · Rider at Paul Short Run | 23rd Place/37 Teams",
 "Final Oct 16 Women's · Rider at Princeton Fall Classic | 13th Place/18 Teams",
 "Upcoming Oct 31 Women's · Rider at Metro Championships | ",
 "Upcoming Nov 13 Women's · Rider at NCAA Mid-Atlantic Regionals (hosted by Lehigh) | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Rider at Temple XC Invite | 4th Place/5 Teams",
 "Final Sep 11 Men's · Rider at Lafayette Invite | 3rd Place/4 Teams",
 "Final Sep 19 Men's · Rider at Jasper XC Invitational | 4th Place/12 Teams",
 "Final Oct 2 Men's · Rider at Paul Short Run | Completed",
 "Final Oct 16 Men's · Rider at Princeton Fall Classic | 17th Place/20 Teams",
 "Upcoming Oct 31 Men's · Rider at Metro Championships | ",
 "Upcoming Nov 13 Men's · Rider at NCAA Mid-Atlantic Regionals (hosted by Lehigh) | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Rider at Hofstra | L, 1-2",
 "Final Aug 30 Rider at Colgate | L, 1-4",
 "Final Sep 4 Rider at Monmouth | L, 0-8",
 "Final Sep 6 Rider at Towson | L, 0-1",
 "Final Sep 11 Rider at Lafayette | L, 0-3",
 "Final Sep 13 Rider at Temple | L, 0-5",
 "Final Sep 18 Rider at LIU | W, 4-0",
 "Final Sep 20 Rider vs Georgetown | L, 1-2",
 "Final Sep 25 Rider at New Haven | W, 4-1",
 "Final Sep 27 Rider at Quinnipiac | L, 1-5",
 "Final Oct 2 Rider vs Merrimack | W, 3-2",
 "Final Oct 4 Rider at Lock Haven | L, 2-3",
 "Final Oct 9 Rider vs Mercyhurst | W, 7-0",
 "Final Oct 11 Rider vs Davidson | W, 1-0",
 "Final Oct 16 Rider vs Wagner | L, 1-2",
 "Final Oct 18 Rider vs Sacred Heart | L, 2-3",
 "Today Oct 23, 3:00 PM Rider at Stonehill | ",
 "Upcoming Oct 25, 1:00 PM Rider at Columbia | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Rider at Temple Invitational | 8th of 12",
 "Final Oct 5 Rider at Nemacolin Collegiate Invitational | 16th of 16",
 "Final Oct 11 Rider at Bucknell Invitational | T5th of 18",
 "Upcoming Oct 24 Rider at Lehigh Invitational | ",
 "Upcoming Oct 26 Rider at Iona Wykagyl Invitational | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Rider at Wagner | W, 1-0",
 "Final Aug 16 Women's · Rider at NJIT | T, 1-1",
 "Final Aug 27 Women's · Rider vs Temple | L, 1-2",
 "Final Sep 5 Women's · Rider at Fairfield | L, 0-3",
 "Final Sep 12 Women's · Rider vs Siena | L, 0-6",
 "Final Sep 19 Women's · Rider at Canisius | L, 0-1",
 "Final Sep 23 Women's · Rider vs Mount St. Mary's | L, 1-2",
 "Final Sep 30 Women's · Rider at Merrimack | W, 2-1",
 "Final Oct 3 Women's · Rider vs Iona | W, 2-0",
 "Final Oct 7 Women's · Rider at Manhattan | L, 0-1",
 "Final Oct 13 Women's · Rider at Saint Peter's | W, 4-2",
 "Final Oct 17 Women's · Rider vs Quinnipiac | L, 0-1",
 "Final Oct 21 Women's · Rider vs Sacred Heart | L, 1-4",
 "Upcoming Oct 24, 7:00 PM Women's · Rider at Marist | ",
 "Upcoming Oct 31, 1:00 PM Women's · Rider vs Niagara | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Rider at James Madison | W, 1-0",
 "Final Aug 28 Men's · Rider vs Howard | W, 2-0",
 "Final Aug 31 Men's · Rider at FDU | L, 1-2",
 "Final Sep 4 Men's · Rider vs NJIT | W, 3-2",
 "Final Sep 8 Men's · Rider vs Saint Joseph's | T, 0-0",
 "Final Sep 12 Men's · Rider at La Salle | W, 3-2",
 "Final Sep 19 Men's · Rider vs Quinnipiac | L, 0-1",
 "Final Sep 26 Men's · Rider at Canisius | W, 4-1",
 "Final Sep 30 Men's · Rider at Iona | T, 2-2",
 "Final Oct 3 Men's · Rider vs Niagara | W, 3-0",
 "Final Oct 10 Men's · Rider at Merrimack | L, 0-1",
 "Final Oct 14 Men's · Rider vs Mount St. Mary's | W, 2-0",
 "Final Oct 17 Men's · Rider at Manhattan | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Men's · Rider vs Marist | ",
 "Upcoming Oct 31, 12:00 PM Men's · Rider at Sacred Heart | ",
 "Upcoming Nov 4, 7:00 PM Men's · Rider vs Saint Peter's | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 10 Women's · Rider at Iona | L, 119-175",
 "Final Oct 17 Women's · Rider vs Lehigh | L, 96-198",
 "Final Oct 22 Women's · Rider vs Marist | L, 102-198",
 "Upcoming Nov 6, 4:00 PM Women's · Rider at Sacred Heart | ",
 "Upcoming Nov 6, 4:00 PM Women's · Rider vs Siena | ",
 "Upcoming Nov 20 Women's · Rider at H2ounds Invitational (hosted by Loyola University) | ",
 "Upcoming Jan 12, 6:00 PM Women's · Rider at Fordham | ",
 "Upcoming Jan 16, 1:00 PM Women's · Rider vs Merrimack | ",
 "Upcoming Jan 21, 5:00 PM Women's · Rider vs Lafayette | ",
 "Upcoming Jan 30, 10:00 AM Women's · Rider vs Canisius | ",
 "Upcoming Feb 24 Women's · Rider at Metro Conference Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 10 Men's · Rider at Iona | L, 117-183",
 "Final Oct 22 Men's · Rider vs Marist | W, 159-135",
 "Upcoming Nov 10, 5:30 PM Men's · Rider vs Villanova (Diving Only) | ",
 "Upcoming Nov 11, 6:00 PM Men's · Rider vs Villanova | ",
 "Upcoming Nov 20 Men's · Rider at H2ounds Invitational (hosted by Loyola University) | ",
 "Upcoming Jan 12, 6:00 PM Men's · Rider at Fordham | ",
 "Upcoming Jan 16, 1:00 PM Men's · Rider vs NJIT | ",
 "Upcoming Jan 21, 5:00 PM Men's · Rider vs Lafayette | ",
 "Upcoming Jan 30, 10:00 AM Men's · Rider vs Canisius | ",
 "Upcoming Feb 24 Men's · Rider at Metro Conference Championships | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Rider vs Fordham | W, 3-2",
 "Final Aug 30 Rider at Temple | L, 0-3",
 "Final Sep 4 Rider at St. John's | L, 0-3",
 "Final Sep 4 Rider vs East Texas A&M | L, 1-3",
 "Final Sep 5 Rider vs UAB | L, 1-3",
 "Final Sep 10 Rider vs Delaware | L, 0-3",
 "Final Sep 11 Rider vs Stony Brook | L, 0-3",
 "Final Sep 12 Rider at Rutgers | L, 0-3",
 "Final Sep 16 Rider at Penn | L, 0-3",
 "Final Sep 25 Rider vs Marist | L, 0-3",
 "Final Sep 26 Rider vs Siena | L, 0-3",
 "Final Sep 29 Rider at Saint Peter's | L, 0-3",
 "Final Oct 2 Rider vs Canisius | W, 3-2",
 "Final Oct 3 Rider vs Niagara | W, 3-1",
 "Final Oct 9 Rider at Sacred Heart | L, 2-3",
 "Final Oct 10 Rider at Fairfield | L, 0-3",
 "Final Oct 16 Rider vs Iona | W, 3-1",
 "Final Oct 17 Rider vs Manhattan | W, 3-1",
 "Today Oct 23, 5:00 PM Rider at Quinnipiac | ",
 "Upcoming Oct 24, 2:00 PM Rider at Merrimack | ",
 "Upcoming Oct 27, 6:00 PM Rider vs Saint Peter's | ",
 "Upcoming Oct 30, 6:00 PM Rider at Niagara | ",
 "Upcoming Oct 31, 2:00 PM Rider at Canisius | ",
 "Upcoming Nov 6, 6:00 PM Rider vs Fairfield | ",
 "Upcoming Nov 7, 2:00 PM Rider vs Sacred Heart | ",
 "Upcoming Nov 13, 6:00 PM Rider at Manhattan | ",
 "Upcoming Nov 14, 2:00 PM Rider at Iona | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Rider vs Princeton Open | ",
 "Upcoming Nov 20, 7:00 PM Rider vs Michigan | ",
 "Upcoming Dec 4, 12:00 PM Rider at Cliff Keen Invitational | ",
 "Upcoming Dec 12, 2:00 PM Rider at Michigan State | ",
 "Upcoming Dec 12, 4:00 PM Rider vs The Citadel | ",
 "Upcoming Dec 20, 1:00 PM Rider vs Indiana | ",
 "Upcoming Jan 7, 7:00 PM Rider at Rutgers | ",
 "Upcoming Jan 10, 2:00 PM Rider at Oklahoma | ",
 "Upcoming Jan 15, 7:00 PM Rider vs Ohio | ",
 "Upcoming Jan 16, 1:00 PM Rider vs SIUE | ",
 "Upcoming Jan 21, 7:00 PM Rider at Edinboro | ",
 "Upcoming Jan 22, 7:00 PM Rider at Kent State | ",
 "Upcoming Jan 30, 12:00 PM Rider at Princeton | ",
 "Upcoming Jan 31, 12:00 PM Rider vs George Mason | ",
 "Upcoming Jan 31, 4:00 PM Rider vs Davidson | ",
 "Upcoming Feb 4, 7:00 PM Rider at Lock Haven | ",
 "Upcoming Feb 6, 1:00 PM Rider at Bloomsburg | ",
 "Upcoming Feb 12, 7:00 PM Rider vs Clarion | ",
 "Upcoming Feb 13, 2:00 PM Rider vs Drexel | ",
 "Upcoming Feb 19, 7:00 PM Rider vs Penn | ",
 "Upcoming Mar 5, 10:00 AM Rider at MAC Championships | ",
 "Upcoming Mar 18 Rider at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Rider module checks passed");
