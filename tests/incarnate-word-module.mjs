import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {incarnateWordSchool} from '../src/schools/incarnate-word.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='incarnate-word');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,incarnateWordHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/incarnate-word-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uiwcardinals.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['incarnate-word'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',incarnateWordSchool.scheduleUrls],['roster',incarnateWordSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('incarnate-word|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uiwcardinals.com',`${key} must stay on uiwcardinals.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uiwcardinals.com/sports/baseball/schedule"],"roster":["https://uiwcardinals.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uiwcardinals.com/sports/mens-basketball/schedule","https://uiwcardinals.com/sports/womens-basketball/schedule"],"roster":["https://uiwcardinals.com/sports/mens-basketball/roster","https://uiwcardinals.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uiwcardinals.com/sports/womens-cross-country/schedule","https://uiwcardinals.com/sports/mens-cross-country/schedule"],"roster":["https://uiwcardinals.com/sports/womens-cross-country/roster","https://uiwcardinals.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://uiwcardinals.com/sports/womens-fencing/schedule","https://uiwcardinals.com/sports/mens-fencing/schedule"],"roster":["https://uiwcardinals.com/sports/womens-fencing/roster","https://uiwcardinals.com/sports/mens-fencing/roster"],"combined":true},"Football":{"schedule":["https://uiwcardinals.com/sports/football/schedule"],"roster":["https://uiwcardinals.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uiwcardinals.com/sports/womens-golf/schedule","https://uiwcardinals.com/sports/mens-golf/schedule"],"roster":["https://uiwcardinals.com/sports/womens-golf/roster","https://uiwcardinals.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://uiwcardinals.com/sports/womens-soccer/schedule","https://uiwcardinals.com/sports/mens-soccer/schedule"],"roster":["https://uiwcardinals.com/sports/womens-soccer/roster","https://uiwcardinals.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uiwcardinals.com/sports/softball/schedule"],"roster":["https://uiwcardinals.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://uiwcardinals.com/sports/womens-swimming-and-diving/schedule","https://uiwcardinals.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://uiwcardinals.com/sports/womens-swimming-and-diving/roster","https://uiwcardinals.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://uiwcardinals.com/sports/womens-tennis/schedule","https://uiwcardinals.com/sports/mens-tennis/schedule"],"roster":["https://uiwcardinals.com/sports/womens-tennis/roster","https://uiwcardinals.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uiwcardinals.com/sports/womens-track-and-field/schedule","https://uiwcardinals.com/sports/mens-track-and-field/schedule"],"roster":["https://uiwcardinals.com/sports/womens-track-and-field/roster","https://uiwcardinals.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://uiwcardinals.com/sports/womens-volleyball/schedule"],"roster":["https://uiwcardinals.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'incarnate-word|"+sport+"':"),`${sport} routes must live in the Incarnate Word module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://uiwcardinals.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.incarnateWordHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=incarnate-word)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 16, 2:00 PM UIW vs New Mexico JC | ",
 "Upcoming Oct 22 UIW vs Grayson College | ",
 "Upcoming Oct 30, 2:00 PM UIW vs Odessa College | ",
 "Upcoming Nov 6, 2:00 PM UIW vs Wharton JC | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 2 Men's · UIW at Michigan State | L, 59-89",
 "Upcoming Nov 2, 8:00 PM Men's · UIW at Oklahoma State | ",
 "Upcoming Nov 5, 6:00 PM Men's · UIW vs Chicago State | ",
 "Upcoming Nov 8, 5:00 PM Men's · UIW at UTEP | ",
 "Upcoming Nov 11, 2:11 PM Men's · UIW at UC Davis | ",
 "Upcoming Nov 18, 7:00 PM Men's · UIW at Texas State | ",
 "Upcoming Nov 20, 6:00 PM Men's · UIW vs Central Baptist | ",
 "Upcoming Nov 25, 12:00 AM Men's · UIW at Hawaii | ",
 "Upcoming Nov 29, 7:00 PM Men's · UIW at Grand Canyon | ",
 "Upcoming Dec 5, 1:00 PM Men's · UIW at Southeastern Louisiana | ",
 "Upcoming Dec 7, 6:30 PM Men's · UIW at McNeese State | ",
 "Upcoming Dec 9, 8:00 PM Men's · UIW at Gonzaga | ",
 "Upcoming Dec 15, 6:30 PM Men's · UIW at Texas Tech | ",
 "Upcoming Dec 19, 4:00 PM Men's · UIW vs Nicholls | ",
 "Upcoming Dec 21, 11:00 AM Men's · UIW vs New Orleans | ",
 "Upcoming Dec 28, 8:00 PM Men's · UIW at Arizona | ",
 "Upcoming Jan 2, 3:30 PM Men's · UIW at Houston Christian | ",
 "Upcoming Jan 4, 6:00 PM Men's · UIW vs The University of Texas Rio Grande Valley | ",
 "Upcoming Jan 9, 4:00 PM Men's · UIW vs Lamar | ",
 "Upcoming Jan 11, 6:00 PM Men's · UIW vs Stephen F. Austin | ",
 "Upcoming Jan 16, 3:30 PM Men's · UIW at Northwestern State | ",
 "Upcoming Jan 18, 1:00 PM Men's · UIW at East Texas A&M | ",
 "Upcoming Jan 23, 3:30 PM Men's · UIW at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 26, 6:30 PM Men's · UIW at The University of Texas Rio Grande Valley | ",
 "Upcoming Jan 30, 4:00 PM Men's · UIW vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 1, 6:00 PM Men's · UIW vs Houston Christian | ",
 "Upcoming Feb 6, 4:00 PM Men's · UIW vs McNeese State | ",
 "Upcoming Feb 8, 6:00 PM Men's · UIW vs Southeastern Louisiana | ",
 "Upcoming Feb 13, 3:00 PM Men's · UIW at Nicholls | ",
 "Upcoming Feb 15, 6:30 PM Men's · UIW at New Orleans | ",
 "Upcoming Feb 20, 4:00 PM Men's · UIW vs East Texas A&M | ",
 "Upcoming Feb 22, 6:00 PM Men's · UIW vs Northwestern State | ",
 "Upcoming Feb 27, 6:00 PM Men's · UIW at Lamar | ",
 "Upcoming Mar 1, 6:30 PM Men's · UIW at Stephen F. Austin | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · UIW at Tulsa | ",
 "Upcoming Nov 7 Women's · UIW at UTEP | ",
 "Upcoming Nov 11 Women's · UIW at UTSA | ",
 "Upcoming Nov 14 Women's · UIW at North Texas | ",
 "Upcoming Nov 17, 6:00 PM Women's · UIW vs Texas State | ",
 "Upcoming Nov 21 Women's · UIW at Texas A&M | ",
 "Upcoming Nov 23, 6:00 PM Women's · UIW vs Texas A&M University - Kingsville | ",
 "Upcoming Nov 29, 3:00 PM Women's · UIW vs Our Lady of the Lake | ",
 "Upcoming Dec 3, 6:30 PM Women's · UIW at McNeese State | ",
 "Upcoming Dec 5, 11:00 AM Women's · UIW at Southeastern Louisiana | ",
 "Upcoming Dec 17, 6:00 PM Women's · UIW vs New Orleans | ",
 "Upcoming Dec 19, 1:00 PM Women's · UIW vs Nicholls | ",
 "Upcoming Dec 23, 12:00 PM Women's · UIW at SMU | ",
 "Upcoming Dec 31 Women's · UIW vs The University of Texas Rio Grande Valley | ",
 "Upcoming Jan 2 Women's · UIW at Houston Christian | ",
 "Upcoming Jan 7, 6:00 PM Women's · UIW vs Stephen F. Austin | ",
 "Upcoming Jan 9, 1:00 PM Women's · UIW vs Lamar | ",
 "Upcoming Jan 14 Women's · UIW at East Texas A&M | ",
 "Upcoming Jan 16 Women's · UIW at Northwestern State | ",
 "Upcoming Jan 21, 6:30 PM Women's · UIW at The University of Texas Rio Grande Valley | ",
 "Upcoming Jan 23, 1:00 PM Women's · UIW at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 28, 6:00 PM Women's · UIW vs Houston Christian | ",
 "Upcoming Jan 30, 1:00 PM Women's · UIW vs Texas A&M - Corpus Christi | ",
 "Upcoming Feb 4, 6:00 PM Women's · UIW vs Southeastern Louisiana | ",
 "Upcoming Feb 6, 1:00 PM Women's · UIW vs McNeese State | ",
 "Upcoming Feb 11, 6:30 PM Women's · UIW at New Orleans | ",
 "Upcoming Feb 13 Women's · UIW at Nicholls | ",
 "Upcoming Feb 18, 6:00 PM Women's · UIW vs Northwestern State | ",
 "Upcoming Feb 20, 1:00 PM Women's · UIW vs East Texas A&M | ",
 "Upcoming Feb 25 Women's · UIW at Stephen F. Austin | ",
 "Upcoming Feb 27, 3:00 PM Women's · UIW at Lamar | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · UIW at Sam Musgrave UIW Twilight | 2nd of 7",
 "Final Sep 12 Women's · UIW at UIW Invitational | 2nd of 11",
 "Final Sep 26 Women's · UIW at McNeese Cowboy Stampede | 2nd of 5",
 "Final Oct 16 Women's · UIW at Arturo Barrios Invitational | 29th of 49",
 "Upcoming Oct 30 Women's · UIW at Southland Conference Championships | ",
 "Upcoming Nov 13 Women's · UIW at NCAA South Central Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · UIW at Sam Musgrave UIW Twilight | 1st of 8",
 "Final Sep 12 Men's · UIW at UIW Invitational | 3rd of 11",
 "Final Sep 26 Men's · UIW at McNeese Cowboy Stampede | 2nd of 5",
 "Final Oct 16 Men's · UIW at Arturo Barrios Invitational | 8th of 49",
 "Upcoming Oct 30 Men's · UIW at Southland Conference Championships | ",
 "Upcoming Nov 13 Men's · UIW at NCAA South Central Regional Championships | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Nov 7 Women's · UIW at West Invitational | ",
 "Upcoming Jan 30 Women's · UIW at Schiller Duals | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Nov 7 Men's · UIW at West Invitational | ",
 "Upcoming Jan 30 Men's · UIW at Schiller Duals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 UIW vs Oklahoma Panhandle State | W, 76-14",
 "Final Sep 12 UIW at Northern Arizona | L, 28-38",
 "Final Sep 19 UIW vs Houston Christian | W, 30-23",
 "Final Sep 26 UIW at Texas State | L, 10-63",
 "Final Oct 3 UIW at Stephen F. Austin | L, 26-28",
 "Final Oct 10 UIW at Lamar | L, 35-38",
 "Final Oct 17 UIW vs The University of Texas Rio Grande Valley | W, 41-16",
 "Today Oct 24, 4:00 PM UIW vs McNeese State | ",
 "Upcoming Oct 31, 1:00 PM UIW vs Northwestern State | ",
 "Upcoming Nov 7, 6:00 PM UIW at Southeastern Louisiana | ",
 "Upcoming Nov 14, 2:00 PM UIW vs Nicholls | ",
 "Upcoming Nov 21, 3:00 PM UIW at East Texas A&M | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 22 Women's · UIW at Red Raider Invitational | 8th of 12",
 "Final Sep 28 Women's · UIW at Powercat Classic | 4th of 12",
 "Final Oct 12 Women's · UIW at Golf Iconic Classic | 9th of 19",
 "Upcoming Feb 2 Women's · UIW at Texas State | ",
 "Upcoming Feb 8 Women's · UIW at Golf Club of Houston Invitational | ",
 "Upcoming Feb 15 Women's · UIW at Texas Golf Throwdown | ",
 "Upcoming Mar 1 Women's · UIW at West Texas Classic | ",
 "Upcoming Mar 9 Women's · UIW at Alamo Invitational | ",
 "Upcoming Mar 29 Women's · UIW at ULM Invitational | ",
 "Upcoming Apr 5 Women's · UIW at Spring Shootout | ",
 "Upcoming Apr 19 Women's · UIW at Southland Conference Championship | ",
 "Upcoming May 10 Women's · UIW at NCAA Championships | ",
 "Upcoming May 21 Women's · UIW at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · UIW at Wildcat Invitational | T9th of 15",
 "Final Sep 21 Men's · UIW at Bayou City Collegiate | 11th of 13",
 "Final Oct 12 Men's · UIW at Bubba Barnett Intercollegiate | 3rd of 17",
 "Upcoming Feb 8 Men's · UIW at Bentwater Intercollegiate | ",
 "Upcoming Feb 21 Men's · UIW at Lonestar Shootout | ",
 "Upcoming Mar 1 Men's · UIW at Colin Montgomerie Invitational | ",
 "Upcoming Mar 15 Men's · UIW at All-American Intercollegiate | ",
 "Upcoming Apr 5 Men's · UIW at Memphis Intercollegiate | ",
 "Upcoming Apr 26 Men's · UIW at Southland Conference Championship | ",
 "Upcoming May 17 Men's · UIW at NCAA Regionals | ",
 "Upcoming May 28 Men's · UIW at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Women's · UIW at Texas A&M (Exhibition) | L, 0-3",
 "Final Aug 12 Women's · UIW at Prairie View A&M | W, 1-0",
 "Final Aug 16 Women's · UIW vs Texas A&M-San Antonio | W, 9-0",
 "Final Aug 20 Women's · UIW vs Texas Southern | W, 2-1",
 "Final Aug 23 Women's · UIW at SMU | L, 1-5",
 "Final Aug 27 Women's · UIW at Miami | L, 1-2",
 "Final Aug 30 Women's · UIW at Texas | L, 0-6",
 "Final Sep 3 Women's · UIW vs Tarleton State | T, 0-0",
 "Final Sep 10 Women's · UIW at UTSA | L, 1-3",
 "Final Sep 13 Women's · UIW vs Abilene Christian | T, 0-0",
 "Final Sep 17 Women's · UIW vs East Texas A&M | W, 2-1",
 "Final Sep 24 Women's · UIW at Nicholls | L, 0-1",
 "Final Sep 27 Women's · UIW at Southeastern Louisiana | W, 2-1",
 "Final Oct 2 Women's · UIW vs Northwestern State | W, 2-0",
 "Final Oct 8 Women's · UIW vs Texas A&M - Corpus Christi | W, 3-0",
 "Final Oct 15 Women's · UIW at Lamar | L, 0-1",
 "Final Oct 22 Women's · UIW at McNeese State | W, 2-1",
 "Upcoming Oct 25, 1:00 PM Women's · UIW vs The University of Texas Rio Grande Valley | ",
 "Upcoming Nov 1, 1:00 PM Women's · UIW at Stephen F. Austin | ",
 "Upcoming Nov 5, 7:00 PM Women's · UIW vs Houston Christian | ",
 "Upcoming Nov 10 Women's · UIW at Southland Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UIW vs Massachusetts Lowell | T, 1-1",
 "Final Aug 23 Men's · UIW vs Jacksonville | L, 1-5",
 "Final Aug 28 Men's · UIW at Tulsa | L, 1-2",
 "Final Sep 4 Men's · UIW vs Our Lady of the Lake | W, 3-1",
 "Final Sep 7 Men's · UIW at SMU | L, 0-3",
 "Final Sep 18 Men's · UIW vs Florida Gulf Coast | L, 0-3",
 "Final Sep 26 Men's · UIW at Houston Christian | L, 1-2",
 "Final Oct 1 Men's · UIW at Lindenwood | L, 0-2",
 "Final Oct 4 Men's · UIW vs The University of Texas Rio Grande Valley | W, 2-1",
 "Final Oct 8 Men's · UIW vs SIUE | T, 1-1",
 "Final Oct 11 Men's · UIW vs Southern Indiana | W, 4-2",
 "Final Oct 15 Men's · UIW at Eastern Illinois | W, 2-1",
 "Final Oct 18 Men's · UIW at Western Illinois | W, 1-0",
 "Upcoming Oct 25, 6:00 PM Men's · UIW vs Houston Christian | ",
 "Upcoming Oct 29, 6:30 PM Men's · UIW at The University of Texas Rio Grande Valley | ",
 "Upcoming Nov 1, 11:30 AM Men's · UIW vs Lindenwood | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · UIW vs TCU | L, 130-169",
 "Final Oct 2 Women's · UIW at SMU | L, 78-211",
 "Final Oct 2 Women's · UIW at Oklahoma Christian | W, 177-110",
 "Final Oct 9 Women's · UIW at Rice Fall Splash | Completed",
 "Upcoming Nov 20 Women's · UIW at Cardinal Invitational | ",
 "Upcoming Nov 20 Women's · UIW at Trinity Invitational (Diving Only) | ",
 "Upcoming Jan 16, 2:00 PM Women's · UIW vs Trinity (Texas) | ",
 "Upcoming Jan 30, 11:00 AM Women's · UIW at Sterkel Invite | ",
 "Upcoming Feb 16 Women's · UIW at MPSF Diving Championships | ",
 "Upcoming Feb 17 Women's · UIW at MPSF Swimming Championships | ",
 "Upcoming Mar 9 Women's · UIW at NCAA Zone \"D\" Diving Championship | ",
 "Upcoming Mar 17 Women's · UIW at NCAA Swimming and Diving Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · UIW vs TCU | Completed",
 "Final Oct 2 Men's · UIW at SMU | L, 91-192",
 "Final Oct 2 Men's · UIW at Oklahoma Christian | W, 195-87",
 "Final Oct 9 Men's · UIW at Rice Fall Splash | Completed",
 "Upcoming Nov 20 Men's · UIW at Cardinal Invitational | ",
 "Upcoming Nov 20 Men's · UIW at Trinity Invitational (Diving Only) | ",
 "Upcoming Jan 16, 2:00 PM Men's · UIW vs Trinity (Texas) | ",
 "Upcoming Jan 30, 11:00 AM Men's · UIW at Sterkel Invite | ",
 "Upcoming Feb 16 Men's · UIW at MPSF Diving Championships | ",
 "Upcoming Feb 17 Men's · UIW at MPSF Swimming Championships | ",
 "Upcoming Mar 9 Men's · UIW at NCAA Zone \"D\" Diving Championship | ",
 "Upcoming Mar 24 Men's · UIW at NCAA Swimming and Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · UIW at Jake Frederick Memorial Islander Open | No Team Score",
 "Final Sep 18 Women's · UIW at Kimbell Memorial Invitational | No Team Score",
 "Final Sep 25 Women's · UIW at Rice Invitational | No Team Score",
 "Final Oct 8 Women's · UIW at ITA Regionals | No Team Score",
 "Upcoming Nov 5 Women's · UIW at ITA Central Sectional Championships | ",
 "Upcoming Nov 5 Women's · UIW at ITA Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UIW at Jake Frederick Memorial Islander Open | No Team Score",
 "Final Sep 18 Men's · UIW at Trinity Invitational | No Team Score",
 "Final Oct 1 Men's · UIW at U.S. College Cup | No Team Score",
 "Final Oct 8 Men's · UIW at TCU Regionals | No Team Score",
 "Final Oct 16 Men's · UIW at Ralph O'Connor Invitational | No Team Score",
 "Today Oct 23 Men's · UIW at Southland Conference Fall Tournament | ",
 "Upcoming Oct 30 Men's · UIW at SMU Invitational | ",
 "Upcoming Nov 5 Men's · UIW at ITA Masters | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · UIW at Evelyn LeTourneau Invitational | ",
 "Upcoming Jan 15 Women's · UIW at RG LeTourneau Invitational | ",
 "Upcoming Jan 23 Women's · UIW at Ted Nelson Invitational | ",
 "Upcoming Feb 12 Women's · UIW at Texas Tech Jarvis Scott Invitational | ",
 "Upcoming Feb 26 Women's · UIW at SLC Indoor Championships | ",
 "Upcoming Mar 12 Women's · UIW at NCAA Indoor National Championships | ",
 "Upcoming Mar 19 Women's · UIW at UTSA Invitational | ",
 "Upcoming Mar 26 Women's · UIW at Charles Austin Classic | ",
 "Upcoming Apr 1 Women's · UIW at Texas State Bobcat Invitational | ",
 "Upcoming Apr 1 Women's · UIW at Texas Relays | ",
 "Upcoming Apr 8 Women's · UIW at Texas A&M 44-Farms Invitational | ",
 "Upcoming Apr 15 Women's · UIW at Azusa Pacific Bryan Clay Invitational | ",
 "Upcoming Apr 16 Women's · UIW at Baylor Michael Johnson Invitational | ",
 "Upcoming Apr 24 Women's · UIW at Rice Fred Duckett Invitational | ",
 "Upcoming May 6 Women's · UIW at SLC Outdoor Championships | ",
 "Upcoming May 26 Women's · UIW at NCAA First Round Championships | ",
 "Upcoming Jun 9 Women's · UIW at NCAA National Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 4 Men's · UIW at Evelyn LeTourneau Invitational | ",
 "Upcoming Jan 15 Men's · UIW at RG LeTourneau Invitational | ",
 "Upcoming Jan 23 Men's · UIW at Ted Nelson Invitational | ",
 "Upcoming Feb 12 Men's · UIW at Texas Tech Jarvis Scott Invitational | ",
 "Upcoming Feb 26 Men's · UIW at SLC Indoor Championships | ",
 "Upcoming Mar 12 Men's · UIW at NCAA Indoor National Championships | ",
 "Upcoming Mar 19 Men's · UIW at UTSA Invitational | ",
 "Upcoming Mar 26 Men's · UIW at Charles Austin Classic | ",
 "Upcoming Apr 1 Men's · UIW at Texas State Bobcat Invitational | ",
 "Upcoming Apr 1 Men's · UIW at Texas Relays | ",
 "Upcoming Apr 8 Men's · UIW at Texas A&M 44-Farms Invitational | ",
 "Upcoming Apr 15 Men's · UIW at Azusa Pacific Bryan Clay Invitational | ",
 "Upcoming Apr 16 Men's · UIW at Baylor Michael Johnson Invitational | ",
 "Upcoming Apr 24 Men's · UIW at Rice Fred Duckett Invitational | ",
 "Upcoming May 6 Men's · UIW at SLC Outdoor Championships | ",
 "Upcoming May 26 Men's · UIW at NCAA First Round Championships | ",
 "Upcoming Jun 9 Men's · UIW at NCAA National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UIW vs Houston | L, 0-3",
 "Final Aug 29 UIW at Louisiana State | L, 1-3",
 "Final Sep 3 UIW at UTSA | L, 2-3",
 "Final Sep 5 UIW vs Tarleton State | W, 3-1",
 "Final Sep 10 UIW vs Missouri State | L, 1-3",
 "Final Sep 11 UIW vs Southern Illinois | W, 3-0",
 "Final Sep 11 UIW at Iowa | L, 1-3",
 "Final Sep 16 UIW at Baylor | L, 1-3",
 "Final Sep 17 UIW vs UTEP | L, 1-3",
 "Final Sep 24 UIW vs East Texas A&M | W, 3-1",
 "Final Sep 26 UIW vs Northwestern State | W, 3-1",
 "Final Oct 1 UIW at The University of Texas Rio Grande Valley | L, 1-3",
 "Final Oct 3 UIW at Texas A&M - Corpus Christi | W, 3-0",
 "Final Oct 8 UIW at Stephen F. Austin | W, 3-2",
 "Final Oct 10 UIW at Lamar | W, 3-0",
 "Final Oct 14 UIW vs Southeastern Louisiana | L, 2-3",
 "Final Oct 17 UIW at New Orleans | W, 3-0",
 "Final Oct 22 UIW vs McNeese State | W, 3-2",
 "Today Oct 24, 1:00 PM UIW vs Nicholls | ",
 "Upcoming Oct 29, 6:30 PM UIW at East Texas A&M | ",
 "Upcoming Oct 31, 1:00 PM UIW at Northwestern State | ",
 "Upcoming Nov 4, 6:30 PM UIW at Houston Christian | ",
 "Upcoming Nov 7, 1:00 PM UIW vs Houston Christian | ",
 "Upcoming Nov 12, 6:00 PM UIW vs The University of Texas Rio Grande Valley | ",
 "Upcoming Nov 14, 11:00 AM UIW vs Texas A&M - Corpus Christi | ",
 "Upcoming Nov 20 UIW at Southland Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Incarnate Word module checks passed");
