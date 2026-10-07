import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {georgiaSchool} from '../src/schools/georgia.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='georgia');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,georgiaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/georgia-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit georgiadogs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['georgia'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',georgiaSchool.scheduleUrls],['roster',georgiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('georgia|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'georgiadogs.com',`${key} must stay on georgiadogs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://georgiadogs.com/sports/baseball/schedule"],"roster":["https://georgiadogs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://georgiadogs.com/sports/mens-basketball/schedule","https://georgiadogs.com/sports/womens-basketball/schedule"],"roster":["https://georgiadogs.com/sports/mens-basketball/roster","https://georgiadogs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://georgiadogs.com/sports/cross-country/schedule"],"roster":["https://georgiadogs.com/sports/cross-country/roster"],"combined":false},"Equestrian":{"schedule":["https://georgiadogs.com/sports/equestrian/schedule"],"roster":["https://georgiadogs.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://georgiadogs.com/sports/football/schedule"],"roster":["https://georgiadogs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://georgiadogs.com/sports/mens-golf/schedule","https://georgiadogs.com/sports/womens-golf/schedule"],"roster":["https://georgiadogs.com/sports/mens-golf/roster","https://georgiadogs.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://georgiadogs.com/sports/womens-gymnastics/schedule"],"roster":["https://georgiadogs.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://georgiadogs.com/sports/womens-soccer/schedule"],"roster":["https://georgiadogs.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://georgiadogs.com/sports/softball/schedule"],"roster":["https://georgiadogs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://georgiadogs.com/sports/msd/schedule","https://georgiadogs.com/sports/wsd/schedule"],"roster":["https://georgiadogs.com/sports/msd/roster","https://georgiadogs.com/sports/wsd/roster"],"combined":true},"Tennis":{"schedule":["https://georgiadogs.com/sports/mens-tennis/schedule","https://georgiadogs.com/sports/womens-tennis/schedule"],"roster":["https://georgiadogs.com/sports/mens-tennis/roster","https://georgiadogs.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://georgiadogs.com/sports/track-and-field/schedule"],"roster":["https://georgiadogs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://georgiadogs.com/sports/womens-volleyball/schedule"],"roster":["https://georgiadogs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'georgia|"+sport+"':"),`${sport} routes must live in the Georgia module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://georgiadogs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.georgiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=georgia)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19, 3:00 PM Georgia vs Binghamton University | ",
 "Upcoming Feb 20, 2:00 PM Georgia vs Binghamton University | ",
 "Upcoming Feb 21, 1:00 PM Georgia vs Binghamton University | ",
 "Upcoming Feb 23 Georgia at Georgia State University | ",
 "Upcoming Feb 26, 3:00 PM Georgia vs Princeton University | ",
 "Upcoming Feb 27, 2:00 PM Georgia vs Princeton University | ",
 "Upcoming Feb 28, 1:00 PM Georgia vs Princeton University | ",
 "Upcoming Mar 2 Georgia at Kennesaw State University | ",
 "Upcoming Mar 3, 3:00 PM Georgia vs Western Carolina University | ",
 "Upcoming Mar 5, 3:00 PM Georgia vs Elon University | ",
 "Upcoming Mar 6, 2:00 PM Georgia vs Elon University | ",
 "Upcoming Mar 7, 1:00 PM Georgia vs Elon University | ",
 "Upcoming Mar 10, 3:00 PM Georgia vs Georgia State University | ",
 "Upcoming Mar 12, 3:00 PM Georgia vs Fresno State | ",
 "Upcoming Mar 13, 2:00 PM Georgia vs Fresno State | ",
 "Upcoming Mar 14, 1:00 PM Georgia vs Fresno State | ",
 "Upcoming Mar 19 Georgia at Kentucky | ",
 "Upcoming Mar 20 Georgia at Kentucky | ",
 "Upcoming Mar 21 Georgia at Kentucky | ",
 "Upcoming Mar 23, 3:00 PM Georgia vs Kennesaw State University | ",
 "Upcoming Mar 25, 6:00 PM Georgia vs Mississippi State | ",
 "Upcoming Mar 26, 6:00 PM Georgia vs Mississippi State | ",
 "Upcoming Mar 27, 1:00 PM Georgia vs Mississippi State | ",
 "Upcoming Mar 30, 4:00 PM Georgia vs University of West Georgia | ",
 "Upcoming Apr 2 Georgia at Oklahoma | ",
 "Upcoming Apr 3 Georgia at Oklahoma | ",
 "Upcoming Apr 4 Georgia at Oklahoma | ",
 "Upcoming Apr 6, 3:00 PM Georgia vs The Citadel | ",
 "Upcoming Apr 7 Georgia at Georgia State University | ",
 "Upcoming Apr 9, 6:00 PM Georgia vs Auburn | ",
 "Upcoming Apr 10, 2:00 PM Georgia vs Auburn | ",
 "Upcoming Apr 11, 1:00 PM Georgia vs Auburn | ",
 "Upcoming Apr 13, 3:00 PM Georgia vs University of South Carolina - Upstate | ",
 "Upcoming Apr 16, 6:00 PM Georgia vs Vanderbilt | ",
 "Upcoming Apr 17, 2:00 PM Georgia vs Vanderbilt | ",
 "Upcoming Apr 18, 1:00 PM Georgia vs Vanderbilt | ",
 "Upcoming Apr 20, 3:00 PM Georgia vs Presbyterian College | ",
 "Upcoming Apr 23 Georgia at Tennessee | ",
 "Upcoming Apr 24 Georgia at Tennessee | ",
 "Upcoming Apr 25 Georgia at Tennessee | ",
 "Upcoming Apr 27 Georgia vs Georgia Tech | ",
 "Upcoming Apr 30 Georgia at LSU | ",
 "Upcoming May 1 Georgia at LSU | ",
 "Upcoming May 2 Georgia at LSU | ",
 "Upcoming May 7, 6:00 PM Georgia vs Alabama | ",
 "Upcoming May 8, 2:00 PM Georgia vs Alabama | ",
 "Upcoming May 9, 1:00 PM Georgia vs Alabama | ",
 "Upcoming May 14 Georgia at Florida | ",
 "Upcoming May 15 Georgia at Florida | ",
 "Upcoming May 16 Georgia at Florida | ",
 "Upcoming May 20, 6:00 PM Georgia vs Texas | ",
 "Upcoming May 21, 6:00 PM Georgia vs Texas | ",
 "Upcoming May 22, 1:00 PM Georgia vs Texas | ",
 "Upcoming May 25 Georgia at SEC Tournament | ",
 "Upcoming Jun 4 Georgia at NCAA Regionals | ",
 "Upcoming Jun 11 Georgia at NCAA Super Regionals | ",
 "Upcoming Jun 18 Georgia at College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 7 Men's · Georgia vs Georgia State (Exhibition) | ",
 "Upcoming Oct 16 Men's · Georgia vs Charlotte (Exhibition) | ",
 "Upcoming Oct 23 Men's · Georgia at Clemson (Exhibition) | ",
 "Upcoming Nov 2 Men's · Georgia vs N.C. Central | ",
 "Upcoming Nov 6 Men's · Georgia vs Presbyterian | ",
 "Upcoming Nov 9 Men's · Georgia vs Florida Gulf Coast | ",
 "Upcoming Nov 13 Men's · Georgia at North Carolina | ",
 "Upcoming Nov 16 Men's · Georgia vs Jacksonville | ",
 "Upcoming Nov 20 Men's · Georgia at Georgia Tech | ",
 "Upcoming Nov 26, 11:00 AM Men's · Georgia vs Cincinnati | ",
 "Upcoming Nov 27 Men's · Georgia vs UCF | ",
 "Upcoming Dec 1 Men's · Georgia vs Boston College | ",
 "Upcoming Dec 8 Men's · Georgia vs Duke | ",
 "Upcoming Dec 13 Men's · Georgia vs Alabama A&M | ",
 "Upcoming Dec 16 Men's · Georgia vs West Georgia | ",
 "Upcoming Dec 20 Men's · Georgia vs Gardner-Webb | ",
 "Upcoming Dec 29 Men's · Georgia vs North Florida | ",
 "Upcoming Jan 2 Men's · Georgia at Ole Miss | ",
 "Upcoming Jan 5 Men's · Georgia vs Texas | ",
 "Upcoming Jan 9 Men's · Georgia at Auburn | ",
 "Upcoming Jan 12 Men's · Georgia vs Oklahoma | ",
 "Upcoming Jan 16 Men's · Georgia vs Mississippi State | ",
 "Upcoming Jan 19 Men's · Georgia at Arkansas | ",
 "Upcoming Jan 23 Men's · Georgia vs Florida | ",
 "Upcoming Jan 30 Men's · Georgia vs LSU | ",
 "Upcoming Feb 3 Men's · Georgia at Tennessee | ",
 "Upcoming Feb 6 Men's · Georgia at South Carolina | ",
 "Upcoming Feb 9 Men's · Georgia vs Vanderbilt | ",
 "Upcoming Feb 13 Men's · Georgia at Texas A&M | ",
 "Upcoming Feb 16 Men's · Georgia vs Kentucky | ",
 "Upcoming Feb 20 Men's · Georgia at Florida | ",
 "Upcoming Feb 24 Men's · Georgia at Oklahoma | ",
 "Upcoming Feb 27 Men's · Georgia vs Missouri | ",
 "Upcoming Mar 3 Men's · Georgia at Alabama | ",
 "Upcoming Mar 6 Men's · Georgia vs South Carolina | ",
 "Upcoming Mar 10 Men's · Georgia at SEC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Georgia vs West Georgia | ",
 "Upcoming Nov 5, 7:00 PM Women's · Georgia vs Winthrop | ",
 "Upcoming Nov 8 Women's · Georgia vs Nicholls | ",
 "Upcoming Nov 11 Women's · Georgia vs Kennesaw State | ",
 "Upcoming Nov 14 Women's · Georgia at Ohio | ",
 "Upcoming Nov 18 Women's · Georgia at Georgia Tech | ",
 "Upcoming Nov 22 Women's · Georgia vs Louisiana Tech | ",
 "Upcoming Nov 26, 1:30 PM Women's · Georgia vs Colorado | ",
 "Upcoming Nov 27, 1:30 PM Women's · Georgia vs Maryland Eastern Shore | ",
 "Upcoming Nov 28, 1:30 PM Women's · Georgia vs Oregon | ",
 "Upcoming Dec 2 Women's · Georgia at SMU | ",
 "Upcoming Dec 14, 11:00 AM Women's · Georgia vs South Carolina State | ",
 "Upcoming Dec 17 Women's · Georgia vs Jacksonville | ",
 "Upcoming Dec 21 Women's · Georgia vs Alabama State | ",
 "Upcoming Dec 28 Women's · Georgia vs Georgia Southern | ",
 "Upcoming Dec 31 Women's · Georgia vs Texas | ",
 "Upcoming Jan 3 Women's · Georgia at Alabama | ",
 "Upcoming Jan 7 Women's · Georgia at Oklahoma | ",
 "Upcoming Jan 10 Women's · Georgia vs Auburn | ",
 "Upcoming Jan 14 Women's · Georgia at Tennessee | ",
 "Upcoming Jan 21 Women's · Georgia vs Arkansas | ",
 "Upcoming Jan 24 Women's · Georgia at Vanderbilt | ",
 "Upcoming Jan 28 Women's · Georgia at Florida | ",
 "Upcoming Jan 31 Women's · Georgia vs Mississippi State | ",
 "Upcoming Feb 4 Women's · Georgia at Ole Miss | ",
 "Upcoming Feb 7 Women's · Georgia vs Kentucky | ",
 "Upcoming Feb 11 Women's · Georgia vs Missouri | ",
 "Upcoming Feb 14 Women's · Georgia at LSU | ",
 "Upcoming Feb 22 Women's · Georgia at Texas A&M | ",
 "Upcoming Feb 25 Women's · Georgia vs Florida | ",
 "Upcoming Feb 28 Women's · Georgia vs South Carolina | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Georgia at Covered Bridge Open | Women's team: 1st / Men's team: 2nd",
 "Final Sep 19 Georgia at John McNichols Invite | Women's team: 13th / Men's team: 15th",
 "Upcoming Oct 9, 10:30 AM Georgia at Nuttycombe Invite | ",
 "Upcoming Oct 30 Georgia at SEC Championships | ",
 "Upcoming Nov 13 Georgia at NCAA South Regional | ",
 "Upcoming Nov 21 Georgia at NCAA Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 10, 11:00 AM Georgia vs Texas A&M | ",
 "Upcoming Oct 23 Georgia at South Carolina | ",
 "Upcoming Oct 30, 2:00 PM Georgia vs Fresno State | ",
 "Upcoming Nov 6 Georgia at SMU | ",
 "Upcoming Nov 7 Georgia vs Oklahoma State | ",
 "Upcoming Nov 20, 2:00 PM Georgia vs Auburn | ",
 "Upcoming Feb 5, 2:00 PM Georgia vs Berry College (Ga.) | ",
 "Upcoming Feb 6, 11:00 AM Georgia vs UT Martin | ",
 "Upcoming Feb 20 Georgia at Auburn | ",
 "Upcoming Feb 26 Georgia at Baylor | ",
 "Upcoming Feb 27 Georgia at Texas A&M | ",
 "Upcoming Mar 6, 1:00 PM Georgia vs South Carolina | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Georgia vs Tennessee State | W, 63-3",
 "Final Sep 12 Georgia vs Western Kentucky | W, 70-20",
 "Final Sep 19 Georgia at Arkansas | W, 45-17",
 "Final Sep 26 Georgia vs Oklahoma | W, 41-13",
 "Final Oct 3 Georgia vs Vanderbilt | W, 38-14",
 "Upcoming Oct 10, 7:30 PM Georgia at Alabama | ",
 "Upcoming Oct 17 Georgia vs Auburn | ",
 "Upcoming Oct 31, 3:30 PM Georgia vs Florida | ",
 "Upcoming Nov 7 Georgia at Ole Miss | ",
 "Upcoming Nov 14 Georgia vs Missouri | ",
 "Upcoming Nov 21 Georgia at South Carolina | ",
 "Upcoming Nov 28 Georgia vs Georgia Tech | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 30 Men's · Georgia at Visit Knoxville Collegiate | T6th",
 "Final Sep 20 Men's · Georgia at 2nd Swing Gopher Invitational | 1st",
 "Final Sep 28 Men's · Georgia at Ben Hogan Invitational | T8th",
 "Upcoming Oct 17 Men's · Georgia at Fallen Oak Collegiate | ",
 "Upcoming Oct 26 Men's · Georgia at Ka'anapali Classic | ",
 "Upcoming Feb 13 Men's · Georgia at The Gators Invitational | ",
 "Upcoming Feb 28 Men's · Georgia at Las Vegas Invitational | ",
 "Upcoming Mar 6 Men's · Georgia at The Hayt | ",
 "Upcoming Mar 20 Men's · Georgia at Linger Longer Invitational | ",
 "Upcoming Apr 3 Men's · Georgia at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 12 Men's · Georgia at The Ford Collegiate | ",
 "Upcoming Apr 21 Men's · Georgia at SEC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Georgia at Cougar Classic | 17th",
 "Final Sep 19 Women's · Georgia at Schooner Fall Classic | 13th",
 "Upcoming Oct 9 Women's · Georgia at Evie Odom Invitational | ",
 "Upcoming Oct 19 Women's · Georgia at Route 66 Invitational | ",
 "Upcoming Feb 1 Women's · Georgia at FAU Paradise Invitational | ",
 "Upcoming Feb 21 Women's · Georgia at Westbrook Invitational | ",
 "Upcoming Mar 1 Women's · Georgia at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 13 Women's · Georgia at Valspar Augusta Invitational | ",
 "Upcoming Mar 27 Women's · Georgia at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 16 Women's · Georgia at SEC Championships | ",
 "Upcoming May 10 Women's · Georgia at NCAA Regional | ",
 "Upcoming May 21 Women's · Georgia at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 10 Georgia at Clemson | ",
 "Upcoming Jan 10 Georgia at North Carolina | ",
 "Upcoming Jan 10 Georgia at Utah | ",
 "Upcoming Jan 15 Georgia at Missouri | ",
 "Upcoming Jan 22 Georgia at Oklahoma | ",
 "Upcoming Jan 29 Georgia at LSU | ",
 "Upcoming Feb 5 Georgia at Arkansas | ",
 "Upcoming Feb 7 Georgia at Missouri | ",
 "Upcoming Feb 7 Georgia at Oklahoma | ",
 "Upcoming Feb 7 Georgia at NC State | ",
 "Upcoming Feb 12 Georgia at Florida | ",
 "Upcoming Feb 19 Georgia at Kentucky | ",
 "Upcoming Feb 21 Georgia at Clemson | ",
 "Upcoming Feb 26 Georgia at Clemson | ",
 "Upcoming Feb 26 Georgia at Auburn | ",
 "Upcoming Feb 26 Georgia at Pitt | ",
 "Upcoming Mar 5 Georgia at Auburn | ",
 "Upcoming Mar 14 Georgia at Alabama | ",
 "Upcoming Mar 20 Georgia at 2027 SEC Championships | ",
 "Upcoming Apr 1 Georgia at NCAA Regionals | ",
 "Upcoming Apr 15 Georgia at NCAA National Semifinals | ",
 "Upcoming Apr 17 Georgia at NCAA National Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Georgia at Illinois | T, 0-0",
 "Final Aug 16 Georgia at Minnesota | T, 1-1",
 "Final Aug 20 Georgia vs James Madison | W, 6-0",
 "Final Aug 23 Georgia vs Milwaukee | W, 3-0",
 "Final Aug 27 Georgia at TCU | L, 2-3",
 "Final Aug 30 Georgia at Mercer | W, 2-0",
 "Final Sep 3 Georgia vs Florida State | L, 1-2",
 "Final Sep 10 Georgia vs Vanderbilt | T, 1-1",
 "Final Sep 18 Georgia vs Oklahoma | L, 1-3",
 "Final Sep 24 Georgia at Arkansas | T, 2-2",
 "Final Sep 27 Georgia at LSU | T, 1-1",
 "Final Oct 2 Georgia vs Texas A&M | W, 2-1",
 "Upcoming Oct 9, 6:30 PM Georgia vs Ole Miss | ",
 "Upcoming Oct 15, 7:00 PM Georgia at Alabama | ",
 "Upcoming Oct 18, 5:00 PM Georgia vs Missouri | ",
 "Upcoming Oct 23, 7:00 PM Georgia at South Carolina | ",
 "Upcoming Nov 1, 1:00 PM Georgia at Florida | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Mar 12 Georgia vs Oklahoma | ",
 "Upcoming Mar 13 Georgia vs Oklahoma | ",
 "Upcoming Mar 14 Georgia vs Oklahoma | ",
 "Upcoming Mar 19 Georgia at Mississippi State | ",
 "Upcoming Mar 20 Georgia at Mississippi State | ",
 "Upcoming Mar 21 Georgia at Mississippi State | ",
 "Upcoming Mar 25 Georgia vs South Carolina | ",
 "Upcoming Mar 26 Georgia vs South Carolina | ",
 "Upcoming Mar 27 Georgia vs South Carolina | ",
 "Upcoming Apr 9 Georgia at Ole Miss | ",
 "Upcoming Apr 10 Georgia at Ole Miss | ",
 "Upcoming Apr 11 Georgia at Ole Miss | ",
 "Upcoming Apr 16 Georgia vs Alabama | ",
 "Upcoming Apr 17 Georgia vs Alabama | ",
 "Upcoming Apr 18 Georgia vs Alabama | ",
 "Upcoming Apr 23 Georgia at Tennessee | ",
 "Upcoming Apr 24 Georgia at Tennessee | ",
 "Upcoming Apr 25 Georgia at Tennessee | ",
 "Upcoming Apr 30 Georgia vs Auburn | ",
 "Upcoming May 1 Georgia vs Auburn | ",
 "Upcoming May 2 Georgia vs Auburn | ",
 "Upcoming May 6 Georgia at LSU | ",
 "Upcoming May 7 Georgia at LSU | ",
 "Upcoming May 8 Georgia at LSU | ",
 "Upcoming May 11 Georgia at SEC Tournament | "
]);
  const v_msd=parse("Swimming & Diving","msd");
  assert.deepEqual(v_msd.map(line),[
 "Final Sep 25 Men's · Georgia at College Swimming League (Alabama, NC State, Virginia) | 4th · 207.5 pts",
 "Upcoming Oct 10, 11:00 AM Men's · Georgia at Texas A&M | ",
 "Upcoming Oct 23, 10:00 AM Men's · Georgia vs Alabama (Diving) | ",
 "Upcoming Oct 23, 5:30 PM Men's · Georgia at College Swimming League (Alabama, Auburn, Tennessee) | ",
 "Upcoming Oct 28, 11:00 AM Men's · Georgia at U.S. Short Course World Championship Trials | ",
 "Upcoming Oct 30, 11:00 AM Men's · Georgia vs Florida | ",
 "Upcoming Nov 5, 2:30 PM Men's · Georgia vs CSL Wild Card | ",
 "Upcoming Nov 6, 4:30 PM Men's · Georgia at CSL Championship | ",
 "Upcoming Nov 19 Men's · Georgia at Georgia Fall Invitational | ",
 "Upcoming Dec 2 Men's · Georgia at U.S. Open | ",
 "Upcoming Dec 9 Men's · Georgia at USA Diving Winter National Championships | ",
 "Upcoming Jan 8, 3:00 PM Men's · Georgia at Georgia Tech | ",
 "Upcoming Jan 23, 12:00 PM Men's · Georgia at Tennessee | ",
 "Upcoming Jan 30, 11:00 AM Men's · Georgia vs Emory | ",
 "Upcoming Feb 5 Men's · Georgia at Auburn First Chance Meet | ",
 "Upcoming Feb 14, 1:00 PM Men's · Georgia at SEC Swimming & Diving Championships | ",
 "Upcoming Feb 27 Men's · Georgia at Bulldog Invitational - Last Chance | ",
 "Upcoming Mar 7 Men's · Georgia at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 24, 11:00 AM Men's · Georgia at NCAA Men's Swimming & Diving Championships | "
]);
  const v_wsd=parse("Swimming & Diving","wsd");
  assert.deepEqual(v_wsd.map(line),[
 "Final Sep 25 Women's · Georgia at College Swimming League (Alabama, NC State, Virginia) | 4th · 207.5 pts",
 "Upcoming Oct 10, 11:00 AM Women's · Georgia at Texas A&M | ",
 "Upcoming Oct 23, 10:00 AM Women's · Georgia vs Alabama (Diving) | ",
 "Upcoming Oct 23, 5:30 PM Women's · Georgia at College Swimming League (Alabama, Auburn, Tennessee) | ",
 "Upcoming Oct 28, 11:00 AM Women's · Georgia at U.S. Short Course World Championship Trials | ",
 "Upcoming Oct 30, 11:00 AM Women's · Georgia vs Florida | ",
 "Upcoming Nov 5, 2:30 PM Women's · Georgia vs CSL Wild Card | ",
 "Upcoming Nov 6, 4:30 PM Women's · Georgia at CSL Championship | ",
 "Upcoming Nov 19 Women's · Georgia at Georgia Fall Invitational | ",
 "Upcoming Dec 2 Women's · Georgia at U.S. Open | ",
 "Upcoming Dec 9 Women's · Georgia at USA Diving Winter National Championships | ",
 "Upcoming Jan 8, 3:00 PM Women's · Georgia at Georgia Tech | ",
 "Upcoming Jan 23, 12:00 PM Women's · Georgia at Tennessee | ",
 "Upcoming Jan 30, 11:00 AM Women's · Georgia vs Emory | ",
 "Upcoming Feb 5 Women's · Georgia at Auburn First Chance Meet | ",
 "Upcoming Feb 14, 1:00 PM Women's · Georgia at SEC Swimming & Diving Championships | ",
 "Upcoming Feb 27 Women's · Georgia at Bulldog Invitational - Last Chance | ",
 "Upcoming Mar 7 Women's · Georgia at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 17, 11:00 AM Women's · Georgia at NCAA Women's Swimming & Diving Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Georgia at ITA All-American Championships | Completed",
 "Final Sep 21 Men's · Georgia at M15 Columbia | Completed",
 "Final Oct 1 Men's · Georgia at Battle in the Bay Classic | Completed",
 "Upcoming Oct 14 Men's · Georgia at ITA Regional Championships | ",
 "Upcoming Oct 23 Men's · Georgia at RTC Collegiate Invite | ",
 "Upcoming Nov 2 Men's · Georgia at M15 Hilton Head | ",
 "Upcoming Nov 5 Men's · Georgia at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Georgia at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Georgia at NCAA Singles and Doubles Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Georgia at Kitty Harrison Invitational UNC | Completed",
 "Final Sep 19 Women's · Georgia at ITA All American Championships | Completed",
 "Final Oct 1 Women's · Georgia at Battle in the Bay Classic | Completed",
 "Today Oct 5 Women's · Georgia at Columbia W50 | ",
 "Today Oct 7 Women's · Georgia at ITA Southeast Regionals | ",
 "Upcoming Oct 19 Women's · Georgia at Saguenay W75 | ",
 "Upcoming Oct 23 Women's · Georgia at Rome Collegiate Invite | ",
 "Upcoming Oct 26 Women's · Georgia at Toronto W75 | ",
 "Upcoming Nov 2 Women's · Georgia at Stillwater W35 | ",
 "Upcoming Nov 5 Women's · Georgia at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Georgia at ITA Conference Masters | ",
 "Upcoming Nov 16 Women's · Georgia at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Apr 9 Georgia at Spec Towns Invitational | ",
 "Upcoming Apr 30 Georgia at Torrin Lawrence Memorial | ",
 "Upcoming May 13 Georgia at SEC Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Georgia vs North Florida | W, 3-0",
 "Final Aug 28 Georgia vs George Washington | W, 3-0",
 "Final Aug 29 Georgia vs Furman | W, 3-1",
 "Final Sep 1 Georgia vs Indiana | L, 1-3",
 "Final Sep 2 Georgia at Purdue | L, 2-3",
 "Final Sep 8 Georgia vs Notre Dame | W, 3-1",
 "Final Sep 11 Georgia vs Tulane | W, 3-0",
 "Final Sep 12 Georgia at South Alabama | W, 3-0",
 "Final Sep 13 Georgia vs Kennesaw State | W, 3-1",
 "Final Sep 19 Georgia vs Georgia Tech | W, 3-2",
 "Final Sep 23 Georgia vs South Carolina | W, 3-2",
 "Final Oct 2 Georgia vs Arkansas | W, 3-1",
 "Final Oct 4 Georgia vs Oklahoma | W, 3-1",
 "Upcoming Oct 9, 6:00 PM Georgia at Mississippi State | ",
 "Upcoming Oct 11, 3:00 PM Georgia at Alabama | ",
 "Upcoming Oct 16, 7:00 PM Georgia at Ole Miss | ",
 "Upcoming Oct 18, 2:00 PM Georgia at LSU | ",
 "Upcoming Oct 23, 7:00 PM Georgia vs Texas A&M | ",
 "Upcoming Oct 25, 2:00 PM Georgia vs Missouri | ",
 "Upcoming Oct 28, 8:00 PM Georgia at Texas | ",
 "Upcoming Nov 1, 2:00 PM Georgia vs Vanderbilt | ",
 "Upcoming Nov 6, 7:00 PM Georgia at Auburn | ",
 "Upcoming Nov 8, 1:00 PM Georgia at Florida | ",
 "Upcoming Nov 13, 7:00 PM Georgia vs Tennessee | ",
 "Upcoming Nov 15, 2:00 PM Georgia vs Kentucky | ",
 "Upcoming Nov 20 Georgia at SEC Tournament | ",
 "Upcoming Dec 3 Georgia at NCAA First & Second Rounds | ",
 "Upcoming Dec 10 Georgia at NCAA Regional Rounds | ",
 "Upcoming Dec 17 Georgia at NCAA National Semifinals | ",
 "Upcoming Dec 20 Georgia at NCAA National Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_msd,"Swimming & Diving msd");
  ownRecapsOnly(v_wsd,"Swimming & Diving wsd");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Georgia's own wording, read as K-State's.
{
  // Golf: the place with every round and the total after "=".
  assert.deepEqual(parse('Golf','womens-golf').find(e=>e.opponent==='Cougar Classic').results,[{label:'Result',value:'17th'},{label:'Team score',value:'891 (295-302-294)'}]);
  assert.deepEqual(parse('Golf','mens-golf').filter(e=>e.status==='Final').map(e=>e.headline),['T6th','1st','T8th']);
  // Swimming: a league match place, "4th, 207.5 pts.".
  assert.deepEqual(parse('Swimming & Diving','msd').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Men's · Georgia at College Swimming League (Alabama, NC State, Virginia)",'4th · 207.5 pts']]);
  // Basketball: "Preseason - Charlotte" is an exhibition; the "SEC" entry of
  // the "SEC Tournament" reads as the tournament.
  const mens=parse('Basketball','mens-basketball');
  assert.equal(mens.find(e=>e.opponent.startsWith('Charlotte')).title,"Men's · Georgia vs Charlotte (Exhibition)");
  assert.equal(mens.at(-1).title,"Men's · Georgia at SEC Tournament");
}

// Tennis tournaments take the team archive's story; one with none (the M15
// Columbia pro event) is left out of the feed.
{
  const tennis=parse('Tennis','mens-tennis').filter(e=>e.status==='Final');
  recapFixtures.set('https://georgiadogs.com/sports/mens-tennis/archives',fixture('mens-tennis-archives.html.gz'));
  for(const name of ['story-2026-9-25-mens-tennis-bulldogs-wrap-action-at-the-.html.gz','story-2026-9-23-mens-tennis-johnston-delgado-move-into-c.html.gz','story-2026-9-22-mens-tennis-bulldogs-wrap-action-in-qual.html.gz','story-2026-9-21-mens-tennis-bulldogs-in-the-mix-in-quali.html.gz','story-2026-10-4-mens-tennis-alonso-delgado-wrap-action-a.html.gz','story-2026-10-2-mens-tennis-bulldogs-fall-on-friday-at-b.html.gz','story-2026-10-1-mens-tennis-bulldog-duo-moving-on-in-sin.html.gz']){
    const [,y,m,d]=name.match(/^story-(\d+)-(\d+)-(\d+)-/);
    const path=(fixture('mens-tennis-archives.html.gz').replace(/\\u002F/gi,'/').match(new RegExp(`/news/${y}/${m}/${d}/${name.slice(`story-${y}-${m}-${d}-`.length,-8)}[A-Za-z0-9-]*`))||[])[0];
    if(path)recapFixtures.set(`https://georgiadogs.com${path}`,fixture(name));
  }
  for(const event of tennis)if(worker.georgiaHandlers.isFinalWithoutStory(event))await worker.georgiaHandlers.attachArchiveStory(event);
  assert.deepEqual(tennis.map(e=>[e.opponent,Boolean(e.recap_url),worker.georgiaHandlers.isTennisWithoutStory(e)]),[['ITA All-American Championships',true,false],['M15 Columbia',false,true],['Battle in the Bay Classic',true,false]]);
  recapFixtures.clear();requests.length=0;
}

// Cross Country: TFRRS confirms both teams' places at every meet.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  recapFixtures.set('https://www.tfrrs.org/teams/xc/GA_college_f_Georgia.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/GA_college_m_Georgia.html',fixture('tfrrs-team-m.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/results/xc/27812/John_McNichols_Invitational',fixture('tfrrs-27812.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/results/xc/27899/Covered_Bridge',fixture('tfrrs-27899.html.gz'));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['Covered Bridge Open',"Women's team: 1st · 15 pts / Men's team: 2nd · 35 pts",true],['John McNichols Invite',"Women's team: 13th · 335 pts / Men's team: 15th · 353 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Georgia's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['Georgia vs Vanderbilt','Final','W, 38-14']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Georgia vs Oklahoma','Final','W, 3-1']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Georgia vs Texas A&M','Final','W, 2-1']]);
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
  assert.deepEqual(['football','womens-volleyball','womens-soccer'].map(published),[['5-0','3-0'],['11-2','3-0'],['4-3-5','1-1-3']]);
}

// Other schools and other hosts never reach the Georgia reader.
assert.equal(worker.georgiaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://georgiadogs.com/',now),null);
assert.equal(worker.georgiaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Georgia module checks passed');
