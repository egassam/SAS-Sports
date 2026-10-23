import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {charlestonSchool} from '../src/schools/charleston.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='charleston');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,charlestonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/charleston-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cofcsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['charleston'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',charlestonSchool.scheduleUrls],['roster',charlestonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('charleston|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cofcsports.com',`${key} must stay on cofcsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://cofcsports.com/sports/baseball/schedule"],"roster":["https://cofcsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://cofcsports.com/sports/mens-basketball/schedule","https://cofcsports.com/sports/womens-basketball/schedule"],"roster":["https://cofcsports.com/sports/mens-basketball/roster","https://cofcsports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://cofcsports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://cofcsports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://cofcsports.com/sports/womens-cross-country/schedule","https://cofcsports.com/sports/mens-cross-country/schedule"],"roster":["https://cofcsports.com/sports/womens-cross-country/roster","https://cofcsports.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://cofcsports.com/sports/equestrian/schedule"],"roster":["https://cofcsports.com/sports/equestrian/roster"],"combined":false},"Golf":{"schedule":["https://cofcsports.com/sports/womens-golf/schedule","https://cofcsports.com/sports/mens-golf/schedule"],"roster":["https://cofcsports.com/sports/womens-golf/roster","https://cofcsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://cofcsports.com/sports/womens-soccer/schedule","https://cofcsports.com/sports/mens-soccer/schedule"],"roster":["https://cofcsports.com/sports/womens-soccer/roster","https://cofcsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://cofcsports.com/sports/softball/schedule"],"roster":["https://cofcsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://cofcsports.com/sports/womens-tennis/schedule","https://cofcsports.com/sports/mens-tennis/schedule"],"roster":["https://cofcsports.com/sports/womens-tennis/roster","https://cofcsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://cofcsports.com/sports/womens-track-and-field/schedule"],"roster":["https://cofcsports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://cofcsports.com/sports/womens-volleyball/schedule"],"roster":["https://cofcsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'charleston|"+sport+"':"),`${sport} routes must live in the Charleston module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://cofcsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.charlestonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=charleston)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Sep 27 Men's · Charleston vs The Citadel (Exhibition) | W, 69-59",
 "Upcoming Oct 25, 4:00 PM Men's · Charleston vs Furman (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Charleston vs Southern Wesleyan | ",
 "Upcoming Nov 6, 7:00 PM Men's · Charleston vs Newberry | ",
 "Upcoming Nov 11 Men's · Charleston at Temple | ",
 "Upcoming Nov 15, 2:00 PM Men's · Charleston vs South Carolina State | ",
 "Upcoming Nov 19 Men's · Charleston at Drake | ",
 "Upcoming Nov 24, 8:30 PM Men's · Charleston vs UTEP | ",
 "Upcoming Nov 25 Men's · Charleston vs Eastern Michigan or Kennesaw State | ",
 "Upcoming Nov 29, 2:00 PM Men's · Charleston vs Howard | ",
 "Upcoming Dec 2 Men's · Charleston at Charlotte | ",
 "Upcoming Dec 6, 2:00 PM Men's · Charleston vs Davidson | ",
 "Upcoming Dec 9, 7:00 PM Men's · Charleston vs Voorhees | ",
 "Upcoming Dec 14, 7:30 PM Men's · Charleston at Belmont | ",
 "Upcoming Dec 18, 7:00 PM Men's · Charleston vs Northern Colorado | ",
 "Upcoming Dec 22, 7:00 PM Men's · Charleston vs South Florida | ",
 "Upcoming Dec 31, 4:00 PM Men's · Charleston vs Northeastern | ",
 "Upcoming Jan 2, 4:00 PM Men's · Charleston vs North Carolina A&T | ",
 "Upcoming Jan 7, 6:00 PM Men's · Charleston at Drexel | ",
 "Upcoming Jan 9 Men's · Charleston at Monmouth | ",
 "Upcoming Jan 14, 7:00 PM Men's · Charleston vs Campbell | ",
 "Upcoming Jan 16 Men's · Charleston at North Carolina A&T | ",
 "Upcoming Jan 18, 7:00 PM Men's · Charleston vs Towson | ",
 "Upcoming Jan 23, 4:00 PM Men's · Charleston vs Elon | ",
 "Upcoming Jan 28, 6:30 PM Men's · Charleston at UNCW | ",
 "Upcoming Jan 30, 2:00 PM Men's · Charleston vs Hofstra | ",
 "Upcoming Feb 4 Men's · Charleston at Hampton | ",
 "Upcoming Feb 6, 12:00 PM Men's · Charleston at William & Mary | ",
 "Upcoming Feb 11, 7:00 PM Men's · Charleston vs Stony Brook | ",
 "Upcoming Feb 18 Men's · Charleston at Hofstra | ",
 "Upcoming Feb 20, 1:00 PM Men's · Charleston at Northeastern | ",
 "Upcoming Feb 25, 7:00 PM Men's · Charleston vs Hampton | ",
 "Upcoming Feb 28, 4:00 PM Men's · Charleston vs UNCW | ",
 "Upcoming Mar 2 Men's · Charleston at Campbell | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Sep 27 Women's · Charleston vs South Carolina (Exhibition) | L, 60-91",
 "Upcoming Nov 2, 6:00 PM Women's · Charleston vs Berry College | ",
 "Upcoming Nov 7, 1:00 PM Women's · Charleston vs Charleston Southern | ",
 "Upcoming Nov 10 Women's · Charleston at USC | ",
 "Upcoming Nov 12 Women's · Charleston at Cal | ",
 "Upcoming Nov 18, 7:00 PM Women's · Charleston at Queens | ",
 "Upcoming Nov 26, 1:00 PM Women's · Charleston vs McNeese State | ",
 "Upcoming Nov 27, 12:00 PM Women's · Charleston vs Boston College | ",
 "Upcoming Dec 2, 11:00 AM Women's · Charleston vs LaGrange College | ",
 "Upcoming Dec 12, 2:00 PM Women's · Charleston vs Coastal Carolina | ",
 "Upcoming Dec 15, 6:00 PM Women's · Charleston at Georgia Southern | ",
 "Upcoming Dec 20, 12:00 PM Women's · Charleston vs Richmond | ",
 "Upcoming Dec 28, 2:00 PM Women's · Charleston at Virginia Tech | ",
 "Upcoming Jan 3, 1:00 PM Women's · Charleston vs Monmouth | ",
 "Upcoming Jan 8 Women's · Charleston at Hampton | ",
 "Upcoming Jan 10 Women's · Charleston at William & Mary | ",
 "Upcoming Jan 15, 6:00 PM Women's · Charleston vs North Carolina A&T | ",
 "Upcoming Jan 17, 1:00 PM Women's · Charleston vs Northeastern | ",
 "Upcoming Jan 22 Women's · Charleston at Drexel | ",
 "Upcoming Jan 24, 2:00 PM Women's · Charleston at Monmouth | ",
 "Upcoming Jan 29, 6:00 PM Women's · Charleston vs UNCW | ",
 "Upcoming Jan 31 Women's · Charleston at Elon | ",
 "Upcoming Feb 5, 6:00 PM Women's · Charleston vs Stony Brook | ",
 "Upcoming Feb 7, 1:00 PM Women's · Charleston vs Towson | ",
 "Upcoming Feb 12 Women's · Charleston at Campbell | ",
 "Upcoming Feb 19 Women's · Charleston at Stony Brook | ",
 "Upcoming Feb 21 Women's · Charleston at Hofstra | ",
 "Upcoming Feb 26, 6:00 PM Women's · Charleston vs Campbell | ",
 "Upcoming Feb 28 Women's · Charleston at UNCW | ",
 "Upcoming Mar 4, 6:00 PM Women's · Charleston vs Hampton | ",
 "Upcoming Mar 6, 1:00 PM Women's · Charleston vs Elon | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24 Charleston at Coastal Carolina | ",
 "Upcoming Oct 24 Charleston vs UNCW | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Charleston at CSU Buccaneer Open | 2nd of 4",
 "Final Sep 18 Women's · Charleston at Southern Showcase | 15th of 31",
 "Final Oct 2 Women's · Charleston at Fire Tower Project | 5th of 14",
 "Final Oct 17 Women's · Charleston at Upstate Invitational | 6th of 36",
 "Upcoming Oct 30 Women's · Charleston at CAA Championship | ",
 "Upcoming Nov 13 Women's · Charleston at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Charleston at CSU Buccaneer Open | 2nd of 4",
 "Final Sep 18 Men's · Charleston at Southern Showcase | 23rd of 29",
 "Final Oct 2 Men's · Charleston at Fire Tower Project | 6th of 12",
 "Final Oct 17 Men's · Charleston at Upstate Invitational | 10th of 37",
 "Upcoming Oct 30 Men's · Charleston at CAA Championship | ",
 "Upcoming Nov 13 Men's · Charleston at NCAA Southeast Regional | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 26 Charleston at Sacred Heart | L, 4-5",
 "Final Sep 27 Charleston at Dartmouth College | L, 4-5",
 "Final Oct 17 Charleston vs Sewanee | W, 6-4",
 "Final Oct 18 Charleston vs Berry | W, 7-3",
 "Upcoming Oct 30 Charleston at Centenary | ",
 "Upcoming Nov 14 Charleston at Georgia Southern | ",
 "Upcoming Jan 30 Charleston vs Centenary | ",
 "Upcoming Feb 6 Charleston at Georgia Southern | ",
 "Upcoming Feb 7 Charleston vs Sacred Heart | ",
 "Upcoming Feb 27 Charleston vs Dartmouth | ",
 "Upcoming Feb 28 Charleston vs Bridgewater | ",
 "Upcoming Mar 6 Charleston at IHSA Regionals | ",
 "Upcoming Mar 24 Charleston at ECAC SD Championship | ",
 "Upcoming Apr 3 Charleston at IHSA Zones | ",
 "Upcoming Apr 16 Charleston at NCEA National Championships | ",
 "Upcoming May 1 Charleston at IHSA Nationals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Charleston at AOD Summit at Quail Hollow | 1st of 5",
 "Final Sep 7 Women's · Charleston at Cougar Classic | 12th of 18",
 "Final Sep 18 Women's · Charleston at Mason Rudolph Invitational | T11th of 15",
 "Final Sep 28 Women's · Charleston at Tot Hill Farm Invitational | 2nd of 12",
 "Final Oct 12 Women's · Charleston at Illini Women's Invitational | 8th of 15",
 "Final Oct 19 Women's · Charleston at Edisto Island Invitational | T1st of 14",
 "Upcoming Feb 1 Women's · Charleston at UCF Challenge | ",
 "Upcoming Feb 15 Women's · Charleston at Spartan Sun Coast Invitational | ",
 "Upcoming Mar 1 Women's · Charleston at Daniel Island Invitational | ",
 "Upcoming Mar 15 Women's · Charleston at Briar's Creek Invitational | ",
 "Upcoming Apr 4 Women's · Charleston at Ironwood Invitational | ",
 "Upcoming Apr 16 Women's · Charleston at CAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Charleston at Highlands Invitational | T7th of 12",
 "Final Sep 28 Men's · Charleston at Bryan Bros Collegiate | 8th of 15",
 "Final Oct 12 Men's · Charleston at The Bryson | 1st of 12",
 "Upcoming Feb 7 Men's · Charleston at Dorado Beach Collegiate | ",
 "Upcoming Feb 15 Men's · Charleston at Battle at Briars Creek | ",
 "Upcoming Mar 7 Men's · Charleston at Colleton River Intercollegiate | ",
 "Upcoming Mar 14 Men's · Charleston at Michael A. Marino Classic | ",
 "Upcoming Mar 28 Men's · Charleston at Hootie Intercollegiate | ",
 "Upcoming Apr 3 Men's · Charleston at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 25 Men's · Charleston at CAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Charleston vs Southern Utah | W, 3-1",
 "Final Aug 16 Women's · Charleston vs USC Upstate | T, 1-1",
 "Final Aug 20 Women's · Charleston vs Ole Miss | L, 0-1",
 "Final Aug 23 Women's · Charleston at Davidson | L, 0-2",
 "Final Aug 27 Women's · Charleston at North Florida | T, 1-1",
 "Final Aug 30 Women's · Charleston vs UMass Lowell | W, 3-0",
 "Final Sep 3 Women's · Charleston vs South Carolina State | W, 4-0",
 "Final Sep 6 Women's · Charleston at South Carolina | L, 1-6",
 "Final Sep 10 Women's · Charleston at Coastal Carolina | L, 0-1",
 "Final Sep 19 Women's · Charleston vs William & Mary | T, 1-1",
 "Final Sep 24 Women's · Charleston vs Northeastern | L, 2-3",
 "Final Sep 27 Women's · Charleston vs Monmouth | L, 0-1",
 "Final Oct 4 Women's · Charleston at Hampton | W, 4-1",
 "Final Oct 8 Women's · Charleston at Drexel | W, 3-0",
 "Final Oct 11 Women's · Charleston at Towson | L, 0-2",
 "Final Oct 18 Women's · Charleston vs UNCW | L, 0-4",
 "Upcoming Oct 25, 1:00 PM Women's · Charleston at Campbell | ",
 "Upcoming Nov 1, 1:00 PM Women's · Charleston vs Elon | ",
 "Upcoming Nov 5 Women's · Charleston at CAA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Charleston vs Davidson | T, 1-1",
 "Final Aug 23 Men's · Charleston vs Florida Gulf Coast | W, 3-2",
 "Final Aug 28 Men's · Charleston vs Campbell | W, 2-1",
 "Final Sep 5 Men's · Charleston at William & Mary | L, 0-2",
 "Final Sep 8 Men's · Charleston vs Winthrop | W, 4-1",
 "Final Sep 12 Men's · Charleston at USC Upstate | W, 2-1",
 "Final Sep 19 Men's · Charleston at Elon | T, 1-1",
 "Final Sep 22 Men's · Charleston at South Carolina | W, 2-1",
 "Final Sep 27 Men's · Charleston vs UNCW | L, 1-2",
 "Final Oct 3 Men's · Charleston at Campbell | W, 2-1",
 "Final Oct 6 Men's · Charleston vs Furman | W, 2-1",
 "Final Oct 9 Men's · Charleston vs Elon | T, 1-1",
 "Final Oct 13 Men's · Charleston at North Florida | L, 0-1",
 "Final Oct 17 Men's · Charleston vs William & Mary | T, 1-1",
 "Upcoming Oct 24, 7:00 PM Men's · Charleston at UNCW | ",
 "Upcoming Oct 30, 5:00 PM Men's · Charleston at Mercer | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Charleston at CofC Invite | Completed",
 "Final Sep 19 Women's · Charleston at ITA All Americans | Completed",
 "Final Oct 1 Women's · Charleston at Coastal Carolina Invite | Completed",
 "Final Oct 15 Women's · Charleston at ITA Regionals | Completed",
 "Today Oct 23 Women's · Charleston at Georgia Southern Invite | ",
 "Upcoming Nov 5 Women's · Charleston at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Charleston at ITA Conference Masters | ",
 "Upcoming Nov 6 Women's · Charleston at UNF Invite | ",
 "Upcoming Nov 17 Women's · Charleston at Individual NCAA Tournament Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 17 Men's · Charleston at CTC I'on Club Open | Completed",
 "Final Oct 2 Men's · Charleston at River City Open | Completed",
 "Final Oct 8 Men's · Charleston at ITA Carolina Regionals | Completed",
 "Today Oct 23 Men's · Charleston at CCB Invite | ",
 "Upcoming Nov 6 Men's · Charleston at Charleston Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Charleston at Vanderbilt | L, 0-3",
 "Final Aug 29 Charleston at Lipscomb | L, 0-3",
 "Final Aug 30 Charleston vs Memphis | W, 3-2",
 "Final Sep 3 Charleston at The Citadel | W, 3-0",
 "Final Sep 4 Charleston vs Charleston Southern | W, 3-0",
 "Final Sep 5 Charleston vs South Carolina State | W, 3-1",
 "Final Sep 8 Charleston at Presbyterian | W, 3-0",
 "Final Sep 11 Charleston vs Duquesne | W, 3-0",
 "Final Sep 12 Charleston vs Northern Kentucky | W, 3-1",
 "Final Sep 13 Charleston vs Notre Dame | W, 3-0",
 "Final Sep 19 Charleston at Elon | W, 3-0",
 "Final Sep 20 Charleston at Elon | W, 3-0",
 "Final Sep 25 Charleston vs Towson | W, 3-0",
 "Final Sep 26 Charleston vs Towson | W, 3-2",
 "Final Oct 2 Charleston at North Carolina A&T | W, 3-2",
 "Final Oct 3 Charleston at North Carolina A&T | W, 3-1",
 "Final Oct 6 Charleston vs High Point | W, 3-2",
 "Final Oct 9 Charleston vs Hampton | W, 3-0",
 "Final Oct 10 Charleston vs Hampton | W, 3-0",
 "Final Oct 16 Charleston at Stony Brook | W, 3-1",
 "Final Oct 17 Charleston at Stony Brook | W, 3-0",
 "Upcoming Oct 30, 6:00 PM Charleston vs William & Mary | ",
 "Upcoming Oct 31, 2:00 PM Charleston vs William & Mary | ",
 "Upcoming Nov 6, 6:00 PM Charleston at UNCW | ",
 "Upcoming Nov 7, 2:00 PM Charleston at UNCW | ",
 "Upcoming Nov 13, 6:00 PM Charleston vs Campbell | ",
 "Upcoming Nov 14, 2:00 PM Charleston vs Campbell | ",
 "Upcoming Nov 19 Charleston at CAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Charleston module checks passed");
