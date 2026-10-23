import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {saintLouisSchool} from '../src/schools/saint-louis.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='saint-louis');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,saintLouisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/saint-louis-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit slubillikens.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['saint-louis'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',saintLouisSchool.scheduleUrls],['roster',saintLouisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('saint-louis|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'slubillikens.com',`${key} must stay on slubillikens.com`);
  }
}
const parity={"Baseball":{"schedule":["https://slubillikens.com/sports/baseball/schedule"],"roster":["https://slubillikens.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://slubillikens.com/sports/mens-basketball/schedule","https://slubillikens.com/sports/womens-basketball/schedule"],"roster":["https://slubillikens.com/sports/mens-basketball/roster","https://slubillikens.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://slubillikens.com/sports/cross-country/schedule"],"roster":["https://slubillikens.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://slubillikens.com/sports/field-hockey/schedule"],"roster":["https://slubillikens.com/sports/field-hockey/roster"],"combined":false},"Soccer":{"schedule":["https://slubillikens.com/sports/womens-soccer/schedule","https://slubillikens.com/sports/mens-soccer/schedule"],"roster":["https://slubillikens.com/sports/womens-soccer/roster","https://slubillikens.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://slubillikens.com/sports/softball/schedule"],"roster":["https://slubillikens.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://slubillikens.com/sports/swimming-and-diving/schedule"],"roster":["https://slubillikens.com/sports/swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://slubillikens.com/sports/track-and-field/schedule"],"roster":["https://slubillikens.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://slubillikens.com/sports/womens-volleyball/schedule"],"roster":["https://slubillikens.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'saint-louis|"+sport+"':"),`${sport} routes must live in the Saint Louis module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://slubillikens.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.saintLouisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=saint-louis)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 10:00 AM Saint Louis vs Lindenwood | ",
 "Upcoming Oct 25, 6:00 PM Saint Louis vs Missouri State | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 9 Men's · Saint Louis at Nebraska | W, 79-74",
 "Upcoming Oct 23, 7:00 PM Men's · Saint Louis vs Bradley | ",
 "Upcoming Nov 2, 7:00 PM Men's · Saint Louis vs Lehigh | ",
 "Upcoming Nov 6, 6:00 PM Men's · Saint Louis vs Missouri | ",
 "Upcoming Nov 10, 7:00 PM Men's · Saint Louis vs Northern Kentucky | ",
 "Upcoming Nov 15, 2:00 PM Men's · Saint Louis vs High Point | ",
 "Upcoming Nov 20, 10:00 PM Men's · Saint Louis at Saint Mary's | ",
 "Upcoming Nov 24, 8:30 PM Men's · Saint Louis vs Grand Canyon | ",
 "Upcoming Nov 25, 8:30 PM Men's · Saint Louis vs Colorado or Stanford | ",
 "Upcoming Nov 29, 2:30 PM Men's · Saint Louis vs South Florida | ",
 "Upcoming Dec 2, 7:00 PM Men's · Saint Louis vs Arkansas-Pine Bluff | ",
 "Upcoming Dec 6, 1:00 PM Men's · Saint Louis vs Southeast Missouri | ",
 "Upcoming Dec 12, 5:30 PM Men's · Saint Louis vs DePaul | ",
 "Upcoming Dec 15, 7:00 PM Men's · Saint Louis vs Florida A&M | ",
 "Upcoming Dec 20, 2:00 PM Men's · Saint Louis vs Jackson State | ",
 "Upcoming Dec 27, 2:00 PM Men's · Saint Louis vs Missouri Baptist | ",
 "Upcoming Dec 30, 6:00 PM Men's · Saint Louis at Fordham | ",
 "Upcoming Jan 2, 3:00 PM Men's · Saint Louis vs St. Bonaventure | ",
 "Upcoming Jan 6, 7:00 PM Men's · Saint Louis at Richmond | ",
 "Upcoming Jan 9, 5:00 PM Men's · Saint Louis vs Dayton | ",
 "Upcoming Jan 13, 6:00 PM Men's · Saint Louis vs Loyola Chicago | ",
 "Upcoming Jan 20, 6:00 PM Men's · Saint Louis at La Salle | ",
 "Upcoming Jan 23, 7:00 PM Men's · Saint Louis at Saint Joseph's | ",
 "Upcoming Jan 26, 6:00 PM Men's · Saint Louis vs Rhode Island | ",
 "Upcoming Jan 29, 5:00 PM Men's · Saint Louis at Dayton | ",
 "Upcoming Feb 5, 6:00 PM Men's · Saint Louis vs VCU | ",
 "Upcoming Feb 9, 7:00 PM Men's · Saint Louis at Loyola Chicago | ",
 "Upcoming Feb 12, 6:00 PM Men's · Saint Louis vs Saint Joseph's | ",
 "Upcoming Feb 16, 6:00 PM Men's · Saint Louis vs Davidson | ",
 "Upcoming Feb 19, 6:00 PM Men's · Saint Louis at VCU | ",
 "Upcoming Feb 24, 7:00 PM Men's · Saint Louis vs La Salle | ",
 "Upcoming Feb 27, 7:00 PM Men's · Saint Louis at George Washington | ",
 "Upcoming Mar 3, 6:00 PM Men's · Saint Louis at Duquesne | ",
 "Upcoming Mar 6, 1:30 PM Men's · Saint Louis vs George Mason | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 15 Women's · Saint Louis vs UMKC | L, 90-101",
 "Final Oct 20 Women's · Saint Louis at SIUE | W, 68-63",
 "Upcoming Oct 26, 7:00 PM Women's · Saint Louis vs Bradley | ",
 "Upcoming Nov 2, 6:30 PM Women's · Saint Louis at Middle Tennessee | ",
 "Upcoming Nov 5, 7:00 PM Women's · Saint Louis vs UW-Milwaukee | ",
 "Upcoming Nov 11, 4:00 PM Women's · Saint Louis vs Eastern Illinois | ",
 "Upcoming Nov 14, 1:00 PM Women's · Saint Louis vs Illinois State | ",
 "Upcoming Nov 18, 7:00 PM Women's · Saint Louis vs Missouri State | ",
 "Upcoming Nov 21, 6:00 PM Women's · Saint Louis vs SEMO | ",
 "Upcoming Nov 25, 6:00 PM Women's · Saint Louis at Northern Iowa | ",
 "Upcoming Nov 27, 2:00 PM Women's · Saint Louis at Drake | ",
 "Upcoming Nov 28, 5:00 PM Women's · Saint Louis vs Nebraska at Omaha | ",
 "Upcoming Dec 2, 5:00 PM Women's · Saint Louis at St. Bonaventure | ",
 "Upcoming Dec 5, 2:00 PM Women's · Saint Louis vs Arkansas - Pine Bluff | ",
 "Upcoming Dec 13, 1:00 PM Women's · Saint Louis at Missouri | ",
 "Upcoming Dec 16, 7:00 PM Women's · Saint Louis vs Ohio | ",
 "Upcoming Dec 20, 10:00 AM Women's · Saint Louis vs North Dakota State | ",
 "Upcoming Dec 21, 2:30 PM Women's · Saint Louis vs San Diego State | ",
 "Upcoming Dec 30, 7:00 PM Women's · Saint Louis vs Saint Joseph's | ",
 "Upcoming Jan 2, 1:00 PM Women's · Saint Louis at Loyola Chicago | ",
 "Upcoming Jan 6, 7:00 PM Women's · Saint Louis vs George Mason | ",
 "Upcoming Jan 9, 12:00 PM Women's · Saint Louis at Dayton | ",
 "Upcoming Jan 16, 6:00 PM Women's · Saint Louis vs Duquesne | ",
 "Upcoming Jan 20, 10:00 AM Women's · Saint Louis at Rhode Island | ",
 "Upcoming Jan 23, 6:00 PM Women's · Saint Louis vs George Washington | ",
 "Upcoming Jan 27, 5:00 PM Women's · Saint Louis at Richmond | ",
 "Upcoming Jan 31, 1:00 PM Women's · Saint Louis at VCU | ",
 "Upcoming Feb 3, 11:00 AM Women's · Saint Louis vs Rhode Island | ",
 "Upcoming Feb 7, 11:00 AM Women's · Saint Louis at Davidson | ",
 "Upcoming Feb 10, 7:00 PM Women's · Saint Louis vs La Salle | ",
 "Upcoming Feb 13, 2:00 PM Women's · Saint Louis at Fordham | ",
 "Upcoming Feb 17, 7:00 PM Women's · Saint Louis vs Loyola Chicago | ",
 "Upcoming Feb 20, 6:00 PM Women's · Saint Louis vs Davidson | ",
 "Upcoming Feb 24, 6:00 PM Women's · Saint Louis at Saint Joseph's | ",
 "Upcoming Feb 27, 6:00 PM Women's · Saint Louis vs Dayton | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Saint Louis at Fighting Illini Invitational | Women's team: 2nd / Men's team: 3rd",
 "Final Sep 18 Saint Louis at Billiken Invitational | Women's team: 1st / Men's team: 1st",
 "Final Oct 2 Saint Louis at Joe Piane Notre Dame Invitational | Women's team: 12th / Men's team: 4th",
 "Final Oct 16 Saint Louis at Pre-National Invitational | Women's team: 35th / Men's team: 7th",
 "Upcoming Oct 31, 9:00 AM Saint Louis at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Saint Louis at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Saint Louis at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 Saint Louis vs Michigan State | L, 0-3",
 "Final Aug 30 Saint Louis at Ohio | L, 1-2",
 "Final Sep 4 Saint Louis vs Louisville | L, 0-3",
 "Final Sep 6 Saint Louis vs Mercyhurst | W, 4-1",
 "Final Sep 12 Saint Louis vs Mercyhurst | W, 6-0",
 "Final Sep 13 Saint Louis at Central Michigan | L, 2-3",
 "Final Sep 18 Saint Louis vs Saint Joseph's | L, 1-2",
 "Final Sep 25 Saint Louis at VCU | L, 1-4",
 "Final Sep 27 Saint Louis at Old Dominion | L, 1-5",
 "Final Oct 2 Saint Louis at Lock Haven | W, 3-2",
 "Final Oct 4 Saint Louis vs Maryville | W, 3-0",
 "Final Oct 9 Saint Louis vs Richmond | L, 0-2",
 "Final Oct 11 Saint Louis vs Central Michigan | W, 2-1",
 "Final Oct 16 Saint Louis at La Salle | L, 1-2",
 "Upcoming Oct 25 Saint Louis vs Davidson | ",
 "Upcoming Oct 30, 2:00 PM Saint Louis vs Ball State | ",
 "Upcoming Nov 1, 11:00 AM Saint Louis at Bellarmine | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Saint Louis vs Alabama | L, 1-2",
 "Final Aug 16 Women's · Saint Louis vs Lindenwood | W, 5-0",
 "Final Aug 20 Women's · Saint Louis at Missouri | W, 1-0",
 "Final Aug 27 Women's · Saint Louis at Illinois | T, 1-1",
 "Final Aug 30 Women's · Saint Louis at Indiana | W, 2-0",
 "Final Sep 3 Women's · Saint Louis at Illinois State | T, 1-1",
 "Final Sep 9 Women's · Saint Louis vs Southeast Missouri State | W, 4-0",
 "Final Sep 12 Women's · Saint Louis vs NR/No. 20 Kansas | L, 0-1",
 "Final Sep 19 Women's · Saint Louis vs VCU | W, 7-1",
 "Final Sep 24 Women's · Saint Louis at Dayton | T, 0-0",
 "Final Sep 27 Women's · Saint Louis vs George Mason | W, 3-0",
 "Final Oct 3 Women's · Saint Louis at Davidson | W, 1-0",
 "Final Oct 8 Women's · Saint Louis vs Saint Joseph's | W, 2-1",
 "Final Oct 11 Women's · Saint Louis at Loyola Chicago | T, 1-1",
 "Final Oct 17 Women's · Saint Louis vs Richmond | W, 2-0",
 "Today Oct 22, 6:00 PM Women's · Saint Louis at La Salle | ",
 "Upcoming Oct 25 Women's · Saint Louis at Duquesne | ",
 "Upcoming Oct 31, 7:00 PM Women's · Saint Louis vs Rhode Island | ",
 "Upcoming Nov 7 Women's · Saint Louis at Atlantic 10 Conference Championship Quarterfinals | ",
 "Upcoming Nov 11 Women's · Saint Louis at Atlantic 10 Conference Championship Semifinals | ",
 "Upcoming Nov 15 Women's · Saint Louis at Atlantic 10 Conference Championship Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Saint Louis vs Seattle | W, 4-0",
 "Final Aug 24 Men's · Saint Louis vs SMU | L, 0-4",
 "Final Aug 28 Men's · Saint Louis at Notre Dame | T, 1-1",
 "Final Sep 2 Men's · Saint Louis vs Green Bay | W, 2-0",
 "Final Sep 6 Men's · Saint Louis at SIUE | L, 0-1",
 "Final Sep 12 Men's · Saint Louis vs Akron | L, 1-2",
 "Final Sep 19 Men's · Saint Louis at Dayton | T, 1-1",
 "Final Sep 26 Men's · Saint Louis vs Duquesne | W, 1-0",
 "Final Sep 29 Men's · Saint Louis vs Drake | T, 1-1",
 "Final Oct 3 Men's · Saint Louis vs Saint Joseph's | W, 1-0",
 "Final Oct 7 Men's · Saint Louis at Fordham | L, 1-2",
 "Final Oct 10 Men's · Saint Louis at La Salle | W, 3-2",
 "Final Oct 17 Men's · Saint Louis vs VCU | W, 4-1",
 "Final Oct 20 Men's · Saint Louis vs North Florida | T, 1-1",
 "Upcoming Oct 24, 7:00 PM Men's · Saint Louis vs Loyola Chicago | ",
 "Upcoming Oct 31, 6:00 PM Men's · Saint Louis at Davidson | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 3 Saint Louis vs STL Showcase (vs. UMSL, McKendree and Washington Univ.) | Completed",
 "Final Oct 17 Saint Louis vs Rockhurst | Women's team: W, 164-54 / Men's team: W, 150-73",
 "Upcoming Oct 31 Saint Louis at McKendree Tri Meet (vs. McKendree and Little Rock) | ",
 "Upcoming Nov 19 Saint Louis at House of Champions Invitational | ",
 "Upcoming Dec 4 Saint Louis at Washington University | ",
 "Upcoming Dec 5 Saint Louis at Eastern Illinois | ",
 "Upcoming Jan 16 Saint Louis vs Southern Indiana | ",
 "Upcoming Jan 22 Saint Louis at UMSL | ",
 "Upcoming Feb 6 Saint Louis at UIC Diving Invitational | ",
 "Upcoming Feb 17 Saint Louis at Atlantic 10 Championships | ",
 "Upcoming Feb 27 Saint Louis at Missouri Last Chance Qualifier | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 4 Saint Louis at Saluki Fast Start | ",
 "Upcoming Dec 11 Saint Louis at Indiana Early Bird | ",
 "Upcoming Jan 16 Saint Louis at Show-Me Showdown | ",
 "Upcoming Jan 29 Saint Louis at Dr. Rick McGuire Invitational | ",
 "Upcoming Feb 5 Saint Louis at Frank Sevigne Husker Invitational | ",
 "Upcoming Feb 12 Saint Louis at David Hemery Valentine Invitational | ",
 "Upcoming Feb 20 Saint Louis at ISU Open | ",
 "Upcoming Feb 26 Saint Louis at Atlantic 10 Indoor Championships | ",
 "Upcoming Mar 12 Saint Louis at NCAA Indoor Championships | ",
 "Upcoming Mar 19 Saint Louis at Ole Miss Classic | ",
 "Upcoming Apr 1 Saint Louis at WashU Distance Carnival | ",
 "Upcoming Apr 2 Saint Louis at SLU Speed/Power Festival | ",
 "Upcoming Apr 3 Saint Louis at Billiken Invitational | ",
 "Upcoming Apr 9 Saint Louis at Cougar Classic | ",
 "Upcoming Apr 15 Saint Louis at Bryan Clay Invitational | ",
 "Upcoming Apr 22 Saint Louis at Drake Relays | ",
 "Upcoming May 15 Saint Louis at Atlantic 10 Outdoor Championships | ",
 "Upcoming May 26 Saint Louis at NCAA West First Rounds | ",
 "Upcoming Jun 9 Saint Louis at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Saint Louis vs Buffalo | W, 3-1",
 "Final Aug 29 Saint Louis vs UIC | W, 3-2",
 "Final Aug 30 Saint Louis vs Lindenwood | L, 2-3",
 "Final Sep 4 Saint Louis vs Merrimack | W, 3-0",
 "Final Sep 5 Saint Louis at SIU Carbondale | W, 3-2",
 "Final Sep 11 Saint Louis at Xavier | L, 1-3",
 "Final Sep 12 Saint Louis vs Bowling Green | L, 0-3",
 "Final Sep 12 Saint Louis vs Austin Peay | L, 2-3",
 "Final Sep 18 Saint Louis vs SEMO | L, 1-3",
 "Final Sep 18 Saint Louis at UMKC | L, 0-3",
 "Final Sep 19 Saint Louis vs Missouri State | W, 3-2",
 "Final Sep 25 Saint Louis at George Washington | W, 3-2",
 "Final Sep 26 Saint Louis at George Washington | L, 2-3",
 "Final Sep 29 Saint Louis at Loyola Chicago | L, 0-3",
 "Final Oct 2 Saint Louis vs Duquesne | W, 3-1",
 "Final Oct 3 Saint Louis vs Duquesne | L, 2-3",
 "Final Oct 9 Saint Louis vs Dayton | L, 0-3",
 "Final Oct 10 Saint Louis vs Dayton | W, 3-1",
 "Final Oct 16 Saint Louis at Fordham | W, 3-2",
 "Final Oct 17 Saint Louis at Fordham | W, 3-0",
 "Upcoming Oct 23, 4:00 PM Saint Louis vs George Mason | ",
 "Upcoming Oct 24, 12:30 PM Saint Louis vs George Mason | ",
 "Upcoming Oct 27, 4:00 PM Saint Louis vs Loyola Chicago | ",
 "Upcoming Oct 30, 5:00 PM Saint Louis at VCU | ",
 "Upcoming Oct 31, 1:00 PM Saint Louis at VCU | ",
 "Upcoming Nov 6, 4:00 PM Saint Louis vs Davidson | ",
 "Upcoming Nov 7, 1:00 PM Saint Louis vs Davidson | ",
 "Upcoming Nov 12, 4:00 PM Saint Louis at Rhode Island | ",
 "Upcoming Nov 13, 11:00 AM Saint Louis at Rhode Island | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Saint Louis module checks passed");
