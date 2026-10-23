import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {manhattanSchool} from '../src/schools/manhattan.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='manhattan');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,manhattanHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/manhattan-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gojaspers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['manhattan'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',manhattanSchool.scheduleUrls],['roster',manhattanSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('manhattan|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gojaspers.com',`${key} must stay on gojaspers.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://gojaspers.com/sports/acrobatics-tumbling/schedule"],"roster":["https://gojaspers.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://gojaspers.com/sports/baseball/schedule"],"roster":["https://gojaspers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gojaspers.com/sports/mens-basketball/schedule","https://gojaspers.com/sports/womens-basketball/schedule"],"roster":["https://gojaspers.com/sports/mens-basketball/roster","https://gojaspers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gojaspers.com/sports/womens-cross-country/schedule","https://gojaspers.com/sports/mens-cross-country/schedule"],"roster":["https://gojaspers.com/sports/womens-cross-country/roster","https://gojaspers.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gojaspers.com/sports/womens-golf/schedule","https://gojaspers.com/sports/mens-golf/schedule"],"roster":["https://gojaspers.com/sports/womens-golf/roster","https://gojaspers.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gojaspers.com/sports/womens-lacrosse/schedule","https://gojaspers.com/sports/mens-lacrosse/schedule"],"roster":["https://gojaspers.com/sports/womens-lacrosse/roster","https://gojaspers.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://gojaspers.com/sports/womens-soccer/schedule","https://gojaspers.com/sports/mens-soccer/schedule"],"roster":["https://gojaspers.com/sports/womens-soccer/roster","https://gojaspers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gojaspers.com/sports/softball/schedule"],"roster":["https://gojaspers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gojaspers.com/sports/womens-swimming-and-diving/schedule","https://gojaspers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gojaspers.com/sports/womens-swimming-and-diving/roster","https://gojaspers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gojaspers.com/sports/womens-track-and-field/schedule","https://gojaspers.com/sports/mens-track-and-field/schedule"],"roster":["https://gojaspers.com/sports/womens-track-and-field/roster","https://gojaspers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gojaspers.com/sports/womens-volleyball/schedule","https://gojaspers.com/sports/mens-volleyball/schedule"],"roster":["https://gojaspers.com/sports/womens-volleyball/roster","https://gojaspers.com/sports/mens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'manhattan|"+sport+"':"),`${sport} routes must live in the Manhattan module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gojaspers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.manhattanHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=manhattan)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[
 "Upcoming Feb 6, 1:00 PM Manhattan at Morgan State | ",
 "Upcoming Feb 15, 1:00 PM Manhattan at Iona | ",
 "Upcoming Feb 21, 1:00 PM Manhattan vs Canisius | ",
 "Upcoming Feb 28, 4:00 PM Manhattan at La Salle | ",
 "Upcoming Mar 7, 6:00 PM Manhattan vs Baylor | ",
 "Upcoming Mar 27, 7:00 PM Manhattan vs LIU | ",
 "Upcoming Apr 9, 6:00 PM Manhattan vs Quinnipiac | ",
 "Upcoming Apr 22 Manhattan at NCAA Championships | "
]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 12:00 PM Manhattan vs La Salle | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Manhattan at Kentucky | ",
 "Upcoming Nov 5, 7:00 PM Men's · Manhattan vs UAlbany | ",
 "Upcoming Nov 8, 1:00 PM Men's · Manhattan at Maine | ",
 "Upcoming Nov 14, 6:00 PM Men's · Manhattan at Le Moyne | ",
 "Upcoming Nov 17, 7:00 PM Men's · Manhattan vs Fordham | ",
 "Upcoming Nov 20, 5:00 PM Men's · Manhattan at Miami | ",
 "Upcoming Nov 25, 2:00 PM Men's · Manhattan at NJIT | ",
 "Upcoming Nov 28, 2:00 PM Men's · Manhattan at Morgan State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Manhattan vs Saint Peter's | ",
 "Upcoming Dec 4, 7:00 PM Men's · Manhattan at Fairfield | ",
 "Upcoming Dec 8, 7:00 PM Men's · Manhattan vs Loyola (MD) | ",
 "Upcoming Dec 12, 2:00 PM Men's · Manhattan vs CCNY | ",
 "Upcoming Dec 17, 7:00 PM Men's · Manhattan at Wagner | ",
 "Upcoming Dec 20, 1:00 PM Men's · Manhattan at New Hampshire | ",
 "Upcoming Jan 1, 2:00 PM Men's · Manhattan vs Merrimack | ",
 "Upcoming Jan 3, 2:00 PM Men's · Manhattan at Mount St. Mary's | ",
 "Upcoming Jan 8, 7:00 PM Men's · Manhattan vs Quinnipiac | ",
 "Upcoming Jan 10, 2:00 PM Men's · Manhattan at Sacred Heart | ",
 "Upcoming Jan 13, 7:00 PM Men's · Manhattan at Marist | ",
 "Upcoming Jan 16, 1:00 PM Men's · Manhattan vs Rider | ",
 "Upcoming Jan 18, 2:00 PM Men's · Manhattan at Siena | ",
 "Upcoming Jan 22, 7:00 PM Men's · Manhattan vs Mount St. Mary's | ",
 "Upcoming Jan 24, 1:00 PM Men's · Manhattan at Merrimack | ",
 "Upcoming Jan 29, 7:00 PM Men's · Manhattan vs Niagara | ",
 "Upcoming Jan 31, 2:00 PM Men's · Manhattan vs Canisius | ",
 "Upcoming Feb 5, 7:00 PM Men's · Manhattan at Iona | ",
 "Upcoming Feb 7, 2:00 PM Men's · Manhattan vs Sacred Heart | ",
 "Upcoming Feb 11, 7:00 PM Men's · Manhattan at Quinnipiac | ",
 "Upcoming Feb 13, 7:00 PM Men's · Manhattan at Rider | ",
 "Upcoming Feb 19, 7:00 PM Men's · Manhattan vs Iona | ",
 "Upcoming Feb 21, 2:00 PM Men's · Manhattan at Saint Peter's | ",
 "Upcoming Feb 26, 7:00 PM Men's · Manhattan vs Siena | ",
 "Upcoming Mar 4 Men's · Manhattan at Metro First Round | ",
 "Upcoming Mar 5 Men's · Manhattan at 2026 Metro Men's Basketball Championships | ",
 "Upcoming Mar 7 Men's · Manhattan at Metro Semifinal | ",
 "Upcoming Mar 9 Men's · Manhattan at Metro Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Manhattan vs Pace | ",
 "Upcoming Nov 5, 6:30 PM Women's · Manhattan at UAlbany | ",
 "Upcoming Nov 8, 2:00 PM Women's · Manhattan vs Bryant | ",
 "Upcoming Nov 12, 7:00 PM Women's · Manhattan at FDU | ",
 "Upcoming Nov 15, 2:00 PM Women's · Manhattan vs Fordham | ",
 "Upcoming Nov 19, 7:00 PM Women's · Manhattan at LIU | ",
 "Upcoming Nov 27, 1:30 PM Women's · Manhattan vs Northern Illinois | ",
 "Upcoming Nov 29, 11:00 AM Women's · Manhattan vs FIU or North Dakota | ",
 "Upcoming Dec 2, 11:00 AM Women's · Manhattan vs Le Moyne | ",
 "Upcoming Dec 5, 2:00 PM Women's · Manhattan vs NJIT | ",
 "Upcoming Dec 15, 7:00 PM Women's · Manhattan vs CCSU | ",
 "Upcoming Dec 19, 6:00 PM Women's · Manhattan vs Fairfield | ",
 "Upcoming Dec 29, 6:00 PM Women's · Manhattan at Saint Peter's | ",
 "Upcoming Jan 1, 1:00 PM Women's · Manhattan at Merrimack | ",
 "Upcoming Jan 3, 6:00 PM Women's · Manhattan vs Mount St. Mary's | ",
 "Upcoming Jan 7, 6:30 PM Women's · Manhattan at Quinnipiac | ",
 "Upcoming Jan 9, 6:00 PM Women's · Manhattan vs Sacred Heart | ",
 "Upcoming Jan 13, 7:00 PM Women's · Manhattan vs Marist | ",
 "Upcoming Jan 16, 6:00 PM Women's · Manhattan at Rider | ",
 "Upcoming Jan 18, 6:00 PM Women's · Manhattan vs Siena | ",
 "Upcoming Jan 21, 7:00 PM Women's · Manhattan at Mount St. Mary's | ",
 "Upcoming Jan 23, 6:00 PM Women's · Manhattan vs Merrimack | ",
 "Upcoming Jan 28, 6:00 PM Women's · Manhattan at Niagara | ",
 "Upcoming Jan 30, 1:00 PM Women's · Manhattan at Canisius | ",
 "Upcoming Feb 4, 7:00 PM Women's · Manhattan vs Iona | ",
 "Upcoming Feb 6, 1:00 PM Women's · Manhattan at Sacred Heart | ",
 "Upcoming Feb 11, 7:00 PM Women's · Manhattan vs Quinnipiac | ",
 "Upcoming Feb 13, 2:00 PM Women's · Manhattan vs Rider | ",
 "Upcoming Feb 18, 6:00 PM Women's · Manhattan at Iona | ",
 "Upcoming Feb 20, 2:00 PM Women's · Manhattan vs Saint Peter's | ",
 "Upcoming Feb 25, 6:00 PM Women's · Manhattan at Siena | ",
 "Upcoming Mar 4 Women's · Manhattan at Metro Championship First Round | ",
 "Upcoming Mar 5 Women's · Manhattan at Metro Championship Quarterfinals | ",
 "Upcoming Mar 7 Women's · Manhattan at Metro Championship Semifinals | ",
 "Upcoming Mar 8 Women's · Manhattan at Metro Championship Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Manhattan at Columbia Dual | Completed",
 "Final Sep 19 Women's · Manhattan at Jasper Fall XC Invite | 11th of 12",
 "Final Oct 17 Women's · Manhattan at ECAC/IC4A Championships | 23rd of 26",
 "Upcoming Oct 31, 12:00 PM Women's · Manhattan at Metro Championship | ",
 "Upcoming Nov 13 Women's · Manhattan at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Women's · Manhattan at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Manhattan at Columbia Dual | Completed",
 "Final Sep 19 Men's · Manhattan at Jasper Fall XC Invite | 8th of 12",
 "Final Oct 17 Men's · Manhattan at ECAC/IC4A Championships | 22nd of 25",
 "Upcoming Oct 31, 11:00 AM Men's · Manhattan at Metro Championship | ",
 "Upcoming Nov 13 Men's · Manhattan at NCAA Northeast Regional | ",
 "Upcoming Nov 21 Men's · Manhattan at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 Women's · Manhattan at Bucknell Invitational | 11th of 15",
 "Final Sep 21 Women's · Manhattan at Red Bandanna Invitational | 12th of 15",
 "Final Sep 28 Women's · Manhattan at Autumn Harvest | 3rd of 11",
 "Final Oct 3 Women's · Manhattan at Navy Fall Invitational | 4th of 10",
 "Final Oct 12 Women's · Manhattan at Quinnipiac Classic | 3rd of 10",
 "Final Oct 19 Women's · Manhattan at Crusader Invitational | 2nd of 13"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Manhattan at Ryan T. Lee Memorial | 9th of 18",
 "Final Oct 3 Men's · Manhattan at Columbia Autumn Invitational | 10th of 13",
 "Final Oct 19 Men's · Manhattan at Blue Hen Intercollegiate | 6th of 14",
 "Upcoming Oct 26 Men's · Manhattan at Wykagyl Intercollegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Oct 24, 3:00 PM Men's · Manhattan vs LIU | ",
 "Upcoming Oct 24, 5:00 PM Men's · Manhattan at Fairfield | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Manhattan at Monmouth | L, 0-1",
 "Final Aug 16 Women's · Manhattan at LIU | W, 3-1",
 "Final Aug 23 Women's · Manhattan vs Wagner | W, 3-1",
 "Final Aug 31 Women's · Manhattan vs Delaware State | W, 3-0",
 "Final Sep 5 Women's · Manhattan at Siena | L, 0-1",
 "Final Sep 19 Women's · Manhattan vs Niagara | W, 1-0",
 "Final Sep 23 Women's · Manhattan at Marist | T, 0-0",
 "Final Sep 28 Women's · Manhattan vs Quinnipiac | W, 2-0",
 "Final Oct 3 Women's · Manhattan at Merrimack | T, 1-1",
 "Final Oct 7 Women's · Manhattan vs Rider | W, 1-0",
 "Final Oct 10 Women's · Manhattan at Mount St. Mary's | W, 2-1",
 "Final Oct 17 Women's · Manhattan vs Sacred Heart | T, 0-0",
 "Final Oct 21 Women's · Manhattan at Saint Peter's | W, 2-1",
 "Upcoming Oct 24, 1:30 PM Women's · Manhattan vs Fairfield | ",
 "Upcoming Oct 31, 1:00 PM Women's · Manhattan at Canisius | ",
 "Upcoming Nov 4, 3:00 PM Women's · Manhattan vs Iona | ",
 "Upcoming Nov 8 Women's · Manhattan at Metro Championship | ",
 "Upcoming Nov 12 Women's · Manhattan at Metro Championship | ",
 "Upcoming Nov 15 Women's · Manhattan at Metro Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 23 Men's · Manhattan at CCSU | L, 2-3",
 "Final Aug 28 Men's · Manhattan at NJIT | L, 1-4",
 "Final Sep 2 Men's · Manhattan vs Maritime | W, 3-0",
 "Final Sep 6 Men's · Manhattan vs Howard | W, 4-2",
 "Final Sep 12 Men's · Manhattan vs Columbia | L, 0-2",
 "Final Sep 18 Men's · Manhattan at UMass Lowell | L, 1-2",
 "Final Sep 26 Men's · Manhattan at Siena | T, 1-1",
 "Final Sep 30 Men's · Manhattan vs Quinnipiac | L, 1-3",
 "Final Oct 3 Men's · Manhattan at Fairfield | L, 0-3",
 "Final Oct 10 Men's · Manhattan vs Niagara | L, 1-2",
 "Final Oct 14 Men's · Manhattan at Saint Peter's | W, 1-0",
 "Final Oct 17 Men's · Manhattan vs Rider | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Men's · Manhattan at Merrimack | ",
 "Upcoming Oct 28, 6:00 PM Men's · Manhattan vs Sacred Heart | ",
 "Upcoming Oct 31, 5:00 PM Men's · Manhattan vs Marist | ",
 "Upcoming Nov 4, 1:00 PM Men's · Manhattan at Iona | ",
 "Upcoming Nov 7 Men's · Manhattan at Metro Conference Championships | ",
 "Upcoming Nov 11 Men's · Manhattan at Metro Conference Championships | ",
 "Upcoming Nov 14 Men's · Manhattan at Metro Conference Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Manhattan at Fairfield Invitational | Completed",
 "Final Oct 17 Women's · Manhattan at LIU | L, 47-197",
 "Upcoming Oct 24 Women's · Manhattan at Monmouth | ",
 "Upcoming Nov 7 Women's · Manhattan vs Stony Brook | ",
 "Upcoming Dec 4 Women's · Manhattan at ECAC Winter Championships | ",
 "Upcoming Jan 12 Women's · Manhattan at Stony Brook | ",
 "Upcoming Jan 16 Women's · Manhattan at Iona | ",
 "Upcoming Feb 17 Women's · Manhattan at Metro Conference Championships | ",
 "Upcoming Feb 26 Women's · Manhattan at ECAC Open Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Manhattan at Fairfield Invitational | Completed",
 "Final Oct 17 Men's · Manhattan at LIU | L, 71-189",
 "Upcoming Oct 24 Men's · Manhattan at Monmouth | ",
 "Upcoming Nov 7 Men's · Manhattan vs Saint Peter's | ",
 "Upcoming Dec 4 Men's · Manhattan at ECAC Winter Championships | ",
 "Upcoming Jan 16 Men's · Manhattan at Iona | ",
 "Upcoming Jan 23 Men's · Manhattan vs Felician | ",
 "Upcoming Feb 17 Men's · Manhattan at Metro Conference Championships | ",
 "Upcoming Feb 26 Men's · Manhattan at ECAC Open Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Manhattan at Temple | L, 0-3",
 "Final Aug 29 Women's · Manhattan vs Fordham | L, 2-3",
 "Final Sep 2 Women's · Manhattan at NJIT | L, 2-3",
 "Final Sep 4 Women's · Manhattan vs Santa Clara | L, 0-3",
 "Final Sep 5 Women's · Manhattan at Yale | L, 0-3",
 "Final Sep 5 Women's · Manhattan vs Hofstra | L, 0-3",
 "Final Sep 11 Women's · Manhattan at Providence | L, 0-3",
 "Final Sep 12 Women's · Manhattan vs Holy Cross | L, 1-3",
 "Final Sep 12 Women's · Manhattan vs Stonehill | L, 1-3",
 "Final Sep 15 Women's · Manhattan at CCSU | W, 3-2",
 "Final Sep 16 Women's · Manhattan at Bryant | L, 1-3",
 "Final Sep 25 Women's · Manhattan vs Merrimack | W, 3-1",
 "Final Sep 26 Women's · Manhattan vs Quinnipiac | L, 1-3",
 "Final Sep 29 Women's · Manhattan vs Iona | L, 0-3",
 "Final Oct 2 Women's · Manhattan at Siena | L, 1-3",
 "Final Oct 3 Women's · Manhattan at Marist | L, 1-3",
 "Final Oct 9 Women's · Manhattan vs Niagara | W, 3-2",
 "Final Oct 10 Women's · Manhattan vs Canisius | W, 3-2",
 "Final Oct 16 Women's · Manhattan at Saint Peter's | W, 3-1",
 "Final Oct 17 Women's · Manhattan at Rider | L, 1-3",
 "Today Oct 23, 5:00 PM Women's · Manhattan at Fairfield | ",
 "Upcoming Oct 24, 6:00 PM Women's · Manhattan at Sacred Heart | ",
 "Upcoming Oct 27, 5:00 PM Women's · Manhattan at Iona | ",
 "Upcoming Oct 30, 6:00 PM Women's · Manhattan vs Marist | ",
 "Upcoming Oct 31, 2:00 PM Women's · Manhattan vs Siena | ",
 "Upcoming Nov 6, 6:00 PM Women's · Manhattan at Quinnipiac | ",
 "Upcoming Nov 7, 2:00 PM Women's · Manhattan at Merrimack | ",
 "Upcoming Nov 13, 6:00 PM Women's · Manhattan vs Rider | ",
 "Upcoming Nov 14, 2:00 PM Women's · Manhattan vs Saint Peter's | ",
 "Upcoming Nov 17 Women's · Manhattan at Metro Championship (First Round) | ",
 "Upcoming Nov 20 Women's · Manhattan at Metro Championship (Semifinal) | ",
 "Upcoming Nov 23 Women's · Manhattan at Metro Championship (Final) | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Manhattan module checks passed");
