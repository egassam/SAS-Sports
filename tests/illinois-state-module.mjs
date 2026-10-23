import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {illinoisStateSchool} from '../src/schools/illinois-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='illinois-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,illinoisStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/illinois-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goredbirds.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['illinois-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',illinoisStateSchool.scheduleUrls],['roster',illinoisStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('illinois-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goredbirds.com',`${key} must stay on goredbirds.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goredbirds.com/sports/baseball/schedule"],"roster":["https://goredbirds.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goredbirds.com/sports/mens-basketball/schedule","https://goredbirds.com/sports/womens-basketball/schedule"],"roster":["https://goredbirds.com/sports/mens-basketball/roster","https://goredbirds.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goredbirds.com/sports/cross-country/schedule"],"roster":["https://goredbirds.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goredbirds.com/sports/football/schedule"],"roster":["https://goredbirds.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goredbirds.com/sports/womens-golf/schedule","https://goredbirds.com/sports/mens-golf/schedule"],"roster":["https://goredbirds.com/sports/womens-golf/roster","https://goredbirds.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://goredbirds.com/sports/womens-gymnastics/schedule"],"roster":["https://goredbirds.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://goredbirds.com/sports/womens-soccer/schedule"],"roster":["https://goredbirds.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goredbirds.com/sports/softball/schedule"],"roster":["https://goredbirds.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goredbirds.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://goredbirds.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goredbirds.com/sports/womens-tennis/schedule","https://goredbirds.com/sports/mens-tennis/schedule"],"roster":["https://goredbirds.com/sports/womens-tennis/roster","https://goredbirds.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goredbirds.com/sports/track-and-field/schedule"],"roster":["https://goredbirds.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goredbirds.com/sports/womens-volleyball/schedule"],"roster":["https://goredbirds.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'illinois-state|"+sport+"':"),`${sport} routes must live in the Illinois State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goredbirds.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.illinoisStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=illinois-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Illinois State vs Northwestern | W, 70-64",
 "Upcoming Oct 24, 4:00 PM Men's · Illinois State at Green Bay | ",
 "Upcoming Nov 2, 9:00 PM Men's · Illinois State at Saint Mary's | ",
 "Upcoming Nov 5, 7:00 PM Men's · Illinois State vs Central State | ",
 "Upcoming Nov 9, 7:30 PM Men's · Illinois State at Purdue | ",
 "Upcoming Nov 13, 7:00 PM Men's · Illinois State at North Dakota State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Illinois State vs Bellarmine | ",
 "Upcoming Nov 19, 7:00 PM Men's · Illinois State vs Eureka | ",
 "Upcoming Nov 23, 6:00 PM Men's · Illinois State vs Santa Clara | ",
 "Upcoming Nov 24, 3:30 PM Men's · Illinois State vs Tulsa | ",
 "Upcoming Dec 2, 7:00 PM Men's · Illinois State at Eastern Illinois | ",
 "Upcoming Dec 5, 1:00 PM Men's · Illinois State at Chicago State | ",
 "Upcoming Dec 10, 6:00 PM Men's · Illinois State vs Long Beach State | ",
 "Upcoming Dec 13, 4:00 PM Men's · Illinois State vs North Dakota State | ",
 "Upcoming Dec 17, 5:00 PM Men's · Illinois State at Murray State | ",
 "Upcoming Dec 21, 8:00 PM Men's · Illinois State vs Belmont | ",
 "Upcoming Dec 29 Men's · Illinois State at Evansville | ",
 "Upcoming Jan 2, 4:00 PM Men's · Illinois State vs Indiana State | ",
 "Upcoming Jan 8 Men's · Illinois State at Belmont | ",
 "Upcoming Jan 12 Men's · Illinois State at Northern Iowa | ",
 "Upcoming Jan 16, 4:00 PM Men's · Illinois State vs Valparaiso | ",
 "Upcoming Jan 18, 7:00 PM Men's · Illinois State vs Drake | ",
 "Upcoming Jan 24 Men's · Illinois State at Bradley | ",
 "Upcoming Jan 27, 6:00 PM Men's · Illinois State vs Southern Illinois | ",
 "Upcoming Jan 30 Men's · Illinois State at UIC | ",
 "Upcoming Feb 3 Men's · Illinois State vs Northern Iowa | ",
 "Upcoming Feb 6 Men's · Illinois State at Indiana State | ",
 "Upcoming Feb 9 Men's · Illinois State at Valparaiso | ",
 "Upcoming Feb 12 Men's · Illinois State vs Murray State | ",
 "Upcoming Feb 15 Men's · Illinois State vs UIC | ",
 "Upcoming Feb 18, 7:00 PM Men's · Illinois State at Southern Illinois | ",
 "Upcoming Feb 21 Men's · Illinois State vs Evansville | ",
 "Upcoming Feb 24, 6:30 PM Men's · Illinois State at Drake | ",
 "Upcoming Feb 28 Men's · Illinois State vs Bradley | ",
 "Upcoming Mar 4 Men's · Illinois State vs Arch Madness First Round | ",
 "Upcoming Mar 5 Men's · Illinois State at Arch Madness Quarterfinals | ",
 "Upcoming Mar 6 Men's · Illinois State at Arch Madness Semifinal | ",
 "Upcoming Mar 7 Men's · Illinois State at Arch Madness Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 26, 6:30 PM Women's · Illinois State vs SIUE (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Women's · Illinois State vs Chicago State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Illinois State at Dayton | ",
 "Upcoming Nov 7, 4:00 PM Women's · Illinois State vs Augustana (IL) | ",
 "Upcoming Nov 11, 6:30 PM Women's · Illinois State vs Green Bay | ",
 "Upcoming Nov 14, 1:00 PM Women's · Illinois State at Saint Louis | ",
 "Upcoming Nov 17, 11:00 AM Women's · Illinois State vs Loyola Chicago | ",
 "Upcoming Nov 22, 1:00 PM Women's · Illinois State at Stonehill | ",
 "Upcoming Nov 25, 11:00 AM Women's · Illinois State at Harvard | ",
 "Upcoming Nov 30, 7:00 PM Women's · Illinois State at Northwestern | ",
 "Upcoming Dec 3, 6:00 PM Women's · Illinois State at Eastern Illinois | ",
 "Upcoming Dec 6, 2:00 PM Women's · Illinois State vs South Dakota State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Illinois State at Indiana | ",
 "Upcoming Dec 20, 12:00 PM Women's · Illinois State vs Valparaiso | ",
 "Upcoming Dec 29, 6:30 PM Women's · Illinois State vs Belmont | ",
 "Upcoming Dec 31, 6:00 PM Women's · Illinois State at Murray State | ",
 "Upcoming Jan 3, 2:00 PM Women's · Illinois State at Southern Illinois | ",
 "Upcoming Jan 7, 6:30 PM Women's · Illinois State vs Drake | ",
 "Upcoming Jan 9, 2:00 PM Women's · Illinois State vs Northern Iowa | ",
 "Upcoming Jan 12, 6:30 PM Women's · Illinois State vs UIC | ",
 "Upcoming Jan 15, 6:00 PM Women's · Illinois State at Indiana State | ",
 "Upcoming Jan 17, 2:00 PM Women's · Illinois State at Evansville | ",
 "Upcoming Jan 22, 6:00 PM Women's · Illinois State at Bradley | ",
 "Upcoming Jan 24, 2:00 PM Women's · Illinois State vs Murray State | ",
 "Upcoming Jan 28, 6:00 PM Women's · Illinois State at Drake | ",
 "Upcoming Jan 31, 2:00 PM Women's · Illinois State vs Southern Illinois | ",
 "Upcoming Feb 4, 7:00 PM Women's · Illinois State at UIC | ",
 "Upcoming Feb 7, 2:00 PM Women's · Illinois State vs Evansville | ",
 "Upcoming Feb 12, 6:00 PM Women's · Illinois State at Valparaiso | ",
 "Upcoming Feb 14, 1:00 PM Women's · Illinois State vs Indiana State | ",
 "Upcoming Feb 18, 6:30 PM Women's · Illinois State at Belmont | ",
 "Upcoming Feb 25, 6:00 PM Women's · Illinois State at Northern Iowa | ",
 "Upcoming Feb 27, 4:00 PM Women's · Illinois State vs Bradley | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Illinois State at Fighting Illini Invitational | Men's team: 4th",
 "Final Sep 18 Illinois State at Redbird Invite | Women's team: 1st / Men's team: 1st",
 "Final Oct 2 Illinois State at Joe Piane Invitational | Women's team: 11th / Men's team: 5th",
 "Final Oct 16 Illinois State at Bradley Pink Classic | Women's team: 4th / Men's team: 3rd",
 "Upcoming Oct 30, 10:30 AM Illinois State at Missouri Valley Conference Championships | ",
 "Upcoming Nov 13, 11:00 AM Illinois State at NCAA Midwest Regional | ",
 "Upcoming Nov 21, 11:00 AM Illinois State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Illinois State vs St. Francis (Ill.) | W, 76-0",
 "Final Sep 5 Illinois State at Western Illinois | W, 41-10",
 "Final Sep 12 Illinois State at Northern Illinois | W, 28-24",
 "Final Sep 19 Illinois State vs Eastern Illinois | W, 49-13",
 "Final Sep 26 Illinois State at Northern Iowa | L, 21-28",
 "Final Oct 3 Illinois State vs South Dakota State | L, 14-31",
 "Final Oct 17 Illinois State at Southern Illinois | W, 35-14",
 "Upcoming Oct 24, 2:00 PM Illinois State vs Indiana State | ",
 "Upcoming Oct 31, 1:00 PM Illinois State vs Murray State | ",
 "Upcoming Nov 7, 1:00 PM Illinois State at North Dakota | ",
 "Upcoming Nov 14, 11:00 AM Illinois State at Youngstown State | ",
 "Upcoming Nov 21, 12:00 PM Illinois State vs South Dakota | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Illinois State at Redbird Invitational | 3rd of 13",
 "Final Sep 20 Women's · Illinois State at Mary Fossum Invitational | 8th of 15",
 "Final Oct 4 Women's · Illinois State at Coyote Creek Classic | 3rd of 9",
 "Final Oct 12 Women's · Illinois State at Lady Red Wolves Classic | 8th of 13",
 "Upcoming Nov 1 Women's · Illinois State at Samford Intercollegiate | ",
 "Upcoming Feb 1 Women's · Illinois State at Battle at Brentwater | ",
 "Upcoming Feb 19 Women's · Illinois State at Rio Verde Collegiate Invitational | ",
 "Upcoming Mar 9 Women's · Illinois State at UTSA Alamo Invitational | ",
 "Upcoming Mar 13 Women's · Illinois State at Valspar Augusta Invitational | ",
 "Upcoming Mar 22 Women's · Illinois State at Nashville Invitational | ",
 "Upcoming Apr 11 Women's · Illinois State at Boilermaker Spring Classic | ",
 "Upcoming Apr 18 Women's · Illinois State at MVC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Illinois State at Myrtle Beach Golf Trips Intercollegiate | T11th of 16",
 "Final Sep 27 Men's · Illinois State at Badger Invitational | 13th of 19",
 "Final Oct 5 Men's · Illinois State at Kemper Lakes Invitational | 8th of 12",
 "Final Oct 12 Men's · Illinois State at Purdue Fall Invitational | 6th of 13",
 "Final Oct 19 Men's · Illinois State at Flyer Invitational | T3rd of 13",
 "Upcoming Feb 15 Men's · Illinois State at Border Olympics | ",
 "Upcoming Feb 28 Men's · Illinois State at Lake Jovita Invitational | ",
 "Upcoming Mar 8 Men's · Illinois State at Louisiana Classics Invitational | ",
 "Upcoming Apr 5 Men's · Illinois State at Tiger Invitational | ",
 "Upcoming Apr 12 Men's · Illinois State at Everett Buick GMC Classic | ",
 "Upcoming Apr 17 Men's · Illinois State at Spring Boilermaker Shootout | ",
 "Upcoming Apr 25 Men's · Illinois State at MVC Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Illinois State vs Northern Illinois | W, 2-1",
 "Final Aug 20 Illinois State at Lindenwood | W, 1-0",
 "Final Aug 23 Illinois State vs UT Martin | T, 1-1",
 "Final Aug 27 Illinois State at Northwestern | T, 1-1",
 "Final Aug 30 Illinois State at Loyola Chicago | L, 0-2",
 "Final Sep 3 Illinois State vs Saint Louis | T, 1-1",
 "Final Sep 6 Illinois State vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 10 Illinois State at Eastern Illinois | W, 1-0",
 "Final Sep 13 Illinois State at Western Illinois | W, 3-1",
 "Final Sep 20 Illinois State at Murray State | W, 1-0",
 "Final Sep 27 Illinois State at UIC | W, 2-0",
 "Final Oct 4 Illinois State vs UNI | W, 6-0",
 "Final Oct 10 Illinois State at Southern Illinois | L, 0-1",
 "Final Oct 15 Illinois State vs Belmont | W, 1-0",
 "Final Oct 18 Illinois State vs Indiana State | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Illinois State at Evansville | ",
 "Upcoming Nov 1, 1:00 PM Illinois State at Drake | ",
 "Upcoming Nov 5, 1:00 PM Illinois State vs Valparaiso | ",
 "Upcoming Nov 8 Illinois State at Missouri Valley Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Illinois State vs Quincy | W, 187-69",
 "Final Oct 9 Women's · Illinois State at Indiana State | L, 58-240",
 "Final Oct 15 Women's · Illinois State at Ohio | L, 57-293",
 "Upcoming Nov 7 Women's · Illinois State vs Marquette | ",
 "Upcoming Nov 17 Women's · Illinois State at Hawkeye Invitational | ",
 "Upcoming Jan 9 Women's · Illinois State at Illinois | ",
 "Upcoming Jan 15, 3:00 PM Women's · Illinois State at UNI | ",
 "Upcoming Jan 22, 5:00 PM Women's · Illinois State at Valparaiso | ",
 "Upcoming Feb 17 Women's · Illinois State at MVC Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 26 Women's · Illinois State at Redbird Duals | Completed",
 "Final Oct 2 Women's · Illinois State at Redbird Invitational | Completed",
 "Final Oct 8 Women's · Illinois State at ITA Regional | Completed"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 5 Illinois State at Titan First Chance | ",
 "Upcoming Dec 5 Illinois State at Sharon Colyear-Danville Opener | ",
 "Upcoming Dec 11 Illinois State at Jimmy Grant Invite | ",
 "Upcoming Jan 15 Illinois State at Coughlan-Malloy Cup | ",
 "Upcoming Jan 22 Illinois State at Larry Wieczorek Invitational | ",
 "Upcoming Jan 29 Illinois State at Meyo Invitational | ",
 "Upcoming Feb 5 Illinois State at Keck Invite | ",
 "Upcoming Feb 12 Illinois State at Heartland Invitational | ",
 "Upcoming Feb 19 Illinois State at Badger Last Chance | ",
 "Upcoming Feb 20 Illinois State at Alex Wilson Invitational | ",
 "Upcoming Feb 28 Illinois State at Missouri Valley Conference Championships | ",
 "Upcoming Mar 12 Illinois State at NCAA National Championship | ",
 "Upcoming Mar 25 Illinois State at Raleigh Relays | ",
 "Upcoming Mar 26 Illinois State at Joyce Morton-Kief Invitational | ",
 "Upcoming Mar 31 Illinois State at Texas Relays | ",
 "Upcoming Apr 1 Illinois State at Washington University Distance Festival | ",
 "Upcoming Apr 1 Illinois State at Bobcat Invitational | ",
 "Upcoming Apr 9 Illinois State at Cougar Classic | ",
 "Upcoming Apr 15 Illinois State at Bryan Clay Invitational | ",
 "Upcoming Apr 15 Illinois State at Gibson Invitational | ",
 "Upcoming Apr 21 Illinois State at Steve Luke Memorial | ",
 "Upcoming Apr 30 Illinois State at Jim Green Invitational | ",
 "Upcoming May 7 Illinois State at Billy Hayes Invitational | ",
 "Upcoming May 7 Illinois State at Gary Wieneke Invitational | ",
 "Upcoming May 15 Illinois State at Missouri Valley Conference Championship | ",
 "Upcoming May 26 Illinois State at NCAA West Preliminary Round | ",
 "Upcoming Jun 9 Illinois State at NCAA National Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Illinois State at Seton Hall | L, 0-3",
 "Final Aug 29 Illinois State vs NJIT | W, 3-0",
 "Final Aug 30 Illinois State vs FDU | W, 3-0",
 "Final Sep 4 Illinois State at Central Michigan | W, 3-0",
 "Final Sep 5 Illinois State at Central Michigan | W, 3-0",
 "Final Sep 6 Illinois State at Eastern Michigan | W, 3-2",
 "Final Sep 11 Illinois State vs Western Illinois | W, 3-0",
 "Final Sep 12 Illinois State vs Lindenwood | L, 1-3",
 "Final Sep 13 Illinois State vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 19 Illinois State vs Marist | W, 3-0",
 "Final Sep 20 Illinois State at Oakland | W, 3-0",
 "Final Sep 25 Illinois State at UIC | W, 3-1",
 "Final Sep 26 Illinois State at Valparaiso | W, 3-2",
 "Final Oct 1 Illinois State vs Northern Iowa | L, 0-3",
 "Final Oct 2 Illinois State vs Drake | L, 2-3",
 "Final Oct 6 Illinois State vs Bradley | W, 3-0",
 "Final Oct 9 Illinois State vs Indiana State | W, 3-1",
 "Final Oct 16 Illinois State at Evansville | W, 3-1",
 "Final Oct 17 Illinois State at Indiana State | W, 3-1",
 "Today Oct 23, 6:00 PM Illinois State at Southern Illinois | ",
 "Upcoming Oct 25, 1:00 PM Illinois State vs Belmont | ",
 "Upcoming Oct 30, 6:00 PM Illinois State vs Valparaiso | ",
 "Upcoming Oct 31, 7:00 PM Illinois State vs Southern Illinois | ",
 "Upcoming Nov 3, 6:00 PM Illinois State at Bradley | ",
 "Upcoming Nov 6, 6:00 PM Illinois State vs UIC | ",
 "Upcoming Nov 13, 2:00 PM Illinois State at Murray State | ",
 "Upcoming Nov 14, 1:30 PM Illinois State at Belmont | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Illinois State module checks passed");
