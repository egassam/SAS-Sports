import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {grandCanyonSchool} from '../src/schools/grand-canyon.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='grand-canyon');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,grandCanyonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/grand-canyon-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gculopes.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['grand-canyon'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',grandCanyonSchool.scheduleUrls],['roster',grandCanyonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('grand-canyon|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gculopes.com',`${key} must stay on gculopes.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gculopes.com/sports/baseball/schedule"],"roster":["https://gculopes.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gculopes.com/sports/mens-basketball/schedule","https://gculopes.com/sports/womens-basketball/schedule"],"roster":["https://gculopes.com/sports/mens-basketball/roster","https://gculopes.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gculopes.com/sports/womens-beach-volleyball/schedule"],"roster":["https://gculopes.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gculopes.com/sports/mens-cross-country/schedule"],"roster":["https://gculopes.com/sports/mens-cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gculopes.com/sports/womens-golf/schedule","https://gculopes.com/sports/mens-golf/schedule"],"roster":["https://gculopes.com/sports/womens-golf/roster","https://gculopes.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gculopes.com/sports/womens-soccer/schedule","https://gculopes.com/sports/mens-soccer/schedule"],"roster":["https://gculopes.com/sports/womens-soccer/roster","https://gculopes.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gculopes.com/sports/softball/schedule"],"roster":["https://gculopes.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gculopes.com/sports/womens-swimming-and-diving/schedule","https://gculopes.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gculopes.com/sports/womens-swimming-and-diving/roster","https://gculopes.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gculopes.com/sports/womens-tennis/schedule","https://gculopes.com/sports/mens-tennis/schedule"],"roster":["https://gculopes.com/sports/womens-tennis/roster","https://gculopes.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gculopes.com/sports/track-and-field/schedule"],"roster":["https://gculopes.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gculopes.com/sports/womens-volleyball/schedule"],"roster":["https://gculopes.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'grand-canyon|"+sport+"':"),`${sport} routes must live in the Grand Canyon module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gculopes.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.grandCanyonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=grand-canyon)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 11:00 AM Grand Canyon vs South Mountain CC (Exhibition) | ",
 "Upcoming Oct 30, 3:00 PM Grand Canyon vs Central Arizona College (Exhibition) | ",
 "Upcoming Nov 6, 3:00 PM Grand Canyon vs Cochise College (Exhibition) | ",
 "Upcoming Mar 25 Grand Canyon at Hawai'i | ",
 "Upcoming Mar 26 Grand Canyon at Hawai'i | ",
 "Upcoming Mar 27 Grand Canyon at Hawai'i | ",
 "Upcoming Apr 2 Grand Canyon vs San José State | ",
 "Upcoming Apr 3 Grand Canyon vs San José State | ",
 "Upcoming Apr 4 Grand Canyon vs San José State | ",
 "Upcoming Apr 9 Grand Canyon vs UC Davis | ",
 "Upcoming Apr 10 Grand Canyon vs UC Davis | ",
 "Upcoming Apr 11 Grand Canyon vs UC Davis | ",
 "Upcoming Apr 16 Grand Canyon at Utah Tech | ",
 "Upcoming Apr 17 Grand Canyon at Utah Tech | ",
 "Upcoming Apr 18 Grand Canyon at Utah Tech | ",
 "Upcoming Apr 30 Grand Canyon vs Nevada | ",
 "Upcoming May 1 Grand Canyon vs Nevada | ",
 "Upcoming May 2 Grand Canyon vs Nevada | ",
 "Upcoming May 7 Grand Canyon at UNLV | ",
 "Upcoming May 8 Grand Canyon at UNLV | ",
 "Upcoming May 9 Grand Canyon at UNLV | ",
 "Upcoming May 14 Grand Canyon at Air Force | ",
 "Upcoming May 15 Grand Canyon at Air Force | ",
 "Upcoming May 16 Grand Canyon at Air Force | ",
 "Upcoming May 20 Grand Canyon vs New Mexico | ",
 "Upcoming May 21 Grand Canyon vs New Mexico | ",
 "Upcoming May 22 Grand Canyon vs New Mexico | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · Grand Canyon vs Western New Mexico (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Grand Canyon vs Texas Southern | ",
 "Upcoming Nov 7, 6:00 PM Men's · Grand Canyon vs Bethune-Cookman | ",
 "Upcoming Nov 11, 7:00 PM Men's · Grand Canyon vs Cal Poly | ",
 "Upcoming Nov 14, 6:00 PM Men's · Grand Canyon vs Louisiana Monroe | ",
 "Upcoming Nov 24, 7:30 PM Men's · Grand Canyon vs Saint Louis | ",
 "Upcoming Nov 25 Men's · Grand Canyon vs Stanford or Colorado | ",
 "Upcoming Nov 29, 6:00 PM Men's · Grand Canyon vs Incarnate Word | ",
 "Upcoming Dec 2, 6:00 PM Men's · Grand Canyon at Oklahoma State | ",
 "Upcoming Dec 5, 6:00 PM Men's · Grand Canyon vs Santa Clara | ",
 "Upcoming Dec 8, 7:00 PM Men's · Grand Canyon vs Northwestern State | ",
 "Upcoming Dec 11, 6:00 PM Men's · Grand Canyon at Memphis | ",
 "Upcoming Dec 18, 4:00 PM Men's · Grand Canyon vs Florida | ",
 "Upcoming Dec 22, 6:00 PM Men's · Grand Canyon vs UMBC | ",
 "Upcoming Dec 29, 6:00 PM Men's · Grand Canyon vs Justice | ",
 "Upcoming Jan 2, 6:00 PM Men's · Grand Canyon at UC Davis | ",
 "Upcoming Jan 5, 8:30 PM Men's · Grand Canyon vs UNLV | ",
 "Upcoming Jan 9, 2:30 PM Men's · Grand Canyon vs Wyoming | ",
 "Upcoming Jan 13, 9:00 PM Men's · Grand Canyon at San José State | ",
 "Upcoming Jan 16, 8:00 PM Men's · Grand Canyon at Nevada | ",
 "Upcoming Jan 20, 6:00 PM Men's · Grand Canyon vs Hawai'i | ",
 "Upcoming Jan 23, 2:30 PM Men's · Grand Canyon at New Mexico | ",
 "Upcoming Jan 27, 8:30 PM Men's · Grand Canyon vs Air Force | ",
 "Upcoming Jan 30, 8:00 PM Men's · Grand Canyon at Wyoming | ",
 "Upcoming Feb 6, 4:30 PM Men's · Grand Canyon vs New Mexico | ",
 "Upcoming Feb 9, 8:00 PM Men's · Grand Canyon at UTEP | ",
 "Upcoming Feb 13, 2:00 PM Men's · Grand Canyon vs Nevada | ",
 "Upcoming Feb 16, 8:00 PM Men's · Grand Canyon at Air Force | ",
 "Upcoming Feb 20, 6:00 PM Men's · Grand Canyon at UNLV | ",
 "Upcoming Feb 23, 8:00 PM Men's · Grand Canyon vs UTEP | ",
 "Upcoming Feb 26, 9:00 PM Men's · Grand Canyon vs San José State | ",
 "Upcoming Mar 3, 9:00 PM Men's · Grand Canyon at Hawai'i | ",
 "Upcoming Mar 6, 1:00 PM Men's · Grand Canyon vs UC Davis | ",
 "Upcoming Mar 10 Men's · Grand Canyon at Mountain West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 3:00 PM Women's · Grand Canyon vs Utah State (Exhibition) | ",
 "Upcoming Nov 4, 6:00 PM Women's · Grand Canyon vs Jackson State | ",
 "Upcoming Nov 9, 8:00 PM Women's · Grand Canyon vs Oregon | ",
 "Upcoming Nov 13, 6:00 PM Women's · Grand Canyon vs Gonzaga | ",
 "Upcoming Nov 17, 8:00 PM Women's · Grand Canyon at Santa Clara | ",
 "Upcoming Nov 21, 4:00 PM Women's · Grand Canyon at SMU | ",
 "Upcoming Nov 23, 1:00 PM Women's · Grand Canyon vs High Point | ",
 "Upcoming Nov 25, 1:00 PM Women's · Grand Canyon vs Winthrop | ",
 "Upcoming Nov 30, 7:00 PM Women's · Grand Canyon at San Francisco | ",
 "Upcoming Dec 3, 5:00 PM Women's · Grand Canyon vs Georgia State | ",
 "Upcoming Dec 7, 6:00 PM Women's · Grand Canyon vs Southeast Missouri State | ",
 "Upcoming Dec 10, 3:00 PM Women's · Grand Canyon at St. Thomas | ",
 "Upcoming Dec 19, 2:00 PM Women's · Grand Canyon at Northern Arizona | ",
 "Upcoming Dec 30 Women's · Grand Canyon at San José State | ",
 "Upcoming Jan 2 Women's · Grand Canyon at Air Force | ",
 "Upcoming Jan 6, 6:00 PM Women's · Grand Canyon vs New Mexico | ",
 "Upcoming Jan 9 Women's · Grand Canyon at UC Davis | ",
 "Upcoming Jan 13, 6:00 PM Women's · Grand Canyon vs UTEP | ",
 "Upcoming Jan 16, 1:00 PM Women's · Grand Canyon vs Wyoming | ",
 "Upcoming Jan 23, 1:00 PM Women's · Grand Canyon vs Hawai'i | ",
 "Upcoming Jan 27 Women's · Grand Canyon at Nevada | ",
 "Upcoming Jan 30, 1:00 PM Women's · Grand Canyon vs UC Davis | ",
 "Upcoming Feb 3 Women's · Grand Canyon at UNLV | ",
 "Upcoming Feb 6 Women's · Grand Canyon at New Mexico | ",
 "Upcoming Feb 10, 6:00 PM Women's · Grand Canyon vs San José State | ",
 "Upcoming Feb 13 Women's · Grand Canyon at Hawai'i | ",
 "Upcoming Feb 17, 6:00 PM Women's · Grand Canyon vs Nevada | ",
 "Upcoming Feb 21, 1:00 PM Women's · Grand Canyon vs UNLV | ",
 "Upcoming Feb 24 Women's · Grand Canyon at UTEP | ",
 "Upcoming Feb 27, 7:00 PM Women's · Grand Canyon at Wyoming | ",
 "Upcoming Mar 2, 6:00 PM Women's · Grand Canyon vs Air Force | ",
 "Upcoming Mar 7 Women's · Grand Canyon at Mountain West Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 30 Grand Canyon at Arizona State | ",
 "Upcoming Nov 6 Grand Canyon at AVCA Fall National Championships | ",
 "Upcoming Nov 7 Grand Canyon at GCU Fall Tournament | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 2 Grand Canyon at George Kyte Classic | Women's team: 2nd / Men's team: 4th",
 "Final Sep 19 Grand Canyon at Riverside Invitational | Women's team: 10th / Men's team: 7th",
 "Final Oct 3 Grand Canyon at Cougar Challenge | Women's team: 2nd / Men's team: 5th",
 "Final Oct 17 Grand Canyon at Highlander Invite | Women's team: 3rd / Men's team: 2nd",
 "Upcoming Oct 30 Grand Canyon at Mountain West Cross Country Championships | ",
 "Upcoming Nov 13 Grand Canyon at NCAA West Regional | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Grand Canyon at Leadership and Design Invitational | 17th of 17",
 "Final Sep 21 Women's · Grand Canyon at Kalispel Invitational | 2nd of 14",
 "Final Oct 5 Women's · Grand Canyon at Pat Lesser Harbottle Invitational | T2nd of 17",
 "Final Oct 19 Women's · Grand Canyon at Rainbow Wahine Invitational | 7th of 14",
 "Upcoming Oct 26 Women's · Grand Canyon at Pat Bradley Invitational | ",
 "Upcoming Feb 8 Women's · Grand Canyon at Arizona Thunderbird Intercollegiate | ",
 "Upcoming Feb 13 Women's · Grand Canyon at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Mar 2 Women's · Grand Canyon at GCU Invitational | ",
 "Upcoming Mar 12 Women's · Grand Canyon at Red Rocks Invitational | ",
 "Upcoming Mar 22 Women's · Grand Canyon at Bell Bank Pay it Forward Collegiate | ",
 "Upcoming Apr 6 Women's · Grand Canyon at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 20 Women's · Grand Canyon at Mountain West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 20 Men's · Grand Canyon at 2nd Swing Gopher Invitational | 9th of 15",
 "Final Sep 25 Men's · Grand Canyon at William H. Tucker Invitational | 8th of 15",
 "Final Oct 12 Men's · Grand Canyon at The Bryson Invitational | 6th of 12",
 "Final Oct 19 Men's · Grand Canyon at Saint Mary's Invitational | 6th of 18",
 "Upcoming Oct 26 Men's · Grand Canyon at The Preserve Golf Club Collegiate | ",
 "Upcoming Feb 11 Men's · Grand Canyon at John A. Burns Intercollegiate | ",
 "Upcoming Feb 22 Men's · Grand Canyon at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 15 Men's · Grand Canyon at Thunderbird Intercollegiate | ",
 "Upcoming Mar 22 Men's · Grand Canyon at Admired Leadership Showcase | ",
 "Upcoming Mar 29 Men's · Grand Canyon at Cowboy Classic | ",
 "Upcoming Apr 9 Men's · Grand Canyon at El Macero Classic | ",
 "Upcoming Apr 27 Men's · Grand Canyon at Mountain West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Grand Canyon vs Arizona | W, 2-0",
 "Final Aug 20 Women's · Grand Canyon vs Buffalo | W, 2-0",
 "Final Aug 23 Women's · Grand Canyon vs Texas | L, 0-1",
 "Final Aug 27 Women's · Grand Canyon vs CSUN | W, 3-0",
 "Final Aug 30 Women's · Grand Canyon at UC Irvine | T, 1-1",
 "Final Sep 6 Women's · Grand Canyon vs Long Beach State | T, 1-1",
 "Final Sep 10 Women's · Grand Canyon at Idaho | L, 0-1",
 "Final Sep 13 Women's · Grand Canyon at Eastern Washington | W, 2-0",
 "Final Sep 17 Women's · Grand Canyon vs Northern Arizona | T, 1-1",
 "Final Sep 27 Women's · Grand Canyon vs UNLV | T, 1-1",
 "Final Oct 3 Women's · Grand Canyon vs New Mexico | W, 2-1",
 "Final Oct 7 Women's · Grand Canyon at UC Davis | L, 0-3",
 "Final Oct 11 Women's · Grand Canyon at Air Force | L, 0-1",
 "Final Oct 15 Women's · Grand Canyon vs Nevada | W, 3-1",
 "Final Oct 18 Women's · Grand Canyon vs San José State | W, 1-0",
 "Upcoming Oct 24, 6:00 PM Women's · Grand Canyon at Hawai'i | ",
 "Upcoming Oct 28, 7:00 PM Women's · Grand Canyon vs Wyoming | ",
 "Upcoming Nov 1, 1:00 PM Women's · Grand Canyon at Colorado College | ",
 "Upcoming Nov 6, 7:00 PM Women's · Grand Canyon at UTEP | ",
 "Upcoming Nov 11 Women's · Grand Canyon at Mountain West Championship Semifinal | ",
 "Upcoming Nov 14 Women's · Grand Canyon at Mountain West Championship Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Grand Canyon at Stanford | L, 1-2",
 "Final Aug 23 Men's · Grand Canyon at Sacramento State | W, 1-0",
 "Final Aug 28 Men's · Grand Canyon vs UC Riverside | L, 0-2",
 "Final Sep 3 Men's · Grand Canyon vs Oakland | W, 7-2",
 "Final Sep 7 Men's · Grand Canyon vs Houston Christian | L, 0-1",
 "Final Sep 12 Men's · Grand Canyon vs UC Santa Barbara | L, 1-2",
 "Final Sep 16 Men's · Grand Canyon vs California Baptist | L, 0-1",
 "Final Sep 20 Men's · Grand Canyon at CSUN | W, 2-1",
 "Final Sep 26 Men's · Grand Canyon vs UNLV | W, 2-1",
 "Final Sep 30 Men's · Grand Canyon at Utah Tech | W, 3-1",
 "Final Oct 4 Men's · Grand Canyon vs San José State | W, 2-1",
 "Final Oct 10 Men's · Grand Canyon at UC Davis | W, 3-1",
 "Final Oct 14 Men's · Grand Canyon vs Air Force | W, 2-0",
 "Final Oct 18 Men's · Grand Canyon vs Utah Tech | W, 2-0",
 "Upcoming Oct 23, 7:00 PM Men's · Grand Canyon at UNLV | ",
 "Upcoming Oct 28, 7:00 PM Men's · Grand Canyon at San José State | ",
 "Upcoming Nov 1, 7:00 PM Men's · Grand Canyon vs UC Davis | ",
 "Upcoming Nov 6, 6:00 PM Men's · Grand Canyon at Air Force | ",
 "Upcoming Nov 10 Men's · Grand Canyon at Mountain West Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 8:30 AM Grand Canyon vs Salt Lake CC | ",
 "Upcoming Oct 24, 12:00 PM Grand Canyon vs California Baptist | ",
 "Upcoming Oct 25, 10:00 AM Grand Canyon at College of Southern Nevada | ",
 "Upcoming Oct 27, 6:30 PM Grand Canyon vs Arizona State | ",
 "Upcoming Oct 31, 12:00 PM Grand Canyon at Arizona | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · Grand Canyon at MPSF Open Water Championships | Completed",
 "Upcoming Oct 23 Women's · Grand Canyon at Hawai'i | ",
 "Upcoming Oct 31, 11:00 AM Women's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Oct 31, 11:00 AM Women's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Oct 31, 11:00 AM Women's · Grand Canyon vs Washington State | ",
 "Upcoming Nov 6, 4:00 PM Women's · Grand Canyon vs Air Force | ",
 "Upcoming Nov 19 Women's · Grand Canyon at Northern Arizona | ",
 "Upcoming Dec 2 Women's · Grand Canyon at Oakland Golden Grizzly Classic | ",
 "Upcoming Dec 12, 1:00 PM Women's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Dec 12, 1:00 PM Women's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Jan 2 Women's · Grand Canyon vs Simon Fraser | ",
 "Upcoming Jan 9 Women's · Grand Canyon at Arizona State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Jan 16, 1:00 PM Women's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Jan 16, 1:00 PM Women's · Grand Canyon vs San Diego State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Grand Canyon vs California Baptist | ",
 "Upcoming Jan 30 Women's · Grand Canyon at UNLV | ",
 "Upcoming Jan 30 Women's · Grand Canyon vs UC Davis | ",
 "Upcoming Feb 16 Women's · Grand Canyon at Mountain West Championships | ",
 "Upcoming Mar 6 Women's · Grand Canyon vs CSCAA/NCAA Last Chance | ",
 "Upcoming Mar 8 Women's · Grand Canyon at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 11 Women's · Grand Canyon at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17 Women's · Grand Canyon at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 17 Men's · Grand Canyon at MPSF Open Water Championships | Completed",
 "Upcoming Oct 23 Men's · Grand Canyon at Hawai'i | ",
 "Upcoming Oct 31, 11:00 AM Men's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Oct 31, 11:00 AM Men's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Nov 6, 4:00 PM Men's · Grand Canyon vs Air Force | ",
 "Upcoming Nov 19 Men's · Grand Canyon at Northern Arizona | ",
 "Upcoming Dec 2 Men's · Grand Canyon at Oakland Golden Grizzly Classic | ",
 "Upcoming Dec 12, 1:00 PM Men's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Dec 12, 1:00 PM Men's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Jan 2 Men's · Grand Canyon vs Simon Fraser | ",
 "Upcoming Jan 9 Men's · Grand Canyon at Arizona State | ",
 "Upcoming Jan 16, 1:00 PM Men's · Grand Canyon vs Arizona Christian | ",
 "Upcoming Jan 16, 1:00 PM Men's · Grand Canyon vs Ottawa (Ariz.) | ",
 "Upcoming Jan 30 Men's · Grand Canyon at UNLV | ",
 "Upcoming Jan 30 Men's · Grand Canyon vs UC Davis | ",
 "Upcoming Feb 16 Men's · Grand Canyon at Mountain West Championships | ",
 "Upcoming Mar 6 Men's · Grand Canyon vs CSCAA/NCAA Last Chance | ",
 "Upcoming Mar 8 Men's · Grand Canyon at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 11 Men's · Grand Canyon at CSCAA National Invitational Championships | ",
 "Upcoming Mar 24 Men's · Grand Canyon at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 17 Women's · Grand Canyon at ITA All-American Championships | Completed",
 "Final Sep 24 Women's · Grand Canyon at USTA Collegiate Invite | Completed",
 "Final Sep 28 Women's · Grand Canyon at UTR PTT 25K Newport Beach | Completed",
 "Final Oct 15 Women's · Grand Canyon at ITA Southwest Regionals | Completed",
 "Today Oct 19 Women's · Grand Canyon at UTR Pro Fall Slam Newport Beach | ",
 "Today Oct 21 Women's · Grand Canyon at Mountain West Fall Qualifier | ",
 "Upcoming Oct 30 Women's · Grand Canyon at Thunderbird Classic | ",
 "Upcoming Nov 2 Women's · Grand Canyon at UTR Pro Fall Slam Newport Beach | ",
 "Upcoming Nov 5 Women's · Grand Canyon at ITA Masters Championships | ",
 "Upcoming Nov 5 Women's · Grand Canyon at ITA Sectional Championships | ",
 "Upcoming Nov 6 Women's · Grand Canyon at UNLV Invite | ",
 "Upcoming Nov 13 Women's · Grand Canyon at Wildcat Invite | ",
 "Upcoming Nov 17 Women's · Grand Canyon at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Grand Canyon at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Grand Canyon at Sherwood Cup | Completed",
 "Final Sep 28 Men's · Grand Canyon at Newport PTT 25k | Completed",
 "Final Oct 2 Men's · Grand Canyon at San Diego Veterans Classic | Completed",
 "Final Oct 5 Men's · Grand Canyon at UTR Pro Fall Slam | Completed",
 "Final Oct 5 Men's · Grand Canyon at Las Vegas 75k Challenger | Completed",
 "Final Oct 12 Men's · Grand Canyon at Newport PTT 25k | Completed",
 "Final Oct 15 Men's · Grand Canyon at ITA Southwest Regionals | Completed",
 "Today Oct 19 Men's · Grand Canyon at UTR Pro Fall Slam Newport Beach | ",
 "Today Oct 21 Men's · Grand Canyon at Mountain West Fall Qualifier | ",
 "Upcoming Oct 30 Men's · Grand Canyon at Ralston/Neufeld Coaches Challenge | ",
 "Upcoming Oct 30 Men's · Grand Canyon at Jack Kramer Invitational | ",
 "Upcoming Nov 2 Men's · Grand Canyon at UTR Pro Fall Slam | ",
 "Upcoming Nov 5 Men's · Grand Canyon at ITA Master Championships | ",
 "Upcoming Nov 5 Men's · Grand Canyon at ITA Sectional Championships | ",
 "Upcoming Nov 6 Men's · Grand Canyon at GCU Hidden Duals | ",
 "Upcoming Nov 6 Men's · Grand Canyon at ITA Masters Championships | ",
 "Upcoming Nov 17 Men's · Grand Canyon at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Grand Canyon at Texas A&M | L, 1-3",
 "Final Aug 28 Grand Canyon vs Cal Poly | L, 0-3",
 "Final Aug 29 Grand Canyon vs Arkansas State | W, 3-0",
 "Final Sep 4 Grand Canyon vs Louisiana Monroe | W, 3-0",
 "Final Sep 5 Grand Canyon vs San Francisco | L, 0-3",
 "Final Sep 6 Grand Canyon vs Temple | W, 3-1",
 "Final Sep 10 Grand Canyon vs UC Riverside | W, 3-1",
 "Final Sep 11 Grand Canyon at Northern Arizona | W, 3-2",
 "Final Sep 12 Grand Canyon vs Omaha | L, 2-3",
 "Final Sep 19 Grand Canyon vs Ole Miss | W, 3-1",
 "Final Sep 20 Grand Canyon at Kansas | L, 0-3",
 "Final Sep 24 Grand Canyon at Nevada | L, 2-3",
 "Final Sep 25 Grand Canyon at Nevada | W, 3-2",
 "Final Oct 2 Grand Canyon vs Hawai'i | L, 0-3",
 "Final Oct 3 Grand Canyon vs Hawai'i | L, 0-3",
 "Final Oct 8 Grand Canyon at UNLV | L, 0-3",
 "Final Oct 10 Grand Canyon vs UNLV | W, 3-2",
 "Final Oct 15 Grand Canyon at Air Force | W, 3-1",
 "Final Oct 16 Grand Canyon at Air Force | L, 2-3",
 "Today Oct 22, 6:00 PM Grand Canyon vs Wyoming | ",
 "Upcoming Oct 24, 1:00 PM Grand Canyon vs Wyoming | ",
 "Upcoming Oct 29, 5:30 PM Grand Canyon at New Mexico | ",
 "Upcoming Oct 31, 12:00 PM Grand Canyon at New Mexico | ",
 "Upcoming Nov 5, 6:00 PM Grand Canyon vs San José State | ",
 "Upcoming Nov 7, 11:30 AM Grand Canyon vs San José State | ",
 "Upcoming Nov 12, 6:00 PM Grand Canyon vs UTEP | ",
 "Upcoming Nov 14, 1:00 PM Grand Canyon vs UTEP | ",
 "Upcoming Nov 18, 7:00 PM Grand Canyon at UC Davis | ",
 "Upcoming Nov 19, 7:00 PM Grand Canyon at UC Davis | ",
 "Upcoming Nov 24 Grand Canyon at Mountain West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Grand Canyon module checks passed");
