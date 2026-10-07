import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {floridaSchool} from '../src/schools/florida.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='florida');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,floridaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/florida-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit floridagators.com routes, each
// corrected to the official pages (generic and homepage candidates dropped).
const sports=sponsoredSports['florida'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',floridaSchool.scheduleUrls],['roster',floridaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('florida|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'floridagators.com',`${key} must stay on floridagators.com`);
  }
}
const parity={"Baseball":{"schedule":["https://floridagators.com/sports/baseball/schedule"],"roster":["https://floridagators.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://floridagators.com/sports/mens-basketball/schedule","https://floridagators.com/sports/womens-basketball/schedule"],"roster":["https://floridagators.com/sports/mens-basketball/roster","https://floridagators.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://floridagators.com/sports/cross-country/schedule"],"roster":["https://floridagators.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://floridagators.com/sports/football/schedule"],"roster":["https://floridagators.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://floridagators.com/sports/mens-golf/schedule","https://floridagators.com/sports/womens-golf/schedule"],"roster":["https://floridagators.com/sports/mens-golf/roster","https://floridagators.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://floridagators.com/sports/womens-gymnastics/schedule"],"roster":["https://floridagators.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://floridagators.com/sports/womens-lacrosse/schedule"],"roster":["https://floridagators.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://floridagators.com/sports/womens-soccer/schedule"],"roster":["https://floridagators.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://floridagators.com/sports/softball/schedule"],"roster":["https://floridagators.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://floridagators.com/sports/mens-swimming-and-diving/schedule","https://floridagators.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://floridagators.com/sports/mens-swimming-and-diving/roster","https://floridagators.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://floridagators.com/sports/mens-tennis/schedule","https://floridagators.com/sports/womens-tennis/schedule"],"roster":["https://floridagators.com/sports/mens-tennis/roster","https://floridagators.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://floridagators.com/sports/track-and-field/schedule"],"roster":["https://floridagators.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://floridagators.com/sports/womens-volleyball/schedule"],"roster":["https://floridagators.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'florida|"+sport+"':"),`${sport} routes must live in the Florida module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://floridagators.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.floridaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 16, 6:30 PM Florida vs South Florida (Exhibition) | ",
 "Upcoming Oct 24, 2:00 PM Florida vs Troy (Exhibition) | ",
 "Upcoming Oct 28, 5:30 PM Florida vs Ontario Blue Jays (Exhibition) | ",
 "Upcoming Nov 1, 2:00 PM Florida vs Mercer (Exhibition) | ",
 "Upcoming Nov 8, 10:00 AM Florida vs Air Force (Exhibition) | ",
 "Upcoming Feb 19 Florida vs Queens | ",
 "Upcoming Feb 20 Florida vs Queens | ",
 "Upcoming Feb 21 Florida vs Queens | ",
 "Upcoming Feb 23 Florida at Stetson | ",
 "Upcoming Feb 24 Florida vs Stetson | ",
 "Upcoming Feb 26 Florida vs Delaware | ",
 "Upcoming Feb 27 Florida vs Delaware | ",
 "Upcoming Feb 28 Florida vs Delaware | ",
 "Upcoming Mar 1 Florida vs Michigan | ",
 "Upcoming Mar 5 Florida vs Miami | ",
 "Upcoming Mar 6 Florida vs Miami | ",
 "Upcoming Mar 7 Florida vs Miami | ",
 "Upcoming Mar 9 Florida vs Presbyterian | ",
 "Upcoming Mar 10 Florida vs Presbyterian | ",
 "Upcoming Mar 12 Florida vs North Florida | ",
 "Upcoming Mar 13 Florida vs North Florida | ",
 "Upcoming Mar 14 Florida vs North Florida | ",
 "Upcoming Mar 16 Florida vs Florida State | ",
 "Upcoming Mar 19 Florida at Auburn | ",
 "Upcoming Mar 20 Florida at Auburn | ",
 "Upcoming Mar 21 Florida at Auburn | ",
 "Upcoming Mar 23 Florida vs Stetson | ",
 "Upcoming Mar 26 Florida vs LSU | ",
 "Upcoming Mar 27 Florida vs LSU | ",
 "Upcoming Mar 28 Florida vs LSU | ",
 "Upcoming Mar 30 Florida at Florida State | ",
 "Upcoming Apr 2 Florida at South Carolina | ",
 "Upcoming Apr 3 Florida at South Carolina | ",
 "Upcoming Apr 4 Florida at South Carolina | ",
 "Upcoming Apr 6 Florida vs Jacksonville | ",
 "Upcoming Apr 9 Florida vs Mississippi State | ",
 "Upcoming Apr 10 Florida vs Mississippi State | ",
 "Upcoming Apr 11 Florida vs Mississippi State | ",
 "Upcoming Apr 13 Florida vs Florida A&M | ",
 "Upcoming Apr 16 Florida vs Texas | ",
 "Upcoming Apr 17 Florida vs Texas | ",
 "Upcoming Apr 18 Florida vs Texas | ",
 "Upcoming Apr 20 Florida vs Kansas | ",
 "Upcoming Apr 23 Florida at Kentucky | ",
 "Upcoming Apr 24 Florida at Kentucky | ",
 "Upcoming Apr 25 Florida at Kentucky | ",
 "Upcoming Apr 27 Florida vs Florida State | ",
 "Upcoming Apr 30 Florida vs Tennessee | ",
 "Upcoming May 1 Florida vs Tennessee | ",
 "Upcoming May 2 Florida vs Tennessee | ",
 "Upcoming May 4 Florida vs Bethune-Cookman | ",
 "Upcoming May 7 Florida at Vanderbilt | ",
 "Upcoming May 8 Florida at Vanderbilt | ",
 "Upcoming May 9 Florida at Vanderbilt | ",
 "Upcoming May 11 Florida vs South Florida | ",
 "Upcoming May 14 Florida vs Georgia | ",
 "Upcoming May 15 Florida vs Georgia | ",
 "Upcoming May 16 Florida vs Georgia | ",
 "Upcoming May 20 Florida at Missouri | ",
 "Upcoming May 21 Florida at Missouri | ",
 "Upcoming May 22 Florida at Missouri | ",
 "Upcoming May 25 Florida at SEC Tournament | ",
 "Upcoming Jun 4 Florida at NCAA Regionals | ",
 "Upcoming Jun 11 Florida at NCAA Super Regionals | ",
 "Upcoming Jun 18 Florida at NCAA College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 2:00 PM Men's · Florida vs Baylor (Exhibition) | ",
 "Upcoming Oct 27, 7:00 PM Men's · Florida vs Stetson (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Florida vs Miami | ",
 "Upcoming Nov 5, 8:00 PM Men's · Florida vs Jacksonville | ",
 "Upcoming Nov 10, 6:00 PM Men's · Florida at Florida State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Florida vs Merrimack | ",
 "Upcoming Nov 17, 4:30 PM Men's · Florida vs Notre Dame | ",
 "Upcoming Nov 18 Men's · Florida vs Houston/Rutgers | ",
 "Upcoming Nov 19 Men's · Florida vs Auburn/Kansas/UNLV/West Virginia | ",
 "Upcoming Nov 24, 7:00 PM Men's · Florida vs Milwaukee | ",
 "Upcoming Dec 1, 9:30 PM Men's · Florida vs Duke | ",
 "Upcoming Dec 6, 12:00 PM Men's · Florida vs Vermont | ",
 "Upcoming Dec 12, 12:00 PM Men's · Florida vs Georgia Tech | ",
 "Upcoming Dec 18, 6:00 PM Men's · Florida vs Grand Canyon | ",
 "Upcoming Dec 21, 7:00 PM Men's · Florida vs Florida A&M | ",
 "Upcoming Dec 29, 6:00 PM Men's · Florida vs LIU | ",
 "Upcoming Jan 2, 6:00 PM Men's · Florida at Texas | ",
 "Upcoming Jan 6, 9:00 PM Men's · Florida vs Oklahoma | ",
 "Upcoming Jan 9, 11:00 AM Men's · Florida vs Vanderbilt | ",
 "Upcoming Jan 13, 9:00 PM Men's · Florida at Mississippi State | ",
 "Upcoming Jan 16, 2:00 PM Men's · Florida at Alabama | ",
 "Upcoming Jan 20, 7:00 PM Men's · Florida vs Texas A&M | ",
 "Upcoming Jan 23, 4:00 PM Men's · Florida at Georgia | ",
 "Upcoming Jan 30 Men's · Florida at Tennessee | ",
 "Upcoming Feb 2 Men's · Florida vs South Carolina | ",
 "Upcoming Feb 6, 12:00 PM Men's · Florida vs Texas | ",
 "Upcoming Feb 9, 7:00 PM Men's · Florida at Auburn | ",
 "Upcoming Feb 13, 12:00 PM Men's · Florida vs Missouri | ",
 "Upcoming Feb 17, 8:00 PM Men's · Florida at LSU | ",
 "Upcoming Feb 20, 8:30 PM Men's · Florida vs Georgia | ",
 "Upcoming Feb 24, 9:00 PM Men's · Florida vs Ole Miss | ",
 "Upcoming Feb 27, 3:00 PM Men's · Florida at Arkansas | ",
 "Upcoming Mar 2, 8:00 PM Men's · Florida at South Carolina | ",
 "Upcoming Mar 6 Men's · Florida vs Kentucky | ",
 "Upcoming Mar 10 Men's · Florida at SEC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · Florida vs Flagler (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Florida vs Bucknell | ",
 "Upcoming Nov 5, 5:00 PM Women's · Florida vs Central Florida | ",
 "Upcoming Nov 8, 2:00 PM Women's · Florida at Chattanooga | ",
 "Upcoming Nov 12, 6:00 PM Women's · Florida vs South Florida | ",
 "Upcoming Nov 15, 2:00 PM Women's · Florida at Florida State | ",
 "Upcoming Nov 19, 6:00 PM Women's · Florida vs Florida Atlantic | ",
 "Upcoming Nov 24, 3:30 PM Women's · Florida vs West Virginia | ",
 "Upcoming Nov 26, 2:00 PM Women's · Florida vs Davidson | ",
 "Upcoming Dec 2, 5:00 PM Women's · Florida vs Miami | ",
 "Upcoming Dec 6 Women's · Florida vs North Florida | ",
 "Upcoming Dec 14, 6:00 PM Women's · Florida vs Bethune-Cookman | ",
 "Upcoming Dec 17, 6:00 PM Women's · Florida vs Norfolk State | ",
 "Upcoming Dec 20, 12:00 PM Women's · Florida vs Charleston Southern | ",
 "Upcoming Dec 22, 1:00 PM Women's · Florida vs Florida A&M | ",
 "Upcoming Dec 31, 3:00 PM Women's · Florida vs Kentucky | ",
 "Upcoming Jan 3, 2:00 PM Women's · Florida at Arkansas | ",
 "Upcoming Jan 7, 7:00 PM Women's · Florida at Alabama | ",
 "Upcoming Jan 10, 2:00 PM Women's · Florida vs LSU | ",
 "Upcoming Jan 14, 6:00 PM Women's · Florida vs Auburn | ",
 "Upcoming Jan 18, 7:00 PM Women's · Florida vs Tennessee | ",
 "Upcoming Jan 21, 7:00 PM Women's · Florida at South Carolina | ",
 "Upcoming Jan 24, 3:00 PM Women's · Florida at Ole Miss | ",
 "Upcoming Jan 28, 6:00 PM Women's · Florida vs Georgia | ",
 "Upcoming Feb 4, 7:30 PM Women's · Florida at Missouri | ",
 "Upcoming Feb 7, 3:00 PM Women's · Florida at Texas A&M | ",
 "Upcoming Feb 11, 6:00 PM Women's · Florida vs Mississippi State | ",
 "Upcoming Feb 14, 12:00 PM Women's · Florida vs Oklahoma | ",
 "Upcoming Feb 21, 3:00 PM Women's · Florida at Texas | ",
 "Upcoming Feb 25, 7:00 PM Women's · Florida at Georgia | ",
 "Upcoming Feb 28, 1:00 PM Women's · Florida vs Vanderbilt | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Florida at Stan Sims XC Opener | Women's team: 1st · 24 pts / Men's team: 1st · 33 pts",
 "Final Sep 19 Florida at John McNichols Invitational | Women's team: 5th · 156 pts / Men's team: 2nd · 119 pts",
 "Upcoming Oct 9 Florida at Nuttycombe Invitational | ",
 "Upcoming Oct 30 Florida at SEC Championships | ",
 "Upcoming Nov 13 Florida at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Florida at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Florida vs Florida Atlantic | W, 66-21",
 "Final Sep 12 Florida vs Campbell | W, 52-3",
 "Final Sep 19 Florida at Auburn | W, 44-39",
 "Final Sep 26 Florida vs Ole Miss | W, 52-28",
 "Final Oct 3 Florida at Missouri | L, 17-45",
 "Upcoming Oct 10, 12:45 PM Florida vs South Carolina | ",
 "Upcoming Oct 17, 12:00 PM Florida at Texas | ",
 "Upcoming Oct 31, 3:30 PM Florida vs Georgia | ",
 "Upcoming Nov 7 Florida vs Oklahoma | ",
 "Upcoming Nov 14 Florida at Kentucky | ",
 "Upcoming Nov 21 Florida vs Vanderbilt | ",
 "Upcoming Nov 27, 3:30 PM Florida at Florida State | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Florida at Sahalee Players Championship | 2nd of 12",
 "Final Sep 18 Men's · Florida at Fighting Illini Collegiate | T5th of 15",
 "Final Oct 5 Men's · Florida at Hamptons Intercollegiate | 1st of 12",
 "Upcoming Oct 18 Men's · Florida at Williams Cup | ",
 "Upcoming Jan 25 Men's · Florida at Southwestern Invitational | ",
 "Upcoming Feb 13 Men's · Florida at Gators Invitational | ",
 "Upcoming Feb 28 Men's · Florida at Las Vegas Collegiate | ",
 "Upcoming Mar 20 Men's · Florida at The Collegiate Players Championship | ",
 "Upcoming Apr 4 Men's · Florida at Calusa Cup | ",
 "Upcoming Apr 21 Men's · Florida at SEC Championship | ",
 "Upcoming May 17 Men's · Florida at NCAA Regionals | ",
 "Upcoming May 28 Men's · Florida at NCAA National Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Florida at Cougar Classic | 1st of 18",
 "Final Sep 18 Women's · Florida at Mason Rudolph Championship | T2nd of 15",
 "Today Oct 5, 11:00 AM Women's · Florida at The Ally | ",
 "Upcoming Oct 16 Women's · Florida at Tar Heel Invitational | ",
 "Upcoming Jan 31 Women's · Florida at Therese Hession Regional Challenge | ",
 "Upcoming Feb 22 Women's · Florida at UNF Collegiate | ",
 "Upcoming Mar 6 Women's · Florida at Gators Invitational | ",
 "Upcoming Mar 21 Women's · Florida at Clemson Invitational | ",
 "Upcoming Apr 12 Women's · Florida at The Strutting Gus Shootout | ",
 "Upcoming Apr 16 Women's · Florida at SEC Championship | ",
 "Upcoming May 10 Women's · Florida at NCAA Regionals | ",
 "Upcoming May 21 Women's · Florida at NCAA National Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 9 Florida at Sprouts Farmers Market Collegiate Quad | ",
 "Upcoming Jan 15 Florida at Arkansas | ",
 "Upcoming Jan 22 Florida at Missouri | ",
 "Upcoming Jan 29 Florida at Auburn | ",
 "Upcoming Feb 5 Florida at Alabama | ",
 "Upcoming Feb 12 Florida at Georgia | ",
 "Upcoming Feb 19 Florida at North Carolina | ",
 "Upcoming Feb 26 Florida at LSU | ",
 "Upcoming Mar 5 Florida at Kentucky | ",
 "Upcoming Mar 12 Florida at Oklahoma | ",
 "Upcoming Mar 20 Florida at SEC Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 8 Florida vs Florida International (Exhibition) | W, 7-1",
 "Final Aug 13 Florida at UCF | L, 3-4",
 "Final Aug 20 Florida vs Coastal Carolina | W, 3-2",
 "Final Aug 23 Florida vs Florida State | W, 3-1",
 "Final Aug 27 Florida vs Jacksonville | W, 6-0",
 "Final Aug 30 Florida at Florida Atlantic | T, 1-1",
 "Final Sep 3 Florida vs Youngstown State | W, 2-0",
 "Final Sep 6 Florida vs Wake Forest | L, 1-2",
 "Final Sep 10 Florida at South Carolina | L, 0-1",
 "Final Sep 18 Florida at Mississippi State | T, 2-2",
 "Final Sep 24 Florida vs Texas | T, 1-1",
 "Final Sep 27 Florida at Texas A&M | W, 5-2",
 "Final Oct 2 Florida vs Louisiana State | L, 1-2",
 "Upcoming Oct 8, 7:00 PM Florida vs Alabama | ",
 "Upcoming Oct 15, 7:00 PM Florida at Vanderbilt | ",
 "Upcoming Oct 18, 2:30 PM Florida at Arkansas | ",
 "Upcoming Oct 22, 7:00 PM Florida vs Auburn | ",
 "Upcoming Nov 1, 1:00 PM Florida vs Georgia | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 16, 6:00 PM Florida vs Santa Fe College | ",
 "Upcoming Oct 17, 6:00 PM Florida vs Carson-Newman University | ",
 "Upcoming Oct 23, 6:00 PM Florida vs UNF | ",
 "Upcoming Oct 27, 6:00 PM Florida vs USF | ",
 "Upcoming Nov 6, 6:00 PM Florida vs Saint Leo | ",
 "Upcoming Nov 13, 6:00 PM Florida vs Florida State | ",
 "Upcoming Nov 15, 2:00 PM Florida at UCF | ",
 "Upcoming Nov 20, 6:00 PM Florida vs Jacksonville | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Florida at FAU | W, 232-63",
 "Final Oct 2 Men's · Florida at Kentucky | W, 194-103",
 "Upcoming Oct 16, 11:00 AM Men's · Florida vs Miami (Diving) | ",
 "Upcoming Oct 17, 11:00 AM Men's · Florida at Virginia | ",
 "Upcoming Oct 30, 11:00 AM Men's · Florida at Georgia | ",
 "Upcoming Nov 19 Men's · Florida at Georgia | ",
 "Upcoming Dec 2 Men's · Florida at USA Swimming | ",
 "Upcoming Jan 7 Men's · Florida at Tennessee | ",
 "Upcoming Jan 13 Men's · Florida at USA Swimming | ",
 "Upcoming Jan 22, 5:00 PM Men's · Florida vs Missouri (Diving) | ",
 "Upcoming Jan 23, 10:30 AM Men's · Florida vs Missouri | ",
 "Upcoming Jan 29, 11:00 AM Men's · Florida vs Florida State (Diving) | ",
 "Upcoming Jan 29, 12:00 PM Men's · Florida vs Florida State | ",
 "Upcoming Feb 14 Men's · Florida at Southeastern Conference | ",
 "Upcoming Mar 7 Men's · Florida at NCAA Diving Zones | ",
 "Upcoming Mar 24 Men's · Florida at NCAA Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Florida at Vanderbilt | W, 206-55",
 "Final Oct 2 Women's · Florida at Kentucky | W, 183-115",
 "Upcoming Oct 16, 11:00 AM Women's · Florida vs Miami (Diving) | ",
 "Upcoming Oct 17, 11:00 AM Women's · Florida at Virginia | ",
 "Upcoming Oct 30, 11:00 AM Women's · Florida at Georgia | ",
 "Upcoming Nov 19 Women's · Florida at Georgia | ",
 "Upcoming Dec 2 Women's · Florida at USA Swimming | ",
 "Upcoming Jan 7 Women's · Florida at Tennessee | ",
 "Upcoming Jan 13 Women's · Florida at USA Swimming | ",
 "Upcoming Jan 22, 5:00 PM Women's · Florida vs Missouri (Diving) | ",
 "Upcoming Jan 23, 10:30 AM Women's · Florida vs Missouri | ",
 "Upcoming Jan 29, 11:00 AM Women's · Florida vs Florida State (Diving) | ",
 "Upcoming Jan 29 Women's · Florida vs Florida State | ",
 "Upcoming Feb 14 Women's · Florida at Southeastern Conference | ",
 "Upcoming Mar 7 Women's · Florida at NCAA DIVING ZONES | ",
 "Upcoming Mar 17 Women's · Florida at NCAA CHAMPIONSHIPS | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Florida at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Florida at Princeton Invite | Completed",
 "Final Oct 2 Men's · Florida at Bedford Cup | Completed",
 "Upcoming Oct 14 Men's · Florida at ITA Regional Championships | ",
 "Upcoming Oct 26 Men's · Florida at M25 Las Vegas | ",
 "Upcoming Nov 2 Men's · Florida at M25 Harlingen | ",
 "Upcoming Nov 5 Men's · Florida at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · Florida at ITA Conference Masters | ",
 "Upcoming Jan 8 Men's · Florida at Hidden Dual (Exhibition) | ",
 "Upcoming Jan 16 Men's · Florida vs Mercer | ",
 "Upcoming Jan 16 Men's · Florida vs Georgia Southern | ",
 "Upcoming Jan 22 Men's · Florida at ITA Kickoff | ",
 "Upcoming Jan 29 Men's · Florida at Florida State | ",
 "Upcoming Jan 31 Men's · Florida vs University of Central Florida | ",
 "Upcoming Feb 5 Men's · Florida at Baylor | ",
 "Upcoming Feb 7 Men's · Florida at Texas Christian | ",
 "Upcoming Feb 12 Men's · Florida at ITA Team Indoor Championships | ",
 "Upcoming Feb 25 Men's · Florida at University of Oklahoma | ",
 "Upcoming Mar 4 Men's · Florida vs Tennessee | ",
 "Upcoming Mar 6 Men's · Florida vs Auburn | ",
 "Upcoming Mar 6 Men's · Florida vs Coastal Carolina | ",
 "Upcoming Mar 11 Men's · Florida vs Georgia | ",
 "Upcoming Mar 18 Men's · Florida at LSU | ",
 "Upcoming Mar 20 Men's · Florida at Texas A&M | ",
 "Upcoming Mar 25 Men's · Florida vs Arkansas | ",
 "Upcoming Mar 27 Men's · Florida vs Alabama | ",
 "Upcoming Apr 1 Men's · Florida at Vanderbilt | ",
 "Upcoming Apr 9 Men's · Florida at South Carolina | ",
 "Upcoming Apr 16 Men's · Florida vs University of North Florida | ",
 "Upcoming Apr 16 Men's · Florida vs Kentucky | ",
 "Upcoming Apr 18 Men's · Florida vs Texas | ",
 "Upcoming Apr 18 Men's · Florida vs North Carolina A&T | ",
 "Upcoming Apr 21 Men's · Florida at SEC Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Florida at ITA All-American Championships | Completed",
 "Today Oct 5 Women's · Florida at W35 Las Vegas (Lake Las Vegas Open) | ",
 "Upcoming Oct 8 Women's · Florida at ITA Regional Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Jul 23 Florida at USATF Outdoor Championships | Completed"
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 30 Florida vs Stony Brook | W, 3-0",
 "Final Sep 1 Florida vs Minnesota | W, 3-1",
 "Final Sep 2 Florida at Wisconsin | L, 2-3",
 "Final Sep 5 Florida at Baylor | W, 3-0",
 "Final Sep 6 Florida at North Texas | W, 3-0",
 "Final Sep 9 Florida vs Miami | W, 3-0",
 "Final Sep 11 Florida vs Florida Atlantic | W, 3-1",
 "Final Sep 13 Florida vs Troy | W, 3-0",
 "Final Sep 18 Florida at Florida State | W, 3-1",
 "Final Sep 23 Florida vs Jacksonville | W, 3-0",
 "Final Sep 27 Florida at Oklahoma | W, 3-0",
 "Final Oct 2 Florida vs Tennessee | W, 3-0",
 "Final Oct 4 Florida vs Kentucky | W, 3-2",
 "Upcoming Oct 9, 8:00 PM Florida at Missouri | ",
 "Upcoming Oct 11, 2:00 PM Florida at Vanderbilt | ",
 "Upcoming Oct 16, 7:00 PM Florida at Texas A&M | ",
 "Upcoming Oct 18, 8:30 PM Florida at Texas | ",
 "Upcoming Oct 23, 7:00 PM Florida vs LSU | ",
 "Upcoming Oct 25, 1:00 PM Florida vs Ole Miss | ",
 "Upcoming Oct 30, 7:00 PM Florida at Auburn | ",
 "Upcoming Nov 1, 1:00 PM Florida vs Arkansas | ",
 "Upcoming Nov 6, 7:00 PM Florida vs South Carolina | ",
 "Upcoming Nov 8, 1:00 PM Florida vs Georgia | ",
 "Upcoming Nov 13, 7:00 PM Florida at Mississippi State | ",
 "Upcoming Nov 15, 3:00 PM Florida at Alabama | ",
 "Upcoming Nov 20 Florida at 2026 SEC Volleyball Tournament | "
]);
  // Each final matches only its own recap.
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");

  // A tied ranking ("#T3 Florida State") is dropped like any other.
  assert.ok(v_womenssoccer.some(e=>e.opponent==='Florida State')&&!v_womenssoccer.some(e=>/#/.test(e.title)));
  // Golf: the place with the field and the score to par ("T5/15 | (-27)").
  assert.deepEqual(v_mensgolf.find(e=>e.opponent==='Fighting Illini Collegiate').results,[{label:'Result',value:'T5th of 15'},{label:'To par',value:'-27'}]);
  // NCAA postseason events at home read "at".
  assert.deepEqual(v_baseball.filter(e=>/^NCAA/.test(e.opponent)).map(e=>e.title),['Florida at NCAA Regionals','Florida at NCAA Super Regionals','Florida at NCAA College World Series']);
}

// Cross Country: TFRRS confirms both teams' places at every meet.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/FL_college_f_Florida.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/FL_college_m_Florida.html','tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/28057/Kennesaw_State_Stan_Sims_Opener','tfrrs-28057.html.gz'],['https://www.tfrrs.org/results/xc/27812/John_McNichols_Invitational','tfrrs-27812.html.gz']])recapFixtures.set(url,fixture(file));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['Stan Sims XC Opener',"Women's team: 1st \u00b7 24 pts / Men's team: 1st \u00b7 33 pts",true],['John McNichols Invitational',"Women's team: 5th \u00b7 156 pts / Men's team: 2nd \u00b7 119 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Florida's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['Florida at Missouri','Final','L, 17-45']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Florida vs Kentucky','Final','W, 3-2']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Florida vs LSU','Final','L, 1-2']]);
}

// Records: each sport's overall and SEC record equals the one its page publishes.
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
    return holder?[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')]:null;
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug] of [['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']]){
    const [overall,conference]=published(slug);
    assert.deepEqual(record(sport,slug).map(r=>[r.text,r.conference?.text]),[[overall,conference]],`${sport}: the computed records are the official ones (${overall}, ${conference} SEC)`);
  }
  assert.deepEqual(['football','womens-volleyball','womens-soccer'].map(published),[['4-1','2-1'],['12-1','3-0'],['5-4-3','1-2-2']]);
}

// Other schools and other hosts never reach the Florida reader.
assert.equal(worker.floridaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://floridagators.com/',now),null);
assert.equal(worker.floridaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

// Tennis: the schedule links no stories; each past tournament takes its
// story from the archive (Princeton Invite: the Farnsworth Invitational story
// the event page links), and one without a story is not listed.
{
  const men=parse('Tennis','mens-tennis').filter(e=>e.status==='Final');
  assert.ok(men.every(worker.floridaHandlers.isFinalWithoutStory));
  recapFixtures.set('https://floridagators.com/sports/mens-tennis/archives',fixture('mens-tennis-archives.html.gz'));
  for(const file of ['story-2026-9-22-mens-tennis-multiple-gators-make-debuts-.html.gz','story-2026-9-23-mens-tennis-jefferson-advances-at-ita-al.html.gz','story-2026-9-24-mens-tennis-two-gators-set-to-compete-in.html.gz','story-2026-9-26-gators-mens-tennis-concludes-play-at-ita.html.gz','story-2026-9-28-mens-tennis-wraps-up-play-at-the-farnswo.html.gz','story-2026-10-4-mens-tennis-trifi-sancilio-timini-lead-g.html.gz']){
    const raw=fixture(file),path=raw.match(/<link[^>]+rel="canonical"[^>]+href="https:\/\/floridagators\.com(\/news\/[^"]+)"/)?.[1]||raw.match(/"url":"https:\/\/floridagators\.com(\/news\/\d+\/\d+\/\d+\/[a-z0-9-]+)"/)?.[1];
    if(path)recapFixtures.set(`https://floridagators.com${path}`,raw);
  }
  const fetchStory=worker.floridaHandlers.attachArchiveStory;
  for(const event of men)await fetchStory(event).catch(()=>event);
  assert.deepEqual(men.map(e=>[e.opponent,(e.recap_url||'').replace(/^.*\/news\//,'')]),[['ITA All-American Championships','2026/9/26/gators-mens-tennis-concludes-play-at-ita-all-americans'],['Princeton Invite','2026/9/28/mens-tennis-wraps-up-play-at-the-farnsworth-invitational'],['Bedford Cup','2026/10/4/mens-tennis-trifi-sancilio-timini-lead-gators-to-15-wins-at-bedford-cup']]);
  assert.ok(men.every(e=>!worker.floridaHandlers.isTennisWithoutStory(e)));
  delete men[0].recap_url;assert.equal(worker.floridaHandlers.isTennisWithoutStory(men[0]),true);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Florida module checks passed');
