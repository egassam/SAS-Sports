import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {citadelSchool} from '../src/schools/citadel.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='citadel');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,citadelHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/citadel-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit citadelsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['citadel'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',citadelSchool.scheduleUrls],['roster',citadelSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('citadel|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'citadelsports.com',`${key} must stay on citadelsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://citadelsports.com/sports/baseball/schedule"],"roster":["https://citadelsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://citadelsports.com/sports/mens-basketball/schedule"],"roster":["https://citadelsports.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://citadelsports.com/sports/cross-country/schedule"],"roster":["https://citadelsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://citadelsports.com/sports/football/schedule"],"roster":["https://citadelsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://citadelsports.com/sports/womens-golf/schedule"],"roster":["https://citadelsports.com/sports/womens-golf/roster"],"combined":false},"Rifle":{"schedule":["https://citadelsports.com/sports/rifle/schedule"],"roster":["https://citadelsports.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://citadelsports.com/sports/womens-soccer/schedule"],"roster":["https://citadelsports.com/sports/womens-soccer/roster"],"combined":false},"Tennis":{"schedule":["https://citadelsports.com/sports/mens-tennis/schedule"],"roster":["https://citadelsports.com/sports/mens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://citadelsports.com/sports/track-and-field/schedule"],"roster":["https://citadelsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://citadelsports.com/sports/womens-volleyball/schedule"],"roster":["https://citadelsports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://citadelsports.com/sports/wrestling/schedule"],"roster":["https://citadelsports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'citadel|"+sport+"':"),`${sport} routes must live in the The Citadel module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://citadelsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.citadelHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=citadel)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 31 The Citadel at Winthrop (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · The Citadel at Loyola Chicago | ",
 "Upcoming Nov 6, 7:00 PM Men's · The Citadel vs Erskine | ",
 "Upcoming Nov 10, 7:00 PM Men's · The Citadel vs Virginia Lynchburg | ",
 "Upcoming Nov 14, 2:00 PM Men's · The Citadel at North Florida | ",
 "Upcoming Nov 16, 7:00 PM Men's · The Citadel at Clemson | ",
 "Upcoming Nov 20, 7:00 PM Men's · The Citadel vs South Carolina State | ",
 "Upcoming Nov 25, 7:00 PM Men's · The Citadel vs USC Upstate | ",
 "Upcoming Nov 28, 2:00 PM Men's · The Citadel at High Point | ",
 "Upcoming Dec 1, 7:00 PM Men's · The Citadel at Charleston Southern | ",
 "Upcoming Dec 5, 1:00 PM Men's · The Citadel at Western Carolina | ",
 "Upcoming Dec 9, 7:00 PM Men's · The Citadel at Georgia Tech | ",
 "Upcoming Dec 16, 7:00 PM Men's · The Citadel vs Toccoa Falls | ",
 "Upcoming Dec 19, 1:00 PM Men's · The Citadel vs Tennessee Tech | ",
 "Upcoming Dec 21, 8:00 PM Men's · The Citadel at North Carolina | ",
 "Upcoming Dec 30, 7:00 PM Men's · The Citadel at UNCG | ",
 "Upcoming Jan 2, 1:00 PM Men's · The Citadel vs Chattanooga | ",
 "Upcoming Jan 6, 7:00 PM Men's · The Citadel vs Wofford | ",
 "Upcoming Jan 9, 5:00 PM Men's · The Citadel at Samford | ",
 "Upcoming Jan 13, 7:00 PM Men's · The Citadel vs Furman | ",
 "Upcoming Jan 16, 10:00 AM Men's · The Citadel at VMI | ",
 "Upcoming Jan 18, 7:00 PM Men's · The Citadel vs ETSU | ",
 "Upcoming Jan 21, 6:00 PM Men's · The Citadel at Wofford | ",
 "Upcoming Jan 23, 1:00 PM Men's · The Citadel vs Samford | ",
 "Upcoming Jan 27, 6:30 PM Men's · The Citadel at Furman | ",
 "Upcoming Jan 30, 2:00 PM Men's · The Citadel at Mercer | ",
 "Upcoming Feb 3, 7:00 PM Men's · The Citadel vs UNCG | ",
 "Upcoming Feb 6, 5:00 PM Men's · The Citadel at Tennessee Tech | ",
 "Upcoming Feb 10, 7:00 PM Men's · The Citadel vs Western Carolina | ",
 "Upcoming Feb 13, 2:00 PM Men's · The Citadel at Chattanooga | ",
 "Upcoming Feb 20, 1:00 PM Men's · The Citadel vs VMI | ",
 "Upcoming Feb 24, 7:00 PM Men's · The Citadel at ETSU | ",
 "Upcoming Feb 27, 1:00 PM Men's · The Citadel vs Mercer | ",
 "Upcoming Mar 3 Men's · The Citadel at Southern Conference Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 The Citadel at Buccaneer Open | Women's team: 3rd / Men's team: 3rd",
 "Final Sep 11 The Citadel at Queen City Invitational | Women's team: 14th / Men's team: 10th",
 "Final Oct 2 The Citadel at Georgia Tech Invitational | Women's team: 13th / Men's team: 10th",
 "Final Oct 17 The Citadel at Upstate Invitational | Women's team: 27th / Men's team: 18th",
 "Upcoming Oct 31 The Citadel at Southern Conference Championships | ",
 "Upcoming Nov 13 The Citadel at NCAA Southeast Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 The Citadel at Wofford | L, 14-42",
 "Final Sep 5 The Citadel at Charlotte | W, 43-41",
 "Final Sep 12 The Citadel vs Charleston Southern | L, 20-26",
 "Final Sep 26 The Citadel vs Chattanooga | L, 8-27",
 "Final Oct 3 The Citadel at South Carolina State | W, 34-31",
 "Final Oct 10 The Citadel vs ETSU | L, 16-34",
 "Final Oct 17 The Citadel at Texas A&M | L, 0-41",
 "Today Oct 24, 2:00 PM The Citadel vs Tennessee Tech | ",
 "Upcoming Oct 31, 3:00 PM The Citadel at Mercer | ",
 "Upcoming Nov 7, 2:00 PM The Citadel vs Furman | ",
 "Upcoming Nov 14, 12:30 PM The Citadel at VMI | ",
 "Upcoming Nov 21, 1:00 PM The Citadel at Western Carolina | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 The Citadel at Coastal Georgia Fall Invitational | Completed",
 "Final Sep 14 The Citadel at Elon Invitational | Completed",
 "Final Oct 19 The Citadel at Edisto Island Invitational | 14th",
 "Upcoming Oct 26 The Citadel at Pat Bradley Invitational | ",
 "Upcoming Feb 8 The Citadel at Oyster Shuck Match Play | ",
 "Upcoming Feb 16 The Citadel at RiverTowne Invitational | ",
 "Upcoming Mar 8 The Citadel at Lady Bison Spring Invitational | ",
 "Upcoming Mar 15 The Citadel at Lowcountry Intercollegiate | ",
 "Upcoming Apr 19 The Citadel at Southern Conference Championship | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 10 The Citadel at Georgia Southern | Mixed team: 3rd / Women's team: 4th",
 "Today Oct 24 The Citadel at VMI | ",
 "Upcoming Oct 31 The Citadel at TCU | ",
 "Upcoming Nov 7 The Citadel at Wofford | ",
 "Upcoming Nov 14 The Citadel at Jacksonville State | ",
 "Upcoming Nov 15 The Citadel at Jacksonville State | ",
 "Upcoming Jan 23 The Citadel at Georgia Southern | ",
 "Upcoming Jan 30 The Citadel at VMI | ",
 "Upcoming Jan 31 The Citadel at UAB | ",
 "Upcoming Feb 6 The Citadel at Jacksonville State | ",
 "Upcoming Feb 12 The Citadel at Georgia Southern | ",
 "Upcoming Feb 14 The Citadel at Navy | ",
 "Upcoming Feb 15 The Citadel at Navy | ",
 "Upcoming Feb 20 The Citadel at Wofford | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 The Citadel at Queens | T, 2-2",
 "Final Aug 17 The Citadel vs Southern Utah | L, 0-1",
 "Final Aug 21 The Citadel at Kennesaw State | W, 1-0",
 "Final Aug 27 The Citadel vs South Carolina State | W, 8-0",
 "Final Aug 30 The Citadel vs Winthrop | W, 1-0",
 "Final Sep 3 The Citadel at UNC Asheville | T, 1-1",
 "Final Sep 10 The Citadel vs Charleston Southern | W, 3-1",
 "Final Sep 12 The Citadel vs Bob Jones | W, 7-0",
 "Final Sep 17 The Citadel vs VMI | W, 5-3",
 "Final Sep 20 The Citadel at Chattanooga | L, 0-3",
 "Final Sep 24 The Citadel vs UNCG | T, 1-1",
 "Final Oct 1 The Citadel at Mercer | T, 0-0",
 "Final Oct 4 The Citadel vs Furman | L, 0-5",
 "Final Oct 11 The Citadel at Western Carolina | W, 4-1",
 "Final Oct 15 The Citadel at Tennessee Tech | L, 0-1",
 "Final Oct 18 The Citadel vs Wofford | W, 3-2",
 "Final Oct 23 The Citadel vs Samford | L, 0-1",
 "Upcoming Nov 1, 1:00 PM The Citadel at ETSU | ",
 "Upcoming Nov 6 The Citadel at Southern Conference Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 The Citadel vs Kennesaw State | L, 0-3",
 "Final Aug 28 The Citadel vs Le Moyne | W, 3-0",
 "Final Aug 29 The Citadel at UNCW | L, 2-3",
 "Final Sep 3 The Citadel vs College of Charleston | L, 0-3",
 "Final Sep 4 The Citadel vs South Carolina State | W, 3-0",
 "Final Sep 5 The Citadel vs Charleston Southern | L, 1-3",
 "Final Sep 10 The Citadel at Charleston Southern | L, 0-3",
 "Final Sep 11 The Citadel vs Bethune-Cookman | L, 1-3",
 "Final Sep 12 The Citadel vs Cal State Fullerton | W, 3-1",
 "Final Sep 18 The Citadel vs Murray State | L, 1-3",
 "Final Sep 18 The Citadel at Troy | L, 0-3",
 "Final Sep 19 The Citadel vs Northwestern State | L, 1-3",
 "Final Sep 25 The Citadel at Mercer | L, 0-3",
 "Final Sep 26 The Citadel at Mercer | L, 0-3",
 "Final Oct 2 The Citadel vs Tennessee Tech | L, 0-3",
 "Final Oct 3 The Citadel vs Tennessee Tech | L, 1-3",
 "Final Oct 6 The Citadel vs Furman | W, 3-1",
 "Final Oct 9 The Citadel at UNCG | L, 0-3",
 "Final Oct 10 The Citadel at UNCG | L, 1-3",
 "Final Oct 16 The Citadel vs Samford | L, 0-3",
 "Final Oct 17 The Citadel vs Samford | L, 0-3",
 "Final Oct 22 The Citadel at Wofford | L, 0-3",
 "Final Oct 23 The Citadel at Wofford | L, 0-3",
 "Upcoming Oct 27, 6:00 PM The Citadel at Furman | ",
 "Upcoming Oct 30, 6:00 PM The Citadel vs Western Carolina | ",
 "Upcoming Oct 31, 2:00 PM The Citadel vs Western Carolina | ",
 "Upcoming Nov 5, 6:00 PM The Citadel at ETSU | ",
 "Upcoming Nov 6, 11:00 AM The Citadel at ETSU | ",
 "Upcoming Nov 13, 6:00 PM The Citadel vs Chattanooga | ",
 "Upcoming Nov 14, 2:00 PM The Citadel vs Chattanooga | ",
 "Upcoming Nov 19 The Citadel at Southern Conference Volleyball Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7, 12:30 PM The Citadel at Air Force | ",
 "Upcoming Nov 7, 5:00 PM The Citadel at Purdue | ",
 "Upcoming Nov 14, 7:00 PM The Citadel vs Illinois | ",
 "Upcoming Nov 19, 7:00 PM The Citadel at Virginia Tech | ",
 "Upcoming Dec 12 The Citadel at Rider | ",
 "Upcoming Dec 12 The Citadel at Michigan State | ",
 "Upcoming Jan 2 The Citadel at Southern Scuffle | ",
 "Upcoming Jan 8, 7:00 PM The Citadel vs Gardner-Webb | ",
 "Upcoming Jan 10, 2:00 PM The Citadel vs Appalachian State | ",
 "Upcoming Jan 16 The Citadel at Utah Valley | ",
 "Upcoming Jan 16 The Citadel at North Dakota State | ",
 "Upcoming Jan 22, 7:00 PM The Citadel vs Chattanooga | ",
 "Upcoming Jan 29 The Citadel at Presbyterian | ",
 "Upcoming Jan 31, 3:00 PM The Citadel vs Campbell | ",
 "Upcoming Feb 7 The Citadel at Army | ",
 "Upcoming Feb 12 The Citadel at Davidson | ",
 "Upcoming Feb 14 The Citadel at Bellarmine | ",
 "Upcoming Feb 19, 7:00 PM The Citadel at VMI | ",
 "Upcoming Mar 5 The Citadel at Southern Conference Championship | ",
 "Upcoming Mar 18 The Citadel at NCAA DI Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("The Citadel module checks passed");
