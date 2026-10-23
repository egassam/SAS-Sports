import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {austinPeaySchool} from '../src/schools/austin-peay.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='austin-peay');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,austinPeayHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/austin-peay-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit letsgopeay.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['austin-peay'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',austinPeaySchool.scheduleUrls],['roster',austinPeaySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('austin-peay|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'letsgopeay.com',`${key} must stay on letsgopeay.com`);
  }
}
const parity={"Baseball":{"schedule":["https://letsgopeay.com/sports/baseball/schedule"],"roster":["https://letsgopeay.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://letsgopeay.com/sports/mens-basketball/schedule","https://letsgopeay.com/sports/womens-basketball/schedule"],"roster":["https://letsgopeay.com/sports/mens-basketball/roster","https://letsgopeay.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://letsgopeay.com/sports/womens-beach-volleyball/schedule"],"roster":["https://letsgopeay.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://letsgopeay.com/sports/womens-cross-country/schedule","https://letsgopeay.com/sports/mens-cross-country/schedule"],"roster":["https://letsgopeay.com/sports/womens-cross-country/roster","https://letsgopeay.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://letsgopeay.com/sports/football/schedule"],"roster":["https://letsgopeay.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://letsgopeay.com/sports/womens-golf/schedule","https://letsgopeay.com/sports/mens-golf/schedule"],"roster":["https://letsgopeay.com/sports/womens-golf/roster","https://letsgopeay.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://letsgopeay.com/sports/womens-lacrosse/schedule"],"roster":["https://letsgopeay.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://letsgopeay.com/sports/womens-soccer/schedule"],"roster":["https://letsgopeay.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://letsgopeay.com/sports/softball/schedule"],"roster":["https://letsgopeay.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://letsgopeay.com/sports/womens-tennis/schedule","https://letsgopeay.com/sports/mens-tennis/schedule"],"roster":["https://letsgopeay.com/sports/womens-tennis/roster","https://letsgopeay.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://letsgopeay.com/sports/track-and-field/schedule"],"roster":["https://letsgopeay.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://letsgopeay.com/sports/womens-volleyball/schedule"],"roster":["https://letsgopeay.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'austin-peay|"+sport+"':"),`${sport} routes must live in the Austin Peay module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://letsgopeay.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.austinPeayHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=austin-peay)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · Austin Peay vs Evansville (Exhibition) | W, 79-74",
 "Upcoming Oct 27, 7:00 PM Men's · Austin Peay vs IU Indy (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Austin Peay vs Lane | ",
 "Upcoming Nov 6, 6:00 PM Men's · Austin Peay at Kennesaw State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Austin Peay vs Livingstone | ",
 "Upcoming Nov 14, 6:00 PM Men's · Austin Peay at Wichita State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Austin Peay vs Life | ",
 "Upcoming Nov 21, 2:00 PM Men's · Austin Peay vs UTRGV | ",
 "Upcoming Nov 28, 5:30 PM Men's · Austin Peay at Furman | ",
 "Upcoming Dec 2, 8:00 PM Men's · Austin Peay at Wyoming | ",
 "Upcoming Dec 5, 4:30 PM Men's · Austin Peay vs Kennesaw State | ",
 "Upcoming Dec 10, 7:00 PM Men's · Austin Peay vs Air Force | ",
 "Upcoming Dec 15, 9:00 PM Men's · Austin Peay at Seattle | ",
 "Upcoming Dec 19, 2:00 PM Men's · Austin Peay vs Bellarmine | ",
 "Upcoming Dec 21, 7:00 PM Men's · Austin Peay vs Lipscomb | ",
 "Upcoming Dec 28, 7:00 PM Men's · Austin Peay vs UT Southern | ",
 "Upcoming Dec 31, 1:00 PM Men's · Austin Peay at Queens | ",
 "Upcoming Jan 2, 1:00 PM Men's · Austin Peay at West Florida | ",
 "Upcoming Jan 6, 7:30 PM Men's · Austin Peay vs Eastern Kentucky | ",
 "Upcoming Jan 9, 5:00 PM Men's · Austin Peay at North Alabama | ",
 "Upcoming Jan 13, 7:00 PM Men's · Austin Peay at UT Arlington | ",
 "Upcoming Jan 16, 4:30 PM Men's · Austin Peay vs Tarleton State | ",
 "Upcoming Jan 20, 7:00 PM Men's · Austin Peay vs Central Arkansas | ",
 "Upcoming Jan 27, 7:00 PM Men's · Austin Peay at Abilene Christian | ",
 "Upcoming Jan 30, 4:00 PM Men's · Austin Peay at Tarleton State | ",
 "Upcoming Feb 3, 7:30 PM Men's · Austin Peay vs Little Rock | ",
 "Upcoming Feb 6, 4:30 PM Men's · Austin Peay vs UT Arlington | ",
 "Upcoming Feb 10, 7:30 PM Men's · Austin Peay vs Abilene Christian | ",
 "Upcoming Feb 13, 1:00 PM Men's · Austin Peay at West Georgia | ",
 "Upcoming Feb 17, 6:00 PM Men's · Austin Peay at Eastern Kentucky | ",
 "Upcoming Feb 24, 7:00 PM Men's · Austin Peay vs West Georgia | ",
 "Upcoming Feb 27, 4:00 PM Men's · Austin Peay vs North Alabama | ",
 "Upcoming Mar 3, 7:00 PM Men's · Austin Peay at Little Rock | ",
 "Upcoming Mar 6, 3:30 PM Men's · Austin Peay at Central Arkansas | ",
 "Upcoming Mar 10 Men's · Austin Peay at United Athletic Conference Basketball Tournament First Round | ",
 "Upcoming Mar 11 Men's · Austin Peay at United Athletic Conference Basketball Tournament Quarterfinals | ",
 "Upcoming Mar 12 Men's · Austin Peay at United Athletic Conference Basketball Tournament Semifinals | ",
 "Upcoming Mar 13 Men's · Austin Peay at United Athletic Conference Basketball Tournament Championship | ",
 "Upcoming Mar 16 Men's · Austin Peay at NCAA Division I Men's Basketball Championship | ",
 "Upcoming Mar 18 Men's · Austin Peay at NCAA Division I Men's Basketball Championship First Round | ",
 "Upcoming Mar 20 Men's · Austin Peay at NCAA Division I Men's Basketball Championship Second Round | ",
 "Upcoming Mar 25 Men's · Austin Peay at NCAA Division I Men's Basketball Championship | ",
 "Upcoming Mar 27 Men's · Austin Peay at NCAA Division I Men's Basketball Championship | ",
 "Upcoming Apr 3 Men's · Austin Peay vs Final Four | ",
 "Upcoming Apr 5 Men's · Austin Peay at National Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Austin Peay at Campbell | ",
 "Upcoming Nov 6, 6:00 PM Women's · Austin Peay vs Southeastern Baptist | ",
 "Upcoming Nov 11, 6:00 PM Women's · Austin Peay at Central Florida | ",
 "Upcoming Nov 19, 6:00 PM Women's · Austin Peay vs Chattanooga | ",
 "Upcoming Nov 28, 2:00 PM Women's · Austin Peay vs Evansville | ",
 "Upcoming Dec 3, 6:00 PM Women's · Austin Peay vs Kansas City | ",
 "Upcoming Dec 5, 2:00 PM Women's · Austin Peay vs UIC | ",
 "Upcoming Dec 9, 5:30 PM Women's · Austin Peay at Bellarmine | ",
 "Upcoming Dec 13, 2:00 PM Women's · Austin Peay at Murray State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Austin Peay at Lipscomb | ",
 "Upcoming Dec 20, 5:00 PM Women's · Austin Peay at Missouri | ",
 "Upcoming Dec 22, 1:00 PM Women's · Austin Peay at Missouri State | ",
 "Upcoming Dec 31, 1:00 PM Women's · Austin Peay vs Queens | ",
 "Upcoming Jan 2, 2:00 PM Women's · Austin Peay vs West Florida | ",
 "Upcoming Jan 6, 5:00 PM Women's · Austin Peay vs Eastern Kentucky | ",
 "Upcoming Jan 9, 2:00 PM Women's · Austin Peay vs North Alabama | ",
 "Upcoming Jan 13, 6:00 PM Women's · Austin Peay vs Abilene Christian | ",
 "Upcoming Jan 16, 2:00 PM Women's · Austin Peay vs West Georgia | ",
 "Upcoming Jan 23, 2:00 PM Women's · Austin Peay at UT Arlington | ",
 "Upcoming Jan 27, 5:00 PM Women's · Austin Peay at Central Arkansas | ",
 "Upcoming Jan 30, 1:00 PM Women's · Austin Peay at Little Rock | ",
 "Upcoming Feb 3, 5:00 PM Women's · Austin Peay vs Tarleton State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Austin Peay vs UT Arlington | ",
 "Upcoming Feb 10, 5:00 PM Women's · Austin Peay vs Little Rock | ",
 "Upcoming Feb 13, 3:30 PM Women's · Austin Peay at North Alabama | ",
 "Upcoming Feb 20, 2:00 PM Women's · Austin Peay vs Central Arkansas | ",
 "Upcoming Feb 24, 5:30 PM Women's · Austin Peay at Tarleton State | ",
 "Upcoming Feb 27, 1:00 PM Women's · Austin Peay at Abilene Christian | ",
 "Upcoming Mar 3, 4:30 PM Women's · Austin Peay at West Georgia | ",
 "Upcoming Mar 6, 12:00 PM Women's · Austin Peay at Eastern Kentucky | ",
 "Upcoming Mar 10 Women's · Austin Peay at United Athletic Conference Basketball Tournament First Round | ",
 "Upcoming Mar 11 Women's · Austin Peay at United Athletic Conference Basketball Tournament Quarterfinals | ",
 "Upcoming Mar 12 Women's · Austin Peay at United Athletic Conference Basketball Tournament Semifinals | ",
 "Upcoming Mar 13 Women's · Austin Peay at United Athletic Conference Basketball Tournament Championship | ",
 "Upcoming Mar 17 Women's · Austin Peay at NCAA Division I Women's Basketball Championship | ",
 "Upcoming Mar 19 Women's · Austin Peay at NCAA Division I Women's Basketball Championship First Round | ",
 "Upcoming Mar 21 Women's · Austin Peay at NCAA Division I Women's Basketball Championship Second Round | ",
 "Upcoming Mar 26 Women's · Austin Peay at NCAA Division I Women's Basketball Championship | ",
 "Upcoming Mar 28 Women's · Austin Peay at NCAA Division I Women's Basketball Championship | ",
 "Upcoming Apr 2 Women's · Austin Peay vs Final Four | ",
 "Upcoming Apr 4 Women's · Austin Peay at National Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Austin Peay at Golden Eagle Invitational | 4th of 4",
 "Final Sep 26 Women's · Austin Peay at Michael Pretorius Invitational | 2nd of 4",
 "Final Oct 2 Women's · Austin Peay at Nike XC Town Twilight | 12th of 16",
 "Final Oct 16 Women's · Austin Peay at Kennemer Classic | 4th of 12",
 "Upcoming Oct 30 Women's · Austin Peay at UAC Championships | ",
 "Upcoming Nov 13 Women's · Austin Peay at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Women's · Austin Peay at National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Austin Peay at Golden Eagle Invitational | 4th of 5",
 "Final Sep 26 Men's · Austin Peay at Michael Pretorius Invitational | 3rd of 5",
 "Final Oct 2 Men's · Austin Peay at Nike XC Town Twilight | 10th of 15",
 "Final Oct 16 Men's · Austin Peay at Kennemer Classic | 6th of 12",
 "Upcoming Oct 30 Men's · Austin Peay at UAC Championships | ",
 "Upcoming Nov 13 Men's · Austin Peay at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Men's · Austin Peay at National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Austin Peay vs Gardner-Webb | W, 35-17",
 "Final Sep 5 Austin Peay at Vanderbilt | L, 9-28",
 "Final Sep 12 Austin Peay vs Morehead State | W, 63-7",
 "Final Sep 19 Austin Peay at West Florida | W, 38-16",
 "Final Sep 26 Austin Peay vs UT Martin | W, 35-12",
 "Final Oct 3 Austin Peay vs New Haven | W, 42-17",
 "Final Oct 10 Austin Peay vs Tarleton State | L, 32-40",
 "Final Oct 17 Austin Peay at West Georgia | W, 24-10",
 "Upcoming Oct 24, 6:00 PM Austin Peay at North Alabama | ",
 "Upcoming Nov 7, 3:00 PM Austin Peay vs Eastern Kentucky | ",
 "Upcoming Nov 14, 1:00 PM Austin Peay vs Abilene Christian | ",
 "Upcoming Nov 21, 4:00 PM Austin Peay at Central Arkansas | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Austin Peay at Golfweek Program Challenge | 3rd",
 "Final Sep 14 Women's · Austin Peay at The Velvet | 2nd",
 "Final Sep 27 Women's · Austin Peay at Battle of the Border | Match play: 0-1",
 "Final Oct 5 Women's · Austin Peay at Butler Fall Invitational | 2nd",
 "Final Oct 12 Women's · Austin Peay at Lady Red Wolves Classic | 3rd",
 "Upcoming Mar 1 Women's · Austin Peay at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 14 Women's · Austin Peay at Southern California Invitational | ",
 "Upcoming Mar 22 Women's · Austin Peay at Nashville Invitational | ",
 "Upcoming Mar 29 Women's · Austin Peay at E.H. Powers Memorial Intercollegiate | ",
 "Upcoming Apr 10 Women's · Austin Peay at Jan Weaver Invitational | ",
 "Upcoming Apr 23 Women's · Austin Peay at United Athletic Conference Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Austin Peay at Inverness Intercollegiate | 18th",
 "Final Sep 20 Men's · Austin Peay at GMAC Invitational | T6th",
 "Final Oct 12 Men's · Austin Peay at Bubba Barnett Intercollegiate | 2nd",
 "Final Oct 19 Men's · Austin Peay at Bank of Tennessee Intercollegiate | T7th",
 "Upcoming Feb 28 Men's · Austin Peay at Loyola Intercollegiate | ",
 "Upcoming Mar 12 Men's · Austin Peay at Seminole Intercollegiate | ",
 "Upcoming Mar 21 Men's · Austin Peay at UC-San Diego Invitational | ",
 "Upcoming Apr 5 Men's · Austin Peay at Racer Intercollegiate | ",
 "Upcoming Apr 12 Men's · Austin Peay at Karen Edwards Memorial Intercollegiate Hosted by Austin Peay | ",
 "Upcoming Apr 30 Men's · Austin Peay at UAC Men's Golf Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Austin Peay vs Northern Kentucky | L, 1-4",
 "Final Aug 16 Austin Peay vs Tennessee Tech | L, 0-1",
 "Final Aug 20 Austin Peay at SIUE | L, 0-3",
 "Final Aug 23 Austin Peay at Chattanooga | L, 0-3",
 "Final Aug 30 Austin Peay vs Indiana State | T, 1-1",
 "Final Sep 3 Austin Peay at Evansville | L, 0-2",
 "Final Sep 6 Austin Peay at Murray State | L, 0-3",
 "Final Sep 10 Austin Peay vs UT Martin | W, 1-0",
 "Final Sep 18 Austin Peay at Jackson State | L, 1-3",
 "Final Sep 24 Austin Peay at Eastern Kentucky | L, 0-3",
 "Final Sep 27 Austin Peay vs North Alabama | L, 1-2",
 "Final Oct 4 Austin Peay at West Georgia | W, 3-1",
 "Final Oct 8 Austin Peay vs Tarleton State | L, 1-3",
 "Final Oct 11 Austin Peay vs Abilene Christian | L, 1-2",
 "Final Oct 15 Austin Peay at Central Arkansas | L, 0-2",
 "Final Oct 18 Austin Peay at Little Rock | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Austin Peay vs West Georgia | ",
 "Upcoming Oct 29, 7:00 PM Austin Peay at North Alabama | ",
 "Upcoming Nov 1, 1:00 PM Austin Peay vs Eastern Kentucky | ",
 "Upcoming Nov 8 Austin Peay at United Athletic Conference Women's Soccer Championship First Round | ",
 "Upcoming Nov 11 Austin Peay at United Athletic Conference Women's Soccer Championship Semifinals | ",
 "Upcoming Nov 14 Austin Peay at United Athletic Conference Women's Soccer Championship Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 25 Austin Peay vs Northwest Mississippi CC | W, 12-6",
 "Final Sep 30 Austin Peay at Murray State | L, 1-2",
 "Final Oct 6 Austin Peay vs Bethel | W, 15-4",
 "Final Oct 7 Austin Peay vs Vol State CC | W, 10-0",
 "Final Oct 14 Austin Peay vs Gadsden State CC | W, 9-3",
 "Upcoming Oct 22 Austin Peay vs Game 2 | ",
 "Today Oct 23, 4:00 PM Austin Peay vs Game 3 | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Austin Peay at All-American Championships | Completed",
 "Final Sep 25 Women's · Austin Peay at APSU Fall Tournament | Completed",
 "Final Oct 8 Women's · Austin Peay at ITA Ohio Valley Regionals | Completed",
 "Final Oct 16 Women's · Austin Peay at Battle of the Border | Completed",
 "Today Oct 23 Women's · Austin Peay at UAC Fall Individual Championship | ",
 "Upcoming Oct 29 Women's · Austin Peay at UTR Sports DI Invitational | ",
 "Upcoming Nov 5 Women's · Austin Peay at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · Austin Peay at UNF Fall Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Austin Peay at Brian Coons Fall Tournament | Completed",
 "Final Oct 8 Men's · Austin Peay at ITA Ohio Valley Regionals | Completed",
 "Today Oct 22 Men's · Austin Peay at ASUN Individual Championships | ",
 "Upcoming Oct 28 Men's · Austin Peay at UTR Sports NCAA DI Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Austin Peay vs Belmont (Exhibition) | L, 1-3",
 "Final Aug 22 Austin Peay at Southern Indiana (Exhibition) | W, 3-2",
 "Final Aug 28 Austin Peay vs UT Martin | W, 3-0",
 "Final Aug 28 Austin Peay vs Jackson State | L, 2-3",
 "Final Aug 29 Austin Peay vs Kansas City | W, 3-0",
 "Final Sep 4 Austin Peay at Tennessee Tech | L, 2-3",
 "Final Sep 4 Austin Peay vs Tennessee State | W, 3-0",
 "Final Sep 5 Austin Peay vs Green Bay | W, 3-2",
 "Final Sep 11 Austin Peay vs Bowling Green | L, 1-3",
 "Final Sep 12 Austin Peay at Xavier | L, 0-3",
 "Final Sep 12 Austin Peay vs Saint Louis | W, 3-2",
 "Final Sep 16 Austin Peay vs Tennessee State | W, 3-0",
 "Final Sep 18 Austin Peay vs Gardner-Webb | L, 1-3",
 "Final Sep 18 Austin Peay vs SIUE | W, 3-0",
 "Final Sep 19 Austin Peay vs Southern Illinois | W, 3-0",
 "Final Sep 24 Austin Peay at Little Rock | W, 3-1",
 "Final Sep 26 Austin Peay at Central Arkansas | L, 2-3",
 "Final Oct 1 Austin Peay at Abilene Christian | L, 0-3",
 "Final Oct 3 Austin Peay vs Tarleton State | W, 3-2",
 "Final Oct 6 Austin Peay at Eastern Kentucky | L, 0-3",
 "Final Oct 8 Austin Peay vs North Alabama | L, 2-3",
 "Final Oct 15 Austin Peay vs Abilene Christian | L, 0-3",
 "Final Oct 16 Austin Peay at North Alabama | L, 2-3",
 "Final Oct 21 Austin Peay vs Central Arkansas | L, 1-3",
 "Upcoming Oct 24, 1:00 PM Austin Peay vs Little Rock | ",
 "Upcoming Oct 29, 5:00 PM Austin Peay at West Georgia | ",
 "Upcoming Oct 31, 11:00 AM Austin Peay vs UT Arlington | ",
 "Upcoming Nov 3, 6:00 PM Austin Peay vs Eastern Kentucky | ",
 "Upcoming Nov 7, 11:00 AM Austin Peay vs West Georgia | ",
 "Upcoming Nov 12, 6:00 PM Austin Peay at UT Arlington | ",
 "Upcoming Nov 14, 12:00 PM Austin Peay at Tarleton State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Austin Peay module checks passed");
