import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {chicagoStateSchool} from '../src/schools/chicago-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='chicago-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,chicagoStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/chicago-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gocsucougars.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['chicago-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',chicagoStateSchool.scheduleUrls],['roster',chicagoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('chicago-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gocsucougars.com',`${key} must stay on gocsucougars.com`);
  }
}
const parity={"Basketball":{"schedule":["https://gocsucougars.com/sports/mens-basketball/schedule","https://gocsucougars.com/sports/womens-basketball/schedule"],"roster":["https://gocsucougars.com/sports/mens-basketball/roster","https://gocsucougars.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gocsucougars.com/sports/womens-cross-country/schedule","https://gocsucougars.com/sports/mens-cross-country/schedule"],"roster":["https://gocsucougars.com/sports/womens-cross-country/roster","https://gocsucougars.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gocsucougars.com/sports/football/schedule"],"roster":["https://gocsucougars.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gocsucougars.com/sports/womens-golf/schedule","https://gocsucougars.com/sports/mens-golf/schedule"],"roster":["https://gocsucougars.com/sports/womens-golf/roster","https://gocsucougars.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gocsucougars.com/sports/womens-soccer/schedule","https://gocsucougars.com/sports/mens-soccer/schedule"],"roster":["https://gocsucougars.com/sports/womens-soccer/roster","https://gocsucougars.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://gocsucougars.com/sports/womens-tennis/schedule","https://gocsucougars.com/sports/mens-tennis/schedule"],"roster":["https://gocsucougars.com/sports/womens-tennis/roster","https://gocsucougars.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gocsucougars.com/sports/womens-track-and-field/schedule","https://gocsucougars.com/sports/mens-track-and-field/schedule"],"roster":["https://gocsucougars.com/sports/womens-track-and-field/roster","https://gocsucougars.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://gocsucougars.com/sports/triathlon/schedule"],"roster":["https://gocsucougars.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://gocsucougars.com/sports/womens-volleyball/schedule"],"roster":["https://gocsucougars.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'chicago-state|"+sport+"':"),`${sport} routes must live in the Chicago State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gocsucougars.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.chicagoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=chicago-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Men's · Chicago State vs Roosevelt (Exhibition) | ",
 "Upcoming Nov 2 Men's · Chicago State at Texas | ",
 "Upcoming Nov 5 Men's · Chicago State at Incarnate Word | ",
 "Upcoming Nov 9, 6:00 PM Men's · Chicago State vs South Carolina State | ",
 "Upcoming Nov 11 Men's · Chicago State at California Baptist | ",
 "Upcoming Nov 13 Men's · Chicago State at San Diego | ",
 "Upcoming Nov 15 Men's · Chicago State at LMU | ",
 "Upcoming Nov 18 Men's · Chicago State at UIC | ",
 "Upcoming Nov 22 Men's · Chicago State at Marquette | ",
 "Upcoming Nov 28 Men's · Chicago State at Bradley | ",
 "Upcoming Nov 30 Men's · Chicago State at Evansville | ",
 "Upcoming Dec 2 Men's · Chicago State at Murray State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Chicago State vs Illinois State | ",
 "Upcoming Dec 12 Men's · Chicago State at Valparaiso | ",
 "Upcoming Dec 19 Men's · Chicago State at South Dakota | ",
 "Upcoming Dec 22 Men's · Chicago State at Missouri | ",
 "Upcoming Dec 29 Men's · Chicago State at Northwestern | ",
 "Upcoming Jan 2, 1:00 PM Men's · Chicago State vs Central Connecticut State | ",
 "Upcoming Jan 8 Men's · Chicago State at FDU | ",
 "Upcoming Jan 10 Men's · Chicago State at Wagner College | ",
 "Upcoming Jan 13, 6:00 PM Men's · Chicago State vs LIU | ",
 "Upcoming Jan 16, 1:00 PM Men's · Chicago State vs New Haven | ",
 "Upcoming Jan 20, 11:00 AM Men's · Chicago State vs Wagner College | ",
 "Upcoming Jan 23, 1:00 PM Men's · Chicago State vs Stonehill College | ",
 "Upcoming Jan 28 Men's · Chicago State at Le Moyne College | ",
 "Upcoming Jan 30 Men's · Chicago State at Mercyhurst | ",
 "Upcoming Feb 6, 1:00 PM Men's · Chicago State vs FDU | ",
 "Upcoming Feb 11 Men's · Chicago State at LIU | ",
 "Upcoming Feb 13 Men's · Chicago State at New Haven | ",
 "Upcoming Feb 17, 6:00 PM Men's · Chicago State vs Mercyhurst | ",
 "Upcoming Feb 20, 1:00 PM Men's · Chicago State vs Le Moyne College | ",
 "Upcoming Feb 24 Men's · Chicago State at Central Connecticut State | ",
 "Upcoming Feb 27 Men's · Chicago State at Stonehill College | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Chicago State at Illinois State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Chicago State vs Mississippi Valley State | ",
 "Upcoming Nov 7, 4:30 PM Women's · Chicago State vs Texas State | ",
 "Upcoming Nov 10, 11:00 AM Women's · Chicago State vs Huston Tillotson | ",
 "Upcoming Nov 11 Women's · Chicago State at UIC | ",
 "Upcoming Nov 18, 1:00 PM Women's · Chicago State vs South Dakota | ",
 "Upcoming Nov 21, 8:15 PM Women's · Chicago State vs Seattle | ",
 "Upcoming Nov 24, 6:00 PM Women's · Chicago State vs Western Illinois | ",
 "Upcoming Nov 29 Women's · Chicago State at Indiana State | ",
 "Upcoming Dec 3 Women's · Chicago State at Winthrop | ",
 "Upcoming Dec 7 Women's · Chicago State at Illinois | ",
 "Upcoming Dec 13 Women's · Chicago State at Iowa State | ",
 "Upcoming Dec 18 Women's · Chicago State vs Eastern Washington | ",
 "Upcoming Dec 19 Women's · Chicago State vs Cleveland State | ",
 "Upcoming Dec 29, 2:00 PM Women's · Chicago State vs Howard | ",
 "Upcoming Jan 2 Women's · Chicago State at Central Connecticut State | ",
 "Upcoming Jan 6, 6:00 PM Women's · Chicago State vs FDU | ",
 "Upcoming Jan 9, 1:00 PM Women's · Chicago State vs Wagner College | ",
 "Upcoming Jan 14 Women's · Chicago State at LIU Brooklyn | ",
 "Upcoming Jan 16 Women's · Chicago State at New Haven | ",
 "Upcoming Jan 20 Women's · Chicago State at Wagner College | ",
 "Upcoming Jan 23 Women's · Chicago State at Stonehill College | ",
 "Upcoming Jan 28, 6:00 PM Women's · Chicago State vs Le Moyne College | ",
 "Upcoming Jan 30, 1:00 PM Women's · Chicago State vs Mercyhurst | ",
 "Upcoming Feb 6 Women's · Chicago State at FDU | ",
 "Upcoming Feb 10, 6:00 PM Women's · Chicago State vs LIU Brooklyn | ",
 "Upcoming Feb 13, 1:00 PM Women's · Chicago State vs New Haven | ",
 "Upcoming Feb 17 Women's · Chicago State at Mercyhurst | ",
 "Upcoming Feb 20 Women's · Chicago State at Le Moyne College | ",
 "Upcoming Feb 24, 6:00 PM Women's · Chicago State vs Central Connecticut State | ",
 "Upcoming Feb 27, 1:00 PM Women's · Chicago State vs Stonehill College | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Chicago State at Huskie Classic | No Team Score",
 "Final Sep 18 Women's · Chicago State at Cougars Cross Country Challenge | 4th · 115 pts",
 "Final Sep 25 Women's · Chicago State at Jim Allen Classic | 4th · 120 pts",
 "Final Oct 16 Women's · Chicago State at Bradley Pink Classic | No Team Score",
 "Upcoming Oct 31 Women's · Chicago State at NEC Championships | ",
 "Upcoming Nov 13 Women's · Chicago State at NCAA Midwest Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Chicago State at Huskie Classic | No Team Score",
 "Final Sep 18 Men's · Chicago State at Cougars Cross Country Challenge | 3rd · 70 pts",
 "Final Sep 25 Men's · Chicago State at Jim Allen Classic | 4th · 116 pts",
 "Final Oct 16 Men's · Chicago State at Bradley Pink Classic | No Team Score",
 "Upcoming Oct 31 Men's · Chicago State at NEC Championships | ",
 "Upcoming Nov 13 Men's · Chicago State at NCAA Midwest Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Chicago State vs Roosevelt | L, 28-44",
 "Final Sep 5 Chicago State at UT Martin | L, 7-42",
 "Final Sep 12 Chicago State vs Kentucky Christian | W, 78-7",
 "Final Sep 19 Chicago State at Butler | L, 20-47",
 "Final Sep 26 Chicago State vs Norfolk State | L, 20-43",
 "Final Oct 3 Chicago State at Tarleton State | L, 21-56",
 "Final Oct 17 Chicago State at North Carolina A&T State | L, 12-27",
 "Upcoming Oct 24, 2:00 PM Chicago State at Lindenwood | ",
 "Upcoming Oct 31, 2:00 PM Chicago State vs Fort Lauderdale | ",
 "Upcoming Nov 14, 12:00 PM Chicago State vs Virginia University of Lynchburg | ",
 "Upcoming Nov 21, 1:00 PM Chicago State at Southern Utah | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 30 Women's · Chicago State at Roseann Schwartz Invitational | 8th",
 "Final Sep 6 Women's · Chicago State at A-Ga-Ming Invitational | 13th",
 "Final Sep 21 Women's · Chicago State at Thomas W. Dortch, Jr. HBCU Golf Classic | 4th",
 "Final Oct 5 Women's · Chicago State at Windy City Classic | 1st",
 "Final Oct 17 Women's · Chicago State at SAS HBCU Invitational | 3rd"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Chicago State at Thomas W. Dortch, Jr. HBCU Golf Classic | 3rd",
 "Final Sep 26 Men's · Chicago State at Earl Yestingsmeier Invitational | 16th",
 "Final Oct 5 Men's · Chicago State at Windy City Classic | 1st",
 "Final Oct 17 Men's · Chicago State at SAS HBCU Invitational | T2nd"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Chicago State vs UT Martin | L, 0-4",
 "Final Aug 20 Women's · Chicago State at Purdue | L, 0-7",
 "Final Aug 22 Women's · Chicago State at Indiana State | L, 1-5",
 "Final Aug 27 Women's · Chicago State vs Alabama A&M | L, 1-2",
 "Final Aug 30 Women's · Chicago State at IU Indy | L, 1-5",
 "Final Sep 6 Women's · Chicago State vs Southern Illinois | L, 0-2",
 "Final Sep 10 Women's · Chicago State at Green Bay | L, 0-3",
 "Final Sep 17 Women's · Chicago State at Mercyhurst | L, 1-3",
 "Final Sep 20 Women's · Chicago State vs Delaware State | W, 1-0",
 "Final Sep 27 Women's · Chicago State at Central Connecticut State | L, 0-4",
 "Final Oct 1 Women's · Chicago State at FDU | L, 0-6",
 "Final Oct 4 Women's · Chicago State at LIU | L, 0-1",
 "Final Oct 8 Women's · Chicago State vs Stonehill College | L, 1-7",
 "Final Oct 11 Women's · Chicago State vs New Haven | L, 1-4",
 "Final Oct 18 Women's · Chicago State vs Le Moyne College | L, 1-3",
 "Upcoming Oct 25, 1:00 PM Women's · Chicago State vs Wagner College | ",
 "Upcoming Nov 1, 10:00 AM Women's · Chicago State at Howard | ",
 "Upcoming Nov 12 Women's · Chicago State at NEC Semifinals | ",
 "Upcoming Nov 15 Women's · Chicago State vs NEC Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Chicago State at Lindenwood | L, 0-3",
 "Final Aug 24 Men's · Chicago State at Milwaukee | L, 1-3",
 "Final Aug 27 Men's · Chicago State at St. Thomas | L, 1-4",
 "Final Aug 30 Men's · Chicago State at Missouri State | L, 0-5",
 "Final Sep 6 Men's · Chicago State at DePaul | L, 0-3",
 "Final Sep 12 Men's · Chicago State at Bellarmine | L, 0-6",
 "Final Sep 16 Men's · Chicago State vs Eastern Illinois | L, 1-4",
 "Final Sep 19 Men's · Chicago State at Bradley | L, 0-5",
 "Final Oct 1 Men's · Chicago State vs Howard | L, 1-2",
 "Final Oct 4 Men's · Chicago State vs FDU | L, 0-5",
 "Final Oct 8 Men's · Chicago State at Stonehill College | L, 1-6",
 "Final Oct 11 Men's · Chicago State at New Haven | T, 2-2",
 "Final Oct 15 Men's · Chicago State vs Le Moyne College | L, 0-4",
 "Upcoming Oct 25, 1:00 PM Men's · Chicago State at Central Connecticut State | ",
 "Upcoming Nov 1, 1:00 PM Men's · Chicago State vs LIU | ",
 "Upcoming Nov 8, 12:00 PM Men's · Chicago State at Mercyhurst | ",
 "Upcoming Nov 12 Men's · Chicago State at NEC Semifinals | ",
 "Upcoming Nov 15 Men's · Chicago State vs NEC Finals | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 12 Women's · Chicago State at Michigan State | Completed",
 "Upcoming Oct 30 Women's · Chicago State at Northern Illinois Fall Invite | ",
 "Upcoming Jan 18 Women's · Chicago State at Valparaiso | ",
 "Upcoming Jan 22 Women's · Chicago State at Northern Illinois | ",
 "Upcoming Jan 29, 10:00 AM Women's · Chicago State vs Drake | ",
 "Upcoming Feb 5, 10:00 AM Women's · Chicago State at Youngstown State | ",
 "Upcoming Feb 6, 10:00 AM Women's · Chicago State vs Binghamton | ",
 "Upcoming Feb 7 Women's · Chicago State at Mercyhurst | ",
 "Upcoming Feb 13 Women's · Chicago State at SIUE | ",
 "Upcoming Feb 17, 1:00 PM Women's · Chicago State vs Milwaukee | ",
 "Upcoming Feb 20, 11:00 AM Women's · Chicago State vs Northern Iowa | ",
 "Upcoming Feb 24, 2:00 PM Women's · Chicago State vs College of Lake County (Exhibition) | ",
 "Upcoming Feb 27 Women's · Chicago State at UIC | ",
 "Upcoming Feb 28, 10:00 AM Women's · Chicago State vs South Dakota | ",
 "Upcoming Mar 5 Women's · Chicago State at Bellarmine | ",
 "Upcoming Mar 6 Women's · Chicago State at Louisville | ",
 "Upcoming Mar 13 Women's · Chicago State at Cincinnati | ",
 "Upcoming Mar 18, 11:00 AM Women's · Chicago State vs Georgia State | ",
 "Upcoming Mar 27 Women's · Chicago State at Illinois State | ",
 "Upcoming Apr 1 Women's · Chicago State at FDU | ",
 "Upcoming Apr 4 Women's · Chicago State at LIU | ",
 "Upcoming Apr 9 Women's · Chicago State at Wagner College | ",
 "Upcoming Apr 10 Women's · Chicago State at Butler | ",
 "Upcoming Apr 16 Women's · Chicago State at Middle Tennessee | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 19 Men's · Chicago State at Michigan | Completed",
 "Upcoming Jan 17 Men's · Chicago State at Wisconsin | ",
 "Upcoming Jan 30, 10:00 AM Men's · Chicago State vs Drake | ",
 "Upcoming Jan 31 Men's · Chicago State at Northern Illinois | ",
 "Upcoming Feb 5, 2:00 PM Men's · Chicago State at Youngstown State | ",
 "Upcoming Feb 6, 2:00 PM Men's · Chicago State vs Binghamton | ",
 "Upcoming Feb 7 Men's · Chicago State at Mercyhurst | ",
 "Upcoming Feb 10, 1:00 PM Men's · Chicago State vs Moraine Valley Community College | ",
 "Upcoming Feb 19, 2:00 PM Men's · Chicago State vs Roosevelt | ",
 "Upcoming Feb 24, 10:00 AM Men's · Chicago State vs College of Lake County | ",
 "Upcoming Feb 28, 2:00 PM Men's · Chicago State vs Marquette | ",
 "Upcoming Mar 3, 1:00 PM Men's · Chicago State vs Kansas Wesleyan | ",
 "Upcoming Mar 5 Men's · Chicago State at Bellarmine | ",
 "Upcoming Mar 7 Men's · Chicago State at Louisville | ",
 "Upcoming Mar 14, 3:00 PM Men's · Chicago State vs Purdue University Northwest | ",
 "Upcoming Apr 1 Men's · Chicago State at FDU | ",
 "Upcoming Apr 3 Men's · Chicago State at Wagner College | ",
 "Upcoming Apr 4 Men's · Chicago State at LIU | ",
 "Upcoming Apr 10 Men's · Chicago State at Butler | ",
 "Upcoming Apr 16 Men's · Chicago State at Middle Tennessee | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 6 Chicago State at Greyhound Splash & Dash | Completed",
 "Final Sep 12 Chicago State at Mississinewa Triathlon | Completed",
 "Final Sep 19 Chicago State at Beaver County Tri Cup | Completed",
 "Final Oct 2 Chicago State at Prairie State Supersprint | Completed",
 "Final Oct 3 Chicago State at Prairie State Cup | Completed",
 "Final Oct 18 Chicago State at NCAA West Regionals | Completed"
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Chicago State at Seattle | L, 0-3",
 "Final Aug 29 Chicago State at Eastern Washington | L, 0-3",
 "Final Aug 30 Chicago State at North Dakota | L, 0-3",
 "Final Sep 3 Chicago State at Louisiana Tech | L, 0-3",
 "Final Sep 4 Chicago State at Western Michigan | L, 0-3",
 "Final Sep 5 Chicago State at Nebraska at Omaha | L, 0-3",
 "Final Sep 11 Chicago State at NIU | L, 0-3",
 "Final Sep 11 Chicago State at SIUE | L, 0-3",
 "Final Sep 12 Chicago State at UAPB | L, 0-3",
 "Final Sep 17 Chicago State at UC Riverside | L, 0-3",
 "Final Sep 18 Chicago State at Southern Utah | L, 0-3",
 "Final Sep 19 Chicago State at Utah Tech | L, 0-3",
 "Final Oct 2 Chicago State vs Stonehill College | W, 3-2",
 "Final Oct 3 Chicago State vs Stonehill College | L, 2-3",
 "Final Oct 9 Chicago State vs LIU | L, 0-3",
 "Final Oct 10 Chicago State vs LIU | L, 0-3",
 "Final Oct 16 Chicago State at Central Connecticut State | L, 0-3",
 "Final Oct 17 Chicago State at Central Connecticut State | L, 0-3",
 "Today Oct 23, 6:00 PM Chicago State vs Le Moyne College | ",
 "Upcoming Oct 24, 1:00 PM Chicago State vs Le Moyne College | ",
 "Upcoming Oct 30, 5:00 PM Chicago State at FDU | ",
 "Upcoming Oct 31, 12:00 PM Chicago State at FDU | ",
 "Upcoming Nov 6, 6:00 PM Chicago State vs Mercyhurst | ",
 "Upcoming Nov 7, 1:00 PM Chicago State vs Mercyhurst | ",
 "Upcoming Nov 13, 5:00 PM Chicago State at New Haven | ",
 "Upcoming Nov 14, 1:00 PM Chicago State at New Haven | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Chicago State module checks passed");
