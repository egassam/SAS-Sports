import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {missouriSchool,missouriSeasonYear,missouriGolfPlace,missouriGolfCardPlace} from '../src/schools/missouri.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='missouri');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,missouriHandlers,rosterProfiles,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/missouri-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mutigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['missouri'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',missouriSchool.scheduleUrls],['roster',missouriSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('missouri|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mutigers.com',`${key} must stay on mutigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mutigers.com/sports/baseball/schedule"],"roster":["https://mutigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mutigers.com/sports/mens-basketball/schedule","https://mutigers.com/sports/womens-basketball/schedule"],"roster":["https://mutigers.com/sports/mens-basketball/roster","https://mutigers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://mutigers.com/sports/cross-country/schedule"],"roster":["https://mutigers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://mutigers.com/sports/football/schedule"],"roster":["https://mutigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://mutigers.com/sports/mens-golf/schedule","https://mutigers.com/sports/womens-golf/schedule"],"roster":["https://mutigers.com/sports/mens-golf/roster","https://mutigers.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://mutigers.com/sports/womens-gymnastics/schedule"],"roster":["https://mutigers.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://mutigers.com/sports/womens-soccer/schedule"],"roster":["https://mutigers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://mutigers.com/sports/softball/schedule"],"roster":["https://mutigers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://mutigers.com/sports/swimming-and-diving/schedule"],"roster":["https://mutigers.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://mutigers.com/sports/womens-tennis/schedule"],"roster":["https://mutigers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://mutigers.com/sports/track-and-field/schedule"],"roster":["https://mutigers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://mutigers.com/sports/womens-volleyball/schedule"],"roster":["https://mutigers.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://mutigers.com/sports/wrestling/schedule"],"roster":["https://mutigers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'missouri|"+sport+"':"),`${sport} routes must live in the Missouri module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://mutigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.missouriHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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
void [parse,line,ownRecapsOnly,live,missouriSeasonYear,missouriGolfPlace];


// BEGIN generated (scripts/generate-module-tests.mjs --school=missouri)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 17, 12:00 PM Missouri vs Bradley (Exhibition) | ",
 "Upcoming Oct 24, 10:00 AM Missouri vs Central Missouri (Exhibition) | ",
 "Upcoming Oct 24, 6:00 PM Missouri vs Southeast Missouri (Exhibition) | ",
 "Upcoming Mar 19 Missouri at Mississippi State | ",
 "Upcoming Mar 20 Missouri at Mississippi State | ",
 "Upcoming Mar 21 Missouri at Mississippi State | ",
 "Upcoming Mar 26 Missouri vs Kentucky | ",
 "Upcoming Mar 27 Missouri vs Kentucky | ",
 "Upcoming Mar 28 Missouri vs Kentucky | ",
 "Upcoming Apr 2 Missouri at Auburn | ",
 "Upcoming Apr 3 Missouri at Auburn | ",
 "Upcoming Apr 4 Missouri at Auburn | ",
 "Upcoming Apr 9 Missouri vs Alabama | ",
 "Upcoming Apr 10 Missouri vs Alabama | ",
 "Upcoming Apr 11 Missouri vs Alabama | ",
 "Upcoming Apr 16 Missouri at Arkansas | ",
 "Upcoming Apr 17 Missouri at Arkansas | ",
 "Upcoming Apr 18 Missouri at Arkansas | ",
 "Upcoming Apr 23 Missouri vs Oklahoma | ",
 "Upcoming Apr 24 Missouri vs Oklahoma | ",
 "Upcoming Apr 25 Missouri vs Oklahoma | ",
 "Upcoming Apr 30 Missouri at Ole Miss | ",
 "Upcoming May 1 Missouri at Ole Miss | ",
 "Upcoming May 2 Missouri at Ole Miss | ",
 "Upcoming May 7 Missouri vs LSU | ",
 "Upcoming May 8 Missouri vs LSU | ",
 "Upcoming May 9 Missouri vs LSU | ",
 "Upcoming May 14 Missouri at South Carolina | ",
 "Upcoming May 15 Missouri at South Carolina | ",
 "Upcoming May 16 Missouri at South Carolina | ",
 "Upcoming May 20 Missouri vs Florida | ",
 "Upcoming May 21 Missouri vs Florida | ",
 "Upcoming May 22 Missouri vs Florida | ",
 "Upcoming May 25 Missouri at SEC Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23 Men's · Missouri at Kansas State (Exhibition) | ",
 "Upcoming Oct 29, 9:00 PM Men's · Missouri at UNLV (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Missouri vs Cleveland State | ",
 "Upcoming Nov 6, 6:00 PM Men's · Missouri vs Saint Louis | ",
 "Upcoming Nov 9, 7:00 PM Men's · Missouri vs SIUE | ",
 "Upcoming Nov 15, 1:30 PM Men's · Missouri vs Marquette | ",
 "Upcoming Nov 18, 8:00 PM Men's · Missouri vs Alcorn State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Missouri vs Le Moyne | ",
 "Upcoming Nov 24, 8:00 PM Men's · Missouri vs Evansville | ",
 "Upcoming Nov 27, 3:00 PM Men's · Missouri vs Arkansas-Pine Bluff | ",
 "Upcoming Dec 1, 6:00 PM Men's · Missouri vs Pittsburgh | ",
 "Upcoming Dec 6, 4:00 PM Men's · Missouri vs Kansas | ",
 "Upcoming Dec 12, 6:00 PM Men's · Missouri vs Nebraska | ",
 "Upcoming Dec 18, 6:00 PM Men's · Missouri at Indiana | ",
 "Upcoming Dec 20, 6:30 PM Men's · Missouri vs Illinois | ",
 "Upcoming Dec 22, 7:00 PM Men's · Missouri vs Chicago State | ",
 "Upcoming Jan 2, 3:00 PM Men's · Missouri at Arkansas | ",
 "Upcoming Jan 5, 8:00 PM Men's · Missouri vs Texas A&M | ",
 "Upcoming Jan 9, 3:00 PM Men's · Missouri vs Kentucky | ",
 "Upcoming Jan 13, 6:00 PM Men's · Missouri at Tennessee | ",
 "Upcoming Jan 16, 12:00 PM Men's · Missouri vs South Carolina | ",
 "Upcoming Jan 19, 6:00 PM Men's · Missouri at Oklahoma | ",
 "Upcoming Jan 23, 7:00 PM Men's · Missouri at Vanderbilt | ",
 "Upcoming Jan 26, 8:00 PM Men's · Missouri vs Alabama | ",
 "Upcoming Jan 30, 5:00 PM Men's · Missouri vs Ole Miss | ",
 "Upcoming Feb 3, 7:00 PM Men's · Missouri at Mississippi State | ",
 "Upcoming Feb 6, 12:00 PM Men's · Missouri vs Tennessee | ",
 "Upcoming Feb 13, 11:00 AM Men's · Missouri at Florida | ",
 "Upcoming Feb 16, 6:00 PM Men's · Missouri vs Oklahoma | ",
 "Upcoming Feb 20, 11:00 AM Men's · Missouri at Auburn | ",
 "Upcoming Feb 23, 6:00 PM Men's · Missouri vs Arkansas | ",
 "Upcoming Feb 27, 5:00 PM Men's · Missouri at Georgia | ",
 "Upcoming Mar 2, 6:00 PM Men's · Missouri at Texas | ",
 "Upcoming Mar 6, 1:00 PM Men's · Missouri vs LSU | ",
 "Upcoming Mar 10 Men's · Missouri vs SEC First Round | ",
 "Upcoming Mar 11 Men's · Missouri vs SEC Second Round | ",
 "Upcoming Mar 12 Men's · Missouri vs SEC Quarterfinal | ",
 "Upcoming Mar 13 Men's · Missouri vs SEC Semifinal | ",
 "Upcoming Mar 14 Men's · Missouri vs SEC Championship | ",
 "Upcoming Mar 16 Men's · Missouri vs NCAA Tournament Opening Round | ",
 "Upcoming Mar 18 Men's · Missouri vs NCAA Tournament First Round | ",
 "Upcoming Mar 20 Men's · Missouri vs NCAA Tournament Second Round | ",
 "Upcoming Mar 25 Men's · Missouri vs NCAA Tournament Sweet 16 | ",
 "Upcoming Mar 27 Men's · Missouri vs NCAA Tournament Elite Eight | ",
 "Upcoming Apr 3 Men's · Missouri vs NCAA Final Four | ",
 "Upcoming Apr 5 Men's · Missouri vs NCAA Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:30 PM Women's · Missouri vs Lincoln (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Women's · Missouri vs Howard | ",
 "Upcoming Nov 6, 7:00 PM Women's · Missouri at Little Rock | ",
 "Upcoming Nov 9, 11:00 AM Women's · Missouri vs Tennessee Tech | ",
 "Upcoming Nov 12, 6:30 PM Women's · Missouri vs UT Martin | ",
 "Upcoming Nov 15, 2:00 PM Women's · Missouri vs Lindenwood | ",
 "Upcoming Nov 22, 6:30 PM Women's · Missouri vs Kansas State | ",
 "Upcoming Nov 24 Women's · Missouri vs SIUE | ",
 "Upcoming Nov 27, 10:00 AM Women's · Missouri vs Tulane | ",
 "Upcoming Nov 28, 12:15 PM Women's · Missouri vs Boise State | ",
 "Upcoming Dec 3, 6:00 PM Women's · Missouri at Florida State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Missouri vs Eastern Illinois | ",
 "Upcoming Dec 10 Women's · Missouri at Illinois | ",
 "Upcoming Dec 13, 1:00 PM Women's · Missouri vs Saint Louis | ",
 "Upcoming Dec 17, 6:30 PM Women's · Missouri vs Jacksonville State | ",
 "Upcoming Dec 20, 5:00 PM Women's · Missouri vs Austin Peay | ",
 "Upcoming Dec 31 Women's · Missouri vs Mississippi State | ",
 "Upcoming Jan 3, 2:00 PM Women's · Missouri at Oklahoma | ",
 "Upcoming Jan 7, 6:30 PM Women's · Missouri vs Kentucky | ",
 "Upcoming Jan 10, 2:00 PM Women's · Missouri at Texas A&M | ",
 "Upcoming Jan 14, 6:00 PM Women's · Missouri at Ole Miss | ",
 "Upcoming Jan 17, 3:00 PM Women's · Missouri vs South Carolina | ",
 "Upcoming Jan 21, 6:30 PM Women's · Missouri vs Vanderbilt | ",
 "Upcoming Jan 28, 7:00 PM Women's · Missouri at Texas | ",
 "Upcoming Feb 1, 6:00 PM Women's · Missouri at Alabama | ",
 "Upcoming Feb 4, 6:30 PM Women's · Missouri vs Florida | ",
 "Upcoming Feb 7, 1:00 PM Women's · Missouri vs LSU | ",
 "Upcoming Feb 11, 5:30 PM Women's · Missouri at Georgia | ",
 "Upcoming Feb 14, 1:00 PM Women's · Missouri vs Tennessee | ",
 "Upcoming Feb 21, 4:00 PM Women's · Missouri vs Arkansas | ",
 "Upcoming Feb 25, 6:30 PM Women's · Missouri at Vanderbilt | ",
 "Upcoming Feb 28, 3:00 PM Women's · Missouri at Auburn | ",
 "Upcoming Mar 3 Women's · Missouri vs SEC Tournament | ",
 "Upcoming Mar 17 Women's · Missouri at Opening Round | ",
 "Upcoming Mar 19 Women's · Missouri at First Round | ",
 "Upcoming Mar 21 Women's · Missouri at Second Round | ",
 "Upcoming Mar 26 Women's · Missouri at Sweet 16 | ",
 "Upcoming Mar 28 Women's · Missouri at Elite Eight | ",
 "Upcoming Apr 2 Women's · Missouri at Final Four | ",
 "Upcoming Apr 4 Women's · Missouri at National Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Missouri at Cyclone Opener | Completed",
 "Final Sep 18 Missouri at Billiken Invitational | Completed",
 "Final Sep 25 Missouri at Gans Creek Classic | Completed",
 "Upcoming Oct 9, 8:00 AM Missouri at Nuttycomb Invitational | ",
 "Upcoming Oct 30, 8:00 AM Missouri at SEC Championship | ",
 "Upcoming Nov 13, 8:00 AM Missouri at NCAA Midwest Regional Championship | ",
 "Upcoming Nov 21, 8:00 AM Missouri at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Missouri vs Arkansas - Pine Bluff | W, 54-14",
 "Final Sep 11 Missouri at Kansas | W, 38-21",
 "Final Sep 19 Missouri vs Troy | W, 27-17",
 "Final Sep 26 Missouri at Mississippi State | L, 24-31",
 "Final Oct 3 Missouri vs Florida | W, 45-17",
 "Upcoming Oct 10, 11:00 AM Missouri vs Texas A&M | ",
 "Upcoming Oct 17, 2:30 PM Missouri at Ole Miss | ",
 "Upcoming Oct 31 Missouri at Arkansas | ",
 "Upcoming Nov 7 Missouri vs Texas | ",
 "Upcoming Nov 14 Missouri at Georgia | ",
 "Upcoming Nov 21 Missouri vs Kentucky | ",
 "Upcoming Nov 28 Missouri vs Oklahoma | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Missouri at Visit Knoxville Collegiate | 8th of 17",
 "Final Sep 13 Men's · Missouri at Canadian Collegiate Invitational | 5th of 13",
 "Final Sep 25 Men's · Missouri at William H. Tucker Invitational | 14th of 15",
 "Upcoming Oct 12 Men's · Missouri at The Bryson Invitational | ",
 "Upcoming Oct 19 Men's · Missouri at Abilene Christian Intercollegiate | ",
 "Upcoming Feb 1 Men's · Missouri at National Invitational Tournament | ",
 "Upcoming Feb 11 Men's · Missouri at John A. Burns Intercollegiate | ",
 "Upcoming Mar 15 Men's · Missouri at Black Desert Collegiate | ",
 "Upcoming Mar 22 Men's · Missouri at Bruin Invitational | ",
 "Upcoming Apr 5 Men's · Missouri at Tiger Intercollegiate | ",
 "Upcoming Apr 21 Men's · Missouri at SEC Championship | ",
 "Upcoming May 17 Men's · Missouri at NCAA Championship Regionals | ",
 "Upcoming May 28 Men's · Missouri at NCAA Championship Finals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Missouri at ANNIKA Intercollegiate | 9th",
 "Final Sep 21 Women's · Missouri at Johnie Imes Invitational | 1st",
 "Final Oct 5 Women's · Missouri at OU Intercollegiate | 2nd",
 "Upcoming Oct 12 Women's · Missouri at Illini Women's Invitational | ",
 "Upcoming Oct 18 Women's · Missouri at Jim West Challenge | ",
 "Upcoming Feb 21 Women's · Missouri at Westbrook Invitational | ",
 "Upcoming Mar 14 Women's · Missouri at Mountainview Collegiate | ",
 "Upcoming Mar 19 Women's · Missouri at Hawkeye El Tigre Invitational | ",
 "Upcoming Apr 4 Women's · Missouri at “Mo”Morial Invitational | ",
 "Upcoming Apr 15 Women's · Missouri at SEC Championship | ",
 "Upcoming May 10 Women's · Missouri at NCAA Regionals | ",
 "Upcoming May 21 Women's · Missouri at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Missouri at Lindenwood (Exhibition) | W, 3-1",
 "Final Aug 13 Missouri at Western Kentucky | T, 0-0",
 "Final Aug 16 Missouri at Murray State | W, 3-1",
 "Final Aug 20 Missouri vs Saint Louis | L, 0-1",
 "Final Aug 23 Missouri at Missouri St. | L, 0-1",
 "Final Aug 27 Missouri vs Northern Illinois | W, 4-0",
 "Final Aug 30 Missouri at Creighton | L, 0-1",
 "Final Sep 4 Missouri vs Southeast Missouri | W, 5-0",
 "Final Sep 11 Missouri at Oklahoma | L, 1-3",
 "Final Sep 18 Missouri vs Kentucky | L, 1-2",
 "Final Sep 24 Missouri vs Auburn | L, 0-2",
 "Final Sep 27 Missouri at South Carolina | L, 0-3",
 "Final Oct 2 Missouri at Arkansas | T, 1-1",
 "Upcoming Oct 9, 6:00 PM Missouri vs Vanderbilt | ",
 "Upcoming Oct 15, 6:00 PM Missouri at Ole Miss | ",
 "Upcoming Oct 18, 5:00 PM Missouri at Georgia | ",
 "Upcoming Oct 22, 8:00 PM Missouri vs Texas A&M | ",
 "Upcoming Nov 1, 12:00 PM Missouri vs LSU | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 5:00 PM Missouri at Kansas | ",
 "Upcoming Oct 17, 1:00 PM Missouri at KC Diamonds | ",
 "Upcoming Oct 17, 4:00 PM Missouri vs Wichita State | ",
 "Upcoming Oct 23, 6:00 PM Missouri vs Lindenwood | ",
 "Upcoming Oct 24, 11:00 AM Missouri vs UA Rich Moutain | ",
 "Upcoming Oct 24, 1:30 PM Missouri vs Three Rivers C.C. | ",
 "Upcoming Oct 25, 2:00 PM Missouri vs Iowa | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Upcoming Oct 9 Missouri at SMU Classic | ",
 "Upcoming Oct 16 Missouri vs Missouri State | ",
 "Upcoming Oct 16 Missouri vs Indiana State | ",
 "Upcoming Oct 31, 12:00 PM Missouri at Southern Illinois | ",
 "Upcoming Nov 17 Missouri at Mizzou Invite | ",
 "Upcoming Jan 8, 11:00 AM Missouri vs Louisville | ",
 "Upcoming Jan 9, 10:00 AM Missouri vs LSU | ",
 "Upcoming Jan 22, 5:00 PM Missouri at Florida Diving | ",
 "Upcoming Jan 23, 10:30 AM Missouri at Florida Swimming | ",
 "Upcoming Feb 14 Missouri at SEC Championships | ",
 "Upcoming Feb 27 Missouri vs Mizzou Qualifier | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Missouri at Husker Invitational | Completed",
 "Final Oct 1 Missouri at 49er Invite | Completed",
 "Upcoming Oct 14 Missouri at ITA Central Regional | ",
 "Upcoming Oct 22 Missouri at Jae Foundation Invite | ",
 "Upcoming Nov 5 Missouri at ITA Sectionals | ",
 "Upcoming Nov 5 Missouri at ITA Conference Masters | ",
 "Upcoming Nov 6 Missouri at June Stewart Invite | ",
 "Upcoming Nov 17 Missouri at NCAA Individual Championships | ",
 "Upcoming Jan 17 Missouri vs UT-Arlington | ",
 "Upcoming Jan 18 Missouri at SMU | ",
 "Upcoming Jan 24, 12:00 PM Missouri at Kansas | ",
 "Upcoming Jan 25, 9:00 AM Missouri vs South Dakota | ",
 "Upcoming Jan 25, 4:00 PM Missouri vs Western Illinois | ",
 "Upcoming Jan 30, 11:00 AM Missouri at Nebraska | ",
 "Upcoming Jan 30, 4:00 PM Missouri at Omaha | ",
 "Upcoming Feb 6, 9:00 AM Missouri vs Eastern Kentucky | ",
 "Upcoming Feb 6, 2:00 PM Missouri vs North Texas | ",
 "Upcoming Feb 8, 12:00 PM Missouri at Wichita State | ",
 "Upcoming Feb 12, 3:30 PM Missouri at Minnesota | ",
 "Upcoming Feb 12, 7:30 PM Missouri at Milwaukee | ",
 "Upcoming Feb 20, 9:00 AM Missouri vs Lindenwood | ",
 "Upcoming Feb 20, 5:00 PM Missouri vs Arkansas State | ",
 "Upcoming Feb 28, 11:00 AM Missouri vs Vanderbilt | ",
 "Upcoming Mar 5, 5:00 PM Missouri vs Florida | ",
 "Upcoming Mar 7, 11:00 AM Missouri vs Auburn | ",
 "Upcoming Mar 12, 11:12 AM Missouri at Arkansas | ",
 "Upcoming Mar 14, 11:14 AM Missouri at Oklahoma | ",
 "Upcoming Mar 19, 10:00 AM Missouri vs Illinois State | ",
 "Upcoming Mar 19, 5:00 PM Missouri vs Kentucky | ",
 "Upcoming Mar 21, 11:00 AM Missouri vs Tennessee | ",
 "Upcoming Mar 25, 11:19 AM Missouri at Texas A&M | ",
 "Upcoming Mar 27, 11:20 AM Missouri at Texas | ",
 "Upcoming Apr 2, 11:21 AM Missouri at South Carolina | ",
 "Upcoming Apr 4, 11:22 AM Missouri at Georgia | ",
 "Upcoming Apr 9, 5:00 PM Missouri vs Alabama | ",
 "Upcoming Apr 11, 11:00 AM Missouri vs Mississippi State | ",
 "Upcoming Apr 16, 5:00 PM Missouri vs Ole Miss | ",
 "Upcoming Apr 18, 11:28 AM Missouri vs LSU | ",
 "Upcoming Apr 20, 11:30 AM Missouri at SEC Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Missouri vs Western Illinois | W, 3-0",
 "Final Aug 28 Missouri vs Towson | W, 3-0",
 "Final Aug 29 Missouri vs Idaho | W, 3-0",
 "Final Sep 1 Missouri vs Oregon | L, 1-3",
 "Final Sep 9 Missouri at Louisville | L, 1-3",
 "Final Sep 11 Missouri vs Arkansas State | W, 3-1",
 "Final Sep 12 Missouri vs Wichita State | W, 3-0",
 "Final Sep 13 Missouri vs Florida Gulf Coast | W, 3-1",
 "Final Sep 18 Missouri vs Dayton | L, 2-3",
 "Final Sep 18 Missouri at Toledo | L, 2-3",
 "Final Sep 19 Missouri at Bowling Green | W, 3-1",
 "Final Sep 23 Missouri at Nebraska | L, 0-3",
 "Final Sep 27 Missouri vs Vanderbilt | W, 3-1",
 "Final Oct 2 Missouri at Ole Miss | L, 1-3",
 "Final Oct 4 Missouri at LSU | L, 2-3",
 "Upcoming Oct 9, 7:00 PM Missouri vs Florida | ",
 "Upcoming Oct 11, 2:00 PM Missouri vs Auburn | ",
 "Upcoming Oct 14, 6:00 PM Missouri vs Mississippi State | ",
 "Upcoming Oct 18, 2:00 PM Missouri vs Alabama | ",
 "Upcoming Oct 23, 6:00 PM Missouri at South Carolina | ",
 "Upcoming Oct 25, 1:00 PM Missouri at Georgia | ",
 "Upcoming Oct 30, 6:00 PM Missouri at Kentucky | ",
 "Upcoming Nov 1, 2:00 PM Missouri vs Tennessee | ",
 "Upcoming Nov 6, 7:00 PM Missouri vs Texas | ",
 "Upcoming Nov 8, 2:00 PM Missouri vs Texas A&M | ",
 "Upcoming Nov 13, 6:00 PM Missouri at Oklahoma | ",
 "Upcoming Nov 15, 2:00 PM Missouri at Arkansas | ",
 "Upcoming Nov 20 Missouri vs SEC Tournament | ",
 "Upcoming Dec 3 Missouri at NCAA First & Second Rounds | ",
 "Upcoming Dec 10 Missouri at NCAA Regional | ",
 "Upcoming Dec 17 Missouri at NCAA Final Four & Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 2, 4:30 PM Missouri vs Central Methodist | ",
 "Upcoming Nov 2, 6:00 PM Missouri vs Maryville | ",
 "Upcoming Nov 2, 7:30 PM Missouri vs Central Missouri | ",
 "Upcoming Nov 14, 10:00 AM Missouri at Tiger Style Invite | ",
 "Upcoming Nov 22 Missouri at Keystone Classic | ",
 "Upcoming Dec 12 Missouri at National Duals Invitational | ",
 "Upcoming Dec 20 Missouri vs Little Rock | ",
 "Upcoming Jan 8 Missouri at Oklahoma | ",
 "Upcoming Jan 10 Missouri at Oklahoma State | ",
 "Upcoming Jan 14 Missouri vs West Virginia | ",
 "Upcoming Jan 22 Missouri vs Northern Iowa | ",
 "Upcoming Feb 5 Missouri at Utah Valley | ",
 "Upcoming Feb 6 Missouri at Wyoming | ",
 "Upcoming Feb 11 Missouri vs Arizona State | ",
 "Upcoming Feb 17 Missouri vs Iowa State | ",
 "Upcoming Mar 5 Missouri at Big 12 Championship | ",
 "Upcoming Mar 18 Missouri at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Golf: the card's result text gives the place ("5th of 13") or the place
// and team score ("1st (842)"); the final story is the card's "Final Recap",
// a round's only when the final one is not a story (ANNIKA's links a preview
// page).
{
  assert.deepEqual(missouriGolfCardPlace('14th of 15'),{headline:'14th of 15',results:[{label:'Result',value:'14th of 15'}]});
  assert.deepEqual(missouriGolfCardPlace('T-3rd (901)'),{headline:'T3rd',results:[{label:'Result',value:'T3rd'},{label:'Team score',value:'901'}]});
  assert.equal(missouriGolfCardPlace('NTS'),null);
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value}`).join(' / '),e.recap_url]);
  assert.deepEqual(final('womens-golf'),[["ANNIKA Intercollegiate","9th","Result: 9th / Team score: 901","https://mutigers.com/news/2026/09/8/womens-golf-wraps-up-second-round-at-annika-intercollegiate"],["Johnie Imes Invitational","1st","Result: 1st / Team score: 842","https://mutigers.com/news/2026/09/22/womens-golf-crowned-champions-behind-historic-performance-from-dobson-at-johnie-imes"],["OU Intercollegiate","2nd","Result: 2nd / Team score: 841","https://mutigers.com/news/2026/10/6/dobson-finishes-runner-up-as-womens-golf-takes-second-at-ou-intercollegiate"]]);
  assert.deepEqual(final('mens-golf'),[["Visit Knoxville Collegiate","8th of 17","Result: 8th of 17","https://mutigers.com/news/2026/09/1/mizzou-mens-golf-takes-eighth-in-season-opener-behind-mierls-top-10-finish"],["Canadian Collegiate Invitational","5th of 13","Result: 5th of 13","https://mutigers.com/news/2026/09/15/viskari-earns-third-place-finish-as-mens-golf-takes-fifth-in-canada"],["William H. Tucker Invitational","14th of 15","Result: 14th of 15","https://mutigers.com/news/2026/09/26/hawkins-leads-mens-golf-to-finish-at-william-h-tucker"]]);
}

// Tennis: a tournament's day cards ("Day One" under the "Husker
// Invitational" heading) are one event, with the last day's story.
assert.deepEqual(parse('Tennis','womens-tennis').filter(e=>e.status==='Final').map(e=>[e.title,e.end_time||null,e.recap_url]),[["Missouri at Husker Invitational","2026-09-27T23:59:59Z","https://mutigers.com/news/2026/09/27/tennis-concludes-first-fall-competition-at-husker-invitational"],["Missouri at 49er Invite","2026-10-02T23:59:59Z","https://mutigers.com/news/2026/10/3/tennis-wraps-up-competition-at-49er-invite"]]);

// Each card's full date gives its year: a spring game on a fall page
// ("2027 Baseball Schedule") is in 2027; two polls ("#24/#RV") are rankings;
// a home meet read "vs." is "at".
{
  assert.deepEqual(parse('Baseball','baseball').filter(e=>/Mississippi State/.test(e.opponent)).map(e=>e.start_time.slice(0,10)),["2027-03-19","2027-03-20","2027-03-21"]);
  assert.equal(parse('Football','football').find(e=>/Mississippi State/.test(e.opponent)).opponent,'Mississippi State');
  assert.equal(parse('Cross Country','cross-country').find(e=>/Gans Creek/.test(e.opponent)).title,'Missouri at Gans Creek Classic');
  assert.deepEqual(parse('Swimming & Diving','swimming-and-diving').filter(e=>/Missouri State|Mizzou Invite/.test(e.opponent)).map(e=>e.title),["Missouri vs Missouri State","Missouri at Mizzou Invite"]);
}

// Soccer at Arkansas (Oct 2): the card links no story; the archive's story
// that names Arkansas and the 1-1 draw is taken. The Oct 1 preview is dated
// before the match, and the exhibition takes none.
{
  const soccer=parse('Soccer','womens-soccer').filter(e=>e.status==='Final'&&!e.recap_url);
  assert.deepEqual(soccer.map(e=>[e.opponent,worker.missouriHandlers.isFinalWithoutStory(e)]),[['Lindenwood (Exhibition)',false],['Arkansas',true]]);
  recapFixtures.set('https://mutigers.com/sports/womens-soccer/archives',fixture('womens-soccer-archives.html.gz'));
  const story=fixture('recap-2026-10-3-soccer-earns-first-sec-point-in-1-1-draw-at-a.html.gz');
  for(const path of ['/news/2026/10/3/soccer-earns-first-sec-point-in-1-1-draw-at-arkansas','/news/2026/10/03/soccer-earns-first-sec-point-in-1-1-draw-at-arkansas'])recapFixtures.set(`https://mutigers.com${path}`,story);
  const arkansas=soccer[1];
  await worker.missouriHandlers.attachArchiveStory(arkansas);
  assert.match(arkansas.recap_url,/\/news\/2026\/10\/0?3\/soccer-earns-first-sec-point-in-1-1-draw-at-arkansas$/);
  // A story with another score is not the match's.
  const other={...soccer[1],recap_url:undefined,school_score:2,opponent_score:1};delete other.recap_url;delete other.archive_story_verified;
  await worker.missouriHandlers.attachArchiveStory(other);
  assert.equal(other.recap_url,undefined);
  // Nor one that names another opponent; a final with its own story keeps it.
  const kentucky={...soccer[1],opponent:'Kentucky'};delete kentucky.recap_url;delete kentucky.archive_story_verified;
  await worker.missouriHandlers.attachArchiveStory(kentucky);
  assert.equal(kentucky.recap_url,undefined);
  const linked={...soccer[1],recap_url:'https://mutigers.com/news/2026/10/3/own-story'};
  await worker.missouriHandlers.attachArchiveStory(linked);
  assert.equal(linked.recap_url,'https://mutigers.com/news/2026/10/3/own-story');
  recapFixtures.clear();requests.length=0;
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/MO_college_f_Missouri.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/MO_college_m_Missouri.html','tfrrs-team-m.html.gz']]){
    const page=fixture(file);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[["Cyclone Opener","Women's team: 2nd · 34 pts / Men's team: 2nd · 40 pts",true],["Billiken Invitational","Women's team: 2nd · 48 pts / Men's team: 2nd · 55 pts",true],["Gans Creek Classic","Women's team: 1st · 56 pts / Men's team: 6th · 230 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Missouri's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Missouri vs Florida","Final","W, 45-17"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Missouri at LSU","Final","L, 2-3"]]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[["Missouri at Arkansas","Final","T, 1-1"]]);
}

// Records: each sport's overall and SEC record equals the one its page
// publishes (the first two win-loss records in the page data).
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const [overall,conference]=data.filter(value=>value&&!Array.isArray(value)&&typeof value==='object'&&Object.keys(value).sort().join()==='loses,pct,ties,wins').map(r=>[data[r.wins],data[r.loses],data[r.ties]]).map(([w,l,t])=>`${w}-${l}${t?`-${t}`:''}`);
    return[overall,conference];
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>{assert.deepEqual(record(sport,slug),[published(slug)],`${sport}: the computed records are the official ones`);return published(slug);}),[["4-1","1-1"],["8-7","1-2"],["3-7-2","0-4-1"]]);
}

// Other schools and other hosts never reach the Missouri reader.
assert.equal(worker.missouriHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://mutigers.com/',now),null);
assert.equal(worker.missouriHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Missouri module checks passed');
