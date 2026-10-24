import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {prairieViewAmSchool} from '../src/schools/prairie-view-am.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='prairie-view-am');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,prairieViewAmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/prairie-view-am-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit pvpanthers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['prairie-view-am'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',prairieViewAmSchool.scheduleUrls],['roster',prairieViewAmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('prairie-view-am|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'pvpanthers.com',`${key} must stay on pvpanthers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://pvpanthers.com/sports/baseball/schedule"],"roster":["https://pvpanthers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://pvpanthers.com/sports/mens-basketball/schedule","https://pvpanthers.com/sports/womens-basketball/schedule"],"roster":["https://pvpanthers.com/sports/mens-basketball/roster","https://pvpanthers.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://pvpanthers.com/sports/womens-bowling/schedule"],"roster":["https://pvpanthers.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://pvpanthers.com/sports/womens-cross-country/schedule","https://pvpanthers.com/sports/mens-cross-country/schedule"],"roster":["https://pvpanthers.com/sports/womens-cross-country/roster","https://pvpanthers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://pvpanthers.com/sports/football/schedule"],"roster":["https://pvpanthers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://pvpanthers.com/sports/womens-golf/schedule","https://pvpanthers.com/sports/mens-golf/schedule"],"roster":["https://pvpanthers.com/sports/womens-golf/roster","https://pvpanthers.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://pvpanthers.com/sports/womens-soccer/schedule"],"roster":["https://pvpanthers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://pvpanthers.com/sports/softball/schedule"],"roster":["https://pvpanthers.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://pvpanthers.com/sports/womens-track-and-field/schedule","https://pvpanthers.com/sports/mens-track-and-field/schedule"],"roster":["https://pvpanthers.com/sports/womens-track-and-field/roster","https://pvpanthers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://pvpanthers.com/sports/womens-volleyball/schedule"],"roster":["https://pvpanthers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'prairie-view-am|"+sport+"':"),`${sport} routes must live in the Prairie View A&M module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://pvpanthers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.prairieViewAmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=prairie-view-am)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · Prairie View A&M vs Paul Quinn College | ",
 "Upcoming Nov 5, 6:00 PM Men's · Prairie View A&M vs College of Biblical Studies | ",
 "Upcoming Nov 7 Men's · Prairie View A&M at Texas - Rio Grande Valley | ",
 "Upcoming Nov 10 Men's · Prairie View A&M at SMU | ",
 "Upcoming Nov 13 Men's · Prairie View A&M at Vanderbilt | ",
 "Upcoming Nov 16 Men's · Prairie View A&M at Ohio State | ",
 "Upcoming Nov 25 Men's · Prairie View A&M at Marshall | ",
 "Upcoming Nov 28 Men's · Prairie View A&M at Iowa | ",
 "Upcoming Dec 5, 3:00 PM Men's · Prairie View A&M vs Jarvis Christian College | ",
 "Upcoming Dec 9 Men's · Prairie View A&M at Pepperdine | ",
 "Upcoming Dec 11 Men's · Prairie View A&M at San Diego | ",
 "Upcoming Dec 15, 4:00 PM Men's · Prairie View A&M vs Texas College | ",
 "Upcoming Dec 21 Men's · Prairie View A&M at Texas | ",
 "Upcoming Dec 29 Men's · Prairie View A&M at Texas A&M | ",
 "Upcoming Jan 2 Men's · Prairie View A&M vs Grambling State | ",
 "Upcoming Jan 4, 7:00 PM Men's · Prairie View A&M vs Southern | ",
 "Upcoming Jan 9 Men's · Prairie View A&M at Mississippi Valley State | ",
 "Upcoming Jan 11 Men's · Prairie View A&M at Arkansas - Pine Bluff | ",
 "Upcoming Jan 16 Men's · Prairie View A&M vs Jackson State | ",
 "Upcoming Jan 18 Men's · Prairie View A&M vs Alcorn State | ",
 "Upcoming Jan 23 Men's · Prairie View A&M at Alabama State | ",
 "Upcoming Jan 25 Men's · Prairie View A&M at Alabama A&M | ",
 "Upcoming Jan 30 Men's · Prairie View A&M at Texas Southern | ",
 "Upcoming Feb 6 Men's · Prairie View A&M vs Bethune-Cookman | ",
 "Upcoming Feb 8 Men's · Prairie View A&M vs Florida A&M | ",
 "Upcoming Feb 13 Men's · Prairie View A&M at Southern | ",
 "Upcoming Feb 15 Men's · Prairie View A&M at Grambling State | ",
 "Upcoming Feb 18 Men's · Prairie View A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Feb 20 Men's · Prairie View A&M vs Mississippi Valley State | ",
 "Upcoming Feb 25 Men's · Prairie View A&M at Jackson State | ",
 "Upcoming Feb 27 Men's · Prairie View A&M at Alcorn State | ",
 "Upcoming Mar 4 Men's · Prairie View A&M vs Texas Southern | ",
 "Upcoming Mar 8 Men's · Prairie View A&M at SWAC Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4 Women's · Prairie View A&M vs Wiley | ",
 "Upcoming Nov 12 Women's · Prairie View A&M at Baylor | ",
 "Upcoming Nov 17 Women's · Prairie View A&M vs Texas College | ",
 "Upcoming Nov 20 Women's · Prairie View A&M vs College of Biblical Studies | ",
 "Upcoming Nov 23 Women's · Prairie View A&M at Houston | ",
 "Upcoming Nov 30 Women's · Prairie View A&M vs UNT Dallas | ",
 "Upcoming Dec 4 Women's · Prairie View A&M vs Hofstra | ",
 "Upcoming Dec 9 Women's · Prairie View A&M at Lamar | ",
 "Upcoming Dec 13 Women's · Prairie View A&M at Texas State | ",
 "Upcoming Dec 20 Women's · Prairie View A&M at Rice | ",
 "Upcoming Dec 22 Women's · Prairie View A&M at Texas A&M | ",
 "Upcoming Jan 2 Women's · Prairie View A&M vs Grambling State | ",
 "Upcoming Jan 4, 4:00 PM Women's · Prairie View A&M vs Southern | ",
 "Upcoming Jan 7 Women's · Prairie View A&M at Arkansas - Pine Bluff | ",
 "Upcoming Jan 9 Women's · Prairie View A&M at Mississippi Valley State | ",
 "Upcoming Jan 14 Women's · Prairie View A&M vs Alcorn State | ",
 "Upcoming Jan 16 Women's · Prairie View A&M vs Jackson State | ",
 "Upcoming Jan 21 Women's · Prairie View A&M at Alabama A&M | ",
 "Upcoming Jan 23 Women's · Prairie View A&M at Alabama State | ",
 "Upcoming Jan 30 Women's · Prairie View A&M at Texas Southern | ",
 "Upcoming Feb 4 Women's · Prairie View A&M vs Florida A&M | ",
 "Upcoming Feb 6 Women's · Prairie View A&M vs Bethune-Cookman | ",
 "Upcoming Feb 11 Women's · Prairie View A&M at Grambling State | ",
 "Upcoming Feb 13 Women's · Prairie View A&M at Southern | ",
 "Upcoming Feb 18 Women's · Prairie View A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Feb 20 Women's · Prairie View A&M vs Mississippi Valley State | ",
 "Upcoming Feb 25 Women's · Prairie View A&M at Jackson State | ",
 "Upcoming Feb 27 Women's · Prairie View A&M at Alcorn State | ",
 "Upcoming Mar 4 Women's · Prairie View A&M vs Texas Southern | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 2 Prairie View A&M at Jackson State | L, 733-829",
 "Final Oct 2 Prairie View A&M at Alabama A&M | L, 689-855",
 "Final Oct 2 Prairie View A&M at Emmanuel (Ga.) | L, 804-888",
 "Final Oct 2 Prairie View A&M at North Carolina A&T State | L, 840-986",
 "Final Oct 2 Prairie View A&M at Florida A&M | W, 973-905",
 "Final Oct 3 Prairie View A&M at Texas Southern | W, 864-842",
 "Final Oct 3 Prairie View A&M at Alabama State | L, 857-988",
 "Final Oct 3 Prairie View A&M at Tulane | L, 818-855",
 "Final Oct 3 Prairie View A&M at UAB | L, 800-947",
 "Final Oct 3 Prairie View A&M at Oklahoma Christian | W, 875-767",
 "Final Oct 4 Prairie View A&M at Southern (Game 1) | L, 0-1",
 "Final Oct 4 Prairie View A&M at Louisiana Tech | L, 0-1",
 "Final Oct 4 Prairie View A&M at Southern (Game 2) | L, 0-1",
 "Upcoming Oct 30 Prairie View A&M at Destination Orlando | ",
 "Upcoming Nov 6 Prairie View A&M at Bulldog Classic | ",
 "Upcoming Nov 13 Prairie View A&M at Track Kat Klash | ",
 "Upcoming Jan 15 Prairie View A&M at SWAC West Round Up | ",
 "Upcoming Jan 22 Prairie View A&M at Prairie View Invitational at the ITRC | ",
 "Upcoming Feb 5 Prairie View A&M at SWAC East Round Up | ",
 "Upcoming Feb 26 Prairie View A&M at Stallings Invitational | ",
 "Upcoming Mar 5 Prairie View A&M at Music City Classic | ",
 "Upcoming Mar 12 Prairie View A&M at USBC Collegiate Sectionals | ",
 "Upcoming Mar 19 Prairie View A&M at SWAC Championships | ",
 "Upcoming Apr 6 Prairie View A&M at NCAA Regionals | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Prairie View A&M at Bearkat Twilight | 3rd Place Team Finish",
 "Final Sep 11 Women's · Prairie View A&M at 50th Rice Invitational | Completed",
 "Final Sep 24 Women's · Prairie View A&M at Clifton Gilliard Cross Country Invite | Completed",
 "Final Oct 3 Women's · Prairie View A&M at SU Showdown | Completed",
 "Upcoming Oct 27 Women's · Prairie View A&M at SWAC Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Prairie View A&M at Bearkat Twilight | 3rd Place Team Finish",
 "Final Sep 11 Men's · Prairie View A&M at Texas A&M Invitational | Completed",
 "Final Sep 24 Men's · Prairie View A&M at Clifton Gilliard Cross Country Invite | Completed",
 "Final Oct 17 Men's · Prairie View A&M at DBU Old Glory Gallup | Completed",
 "Upcoming Oct 27 Men's · Prairie View A&M at SWAC Cross Country Championships | ",
 "Upcoming Nov 13 Men's · Prairie View A&M at NCAA South Central Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Prairie View A&M at Tarleton State | L, 30-49",
 "Final Sep 6 Prairie View A&M vs Texas Southern | W, 52-14",
 "Final Sep 12 Prairie View A&M at Baylor | L, 3-44",
 "Final Sep 19 Prairie View A&M vs SFA | L, 10-31",
 "Final Sep 26 Prairie View A&M vs Grambling State | W, 21-14",
 "Final Oct 3 Prairie View A&M at Mississippi Valley State | L, 27-28",
 "Final Oct 10 Prairie View A&M vs Southern | L, 14-28",
 "Final Oct 17 Prairie View A&M vs Alcorn State | W, 41-38",
 "Today Oct 24, 6:00 PM Prairie View A&M at East Texas A&M | ",
 "Upcoming Nov 7, 2:00 PM Prairie View A&M vs Alabama A&M | ",
 "Upcoming Nov 14, 2:00 PM Prairie View A&M at Arkansas - Pine Bluff | ",
 "Upcoming Nov 21, 2:00 PM Prairie View A&M at Alabama State | ",
 "Upcoming Dec 5 Prairie View A&M at SWAC Championship | ",
 "Upcoming Dec 12 Prairie View A&M at Celebration Bowl | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 22 Women's · Prairie View A&M at Red Raider Invitational | Completed",
 "Final Oct 4 Women's · Prairie View A&M at Bradley Coyote Classic | Completed",
 "Final Oct 12 Women's · Prairie View A&M at Big O Classic | Completed",
 "Final Oct 20 Women's · Prairie View A&M at Hawaii | Completed",
 "Upcoming Nov 1 Women's · Prairie View A&M at TSU Tiger Invitational | ",
 "Upcoming Nov 9 Women's · Prairie View A&M at SWAC Fall Tournament | ",
 "Upcoming Feb 1 Women's · Prairie View A&M at Texas State Invitational | ",
 "Upcoming Feb 20 Women's · Prairie View A&M at Arcis HBCU Championship | ",
 "Upcoming Mar 1 Women's · Prairie View A&M at West Texas Classic | ",
 "Upcoming Mar 9 Women's · Prairie View A&M at Husky's Invitational | ",
 "Upcoming Mar 28 Women's · Prairie View A&M at WIGF National Championship | ",
 "Upcoming Apr 12 Women's · Prairie View A&M at SWAC Championship | ",
 "Upcoming May 2 Women's · Prairie View A&M at PGA Works Collegiate Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Prairie View A&M at TheeiLove College Invitational | Completed",
 "Final Sep 21 Men's · Prairie View A&M at Bayou City Collegiate | Completed",
 "Upcoming Nov 4 Men's · Prairie View A&M at Pearl at Kalauao Invitational | ",
 "Upcoming Nov 9 Men's · Prairie View A&M at SWAC Fall Invitational | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Prairie View A&M vs Incarnate Word | L, 0-1",
 "Final Aug 20 Prairie View A&M at Texas Rio Grande Valley | L, 0-4",
 "Final Aug 23 Prairie View A&M at Texas A&M - Corpus Christi | L, 0-2",
 "Final Aug 27 Prairie View A&M at North Dakota State | L, 1-3",
 "Final Aug 30 Prairie View A&M at North Dakota | L, 1-4",
 "Final Sep 3 Prairie View A&M vs Nicholls State | T, 1-1",
 "Final Sep 11 Prairie View A&M vs Tarleton State | L, 0-4",
 "Final Sep 13 Prairie View A&M vs Houston Christian | L, 1-3",
 "Final Sep 20 Prairie View A&M vs Schreiner | W, 3-0",
 "Final Sep 24 Prairie View A&M vs Texas A&M - Victoria | W, 1-0",
 "Final Oct 4 Prairie View A&M at Texas Southern | L, 1-2",
 "Final Oct 8 Prairie View A&M vs Alabama State | L, 0-1",
 "Final Oct 11 Prairie View A&M at Southern | L, 0-2",
 "Final Oct 16 Prairie View A&M vs Grambling State | L, 0-3",
 "Final Oct 22 Prairie View A&M at Alabama A&M | L, 1-3",
 "Upcoming Oct 25, 12:00 PM Prairie View A&M vs Jackson State | ",
 "Upcoming Oct 30, 1:00 PM Prairie View A&M vs Alcorn State | ",
 "Upcoming Nov 5 Prairie View A&M at Arkansas - Pine Bluff | ",
 "Upcoming Nov 11 Prairie View A&M at SWAC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Feb 12 Prairie View A&M at UIW Tournament | ",
 "Upcoming Feb 19, 9:00 AM Prairie View A&M at North Dakota State | ",
 "Upcoming Feb 19, 11:30 AM Prairie View A&M at Rhode Island | ",
 "Upcoming Feb 20, 9:00 AM Prairie View A&M at Rhode Island | ",
 "Upcoming Feb 21, 3:00 PM Prairie View A&M at UTSA | ",
 "Upcoming Feb 23, 1:00 PM Prairie View A&M vs Wiley (Game 1) | ",
 "Upcoming Feb 23, 3:00 PM Prairie View A&M vs Wiley (Game 2) | ",
 "Upcoming Mar 2, 3:00 PM Prairie View A&M vs Sam Houston State | ",
 "Upcoming Mar 5 Prairie View A&M at Abilene Christian Tournament | ",
 "Upcoming Mar 9, 2:00 PM Prairie View A&M vs Boston College | ",
 "Upcoming Mar 12, 3:00 PM Prairie View A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Mar 13, 12:00 PM Prairie View A&M vs Arkansas - Pine Bluff (Game 1) | ",
 "Upcoming Mar 13, 3:00 PM Prairie View A&M vs Arkansas - Pine Bluff (Game 2) | ",
 "Upcoming Mar 16, 3:00 PM Prairie View A&M vs Stephen F. Austin | ",
 "Upcoming Mar 17, 3:00 PM Prairie View A&M vs Texas A&M - Corpus Christi | ",
 "Upcoming Mar 19, 3:00 PM Prairie View A&M at Texas Southern | ",
 "Upcoming Mar 20, 12:00 PM Prairie View A&M at Texas Southern (Game 1) | ",
 "Upcoming Mar 20, 3:00 PM Prairie View A&M at Texas Southern (Game 2) | ",
 "Upcoming Mar 24, 3:00 PM Prairie View A&M at Texas A&M - Corpus Christi | ",
 "Upcoming Mar 26, 3:00 PM Prairie View A&M vs Alcorn | ",
 "Upcoming Mar 27, 12:00 PM Prairie View A&M vs Alcorn (Game 1) | ",
 "Upcoming Mar 27, 3:00 PM Prairie View A&M vs Alcorn (Game 2) | ",
 "Upcoming Mar 30, 3:00 PM Prairie View A&M at Stephen F. Austin | ",
 "Upcoming Apr 2, 5:00 PM Prairie View A&M at Southern | ",
 "Upcoming Apr 3, 12:00 PM Prairie View A&M at Southern (Game 1) | ",
 "Upcoming Apr 3, 3:00 PM Prairie View A&M at Southern (Game 2) | ",
 "Upcoming Apr 6, 1:00 PM Prairie View A&M at Houston Christian (Game 1) | ",
 "Upcoming Apr 6, 3:00 PM Prairie View A&M at Houston Christian (Game 2) | ",
 "Upcoming Apr 9, 3:00 PM Prairie View A&M vs Grambling State | ",
 "Upcoming Apr 10, 12:00 PM Prairie View A&M vs Grambling State (Game 1) | ",
 "Upcoming Apr 10, 3:00 PM Prairie View A&M vs Grambling State (Game 2) | ",
 "Upcoming Apr 13, 3:00 PM Prairie View A&M vs East Texas A&M | ",
 "Upcoming Apr 16, 4:00 PM Prairie View A&M at Alcorn | ",
 "Upcoming Apr 17, 1:00 PM Prairie View A&M at Alcorn (Game 1) | ",
 "Upcoming Apr 17, 3:00 PM Prairie View A&M at Alcorn (Game 2) | ",
 "Upcoming Apr 20, 1:00 PM Prairie View A&M vs Houston Christian (Game 1) | ",
 "Upcoming Apr 20, 3:00 PM Prairie View A&M vs Houston Christian (Game 2) | ",
 "Upcoming Apr 23, 3:00 PM Prairie View A&M vs Texas Southern | ",
 "Upcoming Apr 24, 12:00 PM Prairie View A&M vs Texas Southern (Game 1) | ",
 "Upcoming Apr 24, 3:00 PM Prairie View A&M vs Texas Southern (Game 2) | ",
 "Upcoming Apr 27, 3:00 PM Prairie View A&M vs Northwestern State | ",
 "Upcoming Apr 30, 3:00 PM Prairie View A&M at Arkansas - Pine Bluff | ",
 "Upcoming May 1, 12:00 PM Prairie View A&M at Arkansas - Pine Bluff (Game 1) | ",
 "Upcoming May 1, 3:00 PM Prairie View A&M at Arkansas - Pine Bluff (Game 2) | ",
 "Upcoming May 4 Prairie View A&M at Houston | ",
 "Upcoming May 9 Prairie View A&M at SWAC Championships | ",
 "Upcoming May 19 Prairie View A&M at NCAA Regionals | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Prairie View A&M at Commodore Challenge | ",
 "Upcoming Jan 16 Women's · Prairie View A&M at HBCU Showcase | ",
 "Upcoming Jan 23 Women's · Prairie View A&M at Ted Nelson Invitational | ",
 "Upcoming Jan 29 Women's · Prairie View A&M at Bob Pollock Invitational | ",
 "Upcoming Feb 12 Women's · Prairie View A&M at Jarvis Scott Invite | ",
 "Upcoming Feb 20 Women's · Prairie View A&M at SWAC Championships | ",
 "Upcoming Mar 5 Women's · Prairie View A&M at HBCU Indoor Championship | ",
 "Upcoming Mar 20 Women's · Prairie View A&M at TSU Relays | ",
 "Upcoming Mar 26 Women's · Prairie View A&M at PV Relays | ",
 "Upcoming Mar 31 Women's · Prairie View A&M at 99th Texas Relays | ",
 "Upcoming Apr 10 Women's · Prairie View A&M at Spring Invitational | ",
 "Upcoming Apr 16 Women's · Prairie View A&M at Little Rock Invitational | ",
 "Upcoming Apr 24 Women's · Prairie View A&M at LSU Alumni Gold Invitational | ",
 "Upcoming May 1 Women's · Prairie View A&M at Alumni Muster | ",
 "Upcoming May 5 Women's · Prairie View A&M at SWAC Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Prairie View A&M at Arizona | L, 0-3",
 "Final Aug 29 Prairie View A&M vs California Santa Barbara | L, 0-3",
 "Final Aug 30 Prairie View A&M vs Tarleton State | L, 0-3",
 "Final Sep 4 Prairie View A&M vs Radford | L, 1-3",
 "Final Sep 4 Prairie View A&M at Georgia Southern | L, 0-3",
 "Final Sep 5 Prairie View A&M vs Eastern Kentucky | L, 1-3",
 "Final Sep 10 Prairie View A&M vs Portland State | L, 1-3",
 "Final Sep 10 Prairie View A&M at Texas Tech | L, 2-3",
 "Final Sep 11 Prairie View A&M vs Rio Grande Valley | L, 0-3",
 "Final Sep 15 Prairie View A&M vs Lamar | L, 0-3",
 "Final Sep 18 Prairie View A&M vs SFA | L, 0-3",
 "Final Sep 18 Prairie View A&M at Abilene Christian | L, 1-3",
 "Final Sep 19 Prairie View A&M vs Louisiana Tech | L, 0-3",
 "Final Sep 25 Prairie View A&M at Jackson State | L, 2-3",
 "Final Sep 27 Prairie View A&M at Mississippi Valley | W, 3-0",
 "Final Oct 2 Prairie View A&M vs Southern | W, 3-0",
 "Final Oct 4 Prairie View A&M vs Alcorn State | W, 3-0",
 "Final Oct 9 Prairie View A&M vs Alabama A&M | L, 1-3",
 "Final Oct 11 Prairie View A&M vs Alabama State | W, 3-2",
 "Final Oct 16 Prairie View A&M at Grambling State | W, 3-0",
 "Final Oct 18 Prairie View A&M at Arkansas - Pine bluff | W, 3-0",
 "Final Oct 23 Prairie View A&M vs Texas Southern | L, 0-3",
 "Upcoming Oct 25, 5:00 PM Prairie View A&M at Texas Southern | ",
 "Upcoming Oct 30, 6:00 PM Prairie View A&M at Alcorn State | ",
 "Upcoming Nov 1, 12:00 PM Prairie View A&M at Southern | ",
 "Upcoming Nov 6, 6:00 PM Prairie View A&M vs Bethune-Cookman | ",
 "Upcoming Nov 8, 12:00 PM Prairie View A&M vs Florida A&M | ",
 "Upcoming Nov 13, 6:00 PM Prairie View A&M vs Grambling State | ",
 "Upcoming Nov 15, 12:00 PM Prairie View A&M vs Arkansas - Pine bluff | ",
 "Upcoming Nov 20 Prairie View A&M at Southwestern Athletic Conference Championship Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Prairie View A&M module checks passed");
