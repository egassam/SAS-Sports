import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {alabamaSchool} from '../src/schools/alabama.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='alabama');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,alabamaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/alabama-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit rolltide.com routes, each
// corrected to the official pages (generic and homepage candidates dropped).
const sports=sponsoredSports['alabama'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',alabamaSchool.scheduleUrls],['roster',alabamaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('alabama|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'rolltide.com',`${key} must stay on rolltide.com`);
  }
}
const parity={"Baseball":{"schedule":["https://rolltide.com/sports/baseball/schedule"],"roster":["https://rolltide.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://rolltide.com/sports/mens-basketball/schedule","https://rolltide.com/sports/womens-basketball/schedule"],"roster":["https://rolltide.com/sports/mens-basketball/roster","https://rolltide.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://rolltide.com/sports/xctrack/schedule"],"roster":["https://rolltide.com/sports/xctrack/roster"],"combined":false},"Football":{"schedule":["https://rolltide.com/sports/football/schedule"],"roster":["https://rolltide.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://rolltide.com/sports/mens-golf/schedule","https://rolltide.com/sports/womens-golf/schedule"],"roster":["https://rolltide.com/sports/mens-golf/roster","https://rolltide.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://rolltide.com/sports/womens-gymnastics/schedule"],"roster":["https://rolltide.com/sports/womens-gymnastics/roster"],"combined":false},"Rowing":{"schedule":["https://rolltide.com/sports/womens-rowing/schedule"],"roster":["https://rolltide.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://rolltide.com/sports/womens-soccer/schedule"],"roster":["https://rolltide.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://rolltide.com/sports/softball/schedule"],"roster":["https://rolltide.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://rolltide.com/sports/swimming-and-diving/schedule"],"roster":["https://rolltide.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://rolltide.com/sports/mens-tennis/schedule","https://rolltide.com/sports/womens-tennis/schedule"],"roster":["https://rolltide.com/sports/mens-tennis/roster","https://rolltide.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://rolltide.com/sports/xctrack/schedule"],"roster":["https://rolltide.com/sports/xctrack/roster"],"combined":false},"Volleyball":{"schedule":["https://rolltide.com/sports/womens-volleyball/schedule"],"roster":["https://rolltide.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'alabama|"+sport+"':"),`${sport} routes must live in the Alabama module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://rolltide.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.alabamaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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
 "Upcoming Oct 17, 1:00 PM Alabama vs Georgia Tech (Exhibition) | ",
 "Upcoming Oct 23, 5:00 PM Alabama vs UAB (Exhibition) | ",
 "Upcoming Mar 19 Alabama vs Texas A&M | ",
 "Upcoming Mar 20 Alabama vs Texas A&M | ",
 "Upcoming Mar 21 Alabama vs Texas A&M | ",
 "Upcoming Mar 26 Alabama at Arkansas | ",
 "Upcoming Mar 27 Alabama at Arkansas | ",
 "Upcoming Mar 28 Alabama at Arkansas | ",
 "Upcoming Apr 2 Alabama vs Texas | ",
 "Upcoming Apr 3 Alabama vs Texas | ",
 "Upcoming Apr 4 Alabama vs Texas | ",
 "Upcoming Apr 9 Alabama at Missouri | ",
 "Upcoming Apr 10 Alabama at Missouri | ",
 "Upcoming Apr 11 Alabama at Missouri | ",
 "Upcoming Apr 16 Alabama vs South Carolina | ",
 "Upcoming Apr 17 Alabama vs South Carolina | ",
 "Upcoming Apr 18 Alabama vs South Carolina | ",
 "Upcoming Apr 23 Alabama at Ole Miss | ",
 "Upcoming Apr 24 Alabama at Ole Miss | ",
 "Upcoming Apr 25 Alabama at Ole Miss | ",
 "Upcoming Apr 30 Alabama vs Kentucky | ",
 "Upcoming May 1 Alabama vs Kentucky | ",
 "Upcoming May 2 Alabama vs Kentucky | ",
 "Upcoming May 7 Alabama at Georgia | ",
 "Upcoming May 8 Alabama at Georgia | ",
 "Upcoming May 9 Alabama at Georgia | ",
 "Upcoming May 14 Alabama vs Tennessee | ",
 "Upcoming May 15 Alabama vs Tennessee | ",
 "Upcoming May 16 Alabama vs Tennessee | ",
 "Upcoming May 20 Alabama at Auburn | ",
 "Upcoming May 21 Alabama at Auburn | ",
 "Upcoming May 22 Alabama at Auburn | ",
 "Upcoming May 25 Alabama at SEC Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 8, 6:30 PM Men's · Alabama vs Furman (Exhibition) | ",
 "Upcoming Oct 15, 7:00 PM Men's · Alabama vs Ole Miss (Exhibition) | ",
 "Upcoming Oct 22, 7:00 PM Men's · Alabama vs Auburn (Exhibition) | ",
 "Upcoming Nov 3 Men's · Alabama vs Sam Houston | ",
 "Upcoming Nov 6 Men's · Alabama vs Arkansas State | ",
 "Upcoming Nov 9 Men's · Alabama vs Oakland | ",
 "Upcoming Nov 13 Men's · Alabama vs Seton Hall | ",
 "Upcoming Nov 17 Men's · Alabama vs Kennesaw State | ",
 "Upcoming Nov 24 Men's · Alabama vs Baylor | ",
 "Upcoming Nov 26 Men's · Alabama at Players Era Festival | ",
 "Upcoming Dec 2 Men's · Alabama at Miami | ",
 "Upcoming Dec 8 Men's · Alabama vs Houston | ",
 "Upcoming Dec 12 Men's · Alabama vs St. John's | ",
 "Upcoming Dec 16 Men's · Alabama at South Florida | ",
 "Upcoming Dec 21 Men's · Alabama vs Iowa | ",
 "Upcoming Dec 29 Men's · Alabama vs Samford | ",
 "Upcoming Jan 2, 5:00 PM Men's · Alabama at Mississippi State | ",
 "Upcoming Jan 5, 6:00 PM Men's · Alabama vs LSU | ",
 "Upcoming Jan 9, 1:00 PM Men's · Alabama at Arkansas | ",
 "Upcoming Jan 13, 8:00 PM Men's · Alabama vs Ole Miss | ",
 "Upcoming Jan 16, 1:00 PM Men's · Alabama vs Florida | ",
 "Upcoming Jan 20, 5:00 PM Men's · Alabama at South Carolina | ",
 "Upcoming Jan 23, 7:30 PM Men's · Alabama vs Oklahoma | ",
 "Upcoming Jan 26, 8:00 PM Men's · Alabama at Missouri | ",
 "Upcoming Jan 30 Men's · Alabama vs Auburn | ",
 "Upcoming Feb 6, 1:00 PM Men's · Alabama at Kentucky | ",
 "Upcoming Feb 9, 6:00 PM Men's · Alabama at Texas | ",
 "Upcoming Feb 13, 7:00 PM Men's · Alabama vs Arkansas | ",
 "Upcoming Feb 16, 8:00 PM Men's · Alabama vs Mississippi State | ",
 "Upcoming Feb 20, 1:00 PM Men's · Alabama at Tennessee | ",
 "Upcoming Feb 23, 8:00 PM Men's · Alabama at Texas A&M | ",
 "Upcoming Feb 27, 7:30 PM Men's · Alabama vs Vanderbilt | ",
 "Upcoming Mar 3, 6:00 PM Men's · Alabama vs Georgia | ",
 "Upcoming Mar 6, 5:00 PM Men's · Alabama at Auburn | ",
 "Upcoming Mar 10 Men's · Alabama at 2027 SEC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 15, 12:00 PM Women's · Alabama vs UAH (Exhibition) | ",
 "Upcoming Oct 27, 6:00 PM Women's · Alabama vs Mississippi College (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Alabama vs Queens | ",
 "Upcoming Nov 4, 6:00 PM Women's · Alabama vs New Orleans | ",
 "Upcoming Nov 5, 6:00 PM Women's · Alabama vs Alabama A&M | ",
 "Upcoming Nov 8, 11:00 AM Women's · Alabama at Tulane | ",
 "Upcoming Nov 12, 6:00 PM Women's · Alabama at Memphis | ",
 "Upcoming Nov 15, 2:00 PM Women's · Alabama vs Mercer | ",
 "Upcoming Nov 19, 7:30 PM Women's · Alabama vs Florida A&M | ",
 "Upcoming Nov 21, 4:00 PM Women's · Alabama vs North Carolina | ",
 "Upcoming Nov 24, 6:00 PM Women's · Alabama vs ULM | ",
 "Upcoming Nov 25, 6:00 PM Women's · Alabama vs Samford | ",
 "Upcoming Dec 3, 6:00 PM Women's · Alabama vs Georgia Tech | ",
 "Upcoming Dec 6, 2:00 PM Women's · Alabama vs Tennessee State | ",
 "Upcoming Dec 14, 11:00 AM Women's · Alabama vs West Georgia | ",
 "Upcoming Dec 16, 6:00 PM Women's · Alabama vs Alcorn State | ",
 "Upcoming Dec 20, 12:00 PM Women's · Alabama vs Chattanooga | ",
 "Upcoming Dec 21, 2:00 PM Women's · Alabama vs Coastal Carolina | ",
 "Upcoming Dec 31 Women's · Alabama at South Carolina | ",
 "Upcoming Jan 3 Women's · Alabama vs Georgia | ",
 "Upcoming Jan 7 Women's · Alabama vs Florida | ",
 "Upcoming Jan 11 Women's · Alabama at Ole Miss | ",
 "Upcoming Jan 14 Women's · Alabama at Texas | ",
 "Upcoming Jan 21 Women's · Alabama vs LSU | ",
 "Upcoming Jan 24 Women's · Alabama at Tennessee | ",
 "Upcoming Jan 28 Women's · Alabama at Kentucky | ",
 "Upcoming Feb 1 Women's · Alabama vs Missouri | ",
 "Upcoming Feb 4 Women's · Alabama at Oklahoma | ",
 "Upcoming Feb 7 Women's · Alabama vs Auburn | ",
 "Upcoming Feb 11 Women's · Alabama vs Vanderbilt | ",
 "Upcoming Feb 14 Women's · Alabama at Arkansas | ",
 "Upcoming Feb 21 Women's · Alabama at Mississippi State | ",
 "Upcoming Feb 25 Women's · Alabama vs Ole Miss | ",
 "Upcoming Feb 28 Women's · Alabama vs Texas A&M | "
]);
  const v_crosscountry=parse("Cross Country","xctrack");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Alabama at City Auto Memphis Twilight Classic | Women's team: 3rd · 98 pts / Men's team: 3rd · 103 pts",
 "Final Sep 18 Alabama at Southern Showcase | Women's team: 1st · 28 pts / Men's team: 1st · 15 pts",
 "Final Sep 26 Alabama at Meadows Challenge | Women's team: 1st · 57 pts / Men's team: 1st · 42 pts",
 "Upcoming Oct 16 Alabama at Crimson Classic | ",
 "Upcoming Oct 30 Alabama at SEC Championships | ",
 "Upcoming Nov 13 Alabama at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Alabama at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Alabama vs East Carolina | W, 48-10",
 "Final Sep 12 Alabama at Kentucky | W, 45-17",
 "Final Sep 19 Alabama vs Florida State | W, 50-36",
 "Final Sep 26 Alabama vs South Carolina | W, 49-18",
 "Final Oct 3 Alabama at Mississippi State | W, 56-23",
 "Upcoming Oct 10, 6:30 PM Alabama vs Georgia | ",
 "Upcoming Oct 17, 2:30 PM Alabama at Tennessee | ",
 "Upcoming Oct 24 Alabama vs Texas A&M | ",
 "Upcoming Nov 7 Alabama at LSU | ",
 "Upcoming Nov 14 Alabama at Vanderbilt | ",
 "Upcoming Nov 21, 1:00 PM Alabama vs Chattanooga | ",
 "Upcoming Nov 28 Alabama vs Auburn | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Alabama at Folds of Honor Collegiate | 5th",
 "Final Sep 18 Men's · Alabama at Olympia Fields/Fighting Illini Invitational | 4th",
 "Final Sep 28 Men's · Alabama at Ben Hogan Collegiate | 1st",
 "Upcoming Oct 17 Men's · Alabama at Fallen Oak Collegiate | ",
 "Upcoming Feb 15 Men's · Alabama at Watersound Invitational | ",
 "Upcoming Mar 6 Men's · Alabama at The Hayt | ",
 "Upcoming Mar 19 Men's · Alabama at Linger Longer Invitational | ",
 "Upcoming Mar 29 Men's · Alabama at Maridoe Collegiate | ",
 "Upcoming Apr 12 Men's · Alabama at Mossy Oak Collegiate | ",
 "Upcoming Apr 21 Men's · Alabama at SEC Championships | ",
 "Upcoming May 17 Men's · Alabama at NCAA Regionals | ",
 "Upcoming May 28 Men's · Alabama at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 18 Women's · Alabama at Lady Paladin Invitational | 1st",
 "Final Oct 3 Women's · Alabama at Blessings Collegiate Invitational | 1st",
 "Upcoming Oct 12 Women's · Alabama at Haskins Intercollegiate | ",
 "Upcoming Oct 23 Women's · Alabama at Landfall Tradition | ",
 "Upcoming Feb 14 Women's · Alabama at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Alabama at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 20 Women's · Alabama at Florida State Match Up | ",
 "Upcoming Mar 27 Women's · Alabama at Liz Murphey Intercollegiate | ",
 "Upcoming Apr 4 Women's · Alabama at Country Club of Birmingham Women’s Collegiate Classic | ",
 "Upcoming Apr 17 Women's · Alabama at SEC Championships | ",
 "Upcoming May 10 Women's · Alabama at NCAA Regionals | ",
 "Upcoming May 21 Women's · Alabama at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 8 Alabama at Oregon State | ",
 "Upcoming Jan 15 Alabama at Auburn | ",
 "Upcoming Jan 22 Alabama at Quad Meet | ",
 "Upcoming Jan 29 Alabama at Arkansas | ",
 "Upcoming Feb 5 Alabama at Florida | ",
 "Upcoming Feb 12 Alabama at Missouri | ",
 "Upcoming Feb 14 Alabama at Auburn | ",
 "Upcoming Feb 14 Alabama at Illinois | ",
 "Upcoming Feb 14 Alabama at North Carolina | ",
 "Upcoming Feb 19 Alabama at LSU | ",
 "Upcoming Feb 26 Alabama at Kentucky | ",
 "Upcoming Mar 7 Alabama at Oklahoma | ",
 "Upcoming Mar 14 Alabama at Georgia | ",
 "Upcoming Mar 20 Alabama at SEC Championship | ",
 "Upcoming Mar 31 Alabama at NCAA Regionals | ",
 "Upcoming Apr 15 Alabama at NCAA Championships | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Alabama at LSU (Exhibition) | T, 1-1",
 "Final Aug 12 Alabama at Saint Louis | W, 2-1",
 "Final Aug 15 Alabama at Memphis | W, 2-1",
 "Final Aug 20 Alabama vs TCU | W, 3-2",
 "Final Aug 23 Alabama at Nebraska | W, 2-0",
 "Final Aug 27 Alabama vs Troy | W, 3-0",
 "Final Aug 30 Alabama vs South Alabama | W, 3-0",
 "Final Sep 3 Alabama vs Samford | W, 1-0",
 "Final Sep 6 Alabama vs Harvard | L, 4-6",
 "Final Sep 11 Alabama at Auburn | W, 1-0",
 "Final Sep 18 Alabama vs Arkansas | W, 2-0",
 "Final Sep 24 Alabama at Texas A&M | W, 1-0",
 "Final Sep 27 Alabama at Oklahoma | W, 3-1",
 "Final Oct 2 Alabama vs Ole Miss | W, 2-0",
 "Upcoming Oct 8, 6:00 PM Alabama at Florida | ",
 "Upcoming Oct 15, 6:00 PM Alabama vs Georgia | ",
 "Upcoming Oct 18, 6:00 PM Alabama vs Vanderbilt | ",
 "Upcoming Oct 23, 7:00 PM Alabama vs Tennessee | ",
 "Upcoming Nov 1, 12:00 PM Alabama at Mississippi State | ",
 "Upcoming Nov 8 Alabama at SEC Tournament | ",
 "Upcoming Nov 20 Alabama at NCAA 1st Round | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 11, 1:30 PM Alabama vs Northeast Alabama CC (Exhibition) | ",
 "Upcoming Oct 17, 1:30 PM Alabama vs Jones College/West Alabama (DH) (Exhibition) | ",
 "Upcoming Oct 18, 1:00 PM Alabama vs University of Mobile (Exhibition) | ",
 "Upcoming Oct 25, 2:00 PM Alabama at Itawamba CC/Southern Miss (DH) (Exhibition) | ",
 "Upcoming Nov 13, 6:00 PM Alabama vs Auburn (Exhibition) | ",
 "Upcoming Mar 19 Alabama vs Texas A&M | ",
 "Upcoming Mar 20 Alabama vs Texas A&M | ",
 "Upcoming Mar 21 Alabama vs Texas A&M | ",
 "Upcoming Mar 26 Alabama at Texas | ",
 "Upcoming Mar 27 Alabama at Texas | ",
 "Upcoming Mar 28 Alabama at Texas | ",
 "Upcoming Apr 2 Alabama vs Ole Miss | ",
 "Upcoming Apr 3 Alabama vs Ole Miss | ",
 "Upcoming Apr 4 Alabama vs Ole Miss | ",
 "Upcoming Apr 9 Alabama at Mississippi State | ",
 "Upcoming Apr 10 Alabama at Mississippi State | ",
 "Upcoming Apr 11 Alabama at Mississippi State | ",
 "Upcoming Apr 16 Alabama at Georgia | ",
 "Upcoming Apr 17 Alabama at Georgia | ",
 "Upcoming Apr 18 Alabama at Georgia | ",
 "Upcoming Apr 23 Alabama vs Florida | ",
 "Upcoming Apr 24 Alabama vs Florida | ",
 "Upcoming Apr 25 Alabama vs Florida | ",
 "Upcoming Apr 30 Alabama vs LSU | ",
 "Upcoming May 1 Alabama vs LSU | ",
 "Upcoming May 2 Alabama vs LSU | ",
 "Upcoming May 6 Alabama at Oklahoma | ",
 "Upcoming May 7 Alabama at Oklahoma | ",
 "Upcoming May 8 Alabama at Oklahoma | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 Alabama at College Swimming League Match #2 | 3rd · 263 pts",
 "Final Oct 3 Alabama vs Delta State | Women's team: W, 253-33 / Men's team: W, 248-41",
 "Upcoming Oct 23, 5:30 PM Alabama at College Swimming League Match #6 | ",
 "Upcoming Oct 28 Alabama at SCM World Trials | ",
 "Upcoming Oct 30 Alabama vs University of Miami | ",
 "Upcoming Nov 5 Alabama at College Swimming League Wildcard | ",
 "Upcoming Nov 6 Alabama at College Swimming League Championships | ",
 "Upcoming Nov 19 Alabama at UGA Invitational | ",
 "Upcoming Dec 2 Alabama at US Open | ",
 "Upcoming Jan 9 Alabama vs Kentucky | ",
 "Upcoming Jan 29 Alabama at Auburn | ",
 "Upcoming Feb 14 Alabama at SEC Championships | ",
 "Upcoming Mar 7 Alabama at NCAA Diving Championships | ",
 "Upcoming Mar 17 Alabama at NCAA Championships | ",
 "Upcoming Mar 24 Alabama at NCAA Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Alabama at SEC StarkVegas Showdown | Completed",
 "Final Sep 19 Men's · Alabama at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Alabama at Blue Gray National Tennis Classic | Completed",
 "Upcoming Oct 8 Men's · Alabama at ITA Regional Championships | ",
 "Upcoming Oct 19 Men's · Alabama at UTSA M15 | ",
 "Upcoming Oct 26 Men's · Alabama at USTA M25 | ",
 "Upcoming Nov 5 Men's · Alabama at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · Alabama at Alabama Four-in-the-Fall | ",
 "Upcoming Nov 16 Men's · Alabama at UTR PTT Tuscaloosa | ",
 "Upcoming Nov 17 Men's · Alabama at NCAA Individual Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Alabama at ITA All-American Championship | Completed",
 "Upcoming Oct 8 Women's · Alabama at ITA Southern Regional Championships | ",
 "Upcoming Oct 30 Women's · Alabama at Roberta Alison Fall Classic | ",
 "Upcoming Nov 5 Women's · Alabama at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Alabama at NCAA Championships | "
]);
  const v_trackfield=parse("Track & Field","xctrack");
  assert.deepEqual(v_trackfield.map(line),[
 "Upcoming Dec 4 Alabama at BU Opener | ",
 "Upcoming Jan 15 Alabama at UAB Blazer Open | ",
 "Upcoming Jan 22 Alabama at Samford Invitational | ",
 "Upcoming Jan 29 Alabama at PNC Lenny Lyles Open | ",
 "Upcoming Jan 29 Alabama at Bob Pollock Invitational | ",
 "Upcoming Feb 6 Alabama at Curtis Frye Invitational | ",
 "Upcoming Feb 12 Alabama at Tiger Paw Invitational | ",
 "Upcoming Feb 12 Alabama at Don Kirby Elite Invitational | ",
 "Upcoming Feb 12 Alabama at Husky Classic | ",
 "Upcoming Feb 26 Alabama at SEC Indoor Championships | ",
 "Upcoming Mar 12 Alabama at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Alabama at Raleigh Relays | ",
 "Upcoming Mar 26 Alabama at Alumni Bulldog Relays | ",
 "Upcoming Apr 2 Alabama at Dick Roberts Seminole Invite | ",
 "Upcoming Apr 9 Alabama at Crimson Tide Invitational | ",
 "Upcoming Apr 15 Alabama at Bryan Clay Invitational | ",
 "Upcoming Apr 24 Alabama at LSU Alumni Gold | ",
 "Upcoming Apr 30 Alabama at Torrin Lawrence Memorial | ",
 "Upcoming May 13 Alabama at SEC Outdoor Championships | ",
 "Upcoming May 26 Alabama at NCAA East Preliminary | ",
 "Upcoming Jun 9 Alabama at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Alabama vs Samford | W, 3-1",
 "Final Aug 29 Alabama vs UC Riverside | W, 3-0",
 "Final Sep 3 Alabama vs Northwestern | L, 1-3",
 "Final Sep 4 Alabama vs Iowa | W, 3-1",
 "Final Sep 7 Alabama vs Grambling State | W, 3-0",
 "Final Sep 9 Alabama at Virginia | W, 3-1",
 "Final Sep 16 Alabama vs Alcorn State | W, 3-0",
 "Final Sep 17 Alabama vs Jacksonville State | W, 3-2",
 "Final Sep 19 Alabama vs Southern | W, 3-0",
 "Final Sep 23 Alabama at LSU | L, 2-3",
 "Final Sep 27 Alabama vs Ole Miss | L, 0-3",
 "Final Oct 2 Alabama at Texas A&M | L, 0-3",
 "Final Oct 4 Alabama at Texas | L, 1-3",
 "Upcoming Oct 9, 6:00 PM Alabama vs South Carolina | ",
 "Upcoming Oct 11, 2:00 PM Alabama vs Georgia | ",
 "Upcoming Oct 16, 7:00 PM Alabama at Vanderbilt | ",
 "Upcoming Oct 18, 2:00 PM Alabama at Missouri | ",
 "Upcoming Oct 23, 6:00 PM Alabama vs Arkansas | ",
 "Upcoming Oct 25, 2:00 PM Alabama vs Oklahoma | ",
 "Upcoming Nov 1, 2:00 PM Alabama vs Mississippi State | ",
 "Upcoming Nov 6, 7:00 PM Alabama at Kentucky | ",
 "Upcoming Nov 8, 1:00 PM Alabama at Tennessee | ",
 "Upcoming Nov 11, 8:00 PM Alabama vs Auburn | ",
 "Upcoming Nov 15, 2:00 PM Alabama vs Florida | "
]);
  // Each final matches only its own recap.
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country xctrack");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackfield,"Track & Field xctrack");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");

  // Cross country and track share one page; each entry names its season.
  assert.ok(v_crosscountry.length===7&&v_trackfield.length===21&&v_trackfield.every(e=>e.start_time>='2026-12'));
  // Golf: the place with the rounds and total ("5th (284-279-281/844)").
  assert.deepEqual(v_mensgolf.find(e=>e.opponent==='Folds of Honor Collegiate').results,[{label:'Result',value:'5th'},{label:'Team score',value:'844 (284-279-281)'}]);
  // Swimming: a dual per team (the scores decide: the page wrote "M" for a
  // win) and a league match place; a league match is "at".
  assert.deepEqual(v_swimminganddiving.filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[['Alabama at College Swimming League Match #2','3rd · 263 pts'],['Alabama vs Delta State',"Women's team: W, 253-33 / Men's team: W, 248-41"]]);
}

// Cross Country: TFRRS confirms both teams' places at every meet.
{
  const xc=parse('Cross Country','xctrack').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/AL_college_f_Alabama.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/AL_college_m_Alabama.html','tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/27903/City_Auto_MEMPHIS_TWILIGHT_XC_CLASSIC','tfrrs-27903.html.gz'],['https://www.tfrrs.org/results/xc/27306/Southern_Showcase_University_College_','tfrrs-27306.html.gz'],['https://www.tfrrs.org/results/xc/28023/Princeton_Meadows_Classic','tfrrs-28023.html.gz']])recapFixtures.set(url,fixture(file));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['City Auto Memphis Twilight Classic',"Women's team: 3rd \u00b7 98 pts / Men's team: 3rd \u00b7 103 pts",true],['Southern Showcase',"Women's team: 1st \u00b7 28 pts / Men's team: 1st \u00b7 15 pts",true],['Meadows Challenge',"Women's team: 1st \u00b7 57 pts / Men's team: 1st \u00b7 42 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Alabama's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['Alabama at Mississippi St','Final','W, 56-23']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Alabama at Texas','Final','L, 1-3']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Alabama vs Ole Miss','Final','W, 2-0']]);
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
  assert.deepEqual(['football','womens-volleyball','womens-soccer'].map(published),[['5-0','3-0'],['8-5','0-4'],['12-1','5-0']]);
}

// Other schools and other hosts never reach the Alabama reader.
assert.equal(worker.alabamaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://rolltide.com/',now),null);
assert.equal(worker.alabamaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Alabama module checks passed');
