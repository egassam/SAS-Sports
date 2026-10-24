import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {stThomasSchool} from '../src/schools/st-thomas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='st-thomas');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,stThomasHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/st-thomas-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tommiesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['st-thomas'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',stThomasSchool.scheduleUrls],['roster',stThomasSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('st-thomas|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tommiesports.com',`${key} must stay on tommiesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://tommiesports.com/sports/baseball/schedule"],"roster":["https://tommiesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://tommiesports.com/sports/wbball/schedule","https://tommiesports.com/sports/mbball/schedule"],"roster":["https://tommiesports.com/sports/wbball/roster","https://tommiesports.com/sports/mbball/roster"],"combined":true},"Cross Country":{"schedule":["https://tommiesports.com/sports/wcross/schedule","https://tommiesports.com/sports/mcross/schedule"],"roster":["https://tommiesports.com/sports/wcross/roster","https://tommiesports.com/sports/mcross/roster"],"combined":true},"Football":{"schedule":["https://tommiesports.com/sports/football/schedule"],"roster":["https://tommiesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tommiesports.com/sports/wgolf/schedule","https://tommiesports.com/sports/mgolf/schedule"],"roster":["https://tommiesports.com/sports/wgolf/roster","https://tommiesports.com/sports/mgolf/roster"],"combined":true},"Hockey":{"schedule":["https://tommiesports.com/sports/mhockey/schedule","https://tommiesports.com/sports/whockey/schedule"],"roster":["https://tommiesports.com/sports/mhockey/roster","https://tommiesports.com/sports/whockey/roster"],"combined":true},"Soccer":{"schedule":["https://tommiesports.com/sports/wsoc/schedule","https://tommiesports.com/sports/msoc/schedule"],"roster":["https://tommiesports.com/sports/wsoc/roster","https://tommiesports.com/sports/msoc/roster"],"combined":true},"Softball":{"schedule":["https://tommiesports.com/sports/softball/schedule"],"roster":["https://tommiesports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://tommiesports.com/sports/wswim/schedule","https://tommiesports.com/sports/mswim/schedule"],"roster":["https://tommiesports.com/sports/wswim/roster","https://tommiesports.com/sports/mswim/roster"],"combined":true},"Tennis":{"schedule":["https://tommiesports.com/sports/wten/schedule"],"roster":["https://tommiesports.com/sports/wten/roster"],"combined":false},"Track & Field":{"schedule":["https://tommiesports.com/sports/wtrack/schedule","https://tommiesports.com/sports/mtrack/schedule"],"roster":["https://tommiesports.com/sports/wtrack/roster","https://tommiesports.com/sports/mtrack/roster"],"combined":true},"Volleyball":{"schedule":["https://tommiesports.com/sports/wvball/schedule"],"roster":["https://tommiesports.com/sports/wvball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'st-thomas|"+sport+"':"),`${sport} routes must live in the St. Thomas module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://tommiesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.stThomasHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=st-thomas)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · St. Thomas at Northern Iowa | ",
 "Upcoming Nov 4 Women's · St. Thomas vs Bethel | ",
 "Upcoming Nov 10, 7:00 PM Women's · St. Thomas vs St. Catherine | ",
 "Upcoming Nov 14, 2:30 PM Women's · St. Thomas at Army | ",
 "Upcoming Nov 17, 6:00 PM Women's · St. Thomas at Drake | ",
 "Upcoming Nov 24, 11:00 AM Women's · St. Thomas vs Central Michigan | ",
 "Upcoming Nov 27, 4:30 PM Women's · St. Thomas vs CSUN | ",
 "Upcoming Nov 28, 2:00 PM Women's · St. Thomas at Cal Baptist | ",
 "Upcoming Dec 2 Women's · St. Thomas at Minnesota | ",
 "Upcoming Dec 10, 4:00 PM Women's · St. Thomas vs Grand Canyon | ",
 "Upcoming Dec 13, 1:00 PM Women's · St. Thomas at Detroit Mercy | ",
 "Upcoming Dec 15, 7:00 PM Women's · St. Thomas at Bowling Green | ",
 "Upcoming Dec 22, 6:00 PM Women's · St. Thomas vs Green Bay | ",
 "Upcoming Dec 28, 1:00 PM Women's · St. Thomas vs UW-Superior | ",
 "Upcoming Jan 2 Women's · St. Thomas at Gonzaga | ",
 "Upcoming Jan 7, 7:00 PM Women's · St. Thomas at North Dakota State | ",
 "Upcoming Jan 9, 1:00 PM Women's · St. Thomas at North Dakota | ",
 "Upcoming Jan 16, 1:00 PM Women's · St. Thomas at Omaha | ",
 "Upcoming Jan 21, 7:00 PM Women's · St. Thomas vs Oral Roberts | ",
 "Upcoming Jan 24, 1:00 PM Women's · St. Thomas vs Kansas City | ",
 "Upcoming Jan 28 Women's · St. Thomas at South Dakota State | ",
 "Upcoming Jan 30 Women's · St. Thomas at South Dakota | ",
 "Upcoming Feb 4, 7:00 PM Women's · St. Thomas vs North Dakota | ",
 "Upcoming Feb 7, 3:00 PM Women's · St. Thomas vs North Dakota State | ",
 "Upcoming Feb 13, 1:00 PM Women's · St. Thomas vs Omaha | ",
 "Upcoming Feb 18 Women's · St. Thomas at Kansas City | ",
 "Upcoming Feb 20, 2:00 PM Women's · St. Thomas at Oral Roberts | ",
 "Upcoming Feb 25, 7:00 PM Women's · St. Thomas vs South Dakota | ",
 "Upcoming Feb 27, 6:00 PM Women's · St. Thomas vs South Dakota State | ",
 "Upcoming Mar 3 Women's · St. Thomas at Summit League Championship | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · St. Thomas at Presbyterian | ",
 "Upcoming Nov 6, 7:00 PM Men's · St. Thomas at Minnesota | ",
 "Upcoming Nov 8, 1:00 PM Men's · St. Thomas vs Green Bay | ",
 "Upcoming Nov 11, 7:00 PM Men's · St. Thomas vs Macalester | ",
 "Upcoming Nov 14, 12:00 PM Men's · St. Thomas at Army | ",
 "Upcoming Nov 16, 6:00 PM Men's · St. Thomas at LIU Brooklyn | ",
 "Upcoming Nov 19, 7:00 PM Men's · St. Thomas vs SEMO | ",
 "Upcoming Nov 21, 2:00 PM Men's · St. Thomas at Milwaukee | ",
 "Upcoming Nov 25, 6:00 PM Men's · St. Thomas at UNC Wilmington | ",
 "Upcoming Nov 27, 11:00 AM Men's · St. Thomas vs Liberty | ",
 "Upcoming Nov 28, 11:00 AM Men's · St. Thomas vs Princeton | ",
 "Upcoming Dec 3, 7:00 PM Men's · St. Thomas vs North Central (MN) | ",
 "Upcoming Dec 5, 1:00 PM Men's · St. Thomas at Bucknell | ",
 "Upcoming Dec 10, 7:00 PM Men's · St. Thomas vs UNC Asheville | ",
 "Upcoming Dec 12, 2:00 PM Men's · St. Thomas vs Arkansas State | ",
 "Upcoming Dec 15, 7:00 PM Men's · St. Thomas vs UC San Diego | ",
 "Upcoming Dec 22, 7:00 PM Men's · St. Thomas at Stanford | ",
 "Upcoming Jan 2, 2:00 PM Men's · St. Thomas vs St. Olaf | ",
 "Upcoming Jan 7, 7:00 PM Men's · St. Thomas vs North Dakota State | ",
 "Upcoming Jan 10, 1:00 PM Men's · St. Thomas vs North Dakota | ",
 "Upcoming Jan 16, 6:00 PM Men's · St. Thomas vs Omaha | ",
 "Upcoming Jan 21, 7:00 PM Men's · St. Thomas at Oral Roberts | ",
 "Upcoming Jan 23, 7:00 PM Men's · St. Thomas at Kansas City | ",
 "Upcoming Jan 28, 7:00 PM Men's · St. Thomas vs South Dakota State | ",
 "Upcoming Jan 30, 6:00 PM Men's · St. Thomas vs South Dakota | ",
 "Upcoming Feb 4, 7:00 PM Men's · St. Thomas at North Dakota | ",
 "Upcoming Feb 6, 1:00 PM Men's · St. Thomas at North Dakota State | ",
 "Upcoming Feb 13, 7:00 PM Men's · St. Thomas at Omaha | ",
 "Upcoming Feb 18, 7:00 PM Men's · St. Thomas vs Kansas City | ",
 "Upcoming Feb 21, 3:00 PM Men's · St. Thomas vs Oral Roberts | ",
 "Upcoming Feb 25, 7:00 PM Men's · St. Thomas at South Dakota | ",
 "Upcoming Feb 27, 2:00 PM Men's · St. Thomas at South Dakota State | ",
 "Upcoming Mar 4 Men's · St. Thomas at The Summit League Championship | "
]);
  const v_wcross=parse("Cross Country","wcross");
  assert.deepEqual(v_wcross.map(line),[
 "Final Sep 12 Women's · St. Thomas at Phoenix Open | 1st of 7",
 "Final Sep 18 Women's · St. Thomas at Roy Griak Invitational | 4th of 17",
 "Final Oct 2 Women's · St. Thomas at Joe Piane Invitational | Blue: 16th of 20 Teams / Open: 4th of 11 Teams",
 "Final Oct 10 Women's · St. Thomas at Legends Invite | 1st of 5",
 "Final Oct 16 Women's · St. Thomas at Pink Classic | Red: 7th of 25 Teams / White: 3rd of 21 Teams",
 "Final Oct 23 Women's · St. Thomas at Winona State Invitational | 5th of 7",
 "Upcoming Oct 31, 11:00 AM Women's · St. Thomas at The Summit League Championship | ",
 "Upcoming Nov 13 Women's · St. Thomas at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Women's · St. Thomas at NCAA National Championship | "
]);
  const v_mcross=parse("Cross Country","mcross");
  assert.deepEqual(v_mcross.map(line),[
 "Final Sep 4 Men's · St. Thomas at Dragon Twilight | 2nd of 11",
 "Final Sep 18 Men's · St. Thomas at Roy Griak Invitational | 6th of 18",
 "Final Oct 2 Men's · St. Thomas at Joe Piane Invitational | Blue: 16th of 18 Teams / Open: 6th of 10 Teams",
 "Final Oct 16 Men's · St. Thomas at Pink Classic | Red: 10th of 25 Teams / White: 7th of 25 Teams",
 "Upcoming Oct 31, 12:00 PM Men's · St. Thomas at The Summit League Championship | ",
 "Upcoming Nov 13 Men's · St. Thomas at NCAA West Regional | ",
 "Upcoming Nov 21 Men's · St. Thomas at NCAA National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 St. Thomas vs Winona State | W, 15-9",
 "Final Sep 5 St. Thomas at North Dakota | L, 26-62",
 "Final Sep 12 St. Thomas vs Northern Michigan | W, 56-14",
 "Final Sep 19 St. Thomas vs Southern Utah | W, 28-26",
 "Final Sep 26 St. Thomas vs San Diego | W, 50-17",
 "Final Oct 3 St. Thomas at Presbyterian | L, 21-55",
 "Final Oct 10 St. Thomas vs Stetson | W, 64-21",
 "Final Oct 24 St. Thomas at Marist | W, 35-13",
 "Upcoming Oct 31, 1:00 PM St. Thomas vs Davidson | ",
 "Upcoming Nov 7, 12:00 PM St. Thomas at Butler | ",
 "Upcoming Nov 14, 1:00 PM St. Thomas vs Drake | ",
 "Upcoming Nov 21, 1:00 PM St. Thomas at Valparaiso | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Sep 7 Women's · St. Thomas at Bear Brawl | 1st of 6",
 "Final Sep 13 Women's · St. Thomas at Redbird Invitational | 1st of 13",
 "Final Sep 28 Women's · St. Thomas at Diane Thomason Invitational | 3rd of 13",
 "Final Oct 5 Women's · St. Thomas at Marilynn Smith Sunflower Invitational | 6th of 14",
 "Upcoming Feb 19 Women's · St. Thomas at Rio Verde Invitational | ",
 "Upcoming Mar 15 Women's · St. Thomas at Jackrabbit Invitational | ",
 "Upcoming Mar 22 Women's · St. Thomas at Bell Bank's \"Pay It Forward\" | ",
 "Upcoming Mar 29 Women's · St. Thomas at Coach Mo Classic | ",
 "Upcoming Apr 25 Women's · St. Thomas at The Summit League Championship | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 14 Men's · St. Thomas at Wildcat Invitational | 1st of 15",
 "Final Sep 20 Men's · St. Thomas at Gopher Invitational | 8th of 15",
 "Final Sep 27 Men's · St. Thomas at Badger Invitational | 5th of 19",
 "Final Oct 19 Men's · St. Thomas at Flyer Invitational | 6th of 13",
 "Upcoming Mar 1 Men's · St. Thomas at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 8 Men's · St. Thomas at Babygrande Ross Collegiate Classic | ",
 "Upcoming Mar 22 Men's · St. Thomas at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Apr 5 Men's · St. Thomas at Tiger Intercollegiate | ",
 "Upcoming Apr 19 Men's · St. Thomas at SeattleU Redhawk Invitational | ",
 "Upcoming May 2 Men's · St. Thomas at The Summit League Championship | "
]);
  const v_mhockey=parse("Hockey","mhockey");
  assert.deepEqual(v_mhockey.map(line),[
 "Final Oct 9 Men's · St. Thomas vs Air Force | L, 1-5",
 "Final Oct 10 Men's · St. Thomas vs Air Force | W, 4-2",
 "Final Oct 23 Men's · St. Thomas vs Minnesota State | L, 1-3",
 "Today Oct 24, 6:00 PM Men's · St. Thomas at Minnesota State | ",
 "Upcoming Oct 30, 6:00 PM Men's · St. Thomas at Miami | ",
 "Upcoming Oct 31, 6:30 PM Men's · St. Thomas at Miami | ",
 "Upcoming Nov 6, 7:00 PM Men's · St. Thomas vs Alaska Anchorage | ",
 "Upcoming Nov 7, 6:00 PM Men's · St. Thomas vs Alaska Anchorage | ",
 "Upcoming Nov 13, 7:00 PM Men's · St. Thomas vs North Dakota | ",
 "Upcoming Nov 14, 7:00 PM Men's · St. Thomas vs North Dakota | ",
 "Upcoming Nov 20, 8:00 PM Men's · St. Thomas at Denver | ",
 "Upcoming Nov 21, 7:00 PM Men's · St. Thomas at Denver | ",
 "Upcoming Nov 25, 6:00 PM Men's · St. Thomas at Bemidji State | ",
 "Upcoming Nov 28, 6:00 PM Men's · St. Thomas vs Bemidji State | ",
 "Upcoming Dec 4, 7:00 PM Men's · St. Thomas vs Omaha | ",
 "Upcoming Dec 5, 6:00 PM Men's · St. Thomas vs Omaha | ",
 "Upcoming Dec 11, 8:00 PM Men's · St. Thomas at Colorado College | ",
 "Upcoming Dec 12, 7:00 PM Men's · St. Thomas at Colorado College | ",
 "Upcoming Jan 1, 4:00 PM Men's · St. Thomas at Providence | ",
 "Upcoming Jan 2, 4:00 PM Men's · St. Thomas at Providence | ",
 "Upcoming Jan 8, 7:00 PM Men's · St. Thomas vs St. Cloud State | ",
 "Upcoming Jan 9, 6:00 PM Men's · St. Thomas vs St. Cloud State | ",
 "Upcoming Jan 15, 7:00 PM Men's · St. Thomas at North Dakota | ",
 "Upcoming Jan 16, 6:00 PM Men's · St. Thomas at North Dakota | ",
 "Upcoming Jan 22, 7:00 PM Men's · St. Thomas vs Western Michigan | ",
 "Upcoming Jan 23, 6:00 PM Men's · St. Thomas vs Western Michigan | ",
 "Upcoming Jan 30, 4:30 PM Men's · St. Thomas vs St. Cloud State (Exhib.) (Exhibition) | ",
 "Upcoming Feb 5, 7:00 PM Men's · St. Thomas vs Miami | ",
 "Upcoming Feb 6, 6:00 PM Men's · St. Thomas vs Miami | ",
 "Upcoming Feb 12, 7:00 PM Men's · St. Thomas at Minnesota Duluth | ",
 "Upcoming Feb 13, 6:00 PM Men's · St. Thomas at Minnesota Duluth | ",
 "Upcoming Feb 19, 7:00 PM Men's · St. Thomas vs Arizona State | ",
 "Upcoming Feb 20, 6:00 PM Men's · St. Thomas vs Arizona State | ",
 "Upcoming Feb 26, 7:00 PM Men's · St. Thomas at St. Cloud State | ",
 "Upcoming Feb 27, 6:00 PM Men's · St. Thomas at St. Cloud State | "
]);
  const v_whockey=parse("Hockey","whockey");
  assert.deepEqual(v_whockey.map(line),[
 "Final Sep 25 Women's · St. Thomas vs New Hampshire | W, 7-2",
 "Final Sep 26 Women's · St. Thomas vs New Hampshire | W, 3-1",
 "Final Oct 2 Women's · St. Thomas vs Ohio State | L, 2-5",
 "Final Oct 3 Women's · St. Thomas vs Ohio State | L, 2-5",
 "Final Oct 9 Women's · St. Thomas at Minnesota Duluth | W, 2-1",
 "Final Oct 10 Women's · St. Thomas at Minnesota Duluth | L, 0-3",
 "Final Oct 16 Women's · St. Thomas vs St. Cloud State | L, 2-3",
 "Final Oct 17 Women's · St. Thomas vs St. Cloud State | L, 0-1",
 "Upcoming Oct 30, 6:00 PM Women's · St. Thomas vs Minnesota State | ",
 "Upcoming Oct 31, 2:00 PM Women's · St. Thomas at Minnesota State | ",
 "Upcoming Nov 14 Women's · St. Thomas at Wisconsin | ",
 "Upcoming Nov 15, 1:00 PM Women's · St. Thomas at Wisconsin | ",
 "Upcoming Nov 20, 6:00 PM Women's · St. Thomas vs Minnesota | ",
 "Upcoming Nov 21, 2:00 PM Women's · St. Thomas vs Minnesota | ",
 "Upcoming Nov 27, 6:00 PM Women's · St. Thomas vs Holy Cross | ",
 "Upcoming Nov 28, 1:00 PM Women's · St. Thomas vs Holy Cross | ",
 "Upcoming Dec 4, 6:00 PM Women's · St. Thomas at Bemidji State | ",
 "Upcoming Dec 5, 3:00 PM Women's · St. Thomas at Bemidji State | ",
 "Upcoming Jan 1, 12:00 PM Women's · St. Thomas at Providence | ",
 "Upcoming Jan 2, 12:00 PM Women's · St. Thomas at Providence | ",
 "Upcoming Jan 8, 2:00 PM Women's · St. Thomas vs Wisconsin | ",
 "Upcoming Jan 9, 2:00 PM Women's · St. Thomas vs Wisconsin | ",
 "Upcoming Jan 15, 2:00 PM Women's · St. Thomas at St. Cloud State | ",
 "Upcoming Jan 16, 1:00 PM Women's · St. Thomas at St. Cloud State | ",
 "Upcoming Jan 22, 2:00 PM Women's · St. Thomas vs Bemidji State | ",
 "Upcoming Jan 23, 2:00 PM Women's · St. Thomas vs Bemidji State | ",
 "Upcoming Jan 29, 6:00 PM Women's · St. Thomas at Minnesota | ",
 "Upcoming Jan 30, 2:00 PM Women's · St. Thomas at Minnesota | ",
 "Upcoming Feb 5, 6:00 PM Women's · St. Thomas at Minnesota State | ",
 "Upcoming Feb 6, 2:00 PM Women's · St. Thomas vs Minnesota State | ",
 "Upcoming Feb 12, 5:00 PM Women's · St. Thomas at Ohio State | ",
 "Upcoming Feb 13, 12:00 PM Women's · St. Thomas at Ohio State | ",
 "Upcoming Feb 19, 2:00 PM Women's · St. Thomas vs Minnesota Duluth | ",
 "Upcoming Feb 20, 2:00 PM Women's · St. Thomas vs Minnesota Duluth | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Women's · St. Thomas vs Marquette | L, 0-4",
 "Final Aug 23 Women's · St. Thomas at Drake | L, 0-2",
 "Final Aug 27 Women's · St. Thomas at Green Bay | T, 1-1",
 "Final Aug 30 Women's · St. Thomas at Minnesota | L, 1-2",
 "Final Sep 5 Women's · St. Thomas vs Butler | L, 1-2",
 "Final Sep 10 Women's · St. Thomas at Northern Iowa | W, 2-1",
 "Final Sep 17 Women's · St. Thomas at Lindenwood | L, 2-3",
 "Final Sep 24 Women's · St. Thomas at Nebraska at Omaha | L, 2-3",
 "Final Sep 27 Women's · St. Thomas vs Kansas City | L, 0-1",
 "Final Oct 2 Women's · St. Thomas at Oral Roberts | L, 0-3",
 "Final Oct 8 Women's · St. Thomas at North Dakota State | W, 2-1",
 "Final Oct 11 Women's · St. Thomas at North Dakota | W, 2-1",
 "Final Oct 15 Women's · St. Thomas vs South Dakota State | W, 1-0",
 "Final Oct 18 Women's · St. Thomas vs South Dakota | L, 0-3",
 "Today Oct 24, 3:00 PM Women's · St. Thomas vs Nebraska at Omaha | ",
 "Upcoming Oct 29, 6:00 PM Women's · St. Thomas at Kansas City | ",
 "Upcoming Nov 1, 1:00 PM Women's · St. Thomas vs Oral Roberts | "
]);
  const v_msoc=parse("Soccer","msoc");
  assert.deepEqual(v_msoc.map(line),[
 "Final Aug 20 Men's · St. Thomas vs Detroit Mercy | L, 0-2",
 "Final Aug 23 Men's · St. Thomas vs Green Bay | T, 1-1",
 "Final Aug 27 Men's · St. Thomas vs Chicago State | W, 4-1",
 "Final Aug 30 Men's · St. Thomas at Eastern Illinois | T, 1-1",
 "Final Sep 2 Men's · St. Thomas vs St. Cloud State | W, 2-0",
 "Final Sep 5 Men's · St. Thomas at Milwaukee | W, 1-0",
 "Final Sep 9 Men's · St. Thomas at Marquette | L, 0-2",
 "Final Sep 13 Men's · St. Thomas vs Xavier | L, 0-1",
 "Final Sep 18 Men's · St. Thomas at Utah Tech | W, 2-1",
 "Final Sep 25 Men's · St. Thomas at Belmont | L, 0-3",
 "Final Oct 3 Men's · St. Thomas vs Kansas City | L, 0-1",
 "Final Oct 6 Men's · St. Thomas at Western Michigan | L, 0-4",
 "Final Oct 10 Men's · St. Thomas vs Delaware | T, 0-0",
 "Final Oct 17 Men's · St. Thomas at UMass | L, 0-1",
 "Final Oct 24 Men's · St. Thomas vs Omaha | W, 4-0",
 "Upcoming Oct 31, 7:00 PM Men's · St. Thomas at Oral Roberts | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_wswim=parse("Swimming & Diving","wswim");
  assert.deepEqual(v_wswim.map(line),[
 "Final Sep 25 Women's · St. Thomas vs Purple and Grey Intersquad | Completed",
 "Final Oct 3 Women's · St. Thomas vs Green Bay | W, 157-68",
 "Final Oct 3 Women's · St. Thomas vs Gustavus | W, 173-49",
 "Final Oct 16 Women's · St. Thomas at Northern Iowa | Completed",
 "Final Oct 16 Women's · St. Thomas at Southern Illinois | Completed",
 "Upcoming Nov 6, 5:00 PM Women's · St. Thomas vs Mankato | ",
 "Upcoming Nov 6, 5:00 PM Women's · St. Thomas vs Concordia | ",
 "Upcoming Nov 7, 10:00 AM Women's · St. Thomas vs St. Cloud State | ",
 "Upcoming Nov 19, 10:00 AM Women's · St. Thomas at South Dakota Invite | ",
 "Upcoming Jan 8, 5:00 PM Women's · St. Thomas vs South Dakota | ",
 "Upcoming Jan 14, 4:00 PM Women's · St. Thomas at Augustana | ",
 "Upcoming Jan 15, 5:00 PM Women's · St. Thomas at Omaha | ",
 "Upcoming Jan 23, 10:00 AM Women's · St. Thomas at Minnesota & SDSU Triangular | ",
 "Upcoming Jan 29, 3:00 PM Women's · St. Thomas at Iowa State | ",
 "Upcoming Feb 5 Women's · St. Thomas at Minnesota First Chance | ",
 "Upcoming Feb 24 Women's · St. Thomas at Summit League Championships | ",
 "Upcoming Mar 11 Women's · St. Thomas at CSCAA National Invitational Championship | "
]);
  const v_mswim=parse("Swimming & Diving","mswim");
  assert.deepEqual(v_mswim.map(line),[
 "Final Sep 25 Men's · St. Thomas vs Purple and Grey Intersquad | Completed",
 "Final Oct 3 Men's · St. Thomas vs Green Bay | W, 115-98",
 "Final Oct 3 Men's · St. Thomas vs Gustavus | W, 171-34",
 "Final Oct 16 Men's · St. Thomas at Northern Iowa | Completed",
 "Final Oct 16 Men's · St. Thomas at Southern Illinois | Completed",
 "Upcoming Nov 7, 10:00 AM Men's · St. Thomas vs St. Cloud State | ",
 "Upcoming Nov 19 Men's · St. Thomas at South Dakota Invite | ",
 "Upcoming Jan 8, 5:00 PM Men's · St. Thomas vs South Dakota | ",
 "Upcoming Jan 14, 4:00 PM Men's · St. Thomas at Augustana | ",
 "Upcoming Jan 15, 5:00 PM Men's · St. Thomas at Omaha | ",
 "Upcoming Jan 23, 10:00 AM Men's · St. Thomas at Minnesota & SDSU Triangular | ",
 "Upcoming Feb 5 Men's · St. Thomas at Minnesota First Chance | ",
 "Upcoming Feb 24 Men's · St. Thomas at Summit League Championships | ",
 "Upcoming Mar 11 Men's · St. Thomas at CSCAA National Invitational Championship | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Final Sep 25 St. Thomas at Gopher Invitational | Completed",
 "Final Oct 14 St. Thomas at ITA Regionals | Completed",
 "Upcoming Nov 6 St. Thomas at UTR Tournament | ",
 "Upcoming Jan 29 St. Thomas at Gonzaga | ",
 "Upcoming Jan 30 St. Thomas at Idaho | ",
 "Upcoming Feb 6 St. Thomas vs Bradley | ",
 "Upcoming Feb 13 St. Thomas vs Milwaukee | ",
 "Upcoming Feb 14 St. Thomas at Minnesota | ",
 "Upcoming Feb 19 St. Thomas at Iowa State | ",
 "Upcoming Feb 21 St. Thomas at Drake | ",
 "Upcoming Feb 26 St. Thomas at Northern Iowa | ",
 "Upcoming Feb 27 St. Thomas vs SIUE | ",
 "Upcoming Mar 6 St. Thomas vs Kansas City | ",
 "Upcoming Mar 20 St. Thomas at Middle Tennessee | ",
 "Upcoming Mar 21 St. Thomas at Belmont | ",
 "Upcoming Mar 23 St. Thomas at Western Kentucky | ",
 "Upcoming Mar 27 St. Thomas vs Omaha | ",
 "Upcoming Apr 3 St. Thomas vs Creighton | ",
 "Upcoming Apr 10 St. Thomas at South Dakota | ",
 "Upcoming Apr 17 St. Thomas at Oral Roberts | ",
 "Upcoming Apr 28 St. Thomas at The Summit League Championship | "
]);
  const v_wtrack=parse("Track & Field","wtrack");
  assert.deepEqual(v_wtrack.map(line),[]);
  const v_mtrack=parse("Track & Field","mtrack");
  assert.deepEqual(v_mtrack.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 29 St. Thomas vs Texas Tech | L, 2-3",
 "Final Aug 30 St. Thomas at Wyoming | L, 0-3",
 "Final Sep 3 St. Thomas vs Montana State | W, 3-1",
 "Final Sep 4 St. Thomas vs UIC | L, 2-3",
 "Final Sep 5 St. Thomas vs Milwaukee | L, 1-3",
 "Final Sep 12 St. Thomas vs Miami (FL) | W, 3-0",
 "Final Sep 13 St. Thomas vs Minnesota | L, 0-3",
 "Final Sep 18 St. Thomas vs Western Michigan | L, 2-3",
 "Final Sep 19 St. Thomas at Marquette | L, 2-3",
 "Final Sep 24 St. Thomas at North Dakota State | L, 2-3",
 "Final Sep 26 St. Thomas at North Dakota | W, 3-1",
 "Final Oct 1 St. Thomas vs South Dakota | L, 0-3",
 "Final Oct 3 St. Thomas vs South Dakota State | L, 2-3",
 "Final Oct 9 St. Thomas at Omaha | W, 3-0",
 "Final Oct 15 St. Thomas at Kansas City | W, 3-0",
 "Final Oct 17 St. Thomas at Oral Roberts | W, 3-0",
 "Final Oct 22 St. Thomas vs North Dakota | W, 3-0",
 "Final Oct 24 St. Thomas vs North Dakota State | W, 3-2",
 "Upcoming Oct 29, 7:00 PM St. Thomas at South Dakota State | ",
 "Upcoming Oct 31, 1:00 PM St. Thomas at South Dakota | ",
 "Upcoming Nov 6, 7:00 PM St. Thomas vs Omaha | ",
 "Upcoming Nov 12, 7:00 PM St. Thomas vs Oral Roberts | ",
 "Upcoming Nov 14, 12:00 PM St. Thomas vs Kansas City | ",
 "Upcoming Nov 22 St. Thomas at The Summit League Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wcross,"Cross Country wcross");
  ownRecapsOnly(v_mcross,"Cross Country mcross");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_mhockey,"Hockey mhockey");
  ownRecapsOnly(v_whockey,"Hockey whockey");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_msoc,"Soccer msoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_wswim,"Swimming & Diving wswim");
  ownRecapsOnly(v_mswim,"Swimming & Diving mswim");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_wtrack,"Track & Field wtrack");
  ownRecapsOnly(v_mtrack,"Track & Field mtrack");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("St. Thomas module checks passed");
