import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {eastTennesseeStateSchool} from '../src/schools/east-tennessee-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='east-tennessee-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,eastTennesseeStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/east-tennessee-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit etsubucs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['east-tennessee-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',eastTennesseeStateSchool.scheduleUrls],['roster',eastTennesseeStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('east-tennessee-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'etsubucs.com',`${key} must stay on etsubucs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://etsubucs.com/sports/baseball/schedule"],"roster":["https://etsubucs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://etsubucs.com/sports/mens-basketball/schedule","https://etsubucs.com/sports/womens-basketball/schedule"],"roster":["https://etsubucs.com/sports/mens-basketball/roster","https://etsubucs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://etsubucs.com/sports/womens-cross-country/schedule","https://etsubucs.com/sports/mens-cross-country/schedule"],"roster":["https://etsubucs.com/sports/womens-cross-country/roster","https://etsubucs.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://etsubucs.com/sports/football/schedule"],"roster":["https://etsubucs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://etsubucs.com/sports/womens-golf/schedule","https://etsubucs.com/sports/mens-golf/schedule"],"roster":["https://etsubucs.com/sports/womens-golf/roster","https://etsubucs.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://etsubucs.com/sports/womens-soccer/schedule","https://etsubucs.com/sports/mens-soccer/schedule"],"roster":["https://etsubucs.com/sports/womens-soccer/roster","https://etsubucs.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://etsubucs.com/sports/softball/schedule"],"roster":["https://etsubucs.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://etsubucs.com/sports/womens-tennis/schedule","https://etsubucs.com/sports/mens-tennis/schedule"],"roster":["https://etsubucs.com/sports/womens-tennis/roster","https://etsubucs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://etsubucs.com/sports/womens-track-and-field/schedule","https://etsubucs.com/sports/mens-track-and-field/schedule"],"roster":["https://etsubucs.com/sports/womens-track-and-field/roster","https://etsubucs.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://etsubucs.com/sports/triathlon/schedule"],"roster":["https://etsubucs.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://etsubucs.com/sports/womens-volleyball/schedule"],"roster":["https://etsubucs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'east-tennessee-state|"+sport+"':"),`${sport} routes must live in the East Tennessee State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://etsubucs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.eastTennesseeStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=east-tennessee-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 4:00 PM Men's · ETSU vs High Point | ",
 "Upcoming Nov 2 Men's · ETSU at Arizona State | ",
 "Upcoming Nov 6, 7:00 PM Men's · ETSU at NC State | ",
 "Upcoming Nov 11, 7:00 PM Men's · ETSU vs Campbell | ",
 "Upcoming Nov 17, 7:00 PM Men's · ETSU at Marshall | ",
 "Upcoming Nov 21, 4:00 PM Men's · ETSU vs Longwood | ",
 "Upcoming Nov 23, 7:00 PM Men's · ETSU vs Kentucky State | ",
 "Upcoming Nov 27, 7:00 PM Men's · ETSU vs Charleston Southern | ",
 "Upcoming Nov 29, 4:00 PM Men's · ETSU vs Morehead State | ",
 "Upcoming Dec 1, 7:00 PM Men's · ETSU vs Virginia Lynchburg | ",
 "Upcoming Dec 5, 1:00 PM Men's · ETSU at VMI | ",
 "Upcoming Dec 8, 7:00 PM Men's · ETSU vs Presbyterian | ",
 "Upcoming Dec 12, 5:00 PM Men's · ETSU at Jacksonville State | ",
 "Upcoming Dec 15, 7:00 PM Men's · ETSU vs Northern Kentucky | ",
 "Upcoming Dec 19, 4:00 PM Men's · ETSU vs UNCG | ",
 "Upcoming Dec 22, 7:00 PM Men's · ETSU vs Furman | ",
 "Upcoming Dec 30, 6:00 PM Men's · ETSU at Mercer | ",
 "Upcoming Jan 2, 5:00 PM Men's · ETSU at Samford | ",
 "Upcoming Jan 9, 4:00 PM Men's · ETSU vs Western Carolina | ",
 "Upcoming Jan 13, 7:00 PM Men's · ETSU vs Tennessee Tech | ",
 "Upcoming Jan 16, 2:00 PM Men's · ETSU at UNCG | ",
 "Upcoming Jan 18, 7:00 PM Men's · ETSU at The Citadel | ",
 "Upcoming Jan 21, 7:00 PM Men's · ETSU vs Chattanooga | ",
 "Upcoming Jan 23, 4:00 PM Men's · ETSU at Wofford | ",
 "Upcoming Jan 27, 7:00 PM Men's · ETSU vs Mercer | ",
 "Upcoming Jan 30 Men's · ETSU at Furman | ",
 "Upcoming Feb 3, 7:00 PM Men's · ETSU at Chattanooga | ",
 "Upcoming Feb 6, 4:00 PM Men's · ETSU vs VMI | ",
 "Upcoming Feb 10, 7:30 PM Men's · ETSU at Tennessee Tech | ",
 "Upcoming Feb 14, 2:00 PM Men's · ETSU vs Wofford | ",
 "Upcoming Feb 18, 6:00 PM Men's · ETSU at Western Carolina | ",
 "Upcoming Feb 24, 7:00 PM Men's · ETSU vs The Citadel | ",
 "Upcoming Feb 27, 10:00 AM Men's · ETSU vs Samford | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · ETSU vs West Florida | ",
 "Upcoming Nov 5, 7:00 PM Women's · ETSU at Clemson | ",
 "Upcoming Nov 8, 2:00 PM Women's · ETSU vs UVA Wise | ",
 "Upcoming Nov 11, 7:00 PM Women's · ETSU at Elon | ",
 "Upcoming Nov 15, 2:00 PM Women's · ETSU vs Coastal Carolina | ",
 "Upcoming Nov 18, 6:00 PM Women's · ETSU at Gardner-Webb | ",
 "Upcoming Nov 21, 1:30 PM Women's · ETSU vs Kennesaw State | ",
 "Upcoming Nov 24, 6:30 PM Women's · ETSU at UNC Asheville | ",
 "Upcoming Nov 29 Women's · ETSU at Louisville | ",
 "Upcoming Dec 2, 7:00 PM Women's · ETSU at Radford | ",
 "Upcoming Dec 6, 2:00 PM Women's · ETSU vs Morehead State | ",
 "Upcoming Dec 13, 3:00 PM Women's · ETSU at Southern Indiana | ",
 "Upcoming Dec 16, 7:00 PM Women's · ETSU vs Charleston Southern | ",
 "Upcoming Dec 20, 2:00 PM Women's · ETSU vs Charlotte | ",
 "Upcoming Dec 29, 7:00 PM Women's · ETSU vs Tennessee Tech | ",
 "Upcoming Jan 2, 4:00 PM Women's · ETSU vs Western Carolina | ",
 "Upcoming Jan 5, 6:30 PM Women's · ETSU at Furman | ",
 "Upcoming Jan 9, 1:30 PM Women's · ETSU vs Samford | ",
 "Upcoming Jan 12, 7:00 PM Women's · ETSU vs Wofford | ",
 "Upcoming Jan 16, 5:00 PM Women's · ETSU at Tennessee Tech | ",
 "Upcoming Jan 19, 6:00 PM Women's · ETSU at Western Carolina | ",
 "Upcoming Jan 23, 4:00 PM Women's · ETSU vs Mercer | ",
 "Upcoming Jan 26, 7:00 PM Women's · ETSU vs UNC Greensboro | ",
 "Upcoming Jan 30, 2:00 PM Women's · ETSU at Chattanooga | ",
 "Upcoming Feb 6, 2:00 PM Women's · ETSU at Samford | ",
 "Upcoming Feb 9, 7:00 PM Women's · ETSU vs Furman | ",
 "Upcoming Feb 13 Women's · ETSU at Mercer | ",
 "Upcoming Feb 16, 7:00 PM Women's · ETSU at Wofford | ",
 "Upcoming Feb 20, 4:00 PM Women's · ETSU vs Chattanooga | ",
 "Upcoming Feb 23 Women's · ETSU at UNC Greensboro | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · ETSU at USC Upstate Eye Opener | 4th of 13",
 "Final Sep 18 Women's · ETSU at Hokie Invitational | 2nd of 6",
 "Final Oct 3 Women's · ETSU at Louisville XC Classic | 3rd of 24",
 "Final Oct 17 Women's · ETSU at USC Upstate Invitational | 3rd of 36",
 "Upcoming Oct 31, 10:45 AM Women's · ETSU at SoCon Cross Country Championship | ",
 "Upcoming Nov 13 Women's · ETSU at NCAA South Regional | ",
 "Upcoming Nov 21 Women's · ETSU at NCAA Cross Country Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · ETSU at USC Upstate Eye Opener | 5th of 13",
 "Final Sep 18 Men's · ETSU at Hokie Invitational | 2nd of 6",
 "Final Oct 3 Men's · ETSU at Louisville XC Classic | 17th of 24",
 "Final Oct 17 Men's · ETSU at USC Upstate Invitational | 12th of 36",
 "Upcoming Oct 31, 10:00 AM Men's · ETSU at SoCon Cross Country Championship | ",
 "Upcoming Nov 13 Men's · ETSU at NCAA South Regional | ",
 "Upcoming Nov 21 Men's · ETSU at NCAA Cross Country Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 ETSU vs Campbell | L, 37-49",
 "Final Sep 5 ETSU vs Tusculum | W, 48-14",
 "Final Sep 12 ETSU at North Carolina | L, 3-35",
 "Final Sep 19 ETSU vs West Georgia | W, 35-27",
 "Final Sep 26 ETSU vs Western Carolina | W, 58-31",
 "Final Oct 3 ETSU vs Chattanooga | W, 14-3",
 "Final Oct 10 ETSU at The Citadel | W, 34-16",
 "Today Oct 24, 1:30 PM ETSU at VMI | ",
 "Upcoming Oct 31, 3:30 PM ETSU vs Tennessee Tech | ",
 "Upcoming Nov 7, 1:00 PM ETSU vs Samford | ",
 "Upcoming Nov 14, 1:30 PM ETSU at Wofford | ",
 "Upcoming Nov 21, 3:00 PM ETSU at Mercer | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · ETSU at Tiger Classic | 5th",
 "Final Sep 6 Women's · ETSU at Golfweek Fall Challenge | 9th",
 "Final Sep 21 Women's · ETSU at Golfweek Red Sky Classic | 11th",
 "Final Oct 4 Women's · ETSU at Mercedes-Benz Intercollegiate | 8th",
 "Final Oct 12 Women's · ETSU at Terrier Intercollegiate | 1st",
 "Upcoming Feb 7 Women's · ETSU at Treasure Coast Invitational | ",
 "Upcoming Feb 26 Women's · ETSU at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 15 Women's · ETSU at Low Country Intercollegiate | ",
 "Upcoming Mar 29 Women's · ETSU at Coach Mo Classic | ",
 "Upcoming Apr 19 Women's · ETSU at Southern Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · ETSU at Inverness Intercollegiate | T2nd",
 "Final Sep 21 Men's · ETSU at Highlands Invitational hosted by Turtleson | 1st",
 "Final Oct 4 Men's · ETSU at Trinity Forest Invitational | 1st",
 "Final Oct 19 Men's · ETSU at Bank of Tennessee Intercollegiate | 4th",
 "Upcoming Oct 26 Men's · ETSU at Ka‘anapali Classic by OUTRIGGER | ",
 "Upcoming Feb 16 Men's · ETSU at Battle at Briars Creek | ",
 "Upcoming Mar 7 Men's · ETSU at Colleton River Collegiate | ",
 "Upcoming Mar 14 Men's · ETSU at Michael A. Marino Classic | ",
 "Upcoming Mar 28 Men's · ETSU at Hootie Intercollegiate | ",
 "Upcoming Apr 12 Men's · ETSU at Ford Collegiate | ",
 "Upcoming Apr 26 Men's · ETSU at Southern Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · ETSU at Vanderbilt | L, 0-4",
 "Final Aug 20 Women's · ETSU vs West Georgia | W, 1-0",
 "Final Aug 23 Women's · ETSU at UNC Asheville | W, 2-0",
 "Final Aug 30 Women's · ETSU at Longwood | W, 2-1",
 "Final Sep 3 Women's · ETSU at Georgia State | L, 1-2",
 "Final Sep 10 Women's · ETSU vs App State | L, 0-2",
 "Final Sep 13 Women's · ETSU at Radford | T, 1-1",
 "Final Sep 17 Women's · ETSU vs Mercer | W, 1-0",
 "Final Sep 20 Women's · ETSU at Wofford | W, 2-0",
 "Final Sep 25 Women's · ETSU vs Tennessee Tech | W, 3-0",
 "Final Oct 1 Women's · ETSU at Western Carolina | W, 3-1",
 "Final Oct 4 Women's · ETSU vs Samford | L, 0-2",
 "Final Oct 11 Women's · ETSU at VMI | W, 3-0",
 "Final Oct 18 Women's · ETSU at UNC Greensboro | T, 0-0",
 "Final Oct 23 Women's · ETSU vs Furman | L, 0-2",
 "Upcoming Oct 29 Women's · ETSU at Chattanooga | ",
 "Upcoming Nov 1, 1:00 PM Women's · ETSU vs The Citadel | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · ETSU at Queens | W, 1-0",
 "Final Aug 23 Men's · ETSU at Clemson | L, 0-2",
 "Final Sep 1 Men's · ETSU vs USC Upstate | L, 0-3",
 "Final Sep 5 Men's · ETSU vs Longwood | L, 3-4",
 "Final Sep 9 Men's · ETSU at Virginia Tech | W, 3-1",
 "Final Sep 12 Men's · ETSU vs Belmont | W, 4-3",
 "Final Sep 16 Men's · ETSU at UNC Asheville | L, 1-2",
 "Final Sep 19 Men's · ETSU at Wofford | T, 1-1",
 "Final Sep 22 Men's · ETSU vs Presbyterian | W, 6-2",
 "Final Sep 27 Men's · ETSU vs VMI | W, 2-1",
 "Final Sep 30 Men's · ETSU at Radford | T, 0-0",
 "Final Oct 3 Men's · ETSU vs Charlotte | L, 2-4",
 "Final Oct 6 Men's · ETSU vs Gardner-Webb | L, 1-2",
 "Final Oct 10 Men's · ETSU vs Liberty | W, 2-0",
 "Final Oct 13 Men's · ETSU at Winthrop | W, 1-0",
 "Final Oct 17 Men's · ETSU at Mercer | T, 0-0",
 "Today Oct 24, 6:00 PM Men's · ETSU vs Furman | ",
 "Upcoming Oct 31, 6:00 PM Men's · ETSU at UNCG | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · ETSU at Big Blue Invite | Completed",
 "Final Oct 8 Women's · ETSU at ITA Ohio Valley Regional Championships | Completed",
 "Upcoming Oct 30 Women's · ETSU at Roberta Alison Fall Classic | ",
 "Upcoming Nov 5 Women's · ETSU at ITA Masters Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · ETSU at Elon Invitational | Completed",
 "Final Sep 19 Men's · ETSU at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · ETSU at ITA Ohio Valley Regional Championships | Completed",
 "Today Oct 23 Men's · ETSU at Wake Forest Invitational | ",
 "Upcoming Oct 30 Men's · ETSU at MTSU Shootout | ",
 "Upcoming Nov 5 Men's · ETSU at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · ETSU at ITA Masters Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 4 ETSU at Buccaneer Collegiate Cup | 3rd of 10",
 "Final Sep 19 ETSU at Beaver County Tri Cup | 4th of 10",
 "Final Oct 4 ETSU at Navy Collegiate Cup | 7th of 10",
 "Final Oct 17 ETSU at East Regional Qualifier | 4th of 8",
 "Upcoming Nov 8 ETSU at National Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 ETSU vs Akron | L, 2-3",
 "Final Aug 28 ETSU vs Auburn | L, 1-3",
 "Final Aug 29 ETSU vs Liberty | L, 2-3",
 "Final Sep 4 ETSU at VCU | L, 2-3",
 "Final Sep 5 ETSU vs William & Mary | L, 0-3",
 "Final Sep 11 ETSU vs Georgia Southern | L, 0-3",
 "Final Sep 12 ETSU vs East Carolina | W, 3-2",
 "Final Sep 13 ETSU at Wake Forest | L, 2-3",
 "Final Sep 15 ETSU vs South Carolina | W, 3-2",
 "Final Sep 18 ETSU vs Oklahoma | L, 2-3",
 "Final Sep 19 ETSU at Western Kentucky | L, 0-3",
 "Final Sep 24 ETSU at Samford | L, 1-3",
 "Final Sep 25 ETSU at Samford | L, 1-3",
 "Final Oct 2 ETSU vs Mercer | L, 0-3",
 "Final Oct 3 ETSU vs Mercer | W, 3-0",
 "Final Oct 6 ETSU vs UNC Greensboro | W, 3-2",
 "Final Oct 9 ETSU at Chattanooga | W, 3-0",
 "Final Oct 10 ETSU at Chattanooga | W, 3-0",
 "Final Oct 16 ETSU vs Wofford | W, 3-2",
 "Final Oct 17 ETSU vs Wofford | W, 3-1",
 "Final Oct 23 ETSU vs Furman | W, 3-1",
 "Today Oct 24, 2:00 PM ETSU vs Furman | ",
 "Upcoming Oct 27, 6:00 PM ETSU at UNC Greensboro | ",
 "Upcoming Oct 30, 7:00 PM ETSU at Tennessee Tech | ",
 "Upcoming Oct 31, 3:00 PM ETSU at Tennessee Tech | ",
 "Upcoming Nov 5, 6:00 PM ETSU vs The Citadel | ",
 "Upcoming Nov 6, 11:00 AM ETSU vs The Citadel | ",
 "Upcoming Nov 13, 6:00 PM ETSU at Western Carolina | ",
 "Upcoming Nov 14, 2:00 PM ETSU at Western Carolina | ",
 "Upcoming Nov 19 ETSU at SoCon Championship | "
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
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("East Tennessee State module checks passed");
