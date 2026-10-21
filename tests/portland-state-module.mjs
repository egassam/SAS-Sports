import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {portlandStateSchool} from '../src/schools/portland-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='portland-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,portlandStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/portland-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goviks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['portland-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',portlandStateSchool.scheduleUrls],['roster',portlandStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('portland-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goviks.com',`${key} must stay on goviks.com`);
  }
}
const parity={"Basketball":{"schedule":["https://goviks.com/sports/mens-basketball/schedule","https://goviks.com/sports/womens-basketball/schedule"],"roster":["https://goviks.com/sports/mens-basketball/roster","https://goviks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goviks.com/sports/cross-country/schedule"],"roster":["https://goviks.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goviks.com/sports/football/schedule"],"roster":["https://goviks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goviks.com/sports/womens-golf/schedule"],"roster":["https://goviks.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://goviks.com/sports/womens-soccer/schedule"],"roster":["https://goviks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goviks.com/sports/softball/schedule"],"roster":["https://goviks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goviks.com/sports/womens-tennis/schedule","https://goviks.com/sports/mens-tennis/schedule"],"roster":["https://goviks.com/sports/womens-tennis/roster","https://goviks.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goviks.com/sports/track-and-field/schedule"],"roster":["https://goviks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goviks.com/sports/womens-volleyball/schedule"],"roster":["https://goviks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'portland-state|"+sport+"':"),`${sport} routes must live in the Portland State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://goviks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.portlandStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=portland-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 1:30 PM Men's · Portland State at Nevada (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Portland State vs Lewis & Clark College | ",
 "Upcoming Nov 7, 7:00 PM Men's · Portland State at Seattle U | ",
 "Upcoming Nov 11, 6:00 PM Men's · Portland State at Colorado State | ",
 "Upcoming Nov 14, 4:00 PM Men's · Portland State at San Francisco | ",
 "Upcoming Nov 16, 7:00 PM Men's · Portland State at Saint Mary's (Calif.) | ",
 "Upcoming Nov 19, 7:00 PM Men's · Portland State vs Northwest Indian College | ",
 "Upcoming Nov 22, 2:00 PM Men's · Portland State vs Cal State Fullerton | ",
 "Upcoming Nov 25 Men's · Portland State at UC Riverside | ",
 "Upcoming Nov 28 Men's · Portland State at Southern Illinois | ",
 "Upcoming Dec 3, 7:00 PM Men's · Portland State vs Eastern Washington | ",
 "Upcoming Dec 5, 2:00 PM Men's · Portland State vs Idaho | ",
 "Upcoming Dec 8, 7:00 PM Men's · Portland State vs Evergreen | ",
 "Upcoming Dec 12, 2:00 PM Men's · Portland State vs George Fox | ",
 "Upcoming Dec 20, 1:30 PM Men's · Portland State at Oregon | ",
 "Upcoming Dec 31, 1:00 PM Men's · Portland State at Montana State | ",
 "Upcoming Jan 2, 1:00 PM Men's · Portland State at Montana | ",
 "Upcoming Jan 7, 6:00 PM Men's · Portland State at Utah Tech | ",
 "Upcoming Jan 9, 5:30 PM Men's · Portland State at Southern Utah | ",
 "Upcoming Jan 14, 7:00 PM Men's · Portland State vs Weber State | ",
 "Upcoming Jan 16, 2:00 PM Men's · Portland State vs Idaho State | ",
 "Upcoming Jan 21, 7:00 PM Men's · Portland State vs Northern Arizona | ",
 "Upcoming Jan 25, 5:00 PM Men's · Portland State at Northern Colorado | ",
 "Upcoming Jan 28, 6:00 PM Men's · Portland State at Idaho | ",
 "Upcoming Jan 30, 2:00 PM Men's · Portland State at Eastern Washington | ",
 "Upcoming Feb 4, 7:00 PM Men's · Portland State vs Montana | ",
 "Upcoming Feb 6, 2:00 PM Men's · Portland State vs Montana State | ",
 "Upcoming Feb 11, 6:00 PM Men's · Portland State at Idaho State | ",
 "Upcoming Feb 13, 3:00 PM Men's · Portland State at Weber State | ",
 "Upcoming Feb 18, 7:00 PM Men's · Portland State vs Southern Utah | ",
 "Upcoming Feb 20, 2:00 PM Men's · Portland State vs Utah Tech | ",
 "Upcoming Feb 22, 5:00 PM Men's · Portland State at Northern Arizona | ",
 "Upcoming Feb 27, 2:00 PM Men's · Portland State vs Northern Colorado | ",
 "Upcoming Mar 5 Men's · Portland State at First Round | ",
 "Upcoming Mar 6 Men's · Portland State at Second Round | ",
 "Upcoming Mar 7 Men's · Portland State at Quarterfinals | ",
 "Upcoming Mar 8 Men's · Portland State at Quarterfinals | ",
 "Upcoming Mar 9 Men's · Portland State at Semifinals | ",
 "Upcoming Mar 10 Men's · Portland State at Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Women's · Portland State vs Warner Pacific (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Portland State vs Pepperdine | ",
 "Upcoming Nov 6, 10:00 AM Women's · Portland State at Boise State | ",
 "Upcoming Nov 10, 6:00 PM Women's · Portland State at San Diego | ",
 "Upcoming Nov 12, 11:00 AM Women's · Portland State at UC San Diego | ",
 "Upcoming Nov 15, 1:00 PM Women's · Portland State at San Jose State | ",
 "Upcoming Nov 18, 6:00 PM Women's · Portland State at Portland | ",
 "Upcoming Nov 24, 7:00 PM Women's · Portland State vs Cal State Fullerton | ",
 "Upcoming Nov 28, 12:00 PM Women's · Portland State vs UC Santa Barbara | ",
 "Upcoming Dec 3, 6:00 PM Women's · Portland State at Eastern Washington | ",
 "Upcoming Dec 5, 2:00 PM Women's · Portland State at Idaho | ",
 "Upcoming Dec 13, 2:00 PM Women's · Portland State vs Western Oregon | ",
 "Upcoming Dec 15, 7:00 PM Women's · Portland State vs Willamette | ",
 "Upcoming Dec 18 Women's · Portland State at Seattle U | ",
 "Upcoming Dec 20 Women's · Portland State at Washington | ",
 "Upcoming Dec 31, 2:00 PM Women's · Portland State vs Montana State | ",
 "Upcoming Jan 2, 2:00 PM Women's · Portland State vs Montana | ",
 "Upcoming Jan 7, 7:00 PM Women's · Portland State vs Utah Tech | ",
 "Upcoming Jan 9, 2:00 PM Women's · Portland State vs Southern Utah | ",
 "Upcoming Jan 14, 5:00 PM Women's · Portland State at Weber State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Portland State at Idaho State | ",
 "Upcoming Jan 21 Women's · Portland State at Northern Arizona | ",
 "Upcoming Jan 25, 7:00 PM Women's · Portland State vs Northern Colorado | ",
 "Upcoming Jan 28, 7:00 PM Women's · Portland State vs Idaho | ",
 "Upcoming Jan 30, 2:00 PM Women's · Portland State vs Eastern Washington | ",
 "Upcoming Feb 4, 6:00 PM Women's · Portland State at Montana | ",
 "Upcoming Feb 6, 1:00 PM Women's · Portland State at Montana State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Portland State vs Idaho State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Portland State vs Weber State | ",
 "Upcoming Feb 17, 5:30 PM Women's · Portland State at Southern Utah | ",
 "Upcoming Feb 20, 12:00 PM Women's · Portland State at Utah Tech | ",
 "Upcoming Feb 22, 7:00 PM Women's · Portland State vs Northern Arizona | ",
 "Upcoming Feb 27, 1:00 PM Women's · Portland State at Northern Colorado | ",
 "Upcoming Mar 5 Women's · Portland State at First Round | ",
 "Upcoming Mar 6 Women's · Portland State at Second Round | ",
 "Upcoming Mar 7 Women's · Portland State at Quarterfinals | ",
 "Upcoming Mar 8 Women's · Portland State at Quarterfinals | ",
 "Upcoming Mar 9 Women's · Portland State at Semifinals | ",
 "Upcoming Mar 10 Women's · Portland State at Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Portland State at Lewis & Clark XC Opener | Women's team: 2nd · 30 pts / Men's team: 3rd · 46 pts",
 "Final Sep 11 Portland State at Ash Creek Collegiate | Women's team: 3rd · 71 pts / Men's team: 2nd · 73 pts",
 "Final Sep 26 Portland State at Mike Johnson Classic | Women's team: 8th · 238 pts / Men's team: 6th · 148 pts",
 "Final Oct 17 Portland State at George Oja Invitational | Women's team: 8th · 210 pts / Men's team: 17th · 470 pts",
 "Upcoming Oct 30 Portland State at Big Sky Championships | ",
 "Upcoming Nov 13 Portland State at NCAA West Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Portland State vs UC Davis | L, 24-31",
 "Final Sep 5 Portland State at San Diego State | L, 20-53",
 "Final Sep 12 Portland State vs North Dakota | L, 23-47",
 "Final Sep 18 Portland State at Oregon | L, 0-84",
 "Final Sep 26 Portland State at Weber State | W, 44-41",
 "Final Oct 10 Portland State vs Utah Tech | W, 30-14",
 "Final Oct 17 Portland State at Northern Arizona | L, 25-38",
 "Upcoming Oct 24, 4:00 PM Portland State at Idaho State | ",
 "Upcoming Oct 31, 1:00 PM Portland State vs Idaho | ",
 "Upcoming Nov 7, 1:00 PM Portland State at Montana | ",
 "Upcoming Nov 13, 7:00 PM Portland State vs Southern Utah | ",
 "Upcoming Nov 21, 1:00 PM Portland State at Eastern Washington | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Portland State at Wolverine Invitational | Completed",
 "Final Sep 21 Portland State at Kalispel Invitational | Completed",
 "Final Sep 28 Portland State at Sun Mountain Intercollegiate | Completed",
 "Final Oct 5 Portland State at Pat Lesser Harbottle Invitational | Completed",
 "Upcoming Feb 8 Portland State at Mountain Classic Match Play | ",
 "Upcoming Feb 22 Portland State at Causeway Invitational | ",
 "Upcoming Mar 8 Portland State at Fresno State Classic | ",
 "Upcoming Apr 12 Portland State at Bobcat Desert Classic | ",
 "Upcoming Apr 21 Portland State at Big Sky Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Portland State vs Oregon | L, 0-3",
 "Final Aug 16 Portland State at UNLV | L, 0-1",
 "Final Aug 20 Portland State at California Baptist | L, 0-2",
 "Final Aug 23 Portland State at San Diego State | L, 0-1",
 "Final Aug 30 Portland State vs Nevada | L, 1-4",
 "Final Sep 6 Portland State vs Western Oregon | W, 3-2",
 "Final Sep 10 Portland State at Portland | L, 0-1",
 "Final Sep 13 Portland State vs Boise State | L, 0-4",
 "Final Sep 20 Portland State vs San Diego | W, 1-0",
 "Final Oct 1 Portland State at Utah Tech | L, 1-2",
 "Final Oct 4 Portland State at Southern Utah | L, 0-1",
 "Final Oct 15 Portland State vs Weber State | W, 2-1",
 "Final Oct 18 Portland State vs Idaho State | L, 0-1",
 "Upcoming Oct 22, 11:00 AM Portland State at Northern Colorado | ",
 "Upcoming Oct 25, 12:00 PM Portland State at Northern Arizona | ",
 "Upcoming Oct 29, 1:00 PM Portland State vs Idaho | ",
 "Upcoming Nov 1, 1:00 PM Portland State vs Eastern Washington | ",
 "Upcoming Nov 5, 12:00 PM Portland State at Montana | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 25, 12:00 PM Portland State vs Centralia (Game 1) | ",
 "Upcoming Oct 25, 2:30 PM Portland State vs Centralia (Game 2) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Portland State at Big Sky Individual Tournament | Completed",
 "Final Oct 8 Women's · Portland State at ITA Northwest Regional | Completed",
 "Upcoming Oct 30 Women's · Portland State at Gonzaga Invite | ",
 "Upcoming Nov 6 Women's · Portland State at Oregon Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 15 Men's · Portland State at ITA Northwest Regional | Completed",
 "Upcoming Oct 23 Men's · Portland State at Duck Invite | ",
 "Upcoming Nov 6 Men's · Portland State at Gonzaga Fall Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 Portland State at Seattle U (Exhibition) | W, 3-1",
 "Final Aug 28 Portland State at Portland | L, 2-3",
 "Final Aug 30 Portland State vs Nevada | W, 3-2",
 "Final Sep 2 Portland State at DePaul | L, 1-3",
 "Final Sep 4 Portland State vs Lindenwood | L, 0-3",
 "Final Sep 4 Portland State at Northern Illinois | L, 1-3",
 "Final Sep 5 Portland State vs Murray State | W, 3-0",
 "Final Sep 10 Portland State vs Prairie View A&M | W, 3-1",
 "Final Sep 10 Portland State vs UTRGV | W, 3-0",
 "Final Sep 11 Portland State at Texas Tech | L, 0-3",
 "Final Sep 17 Portland State at Oregon | L, 0-3",
 "Final Sep 18 Portland State at Oregon State | L, 0-3",
 "Final Sep 24 Portland State vs Utah Tech | L, 0-3",
 "Final Sep 26 Portland State vs Southern Utah | W, 3-1",
 "Final Oct 1 Portland State at Weber State | L, 1-3",
 "Final Oct 3 Portland State at Idaho State | L, 2-3",
 "Final Oct 8 Portland State vs Montana | W, 3-1",
 "Final Oct 10 Portland State vs Montana State | L, 0-3",
 "Final Oct 15 Portland State at Idaho | L, 1-3",
 "Final Oct 17 Portland State at Eastern Washington | W, 3-0",
 "Final Oct 20 Portland State at Northern Arizona | W, 3-2",
 "Upcoming Oct 24, 5:00 PM Portland State vs Northern Colorado | ",
 "Upcoming Oct 29, 7:00 PM Portland State vs Eastern Washington | ",
 "Upcoming Oct 31, 7:00 PM Portland State vs Idaho | ",
 "Upcoming Nov 5, 6:00 PM Portland State at Montana State | ",
 "Upcoming Nov 7, 6:00 PM Portland State at Montana | ",
 "Upcoming Nov 12, 7:00 PM Portland State vs Idaho State | ",
 "Upcoming Nov 14, 5:00 PM Portland State vs Weber State | ",
 "Upcoming Nov 18, 5:30 PM Portland State at Southern Utah | ",
 "Upcoming Nov 20, 5:00 PM Portland State at Utah Tech | ",
 "Upcoming Nov 23 Portland State at Big Sky Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf places from final stories (the cards publish none): "The Vikings
// finished seventh out of 10 teams" (Wolverine), "finish tied for 16th"
// (Harbottle), and "The Vikings finished third" told after the medalist, about
// 2,100 characters in (Sun Mountain).
{
  const team="(?:Vikings|Viks|Portland State|(?:Men's|Women's) Golf)";
  assert.deepEqual(['recap-2026-9-15-WGOLF.html.gz','recap-2026-10-6-WGOLF.html.gz','recap-2026-9-29-WGOLF.html.gz'].map(name=>golfStoryPlace(fixture(name),{team})),['7th','T16th','3rd']);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Portland State module checks passed");
