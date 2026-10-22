import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {riceSchool} from '../src/schools/rice.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='rice');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,riceHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/rice-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit riceowls.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['rice'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',riceSchool.scheduleUrls],['roster',riceSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('rice|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'riceowls.com',`${key} must stay on riceowls.com`);
  }
}
const parity={"Baseball":{"schedule":["https://riceowls.com/sports/baseball/schedule"],"roster":["https://riceowls.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://riceowls.com/sports/mens-basketball/schedule","https://riceowls.com/sports/womens-basketball/schedule"],"roster":["https://riceowls.com/sports/mens-basketball/roster","https://riceowls.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://riceowls.com/sports/womens-cross-country/schedule","https://riceowls.com/sports/mens-cross-country/schedule"],"roster":["https://riceowls.com/sports/womens-cross-country/roster","https://riceowls.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://riceowls.com/sports/football/schedule"],"roster":["https://riceowls.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://riceowls.com/sports/womens-golf/schedule","https://riceowls.com/sports/mens-golf/schedule"],"roster":["https://riceowls.com/sports/womens-golf/roster","https://riceowls.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://riceowls.com/sports/womens-soccer/schedule"],"roster":["https://riceowls.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://riceowls.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://riceowls.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://riceowls.com/sports/womens-tennis/schedule","https://riceowls.com/sports/mens-tennis/schedule"],"roster":["https://riceowls.com/sports/womens-tennis/roster","https://riceowls.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://riceowls.com/sports/womens-track-and-field/schedule","https://riceowls.com/sports/mens-track-and-field/schedule"],"roster":["https://riceowls.com/sports/womens-track-and-field/roster","https://riceowls.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://riceowls.com/sports/womens-volleyball/schedule"],"roster":["https://riceowls.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'rice|"+sport+"':"),`${sport} routes must live in the Rice module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://riceowls.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.riceHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=rice)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24 Rice vs McLennan CC (Exhibition) | ",
 "Upcoming Feb 19 Rice vs Kansas | ",
 "Upcoming Feb 20 Rice vs Kansas | ",
 "Upcoming Feb 21 Rice vs Kansas | ",
 "Upcoming Feb 23 Rice vs HCU | ",
 "Upcoming Feb 24 Rice vs Houston | ",
 "Upcoming Feb 26 Rice vs Columbia | ",
 "Upcoming Feb 27 Rice vs Columbia | ",
 "Upcoming Feb 28 Rice vs Columbia | ",
 "Upcoming Mar 2 Rice vs UTRGV | ",
 "Upcoming Mar 5 Rice at Cal State Fullerton | ",
 "Upcoming Mar 6 Rice at Cal State Fullerton | ",
 "Upcoming Mar 7 Rice at Cal State Fullerton | ",
 "Upcoming Mar 9 Rice vs Louisiana | ",
 "Upcoming Mar 10 Rice vs Lamar | ",
 "Upcoming Mar 12 Rice vs Abilene Christian | ",
 "Upcoming Mar 13 Rice vs Abilene Christian | ",
 "Upcoming Mar 14 Rice vs Abilene Christian | ",
 "Upcoming Mar 16 Rice at Arizona | ",
 "Upcoming Mar 17 Rice at Arizona | ",
 "Upcoming Mar 19 Rice at Texas State | ",
 "Upcoming Mar 20 Rice at Texas State | ",
 "Upcoming Mar 21 Rice at Texas State | ",
 "Upcoming Mar 23 Rice vs Texas A&M - Corpus Christi | ",
 "Upcoming Mar 25 Rice at FAU | ",
 "Upcoming Mar 26 Rice at FAU | ",
 "Upcoming Mar 27 Rice at FAU | ",
 "Upcoming Mar 30 Rice vs Baylor | ",
 "Upcoming Apr 2 Rice vs USF | ",
 "Upcoming Apr 3 Rice vs USF | ",
 "Upcoming Apr 4 Rice vs USF | ",
 "Upcoming Apr 7 Rice at Nicholls | ",
 "Upcoming Apr 9 Rice at Tulane | ",
 "Upcoming Apr 10 Rice at Tulane | ",
 "Upcoming Apr 11 Rice at Tulane | ",
 "Upcoming Apr 13 Rice at Houston | ",
 "Upcoming Apr 16 Rice vs Wichita State | ",
 "Upcoming Apr 17 Rice vs Wichita State | ",
 "Upcoming Apr 18 Rice vs Wichita State | ",
 "Upcoming Apr 21 Rice at UTRGV | ",
 "Upcoming Apr 23 Rice at Memphis | ",
 "Upcoming Apr 24 Rice at Memphis | ",
 "Upcoming Apr 25 Rice at Memphis | ",
 "Upcoming Apr 27 Rice vs Houston | ",
 "Upcoming Apr 30 Rice vs Charlotte | ",
 "Upcoming May 1 Rice vs Charlotte | ",
 "Upcoming May 2 Rice vs Charlotte | ",
 "Upcoming May 7 Rice at UTSA | ",
 "Upcoming May 8 Rice at UTSA | ",
 "Upcoming May 9 Rice at UTSA | ",
 "Upcoming May 11 Rice at Baylor | ",
 "Upcoming May 14 Rice vs East Carolina | ",
 "Upcoming May 15 Rice vs East Carolina | ",
 "Upcoming May 16 Rice vs East Carolina | ",
 "Upcoming May 20 Rice at UAB | ",
 "Upcoming May 21 Rice at UAB | ",
 "Upcoming May 22 Rice at UAB | ",
 "Upcoming May 25 Rice at American Conference Baseball Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Men's · Rice vs Dallas Christian | ",
 "Upcoming Nov 5, 7:00 PM Men's · Rice vs East Texas A&M | ",
 "Upcoming Nov 9, 9:00 PM Men's · Rice at Stanford | ",
 "Upcoming Nov 14, 1:00 PM Men's · Rice at Stephen F. Austin | ",
 "Upcoming Nov 17, 7:00 PM Men's · Rice vs Texas A&M - Corpus Christi | ",
 "Upcoming Nov 22, 4:00 PM Men's · Rice vs Lamar | ",
 "Upcoming Nov 24, 12:30 PM Men's · Rice vs UIC | ",
 "Upcoming Nov 25, 10:00 AM Men's · Rice vs Ohio | ",
 "Upcoming Nov 29 Men's · Rice at Arkansas State | ",
 "Upcoming Dec 4, 7:00 PM Men's · Rice vs Sam Houston | ",
 "Upcoming Dec 10, 7:00 PM Men's · Rice vs Nicholls | ",
 "Upcoming Dec 16, 11:00 AM Men's · Rice vs College of Biblical Studies | ",
 "Upcoming Dec 19, 2:00 PM Men's · Rice at Denver | ",
 "Upcoming Dec 22, 1:00 PM Men's · Rice vs Texas Southern | ",
 "Upcoming Dec 30 Men's · Rice vs Temple | ",
 "Upcoming Jan 3 Men's · Rice at Tulane | ",
 "Upcoming Jan 6 Men's · Rice at Memphis | ",
 "Upcoming Jan 10 Men's · Rice vs North Texas | ",
 "Upcoming Jan 17 Men's · Rice at Temple | ",
 "Upcoming Jan 20 Men's · Rice vs UTSA | ",
 "Upcoming Jan 23 Men's · Rice at Florida Atlantic | ",
 "Upcoming Jan 26 Men's · Rice at South Florida | ",
 "Upcoming Jan 30 Men's · Rice vs Tulane | ",
 "Upcoming Feb 4 Men's · Rice vs East Carolina | ",
 "Upcoming Feb 7 Men's · Rice at UTSA | ",
 "Upcoming Feb 11 Men's · Rice vs Tulsa | ",
 "Upcoming Feb 14 Men's · Rice vs Wichita State | ",
 "Upcoming Feb 17 Men's · Rice at East Carolina | ",
 "Upcoming Feb 20 Men's · Rice at Charlotte | ",
 "Upcoming Feb 25 Men's · Rice vs UAB | ",
 "Upcoming Feb 28 Men's · Rice vs Florida Atlantic | ",
 "Upcoming Mar 7 Men's · Rice at North Texas | ",
 "Upcoming Mar 10 Men's · Rice at American Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Women's · Rice vs Eastern New Mexico (Exhibition) | ",
 "Upcoming Nov 2, 8:25 PM Women's · Rice vs Houston Christian | ",
 "Upcoming Nov 6 Women's · Rice vs Murray State | ",
 "Upcoming Nov 8 Women's · Rice at Richmond | ",
 "Upcoming Nov 12 Women's · Rice vs Texas Southern | ",
 "Upcoming Nov 17, 8:30 PM Women's · Rice at UNLV | ",
 "Upcoming Nov 22, 7:00 PM Women's · Rice vs Pepperdine | ",
 "Upcoming Nov 25, 12:00 PM Women's · Rice vs UTRGV | ",
 "Upcoming Nov 27, 3:00 PM Women's · Rice vs Lamar | ",
 "Upcoming Dec 2, 7:00 PM Women's · Rice vs Grambling State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Rice vs Princeton | ",
 "Upcoming Dec 11, 11:15 AM Women's · Rice vs Houston | ",
 "Upcoming Dec 17 Women's · Rice at Middle Tennessee | ",
 "Upcoming Dec 20, 2:00 PM Women's · Rice vs Prairie View A&M | ",
 "Upcoming Dec 30 Women's · Rice at East Carolina | ",
 "Upcoming Jan 2 Women's · Rice at Temple | ",
 "Upcoming Jan 6, 7:00 PM Women's · Rice vs Florida Atlantic | ",
 "Upcoming Jan 9, 2:00 PM Women's · Rice vs North Texas | ",
 "Upcoming Jan 16 Women's · Rice at UTSA | ",
 "Upcoming Jan 20 Women's · Rice at UAB | ",
 "Upcoming Jan 24, 2:00 PM Women's · Rice vs Tulsa | ",
 "Upcoming Jan 27 Women's · Rice at Tulane | ",
 "Upcoming Jan 31, 2:00 PM Women's · Rice vs Charlotte | ",
 "Upcoming Feb 6, 2:00 PM Women's · Rice vs Memphis | ",
 "Upcoming Feb 9 Women's · Rice at Wichita State | ",
 "Upcoming Feb 13 Women's · Rice at Tulsa | ",
 "Upcoming Feb 17, 7:00 PM Women's · Rice vs East Carolina | ",
 "Upcoming Feb 20 Women's · Rice at South Florida | ",
 "Upcoming Feb 24, 7:00 PM Women's · Rice vs Temple | ",
 "Upcoming Feb 27, 2:00 PM Women's · Rice vs UTSA | ",
 "Upcoming Mar 3 Women's · Rice at North Texas | ",
 "Upcoming Mar 6, 2:00 PM Women's · Rice vs South Florida | ",
 "Upcoming Mar 9 Women's · Rice at American Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 Women's · Rice at Rice Invitational | 1st of 8",
 "Final Sep 25 Women's · Rice at Gans Creek Classic | Completed",
 "Final Oct 3 Women's · Rice at SU Showdown | 2nd of 13",
 "Final Oct 16 Women's · Rice at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31 Women's · Rice at American Conference Championships | ",
 "Upcoming Nov 13 Women's · Rice at NCAA South Central Regional | ",
 "Upcoming Nov 21 Women's · Rice at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 11 Men's · Rice at Rice Invitational | 1st of 7",
 "Final Sep 25 Men's · Rice at Gans Creek Classic | Completed",
 "Final Oct 16 Men's · Rice at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31 Men's · Rice at American Conference Championships | ",
 "Upcoming Nov 13 Men's · Rice at NCAA South Central Regional | ",
 "Upcoming Nov 21 Men's · Rice at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Rice vs HCU | W, 31-3",
 "Final Sep 12 Rice at Notre Dame | L, 0-52",
 "Final Sep 19 Rice vs Western Michigan | L, 21-28",
 "Final Sep 26 Rice at Fresno State | L, 24-38",
 "Final Oct 3 Rice vs UTSA | L, 14-16",
 "Final Oct 10 Rice at East Carolina | L, 12-28",
 "Final Oct 17 Rice vs Tulsa | L, 17-38",
 "Upcoming Oct 24, 11:00 AM Rice at Florida Atlantic | ",
 "Upcoming Nov 7 Rice at North Texas | ",
 "Upcoming Nov 14 Rice vs Tulane | ",
 "Upcoming Nov 19, 6:30 PM Rice at Temple | ",
 "Upcoming Nov 28 Rice vs Army | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 18 Women's · Rice at Lady Paladin Invitational | 10th",
 "Final Oct 3 Women's · Rice at Blessings Collegiate Invitational | T7th",
 "Final Oct 12 Women's · Rice at Illini Women's Invitational at Medinah | T13th",
 "Final Oct 18 Women's · Rice at Jim West Challenge | 8th",
 "Upcoming Jan 29 Women's · Rice at Collegiate Invitational at GCC | ",
 "Upcoming Feb 8 Women's · Rice at Houston Invitational | ",
 "Upcoming Feb 22 Women's · Rice at Chevron Collegiate | ",
 "Upcoming Mar 15 Women's · Rice at Briar's Creek Invitational | ",
 "Upcoming Mar 22 Women's · Rice at Bell Bank \"Pay It Forward\" | ",
 "Upcoming Apr 5 Women's · Rice at The \"Mo\"Morial | ",
 "Upcoming Apr 19 Women's · Rice at American Championship | ",
 "Upcoming May 10 Women's · Rice at NCAA Regionals | ",
 "Upcoming May 21 Women's · Rice at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Rice at Jackson T. Stephens Cup | Match play: 0-0-1",
 "Final Sep 21 Men's · Rice at Bayou City Collegiate Classic | 1st",
 "Final Oct 4 Men's · Rice at Trinity Forest Invitational | 7th",
 "Final Oct 19 Men's · Rice at Abilene Christian Intercollegiate | 7th",
 "Upcoming Oct 31 Men's · Rice at Steelwood Collegiate Invitational | ",
 "Upcoming Feb 8 Men's · Rice at Bentwater Intercollegiate | ",
 "Upcoming Feb 15 Men's · Rice at Hal Williams Collegiate | ",
 "Upcoming Feb 28 Men's · Rice at Cabo Collegiate | ",
 "Upcoming Mar 15 Men's · Rice at All-American Intercollegiate | ",
 "Upcoming Mar 22 Men's · Rice at Valspar Collegiate Invitational | ",
 "Upcoming Apr 10 Men's · Rice at Aggie Invitational | ",
 "Upcoming Apr 25 Men's · Rice at American Championship | ",
 "Upcoming May 17 Men's · Rice at NCAA Regionals | ",
 "Upcoming May 28 Men's · Rice at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Rice vs Texas A&M | L, 1-2",
 "Final Aug 15 Rice at Navy | W, 3-0",
 "Final Aug 20 Rice at HCU | T, 1-1",
 "Final Aug 23 Rice vs Lamar | T, 1-1",
 "Final Aug 27 Rice vs Vanderbilt | L, 1-3",
 "Final Sep 3 Rice at Texas State | L, 3-4",
 "Final Sep 6 Rice at Florida State | T, 1-1",
 "Final Sep 10 Rice vs UL-Monroe | W, 3-0",
 "Final Sep 17 Rice at Memphis | L, 0-2",
 "Final Sep 24 Rice vs Temple | W, 5-1",
 "Final Sep 27 Rice vs Tulsa | L, 0-3",
 "Final Oct 2 Rice at UTSA | W, 3-0",
 "Final Oct 8 Rice vs UAB | L, 0-3",
 "Final Oct 11 Rice at East Carolina | T, 2-2",
 "Final Oct 15 Rice vs North Texas | T, 3-3",
 "Today Oct 22, 6:00 PM Rice at South Florida | ",
 "Upcoming Oct 25, 12:00 PM Rice at Florida Atlantic | ",
 "Upcoming Oct 30, 12:30 PM Rice vs Charlotte | ",
 "Upcoming Nov 8 Rice at American Conference Quarterfinal | ",
 "Upcoming Nov 11 Rice at American Conference Semifinal | ",
 "Upcoming Nov 14 Rice at American Conference Championship | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Rice at Rice Fall Splash Invitational | Completed",
 "Upcoming Oct 23, 4:00 PM Women's · Rice vs Arkansas | ",
 "Upcoming Nov 6 Women's · Rice at Houston/Tulane | ",
 "Upcoming Nov 7, 10:00 AM Women's · Rice vs Tulane | ",
 "Upcoming Nov 17 Women's · Rice at Phill Hansel Invitational | ",
 "Upcoming Dec 12 Women's · Rice at CSCA Open Water Championship | ",
 "Upcoming Dec 19, 10:00 AM Women's · Rice at FAU Fun Meet | ",
 "Upcoming Jan 8, 2:30 PM Women's · Rice vs RICE Double Up Meet | ",
 "Upcoming Jan 21, 6:00 PM Women's · Rice at North Texas | ",
 "Upcoming Jan 22, 5:00 PM Women's · Rice at Little Rock | ",
 "Upcoming Jan 23, 10:00 AM Women's · Rice at Little Rock/Arkansas | ",
 "Upcoming Jan 30, 10:00 AM Women's · Rice at Houston | ",
 "Upcoming Feb 5 Women's · Rice at First Chance Meet | ",
 "Upcoming Feb 17 Women's · Rice at Conference Championship | ",
 "Upcoming Mar 11 Women's · Rice at CSCAA National Invitational | ",
 "Upcoming Mar 17 Women's · Rice at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Rice at ITA Women's All-American Championships | Completed",
 "Final Sep 25 Women's · Rice at Rice Invite | Completed",
 "Final Oct 8 Women's · Rice at ITA Texas Women's Regional Championships | Completed",
 "Today Oct 22 Women's · Rice at American Individual Tennis Championships | ",
 "Today Oct 22 Women's · Rice at JAE Foundation Invite | ",
 "Upcoming Oct 29 Women's · Rice at H-E-B Invitational | ",
 "Upcoming Nov 5 Women's · Rice at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Rice at ITA Conference Masters | ",
 "Upcoming Nov 17 Women's · Rice at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Aug 29 Men's · Rice at HotelPlanner UTR | Completed",
 "Final Sep 11 Men's · Rice at Midland Racquet Club Collegiate Invitational | Completed",
 "Final Sep 19 Men's · Rice at ITA Men's All-American Championships | Completed",
 "Final Oct 2 Men's · Rice at Torreon College Invite | Completed",
 "Final Oct 8 Men's · Rice at ITA Texas Men's Regional Championships | Completed",
 "Final Oct 16 Men's · Rice at Ralph O'Connor Invitational | Completed",
 "Today Oct 22 Men's · Rice at American Individual Tennis Championships | ",
 "Upcoming Oct 30 Men's · Rice at SMU Invitational | ",
 "Upcoming Nov 5 Men's · Rice at ITA Conference Masters | ",
 "Upcoming Nov 9 Men's · Rice at Houston PTT | ",
 "Upcoming Nov 19 Men's · Rice at NCAA Individual Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Jan 16 Women's · Rice at R. G. LeTourneau Invitational | ",
 "Upcoming Jan 22 Women's · Rice at Ted Nelson Invite | ",
 "Upcoming Feb 5 Women's · Rice at Charlie Thomas Invite | ",
 "Upcoming Feb 12 Women's · Rice at Jarvis Scott Invite | ",
 "Upcoming Feb 12 Women's · Rice at Indoor Music City Challenge | ",
 "Upcoming Feb 26 Women's · Rice at American Indoor Championships | ",
 "Upcoming Mar 12 Women's · Rice at NCAA Indoor Championships | ",
 "Upcoming Mar 18 Women's · Rice at Kirk Baptiste Spring Break Invite | ",
 "Upcoming Mar 25 Women's · Rice at Victor Lopez Classic | ",
 "Upcoming Mar 31 Women's · Rice at Texas Relays | ",
 "Upcoming Apr 8 Women's · Rice at 44 Farms Team Invitational | ",
 "Upcoming Apr 15 Women's · Rice at Bryan Clay Invite | ",
 "Upcoming Apr 15 Women's · Rice at Beach Invite | ",
 "Upcoming Apr 16 Women's · Rice at Tom Tellez Invite | ",
 "Upcoming Apr 24 Women's · Rice at J. Fred Duckett Twilight | ",
 "Upcoming Apr 28 Women's · Rice at Cameron Burrell Invite | ",
 "Upcoming Apr 30 Women's · Rice at Alumni Muster | ",
 "Upcoming May 13 Women's · Rice at American Outdoor Championships | ",
 "Upcoming May 26 Women's · Rice at NCAA West Prelims | ",
 "Upcoming Jun 9 Women's · Rice at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Jan 16 Men's · Rice at R. G. LeTourneau Invitational | ",
 "Upcoming Jan 22 Men's · Rice at Ted Nelson Invite | ",
 "Upcoming Feb 5 Men's · Rice at Charlie Thomas Invite | ",
 "Upcoming Feb 12 Men's · Rice at Jarvis Scott Invite | ",
 "Upcoming Feb 12 Men's · Rice at Indoor Music City Challenge | ",
 "Upcoming Feb 26 Men's · Rice at American Indoor Championships | ",
 "Upcoming Mar 12 Men's · Rice at NCAA Indoor Championships | ",
 "Upcoming Mar 18 Men's · Rice at Kirk Baptiste Spring Break Invite | ",
 "Upcoming Mar 25 Men's · Rice at Victor Lopez Classic | ",
 "Upcoming Mar 31 Men's · Rice at Texas Relays | ",
 "Upcoming Apr 8 Men's · Rice at 44 Farms Team Invitational | ",
 "Upcoming Apr 15 Men's · Rice at Bryan Clay Invite | ",
 "Upcoming Apr 15 Men's · Rice at Beach Invite | ",
 "Upcoming Apr 16 Men's · Rice at Tom Tellez Invite | ",
 "Upcoming Apr 24 Men's · Rice at J. Fred Duckett Twilight | ",
 "Upcoming Apr 28 Men's · Rice at Cameron Burrell Invite | ",
 "Upcoming Apr 30 Men's · Rice at Alumni Muster | ",
 "Upcoming May 13 Men's · Rice at American Outdoor Championships | ",
 "Upcoming May 26 Men's · Rice at NCAA West Prelims | ",
 "Upcoming Jun 9 Men's · Rice at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Rice at South Alabama | W, 3-2",
 "Final Aug 29 Rice vs Georgia State | W, 3-1",
 "Final Aug 30 Rice vs Mississippi State | W, 3-1",
 "Final Sep 2 Rice vs Tarleton State | W, 3-1",
 "Final Sep 4 Rice vs McNeese State | W, 3-0",
 "Final Sep 6 Rice vs Illinois | L, 0-3",
 "Final Sep 11 Rice vs Louisville | L, 1-3",
 "Final Sep 12 Rice vs UNI | L, 0-3",
 "Final Sep 13 Rice vs Creighton | W, 3-1",
 "Final Sep 17 Rice vs SMU | L, 0-3",
 "Final Sep 18 Rice at TCU | L, 1-3",
 "Final Sep 22 Rice at Texas A&M | L, 0-3",
 "Final Sep 25 Rice vs ECU | L, 1-3",
 "Final Sep 27 Rice vs UAB | W, 3-2",
 "Final Oct 2 Rice at South Florida | L, 0-3",
 "Final Oct 4 Rice at FAU | W, 3-1",
 "Final Oct 9 Rice vs Wichita State | W, 3-0",
 "Final Oct 11 Rice vs Memphis | W, 3-1",
 "Final Oct 16 Rice at Tulsa | W, 3-1",
 "Final Oct 18 Rice at Wichita State | W, 3-1",
 "Upcoming Oct 23, 6:00 PM Rice at North Texas | ",
 "Upcoming Oct 25, 1:00 PM Rice vs Tulsa | ",
 "Upcoming Oct 28, 6:00 PM Rice vs Tulane | ",
 "Upcoming Oct 30, 7:00 PM Rice vs South Florida | ",
 "Upcoming Nov 6, 6:00 PM Rice at UTSA | ",
 "Upcoming Nov 8, 12:00 PM Rice at Temple | ",
 "Upcoming Nov 13, 6:00 PM Rice vs Charlotte | ",
 "Upcoming Nov 15, 1:00 PM Rice at Tulane | ",
 "Upcoming Nov 20 Rice at American Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Rice module checks passed");
