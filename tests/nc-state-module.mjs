import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ncStateSchool} from '../src/schools/nc-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {golfStoryPlace,institutionShortName,meetTeamPlaces} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='nc-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ncStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/nc-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gopack.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['nc-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',ncStateSchool.scheduleUrls],['roster',ncStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('nc-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gopack.com',`${key} must stay on gopack.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gopack.com/sports/baseball/schedule"],"roster":["https://gopack.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gopack.com/sports/mens-basketball/schedule","https://gopack.com/sports/womens-basketball/schedule"],"roster":["https://gopack.com/sports/mens-basketball/roster","https://gopack.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gopack.com/sports/cross-country/schedule"],"roster":["https://gopack.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gopack.com/sports/football/schedule"],"roster":["https://gopack.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gopack.com/sports/womens-golf/schedule","https://gopack.com/sports/mens-golf/schedule"],"roster":["https://gopack.com/sports/womens-golf/roster","https://gopack.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://gopack.com/sports/womens-gymnastics/schedule"],"roster":["https://gopack.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://gopack.com/sports/womens-soccer/schedule","https://gopack.com/sports/mens-soccer/schedule"],"roster":["https://gopack.com/sports/womens-soccer/roster","https://gopack.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gopack.com/sports/softball/schedule"],"roster":["https://gopack.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gopack.com/sports/swimming-and-diving/schedule"],"roster":["https://gopack.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gopack.com/sports/womens-tennis/schedule","https://gopack.com/sports/mens-tennis/schedule"],"roster":["https://gopack.com/sports/womens-tennis/roster","https://gopack.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gopack.com/sports/track-and-field/schedule"],"roster":["https://gopack.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gopack.com/sports/womens-volleyball/schedule"],"roster":["https://gopack.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gopack.com/sports/wrestling/schedule"],"roster":["https://gopack.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'nc-state|"+sport+"':"),`${sport} routes must live in the NC State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://gopack.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ncStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=nc-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 4:00 PM Men's · NC State vs Mississippi State (Exhibition) | ",
 "Upcoming Oct 24, 12:00 PM Men's · NC State vs Lenoir-Rhyne (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · NC State vs Campbell | ",
 "Upcoming Nov 6, 7:00 PM Men's · NC State vs ETSU | ",
 "Upcoming Nov 10, 7:00 PM Men's · NC State vs Presbyterian | ",
 "Upcoming Nov 13, 7:00 PM Men's · NC State vs Troy | ",
 "Upcoming Nov 19, 6:00 PM Men's · NC State vs Murray State | ",
 "Upcoming Nov 20 Men's · NC State vs Seton Hall or Wisconsin | ",
 "Upcoming Nov 25, 7:00 PM Men's · NC State vs Norfolk State | ",
 "Upcoming Nov 28, 12:00 PM Men's · NC State vs Elon | ",
 "Upcoming Dec 1, 7:00 PM Men's · NC State vs South Carolina | ",
 "Upcoming Dec 6, 7:00 PM Men's · NC State vs Tennessee | ",
 "Upcoming Dec 11, 7:00 PM Men's · NC State vs UNCG | ",
 "Upcoming Dec 15, 7:00 PM Men's · NC State vs North Carolina | ",
 "Upcoming Dec 19, 7:00 PM Men's · NC State vs Ole Miss | ",
 "Upcoming Dec 22, 1:00 PM Men's · NC State vs Alabama A&M | ",
 "Upcoming Dec 29, 8:00 PM Men's · NC State at Miami | ",
 "Upcoming Jan 2, 1:00 PM Men's · NC State vs Clemson | ",
 "Upcoming Jan 6, 7:00 PM Men's · NC State vs Pitt | ",
 "Upcoming Jan 9, 12:00 PM Men's · NC State at North Carolina | ",
 "Upcoming Jan 12, 9:00 PM Men's · NC State vs SMU | ",
 "Upcoming Jan 19, 9:00 PM Men's · NC State at Georgia Tech | ",
 "Upcoming Jan 23, 12:00 PM Men's · NC State vs Wake Forest | ",
 "Upcoming Jan 27, 9:00 PM Men's · NC State at Cal | ",
 "Upcoming Jan 30, 8:00 PM Men's · NC State at Stanford | ",
 "Upcoming Feb 3, 6:00 PM Men's · NC State vs Florida State | ",
 "Upcoming Feb 10, 7:00 PM Men's · NC State at Wake Forest | ",
 "Upcoming Feb 13, 1:00 PM Men's · NC State vs Boston College | ",
 "Upcoming Feb 17, 7:00 PM Men's · NC State at Virginia Tech | ",
 "Upcoming Feb 20, 12:00 PM Men's · NC State vs Cal | ",
 "Upcoming Feb 24, 7:00 PM Men's · NC State vs Notre Dame | ",
 "Upcoming Feb 27, 12:00 PM Men's · NC State at Duke | ",
 "Upcoming Mar 2, 7:00 PM Men's · NC State vs Louisville | ",
 "Upcoming Mar 6, 12:00 PM Men's · NC State at Virginia | ",
 "Upcoming Mar 9 Men's · NC State at ACC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 8 Women's · NC State vs High Point (Exhibition) | W, 72-53",
 "Upcoming Oct 24, 3:00 PM Women's · NC State vs UNCW (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · NC State vs Wofford | ",
 "Upcoming Nov 4, 6:00 PM Women's · NC State vs Campbell | ",
 "Upcoming Nov 8, 3:00 PM Women's · NC State vs Kentucky | ",
 "Upcoming Nov 11, 7:00 PM Women's · NC State vs Liberty | ",
 "Upcoming Nov 15, 1:00 PM Women's · NC State at Seton Hall | ",
 "Upcoming Nov 19, 7:00 PM Women's · NC State vs Georgetown | ",
 "Upcoming Nov 22, 3:00 PM Women's · NC State vs Coastal Carolina | ",
 "Upcoming Nov 27, 7:00 PM Women's · NC State vs Kansas State | ",
 "Upcoming Nov 28, 4:30 PM Women's · NC State vs LSU | ",
 "Upcoming Dec 2, 7:15 PM Women's · NC State at Ole Miss | ",
 "Upcoming Dec 6, 6:00 PM Women's · NC State vs Davidson | ",
 "Upcoming Dec 9, 7:00 PM Women's · NC State vs Jacksonville | ",
 "Upcoming Dec 13, 6:00 PM Women's · NC State at North Carolina | ",
 "Upcoming Dec 17, 6:00 PM Women's · NC State at Florida State | ",
 "Upcoming Dec 20, 12:00 PM Women's · NC State vs Navy | ",
 "Upcoming Dec 31, 2:00 PM Women's · NC State vs Miami | ",
 "Upcoming Jan 3, 3:00 PM Women's · NC State vs Duke | ",
 "Upcoming Jan 7, 9:00 PM Women's · NC State at Cal | ",
 "Upcoming Jan 10, 2:00 PM Women's · NC State at Stanford | ",
 "Upcoming Jan 14, 7:00 PM Women's · NC State vs Virginia Tech | ",
 "Upcoming Jan 18, 4:00 PM Women's · NC State at Georgia Tech | ",
 "Upcoming Jan 24, 12:00 PM Women's · NC State vs Wake Forest | ",
 "Upcoming Jan 28, 7:30 PM Women's · NC State at SMU | ",
 "Upcoming Feb 1, 6:00 PM Women's · NC State vs Virginia | ",
 "Upcoming Feb 4, 7:00 PM Women's · NC State vs Pitt | ",
 "Upcoming Feb 7, 12:00 PM Women's · NC State at Syracuse | ",
 "Upcoming Feb 11, 7:00 PM Women's · NC State vs Boston College | ",
 "Upcoming Feb 18, 8:00 PM Women's · NC State vs Notre Dame | ",
 "Upcoming Feb 21, 2:00 PM Women's · NC State at Louisville | ",
 "Upcoming Feb 25, 6:00 PM Women's · NC State at Wake Forest | ",
 "Upcoming Feb 28, 12:00 PM Women's · NC State vs Clemson | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 18 NC State at Adidas XC Challenge | Women's team: 1st · 21 pts / Men's team: 2nd · 66 pts",
 "Final Oct 2 NC State at Dill Family Foundation Invitational | Completed",
 "Final Oct 2 NC State at Joe Piane Invitational | Women's team: 1st · 39 pts / Men's team: 3rd · 110 pts",
 "Upcoming Oct 16, 10:30 AM NC State at Pre-Nationals | ",
 "Upcoming Oct 30 NC State at ACC Championships | ",
 "Upcoming Nov 13 NC State at NCAA Southeast Regionals | ",
 "Upcoming Nov 21, 11:30 AM NC State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 NC State at Virginia | L, 8-34",
 "Final Sep 11 NC State vs Richmond | W, 73-0",
 "Final Sep 19 NC State at Vanderbilt | L, 31-35",
 "Final Sep 26 NC State vs Appalachian State | W, 41-31",
 "Final Oct 3 NC State vs Louisville | W, 31-28",
 "Final Oct 10 NC State vs Wake Forest | L, 14-38",
 "Upcoming Oct 23, 10:30 PM NC State at Stanford | ",
 "Upcoming Oct 31 NC State vs California | ",
 "Upcoming Nov 7 NC State vs Duke | ",
 "Upcoming Nov 14 NC State vs Syracuse | ",
 "Upcoming Nov 21 NC State at Florida State | ",
 "Upcoming Nov 28 NC State at North Carolina | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · NC State at Cougar Classic | 13th of 18",
 "Final Sep 14 Women's · NC State at Pirate Collegiate Classic | 1st of 13",
 "Final Sep 29 Women's · NC State at NB3 Matchplay | 2nd of 4",
 "Upcoming Oct 16 Women's · NC State at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 23 Women's · NC State at Landall Tradition | ",
 "Upcoming Jan 31 Women's · NC State at Dominican Republic Classic | ",
 "Upcoming Mar 1 Women's · NC State at Daniel Island Invitational | ",
 "Upcoming Mar 15 Women's · NC State at Briar's Creek Invitational | ",
 "Upcoming Mar 21 Women's · NC State at City of Oaks Collegiate | ",
 "Upcoming Apr 5 Women's · NC State at Hokie Highlander Invitational | ",
 "Upcoming Apr 15 Women's · NC State at ACC Championship | ",
 "Upcoming May 10 Women's · NC State at NCAA Regional Championship | ",
 "Upcoming May 21 Women's · NC State at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · NC State at Visit Knoxville Collegiate | 14th of 17",
 "Final Sep 13 Men's · NC State at JT Poston Invitational | T2nd of 17",
 "Final Sep 29 Men's · NC State at NB3 Matchplay | Completed",
 "Final Oct 5 Men's · NC State at Cullan Brown Collegiate | 3rd of 15",
 "Upcoming Oct 18 Men's · NC State at The Williams Cup Presented by STITCH | ",
 "Upcoming Feb 15 Men's · NC State at Watersound Invitational | ",
 "Upcoming Mar 15 Men's · NC State at The Johnnie-O | ",
 "Upcoming Mar 21 Men's · NC State at Collegiate Players Championship | ",
 "Upcoming Apr 2 Men's · NC State at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · NC State at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 22 Men's · NC State at ACC Championship | ",
 "Upcoming May 17 Men's · NC State at NCAA Regional | ",
 "Upcoming May 28 Men's · NC State at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · NC State at James Madison | W, 3-1",
 "Final Aug 16 Women's · NC State at VCU | W, 4-0",
 "Final Aug 20 Women's · NC State vs Charlotte | W, 4-1",
 "Final Aug 23 Women's · NC State vs Elon | W, 2-1",
 "Final Aug 27 Women's · NC State at High Point | W, 3-0",
 "Final Aug 30 Women's · NC State vs Davidson | W, 6-1",
 "Final Sep 3 Women's · NC State at Western Carolina | W, 2-0",
 "Final Sep 6 Women's · NC State at Campbell | T, 1-1",
 "Final Sep 11 Women's · NC State at Florida State | T, 2-2",
 "Final Sep 17 Women's · NC State vs SMU | W, 4-2",
 "Final Sep 20 Women's · NC State vs Miami | L, 1-2",
 "Final Sep 27 Women's · NC State vs Virginia Tech | W, 3-0",
 "Final Oct 4 Women's · NC State at Wake Forest | L, 1-3",
 "Final Oct 8 Women's · NC State vs Pittsburgh | L, 0-1",
 "Today Oct 15, 6:00 PM Women's · NC State vs Syracuse | ",
 "Upcoming Oct 24, 5:00 PM Women's · NC State at Duke | ",
 "Upcoming Oct 29, 10:00 PM Women's · NC State at Stanford | ",
 "Upcoming Nov 1, 4:00 PM Women's · NC State at California | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · NC State vs Coastal Carolina | T, 0-0",
 "Final Aug 23 Men's · NC State vs Queens | W, 2-1",
 "Final Aug 27 Men's · NC State at Florida International | L, 1-2",
 "Final Aug 30 Men's · NC State at Florida Atlantic | T, 3-3",
 "Final Sep 5 Men's · NC State vs Virginia Tech | T, 1-1",
 "Final Sep 10 Men's · NC State vs Duke | W, 3-1",
 "Final Sep 15 Men's · NC State vs UNCW | W, 1-0",
 "Final Sep 18 Men's · NC State at SMU | L, 0-1",
 "Final Sep 25 Men's · NC State vs Wake Forest | L, 1-2",
 "Final Oct 2 Men's · NC State at Louisville | L, 1-2",
 "Final Oct 7 Men's · NC State at UNC Greensboro | L, 1-3",
 "Final Oct 11 Men's · NC State vs UMKC | W, 3-0",
 "Final Oct 14 Men's · NC State vs Mercer | W, 3-0",
 "Upcoming Oct 18, 5:00 PM Men's · NC State at California | ",
 "Upcoming Oct 24, 6:00 PM Men's · NC State vs Stanford | ",
 "Upcoming Oct 30, 7:00 PM Men's · NC State at North Carolina | ",
 "Upcoming Nov 4 Men's · NC State at ACC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 NC State at College Swimming League - Match 2 | Completed",
 "Upcoming Oct 16 NC State at Cal/ Stanford (Diving Only) | ",
 "Upcoming Oct 16, 2:00 PM NC State at College Swimming League - Match 5 | ",
 "Upcoming Oct 23, 5:00 PM NC State at North Carolina Wilmington | ",
 "Upcoming Oct 29 NC State at USA SCM World Trials | ",
 "Upcoming Nov 6, 2:00 PM NC State at College Swimming League - Wild Card | ",
 "Upcoming Nov 7, 4:00 PM NC State at College Swimming League - Championship | ",
 "Upcoming Nov 18 NC State at Wolfpack Elite GAC Invite | ",
 "Upcoming Nov 20 NC State at Georgia Invite (Diving Only) | ",
 "Upcoming Dec 2 NC State at US Open | ",
 "Upcoming Dec 9 NC State at Winter USA Diving Nationals | ",
 "Upcoming Jan 7 NC State at Tennessee Diving Invite | ",
 "Upcoming Jan 15 NC State vs North Carolina | ",
 "Upcoming Jan 22, 4:00 PM NC State at Virginia | ",
 "Upcoming Jan 23 NC State at Virginia Tech | ",
 "Upcoming Jan 29 NC State vs Gardner-Webb & ECU Women | ",
 "Upcoming Feb 16, 9:00 AM NC State at ACC Championships | ",
 "Upcoming Feb 26 NC State at Auburn Last Chance Invitational | ",
 "Upcoming Mar 6 NC State at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 17 NC State at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 NC State at NCAA Men's Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · NC State at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 19 Women's · NC State at ITA All-American Championships | Completed",
 "Today Oct 15 Women's · NC State at ITA Carolina Regional Championships | ",
 "Upcoming Nov 6 Women's · NC State at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · NC State at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · NC State at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · NC State at ITA Regionals | Completed",
 "Upcoming Nov 5 Men's · NC State at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · NC State at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · NC State at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 NC State vs Stony Brook | W, 3-0",
 "Final Aug 29 NC State vs Robert Morris | W, 3-0",
 "Final Aug 30 NC State at UCF | L, 0-3",
 "Final Sep 4 NC State vs George Washington | W, 3-0",
 "Final Sep 5 NC State vs Wofford | W, 3-2",
 "Final Sep 6 NC State vs Charlotte | W, 3-2",
 "Final Sep 8 NC State at LSU | W, 3-2",
 "Final Sep 13 NC State vs Belmont | W, 3-0",
 "Final Sep 15 NC State vs App State | W, 3-0",
 "Final Sep 19 NC State vs Indiana | L, 1-3",
 "Final Sep 20 NC State at Coastal Carolina | W, 3-2",
 "Final Sep 25 NC State vs UNC | L, 1-3",
 "Final Sep 27 NC State vs Duke | W, 3-1",
 "Final Oct 2 NC State at Florida State | L, 0-3",
 "Final Oct 4 NC State at Miami | L, 0-3",
 "Final Oct 9 NC State vs Syracuse | W, 3-1",
 "Final Oct 11 NC State vs Boston College | W, 3-1",
 "Upcoming Oct 16, 10:00 PM NC State at Cal | ",
 "Upcoming Oct 18, 4:00 PM NC State at Stanford | ",
 "Upcoming Oct 23, 6:00 PM NC State vs Wake Forest | ",
 "Upcoming Oct 25, 1:00 PM NC State at Wake Forest | ",
 "Upcoming Oct 30, 7:00 PM NC State vs SMU | ",
 "Upcoming Nov 1, 1:00 PM NC State vs Pitt | ",
 "Upcoming Nov 6, 7:00 PM NC State at Georgia Tech | ",
 "Upcoming Nov 8, 1:00 PM NC State at Clemson | ",
 "Upcoming Nov 13, 7:00 PM NC State vs Virginia Tech | ",
 "Upcoming Nov 15, 1:00 PM NC State vs Virginia | ",
 "Upcoming Nov 20, 6:30 PM NC State at Notre Dame | ",
 "Upcoming Nov 22, 12:00 PM NC State at Louisville | ",
 "Upcoming Nov 25, 1:00 PM NC State vs Miami | ",
 "Upcoming Nov 28, 1:00 PM NC State at Pitt | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 NC State vs Southeast Open | ",
 "Upcoming Nov 8 NC State at JourneyMen Collegiate Classic | ",
 "Upcoming Nov 12 NC State vs Navy | ",
 "Upcoming Nov 20 NC State vs Ohio State | ",
 "Upcoming Dec 6 NC State vs George Mason Patriot Open | ",
 "Upcoming Dec 11 NC State at National Duals Invitational | ",
 "Upcoming Dec 18 NC State at Buffalo | ",
 "Upcoming Dec 20 NC State at Cornell | ",
 "Upcoming Jan 2 NC State at Southern Scuffle | ",
 "Upcoming Jan 8 NC State vs Duke | ",
 "Upcoming Jan 15 NC State vs Stanford | ",
 "Upcoming Jan 22 NC State vs App State | ",
 "Upcoming Jan 29 NC State at North Carolina | ",
 "Upcoming Feb 5 NC State at Virginia | ",
 "Upcoming Feb 12 NC State vs Pittsburgh | ",
 "Upcoming Feb 19 NC State at Virginia Tech | ",
 "Upcoming Mar 6 NC State at ACC Championships | ",
 "Upcoming Mar 18 NC State at NCAA Championships | "
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
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Golf: women's cards publish the place with the score to par ("13th/18
// (+21)") and match play's final standing ("finished 2nd/4 teams"); the men's
// NB3 Matchplay card lists only its matches, so the final story's headline
// gives the place ("Men's Golf Closes NB3 Matchplay in Second Place"). A
// player's story ("Madsen on Top") gives none.
{
  const h=worker.ncStateHandlers,team="(?:Wolfpack|Pack(?: Men| Women)?|NC State|(?:Men's|Women's) Golf)";
  assert.deepEqual(['recap-2026-9-30-mens-golf-mens-golf-closes-nb3-matchplay','recap-2026-9-30-womens-golf-womens-golf-finishes-second-','recap-2026-10-6-mens-golf-pack-men-close-strong-to-finis','recap-2026-9-15-womens-golf-womens-golf-madsen-on-top-at'].map(name=>golfStoryPlace(fixture(`${name}.html.gz`),{team,decode:worker.decodeHtml})),['2nd','2nd','3rd',null]);
  // A headline alone gives the place (the kit's rule, as Florida State's
  // "Seminoles Win Folds of Honor" and "Seminoles Finish Fifth").
  const titled=title=>golfStoryPlace(`<meta property="og:title" content="${title}">`,{team,decode:worker.decodeHtml});
  assert.deepEqual(['Pack Wins Landfall Tradition','Wolfpack Finishes T-4th at Williams Cup','Pack Places Ninth at Watersound','Madsen Finishes Second'].map(titled),['1st','T4th','9th',null]);
  const listed=[];
  for(const slug of ['womens-golf','mens-golf'])for(const event of parse('Golf',slug).filter(e=>e.status==='Final')){
    if(event.recap_url&&!recapFixtures.has(event.recap_url))recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
    if(h.isGolfAwaitingPlace(event))await h.attachGolfPlace(event);
    if(!h.isGolfWithoutStory(event))listed.push(line(event));
  }
  assert.deepEqual(listed,["Final Sep 7 Women's · NC State at Cougar Classic | 13th of 18","Final Sep 14 Women's · NC State at Pirate Collegiate Classic | 1st of 13","Final Sep 29 Women's · NC State at NB3 Matchplay | 2nd of 4","Final Aug 31 Men's · NC State at Visit Knoxville Collegiate | 14th of 17","Final Sep 13 Men's · NC State at JT Poston Invitational | T2nd of 17","Final Sep 29 Men's · NC State at NB3 Matchplay | 2nd","Final Oct 5 Men's · NC State at Cullan Brown Collegiate | 3rd of 15"]);
  recapFixtures.clear();requests.length=0;
}

// Cross country: team places with points written "1st place (21 points)"
// (Adidas XC Challenge, Sep 18). The Dill Family Foundation Invitational (Oct
// 2) has no result line, story or TFRRS race: not listed.
{
  const h=worker.ncStateHandlers;
  assert.deepEqual(meetTeamPlaces('Women: 1st place (21 points) | Men: 2nd place (66 points)'),{Women:{place:'1',points:'21'},Men:{place:'2',points:'66'}});
  assert.deepEqual(parse('Cross Country','cross-country').filter(e=>e.status==='Final').map(e=>[line(e),h.isTennisWithoutStory(e)]),[["Final Sep 18 NC State at Adidas XC Challenge | Women's team: 1st · 21 pts / Men's team: 2nd · 66 pts",false],["Final Oct 2 NC State at Dill Family Foundation Invitational | Completed",true],["Final Oct 2 NC State at Joe Piane Invitational | Women's team: 1st · 39 pts / Men's team: 3rd · 110 pts",false]]);
}

// Institutions read by their short names ("University of Virginia",
// "Stony Brook University"); Miami and Boston University keep theirs.
assert.deepEqual(['University of Virginia','Stony Brook University','Southern Methodist University','Spalding University (Ky.)','Eastern Kentucky University (Exhibition)','Miami University (OH)','Boston University','Saint Joseph\'s'].map(institutionShortName),['Virginia','Stony Brook','SMU','Spalding (Ky.)','Eastern Kentucky (Exhibition)','Miami University (OH)','Boston University','Saint Joseph\'s']);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('NC State module checks passed');
