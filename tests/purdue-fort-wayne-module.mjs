import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {purdueFortWayneSchool} from '../src/schools/purdue-fort-wayne.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='purdue-fort-wayne');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,purdueFortWayneHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/purdue-fort-wayne-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gomastodons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['purdue-fort-wayne'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',purdueFortWayneSchool.scheduleUrls],['roster',purdueFortWayneSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('purdue-fort-wayne|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gomastodons.com',`${key} must stay on gomastodons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gomastodons.com/sports/baseball/schedule"],"roster":["https://gomastodons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gomastodons.com/sports/mens-basketball/schedule","https://gomastodons.com/sports/womens-basketball/schedule"],"roster":["https://gomastodons.com/sports/mens-basketball/roster","https://gomastodons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gomastodons.com/sports/womens-cross-country/schedule","https://gomastodons.com/sports/mens-cross-country/schedule"],"roster":["https://gomastodons.com/sports/womens-cross-country/roster","https://gomastodons.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gomastodons.com/sports/womens-golf/schedule","https://gomastodons.com/sports/mens-golf/schedule"],"roster":["https://gomastodons.com/sports/womens-golf/roster","https://gomastodons.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gomastodons.com/sports/womens-soccer/schedule","https://gomastodons.com/sports/mens-soccer/schedule"],"roster":["https://gomastodons.com/sports/womens-soccer/roster","https://gomastodons.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gomastodons.com/sports/softball/schedule"],"roster":["https://gomastodons.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gomastodons.com/sports/womens-tennis/schedule"],"roster":["https://gomastodons.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gomastodons.com/sports/womens-track-and-field/schedule","https://gomastodons.com/sports/mens-track-and-field/schedule"],"roster":["https://gomastodons.com/sports/womens-track-and-field/roster","https://gomastodons.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gomastodons.com/sports/womens-volleyball/schedule","https://gomastodons.com/sports/mens-volleyball/schedule"],"roster":["https://gomastodons.com/sports/womens-volleyball/roster","https://gomastodons.com/sports/mens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'purdue-fort-wayne|"+sport+"':"),`${sport} routes must live in the Purdue Fort Wayne module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gomastodons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.purdueFortWayneHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=purdue-fort-wayne)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 22 Men's · Purdue FW vs Purdue (Exhibition) | L, 62-92",
 "Upcoming Oct 28, 7:00 PM Men's · Purdue FW at Ball State (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Purdue FW at Duquesne | ",
 "Upcoming Nov 7, 7:00 PM Men's · Purdue FW vs Albion | ",
 "Upcoming Nov 12, 7:00 PM Men's · Purdue FW vs Western Michigan | ",
 "Upcoming Nov 15, 3:00 PM Men's · Purdue FW at Eastern Illinois | ",
 "Upcoming Nov 18, 8:00 PM Men's · Purdue FW at Bradley | ",
 "Upcoming Nov 21, 2:00 PM Men's · Purdue FW vs Calumet College of St. Joseph (Ind.) | ",
 "Upcoming Nov 24, 7:30 PM Men's · Purdue FW at Southeast Missouri | ",
 "Upcoming Nov 28, 1:00 PM Men's · Purdue FW vs Wofford | ",
 "Upcoming Dec 2, 7:00 PM Men's · Purdue FW vs Detroit Mercy | ",
 "Upcoming Dec 5, 2:00 PM Men's · Purdue FW vs Cleveland State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Purdue FW at Xavier | ",
 "Upcoming Dec 12, 2:00 PM Men's · Purdue FW at Buffalo | ",
 "Upcoming Dec 19, 2:00 PM Men's · Purdue FW vs Kuyper | ",
 "Upcoming Dec 22, 8:00 PM Men's · Purdue FW at Wisconsin | ",
 "Upcoming Dec 30, 7:00 PM Men's · Purdue FW vs Robert Morris | ",
 "Upcoming Jan 3, 2:00 PM Men's · Purdue FW at Wright State | ",
 "Upcoming Jan 7, 8:00 PM Men's · Purdue FW at Milwaukee | ",
 "Upcoming Jan 9, 2:00 PM Men's · Purdue FW at Green Bay | ",
 "Upcoming Jan 14, 7:00 PM Men's · Purdue FW vs Oakland | ",
 "Upcoming Jan 16, 7:00 PM Men's · Purdue FW vs IU Indy | ",
 "Upcoming Jan 20, 7:00 PM Men's · Purdue FW at Robert Morris | ",
 "Upcoming Jan 23, 4:30 PM Men's · Purdue FW at Youngstown State | ",
 "Upcoming Jan 28, 6:00 PM Men's · Purdue FW vs Northern Kentucky | ",
 "Upcoming Jan 31, 2:00 PM Men's · Purdue FW vs Wright State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Purdue FW vs Milwaukee | ",
 "Upcoming Feb 7, 2:00 PM Men's · Purdue FW at IU Indy | ",
 "Upcoming Feb 10, 7:00 PM Men's · Purdue FW at Cleveland State | ",
 "Upcoming Feb 13, 2:00 PM Men's · Purdue FW vs Northern Illinois | ",
 "Upcoming Feb 17, 7:00 PM Men's · Purdue FW at Oakland | ",
 "Upcoming Feb 21, 2:00 PM Men's · Purdue FW vs Youngstown State | ",
 "Upcoming Feb 24, 7:00 PM Men's · Purdue FW at Detroit Mercy | ",
 "Upcoming Feb 27, 2:00 PM Men's · Purdue FW at Northern Kentucky | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 26, 7:00 PM Women's · Purdue FW vs Taylor (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Purdue FW vs Xavier | ",
 "Upcoming Nov 6, 12:00 PM Women's · Purdue FW at DePaul | ",
 "Upcoming Nov 10, 7:00 PM Women's · Purdue FW at Western Michigan | ",
 "Upcoming Nov 13, 11:00 AM Women's · Purdue FW vs Valparaiso | ",
 "Upcoming Nov 17, 12:00 PM Women's · Purdue FW at Western Illinois | ",
 "Upcoming Nov 23, 7:00 PM Women's · Purdue FW vs Grace | ",
 "Upcoming Nov 27, 3:30 PM Women's · Purdue FW vs Southern Illinois | ",
 "Upcoming Nov 28, 6:00 PM Women's · Purdue FW vs Louisiana Monroe | ",
 "Upcoming Dec 3, 6:30 PM Women's · Purdue FW at IU Indy | ",
 "Upcoming Dec 6, 2:00 PM Women's · Purdue FW vs Wright State | ",
 "Upcoming Dec 12, 1:00 PM Women's · Purdue FW at Southeast Missouri | ",
 "Upcoming Dec 18, 7:00 PM Women's · Purdue FW vs Eastern Michigan | ",
 "Upcoming Dec 21, 7:00 PM Women's · Purdue FW vs Bowling Green | ",
 "Upcoming Dec 31, 1:00 PM Women's · Purdue FW at Milwaukee | ",
 "Upcoming Jan 2, 2:00 PM Women's · Purdue FW at Green Bay | ",
 "Upcoming Jan 7, 7:00 PM Women's · Purdue FW vs Cleveland State | ",
 "Upcoming Jan 10, 3:00 PM Women's · Purdue FW at Northern Illinois | ",
 "Upcoming Jan 13, 6:30 PM Women's · Purdue FW at Youngstown State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Purdue FW at Robert Morris | ",
 "Upcoming Jan 21, 7:00 PM Women's · Purdue FW vs Northern Kentucky | ",
 "Upcoming Jan 24, 2:00 PM Women's · Purdue FW vs Green Bay | ",
 "Upcoming Jan 27, 7:00 PM Women's · Purdue FW vs Detroit Mercy | ",
 "Upcoming Jan 31, 2:00 PM Women's · Purdue FW at Oakland | ",
 "Upcoming Feb 3, 7:00 PM Women's · Purdue FW vs IU Indy | ",
 "Upcoming Feb 6, 2:00 PM Women's · Purdue FW vs Northern Illinois | ",
 "Upcoming Feb 10, 7:00 PM Women's · Purdue FW vs Youngstown State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Purdue FW at Northern Kentucky | ",
 "Upcoming Feb 17, 7:00 PM Women's · Purdue FW vs Oakland | ",
 "Upcoming Feb 20, 2:00 PM Women's · Purdue FW vs Robert Morris | ",
 "Upcoming Feb 25, 7:00 PM Women's · Purdue FW at Detroit Mercy | ",
 "Upcoming Feb 27, 2:00 PM Women's · Purdue FW at Wright State | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Purdue FW at Mastodon Alumni Open | 1st (25)",
 "Final Sep 19 Women's · Purdue FW at Rumble in the Fort | 3rd (67)",
 "Final Oct 2 Women's · Purdue FW at Joe Piane Invite | 7th (292)",
 "Final Oct 16 Women's · Purdue FW at Under Armour Pre-National Invitational | 20th (554)",
 "Upcoming Oct 31, 11:00 AM Women's · Purdue FW at Horizon League Championships | ",
 "Upcoming Nov 13, 12:00 PM Women's · Purdue FW at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Purdue FW at NCAA National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Purdue FW at Mastodon Alumni Open | 2nd (29)",
 "Final Sep 19 Men's · Purdue FW at Rumble in the Fort | 2nd (52)",
 "Final Oct 2 Men's · Purdue FW at Joe Piane Invite | 16th (380)",
 "Final Oct 16 Men's · Purdue FW at Under Armour Pre-National Invitational | 8th (213)",
 "Upcoming Oct 31, 12:00 PM Men's · Purdue FW at Horizon League Championships | ",
 "Upcoming Nov 13, 12:00 PM Men's · Purdue FW at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Purdue FW at NCAA National Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Purdue FW at Midwest Match Play | Match play: 1-1-1",
 "Final Sep 14 Women's · Purdue FW at The Velvet Classic | 8th of 14",
 "Final Sep 28 Women's · Purdue FW at Hill YEAH! | 3rd of 9",
 "Final Oct 12 Women's · Purdue FW at Evann Parker Memorial | 1st of 6",
 "Final Oct 19 Women's · Purdue FW at Braun Intercollegiate | 5th of 11"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Purdue FW at Joe Feaganes Marshall Invitational | 2nd of 14",
 "Final Sep 26 Men's · Purdue FW at Earl Yestingsmeier Invitational | 4th of 16",
 "Final Oct 5 Men's · Purdue FW at Tom Tontimonia Invitational | T2nd of 12",
 "Final Oct 12 Men's · Purdue FW at Purdue Fall Invitational | T7th of 13",
 "Final Oct 19 Men's · Purdue FW at Gateway Logistics Invitational | 2nd of 9",
 "Upcoming Feb 12 Men's · Purdue FW at Palmas del Mar Collegiate | ",
 "Upcoming Feb 27 Men's · Purdue FW at In Good Standing Class'ic | ",
 "Upcoming Mar 8 Men's · Purdue FW at Surf Club Invitational | ",
 "Upcoming Mar 29 Men's · Purdue FW at Don Benbow Butler Spring Invitational | ",
 "Upcoming Apr 12 Men's · Purdue FW at Austin Peay Intercollegiate | ",
 "Upcoming Apr 17 Men's · Purdue FW at Boilermaker Invitational | ",
 "Upcoming Apr 24 Men's · Purdue FW at Horizon League Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Purdue FW at Purdue | L, 1-7",
 "Final Aug 23 Women's · Purdue FW vs Southern Indiana | T, 0-0",
 "Final Aug 27 Women's · Purdue FW at Central Michigan | L, 1-6",
 "Final Aug 30 Women's · Purdue FW at Eastern Illinois | L, 0-3",
 "Final Sep 3 Women's · Purdue FW vs Valparaiso | L, 0-2",
 "Final Sep 6 Women's · Purdue FW at Illinois State | L, 0-3",
 "Final Sep 13 Women's · Purdue FW at Saint Xavier (Ill.) | W, 3-0",
 "Final Sep 19 Women's · Purdue FW at Detroit Mercy | L, 0-3",
 "Final Sep 24 Women's · Purdue FW at Robert Morris | L, 0-2",
 "Final Sep 27 Women's · Purdue FW at Youngstown State | L, 0-3",
 "Final Oct 1 Women's · Purdue FW vs Northern Illinois | T, 0-0",
 "Final Oct 4 Women's · Purdue FW vs IU Indy | L, 1-2",
 "Final Oct 10 Women's · Purdue FW vs Oakland | T, 1-1",
 "Final Oct 15 Women's · Purdue FW at Wright State | L, 0-4",
 "Final Oct 18 Women's · Purdue FW at Northern Kentucky | L, 0-7",
 "Final Oct 22 Women's · Purdue FW vs Milwaukee | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Women's · Purdue FW vs Green Bay | ",
 "Upcoming Oct 31, 1:00 PM Women's · Purdue FW vs Cleveland State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Purdue FW at Xavier | L, 1-2",
 "Final Aug 31 Men's · Purdue FW at Dayton | L, 1-2",
 "Final Sep 3 Men's · Purdue FW vs Manchester | W, 5-0",
 "Final Sep 9 Men's · Purdue FW vs Defiance | W, 5-0",
 "Final Sep 12 Men's · Purdue FW at IU Indy | W, 2-1",
 "Final Sep 19 Men's · Purdue FW vs Wright State | W, 1-0",
 "Final Sep 26 Men's · Purdue FW at Detroit Mercy | L, 1-2",
 "Final Oct 3 Men's · Purdue FW vs Oakland | T, 3-3",
 "Final Oct 7 Men's · Purdue FW vs Cleveland State | L, 1-2",
 "Final Oct 10 Men's · Purdue FW at Robert Morris | T, 0-0",
 "Final Oct 17 Men's · Purdue FW vs Green Bay | W, 2-1",
 "Upcoming Oct 24, 3:00 PM Men's · Purdue FW at Milwaukee | ",
 "Upcoming Oct 30, 7:00 PM Men's · Purdue FW vs Northern Illinois | ",
 "Upcoming Nov 3, 2:00 PM Men's · Purdue FW at Northern Kentucky | ",
 "Upcoming Nov 8 Men's · Purdue FW at Horizon League Championship First Round | ",
 "Upcoming Nov 11 Men's · Purdue FW at Horizon League Championship Semifinals | ",
 "Upcoming Nov 14 Men's · Purdue FW at Horizon League Championship Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Purdue FW vs Rutgers | W, 3-2",
 "Final Aug 28 Women's · Purdue FW vs Evansville | W, 3-1",
 "Final Aug 29 Women's · Purdue FW at Bellarmine | L, 2-3",
 "Final Sep 1 Women's · Purdue FW at Toledo | L, 0-3",
 "Final Sep 4 Women's · Purdue FW vs Kansas City | L, 1-3",
 "Final Sep 4 Women's · Purdue FW vs Evansville | W, 3-0",
 "Final Sep 5 Women's · Purdue FW at Miami (OH) | L, 1-3",
 "Final Sep 11 Women's · Purdue FW vs Lindenwood | L, 0-3",
 "Final Sep 12 Women's · Purdue FW vs Western Illinois | W, 3-0",
 "Final Sep 13 Women's · Purdue FW at Illinois State | L, 0-3",
 "Final Sep 18 Women's · Purdue FW vs Columbia | W, 3-1",
 "Final Sep 18 Women's · Purdue FW vs Stonehill | W, 3-0",
 "Final Sep 19 Women's · Purdue FW vs Indiana State | L, 1-3",
 "Final Sep 25 Women's · Purdue FW vs Cleveland State | W, 3-2",
 "Final Sep 26 Women's · Purdue FW vs Cleveland State | W, 3-1",
 "Final Oct 2 Women's · Purdue FW at Robert Morris | W, 3-2",
 "Final Oct 3 Women's · Purdue FW at Robert Morris | W, 3-2",
 "Final Oct 9 Women's · Purdue FW vs Youngstown State | L, 1-3",
 "Final Oct 10 Women's · Purdue FW vs Youngstown State | W, 3-1",
 "Final Oct 16 Women's · Purdue FW at Northern Kentucky | L, 0-3",
 "Final Oct 17 Women's · Purdue FW at Northern Kentucky | L, 0-3",
 "Today Oct 23, 7:00 PM Women's · Purdue FW at Green Bay | ",
 "Upcoming Oct 24, 3:00 PM Women's · Purdue FW at Milwaukee | ",
 "Upcoming Oct 27, 7:00 PM Women's · Purdue FW vs Wright State | ",
 "Upcoming Oct 31, 4:00 PM Women's · Purdue FW vs IU Indy | ",
 "Upcoming Nov 3, 7:00 PM Women's · Purdue FW at IU Indy | ",
 "Upcoming Nov 7, 2:00 PM Women's · Purdue FW vs Northern Illinois | ",
 "Upcoming Nov 13, 6:00 PM Women's · Purdue FW vs Oakland | ",
 "Upcoming Nov 14, 4:00 PM Women's · Purdue FW at Wright State | ",
 "Upcoming Nov 19 Women's · Purdue FW at Horizon League Championship | ",
 "Upcoming Nov 20 Women's · Purdue FW at Horizon League Championship | ",
 "Upcoming Nov 21 Women's · Purdue FW at Horizon League Championship | ",
 "Upcoming Nov 22 Women's · Purdue FW at Horizon League Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
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
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Purdue Fort Wayne module checks passed");
