import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {jacksonvilleStateSchool} from '../src/schools/jacksonville-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='jacksonville-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,jacksonvilleStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/jacksonville-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit jaxstatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['jacksonville-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',jacksonvilleStateSchool.scheduleUrls],['roster',jacksonvilleStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('jacksonville-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'jaxstatesports.com',`${key} must stay on jaxstatesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://jaxstatesports.com/sports/baseball/schedule"],"roster":["https://jaxstatesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://jaxstatesports.com/sports/mens-basketball/schedule","https://jaxstatesports.com/sports/womens-basketball/schedule"],"roster":["https://jaxstatesports.com/sports/mens-basketball/roster","https://jaxstatesports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://jaxstatesports.com/sports/bowling/schedule"],"roster":["https://jaxstatesports.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://jaxstatesports.com/sports/cross-country/schedule"],"roster":["https://jaxstatesports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://jaxstatesports.com/sports/football/schedule"],"roster":["https://jaxstatesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://jaxstatesports.com/sports/womens-golf/schedule","https://jaxstatesports.com/sports/mens-golf/schedule"],"roster":["https://jaxstatesports.com/sports/womens-golf/roster","https://jaxstatesports.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://jaxstatesports.com/sports/rifle/schedule"],"roster":["https://jaxstatesports.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://jaxstatesports.com/sports/womens-soccer/schedule"],"roster":["https://jaxstatesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://jaxstatesports.com/sports/softball/schedule"],"roster":["https://jaxstatesports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://jaxstatesports.com/sports/womens-tennis/schedule","https://jaxstatesports.com/sports/mens-tennis/schedule"],"roster":["https://jaxstatesports.com/sports/womens-tennis/roster","https://jaxstatesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://jaxstatesports.com/sports/womens-track-and-field/schedule"],"roster":["https://jaxstatesports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://jaxstatesports.com/sports/womens-volleyball/schedule"],"roster":["https://jaxstatesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'jacksonville-state|"+sport+"':"),`${sport} routes must live in the Jacksonville State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://jaxstatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.jacksonvilleStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=jacksonville-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 1:00 PM Jacksonville State vs West Georgia (Exhibition) | ",
 "Upcoming Nov 1 Jacksonville State vs Louisiana Tech (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · Jacksonville State vs Alabama State (Exhibition) | W, 59-37",
 "Upcoming Oct 26, 6:00 PM Men's · Jacksonville State vs Samford (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Jacksonville State vs LaGrange | ",
 "Upcoming Nov 5, 7:00 PM Men's · Jacksonville State at South Alabama | ",
 "Upcoming Nov 11, 7:00 PM Men's · Jacksonville State at Houston | ",
 "Upcoming Nov 14, 6:00 PM Men's · Jacksonville State vs UAB | ",
 "Upcoming Nov 17, 6:30 PM Men's · Jacksonville State at Louisiana Tech | ",
 "Upcoming Nov 20, 6:00 PM Men's · Jacksonville State vs Georgia State | ",
 "Upcoming Nov 25, 9:30 PM Men's · Jacksonville State vs Pacific | ",
 "Upcoming Nov 26, 7:00 PM Men's · Jacksonville State vs UC Davis | ",
 "Upcoming Nov 27, 9:30 PM Men's · Jacksonville State vs Omaha | ",
 "Upcoming Dec 1, 6:00 PM Men's · Jacksonville State vs Little Rock | ",
 "Upcoming Dec 6, 3:00 PM Men's · Jacksonville State vs Louisiana Tech | ",
 "Upcoming Dec 12, 4:00 PM Men's · Jacksonville State vs East Tennessee State | ",
 "Upcoming Dec 16, 11:00 AM Men's · Jacksonville State vs Reinhardt | ",
 "Upcoming Dec 21, 6:00 PM Men's · Jacksonville State at Wichita State | ",
 "Upcoming Dec 31, 4:00 PM Men's · Jacksonville State vs Middle Tennessee | ",
 "Upcoming Jan 2, 4:00 PM Men's · Jacksonville State vs Western Kentucky | ",
 "Upcoming Jan 9, 1:00 PM Men's · Jacksonville State at Kennesaw State | ",
 "Upcoming Jan 14, 7:30 PM Men's · Jacksonville State at New Mexico State | ",
 "Upcoming Jan 16, 2:30 PM Men's · Jacksonville State at Sam Houston | ",
 "Upcoming Jan 21, 6:00 PM Men's · Jacksonville State vs Liberty | ",
 "Upcoming Jan 23, 4:00 PM Men's · Jacksonville State vs Delaware | ",
 "Upcoming Jan 28, 6:00 PM Men's · Jacksonville State at FIU | ",
 "Upcoming Jan 30, 2:00 PM Men's · Jacksonville State at Missouri State | ",
 "Upcoming Feb 6, 1:00 PM Men's · Jacksonville State vs Kennesaw State | ",
 "Upcoming Feb 11, 6:00 PM Men's · Jacksonville State vs Sam Houston | ",
 "Upcoming Feb 13, 4:00 PM Men's · Jacksonville State vs New Mexico State | ",
 "Upcoming Feb 18, 6:00 PM Men's · Jacksonville State at Delaware | ",
 "Upcoming Feb 20, 5:00 PM Men's · Jacksonville State at Liberty | ",
 "Upcoming Feb 25, 6:00 PM Men's · Jacksonville State vs FIU | ",
 "Upcoming Feb 27, 4:00 PM Men's · Jacksonville State vs Missouri State | ",
 "Upcoming Mar 4, 6:30 PM Men's · Jacksonville State at Western Kentucky | ",
 "Upcoming Mar 6, 2:00 PM Men's · Jacksonville State at Middle Tennessee | ",
 "Upcoming Mar 9 Men's · Jacksonville State at Conference USA Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Jacksonville State vs Oglethorpe | ",
 "Upcoming Nov 6, 11:00 AM Women's · Jacksonville State vs Life | ",
 "Upcoming Nov 9, 6:00 PM Women's · Jacksonville State vs UNA | ",
 "Upcoming Nov 16, 6:00 PM Women's · Jacksonville State at Southern Miss | ",
 "Upcoming Nov 20, 12:00 PM Women's · Jacksonville State at North Dakota | ",
 "Upcoming Nov 27, 4:00 PM Women's · Jacksonville State at UC Irvine | ",
 "Upcoming Nov 28, 4:00 PM Women's · Jacksonville State vs Wyoming | ",
 "Upcoming Dec 2, 10:00 AM Women's · Jacksonville State at Mercer | ",
 "Upcoming Dec 8, 6:00 PM Women's · Jacksonville State vs Point | ",
 "Upcoming Dec 15, 6:00 PM Women's · Jacksonville State at Wichita State | ",
 "Upcoming Dec 17, 6:30 PM Women's · Jacksonville State at Missouri | ",
 "Upcoming Dec 20, 1:00 PM Women's · Jacksonville State vs Presbyterian | ",
 "Upcoming Jan 2, 2:00 PM Women's · Jacksonville State at Middle Tennessee | ",
 "Upcoming Jan 4, 6:30 PM Women's · Jacksonville State at Western Kentucky | ",
 "Upcoming Jan 10, 2:00 PM Women's · Jacksonville State vs Kennesaw State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Jacksonville State vs New Mexico State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Jacksonville State vs Sam Houston | ",
 "Upcoming Jan 21, 6:00 PM Women's · Jacksonville State at Liberty | ",
 "Upcoming Jan 23, 12:00 PM Women's · Jacksonville State at Delaware | ",
 "Upcoming Jan 28, 6:00 PM Women's · Jacksonville State vs Florida International | ",
 "Upcoming Jan 30, 11:00 AM Women's · Jacksonville State vs Missouri State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Jacksonville State at Kennesaw State | ",
 "Upcoming Feb 11, 6:30 PM Women's · Jacksonville State at Sam Houston | ",
 "Upcoming Feb 13, 1:00 PM Women's · Jacksonville State at New Mexico State | ",
 "Upcoming Feb 18, 6:00 PM Women's · Jacksonville State vs Delaware | ",
 "Upcoming Feb 20, 2:00 PM Women's · Jacksonville State vs Liberty | ",
 "Upcoming Feb 25, 10:00 AM Women's · Jacksonville State at Florida International | ",
 "Upcoming Feb 27, 1:00 PM Women's · Jacksonville State at Missouri State | ",
 "Upcoming Mar 4, 6:00 PM Women's · Jacksonville State vs Western Kentucky | ",
 "Upcoming Mar 6, 2:00 PM Women's · Jacksonville State vs Middle Tennessee | ",
 "Upcoming Mar 9 Women's · Jacksonville State at Conference USA Tournament | "
]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[
 "Final Oct 16 Jacksonville State at Chelsea Gilliam Penguin Classic | 1st",
 "Final Oct 16 Jacksonville State vs Duquesne | W, 1128-895",
 "Final Oct 16 Jacksonville State vs Niagra | W, 962-830",
 "Final Oct 16 Jacksonville State vs Mercyhurst | L, 970-985",
 "Final Oct 16 Jacksonville State vs Vanderbilt | L, 1100-1118",
 "Final Oct 16 Jacksonville State vs Youngstown State | L, 1052-1124",
 "Final Oct 17 Jacksonville State vs Arkansas State | W, 963-866",
 "Final Oct 17 Jacksonville State at Nebraska | Completed",
 "Final Oct 17 Jacksonville State at Sacred Heart | Completed",
 "Final Oct 17 Jacksonville State at Maryville | Completed",
 "Final Oct 17 Jacksonville State at William Smith | Completed",
 "Final Oct 18 Jacksonville State vs Nebraska | W, 4-0",
 "Final Oct 18 Jacksonville State vs Western Illinois | W, 4-0",
 "Final Oct 18 Jacksonville State at Vanderbilt (Championship) | W, 4-0",
 "Upcoming Oct 30 Jacksonville State at Destination Orlando | ",
 "Upcoming Nov 13 Jacksonville State at Bearcat Invitational | ",
 "Upcoming Nov 20 Jacksonville State at Jersey Jamboree | ",
 "Upcoming Jan 15 Jacksonville State at Northeast Classic | ",
 "Upcoming Jan 22 Jacksonville State at Prairie View Invitational | ",
 "Upcoming Feb 5 Jacksonville State at Flyer Classic | ",
 "Upcoming Feb 19 Jacksonville State at Big Red Invite | ",
 "Upcoming Feb 26 Jacksonville State at Stallings Invitational | ",
 "Upcoming Mar 5 Jacksonville State at Columbia 300 Music City Classic | ",
 "Upcoming Mar 12 Jacksonville State at USBC Sectionals | ",
 "Upcoming Mar 16 Jacksonville State at CUSA Championship | ",
 "Upcoming Apr 6 Jacksonville State at NCAA Bowling Championship | ",
 "Upcoming Apr 12 Jacksonville State at Intercollegiate Team and Singles Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Jacksonville State at Foothills Invitational | 1st of 17",
 "Final Sep 18 Jacksonville State at Southern Showcase | 6th of 29",
 "Final Oct 2 Jacksonville State at Georgia Tech Invitational | 8th of 13",
 "Final Oct 9 Jacksonville State at FSU Invitational | 1st of 12",
 "Final Oct 16 Jacksonville State at Kennemer Classic | 1st of 12",
 "Upcoming Oct 31 Jacksonville State at Conference USA Championship | ",
 "Upcoming Nov 13 Jacksonville State at South Region Championship | ",
 "Upcoming Nov 21 Jacksonville State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Jacksonville State at North Dakota State | L, 7-33",
 "Final Sep 5 Jacksonville State vs Eastern Kentucky | W, 49-7",
 "Final Sep 12 Jacksonville State at Ohio | L, 27-29",
 "Final Sep 19 Jacksonville State vs Georgia Southern | W, 31-27",
 "Final Sep 26 Jacksonville State vs Middle Tennessee | W, 23-13",
 "Final Oct 7 Jacksonville State at Kennesaw State | W, 27-26",
 "Final Oct 13 Jacksonville State vs FIU | W, 27-24",
 "Upcoming Oct 28, 7:00 PM Jacksonville State at NM State | ",
 "Upcoming Nov 7, 6:00 PM Jacksonville State vs Sam Houston | ",
 "Upcoming Nov 14, 2:30 PM Jacksonville State at Western Kentucky | ",
 "Upcoming Nov 21, 1:00 PM Jacksonville State vs Missouri State | ",
 "Upcoming Nov 28, 2:30 PM Jacksonville State at Delaware | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Jacksonville State at Pirate Collegiate Classic | 7th of 13",
 "Final Sep 21 Women's · Jacksonville State at Bettie Lou Evans Invitational | 11th of 13",
 "Final Oct 5 Women's · Jacksonville State at The Ally | 14th of 17",
 "Final Oct 18 Women's · Jacksonville State at Diamante Intercollegiate | 10th of 20",
 "Upcoming Oct 26 Women's · Jacksonville State at Keswick Cup | ",
 "Upcoming Nov 1 Women's · Jacksonville State at Samford Intercollegiate | ",
 "Upcoming Feb 26 Women's · Jacksonville State at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 7 Women's · Jacksonville State at Chris Banister Golf Classic | ",
 "Upcoming Mar 21 Women's · Jacksonville State at FSU Matchup | ",
 "Upcoming Mar 30 Women's · Jacksonville State at Vanderbilt Mini Mason | ",
 "Upcoming Apr 5 Women's · Jacksonville State at Brickyard Collegiate | ",
 "Upcoming Apr 19 Women's · Jacksonville State at Conference USA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Jacksonville State at Myrtle Beach Golf Trips Intercollegiate | 11th of 16",
 "Final Sep 20 Men's · Jacksonville State at G-Mac Invitational | 3rd of 13",
 "Final Sep 27 Men's · Jacksonville State at Argent Financial Classic | T7th of 14",
 "Final Oct 12 Men's · Jacksonville State at Moraine Intercollegiate | 14th of 16",
 "Final Oct 18 Men's · Jacksonville State at Furman Intercollegiate | T6th of 15",
 "Upcoming Feb 26 Men's · Jacksonville State at The People's Championship | ",
 "Upcoming Mar 12 Men's · Jacksonville State at Seminole Intercollegiate | ",
 "Upcoming Mar 15 Men's · Jacksonville State at Tiger Invitational | ",
 "Upcoming Mar 29 Men's · Jacksonville State at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 11 Men's · Jacksonville State at Everett Buick GMC Classic | ",
 "Upcoming Apr 26 Men's · Jacksonville State at Conference USA Championship | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 10 Jacksonville State vs Morehead State | L, 4677-4695",
 "Upcoming Oct 24 Jacksonville State at Murray State | ",
 "Upcoming Oct 31 Jacksonville State at Morehead State | ",
 "Upcoming Nov 20 Jacksonville State at Gamecock Invitational | ",
 "Upcoming Nov 20 Jacksonville State at Gamecock Invitational | ",
 "Upcoming Nov 20 Jacksonville State at Gamecock Invitational | ",
 "Upcoming Jan 16 Jacksonville State at Army West Point | ",
 "Upcoming Jan 24 Jacksonville State at Murray State | ",
 "Upcoming Jan 24 Jacksonville State at Kentucky | ",
 "Upcoming Jan 24 Jacksonville State at UAB | ",
 "Upcoming Jan 24 Jacksonville State at UT Martin | ",
 "Upcoming Jan 24 Jacksonville State at Army West Point | ",
 "Upcoming Jan 24 Jacksonville State at Akron | ",
 "Upcoming Jan 24 Jacksonville State at Memphis | ",
 "Upcoming Jan 30 Jacksonville State at UT Martin | ",
 "Upcoming Feb 6 Jacksonville State at The Citadel | ",
 "Upcoming Feb 14 Jacksonville State at Murray State | ",
 "Upcoming Feb 20 Jacksonville State at UAB | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Jacksonville State vs West Georgia | T, 1-1",
 "Final Aug 16 Jacksonville State at Auburn | L, 0-5",
 "Final Aug 27 Jacksonville State at Samford | L, 1-4",
 "Final Aug 30 Jacksonville State vs Troy | W, 4-3",
 "Final Sep 3 Jacksonville State at Southern Miss | T, 1-1",
 "Final Sep 6 Jacksonville State vs North Florida | L, 3-4",
 "Final Sep 10 Jacksonville State at Alcorn State | L, 1-4",
 "Final Sep 13 Jacksonville State vs Alabama State | W, 1-0",
 "Final Sep 16 Jacksonville State at Gardner-Webb | W, 3-2",
 "Final Sep 20 Jacksonville State at UT Martin | L, 0-1",
 "Final Sep 27 Jacksonville State vs Middle Tennessee | L, 0-2",
 "Final Oct 1 Jacksonville State at Missouri State | T, 1-1",
 "Final Oct 4 Jacksonville State at FIU | L, 1-2",
 "Final Oct 9 Jacksonville State vs Kennesaw State | W, 1-0",
 "Final Oct 17 Jacksonville State vs Sam Houston | T, 1-1",
 "Today Oct 22, 6:00 PM Jacksonville State at Western Kentucky | ",
 "Upcoming Oct 25, 12:00 PM Jacksonville State vs Delaware | ",
 "Upcoming Oct 31, 5:00 PM Jacksonville State at New Mexico State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Mar 12, 6:00 PM Jacksonville State vs Missouri State | ",
 "Upcoming Mar 13, 1:00 PM Jacksonville State vs Missouri State | ",
 "Upcoming Mar 14, 11:00 AM Jacksonville State vs Missouri State | ",
 "Upcoming Mar 19, 5:00 PM Jacksonville State at Delaware | ",
 "Upcoming Mar 20, 2:00 PM Jacksonville State at Delaware | ",
 "Upcoming Mar 21, 10:00 AM Jacksonville State at Delaware | ",
 "Upcoming Mar 25, 6:00 PM Jacksonville State vs Liberty | ",
 "Upcoming Mar 26, 6:00 PM Jacksonville State vs Liberty | ",
 "Upcoming Mar 27, 11:00 AM Jacksonville State vs Liberty | ",
 "Upcoming Apr 2 Jacksonville State at New Mexico State | ",
 "Upcoming Apr 3 Jacksonville State at New Mexico State | ",
 "Upcoming Apr 4 Jacksonville State at New Mexico State | ",
 "Upcoming Apr 9, 6:00 PM Jacksonville State vs FIU | ",
 "Upcoming Apr 10, 1:00 PM Jacksonville State vs FIU | ",
 "Upcoming Apr 11, 11:00 AM Jacksonville State vs FIU | ",
 "Upcoming Apr 16 Jacksonville State at Western Kentucky | ",
 "Upcoming Apr 17 Jacksonville State at Western Kentucky | ",
 "Upcoming Apr 18 Jacksonville State at Western Kentucky | ",
 "Upcoming Apr 23, 6:00 PM Jacksonville State vs Sam Houston | ",
 "Upcoming Apr 24, 3:00 PM Jacksonville State vs Sam Houston | ",
 "Upcoming Apr 25, 11:00 AM Jacksonville State vs Sam Houston | ",
 "Upcoming Apr 30 Jacksonville State at Middle Tennessee | ",
 "Upcoming May 1 Jacksonville State at Middle Tennessee | ",
 "Upcoming May 2 Jacksonville State at Middle Tennessee | ",
 "Upcoming May 6, 6:00 PM Jacksonville State vs Kennesaw State | ",
 "Upcoming May 7, 6:00 PM Jacksonville State vs Kennesaw State | ",
 "Upcoming May 8, 12:00 PM Jacksonville State vs Kennesaw State | ",
 "Upcoming May 12 Jacksonville State at Conference USA Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Jacksonville State at Samford Invitational | Completed",
 "Upcoming Oct 29 Women's · Jacksonville State at UTR NCAA Division 1 Invitational | ",
 "Upcoming Jan 20 Women's · Jacksonville State at Florida State | ",
 "Upcoming Jan 24 Women's · Jacksonville State at Florida A&M | ",
 "Upcoming Feb 3 Women's · Jacksonville State vs Mercer | ",
 "Upcoming Feb 7 Women's · Jacksonville State vs Troy | ",
 "Upcoming Feb 13, 2:00 PM Women's · Jacksonville State at South Alabama | ",
 "Upcoming Feb 17 Women's · Jacksonville State at Shorter (Ga.) | ",
 "Upcoming Feb 17 Women's · Jacksonville State at Berry (Ga.) | ",
 "Upcoming Feb 20 Women's · Jacksonville State at Louisiana Tech | ",
 "Upcoming Feb 21 Women's · Jacksonville State vs UT Arlington | ",
 "Upcoming Feb 26 Women's · Jacksonville State at Western Kentucky | ",
 "Upcoming Feb 27 Women's · Jacksonville State at Lipscomb | ",
 "Upcoming Mar 5 Women's · Jacksonville State vs Chattanooga | ",
 "Upcoming Mar 9 Women's · Jacksonville State at North Alabama | ",
 "Upcoming Mar 13, 10:00 AM Women's · Jacksonville State at Mississippi Valley State | ",
 "Upcoming Mar 14, 1:00 PM Women's · Jacksonville State vs Wallace State-Hanceville | ",
 "Upcoming Mar 16 Women's · Jacksonville State at Alabama A&M | ",
 "Upcoming Mar 18 Women's · Jacksonville State at Samford | ",
 "Upcoming Mar 21 Women's · Jacksonville State at Alabama State | ",
 "Upcoming Mar 26 Women's · Jacksonville State vs Sam Houston | ",
 "Upcoming Mar 30, 1:00 PM Women's · Jacksonville State vs UAB | ",
 "Upcoming Apr 4 Women's · Jacksonville State at Georgia State | ",
 "Upcoming Apr 10 Women's · Jacksonville State vs Missouri State | ",
 "Upcoming Apr 17 Women's · Jacksonville State vs Kennesaw State | ",
 "Upcoming Apr 21 Women's · Jacksonville State at Conference USA Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Jacksonville State at Georgia Gwinnett Men's Invitational | Completed",
 "Final Sep 18 Men's · Jacksonville State at Samford Invitational | Completed",
 "Final Oct 9 Men's · Jacksonville State at ITA Southern Regional Championships | Completed",
 "Upcoming Oct 23 Men's · Jacksonville State at Samford/CC Birmingham | ",
 "Upcoming Oct 29 Men's · Jacksonville State at UTR NCAA Division 1 Invitational | ",
 "Upcoming Jan 22 Men's · Jacksonville State at ITA Kickoff | ",
 "Upcoming Feb 5 Men's · Jacksonville State at North Florida | ",
 "Upcoming Feb 6, 12:00 PM Men's · Jacksonville State at Georgia Southern | ",
 "Upcoming Feb 12 Men's · Jacksonville State at West Florida | ",
 "Upcoming Feb 13, 10:30 AM Men's · Jacksonville State at South Alabama | ",
 "Upcoming Feb 17 Men's · Jacksonville State at Shorter (Ga.) | ",
 "Upcoming Feb 17 Men's · Jacksonville State at Berry (Ga.) | ",
 "Upcoming Feb 19 Men's · Jacksonville State vs Chattanooga | ",
 "Upcoming Feb 23, 1:00 PM Men's · Jacksonville State at Troy | ",
 "Upcoming Mar 3 Men's · Jacksonville State at Alabama A&M | ",
 "Upcoming Mar 9 Men's · Jacksonville State at North Alabama | ",
 "Upcoming Mar 13, 10:00 AM Men's · Jacksonville State at Mississippi Valley State | ",
 "Upcoming Mar 14, 1:00 PM Men's · Jacksonville State vs Wallace State-Hanceville | ",
 "Upcoming Mar 20 Men's · Jacksonville State vs Dartmouth | ",
 "Upcoming Mar 21 Men's · Jacksonville State at Alabama State | ",
 "Upcoming Mar 31, 2:00 PM Men's · Jacksonville State vs UAB | ",
 "Upcoming Apr 4 Men's · Jacksonville State vs Kennesaw State | ",
 "Upcoming Apr 8 Men's · Jacksonville State at Georgia State | ",
 "Upcoming Apr 22 Men's · Jacksonville State at CUSA Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 3 Jacksonville State at Liberty Kickoff | ",
 "Upcoming Dec 4 Jacksonville State at Icebreaker Invitational | ",
 "Upcoming Jan 15 Jacksonville State at UAB Green and Gold Invitational | ",
 "Upcoming Jan 29 Jacksonville State at Lenny Lyles Invitational | ",
 "Upcoming Feb 5 Jacksonville State at Visit Gainesville Invitational | ",
 "Upcoming Feb 12 Jacksonville State at Tyson Invitational | ",
 "Upcoming Feb 13 Jacksonville State at Samford | ",
 "Upcoming Feb 26 Jacksonville State at Conference USA | ",
 "Upcoming Mar 12 Jacksonville State at Jax State Opener | ",
 "Upcoming Mar 19 Jacksonville State at UCF Black & Gold Challenge | ",
 "Upcoming Mar 26 Jacksonville State at UAB Spring Invite | ",
 "Upcoming Apr 9 Jacksonville State at Joe Walker Invitational | ",
 "Upcoming Apr 15 Jacksonville State at Wake Forest | ",
 "Upcoming Apr 16 Jacksonville State at Georgia Tech Invitational | ",
 "Upcoming Apr 23 Jacksonville State at Josh Reidinger Classic | ",
 "Upcoming Apr 30 Jacksonville State at Music City Challenge | ",
 "Upcoming May 13 Jacksonville State at OUTDOOR SCHEDULE | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Jacksonville State vs Jacksonville | L, 0-3",
 "Final Aug 29 Jacksonville State vs Southern | W, 3-1",
 "Final Aug 29 Jacksonville State vs Southern Miss | L, 0-3",
 "Final Sep 4 Jacksonville State vs Seton Hall | L, 1-3",
 "Final Sep 5 Jacksonville State vs Bellarmine | L, 2-3",
 "Final Sep 5 Jacksonville State vs Western Carolina | L, 1-3",
 "Final Sep 6 Jacksonville State vs UNC Asheville | L, 0-3",
 "Final Sep 12 Jacksonville State vs UNA | L, 0-3",
 "Final Sep 13 Jacksonville State at Samford | L, 1-3",
 "Final Sep 17 Jacksonville State at Alabama | L, 2-3",
 "Final Sep 18 Jacksonville State vs Southern | W, 3-0",
 "Final Sep 18 Jacksonville State vs Nicholls | W, 3-1",
 "Final Sep 25 Jacksonville State at Delaware | L, 1-3",
 "Final Sep 26 Jacksonville State at Delaware | L, 0-3",
 "Final Oct 2 Jacksonville State vs Liberty | L, 0-3",
 "Final Oct 3 Jacksonville State vs Liberty | L, 0-3",
 "Final Oct 9 Jacksonville State vs Western Kentucky | L, 0-3",
 "Final Oct 10 Jacksonville State vs Western Kentucky | L, 0-3",
 "Final Oct 16 Jacksonville State at New Mexico State | L, 0-3",
 "Final Oct 17 Jacksonville State at New Mexico State | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Jacksonville State vs Florida International | ",
 "Upcoming Oct 24, 1:00 PM Jacksonville State vs Florida International | ",
 "Upcoming Oct 30, 6:00 PM Jacksonville State at Sam Houston | ",
 "Upcoming Oct 31, 1:00 PM Jacksonville State at Sam Houston | ",
 "Upcoming Nov 5, 6:00 PM Jacksonville State vs Kennesaw State | ",
 "Upcoming Nov 6, 5:00 PM Jacksonville State vs Kennesaw State | ",
 "Upcoming Nov 12, 6:00 PM Jacksonville State at Missouri State | ",
 "Upcoming Nov 13, 6:00 PM Jacksonville State at Missouri State | ",
 "Upcoming Nov 20 Jacksonville State at Conference USA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Jacksonville State module checks passed");
