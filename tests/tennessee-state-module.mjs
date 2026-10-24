import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tennesseeStateSchool} from '../src/schools/tennessee-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tennessee-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tennesseeStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tennessee-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tsutigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tennessee-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',tennesseeStateSchool.scheduleUrls],['roster',tennesseeStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tennessee-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tsutigers.com',`${key} must stay on tsutigers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://tsutigers.com/sports/mens-basketball/schedule","https://tsutigers.com/sports/womens-basketball/schedule"],"roster":["https://tsutigers.com/sports/mens-basketball/roster","https://tsutigers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://tsutigers.com/sports/womens-cross-country/schedule","https://tsutigers.com/sports/mens-cross-country/schedule"],"roster":["https://tsutigers.com/sports/womens-cross-country/roster","https://tsutigers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://tsutigers.com/sports/football/schedule"],"roster":["https://tsutigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tsutigers.com/sports/womens-golf/schedule","https://tsutigers.com/sports/mens-golf/schedule"],"roster":["https://tsutigers.com/sports/womens-golf/roster","https://tsutigers.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://tsutigers.com/sports/hockey/schedule"],"roster":["https://tsutigers.com/sports/hockey/roster"],"combined":false},"Softball":{"schedule":["https://tsutigers.com/sports/softball/schedule"],"roster":["https://tsutigers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://tsutigers.com/sports/womens-tennis/schedule","https://tsutigers.com/sports/mens-tennis/schedule"],"roster":["https://tsutigers.com/sports/womens-tennis/roster","https://tsutigers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://tsutigers.com/sports/womens-track-and-field/schedule","https://tsutigers.com/sports/mens-track-and-field/schedule"],"roster":["https://tsutigers.com/sports/womens-track-and-field/roster","https://tsutigers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://tsutigers.com/sports/womens-volleyball/schedule"],"roster":["https://tsutigers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tennessee-state|"+sport+"':"),`${sport} routes must live in the Tennessee State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://tsutigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tennesseeStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=tennessee-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 6:00 PM Men's · Tennessee State at Oakland | ",
 "Upcoming Nov 2, 10:30 AM Men's · Tennessee State vs Murray State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Tennessee State vs East-West | ",
 "Upcoming Nov 9, 7:00 PM Men's · Tennessee State vs Fisk | ",
 "Upcoming Nov 13, 6:00 PM Men's · Tennessee State at Tennessee | ",
 "Upcoming Nov 17, 6:00 PM Men's · Tennessee State at South Florida | ",
 "Upcoming Nov 29, 2:00 PM Men's · Tennessee State at Oklahoma State | ",
 "Upcoming Dec 4, 5:00 PM Men's · Tennessee State vs Grambling State | ",
 "Upcoming Dec 5, 5:00 PM Men's · Tennessee State vs Florida A&M | ",
 "Upcoming Dec 9, 7:00 PM Men's · Tennessee State vs Oakwood | ",
 "Upcoming Dec 11, 6:30 PM Men's · Tennessee State at Western Illinois | ",
 "Upcoming Dec 19, 3:30 PM Men's · Tennessee State vs Alabama A&M | ",
 "Upcoming Dec 31, 7:30 PM Men's · Tennessee State at Southern Indiana | ",
 "Upcoming Jan 2, 3:30 PM Men's · Tennessee State at Eastern Illinois | ",
 "Upcoming Jan 7, 7:30 PM Men's · Tennessee State vs Western Illinois | ",
 "Upcoming Jan 9, 3:30 PM Men's · Tennessee State vs SIUE | ",
 "Upcoming Jan 16, 7:30 PM Men's · Tennessee State vs Morehead State | ",
 "Upcoming Jan 21, 7:30 PM Men's · Tennessee State at Lindenwood | ",
 "Upcoming Jan 23, 3:30 PM Men's · Tennessee State at SEMO | ",
 "Upcoming Jan 28, 7:30 PM Men's · Tennessee State vs Southern Indiana | ",
 "Upcoming Jan 30, 3:30 PM Men's · Tennessee State vs UT Martin | ",
 "Upcoming Feb 4, 7:30 PM Men's · Tennessee State vs Lindenwood | ",
 "Upcoming Feb 6, 3:30 PM Men's · Tennessee State at Morehead State | ",
 "Upcoming Feb 11, 7:30 PM Men's · Tennessee State vs Eastern Illinois | ",
 "Upcoming Feb 17, 7:30 PM Men's · Tennessee State at SIUE | ",
 "Upcoming Feb 20, 1:00 PM Men's · Tennessee State vs Howard | ",
 "Upcoming Feb 25, 7:30 PM Men's · Tennessee State at UT Martin | ",
 "Upcoming Feb 27, 3:30 PM Men's · Tennessee State vs SEMO | ",
 "Upcoming Mar 3 Men's · Tennessee State at OVC Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Tennessee State vs Toccoa Falls | ",
 "Upcoming Nov 5, 7:00 PM Women's · Tennessee State at William & Mary | ",
 "Upcoming Nov 8 Women's · Tennessee State at Old Dominion | ",
 "Upcoming Nov 14, 11:00 AM Women's · Tennessee State vs Mississippi Valley State | ",
 "Upcoming Nov 17 Women's · Tennessee State at Louisville | ",
 "Upcoming Nov 22, 2:00 PM Women's · Tennessee State vs UT Arlington | ",
 "Upcoming Nov 25, 4:00 PM Women's · Tennessee State at USC Upstate | ",
 "Upcoming Nov 28, 2:00 PM Women's · Tennessee State at South Carolina | ",
 "Upcoming Nov 29 Women's · Tennessee State at NC Central or Alabama A&M | ",
 "Upcoming Dec 6, 12:00 PM Women's · Tennessee State at Alabama | ",
 "Upcoming Dec 10, 6:30 PM Women's · Tennessee State at North Alabama | ",
 "Upcoming Dec 13, 12:00 PM Women's · Tennessee State at Tennessee Tech | ",
 "Upcoming Dec 18, 6:00 PM Women's · Tennessee State at Chattanooga | ",
 "Upcoming Dec 21, 12:00 PM Women's · Tennessee State at Vanderbilt | ",
 "Upcoming Dec 31, 5:00 PM Women's · Tennessee State at Southern Indiana | ",
 "Upcoming Jan 2, 1:00 PM Women's · Tennessee State at Eastern Illinois | ",
 "Upcoming Jan 7, 5:00 PM Women's · Tennessee State vs Western Illinois | ",
 "Upcoming Jan 9, 1:00 PM Women's · Tennessee State vs SIUE | ",
 "Upcoming Jan 16, 1:00 PM Women's · Tennessee State vs Morehead State | ",
 "Upcoming Jan 21 Women's · Tennessee State at Lindenwood | ",
 "Upcoming Jan 23, 5:00 PM Women's · Tennessee State at SEMO | ",
 "Upcoming Jan 28 Women's · Tennessee State vs Southern Indiana | ",
 "Upcoming Jan 30, 1:00 PM Women's · Tennessee State vs UT Martin | ",
 "Upcoming Feb 4, 5:00 PM Women's · Tennessee State vs Lindenwood | ",
 "Upcoming Feb 6, 1:00 PM Women's · Tennessee State at Morehead State | ",
 "Upcoming Feb 11, 5:00 PM Women's · Tennessee State vs Eastern Illinois | ",
 "Upcoming Feb 18, 5:00 PM Women's · Tennessee State at SIUE | ",
 "Upcoming Feb 20, 1:00 PM Women's · Tennessee State at Western Illinois | ",
 "Upcoming Feb 25, 5:00 PM Women's · Tennessee State at UT Martin | ",
 "Upcoming Feb 27, 1:00 PM Women's · Tennessee State vs SEMO | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · Tennessee State at Vanderbilt Invitational | DNP",
 "Final Sep 11 Women's · Tennessee State at Legacy Series Invite | 4th of 6",
 "Final Sep 26 Women's · Tennessee State at Michael Pretorius Invite | 4th of 5",
 "Final Oct 3 Women's · Tennessee State at Swags Louisville Cross Country Classic | Completed",
 "Upcoming Oct 30 Women's · Tennessee State at Ohio Valley Conference | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · Tennessee State at Vanderbilt Invitational | 4th of 5",
 "Final Sep 11 Men's · Tennessee State at Legacy Series Invite | 1st of 5",
 "Final Sep 26 Men's · Tennessee State at Michael Pretorius Invite | 4th of 5",
 "Final Oct 3 Men's · Tennessee State at Swags Louisville Cross Country Classic | Completed",
 "Upcoming Oct 30 Men's · Tennessee State at Ohio Valley Conference | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Tennessee State vs Jackson State | L, 24-26",
 "Final Sep 5 Tennessee State at Georgia | L, 3-63",
 "Final Sep 12 Tennessee State at Alabama A&M | L, 3-30",
 "Final Sep 19 Tennessee State at Florida A&M | W, 29-26",
 "Final Oct 3 Tennessee State at Western Illinois | L, 21-28",
 "Final Oct 10 Tennessee State vs UT Martin | L, 28-42",
 "Final Oct 17 Tennessee State vs Morgan State | W, 25-16",
 "Upcoming Oct 24, 2:30 PM Tennessee State vs Charleston Southern | ",
 "Upcoming Oct 31, 1:00 PM Tennessee State at Lindenwood | ",
 "Upcoming Nov 7, 2:30 PM Tennessee State vs SEMO | ",
 "Upcoming Nov 14, 2:30 PM Tennessee State vs Eastern Illinois | ",
 "Upcoming Nov 21, 12:30 PM Tennessee State at Gardner-Webb | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Tennessee State at The Velvet | 14th of 14",
 "Final Oct 5 Women's · Tennessee State at Butler Fall Invitational | Completed",
 "Final Oct 12 Women's · Tennessee State at The Robbie | Completed",
 "Final Oct 19 Women's · Tennessee State at Braun Intercollegiate | Completed",
 "Upcoming Mar 22 Women's · Tennessee State at The Nashville Invitational | ",
 "Upcoming Mar 29 Women's · Tennessee State at E.H. Powers Memorial Intercollegiate | ",
 "Upcoming Apr 5 Women's · Tennessee State at Tennessee State | ",
 "Upcoming Apr 10 Women's · Tennessee State at Jan Weaver Invitational | ",
 "Upcoming Apr 25 Women's · Tennessee State at Ohio Valley Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Tennessee State at TheeIlove Intercollegiate | 7th of 8",
 "Final Sep 14 Men's · Tennessee State at Grover Page Classic | 10th of 10",
 "Final Sep 28 Men's · Tennessee State at SIUE Dolenc Invitational | 17th of 17",
 "Final Oct 12 Men's · Tennessee State at Bubba Barnett Intercollegiate | Completed",
 "Upcoming Mar 15 Men's · Tennessee State at ASU Spring Invitational | ",
 "Upcoming Mar 20 Men's · Tennessee State at Eastern Illinois | ",
 "Upcoming Mar 22 Men's · Tennessee State at Skyhawk Invitational | ",
 "Upcoming Apr 5 Men's · Tennessee State at TSU Big Blue Intercollegiate | ",
 "Upcoming Apr 25 Men's · Tennessee State at Ohio Valley Conference | "
]);
  const v_hockey=parse("Hockey","hockey");
  assert.deepEqual(v_hockey.map(line),[]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 8 Women's · Tennessee State at ITA Regional Championships | Completed",
 "Today Oct 23 Women's · Tennessee State at MTSU Fall Invitational | ",
 "Upcoming Jan 22, 5:30 PM Women's · Tennessee State at Lipscomb | ",
 "Upcoming Jan 30, 10:00 AM Women's · Tennessee State vs UT Southern | ",
 "Upcoming Feb 1, 4:00 PM Women's · Tennessee State at Middle Tennessee | ",
 "Upcoming Feb 5, 5:30 PM Women's · Tennessee State at Western Kentucky | ",
 "Upcoming Feb 7 Women's · Tennessee State at Chattanooga | ",
 "Upcoming Feb 14, 5:00 PM Women's · Tennessee State vs Ole Miss | ",
 "Upcoming Feb 21 Women's · Tennessee State at Belmont | ",
 "Upcoming Mar 13 Women's · Tennessee State at Vanderbilt | ",
 "Upcoming Mar 20, 10:00 AM Women's · Tennessee State vs SIUE | ",
 "Upcoming Mar 26, 2:00 PM Women's · Tennessee State at Western Illinois | ",
 "Upcoming Apr 2, 10:00 AM Women's · Tennessee State vs Xavier | ",
 "Upcoming Apr 4, 10:00 AM Women's · Tennessee State at Austin Peay | ",
 "Upcoming Apr 9, 2:00 PM Women's · Tennessee State vs Southern Indiana | ",
 "Upcoming Apr 17, 2:00 PM Women's · Tennessee State at Lindenwood | ",
 "Upcoming Apr 18, 2:00 PM Women's · Tennessee State at SEMO | ",
 "Upcoming Apr 22 Women's · Tennessee State at Ohio Valley Conference Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 8 Men's · Tennessee State at ITA Regional Championships | Completed",
 "Upcoming Nov 6 Men's · Tennessee State at Lipscomb Fall Invitational | ",
 "Upcoming Jan 14, 5:00 PM Men's · Tennessee State at Vanderbilt | ",
 "Upcoming Jan 17, 12:00 PM Men's · Tennessee State at Middle Tennessee | ",
 "Upcoming Feb 7 Men's · Tennessee State at Chattanooga | ",
 "Upcoming Feb 20, 2:00 PM Men's · Tennessee State at Arkansas | ",
 "Upcoming Feb 20, 6:00 PM Men's · Tennessee State at Memphis | ",
 "Upcoming Feb 24, 2:00 PM Men's · Tennessee State at Tennessee Tech | ",
 "Upcoming Mar 11, 2:00 PM Men's · Tennessee State vs Southern Mississippi | ",
 "Upcoming Mar 13 Men's · Tennessee State at Vanderbilt | ",
 "Upcoming Mar 15, 10:00 AM Men's · Tennessee State vs Missouri State | ",
 "Upcoming Mar 27 Men's · Tennessee State at Southern Indiana | ",
 "Upcoming Apr 2, 3:00 PM Men's · Tennessee State vs Xavier | ",
 "Upcoming Apr 3 Men's · Tennessee State vs Belmont | ",
 "Upcoming Apr 4, 1:00 PM Men's · Tennessee State at Austin Peay | ",
 "Upcoming Apr 10, 2:00 PM Men's · Tennessee State vs Northern Kentucky | ",
 "Upcoming Apr 11, 11:00 AM Men's · Tennessee State vs Lipscomb | ",
 "Upcoming Apr 16, 1:00 PM Men's · Tennessee State at Northern Kentucky | ",
 "Upcoming Apr 18, 2:00 PM Men's · Tennessee State vs Southern Indiana | ",
 "Upcoming Apr 24, 2:00 PM Men's · Tennessee State vs Oral Roberts | ",
 "Upcoming Apr 30 Men's · Tennessee State at Horizon League Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 Tennessee State at Memphis (Exhibition) | L, 0-3",
 "Final Aug 28 Tennessee State at Chattanooga | L, 0-3",
 "Final Aug 29 Tennessee State vs UAB | L, 0-3",
 "Final Aug 29 Tennessee State vs Valparaiso | L, 0-3",
 "Final Sep 4 Tennessee State vs Green Bay | L, 0-3",
 "Final Sep 4 Tennessee State vs Austin Peay | L, 0-3",
 "Final Sep 5 Tennessee State at Tennessee Tech | L, 0-3",
 "Final Sep 8 Tennessee State vs North Alabama | L, 0-3",
 "Final Sep 10 Tennessee State vs Evansville | L, 1-3",
 "Final Sep 12 Tennessee State at Evansville | L, 1-3",
 "Final Sep 16 Tennessee State at Austin Peay | L, 0-3",
 "Final Sep 22 Tennessee State at Alabama A&M | L, 1-3",
 "Final Oct 2 Tennessee State vs Western Illinois | L, 1-3",
 "Final Oct 3 Tennessee State vs Western Illinois | L, 0-3",
 "Final Oct 9 Tennessee State at SIUE | L, 0-3",
 "Final Oct 10 Tennessee State at SIUE | L, 0-3",
 "Final Oct 15 Tennessee State at Eastern Illinois | L, 0-3",
 "Final Oct 16 Tennessee State at Eastern Illinois | L, 0-3",
 "Today Oct 23, 6:00 PM Tennessee State vs Morehead State | ",
 "Upcoming Oct 24, 12:00 PM Tennessee State vs Morehead State | ",
 "Upcoming Oct 29, 6:00 PM Tennessee State at SEMO | ",
 "Upcoming Oct 30, 4:00 PM Tennessee State at SEMO | ",
 "Upcoming Nov 6, 6:00 PM Tennessee State vs Southern Indiana | ",
 "Upcoming Nov 7, 12:00 PM Tennessee State vs Southern Indiana | ",
 "Upcoming Nov 12, 6:00 PM Tennessee State at Lindenwood | ",
 "Upcoming Nov 13, 5:00 PM Tennessee State at Lindenwood | ",
 "Upcoming Nov 17, 6:00 PM Tennessee State vs UT Martin | ",
 "Upcoming Nov 18, 6:00 PM Tennessee State vs UT Martin | ",
 "Upcoming Nov 22 Tennessee State at Ohio Valley Conference Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_hockey,"Hockey hockey");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Tennessee State module checks passed");
