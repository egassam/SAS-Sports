import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {arkansasPineBluffSchool} from '../src/schools/arkansas-pine-bluff.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arkansas-pine-bluff');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,arkansasPineBluffHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/arkansas-pine-bluff-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uapblionsroar.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['arkansas-pine-bluff'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',arkansasPineBluffSchool.scheduleUrls],['roster',arkansasPineBluffSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('arkansas-pine-bluff|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uapblionsroar.com',`${key} must stay on uapblionsroar.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uapblionsroar.com/sports/baseball/schedule"],"roster":["https://uapblionsroar.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uapblionsroar.com/sports/mens-basketball/schedule","https://uapblionsroar.com/sports/womens-basketball/schedule"],"roster":["https://uapblionsroar.com/sports/mens-basketball/roster","https://uapblionsroar.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uapblionsroar.com/sports/womens-cross-country/schedule","https://uapblionsroar.com/sports/mens-cross-country/schedule"],"roster":["https://uapblionsroar.com/sports/womens-cross-country/roster","https://uapblionsroar.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://uapblionsroar.com/sports/football/schedule"],"roster":["https://uapblionsroar.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uapblionsroar.com/sports/womens-golf/schedule","https://uapblionsroar.com/sports/mens-golf/schedule"],"roster":["https://uapblionsroar.com/sports/womens-golf/roster","https://uapblionsroar.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://uapblionsroar.com/sports/womens-soccer/schedule"],"roster":["https://uapblionsroar.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://uapblionsroar.com/sports/softball/schedule"],"roster":["https://uapblionsroar.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://uapblionsroar.com/sports/womens-track-and-field/schedule","https://uapblionsroar.com/sports/mens-track-and-field/schedule"],"roster":["https://uapblionsroar.com/sports/womens-track-and-field/roster","https://uapblionsroar.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://uapblionsroar.com/sports/womens-volleyball/schedule"],"roster":["https://uapblionsroar.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'arkansas-pine-bluff|"+sport+"':"),`${sport} routes must live in the Arkansas-Pine Bluff module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://uapblionsroar.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.arkansasPineBluffHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=arkansas-pine-bluff)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3 Men's · Arkansas-Pine Bluff at Arkansas | ",
 "Upcoming Nov 6 Men's · Arkansas-Pine Bluff at Baylor | ",
 "Upcoming Nov 7 Men's · Arkansas-Pine Bluff at Missouri | ",
 "Upcoming Nov 11 Men's · Arkansas-Pine Bluff at UCLA | ",
 "Upcoming Nov 13 Men's · Arkansas-Pine Bluff at California Baptist | ",
 "Upcoming Nov 15 Men's · Arkansas-Pine Bluff at Southern California | ",
 "Upcoming Nov 18 Men's · Arkansas-Pine Bluff at Arkansas State | ",
 "Upcoming Nov 24 Men's · Arkansas-Pine Bluff at South Dakota State | ",
 "Upcoming Dec 6 Men's · Arkansas-Pine Bluff at Texas A&M | ",
 "Upcoming Dec 9 Men's · Arkansas-Pine Bluff at Murray State | ",
 "Upcoming Dec 12 Men's · Arkansas-Pine Bluff at Eastern Illinois | ",
 "Upcoming Dec 16 Men's · Arkansas-Pine Bluff vs Ecclesia | ",
 "Upcoming Dec 18 Men's · Arkansas-Pine Bluff vs Champion Christian | ",
 "Upcoming Jan 2 Men's · Arkansas-Pine Bluff at Alabama A&M | ",
 "Upcoming Jan 4 Men's · Arkansas-Pine Bluff at Alabama State | ",
 "Upcoming Jan 9 Men's · Arkansas-Pine Bluff vs Texas Southern | ",
 "Upcoming Jan 11 Men's · Arkansas-Pine Bluff vs Prairie View A&M | ",
 "Upcoming Jan 16 Men's · Arkansas-Pine Bluff at Florida A&M | ",
 "Upcoming Jan 23 Men's · Arkansas-Pine Bluff vs Southern | ",
 "Upcoming Jan 25 Men's · Arkansas-Pine Bluff vs Grambling State | ",
 "Upcoming Jan 30 Men's · Arkansas-Pine Bluff vs Mississippi Valley State | ",
 "Upcoming Feb 6 Men's · Arkansas-Pine Bluff vs Alcorn State | ",
 "Upcoming Feb 8 Men's · Arkansas-Pine Bluff at Jackson State | ",
 "Upcoming Feb 13 Men's · Arkansas-Pine Bluff at Alabama State | ",
 "Upcoming Feb 15 Men's · Arkansas-Pine Bluff at Alabama A&M | ",
 "Upcoming Feb 18 Men's · Arkansas-Pine Bluff at Prairie View A&M | ",
 "Upcoming Feb 20 Men's · Arkansas-Pine Bluff at Texas Southern | ",
 "Upcoming Feb 27 Men's · Arkansas-Pine Bluff vs Mississippi Valley State | ",
 "Upcoming Mar 2 Men's · Arkansas-Pine Bluff vs Jackson State | ",
 "Upcoming Mar 4 Men's · Arkansas-Pine Bluff vs Alcorn State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Arkansas-Pine Bluff at Texas A&M | ",
 "Upcoming Nov 4 Women's · Arkansas-Pine Bluff at Tarleton State | ",
 "Upcoming Nov 9, 5:30 PM Women's · Arkansas-Pine Bluff vs Arkansas Baptist College | ",
 "Upcoming Nov 12 Women's · Arkansas-Pine Bluff at Arkansas | ",
 "Upcoming Nov 16 Women's · Arkansas-Pine Bluff at ULM | ",
 "Upcoming Nov 18 Women's · Arkansas-Pine Bluff at Louisiana Tech | ",
 "Upcoming Nov 24, 5:30 PM Women's · Arkansas-Pine Bluff vs East Texas A&M | ",
 "Upcoming Nov 29 Women's · Arkansas-Pine Bluff at Miami | ",
 "Upcoming Dec 1 Women's · Arkansas-Pine Bluff at South Florida | ",
 "Upcoming Dec 5 Women's · Arkansas-Pine Bluff at Saint Louis | ",
 "Upcoming Dec 7, 5:30 PM Women's · Arkansas-Pine Bluff vs Lemoyne-Owen | ",
 "Upcoming Dec 15 Women's · Arkansas-Pine Bluff at UAB | ",
 "Upcoming Dec 19 Women's · Arkansas-Pine Bluff at Texas State | ",
 "Upcoming Dec 20 Women's · Arkansas-Pine Bluff at Tulane | ",
 "Upcoming Jan 2 Women's · Arkansas-Pine Bluff at Alabama A&M | ",
 "Upcoming Jan 4 Women's · Arkansas-Pine Bluff at Alabama State | ",
 "Upcoming Jan 7, 5:30 PM Women's · Arkansas-Pine Bluff vs Prairie View A&M | ",
 "Upcoming Jan 9, 3:00 PM Women's · Arkansas-Pine Bluff vs Texas Southern | ",
 "Upcoming Jan 14 Women's · Arkansas-Pine Bluff at Bethune-Cookman | ",
 "Upcoming Jan 16 Women's · Arkansas-Pine Bluff at Florida A&M | ",
 "Upcoming Jan 21, 5:30 PM Women's · Arkansas-Pine Bluff vs Grambling State | ",
 "Upcoming Jan 23, 3:00 PM Women's · Arkansas-Pine Bluff vs Southern | ",
 "Upcoming Jan 30, 3:00 PM Women's · Arkansas-Pine Bluff vs Mississippi Valley State | ",
 "Upcoming Feb 4 Women's · Arkansas-Pine Bluff at Jackson State | ",
 "Upcoming Feb 6 Women's · Arkansas-Pine Bluff at Alcorn State | ",
 "Upcoming Feb 11, 5:30 PM Women's · Arkansas-Pine Bluff vs Alabama A&M | ",
 "Upcoming Feb 13, 3:00 PM Women's · Arkansas-Pine Bluff vs Alabama State | ",
 "Upcoming Feb 18 Women's · Arkansas-Pine Bluff at Texas Southern | ",
 "Upcoming Feb 20 Women's · Arkansas-Pine Bluff at Prairie View A&M | ",
 "Upcoming Feb 27 Women's · Arkansas-Pine Bluff at Mississippi Valley State | ",
 "Upcoming Mar 2, 5:30 PM Women's · Arkansas-Pine Bluff vs Jackson State | ",
 "Upcoming Mar 4, 5:30 PM Women's · Arkansas-Pine Bluff vs Alcorn State | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Arkansas-Pine Bluff at UCA Bear Invitational | Completed",
 "Final Sep 25 Women's · Arkansas-Pine Bluff at ULM Cross Country Invitational | Completed",
 "Final Oct 2 Women's · Arkansas-Pine Bluff at Chili Pepper Invitational | Completed",
 "Final Oct 15 Women's · Arkansas-Pine Bluff at Watson Collegiate XC Classic | Completed",
 "Upcoming Oct 26 Women's · Arkansas-Pine Bluff at SWAC Championship | ",
 "Upcoming Nov 15 Women's · Arkansas-Pine Bluff at NCAA Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Arkansas-Pine Bluff at UCA Bear Invitational | Completed",
 "Final Sep 25 Men's · Arkansas-Pine Bluff at ULM Cross Country Invitational | Completed",
 "Final Oct 2 Men's · Arkansas-Pine Bluff at Chili Pepper Invitational | Completed",
 "Final Oct 15 Men's · Arkansas-Pine Bluff at Watson Collegiate XC Classic | Completed",
 "Upcoming Oct 26 Men's · Arkansas-Pine Bluff at SWAC Championship | ",
 "Upcoming Nov 15 Men's · Arkansas-Pine Bluff at NCAA Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Arkansas-Pine Bluff vs Morehouse College | W, 35-15",
 "Final Sep 3 Arkansas-Pine Bluff at Missouri | L, 14-54",
 "Final Sep 12 Arkansas-Pine Bluff vs Alcorn State | L, 51-53",
 "Final Sep 19 Arkansas-Pine Bluff vs Central State | W, 41-35",
 "Final Oct 3 Arkansas-Pine Bluff at Southern | W, 41-10",
 "Final Oct 17 Arkansas-Pine Bluff vs Alabama State | L, 15-21",
 "Today Oct 24, 2:00 PM Arkansas-Pine Bluff at Florida A&M | ",
 "Upcoming Oct 31, 2:00 PM Arkansas-Pine Bluff vs Bethune-Cookman | ",
 "Upcoming Nov 7, 2:00 PM Arkansas-Pine Bluff at Grambling State | ",
 "Upcoming Nov 14, 2:00 PM Arkansas-Pine Bluff vs Prairie View A&M | ",
 "Upcoming Nov 21, 3:00 PM Arkansas-Pine Bluff at Texas Southern | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 15 Arkansas-Pine Bluff vs Nicholls State | L, 0-11",
 "Final Aug 21 Arkansas-Pine Bluff vs Wiley College | L, 2-7",
 "Final Aug 29 Arkansas-Pine Bluff vs United States Sports Univ. (USSU) | L, 2-5",
 "Final Sep 1 Arkansas-Pine Bluff vs Central Baptist | W, 5-1",
 "Final Sep 10 Arkansas-Pine Bluff at Northwestern State | L, 1-24",
 "Final Sep 13 Arkansas-Pine Bluff vs Nevada | L, 1-11",
 "Final Sep 20 Arkansas-Pine Bluff at Tulsa | L, 0-13",
 "Final Sep 27 Arkansas-Pine Bluff vs Texas Southern | L, 0-8",
 "Final Oct 1 Arkansas-Pine Bluff at Southern | L, 0-8",
 "Final Oct 8 Arkansas-Pine Bluff at Alcorn State | L, 0-17",
 "Final Oct 11 Arkansas-Pine Bluff vs Jackson State | L, 0-6",
 "Upcoming Oct 25, 1:00 PM Arkansas-Pine Bluff vs Alabama A&M | ",
 "Upcoming Oct 30, 4:00 PM Arkansas-Pine Bluff at Grambling State | ",
 "Upcoming Nov 5, 3:00 PM Arkansas-Pine Bluff vs Prairie View A&M | ",
 "Upcoming Nov 12 Arkansas-Pine Bluff at SWAC Soccer Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Arkansas-Pine Bluff vs Delaware State | L, 0-3",
 "Final Aug 28 Arkansas-Pine Bluff vs North Carolina Central | L, 0-3",
 "Final Aug 29 Arkansas-Pine Bluff vs South Carolina State | W, 3-2",
 "Final Sep 4 Arkansas-Pine Bluff vs UT Tyler | L, 0-3",
 "Final Sep 4 Arkansas-Pine Bluff vs Erskine College | W, 3-1",
 "Final Sep 5 Arkansas-Pine Bluff vs Missouri University of Science & Tech | L, 0-3",
 "Final Sep 5 Arkansas-Pine Bluff vs Henderson State | L, 0-3",
 "Final Sep 11 Arkansas-Pine Bluff at SIUE | L, 0-3",
 "Final Sep 11 Arkansas-Pine Bluff at Northern Illinois Univ. | L, 0-3",
 "Final Sep 12 Arkansas-Pine Bluff at Chicago State Univ. | W, 3-0",
 "Final Sep 18 Arkansas-Pine Bluff at UT Martin | L, 0-3",
 "Final Sep 18 Arkansas-Pine Bluff vs West Georgia | L, 0-3",
 "Final Sep 19 Arkansas-Pine Bluff at UT Martin | L, 0-3",
 "Final Sep 25 Arkansas-Pine Bluff at Southern Univ. | L, 2-3",
 "Final Sep 27 Arkansas-Pine Bluff at Alcorn State Univ. | L, 0-3",
 "Final Sep 30 Arkansas-Pine Bluff vs Grambling State Univ. | L, 1-3",
 "Final Oct 5 Arkansas-Pine Bluff vs Monroe | L, 0-3",
 "Final Oct 9 Arkansas-Pine Bluff at Florida A&M Univ. | L, 0-3",
 "Final Oct 11 Arkansas-Pine Bluff at Bethune-Cookman Univ. | L, 0-3",
 "Final Oct 18 Arkansas-Pine Bluff vs Prairie View A&M Univ. | L, 0-3",
 "Final Oct 19 Arkansas-Pine Bluff vs Texas Southern Univ. | L, 0-3",
 "Final Oct 23 Arkansas-Pine Bluff vs Alabama State Univ. | L, 1-3",
 "Upcoming Oct 25, 12:00 PM Arkansas-Pine Bluff vs Alabama A&M Univ. | ",
 "Upcoming Oct 27, 6:00 PM Arkansas-Pine Bluff vs Louisiana Tech Univ. | ",
 "Upcoming Oct 30, 6:00 PM Arkansas-Pine Bluff at Mississippi Valley State Univ. | ",
 "Upcoming Nov 1, 12:00 PM Arkansas-Pine Bluff at Jackson State Univ. | ",
 "Upcoming Nov 4, 6:00 PM Arkansas-Pine Bluff at Grambling State Univ. | ",
 "Upcoming Nov 6, 6:00 PM Arkansas-Pine Bluff vs Southern | ",
 "Upcoming Nov 8, 12:00 PM Arkansas-Pine Bluff vs Alcorn State | ",
 "Upcoming Nov 13, 6:00 PM Arkansas-Pine Bluff at Texas Southern Univ. | ",
 "Upcoming Nov 15, 12:00 PM Arkansas-Pine Bluff at Prairie View A&M Univ. | ",
 "Upcoming Nov 20 Arkansas-Pine Bluff at SWAC Tournament | "
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
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Arkansas-Pine Bluff module checks passed");
