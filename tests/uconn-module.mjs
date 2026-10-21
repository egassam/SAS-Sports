import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uconnSchool} from '../src/schools/uconn.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uconn');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uconnHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uconn-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uconnhuskies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uconn'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',uconnSchool.scheduleUrls],['roster',uconnSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uconn|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uconnhuskies.com',`${key} must stay on uconnhuskies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uconnhuskies.com/sports/baseball/schedule"],"roster":["https://uconnhuskies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uconnhuskies.com/sports/mens-basketball/schedule","https://uconnhuskies.com/sports/womens-basketball/schedule"],"roster":["https://uconnhuskies.com/sports/mens-basketball/roster","https://uconnhuskies.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uconnhuskies.com/sports/womens-cross-country/schedule"],"roster":["https://uconnhuskies.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://uconnhuskies.com/sports/field-hockey/schedule"],"roster":["https://uconnhuskies.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://uconnhuskies.com/sports/football/schedule"],"roster":["https://uconnhuskies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uconnhuskies.com/sports/mens-golf/schedule"],"roster":["https://uconnhuskies.com/sports/mens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://uconnhuskies.com/sports/mens-ice-hockey/schedule","https://uconnhuskies.com/sports/womens-ice-hockey/schedule"],"roster":["https://uconnhuskies.com/sports/mens-ice-hockey/roster","https://uconnhuskies.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://uconnhuskies.com/sports/womens-lacrosse/schedule"],"roster":["https://uconnhuskies.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://uconnhuskies.com/sports/womens-rowing/schedule"],"roster":["https://uconnhuskies.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://uconnhuskies.com/sports/womens-soccer/schedule","https://uconnhuskies.com/sports/mens-soccer/schedule"],"roster":["https://uconnhuskies.com/sports/womens-soccer/roster","https://uconnhuskies.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uconnhuskies.com/sports/softball/schedule"],"roster":["https://uconnhuskies.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://uconnhuskies.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://uconnhuskies.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://uconnhuskies.com/sports/womens-tennis/schedule"],"roster":["https://uconnhuskies.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://uconnhuskies.com/sports/womens-track-and-field/schedule","https://uconnhuskies.com/sports/mens-track-and-field/schedule"],"roster":["https://uconnhuskies.com/sports/womens-track-and-field/roster","https://uconnhuskies.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://uconnhuskies.com/sports/womens-volleyball/schedule"],"roster":["https://uconnhuskies.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uconn|"+sport+"':"),`${sport} routes must live in the UConn module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://uconnhuskies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uconnHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uconn)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · UConn vs Syracuse (Exhibition) | W, 72-52",
 "Final Oct 20 Men's · UConn at Michigan State (Exhibition) | W, 78-70",
 "Upcoming Oct 27, 7:00 PM Men's · UConn vs Purdue (Exhibition) | ",
 "Upcoming Nov 2, 9:00 PM Men's · UConn vs Gardner-Webb | ",
 "Upcoming Nov 6, 8:00 PM Men's · UConn vs Michigan | ",
 "Upcoming Nov 9, 7:00 PM Men's · UConn vs Wagner | ",
 "Upcoming Nov 13, 7:30 PM Men's · UConn vs Ohio State | ",
 "Upcoming Nov 18, 9:00 PM Men's · UConn at Arizona | ",
 "Upcoming Nov 25, 7:00 PM Men's · UConn vs Duke | ",
 "Upcoming Nov 30, 6:30 PM Men's · UConn vs Rider | ",
 "Upcoming Dec 4, 7:00 PM Men's · UConn vs Illinois | ",
 "Upcoming Dec 8, 7:00 PM Men's · UConn vs Mississippi Valley State | ",
 "Upcoming Dec 12, 8:00 PM Men's · UConn vs Kansas | ",
 "Upcoming Dec 15, 7:00 PM Men's · UConn vs Delaware State | ",
 "Upcoming Dec 20, 3:00 PM Men's · UConn vs Virginia | ",
 "Upcoming Dec 23, 3:00 PM Men's · UConn vs Georgetown | ",
 "Upcoming Dec 31, 7:00 PM Men's · UConn at Butler | ",
 "Upcoming Jan 3, 2:00 PM Men's · UConn at Creighton | ",
 "Upcoming Jan 6, 6:30 PM Men's · UConn vs DePaul | ",
 "Upcoming Jan 9, 7:00 PM Men's · UConn at Seton Hall | ",
 "Upcoming Jan 12, 7:00 PM Men's · UConn vs Marquette | ",
 "Upcoming Jan 16, 12:00 PM Men's · UConn vs Xavier | ",
 "Upcoming Jan 20, 7:00 PM Men's · UConn at Providence | ",
 "Upcoming Jan 23, 12:00 PM Men's · UConn vs Butler | ",
 "Upcoming Jan 26, 8:00 PM Men's · UConn at Georgetown | ",
 "Upcoming Jan 29, 8:00 PM Men's · UConn at St. John's | ",
 "Upcoming Feb 3, 7:00 PM Men's · UConn vs Villanova | ",
 "Upcoming Feb 7, 4:30 PM Men's · UConn vs Creighton | ",
 "Upcoming Feb 10, 8:30 PM Men's · UConn at DePaul | ",
 "Upcoming Feb 14, 12:00 PM Men's · UConn at Villanova | ",
 "Upcoming Feb 17, 8:00 PM Men's · UConn vs Seton Hall | ",
 "Upcoming Feb 20, 2:30 PM Men's · UConn at Marquette | ",
 "Upcoming Feb 27, 8:00 PM Men's · UConn vs Providence | ",
 "Upcoming Mar 2, 7:30 PM Men's · UConn vs St. John's | ",
 "Upcoming Mar 6, 2:30 PM Men's · UConn at Xavier | ",
 "Upcoming Mar 10 Men's · UConn at BIG EAST Tournament (Game 1) | ",
 "Upcoming Mar 10 Men's · UConn at BIG EAST Tournament (Game 2) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 12 Women's · UConn vs Syracuse (Exhibition) | W, 88-60",
 "Final Oct 19 Women's · UConn vs Texas (Exhibition) | W, 83-61",
 "Upcoming Oct 25, 4:00 PM Women's · UConn vs Army (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · UConn vs Cornell | ",
 "Upcoming Nov 5, 6:30 PM Women's · UConn at Michigan | ",
 "Upcoming Nov 8, 2:00 PM Women's · UConn vs Iowa | ",
 "Upcoming Nov 12, 6:30 PM Women's · UConn at Ohio State | ",
 "Upcoming Nov 15, 5:30 PM Women's · UConn at Louisville | ",
 "Upcoming Nov 20, 8:00 PM Women's · UConn vs Seton Hall | ",
 "Upcoming Nov 24, 8:00 PM Women's · UConn vs South Carolina | ",
 "Upcoming Nov 28, 7:00 PM Women's · UConn vs Duke | ",
 "Upcoming Dec 2, 6:30 PM Women's · UConn vs UNLV | ",
 "Upcoming Dec 5, 4:30 PM Women's · UConn vs Maryland | ",
 "Upcoming Dec 9, 7:00 PM Women's · UConn at Notre Dame | ",
 "Upcoming Dec 12, 2:30 PM Women's · UConn vs Tennessee | ",
 "Upcoming Dec 16, 7:00 PM Women's · UConn vs Creighton | ",
 "Upcoming Dec 20, 1:00 PM Women's · UConn vs LSU | ",
 "Upcoming Dec 23, 1:00 PM Women's · UConn at Villanova | ",
 "Upcoming Dec 31, 5:00 PM Women's · UConn at Xavier | ",
 "Upcoming Jan 3, 4:00 PM Women's · UConn at DePaul | ",
 "Upcoming Jan 7, 7:00 PM Women's · UConn vs Georgetown | ",
 "Upcoming Jan 10, 2:00 PM Women's · UConn at Creighton | ",
 "Upcoming Jan 13, 7:00 PM Women's · UConn vs Marquette | ",
 "Upcoming Jan 18, 2:30 PM Women's · UConn at Seton Hall | ",
 "Upcoming Jan 24, 12:00 PM Women's · UConn at St. John's | ",
 "Upcoming Jan 28, 6:30 PM Women's · UConn vs DePaul | ",
 "Upcoming Jan 31, 12:00 PM Women's · UConn vs Providence | ",
 "Upcoming Feb 4, 7:00 PM Women's · UConn at Butler | ",
 "Upcoming Feb 7, 2:30 PM Women's · UConn at Marquette | ",
 "Upcoming Feb 10, 6:00 PM Women's · UConn vs Villanova | ",
 "Upcoming Feb 13, 12:00 PM Women's · UConn vs Xavier | ",
 "Upcoming Feb 18, 7:00 PM Women's · UConn at Georgetown | ",
 "Upcoming Feb 21, 12:00 PM Women's · UConn vs St. John's | ",
 "Upcoming Feb 25, 7:00 PM Women's · UConn at Providence | ",
 "Upcoming Feb 28, 2:00 PM Women's · UConn vs Butler | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 UConn at Hartford | 1st of 10",
 "Final Sep 19 UConn at Dartmouth Invitational | 8th",
 "Final Sep 26 UConn at Princeton Meadows Challenge | 9th of 17",
 "Final Oct 16 UConn at Pre-Nationals | 16th of 43",
 "Upcoming Oct 30 UConn at Big East Championships | ",
 "Upcoming Nov 13 UConn at NCAA Northeast Regional Championships | ",
 "Upcoming Nov 21 UConn at NCAA XC Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 UConn vs New Hampshire | W, 5-0",
 "Final Aug 30 UConn at Saint Joseph's | W, 4-1",
 "Final Sep 4 UConn at Brown | W, 3-0",
 "Final Sep 6 UConn at Harvard | L, 0-1",
 "Final Sep 13 UConn at Rutgers | W, 4-3",
 "Final Sep 18 UConn vs Villanova | W, 3-1",
 "Final Sep 20 UConn vs Princeton | W, 2-1",
 "Final Sep 25 UConn vs Liberty | W, 3-2",
 "Final Oct 2 UConn at Providence | W, 2-1",
 "Final Oct 4 UConn vs Massachusetts | W, 2-1",
 "Final Oct 9 UConn vs Temple | W, 4-0",
 "Final Oct 16 UConn at Georgetown | W, 2-0",
 "Final Oct 18 UConn at Cornell | W, 2-0",
 "Upcoming Oct 23, 3:00 PM UConn at Old Dominion | ",
 "Upcoming Oct 30, 3:00 PM UConn vs Fairfield | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 UConn vs Lafayette | W, 56-7",
 "Final Sep 12 UConn vs Maryland | L, 14-38",
 "Final Sep 19 UConn at Southern Miss | W, 48-20",
 "Final Sep 26 UConn at Miami (OH) | L, 21-24",
 "Final Oct 3 UConn vs Syracuse | L, 41-42",
 "Final Oct 10 UConn at Temple | W, 34-20",
 "Upcoming Oct 23, 7:00 PM UConn vs Massachusetts | ",
 "Upcoming Oct 31, 3:00 PM UConn at Air Force | ",
 "Upcoming Nov 7, 12:00 PM UConn vs North Carolina | ",
 "Upcoming Nov 14, 12:00 PM UConn vs James Madison | ",
 "Upcoming Nov 21, 3:30 PM UConn vs Old Dominion | ",
 "Upcoming Nov 28 UConn at Wyoming | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 UConn at Doc Gimmler Invitational | 13th of 14",
 "Final Sep 19 UConn at The Goat | 6th of 15",
 "Final Sep 27 UConn at UConn Invitational at GreatHorse | 9th of 14",
 "Final Oct 5 UConn at WVU Nemacolin Collegiate Invitational | 6th of 16",
 "Final Oct 12 UConn at Moraine Intercollegiate | 15th of 16",
 "Upcoming Oct 26 UConn at Ka'anapali Collegiate Invitational | ",
 "Upcoming Feb 8 UConn at BIG EAST Match-Play | ",
 "Upcoming Feb 28 UConn at Lake Jovita Invitational | ",
 "Upcoming Mar 8 UConn at The Surf Club Invitational | ",
 "Upcoming Mar 22 UConn at Bridgestone Collegiate Invitational | ",
 "Upcoming Apr 3 UConn at The Augusta Haskins Award Invitational | ",
 "Upcoming Apr 17 UConn at Rutgers Invitational | ",
 "Upcoming May 1 UConn at BIG EAST Championship presented by JEEP | ",
 "Upcoming May 16 UConn at NCAA Regional | ",
 "Upcoming May 28 UConn at NCAA Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 9 Men's · UConn vs Penn State | W, 3-1",
 "Final Oct 10 Men's · UConn vs Bowling Green | L, 2-5",
 "Final Oct 16 Men's · UConn vs Colorado College | W, 3-2",
 "Final Oct 17 Men's · UConn vs Colorado College | L, 1-4",
 "Upcoming Oct 22, 7:00 PM Men's · UConn vs Boston University | ",
 "Upcoming Oct 24, 7:00 PM Men's · UConn at Boston University | ",
 "Upcoming Oct 30, 7:00 PM Men's · UConn at Merrimack College | ",
 "Upcoming Oct 31, 4:30 PM Men's · UConn at Merrimack College | ",
 "Upcoming Nov 5 Men's · UConn at Providence College | ",
 "Upcoming Nov 7, 5:00 PM Men's · UConn vs Providence College | ",
 "Upcoming Nov 13, 7:00 PM Men's · UConn vs Northeastern | ",
 "Upcoming Nov 14, 3:00 PM Men's · UConn vs Northeastern | ",
 "Upcoming Nov 19, 7:00 PM Men's · UConn vs New Hampshire | ",
 "Upcoming Nov 21 Men's · UConn at New Hampshire | ",
 "Upcoming Nov 27 Men's · UConn vs Colgate | ",
 "Upcoming Nov 28 Men's · UConn at Friendship Four | ",
 "Upcoming Dec 11 Men's · UConn at Ohio State | ",
 "Upcoming Dec 12 Men's · UConn at Ohio State | ",
 "Upcoming Jan 2, 3:00 PM Men's · UConn vs Merrimack College | ",
 "Upcoming Jan 7 Men's · UConn at Massachusetts Lowell | ",
 "Upcoming Jan 9, 2:00 PM Men's · UConn vs Massachusetts Lowell | ",
 "Upcoming Jan 15, 7:00 PM Men's · UConn vs Maine | ",
 "Upcoming Jan 16, 4:00 PM Men's · UConn vs Maine | ",
 "Upcoming Jan 29 Men's · UConn vs CT Ice | ",
 "Upcoming Jan 30 Men's · UConn vs CT Ice | ",
 "Upcoming Feb 5, 7:00 PM Men's · UConn vs Northeastern | ",
 "Upcoming Feb 12 Men's · UConn at Boston College | ",
 "Upcoming Feb 13, 4:00 PM Men's · UConn vs Boston College | ",
 "Upcoming Feb 19 Men's · UConn at Vermont | ",
 "Upcoming Feb 20 Men's · UConn at Vermont | ",
 "Upcoming Feb 25 Men's · UConn at Massachusetts | ",
 "Upcoming Feb 27, 2:00 PM Men's · UConn vs Massachusetts | ",
 "Upcoming Mar 4 Men's · UConn at New Hampshire | ",
 "Upcoming Mar 6, 2:00 PM Men's · UConn vs Providence College | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · UConn at St. Cloud State | L, 2-4",
 "Final Sep 26 Women's · UConn at St. Cloud State | L, 2-4",
 "Final Oct 2 Women's · UConn vs Clarkson | W, 3-2",
 "Final Oct 3 Women's · UConn vs Clarkson | W, 4-0",
 "Final Oct 16 Women's · UConn at Princeton | L, 1-2",
 "Final Oct 17 Women's · UConn at Princeton | L, 5-6",
 "Upcoming Oct 23, 6:00 PM Women's · UConn vs Mercyhurst | ",
 "Upcoming Oct 24, 1:00 PM Women's · UConn vs Mercyhurst | ",
 "Upcoming Oct 29, 7:00 PM Women's · UConn at Holy Cross | ",
 "Upcoming Oct 30, 6:00 PM Women's · UConn vs Holy Cross | ",
 "Upcoming Nov 5, 2:00 PM Women's · UConn at Boston College | ",
 "Upcoming Nov 6, 6:00 PM Women's · UConn vs Boston College | ",
 "Upcoming Nov 13, 2:00 PM Women's · UConn vs Providence | ",
 "Upcoming Nov 14, 2:00 PM Women's · UConn at Providence | ",
 "Upcoming Nov 20, 6:00 PM Women's · UConn at Vermont | ",
 "Upcoming Nov 21, 3:00 PM Women's · UConn at Vermont | ",
 "Upcoming Nov 27, 6:30 PM Women's · UConn vs Sacred Heart | ",
 "Upcoming Dec 4, 6:00 PM Women's · UConn at Boston University | ",
 "Upcoming Dec 5, 3:00 PM Women's · UConn vs Boston University | ",
 "Upcoming Jan 8, 6:00 PM Women's · UConn vs Maine | ",
 "Upcoming Jan 9, 3:00 PM Women's · UConn vs Maine | ",
 "Upcoming Jan 15, 5:00 PM Women's · UConn at Merrimack | ",
 "Upcoming Jan 16, 3:00 PM Women's · UConn vs Merrimack | ",
 "Upcoming Jan 22, 6:00 PM Women's · UConn vs Northeastern | ",
 "Upcoming Jan 23, 3:00 PM Women's · UConn vs Northeastern | ",
 "Upcoming Jan 29, 2:00 PM Women's · UConn at New Hampshire | ",
 "Upcoming Jan 30, 6:00 PM Women's · UConn vs New Hampshire | ",
 "Upcoming Feb 4, 5:00 PM Women's · UConn at Maine | ",
 "Upcoming Feb 6, 6:00 PM Women's · UConn vs New Hampshire | ",
 "Upcoming Feb 12, 6:00 PM Women's · UConn vs Vermont | ",
 "Upcoming Feb 13 Women's · UConn at Holy Cross | ",
 "Upcoming Feb 18, 3:00 PM Women's · UConn vs Boston College | ",
 "Upcoming Feb 20 Women's · UConn at Northeastern | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UConn at Stony Brook | T, 2-2",
 "Final Aug 20 Women's · UConn vs Rutgers | T, 0-0",
 "Final Aug 23 Women's · UConn vs Boston University | W, 2-1",
 "Final Aug 27 Women's · UConn at Brown | L, 0-1",
 "Final Sep 6 Women's · UConn vs LIU | W, 5-1",
 "Final Sep 13 Women's · UConn at West Virginia | T, 1-1",
 "Final Sep 20 Women's · UConn at Harvard | L, 0-2",
 "Final Sep 25 Women's · UConn vs Vermont | T, 0-0",
 "Final Sep 30 Women's · UConn at St. John's | T, 0-0",
 "Final Oct 3 Women's · UConn vs Providence | W, 2-1",
 "Final Oct 7 Women's · UConn vs Seton Hall | T, 0-0",
 "Final Oct 10 Women's · UConn at Xavier | T, 2-2",
 "Final Oct 17 Women's · UConn vs DePaul | L, 0-1",
 "Today Oct 21, 7:00 PM Women's · UConn at Creighton | ",
 "Upcoming Oct 24, 2:00 PM Women's · UConn at Marquette | ",
 "Upcoming Oct 28, 6:30 PM Women's · UConn vs Butler | ",
 "Upcoming Oct 31, 6:30 PM Women's · UConn vs Georgetown | ",
 "Upcoming Nov 7, 3:00 PM Women's · UConn at Villanova | ",
 "Upcoming Nov 11 Women's · UConn at BIg East Championship | ",
 "Upcoming Nov 14 Women's · UConn at BIg East Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UConn vs Syracuse | L, 1-2",
 "Final Aug 23 Men's · UConn at UMASS | L, 1-3",
 "Final Aug 27 Men's · UConn vs Fairfield | L, 0-1",
 "Final Aug 30 Men's · UConn vs Western Michigan | W, 4-1",
 "Final Sep 3 Men's · UConn vs Brown | W, 2-1",
 "Final Sep 6 Men's · UConn vs Fisher College | W, 6-1",
 "Final Sep 9 Men's · UConn vs Sacred Heart | T, 1-1",
 "Final Sep 12 Men's · UConn at Harvard | T, 2-2",
 "Final Sep 18 Men's · UConn vs Seton Hall | L, 1-2",
 "Final Sep 22 Men's · UConn vs Siena | W, 3-1",
 "Final Oct 2 Men's · UConn at Villanova | W, 1-0",
 "Final Oct 6 Men's · UConn vs Bryant | L, 0-1",
 "Final Oct 10 Men's · UConn vs DePaul | L, 1-2",
 "Final Oct 16 Men's · UConn at Marquette | W, 1-0",
 "Upcoming Oct 24, 6:00 PM Men's · UConn vs Providence | ",
 "Upcoming Oct 27, 6:00 PM Men's · UConn at St. John's | ",
 "Upcoming Oct 31, 6:30 PM Men's · UConn at Xavier | ",
 "Upcoming Nov 6, 7:00 PM Men's · UConn vs Georgetown | ",
 "Upcoming Nov 12 Men's · UConn at BIg East Championship SEMIFINAL | ",
 "Upcoming Nov 15 Men's · UConn at BIg East Championship FINAL | ",
 "Upcoming Nov 19 Men's · UConn at NCAA Men's Soccer Championship FIRST ROUND | ",
 "Upcoming Nov 22 Men's · UConn at NCAA Men's Soccer Championship SECOND ROUND | ",
 "Upcoming Nov 29 Men's · UConn vs SWEET 16 | ",
 "Upcoming Dec 5 Men's · UConn vs ELITE 8 | ",
 "Upcoming Dec 11 Men's · UConn at COLLEGE CUP | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 19 UConn vs Iona (10 Innings) (Exhibition) | W, 17-3",
 "Final Sep 25 UConn vs Bridgeport (10 Innings) (Exhibition) | W, 22-0",
 "Final Oct 3 UConn at Merrimack (Exhibition) | W, 10-1",
 "Final Oct 3 UConn at Boston College (Exhibition) | W, 15-4",
 "Final Oct 4 UConn vs Eastern Connecticut State (10 Innings) (Exhibition) | W, 22-1"
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 24 Women's · UConn at Army | Completed",
 "Final Sep 26 Women's · UConn at Husky Diving Invite | Completed",
 "Final Oct 17 Women's · UConn at Villanova | Completed",
 "Upcoming Oct 31, 12:00 PM Women's · UConn vs Rhode Island | ",
 "Upcoming Nov 6, 4:00 PM Women's · UConn at Boston College | ",
 "Upcoming Nov 7, 12:00 PM Women's · UConn at Northeastern | ",
 "Upcoming Nov 17 Women's · UConn at Iowa Invitational | ",
 "Upcoming Dec 5, 2:00 PM Women's · UConn at Vermont | ",
 "Upcoming Jan 9 Women's · UConn at Massachusetts | ",
 "Upcoming Jan 16, 12:00 PM Women's · UConn vs New Hampshire | ",
 "Upcoming Feb 6 Women's · UConn vs Providence College | ",
 "Upcoming Feb 17 Women's · UConn at BIG EAST Championship | ",
 "Upcoming Mar 8 Women's · UConn at NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · UConn at NCAA Division 1 Swimming Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 UConn at UConn Invitational | Completed",
 "Final Sep 25 UConn at Dartmouth Invite | Completed",
 "Final Oct 9 UConn at ITA Regionals | Completed",
 "Final Oct 17 UConn at Brown Invite | Completed",
 "Upcoming Nov 6 UConn at Bonita Bay Classic | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UConn vs High Point | L, 2-3",
 "Final Aug 29 UConn at Penn State | L, 0-3",
 "Final Aug 30 UConn vs Hofstra | L, 0-3",
 "Final Sep 4 UConn vs Coastal Carolina | W, 3-2",
 "Final Sep 4 UConn vs Florida A&M | L, 2-3",
 "Final Sep 5 UConn at Jacksonville | W, 3-0",
 "Final Sep 8 UConn vs Bryant | W, 3-0",
 "Final Sep 11 UConn vs New Hampshire | W, 3-0",
 "Final Sep 12 UConn vs FDU | W, 3-0",
 "Final Sep 13 UConn vs Yale | L, 1-3",
 "Final Sep 18 UConn vs Coppin State | L, 1-3",
 "Final Sep 19 UConn vs Merrimack | W, 3-1",
 "Final Sep 20 UConn vs Rhode Island | W, 3-1",
 "Final Sep 25 UConn vs Marquette | L, 0-3",
 "Final Sep 26 UConn vs DePaul | L, 1-3",
 "Final Oct 2 UConn at Georgetown | L, 0-3",
 "Final Oct 3 UConn at Villanova | L, 0-3",
 "Final Oct 9 UConn vs St. John's | L, 1-3",
 "Final Oct 10 UConn vs Seton Hall | W, 3-1",
 "Final Oct 16 UConn at Butler | L, 0-3",
 "Final Oct 17 UConn at Xavier | L, 1-3",
 "Upcoming Oct 22, 9:00 PM UConn at Creighton | ",
 "Upcoming Oct 25, 4:00 PM UConn at Providence | ",
 "Upcoming Oct 30, 6:00 PM UConn vs Villanova | ",
 "Upcoming Oct 31, 4:00 PM UConn vs Georgetown | ",
 "Upcoming Nov 6, 5:00 PM UConn at Seton Hall | ",
 "Upcoming Nov 7, 7:00 PM UConn at St. John's | ",
 "Upcoming Nov 13, 6:00 PM UConn vs Xavier | ",
 "Upcoming Nov 14, 3:00 PM UConn vs Butler | ",
 "Upcoming Nov 21 UConn at BIG EAST Semifinals | ",
 "Upcoming Nov 22 UConn at BIG EAST Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Swimming: a past meet with no score, story or result anywhere (Husky Diving
// Invite, Sep 26; at Villanova, Oct 17) is not listed, as K-State's; the Army
// meet (Sep 24) keeps its archive story ("Huskies Place 2nd") and is listed.
{
  const h=worker.uconnHandlers,army='https://uconnhuskies.com/news/2026/9/25/womens-swimming-and-diving-huskies-place-2nd-in-opening-meet-of-the-season';
  const rows=parse('Swimming & Diving','womens-swimming-and-diving').filter(e=>e.status==='Final').map(e=>[line(e),Boolean(h.isTennisWithoutStory(/Army/.test(e.title)?{...e,recap_url:army}:e))]);
  assert.deepEqual(rows,[["Final Sep 24 Women's · UConn at Army | Completed",false],["Final Sep 26 Women's · UConn at Husky Diving Invite | Completed",true],["Final Oct 17 Women's · UConn at Villanova | Completed",true]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('UConn module checks passed');
