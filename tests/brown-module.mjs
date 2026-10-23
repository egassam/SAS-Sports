import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {brownSchool} from '../src/schools/brown.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='brown');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,brownHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/brown-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit brownbears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['brown'];
assert.equal(sports.length,19);
for(const [name,map] of [['schedule',brownSchool.scheduleUrls],['roster',brownSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('brown|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'brownbears.com',`${key} must stay on brownbears.com`);
  }
}
const parity={"Baseball":{"schedule":["https://brownbears.com/sports/baseball/schedule"],"roster":["https://brownbears.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://brownbears.com/sports/mens-basketball/schedule","https://brownbears.com/sports/womens-basketball/schedule"],"roster":["https://brownbears.com/sports/mens-basketball/roster","https://brownbears.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://brownbears.com/sports/womens-cross-country/schedule","https://brownbears.com/sports/mens-cross-country/schedule"],"roster":["https://brownbears.com/sports/womens-cross-country/roster","https://brownbears.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://brownbears.com/sports/equestrian/schedule"],"roster":["https://brownbears.com/sports/equestrian/roster"],"combined":false},"Fencing":{"schedule":["https://brownbears.com/sports/fencing/schedule"],"roster":["https://brownbears.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://brownbears.com/sports/field-hockey/schedule"],"roster":["https://brownbears.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://brownbears.com/sports/football/schedule"],"roster":["https://brownbears.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://brownbears.com/sports/womens-golf/schedule","https://brownbears.com/sports/mens-golf/schedule"],"roster":["https://brownbears.com/sports/womens-golf/roster","https://brownbears.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://brownbears.com/sports/womens-gymnastics/schedule"],"roster":["https://brownbears.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://brownbears.com/sports/mens-ice-hockey/schedule","https://brownbears.com/sports/womens-ice-hockey/schedule"],"roster":["https://brownbears.com/sports/mens-ice-hockey/roster","https://brownbears.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://brownbears.com/sports/womens-lacrosse/schedule","https://brownbears.com/sports/mens-lacrosse/schedule"],"roster":["https://brownbears.com/sports/womens-lacrosse/roster","https://brownbears.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://brownbears.com/sports/womens-crew/schedule","https://brownbears.com/sports/mens-crew/schedule"],"roster":["https://brownbears.com/sports/womens-crew/roster","https://brownbears.com/sports/mens-crew/roster"],"combined":true},"Soccer":{"schedule":["https://brownbears.com/sports/womens-soccer/schedule","https://brownbears.com/sports/mens-soccer/schedule"],"roster":["https://brownbears.com/sports/womens-soccer/roster","https://brownbears.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://brownbears.com/sports/softball/schedule"],"roster":["https://brownbears.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://brownbears.com/sports/womens-swimming-and-diving/schedule","https://brownbears.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://brownbears.com/sports/womens-swimming-and-diving/roster","https://brownbears.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://brownbears.com/sports/womens-tennis/schedule","https://brownbears.com/sports/mens-tennis/schedule"],"roster":["https://brownbears.com/sports/womens-tennis/roster","https://brownbears.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://brownbears.com/sports/womens-track-and-field/schedule","https://brownbears.com/sports/mens-track-and-field/schedule"],"roster":["https://brownbears.com/sports/womens-track-and-field/roster","https://brownbears.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://brownbears.com/sports/womens-volleyball/schedule"],"roster":["https://brownbears.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://brownbears.com/sports/wrestling/schedule"],"roster":["https://brownbears.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'brown|"+sport+"':"),`${sport} routes must live in the Brown module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://brownbears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.brownHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=brown)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Brown at UMass (Exhibition) | L, 86-88",
 "Upcoming Nov 2, 7:00 PM Men's · Brown vs New Hampshire | ",
 "Upcoming Nov 6, 7:00 PM Men's · Brown vs Boston University | ",
 "Upcoming Nov 8, 2:00 PM Men's · Brown at Lehigh | ",
 "Upcoming Nov 12, 7:00 PM Men's · Brown vs Canisius | ",
 "Upcoming Nov 14, 7:00 PM Men's · Brown at Siena | ",
 "Upcoming Nov 18, 7:00 PM Men's · Brown at Holy Cross | ",
 "Upcoming Nov 21, 7:00 PM Men's · Brown at Vermont | ",
 "Upcoming Nov 25, 2:00 PM Men's · Brown vs Johnson & Wales | ",
 "Upcoming Nov 28, 3:00 PM Men's · Brown at Air Force | ",
 "Upcoming Dec 1, 7:00 PM Men's · Brown at Rhode Island | ",
 "Upcoming Dec 4, 6:00 PM Men's · Brown at Bryant | ",
 "Upcoming Dec 6, 3:30 PM Men's · Brown vs Central Connecticut State | ",
 "Upcoming Dec 9, 6:00 PM Men's · Brown vs Wheaton | ",
 "Upcoming Dec 22, 4:00 PM Men's · Brown vs Stony Brook | ",
 "Upcoming Dec 29, 6:00 PM Men's · Brown vs Maine | ",
 "Upcoming Jan 4, 7:00 PM Men's · Brown at Yale | ",
 "Upcoming Jan 8, 7:00 PM Men's · Brown vs Penn | ",
 "Upcoming Jan 15, 6:00 PM Men's · Brown at Cornell | ",
 "Upcoming Jan 18, 2:00 PM Men's · Brown at Columbia | ",
 "Upcoming Jan 23, 2:00 PM Men's · Brown vs Princeton | ",
 "Upcoming Jan 29, 7:00 PM Men's · Brown at Dartmouth | ",
 "Upcoming Jan 30, 6:00 PM Men's · Brown at Harvard | ",
 "Upcoming Feb 5, 7:00 PM Men's · Brown vs Yale | ",
 "Upcoming Feb 12, 7:00 PM Men's · Brown vs Dartmouth | ",
 "Upcoming Feb 13, 6:00 PM Men's · Brown vs Harvard | ",
 "Upcoming Feb 19, 2:00 PM Men's · Brown at Princeton | ",
 "Upcoming Feb 26, 7:00 PM Men's · Brown vs Cornell | ",
 "Upcoming Feb 27, 6:00 PM Men's · Brown vs Columbia | ",
 "Upcoming Mar 5, 7:00 PM Men's · Brown at Penn | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Brown at Siena | ",
 "Upcoming Nov 5, 7:00 PM Women's · Brown vs Army | ",
 "Upcoming Nov 7, 3:00 PM Women's · Brown vs Bucknell | ",
 "Upcoming Nov 12, 4:30 PM Women's · Brown vs Holy Cross | ",
 "Upcoming Nov 15, 1:00 PM Women's · Brown at Maine | ",
 "Upcoming Nov 19, 7:00 PM Women's · Brown vs Merrimack | ",
 "Upcoming Nov 21, 1:00 PM Women's · Brown vs UMBC | ",
 "Upcoming Nov 25, 12:00 PM Women's · Brown at Boston University | ",
 "Upcoming Nov 29, 4:00 PM Women's · Brown at North Carolina | ",
 "Upcoming Dec 2, 7:00 PM Women's · Brown vs Marist | ",
 "Upcoming Dec 5, 1:00 PM Women's · Brown vs George Washington | ",
 "Upcoming Dec 6, 1:00 PM Women's · Brown vs Nichols | ",
 "Upcoming Dec 9, 6:00 PM Women's · Brown at UNH | ",
 "Upcoming Dec 21, 6:00 PM Women's · Brown at Bryant | ",
 "Upcoming Dec 30, 8:00 PM Women's · Brown at Texas State | ",
 "Upcoming Jan 4, 7:00 PM Women's · Brown vs Yale | ",
 "Upcoming Jan 9, 2:00 PM Women's · Brown at Penn | ",
 "Upcoming Jan 16, 1:00 PM Women's · Brown vs Columbia | ",
 "Upcoming Jan 18, 1:00 PM Women's · Brown vs Cornell | ",
 "Upcoming Jan 23, 2:00 PM Women's · Brown at Princeton | ",
 "Upcoming Jan 29, 7:00 PM Women's · Brown vs Harvard | ",
 "Upcoming Jan 30, 5:00 PM Women's · Brown vs Dartmouth | ",
 "Upcoming Feb 6, 2:00 PM Women's · Brown at Yale | ",
 "Upcoming Feb 12, 7:00 PM Women's · Brown at Harvard | ",
 "Upcoming Feb 13, 5:00 PM Women's · Brown at Dartmouth | ",
 "Upcoming Feb 20, 1:00 PM Women's · Brown vs Princeton | ",
 "Upcoming Feb 26 Women's · Brown at Columbia | ",
 "Upcoming Feb 27 Women's · Brown at Cornell | ",
 "Upcoming Mar 6, 1:00 PM Women's · Brown vs Penn | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Brown at Friar Invitational | 7th of 9, 176 pts.",
 "Final Sep 19 Women's · Brown at Maribel Sanchez Souther Invitational | 4th of 9, 93 pts.",
 "Final Oct 2 Women's · Brown at Paul Short Run | 12th of 37, 322 pts.",
 "Final Oct 9 Women's · Brown at New England XC Championships | 13th of 18, 348 pts.",
 "Final Oct 17 Women's · Brown at ECAC Championships | 7th of 26, 197 pts.",
 "Today Oct 23, 4:30 PM Women's · Brown at Rothenberg Run | ",
 "Upcoming Oct 31, 12:00 PM Women's · Brown at Ivy League Heps Championships | ",
 "Upcoming Nov 13, 12:00 PM Women's · Brown at NCAA Northeast Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Brown at Friar Invitational | 4th of 9, 129 pts.",
 "Final Sep 19 Men's · Brown at Maribel Sanchez Souther Invitational | 2nd of 10, 87 pts.",
 "Final Oct 2 Men's · Brown at Paul Short Run | 21st of 35, 606 pts.",
 "Final Oct 9 Men's · Brown at New England XC Championships | No Team Score",
 "Final Oct 17 Men's · Brown at IC4A Championships | 10th of 25, 255 pts.",
 "Today Oct 23, 5:00 PM Men's · Brown at Rothenberg Run | ",
 "Upcoming Oct 31, 12:00 PM Men's · Brown at Ivy League Heps Championships | ",
 "Upcoming Nov 13, 12:00 PM Men's · Brown at NCAA Northeast Regional Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 24, 9:00 AM Brown vs Rhode Island College | ",
 "Upcoming Oct 31, 9:00 AM Brown at Johnson & Wales Show | ",
 "Upcoming Nov 14, 9:00 AM Brown at Rhode Island Show | ",
 "Upcoming Nov 21, 9:00 AM Brown at Rhode Island Show | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Upcoming Nov 15, 11:00 AM Brown at Northeast Fencing Conference | ",
 "Upcoming Dec 6, 10:00 AM Brown at Brandeis | ",
 "Upcoming Jan 15, 4:00 PM Brown at Penn | ",
 "Upcoming Jan 16, 4:00 PM Brown at Penn | ",
 "Upcoming Jan 17, 10:00 AM Brown at Tufts | ",
 "Upcoming Jan 23, 10:00 AM Brown at Northeast Fencing Conference | ",
 "Upcoming Feb 6, 9:00 AM Brown at Ivy League Championship | ",
 "Upcoming Mar 7, 9:00 AM Brown at Regionals | ",
 "Upcoming Mar 25 Brown at NCAA Tournament | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 4 Brown vs UConn | L, 0-3",
 "Final Sep 6 Brown vs Quinnipiac | W, 4-2",
 "Final Sep 11 Brown vs Boston University | W, 5-4",
 "Final Sep 13 Brown at Fairfield | L, 2-4",
 "Final Sep 18 Brown at Yale | L, 1-2",
 "Final Sep 20 Brown vs Providence | W, 4-3",
 "Final Sep 25 Brown vs Columbia | L, 0-3",
 "Final Sep 27 Brown at UMass Lowell | L, 0-2",
 "Final Oct 2 Brown at Cornell | L, 0-4",
 "Final Oct 4 Brown at Bryant | L, 1-2",
 "Final Oct 9 Brown vs Penn | W, 4-2",
 "Final Oct 11 Brown vs UMass | L, 0-4",
 "Final Oct 17 Brown vs Harvard | L, 1-3",
 "Today Oct 23, 4:00 PM Brown at Princeton | ",
 "Upcoming Oct 25, 12:00 PM Brown at Lafayette | ",
 "Upcoming Oct 31, 12:00 PM Brown vs Dartmouth | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Brown at New Haven | W, 17-10",
 "Final Sep 25 Brown vs Harvard | L, 10-14",
 "Final Oct 3 Brown at Rhode Island | L, 10-13",
 "Final Oct 10 Brown vs Bryant | W, 28-13",
 "Final Oct 17 Brown at Princeton | L, 10-16",
 "Upcoming Oct 24, 12:00 PM Brown vs Cornell | ",
 "Upcoming Oct 31, 12:00 PM Brown vs Penn | ",
 "Upcoming Nov 7, 12:00 PM Brown at Yale | ",
 "Upcoming Nov 14, 12:00 PM Brown vs Columbia | ",
 "Upcoming Nov 21, 1:00 PM Brown at Dartmouth | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 25 Women's · Brown at Princeton Invitational | 12th of 12",
 "Final Sep 28 Women's · Brown at Sacred Heart Invitational | 2nd of 8",
 "Final Oct 11 Women's · Brown at Albany Invitational | 7th of 10",
 "Upcoming Oct 26 Women's · Brown at Lehigh | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Brown at Ryan T. Lee Memorial Collegiate Invitational | 17th of 18",
 "Final Sep 25 Men's · Brown at Yale Invitational | 11th of 11",
 "Final Oct 3 Men's · Brown at Columbia Invitational | 11th of 13",
 "Final Oct 12 Men's · Brown at Sacred Heart Invitational | 9th of 11",
 "Upcoming Oct 24 Men's · Brown at Lehigh Invitational | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 10 Men's · Brown at Boston University (Exhibition) | L, 1-3",
 "Upcoming Oct 30, 7:00 PM Men's · Brown at Yale | ",
 "Upcoming Nov 6, 7:00 PM Men's · Brown at Harvard | ",
 "Upcoming Nov 7, 7:00 PM Men's · Brown at Dartmouth | ",
 "Upcoming Nov 13, 7:00 PM Men's · Brown vs Cornell | ",
 "Upcoming Nov 14, 6:00 PM Men's · Brown vs Colgate | ",
 "Upcoming Nov 20, 7:00 PM Men's · Brown at RPI | ",
 "Upcoming Nov 21, 7:00 PM Men's · Brown at Union | ",
 "Upcoming Nov 24, 7:00 PM Men's · Brown vs Northeastern | ",
 "Upcoming Nov 28, 4:00 PM Men's · Brown at New Hampshire | ",
 "Upcoming Dec 1, 7:00 PM Men's · Brown vs Sacred Heart | ",
 "Upcoming Dec 5, 6:00 PM Men's · Brown at Merrimack | ",
 "Upcoming Dec 6, 4:00 PM Men's · Brown vs Stonehill | ",
 "Upcoming Jan 1, 7:00 PM Men's · Brown vs Dartmouth | ",
 "Upcoming Jan 2, 5:00 PM Men's · Brown vs Harvard | ",
 "Upcoming Jan 5, 7:00 PM Men's · Brown vs Army | ",
 "Upcoming Jan 8, 7:00 PM Men's · Brown at Clarkson | ",
 "Upcoming Jan 9, 7:00 PM Men's · Brown at St. Lawrence | ",
 "Upcoming Jan 15, 7:00 PM Men's · Brown vs Union | ",
 "Upcoming Jan 16, 5:00 PM Men's · Brown vs RPI | ",
 "Upcoming Jan 22, 7:00 PM Men's · Brown vs Quinnipiac | ",
 "Upcoming Jan 23, 5:00 PM Men's · Brown vs Princeton | ",
 "Upcoming Jan 30, 7:00 PM Men's · Brown vs Princeton | ",
 "Upcoming Feb 2, 7:00 PM Men's · Brown at Providence | ",
 "Upcoming Feb 5, 7:00 PM Men's · Brown vs Yale | ",
 "Upcoming Feb 12, 7:00 PM Men's · Brown at Colgate | ",
 "Upcoming Feb 13, 7:00 PM Men's · Brown at Cornell | ",
 "Upcoming Feb 19, 7:00 PM Men's · Brown vs St. Lawrence | ",
 "Upcoming Feb 20, 5:00 PM Men's · Brown vs Clarkson | ",
 "Upcoming Feb 26, 7:00 PM Men's · Brown at Princeton | ",
 "Upcoming Feb 27, 7:00 PM Men's · Brown at Quinnipiac | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 16 Women's · Brown at RIT | W, 6-1",
 "Final Oct 17 Women's · Brown at RIT | W, 3-1",
 "Upcoming Oct 30, 6:00 PM Women's · Brown at Princeton | ",
 "Upcoming Oct 31, 3:00 PM Women's · Brown at Quinnipiac | ",
 "Upcoming Nov 6, 6:00 PM Women's · Brown vs Harvard | ",
 "Upcoming Nov 7, 2:00 PM Women's · Brown vs Dartmouth | ",
 "Upcoming Nov 13, 6:00 PM Women's · Brown at St. Lawrence | ",
 "Upcoming Nov 14, 3:00 PM Women's · Brown at Clarkson | ",
 "Upcoming Nov 21, 3:00 PM Women's · Brown at RPI | ",
 "Upcoming Nov 22, 3:00 PM Women's · Brown at Union | ",
 "Upcoming Nov 28, 3:00 PM Women's · Brown at Providence | ",
 "Upcoming Nov 29, 1:00 PM Women's · Brown vs Assumption | ",
 "Upcoming Dec 4, 6:00 PM Women's · Brown vs Union | ",
 "Upcoming Dec 5, 3:00 PM Women's · Brown vs RPI | ",
 "Upcoming Dec 9, 6:00 PM Women's · Brown at Boston University | ",
 "Upcoming Jan 1, 3:00 PM Women's · Brown at Sacred Heart | ",
 "Upcoming Jan 2, 2:00 PM Women's · Brown at Merrimack | ",
 "Upcoming Jan 5, 11:30 AM Women's · Brown vs Boston University | ",
 "Upcoming Jan 8, 6:00 PM Women's · Brown vs Clarkson | ",
 "Upcoming Jan 9, 3:00 PM Women's · Brown vs St. Lawrence | ",
 "Upcoming Jan 15, 6:00 PM Women's · Brown at Cornell | ",
 "Upcoming Jan 16, 3:00 PM Women's · Brown at Colgate | ",
 "Upcoming Jan 23, 2:00 PM Women's · Brown at Yale | ",
 "Upcoming Jan 24, 2:00 PM Women's · Brown vs Yale | ",
 "Upcoming Jan 29, 6:00 PM Women's · Brown vs Quinnipiac | ",
 "Upcoming Jan 30, 3:00 PM Women's · Brown vs Princeton | ",
 "Upcoming Feb 5, 3:00 PM Women's · Brown at Dartmouth | ",
 "Upcoming Feb 6, 3:00 PM Women's · Brown at Harvard | ",
 "Upcoming Feb 12, 6:00 PM Women's · Brown vs Colgate | ",
 "Upcoming Feb 13, 3:00 PM Women's · Brown vs Cornell | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenscrew=parse("Rowing","womens-crew");
  assert.deepEqual(v_womenscrew.map(line),[]);
  const v_menscrew=parse("Rowing","mens-crew");
  assert.deepEqual(v_menscrew.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Women's · Brown vs New Haven | W, 4-0",
 "Final Aug 23 Women's · Brown at Holy Cross | L, 0-1",
 "Final Aug 27 Women's · Brown vs UConn | W, 1-0",
 "Final Aug 30 Women's · Brown at Penn State | L, 0-6",
 "Final Sep 3 Women's · Brown vs UMass | W, 4-1",
 "Final Sep 6 Women's · Brown vs UCF | W, 7-0",
 "Final Sep 10 Women's · Brown at Rhode Island | T, 1-1",
 "Final Sep 13 Women's · Brown at Hofstra | W, 2-1",
 "Final Sep 17 Women's · Brown vs Providence | W, 4-0",
 "Final Sep 26 Women's · Brown vs Columbia | W, 4-0",
 "Final Oct 3 Women's · Brown at Penn | T, 2-2",
 "Final Oct 10 Women's · Brown vs Yale | W, 3-2",
 "Final Oct 17 Women's · Brown at Dartmouth | L, 1-2",
 "Upcoming Oct 24, 7:00 PM Women's · Brown vs Harvard | ",
 "Upcoming Oct 31, 3:30 PM Women's · Brown vs Cornell | ",
 "Upcoming Nov 7, 6:00 PM Women's · Brown at Princeton | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 28 Men's · Brown vs New Haven | W, 2-0",
 "Final Sep 3 Men's · Brown at UConn | L, 1-2",
 "Final Sep 6 Men's · Brown vs Saint Peter's | W, 1-0",
 "Final Sep 11 Men's · Brown vs Stonehill | W, 1-0",
 "Final Sep 15 Men's · Brown vs Rhode Island | W, 2-1",
 "Final Sep 19 Men's · Brown vs NJIT | T, 1-1",
 "Final Sep 22 Men's · Brown at Providence | L, 1-2",
 "Final Oct 3 Men's · Brown vs Cornell | L, 1-2",
 "Final Oct 6 Men's · Brown at Columbia | T, 1-1",
 "Final Oct 10 Men's · Brown vs Harvard | L, 1-2",
 "Final Oct 13 Men's · Brown at Lehigh | W, 3-1",
 "Final Oct 17 Men's · Brown at Penn | L, 0-3",
 "Upcoming Oct 24, 3:30 PM Men's · Brown vs Princeton | ",
 "Upcoming Oct 27, 7:00 PM Men's · Brown at Holy Cross | ",
 "Upcoming Oct 31, 1:00 PM Men's · Brown at Dartmouth | ",
 "Upcoming Nov 7, 1:00 PM Men's · Brown vs Yale | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Nov 6, 6:00 PM Women's · Brown vs Yale | ",
 "Upcoming Nov 14, 11:00 AM Women's · Brown at Harvard | ",
 "Upcoming Nov 14, 11:00 AM Women's · Brown vs Columbia | ",
 "Upcoming Nov 20 Women's · Brown at Bruno Invitational | ",
 "Upcoming Dec 2, 5:00 PM Women's · Brown at US Open | ",
 "Upcoming Dec 4, 5:00 PM Women's · Brown vs Bryant | ",
 "Upcoming Jan 16, 11:00 AM Women's · Brown vs Princeton | ",
 "Upcoming Jan 16, 11:00 AM Women's · Brown vs Cornell | ",
 "Upcoming Jan 30, 11:00 AM Women's · Brown at Dartmouth | ",
 "Upcoming Jan 30, 11:00 AM Women's · Brown at Penn | ",
 "Upcoming Feb 5, 5:00 PM Women's · Brown at Rhode Island Invitational | ",
 "Upcoming Feb 17 Women's · Brown at Ivy League Championships | ",
 "Upcoming Mar 17 Women's · Brown at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Nov 6, 5:00 PM Men's · Brown vs Yale | ",
 "Upcoming Nov 14, 3:30 PM Men's · Brown at Harvard | ",
 "Upcoming Nov 14, 3:30 PM Men's · Brown vs Columbia | ",
 "Upcoming Nov 19 Men's · Brown at Bruno Invitational | ",
 "Upcoming Dec 4, 5:00 PM Men's · Brown vs Bryant | ",
 "Upcoming Jan 16, 12:00 PM Men's · Brown vs Cornell | ",
 "Upcoming Jan 16, 12:00 PM Men's · Brown vs Princeton | ",
 "Upcoming Jan 30 Men's · Brown at Dartmouth | ",
 "Upcoming Jan 30 Men's · Brown vs Penn | ",
 "Upcoming Feb 5, 6:00 PM Men's · Brown at Boston University Winter Open | ",
 "Upcoming Feb 24 Men's · Brown at Ivy Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Brown at Bulldog Invitational | Completed",
 "Final Sep 19 Women's · Brown at ITA All-American Championships - Day 1 | Completed",
 "Final Sep 25 Women's · Brown at Hall of Fame Invitational | Completed",
 "Final Oct 8 Women's · Brown at ITA New England Regionals - Day 1 | Completed",
 "Final Oct 17 Women's · Brown at Brown Classic - Day 1 | Completed",
 "Today Oct 23 Women's · Brown at Ivy Invitational | ",
 "Upcoming Nov 5 Women's · Brown at ITA Conference Masters - Day 1 | ",
 "Upcoming Nov 5 Women's · Brown at ITA Sectional Championships - Day 1 | ",
 "Upcoming Nov 6 Women's · Brown at Big Green Invitational - Day 1 | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Brown at Chowderfest | Completed",
 "Final Sep 25 Men's · Brown at International Tennis Hall of Fame Tournament | Completed",
 "Final Oct 8 Men's · Brown at ITA New England Regionals | Completed",
 "Today Oct 23 Men's · Brown at Ivy League ITA Qualifiers | ",
 "Upcoming Oct 30 Men's · Brown at Dartmouth Invitational | ",
 "Upcoming Nov 5 Men's · Brown at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Brown at ITA Masters | ",
 "Upcoming Nov 6 Men's · Brown at Navy Invitational | ",
 "Upcoming Nov 17 Men's · Brown at NCAA Individual Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Brown vs Providence | L, 2-3",
 "Final Sep 5 Brown at Rhode Island | W, 3-2",
 "Final Sep 6 Brown vs Bryant | L, 1-3",
 "Final Sep 11 Brown at Long Beach State | L, 1-3",
 "Final Sep 12 Brown vs LMU | L, 0-3",
 "Final Sep 18 Brown at Fairfield | L, 1-3",
 "Final Sep 19 Brown vs Middle Tennessee | L, 1-3",
 "Final Sep 19 Brown vs Central Connecticut State | W, 3-0",
 "Final Sep 26 Brown vs Yale | L, 1-3",
 "Final Oct 2 Brown vs Dartmouth | W, 3-2",
 "Final Oct 3 Brown vs Harvard | W, 3-1",
 "Final Oct 9 Brown at Penn | L, 2-3",
 "Final Oct 10 Brown at Princeton | L, 2-3",
 "Final Oct 16 Brown vs Cornell | L, 1-3",
 "Final Oct 17 Brown vs Columbia | W, 3-0",
 "Upcoming Oct 24, 5:00 PM Brown at Yale | ",
 "Upcoming Oct 30, 6:00 PM Brown at Harvard | ",
 "Upcoming Oct 31, 5:00 PM Brown at Dartmouth | ",
 "Upcoming Nov 6, 7:00 PM Brown at Columbia | ",
 "Upcoming Nov 7, 5:00 PM Brown at Cornell | ",
 "Upcoming Nov 13, 6:00 PM Brown vs Princeton | ",
 "Upcoming Nov 14, 5:00 PM Brown vs Penn | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Brown at Princeton | ",
 "Upcoming Nov 15 Brown vs West Virginia | ",
 "Upcoming Nov 15 Brown vs Hofstra | ",
 "Upcoming Nov 22 Brown at Cornell | ",
 "Upcoming Dec 4 Brown at 44th Annual Cliff Keen Las Vegas Collegiate Wrestling Invitational | ",
 "Upcoming Dec 22 Brown vs Indiana | ",
 "Upcoming Jan 2 Brown at Southern Scuffle | ",
 "Upcoming Jan 8 Brown at Franklin and Marshall College | ",
 "Upcoming Jan 15 Brown at Duke | ",
 "Upcoming Jan 16 Brown at Virginia Military Institute | ",
 "Upcoming Jan 16 Brown at Morgan State | ",
 "Upcoming Jan 24 Brown vs Cornell | ",
 "Upcoming Jan 24 Brown vs Binghamton | ",
 "Upcoming Jan 31 Brown at Princeton | ",
 "Upcoming Jan 31 Brown at Pennsylvania | ",
 "Upcoming Feb 14 Brown vs Columbia | ",
 "Upcoming Feb 19 Brown at Harvard | ",
 "Upcoming Feb 20 Brown at Sacred Heart | ",
 "Upcoming Mar 7 Brown at Ivy Championships | ",
 "Upcoming Mar 18 Brown at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenscrew,"Rowing womens-crew");
  ownRecapsOnly(v_menscrew,"Rowing mens-crew");
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
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Brown module checks passed");
