import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southernSchool} from '../src/schools/southern.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southern');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southernHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southern-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gojagsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southern'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southernSchool.scheduleUrls],['roster',southernSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southern|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gojagsports.com',`${key} must stay on gojagsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gojagsports.com/sports/baseball/schedule"],"roster":["https://gojagsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gojagsports.com/sports/mens-basketball/schedule","https://gojagsports.com/sports/womens-basketball/schedule"],"roster":["https://gojagsports.com/sports/mens-basketball/roster","https://gojagsports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://gojagsports.com/sports/womens-bowling/schedule"],"roster":["https://gojagsports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://gojagsports.com/sports/combined-cross-country/schedule"],"roster":["https://gojagsports.com/sports/combined-cross-country/roster"],"combined":false},"Football":{"schedule":["https://gojagsports.com/sports/football/schedule"],"roster":["https://gojagsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gojagsports.com/sports/womens-golf/schedule","https://gojagsports.com/sports/mens-golf/schedule"],"roster":["https://gojagsports.com/sports/womens-golf/roster","https://gojagsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gojagsports.com/sports/womens-soccer/schedule"],"roster":["https://gojagsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gojagsports.com/sports/softball/schedule"],"roster":["https://gojagsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gojagsports.com/sports/womens-tennis/schedule","https://gojagsports.com/sports/mens-tennis/schedule"],"roster":["https://gojagsports.com/sports/womens-tennis/roster","https://gojagsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gojagsports.com/sports/track-and-field/schedule"],"roster":["https://gojagsports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gojagsports.com/sports/womens-volleyball/schedule"],"roster":["https://gojagsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southern|"+sport+"':"),`${sport} routes must live in the Southern module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://gojagsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southernHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southern)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · Southern at McNeese State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Southern at SMU | ",
 "Upcoming Nov 6 Men's · Southern at TCU | ",
 "Upcoming Nov 8 Men's · Southern at Drake | ",
 "Upcoming Nov 10 Men's · Southern at Iowa State | ",
 "Upcoming Nov 12, 7:00 PM Men's · Southern at Minnesota | ",
 "Upcoming Nov 17, 11:00 AM Men's · Southern vs Louisiana Christian | ",
 "Upcoming Nov 25, 4:00 PM Men's · Southern at Nebraska | ",
 "Upcoming Nov 27, 1:00 PM Men's · Southern at Vanderbilt | ",
 "Upcoming Dec 1, 11:00 AM Men's · Southern vs Champion Christian College | ",
 "Upcoming Dec 5 Men's · Southern at Fresno State | ",
 "Upcoming Dec 16, 9:30 PM Men's · Southern at Oregon | ",
 "Upcoming Dec 18 Men's · Southern at Pacific | ",
 "Upcoming Dec 20 Men's · Southern at California | ",
 "Upcoming Dec 28, 2:00 PM Men's · Southern vs Southern University at New Orleans | ",
 "Upcoming Jan 2 Men's · Southern at Texas Southern | ",
 "Upcoming Jan 4, 7:00 PM Men's · Southern at Prairie View A&M | ",
 "Upcoming Jan 9 Men's · Southern vs Florida A&M | ",
 "Upcoming Jan 11, 6:00 PM Men's · Southern vs Bethune-Cookman | ",
 "Upcoming Jan 16, 2:30 PM Men's · Southern vs Grambling State | ",
 "Upcoming Jan 23 Men's · Southern at Arkansas - Pine Bluff | ",
 "Upcoming Jan 25 Men's · Southern at Mississippi Valley State | ",
 "Upcoming Jan 30 Men's · Southern vs Alcorn State | ",
 "Upcoming Feb 1 Men's · Southern vs Jackson State | ",
 "Upcoming Feb 6 Men's · Southern at Alabama A&M | ",
 "Upcoming Feb 8 Men's · Southern at Alabama State | ",
 "Upcoming Feb 13, 2:30 PM Men's · Southern vs Prairie View A&M | ",
 "Upcoming Feb 15 Men's · Southern vs Texas Southern | ",
 "Upcoming Feb 20, 2:30 PM Men's · Southern at Grambling State | ",
 "Upcoming Feb 25 Men's · Southern at Florida A&M | ",
 "Upcoming Feb 27 Men's · Southern at Bethune-Cookman | ",
 "Upcoming Mar 2 Men's · Southern vs Alabama State | ",
 "Upcoming Mar 4 Men's · Southern vs Alabama A&M | ",
 "Upcoming Mar 8 Men's · Southern at 2027 Pepsi SWAC Basketball Tournament presented by Buick | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Southern at Oklahoma State | ",
 "Upcoming Nov 7 Women's · Southern at Illinois | ",
 "Upcoming Nov 10 Women's · Southern at Minnesota | ",
 "Upcoming Nov 13, 11:00 AM Women's · Southern vs Louisiana Christian | ",
 "Upcoming Nov 18 Women's · Southern at Notre Dame | ",
 "Upcoming Nov 25 Women's · Southern vs Syracuse | ",
 "Upcoming Nov 26 Women's · Southern vs Auburn | ",
 "Upcoming Nov 30 Women's · Southern at Oregon State | ",
 "Upcoming Dec 2 Women's · Southern at Oregon | ",
 "Upcoming Dec 5 Women's · Southern at Colorado State | ",
 "Upcoming Dec 10 Women's · Southern at Washington | ",
 "Upcoming Dec 13 Women's · Southern at Iowa | ",
 "Upcoming Dec 20, 2:00 PM Women's · Southern vs Mobile (Ala.) | ",
 "Upcoming Jan 2 Women's · Southern at Texas Southern | ",
 "Upcoming Jan 4 Women's · Southern at Prairie View A&M | ",
 "Upcoming Jan 7, 6:00 PM Women's · Southern vs Bethune-Cookman | ",
 "Upcoming Jan 9, 2:30 PM Women's · Southern vs Florida A&M | ",
 "Upcoming Jan 16, 12:00 PM Women's · Southern vs Grambling State | ",
 "Upcoming Jan 21 Women's · Southern at Mississippi Valley State | ",
 "Upcoming Jan 23 Women's · Southern at Arkansas - Pine Bluff | ",
 "Upcoming Jan 28, 6:00 PM Women's · Southern vs Jackson State | ",
 "Upcoming Jan 30, 2:30 PM Women's · Southern vs Alcorn State | ",
 "Upcoming Feb 4 Women's · Southern at Alabama State | ",
 "Upcoming Feb 6 Women's · Southern at Alabama A&M | ",
 "Upcoming Feb 11, 6:00 PM Women's · Southern vs Texas Southern | ",
 "Upcoming Feb 13, 12:00 PM Women's · Southern vs Prairie View A&M | ",
 "Upcoming Feb 20, 12:00 PM Women's · Southern at Grambling State | ",
 "Upcoming Feb 25 Women's · Southern at Florida A&M | ",
 "Upcoming Feb 27 Women's · Southern at Bethune-Cookman | ",
 "Upcoming Mar 2, 5:00 PM Women's · Southern vs Alabama State | ",
 "Upcoming Mar 4, 5:00 PM Women's · Southern vs Alabama A&M | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 Southern vs Emmanuel | L, 806-867",
 "Final Oct 9 Southern vs North Carolina A&T | L, 756-918",
 "Final Oct 9 Southern vs Florida A&M | L, 858-911",
 "Final Oct 9 Southern vs Alabama State | L, 775-1024",
 "Final Oct 9 Southern vs UAB | L, 816-951",
 "Final Oct 10 Southern vs Oklahoma Christian | L, 719-862",
 "Final Oct 10 Southern vs Jackson State | W, 897-860",
 "Final Oct 10 Southern vs Alabama A&M | W, 864-814",
 "Final Oct 10 Southern vs Louisiana Tech | L, 790-1036",
 "Final Oct 10 Southern vs Texas Southern | L, 807-853",
 "Final Oct 11 Southern vs Prairie View A&M (Game 1) | W, 4-1",
 "Final Oct 11 Southern vs Oklahoma Christian | L, 2-4",
 "Final Oct 11 Southern vs Prairie View A&M (Game 2) | W, 4-1",
 "Upcoming Oct 30 Southern at Destination Orlando | ",
 "Upcoming Nov 13 Southern at Track Kat Klash | ",
 "Upcoming Jan 15 Southern at SWAC West Round-Up | ",
 "Upcoming Feb 5 Southern at SWAC East Round-Up | ",
 "Upcoming Feb 12 Southern at TNBA Open | ",
 "Upcoming Mar 5 Southern at Music City Classic | ",
 "Upcoming Mar 18 Southern at SWAC Championship | ",
 "Upcoming Apr 6 Southern at NCAA Championships | "
]);
  const v_combinedcrosscountry=parse("Cross Country","combined-cross-country");
  assert.deepEqual(v_combinedcrosscountry.map(line),[
 "Final Sep 4 Southern at Battle for New Orleans | Women's team: 9th / Men's team: 7th",
 "Final Sep 18 Southern at LSU Invitational | Completed",
 "Final Sep 26 Southern at McNeese Cowboy Stampede | Completed",
 "Final Oct 3 Southern at Nicholls XC Invitational Presented by Walk-On's | Completed",
 "Upcoming Oct 27 Southern at SWAC XC Championships | ",
 "Upcoming Nov 13 Southern at NCAA XC Regionals | ",
 "Upcoming Nov 21 Southern at NCAA XC Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Southern vs Alabama State | L, 17-30",
 "Final Sep 5 Southern vs Kentucky State | W, 34-15",
 "Final Sep 12 Southern at Houston | L, 6-77",
 "Final Sep 19 Southern vs Louisiana Christian | W, 50-31",
 "Final Sep 26 Southern at Jackson State | L, 17-35",
 "Final Oct 3 Southern vs Arkansas - Pine Bluff | L, 10-41",
 "Final Oct 10 Southern at Prairie View A&M | W, 28-14",
 "Today Oct 24, 2:00 PM Southern at Texas Southern | ",
 "Upcoming Oct 31, 2:00 PM Southern at Florida A&M | ",
 "Upcoming Nov 7, 2:00 PM Southern vs Bethune-Cookman | ",
 "Upcoming Nov 14, 2:00 PM Southern vs Alcorn State | ",
 "Upcoming Nov 28, 1:00 PM Southern vs Grambling State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Southern at Tulane Classic | 10th of 12",
 "Final Sep 21 Women's · Southern at Thomas W. Dortch, Jr. HBCU Golf Classic | 5th of 8",
 "Final Sep 28 Women's · Southern at Northern Kentucky University Fall Invitational | 8th of 11",
 "Upcoming Nov 2 Women's · Southern at TSU Tiger Fall Classic | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Southern at TheeILove Intercollegiate | 5th of 10",
 "Final Sep 21 Men's · Southern at Thomas W. Dortch, Jr. HBCU Golf Classic | 1st of 6",
 "Final Oct 19 Men's · Southern at LaTour Intercollegiate | Completed",
 "Upcoming Nov 9 Men's · Southern at SWAC Fall Invitational | ",
 "Upcoming Feb 8 Men's · Southern at Bentwater Intercollegiate | ",
 "Upcoming Feb 22 Men's · Southern at Arcis HBCU Golf Championship | ",
 "Upcoming Feb 27 Men's · Southern at In Good Standing Classic | ",
 "Upcoming Mar 15 Men's · Southern at Cutter Creek Intercollegiate | ",
 "Upcoming Apr 5 Men's · Southern at Robinson Invitational | ",
 "Upcoming Apr 12 Men's · Southern at SWAC Golf Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Southern vs Florida Gulf Coast | L, 0-4",
 "Final Aug 27 Southern at SMU | L, 0-4",
 "Final Aug 30 Southern vs Spring Hill College (Ala.) | W, 3-1",
 "Final Sep 3 Southern vs Southeastern Louisiana | L, 1-3",
 "Final Sep 6 Southern at Southern Mississippi | L, 0-8",
 "Final Sep 11 Southern at Houston Christian | L, 1-3",
 "Final Sep 15 Southern vs Louisiana | L, 0-5",
 "Final Sep 18 Southern vs West Florida | T, 1-1",
 "Final Sep 27 Southern at Jackson State | L, 0-3",
 "Final Oct 1 Southern vs Arkansas - Pine Bluff | W, 8-0",
 "Final Oct 8 Southern at Texas Southern | T, 1-1",
 "Final Oct 11 Southern vs Prairie View A&M | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Southern vs Alabama State | ",
 "Upcoming Nov 1, 1:00 PM Southern at Alabama A&M | ",
 "Upcoming Nov 5, 7:00 PM Southern vs Grambling State | ",
 "Upcoming Nov 12 Southern at SWAC TOURNAMENT | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 8 Women's · Southern at ITA Regionals - LSU | Completed",
 "Final Oct 19 Women's · Southern at SWAC Fall Tournament | Completed"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Upcoming Oct 30 Men's · Southern at Fall 2026 | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Southern vs Jacksonville | L, 0-3",
 "Final Aug 28 Southern vs Southern Miss. | L, 0-3",
 "Final Aug 29 Southern at Jacksonville State | L, 1-3",
 "Final Sep 8 Southern at Southeastern | W, 3-1",
 "Final Sep 11 Southern vs Lamar | L, 0-3",
 "Final Sep 11 Southern vs Houston Christian | L, 1-3",
 "Final Sep 12 Southern at Southern Miss | L, 0-3",
 "Final Sep 15 Southern at SUNO | W, 3-1",
 "Final Sep 18 Southern vs Jacksonville State | L, 0-3",
 "Final Sep 18 Southern vs Nicholls | L, 2-3",
 "Final Sep 19 Southern at Alabama | L, 0-3",
 "Final Sep 22 Southern vs Texas A&M - Corpus Christi | W, 3-0",
 "Final Sep 25 Southern vs Arkansas - Pine Bluff | W, 3-2",
 "Final Sep 27 Southern vs Grambling | L, 0-3",
 "Final Oct 2 Southern at Prairie View A&M | L, 0-3",
 "Final Oct 4 Southern at Texas Southern | W, 3-1",
 "Final Oct 7 Southern vs Alcorn State | L, 1-3",
 "Final Oct 9 Southern vs Mississippi Valley | W, 3-1",
 "Final Oct 11 Southern vs Jackson State | L, 1-3",
 "Final Oct 21 Southern vs Dillard | W, 3-0",
 "Upcoming Oct 25, 11:00 AM Southern at Bethune-Cookman | ",
 "Upcoming Oct 26, 11:00 AM Southern at Florida A&M | ",
 "Upcoming Oct 28, 6:00 PM Southern at Alcorn State | ",
 "Upcoming Oct 30, 6:00 PM Southern vs Texas Southern | ",
 "Upcoming Nov 1, 12:00 PM Southern vs Prairie View A&M | ",
 "Upcoming Nov 6, 6:00 PM Southern at Arkansas - Pine Bluff | ",
 "Upcoming Nov 8, 12:00 PM Southern at Grambling | ",
 "Upcoming Nov 13, 6:00 PM Southern at Alabama A&M | ",
 "Upcoming Nov 15, 12:00 PM Southern at Alabama State | ",
 "Upcoming Nov 20 Southern at SWAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southern module checks passed");
