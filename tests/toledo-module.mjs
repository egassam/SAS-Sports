import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {toledoSchool} from '../src/schools/toledo.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='toledo');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,toledoHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/toledo-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit utrockets.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['toledo'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',toledoSchool.scheduleUrls],['roster',toledoSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('toledo|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'utrockets.com',`${key} must stay on utrockets.com`);
  }
}
const parity={"Baseball":{"schedule":["https://utrockets.com/sports/baseball/schedule"],"roster":["https://utrockets.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://utrockets.com/sports/mens-basketball/schedule","https://utrockets.com/sports/womens-basketball/schedule"],"roster":["https://utrockets.com/sports/mens-basketball/roster","https://utrockets.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://utrockets.com/sports/womens-cross-country/schedule","https://utrockets.com/sports/mens-cross-country/schedule"],"roster":["https://utrockets.com/sports/womens-cross-country/roster","https://utrockets.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://utrockets.com/sports/football/schedule"],"roster":["https://utrockets.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://utrockets.com/sports/womens-golf/schedule","https://utrockets.com/sports/mens-golf/schedule"],"roster":["https://utrockets.com/sports/womens-golf/roster","https://utrockets.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://utrockets.com/sports/rowing/schedule"],"roster":["https://utrockets.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://utrockets.com/sports/womens-soccer/schedule"],"roster":["https://utrockets.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://utrockets.com/sports/softball/schedule"],"roster":["https://utrockets.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://utrockets.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://utrockets.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://utrockets.com/sports/womens-tennis/schedule","https://utrockets.com/sports/mens-tennis/schedule"],"roster":["https://utrockets.com/sports/womens-tennis/roster","https://utrockets.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://utrockets.com/sports/womens-track-and-field/schedule"],"roster":["https://utrockets.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://utrockets.com/sports/womens-volleyball/schedule"],"roster":["https://utrockets.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'toledo|"+sport+"':"),`${sport} routes must live in the Toledo module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://utrockets.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.toledoHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=toledo)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Toledo at Findlay (Exhibition) | W, 88-78",
 "Upcoming Oct 25, 12:00 PM Men's · Toledo vs Northern Illinois (Exhibition) | ",
 "Upcoming Nov 2 Men's · Toledo at Arkansas State | ",
 "Upcoming Nov 5, 8:00 PM Men's · Toledo at Michigan State | ",
 "Upcoming Nov 7, 2:00 PM Men's · Toledo at Marshall | ",
 "Upcoming Nov 10, 7:00 PM Men's · Toledo vs Wright State | ",
 "Upcoming Nov 14, 4:00 PM Men's · Toledo at Detroit Mercy | ",
 "Upcoming Nov 19, 7:00 PM Men's · Toledo vs Robert Morris | ",
 "Upcoming Nov 28, 3:00 PM Men's · Toledo at Valparaiso | ",
 "Upcoming Dec 2, 7:00 PM Men's · Toledo at Ohio | ",
 "Upcoming Dec 5 Men's · Toledo vs Kent State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Toledo vs Eastern Michigan | ",
 "Upcoming Dec 12, 1:00 PM Men's · Toledo at Western Michigan | ",
 "Upcoming Dec 16, 7:00 PM Men's · Toledo vs Oakland | ",
 "Upcoming Dec 30, 12:00 PM Men's · Toledo at Michigan | ",
 "Upcoming Jan 2, 3:00 PM Men's · Toledo at Central Michigan | ",
 "Upcoming Jan 5, 7:00 PM Men's · Toledo vs Miami | ",
 "Upcoming Jan 8, 7:00 PM Men's · Toledo vs Buffalo | ",
 "Upcoming Jan 12, 7:00 PM Men's · Toledo at UMass | ",
 "Upcoming Jan 15, 8:00 PM Men's · Toledo vs Akron | ",
 "Upcoming Jan 19, 7:00 PM Men's · Toledo at Ball State | ",
 "Upcoming Jan 23, 2:00 PM Men's · Toledo at Buffalo | ",
 "Upcoming Jan 26, 7:00 PM Men's · Toledo vs Central Michigan | ",
 "Upcoming Jan 30, 5:00 PM Men's · Toledo at Bowling Green | ",
 "Upcoming Feb 2, 6:30 PM Men's · Toledo at Eastern Michigan | ",
 "Upcoming Feb 6, 2:00 PM Men's · Toledo at Sun Belt Conference | ",
 "Upcoming Feb 9, 7:00 PM Men's · Toledo vs Ball State | ",
 "Upcoming Feb 13, 2:00 PM Men's · Toledo vs Western Michigan | ",
 "Upcoming Feb 16, 7:00 PM Men's · Toledo at Miami | ",
 "Upcoming Feb 20, 2:00 PM Men's · Toledo vs Bowling Green | ",
 "Upcoming Feb 23, 7:00 PM Men's · Toledo at Akron | ",
 "Upcoming Feb 27, 1:00 PM Men's · Toledo at Kent State | ",
 "Upcoming Mar 2, 7:00 PM Men's · Toledo vs UMass | ",
 "Upcoming Mar 5, 7:00 PM Men's · Toledo vs Ohio | ",
 "Upcoming Mar 10 Men's · Toledo at Mid-American Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Women's · Toledo vs Lawrence Tech (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Toledo vs Louisiana Tech | ",
 "Upcoming Nov 7, 2:00 PM Women's · Toledo vs Michigan State | ",
 "Upcoming Nov 10, 11:00 AM Women's · Toledo vs Youngstown State | ",
 "Upcoming Nov 15, 2:00 PM Women's · Toledo vs Valparaiso | ",
 "Upcoming Nov 19, 7:00 PM Women's · Toledo at Detroit Mercy | ",
 "Upcoming Nov 23, 11:00 AM Women's · Toledo vs Navy | ",
 "Upcoming Nov 25, 1:30 PM Women's · Toledo vs Michigan | ",
 "Upcoming Nov 29, 3:00 PM Women's · Toledo at Milwaukee | ",
 "Upcoming Dec 6, 2:00 PM Women's · Toledo vs Cincinnati | ",
 "Upcoming Dec 8, 7:00 PM Women's · Toledo vs Roosevelt | ",
 "Upcoming Dec 12, 3:00 PM Women's · Toledo at Northern Iowa | ",
 "Upcoming Dec 22, 1:00 PM Women's · Toledo vs Oakland | ",
 "Upcoming Dec 29, 7:00 PM Women's · Toledo vs Saginaw Valley | ",
 "Upcoming Jan 3, 4:00 PM Women's · Toledo vs Kent State | ",
 "Upcoming Jan 6 Women's · Toledo at Miami | ",
 "Upcoming Jan 9, 2:00 PM Women's · Toledo vs Akron | ",
 "Upcoming Jan 13 Women's · Toledo at Ohio | ",
 "Upcoming Jan 16 Women's · Toledo at Western Michigan | ",
 "Upcoming Jan 20, 7:00 PM Women's · Toledo vs Miami | ",
 "Upcoming Jan 23 Women's · Toledo at Bowling Green | ",
 "Upcoming Jan 27, 7:00 PM Women's · Toledo vs Ohio | ",
 "Upcoming Jan 30, 2:00 PM Women's · Toledo vs Eastern Michigan | ",
 "Upcoming Feb 3, 6:30 PM Women's · Toledo at Ball State | ",
 "Upcoming Feb 6 Women's · Toledo at Sun Belt Opponent | ",
 "Upcoming Feb 10, 7:00 PM Women's · Toledo vs Central Michigan | ",
 "Upcoming Feb 13 Women's · Toledo at Kent State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Toledo vs Buffalo | ",
 "Upcoming Feb 20 Women's · Toledo at UMass | ",
 "Upcoming Feb 24 Women's · Toledo at Akron | ",
 "Upcoming Feb 27, 2:00 PM Women's · Toledo vs Bowling Green | ",
 "Upcoming Mar 3 Women's · Toledo at Eastern Michigan | ",
 "Upcoming Mar 6, 2:00 PM Women's · Toledo vs Ball State | ",
 "Upcoming Mar 10 Women's · Toledo at MAC Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 Women's · Toledo at Spartan Invitational | 2nd/42 points",
 "Final Sep 19 Women's · Toledo at John McNichols Invitational | 4th/124 points",
 "Final Oct 2 Women's · Toledo at Joe Piane Invitational | 1st/71 points",
 "Final Oct 9 Women's · Toledo at Nuttycombe Wisconsin Invitational | 6th/214 points",
 "Final Oct 16 Women's · Toledo at Falcon Invitational | 2nd/33 points",
 "Upcoming Oct 30, 11:00 AM Women's · Toledo at Mid-American Conference Championships | ",
 "Upcoming Nov 13 Women's · Toledo at NCAA Great Lakes Regional Championship | ",
 "Upcoming Nov 21 Women's · Toledo at NCAA Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 11 Men's · Toledo at Spartan Invitational | No Team Score",
 "Final Sep 19 Men's · Toledo at John McNichols Invitational | 16th/357 points",
 "Final Oct 2 Men's · Toledo at Joe Piane Invitational | No Team Score",
 "Final Oct 16 Men's · Toledo at Under Armour Pre-National Invitational | 8th/277 points",
 "Final Oct 16 Men's · Toledo at Falcon Invitational | 3rd/70 points",
 "Upcoming Oct 30, 12:00 PM Men's · Toledo at Mid-American Conference Championships | ",
 "Upcoming Nov 13 Men's · Toledo at NCAA Great Lakes Regional Championship | ",
 "Upcoming Nov 21 Men's · Toledo at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Toledo at Michigan State | L, 20-30",
 "Final Sep 12 Toledo vs Central Connecticut State | W, 63-10",
 "Final Sep 19 Toledo vs Temple | W, 49-48",
 "Final Sep 26 Toledo vs San Diego State | W, 41-16",
 "Final Oct 3 Toledo at Ball State | W, 39-24",
 "Final Oct 10 Toledo vs Buffalo | L, 8-23",
 "Final Oct 17 Toledo at Eastern Michigan | W, 34-14",
 "Upcoming Oct 24, 12:00 PM Toledo vs Western Michigan | ",
 "Upcoming Nov 4 Toledo at Sacramento State | ",
 "Upcoming Nov 11 Toledo vs UMass | ",
 "Upcoming Nov 20, 7:30 PM Toledo vs Bowling Green | ",
 "Upcoming Nov 27, 12:00 PM Toledo at Ohio | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Toledo at Rocket Classic | 5th",
 "Final Sep 26 Women's · Toledo at Fighting Irish Classic | 12th",
 "Final Oct 5 Women's · Toledo at Oklahoma Intercollegiate | 11th",
 "Final Oct 19 Women's · Toledo at Flyer Invitational | 9th",
 "Upcoming Feb 20 Women's · Toledo at Space Coast Classic | ",
 "Upcoming Mar 8 Women's · Toledo at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 15 Women's · Toledo at Magnolia Collegiate | ",
 "Upcoming Mar 27 Women's · Toledo at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 17 Women's · Toledo at Therese Hession Buckeye Invitational | ",
 "Upcoming Apr 25 Women's · Toledo at Mid-American Conference Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Toledo at Visit Knoxville Collegiate | T8th",
 "Final Sep 13 Men's · Toledo at Inverness Intercollegiate | T2nd",
 "Final Sep 21 Men's · Toledo at Highlands Invitational | 4th",
 "Final Oct 12 Men's · Toledo at Purdue Fall Invitational | 2nd",
 "Final Oct 19 Men's · Toledo at Bank of Tennessee Intercollegiate | 3rd",
 "Upcoming Mar 15 Men's · Toledo at Tiger Invitational | ",
 "Upcoming Mar 28 Men's · Toledo at Hootie at Bulls Bay Intercollegiate | ",
 "Upcoming Apr 4 Men's · Toledo at Calusa Cup | ",
 "Upcoming Apr 12 Men's · Toledo at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 24 Men's · Toledo at Fighting Illini Spring Collegiate | ",
 "Upcoming Apr 30 Men's · Toledo at Mid-American Conference Championships | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 24, 9:00 AM Toledo at Head of the Schuyllkill | ",
 "Upcoming Nov 7, 9:00 AM Toledo at Bald Eagle Collegiate | ",
 "Upcoming Apr 3, 9:00 AM Toledo at Lubbers Cup | ",
 "Upcoming Apr 17, 9:00 AM Toledo at SIRA Championship Regatta | ",
 "Upcoming May 1, 9:00 AM Toledo at Eastern Michigan | ",
 "Upcoming May 1, 9:00 AM Toledo vs Dayton | ",
 "Upcoming May 15, 9:00 AM Toledo at MAC Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Toledo vs Cleveland State (Exhibition) | W, 3-0",
 "Final Aug 8 Toledo at Robert Morris (Exhibition) | W, 2-0",
 "Final Aug 16 Toledo at Dayton | L, 1-2",
 "Final Aug 20 Toledo at Detroit Mercy | W, 1-0",
 "Final Aug 23 Toledo vs Mercyhurst | W, 6-2",
 "Final Aug 27 Toledo at Oakland | W, 1-0",
 "Final Sep 3 Toledo at Duquesne | W, 1-0",
 "Final Sep 6 Toledo vs Georgia Southern | L, 2-3",
 "Final Sep 13 Toledo vs IU Indy | T, 2-2",
 "Final Sep 17 Toledo vs Kent State | W, 1-0",
 "Final Sep 20 Toledo at Buffalo | T, 0-0",
 "Final Sep 25 Toledo vs Western Michigan | L, 0-3",
 "Final Oct 1 Toledo vs Akron | L, 0-1",
 "Final Oct 4 Toledo at UMass | T, 0-0",
 "Final Oct 9 Toledo vs Central Michigan | T, 1-1",
 "Final Oct 15 Toledo at Bowling Green | T, 1-1",
 "Final Oct 18 Toledo vs Ball State | L, 0-1",
 "Upcoming Oct 24, 1:00 PM Toledo at Eastern Michigan | ",
 "Upcoming Oct 29, 3:00 PM Toledo at Ohio | ",
 "Upcoming Nov 1, 1:00 PM Toledo vs Miami | ",
 "Upcoming Nov 7 Toledo at Mid-American Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · Toledo at Aquinas (Mich.) | W, 299-61",
 "Final Oct 16 Women's · Toledo at Wayne State | W, 256-113",
 "Final Oct 16 Women's · Toledo at Eastern Michigan | L, 114.5-217.5",
 "Upcoming Nov 6, 3:00 PM Women's · Toledo at Miami | ",
 "Upcoming Nov 6, 3:00 PM Women's · Toledo vs Northern Kentucky | ",
 "Upcoming Nov 19 Women's · Toledo at Magnus Cup | ",
 "Upcoming Jan 9, 12:00 PM Women's · Toledo at House of Paign Invite | ",
 "Upcoming Jan 15, 5:00 PM Women's · Toledo vs Ohio | ",
 "Upcoming Jan 23, 11:00 AM Women's · Toledo vs Marshall | ",
 "Upcoming Jan 30 Women's · Toledo vs Eastern Michigan | ",
 "Upcoming Feb 5, 5:00 PM Women's · Toledo vs Bowling Green | ",
 "Upcoming Feb 24 Women's · Toledo at MAC Championships Day 1 | ",
 "Upcoming Feb 25 Women's · Toledo at MAC Championships Day 2 | ",
 "Upcoming Feb 26 Women's · Toledo at MAC Championships Day 3 | ",
 "Upcoming Feb 27 Women's · Toledo at MAC Championships Day 4 | ",
 "Upcoming Mar 11 Women's · Toledo at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Toledo at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Toledo at EMU Hidden Duals | No Team Score",
 "Final Oct 2 Women's · Toledo at Rocket Invitational | No Team Score",
 "Upcoming Oct 23, 9:00 AM Women's · Toledo at MAC Individual Championship | ",
 "Upcoming Oct 30 Women's · Toledo at Rocket Indoor Invitational | ",
 "Upcoming Nov 5 Women's · Toledo at ITA Conference Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 7 Men's · Toledo at Rockin' with the Rockets | Completed",
 "Final Oct 9 Men's · Toledo at Fall Competition | Completed",
 "Final Oct 15 Men's · Toledo at ITA Midwest Regionals | Completed",
 "Upcoming Oct 23 Men's · Toledo at Fall Competition | ",
 "Upcoming Nov 5 Men's · Toledo at ITA Conference Masters | ",
 "Upcoming Nov 6 Men's · Toledo at Zach Barden Memorial Invite | ",
 "Upcoming Nov 14 Men's · Toledo at Fall Competition | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Toledo vs Bradley | W, 3-0",
 "Final Aug 29 Toledo vs Binghamton | W, 3-0",
 "Final Aug 29 Toledo vs Oakland | W, 3-0",
 "Final Sep 1 Toledo vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 5 Toledo vs Notre Dame | L, 1-3",
 "Final Sep 10 Toledo vs Lehigh | W, 3-1",
 "Final Sep 11 Toledo vs VCU | W, 3-0",
 "Final Sep 11 Toledo at West Virginia | W, 3-2",
 "Final Sep 18 Toledo vs Missouri | W, 3-2",
 "Final Sep 19 Toledo vs Dayton | L, 2-3",
 "Final Sep 25 Toledo at Akron | W, 3-0",
 "Final Sep 27 Toledo at Buffalo | W, 3-1",
 "Final Oct 2 Toledo vs Ball State | W, 3-1",
 "Final Oct 3 Toledo vs Ball State | W, 3-1",
 "Final Oct 8 Toledo vs Kent State | W, 3-1",
 "Final Oct 9 Toledo vs Kent State | W, 3-1",
 "Final Oct 16 Toledo at Western Michigan | L, 1-3",
 "Final Oct 17 Toledo at Western Michigan | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Toledo vs Ohio | ",
 "Upcoming Oct 24, 4:30 PM Toledo vs Ohio | ",
 "Upcoming Oct 30, 6:30 PM Toledo at Miami | ",
 "Upcoming Oct 31, 4:00 PM Toledo at Miami | ",
 "Upcoming Nov 3, 6:00 PM Toledo at Bowling Green | ",
 "Upcoming Nov 6, 6:00 PM Toledo vs Eastern Michigan | ",
 "Upcoming Nov 13, 6:30 PM Toledo at Central Michigan | ",
 "Upcoming Nov 14, 7:30 PM Toledo vs Bowling Green | ",
 "Upcoming Nov 20 Toledo at MAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Men's tennis "Fall Competition" (Oct 9-11) links no story; the archive's
// weekly department roundup ("this-week-in-rocket-athletics") is not its
// story, so the event is not listed. Mutation: without skipStory the roundup
// becomes its recap.
{
  const event=parse('Tennis','mens-tennis').find(e=>e.status==='Final'&&/Fall Competition/.test(e.opponent));
  recapFixtures.set('https://utrockets.com/sports/mens-tennis/archives',fixture('mens-tennis-archives.html.gz'));
  recapFixtures.set('https://utrockets.com/news/2026/10/12/this-week-in-rocket-athletics-oct-12-18',fixture('story-2026-10-12-this-week-in-rocket-athletics-oct-12-18.html.gz'));
  await worker.toledoHandlers.attachArchiveStory(event);
  assert.equal(event.recap_url,undefined);
  assert.equal(worker.toledoHandlers.isTennisWithoutStory(event),true);
  requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Toledo module checks passed");
