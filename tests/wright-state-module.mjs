import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {wrightStateSchool} from '../src/schools/wright-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='wright-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,wrightStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/wright-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit wsuraiders.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['wright-state'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',wrightStateSchool.scheduleUrls],['roster',wrightStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('wright-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'wsuraiders.com',`${key} must stay on wsuraiders.com`);
  }
}
const parity={"Baseball":{"schedule":["https://wsuraiders.com/sports/baseball/schedule"],"roster":["https://wsuraiders.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://wsuraiders.com/sports/mens-basketball/schedule","https://wsuraiders.com/sports/womens-basketball/schedule"],"roster":["https://wsuraiders.com/sports/mens-basketball/roster","https://wsuraiders.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://wsuraiders.com/sports/bowling/schedule"],"roster":["https://wsuraiders.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://wsuraiders.com/sports/cross-country/schedule"],"roster":["https://wsuraiders.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://wsuraiders.com/sports/mens-golf/schedule"],"roster":["https://wsuraiders.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://wsuraiders.com/sports/womens-soccer/schedule","https://wsuraiders.com/sports/mens-soccer/schedule"],"roster":["https://wsuraiders.com/sports/womens-soccer/roster","https://wsuraiders.com/sports/mens-soccer/roster"],"combined":true},"Track & Field":{"schedule":["https://wsuraiders.com/sports/womens-track-and-field/schedule"],"roster":["https://wsuraiders.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://wsuraiders.com/sports/womens-volleyball/schedule"],"roster":["https://wsuraiders.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'wright-state|"+sport+"':"),`${sport} routes must live in the Wright State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://wsuraiders.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.wrightStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=wright-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · Wright State vs Bellarmine (Exhibition) | W, 76-54",
 "Upcoming Nov 2, 7:00 PM Men's · Wright State vs Air Force | ",
 "Upcoming Nov 6, 7:30 PM Men's · Wright State vs Florida Atlantic | ",
 "Upcoming Nov 10 Men's · Wright State at Toledo | ",
 "Upcoming Nov 13 Men's · Wright State at Samford | ",
 "Upcoming Nov 18, 7:30 PM Men's · Wright State vs Malone | ",
 "Upcoming Nov 23, 1:30 PM Men's · Wright State vs Akron | ",
 "Upcoming Nov 24, 10:00 AM Men's · Wright State vs St. Bonaventure | ",
 "Upcoming Nov 25, 12:30 PM Men's · Wright State vs Yale | ",
 "Upcoming Dec 3 Men's · Wright State at Milwaukee | ",
 "Upcoming Dec 5 Men's · Wright State at Green Bay | ",
 "Upcoming Dec 9, 7:00 PM Men's · Wright State vs Cornerstone | ",
 "Upcoming Dec 16, 7:00 PM Men's · Wright State vs Stetson | ",
 "Upcoming Dec 19 Men's · Wright State at Temple | ",
 "Upcoming Dec 22 Men's · Wright State at Miami (OH) | ",
 "Upcoming Dec 30 Men's · Wright State at Cleveland State | ",
 "Upcoming Jan 3, 2:00 PM Men's · Wright State vs Purdue Fort Wayne | ",
 "Upcoming Jan 6, 7:00 PM Men's · Wright State vs IU Indy | ",
 "Upcoming Jan 9 Men's · Wright State at Northern Illinois | ",
 "Upcoming Jan 14, 7:00 PM Men's · Wright State vs Robert Morris | ",
 "Upcoming Jan 17 Men's · Wright State at Northern Kentucky | ",
 "Upcoming Jan 21, 7:00 PM Men's · Wright State vs Detroit Mercy | ",
 "Upcoming Jan 23, 2:00 PM Men's · Wright State vs Northern Illinois | ",
 "Upcoming Jan 28, 7:30 PM Men's · Wright State vs Cleveland State | ",
 "Upcoming Jan 31 Men's · Wright State at Purdue Fort Wayne | ",
 "Upcoming Feb 4 Men's · Wright State at Oakland | ",
 "Upcoming Feb 7 Men's · Wright State at Detroit Mercy | ",
 "Upcoming Feb 11, 7:00 PM Men's · Wright State vs Green Bay | ",
 "Upcoming Feb 13, 7:00 PM Men's · Wright State vs Milwaukee | ",
 "Upcoming Feb 17 Men's · Wright State at Youngstown State | ",
 "Upcoming Feb 21, 2:00 PM Men's · Wright State vs Northern Kentucky | ",
 "Upcoming Feb 24 Men's · Wright State at IU Indy | ",
 "Upcoming Feb 27, 7:00 PM Men's · Wright State vs Oakland | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3 Women's · Wright State at Loyola Chicago | ",
 "Upcoming Nov 6, 5:00 PM Women's · Wright State vs Ohio Christian | ",
 "Upcoming Nov 8 Women's · Wright State at Michigan | ",
 "Upcoming Nov 13 Women's · Wright State at Indiana State | ",
 "Upcoming Nov 18, 5:00 PM Women's · Wright State vs Marshall | ",
 "Upcoming Nov 22 Women's · Wright State at Stetson | ",
 "Upcoming Nov 24 Women's · Wright State at Bethune-Cookman | ",
 "Upcoming Dec 3, 7:00 PM Women's · Wright State vs Detroit Mercy | ",
 "Upcoming Dec 6 Women's · Wright State at Purdue Fort Wayne | ",
 "Upcoming Dec 13, 2:00 PM Women's · Wright State vs Wilmington | ",
 "Upcoming Dec 15, 11:00 AM Women's · Wright State vs Canisius | ",
 "Upcoming Dec 19 Women's · Wright State at Butler | ",
 "Upcoming Dec 20 Women's · Wright State at Illinois | ",
 "Upcoming Dec 31 Women's · Wright State at IU Indy | ",
 "Upcoming Jan 2, 2:00 PM Women's · Wright State vs Oakland | ",
 "Upcoming Jan 7, 7:00 PM Women's · Wright State vs Green Bay | ",
 "Upcoming Jan 10, 2:00 PM Women's · Wright State vs Robert Morris | ",
 "Upcoming Jan 13 Women's · Wright State at Northern Illinois | ",
 "Upcoming Jan 16, 2:00 PM Women's · Wright State vs Northern Kentucky | ",
 "Upcoming Jan 21 Women's · Wright State at Green Bay | ",
 "Upcoming Jan 23 Women's · Wright State at Milwaukee | ",
 "Upcoming Jan 28, 5:00 PM Women's · Wright State vs IU Indy | ",
 "Upcoming Jan 31 Women's · Wright State at Cleveland State | ",
 "Upcoming Feb 3, 7:00 PM Women's · Wright State vs Youngstown State | ",
 "Upcoming Feb 6, 12:00 PM Women's · Wright State vs Milwaukee | ",
 "Upcoming Feb 10 Women's · Wright State at Detroit Mercy | ",
 "Upcoming Feb 13 Women's · Wright State at Oakland | ",
 "Upcoming Feb 17, 7:00 PM Women's · Wright State vs Cleveland State | ",
 "Upcoming Feb 20 Women's · Wright State at Northern Kentucky | ",
 "Upcoming Feb 25 Women's · Wright State at Youngstown State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Wright State vs Purdue Fort Wayne | "
]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[
 "Final Oct 16 Wright State at Chelsea Gilliam Penguin Classic | Completed",
 "Upcoming Oct 30 Wright State at Destination Florida | ",
 "Upcoming Nov 13 Wright State at Bearcat Invitational | ",
 "Upcoming Nov 21 Wright State at Raider Classic | ",
 "Upcoming Jan 15 Wright State at Northeast Classic | ",
 "Upcoming Jan 29 Wright State at Hammer Saints Invite | ",
 "Upcoming Feb 5 Wright State at Flyer Classic | ",
 "Upcoming Feb 19 Wright State at Big Red Invite | ",
 "Upcoming Mar 5 Wright State at Music City Classic | ",
 "Upcoming Mar 12 Wright State at USBC Sectionals | ",
 "Upcoming Mar 17 Wright State at Conference USA Championship | ",
 "Upcoming Apr 6 Wright State at NCAA National Championship | ",
 "Upcoming Apr 12 Wright State at USBC Nationals | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Wright State at Mike Baumer Cross Country Classic | Women's team: 5th / Men's team: 3rd",
 "Final Sep 11 Wright State at RMU Colonial XC Invitational | Completed",
 "Final Oct 3 Wright State at Louisville Cross Country Classic | Women's team: 3rd / Men's team: 12th",
 "Final Oct 16 Wright State at Falcon Invitational | Completed",
 "Upcoming Oct 31 Wright State at Horizon League Championship | ",
 "Upcoming Nov 13 Wright State at NCAA Great Lakes Regional | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Wright State at The Virtues Intercollegiate | Completed",
 "Final Sep 14 Wright State at Joe Feaganes Marshall Invitational | 8th of 14",
 "Final Sep 26 Wright State at Earl Yestingmeier Invitational | 3rd of 16",
 "Final Oct 12 Wright State at Moraine Intercollegiate | Completed",
 "Final Oct 12 Wright State at Raider Individual (Individuals only) | No team score (individuals only)",
 "Final Oct 19 Wright State at Dayton Flyer Invitational | Completed",
 "Upcoming Feb 15 Wright State at Border Olympics | ",
 "Upcoming Feb 27 Wright State at Lake Jovita Invitational | ",
 "Upcoming Mar 8 Wright State at Surf Club Intercollegiate | ",
 "Upcoming Mar 27 Wright State at Sweetens Cove Intercollegiate | ",
 "Upcoming Apr 5 Wright State at Memphis Intercollegiate: Spirited by Old Dominick | ",
 "Upcoming Apr 11 Wright State at Wright State Invitational | ",
 "Upcoming Apr 24 Wright State at Horizon League Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Wright State at Southern Indiana | T, 0-0",
 "Final Aug 16 Women's · Wright State vs Butler | W, 2-1",
 "Final Aug 20 Women's · Wright State vs IU Pennsylvania | W, 5-1",
 "Final Aug 23 Women's · Wright State at Marshall | L, 2-3",
 "Final Aug 30 Women's · Wright State at Kentucky | L, 1-9",
 "Final Sep 3 Women's · Wright State at Dayton | L, 1-2",
 "Final Sep 10 Women's · Wright State at Bellarmine | L, 1-2",
 "Final Sep 13 Women's · Wright State vs Indiana State | L, 1-2",
 "Final Sep 19 Women's · Wright State vs Robert Morris | W, 1-0",
 "Final Sep 24 Women's · Wright State at IU Indy | W, 3-1",
 "Final Sep 27 Women's · Wright State at Northern Illinois | L, 0-1",
 "Final Oct 1 Women's · Wright State vs Green Bay | W, 2-1",
 "Final Oct 4 Women's · Wright State vs Milwaukee | L, 1-2",
 "Final Oct 10 Women's · Wright State at Youngstown State | T, 1-1",
 "Final Oct 15 Women's · Wright State vs Purdue Fort Wayne | W, 4-0",
 "Final Oct 18 Women's · Wright State vs Cleveland State | T, 2-2",
 "Upcoming Oct 22, 7:00 PM Women's · Wright State at Oakland | ",
 "Upcoming Oct 25, 1:00 PM Women's · Wright State at Detroit Mercy | ",
 "Upcoming Oct 31, 1:00 PM Women's · Wright State at Northern Kentucky | ",
 "Upcoming Nov 7 Women's · Wright State at Horizon League Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Wright State at Bowling Green | L, 2-5",
 "Final Aug 23 Men's · Wright State vs Belmont | L, 1-6",
 "Final Aug 27 Men's · Wright State at Eastern Illinois | W, 2-1",
 "Final Aug 30 Men's · Wright State vs Lindenwood | T, 1-1",
 "Final Sep 3 Men's · Wright State at Louisville | L, 0-3",
 "Final Sep 9 Men's · Wright State at Milwaukee | W, 3-2",
 "Final Sep 12 Men's · Wright State vs Green Bay | W, 3-1",
 "Final Sep 19 Men's · Wright State at Purdue Fort Wayne | L, 0-1",
 "Final Sep 22 Men's · Wright State at Xavier | L, 0-6",
 "Final Sep 26 Men's · Wright State vs Northern Illinois | L, 1-2",
 "Final Oct 7 Men's · Wright State at Northern Kentucky | T, 1-1",
 "Final Oct 10 Men's · Wright State at Detroit Mercy | W, 6-1",
 "Final Oct 17 Men's · Wright State vs Cleveland State | W, 2-1",
 "Final Oct 20 Men's · Wright State vs Ohio Northern | W, 3-2",
 "Upcoming Oct 24, 3:00 PM Men's · Wright State at Robert Morris | ",
 "Upcoming Oct 30, 7:00 PM Men's · Wright State vs IU Indy | ",
 "Upcoming Nov 3, 2:00 PM Men's · Wright State vs Oakland | ",
 "Upcoming Nov 8 Men's · Wright State at Horizon League Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Wright State vs Santa Clara | W, 3-2",
 "Final Aug 29 Wright State vs Eastern Illinois | W, 3-0",
 "Final Aug 29 Wright State vs Marquette | L, 0-3",
 "Final Sep 4 Wright State vs Western Kentucky | L, 0-3",
 "Final Sep 5 Wright State vs Ball State | L, 0-3",
 "Final Sep 6 Wright State vs Dayton | W, 3-2",
 "Final Sep 11 Wright State vs High Point | W, 3-1",
 "Final Sep 12 Wright State vs Jacksonville | L, 0-3",
 "Final Sep 13 Wright State at Pittsburgh | L, 0-3",
 "Final Sep 18 Wright State vs Drake | W, 3-0",
 "Final Sep 25 Wright State vs Northern Illinois | W, 3-0",
 "Final Sep 26 Wright State vs Northern Illinois | W, 3-0",
 "Final Oct 2 Wright State at Oakland | W, 3-0",
 "Final Oct 3 Wright State at Cleveland State | W, 3-0",
 "Final Oct 9 Wright State vs Green Bay | W, 3-0",
 "Final Oct 10 Wright State vs Green Bay | W, 3-2",
 "Final Oct 16 Wright State at IU Indy | W, 3-1",
 "Final Oct 17 Wright State at IU Indy | W, 3-0",
 "Final Oct 20 Wright State vs Northern Kentucky | W, 3-2",
 "Upcoming Oct 24, 2:00 PM Wright State vs Robert Morris | ",
 "Upcoming Oct 27, 7:00 PM Wright State at Purdue Fort Wayne | ",
 "Upcoming Oct 30, 6:00 PM Wright State vs Youngstown State | ",
 "Upcoming Nov 6, 7:00 PM Wright State at Milwaukee | ",
 "Upcoming Nov 7, 1:00 PM Wright State at Milwaukee | ",
 "Upcoming Nov 13, 6:00 PM Wright State at Northern Kentucky | ",
 "Upcoming Nov 14, 4:00 PM Wright State vs Purdue Fort Wayne | ",
 "Upcoming Nov 19 Wright State at Horizon League Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Wright State module checks passed");
