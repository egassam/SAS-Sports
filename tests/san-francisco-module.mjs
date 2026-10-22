import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sanFranciscoSchool} from '../src/schools/san-francisco.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='san-francisco');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,sanFranciscoHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/san-francisco-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit usfdons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['san-francisco'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',sanFranciscoSchool.scheduleUrls],['roster',sanFranciscoSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('san-francisco|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'usfdons.com',`${key} must stay on usfdons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://usfdons.com/sports/baseball/schedule"],"roster":["https://usfdons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://usfdons.com/sports/mens-basketball/schedule","https://usfdons.com/sports/womens-basketball/schedule"],"roster":["https://usfdons.com/sports/mens-basketball/roster","https://usfdons.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://usfdons.com/sports/womens-beach-volleyball/schedule"],"roster":["https://usfdons.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://usfdons.com/sports/cross-country/schedule"],"roster":["https://usfdons.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://usfdons.com/sports/womens-golf/schedule","https://usfdons.com/sports/mens-golf/schedule"],"roster":["https://usfdons.com/sports/womens-golf/roster","https://usfdons.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://usfdons.com/sports/womens-soccer/schedule","https://usfdons.com/sports/mens-soccer/schedule"],"roster":["https://usfdons.com/sports/womens-soccer/roster","https://usfdons.com/sports/mens-soccer/roster"],"combined":true},"Track & Field":{"schedule":["https://usfdons.com/sports/track-and-field/schedule"],"roster":["https://usfdons.com/sports/track-and-field/roster"],"combined":false},"Triathlon":{"schedule":["https://usfdons.com/sports/triathlon/schedule"],"roster":["https://usfdons.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://usfdons.com/sports/womens-volleyball/schedule"],"roster":["https://usfdons.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'san-francisco|"+sport+"':"),`${sport} routes must live in the San Francisco module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://usfdons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sanFranciscoHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=san-francisco)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · San Francisco at Arizona (Exhibition) | L, 69-93",
 "Upcoming Oct 26, 7:00 PM Men's · San Francisco vs San Francisco State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · San Francisco vs Radford | ",
 "Upcoming Nov 6, 7:00 PM Men's · San Francisco vs North Dakota State | ",
 "Upcoming Nov 10, 7:00 PM Men's · San Francisco vs Montana | ",
 "Upcoming Nov 14, 4:00 PM Men's · San Francisco vs Portland State | ",
 "Upcoming Nov 18, 7:00 PM Men's · San Francisco vs Louisiana | ",
 "Upcoming Nov 23, 1:30 PM Men's · San Francisco vs Nevada | ",
 "Upcoming Nov 24, 11:00 AM Men's · San Francisco vs Oregon State | ",
 "Upcoming Nov 28, 4:00 PM Men's · San Francisco vs Bethune-Cookman | ",
 "Upcoming Dec 2, 7:00 PM Men's · San Francisco vs UNLV | ",
 "Upcoming Dec 5, 4:00 PM Men's · San Francisco vs South Dakota | ",
 "Upcoming Dec 8, 7:00 PM Men's · San Francisco vs Grace | ",
 "Upcoming Dec 12, 1:30 PM Men's · San Francisco at Fresno State | ",
 "Upcoming Dec 16 Men's · San Francisco at Texas State | ",
 "Upcoming Dec 19 Men's · San Francisco vs George Washington | ",
 "Upcoming Dec 21 Men's · San Francisco vs Tulsa | ",
 "Upcoming Dec 29, 7:00 PM Men's · San Francisco vs Yale | ",
 "Upcoming Jan 2, 4:00 PM Men's · San Francisco vs Denver | ",
 "Upcoming Jan 7, 8:00 PM Men's · San Francisco at Santa Clara | ",
 "Upcoming Jan 13 Men's · San Francisco at Seattle U | ",
 "Upcoming Jan 16 Men's · San Francisco at Portland | ",
 "Upcoming Jan 19, 7:00 PM Men's · San Francisco vs LMU | ",
 "Upcoming Jan 23, 4:00 PM Men's · San Francisco vs Pepperdine | ",
 "Upcoming Jan 27, 8:00 PM Men's · San Francisco vs Saint Mary's | ",
 "Upcoming Jan 30 Men's · San Francisco at San Diego | ",
 "Upcoming Feb 3 Men's · San Francisco at Denver | ",
 "Upcoming Feb 6, 8:00 PM Men's · San Francisco vs Pacific | ",
 "Upcoming Feb 9, 8:00 PM Men's · San Francisco at Saint Mary's | ",
 "Upcoming Feb 13, 4:00 PM Men's · San Francisco vs Portland | ",
 "Upcoming Feb 17 Men's · San Francisco at LMU | ",
 "Upcoming Feb 21, 5:00 PM Men's · San Francisco at Pacific | ",
 "Upcoming Feb 24, 8:00 PM Men's · San Francisco vs Santa Clara | ",
 "Upcoming Feb 27, 5:00 PM Men's · San Francisco vs Seattle U | ",
 "Upcoming Mar 5 Men's · San Francisco at West Coast Conference Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 12:00 PM Women's · San Francisco vs Hawaii | ",
 "Upcoming Nov 8, 11:00 AM Women's · San Francisco vs California | ",
 "Upcoming Nov 11, 3:00 PM Women's · San Francisco at Air Force | ",
 "Upcoming Nov 15, 1:00 PM Women's · San Francisco at UC San Diego | ",
 "Upcoming Nov 19, 6:00 PM Women's · San Francisco vs Long Beach State | ",
 "Upcoming Nov 22, 2:00 PM Women's · San Francisco vs CSU Bakersfield | ",
 "Upcoming Nov 25, 11:00 AM Women's · San Francisco vs Cal State East Bay | ",
 "Upcoming Nov 30, 6:00 PM Women's · San Francisco vs Grand Canyon | ",
 "Upcoming Dec 4, 6:00 PM Women's · San Francisco vs Boise State | ",
 "Upcoming Dec 8, 6:30 PM Women's · San Francisco at Sacramento State | ",
 "Upcoming Dec 12, 3:00 PM Women's · San Francisco at Colorado | ",
 "Upcoming Dec 18, 7:30 PM Women's · San Francisco vs Ball State | ",
 "Upcoming Dec 19, 2:30 PM Women's · San Francisco vs Idaho State | ",
 "Upcoming Dec 31, 1:00 PM Women's · San Francisco at Pepperdine | ",
 "Upcoming Jan 2, 2:00 PM Women's · San Francisco at San Diego | ",
 "Upcoming Jan 7, 6:00 PM Women's · San Francisco vs LMU | ",
 "Upcoming Jan 9 Women's · San Francisco at Pacific | ",
 "Upcoming Jan 14, 6:00 PM Women's · San Francisco vs Saint Mary's | ",
 "Upcoming Jan 16, 2:00 PM Women's · San Francisco vs Santa Clara | ",
 "Upcoming Jan 21, 6:00 PM Women's · San Francisco at Seattle U | ",
 "Upcoming Jan 23, 5:00 PM Women's · San Francisco at Portland | ",
 "Upcoming Jan 28, 6:00 PM Women's · San Francisco at LMU | ",
 "Upcoming Jan 30, 2:00 PM Women's · San Francisco vs San Diego | ",
 "Upcoming Feb 4, 7:00 PM Women's · San Francisco at Santa Clara | ",
 "Upcoming Feb 6, 2:00 PM Women's · San Francisco vs Portland | ",
 "Upcoming Feb 11, 6:00 PM Women's · San Francisco vs Pacific | ",
 "Upcoming Feb 13 Women's · San Francisco at Denver | ",
 "Upcoming Feb 18, 6:00 PM Women's · San Francisco vs Pepperdine | ",
 "Upcoming Feb 20 Women's · San Francisco at Saint Mary's | ",
 "Upcoming Feb 25, 6:00 PM Women's · San Francisco vs Seattle U | ",
 "Upcoming Feb 27, 1:00 PM Women's · San Francisco vs Denver | ",
 "Upcoming Mar 5 Women's · San Francisco at West Coast Conference Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 San Francisco at USF Invitational | Women's team: 1st / Men's team: 2nd",
 "Final Sep 18 San Francisco at Saint Mary's Invitational | Women's team: 3rd / Men's team: 8th",
 "Final Oct 2 San Francisco at Joe Piane Invitational | Women's team: 6th / Men's team: 6th",
 "Final Oct 16 San Francisco at Arturo Barrios Invitational | Women's team: 4th / Men's team: 4th",
 "Final Oct 17 San Francisco at Bronco Invitational | Completed",
 "Upcoming Oct 30 San Francisco at West Coast Conference Championship | ",
 "Upcoming Nov 13 San Francisco at NCAA West Regional Championship | ",
 "Upcoming Nov 21 San Francisco at NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · San Francisco at Leadership and Golf Invitational | 12th of 17",
 "Final Sep 21 Women's · San Francisco at Kalispel Invitational | 5th of 14",
 "Final Oct 5 Women's · San Francisco at The Marilyn Smith Invitational | 10th of 14",
 "Upcoming Oct 25 Women's · San Francisco at The Clash at Boulder Creek | ",
 "Upcoming Feb 15 Women's · San Francisco at The Molly Invitational | ",
 "Upcoming Feb 22 Women's · San Francisco at The Causeway Invitational | ",
 "Upcoming Mar 9 Women's · San Francisco at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · San Francisco at The Silicon Valley Showcase | ",
 "Upcoming Apr 5 Women's · San Francisco at Chevron Silverado Showdown | ",
 "Upcoming Apr 23 Women's · San Francisco at West Coast Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · San Francisco at Ram Masters | 1st of 16",
 "Final Sep 21 Men's · San Francisco at CDA National Reserve Invitational | 4th of 16",
 "Final Oct 12 Men's · San Francisco at Visit Stockton Pacific Invitational | 3rd of 18",
 "Final Oct 19 Men's · San Francisco at Saint Mary's Invitational | 5th of 18",
 "Upcoming Feb 11 Men's · San Francisco at John A. Burns Intercollegiate | ",
 "Upcoming Feb 15 Men's · San Francisco at The Prestige | ",
 "Upcoming Mar 8 Men's · San Francisco at R.E. Lamkin Invitational | ",
 "Upcoming Mar 22 Men's · San Francisco at Pathway to Progession Collegiate Invitational | ",
 "Upcoming Apr 9 Men's · San Francisco at El Macero Classic | ",
 "Upcoming Apr 30 Men's · San Francisco at West Coast Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · San Francisco vs CSU Bakersfield | W, 4-0",
 "Final Aug 20 Women's · San Francisco vs Sacramento State | T, 1-1",
 "Final Aug 23 Women's · San Francisco vs Oregon | L, 0-3",
 "Final Aug 27 Women's · San Francisco at Dartmouth | L, 0-2",
 "Final Aug 30 Women's · San Francisco at Boston U | L, 1-3",
 "Final Sep 6 Women's · San Francisco vs Nevada | W, 1-0",
 "Final Sep 17 Women's · San Francisco vs Idaho | W, 1-0",
 "Final Sep 26 Women's · San Francisco at Seattle U | L, 0-4",
 "Final Oct 2 Women's · San Francisco at Saint Mary's | L, 0-3",
 "Final Oct 7 Women's · San Francisco vs Portland | L, 1-2",
 "Final Oct 10 Women's · San Francisco at Pepperdine | L, 0-5",
 "Final Oct 17 Women's · San Francisco vs Pacific | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Women's · San Francisco vs Denver | ",
 "Upcoming Oct 28, 4:00 PM Women's · San Francisco at San Diego | ",
 "Upcoming Oct 31, 1:00 PM Women's · San Francisco vs Santa Clara | ",
 "Upcoming Nov 7, 1:00 PM Women's · San Francisco at LMU | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · San Francisco at Wake Forest | L, 2-4",
 "Final Aug 23 Men's · San Francisco at UNC Greensboro | T, 0-0",
 "Final Aug 27 Men's · San Francisco at Creighton | L, 2-4",
 "Final Aug 30 Men's · San Francisco at Kansas City | W, 3-2",
 "Final Sep 4 Men's · San Francisco vs Air Force | W, 2-0",
 "Final Sep 7 Men's · San Francisco vs Marist | L, 1-4",
 "Final Sep 12 Men's · San Francisco at UC Davis | W, 6-0",
 "Final Sep 16 Men's · San Francisco vs California | W, 3-2",
 "Final Sep 20 Men's · San Francisco at CSU Bakersfield | L, 1-2",
 "Final Sep 26 Men's · San Francisco at Saint Mary's | T, 1-1",
 "Final Sep 30 Men's · San Francisco at Santa Clara | T, 1-1",
 "Final Oct 3 Men's · San Francisco vs San Diego | T, 2-2",
 "Final Oct 10 Men's · San Francisco at Denver | L, 1-2",
 "Final Oct 21 Men's · San Francisco vs Pacific | W, 2-0",
 "Upcoming Oct 24, 7:00 PM Men's · San Francisco vs Seattle U | ",
 "Upcoming Oct 31, 6:00 PM Men's · San Francisco at LMU | ",
 "Upcoming Nov 6, 7:00 PM Men's · San Francisco vs Portland | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 5 San Francisco at Southern Hills Triathlon Super Sprint | 3rd",
 "Final Sep 27 San Francisco at Desert's Edge Triathlon | 3rd",
 "Final Oct 4 San Francisco at Navy Collegiate Cup | 3rd",
 "Final Oct 18 San Francisco at Western Regional Championships | 4th of 15",
 "Upcoming Nov 8 San Francisco at Collegiate National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 San Francisco at Weber State | L, 1-3",
 "Final Aug 29 San Francisco vs Belmont | W, 3-2",
 "Final Aug 30 San Francisco vs San Jose State | L, 0-3",
 "Final Sep 1 San Francisco vs CSU Bakersfield | W, 3-0",
 "Final Sep 4 San Francisco vs Temple | L, 0-3",
 "Final Sep 5 San Francisco at Grand Canyon | W, 3-0",
 "Final Sep 6 San Francisco vs ULM | W, 3-0",
 "Final Sep 11 San Francisco vs Fresno State | L, 2-3",
 "Final Sep 12 San Francisco at CSUN | L, 1-3",
 "Final Sep 13 San Francisco vs UNLV | W, 3-2",
 "Final Sep 17 San Francisco vs Texas Southern | W, 3-1",
 "Final Sep 18 San Francisco vs Northern Arizona | W, 3-0",
 "Final Sep 19 San Francisco vs California Baptist | W, 3-0",
 "Final Sep 24 San Francisco vs LMU | L, 2-3",
 "Final Sep 26 San Francisco vs Pepperdine | L, 1-3",
 "Final Oct 1 San Francisco at Seattle U | W, 3-0",
 "Final Oct 3 San Francisco at Portland | L, 0-3",
 "Final Oct 10 San Francisco vs Santa Clara | L, 1-3",
 "Final Oct 15 San Francisco vs Saint Mary's | L, 2-3",
 "Final Oct 17 San Francisco vs Pacific | W, 3-1",
 "Today Oct 22, 6:00 PM San Francisco at Pepperdine | ",
 "Upcoming Oct 24, 1:00 PM San Francisco at LMU | ",
 "Upcoming Oct 29, 7:00 PM San Francisco at San Diego | ",
 "Upcoming Oct 31, 10:00 AM San Francisco at Denver | ",
 "Upcoming Nov 5, 6:00 PM San Francisco vs Portland | ",
 "Upcoming Nov 7, 12:00 PM San Francisco vs Seattle U | ",
 "Upcoming Nov 14, 1:00 PM San Francisco at Santa Clara | ",
 "Upcoming Nov 19, 6:00 PM San Francisco at Pacific | ",
 "Upcoming Nov 21, 2:00 PM San Francisco at Saint Mary's | ",
 "Upcoming Nov 23, 6:00 PM San Francisco vs Denver | ",
 "Upcoming Nov 25, 5:00 PM San Francisco vs San Diego | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("San Francisco module checks passed");
