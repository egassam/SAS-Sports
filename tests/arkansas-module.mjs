import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {arkansasSchool,arkansasMeetPlace,arkansasSeasonYear} from '../src/schools/arkansas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arkansas');
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
const worker=Function(...Object.keys(deps),source+';return {rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,arkansasHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/arkansas-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit arkansasrazorbacks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['arkansas'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',arkansasSchool.scheduleUrls],['roster',arkansasSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('arkansas|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'arkansasrazorbacks.com',`${key} must stay on arkansasrazorbacks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://arkansasrazorbacks.com/sport/m-basebl/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-basebl/roster/"],"combined":false},"Basketball":{"schedule":["https://arkansasrazorbacks.com/sport/m-baskbl/schedule/","https://arkansasrazorbacks.com/sport/w-baskbl/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-baskbl/roster/","https://arkansasrazorbacks.com/sport/w-baskbl/roster/"],"combined":true},"Cross Country":{"schedule":["https://arkansasrazorbacks.com/sport/m-xc/schedule/","https://arkansasrazorbacks.com/sport/w-xc/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-xc/roster/","https://arkansasrazorbacks.com/sport/w-xc/roster/"],"combined":true},"Football":{"schedule":["https://arkansasrazorbacks.com/sport/m-footbl/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-footbl/roster/"],"combined":false},"Golf":{"schedule":["https://arkansasrazorbacks.com/sport/m-golf/schedule/","https://arkansasrazorbacks.com/sport/w-golf/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-golf/roster/","https://arkansasrazorbacks.com/sport/w-golf/roster/"],"combined":true},"Gymnastics":{"schedule":["https://arkansasrazorbacks.com/sport/w-gym/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/w-gym/roster/"],"combined":false},"Soccer":{"schedule":["https://arkansasrazorbacks.com/sport/w-soccer/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/w-soccer/roster/"],"combined":false},"Softball":{"schedule":["https://arkansasrazorbacks.com/sport/w-softbl/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/w-softbl/roster/"],"combined":false},"Swimming & Diving":{"schedule":["https://arkansasrazorbacks.com/sport/w-swim/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/w-swim/roster/"],"combined":false},"Tennis":{"schedule":["https://arkansasrazorbacks.com/sport/m-tennis/schedule/","https://arkansasrazorbacks.com/sport/w-tennis/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-tennis/roster/","https://arkansasrazorbacks.com/sport/w-tennis/roster/"],"combined":true},"Track & Field":{"schedule":["https://arkansasrazorbacks.com/sport/m-track/schedule/","https://arkansasrazorbacks.com/sport/w-track/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/m-track/roster/","https://arkansasrazorbacks.com/sport/w-track/roster/"],"combined":true},"Volleyball":{"schedule":["https://arkansasrazorbacks.com/sport/w-volley/schedule/"],"roster":["https://arkansasrazorbacks.com/sport/w-volley/roster/"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'arkansas|"+sport+"':"),`${sport} routes must live in the Arkansas module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://arkansasrazorbacks.com/sport/${slug}/schedule/`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.arkansasHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=arkansas)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mbasebl=parse("Baseball","m-basebl");
  assert.deepEqual(v_mbasebl.map(line),[
 "Final Oct 3 Arkansas vs Little Rock (Game 1) | W, 10-2",
 "Final Oct 3 Arkansas vs Little Rock (Game 2) | W, 9-1",
 "Upcoming Oct 17, 4:00 PM Arkansas vs Dallas Baptist | ",
 "Upcoming Oct 23, 3:00 PM Arkansas vs UCA | ",
 "Upcoming Feb 19, 3:00 PM Arkansas vs Butler | ",
 "Upcoming Feb 20, 2:00 PM Arkansas vs Butler | ",
 "Upcoming Feb 21, 1:00 PM Arkansas vs Butler | ",
 "Upcoming Feb 23, 3:00 PM Arkansas vs South Dakota State | ",
 "Upcoming Feb 26, 7:00 PM Arkansas vs Oregon | ",
 "Upcoming Feb 27, 7:00 PM Arkansas vs Oregon State | ",
 "Upcoming Feb 28, 2:30 PM Arkansas vs Iowa | ",
 "Upcoming Mar 1, 12:00 PM Arkansas vs Tarleton State | ",
 "Upcoming Mar 5, 3:00 PM Arkansas vs Santa Clara | ",
 "Upcoming Mar 6, 2:00 PM Arkansas vs Santa Clara | ",
 "Upcoming Mar 7, 1:00 PM Arkansas vs Santa Clara | ",
 "Upcoming Mar 8, 1:00 PM Arkansas vs Santa Clara | ",
 "Upcoming Mar 10, 3:00 PM Arkansas vs Oral Roberts | ",
 "Upcoming Mar 12, 2:00 PM Arkansas vs Sacred Heart | ",
 "Upcoming Mar 13, 1:00 PM Arkansas vs Sacred Heart | ",
 "Upcoming Mar 14, 1:00 PM Arkansas vs Sacred Heart | ",
 "Upcoming Mar 16, 5:00 PM Arkansas vs Eastern Illinois | ",
 "Upcoming Mar 19 Arkansas at Ole Miss | ",
 "Upcoming Mar 20 Arkansas at Ole Miss | ",
 "Upcoming Mar 21 Arkansas at Ole Miss | ",
 "Upcoming Mar 23, 6:00 PM Arkansas at Missouri State | ",
 "Upcoming Mar 25, 6:00 PM Arkansas vs Alabama | ",
 "Upcoming Mar 26, 6:00 PM Arkansas vs Alabama | ",
 "Upcoming Mar 27, 2:00 PM Arkansas vs Alabama | ",
 "Upcoming Mar 30, 6:00 PM Arkansas vs Arkansas State | ",
 "Upcoming Mar 31, 3:00 PM Arkansas vs Arkansas State | ",
 "Upcoming Apr 2 Arkansas at Tennessee | ",
 "Upcoming Apr 3 Arkansas at Tennessee | ",
 "Upcoming Apr 4 Arkansas at Tennessee | ",
 "Upcoming Apr 6, 6:00 PM Arkansas vs UCA | ",
 "Upcoming Apr 9, 6:00 PM Arkansas vs LSU | ",
 "Upcoming Apr 10, 2:00 PM Arkansas vs LSU | ",
 "Upcoming Apr 11, 1:00 PM Arkansas vs LSU | ",
 "Upcoming Apr 13, 6:00 PM Arkansas vs Little Rock | ",
 "Upcoming Apr 14, 4:00 PM Arkansas vs Little Rock | ",
 "Upcoming Apr 16, 6:00 PM Arkansas vs Missouri | ",
 "Upcoming Apr 17, 2:00 PM Arkansas vs Missouri | ",
 "Upcoming Apr 18, 1:00 PM Arkansas vs Missouri | ",
 "Upcoming Apr 20, 6:00 PM Arkansas vs Memphis | ",
 "Upcoming Apr 23 Arkansas at Texas | ",
 "Upcoming Apr 24 Arkansas at Texas | ",
 "Upcoming Apr 25 Arkansas at Texas | ",
 "Upcoming Apr 27, 6:00 PM Arkansas vs Missouri State | ",
 "Upcoming Apr 30, 6:00 PM Arkansas vs Auburn | ",
 "Upcoming May 1, 6:00 PM Arkansas vs Auburn | ",
 "Upcoming May 2, 2:00 PM Arkansas vs Auburn | ",
 "Upcoming May 4, 6:00 PM Arkansas vs Grambling | ",
 "Upcoming May 7 Arkansas at Texas A&M | ",
 "Upcoming May 8 Arkansas at Texas A&M | ",
 "Upcoming May 9 Arkansas at Texas A&M | ",
 "Upcoming May 14, 6:00 PM Arkansas vs Kentucky | ",
 "Upcoming May 15, 6:00 PM Arkansas vs Kentucky | ",
 "Upcoming May 16, 2:00 PM Arkansas vs Kentucky | ",
 "Upcoming May 20 Arkansas at Mississippi State | ",
 "Upcoming May 21 Arkansas at Mississippi State | ",
 "Upcoming May 22 Arkansas at Mississippi State | ",
 "Upcoming May 25 Arkansas vs SEC Tournament | "
]);
  const v_mbaskbl=parse("Basketball","m-baskbl");
  assert.deepEqual(v_mbaskbl.map(line),[
 "Final Jul 31 Men's · Arkansas vs The Bahamas National Team (Exhibition) | W, 106-59",
 "Final Aug 1 Men's · Arkansas vs Carleton University (Exhibition) | W, 98-58",
 "Final Aug 3 Men's · Arkansas vs Toros del Valle (Exhibition) | W, 91-49",
 "Final Aug 4 Men's · Arkansas vs University of Calgary (Exhibition) | W, 105-48",
 "Upcoming Oct 24, 3:00 PM Men's · Arkansas vs Gonzaga | ",
 "Upcoming Oct 28, 7:00 PM Men's · Arkansas vs Memphis | ",
 "Upcoming Nov 3, 7:00 PM Men's · Arkansas vs Arkansas - Pine Bluff | ",
 "Upcoming Nov 8, 12:00 PM Men's · Arkansas vs Virginia | ",
 "Upcoming Nov 11, 7:00 PM Men's · Arkansas vs Robert Morris | ",
 "Upcoming Nov 13, 7:00 PM Men's · Arkansas vs Central Arkansas | ",
 "Upcoming Nov 17, 6:30 PM Men's · Arkansas vs Indiana | ",
 "Upcoming Nov 20, 7:00 PM Men's · Arkansas vs Mississippi Valley State | ",
 "Upcoming Nov 26, 3:30 PM Men's · Arkansas vs Michigan State | ",
 "Upcoming Dec 1, 6:30 PM Men's · Arkansas at North Carolina | ",
 "Upcoming Dec 5, 3:00 PM Men's · Arkansas vs Oral Roberts | ",
 "Upcoming Dec 8, 8:00 PM Men's · Arkansas vs Oakland | ",
 "Upcoming Dec 13, 4:00 PM Men's · Arkansas vs UT Arlington | ",
 "Upcoming Dec 19, 5:30 PM Men's · Arkansas vs Arizona | ",
 "Upcoming Dec 22, 6:00 PM Men's · Arkansas vs Central Michigan | ",
 "Upcoming Dec 29, 7:00 PM Men's · Arkansas vs UT Rio Grande Valley | ",
 "Upcoming Jan 2, 3:00 PM Men's · Arkansas vs Missouri | ",
 "Upcoming Jan 6, 8:00 PM Men's · Arkansas at South Carolina | ",
 "Upcoming Jan 9, 1:00 PM Men's · Arkansas vs Alabama | ",
 "Upcoming Jan 12, 6:00 PM Men's · Arkansas at Texas A&M | ",
 "Upcoming Jan 16, 11:00 AM Men's · Arkansas at Tennessee | ",
 "Upcoming Jan 19, 8:00 PM Men's · Arkansas vs Georgia | ",
 "Upcoming Jan 23, 5:00 PM Men's · Arkansas at Texas | ",
 "Upcoming Jan 26, 8:00 PM Men's · Arkansas vs LSU | ",
 "Upcoming Jan 30, 7:30 PM Men's · Arkansas vs Mississippi State | ",
 "Upcoming Feb 6 Men's · Arkansas at Vanderbilt | ",
 "Upcoming Feb 9, 8:00 PM Men's · Arkansas vs Ole Miss | ",
 "Upcoming Feb 13, 7:00 PM Men's · Arkansas at Alabama | ",
 "Upcoming Feb 16, 8:00 PM Men's · Arkansas vs Auburn | ",
 "Upcoming Feb 20 Men's · Arkansas at Kentucky | ",
 "Upcoming Feb 23, 6:00 PM Men's · Arkansas at Missouri | ",
 "Upcoming Feb 27, 2:00 PM Men's · Arkansas vs Florida | ",
 "Upcoming Mar 2, 8:00 PM Men's · Arkansas at LSU | ",
 "Upcoming Mar 6, 11:00 AM Men's · Arkansas vs Oklahoma | ",
 "Upcoming Mar 10 Men's · Arkansas vs SEC Tournament | ",
 "Upcoming Mar 18 Men's · Arkansas vs NCAA 1st & 2nd Rds | ",
 "Upcoming Mar 25 Men's · Arkansas vs NCAA Regionals | ",
 "Upcoming Apr 3 Men's · Arkansas vs NCAA Final Four | "
]);
  const v_wbaskbl=parse("Basketball","w-baskbl");
  assert.deepEqual(v_wbaskbl.map(line),[
 "Upcoming Oct 29, 6:30 PM Women's · Arkansas vs Cameron | ",
 "Upcoming Nov 2, 6:30 PM Women's · Arkansas vs New Orleans | ",
 "Upcoming Nov 6, 10:30 AM Women's · Arkansas vs Northwestern State | ",
 "Upcoming Nov 9, 6:30 PM Women's · Arkansas vs Kansas City | ",
 "Upcoming Nov 12, 6:30 PM Women's · Arkansas vs UAPB | ",
 "Upcoming Nov 16, 7:00 PM Women's · Arkansas at Little Rock | ",
 "Upcoming Nov 24, 5:30 PM Women's · Arkansas vs High Point | ",
 "Upcoming Nov 25, 5:30 PM Women's · Arkansas vs James Madison | ",
 "Upcoming Nov 29, 2:00 PM Women's · Arkansas vs Louisiana Tech | ",
 "Upcoming Dec 3, 8:00 PM Women's · Arkansas vs Wake Forest | ",
 "Upcoming Dec 6, 2:00 PM Women's · Arkansas vs Arkansas State | ",
 "Upcoming Dec 15, 6:30 PM Women's · Arkansas vs Central Arkansas | ",
 "Upcoming Dec 19, 2:00 PM Women's · Arkansas vs Missouri State | ",
 "Upcoming Dec 28, 6:30 PM Women's · Arkansas vs ULM | ",
 "Upcoming Dec 31, 8:00 PM Women's · Arkansas at Vanderbilt | ",
 "Upcoming Jan 3, 1:00 PM Women's · Arkansas vs Florida | ",
 "Upcoming Jan 7, 6:30 PM Women's · Arkansas vs Ole Miss | ",
 "Upcoming Jan 10, 3:00 PM Women's · Arkansas at South Carolina | ",
 "Upcoming Jan 14, 6:30 PM Women's · Arkansas at Kentucky | ",
 "Upcoming Jan 17, 1:00 PM Women's · Arkansas vs LSU | ",
 "Upcoming Jan 21, 5:30 PM Women's · Arkansas at Georgia | ",
 "Upcoming Jan 28, 6:30 PM Women's · Arkansas vs Mississippi State | ",
 "Upcoming Jan 31, 3:00 PM Women's · Arkansas at Auburn | ",
 "Upcoming Feb 4, 6:30 PM Women's · Arkansas vs Texas A&M | ",
 "Upcoming Feb 8, 6:30 PM Women's · Arkansas at Texas | ",
 "Upcoming Feb 11, 6:30 PM Women's · Arkansas vs Oklahoma | ",
 "Upcoming Feb 14, 2:00 PM Women's · Arkansas vs Alabama | ",
 "Upcoming Feb 21, 4:00 PM Women's · Arkansas at Missouri | ",
 "Upcoming Feb 25, 6:30 PM Women's · Arkansas at Mississippi State | ",
 "Upcoming Feb 28, 2:00 PM Women's · Arkansas vs Tennessee | ",
 "Upcoming Mar 3 Women's · Arkansas vs SEC Tournament | "
]);
  const v_mxc=parse("Cross Country","m-xc");
  assert.deepEqual(v_mxc.map(line),[
 "Final Sep 25 Men's · Arkansas at Gans Creek Classic | Completed",
 "Final Oct 3 Men's · Arkansas at Chile Pepper Festival | Completed",
 "Upcoming Oct 9, 11:10 AM Men's · Arkansas at Wisconsin Nuttycombe Invitational | ",
 "Upcoming Oct 30, 10:45 AM Men's · Arkansas at SEC Championships | ",
 "Upcoming Nov 13, 10:00 AM Men's · Arkansas at NCAA South Central Region | ",
 "Upcoming Nov 21, 10:10 AM Men's · Arkansas at NCAA Championships | "
]);
  const v_wxc=parse("Cross Country","w-xc");
  assert.deepEqual(v_wxc.map(line),[
 "Final Sep 25 Women's · Arkansas at Gans Creek Classic | Completed",
 "Final Oct 3 Women's · Arkansas at Chile Pepper Festival | Completed",
 "Upcoming Oct 16, 8:50 AM Women's · Arkansas at Arturo Barrios Invitational | ",
 "Upcoming Oct 30, 10:00 AM Women's · Arkansas at SEC Championships | ",
 "Upcoming Nov 13, 9:00 AM Women's · Arkansas at NCAA South Central Region | ",
 "Upcoming Nov 21, 9:20 AM Women's · Arkansas at NCAA Championships | "
]);
  const v_mfootbl=parse("Football","m-footbl");
  assert.deepEqual(v_mfootbl.map(line),[
 "Final Sep 5 Arkansas vs North Alabama | W, 31-14",
 "Final Sep 12 Arkansas at Utah | L, 10-43",
 "Final Sep 19 Arkansas vs Georgia | L, 17-45",
 "Final Sep 26 Arkansas vs Tulsa | W, 34-6",
 "Final Oct 3 Arkansas at Texas A&M | L, 7-34",
 "Upcoming Oct 10, 3:15 PM Arkansas vs Tennessee | ",
 "Upcoming Oct 17, 6:00 PM Arkansas at Vanderbilt | ",
 "Upcoming Oct 31 Arkansas vs Missouri | ",
 "Upcoming Nov 7 Arkansas at Auburn | ",
 "Upcoming Nov 14 Arkansas vs South Carolina | ",
 "Upcoming Nov 21 Arkansas at Texas | ",
 "Upcoming Nov 28 Arkansas vs LSU | "
]);
  const v_mgolf=parse("Golf","m-golf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 14 Men's · Arkansas at Vuori Invitational | 1st of 12",
 "Final Sep 28 Men's · Arkansas at The Bryan Bros Collegiate | 2nd of 16",
 "Final Oct 3 Men's · Arkansas at Blessings Collegiate Invitational | 1st of 9",
 "Upcoming Oct 17 Men's · Arkansas at Fallen Oak Collegiate Invitational | ",
 "Upcoming Feb 15 Men's · Arkansas at Watersound Invitational | ",
 "Upcoming Feb 28 Men's · Arkansas at CABO COLLEGIATE | ",
 "Upcoming Mar 8 Men's · Arkansas at Desimone Invitational | ",
 "Upcoming Mar 22 Men's · Arkansas at Valspar Collegiate Invitational | ",
 "Upcoming Apr 4 Men's · Arkansas at Calusa Cup | ",
 "Upcoming Apr 21 Men's · Arkansas at SEC Championship (Stroke Play) | ",
 "Upcoming Apr 24 Men's · Arkansas at SEC Championship (Match Play - Quarterfinal) | ",
 "Upcoming Apr 24 Men's · Arkansas at SEC Championship (Match Play - Semifinal) | ",
 "Upcoming Apr 25 Men's · Arkansas at SEC Championship (Match Play - Final) | ",
 "Upcoming May 17 Men's · Arkansas at NCAA Regional | ",
 "Upcoming May 28 Men's · Arkansas at NCAA Championship (Stroke Play) | ",
 "Upcoming Jun 1 Men's · Arkansas at NCAA Championship (Match Play - Quarterfinal) | ",
 "Upcoming Jun 1 Men's · Arkansas at NCAA Championship (Match Play - Semifinal) | ",
 "Upcoming Jun 2 Men's · Arkansas at NCAA Championship (Match Play - Final) | "
]);
  const v_wgolf=parse("Golf","w-golf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · Arkansas at Cougar Classic | 4th of 18",
 "Final Oct 3 Women's · Arkansas at Blessings Collegiate Invitational | 2nd of 9",
 "Upcoming Oct 12 Women's · Arkansas at Haskins Intercollegiate | ",
 "Upcoming Oct 19 Women's · Arkansas at The Fin | ",
 "Upcoming Oct 26 Women's · Arkansas at East Lake Cup | ",
 "Upcoming Feb 22 Women's · Arkansas at Chevron Collegiate | ",
 "Upcoming Mar 1 Women's · Arkansas at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 11 Women's · Arkansas at Nanea Cup | ",
 "Upcoming Mar 21 Women's · Arkansas at Clemson Invitational | ",
 "Upcoming Apr 16 Women's · Arkansas at SEC Championship - Stroke Play | ",
 "Upcoming Apr 19 Women's · Arkansas at SEC Championship - Match Play QF/SF | ",
 "Upcoming Apr 20 Women's · Arkansas at SEC Championship - Match Play Final | ",
 "Upcoming May 10 Women's · Arkansas at NCAA Regional | ",
 "Upcoming May 21 Women's · Arkansas at NCAA Championship - Stroke Play | ",
 "Upcoming May 25 Women's · Arkansas at NCAA Championship - Match Play QF/SF | ",
 "Upcoming May 26 Women's · Arkansas at NCAA Championship - Match Play Final | "
]);
  const v_wgym=parse("Gymnastics","w-gym");
  assert.deepEqual(v_wgym.map(line),[
 "Upcoming Jan 8 Arkansas vs SEMO | ",
 "Upcoming Jan 8 Arkansas vs West Virginia | ",
 "Upcoming Jan 15 Arkansas vs Florida | ",
 "Upcoming Jan 22 Arkansas at Auburn | ",
 "Upcoming Jan 29 Arkansas vs Alabama | ",
 "Upcoming Feb 5 Arkansas at Georgia | ",
 "Upcoming Feb 12 Arkansas at TWU | ",
 "Upcoming Feb 14 Arkansas at Boise State | ",
 "Upcoming Feb 14 Arkansas at Utah State | ",
 "Upcoming Feb 19 Arkansas vs Missouri | ",
 "Upcoming Feb 26 Arkansas at Oklahoma | ",
 "Upcoming Mar 5 Arkansas vs LSU | ",
 "Upcoming Mar 12 Arkansas at Kentucky | ",
 "Upcoming Mar 20 Arkansas at 2027 SEC Gymnastics Championships | ",
 "Upcoming Apr 1 Arkansas vs 2027 NCAA Gymnastics Regionals | ",
 "Upcoming Apr 15 Arkansas at 2027 NCAA Gymnastics Championships | "
]);
  const v_wsoccer=parse("Soccer","w-soccer");
  assert.deepEqual(v_wsoccer.map(line),[
 "Final Aug 5 Arkansas vs Kansas City (Exhibition) | W, 3-0",
 "Final Aug 8 Arkansas at Memphis (Exhibition) | L, 0-2",
 "Final Aug 12 Arkansas vs Baylor | L, 1-4",
 "Final Aug 16 Arkansas at Loyola Maryland | T, 1-1",
 "Final Aug 20 Arkansas vs North Carolina | L, 0-2",
 "Final Aug 27 Arkansas vs Clemson | L, 0-1",
 "Final Aug 30 Arkansas vs Little Rock | W, 9-0",
 "Final Sep 4 Arkansas vs Jackson State | W, 5-0",
 "Final Sep 10 Arkansas vs Texas | W, 3-1",
 "Final Sep 18 Arkansas at Alabama | L, 0-2",
 "Final Sep 24 Arkansas vs Georgia | T, 2-2",
 "Final Sep 27 Arkansas vs Auburn | W, 1-0",
 "Final Oct 2 Arkansas vs Missouri | T, 1-1",
 "Upcoming Oct 9, 7:00 PM Arkansas at LSU | ",
 "Upcoming Oct 15, 6:00 PM Arkansas at Tennessee | ",
 "Upcoming Oct 18, 1:30 PM Arkansas vs Florida | ",
 "Upcoming Oct 23, 7:00 PM Arkansas at Oklahoma | ",
 "Upcoming Nov 1, 12:00 PM Arkansas at Kentucky | ",
 "Upcoming Nov 8 Arkansas vs SEC Tournament | ",
 "Upcoming Nov 20 Arkansas vs NCAA Tournament | "
]);
  const v_wsoftbl=parse("Softball","w-softbl");
  assert.deepEqual(v_wsoftbl.map(line),[
 "Final Sep 20 Arkansas vs Harding (Game 1) | W, 12-0",
 "Final Sep 20 Arkansas vs Harding (Game 2) | W, 3-1",
 "Final Sep 27 Arkansas vs Missouri State | W, 8-1",
 "Final Sep 27 Arkansas vs Pittsburg State | W, 6-0",
 "Final Oct 3 Arkansas vs Tulsa | W, 13-3",
 "Final Oct 4 Arkansas vs McLennan CC | W, 4-0",
 "Upcoming Oct 17, 1:00 PM Arkansas vs Oklahoma State | ",
 "Upcoming Mar 12 Arkansas at South Carolina | ",
 "Upcoming Mar 13 Arkansas at South Carolina | ",
 "Upcoming Mar 14 Arkansas at South Carolina | ",
 "Upcoming Mar 19 Arkansas vs Ole Miss | ",
 "Upcoming Mar 20 Arkansas vs Ole Miss | ",
 "Upcoming Mar 21 Arkansas vs Ole Miss | ",
 "Upcoming Mar 26 Arkansas at Auburn | ",
 "Upcoming Mar 27 Arkansas at Auburn | ",
 "Upcoming Mar 28 Arkansas at Auburn | ",
 "Upcoming Apr 2 Arkansas vs Texas | ",
 "Upcoming Apr 3 Arkansas vs Texas | ",
 "Upcoming Apr 4 Arkansas vs Texas | ",
 "Upcoming Apr 9 Arkansas at LSU | ",
 "Upcoming Apr 10 Arkansas at LSU | ",
 "Upcoming Apr 11 Arkansas at LSU | ",
 "Upcoming Apr 16 Arkansas vs Texas A&M | ",
 "Upcoming Apr 17 Arkansas vs Texas A&M | ",
 "Upcoming Apr 18 Arkansas vs Texas A&M | ",
 "Upcoming Apr 23 Arkansas at Kentucky | ",
 "Upcoming Apr 24 Arkansas at Kentucky | ",
 "Upcoming Apr 25 Arkansas at Kentucky | ",
 "Upcoming Apr 30 Arkansas vs Tennessee | ",
 "Upcoming May 1 Arkansas vs Tennessee | ",
 "Upcoming May 2 Arkansas vs Tennessee | ",
 "Upcoming May 11 Arkansas vs SEC Tournament | "
]);
  const v_wswim=parse("Swimming & Diving","w-swim");
  assert.deepEqual(v_wswim.map(line),[
 "Final Sep 26 Arkansas at All-Arkansas Invite | 1st of 5",
 "Final Oct 3 Arkansas vs Drury | W, 209-83",
 "Final Oct 3 Arkansas vs TCU | W, 196-98",
 "Upcoming Oct 9, 5:00 PM Arkansas at SMU | ",
 "Upcoming Oct 23, 5:00 PM Arkansas at Rice | ",
 "Upcoming Nov 7, 11:00 AM Arkansas vs Texas A&M | ",
 "Upcoming Nov 7, 11:00 AM Arkansas vs Illinois | ",
 "Upcoming Nov 17 Arkansas at Ohio State | ",
 "Upcoming Nov 18 Arkansas at SMU | ",
 "Upcoming Jan 8, 5:00 PM Arkansas at Vanderbilt | ",
 "Upcoming Jan 9, 10:00 AM Arkansas at FGCU | ",
 "Upcoming Jan 9, 10:00 AM Arkansas at Indiana State | ",
 "Upcoming Jan 15, 3:00 PM Arkansas at Auburn | ",
 "Upcoming Jan 22, 2:00 PM Arkansas vs Kansas | ",
 "Upcoming Jan 23, 10:00 AM Arkansas at Little Rock | ",
 "Upcoming Jan 23, 10:00 AM Arkansas at Rice | ",
 "Upcoming Feb 14 Arkansas at SEC Diving Championships | ",
 "Upcoming Feb 16 Arkansas at SEC Swimming Championships | ",
 "Upcoming Feb 26 Arkansas at NCAA Last Chance | ",
 "Upcoming Mar 7 Arkansas at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 Arkansas at NCAA Championships | "
]);
  const v_mtennis=parse("Tennis","m-tennis");
  assert.deepEqual(v_mtennis.map(line),[
 "Final Sep 11 Men's · Arkansas at Midland Invitational | Completed",
 "Final Sep 19 Men's · Arkansas at ITA All-American Championships | Completed",
 "Final Oct 1 Men's · Arkansas at Little Rock Collegiate Tennis Challenge | Completed",
 "Today Oct 7 Men's · Arkansas at ITA Regional Championships | ",
 "Upcoming Nov 5 Men's · Arkansas at ITA Sectional Championships | ",
 "Upcoming Nov 16 Men's · Arkansas at NCAA Championships | "
]);
  const v_wtennis=parse("Tennis","w-tennis");
  assert.deepEqual(v_wtennis.map(line),[
 "Final Sep 19 Women's · Arkansas at ITA All-American Championships | Completed",
 "Upcoming Oct 14 Women's · Arkansas at 2026 ITA Central Regionals | "
]);
  const v_mtrack=parse("Track & Field","m-track");
  assert.deepEqual(v_mtrack.map(line),[
 "Upcoming Dec 4 Men's · Arkansas at BU Sharon Colyear-Danville Season Opener | ",
 "Upcoming Jan 15 Men's · Arkansas at Arkansas Invitational | ",
 "Upcoming Jan 16 Men's · Arkansas at Arkansas High School Invitational | ",
 "Upcoming Jan 29 Men's · Arkansas at Bucknam Razorback Invitational | ",
 "Upcoming Feb 5 Men's · Arkansas at New Mexico Collegiate Classic | ",
 "Upcoming Feb 12 Men's · Arkansas at Tyson Invitational | ",
 "Upcoming Feb 12 Men's · Arkansas at Washington Husky Classic | ",
 "Upcoming Feb 19 Men's · Arkansas vs Arkansas Qualifier | ",
 "Upcoming Feb 26 Men's · Arkansas at SEC Championships | ",
 "Upcoming Mar 12 Men's · Arkansas at NCAA Championships | "
]);
  const v_wtrack=parse("Track & Field","w-track");
  assert.deepEqual(v_wtrack.map(line),[]);
  const v_wvolley=parse("Volleyball","w-volley");
  assert.deepEqual(v_wvolley.map(line),[
 "Final Aug 28 Arkansas vs SIUE | W, 3-0",
 "Final Aug 29 Arkansas vs UTA | W, 3-0",
 "Final Aug 30 Arkansas vs UTSA | W, 3-1",
 "Final Sep 1 Arkansas vs Rutgers | L, 0-3",
 "Final Sep 2 Arkansas vs Maryland | L, 1-3",
 "Final Sep 9 Arkansas at Syracuse | W, 3-1",
 "Final Sep 11 Arkansas vs Robert Morris | W, 3-0",
 "Final Sep 11 Arkansas at Towson | W, 3-0",
 "Final Sep 12 Arkansas vs Howard | W, 3-1",
 "Final Sep 18 Arkansas at Arkansas State | W, 3-0",
 "Final Sep 19 Arkansas vs Illinois | L, 0-3",
 "Final Sep 25 Arkansas vs Auburn | L, 2-3",
 "Final Oct 2 Arkansas at Georgia | L, 1-3",
 "Final Oct 4 Arkansas at South Carolina | L, 2-3",
 "Upcoming Oct 9, 7:00 PM Arkansas vs Texas | ",
 "Upcoming Oct 11, 12:00 PM Arkansas vs Texas A&M | ",
 "Upcoming Oct 16, 7:00 PM Arkansas vs Tennessee | ",
 "Upcoming Oct 18, 2:00 PM Arkansas vs Kentucky | ",
 "Upcoming Oct 23, 6:00 PM Arkansas at Alabama | ",
 "Upcoming Oct 25, 2:00 PM Arkansas at Mississippi State | ",
 "Upcoming Oct 30, 6:00 PM Arkansas vs Oklahoma | ",
 "Upcoming Nov 1, 12:00 PM Arkansas at Florida | ",
 "Upcoming Nov 4, 6:00 PM Arkansas at LSU | ",
 "Upcoming Nov 8, 2:00 PM Arkansas at Ole MIss | ",
 "Upcoming Nov 13, 7:00 PM Arkansas vs Vanderbilt | ",
 "Upcoming Nov 15, 2:00 PM Arkansas vs Missouri | ",
 "Upcoming Nov 20 Arkansas vs 2026 SEC Volleyball Tournament | "
]);
  ownRecapsOnly(v_mbasebl,"Baseball m-basebl");
  ownRecapsOnly(v_wbaskbl,"Basketball w-baskbl");
  ownRecapsOnly(v_mxc,"Cross Country m-xc");
  ownRecapsOnly(v_wxc,"Cross Country w-xc");
  ownRecapsOnly(v_wgym,"Gymnastics w-gym");
  ownRecapsOnly(v_wsoftbl,"Softball w-softbl");
  ownRecapsOnly(v_mtennis,"Tennis m-tennis");
  ownRecapsOnly(v_wtennis,"Tennis w-tennis");
  ownRecapsOnly(v_mtrack,"Track & Field m-track");
  ownRecapsOnly(v_wtrack,"Track & Field w-track");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Arkansas module checks passed');

