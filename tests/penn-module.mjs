import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pennSchool} from '../src/schools/penn.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='penn');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,pennHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/penn-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit pennathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['penn'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',pennSchool.scheduleUrls],['roster',pennSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('penn|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'pennathletics.com',`${key} must stay on pennathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://pennathletics.com/sports/baseball/schedule"],"roster":["https://pennathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://pennathletics.com/sports/mens-basketball/schedule","https://pennathletics.com/sports/womens-basketball/schedule"],"roster":["https://pennathletics.com/sports/mens-basketball/roster","https://pennathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://pennathletics.com/sports/womens-cross-country/schedule","https://pennathletics.com/sports/mens-cross-country/schedule"],"roster":["https://pennathletics.com/sports/womens-cross-country/roster","https://pennathletics.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://pennathletics.com/sports/womens-fencing/schedule","https://pennathletics.com/sports/mens-fencing/schedule"],"roster":["https://pennathletics.com/sports/womens-fencing/roster","https://pennathletics.com/sports/mens-fencing/roster"],"combined":true},"Field Hockey":{"schedule":["https://pennathletics.com/sports/field-hockey/schedule"],"roster":["https://pennathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://pennathletics.com/sports/football/schedule"],"roster":["https://pennathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://pennathletics.com/sports/womens-golf/schedule","https://pennathletics.com/sports/mens-golf/schedule"],"roster":["https://pennathletics.com/sports/womens-golf/roster","https://pennathletics.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://pennathletics.com/sports/womens-gymnastics/schedule"],"roster":["https://pennathletics.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://pennathletics.com/sports/womens-lacrosse/schedule","https://pennathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://pennathletics.com/sports/womens-lacrosse/roster","https://pennathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://pennathletics.com/sports/womens-rowing/schedule","https://pennathletics.com/sports/mens-rowing/schedule","https://pennathletics.com/sports/mens-crew/schedule"],"roster":["https://pennathletics.com/sports/womens-rowing/roster","https://pennathletics.com/sports/mens-rowing/roster","https://pennathletics.com/sports/mens-crew/roster"],"combined":true},"Soccer":{"schedule":["https://pennathletics.com/sports/womens-soccer/schedule","https://pennathletics.com/sports/mens-soccer/schedule"],"roster":["https://pennathletics.com/sports/womens-soccer/roster","https://pennathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://pennathletics.com/sports/softball/schedule"],"roster":["https://pennathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://pennathletics.com/sports/womens-swimming-and-diving/schedule","https://pennathletics.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://pennathletics.com/sports/womens-swimming-and-diving/roster","https://pennathletics.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://pennathletics.com/sports/womens-tennis/schedule","https://pennathletics.com/sports/mens-tennis/schedule"],"roster":["https://pennathletics.com/sports/womens-tennis/roster","https://pennathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://pennathletics.com/sports/womens-track-and-field/schedule","https://pennathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://pennathletics.com/sports/womens-track-and-field/roster","https://pennathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://pennathletics.com/sports/womens-volleyball/schedule"],"roster":["https://pennathletics.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://pennathletics.com/sports/wrestling/schedule"],"roster":["https://pennathletics.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'penn|"+sport+"':"),`${sport} routes must live in the Penn module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://pennathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.pennHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=penn)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 5, 8:30 PM Men's · Penn at Illinois | ",
 "Upcoming Nov 9 Men's · Penn vs Howard | ",
 "Upcoming Nov 11, 5:30 PM Men's · Penn at Navy | ",
 "Upcoming Nov 14, 6:30 PM Men's · Penn at Saint Joseph's | ",
 "Upcoming Nov 16, 7:00 PM Men's · Penn vs DeSales | ",
 "Upcoming Nov 21, 4:00 PM Men's · Penn at La Salle | ",
 "Upcoming Nov 24, 8:00 PM Men's · Penn vs Drexel | ",
 "Upcoming Nov 27, 6:00 PM Men's · Penn vs Towson | ",
 "Upcoming Nov 28, 6:00 PM Men's · Penn vs Bucknell | ",
 "Upcoming Dec 1, 7:00 PM Men's · Penn vs Kutztown | ",
 "Upcoming Dec 5 Men's · Penn at Big 5 Classic presented by Toyota | ",
 "Upcoming Dec 7, 7:00 PM Men's · Penn at Lafayette | ",
 "Upcoming Dec 19 Men's · Penn vs Monmouth | ",
 "Upcoming Dec 22, 6:00 PM Men's · Penn vs American | ",
 "Upcoming Dec 29, 8:00 PM Men's · Penn at Michigan State | ",
 "Upcoming Jan 4, 7:00 PM Men's · Penn at Princeton | ",
 "Upcoming Jan 8, 7:00 PM Men's · Penn at Brown | ",
 "Upcoming Jan 16, 2:00 PM Men's · Penn vs Harvard | ",
 "Upcoming Jan 18, 2:00 PM Men's · Penn vs Dartmouth | ",
 "Upcoming Jan 23, 2:00 PM Men's · Penn at Yale | ",
 "Upcoming Jan 29, 7:00 PM Men's · Penn vs Cornell | ",
 "Upcoming Jan 30, 6:00 PM Men's · Penn vs Columbia | ",
 "Upcoming Feb 6, 4:00 PM Men's · Penn vs Princeton | ",
 "Upcoming Feb 12, 7:00 PM Men's · Penn at Cornell | ",
 "Upcoming Feb 13, 6:00 PM Men's · Penn at Columbia | ",
 "Upcoming Feb 20, 2:00 PM Men's · Penn vs Yale | ",
 "Upcoming Feb 26, 7:00 PM Men's · Penn at Harvard | ",
 "Upcoming Feb 27, 5:00 PM Men's · Penn at Dartmouth | ",
 "Upcoming Mar 5, 7:00 PM Men's · Penn vs Brown | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · Penn vs Swarthmore | ",
 "Upcoming Nov 6, 1:00 PM Women's · Penn vs Drexel | ",
 "Upcoming Nov 8, 2:00 PM Women's · Penn at Norfolk State | ",
 "Upcoming Nov 12, 6:00 PM Women's · Penn vs Longwood | ",
 "Upcoming Nov 14, 4:00 PM Women's · Penn vs North Carolina | ",
 "Upcoming Nov 18, 7:00 PM Women's · Penn at Saint Joseph's | ",
 "Upcoming Nov 22, 11:30 AM Women's · Penn at Maine | ",
 "Upcoming Nov 24, 5:00 PM Women's · Penn vs Hofstra | ",
 "Upcoming Nov 27, 5:00 PM Women's · Penn at Chapman | ",
 "Upcoming Nov 29, 5:00 PM Women's · Penn at UCLA | ",
 "Upcoming Dec 3, 6:00 PM Women's · Penn at UMES | ",
 "Upcoming Dec 6 Women's · Penn at Big 5 Classic | ",
 "Upcoming Dec 18, 11:00 AM Women's · Penn vs William & Mary | ",
 "Upcoming Dec 19 Women's · Penn vs Binghamton | ",
 "Upcoming Jan 5, 6:00 PM Women's · Penn at Princeton | ",
 "Upcoming Jan 9, 2:00 PM Women's · Penn vs Brown | ",
 "Upcoming Jan 16, 2:00 PM Women's · Penn at Dartmouth | ",
 "Upcoming Jan 18, 2:00 PM Women's · Penn at Harvard | ",
 "Upcoming Jan 23, 2:00 PM Women's · Penn vs Yale | ",
 "Upcoming Jan 29 Women's · Penn at Columbia | ",
 "Upcoming Jan 30 Women's · Penn at Cornell | ",
 "Upcoming Feb 6, 2:00 PM Women's · Penn vs Princeton | ",
 "Upcoming Feb 12, 6:00 PM Women's · Penn vs Columbia | ",
 "Upcoming Feb 13, 4:00 PM Women's · Penn vs Cornell | ",
 "Upcoming Feb 20, 2:00 PM Women's · Penn at Yale | ",
 "Upcoming Feb 26, 6:00 PM Women's · Penn vs Dartmouth | ",
 "Upcoming Feb 27, 4:00 PM Women's · Penn vs Harvard | ",
 "Upcoming Mar 6, 1:00 PM Women's · Penn at Brown | ",
 "Upcoming Mar 13 Women's · Penn at Ivy League Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Penn at Friar Invitational | 3rd of 9",
 "Final Sep 18 Women's · Penn at Mainline Invitational | Completed",
 "Final Oct 2 Women's · Penn at Paul Short Invitational | Completed",
 "Final Oct 16 Women's · Penn at Pre-National Invitational | Completed",
 "Today Oct 23 Women's · Penn at Haverford Invitational | ",
 "Upcoming Oct 31 Women's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming Nov 13 Women's · Penn at Mid-Atlantic Regional Championship | ",
 "Upcoming Nov 21 Women's · Penn at NCAA Cross Country Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Penn at Friar Invitational | 1st of 9",
 "Final Sep 18 Men's · Penn at Mainline Invitational | Completed",
 "Final Oct 2 Men's · Penn at Paul Short Invitational | Completed",
 "Final Oct 16 Men's · Penn at Pre-National Invitational | Completed",
 "Upcoming Oct 31 Men's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming Nov 13 Men's · Penn at Mid-Atlantic Regional Championship | ",
 "Upcoming Nov 21 Men's · Penn at NCAA Cross Country Championship | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Oct 24 Women's · Penn at Nikki Franke Classic | ",
 "Upcoming Nov 14 Women's · Penn at Elite Invitational | ",
 "Upcoming Jan 16 Women's · Penn at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 23 Women's · Penn at Penn State Invitational | ",
 "Upcoming Jan 31 Women's · Penn at Wagner Invitational | ",
 "Upcoming Feb 6 Women's · Penn at Ivy League Championships (WFENC) | ",
 "Upcoming Feb 21 Women's · Penn at Temple Invitational | ",
 "Upcoming Mar 13 Women's · Penn at NCAA Regional Championships | ",
 "Upcoming Mar 25 Women's · Penn at NCAA Championships | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Oct 25 Men's · Penn at Nikki Franke Classic | ",
 "Upcoming Nov 14 Men's · Penn at Elite Invitational | ",
 "Upcoming Jan 16 Men's · Penn at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 23 Men's · Penn at Penn State Invitational | ",
 "Upcoming Jan 31 Men's · Penn at Wagner Invitational | ",
 "Upcoming Feb 6 Men's · Penn at Ivy League Championships (MFENC) | ",
 "Upcoming Feb 21 Men's · Penn at Temple Invitational | ",
 "Upcoming Mar 13 Men's · Penn at NCAA Regional Championships | ",
 "Upcoming Mar 25 Men's · Penn at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 4 Penn at North Carolina | L, 0-7",
 "Final Sep 6 Penn vs Old Dominion | L, 0-3",
 "Final Sep 11 Penn vs La Salle | W, 7-1",
 "Final Sep 18 Penn vs Princeton | L, 0-1",
 "Final Sep 20 Penn at Towson | L, 3-4",
 "Final Sep 25 Penn at Dartmouth | L, 0-4",
 "Final Sep 27 Penn at Drexel | L, 0-3",
 "Final Oct 2 Penn vs Harvard | L, 0-4",
 "Final Oct 4 Penn vs Villanova | W, 3-0",
 "Final Oct 9 Penn at Brown | L, 2-4",
 "Final Oct 11 Penn vs Saint Joseph's | W, 3-2",
 "Final Oct 16 Penn vs Columbia | L, 2-3",
 "Final Oct 18 Penn at Lehigh | W, 3-1",
 "Today Oct 23, 6:00 PM Penn at Yale | ",
 "Upcoming Oct 31, 12:00 PM Penn vs Cornell | ",
 "Upcoming Nov 1, 12:00 PM Penn vs Temple | ",
 "Upcoming Nov 6 Penn vs Ivy League | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Penn at Bucknell | W, 20-7",
 "Final Sep 26 Penn vs Lehigh | L, 7-20",
 "Final Oct 3 Penn at Dartmouth | L, 10-14",
 "Final Oct 10 Penn vs Howard | W, 24-20",
 "Final Oct 16 Penn vs Columbia | L, 27-28",
 "Today Oct 23, 7:00 PM Penn vs Yale | ",
 "Upcoming Oct 31, 12:00 PM Penn at Brown | ",
 "Upcoming Nov 7, 1:00 PM Penn at Cornell | ",
 "Upcoming Nov 14, 1:00 PM Penn vs Harvard | ",
 "Upcoming Nov 21, 12:00 PM Penn at Princeton | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Penn at Nittany Lion Invitational | 9th of 20",
 "Final Sep 25 Women's · Penn at Princeton Invitational | 2nd of 12",
 "Final Oct 12 Women's · Penn at St. Andrews Links Intercollegiate | 3rd of 4",
 "Upcoming Oct 24, 8:30 AM Women's · Penn at Lady Blue Hen Invitational | ",
 "Upcoming Feb 20 Women's · Penn at Columbia Classic | ",
 "Upcoming Mar 26 Women's · Penn at The Intercollegiate at Prospect Bay | ",
 "Upcoming Apr 10 Women's · Penn at Rutgers Invitational | ",
 "Upcoming Apr 23 Women's · Penn at Ivy League Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Penn at Alex Lagowitz Memorial (54 holes) | 6th of 13",
 "Final Sep 25 Men's · Penn at Macdonald Cup (18 holes) | 9th of 11",
 "Final Oct 12 Men's · Penn at St. Andrews Links Intercollegiate | 4th of 4",
 "Upcoming Oct 29 Men's · Penn at Big 5 Championship | ",
 "Upcoming Feb 12 Men's · Penn at Palmas Del Mar Collegiate (54 holes) | ",
 "Upcoming Feb 28 Men's · Penn at Loyola Intercollegiate | ",
 "Upcoming Apr 5 Men's · Penn at Wildcat Spring Invitational | ",
 "Upcoming Apr 10 Men's · Penn at Princeton Invitational | ",
 "Upcoming Apr 23 Men's · Penn at Ivy League Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Oct 24, 1:00 PM Men's · Penn at Lehigh | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Penn at Head of the Schuylkill | ",
 "Upcoming Nov 1 Women's · Penn vs Princeton Chase | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24 Men's Heavyweight · Penn at Head of the Schuylkill | ",
 "Upcoming Nov 1 Men's Heavyweight · Penn vs Princeton Chase | "
]);
  const v_menscrew=parse("Rowing","mens-crew");
  assert.deepEqual(v_menscrew.map(line),[
 "Upcoming Nov 1 Men's Lightweight · Penn vs Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Women's · Penn at George Mason | L, 0-1",
 "Final Aug 23 Women's · Penn vs FDU | T, 0-0",
 "Final Aug 27 Women's · Penn vs George Washington | W, 3-1",
 "Final Aug 30 Women's · Penn at Stony Brook | L, 0-2",
 "Final Sep 3 Women's · Penn at Villanova | L, 0-1",
 "Final Sep 10 Women's · Penn vs Saint Joseph's | W, 4-0",
 "Final Sep 13 Women's · Penn at Towson | W, 1-0",
 "Final Sep 16 Women's · Penn vs Jefferson | W, 2-1",
 "Final Sep 19 Women's · Penn at St. John's | W, 1-0",
 "Final Sep 26 Women's · Penn at Dartmouth | L, 0-4",
 "Final Oct 3 Women's · Penn vs Brown | T, 2-2",
 "Final Oct 10 Women's · Penn at Princeton | W, 1-0",
 "Final Oct 17 Women's · Penn vs Columbia | L, 2-3",
 "Upcoming Oct 24, 1:00 PM Women's · Penn at Cornell | ",
 "Upcoming Oct 31, 4:00 PM Women's · Penn vs Harvard | ",
 "Upcoming Nov 7, 6:00 PM Women's · Penn at Yale | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Sep 1 Men's · Penn vs Monmouth | W, 4-1",
 "Final Sep 7 Men's · Penn at Pittsburgh | L, 0-1",
 "Final Sep 12 Men's · Penn vs Seton Hall | W, 2-1",
 "Final Sep 15 Men's · Penn vs Delaware | T, 3-3",
 "Final Sep 19 Men's · Penn at FDU | W, 3-1",
 "Final Sep 26 Men's · Penn at Yale | T, 1-1",
 "Final Oct 3 Men's · Penn vs Dartmouth | W, 1-0",
 "Final Oct 6 Men's · Penn at Loyola Maryland | T, 0-0",
 "Final Oct 10 Men's · Penn at Cornell | L, 3-5",
 "Final Oct 13 Men's · Penn at Drexel | W, 1-0",
 "Final Oct 17 Men's · Penn vs Brown | W, 3-0",
 "Final Oct 20 Men's · Penn vs Kansas City | L, 1-2",
 "Upcoming Oct 24, 1:00 PM Men's · Penn at Harvard | ",
 "Upcoming Oct 31, 7:00 PM Men's · Penn vs Columbia | ",
 "Upcoming Nov 7, 3:00 PM Men's · Penn at Princeton | ",
 "Upcoming Nov 12 Men's · Penn vs Ivy League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 31, 12:00 PM Women's · Penn at Delaware | ",
 "Upcoming Nov 4, 5:00 PM Women's · Penn at Villanova | ",
 "Upcoming Nov 7 Women's · Penn at Cornell | ",
 "Upcoming Nov 7 Women's · Penn vs Harvard | ",
 "Upcoming Nov 14, 12:00 PM Women's · Penn vs Princeton | ",
 "Upcoming Nov 20 Women's · Penn at Big Al Invitational | ",
 "Upcoming Jan 16, 12:00 PM Women's · Penn vs Yale | ",
 "Upcoming Jan 16, 12:00 PM Women's · Penn vs Columbia | ",
 "Upcoming Jan 22, 5:00 PM Women's · Penn vs West Chester | ",
 "Upcoming Jan 30, 12:00 PM Women's · Penn at Dartmouth | ",
 "Upcoming Jan 30, 12:00 PM Women's · Penn vs Brown | ",
 "Upcoming Feb 17 Women's · Penn at Ivy League Championships (WSWIM) | ",
 "Upcoming Feb 25 Women's · Penn at ECAC Championships | ",
 "Upcoming Mar 17 Women's · Penn at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Nov 7 Men's · Penn at Cornell | ",
 "Upcoming Nov 7 Men's · Penn vs Harvard | ",
 "Upcoming Nov 14, 12:00 PM Men's · Penn vs Princeton | ",
 "Upcoming Nov 20 Men's · Penn at Big Al Invitational | ",
 "Upcoming Jan 9, 12:00 PM Men's · Penn at La Salle | ",
 "Upcoming Jan 9, 12:00 PM Men's · Penn vs Villanova | ",
 "Upcoming Jan 16, 12:00 PM Men's · Penn vs Yale | ",
 "Upcoming Jan 16, 12:00 PM Men's · Penn vs Columbia | ",
 "Upcoming Jan 22, 5:00 PM Men's · Penn vs West Chester | ",
 "Upcoming Jan 30, 12:00 PM Men's · Penn at Dartmouth | ",
 "Upcoming Jan 30, 12:00 PM Men's · Penn vs Brown | ",
 "Upcoming Feb 24 Men's · Penn at Ivy League Championships (MSWIM) | ",
 "Upcoming Feb 25 Men's · Penn at ECAC Championships | ",
 "Upcoming Mar 24 Men's · Penn at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Penn at Tribe Invitational | Completed",
 "Final Sep 19 Women's · Penn at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Penn at Penn Invitational | Completed",
 "Final Oct 9 Women's · Penn at Cissie Leary Invitational | Completed",
 "Final Oct 15 Women's · Penn at ITA Northeast Regional | Completed",
 "Today Oct 23 Women's · Penn at Ivy Invitational | ",
 "Upcoming Nov 5 Women's · Penn at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Penn at ITA Masters Championships | ",
 "Upcoming Nov 17 Women's · Penn at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Penn at Orange and Blue Invite | Completed",
 "Final Sep 19 Men's · Penn at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Penn at Liberty Hidden Dual | Completed",
 "Final Oct 2 Men's · Penn at Saint Joseph's Invitational | Completed",
 "Final Oct 15 Men's · Penn at ITA Northeast Regionals | Completed",
 "Today Oct 23 Men's · Penn at Ivy League Tournament | ",
 "Upcoming Oct 26 Men's · Penn at UTR 25K Pro Event | ",
 "Upcoming Nov 5 Men's · Penn at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · Penn at ITA Masters | ",
 "Upcoming Nov 17 Men's · Penn at NCAA Individuals | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · Penn at Penn Opener | ",
 "Upcoming Jan 9 Women's · Penn at Penn Select | ",
 "Upcoming Jan 16 Women's · Penn at Quaker Invitational | ",
 "Upcoming Jan 21 Women's · Penn at Penn Elite | ",
 "Upcoming Jan 29 Women's · Penn at Penn Invitational | ",
 "Upcoming Jan 29 Women's · Penn at Bob Pollock Meet | ",
 "Upcoming Feb 5 Women's · Penn at Penn Classic | ",
 "Upcoming Feb 12 Women's · Penn at Tiger Paw Invitational | ",
 "Upcoming Feb 12 Women's · Penn at David Hemery Valentine's Invitational | ",
 "Upcoming Feb 19 Women's · Penn at Philadelphia Metro | ",
 "Upcoming Feb 27 Women's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming Mar 12 Women's · Penn at NCAA Indoor Championships | ",
 "Upcoming Mar 20 Women's · Penn at Penn Challenge | ",
 "Upcoming Mar 25 Women's · Penn at Raleigh Relays | ",
 "Upcoming Apr 2 Women's · Penn at Florida Relays | ",
 "Upcoming Apr 3 Women's · Penn at Sam Howell Invitational | ",
 "Upcoming Apr 9 Women's · Penn at Spec Town Invitational | ",
 "Upcoming Apr 9 Women's · Penn at Duke Invitational | ",
 "Upcoming Apr 16 Women's · Penn at Tom Jones Invitational | ",
 "Upcoming Apr 16 Women's · Penn at Paul Donahue Invitational | ",
 "Upcoming Apr 22 Women's · Penn at Penn Relays | ",
 "Upcoming Apr 30 Women's · Penn at Larry Ellis Invitational | ",
 "Upcoming May 15 Women's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming May 25 Women's · Penn at NCAA East Preliminaries | ",
 "Upcoming Jun 9 Women's · Penn at NCAA Finals | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 4 Men's · Penn at Penn Opener | ",
 "Upcoming Jan 9 Men's · Penn at Penn Select | ",
 "Upcoming Jan 16 Men's · Penn at Quaker Invitational | ",
 "Upcoming Jan 21 Men's · Penn at Penn Elite | ",
 "Upcoming Jan 29 Men's · Penn at Penn Invitational | ",
 "Upcoming Jan 29 Men's · Penn at Bob Pollock Meet | ",
 "Upcoming Feb 5 Men's · Penn at Penn Classic | ",
 "Upcoming Feb 12 Men's · Penn at Tiger Paw Invitational | ",
 "Upcoming Feb 12 Men's · Penn at David Hemery Valentine's Invitational | ",
 "Upcoming Feb 19 Men's · Penn at Philadelphia Metro | ",
 "Upcoming Feb 27 Men's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming Mar 12 Men's · Penn at NCAA Indoor Championships | ",
 "Upcoming Mar 20 Men's · Penn at Penn Challenge | ",
 "Upcoming Mar 25 Men's · Penn at Raleigh Relays | ",
 "Upcoming Apr 2 Men's · Penn at Florida Relays | ",
 "Upcoming Apr 3 Men's · Penn at Sam Howell Invitational | ",
 "Upcoming Apr 9 Men's · Penn at Spec Town Invitational | ",
 "Upcoming Apr 9 Men's · Penn at Duke Invitational | ",
 "Upcoming Apr 16 Men's · Penn at Tom Jones Invitational | ",
 "Upcoming Apr 16 Men's · Penn at Paul Donahue Invitational | ",
 "Upcoming Apr 22 Men's · Penn at Penn Relays | ",
 "Upcoming Apr 30 Men's · Penn at Larry Ellis Invitational | ",
 "Upcoming May 15 Men's · Penn at Ivy League Heptagonal Championship | ",
 "Upcoming May 25 Men's · Penn at NCAA East Preliminaries | ",
 "Upcoming Jun 9 Men's · Penn at NCAA Finals | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Penn vs Stony Brook | L, 2-3",
 "Final Sep 5 Penn vs Coppin State | W, 3-2",
 "Final Sep 5 Penn at Navy | W, 3-1",
 "Final Sep 12 Penn vs Quinnipiac | W, 3-1",
 "Final Sep 13 Penn vs URI | W, 3-2",
 "Final Sep 13 Penn at Lafayette | W, 3-0",
 "Final Sep 16 Penn vs Rider | W, 3-0",
 "Final Sep 18 Penn at St. John's | L, 1-3",
 "Final Sep 18 Penn vs Rutgers | W, 3-1",
 "Final Sep 19 Penn vs Bryant | W, 3-0",
 "Final Sep 25 Penn at Princeton | L, 2-3",
 "Final Oct 2 Penn vs Cornell | L, 0-3",
 "Final Oct 3 Penn vs Columbia | W, 3-1",
 "Final Oct 9 Penn vs Brown | W, 3-2",
 "Final Oct 10 Penn vs Yale | L, 0-3",
 "Final Oct 16 Penn at Dartmouth | L, 1-3",
 "Final Oct 17 Penn at Harvard | L, 2-3",
 "Today Oct 23, 6:00 PM Penn vs Princeton | ",
 "Upcoming Oct 30, 6:00 PM Penn at Columbia | ",
 "Upcoming Oct 31, 5:00 PM Penn at Cornell | ",
 "Upcoming Nov 6, 6:00 PM Penn vs Harvard | ",
 "Upcoming Nov 7, 5:00 PM Penn vs Dartmouth | ",
 "Upcoming Nov 13, 6:00 PM Penn at Yale | ",
 "Upcoming Nov 14, 5:00 PM Penn at Brown | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Penn at Princeton Open | ",
 "Upcoming Nov 14, 1:00 PM Penn at Wisconsin | ",
 "Upcoming Nov 14, 3:00 PM Penn at Iowa State | ",
 "Upcoming Nov 21, 1:00 PM Penn vs Nebraska | ",
 "Upcoming Nov 22 Penn at PRTC Keystone Classic | ",
 "Upcoming Dec 4, 7:00 PM Penn at Virginia Tech | ",
 "Upcoming Jan 2 Penn at Southern Scuffle Day 1 | ",
 "Upcoming Jan 3 Penn at Southern Scuffle Day 2 | ",
 "Upcoming Jan 9 Penn at F&M Open | ",
 "Upcoming Jan 10, 11:30 AM Penn at Hofstra | ",
 "Upcoming Jan 24, 1:00 PM Penn at Columbia | ",
 "Upcoming Jan 31, 12:00 PM Penn vs Brown | ",
 "Upcoming Jan 31, 5:00 PM Penn vs Harvard | ",
 "Upcoming Feb 7, 1:00 PM Penn at Cornell | ",
 "Upcoming Feb 11, 7:00 PM Penn vs Princeton | ",
 "Upcoming Feb 14, 1:00 PM Penn vs Lehigh | ",
 "Upcoming Feb 18, 7:00 PM Penn at Rider | ",
 "Upcoming Mar 7 Penn at Ivy League Championships | ",
 "Upcoming Mar 18 Penn at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_menscrew,"Rowing mens-crew");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Penn module checks passed");
