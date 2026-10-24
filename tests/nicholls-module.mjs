import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nichollsSchool} from '../src/schools/nicholls.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='nicholls');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,nichollsHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/nicholls-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit geauxcolonels.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['nicholls'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',nichollsSchool.scheduleUrls],['roster',nichollsSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('nicholls|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'geauxcolonels.com',`${key} must stay on geauxcolonels.com`);
  }
}
const parity={"Baseball":{"schedule":["https://geauxcolonels.com/sports/baseball/schedule"],"roster":["https://geauxcolonels.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://geauxcolonels.com/sports/mens-basketball/schedule","https://geauxcolonels.com/sports/womens-basketball/schedule"],"roster":["https://geauxcolonels.com/sports/mens-basketball/roster","https://geauxcolonels.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://geauxcolonels.com/sports/womens-beach-volleyball/schedule"],"roster":["https://geauxcolonels.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://geauxcolonels.com/sports/womens-cross-country/schedule","https://geauxcolonels.com/sports/mens-cross-country/schedule"],"roster":["https://geauxcolonels.com/sports/womens-cross-country/roster","https://geauxcolonels.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://geauxcolonels.com/sports/football/schedule"],"roster":["https://geauxcolonels.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://geauxcolonels.com/sports/mens-golf/schedule"],"roster":["https://geauxcolonels.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://geauxcolonels.com/sports/womens-soccer/schedule"],"roster":["https://geauxcolonels.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://geauxcolonels.com/sports/softball/schedule"],"roster":["https://geauxcolonels.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://geauxcolonels.com/sports/womens-tennis/schedule","https://geauxcolonels.com/sports/mens-tennis/schedule"],"roster":["https://geauxcolonels.com/sports/womens-tennis/roster","https://geauxcolonels.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://geauxcolonels.com/sports/womens-track-and-field/schedule","https://geauxcolonels.com/sports/mens-track-field/schedule"],"roster":["https://geauxcolonels.com/sports/womens-track-and-field/roster","https://geauxcolonels.com/sports/mens-track-field/roster"],"combined":true},"Volleyball":{"schedule":["https://geauxcolonels.com/sports/womens-volleyball/schedule"],"roster":["https://geauxcolonels.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'nicholls|"+sport+"':"),`${sport} routes must live in the Nicholls module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://geauxcolonels.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.nichollsHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=nicholls)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Men's · Nicholls vs North American | ",
 "Upcoming Nov 6 Men's · Nicholls at UAB | ",
 "Upcoming Nov 10, 6:30 PM Men's · Nicholls at Tulane | ",
 "Upcoming Nov 14, 7:00 PM Men's · Nicholls vs Louisiana Tech | ",
 "Upcoming Nov 17 Men's · Nicholls at Ole Miss | ",
 "Upcoming Nov 21, 4:00 PM Men's · Nicholls vs Southern Miss | ",
 "Upcoming Nov 22, 2:00 PM Men's · Nicholls vs Troy | ",
 "Upcoming Nov 29 Men's · Nicholls at Texas State | ",
 "Upcoming Dec 3, 7:00 PM Men's · Nicholls vs UTRGV | ",
 "Upcoming Dec 5, 3:00 PM Men's · Nicholls vs Texas A&M - Corpus Christi | ",
 "Upcoming Dec 10, 7:00 PM Men's · Nicholls at Rice | ",
 "Upcoming Dec 17, 7:30 PM Men's · Nicholls at HCU | ",
 "Upcoming Dec 19 Men's · Nicholls at UIW | ",
 "Upcoming Dec 29, 5:30 PM Men's · Nicholls vs College of Biblical Studies | ",
 "Upcoming Jan 2, 5:00 PM Men's · Nicholls at East Texas A&M | ",
 "Upcoming Jan 4, 6:30 PM Men's · Nicholls vs Northwestern State | ",
 "Upcoming Jan 9, 5:00 PM Men's · Nicholls at LSU New Orleans | ",
 "Upcoming Jan 11, 6:30 PM Men's · Nicholls vs McNeese | ",
 "Upcoming Jan 16, 6:00 PM Men's · Nicholls at Lamar | ",
 "Upcoming Jan 18, 6:30 PM Men's · Nicholls at Stephen F. Austin | ",
 "Upcoming Jan 23, 3:30 PM Men's · Nicholls at Northwestern State | ",
 "Upcoming Jan 25, 6:30 PM Men's · Nicholls vs East Texas A&M | ",
 "Upcoming Jan 30, 3:00 PM Men's · Nicholls vs LSU New Orleans | ",
 "Upcoming Feb 1, 6:00 PM Men's · Nicholls at Southeastern | ",
 "Upcoming Feb 6, 3:30 PM Men's · Nicholls at Texas A&M - Corpus Christi | ",
 "Upcoming Feb 8, 3:30 PM Men's · Nicholls at UTRGV | ",
 "Upcoming Feb 13, 3:00 PM Men's · Nicholls vs UIW | ",
 "Upcoming Feb 15, 6:30 PM Men's · Nicholls vs HCU | ",
 "Upcoming Feb 20, 3:00 PM Men's · Nicholls vs Stephen F. Austin | ",
 "Upcoming Feb 22, 6:30 PM Men's · Nicholls vs Lamar | ",
 "Upcoming Feb 27, 4:00 PM Men's · Nicholls at McNeese | ",
 "Upcoming Mar 1, 6:30 PM Men's · Nicholls vs Southeastern | ",
 "Upcoming Mar 7 Men's · Nicholls at Southland Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Nicholls vs Dillard | ",
 "Upcoming Nov 5 Women's · Nicholls at Iowa State | ",
 "Upcoming Nov 8 Women's · Nicholls at Georgia | ",
 "Upcoming Nov 10, 11:00 AM Women's · Nicholls vs LSUA | ",
 "Upcoming Nov 15 Women's · Nicholls at SMU | ",
 "Upcoming Nov 18, 6:00 PM Women's · Nicholls vs Alcorn | ",
 "Upcoming Nov 21, 1:00 PM Women's · Nicholls vs Tarleton | ",
 "Upcoming Nov 24, 5:00 PM Women's · Nicholls at Louisiana | ",
 "Upcoming Dec 3, 5:00 PM Women's · Nicholls vs UTRGV | ",
 "Upcoming Dec 5, 1:00 PM Women's · Nicholls vs Texas A&M - Corpus Christi | ",
 "Upcoming Dec 17, 6:30 PM Women's · Nicholls at HCU | ",
 "Upcoming Dec 19, 1:00 PM Women's · Nicholls at UIW | ",
 "Upcoming Dec 31, 1:00 PM Women's · Nicholls vs Northwestern State | ",
 "Upcoming Jan 2, 1:00 PM Women's · Nicholls at East Texas A&M | ",
 "Upcoming Jan 7, 6:30 PM Women's · Nicholls at LSU New Orleans | ",
 "Upcoming Jan 9, 1:00 PM Women's · Nicholls vs McNeese | ",
 "Upcoming Jan 14, 6:30 PM Women's · Nicholls at Stephen F. Austin | ",
 "Upcoming Jan 16, 1:00 PM Women's · Nicholls at Lamar | ",
 "Upcoming Jan 21, 6:30 PM Women's · Nicholls vs East Texas A&M | ",
 "Upcoming Jan 23, 1:00 PM Women's · Nicholls at Northwestern State | ",
 "Upcoming Jan 28, 6:30 PM Women's · Nicholls vs Southeastern | ",
 "Upcoming Jan 30, 1:00 PM Women's · Nicholls vs LSU New Orleans | ",
 "Upcoming Feb 4, 6:30 PM Women's · Nicholls at UTRGV | ",
 "Upcoming Feb 6, 1:00 PM Women's · Nicholls at Texas A&M - Corpus Christi | ",
 "Upcoming Feb 11, 6:30 PM Women's · Nicholls vs HCU | ",
 "Upcoming Feb 13, 1:00 PM Women's · Nicholls vs UIW | ",
 "Upcoming Feb 18, 6:30 PM Women's · Nicholls vs Lamar | ",
 "Upcoming Feb 20, 1:00 PM Women's · Nicholls vs SFA | ",
 "Upcoming Feb 25, 6:00 PM Women's · Nicholls at Southeastern | ",
 "Upcoming Feb 27, 1:00 PM Women's · Nicholls at McNeese | ",
 "Upcoming Mar 8 Women's · Nicholls at Southland Conference Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Nicholls at Battle For New Orleans | 6th of 10",
 "Final Sep 18 Women's · Nicholls at LSU Twilight Relay Invitational | 2nd of 5",
 "Final Oct 3 Women's · Nicholls at Nicholls XC Invitational | 1st of 7",
 "Final Oct 16 Women's · Nicholls at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30 Women's · Nicholls at Southland Conference Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Nicholls at Battle For New Orleans | 5th of 8",
 "Final Sep 18 Men's · Nicholls at LSU Twilight Relay Invitational | 2nd of 5",
 "Final Oct 3 Men's · Nicholls at Nicholls XC Invitational | 2nd of 7",
 "Final Oct 16 Men's · Nicholls at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 30 Men's · Nicholls at Southland Conference Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Nicholls vs Mississippi Valley State | W, 44-10",
 "Final Sep 5 Nicholls at Kansas State | L, 3-71",
 "Final Sep 12 Nicholls vs UTRGV | W, 31-28",
 "Final Sep 19 Nicholls at Sam Houston | L, 0-59",
 "Final Sep 26 Nicholls vs Lamar | L, 18-49",
 "Final Oct 3 Nicholls at HCU | L, 2-16",
 "Final Oct 17 Nicholls vs Stephen F. Austin | L, 0-56",
 "Today Oct 24, 2:00 PM Nicholls at Northwestern State | ",
 "Upcoming Oct 31, 2:00 PM Nicholls at McNeese | ",
 "Upcoming Nov 7, 3:00 PM Nicholls vs East Texas A&M | ",
 "Upcoming Nov 14, 2:00 PM Nicholls at UIW | ",
 "Upcoming Nov 19, 6:00 PM Nicholls vs Southeastern | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Nicholls at Sandestin Collegiate | 12th of 14",
 "Final Sep 27 Nicholls at Argent Financial Classic | T11th of 14",
 "Final Oct 12 Nicholls at Bubba Barnett Intercollegiate | 4th of 17",
 "Final Oct 19 Nicholls at LaTour Intercollegiate | 3rd of 9"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Nicholls at Louisiana Tech | T, 2-2",
 "Final Aug 15 Nicholls at Arkansas - Pine Bluff | W, 11-0",
 "Final Aug 20 Nicholls vs Alcorn | L, 4-7",
 "Final Aug 23 Nicholls vs Grambling | T, 2-2",
 "Final Aug 27 Nicholls at Louisiana | L, 0-2",
 "Final Aug 29 Nicholls vs Louisiana Christian | W, 6-0",
 "Final Sep 3 Nicholls at Prairie View A&M | T, 1-1",
 "Final Sep 10 Nicholls vs Southern Miss | L, 1-2",
 "Final Sep 17 Nicholls at HCU | T, 1-1",
 "Final Sep 24 Nicholls vs UIW | W, 1-0",
 "Final Sep 27 Nicholls at Lamar | T, 2-2",
 "Final Oct 2 Nicholls at McNeese | T, 0-0",
 "Final Oct 8 Nicholls vs SFA | W, 2-1",
 "Final Oct 11 Nicholls vs East Texas A&M | L, 0-1",
 "Final Oct 15 Nicholls at UTRGV | W, 2-1",
 "Upcoming Oct 25, 1:00 PM Nicholls at Northwestern State | ",
 "Upcoming Nov 1, 12:00 PM Nicholls vs Texas A&M - Corpus Christi | ",
 "Upcoming Nov 5, 7:00 PM Nicholls vs Southeastern | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 30, 3:00 PM Nicholls vs Lamar State College | ",
 "Upcoming Nov 10, 3:00 PM Nicholls vs Pearl River Community College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackfield=parse("Track & Field","mens-track-field");
  assert.deepEqual(v_menstrackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Nicholls vs Stonehill College | W, 3-2",
 "Final Aug 28 Nicholls vs Oral Roberts | L, 2-3",
 "Final Aug 29 Nicholls vs Alcorn | W, 3-2",
 "Final Sep 2 Nicholls at Grambling | L, 1-3",
 "Final Sep 4 Nicholls at Alcorn | W, 3-1",
 "Final Sep 5 Nicholls vs Wiley | W, 3-0",
 "Final Sep 5 Nicholls at Mississippi Valley State | W, 3-0",
 "Final Sep 11 Nicholls vs Miami (OH) | L, 0-3",
 "Final Sep 11 Nicholls vs South Carolina State | W, 3-0",
 "Final Sep 12 Nicholls at Alabama State | L, 1-3",
 "Final Sep 16 Nicholls vs Grambling | L, 2-3",
 "Final Sep 18 Nicholls vs Southern | W, 3-2",
 "Final Sep 18 Nicholls vs Jacksonville State | L, 1-3",
 "Final Sep 23 Nicholls vs Texas A&M - Corpus Christi | L, 1-3",
 "Final Sep 26 Nicholls at UTRGV | L, 0-3",
 "Final Oct 1 Nicholls vs Lamar | W, 3-0",
 "Final Oct 3 Nicholls vs SFA | L, 0-3",
 "Final Oct 8 Nicholls at LSU New Orleans | W, 3-1",
 "Final Oct 10 Nicholls at Southeastern | L, 0-3",
 "Final Oct 15 Nicholls vs Northwestern State | L, 0-3",
 "Final Oct 17 Nicholls vs East Texas A&M | L, 0-3",
 "Final Oct 22 Nicholls at HCU | L, 1-3",
 "Today Oct 24, 1:00 PM Nicholls at UIW | ",
 "Upcoming Oct 29, 6:30 PM Nicholls vs LSU New Orleans | ",
 "Upcoming Oct 31, 1:00 PM Nicholls vs Southeastern | ",
 "Upcoming Nov 5, 6:00 PM Nicholls at Lamar | ",
 "Upcoming Nov 7, 12:00 PM Nicholls at SFA | ",
 "Upcoming Nov 12, 6:00 PM Nicholls at McNeese | ",
 "Upcoming Nov 14, 1:00 PM Nicholls vs McNeese | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackfield,"Track & Field mens-track-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Nicholls module checks passed");
