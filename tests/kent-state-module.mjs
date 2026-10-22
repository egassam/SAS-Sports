import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kentStateSchool} from '../src/schools/kent-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kent-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,kentStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/kent-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit kentstatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['kent-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',kentStateSchool.scheduleUrls],['roster',kentStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('kent-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'kentstatesports.com',`${key} must stay on kentstatesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://kentstatesports.com/sports/baseball/schedule"],"roster":["https://kentstatesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://kentstatesports.com/sports/mens-basketball/schedule","https://kentstatesports.com/sports/womens-basketball/schedule"],"roster":["https://kentstatesports.com/sports/mens-basketball/roster","https://kentstatesports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://kentstatesports.com/sports/cross-country/schedule"],"roster":["https://kentstatesports.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://kentstatesports.com/sports/field-hockey/schedule"],"roster":["https://kentstatesports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://kentstatesports.com/sports/football/schedule"],"roster":["https://kentstatesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://kentstatesports.com/sports/womens-golf/schedule","https://kentstatesports.com/sports/mens-golf/schedule"],"roster":["https://kentstatesports.com/sports/womens-golf/roster","https://kentstatesports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://kentstatesports.com/sports/womens-gymnastics/schedule"],"roster":["https://kentstatesports.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://kentstatesports.com/sports/womens-lacrosse/schedule"],"roster":["https://kentstatesports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://kentstatesports.com/sports/womens-soccer/schedule"],"roster":["https://kentstatesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://kentstatesports.com/sports/softball/schedule"],"roster":["https://kentstatesports.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://kentstatesports.com/sports/womens-track-and-field/schedule","https://kentstatesports.com/sports/mens-track-and-field/schedule"],"roster":["https://kentstatesports.com/sports/womens-track-and-field/roster","https://kentstatesports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://kentstatesports.com/sports/womens-volleyball/schedule"],"roster":["https://kentstatesports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://kentstatesports.com/sports/wrestling/schedule"],"roster":["https://kentstatesports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'kent-state|"+sport+"':"),`${sport} routes must live in the Kent State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://kentstatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.kentStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=kent-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 7:00 PM Men's · Kent State at Xavier (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Kent State at Louisiana Tech | ",
 "Upcoming Nov 6, 7:00 PM Men's · Kent State vs Roberts Wesleyan | ",
 "Upcoming Nov 11, 7:00 PM Men's · Kent State at UNC Wilmington | ",
 "Upcoming Nov 16, 7:00 PM Men's · Kent State vs Eastern Kentucky | ",
 "Upcoming Nov 21, 1:00 PM Men's · Kent State at Cleveland State | ",
 "Upcoming Nov 24, 5:30 PM Men's · Kent State vs Wyoming | ",
 "Upcoming Nov 29, 3:00 PM Men's · Kent State vs Malone | ",
 "Upcoming Dec 2, 7:00 PM Men's · Kent State vs Bowling Green | ",
 "Upcoming Dec 5 Men's · Kent State at Toledo | ",
 "Upcoming Dec 9, 7:00 PM Men's · Kent State at Central Michigan | ",
 "Upcoming Dec 12, 7:00 PM Men's · Kent State vs UMass | ",
 "Upcoming Dec 20 Men's · Kent State at Sun Bowl Invitational | ",
 "Upcoming Jan 2, 2:00 PM Men's · Kent State vs Buffalo | ",
 "Upcoming Jan 5 Men's · Kent State at Ball State | ",
 "Upcoming Jan 9 Men's · Kent State at Western Michigan | ",
 "Upcoming Jan 12, 7:00 PM Men's · Kent State vs Ohio | ",
 "Upcoming Jan 16, 6:00 PM Men's · Kent State vs Miami (OH) | ",
 "Upcoming Jan 19 Men's · Kent State at Eastern Michigan | ",
 "Upcoming Jan 22, 7:00 PM Men's · Kent State at Bowling Green | ",
 "Upcoming Jan 26, 7:00 PM Men's · Kent State vs Ball State | ",
 "Upcoming Jan 30, 2:00 PM Men's · Kent State vs Central Michigan | ",
 "Upcoming Feb 2 Men's · Kent State at Miami (OH) | ",
 "Upcoming Feb 6, 2:00 PM Men's · Kent State vs MAC-Sun Belt Challenge | ",
 "Upcoming Feb 9 Men's · Kent State at UMass | ",
 "Upcoming Feb 13 Men's · Kent State vs Akron | ",
 "Upcoming Feb 16, 7:00 PM Men's · Kent State vs Western Michigan | ",
 "Upcoming Feb 20 Men's · Kent State at Buffalo | ",
 "Upcoming Feb 23 Men's · Kent State at Ohio | ",
 "Upcoming Feb 27, 1:00 PM Men's · Kent State vs Toledo | ",
 "Upcoming Mar 2, 7:00 PM Men's · Kent State vs Eastern Michigan | ",
 "Upcoming Mar 5 Men's · Kent State at Akron | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · Kent State vs Slippery Rock (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Kent State vs Troy | ",
 "Upcoming Nov 7, 1:00 PM Women's · Kent State at Northern Kentucky | ",
 "Upcoming Nov 14, 1:00 PM Women's · Kent State vs Duquesne | ",
 "Upcoming Nov 18, 6:30 PM Women's · Kent State at Butler | ",
 "Upcoming Nov 21, 3:30 PM Women's · Kent State at Cleveland State | ",
 "Upcoming Nov 29, 1:00 PM Women's · Kent State vs Youngstown State | ",
 "Upcoming Dec 2, 11:00 AM Women's · Kent State at Bradley | ",
 "Upcoming Dec 7, 7:00 PM Women's · Kent State at Michigan | ",
 "Upcoming Dec 9, 11:00 AM Women's · Kent State vs Hiram | ",
 "Upcoming Dec 12, 3:30 PM Women's · Kent State vs Marshall | ",
 "Upcoming Dec 19, 12:00 PM Women's · Kent State vs SIUE | ",
 "Upcoming Dec 20, 2:00 PM Women's · Kent State at Florida Atlantic | ",
 "Upcoming Dec 28, 3:00 PM Women's · Kent State at Kentucky | ",
 "Upcoming Jan 3, 4:00 PM Women's · Kent State at Toledo | ",
 "Upcoming Jan 6, 6:30 PM Women's · Kent State at Eastern Michigan | ",
 "Upcoming Jan 9, 1:00 PM Women's · Kent State vs Central Michigan | ",
 "Upcoming Jan 13, 7:00 PM Women's · Kent State vs Ball State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Kent State at UMass | ",
 "Upcoming Jan 20, 7:00 PM Women's · Kent State vs Western Michigan | ",
 "Upcoming Jan 23, 1:00 PM Women's · Kent State vs Buffalo | ",
 "Upcoming Jan 27, 7:00 PM Women's · Kent State at Bowling Green | ",
 "Upcoming Jan 30, 4:00 PM Women's · Kent State at Akron | ",
 "Upcoming Feb 3, 7:00 PM Women's · Kent State vs Ohio | ",
 "Upcoming Feb 6 Women's · Kent State at TBA (MAC-Sun Belt Challenge) | ",
 "Upcoming Feb 10 Women's · Kent State at Miami | ",
 "Upcoming Feb 13, 1:00 PM Women's · Kent State vs Toledo | ",
 "Upcoming Feb 17, 7:00 PM Women's · Kent State vs UMass | ",
 "Upcoming Feb 20 Women's · Kent State at Buffalo | ",
 "Upcoming Feb 24, 7:00 PM Women's · Kent State at Western Michigan | ",
 "Upcoming Feb 27, 3:30 PM Women's · Kent State vs Akron | ",
 "Upcoming Mar 3, 6:30 PM Women's · Kent State at Ball State | ",
 "Upcoming Mar 6, 1:00 PM Women's · Kent State vs Eastern Michigan | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Kent State at Tommy Evans Invite | Completed",
 "Final Sep 18 Kent State at All-Ohio Classic | Completed",
 "Final Oct 2 Kent State at Joe Piane Invite | Completed",
 "Final Oct 16 Kent State at Falcon Invite | Completed",
 "Upcoming Oct 30 Kent State at MAC Championships | ",
 "Upcoming Nov 13 Kent State at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Kent State at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Kent State vs Lafayette | L, 1-2",
 "Final Aug 30 Kent State vs VCU | L, 0-1",
 "Final Sep 4 Kent State at Michigan | L, 0-4",
 "Final Sep 5 Kent State vs Vermont | L, 1-4",
 "Final Sep 11 Kent State vs Michigan State | L, 1-3",
 "Final Sep 13 Kent State vs Delaware | L, 1-2",
 "Final Sep 18 Kent State vs Central Michigan | W, 1-0",
 "Final Sep 20 Kent State vs Bucknell | W, 3-1",
 "Final Sep 25 Kent State vs UMass | L, 0-7",
 "Final Sep 27 Kent State at James Madison | L, 1-2",
 "Final Oct 2 Kent State vs Bellarmine | L, 2-3",
 "Final Oct 9 Kent State vs Ball State | W, 4-1",
 "Final Oct 11 Kent State vs Penn State | L, 0-3",
 "Final Oct 16 Kent State at Longwood | W, 4-1",
 "Final Oct 18 Kent State vs App State | L, 2-3",
 "Upcoming Oct 23, 1:00 PM Kent State at Miami | ",
 "Upcoming Oct 25, 1:00 PM Kent State vs Ohio State | ",
 "Upcoming Oct 30, 3:00 PM Kent State at Ohio | ",
 "Upcoming Nov 4 Kent State at MAC Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Kent State at South Carolina | L, 0-57",
 "Final Sep 12 Kent State vs Wofford College | W, 36-15",
 "Final Sep 19 Kent State at Ohio State | L, 3-59",
 "Final Sep 26 Kent State vs Ball State | W, 26-13",
 "Final Oct 3 Kent State vs Ohio | L, 10-13",
 "Final Oct 10 Kent State at Western Michigan | L, 7-38",
 "Final Oct 17 Kent State at South Florida | L, 2-29",
 "Upcoming Oct 24, 1:00 PM Kent State vs Akron | ",
 "Upcoming Oct 30, 10:30 PM Kent State at Sacramento State | ",
 "Upcoming Nov 10, 7:00 PM Kent State at Bowling Green | ",
 "Upcoming Nov 17, 7:00 PM Kent State vs Miami University (OH) | ",
 "Upcoming Nov 24 Kent State at Eastern Michigan | ",
 "Upcoming Dec 5, 12:00 PM Kent State at MAC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Kent State at Boilermaker Classic | T7th of 16",
 "Final Sep 21 Women's · Kent State at Canadian Collegiate Invitational | 5th of 11",
 "Final Oct 3 Women's · Kent State at Blessings Collegiate Invitational | 4th of 9",
 "Final Oct 12 Women's · Kent State at Illini Women’s Invitational at Medinah | 7th of 15",
 "Upcoming Oct 23 Women's · Kent State at Landfall Tradition | ",
 "Upcoming Jan 31 Women's · Kent State at Purdue Tropical Challenge | ",
 "Upcoming Feb 14 Women's · Kent State at Spartan Suncoast Collegiate Invitational | ",
 "Upcoming Mar 1 Women's · Kent State at Lady Luck Invitational | ",
 "Upcoming Mar 21 Women's · Kent State at Clemson Invitational | ",
 "Upcoming Apr 17 Women's · Kent State at Therese Hession Buckeye Invitational | ",
 "Upcoming Apr 25 Women's · Kent State at MAC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Kent State at Canadian Collegiate | T12th of 13",
 "Final Sep 20 Men's · Kent State at Gopher Invitational | 14th of 15",
 "Final Oct 4 Men's · Kent State at Fighting Irish Intercollegiate | T11th of 14",
 "Final Oct 19 Men's · Kent State at Bank of Tennessee | T7th of 13",
 "Upcoming Feb 13 Men's · Kent State at Hal Williams Invitational | ",
 "Upcoming Mar 15 Men's · Kent State at Michael Marino Invitational | ",
 "Upcoming Mar 28 Men's · Kent State at Hootie at Bulls Bay | ",
 "Upcoming Apr 5 Men's · Kent State at Tiger Invitational | ",
 "Upcoming Apr 12 Men's · Kent State at Mountaineer Invitational | ",
 "Upcoming Apr 24 Men's · Kent State at Illini Invitational | ",
 "Upcoming Apr 30 Men's · Kent State at MAC Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Kent State vs Cleveland State | W, 3-0",
 "Final Aug 17 Kent State at Kentucky | L, 2-5",
 "Final Aug 20 Kent State at Youngstown State | T, 1-1",
 "Final Aug 23 Kent State vs Kansas | L, 1-3",
 "Final Aug 30 Kent State at Duquesne | L, 0-1",
 "Final Sep 6 Kent State vs Cornell | T, 0-0",
 "Final Sep 11 Kent State at Texas Tech | L, 0-3",
 "Final Sep 17 Kent State at Toledo | L, 0-1",
 "Final Sep 20 Kent State vs Miami (OH) | W, 2-0",
 "Final Sep 26 Kent State at UMass | L, 0-1",
 "Final Oct 1 Kent State vs Western Michigan | L, 1-7",
 "Final Oct 4 Kent State at Eastern Michigan | L, 1-2",
 "Final Oct 11 Kent State at Ohio | W, 4-0",
 "Final Oct 15 Kent State vs Ball State | T, 0-0",
 "Final Oct 18 Kent State vs Bowling Green | W, 2-1",
 "Upcoming Oct 25, 1:00 PM Kent State vs Akron | ",
 "Upcoming Oct 29, 7:00 PM Kent State at University at Buffalo | ",
 "Upcoming Nov 1, 1:00 PM Kent State vs Central Michigan | ",
 "Upcoming Nov 7 Kent State at MAC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Kent State at Virginia Tech | L, 0-3",
 "Final Aug 28 Kent State vs Coppin State | W, 3-2",
 "Final Aug 29 Kent State vs William & Mary | W, 3-2",
 "Final Sep 4 Kent State vs Army | L, 0-3",
 "Final Sep 4 Kent State at UT Arlington | L, 2-3",
 "Final Sep 5 Kent State vs Sam Houston | L, 0-3",
 "Final Sep 11 Kent State vs Niagara | W, 3-0",
 "Final Sep 11 Kent State at Mercyhurst | W, 3-2",
 "Final Sep 12 Kent State vs Columbia | W, 3-0",
 "Final Sep 17 Kent State vs Cleveland State | W, 3-1",
 "Final Sep 18 Kent State at Youngstown State | L, 1-3",
 "Final Sep 23 Kent State vs Akron | L, 0-3",
 "Final Sep 25 Kent State at Buffalo | L, 0-3",
 "Final Oct 1 Kent State vs Bowling Green | L, 0-3",
 "Final Oct 2 Kent State vs Bowling Green | W, 3-2",
 "Final Oct 8 Kent State at Toledo | L, 1-3",
 "Final Oct 9 Kent State at Toledo | L, 1-3",
 "Final Oct 14 Kent State at Central Michigan | W, 3-2",
 "Final Oct 15 Kent State at Central Michigan | W, 3-1",
 "Today Oct 22, 6:00 PM Kent State vs Eastern Michigan | ",
 "Upcoming Oct 23, 6:00 PM Kent State vs Eastern Michigan | ",
 "Upcoming Oct 27, 6:00 PM Kent State at Ohio | ",
 "Upcoming Oct 31, 4:00 PM Kent State vs Western Michigan | ",
 "Upcoming Nov 3, 6:00 PM Kent State vs Ohio | ",
 "Upcoming Nov 7, 4:00 PM Kent State vs Miami | ",
 "Upcoming Nov 13, 6:00 PM Kent State at Ball State | ",
 "Upcoming Nov 14, 6:00 PM Kent State at Akron | ",
 "Upcoming Nov 20 Kent State at MAC Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 1:00 PM Kent State at Purdue | ",
 "Upcoming Nov 7 Kent State at Michigan State Open | ",
 "Upcoming Nov 13, 7:00 PM Kent State vs Buffalo | ",
 "Upcoming Dec 3, 6:00 PM Kent State at Lock Haven | ",
 "Upcoming Dec 5, 9:30 AM Kent State at Kent State Open | ",
 "Upcoming Dec 18, 7:00 PM Kent State at Ohio State | ",
 "Upcoming Dec 20, 9:30 AM Kent State at Kent State Open 2 | ",
 "Upcoming Jan 2 Kent State at Soilder Salute | ",
 "Upcoming Jan 9, 6:00 PM Kent State vs George Mason | ",
 "Upcoming Jan 22, 7:00 PM Kent State vs Rider | ",
 "Upcoming Jan 28, 7:00 PM Kent State at Edinboro | ",
 "Upcoming Jan 30, 2:00 PM Kent State at Clarion | ",
 "Upcoming Jan 30, 3:30 PM Kent State vs LIU | ",
 "Upcoming Feb 5, 7:00 PM Kent State at Ohio | ",
 "Upcoming Feb 12, 7:00 PM Kent State at Central Michigan | ",
 "Upcoming Feb 19, 7:00 PM Kent State vs SIUE | ",
 "Upcoming Feb 21 Kent State at Mercyhurst | ",
 "Upcoming Mar 5 Kent State at MAC Championships | ",
 "Upcoming Mar 18 Kent State at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Kent State module checks passed");
