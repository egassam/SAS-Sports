import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {coloradoStateSchool} from '../src/schools/colorado-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='colorado-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,coloradoStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/colorado-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit csurams.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['colorado-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',coloradoStateSchool.scheduleUrls],['roster',coloradoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('colorado-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'csurams.com',`${key} must stay on csurams.com`);
  }
}
const parity={"Basketball":{"schedule":["https://csurams.com/sports/mens-basketball/schedule","https://csurams.com/sports/womens-basketball/schedule"],"roster":["https://csurams.com/sports/mens-basketball/roster","https://csurams.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://csurams.com/sports/cross-country/schedule"],"roster":["https://csurams.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://csurams.com/sports/football/schedule"],"roster":["https://csurams.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://csurams.com/sports/womens-golf/schedule","https://csurams.com/sports/mens-golf/schedule"],"roster":["https://csurams.com/sports/womens-golf/roster","https://csurams.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://csurams.com/sports/womens-soccer/schedule"],"roster":["https://csurams.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://csurams.com/sports/softball/schedule"],"roster":["https://csurams.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://csurams.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://csurams.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://csurams.com/sports/womens-tennis/schedule"],"roster":["https://csurams.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://csurams.com/sports/track-and-field/schedule"],"roster":["https://csurams.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://csurams.com/sports/womens-volleyball/schedule"],"roster":["https://csurams.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'colorado-state|"+sport+"':"),`${sport} routes must live in the Colorado State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-18T15:00:00Z");
const page=slug=>`https://csurams.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.coloradoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=colorado-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · Colorado State at San Diego (Exhibition) | ",
 "Upcoming Nov 2, 8:00 PM Men's · Colorado State vs Montana State | ",
 "Upcoming Nov 6, 7:00 PM Men's · Colorado State vs Idaho | ",
 "Upcoming Nov 11, 7:00 PM Men's · Colorado State vs Portland State | ",
 "Upcoming Nov 14, 11:30 AM Men's · Colorado State vs Loyola Chicago | ",
 "Upcoming Nov 18, 7:00 PM Men's · Colorado State vs North Dakota State | ",
 "Upcoming Nov 23, 9:30 PM Men's · Colorado State vs Arizona | ",
 "Upcoming Nov 24 Men's · Colorado State vs Providence or VCU | ",
 "Upcoming Dec 1, 7:00 PM Men's · Colorado State vs UT Arlington | ",
 "Upcoming Dec 5, 8:00 PM Men's · Colorado State at Colorado | ",
 "Upcoming Dec 8, 7:00 PM Men's · Colorado State vs Queens | ",
 "Upcoming Dec 11, 6:00 PM Men's · Colorado State vs Wyoming | ",
 "Upcoming Dec 18, 2:30 PM Men's · Colorado State vs Nevada | ",
 "Upcoming Dec 20, 4:00 PM Men's · Colorado State vs FAU | ",
 "Upcoming Dec 30, 6:00 PM Men's · Colorado State at Wisconsin | ",
 "Upcoming Jan 2, 4:30 PM Men's · Colorado State vs CSU-Pueblo | ",
 "Upcoming Jan 6 Men's · Colorado State vs Texas State | ",
 "Upcoming Jan 9, 4:30 PM Men's · Colorado State at Gonzaga | ",
 "Upcoming Jan 14, 7:00 PM Men's · Colorado State at San Diego State | ",
 "Upcoming Jan 17, 12:00 PM Men's · Colorado State vs Fresno State | ",
 "Upcoming Jan 21, 8:00 PM Men's · Colorado State vs Washington State | ",
 "Upcoming Jan 27, 6:00 PM Men's · Colorado State at Texas State | ",
 "Upcoming Jan 30, 4:30 PM Men's · Colorado State vs San Diego State | ",
 "Upcoming Feb 4 Men's · Colorado State at Fresno State | ",
 "Upcoming Feb 6, 2:30 PM Men's · Colorado State vs Oregon State | ",
 "Upcoming Feb 10 Men's · Colorado State at Utah State | ",
 "Upcoming Feb 13, 5:45 PM Men's · Colorado State at Washington State | ",
 "Upcoming Feb 18, 8:00 PM Men's · Colorado State vs Boise State | ",
 "Upcoming Feb 25, 8:00 PM Men's · Colorado State vs Utah State | ",
 "Upcoming Feb 27, 8:15 PM Men's · Colorado State at Oregon State | ",
 "Upcoming Mar 3, 8:00 PM Men's · Colorado State at Boise State | ",
 "Upcoming Mar 6, 6:30 PM Men's · Colorado State vs Gonzaga | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Colorado State vs Chadron State (Exhibition) | ",
 "Upcoming Nov 2, 5:30 PM Women's · Colorado State vs Lindenwood | ",
 "Upcoming Nov 6 Women's · Colorado State at Utah | ",
 "Upcoming Nov 10 Women's · Colorado State at Denver | ",
 "Upcoming Nov 13, 6:30 PM Women's · Colorado State vs Wyoming | ",
 "Upcoming Nov 20, 6:30 PM Women's · Colorado State vs Harvard | ",
 "Upcoming Nov 22, 1:00 PM Women's · Colorado State vs Weber State | ",
 "Upcoming Nov 26, 1:00 PM Women's · Colorado State vs Grambling State | ",
 "Upcoming Nov 27, 1:00 PM Women's · Colorado State vs Tennessee State/Arkansas Little Rock | ",
 "Upcoming Dec 5, 1:00 PM Women's · Colorado State vs Southern | ",
 "Upcoming Dec 9, 6:30 PM Women's · Colorado State vs South Carolina State | ",
 "Upcoming Dec 12 Women's · Colorado State vs Troy or Arizona State | ",
 "Upcoming Dec 13 Women's · Colorado State vs Troy or Arizona State | ",
 "Upcoming Dec 19, 1:00 PM Women's · Colorado State vs Northern Colorado | ",
 "Upcoming Dec 23 Women's · Colorado State at Loyola Chicago | ",
 "Upcoming Dec 30, 1:00 PM Women's · Colorado State vs South Dakota School of Mines | ",
 "Upcoming Jan 7 Women's · Colorado State vs Fresno State | ",
 "Upcoming Jan 13 Women's · Colorado State at Utah State | ",
 "Upcoming Jan 16 Women's · Colorado State vs San Diego State | ",
 "Upcoming Jan 20 Women's · Colorado State at Washington State | ",
 "Upcoming Jan 24 Women's · Colorado State at Boise State | ",
 "Upcoming Jan 27 Women's · Colorado State vs Texas State | ",
 "Upcoming Jan 31 Women's · Colorado State at San Diego State | ",
 "Upcoming Feb 3 Women's · Colorado State vs Gonzaga | ",
 "Upcoming Feb 7 Women's · Colorado State at Fresno State | ",
 "Upcoming Feb 10 Women's · Colorado State at Texas State | ",
 "Upcoming Feb 14 Women's · Colorado State vs Washington State | ",
 "Upcoming Feb 17 Women's · Colorado State vs Utah State | ",
 "Upcoming Feb 21 Women's · Colorado State at Oregon State | ",
 "Upcoming Feb 24 Women's · Colorado State at Gonzaga | ",
 "Upcoming Mar 3 Women's · Colorado State vs Boise State | ",
 "Upcoming Mar 6 Women's · Colorado State vs Oregon State | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Colorado State at Wyoming Invitational | Women's team: 3rd / Men's team: 1st",
 "Final Sep 19 Colorado State at Roadrunners Invitational | Completed",
 "Final Sep 25 Colorado State at Gans Creek Classic | Women's team: 13th / Men's team: 8th",
 "Final Oct 16 Colorado State at Pre-National Invitational | Women's team: 23rd / Men's team: 29th",
 "Upcoming Oct 24, 9:15 AM Colorado State at UCCS XC Open | ",
 "Upcoming Oct 30 Colorado State at Pac-12 Championships | ",
 "Upcoming Nov 13 Colorado State at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21 Colorado State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Colorado State vs Wyoming | W, 35-13",
 "Final Sep 12 Colorado State vs Southern Utah | W, 58-24",
 "Final Sep 19 Colorado State vs BYU | L, 23-41",
 "Final Sep 26 Colorado State at UTSA | L, 45-59",
 "Final Oct 3 Colorado State vs Oregon State | L, 26-56",
 "Final Oct 15 Colorado State at Texas State | L, 27-66",
 "Upcoming Oct 24, 4:30 PM Colorado State vs San Diego State | ",
 "Upcoming Oct 31, 1:30 PM Colorado State at Utah State | ",
 "Upcoming Nov 7, 4:00 PM Colorado State vs Boise State | ",
 "Upcoming Nov 14, 8:30 PM Colorado State at Washington State | ",
 "Upcoming Nov 21, 5:30 PM Colorado State at Fresno State | ",
 "Upcoming Nov 28 Colorado State vs Flex Week | ",
 "Upcoming Dec 4, 6:00 PM Colorado State vs Pac-12 Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Colorado State at Badger Invitational | 11th of 16",
 "Final Sep 21 Women's · Colorado State at Ben Connell Ram Classic | 8th of 13",
 "Final Oct 2 Women's · Colorado State at Ron Moore Intercollegiate | 12th of 15",
 "Upcoming Oct 19 Women's · Colorado State at Route 66 Invitational | ",
 "Upcoming Feb 8 Women's · Colorado State at Thunderbird Collegiate | ",
 "Upcoming Feb 21 Women's · Colorado State at Westbrook Invitational | ",
 "Upcoming Mar 1 Women's · Colorado State at Lady Luck Invitational | ",
 "Upcoming Mar 19 Women's · Colorado State at El Tigre Invitational | ",
 "Upcoming Apr 5 Women's · Colorado State at Silverado Showdown | ",
 "Upcoming Apr 25 Women's · Colorado State at Pac-12 Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Colorado State at Ram Masters Invitational | 5th",
 "Final Sep 14 Men's · Colorado State at Vuori Classic | 11th",
 "Final Sep 29 Men's · Colorado State at Mark Simpson Invitational | 12th",
 "Upcoming Oct 19 Men's · Colorado State at The Clerico | ",
 "Upcoming Feb 15 Men's · Colorado State at The Prestige | ",
 "Upcoming Mar 8 Men's · Colorado State at The Lamkin | ",
 "Upcoming Mar 15 Men's · Colorado State at Arizona Thunderbird | ",
 "Upcoming Mar 22 Men's · Colorado State at UCLA | ",
 "Upcoming Apr 5 Men's · Colorado State at Tiger Intercollegiate | ",
 "Upcoming Apr 9 Men's · Colorado State at El Macero Classic | ",
 "Upcoming Apr 30 Men's · Colorado State at Pac-12 | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Colorado State at Colorado | L, 1-2",
 "Final Aug 16 Colorado State vs Denver | W, 1-0",
 "Final Aug 23 Colorado State at Northern Colorado | L, 1-2",
 "Final Aug 30 Colorado State vs South Carolina | L, 0-1",
 "Final Sep 3 Colorado State at Brigham Young | L, 1-2",
 "Final Sep 6 Colorado State at Utah Tech | L, 0-1",
 "Final Sep 10 Colorado State vs Kansas State | T, 2-2",
 "Final Sep 17 Colorado State vs Wyoming | L, 0-1",
 "Final Sep 20 Colorado State at Colorado College | T, 1-1",
 "Final Sep 25 Colorado State at Weber State | L, 1-3",
 "Final Oct 1 Colorado State at Fresno State | W, 2-1",
 "Final Oct 4 Colorado State vs Utah State | L, 0-3",
 "Final Oct 8 Colorado State vs Gonzaga | W, 1-0",
 "Final Oct 11 Colorado State at San Diego State | L, 1-3",
 "Final Oct 16 Colorado State at Texas State | L, 0-1",
 "Upcoming Oct 22, 6:00 PM Colorado State vs Boise State | ",
 "Upcoming Oct 25, 2:00 PM Colorado State at Oregon State | ",
 "Upcoming Oct 31, 12:00 PM Colorado State vs Washington State | ",
 "Upcoming Nov 11 Colorado State at Pac-12 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 17, 12:00 PM Colorado State vs Northern Colorado | ",
 "Today Oct 18, 12:00 PM Colorado State vs Metro State | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 13 Colorado State at Horsetooth Open Water | Completed",
 "Final Oct 2 Colorado State at Front Range Invitational | Completed",
 "Final Oct 17 Colorado State vs Washington State | W, 149-145",
 "Final Oct 17 Colorado State vs Colorado Mesa | W, 204-96",
 "Upcoming Oct 30, 12:00 PM Colorado State at Denver | ",
 "Upcoming Nov 6, 4:00 PM Colorado State vs Wyoming | ",
 "Upcoming Nov 7 Colorado State vs Northern Arizona | ",
 "Upcoming Nov 17 Colorado State at Hawkeye Invitational | ",
 "Upcoming Jan 8 Colorado State at California Baptist | ",
 "Upcoming Jan 9 Colorado State at Pepperdine | ",
 "Upcoming Jan 9 Colorado State vs Texas Rio Grande Valley | ",
 "Upcoming Jan 15, 4:00 PM Colorado State at Northern Colorado | ",
 "Upcoming Jan 23, 12:00 PM Colorado State vs Air Force | ",
 "Upcoming Jan 28 Colorado State at Air Force Diving Invitational | ",
 "Upcoming Feb 24 Colorado State at Pac-12 Championships | ",
 "Upcoming Mar 8 Colorado State at NCAA Diving Zones | ",
 "Upcoming Mar 17 Colorado State at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Colorado State at Jon Messick Invitational | Completed",
 "Final Sep 25 Colorado State at Bedford Cup | Completed",
 "Final Oct 13 Colorado State at ITA Regionals | Completed",
 "Upcoming Oct 23 Colorado State at Pac-12 Qualifier | ",
 "Upcoming Nov 6 Colorado State at San Diego State Fall Classic | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Colorado State vs UC Davis | W, 3-0",
 "Final Aug 29 Colorado State vs SMU | L, 1-3",
 "Final Sep 1 Colorado State vs Northern Colorado | W, 3-1",
 "Final Sep 4 Colorado State at North Carolina | L, 2-3",
 "Final Sep 5 Colorado State vs James Madison | W, 3-1",
 "Final Sep 10 Colorado State vs South Dakota | W, 3-0",
 "Final Sep 11 Colorado State vs UCSB | W, 3-0",
 "Final Sep 12 Colorado State at Wyoming | W, 3-0",
 "Final Sep 17 Colorado State at Colorado | L, 1-3",
 "Final Sep 18 Colorado State vs Colorado | W, 3-0",
 "Final Sep 24 Colorado State vs San Diego State | W, 3-1",
 "Final Sep 26 Colorado State at Texas State | W, 3-0",
 "Final Oct 1 Colorado State at Gonzaga | W, 3-2",
 "Final Oct 3 Colorado State at Utah State | W, 3-2",
 "Final Oct 8 Colorado State vs Washington State | W, 3-0",
 "Final Oct 10 Colorado State vs Oregon State | W, 3-1",
 "Final Oct 17 Colorado State vs Utah State | W, 3-0",
 "Upcoming Oct 22, 7:30 PM Colorado State at Washington State | ",
 "Upcoming Oct 24, 12:00 PM Colorado State at Boise State | ",
 "Upcoming Oct 29, 7:00 PM Colorado State at Fresno State | ",
 "Upcoming Oct 31, 1:00 PM Colorado State at Oregon State | ",
 "Upcoming Nov 5, 6:00 PM Colorado State vs Gonzaga | ",
 "Upcoming Nov 7, 12:00 PM Colorado State vs Boise State | ",
 "Upcoming Nov 12, 6:00 PM Colorado State vs Fresno State | ",
 "Upcoming Nov 14, 1:00 PM Colorado State at San Diego State | ",
 "Upcoming Nov 17, 6:00 PM Colorado State vs Texas State | ",
 "Upcoming Nov 23 Colorado State vs Pac-12 Championship Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf cards: women's place in the field with the rounds and total ("11th of
// 16 Teams;" and "297-303-304 | 904"), men's place, rounds and total ("5th -
// 289-288-278--855"). Mutation: without the rules the Badger Invitational
// read an individual's "T33rd" from its story and the men's finals "Completed".
{
  const results=(slug,name)=>parse('Golf',slug).find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('womens-golf','Badger Invitational'),['Result: 11th of 16','Team score: 904 (297-303-304)']);
  assert.deepEqual(results('womens-golf','Ron Moore Intercollegiate'),['Result: 12th of 15','Team score: 894 (304-292-298)']);
  assert.deepEqual(results('mens-golf','Ram Masters Invitational'),['Result: 5th','Team score: 855 (289-288-278)']);
}
// Rankings without a mark ("11/13 BYU", "No 13 Colorado") are not names.
assert.ok(parse('Football','football').some(e=>e.opponent==='BYU'&&e.display_time==='Sep 19'));
assert.ok(parse('Soccer','womens-soccer').some(e=>e.opponent==='Colorado'&&e.display_time==='Aug 12'));

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Colorado State module checks passed');
