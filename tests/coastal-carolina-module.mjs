import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {coastalCarolinaSchool} from '../src/schools/coastal-carolina.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='coastal-carolina');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,coastalCarolinaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/coastal-carolina-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goccusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['coastal-carolina'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',coastalCarolinaSchool.scheduleUrls],['roster',coastalCarolinaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('coastal-carolina|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goccusports.com',`${key} must stay on goccusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goccusports.com/sports/baseball/schedule"],"roster":["https://goccusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goccusports.com/sports/mens-basketball/schedule","https://goccusports.com/sports/womens-basketball/schedule"],"roster":["https://goccusports.com/sports/mens-basketball/roster","https://goccusports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://goccusports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://goccusports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://goccusports.com/sports/track-and-field/schedule"],"roster":["https://goccusports.com/sports/track-and-field/roster"],"combined":false},"Football":{"schedule":["https://goccusports.com/sports/football/schedule"],"roster":["https://goccusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goccusports.com/sports/womens-golf/schedule","https://goccusports.com/sports/mens-golf/schedule"],"roster":["https://goccusports.com/sports/womens-golf/roster","https://goccusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://goccusports.com/sports/womens-lacrosse/schedule"],"roster":["https://goccusports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://goccusports.com/sports/womens-soccer/schedule","https://goccusports.com/sports/mens-soccer/schedule"],"roster":["https://goccusports.com/sports/womens-soccer/roster","https://goccusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goccusports.com/sports/softball/schedule"],"roster":["https://goccusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goccusports.com/sports/womens-tennis/schedule","https://goccusports.com/sports/mens-tennis/schedule"],"roster":["https://goccusports.com/sports/womens-tennis/roster","https://goccusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goccusports.com/sports/track-and-field/schedule"],"roster":["https://goccusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goccusports.com/sports/womens-volleyball/schedule"],"roster":["https://goccusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'coastal-carolina|"+sport+"':"),`${sport} routes must live in the Coastal Carolina module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://goccusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.coastalCarolinaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=coastal-carolina)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 4:00 PM Coastal Carolina vs Liberty | ",
 "Upcoming Feb 20, 2:00 PM Coastal Carolina vs Liberty | ",
 "Upcoming Feb 21, 1:00 PM Coastal Carolina vs Liberty | ",
 "Upcoming Feb 23, 4:00 PM Coastal Carolina vs NC State | ",
 "Upcoming Feb 26, 4:00 PM Coastal Carolina vs Maryland | ",
 "Upcoming Feb 27, 2:00 PM Coastal Carolina vs Maryland | ",
 "Upcoming Feb 28, 1:00 PM Coastal Carolina vs Maryland | ",
 "Upcoming Mar 3, 4:00 PM Coastal Carolina vs Mercer | ",
 "Upcoming Mar 5, 4:00 PM Coastal Carolina vs West Virginia | ",
 "Upcoming Mar 6, 2:00 PM Coastal Carolina vs West Virginia | ",
 "Upcoming Mar 7, 1:00 PM Coastal Carolina vs West Virginia | ",
 "Upcoming Mar 9 Coastal Carolina vs Wake Forest | ",
 "Upcoming Mar 12 Coastal Carolina at East Carolina | ",
 "Upcoming Mar 13 Coastal Carolina at East Carolina | ",
 "Upcoming Mar 14 Coastal Carolina at East Carolina | ",
 "Upcoming Mar 16 Coastal Carolina vs College of Charleston | ",
 "Upcoming Mar 19 Coastal Carolina at ULM | ",
 "Upcoming Mar 20 Coastal Carolina at ULM | ",
 "Upcoming Mar 21 Coastal Carolina at ULM | ",
 "Upcoming Mar 23 Coastal Carolina vs The Citadel | ",
 "Upcoming Mar 25 Coastal Carolina vs Southern Miss | ",
 "Upcoming Mar 26 Coastal Carolina vs Southern Miss | ",
 "Upcoming Mar 27 Coastal Carolina vs Southern Miss | ",
 "Upcoming Mar 30 Coastal Carolina at UNCW | ",
 "Upcoming Apr 2 Coastal Carolina at Georgia State | ",
 "Upcoming Apr 3 Coastal Carolina at Georgia State | ",
 "Upcoming Apr 4 Coastal Carolina at Georgia State | ",
 "Upcoming Apr 6 Coastal Carolina at Wake Forest | ",
 "Upcoming Apr 9 Coastal Carolina vs Georgia Southern | ",
 "Upcoming Apr 10 Coastal Carolina vs Georgia Southern | ",
 "Upcoming Apr 11 Coastal Carolina vs Georgia Southern | ",
 "Upcoming Apr 14 Coastal Carolina at Clemson | ",
 "Upcoming Apr 16 Coastal Carolina at South Alabama | ",
 "Upcoming Apr 17 Coastal Carolina at South Alabama | ",
 "Upcoming Apr 18 Coastal Carolina at South Alabama | ",
 "Upcoming Apr 20 Coastal Carolina at College of Charleston | ",
 "Upcoming Apr 23 Coastal Carolina vs Louisiana | ",
 "Upcoming Apr 24 Coastal Carolina vs Louisiana | ",
 "Upcoming Apr 25 Coastal Carolina vs Louisiana | ",
 "Upcoming Apr 27 Coastal Carolina at North Carolina | ",
 "Upcoming Apr 30 Coastal Carolina vs App State | ",
 "Upcoming May 1 Coastal Carolina vs App State | ",
 "Upcoming May 2 Coastal Carolina vs App State | ",
 "Upcoming May 5 Coastal Carolina vs Clemson | ",
 "Upcoming May 7 Coastal Carolina at Old Dominion | ",
 "Upcoming May 8 Coastal Carolina at Old Dominion | ",
 "Upcoming May 9 Coastal Carolina at Old Dominion | ",
 "Upcoming May 12 Coastal Carolina vs South Carolina | ",
 "Upcoming May 14 Coastal Carolina vs Marshall | ",
 "Upcoming May 15 Coastal Carolina vs Marshall | ",
 "Upcoming May 16 Coastal Carolina vs Marshall | ",
 "Upcoming May 20 Coastal Carolina at James Madison | ",
 "Upcoming May 21 Coastal Carolina at James Madison | ",
 "Upcoming May 22 Coastal Carolina at James Madison | ",
 "Upcoming May 25 Coastal Carolina at Sun Belt Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · Coastal Carolina vs Columbia International (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Coastal Carolina vs Eastern Michigan | ",
 "Upcoming Nov 5, 8:00 PM Men's · Coastal Carolina at Duke | ",
 "Upcoming Nov 9, 7:00 PM Men's · Coastal Carolina vs USC Upstate | ",
 "Upcoming Nov 12, 7:00 PM Men's · Coastal Carolina vs Virginia University of Lynchburg | ",
 "Upcoming Nov 15, 8:00 PM Men's · Coastal Carolina at Wisconsin | ",
 "Upcoming Nov 20, 7:00 PM Men's · Coastal Carolina at Tennessee | ",
 "Upcoming Nov 24, 7:00 PM Men's · Coastal Carolina vs Campbell | ",
 "Upcoming Nov 28, 3:00 PM Men's · Coastal Carolina vs Western Illinois | ",
 "Upcoming Dec 2, 7:00 PM Men's · Coastal Carolina at Queens | ",
 "Upcoming Dec 5, 3:00 PM Men's · Coastal Carolina vs Winthrop | ",
 "Upcoming Dec 9, 7:00 PM Men's · Coastal Carolina at East Carolina | ",
 "Upcoming Dec 13, 3:00 PM Men's · Coastal Carolina vs Carolina | ",
 "Upcoming Dec 16, 7:00 PM Men's · Coastal Carolina at Georgia Southern | ",
 "Upcoming Dec 19, 4:30 PM Men's · Coastal Carolina at Troy | ",
 "Upcoming Dec 22, 12:00 PM Men's · Coastal Carolina at William & Mary | ",
 "Upcoming Dec 31, 3:00 PM Men's · Coastal Carolina vs Louisiana Tech | ",
 "Upcoming Jan 2, 1:00 PM Men's · Coastal Carolina vs Louisiana - Monroe | ",
 "Upcoming Jan 7, 8:00 PM Men's · Coastal Carolina at Southern Miss | ",
 "Upcoming Jan 9, 4:00 PM Men's · Coastal Carolina at South Alabama | ",
 "Upcoming Jan 15, 7:00 PM Men's · Coastal Carolina vs Louisiana | ",
 "Upcoming Jan 20, 6:30 PM Men's · Coastal Carolina at App State | ",
 "Upcoming Jan 23, 3:00 PM Men's · Coastal Carolina vs Marshall | ",
 "Upcoming Jan 27, 7:00 PM Men's · Coastal Carolina vs Georgia Southern | ",
 "Upcoming Jan 30, 8:00 PM Men's · Coastal Carolina at Georgia State | ",
 "Upcoming Feb 3, 7:00 PM Men's · Coastal Carolina vs James Madison | ",
 "Upcoming Feb 6 Men's · Coastal Carolina at MAC-SBC Challenge | ",
 "Upcoming Feb 11, 7:00 PM Men's · Coastal Carolina at Marshall | ",
 "Upcoming Feb 13, 3:00 PM Men's · Coastal Carolina vs Old Dominion | ",
 "Upcoming Feb 17, 7:00 PM Men's · Coastal Carolina vs Georgia State | ",
 "Upcoming Feb 20, 5:00 PM Men's · Coastal Carolina at James Madison | ",
 "Upcoming Feb 23, 7:00 PM Men's · Coastal Carolina vs App State | ",
 "Upcoming Feb 26, 7:00 PM Men's · Coastal Carolina at Old Dominion | ",
 "Upcoming Mar 2 Men's · Coastal Carolina at SBC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 12:00 PM Women's · Coastal Carolina at Western Michigan | ",
 "Upcoming Nov 5, 12:00 PM Women's · Coastal Carolina vs Johnson | ",
 "Upcoming Nov 11, 6:00 PM Women's · Coastal Carolina vs Jacksonville | ",
 "Upcoming Nov 15, 2:00 PM Women's · Coastal Carolina at ETSU | ",
 "Upcoming Nov 18, 7:00 PM Women's · Coastal Carolina at Indiana | ",
 "Upcoming Nov 22, 3:00 PM Women's · Coastal Carolina at NC State | ",
 "Upcoming Nov 25, 1:00 PM Women's · Coastal Carolina vs Newberry | ",
 "Upcoming Nov 29, 2:00 PM Women's · Coastal Carolina at Campbell | ",
 "Upcoming Dec 2, 6:00 PM Women's · Coastal Carolina vs ECU | ",
 "Upcoming Dec 6, 1:00 PM Women's · Coastal Carolina vs UNCW | ",
 "Upcoming Dec 12, 2:00 PM Women's · Coastal Carolina at College of Charleston | ",
 "Upcoming Dec 16, 6:00 PM Women's · Coastal Carolina vs Georgia State | ",
 "Upcoming Dec 19, 1:00 PM Women's · Coastal Carolina at Louisiana | ",
 "Upcoming Dec 21, 3:00 PM Women's · Coastal Carolina at Alabama | ",
 "Upcoming Dec 31, 7:30 PM Women's · Coastal Carolina at Louisiana Tech | ",
 "Upcoming Jan 2, 1:00 PM Women's · Coastal Carolina at ULM | ",
 "Upcoming Jan 6, 6:00 PM Women's · Coastal Carolina vs Troy | ",
 "Upcoming Jan 9, 12:00 PM Women's · Coastal Carolina vs Southern Miss | ",
 "Upcoming Jan 13, 6:00 PM Women's · Coastal Carolina vs JMU | ",
 "Upcoming Jan 16, 1:00 PM Women's · Coastal Carolina vs Old Dominion | ",
 "Upcoming Jan 20, 6:00 PM Women's · Coastal Carolina at Georgia State | ",
 "Upcoming Jan 23, 1:00 PM Women's · Coastal Carolina at Georgia Southern | ",
 "Upcoming Jan 30, 1:00 PM Women's · Coastal Carolina vs South Alabama | ",
 "Upcoming Feb 3, 11:00 AM Women's · Coastal Carolina vs Appalachian State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Coastal Carolina vs MAC-SBC Challenge | ",
 "Upcoming Feb 10, 11:00 AM Women's · Coastal Carolina at Old Dominion | ",
 "Upcoming Feb 13, 1:00 PM Women's · Coastal Carolina at Appalachian State | ",
 "Upcoming Feb 18, 6:00 PM Women's · Coastal Carolina vs Marshall | ",
 "Upcoming Feb 20, 1:00 PM Women's · Coastal Carolina vs Georgia Southern | ",
 "Upcoming Feb 23, 6:00 PM Women's · Coastal Carolina at JMU | ",
 "Upcoming Feb 26, 6:00 PM Women's · Coastal Carolina at Marshall | ",
 "Upcoming Mar 2 Women's · Coastal Carolina at 2027 Sun Belt Conference Women's Basketball Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_trackandfield=parse("Cross Country","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Sep 4 Coastal Carolina at Elon Opener | Women's team: 9th / Men's team: 2nd",
 "Final Sep 18 Coastal Carolina at Chanticleer Challenge | Women's team: 1st / Men's team: 1st",
 "Final Oct 2 Coastal Carolina at Richmond Invitational | Women's team: 8th / Men's team: 6th",
 "Final Oct 17 Coastal Carolina at Upstate Invitational | Women's team: 4th / Men's team: 8th",
 "Upcoming Oct 30 Coastal Carolina at Sun Belt Championship | ",
 "Upcoming Nov 14 Coastal Carolina at NCAA Southeast Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Coastal Carolina at West Virginia | L, 24-31",
 "Final Sep 12 Coastal Carolina vs Fordham | W, 45-7",
 "Final Sep 19 Coastal Carolina at Delaware | L, 14-22",
 "Final Sep 24 Coastal Carolina vs Liberty | L, 17-34",
 "Final Oct 3 Coastal Carolina vs Georgia Southern | L, 24-31",
 "Final Oct 10 Coastal Carolina at Marshall | W, 27-21",
 "Final Oct 16 Coastal Carolina vs App State | L, 32-35",
 "Upcoming Oct 31 Coastal Carolina at Georgia State | ",
 "Upcoming Nov 7 Coastal Carolina vs Old Dominion | ",
 "Upcoming Nov 14 Coastal Carolina vs Arkansas State | ",
 "Upcoming Nov 21 Coastal Carolina at Louisiana | ",
 "Upcoming Nov 28 Coastal Carolina at James Madison | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Coastal Carolina at Golfweek Fall Challenge | Completed",
 "Final Sep 28 Women's · Coastal Carolina at Tot Hill Farm Invitational | Completed",
 "Final Oct 9 Women's · Coastal Carolina at Evie Odom Invitational | Completed",
 "Final Oct 19 Women's · Coastal Carolina at Route 66 Invitational | Completed",
 "Upcoming Feb 22 Women's · Coastal Carolina at Longwood Invitational at Jekyll Island | ",
 "Upcoming Mar 2 Women's · Coastal Carolina at Daniel Island Invitational | ",
 "Upcoming Mar 13 Women's · Coastal Carolina at Valspar Invitational | ",
 "Upcoming Mar 21 Women's · Coastal Carolina at City of Oaks Collegiate | ",
 "Upcoming Apr 5 Women's · Coastal Carolina at Olde Stone Collegiate | ",
 "Upcoming Apr 19 Women's · Coastal Carolina at Sun Belt Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Coastal Carolina at Myrtle Beach Golf Trips Intercollegiate sponsored by Carolina Wealth Advisors | 1st of 16",
 "Final Sep 21 Men's · Coastal Carolina at Highlands Invitational | T5th of 12",
 "Final Sep 28 Men's · Coastal Carolina at Bryan Bros Collegiate | 14th of 16",
 "Final Oct 12 Men's · Coastal Carolina at The Bryson Invitational | Completed",
 "Upcoming Feb 15 Men's · Coastal Carolina at Battle at Briars Creek | ",
 "Upcoming Mar 6 Men's · Coastal Carolina at The Hayt | ",
 "Upcoming Mar 14 Men's · Coastal Carolina at The Michael A. Marino Classic | ",
 "Upcoming Mar 29 Men's · Coastal Carolina at Hootie at Bulls Bay Intercollegiate | ",
 "Upcoming Apr 12 Men's · Coastal Carolina at Mossy Oak Collegiate | ",
 "Upcoming Apr 25 Men's · Coastal Carolina at Sun Belt Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 Women's · Coastal Carolina vs Tennessee Tech (Exhibition) | W, 1-0",
 "Final Aug 13 Women's · Coastal Carolina vs Charleston Southern | W, 3-0",
 "Final Aug 20 Women's · Coastal Carolina at Florida | L, 2-3",
 "Final Aug 23 Women's · Coastal Carolina vs Central Michigan | W, 2-0",
 "Final Aug 27 Women's · Coastal Carolina at UNC Greensboro | W, 1-0",
 "Final Aug 30 Women's · Coastal Carolina vs Campbell | W, 2-1",
 "Final Sep 6 Women's · Coastal Carolina at Davidson | L, 0-1",
 "Final Sep 10 Women's · Coastal Carolina vs College of Charleston | W, 1-0",
 "Final Sep 13 Women's · Coastal Carolina at UNC Wilmington | T, 0-0",
 "Final Sep 17 Women's · Coastal Carolina vs Queens | W, 2-0",
 "Final Sep 20 Women's · Coastal Carolina at Louisiana | L, 2-3",
 "Final Sep 23 Women's · Coastal Carolina vs South Alabama | T, 2-2",
 "Final Sep 27 Women's · Coastal Carolina at Georgia Southern | L, 1-4",
 "Final Oct 3 Women's · Coastal Carolina at Troy | L, 0-1",
 "Final Oct 8 Women's · Coastal Carolina vs Southern Mississippi | W, 4-1",
 "Final Oct 11 Women's · Coastal Carolina at Appalachian State | W, 1-0",
 "Final Oct 15 Women's · Coastal Carolina vs Georgia State | T, 1-1",
 "Today Oct 22, 6:00 PM Women's · Coastal Carolina vs James Madison | ",
 "Upcoming Oct 25, 2:00 PM Women's · Coastal Carolina at Old Dominion | ",
 "Upcoming Nov 1, 1:00 PM Women's · Coastal Carolina vs Marshall | ",
 "Upcoming Nov 9 Women's · Coastal Carolina at 2026 Sun Belt Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 9 Men's · Coastal Carolina vs Wake Forest (Exhibition) | W, 1-0",
 "Final Aug 12 Men's · Coastal Carolina vs Catawba (Exhibition) | W, 2-1",
 "Final Aug 15 Men's · Coastal Carolina vs USC Upstate (Exhibition) | T, 2-2",
 "Final Aug 20 Men's · Coastal Carolina at NC State | T, 0-0",
 "Final Aug 24 Men's · Coastal Carolina at Longwood | L, 2-4",
 "Final Aug 29 Men's · Coastal Carolina vs Stetson | W, 2-0",
 "Final Sep 5 Men's · Coastal Carolina vs Gardner-Webb | L, 1-2",
 "Final Sep 9 Men's · Coastal Carolina at North Florida | L, 0-2",
 "Final Sep 18 Men's · Coastal Carolina vs Georgia Southern | T, 1-1",
 "Final Sep 22 Men's · Coastal Carolina at Wofford | T, 1-1",
 "Final Sep 27 Men's · Coastal Carolina at Georgia State | T, 1-1",
 "Final Oct 2 Men's · Coastal Carolina at James Madison | L, 0-1",
 "Final Oct 6 Men's · Coastal Carolina vs Campbell | W, 4-2",
 "Final Oct 9 Men's · Coastal Carolina vs UCF | W, 2-1",
 "Final Oct 17 Men's · Coastal Carolina vs Marshall | L, 1-2",
 "Final Oct 21 Men's · Coastal Carolina at Kentucky | W, 2-1",
 "Upcoming Oct 25, 6:00 PM Men's · Coastal Carolina vs Old Dominion | ",
 "Upcoming Oct 29, 7:00 PM Men's · Coastal Carolina at West Virginia | ",
 "Upcoming Nov 3, 6:00 PM Men's · Coastal Carolina vs South Carolina | ",
 "Upcoming Nov 8 Men's · Coastal Carolina at 2026 Sun Belt Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Coastal Carolina at College of Charleston Invite | Completed",
 "Final Sep 19 Women's · Coastal Carolina at ITA All-American Championship | Completed",
 "Final Oct 1 Women's · Coastal Carolina at Battle at the Beach | Completed",
 "Final Oct 15 Women's · Coastal Carolina at ITA Carolina Regionals | Completed",
 "Upcoming Oct 30 Women's · Coastal Carolina at Charleston Southern Halloween Invite | ",
 "Upcoming Nov 5 Women's · Coastal Carolina at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Women's · Coastal Carolina at ITA Conference Sectional Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · Coastal Carolina at UNCG Hidden Duals | Completed",
 "Upcoming Oct 23 Men's · Coastal Carolina at UNCW Hidden Duals | ",
 "Upcoming Nov 5 Men's · Coastal Carolina at ITA Conference Sectional Championships | "
]);
  const v_trackandfield_trackfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Coastal Carolina vs Duke | L, 1-3",
 "Final Aug 30 Coastal Carolina vs Queens | W, 3-2",
 "Final Sep 4 Coastal Carolina vs UConn | L, 2-3",
 "Final Sep 4 Coastal Carolina at Jacksonville | W, 3-1",
 "Final Sep 5 Coastal Carolina vs Florida A&M | W, 3-1",
 "Final Sep 10 Coastal Carolina at Wofford | W, 3-2",
 "Final Sep 12 Coastal Carolina at Tennessee | L, 0-3",
 "Final Sep 18 Coastal Carolina vs Indiana | L, 1-3",
 "Final Sep 20 Coastal Carolina vs NC State | L, 2-3",
 "Final Sep 25 Coastal Carolina vs Georgia Southern | L, 0-3",
 "Final Sep 26 Coastal Carolina vs Georgia Southern | L, 0-3",
 "Final Oct 2 Coastal Carolina at App State | L, 0-3",
 "Final Oct 3 Coastal Carolina at App State | L, 2-3",
 "Final Oct 9 Coastal Carolina at Old Dominion | W, 3-1",
 "Final Oct 10 Coastal Carolina at Old Dominion | W, 3-1",
 "Final Oct 14 Coastal Carolina at UNCW | L, 1-3",
 "Final Oct 17 Coastal Carolina vs Marshall | W, 3-2",
 "Final Oct 18 Coastal Carolina vs Marshall | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Coastal Carolina vs Georgia State | ",
 "Upcoming Oct 24, 3:00 PM Coastal Carolina vs Georgia State | ",
 "Upcoming Oct 30, 6:00 PM Coastal Carolina at James Madison | ",
 "Upcoming Oct 31, 1:00 PM Coastal Carolina at James Madison | ",
 "Upcoming Nov 5, 6:00 PM Coastal Carolina vs Troy | ",
 "Upcoming Nov 6, 6:00 PM Coastal Carolina vs Troy | ",
 "Upcoming Nov 13, 7:00 PM Coastal Carolina at Louisiana | ",
 "Upcoming Nov 14, 3:00 PM Coastal Carolina at Louisiana | ",
 "Upcoming Nov 19 Coastal Carolina at Sun Belt Conference Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_trackandfield,"Cross Country track-and-field");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield_trackfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Coastal Carolina module checks passed");
