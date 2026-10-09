import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ohioStateSchool,ohioStateShortName} from '../src/schools/ohio-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ohio-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ohioStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ohio-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ohiostatebuckeyes.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ohio-state'];
assert.equal(sports.length,19);
for(const [name,map] of [['schedule',ohioStateSchool.scheduleUrls],['roster',ohioStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ohio-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ohiostatebuckeyes.com',`${key} must stay on ohiostatebuckeyes.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ohiostatebuckeyes.com/sports/baseball/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ohiostatebuckeyes.com/sports/mens-basketball/schedule","https://ohiostatebuckeyes.com/sports/womens-basketball/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/mens-basketball/roster","https://ohiostatebuckeyes.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-cross-country/schedule","https://ohiostatebuckeyes.com/sports/mens-cross-country/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-cross-country/roster","https://ohiostatebuckeyes.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://ohiostatebuckeyes.com/sports/fencing/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://ohiostatebuckeyes.com/sports/field-hockey/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://ohiostatebuckeyes.com/sports/football/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-golf/schedule","https://ohiostatebuckeyes.com/sports/mens-golf/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-golf/roster","https://ohiostatebuckeyes.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-gymnastics/schedule","https://ohiostatebuckeyes.com/sports/mens-gymnastics/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-gymnastics/roster","https://ohiostatebuckeyes.com/sports/mens-gymnastics/roster"],"combined":true},"Hockey":{"schedule":["https://ohiostatebuckeyes.com/sports/mens-ice-hockey/schedule","https://ohiostatebuckeyes.com/sports/womens-ice-hockey/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/mens-ice-hockey/roster","https://ohiostatebuckeyes.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-lacrosse/schedule","https://ohiostatebuckeyes.com/sports/mens-lacrosse/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-lacrosse/roster","https://ohiostatebuckeyes.com/sports/mens-lacrosse/roster"],"combined":true},"Rifle":{"schedule":["https://ohiostatebuckeyes.com/sports/rifle/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/rifle/roster"],"combined":false},"Rowing":{"schedule":["https://ohiostatebuckeyes.com/sports/rowing/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-soccer/schedule","https://ohiostatebuckeyes.com/sports/mens-soccer/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-soccer/roster","https://ohiostatebuckeyes.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ohiostatebuckeyes.com/sports/softball/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-swim-dive/schedule","https://ohiostatebuckeyes.com/sports/mens-swim-dive/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-swim-dive/roster","https://ohiostatebuckeyes.com/sports/mens-swim-dive/roster"],"combined":true},"Tennis":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-tennis/schedule","https://ohiostatebuckeyes.com/sports/mens-tennis/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-tennis/roster","https://ohiostatebuckeyes.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-track-field/schedule","https://ohiostatebuckeyes.com/sports/mens-track-field/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-track-field/roster","https://ohiostatebuckeyes.com/sports/mens-track-field/roster"],"combined":true},"Volleyball":{"schedule":["https://ohiostatebuckeyes.com/sports/womens-volleyball/schedule","https://ohiostatebuckeyes.com/sports/mens-volleyball/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/womens-volleyball/roster","https://ohiostatebuckeyes.com/sports/mens-volleyball/roster"],"combined":true},"Wrestling":{"schedule":["https://ohiostatebuckeyes.com/sports/wrestling/schedule"],"roster":["https://ohiostatebuckeyes.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ohio-state|"+sport+"':"),`${sport} routes must live in the Ohio State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://ohiostatebuckeyes.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ohioStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ohio-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 16, 4:00 PM Ohio State at Miami (OH) (Exhibition) | ",
 "Upcoming Oct 17, 5:00 PM Ohio State vs Dayton (Exhibition) | ",
 "Upcoming Mar 19 Ohio State at Illinois | ",
 "Upcoming Mar 20 Ohio State at Illinois | ",
 "Upcoming Mar 21 Ohio State at Illinois | ",
 "Upcoming Mar 26 Ohio State vs Washington | ",
 "Upcoming Mar 27 Ohio State vs Washington | ",
 "Upcoming Mar 28 Ohio State vs Washington | ",
 "Upcoming Apr 2 Ohio State at Oregon | ",
 "Upcoming Apr 3 Ohio State at Oregon | ",
 "Upcoming Apr 4 Ohio State at Oregon | ",
 "Upcoming Apr 9 Ohio State vs Michigan | ",
 "Upcoming Apr 10 Ohio State vs Michigan | ",
 "Upcoming Apr 11 Ohio State vs Michigan | ",
 "Upcoming Apr 16 Ohio State vs Northwestern | ",
 "Upcoming Apr 17 Ohio State vs Northwestern | ",
 "Upcoming Apr 18 Ohio State vs Northwestern | ",
 "Upcoming Apr 23 Ohio State at Michigan State | ",
 "Upcoming Apr 24 Ohio State at Michigan State | ",
 "Upcoming Apr 25 Ohio State at Michigan State | ",
 "Upcoming Apr 30 Ohio State vs Iowa | ",
 "Upcoming May 1 Ohio State vs Iowa | ",
 "Upcoming May 2 Ohio State vs Iowa | ",
 "Upcoming May 7 Ohio State at Maryland | ",
 "Upcoming May 8 Ohio State at Maryland | ",
 "Upcoming May 9 Ohio State at Maryland | ",
 "Upcoming May 14 Ohio State vs Indiana | ",
 "Upcoming May 15 Ohio State vs Indiana | ",
 "Upcoming May 16 Ohio State vs Indiana | ",
 "Upcoming May 20 Ohio State at Nebraska | ",
 "Upcoming May 21 Ohio State at Nebraska | ",
 "Upcoming May 22 Ohio State at Nebraska | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 7 Men's · Ohio State vs Cincinnati (Exhibition) | L, 68-79",
 "Upcoming Oct 25, 2:00 PM Men's · Ohio State vs Butler (Exhibition) | ",
 "Upcoming Nov 2, 9:00 PM Men's · Ohio State vs BYU | ",
 "Upcoming Nov 6, 6:30 PM Men's · Ohio State vs Youngstown State | ",
 "Upcoming Nov 9, 6:00 PM Men's · Ohio State vs Marshall | ",
 "Upcoming Nov 13, 7:30 PM Men's · Ohio State at Connecticut | ",
 "Upcoming Nov 16, 6:30 PM Men's · Ohio State vs Prairie View A&M | ",
 "Upcoming Nov 19, 7:00 PM Men's · Ohio State vs UMBC | ",
 "Upcoming Nov 24, 7:00 PM Men's · Ohio State vs Vanderbilt | ",
 "Upcoming Nov 29, 5:30 PM Men's · Ohio State vs Lipscomb | ",
 "Upcoming Dec 2, 8:30 PM Men's · Ohio State at Nebraska | ",
 "Upcoming Dec 6, 12:00 PM Men's · Ohio State vs Maryland | ",
 "Upcoming Dec 12 Men's · Ohio State at Notre Dame | ",
 "Upcoming Dec 15, 6:00 PM Men's · Ohio State vs Stony Brook | ",
 "Upcoming Dec 19, 12:00 PM Men's · Ohio State vs Kansas | ",
 "Upcoming Dec 22, 4:00 PM Men's · Ohio State vs Mississippi Valley State | ",
 "Upcoming Dec 30, 4:00 PM Men's · Ohio State vs Oregon | ",
 "Upcoming Jan 2, 12:00 PM Men's · Ohio State at Iowa | ",
 "Upcoming Jan 6, 6:30 PM Men's · Ohio State vs Northwestern | ",
 "Upcoming Jan 9, 4:00 PM Men's · Ohio State at Illinois | ",
 "Upcoming Jan 12, 8:00 PM Men's · Ohio State at Purdue | ",
 "Upcoming Jan 17, 12:00 PM Men's · Ohio State vs Penn State | ",
 "Upcoming Jan 23, 1:00 PM Men's · Ohio State vs Michigan State | ",
 "Upcoming Jan 26, 6:00 PM Men's · Ohio State vs Iowa | ",
 "Upcoming Jan 30 Men's · Ohio State at Michigan | ",
 "Upcoming Feb 6, 12:00 PM Men's · Ohio State at Penn State | ",
 "Upcoming Feb 9, 8:30 PM Men's · Ohio State vs Wisconsin | ",
 "Upcoming Feb 14, 1:00 PM Men's · Ohio State vs Washington | ",
 "Upcoming Feb 17, 11:00 PM Men's · Ohio State at UCLA | ",
 "Upcoming Feb 20, 3:00 PM Men's · Ohio State at USC | ",
 "Upcoming Feb 25, 6:30 PM Men's · Ohio State vs Rutgers | ",
 "Upcoming Feb 28, 3:45 PM Men's · Ohio State at Indiana | ",
 "Upcoming Mar 4, 8:30 PM Men's · Ohio State at Minnesota | ",
 "Upcoming Mar 7, 2:15 PM Men's · Ohio State vs Michigan | ",
 "Upcoming Mar 9 Men's · Ohio State at Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Ohio State vs UIC | ",
 "Upcoming Nov 5, 6:30 PM Women's · Ohio State vs Central Michigan | ",
 "Upcoming Nov 8, 1:00 PM Women's · Ohio State vs Mercyhurst | ",
 "Upcoming Nov 12, 6:30 PM Women's · Ohio State vs UCONN | ",
 "Upcoming Nov 15, 1:00 PM Women's · Ohio State vs FDU | ",
 "Upcoming Nov 18, 7:00 PM Women's · Ohio State vs Ole Miss | ",
 "Upcoming Nov 22, 1:00 PM Women's · Ohio State vs Texas | ",
 "Upcoming Nov 28, 12:00 PM Women's · Ohio State vs VCU | ",
 "Upcoming Dec 2, 6:30 PM Women's · Ohio State vs Akron | ",
 "Upcoming Dec 5, 12:00 PM Women's · Ohio State at Rutgers | ",
 "Upcoming Dec 9, 6:30 PM Women's · Ohio State vs Grand Valley State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Ohio State vs Canisius | ",
 "Upcoming Dec 16, 6:30 PM Women's · Ohio State vs Miami (OH) | ",
 "Upcoming Dec 20, 8:30 PM Women's · Ohio State vs Stanford | ",
 "Upcoming Dec 29, 6:30 PM Women's · Ohio State vs Oregon | ",
 "Upcoming Jan 2, 4:00 PM Women's · Ohio State vs Maryland | ",
 "Upcoming Jan 7, 7:00 PM Women's · Ohio State at Michigan | ",
 "Upcoming Jan 10 Women's · Ohio State at Wisconsin | ",
 "Upcoming Jan 13, 6:30 PM Women's · Ohio State vs Illinois | ",
 "Upcoming Jan 17, 12:00 PM Women's · Ohio State at Nebraska | ",
 "Upcoming Jan 21, 7:00 PM Women's · Ohio State at Maryland | ",
 "Upcoming Jan 24, 2:00 PM Women's · Ohio State vs Minnesota | ",
 "Upcoming Jan 28, 6:30 PM Women's · Ohio State vs Northwestern | ",
 "Upcoming Jan 31 Women's · Ohio State at Penn State | ",
 "Upcoming Feb 3 Women's · Ohio State at Indiana | ",
 "Upcoming Feb 7, 1:00 PM Women's · Ohio State vs Michigan State | ",
 "Upcoming Feb 10, 6:30 PM Women's · Ohio State vs Washington | ",
 "Upcoming Feb 18, 10:30 PM Women's · Ohio State at UCLA | ",
 "Upcoming Feb 21, 4:00 PM Women's · Ohio State at USC | ",
 "Upcoming Feb 24, 7:00 PM Women's · Ohio State vs Purdue | ",
 "Upcoming Feb 28, 12:00 PM Women's · Ohio State vs Iowa | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Ohio State at Mike Baumer Cross Country Classic | 1st of 13",
 "Final Sep 11 Women's · Ohio State at Spartan Invite | 6th",
 "Final Oct 2 Women's · Ohio State at Paul Short Run | 24th",
 "Upcoming Oct 16 Women's · Ohio State at Arturo Barrios Invitational | ",
 "Upcoming Oct 30 Women's · Ohio State at Big Ten Championships | ",
 "Upcoming Nov 13 Women's · Ohio State at NCAA Great Lakes Regional Championships | ",
 "Upcoming Nov 21 Women's · Ohio State at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Ohio State at Mike Baumer Cross Country Classic | 1st of 9",
 "Final Sep 11 Men's · Ohio State at Spartan Invite | 3rd",
 "Upcoming Oct 16 Men's · Ohio State at Arturo Barrios Invitational | ",
 "Upcoming Oct 30 Men's · Ohio State at Big Ten Championships | ",
 "Upcoming Nov 13 Men's · Ohio State at NCAA Great Lakes Regional Championships | ",
 "Upcoming Nov 21 Men's · Ohio State at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Final Oct 3 Ohio State at OSU Open | Completed",
 "Final Oct 4 Ohio State at OSU Duals | M: 5-0; W:4-0",
 "Upcoming Nov 7 Ohio State at Western Invitational | ",
 "Upcoming Nov 14 Ohio State at Elite Invitational | ",
 "Upcoming Jan 16 Ohio State at St. John's Super Cup | ",
 "Upcoming Jan 17 Ohio State at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 30 Ohio State at Schiller Duals | ",
 "Upcoming Feb 20 Ohio State at CCFC Championships | ",
 "Upcoming Mar 14 Ohio State at NCAA Midwest Regionals | ",
 "Upcoming Mar 25 Ohio State at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Ohio State vs Old Dominion | L, 2-3",
 "Final Aug 30 Ohio State vs Bellarmine | W, 2-0",
 "Final Sep 4 Ohio State vs Syracuse | L, 2-3",
 "Final Sep 6 Ohio State vs Virginia | W, 2-1",
 "Final Sep 11 Ohio State vs Delaware | W, 4-3",
 "Final Sep 13 Ohio State vs Cornell | W, 2-0",
 "Final Sep 20 Ohio State vs Boston College | L, 2-3",
 "Final Sep 25 Ohio State at Iowa | L, 1-4",
 "Final Sep 27 Ohio State at Iowa | L, 2-3",
 "Final Oct 2 Ohio State vs Northwestern | L, 0-5",
 "Final Oct 4 Ohio State vs Indiana | L, 1-2",
 "Today Oct 9, 1:00 PM Ohio State vs Rutgers | ",
 "Upcoming Oct 16, 5:00 PM Ohio State at Penn State | ",
 "Upcoming Oct 18, 12:00 PM Ohio State at Maryland | ",
 "Upcoming Oct 23, 3:00 PM Ohio State vs Michigan State | ",
 "Upcoming Oct 25, 1:00 PM Ohio State at Kent State | ",
 "Upcoming Oct 30, 5:00 PM Ohio State at Michigan | ",
 "Upcoming Nov 4 Ohio State at Big Ten Tournament | ",
 "Upcoming Nov 13 Ohio State at NCAA Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Ohio State vs Ball State | W, 56-3",
 "Final Sep 12 Ohio State at Texas | L, 23-24",
 "Final Sep 19 Ohio State vs Kent State | W, 59-3",
 "Final Sep 26 Ohio State vs Illinois | W, 42-19",
 "Final Oct 3 Ohio State at Iowa | W, 31-14",
 "Upcoming Oct 10, 4:15 PM Ohio State vs Maryland | ",
 "Upcoming Oct 17 Ohio State at Indiana | ",
 "Upcoming Oct 31 Ohio State at USC | ",
 "Upcoming Nov 7 Ohio State vs Oregon | ",
 "Upcoming Nov 14 Ohio State vs Northwestern | ",
 "Upcoming Nov 21 Ohio State at Nebraska | ",
 "Upcoming Nov 28, 12:00 PM Ohio State vs Michigan | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Ohio State at Roseann Schwartz Invitational | 1st of 11",
 "Final Sep 7 Women's · Ohio State at Folds of Honor Collegiate | 6th of 12",
 "Final Sep 14 Women's · Ohio State at Toledo Rocket Classic (Individuals) | Completed",
 "Final Oct 5 Women's · Ohio State at Barbara Nicklaus Cup | 1st of 4",
 "Upcoming Oct 12 Women's · Ohio State at Haskins Women’s Intercollegiate | ",
 "Upcoming Oct 19 Women's · Ohio State at Dayton Flyer Invitational (Individuals) | ",
 "Upcoming Jan 31 Women's · Ohio State at Therese Hession Regional Challenge | ",
 "Upcoming Feb 14 Women's · Ohio State at Spartan Suncoast Invitational | ",
 "Upcoming Mar 1 Women's · Ohio State at Darius Rucker Invitational | ",
 "Upcoming Mar 21 Women's · Ohio State at Clemson Invitational | ",
 "Upcoming Apr 17 Women's · Ohio State at Therese Hession Buckeye Invitational | ",
 "Upcoming Apr 23 Women's · Ohio State at Big Ten Championship | ",
 "Upcoming May 10 Women's · Ohio State at NCAA Regional | ",
 "Upcoming May 21 Women's · Ohio State at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Ohio State at Folds of Honor Collegiate | 6th of 14",
 "Final Sep 13 Men's · Ohio State at Inverness Invitational | 5th of 18",
 "Final Oct 5 Men's · Ohio State at Barbara Nicklaus Cup | 1st of 4",
 "Upcoming Oct 17 Men's · Ohio State at Fallen Oak Collegiate | ",
 "Upcoming Oct 26 Men's · Ohio State at Cal Poly Collegiate | ",
 "Upcoming Feb 14 Men's · Ohio State at Watersound Invitational | ",
 "Upcoming Mar 7 Men's · Ohio State at Colleton River Collegiate | ",
 "Upcoming Mar 15 Men's · Ohio State at Pauma Valley Invitational | ",
 "Upcoming Apr 9 Men's · Ohio State at Robert Kepler Invitational | ",
 "Upcoming Apr 17 Men's · Ohio State at Spring Boilermaker | ",
 "Upcoming Apr 30 Men's · Ohio State at Big Ten Championship | ",
 "Upcoming May 17 Men's · Ohio State at NCAA Regional | ",
 "Upcoming May 28 Men's · Ohio State at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Today Oct 9, 7:00 PM Men's · Ohio State at RPI | ",
 "Upcoming Oct 10, 7:00 PM Men's · Ohio State at RPI | ",
 "Upcoming Oct 16, 7:00 PM Men's · Ohio State at Sacred Heart | ",
 "Upcoming Oct 17, 7:00 PM Men's · Ohio State at Sacred Heart | ",
 "Upcoming Oct 23, 6:30 PM Men's · Ohio State vs Augustana | ",
 "Upcoming Oct 24, 5:00 PM Men's · Ohio State vs Augustana | ",
 "Upcoming Oct 31 Men's · Ohio State vs Michigan | ",
 "Upcoming Nov 1 Men's · Ohio State vs Michigan | ",
 "Upcoming Nov 13 Men's · Ohio State at Wisconsin | ",
 "Upcoming Nov 14 Men's · Ohio State at Wisconsin | ",
 "Upcoming Nov 20 Men's · Ohio State vs Notre Dame | ",
 "Upcoming Nov 21 Men's · Ohio State vs Notre Dame | ",
 "Upcoming Nov 27, 7:00 PM Men's · Ohio State at Union | ",
 "Upcoming Nov 28, 5:00 PM Men's · Ohio State at Union | ",
 "Upcoming Dec 3 Men's · Ohio State vs Michigan State | ",
 "Upcoming Dec 4 Men's · Ohio State vs Michigan State | ",
 "Upcoming Dec 11, 6:30 PM Men's · Ohio State vs UConn | ",
 "Upcoming Dec 12, 5:00 PM Men's · Ohio State vs UConn | ",
 "Upcoming Jan 8 Men's · Ohio State at Penn State | ",
 "Upcoming Jan 9 Men's · Ohio State at Penn State | ",
 "Upcoming Jan 15 Men's · Ohio State vs Minnesota | ",
 "Upcoming Jan 16 Men's · Ohio State vs Minnesota | ",
 "Upcoming Jan 22 Men's · Ohio State at Michigan | ",
 "Upcoming Jan 23 Men's · Ohio State at Michigan | ",
 "Upcoming Jan 29 Men's · Ohio State vs Wisconsin | ",
 "Upcoming Jan 30 Men's · Ohio State vs Wisconsin | ",
 "Upcoming Feb 5 Men's · Ohio State at Notre Dame | ",
 "Upcoming Feb 6 Men's · Ohio State at Notre Dame | ",
 "Upcoming Feb 19 Men's · Ohio State at Minnesota | ",
 "Upcoming Feb 20 Men's · Ohio State at Minnesota | ",
 "Upcoming Feb 26 Men's · Ohio State vs Penn State | ",
 "Upcoming Feb 27 Men's · Ohio State vs Penn State | ",
 "Upcoming Mar 4 Men's · Ohio State at Michigan State | ",
 "Upcoming Mar 5 Men's · Ohio State at Michigan State | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 24 Women's · Ohio State at Penn State | W, 2-1",
 "Final Sep 25 Women's · Ohio State at Penn State | W, 2-1",
 "Final Oct 2 Women's · Ohio State at St. Thomas | W, 5-2",
 "Final Oct 3 Women's · Ohio State at St. Thomas | W, 5-2",
 "Today Oct 9, 6:00 PM Women's · Ohio State vs Wisconsin | ",
 "Upcoming Oct 10, 3:00 PM Women's · Ohio State vs Wisconsin | ",
 "Upcoming Oct 16, 7:00 PM Women's · Ohio State at Minnesota | ",
 "Upcoming Oct 17, 3:00 PM Women's · Ohio State at Minnesota | ",
 "Upcoming Oct 23, 6:00 PM Women's · Ohio State vs Colgate | ",
 "Upcoming Oct 24, 3:00 PM Women's · Ohio State vs Colgate | ",
 "Upcoming Oct 30, 6:00 PM Women's · Ohio State vs Bemidji State | ",
 "Upcoming Oct 31, 3:00 PM Women's · Ohio State vs Bemidji State | ",
 "Upcoming Nov 13, 6:00 PM Women's · Ohio State vs Minnesota Duluth | ",
 "Upcoming Nov 14, 2:00 PM Women's · Ohio State vs Minnesota Duluth | ",
 "Upcoming Nov 20, 7:00 PM Women's · Ohio State at St. Cloud State | ",
 "Upcoming Nov 21, 2:00 PM Women's · Ohio State at St. Cloud State | ",
 "Upcoming Dec 4, 6:00 PM Women's · Ohio State vs Minnesota State | ",
 "Upcoming Dec 5, 3:00 PM Women's · Ohio State vs Minnesota State | ",
 "Upcoming Jan 1, 2:00 PM Women's · Ohio State at Yale | ",
 "Upcoming Jan 2, 2:00 PM Women's · Ohio State at Yale | ",
 "Upcoming Jan 8, 4:00 PM Women's · Ohio State at Minnesota Duluth | ",
 "Upcoming Jan 9, 3:00 PM Women's · Ohio State at Minnesota Duluth | ",
 "Upcoming Jan 15, 4:00 PM Women's · Ohio State at Bemidji State | ",
 "Upcoming Jan 16, 3:00 PM Women's · Ohio State at Bemidji State | ",
 "Upcoming Jan 22, 6:00 PM Women's · Ohio State vs Minnesota | ",
 "Upcoming Jan 23, 3:00 PM Women's · Ohio State vs Minnesota | ",
 "Upcoming Jan 29, 4:00 PM Women's · Ohio State at Minnesota State | ",
 "Upcoming Jan 30, 3:00 PM Women's · Ohio State at Minnesota State | ",
 "Upcoming Feb 5, 6:00 PM Women's · Ohio State vs St. Cloud State | ",
 "Upcoming Feb 6, 3:00 PM Women's · Ohio State vs St. Cloud State | ",
 "Upcoming Feb 12, 6:00 PM Women's · Ohio State vs St. Thomas | ",
 "Upcoming Feb 13, 1:00 PM Women's · Ohio State vs St. Thomas | ",
 "Upcoming Feb 18 Women's · Ohio State at Wisconsin | ",
 "Upcoming Feb 20 Women's · Ohio State vs Wisconsin | ",
 "Upcoming Feb 28 Women's · Ohio State vs TBD (If Necessary) | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Today Oct 9, 5:30 PM Women's · Ohio State vs Louisville (Exhibition) | ",
 "Upcoming Oct 24 Women's · Ohio State at North Carolina Play Day (UNC, Davidson) (Exhibition) | ",
 "Upcoming Oct 25 Women's · Ohio State at Duke (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Mar 27 Men's · Ohio State vs Rutgers | ",
 "Upcoming Apr 3 Men's · Ohio State at Penn State | ",
 "Upcoming Apr 10 Men's · Ohio State vs Maryland | ",
 "Upcoming Apr 17 Men's · Ohio State at Johns Hopkins | ",
 "Upcoming Apr 24 Men's · Ohio State at Michigan | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 26 Ohio State at Ole Miss | L, 4651-4711",
 "Final Sep 26 Ohio State at UT Martin | W, 4651-4597",
 "Final Oct 3 Ohio State vs Nebraska | L, 4675-4730",
 "Final Oct 4 Ohio State vs TCU | L, 4684-4724",
 "Final Oct 4 Ohio State vs Navy | L, 4684-4743",
 "Upcoming Oct 16 Ohio State at Alaska Fairbanks | ",
 "Upcoming Oct 17 Ohio State at Alaska Fairbanks | ",
 "Upcoming Oct 31 Ohio State at Murray State | ",
 "Upcoming Oct 31 Ohio State at Texas at El Paso | ",
 "Upcoming Nov 8 Ohio State at Massachusetts Institute of Technology | ",
 "Upcoming Nov 21 Ohio State at Texas at El Paso | ",
 "Upcoming Nov 22 Ohio State at Texas at El Paso | ",
 "Upcoming Jan 17 Ohio State at TCU | ",
 "Upcoming Jan 18 Ohio State at TCU | ",
 "Upcoming Jan 23 Ohio State at Mt. Aloysius | ",
 "Upcoming Jan 23 Ohio State at Morehead State | ",
 "Upcoming Jan 24 Ohio State at Mt. Aloysius | ",
 "Upcoming Jan 24 Ohio State at Morehead State | ",
 "Upcoming Jan 31 Ohio State at Akron | ",
 "Upcoming Feb 5 Ohio State at Patriot Rifle Conference Championship | ",
 "Upcoming Feb 20 Ohio State at NCAA Qualifier | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Ohio State at Clemson | T, 0-0",
 "Final Aug 20 Women's · Ohio State vs Kansas | W, 1-0",
 "Final Aug 27 Women's · Ohio State vs Kentucky | W, 2-1",
 "Final Sep 3 Women's · Ohio State vs Princeton | W, 4-0",
 "Final Sep 6 Women's · Ohio State vs Memphis | W, 3-1",
 "Final Sep 10 Women's · Ohio State vs Penn State | W, 1-0",
 "Final Sep 13 Women's · Ohio State at Indiana | W, 3-0",
 "Final Sep 17 Women's · Ohio State at UCLA | L, 0-1",
 "Final Sep 24 Women's · Ohio State vs USC | W, 2-0",
 "Final Sep 27 Women's · Ohio State vs Iowa | W, 3-1",
 "Final Oct 3 Women's · Ohio State vs Northwestern | W, 3-0",
 "Final Oct 8 Women's · Ohio State at Wisconsin | W, 3-2",
 "Upcoming Oct 11, 2:00 PM Women's · Ohio State at Minnesota | ",
 "Upcoming Oct 18, 1:00 PM Women's · Ohio State at Purdue | ",
 "Upcoming Oct 22, 7:00 PM Women's · Ohio State vs Rutgers | ",
 "Upcoming Oct 25, 12:00 PM Women's · Ohio State vs Illinois | ",
 "Upcoming Oct 30, 7:00 PM Women's · Ohio State at Michigan | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Ohio State vs Virginia Tech | W, 1-0",
 "Final Aug 24 Men's · Ohio State vs DePaul | W, 6-0",
 "Final Aug 28 Men's · Ohio State vs Memphis | W, 2-0",
 "Final Sep 3 Men's · Ohio State vs Northern Kentucky | W, 5-0",
 "Final Sep 8 Men's · Ohio State at Kentucky | W, 4-1",
 "Final Sep 11 Men's · Ohio State at Wisconsin | T, 1-1",
 "Final Sep 18 Men's · Ohio State vs Rutgers | L, 1-2",
 "Final Sep 21 Men's · Ohio State vs Washington | L, 0-4",
 "Final Sep 25 Men's · Ohio State at George Mason | T, 1-1",
 "Final Oct 2 Men's · Ohio State at Penn State | W, 2-1",
 "Upcoming Oct 10, 9:00 PM Men's · Ohio State at UCLA | ",
 "Upcoming Oct 16, 7:00 PM Men's · Ohio State vs Michigan State | ",
 "Upcoming Oct 20, 7:00 PM Men's · Ohio State vs Indiana | ",
 "Upcoming Oct 24, 7:00 PM Men's · Ohio State at Maryland | ",
 "Upcoming Oct 30, 7:00 PM Men's · Ohio State vs Northwestern | ",
 "Upcoming Nov 4, 8:00 PM Men's · Ohio State at Michigan | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 9, 4:00 PM Ohio State vs Cuyahoga Community College | ",
 "Today Oct 9, 6:00 PM Ohio State vs Mercyhurst | ",
 "Upcoming Oct 15, 5:00 PM Ohio State vs Ohio Dominican | ",
 "Upcoming Oct 23, 5:00 PM Ohio State vs Danville Community College | "
]);
  const v_womensswimdive=parse("Swimming & Diving","womens-swim-dive");
  assert.deepEqual(v_womensswimdive.map(line),[
 "Final Sep 24 Women's · Ohio State at Indiana | Completed",
 "Final Sep 24 Women's · Ohio State at Louisville | Completed",
 "Final Sep 24 Women's · Ohio State at Michigan | Completed",
 "Final Oct 2 Women's · Ohio State at Stanford | Completed",
 "Final Oct 2 Women's · Ohio State at California | Completed",
 "Final Oct 2 Women's · Ohio State at Auburn | Completed",
 "Upcoming Oct 10, 10:30 AM Women's · Ohio State vs Alumni Meet (Exhibition) | ",
 "Upcoming Oct 16 Women's · Ohio State at Zips Classic | ",
 "Upcoming Nov 6, 5:00 PM Women's · Ohio State at Kentucky | ",
 "Upcoming Nov 17 Women's · Ohio State at Ohio State Fall Invitational | ",
 "Upcoming Jan 9 Women's · Ohio State vs Kenyon | ",
 "Upcoming Jan 16, 12:00 PM Women's · Ohio State at Michigan | ",
 "Upcoming Jan 29 Women's · Ohio State at Ohio State Winter Classic | ",
 "Upcoming Feb 17 Women's · Ohio State at Big Ten Championships | ",
 "Upcoming Feb 28, 10:00 AM Women's · Ohio State vs Last Chance Meet | ",
 "Upcoming Mar 8 Women's · Ohio State at NCAA Zone Diving Championships | ",
 "Upcoming Mar 11 Women's · Ohio State at CSCAA National Invitational Championship | ",
 "Upcoming Mar 18 Women's · Ohio State at NCAA Championships | "
]);
  const v_mensswimdive=parse("Swimming & Diving","mens-swim-dive");
  assert.deepEqual(v_mensswimdive.map(line),[
 "Final Sep 24 Men's · Ohio State at Indiana | Completed",
 "Final Sep 24 Men's · Ohio State at Louisville | Completed",
 "Final Sep 24 Men's · Ohio State at Michigan | Completed",
 "Final Oct 2 Men's · Ohio State at Stanford | Completed",
 "Final Oct 2 Men's · Ohio State at California | Completed",
 "Final Oct 2 Men's · Ohio State at Auburn | Completed",
 "Upcoming Oct 10, 10:30 AM Men's · Ohio State vs Alumni Meet (Exhibition) | ",
 "Upcoming Oct 16 Men's · Ohio State at Zips Classic | ",
 "Upcoming Nov 6, 5:00 PM Men's · Ohio State at Kentucky | ",
 "Upcoming Nov 17 Men's · Ohio State at Ohio State Fall Invitational | ",
 "Upcoming Jan 9 Men's · Ohio State vs Kenyon | ",
 "Upcoming Jan 16, 12:00 PM Men's · Ohio State at Michigan | ",
 "Upcoming Jan 29 Men's · Ohio State at Ohio State Winter Classic | ",
 "Upcoming Feb 24 Men's · Ohio State at Big Ten Championships | ",
 "Upcoming Mar 7 Men's · Ohio State vs Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Ohio State at NCAA Zone Diving Championships | ",
 "Upcoming Mar 11 Men's · Ohio State at CSCAA National Invitational Championship | ",
 "Upcoming Mar 25 Men's · Ohio State at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Ohio State at ITA All-American Championships | Completed",
 "Today Oct 9 Women's · Ohio State at ITA Midwest Regional Championships | ",
 "Upcoming Nov 5 Women's · Ohio State at ITA Central Sectional Championships | ",
 "Upcoming Nov 5 Women's · Ohio State at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Women's · Ohio State at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Ohio State at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Ohio State at Fighting Irish Mini Duals | Completed",
 "Upcoming Oct 14 Men's · Ohio State at ITA Midwest Regional Championships | ",
 "Upcoming Oct 29 Men's · Ohio State at Big Ten Singles/Doubles Championship | ",
 "Upcoming Nov 5 Men's · Ohio State at ITA Sectionals Championship | ",
 "Upcoming Nov 5 Men's · Ohio State at ITA Conference Masters Championship | ",
 "Upcoming Nov 17 Men's · Ohio State at 2026 NCAA Individual Championships | "
]);
  const v_womenstrackfield=parse("Track & Field","womens-track-field");
  assert.deepEqual(v_womenstrackfield.map(line),[]);
  const v_menstrackfield=parse("Track & Field","mens-track-field");
  assert.deepEqual(v_menstrackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Ohio State vs Bowling Green | L, 1-3",
 "Final Aug 29 Women's · Ohio State vs Fresno State | W, 3-0",
 "Final Aug 30 Women's · Ohio State vs Northern Kentucky | W, 3-1",
 "Final Sep 2 Women's · Ohio State vs Ole Miss | L, 1-3",
 "Final Sep 3 Women's · Ohio State at Oklahoma | L, 2-3",
 "Final Sep 11 Women's · Ohio State vs Winthrop | W, 3-2",
 "Final Sep 12 Women's · Ohio State vs Southern Indiana | W, 3-1",
 "Final Sep 13 Women's · Ohio State vs Youngstown State | W, 3-2",
 "Final Sep 18 Women's · Ohio State at Virginia | W, 3-2",
 "Final Sep 19 Women's · Ohio State at Virginia | W, 3-0",
 "Final Sep 25 Women's · Ohio State at Iowa | W, 3-1",
 "Final Sep 26 Women's · Ohio State at Nebraska | L, 0-3",
 "Final Oct 1 Women's · Ohio State vs Rutgers | L, 0-3",
 "Final Oct 3 Women's · Ohio State at Northwestern | W, 3-1",
 "Today Oct 9, 7:00 PM Women's · Ohio State vs Washington | ",
 "Upcoming Oct 11, 4:00 PM Women's · Ohio State vs Minnesota | ",
 "Upcoming Oct 16, 10:00 PM Women's · Ohio State at USC | ",
 "Upcoming Oct 18, 6:00 PM Women's · Ohio State at UCLA | ",
 "Upcoming Oct 23, 7:00 PM Women's · Ohio State vs Indiana | ",
 "Upcoming Oct 24, 7:00 PM Women's · Ohio State vs Oregon | ",
 "Upcoming Oct 29, 7:00 PM Women's · Ohio State at Penn State | ",
 "Upcoming Nov 1, 1:00 PM Women's · Ohio State at Illinois | ",
 "Upcoming Nov 4, 7:00 PM Women's · Ohio State vs Purdue | ",
 "Upcoming Nov 7 Women's · Ohio State at Michigan State | ",
 "Upcoming Nov 11, 7:00 PM Women's · Ohio State at Michigan | ",
 "Upcoming Nov 13, 7:00 PM Women's · Ohio State vs Wisconsin | ",
 "Upcoming Nov 17, 7:00 PM Women's · Ohio State vs Maryland | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Ohio State at 2026 Clarion Open | ",
 "Upcoming Nov 15 Ohio State vs Columbia | ",
 "Upcoming Nov 20 Ohio State at NC State | ",
 "Upcoming Nov 22 Ohio State at Bellarmine | ",
 "Upcoming Dec 12 Ohio State at 2026 National Duals | ",
 "Upcoming Dec 18 Ohio State vs Kent State | ",
 "Upcoming Jan 3 Ohio State vs Clarion | ",
 "Upcoming Jan 10 Ohio State vs Purdue | ",
 "Upcoming Jan 15 Ohio State at Northwestern | ",
 "Upcoming Jan 22 Ohio State at Indiana | ",
 "Upcoming Jan 24 Ohio State at Iowa | ",
 "Upcoming Jan 29 Ohio State vs Michigan State | ",
 "Upcoming Jan 31 Ohio State vs Nebraska | ",
 "Upcoming Feb 5 Ohio State at Michigan | ",
 "Upcoming Feb 12 Ohio State vs Penn State | ",
 "Upcoming Mar 6 Ohio State at 2027 Big Ten Championships | ",
 "Upcoming Mar 18 Ohio State at 2027 NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimdive,"Swimming & Diving womens-swim-dive");
  ownRecapsOnly(v_mensswimdive,"Swimming & Diving mens-swim-dive");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackfield,"Track & Field womens-track-field");
  ownRecapsOnly(v_menstrackfield,"Track & Field mens-track-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Hand checks (Oct 9).
{
  // The women's Paul Short Run card links the fencing captains story (a site
  // error): it is not the meet's. Cross country keeps its TFRRS place.
  const xc=parse('Cross Country','womens-cross-country'),paul=xc.find(e=>e.opponent==='Paul Short Run');
  assert.equal(paul.recap_url,undefined,'another sport\'s story is not a recap');
  assert.ok(xc.filter(e=>e.status==='Final'&&e!==paul).every(e=>/womens-cross-country-/.test(e.recap_url)));
  // Rifle: one story covers each day's two or three duals; every dual keeps
  // it, matched by the story's names ("ole-miss", "tcu") for the pages'
  // institution names ("#5 University of Mississippi", "#3 Texas Christian University").
  const rifle=parse('Rifle','rifle').filter(e=>e.status==='Final');
  assert.deepEqual(rifle.map(e=>[e.opponent,Boolean(e.recap_url)]),[['Ole Miss',true],['UT Martin',true],['Nebraska',true],['TCU',true],['Navy',true]]);
  // Institution names read short; Miami University and Boston University keep
  // theirs (Miami and Boston are other schools).
  assert.deepEqual(['Miami University','Boston University','University of Memphis'].map(ohioStateShortName),['Miami University','Boston University','Memphis']);
  assert.deepEqual(parse('Soccer','mens-soccer').slice(0,4).map(e=>e.opponent),['Virginia Tech','DePaul','Memphis','Northern Kentucky']);
  // Baseball's "Scarlet & Gray World Series" is an intrasquad.
  assert.ok(!parse('Baseball','baseball').some(e=>/scarlet/i.test(e.opponent)));
  // Men's tennis: the ITA All-American is named after its tournament, and
  // players' pro events ("M25 Las Vegas", "Columbus Challenger") are not the team's.
  const tennis=parse('Tennis','mens-tennis');
  assert.equal(tennis[0].opponent,'ITA All-American Championships');
  assert.ok(!tennis.some(e=>/^M\d+\b|Challenger/i.test(e.opponent)));
  // A past golf tournament with no place and no story is not listed (the
  // women's Toledo Rocket Classic, played by individuals, Sep 14).
  const toledo=parse('Golf','womens-golf').find(e=>/Toledo/.test(e.opponent));
  assert.equal(worker.ohioStateHandlers.isGolfWithoutStory(toledo),true);
  // Field hockey's NCAA Tournament is page-data type "S", not an exhibition.
  assert.equal(parse('Field Hockey','field-hockey').at(-1).opponent,'NCAA Tournament');
  // Men's and women's volleyball are shown together; each board carries its team.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>[p.path,p.team_label]),[['volleyball/womens-college-volleyball',"Women's"],['volleyball/mens-college-volleyball',"Men's"]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Ohio State module checks passed');
