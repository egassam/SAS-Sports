import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {csunSchool} from '../src/schools/csun.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='csun');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,csunHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/csun-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gomatadors.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['csun'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',csunSchool.scheduleUrls],['roster',csunSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('csun|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gomatadors.com',`${key} must stay on gomatadors.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gomatadors.com/sports/baseball/schedule"],"roster":["https://gomatadors.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gomatadors.com/sports/mens-basketball/schedule","https://gomatadors.com/sports/womens-basketball/schedule"],"roster":["https://gomatadors.com/sports/mens-basketball/roster","https://gomatadors.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gomatadors.com/sports/womens-beach-volleyball/schedule"],"roster":["https://gomatadors.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gomatadors.com/sports/cross-country/schedule"],"roster":["https://gomatadors.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gomatadors.com/sports/womens-golf/schedule","https://gomatadors.com/sports/mens-golf/schedule"],"roster":["https://gomatadors.com/sports/womens-golf/roster","https://gomatadors.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gomatadors.com/sports/womens-soccer/schedule","https://gomatadors.com/sports/mens-soccer/schedule"],"roster":["https://gomatadors.com/sports/womens-soccer/roster","https://gomatadors.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gomatadors.com/sports/softball/schedule"],"roster":["https://gomatadors.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gomatadors.com/sports/womens-tennis/schedule"],"roster":["https://gomatadors.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gomatadors.com/sports/womens-track-and-field/schedule","https://gomatadors.com/sports/mens-track-and-field/schedule"],"roster":["https://gomatadors.com/sports/womens-track-and-field/roster","https://gomatadors.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gomatadors.com/sports/womens-volleyball/schedule","https://gomatadors.com/sports/mens-volleyball/schedule"],"roster":["https://gomatadors.com/sports/womens-volleyball/roster","https://gomatadors.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://gomatadors.com/sports/womens-water-polo/schedule"],"roster":["https://gomatadors.com/sports/womens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'csun|"+sport+"':"),`${sport} routes must live in the CSUN module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gomatadors.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.csunHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=csun)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 4, 4:30 PM Men's · CSUN at Wichita State | ",
 "Upcoming Nov 6, 6:00 PM Men's · CSUN at Kansas State | ",
 "Upcoming Nov 12, 7:00 PM Men's · CSUN vs Grace U | ",
 "Upcoming Nov 17, 4:00 PM Men's · CSUN at Troy | ",
 "Upcoming Nov 20, 3:00 PM Men's · CSUN vs Delaware | ",
 "Upcoming Nov 25, 3:00 PM Men's · CSUN at Weber State | ",
 "Upcoming Dec 3, 7:00 PM Men's · CSUN vs Cal Poly | ",
 "Upcoming Dec 5, 2:00 PM Men's · CSUN at Cal State Bakersfield | ",
 "Upcoming Dec 9, 6:00 PM Men's · CSUN at Fresno State | ",
 "Upcoming Dec 12, 7:00 PM Men's · CSUN vs North Dakota | ",
 "Upcoming Dec 19, 7:00 PM Men's · CSUN vs La Sierra | ",
 "Upcoming Dec 22, 7:00 PM Men's · CSUN vs North Dakota State | ",
 "Upcoming Dec 31, 1:00 PM Men's · CSUN at Sacramento State | ",
 "Upcoming Jan 2, 1:00 PM Men's · CSUN at Utah Valley | ",
 "Upcoming Jan 7, 7:00 PM Men's · CSUN vs California Baptist | ",
 "Upcoming Jan 9, 5:00 PM Men's · CSUN vs UC Riverside | ",
 "Upcoming Jan 14, 7:00 PM Men's · CSUN at Long Beach State | ",
 "Upcoming Jan 16, 4:00 PM Men's · CSUN at Cal State Fullerton | ",
 "Upcoming Jan 21, 6:00 PM Men's · CSUN at UC Santa Barbara | ",
 "Upcoming Jan 23, 7:00 PM Men's · CSUN at Cal Poly | ",
 "Upcoming Jan 28, 7:00 PM Men's · CSUN vs Utah Valley | ",
 "Upcoming Jan 30, 5:00 PM Men's · CSUN vs Sacramento State | ",
 "Upcoming Feb 4, 7:00 PM Men's · CSUN at UC San Diego | ",
 "Upcoming Feb 6, 7:00 PM Men's · CSUN at UC Irvine | ",
 "Upcoming Feb 11, 7:00 PM Men's · CSUN vs Cal State Fullerton | ",
 "Upcoming Feb 13, 7:00 PM Men's · CSUN vs Long Beach State | ",
 "Upcoming Feb 18, 7:00 PM Men's · CSUN vs UC Santa Barbara | ",
 "Upcoming Feb 20, 5:00 PM Men's · CSUN vs Cal State Bakersfield | ",
 "Upcoming Feb 25, 7:00 PM Men's · CSUN at UC Riverside | ",
 "Upcoming Feb 27, 5:00 PM Men's · CSUN at California Baptist | ",
 "Upcoming Mar 4, 8:00 PM Men's · CSUN vs UC Irvine | ",
 "Upcoming Mar 6, 5:00 PM Men's · CSUN vs UC San Diego | ",
 "Upcoming Mar 10 Men's · CSUN at Credit Union 1 Big West Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · CSUN vs La Sierra | ",
 "Upcoming Nov 10, 6:00 PM Women's · CSUN at Boise State | ",
 "Upcoming Nov 14, 2:00 PM Women's · CSUN at San Diego | ",
 "Upcoming Nov 19, 6:00 PM Women's · CSUN vs San Diego State | ",
 "Upcoming Nov 27, 2:30 PM Women's · CSUN vs St. Thomas (Minn.) | ",
 "Upcoming Nov 28, 2:30 PM Women's · CSUN vs Idaho | ",
 "Upcoming Dec 3, 6:00 PM Women's · CSUN at Cal Poly | ",
 "Upcoming Dec 5, 2:00 PM Women's · CSUN vs Cal State Bakersfield | ",
 "Upcoming Dec 10, 6:00 PM Women's · CSUN vs Westcliff | ",
 "Upcoming Dec 19, 1:00 PM Women's · CSUN vs New Mexico State | ",
 "Upcoming Dec 31, 1:00 PM Women's · CSUN vs Sacramento State | ",
 "Upcoming Jan 2, 2:00 PM Women's · CSUN vs Utah Valley | ",
 "Upcoming Jan 7, 6:00 PM Women's · CSUN at California Baptist | ",
 "Upcoming Jan 9, 4:00 PM Women's · CSUN at UC Riverside | ",
 "Upcoming Jan 14, 11:30 AM Women's · CSUN vs Long Beach State | ",
 "Upcoming Jan 16, 2:00 PM Women's · CSUN vs Cal State Fullerton | ",
 "Upcoming Jan 21, 6:00 PM Women's · CSUN vs UC Santa Barbara | ",
 "Upcoming Jan 23, 1:00 PM Women's · CSUN vs Cal Poly | ",
 "Upcoming Jan 28, 5:00 PM Women's · CSUN at Utah Valley | ",
 "Upcoming Jan 30, 1:00 PM Women's · CSUN at Sacramento State | ",
 "Upcoming Feb 4, 6:00 PM Women's · CSUN vs UC San Diego | ",
 "Upcoming Feb 6, 2:00 PM Women's · CSUN vs UC Irvine | ",
 "Upcoming Feb 11, 7:00 PM Women's · CSUN at Cal State Fullerton | ",
 "Upcoming Feb 13, 2:00 PM Women's · CSUN at Long Beach State | ",
 "Upcoming Feb 18, 6:00 PM Women's · CSUN at UC Santa Barbara | ",
 "Upcoming Feb 20, 2:00 PM Women's · CSUN at Cal State Bakersfield | ",
 "Upcoming Feb 25, 6:00 PM Women's · CSUN vs UC Riverside | ",
 "Upcoming Feb 27, 1:00 PM Women's · CSUN vs California Baptist | ",
 "Upcoming Mar 4, 6:00 PM Women's · CSUN at UC Irvine | ",
 "Upcoming Mar 6, 6:00 PM Women's · CSUN at UC San Diego | ",
 "Upcoming Mar 10 Women's · CSUN at Big West Conference | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 12 CSUN at Kim Duyst Twilight | 2nd",
 "Final Sep 19 CSUN at UC Riverside Invitational | 15th",
 "Final Oct 17 CSUN at Highlander Classic | 9th",
 "Upcoming Oct 23 CSUN at John Elders Invitational | ",
 "Upcoming Oct 31 CSUN at Big West Championship | ",
 "Upcoming Nov 13 CSUN at NCAA West Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · CSUN at Branch Law Firm/Dick McGuire Invitational | 13th of 13",
 "Final Sep 21 Women's · CSUN at Yellowstone Intercollegiate | 9th of 11",
 "Final Oct 5 Women's · CSUN at Pat Lesser-Harbottle Invitational | 10th of 17",
 "Final Oct 12 Women's · CSUN at Golf Iconic Classic | 17th of 19",
 "Upcoming Feb 13, 8:00 AM Women's · CSUN at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Feb 22, 8:00 AM Women's · CSUN at Causeway Invitational | ",
 "Upcoming Mar 8, 8:00 AM Women's · CSUN at Fresno State Classic | ",
 "Upcoming Mar 22, 8:00 AM Women's · CSUN at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 18, 8:00 AM Women's · CSUN at Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · CSUN at Gene Miranda Falcon Invitational | 16th of 18",
 "Final Oct 5 Men's · CSUN at Oregon State Invitational | 7th of 12",
 "Final Oct 12 Men's · CSUN at Visit Stockton Pacific Invitational | 11th of 18",
 "Upcoming Oct 26, 8:00 AM Men's · CSUN at Ka'anapali Classic Collegiate Invitational | ",
 "Upcoming Feb 1, 8:00 AM Men's · CSUN at Cullum Invitational | ",
 "Upcoming Feb 22, 8:00 AM Men's · CSUN at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 7, 8:00 AM Men's · CSUN at Bandon Dunes Championship | ",
 "Upcoming Mar 21, 1:00 PM Men's · CSUN at UC San Diego Invitational | ",
 "Upcoming Mar 28, 8:00 AM Men's · CSUN at Wyoming Cowboy Classic | ",
 "Upcoming Apr 9, 8:00 AM Men's · CSUN at El Macero Classic | ",
 "Upcoming May 2, 8:00 AM Men's · CSUN at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · CSUN at Boise State | L, 0-3",
 "Final Aug 15 Women's · CSUN at Idaho | L, 0-1",
 "Final Aug 20 Women's · CSUN vs Idaho State | W, 1-0",
 "Final Aug 27 Women's · CSUN at Grand Canyon | L, 0-3",
 "Final Aug 30 Women's · CSUN at New Mexico | L, 2-3",
 "Final Sep 3 Women's · CSUN vs San José State | T, 0-0",
 "Final Sep 6 Women's · CSUN vs UNLV | T, 2-2",
 "Final Sep 10 Women's · CSUN at Utah Tech | W, 4-2",
 "Final Sep 13 Women's · CSUN at Southern Utah | T, 2-2",
 "Final Sep 23 Women's · CSUN vs UC San Diego | L, 0-1",
 "Final Sep 26 Women's · CSUN vs Cal State Fullerton | T, 3-3",
 "Final Sep 30 Women's · CSUN at Long Beach State | W, 4-3",
 "Final Oct 3 Women's · CSUN at Cal State Bakersfield | W, 4-1",
 "Final Oct 10 Women's · CSUN at UC Irvine | W, 4-2",
 "Final Oct 14 Women's · CSUN vs Cal Poly | T, 1-1",
 "Final Oct 17 Women's · CSUN vs California Baptist | T, 0-0",
 "Final Oct 21 Women's · CSUN at UC Riverside | L, 1-3",
 "Upcoming Oct 24, 3:00 PM Women's · CSUN at Sacramento State | ",
 "Upcoming Oct 28, 7:00 PM Women's · CSUN vs UC Santa Barbara | ",
 "Upcoming Oct 31, 1:00 PM Women's · CSUN vs Utah Valley | ",
 "Upcoming Nov 4 Women's · CSUN at Big West Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · CSUN at UNLV | L, 1-2",
 "Final Aug 27 Men's · CSUN vs The Master's | W, 5-1",
 "Final Aug 30 Men's · CSUN vs Oral Roberts | W, 1-0",
 "Final Sep 4 Men's · CSUN vs Houston Christian | T, 2-2",
 "Final Sep 7 Men's · CSUN at Stanford | L, 0-4",
 "Final Sep 13 Men's · CSUN at Pacific | W, 3-1",
 "Final Sep 17 Men's · CSUN vs San José State | L, 0-1",
 "Final Sep 20 Men's · CSUN vs Grand Canyon | L, 1-2",
 "Final Sep 30 Men's · CSUN vs Cal State Bakersfield | T, 2-2",
 "Final Oct 3 Men's · CSUN vs San Diego State | W, 3-0",
 "Final Oct 7 Men's · CSUN at UC Irvine | L, 1-2",
 "Final Oct 10 Men's · CSUN vs Cal State Fullerton | W, 3-1",
 "Final Oct 14 Men's · CSUN at UC Riverside | W, 2-1",
 "Final Oct 17 Men's · CSUN at Utah Valley | L, 0-1",
 "Final Oct 21 Men's · CSUN vs UC San Diego | W, 3-2",
 "Upcoming Oct 24, 7:00 PM Men's · CSUN vs Sacramento State | ",
 "Upcoming Oct 31, 7:00 PM Men's · CSUN at UC Santa Barbara | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 CSUN at Claremont/Pomona Pitzer Fall Invitational | Completed",
 "Final Oct 1 CSUN at Big West Individuals | Completed",
 "Final Oct 15 CSUN at ITA Southwest Regionals | Completed",
 "Upcoming Nov 6 CSUN at CSUN Fall Invite | ",
 "Upcoming Jan 15 CSUN at Beach Winter Invite | ",
 "Upcoming Jan 24 CSUN vs Santa Clara | ",
 "Upcoming Jan 29, 11:00 AM CSUN vs Cal State Los Angeles | ",
 "Upcoming Jan 30, 12:00 PM CSUN at Caltech | ",
 "Upcoming Feb 6, 11:00 AM CSUN at LMU | ",
 "Upcoming Feb 7, 11:00 AM CSUN at San Diego State | ",
 "Upcoming Feb 19, 11:00 AM CSUN vs Nevada | ",
 "Upcoming Feb 21, 12:00 PM CSUN at Cal Poly | ",
 "Upcoming Mar 3, 10:00 AM CSUN vs Youngstown State | ",
 "Upcoming Mar 6, 10:00 AM CSUN vs Idaho State | ",
 "Upcoming Mar 7, 10:00 AM CSUN at UNLV | ",
 "Upcoming Mar 13, 11:00 AM CSUN at UC Davis | ",
 "Upcoming Mar 14, 12:00 PM CSUN at San José State | ",
 "Upcoming Mar 17, 10:00 AM CSUN vs Harvard | ",
 "Upcoming Mar 21, 10:00 AM CSUN vs Sacramento State | ",
 "Upcoming Apr 3, 11:00 AM CSUN vs UC Irvine | ",
 "Upcoming Apr 4, 12:00 PM CSUN at UC Riverside | ",
 "Upcoming Apr 10, 12:00 PM CSUN at Long Beach State | ",
 "Upcoming Apr 15, 1:00 PM CSUN vs UC Santa Barbara | ",
 "Upcoming Apr 18, 1:00 PM CSUN at UC San Diego | ",
 "Upcoming Apr 23, 11:00 AM CSUN vs Cal State Fullerton | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · CSUN at Colorado | L, 0-3",
 "Final Aug 29 Women's · CSUN vs Denver | L, 2-3",
 "Final Aug 30 Women's · CSUN vs Central Arkansas | W, 3-1",
 "Final Sep 4 Women's · CSUN at Kansas State | L, 0-3",
 "Final Sep 5 Women's · CSUN vs Drake | L, 2-3",
 "Final Sep 11 Women's · CSUN vs UNLV | W, 3-2",
 "Final Sep 12 Women's · CSUN vs San Francisco | W, 3-1",
 "Final Sep 13 Women's · CSUN vs Fresno State | W, 3-0",
 "Final Sep 17 Women's · CSUN at LMU | L, 1-3",
 "Final Sep 19 Women's · CSUN vs LMU | L, 2-3",
 "Final Sep 25 Women's · CSUN at UC Santa Barbara | L, 1-3",
 "Final Sep 26 Women's · CSUN at Cal Poly | L, 1-3",
 "Final Oct 2 Women's · CSUN vs Long Beach State | W, 3-0",
 "Final Oct 3 Women's · CSUN vs Cal State Fullerton | W, 3-0",
 "Final Oct 9 Women's · CSUN at UC Riverside | W, 3-0",
 "Final Oct 10 Women's · CSUN at California Baptist | W, 3-1",
 "Final Oct 16 Women's · CSUN vs UC San Diego | L, 1-3",
 "Final Oct 17 Women's · CSUN vs UC Irvine | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Women's · CSUN vs Cal State Bakersfield | ",
 "Upcoming Oct 24, 6:00 PM Women's · CSUN at Cal State Bakersfield | ",
 "Upcoming Oct 30, 6:00 PM Women's · CSUN at Cal State Fullerton | ",
 "Upcoming Oct 31, 3:00 PM Women's · CSUN at Long Beach State | ",
 "Upcoming Nov 5, 6:00 PM Women's · CSUN vs California Baptist | ",
 "Upcoming Nov 7, 4:00 PM Women's · CSUN vs UC Riverside | ",
 "Upcoming Nov 13, 6:00 PM Women's · CSUN at UC Irvine | ",
 "Upcoming Nov 14, 5:00 PM Women's · CSUN at UC San Diego | ",
 "Upcoming Nov 20, 7:00 PM Women's · CSUN vs Utah Valley | ",
 "Upcoming Nov 21, 4:00 PM Women's · CSUN vs Sacramento State | ",
 "Upcoming Nov 25 Women's · CSUN at Big West Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[
 "Upcoming Jan 7, 4:30 PM Men's · CSUN vs Pacific | ",
 "Upcoming Jan 8, 7:00 PM Men's · CSUN vs Concordia Irvine | ",
 "Upcoming Jan 9, 2:00 PM Men's · CSUN vs NJIT | ",
 "Upcoming Jan 15, 6:00 PM Men's · CSUN vs Northern Kentucky | ",
 "Upcoming Jan 20, 6:00 PM Men's · CSUN vs Jessup (Calif.) | ",
 "Upcoming Jan 22, 6:00 PM Men's · CSUN vs Merrimack College | ",
 "Upcoming Jan 27, 6:00 PM Men's · CSUN vs Vanguard (Calif.) | ",
 "Upcoming Jan 29, 7:00 PM Men's · CSUN at Cal Lutheran | ",
 "Upcoming Feb 4, 3:00 PM Men's · CSUN at Fort Valley State | ",
 "Upcoming Feb 5, 11:00 AM Men's · CSUN vs FDU | ",
 "Upcoming Feb 6, 9:00 AM Men's · CSUN vs Queens University of Charlotte | ",
 "Upcoming Feb 10, 6:00 PM Men's · CSUN vs USC | ",
 "Upcoming Feb 12, 6:00 PM Men's · CSUN vs UCLA | ",
 "Upcoming Feb 19, 6:00 PM Men's · CSUN vs Menlo | ",
 "Upcoming Feb 24, 6:00 PM Men's · CSUN vs Cal Lutheran | ",
 "Upcoming Mar 3, 6:00 PM Men's · CSUN vs UC San Diego | ",
 "Upcoming Mar 12, 5:00 PM Men's · CSUN at UC San Diego | ",
 "Upcoming Mar 25, 4:00 PM Men's · CSUN at Princeton | ",
 "Upcoming Mar 27, 9:00 AM Men's · CSUN at Harvard | ",
 "Upcoming Apr 1, 6:00 PM Men's · CSUN vs UC Santa Barbara | ",
 "Upcoming Apr 3, 7:00 PM Men's · CSUN at UC Santa Barbara | ",
 "Upcoming Apr 8, 6:00 PM Men's · CSUN at UC Irvine | ",
 "Upcoming Apr 10, 6:00 PM Men's · CSUN vs UC Irvine | ",
 "Upcoming Apr 15, 6:00 PM Men's · CSUN vs Hawai'i | ",
 "Upcoming Apr 17, 6:00 PM Men's · CSUN vs Hawai'i | ",
 "Upcoming Apr 22, 7:00 PM Men's · CSUN at Long Beach State | ",
 "Upcoming Apr 24, 6:00 PM Men's · CSUN vs Long Beach State | ",
 "Upcoming Apr 29 Men's · CSUN at Big West Men's Volleyball Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Jan 23 CSUN at USC | ",
 "Upcoming Jan 23 CSUN vs Pomona-Pitzer | ",
 "Upcoming Jan 30 CSUN at Cal Lutheran | ",
 "Upcoming Feb 6, 8:30 AM CSUN vs LIU | ",
 "Upcoming Feb 6, 12:15 PM CSUN vs Mount St. Mary's | ",
 "Upcoming Feb 7, 5:00 AM CSUN vs Indiana | ",
 "Upcoming Feb 7, 9:30 AM CSUN vs Marist | ",
 "Upcoming Feb 12, 12:30 PM CSUN at Santa Clara | ",
 "Upcoming Feb 12, 3:30 PM CSUN vs Michigan | ",
 "Upcoming Feb 13, 8:30 AM CSUN vs McKendree | ",
 "Upcoming Feb 13, 1:00 PM CSUN vs San José State | ",
 "Upcoming Feb 20, 12:00 PM CSUN at UC Irvine | ",
 "Upcoming Mar 4, 5:30 PM CSUN vs Villanova | ",
 "Upcoming Mar 4, 7:30 PM CSUN vs McKendree | ",
 "Upcoming Mar 5 CSUN at Convergence Tournament | ",
 "Upcoming Mar 6 CSUN at Convergence Tournament | ",
 "Upcoming Mar 7, 12:00 PM CSUN vs Hawai'i | ",
 "Upcoming Mar 12, 3:00 PM CSUN vs UC San Diego | ",
 "Upcoming Mar 14, 12:00 PM CSUN vs Cal State Fullerton | ",
 "Upcoming Mar 21, 12:00 PM CSUN at Long Beach State | ",
 "Upcoming Mar 27, 12:00 PM CSUN vs California Baptist | ",
 "Upcoming Apr 3, 12:00 PM CSUN at UC Santa Barbara | ",
 "Upcoming Apr 9 CSUN at Big West Conference | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("CSUN module checks passed");
