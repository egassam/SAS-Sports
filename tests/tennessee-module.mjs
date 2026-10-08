import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tennesseeSchool} from '../src/schools/tennessee.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tennessee');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tennesseeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tennessee-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tennessee'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',tennesseeSchool.scheduleUrls],['roster',tennesseeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tennessee|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utsports.com',`${key} must stay on utsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://utsports.com/sports/baseball/schedule"],"roster":["https://utsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://utsports.com/sports/mens-basketball/schedule","https://utsports.com/sports/womens-basketball/schedule"],"roster":["https://utsports.com/sports/mens-basketball/roster","https://utsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utsports.com/sports/cross-country/schedule"],"roster":["https://utsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://utsports.com/sports/football/schedule"],"roster":["https://utsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utsports.com/sports/womens-golf/schedule","https://utsports.com/sports/mens-golf/schedule"],"roster":["https://utsports.com/sports/womens-golf/roster","https://utsports.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://utsports.com/sports/womens-rowing/schedule"],"roster":["https://utsports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://utsports.com/sports/womens-soccer/schedule"],"roster":["https://utsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://utsports.com/sports/softball/schedule"],"roster":["https://utsports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://utsports.com/sports/swimming-and-diving/schedule"],"roster":["https://utsports.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://utsports.com/sports/womens-tennis/schedule","https://utsports.com/sports/mens-tennis/schedule"],"roster":["https://utsports.com/sports/womens-tennis/roster","https://utsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://utsports.com/sports/track-and-field/schedule"],"roster":["https://utsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://utsports.com/sports/womens-volleyball/schedule"],"roster":["https://utsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tennessee|"+sport+"':"),`${sport} routes must live in the Tennessee module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://utsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tennesseeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=tennessee)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19 Tennessee vs Northern Illinois | ",
 "Upcoming Feb 20 Tennessee vs Northern Illinois | ",
 "Upcoming Feb 21 Tennessee vs Northern Illinois | ",
 "Upcoming Feb 23 Tennessee vs High Point | ",
 "Upcoming Feb 26, 6:00 PM Tennessee vs Cincinnati | ",
 "Upcoming Feb 27, 12:00 PM Tennessee vs Illinois | ",
 "Upcoming Feb 28, 2:00 PM Tennessee vs Georgia Tech | ",
 "Upcoming Mar 2 Tennessee vs ETSU | ",
 "Upcoming Mar 5 Tennessee vs Missouri State | ",
 "Upcoming Mar 6 Tennessee vs Missouri State | ",
 "Upcoming Mar 7 Tennessee vs Missouri State | ",
 "Upcoming Mar 9 Tennessee vs Mississippi Valley State | ",
 "Upcoming Mar 10 Tennessee vs Mississippi Valley State | ",
 "Upcoming Mar 12 Tennessee vs Evansville | ",
 "Upcoming Mar 13 Tennessee vs Evansville | ",
 "Upcoming Mar 14 Tennessee vs Evansville | ",
 "Upcoming Mar 16 Tennessee vs Dayton | ",
 "Upcoming Mar 19 Tennessee vs Oklahoma | ",
 "Upcoming Mar 20 Tennessee vs Oklahoma | ",
 "Upcoming Mar 21 Tennessee vs Oklahoma | ",
 "Upcoming Mar 23 Tennessee vs Eastern Kentucky | ",
 "Upcoming Mar 26 Tennessee at Texas A&M | ",
 "Upcoming Mar 27 Tennessee at Texas A&M | ",
 "Upcoming Mar 28 Tennessee at Texas A&M | ",
 "Upcoming Mar 30 Tennessee vs Morehead State | ",
 "Upcoming Apr 2 Tennessee vs Arkansas | ",
 "Upcoming Apr 3 Tennessee vs Arkansas | ",
 "Upcoming Apr 4 Tennessee vs Arkansas | ",
 "Upcoming Apr 6 Tennessee vs Tennessee Tech | ",
 "Upcoming Apr 9 Tennessee at Texas | ",
 "Upcoming Apr 10 Tennessee at Texas | ",
 "Upcoming Apr 11 Tennessee at Texas | ",
 "Upcoming Apr 13 Tennessee vs Queens | ",
 "Upcoming Apr 16 Tennessee at Auburn | ",
 "Upcoming Apr 17 Tennessee at Auburn | ",
 "Upcoming Apr 18 Tennessee at Auburn | ",
 "Upcoming Apr 20 Tennessee vs Lipscomb | ",
 "Upcoming Apr 23 Tennessee vs Georgia | ",
 "Upcoming Apr 24 Tennessee vs Georgia | ",
 "Upcoming Apr 25 Tennessee vs Georgia | ",
 "Upcoming Apr 27 Tennessee vs Alabama A&M | ",
 "Upcoming Apr 30 Tennessee at Florida | ",
 "Upcoming May 1 Tennessee at Florida | ",
 "Upcoming May 2 Tennessee at Florida | ",
 "Upcoming May 4 Tennessee vs Eastern Kentucky | ",
 "Upcoming May 7 Tennessee vs Mississippi State | ",
 "Upcoming May 8 Tennessee vs Mississippi State | ",
 "Upcoming May 9 Tennessee vs Mississippi State | ",
 "Upcoming May 11 Tennessee vs Bellarmine | ",
 "Upcoming May 14 Tennessee at Alabama | ",
 "Upcoming May 15 Tennessee at Alabama | ",
 "Upcoming May 16 Tennessee at Alabama | ",
 "Upcoming May 18 Tennessee vs Belmont | ",
 "Upcoming May 20 Tennessee vs Vanderbilt | ",
 "Upcoming May 21 Tennessee vs Vanderbilt | ",
 "Upcoming May 22 Tennessee vs Vanderbilt | ",
 "Upcoming May 25 Tennessee at SEC Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 15, 7:00 PM Men's · Tennessee vs Xavier (Exhibition) | ",
 "Upcoming Oct 20, 7:00 PM Men's · Tennessee at Duke (Exhibition) | ",
 "Upcoming Nov 3, 6:00 PM Men's · Tennessee vs Wofford | ",
 "Upcoming Nov 9, 7:00 PM Men's · Tennessee vs Radford | ",
 "Upcoming Nov 13, 7:00 PM Men's · Tennessee vs Tennessee State | ",
 "Upcoming Nov 17, 9:00 PM Men's · Tennessee vs Michigan State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Tennessee vs Coastal Carolina | ",
 "Upcoming Nov 24, 3:00 PM Men's · Tennessee vs Maryland | ",
 "Upcoming Nov 26 Men's · Tennessee vs Iowa State/San Diego State | ",
 "Upcoming Nov 27 Men's · Tennessee at Players Era Men's Championship | ",
 "Upcoming Dec 1, 7:00 PM Men's · Tennessee vs Florida State | ",
 "Upcoming Dec 6, 7:00 PM Men's · Tennessee vs NC State | ",
 "Upcoming Dec 11, 8:00 PM Men's · Tennessee at Purdue | ",
 "Upcoming Dec 16, 8:00 PM Men's · Tennessee vs Morehead State | ",
 "Upcoming Dec 20, 4:00 PM Men's · Tennessee vs Marist | ",
 "Upcoming Dec 29, 7:00 PM Men's · Tennessee vs Norfolk State | ",
 "Upcoming Jan 2, 2:00 PM Men's · Tennessee vs Vanderbilt | ",
 "Upcoming Jan 6, 7:00 PM Men's · Tennessee at Auburn | ",
 "Upcoming Jan 9, 8:30 PM Men's · Tennessee at LSU | ",
 "Upcoming Jan 13, 7:00 PM Men's · Tennessee vs Missouri | ",
 "Upcoming Jan 16, 12:00 PM Men's · Tennessee vs Arkansas | ",
 "Upcoming Jan 23, 2:00 PM Men's · Tennessee at Kentucky | ",
 "Upcoming Jan 26, 7:00 PM Men's · Tennessee at Texas A&M | ",
 "Upcoming Jan 30 Men's · Tennessee vs Florida | ",
 "Upcoming Feb 3, 7:00 PM Men's · Tennessee vs Georgia | ",
 "Upcoming Feb 6, 1:00 PM Men's · Tennessee at Missouri | ",
 "Upcoming Feb 10, 7:00 PM Men's · Tennessee at Oklahoma | ",
 "Upcoming Feb 13, 4:00 PM Men's · Tennessee vs Kentucky | ",
 "Upcoming Feb 17, 7:00 PM Men's · Tennessee at Ole Miss | ",
 "Upcoming Feb 20, 2:00 PM Men's · Tennessee vs Alabama | ",
 "Upcoming Feb 23, 7:00 PM Men's · Tennessee vs South Carolina | ",
 "Upcoming Feb 27 Men's · Tennessee at Texas | ",
 "Upcoming Mar 2, 6:00 PM Men's · Tennessee vs Mississippi State | ",
 "Upcoming Mar 6, 2:00 PM Men's · Tennessee at Vanderbilt | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · Tennessee vs Florida A&M (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Women's · Tennessee vs Duquesne | ",
 "Upcoming Nov 5, 7:00 PM Women's · Tennessee at Coppin State | ",
 "Upcoming Nov 10, 6:30 PM Women's · Tennessee vs New Haven | ",
 "Upcoming Nov 12, 6:30 PM Women's · Tennessee vs Middle Tennessee | ",
 "Upcoming Nov 17, 7:30 PM Women's · Tennessee at Belmont | ",
 "Upcoming Nov 19, 7:00 PM Women's · Tennessee vs Radford | ",
 "Upcoming Nov 22, 5:30 PM Women's · Tennessee vs UCLA | ",
 "Upcoming Nov 27, 6:30 PM Women's · Tennessee at Florida Gulf Coast | ",
 "Upcoming Nov 29 Women's · Tennessee vs Creighton or Houston | ",
 "Upcoming Dec 3, 9:00 PM Women's · Tennessee at Virginia Tech | ",
 "Upcoming Dec 6, 2:00 PM Women's · Tennessee vs Georgia State | ",
 "Upcoming Dec 8, 7:00 PM Women's · Tennessee vs North Carolina Central | ",
 "Upcoming Dec 12, 2:30 PM Women's · Tennessee at UConn | ",
 "Upcoming Dec 15, 7:00 PM Women's · Tennessee vs Alabama A&M | ",
 "Upcoming Dec 18, 6:00 PM Women's · Tennessee vs Baylor | ",
 "Upcoming Dec 21, 2:00 PM Women's · Tennessee vs Morehead State | ",
 "Upcoming Dec 31, 3:00 PM Women's · Tennessee at Texas A&M | ",
 "Upcoming Jan 3, 5:00 PM Women's · Tennessee vs Ole Miss | ",
 "Upcoming Jan 7, 7:00 PM Women's · Tennessee at Texas | ",
 "Upcoming Jan 10, 5:00 PM Women's · Tennessee vs Oklahoma | ",
 "Upcoming Jan 14, 6:30 PM Women's · Tennessee vs Georgia | ",
 "Upcoming Jan 18, 7:00 PM Women's · Tennessee at Florida | ",
 "Upcoming Jan 21, 8:00 PM Women's · Tennessee at Kentucky | ",
 "Upcoming Jan 24, 1:00 PM Women's · Tennessee vs Alabama | ",
 "Upcoming Jan 28, 6:30 PM Women's · Tennessee vs South Carolina | ",
 "Upcoming Feb 4, 7:30 PM Women's · Tennessee at Mississippi State | ",
 "Upcoming Feb 7 Women's · Tennessee at Vanderbilt | ",
 "Upcoming Feb 11, 6:30 PM Women's · Tennessee vs Auburn | ",
 "Upcoming Feb 14, 2:00 PM Women's · Tennessee at Missouri | ",
 "Upcoming Feb 21, 1:00 PM Women's · Tennessee vs Kentucky | ",
 "Upcoming Feb 25, 6:00 PM Women's · Tennessee vs LSU | ",
 "Upcoming Feb 28, 3:00 PM Women's · Tennessee at Arkansas | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Tennessee at Tennessee Invitational | Women's team: 1st / Men's team: 2nd",
 "Final Sep 25 Tennessee at Gans Creek Classic | Women's team: 9th / Men's team: 2nd",
 "Upcoming Oct 9 Tennessee at Nuttycombe Invitational | ",
 "Upcoming Oct 30 Tennessee at SEC Championships | ",
 "Upcoming Nov 13 Tennessee at NCAA South Region Championships | ",
 "Upcoming Nov 21 Tennessee at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Tennessee vs Furman | W, 56-9",
 "Final Sep 12 Tennessee at Georgia Tech | W, 45-24",
 "Final Sep 19 Tennessee vs Kennesaw State | W, 42-9",
 "Final Sep 26 Tennessee vs Texas | L, 17-20",
 "Final Oct 3 Tennessee vs Auburn | W, 24-14",
 "Upcoming Oct 10, 4:15 PM Tennessee at Arkansas | ",
 "Upcoming Oct 17, 3:30 PM Tennessee vs Alabama | ",
 "Upcoming Oct 24 Tennessee at South Carolina | ",
 "Upcoming Nov 7 Tennessee vs Kentucky | ",
 "Upcoming Nov 14 Tennessee at Texas A&M | ",
 "Upcoming Nov 21 Tennessee vs LSU | ",
 "Upcoming Nov 28 Tennessee at Vanderbilt | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Tennessee at Cougar Classic | 2nd of 18",
 "Final Sep 21 Women's · Tennessee at Canadian Collegiate Invitational | 4th of 11",
 "Final Oct 4 Women's · Tennessee at Mercedes Benz Intercollegiate | 1st of 15",
 "Upcoming Oct 19 Women's · Tennessee at Abilene Christian Intercollegiate | ",
 "Upcoming Feb 1 Women's · Tennessee at FAU Paradise Invitational | ",
 "Upcoming Feb 15 Women's · Tennessee at Moon Golf Invitational | ",
 "Upcoming Mar 6 Women's · Tennessee at Gator Invitational | ",
 "Upcoming Mar 21 Women's · Tennessee at Clemson Invitational | ",
 "Upcoming Apr 5 Women's · Tennessee at Huntington Bank Collegiate | ",
 "Upcoming Apr 16 Women's · Tennessee at SEC Championships | ",
 "Upcoming May 10 Women's · Tennessee at NCAA Regionals | ",
 "Upcoming May 21 Women's · Tennessee at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Tennessee at Visit Knoxville Collegiate | 1st of 17",
 "Final Sep 13 Men's · Tennessee at Inverness Intercollegiate | T6th of 18",
 "Final Oct 5 Men's · Tennessee at Cullan Brown Collegiate | 1st of 15",
 "Upcoming Oct 17 Men's · Tennessee at Fallen Oak Collegiate Invitational | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Tennessee vs Rutgers | W, 4-1",
 "Final Aug 16 Tennessee vs South Alabama | W, 2-0",
 "Final Aug 20 Tennessee vs Milwaukee | W, 4-0",
 "Final Aug 23 Tennessee vs Western Carolina | W, 4-0",
 "Final Sep 3 Tennessee at Virginia | T, 1-1",
 "Final Sep 6 Tennessee vs Northwestern | W, 1-0",
 "Final Sep 11 Tennessee at LSU | W, 3-1",
 "Final Sep 18 Tennessee at Texas | T, 2-2",
 "Final Sep 24 Tennessee vs Mississippi State | T, 0-0",
 "Final Sep 27 Tennessee vs Vanderbilt | L, 1-3",
 "Final Oct 1 Tennessee at Auburn | L, 0-1",
 "Upcoming Oct 9, 7:00 PM Tennessee at South Carolina | ",
 "Upcoming Oct 15, 7:00 PM Tennessee vs Arkansas | ",
 "Upcoming Oct 18, 2:00 PM Tennessee vs Kentucky | ",
 "Upcoming Oct 23, 8:00 PM Tennessee at Alabama | ",
 "Upcoming Nov 1, 1:00 PM Tennessee vs Oklahoma | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 6:00 PM Tennessee vs Northeast Alabama | ",
 "Upcoming Oct 10, 1:00 PM Tennessee vs Northwest Florida State College | ",
 "Upcoming Oct 11, 3:00 PM Tennessee vs Roane State | ",
 "Upcoming Oct 18, 3:00 PM Tennessee at Middle Tennessee | ",
 "Upcoming Oct 23, 6:00 PM Tennessee vs Lee University | ",
 "Upcoming Mar 12 Tennessee at Texas A&M | ",
 "Upcoming Mar 13 Tennessee at Texas A&M | ",
 "Upcoming Mar 14 Tennessee at Texas A&M | ",
 "Upcoming Mar 19 Tennessee vs Texas | ",
 "Upcoming Mar 20 Tennessee vs Texas | ",
 "Upcoming Mar 21 Tennessee vs Texas | ",
 "Upcoming Mar 26 Tennessee at LSU | ",
 "Upcoming Mar 27 Tennessee at LSU | ",
 "Upcoming Mar 28 Tennessee at LSU | ",
 "Upcoming Apr 3 Tennessee vs Oklahoma | ",
 "Upcoming Apr 4 Tennessee vs Oklahoma | ",
 "Upcoming Apr 5 Tennessee vs Oklahoma | ",
 "Upcoming Apr 9 Tennessee at Auburn | ",
 "Upcoming Apr 10 Tennessee at Auburn | ",
 "Upcoming Apr 11 Tennessee at Auburn | ",
 "Upcoming Apr 23 Tennessee vs Georgia | ",
 "Upcoming Apr 24 Tennessee vs Georgia | ",
 "Upcoming Apr 25 Tennessee vs Georgia | ",
 "Upcoming Apr 30 Tennessee at Arkansas | ",
 "Upcoming May 1 Tennessee at Arkansas | ",
 "Upcoming May 2 Tennessee at Arkansas | ",
 "Upcoming May 6 Tennessee vs Missouri | ",
 "Upcoming May 7 Tennessee vs Missouri | ",
 "Upcoming May 8 Tennessee vs Missouri | ",
 "Upcoming May 11 Tennessee at SEC Tournament | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Upcoming Oct 9, 6:30 PM Tennessee vs CSL Meet #1 (Louisville, Michigan, Virginia) | ",
 "Upcoming Oct 10, 10:00 AM Tennessee vs Carson-Newman | ",
 "Upcoming Oct 23, 5:30 PM Tennessee vs CSL Meet #2 (Alabama, Auburn, Georgia) | ",
 "Upcoming Nov 5, 2:30 PM Tennessee vs CSL Wild Card | ",
 "Upcoming Nov 6, 4:30 PM Tennessee at CSL Championship | ",
 "Upcoming Nov 18 Tennessee at Tennessee Invitational | ",
 "Upcoming Dec 9 Tennessee at USA Diving Winter Nationals | ",
 "Upcoming Dec 11, 4:00 PM Tennessee at Kentucky | ",
 "Upcoming Jan 7 Tennessee at UT Diving Invitational | ",
 "Upcoming Jan 16, 12:00 PM Tennessee vs South Carolina | ",
 "Upcoming Jan 23, 12:00 PM Tennessee vs Georgia | ",
 "Upcoming Jan 29, 5:00 PM Tennessee at Duke | ",
 "Upcoming Feb 14 Tennessee at SEC Championships | ",
 "Upcoming Feb 26 Tennessee vs Last Chance Meet | ",
 "Upcoming Mar 6 Tennessee at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 17 Tennessee at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 Tennessee at NCAA Men's Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Tennessee at ITA All-American Championships | Completed",
 "Today Oct 8 Women's · Tennessee at ITA Ohio Valley Regionals | ",
 "Upcoming Nov 5 Women's · Tennessee at ITA South Sectionals | ",
 "Upcoming Nov 17 Women's · Tennessee at NCAA Individual Championships | ",
 "Upcoming Jan 7 Women's · Tennessee at Vanderbilt Invite | ",
 "Upcoming Jan 13, 11:00 AM Women's · Tennessee vs ETSU | ",
 "Upcoming Jan 13, 4:00 PM Women's · Tennessee vs UNC Greensboro | ",
 "Upcoming Jan 16 Women's · Tennessee at Wake Forest | ",
 "Upcoming Jan 22 Women's · Tennessee at Stanford | ",
 "Upcoming Jan 24 Women's · Tennessee at Vanderbilt OR Arizona | ",
 "Upcoming Feb 4 Women's · Tennessee at ITA National Indoor Championships | ",
 "Upcoming Feb 19, 10:00 AM Women's · Tennessee vs Bellarmine | ",
 "Upcoming Feb 23 Women's · Tennessee at MTSU | ",
 "Upcoming Feb 28 Women's · Tennessee at Kentucky | ",
 "Upcoming Mar 5, 12:00 PM Women's · Tennessee vs Alabama | ",
 "Upcoming Mar 7, 12:00 PM Women's · Tennessee vs Mississippi State | ",
 "Upcoming Mar 12 Women's · Tennessee at Ole Miss | ",
 "Upcoming Mar 14 Women's · Tennessee at LSU | ",
 "Upcoming Mar 19 Women's · Tennessee at Vanderbilt | ",
 "Upcoming Mar 21, 12:00 PM Women's · Tennessee at Missouri | ",
 "Upcoming Mar 25, 5:00 PM Women's · Tennessee vs South Carolina | ",
 "Upcoming Mar 27, 11:00 AM Women's · Tennessee vs Georgia | ",
 "Upcoming Apr 2, 5:00 PM Women's · Tennessee vs Texas | ",
 "Upcoming Apr 4 Women's · Tennessee at Texas A&M | ",
 "Upcoming Apr 9 Women's · Tennessee at Oklahoma | ",
 "Upcoming Apr 11 Women's · Tennessee at Arkansas | ",
 "Upcoming Apr 16, 5:00 PM Women's · Tennessee vs Auburn | ",
 "Upcoming Apr 18, 1:00 PM Women's · Tennessee vs Florida | ",
 "Upcoming Apr 20 Women's · Tennessee at SEC Women's Tennis Championships | ",
 "Upcoming May 7 Women's · Tennessee at NCAA Regionals | ",
 "Upcoming May 14 Women's · Tennessee at NCAA Super Regionals | ",
 "Upcoming May 20 Women's · Tennessee at NCAA Team Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Tennessee at Rocky Top Invite | Completed",
 "Final Sep 28 Men's · Tennessee at M15 Fayetteville | Completed",
 "Final Sep 28 Men's · Tennessee at M15 Ann Arbor | Completed",
 "Final Oct 2 Men's · Tennessee at Louisville Invitational | Completed",
 "Today Oct 8 Men's · Tennessee at ITA Ohio Valley Regional Championships | ",
 "Upcoming Oct 12 Men's · Tennessee at M15 Lexington | ",
 "Upcoming Oct 19 Men's · Tennessee at M15 Ithaca | ",
 "Upcoming Oct 23 Men's · Tennessee at RTC Collegiate Invite | ",
 "Upcoming Oct 27 Men's · Tennessee at UTR PTT Knoxville | ",
 "Upcoming Nov 5 Men's · Tennessee at ITA Sectional Championships | ",
 "Upcoming Nov 9 Men's · Tennessee at Knoxville Challenger | ",
 "Upcoming Nov 17 Men's · Tennessee at NCAA Singles & Doubles Championships | ",
 "Upcoming Jan 9 Men's · Tennessee vs ETSU | ",
 "Upcoming Jan 9 Men's · Tennessee vs UNC Asheville | ",
 "Upcoming Jan 17 Men's · Tennessee at Wake Forest | ",
 "Upcoming Jan 23 Men's · Tennessee at Mississippi State | ",
 "Upcoming Jan 24 Men's · Tennessee at UNC OR USC | ",
 "Upcoming Jan 29 Men's · Tennessee vs Furman | ",
 "Upcoming Jan 29 Men's · Tennessee vs Tennessee Tech | ",
 "Upcoming Jan 31 Men's · Tennessee vs Belmont | ",
 "Upcoming Feb 12 Men's · Tennessee at ITA National Team Indoor Championship | ",
 "Upcoming Feb 25 Men's · Tennessee vs Kentucky | ",
 "Upcoming Mar 4 Men's · Tennessee at Florida | ",
 "Upcoming Mar 6 Men's · Tennessee at South Carolina | ",
 "Upcoming Mar 12 Men's · Tennessee vs LSU | ",
 "Upcoming Mar 14 Men's · Tennessee vs Mississippi State | ",
 "Upcoming Mar 18 Men's · Tennessee at Arkansas | ",
 "Upcoming Mar 20 Men's · Tennessee at Oklahoma | ",
 "Upcoming Mar 25 Men's · Tennessee at Georgia | ",
 "Upcoming Mar 27 Men's · Tennessee at Auburn | ",
 "Upcoming Apr 1 Men's · Tennessee vs Texas A&M | ",
 "Upcoming Apr 3 Men's · Tennessee vs Texas | ",
 "Upcoming Apr 9 Men's · Tennessee vs Ole Miss | ",
 "Upcoming Apr 11 Men's · Tennessee vs Vanderbilt | ",
 "Upcoming Apr 18 Men's · Tennessee at Alabama | ",
 "Upcoming Apr 21 Men's · Tennessee at SEC Championships | ",
 "Upcoming May 7 Men's · Tennessee at NCAA Regionals | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 4 Tennessee at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Jan 8 Tennessee at Rod McCravy Memorial Invitational | ",
 "Upcoming Jan 15 Tennessee at Virginia Tech Invitational | ",
 "Upcoming Jan 22 Tennessee at Orange & Purple Invite | ",
 "Upcoming Jan 22 Tennessee at Vanderbilt Invitational | ",
 "Upcoming Jan 29 Tennessee at PNC Lenny Lyles Open | ",
 "Upcoming Jan 29 Tennessee at Bob Pollock Invitational | ",
 "Upcoming Feb 5 Tennessee at New Mexico Collegiate Classic | ",
 "Upcoming Feb 5 Tennessee at Doc Hale VT Meet | ",
 "Upcoming Feb 12 Tennessee at Tiger Paw Invitational | ",
 "Upcoming Feb 12 Tennessee at David Hemery Valentine Invitational | ",
 "Upcoming Feb 20 Tennessee at Virginia Tech Challenge | ",
 "Upcoming Feb 25 Tennessee at SEC Indoor Championships | ",
 "Upcoming Mar 12 Tennessee at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Tennessee at Raleigh Relays | ",
 "Upcoming Apr 2 Tennessee at Pepsi Florida Relays | ",
 "Upcoming Apr 9 Tennessee at Tennessee Invite | ",
 "Upcoming Apr 16 Tennessee at Tom Jones Memorial Invitational | ",
 "Upcoming Apr 16 Tennessee at Wake Forest Invitational | ",
 "Upcoming Apr 30 Tennessee at Jim Green Invitational | ",
 "Upcoming May 13 Tennessee at SEC Outdoor Championships | ",
 "Upcoming May 26 Tennessee at NCAA East Preliminary Rounds | ",
 "Upcoming Jun 9 Tennessee at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Tennessee vs Colgate | W, 3-0",
 "Final Aug 29 Tennessee vs Morehead State | W, 3-0",
 "Final Aug 29 Tennessee vs Fairfield | W, 3-0",
 "Final Sep 1 Tennessee vs Illinois | W, 3-0",
 "Final Sep 6 Tennessee vs Indiana | W, 3-0",
 "Final Sep 9 Tennessee vs Pitt | L, 0-3",
 "Final Sep 12 Tennessee vs Coastal Carolina | W, 3-0",
 "Final Sep 15 Tennessee at Queens | W, 3-0",
 "Final Sep 19 Tennessee vs USF | W, 3-0",
 "Final Sep 20 Tennessee at Penn State | W, 3-1",
 "Final Sep 25 Tennessee vs Texas | L, 2-3",
 "Final Oct 2 Tennessee at Florida | L, 0-3",
 "Final Oct 4 Tennessee at Auburn | W, 3-0",
 "Upcoming Oct 9, 6:30 PM Tennessee vs Ole Miss | ",
 "Upcoming Oct 11, 2:00 PM Tennessee vs LSU | ",
 "Upcoming Oct 16, 8:00 PM Tennessee at Arkansas | ",
 "Upcoming Oct 18, 3:00 PM Tennessee at Oklahoma | ",
 "Upcoming Oct 21, 7:00 PM Tennessee vs Kentucky | ",
 "Upcoming Oct 25, 1:00 PM Tennessee vs Vanderbilt | ",
 "Upcoming Oct 30, 7:30 PM Tennessee at Texas A&M | ",
 "Upcoming Nov 1, 3:00 PM Tennessee at Missouri | ",
 "Upcoming Nov 6, 6:30 PM Tennessee vs Mississippi State | ",
 "Upcoming Nov 8, 2:00 PM Tennessee vs Alabama | ",
 "Upcoming Nov 13, 7:00 PM Tennessee at Georgia | ",
 "Upcoming Nov 15, 1:00 PM Tennessee at South Carolina | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>{
  const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
  const published=[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')];
  const computed=worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual(computed,[published],`${sport}: the computed records are the official ones`);
  return published;
};

// Golf: the team score, then the place in the field without a suffix
// ("846 (-6)" and "2/18", "T-3/18"), from the last round's result.
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value}`).join(' / ')]);
  assert.deepEqual(final('womens-golf'),[["Cougar Classic","2nd of 18","Result: 2nd of 18 / Team score: 846 (-6)"],["Canadian Collegiate Invitational","4th of 11","Result: 4th of 11 / Team score: 892 (+28)"],["Mercedes Benz Intercollegiate","1st of 15","Result: 1st of 15 / Team score: 831 (-21)"]]);
  assert.deepEqual(final('mens-golf'),[["Visit Knoxville Collegiate","1st of 17","Result: 1st of 17 / Team score: 825 (-15)"],["Inverness Intercollegiate","T6th of 18","Result: T6th of 18 / Team score: 872 (+20)"],["Cullan Brown Collegiate","1st of 15","Result: 1st of 15 / Team score: 830 (-22)"]]);
}

// Tennis: a past tournament without a story (the ITA All-American, the
// players' pro M15 events) leaves the feed; one with a story stays.
{
  const finals=[...parse('Tennis','womens-tennis'),...parse('Tennis','mens-tennis')].filter(e=>e.status==='Final');
  assert.deepEqual(finals.filter(worker.tennesseeHandlers.isTennisWithoutStory).map(e=>e.opponent),["ITA All-American Championships","M15 Fayetteville","M15 Ann Arbor"]);
  assert.deepEqual(finals.filter(e=>!worker.tennesseeHandlers.isTennisWithoutStory(e)).map(e=>e.opponent),["Rocky Top Invite","Louisville Invitational"]);
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/TN_college_f_Tennessee.html',Men:'https://www.tfrrs.org/teams/xc/TN_college_m_Tennessee.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[["Tennessee Invitational","Women's team: 1st · 39 pts / Men's team: 2nd · 42 pts",true],["Gans Creek Classic","Women's team: 9th · 282 pts / Men's team: 2nd · 75 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Tennessee's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Tennessee vs Auburn","Final","W, 24-14"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Tennessee at Auburn","Final","W, 3-0"]]);
  live('Soccer','soccer-espn-2026-10-01.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-02T12:00:00Z'),[["Tennessee at Auburn","Final","L, 0-1"]]);
}

// Records equal the ones the official pages publish.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>records(sport,slug)),[["4-1","1-1"],["10-3","1-2"],["6-2-3","1-2-2"]]);

// Other schools and other hosts never reach the Tennessee reader.
assert.equal(worker.tennesseeHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://utsports.com/',now),null);
assert.equal(worker.tennesseeHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Tennessee module checks passed');
