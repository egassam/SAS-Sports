import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {minnesotaSchool,MINNESOTA_TFRRS_TEAMS as minnesotaTfrrs} from '../src/schools/minnesota.mjs';
import {parseTfrrsResults} from '../src/tfrrs-results.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='minnesota');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,minnesotaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/minnesota-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gophersports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['minnesota'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',minnesotaSchool.scheduleUrls],['roster',minnesotaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('minnesota|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gophersports.com',`${key} must stay on gophersports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gophersports.com/sports/baseball/schedule"],"roster":["https://gophersports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gophersports.com/sports/mens-basketball/schedule","https://gophersports.com/sports/womens-basketball/schedule"],"roster":["https://gophersports.com/sports/mens-basketball/roster","https://gophersports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gophersports.com/sports/womens-cross-country/schedule","https://gophersports.com/sports/mens-cross-country/schedule"],"roster":["https://gophersports.com/sports/womens-cross-country/roster","https://gophersports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gophersports.com/sports/football/schedule"],"roster":["https://gophersports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gophersports.com/sports/womens-golf/schedule","https://gophersports.com/sports/mens-golf/schedule"],"roster":["https://gophersports.com/sports/womens-golf/roster","https://gophersports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://gophersports.com/sports/womens-gymnastics/schedule"],"roster":["https://gophersports.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://gophersports.com/sports/mens-ice-hockey/schedule","https://gophersports.com/sports/womens-ice-hockey/schedule"],"roster":["https://gophersports.com/sports/mens-ice-hockey/roster","https://gophersports.com/sports/womens-ice-hockey/roster"],"combined":true},"Rowing":{"schedule":["https://gophersports.com/sports/womens-rowing/schedule"],"roster":["https://gophersports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gophersports.com/sports/womens-soccer/schedule"],"roster":["https://gophersports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gophersports.com/sports/softball/schedule"],"roster":["https://gophersports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gophersports.com/sports/womens-swimming-and-diving/schedule","https://gophersports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gophersports.com/sports/womens-swimming-and-diving/roster","https://gophersports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gophersports.com/sports/womens-tennis/schedule"],"roster":["https://gophersports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gophersports.com/sports/womens-track-and-field/schedule","https://gophersports.com/sports/mens-track-and-field/schedule"],"roster":["https://gophersports.com/sports/womens-track-and-field/roster","https://gophersports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gophersports.com/sports/womens-volleyball/schedule"],"roster":["https://gophersports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gophersports.com/sports/wrestling/schedule"],"roster":["https://gophersports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'minnesota|"+sport+"':"),`${sport} routes must live in the Minnesota module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://gophersports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.minnesotaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=minnesota)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 9, 6:02 PM Minnesota vs St. Cloud State (Exhibition) | ",
 "Upcoming Oct 10, 2:02 PM Minnesota vs Bethany Lutheran (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 15, 7:00 PM Men's · Minnesota vs Omaha (Exhibition) | ",
 "Upcoming Oct 23, 7:30 PM Men's · Minnesota at Creighton (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · Minnesota vs North Dakota | ",
 "Upcoming Nov 6, 7:00 PM Men's · Minnesota vs St. Thomas | ",
 "Upcoming Nov 9, 6:00 PM Men's · Minnesota at Cincinnati | ",
 "Upcoming Nov 12, 7:00 PM Men's · Minnesota vs Southern | ",
 "Upcoming Nov 16, 7:00 PM Men's · Minnesota vs Western Illinois | ",
 "Upcoming Nov 20, 11:30 AM Men's · Minnesota vs Oklahoma State | ",
 "Upcoming Nov 22, 5:00 PM Men's · Minnesota vs Utah | ",
 "Upcoming Nov 28, 7:00 PM Men's · Minnesota vs California | ",
 "Upcoming Dec 2, 5:30 PM Men's · Minnesota at Michigan State | ",
 "Upcoming Dec 8, 6:00 PM Men's · Minnesota vs Illinois | ",
 "Upcoming Dec 12 Men's · Minnesota vs SMU | ",
 "Upcoming Dec 16, 7:30 PM Men's · Minnesota vs Texas Southern | ",
 "Upcoming Dec 20, 1:00 PM Men's · Minnesota vs Alcorn State | ",
 "Upcoming Dec 29, 7:00 PM Men's · Minnesota vs UTSA | ",
 "Upcoming Jan 3, 6:30 PM Men's · Minnesota at Northwestern | ",
 "Upcoming Jan 6, 7:30 PM Men's · Minnesota vs Penn State | ",
 "Upcoming Jan 9, 11:00 AM Men's · Minnesota at Wisconsin | ",
 "Upcoming Jan 12, 5:30 PM Men's · Minnesota at Michigan | ",
 "Upcoming Jan 17, 1:00 PM Men's · Minnesota vs Purdue | ",
 "Upcoming Jan 20, 7:30 PM Men's · Minnesota vs Indiana | ",
 "Upcoming Jan 23, 11:00 AM Men's · Minnesota at Rutgers | ",
 "Upcoming Jan 26, 8:00 PM Men's · Minnesota vs Washington | ",
 "Upcoming Jan 31, 12:00 PM Men's · Minnesota vs Wisconsin | ",
 "Upcoming Feb 6, 3:00 PM Men's · Minnesota at USC | ",
 "Upcoming Feb 9, 9:00 PM Men's · Minnesota at UCLA | ",
 "Upcoming Feb 13, 1:00 PM Men's · Minnesota vs Oregon | ",
 "Upcoming Feb 16, 7:00 PM Men's · Minnesota vs Michigan | ",
 "Upcoming Feb 21, 1:00 PM Men's · Minnesota vs Northwestern | ",
 "Upcoming Feb 24, 5:30 PM Men's · Minnesota at Maryland | ",
 "Upcoming Feb 27, 1:00 PM Men's · Minnesota at Iowa | ",
 "Upcoming Mar 4, 7:30 PM Men's · Minnesota vs Ohio State | ",
 "Upcoming Mar 7, 6:00 PM Men's · Minnesota at Nebraska | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Minnesota vs Harvard | ",
 "Upcoming Nov 7 Women's · Minnesota at Marquette | ",
 "Upcoming Nov 10 Women's · Minnesota vs Southern | ",
 "Upcoming Nov 14, 1:00 PM Women's · Minnesota vs Kansas State | ",
 "Upcoming Nov 18, 7:00 PM Women's · Minnesota vs Kansas | ",
 "Upcoming Nov 22 Women's · Minnesota vs Central Michigan | ",
 "Upcoming Nov 26, 5:30 PM Women's · Minnesota vs Missouri State | ",
 "Upcoming Nov 27, 8:00 PM Women's · Minnesota vs Cincinnati | ",
 "Upcoming Dec 2 Women's · Minnesota vs St. Thomas | ",
 "Upcoming Dec 6, 1:00 PM Women's · Minnesota at Purdue | ",
 "Upcoming Dec 9 Women's · Minnesota vs Northern Iowa | ",
 "Upcoming Dec 12 Women's · Minnesota vs UMKC | ",
 "Upcoming Dec 15 Women's · Minnesota vs Mercyhurst | ",
 "Upcoming Dec 20 Women's · Minnesota vs Grambling State | ",
 "Upcoming Dec 30 Women's · Minnesota at Maryland | ",
 "Upcoming Jan 2, 5:00 PM Women's · Minnesota vs Indiana | ",
 "Upcoming Jan 5 Women's · Minnesota vs Penn State | ",
 "Upcoming Jan 9, 11:00 AM Women's · Minnesota vs Iowa | ",
 "Upcoming Jan 12, 9:30 PM Women's · Minnesota at UCLA | ",
 "Upcoming Jan 15 Women's · Minnesota at Southern California | ",
 "Upcoming Jan 21, 7:30 PM Women's · Minnesota vs Wisconsin | ",
 "Upcoming Jan 24, 1:00 PM Women's · Minnesota at Ohio State | ",
 "Upcoming Jan 28, 8:00 PM Women's · Minnesota vs Oregon | ",
 "Upcoming Feb 4 Women's · Minnesota at Wisconsin | ",
 "Upcoming Feb 7 Women's · Minnesota vs Rutgers | ",
 "Upcoming Feb 11, 7:00 PM Women's · Minnesota at Nebraska | ",
 "Upcoming Feb 14 Women's · Minnesota at Michigan State | ",
 "Upcoming Feb 17 Women's · Minnesota vs Michigan | ",
 "Upcoming Feb 20, 3:00 PM Women's · Minnesota vs Washington | ",
 "Upcoming Feb 25 Women's · Minnesota at Northwestern | ",
 "Upcoming Feb 28, 2:00 PM Women's · Minnesota vs Illinois | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Minnesota at Cyclone Preview | 1st of 6",
 "Final Sep 18 Women's · Minnesota at 40th Roy Griak Invitational | 1st of 17",
 "Final Sep 25 Women's · Minnesota at Sean Earl Loyola Lakefront Invitational | 2nd of 17",
 "Today Oct 9, 10:30 AM Women's · Minnesota at Nuttycombe Invitational | ",
 "Upcoming Oct 17 Women's · Minnesota at Bennie Johnnie Autumn Classic | ",
 "Upcoming Oct 23 Women's · Minnesota at Winona State Invitational | ",
 "Upcoming Oct 30 Women's · Minnesota at Big Ten Cross Country Championships | ",
 "Upcoming Nov 13 Women's · Minnesota at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Women's · Minnesota at NCAA Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Minnesota at Cyclone Preview | 1st of 8",
 "Final Sep 18 Men's · Minnesota at 40th Roy Griak Invitational | 4th of 18",
 "Final Sep 25 Men's · Minnesota at Sean Earl Loyola Lakefront Invitational | 3rd of 17",
 "Today Oct 9, 11:10 AM Men's · Minnesota at Nuttycombe Invitational | ",
 "Upcoming Oct 17 Men's · Minnesota at Bennie Johnnie Autumn Classic | ",
 "Upcoming Oct 23 Men's · Minnesota at Winona State Invitational | ",
 "Upcoming Oct 30 Men's · Minnesota at Big Ten Cross Country Championships | ",
 "Upcoming Nov 13 Men's · Minnesota at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Men's · Minnesota at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Minnesota vs Eastern Illinois | W, 59-7",
 "Final Sep 12 Minnesota vs Mississippi State | L, 13-38",
 "Final Sep 19 Minnesota vs Akron | W, 41-7",
 "Final Sep 26 Minnesota at Washington | W, 27-24",
 "Final Oct 3 Minnesota vs Michigan | W, 20-14",
 "Upcoming Oct 10, 7:00 PM Minnesota at Purdue | ",
 "Upcoming Oct 24 Minnesota vs Iowa | ",
 "Upcoming Oct 31 Minnesota at Indiana | ",
 "Upcoming Nov 7 Minnesota vs UCLA | ",
 "Upcoming Nov 14 Minnesota at Penn State | ",
 "Upcoming Nov 21 Minnesota vs Northwestern | ",
 "Upcoming Nov 27, 6:30 PM Minnesota at Wisconsin | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Minnesota at ANNIKA Intercollegiate | 12th",
 "Final Sep 18 Women's · Minnesota at Lady Paladin Invitational | 9th",
 "Final Oct 3 Women's · Minnesota at Blessings Collegiate Invitational | 9th",
 "Upcoming Oct 12 Women's · Minnesota at Illini Invitational | ",
 "Upcoming Jan 31 Women's · Minnesota at Dominican Republic Classic | ",
 "Upcoming Feb 21 Women's · Minnesota at Westbrook Invitational | ",
 "Upcoming Mar 13 Women's · Minnesota at Valspar Invitational | ",
 "Upcoming Mar 22 Women's · Minnesota at Bell Bank \"Pay It Forward\" | ",
 "Upcoming Apr 11 Women's · Minnesota at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Minnesota at Big Ten Championship | ",
 "Upcoming May 10 Women's · Minnesota at NCAA Regional | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Minnesota at Bearcat Invitational | T15th",
 "Final Sep 20 Men's · Minnesota at 2nd Swing Gopher Invitational | T11th",
 "Final Sep 28 Men's · Minnesota at Windon Memorial Classic | T7th",
 "Upcoming Oct 12 Men's · Minnesota at Moraine Intercollegiate | ",
 "Upcoming Oct 18 Men's · Minnesota at Quail Valley Collegiate Invitational | ",
 "Upcoming Feb 7 Men's · Minnesota at Dominican Republic Classic | ",
 "Upcoming Mar 7 Men's · Minnesota at Colleton River Collegiate | ",
 "Upcoming Mar 15 Men's · Minnesota at The Johnnie-O at Sea Island | ",
 "Upcoming Mar 22 Men's · Minnesota at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Apr 12 Men's · Minnesota at Mountaineer Invitational | ",
 "Upcoming Apr 24 Men's · Minnesota at Fighting Illini Spring Collegiate | ",
 "Upcoming Apr 30 Men's · Minnesota at Big Ten Championships | ",
 "Upcoming May 17 Men's · Minnesota at NCAA Regional | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 3 Men's · Minnesota at Michigan Tech | L, 2-3",
 "Final Oct 4 Men's · Minnesota at Michigan Tech | L, 1-3",
 "Upcoming Oct 16, 7:00 PM Men's · Minnesota at Minnesota Duluth | ",
 "Upcoming Oct 17, 6:00 PM Men's · Minnesota at Minnesota Duluth | ",
 "Upcoming Oct 22, 7:00 PM Men's · Minnesota vs North Dakota | ",
 "Upcoming Oct 23, 6:00 PM Men's · Minnesota vs North Dakota | ",
 "Upcoming Oct 30 Men's · Minnesota vs Penn State | ",
 "Upcoming Oct 31 Men's · Minnesota vs Penn State | ",
 "Upcoming Nov 5 Men's · Minnesota vs Wisconsin | ",
 "Upcoming Nov 7 Men's · Minnesota vs Wisconsin | ",
 "Upcoming Nov 13, 7:00 PM Men's · Minnesota vs Alaska Anchorage | ",
 "Upcoming Nov 14, 7:00 PM Men's · Minnesota vs Alaska Anchorage | ",
 "Upcoming Nov 27, 4:00 PM Men's · Minnesota vs Minnesota State | ",
 "Upcoming Nov 28, 6:00 PM Men's · Minnesota at Minnesota State | ",
 "Upcoming Dec 4 Men's · Minnesota at Notre Dame | ",
 "Upcoming Dec 5 Men's · Minnesota at Notre Dame | ",
 "Upcoming Dec 11 Men's · Minnesota at Michigan State | ",
 "Upcoming Dec 12 Men's · Minnesota at Michigan State | ",
 "Upcoming Jan 2, 2:00 PM Men's · Minnesota vs Bemidji State (Exhibition) | ",
 "Upcoming Jan 8 Men's · Minnesota vs Michigan | ",
 "Upcoming Jan 9 Men's · Minnesota vs Michigan | ",
 "Upcoming Jan 15 Men's · Minnesota at Ohio State | ",
 "Upcoming Jan 16 Men's · Minnesota at Ohio State | ",
 "Upcoming Jan 22 Men's · Minnesota vs Notre Dame | ",
 "Upcoming Jan 23 Men's · Minnesota vs Notre Dame | ",
 "Upcoming Jan 29 Men's · Minnesota vs Michigan State | ",
 "Upcoming Jan 30 Men's · Minnesota vs Michigan State | ",
 "Upcoming Feb 5 Men's · Minnesota at Wisconsin | ",
 "Upcoming Feb 7 Men's · Minnesota at Wisconsin | ",
 "Upcoming Feb 12 Men's · Minnesota at Penn State | ",
 "Upcoming Feb 13 Men's · Minnesota at Penn State | ",
 "Upcoming Feb 19 Men's · Minnesota vs Ohio State | ",
 "Upcoming Feb 20 Men's · Minnesota vs Ohio State | ",
 "Upcoming Feb 26 Men's · Minnesota at Michigan | ",
 "Upcoming Feb 27 Men's · Minnesota at Michigan | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 20 Women's · Minnesota vs Durham West Lightning (Exhibition) | W, 12-0",
 "Final Oct 2 Women's · Minnesota at Bemidji State | W, 5-2",
 "Final Oct 3 Women's · Minnesota at Bemidji State | W, 5-3",
 "Today Oct 9, 6:00 PM Women's · Minnesota vs Maine | ",
 "Upcoming Oct 11, 2:00 PM Women's · Minnesota vs Bemidji State | ",
 "Upcoming Oct 16, 6:00 PM Women's · Minnesota vs Ohio State | ",
 "Upcoming Oct 17, 2:00 PM Women's · Minnesota vs Ohio State | ",
 "Upcoming Oct 22, 6:00 PM Women's · Minnesota vs Lindenwood | ",
 "Upcoming Oct 23, 3:00 PM Women's · Minnesota vs Lindenwood | ",
 "Upcoming Oct 30, 6:00 PM Women's · Minnesota at Minnesota Duluth | ",
 "Upcoming Oct 31, 3:00 PM Women's · Minnesota at Minnesota Duluth | ",
 "Upcoming Nov 13, 6:00 PM Women's · Minnesota vs St. Cloud State | ",
 "Upcoming Nov 14, 1:00 PM Women's · Minnesota at St. Cloud State | ",
 "Upcoming Nov 20, 6:00 PM Women's · Minnesota at St. Thomas | ",
 "Upcoming Nov 21, 2:00 PM Women's · Minnesota at St. Thomas | ",
 "Upcoming Nov 27, 1:00 PM Women's · Minnesota vs Princeton | ",
 "Upcoming Nov 28, 4:00 PM Women's · Minnesota vs Penn State | ",
 "Upcoming Dec 4, 6:00 PM Women's · Minnesota vs Wisconsin | ",
 "Upcoming Dec 5, 7:00 PM Women's · Minnesota vs Wisconsin | ",
 "Upcoming Dec 11, 12:00 PM Women's · Minnesota vs Minnesota State | ",
 "Upcoming Dec 12, 3:00 PM Women's · Minnesota at Minnesota State | ",
 "Upcoming Jan 8, 6:00 PM Women's · Minnesota vs Bemidji State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Minnesota vs Bemidji State | ",
 "Upcoming Jan 15, 6:00 PM Women's · Minnesota vs Minnesota Duluth | ",
 "Upcoming Jan 16, 2:00 PM Women's · Minnesota vs Minnesota Duluth | ",
 "Upcoming Jan 22, 5:00 PM Women's · Minnesota at Ohio State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Minnesota at Ohio State | ",
 "Upcoming Jan 29, 6:00 PM Women's · Minnesota vs St. Thomas | ",
 "Upcoming Jan 30, 2:00 PM Women's · Minnesota vs St. Thomas | ",
 "Upcoming Feb 5 Women's · Minnesota at Wisconsin | ",
 "Upcoming Feb 6 Women's · Minnesota at Wisconsin | ",
 "Upcoming Feb 12, 6:00 PM Women's · Minnesota at Minnesota State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Minnesota vs Minnesota State | ",
 "Upcoming Feb 19, 6:00 PM Women's · Minnesota at St. Cloud State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Minnesota vs St. Cloud State | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 3 Minnesota at Head of the Mississippi | Completed",
 "Upcoming Oct 31 Minnesota at Wisconsin (Exhibition) | ",
 "Upcoming Nov 8 Minnesota at Rivanna Romp | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Minnesota vs North Dakota | W, 4-0",
 "Final Aug 16 Minnesota vs Georgia | T, 1-1",
 "Final Aug 20 Minnesota at North Dakota State | W, 2-1",
 "Final Aug 27 Minnesota at BYU | L, 0-1",
 "Final Aug 30 Minnesota vs St. Thomas | W, 2-1",
 "Final Sep 6 Minnesota vs Colorado College | W, 5-0",
 "Final Sep 10 Minnesota vs Iowa | W, 1-0",
 "Final Sep 13 Minnesota at Penn State | L, 0-1",
 "Final Sep 20 Minnesota vs Northwestern | T, 2-2",
 "Final Sep 24 Minnesota at Indiana | W, 2-1",
 "Final Sep 27 Minnesota at Purdue | L, 0-3",
 "Final Oct 2 Minnesota vs Maryland | W, 4-0",
 "Final Oct 8 Minnesota at Michigan State | L, 0-4",
 "Upcoming Oct 11, 1:00 PM Minnesota vs Ohio State | ",
 "Upcoming Oct 18, 1:00 PM Minnesota at (Receiving Votes) Wisconsin | ",
 "Upcoming Oct 22, 7:00 PM Minnesota vs Washington | ",
 "Upcoming Oct 25, 1:00 PM Minnesota vs Oregon | ",
 "Upcoming Oct 30, 7:00 PM Minnesota at Illinois | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 10, 1:00 PM Minnesota vs North Iowa Area (Exhibition) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 10, 11:00 AM Women's · Minnesota vs Iowa | ",
 "Upcoming Oct 16 Women's · Minnesota at The Dual Meet Tournament by Georgia Tech | ",
 "Upcoming Oct 23, 4:00 PM Women's · Minnesota at South Dakota | ",
 "Upcoming Oct 23, 4:00 PM Women's · Minnesota vs Nebraska | ",
 "Upcoming Oct 28 Women's · Minnesota at U.S. Short Course World Championship Trials | ",
 "Upcoming Nov 6, 5:00 PM Women's · Minnesota at Wisconsin | ",
 "Upcoming Dec 2 Women's · Minnesota at Minnesota Invitational | ",
 "Upcoming Jan 15, 11:00 AM Women's · Minnesota at Tampa | ",
 "Upcoming Jan 22, 4:00 PM Women's · Minnesota vs St. Thomas | ",
 "Upcoming Jan 22, 4:00 PM Women's · Minnesota vs South Dakota State | ",
 "Upcoming Jan 29, 4:00 PM Women's · Minnesota at Purdue | ",
 "Upcoming Jan 29, 4:00 PM Women's · Minnesota at Northwestern | ",
 "Upcoming Feb 5 Women's · Minnesota at First Chance Meet | ",
 "Upcoming Feb 17 Women's · Minnesota at Big Ten Championships | ",
 "Upcoming Feb 28 Women's · Minnesota at Last Chance Meet | ",
 "Upcoming Mar 8 Women's · Minnesota at NCAA Zone D Diving Championships | ",
 "Upcoming Mar 17 Women's · Minnesota at NCAA Championships | ",
 "Upcoming Apr 24 Women's · Minnesota vs Wisconsin | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Oct 16 Men's · Minnesota at The Dual Meet Tournament by Georgia Tech | ",
 "Upcoming Oct 23, 4:00 PM Men's · Minnesota at South Dakota | ",
 "Upcoming Oct 28 Men's · Minnesota at U.S. Short Course World Championship Trials | ",
 "Upcoming Nov 6, 5:00 PM Men's · Minnesota at Wisconsin | ",
 "Upcoming Dec 2 Men's · Minnesota at Minnesota Invitational | ",
 "Upcoming Jan 15, 11:00 AM Men's · Minnesota at Tampa | ",
 "Upcoming Jan 22, 4:00 PM Men's · Minnesota vs St. Thomas | ",
 "Upcoming Jan 22, 4:00 PM Men's · Minnesota vs South Dakota State | ",
 "Upcoming Jan 29, 4:00 PM Men's · Minnesota at Northwestern | ",
 "Upcoming Jan 29, 4:00 PM Men's · Minnesota at Purdue | ",
 "Upcoming Feb 5 Men's · Minnesota at First Chance Meet | ",
 "Upcoming Feb 24 Men's · Minnesota at Big Ten Championships | ",
 "Upcoming Mar 7, 10:00 AM Men's · Minnesota at Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Minnesota at NCAA Zone D Diving Championships | ",
 "Upcoming Mar 24 Men's · Minnesota at NCAA Championships | ",
 "Upcoming Apr 24 Men's · Minnesota vs Wisconsin | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Minnesota at ITA All-American Championships | Completed",
 "Final Sep 25 Minnesota at Gopher Invitational | Completed",
 "Final Sep 25 Minnesota at Husker Invitational | Completed",
 "Upcoming Oct 15 Minnesota at ITA Regionals | ",
 "Upcoming Nov 5 Minnesota at ITA Sectional Championships | ",
 "Upcoming Nov 5 Minnesota at Michigan State Invitational | ",
 "Upcoming Nov 6 Minnesota at UTR College Circuit | ",
 "Upcoming Nov 17 Minnesota at NCAA Individuals Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Minnesota vs Arizona State | L, 0-3",
 "Final Aug 29 Minnesota vs Creighton | W, 3-0",
 "Final Sep 1 Minnesota vs Florida | L, 1-3",
 "Final Sep 2 Minnesota vs Auburn | W, 3-1",
 "Final Sep 11 Minnesota vs Miami | W, 3-0",
 "Final Sep 13 Minnesota vs St. Thomas | W, 3-0",
 "Final Sep 18 Minnesota vs South Dakota | W, 3-1",
 "Final Sep 19 Minnesota vs South Dakota State | W, 3-1",
 "Final Sep 24 Minnesota at Illinois | L, 1-3",
 "Final Sep 26 Minnesota vs Oregon | L, 1-3",
 "Final Oct 1 Minnesota vs Northwestern | W, 3-0",
 "Final Oct 4 Minnesota vs Wisconsin | L, 1-3",
 "Today Oct 9, 6:00 PM Minnesota at Rutgers | ",
 "Upcoming Oct 11, 3:00 PM Minnesota at Ohio State | ",
 "Upcoming Oct 16, 7:00 PM Minnesota vs Michigan | ",
 "Upcoming Oct 17, 6:00 PM Minnesota vs Maryland | ",
 "Upcoming Oct 23, 6:00 PM Minnesota at Purdue | ",
 "Upcoming Oct 25, 1:00 PM Minnesota vs Washington | ",
 "Upcoming Oct 30, 9:00 PM Minnesota at UCLA | ",
 "Upcoming Nov 1, 4:00 PM Minnesota at USC | ",
 "Upcoming Nov 6, 6:00 PM Minnesota vs Penn State | ",
 "Upcoming Nov 8, 2:00 PM Minnesota at Iowa | ",
 "Upcoming Nov 11, 7:00 PM Minnesota vs Indiana | ",
 "Upcoming Nov 14, 7:00 PM Minnesota vs Michigan State | ",
 "Upcoming Nov 17, 7:30 PM Minnesota at Nebraska | ",
 "Upcoming Nov 20 Minnesota at Big Ten Tournament | ",
 "Upcoming Nov 28, 1:00 PM Minnesota vs High Point | ",
 "Upcoming Dec 4 Minnesota at NCAA Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 8 Minnesota at Daktronics Invitational | ",
 "Upcoming Nov 15 Minnesota at Mountaineer Invitational | ",
 "Upcoming Nov 20 Minnesota vs Gardner-Webb | ",
 "Upcoming Nov 22 Minnesota vs Bucknell | ",
 "Upcoming Dec 1 Minnesota vs SIUE | ",
 "Upcoming Dec 12 Minnesota at National Duals Invitational | ",
 "Upcoming Jan 2 Minnesota at Soldier Salute | ",
 "Upcoming Jan 10 Minnesota vs Maryland | ",
 "Upcoming Jan 15 Minnesota at Wisconsin | ",
 "Upcoming Jan 17 Minnesota at Purdue | ",
 "Upcoming Jan 24 Minnesota vs Rutgers | ",
 "Upcoming Jan 29 Minnesota vs Penn State | ",
 "Upcoming Feb 6 Minnesota at Nebraska | ",
 "Upcoming Feb 12 Minnesota vs Illinois | ",
 "Upcoming Feb 14 Minnesota at Michigan | ",
 "Upcoming Mar 6 Minnesota at Big Ten Championships | ",
 "Upcoming Mar 18 Minnesota at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: one page per team (womens-/mens-cross-country; the site's
// generic cross-country page is an empty template); each team's event keeps
// its own TFRRS race. TFRRS lists host Minnesota 16th at the Roy Griak
// Invitational (Sep 18) with the lowest scores: the women won with 26 points
// and the men were 4th with 125 (the Sep 18 story: "Roy Griak Invitational
// champions on the women's side", "The men's team finished fourth").
{
  fromTfrrs(minnesotaTfrrs);
  const xc=[...parse('Cross Country','womens-cross-country'),...parse('Cross Country','mens-cross-country')].filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.team_label,e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Women's","Cyclone Preview","Women's team: 1st · 27 pts",true],["Women's","40th Roy Griak Invitational","Women's team: 1st · 26 pts",true],["Women's","Sean Earl Loyola Lakefront Invitational","Women's team: 2nd · 112 pts",true],["Men's","Cyclone Preview","Men's team: 1st · 37 pts",true],["Men's","40th Roy Griak Invitational","Men's team: 4th · 125 pts",true],["Men's","Sean Earl Loyola Lakefront Invitational","Men's team: 3rd · 121 pts",true]]);
  recapFixtures.clear();requests.length=0;
  // A table in score order keeps its published places (Cyclone Preview).
  assert.deepEqual(parseTfrrsResults(fixture('tfrrs-28496.html.gz'),{decodeHtml:worker.decodeHtml,ordinal:n=>`${n}`,team:'Minnesota'}).map(r=>r.result),[{place:1,score:'27'},{place:1,score:'37'}]);
}

// Rowing: a regatta without a score is a meet, final with its story (Head of
// the Mississippi, Oct 3); an exhibition at Wisconsin stays a dual.
assert.deepEqual(parse('Rowing','womens-rowing').map(e=>[e.status,e.title,e.headline||'']),[["Final","Minnesota at Head of the Mississippi","Completed"],["Upcoming","Minnesota at Wisconsin (Exhibition)",""],["Upcoming","Minnesota at Rivanna Romp",""]]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Minnesota module checks passed');
