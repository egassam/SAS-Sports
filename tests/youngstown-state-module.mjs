import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {youngstownStateSchool} from '../src/schools/youngstown-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='youngstown-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,youngstownStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/youngstown-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ysusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['youngstown-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',youngstownStateSchool.scheduleUrls],['roster',youngstownStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('youngstown-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ysusports.com',`${key} must stay on ysusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ysusports.com/sports/baseball/schedule"],"roster":["https://ysusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ysusports.com/sports/mens-basketball/schedule","https://ysusports.com/sports/womens-basketball/schedule"],"roster":["https://ysusports.com/sports/mens-basketball/roster","https://ysusports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://ysusports.com/sports/womens-bowling/schedule"],"roster":["https://ysusports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://ysusports.com/sports/xc/schedule"],"roster":["https://ysusports.com/sports/xc/roster"],"combined":false},"Football":{"schedule":["https://ysusports.com/sports/football/schedule"],"roster":["https://ysusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ysusports.com/sports/womens-golf/schedule","https://ysusports.com/sports/mens-golf/schedule"],"roster":["https://ysusports.com/sports/womens-golf/roster","https://ysusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://ysusports.com/sports/womens-lacrosse/schedule"],"roster":["https://ysusports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://ysusports.com/sports/womens-soccer/schedule"],"roster":["https://ysusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ysusports.com/sports/softball/schedule"],"roster":["https://ysusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ysusports.com/sports/swim/schedule"],"roster":["https://ysusports.com/sports/swim/roster"],"combined":false},"Tennis":{"schedule":["https://ysusports.com/sports/womens-tennis/schedule","https://ysusports.com/sports/mens-tennis/schedule"],"roster":["https://ysusports.com/sports/womens-tennis/roster","https://ysusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ysusports.com/sports/track/schedule"],"roster":["https://ysusports.com/sports/track/roster"],"combined":false},"Volleyball":{"schedule":["https://ysusports.com/sports/womens-volleyball/schedule"],"roster":["https://ysusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'youngstown-state|"+sport+"':"),`${sport} routes must live in the Youngstown State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://ysusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.youngstownStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=youngstown-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 12:00 PM Youngstown State vs Clark State College (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · Youngstown State at Akron (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Youngstown State at St. Bonaventure | ",
 "Upcoming Nov 6, 6:30 PM Men's · Youngstown State at Ohio State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Youngstown State at Central Michigan | ",
 "Upcoming Nov 14, 6:00 PM Men's · Youngstown State vs Marshall | ",
 "Upcoming Nov 18, 7:30 PM Men's · Youngstown State at Cincinnati | ",
 "Upcoming Nov 22, 2:00 PM Men's · Youngstown State vs William & Mary | ",
 "Upcoming Nov 23, 6:30 PM Men's · Youngstown State vs Maryland Eastern Shore | ",
 "Upcoming Nov 27, 1:00 PM Men's · Youngstown State vs Bryant & Stratton College | ",
 "Upcoming Dec 2, 7:00 PM Men's · Youngstown State at Cleveland State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Youngstown State at Robert Morris | ",
 "Upcoming Dec 12, 4:00 PM Men's · Youngstown State at South Carolina | ",
 "Upcoming Dec 15, 7:00 PM Men's · Youngstown State at Ole Miss | ",
 "Upcoming Dec 18, 11:00 AM Men's · Youngstown State vs Penn State Shenango | ",
 "Upcoming Dec 20, 2:00 PM Men's · Youngstown State vs Bethany | ",
 "Upcoming Dec 30, 4:00 PM Men's · Youngstown State vs Northern Illinois | ",
 "Upcoming Jan 3, 2:00 PM Men's · Youngstown State at IU Indy | ",
 "Upcoming Jan 6, 6:30 PM Men's · Youngstown State vs Oakland | ",
 "Upcoming Jan 9, 2:00 PM Men's · Youngstown State vs Detroit Mercy | ",
 "Upcoming Jan 14, 7:30 PM Men's · Youngstown State at Green Bay | ",
 "Upcoming Jan 17, 3:00 PM Men's · Youngstown State at Milwaukee | ",
 "Upcoming Jan 20, 6:30 PM Men's · Youngstown State vs IU Indy | ",
 "Upcoming Jan 23, 4:30 PM Men's · Youngstown State vs Purdue Fort Wayne | ",
 "Upcoming Jan 27, 7:00 PM Men's · Youngstown State at Detroit Mercy | ",
 "Upcoming Jan 30, 3:00 PM Men's · Youngstown State at Oakland | ",
 "Upcoming Feb 4, 7:00 PM Men's · Youngstown State at Northern Kentucky | ",
 "Upcoming Feb 7, 2:00 PM Men's · Youngstown State vs Robert Morris | ",
 "Upcoming Feb 10, 7:00 PM Men's · Youngstown State at Northern Illinois | ",
 "Upcoming Feb 13, 4:30 PM Men's · Youngstown State vs Cleveland State | ",
 "Upcoming Feb 17, 6:30 PM Men's · Youngstown State vs Wright State | ",
 "Upcoming Feb 21, 2:00 PM Men's · Youngstown State at Purdue Fort Wayne | ",
 "Upcoming Feb 24, 6:30 PM Men's · Youngstown State vs Green Bay | ",
 "Upcoming Feb 27, 2:00 PM Men's · Youngstown State vs Milwaukee | ",
 "Upcoming Mar 1 Men's · Youngstown State at Horizon League Play-In Game | ",
 "Upcoming Mar 4 Men's · Youngstown State vs Horizon League First Round | ",
 "Upcoming Mar 7 Men's · Youngstown State at Horizon League Second Round | ",
 "Upcoming Mar 8 Men's · Youngstown State at Horizon League Semifinals | ",
 "Upcoming Mar 9 Men's · Youngstown State at Horizon League Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Youngstown State vs Hiram | ",
 "Upcoming Nov 7, 6:30 PM Women's · Youngstown State vs Buffalo | ",
 "Upcoming Nov 10, 11:00 AM Women's · Youngstown State at Toledo | ",
 "Upcoming Nov 14, 3:00 PM Women's · Youngstown State at Colorado | ",
 "Upcoming Nov 17, 11:00 AM Women's · Youngstown State vs Heidelberg | ",
 "Upcoming Nov 24, 6:30 PM Women's · Youngstown State vs Akron | ",
 "Upcoming Nov 29, 1:00 PM Women's · Youngstown State at Kent State | ",
 "Upcoming Dec 3, 6:30 PM Women's · Youngstown State vs Milwaukee | ",
 "Upcoming Dec 5, 5:30 PM Women's · Youngstown State vs Green Bay | ",
 "Upcoming Dec 13, 5:00 PM Women's · Youngstown State at Southern California | ",
 "Upcoming Dec 19, 1:00 PM Women's · Youngstown State at Fairleigh Dickinson | ",
 "Upcoming Dec 20 Women's · Youngstown State vs La Salle / San Diego | ",
 "Upcoming Dec 31, 2:00 PM Women's · Youngstown State vs Northern Illinois | ",
 "Upcoming Jan 2, 1:00 PM Women's · Youngstown State at Northern Kentucky | ",
 "Upcoming Jan 7, 6:30 PM Women's · Youngstown State at Oakland | ",
 "Upcoming Jan 10, 2:00 PM Women's · Youngstown State vs IU Indy | ",
 "Upcoming Jan 13, 6:30 PM Women's · Youngstown State vs Purdue Fort Wayne | ",
 "Upcoming Jan 16, 2:00 PM Women's · Youngstown State at Cleveland State | ",
 "Upcoming Jan 21, 6:30 PM Women's · Youngstown State vs Oakland | ",
 "Upcoming Jan 23, 2:00 PM Women's · Youngstown State vs Detroit Mercy | ",
 "Upcoming Jan 28, 7:00 PM Women's · Youngstown State at Northern Illinois | ",
 "Upcoming Jan 31, 1:00 PM Women's · Youngstown State at IU Indy | ",
 "Upcoming Feb 3, 7:00 PM Women's · Youngstown State at Wright State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Youngstown State vs Robert Morris | ",
 "Upcoming Feb 10, 7:00 PM Women's · Youngstown State at Purdue Fort Wayne | ",
 "Upcoming Feb 13, 2:00 PM Women's · Youngstown State vs Cleveland State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Youngstown State at Milwaukee | ",
 "Upcoming Feb 20, 2:00 PM Women's · Youngstown State at Green Bay | ",
 "Upcoming Feb 25, 6:30 PM Women's · Youngstown State vs Wright State | ",
 "Upcoming Feb 27, 4:00 PM Women's · Youngstown State at Robert Morris | ",
 "Upcoming Mar 3 Women's · Youngstown State at 2027 Horizon League Women's Basketball Championship First Round | ",
 "Upcoming Mar 7 Women's · Youngstown State at 2027 Horizon League Women's Basketball Championship Second Round | ",
 "Upcoming Mar 8 Women's · Youngstown State at 2027 Horizon League Women's Basketball Championship Semifinals | ",
 "Upcoming Mar 9, 12:00 PM Women's · Youngstown State at 2027 Horizon League Women's Basketball Championship Championship | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 16 Youngstown State at Chelsea Gilliam Penguin Classic | 4th of 18 (1-2)",
 "Upcoming Oct 30 Youngstown State at Destination Orlando | ",
 "Upcoming Nov 20 Youngstown State at Jersey Jamboreee | ",
 "Upcoming Jan 15 Youngstown State at Northeast Classic | ",
 "Upcoming Jan 22 Youngstown State at PVAMU Invitational | ",
 "Upcoming Feb 5 Youngstown State at Flyer Classic | ",
 "Upcoming Feb 19 Youngstown State at Big Red Invitational | ",
 "Upcoming Feb 26 Youngstown State at Stallings Invitational | ",
 "Upcoming Mar 5 Youngstown State at Music City Classic | ",
 "Upcoming Mar 17 Youngstown State at Conference USA Championship | ",
 "Upcoming Apr 6 Youngstown State at NCAA Championship | "
]);
  const v_xc=parse("Cross Country","xc");
  assert.deepEqual(v_xc.map(line),[
 "Final Sep 11 Youngstown State at RMU Colonial Invitational | Women's team: 6th / Men's team: 2nd",
 "Final Sep 26 Youngstown State at YSU Collegiate Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 2 Youngstown State at Notre Dame Joe Piane Gold & Blue Invitational | Women's team: 13th / Men's team: 13th",
 "Final Oct 16 Youngstown State at Texas A & M Arturo Barrios Invitational | Women's team: 11th / Men's team: 14th",
 "Upcoming Oct 31, 11:00 AM Youngstown State at Horizon League XC Championship | ",
 "Upcoming Nov 13, 11:00 AM Youngstown State at NCAA Great Lakes Regional Championship | ",
 "Upcoming Nov 21 Youngstown State at NCAA National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Youngstown State vs Mercyhurst | W, 43-10",
 "Final Sep 5 Youngstown State at Kentucky | L, 13-45",
 "Final Sep 12 Youngstown State vs Duquesne | W, 70-13",
 "Final Sep 19 Youngstown State at South Dakota State | L, 20-27",
 "Final Sep 26 Youngstown State vs South Dakota | W, 47-28",
 "Final Oct 3 Youngstown State at Southern Illinois | W, 28-16",
 "Final Oct 10 Youngstown State at Indiana State | W, 57-24",
 "Final Oct 17 Youngstown State vs UNI | W, 35-22",
 "Upcoming Oct 31, 12:00 PM Youngstown State vs North Dakota | ",
 "Upcoming Nov 7, 2:00 PM Youngstown State at Murray State | ",
 "Upcoming Nov 14, 12:00 PM Youngstown State vs Illinois State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Youngstown State at Roseann Schwartz Invitational Presented by Chick-fil-A Tiffany Square Plaza | 4th of 11",
 "Final Sep 7 Women's · Youngstown State at Penn State Nittany Lion Invitational | 14th of 18",
 "Final Sep 20 Women's · Youngstown State at Michigan State Mary Fossum Invitational | 7th of 15",
 "Final Sep 26 Women's · Youngstown State at Notre Dame Fighting Irish Classic | 11th of 14",
 "Final Oct 4 Women's · Youngstown State at Mercyhurst | 1st of 2",
 "Upcoming Oct 24 Women's · Youngstown State at Delaware Lady Blue Hen Invitational | ",
 "Upcoming Feb 15 Women's · Youngstown State at RiverTowne Invitational hosted by Charleston Southern | ",
 "Upcoming Mar 8 Women's · Youngstown State at Orange Tree Invitational hosted by Le Moyne | ",
 "Upcoming Mar 29 Women's · Youngstown State at The Julie hosted by Northern Kentucky | ",
 "Upcoming Apr 5 Women's · Youngstown State at EKU Colonel Classic | ",
 "Upcoming Apr 24 Women's · Youngstown State at Horizon League Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Youngstown State at Joe Feaganes Marshall Invitational | 7th of 14",
 "Final Sep 21 Men's · Youngstown State at River Run Country Club Collegiate hosted by Davidson | 9th of 13",
 "Final Oct 5 Men's · Youngstown State at Tom Tontimonia Invitational hosted by Cleveland State | 8th of 12",
 "Final Oct 19 Men's · Youngstown State at Xavier Invitational | 3rd of 9"
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24, 3:00 PM Youngstown State vs IUP (Exhibition) | ",
 "Upcoming Oct 24, 5:00 PM Youngstown State vs Duquesne (Exhibition) | ",
 "Upcoming Oct 24, 8:00 PM Youngstown State vs Mount Union (Exhibition) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Youngstown State at Pittsburgh | L, 1-2",
 "Final Aug 16 Youngstown State at Indiana | L, 1-3",
 "Final Aug 20 Youngstown State vs Kent State | T, 1-1",
 "Final Aug 23 Youngstown State vs Eastern Kentucky | L, 0-4",
 "Final Aug 30 Youngstown State at Miami (OH) | L, 0-2",
 "Final Sep 3 Youngstown State at Florida | L, 0-2",
 "Final Sep 6 Youngstown State at South Florida | L, 0-2",
 "Final Sep 10 Youngstown State vs Duquesne | T, 1-1",
 "Final Sep 13 Youngstown State vs Navy | L, 0-1",
 "Final Sep 19 Youngstown State at Northern Kentucky | W, 2-1",
 "Final Sep 24 Youngstown State vs Cleveland State | T, 1-1",
 "Final Sep 27 Youngstown State vs Purdue Fort Wayne | W, 3-0",
 "Final Oct 1 Youngstown State at Oakland | W, 1-0",
 "Final Oct 4 Youngstown State at Detroit Mercy | W, 3-0",
 "Final Oct 10 Youngstown State vs Wright State | T, 1-1",
 "Final Oct 15 Youngstown State at Milwaukee | L, 1-2",
 "Final Oct 18 Youngstown State at Green Bay | L, 2-3",
 "Final Oct 22 Youngstown State vs Northern Illinois | T, 1-1",
 "Upcoming Oct 25, 1:00 PM Youngstown State vs IU Indy | ",
 "Upcoming Oct 31, 1:00 PM Youngstown State at Robert Morris | ",
 "Upcoming Nov 7 Youngstown State at Horizon League First Round | ",
 "Upcoming Nov 11 Youngstown State at Horizon League Semifinals | ",
 "Upcoming Nov 14 Youngstown State at Horizon League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swim=parse("Swimming & Diving","swim");
  assert.deepEqual(v_swim.map(line),[
 "Final Oct 2 Youngstown State at Oakland | Completed",
 "Final Oct 16 Youngstown State at Zips Classic | Completed",
 "Upcoming Nov 19, 10:00 AM Youngstown State at YSU Invite | ",
 "Upcoming Dec 2 Youngstown State at Toyota U.S. Open Swimming Championships | ",
 "Upcoming Dec 5, 8:30 AM Youngstown State at Kenyon College | ",
 "Upcoming Jan 9, 10:00 AM Youngstown State vs Cleveland State | ",
 "Upcoming Jan 16, 5:00 PM Youngstown State at Pittsburgh | ",
 "Upcoming Jan 23, 1:00 PM Youngstown State at Niagara (Swimming Only) | ",
 "Upcoming Jan 29 Youngstown State at at Ohio State Winter Classic | ",
 "Upcoming Feb 17 Youngstown State at Horizon League Championships | ",
 "Upcoming Mar 8 Youngstown State at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 17 Youngstown State at Women's NCAA Championships | ",
 "Upcoming Mar 24 Youngstown State at Men's NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Youngstown State at WMU Betsy Kuhle Invitational | Completed",
 "Final Oct 2 Women's · Youngstown State at Toldeo Invitational | Completed",
 "Final Oct 2 Women's · Youngstown State at Horizon League Individual Championship | Completed",
 "Final Oct 8 Women's · Youngstown State at ITA Midwest Regionals | Completed",
 "Today Oct 23 Women's · Youngstown State at Viking Invitational | ",
 "Upcoming Nov 6 Women's · Youngstown State at CSUN Fall Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · Youngstown State at Youngstown State Invitational | Completed",
 "Final Sep 25 Men's · Youngstown State at Horizon League Individual Championships | Completed",
 "Final Oct 15 Men's · Youngstown State at ITA Midwest Regional | Completed",
 "Upcoming Oct 30 Men's · Youngstown State at Cleveland State Invitational | "
]);
  const v_track=parse("Track & Field","track");
  assert.deepEqual(v_track.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Youngstown State vs Mercyhurst | W, 3-0",
 "Final Aug 28 Youngstown State vs Duquesne | L, 1-3",
 "Final Aug 29 Youngstown State vs Canisius | W, 3-0",
 "Final Sep 3 Youngstown State at Butler | L, 0-3",
 "Final Sep 4 Youngstown State vs Ohio | L, 1-3",
 "Final Sep 5 Youngstown State vs Marshall | L, 2-3",
 "Final Sep 11 Youngstown State vs Southern Indiana | L, 1-3",
 "Final Sep 12 Youngstown State vs Winthrop | W, 3-1",
 "Final Sep 13 Youngstown State at Ohio State | L, 2-3",
 "Final Sep 17 Youngstown State at Akron | L, 1-3",
 "Final Sep 18 Youngstown State vs Kent State | W, 3-1",
 "Final Sep 22 Youngstown State at Robert Morris | L, 2-3",
 "Final Oct 2 Youngstown State vs IU Indy | W, 3-0",
 "Final Oct 3 Youngstown State vs IU Indy | L, 2-3",
 "Final Oct 6 Youngstown State vs Robert Morris | W, 3-0",
 "Final Oct 9 Youngstown State at Purdue Fort Wayne | W, 3-1",
 "Final Oct 10 Youngstown State at Purdue Fort Wayne | L, 1-3",
 "Final Oct 16 Youngstown State at Cleveland State | W, 3-2",
 "Final Oct 17 Youngstown State at Cleveland State | W, 3-1",
 "Today Oct 23, 6:00 PM Youngstown State vs Northern Illinois | ",
 "Upcoming Oct 24, 2:00 PM Youngstown State vs Northern Illinois | ",
 "Upcoming Oct 30, 6:00 PM Youngstown State at Wright State | ",
 "Upcoming Oct 31, 4:00 PM Youngstown State at Northern Kentucky | ",
 "Upcoming Nov 6, 4:00 PM Youngstown State vs Oakland | ",
 "Upcoming Nov 7, 4:00 PM Youngstown State at Oakland | ",
 "Upcoming Nov 12, 6:00 PM Youngstown State vs Milwaukee | ",
 "Upcoming Nov 13, 6:00 PM Youngstown State vs Green Bay | ",
 "Upcoming Nov 19 Youngstown State at Horizon League First Round | ",
 "Upcoming Nov 20 Youngstown State at Horizon League Quarterfinals | ",
 "Upcoming Nov 21 Youngstown State at Horizon League Semifinals | ",
 "Upcoming Nov 22 Youngstown State at Horizon League Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_xc,"Cross Country xc");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swim,"Swimming & Diving swim");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_track,"Track & Field track");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Youngstown State module checks passed");