// Arkansas's cards (WordPress "bordeaux" template): the season is the page
// heading's; results write the winner's score first ("L, 43-10" is a 10-43
// loss); rankings ("#20", "No. 9") are dropped; "at" opens an away game.
{
  assert.equal(arkansasSeasonYear('<h1 class="sr-only"><span>2026-27</span>Football Schedule</h1>')(9),2026);
  assert.equal(arkansasSeasonYear('<h1 class="sr-only"><span>2026-27</span>Softball Schedule</h1>')(3),2027);
  assert.deepEqual(parse('Football','m-footbl').filter(e=>e.status==='Final').map(e=>[e.title,e.headline,e.school_score,e.opponent_score]),[["Arkansas vs North Alabama","W, 31-14","31","14"],["Arkansas at Utah","L, 10-43","10","43"],["Arkansas vs Georgia","L, 17-45","17","45"],["Arkansas vs Tulsa","W, 34-6","34","6"],["Arkansas at Texas A&M","L, 7-34","7","34"]]);
  // A window ("Flex 2:30-7 p.m.") is no published time.
  assert.deepEqual(parse('Football','m-footbl').filter(e=>/Missouri|Tennessee/.test(e.opponent)).map(e=>e.display_time),['Oct 10, 3:15 PM','Oct 31']);
  // Golf's day cards are one tournament; the last day's card gives its place
  // ("1st of 9 (858 / -6)"); swimming's "1st of 5, (552)".
  assert.deepEqual(arkansasMeetPlace('T3/18 (567, -1)'),{headline:'T3rd of 18',results:[{label:'Result',value:'T3rd of 18'},{label:'Team score',value:'567'}]});
  assert.deepEqual(arkansasMeetPlace('1st of 5, (552)').headline,'1st of 5');
  assert.equal(arkansasMeetPlace('Completed'),null);
  assert.deepEqual(parse('Golf','w-golf').filter(e=>e.status==='Final').map(e=>[e.title,e.headline,e.end_time]),[["Women's · Arkansas at Cougar Classic","4th of 18","2026-09-08T23:59:59Z"],["Women's · Arkansas at Blessings Collegiate Invitational","2nd of 9","2026-10-05T23:59:59Z"]]);
  // A doubleheader card ("W, 12-0 | W, 3-1") is two games.
  assert.deepEqual(parse('Softball','w-softbl').filter(e=>/Harding/.test(e.opponent)).map(e=>[e.opponent,e.headline]),[["Harding (Game 1)","W, 12-0"],["Harding (Game 2)","W, 3-1"]]);
  // Internal games and showcases are not listed.
  assert.ok(!parse('Baseball','m-basebl').some(e=>/Red-White|Derby/.test(e.opponent)));
  assert.ok(!parse('Basketball','m-baskbl').some(e=>/Primetime/.test(e.opponent)));
  // Women's track publishes no 2026-27 events yet: a valid empty schedule.
  assert.deepEqual(parse('Track & Field','w-track'),[]);
  assert.ok(worker.arkansasHandlers.isEmptySchedule(worker.arkansasHandlers.parseSchedule(fixture('w-track-schedule.html.gz'),school,'Track & Field',page('w-track'),now)));
}

