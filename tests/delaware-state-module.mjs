import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {delawareStateSchool} from '../src/schools/delaware-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='delaware-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,delawareStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/delaware-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit dsuhornets.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['delaware-state'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',delawareStateSchool.scheduleUrls],['roster',delawareStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('delaware-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'dsuhornets.com',`${key} must stay on dsuhornets.com`);
  }
}
const parity={"Baseball":{"schedule":["https://dsuhornets.com/sports/baseball/schedule"],"roster":["https://dsuhornets.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://dsuhornets.com/sports/mens-basketball/schedule","https://dsuhornets.com/sports/womens-basketball/schedule"],"roster":["https://dsuhornets.com/sports/mens-basketball/roster","https://dsuhornets.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://dsuhornets.com/sports/womens-bowling/schedule"],"roster":["https://dsuhornets.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://dsuhornets.com/sports/womens-cross-country/schedule","https://dsuhornets.com/sports/mens-cross-country/schedule"],"roster":["https://dsuhornets.com/sports/womens-cross-country/roster","https://dsuhornets.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://dsuhornets.com/sports/equestrian/schedule"],"roster":["https://dsuhornets.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://dsuhornets.com/sports/football/schedule"],"roster":["https://dsuhornets.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://dsuhornets.com/sports/golf/schedule"],"roster":["https://dsuhornets.com/sports/golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://dsuhornets.com/sports/womens-lacrosse/schedule"],"roster":["https://dsuhornets.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://dsuhornets.com/sports/womens-soccer/schedule"],"roster":["https://dsuhornets.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://dsuhornets.com/sports/softball/schedule"],"roster":["https://dsuhornets.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://dsuhornets.com/sports/womens-tennis/schedule"],"roster":["https://dsuhornets.com/sports/womens-tennis/roster"],"combined":false},"Triathlon":{"schedule":["https://dsuhornets.com/sports/triathlon/schedule"],"roster":["https://dsuhornets.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://dsuhornets.com/sports/womens-volleyball/schedule"],"roster":["https://dsuhornets.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://dsuhornets.com/sports/womens-wrestling/schedule"],"roster":["https://dsuhornets.com/sports/womens-wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'delaware-state|"+sport+"':"),`${sport} routes must live in the Delaware State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://dsuhornets.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.delawareStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=delaware-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 29 Men's · Delaware State vs Holy Family ( Exhibition) | ",
 "Upcoming Nov 2 Men's · Delaware State vs St. Vincent College | ",
 "Upcoming Nov 5 Men's · Delaware State at Navy | ",
 "Upcoming Nov 10 Men's · Delaware State at Georgetown | ",
 "Upcoming Nov 14 Men's · Delaware State at East Carolina | ",
 "Upcoming Nov 17 Men's · Delaware State vs Cheyney University of Pennsylvania | ",
 "Upcoming Nov 20 Men's · Delaware State vs Niagara | ",
 "Upcoming Nov 24 Men's · Delaware State at Tennessee at Chattanooga | ",
 "Upcoming Nov 28 Men's · Delaware State at North Carolina A&T State | ",
 "Upcoming Dec 1 Men's · Delaware State vs New Haven | ",
 "Upcoming Dec 5 Men's · Delaware State vs UMBC | ",
 "Upcoming Dec 8 Men's · Delaware State vs Binghamton | ",
 "Upcoming Dec 12 Men's · Delaware State vs Longwood | ",
 "Upcoming Dec 15 Men's · Delaware State at Connecticut | ",
 "Upcoming Dec 19 Men's · Delaware State vs Franklin Pierce | ",
 "Upcoming Dec 29 Men's · Delaware State at Rutgers | ",
 "Upcoming Jan 2 Men's · Delaware State at Coppin State | ",
 "Upcoming Jan 9 Men's · Delaware State at Norfolk State | ",
 "Upcoming Jan 11 Men's · Delaware State vs Howard | ",
 "Upcoming Jan 16 Men's · Delaware State at Morgan State | ",
 "Upcoming Jan 23 Men's · Delaware State vs North Carolina Central | ",
 "Upcoming Jan 25 Men's · Delaware State vs South Carolina State | ",
 "Upcoming Jan 30 Men's · Delaware State at Maryland Eastern Shore | ",
 "Upcoming Feb 6 Men's · Delaware State vs Coppin State | ",
 "Upcoming Feb 13 Men's · Delaware State vs Norfolk State | ",
 "Upcoming Feb 15 Men's · Delaware State at Howard | ",
 "Upcoming Feb 20 Men's · Delaware State vs Morgan State | ",
 "Upcoming Feb 27 Men's · Delaware State at North Carolina Central | ",
 "Upcoming Mar 1 Men's · Delaware State at South Carolina State | ",
 "Upcoming Mar 4 Men's · Delaware State vs Maryland Eastern Shore | ",
 "Upcoming Mar 10 Men's · Delaware State at MEAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Delaware State at Georgetown | ",
 "Upcoming Nov 4, 6:00 PM Women's · Delaware State vs Georgian Court | ",
 "Upcoming Nov 8, 1:00 PM Women's · Delaware State at Robert Morris | ",
 "Upcoming Nov 10, 7:00 PM Women's · Delaware State at Pittsburgh | ",
 "Upcoming Nov 13, 11:00 AM Women's · Delaware State vs American | ",
 "Upcoming Nov 18, 6:00 PM Women's · Delaware State at New Jersey Institute of Technology | ",
 "Upcoming Nov 21, 2:00 PM Women's · Delaware State at Rutgers | ",
 "Upcoming Nov 27, 1:00 PM Women's · Delaware State at Bucknell | ",
 "Upcoming Dec 1 Women's · Delaware State vs Washington Adventist | ",
 "Upcoming Dec 6, 2:00 PM Women's · Delaware State vs FDU | ",
 "Upcoming Dec 8, 5:00 PM Women's · Delaware State vs Fordham | ",
 "Upcoming Dec 13, 1:00 PM Women's · Delaware State at Dayton | ",
 "Upcoming Dec 17, 11:00 AM Women's · Delaware State at Wisconsin | ",
 "Upcoming Dec 21, 11:00 AM Women's · Delaware State at Hofstra | ",
 "Upcoming Dec 29, 2:00 PM Women's · Delaware State vs Notre Dame of Maryland | ",
 "Upcoming Jan 2, 2:00 PM Women's · Delaware State at Coppin State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Delaware State vs Howard | ",
 "Upcoming Jan 9, 2:00 PM Women's · Delaware State at Norfolk State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Delaware State at Morgan State | ",
 "Upcoming Jan 21, 6:00 PM Women's · Delaware State vs South Carolina State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Delaware State vs North Carolina Central | ",
 "Upcoming Jan 30, 1:00 PM Women's · Delaware State at Maryland Eastern Shore | ",
 "Upcoming Feb 6, 2:00 PM Women's · Delaware State vs Coppin State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Delaware State at Howard | ",
 "Upcoming Feb 13, 2:00 PM Women's · Delaware State vs Norfolk State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Delaware State vs Morgan State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Delaware State at South Carolina State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Delaware State at North Carolina Central | ",
 "Upcoming Mar 4, 5:30 PM Women's · Delaware State vs Maryland Eastern Shore | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 10 Delaware State at Bud Whitman | 2nd of 8",
 "Final Oct 17 Delaware State at Golden Bear Invite | Completed",
 "Upcoming Oct 24 Delaware State at SeaHawk Classic | ",
 "Upcoming Oct 30 Delaware State at Destination Tournament | ",
 "Upcoming Nov 14 Delaware State at CSU Invite | ",
 "Upcoming Nov 20 Delaware State at FDU Tournament | ",
 "Upcoming Jan 15 Delaware State at NE Classic | ",
 "Upcoming Jan 23 Delaware State at Hornet Classic | ",
 "Upcoming Feb 5 Delaware State at MEAC | ",
 "Upcoming Feb 27 Delaware State at NCAT | ",
 "Upcoming Mar 12 Delaware State at USBC Collegiate | ",
 "Upcoming Mar 19 Delaware State at MEAC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Delaware State at Delaware Invite | 6th of 8",
 "Final Sep 11 Women's · Delaware State at Delaware State Invite | 1st of 6",
 "Final Oct 16 Women's · Delaware State at Panorama Farms Invite | 15th of 16",
 "Upcoming Oct 30 Women's · Delaware State at MEAC Championship | ",
 "Upcoming Nov 13 Women's · Delaware State at NCAA Regional Championship | ",
 "Upcoming Nov 21 Women's · Delaware State at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Delaware State at Delaware Invite | 1st of 8",
 "Final Sep 11 Men's · Delaware State at Delaware State Invite | 1st of 6",
 "Final Oct 2 Men's · Delaware State at Paul Short Invite | 29th of 35",
 "Final Oct 16 Men's · Delaware State at Panorama Farms Invite | 9th of 14",
 "Upcoming Oct 30 Men's · Delaware State at MEAC Championship | ",
 "Upcoming Nov 13 Men's · Delaware State at NCAA Regional Championship | ",
 "Upcoming Nov 21 Men's · Delaware State at NCAA Championship | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 24 Delaware State vs Texas A&M | L, 5-13",
 "Final Sep 25 Delaware State vs Minnesota Crookston | W, 15-4",
 "Today Oct 23, 9:00 AM Delaware State vs South Dakota State | ",
 "Upcoming Jan 22, 9:00 AM Delaware State at South Dakota State | ",
 "Upcoming Jan 23, 9:00 AM Delaware State at Minnesota Crookston | ",
 "Upcoming Feb 5, 9:00 AM Delaware State at TCU | ",
 "Upcoming Feb 6, 9:00 AM Delaware State at Fresno State | ",
 "Upcoming Feb 26, 9:00 AM Delaware State at Tennessee at Martin | ",
 "Upcoming Feb 27, 9:00 AM Delaware State at SMU | ",
 "Upcoming Mar 26 Delaware State at ECAC Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Delaware State vs Stony Brook | W, 41-34",
 "Final Sep 5 Delaware State at William and Mary | L, 15-22",
 "Final Sep 12 Delaware State vs Bowie State | W, 21-6",
 "Final Sep 19 Delaware State at South Florida | L, 17-59",
 "Final Sep 26 Delaware State vs Towson | W, 33-28",
 "Final Oct 3 Delaware State at UAlbany | L, 3-28",
 "Final Oct 10 Delaware State vs Franklin Pierce | W, 34-0",
 "Today Oct 23, 5:00 PM Delaware State vs North Carolina Central | ",
 "Upcoming Oct 31, 3:00 PM Delaware State vs Norfolk State | ",
 "Upcoming Nov 7, 1:00 PM Delaware State vs Morgan State | ",
 "Upcoming Nov 14, 1:00 PM Delaware State at Howard | ",
 "Upcoming Nov 21, 1:30 PM Delaware State at South Carolina State | "
]);
  const v_golf=parse("Golf","golf");
  assert.deepEqual(v_golf.map(line),[
 "Final Sep 20 Delaware State at Thomas W. Dortch Jr. HBCU Golf Classic | Completed",
 "Final Sep 27 Delaware State at Autumn Harvest ( Lehigh) | Completed",
 "Final Oct 3 Delaware State at Navy Fall Invitational | Completed",
 "Final Oct 15 Delaware State at SAS Championship HBCU Invitational | Completed",
 "Upcoming Feb 13 Delaware State at Battle at the Beach | ",
 "Upcoming Feb 21 Delaware State at Arcis HBCU Golf Championship | ",
 "Upcoming Mar 21 Delaware State at 2027 Kingsmill Intercollegiate | ",
 "Upcoming Mar 28 Delaware State at Women in Golf Championship | ",
 "Upcoming Apr 11 Delaware State at 2027 Spring Spectacular | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 22 Delaware State at Iona | L, 0-4",
 "Final Aug 31 Delaware State at Manhattan | L, 0-3",
 "Final Sep 3 Delaware State vs Hampton | L, 0-1",
 "Final Sep 9 Delaware State at Washington Adventist | W, 14-0",
 "Final Sep 13 Delaware State at Temple | L, 0-6",
 "Final Sep 17 Delaware State vs Stonehill | L, 0-8",
 "Final Sep 20 Delaware State at Chicago State | L, 0-1",
 "Final Sep 24 Delaware State at LIU | L, 2-3",
 "Final Sep 27 Delaware State at Le Moyne | L, 1-3",
 "Final Oct 4 Delaware State vs Howard | L, 0-3",
 "Final Oct 8 Delaware State vs FDU | L, 0-8",
 "Final Oct 18 Delaware State at CCSU | L, 0-4",
 "Upcoming Oct 25, 1:00 PM Delaware State vs Mercyhurst | ",
 "Upcoming Nov 1, 1:00 PM Delaware State vs New Haven | ",
 "Upcoming Nov 8, 1:00 PM Delaware State at Wagner | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Delaware State at Navy Invitational | Completed",
 "Final Sep 26 Delaware State at Towson Invitational | Completed",
 "Final Oct 1 Delaware State at MEAC Individual Championship | Completed",
 "Final Oct 10 Delaware State at George Mason Invitational | Completed",
 "Upcoming Jan 30, 2:00 PM Delaware State at Lehigh | ",
 "Upcoming Feb 6, 4:00 PM Delaware State at Saint Joseph's | ",
 "Upcoming Feb 7 Delaware State at Drexel | ",
 "Upcoming Feb 13, 1:00 PM Delaware State at George Mason | ",
 "Upcoming Mar 5, 11:00 AM Delaware State at George Washington | ",
 "Upcoming Mar 7 Delaware State at Navy | ",
 "Upcoming Mar 23 Delaware State at Wilmington (Del.) | ",
 "Upcoming Mar 26 Delaware State at MEAC Round-Up | ",
 "Upcoming Apr 2, 12:00 PM Delaware State at Delaware | ",
 "Upcoming Apr 3, 2:00 PM Delaware State vs Coppin State | ",
 "Upcoming Apr 6, 2:00 PM Delaware State vs Mount St. Mary's (Md.) | ",
 "Upcoming Apr 8, 2:00 PM Delaware State vs Howard | ",
 "Upcoming Apr 10, 2:00 PM Delaware State at Morgan State | ",
 "Upcoming Apr 13, 3:00 PM Delaware State at Towson | ",
 "Upcoming Apr 29 Delaware State at MEAC Championship | "
]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Aug 30 Delaware State at Duquesne Cup | 4th",
 "Final Sep 20 Delaware State at Robious Landing Triathlon | 3rd",
 "Final Oct 4 Delaware State at Tri on the Yard at Navy | 5th",
 "Final Oct 17 Delaware State at Regionals at Lake Lanier | 5th",
 "Upcoming Nov 8 Delaware State at Nationals | ",
 "Upcoming Mar 6 Delaware State at Clermont Draft Legal Challenge | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Delaware State vs Arkansas Pine Bluff | W, 3-0",
 "Final Aug 28 Delaware State vs Florida A&M | W, 3-1",
 "Final Aug 29 Delaware State vs Mississippi Valley State | W, 3-0",
 "Final Sep 2 Delaware State vs St. Peter's | W, 3-1",
 "Final Sep 4 Delaware State vs NJIT | W, 3-0",
 "Final Sep 5 Delaware State vs Quinnipiac | W, 3-2",
 "Final Sep 5 Delaware State vs Lehigh | L, 1-3",
 "Final Sep 8 Delaware State vs Rutger Camden | W, 3-0",
 "Final Sep 11 Delaware State vs Siena | W, 3-0",
 "Final Sep 12 Delaware State vs Bucknell | L, 0-3",
 "Final Sep 12 Delaware State vs Le Moyne | W, 3-1",
 "Final Sep 18 Delaware State vs George Mason | L, 1-3",
 "Final Sep 19 Delaware State vs James Madison | L, 0-3",
 "Final Sep 20 Delaware State vs UNC Greensboro | L, 2-3",
 "Final Sep 25 Delaware State vs North Carolina Central | W, 3-0",
 "Final Sep 27 Delaware State vs South Carolina State | W, 3-0",
 "Final Oct 1 Delaware State at Howard | L, 1-3",
 "Final Oct 4 Delaware State vs Norfolk State | W, 3-0",
 "Final Oct 9 Delaware State at Morgan State | L, 2-3",
 "Final Oct 11 Delaware State vs Coppin State | L, 0-3",
 "Final Oct 16 Delaware State at UMES | W, 3-1",
 "Today Oct 23, 6:00 PM Delaware State at North Carolina Central | ",
 "Upcoming Oct 25, 1:00 PM Delaware State at South Carolina State | ",
 "Upcoming Oct 29, 6:00 PM Delaware State vs Howard | ",
 "Upcoming Nov 1, 1:00 PM Delaware State at Norfolk State | ",
 "Upcoming Nov 6, 6:00 PM Delaware State vs Morgan State | ",
 "Upcoming Nov 8, 1:00 PM Delaware State at Coppin State | ",
 "Upcoming Nov 13, 7:00 PM Delaware State vs UMES | ",
 "Upcoming Nov 20 Delaware State at MEAC Tournament | "
]);
  const v_womenswrestling=parse("Wrestling","womens-wrestling");
  assert.deepEqual(v_womenswrestling.map(line),[
 "Upcoming Nov 1, 9:30 AM Delaware State vs ESU Open | ",
 "Upcoming Nov 7, 1:00 PM Delaware State at Throwdown on the Yorktown | ",
 "Upcoming Nov 14, 10:00 AM Delaware State vs Adrian College Duals | ",
 "Upcoming Nov 15, 10:00 AM Delaware State at Adrian College Invitational | ",
 "Upcoming Dec 4, 6:00 PM Delaware State at Bridgeport | ",
 "Upcoming Dec 4, 6:00 PM Delaware State at Columbia | ",
 "Upcoming Dec 13, 9:00 AM Delaware State at North Central College Invitational | ",
 "Upcoming Dec 18, 4:00 PM Delaware State vs Lehigh | ",
 "Upcoming Jan 16 Delaware State at King (Tenn.) | ",
 "Upcoming Jan 16 Delaware State at Bluefield State | ",
 "Upcoming Jan 16 Delaware State at Mount Olive | ",
 "Upcoming Jan 17, 10:00 AM Delaware State vs Tornado Open | ",
 "Upcoming Jan 23, 11:00 AM Delaware State at Mercyhurst | ",
 "Upcoming Jan 23, 11:00 AM Delaware State at Sacred Heart | ",
 "Upcoming Jan 30, 1:00 PM Delaware State at Pittsburgh at Johnstown | ",
 "Upcoming Jan 30, 1:00 PM Delaware State at Alvernia | ",
 "Upcoming Feb 7, 10:00 AM Delaware State vs FSU Bobcat Open | ",
 "Upcoming Feb 20 Delaware State at NCAA Regional Championship | ",
 "Upcoming Mar 6 Delaware State at NCAA NATIONAL CHAMPIONSHIP | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswrestling,"Wrestling womens-wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Delaware State module checks passed");
