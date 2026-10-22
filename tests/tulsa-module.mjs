import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tulsaSchool} from '../src/schools/tulsa.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tulsa');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tulsaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tulsa-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tulsahurricane.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tulsa'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',tulsaSchool.scheduleUrls],['roster',tulsaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tulsa|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tulsahurricane.com',`${key} must stay on tulsahurricane.com`);
  }
}
const parity={"Basketball":{"schedule":["https://tulsahurricane.com/sports/mens-basketball/schedule","https://tulsahurricane.com/sports/womens-basketball/schedule"],"roster":["https://tulsahurricane.com/sports/mens-basketball/roster","https://tulsahurricane.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://tulsahurricane.com/sports/cross-country/schedule"],"roster":["https://tulsahurricane.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://tulsahurricane.com/sports/football/schedule"],"roster":["https://tulsahurricane.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tulsahurricane.com/sports/womens-golf/schedule","https://tulsahurricane.com/sports/mens-golf/schedule"],"roster":["https://tulsahurricane.com/sports/womens-golf/roster","https://tulsahurricane.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://tulsahurricane.com/sports/rowing/schedule"],"roster":["https://tulsahurricane.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://tulsahurricane.com/sports/womens-soccer/schedule","https://tulsahurricane.com/sports/mens-soccer/schedule"],"roster":["https://tulsahurricane.com/sports/womens-soccer/roster","https://tulsahurricane.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://tulsahurricane.com/sports/softball/schedule"],"roster":["https://tulsahurricane.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://tulsahurricane.com/sports/womens-tennis/schedule","https://tulsahurricane.com/sports/mens-tennis/schedule"],"roster":["https://tulsahurricane.com/sports/womens-tennis/roster","https://tulsahurricane.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://tulsahurricane.com/sports/track-and-field/schedule"],"roster":["https://tulsahurricane.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://tulsahurricane.com/sports/womens-volleyball/schedule"],"roster":["https://tulsahurricane.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tulsa|"+sport+"':"),`${sport} routes must live in the Tulsa module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://tulsahurricane.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tulsaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=tulsa)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 2:30 PM Men's · Tulsa at Oklahoma State (Exhibition) | ",
 "Upcoming Nov 2 Men's · Tulsa vs Ottawa (Kan.) | ",
 "Upcoming Nov 5 Men's · Tulsa vs Northern Illinois | ",
 "Upcoming Nov 11 Men's · Tulsa vs Oral Roberts | ",
 "Upcoming Nov 16 Men's · Tulsa vs Western Kentucky | ",
 "Upcoming Nov 20, 6:30 PM Men's · Tulsa vs Mississippi State | ",
 "Upcoming Nov 23, 1:00 PM Men's · Tulsa vs Oregon State | ",
 "Upcoming Nov 24, 3:30 PM Men's · Tulsa vs Illinois State | ",
 "Upcoming Nov 29 Men's · Tulsa vs IU Indy | ",
 "Upcoming Dec 2 Men's · Tulsa vs Haskell Indian Nations | ",
 "Upcoming Dec 6 Men's · Tulsa at Missouri State | ",
 "Upcoming Dec 12 Men's · Tulsa vs Florida A&M | ",
 "Upcoming Dec 15 Men's · Tulsa vs Jackson State | ",
 "Upcoming Dec 19, 7:30 PM Men's · Tulsa vs Utah State | ",
 "Upcoming Dec 21, 3:00 PM Men's · Tulsa vs San Francisco | ",
 "Upcoming Dec 30 Men's · Tulsa vs South Florida | ",
 "Upcoming Jan 3 Men's · Tulsa vs Florida Atlantic | ",
 "Upcoming Jan 7 Men's · Tulsa at UTSA | ",
 "Upcoming Jan 14 Men's · Tulsa vs East Carolina | ",
 "Upcoming Jan 17 Men's · Tulsa at South Florida | ",
 "Upcoming Jan 20 Men's · Tulsa at Florida Atlantic | ",
 "Upcoming Jan 23 Men's · Tulsa vs Wichita State | ",
 "Upcoming Jan 28 Men's · Tulsa at Temple | ",
 "Upcoming Jan 31 Men's · Tulsa at North Texas | ",
 "Upcoming Feb 4 Men's · Tulsa vs UAB | ",
 "Upcoming Feb 7 Men's · Tulsa vs Tulane | ",
 "Upcoming Feb 11 Men's · Tulsa at Rice | ",
 "Upcoming Feb 14 Men's · Tulsa vs North Texas | ",
 "Upcoming Feb 21 Men's · Tulsa vs UTSA | ",
 "Upcoming Feb 25 Men's · Tulsa at Memphis | ",
 "Upcoming Feb 28 Men's · Tulsa at UAB | ",
 "Upcoming Mar 3 Men's · Tulsa vs Charlotte | ",
 "Upcoming Mar 6 Men's · Tulsa at Wichita State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · Tulsa vs Incarnate Word | ",
 "Upcoming Nov 7, 2:00 PM Women's · Tulsa vs Rogers State | ",
 "Upcoming Nov 12, 5:00 PM Women's · Tulsa vs Oklahoma State | ",
 "Upcoming Nov 15, 3:30 PM Women's · Tulsa vs Texas Southern | ",
 "Upcoming Nov 18, 6:30 PM Women's · Tulsa vs LSU New Orleans | ",
 "Upcoming Nov 22 Women's · Tulsa vs Stephen F. Austin | ",
 "Upcoming Nov 27 Women's · Tulsa vs Central Michigan | ",
 "Upcoming Nov 28 Women's · Tulsa vs Bowling Green | ",
 "Upcoming Dec 2, 11:00 AM Women's · Tulsa vs Oklahoma Baptist | ",
 "Upcoming Dec 5, 2:00 PM Women's · Tulsa vs Oral Roberts | ",
 "Upcoming Dec 9, 6:30 PM Women's · Tulsa vs SMU | ",
 "Upcoming Dec 13, 2:00 PM Women's · Tulsa vs UT Martin | ",
 "Upcoming Dec 20, 5:30 PM Women's · Tulsa vs Middle Tennessee | ",
 "Upcoming Dec 21, 3:00 PM Women's · Tulsa vs Auburn | ",
 "Upcoming Dec 31 Women's · Tulsa vs Memphis | ",
 "Upcoming Jan 3 Women's · Tulsa vs East Carolina | ",
 "Upcoming Jan 6 Women's · Tulsa at South Florida | ",
 "Upcoming Jan 9 Women's · Tulsa at Florida Atlantic | ",
 "Upcoming Jan 13 Women's · Tulsa vs UTSA | ",
 "Upcoming Jan 20 Women's · Tulsa vs Charlotte | ",
 "Upcoming Jan 24 Women's · Tulsa at Rice | ",
 "Upcoming Jan 27 Women's · Tulsa at North Texas | ",
 "Upcoming Jan 30 Women's · Tulsa vs South Florida | ",
 "Upcoming Feb 3 Women's · Tulsa at UTSA | ",
 "Upcoming Feb 6 Women's · Tulsa vs Wichita State | ",
 "Upcoming Feb 10 Women's · Tulsa at Temple | ",
 "Upcoming Feb 13 Women's · Tulsa vs Rice | ",
 "Upcoming Feb 17 Women's · Tulsa at UAB | ",
 "Upcoming Feb 20 Women's · Tulsa at Memphis | ",
 "Upcoming Feb 24 Women's · Tulsa vs Tulane | ",
 "Upcoming Mar 3 Women's · Tulsa at Wichita State | ",
 "Upcoming Mar 6 Women's · Tulsa vs North Texas | ",
 "Upcoming Mar 9 Women's · Tulsa at American Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Tulsa at Cowboy Preview | Women's team: 3rd / Men's team: 3rd",
 "Final Sep 26 Tulsa at Cowboy Jamboree | Men's team: 5th of 20",
 "Final Oct 3 Tulsa at Chile Pepper Festival | Women's team: 3rd of 28",
 "Final Oct 9 Tulsa at Nuttycombe Invitational | Men's team: 20th of 35",
 "Final Oct 16 Tulsa at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31 Tulsa at American Conference Championships | ",
 "Upcoming Nov 13 Tulsa at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Tulsa at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Tulsa vs Oklahoma State | W, 24-10",
 "Final Sep 12 Tulsa at Sam Houston | W, 23-17",
 "Final Sep 19 Tulsa vs East Texas A&M | W, 42-0",
 "Final Sep 26 Tulsa at Arkansas | L, 6-34",
 "Final Oct 1 Tulsa vs North Texas | L, 44-45",
 "Final Oct 10 Tulsa at Navy | L, 26-34",
 "Final Oct 17 Tulsa at Rice | W, 38-17",
 "Upcoming Oct 23, 7:30 PM Tulsa vs Army | ",
 "Upcoming Nov 7 Tulsa at Tulane | ",
 "Upcoming Nov 14 Tulsa vs Florida Atlantic | ",
 "Upcoming Nov 21 Tulsa vs Charlotte | ",
 "Upcoming Nov 27 Tulsa at UTSA | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Tulsa at Leadership & Golf Invitational | 3rd",
 "Final Sep 19 Women's · Tulsa at Schooner Fall Classic | 10th",
 "Final Oct 5 Women's · Tulsa at Windy City Collegiate Classic | T11th",
 "Final Oct 19 Women's · Tulsa at Route 66 Invitational Honoring Dale McNamara | 2nd"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Tulsa at CSU Rams Masters | T6th",
 "Final Sep 14 Men's · Tulsa at Vuori Invitational | T9th",
 "Final Oct 4 Men's · Tulsa at Trinity Forest Invitational | 16th",
 "Final Oct 19 Men's · Tulsa at Abilene Christian Intercollegiate | 6th"
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 24 Tulsa vs Central Oklahoma | ",
 "Upcoming Mar 26 Tulsa at Sarasota 2K | ",
 "Upcoming Apr 3 Tulsa vs Creighton | ",
 "Upcoming Apr 23 Tulsa at Lake Wheeler Invitational | ",
 "Upcoming May 1 Tulsa at vs. Kansas, Iowa, Minnesota and Kansas State | ",
 "Upcoming May 16 Tulsa at Big 12 Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 Women's · Tulsa at Oklahoma State (Exhibition) | L, 1-2",
 "Final Aug 16 Women's · Tulsa vs Central Arkansas | W, 2-1",
 "Final Aug 20 Women's · Tulsa at Stephen F. Austin | W, 4-1",
 "Final Aug 23 Women's · Tulsa vs Little Rock | W, 2-0",
 "Final Aug 27 Women's · Tulsa at Oklahoma | L, 1-4",
 "Final Aug 30 Women's · Tulsa at Kansas | L, 1-2",
 "Final Sep 3 Women's · Tulsa vs Abilene Christian | W, 2-0",
 "Final Sep 6 Women's · Tulsa vs East Texas A&M | T, 1-1",
 "Final Sep 10 Women's · Tulsa at Oral Roberts | L, 0-2",
 "Final Sep 17 Women's · Tulsa vs East Carolina | T, 1-1",
 "Final Sep 20 Women's · Tulsa vs Arkansas - Pine Bluff | W, 13-0",
 "Final Sep 27 Women's · Tulsa at Rice | W, 3-0",
 "Final Oct 2 Women's · Tulsa vs Charlotte | L, 1-3",
 "Final Oct 8 Women's · Tulsa at Memphis | L, 0-4",
 "Final Oct 11 Women's · Tulsa vs Florida Atlantic | L, 0-3",
 "Final Oct 15 Women's · Tulsa at UTSA | T, 1-1",
 "Today Oct 22, 7:00 PM Women's · Tulsa at UAB | ",
 "Upcoming Oct 25, 1:00 PM Women's · Tulsa vs South Florida | ",
 "Upcoming Oct 30, 6:00 PM Women's · Tulsa at Temple | ",
 "Upcoming Nov 3, 7:00 PM Women's · Tulsa vs North Texas | ",
 "Upcoming Nov 9 Women's · Tulsa at American Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 6 Men's · Tulsa vs Barton College (Exhibition) | W, 4-1",
 "Final Aug 9 Men's · Tulsa vs Richland (Exhibition) | W, 8-0",
 "Final Aug 20 Men's · Tulsa vs UIC | W, 1-0",
 "Final Aug 23 Men's · Tulsa vs UC Riverside | T, 1-1",
 "Final Aug 28 Men's · Tulsa vs Incarnate Word | W, 2-1",
 "Final Aug 31 Men's · Tulsa vs Creighton | L, 0-5",
 "Final Sep 4 Men's · Tulsa at Denver | L, 0-3",
 "Final Sep 11 Men's · Tulsa vs Temple | W, 4-1",
 "Final Sep 15 Men's · Tulsa at Lindenwood | T, 0-0",
 "Final Sep 20 Men's · Tulsa at South Florida | T, 0-0",
 "Final Sep 26 Men's · Tulsa vs Florida Atlantic | L, 3-4",
 "Final Oct 2 Men's · Tulsa at UAB | T, 1-1",
 "Final Oct 7 Men's · Tulsa at Kansas City | L, 1-3",
 "Final Oct 11 Men's · Tulsa at Missouri State | W, 2-1",
 "Final Oct 17 Men's · Tulsa vs NIU | W, 1-0",
 "Today Oct 22, 7:00 PM Men's · Tulsa vs Charlotte | ",
 "Upcoming Oct 28, 6:00 PM Men's · Tulsa at FIU | ",
 "Upcoming Nov 1, 6:00 PM Men's · Tulsa vs Memphis | ",
 "Upcoming Nov 6 Men's · Tulsa at American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Tulsa at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Tulsa at Hurricane Invite | Completed",
 "Final Oct 15 Women's · Tulsa at ITA Central Regional Championships | Completed",
 "Today Oct 22 Women's · Tulsa at American Individual Championships | ",
 "Upcoming Nov 5 Women's · Tulsa at ITA Central Sectional Championship | ",
 "Upcoming Nov 6 Women's · Tulsa at Tulsa Invite | ",
 "Upcoming Nov 17 Women's · Tulsa at NCAA | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · Tulsa at UTR Hotel Planner Shootout | Completed",
 "Final Sep 19 Men's · Tulsa at ITA All-American Championships | Completed",
 "Final Oct 7 Men's · Tulsa at ITA Central Regional Championship | Completed",
 "Today Oct 22 Men's · Tulsa at American Individual Championships | ",
 "Upcoming Oct 30 Men's · Tulsa at SMU Invite | ",
 "Upcoming Nov 5 Men's · Tulsa at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Tulsa at ITA Central Sectional Championship | ",
 "Upcoming Nov 17 Men's · Tulsa at NCAA Individual Championships | ",
 "Upcoming Dec 5 Men's · Tulsa at Tulsa UTR College Circuit | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Tulsa at New Mexico State | W, 3-1",
 "Final Aug 29 Tulsa vs UTEP | W, 3-2",
 "Final Aug 30 Tulsa vs New Mexico | W, 3-1",
 "Final Sep 4 Tulsa vs Pepperdine | W, 3-1",
 "Final Sep 5 Tulsa vs Arizona | W, 3-0",
 "Final Sep 6 Tulsa at Creighton | W, 3-2",
 "Final Sep 8 Tulsa at Oral Roberts | W, 3-0",
 "Final Sep 12 Tulsa vs South Dakota State | W, 3-2",
 "Final Sep 13 Tulsa at Kansas | L, 0-3",
 "Final Sep 18 Tulsa vs LSU | L, 2-3",
 "Final Sep 19 Tulsa at Miami | L, 0-3",
 "Final Sep 25 Tulsa vs South Florida | W, 3-0",
 "Final Sep 27 Tulsa vs Memphis | W, 3-1",
 "Final Oct 2 Tulsa at Wichita State | W, 3-1",
 "Final Oct 4 Tulsa at UAB | W, 3-0",
 "Final Oct 9 Tulsa vs UTSA | W, 3-0",
 "Final Oct 11 Tulsa vs Wichita State | W, 3-2",
 "Final Oct 16 Tulsa vs Rice | L, 1-3",
 "Final Oct 18 Tulsa at North Texas | L, 1-3",
 "Upcoming Oct 23, 6:30 PM Tulsa at Tulane | ",
 "Upcoming Oct 25, 1:00 PM Tulsa at Rice | ",
 "Upcoming Oct 30, 6:00 PM Tulsa vs Florida Atlantic | ",
 "Upcoming Nov 1, 1:00 PM Tulsa vs North Texas | ",
 "Upcoming Nov 6, 5:00 PM Tulsa at Charlotte | ",
 "Upcoming Nov 8, 11:00 AM Tulsa at East Carolina | ",
 "Upcoming Nov 13, 5:00 PM Tulsa at Memphis | ",
 "Upcoming Nov 15, 12:00 PM Tulsa vs Temple | ",
 "Upcoming Nov 20 Tulsa at American Championship | ",
 "Upcoming Dec 3 Tulsa at NCAA Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Tulsa module checks passed");
