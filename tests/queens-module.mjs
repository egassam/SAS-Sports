import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {queensSchool} from '../src/schools/queens.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='queens');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,queensHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/queens-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit queensathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['queens'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',queensSchool.scheduleUrls],['roster',queensSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('queens|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'queensathletics.com',`${key} must stay on queensathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://queensathletics.com/sports/baseball/schedule"],"roster":["https://queensathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://queensathletics.com/sports/mens-basketball/schedule","https://queensathletics.com/sports/womens-basketball/schedule"],"roster":["https://queensathletics.com/sports/mens-basketball/roster","https://queensathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://queensathletics.com/sports/womens-cross-country/schedule","https://queensathletics.com/sports/mens-cross-country/schedule"],"roster":["https://queensathletics.com/sports/womens-cross-country/roster","https://queensathletics.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://queensathletics.com/sports/field-hockey/schedule"],"roster":["https://queensathletics.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://queensathletics.com/sports/womens-golf/schedule","https://queensathletics.com/sports/mens-golf/schedule"],"roster":["https://queensathletics.com/sports/womens-golf/roster","https://queensathletics.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://queensathletics.com/sports/womens-lacrosse/schedule","https://queensathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://queensathletics.com/sports/womens-lacrosse/roster","https://queensathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://queensathletics.com/sports/womens-soccer/schedule","https://queensathletics.com/sports/mens-soccer/schedule"],"roster":["https://queensathletics.com/sports/womens-soccer/roster","https://queensathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://queensathletics.com/sports/softball/schedule"],"roster":["https://queensathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://queensathletics.com/sports/womens-swimming-and-diving/schedule","https://queensathletics.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://queensathletics.com/sports/womens-swimming-and-diving/roster","https://queensathletics.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://queensathletics.com/sports/wten/schedule","https://queensathletics.com/sports/mten/schedule"],"roster":["https://queensathletics.com/sports/wten/roster","https://queensathletics.com/sports/mten/roster"],"combined":true},"Track & Field":{"schedule":["https://queensathletics.com/sports/womens-track-and-field/schedule","https://queensathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://queensathletics.com/sports/womens-track-and-field/roster","https://queensathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://queensathletics.com/sports/triathlon/schedule"],"roster":["https://queensathletics.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://queensathletics.com/sports/womens-volleyball/schedule"],"roster":["https://queensathletics.com/sports/womens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'queens|"+sport+"':"),`${sport} routes must live in the Queens module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://queensathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.queensHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=queens)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 22 Men's · Queens at Charleston Southern (Exhibition) | W, 110-94",
 "Upcoming Oct 26, 7:00 PM Men's · Queens vs Johnson C. Smith (Exhibition) | ",
 "Upcoming Nov 2, 9:00 AM Men's · Queens vs Winthrop | ",
 "Upcoming Nov 4, 10:00 PM Men's · Queens at LMU (Loyola Marymount) | ",
 "Upcoming Nov 6, 9:00 PM Men's · Queens at Oklahoma State | ",
 "Upcoming Nov 10, 9:00 PM Men's · Queens at BYU | ",
 "Upcoming Nov 14, 2:00 PM Men's · Queens vs Wofford | ",
 "Upcoming Nov 21 Men's · Queens at LSU | ",
 "Upcoming Nov 24, 6:00 PM Men's · Queens at Wofford | ",
 "Upcoming Nov 29, 4:00 PM Men's · Queens at Houston | ",
 "Upcoming Dec 2, 7:00 PM Men's · Queens vs Coastal Carolina | ",
 "Upcoming Dec 5 Men's · Queens at Gardner-Webb | ",
 "Upcoming Dec 8, 9:00 PM Men's · Queens at Colorado State | ",
 "Upcoming Dec 9, 8:00 PM Men's · Queens at Baylor | ",
 "Upcoming Dec 14, 11:00 AM Men's · Queens at Sacred Heart | ",
 "Upcoming Dec 16, 7:00 PM Men's · Queens vs UNC Asheville | ",
 "Upcoming Dec 19 Men's · Queens at North Alabama | ",
 "Upcoming Dec 21 Men's · Queens at West Georgia | ",
 "Upcoming Dec 31, 2:00 PM Men's · Queens vs Austin Peay | ",
 "Upcoming Jan 2, 2:00 PM Men's · Queens vs Eastern Kentucky | ",
 "Upcoming Jan 9 Men's · Queens at West Florida | ",
 "Upcoming Jan 14, 7:00 PM Men's · Queens vs Jacksonville | ",
 "Upcoming Jan 16, 3:00 PM Men's · Queens vs North Florida | ",
 "Upcoming Jan 21 Men's · Queens at Stetson | ",
 "Upcoming Jan 23 Men's · Queens at Florida Gulf Coast | ",
 "Upcoming Jan 28, 7:00 PM Men's · Queens vs Bellarmine | ",
 "Upcoming Jan 30, 3:00 PM Men's · Queens vs Lipscomb | ",
 "Upcoming Feb 6, 4:00 PM Men's · Queens vs West Florida | ",
 "Upcoming Feb 11 Men's · Queens at North Florida | ",
 "Upcoming Feb 13 Men's · Queens at Jacksonville | ",
 "Upcoming Feb 18, 7:00 PM Men's · Queens vs Florida Gulf Coast | ",
 "Upcoming Feb 20, 3:00 PM Men's · Queens vs Stetson | ",
 "Upcoming Feb 25 Men's · Queens at Lipscomb | ",
 "Upcoming Feb 27 Men's · Queens at Bellarmine | ",
 "Upcoming Mar 4 Men's · Queens at Atlantic Sun Conference | ",
 "Upcoming Mar 5 Men's · Queens at Atlantic Sun Conference | ",
 "Upcoming Mar 6 Men's · Queens at Atlantic Sun Conference | ",
 "Upcoming Mar 7 Men's · Queens at Atlantic Sun Conference | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Queens at Alabama | ",
 "Upcoming Nov 4, 6:30 PM Women's · Queens at Vanderbilt | ",
 "Upcoming Nov 9, 12:00 PM Women's · Queens vs Carolina | ",
 "Upcoming Nov 14, 2:00 PM Women's · Queens at Gardner-Webb | ",
 "Upcoming Nov 18, 7:00 PM Women's · Queens vs College of Charleston | ",
 "Upcoming Nov 21, 2:00 PM Women's · Queens vs Coker | ",
 "Upcoming Nov 27, 4:00 PM Women's · Queens at APP State Tournament | ",
 "Upcoming Nov 28, 2:00 PM Women's · Queens at APP State Tournament | ",
 "Upcoming Dec 2, 4:00 PM Women's · Queens at South Carolina - Upstate | ",
 "Upcoming Dec 6, 2:00 PM Women's · Queens vs West Georgia | ",
 "Upcoming Dec 13, 2:00 PM Women's · Queens vs North Carolina Wilmington | ",
 "Upcoming Dec 19, 2:00 PM Women's · Queens vs North Alabama | ",
 "Upcoming Dec 22, 6:00 PM Women's · Queens at North Carolina Central | ",
 "Upcoming Dec 31, 1:00 PM Women's · Queens at Austin Peay | ",
 "Upcoming Jan 2, 2:00 PM Women's · Queens at Eastern Kentucky | ",
 "Upcoming Jan 9, 12:00 PM Women's · Queens at West Florida | ",
 "Upcoming Jan 11, 6:00 PM Women's · Queens vs South Carolina State | ",
 "Upcoming Jan 14, 7:00 PM Women's · Queens at Florida Gulf Coast | ",
 "Upcoming Jan 16, 2:00 PM Women's · Queens at Stetson | ",
 "Upcoming Jan 21, 6:00 PM Women's · Queens vs Jacksonville | ",
 "Upcoming Jan 23, 2:00 PM Women's · Queens vs North Florida | ",
 "Upcoming Jan 28, 7:00 PM Women's · Queens at Bellarmine | ",
 "Upcoming Jan 30, 2:00 PM Women's · Queens at Lipscomb | ",
 "Upcoming Feb 6, 1:00 PM Women's · Queens vs West Florida | ",
 "Upcoming Feb 11, 7:00 PM Women's · Queens vs Stetson | ",
 "Upcoming Feb 13, 2:00 PM Women's · Queens vs Florida Gulf Coast | ",
 "Upcoming Feb 18, 7:00 PM Women's · Queens at North Florida | ",
 "Upcoming Feb 20, 2:00 PM Women's · Queens at Jacksonville | ",
 "Upcoming Feb 25, 7:00 PM Women's · Queens vs Lipscomb | ",
 "Upcoming Feb 27, 2:00 PM Women's · Queens vs Bellarmine | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Queens at Elon Opener | 10th of 16",
 "Final Sep 11 Women's · Queens at Queen City Invite | 5th of 26",
 "Final Oct 9 Women's · Queens at Royals Cross Country Challenge | 11th of 26",
 "Final Oct 17 Women's · Queens at South Carolina - Upstate | 18th of 36",
 "Upcoming Oct 30 Women's · Queens at Atlantic Sun Conference Championship | ",
 "Upcoming Nov 13 Women's · Queens at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Queens at Elon Opener | 8th of 14",
 "Final Sep 11 Men's · Queens at Queen City Invite | 7th of 25",
 "Final Oct 9 Men's · Queens at Royals Cross Country Challenge | 12th of 27",
 "Final Oct 17 Men's · Queens at South Carolina - Upstate | 16th of 37",
 "Upcoming Oct 30 Men's · Queens at Atlantic Sun Conference Championship | ",
 "Upcoming Nov 13 Men's · Queens at NCAA Southeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Queens at Richmond | L, 0-12",
 "Final Aug 30 Queens at Longwood | W, 3-1",
 "Final Sep 4 Queens vs Ohio | L, 2-3",
 "Final Sep 9 Queens at Appalachian State | L, 1-6",
 "Final Sep 11 Queens vs Villanova | L, 0-9",
 "Final Sep 13 Queens vs La Salle | L, 2-3",
 "Final Sep 20 Queens vs LIU | W, 7-1",
 "Final Sep 25 Queens vs Davidson College | L, 0-2",
 "Final Oct 3 Queens vs Stonehill College | W, 2-1",
 "Final Oct 4 Queens at Vermont | L, 0-8",
 "Final Oct 12 Queens at Old Dominion | L, 0-9",
 "Upcoming Oct 25, 12:00 PM Queens at Ball State | ",
 "Upcoming Nov 1, 12:00 PM Queens vs Lock Haven | ",
 "Upcoming Nov 6 Queens at MPSF Championship Semifinals | ",
 "Upcoming Nov 7 Queens at MPSF Championship Final | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Queens at Golfweek Fall Challenge | 23rd of 23",
 "Final Sep 14 Women's · Queens at Elon Women's Invitational | T11th of 15",
 "Final Oct 19 Women's · Queens at UNCG Collegiate | 8th of 8",
 "Today Oct 23 Women's · Queens at Fripp Island Intercollegiate | ",
 "Upcoming Feb 14 Women's · Queens at Battle at the Beach | ",
 "Upcoming Mar 8 Women's · Queens at Lady Bison Spring Invitational | ",
 "Upcoming Mar 22 Women's · Queens at Georgia State Invitational | ",
 "Upcoming Apr 5 Women's · Queens at The Brickyard Collegiate | ",
 "Upcoming Apr 11 Women's · Queens at ASUN Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Queens at Bryan National Collegiate | 13th of 13",
 "Final Sep 21 Men's · Queens at River Run Collegiate | 11th of 13",
 "Final Sep 28 Men's · Queens at Ironwood Collegiate Classic | 11th of 14",
 "Final Oct 12 Men's · Queens at Elon Phoenix Invitational | 16th of 17",
 "Upcoming Oct 25 Men's · Queens at ODU/OBX Intercollegiate | ",
 "Upcoming Feb 20 Men's · Queens at The Savannah Intercollegiate | ",
 "Upcoming Mar 8 Men's · Queens at Surf Club Invitational | ",
 "Upcoming Mar 14 Men's · Queens at Cutter Creek Intercollegiate | ",
 "Upcoming Mar 29 Men's · Queens at Golfweek Spring Challenge | ",
 "Upcoming Apr 12 Men's · Queens at The Indian Ridge Shootout | ",
 "Upcoming Apr 20 Men's · Queens at ASUN Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Queens vs The Citadel | T, 2-2",
 "Final Aug 16 Women's · Queens at Gardner-Webb | L, 0-2",
 "Final Aug 23 Women's · Queens at Richmond | L, 0-3",
 "Final Aug 27 Women's · Queens vs Winthrop | L, 0-4",
 "Final Sep 3 Women's · Queens at Campbell | L, 0-3",
 "Final Sep 6 Women's · Queens vs South Carolina State | W, 3-1",
 "Final Sep 13 Women's · Queens vs South Carolina - Upstate | L, 1-3",
 "Final Sep 17 Women's · Queens at Coastal Carolina | L, 0-2",
 "Final Sep 24 Women's · Queens at Florida Gulf Coast | L, 0-3",
 "Final Sep 27 Women's · Queens at Stetson | W, 1-0",
 "Final Oct 1 Women's · Queens vs Jacksonville | T, 1-1",
 "Final Oct 4 Women's · Queens vs North Florida | L, 0-1",
 "Final Oct 8 Women's · Queens vs Bellarmine | L, 0-4",
 "Final Oct 11 Women's · Queens vs Lipscomb | L, 0-1",
 "Final Oct 18 Women's · Queens at West Florida | L, 0-1",
 "Final Oct 22 Women's · Queens at Lipscomb | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Women's · Queens at Bellarmine | ",
 "Upcoming Oct 31, 4:00 PM Women's · Queens vs West Florida | ",
 "Upcoming Nov 5 Women's · Queens at Atlantic Sun Conference | ",
 "Upcoming Nov 8 Women's · Queens at Atlantic Sun Conference | ",
 "Upcoming Nov 11 Women's · Queens at Atlantic Sun Conference | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Queens vs East Tennessee State | L, 0-1",
 "Final Aug 23 Men's · Queens at NC State | L, 1-2",
 "Final Aug 29 Men's · Queens vs Wofford College | L, 2-3",
 "Final Sep 5 Men's · Queens at Lipscomb | L, 1-3",
 "Final Sep 8 Men's · Queens vs William Peace | W, 10-2",
 "Final Sep 12 Men's · Queens vs Jacksonville | T, 1-1",
 "Final Sep 15 Men's · Queens at Duke | L, 0-2",
 "Final Sep 19 Men's · Queens at Stetson | W, 1-0",
 "Final Sep 22 Men's · Queens at Virginia Tech | L, 0-3",
 "Final Sep 26 Men's · Queens vs Florida Gulf Coast | T, 2-2",
 "Final Oct 3 Men's · Queens vs West Florida | W, 1-0",
 "Final Oct 6 Men's · Queens at Virginia | L, 3-4",
 "Final Oct 13 Men's · Queens vs Presbyterian College | W, 2-1",
 "Final Oct 17 Men's · Queens at North Florida | L, 0-2",
 "Final Oct 20 Men's · Queens at Wake Forest | L, 0-5",
 "Upcoming Oct 25, 7:00 PM Men's · Queens at Central Arkansas | ",
 "Upcoming Oct 31, 1:00 PM Men's · Queens vs Bellarmine | ",
 "Upcoming Nov 7 Men's · Queens at Atlantic Sun Conference | ",
 "Upcoming Nov 9 Men's · Queens at Atlantic Sun Conference | ",
 "Upcoming Nov 14 Men's · Queens at Atlantic Sun Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · Queens vs North Carolina | L, 101-156",
 "Final Sep 26 Women's · Queens vs Davidson College | Completed",
 "Final Oct 9 Women's · Queens vs Catawba College | W, 167-93",
 "Final Oct 10 Women's · Queens vs Emory | Completed",
 "Today Oct 23, 2:00 PM Women's · Queens vs Virginia Tech | ",
 "Today Oct 23, 2:00 PM Women's · Queens vs Tennessee | ",
 "Upcoming Oct 24, 11:00 AM Women's · Queens vs Florida Gulf Coast | ",
 "Upcoming Oct 24, 11:00 AM Women's · Queens vs Wingate | ",
 "Upcoming Nov 6, 4:00 PM Women's · Queens vs Rutgers | ",
 "Upcoming Nov 6, 4:00 PM Women's · Queens vs Vanderbilt | ",
 "Upcoming Nov 19 Women's · Queens at Fall Frenzy | ",
 "Upcoming Jan 2, 11:00 AM Women's · Queens at South Carolina | ",
 "Upcoming Jan 22, 5:00 PM Women's · Queens at Gardner-Webb | ",
 "Upcoming Jan 29, 4:00 PM Women's · Queens vs North Carolina Wilmington | ",
 "Upcoming Feb 17 Women's · Queens at ASUN Championship | ",
 "Upcoming Mar 8 Women's · Queens at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 11 Women's · Queens at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Queens at Women's NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 25 Men's · Queens vs North Carolina | L, 108-149",
 "Final Sep 26 Men's · Queens vs Davidson College | W, 139-66",
 "Final Oct 9 Men's · Queens vs Catawba College | W, 188-74",
 "Final Oct 10 Men's · Queens vs Emory | Completed",
 "Today Oct 23, 2:00 PM Men's · Queens vs Virginia Tech | ",
 "Today Oct 23, 2:00 PM Men's · Queens vs Tennessee | ",
 "Upcoming Oct 24, 11:00 AM Men's · Queens vs Wingate | ",
 "Upcoming Nov 19 Men's · Queens at Fall Frenzy | ",
 "Upcoming Jan 2, 11:00 AM Men's · Queens at South Carolina | ",
 "Upcoming Jan 22, 5:00 PM Men's · Queens at Gardner-Webb | ",
 "Upcoming Jan 29, 4:00 PM Men's · Queens vs North Carolina Wilmington | ",
 "Upcoming Feb 17 Men's · Queens at ASUN Championship | ",
 "Upcoming Mar 8 Men's · Queens at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 11 Men's · Queens at National Invitational Championship | ",
 "Upcoming Mar 24 Men's · Queens at Men's NCAA Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Oct 2 Queens at Appalachian State Fall Invite | Completed",
 "Final Oct 8 Queens at Belmont Abbey Fall Invite | Completed",
 "Final Oct 15 Queens at ITA Regionals | Completed",
 "Upcoming Jan 11, 2:00 PM Queens at Elon | ",
 "Upcoming Jan 24, 12:00 PM Queens vs Appalachian State | ",
 "Upcoming Jan 30 Queens at Charlotte | ",
 "Upcoming Feb 5, 1:00 PM Queens vs King (Tenn.) | ",
 "Upcoming Feb 13 Queens vs Eastern Kentucky | ",
 "Upcoming Feb 14 Queens vs Wofford College | ",
 "Upcoming Feb 19 Queens at UNC Greensboro | ",
 "Upcoming Feb 24 Queens at Western Carolina | ",
 "Upcoming Feb 25 Queens vs Florida Gulf Coast | ",
 "Upcoming Mar 1 Queens vs Fairfield | ",
 "Upcoming Mar 5, 4:00 PM Queens vs Lipscomb | ",
 "Upcoming Mar 7, 1:30 PM Queens at Stetson | ",
 "Upcoming Mar 10, 1:00 PM Queens vs UNC Asheville | ",
 "Upcoming Mar 20 Queens vs West Florida | ",
 "Upcoming Mar 21 Queens vs Clemson | ",
 "Upcoming Mar 24 Queens vs Fordham | ",
 "Upcoming Mar 27 Queens at Coastal Carolina | ",
 "Upcoming Mar 30, 2:00 PM Queens vs North Carolina A&T State | ",
 "Upcoming Apr 3 Queens at North Florida | ",
 "Upcoming Apr 9 Queens vs Bellarmine | ",
 "Upcoming Apr 10, 11:00 AM Queens vs Georgia Gwinnett College | ",
 "Upcoming Apr 17 Queens at Davidson College | "
]);
  const v_mten=parse("Tennis","mten");
  assert.deepEqual(v_mten.map(line),[
 "Final Sep 11 Queens at Spartan Fall Invitational | Completed",
 "Final Sep 17 Queens at UNCW Fall Invite | Completed",
 "Final Sep 25 Queens at Davidson Invite | Completed",
 "Final Oct 8 Queens at ITA Regionals | Completed",
 "Today Oct 22 Queens at ASUN Fall Conference Tournament | ",
 "Upcoming Nov 6 Queens at Navy Invite | ",
 "Upcoming Jan 14, 4:00 PM Queens at Clemson | ",
 "Upcoming Jan 17 Queens at Charlotte | ",
 "Upcoming Jan 22 Queens vs UC San Diego | ",
 "Upcoming Jan 23 Queens at Air Force | ",
 "Upcoming Feb 6 Queens at UNC Asheville | ",
 "Upcoming Feb 12, 1:00 PM Queens vs College of Charleston | ",
 "Upcoming Feb 13 Queens vs Eastern Kentucky | ",
 "Upcoming Feb 20 Queens vs Davidson College | ",
 "Upcoming Feb 21 Queens vs Presbyterian College | ",
 "Upcoming Feb 26, 3:00 PM Queens at Furman | ",
 "Upcoming Mar 1 Queens vs Fairfield | ",
 "Upcoming Mar 7, 1:30 PM Queens at Stetson | ",
 "Upcoming Mar 12 Queens at Elon | ",
 "Upcoming Mar 14, 11:00 AM Queens vs Florida Gulf Coast | ",
 "Upcoming Mar 20 Queens vs West Florida | ",
 "Upcoming Mar 25 Queens vs Lipscomb | ",
 "Upcoming Mar 27 Queens at Coastal Carolina | ",
 "Upcoming Mar 31, 2:00 PM Queens vs North Carolina A&T State | ",
 "Upcoming Apr 4 Queens at North Florida | ",
 "Upcoming Apr 10 Queens vs Bellarmine | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 13 Queens at Lake Davidson Sprint Triathlon | Completed",
 "Final Sep 26 Queens at Battle at Buckhorn Sprint | Completed",
 "Final Oct 10 Queens at MACTC Olympic Distance Championship | Completed",
 "Final Oct 17 Queens at MACTC Sprint Draft Legal Championship | Completed"
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Women's · Queens vs Duke | L, 0-3",
 "Final Aug 30 Women's · Queens at Coastal Carolina | L, 2-3",
 "Final Sep 3 Women's · Queens vs North Carolina A&T | L, 0-3",
 "Final Sep 4 Women's · Queens at Furman | L, 1-3",
 "Final Sep 5 Women's · Queens vs Presbyterian | L, 1-3",
 "Final Sep 9 Women's · Queens vs USC Upstate | L, 2-3",
 "Final Sep 11 Women's · Queens vs Chattanooga | W, 3-1",
 "Final Sep 11 Women's · Queens vs Buffalo | W, 3-0",
 "Final Sep 12 Women's · Queens vs Presbyterian | W, 3-0",
 "Final Sep 15 Women's · Queens vs Tennessee | L, 0-3",
 "Final Sep 17 Women's · Queens vs Charlotte | L, 1-3",
 "Final Sep 18 Women's · Queens vs Davidson | L, 2-3",
 "Final Sep 22 Women's · Queens at UNC Asheville | W, 3-1",
 "Final Sep 26 Women's · Queens vs West Florida | L, 0-3",
 "Final Oct 2 Women's · Queens at FGCU | L, 0-3",
 "Final Oct 4 Women's · Queens at Stetson | W, 3-0",
 "Final Oct 9 Women's · Queens vs North Florida | L, 1-3",
 "Final Oct 11 Women's · Queens vs Jacksonville | L, 2-3",
 "Final Oct 16 Women's · Queens vs Lipscomb | L, 0-3",
 "Final Oct 18 Women's · Queens vs Bellarmine | W, 3-1",
 "Today Oct 23, 6:00 PM Women's · Queens at Jacksonville | ",
 "Upcoming Oct 24, 6:00 PM Women's · Queens at North Florida | ",
 "Upcoming Oct 30, 6:00 PM Women's · Queens at Bellarmine | ",
 "Upcoming Oct 31, 3:00 PM Women's · Queens at Lipscomb | ",
 "Upcoming Nov 6, 7:00 PM Women's · Queens vs Stetson | ",
 "Upcoming Nov 8, 12:00 PM Women's · Queens vs FGCU | ",
 "Upcoming Nov 13, 1:00 PM Women's · Queens at West Florida | ",
 "Upcoming Nov 19 Women's · Queens at Atlantic Sun Conference Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_mten,"Tennis mten");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Queens module checks passed");
