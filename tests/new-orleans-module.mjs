import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {newOrleansSchool} from '../src/schools/new-orleans.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='new-orleans');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,newOrleansHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/new-orleans-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit privateersports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['new-orleans'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',newOrleansSchool.scheduleUrls],['roster',newOrleansSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('new-orleans|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'privateersports.com',`${key} must stay on privateersports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://privateersports.com/sports/baseball/schedule"],"roster":["https://privateersports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://privateersports.com/sports/mens-basketball/schedule","https://privateersports.com/sports/womens-basketball/schedule"],"roster":["https://privateersports.com/sports/mens-basketball/roster","https://privateersports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://privateersports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://privateersports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://privateersports.com/sports/cross-country/schedule"],"roster":["https://privateersports.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://privateersports.com/sports/mens-golf/schedule"],"roster":["https://privateersports.com/sports/mens-golf/roster"],"combined":false},"Tennis":{"schedule":["https://privateersports.com/sports/womens-tennis/schedule","https://privateersports.com/sports/mens-tennis/schedule"],"roster":["https://privateersports.com/sports/womens-tennis/roster","https://privateersports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://privateersports.com/sports/track-and-field/schedule"],"roster":["https://privateersports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://privateersports.com/sports/womens-volleyball/schedule"],"roster":["https://privateersports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'new-orleans|"+sport+"':"),`${sport} routes must live in the New Orleans module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://privateersports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.newOrleansHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=new-orleans)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · UNO at Southern Miss (Exhibition) | W, 82-72",
 "Upcoming Nov 3, 7:00 PM Men's · UNO at LSU | ",
 "Upcoming Nov 7, 1:00 PM Men's · UNO vs Loyola | ",
 "Upcoming Nov 14, 5:00 PM Men's · UNO vs SUNO | ",
 "Upcoming Nov 18, 6:30 PM Men's · UNO at Texas Tech | ",
 "Upcoming Nov 21 Men's · UNO at Texas Southern | ",
 "Upcoming Nov 25, 3:00 PM Men's · UNO vs Grambling State | ",
 "Upcoming Nov 29, 4:00 PM Men's · UNO vs Florida Gulf Coast | ",
 "Upcoming Dec 1, 8:00 PM Men's · UNO at Arizona | ",
 "Upcoming Dec 5, 5:00 PM Men's · UNO vs UTRGV | ",
 "Upcoming Dec 7, 6:30 PM Men's · UNO vs Texas A&M-Corpus Christi | ",
 "Upcoming Dec 13 Men's · UNO at Grambling State | ",
 "Upcoming Dec 19, 3:30 PM Men's · UNO at HCU | ",
 "Upcoming Dec 21, 11:00 AM Men's · UNO at UIW | ",
 "Upcoming Dec 29, 7:00 PM Men's · UNO at Kansas | ",
 "Upcoming Jan 2, 3:30 PM Men's · UNO at Northwestern State | ",
 "Upcoming Jan 4, 6:30 PM Men's · UNO at East Texas A&M | ",
 "Upcoming Jan 9, 5:00 PM Men's · UNO vs Nicholls | ",
 "Upcoming Jan 11, 6:30 PM Men's · UNO vs Southeastern | ",
 "Upcoming Jan 16, 4:30 PM Men's · UNO at Stephen F. Austin | ",
 "Upcoming Jan 18, 6:00 PM Men's · UNO at Lamar | ",
 "Upcoming Jan 23, 5:00 PM Men's · UNO vs East Texas A&M | ",
 "Upcoming Jan 26, 6:30 PM Men's · UNO vs Northwestern State | ",
 "Upcoming Jan 30, 3:00 PM Men's · UNO at Nicholls | ",
 "Upcoming Feb 1, 6:30 PM Men's · UNO vs McNeese | ",
 "Upcoming Feb 6, 4:30 PM Men's · UNO at UTRGV | ",
 "Upcoming Feb 8, 7:00 PM Men's · UNO at Texas A&M-Corpus Christi | ",
 "Upcoming Feb 13, 5:00 PM Men's · UNO vs HCU | ",
 "Upcoming Feb 15, 6:30 PM Men's · UNO vs UIW | ",
 "Upcoming Feb 20, 5:00 PM Men's · UNO vs Lamar | ",
 "Upcoming Feb 22, 6:30 PM Men's · UNO vs Stephen F. Austin | ",
 "Upcoming Feb 27, 3:30 PM Men's · UNO at Southeastern | ",
 "Upcoming Mar 1, 6:30 PM Men's · UNO at McNeese | ",
 "Upcoming Mar 7 Men's · UNO at Southland Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · UNO at Xavier (La.) | ",
 "Upcoming Nov 2, 6:30 PM Women's · UNO at Arkansas | ",
 "Upcoming Nov 4, 6:00 PM Women's · UNO at Alabama | ",
 "Upcoming Nov 7, 11:00 AM Women's · UNO at Texas A&M | ",
 "Upcoming Nov 12, 6:30 PM Women's · UNO at Tulane | ",
 "Upcoming Nov 18, 6:30 PM Women's · UNO at Tulsa | ",
 "Upcoming Nov 20, 7:00 PM Women's · UNO at Oral Roberts | ",
 "Upcoming Nov 24, 6:30 PM Women's · UNO vs West Alabama | ",
 "Upcoming Nov 29, 1:00 PM Women's · UNO vs Bethune-Cookman | ",
 "Upcoming Dec 3, 6:30 PM Women's · UNO vs Texas A&M-CC | ",
 "Upcoming Dec 5, 2:00 PM Women's · UNO vs UTRGV | ",
 "Upcoming Dec 11, 6:00 PM Women's · UNO at Bethune-Cookman | ",
 "Upcoming Dec 13, 2:30 PM Women's · UNO at West Florida | ",
 "Upcoming Dec 17 Women's · UNO at UIW | ",
 "Upcoming Dec 19, 1:00 PM Women's · UNO at HCU | ",
 "Upcoming Dec 31, 11:00 AM Women's · UNO at East Texas A&M | ",
 "Upcoming Jan 2, 1:00 PM Women's · UNO at Northwestern State | ",
 "Upcoming Jan 7, 6:30 PM Women's · UNO vs Nicholls | ",
 "Upcoming Jan 9, 2:00 PM Women's · UNO vs Southeastern | ",
 "Upcoming Jan 14, 6:30 PM Women's · UNO at Lamar | ",
 "Upcoming Jan 16, 2:00 PM Women's · UNO at Stephen F. Austin | ",
 "Upcoming Jan 21, 6:30 PM Women's · UNO vs Northwestern State | ",
 "Upcoming Jan 23, 2:00 PM Women's · UNO vs East Texas A&M | ",
 "Upcoming Jan 28, 6:30 PM Women's · UNO vs McNeese | ",
 "Upcoming Jan 30, 1:00 PM Women's · UNO at Nicholls | ",
 "Upcoming Feb 4, 7:00 PM Women's · UNO at Texas A&M-CC | ",
 "Upcoming Feb 6, 2:00 PM Women's · UNO at UTRGV | ",
 "Upcoming Feb 11, 6:30 PM Women's · UNO vs UIW | ",
 "Upcoming Feb 13, 2:00 PM Women's · UNO vs HCU | ",
 "Upcoming Feb 18, 6:30 PM Women's · UNO vs Stephen F. Austin | ",
 "Upcoming Feb 20, 2:00 PM Women's · UNO vs Lamar | ",
 "Upcoming Feb 25, 6:30 PM Women's · UNO at McNeese | ",
 "Upcoming Feb 27, 1:00 PM Women's · UNO at Southeastern | ",
 "Upcoming Mar 8 Women's · UNO at Southland Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 10 UNO at Coconut Beach AVCA Bid Event | ",
 "Upcoming Oct 23 UNO at Southeastern Fall Event | ",
 "Upcoming Nov 6 UNO at AVCA Pairs Championship | ",
 "Upcoming Nov 20 UNO at Tulane Fall Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UNO at Battle for New Orleans | Women's team: 4th · 117 pts / Men's team: 4th · 109 pts",
 "Final Sep 18 UNO at FSU Pre-Regional | Women's team: 14th · 376 pts / Men's team: 15th · 463 pts",
 "Final Oct 16 UNO at Arturo Barrios Invitational | Women's team: 37th · 981 pts / Men's team: 37th",
 "Upcoming Oct 30 UNO at Southland Conference Championships | ",
 "Upcoming Nov 13 UNO at NCAA South Central Regionals | ",
 "Upcoming Nov 21 UNO at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 UNO at Sandestin Collegiate Classic | Completed",
 "Final Sep 27 UNO at Argent Financial Classic | Completed",
 "Final Oct 12 UNO at Bubba Barnett Intercollegiate | Completed",
 "Final Oct 19 UNO at LaTOUR Intercollegiate | Completed",
 "Upcoming Feb 23 UNO at Big Easy Match Play | ",
 "Upcoming Mar 7 UNO at Louisiana Classics | ",
 "Upcoming Mar 22 UNO at Skyhawk Invitational | ",
 "Upcoming Mar 29 UNO at Golfweek Spring Challenge | ",
 "Upcoming Apr 12 UNO at Karen Edwards Memorial | ",
 "Upcoming Apr 26 UNO at Southland Golf Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Upcoming Oct 29 Women's · UNO at West Florida Fall Fling | ",
 "Upcoming Nov 6 Women's · UNO at Big Easy Classic | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Upcoming Oct 29 Men's · UNO at West Florida Fall Fling | ",
 "Upcoming Nov 6 Men's · UNO at Big Easy Classic | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 UNO vs Xavier (La.) (Exhibition) | W, 3-0",
 "Final Aug 22 UNO vs Dillard (Exhibition) | W, 3-0",
 "Final Aug 28 UNO vs Alcorn State | W, 3-0",
 "Final Aug 29 UNO vs Stonehill | L, 1-3",
 "Final Aug 29 UNO vs Oral Roberts | L, 2-3",
 "Final Sep 4 UNO vs UC-Riverside | L, 0-3",
 "Final Sep 5 UNO vs Pacific | L, 1-3",
 "Final Sep 6 UNO at San Jose State | L, 0-3",
 "Final Sep 11 UNO vs Mercer | L, 0-3",
 "Final Sep 11 UNO at West Georgia | L, 0-3",
 "Final Sep 12 UNO vs Gardner-Webb | L, 1-3",
 "Final Sep 17 UNO vs Idaho | L, 1-3",
 "Final Sep 18 UNO vs Cal State Fullerton | W, 3-1",
 "Final Sep 19 UNO vs Florida A&M | L, 1-3",
 "Final Sep 20 UNO at Tulane | L, 0-3",
 "Final Sep 24 UNO at Lamar | L, 0-3",
 "Final Sep 26 UNO at Stephen F. Austin | L, 0-3",
 "Final Oct 1 UNO at East Texas A&M | L, 1-3",
 "Final Oct 3 UNO at Northwestern State | L, 0-3",
 "Final Oct 8 UNO vs Nicholls | L, 1-3",
 "Final Oct 10 UNO vs McNeese | L, 1-3",
 "Final Oct 15 UNO at HCU | L, 0-3",
 "Final Oct 17 UNO vs UIW | L, 0-3",
 "Final Oct 22 UNO vs Texas A&M-CC | L, 0-3",
 "Today Oct 24, 1:00 PM UNO vs UTRGV | ",
 "Upcoming Oct 29, 6:30 PM UNO at Nicholls | ",
 "Upcoming Oct 31, 10:00 AM UNO at McNeese | ",
 "Upcoming Nov 3, 6:30 PM UNO at Southeastern | ",
 "Upcoming Nov 5, 6:30 PM UNO vs Southeastern | ",
 "Upcoming Nov 12, 6:30 PM UNO vs Lamar | ",
 "Upcoming Nov 14, 1:00 PM UNO vs Stephen F. Austin | ",
 "Upcoming Nov 20 UNO at Southland Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("New Orleans module checks passed");
