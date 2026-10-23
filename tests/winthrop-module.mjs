import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {winthropSchool} from '../src/schools/winthrop.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='winthrop');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,winthropHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/winthrop-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit winthropeagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['winthrop'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',winthropSchool.scheduleUrls],['roster',winthropSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('winthrop|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'winthropeagles.com',`${key} must stay on winthropeagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://winthropeagles.com/sports/baseball/schedule"],"roster":["https://winthropeagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://winthropeagles.com/sports/mens-basketball/schedule","https://winthropeagles.com/sports/womens-basketball/schedule"],"roster":["https://winthropeagles.com/sports/mens-basketball/roster","https://winthropeagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://winthropeagles.com/sports/womens-cross-country/schedule","https://winthropeagles.com/sports/mens-cross-country/schedule"],"roster":["https://winthropeagles.com/sports/womens-cross-country/roster","https://winthropeagles.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://winthropeagles.com/sports/womens-golf/schedule","https://winthropeagles.com/sports/mens-golf/schedule"],"roster":["https://winthropeagles.com/sports/womens-golf/roster","https://winthropeagles.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://winthropeagles.com/sports/womens-lacrosse/schedule"],"roster":["https://winthropeagles.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://winthropeagles.com/sports/womens-soccer/schedule","https://winthropeagles.com/sports/mens-soccer/schedule"],"roster":["https://winthropeagles.com/sports/womens-soccer/roster","https://winthropeagles.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://winthropeagles.com/sports/softball/schedule"],"roster":["https://winthropeagles.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://winthropeagles.com/sports/womens-track-and-field/schedule","https://winthropeagles.com/sports/mens-track-and-field/schedule"],"roster":["https://winthropeagles.com/sports/womens-track-and-field/roster","https://winthropeagles.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://winthropeagles.com/sports/womens-volleyball/schedule"],"roster":["https://winthropeagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'winthrop|"+sport+"':"),`${sport} routes must live in the Winthrop module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://winthropeagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.winthropHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=winthrop)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 9:00 AM Men's · Winthrop vs Queens | ",
 "Upcoming Nov 7, 12:00 PM Men's · Winthrop vs North Dakota | ",
 "Upcoming Nov 10, 7:00 PM Men's · Winthrop at Kennesaw State | ",
 "Upcoming Nov 14, 2:30 PM Men's · Winthrop vs Jackson State | ",
 "Upcoming Nov 18, 6:30 PM Men's · Winthrop vs UT Chattanooga | ",
 "Upcoming Nov 21, 5:00 PM Men's · Winthrop at Wofford College | ",
 "Upcoming Nov 23 Men's · Winthrop at Illinois | ",
 "Upcoming Nov 28 Men's · Winthrop vs Clinton College | ",
 "Upcoming Dec 2 Men's · Winthrop at South Carolina St. | ",
 "Upcoming Dec 5, 3:00 PM Men's · Winthrop at Coastal Carolina | ",
 "Upcoming Dec 8, 6:30 PM Men's · Winthrop vs Bob Jones | ",
 "Upcoming Dec 12, 10:00 PM Men's · Winthrop at Utah State | ",
 "Upcoming Dec 14, 8:30 PM Men's · Winthrop at Wyoming | ",
 "Upcoming Dec 16, 8:00 PM Men's · Winthrop at North Texas | ",
 "Upcoming Dec 21, 12:00 PM Men's · Winthrop vs Toccoa Falls | ",
 "Upcoming Dec 28, 3:00 PM Men's · Winthrop vs Morris College | ",
 "Upcoming Jan 1, 2:00 PM Men's · Winthrop vs Gardner-Webb | ",
 "Upcoming Jan 3, 2:00 PM Men's · Winthrop at UNC Asheville | ",
 "Upcoming Jan 6, 6:30 PM Men's · Winthrop vs Longwood | ",
 "Upcoming Jan 9, 2:00 PM Men's · Winthrop at USC Upstate | ",
 "Upcoming Jan 13 Men's · Winthrop vs Radford | ",
 "Upcoming Jan 16 Men's · Winthrop at Presbyterian College | ",
 "Upcoming Jan 20, 6:30 PM Men's · Winthrop vs High Point | ",
 "Upcoming Jan 23, 2:00 PM Men's · Winthrop vs Charleston Southern | ",
 "Upcoming Jan 30 Men's · Winthrop at Radford | ",
 "Upcoming Feb 3 Men's · Winthrop at Longwood | ",
 "Upcoming Feb 6, 2:00 PM Men's · Winthrop vs UNC Asheville | ",
 "Upcoming Feb 11, 7:00 PM Men's · Winthrop at Charleston Southern | ",
 "Upcoming Feb 13, 2:00 PM Men's · Winthrop vs USC Upstate | ",
 "Upcoming Feb 18, 7:00 PM Men's · Winthrop at High Point | ",
 "Upcoming Feb 20 Men's · Winthrop at Gardner-Webb | ",
 "Upcoming Feb 25, 6:30 PM Men's · Winthrop vs Presbyterian College | ",
 "Upcoming Mar 3 Men's · Winthrop at Big South Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Winthrop vs Newberry College | ",
 "Upcoming Nov 5, 7:00 PM Women's · Winthrop at Georgia | ",
 "Upcoming Nov 10, 6:00 PM Women's · Winthrop vs Johnson C. Smith | ",
 "Upcoming Nov 14, 12:00 PM Women's · Winthrop vs Clinton College | ",
 "Upcoming Nov 17, 11:00 AM Women's · Winthrop vs South Carolina State | ",
 "Upcoming Nov 22, 4:00 PM Women's · Winthrop at San Diego State | ",
 "Upcoming Nov 24, 4:00 PM Women's · Winthrop vs James Madison | ",
 "Upcoming Nov 25, 4:00 PM Women's · Winthrop vs Grand Canyon | ",
 "Upcoming Nov 30, 5:00 PM Women's · Winthrop vs Hampton | ",
 "Upcoming Dec 3, 5:00 PM Women's · Winthrop vs Chicago State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Winthrop vs Wofford | ",
 "Upcoming Dec 9, 11:00 AM Women's · Winthrop at North Carolina | ",
 "Upcoming Dec 16, 11:00 AM Women's · Winthrop at Charlotte | ",
 "Upcoming Dec 19, 2:00 PM Women's · Winthrop at Mercer | ",
 "Upcoming Dec 21, 1:00 PM Women's · Winthrop at East Carolina | ",
 "Upcoming Dec 30, 6:00 PM Women's · Winthrop vs High Point | ",
 "Upcoming Jan 2, 4:00 PM Women's · Winthrop at USC Upstate | ",
 "Upcoming Jan 6, 6:00 PM Women's · Winthrop at Radford | ",
 "Upcoming Jan 9, 2:00 PM Women's · Winthrop vs Gardner-Webb | ",
 "Upcoming Jan 13, 6:00 PM Women's · Winthrop at Presbyterian | ",
 "Upcoming Jan 16, 2:00 PM Women's · Winthrop vs Longwood | ",
 "Upcoming Jan 23, 2:00 PM Women's · Winthrop at Charleston Southern | ",
 "Upcoming Jan 27, 6:30 PM Women's · Winthrop at UNC Asheville | ",
 "Upcoming Jan 30, 2:00 PM Women's · Winthrop vs USC Upstate | ",
 "Upcoming Feb 3, 6:00 PM Women's · Winthrop vs Radford | ",
 "Upcoming Feb 6, 2:00 PM Women's · Winthrop at Longwood | ",
 "Upcoming Feb 10, 6:00 PM Women's · Winthrop vs Charleston Southern | ",
 "Upcoming Feb 13, 2:00 PM Women's · Winthrop at Gardner-Webb | ",
 "Upcoming Feb 17, 6:00 PM Women's · Winthrop vs UNC Asheville | ",
 "Upcoming Feb 24, 7:00 PM Women's · Winthrop at High Point | ",
 "Upcoming Feb 27, 2:00 PM Women's · Winthrop vs Presbyterian | ",
 "Upcoming Mar 3 Women's · Winthrop at Big South Conference Women's Basketball Tournament - First Round | ",
 "Upcoming Mar 4 Women's · Winthrop at Big South Conference Women's Basketball Tournament - Quarterfinal | ",
 "Upcoming Mar 6 Women's · Winthrop at Big South Conference Women's Basketball Tournament - Semifinal | ",
 "Upcoming Mar 7 Women's · Winthrop at Big South Conference Women's Basketball Tournament - Final | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Winthrop at Elon XC Opener | 8th of 14",
 "Final Sep 25 Women's · Winthrop at Winthrop Invitational | Completed",
 "Final Oct 2 Women's · Winthrop at Fire Tower Project | 8th of 14",
 "Final Oct 17 Women's · Winthrop at Upstate Invitational | 13th of 36",
 "Upcoming Oct 30 Women's · Winthrop at Big South Cross Country Championships | ",
 "Upcoming Nov 13 Women's · Winthrop at NCAA Southeast Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Winthrop at Elon XC Opener | 9th of 14",
 "Final Sep 25 Men's · Winthrop at Winthrop Invitational | 2nd of 5",
 "Final Oct 2 Men's · Winthrop at Fire Tower Project | Completed",
 "Final Oct 17 Men's · Winthrop at Upstate Invitational | Completed",
 "Upcoming Oct 30 Men's · Winthrop at Big South Cross Country Championships | ",
 "Upcoming Nov 13 Men's · Winthrop at NCAA Southeast Regional Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Winthrop at AOD at Quail Hollow | Completed",
 "Final Sep 14 Women's · Winthrop at Elon Invitational | Completed",
 "Final Oct 12 Women's · Winthrop at Terrier Intercollegiate | Completed",
 "Final Oct 19 Women's · Winthrop at UNCG Fall Collegiate | Completed",
 "Upcoming Feb 8 Women's · Winthrop at Oyster Shuck Match Play | ",
 "Upcoming Feb 15 Women's · Winthrop at Rivertowne Intercollegiate | ",
 "Upcoming Mar 22 Women's · Winthrop at Henssler Financial Invitational | ",
 "Upcoming Mar 29 Women's · Winthrop at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 Women's · Winthrop at Olde Stone Collegiate | ",
 "Upcoming Apr 18 Women's · Winthrop at Big South Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Winthrop at Myrtle Beach Golf Trips Collegiate | Completed",
 "Final Sep 20 Men's · Winthrop at GMAC Invitational | Completed",
 "Final Sep 28 Men's · Winthrop at Bryan Bros. Collegiate | Completed",
 "Final Oct 18 Men's · Winthrop at Furman Intercollegiate | Completed",
 "Upcoming Feb 28 Men's · Winthrop at Lake Jovita Collegiate | ",
 "Upcoming Mar 12 Men's · Winthrop at Seminole Intercollegiate | ",
 "Upcoming Mar 22 Men's · Winthrop at Seahawk Intercollegiate | ",
 "Upcoming Mar 28 Men's · Winthrop at The Rodeo at Bulls Bay | ",
 "Upcoming Apr 12 Men's · Winthrop at Wofford Invitational | ",
 "Upcoming Apr 25 Men's · Winthrop at Big South Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Winthrop at Western Carolina | L, 2-4",
 "Final Aug 16 Women's · Winthrop vs UT - Chattanooga | L, 0-5",
 "Final Aug 20 Women's · Winthrop vs VMI | W, 1-0",
 "Final Aug 23 Women's · Winthrop vs Emory & Henry | T, 1-1",
 "Final Aug 27 Women's · Winthrop at Queens | W, 4-0",
 "Final Aug 30 Women's · Winthrop at The Citadel | L, 0-1",
 "Final Sep 3 Women's · Winthrop vs Mercer | L, 0-4",
 "Final Sep 10 Women's · Winthrop at Wofford | L, 0-3",
 "Final Sep 13 Women's · Winthrop vs South Carolina State | W, 3-0",
 "Final Sep 19 Women's · Winthrop vs Charleston Southern | L, 0-2",
 "Final Sep 26 Women's · Winthrop at Radford | L, 1-2",
 "Final Sep 30 Women's · Winthrop vs Longwood | L, 0-5",
 "Final Oct 3 Women's · Winthrop at USC Upstate | L, 1-5",
 "Final Oct 14 Women's · Winthrop vs Presbyterian College | W, 4-0",
 "Final Oct 17 Women's · Winthrop vs Gardner-Webb | W, 1-0",
 "Upcoming Oct 28, 6:00 PM Women's · Winthrop at UNC Asheville | ",
 "Upcoming Oct 31, 4:00 PM Women's · Winthrop at High Point | ",
 "Upcoming Nov 5 Women's · Winthrop at Big South Conference Tournament | ",
 "Upcoming Nov 10 Women's · Winthrop at Big South Conference Tournament | ",
 "Upcoming Nov 15 Women's · Winthrop at Big South Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Winthrop at South Florida | W, 2-1",
 "Final Aug 29 Men's · Winthrop vs Johnson & Wales (N.C.) | W, 8-0",
 "Final Sep 1 Men's · Winthrop at Wofford College | L, 1-2",
 "Final Sep 5 Men's · Winthrop at VMI | W, 3-0",
 "Final Sep 8 Men's · Winthrop at College of Charleston | L, 1-4",
 "Final Sep 15 Men's · Winthrop at Charlotte | L, 1-2",
 "Final Sep 19 Men's · Winthrop at Radford | W, 3-1",
 "Final Sep 22 Men's · Winthrop at Campbell | T, 0-0",
 "Final Sep 29 Men's · Winthrop vs High Point | L, 0-2",
 "Final Oct 2 Men's · Winthrop vs Presbyterian College | W, 4-0",
 "Final Oct 6 Men's · Winthrop at UNCW | L, 2-3",
 "Final Oct 9 Men's · Winthrop at UNC Asheville | L, 0-3",
 "Final Oct 13 Men's · Winthrop vs ETSU | L, 0-1",
 "Final Oct 17 Men's · Winthrop vs Longwood | L, 2-4",
 "Final Oct 21 Men's · Winthrop at Virginia Tech | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Men's · Winthrop vs Gardner-Webb | ",
 "Upcoming Oct 31, 2:00 PM Men's · Winthrop at USC Upstate | ",
 "Upcoming Nov 4 Men's · Winthrop at Big South Tournament | ",
 "Upcoming Nov 8 Men's · Winthrop at Big South Tournament | ",
 "Upcoming Nov 14 Men's · Winthrop at Big South Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Winthrop at Davidson | L, 2-3",
 "Final Aug 29 Winthrop vs Wofford | L, 0-3",
 "Final Sep 3 Winthrop vs Virginia Tech | W, 3-0",
 "Final Sep 5 Winthrop vs Old Dominion | W, 3-2",
 "Final Sep 11 Winthrop at Ohio State | L, 2-3",
 "Final Sep 12 Winthrop vs Youngstown State | L, 1-3",
 "Final Sep 13 Winthrop vs Southern Indiana | L, 2-3",
 "Final Sep 18 Winthrop vs UNC Wilmington | W, 3-0",
 "Final Sep 19 Winthrop vs NC Central | W, 3-0",
 "Final Sep 26 Winthrop at Gardner-Webb | W, 3-1",
 "Final Oct 2 Winthrop vs Charleston Southern | W, 3-2",
 "Final Oct 3 Winthrop vs Presbyterian | W, 3-1",
 "Final Oct 9 Winthrop at Radford | W, 3-1",
 "Final Oct 10 Winthrop at High Point | L, 1-3",
 "Final Oct 16 Winthrop vs UNC Asheville | W, 3-2",
 "Final Oct 17 Winthrop vs USC Upstate | W, 3-0",
 "Today Oct 23, 6:00 PM Winthrop at Presbyterian | ",
 "Upcoming Oct 24, 4:00 PM Winthrop at Charleston Southern | ",
 "Upcoming Oct 30, 6:00 PM Winthrop at USC Upstate | ",
 "Upcoming Oct 31, 4:00 PM Winthrop at UNC Asheville | ",
 "Upcoming Nov 6, 6:00 PM Winthrop vs High Point | ",
 "Upcoming Nov 7, 5:00 PM Winthrop vs Radford | ",
 "Upcoming Nov 13, 6:00 PM Winthrop vs Gardner-Webb | ",
 "Upcoming Nov 20 Winthrop at Big South Conference Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Winthrop module checks passed");
