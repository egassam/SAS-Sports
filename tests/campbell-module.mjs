import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {campbellSchool} from '../src/schools/campbell.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='campbell');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,campbellHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/campbell-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gocamels.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['campbell'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',campbellSchool.scheduleUrls],['roster',campbellSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('campbell|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gocamels.com',`${key} must stay on gocamels.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gocamels.com/sports/baseball/schedule"],"roster":["https://gocamels.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gocamels.com/sports/mens-basketball/schedule","https://gocamels.com/sports/womens-basketball/schedule"],"roster":["https://gocamels.com/sports/mens-basketball/roster","https://gocamels.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gocamels.com/sports/cross-country/schedule"],"roster":["https://gocamels.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gocamels.com/sports/football/schedule"],"roster":["https://gocamels.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gocamels.com/sports/womens-golf/schedule","https://gocamels.com/sports/mens-golf/schedule"],"roster":["https://gocamels.com/sports/womens-golf/roster","https://gocamels.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gocamels.com/sports/womens-lacrosse/schedule"],"roster":["https://gocamels.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gocamels.com/sports/womens-soccer/schedule","https://gocamels.com/sports/mens-soccer/schedule"],"roster":["https://gocamels.com/sports/womens-soccer/roster","https://gocamels.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gocamels.com/sports/softball/schedule"],"roster":["https://gocamels.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gocamels.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://gocamels.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gocamels.com/sports/womens-tennis/schedule","https://gocamels.com/sports/mens-tennis/schedule"],"roster":["https://gocamels.com/sports/womens-tennis/roster","https://gocamels.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gocamels.com/sports/track-and-field/schedule"],"roster":["https://gocamels.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gocamels.com/sports/womens-volleyball/schedule"],"roster":["https://gocamels.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gocamels.com/sports/wrestling/schedule"],"roster":["https://gocamels.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'campbell|"+sport+"':"),`${sport} routes must live in the Campbell module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gocamels.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.campbellHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=campbell)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · Campbell vs Francis Marion (Exhibition) | W, 91-80",
 "Upcoming Oct 25, 2:00 PM Men's · Campbell at South Carolina (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Campbell at NC State | ",
 "Upcoming Nov 8, 1:00 PM Men's · Campbell at Western Michigan | ",
 "Upcoming Nov 11, 7:00 PM Men's · Campbell at ETSU | ",
 "Upcoming Nov 14, 4:30 PM Men's · Campbell vs USC Upstate | ",
 "Upcoming Nov 18, 8:00 PM Men's · Campbell at Oklahoma | ",
 "Upcoming Nov 20, 8:00 PM Men's · Campbell at Kansas State | ",
 "Upcoming Nov 24, 7:00 PM Men's · Campbell at Coastal Carolina | ",
 "Upcoming Dec 2, 7:00 PM Men's · Campbell at Longwood | ",
 "Upcoming Dec 5, 2:00 PM Men's · Campbell vs Norfolk State | ",
 "Upcoming Dec 9, 7:30 PM Men's · Campbell at Davidson | ",
 "Upcoming Dec 12, 1:00 PM Men's · Campbell at Gardner-Webb | ",
 "Upcoming Dec 15, 7:00 PM Men's · Campbell at Duke | ",
 "Upcoming Dec 18, 7:00 PM Men's · Campbell at East Carolina | ",
 "Upcoming Dec 28, 7:30 PM Men's · Campbell at Mississippi State | ",
 "Upcoming Dec 31, 2:00 PM Men's · Campbell at UNCW | ",
 "Upcoming Jan 2, 12:00 PM Men's · Campbell vs Towson | ",
 "Upcoming Jan 7, 7:00 PM Men's · Campbell vs Elon | ",
 "Upcoming Jan 9, 2:00 PM Men's · Campbell vs NC A&T | ",
 "Upcoming Jan 14, 7:00 PM Men's · Campbell at Charleston | ",
 "Upcoming Jan 16, 2:00 PM Men's · Campbell at William & Mary | ",
 "Upcoming Jan 18, 7:00 PM Men's · Campbell vs Stony Brook | ",
 "Upcoming Jan 25, 8:30 PM Men's · Campbell at Hampton | ",
 "Upcoming Jan 28, 7:00 PM Men's · Campbell vs Hofstra | ",
 "Upcoming Jan 30, 4:00 PM Men's · Campbell vs UNCW | ",
 "Upcoming Feb 4, 7:00 PM Men's · Campbell at Monmouth | ",
 "Upcoming Feb 6, 2:00 PM Men's · Campbell at Stony Brook | ",
 "Upcoming Feb 11, 7:00 PM Men's · Campbell vs Drexel | ",
 "Upcoming Feb 13, 2:00 PM Men's · Campbell vs William & Mary | ",
 "Upcoming Feb 18, 7:00 PM Men's · Campbell at Northeastern | ",
 "Upcoming Feb 25, 7:00 PM Men's · Campbell at Elon | ",
 "Upcoming Feb 27, 2:00 PM Men's · Campbell at NC A&T | ",
 "Upcoming Mar 2, 7:00 PM Men's · Campbell vs Charleston | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Campbell vs Austin Peay | ",
 "Upcoming Nov 4, 6:00 PM Women's · Campbell at NC State | ",
 "Upcoming Nov 8, 1:00 PM Women's · Campbell at Davidson | ",
 "Upcoming Nov 11, 6:00 PM Women's · Campbell vs Radford | ",
 "Upcoming Nov 14, 2:00 PM Women's · Campbell vs Furman | ",
 "Upcoming Nov 17, 6:00 PM Women's · Campbell vs Fordham | ",
 "Upcoming Nov 20, 6:00 PM Women's · Campbell at Norfolk State | ",
 "Upcoming Nov 25, 6:00 PM Women's · Campbell at Mercer | ",
 "Upcoming Nov 29, 2:00 PM Women's · Campbell vs Coastal Carolina | ",
 "Upcoming Dec 2, 6:00 PM Women's · Campbell vs Western Kentucky | ",
 "Upcoming Dec 13, 5:00 PM Women's · Campbell at Virginia Tech | ",
 "Upcoming Dec 17, 11:00 AM Women's · Campbell at East Carolina | ",
 "Upcoming Dec 19, 12:00 PM Women's · Campbell vs USC Upstate | ",
 "Upcoming Dec 22, 11:00 AM Women's · Campbell at Richmond | ",
 "Upcoming Jan 1, 1:00 PM Women's · Campbell at William & Mary | ",
 "Upcoming Jan 3, 2:00 PM Women's · Campbell vs Hampton | ",
 "Upcoming Jan 8, 6:00 PM Women's · Campbell vs Drexel | ",
 "Upcoming Jan 15, 6:30 PM Women's · Campbell at Towson | ",
 "Upcoming Jan 17, 1:00 PM Women's · Campbell at Stony Brook | ",
 "Upcoming Jan 22, 6:00 PM Women's · Campbell vs Elon | ",
 "Upcoming Jan 24, 1:00 PM Women's · Campbell at UNCW | ",
 "Upcoming Jan 29, 6:00 PM Women's · Campbell vs William & Mary | ",
 "Upcoming Jan 31, 2:00 PM Women's · Campbell vs Monmouth | ",
 "Upcoming Feb 5, 7:00 PM Women's · Campbell at Northeastern | ",
 "Upcoming Feb 7, 1:00 PM Women's · Campbell at Hofstra | ",
 "Upcoming Feb 12, 6:00 PM Women's · Campbell vs Charleston | ",
 "Upcoming Feb 14, 2:00 PM Women's · Campbell vs North Carolina A&T | ",
 "Upcoming Feb 21, 2:00 PM Women's · Campbell vs Northeastern | ",
 "Upcoming Feb 26, 6:00 PM Women's · Campbell at Charleston | ",
 "Upcoming Feb 28, 2:00 PM Women's · Campbell at North Carolina A&T | ",
 "Upcoming Mar 4, 7:00 PM Women's · Campbell at Elon | ",
 "Upcoming Mar 6, 2:00 PM Women's · Campbell vs UNCW | ",
 "Upcoming Mar 10 Women's · Campbell at CAA Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Campbell at Elon Opener | Completed",
 "Final Sep 18 Campbell at Adidas XC Challenge | Completed",
 "Final Oct 2 Campbell at Richmond Invitational | Completed",
 "Final Oct 2 Campbell at Dill Family Invitational | Completed",
 "Final Oct 9 Campbell at Royals Cross Country Challenge | Completed",
 "Upcoming Oct 30 Campbell at CAA Conference Championship | ",
 "Upcoming Nov 13 Campbell at NCAA Southeast Regional Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Campbell at ETSU | W, 49-37",
 "Final Sep 6 Campbell vs Western Carolina | W, 28-19",
 "Final Sep 12 Campbell at Florida | L, 3-52",
 "Final Sep 19 Campbell vs North Carolina A&T | W, 42-14",
 "Final Sep 26 Campbell at Hampton | W, 44-20",
 "Final Oct 3 Campbell at North Carolina Central | W, 38-31",
 "Final Oct 17 Campbell vs Towson | W, 24-20",
 "Upcoming Oct 24, 1:00 PM Campbell at Maine | ",
 "Upcoming Oct 31, 12:00 PM Campbell at UAlbany | ",
 "Upcoming Nov 7, 1:00 PM Campbell vs Stony Brook | ",
 "Upcoming Nov 14, 2:00 PM Campbell at Elon | ",
 "Upcoming Nov 21, 12:00 PM Campbell vs Monmouth | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Campbell at Golfweek Fall Challenge | 2nd of 23",
 "Final Sep 14 Women's · Campbell at Brittany Kelly Classic | 2nd of 14",
 "Final Sep 28 Women's · Campbell at Tot Hill Farm Invitational | 1st of 12",
 "Final Oct 4 Women's · Campbell at Mercedes Benz Intercollegiate | 10th of 15",
 "Final Oct 19 Women's · Campbell at UNCG Collegiate | 3rd of 8",
 "Upcoming Feb 8, 8:00 AM Women's · Campbell at Appalachian State | ",
 "Upcoming Feb 26, 8:00 AM Women's · Campbell at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 15, 8:00 AM Women's · Campbell at Low Country Intercollegiate | ",
 "Upcoming Mar 21, 8:00 AM Women's · Campbell at City of Oaks Collegiate | ",
 "Upcoming Apr 5, 8:00 AM Women's · Campbell at Hokie-Highlander Collegiate | ",
 "Upcoming Apr 16, 8:00 AM Women's · Campbell at CAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Campbell at Myrtle Beach Golf Trips Intercollegiate | 5th of 16",
 "Final Sep 21 Men's · Campbell at FAU Invitational | 9th of 11",
 "Final Sep 27 Men's · Campbell at Carolina Cup Individual Championship | No team score (individuals only)",
 "Final Oct 5 Men's · Campbell at Nemacolin Collegiate Invitational | 5th of 16",
 "Final Oct 12 Men's · Campbell at Elon Phoenix Invitational | 1st of 17",
 "Final Oct 18 Men's · Campbell at Furman Intercollegiate | 1st of 15",
 "Upcoming Feb 15, 8:00 AM Men's · Campbell at Battle at Briar's Creek | ",
 "Upcoming Mar 1, 8:00 AM Men's · Campbell at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 8, 8:00 AM Men's · Campbell at Cleveland Golf Palmetto Intercollegiate | ",
 "Upcoming Mar 22, 8:00 AM Men's · Campbell at Seahawk Intercollegiate | ",
 "Upcoming Apr 5, 8:00 AM Men's · Campbell at Giles-Spratley Collegiate | ",
 "Upcoming Apr 10, 8:00 AM Men's · Campbell at Tar Heel Intercollegiate | ",
 "Upcoming Apr 25, 8:00 AM Men's · Campbell at CAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Campbell at Longwood | W, 2-0",
 "Final Aug 16 Women's · Campbell vs Appalachian State | L, 1-3",
 "Final Aug 20 Women's · Campbell at East Carolina | T, 0-0",
 "Final Aug 23 Women's · Campbell at Clemson | L, 0-5",
 "Final Aug 27 Women's · Campbell vs Charleston Southern | W, 5-0",
 "Final Aug 30 Women's · Campbell at Coastal Carolina | L, 1-2",
 "Final Sep 3 Women's · Campbell vs Queens | W, 3-0",
 "Final Sep 6 Women's · Campbell vs NC State | T, 1-1",
 "Final Sep 10 Women's · Campbell vs UNC Greensboro | L, 1-2",
 "Final Sep 20 Women's · Campbell at Elon | L, 0-2",
 "Final Sep 24 Women's · Campbell vs Hofstra | T, 1-1",
 "Final Sep 27 Women's · Campbell vs Stony Brook | T, 0-0",
 "Final Oct 2 Women's · Campbell at William & Mary | L, 1-2",
 "Final Oct 8 Women's · Campbell at Monmouth | L, 0-3",
 "Final Oct 11 Women's · Campbell at Northeastern | W, 3-0",
 "Final Oct 18 Women's · Campbell vs Hampton | W, 4-3",
 "Upcoming Oct 25, 1:00 PM Women's · Campbell vs Charleston | ",
 "Upcoming Nov 1, 1:00 PM Women's · Campbell at UNCW | ",
 "Upcoming Nov 5 Women's · Campbell at CAA Championship First Round | ",
 "Upcoming Nov 8 Women's · Campbell at CAA Championship Semifinals | ",
 "Upcoming Nov 14 Women's · Campbell at CAA Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Campbell vs Cal Baptist | L, 0-2",
 "Final Aug 23 Men's · Campbell vs Seton Hall | L, 2-3",
 "Final Aug 28 Men's · Campbell at Charleston | L, 1-2",
 "Final Sep 1 Men's · Campbell vs Longwood | L, 1-2",
 "Final Sep 5 Men's · Campbell vs Wofford | L, 1-2",
 "Final Sep 12 Men's · Campbell vs Elon | L, 0-3",
 "Final Sep 19 Men's · Campbell vs UNCW | L, 1-2",
 "Final Sep 22 Men's · Campbell vs Winthrop | T, 0-0",
 "Final Sep 26 Men's · Campbell at William & Mary | L, 1-2",
 "Final Oct 3 Men's · Campbell vs Charleston | L, 1-2",
 "Final Oct 6 Men's · Campbell at Coastal Carolina | L, 2-4",
 "Final Oct 9 Men's · Campbell at New Date\" href=\"https://www.uncwsports.com/\" target=\"_blank\">UNCW | L, 1-4",
 "Final Oct 14 Men's · Campbell vs Radford | T, 1-1",
 "Final Oct 20 Men's · Campbell vs Gardner-Webb | L, 2-5",
 "Upcoming Oct 24, 6:00 PM Men's · Campbell vs William & Mary | ",
 "Upcoming Oct 31, 7:00 PM Men's · Campbell at Elon | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 24, 11:00 AM Women's · Campbell at UNC Asheville | ",
 "Upcoming Nov 7 Women's · Campbell at ECU Quad Meet | ",
 "Upcoming Nov 20 Women's · Campbell at TYR '86 Invitational | ",
 "Upcoming Jan 9, 11:00 AM Women's · Campbell vs North Florida | ",
 "Upcoming Jan 22, 5:00 PM Women's · Campbell at TYR Senior Celebration | ",
 "Upcoming Feb 24 Women's · Campbell at CAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Campbell at Battle at the Beach | Completed",
 "Final Oct 15 Women's · Campbell at Regional ITA Championships | Completed",
 "Upcoming Oct 30 Women's · Campbell at Buccaneer Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Campbell at Joe Hunt Invite | Completed",
 "Final Sep 25 Men's · Campbell at CCU Battle at the Beach | Completed",
 "Final Oct 16 Men's · Campbell at UNCG Fall Invitational | Completed",
 "Upcoming Nov 6 Men's · Campbell at Charleston Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 6 Campbell at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 7 Campbell at JDL Early Bird Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Campbell vs Texas A&M - Corpus Christi | W, 3-2",
 "Final Aug 30 Campbell at Kansas State | L, 1-3",
 "Final Sep 4 Campbell vs Xavier | L, 2-3",
 "Final Sep 4 Campbell vs Southern Indiana | W, 3-1",
 "Final Sep 5 Campbell at Georgia Tech | L, 1-3",
 "Final Sep 11 Campbell vs Ball State | L, 0-3",
 "Final Sep 12 Campbell vs Stetson | W, 3-1",
 "Final Sep 12 Campbell vs Furman | L, 1-3",
 "Final Sep 17 Campbell vs Maryland | L, 0-3",
 "Final Sep 18 Campbell vs Old Dominion | W, 3-2",
 "Final Sep 19 Campbell at East Carolina | L, 0-3",
 "Final Sep 25 Campbell vs UNCW | W, 3-1",
 "Final Sep 26 Campbell vs UNCW | L, 1-3",
 "Final Oct 2 Campbell at Hofstra | L, 0-3",
 "Final Oct 3 Campbell at Hofstra | L, 1-3",
 "Final Oct 9 Campbell vs Towson | W, 3-1",
 "Final Oct 10 Campbell vs Towson | L, 1-3",
 "Final Oct 16 Campbell at Hampton | W, 3-0",
 "Final Oct 17 Campbell at Hampton | W, 3-0",
 "Today Oct 23, 6:00 PM Campbell vs NC A&T | ",
 "Upcoming Oct 24, 4:00 PM Campbell vs NC A&T | ",
 "Upcoming Oct 30, 6:00 PM Campbell at Elon | ",
 "Upcoming Oct 31, 3:00 PM Campbell at Elon | ",
 "Upcoming Nov 6, 6:00 PM Campbell vs Stony Brook | ",
 "Upcoming Nov 7, 2:00 PM Campbell vs Stony Brook | ",
 "Upcoming Nov 13, 6:00 PM Campbell at Charleston | ",
 "Upcoming Nov 14, 4:00 PM Campbell at Charleston | ",
 "Upcoming Nov 19 Campbell at CAA Championships | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Campbell vs Southeast Open | ",
 "Upcoming Nov 14, 3:00 PM Campbell vs Northern Colorado | ",
 "Upcoming Nov 21, 9:00 AM Campbell vs Life Open | ",
 "Upcoming Dec 10, 7:00 PM Campbell at Appalachian State | ",
 "Upcoming Dec 19, 7:00 PM Campbell at Nebraska | ",
 "Upcoming Dec 20, 12:00 PM Campbell vs Virginia | ",
 "Upcoming Jan 2, 10:00 AM Campbell at Southern Scuffle | ",
 "Upcoming Jan 8, 9:00 AM Campbell vs F&M Open | ",
 "Upcoming Jan 24, 1:00 PM Campbell vs George Mason | ",
 "Upcoming Jan 29, 7:00 PM Campbell vs VMI | ",
 "Upcoming Jan 31, 3:00 PM Campbell at The Citadel | ",
 "Upcoming Feb 5, 5:00 PM Campbell vs Presbyterian | ",
 "Upcoming Feb 5, 5:00 PM Campbell vs Bellarmine | ",
 "Upcoming Feb 5, 5:00 PM Campbell vs Air Force | ",
 "Upcoming Feb 12, 7:00 PM Campbell at Gardner-Webb | ",
 "Upcoming Feb 13, 7:00 PM Campbell at Chattanooga | ",
 "Upcoming Feb 19, 7:00 PM Campbell vs Davidson College | ",
 "Upcoming Feb 20 Campbell at North Carolina | ",
 "Upcoming Mar 6 Campbell at SoCon Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Campbell module checks passed");
