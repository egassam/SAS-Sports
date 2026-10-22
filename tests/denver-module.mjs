import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {denverSchool} from '../src/schools/denver.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='denver');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,denverHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/denver-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit denverpioneers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['denver'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',denverSchool.scheduleUrls],['roster',denverSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('denver|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'denverpioneers.com',`${key} must stay on denverpioneers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://denverpioneers.com/sports/mens-basketball/schedule","https://denverpioneers.com/sports/womens-basketball/schedule"],"roster":["https://denverpioneers.com/sports/mens-basketball/roster","https://denverpioneers.com/sports/womens-basketball/roster"],"combined":true},"Golf":{"schedule":["https://denverpioneers.com/sports/womens-golf/schedule","https://denverpioneers.com/sports/mens-golf/schedule"],"roster":["https://denverpioneers.com/sports/womens-golf/roster","https://denverpioneers.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://denverpioneers.com/sports/womens-gymnastics/schedule"],"roster":["https://denverpioneers.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://denverpioneers.com/sports/mens-ice-hockey/schedule"],"roster":["https://denverpioneers.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://denverpioneers.com/sports/womens-lacrosse/schedule","https://denverpioneers.com/sports/mens-lacrosse/schedule"],"roster":["https://denverpioneers.com/sports/womens-lacrosse/roster","https://denverpioneers.com/sports/mens-lacrosse/roster"],"combined":true},"Skiing":{"schedule":["https://denverpioneers.com/sports/skiing/schedule"],"roster":["https://denverpioneers.com/sports/skiing/roster"],"combined":false},"Soccer":{"schedule":["https://denverpioneers.com/sports/womens-soccer/schedule","https://denverpioneers.com/sports/mens-soccer/schedule"],"roster":["https://denverpioneers.com/sports/womens-soccer/roster","https://denverpioneers.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://denverpioneers.com/sports/womens-swimming-and-diving/schedule","https://denverpioneers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://denverpioneers.com/sports/womens-swimming-and-diving/roster","https://denverpioneers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://denverpioneers.com/sports/womens-tennis/schedule","https://denverpioneers.com/sports/mens-tennis/schedule"],"roster":["https://denverpioneers.com/sports/womens-tennis/roster","https://denverpioneers.com/sports/mens-tennis/roster"],"combined":true},"Triathlon":{"schedule":["https://denverpioneers.com/sports/triathlon/schedule"],"roster":["https://denverpioneers.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://denverpioneers.com/sports/womens-volleyball/schedule"],"roster":["https://denverpioneers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'denver|"+sport+"':"),`${sport} routes must live in the Denver module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://denverpioneers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.denverHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=denver)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Men's · Denver at Wisconsin | ",
 "Upcoming Nov 7, 5:30 PM Men's · Denver at UC Riverside | ",
 "Upcoming Nov 14, 1:00 PM Men's · Denver vs Wyoming | ",
 "Upcoming Nov 16, 8:00 PM Men's · Denver vs UCCS | ",
 "Upcoming Nov 21, 11:00 AM Men's · Denver at Eastern Michigan | ",
 "Upcoming Nov 23, 6:00 PM Men's · Denver at Kansas | ",
 "Upcoming Nov 28, 1:00 PM Men's · Denver at New Mexico State | ",
 "Upcoming Dec 1, 7:00 PM Men's · Denver at Air Force | ",
 "Upcoming Dec 5, 2:00 PM Men's · Denver at SIUE | ",
 "Upcoming Dec 8, 4:30 PM Men's · Denver at Kansas City | ",
 "Upcoming Dec 9, 2:00 PM Men's · Denver vs Sam Houston State | ",
 "Upcoming Dec 11, 10:00 AM Men's · Denver at UTSA | ",
 "Upcoming Dec 14, 7:00 PM Men's · Denver at Utah Tech | ",
 "Upcoming Dec 16, 7:00 PM Men's · Denver vs Colorado Christian | ",
 "Upcoming Dec 19, 1:00 PM Men's · Denver vs Rice | ",
 "Upcoming Dec 29, 7:00 PM Men's · Denver at Colorado | ",
 "Upcoming Jan 2 Men's · Denver at San Francisco | ",
 "Upcoming Jan 6 Men's · Denver vs Saint Mary's | ",
 "Upcoming Jan 9 Men's · Denver vs Seattle | ",
 "Upcoming Jan 13 Men's · Denver at Pepperdine | ",
 "Upcoming Jan 16 Men's · Denver at San Diego | ",
 "Upcoming Jan 20 Men's · Denver vs Portland | ",
 "Upcoming Jan 27 Men's · Denver at Pacific | ",
 "Upcoming Jan 30 Men's · Denver at LMU | ",
 "Upcoming Feb 3 Men's · Denver vs San Francisco | ",
 "Upcoming Feb 6 Men's · Denver vs Pepperdine | ",
 "Upcoming Feb 10 Men's · Denver at Santa Clara | ",
 "Upcoming Feb 13 Men's · Denver vs Pacific | ",
 "Upcoming Feb 17 Men's · Denver at Portland | ",
 "Upcoming Feb 20 Men's · Denver at Seattle | ",
 "Upcoming Feb 24 Men's · Denver vs LMU | ",
 "Upcoming Feb 27 Men's · Denver vs San Diego | ",
 "Upcoming Mar 5 Men's · Denver at Credit Union 1 WCC Basketball Championship First Round | ",
 "Upcoming Mar 7 Men's · Denver at Credit Union 1 WCC Basketball Championship Quarterfinal | ",
 "Upcoming Mar 8 Men's · Denver at Credit Union 1 WCC Basketball Championship Semifinal | ",
 "Upcoming Mar 9 Men's · Denver at Credit Union 1 WCC Basketball Championship Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Denver at Air Force | ",
 "Upcoming Nov 4, 6:00 PM Women's · Denver vs Lindenwood | ",
 "Upcoming Nov 7, 4:00 PM Women's · Denver at Weber State | ",
 "Upcoming Nov 10, 6:00 PM Women's · Denver vs Colorado State | ",
 "Upcoming Nov 13 Women's · Denver at LSU | ",
 "Upcoming Nov 16, 5:00 PM Women's · Denver vs Regis | ",
 "Upcoming Nov 24, 6:00 PM Women's · Denver vs Northern Colorado | ",
 "Upcoming Nov 30, 6:00 PM Women's · Denver vs Colorado Christian | ",
 "Upcoming Dec 3, 6:00 PM Women's · Denver vs Colorado | ",
 "Upcoming Dec 6, 2:00 PM Women's · Denver at Utah | ",
 "Upcoming Dec 9, 6:00 PM Women's · Denver vs Nevada | ",
 "Upcoming Dec 13, 3:00 PM Women's · Denver at Cal State Fullerton | ",
 "Upcoming Dec 17, 6:00 PM Women's · Denver at Kansas City | ",
 "Upcoming Dec 22, 1:00 PM Women's · Denver vs Wyoming | ",
 "Upcoming Dec 31, 2:00 PM Women's · Denver vs Santa Clara | ",
 "Upcoming Jan 2 Women's · Denver vs Pacific | ",
 "Upcoming Jan 7 Women's · Denver at Seattle | ",
 "Upcoming Jan 9 Women's · Denver at Portland | ",
 "Upcoming Jan 14 Women's · Denver vs Pepperdine | ",
 "Upcoming Jan 16 Women's · Denver vs San Diego | ",
 "Upcoming Jan 21 Women's · Denver at Santa Clara | ",
 "Upcoming Jan 23 Women's · Denver at Saint Mary's | ",
 "Upcoming Jan 28 Women's · Denver vs Seattle | ",
 "Upcoming Jan 30 Women's · Denver vs Portland | ",
 "Upcoming Feb 4 Women's · Denver at LMU | ",
 "Upcoming Feb 6 Women's · Denver at San Diego | ",
 "Upcoming Feb 11 Women's · Denver at Pepperdine | ",
 "Upcoming Feb 13 Women's · Denver vs San Francisco | ",
 "Upcoming Feb 18 Women's · Denver vs LMU | ",
 "Upcoming Feb 20 Women's · Denver at Pacific | ",
 "Upcoming Feb 25 Women's · Denver vs Saint Mary's | ",
 "Upcoming Feb 27 Women's · Denver at San Francisco | ",
 "Upcoming Mar 5 Women's · Denver at Credit Union 1 WCC Basketball Championship First Round | ",
 "Upcoming Mar 6 Women's · Denver at Credit Union 1 WCC Basketball Championship Quarterfinal | ",
 "Upcoming Mar 8 Women's · Denver at Credit Union 1 WCC Basketball Championship Semifinal | ",
 "Upcoming Mar 9 Women's · Denver at Credit Union 1 WCC Basketball Championship Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Denver at Lady Redbird Invitational | 4th of 13",
 "Final Sep 21 Women's · Denver at Red Sky Classic Hosted by Golfweek | 10th of 20",
 "Final Oct 2 Women's · Denver at Ron Moore Intercollegiate | T5th of 15",
 "Final Oct 18 Women's · Denver at Jim West Challenge | 10th of 11",
 "Upcoming Feb 13 Women's · Denver at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Mar 9 Women's · Denver at Alamo Invitational | ",
 "Upcoming Mar 22 Women's · Denver at Bell Bank Pay it Forward Collegiate | ",
 "Upcoming Apr 11 Women's · Denver at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Denver at West Coast Conference Championship | ",
 "Upcoming May 10 Women's · Denver at NCAA Regional | ",
 "Upcoming May 21 Women's · Denver at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Denver at Ram Masters | 8th of 16",
 "Final Sep 19 Men's · Denver at Gene Miranda Falcon Invitational | T2nd of 18",
 "Final Sep 29 Men's · Denver at Mark Simpson Invitational | 5th of 17",
 "Final Oct 12 Men's · Denver at Visit Stockton Pacific Invitational | 6th of 18",
 "Upcoming Feb 16 Men's · Denver at Border Olympics | ",
 "Upcoming Feb 28 Men's · Denver at Loyola Intercollegiate | ",
 "Upcoming Mar 22 Men's · Denver at Bellbank Invitational | ",
 "Upcoming Apr 4 Men's · Denver at The Gaucho Invitational | ",
 "Upcoming Apr 18 Men's · Denver at Redhawk Invitational | ",
 "Upcoming Apr 30 Men's · Denver at West Coast Conference Championship | ",
 "Upcoming May 17 Men's · Denver at NCAA Regional | ",
 "Upcoming May 28 Men's · Denver at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Denver at Alaska Anchorage | W, 6-2",
 "Final Oct 3 Denver at Alaska Anchorage | W, 4-1",
 "Final Oct 10 Denver vs USA Hockey Under-18 Team (Exhibition) | W, 7-1",
 "Final Oct 16 Denver vs Michigan | L, 1-4",
 "Final Oct 17 Denver vs Michigan | L, 3-4",
 "Upcoming Oct 23, 7:00 PM Denver vs Boston College | ",
 "Upcoming Oct 24, 6:00 PM Denver vs Boston College | ",
 "Upcoming Oct 30, 7:00 PM Denver vs Omaha | ",
 "Upcoming Oct 31, 6:00 PM Denver vs Omaha | ",
 "Upcoming Nov 6, 7:00 PM Denver at Arizona State | ",
 "Upcoming Nov 8, 12:00 PM Denver at Arizona State | ",
 "Upcoming Nov 13, 7:00 PM Denver vs Lindenwood | ",
 "Upcoming Nov 14, 6:00 PM Denver vs Lindenwood | ",
 "Upcoming Nov 20, 7:00 PM Denver vs St. Thomas | ",
 "Upcoming Nov 21, 6:00 PM Denver vs St. Thomas | ",
 "Upcoming Nov 27, 4:00 PM Denver at Boston University | ",
 "Upcoming Nov 28, 4:00 PM Denver at Boston University | ",
 "Upcoming Dec 4, 7:00 PM Denver vs North Dakota | ",
 "Upcoming Dec 5, 6:00 PM Denver vs North Dakota | ",
 "Upcoming Dec 11, 6:00 PM Denver at St. Cloud State | ",
 "Upcoming Dec 12, 5:00 PM Denver at St. Cloud State | ",
 "Upcoming Jan 1, 5:00 PM Denver at Bowling Green | ",
 "Upcoming Jan 2, 4:00 PM Denver at Bowling Green | ",
 "Upcoming Jan 8, 5:00 PM Denver at Western Michigan | ",
 "Upcoming Jan 9, 4:00 PM Denver at Western Michigan | ",
 "Upcoming Jan 16, 6:00 PM Denver vs Colorado College | ",
 "Upcoming Jan 22, 6:00 PM Denver at Minnesota Duluth | ",
 "Upcoming Jan 23, 5:00 PM Denver at Minnesota Duluth | ",
 "Upcoming Jan 30, 6:00 PM Denver at Colorado College | ",
 "Upcoming Feb 5, 7:00 PM Denver vs Arizona State | ",
 "Upcoming Feb 6, 6:00 PM Denver vs Arizona State | ",
 "Upcoming Feb 12, 5:00 PM Denver at Miami | ",
 "Upcoming Feb 13, 4:00 PM Denver at Miami | ",
 "Upcoming Feb 19, 7:00 PM Denver vs St. Cloud State | ",
 "Upcoming Feb 20, 6:00 PM Denver vs St. Cloud State | ",
 "Upcoming Feb 26, 7:00 PM Denver vs Colorado College | ",
 "Upcoming Feb 27, 6:00 PM Denver at Colorado College | ",
 "Upcoming Mar 5 Denver vs NCHC Frozen Faceoff | ",
 "Upcoming Mar 12 Denver at NCHC Quarterfinal | ",
 "Upcoming Mar 13 Denver at NCHC Semifinals | ",
 "Upcoming Mar 19 Denver at NCHC Championship | ",
 "Upcoming Mar 25 Denver at NCAA Regionals | ",
 "Upcoming Apr 8 Denver at NCAA Frozen Four | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 23, 5:00 PM Women's · Denver vs Alumnae Game (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Mar 20, 12:00 PM Men's · Denver vs Jacksonville | "
]);
  const v_skiing=parse("Skiing","skiing");
  assert.deepEqual(v_skiing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Denver at Colorado State | L, 0-1",
 "Final Aug 20 Women's · Denver at DePaul | L, 1-2",
 "Final Aug 23 Women's · Denver at Northwestern | L, 0-1",
 "Final Aug 27 Women's · Denver vs Colorado College | T, 0-0",
 "Final Aug 30 Women's · Denver at Northern Colorado | T, 1-1",
 "Final Sep 6 Women's · Denver vs Montana | W, 2-0",
 "Final Sep 11 Women's · Denver at Colorado | L, 0-6",
 "Final Sep 17 Women's · Denver vs Air Force | L, 1-2",
 "Final Sep 26 Women's · Denver vs Saint Mary's | W, 2-1",
 "Final Oct 3 Women's · Denver at Santa Clara | L, 0-3",
 "Final Oct 7 Women's · Denver vs Pepperdine | L, 2-3",
 "Final Oct 11 Women's · Denver at San Diego | L, 2-3",
 "Final Oct 17 Women's · Denver vs Portland | T, 0-0",
 "Upcoming Oct 24, 2:00 PM Women's · Denver at San Francisco | ",
 "Upcoming Oct 28, 7:00 PM Women's · Denver at LMU | ",
 "Upcoming Oct 31, 3:00 PM Women's · Denver vs Pacific | ",
 "Upcoming Nov 7, 2:00 PM Women's · Denver at Seattle | ",
 "Upcoming Nov 11 Women's · Denver at West Coast Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Denver vs Cal Poly | T, 2-2",
 "Final Aug 23 Men's · Denver at Stanford | L, 1-3",
 "Final Aug 28 Men's · Denver at UCLA | L, 0-3",
 "Final Aug 31 Men's · Denver at Cal Baptist | L, 0-2",
 "Final Sep 4 Men's · Denver vs Tulsa | W, 3-0",
 "Final Sep 7 Men's · Denver at Indiana | L, 1-3",
 "Final Sep 11 Men's · Denver at West Virginia | L, 0-5",
 "Final Sep 22 Men's · Denver vs Creighton | L, 0-1",
 "Final Sep 26 Men's · Denver at San Diego | T, 0-0",
 "Final Oct 3 Men's · Denver vs LMU | W, 2-1",
 "Final Oct 10 Men's · Denver vs San Francisco | W, 2-1",
 "Final Oct 17 Men's · Denver at Portland | L, 2-3",
 "Final Oct 21 Men's · Denver at Saint Mary's | W, 3-2",
 "Upcoming Oct 24, 3:00 PM Men's · Denver vs Pacific | ",
 "Upcoming Oct 31, 8:00 PM Men's · Denver at Santa Clara | ",
 "Upcoming Nov 6, 6:00 PM Men's · Denver vs Seattle | ",
 "Upcoming Nov 11 Men's · Denver at West Coast Conference Tournament Semifinal | ",
 "Upcoming Nov 14 Men's · Denver at West Coast Conference Tournament Final | ",
 "Upcoming Nov 19 Men's · Denver at NCAA Tournament First Round | ",
 "Upcoming Nov 22 Men's · Denver at NCAA Tournament Second Round | ",
 "Upcoming Nov 28 Men's · Denver at Round of 16 | ",
 "Upcoming Dec 4 Men's · Denver at NCAA Tournament Quarterfinal | ",
 "Upcoming Dec 11 Men's · Denver at NCAA Tournament Semifinal | ",
 "Upcoming Dec 14 Men's · Denver at NCAA Tournament Final | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Denver at Front Range Invite | Completed",
 "Final Oct 16 Women's · Denver at Air Force | L, 129.5-170.5",
 "Final Oct 16 Women's · Denver vs Washington State | L, 144-150",
 "Upcoming Oct 23, 5:00 PM Women's · Denver at Pepperdine | ",
 "Upcoming Oct 23, 5:00 PM Women's · Denver at Seattle | ",
 "Upcoming Oct 30, 12:00 PM Women's · Denver vs Colorado State | ",
 "Upcoming Oct 31, 10:00 AM Women's · Denver vs Colorado Mesa | ",
 "Upcoming Dec 2 Women's · Denver at Minnesota Invite | ",
 "Upcoming Jan 2, 10:00 AM Women's · Denver vs Colorado School of Mines | ",
 "Upcoming Jan 8, 1:00 PM Women's · Denver at Saint Mary's | ",
 "Upcoming Jan 8, 1:00 PM Women's · Denver at Pacific | ",
 "Upcoming Jan 16, 10:00 AM Women's · Denver vs Wyoming | ",
 "Upcoming Jan 28 Women's · Denver at Air Force Diving Invite | ",
 "Upcoming Jan 30, 10:00 AM Women's · Denver vs Air Force | ",
 "Upcoming Feb 5, 11:00 AM Women's · Denver at First Chance Invitational | ",
 "Upcoming Feb 17 Women's · Denver at MPSF Championships | ",
 "Upcoming Mar 8 Women's · Denver at NCAA Zone E Diving | ",
 "Upcoming Mar 11 Women's · Denver at NICs | ",
 "Upcoming Mar 17 Women's · Denver at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Denver at Front Range Invite | Completed",
 "Final Oct 16 Men's · Denver at Air Force | L, 131-163",
 "Upcoming Oct 23, 5:00 PM Men's · Denver at Pepperdine | ",
 "Upcoming Oct 23, 5:00 PM Men's · Denver at Seattle | ",
 "Upcoming Oct 31, 10:00 AM Men's · Denver vs Colorado Mesa | ",
 "Upcoming Dec 2 Men's · Denver at Minnesota Invite | ",
 "Upcoming Jan 2, 10:00 AM Men's · Denver vs Colorado School of Mines | ",
 "Upcoming Jan 8, 1:00 PM Men's · Denver at Saint Mary's | ",
 "Upcoming Jan 8, 1:00 PM Men's · Denver at Pacific | ",
 "Upcoming Jan 16, 10:00 AM Men's · Denver vs Wyoming | ",
 "Upcoming Jan 28 Men's · Denver at Air Force Diving Invite | ",
 "Upcoming Jan 30, 10:00 AM Men's · Denver vs Air Force | ",
 "Upcoming Feb 5, 11:00 AM Men's · Denver at First Chance Invitational | ",
 "Upcoming Feb 22 Men's · Denver at MPSF Championships | ",
 "Upcoming Mar 8 Men's · Denver at NCAA Zone E Diving | ",
 "Upcoming Mar 11 Men's · Denver at NICs | ",
 "Upcoming Mar 24 Men's · Denver at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Denver at Husker Invitational | Completed",
 "Final Oct 13 Women's · Denver at ITA Mountain Regional Championships | Completed",
 "Upcoming Oct 23 Women's · Denver at Colorado Cup | ",
 "Upcoming Nov 6 Women's · Denver at Aztec Fall Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Denver at Bedford Cup in the Mountains | Completed",
 "Final Oct 6 Men's · Denver at ITA Mountain Regional Championships | Completed",
 "Upcoming Oct 30 Men's · Denver at Colorado Cup | ",
 "Upcoming Nov 5 Men's · Denver at ITA Sectional Championship | ",
 "Upcoming Nov 6 Men's · Denver at Grand Canyon Hidden Duals | ",
 "Upcoming Nov 13 Men's · Denver at LMU Hidden Duals | ",
 "Upcoming Nov 17 Men's · Denver at NCAA Division I Singles Championships | "
]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 5 Denver at Southern Hills Triathlon | 4th (236)",
 "Final Sep 27 Denver at Desert's Edge Triathlon | 4th (218)",
 "Final Oct 4 Denver at Navy Collegiate Cup | 6th (160)",
 "Final Oct 18 Denver at Western Regional Championships | 5th (614)",
 "Upcoming Nov 8 Denver at Collegiate National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Denver vs Central Arkansas | W, 3-1",
 "Final Aug 29 Denver vs Cal State Northridge | W, 3-2",
 "Final Aug 30 Denver at Colorado | L, 0-3",
 "Final Sep 3 Denver vs SIUE | W, 3-1",
 "Final Sep 4 Denver vs Idaho | W, 3-1",
 "Final Sep 5 Denver vs Marist | W, 3-1",
 "Final Sep 10 Denver vs Texas A&M Corpus Christi | L, 2-3",
 "Final Sep 11 Denver at Tarleton State | L, 2-3",
 "Final Sep 12 Denver vs Sam Houston | W, 3-0",
 "Final Sep 16 Denver vs Air Force | W, 3-0",
 "Final Sep 17 Denver at Northern Colorado | L, 0-3",
 "Final Sep 18 Denver vs Utah | L, 0-3",
 "Final Sep 24 Denver vs Pacific | W, 3-0",
 "Final Sep 26 Denver vs Saint Mary's | L, 1-3",
 "Final Oct 3 Denver at San Diego | L, 0-3",
 "Final Oct 8 Denver vs Pepperdine | L, 0-3",
 "Final Oct 10 Denver vs LMU | L, 2-3",
 "Final Oct 15 Denver at Portland | W, 3-2",
 "Final Oct 17 Denver at Seattle | W, 3-0",
 "Today Oct 22, 7:30 PM Denver at Saint Mary's | ",
 "Upcoming Oct 24, 2:00 PM Denver at Pacific | ",
 "Upcoming Oct 29, 6:00 PM Denver vs Santa Clara | ",
 "Upcoming Oct 31, 12:00 PM Denver vs San Francisco | ",
 "Upcoming Nov 7, 12:00 PM Denver vs San Diego | ",
 "Upcoming Nov 12, 7:00 PM Denver at LMU | ",
 "Upcoming Nov 14, 1:00 PM Denver at Pepperdine | ",
 "Upcoming Nov 19, 6:00 PM Denver vs Seattle | ",
 "Upcoming Nov 21, 1:00 PM Denver vs Portland | ",
 "Upcoming Nov 23, 7:00 PM Denver at San Francisco | ",
 "Upcoming Nov 25, 3:00 PM Denver at Santa Clara | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_skiing,"Skiing skiing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Denver module checks passed");
