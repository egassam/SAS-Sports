import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {columbiaSchool} from '../src/schools/columbia.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='columbia');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,columbiaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/columbia-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gocolumbialions.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['columbia'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',columbiaSchool.scheduleUrls],['roster',columbiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('columbia|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gocolumbialions.com',`${key} must stay on gocolumbialions.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gocolumbialions.com/sports/baseball/schedule"],"roster":["https://gocolumbialions.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gocolumbialions.com/sports/mens-basketball/schedule","https://gocolumbialions.com/sports/womens-basketball/schedule"],"roster":["https://gocolumbialions.com/sports/mens-basketball/roster","https://gocolumbialions.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gocolumbialions.com/sports/cross-country/schedule"],"roster":["https://gocolumbialions.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://gocolumbialions.com/sports/fencing/schedule"],"roster":["https://gocolumbialions.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://gocolumbialions.com/sports/field-hockey/schedule"],"roster":["https://gocolumbialions.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://gocolumbialions.com/sports/football/schedule"],"roster":["https://gocolumbialions.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gocolumbialions.com/sports/womens-golf/schedule","https://gocolumbialions.com/sports/mens-golf/schedule"],"roster":["https://gocolumbialions.com/sports/womens-golf/roster","https://gocolumbialions.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gocolumbialions.com/sports/womens-lacrosse/schedule"],"roster":["https://gocolumbialions.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://gocolumbialions.com/sports/womens-rowing/schedule","https://gocolumbialions.com/sports/mens-rowing/schedule"],"roster":["https://gocolumbialions.com/sports/womens-rowing/roster","https://gocolumbialions.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://gocolumbialions.com/sports/womens-soccer/schedule","https://gocolumbialions.com/sports/mens-soccer/schedule"],"roster":["https://gocolumbialions.com/sports/womens-soccer/roster","https://gocolumbialions.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gocolumbialions.com/sports/softball/schedule"],"roster":["https://gocolumbialions.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gocolumbialions.com/sports/womens-swimming-and-diving/schedule","https://gocolumbialions.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gocolumbialions.com/sports/womens-swimming-and-diving/roster","https://gocolumbialions.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gocolumbialions.com/sports/womens-tennis/schedule","https://gocolumbialions.com/sports/mens-tennis/schedule"],"roster":["https://gocolumbialions.com/sports/womens-tennis/roster","https://gocolumbialions.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gocolumbialions.com/sports/track-and-field/schedule"],"roster":["https://gocolumbialions.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gocolumbialions.com/sports/womens-volleyball/schedule"],"roster":["https://gocolumbialions.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gocolumbialions.com/sports/wrestling/schedule"],"roster":["https://gocolumbialions.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'columbia|"+sport+"':"),`${sport} routes must live in the Columbia module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gocolumbialions.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.columbiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=columbia)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Columbia vs Elon | ",
 "Upcoming Nov 5, 7:00 PM Men's · Columbia vs SUNY Old Westbury | ",
 "Upcoming Nov 9, 7:00 PM Men's · Columbia vs Stonehill | ",
 "Upcoming Nov 13, 7:00 PM Men's · Columbia at Bucknell | ",
 "Upcoming Nov 16, 8:00 PM Men's · Columbia at Northwestern | ",
 "Upcoming Nov 21, 12:00 PM Men's · Columbia at Boston U | ",
 "Upcoming Nov 25, 2:00 PM Men's · Columbia vs Saint Peter's | ",
 "Upcoming Nov 28, 2:00 PM Men's · Columbia vs North Florida | ",
 "Upcoming Dec 1, 6:30 PM Men's · Columbia at St. John's | ",
 "Upcoming Dec 4, 6:00 PM Men's · Columbia at New Haven | ",
 "Upcoming Dec 8, 7:00 PM Men's · Columbia vs Hofstra | ",
 "Upcoming Dec 11, 7:00 PM Men's · Columbia vs Army | ",
 "Upcoming Dec 16, 6:00 PM Men's · Columbia vs Norfolk State | ",
 "Upcoming Dec 29, 6:30 PM Men's · Columbia at UAlbany | ",
 "Upcoming Dec 31, 1:00 PM Men's · Columbia vs Sarah Lawrence | ",
 "Upcoming Jan 5, 7:00 PM Men's · Columbia vs Cornell | ",
 "Upcoming Jan 9, 2:00 PM Men's · Columbia at Harvard | ",
 "Upcoming Jan 15, 7:00 PM Men's · Columbia vs Yale | ",
 "Upcoming Jan 18, 2:00 PM Men's · Columbia vs Brown | ",
 "Upcoming Jan 23, 2:00 PM Men's · Columbia vs Dartmouth | ",
 "Upcoming Jan 29, 7:00 PM Men's · Columbia at Princeton | ",
 "Upcoming Jan 30, 6:00 PM Men's · Columbia at Penn | ",
 "Upcoming Feb 5, 6:00 PM Men's · Columbia at Cornell | ",
 "Upcoming Feb 12, 7:00 PM Men's · Columbia vs Princeton | ",
 "Upcoming Feb 13, 6:00 PM Men's · Columbia vs Penn | ",
 "Upcoming Feb 20, 2:00 PM Men's · Columbia at Dartmouth | ",
 "Upcoming Feb 26, 7:00 PM Men's · Columbia at Yale | ",
 "Upcoming Feb 27, 6:00 PM Men's · Columbia at Brown | ",
 "Upcoming Mar 5, 6:00 PM Men's · Columbia vs Harvard | ",
 "Upcoming Mar 12 Men's · Columbia at Ivy League Semifinals | ",
 "Upcoming Mar 13 Men's · Columbia at Ivy League Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Columbia vs Davidson | ",
 "Upcoming Nov 6, 6:00 PM Women's · Columbia vs Rhode Island | ",
 "Upcoming Nov 8, 3:30 PM Women's · Columbia at Belmont | ",
 "Upcoming Nov 12, 7:00 PM Women's · Columbia vs Michigan | ",
 "Upcoming Nov 15, 1:00 PM Women's · Columbia at Maryland | ",
 "Upcoming Nov 21, 7:00 PM Women's · Columbia vs Duke | ",
 "Upcoming Nov 27, 7:30 PM Women's · Columbia vs Stanford | ",
 "Upcoming Nov 28, 5:00 PM Women's · Columbia at Hawaii | ",
 "Upcoming Nov 29, 6:30 PM Women's · Columbia vs San Diego State | ",
 "Upcoming Dec 3, 7:00 PM Women's · Columbia vs Old Dominion | ",
 "Upcoming Dec 6, 2:00 PM Women's · Columbia at Wagner | ",
 "Upcoming Dec 9, 11:00 AM Women's · Columbia at Saint Joseph's | ",
 "Upcoming Dec 13, 2:00 PM Women's · Columbia vs Seton Hall | ",
 "Upcoming Dec 16, 7:00 PM Women's · Columbia at Fairfield | ",
 "Upcoming Dec 29, 7:00 PM Women's · Columbia vs Oregon State | ",
 "Upcoming Jan 3, 1:00 PM Women's · Columbia at Cornell | ",
 "Upcoming Jan 9 Women's · Columbia vs Harvard | ",
 "Upcoming Jan 16 Women's · Columbia at Brown | ",
 "Upcoming Jan 18 Women's · Columbia at Yale | ",
 "Upcoming Jan 23 Women's · Columbia at Dartmouth | ",
 "Upcoming Jan 29 Women's · Columbia vs Penn | ",
 "Upcoming Jan 30 Women's · Columbia vs Princeton | ",
 "Upcoming Feb 6 Women's · Columbia vs Cornell | ",
 "Upcoming Feb 12 Women's · Columbia at Penn | ",
 "Upcoming Feb 13 Women's · Columbia at Princeton | ",
 "Upcoming Feb 20 Women's · Columbia vs Dartmouth | ",
 "Upcoming Feb 26 Women's · Columbia vs Brown | ",
 "Upcoming Feb 27 Women's · Columbia vs Yale | ",
 "Upcoming Mar 6 Women's · Columbia at Harvard | ",
 "Upcoming Mar 13 Women's · Columbia at Ivy League Semifinals | ",
 "Upcoming Mar 14 Women's · Columbia at Ivy League Championship | ",
 "Upcoming Mar 14 Women's · Columbia vs Selection Sunday | ",
 "Upcoming Mar 17 Women's · Columbia at NCAA Tournament | ",
 "Upcoming Mar 19 Women's · Columbia at NCAA Tournament | ",
 "Upcoming Mar 21 Women's · Columbia at NCAA Tournament | ",
 "Upcoming Mar 26 Women's · Columbia at NCAA Tournament | ",
 "Upcoming Mar 28 Women's · Columbia at NCAA Tournament | ",
 "Upcoming Apr 2 Women's · Columbia at NCAA Tournament - Final Four | ",
 "Upcoming Apr 4 Women's · Columbia at NCAA Tournament - National Championship Game | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Columbia at Columbia Manhattan Dual Meet | Completed",
 "Final Sep 26 Columbia at Princeton XC Invitational | Completed",
 "Final Oct 10 Columbia at Mets XC Championships | Completed",
 "Final Oct 17 Columbia at IC4A/ECAC Cross Country Championships | Completed",
 "Upcoming Oct 31 Columbia at Ivy League Cross Country Championships | ",
 "Upcoming Nov 13 Columbia at NCAA XC Regional Championships | ",
 "Upcoming Nov 21 Columbia at NCAA Cross Country Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Upcoming Nov 8, 12:00 PM Columbia at LIU | ",
 "Upcoming Nov 8, 1:20 PM Columbia at Hunter | ",
 "Upcoming Nov 8, 2:40 PM Columbia at NJIT | ",
 "Upcoming Nov 14 Columbia at Ohio State | ",
 "Upcoming Nov 14 Columbia at Temple (Women) | ",
 "Upcoming Nov 14 Columbia at Denison (Men) | ",
 "Upcoming Nov 14 Columbia at Penn State | ",
 "Upcoming Nov 14 Columbia at Duke | ",
 "Upcoming Nov 15 Columbia at Cleveland State (Men) | ",
 "Upcoming Nov 15 Columbia at North Carolina | ",
 "Upcoming Nov 15 Columbia at Johns Hopkins | ",
 "Upcoming Nov 15 Columbia at Cornell (Women) | ",
 "Upcoming Jan 16 Columbia at St. John's | ",
 "Upcoming Jan 16 Columbia at Harvard | ",
 "Upcoming Jan 16 Columbia at Ohio State | ",
 "Upcoming Jan 16 Columbia at Princeton | ",
 "Upcoming Jan 16 Columbia at Notre Dame | ",
 "Upcoming Jan 23 Columbia at Penn State | ",
 "Upcoming Jan 23 Columbia at Penn | ",
 "Upcoming Jan 23 Columbia at Johns Hopkins | ",
 "Upcoming Jan 23 Columbia at Wagner | ",
 "Upcoming Jan 23 Columbia at North Carolina | ",
 "Upcoming Feb 6 Columbia at Ivy League Championships | ",
 "Upcoming Feb 24, 5:00 PM Columbia at NYU | ",
 "Upcoming Feb 24, 5:00 PM Columbia at Sacred Heart | ",
 "Upcoming Feb 24, 5:00 PM Columbia at Vassar | ",
 "Upcoming Mar 14 Columbia at NCAA | ",
 "Upcoming Mar 25 Columbia at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 4 Columbia at UC Davis | W, 2-1",
 "Final Sep 6 Columbia at California | L, 0-4",
 "Final Sep 11 Columbia vs UAlbany | W, 2-1",
 "Final Sep 13 Columbia vs LIU | W, 9-0",
 "Final Sep 18 Columbia at Cornell | L, 2-3",
 "Final Sep 20 Columbia vs Quinnipiac | L, 1-2",
 "Final Sep 25 Columbia at Brown | W, 3-0",
 "Final Oct 4 Columbia vs Dartmouth | W, 3-1",
 "Final Oct 9 Columbia at Yale | L, 1-3",
 "Final Oct 11 Columbia vs La Salle | W, 2-1",
 "Final Oct 16 Columbia at Penn | W, 3-2",
 "Final Oct 18 Columbia at Hofstra | W, 2-1",
 "Today Oct 23, 5:00 PM Columbia vs Harvard | ",
 "Upcoming Oct 25, 1:00 PM Columbia vs Rider | ",
 "Upcoming Oct 30, 6:00 PM Columbia vs Princeton | ",
 "Upcoming Nov 6 Columbia at Ivy League Semifinals | ",
 "Upcoming Nov 8 Columbia at Ivy League Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Columbia vs Lafayette | W, 40-34",
 "Final Sep 26 Columbia at Georgetown | W, 20-17",
 "Final Oct 3 Columbia vs Princeton | L, 7-35",
 "Final Oct 9 Columbia at Marist | W, 41-28",
 "Final Oct 16 Columbia at Penn | W, 28-27",
 "Upcoming Oct 24, 1:30 PM Columbia vs Dartmouth | ",
 "Upcoming Oct 31, 12:00 PM Columbia vs Yale | ",
 "Upcoming Nov 7, 1:00 PM Columbia at Harvard | ",
 "Upcoming Nov 14, 12:00 PM Columbia at Brown | ",
 "Upcoming Nov 21, 12:00 PM Columbia vs Cornell | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 Women's · Columbia at Bucknell Fall Invitational | 2nd of 16",
 "Final Sep 25 Women's · Columbia at Princeton Invitational | 5th of 12",
 "Final Oct 5 Women's · Columbia at Windy City Collegiate Classic | T7th of 12",
 "Upcoming Feb 20 Women's · Columbia at Space Coast Classic presented by MoonGolf | ",
 "Upcoming Mar 17 Women's · Columbia at Quinnipiac | ",
 "Upcoming Mar 20 Women's · Columbia at More Than Golf Invitational | ",
 "Upcoming Apr 5 Women's · Columbia at St. John's Invitational | ",
 "Upcoming Apr 12 Women's · Columbia at Terps Spring Invitational | ",
 "Upcoming Apr 23 Women's · Columbia at Ivy League Championship | ",
 "Upcoming May 10 Women's · Columbia at NCAA Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Columbia at The Doc Gimmler | T8th of 14",
 "Final Sep 25 Men's · Columbia at Macdonald Cup | 6th of 11",
 "Final Oct 3 Men's · Columbia at Columbia Autumn Invitational | 1st of 13",
 "Final Oct 12 Men's · Columbia at The Metropolis Intercollegiate | 8th of 12",
 "Upcoming Feb 20 Men's · Columbia at The Savannah Intercollegiate | ",
 "Upcoming Feb 27 Men's · Columbia at In Good Standing Classic | ",
 "Upcoming Mar 20 Men's · Columbia at Carpetbagger Classic | ",
 "Upcoming Mar 29 Men's · Columbia at Columbia Spring Invitational | ",
 "Upcoming Apr 10 Men's · Columbia at Princeton Spring Invitational | ",
 "Upcoming Apr 17 Men's · Columbia at Roar-EE Invitational | ",
 "Upcoming Apr 23 Men's · Columbia at Ivy League Championship | ",
 "Upcoming May 17 Men's · Columbia at NCAA Regionals | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 21 Women's · Columbia at Hofstra | T, 1-1",
 "Final Aug 23 Women's · Columbia vs St. John's | T, 0-0",
 "Final Aug 27 Women's · Columbia vs Villanova | L, 0-2",
 "Final Aug 30 Women's · Columbia at La Salle | W, 2-1",
 "Final Sep 3 Women's · Columbia at St. Mary's | T, 0-0",
 "Final Sep 6 Women's · Columbia at Cal | L, 1-2",
 "Final Sep 10 Women's · Columbia vs Fordham | L, 1-2",
 "Final Sep 13 Women's · Columbia at Monmouth | L, 0-2",
 "Final Sep 20 Women's · Columbia at Delaware | L, 1-2",
 "Final Sep 26 Women's · Columbia at Brown | L, 0-4",
 "Final Oct 3 Women's · Columbia vs Dartmouth | W, 2-0",
 "Final Oct 10 Women's · Columbia vs Cornell | W, 3-0",
 "Final Oct 17 Women's · Columbia at Penn | W, 3-2",
 "Upcoming Oct 24, 2:00 PM Women's · Columbia at Yale | ",
 "Upcoming Oct 31, 6:00 PM Women's · Columbia vs Princeton | ",
 "Upcoming Nov 7, 6:00 PM Women's · Columbia at Harvard | ",
 "Upcoming Nov 12 Women's · Columbia at Ivy League Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 28 Men's · Columbia vs Army West Point | L, 2-4",
 "Final Sep 5 Men's · Columbia vs Fairfield | T, 3-3",
 "Final Sep 9 Men's · Columbia at Fordham | W, 1-0",
 "Final Sep 12 Men's · Columbia at Manhattan | W, 2-0",
 "Final Sep 15 Men's · Columbia at Temple | W, 1-0",
 "Final Sep 22 Men's · Columbia vs Lehigh | T, 0-0",
 "Final Oct 3 Men's · Columbia at Harvard | L, 0-1",
 "Final Oct 6 Men's · Columbia vs Brown | T, 1-1",
 "Final Oct 10 Men's · Columbia vs Princeton | T, 1-1",
 "Final Oct 13 Men's · Columbia vs Holy Cross | W, 3-0",
 "Final Oct 17 Men's · Columbia at Dartmouth | L, 0-3",
 "Upcoming Oct 24, 7:00 PM Men's · Columbia vs Yale | ",
 "Upcoming Oct 27, 7:00 PM Men's · Columbia vs Hofstra | ",
 "Upcoming Oct 31, 7:00 PM Men's · Columbia at Penn | ",
 "Upcoming Nov 7, 3:00 PM Men's · Columbia at Cornell | ",
 "Upcoming Nov 12 Men's · Columbia at Ivy League Semifinals | ",
 "Upcoming Nov 15 Men's · Columbia at Ivy League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 30, 5:00 PM Women's · Columbia vs NYU | ",
 "Upcoming Oct 31, 1:00 PM Women's · Columbia at Fordham | ",
 "Upcoming Nov 6, 2:00 PM Women's · Columbia vs Dartmouth | ",
 "Upcoming Nov 6, 2:00 PM Women's · Columbia vs Princeton | ",
 "Upcoming Nov 14, 11:00 AM Women's · Columbia vs Brown | ",
 "Upcoming Nov 14, 11:00 AM Women's · Columbia at Harvard | ",
 "Upcoming Nov 20 Women's · Columbia at Big Al Invite | ",
 "Upcoming Dec 3 Women's · Columbia at Bucknell Invitational | ",
 "Upcoming Jan 15, 5:00 PM Women's · Columbia at Penn | ",
 "Upcoming Jan 15, 5:00 PM Women's · Columbia at Yale | ",
 "Upcoming Jan 23, 4:00 PM Women's · Columbia vs Rutgers | ",
 "Upcoming Jan 30, 12:00 PM Women's · Columbia at Cornell | ",
 "Upcoming Feb 5 Women's · Columbia at Boston University Invite | ",
 "Upcoming Feb 17 Women's · Columbia at Ivy League Championships | ",
 "Upcoming Mar 8 Women's · Columbia at NCAA Zone Diving | ",
 "Upcoming Mar 17 Women's · Columbia at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Nov 6, 10:00 AM Men's · Columbia vs Dartmouth | ",
 "Upcoming Nov 6, 10:00 AM Men's · Columbia vs Princeton | ",
 "Upcoming Nov 14, 3:30 PM Men's · Columbia at Harvard | ",
 "Upcoming Nov 14, 3:30 PM Men's · Columbia vs Brown | ",
 "Upcoming Nov 20 Men's · Columbia at Big Al Invite | ",
 "Upcoming Jan 16, 12:00 PM Men's · Columbia at Penn | ",
 "Upcoming Jan 16, 12:00 PM Men's · Columbia vs Yale | ",
 "Upcoming Jan 23, 11:00 AM Men's · Columbia vs Navy | ",
 "Upcoming Jan 29 Men's · Columbia at Cornell | ",
 "Upcoming Feb 24 Men's · Columbia at Ivy League Championships | ",
 "Upcoming Feb 26 Men's · Columbia at ECAC Championships | ",
 "Upcoming Mar 8 Men's · Columbia at NCAA Zone Diving | ",
 "Upcoming Mar 24 Men's · Columbia at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Columbia at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Columbia at Columbia Invitational | Completed",
 "Final Oct 2 Women's · Columbia at Fordham Four Invite | Completed",
 "Final Oct 15 Women's · Columbia at ITA Regionals | Completed",
 "Today Oct 23 Women's · Columbia at Ivy League Qualifier | ",
 "Upcoming Nov 5 Women's · Columbia at ITA Masters Championships | ",
 "Upcoming Nov 5 Women's · Columbia at UTR Prize Money Tournament | ",
 "Upcoming Nov 5 Women's · Columbia at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Columbia at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Columbia at Yale Invitational | Completed",
 "Final Oct 2 Men's · Columbia at Penn State Invitational | Completed",
 "Final Oct 15 Men's · Columbia at ITA Regionals | Completed",
 "Today Oct 23 Men's · Columbia at Ivy League Qualifier | ",
 "Upcoming Oct 30 Men's · Columbia at Notre Dame Invitational | ",
 "Upcoming Nov 5 Men's · Columbia at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Columbia at ITA Conference Championship | ",
 "Upcoming Nov 17 Men's · Columbia at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Columbia vs FDU | W, 3-1",
 "Final Sep 4 Columbia vs Iona | W, 3-1",
 "Final Sep 5 Columbia vs Lafayette | W, 3-1",
 "Final Sep 11 Columbia at Mercyhurst | W, 3-1",
 "Final Sep 11 Columbia vs Niagara | W, 3-1",
 "Final Sep 12 Columbia vs Kent State | L, 0-3",
 "Final Sep 18 Columbia at Purdue Fort Wayne | L, 1-3",
 "Final Sep 18 Columbia vs Indiana State | L, 2-3",
 "Final Sep 19 Columbia vs Stonehill | W, 3-0",
 "Final Sep 26 Columbia at Cornell | L, 0-3",
 "Final Oct 2 Columbia at Princeton | L, 0-3",
 "Final Oct 3 Columbia at Penn | L, 1-3",
 "Final Oct 9 Columbia vs Harvard | L, 0-3",
 "Final Oct 10 Columbia vs Dartmouth | W, 3-2",
 "Final Oct 16 Columbia at Yale | L, 0-3",
 "Final Oct 17 Columbia at Brown | L, 0-3",
 "Upcoming Oct 24, 6:00 PM Columbia vs Cornell | ",
 "Upcoming Oct 30, 6:00 PM Columbia vs Penn | ",
 "Upcoming Oct 31, 5:00 PM Columbia vs Princeton | ",
 "Upcoming Nov 6, 7:00 PM Columbia vs Brown | ",
 "Upcoming Nov 7, 5:00 PM Columbia vs Yale | ",
 "Upcoming Nov 13, 6:00 PM Columbia at Dartmouth | ",
 "Upcoming Nov 14, 5:00 PM Columbia at Harvard | ",
 "Upcoming Nov 20 Columbia vs Ivy League | ",
 "Upcoming Nov 21 Columbia vs Ivy League | ",
 "Upcoming Nov 22 Columbia vs Ivy League | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 8, 9:00 AM Columbia at Journeyman Collegiate Classic | ",
 "Upcoming Nov 13, 7:00 PM Columbia at Michigan | ",
 "Upcoming Nov 15, 2:00 PM Columbia at Ohio State | ",
 "Upcoming Nov 20, 7:00 PM Columbia vs Hofstra | ",
 "Upcoming Nov 22, 9:00 AM Columbia at Army | ",
 "Upcoming Dec 4, 9:00 AM Columbia at Cliff Keen Las Vegas Invite | ",
 "Upcoming Dec 12, 12:00 PM Columbia at Morgan State | ",
 "Upcoming Dec 13, 1:00 PM Columbia at American | ",
 "Upcoming Jan 3, 1:00 PM Columbia vs LIU | ",
 "Upcoming Jan 8, 9:00 AM Columbia at Franklin and Marshall Open | ",
 "Upcoming Jan 22, 7:00 PM Columbia vs Princeton | ",
 "Upcoming Jan 24, 1:00 PM Columbia vs Penn | ",
 "Upcoming Jan 31, 1:00 PM Columbia vs Cornell | ",
 "Upcoming Feb 13 Columbia at Harvard | ",
 "Upcoming Feb 14, 12:00 PM Columbia at Brown | ",
 "Upcoming Feb 20, 2:00 PM Columbia at Bucknell | ",
 "Upcoming Mar 7 Columbia at Ivy League | ",
 "Upcoming Mar 18 Columbia at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Columbia module checks passed");
