import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bostonCollegeSchool,BOSTON_COLLEGE_TFRRS_TEAMS} from '../src/schools/boston-college.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='boston-college');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bostonCollegeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/boston-college-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bceagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['boston-college'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',bostonCollegeSchool.scheduleUrls],['roster',bostonCollegeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('boston-college|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bceagles.com',`${key} must stay on bceagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bceagles.com/sports/baseball/schedule"],"roster":["https://bceagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bceagles.com/sports/mens-basketball/schedule","https://bceagles.com/sports/womens-basketball/schedule"],"roster":["https://bceagles.com/sports/mens-basketball/roster","https://bceagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://bceagles.com/sports/womens-cross-country/schedule","https://bceagles.com/sports/mens-cross-country/schedule"],"roster":["https://bceagles.com/sports/womens-cross-country/roster","https://bceagles.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://bceagles.com/sports/fencing/schedule"],"roster":["https://bceagles.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://bceagles.com/sports/field-hockey/schedule"],"roster":["https://bceagles.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://bceagles.com/sports/football/schedule"],"roster":["https://bceagles.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bceagles.com/sports/womens-golf/schedule","https://bceagles.com/sports/mens-golf/schedule"],"roster":["https://bceagles.com/sports/womens-golf/roster","https://bceagles.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://bceagles.com/sports/mens-ice-hockey/schedule","https://bceagles.com/sports/womens-ice-hockey/schedule"],"roster":["https://bceagles.com/sports/mens-ice-hockey/roster","https://bceagles.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://bceagles.com/sports/womens-lacrosse/schedule"],"roster":["https://bceagles.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://bceagles.com/sports/womens-rowing/schedule"],"roster":["https://bceagles.com/sports/womens-rowing/roster"],"combined":false},"Skiing":{"schedule":["https://bceagles.com/sports/skiing/schedule"],"roster":["https://bceagles.com/sports/skiing/roster"],"combined":false},"Soccer":{"schedule":["https://bceagles.com/sports/womens-soccer/schedule","https://bceagles.com/sports/mens-soccer/schedule"],"roster":["https://bceagles.com/sports/womens-soccer/roster","https://bceagles.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://bceagles.com/sports/softball/schedule"],"roster":["https://bceagles.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://bceagles.com/sports/swimming-and-diving/schedule"],"roster":["https://bceagles.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://bceagles.com/sports/womens-tennis/schedule","https://bceagles.com/sports/mens-tennis/schedule"],"roster":["https://bceagles.com/sports/womens-tennis/roster","https://bceagles.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://bceagles.com/sports/womens-track-and-field/schedule","https://bceagles.com/sports/mens-track-and-field/schedule"],"roster":["https://bceagles.com/sports/womens-track-and-field/roster","https://bceagles.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://bceagles.com/sports/womens-volleyball/schedule"],"roster":["https://bceagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'boston-college|"+sport+"':"),`${sport} routes must live in the Boston College module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://bceagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bostonCollegeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=boston-college)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · Boston College vs MIT (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Boston College vs Wagner | ",
 "Upcoming Nov 6, 4:00 PM Men's · Boston College vs Massachusetts | ",
 "Upcoming Nov 10, 7:00 PM Men's · Boston College vs Maryland Eastern Shore | ",
 "Upcoming Nov 15, 1:30 PM Men's · Boston College vs New Hampshire | ",
 "Upcoming Nov 18, 8:00 PM Men's · Boston College at Harvard | ",
 "Upcoming Nov 22, 5:00 PM Men's · Boston College vs NJIT | ",
 "Upcoming Nov 26, 1:30 PM Men's · Boston College vs UCF | ",
 "Upcoming Nov 27, 4:30 PM Men's · Boston College vs Cincinnati | ",
 "Upcoming Dec 1, 5:00 PM Men's · Boston College at Georgia | ",
 "Upcoming Dec 5, 7:00 PM Men's · Boston College vs UMass Lowell | ",
 "Upcoming Dec 9, 9:00 PM Men's · Boston College vs Northeastern | ",
 "Upcoming Dec 12, 12:00 PM Men's · Boston College vs George Washington | ",
 "Upcoming Dec 20, 12:00 PM Men's · Boston College vs New Haven | ",
 "Upcoming Dec 22, 7:00 PM Men's · Boston College vs Stonehill | ",
 "Upcoming Jan 2, 4:00 PM Men's · Boston College vs North Carolina | ",
 "Upcoming Jan 5, 9:00 PM Men's · Boston College vs Clemson | ",
 "Upcoming Jan 9, 8:00 PM Men's · Boston College at Virginia Tech | ",
 "Upcoming Jan 13, 8:00 PM Men's · Boston College at Virginia | ",
 "Upcoming Jan 16, 7:00 PM Men's · Boston College vs Duke | ",
 "Upcoming Jan 19, 7:00 PM Men's · Boston College at Syracuse | ",
 "Upcoming Jan 23, 7:00 PM Men's · Boston College at Pittsburgh | ",
 "Upcoming Jan 27, 7:00 PM Men's · Boston College vs Louisville | ",
 "Upcoming Feb 2, 6:00 PM Men's · Boston College at Wake Forest | ",
 "Upcoming Feb 6, 5:30 PM Men's · Boston College vs Notre Dame | ",
 "Upcoming Feb 9, 9:00 PM Men's · Boston College vs Georgia Tech | ",
 "Upcoming Feb 13, 1:00 PM Men's · Boston College at NC State | ",
 "Upcoming Feb 16, 7:00 PM Men's · Boston College vs Southern Methodist | ",
 "Upcoming Feb 20, 12:00 PM Men's · Boston College vs Virginia Tech | ",
 "Upcoming Feb 24, 9:00 PM Men's · Boston College at California | ",
 "Upcoming Feb 27 Men's · Boston College at Stanford | ",
 "Upcoming Mar 3, 6:30 PM Men's · Boston College vs Florida State | ",
 "Upcoming Mar 6, 2:00 PM Men's · Boston College at Notre Dame | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Boston College vs Holy Cross | ",
 "Upcoming Nov 5, 7:00 PM Women's · Boston College at Harvard | ",
 "Upcoming Nov 11, 6:00 PM Women's · Boston College vs UMass Lowell | ",
 "Upcoming Nov 14, 12:00 PM Women's · Boston College vs Providence | ",
 "Upcoming Nov 17, 6:00 PM Women's · Boston College vs Merrimack | ",
 "Upcoming Nov 20, 6:00 PM Women's · Boston College vs UMass | ",
 "Upcoming Nov 24, 6:00 PM Women's · Boston College vs Northeastern | ",
 "Upcoming Nov 27, 12:00 PM Women's · Boston College vs College of Charleston | ",
 "Upcoming Nov 28, 2:30 PM Women's · Boston College vs BYU | ",
 "Upcoming Dec 2, 7:00 PM Women's · Boston College at Indiana | ",
 "Upcoming Dec 6, 2:00 PM Women's · Boston College at Virginia | ",
 "Upcoming Dec 10, 11:00 AM Women's · Boston College vs Bryant | ",
 "Upcoming Dec 13, 2:00 PM Women's · Boston College at Quinnipiac | ",
 "Upcoming Dec 22, 12:00 PM Women's · Boston College at Miami | ",
 "Upcoming Dec 31, 12:00 PM Women's · Boston College vs Louisville | ",
 "Upcoming Jan 3, 2:00 PM Women's · Boston College vs Florida State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Boston College vs SMU | ",
 "Upcoming Jan 14, 6:00 PM Women's · Boston College at Syracuse | ",
 "Upcoming Jan 17, 6:00 PM Women's · Boston College at North Carolina | ",
 "Upcoming Jan 21, 6:00 PM Women's · Boston College vs Duke | ",
 "Upcoming Jan 24, 2:00 PM Women's · Boston College vs Georgia Tech | ",
 "Upcoming Jan 28, 6:00 PM Women's · Boston College vs Virginia Tech | ",
 "Upcoming Jan 31, 2:00 PM Women's · Boston College at Pittsburgh | ",
 "Upcoming Feb 7, 2:00 PM Women's · Boston College at Wake Forest | ",
 "Upcoming Feb 11, 7:00 PM Women's · Boston College at NC State | ",
 "Upcoming Feb 14, 12:00 PM Women's · Boston College vs Clemson | ",
 "Upcoming Feb 18, 6:00 PM Women's · Boston College vs Syracuse | ",
 "Upcoming Feb 21, 2:00 PM Women's · Boston College vs Notre Dame | ",
 "Upcoming Feb 25, 9:00 PM Women's · Boston College at California | ",
 "Upcoming Feb 28, 5:00 PM Women's · Boston College at Stanford | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 19 Women's · Boston College at John McNichols Invitational | 7th of 28",
 "Final Oct 9 Women's · Boston College at New England Championships | Completed",
 "Upcoming Oct 16 Women's · Boston College at Pre-National Invitational | ",
 "Upcoming Oct 30 Women's · Boston College at ACC Championships | ",
 "Upcoming Nov 13 Women's · Boston College at NCAA Northeast Regional | ",
 "Upcoming Nov 20 Women's · Boston College at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 19 Men's · Boston College at Maribel Sanchez Souther Invitational | 1st of 9",
 "Upcoming Oct 16 Men's · Boston College at Princeton Fall Classic | ",
 "Upcoming Oct 30 Men's · Boston College at ACC Championships | ",
 "Upcoming Nov 13 Men's · Boston College at NCAA Northeast Regional | ",
 "Upcoming Nov 20 Men's · Boston College at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Upcoming Oct 24 Boston College at Nikki Franke Classic | ",
 "Upcoming Nov 15 Boston College at Northeast Fencing Conference Meet #1 | ",
 "Upcoming Nov 18 Boston College at The Beanpot | ",
 "Upcoming Dec 6 Boston College at Carla Mae Richards Invitational | ",
 "Upcoming Jan 23 Boston College at Northeast Fencing Conference Meet #2 | ",
 "Upcoming Jan 24 Boston College at Syd Fadner Invitational | ",
 "Upcoming Jan 31 Boston College at Eric Sollee Invitational | ",
 "Upcoming Feb 6 Boston College at The Beguinet Classic | ",
 "Upcoming Feb 7 Boston College at The Miller Invitational | ",
 "Upcoming Feb 20 Boston College at ACC Championships | ",
 "Upcoming Mar 14 Boston College at NCAA Regionals | ",
 "Upcoming Mar 25 Boston College at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Boston College vs Providence | W, 3-1",
 "Final Aug 30 Boston College at UAlbany | L, 3-4",
 "Final Sep 4 Boston College vs Maryland | L, 0-2",
 "Final Sep 6 Boston College vs Northwestern | L, 0-2",
 "Final Sep 11 Boston College vs Maine | W, 5-0",
 "Final Sep 13 Boston College at Harvard | L, 1-2",
 "Final Sep 18 Boston College at Louisville | L, 0-1",
 "Final Sep 20 Boston College at Ohio State | W, 3-2",
 "Final Sep 27 Boston College at Duke | L, 0-1",
 "Final Oct 2 Boston College vs Wake Forest | L, 1-2",
 "Final Oct 4 Boston College vs Northeastern | W, 5-1",
 "Final Oct 9 Boston College vs Virginia | W, 4-1",
 "Final Oct 11 Boston College vs Boston University | W, 5-1",
 "Upcoming Oct 16, 6:00 PM Boston College at North Carolina | ",
 "Upcoming Oct 23, 4:00 PM Boston College vs California | ",
 "Upcoming Oct 25, 12:00 PM Boston College vs Stanford | ",
 "Upcoming Oct 30, 4:30 PM Boston College at Syracuse | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Boston College at Cincinnati | L, 15-34",
 "Final Sep 11 Boston College vs Rutgers | W, 28-21",
 "Final Sep 19 Boston College vs Maine | W, 22-16",
 "Final Sep 26 Boston College vs Virginia Tech | L, 14-21",
 "Final Oct 3 Boston College at SMU | L, 16-25",
 "Upcoming Oct 17, 12:00 PM Boston College vs Pitt | ",
 "Upcoming Oct 24, 3:30 PM Boston College at Georgia Tech | ",
 "Upcoming Oct 31 Boston College at Duke | ",
 "Upcoming Nov 7 Boston College vs Florida State | ",
 "Upcoming Nov 14, 3:30 PM Boston College at Notre Dame | ",
 "Upcoming Nov 21 Boston College vs Syracuse | ",
 "Upcoming Nov 28 Boston College at Miami | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Boston College at Cougar Classic | 16th of 18",
 "Final Sep 21 Women's · Boston College at Red Bandanna Invitational | 1st of 15",
 "Final Oct 3 Women's · Boston College at Yale Invitational | 1st of 8",
 "Upcoming Oct 16 Women's · Boston College at Ruth’s Chris Tar Heel Invitational | ",
 "Upcoming Feb 26 Women's · Boston College at Reynolds Lake Oconee Inv. | ",
 "Upcoming Mar 8 Women's · Boston College at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 15 Women's · Boston College at Briar’s Creek Invitational | ",
 "Upcoming Apr 4 Women's · Boston College at ECU Ironwood Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Boston College at Red Bandanna Invitational | 4th of 11",
 "Final Sep 12 Men's · Boston College at Doc Gimmler Invitational | 6th of 14",
 "Final Sep 27 Men's · Boston College at UConn Invitational at GreatHorse | 2nd of 14",
 "Upcoming Oct 16 Men's · Boston College at Golf Club of Georgia Collegiate | ",
 "Upcoming Feb 7 Men's · Boston College at Dorado Beach Collegiate | ",
 "Upcoming Feb 15 Men's · Boston College at Battle at Briar’s Creek | ",
 "Upcoming Mar 8 Men's · Boston College at Donald Ross Collegiate | ",
 "Upcoming Apr 17 Men's · Boston College at Rutgers Invitational | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Boston College at Michigan State (Exhibition) | L, 2-5",
 "Final Oct 3 Men's · Boston College at U.S. NTDP (Exhibition) | W, 10-1",
 "Final Oct 9 Men's · Boston College vs Alaska | L, 2-3",
 "Upcoming Oct 15, 7:00 PM Men's · Boston College vs St. Cloud State | ",
 "Upcoming Oct 17, 6:00 PM Men's · Boston College vs St. Cloud State | ",
 "Upcoming Oct 23, 9:00 PM Men's · Boston College at Denver | ",
 "Upcoming Oct 24, 8:00 PM Men's · Boston College at Denver | ",
 "Upcoming Oct 30, 7:00 PM Men's · Boston College vs Northeastern | ",
 "Upcoming Oct 31, 7:00 PM Men's · Boston College vs Northeastern | ",
 "Upcoming Nov 5, 7:00 PM Men's · Boston College vs Vermont | ",
 "Upcoming Nov 6, 7:00 PM Men's · Boston College vs Vermont | ",
 "Upcoming Nov 13, 7:00 PM Men's · Boston College at UMass | ",
 "Upcoming Nov 14, 7:00 PM Men's · Boston College vs UMass | ",
 "Upcoming Nov 20, 7:00 PM Men's · Boston College at Maine | ",
 "Upcoming Nov 21, 7:00 PM Men's · Boston College at Maine | ",
 "Upcoming Nov 27, 3:00 PM Men's · Boston College at Notre Dame | ",
 "Upcoming Nov 29, 4:00 PM Men's · Boston College at Harvard | ",
 "Upcoming Dec 4, 7:00 PM Men's · Boston College vs UMass Lowell | ",
 "Upcoming Dec 5, 6:00 PM Men's · Boston College at UMass Lowell | ",
 "Upcoming Jan 9, 1:00 PM Men's · Boston College vs Stonehill | ",
 "Upcoming Jan 15, 7:00 PM Men's · Boston College vs Providence | ",
 "Upcoming Jan 16, 6:00 PM Men's · Boston College at Providence College | ",
 "Upcoming Jan 22, 7:00 PM Men's · Boston College vs New Hampshire | ",
 "Upcoming Jan 23, 7:00 PM Men's · Boston College at New Hampshire | ",
 "Upcoming Jan 29, 7:00 PM Men's · Boston College vs Boston University | ",
 "Upcoming Feb 1 Men's · Boston College vs Boston University | ",
 "Upcoming Feb 5, 7:00 PM Men's · Boston College at Vermont | ",
 "Upcoming Feb 8 Men's · Boston College vs Northeastern/Harvard | ",
 "Upcoming Feb 12, 7:00 PM Men's · Boston College vs UConn | ",
 "Upcoming Feb 13, 4:00 PM Men's · Boston College at UConn | ",
 "Upcoming Feb 19, 7:00 PM Men's · Boston College at Merrimack | ",
 "Upcoming Feb 20, 7:00 PM Men's · Boston College vs Merrimack | ",
 "Upcoming Feb 26, 7:00 PM Men's · Boston College vs Boston University | ",
 "Upcoming Feb 27, 7:00 PM Men's · Boston College at Boston University | ",
 "Upcoming Mar 5, 7:00 PM Men's · Boston College vs UMass | ",
 "Upcoming Mar 6 Men's · Boston College at Northeastern | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 3 Women's · Boston College at Stonehill College | W, 17-0",
 "Final Oct 9 Women's · Boston College at Holy Cross | W, 3-1",
 "Final Oct 10 Women's · Boston College vs Providence College | L, 2-3",
 "Today Oct 14, 7:00 PM Women's · Boston College vs Merrimack College | ",
 "Upcoming Oct 23, 6:00 PM Women's · Boston College vs Cornell University | ",
 "Upcoming Oct 24, 3:00 PM Women's · Boston College vs Cornell University | ",
 "Upcoming Oct 26, 11:00 AM Women's · Boston College vs Mankato | ",
 "Upcoming Oct 30 Women's · Boston College vs University of Vermont | ",
 "Upcoming Oct 31, 2:00 PM Women's · Boston College vs University of Vermont | ",
 "Upcoming Nov 5, 2:00 PM Women's · Boston College vs University of Connecticut | ",
 "Upcoming Nov 6, 6:00 PM Women's · Boston College at University of Connecticut | ",
 "Upcoming Nov 13 Women's · Boston College vs Boston University | ",
 "Upcoming Nov 14, 4:00 PM Women's · Boston College at Boston University | ",
 "Upcoming Nov 20, 2:00 PM Women's · Boston College at Merrimack College | ",
 "Upcoming Nov 27, 2:00 PM Women's · Boston College vs Penn State University | ",
 "Upcoming Nov 28, 2:00 PM Women's · Boston College vs Princeton University | ",
 "Upcoming Dec 4 Women's · Boston College at Northeastern | ",
 "Upcoming Dec 5 Women's · Boston College vs Northeastern | ",
 "Upcoming Dec 31, 6:00 PM Women's · Boston College vs Bemidji State University | ",
 "Upcoming Jan 1, 2:00 PM Women's · Boston College vs Bemidji State University | ",
 "Upcoming Jan 8, 6:00 PM Women's · Boston College vs Holy Cross | ",
 "Upcoming Jan 12, 7:30 PM Women's · Boston College vs Boston University | ",
 "Upcoming Jan 16, 2:00 PM Women's · Boston College at Providence College | ",
 "Upcoming Jan 19 Women's · Boston College vs Harvard/Northeastern | ",
 "Upcoming Jan 22, 6:00 PM Women's · Boston College at University of New Hampshire | ",
 "Upcoming Jan 23, 2:00 PM Women's · Boston College vs University of New Hampshire | ",
 "Upcoming Jan 29, 6:00 PM Women's · Boston College at University of Maine | ",
 "Upcoming Jan 30, 6:00 PM Women's · Boston College at University of Maine | ",
 "Upcoming Feb 5, 6:00 PM Women's · Boston College at Boston University | ",
 "Upcoming Feb 7, 2:00 PM Women's · Boston College vs Merrimack College | ",
 "Upcoming Feb 12, 2:00 PM Women's · Boston College vs Providence College | ",
 "Upcoming Feb 13 Women's · Boston College at Northeastern University | ",
 "Upcoming Feb 18, 6:00 PM Women's · Boston College at University of Connecticut | ",
 "Upcoming Feb 19, 6:00 PM Women's · Boston College vs Holy Cross | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 17 Boston College at Head of the Charles | ",
 "Upcoming Oct 24 Boston College at Head of the Fish | ",
 "Upcoming Nov 7 Boston College at Foot of the Charles | "
]);
  const v_skiing=parse("Skiing","skiing");
  assert.deepEqual(v_skiing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Boston College vs Siena | W, 7-1",
 "Final Aug 17 Women's · Boston College vs St. John's | W, 2-1",
 "Final Aug 23 Women's · Boston College at Cornell | W, 3-1",
 "Final Aug 30 Women's · Boston College vs Dartmouth | W, 1-0",
 "Final Sep 3 Women's · Boston College at Vermont | W, 5-1",
 "Final Sep 6 Women's · Boston College at Army | W, 2-1",
 "Final Sep 10 Women's · Boston College vs Boston University | W, 4-0",
 "Final Sep 13 Women's · Boston College vs Syracuse | W, 2-0",
 "Final Sep 18 Women's · Boston College at Notre Dame | L, 0-4",
 "Final Sep 24 Women's · Boston College vs California | L, 0-1",
 "Final Sep 27 Women's · Boston College at Clemson | T, 3-3",
 "Final Oct 2 Women's · Boston College vs SMU | W, 3-1",
 "Final Oct 10 Women's · Boston College vs Duke | L, 1-2",
 "Upcoming Oct 16, 7:00 PM Women's · Boston College vs South Carolina State University | ",
 "Upcoming Oct 23, 8:00 PM Women's · Boston College at Miami | ",
 "Upcoming Oct 29, 7:00 PM Women's · Boston College at Virginia Tech | ",
 "Upcoming Nov 1, 1:00 PM Women's · Boston College at Louisville | ",
 "Upcoming Nov 5, 6:00 PM Women's · Boston College vs Stanford | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Boston College vs Merrimack | W, 4-0",
 "Final Aug 23 Men's · Boston College vs Siena | W, 3-1",
 "Final Aug 28 Men's · Boston College vs Dartmouth | W, 2-1",
 "Final Sep 4 Men's · Boston College at Virginia | L, 0-2",
 "Final Sep 8 Men's · Boston College vs St. Bonaventure | T, 2-2",
 "Final Sep 12 Men's · Boston College vs Syracuse | W, 2-0",
 "Final Sep 15 Men's · Boston College vs New Haven | W, 2-1",
 "Final Sep 18 Men's · Boston College at Louisville | T, 3-3",
 "Final Sep 25 Men's · Boston College at Clemson | L, 0-4",
 "Final Oct 3 Men's · Boston College vs North Carolina | L, 1-3",
 "Final Oct 9 Men's · Boston College vs Wake Forest | L, 1-2",
 "Final Oct 13 Men's · Boston College at Boston University | T, 2-2",
 "Upcoming Oct 17, 6:00 PM Men's · Boston College at Notre Dame | ",
 "Upcoming Oct 23, 7:00 PM Men's · Boston College vs Pitt | ",
 "Upcoming Oct 28, 3:30 PM Men's · Boston College vs AIC | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 9 Boston College at Rutgers Invitational | Completed",
 "Upcoming Oct 31, 11:00 AM Boston College at Georgia Tech | ",
 "Upcoming Nov 6, 3:30 PM Boston College vs University of Connecticut | ",
 "Upcoming Nov 20 Boston College at Terrier Invite | ",
 "Upcoming Dec 5, 2:00 PM Boston College vs Harvard University | ",
 "Upcoming Jan 16, 12:00 PM Boston College vs Boston University | ",
 "Upcoming Feb 16 Boston College at Atlantic Coast Conference | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Boston College at All American Championships | Completed",
 "Final Oct 2 Women's · Boston College at Harvard Invitational | Completed",
 "Final Oct 8 Women's · Boston College at Regional Championships | Completed",
 "Upcoming Oct 17 Women's · Boston College at Brown Invitational | ",
 "Upcoming Nov 5 Women's · Boston College at Sectional Championships | ",
 "Upcoming Nov 6 Women's · Boston College at Michigan State Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Boston College at Fairfield Invitational | Completed",
 "Final Oct 8 Men's · Boston College at ITA New England Regionals | Completed",
 "Upcoming Oct 23 Men's · Boston College at UNC Wilmington Invitational | ",
 "Upcoming Nov 6 Men's · Boston College at Florida Gulf Coast Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Boston College vs Air Force | W, 3-0",
 "Final Aug 30 Boston College vs Quinnipiac | W, 3-0",
 "Final Sep 3 Boston College vs Stonehill | W, 3-0",
 "Final Sep 4 Boston College vs Bucknell | W, 3-0",
 "Final Sep 5 Boston College vs UNH | W, 3-1",
 "Final Sep 9 Boston College vs Vanderbilt | L, 0-3",
 "Final Sep 11 Boston College at Memphis | W, 3-1",
 "Final Sep 12 Boston College vs Alcorn State | W, 3-0",
 "Final Sep 18 Boston College vs Quinnipiac | W, 3-2",
 "Final Sep 19 Boston College vs Binghamton | W, 3-0",
 "Final Sep 20 Boston College at Dartmouth | L, 1-3",
 "Final Sep 25 Boston College vs Notre Dame | W, 3-1",
 "Final Sep 27 Boston College vs Louisville | L, 0-3",
 "Final Oct 2 Boston College vs Pittsburgh | L, 0-3",
 "Final Oct 4 Boston College vs SMU | L, 0-3",
 "Final Oct 9 Boston College at Wake Forest | L, 2-3",
 "Final Oct 11 Boston College at NC State | L, 1-3",
 "Upcoming Oct 16, 6:00 PM Boston College at Clemson | ",
 "Upcoming Oct 18, 1:00 PM Boston College at Georgia Tech | ",
 "Upcoming Oct 23, 7:00 PM Boston College vs Virginia Tech | ",
 "Upcoming Oct 25, 1:00 PM Boston College vs Virginia | ",
 "Upcoming Oct 30, 6:30 PM Boston College at Duke | ",
 "Upcoming Nov 1, 2:00 PM Boston College at UNC | ",
 "Upcoming Nov 4, 5:00 PM Boston College at Syracuse | ",
 "Upcoming Nov 8, 1:00 PM Boston College vs Syracuse | ",
 "Upcoming Nov 13, 7:00 PM Boston College vs Florida State | ",
 "Upcoming Nov 15, 12:30 PM Boston College vs Miami | ",
 "Upcoming Nov 20, 10:00 PM Boston College at California | ",
 "Upcoming Nov 22, 4:00 PM Boston College at Stanford | ",
 "Upcoming Nov 25, 2:00 PM Boston College at Virginia | ",
 "Upcoming Nov 28, 1:00 PM Boston College vs California | "
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
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_skiing,"Skiing skiing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
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
// Saved official pages by address: stories and a sport's archive.
const saved=url=>{const {pathname}=new URL(url),news=pathname.match(/^\/news\/(\d+)\/(\d+)\/(\d+)\/([^/?#]+)/),archive=pathname.match(/^\/sports\/([^/]+)\/(?:archives|news\/?$)/);for(const name of news?[`story-${news[1]}-${news[2]}-${news[3]}-${news[4].slice(0,40)}.html.gz`,`recap-${news[1]}-${news[2]}-${news[3]}-${news[4].slice(0,40)}.html.gz`]:archive?[`${archive[1]}-archives.html.gz`]:[]){try{return fixture(name);}catch{}}return null;};
const fromArchive=slug=>{
  const archive=`https://bceagles.com/sports/${slug}/archives`;recapFixtures.set(archive,saved(archive));
  for(const [path] of saved(archive).replace(/\\u002F/gi,'/').matchAll(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)){const body=saved(`https://bceagles.com${path}`);if(body)recapFixtures.set(`https://bceagles.com${path}`,body);}
};

// Cross Country: each team's page (womens-/mens-cross-country; the generic
// cross-country page is SIDEARM's empty template) with its own TFRRS team
// page (Illinois's split); each event keeps its own race. TFRRS names the
// "New England Championships" (Oct 9) "2026 NEICAAA Cross Country
// Championships": the one meet that day.
{
  fromTfrrs(BOSTON_COLLEGE_TFRRS_TEAMS);
  const xc=[...parse('Cross Country','womens-cross-country'),...parse('Cross Country','mens-cross-country')].filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.ok(xc.every(e=>e.results.length&&e.results.every(row=>row.group.startsWith(e.team_label))),'each team keeps its own races');
  assert.deepEqual(xc.map(e=>[e.title,e.headline,Boolean(e.meet_results_verified)]),[["Women's · Boston College at John McNichols Invitational","Women's team: 7th · 217 pts",true],["Women's · Boston College at New England Championships","Women's team: 1st · 47 pts",true],["Men's · Boston College at Maribel Sanchez Souther Invitational","Men's team: 1st · 34 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Swimming: the "Maroon & Gold" meet (Sep 25) is the team's intrasquad.
assert.deepEqual(parse('Swimming & Diving','swimming-and-diving').filter(e=>e.status==='Final').map(line),["Final Oct 9 Boston College at Rutgers Invitational | Completed"]);

// Football: the SMU game (Oct 3) links no story; the archive's game story is
// "football-suffers-setback-at-smu" (Oct 3), not the next day's "#ForBoston
// Files" video ("The Replay: SMU", which gives the score too).
{
  fromArchive('football');
  const smu=parse('Football','football').find(e=>e.status==='Final'&&/SMU/.test(e.opponent));
  assert.ok(worker.bostonCollegeHandlers.isFinalWithoutStory(smu));
  await worker.bostonCollegeHandlers.attachArchiveStory(smu);
  assert.equal(smu.recap_url,'https://bceagles.com/news/2026/10/3/football-suffers-setback-at-smu');
  recapFixtures.clear();requests.length=0;
}

// Records equal the published ones.
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?[own.conference.name,own.conference.text].join(' '):null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey'],['Hockey','mens-ice-hockey'],['Hockey','womens-ice-hockey']].map(([sport,slug])=>records(sport,slug)),[["2-3","ACC 0-2"],["10-7","ACC 1-5"],["9-3-1","ACC 2-3-1"],["5-4-3","ACC 1-4-1"],["6-7","ACC 1-3"],["0-1",null],["2-1","Hockey East 1-1"]]);
}

// A home tournament named after the host reads as its tournament. The rule
// came from Oklahoma's module and matched "BostonCollege(… | Sooners)" until
// Oct 15: it never matched. The opponent is made the host here (the season
// has no such card yet).
{
  const raw=fixture('fencing-schedule.html.gz').replaceAll('"Northeast Fencing Conference Meet #1"','"Boston College"');
  const events=worker.labelTeamEvents(worker.parseHtml(raw,school,'Fencing',page('fencing'),now),school,'Fencing',page('fencing'));
  assert.deepEqual(events.filter(e=>/Northeast Fencing|at Boston College/.test(e.title)).map(e=>e.title),["Boston College at Northeast Fencing Conference #1","Boston College at Northeast Fencing Conference Meet #2"]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Boston College module checks passed');
