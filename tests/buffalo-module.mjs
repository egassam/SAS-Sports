import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {buffaloSchool} from '../src/schools/buffalo.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='buffalo');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,buffaloHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/buffalo-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ubbulls.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['buffalo'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',buffaloSchool.scheduleUrls],['roster',buffaloSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('buffalo|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ubbulls.com',`${key} must stay on ubbulls.com`);
  }
}
const parity={"Basketball":{"schedule":["https://ubbulls.com/sports/mens-basketball/schedule","https://ubbulls.com/sports/womens-basketball/schedule"],"roster":["https://ubbulls.com/sports/mens-basketball/roster","https://ubbulls.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ubbulls.com/sports/cross-country/schedule"],"roster":["https://ubbulls.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ubbulls.com/sports/football/schedule"],"roster":["https://ubbulls.com/sports/football/roster"],"combined":false},"Soccer":{"schedule":["https://ubbulls.com/sports/womens-soccer/schedule"],"roster":["https://ubbulls.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ubbulls.com/sports/softball/schedule"],"roster":["https://ubbulls.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ubbulls.com/sports/swimming-and-diving/schedule"],"roster":["https://ubbulls.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://ubbulls.com/sports/womens-tennis/schedule","https://ubbulls.com/sports/mens-tennis/schedule"],"roster":["https://ubbulls.com/sports/womens-tennis/roster","https://ubbulls.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ubbulls.com/sports/track-and-field/schedule"],"roster":["https://ubbulls.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ubbulls.com/sports/womens-volleyball/schedule"],"roster":["https://ubbulls.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://ubbulls.com/sports/wrestling/schedule"],"roster":["https://ubbulls.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'buffalo|"+sport+"':"),`${sport} routes must live in the Buffalo module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ubbulls.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.buffaloHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=buffalo)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Buffalo vs Mercyhurst (Exhibition) | W, 71-66",
 "Upcoming Nov 2, 7:00 PM Men's · Buffalo at Marshall | ",
 "Upcoming Nov 5, 7:00 PM Men's · Buffalo at Pittsburgh | ",
 "Upcoming Nov 9, 6:30 PM Men's · Buffalo vs Penn State Schuylkill | ",
 "Upcoming Nov 15, 5:30 PM Men's · Buffalo vs Canisius | ",
 "Upcoming Nov 19, 7:00 PM Men's · Buffalo at St. Bonaventure | ",
 "Upcoming Nov 23, 6:30 PM Men's · Buffalo vs RIT | ",
 "Upcoming Nov 28, 3:30 PM Men's · Buffalo vs Towson | ",
 "Upcoming Dec 2, 7:00 PM Men's · Buffalo at Western Michigan | ",
 "Upcoming Dec 5, 2:00 PM Men's · Buffalo vs Miami (OH) | ",
 "Upcoming Dec 12, 2:00 PM Men's · Buffalo vs Purdue Fort Wayne | ",
 "Upcoming Dec 16, 6:30 PM Men's · Buffalo vs Akron | ",
 "Upcoming Dec 19, 2:00 PM Men's · Buffalo at Ohio | ",
 "Upcoming Dec 22, 6:00 PM Men's · Buffalo at Rhode Island | ",
 "Upcoming Jan 2, 2:00 PM Men's · Buffalo at Kent State | ",
 "Upcoming Jan 5, 6:30 PM Men's · Buffalo vs Massachusetts | ",
 "Upcoming Jan 8, 7:00 PM Men's · Buffalo at Toledo | ",
 "Upcoming Jan 12, 7:00 PM Men's · Buffalo at Central Michigan | ",
 "Upcoming Jan 16, 2:30 PM Men's · Buffalo vs Bowling Green | ",
 "Upcoming Jan 19 Men's · Buffalo at Miami (OH) | ",
 "Upcoming Jan 23, 2:00 PM Men's · Buffalo vs Toledo | ",
 "Upcoming Jan 26, 6:30 PM Men's · Buffalo vs Eastern Michigan | ",
 "Upcoming Jan 30, 1:00 PM Men's · Buffalo at Ball State | ",
 "Upcoming Feb 2, 6:30 PM Men's · Buffalo vs Ohio | ",
 "Upcoming Feb 6, 2:00 PM Men's · Buffalo vs MAC-SBC Challenge | ",
 "Upcoming Feb 9, 7:00 PM Men's · Buffalo at Akron | ",
 "Upcoming Feb 13, 1:00 PM Men's · Buffalo at Bowling Green | ",
 "Upcoming Feb 16, 6:30 PM Men's · Buffalo vs Central Michigan | ",
 "Upcoming Feb 20, 5:00 PM Men's · Buffalo vs Kent State | ",
 "Upcoming Feb 23, 7:00 PM Men's · Buffalo at Massachusetts | ",
 "Upcoming Feb 27, 3:30 PM Men's · Buffalo at Eastern Michigan | ",
 "Upcoming Mar 2, 6:30 PM Men's · Buffalo vs Ball State | ",
 "Upcoming Mar 5, 6:30 PM Men's · Buffalo vs Western Michigan | ",
 "Upcoming Mar 10 Men's · Buffalo at Mid-American Conference Tournament First Round | ",
 "Upcoming Mar 11 Men's · Buffalo at Mid-American Conference Tournament Quarterfinals | ",
 "Upcoming Mar 12 Men's · Buffalo at Mid-American Conference Tournament Semifinals | ",
 "Upcoming Mar 13 Men's · Buffalo at Mid-American Conference Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · Buffalo vs D'Youville (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Buffalo vs Georgia State | ",
 "Upcoming Nov 7, 6:30 PM Women's · Buffalo at Youngstown State | ",
 "Upcoming Nov 12, 6:00 PM Women's · Buffalo vs Sacramento State | ",
 "Upcoming Nov 14, 12:00 PM Women's · Buffalo vs Mississippi State | ",
 "Upcoming Nov 19, 6:00 PM Women's · Buffalo vs St. Bonaventure | ",
 "Upcoming Nov 22, 1:00 PM Women's · Buffalo at Fordham | ",
 "Upcoming Nov 27, 12:00 PM Women's · Buffalo vs Morehead State | ",
 "Upcoming Nov 28, 2:00 PM Women's · Buffalo at Florida Atlantic | ",
 "Upcoming Dec 2, 6:00 PM Women's · Buffalo at Canisius | ",
 "Upcoming Dec 6, 12:00 PM Women's · Buffalo vs Duquesne | ",
 "Upcoming Dec 10, 4:00 PM Women's · Buffalo at Detroit Mercy | ",
 "Upcoming Dec 21, 1:00 PM Women's · Buffalo at Drexel | ",
 "Upcoming Dec 29, 6:00 PM Women's · Buffalo vs Cornell | ",
 "Upcoming Jan 2, 2:00 PM Women's · Buffalo vs Miami (OH) | ",
 "Upcoming Jan 6, 6:00 PM Women's · Buffalo at Massachusetts | ",
 "Upcoming Jan 9, 2:00 PM Women's · Buffalo at Bowling Green | ",
 "Upcoming Jan 13, 6:00 PM Women's · Buffalo vs Akron | ",
 "Upcoming Jan 16, 12:00 PM Women's · Buffalo vs Eastern Michigan | ",
 "Upcoming Jan 20, 7:00 PM Women's · Buffalo at Ohio | ",
 "Upcoming Jan 23, 1:00 PM Women's · Buffalo at Kent State | ",
 "Upcoming Jan 27, 11:00 AM Women's · Buffalo vs Central Michigan | ",
 "Upcoming Jan 30, 2:00 PM Women's · Buffalo vs Bowling Green | ",
 "Upcoming Feb 3, 5:00 PM Women's · Buffalo at Eastern Michigan | ",
 "Upcoming Feb 6 Women's · Buffalo at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 6:00 PM Women's · Buffalo vs Western Michigan | ",
 "Upcoming Feb 13, 11:00 AM Women's · Buffalo at Ball State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Buffalo at Toledo | ",
 "Upcoming Feb 20, 2:00 PM Women's · Buffalo vs Kent State | ",
 "Upcoming Feb 24, 6:00 PM Women's · Buffalo vs Ohio | ",
 "Upcoming Feb 27, 1:00 PM Women's · Buffalo at Miami (OH) | ",
 "Upcoming Mar 3, 6:00 PM Women's · Buffalo vs Massachusetts | ",
 "Upcoming Mar 6, 1:00 PM Women's · Buffalo at Central Michigan | ",
 "Upcoming Mar 10 Women's · Buffalo at Mid-American Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Buffalo at Rodenbeck Invite | Women's team: 1st / Men's team: 1st",
 "Final Sep 11 Buffalo at Spiked Shoe Invite | Women's team: 9th / Men's team: 7th",
 "Final Oct 2 Buffalo at Paul Short Invite | Canceled",
 "Final Oct 17 Buffalo at Canisius Alumni Classic | Women's team: 2nd / Men's team: 4th",
 "Upcoming Oct 30, 11:00 AM Buffalo at MAC Championships | ",
 "Upcoming Nov 13, 11:00 AM Buffalo at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Buffalo at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Buffalo vs UAlbany | W, 21-17",
 "Final Sep 12 Buffalo at Florida International | L, 20-33",
 "Final Sep 19 Buffalo at Penn State | L, 13-55",
 "Final Sep 26 Buffalo vs Robert Morris | W, 31-28",
 "Final Oct 3 Buffalo vs Western Michigan | L, 17-20",
 "Final Oct 10 Buffalo at Toledo | W, 23-8",
 "Final Oct 17 Buffalo vs Massachusetts | W, 25-18",
 "Upcoming Oct 24, 3:30 PM Buffalo vs Bowling Green | ",
 "Upcoming Nov 3 Buffalo at Miami (OH) | ",
 "Upcoming Nov 11 Buffalo at Ball State | ",
 "Upcoming Nov 18 Buffalo vs Central Michigan | ",
 "Upcoming Nov 27, 12:00 PM Buffalo at Akron | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Buffalo vs Niagara | W, 2-0",
 "Final Aug 16 Buffalo at Mercyhurst | W, 2-0",
 "Final Aug 20 Buffalo at Grand Canyon | L, 0-2",
 "Final Aug 23 Buffalo at Arizona State | L, 0-5",
 "Final Aug 30 Buffalo vs Binghamton | T, 0-0",
 "Final Sep 2 Buffalo vs Canisius | W, 2-1",
 "Final Sep 10 Buffalo at Lafayette | T, 0-0",
 "Final Sep 17 Buffalo at Central Michigan | W, 1-0",
 "Final Sep 20 Buffalo vs Toledo | T, 0-0",
 "Final Sep 27 Buffalo vs Eastern Michigan | L, 0-2",
 "Final Oct 1 Buffalo at Miami (OH) | T, 0-0",
 "Final Oct 4 Buffalo vs Ohio | L, 0-1",
 "Final Oct 11 Buffalo at Western Michigan | L, 0-1",
 "Final Oct 15 Buffalo vs Massachusetts | T, 0-0",
 "Final Oct 18 Buffalo at Akron | T, 0-0",
 "Upcoming Oct 24, 1:00 PM Buffalo at Bowling Green | ",
 "Upcoming Oct 29, 6:00 PM Buffalo vs Kent State | ",
 "Upcoming Nov 1, 1:00 PM Buffalo at Ball State | ",
 "Upcoming Nov 7 Buffalo at Mid-American Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 17 Buffalo vs Cornell | Completed",
 "Final Oct 17 Buffalo vs Niagara | W, 216-78",
 "Upcoming Oct 30, 5:00 PM Buffalo at Eastern Michigan | ",
 "Upcoming Nov 20, 5:00 PM Buffalo at UB Invite | ",
 "Upcoming Dec 3 Buffalo at Zippy Invite | ",
 "Upcoming Jan 8, 11:00 AM Buffalo at UB Diving Invite | ",
 "Upcoming Jan 8, 5:00 PM Buffalo at Duquesne | ",
 "Upcoming Jan 16, 11:00 AM Buffalo vs Bowling Green | ",
 "Upcoming Jan 29 Buffalo at Akron | ",
 "Upcoming Feb 24 Buffalo at MAC Championships | ",
 "Upcoming Mar 9 Buffalo at NCAA Zone Diving Championships | ",
 "Upcoming Mar 11 Buffalo at National Invitational Championships | ",
 "Upcoming Mar 17 Buffalo at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Buffalo at Carousel Classic Invitational | Completed",
 "Upcoming Oct 23 Women's · Buffalo at MAC Fall Championship | ",
 "Upcoming Oct 30, 12:30 PM Women's · Buffalo vs Colgate | ",
 "Upcoming Nov 6 Women's · Buffalo at UB Indoor Invite | ",
 "Upcoming Jan 29, 12:30 PM Women's · Buffalo vs Niagara | ",
 "Upcoming Jan 30, 1:00 PM Women's · Buffalo vs Duquesne | ",
 "Upcoming Feb 4, 3:00 PM Women's · Buffalo at Youngstown State | ",
 "Upcoming Feb 5, 1:00 PM Women's · Buffalo vs Mercyhurst | ",
 "Upcoming Feb 5, 6:30 PM Women's · Buffalo vs IUP | ",
 "Upcoming Feb 12 Women's · Buffalo at UNLV | ",
 "Upcoming Feb 13 Women's · Buffalo vs Pacific | ",
 "Upcoming Feb 18, 3:00 PM Women's · Buffalo vs Cleveland State | ",
 "Upcoming Feb 19, 4:00 PM Women's · Buffalo vs Bucknell | ",
 "Upcoming Feb 20, 11:30 AM Women's · Buffalo vs Seton Hall | ",
 "Upcoming Feb 26, 12:30 PM Women's · Buffalo vs Le Moyne | ",
 "Upcoming Feb 27 Women's · Buffalo at Cornell | ",
 "Upcoming Mar 3 Women's · Buffalo at Xavier (La.) | ",
 "Upcoming Mar 4 Women's · Buffalo at New Orleans | ",
 "Upcoming Mar 12, 12:00 PM Women's · Buffalo at Miami (OH) | ",
 "Upcoming Mar 19, 12:00 PM Women's · Buffalo vs Massachusetts | ",
 "Upcoming Mar 26, 12:00 PM Women's · Buffalo at Ball State | ",
 "Upcoming Apr 2, 12:00 PM Women's · Buffalo at Toledo | ",
 "Upcoming Apr 9, 12:00 PM Women's · Buffalo vs Bowling Green | ",
 "Upcoming Apr 16, 12:00 PM Women's · Buffalo at Western Michigan | ",
 "Upcoming Apr 22, 12:00 PM Women's · Buffalo vs Eastern Michigan | ",
 "Upcoming Apr 30 Women's · Buffalo at Mid-American Conference Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Buffalo at Carousel Classic | Completed",
 "Final Sep 25 Men's · Buffalo at Farnsworth Invitational | Completed",
 "Final Oct 1 Men's · Buffalo at Penn State Invitational | Completed",
 "Final Oct 8 Men's · Buffalo at ITA New England Regionals | Completed",
 "Upcoming Oct 23 Men's · Buffalo at MAC Fall Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 5 Buffalo at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Jan 9 Buffalo at Wolverine Invitational | ",
 "Upcoming Jan 16 Buffalo at Upstate Challenge | ",
 "Upcoming Jan 29 Buffalo at Penn State National Open | ",
 "Upcoming Feb 5 Buffalo at Doug Raymond National | ",
 "Upcoming Feb 12 Buffalo at Boston University | ",
 "Upcoming Feb 20 Buffalo at Marc Deneault Invite | ",
 "Upcoming Feb 26 Buffalo at MAC Indoor Championships | ",
 "Upcoming Mar 13 Buffalo at NCAA Indoor Championships | ",
 "Upcoming Mar 18 Buffalo at Fredy Hardy Invite | ",
 "Upcoming Mar 25 Buffalo at Raleigh Relays | ",
 "Upcoming Apr 3 Buffalo at UB Alumni Invite | ",
 "Upcoming Apr 10 Buffalo at Bison Classic | ",
 "Upcoming Apr 10 Buffalo at Big Red Invite | ",
 "Upcoming Apr 16 Buffalo at The 716 Challenge | ",
 "Upcoming May 13 Buffalo at MAC Outdoor Championships | ",
 "Upcoming May 26 Buffalo at NCAA East First Rounds | ",
 "Upcoming Jun 9 Buffalo at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Buffalo vs Colgate (Exhibition) | L, 2-3",
 "Final Aug 22 Buffalo vs Niagara (Exhibition) | W, 3-1",
 "Final Aug 28 Buffalo vs UIC | W, 3-2",
 "Final Aug 28 Buffalo at Saint Louis | L, 1-3",
 "Final Aug 29 Buffalo vs Lindenwood | W, 3-1",
 "Final Sep 2 Buffalo vs Canisius | W, 3-0",
 "Final Sep 4 Buffalo vs UMBC | W, 3-2",
 "Final Sep 5 Buffalo vs Dartmouth | W, 3-1",
 "Final Sep 11 Buffalo vs Presbyterian | L, 1-3",
 "Final Sep 11 Buffalo at Queens University of Charlotte | L, 0-3",
 "Final Sep 12 Buffalo vs UT-Chattanooga | W, 3-0",
 "Final Sep 19 Buffalo vs FDU | W, 3-0",
 "Final Sep 20 Buffalo at Syracuse | W, 3-0",
 "Final Sep 25 Buffalo vs Kent State | W, 3-0",
 "Final Sep 27 Buffalo vs Toledo | L, 1-3",
 "Final Oct 1 Buffalo at Miami (OH) | L, 0-3",
 "Final Oct 2 Buffalo at Miami (OH) | L, 1-3",
 "Final Oct 9 Buffalo vs Eastern Michigan | W, 3-2",
 "Final Oct 10 Buffalo vs Eastern Michigan | W, 3-1",
 "Final Oct 13 Buffalo at Akron | L, 1-3",
 "Final Oct 16 Buffalo vs Bowling Green | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Buffalo at Western Michigan | ",
 "Upcoming Oct 24, 2:00 PM Buffalo at Western Michigan | ",
 "Upcoming Oct 30, 6:30 PM Buffalo at Central Michigan | ",
 "Upcoming Oct 31, 5:30 PM Buffalo at Central Michigan | ",
 "Upcoming Nov 6, 6:00 PM Buffalo vs Ball State | ",
 "Upcoming Nov 7, 4:00 PM Buffalo vs Ball State | ",
 "Upcoming Nov 10, 6:00 PM Buffalo vs Akron | ",
 "Upcoming Nov 13, 6:00 PM Buffalo at Ohio | ",
 "Upcoming Nov 20 Buffalo at Mid-American Conference Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7 Buffalo at South Dakota State | ",
 "Upcoming Nov 8 Buffalo vs Daktronics Open | ",
 "Upcoming Nov 13, 7:00 PM Buffalo at Kent State | ",
 "Upcoming Nov 14, 1:00 PM Buffalo at Pittsburgh | ",
 "Upcoming Nov 20, 7:00 PM Buffalo vs Binghamton | ",
 "Upcoming Nov 22 Buffalo at Big Red Invite | ",
 "Upcoming Dec 4, 7:00 PM Buffalo at George Mason | ",
 "Upcoming Dec 11, 7:00 PM Buffalo vs Bloomsburg | ",
 "Upcoming Dec 13, 2:00 PM Buffalo vs Edinboro | ",
 "Upcoming Dec 18, 7:00 PM Buffalo vs NC State | ",
 "Upcoming Dec 20 Buffalo at Northern Colorado | ",
 "Upcoming Dec 20 Buffalo at Oregon State | ",
 "Upcoming Dec 20 Buffalo at Duke | ",
 "Upcoming Jan 8 Buffalo vs David H. Lehman F&M Open | ",
 "Upcoming Jan 15, 7:00 PM Buffalo vs Central Michigan | ",
 "Upcoming Jan 23 Buffalo vs LIU | ",
 "Upcoming Jan 23, 11:00 AM Buffalo at Hofstra | ",
 "Upcoming Feb 5, 7:00 PM Buffalo at Clarion | ",
 "Upcoming Feb 12, 7:00 PM Buffalo at SIUE | ",
 "Upcoming Feb 21, 12:00 PM Buffalo vs Ohio | ",
 "Upcoming Mar 5 Buffalo at MAC Championships | ",
 "Upcoming Mar 18 Buffalo at NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Buffalo module checks passed");
