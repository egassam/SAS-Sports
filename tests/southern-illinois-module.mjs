import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southernIllinoisSchool} from '../src/schools/southern-illinois.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southern-illinois');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southernIllinoisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southern-illinois-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit siusalukis.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southern-illinois'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',southernIllinoisSchool.scheduleUrls],['roster',southernIllinoisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southern-illinois|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'siusalukis.com',`${key} must stay on siusalukis.com`);
  }
}
const parity={"Baseball":{"schedule":["https://siusalukis.com/sports/baseball/schedule"],"roster":["https://siusalukis.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://siusalukis.com/sports/mens-basketball/schedule","https://siusalukis.com/sports/womens-basketball/schedule"],"roster":["https://siusalukis.com/sports/mens-basketball/roster","https://siusalukis.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://siusalukis.com/sports/mens-cross-country/schedule"],"roster":["https://siusalukis.com/sports/mens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://siusalukis.com/sports/football/schedule"],"roster":["https://siusalukis.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://siusalukis.com/sports/womens-golf/schedule","https://siusalukis.com/sports/mens-golf/schedule"],"roster":["https://siusalukis.com/sports/womens-golf/roster","https://siusalukis.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://siusalukis.com/sports/womens-soccer/schedule"],"roster":["https://siusalukis.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://siusalukis.com/sports/softball/schedule"],"roster":["https://siusalukis.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://siusalukis.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://siusalukis.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://siusalukis.com/sports/mens-track-and-field/schedule"],"roster":["https://siusalukis.com/sports/mens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://siusalukis.com/sports/womens-volleyball/schedule"],"roster":["https://siusalukis.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southern-illinois|"+sport+"':"),`${sport} routes must live in the Southern Illinois module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://siusalukis.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southernIllinoisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southern-illinois)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 23, 3:00 PM Southern Illinois vs Southwestern Illinois College | ",
 "Upcoming Oct 30, 3:00 PM Southern Illinois vs Mineral Area College | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 20 Men's · Southern Illinois vs Lindenwood (Exhibition) | W, 75-71",
 "Upcoming Oct 25, 3:00 PM Men's · Southern Illinois vs Tennessee Tech (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Southern Illinois vs Maryville | ",
 "Upcoming Nov 6 Men's · Southern Illinois at Kansas City | ",
 "Upcoming Nov 12, 7:00 PM Men's · Southern Illinois vs Richmond | ",
 "Upcoming Nov 17, 5:00 PM Men's · Southern Illinois vs Liberty | ",
 "Upcoming Nov 20, 5:30 PM Men's · Southern Illinois vs UT Martin | ",
 "Upcoming Nov 28, 6:00 PM Men's · Southern Illinois vs Portland State | ",
 "Upcoming Dec 3, 7:00 PM Men's · Southern Illinois vs Washington State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Southern Illinois vs SEMO | ",
 "Upcoming Dec 12, 7:00 PM Men's · Southern Illinois at Little Rock | ",
 "Upcoming Dec 18, 7:00 PM Men's · Southern Illinois vs Northern Iowa | ",
 "Upcoming Dec 22, 6:00 PM Men's · Southern Illinois at Drake | ",
 "Upcoming Dec 29, 8:00 PM Men's · Southern Illinois at Arizona State | ",
 "Upcoming Jan 2 Men's · Southern Illinois at Valparaiso | ",
 "Upcoming Jan 5 Men's · Southern Illinois at UIC | ",
 "Upcoming Jan 9 Men's · Southern Illinois vs Bradley | ",
 "Upcoming Jan 12 Men's · Southern Illinois vs Murray State | ",
 "Upcoming Jan 16, 4:00 PM Men's · Southern Illinois at Belmont | ",
 "Upcoming Jan 18, 7:00 PM Men's · Southern Illinois vs Evansville | ",
 "Upcoming Jan 21 Men's · Southern Illinois at Indiana State | ",
 "Upcoming Jan 24 Men's · Southern Illinois vs Valparaiso | ",
 "Upcoming Jan 27, 6:00 PM Men's · Southern Illinois at Illinois State | ",
 "Upcoming Jan 30 Men's · Southern Illinois vs Belmont | ",
 "Upcoming Feb 3 Men's · Southern Illinois vs Indiana State | ",
 "Upcoming Feb 6 Men's · Southern Illinois at Northern Iowa | ",
 "Upcoming Feb 9 Men's · Southern Illinois vs Drake | ",
 "Upcoming Feb 15 Men's · Southern Illinois at Murray State | ",
 "Upcoming Feb 18 Men's · Southern Illinois vs Illinois State | ",
 "Upcoming Feb 21 Men's · Southern Illinois at Bradley | ",
 "Upcoming Feb 24, 8:00 PM Men's · Southern Illinois vs UIC | ",
 "Upcoming Feb 28 Men's · Southern Illinois at Evansville | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 22 Women's · Southern Illinois vs Kentucky Wesleyan (Exhibition) | W, 80-58",
 "Upcoming Nov 3, 6:00 PM Women's · Southern Illinois vs Illinois-Springfield | ",
 "Upcoming Nov 6, 6:00 PM Women's · Southern Illinois at Indiana | ",
 "Upcoming Nov 12, 5:00 PM Women's · Southern Illinois at Eastern Kentucky | ",
 "Upcoming Nov 17, 6:00 PM Women's · Southern Illinois vs Eastern Illinois | ",
 "Upcoming Nov 20, 6:00 PM Women's · Southern Illinois vs UT Martin | ",
 "Upcoming Nov 24, 6:30 PM Women's · Southern Illinois at Western Kentucky | ",
 "Upcoming Nov 27, 2:30 PM Women's · Southern Illinois vs Purdue Fort Wayne | ",
 "Upcoming Nov 28, 12:00 PM Women's · Southern Illinois vs West Florida | ",
 "Upcoming Dec 1, 6:30 PM Women's · Southern Illinois at SEMO | ",
 "Upcoming Dec 7, 6:00 PM Women's · Southern Illinois at SIUE | ",
 "Upcoming Dec 9, 1:00 PM Women's · Southern Illinois vs Arkansas-Little Rock | ",
 "Upcoming Dec 14, 11:00 AM Women's · Southern Illinois vs Ohio | ",
 "Upcoming Dec 20, 2:00 PM Women's · Southern Illinois at Drake | ",
 "Upcoming Dec 22, 6:00 PM Women's · Southern Illinois at Northern Iowa | ",
 "Upcoming Dec 29, 6:00 PM Women's · Southern Illinois vs Murray State | ",
 "Upcoming Dec 31, 12:00 PM Women's · Southern Illinois at Evansville | ",
 "Upcoming Jan 3, 2:00 PM Women's · Southern Illinois vs Illinois State | ",
 "Upcoming Jan 7, 6:30 PM Women's · Southern Illinois at Belmont | ",
 "Upcoming Jan 9 Women's · Southern Illinois vs Valparaiso | ",
 "Upcoming Jan 14, 6:00 PM Women's · Southern Illinois at Bradley | ",
 "Upcoming Jan 17, 2:00 PM Women's · Southern Illinois vs Indiana State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Southern Illinois vs Belmont | ",
 "Upcoming Jan 25, 6:00 PM Women's · Southern Illinois vs Evansville | ",
 "Upcoming Jan 28, 7:00 PM Women's · Southern Illinois at UIC | ",
 "Upcoming Jan 31, 2:00 PM Women's · Southern Illinois at Illinois State | ",
 "Upcoming Feb 5, 6:00 PM Women's · Southern Illinois vs Drake | ",
 "Upcoming Feb 7, 2:00 PM Women's · Southern Illinois vs Northern Iowa | ",
 "Upcoming Feb 14, 12:00 PM Women's · Southern Illinois vs Bradley | ",
 "Upcoming Feb 19, 6:00 PM Women's · Southern Illinois at Murray State | ",
 "Upcoming Feb 21, 2:00 PM Women's · Southern Illinois vs UIC | ",
 "Upcoming Feb 25, 6:00 PM Women's · Southern Illinois at Indiana State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Southern Illinois at Valparaiso | ",
 "Upcoming Mar 3 Women's · Southern Illinois at MVC Women's Basketball Tournament | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Southern Illinois at City Auto Memphis Twilight | Women 5k 8th/18 Men 4 mile 8th/20",
 "Final Sep 18 Southern Illinois at Semo OVC Preview | 1st of 4",
 "Final Sep 25 Southern Illinois at Loyola University's Sean Earl Lakefront Invitational | 8th of 8",
 "Final Oct 2 Southern Illinois at Notre Dame’s Joe Piane Meet | 6th of 21",
 "Final Oct 16 Southern Illinois at Indiana State's Under Armour Pre-National Invite | 22th of 26",
 "Upcoming Oct 30 Southern Illinois at Missouri Valley Conference Championship | ",
 "Upcoming Nov 13 Southern Illinois at Mid-West Region Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Southern Illinois at West Florida | L, 31-34",
 "Final Sep 3 Southern Illinois at Samford | W, 22-18",
 "Final Sep 12 Southern Illinois vs SEMO | W, 34-20",
 "Final Sep 19 Southern Illinois at Illinois | L, 10-48",
 "Final Sep 26 Southern Illinois at Murray State | W, 46-6",
 "Final Oct 3 Southern Illinois vs Youngstown State | L, 16-28",
 "Final Oct 10 Southern Illinois at South Dakota | L, 10-31",
 "Final Oct 17 Southern Illinois vs Illinois State | L, 14-35",
 "Upcoming Oct 24, 1:00 PM Southern Illinois vs Northern Iowa | ",
 "Upcoming Nov 7, 5:00 PM Southern Illinois at Indiana State | ",
 "Upcoming Nov 14, 1:00 PM Southern Illinois vs South Dakota State | ",
 "Upcoming Nov 21, 1:00 PM Southern Illinois at North Dakota | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Southern Illinois at The Bear Brawl | 5th of 6",
 "Final Sep 14 Women's · Southern Illinois at The Velvet | 9th of 14",
 "Final Oct 12 Women's · Southern Illinois at Lady Red Wolves Classic | 11th of 11",
 "Final Oct 19 Women's · Southern Illinois at Charles Braun Jr. Intercollegiate | 1st of 11",
 "Upcoming Feb 6 Women's · Southern Illinois at Treasure Coast Invitational | ",
 "Upcoming Feb 22 Women's · Southern Illinois at Babs Steffens Invitational | ",
 "Upcoming Mar 7 Women's · Southern Illinois at Dorado Del Mar Collegiate | ",
 "Upcoming Apr 11 Women's · Southern Illinois at Indiana State Spring Invitational | ",
 "Upcoming Apr 18 Women's · Southern Illinois at MVC Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Southern Illinois at K-State Wildcat Invitational | 4th of 15",
 "Final Sep 21 Men's · Southern Illinois at Highlands Invitational | 11th of 11",
 "Final Sep 27 Men's · Southern Illinois at Badger Invitational | 16th of 19",
 "Final Oct 12 Men's · Southern Illinois at Purdue Fall Invitational | 11th of 11",
 "Upcoming Oct 26 Men's · Southern Illinois at Hawaii | ",
 "Upcoming Feb 22 Men's · Southern Illinois at Wyoming Desert intercollegiate | ",
 "Upcoming Mar 1 Men's · Southern Illinois at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 12 Men's · Southern Illinois at Seminole Intercollegiate | ",
 "Upcoming Mar 29 Men's · Southern Illinois at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 Men's · Southern Illinois at Racer Intercollegiate | ",
 "Upcoming Apr 12 Men's · Southern Illinois at Everett Buick GMC Classic | ",
 "Upcoming Apr 25 Men's · Southern Illinois at MVC Championships | ",
 "Upcoming May 17 Men's · Southern Illinois at NCAA Regionals | ",
 "Upcoming May 28 Men's · Southern Illinois at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Southern Illinois at SEMO | L, 0-1",
 "Final Aug 16 Southern Illinois vs Western Illinois | W, 5-0",
 "Final Aug 20 Southern Illinois at Auburn | L, 0-3",
 "Final Aug 30 Southern Illinois vs Alabama A&M | W, 8-0",
 "Final Sep 3 Southern Illinois vs Lindenwood | W, 1-0",
 "Final Sep 6 Southern Illinois at Chicago State | W, 2-0",
 "Final Sep 10 Southern Illinois vs SIUE | W, 1-0",
 "Final Sep 13 Southern Illinois at UT Martin | W, 1-0",
 "Final Sep 19 Southern Illinois at Evansville | W, 2-1",
 "Final Sep 26 Southern Illinois vs Murray State | W, 2-1",
 "Final Oct 3 Southern Illinois at Belmont | W, 2-1",
 "Final Oct 10 Southern Illinois vs Illinois State | W, 1-0",
 "Final Oct 15 Southern Illinois at Valparaiso | W, 3-0",
 "Final Oct 18 Southern Illinois at UIC | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Southern Illinois vs Drake | ",
 "Upcoming Nov 1, 1:00 PM Southern Illinois vs UNI | ",
 "Upcoming Nov 5, 1:00 PM Southern Illinois at Indiana State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Southern Illinois vs Missouri State | Completed",
 "Final Oct 16 Men's · Southern Illinois at Northern Iowa (Women)/St. Thomas (MN) | Completed",
 "Upcoming Oct 30 Men's · Southern Illinois vs Missouri | ",
 "Upcoming Nov 12 Men's · Southern Illinois at A3 Performance Invite | ",
 "Upcoming Nov 18 Men's · Southern Illinois at Mizzou Invite | ",
 "Upcoming Jan 8, 4:00 PM Men's · Southern Illinois vs Little Rock (Women)/Quincy (Men) | ",
 "Upcoming Jan 15, 1:30 PM Men's · Southern Illinois at McKendree | ",
 "Upcoming Jan 30, 2:00 PM Men's · Southern Illinois at Indiana State University (Women)/Ball State | ",
 "Upcoming Feb 5, 3:00 PM Men's · Southern Illinois vs Evansville | ",
 "Upcoming Feb 17 Men's · Southern Illinois at MVC Championships | ",
 "Upcoming Mar 1 Men's · Southern Illinois at NCAA Zone Diving | ",
 "Upcoming Mar 17 Men's · Southern Illinois at Women's NCAA Championships | ",
 "Upcoming Mar 24 Men's · Southern Illinois at Men's NCAA Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Southern Illinois at Saluki Fast Start | ",
 "Upcoming Jan 22 Southern Illinois at Don Denoon Invitational | ",
 "Upcoming Jan 29 Southern Illinois at Lenny Lyles Louisville Invitational | ",
 "Upcoming Feb 6 Southern Illinois at Missouri Invitational | ",
 "Upcoming Feb 12 Southern Illinois at Indianapolis Heartland Invitational | ",
 "Upcoming Feb 28 Southern Illinois at MVC Indoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Southern Illinois vs Louisiana-Monroe | W, 3-1",
 "Final Aug 29 Southern Illinois at East Texas A&M | W, 3-1",
 "Final Aug 30 Southern Illinois vs Texas Southern | W, 3-0",
 "Final Sep 4 Southern Illinois vs SEMO | W, 3-2",
 "Final Sep 4 Southern Illinois vs Merrimack | W, 3-1",
 "Final Sep 5 Southern Illinois vs Saint Louis | L, 2-3",
 "Final Sep 10 Southern Illinois at Iowa | L, 1-3",
 "Final Sep 11 Southern Illinois vs Incarnate Word | L, 0-3",
 "Final Sep 11 Southern Illinois vs Missouri State | L, 0-3",
 "Final Sep 18 Southern Illinois vs SIUE | W, 3-0",
 "Final Sep 18 Southern Illinois vs Gardner-Webb | L, 2-3",
 "Final Sep 19 Southern Illinois at Austin Peay | L, 0-3",
 "Final Sep 25 Southern Illinois at Evansville | W, 3-2",
 "Final Sep 26 Southern Illinois at Indiana State | W, 3-0",
 "Final Oct 2 Southern Illinois vs Valparaiso | W, 3-2",
 "Final Oct 3 Southern Illinois vs UIC | L, 2-3",
 "Final Oct 8 Southern Illinois at Belmont | L, 0-3",
 "Final Oct 10 Southern Illinois vs Northern Iowa | L, 1-3",
 "Final Oct 16 Southern Illinois at Murray State | L, 2-3",
 "Final Oct 17 Southern Illinois vs Bradley | L, 1-3",
 "Today Oct 23, 6:00 PM Southern Illinois vs Illinois State | ",
 "Upcoming Oct 24, 5:00 PM Southern Illinois vs Murray State | ",
 "Upcoming Oct 30, 6:00 PM Southern Illinois at Bradley | ",
 "Upcoming Oct 31, 7:00 PM Southern Illinois at Illinois State | ",
 "Upcoming Nov 6, 6:00 PM Southern Illinois at Drake | ",
 "Upcoming Nov 7, 5:00 PM Southern Illinois at Northern Iowa | ",
 "Upcoming Nov 13, 6:00 PM Southern Illinois vs Evansville | ",
 "Upcoming Nov 14, 5:00 PM Southern Illinois vs Indiana State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southern Illinois module checks passed");
