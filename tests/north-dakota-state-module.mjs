import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northDakotaStateSchool} from '../src/schools/north-dakota-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='north-dakota-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northDakotaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/north-dakota-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobison.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['north-dakota-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',northDakotaStateSchool.scheduleUrls],['roster',northDakotaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('north-dakota-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobison.com',`${key} must stay on gobison.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gobison.com/sports/baseball/schedule"],"roster":["https://gobison.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobison.com/sports/mens-basketball/schedule","https://gobison.com/sports/womens-basketball/schedule"],"roster":["https://gobison.com/sports/mens-basketball/roster","https://gobison.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobison.com/sports/womens-cross-country/schedule","https://gobison.com/sports/mens-cross-country/schedule"],"roster":["https://gobison.com/sports/womens-cross-country/roster","https://gobison.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gobison.com/sports/football/schedule"],"roster":["https://gobison.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gobison.com/sports/womens-golf/schedule","https://gobison.com/sports/mens-golf/schedule"],"roster":["https://gobison.com/sports/womens-golf/roster","https://gobison.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gobison.com/sports/womens-soccer/schedule"],"roster":["https://gobison.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gobison.com/sports/softball/schedule"],"roster":["https://gobison.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://gobison.com/sports/womens-track-and-field/schedule","https://gobison.com/sports/mens-track-and-field/schedule"],"roster":["https://gobison.com/sports/womens-track-and-field/roster","https://gobison.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gobison.com/sports/womens-volleyball/schedule"],"roster":["https://gobison.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gobison.com/sports/wrestling/schedule"],"roster":["https://gobison.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'north-dakota-state|"+sport+"':"),`${sport} routes must live in the North Dakota State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://gobison.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northDakotaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=north-dakota-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 22 Men's · North Dakota State vs MSU Moorhead (Exhibition) | W, 80-74",
 "Upcoming Nov 2, 7:00 PM Men's · North Dakota State vs Minnesota Crookston | ",
 "Upcoming Nov 4, 9:00 PM Men's · North Dakota State at Saint Mary's | ",
 "Upcoming Nov 6, 9:00 PM Men's · North Dakota State at San Francisco | ",
 "Upcoming Nov 8, 5:00 PM Men's · North Dakota State at CSU Bakersfield | ",
 "Upcoming Nov 13, 7:00 PM Men's · North Dakota State vs Illinois State | ",
 "Upcoming Nov 15, 1:00 PM Men's · North Dakota State vs CSU Bakersfield | ",
 "Upcoming Nov 18, 8:00 PM Men's · North Dakota State at Colorado State | ",
 "Upcoming Nov 23, 7:00 PM Men's · North Dakota State vs Wisconsin-Stout | ",
 "Upcoming Nov 27, 7:00 PM Men's · North Dakota State vs North Texas | ",
 "Upcoming Nov 28, 5:00 PM Men's · North Dakota State vs Drake | ",
 "Upcoming Nov 29, 3:00 PM Men's · North Dakota State vs Boise State | ",
 "Upcoming Dec 3, 7:00 PM Men's · North Dakota State vs UC Davis | ",
 "Upcoming Dec 6, 3:00 PM Men's · North Dakota State at Washington State | ",
 "Upcoming Dec 8, 8:00 PM Men's · North Dakota State at Idaho | ",
 "Upcoming Dec 13, 4:00 PM Men's · North Dakota State at Illinois State | ",
 "Upcoming Dec 20, 1:00 PM Men's · North Dakota State vs Idaho State | ",
 "Upcoming Dec 22, 9:00 PM Men's · North Dakota State at CSUN | ",
 "Upcoming Dec 31, 1:00 PM Men's · North Dakota State vs Concordia, Nebraska | ",
 "Upcoming Jan 7, 7:00 PM Men's · North Dakota State at St. Thomas | ",
 "Upcoming Jan 9, 1:00 PM Men's · North Dakota State at Omaha | ",
 "Upcoming Jan 14, 7:00 PM Men's · North Dakota State vs Kansas City | ",
 "Upcoming Jan 16, 1:00 PM Men's · North Dakota State vs Oral Roberts | ",
 "Upcoming Jan 21, 7:00 PM Men's · North Dakota State at South Dakota State | ",
 "Upcoming Jan 23, 1:00 PM Men's · North Dakota State at South Dakota | ",
 "Upcoming Jan 29, 8:00 PM Men's · North Dakota State at North Dakota | ",
 "Upcoming Feb 4, 7:00 PM Men's · North Dakota State vs Omaha | ",
 "Upcoming Feb 6, 1:00 PM Men's · North Dakota State vs St. Thomas | ",
 "Upcoming Feb 11, 7:00 PM Men's · North Dakota State at Oral Roberts | ",
 "Upcoming Feb 13, 2:00 PM Men's · North Dakota State at Kansas City | ",
 "Upcoming Feb 18, 7:00 PM Men's · North Dakota State vs South Dakota | ",
 "Upcoming Feb 20, 1:00 PM Men's · North Dakota State vs South Dakota State | ",
 "Upcoming Feb 27, 7:00 PM Men's · North Dakota State vs North Dakota | ",
 "Upcoming Mar 4 Men's · North Dakota State at Summit League Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Women's · North Dakota State at Gonzaga | ",
 "Upcoming Nov 5, 7:00 PM Women's · North Dakota State vs Augustana | ",
 "Upcoming Nov 9, 7:00 PM Women's · North Dakota State vs Creighton | ",
 "Upcoming Nov 12, 6:00 PM Women's · North Dakota State at Butler | ",
 "Upcoming Nov 19, 6:30 PM Women's · North Dakota State at UTRGV | ",
 "Upcoming Nov 21 Women's · North Dakota State at UTSA | ",
 "Upcoming Nov 26, 2:30 PM Women's · North Dakota State vs Fairfield | ",
 "Upcoming Nov 28, 11:00 AM Women's · North Dakota State vs McNeese State | ",
 "Upcoming Dec 3, 11:00 AM Women's · North Dakota State vs Concordia-Moorhead | ",
 "Upcoming Dec 6, 1:00 PM Women's · North Dakota State vs Northern Iowa | ",
 "Upcoming Dec 10, 6:30 PM Women's · North Dakota State at Kansas | ",
 "Upcoming Dec 12 Women's · North Dakota State at Missouri State | ",
 "Upcoming Dec 20, 10:00 AM Women's · North Dakota State vs Saint Louis | ",
 "Upcoming Dec 21, 10:00 AM Women's · North Dakota State vs Temple | ",
 "Upcoming Dec 30, 5:00 PM Women's · North Dakota State vs Dordt | ",
 "Upcoming Jan 7, 7:00 PM Women's · North Dakota State vs St. Thomas | ",
 "Upcoming Jan 9, 1:00 PM Women's · North Dakota State vs Omaha | ",
 "Upcoming Jan 14 Women's · North Dakota State at Kansas City | ",
 "Upcoming Jan 16, 12:00 PM Women's · North Dakota State at Oral Roberts | ",
 "Upcoming Jan 21, 7:00 PM Women's · North Dakota State vs South Dakota State | ",
 "Upcoming Jan 23, 1:00 PM Women's · North Dakota State vs South Dakota | ",
 "Upcoming Jan 30 Women's · North Dakota State at North Dakota | ",
 "Upcoming Feb 4 Women's · North Dakota State at Omaha | ",
 "Upcoming Feb 7, 1:00 PM Women's · North Dakota State at St. Thomas | ",
 "Upcoming Feb 11, 7:00 PM Women's · North Dakota State vs Oral Roberts | ",
 "Upcoming Feb 13, 1:00 PM Women's · North Dakota State vs Kansas City | ",
 "Upcoming Feb 18 Women's · North Dakota State at South Dakota | ",
 "Upcoming Feb 20 Women's · North Dakota State at South Dakota State | ",
 "Upcoming Feb 26, 7:00 PM Women's · North Dakota State vs North Dakota | ",
 "Upcoming Mar 4 Women's · North Dakota State at The Summit League Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 Women's · North Dakota State at UMary Marauders Opener | Completed",
 "Final Sep 18 Women's · North Dakota State at Roy Griak Invitational | Completed",
 "Final Oct 2 Women's · North Dakota State at Jimmie Invite | Completed",
 "Final Oct 16 Women's · North Dakota State at Bradley Pink Classic | Completed",
 "Upcoming Oct 31, 11:00 AM Women's · North Dakota State at Summit League Championships | ",
 "Upcoming Nov 13, 11:00 AM Women's · North Dakota State at NCAA Midwest Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 11 Men's · North Dakota State at UMary Marauders Opener | Completed",
 "Final Sep 18 Men's · North Dakota State at Roy Griak Invitational | Completed",
 "Final Oct 2 Men's · North Dakota State at Jimmie Invite | Completed",
 "Final Oct 16 Men's · North Dakota State at Bradley Pink Classic | Completed",
 "Upcoming Oct 31, 12:00 PM Men's · North Dakota State at Summit League Championships | ",
 "Upcoming Nov 13, 12:00 PM Men's · North Dakota State at NCAA Midwest Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 North Dakota State vs Jacksonville State | W, 33-7",
 "Final Sep 5 North Dakota State vs Fordham | W, 38-0",
 "Final Sep 12 North Dakota State at Air Force | W, 38-32",
 "Final Sep 19 North Dakota State at Sacramento State | W, 31-10",
 "Final Oct 3 North Dakota State vs Wyoming | W, 28-0",
 "Final Oct 10 North Dakota State at UNLV | L, 7-13",
 "Final Oct 17 North Dakota State vs Nevada | W, 31-17",
 "Today Oct 24, 9:10 PM North Dakota State at New Mexico | ",
 "Upcoming Oct 31, 2:30 PM North Dakota State vs UTEP | ",
 "Upcoming Nov 14, 10:10 PM North Dakota State at Hawaii | ",
 "Upcoming Nov 21, 3:10 PM North Dakota State vs Northern Illinois | ",
 "Upcoming Nov 27, 2:30 PM North Dakota State at San Jose State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · North Dakota State at NDSU Fall Invitational | 1st of 3",
 "Final Sep 21 Women's · North Dakota State at Yellowstone Intercollegiate | 3rd of 11",
 "Final Sep 28 Women's · North Dakota State at Diane Thomason Invitational | 5th of 13",
 "Final Oct 12 Women's · North Dakota State at MSU/Payne Stewart Memorial | T4th of 12",
 "Upcoming Oct 25, 2:00 PM Women's · North Dakota State at The Clash at Boulder Creek | ",
 "Upcoming Feb 22 Women's · North Dakota State at Longwood Invitational at Jekyll Island | ",
 "Upcoming Mar 8 Women's · North Dakota State at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 22 Women's · North Dakota State at Bell Bank Pay It Forward Invitational | ",
 "Upcoming Mar 29 Women's · North Dakota State at Golfweek Invitational | ",
 "Upcoming Apr 12 Women's · North Dakota State at Bobcat Invitational | ",
 "Upcoming Apr 25 Women's · North Dakota State at The Summit League Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · North Dakota State at America Needs Farmers Fall Classic | 4th of 14",
 "Final Sep 14 Men's · North Dakota State at Wildcat Invitational | 14th of 15",
 "Final Sep 27 Men's · North Dakota State at Badger Invitational | 10th of 19",
 "Final Oct 12 Men's · North Dakota State at Metropolis Intercollegiate | 4th of 12",
 "Final Oct 19 Men's · North Dakota State at Zach Johnson Invitational | 4th of 13",
 "Upcoming Oct 26 Men's · North Dakota State at Monterrey Collegiate Classic | ",
 "Upcoming Feb 28 Men's · North Dakota State at Loyola Intercollegiate | ",
 "Upcoming Mar 22 Men's · North Dakota State at Bell Bank Intercollegiate | ",
 "Upcoming Mar 29 Men's · North Dakota State at Golfweek Invitational | ",
 "Upcoming Apr 19 Men's · North Dakota State at Chambers Bay Invitational | ",
 "Upcoming Apr 26 Men's · North Dakota State at North Dakota | ",
 "Upcoming May 2 Men's · North Dakota State at Summit League Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 North Dakota State vs Green Bay | L, 0-3",
 "Final Aug 16 North Dakota State vs Marquette | L, 0-2",
 "Final Aug 20 North Dakota State vs Minnesota | L, 1-2",
 "Final Aug 23 North Dakota State vs Washington State | T, 0-0",
 "Final Aug 27 North Dakota State vs Prairie View A&M | W, 3-1",
 "Final Aug 30 North Dakota State vs Presbyterian | T, 0-0",
 "Final Sep 3 North Dakota State at Westmont | W, 2-0",
 "Final Sep 6 North Dakota State at UC Santa Barbara | T, 3-3",
 "Final Sep 10 North Dakota State vs Florida Atlantic | T, 1-1",
 "Final Sep 24 North Dakota State at North Dakota | L, 0-4",
 "Final Sep 27 North Dakota State vs South Dakota | W, 2-1",
 "Final Oct 3 North Dakota State vs South Dakota State | T, 0-0",
 "Final Oct 8 North Dakota State vs St. Thomas | L, 1-2",
 "Final Oct 11 North Dakota State vs Omaha | T, 0-0",
 "Final Oct 15 North Dakota State at Oral Roberts | L, 0-1",
 "Final Oct 18 North Dakota State at Kansas City | W, 3-1",
 "Today Oct 24, 6:00 PM North Dakota State vs North Dakota | ",
 "Upcoming Oct 29, 6:00 PM North Dakota State at South Dakota | ",
 "Upcoming Nov 1, 1:00 PM North Dakota State at South Dakota State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · North Dakota State at SDSU Holiday Open | ",
 "Upcoming Dec 10 Women's · North Dakota State at Dakota Alumni Classic | ",
 "Upcoming Jan 16 Women's · North Dakota State at Bison Team Cup | ",
 "Upcoming Jan 23 Women's · North Dakota State at Mark Colligan Memorial | ",
 "Upcoming Jan 30 Women's · North Dakota State at UND Open | ",
 "Upcoming Feb 5 Women's · North Dakota State at Bison Open | ",
 "Upcoming Feb 12 Women's · North Dakota State at SDSU Indoor Classic | ",
 "Upcoming Feb 12 Women's · North Dakota State at Don Kirby Elite | ",
 "Upcoming Feb 12 Women's · North Dakota State at David Hemery Valentine Invite | ",
 "Upcoming Feb 19 Women's · North Dakota State at UND Tune-Up | ",
 "Upcoming Feb 26 Women's · North Dakota State at Summit League Indoor Championships | ",
 "Upcoming Mar 12 Women's · North Dakota State at NCAA Indoor Championships | ",
 "Upcoming Mar 26 Women's · North Dakota State at Clyde Hart Classic | ",
 "Upcoming Apr 2 Women's · North Dakota State at Stanford Invitational | ",
 "Upcoming Apr 2 Women's · North Dakota State at Mike Fanelli Track Classic | ",
 "Upcoming Apr 7 Women's · North Dakota State at Duke Invitational | ",
 "Upcoming Apr 15 Women's · North Dakota State at NDSU Spring Classic | ",
 "Upcoming Apr 15 Women's · North Dakota State at Bryan Clay Invitational | ",
 "Upcoming Apr 21 Women's · North Dakota State at Gary Wilson Invitational | ",
 "Upcoming Apr 22 Women's · North Dakota State at Drake Relays | ",
 "Upcoming Apr 30 Women's · North Dakota State at Texas A&M Alumni Muster | ",
 "Upcoming Apr 30 Women's · North Dakota State at Payton Jordan Invitational | ",
 "Upcoming May 1 Women's · North Dakota State at Cobb Open | ",
 "Upcoming May 7 Women's · North Dakota State at NDSU Tune-Up | ",
 "Upcoming May 13 Women's · North Dakota State at Summit League Outdoor Championships | ",
 "Upcoming May 26 Women's · North Dakota State at NCAA West First Rounds | ",
 "Upcoming Jun 9 Women's · North Dakota State at NCAA Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 4 Men's · North Dakota State at SDSU Holiday Open | ",
 "Upcoming Dec 10 Men's · North Dakota State at Dakota Alumni Classic | ",
 "Upcoming Jan 16 Men's · North Dakota State at Bison Team Cup | ",
 "Upcoming Jan 23 Men's · North Dakota State at Mark Colligan Memorial | ",
 "Upcoming Jan 30 Men's · North Dakota State at UND Open | ",
 "Upcoming Feb 5 Men's · North Dakota State at Bison Open | ",
 "Upcoming Feb 12 Men's · North Dakota State at SDSU Indoor Classic | ",
 "Upcoming Feb 12 Men's · North Dakota State at Don Kirby Elite | ",
 "Upcoming Feb 12 Men's · North Dakota State at David Hemery Valentine Invite | ",
 "Upcoming Feb 19 Men's · North Dakota State at UND Tune-Up | ",
 "Upcoming Feb 26 Men's · North Dakota State at Summit League Indoor Championships | ",
 "Upcoming Mar 12 Men's · North Dakota State at NCAA Indoor Championships | ",
 "Upcoming Mar 26 Men's · North Dakota State at Clyde Hart Classic | ",
 "Upcoming Apr 2 Men's · North Dakota State at Stanford Invitational | ",
 "Upcoming Apr 2 Men's · North Dakota State at Mike Fanelli Track Classic | ",
 "Upcoming Apr 7 Men's · North Dakota State at Duke Invitational | ",
 "Upcoming Apr 15 Men's · North Dakota State at NDSU Spring Classic | ",
 "Upcoming Apr 15 Men's · North Dakota State at Bryan Clay Invitational | ",
 "Upcoming Apr 21 Men's · North Dakota State at Gary Wilson Invitational | ",
 "Upcoming Apr 22 Men's · North Dakota State at Drake Relays | ",
 "Upcoming Apr 30 Men's · North Dakota State at Texas A&M Alumni Muster | ",
 "Upcoming Apr 30 Men's · North Dakota State at Payton Jordan Invitational | ",
 "Upcoming May 1 Men's · North Dakota State at Cobb Open | ",
 "Upcoming May 7 Men's · North Dakota State at NDSU Tune-Up | ",
 "Upcoming May 13 Men's · North Dakota State at Summit League Outdoor Championships | ",
 "Upcoming May 26 Men's · North Dakota State at NCAA West First Rounds | ",
 "Upcoming Jun 9 Men's · North Dakota State at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 18 North Dakota State vs UMary (Exhibition) | W, 3-0",
 "Final Aug 22 North Dakota State vs Minot State (Exhibition) | W, 3-0",
 "Final Aug 28 North Dakota State at Tulane | W, 3-2",
 "Final Aug 29 North Dakota State vs Tennessee Tech | W, 3-0",
 "Final Sep 3 North Dakota State at Boise State | L, 0-3",
 "Final Sep 4 North Dakota State vs Idaho State | W, 3-0",
 "Final Sep 5 North Dakota State vs UNLV | W, 3-2",
 "Final Sep 10 North Dakota State at Montana State | L, 2-3",
 "Final Sep 11 North Dakota State vs Portland | W, 3-0",
 "Final Sep 17 North Dakota State vs Montana | W, 3-1",
 "Final Sep 18 North Dakota State at Gonzaga | W, 3-0",
 "Final Sep 19 North Dakota State vs Seattle | W, 3-0",
 "Final Sep 24 North Dakota State vs St. Thomas | W, 3-2",
 "Final Sep 26 North Dakota State vs Omaha | L, 1-3",
 "Final Oct 1 North Dakota State at Oral Roberts | W, 3-0",
 "Final Oct 3 North Dakota State at Kansas City | L, 2-3",
 "Final Oct 10 North Dakota State at North Dakota | W, 3-0",
 "Final Oct 15 North Dakota State vs South Dakota State | L, 2-3",
 "Final Oct 17 North Dakota State vs South Dakota | L, 2-3",
 "Final Oct 22 North Dakota State at Omaha | W, 3-0",
 "Final Oct 24 North Dakota State at St. Thomas | L, 2-3",
 "Upcoming Oct 29, 7:00 PM North Dakota State vs Kansas City | ",
 "Upcoming Oct 31, 11:00 AM North Dakota State vs Oral Roberts | ",
 "Upcoming Nov 7, 7:00 PM North Dakota State vs North Dakota | ",
 "Upcoming Nov 12, 7:00 PM North Dakota State at South Dakota | ",
 "Upcoming Nov 14, 1:00 PM North Dakota State at South Dakota State | ",
 "Upcoming Nov 22 North Dakota State at The Summit League Championships | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 2:00 PM North Dakota State vs UMary | ",
 "Upcoming Nov 8, 10:00 AM North Dakota State at Daktronics Invitational | ",
 "Upcoming Nov 14, 12:00 PM North Dakota State at Iowa State | ",
 "Upcoming Nov 14, 2:00 PM North Dakota State at Wisconsin | ",
 "Upcoming Nov 20, 6:00 PM North Dakota State vs Bucknell | ",
 "Upcoming Dec 4, 5:00 PM North Dakota State vs Duke | ",
 "Upcoming Dec 4, 7:00 PM North Dakota State vs Michigan State | ",
 "Upcoming Jan 2, 8:00 AM North Dakota State at Southern Scuffle | ",
 "Upcoming Jan 16, 9:00 AM North Dakota State at The Citadel | ",
 "Upcoming Jan 16, 11:00 AM North Dakota State at Chattanooga | ",
 "Upcoming Jan 22, 9:00 PM North Dakota State at Cal State Bakersfield | ",
 "Upcoming Jan 24, 3:00 PM North Dakota State at Cal Poly | ",
 "Upcoming Jan 30, 8:00 PM North Dakota State at Air Force | ",
 "Upcoming Jan 31, 1:00 PM North Dakota State at Northern Colorado | ",
 "Upcoming Feb 5, 6:00 PM North Dakota State vs Northern Illinois | ",
 "Upcoming Feb 6, 6:00 PM North Dakota State vs Little Rock | ",
 "Upcoming Feb 14, 1:00 PM North Dakota State vs Oregon State | ",
 "Upcoming Feb 21, 1:00 PM North Dakota State vs South Dakota State | ",
 "Upcoming Mar 4 North Dakota State at Pac 12 Championships | ",
 "Upcoming Mar 18 North Dakota State at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Dakota State module checks passed");
