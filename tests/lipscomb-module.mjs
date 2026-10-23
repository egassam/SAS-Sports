import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lipscombSchool} from '../src/schools/lipscomb.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lipscomb');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lipscombHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lipscomb-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lipscombsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lipscomb'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',lipscombSchool.scheduleUrls],['roster',lipscombSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lipscomb|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lipscombsports.com',`${key} must stay on lipscombsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lipscombsports.com/sports/baseball/schedule"],"roster":["https://lipscombsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lipscombsports.com/sports/mens-basketball/schedule","https://lipscombsports.com/sports/womens-basketball/schedule"],"roster":["https://lipscombsports.com/sports/mens-basketball/roster","https://lipscombsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://lipscombsports.com/sports/womens-cross-country/schedule","https://lipscombsports.com/sports/mens-cross-country/schedule"],"roster":["https://lipscombsports.com/sports/womens-cross-country/roster","https://lipscombsports.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://lipscombsports.com/sports/womens-golf/schedule","https://lipscombsports.com/sports/mens-golf/schedule"],"roster":["https://lipscombsports.com/sports/womens-golf/roster","https://lipscombsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://lipscombsports.com/sports/womens-soccer/schedule","https://lipscombsports.com/sports/mens-soccer/schedule"],"roster":["https://lipscombsports.com/sports/womens-soccer/roster","https://lipscombsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://lipscombsports.com/sports/softball/schedule"],"roster":["https://lipscombsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://lipscombsports.com/sports/womens-tennis/schedule","https://lipscombsports.com/sports/mens-tennis/schedule"],"roster":["https://lipscombsports.com/sports/womens-tennis/roster","https://lipscombsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://lipscombsports.com/sports/womens-track-and-field/schedule","https://lipscombsports.com/sports/mens-track-and-field/schedule"],"roster":["https://lipscombsports.com/sports/womens-track-and-field/roster","https://lipscombsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://lipscombsports.com/sports/womens-volleyball/schedule"],"roster":["https://lipscombsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lipscomb|"+sport+"':"),`${sport} routes must live in the Lipscomb module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://lipscombsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lipscombHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lipscomb)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 22, 5:00 PM Lipscomb vs Trevecca Nazarene | ",
 "Upcoming Oct 24, 12:00 PM Lipscomb vs Cumberland | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · Lipscomb vs Bryan College (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Lipscomb at Southeast Missouri State | ",
 "Upcoming Nov 3, 7:00 PM Men's · Lipscomb at Iowa | ",
 "Upcoming Nov 7, 4:00 PM Men's · Lipscomb vs SIU Edwardsville | ",
 "Upcoming Nov 10, 7:00 PM Men's · Lipscomb vs Belmont | ",
 "Upcoming Nov 14, 6:00 PM Men's · Lipscomb at Western Carolina | ",
 "Upcoming Nov 17, 5:30 PM Men's · Lipscomb at Purdue | ",
 "Upcoming Nov 20, 7:00 PM Men's · Lipscomb at Alabama A&M | ",
 "Upcoming Nov 22, 4:00 PM Men's · Lipscomb vs Milligan | ",
 "Upcoming Nov 24, 7:00 PM Men's · Lipscomb at Auburn | ",
 "Upcoming Nov 29, 4:30 PM Men's · Lipscomb at Ohio State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Lipscomb vs UNC Asheville | ",
 "Upcoming Dec 5, 4:00 PM Men's · Lipscomb vs Rhodes | ",
 "Upcoming Dec 13, 3:00 PM Men's · Lipscomb at Eastern Kentucky | ",
 "Upcoming Dec 16, 6:30 PM Men's · Lipscomb at Western Kentucky | ",
 "Upcoming Dec 19, 4:00 PM Men's · Lipscomb vs Southeast Missouri State | ",
 "Upcoming Dec 21, 7:00 PM Men's · Lipscomb at Austin Peay | ",
 "Upcoming Dec 31, 2:00 PM Men's · Lipscomb vs West Georgia | ",
 "Upcoming Jan 2, 4:00 PM Men's · Lipscomb vs North Alabama | ",
 "Upcoming Jan 7, 6:00 PM Men's · Lipscomb at Jacksonville | ",
 "Upcoming Jan 9, 1:00 PM Men's · Lipscomb at North Florida | ",
 "Upcoming Jan 14, 7:00 PM Men's · Lipscomb vs Stetson | ",
 "Upcoming Jan 16, 4:00 PM Men's · Lipscomb vs FGCU | ",
 "Upcoming Jan 23, 4:00 PM Men's · Lipscomb vs Bellarmine | ",
 "Upcoming Jan 28, 5:00 PM Men's · Lipscomb at West Florida | ",
 "Upcoming Jan 30, 2:00 PM Men's · Lipscomb at Queens | ",
 "Upcoming Feb 4, 7:00 PM Men's · Lipscomb vs North Florida | ",
 "Upcoming Feb 6, 4:00 PM Men's · Lipscomb vs Jacksonville | ",
 "Upcoming Feb 11, 6:00 PM Men's · Lipscomb at FGCU | ",
 "Upcoming Feb 13, 1:00 PM Men's · Lipscomb at Stetson | ",
 "Upcoming Feb 19, 6:00 PM Men's · Lipscomb at Bellarmine | ",
 "Upcoming Feb 25, 7:00 PM Men's · Lipscomb vs Queens | ",
 "Upcoming Feb 27, 4:00 PM Men's · Lipscomb vs West Florida | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Lipscomb at Vanderbilt | ",
 "Upcoming Nov 5, 5:30 PM Women's · Lipscomb at Butler | ",
 "Upcoming Nov 7, 1:30 PM Women's · Lipscomb vs Carolina | ",
 "Upcoming Nov 12, 6:00 PM Women's · Lipscomb vs Mississippi Valley State | ",
 "Upcoming Nov 15, 1:00 PM Women's · Lipscomb at Chattanooga | ",
 "Upcoming Nov 23, 6:00 PM Women's · Lipscomb vs Tennessee Tech | ",
 "Upcoming Nov 30, 6:30 PM Women's · Lipscomb at Middle Tennessee State | ",
 "Upcoming Dec 3, 11:00 AM Women's · Lipscomb vs Belmont | ",
 "Upcoming Dec 6, 1:00 PM Women's · Lipscomb at Georgia Tech | ",
 "Upcoming Dec 14, 6:00 PM Women's · Lipscomb vs Samford | ",
 "Upcoming Dec 16, 6:00 PM Women's · Lipscomb vs Austin Peay | ",
 "Upcoming Dec 19, 1:30 PM Women's · Lipscomb vs Eastern Kentucky | ",
 "Upcoming Dec 31, 1:00 PM Women's · Lipscomb at West Georgia | ",
 "Upcoming Jan 2, 2:00 PM Women's · Lipscomb at North Alabama | ",
 "Upcoming Jan 9, 1:00 PM Women's · Lipscomb at Bellarmine | ",
 "Upcoming Jan 14, 5:30 PM Women's · Lipscomb at Jacksonville | ",
 "Upcoming Jan 16, 1:00 PM Women's · Lipscomb at North Florida | ",
 "Upcoming Jan 21, 6:00 PM Women's · Lipscomb vs Stetson | ",
 "Upcoming Jan 23, 1:00 PM Women's · Lipscomb vs Florida Gulf Coast | ",
 "Upcoming Jan 28, 6:00 PM Women's · Lipscomb vs West Florida | ",
 "Upcoming Jan 30, 2:00 PM Women's · Lipscomb vs Queens | ",
 "Upcoming Feb 4, 6:00 PM Women's · Lipscomb at Florida Gulf Coast | ",
 "Upcoming Feb 6, 1:00 PM Women's · Lipscomb at Stetson | ",
 "Upcoming Feb 11, 6:00 PM Women's · Lipscomb vs North Florida | ",
 "Upcoming Feb 13, 1:00 PM Women's · Lipscomb vs Jacksonville | ",
 "Upcoming Feb 20, 2:00 PM Women's · Lipscomb vs Bellarmine | ",
 "Upcoming Feb 25, 6:00 PM Women's · Lipscomb at Queens | ",
 "Upcoming Feb 27, 1:00 PM Women's · Lipscomb at West Florida | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · Lipscomb at Belmont/Vandy Opener | 3rd of 4",
 "Final Sep 19 Women's · Lipscomb at John McNichols Invitational | 24th of 28",
 "Final Sep 25 Women's · Lipscomb at Loyola Lakefront Invitational | 10th of 17",
 "Final Sep 26 Women's · Lipscomb at Michael Pretorius Invitational | 1st of 4",
 "Final Oct 16 Women's · Lipscomb at Pre-National Invitational | 22nd of 43",
 "Upcoming Oct 30 Women's · Lipscomb at ASUN Championships | ",
 "Upcoming Nov 13 Women's · Lipscomb at NCAA South Regional | ",
 "Upcoming Nov 21 Women's · Lipscomb at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · Lipscomb at Belmont/Vandy Opener | 1st of 5",
 "Final Sep 19 Men's · Lipscomb at John McNichols Invitational | 27th of 34",
 "Final Sep 25 Men's · Lipscomb at Loyola Lakefront Invitational | 9th of 17",
 "Final Sep 26 Men's · Lipscomb at Michael Pretorius Invitational | 1st of 5",
 "Final Oct 9 Men's · Lipscomb at Nuttycombe Invitational | 34th of 35",
 "Final Oct 16 Men's · Lipscomb at Pre-National Invitational | 2nd of 16",
 "Upcoming Oct 30 Men's · Lipscomb at ASUN Championships | ",
 "Upcoming Nov 13 Men's · Lipscomb at NCAA South Regional | ",
 "Upcoming Nov 21 Men's · Lipscomb at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Lipscomb at GolfWeek Fall Invitational | 12th of 23",
 "Final Sep 21 Women's · Lipscomb at Betty Lou Evans Invitational | 5th of 13",
 "Final Oct 5 Women's · Lipscomb at The Ally Invitational | 15th of 17",
 "Final Oct 12 Women's · Lipscomb at The Robbie | 1st of 7",
 "Upcoming Feb 7 Women's · Lipscomb at Treasure Coast Invitational | ",
 "Upcoming Feb 20 Women's · Lipscomb at Space Coast Classic | ",
 "Upcoming Mar 8 Women's · Lipscomb at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 22 Women's · Lipscomb at The Nashville Invitational | ",
 "Upcoming Mar 30 Women's · Lipscomb at NCAA Regional Preview | ",
 "Upcoming Apr 11 Women's · Lipscomb at ASUN Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Lipscomb at Myrtle Beach Golf Trips Intercollegiate | 3rd of 16",
 "Final Sep 13 Men's · Lipscomb at The JT Poston Invitational | 5th of 17",
 "Final Sep 21 Men's · Lipscomb at The Bears Club Invitational | 4th of 11",
 "Final Oct 5 Men's · Lipscomb at West Bay Collegiate | 2nd of 15",
 "Final Oct 18 Men's · Lipscomb at The Furman Invitational | 2nd of 15",
 "Upcoming Jan 15 Men's · Lipscomb at TBA | ",
 "Upcoming Feb 1 Men's · Lipscomb at Sea Best Invitational | ",
 "Upcoming Feb 13 Men's · Lipscomb at The Prestige | ",
 "Upcoming Mar 12 Men's · Lipscomb at The Seminole Invitational | ",
 "Upcoming Apr 4 Men's · Lipscomb at Memphis Invitational | ",
 "Upcoming Apr 12 Men's · Lipscomb at Mossy Oak Invitational | ",
 "Upcoming Apr 20 Men's · Lipscomb at ASUN Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Lipscomb vs Arkansas State | W, 1-0",
 "Final Aug 16 Women's · Lipscomb vs Oregon State | W, 2-0",
 "Final Aug 23 Women's · Lipscomb vs Miami | L, 0-1",
 "Final Aug 27 Women's · Lipscomb vs Tennessee at Chattanooga | T, 2-2",
 "Final Aug 30 Women's · Lipscomb at Middle Tennessee | T, 0-0",
 "Final Sep 6 Women's · Lipscomb vs Tennessee Tech | W, 1-0",
 "Final Sep 13 Women's · Lipscomb vs Western Kentucky | T, 1-1",
 "Final Sep 24 Women's · Lipscomb at Jacksonville | T, 2-2",
 "Final Sep 27 Women's · Lipscomb at North Florida | L, 0-1",
 "Final Oct 1 Women's · Lipscomb vs Florida Gulf Coast | T, 2-2",
 "Final Oct 4 Women's · Lipscomb vs Stetson | W, 1-0",
 "Final Oct 8 Women's · Lipscomb at West Florida | L, 0-3",
 "Final Oct 11 Women's · Lipscomb at Queens University of Charlotte | W, 1-0",
 "Final Oct 18 Women's · Lipscomb vs Bellarmine | L, 2-3",
 "Final Oct 22 Women's · Lipscomb vs Queens University of Charlotte | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Women's · Lipscomb vs West Florida | ",
 "Upcoming Oct 31, 3:00 PM Women's · Lipscomb at Bellarmine | ",
 "Upcoming Nov 5 Women's · Lipscomb at Atlantic Sun Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Lipscomb at UAB | T, 1-1",
 "Final Aug 27 Men's · Lipscomb at Louisville | L, 1-3",
 "Final Sep 2 Men's · Lipscomb vs Georgia State | L, 2-4",
 "Final Sep 5 Men's · Lipscomb vs Queens | W, 3-1",
 "Final Sep 8 Men's · Lipscomb at Belmont | L, 0-2",
 "Final Sep 11 Men's · Lipscomb at Central Arkansas | L, 0-1",
 "Final Sep 19 Men's · Lipscomb at Jacksonville | W, 1-0",
 "Final Sep 22 Men's · Lipscomb vs Kentucky | W, 2-1",
 "Final Sep 26 Men's · Lipscomb at North Carolina | L, 1-3",
 "Final Oct 3 Men's · Lipscomb vs Stetson | L, 1-4",
 "Final Oct 6 Men's · Lipscomb at Memphis | L, 3-4",
 "Final Oct 10 Men's · Lipscomb at Florida Gulf Coast | L, 0-3",
 "Final Oct 17 Men's · Lipscomb vs West Florida | L, 0-1",
 "Upcoming Oct 24, 6:00 PM Men's · Lipscomb at Bellarmine | ",
 "Upcoming Oct 27, 6:00 PM Men's · Lipscomb at Evansville | ",
 "Upcoming Oct 31, 7:00 PM Men's · Lipscomb vs North Florida | ",
 "Upcoming Nov 7 Men's · Lipscomb at ASUN Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Lipscomb at Milwaukee Tennis Classic | Completed",
 "Final Sep 25 Women's · Lipscomb at Lipscomb/Belmont Hidden Duals | Completed",
 "Final Oct 8 Women's · Lipscomb at ITA Ohio Valley Regional Championships | Completed",
 "Final Oct 16 Women's · Lipscomb at Lipscomb Hidden Dual | Completed",
 "Today Oct 23 Women's · Lipscomb at MTSU Fall Invitational | ",
 "Upcoming Nov 5 Women's · Lipscomb at ITA Division I South Sectional Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Lipscomb at Samford Invitational | Completed",
 "Final Oct 8 Men's · Lipscomb at ITA Ohio Valley Regional Championships | Completed",
 "Today Oct 22 Men's · Lipscomb at ASUN Men's Tennis Individual Tournament | ",
 "Upcoming Oct 29 Men's · Lipscomb at UTR NCAA Division I Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Lipscomb vs Memphis | W, 3-1",
 "Final Aug 29 Lipscomb vs College of Charleston | W, 3-0",
 "Final Sep 3 Lipscomb vs Kansas | L, 1-3",
 "Final Sep 5 Lipscomb vs Florida State | W, 3-1",
 "Final Sep 6 Lipscomb vs South Alabama | W, 3-0",
 "Final Sep 10 Lipscomb at Washington | L, 0-3",
 "Final Sep 11 Lipscomb vs Washington State | W, 3-2",
 "Final Sep 18 Lipscomb at Vanderbilt | L, 0-3",
 "Final Sep 19 Lipscomb at Belmont | W, 3-1",
 "Final Sep 22 Lipscomb vs Tennessee Tech | W, 3-1",
 "Final Sep 26 Lipscomb at Bellarmine | L, 0-3",
 "Final Oct 2 Lipscomb vs North Florida | W, 3-2",
 "Final Oct 3 Lipscomb vs Jacksonville | W, 3-1",
 "Final Oct 9 Lipscomb at Stetson | W, 3-0",
 "Final Oct 11 Lipscomb at Florida Gulf Coast | W, 3-2",
 "Final Oct 16 Lipscomb at Queens | W, 3-0",
 "Final Oct 18 Lipscomb at West Florida | L, 0-3",
 "Today Oct 23, 6:00 PM Lipscomb vs Florida Gulf Coast | ",
 "Upcoming Oct 24, 1:30 PM Lipscomb vs Stetson | ",
 "Upcoming Oct 30, 6:00 PM Lipscomb vs West Florida | ",
 "Upcoming Oct 31, 2:00 PM Lipscomb vs Queens | ",
 "Upcoming Nov 6, 5:00 PM Lipscomb at Jacksonville | ",
 "Upcoming Nov 7, 5:00 PM Lipscomb at North Florida | ",
 "Upcoming Nov 14, 4:00 PM Lipscomb vs Bellarmine | ",
 "Upcoming Nov 19 Lipscomb at ASUN CHAMPIONSHIP | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Lipscomb module checks passed");
