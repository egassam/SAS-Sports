import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northernArizonaSchool} from '../src/schools/northern-arizona.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='northern-arizona');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northernArizonaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/northern-arizona-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit nauathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['northern-arizona'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',northernArizonaSchool.scheduleUrls],['roster',northernArizonaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('northern-arizona|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'nauathletics.com',`${key} must stay on nauathletics.com`);
  }
}
const parity={"Basketball":{"schedule":["https://nauathletics.com/sports/mens-basketball/schedule","https://nauathletics.com/sports/womens-basketball/schedule"],"roster":["https://nauathletics.com/sports/mens-basketball/roster","https://nauathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://nauathletics.com/sports/cross-country/schedule"],"roster":["https://nauathletics.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://nauathletics.com/sports/football/schedule"],"roster":["https://nauathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://nauathletics.com/sports/womens-golf/schedule"],"roster":["https://nauathletics.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://nauathletics.com/sports/womens-soccer/schedule"],"roster":["https://nauathletics.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://nauathletics.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://nauathletics.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://nauathletics.com/sports/womens-tennis/schedule","https://nauathletics.com/sports/mens-tennis/schedule"],"roster":["https://nauathletics.com/sports/womens-tennis/roster","https://nauathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://nauathletics.com/sports/track-and-field/schedule"],"roster":["https://nauathletics.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://nauathletics.com/sports/womens-volleyball/schedule"],"roster":["https://nauathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'northern-arizona|"+sport+"':"),`${sport} routes must live in the Northern Arizona module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://nauathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northernArizonaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=northern-arizona)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 8:00 PM Men's · Northern Arizona at UNLV | ",
 "Upcoming Nov 7, 4:00 PM Men's · Northern Arizona at New Mexico | ",
 "Upcoming Nov 10, 7:00 PM Men's · Northern Arizona at Arizona | ",
 "Upcoming Nov 13, 5:00 PM Men's · Northern Arizona at Kentucky | ",
 "Upcoming Nov 17, 6:00 PM Men's · Northern Arizona vs Embry-Riddle | ",
 "Upcoming Nov 21, 5:00 PM Men's · Northern Arizona at Cal Poly | ",
 "Upcoming Nov 28, 3:00 PM Men's · Northern Arizona at CSU Bakersfield | ",
 "Upcoming Dec 3, 6:00 PM Men's · Northern Arizona vs Montana | ",
 "Upcoming Dec 5, 6:00 PM Men's · Northern Arizona vs Montana State | ",
 "Upcoming Dec 10, 6:00 PM Men's · Northern Arizona vs Nelson | ",
 "Upcoming Dec 14, 11:00 AM Men's · Northern Arizona vs Justice College | ",
 "Upcoming Dec 16, 5:00 PM Men's · Northern Arizona at West Virginia | ",
 "Upcoming Dec 21, 4:00 PM Men's · Northern Arizona at Iowa State | ",
 "Upcoming Dec 28, 6:00 PM Men's · Northern Arizona vs Benedictine Mesa | ",
 "Upcoming Dec 31, 2:00 PM Men's · Northern Arizona at Weber State | ",
 "Upcoming Jan 2, 4:00 PM Men's · Northern Arizona at Idaho State | ",
 "Upcoming Jan 7, 7:00 PM Men's · Northern Arizona at Eastern Washington | ",
 "Upcoming Jan 9, 3:00 PM Men's · Northern Arizona at Idaho | ",
 "Upcoming Jan 14, 6:00 PM Men's · Northern Arizona vs Utah Tech | ",
 "Upcoming Jan 21, 8:00 PM Men's · Northern Arizona at Portland State | ",
 "Upcoming Jan 23, 6:00 PM Men's · Northern Arizona vs Northern Colorado | ",
 "Upcoming Jan 28, 7:00 PM Men's · Northern Arizona at Montana State | ",
 "Upcoming Jan 30, 4:00 PM Men's · Northern Arizona at Montana | ",
 "Upcoming Feb 4, 6:00 PM Men's · Northern Arizona vs Idaho State | ",
 "Upcoming Feb 6, 6:00 PM Men's · Northern Arizona vs Weber State | ",
 "Upcoming Feb 8, 6:00 PM Men's · Northern Arizona vs Southern Utah | ",
 "Upcoming Feb 11, 7:00 PM Men's · Northern Arizona at Utah Tech | ",
 "Upcoming Feb 18, 6:00 PM Men's · Northern Arizona vs Idaho | ",
 "Upcoming Feb 20, 6:00 PM Men's · Northern Arizona vs Eastern Washington | ",
 "Upcoming Feb 22, 6:00 PM Men's · Northern Arizona vs Portland State | ",
 "Upcoming Feb 27, 6:30 PM Men's · Northern Arizona at Southern Utah | ",
 "Upcoming Mar 1, 6:00 PM Men's · Northern Arizona at Northern Colorado | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 6:30 PM Women's · Northern Arizona at Arizona State | ",
 "Upcoming Nov 10, 6:00 PM Women's · Northern Arizona vs UC Irvine | ",
 "Upcoming Nov 14, 1:00 PM Women's · Northern Arizona at Fresno State | ",
 "Upcoming Nov 18, 6:00 PM Women's · Northern Arizona vs Bethesda (Calif.) | ",
 "Upcoming Nov 23, 6:00 PM Women's · Northern Arizona at USC | ",
 "Upcoming Nov 28, 6:00 PM Women's · Northern Arizona vs UC San Diego | ",
 "Upcoming Dec 3, 6:00 PM Women's · Northern Arizona at Montana | ",
 "Upcoming Dec 5, 2:00 PM Women's · Northern Arizona at Montana State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Northern Arizona at Arizona | ",
 "Upcoming Dec 16, 6:00 PM Women's · Northern Arizona vs Park (Ariz.) | ",
 "Upcoming Dec 19, 2:00 PM Women's · Northern Arizona vs Grand Canyon | ",
 "Upcoming Dec 21, 2:00 PM Women's · Northern Arizona at Long Beach State | ",
 "Upcoming Dec 31, 1:00 PM Women's · Northern Arizona vs Weber State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Northern Arizona vs Idaho State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Northern Arizona vs Eastern Washington | ",
 "Upcoming Jan 9, 2:00 PM Women's · Northern Arizona vs Idaho | ",
 "Upcoming Jan 14, 6:00 PM Women's · Northern Arizona at Utah Tech | ",
 "Upcoming Jan 21, 2:00 PM Women's · Northern Arizona vs Portland State | ",
 "Upcoming Jan 23, 6:00 PM Women's · Northern Arizona at Northern Colorado | ",
 "Upcoming Jan 28, 6:00 PM Women's · Northern Arizona vs Montana State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Northern Arizona vs Montana | ",
 "Upcoming Feb 4, 6:00 PM Women's · Northern Arizona at Idaho State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Northern Arizona at Weber State | ",
 "Upcoming Feb 8, 6:00 PM Women's · Northern Arizona at Southern Utah | ",
 "Upcoming Feb 11, 6:00 PM Women's · Northern Arizona vs Utah Tech | ",
 "Upcoming Feb 18, 6:00 PM Women's · Northern Arizona at Idaho | ",
 "Upcoming Feb 20, 2:00 PM Women's · Northern Arizona at Eastern Washington | ",
 "Upcoming Feb 22, 6:00 PM Women's · Northern Arizona at Portland State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Northern Arizona vs Southern Utah | ",
 "Upcoming Mar 1, 2:00 PM Women's · Northern Arizona vs Northern Colorado | ",
 "Upcoming Mar 5 Women's · Northern Arizona at Big Sky Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 2 Northern Arizona at George Kyte Classic | Women's team: 1st / Men's team: 1st",
 "Final Sep 19 Northern Arizona at John McNichols Invitational | Women's team: 1st / Men's team: 7th",
 "Final Oct 9 Northern Arizona at Nuttycombe Invitational | Women's team: 3rd / Men's team: 13th",
 "Upcoming Oct 30 Northern Arizona at Big Sky Cross Country Championships | ",
 "Upcoming Nov 13 Northern Arizona at NCAA Division I Cross Country Mountain Regionals | ",
 "Upcoming Nov 21 Northern Arizona at NCAA Division I Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Northern Arizona vs Eastern Washington | W, 34-27",
 "Final Sep 5 Northern Arizona at Arizona | L, 7-35",
 "Final Sep 12 Northern Arizona vs UIW | W, 38-28",
 "Final Sep 19 Northern Arizona at Utah Tech | W, 35-23",
 "Final Sep 26 Northern Arizona at Montana State | L, 14-28",
 "Final Oct 3 Northern Arizona at Idaho State | W, 38-31",
 "Final Oct 10 Northern Arizona vs Montana | W, 49-44",
 "Final Oct 17 Northern Arizona vs Portland State | W, 38-25",
 "Upcoming Oct 31, 12:00 PM Northern Arizona at Southern Utah | ",
 "Upcoming Nov 7, 3:00 PM Northern Arizona at Cal Poly | ",
 "Upcoming Nov 14, 2:00 PM Northern Arizona vs Weber State | ",
 "Upcoming Nov 21, 2:00 PM Northern Arizona vs Northern Colorado | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Northern Arizona at Branch Law Firm/Dick McGuire Invitational | Completed",
 "Final Sep 21 Northern Arizona at Golfweek Red Sky Classic | Completed",
 "Final Oct 12 Northern Arizona at NMSU Golf Iconic Classic | Completed",
 "Upcoming Oct 25, 12:00 PM Northern Arizona at The Clash at Boulder Creek | ",
 "Upcoming Feb 13 Northern Arizona at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Mar 2 Northern Arizona at Grand Canyon Invitational | ",
 "Upcoming Mar 12 Northern Arizona at Red Rocks Invitational | ",
 "Upcoming Mar 25 Northern Arizona at PING ASU Invitational | ",
 "Upcoming Apr 6 Northern Arizona at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 19 Northern Arizona at Big Sky Conference Championship | ",
 "Upcoming May 10 Northern Arizona at NCAA Regional | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 9 Northern Arizona vs Embry-Riddle (Ariz.) | W, 3-0",
 "Final Aug 12 Northern Arizona at UC Riverside | W, 2-0",
 "Final Aug 20 Northern Arizona at New Mexico | L, 0-2",
 "Final Aug 23 Northern Arizona vs UC San Diego | T, 0-0",
 "Final Aug 30 Northern Arizona vs UTEP | L, 0-1",
 "Final Sep 3 Northern Arizona at Nevada | W, 3-0",
 "Final Sep 6 Northern Arizona at Saint Mary's | L, 0-1",
 "Final Sep 10 Northern Arizona at Arizona | L, 0-3",
 "Final Sep 13 Northern Arizona vs Grambling State | W, 1-0",
 "Final Sep 17 Northern Arizona at Grand Canyon | T, 1-1",
 "Final Sep 20 Northern Arizona at New Mexico State | W, 2-0",
 "Final Oct 8 Northern Arizona vs Eastern Washington | W, 1-0",
 "Final Oct 11 Northern Arizona vs Idaho | W, 3-0",
 "Final Oct 15 Northern Arizona at Southern Utah | T, 1-1",
 "Final Oct 18 Northern Arizona at Utah Tech | W, 2-0",
 "Upcoming Oct 22, 7:00 PM Northern Arizona vs Montana | ",
 "Upcoming Oct 25, 12:00 PM Northern Arizona vs Portland State | ",
 "Upcoming Oct 29, 6:00 PM Northern Arizona at Idaho State | ",
 "Upcoming Nov 1, 1:00 PM Northern Arizona at Weber State | ",
 "Upcoming Nov 5, 1:00 PM Northern Arizona at Northern Colorado | ",
 "Upcoming Nov 11 Northern Arizona at Big Sky Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Northern Arizona vs Arizona State | L, 99-201",
 "Upcoming Oct 30, 3:30 PM Women's · Northern Arizona vs Washington State | ",
 "Upcoming Oct 31, 10:00 AM Women's · Northern Arizona vs Idaho | ",
 "Upcoming Nov 6, 4:00 PM Women's · Northern Arizona at Northern Colorado | ",
 "Upcoming Nov 7, 11:30 AM Women's · Northern Arizona at Colorado State | ",
 "Upcoming Nov 18 Women's · Northern Arizona at Colorado Mesa Invite | ",
 "Upcoming Nov 19 Women's · Northern Arizona at Lumberjack Diving Invite | ",
 "Upcoming Dec 5, 11:00 AM Women's · Northern Arizona vs Utah Tech | ",
 "Upcoming Dec 8 Women's · Northern Arizona at USA Diving Senior National Championships | ",
 "Upcoming Jan 7 Women's · Northern Arizona at Arizona | ",
 "Upcoming Jan 9, 11:30 AM Women's · Northern Arizona at New Mexico State | ",
 "Upcoming Jan 22, 4:30 PM Women's · Northern Arizona at Utah Tech | ",
 "Upcoming Jan 28 Women's · Northern Arizona at Lumberjack Diving Invite #2 | ",
 "Upcoming Jan 30, 11:00 AM Women's · Northern Arizona vs New Mexico | ",
 "Upcoming Feb 15 Women's · Northern Arizona at MPSF Conference Championship (Diving) | ",
 "Upcoming Feb 17 Women's · Northern Arizona at MPSF Conference Championship (Swimming) | ",
 "Upcoming Mar 8 Women's · Northern Arizona at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 17 Women's · Northern Arizona at NCAA Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Northern Arizona at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Northern Arizona at Lumberjack Classic | Completed",
 "Final Oct 2 Women's · Northern Arizona at Big Sky Individual Championships | Completed",
 "Final Oct 13 Women's · Northern Arizona at ITA Regional Championships | Completed",
 "Upcoming Oct 30 Women's · Northern Arizona at ASU Thunderbird Invite | ",
 "Upcoming Nov 5 Women's · Northern Arizona at ITA Masters Championships | ",
 "Upcoming Nov 5 Women's · Northern Arizona at ITA Sectional Championships | ",
 "Upcoming Nov 13 Women's · Northern Arizona at Wildcat Invite | ",
 "Upcoming Nov 17 Women's · Northern Arizona at NCAA Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Northern Arizona at Wildcat Invite | Completed",
 "Final Sep 19 Men's · Northern Arizona at ITA All-Americans | Completed",
 "Final Oct 6 Men's · Northern Arizona at ITA Regional Championships | Completed",
 "Upcoming Nov 5 Men's · Northern Arizona at ITA Masters Championships | ",
 "Upcoming Nov 5 Men's · Northern Arizona at ITA Sectional Championships | ",
 "Upcoming Nov 6 Men's · Northern Arizona at GCU Hidden Duals | ",
 "Upcoming Nov 17 Men's · Northern Arizona at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Northern Arizona vs LMU | L, 0-3",
 "Final Aug 29 Northern Arizona at Ole Miss | L, 1-3",
 "Final Aug 30 Northern Arizona vs Southeastern Louisiana | W, 3-1",
 "Final Sep 4 Northern Arizona vs Bradley | W, 3-2",
 "Final Sep 4 Northern Arizona at South Dakota State | L, 1-3",
 "Final Sep 5 Northern Arizona vs Western Illinois | W, 3-2",
 "Final Sep 9 Northern Arizona vs UC Riverside | W, 3-0",
 "Final Sep 10 Northern Arizona vs Omaha | W, 3-1",
 "Final Sep 11 Northern Arizona vs Grand Canyon | L, 2-3",
 "Final Sep 17 Northern Arizona vs California Baptist | W, 3-1",
 "Final Sep 18 Northern Arizona at San Francisco | L, 0-3",
 "Final Sep 19 Northern Arizona vs Texas Southern | W, 3-0",
 "Final Sep 24 Northern Arizona vs Southern Utah | W, 3-0",
 "Final Sep 26 Northern Arizona vs Utah Tech | L, 2-3",
 "Final Oct 1 Northern Arizona at Idaho State | L, 0-3",
 "Final Oct 3 Northern Arizona at Weber State | W, 3-0",
 "Final Oct 8 Northern Arizona vs Montana State | W, 3-1",
 "Final Oct 10 Northern Arizona vs Montana | W, 3-0",
 "Final Oct 15 Northern Arizona at Eastern Washington | W, 3-2",
 "Final Oct 17 Northern Arizona at Idaho | W, 3-1",
 "Final Oct 20 Northern Arizona vs Portland State | L, 2-3",
 "Upcoming Oct 22, 5:00 PM Northern Arizona at Northern Colorado | ",
 "Upcoming Oct 29, 6:30 PM Northern Arizona vs Idaho | ",
 "Upcoming Oct 31, 1:00 PM Northern Arizona vs Eastern Washington | ",
 "Upcoming Nov 5, 7:00 PM Northern Arizona at Montana | ",
 "Upcoming Nov 7, 7:00 PM Northern Arizona at Montana State | ",
 "Upcoming Nov 12, 6:30 PM Northern Arizona vs Weber State | ",
 "Upcoming Nov 14, 11:00 AM Northern Arizona vs Idaho State | ",
 "Upcoming Nov 18, 6:00 PM Northern Arizona at Utah Tech | ",
 "Upcoming Nov 20, 6:30 PM Northern Arizona at Southern Utah | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf places from final stories: "Strong Final Round Lifts Lumberjacks to
// Seventh" (McGuire Invitational, Sep 15; the story's "a tie for seventh" is
// after the first round) and "The Lumberjacks' three-day total ... placed
// them 12th" after a dateline with its day ("VAIL, Colo. (September 23,
// 2026) -", Red Sky Classic).
{
  const team="(?:Lumberjacks|Northern Arizona|NAU|(?:Men's|Women's) Golf)",decode=value=>worker.decodeHtml(value);
  assert.deepEqual(['recap-2026-9-15-womens-golf-strong-final-round-lifts-lum.html.gz','recap-2026-9-23-nau-golf-fires-11-under-in-final-round-o.html.gz'].map(name=>golfStoryPlace(fixture(name),{team,decode})),['7th','12th']);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Northern Arizona module checks passed");