// Records: soccer's equal the published "(4-4-3, 2-1-2 SEC)" ("Soccer
// Draws Missouri, 1-1", Oct 2): the two August exhibitions are left out.
{
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual(record('Soccer','w-soccer'),[['4-4-3','2-1-2']]);
  assert.deepEqual(parse('Soccer','w-soccer').slice(0,2).map(e=>e.opponent),['Kansas City (Exhibition)','Memphis (Exhibition)']);
}

// A final whose card links no story takes one from the team's WordPress
// category (published from the day before to four days after): a game's
// names the opponent and the score; a draw "draws".
{
  const missouri=parse('Soccer','w-soccer').find(e=>e.opponent==='Missouri');
  // Its card links the story; without that link, the archive finds it.
  assert.equal(missouri.recap_url,'https://arkansasrazorbacks.com/soccer-draws-missouri-1-1-at-razorback-field/');
  delete missouri.recap_url;
  recapFixtures.set('https://arkansasrazorbacks.com/wp-json/wp/v2/posts?categories=16&after=2026-10-01T00:00:00&before=2026-10-06T00:00:00&per_page=20&_fields=link,title,excerpt,date',fixture('wp-soccer-2026-10-02.json.gz'));
  await worker.arkansasHandlers.attachArchiveStory(missouri);
  assert.equal(missouri.recap_url,'https://arkansasrazorbacks.com/soccer-draws-missouri-1-1-at-razorback-field/');
  // The story is checked against its publication time (no date in its address).
  const story=fixture('story-soccer-draws-missouri-1-1-at-razorback-field.html.gz');
  assert.ok(worker.arkansasHandlers.matchesRecap(story,missouri,missouri.recap_url));
  assert.ok(!worker.arkansasHandlers.matchesRecap(story,{...missouri,start_time:'2026-09-24T12:00:00.000Z'},missouri.recap_url));
  // Cross country: each team page's meets take the team's own category.
  const gans=parse('Cross Country','w-xc').find(e=>/Gans Creek/.test(e.opponent));
  recapFixtures.set('https://arkansasrazorbacks.com/wp-json/wp/v2/posts?categories=13&after=2026-09-24T00:00:00&before=2026-09-29T00:00:00&per_page=20&_fields=link,title,excerpt,date',fixture('wp-w-xc-2026-09-25.json.gz'));
  await worker.arkansasHandlers.attachArchiveStory(gans);
  assert.equal(gans.recap_url,'https://arkansasrazorbacks.com/isca-chelangat-breaks-meet-record-to-win-gans-creek-classic/');
  recapFixtures.clear();requests.length=0;
}

