import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {easternIllinoisSchool} from '../src/schools/eastern-illinois.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='eastern-illinois');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,easternIllinoisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/eastern-illinois-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit eiupanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['eastern-illinois'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',easternIllinoisSchool.scheduleUrls],['roster',easternIllinoisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('eastern-illinois|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'eiupanthers.com',`${key} must stay on eiupanthers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://eiupanthers.com/sports/baseball/schedule"],"roster":["https://eiupanthers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://eiupanthers.com/sports/mens-basketball/schedule","https://eiupanthers.com/sports/womens-basketball/schedule"],"roster":["https://eiupanthers.com/sports/mens-basketball/roster","https://eiupanthers.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://eiupanthers.com/sports/beach-volleyball/schedule"],"roster":["https://eiupanthers.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://eiupanthers.com/sports/womens-cross-country/schedule","https://eiupanthers.com/sports/mens-cross-country/schedule"],"roster":["https://eiupanthers.com/sports/womens-cross-country/roster","https://eiupanthers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://eiupanthers.com/sports/football/schedule"],"roster":["https://eiupanthers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://eiupanthers.com/sports/womens-golf/schedule","https://eiupanthers.com/sports/mens-golf/schedule"],"roster":["https://eiupanthers.com/sports/womens-golf/roster","https://eiupanthers.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://eiupanthers.com/sports/womens-soccer/schedule","https://eiupanthers.com/sports/mens-soccer/schedule"],"roster":["https://eiupanthers.com/sports/womens-soccer/roster","https://eiupanthers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://eiupanthers.com/sports/softball/schedule"],"roster":["https://eiupanthers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://eiupanthers.com/sports/womens-swimming-and-diving/schedule","https://eiupanthers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://eiupanthers.com/sports/womens-swimming-and-diving/roster","https://eiupanthers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://eiupanthers.com/sports/womens-track-and-field/schedule","https://eiupanthers.com/sports/mens-track-and-field/schedule"],"roster":["https://eiupanthers.com/sports/womens-track-and-field/roster","https://eiupanthers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://eiupanthers.com/sports/womens-volleyball/schedule"],"roster":["https://eiupanthers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'eastern-illinois|"+sport+"':"),`${sport} routes must live in the Eastern Illinois module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://eiupanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.easternIllinoisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=eastern-illinois)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 23, 1:00 PM Eastern Illinois vs Lake Land College | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · Eastern Illinois at Indiana | ",
 "Upcoming Nov 6, 7:30 PM Men's · Eastern Illinois at Iowa | ",
 "Upcoming Nov 9, 6:00 PM Men's · Eastern Illinois at Notre Dame | ",
 "Upcoming Nov 11, 7:00 PM Men's · Eastern Illinois vs Blackburn College | ",
 "Upcoming Nov 15, 2:00 PM Men's · Eastern Illinois vs Purdue Fort Wayne | ",
 "Upcoming Nov 17, 7:00 PM Men's · Eastern Illinois at Vanderbilt | ",
 "Upcoming Nov 20, 8:00 PM Men's · Eastern Illinois at Illinois | ",
 "Upcoming Nov 23, 12:00 PM Men's · Eastern Illinois vs IU South Bend | ",
 "Upcoming Nov 28, 2:00 PM Men's · Eastern Illinois vs Northern Illinois | ",
 "Upcoming Dec 2, 7:00 PM Men's · Eastern Illinois vs Illinois State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Eastern Illinois at Bellarmine | ",
 "Upcoming Dec 9, 5:30 PM Men's · Eastern Illinois at Kansas City | ",
 "Upcoming Dec 12, 2:00 PM Men's · Eastern Illinois vs Arkansas - Pine Bluff | ",
 "Upcoming Dec 19, 2:00 PM Men's · Eastern Illinois at Northern Illinois | ",
 "Upcoming Dec 22, 2:00 PM Men's · Eastern Illinois vs East-West | ",
 "Upcoming Dec 31, 3:30 PM Men's · Eastern Illinois vs Southeast Missouri | ",
 "Upcoming Jan 2, 3:30 PM Men's · Eastern Illinois vs Tennessee State | ",
 "Upcoming Jan 7, 6:45 PM Men's · Eastern Illinois at Morehead State | ",
 "Upcoming Jan 9, 2:00 PM Men's · Eastern Illinois vs Ohio Christian | ",
 "Upcoming Jan 14, 7:30 PM Men's · Eastern Illinois at Western Illinois | ",
 "Upcoming Jan 16, 3:30 PM Men's · Eastern Illinois vs Lindenwood | ",
 "Upcoming Jan 21, 7:30 PM Men's · Eastern Illinois at Southeast Missouri | ",
 "Upcoming Jan 23, 3:30 PM Men's · Eastern Illinois vs UT Martin | ",
 "Upcoming Jan 30, 3:30 PM Men's · Eastern Illinois at Lindenwood | ",
 "Upcoming Feb 4, 7:30 PM Men's · Eastern Illinois vs Southern Indiana | ",
 "Upcoming Feb 6, 3:30 PM Men's · Eastern Illinois vs SIUE | ",
 "Upcoming Feb 11, 7:30 PM Men's · Eastern Illinois at Tennessee State | ",
 "Upcoming Feb 13, 3:30 PM Men's · Eastern Illinois at UT Martin | ",
 "Upcoming Feb 18, 7:30 PM Men's · Eastern Illinois vs Western Illinois | ",
 "Upcoming Feb 20, 3:30 PM Men's · Eastern Illinois at Southern Indiana | ",
 "Upcoming Feb 25, 7:30 PM Men's · Eastern Illinois at SIUE | ",
 "Upcoming Feb 27, 3:30 PM Men's · Eastern Illinois vs Morehead State | ",
 "Upcoming Mar 3 Men's · Eastern Illinois at OVC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 22 Women's · Eastern Illinois vs Quincy (Exhib.) | W, 66-57",
 "Upcoming Oct 27, 6:00 PM Women's · Eastern Illinois vs Illinois Wesleyan (Exhib.) | ",
 "Upcoming Nov 3, 6:00 PM Women's · Eastern Illinois at Drake | ",
 "Upcoming Nov 5, 7:00 PM Women's · Eastern Illinois at Iowa | ",
 "Upcoming Nov 8, 2:00 PM Women's · Eastern Illinois at Iowa State | ",
 "Upcoming Nov 11, 4:00 PM Women's · Eastern Illinois at Saint Louis | ",
 "Upcoming Nov 14, 1:00 PM Women's · Eastern Illinois vs Evansville | ",
 "Upcoming Nov 17, 6:00 PM Women's · Eastern Illinois at Southern Illinois | ",
 "Upcoming Nov 21, 7:00 PM Women's · Eastern Illinois at Murray State | ",
 "Upcoming Nov 25, 1:00 PM Women's · Eastern Illinois vs Oakland | ",
 "Upcoming Nov 28, 1:00 PM Women's · Eastern Illinois at Green Bay | ",
 "Upcoming Dec 3, 6:00 PM Women's · Eastern Illinois vs Illinois State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Eastern Illinois at Missouri | ",
 "Upcoming Dec 9, 6:00 PM Women's · Eastern Illinois vs Indiana State | ",
 "Upcoming Dec 13, 11:00 AM Women's · Eastern Illinois at Purdue | ",
 "Upcoming Dec 17, 11:00 AM Women's · Eastern Illinois at DePaul | ",
 "Upcoming Dec 21, 7:00 PM Women's · Eastern Illinois at Northwestern | ",
 "Upcoming Dec 31, 1:00 PM Women's · Eastern Illinois vs Southeast Missouri | ",
 "Upcoming Jan 2, 1:00 PM Women's · Eastern Illinois vs Tennessee State | ",
 "Upcoming Jan 7, 4:15 PM Women's · Eastern Illinois at Morehead State | ",
 "Upcoming Jan 14, 5:00 PM Women's · Eastern Illinois at Western Illinois | ",
 "Upcoming Jan 16, 1:00 PM Women's · Eastern Illinois vs Lindenwood | ",
 "Upcoming Jan 21, 5:00 PM Women's · Eastern Illinois at Southeast Missouri | ",
 "Upcoming Jan 23, 1:00 PM Women's · Eastern Illinois vs UT Martin | ",
 "Upcoming Jan 30, 1:00 PM Women's · Eastern Illinois at Lindenwood | ",
 "Upcoming Feb 4, 5:00 PM Women's · Eastern Illinois vs Southern Indiana | ",
 "Upcoming Feb 6, 1:00 PM Women's · Eastern Illinois vs SIUE | ",
 "Upcoming Feb 11, 5:00 PM Women's · Eastern Illinois at Tennessee State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Eastern Illinois at UT Martin | ",
 "Upcoming Feb 18, 5:00 PM Women's · Eastern Illinois vs Western Illinois | ",
 "Upcoming Feb 20, 1:00 PM Women's · Eastern Illinois at Southern Indiana | ",
 "Upcoming Feb 25, 5:00 PM Women's · Eastern Illinois at SIUE | ",
 "Upcoming Feb 27, 1:00 PM Women's · Eastern Illinois vs Morehead State | ",
 "Upcoming Mar 3 Women's · Eastern Illinois at OVC Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Eastern Illinois at EIU Walt Crawford Open | 1st",
 "Final Sep 18 Women's · Eastern Illinois at ISU Redbird Invite | 4th",
 "Final Oct 2 Women's · Eastern Illinois at ISU Nike XC Town Twilight | 8th",
 "Final Oct 16 Women's · Eastern Illinois at Bradley Pink Classic | 22nd",
 "Upcoming Oct 30, 9:00 AM Women's · Eastern Illinois at Ohio Valley Conference Championship | ",
 "Upcoming Nov 13 Women's · Eastern Illinois at NCAA Midwest Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Eastern Illinois at EIU Walt Crawford Open | 2nd",
 "Final Sep 18 Men's · Eastern Illinois at ISU Redbird Invite | 4th",
 "Final Oct 2 Men's · Eastern Illinois at ISU Nike XC Town Twilight | 8th",
 "Final Oct 16 Men's · Eastern Illinois at Bradley Pink Classic | 23rd",
 "Upcoming Oct 30, 10:00 AM Men's · Eastern Illinois at Ohio Valley Conference Championship | ",
 "Upcoming Nov 13 Men's · Eastern Illinois at NCAA Midwest Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Eastern Illinois at Murray State | W, 28-14",
 "Final Sep 3 Eastern Illinois at Minnesota | L, 7-59",
 "Final Sep 12 Eastern Illinois vs Indiana State | L, 35-42",
 "Final Sep 19 Eastern Illinois at Illinois State | L, 13-49",
 "Final Sep 26 Eastern Illinois at South Dakota State | L, 7-42",
 "Final Oct 10 Eastern Illinois at Gardner-Webb | W, 21-7",
 "Final Oct 17 Eastern Illinois vs Lindenwood | L, 13-20",
 "Upcoming Oct 24, 2:00 PM Eastern Illinois vs Southeast Missouri | ",
 "Upcoming Oct 31, 2:00 PM Eastern Illinois at UT Martin | ",
 "Upcoming Nov 7, 2:00 PM Eastern Illinois vs Western Illinois | ",
 "Upcoming Nov 14, 2:30 PM Eastern Illinois at Tennessee State | ",
 "Upcoming Nov 21, 12:00 PM Eastern Illinois vs Charleston Southern | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Eastern Illinois at YSU Roseann Schwartz Invitational | 7th",
 "Final Sep 14 Women's · Eastern Illinois at Ball State Brittany Kelly Classic | 10th",
 "Final Sep 21 Women's · Eastern Illinois at Omaha Fall Stampede At The Creek | 3rd",
 "Final Oct 4 Women's · Eastern Illinois at Bradley Coyote Creek Classic | 7th",
 "Final Oct 19 Women's · Eastern Illinois at Evansville Braun Intercollegiate | 8th",
 "Upcoming Mar 8, 8:00 AM Women's · Eastern Illinois at JSU Chris Banister Golf Classic | ",
 "Upcoming Mar 15, 8:00 AM Women's · Eastern Illinois at Alabama State Spring Classic | ",
 "Upcoming Apr 5, 8:00 AM Women's · Eastern Illinois at TSU Big Blue Intercollegiate | ",
 "Upcoming Apr 11, 8:00 AM Women's · Eastern Illinois at Indiana State Spring Invitational | ",
 "Upcoming Apr 18 Women's · Eastern Illinois at Ohio Valley Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Eastern Illinois at Iowa Fall Classic | 12th",
 "Final Sep 14 Men's · Eastern Illinois at UT Martin Grover Page | 9th",
 "Final Sep 28 Men's · Eastern Illinois at SIUE Derek Dolenc Invitational | 16th",
 "Final Oct 5 Men's · Eastern Illinois at Belmont Kemper Lakes Invite | 12th",
 "Final Oct 19 Men's · Eastern Illinois at Drake Zach Johnson Invitational | 12th",
 "Upcoming Mar 15, 8:00 AM Men's · Eastern Illinois at Alabama State Spring Classic | ",
 "Upcoming Mar 22, 8:00 AM Men's · Eastern Illinois at UT Martin Skyhawk Invitational | ",
 "Upcoming Apr 5, 8:00 AM Men's · Eastern Illinois at TSU Big Blue Intercollegiate | ",
 "Upcoming Apr 19, 8:00 AM Men's · Eastern Illinois at Iowa Hawkeye Invitational | ",
 "Upcoming Apr 25 Men's · Eastern Illinois at Ohio Valley Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Eastern Illinois vs Valparaiso | W, 2-0",
 "Final Aug 16 Women's · Eastern Illinois at UIC | T, 0-0",
 "Final Aug 23 Women's · Eastern Illinois at Purdue | L, 0-8",
 "Final Aug 27 Women's · Eastern Illinois vs Indiana State | T, 0-0",
 "Final Aug 30 Women's · Eastern Illinois vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 6 Women's · Eastern Illinois at Ball State | L, 0-1",
 "Final Sep 10 Women's · Eastern Illinois vs Illinois State | L, 0-1",
 "Final Sep 13 Women's · Eastern Illinois at Cincinnati | T, 0-0",
 "Final Sep 19 Women's · Eastern Illinois at Marquette | L, 1-3",
 "Final Sep 27 Women's · Eastern Illinois at SIUE | L, 2-4",
 "Final Oct 4 Women's · Eastern Illinois vs Western Illinois | W, 2-1",
 "Final Oct 11 Women's · Eastern Illinois vs Lindenwood | W, 3-0",
 "Final Oct 15 Women's · Eastern Illinois vs Southeast Missouri | L, 1-2",
 "Final Oct 18 Women's · Eastern Illinois at Morehead State | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Women's · Eastern Illinois at Southern Indiana | ",
 "Upcoming Nov 1, 1:00 PM Women's · Eastern Illinois vs UT Martin | ",
 "Upcoming Nov 5 Women's · Eastern Illinois at OVC Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Eastern Illinois at Omaha | L, 2-4",
 "Final Aug 27 Men's · Eastern Illinois vs Wright State | L, 1-2",
 "Final Aug 30 Men's · Eastern Illinois vs St. Thomas | T, 1-1",
 "Final Sep 5 Men's · Eastern Illinois vs Northern Illinois | L, 1-2",
 "Final Sep 11 Men's · Eastern Illinois vs Bradley | T, 3-3",
 "Final Sep 16 Men's · Eastern Illinois at Chicago State | W, 4-1",
 "Final Sep 22 Men's · Eastern Illinois at Marshall | L, 1-2",
 "Final Sep 26 Men's · Eastern Illinois vs Western Illinois | L, 1-2",
 "Final Oct 1 Men's · Eastern Illinois at Southern Indiana | W, 6-2",
 "Final Oct 4 Men's · Eastern Illinois vs SIUE | W, 1-0",
 "Final Oct 8 Men's · Eastern Illinois at Western Illinois | L, 1-4",
 "Final Oct 11 Men's · Eastern Illinois at UT Rio Grande Valley | T, 1-1",
 "Final Oct 15 Men's · Eastern Illinois vs Incarnate Word | L, 1-2",
 "Final Oct 18 Men's · Eastern Illinois vs Houston Christian | W, 3-1",
 "Today Oct 23, 7:00 PM Men's · Eastern Illinois at Lindenwood | ",
 "Upcoming Oct 29, 2:00 PM Men's · Eastern Illinois vs Southern Indiana | ",
 "Upcoming Nov 1, 1:00 PM Men's · Eastern Illinois at SIUE | ",
 "Upcoming Nov 8 Men's · Eastern Illinois at Ohio Valley Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Eastern Illinois at IU Indy Invite | L, 67-226",
 "Final Oct 3 Women's · Eastern Illinois vs Bellarmine | W, 146-114",
 "Final Oct 3 Women's · Eastern Illinois vs Bowling Green | L, 58-235",
 "Final Oct 3 Women's · Eastern Illinois vs Xavier | L, 87-171",
 "Final Oct 3 Women's · Eastern Illinois vs Butler | L, 87-174",
 "Final Oct 9 Women's · Eastern Illinois vs Olivet Nazarene | W, 175-86",
 "Upcoming Oct 30, 1:30 PM Women's · Eastern Illinois at McKendree Tri-Meet | ",
 "Upcoming Nov 12, 9:00 AM Women's · Eastern Illinois at SIU A3 Performance Invite | ",
 "Upcoming Dec 5, 1:00 PM Women's · Eastern Illinois vs Saint Louis | ",
 "Upcoming Dec 12 Women's · Eastern Illinois at CSCAA Open Water Championships | ",
 "Upcoming Jan 9 Women's · Eastern Illinois at Illinois Tri-Meet | ",
 "Upcoming Jan 16 Women's · Eastern Illinois at Indianapolis | ",
 "Upcoming Jan 22, 4:00 PM Women's · Eastern Illinois vs Southern Indiana | ",
 "Upcoming Jan 30, 11:00 AM Women's · Eastern Illinois at Oakland | ",
 "Upcoming Feb 24 Women's · Eastern Illinois at The Summit League Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Eastern Illinois at IU Indy Invite | L, 49-244",
 "Final Oct 3 Men's · Eastern Illinois vs Xavier | W, 144-117",
 "Final Oct 3 Men's · Eastern Illinois at Bellarmine | Completed",
 "Final Oct 9 Men's · Eastern Illinois vs Olivet Nazarene | W, 195-65",
 "Upcoming Oct 30, 1:30 PM Men's · Eastern Illinois at McKendree Tri-Meet | ",
 "Upcoming Nov 12, 9:00 AM Men's · Eastern Illinois at SIU A3 Performance Invite | ",
 "Upcoming Dec 5, 1:00 PM Men's · Eastern Illinois vs Saint Louis | ",
 "Upcoming Dec 12 Men's · Eastern Illinois at CSCAA Open Water Championships | ",
 "Upcoming Jan 16 Men's · Eastern Illinois at Indianapolis | ",
 "Upcoming Jan 22, 4:00 PM Men's · Eastern Illinois vs Southern Indiana | ",
 "Upcoming Jan 30, 11:00 AM Men's · Eastern Illinois at Oakland | ",
 "Upcoming Feb 24 Men's · Eastern Illinois at The Summit League Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 11 Women's · Eastern Illinois at ISU Blue-White Classic | ",
 "Upcoming Jan 16 Women's · Eastern Illinois at EIU John Craft Invite | ",
 "Upcoming Jan 23 Women's · Eastern Illinois at SIU Don Denoon Indoor Classic | ",
 "Upcoming Feb 5 Women's · Eastern Illinois at DePaul Don Amidei & Pat Savage Team Challenge | ",
 "Upcoming Feb 12 Women's · Eastern Illinois at DePaul Blue Demon Alumni Classic | ",
 "Upcoming Feb 20 Women's · Eastern Illinois at Indiana State Open | ",
 "Upcoming Feb 23 Women's · Eastern Illinois at OVC Indoor Championships | ",
 "Upcoming Mar 12 Women's · Eastern Illinois at NCAA Indoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 11 Men's · Eastern Illinois at ISU Blue-White Classic | ",
 "Upcoming Jan 16 Men's · Eastern Illinois at EIU John Craft Invite | ",
 "Upcoming Jan 23 Men's · Eastern Illinois at SIU Don Denoon Indoor Classic | ",
 "Upcoming Feb 5 Men's · Eastern Illinois at DePaul Don Amidei & Pat Savage Team Challenge | ",
 "Upcoming Feb 12 Men's · Eastern Illinois at DePaul Blue Demon Alumni Classic | ",
 "Upcoming Feb 20 Men's · Eastern Illinois at Indiana State Open | ",
 "Upcoming Feb 23 Men's · Eastern Illinois at OVC Indoor Championships | ",
 "Upcoming Mar 12 Men's · Eastern Illinois at NCAA Indoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Eastern Illinois vs Santa Clara | W, 3-2",
 "Final Aug 29 Eastern Illinois at Wright State | L, 0-3",
 "Final Aug 29 Eastern Illinois at Dayton | L, 0-3",
 "Final Sep 3 Eastern Illinois at BYU | L, 0-3",
 "Final Sep 4 Eastern Illinois vs Long Beach State | L, 0-3",
 "Final Sep 5 Eastern Illinois vs Wyoming | L, 1-3",
 "Final Sep 11 Eastern Illinois vs Cal Poly | L, 0-3",
 "Final Sep 11 Eastern Illinois at Indiana | L, 0-3",
 "Final Sep 16 Eastern Illinois vs Illinois | L, 1-3",
 "Final Sep 18 Eastern Illinois at Notre Dame | L, 0-3",
 "Final Sep 20 Eastern Illinois vs Notre Dame | L, 0-3",
 "Final Sep 25 Eastern Illinois vs Southern Indiana | W, 3-1",
 "Final Sep 26 Eastern Illinois vs Southern Indiana | L, 2-3",
 "Final Oct 2 Eastern Illinois at Lindenwood | L, 0-3",
 "Final Oct 3 Eastern Illinois at Lindenwood | L, 0-3",
 "Final Oct 9 Eastern Illinois at UT Martin | L, 1-3",
 "Final Oct 10 Eastern Illinois at UT Martin | W, 3-0",
 "Final Oct 15 Eastern Illinois vs Tennessee State | W, 3-0",
 "Final Oct 16 Eastern Illinois vs Tennessee State | W, 3-0",
 "Upcoming Oct 29, 4:00 PM Eastern Illinois at Morehead State | ",
 "Upcoming Oct 30, 11:00 AM Eastern Illinois at Morehead State | ",
 "Upcoming Nov 5, 6:00 PM Eastern Illinois vs Western Illinois | ",
 "Upcoming Nov 6, 4:00 PM Eastern Illinois vs Western Illinois | ",
 "Upcoming Nov 12, 6:00 PM Eastern Illinois vs SIUE | ",
 "Upcoming Nov 13, 4:00 PM Eastern Illinois vs SIUE | ",
 "Upcoming Nov 17, 6:00 PM Eastern Illinois at Southeast Missouri | ",
 "Upcoming Nov 18, 4:00 PM Eastern Illinois at Southeast Missouri | ",
 "Upcoming Nov 22 Eastern Illinois at OVC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Eastern Illinois module checks passed");
