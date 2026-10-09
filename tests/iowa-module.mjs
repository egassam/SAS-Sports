import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {iowaSchool,iowaGolfCardPlace,iowaGolfStoryPlace} from '../src/schools/iowa.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='iowa');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,iowaHandlers,attachOfficialMeetResults,decodeHtml,schoolModule};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/iowa-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hawkeyesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['iowa'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',iowaSchool.scheduleUrls],['roster',iowaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('iowa|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hawkeyesports.com',`${key} must stay on hawkeyesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://hawkeyesports.com/sports/baseball/schedule"],"roster":["https://hawkeyesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hawkeyesports.com/sports/mbball/schedule","https://hawkeyesports.com/sports/wbball/schedule"],"roster":["https://hawkeyesports.com/sports/mbball/roster","https://hawkeyesports.com/sports/wbball/roster"],"combined":true},"Cross Country":{"schedule":["https://hawkeyesports.com/sports/mcross/schedule","https://hawkeyesports.com/sports/wcross/schedule"],"roster":["https://hawkeyesports.com/sports/mcross/roster","https://hawkeyesports.com/sports/wcross/roster"],"combined":true},"Field Hockey":{"schedule":["https://hawkeyesports.com/sports/fhockey/schedule"],"roster":["https://hawkeyesports.com/sports/fhockey/roster"],"combined":false},"Football":{"schedule":["https://hawkeyesports.com/sports/football/schedule"],"roster":["https://hawkeyesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hawkeyesports.com/sports/mgolf/schedule","https://hawkeyesports.com/sports/wgolf/schedule"],"roster":["https://hawkeyesports.com/sports/mgolf/roster","https://hawkeyesports.com/sports/wgolf/roster"],"combined":true},"Gymnastics":{"schedule":["https://hawkeyesports.com/sports/wgym/schedule"],"roster":["https://hawkeyesports.com/sports/wgym/roster"],"combined":false},"Rowing":{"schedule":["https://hawkeyesports.com/sports/wrow/schedule"],"roster":["https://hawkeyesports.com/sports/wrow/roster"],"combined":false},"Soccer":{"schedule":["https://hawkeyesports.com/sports/wsoc/schedule"],"roster":["https://hawkeyesports.com/sports/wsoc/roster"],"combined":false},"Softball":{"schedule":["https://hawkeyesports.com/sports/softball/schedule"],"roster":["https://hawkeyesports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://hawkeyesports.com/sports/wswim/schedule"],"roster":["https://hawkeyesports.com/sports/wswim/roster"],"combined":false},"Tennis":{"schedule":["https://hawkeyesports.com/sports/wten/schedule"],"roster":["https://hawkeyesports.com/sports/wten/roster"],"combined":false},"Track & Field":{"schedule":["https://hawkeyesports.com/sports/mtrack/schedule","https://hawkeyesports.com/sports/wtrack/schedule"],"roster":["https://hawkeyesports.com/sports/mtrack/roster","https://hawkeyesports.com/sports/wtrack/roster"],"combined":true},"Volleyball":{"schedule":["https://hawkeyesports.com/sports/wvball/schedule"],"roster":["https://hawkeyesports.com/sports/wvball/roster"],"combined":false},"Wrestling":{"schedule":["https://hawkeyesports.com/sports/wrestling/schedule","https://hawkeyesports.com/sports/womens-wrestling/schedule"],"roster":["https://hawkeyesports.com/sports/wrestling/roster","https://hawkeyesports.com/sports/womens-wrestling/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'iowa|"+sport+"':"),`${sport} routes must live in the Iowa module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://hawkeyesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.iowaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];


// BEGIN generated (scripts/generate-module-tests.mjs --school=iowa)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Sep 18 Iowa vs Madison College (Exhibition) | W, 12-5",
 "Final Sep 26 Iowa at Missouri (Exhibition) | W, 18-7",
 "Final Oct 2 Iowa vs Kirkwood Community College (Exhibition) | L, 25-30",
 "Upcoming Oct 10, 1:00 PM Iowa vs Kansas (Exhibition) | ",
 "Upcoming Mar 12 Iowa at UCLA | ",
 "Upcoming Mar 13 Iowa at UCLA | ",
 "Upcoming Mar 14 Iowa at UCLA | ",
 "Upcoming Mar 19 Iowa vs USC | ",
 "Upcoming Mar 20 Iowa vs USC | ",
 "Upcoming Mar 21 Iowa vs USC | ",
 "Upcoming Mar 26 Iowa at Illinois | ",
 "Upcoming Mar 27 Iowa at Illinois | ",
 "Upcoming Mar 28 Iowa at Illinois | ",
 "Upcoming Apr 9 Iowa vs Penn State | ",
 "Upcoming Apr 10 Iowa vs Penn State | ",
 "Upcoming Apr 11 Iowa vs Penn State | ",
 "Upcoming Apr 16 Iowa vs Nebraska | ",
 "Upcoming Apr 17 Iowa vs Nebraska | ",
 "Upcoming Apr 18 Iowa vs Nebraska | ",
 "Upcoming Apr 23 Iowa at Minnesota | ",
 "Upcoming Apr 24 Iowa at Minnesota | ",
 "Upcoming Apr 25 Iowa at Minnesota | ",
 "Upcoming Apr 30 Iowa at Ohio State | ",
 "Upcoming May 1 Iowa at Ohio State | ",
 "Upcoming May 2 Iowa at Ohio State | ",
 "Upcoming May 7 Iowa vs Northwestern | ",
 "Upcoming May 8 Iowa vs Northwestern | ",
 "Upcoming May 9 Iowa vs Northwestern | ",
 "Upcoming May 14, 6:35 PM Iowa vs Rutgers | ",
 "Upcoming May 15, 3:02 PM Iowa vs Rutgers | ",
 "Upcoming May 16, 12:02 PM Iowa vs Rutgers | ",
 "Upcoming May 20 Iowa at Michigan | ",
 "Upcoming May 21 Iowa at Michigan | ",
 "Upcoming May 22 Iowa at Michigan | "
]);
  const v_mbball=parse("Basketball","mbball");
  assert.deepEqual(v_mbball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Iowa vs Lipscomb | ",
 "Upcoming Nov 6, 7:30 PM Men's · Iowa vs Eastern Illinois | ",
 "Upcoming Nov 10, 6:00 PM Men's · Iowa vs Virginia Tech | ",
 "Upcoming Nov 15, 2:00 PM Men's · Iowa vs Creighton | ",
 "Upcoming Nov 20, 6:30 PM Men's · Iowa at Xavier | ",
 "Upcoming Nov 24, 6:00 PM Men's · Iowa vs UMBC | ",
 "Upcoming Nov 28, 1:00 PM Men's · Iowa vs Prairie View A&M | ",
 "Upcoming Dec 1, 6:00 PM Men's · Iowa at Purdue | ",
 "Upcoming Dec 7, 6:00 PM Men's · Iowa vs Indiana | ",
 "Upcoming Dec 10, 6:00 PM Men's · Iowa vs Iowa State | ",
 "Upcoming Dec 13, 5:00 PM Men's · Iowa vs Western Illinois | ",
 "Upcoming Dec 17, 8:00 PM Men's · Iowa vs Bethune-Cookman | ",
 "Upcoming Dec 21, 6:00 PM Men's · Iowa vs Alabama | ",
 "Upcoming Dec 29, 7:30 PM Men's · Iowa vs South Dakota | ",
 "Upcoming Jan 2, 11:00 AM Men's · Iowa vs Ohio State | ",
 "Upcoming Jan 6, 7:30 PM Men's · Iowa vs Wisconsin | ",
 "Upcoming Jan 9, 5:00 PM Men's · Iowa vs Maryland | ",
 "Upcoming Jan 12, 7:30 PM Men's · Iowa at Rutgers | ",
 "Upcoming Jan 16, 7:00 PM Men's · Iowa at Nebraska | ",
 "Upcoming Jan 23, 3:00 PM Men's · Iowa vs Penn State | ",
 "Upcoming Jan 26, 5:00 PM Men's · Iowa at Ohio State | ",
 "Upcoming Jan 30, 4:00 PM Men's · Iowa vs Nebraska | ",
 "Upcoming Feb 3, 9:30 PM Men's · Iowa at USC | ",
 "Upcoming Feb 6 Men's · Iowa at UCLA | ",
 "Upcoming Feb 10, 7:30 PM Men's · Iowa vs Oregon | ",
 "Upcoming Feb 13, 1:00 PM Men's · Iowa at Northwestern | ",
 "Upcoming Feb 16, 8:00 PM Men's · Iowa vs Michigan State | ",
 "Upcoming Feb 20, 12:00 PM Men's · Iowa at Michigan | ",
 "Upcoming Feb 24, 7:30 PM Men's · Iowa at Wisconsin | ",
 "Upcoming Feb 27, 1:00 PM Men's · Iowa vs Minnesota | ",
 "Upcoming Mar 2, 6:00 PM Men's · Iowa vs Washington | ",
 "Upcoming Mar 6, 7:00 PM Men's · Iowa at Illinois | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Oct 29, 7:00 PM Women's · Iowa vs Maryville (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Iowa vs Towson | ",
 "Upcoming Nov 5, 7:00 PM Women's · Iowa vs Eastern Illinois | ",
 "Upcoming Nov 8, 1:00 PM Women's · Iowa at UConn | ",
 "Upcoming Nov 12, 7:30 PM Women's · Iowa vs Northern Iowa | ",
 "Upcoming Nov 15, 12:00 PM Women's · Iowa vs Vanderbilt | ",
 "Upcoming Nov 19, 7:00 PM Women's · Iowa vs Montana State | ",
 "Upcoming Nov 23, 12:30 PM Women's · Iowa vs Utah | ",
 "Upcoming Nov 25, 10:00 AM Women's · Iowa vs Navy | ",
 "Upcoming Dec 1, 6:00 PM Women's · Iowa at Drake | ",
 "Upcoming Dec 5, 5:00 PM Women's · Iowa vs Nebraska | ",
 "Upcoming Dec 9, 7:00 PM Women's · Iowa vs Iowa State | ",
 "Upcoming Dec 13, 12:00 PM Women's · Iowa vs Southern | ",
 "Upcoming Dec 20, 7:30 PM Women's · Iowa vs Northern Illinois | ",
 "Upcoming Dec 29, 12:00 PM Women's · Iowa at Illinois | ",
 "Upcoming Jan 1, 1:00 PM Women's · Iowa at Michigan State | ",
 "Upcoming Jan 5, 7:00 PM Women's · Iowa vs Rutgers | ",
 "Upcoming Jan 9, 11:00 AM Women's · Iowa at Minnesota | ",
 "Upcoming Jan 14, 7:00 PM Women's · Iowa vs Northwestern | ",
 "Upcoming Jan 17, 5:00 PM Women's · Iowa vs Indiana | ",
 "Upcoming Jan 24, 5:00 PM Women's · Iowa at Oregon | ",
 "Upcoming Jan 27, 8:00 PM Women's · Iowa at Washington | ",
 "Upcoming Jan 31, 2:00 PM Women's · Iowa vs Wisconsin | ",
 "Upcoming Feb 4, 7:30 PM Women's · Iowa at Nebraska | ",
 "Upcoming Feb 7, 11:00 AM Women's · Iowa at Michigan | ",
 "Upcoming Feb 11, 6:00 PM Women's · Iowa vs USC | ",
 "Upcoming Feb 14, 1:00 PM Women's · Iowa vs UCLA | ",
 "Upcoming Feb 18, 5:00 PM Women's · Iowa at Penn State | ",
 "Upcoming Feb 21, 1:00 PM Women's · Iowa vs Purdue | ",
 "Upcoming Feb 25, 6:30 PM Women's · Iowa vs Maryland | ",
 "Upcoming Feb 28, 11:00 AM Women's · Iowa at Ohio State | "
]);
  const v_mcross=parse("Cross Country","mcross");
  assert.deepEqual(v_mcross.map(line),[
 "Final Sep 4 Men's · Iowa at Hawkeye Invitational | Completed",
 "Final Sep 18 Men's · Iowa at Redbird Invite | Completed",
 "Final Sep 25 Men's · Iowa at Gans Creek Classic | Completed",
 "Upcoming Oct 16, 1:30 PM Men's · Iowa at Bradley Pink Classic | ",
 "Upcoming Oct 30, 10:00 AM Men's · Iowa at Big Ten Championships | ",
 "Upcoming Nov 13, 10:00 AM Men's · Iowa at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Men's · Iowa at NCAA Championships | "
]);
  const v_wcross=parse("Cross Country","wcross");
  assert.deepEqual(v_wcross.map(line),[
 "Final Sep 4 Women's · Iowa at Hawkeye Invitational | Completed",
 "Final Sep 18 Women's · Iowa at Redbird Invite | Completed",
 "Final Sep 25 Women's · Iowa at Gans Creek Classic | Completed",
 "Upcoming Oct 16, 2:15 PM Women's · Iowa at Bradley Pink Classic | ",
 "Upcoming Oct 30, 10:00 AM Women's · Iowa at Big Ten Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Iowa at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Women's · Iowa at NCAA Championships | "
]);
  const v_fhockey=parse("Field Hockey","fhockey");
  assert.deepEqual(v_fhockey.map(line),[
 "Final Aug 28 Iowa at Wake Forest | W, 4-3",
 "Final Aug 30 Iowa vs North Carolina | W, 3-2",
 "Final Sep 4 Iowa vs Lehigh | W, 9-0",
 "Final Sep 6 Iowa vs Ball State | W, 8-0",
 "Final Sep 11 Iowa vs Miami of Ohio | W, 2-1",
 "Final Sep 13 Iowa vs Louisville | W, 4-2",
 "Final Sep 18 Iowa vs Indiana | L, 1-3",
 "Final Sep 20 Iowa vs Indiana | W, 2-1",
 "Final Sep 25 Iowa vs Ohio State | W, 4-1",
 "Final Sep 27 Iowa vs Ohio State | W, 3-2",
 "Final Oct 2 Iowa at Michigan | W, 2-1",
 "Final Oct 4 Iowa at Michigan State | W, 4-3",
 "Upcoming Oct 9, 3:00 PM Iowa at Northwestern | ",
 "Upcoming Oct 23, 3:00 PM Iowa vs Rutgers | ",
 "Upcoming Oct 25, 12:00 PM Iowa vs Penn State | ",
 "Upcoming Oct 30, 1:00 PM Iowa at Maryland | ",
 "Upcoming Nov 5 Iowa vs Big Ten Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Iowa vs Northern Illinois | W, 40-0",
 "Final Sep 12 Iowa vs Iowa State | W, 16-13",
 "Final Sep 19 Iowa vs UNI | W, 55-0",
 "Final Sep 26 Iowa at Michigan | W, 20-19",
 "Final Oct 3 Iowa vs Ohio State | L, 14-31",
 "Upcoming Oct 9, 8:00 PM Iowa at Washington | ",
 "Upcoming Oct 24 Iowa at Minnesota | ",
 "Upcoming Oct 31 Iowa vs Wisconsin | ",
 "Upcoming Nov 7 Iowa at Northwestern | ",
 "Upcoming Nov 14 Iowa vs Purdue | ",
 "Upcoming Nov 21 Iowa at Illinois | ",
 "Upcoming Nov 27, 11:00 AM Iowa vs Nebraska | "
]);
  const v_mgolf=parse("Golf","mgolf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 8 Men's · Iowa at ANF Fall Classic | 1st of 14",
 "Final Sep 13 Men's · Iowa at Inverness Intercollegiate | T6th of 18",
 "Final Sep 21 Men's · Iowa at Bluejay Invitational | Completed",
 "Final Oct 4 Men's · Iowa at Fighting Irish Classic | Completed",
 "Upcoming Oct 17 Men's · Iowa at Fallen Oak Collegiate | ",
 "Upcoming Oct 19 Men's · Iowa at Zach Johnson Invitational | "
]);
  const v_wgolf=parse("Golf","wgolf");
  assert.deepEqual(v_wgolf.map(line),[
 "Final Aug 31 Women's · Iowa at Boilermaker Classic | 11th",
 "Final Sep 13 Women's · Iowa at Badger Invitational | 4th",
 "Final Sep 28 Women's · Iowa at Diane Thomason Invitational | 1st",
 "Upcoming Oct 12 Women's · Iowa at Illinois Women's Invitational at Medinah | ",
 "Upcoming Oct 19 Women's · Iowa at Route 66 Invitational | ",
 "Upcoming Jan 30 Women's · Iowa at Purdue \"Tropical\" Classic | ",
 "Upcoming Feb 14 Women's · Iowa at Spartan Suncoast Challenge | ",
 "Upcoming Mar 14 Women's · Iowa at Mountain View Collegiate | ",
 "Upcoming Mar 19 Women's · Iowa at Hawkeye El Tigre Invitational | ",
 "Upcoming Apr 6 Women's · Iowa at Olde Stone Intercollegiate | ",
 "Upcoming Apr 23 Women's · Iowa at Big Ten Championships | "
]);
  const v_wgym=parse("Gymnastics","wgym");
  assert.deepEqual(v_wgym.map(line),[]);
  const v_wrow=parse("Rowing","wrow");
  assert.deepEqual(v_wrow.map(line),[
 "Upcoming Oct 9, 3:00 PM Iowa vs Indiana (Exhibition) | ",
 "Upcoming Oct 17 Iowa vs Drake | ",
 "Upcoming Nov 1 Iowa at Princeton Chase | ",
 "Upcoming Feb 26 Iowa at UCF | ",
 "Upcoming Mar 26 Iowa at Sarasota 2K | ",
 "Upcoming Apr 2 Iowa at Rocky Top Invite | ",
 "Upcoming Apr 17 Iowa at Big Ten Invitational | ",
 "Upcoming May 1 Iowa at Kansas Invite | ",
 "Upcoming May 15 Iowa at Big Ten Championships | "
]);
  const v_wsoc=parse("Soccer","wsoc");
  assert.deepEqual(v_wsoc.map(line),[
 "Final Aug 12 Iowa vs Milwaukee | W, 7-0",
 "Final Aug 15 Iowa vs Loyola Chicago | W, 5-0",
 "Final Aug 20 Iowa at Wake Forest | L, 0-2",
 "Final Aug 23 Iowa at UNC Greensboro | W, 5-1",
 "Final Aug 27 Iowa at Iowa State | W, 2-0",
 "Final Sep 3 Iowa vs Kansas State | T, 1-1",
 "Final Sep 6 Iowa vs Missouri State | W, 3-0",
 "Final Sep 10 Iowa at Minnesota | L, 0-1",
 "Final Sep 13 Iowa vs Nebraska | T, 0-0",
 "Final Sep 18 Iowa vs Illinois | T, 0-0",
 "Final Sep 24 Iowa at Penn State | T, 1-1",
 "Final Sep 27 Iowa at Ohio State | L, 1-3",
 "Final Oct 4 Iowa vs Rutgers | W, 1-0",
 "Today Oct 8, 9:00 PM Iowa at Washington | ",
 "Upcoming Oct 11, 3:00 PM Iowa at Oregon | ",
 "Upcoming Oct 16, 6:00 PM Iowa at Maryland | ",
 "Upcoming Oct 22, 7:00 PM Iowa vs UCLA | ",
 "Upcoming Oct 25, 1:00 PM Iowa vs USC | ",
 "Upcoming Oct 30, 7:00 PM Iowa vs Wisconsin | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 9, 6:00 PM Iowa vs Northern Iowa (Exhibition) | ",
 "Upcoming Oct 10, 12:00 PM Iowa vs Iowa State (Exhibition) | ",
 "Upcoming Oct 11, 2:00 PM Iowa vs Drake | ",
 "Upcoming Oct 17, 1:00 PM Iowa at Illinois State (Exhibition) | ",
 "Upcoming Oct 25, 2:00 PM Iowa at Missouri (Exhibition) | ",
 "Upcoming Mar 19 Iowa at UCLA | ",
 "Upcoming Mar 20 Iowa at UCLA | ",
 "Upcoming Mar 21 Iowa at UCLA | ",
 "Upcoming Mar 26, 6:00 PM Iowa vs Maryland | ",
 "Upcoming Mar 27, 1:00 PM Iowa vs Maryland | ",
 "Upcoming Mar 28 Iowa vs Maryland | ",
 "Upcoming Apr 2, 6:00 PM Iowa vs Nebraska | ",
 "Upcoming Apr 3, 1:00 PM Iowa vs Nebraska | ",
 "Upcoming Apr 4, 12:00 PM Iowa vs Nebraska | ",
 "Upcoming Apr 9 Iowa at Michigan | ",
 "Upcoming Apr 10 Iowa at Michigan | ",
 "Upcoming Apr 11 Iowa at Michigan | ",
 "Upcoming Apr 16, 6:00 PM Iowa vs Penn State | ",
 "Upcoming Apr 17, 1:00 PM Iowa vs Penn State | ",
 "Upcoming Apr 18, 12:00 PM Iowa vs Penn State | ",
 "Upcoming Apr 23 Iowa at Minnesota | ",
 "Upcoming Apr 24 Iowa at Minnesota | ",
 "Upcoming Apr 25 Iowa at Minnesota | ",
 "Upcoming Apr 30, 6:00 PM Iowa vs Michigan State | ",
 "Upcoming May 1, 1:00 PM Iowa vs Michigan State | ",
 "Upcoming May 2, 12:00 PM Iowa vs Michigan State | ",
 "Upcoming May 7 Iowa at Northwestern | ",
 "Upcoming May 8 Iowa at Northwestern | ",
 "Upcoming May 9 Iowa at Northwestern | "
]);
  const v_wswim=parse("Swimming & Diving","wswim");
  assert.deepEqual(v_wswim.map(line),[
 "Final Oct 2 Iowa vs Marquette | W, 189-70",
 "Upcoming Oct 10, 11:00 AM Iowa at Minnesota | ",
 "Upcoming Oct 23, 3:00 PM Iowa vs Purdue/UCLA | ",
 "Upcoming Nov 17 Iowa at Hawkeye Invitational | ",
 "Upcoming Jan 5, 2:00 PM Iowa at Miami | ",
 "Upcoming Jan 15, 5:00 PM Iowa vs Illinois/Nebraska (Diving Only) | ",
 "Upcoming Jan 15, 5:00 PM Iowa at Nebraska | ",
 "Upcoming Jan 30, 1:00 PM Iowa vs Iowa State | ",
 "Upcoming Feb 17 Iowa at Big Ten Championships | ",
 "Upcoming Mar 8 Iowa at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 Iowa at NCAA Championships | "
]);
  const v_wten=parse("Tennis","wten");
  assert.deepEqual(v_wten.map(line),[
 "Upcoming Oct 15 Iowa at ITA Regionals | ",
 "Upcoming Oct 23 Iowa at Rome Collegiate Invitational | ",
 "Upcoming Nov 5 Iowa at ITA Sectional Championships | ",
 "Upcoming Nov 17 Iowa at NCAA Individual Championships | ",
 "Upcoming Jan 18, 9:30 AM Iowa vs Butler | ",
 "Upcoming Jan 18, 1:30 PM Iowa vs Omaha | ",
 "Upcoming Jan 30, 11:00 AM Iowa at Notre Dame | ",
 "Upcoming Feb 7, 12:00 PM Iowa vs Memphis | ",
 "Upcoming Feb 12, 5:00 PM Iowa vs Kansas State | ",
 "Upcoming Feb 14, 12:00 PM Iowa vs Iowa State | ",
 "Upcoming Feb 19, 7:00 PM Iowa at Arizona | ",
 "Upcoming Feb 20, 2:00 PM Iowa at Arizona | ",
 "Upcoming Feb 27, 12:00 PM Iowa vs Minnesota | ",
 "Upcoming Mar 6, 12:00 PM Iowa vs Nebraska | ",
 "Upcoming Mar 12, 5:00 PM Iowa vs Michigan | ",
 "Upcoming Mar 14 Iowa vs Michigan State | ",
 "Upcoming Mar 19, 7:00 PM Iowa at Washington | ",
 "Upcoming Mar 21 Iowa at Oregon | ",
 "Upcoming Mar 26, 5:00 PM Iowa vs Rutgers | ",
 "Upcoming Mar 28, 10:00 AM Iowa vs Maryland | ",
 "Upcoming Apr 2, 5:00 PM Iowa at Ohio State | ",
 "Upcoming Apr 4 Iowa at Penn State | ",
 "Upcoming Apr 9, 5:00 PM Iowa vs Purdue | ",
 "Upcoming Apr 11 Iowa vs Indiana | ",
 "Upcoming Apr 16, 5:00 PM Iowa at Northwestern | ",
 "Upcoming Apr 18 Iowa at Illinois | ",
 "Upcoming Apr 22 Iowa at Big Ten Championships | "
]);
  const v_mtrack=parse("Track & Field","mtrack");
  assert.deepEqual(v_mtrack.map(line),[
 "Upcoming Dec 5 Men's · Iowa at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 11 Men's · Iowa at Jimmy Grant Alumni Invitational | ",
 "Upcoming Jan 15 Men's · Iowa at Arkansas Invitational | ",
 "Upcoming Jan 22 Men's · Iowa at Larry Wieczorek Invitational | ",
 "Upcoming Jan 29 Men's · Iowa at Meyo Invitational | ",
 "Upcoming Feb 5 Men's · Iowa at New Mexico Collegiate Classic | ",
 "Upcoming Feb 6 Men's · Iowa at Iowa State Classic | ",
 "Upcoming Feb 12 Men's · Iowa at Tyson Invitational | ",
 "Upcoming Feb 12 Men's · Iowa at BU David Hemery Valentine Invitational | ",
 "Upcoming Feb 12 Men's · Iowa at Jarvis Scott Open | ",
 "Upcoming Feb 19 Men's · Iowa at Iowa Open | ",
 "Upcoming Feb 19 Men's · Iowa at Matador Qualifier | ",
 "Upcoming Feb 19 Men's · Iowa at Arkansas Qualifier | ",
 "Upcoming Feb 20 Men's · Iowa at Alex Wilson Invitational | ",
 "Upcoming Feb 25 Men's · Iowa at Big Ten Indoor Championships | ",
 "Upcoming Mar 12 Men's · Iowa at NCAA Indoor Championships | "
]);
  const v_wtrack=parse("Track & Field","wtrack");
  assert.deepEqual(v_wtrack.map(line),[
 "Upcoming Dec 5 Women's · Iowa at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 11 Women's · Iowa at Jimmy Grant Alumni Invitational | ",
 "Upcoming Jan 15 Women's · Iowa at Arkansas Invitational | ",
 "Upcoming Jan 22 Women's · Iowa at Larry Wieczorek Invitational | ",
 "Upcoming Jan 29 Women's · Iowa at Meyo Invitational | ",
 "Upcoming Feb 5 Women's · Iowa at New Mexico Collegiate Classic | ",
 "Upcoming Feb 6 Women's · Iowa at Iowa State Classic | ",
 "Upcoming Feb 12 Women's · Iowa at Tyson Invitational | ",
 "Upcoming Feb 12 Women's · Iowa at BU David Hemery Valentine Invitational | ",
 "Upcoming Feb 12 Women's · Iowa at Jarvis Scott Open | ",
 "Upcoming Feb 19 Women's · Iowa at Iowa Open | ",
 "Upcoming Feb 19 Women's · Iowa at Matador Qualifier | ",
 "Upcoming Feb 19 Women's · Iowa at Arkansas Qualifier | ",
 "Upcoming Feb 20 Women's · Iowa at Alex Wilson Invitational | ",
 "Upcoming Feb 25 Women's · Iowa at Big Ten Indoor Championships | ",
 "Upcoming Mar 12 Women's · Iowa at NCAA Indoor Championships | "
]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 28 Iowa at Army | W, 3-0",
 "Final Aug 29 Iowa vs UAlbany | W, 3-1",
 "Final Aug 30 Iowa vs Sacred Heart | W, 3-0",
 "Final Sep 3 Iowa at Mississippi State | L, 1-3",
 "Final Sep 4 Iowa vs Alabama | L, 1-3",
 "Final Sep 8 Iowa at Iowa State | W, 3-0",
 "Final Sep 10 Iowa vs Southern Illinois | W, 3-1",
 "Final Sep 11 Iowa vs Incarnate Word | W, 3-1",
 "Final Sep 12 Iowa vs Missouri State | L, 1-3",
 "Final Sep 16 Iowa vs Drake | W, 3-0",
 "Final Sep 18 Iowa vs West Florida | W, 3-2",
 "Final Sep 19 Iowa vs Texas Tech | W, 3-1",
 "Final Sep 20 Iowa vs Central Arkansas | W, 3-0",
 "Final Sep 22 Iowa vs Milwaukee | W, 3-1",
 "Final Sep 25 Iowa vs Ohio State | L, 1-3",
 "Final Sep 26 Iowa vs Rutgers | W, 3-0",
 "Final Oct 1 Iowa at Maryland | L, 2-3",
 "Final Oct 3 Iowa at Penn State | L, 1-3",
 "Upcoming Oct 9, 6:00 PM Iowa at Michigan | ",
 "Upcoming Oct 11, 12:00 PM Iowa at Michigan State | ",
 "Upcoming Oct 15, 8:00 PM Iowa vs Purdue | ",
 "Upcoming Oct 18, 1:00 PM Iowa vs Wisconsin | ",
 "Upcoming Oct 22, 6:00 PM Iowa vs USC | ",
 "Upcoming Oct 24, 6:00 PM Iowa vs UCLA | ",
 "Upcoming Oct 30, 9:00 PM Iowa at Washington | ",
 "Upcoming Nov 1, 3:00 PM Iowa at Oregon | ",
 "Upcoming Nov 6, 6:00 PM Iowa at Indiana | ",
 "Upcoming Nov 8, 2:00 PM Iowa vs Minnesota | ",
 "Upcoming Nov 12, 7:00 PM Iowa at Northwestern | ",
 "Upcoming Nov 14 Iowa at Nebraska | ",
 "Upcoming Nov 17, 6:00 PM Iowa vs Illinois | ",
 "Upcoming Nov 20 Iowa vs Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 13 Men's · Iowa vs Bellarmine | ",
 "Upcoming Nov 22 Men's · Iowa vs Iowa State | ",
 "Upcoming Dec 4 Men's · Iowa at Pittsburgh | ",
 "Upcoming Dec 11, 7:00 PM Men's · Iowa at Northern Iowa | ",
 "Upcoming Jan 2 Men's · Iowa at Soldier Salute | ",
 "Upcoming Jan 10 Men's · Iowa vs Michigan State | ",
 "Upcoming Jan 15 Men's · Iowa at Illinois | ",
 "Upcoming Jan 22 Men's · Iowa vs Northwestern | ",
 "Upcoming Jan 24 Men's · Iowa vs Ohio State | ",
 "Upcoming Jan 30 Men's · Iowa at Wisconsin | ",
 "Upcoming Feb 5 Men's · Iowa at Penn State | ",
 "Upcoming Feb 7 Men's · Iowa at Rutgers | ",
 "Upcoming Feb 12 Men's · Iowa vs Nebraska | ",
 "Upcoming Feb 21 Men's · Iowa vs Oklahoma State | ",
 "Upcoming Mar 6 Men's · Iowa at Big Ten Championships | ",
 "Upcoming Mar 18, 7:00 AM Men's · Iowa at NCAA Championships | "
]);
  const v_womenswrestling=parse("Wrestling","womens-wrestling");
  assert.deepEqual(v_womenswrestling.map(line),[
 "Upcoming Nov 1 Women's · Iowa at Luther Hill Open | ",
 "Upcoming Nov 7 Women's · Iowa at Yorktown Duals | ",
 "Upcoming Nov 13 Women's · Iowa at Missouri Valley Open | ",
 "Upcoming Nov 22 Women's · Iowa vs King University | ",
 "Upcoming Dec 10 Women's · Iowa at Wartburg | ",
 "Upcoming Dec 13 Women's · Iowa at North Central Open | ",
 "Upcoming Jan 8 Women's · Iowa at NWCA National Duals | ",
 "Upcoming Jan 15 Women's · Iowa vs Quincy | ",
 "Upcoming Jan 16 Women's · Iowa at CK Mike Duroe Invitational | ",
 "Upcoming Jan 23, 9:00 AM Women's · Iowa at For Her Dual Tournament | ",
 "Upcoming Jan 29 Women's · Iowa at Indiana Tech Warrior Open | ",
 "Upcoming Jan 30 Women's · Iowa at Lehigh | ",
 "Upcoming Jan 30 Women's · Iowa at Western New Eng. | ",
 "Upcoming Feb 6 Women's · Iowa at Grand View Open | ",
 "Upcoming Feb 19 Women's · Iowa at NCAA Regional Championships | ",
 "Upcoming Mar 5 Women's · Iowa at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mbball,"Basketball mbball");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_mcross,"Cross Country mcross");
  ownRecapsOnly(v_wcross,"Cross Country wcross");
  ownRecapsOnly(v_fhockey,"Field Hockey fhockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mgolf,"Golf mgolf");
  ownRecapsOnly(v_wgolf,"Golf wgolf");
  ownRecapsOnly(v_wgym,"Gymnastics wgym");
  ownRecapsOnly(v_wrow,"Rowing wrow");
  ownRecapsOnly(v_wsoc,"Soccer wsoc");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_wswim,"Swimming & Diving wswim");
  ownRecapsOnly(v_wten,"Tennis wten");
  ownRecapsOnly(v_mtrack,"Track & Field mtrack");
  ownRecapsOnly(v_wtrack,"Track & Field wtrack");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
  ownRecapsOnly(v_womenswrestling,"Wrestling womens-wrestling");
}
// END generated

// Iowa's cards (Vanderbilt's reader): the heading holds the divider and the
// opponent; a promotion follows it ("Home Opener", "Pink Out"; a link for
// "Dual in the Dome") and an exhibition tag; neither is part of the name.
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();
const published=slug=>{const raw=fixture(`${slug}-schedule.html.gz`).replace(/ data-v-\w+/g,''),stat=label=>(raw.match(new RegExp(`schedule-statistics-item__label[^>]*>${label}</strong><span class="schedule-statistics-item__value">([^<]*)`))||[])[1];return[stat('Overall'),stat('Conf\\.')];};
{
  assert.deepEqual(parse('Soccer','wsoc').slice(0,2).map(e=>e.title),['Iowa vs Milwaukee','Iowa vs Loyola Chicago']);
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Iowa vs Northern Illinois","W, 40-0"],["Iowa vs Iowa State","W, 16-13"],["Iowa vs UNI","W, 55-0"],["Iowa at Michigan","W, 20-19"],["Iowa vs Ohio State","L, 14-31"]]);
  assert.deepEqual(parse('Baseball','baseball').filter(e=>e.status==='Final').map(e=>e.opponent),["Madison College (Exhibition)","Missouri (Exhibition)","Kirkwood Community College (Exhibition)"]);
  // A home double dual names its opponents in the promotion.
  assert.deepEqual(parse('Swimming & Diving','wswim').filter(e=>/\//.test(e.opponent)).map(e=>e.title),["Iowa vs Purdue/UCLA","Iowa vs Illinois/Nebraska (Diving Only)"]);
  // Events read "at": wrestling's Soldier Salute, tennis's ITA Regionals.
  assert.deepEqual(parse('Wrestling','wrestling').find(e=>/Salute/.test(e.opponent)).title,"Men's · Iowa at Soldier Salute");
  assert.deepEqual(parse('Wrestling','wrestling').find(e=>e.start_time.startsWith('2026-12-1')&&/Northern Iowa/.test(e.opponent)).title,"Men's · Iowa at Northern Iowa");
  assert.deepEqual(parse('Tennis','wten')[0].title,"Iowa at ITA Regionals");
  // The records the schedule pages publish (Overall, Conf.).
  // The records the schedule pages publish (Overall, Conf.): soccer and field
  // hockey (whose second game against a weekend's opponent is not a
  // conference game) agree; football's page gives Conf. 1-0 without the Oct 3
  // Ohio State loss and volleyball's 0-0 (not filled in): both count every
  // regular-season Big Ten final.
  for(const [sport,slug] of [['Soccer','wsoc'],['Field Hockey','fhockey']])assert.deepEqual(records(sport,slug),published(slug),`${sport}: the computed records are the official ones`);
  for(const [sport,slug] of [['Football','football'],['Volleyball','wvball']])assert.equal(records(sport,slug)[0],published(slug)[0],`${sport}: the overall record is the official one`);
  assert.deepEqual([records('Football','football'),records('Volleyball','wvball')],[["4-1","1-1"],["12-6","1-3"]]);
  assert.deepEqual([['Football','football'],['Volleyball','wvball'],['Soccer','wsoc'],['Field Hockey','fhockey']].map(([,slug])=>published(slug)),[["4-1","1-0"],["12-6","0-0"],["6-3-4","1-2-3"],["11-1","3-1"]]);
}
// Golf: the card's place ("1st/14 teams", "t6th/18 teams"; women's "4th /
// 878 Strokes": the place and the team score).
{
  assert.deepEqual(iowaGolfCardPlace('t6th/18 teams'),{headline:'T6th of 18',results:[{label:'Result',value:'T6th of 18'}]});
  assert.deepEqual(iowaGolfCardPlace('4th / 878 Strokes'),{headline:'4th',results:[{label:'Result',value:'4th'},{label:'Team score',value:'878'}]});
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value}`).join(' / ')]);
  assert.deepEqual(final('mgolf'),[["ANF Fall Classic","1st of 14","Result: 1st of 14"],["Inverness Intercollegiate","T6th of 18","Result: T6th of 18"],["Bluejay Invitational","Completed","Result: Completed"],["Fighting Irish Classic","Completed","Result: Completed"]]);
  assert.deepEqual(final('wgolf'),[["Boilermaker Classic","11th","Result: 11th / Team score: 912"],["Badger Invitational","4th","Result: 4th / Team score: 878"],["Diane Thomason Invitational","1st","Result: 1st / Team score: 878"]]);
  // A tournament whose card links no story takes the sport's news-list story
  // whose headline names it; the team's place is in its text when the
  // headline is a player's.
  assert.deepEqual(iowaGolfStoryPlace('As a team, Iowa finished 14th in the tournament with an 888 (304-291-293).'),{place:'14th',score:'888'});
  assert.equal(iowaGolfStoryPlace('Gudgel finished tied for fifth.'),null);
  recapFixtures.set('https://hawkeyesports.com/sports/mgolf/news',fixture('mgolf-news.html.gz'));
  for(const name of ['2026-10-5-gudgel-finishes-5th-at-fighting-irish-classic','2026-10-5-gudgel-in-top-10-through-36-holes-in-south-bend']){
    const [y,m,d,...slug]=name.split('-');for(const day of [d,d.padStart(2,'0')])recapFixtures.set(`https://hawkeyesports.com/news/${y}/${m}/${day}/${slug.join('-')}`,fixture(`archive-${name}.html.gz`));
  }
  const events=parse('Golf','mgolf'),irish=events.find(e=>e.opponent==='Fighting Irish Classic');
  const listed=await worker.schoolModule('iowa').feed(events,'Golf');
  assert.ok(listed.includes(irish));
  assert.deepEqual([irish.recap_url,irish.headline,irish.results],["https://hawkeyesports.com/news/2026/10/5/gudgel-finishes-5th-at-fighting-irish-classic","14th",[{"label":"Result","value":"14th"},{"label":"Team score","value":"888"}]]);
  recapFixtures.clear();requests.length=0;
}
// Cross country from TFRRS: the meet page holds both races; each team's event
// keeps its own.
{
  recapFixtures.set('https://www.tfrrs.org/teams/xc/IA_college_f_Iowa.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/IA_college_m_Iowa.html',fixture('tfrrs-team-m.html.gz'));
  for(const page of [fixture('tfrrs-team-f.html.gz'),fixture('tfrrs-team-m.html.gz')])for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{const body=fixture(`tfrrs-${meet}.html.gz`),url=new URL(href,'https://www.tfrrs.org').href;recapFixtures.set(url,body);recapFixtures.set(url.replace(/\/?$/,'/'),body);}catch{}
  const read=async slug=>{const xc=parse('Cross Country',slug).filter(e=>e.status==='Final');for(const meet of xc)await worker.iowaHandlers.attachMeetResults(meet);return xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified),[...new Set(e.results.map(r=>r.group.split(' ')[0]))].join()]);};
  assert.deepEqual(await read('wcross'),[["Hawkeye Invitational","Women's team: 1st · 26 pts",true,"Women's"],["Redbird Invite","Women's team: 2nd · 45 pts",true,"Women's"],["Gans Creek Classic","Women's team: 25th · 599 pts",true,"Women's"]]);
  assert.deepEqual(await read('mcross'),[["Hawkeye Invitational","Men's team: 1st · 25 pts",true,"Men's"],["Redbird Invite","Men's team: 2nd · 46 pts",true,"Men's"],["Gans Creek Classic","Men's team: 24th · 592 pts",true,"Men's"]]);
  recapFixtures.clear();requests.length=0;
}
// A card's own story may name the opponent by its first word ("Miami (OH)"
// for "Miami of Ohio"); another story's headline score must be the game's
// (the Sep 18 "Fall to Indiana 3-1" story is not the Sep 20 2-1 game's).
{
  const hockey=parse('Field Hockey','fhockey'),[first,second]=hockey.filter(e=>e.opponent==='Indiana');
  assert.equal(worker.iowaHandlers.matchesRecap(fixture(recapFile(first.recap_url)),second,first.recap_url),false);
  const miami=hockey.find(e=>e.opponent==='Miami of Ohio');
  assert.equal(worker.iowaHandlers.matchesRecap(fixture(recapFile(miami.recap_url)),miami,miami.recap_url),true);
}
// Live: ESPN joins the official card for Iowa's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Iowa vs Ohio State","Final","L, 14-31"]]);
  live('Volleyball','volleyball-espn-2026-10-03.json.gz',parse('Volleyball','wvball'),new Date('2026-10-04T12:00:00Z'),[["Iowa at Penn State","Final","L, 1-3"]]);
  live('Soccer','soccer-espn-2026-10-04.json.gz',parse('Soccer','wsoc'),new Date('2026-10-05T12:00:00Z'),[["Iowa vs Rutgers","Final","W, 1-0"]]);
}
// Other schools and other hosts never reach the Iowa reader.
assert.equal(worker.iowaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://hawkeyesports.com/',now),null);
assert.equal(worker.iowaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='iowa-state'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Iowa module checks passed');
