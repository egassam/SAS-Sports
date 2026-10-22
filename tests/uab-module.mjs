import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uabSchool} from '../src/schools/uab.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uab');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uabHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uab-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uabsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uab'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',uabSchool.scheduleUrls],['roster',uabSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uab|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uabsports.com',`${key} must stay on uabsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uabsports.com/sports/baseball/schedule"],"roster":["https://uabsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uabsports.com/sports/mens-basketball/schedule","https://uabsports.com/sports/womens-basketball/schedule"],"roster":["https://uabsports.com/sports/mens-basketball/roster","https://uabsports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://uabsports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://uabsports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Bowling":{"schedule":["https://uabsports.com/sports/womens-bowling/schedule"],"roster":["https://uabsports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://uabsports.com/sports/womens-cross-country/schedule"],"roster":["https://uabsports.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://uabsports.com/sports/football/schedule"],"roster":["https://uabsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uabsports.com/sports/womens-golf/schedule","https://uabsports.com/sports/mens-golf/schedule"],"roster":["https://uabsports.com/sports/womens-golf/roster","https://uabsports.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://uabsports.com/sports/rifle/schedule"],"roster":["https://uabsports.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://uabsports.com/sports/womens-soccer/schedule","https://uabsports.com/sports/mens-soccer/schedule"],"roster":["https://uabsports.com/sports/womens-soccer/roster","https://uabsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uabsports.com/sports/softball/schedule"],"roster":["https://uabsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://uabsports.com/sports/womens-tennis/schedule","https://uabsports.com/sports/mens-tennis/schedule"],"roster":["https://uabsports.com/sports/womens-tennis/roster","https://uabsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uabsports.com/sports/womens-track-and-field/schedule"],"roster":["https://uabsports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://uabsports.com/sports/womens-volleyball/schedule"],"roster":["https://uabsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uab|"+sport+"':"),`${sport} routes must live in the UAB module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://uabsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uabHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uab)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 23, 5:00 PM UAB at Alabama (Exhibition) | ",
 "Upcoming Nov 6, 6:00 PM UAB at Auburn (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:30 PM Men's · UAB at Ole Miss (Exhibition) | ",
 "Upcoming Nov 2, 4:00 PM Men's · UAB vs McNeese State | ",
 "Upcoming Nov 6 Men's · UAB vs Nicholls | ",
 "Upcoming Nov 9 Men's · UAB vs Florida A&M | ",
 "Upcoming Nov 14, 6:00 PM Men's · UAB at Jacksonville State | ",
 "Upcoming Nov 17 Men's · UAB vs FIU | ",
 "Upcoming Nov 20, 1:00 PM Men's · UAB vs George Washington | ",
 "Upcoming Nov 22, 6:00 PM Men's · UAB vs Rhode Island | ",
 "Upcoming Nov 27 Men's · UAB vs Auburn Montgomery (Ala.) | ",
 "Upcoming Dec 2 Men's · UAB vs Samford | ",
 "Upcoming Dec 5, 4:15 PM Men's · UAB at Troy | ",
 "Upcoming Dec 8 Men's · UAB vs Belmont | ",
 "Upcoming Dec 12, 4:00 PM Men's · UAB at Western Kentucky | ",
 "Upcoming Dec 17 Men's · UAB vs Middle Tennessee | ",
 "Upcoming Dec 21 Men's · UAB vs UNC Asheville | ",
 "Upcoming Dec 30 Men's · UAB vs Tulane | ",
 "Upcoming Jan 2 Men's · UAB vs East Carolina | ",
 "Upcoming Jan 5 Men's · UAB at Temple | ",
 "Upcoming Jan 8 Men's · UAB at Wichita State | ",
 "Upcoming Jan 14 Men's · UAB vs Florida Atlantic | ",
 "Upcoming Jan 17 Men's · UAB vs Memphis | ",
 "Upcoming Jan 23 Men's · UAB at East Carolina | ",
 "Upcoming Jan 26 Men's · UAB at Charlotte | ",
 "Upcoming Jan 31 Men's · UAB vs Temple | ",
 "Upcoming Feb 4 Men's · UAB at Tulsa | ",
 "Upcoming Feb 7 Men's · UAB at Memphis | ",
 "Upcoming Feb 11 Men's · UAB vs North Texas | ",
 "Upcoming Feb 14 Men's · UAB vs Charlotte | ",
 "Upcoming Feb 21 Men's · UAB at South Florida | ",
 "Upcoming Feb 25 Men's · UAB at Rice | ",
 "Upcoming Feb 28 Men's · UAB vs Tulsa | ",
 "Upcoming Mar 4 Men's · UAB vs UTSA | ",
 "Upcoming Mar 7 Men's · UAB at Florida Atlantic | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 6:00 PM Women's · UAB vs Fisk | ",
 "Upcoming Nov 7 Women's · UAB at South Alabama | ",
 "Upcoming Nov 11, 6:00 PM Women's · UAB vs Stillman | ",
 "Upcoming Nov 19 Women's · UAB at Alabama A&M | ",
 "Upcoming Nov 23, 6:30 PM Women's · UAB vs George Washington | ",
 "Upcoming Nov 24, 8:00 PM Women's · UAB vs Virginia | ",
 "Upcoming Nov 29, 2:00 PM Women's · UAB vs Mississippi Valley State | ",
 "Upcoming Dec 1, 11:00 AM Women's · UAB vs Murray State | ",
 "Upcoming Dec 6, 2:00 PM Women's · UAB vs Southern Miss | ",
 "Upcoming Dec 13, 2:00 PM Women's · UAB vs Chattanooga | ",
 "Upcoming Dec 15, 6:00 PM Women's · UAB vs Arkansas - Pine Bluff | ",
 "Upcoming Dec 19, 2:00 PM Women's · UAB vs Jackson State | ",
 "Upcoming Dec 22, 11:00 AM Women's · UAB vs UT Martin | ",
 "Upcoming Jan 2 Women's · UAB at Wichita State | ",
 "Upcoming Jan 7 Women's · UAB vs Charlotte | ",
 "Upcoming Jan 10 Women's · UAB vs Temple | ",
 "Upcoming Jan 13 Women's · UAB at Tulane | ",
 "Upcoming Jan 16 Women's · UAB vs Memphis | ",
 "Upcoming Jan 20 Women's · UAB vs Rice | ",
 "Upcoming Jan 24 Women's · UAB at UTSA | ",
 "Upcoming Jan 27 Women's · UAB at Temple | ",
 "Upcoming Feb 2 Women's · UAB vs North Texas | ",
 "Upcoming Feb 6 Women's · UAB vs East Carolina | ",
 "Upcoming Feb 10 Women's · UAB at South Florida | ",
 "Upcoming Feb 13 Women's · UAB at Florida Atlantic | ",
 "Upcoming Feb 17 Women's · UAB vs Tulsa | ",
 "Upcoming Feb 21 Women's · UAB at Charlotte | ",
 "Upcoming Feb 24 Women's · UAB at East Carolina | ",
 "Upcoming Feb 27 Women's · UAB vs Wichita State | ",
 "Upcoming Mar 3 Women's · UAB vs Tulane | ",
 "Upcoming Mar 6 Women's · UAB at Memphis | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 UAB at Colonial Lanes Classic | 6th of 14",
 "Final Oct 9 UAB vs Oklahoma Christian | L, 849-850",
 "Final Oct 9 UAB vs Sam Houston | L, 856-865",
 "Final Oct 9 UAB vs Louisiana Tech | L, 855-1051",
 "Final Oct 9 UAB vs Texas Southern | W, 967-807",
 "Final Oct 9 UAB vs Southern | W, 951-816",
 "Final Oct 10 UAB vs Florida A&M | W, 870-760",
 "Final Oct 10 UAB at Tulane | L, 893-928",
 "Final Oct 10 UAB vs Jackson State | L, 875-893",
 "Final Oct 10 UAB vs Prairie View A&M | W, 947-800",
 "Final Oct 10 UAB vs Emmanuel | L, 882-971",
 "Final Oct 11 UAB vs Sam Houston | L, 2-4",
 "Final Oct 11 UAB vs Emmanuel | W, 4-3",
 "Final Oct 11 UAB vs Alabama State | L, 3-4",
 "Upcoming Oct 30 UAB at Destination Florida | ",
 "Upcoming Nov 6 UAB at Bulldog Classic | ",
 "Upcoming Nov 13 UAB at Track Kat Klash | ",
 "Upcoming Jan 15 UAB at Northeast Classic | ",
 "Upcoming Jan 29 UAB at Hammer Saints Invite | ",
 "Upcoming Feb 4 UAB at MEAC Regular Season Meet | ",
 "Upcoming Mar 5 UAB at Music City Classic | ",
 "Upcoming Mar 12 UAB at USBC Sectionals | ",
 "Upcoming Mar 18 UAB at MEAC Championship | ",
 "Upcoming Apr 6 UAB at NCAA Championship | ",
 "Upcoming Apr 12 UAB at USBC Intercollegiate Singles and Team Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 UAB at Foothills Invitational | 3rd of 20",
 "Final Oct 2 UAB at Joe Piane Invitational | 12th of 24",
 "Final Oct 16 UAB at Crimson Classic | 14th of 19",
 "Upcoming Oct 31, 9:15 AM UAB at American Conference Cross Country Championship | ",
 "Upcoming Nov 13 UAB at NCAA South Regional Championship | ",
 "Upcoming Nov 21 UAB at NCAA Cross Country Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 UAB at Illinois | L, 23-42",
 "Final Sep 12 UAB vs ULM | W, 26-20",
 "Final Sep 19 UAB at Louisiana | L, 14-21",
 "Final Sep 25 UAB vs Navy | W, 24-20",
 "Final Oct 3 UAB vs Samford | W, 33-14",
 "Final Oct 10 UAB at Memphis | L, 13-38",
 "Final Oct 15 UAB vs East Carolina | W, 30-17",
 "Upcoming Oct 31, 11:00 AM UAB at South Florida | ",
 "Upcoming Nov 7 UAB vs Charlotte | ",
 "Upcoming Nov 14 UAB at Temple | ",
 "Upcoming Nov 21 UAB vs UTSA | ",
 "Upcoming Nov 28 UAB at North Texas | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UAB at The Velvet | 7th of 14",
 "Final Sep 21 Women's · UAB at Johnie Imes Invitational | T6th of 9",
 "Final Oct 12 Women's · UAB at Lady Red Wolves Classic | 13th of 13",
 "Final Oct 19 Women's · UAB at Braun Intercollegiate | 3rd of 11",
 "Upcoming Oct 26 Women's · UAB at The Judson | ",
 "Upcoming Nov 1 Women's · UAB at Samford Intercollegiate | ",
 "Upcoming Feb 15 Women's · UAB at RiverTowne Invitational | ",
 "Upcoming Mar 7 Women's · UAB at Chris Banister Golf Classic | ",
 "Upcoming Mar 21 Women's · UAB at City of Oaks Collegiate | ",
 "Upcoming Mar 30 Women's · UAB at Mini Mason | ",
 "Upcoming Apr 4 Women's · UAB at Carolina Challenge Cup | ",
 "Upcoming Apr 19 Women's · UAB at American Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 20 Men's · UAB at Graeme McDowell Invitational | 1st of 13",
 "Final Sep 28 Men's · UAB at Bryan Bros Collegiate | 5th of 16",
 "Final Oct 12 Men's · UAB at Moraine Intercollegiate | 6th of 16",
 "Final Oct 16 Men's · UAB at Golf Club of GA Collegiate | 14th of 14",
 "Upcoming Feb 7 Men's · UAB at Compadres Collegiate | ",
 "Upcoming Feb 15 Men's · UAB at Hal Williams Collegiate | ",
 "Upcoming Mar 8 Men's · UAB at Cleveland Golf Palmetto Intercollegiate | ",
 "Upcoming Mar 15 Men's · UAB at Tiger Invitational | ",
 "Upcoming Mar 19 Men's · UAB at Schenkel Invitational | ",
 "Upcoming Apr 12 Men's · UAB at Mossy Oak Collegiate | ",
 "Upcoming Apr 25 Men's · UAB at American Conference Championship | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 18 UAB at Georgia Southern | L, 4568-4740",
 "Upcoming Nov 7, 10:00 AM UAB at Alaska Fairbanks | ",
 "Upcoming Nov 8, 10:00 AM UAB at Akron | ",
 "Upcoming Nov 14, 7:00 AM UAB at Virginia Military Institute | ",
 "Upcoming Nov 21, 8:00 AM UAB at Jacksonville State | ",
 "Upcoming Jan 31, 7:00 AM UAB at The Citadel | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UAB vs Georgia State | W, 4-2",
 "Final Aug 16 Women's · UAB vs Mississippi State | L, 1-2",
 "Final Aug 20 Women's · UAB at Western Kentucky | T, 1-1",
 "Final Aug 23 Women's · UAB vs Ole Miss | L, 0-2",
 "Final Aug 27 Women's · UAB at UCF | L, 1-3",
 "Final Sep 3 Women's · UAB vs Auburn | L, 0-1",
 "Final Sep 6 Women's · UAB at ULM | W, 2-1",
 "Final Sep 10 Women's · UAB at Samford | W, 2-0",
 "Final Sep 17 Women's · UAB at Temple | L, 0-2",
 "Final Sep 24 Women's · UAB vs Florida Atlantic | W, 1-0",
 "Final Sep 27 Women's · UAB at East Carolina | W, 2-1",
 "Final Oct 1 Women's · UAB vs North Texas | W, 3-0",
 "Final Oct 8 Women's · UAB at Rice | W, 3-0",
 "Final Oct 11 Women's · UAB at UTSA | L, 1-2",
 "Today Oct 22, 7:00 PM Women's · UAB vs Tulsa | ",
 "Upcoming Oct 25, 7:00 PM Women's · UAB vs Charlotte | ",
 "Upcoming Oct 30, 6:00 PM Women's · UAB at South Florida | ",
 "Upcoming Nov 3, 7:00 PM Women's · UAB vs Memphis | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UAB vs Lipscomb | T, 1-1",
 "Final Aug 25 Men's · UAB vs Georgia State | L, 0-1",
 "Final Aug 31 Men's · UAB at Mercer | W, 1-0",
 "Final Sep 5 Men's · UAB vs USC Upstate | W, 4-3",
 "Final Sep 11 Men's · UAB vs South Florida | W, 3-2",
 "Final Sep 15 Men's · UAB vs Central Arkansas | W, 2-1",
 "Final Sep 20 Men's · UAB at Charlotte | L, 0-1",
 "Final Sep 23 Men's · UAB vs Gardner-Webb | L, 2-3",
 "Final Oct 2 Men's · UAB vs Tulsa | T, 1-1",
 "Final Oct 6 Men's · UAB vs Belmont | T, 0-0",
 "Final Oct 11 Men's · UAB at Florida International | T, 2-2",
 "Final Oct 17 Men's · UAB at Memphis | T, 1-1",
 "Upcoming Oct 23, 7:00 PM Men's · UAB vs Temple | ",
 "Upcoming Oct 28, 7:00 PM Men's · UAB at Missouri State | ",
 "Upcoming Nov 1, 6:00 PM Men's · UAB vs Florida Atlantic | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · UAB at All-American Championships | Completed",
 "Final Sep 25 Women's · UAB at Samford Invite | Completed",
 "Final Oct 2 Women's · UAB at Blue Gray Classic | Completed",
 "Final Oct 8 Women's · UAB at ITA Southern Regionals | Completed",
 "Today Oct 22 Women's · UAB at American Fall Championships | ",
 "Upcoming Oct 30 Women's · UAB at Roberta Allison Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UAB at Georgia Gwinnett Invite | Completed",
 "Final Oct 8 Men's · UAB at ITA Southern Regionals | Completed",
 "Final Oct 16 Men's · UAB at MTSU Invite | Completed",
 "Today Oct 22 Men's · UAB at American Fall Championship | ",
 "Upcoming Oct 30 Men's · UAB at West Florida Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UAB vs Valparaiso | L, 2-3",
 "Final Aug 29 UAB vs Tennessee State | W, 3-0",
 "Final Aug 29 UAB at Chattanooga | W, 3-1",
 "Final Sep 4 UAB vs East Texas A&M | L, 1-3",
 "Final Sep 4 UAB at St. John's | L, 1-3",
 "Final Sep 5 UAB vs Rider | W, 3-1",
 "Final Sep 11 UAB at Oakland | W, 3-1",
 "Final Sep 11 UAB vs Eastern Michigan | W, 3-1",
 "Final Sep 12 UAB vs Montana | W, 3-0",
 "Final Sep 17 UAB at Auburn | L, 1-3",
 "Final Sep 18 UAB vs South Alabama | L, 1-3",
 "Final Sep 20 UAB at Samford | L, 1-3",
 "Final Sep 25 UAB at Temple | L, 0-3",
 "Final Sep 27 UAB at Rice | L, 2-3",
 "Final Sep 30 UAB at Memphis | L, 1-3",
 "Final Oct 4 UAB vs Tulsa | L, 0-3",
 "Final Oct 9 UAB vs Memphis | W, 3-1",
 "Final Oct 11 UAB at Tulane | L, 1-3",
 "Final Oct 16 UAB vs East Carolina | L, 0-3",
 "Final Oct 18 UAB vs Temple | W, 3-0",
 "Upcoming Oct 23, 6:00 PM UAB at UTSA | ",
 "Upcoming Oct 25, 1:00 PM UAB at North Texas | ",
 "Upcoming Oct 30, 6:30 PM UAB vs Charlotte | ",
 "Upcoming Nov 1, 1:00 PM UAB vs UTSA | ",
 "Upcoming Nov 6, 5:00 PM UAB at Florida Atlantic | ",
 "Upcoming Nov 8, 12:00 PM UAB at South Florida | ",
 "Upcoming Nov 13, 6:30 PM UAB vs North Texas | ",
 "Upcoming Nov 15, 1:00 PM UAB vs Wichita State | ",
 "Upcoming Nov 20 UAB at American Conference Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UAB module checks passed");
