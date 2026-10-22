import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ucDavisSchool} from '../src/schools/uc-davis.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uc-davis');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ucDavisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uc-davis-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ucdavisaggies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uc-davis'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',ucDavisSchool.scheduleUrls],['roster',ucDavisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uc-davis|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ucdavisaggies.com',`${key} must stay on ucdavisaggies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ucdavisaggies.com/sports/baseball/schedule"],"roster":["https://ucdavisaggies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ucdavisaggies.com/sports/mens-basketball/schedule","https://ucdavisaggies.com/sports/womens-basketball/schedule"],"roster":["https://ucdavisaggies.com/sports/mens-basketball/roster","https://ucdavisaggies.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://ucdavisaggies.com/sports/beach-volleyball/schedule"],"roster":["https://ucdavisaggies.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://ucdavisaggies.com/sports/cross-country/schedule"],"roster":["https://ucdavisaggies.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://ucdavisaggies.com/sports/field-hockey/schedule"],"roster":["https://ucdavisaggies.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://ucdavisaggies.com/sports/football/schedule"],"roster":["https://ucdavisaggies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ucdavisaggies.com/sports/womens-golf/schedule","https://ucdavisaggies.com/sports/mens-golf/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-golf/roster","https://ucdavisaggies.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://ucdavisaggies.com/sports/womens-gymnastics/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://ucdavisaggies.com/sports/womens-lacrosse/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-lacrosse/roster"],"combined":false},"STUNT":{"schedule":["https://ucdavisaggies.com/sports/stunt/schedule"],"roster":["https://ucdavisaggies.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://ucdavisaggies.com/sports/womens-soccer/schedule","https://ucdavisaggies.com/sports/mens-soccer/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-soccer/roster","https://ucdavisaggies.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ucdavisaggies.com/sports/softball/schedule"],"roster":["https://ucdavisaggies.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ucdavisaggies.com/sports/swimming-and-diving/schedule"],"roster":["https://ucdavisaggies.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://ucdavisaggies.com/sports/womens-tennis/schedule","https://ucdavisaggies.com/sports/mens-tennis/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-tennis/roster","https://ucdavisaggies.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ucdavisaggies.com/sports/track-and-field/schedule"],"roster":["https://ucdavisaggies.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ucdavisaggies.com/sports/womens-volleyball/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://ucdavisaggies.com/sports/womens-water-polo/schedule","https://ucdavisaggies.com/sports/mens-water-polo/schedule"],"roster":["https://ucdavisaggies.com/sports/womens-water-polo/roster","https://ucdavisaggies.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uc-davis|"+sport+"':"),`${sport} routes must live in the UC Davis module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ucdavisaggies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ucDavisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uc-davis)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UC Davis vs North Alabama | ",
 "Upcoming Nov 5, 6:00 PM Men's · UC Davis vs Menlo | ",
 "Upcoming Nov 11, 11:11 AM Men's · UC Davis vs Incarnate Word | ",
 "Upcoming Nov 14, 5:00 PM Men's · UC Davis at Sacramento State | ",
 "Upcoming Nov 17, 6:00 PM Men's · UC Davis vs Alabama State | ",
 "Upcoming Nov 25, 5:00 PM Men's · UC Davis vs Omaha | ",
 "Upcoming Nov 26, 5:00 PM Men's · UC Davis vs Jacksonville State | ",
 "Upcoming Nov 27, 5:00 PM Men's · UC Davis vs Pacific | ",
 "Upcoming Dec 1, 6:00 PM Men's · UC Davis vs Portland | ",
 "Upcoming Dec 3, 5:00 PM Men's · UC Davis at North Dakota State | ",
 "Upcoming Dec 14, 6:00 PM Men's · UC Davis vs Cal Baptist | ",
 "Upcoming Dec 17, 6:00 PM Men's · UC Davis vs Idaho State | ",
 "Upcoming Dec 22, 7:00 PM Men's · UC Davis at Seattle U | ",
 "Upcoming Dec 28, 6:00 PM Men's · UC Davis vs Pacific Union | ",
 "Upcoming Jan 2, 5:00 PM Men's · UC Davis vs Grand Canyon | ",
 "Upcoming Jan 5, 6:00 PM Men's · UC Davis vs Hawai'i | ",
 "Upcoming Jan 9, 3:45 PM Men's · UC Davis at New Mexico | ",
 "Upcoming Jan 12, 5:30 PM Men's · UC Davis at Wyoming | ",
 "Upcoming Jan 16, 4:00 PM Men's · UC Davis vs San Jose State | ",
 "Upcoming Jan 19, 6:00 PM Men's · UC Davis vs UNLV | ",
 "Upcoming Jan 23, 6:00 PM Men's · UC Davis at UTEP | ",
 "Upcoming Jan 30 Men's · UC Davis at Hawai'i | ",
 "Upcoming Feb 3, 7:30 PM Men's · UC Davis vs Nevada | ",
 "Upcoming Feb 6, 4:00 PM Men's · UC Davis vs Air Force | ",
 "Upcoming Feb 9, 7:30 PM Men's · UC Davis at San Jose State | ",
 "Upcoming Feb 13, 4:00 PM Men's · UC Davis vs UTEP | ",
 "Upcoming Feb 16, 7:00 PM Men's · UC Davis at Nevada | ",
 "Upcoming Feb 20, 12:00 PM Men's · UC Davis at Air Force | ",
 "Upcoming Feb 23, 6:00 PM Men's · UC Davis vs Wyoming | ",
 "Upcoming Feb 27, 4:00 PM Men's · UC Davis vs New Mexico | ",
 "Upcoming Mar 2, 7:00 PM Men's · UC Davis at UNLV | ",
 "Upcoming Mar 6, 12:00 PM Men's · UC Davis at Grand Canyon | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 4:00 PM Women's · UC Davis vs Jessup | ",
 "Upcoming Nov 6, 1:00 PM Women's · UC Davis at Eastern Washington | ",
 "Upcoming Nov 8, 2:00 PM Women's · UC Davis at Stanford | ",
 "Upcoming Nov 12, 11:00 AM Women's · UC Davis vs Cal State Fullerton | ",
 "Upcoming Nov 16, 5:00 PM Women's · UC Davis at Northern Colorado | ",
 "Upcoming Nov 20, 5:00 PM Women's · UC Davis vs California Baptist | ",
 "Upcoming Nov 22, 1:00 PM Women's · UC Davis at Boise State | ",
 "Upcoming Nov 27, 3:30 PM Women's · UC Davis vs Troy | ",
 "Upcoming Nov 29, 10:30 AM Women's · UC Davis vs New Mexico State | ",
 "Upcoming Dec 2 Women's · UC Davis at Pacific | ",
 "Upcoming Dec 6, 2:00 PM Women's · UC Davis vs Chico State | ",
 "Upcoming Dec 13, 2:00 PM Women's · UC Davis vs Montana | ",
 "Upcoming Dec 17, 5:00 PM Women's · UC Davis at Utah Valley | ",
 "Upcoming Dec 20, 9:00 AM Women's · UC Davis at Harvard | ",
 "Upcoming Dec 30 Women's · UC Davis at UNLV | ",
 "Upcoming Jan 2, 2:00 PM Women's · UC Davis vs Hawai'i | ",
 "Upcoming Jan 6 Women's · UC Davis at UTEP | ",
 "Upcoming Jan 9, 4:00 PM Women's · UC Davis vs Grand Canyon | ",
 "Upcoming Jan 13, 6:00 PM Women's · UC Davis vs Wyoming | ",
 "Upcoming Jan 16 Women's · UC Davis at Hawai'i | ",
 "Upcoming Jan 23, 4:00 PM Women's · UC Davis vs San Jose State | ",
 "Upcoming Jan 27 Women's · UC Davis at New Mexico | ",
 "Upcoming Jan 30 Women's · UC Davis at Grand Canyon | ",
 "Upcoming Feb 3, 4:30 PM Women's · UC Davis vs Air Force | ",
 "Upcoming Feb 6, 1:00 PM Women's · UC Davis at Wyoming | ",
 "Upcoming Feb 10, 6:00 PM Women's · UC Davis vs UTEP | ",
 "Upcoming Feb 13 Women's · UC Davis at Nevada | ",
 "Upcoming Feb 17, 6:00 PM Women's · UC Davis vs UNLV | ",
 "Upcoming Feb 20, 4:00 PM Women's · UC Davis vs New Mexico | ",
 "Upcoming Feb 24 Women's · UC Davis at Air Force | ",
 "Upcoming Feb 27 Women's · UC Davis at San Jose State | ",
 "Upcoming Mar 2, 6:00 PM Women's · UC Davis vs Nevada | ",
 "Upcoming Mar 7 Women's · UC Davis at Mountain West Championships | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UC Davis at USF Invitational | Women's team: 7th / Men's team: 8th",
 "Final Sep 19 UC Davis at Riverside Invitational | Women's team: 14th / Men's team: 17th",
 "Final Oct 17 UC Davis at Bronco Invitational | Women's team: 8th / Men's team: 8th",
 "Upcoming Oct 30 UC Davis at Mountain West Championships | ",
 "Upcoming Nov 13 UC Davis at NCAA West Regionals | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 UC Davis vs Central Michigan | W, 2-1",
 "Final Aug 30 UC Davis vs UMASS Lowell | L, 1-3",
 "Final Sep 4 UC Davis vs Columbia | L, 1-2",
 "Final Sep 6 UC Davis vs Bellarmine | W, 2-1",
 "Final Sep 11 UC Davis at Northeastern | L, 0-1",
 "Final Sep 13 UC Davis at Yale | L, 0-3",
 "Final Sep 20 UC Davis vs Northwestern | L, 0-7",
 "Final Sep 22 UC Davis at Stanford | L, 1-4",
 "Final Sep 27 UC Davis vs Louisville | W, 1-0",
 "Final Oct 2 UC Davis at Dartmouth | L, 1-3",
 "Final Oct 4 UC Davis at Sacred Heart | L, 2-3",
 "Final Oct 16 UC Davis vs Stanford | L, 0-2",
 "Final Oct 18 UC Davis vs Cal | L, 1-7",
 "Upcoming Oct 23, 2:00 PM UC Davis at Delaware | ",
 "Upcoming Oct 25, 8:00 AM UC Davis at Towson | ",
 "Upcoming Nov 6 UC Davis at MPSF Championship | ",
 "Upcoming Nov 7 UC Davis at MPSF Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 UC Davis at Portland State | W, 31-24",
 "Final Sep 5 UC Davis at San Diego | W, 49-17",
 "Final Sep 12 UC Davis at SMU | L, 10-56",
 "Final Sep 19 UC Davis vs Stetson | W, 45-7",
 "Final Sep 26 UC Davis vs Montana | L, 22-62",
 "Final Oct 3 UC Davis vs Eastern Washington | W, 49-38",
 "Final Oct 17 UC Davis at Southern Utah | L, 17-38",
 "Upcoming Oct 24, 4:00 PM UC Davis vs Northern Colorado | ",
 "Upcoming Oct 31, 12:00 PM UC Davis at Weber State | ",
 "Upcoming Nov 7, 4:00 PM UC Davis vs Utah Tech | ",
 "Upcoming Nov 14, 1:00 PM UC Davis at Idaho | ",
 "Upcoming Nov 21, 1:00 PM UC Davis vs Cal Poly | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UC Davis at Leadership and Golf Invitational | 7th of 17",
 "Final Sep 21 Women's · UC Davis at Ben Connell Ram Classic | T4th of 13",
 "Final Oct 5 Women's · UC Davis at Marilynn Smith Sunflower Invitational | 4th of 14",
 "Final Oct 16 Women's · UC Davis at Stanford Intercollegiate | 12th of 17",
 "Upcoming Feb 13 Women's · UC Davis at Alice and John Wallace Classic | ",
 "Upcoming Feb 22 Women's · UC Davis at Causeway Invitational | ",
 "Upcoming Mar 9 Women's · UC Davis at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · UC Davis at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 5 Women's · UC Davis at Chevron Silverado Showdown | ",
 "Upcoming Apr 20 Women's · UC Davis at Mountain West Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · UC Davis at Ram Masters Invitational | T6th of 16",
 "Final Sep 19 Men's · UC Davis at Gene Miranda Falcon Invitational | T6th of 18",
 "Final Sep 28 Men's · UC Davis at Windon Memorial Classic | 14th of 16",
 "Final Oct 4 Men's · UC Davis at Trinity Forest Invitational | 17th of 17",
 "Upcoming Feb 4 Men's · UC Davis at Amer Ari Invitational | ",
 "Upcoming Feb 15 Men's · UC Davis at The Prestige | ",
 "Upcoming Mar 8 Men's · UC Davis at Lamkin Invitational | ",
 "Upcoming Mar 22 Men's · UC Davis at Bridgestone Collegiate Invitational | ",
 "Upcoming Mar 25 Men's · UC Davis at The Goodwin | ",
 "Upcoming Apr 9 Men's · UC Davis at El Macero Classic | ",
 "Upcoming Apr 30 Men's · UC Davis at Mountain West Conference Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 10, 2:00 PM UC Davis at Sacramento State | ",
 "Upcoming Jan 17, 2:00 PM UC Davis at Denver | ",
 "Upcoming Jan 17, 2:00 PM UC Davis at San Jose State | ",
 "Upcoming Jan 17, 2:00 PM UC Davis at Hamline | ",
 "Upcoming Jan 24, 2:00 PM UC Davis at Air Force | ",
 "Upcoming Jan 29, 6:00 PM UC Davis at Air Force | ",
 "Upcoming Feb 7, 2:00 PM UC Davis at Sacramento State | ",
 "Upcoming Feb 12, 7:00 PM UC Davis at San Jose State | ",
 "Upcoming Feb 21, 2:00 PM UC Davis at Northern Illinois | ",
 "Upcoming Feb 28, 2:00 PM UC Davis at Sacramento State | ",
 "Upcoming Mar 7, 2:00 PM UC Davis at Southeast Missouri State | ",
 "Upcoming Mar 7, 2:00 PM UC Davis at Bridgeport | ",
 "Upcoming Mar 13, 2:00 PM UC Davis at Oregon State | ",
 "Upcoming Mar 13, 2:00 PM UC Davis at Boise State | ",
 "Upcoming Mar 13, 2:00 PM UC Davis at Texas Women's College | ",
 "Upcoming Mar 20 UC Davis at Mountain West Conference | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Jan 23 UC Davis at Stanford | ",
 "Upcoming Jan 30 UC Davis vs Dominican | ",
 "Upcoming Feb 5 UC Davis at USC | ",
 "Upcoming Feb 10 UC Davis vs California | ",
 "Upcoming Feb 15 UC Davis vs Marquette | ",
 "Upcoming Feb 20 UC Davis vs Kent State | ",
 "Upcoming Mar 6 UC Davis vs Oregon | ",
 "Upcoming Mar 11 UC Davis vs Bucknell | ",
 "Upcoming Mar 14 UC Davis vs Iona | ",
 "Upcoming Mar 21 UC Davis vs Quinnipiac | ",
 "Upcoming Mar 25 UC Davis at Old Dominion | ",
 "Upcoming Apr 3 UC Davis at Colorado | ",
 "Upcoming Apr 5 UC Davis at Denver | ",
 "Upcoming Apr 9 UC Davis vs Florida | ",
 "Upcoming Apr 18 UC Davis at Cincinnati | ",
 "Upcoming Apr 24 UC Davis at San Diego State | ",
 "Upcoming May 1 UC Davis vs Arizona State | ",
 "Upcoming May 6 UC Davis at Big 12 Tournament | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UC Davis at Fresno State | W, 2-0",
 "Final Aug 16 Women's · UC Davis vs Sacramento State | L, 0-1",
 "Final Aug 20 Women's · UC Davis at Saint Mary's | L, 0-3",
 "Final Aug 27 Women's · UC Davis at Santa Clara | L, 0-1",
 "Final Aug 30 Women's · UC Davis vs UC Santa Barbara | T, 1-1",
 "Final Sep 6 Women's · UC Davis vs Pacific | W, 1-0",
 "Final Sep 10 Women's · UC Davis at Loyola Marymount | T, 0-0",
 "Final Sep 17 Women's · UC Davis at Portland | L, 0-2",
 "Final Sep 20 Women's · UC Davis vs Idaho | L, 0-2",
 "Final Sep 24 Women's · UC Davis at Air Force | L, 1-3",
 "Final Sep 27 Women's · UC Davis at Colorado College | L, 1-2",
 "Final Oct 2 Women's · UC Davis vs Wyoming | W, 3-2",
 "Final Oct 7 Women's · UC Davis vs Grand Canyon | W, 3-0",
 "Final Oct 11 Women's · UC Davis at New Mexico | L, 1-2",
 "Final Oct 15 Women's · UC Davis vs UNLV | W, 1-0",
 "Final Oct 18 Women's · UC Davis vs Hawai'i | L, 0-1",
 "Upcoming Oct 28, 4:00 PM Women's · UC Davis at San Jose State | ",
 "Upcoming Nov 1, 1:00 PM Women's · UC Davis vs UTEP | ",
 "Upcoming Nov 7, 2:00 PM Women's · UC Davis at Nevada | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UC Davis at Sacramento State | L, 1-3",
 "Final Aug 23 Men's · UC Davis vs Cal Poly | T, 2-2",
 "Final Aug 27 Men's · UC Davis at Pacific | T, 3-3",
 "Final Aug 30 Men's · UC Davis at Stanford | L, 1-2",
 "Final Sep 3 Men's · UC Davis at Seattle | L, 1-6",
 "Final Sep 5 Men's · UC Davis at Washington | L, 0-4",
 "Final Sep 12 Men's · UC Davis vs San Francisco | L, 0-6",
 "Final Sep 19 Men's · UC Davis at Saint Mary's | T, 2-2",
 "Final Sep 26 Men's · UC Davis at San Jose State | T, 1-1",
 "Final Sep 30 Men's · UC Davis vs Air Force | L, 0-2",
 "Final Oct 4 Men's · UC Davis at Utah Tech | W, 2-0",
 "Final Oct 10 Men's · UC Davis vs Grand Canyon | L, 1-3",
 "Final Oct 14 Men's · UC Davis at UNLV | L, 0-1",
 "Final Oct 18 Men's · UC Davis at Air Force | L, 1-2",
 "Upcoming Oct 23, 6:00 PM Men's · UC Davis vs Utah Tech | ",
 "Upcoming Oct 28, 6:00 PM Men's · UC Davis vs UNLV | ",
 "Upcoming Nov 1, 6:00 PM Men's · UC Davis at Grand Canyon | ",
 "Upcoming Nov 6, 6:00 PM Men's · UC Davis vs San Jose State | ",
 "Upcoming Nov 8 Men's · UC Davis at Mountain West Men's Soccer Championship | ",
 "Upcoming Nov 19 Men's · UC Davis at NCAA Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Mar 25 UC Davis at Grand Canyon | ",
 "Upcoming Mar 26 UC Davis at Grand Canyon | ",
 "Upcoming Mar 27 UC Davis at Grand Canyon | ",
 "Upcoming Apr 2 UC Davis vs UNLV | ",
 "Upcoming Apr 3 UC Davis vs UNLV | ",
 "Upcoming Apr 4 UC Davis vs UNLV | ",
 "Upcoming Apr 9 UC Davis at Nevada | ",
 "Upcoming Apr 10 UC Davis at Nevada | ",
 "Upcoming Apr 11 UC Davis at Nevada | ",
 "Upcoming Apr 16 UC Davis at San Jose State | ",
 "Upcoming Apr 17 UC Davis at San Jose State | ",
 "Upcoming Apr 18 UC Davis at San Jose State | ",
 "Upcoming Apr 23 UC Davis vs Hawai'i | ",
 "Upcoming Apr 24 UC Davis vs Hawai'i | ",
 "Upcoming Apr 25 UC Davis vs Hawai'i | ",
 "Upcoming Apr 30 UC Davis at New Mexico | ",
 "Upcoming May 1 UC Davis at New Mexico | ",
 "Upcoming May 2 UC Davis at New Mexico | ",
 "Upcoming May 7 UC Davis vs UTEP | ",
 "Upcoming May 8 UC Davis vs UTEP | ",
 "Upcoming May 9 UC Davis vs UTEP | ",
 "Upcoming May 12 UC Davis at Mountain West Championships | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 3 UC Davis at Pacific Invite | Completed",
 "Final Oct 9 UC Davis vs Nevada | L, 107-193",
 "Final Oct 16 UC Davis at Gary Ota Invite | Completed",
 "Upcoming Oct 31, 12:00 PM UC Davis vs UC San Diego | ",
 "Upcoming Nov 12 UC Davis at Trojan Diving Invite | ",
 "Upcoming Nov 18 UC Davis at Trailblazer Invite | ",
 "Upcoming Dec 14 UC Davis at UNLV Diving Invite | ",
 "Upcoming Jan 2, 12:00 PM UC Davis vs Saint Mary's | ",
 "Upcoming Jan 16, 12:00 PM UC Davis vs Fresno State | ",
 "Upcoming Jan 17, 11:00 AM UC Davis vs UC Santa Barbara/Pacific | ",
 "Upcoming Jan 30, 12:00 PM UC Davis vs San Jose State | ",
 "Upcoming Feb 16 UC Davis at Mountain West Championships | ",
 "Upcoming Feb 17 UC Davis at Mountain West Championships | ",
 "Upcoming Mar 17 UC Davis at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · UC Davis at Central Valley Clash | Completed",
 "Final Oct 8 Women's · UC Davis at ITA Regionals | Completed",
 "Today Oct 21 Women's · UC Davis at Mountain West Individual Championships | ",
 "Upcoming Oct 30 Women's · UC Davis at Saint Mary's Fall Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · UC Davis at UC Davis Aggie Invitational | Completed",
 "Final Oct 3 Men's · UC Davis at NorCal Shootout | Completed",
 "Final Oct 15 Men's · UC Davis at ITA Northwest Regionals | Completed",
 "Today Oct 21 Men's · UC Davis at Mountain West Fall Championships | ",
 "Upcoming Oct 30 Men's · UC Davis at Pacific Invite | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UC Davis at Colorado State | L, 0-3",
 "Final Aug 29 UC Davis at Northern Colorado | W, 3-1",
 "Final Aug 30 UC Davis vs SMU | L, 2-3",
 "Final Sep 3 UC Davis vs San Diego State | L, 0-3",
 "Final Sep 5 UC Davis vs Cal Poly | W, 3-2",
 "Final Sep 10 UC Davis at Arizona State | W, 3-1",
 "Final Sep 11 UC Davis vs San Diego | L, 2-3",
 "Final Sep 12 UC Davis vs Oregon | L, 0-3",
 "Final Sep 16 UC Davis vs California | L, 2-3",
 "Final Sep 18 UC Davis at USC | L, 1-3",
 "Final Sep 19 UC Davis vs UC Santa Barbara | W, 3-1",
 "Final Sep 24 UC Davis at UNLV | W, 3-2",
 "Final Sep 26 UC Davis at UNLV | W, 3-1",
 "Final Oct 1 UC Davis vs Air Force | W, 3-0",
 "Final Oct 3 UC Davis vs Air Force | W, 3-1",
 "Final Oct 8 UC Davis vs New Mexico | L, 2-3",
 "Final Oct 10 UC Davis vs New Mexico | L, 1-3",
 "Final Oct 16 UC Davis at San Jose State | W, 3-0",
 "Final Oct 17 UC Davis at San Jose State | L, 2-3",
 "Today Oct 22, 6:00 PM UC Davis at Nevada | ",
 "Upcoming Oct 24, 11:00 AM UC Davis vs Nevada | ",
 "Upcoming Oct 30, 6:00 PM UC Davis vs Hawai'i | ",
 "Upcoming Oct 31, 6:00 PM UC Davis vs Hawai'i | ",
 "Upcoming Nov 6, 5:00 PM UC Davis at UTEP | ",
 "Upcoming Nov 8, 11:00 AM UC Davis at UTEP | ",
 "Upcoming Nov 12, 5:30 PM UC Davis at Wyoming | ",
 "Upcoming Nov 14, 6:00 PM UC Davis at Wyoming | ",
 "Upcoming Nov 18, 6:00 PM UC Davis vs GCU | ",
 "Upcoming Nov 19, 6:00 PM UC Davis vs GCU | ",
 "Upcoming Nov 24 UC Davis at Mountain West Championships | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Oct 24, 12:00 PM Women's · UC Davis vs Cal | ",
 "Upcoming Oct 24, 4:15 PM Women's · UC Davis vs Fresno State | ",
 "Upcoming Oct 25, 12:00 PM Women's · UC Davis vs Hawai'i | ",
 "Upcoming Oct 25, 3:00 PM Women's · UC Davis vs Pacific | ",
 "Upcoming Nov 7, 10:15 AM Women's · UC Davis vs Stanford | ",
 "Upcoming Nov 7, 12:45 PM Women's · UC Davis vs Fresno State | ",
 "Upcoming Nov 7, 2:00 PM Women's · UC Davis at Cal | ",
 "Upcoming Nov 15, 10:00 AM Women's · UC Davis vs Saint Mary's College of California | ",
 "Upcoming Jan 16, 3:30 PM Women's · UC Davis at Stanford | ",
 "Upcoming Jan 23 Women's · UC Davis at Cal Cup | ",
 "Upcoming Jan 24 Women's · UC Davis at Cal Cup | ",
 "Upcoming Jan 29 Women's · UC Davis at Triton Invite | ",
 "Upcoming Jan 30 Women's · UC Davis at Triton Invite | ",
 "Upcoming Jan 31 Women's · UC Davis at Triton Invite | ",
 "Upcoming Feb 13 Women's · UC Davis at CLU Tournament | ",
 "Upcoming Feb 14 Women's · UC Davis at CLU Tournament | ",
 "Upcoming Feb 19, 5:00 PM Women's · UC Davis vs Azusa Pacific | ",
 "Upcoming Feb 20, 1:00 PM Women's · UC Davis vs Cal | ",
 "Upcoming Feb 26 Women's · UC Davis at Santa Clara | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · UC Davis vs Wagner | W, 14-8",
 "Final Aug 29 Men's · UC Davis vs Iona | W, 29-11",
 "Final Aug 29 Men's · UC Davis at Brown | W, 18-4",
 "Final Aug 30 Men's · UC Davis vs Fordham | L, 10-13",
 "Final Sep 5 Men's · UC Davis vs UCLA | L, 10-14",
 "Final Sep 5 Men's · UC Davis vs Cuesta College | W, 16-8",
 "Final Sep 6 Men's · UC Davis vs Harvard | W, 17-13",
 "Final Sep 6 Men's · UC Davis vs UC Merced | W, 17-6",
 "Final Sep 6 Men's · UC Davis vs American River College | W, 24-3",
 "Final Sep 13 Men's · UC Davis vs California | L, 7-19",
 "Final Sep 18 Men's · UC Davis vs UC Irvine | L, 10-14",
 "Final Sep 19 Men's · UC Davis vs LMU | L, 8-11",
 "Final Sep 19 Men's · UC Davis vs Claremont-Mudd-Scripps | W, 13-10",
 "Final Sep 20 Men's · UC Davis vs California Baptist | L, 16-17",
 "Final Sep 27 Men's · UC Davis vs Stanford | L, 8-15",
 "Final Oct 9 Men's · UC Davis at Santa Clara | W, 13-8",
 "Final Oct 11 Men's · UC Davis at San Jose State | W, 16-9",
 "Final Oct 16 Men's · UC Davis vs Pacific | W, 13-11",
 "Final Oct 18 Men's · UC Davis vs Air Force | W, 16-11",
 "Upcoming Oct 24, 10:20 AM Men's · UC Davis vs UC Merced | ",
 "Upcoming Oct 24, 2:20 PM Men's · UC Davis vs Harvard | ",
 "Upcoming Oct 25, 8:00 AM Men's · UC Davis vs Princeton | ",
 "Upcoming Oct 30, 12:00 PM Men's · UC Davis at Pepperdine | ",
 "Upcoming Nov 1, 1:00 PM Men's · UC Davis vs Saint Mary's | ",
 "Upcoming Nov 8, 12:00 PM Men's · UC Davis vs LMU | ",
 "Upcoming Nov 14, 11:00 AM Men's · UC Davis vs Alumni Water Polo Club | ",
 "Upcoming Nov 20 Men's · UC Davis at WCC Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UC Davis module checks passed");
