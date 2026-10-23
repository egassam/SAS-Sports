import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {belmontSchool} from '../src/schools/belmont.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='belmont');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,belmontHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/belmont-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit belmontbruins.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['belmont'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',belmontSchool.scheduleUrls],['roster',belmontSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('belmont|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'belmontbruins.com',`${key} must stay on belmontbruins.com`);
  }
}
const parity={"Baseball":{"schedule":["https://belmontbruins.com/sports/baseball/schedule"],"roster":["https://belmontbruins.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://belmontbruins.com/sports/mens-basketball/schedule","https://belmontbruins.com/sports/womens-basketball/schedule"],"roster":["https://belmontbruins.com/sports/mens-basketball/roster","https://belmontbruins.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://belmontbruins.com/sports/mens-cross-country/schedule","https://belmontbruins.com/sports/womens-cross-country/schedule"],"roster":["https://belmontbruins.com/sports/mens-cross-country/roster","https://belmontbruins.com/sports/womens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://belmontbruins.com/sports/womens-golf/schedule","https://belmontbruins.com/sports/mens-golf/schedule"],"roster":["https://belmontbruins.com/sports/womens-golf/roster","https://belmontbruins.com/sports/mens-golf/roster"],"combined":true},"STUNT":{"schedule":["https://belmontbruins.com/sports/stunt/schedule"],"roster":["https://belmontbruins.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://belmontbruins.com/sports/womens-soccer/schedule","https://belmontbruins.com/sports/mens-soccer/schedule"],"roster":["https://belmontbruins.com/sports/womens-soccer/roster","https://belmontbruins.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://belmontbruins.com/sports/softball/schedule"],"roster":["https://belmontbruins.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://belmontbruins.com/sports/womens-tennis/schedule","https://belmontbruins.com/sports/mens-tennis/schedule"],"roster":["https://belmontbruins.com/sports/womens-tennis/roster","https://belmontbruins.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://belmontbruins.com/sports/mens-track-and-field/schedule","https://belmontbruins.com/sports/womens-track-and-field/schedule"],"roster":["https://belmontbruins.com/sports/mens-track-and-field/roster","https://belmontbruins.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://belmontbruins.com/sports/womens-volleyball/schedule"],"roster":["https://belmontbruins.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'belmont|"+sport+"':"),`${sport} routes must live in the Belmont module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://belmontbruins.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.belmontHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=belmont)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 8 Men's · Belmont at Duke (Exhibition) | L, 62-102",
 "Upcoming Nov 2, 6:30 PM Men's · Belmont vs Southern Indiana | ",
 "Upcoming Nov 5, 6:30 PM Men's · Belmont vs Centre | ",
 "Upcoming Nov 10, 7:00 PM Men's · Belmont at Lipscomb | ",
 "Upcoming Nov 14, 7:30 PM Men's · Belmont vs Furman | ",
 "Upcoming Nov 18, 6:30 PM Men's · Belmont vs Union Commonwealth | ",
 "Upcoming Nov 23, 3:00 PM Men's · Belmont vs Yale | ",
 "Upcoming Nov 24, 11:30 AM Men's · Belmont vs Akron | ",
 "Upcoming Nov 25, 9:00 AM Men's · Belmont vs St. Bonaventure | ",
 "Upcoming Dec 1, 6:30 PM Men's · Belmont at WKU | ",
 "Upcoming Dec 5, 7:00 PM Men's · Belmont vs Middle Tennessee | ",
 "Upcoming Dec 8 Men's · Belmont at UAB | ",
 "Upcoming Dec 14, 6:30 PM Men's · Belmont vs College of Charleston | ",
 "Upcoming Dec 18, 7:00 PM Men's · Belmont at Bradley | ",
 "Upcoming Dec 21, 8:00 PM Men's · Belmont at Illinois State | ",
 "Upcoming Dec 29, 6:00 PM Men's · Belmont vs Northern Iowa | ",
 "Upcoming Jan 1, 4:00 PM Men's · Belmont vs UIC | ",
 "Upcoming Jan 5, 6:30 PM Men's · Belmont at Drake | ",
 "Upcoming Jan 8, 7:00 PM Men's · Belmont vs Illinois State | ",
 "Upcoming Jan 12 Men's · Belmont at Evansville | ",
 "Upcoming Jan 16, 4:00 PM Men's · Belmont vs Southern Illinois | ",
 "Upcoming Jan 18, 6:30 PM Men's · Belmont vs Indiana State | ",
 "Upcoming Jan 21 Men's · Belmont at Valparaiso | ",
 "Upcoming Jan 24 Men's · Belmont at UIC | ",
 "Upcoming Jan 27, 6:30 PM Men's · Belmont vs Drake | ",
 "Upcoming Jan 30 Men's · Belmont at Southern Illinois | ",
 "Upcoming Feb 6 Men's · Belmont at Murray State | ",
 "Upcoming Feb 9, 6:30 PM Men's · Belmont vs Bradley | ",
 "Upcoming Feb 12, 7:00 PM Men's · Belmont vs Evansville | ",
 "Upcoming Feb 15 Men's · Belmont at Indiana State | ",
 "Upcoming Feb 20, 5:00 PM Men's · Belmont vs Murray State | ",
 "Upcoming Feb 24, 6:00 PM Men's · Belmont vs Valparaiso | ",
 "Upcoming Feb 28 Men's · Belmont at Northern Iowa | ",
 "Upcoming Mar 4 Men's · Belmont at MVC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Belmont at -/rv Princeton | ",
 "Upcoming Nov 6, 7:30 PM Women's · Belmont vs South Florida | ",
 "Upcoming Nov 8, 2:30 PM Women's · Belmont vs Columbia | ",
 "Upcoming Nov 13, 11:00 AM Women's · Belmont vs Troy | ",
 "Upcoming Nov 17, 6:30 PM Women's · Belmont vs Tennessee | ",
 "Upcoming Nov 20, 6:30 PM Women's · Belmont vs Dayton | ",
 "Upcoming Nov 23, 7:00 PM Women's · Belmont at LSU | ",
 "Upcoming Nov 27, 3:00 PM Women's · Belmont vs Iowa State | ",
 "Upcoming Nov 29, 3:00 PM Women's · Belmont vs Marquette | ",
 "Upcoming Dec 3, 11:00 AM Women's · Belmont at Lipscomb | ",
 "Upcoming Dec 13, 2:00 PM Women's · Belmont vs Middle Tennessee | ",
 "Upcoming Dec 18, 7:30 PM Women's · Belmont vs Vanderbilt | ",
 "Upcoming Dec 22, 1:00 PM Women's · Belmont vs Bradley | ",
 "Upcoming Dec 29, 6:30 PM Women's · Belmont at Illinois State | ",
 "Upcoming Jan 1, 1:00 PM Women's · Belmont vs UIC | ",
 "Upcoming Jan 3, 2:00 PM Women's · Belmont at Evansville | ",
 "Upcoming Jan 7, 6:30 PM Women's · Belmont vs Southern Illinois | ",
 "Upcoming Jan 9, 4:00 PM Women's · Belmont vs Indiana State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Belmont at Northern Iowa | ",
 "Upcoming Jan 16, 2:00 PM Women's · Belmont at Drake | ",
 "Upcoming Jan 21, 6:30 PM Women's · Belmont vs Evansville | ",
 "Upcoming Jan 23, 2:00 PM Women's · Belmont at Southern Illinois | ",
 "Upcoming Jan 28, 6:30 PM Women's · Belmont vs Valparaiso | ",
 "Upcoming Jan 30 Women's · Belmont at Murray State | ",
 "Upcoming Feb 4, 6:00 PM Women's · Belmont at Indiana State | ",
 "Upcoming Feb 7, 2:00 PM Women's · Belmont at Bradley | ",
 "Upcoming Feb 11, 6:30 PM Women's · Belmont vs Drake | ",
 "Upcoming Feb 13, 4:00 PM Women's · Belmont vs Northern Iowa | ",
 "Upcoming Feb 18, 6:30 PM Women's · Belmont vs Illinois State | ",
 "Upcoming Feb 21, 2:00 PM Women's · Belmont vs Murray State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Belmont at Valparaiso | ",
 "Upcoming Feb 27, 2:00 PM Women's · Belmont at UIC | ",
 "Upcoming Mar 3 Women's · Belmont at MVC Tournament | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · Belmont at Vanderbilt Opener | Completed",
 "Final Sep 18 Men's · Belmont at Southern Showcase | 9th of 29",
 "Final Oct 2 Men's · Belmont at Joe Piane Invite | 11th of 18",
 "Final Oct 16 Men's · Belmont at Crimson Classic | 5th of 14",
 "Upcoming Oct 30 Men's · Belmont at MVC Championship | ",
 "Upcoming Nov 13 Men's · Belmont at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Men's · Belmont at NCAA Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · Belmont at Vanderbilt Opener | Completed",
 "Final Sep 18 Women's · Belmont at Southern Showcase | 11th of 31",
 "Final Oct 2 Women's · Belmont at Joe Piane Invite | 17th of 20",
 "Final Oct 16 Women's · Belmont at Crimson Classic | 9th of 19",
 "Upcoming Oct 30 Women's · Belmont at MVC Championship | ",
 "Upcoming Nov 13 Women's · Belmont at NCAA South Regional Championship | ",
 "Upcoming Nov 21 Women's · Belmont at NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Belmont at The Velvet | 6th of 14",
 "Final Sep 21 Women's · Belmont at Bettie Lou Evans Invitational | 13th of 13",
 "Final Oct 9 Women's · Belmont at Evie Odom Invitational | T13th of 13",
 "Upcoming Oct 26 Women's · Belmont at The Judson | ",
 "Upcoming Mar 7 Women's · Belmont at Chris Bannister Classic | ",
 "Upcoming Mar 13 Women's · Belmont at Valspar Invitational | ",
 "Upcoming Mar 22 Women's · Belmont at Nashville Invitational | ",
 "Upcoming Mar 30 Women's · Belmont at The Mini Mason | ",
 "Upcoming Apr 5 Women's · Belmont at Brickyard Collegiate | ",
 "Upcoming Apr 18 Women's · Belmont at Missouri Valley Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Belmont at Jaguar Invitational | 3rd of 10",
 "Final Sep 20 Men's · Belmont at Grahame McDowell Invitational | 5th of 13",
 "Final Oct 5 Men's · Belmont at Kemper Lakes Intercollegiate | 4th of 12",
 "Final Oct 12 Men's · Belmont at The Scrappy at Pinetree | T7th of 11",
 "Final Oct 19 Men's · Belmont at Dayton Invitational | 11th of 13",
 "Upcoming Feb 26 Men's · Belmont at The Peoples Championship | ",
 "Upcoming Mar 8 Men's · Belmont at Donald Ross Collegiate Classic | ",
 "Upcoming Mar 27 Men's · Belmont at Sweetens Cove Intercollegiate | ",
 "Upcoming Apr 5 Men's · Belmont at Memphis Intercollegiate | ",
 "Upcoming Apr 12 Men's · Belmont at Austin Peay Intercollegiate | ",
 "Upcoming Apr 25 Men's · Belmont at Missouri Valley Conference Championship | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Belmont vs Tennessee Tech | T, 0-0",
 "Final Aug 16 Women's · Belmont at Samford | L, 0-2",
 "Final Aug 20 Women's · Belmont vs Chattanooga | W, 2-1",
 "Final Aug 23 Women's · Belmont at Louisville | L, 0-5",
 "Final Aug 27 Women's · Belmont vs Marshall | T, 3-3",
 "Final Sep 3 Women's · Belmont at UT Martin | T, 1-1",
 "Final Sep 6 Women's · Belmont at Ole Miss | L, 0-1",
 "Final Sep 13 Women's · Belmont at Southeast Missouri | T, 0-0",
 "Final Sep 20 Women's · Belmont vs UIC | W, 5-2",
 "Final Sep 27 Women's · Belmont at Northern Iowa | L, 0-1",
 "Final Oct 3 Women's · Belmont vs Southern Illinois | L, 1-2",
 "Final Oct 10 Women's · Belmont vs Evansville | L, 1-2",
 "Final Oct 15 Women's · Belmont at Illinois State | L, 0-1",
 "Final Oct 18 Women's · Belmont at Drake | L, 0-1",
 "Upcoming Oct 24, 2:00 PM Women's · Belmont vs Valparaiso | ",
 "Upcoming Nov 1, 12:00 PM Women's · Belmont at Indiana State | ",
 "Upcoming Nov 5, 1:00 PM Women's · Belmont at Murray State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Belmont vs Memphis | L, 0-2",
 "Final Aug 23 Men's · Belmont at Wright State | W, 6-1",
 "Final Aug 28 Men's · Belmont at Central Arkansas | L, 0-2",
 "Final Sep 4 Men's · Belmont vs Mercer | T, 1-1",
 "Final Sep 8 Men's · Belmont vs Lipscomb | W, 2-0",
 "Final Sep 12 Men's · Belmont at ETSU | L, 3-4",
 "Final Sep 18 Men's · Belmont vs Southern Indiana | W, 4-1",
 "Final Sep 21 Men's · Belmont at Louisville | L, 0-3",
 "Final Sep 25 Men's · Belmont vs St. Thomas | W, 3-0",
 "Final Oct 3 Men's · Belmont at Drake | W, 2-1",
 "Final Oct 6 Men's · Belmont at UAB | T, 0-0",
 "Final Oct 11 Men's · Belmont vs Bradley | W, 2-1",
 "Final Oct 17 Men's · Belmont vs UIC | T, 2-2",
 "Upcoming Oct 25, 2:00 PM Men's · Belmont at Bowling Green | ",
 "Upcoming Oct 30, 6:30 PM Men's · Belmont vs Western Michigan | ",
 "Upcoming Nov 4, 6:00 PM Men's · Belmont at Evansville | ",
 "Upcoming Nov 8 Men's · Belmont at MVC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Belmont at Belmont/Lipscomb Hidden Duals | Completed",
 "Final Oct 2 Women's · Belmont at Redbird Invitational | Completed",
 "Final Oct 8 Women's · Belmont at ITA Ohio Valley Regional Championships | Completed",
 "Final Oct 16 Women's · Belmont at Belmont/Lipscomb Hidden Duals #2 | Completed"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Belmont at Horizon League Individual Championships | Completed",
 "Final Oct 2 Men's · Belmont at Louisville Invitational | Completed",
 "Final Oct 8 Men's · Belmont at ITA Ohio Valley Regional Championships | Completed",
 "Final Oct 16 Men's · Belmont at MTSU Invitational | Completed",
 "Today Oct 23 Men's · Belmont at Louisville Classic | ",
 "Upcoming Nov 5 Men's · Belmont at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Belmont at NCAA Singles and Doubles Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Belmont vs San Jose State | W, 3-2",
 "Final Aug 29 Belmont vs San Francisco | L, 2-3",
 "Final Aug 29 Belmont at Weber State | L, 2-3",
 "Final Sep 4 Belmont vs South Alabama | L, 2-3",
 "Final Sep 5 Belmont vs Samford | L, 2-3",
 "Final Sep 6 Belmont vs Middle Tennessee | W, 3-2",
 "Final Sep 12 Belmont vs Marshall | W, 3-1",
 "Final Sep 12 Belmont at Duke | L, 0-3",
 "Final Sep 13 Belmont at NC State | L, 0-3",
 "Final Sep 17 Belmont vs Vanderbilt | L, 1-3",
 "Final Sep 19 Belmont vs Lipscomb | L, 1-3",
 "Final Sep 25 Belmont at Valparaiso | W, 3-1",
 "Final Sep 26 Belmont at UIC | W, 3-0",
 "Final Oct 2 Belmont vs Indiana State | W, 3-0",
 "Final Oct 3 Belmont vs Evansville | W, 3-0",
 "Final Oct 8 Belmont vs Southern Illinois | W, 3-0",
 "Final Oct 10 Belmont at Bradley | L, 0-3",
 "Final Oct 15 Belmont at Murray State | W, 3-0",
 "Final Oct 17 Belmont at Evansville | W, 3-1",
 "Final Oct 22 Belmont vs Murray State | W, 3-1",
 "Upcoming Oct 25, 1:00 PM Belmont at Illinois State | ",
 "Upcoming Oct 30, 6:00 PM Belmont vs Drake | ",
 "Upcoming Oct 31, 2:00 PM Belmont vs UIC | ",
 "Upcoming Nov 6, 6:00 PM Belmont at Northern Iowa | ",
 "Upcoming Nov 7, 5:00 PM Belmont at Drake | ",
 "Upcoming Nov 13, 6:00 PM Belmont vs Bradley | ",
 "Upcoming Nov 14, 1:30 PM Belmont vs Illinois State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Belmont module checks passed");
