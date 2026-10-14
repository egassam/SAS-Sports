import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rutgersSchool,rutgersGolfStoryPlace} from '../src/schools/rutgers.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='rutgers');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,rutgersHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/rutgers-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit scarletknights.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['rutgers'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',rutgersSchool.scheduleUrls],['roster',rutgersSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('rutgers|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'scarletknights.com',`${key} must stay on scarletknights.com`);
  }
}
const parity={"Baseball":{"schedule":["https://scarletknights.com/sports/baseball/schedule"],"roster":["https://scarletknights.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://scarletknights.com/sports/mens-basketball/schedule","https://scarletknights.com/sports/womens-basketball/schedule"],"roster":["https://scarletknights.com/sports/mens-basketball/roster","https://scarletknights.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://scarletknights.com/sports/cross-country/schedule"],"roster":["https://scarletknights.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://scarletknights.com/sports/field-hockey/schedule"],"roster":["https://scarletknights.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://scarletknights.com/sports/football/schedule"],"roster":["https://scarletknights.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://scarletknights.com/sports/womens-golf/schedule","https://scarletknights.com/sports/mens-golf/schedule"],"roster":["https://scarletknights.com/sports/womens-golf/roster","https://scarletknights.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://scarletknights.com/sports/womens-gymnastics/schedule"],"roster":["https://scarletknights.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://scarletknights.com/sports/womens-lacrosse/schedule","https://scarletknights.com/sports/mens-lacrosse/schedule"],"roster":["https://scarletknights.com/sports/womens-lacrosse/roster","https://scarletknights.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://scarletknights.com/sports/womens-rowing/schedule"],"roster":["https://scarletknights.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://scarletknights.com/sports/womens-soccer/schedule","https://scarletknights.com/sports/mens-soccer/schedule"],"roster":["https://scarletknights.com/sports/womens-soccer/roster","https://scarletknights.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://scarletknights.com/sports/softball/schedule"],"roster":["https://scarletknights.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://scarletknights.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://scarletknights.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://scarletknights.com/sports/womens-tennis/schedule"],"roster":["https://scarletknights.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://scarletknights.com/sports/track-and-field/schedule"],"roster":["https://scarletknights.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://scarletknights.com/sports/womens-volleyball/schedule"],"roster":["https://scarletknights.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://scarletknights.com/sports/wrestling/schedule"],"roster":["https://scarletknights.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'rutgers|"+sport+"':"),`${sport} routes must live in the Rutgers module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://scarletknights.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.rutgersHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=rutgers)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 5:30 PM Rutgers at Wofford | ",
 "Upcoming Feb 20, 2:00 PM Rutgers at Wofford | ",
 "Upcoming Feb 21, 1:00 PM Rutgers at Wofford | ",
 "Upcoming Feb 23, 2:00 PM Rutgers vs Saint Joseph's | ",
 "Upcoming Feb 26, 5:30 PM Rutgers at Vanderbilt | ",
 "Upcoming Feb 27, 3:00 PM Rutgers at Vanderbilt | ",
 "Upcoming Feb 28, 2:00 PM Rutgers at Vanderbilt | ",
 "Upcoming Mar 2, 3:00 PM Rutgers vs Wagner | ",
 "Upcoming Mar 5, 1:00 PM Rutgers at VCU | ",
 "Upcoming Mar 6, 1:00 PM Rutgers at VCU | ",
 "Upcoming Mar 7, 1:00 PM Rutgers at VCU | ",
 "Upcoming Mar 9, 3:00 PM Rutgers vs Monmouth | ",
 "Upcoming Mar 12, 7:00 PM Rutgers at Oregon | ",
 "Upcoming Mar 13, 5:00 PM Rutgers at Oregon | ",
 "Upcoming Mar 14, 3:00 PM Rutgers at Oregon | ",
 "Upcoming Mar 16, 8:30 PM Rutgers at Oregon State | ",
 "Upcoming Mar 19, 10:00 PM Rutgers at Washington | ",
 "Upcoming Mar 20, 10:00 PM Rutgers at Washington | ",
 "Upcoming Mar 21, 4:00 PM Rutgers at Washington | ",
 "Upcoming Mar 24, 3:30 PM Rutgers at Columbia | ",
 "Upcoming Mar 26, 6:00 PM Rutgers vs Indiana | ",
 "Upcoming Mar 27, 3:00 PM Rutgers vs Indiana | ",
 "Upcoming Mar 28, 1:00 PM Rutgers vs Indiana | ",
 "Upcoming Mar 31, 6:00 PM Rutgers vs Hofstra | ",
 "Upcoming Apr 2, 6:00 PM Rutgers vs Nebraska | ",
 "Upcoming Apr 3, 3:00 PM Rutgers vs Nebraska | ",
 "Upcoming Apr 4, 12:00 PM Rutgers vs Nebraska | ",
 "Upcoming Apr 6, 3:00 PM Rutgers vs Seton Hall | ",
 "Upcoming Apr 9, 6:00 PM Rutgers at Michigan State | ",
 "Upcoming Apr 10, 3:00 PM Rutgers at Michigan State | ",
 "Upcoming Apr 11, 1:00 PM Rutgers at Michigan State | ",
 "Upcoming Apr 13, 3:00 PM Rutgers at Stony Brook | ",
 "Upcoming Apr 16, 5:00 PM Rutgers vs Northeastern | ",
 "Upcoming Apr 17, 11:00 AM Rutgers vs NJIT | ",
 "Upcoming Apr 18, 1:00 PM Rutgers vs Northeastern | ",
 "Upcoming Apr 18, 5:00 PM Rutgers vs Iona | ",
 "Upcoming Apr 20, 3:00 PM Rutgers at St. John's | ",
 "Upcoming Apr 23, 6:00 PM Rutgers at Maryland | ",
 "Upcoming Apr 24, 2:00 PM Rutgers at Maryland | ",
 "Upcoming Apr 25, 1:00 PM Rutgers at Maryland | ",
 "Upcoming Apr 27, 6:00 PM Rutgers vs Delaware | ",
 "Upcoming Apr 30, 6:00 PM Rutgers vs Minnesota | ",
 "Upcoming May 1, 3:00 PM Rutgers vs Minnesota | ",
 "Upcoming May 2, 1:00 PM Rutgers vs Minnesota | ",
 "Upcoming May 5, 4:00 PM Rutgers vs Rider | ",
 "Upcoming May 7, 6:00 PM Rutgers vs Penn State | ",
 "Upcoming May 8, 6:00 PM Rutgers vs Penn State | ",
 "Upcoming May 9, 2:00 PM Rutgers vs Penn State | ",
 "Upcoming May 14, 7:30 PM Rutgers at Iowa | ",
 "Upcoming May 15, 4:30 PM Rutgers at Iowa | ",
 "Upcoming May 16, 2:00 PM Rutgers at Iowa | ",
 "Upcoming May 18, 6:00 PM Rutgers vs Georgetown | ",
 "Upcoming May 20, 6:00 PM Rutgers vs Purdue | ",
 "Upcoming May 21, 3:00 PM Rutgers vs Purdue | ",
 "Upcoming May 22, 1:00 PM Rutgers vs Purdue | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · Rutgers vs Villanova (Exhibition) | L, 75-77",
 "Upcoming Oct 18, 12:00 PM Men's · Rutgers vs St. John's (Exhibition) | ",
 "Upcoming Nov 6, 7:00 PM Men's · Rutgers vs New Haven | ",
 "Upcoming Nov 10, 6:30 PM Men's · Rutgers vs NJIT | ",
 "Upcoming Nov 13, 6:00 PM Men's · Rutgers vs Bryant | ",
 "Upcoming Nov 17, 2:00 PM Men's · Rutgers vs Houston | ",
 "Upcoming Nov 18 Men's · Rutgers at Players Era Festival | ",
 "Upcoming Nov 24, 6:00 PM Men's · Rutgers vs Sacred Heart | ",
 "Upcoming Dec 1, 8:00 PM Men's · Rutgers at Indiana | ",
 "Upcoming Dec 9, 6:30 PM Men's · Rutgers vs Michigan | ",
 "Upcoming Dec 12, 4:30 PM Men's · Rutgers vs Seton Hall | ",
 "Upcoming Dec 16, 6:30 PM Men's · Rutgers vs Saint Peter's | ",
 "Upcoming Dec 20, 12:00 PM Men's · Rutgers vs Army | ",
 "Upcoming Dec 29, 6:00 PM Men's · Rutgers vs Delaware State | ",
 "Upcoming Jan 2, 12:00 PM Men's · Rutgers at Purdue | ",
 "Upcoming Jan 5, 6:00 PM Men's · Rutgers vs UCLA | ",
 "Upcoming Jan 8, 7:00 PM Men's · Rutgers vs USC | ",
 "Upcoming Jan 12, 8:30 PM Men's · Rutgers vs Iowa | ",
 "Upcoming Jan 16, 1:00 PM Men's · Rutgers at Northwestern | ",
 "Upcoming Jan 19, 7:00 PM Men's · Rutgers at Maryland | ",
 "Upcoming Jan 23, 12:00 PM Men's · Rutgers vs Minnesota | ",
 "Upcoming Jan 27, 11:00 PM Men's · Rutgers at Oregon | ",
 "Upcoming Jan 30, 4:00 PM Men's · Rutgers at Washington | ",
 "Upcoming Feb 3, 6:30 PM Men's · Rutgers vs Purdue | ",
 "Upcoming Feb 6, 11:00 AM Men's · Rutgers vs Syracuse | ",
 "Upcoming Feb 10, 6:30 PM Men's · Rutgers at Michigan State | ",
 "Upcoming Feb 13, 12:00 PM Men's · Rutgers vs Wisconsin | ",
 "Upcoming Feb 16, 7:00 PM Men's · Rutgers at Nebraska | ",
 "Upcoming Feb 20, 1:00 PM Men's · Rutgers vs Penn State | ",
 "Upcoming Feb 25, 6:30 PM Men's · Rutgers at Ohio State | ",
 "Upcoming Feb 28, 5:00 PM Men's · Rutgers vs Maryland | ",
 "Upcoming Mar 3, 6:30 PM Men's · Rutgers vs Illinois | ",
 "Upcoming Mar 7, 3:00 PM Men's · Rutgers at Penn State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30, 7:00 PM Women's · Rutgers vs Caldwell (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Rutgers vs LIU | ",
 "Upcoming Nov 4, 7:00 PM Women's · Rutgers vs La Salle | ",
 "Upcoming Nov 8, 2:00 PM Women's · Rutgers vs Indiana State | ",
 "Upcoming Nov 11, 7:00 PM Women's · Rutgers vs Monmouth | ",
 "Upcoming Nov 16, 7:00 PM Women's · Rutgers vs Albany | ",
 "Upcoming Nov 19, 11:00 AM Women's · Rutgers vs Maryland Eastern Shore | ",
 "Upcoming Nov 21, 2:00 PM Women's · Rutgers vs Delaware State | ",
 "Upcoming Nov 25, 12:00 PM Women's · Rutgers at Princeton | ",
 "Upcoming Nov 27, 7:00 PM Women's · Rutgers vs South Dakota State | ",
 "Upcoming Nov 28, 5:45 PM Women's · Rutgers vs Georgetown | ",
 "Upcoming Dec 2, 7:00 PM Women's · Rutgers vs Saint Peter's | ",
 "Upcoming Dec 5, 12:00 PM Women's · Rutgers vs Ohio State | ",
 "Upcoming Dec 8, 6:00 PM Women's · Rutgers vs Seton Hall | ",
 "Upcoming Dec 13, 2:00 PM Women's · Rutgers vs Coppin State | ",
 "Upcoming Dec 20, 5:00 PM Women's · Rutgers vs Lafayette | ",
 "Upcoming Dec 29, 7:00 PM Women's · Rutgers at Indiana | ",
 "Upcoming Jan 2, 2:00 PM Women's · Rutgers vs Illinois | ",
 "Upcoming Jan 5, 8:00 PM Women's · Rutgers at Iowa | ",
 "Upcoming Jan 8, 6:00 PM Women's · Rutgers at Penn State | ",
 "Upcoming Jan 11, 7:00 PM Women's · Rutgers vs USC | ",
 "Upcoming Jan 17, 4:00 PM Women's · Rutgers at Michigan | ",
 "Upcoming Jan 21, 7:00 PM Women's · Rutgers vs UCLA | ",
 "Upcoming Jan 24 Women's · Rutgers at Wisconsin | ",
 "Upcoming Jan 28, 7:00 PM Women's · Rutgers vs Michigan State | ",
 "Upcoming Jan 31, 2:00 PM Women's · Rutgers vs Northwestern | ",
 "Upcoming Feb 7 Women's · Rutgers at Minnesota | ",
 "Upcoming Feb 10, 7:00 PM Women's · Rutgers vs Penn State | ",
 "Upcoming Feb 14, 2:00 PM Women's · Rutgers vs Purdue | ",
 "Upcoming Feb 17 Women's · Rutgers at Washington | ",
 "Upcoming Feb 20, 9:00 PM Women's · Rutgers at Oregon | ",
 "Upcoming Feb 24, 7:00 PM Women's · Rutgers vs Nebraska | ",
 "Upcoming Feb 28, 12:00 PM Women's · Rutgers at Maryland | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Rutgers at Lehigh Invitational | Completed",
 "Final Oct 2 Rutgers at Paul Short Run | Completed",
 "Final Oct 9 Rutgers at Nuttycombe Wisconsin Invitational | Completed",
 "Upcoming Oct 16 Rutgers at Princeton Fall Classic | ",
 "Upcoming Oct 30 Rutgers at Big Ten Championships | ",
 "Upcoming Nov 13 Rutgers at NCAA Mid Atlantic Regional | ",
 "Upcoming Nov 21 Rutgers at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Rutgers at Monmouth | L, 1-5",
 "Final Aug 30 Rutgers at Wagner | W, 7-1",
 "Final Sep 4 Rutgers vs Virginia | L, 1-2",
 "Final Sep 6 Rutgers vs Syracuse | W, 2-1",
 "Final Sep 11 Rutgers at Princeton | L, 0-2",
 "Final Sep 13 Rutgers vs UConn | L, 3-4",
 "Final Sep 18 Rutgers at Albany | W, 7-2",
 "Final Sep 20 Rutgers at Colgate | W, 3-1",
 "Final Sep 25 Rutgers at Maryland | L, 0-3",
 "Final Sep 27 Rutgers vs La Salle | W, 5-0",
 "Final Oct 2 Rutgers vs Penn State | L, 0-1",
 "Final Oct 4 Rutgers vs American | W, 4-2",
 "Final Oct 9 Rutgers at Ohio State | W, 3-2",
 "Upcoming Oct 16, 3:00 PM Rutgers vs Michigan | ",
 "Upcoming Oct 18, 12:00 PM Rutgers vs Michigan State | ",
 "Upcoming Oct 23, 3:00 PM Rutgers at Iowa | ",
 "Upcoming Oct 25, 12:00 PM Rutgers at Northwestern | ",
 "Upcoming Oct 30, 12:00 PM Rutgers vs Indiana | ",
 "Upcoming Nov 4 Rutgers at Big Ten Tournament | ",
 "Upcoming Nov 13 Rutgers at 2026 NCAA Tournament | ",
 "Upcoming Nov 19 Rutgers at 2026 NCAA Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Rutgers vs UMass | L, 21-37",
 "Final Sep 11 Rutgers at Boston College | L, 21-28",
 "Final Sep 19 Rutgers vs USC | L, 35-42",
 "Final Sep 25 Rutgers vs Howard | W, 58-7",
 "Final Oct 3 Rutgers vs Indiana | L, 15-47",
 "Upcoming Oct 17, 12:30 PM Rutgers at Maryland | ",
 "Upcoming Oct 24, 12:00 PM Rutgers at Northwestern | ",
 "Upcoming Oct 31 Rutgers vs Michigan | ",
 "Upcoming Nov 7 Rutgers at Wisconsin | ",
 "Upcoming Nov 14 Rutgers vs Nebraska | ",
 "Upcoming Nov 21 Rutgers at Penn State | ",
 "Upcoming Nov 28 Rutgers vs Michigan State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Rutgers at Boilermaker Classic | T7th",
 "Final Sep 7 Women's · Rutgers at Cougar Classic | 14th",
 "Final Sep 20 Women's · Rutgers at Mary Fossum Invitational | T4th",
 "Final Sep 25 Women's · Rutgers at Princeton Invitational | 3rd",
 "Final Oct 11 Women's · Rutgers at Doc Sauers Invitational | No team score (individuals only)",
 "Upcoming Oct 19 Women's · Rutgers at Dale McNamara Invitational | ",
 "Upcoming Oct 26 Women's · Rutgers at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Rutgers at New York Harbor Cup | Completed",
 "Final Sep 13 Men's · Rutgers at Canadian Collegiate | Completed",
 "Final Sep 20 Men's · Rutgers at Gopher Invitational | Completed",
 "Final Oct 5 Men's · Rutgers at Hamptons Intercollegiate | Completed",
 "Upcoming Oct 18 Men's · Rutgers at Quail Valley Collegiate Invitational | ",
 "Upcoming Oct 31 Men's · Rutgers at Steelwood Collegiate Invitational | ",
 "Upcoming Mar 7 Men's · Rutgers at Colleton River Collegiate | ",
 "Upcoming Mar 15 Men's · Rutgers at The Johnnie-O at Sea Island | ",
 "Upcoming Apr 5 Men's · Rutgers at Golfweek.com Invitational at Rolling Hills CC | ",
 "Upcoming Apr 12 Men's · Rutgers at Ford Collegiate | ",
 "Upcoming Apr 17 Men's · Rutgers at Rutgers Invitational | ",
 "Upcoming Apr 30 Men's · Rutgers at Big Ten Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 18 Women's · Rutgers vs Clemson (Exhibition) | ",
 "Upcoming Oct 24 Women's · Rutgers vs Colorado (Exhibition) | ",
 "Upcoming Oct 24 Women's · Rutgers vs Holy Cross (Exhibition) | ",
 "Upcoming Oct 24 Women's · Rutgers vs UConn (Exhibition) | ",
 "Upcoming Oct 24 Women's · Rutgers vs South Florida (Exhibition) | ",
 "Upcoming Oct 30 Women's · Rutgers vs Columbia (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Oct 24, 12:00 PM Men's · Rutgers vs Syracuse University (Exhibition) | ",
 "Upcoming Oct 30, 6:00 PM Men's · Rutgers vs University of Delaware (Exhibition) | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 18 Rutgers at Head Of The Charles | ",
 "Upcoming Nov 1 Rutgers at Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Rutgers at Tennessee | L, 1-4",
 "Final Aug 20 Women's · Rutgers at UConn | T, 0-0",
 "Final Aug 23 Women's · Rutgers at Fairfield | T, 0-0",
 "Final Aug 30 Women's · Rutgers vs Providence | T, 3-3",
 "Final Sep 6 Women's · Rutgers vs Princeton | W, 4-2",
 "Final Sep 10 Women's · Rutgers at Oregon | W, 1-0",
 "Final Sep 13 Women's · Rutgers at Washington | L, 0-1",
 "Final Sep 20 Women's · Rutgers vs Purdue | L, 1-2",
 "Final Sep 24 Women's · Rutgers vs UCLA | L, 0-1",
 "Final Sep 27 Women's · Rutgers vs Wisconsin | W, 3-1",
 "Final Oct 4 Women's · Rutgers at Iowa | L, 0-1",
 "Final Oct 8 Women's · Rutgers vs Northwestern | W, 3-2",
 "Final Oct 11 Women's · Rutgers vs Nebraska | T, 0-0",
 "Upcoming Oct 17, 4:00 PM Women's · Rutgers at Penn State | ",
 "Upcoming Oct 22, 7:00 PM Women's · Rutgers at Ohio State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Rutgers at Indiana | ",
 "Upcoming Oct 30, 7:00 PM Women's · Rutgers vs Maryland | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Rutgers at American | T, 0-0",
 "Final Aug 23 Men's · Rutgers at Georgetown | L, 1-2",
 "Final Aug 28 Men's · Rutgers vs Sacred Heart | W, 4-1",
 "Final Sep 4 Men's · Rutgers vs Seton Hall | L, 0-1",
 "Final Sep 7 Men's · Rutgers vs UC Santa Barbara | L, 0-1",
 "Final Sep 11 Men's · Rutgers vs UCLA | W, 3-1",
 "Final Sep 15 Men's · Rutgers vs Princeton | W, 2-0",
 "Final Sep 18 Men's · Rutgers at Ohio State | W, 2-1",
 "Final Sep 25 Men's · Rutgers at Washington | L, 1-4",
 "Final Oct 2 Men's · Rutgers vs Northwestern | W, 4-0",
 "Final Oct 6 Men's · Rutgers vs Maryland | L, 1-2",
 "Final Oct 10 Men's · Rutgers at Wisconsin | L, 0-1",
 "Upcoming Oct 16, 7:00 PM Men's · Rutgers vs Indiana | ",
 "Upcoming Oct 20, 7:00 PM Men's · Rutgers at Penn State | ",
 "Upcoming Oct 23, 7:00 PM Men's · Rutgers vs Michigan | ",
 "Upcoming Oct 30, 7:00 PM Men's · Rutgers at Michigan State | ",
 "Upcoming Nov 7 Men's · Rutgers at Big Ten Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 17, 12:00 PM Rutgers vs Rider | ",
 "Upcoming Oct 18, 12:00 PM Rutgers vs Seton Hall | ",
 "Upcoming Oct 24, 12:00 PM Rutgers vs Iona | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Rutgers at Rutgers Preseason Invitational | Completed",
 "Upcoming Oct 16, 5:00 PM Women's · Rutgers at Liberty & James Madison | ",
 "Upcoming Oct 30, 6:00 PM Women's · Rutgers vs Princeton | ",
 "Upcoming Nov 6, 4:00 PM Women's · Rutgers at Queens and Vanderbilt | ",
 "Upcoming Nov 17 Women's · Rutgers at Hawkeye Invitational | ",
 "Upcoming Dec 2 Women's · Rutgers at Golden Grizzly Classic | ",
 "Upcoming Dec 2 Women's · Rutgers at European Short Course Championships | ",
 "Upcoming Dec 9 Women's · Rutgers at Winter Junior Nationals | ",
 "Upcoming Dec 9 Women's · Rutgers at Diving Nationals | ",
 "Upcoming Jan 23, 4:00 PM Women's · Rutgers at Columbia | ",
 "Upcoming Jan 29, 5:00 PM Women's · Rutgers vs Nebraska | ",
 "Upcoming Feb 6, 11:00 AM Women's · Rutgers at Platform Invitational | ",
 "Upcoming Feb 17 Women's · Rutgers at Big Ten Championships | ",
 "Upcoming Feb 26 Women's · Rutgers at ECAC Championships | ",
 "Upcoming Mar 8 Women's · Rutgers at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 17 Women's · Rutgers at NCAA Championships | ",
 "Upcoming Apr 1 Women's · Rutgers at Swedish Swim Open | ",
 "Upcoming Apr 10 Women's · Rutgers at USA Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Rutgers at Bulldog Invitational | Completed",
 "Final Sep 19 Rutgers at ITA All-Americans | Completed",
 "Final Oct 1 Rutgers at 49er Invite | Completed",
 "Upcoming Oct 15 Rutgers at ITA Regionals | ",
 "Upcoming Nov 5 Rutgers at ITA Sectional Championships | ",
 "Upcoming Nov 6 Rutgers at Big Green Invitational | ",
 "Upcoming Nov 17 Rutgers at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Rutgers vs Purdue Fort Wayne | L, 2-3",
 "Final Aug 28 Rutgers at Bellarmine | W, 3-1",
 "Final Aug 29 Rutgers vs Evansville | W, 3-1",
 "Final Sep 1 Rutgers vs Arkansas | W, 3-0",
 "Final Sep 2 Rutgers at Vanderbilt | L, 1-3",
 "Final Sep 8 Rutgers vs LIU | W, 3-1",
 "Final Sep 10 Rutgers vs Stony Brook | W, 3-0",
 "Final Sep 11 Rutgers vs Delaware | W, 3-1",
 "Final Sep 12 Rutgers vs Rider | W, 3-0",
 "Final Sep 18 Rutgers vs Bryant | W, 3-2",
 "Final Sep 18 Rutgers vs Penn | L, 1-3",
 "Final Sep 19 Rutgers at St. John's | W, 3-2",
 "Final Sep 25 Rutgers at Nebraska | L, 0-3",
 "Final Sep 26 Rutgers at Iowa | L, 0-3",
 "Final Oct 1 Rutgers at Ohio State | W, 3-0",
 "Final Oct 4 Rutgers vs Indiana | L, 1-3",
 "Final Oct 9 Rutgers vs Minnesota | L, 1-3",
 "Final Oct 10 Rutgers vs UCLA | L, 1-3",
 "Upcoming Oct 16, 10:00 PM Rutgers at Washington | ",
 "Upcoming Oct 18, 4:00 PM Rutgers at Oregon | ",
 "Upcoming Oct 23, 7:00 PM Rutgers vs Michigan State | ",
 "Upcoming Oct 24, 7:00 PM Rutgers vs Illinois | ",
 "Upcoming Oct 29, 7:00 PM Rutgers at Purdue | ",
 "Upcoming Oct 31, 8:00 PM Rutgers at Northwestern | ",
 "Upcoming Nov 5, 7:00 PM Rutgers vs Michigan | ",
 "Upcoming Nov 7, 1:00 PM Rutgers vs USC | ",
 "Upcoming Nov 12, 6:00 PM Rutgers vs Wisconsin | ",
 "Upcoming Nov 13, 7:00 PM Rutgers vs Maryland | ",
 "Upcoming Nov 17, 7:00 PM Rutgers at Penn State | ",
 "Upcoming Nov 20 Rutgers at Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7, 2:00 PM Rutgers at LIU | ",
 "Upcoming Nov 7, 4:00 PM Rutgers at Navy | ",
 "Upcoming Nov 15 Rutgers vs Lehigh | ",
 "Upcoming Nov 22 Rutgers at Keystone Classic | ",
 "Upcoming Dec 4, 7:00 PM Rutgers at Drexel | ",
 "Upcoming Dec 12 Rutgers at National Duals Invitational | ",
 "Upcoming Jan 7 Rutgers vs Rider | ",
 "Upcoming Jan 9 Rutgers vs Penn State | ",
 "Upcoming Jan 15 Rutgers at Nebraska | ",
 "Upcoming Jan 17 Rutgers vs Indiana | ",
 "Upcoming Jan 22 Rutgers at Wisconsin | ",
 "Upcoming Jan 24 Rutgers at Minnesota | ",
 "Upcoming Jan 30 Rutgers vs American | ",
 "Upcoming Feb 5 Rutgers vs Northwestern | ",
 "Upcoming Feb 7 Rutgers vs Iowa | ",
 "Upcoming Feb 12 Rutgers at Maryland | ",
 "Upcoming Feb 14 Rutgers at Princeton University | ",
 "Upcoming Feb 16 Rutgers vs Hofstra | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Golf: the cards publish no place; the final story gives the team's
// ("Team Finishes 5th", "RU Finishes Tied for 5th Overall" in the 13-team
// field, "Finishes in 3rd of 15 Teams", "Completes Stellar 2nd-Place Finish"
// in the 12-team field). The Gopher story's "Related News" lists the
// Hamptons headline; a player's finish (Doc Sauers, individuals only) is not
// the team's.
{
  const text=name=>fixture(name).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ');
  assert.deepEqual(['recap-2026-9-1-espensahde-leads-mens-golf-with-top-10-f','recap-2026-9-15-mens-golf-espenshade-leads-scarlet-knigh','recap-2026-9-21-mens-golf-finishes-in-3rd-of-15-teams-at','recap-2026-10-6-espenshade-leads-mens-golf-at-hamptons-i','recap-2026-10-12-womens-golf-rossettin-finishes-second-at'].map(name=>rutgersGolfStoryPlace(text(`${name}.html.gz`))),["5th","T5th of 13","3rd of 15","2nd of 12",null]);
}

// Tennis: the ITA All-Americans card (Sep 19-20) links the Bulldog
// Invitational's story on its last day; "ITA" is not a word of that story's
// address, so the tournament keeps no story (and is not listed without one).
assert.deepEqual(parse('Tennis','womens-tennis').filter(e=>e.status==='Final').map(e=>[e.opponent,e.recap_url?.replace(/^.*\/news\//,'')||null]),[["Bulldog Invitational","2026/9/20/womens-tennis-tennis-concludes-play-at-bulldog-invitational"],["ITA All-Americans",null],["49er Invite","2026/10/4/womens-tennis-tennis-completes-weekend-at-49er-invite"]]);

// Records: the app's Overall and Conf. records equal the ones each page
// publishes (football 1-4/0-2, volleyball 10-8/1-5, women's soccer
// 4-5-4/3-4-1, men's soccer 5-6-1/3-3, field hockey 7-6/1-2).
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey']].map(([sport,slug])=>records(sport,slug)),[["1-4","0-2"],["10-8","1-5"],["4-5-4","3-4-1"],["5-6-1","3-3"],["7-6","1-2"]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Rutgers module checks passed');
