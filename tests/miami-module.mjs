import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {miamiSchool} from '../src/schools/miami.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='miami');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,miamiHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/miami-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit miamihurricanes.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['miami'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',miamiSchool.scheduleUrls],['roster',miamiSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('miami|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'miamihurricanes.com',`${key} must stay on miamihurricanes.com`);
  }
}
const parity={"Baseball":{"schedule":["https://miamihurricanes.com/sports/baseball/schedule"],"roster":["https://miamihurricanes.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://miamihurricanes.com/sports/mbball/schedule","https://miamihurricanes.com/sports/wbball/schedule"],"roster":["https://miamihurricanes.com/sports/mbball/roster","https://miamihurricanes.com/sports/wbball/roster"],"combined":true},"Cross Country":{"schedule":["https://miamihurricanes.com/sports/cross/schedule"],"roster":["https://miamihurricanes.com/sports/cross/roster"],"combined":false},"Football":{"schedule":["https://miamihurricanes.com/sports/football/schedule"],"roster":["https://miamihurricanes.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://miamihurricanes.com/sports/golf/schedule"],"roster":["https://miamihurricanes.com/sports/golf/roster"],"combined":false},"Rowing":{"schedule":["https://miamihurricanes.com/sports/wrow/schedule"],"roster":["https://miamihurricanes.com/sports/wrow/roster"],"combined":false},"Soccer":{"schedule":["https://miamihurricanes.com/sports/soc/schedule"],"roster":["https://miamihurricanes.com/sports/soc/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://miamihurricanes.com/sports/swim/schedule"],"roster":["https://miamihurricanes.com/sports/swim/roster"],"combined":false},"Tennis":{"schedule":["https://miamihurricanes.com/sports/mten/schedule","https://miamihurricanes.com/sports/wten/schedule"],"roster":["https://miamihurricanes.com/sports/mten/roster","https://miamihurricanes.com/sports/wten/roster"],"combined":true},"Track & Field":{"schedule":["https://miamihurricanes.com/sports/track/schedule"],"roster":["https://miamihurricanes.com/sports/track/roster"],"combined":false},"Volleyball":{"schedule":["https://miamihurricanes.com/sports/wvball/schedule"],"roster":["https://miamihurricanes.com/sports/wvball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'miami|"+sport+"':"),`${sport} routes must live in the Miami module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://miamihurricanes.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.miamiHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];




// BEGIN generated (scripts/generate-module-tests.mjs --school=miami)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Oct 23, 6:00 PM Men's · Miami vs Vanderbilt (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Miami vs Florida | ",
 "Upcoming Nov 6, 9:00 PM Men's · Miami vs Wagner | ",
 "Upcoming Nov 9, 7:00 PM Men's · Miami vs North Florida | ",
 "Upcoming Nov 13, 5:00 PM Men's · Miami vs North Alabama | ",
 "Upcoming Nov 17, 7:00 PM Men's · Miami vs Rider | ",
 "Upcoming Nov 20, 5:00 PM Men's · Miami vs Manhattan | ",
 "Upcoming Nov 24, 3:00 PM Men's · Miami vs TCU | ",
 "Upcoming Nov 26 Men's · Miami vs Michigan or Creighton | ",
 "Upcoming Nov 27 Men's · Miami vs TBD | ",
 "Upcoming Nov 28 Men's · Miami at Players Era 16 Championship | ",
 "Upcoming Dec 2, 9:15 PM Men's · Miami vs Alabama | ",
 "Upcoming Dec 5, 5:00 PM Men's · Miami vs Stetson | ",
 "Upcoming Dec 12, 5:30 PM Men's · Miami vs Texas | ",
 "Upcoming Dec 16, 7:00 PM Men's · Miami vs Alcorn State | ",
 "Upcoming Dec 21, 1:00 PM Men's · Miami vs USC Upstate | ",
 "Upcoming Dec 29, 8:00 PM Men's · Miami vs NC State | ",
 "Upcoming Jan 2, 2:00 PM Men's · Miami at Pitt | ",
 "Upcoming Jan 5, 7:00 PM Men's · Miami at Georgia Tech | ",
 "Upcoming Jan 9, 3:00 PM Men's · Miami vs Syracuse | ",
 "Upcoming Jan 16, 6:00 PM Men's · Miami vs Virginia | ",
 "Upcoming Jan 19, 7:00 PM Men's · Miami at Louisville | ",
 "Upcoming Jan 23, 6:00 PM Men's · Miami at Virginia Tech | ",
 "Upcoming Jan 27, 7:00 PM Men's · Miami vs Clemson | ",
 "Upcoming Jan 30, 12:00 PM Men's · Miami vs Wake Forest | ",
 "Upcoming Feb 1, 7:00 PM Men's · Miami at Duke | ",
 "Upcoming Feb 6, 2:00 PM Men's · Miami vs Florida State | ",
 "Upcoming Feb 10, 9:00 PM Men's · Miami at Stanford | ",
 "Upcoming Feb 13, 10:00 PM Men's · Miami at Cal | ",
 "Upcoming Feb 20, 4:30 PM Men's · Miami vs Notre Dame | ",
 "Upcoming Feb 22, 7:00 PM Men's · Miami at North Carolina | ",
 "Upcoming Feb 27 Men's · Miami vs Pitt | ",
 "Upcoming Mar 2, 7:00 PM Men's · Miami vs SMU | ",
 "Upcoming Mar 6, 2:00 PM Men's · Miami at Florida State | ",
 "Upcoming Mar 9 Men's · Miami at ACC Men's Basketball Tournament | ",
 "Upcoming Mar 18 Men's · Miami at NCAA First and Second Rounds | ",
 "Upcoming Mar 25 Men's · Miami vs Sweet 16 & Elite Eight | ",
 "Upcoming Apr 3 Men's · Miami at Men's Final Four | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Oct 18, 2:00 PM Women's · Miami vs Lynn University (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Miami vs FAU | ",
 "Upcoming Nov 5, 7:00 PM Women's · Miami vs Jacksonville | ",
 "Upcoming Nov 8, 2:00 PM Women's · Miami vs Stetson | ",
 "Upcoming Nov 12, 7:00 PM Women's · Miami vs Saint Peter's | ",
 "Upcoming Nov 16, 11:00 AM Women's · Miami vs Le Moyne | ",
 "Upcoming Nov 19, 7:00 PM Women's · Miami vs FIU | ",
 "Upcoming Nov 23, 4:00 PM Women's · Miami vs Michigan | ",
 "Upcoming Nov 25, 4:00 PM Women's · Miami vs Utah | ",
 "Upcoming Nov 29, 2:00 PM Women's · Miami vs UAPB | ",
 "Upcoming Dec 2, 5:00 PM Women's · Miami at Florida | ",
 "Upcoming Dec 6, 2:00 PM Women's · Miami vs Stony Brook | ",
 "Upcoming Dec 13, 2:00 PM Women's · Miami at Louisville | ",
 "Upcoming Dec 16, 9:30 PM Women's · Miami vs USC | ",
 "Upcoming Dec 20, 2:00 PM Women's · Miami vs Morgan State | ",
 "Upcoming Dec 22, 12:00 PM Women's · Miami vs Boston College | ",
 "Upcoming Dec 28, 7:00 PM Women's · Miami vs Bethune-Cookman | ",
 "Upcoming Dec 31, 2:00 PM Women's · Miami at NC State | ",
 "Upcoming Jan 3, 6:00 PM Women's · Miami vs Notre Dame | ",
 "Upcoming Jan 7, 10:00 PM Women's · Miami at Stanford | ",
 "Upcoming Jan 10, 6:00 PM Women's · Miami at Cal | ",
 "Upcoming Jan 14, 7:00 PM Women's · Miami vs Virginia | ",
 "Upcoming Jan 17, 2:00 PM Women's · Miami vs Florida State | ",
 "Upcoming Jan 21, 7:00 PM Women's · Miami at Clemson | ",
 "Upcoming Jan 28, 6:00 PM Women's · Miami at Syracuse | ",
 "Upcoming Jan 31, 12:00 PM Women's · Miami vs SMU | ",
 "Upcoming Feb 4, 7:00 PM Women's · Miami vs North Carolina | ",
 "Upcoming Feb 7, 2:00 PM Women's · Miami at Duke | ",
 "Upcoming Feb 11, 7:00 PM Women's · Miami vs Wake Forest | ",
 "Upcoming Feb 14, 2:00 PM Women's · Miami at Florida State | ",
 "Upcoming Feb 21, 2:00 PM Women's · Miami at Pitt | ",
 "Upcoming Feb 25, 7:00 PM Women's · Miami vs Virginia Tech | ",
 "Upcoming Feb 28, 2:00 PM Women's · Miami vs Georgia Tech | ",
 "Upcoming Mar 3 Women's · Miami at ACC Tournament | ",
 "Upcoming Mar 19 Women's · Miami at First and Second Rounds | ",
 "Upcoming Mar 26 Women's · Miami at Regional Rounds | ",
 "Upcoming Apr 2 Women's · Miami at Women's Final Four | "
]);
  const v_cross=parse("Cross Country","cross");
  assert.deepEqual(v_cross.map(line),[
 "Final Sep 4 Miami at Florida Intercollegiate XC Invitational | Completed",
 "Final Sep 18 Miami at FSU Pre-Regional | Completed",
 "Final Oct 2 Miami at Joe Piane - Notre Dame Invitational | Completed",
 "Upcoming Oct 16, 4:30 PM Miami at Joe Handelman '52 Fall Classic | ",
 "Upcoming Oct 30, 9:00 AM Miami at ACC Cross Country Championships | ",
 "Upcoming Nov 13, 9:00 AM Miami at NCAA South Region Championships | ",
 "Upcoming Nov 21, 9:00 AM Miami at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Miami at Stanford | W, 45-6",
 "Final Sep 10 Miami vs Florida A&M | W, 77-7",
 "Final Sep 18 Miami at Wake Forest | W, 33-20",
 "Final Sep 26 Miami vs Central Michigan | W, 52-3",
 "Final Oct 3 Miami at Clemson | W, 41-13",
 "Upcoming Oct 17, 7:00 PM Miami vs Florida State | ",
 "Upcoming Oct 24, 12:00 PM Miami vs Pittsburgh | ",
 "Upcoming Oct 31 Miami at North Carolina | ",
 "Upcoming Nov 7, 7:30 PM Miami at Notre Dame | ",
 "Upcoming Nov 14 Miami vs Duke | ",
 "Upcoming Nov 21 Miami vs Virginia Tech | ",
 "Upcoming Nov 28 Miami vs Boston College | "
]);
  const v_golf=parse("Golf","golf");
  assert.deepEqual(v_golf.map(line),[
 "Final Aug 31 Miami at Boilermaker Classic | Completed",
 "Final Sep 7 Miami at Cougar Classic | Completed",
 "Final Sep 21 Miami at Golfweek Red Sky Classic | Completed",
 "Upcoming Oct 16 Miami at Ruth Chris Tar Heel Invitational | ",
 "Upcoming Jan 31 Miami at Therese Hession Regional Challenge | ",
 "Upcoming Feb 22 Miami at Momentum Transportation UNF Challenge | ",
 "Upcoming Mar 6 Miami at Gators Invitational | ",
 "Upcoming Mar 21 Miami at Clemson Invitational | ",
 "Upcoming Apr 15 Miami at ACC Championships | ",
 "Upcoming May 10 Miami at NCAA Regional Championship | ",
 "Upcoming May 21 Miami at NCAA Championship | "
]);
  const v_wrow=parse("Rowing","wrow");
  assert.deepEqual(v_wrow.map(line),[]);
  const v_soc=parse("Soccer","soc");
  assert.deepEqual(v_soc.map(line),[
 "Final Aug 12 Miami at Jacksonville | L, 0-2",
 "Final Aug 16 Miami at FAU | W, 3-0",
 "Final Aug 20 Miami at Little Rock | W, 3-0",
 "Final Aug 23 Miami at Lipscomb | W, 1-0",
 "Final Aug 27 Miami vs Incarnate Word | W, 2-1",
 "Final Sep 3 Miami vs App State | T, 2-2",
 "Final Sep 6 Miami at FIU | W, 1-0",
 "Final Sep 11 Miami vs SMU | W, 2-1",
 "Final Sep 17 Miami at Virginia | L, 0-3",
 "Final Sep 20 Miami at NC State | W, 2-1",
 "Final Sep 24 Miami vs Clemson | L, 2-3",
 "Final Oct 3 Miami at Pittsburgh | W, 1-0",
 "Final Oct 10 Miami vs Wake Forest | T, 0-0",
 "Upcoming Oct 18, 1:00 PM Miami vs Iona | ",
 "Upcoming Oct 23, 8:00 PM Miami vs Boston College | ",
 "Upcoming Oct 29, 7:00 PM Miami at Syracuse | ",
 "Upcoming Nov 1, 4:00 PM Miami vs Florida State | ",
 "Upcoming Nov 5, 7:00 PM Miami at Notre Dame | ",
 "Upcoming Nov 8 Miami at ACC Tournament | ",
 "Upcoming Nov 20 Miami at NCAA Tournament | "
]);
  const v_swim=parse("Swimming & Diving","swim");
  assert.deepEqual(v_swim.map(line),[
 "Final Oct 2 Miami vs Ohio, UNF | Completed",
 "Upcoming Oct 15 Miami at Florida (Men's Diving) | ",
 "Upcoming Oct 23 Miami at Dual-A-Pool-Ooza | ",
 "Upcoming Oct 24 Miami vs FIU, Vanderbilt, Liberty | ",
 "Upcoming Oct 30 Miami at Alabama | ",
 "Upcoming Nov 11 Miami at University of Texas Diving Invitational | ",
 "Upcoming Nov 17 Miami at Hawkeye Invite | ",
 "Upcoming Dec 2 Miami at U.S. Open Swimming Championships | ",
 "Upcoming Jan 5, 3:00 PM Miami vs Iowa | ",
 "Upcoming Jan 14, 5:00 PM Miami vs FIU | ",
 "Upcoming Jan 22, 2:00 PM Miami at Florida State | ",
 "Upcoming Feb 12 Miami at Ibis Invitational | ",
 "Upcoming Feb 16 Miami at ACC Swimming & Diving Championships | ",
 "Upcoming Feb 27 Miami at Bulldog Invitational (Swimming) | ",
 "Upcoming Mar 7 Miami at NCAA Zone B Qualifying (Diving) | ",
 "Upcoming Mar 17 Miami at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 Miami at NCAA Men's Diving Championships | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[
 "Final Sep 19 Men's · Miami at ITA All American Championships | Completed",
 "Today Oct 14 Men's · Miami at ITA Regional Championships | ",
 "Upcoming Nov 5 Men's · Miami at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Men's · Miami at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Miami at NCAA Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Sep 19 Women's · Miami at ITA All American Championships | Completed",
 "Final Oct 8 Women's · Miami at ITA Southeast Regional Championship | Completed",
 "Upcoming Nov 5 Women's · Miami at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Miami at NCAA Championships | "
]);
  const v_track=parse("Track & Field","track");
  assert.deepEqual(v_track.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 28 Miami at Michigan State | L, 2-3",
 "Final Aug 29 Miami at Michigan | L, 0-3",
 "Final Sep 4 Miami vs UCLA | L, 0-3",
 "Final Sep 5 Miami vs UCLA | L, 0-3",
 "Final Sep 9 Miami at Florida | L, 0-3",
 "Final Sep 11 Miami at Minnesota | L, 0-3",
 "Final Sep 12 Miami at St. Thomas | L, 0-3",
 "Final Sep 17 Miami vs LSU | W, 3-1",
 "Final Sep 19 Miami vs Tulsa | W, 3-0",
 "Final Sep 23 Miami at Florida State | L, 2-3",
 "Final Sep 27 Miami vs Florida State | W, 3-0",
 "Final Oct 2 Miami vs Wake Forest | W, 3-1",
 "Final Oct 4 Miami vs NC State | W, 3-0",
 "Final Oct 9 Miami vs Clemson | W, 3-1",
 "Final Oct 11 Miami vs Georgia Tech | W, 3-2",
 "Upcoming Oct 16, 8:00 PM Miami at SMU | ",
 "Upcoming Oct 18, 12:00 PM Miami at Pitt | ",
 "Upcoming Oct 23, 6:00 PM Miami vs Notre Dame | ",
 "Upcoming Oct 25, 3:30 PM Miami vs Louisville | ",
 "Upcoming Oct 30, 7:00 PM Miami at Virginia | ",
 "Upcoming Nov 1, 12:30 PM Miami at Virginia Tech | ",
 "Upcoming Nov 6, 7:00 PM Miami vs Stanford | ",
 "Upcoming Nov 8, 1:00 PM Miami vs Cal | ",
 "Upcoming Nov 13, 6:00 PM Miami at Syracuse | ",
 "Upcoming Nov 15, 1:00 PM Miami at Boston College | ",
 "Upcoming Nov 20, 7:00 PM Miami at North Carolina | ",
 "Upcoming Nov 22, 1:00 PM Miami at Duke | ",
 "Upcoming Nov 25, 1:00 PM Miami at NC State | ",
 "Upcoming Nov 27, 1:00 PM Miami vs North Carolina | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_cross,"Cross Country cross");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_golf,"Golf golf");
  ownRecapsOnly(v_wrow,"Rowing wrow");
  ownRecapsOnly(v_soc,"Soccer soc");
  ownRecapsOnly(v_swim,"Swimming & Diving swim");
  ownRecapsOnly(v_mten,"Tennis mten");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_track,"Track & Field track");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
}
// END generated

// Golf places from the final stories' headlines (the cards publish none).
{
  const {miamiGolfPlace}=await import('../src/schools/miami.mjs');
  assert.deepEqual(['Miami Golf Takes Team and Individual Titles at Boilermaker Classic to Open 2026-27 Season','Miami Golf Places Fifth at Cougar Classic','Schremmer Wins Golfweek Red Sky Classic as Miami Finishes Second','Schremmer Wins Golfweek Red Sky Classic'].map(miamiGolfPlace),['1','5','2',null]);
}
assert.equal(requests.length,0,'no unexpected network requests');
console.log('Miami module checks passed');