// Cross country from TFRRS: the meet page holds both races; each team's event
// keeps its own.
{
  recapFixtures.set('https://www.tfrrs.org/teams/xc/AR_college_f_Arkansas.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/AR_college_m_Arkansas.html',fixture('tfrrs-team-m.html.gz'));
  for(const url of ['https://www.tfrrs.org/results/xc/28714/Gans_Creek_Classic','https://www.tfrrs.org/results/xc/28714/Gans_Creek_Classic/'])recapFixtures.set(url,fixture('tfrrs-28714.html.gz'));
  for(const [slug,headline] of [['w-xc',"Women's team: 5th · 169 pts"],['m-xc',"Men's team: 1st · 69 pts"]]){
    const gans=parse('Cross Country',slug).find(e=>/Gans Creek/.test(e.opponent));
    await worker.arkansasHandlers.attachMeetResults(gans);
    assert.equal(gans.headline,headline);
    assert.ok(gans.results.length&&gans.results.every(row=>row.group.startsWith(headline.split("'")[0])),`${slug}: only its own race`);
  }
  recapFixtures.clear();requests.length=0;
}

// Roster rows (/roster/<name>/ on the site's host) carry each athlete's
// Instagram in the same row.
{
  const profiles=worker.rosterProfiles(fixture('w-volley-roster.html.gz'),'https://arkansasrazorbacks.com/sport/w-volley/roster/');
  const roth=profiles.find(p=>p.name==='Ava Roth');
  assert.deepEqual([roth.url,roth.instagram_url],['https://arkansasrazorbacks.com/roster/ava-roth/','https://www.instagram.com/avaroth_11/']);
  assert.ok(profiles.filter(p=>p.instagram_url).length>=3);
  assert.ok(!profiles.some(p=>/coache/.test(p.url)));
}
console.log('Arkansas hand-written checks passed');
