import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ucSanDiegoSchool} from '../src/schools/uc-san-diego.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uc-san-diego');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ucSanDiegoHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uc-san-diego-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ucsdtritons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uc-san-diego'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',ucSanDiegoSchool.scheduleUrls],['roster',ucSanDiegoSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uc-san-diego|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ucsdtritons.com',`${key} must stay on ucsdtritons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ucsdtritons.com/sports/baseball/schedule"],"roster":["https://ucsdtritons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ucsdtritons.com/sports/mens-basketball/schedule","https://ucsdtritons.com/sports/womens-basketball/schedule"],"roster":["https://ucsdtritons.com/sports/mens-basketball/roster","https://ucsdtritons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ucsdtritons.com/sports/cross-country/schedule"],"roster":["https://ucsdtritons.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://ucsdtritons.com/sports/fencing/schedule"],"roster":["https://ucsdtritons.com/sports/fencing/roster"],"combined":false},"Golf":{"schedule":["https://ucsdtritons.com/sports/mens-golf/schedule"],"roster":["https://ucsdtritons.com/sports/mens-golf/roster"],"combined":false},"Rowing":{"schedule":["https://ucsdtritons.com/sports/womens-rowing/schedule"],"roster":["https://ucsdtritons.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://ucsdtritons.com/sports/womens-soccer/schedule","https://ucsdtritons.com/sports/mens-soccer/schedule"],"roster":["https://ucsdtritons.com/sports/womens-soccer/roster","https://ucsdtritons.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ucsdtritons.com/sports/softball/schedule"],"roster":["https://ucsdtritons.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ucsdtritons.com/sports/swimming-and-diving/schedule"],"roster":["https://ucsdtritons.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://ucsdtritons.com/sports/womens-tennis/schedule","https://ucsdtritons.com/sports/mens-tennis/schedule"],"roster":["https://ucsdtritons.com/sports/womens-tennis/roster","https://ucsdtritons.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ucsdtritons.com/sports/track-and-field/schedule"],"roster":["https://ucsdtritons.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ucsdtritons.com/sports/womens-volleyball/schedule","https://ucsdtritons.com/sports/mens-volleyball/schedule"],"roster":["https://ucsdtritons.com/sports/womens-volleyball/roster","https://ucsdtritons.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://ucsdtritons.com/sports/womens-water-polo/schedule","https://ucsdtritons.com/sports/mens-water-polo/schedule"],"roster":["https://ucsdtritons.com/sports/womens-water-polo/roster","https://ucsdtritons.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uc-san-diego|"+sport+"':"),`${sport} routes must live in the UC San Diego module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ucsdtritons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ucSanDiegoHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uc-san-diego)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · UC San Diego vs USC (Exhibition) | L, 74-80",
 "Upcoming Nov 2, 7:00 PM Men's · UC San Diego vs Whittier | ",
 "Upcoming Nov 7, 7:00 PM Men's · UC San Diego vs Fresno State | ",
 "Upcoming Nov 13, 7:00 PM Men's · UC San Diego at Utah State | ",
 "Upcoming Nov 16, 7:00 PM Men's · UC San Diego vs Texas Southern | ",
 "Upcoming Nov 22, 6:30 PM Men's · UC San Diego vs Seattle U | ",
 "Upcoming Nov 23 Men's · UC San Diego at Acrisure Series | ",
 "Upcoming Nov 28, 7:00 PM Men's · UC San Diego vs LMU | ",
 "Upcoming Dec 3, 7:30 PM Men's · UC San Diego vs California Baptist | ",
 "Upcoming Dec 5, 7:00 PM Men's · UC San Diego at UC Irvine | ",
 "Upcoming Dec 12, 6:00 PM Men's · UC San Diego vs Stanton | ",
 "Upcoming Dec 15, 5:00 PM Men's · UC San Diego at St. Thomas | ",
 "Upcoming Dec 22, 4:30 PM Men's · UC San Diego at San José State | ",
 "Upcoming Dec 31, 4:00 PM Men's · UC San Diego at Cal State Fullerton | ",
 "Upcoming Jan 2, 6:00 PM Men's · UC San Diego at Long Beach State | ",
 "Upcoming Jan 7, 7:00 PM Men's · UC San Diego vs Utah Valley | ",
 "Upcoming Jan 9, 6:00 PM Men's · UC San Diego vs Sacramento State | ",
 "Upcoming Jan 14, 7:00 PM Men's · UC San Diego at UC Riverside | ",
 "Upcoming Jan 16, 7:00 PM Men's · UC San Diego at California Baptist | ",
 "Upcoming Jan 21, 7:00 PM Men's · UC San Diego vs Long Beach State | ",
 "Upcoming Jan 23, 6:00 PM Men's · UC San Diego vs Cal State Fullerton | ",
 "Upcoming Jan 28, 6:00 PM Men's · UC San Diego at UC Santa Barbara | ",
 "Upcoming Jan 30, 4:00 PM Men's · UC San Diego at Cal Poly | ",
 "Upcoming Feb 4, 7:00 PM Men's · UC San Diego vs CSUN | ",
 "Upcoming Feb 6, 6:00 PM Men's · UC San Diego vs Cal State Bakersfield | ",
 "Upcoming Feb 11, 7:00 PM Men's · UC San Diego at Sacramento State | ",
 "Upcoming Feb 13, 1:00 PM Men's · UC San Diego at Utah Valley | ",
 "Upcoming Feb 18, 7:00 PM Men's · UC San Diego vs UC Riverside | ",
 "Upcoming Feb 20, 6:00 PM Men's · UC San Diego vs UC Irvine | ",
 "Upcoming Feb 25, 7:00 PM Men's · UC San Diego vs Cal Poly | ",
 "Upcoming Feb 27, 6:00 PM Men's · UC San Diego vs UC Santa Barbara | ",
 "Upcoming Mar 4, 6:30 PM Men's · UC San Diego at Cal State Bakersfield | ",
 "Upcoming Mar 6, 5:00 PM Men's · UC San Diego at CSUN | ",
 "Upcoming Mar 10 Men's · UC San Diego at Big West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · UC San Diego at Washington | ",
 "Upcoming Nov 7, 3:00 PM Women's · UC San Diego vs San Diego | ",
 "Upcoming Nov 12, 11:00 AM Women's · UC San Diego vs Portland State | ",
 "Upcoming Nov 15, 1:00 PM Women's · UC San Diego vs San Francisco | ",
 "Upcoming Nov 24, 6:00 PM Women's · UC San Diego vs Whittier | ",
 "Upcoming Nov 28, 2:00 PM Women's · UC San Diego at Northern Arizona | ",
 "Upcoming Dec 3, 5:00 PM Women's · UC San Diego vs California Baptist | ",
 "Upcoming Dec 5, 2:00 PM Women's · UC San Diego vs UC Irvine | ",
 "Upcoming Dec 10, 6:00 PM Women's · UC San Diego vs Cal State San Marcos | ",
 "Upcoming Dec 14, 6:00 PM Women's · UC San Diego vs Pacific | ",
 "Upcoming Dec 19 Women's · UC San Diego vs La Salle | ",
 "Upcoming Dec 20 Women's · UC San Diego at FDU Holiday Classic | ",
 "Upcoming Dec 31, 2:00 PM Women's · UC San Diego vs Cal State Fullerton | ",
 "Upcoming Jan 2, 4:00 PM Women's · UC San Diego vs Long Beach State | ",
 "Upcoming Jan 7, 5:00 PM Women's · UC San Diego at Utah Valley | ",
 "Upcoming Jan 9, 1:00 PM Women's · UC San Diego at Sacramento State | ",
 "Upcoming Jan 14, 6:00 PM Women's · UC San Diego vs UC Riverside | ",
 "Upcoming Jan 16, 4:30 PM Women's · UC San Diego at California Baptist | ",
 "Upcoming Jan 21, 6:00 PM Women's · UC San Diego at Long Beach State | ",
 "Upcoming Jan 23, 2:00 PM Women's · UC San Diego at Cal State Fullerton | ",
 "Upcoming Jan 28, 6:00 PM Women's · UC San Diego vs UC Santa Barbara | ",
 "Upcoming Jan 30, 4:00 PM Women's · UC San Diego vs Cal Poly | ",
 "Upcoming Feb 4, 6:00 PM Women's · UC San Diego at CSUN | ",
 "Upcoming Feb 6, 2:00 PM Women's · UC San Diego at Cal State Bakersfield | ",
 "Upcoming Feb 11, 6:00 PM Women's · UC San Diego vs Sacramento State | ",
 "Upcoming Feb 13, 1:00 PM Women's · UC San Diego vs Utah Valley | ",
 "Upcoming Feb 18, 6:00 PM Women's · UC San Diego at UC Riverside | ",
 "Upcoming Feb 20, 1:00 PM Women's · UC San Diego at UC Irvine | ",
 "Upcoming Feb 25, 6:00 PM Women's · UC San Diego at Cal Poly | ",
 "Upcoming Feb 27, 2:00 PM Women's · UC San Diego at UC Santa Barbara | ",
 "Upcoming Mar 4, 6:00 PM Women's · UC San Diego vs Cal State Bakersfield | ",
 "Upcoming Mar 6, 4:00 PM Women's · UC San Diego vs CSUN | ",
 "Upcoming Mar 10 Women's · UC San Diego at Big West Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 3 UC San Diego at Aztec Coastal Classic | Women's team: 2nd / Men's team: 1st",
 "Final Sep 18 UC San Diego at Saint Mary's Invitational | Women's team: 4th / Men's team: 4th",
 "Final Oct 2 UC San Diego at Nike XC Town Twilight | Women's team: 1st / Men's team: 1st",
 "Final Oct 17 UC San Diego at Highlander Invitational | Women's team: 2nd / Men's team: 5th",
 "Upcoming Oct 31, 8:00 AM UC San Diego at Big West Championships | ",
 "Upcoming Nov 13 UC San Diego at NCAA West Regional Championships | ",
 "Upcoming Nov 21 UC San Diego at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Final Sep 19 UC San Diego at BladeRunner | Completed",
 "Upcoming Nov 7 UC San Diego at West Invitational | ",
 "Upcoming Jan 13 UC San Diego at Wellesley | ",
 "Upcoming Jan 16 UC San Diego at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 30 UC San Diego at Schiller Duals | ",
 "Upcoming Mar 13 UC San Diego at NCAA West Regional Championships | ",
 "Upcoming Mar 14 UC San Diego at MPSF Championships | ",
 "Upcoming Mar 25 UC San Diego at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 UC San Diego at Ram Masters Invitational | 11th of 16",
 "Final Sep 19 UC San Diego at Falcon Invitational | 14th of 18",
 "Final Oct 12 UC San Diego at Visit Stockton Invitational | 13th of 18",
 "Upcoming Nov 4 UC San Diego at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 22 UC San Diego at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 UC San Diego at Nick Watney Invitational | ",
 "Upcoming Mar 21 UC San Diego at UC San Diego Invitational | ",
 "Upcoming Mar 29 UC San Diego at Wyoming Cowboy Classic | ",
 "Upcoming Apr 9 UC San Diego at El Macero Classic | ",
 "Upcoming Apr 19 UC San Diego at Redhawk Invitational | ",
 "Upcoming May 2 UC San Diego at Big West Championship | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UC San Diego vs San Diego State | L, 0-2",
 "Final Aug 15 Women's · UC San Diego vs Utah Tech | W, 4-2",
 "Final Aug 20 Women's · UC San Diego at UNLV | W, 2-1",
 "Final Aug 23 Women's · UC San Diego at Northern Arizona | T, 0-0",
 "Final Aug 30 Women's · UC San Diego vs Pacific | W, 2-0",
 "Final Sep 3 Women's · UC San Diego at Boise State | L, 0-1",
 "Final Sep 6 Women's · UC San Diego vs North Alabama | T, 0-0",
 "Final Sep 14 Women's · UC San Diego vs LMU | W, 2-1",
 "Final Sep 23 Women's · UC San Diego at CSUN | W, 1-0",
 "Final Sep 26 Women's · UC San Diego vs Utah Valley | T, 2-2",
 "Final Sep 30 Women's · UC San Diego at California Baptist | T, 0-0",
 "Final Oct 3 Women's · UC San Diego vs Cal Poly | L, 0-1",
 "Final Oct 10 Women's · UC San Diego at UC Riverside | W, 2-0",
 "Final Oct 14 Women's · UC San Diego vs Sacramento State | W, 3-0",
 "Final Oct 17 Women's · UC San Diego at UC Santa Barbara | T, 1-1",
 "Final Oct 21 Women's · UC San Diego vs Long Beach State | W, 2-1",
 "Upcoming Oct 24, 4:00 PM Women's · UC San Diego at Cal State Fullerton | ",
 "Upcoming Oct 28, 7:00 PM Women's · UC San Diego at Cal State Bakersfield | ",
 "Upcoming Oct 31, 1:00 PM Women's · UC San Diego vs UC Irvine | ",
 "Upcoming Nov 4 Women's · UC San Diego at Big West Championship - First Round | ",
 "Upcoming Nov 7 Women's · UC San Diego at Big West Championship - Semifinals | ",
 "Upcoming Nov 14 Women's · UC San Diego at Big West Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UC San Diego vs Navy | W, 7-0",
 "Final Aug 27 Men's · UC San Diego at Houston Christian | W, 1-0",
 "Final Aug 30 Men's · UC San Diego at Air Force | W, 1-0",
 "Final Sep 5 Men's · UC San Diego vs Pacific | W, 1-0",
 "Final Sep 10 Men's · UC San Diego at UNLV | L, 0-1",
 "Final Sep 13 Men's · UC San Diego at Utah Tech | W, 2-0",
 "Final Sep 20 Men's · UC San Diego vs UC Irvine | L, 0-2",
 "Final Sep 23 Men's · UC San Diego vs Cal State Fullerton | L, 1-2",
 "Final Sep 30 Men's · UC San Diego vs Cal Poly | T, 1-1",
 "Final Oct 3 Men's · UC San Diego at Gonzaga | W, 2-1",
 "Final Oct 7 Men's · UC San Diego at UC Riverside | T, 2-2",
 "Final Oct 10 Men's · UC San Diego vs Oregon State | L, 0-1",
 "Final Oct 14 Men's · UC San Diego at Sacramento State | L, 2-3",
 "Final Oct 17 Men's · UC San Diego vs Cal State Bakersfield | W, 4-2",
 "Final Oct 21 Men's · UC San Diego at CSUN | L, 2-3",
 "Upcoming Oct 24, 7:00 PM Men's · UC San Diego vs California Baptist | ",
 "Upcoming Oct 31, 7:00 PM Men's · UC San Diego at San Diego State | ",
 "Upcoming Nov 7 Men's · UC San Diego at Pac-12 Championship | ",
 "Upcoming Nov 13 Men's · UC San Diego at Pac-12 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 9 UC San Diego at Triton Invitational | Completed",
 "Upcoming Oct 23, 1:00 PM UC San Diego vs Claremont-Mudd-Scripps | ",
 "Upcoming Oct 31, 12:00 PM UC San Diego at UC Davis | ",
 "Upcoming Nov 13, 11:00 AM UC San Diego at Pepperdine | ",
 "Upcoming Nov 13, 11:00 AM UC San Diego vs UC Santa Barbara | ",
 "Upcoming Nov 19 UC San Diego at Idaho College Invite | ",
 "Upcoming Dec 19, 11:00 AM UC San Diego vs CSU Bakersfield | ",
 "Upcoming Dec 19, 11:00 AM UC San Diego vs San Diego | ",
 "Upcoming Jan 2, 11:00 AM UC San Diego vs Wisconsin | ",
 "Upcoming Jan 9, 12:00 PM UC San Diego vs Cal Baptist | ",
 "Upcoming Jan 9, 12:00 PM UC San Diego vs UCLA | ",
 "Upcoming Jan 9, 12:00 PM UC San Diego vs UC Santa Barbara | ",
 "Upcoming Jan 16, 12:00 PM UC San Diego vs Pomona-Pitzer | ",
 "Upcoming Jan 29, 1:00 PM UC San Diego at USC | ",
 "Upcoming Feb 6, 12:00 PM UC San Diego at San Diego | ",
 "Upcoming Feb 17 UC San Diego at MPSF Women's Swimming & Diving Championship | ",
 "Upcoming Feb 22 UC San Diego at MPSF Men's Swimming & Diving Championship | ",
 "Upcoming Feb 27 UC San Diego at Last Chance Meet | ",
 "Upcoming Mar 17 UC San Diego at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 UC San Diego at NCAA Men's Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 24 Women's · UC San Diego at USTA Intercollegiate Championships | Completed",
 "Final Oct 1 Women's · UC San Diego at Big West Fall Selection Event | Completed",
 "Final Oct 15 Women's · UC San Diego at ITA Southwest Regionals | Completed",
 "Upcoming Nov 5 Women's · UC San Diego at ITA West Sectional | ",
 "Upcoming Nov 5 Women's · UC San Diego at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · UC San Diego at SDSU Fall Classic | ",
 "Upcoming Jan 15 Women's · UC San Diego at Arizona | ",
 "Upcoming Jan 16, 2:00 PM Women's · UC San Diego at Arizona State | ",
 "Upcoming Jan 17 Women's · UC San Diego at Grand Canyon | ",
 "Upcoming Jan 23, 1:00 PM Women's · UC San Diego at LMU | ",
 "Upcoming Jan 24 Women's · UC San Diego at San Diego State | ",
 "Upcoming Feb 5, 11:00 AM Women's · UC San Diego vs Utah | ",
 "Upcoming Feb 6, 1:00 PM Women's · UC San Diego vs Pomona-Pitzer | ",
 "Upcoming Feb 10, 11:00 AM Women's · UC San Diego vs Hawai'i | ",
 "Upcoming Feb 13, 1:00 PM Women's · UC San Diego vs UC Davis | ",
 "Upcoming Feb 19, 11:00 AM Women's · UC San Diego vs Long Beach State | ",
 "Upcoming Feb 26, 11:00 AM Women's · UC San Diego vs Santa Clara | ",
 "Upcoming Feb 27, 2:00 PM Women's · UC San Diego vs Saint Mary's | ",
 "Upcoming Mar 6, 1:00 PM Women's · UC San Diego vs UC Riverside | ",
 "Upcoming Mar 7, 11:00 AM Women's · UC San Diego at Cal State Fullerton | ",
 "Upcoming Mar 21, 11:00 AM Women's · UC San Diego vs Dartmouth | ",
 "Upcoming Mar 23, 1:00 PM Women's · UC San Diego at Denver | ",
 "Upcoming Mar 24 Women's · UC San Diego at Colorado State | ",
 "Upcoming Apr 4 Women's · UC San Diego vs Sacramento State | ",
 "Upcoming Apr 9, 1:00 PM Women's · UC San Diego at UC Santa Barbara | ",
 "Upcoming Apr 11, 12:00 PM Women's · UC San Diego at Cal Poly | ",
 "Upcoming Apr 18, 1:00 PM Women's · UC San Diego vs CSUN | ",
 "Upcoming Apr 24, 10:30 AM Women's · UC San Diego at UC Irvine | ",
 "Upcoming Apr 28 Women's · UC San Diego at Big West Championships First Round | ",
 "Upcoming Apr 29 Women's · UC San Diego at Big West Championships Quarterfinals | ",
 "Upcoming Apr 30 Women's · UC San Diego at Big West Championships Semifinals | ",
 "Upcoming May 1 Women's · UC San Diego at Big West Championships Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 9 Men's · UC San Diego at UCSB Classic | Completed",
 "Final Oct 15 Men's · UC San Diego at ITA Southwest Regional | Completed",
 "Upcoming Nov 5 Men's · UC San Diego at SoCal Intercollegiate | ",
 "Upcoming Nov 5 Men's · UC San Diego at ITA Sectional Championship | ",
 "Upcoming Nov 11 Men's · UC San Diego at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Jan 22 UC San Diego at Nevada Invitational | ",
 "Upcoming Jan 30 UC San Diego at Wolfpack Invitational | ",
 "Upcoming Feb 12 UC San Diego at Don Kirby Elite Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · UC San Diego at Saint Mary's | W, 3-1",
 "Final Aug 29 Women's · UC San Diego at California | L, 1-3",
 "Final Aug 30 Women's · UC San Diego vs Gonzaga | W, 3-1",
 "Final Sep 3 Women's · UC San Diego vs Loyola Marymount | L, 1-3",
 "Final Sep 4 Women's · UC San Diego vs Utah Tech | L, 2-3",
 "Final Sep 6 Women's · UC San Diego at Hawai‘i | L, 2-3",
 "Final Sep 11 Women's · UC San Diego at New Mexico State | L, 2-3",
 "Final Sep 12 Women's · UC San Diego at UTEP | L, 1-3",
 "Final Sep 13 Women's · UC San Diego vs Pacific | W, 3-0",
 "Final Sep 19 Women's · UC San Diego vs Southeastern Louisiana | W, 3-0",
 "Final Sep 20 Women's · UC San Diego at UNLV | L, 2-3",
 "Final Sep 25 Women's · UC San Diego vs Cal State Fullerton | W, 3-0",
 "Final Sep 26 Women's · UC San Diego vs Long Beach State | L, 1-3",
 "Final Oct 1 Women's · UC San Diego at California Baptist | W, 3-1",
 "Final Oct 3 Women's · UC San Diego at UC Riverside | W, 3-2",
 "Final Oct 9 Women's · UC San Diego vs Sacramento State | L, 1-3",
 "Final Oct 10 Women's · UC San Diego vs Utah Valley | W, 3-0",
 "Final Oct 16 Women's · UC San Diego at CSUN | W, 3-1",
 "Final Oct 17 Women's · UC San Diego at Cal State Bakersfield | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Women's · UC San Diego vs UC Irvine | ",
 "Upcoming Oct 24, 5:00 PM Women's · UC San Diego at UC Irvine | ",
 "Upcoming Oct 30, 6:00 PM Women's · UC San Diego vs UC Santa Barbara | ",
 "Upcoming Oct 31, 5:00 PM Women's · UC San Diego vs Cal Poly | ",
 "Upcoming Nov 5, 6:00 PM Women's · UC San Diego at Utah Valley | ",
 "Upcoming Nov 7, 1:00 PM Women's · UC San Diego at Sacramento State | ",
 "Upcoming Nov 13, 6:00 PM Women's · UC San Diego vs Cal State Bakersfield | ",
 "Upcoming Nov 14, 5:00 PM Women's · UC San Diego vs CSUN | ",
 "Upcoming Nov 20, 7:00 PM Women's · UC San Diego at Long Beach State | ",
 "Upcoming Nov 21, 2:00 PM Women's · UC San Diego at Cal State Fullerton | ",
 "Upcoming Nov 25 Women's · UC San Diego at Big West Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Jan 16, 11:40 AM Women's · UC San Diego vs California | ",
 "Upcoming Jan 16, 6:00 PM Women's · UC San Diego at Fresno State | ",
 "Upcoming Jan 17, 9:00 AM Women's · UC San Diego vs San Jose State | ",
 "Upcoming Jan 17, 2:00 PM Women's · UC San Diego vs San Diego State | ",
 "Upcoming Jan 29 Women's · UC San Diego at 2027 Triton Invitational | ",
 "Upcoming Jan 30 Women's · UC San Diego at 2027 Triton Invitational | ",
 "Upcoming Jan 31 Women's · UC San Diego at 2027 Triton Invitational | ",
 "Upcoming Feb 6, 12:00 PM Women's · UC San Diego at LMU | ",
 "Upcoming Feb 13, 10:00 AM Women's · UC San Diego at California Baptist | ",
 "Upcoming Feb 17, 6:00 PM Women's · UC San Diego vs Hawai‘i | ",
 "Upcoming Feb 20, 9:00 AM Women's · UC San Diego vs Saint Mary's | ",
 "Upcoming Feb 20, 3:00 PM Women's · UC San Diego vs Indiana | ",
 "Upcoming Feb 21, 9:15 AM Women's · UC San Diego at Arizona State | ",
 "Upcoming Feb 21, 12:00 PM Women's · UC San Diego vs Pacific | ",
 "Upcoming Feb 26, 6:00 PM Women's · UC San Diego vs UC Santa Barbara | ",
 "Upcoming Mar 5, 6:00 PM Women's · UC San Diego vs UC Irvine | ",
 "Upcoming Mar 6 Women's · UC San Diego at Claremont Convergence | ",
 "Upcoming Mar 12, 3:00 PM Women's · UC San Diego at CSUN | ",
 "Upcoming Mar 13, 10:00 AM Women's · UC San Diego vs Princeton | ",
 "Upcoming Mar 13, 2:20 PM Women's · UC San Diego vs Michigan | ",
 "Upcoming Mar 14, 12:20 PM Women's · UC San Diego vs San Jose State | ",
 "Upcoming Mar 14, 3:20 PM Women's · UC San Diego vs Indiana | ",
 "Upcoming Mar 27, 12:00 PM Women's · UC San Diego at Long Beach State | ",
 "Upcoming Mar 30, 6:00 PM Women's · UC San Diego vs Brown | ",
 "Upcoming Apr 1, 6:00 PM Women's · UC San Diego vs San Diego State | ",
 "Upcoming Apr 3, 12:00 PM Women's · UC San Diego vs Cal State Fullerton | ",
 "Upcoming Apr 9 Women's · UC San Diego at 2027 Big West Championship Quarterfinal | ",
 "Upcoming Apr 10 Women's · UC San Diego at 2027 Big West Championship Semifinal | ",
 "Upcoming Apr 11 Women's · UC San Diego at 2027 Big West Championship Final | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · UC San Diego vs Bucknell | W, 19-9",
 "Final Aug 28 Men's · UC San Diego vs Mercyhurst | W, 21-4",
 "Final Aug 29 Men's · UC San Diego vs La Verne | W, 23-6",
 "Final Aug 29 Men's · UC San Diego vs California | L, 11-15",
 "Final Aug 30 Men's · UC San Diego vs McKendree | W, 21-7",
 "Final Aug 30 Men's · UC San Diego vs Pepperdine | W, 17-15",
 "Final Sep 11 Men's · UC San Diego vs Chapman | W, 19-8",
 "Final Sep 11 Men's · UC San Diego vs Cal State Fullerton | W, 16-9",
 "Final Sep 18 Men's · UC San Diego vs Pepperdine | W, 10-9",
 "Final Sep 19 Men's · UC San Diego vs UCLA | L, 8-16",
 "Final Sep 19 Men's · UC San Diego vs UC Irvine | W, 11-9",
 "Final Sep 20 Men's · UC San Diego vs Long Beach State | L, 16-17",
 "Final Sep 23 Men's · UC San Diego vs LMU | L, 9-10",
 "Final Oct 2 Men's · UC San Diego vs Redlands | W, 15-5",
 "Final Oct 2 Men's · UC San Diego at Pomona-Pitzer | W, 16-10",
 "Final Oct 9 Men's · UC San Diego at Long Beach State | W, 13-12",
 "Final Oct 10 Men's · UC San Diego at USC | L, 9-15",
 "Final Oct 16 Men's · UC San Diego vs UC Santa Barbara | L, 8-14",
 "Final Oct 17 Men's · UC San Diego vs Concordia University Irvine | W, 19-8",
 "Upcoming Oct 23, 6:00 PM Men's · UC San Diego at UC Irvine | ",
 "Upcoming Oct 24, 2:00 PM Men's · UC San Diego vs LMU | ",
 "Upcoming Oct 25, 1:00 PM Men's · UC San Diego vs Stanford | ",
 "Upcoming Oct 30, 6:00 PM Men's · UC San Diego vs Cal State Fullerton | ",
 "Upcoming Nov 6, 5:00 PM Men's · UC San Diego at California Baptist | ",
 "Upcoming Nov 7, 1:00 PM Men's · UC San Diego at UCLA | ",
 "Upcoming Nov 12, 6:00 PM Men's · UC San Diego vs Biola | ",
 "Upcoming Nov 14, 12:00 PM Men's · UC San Diego vs Saint Mary's | ",
 "Upcoming Nov 20 Men's · UC San Diego at 2026 Big West Championship Quarterfinals | ",
 "Upcoming Nov 21 Men's · UC San Diego at 2026 Big West Championship Semifinals | ",
 "Upcoming Nov 22 Men's · UC San Diego at 2026 Big West Championship Final | ",
 "Upcoming Dec 4 Men's · UC San Diego at 2026 National Collegiate Championship Quarterfinals | ",
 "Upcoming Dec 5 Men's · UC San Diego at 2026 National Collegiate Championship Semifinals | ",
 "Upcoming Dec 6 Men's · UC San Diego at 2026 National Collegiate Championship Final | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UC San Diego module checks passed");
