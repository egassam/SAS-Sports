import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {milwaukeeSchool} from '../src/schools/milwaukee.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='milwaukee');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,milwaukeeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/milwaukee-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mkepanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['milwaukee'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',milwaukeeSchool.scheduleUrls],['roster',milwaukeeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('milwaukee|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mkepanthers.com',`${key} must stay on mkepanthers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mkepanthers.com/sports/baseball/schedule"],"roster":["https://mkepanthers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mkepanthers.com/sports/mens-basketball/schedule","https://mkepanthers.com/sports/womens-basketball/schedule"],"roster":["https://mkepanthers.com/sports/mens-basketball/roster","https://mkepanthers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://mkepanthers.com/sports/womens-cross-country/schedule","https://mkepanthers.com/sports/mens-cross-country/schedule"],"roster":["https://mkepanthers.com/sports/womens-cross-country/roster","https://mkepanthers.com/sports/mens-cross-country/roster"],"combined":true},"Soccer":{"schedule":["https://mkepanthers.com/sports/womens-soccer/schedule","https://mkepanthers.com/sports/mens-soccer/schedule"],"roster":["https://mkepanthers.com/sports/womens-soccer/roster","https://mkepanthers.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://mkepanthers.com/sports/womens-swimming-and-diving/schedule","https://mkepanthers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://mkepanthers.com/sports/womens-swimming-and-diving/roster","https://mkepanthers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://mkepanthers.com/sports/womens-tennis/schedule"],"roster":["https://mkepanthers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://mkepanthers.com/sports/womens-track-and-field/schedule","https://mkepanthers.com/sports/mens-track-and-field/schedule"],"roster":["https://mkepanthers.com/sports/womens-track-and-field/roster","https://mkepanthers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://mkepanthers.com/sports/womens-volleyball/schedule"],"roster":["https://mkepanthers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'milwaukee|"+sport+"':"),`${sport} routes must live in the Milwaukee module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://mkepanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.milwaukeeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=milwaukee)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 5:00 PM Men's · Milwaukee vs Luther (Exhibition) | ",
 "Upcoming Nov 2, 9:30 PM Men's · Milwaukee at Southern California | ",
 "Upcoming Nov 4, 9:00 PM Men's · Milwaukee at Santa Clara | ",
 "Upcoming Nov 8, 12:00 PM Men's · Milwaukee vs Ripon | ",
 "Upcoming Nov 11, 6:00 PM Men's · Milwaukee at Indiana State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Milwaukee at TCU | ",
 "Upcoming Nov 21, 2:00 PM Men's · Milwaukee vs St. Thomas | ",
 "Upcoming Nov 24, 6:00 PM Men's · Milwaukee at Florida | ",
 "Upcoming Nov 29, 1:00 PM Men's · Milwaukee at Oregon State | ",
 "Upcoming Dec 3, 7:00 PM Men's · Milwaukee vs Wright State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Milwaukee at Northern Illinois | ",
 "Upcoming Dec 8, 7:00 PM Men's · Milwaukee at South Dakota State | ",
 "Upcoming Dec 12, 2:00 PM Men's · Milwaukee vs UIC | ",
 "Upcoming Dec 15, 7:00 PM Men's · Milwaukee at Little Rock | ",
 "Upcoming Dec 21, 4:00 PM Men's · Milwaukee at Vanderbilt | ",
 "Upcoming Dec 30, 6:00 PM Men's · Milwaukee at Detroit Mercy | ",
 "Upcoming Jan 3, 2:00 PM Men's · Milwaukee at Oakland | ",
 "Upcoming Jan 7, 7:00 PM Men's · Milwaukee vs Purdue Fort Wayne | ",
 "Upcoming Jan 9, 7:00 PM Men's · Milwaukee vs Northern Kentucky | ",
 "Upcoming Jan 14, 6:00 PM Men's · Milwaukee at Cleveland State | ",
 "Upcoming Jan 17, 2:00 PM Men's · Milwaukee vs Youngstown State | ",
 "Upcoming Jan 20, 7:00 PM Men's · Milwaukee vs Oakland | ",
 "Upcoming Jan 23, 1:00 PM Men's · Milwaukee at Green Bay | ",
 "Upcoming Jan 27, 7:00 PM Men's · Milwaukee vs Robert Morris | ",
 "Upcoming Jan 30, 3:00 PM Men's · Milwaukee vs Northern Illinois | ",
 "Upcoming Feb 4, 6:00 PM Men's · Milwaukee at Purdue Fort Wayne | ",
 "Upcoming Feb 7, 2:00 PM Men's · Milwaukee vs Green Bay | ",
 "Upcoming Feb 11, 6:00 PM Men's · Milwaukee at Northern Kentucky | ",
 "Upcoming Feb 13, 6:00 PM Men's · Milwaukee at Wright State | ",
 "Upcoming Feb 19, 7:00 PM Men's · Milwaukee vs IU Indy | ",
 "Upcoming Feb 21, 2:00 PM Men's · Milwaukee vs Cleveland State | ",
 "Upcoming Feb 24, 6:00 PM Men's · Milwaukee at Robert Morris | ",
 "Upcoming Feb 27, 1:00 PM Men's · Milwaukee at Youngstown State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:00 PM Women's · Milwaukee vs Benedictine (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Women's · Milwaukee at Northwestern | ",
 "Upcoming Nov 5, 7:00 PM Women's · Milwaukee at Saint Louis | ",
 "Upcoming Nov 8, 1:00 PM Women's · Milwaukee at SIUE | ",
 "Upcoming Nov 12, 6:00 PM Women's · Milwaukee vs North Dakota | ",
 "Upcoming Nov 14, 1:00 PM Women's · Milwaukee at Loyola Chicago | ",
 "Upcoming Nov 15, 1:00 PM Women's · Milwaukee at Indiana | ",
 "Upcoming Nov 20, 6:00 PM Women's · Milwaukee at Western Michigan | ",
 "Upcoming Nov 23, 6:00 PM Women's · Milwaukee vs Marquette | ",
 "Upcoming Nov 29, 2:00 PM Women's · Milwaukee vs Toledo | ",
 "Upcoming Dec 3, 5:30 PM Women's · Milwaukee at Youngstown State | ",
 "Upcoming Dec 5, 3:00 PM Women's · Milwaukee at Robert Morris | ",
 "Upcoming Dec 9, 5:30 PM Women's · Milwaukee at Michigan State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Milwaukee vs Eastern Kentucky | ",
 "Upcoming Dec 20, 2:00 PM Women's · Milwaukee vs Viterbo | ",
 "Upcoming Dec 31, 12:00 PM Women's · Milwaukee vs Purdue Fort Wayne | ",
 "Upcoming Jan 2, 2:00 PM Women's · Milwaukee vs Cleveland State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Milwaukee at Detroit Mercy | ",
 "Upcoming Jan 9, 12:00 PM Women's · Milwaukee at Oakland | ",
 "Upcoming Jan 13, 5:30 PM Women's · Milwaukee at IU Indy | ",
 "Upcoming Jan 16, 2:00 PM Women's · Milwaukee vs Green Bay | ",
 "Upcoming Jan 21, 11:00 AM Women's · Milwaukee vs Northern Illinois | ",
 "Upcoming Jan 23, 1:00 PM Women's · Milwaukee vs Wright State | ",
 "Upcoming Jan 28, 10:00 AM Women's · Milwaukee at Cleveland State | ",
 "Upcoming Jan 31, 12:00 PM Women's · Milwaukee vs Robert Morris | ",
 "Upcoming Feb 3, 5:00 PM Women's · Milwaukee at Northern Kentucky | ",
 "Upcoming Feb 6, 11:00 AM Women's · Milwaukee at Wright State | ",
 "Upcoming Feb 10, 6:00 PM Women's · Milwaukee vs Oakland | ",
 "Upcoming Feb 13, 1:00 PM Women's · Milwaukee at Green Bay | ",
 "Upcoming Feb 17, 6:00 PM Women's · Milwaukee vs Youngstown State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Milwaukee vs IU Indy | ",
 "Upcoming Feb 25, 6:00 PM Women's · Milwaukee vs Northern Kentucky | ",
 "Upcoming Feb 27, 2:00 PM Women's · Milwaukee at Northern Illinois | ",
 "Upcoming Mar 3 Women's · Milwaukee vs Horizon First Round | ",
 "Upcoming Mar 7, 11:00 AM Women's · Milwaukee vs Horizon Second Round | ",
 "Upcoming Mar 8, 11:00 AM Women's · Milwaukee at Horizon Semifinals | ",
 "Upcoming Mar 9, 11:00 AM Women's · Milwaukee at Horizon Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Milwaukee at Huskie Classic | 4th of 5, 115 Points",
 "Final Sep 12 Women's · Milwaukee at Phoenix Open | 6th of 7, 129 Points",
 "Final Sep 25 Women's · Milwaukee at Jim Allen Classic | 3rd of 4, 63 Points",
 "Final Oct 2 Women's · Milwaukee at Joe Piane Invitational | 23rd of 24, 561 Points",
 "Final Oct 16 Women's · Milwaukee at Bradley Pink Classic | 24th of 25, 711 Points",
 "Upcoming Oct 31, 10:00 AM Women's · Milwaukee at Horizon League Championships | ",
 "Upcoming Nov 13, 9:00 AM Women's · Milwaukee at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Milwaukee at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Milwaukee at Huskie Classic | 2nd of 3, 54 Points",
 "Final Sep 12 Men's · Milwaukee at Phoenix Open | 4th of 7, 92 Points",
 "Final Sep 25 Men's · Milwaukee at Jim Allen Classic | 3rd of 4, 73 Points",
 "Final Oct 2 Men's · Milwaukee at Joe Piane Invitational | 15th of 21, 363 Points",
 "Final Oct 16 Men's · Milwaukee at Bradley Pink Classic | 21st of 25, 620 Points",
 "Upcoming Oct 31, 11:00 AM Men's · Milwaukee at Horizon League Championships | ",
 "Upcoming Nov 13, 10:00 AM Men's · Milwaukee at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Milwaukee at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Milwaukee at Iowa | L, 0-7",
 "Final Aug 16 Women's · Milwaukee at Northern Iowa | W, 4-0",
 "Final Aug 20 Women's · Milwaukee at Tennessee | L, 0-4",
 "Final Aug 23 Women's · Milwaukee at Georgia | L, 0-3",
 "Final Aug 27 Women's · Milwaukee at Marquette | T, 0-0",
 "Final Sep 3 Women's · Milwaukee vs Wisconsin | L, 0-2",
 "Final Sep 6 Women's · Milwaukee vs Valparaiso | W, 2-0",
 "Final Sep 10 Women's · Milwaukee vs Eastern Michigan | T, 0-0",
 "Final Sep 19 Women's · Milwaukee at IU Indy | W, 3-2",
 "Final Sep 24 Women's · Milwaukee vs Oakland | W, 1-0",
 "Final Sep 27 Women's · Milwaukee vs Detroit Mercy | W, 3-0",
 "Final Oct 1 Women's · Milwaukee at Northern Kentucky | W, 3-1",
 "Final Oct 4 Women's · Milwaukee at Wright State | W, 2-1",
 "Final Oct 10 Women's · Milwaukee vs Northern Illinois | W, 3-1",
 "Final Oct 15 Women's · Milwaukee vs Youngstown State | W, 2-1",
 "Final Oct 18 Women's · Milwaukee vs Robert Morris | W, 5-1",
 "Final Oct 22 Women's · Milwaukee at Purdue Fort Wayne | W, 1-0",
 "Upcoming Oct 25, 12:00 PM Women's · Milwaukee at Cleveland State | ",
 "Upcoming Oct 31, 1:00 PM Women's · Milwaukee vs Green Bay | ",
 "Upcoming Nov 7 Women's · Milwaukee vs Horizon League First Round | ",
 "Upcoming Nov 11 Women's · Milwaukee at Horizon League Semifinals | ",
 "Upcoming Nov 14 Women's · Milwaukee vs Horizon League Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Milwaukee vs Southern Indiana | T, 0-0",
 "Final Aug 24 Men's · Milwaukee vs Chicago State | W, 3-1",
 "Final Aug 27 Men's · Milwaukee at Loyola Chicago | T, 1-1",
 "Final Sep 2 Men's · Milwaukee at Drake | L, 0-2",
 "Final Sep 5 Men's · Milwaukee vs St. Thomas | L, 0-1",
 "Final Sep 9 Men's · Milwaukee vs Wright State | L, 2-3",
 "Final Sep 12 Men's · Milwaukee at Northern Kentucky | W, 1-0",
 "Final Sep 15 Men's · Milwaukee vs Bowling Green | W, 1-0",
 "Final Sep 19 Men's · Milwaukee at Northern Illinois | W, 2-1",
 "Final Sep 22 Men's · Milwaukee at Marquette | L, 0-1",
 "Final Sep 26 Men's · Milwaukee vs Cleveland State | T, 0-0",
 "Final Oct 3 Men's · Milwaukee at Robert Morris | W, 1-0",
 "Final Oct 10 Men's · Milwaukee vs Oakland | T, 1-1",
 "Final Oct 17 Men's · Milwaukee at IU Indy | T, 0-0",
 "Upcoming Oct 24, 2:00 PM Men's · Milwaukee vs Purdue Fort Wayne | ",
 "Upcoming Oct 30, 2:00 PM Men's · Milwaukee at Detroit Mercy | ",
 "Upcoming Nov 3, 1:00 PM Men's · Milwaukee vs Green Bay | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · Milwaukee vs Wisconsin Showcase | Completed",
 "Upcoming Oct 31, 10:30 AM Women's · Milwaukee at UIC | ",
 "Upcoming Oct 31, 10:30 AM Women's · Milwaukee at IU Indy | ",
 "Upcoming Nov 6, 5:00 PM Women's · Milwaukee at Wheaton College | ",
 "Upcoming Nov 19 Women's · Milwaukee at IU Indy House of Champions | ",
 "Upcoming Jan 15, 5:00 PM Women's · Milwaukee vs Marquette | ",
 "Upcoming Jan 15, 5:00 PM Women's · Milwaukee vs MSOE | ",
 "Upcoming Jan 23, 11:00 AM Women's · Milwaukee vs Green Bay | ",
 "Upcoming Jan 29, 3:00 PM Women's · Milwaukee at Stevens Point | ",
 "Upcoming Feb 17 Women's · Milwaukee at Horizon League Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 17 Men's · Milwaukee vs Wisconsin Showcase | Completed",
 "Upcoming Oct 31, 10:30 AM Men's · Milwaukee at UIC | ",
 "Upcoming Oct 31, 10:30 AM Men's · Milwaukee at IU Indy | ",
 "Upcoming Nov 6, 5:00 PM Men's · Milwaukee at Wheaton College | ",
 "Upcoming Nov 19 Men's · Milwaukee at IU Indy House of Champions | ",
 "Upcoming Jan 15, 5:00 PM Men's · Milwaukee at Milwaukee Triangular | ",
 "Upcoming Jan 23, 11:00 AM Men's · Milwaukee vs Green Bay | ",
 "Upcoming Jan 29, 3:00 PM Men's · Milwaukee at Stevens Point | ",
 "Upcoming Feb 17 Men's · Milwaukee at Horizon League Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Milwaukee at Milwaukee Tennis Classic | Completed",
 "Final Sep 25 Milwaukee at Gopher Invitational | Completed",
 "Final Oct 2 Milwaukee at Horizon League Individual Championships | Completed",
 "Final Oct 9 Milwaukee at Warhawk Fall Invite | Completed",
 "Final Oct 16 Milwaukee at Marquette Invitational | Completed",
 "Upcoming Jan 30, 11:00 AM Milwaukee vs Western Illinois | ",
 "Upcoming Jan 31, 11:00 AM Milwaukee vs Bradley | ",
 "Upcoming Feb 12, 5:00 PM Milwaukee vs Missouri | ",
 "Upcoming Feb 13 Milwaukee at St. Thomas | ",
 "Upcoming Feb 14 Milwaukee at Minnesota | ",
 "Upcoming Feb 17, 1:00 PM Milwaukee at Chicago State | ",
 "Upcoming Feb 19, 2:00 PM Milwaukee vs Marquette | ",
 "Upcoming Feb 20, 11:00 AM Milwaukee vs Valparaiso | ",
 "Upcoming Feb 27, 11:00 AM Milwaukee vs Drake | ",
 "Upcoming Mar 6, 11:00 AM Milwaukee vs Northern Iowa | ",
 "Upcoming Mar 19 Milwaukee at Wisconsin | ",
 "Upcoming Mar 23 Milwaukee at Keiser | ",
 "Upcoming Mar 24, 10:00 AM Milwaukee at Florida International | ",
 "Upcoming Apr 3, 11:00 AM Milwaukee vs Oakland | ",
 "Upcoming Apr 10, 10:00 AM Milwaukee at Youngstown State | ",
 "Upcoming Apr 11 Milwaukee at Cleveland State | ",
 "Upcoming Apr 17, 11:00 AM Milwaukee vs Northern Illinois | ",
 "Upcoming Apr 24, 11:00 AM Milwaukee vs Northern Kentucky | ",
 "Upcoming Apr 25, 11:00 AM Milwaukee vs IU Indy | ",
 "Upcoming Apr 30 Milwaukee at Horizon League Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Milwaukee vs DePaul | L, 0-3",
 "Final Aug 29 Milwaukee vs South Dakota | L, 0-3",
 "Final Aug 29 Milwaukee at Drake | L, 1-3",
 "Final Sep 3 Milwaukee vs UIC | W, 3-0",
 "Final Sep 4 Milwaukee vs Montana State | W, 3-2",
 "Final Sep 5 Milwaukee at St. Thomas | W, 3-1",
 "Final Sep 10 Milwaukee at Indiana State | W, 3-2",
 "Final Sep 11 Milwaukee at Indiana State | W, 3-1",
 "Final Sep 18 Milwaukee at Wisconsin | L, 1-3",
 "Final Sep 19 Milwaukee vs Western Michigan | L, 2-3",
 "Final Sep 20 Milwaukee at Marquette | L, 0-3",
 "Final Sep 22 Milwaukee at Iowa | L, 1-3",
 "Final Sep 25 Milwaukee at Northern Kentucky | L, 1-3",
 "Final Sep 26 Milwaukee at Northern Kentucky | L, 0-3",
 "Final Sep 29 Milwaukee vs Green Bay | L, 2-3",
 "Final Oct 1 Milwaukee vs Northern Illinois | L, 2-3",
 "Final Oct 9 Milwaukee vs Cleveland State | W, 3-0",
 "Final Oct 10 Milwaukee vs Cleveland State | W, 3-2",
 "Final Oct 13 Milwaukee at Green Bay | L, 0-3",
 "Final Oct 15 Milwaukee at Northern Illinois | W, 3-0",
 "Today Oct 23, 4:00 PM Milwaukee vs IU Indy | ",
 "Upcoming Oct 24, 2:00 PM Milwaukee vs Purdue Fort Wayne | ",
 "Upcoming Oct 30, 5:00 PM Milwaukee at Oakland | ",
 "Upcoming Oct 31, 1:00 PM Milwaukee at Oakland | ",
 "Upcoming Nov 6, 6:00 PM Milwaukee vs Wright State | ",
 "Upcoming Nov 7, 12:00 PM Milwaukee vs Wright State | ",
 "Upcoming Nov 12, 5:00 PM Milwaukee at Youngstown State | ",
 "Upcoming Nov 13, 3:00 PM Milwaukee at Robert Morris | ",
 "Upcoming Nov 19 Milwaukee vs Horizon League First Round | ",
 "Upcoming Nov 20 Milwaukee at Horizon League Quarterfinals | ",
 "Upcoming Nov 21 Milwaukee at Horizon League Semifinals | ",
 "Upcoming Nov 22 Milwaukee at Horizon League Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Milwaukee module checks passed");
