import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {jamesMadisonSchool} from '../src/schools/james-madison.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='james-madison');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,jamesMadisonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/james-madison-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit jmusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['james-madison'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',jamesMadisonSchool.scheduleUrls],['roster',jamesMadisonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('james-madison|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'jmusports.com',`${key} must stay on jmusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://jmusports.com/sports/baseball/schedule"],"roster":["https://jmusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://jmusports.com/sports/mens-basketball/schedule","https://jmusports.com/sports/womens-basketball/schedule"],"roster":["https://jmusports.com/sports/mens-basketball/roster","https://jmusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://jmusports.com/sports/womens-cross-country/schedule"],"roster":["https://jmusports.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://jmusports.com/sports/field-hockey/schedule"],"roster":["https://jmusports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://jmusports.com/sports/football/schedule"],"roster":["https://jmusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://jmusports.com/sports/womens-golf/schedule","https://jmusports.com/sports/mens-golf/schedule"],"roster":["https://jmusports.com/sports/womens-golf/roster","https://jmusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://jmusports.com/sports/womens-lacrosse/schedule"],"roster":["https://jmusports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://jmusports.com/sports/womens-soccer/schedule","https://jmusports.com/sports/mens-soccer/schedule"],"roster":["https://jmusports.com/sports/womens-soccer/roster","https://jmusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://jmusports.com/sports/softball/schedule"],"roster":["https://jmusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://jmusports.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://jmusports.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://jmusports.com/sports/mens-tennis/schedule"],"roster":["https://jmusports.com/sports/mens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://jmusports.com/sports/track-and-field/schedule"],"roster":["https://jmusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://jmusports.com/sports/womens-volleyball/schedule"],"roster":["https://jmusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'james-madison|"+sport+"':"),`${sport} routes must live in the James Madison module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://jmusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.jamesMadisonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=james-madison)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 1:00 PM James Madison at Virginia (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · James Madison at VCU (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · James Madison vs Miami (Ohio) | ",
 "Upcoming Nov 6, 7:00 PM Men's · James Madison at Kentucky | ",
 "Upcoming Nov 11, 6:00 PM Men's · James Madison at Delaware | ",
 "Upcoming Nov 15, 4:00 PM Men's · James Madison vs Mercyhurst | ",
 "Upcoming Nov 18, 7:00 PM Men's · James Madison at Towson | ",
 "Upcoming Nov 21, 2:00 PM Men's · James Madison vs Virginia University of Lynchburg | ",
 "Upcoming Nov 24, 7:00 PM Men's · James Madison vs Charleston Southern | ",
 "Upcoming Nov 29, 4:00 PM Men's · James Madison vs William & Mary | ",
 "Upcoming Dec 3, 7:00 PM Men's · James Madison at Elon | ",
 "Upcoming Dec 6, 4:00 PM Men's · James Madison vs Longwood | ",
 "Upcoming Dec 9, 7:00 PM Men's · James Madison at North Carolina A&T | ",
 "Upcoming Dec 16, 7:00 PM Men's · James Madison vs Georgia State | ",
 "Upcoming Dec 19, 3:00 PM Men's · James Madison at Southern Miss | ",
 "Upcoming Dec 22, 3:00 PM Men's · James Madison vs Coppin State | ",
 "Upcoming Dec 28, 7:00 PM Men's · James Madison vs Notre Dame of Maryland | ",
 "Upcoming Dec 31, 2:00 PM Men's · James Madison vs Arkansas State | ",
 "Upcoming Jan 2, 2:00 PM Men's · James Madison vs Troy | ",
 "Upcoming Jan 7, 7:00 PM Men's · James Madison at Louisiana Tech | ",
 "Upcoming Jan 9, 3:00 PM Men's · James Madison at Louisiana | ",
 "Upcoming Jan 13, 7:00 PM Men's · James Madison at Georgia Southern | ",
 "Upcoming Jan 16, 2:00 PM Men's · James Madison vs Old Dominion | ",
 "Upcoming Jan 21, 7:00 PM Men's · James Madison vs Marshall | ",
 "Upcoming Jan 23, 3:00 PM Men's · James Madison at Georgia State | ",
 "Upcoming Jan 30, 5:00 PM Men's · James Madison vs ULM | ",
 "Upcoming Feb 3, 6:00 PM Men's · James Madison at Coastal Carolina | ",
 "Upcoming Feb 6 Men's · James Madison at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 7:00 PM Men's · James Madison vs App State | ",
 "Upcoming Feb 13, 7:00 PM Men's · James Madison at Marshall | ",
 "Upcoming Feb 17, 7:00 PM Men's · James Madison at Old Dominion | ",
 "Upcoming Feb 20, 5:00 PM Men's · James Madison vs Coastal Carolina | ",
 "Upcoming Feb 23, 8:00 PM Men's · James Madison vs Georgia Southern | ",
 "Upcoming Feb 26, 8:00 PM Men's · James Madison at App State | ",
 "Upcoming Mar 2 Men's · James Madison at Sun Belt Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · James Madison at Miami (Ohio) | ",
 "Upcoming Nov 5, 6:00 PM Women's · James Madison vs Central Connecticut State | ",
 "Upcoming Nov 8, 6:00 PM Women's · James Madison at Virginia Tech | ",
 "Upcoming Nov 11, 6:00 PM Women's · James Madison vs Navy | ",
 "Upcoming Nov 15, 1:00 PM Women's · James Madison vs East Carolina | ",
 "Upcoming Nov 19, 6:00 PM Women's · James Madison at Virginia | ",
 "Upcoming Nov 21, 12:00 PM Women's · James Madison at George Mason | ",
 "Upcoming Nov 24, 4:00 PM Women's · James Madison vs Winthrop | ",
 "Upcoming Nov 25, 6:30 PM Women's · James Madison vs Arkansas | ",
 "Upcoming Dec 2, 6:00 PM Women's · James Madison at Penn State | ",
 "Upcoming Dec 5, 2:00 PM Women's · James Madison vs Bucknell | ",
 "Upcoming Dec 8, 7:00 PM Women's · James Madison at Liberty | ",
 "Upcoming Dec 13, 2:00 PM Women's · James Madison vs High Point | ",
 "Upcoming Dec 19, 3:00 PM Women's · James Madison at ULM | ",
 "Upcoming Dec 22, 12:00 PM Women's · James Madison vs Georgia Southern | ",
 "Upcoming Dec 30 Women's · James Madison at Arkansas State | ",
 "Upcoming Jan 2, 4:33 PM Women's · James Madison at Troy | ",
 "Upcoming Jan 6, 6:00 PM Women's · James Madison vs Southern Miss | ",
 "Upcoming Jan 9, 2:00 PM Women's · James Madison vs Louisiana Tech | ",
 "Upcoming Jan 13, 6:00 PM Women's · James Madison at Coastal Carolina | ",
 "Upcoming Jan 16, 1:00 PM Women's · James Madison at Marshall | ",
 "Upcoming Jan 20, 6:30 PM Women's · James Madison at Old Dominion | ",
 "Upcoming Jan 23, 1:00 PM Women's · James Madison at Georgia State | ",
 "Upcoming Jan 28, 6:00 PM Women's · James Madison vs Marshall | ",
 "Upcoming Jan 30, 2:00 PM Women's · James Madison vs Old Dominion | ",
 "Upcoming Feb 3, 6:00 PM Women's · James Madison vs Georgia State | ",
 "Upcoming Feb 6, 2:00 PM Women's · James Madison vs MAC-SBC Challenge | ",
 "Upcoming Feb 10, 6:30 PM Women's · James Madison at App State | ",
 "Upcoming Feb 13, 2:00 PM Women's · James Madison at Georgia Southern | ",
 "Upcoming Feb 20, 2:00 PM Women's · James Madison vs Louisiana | ",
 "Upcoming Feb 23, 5:00 PM Women's · James Madison vs Coastal Carolina | ",
 "Upcoming Feb 26, 6:00 PM Women's · James Madison vs App State | ",
 "Upcoming Mar 2 Women's · James Madison at Sun Belt Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 James Madison at Spider Alumni Open | 4th of 16",
 "Final Sep 25 James Madison at JMU Invitational | 1st of 4",
 "Final Oct 2 James Madison at Fire Tower Project | 4th of 14",
 "Final Oct 17 James Madison at ECAC Championship | 13th of 26",
 "Upcoming Oct 30, 10:15 AM James Madison at Sun Belt Conference Championship | ",
 "Upcoming Nov 6 James Madison at Hokie Open | ",
 "Upcoming Nov 13 James Madison at NCAA Southeast Regional | ",
 "Upcoming Nov 21 James Madison at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 James Madison vs Temple | L, 1-2",
 "Final Aug 30 James Madison vs Drexel | L, 0-1",
 "Final Sep 6 James Madison vs Liberty | L, 1-2",
 "Final Sep 11 James Madison at Duke | L, 1-5",
 "Final Sep 13 James Madison at Virginia | L, 0-7",
 "Final Sep 18 James Madison at Ball State | W, 3-1",
 "Final Sep 25 James Madison at Miami (Ohio) | L, 2-4",
 "Final Sep 27 James Madison vs Kent State | W, 2-1",
 "Final Oct 2 James Madison at Longwood | W, 6-1",
 "Final Oct 4 James Madison at William & Mary | W, 3-2",
 "Final Oct 9 James Madison vs Bellarmine | W, 4-1",
 "Final Oct 16 James Madison at Ohio | W, 6-0",
 "Final Oct 18 James Madison vs Central Michigan | W, 3-1",
 "Upcoming Oct 23, 2:00 PM James Madison vs App State | ",
 "Upcoming Oct 25, 12:00 PM James Madison at Wake Forest | ",
 "Upcoming Oct 30, 2:00 PM James Madison at Massachusetts | ",
 "Upcoming Nov 4 James Madison at Mid-American Conference Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 James Madison vs Liberty | W, 20-13",
 "Final Sep 12 James Madison vs Wagner | W, 87-3",
 "Final Sep 19 James Madison at San Diego State | W, 26-13",
 "Final Sep 26 James Madison at Old Dominion | W, 46-20",
 "Final Oct 3 James Madison vs Marshall | W, 45-17",
 "Final Oct 10 James Madison at Georgia Southern | W, 27-24",
 "Final Oct 17 James Madison vs Georgia State | W, 49-22",
 "Today Oct 22, 7:00 PM James Madison at App State | ",
 "Upcoming Oct 29, 7:30 PM James Madison vs Troy | ",
 "Upcoming Nov 5, 8:00 PM James Madison at Southern Miss | ",
 "Upcoming Nov 14, 12:00 PM James Madison at UConn | ",
 "Upcoming Nov 28 James Madison vs Coastal Carolina | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · James Madison at Nittany Lion Invitational | 5th of 18",
 "Final Sep 14 Women's · James Madison at Pirate Collegiate Classic | 9th of 13",
 "Final Oct 5 Women's · James Madison at The Ally at Old Waverly | T10th of 17",
 "Final Oct 16 Women's · James Madison at Ruth's Chris Tar Heel Invitational | 11th of 14",
 "Upcoming Feb 8 Women's · James Madison at Oyster Shuck Match Play | ",
 "Upcoming Feb 22 Women's · James Madison at Chevron Collegiate | ",
 "Upcoming Mar 1 Women's · James Madison at Daniel Island Invitational | ",
 "Upcoming Mar 19 Women's · James Madison at El Tigre Collegiate Invitational | ",
 "Upcoming Mar 27 Women's · James Madison at Liz Murphey Collegiate | ",
 "Upcoming Apr 5 Women's · James Madison at Hokie Highlander Collegiate | ",
 "Upcoming Apr 19 Women's · James Madison at Sun Belt Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · James Madison at Bomb Darts Birds Collegiate | T7th of 13",
 "Final Sep 13 Men's · James Madison at JT Poston Invitational | T11th of 17",
 "Final Oct 5 Men's · James Madison at Testudo Cup | 4th of 14",
 "Final Oct 19 Men's · James Madison at Qubein Cup | 6th of 11",
 "Upcoming Oct 25 Men's · James Madison at ODU/OBX Intercollegiate | ",
 "Upcoming Feb 7 Men's · James Madison at Compadres Collegiate | ",
 "Upcoming Mar 8 Men's · James Madison at Babygrande Donald Ross | ",
 "Upcoming Mar 15 Men's · James Madison at Tiger Invitational | ",
 "Upcoming Apr 5 Men's · James Madison at Giles-Spratley Collegiate | ",
 "Upcoming Apr 12 Men's · James Madison at Everett Buick GMC Classic | ",
 "Upcoming Apr 26 Men's · James Madison at Sun Belt Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 25, 11:00 AM James Madison vs Temple | ",
 "Upcoming Oct 25, 12:00 PM James Madison at Maryland | ",
 "Upcoming Oct 25, 2:00 PM James Madison vs San Diego State | ",
 "Upcoming Oct 30, 7:00 PM James Madison vs Virginia | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · James Madison vs NC State | L, 1-3",
 "Final Aug 16 Women's · James Madison vs George Mason | W, 2-1",
 "Final Aug 20 Women's · James Madison at Georgia | L, 0-6",
 "Final Aug 30 Women's · James Madison at Princeton | L, 0-2",
 "Final Sep 6 Women's · James Madison vs UNCG | W, 4-1",
 "Final Sep 10 Women's · James Madison at Liberty | L, 0-1",
 "Final Sep 13 Women's · James Madison at Loyola Maryland | T, 1-1",
 "Final Sep 18 Women's · James Madison at Southern Miss | W, 5-0",
 "Final Sep 24 Women's · James Madison vs ULM | W, 1-0",
 "Final Sep 27 Women's · James Madison at Marshall | L, 1-2",
 "Final Oct 1 Women's · James Madison vs App State | W, 3-1",
 "Final Oct 7 Women's · James Madison at Arkansas State | W, 2-0",
 "Final Oct 11 Women's · James Madison vs Old Dominion | W, 2-1",
 "Final Oct 15 Women's · James Madison vs Louisiana Tech | W, 3-1",
 "Today Oct 22, 6:00 PM Women's · James Madison at Coastal Carolina | ",
 "Upcoming Oct 25, 1:00 PM Women's · James Madison vs Georgia State | ",
 "Upcoming Nov 1, 1:00 PM Women's · James Madison at Georgia Southern | ",
 "Upcoming Nov 9 Women's · James Madison at Sun Belt Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · James Madison vs Rider | L, 0-1",
 "Final Aug 24 Men's · James Madison vs Gardner-Webb | W, 2-0",
 "Final Aug 29 Men's · James Madison at Radford | L, 1-2",
 "Final Sep 4 Men's · James Madison at Princeton | L, 0-2",
 "Final Sep 7 Men's · James Madison at NJIT | L, 0-2",
 "Final Sep 11 Men's · James Madison vs Longwood | W, 2-0",
 "Final Sep 18 Men's · James Madison vs UCF | W, 1-0",
 "Final Sep 22 Men's · James Madison vs Liberty | T, 2-2",
 "Final Sep 27 Men's · James Madison at South Carolina | T, 1-1",
 "Final Oct 2 Men's · James Madison vs Coastal Carolina | W, 1-0",
 "Final Oct 6 Men's · James Madison vs Mary Baldwin | W, 6-0",
 "Final Oct 10 Men's · James Madison vs Georgia State | W, 1-0",
 "Final Oct 17 Men's · James Madison at Georgia Southern | W, 5-0",
 "Upcoming Oct 21, 7:15 PM Men's · James Madison at Marshall | ",
 "Upcoming Oct 25, 6:00 PM Men's · James Madison vs Kentucky | ",
 "Upcoming Oct 30, 7:00 PM Men's · James Madison at Old Dominion | ",
 "Upcoming Nov 3, 7:00 PM Men's · James Madison vs West Virginia | ",
 "Upcoming Nov 8 Men's · James Madison at Sun Belt Conference Championship Quarterfinals | ",
 "Upcoming Nov 11, 7:00 PM Men's · James Madison at Sun Belt Conference Championship Semifinals | ",
 "Upcoming Nov 15, 1:00 PM Men's · James Madison at Sun Belt Conference Championship Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 11:00 AM James Madison at Virginia (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM James Madison vs Liberty (Exhibition) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · James Madison at Rutgers | L, 124-225",
 "Final Oct 16 Women's · James Madison at Liberty | L, 120-233",
 "Upcoming Oct 30, 12:00 PM Women's · James Madison at Marshall | ",
 "Upcoming Nov 7, 12:00 PM Women's · James Madison at Georgetown | ",
 "Upcoming Nov 7, 12:00 PM Women's · James Madison vs Johns Hopkins | ",
 "Upcoming Nov 19 Women's · James Madison at Navy Invitational | ",
 "Upcoming Jan 15 Women's · James Madison vs Richmond | ",
 "Upcoming Jan 22, 5:00 PM Women's · James Madison at Navy | ",
 "Upcoming Jan 29 Women's · James Madison at Virginia Tech Invitational | ",
 "Upcoming Feb 4 Women's · James Madison at Cavalier Invitational | ",
 "Upcoming Feb 17 Women's · James Madison at American Conference Championship | ",
 "Upcoming Feb 26 Women's · James Madison at ECAC Championships | ",
 "Upcoming Mar 8 Women's · James Madison at NCAA Zone A Diving Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 James Madison at Orange & Blue Classic | Completed",
 "Final Oct 2 James Madison at River City Invite | Completed",
 "Final Oct 8 James Madison at ITA Atlantic Regionals | Completed",
 "Upcoming Oct 23 James Madison at Wake Forest Invitational | ",
 "Upcoming Nov 5 James Madison at ITA Sectionals | ",
 "Upcoming Nov 5 James Madison at ITA Conference Masters | ",
 "Upcoming Nov 6 James Madison at Navy Invitational | ",
 "Upcoming Nov 17 James Madison at NCAA Singles & Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 James Madison vs Loyola Maryland | W, 3-0",
 "Final Aug 29 James Madison vs Loyola Maryland | W, 3-0",
 "Final Sep 3 James Madison at North Carolina | L, 1-3",
 "Final Sep 5 James Madison vs Colorado State | L, 1-3",
 "Final Sep 10 James Madison vs EKU | L, 2-3",
 "Final Sep 11 James Madison at WKU | L, 2-3",
 "Final Sep 12 James Madison vs Pepperdine | L, 1-3",
 "Final Sep 18 James Madison vs UNCG | W, 3-1",
 "Final Sep 19 James Madison vs Delaware State | W, 3-0",
 "Final Sep 20 James Madison vs George Mason | W, 3-0",
 "Final Sep 25 James Madison vs South Alabama | W, 3-0",
 "Final Sep 26 James Madison vs South Alabama | W, 3-0",
 "Final Oct 1 James Madison at Georgia State | W, 3-0",
 "Final Oct 2 James Madison at Georgia State | W, 3-2",
 "Final Oct 8 James Madison at Marshall | W, 3-2",
 "Final Oct 9 James Madison at Marshall | L, 1-3",
 "Final Oct 15 James Madison vs App State | L, 2-3",
 "Final Oct 16 James Madison vs App State | L, 0-3",
 "Upcoming Oct 23, 6:00 PM James Madison at Georgia Southern | ",
 "Upcoming Oct 24, 1:00 PM James Madison at Georgia Southern | ",
 "Upcoming Oct 30, 6:00 PM James Madison vs Coastal Carolina | ",
 "Upcoming Oct 31, 1:00 PM James Madison vs Coastal Carolina | ",
 "Upcoming Nov 6, 6:00 PM James Madison vs Old Dominion | ",
 "Upcoming Nov 7, 1:00 PM James Madison vs Old Dominion | ",
 "Upcoming Nov 13, 6:00 PM James Madison at Arkansas State | ",
 "Upcoming Nov 14, 1:00 PM James Madison at Arkansas State | ",
 "Upcoming Nov 19 James Madison at Sun Belt Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("James Madison module checks passed");
