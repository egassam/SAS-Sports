import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ucRiversideSchool} from '../src/schools/uc-riverside.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uc-riverside');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ucRiversideHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uc-riverside-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gohighlanders.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uc-riverside'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',ucRiversideSchool.scheduleUrls],['roster',ucRiversideSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uc-riverside|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gohighlanders.com',`${key} must stay on gohighlanders.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gohighlanders.com/sports/baseball/schedule"],"roster":["https://gohighlanders.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gohighlanders.com/sports/mens-basketball/schedule","https://gohighlanders.com/sports/womens-basketball/schedule"],"roster":["https://gohighlanders.com/sports/mens-basketball/roster","https://gohighlanders.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gohighlanders.com/sports/cross-country/schedule"],"roster":["https://gohighlanders.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gohighlanders.com/sports/womens-golf/schedule","https://gohighlanders.com/sports/mens-golf/schedule"],"roster":["https://gohighlanders.com/sports/womens-golf/roster","https://gohighlanders.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gohighlanders.com/sports/womens-soccer/schedule","https://gohighlanders.com/sports/mens-soccer/schedule"],"roster":["https://gohighlanders.com/sports/womens-soccer/roster","https://gohighlanders.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gohighlanders.com/sports/softball/schedule"],"roster":["https://gohighlanders.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gohighlanders.com/sports/womens-tennis/schedule","https://gohighlanders.com/sports/mens-tennis/schedule"],"roster":["https://gohighlanders.com/sports/womens-tennis/roster","https://gohighlanders.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gohighlanders.com/sports/track-and-field/schedule"],"roster":["https://gohighlanders.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gohighlanders.com/sports/womens-volleyball/schedule"],"roster":["https://gohighlanders.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uc-riverside|"+sport+"':"),`${sport} routes must live in the UC Riverside module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gohighlanders.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ucRiversideHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uc-riverside)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UC Riverside vs La Verne | ",
 "Upcoming Nov 7, 4:30 PM Men's · UC Riverside vs Denver | ",
 "Upcoming Nov 12, 7:00 PM Men's · UC Riverside at San Jose State | ",
 "Upcoming Nov 14, 3:00 PM Men's · UC Riverside at Fresno State | ",
 "Upcoming Nov 18, 6:30 PM Men's · UC Riverside at San Diego | ",
 "Upcoming Nov 25 Men's · UC Riverside vs Portland State | ",
 "Upcoming Nov 28, 2:00 PM Men's · UC Riverside vs Lincoln University CA | ",
 "Upcoming Dec 3, 7:00 PM Men's · UC Riverside at UC Irvine | ",
 "Upcoming Dec 5 Men's · UC Riverside vs California Baptist | ",
 "Upcoming Dec 12, 12:00 PM Men's · UC Riverside at California | ",
 "Upcoming Dec 18, 5:00 PM Men's · UC Riverside vs Utah Tech | ",
 "Upcoming Dec 22, 1:00 PM Men's · UC Riverside at UCLA | ",
 "Upcoming Dec 31, 2:00 PM Men's · UC Riverside vs Cal Poly | ",
 "Upcoming Jan 2, 5:00 PM Men's · UC Riverside vs UC Santa Barbara | ",
 "Upcoming Jan 7, 6:30 PM Men's · UC Riverside at CSU Bakersfield | ",
 "Upcoming Jan 9, 5:00 PM Men's · UC Riverside at CSUN | ",
 "Upcoming Jan 14, 7:00 PM Men's · UC Riverside vs UC San Diego | ",
 "Upcoming Jan 16, 5:00 PM Men's · UC Riverside vs UC Irvine | ",
 "Upcoming Jan 21, 7:00 PM Men's · UC Riverside at Sacramento State | ",
 "Upcoming Jan 23, 1:00 PM Men's · UC Riverside at Utah Valley | ",
 "Upcoming Jan 28, 7:00 PM Men's · UC Riverside vs Cal State Fullerton | ",
 "Upcoming Jan 30, 5:00 PM Men's · UC Riverside vs Long Beach State | ",
 "Upcoming Feb 4, 7:00 PM Men's · UC Riverside vs Utah Valley | ",
 "Upcoming Feb 6, 5:00 PM Men's · UC Riverside vs Sacramento State | ",
 "Upcoming Feb 11, 6:00 PM Men's · UC Riverside at UC Santa Barbara | ",
 "Upcoming Feb 13, 4:00 PM Men's · UC Riverside at Cal Poly | ",
 "Upcoming Feb 18, 7:00 PM Men's · UC Riverside at UC San Diego | ",
 "Upcoming Feb 20, 7:30 PM Men's · UC Riverside at California Baptist | ",
 "Upcoming Feb 25, 7:00 PM Men's · UC Riverside vs CSUN | ",
 "Upcoming Feb 27, 5:00 PM Men's · UC Riverside vs CSU Bakersfield | ",
 "Upcoming Mar 4, 7:00 PM Men's · UC Riverside at Long Beach State | ",
 "Upcoming Mar 6, 4:00 PM Men's · UC Riverside at Cal State Fullerton | ",
 "Upcoming Mar 10 Men's · UC Riverside at Big West Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · UC Riverside vs Occidental | ",
 "Upcoming Nov 6 Women's · UC Riverside at Seattle | ",
 "Upcoming Nov 8, 2:00 PM Women's · UC Riverside at Gonzaga | ",
 "Upcoming Nov 14, 12:00 PM Women's · UC Riverside at Wichita State | ",
 "Upcoming Nov 18 Women's · UC Riverside at Oregon State | ",
 "Upcoming Nov 22, 2:00 PM Women's · UC Riverside vs Idaho State | ",
 "Upcoming Nov 29, 2:00 PM Women's · UC Riverside vs La Sierra | ",
 "Upcoming Dec 3, 6:00 PM Women's · UC Riverside vs UC Irvine | ",
 "Upcoming Dec 5, 1:00 PM Women's · UC Riverside vs California Baptist | ",
 "Upcoming Dec 17, 6:00 PM Women's · UC Riverside vs New Mexico State | ",
 "Upcoming Dec 20, 1:00 PM Women's · UC Riverside at Boise State | ",
 "Upcoming Dec 31, 6:00 PM Women's · UC Riverside at Cal Poly | ",
 "Upcoming Jan 2, 2:00 PM Women's · UC Riverside at UC Santa Barbara | ",
 "Upcoming Jan 7, 6:00 PM Women's · UC Riverside vs Cal State Bakersfield | ",
 "Upcoming Jan 9, 4:00 PM Women's · UC Riverside vs CSUN | ",
 "Upcoming Jan 14, 6:00 PM Women's · UC Riverside at UC San Diego | ",
 "Upcoming Jan 16, 2:00 PM Women's · UC Riverside at UC Irvine | ",
 "Upcoming Jan 21, 6:00 PM Women's · UC Riverside vs Sacramento State | ",
 "Upcoming Jan 23, 4:00 PM Women's · UC Riverside vs Utah Valley | ",
 "Upcoming Jan 28, 7:00 PM Women's · UC Riverside at Cal State Fullerton | ",
 "Upcoming Jan 30, 2:00 PM Women's · UC Riverside at Long Beach State | ",
 "Upcoming Feb 4, 4:00 PM Women's · UC Riverside at Utah Valley | ",
 "Upcoming Feb 6, 1:00 PM Women's · UC Riverside at Sacramento State | ",
 "Upcoming Feb 11, 6:00 PM Women's · UC Riverside vs UC Santa Barbara | ",
 "Upcoming Feb 13, 4:00 PM Women's · UC Riverside vs Cal Poly | ",
 "Upcoming Feb 18, 6:00 PM Women's · UC Riverside vs UC San Diego | ",
 "Upcoming Feb 20, 5:00 PM Women's · UC Riverside at California Baptist | ",
 "Upcoming Feb 25, 6:00 PM Women's · UC Riverside at CSUN | ",
 "Upcoming Feb 27, 2:00 PM Women's · UC Riverside at Cal State Bakersfield | ",
 "Upcoming Mar 4, 6:00 PM Women's · UC Riverside vs Long Beach State | ",
 "Upcoming Mar 6, 1:00 PM Women's · UC Riverside vs Cal State Fullerton | ",
 "Upcoming Mar 10 Women's · UC Riverside at Big West Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UC Riverside at UCLA | Completed",
 "Final Sep 19 UC Riverside at UC Riverside Invitational | Completed",
 "Final Oct 9 UC Riverside at Bill Dellinger Invitational | Completed",
 "Final Oct 17 UC Riverside at Highlander Invitational | Completed",
 "Upcoming Oct 31 UC Riverside at Big West Conference Championship | ",
 "Upcoming Nov 13 UC Riverside at NCAA West Regional Championship | ",
 "Upcoming Nov 21 UC Riverside at NCAA National Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · UC Riverside at Kalispel Invitational | Completed",
 "Final Oct 5 Women's · UC Riverside at Pat Lesser Harbottle Invitational | Completed",
 "Final Oct 12 Women's · UC Riverside at Golf Iconic Classic | Completed",
 "Upcoming Oct 26 Women's · UC Riverside at Pat Bradley Invitational | ",
 "Upcoming Feb 8 Women's · UC Riverside at Ventura Harbor Collegiate | ",
 "Upcoming Feb 13 Women's · UC Riverside at Battle at the Beach | ",
 "Upcoming Feb 23 Women's · UC Riverside at Causeway Invitational | ",
 "Upcoming Mar 1 Women's · UC Riverside at West Texas Classic | ",
 "Upcoming Mar 8 Women's · UC Riverside at Fresno Classic | ",
 "Upcoming Mar 16 Women's · UC Riverside at Jackrabbits Invitational | ",
 "Upcoming Apr 6 Women's · UC Riverside at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 18 Women's · UC Riverside at Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · UC Riverside at CDA National Reserve Invitational | Completed",
 "Final Oct 5 Men's · UC Riverside at Testudo Cup | Completed",
 "Upcoming Nov 4 Men's · UC Riverside at Pearl at Kalauao Invitational | ",
 "Upcoming Jan 31 Men's · UC Riverside at Bill Cullum Invitational | ",
 "Upcoming Feb 21 Men's · UC Riverside at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · UC Riverside at The Watney Invitational | ",
 "Upcoming Mar 21 Men's · UC Riverside at UCSD Invitational | ",
 "Upcoming Apr 5 Men's · UC Riverside at Gaucho Invitational | ",
 "Upcoming Apr 9 Men's · UC Riverside at El Macero Classic | ",
 "Upcoming Apr 19 Men's · UC Riverside at SeattleU Redhawk Invitational | ",
 "Upcoming May 3 Men's · UC Riverside at Big West Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UC Riverside vs Northern Arizona | L, 0-2",
 "Final Aug 19 Women's · UC Riverside at Oral Roberts | L, 0-1",
 "Final Aug 23 Women's · UC Riverside at Kansas City | W, 3-1",
 "Final Aug 27 Women's · UC Riverside vs Utah Tech | L, 0-1",
 "Final Sep 3 Women's · UC Riverside at Loyola Marymount | L, 0-1",
 "Final Sep 6 Women's · UC Riverside vs North Dakota | W, 2-1",
 "Final Sep 17 Women's · UC Riverside vs Northern Colorado | L, 0-1",
 "Final Sep 23 Women's · UC Riverside at Cal State Fullerton | L, 0-2",
 "Final Sep 26 Women's · UC Riverside vs California Baptist | L, 0-2",
 "Final Sep 30 Women's · UC Riverside at Sacramento State | T, 1-1",
 "Final Oct 3 Women's · UC Riverside vs UC Irvine | L, 1-2",
 "Final Oct 10 Women's · UC Riverside vs UC San Diego | L, 0-2",
 "Final Oct 14 Women's · UC Riverside at Cal State Bakersfield | L, 1-2",
 "Final Oct 17 Women's · UC Riverside at Utah Valley | L, 0-3",
 "Final Oct 21 Women's · UC Riverside vs CSUN | W, 3-1",
 "Upcoming Oct 24, 7:00 PM Women's · UC Riverside at Long Beach State | ",
 "Upcoming Oct 28, 6:00 PM Women's · UC Riverside vs Cal Poly | ",
 "Upcoming Oct 31, 1:00 PM Women's · UC Riverside vs UC Santa Barbara | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UC Riverside at Oral Roberts | L, 0-2",
 "Final Aug 23 Men's · UC Riverside at Tulsa | T, 1-1",
 "Final Aug 28 Men's · UC Riverside at Grand Canyon | W, 2-0",
 "Final Sep 2 Men's · UC Riverside vs Life Pacific | W, 6-0",
 "Final Sep 6 Men's · UC Riverside vs UNLV | T, 1-1",
 "Final Sep 11 Men's · UC Riverside at Air Force | W, 2-1",
 "Final Sep 17 Men's · UC Riverside vs UC Irvine | L, 0-2",
 "Final Sep 23 Men's · UC Riverside at Sacramento State | L, 1-3",
 "Final Sep 30 Men's · UC Riverside vs Cal State Fullerton | L, 0-1",
 "Final Oct 3 Men's · UC Riverside at Oregon State | L, 1-4",
 "Final Oct 7 Men's · UC Riverside vs UC San Diego | T, 2-2",
 "Final Oct 10 Men's · UC Riverside at CBU | L, 0-2",
 "Final Oct 14 Men's · UC Riverside vs CSUN | L, 1-2",
 "Final Oct 17 Men's · UC Riverside vs Gonzaga | W, 2-1",
 "Final Oct 21 Men's · UC Riverside at Cal State Bakersfield | T, 2-2",
 "Upcoming Oct 24, 7:00 PM Men's · UC Riverside vs San Diego State | ",
 "Upcoming Oct 31, 7:00 PM Men's · UC Riverside at Cal Poly | ",
 "Upcoming Nov 7 Men's · UC Riverside at Pac-12 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 UC Riverside at Alabama | L, 0-3",
 "Final Aug 30 UC Riverside at Samford | W, 3-1",
 "Final Sep 3 UC Riverside vs Pacific | L, 2-3",
 "Final Sep 4 UC Riverside vs LSU New Orleans | W, 3-0",
 "Final Sep 5 UC Riverside vs Portland | L, 1-3",
 "Final Sep 9 UC Riverside at Northern Arizona | L, 0-3",
 "Final Sep 10 UC Riverside vs Grand Canyon | L, 1-3",
 "Final Sep 11 UC Riverside vs Omaha | L, 0-3",
 "Final Sep 17 UC Riverside vs Chicago State | W, 3-0",
 "Final Sep 18 UC Riverside at Utah Tech | L, 0-3",
 "Final Sep 19 UC Riverside at Southern Utah | W, 3-0",
 "Final Sep 24 UC Riverside at Utah Valley | L, 0-3",
 "Final Sep 26 UC Riverside at Sacramento State | L, 0-3",
 "Final Oct 2 UC Riverside vs UC Irvine | L, 1-3",
 "Final Oct 3 UC Riverside vs UC San Diego | L, 2-3",
 "Final Oct 9 UC Riverside vs CSUN | L, 0-3",
 "Final Oct 10 UC Riverside vs Cal State Bakersfield | L, 2-3",
 "Final Oct 16 UC Riverside at UC Santa Barbara | L, 0-3",
 "Upcoming Oct 23, 6:00 PM UC Riverside vs California Baptist | ",
 "Upcoming Oct 24, 6:00 PM UC Riverside at California Baptist | ",
 "Upcoming Oct 30, 6:00 PM UC Riverside vs Sacramento State | ",
 "Upcoming Oct 31, 1:00 PM UC Riverside vs Utah Valley | ",
 "Upcoming Nov 6, 6:00 PM UC Riverside at Cal State Bakersfield | ",
 "Upcoming Nov 7, 4:00 PM UC Riverside at CSUN | ",
 "Upcoming Nov 13, 7:00 PM UC Riverside at Long Beach State | ",
 "Upcoming Nov 14, 2:00 PM UC Riverside at Cal State Fullerton | ",
 "Upcoming Nov 20, 6:00 PM UC Riverside vs Cal Poly | ",
 "Upcoming Nov 21, 4:00 PM UC Riverside vs UC Santa Barbara | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UC Riverside module checks passed");
