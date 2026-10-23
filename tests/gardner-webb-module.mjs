import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {gardnerWebbSchool} from '../src/schools/gardner-webb.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='gardner-webb');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,gardnerWebbHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/gardner-webb-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gwusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['gardner-webb'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',gardnerWebbSchool.scheduleUrls],['roster',gardnerWebbSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('gardner-webb|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gwusports.com',`${key} must stay on gwusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gwusports.com/sports/baseball/schedule"],"roster":["https://gwusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gwusports.com/sports/mens-basketball/schedule","https://gwusports.com/sports/womens-basketball/schedule"],"roster":["https://gwusports.com/sports/mens-basketball/roster","https://gwusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gwusports.com/sports/cross-country/schedule"],"roster":["https://gwusports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gwusports.com/sports/football/schedule"],"roster":["https://gwusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gwusports.com/sports/womens-golf/schedule","https://gwusports.com/sports/mens-golf/schedule"],"roster":["https://gwusports.com/sports/womens-golf/roster","https://gwusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gwusports.com/sports/womens-lacrosse/schedule"],"roster":["https://gwusports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gwusports.com/sports/womens-soccer/schedule","https://gwusports.com/sports/mens-soccer/schedule"],"roster":["https://gwusports.com/sports/womens-soccer/roster","https://gwusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gwusports.com/sports/softball/schedule"],"roster":["https://gwusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gwusports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gwusports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gwusports.com/sports/track-and-field/schedule"],"roster":["https://gwusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gwusports.com/sports/womens-volleyball/schedule"],"roster":["https://gwusports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gwusports.com/sports/wrestling/schedule"],"roster":["https://gwusports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'gardner-webb|"+sport+"':"),`${sport} routes must live in the Gardner-Webb module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gwusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.gardnerWebbHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=gardner-webb)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 9:00 PM Men's · Gardner-Webb at UCONN | ",
 "Upcoming Nov 5, 8:00 PM Men's · Gardner-Webb at Texas | ",
 "Upcoming Nov 11, 8:00 PM Men's · Gardner-Webb vs Erskine | ",
 "Upcoming Nov 14, 2:00 PM Men's · Gardner-Webb at South Carolina | ",
 "Upcoming Nov 18, 8:00 PM Men's · Gardner-Webb vs UNC Greensboro | ",
 "Upcoming Nov 21 Men's · Gardner-Webb at VMI | ",
 "Upcoming Nov 24, 7:00 PM Men's · Gardner-Webb at Bowling Green | ",
 "Upcoming Nov 28, 1:00 PM Men's · Gardner-Webb vs North Carolina Central | ",
 "Upcoming Dec 2, 11:00 AM Men's · Gardner-Webb vs Bob Jones | ",
 "Upcoming Dec 5, 1:00 PM Men's · Gardner-Webb vs Queens | ",
 "Upcoming Dec 12, 1:00 PM Men's · Gardner-Webb vs Campbell | ",
 "Upcoming Dec 15 Men's · Gardner-Webb at Wake Forest | ",
 "Upcoming Dec 18, 6:00 PM Men's · Gardner-Webb vs Toccoa Falls | ",
 "Upcoming Dec 20 Men's · Gardner-Webb at Georgia | ",
 "Upcoming Dec 28 Men's · Gardner-Webb at Kentucky | ",
 "Upcoming Jan 1, 2:00 PM Men's · Gardner-Webb at Winthrop | ",
 "Upcoming Jan 6, 11:00 AM Men's · Gardner-Webb at Charleston Southern | ",
 "Upcoming Jan 9, 1:00 PM Men's · Gardner-Webb vs Presbyterian | ",
 "Upcoming Jan 13, 7:00 PM Men's · Gardner-Webb at High Point | ",
 "Upcoming Jan 16, 1:00 PM Men's · Gardner-Webb vs UNC Asheville | ",
 "Upcoming Jan 20, 7:00 PM Men's · Gardner-Webb at Longwood | ",
 "Upcoming Jan 23 Men's · Gardner-Webb at USC Upstate | ",
 "Upcoming Jan 28, 7:00 PM Men's · Gardner-Webb vs Radford | ",
 "Upcoming Jan 30 Men's · Gardner-Webb at Presbyterian | ",
 "Upcoming Feb 3, 7:00 PM Men's · Gardner-Webb vs Charleston Southern | ",
 "Upcoming Feb 11, 7:00 PM Men's · Gardner-Webb vs Longwood | ",
 "Upcoming Feb 13, 4:30 PM Men's · Gardner-Webb vs High Point | ",
 "Upcoming Feb 18 Men's · Gardner-Webb at Radford | ",
 "Upcoming Feb 20, 1:00 PM Men's · Gardner-Webb vs Winthrop | ",
 "Upcoming Feb 25, 7:00 PM Men's · Gardner-Webb vs USC Upstate | ",
 "Upcoming Feb 27, 2:00 PM Men's · Gardner-Webb at UNC Asheville | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 6:30 PM Women's · Gardner-Webb at Catawba | ",
 "Upcoming Nov 11, 6:00 PM Women's · Gardner-Webb vs UNC Greensboro | ",
 "Upcoming Nov 14, 2:00 PM Women's · Gardner-Webb vs Queens | ",
 "Upcoming Nov 18, 6:00 PM Women's · Gardner-Webb vs ETSU | ",
 "Upcoming Nov 22, 2:00 PM Women's · Gardner-Webb vs Mercer | ",
 "Upcoming Nov 24, 7:00 PM Women's · Gardner-Webb at North Carolina | ",
 "Upcoming Nov 27, 2:30 PM Women's · Gardner-Webb vs East Carolina | ",
 "Upcoming Nov 28 Women's · Gardner-Webb at Cal Bears B.A.R. Invitational | ",
 "Upcoming Dec 2, 11:30 AM Women's · Gardner-Webb at Western Carolina | ",
 "Upcoming Dec 6, 6:00 PM Women's · Gardner-Webb at Clemson | ",
 "Upcoming Dec 16, 11:00 AM Women's · Gardner-Webb vs Tennessee Tech | ",
 "Upcoming Dec 19 Women's · Gardner-Webb at Wofford | ",
 "Upcoming Dec 22, 1:00 PM Women's · Gardner-Webb at UNC Wilmington | ",
 "Upcoming Dec 28, 6:00 PM Women's · Gardner-Webb at South Carolina | ",
 "Upcoming Dec 30, 7:00 PM Women's · Gardner-Webb at Radford | ",
 "Upcoming Jan 2, 2:00 PM Women's · Gardner-Webb vs UNC Asheville | ",
 "Upcoming Jan 6 Women's · Gardner-Webb at Longwood | ",
 "Upcoming Jan 9, 2:00 PM Women's · Gardner-Webb at Winthrop | ",
 "Upcoming Jan 13, 7:00 PM Women's · Gardner-Webb vs High Point | ",
 "Upcoming Jan 20, 7:00 PM Women's · Gardner-Webb vs USC Upstate | ",
 "Upcoming Jan 23, 2:00 PM Women's · Gardner-Webb at Presbyterian | ",
 "Upcoming Jan 27, 7:00 PM Women's · Gardner-Webb vs Charleston Southern | ",
 "Upcoming Jan 30, 2:00 PM Women's · Gardner-Webb vs Radford | ",
 "Upcoming Feb 3, 7:00 PM Women's · Gardner-Webb at High Point | ",
 "Upcoming Feb 6, 2:00 PM Women's · Gardner-Webb at UNC Asheville | ",
 "Upcoming Feb 10, 7:00 PM Women's · Gardner-Webb vs Presbyterian | ",
 "Upcoming Feb 13, 2:00 PM Women's · Gardner-Webb vs Winthrop | ",
 "Upcoming Feb 17, 6:00 PM Women's · Gardner-Webb at Charleston Southern | ",
 "Upcoming Feb 20, 4:00 PM Women's · Gardner-Webb at USC Upstate | ",
 "Upcoming Feb 27, 2:00 PM Women's · Gardner-Webb vs Longwood | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Gardner-Webb at Elon Night Race | Completed",
 "Final Sep 12 Gardner-Webb at Furman Invitational | Completed",
 "Final Oct 2 Gardner-Webb at Firetower Project | Women's team: 9th / Men's team: 12th",
 "Final Oct 17 Gardner-Webb at Upstate Invite | Women's team: 11th / Men's team: 19th",
 "Upcoming Oct 30 Gardner-Webb at Big South Conference Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Gardner-Webb at Austin Peay | L, 17-35",
 "Final Sep 5 Gardner-Webb at Wofford | L, 13-17",
 "Final Sep 12 Gardner-Webb at Liberty | L, 23-24",
 "Final Sep 19 Gardner-Webb vs North Carolina Central | W, 44-20",
 "Final Sep 26 Gardner-Webb at Marshall | L, 35-36",
 "Final Oct 3 Gardner-Webb at Charleston Southern | W, 12-10",
 "Final Oct 10 Gardner-Webb vs Eastern Illinois | L, 7-21",
 "Final Oct 17 Gardner-Webb at UT Martin | L, 6-17",
 "Upcoming Oct 31, 2:00 PM Gardner-Webb at Southeast Missouri State | ",
 "Upcoming Nov 7, 1:30 PM Gardner-Webb vs Lindenwood | ",
 "Upcoming Nov 14 Gardner-Webb at Western Illinois | ",
 "Upcoming Nov 21, 1:30 PM Gardner-Webb vs Tennessee State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Gardner-Webb at AOD Invitational | Completed",
 "Final Sep 14 Women's · Gardner-Webb at ECU Pirate Classic | Completed",
 "Final Oct 12 Women's · Gardner-Webb at Terrier Intercollegiate | T8th of 12",
 "Today Oct 23 Women's · Gardner-Webb at Fripp Island Intercollegiate | ",
 "Upcoming Feb 8 Women's · Gardner-Webb at Oyster Shuck Match Play | ",
 "Upcoming Mar 14 Women's · Gardner-Webb at Lowcountry Intercollegiate | ",
 "Upcoming Mar 21 Women's · Gardner-Webb at City of Oaks Intercollegiate | ",
 "Upcoming Mar 29 Women's · Gardner-Webb at Mimosa Hills Intercollegiate | ",
 "Upcoming Apr 4 Women's · Gardner-Webb at Ironwood Intercollegiate | ",
 "Upcoming Apr 12 Women's · Gardner-Webb at Strutting Gus Shootout | ",
 "Upcoming Apr 18 Women's · Gardner-Webb at Big South Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Gardner-Webb at Bryan National Intercollegiate | 8th of 13",
 "Final Sep 21 Men's · Gardner-Webb at Temple Intercollegiate | 7th of 12",
 "Final Sep 28 Men's · Gardner-Webb at ECU Ironwood Intercollegiate | 7th of 14",
 "Final Oct 12 Men's · Gardner-Webb at Elon Phoenix Invitational | 12th of 17",
 "Today Oct 23 Men's · Gardner-Webb at Fripp Island Intercollegiate | ",
 "Upcoming Feb 15 Men's · Gardner-Webb at Wexford Intercollegiate | ",
 "Upcoming Mar 8 Men's · Gardner-Webb at Palmetto Intercollegiate | ",
 "Upcoming Mar 29 Men's · Gardner-Webb at Brook Valley Intercollegiate | ",
 "Upcoming Apr 10 Men's · Gardner-Webb at Tar Heel Intercollegiate | ",
 "Upcoming Apr 25 Men's · Gardner-Webb at Big South Tournament | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Gardner-Webb vs Queens | W, 2-0",
 "Final Aug 20 Women's · Gardner-Webb vs Emory & Henry | W, 5-0",
 "Final Aug 23 Women's · Gardner-Webb vs Appalachian State | L, 0-2",
 "Final Aug 27 Women's · Gardner-Webb at Wofford | L, 0-1",
 "Final Aug 30 Women's · Gardner-Webb at VMI | T, 1-1",
 "Final Sep 3 Women's · Gardner-Webb at Clemson | L, 1-5",
 "Final Sep 7 Women's · Gardner-Webb vs Montreat | W, 7-1",
 "Final Sep 13 Women's · Gardner-Webb at Georgia State | L, 0-2",
 "Final Sep 16 Women's · Gardner-Webb vs Jacksonville State | L, 2-3",
 "Final Sep 23 Women's · Gardner-Webb at Presbyterian | W, 2-1",
 "Final Sep 26 Women's · Gardner-Webb at Charleston Southern | W, 2-1",
 "Final Oct 3 Women's · Gardner-Webb vs UNC Asheville | L, 0-4",
 "Final Oct 10 Women's · Gardner-Webb at Radford | L, 0-2",
 "Final Oct 14 Women's · Gardner-Webb vs High Point | T, 0-0",
 "Final Oct 17 Women's · Gardner-Webb at Winthrop | L, 0-1",
 "Upcoming Oct 28, 7:00 PM Women's · Gardner-Webb vs USC Upstate | ",
 "Upcoming Oct 31, 6:00 PM Women's · Gardner-Webb vs Longwood | ",
 "Upcoming Nov 5 Women's · Gardner-Webb at Big South Conference Quarterfinals | ",
 "Upcoming Nov 10 Women's · Gardner-Webb at Big South Conference Semifinals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 24 Men's · Gardner-Webb at James Madison | L, 0-2",
 "Final Aug 28 Men's · Gardner-Webb vs Davidson | T, 0-0",
 "Final Sep 5 Men's · Gardner-Webb at Coastal Carolina | W, 2-1",
 "Final Sep 9 Men's · Gardner-Webb at Furman | L, 0-1",
 "Final Sep 19 Men's · Gardner-Webb at High Point | L, 1-2",
 "Final Sep 23 Men's · Gardner-Webb at UAB | W, 3-2",
 "Final Sep 26 Men's · Gardner-Webb vs Radford | W, 5-1",
 "Final Oct 2 Men's · Gardner-Webb vs UNC Asheville | W, 3-0",
 "Final Oct 6 Men's · Gardner-Webb at ETSU | W, 2-1",
 "Final Oct 10 Men's · Gardner-Webb at Longwood | W, 3-0",
 "Final Oct 13 Men's · Gardner-Webb at Virginia | L, 0-4",
 "Final Oct 17 Men's · Gardner-Webb vs USC Upstate | W, 5-4",
 "Final Oct 20 Men's · Gardner-Webb at Campbell | W, 5-2",
 "Upcoming Oct 24, 6:00 PM Men's · Gardner-Webb at Winthrop | ",
 "Upcoming Oct 31, 2:00 PM Men's · Gardner-Webb vs Presbyterian | ",
 "Upcoming Nov 4 Men's · Gardner-Webb at Big South Conference Quarterfinals | ",
 "Upcoming Nov 8 Men's · Gardner-Webb at Big South Conference Semifinals | ",
 "Upcoming Nov 14 Men's · Gardner-Webb at Big South Conference Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Gardner-Webb vs Converse | Completed",
 "Final Oct 9 Men's · Gardner-Webb vs Old Dominion | Completed",
 "Upcoming Oct 30 Men's · Gardner-Webb at UNC Wilmington | ",
 "Upcoming Nov 20 Men's · Gardner-Webb at Queens Fall Frenzy | ",
 "Upcoming Jan 9 Men's · Gardner-Webb vs UNC Asheville | ",
 "Upcoming Jan 22 Men's · Gardner-Webb vs Queens | ",
 "Upcoming Jan 30 Men's · Gardner-Webb at NC State and ECU | ",
 "Upcoming Feb 6 Men's · Gardner-Webb at Davidson | ",
 "Upcoming Feb 17 Men's · Gardner-Webb at ASUN Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Gardner-Webb at Lehigh | L, 0-3",
 "Final Aug 29 Gardner-Webb vs Morgan State | W, 3-0",
 "Final Aug 29 Gardner-Webb vs Cleveland State | L, 0-3",
 "Final Sep 1 Gardner-Webb at NC Central | W, 3-1",
 "Final Sep 4 Gardner-Webb vs UNC Wilmington | W, 3-2",
 "Final Sep 5 Gardner-Webb vs Alabama State | W, 3-0",
 "Final Sep 8 Gardner-Webb at Western Carolina | L, 1-3",
 "Final Sep 11 Gardner-Webb at West Georgia | L, 1-3",
 "Final Sep 12 Gardner-Webb vs Mercer | W, 3-2",
 "Final Sep 12 Gardner-Webb vs New Orleans | W, 3-1",
 "Final Sep 18 Gardner-Webb at Austin Peay | W, 3-1",
 "Final Sep 18 Gardner-Webb vs Southern Illinois | W, 3-2",
 "Final Sep 19 Gardner-Webb vs SIUE | W, 3-1",
 "Final Sep 22 Gardner-Webb vs Wofford | L, 2-3",
 "Final Sep 26 Gardner-Webb vs Winthrop | L, 1-3",
 "Final Oct 2 Gardner-Webb vs Presbyterian | W, 3-0",
 "Final Oct 3 Gardner-Webb vs Charleston Southern | W, 3-2",
 "Final Oct 9 Gardner-Webb at High Point | L, 1-3",
 "Final Oct 10 Gardner-Webb at Radford | L, 2-3",
 "Final Oct 16 Gardner-Webb vs USC Upstate | W, 3-0",
 "Final Oct 17 Gardner-Webb vs UNC Asheville | W, 3-2",
 "Final Oct 20 Gardner-Webb vs NC Central | W, 3-1",
 "Today Oct 23, 6:00 PM Gardner-Webb at Charleston Southern | ",
 "Upcoming Oct 24, 2:00 PM Gardner-Webb at Presbyterian | ",
 "Upcoming Oct 30, 6:00 PM Gardner-Webb at UNC Asheville | ",
 "Upcoming Oct 31, 5:30 PM Gardner-Webb at USC Upstate | ",
 "Upcoming Nov 6, 6:00 PM Gardner-Webb vs Radford | ",
 "Upcoming Nov 7, 6:00 PM Gardner-Webb vs High Point | ",
 "Upcoming Nov 10, 6:00 PM Gardner-Webb at Elon | ",
 "Upcoming Nov 13, 6:00 PM Gardner-Webb at Winthrop | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Gardner-Webb at Cowboy Classic | ",
 "Upcoming Nov 7 Gardner-Webb at Virginia | ",
 "Upcoming Nov 20, 8:00 PM Gardner-Webb at Minnesota | ",
 "Upcoming Dec 3, 7:00 PM Gardner-Webb vs Presbyterian | ",
 "Upcoming Dec 6, 10:00 AM Gardner-Webb at Patriot Open | ",
 "Upcoming Dec 18, 5:00 PM Gardner-Webb at Duke | ",
 "Upcoming Dec 20, 1:00 PM Gardner-Webb at Ohio | ",
 "Upcoming Jan 1 Gardner-Webb at Southern Scuffle | ",
 "Upcoming Jan 8, 7:00 PM Gardner-Webb at The Citadel | ",
 "Upcoming Jan 16 Gardner-Webb at Davidson | ",
 "Upcoming Jan 16 Gardner-Webb at Lock Haven | ",
 "Upcoming Jan 24, 11:00 AM Gardner-Webb vs Sacred Heart | ",
 "Upcoming Jan 24, 3:00 PM Gardner-Webb at Franklin & Marshall | ",
 "Upcoming Jan 29, 7:00 PM Gardner-Webb at Chattanooga | ",
 "Upcoming Feb 7, 2:00 PM Gardner-Webb vs Bellarmine | ",
 "Upcoming Feb 12, 6:00 PM Gardner-Webb vs Campbell | ",
 "Upcoming Feb 14 Gardner-Webb vs Mercyhurst | ",
 "Upcoming Feb 14, 3:00 PM Gardner-Webb at VMI | ",
 "Upcoming Feb 18, 7:00 PM Gardner-Webb at George Mason | ",
 "Upcoming Feb 21, 2:00 PM Gardner-Webb vs Appalachian State | ",
 "Upcoming Mar 5 Gardner-Webb at SoCon Championships | ",
 "Upcoming Mar 18 Gardner-Webb at NCAA | ",
 "Upcoming Mar 19 Gardner-Webb at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Gardner-Webb module checks passed");
