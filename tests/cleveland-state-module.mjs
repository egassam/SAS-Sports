import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {clevelandStateSchool} from '../src/schools/cleveland-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='cleveland-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,clevelandStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cleveland-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit csuvikings.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['cleveland-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',clevelandStateSchool.scheduleUrls],['roster',clevelandStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cleveland-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'csuvikings.com',`${key} must stay on csuvikings.com`);
  }
}
const parity={"Basketball":{"schedule":["https://csuvikings.com/sports/mens-basketball/schedule","https://csuvikings.com/sports/womens-basketball/schedule"],"roster":["https://csuvikings.com/sports/mens-basketball/roster","https://csuvikings.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://csuvikings.com/sports/womens-cross-country/schedule"],"roster":["https://csuvikings.com/sports/womens-cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://csuvikings.com/sports/mens-fencing/schedule"],"roster":["https://csuvikings.com/sports/mens-fencing/roster"],"combined":false},"Golf":{"schedule":["https://csuvikings.com/sports/mens-golf/schedule"],"roster":["https://csuvikings.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://csuvikings.com/sports/mens-lacrosse/schedule"],"roster":["https://csuvikings.com/sports/mens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://csuvikings.com/sports/womens-soccer/schedule","https://csuvikings.com/sports/mens-soccer/schedule"],"roster":["https://csuvikings.com/sports/womens-soccer/roster","https://csuvikings.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://csuvikings.com/sports/womens-swimming-and-diving/schedule","https://csuvikings.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://csuvikings.com/sports/womens-swimming-and-diving/roster","https://csuvikings.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://csuvikings.com/sports/womens-tennis/schedule","https://csuvikings.com/sports/mens-tennis/schedule"],"roster":["https://csuvikings.com/sports/womens-tennis/roster","https://csuvikings.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://csuvikings.com/sports/womens-track-and-field/schedule"],"roster":["https://csuvikings.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://csuvikings.com/sports/womens-volleyball/schedule"],"roster":["https://csuvikings.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'cleveland-state|"+sport+"':"),`${sport} routes must live in the Cleveland State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://csuvikings.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.clevelandStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=cleveland-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 8:00 PM Men's · Cleveland State at Missouri | ",
 "Upcoming Nov 6, 7:00 PM Men's · Cleveland State vs Michigan-Dearborn | ",
 "Upcoming Nov 9, 7:00 PM Men's · Cleveland State at Bowling Green | ",
 "Upcoming Nov 13, 3:00 PM Men's · Cleveland State vs West Florida | ",
 "Upcoming Nov 15, 3:00 PM Men's · Cleveland State at Alabama A&M | ",
 "Upcoming Nov 17, 7:00 PM Men's · Cleveland State at Xavier | ",
 "Upcoming Nov 21, 1:00 PM Men's · Cleveland State vs Kent State | ",
 "Upcoming Nov 25, 7:00 PM Men's · Cleveland State vs Case Western Reserve | ",
 "Upcoming Dec 2, 7:00 PM Men's · Cleveland State vs Youngstown State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Cleveland State at Purdue Fort Wayne | ",
 "Upcoming Dec 13, 2:00 PM Men's · Cleveland State vs Penn State Altoona | ",
 "Upcoming Dec 17, 9:30 PM Men's · Cleveland State at Oregon State | ",
 "Upcoming Dec 21, 7:00 PM Men's · Cleveland State at Pitt | ",
 "Upcoming Dec 30, 7:00 PM Men's · Cleveland State vs Wright State | ",
 "Upcoming Jan 3, 2:00 PM Men's · Cleveland State at Northern Kentucky | ",
 "Upcoming Jan 7, 9:00 PM Men's · Cleveland State at NIU | ",
 "Upcoming Jan 9, 2:00 PM Men's · Cleveland State at IU Indy | ",
 "Upcoming Jan 14, 7:00 PM Men's · Cleveland State vs Milwaukee | ",
 "Upcoming Jan 17, 2:00 PM Men's · Cleveland State vs Robert Morris | ",
 "Upcoming Jan 20, 7:00 PM Men's · Cleveland State vs Green Bay | ",
 "Upcoming Jan 23, 3:00 PM Men's · Cleveland State at Oakland | ",
 "Upcoming Jan 28 Men's · Cleveland State at Wright State | ",
 "Upcoming Jan 31, 3:30 PM Men's · Cleveland State vs Northern Kentucky | ",
 "Upcoming Feb 4, 7:00 PM Men's · Cleveland State at Robert Morris | ",
 "Upcoming Feb 7, 2:00 PM Men's · Cleveland State vs Oakland | ",
 "Upcoming Feb 10, 7:00 PM Men's · Cleveland State vs Purdue Fort Wayne | ",
 "Upcoming Feb 13, 4:30 PM Men's · Cleveland State at Youngstown State | ",
 "Upcoming Feb 19, 7:30 PM Men's · Cleveland State at Green Bay | ",
 "Upcoming Feb 21, 3:00 PM Men's · Cleveland State at Milwaukee | ",
 "Upcoming Feb 24, 7:00 PM Men's · Cleveland State vs NIU | ",
 "Upcoming Feb 27, 3:30 PM Men's · Cleveland State vs Detroit Mercy | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · Cleveland State vs Clarion (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · Cleveland State at Penn State | ",
 "Upcoming Nov 5, 7:00 PM Women's · Cleveland State at Bowling Green | ",
 "Upcoming Nov 10, 12:00 PM Women's · Cleveland State at Drake | ",
 "Upcoming Nov 16, 6:30 PM Women's · Cleveland State at Xavier | ",
 "Upcoming Nov 21, 3:30 PM Women's · Cleveland State vs Kent State | ",
 "Upcoming Nov 24, 6:00 PM Women's · Cleveland State vs Georgia Southern | ",
 "Upcoming Nov 25, 3:00 PM Women's · Cleveland State vs Lindenwood | ",
 "Upcoming Dec 3, 7:00 PM Women's · Cleveland State vs Northern Kentucky | ",
 "Upcoming Dec 6, 2:00 PM Women's · Cleveland State vs Northern Illinois | ",
 "Upcoming Dec 11, 7:00 PM Women's · Cleveland State vs Mercyhurst | ",
 "Upcoming Dec 14, 6:00 PM Women's · Cleveland State at Akron | ",
 "Upcoming Dec 19, 9:00 AM Women's · Cleveland State vs Chicago State | ",
 "Upcoming Dec 20, 9:00 AM Women's · Cleveland State vs Eastern Washington | ",
 "Upcoming Dec 28, 7:00 PM Women's · Cleveland State vs Defiance College | ",
 "Upcoming Dec 31, 2:00 PM Women's · Cleveland State at Green Bay | ",
 "Upcoming Jan 2, 3:00 PM Women's · Cleveland State at Milwaukee | ",
 "Upcoming Jan 7, 7:00 PM Women's · Cleveland State at Purdue Fort Wayne | ",
 "Upcoming Jan 10, 2:00 PM Women's · Cleveland State vs Detroit Mercy | ",
 "Upcoming Jan 13, 6:30 PM Women's · Cleveland State at Oakland | ",
 "Upcoming Jan 16, 2:00 PM Women's · Cleveland State vs Youngstown State | ",
 "Upcoming Jan 21, 6:30 PM Women's · Cleveland State at IU Indy | ",
 "Upcoming Jan 24, 3:00 PM Women's · Cleveland State at Northern Illinois | ",
 "Upcoming Jan 28, 11:00 AM Women's · Cleveland State vs Milwaukee | ",
 "Upcoming Jan 31, 1:00 PM Women's · Cleveland State vs Wright State | ",
 "Upcoming Feb 3, 11:00 AM Women's · Cleveland State at Robert Morris | ",
 "Upcoming Feb 6, 2:00 PM Women's · Cleveland State vs Oakland | ",
 "Upcoming Feb 9, 7:00 PM Women's · Cleveland State vs Green Bay | ",
 "Upcoming Feb 13, 2:00 PM Women's · Cleveland State at Youngstown State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Cleveland State at Wright State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Cleveland State at Detroit Mercy | ",
 "Upcoming Feb 25, 7:00 PM Women's · Cleveland State vs Robert Morris | ",
 "Upcoming Feb 27, 1:00 PM Women's · Cleveland State vs IU Indy | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Cleveland State at Mike Baumer Cross Country Classic | Completed",
 "Final Sep 18 Cleveland State at All-Ohio Classic | Completed",
 "Final Oct 2 Cleveland State at Joe Piane Invite | Completed",
 "Final Oct 16 Cleveland State at Falcon Invite | Completed",
 "Upcoming Oct 31, 11:00 AM Cleveland State at Horizon League Championship | ",
 "Upcoming Nov 13, 11:00 AM Cleveland State at NCAA Great Lakes Regional | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Final Oct 3 Cleveland State at Ohio State Open | Completed",
 "Final Oct 4 Cleveland State at Ohio State Duals | Women's team: 3-2 / Men's team: 3-2",
 "Upcoming Nov 7 Cleveland State at Drew Invite | ",
 "Upcoming Nov 14 Cleveland State at Penn Elite Invite | ",
 "Upcoming Dec 5 Cleveland State at Denison Open | ",
 "Upcoming Jan 17 Cleveland State at JHU Invitational | ",
 "Upcoming Jan 30 Cleveland State at Schiller Duals | ",
 "Upcoming Feb 20 Cleveland State at Central Collegiate Fencing Conference Championship | ",
 "Upcoming Mar 14 Cleveland State at NCAA Regionals | ",
 "Upcoming Mar 25 Cleveland State at NCAA Nationals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Cleveland State at Bowling Green Invite | 10th of 12",
 "Final Sep 14 Cleveland State at Miami (OH) Invite | 12th of 14",
 "Final Sep 26 Cleveland State at Ball State Invite | 15th of 16",
 "Final Oct 5 Cleveland State at Tom Tontimonia Invite | T6th of 12",
 "Final Oct 19 Cleveland State at Dayton Invite | 13th of 13"
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Cleveland State at Kent State | L, 0-3",
 "Final Aug 16 Women's · Cleveland State at EKU | L, 0-5",
 "Final Aug 20 Women's · Cleveland State vs Duquesne | L, 0-3",
 "Final Aug 23 Women's · Cleveland State at Morehead State | L, 0-2",
 "Final Sep 3 Women's · Cleveland State at Akron | L, 0-2",
 "Final Sep 6 Women's · Cleveland State at St. Bonaventure | L, 0-4",
 "Final Sep 10 Women's · Cleveland State vs Southern Indiana | L, 0-1",
 "Final Sep 19 Women's · Cleveland State at Oakland | W, 2-0",
 "Final Sep 24 Women's · Cleveland State at Youngstown State | T, 1-1",
 "Final Sep 27 Women's · Cleveland State at Robert Morris | L, 0-1",
 "Final Oct 1 Women's · Cleveland State vs IU Indy | W, 1-0",
 "Final Oct 4 Women's · Cleveland State vs NIU | L, 2-3",
 "Final Oct 10 Women's · Cleveland State vs Detroit Mercy | W, 1-0",
 "Final Oct 15 Women's · Cleveland State at Northern Kentucky | T, 0-0",
 "Final Oct 18 Women's · Cleveland State at Wright State | T, 2-2",
 "Final Oct 22 Women's · Cleveland State vs Green Bay | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · Cleveland State vs Milwaukee | ",
 "Upcoming Oct 31, 1:00 PM Women's · Cleveland State at Purdue Fort Wayne | ",
 "Upcoming Nov 7 Women's · Cleveland State at Horizon League Quarterfinals | ",
 "Upcoming Nov 11 Women's · Cleveland State at Horizon League Semifinals | ",
 "Upcoming Nov 14 Women's · Cleveland State at Horizon League Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Cleveland State at Santa Clara | L, 1-2",
 "Final Aug 28 Men's · Cleveland State vs Mercyhurst | L, 1-2",
 "Final Sep 1 Men's · Cleveland State at Canisius | W, 3-1",
 "Final Sep 5 Men's · Cleveland State vs FAU | T, 0-0",
 "Final Sep 9 Men's · Cleveland State at Oakland | L, 0-2",
 "Final Sep 12 Men's · Cleveland State vs Detroit Mercy | W, 2-0",
 "Final Sep 19 Men's · Cleveland State vs Green Bay | T, 1-1",
 "Final Sep 22 Men's · Cleveland State at St. Bonaventure | W, 2-1",
 "Final Sep 26 Men's · Cleveland State at Milwaukee | T, 0-0",
 "Final Oct 3 Men's · Cleveland State vs IU Indy | W, 2-0",
 "Final Oct 7 Men's · Cleveland State at Purdue Fort Wayne | W, 2-1",
 "Final Oct 10 Men's · Cleveland State vs Northern Kentucky | W, 5-3",
 "Final Oct 17 Men's · Cleveland State at Wright State | L, 1-2",
 "Final Oct 20 Men's · Cleveland State vs Akron | L, 2-3",
 "Upcoming Oct 25, 3:00 PM Men's · Cleveland State at NIU | ",
 "Upcoming Oct 30, 7:00 PM Men's · Cleveland State vs Robert Morris | ",
 "Upcoming Nov 8 Men's · Cleveland State at Horizon League Quarterfinals | ",
 "Upcoming Nov 11 Men's · Cleveland State at Horizon League Semifinals | ",
 "Upcoming Nov 14 Men's · Cleveland State at Horizon League Championship | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 11 Women's · Cleveland State at IU Indy | L, 152-180",
 "Final Sep 12 Women's · Cleveland State vs Youngstown State | W, 266-68",
 "Final Oct 16 Women's · Cleveland State at Zips Classic | Completed",
 "Upcoming Oct 24 Women's · Cleveland State at St. Bonaventure | ",
 "Upcoming Nov 19 Women's · Cleveland State vs Magnus Cup | ",
 "Upcoming Jan 9, 10:00 AM Women's · Cleveland State at Youngstown State | ",
 "Upcoming Jan 16 Women's · Cleveland State at Cleveland City Classic | ",
 "Upcoming Jan 30, 11:00 AM Women's · Cleveland State at Oakland | ",
 "Upcoming Feb 16 Women's · Cleveland State at Horizon League Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 11 Men's · Cleveland State at IU Indy | L, 127-207",
 "Final Sep 11 Men's · Cleveland State at Youngstown State | W, 272-62",
 "Final Oct 16 Men's · Cleveland State at Zips Classic | Completed",
 "Upcoming Oct 24 Men's · Cleveland State at St. Bonaventure | ",
 "Upcoming Nov 19 Men's · Cleveland State vs Magnus Cup | ",
 "Upcoming Jan 9, 10:00 AM Men's · Cleveland State at Youngstown State | ",
 "Upcoming Jan 16 Men's · Cleveland State at Cleveland City Classic | ",
 "Upcoming Jan 30, 11:00 AM Men's · Cleveland State at Oakland | ",
 "Upcoming Feb 16 Men's · Cleveland State at Horizon League Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Cleveland State at WMU Betsy Kuhle Invitational | No Team Score",
 "Final Oct 2 Women's · Cleveland State at Horizon League Individual Championship | Completed",
 "Today Oct 23 Women's · Cleveland State at Viking Invitational | ",
 "Upcoming Oct 30 Women's · Cleveland State at Rocket Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Cleveland State at ITA All American Championships | Completed",
 "Final Sep 25 Men's · Cleveland State at Horizon League Individual Championship | Completed",
 "Final Oct 2 Men's · Cleveland State at Penn State Invitational | Completed",
 "Final Oct 15 Men's · Cleveland State at ITA Midwest Regional | Completed",
 "Upcoming Oct 30 Men's · Cleveland State at Viking Invitational | ",
 "Upcoming Nov 6 Men's · Cleveland State at Toledo Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Cleveland State vs Morgan State | W, 3-0",
 "Final Aug 28 Cleveland State at Lehigh | L, 0-3",
 "Final Aug 29 Cleveland State vs Gardner-Webb | W, 3-0",
 "Final Sep 4 Cleveland State vs Siena | L, 1-3",
 "Final Sep 4 Cleveland State vs Morehead State | L, 1-3",
 "Final Sep 5 Cleveland State at Mercyhurst | W, 3-1",
 "Final Sep 10 Cleveland State at Akron | L, 1-3",
 "Final Sep 11 Cleveland State vs Valparaiso | L, 2-3",
 "Final Sep 12 Cleveland State vs Coppin State | L, 1-3",
 "Final Sep 17 Cleveland State at Kent State | L, 1-3",
 "Final Sep 18 Cleveland State vs Akron | L, 1-3",
 "Final Sep 25 Cleveland State at Purdue Fort Wayne | L, 2-3",
 "Final Sep 26 Cleveland State at Purdue Fort Wayne | L, 1-3",
 "Final Oct 2 Cleveland State vs Northern Kentucky | L, 1-3",
 "Final Oct 3 Cleveland State vs Wright State | L, 0-3",
 "Final Oct 9 Cleveland State at Milwaukee | L, 0-3",
 "Final Oct 10 Cleveland State at Milwaukee | L, 2-3",
 "Final Oct 16 Cleveland State vs Youngstown State | L, 2-3",
 "Final Oct 17 Cleveland State vs Youngstown State | L, 1-3",
 "Final Oct 22 Cleveland State vs Oakland | L, 1-3",
 "Upcoming Oct 24, 2:00 PM Cleveland State at Oakland | ",
 "Upcoming Oct 30, 6:00 PM Cleveland State vs Green Bay | ",
 "Upcoming Oct 31, 1:00 PM Cleveland State vs Green Bay | ",
 "Upcoming Nov 6, 5:00 PM Cleveland State at Robert Morris | ",
 "Upcoming Nov 7, 5:00 PM Cleveland State vs Robert Morris | ",
 "Upcoming Nov 13, 6:00 PM Cleveland State at Northern Illinois | ",
 "Upcoming Nov 14, 5:00 PM Cleveland State at IU Indy | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Cleveland State module checks passed");
