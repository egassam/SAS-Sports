import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boiseStateSchool} from '../src/schools/boise-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='boise-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,boiseStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/boise-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit broncosports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['boise-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',boiseStateSchool.scheduleUrls],['roster',boiseStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('boise-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'broncosports.com',`${key} must stay on broncosports.com`);
  }
}
const parity={"Basketball":{"schedule":["https://broncosports.com/sports/mens-basketball/schedule","https://broncosports.com/sports/womens-basketball/schedule"],"roster":["https://broncosports.com/sports/mens-basketball/roster","https://broncosports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://broncosports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://broncosports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://broncosports.com/sports/cross-country/schedule"],"roster":["https://broncosports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://broncosports.com/sports/football/schedule"],"roster":["https://broncosports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://broncosports.com/sports/womens-golf/schedule","https://broncosports.com/sports/mens-golf/schedule"],"roster":["https://broncosports.com/sports/womens-golf/roster","https://broncosports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://broncosports.com/sports/womens-gymnastics/schedule"],"roster":["https://broncosports.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://broncosports.com/sports/womens-soccer/schedule"],"roster":["https://broncosports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://broncosports.com/sports/softball/schedule"],"roster":["https://broncosports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://broncosports.com/sports/womens-tennis/schedule","https://broncosports.com/sports/mens-tennis/schedule"],"roster":["https://broncosports.com/sports/womens-tennis/roster","https://broncosports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://broncosports.com/sports/track-and-field/schedule"],"roster":["https://broncosports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://broncosports.com/sports/womens-volleyball/schedule"],"roster":["https://broncosports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'boise-state|"+sport+"':"),`${sport} routes must live in the Boise State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-18T15:00:00Z");
const page=slug=>`https://broncosports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.boiseStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=boise-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 10 Men's · Boise State vs Idaho (Exhibition) | W, 82-72",
 "Final Oct 17 Men's · Boise State vs Washington (Exhibition) | W, 109-91",
 "Upcoming Oct 29, 7:00 PM Men's · Boise State vs Bismarck State College (Exhibition) | ",
 "Upcoming Nov 4, 7:00 PM Men's · Boise State vs West Coast Baptist | ",
 "Upcoming Nov 8, 12:00 PM Men's · Boise State vs Butler | ",
 "Upcoming Nov 11, 7:00 PM Men's · Boise State vs Oakland | ",
 "Upcoming Nov 15, 11:00 AM Men's · Boise State vs Nebraska | ",
 "Upcoming Nov 20, 7:00 PM Men's · Boise State vs Sam Houston | ",
 "Upcoming Nov 24, 7:00 PM Men's · Boise State vs Idaho State | ",
 "Upcoming Nov 27, 3:30 PM Men's · Boise State vs Drake | ",
 "Upcoming Nov 28, 1:30 PM Men's · Boise State vs North Texas | ",
 "Upcoming Nov 29, 2:00 PM Men's · Boise State vs North Dakota State | ",
 "Upcoming Dec 5 Men's · Boise State at Wichita State | ",
 "Upcoming Dec 12, 12:30 PM Men's · Boise State vs Texas A&M - Corpus Christi | ",
 "Upcoming Dec 16, 7:00 PM Men's · Boise State vs Utah Valley | ",
 "Upcoming Dec 21 Men's · Boise State vs Santa Clara | ",
 "Upcoming Dec 23, 1:30 PM Men's · Boise State vs New Mexico | ",
 "Upcoming Dec 29, 7:00 PM Men's · Boise State vs Lamar | ",
 "Upcoming Jan 6, 8:00 PM Men's · Boise State at Utah State | ",
 "Upcoming Jan 9, 7:00 PM Men's · Boise State vs Oregon State | ",
 "Upcoming Jan 13, 7:00 PM Men's · Boise State vs Washington State | ",
 "Upcoming Jan 16, 8:30 PM Men's · Boise State at Gonzaga | ",
 "Upcoming Jan 20, 7:00 PM Men's · Boise State at Fresno State | ",
 "Upcoming Jan 23, 8:00 PM Men's · Boise State vs San Diego State | ",
 "Upcoming Jan 27, 8:00 PM Men's · Boise State vs Utah State | ",
 "Upcoming Jan 30, 12:30 PM Men's · Boise State at Texas State | ",
 "Upcoming Feb 4, 9:00 PM Men's · Boise State at Oregon State | ",
 "Upcoming Feb 10, 6:00 PM Men's · Boise State vs Gonzaga | ",
 "Upcoming Feb 13, 2:00 PM Men's · Boise State vs Fresno State | ",
 "Upcoming Feb 18, 8:00 PM Men's · Boise State at Colorado State | ",
 "Upcoming Feb 20, 4:30 PM Men's · Boise State vs Texas State | ",
 "Upcoming Feb 25 Men's · Boise State at Washington State | ",
 "Upcoming Mar 3, 8:00 PM Men's · Boise State vs Colorado State | ",
 "Upcoming Mar 6, 8:30 PM Men's · Boise State at San Diego State | ",
 "Upcoming Mar 9 Men's · Boise State at Pac-12 | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Boise State vs Bushnell | ",
 "Upcoming Nov 6, 6:30 PM Women's · Boise State vs Portland State | ",
 "Upcoming Nov 10, 6:30 PM Women's · Boise State vs CSUN | ",
 "Upcoming Nov 13, 6:30 PM Women's · Boise State vs Utah | ",
 "Upcoming Nov 15, 1:00 PM Women's · Boise State vs Utah Tech | ",
 "Upcoming Nov 22, 2:00 PM Women's · Boise State vs UC Davis | ",
 "Upcoming Nov 27, 8:00 AM Women's · Boise State vs Stetson | ",
 "Upcoming Nov 28, 1:30 PM Women's · Boise State vs Missouri | ",
 "Upcoming Dec 4, 7:00 PM Women's · Boise State at San Francisco | ",
 "Upcoming Dec 6, 3:00 PM Women's · Boise State at Pepperdine | ",
 "Upcoming Dec 11, 6:30 PM Women's · Boise State vs Sacramento State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Boise State vs Santa Clara | ",
 "Upcoming Dec 20, 2:00 PM Women's · Boise State vs UC Riverside | ",
 "Upcoming Dec 22, 2:00 PM Women's · Boise State vs Saint Mary's | ",
 "Upcoming Dec 31, 2:00 PM Women's · Boise State vs South Dakota | ",
 "Upcoming Jan 6 Women's · Boise State at Texas State | ",
 "Upcoming Jan 10, 2:00 PM Women's · Boise State at San Diego State | ",
 "Upcoming Jan 14, 6:30 PM Women's · Boise State vs Washington State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Boise State vs Gonzaga | ",
 "Upcoming Jan 20 Women's · Boise State at Utah State | ",
 "Upcoming Jan 24, 2:00 PM Women's · Boise State vs Colorado State | ",
 "Upcoming Jan 27, 7:00 PM Women's · Boise State at Oregon State | ",
 "Upcoming Feb 3, 7:30 PM Women's · Boise State at Fresno State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Boise State vs Texas State | ",
 "Upcoming Feb 11, 6:30 PM Women's · Boise State vs Utah State | ",
 "Upcoming Feb 14, 2:00 PM Women's · Boise State vs San Diego State | ",
 "Upcoming Feb 20 Women's · Boise State at Gonzaga | ",
 "Upcoming Feb 24, 6:30 PM Women's · Boise State vs Oregon State | ",
 "Upcoming Feb 28, 12:00 PM Women's · Boise State at Washington State | ",
 "Upcoming Mar 3 Women's · Boise State at Colorado State | ",
 "Upcoming Mar 6, 2:00 PM Women's · Boise State vs Fresno State | ",
 "Upcoming Mar 9 Women's · Boise State at Pac-12 Women's Basketball Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 3 Boise State at Alki AVCA Qualifier | Completed",
 "Upcoming Oct 24 Boise State at Surf City Collegiate Challenge | ",
 "Upcoming Nov 6 Boise State at AVCA National Pairs Championship | ",
 "Upcoming Nov 7 Boise State at Grand Canyon Pairs Tournament | ",
 "Upcoming Nov 20 Boise State at Kaua'i College Volleyball Invitational | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 18 Boise State at Roy Griak Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 9 Boise State at Dr. Thad Scholes Invitational | Women's team: 1st / Men's team: 2nd",
 "Final Oct 9 Boise State at Nuttycombe Invitational | Women's team: 25th / Men's team: 27th",
 "Upcoming Oct 30 Boise State at Pac-12 Championships | ",
 "Upcoming Nov 13 Boise State at NCAA West Regional | ",
 "Upcoming Nov 21 Boise State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Boise State at Oregon | L, 27-34",
 "Final Sep 12 Boise State vs Memphis | W, 38-20",
 "Final Sep 19 Boise State vs South Dakota | W, 38-24",
 "Final Sep 26 Boise State at Western Michigan | W, 32-7",
 "Final Oct 3 Boise State vs Utah State | W, 37-18",
 "Final Oct 10 Boise State at Fresno State | W, 38-31",
 "Upcoming Oct 24, 4:00 PM Boise State at Washington State | ",
 "Upcoming Oct 31, 8:00 PM Boise State vs Texas State | ",
 "Upcoming Nov 7, 4:00 PM Boise State at Colorado State | ",
 "Upcoming Nov 14, 4:00 PM Boise State vs Oregon State | ",
 "Upcoming Nov 21, 7:30 PM Boise State vs San Diego State | ",
 "Upcoming Nov 28 Boise State at Flex Game | ",
 "Upcoming Dec 4, 6:00 PM Boise State at Pac-12 Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Boise State at Badger Invitational | 8th",
 "Final Sep 21 Women's · Boise State at Kalispel Invitational | 1st",
 "Final Oct 2 Women's · Boise State at Ron Moore Intercollegiate | T13th",
 "Today Oct 18 Women's · Boise State at Jim West Challenge | ",
 "Upcoming Oct 25 Women's · Boise State at The Clash at Boulder Creek | ",
 "Upcoming Feb 8 Women's · Boise State at Mountain Classic Match Play | ",
 "Upcoming Feb 13 Women's · Boise State at Alice & John Wallace Women's Golf Classic | ",
 "Upcoming Mar 9 Women's · Boise State at Alamo Invitational | ",
 "Upcoming Mar 22 Women's · Boise State at Dr. Donnis Thompson Invitational | ",
 "Upcoming Mar 29 Women's · Boise State at State of Idaho Match | ",
 "Upcoming Apr 6 Women's · Boise State at Cowgirl Classic | ",
 "Upcoming Apr 25 Women's · Boise State at Pac-12 Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Boise State at Island Resort Classic | 11th",
 "Final Sep 21 Men's · Boise State at CDA National Reserve Invitational | 3rd",
 "Final Sep 29 Men's · Boise State at Mark Simpson Colorado Invitational | 11th",
 "Final Oct 5 Men's · Boise State at Oregon State Invitational | 2nd",
 "Upcoming Oct 26 Men's · Boise State at Ka'anapali Classic | ",
 "Upcoming Feb 15 Men's · Boise State at Border Olympics | ",
 "Upcoming Feb 28 Men's · Boise State at Loyola Intercollegiate | ",
 "Upcoming Mar 8 Men's · Boise State at Cleveland Golf Palmetto Intercollegiate | ",
 "Upcoming Mar 22 Men's · Boise State at Oregon Duck Invitational | ",
 "Upcoming Mar 29 Men's · Boise State at Battle for Idaho | ",
 "Upcoming Apr 5 Men's · Boise State at UC Santa Barbara Intercollegiate | ",
 "Upcoming Apr 8 Men's · Boise State at El Macero | ",
 "Upcoming Apr 30 Men's · Boise State at Pac-12 Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Boise State vs CSUN | W, 3-0",
 "Final Aug 16 Boise State at Weber State | W, 4-1",
 "Final Aug 20 Boise State at SMU | T, 0-0",
 "Final Aug 23 Boise State at Texas Tech | L, 0-2",
 "Final Aug 30 Boise State vs Idaho State | W, 3-1",
 "Final Sep 3 Boise State vs UC San Diego | W, 1-0",
 "Final Sep 10 Boise State at Cal State Bakersfield | W, 2-0",
 "Final Sep 13 Boise State at Portland State | W, 4-0",
 "Final Sep 17 Boise State vs Southern Utah | W, 2-0",
 "Final Sep 25 Boise State vs Northern Colorado | W, 3-0",
 "Final Oct 1 Boise State at San Diego State | W, 4-1",
 "Final Oct 4 Boise State vs Gonzaga | W, 3-0",
 "Final Oct 8 Boise State at Fresno State | W, 4-0",
 "Final Oct 11 Boise State vs Utah State | L, 0-1",
 "Final Oct 17 Boise State vs Oregon State | W, 2-1",
 "Upcoming Oct 22, 6:00 PM Boise State at Colorado State | ",
 "Upcoming Oct 30, 6:00 PM Boise State at Texas State | ",
 "Upcoming Nov 5, 7:00 PM Boise State vs Washington State | ",
 "Upcoming Nov 11 Boise State at Pac-12 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 17, 1:00 PM Boise State at Washington (Exhibition) | ",
 "Upcoming Oct 17, 5:30 PM Boise State vs Mt. Hood Community College (Exhibition) | ",
 "Today Oct 18, 11:00 AM Boise State at Seattle (Exhibition) | ",
 "Upcoming Apr 2 Boise State vs San Diego State | ",
 "Upcoming Apr 3 Boise State vs San Diego State | ",
 "Upcoming Apr 4 Boise State vs San Diego State | ",
 "Upcoming Apr 9 Boise State at Utah State | ",
 "Upcoming Apr 10 Boise State at Utah State | ",
 "Upcoming Apr 11 Boise State at Utah State | ",
 "Upcoming Apr 16 Boise State at Oregon State | ",
 "Upcoming Apr 17 Boise State at Oregon State | ",
 "Upcoming Apr 18 Boise State at Oregon State | ",
 "Upcoming Apr 23 Boise State vs Colorado State | ",
 "Upcoming Apr 24 Boise State vs Colorado State | ",
 "Upcoming Apr 25 Boise State vs Colorado State | ",
 "Upcoming Apr 30 Boise State vs Texas State | ",
 "Upcoming May 1 Boise State vs Texas State | ",
 "Upcoming May 2 Boise State vs Texas State | ",
 "Upcoming May 6 Boise State at Fresno State | ",
 "Upcoming May 7 Boise State at Fresno State | ",
 "Upcoming May 8 Boise State at Fresno State | ",
 "Upcoming May 12 Boise State at Pac-12 Conference Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Boise State at Barb Chandler Classic | Completed",
 "Final Sep 19 Women's · Boise State at ITA All-American Championships | Completed",
 "Final Sep 24 Women's · Boise State at USD Invite | Completed",
 "Final Oct 13 Women's · Boise State at ITA Regional Championships | Completed",
 "Upcoming Oct 23 Women's · Boise State at Pac-12 Championships | ",
 "Upcoming Oct 30 Women's · Boise State at ASU Invite | ",
 "Upcoming Nov 5 Women's · Boise State at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Boise State at ITA Conference Masters Championships | ",
 "Upcoming Nov 13 Women's · Boise State at Wildcat Invite | ",
 "Upcoming Nov 17 Women's · Boise State at NCAA Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Boise State at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Boise State at Boise State Dar Walters Fall Classic | Completed",
 "Final Oct 1 Men's · Boise State at Battle in the Bay Classic | Completed",
 "Final Oct 6 Men's · Boise State at ITA Mountain Regional Championships | Completed",
 "Upcoming Oct 23 Men's · Boise State at Pac-12 Conference Tournament | ",
 "Upcoming Nov 5 Men's · Boise State at ITA West Sectional Championships | ",
 "Upcoming Nov 5 Men's · Boise State at Gonzaga Tournament | ",
 "Upcoming Nov 5 Men's · Boise State at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Boise State at NCAA Men's Tennis National Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Feb 26 Boise State at MPSF Indoor Track & Field Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Boise State vs Middle Tennessee | L, 2-3",
 "Final Aug 28 Boise State at UNC Asheville | W, 3-0",
 "Final Aug 29 Boise State vs Middle Tennessee | L, 0-3",
 "Final Sep 3 Boise State vs North Dakota State | W, 3-0",
 "Final Sep 4 Boise State vs UNLV | W, 3-0",
 "Final Sep 5 Boise State vs Idaho State | L, 2-3",
 "Final Sep 8 Boise State vs BYU | L, 0-3",
 "Final Sep 10 Boise State vs Sacramento State | W, 3-0",
 "Final Sep 11 Boise State vs Saint Mary's | W, 3-0",
 "Final Sep 12 Boise State vs Eastern Washington | W, 3-0",
 "Final Sep 17 Boise State vs Wyoming | L, 2-3",
 "Final Sep 18 Boise State vs Pacific | W, 3-0",
 "Final Sep 19 Boise State at Idaho State | W, 3-0",
 "Final Sep 24 Boise State vs Gonzaga | W, 3-1",
 "Final Oct 1 Boise State vs San Diego State | L, 1-3",
 "Final Oct 3 Boise State vs Texas State | W, 3-0",
 "Final Oct 8 Boise State at Utah State | W, 3-1",
 "Final Oct 10 Boise State at Fresno State | W, 3-0",
 "Final Oct 15 Boise State vs Washington State | L, 2-3",
 "Final Oct 17 Boise State at Gonzaga | L, 2-3",
 "Upcoming Oct 22, 6:00 PM Boise State vs Utah State | ",
 "Upcoming Oct 24, 12:00 PM Boise State vs Colorado State | ",
 "Upcoming Oct 29, 7:00 PM Boise State at San Diego State | ",
 "Upcoming Oct 31, 11:00 AM Boise State at Texas State | ",
 "Upcoming Nov 4, 6:00 PM Boise State vs Oregon State | ",
 "Upcoming Nov 7, 12:00 PM Boise State at Colorado State | ",
 "Upcoming Nov 14, 12:00 PM Boise State vs Fresno State | ",
 "Upcoming Nov 17, 6:00 PM Boise State at Washington State | ",
 "Upcoming Nov 19, 7:00 PM Boise State at Oregon State | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf cards give the place, the team score and its score to par: women's
// "8th, 892 (+28)", men's "2nd (840, -12)". Mutation: without the rule the
// Badger Invitational read "Completed".
{
  const results=(slug,name)=>parse('Golf',slug).find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('womens-golf','Badger Invitational'),['Result: 8th','Team score: 892 (+28)']);
  assert.deepEqual(results('womens-golf','Ron Moore Intercollegiate'),['Result: T13th','Team score: 895 (+31)']);
  assert.deepEqual(results('mens-golf','Oregon State Invitational'),['Result: 2nd','Team score: 840 (-12)']);
}
// Volleyball's "Idaho State (Host)" names the opponent without the note.
assert.ok(parse('Volleyball','womens-volleyball').some(e=>e.opponent==='Idaho State'&&e.display_time==='Sep 19'));
// Softball's conference tournament is listed once (the page has a second,
// one-day "Pac-12 Championship" card on May 12).
assert.deepEqual(parse('Softball','softball').filter(e=>e.start_time?.startsWith('2027-05-12')).map(e=>e.opponent),['Pac-12 Conference Tournament']);
// A beach volleyball tournament with no result takes its archive story: the
// Alki AVCA Qualifier (Oct 3-4) is told in the Oct 4 story of the pair that
// finished second. Mutation: without the meet rule it stayed storyless.
{
  const event=parse('Beach Volleyball','womens-beach-volleyball').find(e=>e.opponent==='Alki AVCA Qualifier');
  assert.equal(event.status,'Final');assert.ok(!event.recap_url);
  recapFixtures.set('https://broncosports.com/sports/womens-beach-volleyball/archives',fixture('womens-beach-volleyball-archives.html.gz'));
  const story='https://broncosports.com/news/2026/10/4/womens-beach-volleyball-broncos-earn-additional-bid-to-avca-national-pairs-championship';
  recapFixtures.set(story,fixture('story-2026-10-4-womens-beach-volleyball-broncos-earn-add.html.gz'));
  assert.ok(worker.boiseStateHandlers.isFinalWithoutStory(event));
  await worker.boiseStateHandlers.attachArchiveStory(event);
  assert.equal(event.recap_url,story);
  assert.ok(requests.every(url=>recapFixtures.has(url)),'only the saved archive and story are read');
  requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Boise State module checks passed');
