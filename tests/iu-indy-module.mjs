import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {iuIndySchool} from '../src/schools/iu-indy.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='iu-indy');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,iuIndyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/iu-indy-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit iuindyjags.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['iu-indy'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',iuIndySchool.scheduleUrls],['roster',iuIndySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('iu-indy|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'iuindyjags.com',`${key} must stay on iuindyjags.com`);
  }
}
const parity={"Basketball":{"schedule":["https://iuindyjags.com/sports/mens-basketball/schedule","https://iuindyjags.com/sports/womens-basketball/schedule"],"roster":["https://iuindyjags.com/sports/mens-basketball/roster","https://iuindyjags.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://iuindyjags.com/sports/womens-cross-country/schedule","https://iuindyjags.com/sports/mens-cross-country/schedule"],"roster":["https://iuindyjags.com/sports/womens-cross-country/roster","https://iuindyjags.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://iuindyjags.com/sports/womens-golf/schedule","https://iuindyjags.com/sports/mens-golf/schedule"],"roster":["https://iuindyjags.com/sports/womens-golf/roster","https://iuindyjags.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://iuindyjags.com/sports/womens-soccer/schedule","https://iuindyjags.com/sports/mens-soccer/schedule"],"roster":["https://iuindyjags.com/sports/womens-soccer/roster","https://iuindyjags.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://iuindyjags.com/sports/softball/schedule"],"roster":["https://iuindyjags.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://iuindyjags.com/sports/womens-swimming-and-diving/schedule","https://iuindyjags.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://iuindyjags.com/sports/womens-swimming-and-diving/roster","https://iuindyjags.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://iuindyjags.com/sports/womens-tennis/schedule","https://iuindyjags.com/sports/mens-tennis/schedule"],"roster":["https://iuindyjags.com/sports/womens-tennis/roster","https://iuindyjags.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://iuindyjags.com/sports/womens-track-and-field/schedule","https://iuindyjags.com/sports/mens-track-and-field/schedule"],"roster":["https://iuindyjags.com/sports/womens-track-and-field/roster","https://iuindyjags.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://iuindyjags.com/sports/womens-volleyball/schedule"],"roster":["https://iuindyjags.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'iu-indy|"+sport+"':"),`${sport} routes must live in the IU Indianapolis module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://iuindyjags.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.iuIndyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=iu-indy)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · IU Indy at Austin Peay (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Men's · IU Indy vs Miami University (Middletown) | ",
 "Upcoming Nov 7, 5:00 PM Men's · IU Indy vs UT Martin | ",
 "Upcoming Nov 11, 6:30 PM Men's · IU Indy vs Southern Indiana | ",
 "Upcoming Nov 14, 7:30 PM Men's · IU Indy at Morehead State | ",
 "Upcoming Nov 18, 6:30 PM Men's · IU Indy at Penn State | ",
 "Upcoming Nov 22, 4:30 PM Men's · IU Indy vs UMES | ",
 "Upcoming Nov 23, 3:30 PM Men's · IU Indy vs William & Mary | ",
 "Upcoming Nov 29, 1:00 PM Men's · IU Indy at Tulsa | ",
 "Upcoming Dec 2, 6:30 PM Men's · IU Indy vs Robert Morris | ",
 "Upcoming Dec 5, 2:00 PM Men's · IU Indy vs Oakland | ",
 "Upcoming Dec 8, 8:00 PM Men's · IU Indy at Kansas State | ",
 "Upcoming Dec 12, 7:00 PM Men's · IU Indy at Loyola University Chicago | ",
 "Upcoming Dec 17, 2:00 PM Men's · IU Indy vs Judson | ",
 "Upcoming Dec 22, 12:00 PM Men's · IU Indy vs Charleston Southern | ",
 "Upcoming Dec 30, 7:00 PM Men's · IU Indy at Northern Kentucky | ",
 "Upcoming Jan 3, 2:00 PM Men's · IU Indy vs Youngstown State | ",
 "Upcoming Jan 6, 7:00 PM Men's · IU Indy at Wright State | ",
 "Upcoming Jan 9, 2:00 PM Men's · IU Indy vs Cleveland State | ",
 "Upcoming Jan 14, 6:30 PM Men's · IU Indy vs Northern Kentucky | ",
 "Upcoming Jan 16, 7:00 PM Men's · IU Indy at Purdue Fort Wayne | ",
 "Upcoming Jan 20, 6:30 PM Men's · IU Indy at Youngstown State | ",
 "Upcoming Jan 23, 1:00 PM Men's · IU Indy at Robert Morris | ",
 "Upcoming Jan 27, 6:30 PM Men's · IU Indy vs Green Bay | ",
 "Upcoming Jan 30, 4:00 PM Men's · IU Indy at Detroit Mercy | ",
 "Upcoming Feb 4, 6:30 PM Men's · IU Indy vs Northern Illinois | ",
 "Upcoming Feb 7, 2:00 PM Men's · IU Indy vs Purdue Fort Wayne | ",
 "Upcoming Feb 11, 7:00 PM Men's · IU Indy at Oakland | ",
 "Upcoming Feb 13, 4:00 PM Men's · IU Indy vs Detroit Mercy | ",
 "Upcoming Feb 19, 7:00 PM Men's · IU Indy at Milwaukee | ",
 "Upcoming Feb 21, 1:00 PM Men's · IU Indy at Green Bay | ",
 "Upcoming Feb 24, 6:30 PM Men's · IU Indy vs Wright State | ",
 "Upcoming Feb 27, 4:30 PM Men's · IU Indy at Northern Illinois | ",
 "Upcoming Mar 1 Men's · IU Indy at Horizon League Play-In | ",
 "Upcoming Mar 4 Men's · IU Indy vs Horizon League - 1st Round | ",
 "Upcoming Mar 7 Men's · IU Indy vs Horizon League - 2nd Round | ",
 "Upcoming Mar 8 Men's · IU Indy at Horizon League - Semifinals | ",
 "Upcoming Mar 9 Men's · IU Indy at Horizon League - Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · IU Indy at Purdue | ",
 "Upcoming Nov 5, 6:30 PM Women's · IU Indy vs SIUE | ",
 "Upcoming Nov 10, 7:00 PM Women's · IU Indy at Indiana State | ",
 "Upcoming Nov 15, 6:00 PM Women's · IU Indy at Morehead State | ",
 "Upcoming Nov 18, 6:30 PM Women's · IU Indy vs Evansville | ",
 "Upcoming Nov 21, 3:00 PM Women's · IU Indy at DePaul | ",
 "Upcoming Nov 25, 1:00 PM Women's · IU Indy vs IU Columbus | ",
 "Upcoming Dec 3, 6:30 PM Women's · IU Indy vs Purdue Fort Wayne | ",
 "Upcoming Dec 6, 2:00 PM Women's · IU Indy at Oakland | ",
 "Upcoming Dec 9, 11:00 AM Women's · IU Indy at Ball State | ",
 "Upcoming Dec 12, 2:00 PM Women's · IU Indy at Cincinnati | ",
 "Upcoming Dec 19, 11:00 AM Women's · IU Indy vs South Dakota State | ",
 "Upcoming Dec 20, 3:30 PM Women's · IU Indy vs San Diego State | ",
 "Upcoming Dec 28, 2:00 PM Women's · IU Indy vs Grace College (Ind.) | ",
 "Upcoming Dec 31, 1:00 PM Women's · IU Indy vs Wright State | ",
 "Upcoming Jan 3, 4:00 PM Women's · IU Indy at Detroit Mercy | ",
 "Upcoming Jan 7, 6:00 PM Women's · IU Indy at Robert Morris | ",
 "Upcoming Jan 10, 2:00 PM Women's · IU Indy at Youngstown State | ",
 "Upcoming Jan 13, 6:30 PM Women's · IU Indy vs Milwaukee | ",
 "Upcoming Jan 16, 2:00 PM Women's · IU Indy vs Northern Illinois | ",
 "Upcoming Jan 21, 6:30 PM Women's · IU Indy vs Cleveland State | ",
 "Upcoming Jan 24, 1:00 PM Women's · IU Indy at Northern Kentucky | ",
 "Upcoming Jan 28, 5:00 PM Women's · IU Indy at Wright State | ",
 "Upcoming Jan 31, 1:00 PM Women's · IU Indy vs Youngstown State | ",
 "Upcoming Feb 3, 7:00 PM Women's · IU Indy at Purdue Fort Wayne | ",
 "Upcoming Feb 6, 1:00 PM Women's · IU Indy vs Northern Kentucky | ",
 "Upcoming Feb 10, 6:30 PM Women's · IU Indy vs Robert Morris | ",
 "Upcoming Feb 13, 1:00 PM Women's · IU Indy vs Detroit Mercy | ",
 "Upcoming Feb 17, 7:30 PM Women's · IU Indy at Green Bay | ",
 "Upcoming Feb 20, 3:00 PM Women's · IU Indy at Milwaukee | ",
 "Upcoming Feb 25, 6:30 PM Women's · IU Indy vs Oakland | ",
 "Upcoming Feb 27, 1:00 PM Women's · IU Indy at Cleveland State | ",
 "Upcoming Mar 3 Women's · IU Indy vs Horizon League - 1st Round | ",
 "Upcoming Mar 7 Women's · IU Indy vs Horizon League - 2nd Round | ",
 "Upcoming Mar 8 Women's · IU Indy at Horizon League - Semifinals | ",
 "Upcoming Mar 9 Women's · IU Indy at Horizon League - Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · IU Indy at Mike Baumer Cross Country Invite | 2nd of 13",
 "Final Sep 19 Women's · IU Indy at Rumble in the Fort | 2nd of 4",
 "Final Oct 3 Women's · IU Indy at Louisville Classic | 6th of 24",
 "Final Oct 16 Women's · IU Indy at ISU Pre-Nationals | 15th of 26",
 "Upcoming Oct 31, 11:00 AM Women's · IU Indy at Horizon League Championships | ",
 "Upcoming Nov 13 Women's · IU Indy at NCAA Great Lakes Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 19 Men's · IU Indy at John McNichols Invitational (Open) | ind. results only",
 "Final Oct 2 Men's · IU Indy at Joe Piane Invitational | 8th of 18",
 "Final Oct 16 Men's · IU Indy at ISU Pre-Nationals | 40th of 44 (1,052)",
 "Upcoming Oct 31, 12:00 PM Men's · IU Indy at Horizon League Championships | ",
 "Upcoming Nov 13 Men's · IU Indy at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · IU Indy at NCAA National Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · IU Indy at YSU Roseann Schwartz Invitational | 5th of 11",
 "Final Sep 14 Women's · IU Indy at Brittany Kelly Classic | 4th of 14",
 "Final Sep 28 Women's · IU Indy at NKU Women's Fall Invitational | 2nd of 11",
 "Final Oct 12 Women's · IU Indy at Bronco Fall Classic | 4th of 4",
 "Final Oct 19 Women's · IU Indy at UD Invitational | 7th of 11",
 "Upcoming Mar 1 Women's · IU Indy at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 15 Women's · IU Indy at Jackrabbits Invitational | ",
 "Upcoming Mar 29 Women's · IU Indy at NKU Julie Invitational | ",
 "Upcoming Apr 5 Women's · IU Indy at EKU Colonel Classic | ",
 "Upcoming Apr 11 Women's · IU Indy at Boilermaker Spring Classic | ",
 "Upcoming Apr 24 Women's · IU Indy at Horizon League Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · IU Indy at Bryan National Collegiate | 5th of 13",
 "Final Sep 26 Men's · IU Indy at Earl Yestingsmeier Invitational | 11th of 16",
 "Final Oct 5 Men's · IU Indy at Tom Tontimonia Invitational | T6th of 12",
 "Final Oct 12 Men's · IU Indy at The Scrappy at Pinetree | 4th of 11",
 "Final Oct 19 Men's · IU Indy at Xavier Invitational | 8th of 9",
 "Upcoming Feb 20 Men's · IU Indy at Savannah Intercollegiate | ",
 "Upcoming Mar 12 Men's · IU Indy at Jackrabbit Invitational | ",
 "Upcoming Mar 29 Men's · IU Indy at Butler Don Benbow Spring Invite | ",
 "Upcoming Apr 5 Men's · IU Indy at NKU Jewell Invitational | ",
 "Upcoming Apr 12 Men's · IU Indy at Wright State Invitational | ",
 "Upcoming Apr 17 Men's · IU Indy at Spring Boilermaker | ",
 "Upcoming Apr 24 Men's · IU Indy at Horizon League Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · IU Indy at Ball State | L, 0-2",
 "Final Aug 16 Women's · IU Indy at Louisville | L, 1-5",
 "Final Aug 23 Women's · IU Indy at SIUE | T, 2-2",
 "Final Aug 30 Women's · IU Indy vs Chicago State | W, 3-0",
 "Final Sep 3 Women's · IU Indy vs Bellarmine | W, 5-2",
 "Final Sep 6 Women's · IU Indy at Notre Dame | L, 0-8",
 "Final Sep 10 Women's · IU Indy vs Butler | L, 0-4",
 "Final Sep 13 Women's · IU Indy at Toledo | T, 2-2",
 "Final Sep 19 Women's · IU Indy vs Milwaukee | L, 2-3",
 "Final Sep 24 Women's · IU Indy vs Wright State | L, 1-3",
 "Final Sep 27 Women's · IU Indy vs Northern Kentucky | W, 3-2",
 "Final Oct 1 Women's · IU Indy at Cleveland State | L, 0-1",
 "Final Oct 4 Women's · IU Indy at Purdue Fort Wayne | W, 2-1",
 "Final Oct 10 Women's · IU Indy at Green Bay | L, 0-1",
 "Final Oct 15 Women's · IU Indy vs Oakland | W, 2-1",
 "Final Oct 18 Women's · IU Indy vs Detroit Mercy | W, 4-2",
 "Final Oct 22 Women's · IU Indy at Robert Morris | W, 4-0",
 "Upcoming Oct 25, 1:00 PM Women's · IU Indy at Youngstown State | ",
 "Upcoming Oct 30, 2:00 PM Women's · IU Indy vs Northern Illinois | ",
 "Upcoming Nov 7, 1:00 PM Women's · IU Indy at Horizon League Tournament | ",
 "Upcoming Nov 11, 4:00 PM Women's · IU Indy at Horizon League Tournament | ",
 "Upcoming Nov 14, 1:00 PM Women's · IU Indy at Horizon League Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · IU Indy at Louisville | L, 1-2",
 "Final Aug 24 Men's · IU Indy vs Lindenwood | W, 1-0",
 "Final Aug 28 Men's · IU Indy vs Bowling Green | W, 1-0",
 "Final Sep 2 Men's · IU Indy at Southern Indiana | W, 1-0",
 "Final Sep 9 Men's · IU Indy at Northern Illinois | L, 0-2",
 "Final Sep 12 Men's · IU Indy vs Purdue Fort Wayne | L, 1-2",
 "Final Sep 19 Men's · IU Indy vs Northern Kentucky | L, 1-5",
 "Final Sep 22 Men's · IU Indy vs Western Illinois | T, 3-3",
 "Final Sep 26 Men's · IU Indy at Oakland | L, 0-1",
 "Final Oct 3 Men's · IU Indy at Cleveland State | L, 0-2",
 "Final Oct 7 Men's · IU Indy vs Robert Morris | T, 1-1",
 "Final Oct 13 Men's · IU Indy at Bellarmine | L, 0-2",
 "Final Oct 17 Men's · IU Indy vs Milwaukee | T, 0-0",
 "Upcoming Oct 24, 1:00 PM Men's · IU Indy at Green Bay | ",
 "Upcoming Oct 30, 7:00 PM Men's · IU Indy at Wright State | ",
 "Upcoming Nov 3, 2:00 PM Men's · IU Indy vs Detroit Mercy | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 11 Women's · IU Indy vs Cleveland State | W, 180-152",
 "Final Sep 11 Women's · IU Indy vs Youngstown State | W, 244-86",
 "Final Oct 3 Women's · IU Indy vs Xavier | W, 196-94",
 "Final Oct 3 Women's · IU Indy vs Bellarmine | W, 226-66",
 "Final Oct 3 Women's · IU Indy vs Eastern Illinois | W, 226-67",
 "Final Oct 3 Women's · IU Indy vs Bowling Green | L, 99-200",
 "Final Oct 3 Women's · IU Indy at Butler | Completed",
 "Final Oct 9 Women's · IU Indy at Grand Valley State | Completed",
 "Final Oct 22 Women's · IU Indy vs Ball State | L, 132-235",
 "Upcoming Oct 24, 12:00 PM Women's · IU Indy at Indiana Intercollegiates | ",
 "Upcoming Oct 30 Women's · IU Indy at Green Bay | ",
 "Upcoming Oct 31, 10:00 AM Women's · IU Indy at UIC | ",
 "Upcoming Oct 31, 10:00 AM Women's · IU Indy vs Milwaukee | ",
 "Upcoming Nov 19, 10:00 AM Women's · IU Indy at House of Champions | ",
 "Upcoming Dec 2 Women's · IU Indy at Toyota US Open Championships | ",
 "Upcoming Jan 23, 12:00 PM Women's · IU Indy vs Butler | ",
 "Upcoming Feb 17, 10:00 AM Women's · IU Indy at Horizon League Championships | ",
 "Upcoming Mar 11 Women's · IU Indy at National Invitational Championship (NIC) | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 11 Men's · IU Indy vs Cleveland State | W, 207-127",
 "Final Sep 11 Men's · IU Indy vs Youngstown State | W, 285-49",
 "Final Oct 3 Men's · IU Indy vs Xavier | W, 238-55",
 "Final Oct 3 Men's · IU Indy vs Bellarmine | W, 232-59",
 "Final Oct 3 Men's · IU Indy vs Eastern Illinois | W, 244-49",
 "Final Oct 9 Men's · IU Indy at Grand Valley State | Completed",
 "Final Oct 22 Men's · IU Indy vs Ball State | W, 210-160",
 "Upcoming Oct 24, 12:00 PM Men's · IU Indy at Indiana Intercollegiates | ",
 "Upcoming Oct 30 Men's · IU Indy at Green Bay | ",
 "Upcoming Oct 31, 10:00 AM Men's · IU Indy at UIC | ",
 "Upcoming Oct 31, 10:00 AM Men's · IU Indy vs Milwaukee | ",
 "Upcoming Nov 19 Men's · IU Indy at House of Champions | ",
 "Upcoming Dec 2 Men's · IU Indy at Toyota US Open Championships | ",
 "Upcoming Jan 23, 12:00 PM Men's · IU Indy vs Wabash | ",
 "Upcoming Feb 17, 10:00 AM Men's · IU Indy at Horizon League Championships | ",
 "Upcoming Mar 11 Men's · IU Indy at National Invitational Championship (NIC) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · IU Indy at UIndy Invite | Completed",
 "Final Oct 2 Women's · IU Indy at Horizon League Individual Championships | Completed",
 "Final Oct 8 Women's · IU Indy at ITA Ohio Valley Regional | Completed",
 "Upcoming Oct 30 Women's · IU Indy at Northern Illinois Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · IU Indy at Youngstown State Invite | Completed",
 "Final Sep 25 Men's · IU Indy at Horizon League Individual Championships | Completed",
 "Final Oct 7 Men's · IU Indy at ITA Ohio Valley Regional | Completed",
 "Upcoming Nov 6 Men's · IU Indy at Ball State Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 IU Indy vs San Diego State | L, 1-3",
 "Final Aug 29 IU Indy vs UC Irvine | W, 3-0",
 "Final Aug 30 IU Indy at Washington | L, 2-3",
 "Final Sep 3 IU Indy vs Ohio | W, 3-0",
 "Final Sep 4 IU Indy vs Marshall | L, 1-3",
 "Final Sep 5 IU Indy vs Akron | W, 3-2",
 "Final Sep 9 IU Indy at Purdue | L, 0-3",
 "Final Sep 11 IU Indy vs East Texas A&M | W, 3-1",
 "Final Sep 11 IU Indy vs Gonzaga | L, 2-3",
 "Final Sep 12 IU Indy at UTSA | L, 0-3",
 "Final Sep 16 IU Indy vs Butler | W, 3-0",
 "Final Sep 18 IU Indy vs Northwestern | L, 0-3",
 "Final Sep 19 IU Indy at Ball State | L, 1-3",
 "Final Sep 25 IU Indy vs Robert Morris | W, 3-0",
 "Final Sep 26 IU Indy vs Robert Morris | W, 3-2",
 "Final Oct 2 IU Indy at Youngstown State | L, 0-3",
 "Final Oct 3 IU Indy at Youngstown State | W, 3-2",
 "Final Oct 9 IU Indy at Oakland | L, 2-3",
 "Final Oct 10 IU Indy at Oakland | W, 3-0",
 "Final Oct 16 IU Indy vs Wright State | L, 1-3",
 "Final Oct 17 IU Indy vs Wright State | L, 0-3",
 "Today Oct 23, 5:00 PM IU Indy at Milwaukee | ",
 "Upcoming Oct 24, 1:30 PM IU Indy at Green Bay | ",
 "Upcoming Oct 29, 7:00 PM IU Indy vs Northern Kentucky | ",
 "Upcoming Oct 31, 4:00 PM IU Indy at Purdue Fort Wayne | ",
 "Upcoming Nov 3, 7:00 PM IU Indy vs Purdue Fort Wayne | ",
 "Upcoming Nov 6, 6:00 PM IU Indy vs Northern Illinois | ",
 "Upcoming Nov 10, 6:00 PM IU Indy at Northern Kentucky | ",
 "Upcoming Nov 14, 5:00 PM IU Indy vs Cleveland State | ",
 "Upcoming Nov 19 IU Indy at Horizon League Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("IU Indianapolis module checks passed");
