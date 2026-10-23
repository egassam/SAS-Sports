import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {charlestonSouthernSchool} from '../src/schools/charleston-southern.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='charleston-southern');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,charlestonSouthernHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/charleston-southern-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit csusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['charleston-southern'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',charlestonSouthernSchool.scheduleUrls],['roster',charlestonSouthernSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('charleston-southern|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'csusports.com',`${key} must stay on csusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://csusports.com/sports/baseball/schedule"],"roster":["https://csusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://csusports.com/sports/mens-basketball/schedule","https://csusports.com/sports/womens-basketball/schedule"],"roster":["https://csusports.com/sports/mens-basketball/roster","https://csusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://csusports.com/sports/mens-cross-country/schedule","https://csusports.com/sports/womens-cross-country/schedule"],"roster":["https://csusports.com/sports/mens-cross-country/roster","https://csusports.com/sports/womens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://csusports.com/sports/football/schedule"],"roster":["https://csusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://csusports.com/sports/womens-golf/schedule","https://csusports.com/sports/mens-golf/schedule"],"roster":["https://csusports.com/sports/womens-golf/roster","https://csusports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://csusports.com/sports/womens-soccer/schedule"],"roster":["https://csusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://csusports.com/sports/softball/schedule"],"roster":["https://csusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://csusports.com/sports/womens-tennis/schedule"],"roster":["https://csusports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://csusports.com/sports/womens-track-and-field/schedule","https://csusports.com/sports/mens-track-and-field/schedule"],"roster":["https://csusports.com/sports/womens-track-and-field/roster","https://csusports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://csusports.com/sports/womens-volleyball/schedule"],"roster":["https://csusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'charleston-southern|"+sport+"':"),`${sport} routes must live in the Charleston Southern module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://csusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.charlestonSouthernHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=charleston-southern)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Charleston Southern at South Florida | ",
 "Upcoming Nov 5, 7:00 PM Men's · Charleston Southern vs Columbia International | ",
 "Upcoming Nov 10, 7:00 PM Men's · Charleston Southern at Wake Forest | ",
 "Upcoming Nov 14, 7:00 PM Men's · Charleston Southern vs West Georgia | ",
 "Upcoming Nov 18, 7:00 PM Men's · Charleston Southern vs Wofford | ",
 "Upcoming Nov 21, 7:00 PM Men's · Charleston Southern at Mercer | ",
 "Upcoming Nov 24, 7:00 PM Men's · Charleston Southern at James Madison | ",
 "Upcoming Nov 27, 7:00 PM Men's · Charleston Southern at East Tennessee State | ",
 "Upcoming Nov 28, 7:00 PM Men's · Charleston Southern vs Morehead State | ",
 "Upcoming Dec 1, 7:00 PM Men's · Charleston Southern vs The Citadel | ",
 "Upcoming Dec 5 Men's · Charleston Southern at South Carolina State | ",
 "Upcoming Dec 7, 7:00 PM Men's · Charleston Southern vs Warren Wilson | ",
 "Upcoming Dec 16, 7:00 PM Men's · Charleston Southern at North Florida | ",
 "Upcoming Dec 18, 2:00 PM Men's · Charleston Southern vs Piedmont | ",
 "Upcoming Dec 22, 12:00 PM Men's · Charleston Southern at IU Indy | ",
 "Upcoming Dec 28, 5:00 PM Men's · Charleston Southern at Old Dominion | ",
 "Upcoming Jan 1 Men's · Charleston Southern at Longwood | ",
 "Upcoming Jan 3 Men's · Charleston Southern at Radford | ",
 "Upcoming Jan 6, 11:00 AM Men's · Charleston Southern vs Gardner-Webb | ",
 "Upcoming Jan 9 Men's · Charleston Southern at UNC Asheville | ",
 "Upcoming Jan 13, 7:00 PM Men's · Charleston Southern vs USC Upstate | ",
 "Upcoming Jan 16, 2:00 PM Men's · Charleston Southern vs High Point | ",
 "Upcoming Jan 23 Men's · Charleston Southern at Winthrop | ",
 "Upcoming Jan 28, 7:00 PM Men's · Charleston Southern vs Presbyterian | ",
 "Upcoming Jan 30, 2:00 PM Men's · Charleston Southern vs Longwood | ",
 "Upcoming Feb 3 Men's · Charleston Southern at Gardner-Webb | ",
 "Upcoming Feb 6 Men's · Charleston Southern at High Point | ",
 "Upcoming Feb 11, 7:00 PM Men's · Charleston Southern vs Winthrop | ",
 "Upcoming Feb 13, 2:00 PM Men's · Charleston Southern vs Radford | ",
 "Upcoming Feb 18 Men's · Charleston Southern at USC Upstate | ",
 "Upcoming Feb 25, 7:00 PM Men's · Charleston Southern vs UNC Asheville | ",
 "Upcoming Feb 27 Men's · Charleston Southern at Presbyterian | ",
 "Upcoming Mar 3 Men's · Charleston Southern at 2027 Big South Men's Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Women's · Charleston Southern vs Anderson (Exhibition) | ",
 "Upcoming Nov 3, 11:00 AM Women's · Charleston Southern at East Carolina | ",
 "Upcoming Nov 7 Women's · Charleston Southern at College of Charleston | ",
 "Upcoming Nov 11, 7:00 PM Women's · Charleston Southern at Mercer | ",
 "Upcoming Nov 14, 12:00 PM Women's · Charleston Southern at Pitt | ",
 "Upcoming Nov 18 Women's · Charleston Southern at Davidson | ",
 "Upcoming Nov 20 Women's · Charleston Southern at Furman | ",
 "Upcoming Nov 22, 5:00 PM Women's · Charleston Southern at South Carolina State | ",
 "Upcoming Nov 28 Women's · Charleston Southern at South Alabama MTE | ",
 "Upcoming Dec 2, 6:00 PM Women's · Charleston Southern vs Wofford | ",
 "Upcoming Dec 5, 3:00 PM Women's · Charleston Southern vs UT Chattanooga | ",
 "Upcoming Dec 7, 11:00 AM Women's · Charleston Southern at Georgia Southern | ",
 "Upcoming Dec 16, 7:00 PM Women's · Charleston Southern at East Tennessee State | ",
 "Upcoming Dec 20 Women's · Charleston Southern at Florida | ",
 "Upcoming Jan 2, 2:00 PM Women's · Charleston Southern vs High Point | ",
 "Upcoming Jan 6 Women's · Charleston Southern at UNC Asheville | ",
 "Upcoming Jan 9, 2:00 PM Women's · Charleston Southern vs Longwood | ",
 "Upcoming Jan 13 Women's · Charleston Southern at USC Upstate | ",
 "Upcoming Jan 16 Women's · Charleston Southern at Radford | ",
 "Upcoming Jan 20, 6:00 PM Women's · Charleston Southern vs Presbyterian | ",
 "Upcoming Jan 23, 2:00 PM Women's · Charleston Southern vs Winthrop | ",
 "Upcoming Jan 27 Women's · Charleston Southern at Gardner-Webb | ",
 "Upcoming Jan 30 Women's · Charleston Southern at Longwood | ",
 "Upcoming Feb 3, 6:00 PM Women's · Charleston Southern vs UNC Asheville | ",
 "Upcoming Feb 10 Women's · Charleston Southern at Winthrop | ",
 "Upcoming Feb 13 Women's · Charleston Southern at High Point | ",
 "Upcoming Feb 17, 6:00 PM Women's · Charleston Southern vs Gardner-Webb | ",
 "Upcoming Feb 20, 2:00 PM Women's · Charleston Southern vs Radford | ",
 "Upcoming Feb 24 Women's · Charleston Southern at Presbyterian | ",
 "Upcoming Feb 27, 2:00 PM Women's · Charleston Southern vs USC Upstate | ",
 "Upcoming Mar 4 Women's · Charleston Southern at Big South Championships - Quarterfinals | ",
 "Upcoming Mar 6 Women's · Charleston Southern at Big South Championships - Semifinals | ",
 "Upcoming Mar 7 Women's · Charleston Southern at Big South Championships - Finals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Charleston Southern at CSU Buccaneer Open | 1st / 1 of 4",
 "Final Sep 12 Men's · Charleston Southern at Furman Invitational | 2nd / 2 of 7",
 "Final Sep 25 Men's · Charleston Southern at Winthrop/Adidas Invitational | 1st / 1 of 5",
 "Final Oct 2 Men's · Charleston Southern at Paul Short Invitational | 10th / 10 of 35",
 "Final Oct 17 Men's · Charleston Southern at Upstate Invitational | 1st / 1 of 37",
 "Upcoming Oct 30, 9:00 AM Men's · Charleston Southern at Big South Championships | ",
 "Upcoming Nov 13 Men's · Charleston Southern at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Men's · Charleston Southern at NCAA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Charleston Southern at CSU Buccaneer Open | 1st / 1 of 4",
 "Final Sep 12 Women's · Charleston Southern at Furman Invitational | 2nd / 2 of 7",
 "Final Sep 25 Women's · Charleston Southern at Winthrop/Adidas Invitational | 1st / 1 of 4",
 "Final Oct 2 Women's · Charleston Southern at Paul Short Invitational | 31st / 31 of 37",
 "Final Oct 17 Women's · Charleston Southern at Upstate Invitational | 5th / 5 of 36",
 "Upcoming Oct 30, 9:00 AM Women's · Charleston Southern at Big South Championships | ",
 "Upcoming Nov 13 Women's · Charleston Southern at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Women's · Charleston Southern at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Charleston Southern at Lindenwood | L, 17-20",
 "Final Sep 5 Charleston Southern at Georgia Southern | L, 0-31",
 "Final Sep 12 Charleston Southern at RV/RV The Citadel | W, 26-20",
 "Final Sep 19 Charleston Southern vs Point | W, 65-0",
 "Final Oct 3 Charleston Southern vs Gardner-Webb | L, 10-12",
 "Final Oct 10 Charleston Southern vs / #21 South Carolina State | W, 49-39",
 "Final Oct 17 Charleston Southern at Clemson | L, 0-37",
 "Upcoming Oct 24, 3:30 PM Charleston Southern at Tennessee State | ",
 "Upcoming Oct 31, 2:00 PM Charleston Southern vs Western Illinois | ",
 "Upcoming Nov 7, 2:00 PM Charleston Southern vs UT Martin | ",
 "Upcoming Nov 14, 2:00 PM Charleston Southern vs Southeast Missouri State | ",
 "Upcoming Nov 21, 1:00 PM Charleston Southern at Eastern Illinois | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Charleston Southern at Pirate Collegiate Classic | 11th of 13",
 "Final Oct 4 Women's · Charleston Southern at Mercedes-Benz Intercollegiate | 14th of 15",
 "Final Oct 19 Women's · Charleston Southern at Edisto Island Invitational | 4th of 14",
 "Today Oct 23 Women's · Charleston Southern at Fripp Island Intercollegiate | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 20 Men's · Charleston Southern at GMAC Invitational | 10th of 13",
 "Final Sep 28 Men's · Charleston Southern at Ironwood Collegiate Classic | 5th of 14",
 "Final Oct 12 Men's · Charleston Southern at Elon Phoenix Invitational | 10th of 17",
 "Today Oct 23 Men's · Charleston Southern at Fripp Island Intercollegiate | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Charleston Southern at Coastal Carolina | L, 0-3",
 "Final Aug 20 Charleston Southern vs Central Michigan | L, 2-3",
 "Final Aug 22 Charleston Southern vs Columbia College | W, 9-1",
 "Final Aug 27 Charleston Southern at Campbell | L, 0-5",
 "Final Sep 6 Charleston Southern vs Furman | L, 0-3",
 "Final Sep 10 Charleston Southern at The Citadel | L, 1-3",
 "Final Sep 13 Charleston Southern at Elon | L, 0-3",
 "Final Sep 19 Charleston Southern at Winthrop | W, 2-0",
 "Final Sep 23 Charleston Southern vs USC Upstate | L, 1-2",
 "Final Sep 26 Charleston Southern vs Gardner-Webb | L, 1-2",
 "Final Oct 3 Charleston Southern at Longwood | L, 0-1",
 "Final Oct 9 Charleston Southern at Presbyterian | W, 2-0",
 "Final Oct 13 Charleston Southern at South Carolina State | W, 3-0",
 "Final Oct 17 Charleston Southern vs Radford | L, 0-2",
 "Upcoming Oct 28, 7:00 PM Charleston Southern at High Point | ",
 "Upcoming Nov 1, 1:00 PM Charleston Southern vs UNC Asheville | ",
 "Upcoming Nov 5 Charleston Southern at Big South Championships - First Round | ",
 "Upcoming Nov 10 Charleston Southern at Big South Championships - Semifinals | ",
 "Upcoming Nov 15 Charleston Southern at Big South Championships - Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 15 Charleston Southern at ITA Carolina Regional Championship | Completed",
 "Today Oct 23 Charleston Southern at Big South Individual Championship Tournament | ",
 "Upcoming Oct 30 Charleston Southern at Buccaneer Invitational | ",
 "Upcoming Nov 5 Charleston Southern at Masters Conference Tournament | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Charleston Southern at Clemson | L, 1-3",
 "Final Aug 29 Charleston Southern vs Western Carolina | W, 3-2",
 "Final Aug 30 Charleston Southern vs Butler | W, 3-2",
 "Final Sep 3 Charleston Southern vs South Carolina State | W, 3-0",
 "Final Sep 4 Charleston Southern vs College of Charleston | L, 0-3",
 "Final Sep 5 Charleston Southern at The Citadel | W, 3-1",
 "Final Sep 8 Charleston Southern at Duke | L, 0-3",
 "Final Sep 10 Charleston Southern vs The Citadel | W, 3-0",
 "Final Sep 11 Charleston Southern vs Cal State Fullerton | L, 2-3",
 "Final Sep 12 Charleston Southern vs Bethune-Cookman | W, 3-0",
 "Final Sep 18 Charleston Southern vs Georgia State | L, 0-3",
 "Final Sep 18 Charleston Southern vs Montana State | W, 3-1",
 "Final Sep 19 Charleston Southern at Mercer | W, 3-1",
 "Final Sep 25 Charleston Southern at Presbyterian | L, 1-3",
 "Final Oct 2 Charleston Southern at Winthrop | L, 2-3",
 "Final Oct 3 Charleston Southern at Gardner-Webb | L, 2-3",
 "Final Oct 9 Charleston Southern at USC Upstate | L, 0-3",
 "Final Oct 10 Charleston Southern at UNC Asheville | W, 3-2",
 "Final Oct 16 Charleston Southern vs High Point | L, 0-3",
 "Final Oct 17 Charleston Southern vs Radford | W, 3-1",
 "Today Oct 23, 6:00 PM Charleston Southern vs Gardner-Webb | ",
 "Upcoming Oct 24, 4:00 PM Charleston Southern vs Winthrop | ",
 "Upcoming Oct 30, 6:00 PM Charleston Southern at Radford | ",
 "Upcoming Oct 31, 2:00 PM Charleston Southern at High Point | ",
 "Upcoming Nov 6, 6:00 PM Charleston Southern vs UNC Asheville | ",
 "Upcoming Nov 7, 6:00 PM Charleston Southern vs USC Upstate | ",
 "Upcoming Nov 13, 6:00 PM Charleston Southern vs Presbyterian | ",
 "Upcoming Nov 20 Charleston Southern at Big South Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Charleston Southern module checks passed");
