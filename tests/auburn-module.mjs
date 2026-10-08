import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {auburnSchool,auburnGolfCardPlace,auburnGolfPlace} from '../src/schools/auburn.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='auburn');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,auburnHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/auburn-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit auburntigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['auburn'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',auburnSchool.scheduleUrls],['roster',auburnSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('auburn|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'auburntigers.com',`${key} must stay on auburntigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://auburntigers.com/sports/baseball/schedule"],"roster":["https://auburntigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://auburntigers.com/sports/mens-basketball/schedule","https://auburntigers.com/sports/womens-basketball/schedule"],"roster":["https://auburntigers.com/sports/mens-basketball/roster","https://auburntigers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://auburntigers.com/sports/xctrack/schedule"],"roster":["https://auburntigers.com/sports/xctrack/roster"],"combined":false},"Equestrian":{"schedule":["https://auburntigers.com/sports/equestrian/schedule"],"roster":["https://auburntigers.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://auburntigers.com/sports/football/schedule"],"roster":["https://auburntigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://auburntigers.com/sports/mens-golf/schedule","https://auburntigers.com/sports/womens-golf/schedule"],"roster":["https://auburntigers.com/sports/mens-golf/roster","https://auburntigers.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://auburntigers.com/sports/gymnastics/schedule"],"roster":["https://auburntigers.com/sports/gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://auburntigers.com/sports/soccer/schedule"],"roster":["https://auburntigers.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://auburntigers.com/sports/softball/schedule"],"roster":["https://auburntigers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://auburntigers.com/sports/swimming-diving/schedule"],"roster":["https://auburntigers.com/sports/swimming-diving/roster"],"combined":false},"Tennis":{"schedule":["https://auburntigers.com/sports/mens-tennis/schedule","https://auburntigers.com/sports/womens-tennis/schedule"],"roster":["https://auburntigers.com/sports/mens-tennis/roster","https://auburntigers.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://auburntigers.com/sports/xctrack/schedule"],"roster":["https://auburntigers.com/sports/xctrack/roster"],"combined":false},"Volleyball":{"schedule":["https://auburntigers.com/sports/volleyball/schedule"],"roster":["https://auburntigers.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'auburn|"+sport+"':"),`${sport} routes must live in the Auburn module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://auburntigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.auburnHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=auburn)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 8, 6:00 PM Auburn vs Mississippi St. (Exhibition) | ",
 "Upcoming Feb 19 Auburn vs Penn State | ",
 "Upcoming Feb 20 Auburn vs Penn State | ",
 "Upcoming Feb 21 Auburn vs Penn State | ",
 "Upcoming Mar 19 Auburn vs Florida | ",
 "Upcoming Mar 20 Auburn vs Florida | ",
 "Upcoming Mar 21 Auburn vs Florida | ",
 "Upcoming Mar 26 Auburn at Oklahoma | ",
 "Upcoming Mar 27 Auburn at Oklahoma | ",
 "Upcoming Mar 28 Auburn at Oklahoma | ",
 "Upcoming Apr 2 Auburn vs Missouri | ",
 "Upcoming Apr 3 Auburn vs Missouri | ",
 "Upcoming Apr 4 Auburn vs Missouri | ",
 "Upcoming Apr 9 Auburn at Georgia | ",
 "Upcoming Apr 10 Auburn at Georgia | ",
 "Upcoming Apr 11 Auburn at Georgia | ",
 "Upcoming Apr 16 Auburn vs Tennessee | ",
 "Upcoming Apr 17 Auburn vs Tennessee | ",
 "Upcoming Apr 18 Auburn vs Tennessee | ",
 "Upcoming Apr 23 Auburn at South Carolina | ",
 "Upcoming Apr 24 Auburn at South Carolina | ",
 "Upcoming Apr 25 Auburn at South Carolina | ",
 "Upcoming Apr 30 Auburn at Arkansas | ",
 "Upcoming May 1 Auburn at Arkansas | ",
 "Upcoming May 2 Auburn at Arkansas | ",
 "Upcoming May 7 Auburn vs Ole Miss | ",
 "Upcoming May 8 Auburn vs Ole Miss | ",
 "Upcoming May 9 Auburn vs Ole Miss | ",
 "Upcoming May 14 Auburn at Vanderbilt | ",
 "Upcoming May 15 Auburn at Vanderbilt | ",
 "Upcoming May 16 Auburn at Vanderbilt | ",
 "Upcoming May 20 Auburn vs Alabama | ",
 "Upcoming May 21 Auburn vs Alabama | ",
 "Upcoming May 22 Auburn vs Alabama | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 14, 7:00 PM Men's · Auburn vs Florida State (Exhibition) | ",
 "Upcoming Oct 22, 7:00 PM Men's · Auburn vs Alabama (Exhibition) | ",
 "Upcoming Oct 29 Men's · Auburn vs Samford (Exhibition) | ",
 "Upcoming Nov 4 Men's · Auburn vs Southeastern Louisiana | ",
 "Upcoming Nov 9, 8:00 PM Men's · Auburn vs Appalachian State | ",
 "Upcoming Nov 13, 8:00 PM Men's · Auburn vs Arizona | ",
 "Upcoming Nov 17, 11:00 PM Men's · Auburn vs West Virginia | ",
 "Upcoming Nov 18 Men's · Auburn vs Kansas or UNLV | ",
 "Upcoming Nov 19 Men's · Auburn vs Players Era | ",
 "Upcoming Nov 24 Men's · Auburn vs Lipscomb | ",
 "Upcoming Dec 1, 6:00 PM Men's · Auburn at Clemson | ",
 "Upcoming Dec 6 Men's · Auburn vs Eastern Kentucky | ",
 "Upcoming Dec 13 Men's · Auburn vs Alabama State | ",
 "Upcoming Dec 15 Men's · Auburn vs Middle Tennessee State | ",
 "Upcoming Dec 19, 3:00 PM Men's · Auburn vs Wisconsin | ",
 "Upcoming Dec 22 Men's · Auburn vs Lehigh | ",
 "Upcoming Dec 29 Men's · Auburn vs Morgan State | ",
 "Upcoming Jan 2, 7:30 PM Men's · Auburn at Texas A&M | ",
 "Upcoming Jan 6, 6:00 PM Men's · Auburn vs Tennessee | ",
 "Upcoming Jan 9, 12:00 PM Men's · Auburn vs Georgia | ",
 "Upcoming Jan 12, 8:00 PM Men's · Auburn at Texas | ",
 "Upcoming Jan 16, 7:30 PM Men's · Auburn vs Ole Miss | ",
 "Upcoming Jan 19, 6:00 PM Men's · Auburn at Vanderbilt | ",
 "Upcoming Jan 23, 2:30 PM Men's · Auburn at LSU | ",
 "Upcoming Jan 26, 6:00 PM Men's · Auburn vs Mississippi State | ",
 "Upcoming Jan 30 Men's · Auburn at Alabama | ",
 "Upcoming Feb 6, 2:30 PM Men's · Auburn vs Oklahoma | ",
 "Upcoming Feb 9, 6:00 PM Men's · Auburn vs Florida | ",
 "Upcoming Feb 13, 6:00 PM Men's · Auburn at South Carolina | ",
 "Upcoming Feb 16, 8:00 PM Men's · Auburn at Arkansas | ",
 "Upcoming Feb 20, 11:00 AM Men's · Auburn vs Missouri | ",
 "Upcoming Feb 24, 6:00 PM Men's · Auburn vs LSU | ",
 "Upcoming Feb 27 Men's · Auburn at Kentucky | ",
 "Upcoming Mar 2, 9:00 PM Men's · Auburn at Ole Miss | ",
 "Upcoming Mar 6, 5:00 PM Men's · Auburn vs Alabama | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 14, 12:00 PM Women's · Auburn vs UCF (Exhibition) | ",
 "Upcoming Oct 28, 6:00 PM Women's · Auburn vs Columbus State (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Auburn vs Alabama State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Auburn vs Southern Miss | ",
 "Upcoming Nov 10, 11:00 AM Women's · Auburn vs Furman | ",
 "Upcoming Nov 13 Women's · Auburn at Texas Tech | ",
 "Upcoming Nov 17, 6:00 PM Women's · Auburn vs Seton Hall | ",
 "Upcoming Nov 20, 6:00 PM Women's · Auburn vs Middle Tennessee State | ",
 "Upcoming Nov 25, 1:30 PM Women's · Auburn vs Wisconsin | ",
 "Upcoming Nov 26, 11:00 AM Women's · Auburn vs Southern University | ",
 "Upcoming Nov 27, 11:00 AM Women's · Auburn vs Syracuse | ",
 "Upcoming Dec 2, 6:15 PM Women's · Auburn vs Stanford | ",
 "Upcoming Dec 6 Women's · Auburn vs Wake Forest | ",
 "Upcoming Dec 17, 4:00 PM Women's · Auburn vs Jackson State | ",
 "Upcoming Dec 20, 8:00 PM Women's · Auburn vs South Florida | ",
 "Upcoming Dec 21, 5:30 PM Women's · Auburn vs Tulsa | ",
 "Upcoming Dec 28, 6:00 PM Women's · Auburn vs South Alabama | ",
 "Upcoming Dec 31 Women's · Auburn vs LSU | ",
 "Upcoming Jan 3, 11:00 AM Women's · Auburn at Kentucky | ",
 "Upcoming Jan 7, 6:00 PM Women's · Auburn vs Vanderbilt | ",
 "Upcoming Jan 10, 11:00 AM Women's · Auburn at Georgia | ",
 "Upcoming Jan 14 Women's · Auburn at Florida | ",
 "Upcoming Jan 21, 6:00 PM Women's · Auburn vs Ole Miss | ",
 "Upcoming Jan 24, 2:00 PM Women's · Auburn vs Texas A&M | ",
 "Upcoming Jan 28, 7:00 PM Women's · Auburn at LSU | ",
 "Upcoming Jan 31, 3:00 PM Women's · Auburn vs Arkansas | ",
 "Upcoming Feb 4, 6:00 PM Women's · Auburn vs Texas | ",
 "Upcoming Feb 7, 5:00 PM Women's · Auburn at Alabama | ",
 "Upcoming Feb 11, 5:30 PM Women's · Auburn at Tennessee | ",
 "Upcoming Feb 15, 7:00 PM Women's · Auburn vs Mississippi St. | ",
 "Upcoming Feb 21, 2:00 PM Women's · Auburn at Oklahoma | ",
 "Upcoming Feb 25 Women's · Auburn at South Carolina | ",
 "Upcoming Feb 28, 3:00 PM Women's · Auburn vs Missouri | ",
 "Upcoming Mar 3 Women's · Auburn vs TBA | "
]);
  const v_xctrack=parse("Cross Country","xctrack");
  assert.deepEqual(v_xctrack.map(line),[
 "Final Sep 4 Auburn at Foothills Invitational | Completed",
 "Final Sep 18 Auburn at Southern Showcase | Completed",
 "Upcoming Oct 16, 8:30 AM Auburn at Crimson Classic | ",
 "Upcoming Oct 16, 9:00 AM Auburn at NCAA Pre-National Invitational | ",
 "Upcoming Oct 30, 8:00 AM Auburn at SEC Championships | ",
 "Upcoming Nov 13 Auburn vs NCAA South Regional | ",
 "Upcoming Nov 21 Auburn at NCAA Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 24 Auburn vs Lynchburg (Exhibition) | W, 9-0",
 "Final Sep 25 Auburn vs Bridgewater (VA) (Exhibition) | W, 10-0",
 "Final Oct 3 Auburn vs SMU | W, 12-7",
 "Upcoming Oct 9, 3:00 PM Auburn vs South Carolina | ",
 "Upcoming Oct 23, 3:00 PM Auburn vs Texas A&M | ",
 "Upcoming Oct 31, 11:00 AM Auburn vs Fresno St. | ",
 "Upcoming Nov 6, 11:00 AM Auburn at Baylor | ",
 "Upcoming Nov 20, 1:00 PM Auburn at Georgia | ",
 "Upcoming Feb 5, 3:00 PM Auburn vs UT Martin | ",
 "Upcoming Feb 6, 11:00 AM Auburn vs Minnesota Crookston | ",
 "Upcoming Feb 20, 11:00 AM Auburn vs Georgia | ",
 "Upcoming Feb 27, 11:00 AM Auburn at South Carolina | ",
 "Upcoming Mar 5 Auburn at SMU | ",
 "Upcoming Mar 6 Auburn at Texas A&M | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Auburn vs Baylor | W, 17-16",
 "Final Sep 12 Auburn vs Southern Miss | W, 43-8",
 "Final Sep 19 Auburn vs Florida | L, 39-44",
 "Final Sep 26 Auburn vs Vanderbilt | W, 21-15",
 "Final Oct 3 Auburn at Tennessee | L, 14-24",
 "Upcoming Oct 17, 2:30 PM Auburn at Georgia | ",
 "Upcoming Oct 24, 11:00 AM Auburn vs LSU | ",
 "Upcoming Oct 31 Auburn at Ole Miss | ",
 "Upcoming Nov 7 Auburn vs Arkansas | ",
 "Upcoming Nov 14 Auburn at Mississippi State | ",
 "Upcoming Nov 21, 2:30 PM Auburn vs Samford | ",
 "Upcoming Nov 28 Auburn at Alabama | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Auburn at Inverness Intercollegiate | 1st of 18",
 "Final Sep 28 Men's · Auburn at Ben Hogan Collegiate | 2nd of 18",
 "Upcoming Oct 18 Men's · Auburn at The Williams Cup | ",
 "Upcoming Oct 26 Men's · Auburn at East Lake Cup | ",
 "Upcoming Oct 31 Men's · Auburn at Steelwood Collegiate | ",
 "Upcoming Feb 4 Men's · Auburn at Amer Ari Invitational | ",
 "Upcoming Feb 13 Men's · Auburn at Gator Invitational | ",
 "Upcoming Feb 28 Men's · Auburn at Las Vegas Collegiate | ",
 "Upcoming Mar 15 Men's · Auburn at Tiger Invitational | ",
 "Upcoming Mar 22 Men's · Auburn at Valspar Collegiate | ",
 "Upcoming Apr 2 Men's · Auburn at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · Auburn at The Ford Collegiate | ",
 "Upcoming Apr 21 Men's · Auburn at (R1) SEC Championship | ",
 "Upcoming May 17 Men's · Auburn vs (R1) NCAA Regionals | ",
 "Upcoming May 28 Men's · Auburn at (R1) NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Auburn at ANNIKA Intercollegiate | 4th of 12",
 "Final Sep 21 Women's · Auburn at Canadian Invitational Collegiate | 2nd of 11",
 "Upcoming Oct 12 Women's · Auburn at Haskins Women's Intercollegiate | ",
 "Upcoming Oct 23 Women's · Auburn vs The Landfall Tradition | ",
 "Upcoming Jan 29 Women's · Auburn at Collegiate Invitational at Guadalajara CC | ",
 "Upcoming Feb 14 Women's · Auburn at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Auburn at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 22 Women's · Auburn at Charles Schwab Women's Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · Auburn vs Country Club of Birmingham Match Play | ",
 "Upcoming Apr 16 Women's · Auburn at SEC Championship | ",
 "Upcoming May 10 Women's · Auburn at NCAA Tournament | ",
 "Upcoming May 21 Women's · Auburn at NCAA Championship | "
]);
  const v_gymnastics=parse("Gymnastics","gymnastics");
  assert.deepEqual(v_gymnastics.map(line),[
 "Upcoming Jan 8 Auburn vs Arizona | ",
 "Upcoming Jan 22 Auburn vs Arkansas | ",
 "Upcoming Feb 5 Auburn vs LSU | ",
 "Upcoming Feb 19 Auburn vs Oklahoma | ",
 "Upcoming Mar 5 Auburn vs Georgia | "
]);
  const v_soccer=parse("Soccer","soccer");
  assert.deepEqual(v_soccer.map(line),[
 "Final Aug 8 Auburn vs Georgia Southern (Exhibition) | W, 3-0",
 "Final Aug 12 Auburn vs Clemson | T, 0-0",
 "Final Aug 16 Auburn vs Jax State | W, 5-0",
 "Final Aug 20 Auburn vs Southern Illinois | W, 3-0",
 "Final Aug 27 Auburn at Kennesaw State | W, 4-0",
 "Final Aug 30 Auburn vs Georgia State | T, 1-1",
 "Final Sep 3 Auburn at UAB | W, 1-0",
 "Final Sep 6 Auburn at Samford | T, 0-0",
 "Final Sep 11 Auburn vs Alabama | L, 0-1",
 "Final Sep 18 Auburn vs Ole Miss | W, 3-0",
 "Final Sep 24 Auburn at Missouri | W, 2-0",
 "Final Sep 27 Auburn at Arkansas | L, 0-1",
 "Final Oct 1 Auburn vs Tennessee | W, 1-0",
 "Upcoming Oct 9, 7:00 PM Auburn at Oklahoma | ",
 "Upcoming Oct 15, 6:30 PM Auburn vs Kentucky | ",
 "Upcoming Oct 18, 5:00 PM Auburn vs Mississippi State | ",
 "Upcoming Oct 22, 6:00 PM Auburn at Florida | ",
 "Upcoming Nov 1, 12:00 PM Auburn at Texas | ",
 "Upcoming Nov 8 Auburn vs SEC Soccer Tournament | ",
 "Upcoming Nov 20 Auburn vs NCAA Tournament (First Round) | ",
 "Upcoming Nov 25 Auburn vs NCAA Tournament (Second Round) | ",
 "Upcoming Nov 28 Auburn vs NCAA Tournament (Sweet 16) | ",
 "Upcoming Dec 4 Auburn vs NCAA Tournament (Elite 8) | ",
 "Upcoming Dec 11 Auburn vs College Cup | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 5:00 PM Auburn vs Chipola College (Exhibition) | ",
 "Upcoming Oct 11, 1:00 PM Auburn vs Gulf Coast State (Exhibition) | ",
 "Upcoming Oct 17, 1:00 PM Auburn vs Northeast Alabama Community College (Exhibition) | ",
 "Upcoming Oct 18, 12:00 PM Auburn at Florida State (Exhibition) | ",
 "Upcoming Oct 23, 5:00 PM Auburn vs Northwest Florida State (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Auburn vs Gadsden State (Exhibition) | ",
 "Upcoming Nov 6, 5:00 PM Auburn vs West Georgia (Exhibition) | ",
 "Upcoming Nov 13, 6:00 PM Auburn at Alabama (Exhibition) | "
]);
  const v_swimmingdiving=parse("Swimming & Diving","swimming-diving");
  assert.deepEqual(v_swimmingdiving.map(line),[
 "Final Oct 2 Auburn at College Swimming League (Ohio State, Cal, Stanford) | Completed",
 "Upcoming Oct 16, 10:30 AM Auburn at George Washington | ",
 "Upcoming Oct 16, 5:00 PM Auburn vs Kentucky or Penn State | ",
 "Upcoming Oct 17 Auburn vs TBD | ",
 "Upcoming Oct 23, 4:30 PM Auburn at College Swimming League (Georgia, Alabama, Tennessee) | ",
 "Upcoming Oct 30 Auburn at War Eagle Invitational | ",
 "Upcoming Nov 5, 12:00 PM Auburn at LSU | ",
 "Upcoming Nov 18 Auburn at Wolfpack Invitational | ",
 "Upcoming Nov 18 Auburn at Tennessee Diving Invitational | ",
 "Upcoming Dec 2 Auburn at US Open | ",
 "Upcoming Dec 11 Auburn vs USA Diving Winter Nationals | ",
 "Upcoming Jan 8 Auburn at Texas A&M | ",
 "Upcoming Jan 14 Auburn vs TYR Pro Swim Series | ",
 "Upcoming Jan 15 Auburn vs Arkansas (W) | ",
 "Upcoming Jan 29 Auburn vs Alabama | ",
 "Upcoming Feb 14 Auburn at SEC Championships | ",
 "Upcoming Feb 26 Auburn vs Last Chance Meet | ",
 "Upcoming Mar 3 Auburn vs NCAA Zone B Diving | ",
 "Upcoming Mar 17 Auburn at NCAA Women's Championships | ",
 "Upcoming Mar 24 Auburn at NCAA Men's Championships | ",
 "Upcoming Apr 21 Auburn vs TYR Pro Swim Series | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Auburn at SEC Starkvegas Showdown | Completed",
 "Today Oct 8 Men's · Auburn at ITA Southern Regional Championships | ",
 "Upcoming Nov 5 Men's · Auburn at ITA South Sectional Championships | ",
 "Upcoming Nov 17 Men's · Auburn at NCAA Singles & Doubles Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Today Oct 8 Women's · Auburn at ITA Southern Regional Championships | ",
 "Upcoming Nov 5 Women's · Auburn at ITA South Sectional Championships | ",
 "Upcoming Nov 17 Women's · Auburn at NCAA Tournament | "
]);
  const v_xctrack_trackfield=parse("Track & Field","xctrack");
  assert.deepEqual(v_xctrack_trackfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 28 Auburn vs Liberty | W, 3-0",
 "Final Aug 28 Auburn at ETSU | W, 3-1",
 "Final Aug 29 Auburn vs Akron | W, 3-0",
 "Final Sep 2 Auburn vs Minnesota | L, 1-3",
 "Final Sep 3 Auburn at Wisconsin | L, 0-3",
 "Final Sep 8 Auburn at Florida State | W, 3-1",
 "Final Sep 11 Auburn at UIC | W, 3-0",
 "Final Sep 12 Auburn vs Central Michigan | W, 3-0",
 "Final Sep 13 Auburn at DePaul | W, 3-1",
 "Final Sep 17 Auburn vs UAB | W, 3-1",
 "Final Sep 18 Auburn vs Samford | W, 3-1",
 "Final Sep 19 Auburn vs South Alabama | W, 3-1",
 "Final Sep 25 Auburn at Arkansas | W, 3-2",
 "Final Oct 2 Auburn vs Kentucky | L, 1-3",
 "Final Oct 4 Auburn vs Tennessee | L, 0-3",
 "Upcoming Oct 9, 7:00 PM Auburn at Vanderbilt | ",
 "Upcoming Oct 11, 2:00 PM Auburn at Missouri | ",
 "Upcoming Oct 16, 6:30 PM Auburn at Texas | ",
 "Upcoming Oct 18, 12:00 PM Auburn at Texas A&M | ",
 "Upcoming Oct 23, 8:00 PM Auburn vs Ole Miss | ",
 "Upcoming Oct 25, 2:00 PM Auburn vs LSU | ",
 "Upcoming Oct 30, 6:00 PM Auburn vs Florida | ",
 "Upcoming Nov 1, 2:00 PM Auburn vs Oklahoma | ",
 "Upcoming Nov 6, 6:00 PM Auburn vs Georgia | ",
 "Upcoming Nov 8, 2:00 PM Auburn vs South Carolina | ",
 "Upcoming Nov 11, 8:00 PM Auburn at Alabama | ",
 "Upcoming Nov 15, 2:00 PM Auburn at Mississippi St. | ",
 "Upcoming Nov 20 Auburn vs SEC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_xctrack,"Cross Country xctrack");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_gymnastics,"Gymnastics gymnastics");
  ownRecapsOnly(v_soccer,"Soccer soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimmingdiving,"Swimming & Diving swimming-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_xctrack_trackfield,"Track & Field xctrack");
  ownRecapsOnly(v_volleyball,"Volleyball volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Auburn module checks passed');

// Auburn's cards (schedule-event-item__*): the day box carries the full date
// (datetime), the divider ("vs.", "at") and the opponent have their own
// elements; results read "W Win 17-16".
{
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Auburn vs Baylor","W, 17-16"],["Auburn vs Southern Miss","W, 43-8"],["Auburn vs Florida","L, 39-44"],["Auburn vs Vanderbilt","W, 21-15"],["Auburn at Tennessee","L, 14-24"]]);
  // "Softball 2026 Fall Schedule": the datetime gives the year.
  assert.ok(parse('Softball','softball').every(e=>e.start_time.startsWith('2026-')));
  // One "XC/Track" page: cross country August to November, track the rest.
  assert.deepEqual(parse('Cross Country','xctrack').map(e=>e.opponent).slice(0,2),['Foothills Invitational','Southern Showcase']);
  assert.deepEqual(parse('Track & Field','xctrack'),[]);
  // Golf's day cards at one course are one tournament; the last day's card
  // gives the place ("1/18", "4th/12").
  assert.deepEqual(auburnGolfCardPlace('1/18').headline,'1st of 18');
  assert.deepEqual(auburnGolfCardPlace('4th/12').headline,'4th of 12');
  assert.deepEqual(parse('Golf','mens-golf').filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.end_time]),[["Inverness Intercollegiate","1st of 18","2026-09-15T23:59:59Z"],["Ben Hogan Collegiate","2nd of 18","2026-09-29T23:59:59Z"]]);
  // A card without a place takes the final story's ("Auburn Places Second").
  assert.equal(auburnGolfPlace('Davis, Auburn places second at Canadian Collegiate Invitational'),'2');
  assert.equal(auburnGolfPlace('No. 8 Auburn women’s golf places 4th at ANNIKA Intercollegiate'),'4');
  assert.equal(auburnGolfPlace('Holder, Gilbert lead No. 2 Tigers on day one of Inverness'),null);
  // Players' pro events on the tennis pages are not team events.
  assert.ok(!parse('Tennis','mens-tennis').some(e=>/Futures/.test(e.opponent)));
}
console.log('Auburn hand-written checks passed');
