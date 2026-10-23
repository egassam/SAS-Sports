import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dartmouthSchool} from '../src/schools/dartmouth.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='dartmouth');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,dartmouthHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/dartmouth-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit dartmouthsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['dartmouth'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',dartmouthSchool.scheduleUrls],['roster',dartmouthSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('dartmouth|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'dartmouthsports.com',`${key} must stay on dartmouthsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://dartmouthsports.com/sports/baseball/schedule"],"roster":["https://dartmouthsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://dartmouthsports.com/sports/mens-basketball/schedule","https://dartmouthsports.com/sports/womens-basketball/schedule"],"roster":["https://dartmouthsports.com/sports/mens-basketball/roster","https://dartmouthsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://dartmouthsports.com/sports/womens-cross-country/schedule","https://dartmouthsports.com/sports/mens-cross-country/schedule"],"roster":["https://dartmouthsports.com/sports/womens-cross-country/roster","https://dartmouthsports.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://dartmouthsports.com/sports/equestrian/schedule"],"roster":["https://dartmouthsports.com/sports/equestrian/roster"],"combined":false},"Field Hockey":{"schedule":["https://dartmouthsports.com/sports/field-hockey/schedule"],"roster":["https://dartmouthsports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://dartmouthsports.com/sports/football/schedule"],"roster":["https://dartmouthsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://dartmouthsports.com/sports/womens-golf/schedule","https://dartmouthsports.com/sports/mens-golf/schedule"],"roster":["https://dartmouthsports.com/sports/womens-golf/roster","https://dartmouthsports.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://dartmouthsports.com/sports/mens-ice-hockey/schedule","https://dartmouthsports.com/sports/womens-ice-hockey/schedule"],"roster":["https://dartmouthsports.com/sports/mens-ice-hockey/roster","https://dartmouthsports.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://dartmouthsports.com/sports/womens-lacrosse/schedule","https://dartmouthsports.com/sports/mens-lacrosse/schedule"],"roster":["https://dartmouthsports.com/sports/womens-lacrosse/roster","https://dartmouthsports.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://dartmouthsports.com/sports/womens-rowing/schedule","https://dartmouthsports.com/sports/mens-rowing/schedule","https://dartmouthsports.com/sports/rowing/schedule"],"roster":["https://dartmouthsports.com/sports/womens-rowing/roster","https://dartmouthsports.com/sports/mens-rowing/roster","https://dartmouthsports.com/sports/rowing/roster"],"combined":true},"Skiing":{"schedule":["https://dartmouthsports.com/sports/alpine-skiing/schedule"],"roster":["https://dartmouthsports.com/sports/alpine-skiing/roster"],"combined":false},"Soccer":{"schedule":["https://dartmouthsports.com/sports/womens-soccer/schedule","https://dartmouthsports.com/sports/mens-soccer/schedule"],"roster":["https://dartmouthsports.com/sports/womens-soccer/roster","https://dartmouthsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://dartmouthsports.com/sports/softball/schedule"],"roster":["https://dartmouthsports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://dartmouthsports.com/sports/womens-swimming-and-diving/schedule","https://dartmouthsports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://dartmouthsports.com/sports/womens-swimming-and-diving/roster","https://dartmouthsports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://dartmouthsports.com/sports/womens-tennis/schedule","https://dartmouthsports.com/sports/mens-tennis/schedule"],"roster":["https://dartmouthsports.com/sports/womens-tennis/roster","https://dartmouthsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://dartmouthsports.com/sports/womens-track-and-field/schedule","https://dartmouthsports.com/sports/mens-track-and-field/schedule"],"roster":["https://dartmouthsports.com/sports/womens-track-and-field/roster","https://dartmouthsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://dartmouthsports.com/sports/womens-volleyball/schedule"],"roster":["https://dartmouthsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'dartmouth|"+sport+"':"),`${sport} routes must live in the Dartmouth module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://dartmouthsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.dartmouthHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=dartmouth)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Dartmouth at Marist | ",
 "Upcoming Nov 4, 6:30 PM Men's · Dartmouth vs Framingham State | ",
 "Upcoming Nov 8, 2:00 PM Men's · Dartmouth vs Central Connecticut State | ",
 "Upcoming Nov 11 Men's · Dartmouth at Albany | ",
 "Upcoming Nov 15 Men's · Dartmouth at Boston University | ",
 "Upcoming Nov 17, 6:30 PM Men's · Dartmouth vs Maine Augusta | ",
 "Upcoming Nov 25, 5:00 PM Men's · Dartmouth vs Holy Cross | ",
 "Upcoming Nov 29 Men's · Dartmouth at Appalachian State | ",
 "Upcoming Dec 2 Men's · Dartmouth at Davidson | ",
 "Upcoming Dec 6, 2:00 PM Men's · Dartmouth vs Maine Maritime Academy | ",
 "Upcoming Dec 12, 1:00 PM Men's · Dartmouth at New Hampshire | ",
 "Upcoming Dec 16 Men's · Dartmouth at Temple | ",
 "Upcoming Dec 20, 2:00 PM Men's · Dartmouth vs Sacred Heart | ",
 "Upcoming Dec 29, 2:00 PM Men's · Dartmouth vs Stonehill | ",
 "Upcoming Jan 4, 6:30 PM Men's · Dartmouth vs Harvard | ",
 "Upcoming Jan 9, 2:00 PM Men's · Dartmouth vs Cornell | ",
 "Upcoming Jan 16, 2:00 PM Men's · Dartmouth at Princeton | ",
 "Upcoming Jan 18 Men's · Dartmouth at Penn | ",
 "Upcoming Jan 23, 2:00 PM Men's · Dartmouth at Columbia | ",
 "Upcoming Jan 29, 7:00 PM Men's · Dartmouth vs Brown | ",
 "Upcoming Jan 30, 6:00 PM Men's · Dartmouth vs Yale | ",
 "Upcoming Feb 6, 2:00 PM Men's · Dartmouth at Harvard | ",
 "Upcoming Feb 12, 7:00 PM Men's · Dartmouth at Brown | ",
 "Upcoming Feb 13, 7:00 PM Men's · Dartmouth at Yale | ",
 "Upcoming Feb 20, 2:00 PM Men's · Dartmouth vs Columbia | ",
 "Upcoming Feb 26, 7:00 PM Men's · Dartmouth vs Princeton | ",
 "Upcoming Feb 27, 5:00 PM Men's · Dartmouth vs Penn | ",
 "Upcoming Mar 6 Men's · Dartmouth at Cornell | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Dartmouth vs Boston University | ",
 "Upcoming Nov 5, 6:00 PM Women's · Dartmouth at Holy Cross | ",
 "Upcoming Nov 11, 6:30 PM Women's · Dartmouth vs UNH | ",
 "Upcoming Nov 14, 1:00 PM Women's · Dartmouth vs NJIT | ",
 "Upcoming Nov 16 Women's · Dartmouth vs Colby-Sawyer College | ",
 "Upcoming Nov 28, 1:00 PM Women's · Dartmouth vs St. Joseph's University, New York | ",
 "Upcoming Nov 30, 6:00 PM Women's · Dartmouth at New Haven | ",
 "Upcoming Dec 2, 6:30 PM Women's · Dartmouth vs Siena | ",
 "Upcoming Dec 5, 11:00 AM Women's · Dartmouth vs Iona | ",
 "Upcoming Dec 9, 6:00 PM Women's · Dartmouth at UMass Lowell | ",
 "Upcoming Dec 12 Women's · Dartmouth at Merrimack | ",
 "Upcoming Dec 16 Women's · Dartmouth at St. John's | ",
 "Upcoming Dec 18 Women's · Dartmouth at Rhode Island | ",
 "Upcoming Dec 28, 5:30 PM Women's · Dartmouth vs Vermont | ",
 "Upcoming Jan 2, 2:00 PM Women's · Dartmouth at Harvard | ",
 "Upcoming Jan 9, 2:00 PM Women's · Dartmouth at Cornell | ",
 "Upcoming Jan 16, 2:00 PM Women's · Dartmouth vs Penn | ",
 "Upcoming Jan 18, 6:00 PM Women's · Dartmouth vs Princeton | ",
 "Upcoming Jan 23, 2:00 PM Women's · Dartmouth vs Columbia | ",
 "Upcoming Jan 29 Women's · Dartmouth at Yale | ",
 "Upcoming Jan 30 Women's · Dartmouth at Brown | ",
 "Upcoming Feb 6, 2:00 PM Women's · Dartmouth vs Harvard | ",
 "Upcoming Feb 12, 6:00 PM Women's · Dartmouth vs Yale | ",
 "Upcoming Feb 13, 5:00 PM Women's · Dartmouth vs Brown | ",
 "Upcoming Feb 20 Women's · Dartmouth at Columbia | ",
 "Upcoming Feb 26 Women's · Dartmouth at Penn | ",
 "Upcoming Feb 27, 5:00 PM Women's · Dartmouth at Princeton | ",
 "Upcoming Mar 6, 2:00 PM Women's · Dartmouth vs Cornell | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Dartmouth at Friar Invitational | 8th, 212 pts.",
 "Final Sep 19 Women's · Dartmouth at Maribel Sanchez Souther Invitational | 7th, 150 pts.",
 "Final Oct 2 Women's · Dartmouth at Paul Short Invitational | 22nd, 610 pts.",
 "Final Oct 9 Women's · Dartmouth at NEICAAA Championships | Completed",
 "Final Oct 17 Women's · Dartmouth at ECAC/IC4A Cross-Country Championships | 9th, 233 pts.",
 "Upcoming Oct 31 Women's · Dartmouth at Ivy League Championships | ",
 "Upcoming Nov 13 Women's · Dartmouth at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Women's · Dartmouth at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Dartmouth at Friar Invitational | 3rd, 121 pts.",
 "Final Sep 19 Men's · Dartmouth at Maribel Sanchez Souther Invitational | 4th, 103 pts.",
 "Final Oct 2 Men's · Dartmouth at Paul Short Invitational | 15th, 459 pts.",
 "Final Oct 17 Men's · Dartmouth at ECAC/IC4A Cross-Country Championships | 5th, 174 pts.",
 "Upcoming Oct 31 Men's · Dartmouth at Ivy League Championships | ",
 "Upcoming Nov 13 Men's · Dartmouth at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Men's · Dartmouth at NCAA Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 25, 10:00 AM Dartmouth vs Sacred Heart | ",
 "Upcoming Oct 31, 10:45 AM Dartmouth at Sacred Heart | ",
 "Upcoming Feb 13 Dartmouth at Centenary (New Jersey) | ",
 "Upcoming Feb 27 Dartmouth at College of Charleston | ",
 "Upcoming Mar 25 Dartmouth at ECAC Single Discipline Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 6 Dartmouth at Boston University | L, 1-5",
 "Final Sep 11 Dartmouth vs Merrimack | W, 4-2",
 "Final Sep 13 Dartmouth vs Sacred Heart | L, 1-2",
 "Final Sep 18 Dartmouth vs Harvard | L, 1-2",
 "Final Sep 20 Dartmouth at Maine | L, 0-1",
 "Final Sep 25 Dartmouth vs Penn | W, 4-0",
 "Final Sep 27 Dartmouth vs Vermont | L, 0-2",
 "Final Oct 2 Dartmouth vs UC Davis | W, 3-1",
 "Final Oct 4 Dartmouth at Columbia | L, 1-3",
 "Final Oct 9 Dartmouth at Princeton | L, 0-4",
 "Final Oct 11 Dartmouth at Quinnipiac | L, 2-3",
 "Final Oct 16 Dartmouth vs Yale | L, 1-2",
 "Final Oct 18 Dartmouth at UMass Lowell | W, 1-0",
 "Today Oct 23, 3:00 PM Dartmouth vs Cornell | ",
 "Upcoming Oct 25, 1:00 PM Dartmouth vs Bryant | ",
 "Upcoming Oct 31, 12:00 PM Dartmouth at Brown | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Dartmouth at Lehigh | L, 20-24",
 "Final Sep 26 Dartmouth vs Monmouth | L, 28-31",
 "Final Oct 3 Dartmouth vs Penn | W, 14-10",
 "Final Oct 10 Dartmouth at Yale | L, 7-28",
 "Final Oct 17 Dartmouth vs Merrimack | W, 27-21",
 "Upcoming Oct 24, 1:30 PM Dartmouth at Columbia | ",
 "Upcoming Oct 30, 7:00 PM Dartmouth vs Harvard | ",
 "Upcoming Nov 7, 12:00 PM Dartmouth at Princeton | ",
 "Upcoming Nov 14, 1:00 PM Dartmouth at Cornell | ",
 "Upcoming Nov 21, 1:00 PM Dartmouth vs Brown | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 25 Women's · Dartmouth at Princeton Invitational | Completed",
 "Final Oct 3 Women's · Dartmouth at Yale Invitational | Completed",
 "Upcoming Oct 24 Women's · Dartmouth at Battle at the Beach | ",
 "Upcoming Feb 20 Women's · Dartmouth at Columbia Classic | ",
 "Upcoming Mar 21 Women's · Dartmouth at Lipscomb Invitational | ",
 "Upcoming Apr 3 Women's · Dartmouth at UNC Spring Shootout | ",
 "Upcoming Apr 10 Women's · Dartmouth at Rutgers Invitational | ",
 "Upcoming Apr 23 Women's · Dartmouth at Ivy League Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Dartmouth at Ryan T Memorial Collegiate | Completed",
 "Final Sep 25 Men's · Dartmouth at Macdonald Cup | Completed",
 "Final Oct 3 Men's · Dartmouth at Lake Placid | Completed",
 "Final Oct 12 Men's · Dartmouth at Metropolis Intercollegiate | Completed"
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Upcoming Oct 31, 7:00 PM Men's · Dartmouth vs Alaska Fairbanks | ",
 "Upcoming Nov 1, 3:00 PM Men's · Dartmouth vs Alaska Fairbanks | ",
 "Upcoming Nov 6, 7:00 PM Men's · Dartmouth vs Yale | ",
 "Upcoming Nov 7, 7:00 PM Men's · Dartmouth vs Brown | ",
 "Upcoming Nov 13, 7:00 PM Men's · Dartmouth at Quinnipiac | ",
 "Upcoming Nov 14, 7:00 PM Men's · Dartmouth at Princeton | ",
 "Upcoming Nov 27, 7:30 PM Men's · Dartmouth at Harvard | ",
 "Upcoming Nov 29, 2:00 PM Men's · Dartmouth vs Northeastern | ",
 "Upcoming Dec 4, 7:00 PM Men's · Dartmouth at Union | ",
 "Upcoming Dec 5, 4:00 PM Men's · Dartmouth at RPI | ",
 "Upcoming Dec 10, 6:30 PM Men's · Dartmouth vs Stonehill | ",
 "Upcoming Dec 13, 3:00 PM Men's · Dartmouth vs New Hampshire | ",
 "Upcoming Dec 15, 6:30 PM Men's · Dartmouth vs Holy Cross | ",
 "Upcoming Dec 19, 4:00 PM Men's · Dartmouth at Vermont | ",
 "Upcoming Jan 1, 7:00 PM Men's · Dartmouth at Brown | ",
 "Upcoming Jan 2, 7:00 PM Men's · Dartmouth at Yale | ",
 "Upcoming Jan 8, 7:00 PM Men's · Dartmouth vs Princeton | ",
 "Upcoming Jan 9, 7:00 PM Men's · Dartmouth vs Quinnipiac | ",
 "Upcoming Jan 15, 7:00 PM Men's · Dartmouth vs St. Lawrence | ",
 "Upcoming Jan 16, 7:00 PM Men's · Dartmouth vs Clarkson | ",
 "Upcoming Jan 22, 7:00 PM Men's · Dartmouth at Colgate | ",
 "Upcoming Jan 23, 7:00 PM Men's · Dartmouth at Cornell | ",
 "Upcoming Jan 31 Men's · Dartmouth at Merrimack | ",
 "Upcoming Feb 5, 7:00 PM Men's · Dartmouth vs Harvard | ",
 "Upcoming Feb 12, 7:00 PM Men's · Dartmouth vs RPI | ",
 "Upcoming Feb 13, 7:00 PM Men's · Dartmouth vs Union | ",
 "Upcoming Feb 19, 7:00 PM Men's · Dartmouth vs Cornell | ",
 "Upcoming Feb 20, 7:00 PM Men's · Dartmouth vs Colgate | ",
 "Upcoming Feb 26, 7:00 PM Men's · Dartmouth at Clarkson | ",
 "Upcoming Feb 27, 7:00 PM Men's · Dartmouth at St. Lawrence | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 16 Women's · Dartmouth vs Saint Michael's | W, 9-0",
 "Final Oct 17 Women's · Dartmouth at Saint Michael's | W, 12-1",
 "Today Oct 23, 6:00 PM Women's · Dartmouth vs Holy Cross | ",
 "Upcoming Oct 24, 6:00 PM Women's · Dartmouth vs Holy Cross | ",
 "Upcoming Oct 30, 11:00 AM Women's · Dartmouth vs St. Lawrence | ",
 "Upcoming Oct 31, 3:00 PM Women's · Dartmouth vs Clarkson | ",
 "Upcoming Nov 6, 6:00 PM Women's · Dartmouth at Yale | ",
 "Upcoming Nov 7, 2:00 PM Women's · Dartmouth at Brown | ",
 "Upcoming Nov 13, 6:00 PM Women's · Dartmouth at Colgate | ",
 "Upcoming Nov 14, 3:00 PM Women's · Dartmouth at Cornell | ",
 "Upcoming Nov 27, 3:00 PM Women's · Dartmouth at Harvard | ",
 "Upcoming Nov 28, 3:00 PM Women's · Dartmouth vs Harvard | ",
 "Upcoming Dec 4, 6:00 PM Women's · Dartmouth vs Quinnipiac | ",
 "Upcoming Dec 5, 3:00 PM Women's · Dartmouth vs Princeton | ",
 "Upcoming Dec 11, 6:00 PM Women's · Dartmouth at Vermont | ",
 "Upcoming Dec 12, 4:00 PM Women's · Dartmouth vs Vermont | ",
 "Upcoming Jan 1, 6:00 PM Women's · Dartmouth vs Maine | ",
 "Upcoming Jan 2, 3:00 PM Women's · Dartmouth vs Saint Anselm | ",
 "Upcoming Jan 8, 3:00 PM Women's · Dartmouth vs Cornell | ",
 "Upcoming Jan 9, 3:00 PM Women's · Dartmouth vs Colgate | ",
 "Upcoming Jan 15, 3:00 PM Women's · Dartmouth vs Union | ",
 "Upcoming Jan 16, 3:00 PM Women's · Dartmouth vs RPI | ",
 "Upcoming Jan 22, 6:00 PM Women's · Dartmouth at Princeton | ",
 "Upcoming Jan 23, 3:00 PM Women's · Dartmouth at Quinnipiac | ",
 "Upcoming Jan 29, 6:00 PM Women's · Dartmouth at Clarkson | ",
 "Upcoming Jan 30, 3:00 PM Women's · Dartmouth at St. Lawrence | ",
 "Upcoming Feb 5, 3:00 PM Women's · Dartmouth vs Brown | ",
 "Upcoming Feb 6, 3:00 PM Women's · Dartmouth vs Yale | ",
 "Upcoming Feb 12, 6:00 PM Women's · Dartmouth at RPI | ",
 "Upcoming Feb 13, 3:00 PM Women's · Dartmouth at Union | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 17 Women's · Dartmouth at Head of the Charles | Completed"
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Final Oct 17 Men's Heavyweight · Dartmouth at Head of the Charles | Completed",
 "Upcoming Oct 31 Men's Heavyweight · Dartmouth at Cornell Fall Classic | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 31 Men's Lightweight · Dartmouth vs DJR Slimfast | "
]);
  const v_alpineskiing=parse("Skiing","alpine-skiing");
  assert.deepEqual(v_alpineskiing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Women's · Dartmouth vs UMass Lowell | W, 2-1",
 "Final Aug 23 Women's · Dartmouth at New Hampshire | T, 0-0",
 "Final Aug 27 Women's · Dartmouth vs San Francisco | W, 2-0",
 "Final Aug 30 Women's · Dartmouth at Boston College | L, 0-1",
 "Final Sep 3 Women's · Dartmouth vs Arizona State | T, 1-1",
 "Final Sep 6 Women's · Dartmouth at Arizona | W, 1-0",
 "Final Sep 10 Women's · Dartmouth vs Holy Cross | W, 1-0",
 "Final Sep 13 Women's · Dartmouth at Colgate | W, 2-0",
 "Final Sep 20 Women's · Dartmouth vs Bryant | W, 4-0",
 "Final Sep 26 Women's · Dartmouth vs Penn | W, 4-0",
 "Final Oct 3 Women's · Dartmouth at Columbia | L, 0-2",
 "Final Oct 10 Women's · Dartmouth vs Harvard | W, 1-0",
 "Final Oct 17 Women's · Dartmouth vs Brown | W, 2-1",
 "Upcoming Oct 25, 12:00 PM Women's · Dartmouth at Princeton | ",
 "Upcoming Oct 31, 4:00 PM Women's · Dartmouth vs Yale | ",
 "Upcoming Nov 7, 6:00 PM Women's · Dartmouth at Cornell | ",
 "Upcoming Nov 12 Women's · Dartmouth at Ivy League Tournament Semifinals | ",
 "Upcoming Nov 15 Women's · Dartmouth at Ivy League Tournament Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 28 Men's · Dartmouth at Boston College | L, 1-2",
 "Final Sep 4 Men's · Dartmouth vs UAlbany | L, 0-1",
 "Final Sep 7 Men's · Dartmouth vs Stonehill | W, 2-0",
 "Final Sep 11 Men's · Dartmouth at Merrimack | T, 0-0",
 "Final Sep 15 Men's · Dartmouth at Bryant | L, 0-1",
 "Final Sep 19 Men's · Dartmouth vs Vermont | W, 3-1",
 "Final Sep 26 Men's · Dartmouth vs Princeton | W, 1-0",
 "Final Sep 29 Men's · Dartmouth at New Hampshire | T, 0-0",
 "Final Oct 3 Men's · Dartmouth at Penn | L, 0-1",
 "Final Oct 10 Men's · Dartmouth vs Yale | T, 0-0",
 "Final Oct 13 Men's · Dartmouth vs UMass | T, 1-1",
 "Final Oct 17 Men's · Dartmouth vs Columbia | W, 3-0",
 "Upcoming Oct 24, 3:00 PM Men's · Dartmouth at 23 Cornell | ",
 "Upcoming Oct 31, 1:00 PM Men's · Dartmouth vs Brown | ",
 "Upcoming Nov 7, 1:00 PM Men's · Dartmouth at Harvard | ",
 "Upcoming Nov 12 Men's · Dartmouth at Ivy League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Today Oct 23 Women's · Dartmouth at Bryant (Exhibition) | ",
 "Upcoming Nov 6 Women's · Dartmouth at Princeton & Columbia | ",
 "Upcoming Nov 13 Women's · Dartmouth at Yale & Cornell | ",
 "Upcoming Dec 2 Women's · Dartmouth at Grizzly Invite | ",
 "Upcoming Jan 15 Women's · Dartmouth vs Harvard | ",
 "Upcoming Jan 22 Women's · Dartmouth at Tate Ramsden '17 Invite | ",
 "Upcoming Jan 29 Women's · Dartmouth vs Brown & Penn | ",
 "Upcoming Feb 5 Women's · Dartmouth at Boston Open | ",
 "Upcoming Feb 6 Women's · Dartmouth at Northeastern Diving Invite | ",
 "Upcoming Feb 17 Women's · Dartmouth at Women's Ivy Championships | ",
 "Upcoming Mar 8 Women's · Dartmouth at NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · Dartmouth at Women's NCAA Championships | ",
 "Upcoming Apr 21 Women's · Dartmouth at TYR Pro Swim Series | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Today Oct 23 Men's · Dartmouth at Bryant (Exhibition) | ",
 "Upcoming Nov 6 Men's · Dartmouth at Columbia & Princeton | ",
 "Upcoming Nov 13 Men's · Dartmouth at Yale & Cornell | ",
 "Upcoming Dec 2 Men's · Dartmouth at Grizzly Invite | ",
 "Upcoming Jan 15 Men's · Dartmouth vs Harvard | ",
 "Upcoming Jan 22 Men's · Dartmouth at Tate Ramsden '17 Invite | ",
 "Upcoming Jan 29 Men's · Dartmouth vs Brown & Penn | ",
 "Upcoming Feb 5 Men's · Dartmouth at Boston Open | ",
 "Upcoming Feb 6 Men's · Dartmouth at Northeastern Diving Invite | ",
 "Upcoming Feb 24 Men's · Dartmouth at Ivy Championships | ",
 "Upcoming Mar 8 Men's · Dartmouth at NCAA Diving Zones | ",
 "Upcoming Mar 17 Men's · Dartmouth at NCAA Championships | ",
 "Upcoming Mar 24 Men's · Dartmouth at NCAA Championships | ",
 "Upcoming Apr 21 Men's · Dartmouth at TYR Pro Swim Series | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Dartmouth at ITA All-American Tournament | Completed",
 "Final Sep 25 Women's · Dartmouth at Fall Foliage Fest | Completed",
 "Final Oct 8 Women's · Dartmouth at ITA New England Regionals | Completed",
 "Today Oct 23 Women's · Dartmouth at Ivy League Qualifier | ",
 "Upcoming Nov 5 Women's · Dartmouth at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Dartmouth at ITA Conference Masters | ",
 "Upcoming Nov 6 Women's · Dartmouth at Big Green Invite | ",
 "Upcoming Nov 17 Women's · Dartmouth at NCAA Singles and Doubles Championship | ",
 "Upcoming Jan 16 Women's · Dartmouth vs Army | ",
 "Upcoming Jan 17 Women's · Dartmouth vs Marshall | ",
 "Upcoming Jan 23 Women's · Dartmouth at Duke | ",
 "Upcoming Jan 24 Women's · Dartmouth at ITA | ",
 "Upcoming Jan 30 Women's · Dartmouth at Boston University | ",
 "Upcoming Feb 5 Women's · Dartmouth at ECAC Indoor Championship | ",
 "Upcoming Feb 19 Women's · Dartmouth vs UMass | ",
 "Upcoming Feb 21 Women's · Dartmouth vs Cincinnati | ",
 "Upcoming Feb 27 Women's · Dartmouth vs Navy | ",
 "Upcoming Mar 20 Women's · Dartmouth at Cal State Fullerton | ",
 "Upcoming Mar 21 Women's · Dartmouth at UC San Diego | ",
 "Upcoming Mar 23 Women's · Dartmouth at LMU | ",
 "Upcoming Mar 24 Women's · Dartmouth at San Diego State | ",
 "Upcoming Apr 3 Women's · Dartmouth at Harvard | ",
 "Upcoming Apr 10 Women's · Dartmouth at Columbia | ",
 "Upcoming Apr 11 Women's · Dartmouth at Cornell | ",
 "Upcoming Apr 17 Women's · Dartmouth vs Princeton | ",
 "Upcoming Apr 18 Women's · Dartmouth vs Penn | ",
 "Upcoming Apr 23 Women's · Dartmouth vs Brown | ",
 "Upcoming Apr 25 Women's · Dartmouth at Yale | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Dartmouth at Chowderfest | Completed",
 "Final Sep 25 Men's · Dartmouth at Ted Farnsworth Invitational | Completed",
 "Final Oct 8 Men's · Dartmouth at ITA New England Regionals | Completed",
 "Today Oct 23 Men's · Dartmouth at Ivy League Qualifier | ",
 "Upcoming Oct 30 Men's · Dartmouth at Dartmouth Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Dartmouth vs Canisius | W, 3-1",
 "Final Sep 5 Dartmouth vs Buffalo | L, 1-3",
 "Final Sep 6 Dartmouth vs Canisius | W, 3-1",
 "Final Sep 11 Dartmouth vs UAlbany | W, 3-1",
 "Final Sep 12 Dartmouth vs Northeastern | L, 1-3",
 "Final Sep 13 Dartmouth vs Colgate | L, 0-3",
 "Final Sep 18 Dartmouth vs Binghamton | L, 1-3",
 "Final Sep 19 Dartmouth vs Quinnipiac | W, 3-1",
 "Final Sep 20 Dartmouth vs Boston College | W, 3-1",
 "Final Sep 23 Dartmouth vs UNH | W, 3-0",
 "Final Sep 26 Dartmouth at Harvard | L, 2-3",
 "Final Oct 2 Dartmouth at Brown | L, 2-3",
 "Final Oct 3 Dartmouth at Yale | L, 0-3",
 "Final Oct 9 Dartmouth at Cornell | L, 0-3",
 "Final Oct 10 Dartmouth at Columbia | L, 2-3",
 "Final Oct 16 Dartmouth vs Penn | W, 3-1",
 "Final Oct 17 Dartmouth vs Princeton | L, 0-3",
 "Upcoming Oct 24, 3:00 PM Dartmouth vs Harvard | ",
 "Upcoming Oct 30, 6:00 PM Dartmouth vs Yale | ",
 "Upcoming Oct 31, 5:00 PM Dartmouth vs Brown | ",
 "Upcoming Nov 6, 6:00 PM Dartmouth at Princeton | ",
 "Upcoming Nov 7, 5:00 PM Dartmouth at Penn | ",
 "Upcoming Nov 13, 6:00 PM Dartmouth vs Columbia | ",
 "Upcoming Nov 14, 5:00 PM Dartmouth vs Cornell | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_alpineskiing,"Skiing alpine-skiing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Dartmouth module checks passed");
