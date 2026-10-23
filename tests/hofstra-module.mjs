import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {hofstraSchool} from '../src/schools/hofstra.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='hofstra');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,hofstraHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/hofstra-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gohofstra.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['hofstra'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',hofstraSchool.scheduleUrls],['roster',hofstraSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('hofstra|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gohofstra.com',`${key} must stay on gohofstra.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gohofstra.com/sports/baseball/schedule"],"roster":["https://gohofstra.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gohofstra.com/sports/mens-basketball/schedule","https://gohofstra.com/sports/womens-basketball/schedule"],"roster":["https://gohofstra.com/sports/mens-basketball/roster","https://gohofstra.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gohofstra.com/sports/womens-cross-country/schedule","https://gohofstra.com/sports/mens-cross-country/schedule"],"roster":["https://gohofstra.com/sports/womens-cross-country/roster","https://gohofstra.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://gohofstra.com/sports/field-hockey/schedule"],"roster":["https://gohofstra.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://gohofstra.com/sports/womens-golf/schedule","https://gohofstra.com/sports/mens-golf/schedule"],"roster":["https://gohofstra.com/sports/womens-golf/roster","https://gohofstra.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gohofstra.com/sports/womens-lacrosse/schedule","https://gohofstra.com/sports/mens-lacrosse/schedule"],"roster":["https://gohofstra.com/sports/womens-lacrosse/roster","https://gohofstra.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://gohofstra.com/sports/womens-soccer/schedule","https://gohofstra.com/sports/mens-soccer/schedule"],"roster":["https://gohofstra.com/sports/womens-soccer/roster","https://gohofstra.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gohofstra.com/sports/softball/schedule"],"roster":["https://gohofstra.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gohofstra.com/sports/womens-tennis/schedule","https://gohofstra.com/sports/mens-tennis/schedule"],"roster":["https://gohofstra.com/sports/womens-tennis/roster","https://gohofstra.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://gohofstra.com/sports/womens-volleyball/schedule"],"roster":["https://gohofstra.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gohofstra.com/sports/wrestling/schedule"],"roster":["https://gohofstra.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'hofstra|"+sport+"':"),`${sport} routes must live in the Hofstra module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gohofstra.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.hofstraHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=hofstra)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 23, 1:00 PM Hofstra vs Wagner | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 11:30 AM Men's · Hofstra vs St. Joseph's Long Island | ",
 "Upcoming Nov 5, 7:00 PM Men's · Hofstra at Princeton | ",
 "Upcoming Nov 10, 7:00 PM Men's · Hofstra at Arizona State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Hofstra vs Iona | ",
 "Upcoming Nov 17, 11:00 AM Men's · Hofstra vs Murray State | ",
 "Upcoming Nov 27, 3:30 PM Men's · Hofstra vs Colgate | ",
 "Upcoming Nov 28, 3:30 PM Men's · Hofstra vs Merrimack | ",
 "Upcoming Nov 29, 2:30 PM Men's · Hofstra vs Vermont | ",
 "Upcoming Dec 1, 6:30 PM Men's · Hofstra at Saint Mary's | ",
 "Upcoming Dec 5, 1:00 PM Men's · Hofstra at LSU | ",
 "Upcoming Dec 8, 7:00 PM Men's · Hofstra at Columbia | ",
 "Upcoming Dec 12, 2:00 PM Men's · Hofstra at Quinnipiac | ",
 "Upcoming Dec 21, 7:00 PM Men's · Hofstra vs Bucknell | ",
 "Upcoming Dec 29, 7:00 PM Men's · Hofstra vs Molloy | ",
 "Upcoming Jan 2, 2:00 PM Men's · Hofstra vs Stony Brook | ",
 "Upcoming Jan 7, 7:00 PM Men's · Hofstra at Towson | ",
 "Upcoming Jan 9, 2:00 PM Men's · Hofstra vs William & Mary | ",
 "Upcoming Jan 14, 6:30 PM Men's · Hofstra at Elon | ",
 "Upcoming Jan 16, 2:00 PM Men's · Hofstra at Hampton | ",
 "Upcoming Jan 18, 7:00 PM Men's · Hofstra vs Drexel | ",
 "Upcoming Jan 21, 7:00 PM Men's · Hofstra vs Northeastern | ",
 "Upcoming Jan 23, 4:00 PM Men's · Hofstra vs UNCW | ",
 "Upcoming Jan 28, 7:00 PM Men's · Hofstra at Campbell | ",
 "Upcoming Jan 30, 2:00 PM Men's · Hofstra at Charleston | ",
 "Upcoming Feb 4, 7:00 PM Men's · Hofstra vs North Carolina A&T | ",
 "Upcoming Feb 6, 4:00 PM Men's · Hofstra vs Towson | ",
 "Upcoming Feb 11, 7:00 PM Men's · Hofstra at Northeastern | ",
 "Upcoming Feb 15, 8:30 PM Men's · Hofstra at Monmouth | ",
 "Upcoming Feb 18, 7:00 PM Men's · Hofstra vs Charleston | ",
 "Upcoming Feb 22, 7:00 PM Men's · Hofstra at Stony Brook | ",
 "Upcoming Feb 27, 2:00 PM Men's · Hofstra at Drexel | ",
 "Upcoming Mar 2, 7:00 PM Men's · Hofstra vs Monmouth | ",
 "Upcoming Mar 5 Men's · Hofstra at 2027 Coastal Athletic Association Championship First Round | ",
 "Upcoming Mar 6 Men's · Hofstra at 2027 Coastal Athletic Association Championship Second Round | ",
 "Upcoming Mar 7 Men's · Hofstra at 2027 Coastal Athletic Association Championship Quarterfinals | ",
 "Upcoming Mar 8 Men's · Hofstra at 2027 Coastal Athletic Association Championship Semifinals | ",
 "Upcoming Mar 9, 7:30 PM Men's · Hofstra at 2027 Coastal Athletic Association Championship Championship Game | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 10:30 AM Women's · Hofstra at Georgia Tech | ",
 "Upcoming Nov 7, 2:00 PM Women's · Hofstra vs Queens College | ",
 "Upcoming Nov 11, 6:00 PM Women's · Hofstra vs Coppin State | ",
 "Upcoming Nov 15, 1:00 PM Women's · Hofstra at Iona | ",
 "Upcoming Nov 24, 5:00 PM Women's · Hofstra at Penn | ",
 "Upcoming Nov 29, 3:00 PM Women's · Hofstra at Fordham | ",
 "Upcoming Dec 4, 6:00 PM Women's · Hofstra at Prairie View A&M | ",
 "Upcoming Dec 6, 11:00 AM Women's · Hofstra at Texas A&M | ",
 "Upcoming Dec 9, 6:00 PM Women's · Hofstra vs Wilmington (Del.) | ",
 "Upcoming Dec 12, 2:00 PM Women's · Hofstra vs UAlbany | ",
 "Upcoming Dec 21, 11:00 AM Women's · Hofstra vs Delaware State | ",
 "Upcoming Jan 1, 1:00 PM Women's · Hofstra at Northeastern | ",
 "Upcoming Jan 3, 1:00 PM Women's · Hofstra at Stony Brook | ",
 "Upcoming Jan 8, 6:00 PM Women's · Hofstra vs UNCW | ",
 "Upcoming Jan 10, 3:00 PM Women's · Hofstra vs Towson | ",
 "Upcoming Jan 15, 6:00 PM Women's · Hofstra vs Monmouth | ",
 "Upcoming Jan 22, 7:00 PM Women's · Hofstra at William & Mary | ",
 "Upcoming Jan 24, 2:00 PM Women's · Hofstra at Hampton | ",
 "Upcoming Jan 29, 11:00 AM Women's · Hofstra at Towson | ",
 "Upcoming Jan 31, 2:00 PM Women's · Hofstra vs Northeastern | ",
 "Upcoming Feb 5, 6:00 PM Women's · Hofstra vs Drexel | ",
 "Upcoming Feb 7, 1:00 PM Women's · Hofstra vs Campbell | ",
 "Upcoming Feb 12, 7:00 PM Women's · Hofstra at North Carolina A&T | ",
 "Upcoming Feb 14, 1:00 PM Women's · Hofstra at Elon | ",
 "Upcoming Feb 21, 1:00 PM Women's · Hofstra vs Charleston | ",
 "Upcoming Feb 26, 6:00 PM Women's · Hofstra at Drexel | ",
 "Upcoming Feb 28, 2:00 PM Women's · Hofstra at Monmouth | ",
 "Upcoming Mar 4, 6:00 PM Women's · Hofstra vs Stony Brook | ",
 "Upcoming Mar 6, 2:00 PM Women's · Hofstra vs North Carolina A&T | ",
 "Upcoming Mar 10 Women's · Hofstra at 2027 Coastal Athletic Association Championship First Round | ",
 "Upcoming Mar 11 Women's · Hofstra at 2027 Coastal Athletic Association Championship Second Round | ",
 "Upcoming Mar 12 Women's · Hofstra at 2027 Coastal Athletic Association Championship Quarterfinals | ",
 "Upcoming Mar 13 Women's · Hofstra at 2027 Coastal Athletic Association Championship Semifinals | ",
 "Upcoming Mar 14 Women's · Hofstra at 2027 Coastal Athletic Association Championship Championship Game | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Hofstra at Panther Cross Country Invitational | 6th Place/166 Points",
 "Final Oct 10 Women's · Hofstra at Metropolitan Championships | 2nd Place/55 Points",
 "Upcoming Oct 30, 11:00 AM Women's · Hofstra at CAA Cross Country Championship | ",
 "Upcoming Nov 13, 11:00 AM Women's · Hofstra at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Women's · Hofstra at NCAA Cross Country Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Hofstra at Panther Cross Country Invitational | 8th Place/267 Points",
 "Final Oct 10 Men's · Hofstra at Metropolitan Championships | 3rd Place/73 Points",
 "Upcoming Oct 30, 10:00 AM Men's · Hofstra at CAA Cross Country Championship | ",
 "Upcoming Nov 13, 12:00 PM Men's · Hofstra at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Men's · Hofstra at NCAA Cross Country Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Hofstra vs Rider | W, 2-1",
 "Final Aug 30 Hofstra vs Bryant | L, 1-2",
 "Final Sep 4 Hofstra at Wagner | W, 5-4",
 "Final Sep 11 Hofstra at Quinnipiac | L, 1-2",
 "Final Sep 13 Hofstra vs Providence | L, 1-2",
 "Final Sep 18 Hofstra vs Northeastern | L, 0-5",
 "Final Sep 20 Hofstra at Temple | L, 2-4",
 "Final Sep 25 Hofstra vs Monmouth | L, 0-4",
 "Final Oct 2 Hofstra at Fairfield | L, 0-4",
 "Final Oct 4 Hofstra vs UAlbany | L, 2-3",
 "Final Oct 9 Hofstra at Drexel | L, 1-6",
 "Final Oct 11 Hofstra at Villanova | L, 1-4",
 "Final Oct 16 Hofstra vs Sacred Heart | L, 1-5",
 "Final Oct 18 Hofstra vs Columbia | L, 1-2",
 "Today Oct 23, 3:00 PM Hofstra vs William & Mary | ",
 "Upcoming Oct 25, 1:00 PM Hofstra at Lehigh | ",
 "Upcoming Oct 30, 1:00 PM Hofstra at Towson | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Hofstra at Merrimack Invitational | 8th of 9",
 "Final Sep 21 Women's · Hofstra at Red Bandanna Invitational | 13th of 15",
 "Final Sep 28 Women's · Hofstra at SHU Fall Classic | 7th of 8",
 "Final Oct 3 Women's · Hofstra at Navy Fall Invitational | 8th of 10"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Hofstra at The Doc Gimmler | Completed",
 "Final Sep 19 Men's · Hofstra at Ryan T. Lee Memorial | 15th of 18",
 "Final Oct 12 Men's · Hofstra at SHU Fall Classic | 6th of 11",
 "Final Oct 19 Men's · Hofstra at Blue Hen Intercollegiate | 13th of 14",
 "Upcoming Oct 24 Men's · Hofstra at Lehigh Invitational | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 15 Women's · Hofstra at Saint Joseph's | L, 1-3",
 "Final Aug 21 Women's · Hofstra vs Columbia | T, 1-1",
 "Final Aug 27 Women's · Hofstra vs Fordham | L, 0-1",
 "Final Aug 30 Women's · Hofstra at Sacred Heart | L, 0-2",
 "Final Sep 3 Women's · Hofstra at Yale | W, 3-2",
 "Final Sep 10 Women's · Hofstra at FDU | L, 1-2",
 "Final Sep 13 Women's · Hofstra vs Brown | L, 1-2",
 "Final Sep 17 Women's · Hofstra vs Seton Hall | T, 0-0",
 "Final Sep 20 Women's · Hofstra vs Towson | W, 2-1",
 "Final Sep 24 Women's · Hofstra at Campbell | T, 1-1",
 "Final Sep 27 Women's · Hofstra at Elon | T, 1-1",
 "Final Oct 4 Women's · Hofstra at Northeastern | W, 2-1",
 "Final Oct 8 Women's · Hofstra vs William & Mary | L, 0-1",
 "Final Oct 11 Women's · Hofstra vs Hampton | W, 2-1",
 "Final Oct 18 Women's · Hofstra vs Monmouth | W, 3-2",
 "Upcoming Oct 25, 12:00 PM Women's · Hofstra at Drexel | ",
 "Upcoming Nov 1, 1:00 PM Women's · Hofstra vs Stony Brook | ",
 "Upcoming Nov 5 Women's · Hofstra at CAA Championship First Round | ",
 "Upcoming Nov 8 Women's · Hofstra at CAA Championship Semifinals | ",
 "Upcoming Nov 14 Women's · Hofstra at CAA Championship Championship Game | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Hofstra at Bucknell | W, 2-1",
 "Final Aug 23 Men's · Hofstra vs American | W, 2-0",
 "Final Aug 29 Men's · Hofstra at Stony Brook | T, 1-1",
 "Final Sep 1 Men's · Hofstra at St. John's | W, 2-1",
 "Final Sep 5 Men's · Hofstra vs Drexel | W, 1-0",
 "Final Sep 12 Men's · Hofstra at Monmouth | T, 1-1",
 "Final Sep 15 Men's · Hofstra vs Vermont | L, 0-1",
 "Final Sep 19 Men's · Hofstra vs Binghamton | W, 2-0",
 "Final Sep 22 Men's · Hofstra at Loyola Maryland | W, 2-0",
 "Final Sep 28 Men's · Hofstra vs Northeastern | W, 4-1",
 "Final Oct 3 Men's · Hofstra vs Stony Brook | L, 0-3",
 "Final Oct 6 Men's · Hofstra vs Princeton | T, 0-0",
 "Final Oct 10 Men's · Hofstra at Drexel | T, 1-1",
 "Final Oct 17 Men's · Hofstra vs Monmouth | W, 2-0",
 "Final Oct 20 Men's · Hofstra at Bryant | L, 1-2",
 "Upcoming Oct 24, 1:00 PM Men's · Hofstra at Northeastern | ",
 "Upcoming Oct 27, 7:00 PM Men's · Hofstra at Columbia | ",
 "Upcoming Nov 5 Men's · Hofstra at CAA Championship First Round | ",
 "Upcoming Nov 8 Men's · Hofstra at CAA Championship Semifinals | ",
 "Upcoming Nov 14 Men's · Hofstra at CAA Championship Championship Game | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Hofstra at Hofstra Invitational | Completed",
 "Final Sep 25 Women's · Hofstra at Columbia Invitational | Completed",
 "Final Oct 15 Women's · Hofstra at ITA Regional Championship | Completed",
 "Upcoming Oct 31, 10:00 AM Women's · Hofstra vs Seton Hall | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 17 Men's · Hofstra vs Queens | L, 1-6",
 "Final Sep 25 Men's · Hofstra at Hofstra Invitational | Completed",
 "Final Oct 3 Men's · Hofstra at Army West Point Invitational | Completed",
 "Final Oct 15 Men's · Hofstra at ITA Regional Championship | Completed",
 "Upcoming Nov 5 Men's · Hofstra at ITA East Sectional Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Hofstra vs High Point | W, 3-1",
 "Final Aug 30 Hofstra vs Connecticut | W, 3-0",
 "Final Aug 30 Hofstra at Penn State | L, 0-3",
 "Final Sep 4 Hofstra at Yale | L, 2-3",
 "Final Sep 5 Hofstra vs Santa Clara | W, 3-0",
 "Final Sep 5 Hofstra vs Manhattan | W, 3-0",
 "Final Sep 11 Hofstra vs Liberty | L, 2-3",
 "Final Sep 12 Hofstra vs Army West Point | W, 3-2",
 "Final Sep 18 Hofstra vs Hampton | W, 3-0",
 "Final Sep 19 Hofstra vs Hampton | W, 3-0",
 "Final Sep 25 Hofstra at Stony Brook | W, 3-0",
 "Final Sep 26 Hofstra at Stony Brook | W, 3-1",
 "Final Oct 2 Hofstra vs Campbell | W, 3-0",
 "Final Oct 3 Hofstra vs Campbell | W, 3-1",
 "Final Oct 9 Hofstra at UNCW | W, 3-2",
 "Final Oct 10 Hofstra at UNCW | L, 1-3",
 "Final Oct 16 Hofstra vs Northeastern | W, 3-0",
 "Final Oct 17 Hofstra vs Northeastern | W, 3-2",
 "Final Oct 22 Hofstra at William & Mary | W, 3-1",
 "Today Oct 23, 4:00 PM Hofstra at William & Mary | ",
 "Upcoming Nov 6, 5:00 PM Hofstra at Towson | ",
 "Upcoming Nov 7, 3:00 PM Hofstra at Towson | ",
 "Upcoming Nov 13, 3:00 PM Hofstra vs North Carolina A&T | ",
 "Upcoming Nov 14, 2:00 PM Hofstra vs North Carolina A&T | ",
 "Upcoming Nov 19 Hofstra at 2026 Coastal Athletic Association Championship Quarterfinals | ",
 "Upcoming Nov 20 Hofstra at 2026 Coastal Athletic Association Championship Semifinals | ",
 "Upcoming Nov 21 Hofstra at Championship Match | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Oct 22, 6:00 PM Hofstra vs Hofstra Blue-Gold Matches | ",
 "Upcoming Oct 31, 2:00 PM Hofstra vs Sacred Heart | ",
 "Upcoming Nov 7, 10:00 AM Hofstra at Appalachian State | ",
 "Upcoming Nov 7, 12:00 PM Hofstra at llinois | ",
 "Upcoming Nov 8, 9:00 AM Hofstra at Journeymen Collegiate Classic | ",
 "Upcoming Nov 15, 12:00 PM Hofstra at Brown | ",
 "Upcoming Nov 15, 4:00 PM Hofstra vs West Virginia | ",
 "Upcoming Nov 20, 7:00 PM Hofstra at Columbia | ",
 "Upcoming Nov 22, 9:00 AM Hofstra at CJ Morgan Invitational | ",
 "Upcoming Dec 4, 12:00 PM Hofstra at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 11, 7:00 PM Hofstra vs Army West Point | ",
 "Upcoming Dec 20, 2:00 PM Hofstra at Purdue | ",
 "Upcoming Dec 20, 4:00 PM Hofstra at Bucknell | ",
 "Upcoming Jan 3, 1:00 PM Hofstra vs Princeton | ",
 "Upcoming Jan 8, 9:00 AM Hofstra at Franklin and Marshall Lehman Open | ",
 "Upcoming Jan 10, 11:30 AM Hofstra vs Penn | ",
 "Upcoming Jan 23, 11:00 AM Hofstra vs Buffalo | ",
 "Upcoming Jan 24, 3:00 PM Hofstra vs Drexel | ",
 "Upcoming Feb 8, 7:00 PM Hofstra at LIU | ",
 "Upcoming Feb 13, 12:00 PM Hofstra vs Binghamton | ",
 "Upcoming Feb 13, 4:00 PM Hofstra vs Franklin and Marshall | ",
 "Upcoming Feb 16, 7:00 PM Hofstra at Rutgers | ",
 "Upcoming Feb 21, 9:00 AM Hofstra at George Mason Patriots Last Chance Open | ",
 "Upcoming Mar 5 Hofstra at EIWA Championships | ",
 "Upcoming Mar 18 Hofstra at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Hofstra module checks passed");
