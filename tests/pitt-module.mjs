import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pittSchool} from '../src/schools/pitt.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='pitt');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,pittHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/pitt-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit pittsburghpanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['pitt'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',pittSchool.scheduleUrls],['roster',pittSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('pitt|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'pittsburghpanthers.com',`${key} must stay on pittsburghpanthers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://pittsburghpanthers.com/sports/baseball/schedule"],"roster":["https://pittsburghpanthers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://pittsburghpanthers.com/sports/mens-basketball/schedule","https://pittsburghpanthers.com/sports/womens-basketball/schedule"],"roster":["https://pittsburghpanthers.com/sports/mens-basketball/roster","https://pittsburghpanthers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://pittsburghpanthers.com/sports/cross-country/schedule"],"roster":["https://pittsburghpanthers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://pittsburghpanthers.com/sports/football/schedule"],"roster":["https://pittsburghpanthers.com/sports/football/roster"],"combined":false},"Gymnastics":{"schedule":["https://pittsburghpanthers.com/sports/womens-gymnastics/schedule"],"roster":["https://pittsburghpanthers.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://pittsburghpanthers.com/sports/womens-lacrosse/schedule"],"roster":["https://pittsburghpanthers.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://pittsburghpanthers.com/sports/womens-soccer/schedule","https://pittsburghpanthers.com/sports/mens-soccer/schedule"],"roster":["https://pittsburghpanthers.com/sports/womens-soccer/roster","https://pittsburghpanthers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://pittsburghpanthers.com/sports/softball/schedule"],"roster":["https://pittsburghpanthers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://pittsburghpanthers.com/sports/swimming-and-diving/schedule"],"roster":["https://pittsburghpanthers.com/sports/swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://pittsburghpanthers.com/sports/track-and-field/schedule"],"roster":["https://pittsburghpanthers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://pittsburghpanthers.com/sports/womens-volleyball/schedule"],"roster":["https://pittsburghpanthers.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://pittsburghpanthers.com/sports/wrestling/schedule"],"roster":["https://pittsburghpanthers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'pitt|"+sport+"':"),`${sport} routes must live in the Pitt module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://pittsburghpanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.pittHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=pitt)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 17 Pitt at Kent State | ",
 "Upcoming Oct 24, 1:00 PM Pitt vs Mercyhurst | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 17, 2:00 PM Men's · Pitt at Providence (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Pitt vs Rider | ",
 "Upcoming Nov 5, 7:00 PM Men's · Pitt vs Buffalo | ",
 "Upcoming Nov 8, 8:00 PM Men's · Pitt vs Penn State | ",
 "Upcoming Nov 13, 6:30 PM Men's · Pitt at Butler | ",
 "Upcoming Nov 17, 7:00 PM Men's · Pitt vs Villanova | ",
 "Upcoming Nov 20, 7:00 PM Men's · Pitt vs Central Michigan | ",
 "Upcoming Nov 24, 1:30 PM Men's · Pitt vs Oklahoma | ",
 "Upcoming Nov 26, 7:00 PM Men's · Pitt vs DePaul | ",
 "Upcoming Dec 1, 7:00 PM Men's · Pitt at Missouri | ",
 "Upcoming Dec 5, 3:00 PM Men's · Pitt vs Tarleton State | ",
 "Upcoming Dec 9, 6:00 PM Men's · Pitt vs West Virginia | ",
 "Upcoming Dec 15, 7:00 PM Men's · Pitt vs Drexel | ",
 "Upcoming Dec 18, 7:00 PM Men's · Pitt vs Georgia State | ",
 "Upcoming Dec 21, 7:00 PM Men's · Pitt vs Cleveland State | ",
 "Upcoming Jan 2, 2:00 PM Men's · Pitt vs Miami | ",
 "Upcoming Jan 6, 7:00 PM Men's · Pitt at NC State | ",
 "Upcoming Jan 9, 2:00 PM Men's · Pitt at Duke | ",
 "Upcoming Jan 12, 7:00 PM Men's · Pitt vs Syracuse | ",
 "Upcoming Jan 16, 4:00 PM Men's · Pitt vs Clemson | ",
 "Upcoming Jan 20, 7:00 PM Men's · Pitt at Notre Dame | ",
 "Upcoming Jan 23, 7:00 PM Men's · Pitt vs Boston College | ",
 "Upcoming Jan 27, 9:00 PM Men's · Pitt vs Virginia Tech | ",
 "Upcoming Jan 30, 3:00 PM Men's · Pitt at Florida State | ",
 "Upcoming Feb 2, 9:00 PM Men's · Pitt at Louisville | ",
 "Upcoming Feb 9, 7:00 PM Men's · Pitt vs Virginia | ",
 "Upcoming Feb 13, 7:00 PM Men's · Pitt at Wake Forest | ",
 "Upcoming Feb 17, 7:00 PM Men's · Pitt vs California | ",
 "Upcoming Feb 20, 8:00 PM Men's · Pitt vs Georgia Tech | ",
 "Upcoming Feb 23, 8:00 PM Men's · Pitt at Syracuse | ",
 "Upcoming Feb 27 Men's · Pitt at Miami | ",
 "Upcoming Mar 2, 9:00 PM Men's · Pitt vs North Carolina | ",
 "Upcoming Mar 6, 6:00 PM Men's · Pitt at SMU | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Pitt vs Saint Peter's | ",
 "Upcoming Nov 7, 2:00 PM Women's · Pitt vs LIU | ",
 "Upcoming Nov 10, 7:00 PM Women's · Pitt vs Delaware State | ",
 "Upcoming Nov 14, 12:00 PM Women's · Pitt vs Charleston Southern | ",
 "Upcoming Nov 18, 11:00 AM Women's · Pitt vs UMBC | ",
 "Upcoming Nov 21, 2:00 PM Women's · Pitt vs Canisius | ",
 "Upcoming Nov 28 Women's · Pitt vs Harvard | ",
 "Upcoming Nov 29 Women's · Pitt at Christmas City Classic | ",
 "Upcoming Dec 6, 2:00 PM Women's · Pitt vs Sacred Heart | ",
 "Upcoming Dec 13, 2:00 PM Women's · Pitt at Georgia Tech | ",
 "Upcoming Dec 17, 7:00 PM Women's · Pitt vs Mercyhurst | ",
 "Upcoming Dec 20, 12:00 PM Women's · Pitt vs Duquesne | ",
 "Upcoming Dec 28, 7:00 PM Women's · Pitt vs Notre Dame | ",
 "Upcoming Dec 31, 2:00 PM Women's · Pitt vs Virginia Tech | ",
 "Upcoming Jan 3, 2:00 PM Women's · Pitt at Wake Forest | ",
 "Upcoming Jan 7, 6:00 PM Women's · Pitt at Syracuse | ",
 "Upcoming Jan 10, 2:00 PM Women's · Pitt vs SMU | ",
 "Upcoming Jan 14, 7:00 PM Women's · Pitt vs Louisville | ",
 "Upcoming Jan 21, 6:00 PM Women's · Pitt at Florida State | ",
 "Upcoming Jan 24, 2:00 PM Women's · Pitt vs Virginia | ",
 "Upcoming Jan 28, 6:00 PM Women's · Pitt vs Clemson | ",
 "Upcoming Jan 31, 2:00 PM Women's · Pitt vs Boston College | ",
 "Upcoming Feb 4, 7:00 PM Women's · Pitt at NC State | ",
 "Upcoming Feb 7, 3:00 PM Women's · Pitt at SMU | ",
 "Upcoming Feb 14, 12:00 PM Women's · Pitt at Duke | ",
 "Upcoming Feb 18, 6:00 PM Women's · Pitt vs North Carolina | ",
 "Upcoming Feb 21, 2:00 PM Women's · Pitt vs Miami | ",
 "Upcoming Feb 25, 10:00 PM Women's · Pitt at Stanford | ",
 "Upcoming Feb 28, 2:00 PM Women's · Pitt at Cal | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Pitt at Panther Open | Women's team: 1st / Men's team: 1st",
 "Final Sep 11 Pitt at Spiked Shoe Invitational | Women's team: 3rd / Men's team: 2nd",
 "Final Oct 2 Pitt at Paul Short Run | Women's team: 6th / Men's team: 3rd",
 "Upcoming Oct 16, 11:00 AM Pitt at Pre-Nationals Invitational | ",
 "Upcoming Oct 30 Pitt at ACC Championships | ",
 "Upcoming Nov 13 Pitt at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 Pitt at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Pitt vs Miami (OH) | W, 59-14",
 "Final Sep 12 Pitt vs UCF | W, 12-7",
 "Final Sep 17 Pitt vs Syracuse | W, 27-13",
 "Final Sep 26 Pitt vs Bucknell | W, 59-0",
 "Final Oct 2 Pitt at Virginia Tech | W, 35-33",
 "Final Oct 10 Pitt vs North Carolina | L, 17-21",
 "Upcoming Oct 17, 12:00 PM Pitt at Boston College | ",
 "Upcoming Oct 24, 12:00 PM Pitt at Miami | ",
 "Upcoming Oct 31 Pitt vs Georgia Tech | ",
 "Upcoming Nov 13, 7:00 PM Pitt vs Florida State | ",
 "Upcoming Nov 21 Pitt at Louisville | ",
 "Upcoming Nov 28 Pitt at California | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 18 Pitt at American Boy Project Play Day | ",
 "Upcoming Oct 25 Pitt at Pitt Play Day | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Pitt vs Youngstown State | W, 2-1",
 "Final Aug 16 Women's · Pitt vs Texas | L, 0-1",
 "Final Aug 20 Women's · Pitt at LMU | W, 2-1",
 "Final Aug 23 Women's · Pitt at Santa Clara | T, 1-1",
 "Final Aug 27 Women's · Pitt vs Liberty | W, 1-0",
 "Final Aug 30 Women's · Pitt at Cornell | W, 2-1",
 "Final Sep 3 Women's · Pitt at Ohio | W, 3-0",
 "Final Sep 6 Women's · Pitt vs Dayton | W, 3-0",
 "Final Sep 12 Women's · Pitt at Louisville | L, 2-4",
 "Final Sep 17 Women's · Pitt vs Virginia Tech | L, 1-2",
 "Final Sep 24 Women's · Pitt at Syracuse | L, 1-2",
 "Final Sep 27 Women's · Pitt vs Duke | T, 0-0",
 "Final Oct 3 Women's · Pitt vs Miami | L, 0-1",
 "Final Oct 8 Women's · Pitt at NC State | W, 1-0",
 "Today Oct 15, 7:00 PM Women's · Pitt at Notre Dame | ",
 "Upcoming Oct 18, 1:00 PM Women's · Pitt vs Florida State | ",
 "Upcoming Oct 30, 7:00 PM Women's · Pitt vs Wake Forest | ",
 "Upcoming Nov 5, 7:00 PM Women's · Pitt at SMU | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Pitt vs Maryland | L, 1-2",
 "Final Aug 24 Men's · Pitt vs Bucknell | W, 3-1",
 "Final Aug 28 Men's · Pitt at Penn State | W, 2-1",
 "Final Sep 3 Men's · Pitt at Michigan State | T, 0-0",
 "Final Sep 7 Men's · Pitt vs Penn | W, 1-0",
 "Final Sep 11 Men's · Pitt vs SMU | L, 1-3",
 "Final Sep 15 Men's · Pitt vs Cornell | W, 2-0",
 "Final Sep 20 Men's · Pitt at California | W, 2-1",
 "Final Sep 25 Men's · Pitt vs Louisville | W, 1-0",
 "Final Oct 2 Men's · Pitt at Syracuse | T, 1-1",
 "Final Oct 9 Men's · Pitt vs Virginia Tech | W, 3-0",
 "Final Oct 13 Men's · Pitt vs Duquesne | W, 2-1",
 "Upcoming Oct 16, 7:00 PM Men's · Pitt vs North Carolina | ",
 "Upcoming Oct 19, 7:00 PM Men's · Pitt vs Georgetown | ",
 "Upcoming Oct 23, 7:00 PM Men's · Pitt at Boston College | ",
 "Upcoming Oct 30, 7:00 PM Men's · Pitt at Virginia | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 19 Pitt vs IUP (Exhibition) (Game 1) | W, 14-0",
 "Final Sep 19 Pitt vs IUP (Exhibition) (Game 2) | W, 13-1",
 "Final Sep 26 Pitt vs RMU (10 Inn.) (Exhibition) | W, 26-12",
 "Final Oct 4 Pitt at Ohio State (Exhibition) | W, 6-5",
 "Final Oct 4 Pitt vs Case Western Reserve (Exhibition) | W, 9-0"
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 3 Pitt at Carnegie Mellon | Women's team: W, 85-19 / Men's team: L, 72-84",
 "Final Oct 3 Pitt at Duquesne | Women's team: W, 85-64",
 "Final Oct 9 Pitt at Michigan | Men's team: W, 207-61 / Women's team: W, 135-130",
 "Upcoming Oct 30, 4:30 PM Pitt at Penn State | ",
 "Upcoming Nov 18, 10:00 AM Pitt at Texas Swimming Invitational | ",
 "Upcoming Nov 20, 10:00 AM Pitt at Big Al Invitational | ",
 "Upcoming Dec 2 Pitt at US Open | ",
 "Upcoming Dec 7 Pitt at USA Diving Winter Nationals | ",
 "Upcoming Jan 9 Pitt vs West Virginia | ",
 "Upcoming Jan 16 Pitt vs Youngstown State | ",
 "Upcoming Jan 29 Pitt at Ohio State Winter Classic | ",
 "Upcoming Feb 16 Pitt at ACC Championships | ",
 "Upcoming Mar 8 Pitt at NCAA Diving Zones | ",
 "Upcoming Mar 17 Pitt at NCAA Women's Championships | ",
 "Upcoming Mar 22 Pitt at NCAA Men's Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 23 Pitt vs Kentucky | W, 3-1",
 "Final Aug 24 Pitt vs Xavier | W, 3-0",
 "Final Aug 28 Pitt vs Kansas | W, 3-1",
 "Final Aug 30 Pitt vs Wisconsin | W, 3-0",
 "Final Sep 4 Pitt at BYU | W, 3-1",
 "Final Sep 6 Pitt at Utah | W, 3-1",
 "Final Sep 9 Pitt vs Tennessee | W, 3-0",
 "Final Sep 11 Pitt vs Jacksonville | W, 3-0",
 "Final Sep 12 Pitt vs High Point | W, 3-0",
 "Final Sep 13 Pitt vs Wright State | W, 3-0",
 "Final Sep 25 Pitt vs California | W, 3-0",
 "Final Sep 27 Pitt vs Stanford | W, 3-0",
 "Final Oct 2 Pitt at Boston College | W, 3-0",
 "Final Oct 4 Pitt at Syracuse | W, 3-0",
 "Final Oct 7 Pitt vs SMU | L, 1-3",
 "Final Oct 11 Pitt at SMU | W, 3-0",
 "Upcoming Oct 16, 7:00 PM Pitt vs Florida State | ",
 "Upcoming Oct 18, 12:00 PM Pitt vs Miami | ",
 "Upcoming Oct 23, 7:00 PM Pitt at Georgia Tech | ",
 "Upcoming Oct 25, 1:00 PM Pitt at Clemson | ",
 "Upcoming Oct 30, 6:30 PM Pitt at Wake Forest | ",
 "Upcoming Nov 1, 1:00 PM Pitt at NC State | ",
 "Upcoming Nov 6, 7:00 PM Pitt vs Duke | ",
 "Upcoming Nov 8, 1:00 PM Pitt vs North Carolina | ",
 "Upcoming Nov 11, 7:00 PM Pitt vs Notre Dame | ",
 "Upcoming Nov 15, 8:30 PM Pitt vs Louisville | ",
 "Upcoming Nov 20, 7:00 PM Pitt at Virginia | ",
 "Upcoming Nov 22, 12:00 PM Pitt at Virginia Tech | ",
 "Upcoming Nov 24, 10:00 PM Pitt at Stanford | ",
 "Upcoming Nov 28, 1:00 PM Pitt vs NC State | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Pitt at Navy Classic | ",
 "Upcoming Nov 14, 1:00 PM Pitt vs Buffalo | ",
 "Upcoming Nov 15, 2:00 PM Pitt at Edinboro | ",
 "Upcoming Nov 21, 1:00 PM Pitt vs Lehigh | ",
 "Upcoming Dec 4 Pitt vs Iowa | ",
 "Upcoming Dec 12 Pitt at National Duals Invitational | ",
 "Upcoming Dec 20, 3:00 PM Pitt at Cornell | ",
 "Upcoming Dec 29 Pitt at Midlands Championships | ",
 "Upcoming Jan 8, 7:00 PM Pitt vs North Carolina | ",
 "Upcoming Jan 10 Pitt at Princeton | ",
 "Upcoming Jan 15, 7:00 PM Pitt at Virginia Tech | ",
 "Upcoming Jan 22, 7:00 PM Pitt at Virginia | ",
 "Upcoming Jan 31, 1:00 PM Pitt vs Duke | ",
 "Upcoming Feb 12, 7:00 PM Pitt at NC State | ",
 "Upcoming Feb 19, 7:00 PM Pitt vs Stanford | ",
 "Upcoming Mar 6 Pitt at ACC Championships | ",
 "Upcoming Mar 18 Pitt at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Pitt ended women's tennis after 2019 ("Pitt Tennis Concludes Final Season",
// Apr 17, 2019; the schedule page still shows 2018-19): not a sponsored sport.
assert.ok(!sports.includes('Tennis'));

// Baseball's fall "Blue/Gold" intrasquads (Oct 27-30) are internal: not listed.
assert.deepEqual(parse('Baseball','baseball').map(line),["Upcoming Oct 17 Pitt at Kent State | ","Upcoming Oct 24, 1:00 PM Pitt vs Mercyhurst | "]);
// Lacrosse's fall play days are events, read "at" ("Pitt Play Day", Oct 25).
assert.deepEqual(parse('Lacrosse','womens-lacrosse').map(line),["Upcoming Oct 18 Pitt at American Boy Project Play Day | ","Upcoming Oct 25 Pitt at Pitt Play Day | "]);

// Swimming: the CMU Relays list each opponent with each team's dual ("Women:
// W, 85-19 Men: L, 72-84"); Michigan's dual both teams ("Men: W, 207-61;
// Women: W, 135-130").
assert.deepEqual(parse('Swimming & Diving','swimming-and-diving').filter(e=>e.status==='Final').map(line),["Final Oct 3 Pitt at Carnegie Mellon | Women's team: W, 85-19 / Men's team: L, 72-84","Final Oct 3 Pitt at Duquesne | Women's team: W, 85-64","Final Oct 9 Pitt at Michigan | Men's team: W, 207-61 / Women's team: W, 135-130"]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Pitt module checks passed');
