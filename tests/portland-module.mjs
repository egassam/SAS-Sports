import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {portlandSchool} from '../src/schools/portland.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='portland');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,portlandHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/portland-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit portlandpilots.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['portland'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',portlandSchool.scheduleUrls],['roster',portlandSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('portland|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'portlandpilots.com',`${key} must stay on portlandpilots.com`);
  }
}
const parity={"Baseball":{"schedule":["https://portlandpilots.com/sports/baseball/schedule"],"roster":["https://portlandpilots.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://portlandpilots.com/sports/mens-basketball/schedule","https://portlandpilots.com/sports/womens-basketball/schedule"],"roster":["https://portlandpilots.com/sports/mens-basketball/roster","https://portlandpilots.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://portlandpilots.com/sports/womens-beach-volleyball/schedule"],"roster":["https://portlandpilots.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://portlandpilots.com/sports/womens-cross-country/schedule","https://portlandpilots.com/sports/mens-cross-country/schedule"],"roster":["https://portlandpilots.com/sports/womens-cross-country/roster","https://portlandpilots.com/sports/mens-cross-country/roster"],"combined":true},"Rowing":{"schedule":["https://portlandpilots.com/sports/womens-rowing/schedule"],"roster":["https://portlandpilots.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://portlandpilots.com/sports/womens-soccer/schedule","https://portlandpilots.com/sports/mens-soccer/schedule"],"roster":["https://portlandpilots.com/sports/womens-soccer/roster","https://portlandpilots.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://portlandpilots.com/sports/womens-tennis/schedule","https://portlandpilots.com/sports/mens-tennis/schedule"],"roster":["https://portlandpilots.com/sports/womens-tennis/roster","https://portlandpilots.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://portlandpilots.com/sports/womens-track-and-field/schedule","https://portlandpilots.com/sports/mens-track-and-field/schedule"],"roster":["https://portlandpilots.com/sports/womens-track-and-field/roster","https://portlandpilots.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://portlandpilots.com/sports/womens-volleyball/schedule"],"roster":["https://portlandpilots.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'portland|"+sport+"':"),`${sport} routes must live in the Portland module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://portlandpilots.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.portlandHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=portland)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Men's · Portland vs Willamette | ",
 "Upcoming Nov 6, 6:30 PM Men's · Portland vs UT Arlington | ",
 "Upcoming Nov 8, 4:30 PM Men's · Portland vs Bethesda | ",
 "Upcoming Nov 9, 9:00 PM Men's · Portland at Hawaii | ",
 "Upcoming Nov 13, 7:00 PM Men's · Portland vs East Texas A&M | ",
 "Upcoming Nov 18, 6:00 PM Men's · Portland at Colorado | ",
 "Upcoming Nov 21, 11:00 AM Men's · Portland vs Fordham | ",
 "Upcoming Nov 22, 4:00 PM Men's · Portland vs Cal Baptist | ",
 "Upcoming Nov 29, 2:00 PM Men's · Portland at Stanford | ",
 "Upcoming Dec 1, 6:00 PM Men's · Portland at UC Davis | ",
 "Upcoming Dec 10, 11:00 AM Men's · Portland vs Lamar | ",
 "Upcoming Dec 13, 2:00 PM Men's · Portland vs Eastern Washington | ",
 "Upcoming Dec 16 Men's · Portland at Utah | ",
 "Upcoming Dec 19, 5:00 PM Men's · Portland vs Wyoming | ",
 "Upcoming Dec 22, 2:00 PM Men's · Portland at Long Beach State | ",
 "Upcoming Dec 28, 2:00 PM Men's · Portland vs Evergreen State | ",
 "Upcoming Jan 2 Men's · Portland vs Pepperdine | ",
 "Upcoming Jan 6 Men's · Portland vs Pacific | ",
 "Upcoming Jan 9 Men's · Portland at San Diego | ",
 "Upcoming Jan 13 Men's · Portland at Saint Mary's | ",
 "Upcoming Jan 16 Men's · Portland vs San Francisco | ",
 "Upcoming Jan 20 Men's · Portland at Denver | ",
 "Upcoming Jan 23 Men's · Portland at Seattle U | ",
 "Upcoming Jan 27 Men's · Portland vs Santa Clara | ",
 "Upcoming Feb 3 Men's · Portland vs Saint Mary's | ",
 "Upcoming Feb 6 Men's · Portland vs LMU | ",
 "Upcoming Feb 10 Men's · Portland at Pacific | ",
 "Upcoming Feb 13 Men's · Portland at San Francisco | ",
 "Upcoming Feb 17 Men's · Portland vs Denver | ",
 "Upcoming Feb 20 Men's · Portland vs San Diego | ",
 "Upcoming Feb 24 Men's · Portland at Pepperdine | ",
 "Upcoming Feb 27 Men's · Portland at LMU | ",
 "Upcoming Mar 5 Men's · Portland at Credit Union I West Coast Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Women's · Portland vs Willamette | ",
 "Upcoming Nov 5, 1:00 PM Women's · Portland at BYU | ",
 "Upcoming Nov 8, 1:00 PM Women's · Portland at Montana State | ",
 "Upcoming Nov 11, 6:00 PM Women's · Portland vs Warner Pacific | ",
 "Upcoming Nov 14, 6:00 PM Women's · Portland vs Long Beach State | ",
 "Upcoming Nov 18, 6:00 PM Women's · Portland vs Portland State | ",
 "Upcoming Nov 22, 2:00 PM Women's · Portland vs Stanford | ",
 "Upcoming Nov 25, 2:00 PM Women's · Portland vs UC Santa Barbara | ",
 "Upcoming Dec 2, 6:00 PM Women's · Portland vs South Carolina State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Portland at Washington State | ",
 "Upcoming Dec 13 Women's · Portland at Princeton | ",
 "Upcoming Dec 16 Women's · Portland at Oregon | ",
 "Upcoming Dec 19, 2:00 PM Women's · Portland vs Wyoming | ",
 "Upcoming Dec 21 Women's · Portland at New Mexico | ",
 "Upcoming Dec 31 Women's · Portland at Pacific | ",
 "Upcoming Jan 2 Women's · Portland at Santa Clara | ",
 "Upcoming Jan 7, 6:00 PM Women's · Portland vs San Diego | ",
 "Upcoming Jan 9, 5:00 PM Women's · Portland vs Denver | ",
 "Upcoming Jan 14 Women's · Portland at Loyola Marymount | ",
 "Upcoming Jan 16 Women's · Portland at Pepperdine | ",
 "Upcoming Jan 21 Women's · Portland at San Diego | ",
 "Upcoming Jan 23, 5:00 PM Women's · Portland vs San Francisco | ",
 "Upcoming Jan 28, 6:00 PM Women's · Portland vs Saint Mary's | ",
 "Upcoming Jan 30 Women's · Portland at Denver | ",
 "Upcoming Feb 4, 6:00 PM Women's · Portland vs Seattle U | ",
 "Upcoming Feb 6 Women's · Portland at San Francisco | ",
 "Upcoming Feb 11, 6:00 PM Women's · Portland vs Loyola Marymount | ",
 "Upcoming Feb 13, 5:00 PM Women's · Portland vs Santa Clara | ",
 "Upcoming Feb 18 Women's · Portland at Saint Mary's | ",
 "Upcoming Feb 20 Women's · Portland at Seattle U | ",
 "Upcoming Feb 25, 6:00 PM Women's · Portland vs Pacific | ",
 "Upcoming Feb 27, 5:00 PM Women's · Portland vs Pepperdine | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Portland at Linfield Harrier Classic | 3rd",
 "Final Sep 26 Women's · Portland at Mike Johnson Classic | 2nd",
 "Final Oct 3 Women's · Portland at Charles Bowles Invite | 2nd",
 "Final Oct 16 Women's · Portland at Pre-National Invitational | 34th",
 "Final Oct 17 Women's · Portland at Linfield George Oja Invite | 5th",
 "Upcoming Oct 30 Women's · Portland at WCC Championships | ",
 "Upcoming Nov 13 Women's · Portland at NCAA West Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Portland at Linfield Harrier Classic | 1st",
 "Final Sep 19 Men's · Portland at John McNichols Invitational | 18th",
 "Final Oct 3 Men's · Portland at Charles Bowles Invite | 1st",
 "Final Oct 9 Men's · Portland at Nuttycombe Invite | 32nd",
 "Final Oct 17 Men's · Portland at Linfield George Oja Invite | 1st",
 "Upcoming Oct 30 Men's · Portland at WCC Championships | ",
 "Upcoming Nov 13 Men's · Portland at NCAA West Regional | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Portland vs Charlie Brown Regatta | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Portland at Washington | L, 0-1",
 "Final Aug 20 Women's · Portland at Utah State | L, 0-2",
 "Final Aug 23 Women's · Portland at Utah Tech | W, 3-0",
 "Final Aug 29 Women's · Portland at Wake Forest | L, 0-2",
 "Final Sep 3 Women's · Portland at Long Beach State | L, 1-2",
 "Final Sep 6 Women's · Portland at Cal State Fullerton | L, 0-1",
 "Final Sep 10 Women's · Portland vs Portland State | W, 1-0",
 "Final Sep 13 Women's · Portland vs Oregon State | W, 1-0",
 "Final Sep 17 Women's · Portland vs UC Davis | W, 2-0",
 "Final Sep 26 Women's · Portland vs Pepperdine | L, 0-1",
 "Final Oct 2 Women's · Portland vs Pacific | T, 1-1",
 "Final Oct 7 Women's · Portland at San Francisco | W, 2-1",
 "Final Oct 10 Women's · Portland vs Saint Mary's | L, 0-1",
 "Final Oct 17 Women's · Portland at Denver | T, 0-0",
 "Upcoming Oct 24, 7:00 PM Women's · Portland at San Diego | ",
 "Upcoming Oct 28, 6:00 PM Women's · Portland vs Seattle U | ",
 "Upcoming Nov 1, 1:00 PM Women's · Portland vs Loyola Marymount | ",
 "Upcoming Nov 7, 1:00 PM Women's · Portland at Santa Clara | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 21 Men's · Portland vs California | T, 0-0",
 "Final Aug 27 Men's · Portland at Washington | L, 2-4",
 "Final Aug 31 Men's · Portland at Princeton | L, 0-2",
 "Final Sep 5 Men's · Portland vs Wisconsin | L, 1-2",
 "Final Sep 8 Men's · Portland vs Southern Oregon | W, 4-1",
 "Final Sep 13 Men's · Portland vs Oregon State | T, 0-0",
 "Final Sep 19 Men's · Portland vs New Hampshire | W, 2-0",
 "Final Sep 26 Men's · Portland vs Loyola Marymount | W, 4-0",
 "Final Sep 30 Men's · Portland vs Saint Mary's | W, 5-0",
 "Final Oct 4 Men's · Portland at Michigan | W, 2-1",
 "Final Oct 10 Men's · Portland at San Diego | W, 5-4",
 "Final Oct 17 Men's · Portland vs Denver | W, 3-2",
 "Final Oct 21 Men's · Portland at Seattle U | W, 3-0",
 "Upcoming Oct 24, 7:00 PM Men's · Portland vs Santa Clara | ",
 "Upcoming Oct 31, 7:00 PM Men's · Portland at Pacific | ",
 "Upcoming Nov 6, 7:00 PM Men's · Portland at San Francisco | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Portland at WSU Cougar Classic | Completed",
 "Final Oct 2 Women's · Portland at Duck Invitational | Completed",
 "Final Oct 8 Women's · Portland at ITA Northwest Regionals | Completed",
 "Upcoming Nov 6 Women's · Portland at CSUN Fall Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Portland at Dar Walters Classic | Completed",
 "Final Oct 15 Men's · Portland at ITA NW Regionals | Completed",
 "Upcoming Oct 23 Men's · Portland at Duck Invitational | ",
 "Upcoming Nov 6 Men's · Portland at Gonzaga Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Portland vs Portland State | W, 3-2",
 "Final Aug 29 Portland vs Nevada | W, 3-0",
 "Final Sep 3 Portland at San Jose State | L, 2-3",
 "Final Sep 5 Portland vs UC Riverside | W, 3-1",
 "Final Sep 11 Portland vs North Dakota State | L, 0-3",
 "Final Sep 12 Portland at Montana State | W, 3-1",
 "Final Sep 17 Portland vs CSU Bakersfield | W, 3-1",
 "Final Sep 18 Portland vs Nevada | W, 3-2",
 "Final Sep 19 Portland at Eastern Washington | W, 3-0",
 "Final Sep 26 Portland at Seattle U | W, 3-0",
 "Final Oct 1 Portland vs Santa Clara | L, 0-3",
 "Final Oct 3 Portland vs San Francisco | W, 3-0",
 "Final Oct 8 Portland at Pacific | W, 3-0",
 "Final Oct 10 Portland at Saint Mary's | L, 1-3",
 "Final Oct 15 Portland vs Denver | L, 2-3",
 "Final Oct 17 Portland vs San Diego | L, 0-3",
 "Upcoming Oct 24, 1:00 PM Portland vs Seattle U | ",
 "Upcoming Oct 29, 6:00 PM Portland vs Loyola Marymount | ",
 "Upcoming Oct 31, 1:00 PM Portland vs Pepperdine | ",
 "Upcoming Nov 5, 7:00 PM Portland at San Francisco | ",
 "Upcoming Nov 7, 1:00 PM Portland at Santa Clara | ",
 "Upcoming Nov 12, 6:00 PM Portland vs Saint Mary's | ",
 "Upcoming Nov 14, 1:00 PM Portland vs Pacific | ",
 "Upcoming Nov 19, 7:00 PM Portland at San Diego | ",
 "Upcoming Nov 21, 12:00 PM Portland at Denver | ",
 "Upcoming Nov 25, 12:00 PM Portland at Pepperdine | ",
 "Upcoming Nov 28, 1:00 PM Portland at Loyola Marymount | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Portland module checks passed");
