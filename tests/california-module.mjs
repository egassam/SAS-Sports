import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {californiaSchool,CALIFORNIA_TFRRS_TEAMS,californiaGolfStoryPlace} from '../src/schools/california.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='california');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,californiaHandlers,attachOfficialMeetResults,decodeHtml,featuredAthletes};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/california-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit calbears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['california'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',californiaSchool.scheduleUrls],['roster',californiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('california|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'calbears.com',`${key} must stay on calbears.com`);
  }
}
const parity={"Baseball":{"schedule":["https://calbears.com/sports/baseball/schedule"],"roster":["https://calbears.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://calbears.com/sports/mens-basketball/schedule","https://calbears.com/sports/womens-basketball/schedule"],"roster":["https://calbears.com/sports/mens-basketball/roster","https://calbears.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://calbears.com/sports/beach-volleyball/schedule"],"roster":["https://calbears.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://calbears.com/sports/cross-country/schedule"],"roster":["https://calbears.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://calbears.com/sports/field-hockey/schedule"],"roster":["https://calbears.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://calbears.com/sports/football/schedule"],"roster":["https://calbears.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://calbears.com/sports/womens-golf/schedule","https://calbears.com/sports/mens-golf/schedule"],"roster":["https://calbears.com/sports/womens-golf/roster","https://calbears.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://calbears.com/sports/womens-gymnastics/schedule","https://calbears.com/sports/mens-gymnastics/schedule"],"roster":["https://calbears.com/sports/womens-gymnastics/roster","https://calbears.com/sports/mens-gymnastics/roster"],"combined":true},"Lacrosse":{"schedule":["https://calbears.com/sports/womens-lacrosse/schedule"],"roster":["https://calbears.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://calbears.com/sports/womens-rowing/schedule","https://calbears.com/sports/mens-rowing/schedule"],"roster":["https://calbears.com/sports/womens-rowing/roster","https://calbears.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://calbears.com/sports/womens-soccer/schedule","https://calbears.com/sports/mens-soccer/schedule"],"roster":["https://calbears.com/sports/womens-soccer/roster","https://calbears.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://calbears.com/sports/softball/schedule"],"roster":["https://calbears.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://calbears.com/sports/womens-swimming-and-diving/schedule","https://calbears.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://calbears.com/sports/womens-swimming-and-diving/roster","https://calbears.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://calbears.com/sports/womens-tennis/schedule","https://calbears.com/sports/mens-tennis/schedule"],"roster":["https://calbears.com/sports/womens-tennis/roster","https://calbears.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://calbears.com/sports/track-and-field/schedule"],"roster":["https://calbears.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://calbears.com/sports/womens-volleyball/schedule"],"roster":["https://calbears.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://calbears.com/sports/womens-water-polo/schedule","https://calbears.com/sports/mens-water-polo/schedule"],"roster":["https://calbears.com/sports/womens-water-polo/roster","https://calbears.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'california|"+sport+"':"),`${sport} routes must live in the California module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://calbears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.californiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=california)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 16, 6:00 PM Men's · Cal at LMU (Exhibition) | ",
 "Upcoming Oct 24, 7:00 PM Men's · Cal at Oregon State (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Men's · Cal vs Adams State | ",
 "Upcoming Nov 4, 6:00 PM Men's · Cal vs Radford | ",
 "Upcoming Nov 8, 5:30 PM Men's · Cal vs Houston | ",
 "Upcoming Nov 11, 8:00 PM Men's · Cal vs USC | ",
 "Upcoming Nov 14, 2:00 PM Men's · Cal vs Utah Tech | ",
 "Upcoming Nov 19, 7:00 PM Men's · Cal vs East Texas A&M | ",
 "Upcoming Nov 23, 7:00 PM Men's · Cal vs Alabama State | ",
 "Upcoming Nov 28, 5:00 PM Men's · Cal vs Minnesota | ",
 "Upcoming Dec 2, 6:00 PM Men's · Cal at Utah | ",
 "Upcoming Dec 6, 5:00 PM Men's · Cal vs Vanderbilt | ",
 "Upcoming Dec 10, 7:00 PM Men's · Cal vs Southeastern Louisiana | ",
 "Upcoming Dec 12, 12:00 PM Men's · Cal vs UC Riverside | ",
 "Upcoming Dec 20, 12:00 PM Men's · Cal vs Southern | ",
 "Upcoming Dec 22, 3:00 PM Men's · Cal vs Northeastern | ",
 "Upcoming Dec 30, 1:00 PM Men's · Cal at North Carolina | ",
 "Upcoming Jan 2, 11:15 AM Men's · Cal at Duke | ",
 "Upcoming Jan 6, 6:00 PM Men's · Cal vs Florida State | ",
 "Upcoming Jan 9, 1:00 PM Men's · Cal vs Virginia | ",
 "Upcoming Jan 13, 4:00 PM Men's · Cal at Louisville | ",
 "Upcoming Jan 16, 11:00 AM Men's · Cal at Notre Dame | ",
 "Upcoming Jan 23, 6:00 PM Men's · Cal vs Stanford | ",
 "Upcoming Jan 27, 6:00 PM Men's · Cal vs NC State | ",
 "Upcoming Jan 30, 2:30 PM Men's · Cal vs Syracuse | ",
 "Upcoming Feb 3, 5:00 PM Men's · Cal at SMU | ",
 "Upcoming Feb 6, 9:00 AM Men's · Cal at Clemson | ",
 "Upcoming Feb 10, 6:00 PM Men's · Cal vs Virginia Tech | ",
 "Upcoming Feb 13, 7:00 PM Men's · Cal vs Miami | ",
 "Upcoming Feb 17, 4:00 PM Men's · Cal at Pitt | ",
 "Upcoming Feb 20, 9:00 AM Men's · Cal at NC State | ",
 "Upcoming Feb 24, 6:00 PM Men's · Cal vs Boston College | ",
 "Upcoming Feb 27, 1:30 PM Men's · Cal vs Wake Forest | ",
 "Upcoming Mar 6, 1:00 PM Men's · Cal at Stanford | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Today Oct 14, 6:00 PM Women's · Cal vs UCLA (Exhibition) | ",
 "Upcoming Oct 25, 2:00 PM Women's · Cal at USC (Exhibition) | ",
 "Upcoming Oct 29, 6:00 PM Women's · Cal vs Vanguard (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Cal vs Washington State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Cal vs Long Beach State | ",
 "Upcoming Nov 8, 11:00 AM Women's · Cal vs San Francisco | ",
 "Upcoming Nov 12, 11:00 AM Women's · Cal vs Charleston | ",
 "Upcoming Nov 14, 12:00 PM Women's · Cal at UCSB | ",
 "Upcoming Nov 20, 6:00 PM Women's · Cal vs Hawaii | ",
 "Upcoming Nov 23, 3:00 PM Women's · Cal vs Gonzaga | ",
 "Upcoming Nov 27, 12:00 PM Women's · Cal vs Delaware | ",
 "Upcoming Nov 28 Women's · Cal vs Raising the B.A.R. Invitational | ",
 "Upcoming Dec 3, 6:00 PM Women's · Cal vs Texas A&M | ",
 "Upcoming Dec 7, 7:30 PM Women's · Cal at LMU | ",
 "Upcoming Dec 13, 1:00 PM Women's · Cal vs Stanford | ",
 "Upcoming Dec 20, 3:00 PM Women's · Cal vs Nebraska | ",
 "Upcoming Dec 22, 12:00 PM Women's · Cal vs Southern Utah | ",
 "Upcoming Dec 31, 2:00 PM Women's · Cal at Notre Dame | ",
 "Upcoming Jan 3, 11:00 AM Women's · Cal at Louisville | ",
 "Upcoming Jan 7, 6:00 PM Women's · Cal vs NC State | ",
 "Upcoming Jan 10, 2:00 PM Women's · Cal vs Miami | ",
 "Upcoming Jan 14, 4:00 PM Women's · Cal at Duke | ",
 "Upcoming Jan 17, 11:00 AM Women's · Cal at Wake Forest | ",
 "Upcoming Jan 21, 5:00 PM Women's · Cal vs North Carolina | ",
 "Upcoming Jan 24, 3:00 PM Women's · Cal vs Syracuse | ",
 "Upcoming Jan 28, 3:00 PM Women's · Cal at Virginia | ",
 "Upcoming Jan 31, 11:00 AM Women's · Cal at Virginia Tech | ",
 "Upcoming Feb 4, 6:00 PM Women's · Cal vs Florida State | ",
 "Upcoming Feb 7, 3:00 PM Women's · Cal vs Georgia Tech | ",
 "Upcoming Feb 11, 7:00 PM Women's · Cal at Stanford | ",
 "Upcoming Feb 18, 5:00 PM Women's · Cal at Clemson | ",
 "Upcoming Feb 21, 12:00 PM Women's · Cal at SMU | ",
 "Upcoming Feb 25, 6:00 PM Women's · Cal vs Boston College | ",
 "Upcoming Feb 28, 11:00 AM Women's · Cal vs Pitt | ",
 "Upcoming Mar 3 Women's · Cal at ACC Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Cal at USF Invitational | Women's team: 4th / Men's team: 3rd",
 "Final Sep 18 Cal at Saint Mary's Invitational | Women's team: 2nd / Men's team: 3rd",
 "Final Oct 9 Cal at Bill Dellinger Invitational | Women's team: 5th / Men's team: 4th",
 "Upcoming Oct 17 Cal at Bronco Invitational | ",
 "Upcoming Oct 30 Cal at ACC Championships | ",
 "Upcoming Nov 13 Cal at NCAA West Regional Championships | ",
 "Upcoming Nov 21 Cal at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Cal vs American | W, 4-3",
 "Final Aug 30 Cal vs Central Michigan | W, 4-2",
 "Final Sep 6 Cal vs Columbia | W, 4-0",
 "Final Sep 11 Cal at Michigan | W, 1-0",
 "Final Sep 13 Cal at Michigan State | W, 3-2",
 "Final Sep 19 Cal vs Northwestern | L, 0-2",
 "Final Sep 25 Cal vs Louisville | L, 2-3",
 "Final Sep 27 Cal vs North Carolina | L, 0-4",
 "Final Oct 2 Cal at VCU | W, 4-0",
 "Final Oct 4 Cal at Virginia | W, 2-1",
 "Final Oct 9 Cal vs Wake Forest | L, 0-2",
 "Final Oct 11 Cal vs Duke | L, 2-3",
 "Upcoming Oct 18, 1:00 PM Cal at UC Davis | ",
 "Upcoming Oct 23, 1:00 PM Cal at Boston College | ",
 "Upcoming Oct 25, 9:00 AM Cal at Syracuse | ",
 "Upcoming Oct 29, 6:00 PM Cal at Stanford | ",
 "Upcoming Nov 3 Cal at ACC Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Cal vs UCLA | L, 24-45",
 "Final Sep 12 Cal at Syracuse | W, 21-18",
 "Final Sep 19 Cal vs Wagner | W, 49-7",
 "Final Sep 25 Cal vs Clemson | L, 10-24",
 "Final Oct 3 Cal at UNLV | L, 31-39",
 "Final Oct 10 Cal vs Virginia Tech | W, 25-20",
 "Upcoming Oct 17, 7:30 PM Cal vs Wake Forest | ",
 "Upcoming Oct 24, 9:00 AM Cal at SMU | ",
 "Upcoming Oct 31 Cal at NC State | ",
 "Upcoming Nov 14 Cal at Virginia | ",
 "Upcoming Nov 21 Cal vs Stanford | ",
 "Upcoming Nov 28 Cal vs Pittsburgh | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · Cal at Bettie Lou Evans Invitational | Completed",
 "Final Sep 24 Women's · Cal at The Big Match | Completed",
 "Final Oct 5 Women's · Cal at Marilyn Smith Sunflower Invitational | Completed",
 "Upcoming Oct 16 Women's · Cal at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · Cal at Nanea Invitational | ",
 "Upcoming Feb 13 Women's · Cal at Alice and John Wallace Classic | ",
 "Upcoming Feb 22 Women's · Cal at Bruin Wave Invitational | ",
 "Upcoming Mar 9 Women's · Cal at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · Cal at Silicon Valley Showcase | ",
 "Upcoming Apr 15 Women's · Cal at ACC Championship | ",
 "Upcoming May 10 Women's · Cal at NCAA Regionals | ",
 "Upcoming May 21 Women's · Cal at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Cal at Bombs, Darts, & Birds Collegiate | T12th",
 "Final Sep 12 Men's · Cal at Sahalee Players Collegiate | 9th",
 "Final Sep 24 Men's · Cal at Big Match | Completed",
 "Final Oct 4 Men's · Cal at Fighting Irish Classic | 1st",
 "Upcoming Oct 19 Men's · Cal at St. Mary’s Intercollegiate | ",
 "Upcoming Jan 25 Men's · Cal at Southwestern Intercollegiate | ",
 "Upcoming Feb 11 Men's · Cal at John A. Burns Intercollegiate | ",
 "Upcoming Feb 12 Men's · Cal at John A. Burns Intercollegiate | ",
 "Upcoming Feb 28 Men's · Cal at Cabo Collegiate | ",
 "Upcoming Mar 8 Men's · Cal at The Desimone Invitational | ",
 "Upcoming Mar 25 Men's · Cal at The Goodwin | ",
 "Upcoming Apr 12 Men's · Cal at Western Intercollegiate | ",
 "Upcoming Apr 22 Men's · Cal at ACC Championship | ",
 "Upcoming May 17 Men's · Cal at NCAA Regional | ",
 "Upcoming May 28 Men's · Cal at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 8, 7:30 PM Women's · Cal at Central Michigan | ",
 "Upcoming Jan 8, 7:30 PM Women's · Cal at San Jose State | ",
 "Upcoming Jan 8, 7:30 PM Women's · Cal at Alaska | ",
 "Upcoming Jan 15, 7:30 PM Women's · Cal at Clemson | ",
 "Upcoming Jan 31, 2:00 PM Women's · Cal at Pitt | ",
 "Upcoming Feb 12, 7:30 PM Women's · Cal at Stanford | ",
 "Upcoming Mar 5, 7:30 PM Women's · Cal at University of Washington | ",
 "Upcoming Mar 5, 7:30 PM Women's · Cal at San Jose State | ",
 "Upcoming Mar 20 Women's · Cal at ACC Championships | "
]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 18, 9:00 AM Cal vs Oregon (Exhibition) | ",
 "Upcoming Oct 18, 12:00 PM Cal vs Arizona State University (Exhibition) | ",
 "Upcoming Oct 24, 10:00 AM Cal at Stanford (Exhibition) | ",
 "Upcoming Oct 25, 11:00 AM Cal vs UC Davis (Exhibition) | ",
 "Upcoming Oct 30, 7:00 PM Cal at UC Davis (Exhibition) | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Cal vs Cal Baptist | T, 0-0",
 "Final Aug 16 Women's · Cal at Santa Clara | T, 1-1",
 "Final Aug 20 Women's · Cal at Pepperdine | L, 0-1",
 "Final Aug 23 Women's · Cal at San Diego | L, 0-1",
 "Final Aug 29 Women's · Cal vs LMU | W, 2-1",
 "Final Sep 3 Women's · Cal vs Cal Poly | T, 0-0",
 "Final Sep 6 Women's · Cal vs Columbia | W, 2-1",
 "Final Sep 10 Women's · Cal at North Carolina | L, 0-3",
 "Final Sep 17 Women's · Cal vs Wake Forest | L, 1-3",
 "Final Sep 20 Women's · Cal vs Louisville | T, 1-1",
 "Final Sep 24 Women's · Cal at Boston College | W, 1-0",
 "Final Sep 27 Women's · Cal vs Fresno State | W, 2-0",
 "Final Oct 3 Women's · Cal at Duke | T, 1-1",
 "Upcoming Oct 16, 7:00 PM Women's · Cal at Stanford | ",
 "Upcoming Oct 22, 12:00 PM Women's · Cal vs SMU | ",
 "Upcoming Oct 29, 3:00 PM Women's · Cal vs Notre Dame | ",
 "Upcoming Nov 1, 1:00 PM Women's · Cal vs NC State | ",
 "Upcoming Nov 5, 7:00 AM Women's · Cal at Syracuse | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 21 Men's · Cal at Portland | T, 0-0",
 "Final Aug 27 Men's · Cal at Santa Clara | W, 1-0",
 "Final Sep 1 Men's · Cal vs UCLA | T, 2-2",
 "Final Sep 6 Men's · Cal vs North Carolina | T, 2-2",
 "Final Sep 9 Men's · Cal vs Cal State Fullerton | W, 1-0",
 "Final Sep 13 Men's · Cal at Louisville | L, 2-3",
 "Final Sep 16 Men's · Cal at San Francisco | L, 2-3",
 "Final Sep 20 Men's · Cal vs Pittsburgh | L, 1-2",
 "Final Sep 25 Men's · Cal at Pacific | W, 3-0",
 "Final Oct 3 Men's · Cal at Notre Dame | W, 2-0",
 "Final Oct 9 Men's · Cal at Virginia | L, 0-1",
 "Today Oct 14, 3:30 PM Men's · Cal vs Saint Mary's | ",
 "Upcoming Oct 18, 2:00 PM Men's · Cal vs NC State | ",
 "Upcoming Oct 24, 3:00 PM Men's · Cal vs SMU | ",
 "Upcoming Oct 30, 6:00 PM Men's · Cal at Stanford | ",
 "Upcoming Nov 6 Men's · Cal at ACC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Cal vs CSL Match 1 | Completed",
 "Final Oct 9 Women's · Cal at Triton Invitational | Completed",
 "Upcoming Oct 16, 11:00 AM Women's · Cal at Stanford | ",
 "Upcoming Oct 16, 11:00 AM Women's · Cal at NC State | ",
 "Upcoming Oct 16, 5:30 PM Women's · Cal vs CSL Match 2 | ",
 "Upcoming Oct 24 Women's · Cal vs Saint Mary's | ",
 "Upcoming Nov 5 Women's · Cal vs CSL Wild Card | ",
 "Upcoming Nov 6 Women's · Cal at CSL Championship | ",
 "Upcoming Nov 12 Women's · Cal at Trojan Diving Invitational | ",
 "Upcoming Nov 19 Women's · Cal at UGA Midseason Invitational | ",
 "Upcoming Jan 9 Women's · Cal vs UC Davis | ",
 "Upcoming Jan 14 Women's · Cal vs UCLA | ",
 "Upcoming Jan 15 Women's · Cal vs USC | ",
 "Upcoming Jan 16 Women's · Cal at Cal Invite | ",
 "Upcoming Jan 29 Women's · Cal at Stanford | ",
 "Upcoming Feb 16 Women's · Cal at ACC Championships | ",
 "Upcoming Mar 8 Women's · Cal at NCAA Zones | ",
 "Upcoming Mar 17 Women's · Cal at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Cal vs CSL Match 1 | Completed",
 "Final Oct 9 Men's · Cal at Triton Invitational | Completed",
 "Upcoming Oct 16, 11:00 AM Men's · Cal at Stanford | ",
 "Upcoming Oct 16, 11:00 AM Men's · Cal at NC State | ",
 "Upcoming Oct 16, 5:30 PM Men's · Cal vs CSL Match 2 | ",
 "Upcoming Oct 24 Men's · Cal vs Saint Mary's | ",
 "Upcoming Nov 5 Men's · Cal vs CSL Wild Card | ",
 "Upcoming Nov 6 Men's · Cal at CSL Championship | ",
 "Upcoming Nov 12 Men's · Cal at Trojan Diving Invitational | ",
 "Upcoming Nov 19 Men's · Cal at UGA Midseason Invitational | ",
 "Upcoming Jan 15 Men's · Cal vs USC | ",
 "Upcoming Jan 16 Men's · Cal at Cal Invite | ",
 "Upcoming Jan 29 Men's · Cal at Stanford | ",
 "Upcoming Feb 16 Men's · Cal at ACC Championships | ",
 "Upcoming Mar 8 Men's · Cal at NCAA Zones | ",
 "Upcoming Mar 24 Men's · Cal at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Cal at ITA All-American Championships | Completed",
 "Final Sep 23 Women's · Cal at KPSF Open | Completed",
 "Final Oct 1 Women's · Cal at Battle in the Bay Classic | Completed",
 "Final Oct 8 Women's · Cal at ITA Northwest Regional Championships | Completed",
 "Upcoming Oct 30 Women's · Cal at Dennis Rizza Collegiate Invitational | ",
 "Upcoming Nov 5 Women's · Cal at ITA West Sectional Championships | ",
 "Upcoming Nov 17 Women's · Cal at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 13 Men's · Cal at Tiburon ATP Challenger 125 | Completed",
 "Final Sep 19 Men's · Cal at ITA All-American Championships | Completed",
 "Final Sep 23 Men's · Cal at KPSF Open | Completed",
 "Final Sep 25 Men's · Cal at Sherwood Cup | Completed",
 "Final Oct 1 Men's · Cal at Battle in the Bay Classic | Completed",
 "Final Oct 2 Men's · Cal at San Diego Veterans Tennis Classic | Completed",
 "Upcoming Oct 15 Men's · Cal at ITA Northwest Regional Championships | ",
 "Upcoming Oct 30 Men's · Cal at Jack Kramer Invitational | ",
 "Upcoming Nov 5 Men's · Cal at ITA West Sectional Championships | ",
 "Upcoming Nov 17 Men's · Cal at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Cal vs Pacific | W, 3-0",
 "Final Aug 29 Cal vs UC San Diego | W, 3-1",
 "Final Aug 30 Cal at Saint Mary's | L, 2-3",
 "Final Sep 4 Cal vs Loyola Chicago | W, 3-0",
 "Final Sep 5 Cal at Stephen F. Austin | W, 3-2",
 "Final Sep 8 Cal at South Carolina | W, 3-1",
 "Final Sep 12 Cal vs San Diego State | W, 3-2",
 "Final Sep 13 Cal at Santa Clara | W, 3-1",
 "Final Sep 16 Cal at UC Davis | W, 3-2",
 "Final Sep 19 Cal vs Sacramento State | W, 3-2",
 "Final Sep 20 Cal at San José State | W, 3-1",
 "Final Sep 25 Cal at Pitt | L, 0-3",
 "Final Sep 27 Cal at SMU | L, 1-3",
 "Final Oct 2 Cal vs Virginia | W, 3-1",
 "Final Oct 3 Cal vs Virginia Tech | W, 3-1",
 "Final Oct 8 Cal at Louisville | L, 1-3",
 "Final Oct 11 Cal at Notre Dame | W, 3-0",
 "Upcoming Oct 16, 7:00 PM Cal vs NC State | ",
 "Upcoming Oct 18, 1:00 PM Cal vs Wake Forest | ",
 "Upcoming Oct 23, 4:00 PM Cal at North Carolina | ",
 "Upcoming Oct 25, 10:00 AM Cal at Duke | ",
 "Upcoming Oct 28, 7:00 PM Cal vs Stanford | ",
 "Upcoming Oct 30, 7:00 PM Cal at Stanford | ",
 "Upcoming Nov 6, 3:00 PM Cal at Florida State | ",
 "Upcoming Nov 8, 10:00 AM Cal at Miami | ",
 "Upcoming Nov 13, 7:00 PM Cal vs Georgia Tech | ",
 "Upcoming Nov 15, 1:00 PM Cal vs Clemson | ",
 "Upcoming Nov 20, 7:00 PM Cal vs Boston College | ",
 "Upcoming Nov 22, 1:00 PM Cal vs Syracuse | ",
 "Upcoming Nov 25, 1:00 PM Cal vs Notre Dame | ",
 "Upcoming Nov 28, 10:00 AM Cal at Boston College | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Men's · Cal vs UC Santa Barbara | W, 14-9",
 "Final Aug 29 Men's · Cal at UC San Diego | W, 15-11",
 "Final Sep 5 Men's · Cal vs Harvard | W, 16-6",
 "Final Sep 5 Men's · Cal vs San José State | W, 14-10",
 "Final Sep 11 Men's · Cal vs Pacific | W, 18-7",
 "Final Sep 13 Men's · Cal at UC Davis | W, 19-7",
 "Final Sep 18 Men's · Cal vs LMU | W, 20-9",
 "Final Sep 19 Men's · Cal vs UC Irvine | W, 16-8",
 "Final Sep 19 Men's · Cal vs UCLA | L, 10-11",
 "Final Sep 20 Men's · Cal vs USC | L, 12-13",
 "Final Sep 24 Men's · Cal vs Saint Mary's | W, 22-8",
 "Final Oct 3 Men's · Cal at USC | L, 14-15",
 "Final Oct 4 Men's · Cal at UCLA | L, 11-13",
 "Upcoming Oct 17, 1:00 PM Men's · Cal vs Stanford | ",
 "Upcoming Oct 21, 6:00 PM Men's · Cal vs Princeton | ",
 "Upcoming Oct 23, 1:00 PM Men's · Cal vs Pepperdine | ",
 "Upcoming Oct 31, 1:00 PM Men's · Cal vs UCLA | ",
 "Upcoming Nov 1, 1:00 PM Men's · Cal vs USC | ",
 "Upcoming Nov 6, 7:00 PM Men's · Cal vs Fordham | ",
 "Upcoming Nov 13, 6:00 PM Men's · Cal at Stanford | ",
 "Upcoming Nov 20 Men's · Cal at MPSF Championships | ",
 "Upcoming Dec 3 Men's · Cal at NCAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
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
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
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
  const archive=`https://calbears.com/sports/${slug}/archives`;recapFixtures.set(archive,saved(archive));
  for(const [path] of saved(archive).replace(/\\u002F/gi,'/').matchAll(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)){const body=saved(`https://calbears.com${path}`);if(body)recapFixtures.set(`https://calbears.com${path}`,body);}
};
const h=worker.californiaHandlers;

// Cross Country: one page for both teams; each meet's TFRRS page gives both
// team places.
{
  fromTfrrs(CALIFORNIA_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.title,e.headline,Boolean(e.meet_results_verified)]),[["Cal at USF Invitational","Women's team: 4th / Men's team: 3rd",false],["Cal at Saint Mary's Invitational","Women's team: 2nd · 69 pts / Men's team: 3rd · 95 pts",true],["Cal at Bill Dellinger Invitational","Women's team: 5th · 133 pts / Men's team: 4th · 126 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Golf: the cards publish few places ("T-12" without a suffix is T12th); the
// final story's headline gives the others ("Bears Tie for Third at ...",
// "Bears Take Third Place At ..."); a round's standing gives none. The
// women's Big Match card (Sep 24) links the men's story: with no story and no
// place it is not listed.
{
  const title=name=>fixture(`${name}.html.gz`).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)[1];
  assert.deepEqual(['recap-2026-9-22-womens-golf-bears-tie-for-third-at-betti','recap-2026-10-6-womens-golf-bears-take-third-place-at-ma','recap-2026-9-24-mens-golf-cal-falls-in-the-big-match','recap-2026-9-7-mens-golf-alzas-leads-bears-after-day-on','story-2026-10-4-mens-golf-bears-take-the-lead-after-day-'].map(name=>californiaGolfStoryPlace(title(name))),["T3rd","3rd",null,null,null]);
  const listed=[];
  for(const slug of ['womens-golf','mens-golf']){
    fromArchive(slug);
    for(const [path] of saved(`https://calbears.com/sports/${slug}/archives`).matchAll(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g))void path;
    for(const event of parse('Golf',slug).filter(e=>e.status==='Final')){
      if(event.recap_url&&!recapFixtures.has(event.recap_url))recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
      if(h.isFinalWithoutStory(event))await h.attachArchiveStory(event);
      if(h.isCaliforniaGolf(event))await h.attachGolfPlace(event);
      if(!h.isGolfWithoutStory(event))listed.push(line(event));
    }
  }
  assert.deepEqual(listed,["Final Sep 21 Women's · Cal at Bettie Lou Evans Invitational | T3rd","Final Oct 5 Women's · Cal at Marilyn Smith Sunflower Invitational | 3rd","Final Sep 7 Men's · Cal at Bombs, Darts, & Birds Collegiate | T12th","Final Sep 12 Men's · Cal at Sahalee Players Collegiate | 9th","Final Sep 24 Men's · Cal at Big Match | Completed","Final Oct 4 Men's · Cal at Fighting Irish Classic | 1st"]);
  recapFixtures.clear();requests.length=0;
}

// Volleyball: three finals link no story. Saint Mary's (Aug 30) and South
// Carolina (Sep 8) take theirs from the archive by the set scores and the
// match score; the SMU story (Sep 27) gives no score at all, so the one
// story that day naming SMU in its address is the match's.
{
  fromArchive('womens-volleyball');
  const missing=parse('Volleyball','womens-volleyball').filter(e=>e.status==='Final'&&!e.recap_url);
  for(const event of missing)await h.attachArchiveStory(event);
  assert.deepEqual(missing.map(e=>[e.opponent,e.recap_url?.replace(/^.*\/news\//,'')||null]),[["Saint Mary's","2026/8/30/volleyball-cal-drops-final-match-of-gael-bear-classic-despite-historic-showing-from-cari-bohm"],["South Carolina","2026/9/8/volleyball-cal-takes-down-south-carolina-in-columbia-for-showdown-at-the-net-victory"],["SMU","2026/9/27/volleyball-cal-unable-to-pull-off-upset-against-no-5-smu"]]);
  recapFixtures.clear();requests.length=0;
}

// Names: "(exhib.)" (men's basketball) and a leading "vs." (lacrosse's fall
// exhibitions) read as K-State's "(Exhibition)".
assert.deepEqual([...parse('Basketball','mens-basketball'),...parse('Lacrosse','womens-lacrosse')].filter(e=>/Exhibition/.test(e.opponent)).map(e=>e.opponent),["LMU (Exhibition)","Oregon State (Exhibition)","Oregon (Exhibition)","Arizona State University (Exhibition)","Stanford (Exhibition)","UC Davis (Exhibition)","UC Davis (Exhibition)"]);

// A season not yet published is SIDEARM's empty template ("@season @sport
// Schedule", beach volleyball): a valid empty schedule, not a failed source.
{
  const raw=fixture('beach-volleyball-schedule.html.gz'),url=page('beach-volleyball');
  const events=h.parseSchedule(raw,school,'Beach Volleyball',url,now);
  assert.deepEqual([events,h.isEmptySchedule(events)],[[],true]);
}

// Records equal the published ones.
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?[own.conference.name,own.conference.text].join(' '):null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey'],['Water Polo','mens-water-polo']].map(([sport,slug])=>records(sport,slug)),[["3-3","ACC 2-1"],["13-4","ACC 3-3"],["4-4-5","ACC 1-2-2"],["4-4-3","ACC 1-3-1"],["7-5","ACC 1-4"],["9-4","MPSF 0-2"]]);
}

// Gymnastics: the rosters publish no athlete portraits or Instagram; three
// official profile cards fill the slots without a portrait (initials).
{
  recapFixtures.set('https://calbears.com/sports/womens-gymnastics/roster',fixture('womens-gymnastics-roster.html.gz'));
  const athletes=await worker.featuredAthletes('california','Gymnastics');
  assert.equal(athletes.length,3);
  assert.ok(athletes.every(a=>a.instagram_url===null&&a.image_url===null&&a.profile_url.startsWith('https://calbears.com/sports/womens-gymnastics/roster/')));
  recapFixtures.clear();requests.length=0;
}

// Accented letters by name: the basketball roster's "Mantas Ko&ccaron;anas".
assert.deepEqual(['Mantas Ko&ccaron;anas','Jos&eacute; Mu&ntilde;oz','&Aring;sa'].map(worker.decodeHtml),['Mantas Kočanas','José Muñoz','Åsa']);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('California module checks passed');
