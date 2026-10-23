import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northernIllinoisSchool} from '../src/schools/northern-illinois.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='northern-illinois');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northernIllinoisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/northern-illinois-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit niuhuskies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['northern-illinois'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',northernIllinoisSchool.scheduleUrls],['roster',northernIllinoisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('northern-illinois|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'niuhuskies.com',`${key} must stay on niuhuskies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://niuhuskies.com/sports/baseball/schedule"],"roster":["https://niuhuskies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://niuhuskies.com/sports/mens-basketball/schedule","https://niuhuskies.com/sports/womens-basketball/schedule"],"roster":["https://niuhuskies.com/sports/mens-basketball/roster","https://niuhuskies.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://niuhuskies.com/sports/womens-cross-country/schedule"],"roster":["https://niuhuskies.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://niuhuskies.com/sports/football/schedule"],"roster":["https://niuhuskies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://niuhuskies.com/sports/womens-golf/schedule","https://niuhuskies.com/sports/mens-golf/schedule"],"roster":["https://niuhuskies.com/sports/womens-golf/roster","https://niuhuskies.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://niuhuskies.com/sports/womens-gymnastics/schedule"],"roster":["https://niuhuskies.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://niuhuskies.com/sports/womens-soccer/schedule","https://niuhuskies.com/sports/mens-soccer/schedule"],"roster":["https://niuhuskies.com/sports/womens-soccer/roster","https://niuhuskies.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://niuhuskies.com/sports/softball/schedule"],"roster":["https://niuhuskies.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://niuhuskies.com/sports/womens-tennis/schedule","https://niuhuskies.com/sports/mens-tennis/schedule"],"roster":["https://niuhuskies.com/sports/womens-tennis/roster","https://niuhuskies.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://niuhuskies.com/sports/womens-track-and-field/schedule"],"roster":["https://niuhuskies.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://niuhuskies.com/sports/womens-volleyball/schedule"],"roster":["https://niuhuskies.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://niuhuskies.com/sports/wrestling/schedule"],"roster":["https://niuhuskies.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'northern-illinois|"+sport+"':"),`${sport} routes must live in the Northern Illinois module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://niuhuskies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northernIllinoisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=northern-illinois)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · NIU vs Northern Michigan (Exhibition) | W, 78-43",
 "Upcoming Oct 25, 11:00 AM Men's · NIU at Toledo (Exhibition) | ",
 "Upcoming Nov 2, 2:00 AM Men's · NIU vs Grambling | ",
 "Upcoming Nov 5 Men's · NIU at Tulsa | ",
 "Upcoming Nov 7, 6:00 PM Men's · NIU at Dayton | ",
 "Upcoming Nov 11, 6:00 PM Men's · NIU vs Clarke | ",
 "Upcoming Nov 14, 1:00 PM Men's · NIU at Bellarmine | ",
 "Upcoming Nov 18, 6:30 PM Men's · NIU at Marquette | ",
 "Upcoming Nov 21, 1:00 PM Men's · NIU at Bowling Green | ",
 "Upcoming Nov 25, 6:00 PM Men's · NIU at SIUE | ",
 "Upcoming Nov 28, 2:00 PM Men's · NIU at Eastern Illinois | ",
 "Upcoming Dec 3, 6:30 PM Men's · NIU at Green Bay | ",
 "Upcoming Dec 5, 2:00 PM Men's · NIU vs Milwaukee | ",
 "Upcoming Dec 12, 1:00 PM Men's · NIU at Lindenwood | ",
 "Upcoming Dec 19, 2:00 PM Men's · NIU vs Eastern Illinois | ",
 "Upcoming Dec 21, 8:00 PM Men's · NIU at Arizona | ",
 "Upcoming Dec 30, 3:00 PM Men's · NIU at Youngstown State | ",
 "Upcoming Jan 3, 1:00 PM Men's · NIU at Robert Morris | ",
 "Upcoming Jan 7, 8:00 PM Men's · NIU vs Cleveland State | ",
 "Upcoming Jan 9, 2:00 PM Men's · NIU vs Wright State | ",
 "Upcoming Jan 14, 6:00 PM Men's · NIU at Detroit Mercy | ",
 "Upcoming Jan 17, 2:00 PM Men's · NIU vs Green Bay | ",
 "Upcoming Jan 21, 6:00 PM Men's · NIU at Northern Kentucky | ",
 "Upcoming Jan 23, 1:00 PM Men's · NIU at Wright State | ",
 "Upcoming Jan 27, 6:00 PM Men's · NIU vs Oakland | ",
 "Upcoming Jan 30, 3:00 PM Men's · NIU at Milwaukee | ",
 "Upcoming Feb 4, 5:30 PM Men's · NIU at IU Indy | ",
 "Upcoming Feb 7, 2:00 PM Men's · NIU vs Northern Kentucky | ",
 "Upcoming Feb 10, 6:00 PM Men's · NIU vs Youngstown State | ",
 "Upcoming Feb 13, 1:00 PM Men's · NIU at Purdue Fort Wayne | ",
 "Upcoming Feb 17, 6:00 PM Men's · NIU vs Detroit Mercy | ",
 "Upcoming Feb 21, 2:00 PM Men's · NIU vs Robert Morris | ",
 "Upcoming Feb 24, 6:00 PM Men's · NIU at Cleveland State | ",
 "Upcoming Feb 27, 4:30 PM Men's · NIU vs IU Indy | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · NIU vs Indiana State | ",
 "Upcoming Nov 6, 6:00 PM Women's · NIU at Bradley | ",
 "Upcoming Nov 11, 6:00 PM Women's · NIU at DePaul | ",
 "Upcoming Nov 17, 6:00 PM Women's · NIU vs SIUE | ",
 "Upcoming Nov 21, 1:00 PM Women's · NIU at Northwestern | ",
 "Upcoming Nov 24, 6:00 PM Women's · NIU vs Roosevelt | ",
 "Upcoming Nov 27, 12:30 PM Women's · NIU vs Manhattan | ",
 "Upcoming Nov 29 Women's · NIU vs FIU/North Dakota | ",
 "Upcoming Dec 3, 6:00 PM Women's · NIU vs Oakland | ",
 "Upcoming Dec 6, 1:00 PM Women's · NIU at Cleveland State | ",
 "Upcoming Dec 12, 1:00 PM Women's · NIU at Western Illinois | ",
 "Upcoming Dec 15, 6:00 PM Women's · NIU vs UIC | ",
 "Upcoming Dec 18, 6:00 PM Women's · NIU vs Omaha | ",
 "Upcoming Dec 20, 7:30 PM Women's · NIU at Iowa | ",
 "Upcoming Dec 31, 1:00 PM Women's · NIU at Youngstown State | ",
 "Upcoming Jan 2, 3:00 PM Women's · NIU at Robert Morris | ",
 "Upcoming Jan 7, 5:30 PM Women's · NIU vs Northern Kentucky | ",
 "Upcoming Jan 10, 2:00 PM Women's · NIU vs Purdue Fort Wayne | ",
 "Upcoming Jan 13, 6:00 PM Women's · NIU vs Wright State | ",
 "Upcoming Jan 16, 1:00 PM Women's · NIU at IU Indy | ",
 "Upcoming Jan 21, 11:00 AM Women's · NIU at Milwaukee | ",
 "Upcoming Jan 24, 2:00 PM Women's · NIU vs Cleveland State | ",
 "Upcoming Jan 28, 6:00 PM Women's · NIU vs Youngstown State | ",
 "Upcoming Jan 31, 1:00 PM Women's · NIU at Green Bay | ",
 "Upcoming Feb 3, 11:00 AM Women's · NIU vs Detroit Mercy | ",
 "Upcoming Feb 6, 1:00 PM Women's · NIU at Purdue Fort Wayne | ",
 "Upcoming Feb 10, 5:00 PM Women's · NIU at Northern Kentucky | ",
 "Upcoming Feb 13, 2:00 PM Women's · NIU vs Robert Morris | ",
 "Upcoming Feb 17, 6:00 PM Women's · NIU at Detroit Mercy | ",
 "Upcoming Feb 20, 2:00 PM Women's · NIU at Oakland | ",
 "Upcoming Feb 25, 6:00 PM Women's · NIU vs Green Bay | ",
 "Upcoming Feb 27, 2:00 PM Women's · NIU vs Milwaukee | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 NIU at Huskie Classic | 1st (40 Points)",
 "Final Sep 18 NIU at Redbird Invite | 3rd (64 Points)",
 "Final Oct 2 NIU at Joe Piane Invite | 6th (269 Points)",
 "Final Oct 16 NIU at Bradley Pink Classic | 18th (482 Points)",
 "Upcoming Oct 31 NIU at Horizon League Championship | ",
 "Upcoming Nov 14 NIU at NCAA Midwest Regional | ",
 "Upcoming Nov 21 NIU at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 NIU at Iowa | L, 0-40",
 "Final Sep 12 NIU vs Illinois State | L, 24-28",
 "Final Sep 19 NIU at Arizona | L, 17-42",
 "Final Sep 26 NIU at Georgia State | L, 14-35",
 "Final Oct 10 NIU vs Air Force | L, 7-28",
 "Final Oct 17 NIU at Wyoming | L, 23-41",
 "Upcoming Oct 24, 2:30 PM NIU vs Hawai'i | ",
 "Upcoming Oct 31, 9:30 PM NIU at UNLV | ",
 "Upcoming Nov 7, 3:00 PM NIU at San José State | ",
 "Upcoming Nov 14, 2:30 PM NIU vs Nevada | ",
 "Upcoming Nov 21, 3:00 PM NIU at North Dakota State | ",
 "Upcoming Nov 28, 2:30 PM NIU vs UTEP | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · NIU at Redbird Invitational | 7th of 13",
 "Final Sep 20 Women's · NIU at Mary Fossum Invitational | 15th of 15",
 "Final Sep 28 Women's · NIU at Diane Thomason Invitational | 9th of 13",
 "Final Oct 18 Women's · NIU at Jim West Challenge | 11th of 11",
 "Upcoming Feb 1 Women's · NIU at Central Florida | ",
 "Upcoming Feb 14 Women's · NIU at Spartan Suncoast College Invite | ",
 "Upcoming Mar 2 Women's · NIU at GCU Invitational | ",
 "Upcoming Mar 15 Women's · NIU at Jackrabbit Invitational | ",
 "Upcoming Mar 22 Women's · NIU at Kennesaw Invite | ",
 "Upcoming Apr 5 Women's · NIU at Brickyard Collegiate | ",
 "Upcoming Apr 24 Women's · NIU at Horizon League Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · NIU at Virtues Intercollegiate | 4th of 12",
 "Final Sep 13 Men's · NIU at Canadian Collegiate | 11th of 13",
 "Final Sep 21 Men's · NIU at Rod Myers Invitational | T7th of 13",
 "Final Sep 27 Men's · NIU at Badger Invitational | 6th of 19",
 "Final Oct 12 Men's · NIU at Purdue Fall Invitational | 5th of 13",
 "Final Oct 18 Men's · NIU at Quail Valley Collegiate Invitational | 13th of 15",
 "Upcoming Feb 11 Men's · NIU at John A. Burns Intercollegiate | ",
 "Upcoming Mar 15 Men's · NIU at Tiger Invitational | ",
 "Upcoming Mar 22 Men's · NIU at Bridgestone Collegiate Invitational | ",
 "Upcoming Apr 9 Men's · NIU at Robert Kepler Intercollegiate | ",
 "Upcoming Apr 18 Men's · NIU at Hawkeye Invitational | ",
 "Upcoming Apr 24 Men's · NIU at Horizon League Championship | ",
 "Upcoming May 17 Men's · NIU at NCAA Regionals | ",
 "Upcoming May 28 Men's · NIU at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Dec 19, 6:00 PM NIU at Red-Black Exhibition | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · NIU at Illinois State | L, 1-2",
 "Final Aug 16 Women's · NIU at DePaul | T, 2-2",
 "Final Aug 23 Women's · NIU vs Northern Iowa | W, 3-0",
 "Final Aug 27 Women's · NIU at Missouri | L, 0-4",
 "Final Aug 30 Women's · NIU at Marquette | T, 0-0",
 "Final Sep 10 Women's · NIU vs Loyola Chicago | L, 0-1",
 "Final Sep 19 Women's · NIU vs Green Bay | L, 0-1",
 "Final Sep 24 Women's · NIU vs Northern Kentucky | L, 0-1",
 "Final Sep 27 Women's · NIU vs Wright State | W, 1-0",
 "Final Oct 1 Women's · NIU at Purdue Fort Wayne | T, 0-0",
 "Final Oct 4 Women's · NIU at Cleveland State | W, 3-2",
 "Final Oct 10 Women's · NIU at Milwaukee | L, 1-3",
 "Final Oct 15 Women's · NIU vs Detroit Mercy | L, 0-2",
 "Final Oct 18 Women's · NIU vs Oakland | W, 3-0",
 "Final Oct 22 Women's · NIU at Youngstown State | T, 1-1",
 "Upcoming Oct 25, 12:00 PM Women's · NIU at Robert Morris | ",
 "Upcoming Oct 30, 1:00 PM Women's · NIU at IU Indy | ",
 "Upcoming Nov 7 Women's · NIU at Horizon League Tournament Quarterfinals | ",
 "Upcoming Nov 11 Women's · NIU at Horizon League Tournament Semifinals | ",
 "Upcoming Nov 14 Women's · NIU at Horizon League Tournament Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · NIU at Butler | W, 2-0",
 "Final Aug 23 Men's · NIU at Loyola Chicago | L, 1-3",
 "Final Aug 27 Men's · NIU vs Marquette | L, 2-4",
 "Final Aug 30 Men's · NIU vs UIC | W, 2-1",
 "Final Sep 5 Men's · NIU at Eastern Illinois | W, 2-1",
 "Final Sep 9 Men's · NIU vs IU Indy | W, 2-0",
 "Final Sep 12 Men's · NIU at Oakland | T, 1-1",
 "Final Sep 19 Men's · NIU vs Milwaukee | L, 1-2",
 "Final Sep 26 Men's · NIU at Wright State | W, 2-1",
 "Final Oct 3 Men's · NIU vs Northern Kentucky | W, 3-0",
 "Final Oct 7 Men's · NIU vs Detroit Mercy | T, 2-2",
 "Final Oct 10 Men's · NIU at Green Bay | W, 3-2",
 "Final Oct 17 Men's · NIU at Tulsa | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Men's · NIU vs Cleveland State | ",
 "Upcoming Oct 30, 6:00 PM Men's · NIU at Purdue Fort Wayne | ",
 "Upcoming Nov 3, 1:00 PM Men's · NIU at Robert Morris | ",
 "Upcoming Nov 8 Men's · NIU at Horizon League Tournament Quarterfinals | ",
 "Upcoming Nov 11 Men's · NIU at Horizon League Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · NIU at Horizon League Tournament Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · NIU at Minnesota Gopher Invitational | Completed",
 "Final Oct 2 Women's · NIU at Horizon League Fall Championship | Completed",
 "Final Oct 8 Women's · NIU at ITA Midwest Regionals | Completed",
 "Final Oct 16 Women's · NIU at Marquette Invitational | Completed",
 "Upcoming Oct 30 Women's · NIU at NIU Huskie Indoor Invitational | ",
 "Upcoming Nov 5 Women's · NIU at ITA Conference Masters | ",
 "Upcoming Jan 18, 2:00 PM Women's · NIU at Wisconsin | ",
 "Upcoming Jan 22, 11:00 AM Women's · NIU at Chicago State | ",
 "Upcoming Jan 23, 10:30 AM Women's · NIU vs Valparaiso | ",
 "Upcoming Jan 23, 4:00 PM Women's · NIU vs Bradley | ",
 "Upcoming Jan 29, 12:00 PM Women's · NIU vs DePaul | ",
 "Upcoming Jan 30, 4:00 PM Women's · NIU at Northwestern | ",
 "Upcoming Feb 5, 9:00 AM Women's · NIU at Sioux Falls (S.D.) | ",
 "Upcoming Feb 5, 12:00 PM Women's · NIU vs South Dakota | ",
 "Upcoming Feb 7, 3:00 PM Women's · NIU at Minnesota | ",
 "Upcoming Feb 12, 1:00 PM Women's · NIU vs Illinois State | ",
 "Upcoming Feb 12, 6:00 PM Women's · NIU vs Purdue University Northwest | ",
 "Upcoming Feb 19, 10:00 AM Women's · NIU vs Northern Iowa | ",
 "Upcoming Feb 19, 3:00 PM Women's · NIU vs Western Illinois | ",
 "Upcoming Mar 6, 5:00 PM Women's · NIU at UIC | ",
 "Upcoming Mar 14, 2:00 PM Women's · NIU at Marquette | ",
 "Upcoming Mar 18, 2:00 PM Women's · NIU vs Seton Hall | ",
 "Upcoming Mar 21, 1:30 PM Women's · NIU at Butler | ",
 "Upcoming Apr 4, 11:00 AM Women's · NIU vs Oakland | ",
 "Upcoming Apr 8, 3:00 PM Women's · NIU vs Mercyhurst | ",
 "Upcoming Apr 10, 11:00 AM Women's · NIU at Cleveland State | ",
 "Upcoming Apr 11, 11:00 AM Women's · NIU at Youngstown State | ",
 "Upcoming Apr 17, 11:00 AM Women's · NIU at Milwaukee | ",
 "Upcoming Apr 24, 10:00 AM Women's · NIU vs IU Indy | ",
 "Upcoming Apr 25, 11:00 AM Women's · NIU vs Northern Kentucky | ",
 "Upcoming Apr 30 Women's · NIU at Horizon League Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 10 Men's · NIU at Milwaukee Tennis Classic | Completed",
 "Final Sep 18 Men's · NIU at River Forest Collegiate Invitational | Completed",
 "Final Sep 25 Men's · NIU at Horizon League Fall Championship | Completed",
 "Final Oct 14 Men's · NIU at ITA Regional Championship | Completed",
 "Upcoming Nov 5 Men's · NIU at ITA Conference Masters | ",
 "Upcoming Jan 24 Men's · NIU at Wisconsin | ",
 "Upcoming Jan 30, 11:00 AM Men's · NIU vs Marquette | ",
 "Upcoming Jan 31 Men's · NIU vs Chicago State | ",
 "Upcoming Feb 5 Men's · NIU vs UIC | ",
 "Upcoming Feb 6 Men's · NIU vs Roosevelt | ",
 "Upcoming Feb 6 Men's · NIU vs Washington University in St. Louis | ",
 "Upcoming Feb 12, 12:00 PM Men's · NIU vs Wisconsin-Whitewater | ",
 "Upcoming Feb 26 Men's · NIU at Nebraska at Omaha | ",
 "Upcoming Feb 28 Men's · NIU at Drake | ",
 "Upcoming Mar 6 Men's · NIU vs Grinnell College | ",
 "Upcoming Mar 6 Men's · NIU vs Missouri Baptist | ",
 "Upcoming Mar 26, 2:00 PM Men's · NIU vs North Central College | ",
 "Upcoming Mar 27, 11:00 AM Men's · NIU vs Maharishi International | ",
 "Upcoming Apr 2, 1:00 PM Men's · NIU at Youngstown State | ",
 "Upcoming Apr 4, 11:00 AM Men's · NIU at Cleveland State | ",
 "Upcoming Apr 10, 11:00 AM Men's · NIU at IU Indy | ",
 "Upcoming Apr 11 Men's · NIU at Notre Dame | ",
 "Upcoming Apr 16 Men's · NIU vs Youngstown State | ",
 "Upcoming Apr 18, 11:00 AM Men's · NIU vs Cleveland State | ",
 "Upcoming Apr 23, 2:00 PM Men's · NIU vs Dayton | ",
 "Upcoming Apr 24 Men's · NIU vs IU Indy | ",
 "Upcoming Apr 30 Men's · NIU at Horizon League Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 NIU at Blue & Gold Invitational | ",
 "Upcoming Jan 16 NIU at EIU John Craft Invite | ",
 "Upcoming Jan 22 NIU at Cyclone Open | ",
 "Upcoming Jan 29 NIU at Meyo Invitational | ",
 "Upcoming Feb 12 NIU at Blue Demon Alumni Classic | ",
 "Upcoming Feb 19 NIU at Iowa Open | ",
 "Upcoming Feb 27 NIU at Horizon League Indoor Championships | ",
 "Upcoming Mar 12 NIU at NCAA Indoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 NIU vs Eastern Michigan | L, 2-3",
 "Final Aug 28 NIU vs Murray State | W, 3-0",
 "Final Aug 29 NIU at Southern Indiana | L, 0-3",
 "Final Sep 4 NIU vs Murray State | L, 0-3",
 "Final Sep 4 NIU vs Portland State | W, 3-1",
 "Final Sep 5 NIU vs Lindenwood | L, 0-3",
 "Final Sep 11 NIU vs Chicago State | W, 3-0",
 "Final Sep 11 NIU vs Arkansas - Pine Bluff | W, 3-0",
 "Final Sep 12 NIU at SIUE | W, 3-0",
 "Final Sep 18 NIU vs UIC | W, 3-0",
 "Final Sep 25 NIU at Wright State | L, 0-3",
 "Final Sep 26 NIU at Wright State | L, 0-3",
 "Final Oct 1 NIU at Milwaukee | W, 3-2",
 "Final Oct 2 NIU vs Green Bay | L, 1-3",
 "Final Oct 9 NIU vs Northern Kentucky | L, 1-3",
 "Final Oct 10 NIU vs Northern Kentucky | L, 0-3",
 "Final Oct 15 NIU vs Milwaukee | L, 0-3",
 "Final Oct 16 NIU at Green Bay | L, 1-3",
 "Today Oct 23, 5:00 PM NIU at Youngstown State | ",
 "Upcoming Oct 24, 1:00 PM NIU at Youngstown State | ",
 "Upcoming Oct 30, 6:00 PM NIU vs Robert Morris | ",
 "Upcoming Oct 31, 2:00 PM NIU vs Robert Morris | ",
 "Upcoming Nov 6, 5:00 PM NIU at IU Indy | ",
 "Upcoming Nov 7, 3:00 PM NIU at Purdue Fort Wayne | ",
 "Upcoming Nov 12, 6:00 PM NIU vs Oakland | ",
 "Upcoming Nov 13, 5:00 PM NIU vs Cleveland State | ",
 "Upcoming Nov 19 NIU at Horizon League Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Oct 30, 6:00 PM NIU vs Red-Black | ",
 "Upcoming Nov 7, 8:30 AM NIU at MSU Open | ",
 "Upcoming Nov 15, 12:00 PM NIU vs Bellarmine | ",
 "Upcoming Nov 20, 9:00 PM NIU at Oregon State | ",
 "Upcoming Dec 4 NIU at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 19, 10:00 AM NIU at CSU Bakersfield | ",
 "Upcoming Dec 19, 12:00 PM NIU at Harper College | ",
 "Upcoming Dec 19, 2:00 PM NIU at Saint Ambrose (Iowa) | ",
 "Upcoming Dec 29 NIU at Ken Kraft Midlands Championships | ",
 "Upcoming Jan 8 NIU at NWCA National Duals | ",
 "Upcoming Jan 16, 12:00 PM NIU vs Northern Colorado | ",
 "Upcoming Jan 22, 6:00 PM NIU at Little Rock | ",
 "Upcoming Jan 28, 6:00 PM NIU vs Northwestern | ",
 "Upcoming Feb 5, 6:00 PM NIU at North Dakota State | ",
 "Upcoming Feb 7, 1:00 PM NIU at South Dakota State | ",
 "Upcoming Feb 12, 6:00 PM NIU vs Air Force | ",
 "Upcoming Feb 21, 12:00 PM NIU vs Cal Poly | ",
 "Upcoming Mar 4 NIU at Pac-12 Championships | ",
 "Upcoming Mar 18 NIU at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Northern Illinois module checks passed");
