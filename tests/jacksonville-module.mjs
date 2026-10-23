import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {jacksonvilleSchool} from '../src/schools/jacksonville.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='jacksonville');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,jacksonvilleHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/jacksonville-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit judolphins.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['jacksonville'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',jacksonvilleSchool.scheduleUrls],['roster',jacksonvilleSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('jacksonville|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'judolphins.com',`${key} must stay on judolphins.com`);
  }
}
const parity={"Baseball":{"schedule":["https://judolphins.com/sports/baseball/schedule"],"roster":["https://judolphins.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://judolphins.com/sports/mens-basketball/schedule","https://judolphins.com/sports/womens-basketball/schedule"],"roster":["https://judolphins.com/sports/mens-basketball/roster","https://judolphins.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://judolphins.com/sports/womens-beach-volleyball/schedule"],"roster":["https://judolphins.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://judolphins.com/sports/womens-cross-country/schedule","https://judolphins.com/sports/mens-cross-country/schedule"],"roster":["https://judolphins.com/sports/womens-cross-country/roster","https://judolphins.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://judolphins.com/sports/womens-golf/schedule","https://judolphins.com/sports/mens-golf/schedule"],"roster":["https://judolphins.com/sports/womens-golf/roster","https://judolphins.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://judolphins.com/sports/hockey/schedule"],"roster":["https://judolphins.com/sports/hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://judolphins.com/sports/womens-lacrosse/schedule","https://judolphins.com/sports/mens-lacrosse/schedule"],"roster":["https://judolphins.com/sports/womens-lacrosse/roster","https://judolphins.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://judolphins.com/sports/womens-rowing/schedule","https://judolphins.com/sports/mens-rowing/schedule"],"roster":["https://judolphins.com/sports/womens-rowing/roster","https://judolphins.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://judolphins.com/sports/womens-soccer/schedule","https://judolphins.com/sports/mens-soccer/schedule"],"roster":["https://judolphins.com/sports/womens-soccer/roster","https://judolphins.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://judolphins.com/sports/softball/schedule"],"roster":["https://judolphins.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://judolphins.com/sports/womens-track-and-field/schedule"],"roster":["https://judolphins.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://judolphins.com/sports/womens-volleyball/schedule"],"roster":["https://judolphins.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'jacksonville|"+sport+"':"),`${sport} routes must live in the Jacksonville module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://judolphins.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.jacksonvilleHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=jacksonville)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 22, 5:00 PM Jacksonville vs St. Johns River Community College | ",
 "Upcoming Oct 24, 5:00 PM Jacksonville vs Mercer | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Jacksonville vs Paine College | ",
 "Upcoming Nov 5, 8:00 PM Men's · Jacksonville at Florida | ",
 "Upcoming Nov 9, 7:00 PM Men's · Jacksonville vs Missouri-Kansas City | ",
 "Upcoming Nov 16, 7:00 PM Men's · Jacksonville at Georgia | ",
 "Upcoming Nov 19, 7:00 PM Men's · Jacksonville vs Little Rock | ",
 "Upcoming Nov 21, 4:00 PM Men's · Jacksonville vs Central Arkansas | ",
 "Upcoming Nov 24, 7:00 PM Men's · Jacksonville at Indiana | ",
 "Upcoming Nov 28, 6:00 PM Men's · Jacksonville vs Trinity College of Jacksonville | ",
 "Upcoming Dec 1, 7:00 PM Men's · Jacksonville at UCF | ",
 "Upcoming Dec 5, 3:00 PM Men's · Jacksonville vs FIU | ",
 "Upcoming Dec 9, 7:00 PM Men's · Jacksonville at South Florida | ",
 "Upcoming Dec 12, 3:00 PM Men's · Jacksonville vs Baptist University of Florida | ",
 "Upcoming Dec 16, 7:00 PM Men's · Jacksonville at Florida State | ",
 "Upcoming Dec 19, 4:30 PM Men's · Jacksonville at USC | ",
 "Upcoming Dec 28, 2:00 PM Men's · Jacksonville vs Fort Lauderdale | ",
 "Upcoming Dec 31, 3:00 PM Men's · Jacksonville at UT Arlington | ",
 "Upcoming Jan 2, 7:00 PM Men's · Jacksonville at Abilene Christian | ",
 "Upcoming Jan 7, 7:00 PM Men's · Jacksonville vs Lipscomb | ",
 "Upcoming Jan 9, 6:00 PM Men's · Jacksonville vs Bellarmine | ",
 "Upcoming Jan 14, 7:00 PM Men's · Jacksonville at Queens | ",
 "Upcoming Jan 16, 2:00 PM Men's · Jacksonville at West Florida | ",
 "Upcoming Jan 22 Men's · Jacksonville vs North Florida | ",
 "Upcoming Jan 28 Men's · Jacksonville vs FGCU | ",
 "Upcoming Jan 30, 6:00 PM Men's · Jacksonville vs Stetson | ",
 "Upcoming Feb 4, 7:00 PM Men's · Jacksonville at Bellarmine | ",
 "Upcoming Feb 6, 5:00 PM Men's · Jacksonville at Lipscomb | ",
 "Upcoming Feb 11, 7:00 PM Men's · Jacksonville vs West Florida | ",
 "Upcoming Feb 13, 3:00 PM Men's · Jacksonville vs Queens | ",
 "Upcoming Feb 19, 7:00 PM Men's · Jacksonville at North Florida | ",
 "Upcoming Feb 25, 7:30 PM Men's · Jacksonville at Stetson | ",
 "Upcoming Feb 27, 4:00 PM Men's · Jacksonville at FGCU | ",
 "Upcoming Mar 4 Men's · Jacksonville at ASUN Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · Jacksonville at FIU | ",
 "Upcoming Nov 5, 7:00 PM Women's · Jacksonville at Miami (Fla.) | ",
 "Upcoming Nov 11, 6:00 PM Women's · Jacksonville at Coastal Carolina | ",
 "Upcoming Nov 14, 2:00 PM Women's · Jacksonville vs Warner (Fla.) | ",
 "Upcoming Nov 20, 6:30 PM Women's · Jacksonville vs Trinity College of Jacksonville | ",
 "Upcoming Nov 24, 6:30 PM Women's · Jacksonville at UCF | ",
 "Upcoming Nov 28, 2:00 PM Women's · Jacksonville vs Florida Tech | ",
 "Upcoming Dec 5, 2:00 PM Women's · Jacksonville at Little Rock | ",
 "Upcoming Dec 9, 7:00 PM Women's · Jacksonville at NC State | ",
 "Upcoming Dec 17, 7:00 PM Women's · Jacksonville at Georgia | ",
 "Upcoming Dec 28, 6:00 PM Women's · Jacksonville vs Fort Lauderdale | ",
 "Upcoming Dec 31, 2:00 PM Women's · Jacksonville vs Tarleton State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Jacksonville vs Abilene Christian | ",
 "Upcoming Jan 9, 2:00 PM Women's · Jacksonville vs North Florida | ",
 "Upcoming Jan 14 Women's · Jacksonville vs Lipscomb | ",
 "Upcoming Jan 16, 1:00 PM Women's · Jacksonville vs Bellarmine | ",
 "Upcoming Jan 21, 6:00 PM Women's · Jacksonville at Queens | ",
 "Upcoming Jan 23, 2:00 PM Women's · Jacksonville at West Florida | ",
 "Upcoming Jan 28 Women's · Jacksonville vs FGCU | ",
 "Upcoming Jan 30, 2:00 PM Women's · Jacksonville vs Stetson | ",
 "Upcoming Feb 6, 2:00 PM Women's · Jacksonville at North Florida | ",
 "Upcoming Feb 11, 6:30 PM Women's · Jacksonville at Bellarmine | ",
 "Upcoming Feb 13, 1:00 PM Women's · Jacksonville at Lipscomb | ",
 "Upcoming Feb 18, 6:30 PM Women's · Jacksonville vs West Florida | ",
 "Upcoming Feb 20, 2:00 PM Women's · Jacksonville vs Queens | ",
 "Upcoming Feb 25, 7:00 PM Women's · Jacksonville at Stetson | ",
 "Upcoming Feb 27, 1:00 PM Women's · Jacksonville at FGCU | ",
 "Upcoming Mar 4 Women's · Jacksonville at ASUN Women's Basketball Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Jacksonville at Florida Intercollegiate | Completed",
 "Final Sep 18 Women's · Jacksonville at Pre-Regional | Completed",
 "Final Oct 9 Women's · Jacksonville at FSU XC Invite | Completed",
 "Final Oct 17 Women's · Jacksonville at Upstate Invite | Completed",
 "Upcoming Oct 30 Women's · Jacksonville at ASUN Championship | ",
 "Upcoming Nov 13 Women's · Jacksonville at NCAA South Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Jacksonville at Florida Intercollegiate | Completed",
 "Final Sep 18 Men's · Jacksonville at Pre-Regional | Completed",
 "Final Oct 2 Men's · Jacksonville at FLRunners.com Invitational | Completed",
 "Final Oct 17 Men's · Jacksonville at Upstate Invitational | Completed",
 "Upcoming Oct 30 Men's · Jacksonville at ASUN Championship | ",
 "Upcoming Nov 13 Men's · Jacksonville at NCAA South Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Jacksonville at The Pirate Collegiate Classic | 12th of 13",
 "Final Oct 12 Women's · Jacksonville at The Robbie | 4th of 7",
 "Upcoming Oct 26 Women's · Jacksonville at Pat Bradley Invitational | ",
 "Upcoming Jan 25 Women's · Jacksonville at Sea Best Invitational | ",
 "Upcoming Feb 15 Women's · Jacksonville at Charleston Southern Women's Spring Invitational | ",
 "Upcoming Feb 22 Women's · Jacksonville at Momentum Transportation UNF Collegiate | ",
 "Upcoming Mar 22 Women's · Jacksonville at Georgia State Invitational | ",
 "Upcoming Apr 5 Women's · Jacksonville at The Brickyard Collegiate | ",
 "Upcoming Apr 11 Women's · Jacksonville at Atlantic Sun Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Jacksonville at Myrtle Beach Intercollegiate | 9th of 16",
 "Final Sep 13 Men's · Jacksonville at JT Poston Invitational | 15th of 17",
 "Final Oct 5 Men's · Jacksonville at West Bay Collegiate Invitational | 10th of 15",
 "Final Oct 12 Men's · Jacksonville at The Scrappy at Pinetree | T7th of 11",
 "Upcoming Jan 25 Men's · Jacksonville at Pablo Creek Cup | ",
 "Upcoming Feb 1 Men's · Jacksonville at Sea Best Invitational | ",
 "Upcoming Feb 13 Men's · Jacksonville at Gators Invitational | ",
 "Upcoming Mar 8 Men's · Jacksonville at Babygrande Donald Ross Collegiate | ",
 "Upcoming Mar 20 Men's · Jacksonville at Linger Longer Invitational | ",
 "Upcoming Mar 29 Men's · Jacksonville at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 20 Men's · Jacksonville at Atlantic Sun Men's Golf Championship | "
]);
  const v_hockey=parse("Hockey","hockey");
  assert.deepEqual(v_hockey.map(line),[
 "Final Sep 18 Jacksonville at Embry-Riddle | W, 5-1",
 "Final Sep 19 Jacksonville vs Embry-Riddle | W, 6-1",
 "Final Oct 3 Jacksonville vs South Florida | W, 2-1",
 "Final Oct 4 Jacksonville vs South Florida | W, 9-1",
 "Upcoming Oct 24 Jacksonville at Battle At The Beach | ",
 "Upcoming Nov 6 Jacksonville at Saint Leo | ",
 "Upcoming Nov 7 Jacksonville at Saint Leo | ",
 "Upcoming Nov 13 Jacksonville vs Florida State | ",
 "Upcoming Nov 14 Jacksonville vs Florida State | ",
 "Upcoming Jan 9 Jacksonville vs Florida Southern | ",
 "Upcoming Jan 15 Jacksonville vs Florida Tech | ",
 "Upcoming Jan 16 Jacksonville at Florida Tech | ",
 "Upcoming Jan 29 Jacksonville vs UCF | ",
 "Upcoming Jan 30 Jacksonville vs UCF | ",
 "Upcoming Feb 5 Jacksonville vs Rollins College | ",
 "Upcoming Feb 12 Jacksonville vs North Florida | ",
 "Upcoming Feb 13 Jacksonville at North Florida | ",
 "Upcoming Feb 27 Jacksonville at CHS Playoffs | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24, 11:00 AM Women's · Jacksonville vs Alumni Game | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Today Oct 23, 7:00 PM Men's · Jacksonville vs Alumni Game | ",
 "Upcoming Oct 31, 1:00 PM Men's · Jacksonville vs Florida Tech | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Nov 14 Men's · Jacksonville at Head of the Further South | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Jacksonville vs Miami (Fla.) | W, 2-0",
 "Final Aug 20 Women's · Jacksonville vs Georgia Southern | T, 0-0",
 "Final Aug 27 Women's · Jacksonville at Florida | L, 0-6",
 "Final Sep 3 Women's · Jacksonville at FAU | L, 0-3",
 "Final Sep 9 Women's · Jacksonville vs South Carolina State | T, 0-0",
 "Final Sep 13 Women's · Jacksonville at FIU | L, 0-1",
 "Final Sep 18 Women's · Jacksonville vs Warner (Fla.) | W, 6-0",
 "Final Sep 24 Women's · Jacksonville vs Lipscomb | T, 2-2",
 "Final Sep 27 Women's · Jacksonville vs Bellarmine | W, 2-1",
 "Final Oct 1 Women's · Jacksonville at Queens | T, 1-1",
 "Final Oct 8 Women's · Jacksonville at Stetson | W, 2-1",
 "Final Oct 11 Women's · Jacksonville at FGCU | L, 2-3",
 "Final Oct 15 Women's · Jacksonville at West Florida | L, 1-3",
 "Final Oct 18 Women's · Jacksonville at North Florida | W, 4-3",
 "Final Oct 22 Women's · Jacksonville vs FGCU | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Women's · Jacksonville vs Stetson | ",
 "Upcoming Oct 31, 4:00 PM Women's · Jacksonville vs North Florida | ",
 "Upcoming Nov 5 Women's · Jacksonville at Atlantic Sun Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Jacksonville at Houston Christian | W, 2-0",
 "Final Aug 23 Men's · Jacksonville at Incarnate Word | W, 5-1",
 "Final Aug 28 Men's · Jacksonville vs Georgia Southern | L, 0-2",
 "Final Sep 1 Men's · Jacksonville vs Trinity College of Jacksonville | W, 5-0",
 "Final Sep 5 Men's · Jacksonville vs North Florida | L, 1-2",
 "Final Sep 12 Men's · Jacksonville at Queens | T, 1-1",
 "Final Sep 19 Men's · Jacksonville vs Lipscomb | L, 0-1",
 "Final Sep 26 Men's · Jacksonville at Central Arkansas | T, 1-1",
 "Final Sep 29 Men's · Jacksonville at Memphis | W, 1-0",
 "Final Oct 6 Men's · Jacksonville at Georgia State | L, 0-1",
 "Final Oct 10 Men's · Jacksonville at Stetson | L, 2-3",
 "Final Oct 14 Men's · Jacksonville at South Florida | T, 2-2",
 "Final Oct 17 Men's · Jacksonville vs Bellarmine | W, 1-0",
 "Final Oct 20 Men's · Jacksonville vs Mercer | W, 3-2",
 "Upcoming Oct 24, 3:00 PM Men's · Jacksonville at West Florida | ",
 "Upcoming Oct 31, 7:00 PM Men's · Jacksonville vs FGCU | ",
 "Upcoming Nov 7 Men's · Jacksonville at Atlantic Sun Men's Soccer Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 30, 6:00 PM Jacksonville vs Florida State College at Jacksonville | ",
 "Upcoming Nov 6, 4:00 PM Jacksonville vs Flagler College (Game 1) | ",
 "Upcoming Nov 6, 6:30 PM Jacksonville vs Flagler College (Game 2) | ",
 "Upcoming Nov 7, 2:00 PM Jacksonville vs St. Johns River State College | ",
 "Upcoming Nov 20, 6:00 PM Jacksonville at Florida | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Jacksonville vs Southern | W, 3-0",
 "Final Aug 28 Jacksonville at Jax State | W, 3-0",
 "Final Aug 29 Jacksonville vs Southern Miss | L, 2-3",
 "Final Sep 4 Jacksonville vs Coastal Carolina | L, 1-3",
 "Final Sep 5 Jacksonville vs UConn | L, 0-3",
 "Final Sep 6 Jacksonville vs Florida A&M | W, 3-0",
 "Final Sep 11 Jacksonville at Pittsburgh | L, 0-3",
 "Final Sep 12 Jacksonville vs Wright State | W, 3-0",
 "Final Sep 13 Jacksonville vs High Point | L, 1-3",
 "Final Sep 18 Jacksonville vs Alabama A&M | W, 3-1",
 "Final Sep 18 Jacksonville vs Central Michigan | W, 3-1",
 "Final Sep 19 Jacksonville at FIU | L, 0-3",
 "Final Sep 23 Jacksonville at Florida | L, 0-3",
 "Final Sep 26 Jacksonville vs North Florida | L, 2-3",
 "Final Oct 2 Jacksonville at Bellarmine | W, 3-1",
 "Final Oct 3 Jacksonville at Lipscomb | L, 1-3",
 "Final Oct 7 Jacksonville at Florida State | L, 1-3",
 "Final Oct 11 Jacksonville at Queens | W, 3-2",
 "Final Oct 16 Jacksonville vs FGCU | L, 2-3",
 "Final Oct 17 Jacksonville vs Stetson | W, 3-2",
 "Today Oct 23, 6:00 PM Jacksonville vs Queens | ",
 "Upcoming Oct 24, 5:00 PM Jacksonville vs West Florida | ",
 "Upcoming Oct 30, 6:00 PM Jacksonville at Stetson | ",
 "Upcoming Nov 1, 1:00 PM Jacksonville at FGCU | ",
 "Upcoming Nov 6, 6:00 PM Jacksonville vs Lipscomb | ",
 "Upcoming Nov 7, 6:00 PM Jacksonville vs Bellarmine | ",
 "Upcoming Nov 11, 5:00 PM Jacksonville at West Florida | ",
 "Upcoming Nov 13, 6:00 PM Jacksonville at North Florida | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_hockey,"Hockey hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Jacksonville module checks passed");
