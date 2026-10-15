import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {louisvilleSchool} from '../src/schools/louisville.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='louisville');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,louisvilleHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/louisville-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gocards.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['louisville'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',louisvilleSchool.scheduleUrls],['roster',louisvilleSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('louisville|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gocards.com',`${key} must stay on gocards.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gocards.com/sports/baseball/schedule"],"roster":["https://gocards.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gocards.com/sports/mens-basketball/schedule","https://gocards.com/sports/womens-basketball/schedule"],"roster":["https://gocards.com/sports/mens-basketball/roster","https://gocards.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gocards.com/sports/cross-country/schedule"],"roster":["https://gocards.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://gocards.com/sports/field-hockey/schedule"],"roster":["https://gocards.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://gocards.com/sports/football/schedule"],"roster":["https://gocards.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gocards.com/sports/womens-golf/schedule","https://gocards.com/sports/mens-golf/schedule"],"roster":["https://gocards.com/sports/womens-golf/roster","https://gocards.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gocards.com/sports/womens-lacrosse/schedule"],"roster":["https://gocards.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://gocards.com/sports/womens-rowing/schedule"],"roster":["https://gocards.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gocards.com/sports/womens-soccer/schedule","https://gocards.com/sports/mens-soccer/schedule"],"roster":["https://gocards.com/sports/womens-soccer/roster","https://gocards.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gocards.com/sports/softball/schedule"],"roster":["https://gocards.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gocards.com/sports/swimming-and-diving/schedule"],"roster":["https://gocards.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gocards.com/sports/womens-tennis/schedule","https://gocards.com/sports/mens-tennis/schedule"],"roster":["https://gocards.com/sports/womens-tennis/roster","https://gocards.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gocards.com/sports/track-and-field/schedule"],"roster":["https://gocards.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gocards.com/sports/womens-volleyball/schedule"],"roster":["https://gocards.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'louisville|"+sport+"':"),`${sport} routes must live in the Louisville module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://gocards.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.louisvilleHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=louisville)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Jul 28 Men's · Louisville vs Bahamas Raw Talent (Exhibition) | W, 101-52",
 "Upcoming Oct 21, 7:00 PM Men's · Louisville at Kansas (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · Louisville vs Mercyhurst (Exhibition) | ",
 "Upcoming Nov 2, 9:00 PM Men's · Louisville vs Chattanooga | ",
 "Upcoming Nov 7, 12:00 PM Men's · Louisville vs Morehead State | ",
 "Upcoming Nov 15, 1:00 PM Men's · Louisville at Memphis | ",
 "Upcoming Nov 19, 8:00 PM Men's · Louisville vs Stetson | ",
 "Upcoming Nov 24, 8:00 PM Men's · Louisville vs Texas Tech | ",
 "Upcoming Nov 26 Men's · Louisville vs Oregon or St. John's | ",
 "Upcoming Nov 27 Men's · Louisville at Players Era | ",
 "Upcoming Dec 1, 9:00 PM Men's · Louisville vs Texas | ",
 "Upcoming Dec 5 Men's · Louisville vs Michigan | ",
 "Upcoming Dec 12, 4:00 PM Men's · Louisville at Kentucky | ",
 "Upcoming Dec 16, 9:00 PM Men's · Louisville vs Long Island | ",
 "Upcoming Dec 19, 1:30 PM Men's · Louisville vs Eastern Michigan | ",
 "Upcoming Dec 30, 8:00 PM Men's · Louisville at Virginia Tech | ",
 "Upcoming Jan 2, 6:00 PM Men's · Louisville vs Stanford | ",
 "Upcoming Jan 5, 9:00 PM Men's · Louisville vs North Carolina | ",
 "Upcoming Jan 9, 2:15 PM Men's · Louisville at SMU | ",
 "Upcoming Jan 13, 7:00 PM Men's · Louisville vs California | ",
 "Upcoming Jan 16, 2:00 PM Men's · Louisville at Syracuse | ",
 "Upcoming Jan 19, 7:00 PM Men's · Louisville vs Miami | ",
 "Upcoming Jan 23 Men's · Louisville vs Baylor | ",
 "Upcoming Jan 27, 7:00 PM Men's · Louisville at Boston College | ",
 "Upcoming Jan 30, 12:00 PM Men's · Louisville at Georgia Tech | ",
 "Upcoming Feb 2, 9:00 PM Men's · Louisville vs Pittsburgh | ",
 "Upcoming Feb 6, 3:00 PM Men's · Louisville vs Wake Forest | ",
 "Upcoming Feb 8, 6:00 PM Men's · Louisville at North Carolina | ",
 "Upcoming Feb 13, 12:00 PM Men's · Louisville vs SMU | ",
 "Upcoming Feb 15, 7:00 PM Men's · Louisville at Virginia | ",
 "Upcoming Feb 21, 4:00 PM Men's · Louisville at Florida State | ",
 "Upcoming Feb 24, 7:00 PM Men's · Louisville vs Duke | ",
 "Upcoming Mar 2, 7:00 PM Men's · Louisville at NC State | ",
 "Upcoming Mar 6, 12:00 PM Men's · Louisville vs Clemson | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Louisville vs Bellarmine | ",
 "Upcoming Nov 4, 8:00 PM Women's · Louisville vs Stetson | ",
 "Upcoming Nov 8, 4:00 PM Women's · Louisville at Southern Indiana | ",
 "Upcoming Nov 10, 7:00 PM Women's · Louisville vs Lindenwood | ",
 "Upcoming Nov 12, 6:30 PM Women's · Louisville at Ball State | ",
 "Upcoming Nov 15, 5:30 PM Women's · Louisville vs UConn | ",
 "Upcoming Nov 17, 6:00 PM Women's · Louisville vs Tennessee State | ",
 "Upcoming Nov 21, 11:30 PM Women's · Louisville at Alaska Anchorage | ",
 "Upcoming Nov 22 Women's · Louisville vs Chicago State/Seattle | ",
 "Upcoming Nov 27 Women's · Louisville vs Akron | ",
 "Upcoming Nov 29, 12:00 PM Women's · Louisville vs East Tennessee State | ",
 "Upcoming Dec 2, 9:15 PM Women's · Louisville at Texas | ",
 "Upcoming Dec 6, 4:00 PM Women's · Louisville vs Eastern Kentucky | ",
 "Upcoming Dec 9, 9:00 PM Women's · Louisville at Kentucky | ",
 "Upcoming Dec 13, 2:00 PM Women's · Louisville vs Miami | ",
 "Upcoming Dec 17, 7:00 PM Women's · Louisville vs Northern Kentucky | ",
 "Upcoming Dec 20, 5:30 PM Women's · Louisville vs Clemson | ",
 "Upcoming Dec 31, 12:00 PM Women's · Louisville at Boston College | ",
 "Upcoming Jan 3, 2:00 PM Women's · Louisville vs Cal | ",
 "Upcoming Jan 7, 6:00 PM Women's · Louisville at Florida State | ",
 "Upcoming Jan 10, 3:00 PM Women's · Louisville vs North Carolina | ",
 "Upcoming Jan 14, 7:00 PM Women's · Louisville at Pitt | ",
 "Upcoming Jan 17, 2:00 PM Women's · Louisville at Virginia Tech | ",
 "Upcoming Jan 21, 7:00 PM Women's · Louisville vs Notre Dame | ",
 "Upcoming Jan 24, 2:00 PM Women's · Louisville at SMU | ",
 "Upcoming Jan 28, 7:00 PM Women's · Louisville vs Stanford | ",
 "Upcoming Feb 4, 6:00 PM Women's · Louisville at Wake Forest | ",
 "Upcoming Feb 7, 2:00 PM Women's · Louisville at Virginia | ",
 "Upcoming Feb 11, 6:00 PM Women's · Louisville vs Syracuse | ",
 "Upcoming Feb 14, 2:00 PM Women's · Louisville vs Georgia Tech | ",
 "Upcoming Feb 18, 7:00 PM Women's · Louisville at Duke | ",
 "Upcoming Feb 21, 2:00 PM Women's · Louisville vs NC State | ",
 "Upcoming Feb 28, 12:00 PM Women's · Louisville at Notre Dame | ",
 "Upcoming Mar 3 Women's · Louisville at 2027 Ally ACC Women's Basketball Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 19 Louisville at John McNichols Invitational | Women's team: 10th / Men's team: 17th",
 "Final Oct 9 Louisville at Nuttycombe Wisconsin Invitational | Women's team: 21st / Men's team: 21st",
 "Upcoming Oct 30 Louisville at ACC Cross Country Championships | ",
 "Upcoming Nov 13 Louisville at NCAA Southeast Regional Cross Country Championships | ",
 "Upcoming Nov 21 Louisville at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Louisville vs Miami University (OH) | W, 2-1",
 "Final Aug 30 Louisville vs Indiana | W, 2-1",
 "Final Sep 4 Louisville at Saint Louis | W, 3-0",
 "Final Sep 6 Louisville at Michigan State | W, 4-0",
 "Final Sep 11 Louisville at Northwestern | L, 1-3",
 "Final Sep 13 Louisville vs Iowa | L, 2-4",
 "Final Sep 18 Louisville vs Boston College | W, 1-0",
 "Final Sep 20 Louisville vs Saint Joseph's | W, 2-0",
 "Final Sep 25 Louisville at California | W, 3-2",
 "Final Sep 27 Louisville vs UC Davis | L, 0-1",
 "Final Oct 2 Louisville vs North Carolina | L, 0-3",
 "Final Oct 4 Louisville vs Stanford | W, 1-0",
 "Final Oct 6 Louisville vs Bellarmine | W, 4-0",
 "Final Oct 9 Louisville at Syracuse | L, 2-4",
 "Upcoming Oct 17, 1:00 PM Louisville vs Duke | ",
 "Upcoming Oct 23, 3:00 PM Louisville at Virginia | ",
 "Upcoming Oct 25, 12:00 PM Louisville at Richmond | ",
 "Upcoming Oct 30, 5:00 PM Louisville at Wake Forest | ",
 "Upcoming Nov 3 Louisville at Atlantic Coast Conference | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 6 Louisville vs Ole Miss | L, 38-41",
 "Final Sep 11 Louisville vs Villanova | W, 59-13",
 "Final Sep 19 Louisville vs SMU | W, 41-31",
 "Final Sep 26 Louisville vs Wake Forest | L, 27-30",
 "Final Oct 3 Louisville at NC State | L, 28-31",
 "Final Oct 9 Louisville vs Florida State | W, 44-20",
 "Upcoming Oct 17, 7:30 PM Louisville at Syracuse | ",
 "Upcoming Oct 31 Louisville vs Stanford | ",
 "Upcoming Nov 7 Louisville at Georgia Tech | ",
 "Upcoming Nov 14 Louisville at North Carolina | ",
 "Upcoming Nov 21 Louisville vs Pittsburgh | ",
 "Upcoming Nov 28 Louisville at Kentucky | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Louisville at Boilermaker Classic | 6th of 16",
 "Final Sep 18 Women's · Louisville at Mason Rudolph Championship | 7th of 15",
 "Final Sep 26 Women's · Louisville at Fighting Irish Classic | 2nd of 15",
 "Final Oct 9 Women's · Louisville at Evie Odom Invitational | 8th of 14",
 "Upcoming Oct 19 Women's · Louisville at Abilene Christian Intercollegiate | ",
 "Upcoming Feb 14 Women's · Louisville at Moon Golf Invitational | ",
 "Upcoming Mar 9 Women's · Louisville at Alamo Invitational | ",
 "Upcoming Mar 21 Women's · Louisville at Clemson Invitational | ",
 "Upcoming Apr 5 Women's · Louisville at Olde Stone Intercollegiate | ",
 "Upcoming Apr 15 Women's · Louisville at ACC Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Louisville at Visit Knoxville Collegiate | T16th of 17",
 "Final Sep 14 Men's · Louisville at Bearcat Invitational | 6th of 17",
 "Final Sep 28 Men's · Louisville at Bryan Bros Collegiate | 10th of 17",
 "Final Oct 4 Men's · Louisville at Fighting Irish Classic | 13th of 14",
 "Upcoming Oct 18 Men's · Louisville at Williams Cup | ",
 "Upcoming Feb 7 Men's · Louisville at Dominican Republic Classic | ",
 "Upcoming Mar 6 Men's · Louisville at John Hayt Collegiate Invitational | ",
 "Upcoming Mar 15 Men's · Louisville at Pauma Valley Invitational | ",
 "Upcoming Apr 4 Men's · Louisville at Calusa Cup | ",
 "Upcoming Apr 22 Men's · Louisville at ACC Championship | ",
 "Upcoming May 16 Men's · Louisville at NCAA Regional | ",
 "Upcoming May 28 Men's · Louisville at NCAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 10 Louisville at Derby City Head Race | Completed",
 "Upcoming Oct 17 Louisville at Head of the Charles Regatta | ",
 "Upcoming Oct 31 Louisville at Music City Head Race | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Women's · Louisville vs Indiana (Exhibition) | W, 4-2",
 "Final Aug 8 Women's · Louisville vs Ohio State (Exhibition) | T, 2-2",
 "Final Aug 12 Women's · Louisville vs Nebraska | L, 1-3",
 "Final Aug 16 Women's · Louisville vs IU Indy | W, 5-1",
 "Final Aug 23 Women's · Louisville vs Belmont | W, 5-0",
 "Final Aug 27 Women's · Louisville at Dayton | W, 4-2",
 "Final Aug 30 Women's · Louisville vs Akron | W, 5-0",
 "Final Sep 3 Women's · Louisville at Kentucky | W, 2-1",
 "Final Sep 6 Women's · Louisville vs Mercyhurst | W, 3-1",
 "Final Sep 12 Women's · Louisville vs Pitt | W, 4-2",
 "Final Sep 17 Women's · Louisville at Stanford | W, 1-0",
 "Final Sep 20 Women's · Louisville at California | T, 1-1",
 "Final Sep 27 Women's · Louisville vs Florida State | T, 0-0",
 "Final Oct 3 Women's · Louisville at Virginia Tech | W, 2-1",
 "Final Oct 10 Women's · Louisville at Clemson | T, 1-1",
 "Upcoming Oct 23, 7:00 PM Women's · Louisville vs Syracuse | ",
 "Upcoming Oct 29, 6:00 PM Women's · Louisville at Virginia | ",
 "Upcoming Nov 1, 1:00 PM Women's · Louisville vs Boston College | ",
 "Upcoming Nov 5, 6:00 PM Women's · Louisville vs North Carolina | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Louisville vs IU Indy | W, 2-1",
 "Final Aug 24 Men's · Louisville at Kentucky | W, 3-2",
 "Final Aug 27 Men's · Louisville vs Lipscomb | W, 3-1",
 "Final Aug 31 Men's · Louisville vs Indiana | T, 1-1",
 "Final Sep 3 Men's · Louisville vs Wright State | W, 3-0",
 "Final Sep 8 Men's · Louisville at Evansville | W, 1-0",
 "Final Sep 13 Men's · Louisville vs California | W, 3-2",
 "Final Sep 18 Men's · Louisville vs Boston College | T, 3-3",
 "Final Sep 21 Men's · Louisville vs Belmont | W, 3-0",
 "Final Sep 25 Men's · Louisville at Pittsburgh | L, 0-1",
 "Final Oct 2 Men's · Louisville vs NC State | W, 2-1",
 "Final Oct 6 Men's · Louisville vs DePaul | W, 4-1",
 "Final Oct 10 Men's · Louisville at Syracuse | W, 1-0",
 "Upcoming Oct 16, 7:30 PM Men's · Louisville at Clemson | ",
 "Upcoming Oct 21, 6:00 PM Men's · Louisville vs Spalding (Ky.) | ",
 "Upcoming Oct 25, 3:00 PM Men's · Louisville vs Notre Dame | ",
 "Upcoming Oct 30, 7:00 PM Men's · Louisville at SMU | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 15, 6:00 PM Louisville at Eastern Kentucky (Exhibition) | ",
 "Upcoming Oct 21, 5:00 PM Louisville vs Bellarmine (Exhibition) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 24 Louisville at College Swimming League | Completed",
 "Final Oct 2 Louisville vs Xavier | Completed",
 "Final Oct 9 Louisville at College Swimming League | Completed",
 "Upcoming Oct 22, 2:30 PM Louisville at Notre Dame | ",
 "Upcoming Oct 29 Louisville at Team USA Short Course World Championship Trials | ",
 "Upcoming Nov 5 Louisville at College Swimming League | ",
 "Upcoming Nov 17 Louisville at Ohio State Invite | ",
 "Upcoming Dec 2 Louisville at Toyota U.S. Open Long Course | ",
 "Upcoming Dec 9 Louisville at USA Diving Winter Nationals | ",
 "Upcoming Jan 8, 12:00 PM Louisville at Missouri | ",
 "Upcoming Jan 13 Louisville at Tyr Pro Swim Series | ",
 "Upcoming Jan 23 Louisville at Kentucky | ",
 "Upcoming Jan 29, 12:00 PM Louisville vs Indiana | ",
 "Upcoming Jan 30, 12:00 PM Louisville vs Cincinnati | ",
 "Upcoming Feb 4, 10:00 AM Louisville at Louisville Invitational | ",
 "Upcoming Feb 16 Louisville at ACC Championships | ",
 "Upcoming Feb 26 Louisville at Championship Qualifying Meet | ",
 "Upcoming Mar 11 Louisville at NCAA Diving Zones | ",
 "Upcoming Mar 17 Louisville at Women's NCAA Championships | ",
 "Upcoming Mar 24 Louisville at Men's NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Louisville at Cincinnati Invitational | Completed",
 "Final Sep 19 Women's · Louisville at ITA Women's All-American Championship | Completed",
 "Final Oct 2 Women's · Louisville at Indiana Invitational | Completed",
 "Final Oct 8 Women's · Louisville at ITA Ohio Valley Regional Championship | Completed",
 "Upcoming Nov 6 Women's · Louisville at North Florida Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Louisville at Rocky Top Invitational | Completed",
 "Final Sep 19 Men's · Louisville at ITA All American Championships | Completed",
 "Final Sep 25 Men's · Louisville at Fighting Irish Mini Duals | Completed",
 "Final Oct 2 Men's · Louisville at Louisville Invitational | Completed",
 "Final Oct 8 Men's · Louisville at ITA Ohio Valley Regional Championships | Completed",
 "Upcoming Oct 16 Men's · Louisville at MTSU Invitational | ",
 "Upcoming Oct 23 Men's · Louisville at Louisville Classic | ",
 "Upcoming Nov 5 Men's · Louisville at ITA Sectional Championships | ",
 "Upcoming Nov 18 Men's · Louisville at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 21 Louisville vs Texas A&M | W, 3-1",
 "Final Aug 22 Louisville vs Wisconsin | L, 0-3",
 "Final Aug 28 Louisville vs Indiana | W, 3-0",
 "Final Aug 31 Louisville vs Dayton | W, 3-0",
 "Final Sep 4 Louisville vs TCU | W, 3-0",
 "Final Sep 6 Louisville vs Texas | W, 3-0",
 "Final Sep 9 Louisville vs Missouri | W, 3-1",
 "Final Sep 11 Louisville at Rice | W, 3-1",
 "Final Sep 12 Louisville vs Creighton | W, 3-1",
 "Final Sep 13 Louisville vs Northern Iowa | W, 3-0",
 "Final Sep 16 Louisville at Western Kentucky | W, 3-0",
 "Final Sep 20 Louisville at Kentucky | L, 1-3",
 "Final Sep 25 Louisville at Syracuse | W, 3-0",
 "Final Sep 27 Louisville at Boston College | W, 3-0",
 "Final Sep 30 Louisville vs Notre Dame | W, 3-0",
 "Final Oct 3 Louisville at Notre Dame | W, 3-0",
 "Final Oct 8 Louisville vs California | W, 3-1",
 "Final Oct 11 Louisville vs Stanford | W, 3-0",
 "Upcoming Oct 16, 7:00 PM Louisville vs Duke | ",
 "Upcoming Oct 18, 1:00 PM Louisville vs North Carolina | ",
 "Upcoming Oct 23, 6:00 PM Louisville at Florida State | ",
 "Upcoming Oct 25, 3:30 PM Louisville at Miami | ",
 "Upcoming Oct 30, 7:00 PM Louisville vs Clemson | ",
 "Upcoming Nov 1, 12:00 PM Louisville vs Georgia Tech | ",
 "Upcoming Nov 6, 7:00 PM Louisville at Virginia | ",
 "Upcoming Nov 8, 1:00 PM Louisville at Virginia Tech | ",
 "Upcoming Nov 12, 7:00 PM Louisville at SMU | ",
 "Upcoming Nov 15, 8:30 PM Louisville at Pittsburgh | ",
 "Upcoming Nov 20, 7:00 PM Louisville vs Wake Forest | ",
 "Upcoming Nov 22, 12:00 PM Louisville vs NC State | ",
 "Upcoming Nov 25, 2:00 PM Louisville at North Carolina | ",
 "Upcoming Nov 28, 1:00 PM Louisville vs SMU | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Football's two polls each marked ("#9/#10 Ole Miss", Sep 6) are rankings;
// men's soccer's institutions read by their short names ("University of
// Kentucky", "Southern Methodist University"). The Derby City Head Race
// (rowing, Oct 10) has no result line or story: not listed.
{
  const h=worker.louisvilleHandlers;
  assert.equal(parse('Football','football')[0].opponent,'Ole Miss');
  assert.deepEqual(parse('Soccer','mens-soccer').map(e=>e.opponent).filter(name=>/Kentucky|SMU|California|Spalding/.test(name)),['Kentucky','California','Spalding (Ky.)','SMU']);
  assert.deepEqual(parse('Rowing','womens-rowing').filter(e=>e.status==='Final').map(e=>[line(e),h.isTennisWithoutStory(e)]),[['Final Oct 10 Louisville at Derby City Head Race | Completed',true]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Louisville module checks passed');
