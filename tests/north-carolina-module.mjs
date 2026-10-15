import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northCarolinaSchool} from '../src/schools/north-carolina.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='north-carolina');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northCarolinaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/north-carolina-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goheels.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['north-carolina'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',northCarolinaSchool.scheduleUrls],['roster',northCarolinaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('north-carolina|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goheels.com',`${key} must stay on goheels.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goheels.com/sports/baseball/schedule"],"roster":["https://goheels.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goheels.com/sports/mens-basketball/schedule","https://goheels.com/sports/womens-basketball/schedule"],"roster":["https://goheels.com/sports/mens-basketball/roster","https://goheels.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goheels.com/sports/cross-country/schedule"],"roster":["https://goheels.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://goheels.com/sports/fencing/schedule"],"roster":["https://goheels.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://goheels.com/sports/field-hockey/schedule"],"roster":["https://goheels.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goheels.com/sports/football/schedule"],"roster":["https://goheels.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goheels.com/sports/womens-golf/schedule","https://goheels.com/sports/mens-golf/schedule"],"roster":["https://goheels.com/sports/womens-golf/roster","https://goheels.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://goheels.com/sports/womens-gymnastics/schedule"],"roster":["https://goheels.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://goheels.com/sports/womens-lacrosse/schedule","https://goheels.com/sports/mens-lacrosse/schedule"],"roster":["https://goheels.com/sports/womens-lacrosse/roster","https://goheels.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goheels.com/sports/womens-rowing/schedule"],"roster":["https://goheels.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://goheels.com/sports/womens-soccer/schedule","https://goheels.com/sports/mens-soccer/schedule"],"roster":["https://goheels.com/sports/womens-soccer/roster","https://goheels.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goheels.com/sports/softball/schedule"],"roster":["https://goheels.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goheels.com/sports/swimming-and-diving/schedule"],"roster":["https://goheels.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goheels.com/sports/womens-tennis/schedule","https://goheels.com/sports/mens-tennis/schedule"],"roster":["https://goheels.com/sports/womens-tennis/roster","https://goheels.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goheels.com/sports/track-and-field/schedule"],"roster":["https://goheels.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goheels.com/sports/womens-volleyball/schedule"],"roster":["https://goheels.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://goheels.com/sports/wrestling/schedule"],"roster":["https://goheels.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'north-carolina|"+sport+"':"),`${sport} routes must live in the North Carolina module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://goheels.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northCarolinaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=north-carolina)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 9 Men's · UNC vs Southern California (Exhibition) | W, 88-70",
 "Upcoming Oct 18, 5:00 PM Men's · UNC vs Indiana (Exhibition) | ",
 "Upcoming Oct 27, 7:30 PM Men's · UNC vs Charlotte (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · UNC vs Western Carolina | ",
 "Upcoming Nov 6, 7:00 PM Men's · UNC vs Wofford | ",
 "Upcoming Nov 10, 7:00 PM Men's · UNC vs Wyoming | ",
 "Upcoming Nov 13, 7:00 PM Men's · UNC vs Georgia | ",
 "Upcoming Nov 20, 9:00 PM Men's · UNC vs Marshall | ",
 "Upcoming Nov 23, 8:00 PM Men's · UNC vs Monmouth | ",
 "Upcoming Nov 27, 7:00 PM Men's · UNC vs West Virginia | ",
 "Upcoming Dec 1, 7:30 PM Men's · UNC vs Arkansas | ",
 "Upcoming Dec 6, 3:00 PM Men's · UNC vs Butler | ",
 "Upcoming Dec 12, 12:00 PM Men's · UNC at Georgetown | ",
 "Upcoming Dec 15, 7:00 PM Men's · UNC vs NC State | ",
 "Upcoming Dec 19, 2:30 PM Men's · UNC vs Kentucky | ",
 "Upcoming Dec 21, 8:00 PM Men's · UNC vs The Citadel | ",
 "Upcoming Dec 30, 4:00 PM Men's · UNC vs Cal | ",
 "Upcoming Jan 2, 4:00 PM Men's · UNC at Boston College | ",
 "Upcoming Jan 5, 9:00 PM Men's · UNC at Louisville | ",
 "Upcoming Jan 9, 12:00 PM Men's · UNC vs NC State | ",
 "Upcoming Jan 13, 7:00 PM Men's · UNC at Florida State | ",
 "Upcoming Jan 16, 2:15 PM Men's · UNC vs Stanford | ",
 "Upcoming Jan 19, 9:00 PM Men's · UNC vs Virginia | ",
 "Upcoming Jan 23, 12:00 PM Men's · UNC at Syracuse | ",
 "Upcoming Jan 26, 7:00 PM Men's · UNC vs SMU | ",
 "Upcoming Jan 30 Men's · UNC vs Illinois | ",
 "Upcoming Feb 2, 7:00 PM Men's · UNC at Notre Dame | ",
 "Upcoming Feb 6, 2:15 PM Men's · UNC vs Georgia Tech | ",
 "Upcoming Feb 8, 6:00 PM Men's · UNC vs Louisville | ",
 "Upcoming Feb 13, 5:30 PM Men's · UNC at Duke | ",
 "Upcoming Feb 20, 7:00 PM Men's · UNC at Wake Forest | ",
 "Upcoming Feb 22, 7:00 PM Men's · UNC vs Miami | ",
 "Upcoming Feb 27, 7:00 PM Men's · UNC at Virginia Tech | ",
 "Upcoming Mar 2, 9:00 PM Men's · UNC at Pitt | ",
 "Upcoming Mar 6 Men's · UNC vs Duke | ",
 "Upcoming Mar 9 Men's · UNC at ACC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 18, 1:00 PM Women's · UNC vs Davidson (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Women's · UNC at Maryland (Exhibition) | ",
 "Upcoming Nov 2, 2:30 PM Women's · UNC vs Oklahoma | ",
 "Upcoming Nov 8, 5:30 PM Women's · UNC vs South Carolina | ",
 "Upcoming Nov 11, 7:00 PM Women's · UNC vs NC Central | ",
 "Upcoming Nov 14, 4:00 PM Women's · UNC at Penn | ",
 "Upcoming Nov 19, 6:00 PM Women's · UNC vs Texas Tech | ",
 "Upcoming Nov 21, 5:00 PM Women's · UNC vs Alabama | ",
 "Upcoming Nov 24, 7:00 PM Women's · UNC vs Gardner-Webb | ",
 "Upcoming Nov 27, 7:00 PM Women's · UNC vs Army | ",
 "Upcoming Nov 29, 4:00 PM Women's · UNC vs Brown | ",
 "Upcoming Dec 2, 7:15 PM Women's · UNC vs LSU | ",
 "Upcoming Dec 6, 2:00 PM Women's · UNC vs Elon | ",
 "Upcoming Dec 9, 11:00 AM Women's · UNC vs Winthrop | ",
 "Upcoming Dec 13, 6:00 PM Women's · UNC vs NC State | ",
 "Upcoming Dec 17, 6:00 PM Women's · UNC vs Georgia Tech | ",
 "Upcoming Dec 21, 4:00 PM Women's · UNC vs Norfolk State | ",
 "Upcoming Dec 28, 8:00 PM Women's · UNC vs UNCW | ",
 "Upcoming Dec 31, 6:00 PM Women's · UNC at Syracuse | ",
 "Upcoming Jan 3, 2:00 PM Women's · UNC at Clemson | ",
 "Upcoming Jan 7, 8:00 PM Women's · UNC vs Wake Forest | ",
 "Upcoming Jan 10, 3:00 PM Women's · UNC at Louisville | ",
 "Upcoming Jan 17, 6:00 PM Women's · UNC vs Boston College | ",
 "Upcoming Jan 21, 8:00 PM Women's · UNC at Cal | ",
 "Upcoming Jan 24, 2:00 PM Women's · UNC at Stanford | ",
 "Upcoming Jan 28, 6:00 PM Women's · UNC vs Notre Dame | ",
 "Upcoming Jan 31, 5:00 PM Women's · UNC vs Duke | ",
 "Upcoming Feb 4, 7:00 PM Women's · UNC at Miami | ",
 "Upcoming Feb 7, 2:00 PM Women's · UNC vs Virginia Tech | ",
 "Upcoming Feb 14, 2:00 PM Women's · UNC at SMU | ",
 "Upcoming Feb 18, 6:00 PM Women's · UNC at Pitt | ",
 "Upcoming Feb 21, 12:00 PM Women's · UNC vs Florida State | ",
 "Upcoming Feb 25, 8:00 PM Women's · UNC vs Virginia | ",
 "Upcoming Feb 28, 4:00 PM Women's · UNC at Duke | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 UNC at Virginia Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 26 UNC at Princeton Meadows Challenge | Women's team: 2nd / Men's team: 5th",
 "Upcoming Oct 16, 10:00 AM UNC at Pre-National Invitational | ",
 "Upcoming Oct 30, 9:40 AM UNC at ACC Championship | ",
 "Upcoming Nov 13, 10:00 AM UNC at NCAA Southeast Regional | ",
 "Upcoming Nov 21, 10:20 AM UNC at NCAA Championship | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Final Oct 9 UNC at October NAC | Completed",
 "Upcoming Nov 7, 8:00 AM UNC at Duke | ",
 "Upcoming Nov 14, 8:00 AM UNC at Elite Invitational | ",
 "Upcoming Nov 20, 8:00 AM UNC at November NAC | ",
 "Upcoming Jan 8, 8:00 AM UNC at Junior Olympics | ",
 "Upcoming Jan 17, 8:00 AM UNC at JHU Duals | ",
 "Upcoming Jan 23, 8:00 AM UNC at Penn State Duals | ",
 "Upcoming Feb 6, 8:00 AM UNC at Beguinet Classic | ",
 "Upcoming Feb 7, 8:00 AM UNC at Miller Classic | ",
 "Upcoming Feb 12, 8:00 AM UNC at February NAC | ",
 "Upcoming Feb 20, 8:00 AM UNC at ACC Championships | ",
 "Upcoming Mar 13, 8:00 AM UNC at NCAA Regionals | ",
 "Upcoming Mar 25, 8:00 AM UNC at NCAA Championships | ",
 "Upcoming Apr 16, 8:00 AM UNC at April NAC | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 UNC vs Michigan | L, 1-2",
 "Final Aug 30 UNC vs Iowa | L, 2-3",
 "Final Sep 4 UNC vs Penn | W, 7-0",
 "Final Sep 6 UNC vs Princeton | W, 1-0",
 "Final Sep 11 UNC vs Old Dominion | L, 4-5",
 "Final Sep 13 UNC at Richmond | W, 2-1",
 "Final Sep 20 UNC vs Virginia | L, 1-2",
 "Final Sep 25 UNC at Stanford | W, 8-1",
 "Final Sep 27 UNC at Cal | W, 4-0",
 "Final Oct 2 UNC at Louisville | W, 3-0",
 "Final Oct 9 UNC at Saint Joseph's | W, 8-0",
 "Final Oct 11 UNC at Liberty | L, 1-2",
 "Upcoming Oct 16, 6:00 PM UNC vs Boston College | ",
 "Upcoming Oct 18, 2:00 PM UNC vs Syracuse | ",
 "Upcoming Oct 23, 6:00 PM UNC vs Wake Forest | ",
 "Upcoming Oct 25, 1:00 PM UNC at App State | ",
 "Upcoming Oct 30, 6:00 PM UNC at Duke | ",
 "Upcoming Nov 3 UNC at ACC Championship | ",
 "Upcoming Nov 13 UNC at NCAA First Round | ",
 "Upcoming Nov 15 UNC at NCAA Second Round | ",
 "Upcoming Nov 20 UNC at Final Four | ",
 "Upcoming Nov 22 UNC at National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 UNC vs TCU | W, 15-10",
 "Final Sep 12 UNC vs East Tennessee State | W, 35-3",
 "Final Sep 19 UNC at Clemson | L, 20-28",
 "Final Oct 3 UNC vs Notre Dame | L, 26-37",
 "Final Oct 10 UNC at Pitt | W, 21-17",
 "Upcoming Oct 17, 3:30 PM UNC at Duke | ",
 "Upcoming Oct 24, 7:30 PM UNC vs Syracuse | ",
 "Upcoming Oct 31 UNC vs Miami | ",
 "Upcoming Nov 7, 12:00 PM UNC at UConn | ",
 "Upcoming Nov 14 UNC vs Louisville | ",
 "Upcoming Nov 21 UNC at Virginia | ",
 "Upcoming Nov 28 UNC vs NC State | ",
 "Upcoming Dec 5, 12:00 PM UNC at ACC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · UNC at ANNIKA Intercollegiate presented by 3M | Completed",
 "Final Sep 18 Women's · UNC at Mason Rudolph Championship | Completed",
 "Upcoming Oct 16 Women's · UNC at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 23 Women's · UNC at Landfall Tradition | ",
 "Upcoming Jan 31 Women's · UNC at Therese Hession Regional Challenge | ",
 "Upcoming Feb 8 Women's · UNC at Thunderbird Intercollegiate | ",
 "Upcoming Mar 6 Women's · UNC at Florida Gators Invitational | ",
 "Upcoming Mar 15 Women's · UNC at Briar's Creek Invitational | ",
 "Upcoming Apr 4 Women's · UNC at Carolina Challenge Cup | ",
 "Upcoming Apr 15 Women's · UNC at ACC Championship | ",
 "Upcoming May 10 Women's · UNC at NCAA Regional | ",
 "Upcoming May 21 Women's · UNC at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · UNC at Visit Knoxville Collegiate | Completed",
 "Final Sep 12 Men's · UNC at Sahalee Players Championship | Completed",
 "Final Sep 28 Men's · UNC at Ben Hogan Collegiate Invitational presented by Charles Schwab | Completed",
 "Final Oct 4 Men's · UNC at Fighting Irish Classic | Completed",
 "Upcoming Oct 18 Men's · UNC at The Williams Cup presented by STITCH Golf | ",
 "Upcoming Feb 4 Men's · UNC at Amer Ari Invitational | ",
 "Upcoming Mar 6 Men's · UNC at John Hayt Collegiate Invitational | ",
 "Upcoming Mar 22 Men's · UNC at Valspar Collegiate | ",
 "Upcoming Apr 3 Men's · UNC at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 10 Men's · UNC at Tar Heel Intercollegiate | ",
 "Upcoming Apr 22 Men's · UNC at ACC Championship | ",
 "Upcoming May 17 Men's · UNC at NCAA Regional | ",
 "Upcoming May 28 Men's · UNC at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24, 10:00 AM Women's · UNC vs Ohio State (Exhibition) | ",
 "Upcoming Oct 24, 12:30 PM Women's · UNC vs Davidson (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UNC vs Fairfield | W, 4-0",
 "Final Aug 16 Women's · UNC vs Quinnipiac | W, 8-0",
 "Final Aug 20 Women's · UNC at Arkansas | W, 2-0",
 "Final Aug 23 Women's · UNC vs Michigan State | L, 2-3",
 "Final Aug 28 Women's · UNC at Shelbourne FC (Exhibition) | W, 3-0",
 "Final Sep 3 Women's · UNC at Arizona | W, 2-1",
 "Final Sep 6 Women's · UNC at Arizona State | W, 1-0",
 "Final Sep 10 Women's · UNC vs Cal | W, 3-0",
 "Final Sep 13 Women's · UNC vs New Jersey Institute of Technology | W, 5-0",
 "Final Sep 17 Women's · UNC vs Duke | W, 4-2",
 "Final Sep 20 Women's · UNC vs Alcorn State | W, 5-0",
 "Final Sep 25 Women's · UNC at Virginia | W, 3-1",
 "Final Oct 2 Women's · UNC vs Notre Dame | W, 4-1",
 "Today Oct 15, 8:00 PM Women's · UNC at Clemson | ",
 "Upcoming Oct 18, 3:30 PM Women's · UNC at Wake Forest | ",
 "Upcoming Oct 23, 6:00 PM Women's · UNC vs Stanford | ",
 "Upcoming Oct 29, 7:00 PM Women's · UNC vs SMU | ",
 "Upcoming Nov 5, 7:00 PM Women's · UNC at Louisville | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UNC at Georgetown | T, 1-1",
 "Final Aug 24 Men's · UNC at Memphis | L, 2-3",
 "Final Aug 28 Men's · UNC vs VCU | W, 1-0",
 "Final Sep 6 Men's · UNC at Cal | T, 2-2",
 "Final Sep 11 Men's · UNC vs Stanford | T, 2-2",
 "Final Sep 15 Men's · UNC vs American | W, 2-0",
 "Final Sep 19 Men's · UNC vs Clemson | L, 1-2",
 "Final Sep 26 Men's · UNC vs Lipscomb | W, 3-1",
 "Final Sep 30 Men's · UNC vs West Florida | W, 2-0",
 "Final Oct 3 Men's · UNC at Boston College | W, 3-1",
 "Final Oct 10 Men's · UNC vs Notre Dame | W, 7-1",
 "Upcoming Oct 16, 7:00 PM Men's · UNC at Pittsburgh | ",
 "Upcoming Oct 23, 8:00 PM Men's · UNC at Duke | ",
 "Upcoming Oct 27, 6:00 PM Men's · UNC vs William & Mary | ",
 "Upcoming Oct 30, 7:00 PM Men's · UNC vs NC State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23 UNC vs Florida Vibe (Exhibition) | ",
 "Upcoming Oct 25 UNC vs Barton (Exhibition) (Game 1) | ",
 "Upcoming Oct 25 UNC vs Barton (Exhibition) (Game 2) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 UNC at Queens University of Charlotte | Men's team: W, 149-108 / Women's team: W, 156-101",
 "Upcoming Oct 16, 4:00 PM UNC vs Duke | ",
 "Upcoming Oct 23 UNC vs Tulane (Women's Diving) | ",
 "Upcoming Nov 5, 3:00 PM UNC at Virginia Tech | ",
 "Upcoming Nov 17 UNC at Tennessee Invitational | ",
 "Upcoming Dec 2 UNC at U.S. Open Championships | ",
 "Upcoming Dec 9 UNC at U.S. Diving Nationals | ",
 "Upcoming Jan 15, 4:00 PM UNC at NC State | ",
 "Upcoming Feb 4, 5:00 PM UNC at UNC Invitational | ",
 "Upcoming Feb 5 UNC at VT Diving Invite | ",
 "Upcoming Feb 16 UNC at ACC Swimming & Diving Championships | ",
 "Upcoming Mar 7 UNC at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 UNC at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 UNC at NCAA Men's Swimming and Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · UNC at Kitty Harrison Invitational | Completed",
 "Final Sep 11 Women's · UNC at Milwaukee Tennis Classic | Completed",
 "Final Sep 19 Women's · UNC at ITA All-American Championships | Completed",
 "Final Oct 10 Women's · UNC at ITA Hall of Fame Classic | Completed",
 "Today Oct 15 Women's · UNC at ITA Regionals | ",
 "Upcoming Oct 23 Women's · UNC at Rome Tennis Center Collegiate Invite | ",
 "Upcoming Nov 6 Women's · UNC at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · UNC at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · UNC at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · UNC at ITA Carolina Regional | Completed",
 "Upcoming Oct 23 Men's · UNC at Wake Forest Invite | ",
 "Upcoming Oct 26 Men's · UNC at Norman ITF | ",
 "Upcoming Oct 30 Men's · UNC at Hokie Invitational | ",
 "Upcoming Nov 5 Men's · UNC at ITA East Sectionals | ",
 "Upcoming Nov 9 Men's · UNC at Columbus ITF | ",
 "Upcoming Nov 9 Men's · UNC at Naples ITF | ",
 "Upcoming Nov 17 Men's · UNC at NCAA Singles & Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 UNC at Davidson | W, 3-0",
 "Final Aug 30 UNC vs UNCW | W, 3-0",
 "Final Sep 3 UNC vs James Madison | W, 3-1",
 "Final Sep 4 UNC vs Colorado State | W, 3-2",
 "Final Sep 9 UNC at Kentucky | L, 0-3",
 "Final Sep 13 UNC vs Vanderbilt | L, 1-3",
 "Final Sep 18 UNC at Nebraska | L, 1-3",
 "Final Sep 19 UNC vs FGCU | W, 3-1",
 "Final Sep 25 UNC at NC State | W, 3-1",
 "Final Sep 27 UNC at Wake Forest | W, 3-2",
 "Final Oct 2 UNC vs Clemson | W, 3-0",
 "Final Oct 4 UNC vs Georgia Tech | W, 3-2",
 "Final Oct 9 UNC at Virginia Tech | W, 3-0",
 "Final Oct 11 UNC at Virginia | W, 3-0",
 "Upcoming Oct 16, 6:30 PM UNC at Notre Dame | ",
 "Upcoming Oct 18, 1:00 PM UNC at Louisville | ",
 "Upcoming Oct 23, 7:00 PM UNC vs California | ",
 "Upcoming Oct 25, 8:30 PM UNC vs Stanford | ",
 "Upcoming Oct 30, 7:00 PM UNC vs Syracuse | ",
 "Upcoming Nov 1, 2:00 PM UNC vs Boston College | ",
 "Upcoming Nov 6, 12:00 PM UNC at SMU | ",
 "Upcoming Nov 8, 1:00 PM UNC at Pitt | ",
 "Upcoming Nov 12, 6:30 PM UNC at Duke | ",
 "Upcoming Nov 15, 1:00 PM UNC vs Duke | ",
 "Upcoming Nov 20, 7:00 PM UNC vs Miami | ",
 "Upcoming Nov 22, 1:00 PM UNC vs Florida State | ",
 "Upcoming Nov 25, 7:00 PM UNC vs Louisville | ",
 "Upcoming Nov 27, 1:00 PM UNC at Miami | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 UNC at Southeast Open | ",
 "Upcoming Nov 15 UNC at Mountaineer Invitational | ",
 "Upcoming Nov 21, 3:00 PM UNC vs Northern Iowa | ",
 "Upcoming Dec 12 UNC at National Duals Invitational | ",
 "Upcoming Dec 18 UNC vs South Dakota State | ",
 "Upcoming Dec 20, 2:00 PM UNC vs App State | ",
 "Upcoming Jan 2 UNC at Soldier Salute | ",
 "Upcoming Jan 8, 7:00 PM UNC at Pitt | ",
 "Upcoming Jan 9, 7:00 PM UNC at West Virginia | ",
 "Upcoming Jan 15, 7:00 PM UNC vs Virginia | ",
 "Upcoming Jan 22, 10:00 PM UNC at Stanford | ",
 "Upcoming Jan 29, 7:00 PM UNC vs NC State | ",
 "Upcoming Feb 5, 7:00 PM UNC vs Virginia Tech | ",
 "Upcoming Feb 12, 7:00 PM UNC at Duke | ",
 "Upcoming Feb 20, 3:00 PM UNC vs Campbell | ",
 "Upcoming Mar 6 UNC at ACC Championships | ",
 "Upcoming Mar 18 UNC at NCAA Championships | "
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
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Golf: the cards publish no place; each final takes it from its story
// (the kit's createGolfStoryPlace). North Carolina's stories have no
// dateline: the place is in the text after the byline ("North Carolina men's
// golf tied for sixth place", "the Tar Heels, who placed eighth"), or in a
// headline crediting players ("... Leads UNC To 4th-Place Finish"). A
// player's place ("North Carolina's Reagan Southerland tied for eighth") is
// not the team's.
{
  const h=worker.northCarolinaHandlers,listed=[];
  const story=url=>{try{return fixture(recapFile(url));}catch{return fixture(recapFile(url).replace(/^recap-/,'story-'));}};
  // A final whose card links no story takes the archive's (the Colonial,
  // Sep 28-29: "Tar Heels Tie For 3rd At Colonial").
  for(const slug of ['womens-golf','mens-golf']){
    const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://goheels.com/sports/${slug}/archives`,listing);
    for(const path of new Set(listing.match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){try{recapFixtures.set(`https://goheels.com${path}`,story(`https://goheels.com${path}`));}catch{}}
  }
  for(const slug of ['womens-golf','mens-golf'])for(const event of parse('Golf',slug).filter(e=>e.status==='Final')){
    if(event.recap_url)recapFixtures.set(event.recap_url,story(event.recap_url));
    if(h.isFinalWithoutStory(event))await h.attachArchiveStory(event);
    if(h.isGolfAwaitingPlace(event))await h.attachGolfPlace(event);
    if(!h.isGolfWithoutStory(event))listed.push(line(event));
  }
  assert.deepEqual(listed,["Final Sep 7 Women's · UNC at ANNIKA Intercollegiate presented by 3M | 8th","Final Sep 18 Women's · UNC at Mason Rudolph Championship | 8th","Final Aug 31 Men's · UNC at Visit Knoxville Collegiate | T3rd","Final Sep 12 Men's · UNC at Sahalee Players Championship | T6th","Final Sep 28 Men's · UNC at Ben Hogan Collegiate Invitational presented by Charles Schwab | T3rd","Final Oct 4 Men's · UNC at Fighting Irish Classic | 4th"]);
  recapFixtures.clear();requests.length=0;
  // The rules alone, with the team pattern of the module.
  const team="(?:Tar Heels|North Carolina(?!['’]s)|UNC)",place=html=>golfStoryPlace(html,{team,decode:worker.decodeHtml});
  const page=(title,description,text)=>`<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><body>Menu NEWS - Latest By: Staff ${text}</body>`;
  assert.equal(place(page('Round Of The Day Leads UNC To 4th-Place Finish At Fighting Irish Classic','','')),'4th');
  assert.equal(place(page('Bertagnole Shines','','The Tar Heels used a strong final round to climb two spots into a tie for third at 9-under 831.')),'T3rd');
  assert.equal(place(page('Top-25s At Mason Rudolph','','The Tar Heels shot rounds of 294-289-291 for 22-over 874 to place eighth in the 15-team field.')),'8th');
  assert.equal(place(page('Southerland Ties For 8th','North Carolina\'s Reagan Southerland tied for eighth','Southerland finished 1-under 215 to lead the Tar Heels, who placed eighth at 26-over 290.')),'8th');
  assert.equal(place(page('Tar Heels Third','','North Carolina men\'s golf tied for third place Tuesday.')),'T3rd');
  assert.equal(place(page('Player Wins','','North Carolina\'s Reagan Southerland tied for eighth.')),null);
  // The summary is read whole (to its own closing quote) and ends before the
  // story: neither runs into a player's place.
  assert.equal(place(page('Player Wins',"North Carolina's star led the way",'Reagan Southerland tied for 8th individually.')),null);
  assert.equal(place(page('Player Wins','The Tar Heels were led by Southerland','Southerland tied for 8th individually.')),null);
  assert.equal(place(page('Round Three',"Sheils Donegan's 68 helped the Tar Heels finish in 4th.",'')),'4th');
}

// Swimming writes each team's dual with a letter: "M: 149-108 | W: 156-101"
// (at Queens, Sep 25); fencing's October NAC (three day cards) is one meet.
assert.deepEqual(parse('Swimming & Diving','swimming-and-diving').filter(e=>e.status==='Final').map(line),["Final Sep 25 UNC at Queens University of Charlotte | Men's team: W, 149-108 / Women's team: W, 156-101"]);
assert.deepEqual(parse('Fencing','fencing').filter(e=>/October NAC/.test(e.title)).map(e=>[line(e),e.end_time]),[["Final Oct 9 UNC at October NAC | Completed","2026-10-11T23:59:59Z"]]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('North Carolina module checks passed');
