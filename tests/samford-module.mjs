import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {samfordSchool} from '../src/schools/samford.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='samford');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,samfordHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/samford-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit samfordsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['samford'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',samfordSchool.scheduleUrls],['roster',samfordSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('samford|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'samfordsports.com',`${key} must stay on samfordsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://samfordsports.com/sports/baseball/schedule"],"roster":["https://samfordsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://samfordsports.com/sports/mens-basketball/schedule","https://samfordsports.com/sports/womens-basketball/schedule"],"roster":["https://samfordsports.com/sports/mens-basketball/roster","https://samfordsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://samfordsports.com/sports/cross-country/schedule"],"roster":["https://samfordsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://samfordsports.com/sports/football/schedule"],"roster":["https://samfordsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://samfordsports.com/sports/womens-golf/schedule","https://samfordsports.com/sports/mens-golf/schedule"],"roster":["https://samfordsports.com/sports/womens-golf/roster","https://samfordsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://samfordsports.com/sports/womens-soccer/schedule"],"roster":["https://samfordsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://samfordsports.com/sports/softball/schedule"],"roster":["https://samfordsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://samfordsports.com/sports/womens-tennis/schedule","https://samfordsports.com/sports/mens-tennis/schedule"],"roster":["https://samfordsports.com/sports/womens-tennis/roster","https://samfordsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://samfordsports.com/sports/track-and-field/schedule"],"roster":["https://samfordsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://samfordsports.com/sports/womens-volleyball/schedule"],"roster":["https://samfordsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'samford|"+sport+"':"),`${sport} routes must live in the Samford module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://samfordsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.samfordHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=samford)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 31 Samford vs LSU (Exhibition) | ",
 "Upcoming Nov 1 Samford vs LSU (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · Samford vs Alabama A&M (Exhibition) | W, 71-61",
 "Upcoming Oct 26, 6:00 PM Men's · Samford at Jacksonville State (Exhibition) | ",
 "Upcoming Oct 29, 7:00 PM Men's · Samford at Auburn (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Samford vs Berry | ",
 "Upcoming Nov 7, 3:00 PM Men's · Samford at UNLV | ",
 "Upcoming Nov 13, 7:00 PM Men's · Samford vs Wright State | ",
 "Upcoming Nov 18, 5:30 PM Men's · Samford at USC Upstate | ",
 "Upcoming Nov 22, 4:00 PM Men's · Samford vs UNC Asheville | ",
 "Upcoming Nov 24, 6:00 PM Men's · Samford at Georgia Tech | ",
 "Upcoming Nov 29, 4:00 PM Men's · Samford vs Point | ",
 "Upcoming Dec 2 Men's · Samford at UAB | ",
 "Upcoming Dec 5, 4:00 PM Men's · Samford at Tennessee Tech | ",
 "Upcoming Dec 12 Men's · Samford at Presbyterian | ",
 "Upcoming Dec 15, 11:00 AM Men's · Samford vs Bryan | ",
 "Upcoming Dec 19, 4:00 PM Men's · Samford vs Wofford | ",
 "Upcoming Dec 22, 6:00 PM Men's · Samford at Chattanooga | ",
 "Upcoming Dec 29 Men's · Samford at Alabama | ",
 "Upcoming Dec 30, 6:30 PM Men's · Samford vs Covenant | ",
 "Upcoming Jan 2, 4:00 PM Men's · Samford vs ETSU | ",
 "Upcoming Jan 6 Men's · Samford at Furman | ",
 "Upcoming Jan 9, 4:00 PM Men's · Samford vs The Citadel | ",
 "Upcoming Jan 11, 6:00 PM Men's · Samford at Mercer | ",
 "Upcoming Jan 16, 12:00 PM Men's · Samford at Western Carolina | ",
 "Upcoming Jan 18, 6:30 PM Men's · Samford vs VMI | ",
 "Upcoming Jan 21, 6:30 PM Men's · Samford vs UNCG | ",
 "Upcoming Jan 23 Men's · Samford at The Citadel | ",
 "Upcoming Jan 30 Men's · Samford at Wofford | ",
 "Upcoming Feb 3, 6:30 PM Men's · Samford vs Furman | ",
 "Upcoming Feb 7, 3:00 PM Men's · Samford vs Western Carolina | ",
 "Upcoming Feb 11 Men's · Samford at UNCG | ",
 "Upcoming Feb 13 Men's · Samford at VMI | ",
 "Upcoming Feb 17, 5:00 PM Men's · Samford vs Chattanooga | ",
 "Upcoming Feb 20, 6:30 PM Men's · Samford vs Tennessee Tech | ",
 "Upcoming Feb 24, 6:30 PM Men's · Samford vs Mercer | ",
 "Upcoming Feb 27, 9:00 AM Men's · Samford at ETSU | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 4:00 PM Women's · Samford vs Montevallo | ",
 "Upcoming Nov 5, 6:00 PM Women's · Samford at Georgia Tech | ",
 "Upcoming Nov 9, 11:00 AM Women's · Samford vs UNC Asheville | ",
 "Upcoming Nov 13, 6:00 PM Women's · Samford at Indiana | ",
 "Upcoming Nov 15, 11:00 AM Women's · Samford at Purdue | ",
 "Upcoming Nov 19, 6:00 PM Women's · Samford vs Bryan | ",
 "Upcoming Nov 22, 1:00 PM Women's · Samford vs Abilene Christian | ",
 "Upcoming Nov 25, 6:00 PM Women's · Samford at Alabama | ",
 "Upcoming Nov 29, 1:00 PM Women's · Samford at West Georgia | ",
 "Upcoming Dec 2, 6:00 PM Women's · Samford vs Stillman | ",
 "Upcoming Dec 5, 1:00 PM Women's · Samford at USC Upstate | ",
 "Upcoming Dec 14, 6:00 PM Women's · Samford at Lipscomb | ",
 "Upcoming Dec 16, 6:30 PM Women's · Samford at Mississippi State | ",
 "Upcoming Dec 20, 12:00 PM Women's · Samford vs UT Martin | ",
 "Upcoming Dec 29, 5:00 PM Women's · Samford at Chattanooga | ",
 "Upcoming Jan 2, 1:00 PM Women's · Samford vs UNCG | ",
 "Upcoming Jan 5, 4:00 PM Women's · Samford vs Mercer | ",
 "Upcoming Jan 9, 12:30 PM Women's · Samford at ETSU | ",
 "Upcoming Jan 12, 6:00 PM Women's · Samford vs Western Carolina | ",
 "Upcoming Jan 16, 1:00 PM Women's · Samford at Wofford | ",
 "Upcoming Jan 19, 12:00 PM Women's · Samford vs Chattanooga | ",
 "Upcoming Jan 26, 6:00 PM Women's · Samford at Mercer | ",
 "Upcoming Jan 30, 2:00 PM Women's · Samford vs Furman | ",
 "Upcoming Feb 2, 6:30 PM Women's · Samford at Tennessee Tech | ",
 "Upcoming Feb 6, 1:00 PM Women's · Samford vs ETSU | ",
 "Upcoming Feb 9, 5:00 PM Women's · Samford at Western Carolina | ",
 "Upcoming Feb 13, 4:00 PM Women's · Samford vs Wofford | ",
 "Upcoming Feb 20, 1:00 PM Women's · Samford at UNCG | ",
 "Upcoming Feb 23, 5:00 PM Women's · Samford vs Tennessee Tech | ",
 "Upcoming Feb 27, 12:00 PM Women's · Samford at Furman | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Samford at Foothills Invitational | Women's team: 4th / Men's team: 3rd",
 "Final Sep 18 Samford at Southern Showcase | Women's team: 16th / Men's team: 25th",
 "Final Oct 16 Samford at Crimson Classic | Women's team: 11th / Men's team: 13th",
 "Upcoming Oct 31 Samford at Southern Conference Championships | ",
 "Upcoming Nov 13 Samford at NCAA South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Samford vs North Alabama | L, 10-22",
 "Final Sep 3 Samford vs Southern Illinois | L, 18-22",
 "Final Sep 12 Samford at Tennessee Tech | L, 19-45",
 "Final Sep 26 Samford vs VMI | W, 45-7",
 "Final Oct 3 Samford at UAB | L, 14-33",
 "Final Oct 10 Samford at Chattanooga | L, 3-19",
 "Final Oct 17 Samford vs Mercer | L, 21-31",
 "Today Oct 24, 1:00 PM Samford at Furman | ",
 "Upcoming Oct 31, 6:00 PM Samford vs Wofford | ",
 "Upcoming Nov 7, 12:00 PM Samford at ETSU | ",
 "Upcoming Nov 14, 2:30 PM Samford vs Western Carolina | ",
 "Upcoming Nov 21, 2:30 PM Samford at Auburn | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Samford at Tulane Classic | 2nd of 12",
 "Final Sep 18 Women's · Samford at Lady Paladin Invitational | 11th of 12",
 "Final Oct 12 Women's · Samford at Lady Redwolves Classic | 9th of 13",
 "Upcoming Oct 26 Women's · Samford at The Judson | ",
 "Upcoming Nov 1 Women's · Samford at Samford Intercollegiate | ",
 "Upcoming Feb 22 Women's · Samford at Longwood Invitational | ",
 "Upcoming Mar 1 Women's · Samford at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 15 Women's · Samford at Magnolia Intercollegiate | ",
 "Upcoming Mar 22 Women's · Samford at The Nashville Invitational | ",
 "Upcoming Mar 29 Women's · Samford at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 Women's · Samford at The Brickyard Collegiate | ",
 "Upcoming Apr 19 Women's · Samford at SoCon Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Samford at Grover Page Classic | 2nd of 10",
 "Final Sep 21 Men's · Samford at Bayou City Collegiate | 9th of 13",
 "Final Oct 12 Men's · Samford at The Scrappy at Pinetree | 5th of 11",
 "Final Oct 18 Men's · Samford at Furman Intercollegiate | 12th of 15",
 "Upcoming Feb 15 Men's · Samford at Wexford Intercollegiate | ",
 "Upcoming Mar 8 Men's · Samford at The Cleveland Palmetto | ",
 "Upcoming Mar 14 Men's · Samford at Cutter Creek Intercollegiate | ",
 "Upcoming Mar 29 Men's · Samford at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 5 Men's · Samford at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · Samford at Wofford Invitational | ",
 "Upcoming Apr 26 Men's · Samford at Southern Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Samford at Ole Miss (Exhibition) | W, 2-1",
 "Final Aug 7 Samford at Western Kentucky (Exhibition) | T, 1-1",
 "Final Aug 12 Samford at Notre Dame | T, 0-0",
 "Final Aug 16 Samford vs Belmont | W, 2-0",
 "Final Aug 20 Samford vs Georgia State | W, 1-0",
 "Final Aug 23 Samford at South Alabama | T, 1-1",
 "Final Aug 27 Samford vs Jacksonville State | W, 4-1",
 "Final Sep 3 Samford at Alabama | L, 0-1",
 "Final Sep 6 Samford vs Auburn | T, 0-0",
 "Final Sep 10 Samford vs UAB | L, 0-2",
 "Final Sep 20 Samford at Western Carolina | W, 2-1",
 "Final Sep 25 Samford vs Mercer | W, 2-0",
 "Final Oct 1 Samford vs Wofford | T, 1-1",
 "Final Oct 4 Samford at ETSU | W, 2-0",
 "Final Oct 9 Samford vs Furman | T, 1-1",
 "Final Oct 15 Samford at Chattanooga | W, 1-0",
 "Final Oct 18 Samford vs Tennessee Tech | W, 2-0",
 "Final Oct 23 Samford at The Citadel | W, 1-0",
 "Upcoming Oct 29, 6:00 PM Samford vs UNC Greensboro | ",
 "Upcoming Nov 1, 1:00 PM Samford at VMI | ",
 "Upcoming Nov 5 Samford at Southern Conference Tournament (First Round) | ",
 "Upcoming Nov 8 Samford at Southern Conference Tournament (Quarterfinals) | ",
 "Upcoming Nov 13 Samford at Southern Conference Tournament (Semifinals) | ",
 "Upcoming Nov 15 Samford at Southern Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:30 PM Samford vs Northeast Alabama CC | ",
 "Today Oct 24, 11:00 AM Samford vs Montevallo | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Samford at Samford Round Robin #1 | Completed",
 "Final Oct 8 Women's · Samford at ITA Regionals | Completed",
 "Upcoming Oct 30 Women's · Samford at Alabama Invitational | ",
 "Upcoming Nov 6 Women's · Samford at Samford Round Robin #2 | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 17 Men's · Samford at Samford Fall Invite #1 | Completed",
 "Final Oct 9 Men's · Samford at ITA Regionals | Completed",
 "Today Oct 23 Men's · Samford at CCB Invite | ",
 "Upcoming Oct 29 Men's · Samford at UTR Sports Division 1 National Tournament | ",
 "Upcoming Nov 13 Men's · Samford at Samford Invite #2 | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Samford at Alabama | L, 1-3",
 "Final Aug 30 Samford vs UC Riverside | L, 1-3",
 "Final Sep 4 Samford vs Middle Tennessee | L, 0-3",
 "Final Sep 5 Samford at Belmont | W, 3-2",
 "Final Sep 6 Samford at Vanderbilt | L, 0-3",
 "Final Sep 11 Samford vs North Alabama | L, 2-3",
 "Final Sep 13 Samford vs Jacksonville State | W, 3-1",
 "Final Sep 17 Samford vs South Alabama | L, 0-3",
 "Final Sep 18 Samford at Auburn | L, 1-3",
 "Final Sep 20 Samford vs UAB | W, 3-1",
 "Final Sep 24 Samford vs ETSU | W, 3-1",
 "Final Sep 25 Samford vs ETSU | W, 3-1",
 "Final Oct 1 Samford at Western Carolina | L, 1-3",
 "Final Oct 2 Samford at Western Carolina | W, 3-2",
 "Final Oct 6 Samford vs Mercer | W, 3-1",
 "Final Oct 9 Samford vs Wofford | L, 0-3",
 "Final Oct 10 Samford vs Wofford | L, 1-3",
 "Final Oct 16 Samford at The Citadel | W, 3-0",
 "Final Oct 17 Samford at The Citadel | W, 3-0",
 "Final Oct 23 Samford vs Tennessee Tech | W, 3-1",
 "Today Oct 24, 4:00 PM Samford vs Tennessee Tech | ",
 "Upcoming Oct 27, 5:00 PM Samford at Mercer | ",
 "Upcoming Oct 30, 6:30 PM Samford vs Chattanooga | ",
 "Upcoming Oct 31, 1:00 PM Samford vs Chattanooga | ",
 "Upcoming Nov 6, 5:00 PM Samford at UNC Greensboro | ",
 "Upcoming Nov 7, 2:00 PM Samford at UNC Greensboro | ",
 "Upcoming Nov 12, 5:00 PM Samford at Furman | ",
 "Upcoming Nov 13, 5:00 PM Samford at Furman | ",
 "Upcoming Nov 19 Samford at SoCon Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Samford module checks passed");
