import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {georgiaSouthernSchool} from '../src/schools/georgia-southern.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='georgia-southern');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,georgiaSouthernHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/georgia-southern-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gseagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['georgia-southern'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',georgiaSouthernSchool.scheduleUrls],['roster',georgiaSouthernSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('georgia-southern|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gseagles.com',`${key} must stay on gseagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gseagles.com/sports/baseball/schedule"],"roster":["https://gseagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gseagles.com/sports/mens-basketball/schedule","https://gseagles.com/sports/womens-basketball/schedule"],"roster":["https://gseagles.com/sports/mens-basketball/roster","https://gseagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gseagles.com/sports/cross-country/schedule"],"roster":["https://gseagles.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gseagles.com/sports/football/schedule"],"roster":["https://gseagles.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gseagles.com/sports/womens-golf/schedule","https://gseagles.com/sports/golf/schedule"],"roster":["https://gseagles.com/sports/womens-golf/roster","https://gseagles.com/sports/golf/roster"],"combined":false},"Rifle":{"schedule":["https://gseagles.com/sports/rifle/schedule"],"roster":["https://gseagles.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://gseagles.com/sports/womens-soccer/schedule","https://gseagles.com/sports/mens-soccer/schedule"],"roster":["https://gseagles.com/sports/womens-soccer/roster","https://gseagles.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gseagles.com/sports/softball/schedule"],"roster":["https://gseagles.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gseagles.com/sports/swimming-and-diving/schedule"],"roster":["https://gseagles.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gseagles.com/sports/womens-tennis/schedule","https://gseagles.com/sports/mens-tennis/schedule"],"roster":["https://gseagles.com/sports/womens-tennis/roster","https://gseagles.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://gseagles.com/sports/womens-volleyball/schedule"],"roster":["https://gseagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'georgia-southern|"+sport+"':"),`${sport} routes must live in the Georgia Southern module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gseagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.georgiaSouthernHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=georgia-southern)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 16 Georgia Southern vs Winthrop (Exhibition) | W, 10-1",
 "Final Oct 17 Georgia Southern vs Winthrop (Exhibition) | W, 5-3",
 "Upcoming Oct 29, 4:30 PM Georgia Southern vs FWS Game One (Exhibition) | ",
 "Upcoming Oct 30, 6:00 PM Georgia Southern vs FWS Game Two (Exhibition) | ",
 "Upcoming Oct 31 Georgia Southern vs FWS Game Three (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 5:00 PM Men's · Georgia Southern vs Winthrop (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Georgia Southern vs Ball State | ",
 "Upcoming Nov 6, 7:00 PM Men's · Georgia Southern at Georgia Tech | ",
 "Upcoming Nov 10, 7:00 PM Men's · Georgia Southern vs Mercer | ",
 "Upcoming Nov 13, 8:00 PM Men's · Georgia Southern at UCF | ",
 "Upcoming Nov 17, 8:00 PM Men's · Georgia Southern vs Middle Tennessee | ",
 "Upcoming Nov 19, 8:00 PM Men's · Georgia Southern at Houston Christian | ",
 "Upcoming Nov 23, 7:00 PM Men's · Georgia Southern at Northern Kentucky | ",
 "Upcoming Nov 24 Men's · Georgia Southern vs Bellarmine | ",
 "Upcoming Nov 28, 2:00 PM Men's · Georgia Southern at UNC Asheville | ",
 "Upcoming Dec 2, 7:00 PM Men's · Georgia Southern at USC Upstate | ",
 "Upcoming Dec 5, 1:00 PM Men's · Georgia Southern vs Johnson C. Smith | ",
 "Upcoming Dec 9, 6:00 PM Men's · Georgia Southern at Wofford | ",
 "Upcoming Dec 12, 5:00 PM Men's · Georgia Southern vs UNCW | ",
 "Upcoming Dec 16, 7:00 PM Men's · Georgia Southern vs Coastal Carolina | ",
 "Upcoming Dec 19 Men's · Georgia Southern at Arkansas State | ",
 "Upcoming Dec 31, 3:00 PM Men's · Georgia Southern vs Louisiana | ",
 "Upcoming Jan 2, 3:00 PM Men's · Georgia Southern vs Southern Miss | ",
 "Upcoming Jan 7 Men's · Georgia Southern at South Alabama | ",
 "Upcoming Jan 9, 4:30 PM Men's · Georgia Southern at Troy | ",
 "Upcoming Jan 13, 7:00 PM Men's · Georgia Southern vs James Madison | ",
 "Upcoming Jan 16, 7:00 PM Men's · Georgia Southern at Marshall | ",
 "Upcoming Jan 20 Men's · Georgia Southern at Georgia State | ",
 "Upcoming Jan 23, 5:00 PM Men's · Georgia Southern vs Appalachian State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Georgia Southern at Coastal Carolina | ",
 "Upcoming Jan 30, 3:00 PM Men's · Georgia Southern vs Old Dominion | ",
 "Upcoming Feb 3, 7:00 PM Men's · Georgia Southern vs Marshall | ",
 "Upcoming Feb 11, 7:00 PM Men's · Georgia Southern at Old Dominion | ",
 "Upcoming Feb 13, 1:00 PM Men's · Georgia Southern at Appalachian State | ",
 "Upcoming Feb 20, 3:00 PM Men's · Georgia Southern vs Louisiana Tech | ",
 "Upcoming Feb 23, 8:00 PM Men's · Georgia Southern at James Madison | ",
 "Upcoming Feb 26, 8:00 PM Men's · Georgia Southern vs Georgia State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Georgia Southern at Bowling Green | ",
 "Upcoming Nov 5, 7:00 PM Women's · Georgia Southern at Mercer | ",
 "Upcoming Nov 9, 6:00 PM Women's · Georgia Southern vs Savannah State | ",
 "Upcoming Nov 14, 11:00 AM Women's · Georgia Southern vs Wofford | ",
 "Upcoming Nov 17, 5:00 PM Women's · Georgia Southern vs Coastal Georgia | ",
 "Upcoming Nov 20, 6:00 PM Women's · Georgia Southern vs FGCU | ",
 "Upcoming Nov 24, 6:00 PM Women's · Georgia Southern at Cleveland State | ",
 "Upcoming Nov 25, 12:00 PM Women's · Georgia Southern vs Western Michigan | ",
 "Upcoming Nov 29, 1:00 PM Women's · Georgia Southern at Furman | ",
 "Upcoming Dec 7, 11:00 AM Women's · Georgia Southern vs Charleston Southern | ",
 "Upcoming Dec 12, 1:00 PM Women's · Georgia Southern vs FIU | ",
 "Upcoming Dec 15, 6:00 PM Women's · Georgia Southern vs College of Charleston | ",
 "Upcoming Dec 19, 2:00 PM Women's · Georgia Southern vs Arkansas State | ",
 "Upcoming Dec 22, 12:00 PM Women's · Georgia Southern at James Madison | ",
 "Upcoming Dec 28, 3:00 PM Women's · Georgia Southern at Georgia | ",
 "Upcoming Dec 31, 3:00 PM Women's · Georgia Southern at Louisiana | ",
 "Upcoming Jan 2, 3:00 PM Women's · Georgia Southern at Southern Miss | ",
 "Upcoming Jan 6, 6:00 PM Women's · Georgia Southern vs South Alabama | ",
 "Upcoming Jan 9, 2:00 PM Women's · Georgia Southern vs Troy | ",
 "Upcoming Jan 16, 4:00 PM Women's · Georgia Southern at Louisiana Tech | ",
 "Upcoming Jan 20, 6:00 PM Women's · Georgia Southern vs Marshall | ",
 "Upcoming Jan 23, 2:00 PM Women's · Georgia Southern vs Coastal Carolina | ",
 "Upcoming Jan 28, 6:30 PM Women's · Georgia Southern at Appalachian State | ",
 "Upcoming Jan 30, 6:00 PM Women's · Georgia Southern at Georgia State | ",
 "Upcoming Feb 3, 6:00 PM Women's · Georgia Southern at Marshall | ",
 "Upcoming Feb 6, 2:00 PM Women's · Georgia Southern vs MAC/SBC Challenge Opponent | ",
 "Upcoming Feb 10, 6:00 PM Women's · Georgia Southern vs Georgia State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Georgia Southern vs James Madison | ",
 "Upcoming Feb 18, 6:30 PM Women's · Georgia Southern at Old Dominion | ",
 "Upcoming Feb 20, 1:00 PM Women's · Georgia Southern at Coastal Carolina | ",
 "Upcoming Feb 23, 6:00 PM Women's · Georgia Southern vs Appalachian State | ",
 "Upcoming Feb 26, 5:00 PM Women's · Georgia Southern vs Old Dominion | ",
 "Upcoming Mar 2 Women's · Georgia Southern at 2027 Sun Belt Conference Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Georgia Southern at Florida Intercollegiate Cross Country Invitational | Completed",
 "Final Sep 18 Georgia Southern at UNG Cross Country Invitational | Completed",
 "Final Oct 2 Georgia Southern at Georgia Tech Cross Country Invitational | Completed",
 "Final Oct 17 Georgia Southern at Upstate Invite | Completed",
 "Upcoming Oct 30, 9:15 AM Georgia Southern at Sun Belt Conference | ",
 "Upcoming Nov 13, 9:00 AM Georgia Southern at NCAA Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Georgia Southern vs Charleston Southern | W, 31-0",
 "Final Sep 12 Georgia Southern at Clemson | L, 7-22",
 "Final Sep 19 Georgia Southern at Jax State | L, 27-31",
 "Final Sep 26 Georgia Southern vs Houston | L, 28-42",
 "Final Oct 3 Georgia Southern at Coastal Carolina | W, 31-24",
 "Final Oct 10 Georgia Southern vs James Madison | L, 24-27",
 "Final Oct 15 Georgia Southern at Old Dominion | W, 23-15",
 "Upcoming Oct 31, 6:30 PM Georgia Southern vs App State | ",
 "Upcoming Nov 7 Georgia Southern vs Marshall | ",
 "Upcoming Nov 14 Georgia Southern at Georgia State | ",
 "Upcoming Nov 21, 4:00 PM Georgia Southern at Troy | ",
 "Upcoming Nov 28 Georgia Southern vs Louisiana Tech | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Georgia Southern at Boilermaker Classic | 12th of 16",
 "Final Sep 18 Georgia Southern at The Mason Rudolph | 6th of 15",
 "Final Oct 5 Georgia Southern at The Ally | T10th of 17",
 "Final Oct 19 Georgia Southern at Route 66 Invitational | 1st of 16",
 "Upcoming Jan 31 Georgia Southern at Purdue Dominican Republic Classic | ",
 "Upcoming Feb 23 Georgia Southern at UNF Collegiate | ",
 "Upcoming Mar 9 Georgia Southern at Alamo Invitational | ",
 "Upcoming Mar 13 Georgia Southern at Valspar Invitational | ",
 "Upcoming Mar 29 Georgia Southern at Coach Mo Classic | ",
 "Upcoming Apr 12 Georgia Southern at The Strutting Gus Shootout | ",
 "Upcoming Apr 19 Georgia Southern at Sun Belt Championship | ",
 "Upcoming May 8 Georgia Southern at NCAA Regionals | ",
 "Upcoming May 16 Georgia Southern at NCAA Championship | "
]);
  const v_golf=parse("Golf","golf");
  assert.deepEqual(v_golf.map(line),[
 "Final Sep 6 Georgia Southern at Golfweek Fall Challenge | 1st of 16",
 "Final Sep 28 Georgia Southern at Windon Memorial Classic | T12th of 16",
 "Final Oct 4 Georgia Southern at Fighting Irish Classic | 5th of 14",
 "Final Oct 16 Georgia Southern at Golf Club of Georgia Collegiate Invitational | 2nd of 14",
 "Upcoming Feb 6 Georgia Southern at Thomas Sharkey Individual Collegiate | ",
 "Upcoming Feb 13 Georgia Southern at Gators Invitational | ",
 "Upcoming Feb 27 Georgia Southern at Freedom Classic | ",
 "Upcoming Mar 1 Georgia Southern at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 15 Georgia Southern at Johnnie-O Collegiate | ",
 "Upcoming Mar 19 Georgia Southern at Schenkel Invitational | ",
 "Upcoming Apr 3 Georgia Southern at Augusta Haskins Invitational | ",
 "Upcoming Apr 12 Georgia Southern at Ford Collegiate | ",
 "Upcoming Apr 26 Georgia Southern at Sun Belt Championship | ",
 "Upcoming May 17 Georgia Southern at NCAA Regionals | ",
 "Upcoming May 28 Georgia Southern at NCAA Championship | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 3 Georgia Southern vs Kentucky | L, 4723-4724",
 "Final Oct 10 Georgia Southern at The Citadel | W, 4733-4619",
 "Final Oct 10 Georgia Southern at The Citadel (W) | W, 4733-4467",
 "Final Oct 17 Georgia Southern vs West Virginia | L, 4728-4741",
 "Final Oct 18 Georgia Southern vs West Virginia | W, 4740-4738",
 "Final Oct 18 Georgia Southern vs UAB | W, 4740-4568",
 "Final Oct 18 Georgia Southern vs Georgia Military College | W, 4740-4566",
 "Upcoming Oct 24, 9:00 AM Georgia Southern at Ole Miss | ",
 "Upcoming Oct 25, 9:00 AM Georgia Southern at Wofford | ",
 "Upcoming Nov 8, 8:00 AM Georgia Southern at Nebraska | ",
 "Upcoming Nov 14, 9:00 AM Georgia Southern at Murray State | ",
 "Upcoming Jan 16, 8:00 AM Georgia Southern at VMI | ",
 "Upcoming Jan 16, 8:00 AM Georgia Southern at VMI (W) | ",
 "Upcoming Jan 17, 8:00 AM Georgia Southern at Navy | ",
 "Upcoming Jan 23, 8:00 AM Georgia Southern at The Citadel | ",
 "Upcoming Feb 5, 8:00 AM Georgia Southern at The Citadel | ",
 "Upcoming Feb 18, 2:00 PM Georgia Southern at Alaska Fairbanks | ",
 "Upcoming Feb 20, 2:00 PM Georgia Southern at Alaska Fairbanks | ",
 "Upcoming Mar 12 Georgia Southern at NCAA Rifle Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Women's · Georgia Southern vs Wofford (Exhibition) | T, 1-1",
 "Final Aug 8 Women's · Georgia Southern at Auburn (Exhibition) | L, 0-3",
 "Final Aug 12 Women's · Georgia Southern vs North Florida | W, 2-1",
 "Final Aug 16 Women's · Georgia Southern vs FGCU | W, 2-0",
 "Final Aug 20 Women's · Georgia Southern at Jacksonville | T, 0-0",
 "Final Aug 23 Women's · Georgia Southern vs UNCW | T, 1-1",
 "Final Aug 27 Women's · Georgia Southern at Mercer | W, 4-1",
 "Final Aug 30 Women's · Georgia Southern at Murray State | W, 1-0",
 "Final Sep 3 Women's · Georgia Southern at Michigan | L, 0-3",
 "Final Sep 6 Women's · Georgia Southern at Toledo | W, 3-2",
 "Final Sep 13 Women's · Georgia Southern vs Arkansas State | W, 3-0",
 "Final Sep 24 Women's · Georgia Southern at Georgia State | L, 1-2",
 "Final Sep 27 Women's · Georgia Southern vs Coastal Carolina | W, 4-1",
 "Final Oct 4 Women's · Georgia Southern at Marshall | T, 2-2",
 "Final Oct 8 Women's · Georgia Southern vs App State | L, 0-4",
 "Final Oct 18 Women's · Georgia Southern at Old Dominion | L, 1-2",
 "Today Oct 22, 5:00 PM Women's · Georgia Southern vs Troy | ",
 "Upcoming Oct 25, 2:00 PM Women's · Georgia Southern at Southern Miss | ",
 "Upcoming Oct 28, 6:00 PM Women's · Georgia Southern at South Alabama | ",
 "Upcoming Nov 1, 1:00 PM Women's · Georgia Southern vs James Madison | ",
 "Upcoming Nov 9 Women's · Georgia Southern at Sun Belt Conference Championships | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Georgia Southern vs FGCU | W, 3-1",
 "Final Aug 23 Men's · Georgia Southern at UNCW | L, 0-2",
 "Final Aug 28 Men's · Georgia Southern at Jacksonville | W, 2-0",
 "Final Sep 2 Men's · Georgia Southern vs Liberty | T, 1-1",
 "Final Sep 8 Men's · Georgia Southern at Stetson | W, 1-0",
 "Final Sep 13 Men's · Georgia Southern vs Mercer | W, 2-1",
 "Final Sep 18 Men's · Georgia Southern at Coastal Carolina | T, 1-1",
 "Final Sep 27 Men's · Georgia Southern vs Old Dominion | W, 3-1",
 "Final Oct 2 Men's · Georgia Southern vs Georgia State | W, 3-0",
 "Final Oct 6 Men's · Georgia Southern at Clemson | T, 2-2",
 "Final Oct 9 Men's · Georgia Southern at Marshall | T, 2-2",
 "Final Oct 17 Men's · Georgia Southern vs James Madison | L, 0-5",
 "Upcoming Oct 21, 7:00 PM Men's · Georgia Southern at South Carolina | ",
 "Upcoming Oct 25, 2:00 PM Men's · Georgia Southern vs West Virginia | ",
 "Upcoming Oct 30, 7:00 PM Men's · Georgia Southern at Kentucky | ",
 "Upcoming Nov 3, 7:00 PM Men's · Georgia Southern vs UCF | ",
 "Upcoming Nov 8 Men's · Georgia Southern at Sun Belt Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 19 Georgia Southern at Swim Across America (Exhibition) | Completed",
 "Final Sep 26 Georgia Southern at Moultrie Invite | Completed",
 "Final Oct 9 Georgia Southern at Osprey Invite | Completed",
 "Final Oct 17 Georgia Southern vs SCAD/Converse | Completed",
 "Upcoming Nov 7 Georgia Southern at East Carolina | ",
 "Upcoming Nov 17 Georgia Southern at Gamecock Invite | ",
 "Upcoming Nov 20 Georgia Southern at Liberty Invite | ",
 "Upcoming Dec 10, 3:30 PM Georgia Southern vs UNC Asheville | ",
 "Upcoming Jan 6 Georgia Southern at FIU Invite | ",
 "Upcoming Jan 15 Georgia Southern vs UNCA/ SCAD | ",
 "Upcoming Jan 15, 6:00 PM Georgia Southern at North Florida | ",
 "Upcoming Jan 16, 12:00 PM Georgia Southern vs UNF/UNCA/SCAD | ",
 "Upcoming Jan 23, 12:00 PM Georgia Southern at West Florida | ",
 "Upcoming Feb 17, 9:00 AM Georgia Southern at ASun Championship | ",
 "Upcoming Mar 7 Georgia Southern at Zone B Diving Championships | ",
 "Upcoming Mar 11, 9:00 AM Georgia Southern at National Invitational Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Georgia Southern at Mid Major Mayhem Hidden Duel | Completed",
 "Final Oct 1 Women's · Georgia Southern at Mercer Gridiron Classic | Completed",
 "Final Oct 8 Women's · Georgia Southern at ITA Regionals | Completed",
 "Upcoming Oct 23 Women's · Georgia Southern at Georgia Southern Fall Shootout | ",
 "Upcoming Oct 29 Women's · Georgia Southern at UTR College Fall Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 21 Men's · Georgia Southern at Columbia ITF | Completed",
 "Final Sep 25 Men's · Georgia Southern at UNF Invitational | Completed",
 "Final Oct 1 Men's · Georgia Southern at Mercer Gridiron Classic | Completed",
 "Final Oct 14 Men's · Georgia Southern at ITA Regionals | Completed",
 "Upcoming Oct 23 Men's · Georgia Southern at Wake Forest Invitational | ",
 "Upcoming Nov 5 Men's · Georgia Southern at ITA Masters / Sectionals | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 12 Georgia Southern vs Jacksonville (Exhibition) | W, 4-0",
 "Final Aug 14 Georgia Southern at South Carolina (Exhibition) | T, 2-2",
 "Final Aug 29 Georgia Southern at Hawaii | L, 1-3",
 "Final Aug 29 Georgia Southern vs San Diego | L, 1-3",
 "Final Aug 30 Georgia Southern vs Baylor | L, 1-3",
 "Final Sep 4 Georgia Southern vs Prairie View A&M | W, 3-0",
 "Final Sep 5 Georgia Southern vs Radford | W, 3-0",
 "Final Sep 6 Georgia Southern vs Eastern Kentucky | W, 3-2",
 "Final Sep 11 Georgia Southern vs ETSU | W, 3-0",
 "Final Sep 12 Georgia Southern at Wake Forest | L, 2-3",
 "Final Sep 13 Georgia Southern vs East Carolina | W, 3-0",
 "Final Sep 17 Georgia Southern vs Kennesaw State | W, 3-1",
 "Final Sep 19 Georgia Southern vs Fordham | W, 3-0",
 "Final Sep 20 Georgia Southern vs North Florida | W, 3-0",
 "Final Sep 25 Georgia Southern at Coastal Carolina | W, 3-0",
 "Final Sep 26 Georgia Southern at Coastal Carolina | W, 3-0",
 "Final Oct 2 Georgia Southern vs Old Dominion | W, 3-0",
 "Final Oct 3 Georgia Southern vs Old Dominion | W, 3-0",
 "Final Oct 8 Georgia Southern at Appalachian State | L, 1-3",
 "Final Oct 9 Georgia Southern at Appalachian State | W, 3-1",
 "Final Oct 16 Georgia Southern vs Arkansas State | L, 2-3",
 "Final Oct 17 Georgia Southern vs Arkansas State | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Georgia Southern vs James Madison | ",
 "Upcoming Oct 24, 1:00 PM Georgia Southern vs James Madison | ",
 "Upcoming Oct 29, 6:00 PM Georgia Southern at Marshall | ",
 "Upcoming Oct 30, 6:00 PM Georgia Southern at Marshall | ",
 "Upcoming Nov 5, 6:00 PM Georgia Southern vs Georgia State | ",
 "Upcoming Nov 6, 6:00 PM Georgia Southern vs Georgia State | ",
 "Upcoming Nov 12, 6:00 PM Georgia Southern at South Alabama | ",
 "Upcoming Nov 13, 6:00 PM Georgia Southern at South Alabama | ",
 "Upcoming Nov 19 Georgia Southern at Sun Belt Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_golf,"Golf golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Georgia Southern module checks passed");
