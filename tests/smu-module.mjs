import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {smuSchool} from '../src/schools/smu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {withoutRanking} from '../src/sidearm-schedule-reader.mjs';
import {mergeMeetDays} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='smu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,smuHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/smu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit smumustangs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['smu'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',smuSchool.scheduleUrls],['roster',smuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('smu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'smumustangs.com',`${key} must stay on smumustangs.com`);
  }
}
const parity={"Basketball":{"schedule":["https://smumustangs.com/sports/mens-basketball/schedule","https://smumustangs.com/sports/womens-basketball/schedule"],"roster":["https://smumustangs.com/sports/mens-basketball/roster","https://smumustangs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://smumustangs.com/sports/womens-cross-country/schedule"],"roster":["https://smumustangs.com/sports/womens-cross-country/roster"],"combined":false},"Equestrian":{"schedule":["https://smumustangs.com/sports/equestrian/schedule"],"roster":["https://smumustangs.com/sports/equestrian/roster"],"combined":false},"Football":{"schedule":["https://smumustangs.com/sports/football/schedule"],"roster":["https://smumustangs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://smumustangs.com/sports/womens-golf/schedule","https://smumustangs.com/sports/mens-golf/schedule"],"roster":["https://smumustangs.com/sports/womens-golf/roster","https://smumustangs.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://smumustangs.com/sports/rowing/schedule"],"roster":["https://smumustangs.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://smumustangs.com/sports/womens-soccer/schedule","https://smumustangs.com/sports/mens-soccer/schedule"],"roster":["https://smumustangs.com/sports/womens-soccer/roster","https://smumustangs.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://smumustangs.com/sports/womens-swimming-and-diving/schedule","https://smumustangs.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://smumustangs.com/sports/womens-swimming-and-diving/roster","https://smumustangs.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://smumustangs.com/sports/womens-tennis/schedule","https://smumustangs.com/sports/mens-tennis/schedule"],"roster":["https://smumustangs.com/sports/womens-tennis/roster","https://smumustangs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://smumustangs.com/sports/womens-track-and-field/schedule"],"roster":["https://smumustangs.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://smumustangs.com/sports/womens-volleyball/schedule"],"roster":["https://smumustangs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'smu|"+sport+"':"),`${sport} routes must live in the SMU module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://smumustangs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.smuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=smu)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 1:00 PM Men's · SMU vs Texas A&M (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · SMU vs Southern | ",
 "Upcoming Nov 5, 7:00 PM Men's · SMU vs Virginia Military Institute | ",
 "Upcoming Nov 10, 7:00 PM Men's · SMU vs Prairie View A&M | ",
 "Upcoming Nov 13, 8:00 PM Men's · SMU vs Ball State | ",
 "Upcoming Nov 17, 7:00 PM Men's · SMU vs Oral Roberts | ",
 "Upcoming Nov 20, 7:00 PM Men's · SMU vs South Alabama | ",
 "Upcoming Nov 25, 6:00 PM Men's · SMU vs Utah State | ",
 "Upcoming Nov 26, 6:00 PM Men's · SMU vs LSU | ",
 "Upcoming Dec 1, 7:00 PM Men's · SMU vs Stephen F. Austin | ",
 "Upcoming Dec 5, 4:30 PM Men's · SMU at DePaul | ",
 "Upcoming Dec 8, 7:00 PM Men's · SMU vs UTSA | ",
 "Upcoming Dec 12, 12:30 PM Men's · SMU vs Minnesota | ",
 "Upcoming Dec 19, 2:30 PM Men's · SMU vs UNLV | ",
 "Upcoming Dec 22, 7:30 PM Men's · SMU vs Oklahoma | ",
 "Upcoming Jan 2, 5:00 PM Men's · SMU at Virginia | ",
 "Upcoming Jan 5, 6:00 PM Men's · SMU vs Wake Forest | ",
 "Upcoming Jan 9, 1:15 PM Men's · SMU vs Louisville | ",
 "Upcoming Jan 12, 8:00 PM Men's · SMU at NC State | ",
 "Upcoming Jan 16, 11:00 AM Men's · SMU at Virginia Tech | ",
 "Upcoming Jan 23, 3:30 PM Men's · SMU vs Georgia Tech | ",
 "Upcoming Jan 26, 6:00 PM Men's · SMU at North Carolina | ",
 "Upcoming Jan 30, 11:30 AM Men's · SMU at Notre Dame | ",
 "Upcoming Feb 3, 7:00 PM Men's · SMU vs California | ",
 "Upcoming Feb 6, 7:00 PM Men's · SMU vs Stanford | ",
 "Upcoming Feb 9, 8:00 PM Men's · SMU vs Duke | ",
 "Upcoming Feb 13, 11:00 AM Men's · SMU at Louisville | ",
 "Upcoming Feb 16, 6:00 PM Men's · SMU at Boston College | ",
 "Upcoming Feb 20, 1:15 PM Men's · SMU vs Syracuse | ",
 "Upcoming Feb 23, 9:00 PM Men's · SMU vs Clemson | ",
 "Upcoming Feb 27, 11:00 AM Men's · SMU at Georgia Tech | ",
 "Upcoming Mar 2, 6:00 PM Men's · SMU at Miami | ",
 "Upcoming Mar 6, 5:00 PM Men's · SMU vs Pittsburgh | ",
 "Upcoming Mar 9 Men's · SMU vs ACC - First Round | ",
 "Upcoming Mar 10 Men's · SMU vs ACC - Second Round | ",
 "Upcoming Mar 11 Men's · SMU vs ACC - Quarterfinal | ",
 "Upcoming Mar 12 Men's · SMU vs ACC - Semifinal | ",
 "Upcoming Mar 13 Men's · SMU vs ACC - Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 21, 6:00 PM Women's · SMU vs West Texas A&M | ",
 "Upcoming Oct 27, 6:30 PM Women's · SMU vs UNT Dallas | ",
 "Upcoming Nov 3, 6:30 PM Women's · SMU vs Le Moyne | ",
 "Upcoming Nov 5, 11:00 AM Women's · SMU vs Hampton | ",
 "Upcoming Nov 8, 6:00 PM Women's · SMU vs East Texas A&M | ",
 "Upcoming Nov 11, 6:00 PM Women's · SMU vs LIU | ",
 "Upcoming Nov 15, 6:00 PM Women's · SMU vs Nicholls | ",
 "Upcoming Nov 17, 6:30 PM Women's · SMU at Kansas State | ",
 "Upcoming Nov 21, 5:00 PM Women's · SMU vs Grand Canyon | ",
 "Upcoming Nov 23, 6:00 PM Women's · SMU vs Saint Mary's | ",
 "Upcoming Nov 25, 3:00 PM Women's · SMU vs Memphis | ",
 "Upcoming Nov 29, 5:00 PM Women's · SMU vs Virginia | ",
 "Upcoming Dec 2, 8:15 PM Women's · SMU vs Georgia | ",
 "Upcoming Dec 6, 1:00 PM Women's · SMU at Syracuse | ",
 "Upcoming Dec 9, 6:30 PM Women's · SMU at Tulsa | ",
 "Upcoming Dec 18, 6:30 PM Women's · SMU vs Coppin State | ",
 "Upcoming Dec 20, 3:00 PM Women's · SMU vs UTSA | ",
 "Upcoming Dec 23, 12:00 PM Women's · SMU vs Incarnate Word | ",
 "Upcoming Dec 31, 12:00 PM Women's · SMU at Wake Forest | ",
 "Upcoming Jan 3, 2:00 PM Women's · SMU vs Stanford | ",
 "Upcoming Jan 7, 5:00 PM Women's · SMU at Boston College | ",
 "Upcoming Jan 10, 1:00 PM Women's · SMU at Pitt | ",
 "Upcoming Jan 14, 6:00 PM Women's · SMU vs Clemson | ",
 "Upcoming Jan 21, 6:00 PM Women's · SMU at Georgia Tech | ",
 "Upcoming Jan 24, 1:00 PM Women's · SMU vs Louisville | ",
 "Upcoming Jan 28, 6:30 PM Women's · SMU vs NC State | ",
 "Upcoming Jan 31, 11:00 AM Women's · SMU at Miami | ",
 "Upcoming Feb 4, 7:00 PM Women's · SMU at Notre Dame | ",
 "Upcoming Feb 7, 2:00 PM Women's · SMU vs Pitt | ",
 "Upcoming Feb 11, 5:00 PM Women's · SMU at Virginia Tech | ",
 "Upcoming Feb 14, 1:00 PM Women's · SMU vs North Carolina | ",
 "Upcoming Feb 21, 2:00 PM Women's · SMU vs Cal | ",
 "Upcoming Feb 25, 5:00 PM Women's · SMU vs Duke | ",
 "Upcoming Feb 28, 1:00 PM Women's · SMU at Florida State | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 SMU at John McKenzie Invitational | 1st of 4",
 "Final Sep 11 SMU at Texas A&M Invitational | 1st of 15",
 "Final Sep 26 SMU at Cowboy Jamboree | 4th of 20",
 "Upcoming Oct 16 SMU at Pre-National Invitational | ",
 "Upcoming Oct 30 SMU at ACC Cross Country Championships | ",
 "Upcoming Nov 13 SMU at NCAA South Central Regional Championships | ",
 "Upcoming Nov 21 SMU at NCAA Cross Country Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Oct 1 SMU at South Carolina | L, 9-10",
 "Final Oct 1 SMU at TCU | W, 12-7",
 "Final Oct 3 SMU at Auburn | L, 7-12",
 "Upcoming Oct 29 SMU at Texas A&M | ",
 "Upcoming Nov 6 SMU vs Georgia | ",
 "Upcoming Nov 7 SMU vs Oklahoma State | ",
 "Upcoming Nov 14 SMU at Fresno State | ",
 "Upcoming Jan 29 SMU vs Minnesota Crookston | ",
 "Upcoming Jan 30 SMU vs Texas A&M | ",
 "Upcoming Feb 13 SMU at South Dakota State | ",
 "Upcoming Feb 20 SMU at Oklahoma State | ",
 "Upcoming Feb 26 SMU vs Delaware State | ",
 "Upcoming Feb 27 SMU at UT Martin | ",
 "Upcoming Mar 5 SMU vs Auburn | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 7 SMU at Florida State | W, 27-24",
 "Final Sep 12 SMU vs UC Davis | W, 56-10",
 "Final Sep 19 SMU at Louisville | L, 31-41",
 "Final Sep 26 SMU vs Missouri State | W, 34-24",
 "Final Oct 3 SMU vs Boston College | W, 25-16",
 "Upcoming Oct 17, 11:00 AM SMU vs Virginia | ",
 "Upcoming Oct 24 SMU vs Cal | ",
 "Upcoming Oct 31 SMU at Syracuse | ",
 "Upcoming Nov 6, 6:00 PM SMU vs Virginia Tech | ",
 "Upcoming Nov 14 SMU vs Wake Forest | ",
 "Upcoming Nov 21, 6:30 PM SMU at Notre Dame | ",
 "Upcoming Nov 28 SMU at Stanford | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · SMU at Leadership & Sports Invitational | T4th of 17",
 "Final Oct 12 Women's · SMU at Haskins Intercollegiate | T5th of 13",
 "Upcoming Oct 16, 8:25 AM Women's · SMU at Stanford Intercollegiate | ",
 "Upcoming Oct 23 Women's · SMU at Landfall Tradition | ",
 "Upcoming Jan 31 Women's · SMU at Therese Hession Regional Challenge | ",
 "Upcoming Feb 8 Women's · SMU at Member Invitational | ",
 "Upcoming Feb 22 Women's · SMU at The Chevron Intercollegiate | ",
 "Upcoming Mar 1 Women's · SMU at Darius Rucker Invitational | ",
 "Upcoming Mar 22 Women's · SMU at Charles Schwab Women's Collegiate | ",
 "Upcoming Apr 5 Women's · SMU at Huntington Bank Collegiate | ",
 "Upcoming Apr 15 Women's · SMU at ACC Championships | ",
 "Upcoming May 10 Women's · SMU at NCAA Regional Championship | ",
 "Upcoming May 21 Women's · SMU at NCAA National Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · SMU at Jackson T. Stephens Cup | 5th of 6",
 "Final Sep 25 Men's · SMU at William H. Tucker Invitational | 15th of 15",
 "Final Oct 4 Men's · SMU at Trinity Forest Invitational | 10th of 17",
 "Upcoming Oct 19 Men's · SMU at Abilene Christian | ",
 "Upcoming Feb 15 Men's · SMU at The Prestige | ",
 "Upcoming Mar 8 Men's · SMU at Desimone Invitational | ",
 "Upcoming Mar 15 Men's · SMU at Pauma Valley Invitational | ",
 "Upcoming Mar 25 Men's · SMU at The Goodwin | ",
 "Upcoming Apr 12 Men's · SMU at Lewis Chitengwa Invitational | ",
 "Upcoming Apr 22 Men's · SMU at ACC Championship | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 16 SMU at Head of the Charles | ",
 "Upcoming Nov 8 SMU vs Texas (Exhibition) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · SMU at Vanderbilt | L, 3-4",
 "Final Aug 16 Women's · SMU vs North Texas | W, 2-0",
 "Final Aug 20 Women's · SMU vs Boise State | T, 0-0",
 "Final Aug 23 Women's · SMU vs Incarnate Word | W, 5-1",
 "Final Aug 27 Women's · SMU vs Southern | W, 4-0",
 "Final Aug 30 Women's · SMU vs Houston Christian | W, 2-0",
 "Final Sep 3 Women's · SMU vs Texas Tech | T, 1-1",
 "Final Sep 6 Women's · SMU vs Idaho State | W, 6-0",
 "Final Sep 11 Women's · SMU at Miami | L, 1-2",
 "Final Sep 17 Women's · SMU at NC State | L, 2-4",
 "Final Sep 25 Women's · SMU vs Stanford | T, 0-0",
 "Final Oct 2 Women's · SMU at Boston College | L, 1-3",
 "Final Oct 8 Women's · SMU vs Virginia Tech | T, 1-1",
 "Final Oct 11 Women's · SMU vs Virginia | L, 1-5",
 "Upcoming Oct 16, 8:00 PM Women's · SMU vs Duke | ",
 "Upcoming Oct 22, 2:00 PM Women's · SMU at California | ",
 "Upcoming Oct 29, 6:00 PM Women's · SMU at North Carolina | ",
 "Upcoming Nov 5, 6:00 PM Women's · SMU vs Pittsburgh | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · SMU vs Stetson | W, 3-1",
 "Final Aug 24 Men's · SMU at Saint Louis | W, 4-0",
 "Final Aug 28 Men's · SMU vs LMU | W, 2-0",
 "Final Aug 31 Men's · SMU vs HCU | W, 6-0",
 "Final Sep 4 Men's · SMU vs Kansas City | T, 1-1",
 "Final Sep 7 Men's · SMU vs Incarnate Word | W, 3-0",
 "Final Sep 11 Men's · SMU at Pittsburgh | W, 3-1",
 "Final Sep 18 Men's · SMU vs NC State | W, 1-0",
 "Final Sep 27 Men's · SMU at Virginia Tech | W, 3-0",
 "Final Oct 2 Men's · SMU at Wake Forest | W, 2-0",
 "Final Oct 10 Men's · SMU vs Duke | W, 6-0",
 "Upcoming Oct 16, 5:00 PM Men's · SMU vs Stanford | ",
 "Upcoming Oct 20, 6:00 PM Men's · SMU vs Central Arkansas | ",
 "Upcoming Oct 24, 5:00 PM Men's · SMU at California | ",
 "Upcoming Oct 30, 6:30 PM Men's · SMU vs Louisville | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · SMU vs Oklahoma Christian | W, 211.00-68.00",
 "Final Oct 2 Women's · SMU vs Incarnate Word | W, 211.00-78.00",
 "Final Oct 9 Women's · SMU at SMU Classic | 3rd · 271 pts",
 "Upcoming Oct 22, 2:00 PM Women's · SMU at Arizona State | ",
 "Upcoming Oct 23, 2:00 PM Women's · SMU at Arizona | ",
 "Upcoming Oct 30, 6:00 PM Women's · SMU at TCU | ",
 "Upcoming Nov 7, 6:00 PM Women's · SMU at FGCU | ",
 "Upcoming Nov 18, 10:00 AM Women's · SMU at SMU Invite | ",
 "Upcoming Jan 8, 1:00 PM Women's · SMU vs Texas | ",
 "Upcoming Jan 22, 2:00 PM Women's · SMU vs Utah | ",
 "Upcoming Jan 23, 2:00 PM Women's · SMU at Texas A&M | ",
 "Upcoming Jan 30, 2:00 PM Women's · SMU at LSU | ",
 "Upcoming Feb 16 Women's · SMU at ACC Championships | ",
 "Upcoming Feb 25 Women's · SMU at Last Chance Meet | ",
 "Upcoming Mar 8 Women's · SMU at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 Women's · SMU at NCAA Swimming & Diving Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · SMU vs Oklahoma Christian | W, 198.00-78.00",
 "Final Oct 2 Men's · SMU vs Incarnate Word | W, 192.00-91.00",
 "Final Oct 9 Men's · SMU at SMU Classic | 3rd · 234 pts",
 "Upcoming Oct 22, 2:00 PM Men's · SMU at Arizona State | ",
 "Upcoming Oct 23 Men's · SMU at Arizona | ",
 "Upcoming Nov 4, 4:00 PM Men's · SMU vs TCU | ",
 "Upcoming Nov 18, 10:00 AM Men's · SMU at SMU Invite | ",
 "Upcoming Jan 4 Men's · SMU vs Oklahoma Christian | ",
 "Upcoming Jan 4 Men's · SMU vs William Carey | ",
 "Upcoming Jan 8, 1:00 PM Men's · SMU vs Texas | ",
 "Upcoming Jan 22, 2:00 PM Men's · SMU vs Utah | ",
 "Upcoming Jan 23, 2:00 PM Men's · SMU at Texas A&M | ",
 "Upcoming Jan 30, 2:00 PM Men's · SMU at Louisiana State | ",
 "Upcoming Feb 16 Men's · SMU at ACC Championships | ",
 "Upcoming Mar 4, 11:00 AM Men's · SMU at SMU Last Chance Meet | ",
 "Upcoming Mar 8 Men's · SMU at NCAA Zone Diving Championships | ",
 "Upcoming Mar 24 Men's · SMU at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · SMU at ACU Invitational | Completed",
 "Final Sep 19 Women's · SMU at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · SMU at Rice Invitational | Completed",
 "Final Oct 8 Women's · SMU at ITA Regional Championships | Completed",
 "Upcoming Oct 26 Women's · SMU at WTA 125 Queretaro | ",
 "Upcoming Oct 30 Women's · SMU at ASU Thunderbird Invitational | ",
 "Upcoming Nov 5 Women's · SMU at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · SMU at ITA Conference Masters | ",
 "Upcoming Nov 17 Women's · SMU at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · SMU at Chowderfest | Completed",
 "Final Sep 25 Men's · SMU at Sherwood Collegiate Cup | Completed",
 "Final Oct 8 Men's · SMU at ITA Regional Championships | Completed",
 "Upcoming Oct 16 Men's · SMU at Ralph O Connor Invitational Tournament | ",
 "Upcoming Oct 29 Men's · SMU at Ralston/Neufeld Coaches Challenge | ",
 "Upcoming Nov 5 Men's · SMU at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · SMU at ITA Conference Masters Championships | ",
 "Upcoming Nov 16 Men's · SMU at NCAA Individual Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 23 SMU vs Texas A&M | W, 3-0",
 "Final Aug 27 SMU vs Penn State (Exhibition) | W, 2-0",
 "Final Aug 27 SMU vs Nebraska (Exhibition) | L, 0-2",
 "Final Aug 29 SMU at Colorado State | W, 3-1",
 "Final Aug 30 SMU vs UC Davis | W, 3-2",
 "Final Sep 2 SMU at TCU | L, 2-3",
 "Final Sep 4 SMU at San Diego | W, 3-1",
 "Final Sep 9 SMU vs Texas | W, 3-2",
 "Final Sep 12 SMU vs Kentucky | W, 3-1",
 "Final Sep 13 SMU vs Purdue | L, 0-3",
 "Final Sep 17 SMU vs Rice | W, 3-0",
 "Final Sep 19 SMU vs Yale | W, 3-0",
 "Final Sep 25 SMU vs Stanford | W, 3-0",
 "Final Sep 27 SMU vs California | W, 3-1",
 "Final Oct 2 SMU at Syracuse | W, 3-0",
 "Final Oct 4 SMU at Boston College | W, 3-0",
 "Final Oct 7 SMU at Pittsburgh | W, 3-1",
 "Final Oct 11 SMU vs Pittsburgh | L, 0-3",
 "Upcoming Oct 16, 7:00 PM SMU vs Miami | ",
 "Upcoming Oct 18, 1:00 PM SMU vs Florida State | ",
 "Upcoming Oct 23, 5:00 PM SMU at Clemson | ",
 "Upcoming Oct 25, 12:30 PM SMU at Georgia Tech | ",
 "Upcoming Oct 30, 6:00 PM SMU at NC State | ",
 "Upcoming Nov 1, 12:00 PM SMU at Wake Forest | ",
 "Upcoming Nov 6, 12:00 PM SMU vs North Carolina | ",
 "Upcoming Nov 8, 12:00 PM SMU vs Duke | ",
 "Upcoming Nov 12, 7:00 PM SMU vs Louisville | ",
 "Upcoming Nov 15, 12:00 PM SMU vs Notre Dame | ",
 "Upcoming Nov 20, 6:00 PM SMU at Virginia Tech | ",
 "Upcoming Nov 22, 12:00 PM SMU at Virginia | ",
 "Upcoming Nov 25, 1:00 PM SMU vs Georgia Tech | ",
 "Upcoming Nov 28, 12:00 PM SMU at Louisville | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Football ranks both polls in brackets ("[23/RV] Louisville", "[RV/RV]
// Florida State"): the opponent is the school alone. Earlier forms stay.
assert.deepEqual(['[23/RV] Louisville','[RV/RV] Florida State','[RV] Xavier','(RV) Miami','No. 6/7 North Carolina','#9/#10 Ole Miss','Miami (Fla.)'].map(withoutRanking),["Louisville","Florida State","Xavier","Miami","North Carolina","Ole Miss","Miami (Fla.)"]);
assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(line).slice(0,3),["Final Sep 7 SMU at Florida State | W, 27-24","Final Sep 12 SMU vs UC Davis | W, 56-10","Final Sep 19 SMU at Louisville | L, 31-41"]);

// Swimming names a meet's days "Day One", "Day Two" under the meet (the SMU
// Classic, Oct 9-10): one event named after the meet with the last day's
// place, written without a unit ("3rd, 271").
assert.deepEqual(mergeMeetDays([
  {date:'2026-10-09T17:00:00',opponent:{title:'Day One'},tournament:{title:'SMU Classic'},result:{prescore_info:'3rd, 133',recap:{url:'/a'}}},
  {date:'2026-10-10T10:00:00',opponent:{title:'Day Two'},tournament:{title:'SMU Classic'},result:{prescore_info:'3rd, 271',recap:{url:'/b'}}},
  {date:'2026-11-18T10:00:00',opponent:{title:'Day One'},tournament:{title:'SMU Invite'},result:null}
]).map(g=>[g.opponent.title,g.date,g.enddate||null,g.result?.prescore_info||null,g.result?.recap?.url||null]),[["SMU Classic","2026-10-09T17:00:00","2026-10-10T10:00:00","3rd, 271","/b"],["SMU Invite","2026-11-18T10:00:00",null,null,null]]);
assert.deepEqual(['womens-swimming-and-diving','mens-swimming-and-diving'].flatMap(slug=>parse('Swimming & Diving',slug).filter(e=>/Classic/.test(e.title)).map(line)),["Final Oct 9 Women's · SMU at SMU Classic | 3rd · 271 pts","Final Oct 9 Men's · SMU at SMU Classic | 3rd · 234 pts"]);

// Women's golf lists each round as "<Tournament> Day N": one tournament with
// the last round's place.
assert.deepEqual(parse('Golf','womens-golf').filter(e=>e.status==='Final').map(line),["Final Sep 14 Women's · SMU at Leadership & Sports Invitational | T4th of 17","Final Oct 12 Women's · SMU at Haskins Intercollegiate | T5th of 13"]);

// Women's tennis: only the ITA All-Americans has a story (the women's archive
// lists no other fall story, Oct 15): the ACU and Rice Invitationals and the
// ITA Regional are not listed.
{
  recapFixtures.set('https://smumustangs.com/sports/womens-tennis/archives',fixture('womens-tennis-archives.html.gz'));
  recapFixtures.set('https://smumustangs.com/news/2026/9/25/womens-tennis-van-impe-clinches-ncaa-championships-bid-advances-to-quarterfinals-at-ita-all-americans',fixture('story-2026-9-25-womens-tennis-van-impe-clinches-ncaa-cha.html.gz'));
  const finals=parse('Tennis','womens-tennis').filter(e=>e.status==='Final');
  for(const event of finals)if(worker.smuHandlers.isFinalWithoutStory(event))await worker.smuHandlers.attachArchiveStory(event);
  assert.deepEqual(finals.map(e=>[line(e),worker.smuHandlers.isTennisWithoutStory(e)]),[["Final Sep 18 Women's · SMU at ACU Invitational | Completed",true],["Final Sep 19 Women's · SMU at ITA All-American Championships | Completed",false],["Final Sep 25 Women's · SMU at Rice Invitational | Completed",true],["Final Oct 8 Women's · SMU at ITA Regional Championships | Completed",true]]);
  recapFixtures.clear();requests.length=0;
}

// Soccer and Tennis pin three athletes each from the official profiles.
assert.deepEqual(Object.keys(smuSchool.verifiedInstagrams).map(k=>k.split('|').slice(1).join('|')),["Soccer|Hali Hartman","Soccer|Aubrey Brown","Soccer|Jessi Curry","Tennis|Allie Bittner","Tennis|Natalie Stasny","Tennis|Caroline McGinley"]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('SMU module checks passed');
