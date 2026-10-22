import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lmuSchool} from '../src/schools/lmu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lmu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lmuHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lmu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lmulions.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lmu'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',lmuSchool.scheduleUrls],['roster',lmuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lmu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lmulions.com',`${key} must stay on lmulions.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lmulions.com/sports/baseball/schedule"],"roster":["https://lmulions.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lmulions.com/sports/mens-basketball/schedule","https://lmulions.com/sports/womens-basketball/schedule"],"roster":["https://lmulions.com/sports/mens-basketball/roster","https://lmulions.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://lmulions.com/sports/womens-beach-volleyball/schedule"],"roster":["https://lmulions.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://lmulions.com/sports/womens-cross-country/schedule"],"roster":["https://lmulions.com/sports/womens-cross-country/roster"],"combined":false},"Golf":{"schedule":["https://lmulions.com/sports/mens-golf/schedule"],"roster":["https://lmulions.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://lmulions.com/sports/womens-soccer/schedule","https://lmulions.com/sports/mens-soccer/schedule"],"roster":["https://lmulions.com/sports/womens-soccer/roster","https://lmulions.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://lmulions.com/sports/softball/schedule"],"roster":["https://lmulions.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://lmulions.com/sports/womens-tennis/schedule","https://lmulions.com/sports/mens-tennis/schedule"],"roster":["https://lmulions.com/sports/womens-tennis/roster","https://lmulions.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://lmulions.com/sports/womens-volleyball/schedule"],"roster":["https://lmulions.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://lmulions.com/sports/womens-water-polo/schedule","https://lmulions.com/sports/mens-water-polo/schedule"],"roster":["https://lmulions.com/sports/womens-water-polo/roster","https://lmulions.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lmu|"+sport+"':"),`${sport} routes must live in the Loyola Marymount module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://lmulions.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lmuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lmu)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · LMU vs Cal | L, 59-60",
 "Upcoming Oct 25, 2:00 PM Men's · LMU vs UCSB | ",
 "Upcoming Nov 4, 7:00 PM Men's · LMU vs Queen's | ",
 "Upcoming Nov 6, 7:00 PM Men's · LMU vs Lincoln | ",
 "Upcoming Nov 10, 6:00 PM Men's · LMU at Troy | ",
 "Upcoming Nov 12, 7:00 PM Men's · LMU vs South Alabama | ",
 "Upcoming Nov 15, 1:00 PM Men's · LMU vs Chicago State | ",
 "Upcoming Nov 21, 4:00 PM Men's · LMU vs California Baptist | ",
 "Upcoming Nov 22, 1:30 PM Men's · LMU vs UC Irvine | ",
 "Upcoming Nov 25, 6:00 PM Men's · LMU vs Eastern Washington | ",
 "Upcoming Nov 28, 7:00 PM Men's · LMU at UC San Diego | ",
 "Upcoming Dec 4, 7:00 PM Men's · LMU vs Hawaii | ",
 "Upcoming Dec 7, 4:30 PM Men's · LMU vs Florida Gulf Coast | ",
 "Upcoming Dec 9, 7:00 PM Men's · LMU at Nevada | ",
 "Upcoming Dec 13 Men's · LMU vs McNeese State | ",
 "Upcoming Dec 19, 6:00 PM Men's · LMU vs CSU Bakersfield | ",
 "Upcoming Dec 22, 3:00 PM Men's · LMU vs Wyoming | ",
 "Upcoming Dec 29, 7:00 PM Men's · LMU vs Pepperdine | ",
 "Upcoming Jan 2, 7:00 PM Men's · LMU at Seattle U | ",
 "Upcoming Jan 6, 7:00 PM Men's · LMU vs San Diego | ",
 "Upcoming Jan 9 Men's · LMU at Pepperdine | ",
 "Upcoming Jan 12, 8:00 PM Men's · LMU vs Pacific | ",
 "Upcoming Jan 16, 3:00 PM Men's · LMU vs Santa Clara | ",
 "Upcoming Jan 19, 7:00 PM Men's · LMU at San Francisco | ",
 "Upcoming Jan 23, 7:00 PM Men's · LMU at Saint Mary's | ",
 "Upcoming Jan 27, 7:00 PM Men's · LMU vs Seattle U | ",
 "Upcoming Jan 30, 6:00 PM Men's · LMU vs Denver | ",
 "Upcoming Feb 6 Men's · LMU at Portland | ",
 "Upcoming Feb 10 Men's · LMU at San Diego | ",
 "Upcoming Feb 13, 7:30 PM Men's · LMU vs Saint Mary's | ",
 "Upcoming Feb 17, 7:00 PM Men's · LMU vs San Francisco | ",
 "Upcoming Feb 20, 6:00 PM Men's · LMU at Santa Clara | ",
 "Upcoming Feb 24 Men's · LMU at Denver | ",
 "Upcoming Feb 27, 6:00 PM Men's · LMU vs Portland | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · LMU vs Nevada | ",
 "Upcoming Nov 6, 1:00 PM Women's · LMU at Utah State | ",
 "Upcoming Nov 10, 12:00 PM Women's · LMU vs Life Pacific | ",
 "Upcoming Nov 13, 4:30 PM Women's · LMU vs Alabama A&M | ",
 "Upcoming Nov 15, 5:30 PM Women's · LMU vs Hawaii | ",
 "Upcoming Nov 20, 7:00 PM Women's · LMU vs Idaho State | ",
 "Upcoming Nov 25, 12:00 PM Women's · LMU at UNLV | ",
 "Upcoming Nov 27, 12:00 PM Women's · LMU vs Oral Roberts | ",
 "Upcoming Dec 2, 6:00 PM Women's · LMU at New Mexico | ",
 "Upcoming Dec 7, 7:30 PM Women's · LMU vs Cal | ",
 "Upcoming Dec 10, 6:00 PM Women's · LMU at Gonzaga | ",
 "Upcoming Dec 13, 2:00 PM Women's · LMU at Long Beach State | ",
 "Upcoming Dec 20, 1:00 PM Women's · LMU vs Howard | ",
 "Upcoming Dec 22, 2:00 PM Women's · LMU at Nevada | ",
 "Upcoming Dec 31, 2:00 PM Women's · LMU vs Seattle U | ",
 "Upcoming Jan 2, 2:00 PM Women's · LMU vs Saint Mary's | ",
 "Upcoming Jan 7, 6:00 PM Women's · LMU at San Francisco | ",
 "Upcoming Jan 9, 1:00 PM Women's · LMU at Santa Clara | ",
 "Upcoming Jan 14, 6:00 PM Women's · LMU vs Portland | ",
 "Upcoming Jan 16, 7:00 PM Women's · LMU vs Pacific | ",
 "Upcoming Jan 21, 6:00 PM Women's · LMU at Pepperdine | ",
 "Upcoming Jan 23, 2:00 PM Women's · LMU at San Diego | ",
 "Upcoming Jan 28, 6:00 PM Women's · LMU vs San Francisco | ",
 "Upcoming Jan 30, 4:00 PM Women's · LMU at Pacific | ",
 "Upcoming Feb 4, 6:00 PM Women's · LMU vs Denver | ",
 "Upcoming Feb 6, 2:00 PM Women's · LMU vs Pepperdine | ",
 "Upcoming Feb 11, 6:00 PM Women's · LMU at Portland | ",
 "Upcoming Feb 13, 1:00 PM Women's · LMU at Seattle U | ",
 "Upcoming Feb 18 Women's · LMU at Denver | ",
 "Upcoming Feb 20, 2:00 PM Women's · LMU vs San Diego | ",
 "Upcoming Feb 25, 6:00 PM Women's · LMU vs Santa Clara | ",
 "Upcoming Feb 27, 4:00 PM Women's · LMU at Saint Mary's | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 9 LMU at Sand Court Experts West Coast Championship | ",
 "Upcoming Oct 23 LMU at Cal Poly & Stanford | ",
 "Upcoming Oct 24 LMU vs Pismo Beach Fall Event | ",
 "Upcoming Nov 6 LMU at AVCA Pairs National Championship | ",
 "Upcoming Nov 6 LMU at UCLA and San Diego | ",
 "Upcoming Nov 7 LMU vs UCLA and San Diego | ",
 "Upcoming Nov 13 LMU at Hawaii and Georgia State | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 LMU at Mark Covert Classic | 4th of 9",
 "Final Sep 18 LMU at Saint Mary's College Invitational | 10th of 16",
 "Final Oct 2 LMU at Joe Piane Invitational | 18th of 24",
 "Final Oct 17 LMU at Highlander Invitational | 12th of 20",
 "Upcoming Oct 30, 10:00 AM LMU at WCC Championships | ",
 "Upcoming Nov 13, 10:00 AM LMU at NCAA West Regional | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 LMU at Inverness Intercollegiate | 9th of 18",
 "Final Oct 4 LMU at Trinity Forest Invitational | T8th of 17",
 "Final Oct 16 LMU at Golf Club of Georgia Collegiate | 12th of 14",
 "Upcoming Nov 4 LMU at Pearl at Kalauao | ",
 "Upcoming Feb 11 LMU at John Burns Intercollegiate | ",
 "Upcoming Feb 24 LMU at Bronson Cup | ",
 "Upcoming Mar 8 LMU at R.E.L. Invitational | ",
 "Upcoming Mar 15 LMU at Pauma Valley Invitational | ",
 "Upcoming Mar 22 LMU at Bruin Invitational | ",
 "Upcoming Apr 5 LMU at Golfweek Invitational | ",
 "Upcoming Apr 10 LMU at The Aggie Invitational | ",
 "Upcoming Apr 30 LMU at WCC Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · LMU at UCSB | L, 0-1",
 "Final Aug 20 Women's · LMU vs Pittsburgh | L, 1-2",
 "Final Aug 23 Women's · LMU at Cal State Fullerton | L, 1-2",
 "Final Aug 29 Women's · LMU at Cal | L, 1-2",
 "Final Sep 3 Women's · LMU vs UC Riverside | W, 1-0",
 "Final Sep 10 Women's · LMU vs UC Davis | T, 0-0",
 "Final Sep 14 Women's · LMU at UC San Diego | L, 1-2",
 "Final Sep 18 Women's · LMU at Oregon State | T, 0-0",
 "Final Sep 26 Women's · LMU at Pacific | W, 1-0",
 "Final Oct 3 Women's · LMU vs San Diego | W, 1-0",
 "Final Oct 7 Women's · LMU at Saint Mary's | W, 1-0",
 "Final Oct 10 Women's · LMU vs Santa Clara | T, 1-1",
 "Final Oct 17 Women's · LMU at Pepperdine | W, 1-0",
 "Upcoming Oct 24, 6:00 PM Women's · LMU at Seattle U | ",
 "Upcoming Oct 28, 6:00 PM Women's · LMU vs Denver | ",
 "Upcoming Nov 1, 1:00 PM Women's · LMU at Portland | ",
 "Upcoming Nov 7, 1:00 PM Women's · LMU vs San Francisco | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · LMU at Michigan | T, 0-0",
 "Final Aug 24 Men's · LMU at UC Irvine | L, 1-3",
 "Final Aug 28 Men's · LMU at SMU | L, 0-2",
 "Final Sep 2 Men's · LMU vs UNLV | W, 1-0",
 "Final Sep 7 Men's · LMU vs Cal Poly | L, 0-1",
 "Final Sep 11 Men's · LMU vs California Baptist | L, 0-1",
 "Final Sep 16 Men's · LMU at Cal State Fullerton | T, 0-0",
 "Final Sep 26 Men's · LMU at Portland | L, 0-4",
 "Final Sep 30 Men's · LMU vs San Diego | L, 1-2",
 "Final Oct 3 Men's · LMU at Denver | L, 1-2",
 "Final Oct 10 Men's · LMU at Santa Clara | L, 0-2",
 "Final Oct 17 Men's · LMU vs Seattle U | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Men's · LMU at Saint Mary's | ",
 "Upcoming Oct 31, 6:00 PM Men's · LMU vs San Francisco | ",
 "Upcoming Nov 6, 6:00 PM Men's · LMU vs Pacific | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 3 Women's · LMU at San Diego Veterans Classic | Completed",
 "Final Oct 15 Women's · LMU at ITA Southwest Regional | Completed",
 "Upcoming Oct 30 Women's · LMU at Jack Kramer Invitational | ",
 "Upcoming Nov 6 Women's · LMU at CSUN Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 9 Men's · LMU at UCSB Invite | Completed",
 "Upcoming Nov 5 Men's · LMU at ITA Sectionals/Socal Intercollegiates | ",
 "Upcoming Nov 13 Men's · LMU at LMU Invite | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 LMU vs Northern Arizona | W, 3-0",
 "Final Aug 29 LMU vs Southeastern Louisiana | W, 3-0",
 "Final Aug 30 LMU at Ole Miss | W, 3-1",
 "Final Sep 3 LMU vs UC San Diego | W, 3-1",
 "Final Sep 4 LMU at Hawaii | L, 2-3",
 "Final Sep 6 LMU vs Utah Tech | W, 3-1",
 "Final Sep 11 LMU at UC Irvine | W, 3-2",
 "Final Sep 12 LMU vs Brown | W, 3-0",
 "Final Sep 13 LMU at Long Beach State | L, 0-3",
 "Final Sep 17 LMU vs CSUN | W, 3-1",
 "Final Sep 19 LMU at CSUN | W, 3-2",
 "Final Sep 24 LMU at San Francisco | W, 3-2",
 "Final Sep 26 LMU at Santa Clara | W, 3-1",
 "Final Oct 1 LMU vs Saint Mary's | W, 3-0",
 "Final Oct 3 LMU vs Pacific | W, 3-0",
 "Final Oct 8 LMU at San Diego | W, 3-2",
 "Final Oct 10 LMU at Denver | W, 3-2",
 "Final Oct 17 LMU vs Pepperdine | L, 1-3",
 "Today Oct 22, 6:00 PM LMU vs Santa Clara | ",
 "Upcoming Oct 24, 1:00 PM LMU vs San Francisco | ",
 "Upcoming Oct 29, 6:00 PM LMU at Portland | ",
 "Upcoming Oct 31, 1:00 PM LMU at Seattle U | ",
 "Upcoming Nov 5, 6:00 PM LMU at Pacific | ",
 "Upcoming Nov 7, 2:00 PM LMU at Saint Mary's | ",
 "Upcoming Nov 12, 6:00 PM LMU vs Denver | ",
 "Upcoming Nov 14, 1:00 PM LMU vs San Diego | ",
 "Upcoming Nov 21, 1:00 PM LMU at Pepperdine | ",
 "Upcoming Nov 25, 1:00 PM LMU vs Seattle U | ",
 "Upcoming Nov 28, 1:00 PM LMU vs Portland | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · LMU vs Pomona-Pitzer | W, 14-9",
 "Final Aug 28 Men's · LMU vs Cal State Fullerton | W, 15-5",
 "Final Aug 29 Men's · LMU vs Concordia University Irvine | W, 20-9",
 "Final Aug 29 Men's · LMU vs George Washington | W, 15-12",
 "Final Sep 12 Men's · LMU at UCLA | L, 12-24",
 "Final Sep 12 Men's · LMU vs UCSB | L, 12-13",
 "Final Sep 18 Men's · LMU vs Cal | L, 9-20",
 "Final Sep 19 Men's · LMU vs UC Davis | W, 11-8",
 "Final Sep 19 Men's · LMU vs Pepperdine | W, 15-14",
 "Final Sep 20 Men's · LMU vs Princeton | L, 9-10",
 "Final Sep 23 Men's · LMU at UC San Diego | W, 10-9",
 "Final Sep 26 Men's · LMU at UC Irvine | L, 8-13",
 "Final Sep 26 Men's · LMU vs Navy | L, 18-19",
 "Final Oct 1 Men's · LMU vs Cuesta College | W, 22-9",
 "Final Oct 1 Men's · LMU vs McKendree | W, 23-7",
 "Final Oct 3 Men's · LMU vs Pepperdine | W, 13-10",
 "Final Oct 9 Men's · LMU at Saint Mary's | W, 12-10",
 "Final Oct 11 Men's · LMU at Pacific | W, 12-11",
 "Final Oct 17 Men's · LMU vs San Jose State | W, 13-9",
 "Final Oct 18 Men's · LMU vs Santa Clara | W, 14-13",
 "Upcoming Oct 23, 1:00 PM Men's · LMU at Concordia University Irvine | ",
 "Upcoming Oct 24, 2:00 PM Men's · LMU at UC San Diego | ",
 "Upcoming Oct 30, 5:30 PM Men's · LMU at Air Force | ",
 "Upcoming Nov 8, 12:00 PM Men's · LMU at UC Davis | ",
 "Upcoming Nov 12, 7:00 PM Men's · LMU vs Long Beach State | ",
 "Upcoming Nov 14, 1:00 PM Men's · LMU at California Baptist | ",
 "Upcoming Nov 20 Men's · LMU at WCC Championship | ",
 "Upcoming Nov 21 Men's · LMU at WCC Championship | ",
 "Upcoming Nov 22 Men's · LMU at WCC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Loyola Marymount module checks passed");
