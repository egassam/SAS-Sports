import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lehighSchool} from '../src/schools/lehigh.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lehigh');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lehighHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lehigh-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lehighsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lehigh'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',lehighSchool.scheduleUrls],['roster',lehighSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lehigh|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lehighsports.com',`${key} must stay on lehighsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lehighsports.com/sports/baseball/schedule"],"roster":["https://lehighsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lehighsports.com/sports/mens-basketball/schedule","https://lehighsports.com/sports/womens-basketball/schedule"],"roster":["https://lehighsports.com/sports/mens-basketball/roster","https://lehighsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://lehighsports.com/sports/womens-cross-country/schedule","https://lehighsports.com/sports/mens-cross-country/schedule"],"roster":["https://lehighsports.com/sports/womens-cross-country/roster","https://lehighsports.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://lehighsports.com/sports/field-hockey/schedule"],"roster":["https://lehighsports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://lehighsports.com/sports/football/schedule"],"roster":["https://lehighsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://lehighsports.com/sports/womens-golf/schedule","https://lehighsports.com/sports/mens-golf/schedule"],"roster":["https://lehighsports.com/sports/womens-golf/roster","https://lehighsports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://lehighsports.com/sports/womens-lacrosse/schedule","https://lehighsports.com/sports/mens-lacrosse/schedule"],"roster":["https://lehighsports.com/sports/womens-lacrosse/roster","https://lehighsports.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://lehighsports.com/sports/rowing/schedule","https://lehighsports.com/sports/womens-rowing/schedule"],"roster":["https://lehighsports.com/sports/rowing/roster","https://lehighsports.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://lehighsports.com/sports/womens-soccer/schedule","https://lehighsports.com/sports/mens-soccer/schedule"],"roster":["https://lehighsports.com/sports/womens-soccer/roster","https://lehighsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://lehighsports.com/sports/softball/schedule"],"roster":["https://lehighsports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://lehighsports.com/sports/mens-swimming-and-diving/schedule","https://lehighsports.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://lehighsports.com/sports/mens-swimming-and-diving/roster","https://lehighsports.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://lehighsports.com/sports/womens-tennis/schedule","https://lehighsports.com/sports/mens-tennis/schedule"],"roster":["https://lehighsports.com/sports/womens-tennis/roster","https://lehighsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://lehighsports.com/sports/womens-track-and-field/schedule","https://lehighsports.com/sports/mens-track-and-field/schedule"],"roster":["https://lehighsports.com/sports/womens-track-and-field/roster","https://lehighsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://lehighsports.com/sports/womens-volleyball/schedule"],"roster":["https://lehighsports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://lehighsports.com/sports/wrestling/schedule"],"roster":["https://lehighsports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lehigh|"+sport+"':"),`${sport} routes must live in the Lehigh module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://lehighsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lehighHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lehigh)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Lehigh at Saint Louis | ",
 "Upcoming Nov 5, 7:00 PM Men's · Lehigh vs Cornell | ",
 "Upcoming Nov 8, 2:00 PM Men's · Lehigh vs Brown | ",
 "Upcoming Nov 13, 7:00 PM Men's · Lehigh vs Marist | ",
 "Upcoming Nov 17, 7:00 PM Men's · Lehigh at Mount St. Mary's (Md.) | ",
 "Upcoming Nov 20, 8:00 PM Men's · Lehigh vs Neumann | ",
 "Upcoming Nov 24, 7:00 PM Men's · Lehigh vs Binghamton | ",
 "Upcoming Nov 27, 7:00 PM Men's · Lehigh vs UC Santa Barbara | ",
 "Upcoming Nov 28, 1:30 PM Men's · Lehigh vs Pepperdine | ",
 "Upcoming Dec 2, 7:00 PM Men's · Lehigh vs Penn State Scranton | ",
 "Upcoming Dec 5, 2:00 PM Men's · Lehigh vs Monmouth | ",
 "Upcoming Dec 20, 2:00 PM Men's · Lehigh at FIU | ",
 "Upcoming Dec 22, 8:30 PM Men's · Lehigh at Auburn | ",
 "Upcoming Dec 30, 4:30 PM Men's · Lehigh vs American | ",
 "Upcoming Jan 2, 2:00 PM Men's · Lehigh vs Boston U. | ",
 "Upcoming Jan 6, 6:00 PM Men's · Lehigh at Army | ",
 "Upcoming Jan 9, 2:00 PM Men's · Lehigh at Bucknell | ",
 "Upcoming Jan 13, 6:00 PM Men's · Lehigh vs Holy Cross | ",
 "Upcoming Jan 16, 2:00 PM Men's · Lehigh at Navy | ",
 "Upcoming Jan 20, 7:00 PM Men's · Lehigh vs Army | ",
 "Upcoming Jan 23, 5:00 PM Men's · Lehigh at Loyola | ",
 "Upcoming Jan 25, 6:30 PM Men's · Lehigh vs Colgate | ",
 "Upcoming Jan 30, 7:30 PM Men's · Lehigh vs Lafayette | ",
 "Upcoming Feb 3, 6:00 PM Men's · Lehigh at Boston U. | ",
 "Upcoming Feb 6, 2:00 PM Men's · Lehigh vs Bucknell | ",
 "Upcoming Feb 8, 7:00 PM Men's · Lehigh at American | ",
 "Upcoming Feb 13, 2:00 PM Men's · Lehigh at Holy Cross | ",
 "Upcoming Feb 17, 6:00 PM Men's · Lehigh vs Loyola | ",
 "Upcoming Feb 20, 4:00 PM Men's · Lehigh at Lafayette | ",
 "Upcoming Feb 24, 7:00 PM Men's · Lehigh at Colgate | ",
 "Upcoming Feb 27, 2:00 PM Men's · Lehigh vs Navy | ",
 "Upcoming Mar 2 Men's · Lehigh at Patriot League Tournament - First Round | ",
 "Upcoming Mar 4 Men's · Lehigh at Patriot League Tournament - Quarterfinals | ",
 "Upcoming Mar 7 Men's · Lehigh at Patriot League Tournament - Semifinals | ",
 "Upcoming Mar 10 Men's · Lehigh at Patriot League Tournament - Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:30 AM Women's · Lehigh at UCLA | ",
 "Upcoming Nov 6, 6:00 PM Women's · Lehigh at Monmouth | ",
 "Upcoming Nov 11, 6:00 PM Women's · Lehigh vs Mount St. Mary's (Md.) | ",
 "Upcoming Nov 15, 2:00 PM Women's · Lehigh at Vermont | ",
 "Upcoming Nov 20, 5:30 PM Women's · Lehigh vs Towson | ",
 "Upcoming Nov 24, 6:30 PM Women's · Lehigh at Stony Brook | ",
 "Upcoming Nov 28, 12:00 PM Women's · Lehigh vs Liberty | ",
 "Upcoming Nov 29, 12:00 PM Women's · Lehigh vs Harvard/Pitt | ",
 "Upcoming Dec 3, 11:00 AM Women's · Lehigh vs Fairfield | ",
 "Upcoming Dec 7, 7:00 PM Women's · Lehigh at Maryland | ",
 "Upcoming Dec 19, 2:00 PM Women's · Lehigh at LIU | ",
 "Upcoming Dec 30, 2:00 PM Women's · Lehigh vs American | ",
 "Upcoming Jan 2, 2:00 PM Women's · Lehigh at Boston University | ",
 "Upcoming Jan 6, 6:00 PM Women's · Lehigh vs Army | ",
 "Upcoming Jan 9, 2:00 PM Women's · Lehigh vs Bucknell | ",
 "Upcoming Jan 13, 10:30 AM Women's · Lehigh at Holy Cross | ",
 "Upcoming Jan 16, 2:00 PM Women's · Lehigh vs Navy | ",
 "Upcoming Jan 20, 6:00 PM Women's · Lehigh at Army | ",
 "Upcoming Jan 23, 2:00 PM Women's · Lehigh vs Loyola University Maryland | ",
 "Upcoming Jan 27, 6:00 PM Women's · Lehigh at Colgate | ",
 "Upcoming Jan 30, 5:00 PM Women's · Lehigh vs Lafayette College | ",
 "Upcoming Feb 3, 6:00 PM Women's · Lehigh vs Boston University | ",
 "Upcoming Feb 6, 2:00 PM Women's · Lehigh at Bucknell | ",
 "Upcoming Feb 8, 4:30 PM Women's · Lehigh at American | ",
 "Upcoming Feb 13 Women's · Lehigh vs Holy Cross | ",
 "Upcoming Feb 17 Women's · Lehigh at Loyola University Maryland | ",
 "Upcoming Feb 20, 1:00 PM Women's · Lehigh at Lafayette College | ",
 "Upcoming Feb 23, 6:00 PM Women's · Lehigh vs Colgate | ",
 "Upcoming Feb 27 Women's · Lehigh at Navy | ",
 "Upcoming Mar 1 Women's · Lehigh at Patriot League Tournament - First Round | ",
 "Upcoming Mar 3 Women's · Lehigh at Patriot League Tournament - Quarterfinal | ",
 "Upcoming Mar 6 Women's · Lehigh at Patriot League Tournament - Semifinals | ",
 "Upcoming Mar 9 Women's · Lehigh at Patriot League Tournament - Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Lehigh at Lehigh Invitational | 4th of 10",
 "Final Sep 11 Women's · Lehigh at Lafayette Invitational | 3rd of 4",
 "Final Sep 25 Women's · Lehigh at Lafayette Dual | W, 27-30",
 "Final Oct 2 Women's · Lehigh at Paul Short Run | 20th of 37",
 "Final Oct 17 Women's · Lehigh at ECAC Championships | 11th of 26",
 "Final Oct 23 Women's · Lehigh at Bucknell Open | Completed",
 "Upcoming Oct 31, 11:00 AM Women's · Lehigh at Patriot League Championships | ",
 "Upcoming Nov 13, 12:00 PM Women's · Lehigh at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 Women's · Lehigh at NCAA National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Lehigh at Lehigh Invitational | 3rd of 9",
 "Final Sep 11 Men's · Lehigh at Lafayette Invitational | 1st of 4",
 "Final Sep 25 Men's · Lehigh at Lafayette Dual | W, 15-44",
 "Final Oct 2 Men's · Lehigh at Paul Short Run | 27th of 35",
 "Final Oct 17 Men's · Lehigh at IC4A Championships | 13th of 25",
 "Final Oct 23 Men's · Lehigh at Bucknell Open | Completed",
 "Upcoming Oct 31, 12:00 PM Men's · Lehigh at Patriot League Championships | ",
 "Upcoming Nov 13, 1:15 PM Men's · Lehigh at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 Men's · Lehigh at NCAA National Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Lehigh vs LIU | W, 2-0",
 "Final Sep 4 Lehigh at Iowa | L, 0-9",
 "Final Sep 5 Lehigh vs Ball State | L, 4-5",
 "Final Sep 11 Lehigh vs Saint Joseph's | L, 0-3",
 "Final Sep 13 Lehigh vs Villanova | L, 0-2",
 "Final Sep 19 Lehigh vs Holy Cross | L, 0-4",
 "Final Sep 20 Lehigh at Wagner | L, 1-4",
 "Final Sep 26 Lehigh vs Colgate | L, 0-4",
 "Final Oct 3 Lehigh at Boston University | L, 1-7",
 "Final Oct 4 Lehigh at Fairfield | L, 0-6",
 "Final Oct 9 Lehigh at Delaware | L, 0-5",
 "Final Oct 11 Lehigh vs Drexel | L, 0-5",
 "Final Oct 16 Lehigh at Lafayette | L, 0-11",
 "Final Oct 18 Lehigh vs Penn | L, 1-3",
 "Final Oct 23 Lehigh vs Bucknell | L, 1-2",
 "Upcoming Oct 25, 1:00 PM Lehigh vs Hofstra | ",
 "Upcoming Oct 31, 12:00 PM Lehigh at American | ",
 "Upcoming Nov 5 Lehigh at Patriot League Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Lehigh at Holy Cross | W, 35-10",
 "Final Sep 5 Lehigh at Georgetown | W, 45-14",
 "Final Sep 12 Lehigh vs William & Mary | W, 44-20",
 "Final Sep 19 Lehigh vs Dartmouth | W, 24-20",
 "Final Sep 26 Lehigh at Penn | W, 20-7",
 "Final Oct 3 Lehigh vs Fordham | W, 34-0",
 "Final Oct 17 Lehigh at Cornell | L, 38-48",
 "Today Oct 24, 3:30 PM Lehigh at Villanova | ",
 "Upcoming Oct 31, 12:00 PM Lehigh vs Bucknell | ",
 "Upcoming Nov 7, 12:00 PM Lehigh vs Colgate | ",
 "Upcoming Nov 14, 2:00 PM Lehigh at Richmond | ",
 "Upcoming Nov 21 Lehigh at Lafayette | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Lehigh at Nittany Lion Invitational | 12th of 18",
 "Final Sep 14 Women's · Lehigh at Charge At Quail Valley | 2nd of 9",
 "Final Sep 28 Women's · Lehigh at Autumn Harvest | 2nd of 11",
 "Final Oct 9 Women's · Lehigh at Evie Odom Invitational | 12th of 14",
 "Upcoming Oct 26 Women's · Lehigh at Lehigh Invitational | ",
 "Upcoming Feb 8 Women's · Lehigh at Ventura Harbor Collegiate | ",
 "Upcoming Feb 22 Women's · Lehigh at Longwood Invitational | ",
 "Upcoming Mar 8 Women's · Lehigh at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 22 Women's · Lehigh at Bell Bank Collegiate | ",
 "Upcoming Apr 12 Women's · Lehigh at Terps Invite | ",
 "Upcoming Apr 12 Women's · Lehigh at Spring Spectacular | ",
 "Upcoming Apr 23 Women's · Lehigh at Patriot League Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Lehigh at The Doc Gimmler | 5th of 14",
 "Final Sep 21 Men's · Lehigh at The Gauntlet | No team score (individuals only)",
 "Final Sep 21 Men's · Lehigh at Temple Invitational | 3rd of 12",
 "Final Oct 3 Men's · Lehigh at The Autumn Invitational | 5th of 13",
 "Final Oct 19 Men's · Lehigh at Nassau Intercollegiate | 3rd of 7",
 "Today Oct 24 Men's · Lehigh at Lehigh Invitational | ",
 "Upcoming Feb 1 Men's · Lehigh at Bill Cullum Invitational | ",
 "Upcoming Feb 15 Men's · Lehigh at Wexford Plantation Intercollegiate | ",
 "Upcoming Mar 2 Men's · Lehigh at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 22 Men's · Lehigh at Bell Bank Collegiate | ",
 "Upcoming Apr 11 Men's · Lehigh at Abarta Coca-Cola Collegiate | ",
 "Upcoming Apr 22 Men's · Lehigh at Lafayette | ",
 "Upcoming Apr 30 Men's · Lehigh at Patriot League Championship | ",
 "Upcoming May 17 Men's · Lehigh at NCAA Regionals | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Today Oct 24 Men's · Lehigh at Head of the Schuylkill | ",
 "Upcoming Oct 31 Men's · Lehigh vs Class Day Regatta | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Today Oct 24 Women's · Lehigh at Head of the Schuylkill | ",
 "Upcoming Oct 31 Women's · Lehigh vs Class Day Regatta | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Lehigh at Binghamton | L, 0-3",
 "Final Aug 16 Women's · Lehigh vs Villanova | L, 0-9",
 "Final Aug 23 Women's · Lehigh vs NJIT | L, 1-2",
 "Final Sep 3 Women's · Lehigh at Drexel | L, 1-2",
 "Final Sep 6 Women's · Lehigh at Stony Brook | T, 2-2",
 "Final Sep 10 Women's · Lehigh vs La Salle | L, 0-2",
 "Final Sep 13 Women's · Lehigh vs Princeton | L, 0-3",
 "Final Sep 19 Women's · Lehigh at Bucknell | L, 1-3",
 "Final Sep 26 Women's · Lehigh at Army | L, 0-2",
 "Final Sep 30 Women's · Lehigh vs Navy | L, 1-3",
 "Final Oct 4 Women's · Lehigh vs American | T, 2-2",
 "Final Oct 10 Women's · Lehigh at Loyola | L, 0-4",
 "Final Oct 17 Women's · Lehigh vs Holy Cross | L, 2-4",
 "Today Oct 24, 1:00 PM Women's · Lehigh at Colgate | ",
 "Upcoming Oct 31, 1:00 PM Women's · Lehigh at Boston U. | ",
 "Upcoming Nov 4, 6:00 PM Women's · Lehigh vs Lafayette | ",
 "Upcoming Nov 8 Women's · Lehigh at Patriot League Quarterfinal | ",
 "Upcoming Nov 11 Women's · Lehigh at Patriot League Semifinal | ",
 "Upcoming Nov 15 Women's · Lehigh at Patriot League Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 21 Men's · Lehigh vs La Salle | L, 1-4",
 "Final Aug 28 Men's · Lehigh at Old Dominion | L, 0-2",
 "Final Sep 1 Men's · Lehigh at Fairfield | T, 2-2",
 "Final Sep 5 Men's · Lehigh vs UMBC | T, 0-0",
 "Final Sep 8 Men's · Lehigh at Seton Hall | T, 0-0",
 "Final Sep 12 Men's · Lehigh at Loyola | W, 2-0",
 "Final Sep 19 Men's · Lehigh vs Army | W, 1-0",
 "Final Sep 22 Men's · Lehigh at Columbia | T, 0-0",
 "Final Sep 26 Men's · Lehigh vs Navy | W, 2-1",
 "Final Sep 29 Men's · Lehigh at Delaware | L, 0-1",
 "Final Oct 3 Men's · Lehigh at Holy Cross | T, 3-3",
 "Final Oct 9 Men's · Lehigh vs American | W, 2-0",
 "Final Oct 13 Men's · Lehigh vs Brown | L, 1-3",
 "Final Oct 17 Men's · Lehigh at Bucknell | L, 0-2",
 "Today Oct 24, 4:00 PM Men's · Lehigh vs Boston U. | ",
 "Upcoming Oct 30, 6:00 PM Men's · Lehigh vs Colgate | ",
 "Upcoming Nov 3, 6:00 PM Men's · Lehigh at Lafayette | ",
 "Upcoming Nov 7 Men's · Lehigh at Patriot League Quarterfinal | ",
 "Upcoming Nov 10 Men's · Lehigh at Patriot League Semifinal | ",
 "Upcoming Nov 14 Men's · Lehigh at Patriot League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Nov 6, 5:00 PM Men's · Lehigh vs Seton Hall | ",
 "Upcoming Nov 8, 1:00 PM Men's · Lehigh at Colgate | ",
 "Upcoming Nov 19, 6:00 PM Men's · Lehigh at Lafayette | ",
 "Upcoming Dec 4 Men's · Lehigh at Bucknell Invitational | ",
 "Upcoming Jan 9, 11:00 AM Men's · Lehigh vs Drexel | ",
 "Upcoming Jan 23, 1:00 PM Men's · Lehigh at Bucknell | ",
 "Upcoming Jan 30 Men's · Lehigh at Bucknell Invitational | ",
 "Upcoming Feb 17 Men's · Lehigh at Patriot League Championships | ",
 "Upcoming Feb 26 Men's · Lehigh at ECAC Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Lehigh vs Brown and White Meet | Completed",
 "Final Oct 10 Women's · Lehigh vs Loyola | L, 130.5-169.5",
 "Final Oct 17 Women's · Lehigh at Rider | W, 198-96",
 "Final Oct 23 Women's · Lehigh at West Chester | W, 150-91",
 "Upcoming Nov 6, 5:00 PM Women's · Lehigh vs Seton Hall | ",
 "Upcoming Nov 8, 1:00 PM Women's · Lehigh at Colgate | ",
 "Upcoming Nov 19, 6:00 PM Women's · Lehigh at Lafayette | ",
 "Upcoming Dec 4 Women's · Lehigh at Bucknell Invitational | ",
 "Upcoming Jan 9, 11:00 AM Women's · Lehigh vs Drexel | ",
 "Upcoming Jan 23, 1:00 PM Women's · Lehigh at Bucknell | ",
 "Upcoming Jan 30 Women's · Lehigh at Bucknell Invitational | ",
 "Upcoming Feb 17 Women's · Lehigh at Patriot League Championships | ",
 "Upcoming Feb 26 Women's · Lehigh at ECAC Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Lehigh at Lehigh Hidden Duals | Completed",
 "Final Sep 18 Women's · Lehigh at Navy Invite | Completed",
 "Final Oct 15 Women's · Lehigh at ITA Northeast Regional | Completed",
 "Today Oct 23 Women's · Lehigh at PL Masters Qualifier | ",
 "Upcoming Oct 30 Women's · Lehigh at Dragon Invite at Drexel | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 26 Men's · Lehigh at Lehigh Invite | Completed",
 "Final Oct 9 Men's · Lehigh at Navy Invite | Completed",
 "Final Oct 15 Men's · Lehigh at ITA Regionals | Completed",
 "Today Oct 23 Men's · Lehigh at ITA Conference Masters | ",
 "Upcoming Oct 30 Men's · Lehigh at Army Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Lehigh vs Gardner-Webb | W, 3-0",
 "Final Aug 28 Lehigh vs Cleveland State | W, 3-0",
 "Final Aug 29 Lehigh vs Morgan State | W, 3-0",
 "Final Sep 4 Lehigh vs Quinnipiac | W, 3-1",
 "Final Sep 5 Lehigh vs New Jersey Institute of Technology | W, 3-0",
 "Final Sep 5 Lehigh at Delaware State | W, 3-1",
 "Final Sep 10 Lehigh vs Toledo | L, 1-3",
 "Final Sep 11 Lehigh at West Virginia | W, 3-2",
 "Final Sep 19 Lehigh vs Bucknell | W, 3-0",
 "Final Sep 20 Lehigh vs Lafayette College | W, 3-0",
 "Final Sep 25 Lehigh at American | L, 2-3",
 "Final Sep 26 Lehigh at Loyola University Maryland | L, 2-3",
 "Final Oct 2 Lehigh vs Colgate | W, 3-0",
 "Final Oct 3 Lehigh vs Holy Cross | W, 3-1",
 "Final Oct 10 Lehigh at Army | W, 3-1",
 "Final Oct 11 Lehigh at Navy | W, 3-0",
 "Upcoming Oct 23, 7:00 PM Lehigh at Lafayette College | ",
 "Today Oct 24, 4:00 PM Lehigh at Bucknell | ",
 "Upcoming Oct 30, 7:00 PM Lehigh vs American | ",
 "Upcoming Oct 31, 4:00 PM Lehigh vs Loyola University Maryland | ",
 "Upcoming Nov 6, 7:00 PM Lehigh at Colgate | ",
 "Upcoming Nov 7, 4:00 PM Lehigh at Holy Cross | ",
 "Upcoming Nov 13, 7:00 PM Lehigh vs Army | ",
 "Upcoming Nov 14, 4:00 PM Lehigh vs Navy | ",
 "Upcoming Nov 17 Lehigh at Patriot League Tournament - Quarterfinal | ",
 "Upcoming Nov 20 Lehigh at Patriot League Tournament - Semifinal | ",
 "Upcoming Nov 22 Lehigh at Patriot League Tournament - Final | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Lehigh at Princeton Open | ",
 "Upcoming Nov 6, 7:00 PM Lehigh vs Virginia Tech | ",
 "Upcoming Nov 7, 4:00 PM Lehigh at Indiana | ",
 "Upcoming Nov 8, 9:00 AM Lehigh at Journeymen Collegiate Classic | ",
 "Upcoming Nov 15, 1:00 PM Lehigh at Rutgers | ",
 "Upcoming Nov 21, 1:00 PM Lehigh at Pittsburgh | ",
 "Upcoming Dec 6, 2:00 PM Lehigh vs Penn State | ",
 "Upcoming Dec 18, 7:00 PM Lehigh vs Franklin & Marshall | ",
 "Upcoming Jan 9, 6:30 PM Lehigh at Cornell | ",
 "Upcoming Jan 15, 7:00 PM Lehigh at American | ",
 "Upcoming Jan 17, 2:00 PM Lehigh at Navy | ",
 "Upcoming Jan 23, 1:00 PM Lehigh vs Morgan State | ",
 "Upcoming Jan 24, 2:00 PM Lehigh vs Princeton | ",
 "Upcoming Jan 29, 7:30 PM Lehigh vs Army West Point | ",
 "Upcoming Feb 12, 6:00 PM Lehigh at Bucknell | ",
 "Upcoming Feb 14, 1:00 PM Lehigh at Penn | ",
 "Upcoming Feb 19, 7:00 PM Lehigh vs Arizona State | ",
 "Upcoming Mar 5 Lehigh at EIWA Championships | ",
 "Upcoming Mar 18 Lehigh at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Lehigh module checks passed");
