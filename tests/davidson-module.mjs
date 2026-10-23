import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {davidsonSchool} from '../src/schools/davidson.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='davidson');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,davidsonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/davidson-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit davidsonwildcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['davidson'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',davidsonSchool.scheduleUrls],['roster',davidsonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('davidson|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'davidsonwildcats.com',`${key} must stay on davidsonwildcats.com`);
  }
}
const parity={"Baseball":{"schedule":["https://davidsonwildcats.com/sports/baseball/schedule"],"roster":["https://davidsonwildcats.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://davidsonwildcats.com/sports/mens-basketball/schedule","https://davidsonwildcats.com/sports/womens-basketball/schedule"],"roster":["https://davidsonwildcats.com/sports/mens-basketball/roster","https://davidsonwildcats.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://davidsonwildcats.com/sports/womens-cross-country/schedule","https://davidsonwildcats.com/sports/mens-cross-country/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-cross-country/roster","https://davidsonwildcats.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://davidsonwildcats.com/sports/field-hockey/schedule"],"roster":["https://davidsonwildcats.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://davidsonwildcats.com/sports/football/schedule"],"roster":["https://davidsonwildcats.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://davidsonwildcats.com/sports/mens-golf/schedule"],"roster":["https://davidsonwildcats.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://davidsonwildcats.com/sports/womens-lacrosse/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://davidsonwildcats.com/sports/womens-soccer/schedule","https://davidsonwildcats.com/sports/mens-soccer/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-soccer/roster","https://davidsonwildcats.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://davidsonwildcats.com/sports/womens-swimming-and-diving/schedule","https://davidsonwildcats.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-swimming-and-diving/roster","https://davidsonwildcats.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://davidsonwildcats.com/sports/womens-tennis/schedule","https://davidsonwildcats.com/sports/mens-tennis/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-tennis/roster","https://davidsonwildcats.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://davidsonwildcats.com/sports/womens-track-and-field/schedule","https://davidsonwildcats.com/sports/mens-track-and-field/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-track-and-field/roster","https://davidsonwildcats.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://davidsonwildcats.com/sports/womens-volleyball/schedule"],"roster":["https://davidsonwildcats.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://davidsonwildcats.com/sports/wrestling/schedule"],"roster":["https://davidsonwildcats.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'davidson|"+sport+"':"),`${sport} routes must live in the Davidson module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://davidsonwildcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.davidsonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=davidson)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 9:00 PM Men's · Davidson at Washington State | ",
 "Upcoming Nov 7, 7:00 PM Men's · Davidson vs Mercer | ",
 "Upcoming Nov 10, 7:00 PM Men's · Davidson vs Bradley | ",
 "Upcoming Nov 14, 7:00 PM Men's · Davidson vs Howard | ",
 "Upcoming Nov 17, 7:00 PM Men's · Davidson vs Charlotte | ",
 "Upcoming Nov 23, 11:00 AM Men's · Davidson vs Northern Iowa | ",
 "Upcoming Nov 25, 1:30 PM Men's · Davidson vs Tulane | ",
 "Upcoming Nov 29, 2:00 PM Men's · Davidson at Florida Atlantic | ",
 "Upcoming Dec 2, 7:00 PM Men's · Davidson vs Dartmouth | ",
 "Upcoming Dec 6, 2:00 PM Men's · Davidson at College of Charleston | ",
 "Upcoming Dec 9, 7:30 PM Men's · Davidson vs Campbell | ",
 "Upcoming Dec 12, 4:00 PM Men's · Davidson vs USC Upstate | ",
 "Upcoming Dec 18, 7:00 PM Men's · Davidson vs Drake | ",
 "Upcoming Dec 22, 2:00 PM Men's · Davidson vs UT Martin | ",
 "Upcoming Dec 30, 7:00 PM Men's · Davidson at Duquesne | ",
 "Upcoming Jan 2, 2:30 PM Men's · Davidson vs Dayton | ",
 "Upcoming Jan 6, 6:00 PM Men's · Davidson at VCU | ",
 "Upcoming Jan 9, 2:30 PM Men's · Davidson vs Richmond | ",
 "Upcoming Jan 16, 2:30 PM Men's · Davidson at Loyola Chicago | ",
 "Upcoming Jan 20, 7:00 PM Men's · Davidson vs Fordham | ",
 "Upcoming Jan 23, 2:00 PM Men's · Davidson at La Salle | ",
 "Upcoming Jan 27, 7:00 PM Men's · Davidson vs Saint Joseph's | ",
 "Upcoming Jan 30, 6:00 PM Men's · Davidson vs Loyola Chicago | ",
 "Upcoming Feb 3, 7:00 PM Men's · Davidson at Richmond | ",
 "Upcoming Feb 7, 2:00 PM Men's · Davidson at Rhode Island | ",
 "Upcoming Feb 10, 7:00 PM Men's · Davidson vs St. Bonaventure | ",
 "Upcoming Feb 13, 2:00 PM Men's · Davidson vs George Mason | ",
 "Upcoming Feb 16, 7:00 PM Men's · Davidson at Saint Louis | ",
 "Upcoming Feb 24, 7:00 PM Men's · Davidson vs George Washington | ",
 "Upcoming Feb 27, 2:30 PM Men's · Davidson at Saint Joseph's | ",
 "Upcoming Mar 3, 7:00 PM Men's · Davidson at Fordham | ",
 "Upcoming Mar 6, 2:00 PM Men's · Davidson vs Duquesne | ",
 "Upcoming Mar 10 Men's · Davidson at 2027 A-10 Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 18 Women's · Davidson at North Carolina (Exhibition) | L, 66-76",
 "Upcoming Nov 2, 11:00 AM Women's · Davidson at Columbia | ",
 "Upcoming Nov 5, 7:00 PM Women's · Davidson vs Virginia | ",
 "Upcoming Nov 8, 1:00 PM Women's · Davidson vs Campbell | ",
 "Upcoming Nov 11, 7:00 PM Women's · Davidson vs Appalachian State | ",
 "Upcoming Nov 18, 7:00 PM Women's · Davidson vs Charleston Southern | ",
 "Upcoming Nov 21, 7:00 PM Women's · Davidson vs Charlotte | ",
 "Upcoming Nov 24, 1:00 PM Women's · Davidson vs Notre Dame | ",
 "Upcoming Nov 26, 2:00 PM Women's · Davidson vs Florida | ",
 "Upcoming Dec 2, 6:00 PM Women's · Davidson at Fordham | ",
 "Upcoming Dec 6, 6:00 PM Women's · Davidson at NC State | ",
 "Upcoming Dec 9, 5:00 PM Women's · Davidson vs Vanderbilt | ",
 "Upcoming Dec 13, 1:00 PM Women's · Davidson vs Radford | ",
 "Upcoming Dec 17, 7:00 PM Women's · Davidson at Georgetown | ",
 "Upcoming Dec 20, 1:00 PM Women's · Davidson vs Mississippi State | ",
 "Upcoming Dec 22, 1:00 PM Women's · Davidson at Ohio | ",
 "Upcoming Dec 30, 7:00 PM Women's · Davidson vs Loyola Chicago | ",
 "Upcoming Jan 3, 11:30 AM Women's · Davidson at Dayton | ",
 "Upcoming Jan 6 Women's · Davidson vs Richmond | ",
 "Upcoming Jan 10, 12:00 PM Women's · Davidson at George Washington | ",
 "Upcoming Jan 13, 7:00 PM Women's · Davidson vs La Salle | ",
 "Upcoming Jan 17, 12:00 PM Women's · Davidson at Saint Joseph's | ",
 "Upcoming Jan 20, 7:00 PM Women's · Davidson at George Mason | ",
 "Upcoming Jan 23, 1:00 PM Women's · Davidson vs Rhode Island | ",
 "Upcoming Jan 31, 12:00 PM Women's · Davidson at Richmond | ",
 "Upcoming Feb 3, 7:00 PM Women's · Davidson vs Dayton | ",
 "Upcoming Feb 7, 12:00 PM Women's · Davidson vs Saint Louis | ",
 "Upcoming Feb 10, 11:00 AM Women's · Davidson at Duquesne | ",
 "Upcoming Feb 14, 12:00 PM Women's · Davidson vs George Mason | ",
 "Upcoming Feb 17, 7:00 PM Women's · Davidson vs St. Bonaventure | ",
 "Upcoming Feb 20, 7:00 PM Women's · Davidson at Saint Louis | ",
 "Upcoming Feb 24, 7:00 PM Women's · Davidson at Loyola Chicago | ",
 "Upcoming Feb 27, 1:00 PM Women's · Davidson vs VCU | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Davidson at Friday Night Lights Elon Opener | Completed",
 "Final Sep 18 Women's · Davidson at Adidas XC Challenge | Completed",
 "Final Oct 2 Women's · Davidson at Richmond Invitational | Completed",
 "Final Oct 9 Women's · Davidson at Royals Challenge | Completed",
 "Upcoming Oct 31, 10:00 AM Women's · Davidson at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 10:00 AM Women's · Davidson at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Women's · Davidson at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Davidson at Friday Night Lights Elon Opener | Completed",
 "Final Sep 18 Men's · Davidson at Adidas XC Challenge | Completed",
 "Final Oct 2 Men's · Davidson at Richmond Invitational | Completed",
 "Final Oct 17 Men's · Davidson at Upstate Invitational | Completed",
 "Upcoming Oct 31, 11:00 AM Men's · Davidson at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 11:00 AM Men's · Davidson at NCAA Southeast Regionals | ",
 "Upcoming Nov 21, 10:00 AM Men's · Davidson at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Davidson vs Georgetown | L, 1-2",
 "Final Aug 30 Davidson vs Towson | W, 4-0",
 "Final Sep 2 Davidson vs Appalachian State | L, 0-2",
 "Final Sep 5 Davidson vs Stonehill | W, 6-0",
 "Final Sep 6 Davidson at Maine | L, 0-1",
 "Final Sep 11 Davidson vs Longwood | W, 5-0",
 "Final Sep 13 Davidson at Ohio | W, 2-1",
 "Final Sep 18 Davidson at Richmond | L, 2-5",
 "Final Sep 20 Davidson vs Bellarmine | W, 2-0",
 "Final Sep 25 Davidson at Queens | W, 2-0",
 "Final Oct 2 Davidson vs Saint Joseph's | L, 1-5",
 "Final Oct 4 Davidson vs Ball State | W, 3-1",
 "Final Oct 9 Davidson at La Salle | W, 2-1",
 "Final Oct 11 Davidson at Rider | L, 0-1",
 "Final Oct 16 Davidson vs VCU | L, 3-4",
 "Final Oct 18 Davidson at Wake Forest | L, 0-5",
 "Upcoming Oct 23, 5:00 PM Davidson vs Mercyhurst | ",
 "Upcoming Oct 25, 12:00 PM Davidson at Saint Louis | ",
 "Upcoming Oct 30, 7:00 PM Davidson vs Lock Haven | ",
 "Upcoming Nov 5 Davidson at Atlantic 10 Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Davidson vs Concord | L, 35-41",
 "Final Sep 5 Davidson vs Elon | L, 0-38",
 "Final Sep 12 Davidson vs Dickinson College | W, 28-14",
 "Final Sep 19 Davidson vs VMI | W, 27-24",
 "Final Sep 26 Davidson vs Drake | L, 32-51",
 "Final Oct 3 Davidson at San Diego | L, 14-63",
 "Final Oct 10 Davidson at Presbyterian | L, 21-38",
 "Final Oct 17 Davidson vs Morehead State | W, 34-31",
 "Upcoming Oct 31, 1:00 PM Davidson at St. Thomas | ",
 "Upcoming Nov 7, 1:00 PM Davidson vs Stetson | ",
 "Upcoming Nov 14, 12:00 PM Davidson at Dayton | ",
 "Upcoming Nov 21, 1:00 PM Davidson vs Marist | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Davidson at Bryan National Collegiate (Bryan Park GC) | Completed",
 "Final Sep 21 Davidson at River Run Collegiate (River Run CC) | Completed",
 "Final Sep 25 Davidson at Macdonald Cup (Yale GC) | Completed",
 "Final Oct 11 Davidson at Waterville Match (Waterville Golf Links) | Completed",
 "Final Oct 18 Davidson at Furman Intercollegiate (Furman University GC) | Completed",
 "Upcoming Feb 15 Davidson at Hal Williams Collegiate (Magnolia GC) | ",
 "Upcoming Mar 8 Davidson at Cleveland Golf Palmetto Collegiate (Palmetto GC) | ",
 "Upcoming Mar 12 Davidson at Seminole Intercollegiate (FSU Legacy Golf Course) | ",
 "Upcoming Mar 22 Davidson at Seahawk Collegiate (Country Club of Landfill) | ",
 "Upcoming Apr 10 Davidson at Princeton Invitational (Springdale GC) | ",
 "Upcoming Apr 26 Davidson at Atlantic 10 Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Jan 30, 1:00 PM Davidson vs High Point (Exhibition) | ",
 "Upcoming Feb 6, 2:00 PM Davidson at Virginia Tech | ",
 "Upcoming Feb 9, 6:30 PM Davidson vs Wofford College | ",
 "Upcoming Feb 13 Davidson vs Liberty | ",
 "Upcoming Feb 17, 6:30 PM Davidson vs Queens | ",
 "Upcoming Feb 21, 12:00 PM Davidson at Coastal Carolina | ",
 "Upcoming Feb 25, 6:30 PM Davidson vs Winthrop | ",
 "Upcoming Mar 8, 12:00 PM Davidson at Stetson | ",
 "Upcoming Mar 13, 12:00 PM Davidson at La Salle | ",
 "Upcoming Mar 20, 12:00 PM Davidson vs Rhode Island | ",
 "Upcoming Mar 24, 1:00 PM Davidson at VCU | ",
 "Upcoming Mar 27, 12:00 PM Davidson vs Duquesne | ",
 "Upcoming Apr 3, 12:00 PM Davidson at Saint Joseph's | ",
 "Upcoming Apr 11, 12:00 PM Davidson at George Mason | ",
 "Upcoming Apr 17, 1:00 PM Davidson vs Richmond | ",
 "Upcoming Apr 24, 12:00 PM Davidson vs George Washington | ",
 "Upcoming May 1, 12:00 PM Davidson at St. Bonaventure | ",
 "Upcoming May 6 Davidson at 2027 A-10 Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Davidson at High Point | W, 1-0",
 "Final Aug 20 Women's · Davidson at USC Upstate | L, 2-3",
 "Final Aug 23 Women's · Davidson vs College of Charleston | W, 2-0",
 "Final Aug 27 Women's · Davidson vs Elon | T, 3-3",
 "Final Aug 30 Women's · Davidson at NC State | L, 1-6",
 "Final Sep 6 Women's · Davidson vs Coastal Carolina | W, 1-0",
 "Final Sep 10 Women's · Davidson vs UNC Asheville | L, 0-1",
 "Final Sep 13 Women's · Davidson at Furman | W, 1-0",
 "Final Sep 19 Women's · Davidson at La Salle | L, 1-2",
 "Final Sep 24 Women's · Davidson vs Saint Joseph's | T, 1-1",
 "Final Sep 27 Women's · Davidson at Fordham | W, 2-1",
 "Final Oct 3 Women's · Davidson vs Saint Louis | L, 0-1",
 "Final Oct 8 Women's · Davidson vs Rhode Island | L, 0-1",
 "Final Oct 11 Women's · Davidson at Richmond | L, 0-1",
 "Final Oct 17 Women's · Davidson vs Dayton | L, 0-1",
 "Today Oct 22, 7:00 PM Women's · Davidson at Duquesne | ",
 "Upcoming Oct 25, 12:00 PM Women's · Davidson at St. Bonaventure | ",
 "Upcoming Nov 1, 1:30 PM Women's · Davidson vs George Mason | ",
 "Upcoming Nov 6 Women's · Davidson at Atlantic 10 Quarterfinal | ",
 "Upcoming Nov 7 Women's · Davidson at Atlantic 10 Quarterfinal | ",
 "Upcoming Nov 11 Women's · Davidson at Atlantic 10 Semifinal | ",
 "Upcoming Nov 15 Women's · Davidson at Atlantic 10 Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Davidson at College of Charleston | T, 1-1",
 "Final Aug 28 Men's · Davidson at Gardner-Webb | T, 0-0",
 "Final Sep 1 Men's · Davidson vs UNC Greensboro | T, 2-2",
 "Final Sep 4 Men's · Davidson vs Furman | T, 2-2",
 "Final Sep 11 Men's · Davidson vs George Mason | W, 3-2",
 "Final Sep 15 Men's · Davidson vs High Point | L, 0-1",
 "Final Sep 22 Men's · Davidson vs Elon | L, 1-2",
 "Final Sep 26 Men's · Davidson vs St. Bonaventure | W, 1-0",
 "Final Oct 3 Men's · Davidson at Loyola Chicago | L, 1-2",
 "Final Oct 7 Men's · Davidson at Rhode Island | L, 1-3",
 "Final Oct 11 Men's · Davidson vs Johnson & Wales | W, 7-0",
 "Final Oct 17 Men's · Davidson at Duquesne | L, 0-3",
 "Final Oct 21 Men's · Davidson vs Fordham | W, 1-0",
 "Upcoming Oct 24, 2:00 PM Men's · Davidson at Saint Joseph's | ",
 "Upcoming Oct 27, 7:00 PM Men's · Davidson at Presbyterian | ",
 "Upcoming Oct 31, 7:00 PM Men's · Davidson vs Saint Louis | ",
 "Upcoming Nov 6 Men's · Davidson at Atlantic 10 Men's Soccer Tournament | ",
 "Upcoming Nov 11 Men's · Davidson at Atlantic 10 Semifinal | ",
 "Upcoming Nov 15 Men's · Davidson at Atlantic 10 Final | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Davidson at Queens | L, 66-139",
 "Final Oct 2 Women's · Davidson vs Duke | L, 53.5-246.5",
 "Final Oct 9 Women's · Davidson at Richmond Invitational | Completed",
 "Final Oct 10 Women's · Davidson vs Richmond (at Richmond Duals) | L, 106-192",
 "Final Oct 10 Women's · Davidson vs George Mason (at Richmond Duals) | L, 113-183",
 "Final Oct 10 Women's · Davidson vs Duquesne (at Richmond Duals) | L, 85-213",
 "Upcoming Oct 23 Women's · Davidson at Seahawk Diving Invitational | ",
 "Upcoming Oct 30, 5:30 PM Women's · Davidson vs Catawba and UNCA | ",
 "Upcoming Dec 4 Women's · Davidson at Bucknell Invitational | ",
 "Upcoming Jan 15, 4:00 PM Women's · Davidson at Old Dominion | ",
 "Upcoming Jan 16, 12:00 PM Women's · Davidson at William & Mary | ",
 "Upcoming Jan 23, 12:30 PM Women's · Davidson at VMI (Diving) | ",
 "Upcoming Feb 5, 5:30 PM Women's · Davidson vs Gardner-Webb | ",
 "Upcoming Feb 17 Women's · Davidson at Atlantic 10 Championships | ",
 "Upcoming Feb 27 Women's · Davidson at Bulldog Invitational - Last Chance Meet | ",
 "Upcoming Mar 8 Women's · Davidson at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 17 Women's · Davidson at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Davidson at Queens | L, 52.5-152.5",
 "Final Oct 2 Men's · Davidson vs Duke | L, 106-193",
 "Final Oct 9 Men's · Davidson at Richmond Invitational | L, 892-950",
 "Final Oct 10 Men's · Davidson vs George Mason (at Richmond Duals) | L, 108-192",
 "Upcoming Oct 23 Men's · Davidson at Seahawk Diving Invitational | ",
 "Upcoming Oct 30, 5:30 PM Men's · Davidson vs Catawba and UNCA | ",
 "Upcoming Dec 4 Men's · Davidson at Bucknell Invitational | ",
 "Upcoming Jan 15, 4:00 PM Men's · Davidson at Old Dominion | ",
 "Upcoming Jan 16, 12:00 PM Men's · Davidson at William & Mary | ",
 "Upcoming Jan 23, 12:30 PM Men's · Davidson at VMI (Diving) | ",
 "Upcoming Feb 5, 5:30 PM Men's · Davidson vs Gardner-Webb | ",
 "Upcoming Feb 17 Men's · Davidson at Atlantic 10 Championships | ",
 "Upcoming Feb 27 Men's · Davidson at Bulldog Invitational - Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Davidson at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 24 Men's · Davidson at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Davidson at Emily McNall Classic | Completed",
 "Final Oct 2 Women's · Davidson at Atlantic 10 Conference Masters | Completed",
 "Final Oct 3 Women's · Davidson at Elon Invite | Completed",
 "Final Oct 15 Women's · Davidson at Carolina Regional Tournament | Completed",
 "Upcoming Oct 23 Women's · Davidson at Georgia Southern Tournament | ",
 "Upcoming Jan 30 Women's · Davidson at Charlotte | ",
 "Upcoming Jan 31, 1:00 PM Women's · Davidson at UNC Asheville | ",
 "Upcoming Feb 6, 1:00 PM Women's · Davidson at UNCW | ",
 "Upcoming Feb 7, 1:00 PM Women's · Davidson at Furman | ",
 "Upcoming Feb 13, 1:00 PM Women's · Davidson at UNCG | ",
 "Upcoming Feb 20, 1:00 PM Women's · Davidson at Wofford | ",
 "Upcoming Feb 21, 2:00 PM Women's · Davidson at North Carolina Central | ",
 "Upcoming Feb 28, 11:00 AM Women's · Davidson at East Carolina | ",
 "Upcoming Mar 6, 3:00 PM Women's · Davidson at Brown | ",
 "Upcoming Mar 7 Women's · Davidson at Rhode Island | ",
 "Upcoming Mar 12, 1:00 PM Women's · Davidson at Western Carolina | ",
 "Upcoming Mar 16, 3:00 PM Women's · Davidson at Tarleton State | ",
 "Upcoming Mar 19, 3:00 PM Women's · Davidson at George Washington | ",
 "Upcoming Mar 20, 1:00 PM Women's · Davidson at Fordham | ",
 "Upcoming Apr 4, 1:00 PM Women's · Davidson at Appalachian State | ",
 "Upcoming Apr 9, 4:00 PM Women's · Davidson at Georgia Gwinnett | ",
 "Upcoming Apr 11 Women's · Davidson at Coastal Carolina | ",
 "Upcoming Apr 17 Women's · Davidson at Queens | ",
 "Upcoming Apr 23, 11:00 AM Women's · Davidson at VCU | ",
 "Upcoming Apr 24 Women's · Davidson at Richmond | ",
 "Upcoming Apr 28 Women's · Davidson at Atlantic 10 Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Davidson at Davidson Invite | Completed",
 "Final Oct 2 Men's · Davidson at A-10 Conference Masters | Completed",
 "Final Oct 8 Men's · Davidson at ITA Regionals | Completed",
 "Final Oct 16 Men's · Davidson at UNC Greensboro Invite | Completed",
 "Upcoming Oct 23 Men's · Davidson at Wake Forest Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Davidson vs Winthrop | W, 3-2",
 "Final Aug 29 Davidson vs North Carolina | L, 0-3",
 "Final Aug 30 Davidson vs Wofford College | L, 1-3",
 "Final Sep 4 Davidson at Wake Forest | W, 3-1",
 "Final Sep 5 Davidson vs Georgetown | L, 0-3",
 "Final Sep 6 Davidson vs Central Florida | L, 0-3",
 "Final Sep 11 Davidson at Elon | W, 3-1",
 "Final Sep 12 Davidson at UNC Greensboro | W, 3-1",
 "Final Sep 12 Davidson at North Carolina A&T State | W, 3-1",
 "Final Sep 18 Davidson at Queens University of Charlotte | W, 3-2",
 "Final Sep 19 Davidson vs Charlotte | W, 3-1",
 "Final Sep 25 Davidson at Dayton | L, 1-3",
 "Final Sep 26 Davidson at Dayton | L, 0-3",
 "Final Oct 2 Davidson vs George Mason | L, 1-3",
 "Final Oct 3 Davidson vs George Mason | L, 1-3",
 "Final Oct 6 Davidson vs Virginia Commonwealth | L, 2-3",
 "Final Oct 10 Davidson at George Washington | L, 1-3",
 "Final Oct 11 Davidson at George Washington | L, 2-3",
 "Final Oct 16 Davidson at Loyola University Chicago | L, 1-3",
 "Final Oct 17 Davidson at Loyola University Chicago | W, 3-0",
 "Upcoming Oct 23, 7:00 PM Davidson vs Rhode Island | ",
 "Upcoming Oct 24, 1:00 PM Davidson vs Rhode Island | ",
 "Upcoming Oct 27, 5:00 PM Davidson at Virginia Commonwealth | ",
 "Upcoming Oct 31, 2:00 PM Davidson vs Duquesne | ",
 "Upcoming Nov 1, 1:00 PM Davidson vs Duquesne | ",
 "Upcoming Nov 6, 5:00 PM Davidson at Saint Louis | ",
 "Upcoming Nov 7, 2:00 PM Davidson at Saint Louis | ",
 "Upcoming Nov 13, 7:00 PM Davidson vs Fordham | ",
 "Upcoming Nov 14, 1:00 PM Davidson vs Fordham | ",
 "Upcoming Nov 20 Davidson at Atlantic 10 Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Davidson vs Southeast Open | ",
 "Upcoming Nov 8 Davidson at Journeymen Classic | ",
 "Upcoming Nov 14, 11:00 AM Davidson vs Sacred Heart | ",
 "Upcoming Nov 15, 3:00 PM Davidson at American | ",
 "Upcoming Nov 22, 11:00 AM Davidson at Northwestern | ",
 "Upcoming Nov 22, 1:00 PM Davidson vs SIUE | ",
 "Upcoming Dec 4, 7:00 PM Davidson at Virginia | ",
 "Upcoming Dec 6, 2:00 PM Davidson vs Presbyterian | ",
 "Upcoming Dec 11, 7:00 PM Davidson vs Mercyhurst | ",
 "Upcoming Dec 18, 7:00 PM Davidson at Bellarmine | ",
 "Upcoming Jan 2 Davidson at Southern Scuffle | ",
 "Upcoming Jan 16 Davidson at Gardner-Webb | ",
 "Upcoming Jan 16 Davidson at Lock Haven | ",
 "Upcoming Jan 17 Davidson vs Davidson Open | ",
 "Upcoming Jan 31, 2:00 PM Davidson at Rider | ",
 "Upcoming Jan 31, 4:00 PM Davidson vs George Mason | ",
 "Upcoming Feb 4, 7:00 PM Davidson vs VMI | ",
 "Upcoming Feb 5, 7:00 PM Davidson vs Chattanooga | ",
 "Upcoming Feb 12, 7:00 PM Davidson vs The Citadel | ",
 "Upcoming Feb 14, 2:30 PM Davidson at Appalachian State | ",
 "Upcoming Feb 19, 7:00 PM Davidson at Campbell | ",
 "Upcoming Feb 21 Davidson vs Wildcat Open | ",
 "Upcoming Mar 5 Davidson at Southern Conference Championships | ",
 "Upcoming Mar 18 Davidson at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
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
console.log("Davidson module checks passed");
