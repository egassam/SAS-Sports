import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southCarolinaStateSchool} from '../src/schools/south-carolina-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-carolina-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southCarolinaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-carolina-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit scsuathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-carolina-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',southCarolinaStateSchool.scheduleUrls],['roster',southCarolinaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-carolina-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'scsuathletics.com',`${key} must stay on scsuathletics.com`);
  }
}
const parity={"Basketball":{"schedule":["https://scsuathletics.com/sports/mens-basketball/schedule","https://scsuathletics.com/sports/womens-basketball/schedule"],"roster":["https://scsuathletics.com/sports/mens-basketball/roster","https://scsuathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://scsuathletics.com/sports/womens-cross-country/schedule","https://scsuathletics.com/sports/mens-cross-country/schedule"],"roster":["https://scsuathletics.com/sports/womens-cross-country/roster","https://scsuathletics.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://scsuathletics.com/sports/football/schedule"],"roster":["https://scsuathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://scsuathletics.com/sports/womens-golf/schedule"],"roster":["https://scsuathletics.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://scsuathletics.com/sports/womens-soccer/schedule"],"roster":["https://scsuathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://scsuathletics.com/sports/softball/schedule"],"roster":["https://scsuathletics.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://scsuathletics.com/sports/womens-tennis/schedule","https://scsuathletics.com/sports/mens-tennis/schedule"],"roster":["https://scsuathletics.com/sports/womens-tennis/roster","https://scsuathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://scsuathletics.com/sports/womens-track-and-field/schedule","https://scsuathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://scsuathletics.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://scsuathletics.com/sports/womens-volleyball/schedule"],"roster":["https://scsuathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-carolina-state|"+sport+"':"),`${sport} routes must live in the South Carolina State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://scsuathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southCarolinaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-carolina-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 30 Men's · SC State vs Allen | ",
 "Upcoming Nov 2 Men's · SC State vs Morris College | ",
 "Upcoming Nov 6 Men's · SC State at South Carolina - Upstate | ",
 "Upcoming Nov 9 Men's · SC State at Chicago State | ",
 "Upcoming Nov 11 Men's · SC State at Notre Dame | ",
 "Upcoming Nov 15 Men's · SC State at College of Charleston | ",
 "Upcoming Nov 20 Men's · SC State at The Citadel | ",
 "Upcoming Nov 23 Men's · SC State vs North Carolina A&T State | ",
 "Upcoming Nov 28 Men's · SC State at Duquesne | ",
 "Upcoming Dec 2 Men's · SC State vs Winthrop | ",
 "Upcoming Dec 5 Men's · SC State vs Charleston Southern | ",
 "Upcoming Dec 11 Men's · SC State at Northern Kentucky | ",
 "Upcoming Dec 16 Men's · SC State at Tennessee at Chattanooga | ",
 "Upcoming Dec 18 Men's · SC State at Wichita State | ",
 "Upcoming Dec 21 Men's · SC State at West Virginia | ",
 "Upcoming Dec 29 Men's · SC State at South Carolina | ",
 "Upcoming Jan 2 Men's · SC State at Howard | ",
 "Upcoming Jan 5 Men's · SC State vs Brewton-Parker College | ",
 "Upcoming Jan 9 Men's · SC State vs Morgan State | ",
 "Upcoming Jan 11 Men's · SC State vs Coppin State | ",
 "Upcoming Jan 16 Men's · SC State at Norfolk State | ",
 "Upcoming Jan 19 Men's · SC State vs Mid-Atlantic Christian | ",
 "Upcoming Jan 23 Men's · SC State at Maryland Eastern Shore | ",
 "Upcoming Jan 25 Men's · SC State at Delaware State | ",
 "Upcoming Jan 30 Men's · SC State at North Carolina Central | ",
 "Upcoming Feb 6 Men's · SC State vs Howard | ",
 "Upcoming Feb 13 Men's · SC State at Morgan State | ",
 "Upcoming Feb 15 Men's · SC State at Coppin State | ",
 "Upcoming Feb 20 Men's · SC State vs Norfolk State | ",
 "Upcoming Feb 27 Men's · SC State vs Maryland Eastern Shore | ",
 "Upcoming Mar 1 Men's · SC State vs Delaware State | ",
 "Upcoming Mar 4 Men's · SC State vs North Carolina Central | ",
 "Upcoming Mar 10 Men's · SC State at MEAC Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · SC State vs Trinity College-Jacksonville | ",
 "Upcoming Nov 5 Women's · SC State vs Bethune-Cookman | ",
 "Upcoming Nov 10 Women's · SC State vs South Carolina - Upstate | ",
 "Upcoming Nov 14 Women's · SC State at High Point | ",
 "Upcoming Nov 17 Women's · SC State at Winthrop | ",
 "Upcoming Nov 22 Women's · SC State vs Charleston Southern | ",
 "Upcoming Nov 28 Women's · SC State at South Alabama | ",
 "Upcoming Nov 29 Women's · SC State at South Alabama | ",
 "Upcoming Dec 2 Women's · SC State at Portland | ",
 "Upcoming Dec 5 Women's · SC State vs UNC Asheville | ",
 "Upcoming Dec 9 Women's · SC State at Colorado State | ",
 "Upcoming Dec 11 Women's · SC State at Mississippi Valley State | ",
 "Upcoming Dec 12 Women's · SC State at Ole Miss | ",
 "Upcoming Dec 14 Women's · SC State at Georgia | ",
 "Upcoming Dec 17 Women's · SC State vs Alabama State | ",
 "Upcoming Dec 19 Women's · SC State at Florida A&M | ",
 "Upcoming Jan 2 Women's · SC State at Howard | ",
 "Upcoming Jan 7 Women's · SC State vs Coppin State | ",
 "Upcoming Jan 9 Women's · SC State at Morgan State | ",
 "Upcoming Jan 11 Women's · SC State at Queens University of Charlotte | ",
 "Upcoming Jan 16 Women's · SC State at Norfolk State | ",
 "Upcoming Jan 21 Women's · SC State at Delaware State | ",
 "Upcoming Jan 23 Women's · SC State at Maryland Eastern Shore | ",
 "Upcoming Jan 30 Women's · SC State at North Carolina Central | ",
 "Upcoming Feb 2 Women's · SC State vs Morris College (S.C.) | ",
 "Upcoming Feb 6 Women's · SC State vs Howard | ",
 "Upcoming Feb 11 Women's · SC State at Coppin State | ",
 "Upcoming Feb 13 Women's · SC State at Morgan State | ",
 "Upcoming Feb 20 Women's · SC State vs Norfolk State | ",
 "Upcoming Feb 25 Women's · SC State vs Delaware State | ",
 "Upcoming Feb 27 Women's · SC State vs Maryland Eastern Shore | ",
 "Upcoming Mar 4 Women's · SC State vs North Carolina Central | ",
 "Upcoming Mar 10 Women's · SC State at Mid-Eastern Athletic Conference Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · SC State at CSU Buccaneer | Completed",
 "Final Sep 11 Women's · SC State at Queen City Invite | Completed",
 "Final Oct 2 Women's · SC State at HBCU Challenge | Completed",
 "Final Oct 10 Women's · SC State at USCB Sandshark Invite | Completed",
 "Final Oct 17 Women's · SC State at USC Upstate Invite | Completed",
 "Upcoming Oct 31, 11:00 AM Women's · SC State at Mid-Eastern Athletic Conference | ",
 "Upcoming Nov 13, 9:30 AM Women's · SC State at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · SC State at CSU Buccaneer | Completed",
 "Final Sep 11 Men's · SC State at Queen City Invite | Completed",
 "Final Oct 2 Men's · SC State at HBCU Challenge | Completed",
 "Final Oct 10 Men's · SC State at USCB Sandshark Invite | Completed",
 "Final Oct 17 Men's · SC State at USC Upstate Invite | Completed",
 "Upcoming Oct 31, 11:00 AM Men's · SC State at MEAC Cross Country Championships | ",
 "Upcoming Nov 13, 9:30 AM Men's · SC State at NCAA Southeast Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 SC State vs Savannah State | W, 87-0",
 "Final Sep 6 SC State vs Florida A&M | W, 31-13",
 "Final Sep 12 SC State vs Virginia State | W, 66-0",
 "Final Sep 19 SC State at Furman | W, 20-17",
 "Final Sep 26 SC State at Bethune-Cookman | W, 31-21",
 "Final Oct 3 SC State vs The Citadel | L, 31-34",
 "Final Oct 10 SC State at Charleston Southern | L, 39-49",
 "Upcoming Oct 24, 1:30 PM SC State vs Norfolk State | ",
 "Upcoming Oct 29, 7:00 PM SC State at Morgan State | ",
 "Upcoming Nov 5, 7:30 PM SC State at Howard | ",
 "Upcoming Nov 14, 1:30 PM SC State vs North Carolina Central | ",
 "Upcoming Nov 21, 1:30 PM SC State vs Delaware State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 14 SC State vs Southern Utah | L, 0-1",
 "Final Aug 20 SC State vs Elon | L, 0-6",
 "Final Aug 23 SC State at Mercer | L, 0-8",
 "Final Aug 27 SC State at The Citadel | L, 0-8",
 "Final Aug 30 SC State at Wofford College | L, 0-3",
 "Final Sep 3 SC State at College of Charleston | L, 0-4",
 "Final Sep 6 SC State at Queens University of Charlotte | L, 1-3",
 "Final Sep 9 SC State at Jacksonville | T, 0-0",
 "Final Sep 13 SC State at Winthrop | L, 0-3",
 "Final Sep 20 SC State at Alabama A&M | L, 0-3",
 "Final Sep 26 SC State vs Southern Wesleyan (S.C.) | L, 1-2",
 "Final Sep 30 SC State vs Hampton | L, 0-1",
 "Final Oct 6 SC State at Presbyterian College | L, 2-4",
 "Final Oct 13 SC State vs Charleston Southern | L, 0-3",
 "Final Oct 21 SC State at South Carolina - Upstate | L, 0-6",
 "Upcoming Oct 28, 7:00 PM SC State vs Allen (S.C.) | ",
 "Upcoming Oct 30, 7:00 PM SC State vs Tuskegee | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 3:00 PM SC State vs Alumni Game | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 SC State vs Mississippi Valley State | W, 3-2",
 "Final Aug 28 SC State at Alabama A&M | L, 0-3",
 "Final Aug 29 SC State vs Arkansas - Pine Bluff | L, 2-3",
 "Final Sep 3 SC State at Charleston Southern | L, 0-3",
 "Final Sep 4 SC State vs The Citadel | L, 0-3",
 "Final Sep 5 SC State vs College of Charleston | L, 1-3",
 "Final Sep 10 SC State at Tuskegee | W, 3-1",
 "Final Sep 11 SC State at ISTAP Invitational | L, 1-3",
 "Final Sep 11 SC State vs Nicholls | L, 0-3",
 "Final Sep 12 SC State vs Miami University (OH) | L, 0-3",
 "Final Sep 15 SC State vs Claflin | W, 3-0",
 "Final Sep 16 SC State at Claflin | L, 1-3",
 "Final Sep 18 SC State vs Bethune-Cookman | L, 1-3",
 "Final Sep 19 SC State vs Bethune-Cookman | L, 0-3",
 "Final Sep 22 SC State at Fort Valley State | W, 3-1",
 "Final Sep 25 SC State at Maryland Eastern Shore | L, 1-3",
 "Final Sep 27 SC State at Delaware State | L, 0-3",
 "Final Oct 2 SC State vs Coppin State | L, 0-3",
 "Final Oct 4 SC State vs Morgan State | L, 2-3",
 "Final Oct 9 SC State at Norfolk State | L, 0-3",
 "Final Oct 11 SC State at Howard | L, 1-3",
 "Final Oct 16 SC State at North Carolina Central | L, 0-3",
 "Final Oct 18 SC State vs Edward Waters | W, 3-1",
 "Today Oct 23, 6:00 PM SC State vs Maryland Eastern Shore | ",
 "Upcoming Oct 25 SC State vs Delaware State | ",
 "Upcoming Oct 30, 6:00 PM SC State at Coppin State | ",
 "Upcoming Nov 1, 1:00 PM SC State at Morgan State | ",
 "Upcoming Nov 6, 6:00 PM SC State vs Norfolk State | ",
 "Upcoming Nov 8, 1:00 PM SC State vs Howard | ",
 "Upcoming Nov 13, 6:00 PM SC State vs North Carolina Central | ",
 "Upcoming Nov 20 SC State at MEAC Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("South Carolina State module checks passed");
