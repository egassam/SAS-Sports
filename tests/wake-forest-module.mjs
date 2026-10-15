import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {wakeForestSchool} from '../src/schools/wake-forest.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='wake-forest');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,wakeForestHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/wake-forest-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit godeacs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['wake-forest'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',wakeForestSchool.scheduleUrls],['roster',wakeForestSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('wake-forest|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'godeacs.com',`${key} must stay on godeacs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://godeacs.com/sports/baseball/schedule"],"roster":["https://godeacs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://godeacs.com/sports/mens-basketball/schedule","https://godeacs.com/sports/womens-basketball/schedule"],"roster":["https://godeacs.com/sports/mens-basketball/roster","https://godeacs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://godeacs.com/sports/cross-country/schedule"],"roster":["https://godeacs.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://godeacs.com/sports/field-hockey/schedule"],"roster":["https://godeacs.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://godeacs.com/sports/football/schedule"],"roster":["https://godeacs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://godeacs.com/sports/womens-golf/schedule","https://godeacs.com/sports/mens-golf/schedule"],"roster":["https://godeacs.com/sports/womens-golf/roster","https://godeacs.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://godeacs.com/sports/womens-soccer/schedule","https://godeacs.com/sports/mens-soccer/schedule"],"roster":["https://godeacs.com/sports/womens-soccer/roster","https://godeacs.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://godeacs.com/sports/womens-tennis/schedule","https://godeacs.com/sports/mens-tennis/schedule"],"roster":["https://godeacs.com/sports/womens-tennis/roster","https://godeacs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://godeacs.com/sports/track-and-field/schedule"],"roster":["https://godeacs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://godeacs.com/sports/womens-volleyball/schedule"],"roster":["https://godeacs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'wake-forest|"+sport+"':"),`${sport} routes must live in the Wake Forest module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://godeacs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.wakeForestHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=wake-forest)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 4 Men's · Wake Forest vs Georgetown (Exhibition) | L, 77-94",
 "Today Oct 15, 6:00 PM Men's · Wake Forest vs South Carolina (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · Wake Forest vs Maryland Eastern Shore | ",
 "Upcoming Nov 5, 6:00 PM Men's · Wake Forest at Vanderbilt | ",
 "Upcoming Nov 10, 7:00 PM Men's · Wake Forest vs Charleston Southern | ",
 "Upcoming Nov 14 Men's · Wake Forest vs Southern Utah | ",
 "Upcoming Nov 17, 7:00 PM Men's · Wake Forest vs Monmouth | ",
 "Upcoming Nov 21 Men's · Wake Forest vs Western Carolina | ",
 "Upcoming Nov 25, 7:30 PM Men's · Wake Forest vs Mississippi State | ",
 "Upcoming Nov 27, 1:30 PM Men's · Wake Forest vs Memphis or Penn State | ",
 "Upcoming Dec 1, 9:00 PM Men's · Wake Forest at LSU | ",
 "Upcoming Dec 6, 1:00 PM Men's · Wake Forest vs UMass | ",
 "Upcoming Dec 8, 7:00 PM Men's · Wake Forest vs Hampton | ",
 "Upcoming Dec 15, 9:00 PM Men's · Wake Forest vs Gardner-Webb | ",
 "Upcoming Dec 19, 3:30 PM Men's · Wake Forest vs West Virginia | ",
 "Upcoming Dec 22, 4:00 PM Men's · Wake Forest vs Presbyterian | ",
 "Upcoming Jan 2, 3:30 PM Men's · Wake Forest vs Virginia Tech | ",
 "Upcoming Jan 5, 7:00 PM Men's · Wake Forest at SMU | ",
 "Upcoming Jan 9, 12:00 PM Men's · Wake Forest at Clemson | ",
 "Upcoming Jan 12, 7:00 PM Men's · Wake Forest vs Notre Dame | ",
 "Upcoming Jan 16, 4:30 PM Men's · Wake Forest vs Florida State | ",
 "Upcoming Jan 20, 9:00 PM Men's · Wake Forest vs Duke | ",
 "Upcoming Jan 23, 12:00 PM Men's · Wake Forest at NC State | ",
 "Upcoming Jan 30, 12:00 PM Men's · Wake Forest at Miami | ",
 "Upcoming Feb 2, 6:00 PM Men's · Wake Forest vs Boston College | ",
 "Upcoming Feb 6, 3:00 PM Men's · Wake Forest at Louisville | ",
 "Upcoming Feb 10, 7:00 PM Men's · Wake Forest vs NC State | ",
 "Upcoming Feb 13, 7:00 PM Men's · Wake Forest vs Pitt | ",
 "Upcoming Feb 17, 9:00 PM Men's · Wake Forest at Notre Dame | ",
 "Upcoming Feb 20, 7:00 PM Men's · Wake Forest vs North Carolina | ",
 "Upcoming Feb 24, 11:00 PM Men's · Wake Forest at Stanford | ",
 "Upcoming Feb 27, 4:30 PM Men's · Wake Forest at Cal | ",
 "Upcoming Mar 3, 8:30 PM Men's · Wake Forest vs Georgia Tech | ",
 "Upcoming Mar 6, 5:30 PM Men's · Wake Forest at Syracuse | ",
 "Upcoming Mar 9 Men's · Wake Forest at ACC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 18, 2:00 PM Women's · Wake Forest at NC A&T (Exhibition) | ",
 "Upcoming Oct 25, 5:00 PM Women's · Wake Forest vs UNCG (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · Wake Forest vs USC Upstate | ",
 "Upcoming Nov 5, 6:00 PM Women's · Wake Forest vs Presbyterian | ",
 "Upcoming Nov 8, 12:30 PM Women's · Wake Forest vs Mercer | ",
 "Upcoming Nov 12, 11:30 AM Women's · Wake Forest vs UNCW | ",
 "Upcoming Nov 15, 3:00 PM Women's · Wake Forest vs Elon | ",
 "Upcoming Nov 19, 6:00 PM Women's · Wake Forest vs App State | ",
 "Upcoming Nov 23, 6:00 PM Women's · Wake Forest vs Wofford | ",
 "Upcoming Nov 28, 3:00 PM Women's · Wake Forest vs Quinnipiac | ",
 "Upcoming Nov 29, 3:30 PM Women's · Wake Forest at Arizona State | ",
 "Upcoming Dec 3, 9:00 PM Women's · Wake Forest at Arkansas | ",
 "Upcoming Dec 6, 7:00 PM Women's · Wake Forest at Auburn | ",
 "Upcoming Dec 13, 2:00 PM Women's · Wake Forest vs Clemson | ",
 "Upcoming Dec 16, 6:00 PM Women's · Wake Forest vs UNC Asheville | ",
 "Upcoming Dec 19, 2:00 PM Women's · Wake Forest at Virginia Tech | ",
 "Upcoming Dec 22, 1:00 PM Women's · Wake Forest vs Furman | ",
 "Upcoming Dec 31, 1:00 PM Women's · Wake Forest vs SMU | ",
 "Upcoming Jan 3, 2:00 PM Women's · Wake Forest vs Pitt | ",
 "Upcoming Jan 7, 8:00 PM Women's · Wake Forest at North Carolina | ",
 "Upcoming Jan 10, 4:00 PM Women's · Wake Forest at Georgia Tech | ",
 "Upcoming Jan 14, 6:00 PM Women's · Wake Forest vs Stanford | ",
 "Upcoming Jan 17, 2:00 PM Women's · Wake Forest vs Cal | ",
 "Upcoming Jan 21, 6:00 PM Women's · Wake Forest at Virginia | ",
 "Upcoming Jan 24, 12:00 PM Women's · Wake Forest at NC State | ",
 "Upcoming Jan 31, 2:00 PM Women's · Wake Forest at Florida State | ",
 "Upcoming Feb 4, 6:00 PM Women's · Wake Forest vs Louisville | ",
 "Upcoming Feb 7, 2:00 PM Women's · Wake Forest vs Boston College | ",
 "Upcoming Feb 11, 7:00 PM Women's · Wake Forest at Miami | ",
 "Upcoming Feb 14, 2:00 PM Women's · Wake Forest at Notre Dame | ",
 "Upcoming Feb 21, 6:00 PM Women's · Wake Forest vs Duke | ",
 "Upcoming Feb 25, 6:00 PM Women's · Wake Forest vs NC State | ",
 "Upcoming Feb 28, 12:00 PM Women's · Wake Forest at Syracuse | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Wake Forest at Virginia Invitational (Women) | Women's team: 3rd",
 "Final Sep 18 Wake Forest at adidas XC Challenge (Men) | Men's team: 1st",
 "Final Sep 26 Wake Forest at Meadows Challenge (Women) | Women's team: 6th",
 "Final Oct 9 Wake Forest at Nuttycombe Invitational (Men & Women) | Women's team: 20th / Men's team: 6th",
 "Upcoming Oct 30 Wake Forest at ACC Championships (Men & Women) | ",
 "Upcoming Nov 13 Wake Forest at NCAA Southeast Region Championships (Men & Women) | ",
 "Upcoming Nov 21 Wake Forest at NCAA Cross Country Championships (Men & Women) | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Wake Forest vs Iowa | L, 3-4",
 "Final Aug 30 Wake Forest vs Michigan | W, 2-0",
 "Final Sep 6 Wake Forest vs Ohio | W, 6-1",
 "Final Sep 11 Wake Forest vs VCU | W, 7-0",
 "Final Sep 13 Wake Forest at App State | W, 6-0",
 "Final Sep 18 Wake Forest vs Delaware | W, 5-1",
 "Final Sep 20 Wake Forest at Maryland | L, 0-1",
 "Final Sep 25 Wake Forest vs Duke | L, 2-3",
 "Final Sep 27 Wake Forest vs Syracuse | W, 4-2",
 "Final Oct 2 Wake Forest at Boston College | W, 2-1",
 "Final Oct 4 Wake Forest at Harvard | L, 1-2",
 "Final Oct 9 Wake Forest at Cal | W, 2-0",
 "Final Oct 11 Wake Forest at Stanford | W, 4-1",
 "Upcoming Oct 16, 6:00 PM Wake Forest vs Virginia | ",
 "Upcoming Oct 18, 12:00 PM Wake Forest vs Davidson | ",
 "Upcoming Oct 23, 6:00 PM Wake Forest at North Carolina | ",
 "Upcoming Oct 25, 12:00 PM Wake Forest vs James Madison | ",
 "Upcoming Oct 30, 5:00 PM Wake Forest vs Louisville | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Wake Forest vs Akron | W, 38-16",
 "Final Sep 12 Wake Forest at Purdue | W, 38-36",
 "Final Sep 18 Wake Forest vs Miami | L, 20-33",
 "Final Sep 26 Wake Forest at Louisville | W, 30-27",
 "Final Oct 3 Wake Forest vs Stanford | W, 57-3",
 "Final Oct 10 Wake Forest at NC State | W, 38-14",
 "Upcoming Oct 17 Wake Forest at Cal | ",
 "Upcoming Oct 31 Wake Forest vs Virginia | ",
 "Upcoming Nov 7 Wake Forest vs Merrimack | ",
 "Upcoming Nov 14 Wake Forest at SMU | ",
 "Upcoming Nov 21 Wake Forest at Georgia Tech | ",
 "Upcoming Nov 28 Wake Forest vs Duke | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Wake Forest at Annika Intercollegiate | Completed",
 "Final Sep 14 Women's · Wake Forest at Jackson T. Stephens Cup | Completed",
 "Upcoming Oct 16 Women's · Wake Forest at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 23 Women's · Wake Forest at Landfall Tradition | ",
 "Upcoming Jan 29 Women's · Wake Forest at Collegiate Invitational | ",
 "Upcoming Feb 14 Women's · Wake Forest at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Wake Forest at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 9 Women's · Wake Forest at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · Wake Forest at Charles Schwab Women's Collegiate Spring Invitational | ",
 "Upcoming Apr 15 Women's · Wake Forest at ACC Championship | ",
 "Upcoming May 10 Women's · Wake Forest at NCAA Regional | ",
 "Upcoming May 21 Women's · Wake Forest at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Wake Forest at Inverness Intercollegiate | Completed",
 "Final Sep 21 Men's · Wake Forest at Highlands Invitational | Completed",
 "Final Oct 5 Men's · Wake Forest at Hamptons Intercollegiate | Completed",
 "Upcoming Oct 17 Men's · Wake Forest at Fallen Oak Invitational | ",
 "Upcoming Feb 7 Men's · Wake Forest at Dorado Beach Collegiate | ",
 "Upcoming Feb 15 Men's · Wake Forest at Battle at Briar's Creek | ",
 "Upcoming Mar 8 Men's · Wake Forest at The Desimone Invitational | ",
 "Upcoming Mar 14 Men's · Wake Forest at Michael A. Marino Classic | ",
 "Upcoming Mar 22 Men's · Wake Forest at Valspar Collegiate | ",
 "Upcoming Apr 12 Men's · Wake Forest at The Invitational at the Ford | ",
 "Upcoming Apr 22 Men's · Wake Forest at 2027 ACC Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Wake Forest vs LSU | W, 2-0",
 "Final Aug 16 Women's · Wake Forest vs South Carolina | W, 3-0",
 "Final Aug 20 Women's · Wake Forest vs Iowa | W, 2-0",
 "Final Aug 23 Women's · Wake Forest vs Old Dominion | W, 1-0",
 "Final Aug 29 Women's · Wake Forest vs Portland | W, 2-0",
 "Final Sep 3 Women's · Wake Forest at USF | W, 3-0",
 "Final Sep 6 Women's · Wake Forest at Florida | W, 2-1",
 "Final Sep 12 Women's · Wake Forest vs Virginia | W, 1-0",
 "Final Sep 17 Women's · Wake Forest at Cal | W, 3-1",
 "Final Sep 20 Women's · Wake Forest at Stanford | L, 0-2",
 "Final Oct 4 Women's · Wake Forest vs NC State | W, 3-1",
 "Final Oct 10 Women's · Wake Forest at Miami | T, 0-0",
 "Today Oct 15, 6:00 PM Women's · Wake Forest vs Florida State | ",
 "Upcoming Oct 18, 3:30 PM Women's · Wake Forest vs North Carolina | ",
 "Upcoming Oct 22, 7:00 PM Women's · Wake Forest at Virginia Tech | ",
 "Upcoming Oct 30, 7:00 PM Women's · Wake Forest at Pitt | ",
 "Upcoming Nov 5, 5:00 PM Women's · Wake Forest vs Clemson | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Wake Forest vs San Francisco | W, 4-2",
 "Final Aug 23 Men's · Wake Forest vs VCU | T, 0-0",
 "Final Aug 28 Men's · Wake Forest at Akron | L, 0-1",
 "Final Aug 31 Men's · Wake Forest at Bowling Green | W, 1-0",
 "Final Sep 5 Men's · Wake Forest vs Duke | W, 6-1",
 "Final Sep 8 Men's · Wake Forest vs USC Upstate | W, 3-0",
 "Final Sep 13 Men's · Wake Forest at Virginia Tech | L, 1-2",
 "Final Sep 19 Men's · Wake Forest vs Virginia | W, 3-2",
 "Final Sep 25 Men's · Wake Forest at NC State | W, 2-1",
 "Final Sep 29 Men's · Wake Forest vs Loyola Chicago | W, 3-0",
 "Final Oct 2 Men's · Wake Forest vs SMU | L, 0-2",
 "Final Oct 9 Men's · Wake Forest at Boston College | W, 2-1",
 "Final Oct 13 Men's · Wake Forest vs UNC Asheville | W, 3-1",
 "Upcoming Oct 17, 7:00 PM Men's · Wake Forest vs Syracuse | ",
 "Upcoming Oct 20, 7:00 PM Men's · Wake Forest vs Queens | ",
 "Upcoming Oct 24, 7:00 PM Men's · Wake Forest at Elon | ",
 "Upcoming Oct 30, 7:00 PM Men's · Wake Forest at Clemson | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Wake Forest at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 19 Women's · Wake Forest at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Wake Forest at Blue Gray Classic | Completed",
 "Today Oct 15 Women's · Wake Forest at ITA Regional Championships | ",
 "Upcoming Oct 26 Women's · Wake Forest at UTR PTT | ",
 "Upcoming Nov 2 Women's · Wake Forest at UTR PTT | ",
 "Upcoming Nov 5 Women's · Wake Forest at ITA Sectional Championships | ",
 "Upcoming Dec 17 Women's · Wake Forest at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Wake Forest at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · Wake Forest at ITA Carolina Regionals | Completed",
 "Upcoming Oct 23 Men's · Wake Forest at Wake Forest Invitational | ",
 "Upcoming Nov 5 Men's · Wake Forest at ITA East Sectionals | ",
 "Upcoming Nov 5 Men's · Wake Forest at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Wake Forest at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Wake Forest at LSU | L, 2-3",
 "Final Aug 29 Wake Forest vs Houston | W, 3-2",
 "Final Sep 4 Wake Forest vs Davidson | L, 1-3",
 "Final Sep 5 Wake Forest vs Central Florida | W, 3-2",
 "Final Sep 6 Wake Forest vs Georgetown | L, 1-3",
 "Final Sep 8 Wake Forest vs Mississippi State | L, 1-3",
 "Final Sep 11 Wake Forest vs East Carolina | L, 0-3",
 "Final Sep 12 Wake Forest vs Georgia Southern | W, 3-2",
 "Final Sep 13 Wake Forest vs ETSU | W, 3-2",
 "Final Sep 17 Wake Forest at NC A&T | W, 3-0",
 "Final Sep 18 Wake Forest vs Wofford | W, 3-2",
 "Final Sep 25 Wake Forest vs Duke | L, 2-3",
 "Final Sep 27 Wake Forest vs North Carolina | L, 2-3",
 "Final Oct 2 Wake Forest at Miami | L, 1-3",
 "Final Oct 4 Wake Forest at Florida State | L, 0-3",
 "Final Oct 9 Wake Forest vs Boston College | W, 3-2",
 "Final Oct 11 Wake Forest vs Syracuse | W, 3-0",
 "Upcoming Oct 16, 10:00 PM Wake Forest at Stanford | ",
 "Upcoming Oct 18, 4:00 PM Wake Forest at California | ",
 "Upcoming Oct 23, 6:00 PM Wake Forest at NC State | ",
 "Upcoming Oct 25, 1:00 PM Wake Forest vs NC State | ",
 "Upcoming Oct 30, 6:30 PM Wake Forest vs Pitt | ",
 "Upcoming Nov 1, 1:00 PM Wake Forest vs SMU | ",
 "Upcoming Nov 6, 6:00 PM Wake Forest at Clemson | ",
 "Upcoming Nov 8, 1:00 PM Wake Forest at Georgia Tech | ",
 "Upcoming Nov 13, 6:30 PM Wake Forest vs Virginia | ",
 "Upcoming Nov 15, 1:00 PM Wake Forest vs Virginia Tech | ",
 "Upcoming Nov 20, 7:00 PM Wake Forest at Louisville | ",
 "Upcoming Nov 22, 1:00 PM Wake Forest at Notre Dame | ",
 "Upcoming Nov 25, 1:00 PM Wake Forest at Virginia Tech | ",
 "Upcoming Nov 27, 3:00 PM Wake Forest vs Clemson | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');

// Men's tennis lists players' pro events ("ATP Challenger 75k"): not the team's.
assert.ok(!parse('Tennis','mens-tennis').some(e=>/ATP|Challenger/.test(e.opponent)));
assert.deepEqual(parse('Tennis','mens-tennis').filter(e=>e.status==='Final').map(e=>e.opponent),['ITA All-American Championships','ITA Carolina Regionals']);
// Women's golf cards publish no place: the final stories give it ("Team
// Title" in the headline, "Finishes Runner-Up").
{
  const golf=parse('Golf','womens-golf').filter(e=>e.status==='Final');
  for(const event of golf)recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
  for(const event of golf)await worker.wakeForestHandlers.attachGolfPlace(event);
  assert.deepEqual(golf.map(e=>[e.opponent,e.headline]),[['Annika Intercollegiate','1st'],['Jackson T. Stephens Cup','2nd']]);
}
console.log('Wake Forest module checks passed');
