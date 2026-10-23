import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {wagnerSchool} from '../src/schools/wagner.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='wagner');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,wagnerHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/wagner-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit wagnerathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['wagner'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',wagnerSchool.scheduleUrls],['roster',wagnerSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('wagner|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'wagnerathletics.com',`${key} must stay on wagnerathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://wagnerathletics.com/sports/baseball/schedule"],"roster":["https://wagnerathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://wagnerathletics.com/sports/mens-basketball/schedule","https://wagnerathletics.com/sports/womens-basketball/schedule"],"roster":["https://wagnerathletics.com/sports/mens-basketball/roster","https://wagnerathletics.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://wagnerathletics.com/sports/bowling/schedule"],"roster":["https://wagnerathletics.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://wagnerathletics.com/sports/womens-cross-country/schedule","https://wagnerathletics.com/sports/mens-cross-country/schedule"],"roster":["https://wagnerathletics.com/sports/womens-cross-country/roster","https://wagnerathletics.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://wagnerathletics.com/sports/womens-fencing/schedule","https://wagnerathletics.com/sports/mens-fencing/schedule"],"roster":["https://wagnerathletics.com/sports/womens-fencing/roster","https://wagnerathletics.com/sports/mens-fencing/roster"],"combined":true},"Field Hockey":{"schedule":["https://wagnerathletics.com/sports/field-hockey/schedule"],"roster":["https://wagnerathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://wagnerathletics.com/sports/football/schedule"],"roster":["https://wagnerathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://wagnerathletics.com/sports/womens-golf/schedule","https://wagnerathletics.com/sports/mens-golf/schedule"],"roster":["https://wagnerathletics.com/sports/womens-golf/roster","https://wagnerathletics.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://wagnerathletics.com/sports/womens-lacrosse/schedule","https://wagnerathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://wagnerathletics.com/sports/womens-lacrosse/roster","https://wagnerathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://wagnerathletics.com/sports/womens-soccer/schedule"],"roster":["https://wagnerathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://wagnerathletics.com/sports/softball/schedule"],"roster":["https://wagnerathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://wagnerathletics.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://wagnerathletics.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://wagnerathletics.com/sports/womens-tennis/schedule","https://wagnerathletics.com/sports/mens-tennis/schedule"],"roster":["https://wagnerathletics.com/sports/womens-tennis/roster","https://wagnerathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://wagnerathletics.com/sports/womens-track-and-field/schedule","https://wagnerathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://wagnerathletics.com/sports/womens-track-and-field/roster","https://wagnerathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://wagnerathletics.com/sports/triathlon/schedule"],"roster":["https://wagnerathletics.com/sports/triathlon/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'wagner|"+sport+"':"),`${sport} routes must live in the Wagner module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://wagnerathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.wagnerHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=wagner)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 7:18 PM Men's · Wagner at Staten Island (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Wagner at Boston College | ",
 "Upcoming Nov 6, 9:00 PM Men's · Wagner at Miami | ",
 "Upcoming Nov 9, 7:00 PM Men's · Wagner at UConn | ",
 "Upcoming Nov 11, 7:00 PM Men's · Wagner vs Bryant & Stratton - Albany | ",
 "Upcoming Nov 17, 7:00 PM Men's · Wagner at Saint Joseph's | ",
 "Upcoming Nov 20, 7:00 PM Men's · Wagner at Maryland | ",
 "Upcoming Nov 24, 5:00 PM Men's · Wagner vs Bloomsburg | ",
 "Upcoming Dec 1, 6:30 PM Men's · Wagner at Marquette | ",
 "Upcoming Dec 4, 7:00 PM Men's · Wagner at High Point | ",
 "Upcoming Dec 8, 6:30 PM Men's · Wagner at St. John's | ",
 "Upcoming Dec 12, 1:00 PM Men's · Wagner vs UMBC | ",
 "Upcoming Dec 17, 7:00 PM Men's · Wagner vs Manhattan | ",
 "Upcoming Dec 23, 1:00 PM Men's · Wagner vs NJIT | ",
 "Upcoming Jan 2, 2:00 PM Men's · Wagner at Stonehill | ",
 "Upcoming Jan 4, 7:00 PM Men's · Wagner at CCSU | ",
 "Upcoming Jan 8, 1:00 PM Men's · Wagner at New Haven | ",
 "Upcoming Jan 10, 1:00 PM Men's · Wagner vs Chicago State | ",
 "Upcoming Jan 14, 7:00 PM Men's · Wagner vs Mercyhurst | ",
 "Upcoming Jan 16, 1:00 PM Men's · Wagner vs Le Moyne | ",
 "Upcoming Jan 20, 11:00 AM Men's · Wagner at Chicago State | ",
 "Upcoming Jan 28, 7:00 PM Men's · Wagner at FDU | ",
 "Upcoming Jan 30, 1:00 PM Men's · Wagner vs LIU | ",
 "Upcoming Feb 4, 7:00 PM Men's · Wagner vs Stonehill | ",
 "Upcoming Feb 6, 1:00 PM Men's · Wagner vs New Haven | ",
 "Upcoming Feb 13, 1:00 PM Men's · Wagner at LIU | ",
 "Upcoming Feb 17, 7:00 PM Men's · Wagner vs FDU | ",
 "Upcoming Feb 20, 1:00 PM Men's · Wagner vs CCSU | ",
 "Upcoming Feb 25, 7:00 PM Men's · Wagner at Le Moyne | ",
 "Upcoming Feb 27, 2:00 PM Men's · Wagner at Mercyhurst | ",
 "Upcoming Mar 3 Men's · Wagner at NEC Quarterfinals | ",
 "Upcoming Mar 6 Men's · Wagner at NEC Semifinals | ",
 "Upcoming Mar 9 Men's · Wagner at NEC Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Wagner vs SUNY Cortland | ",
 "Upcoming Nov 5, 8:30 PM Women's · Wagner at Lafayette | ",
 "Upcoming Nov 7, 1:00 PM Women's · Wagner at St. John's | ",
 "Upcoming Nov 12, 7:00 PM Women's · Wagner vs Rhode Island | ",
 "Upcoming Nov 20, 7:00 PM Women's · Wagner vs Rider | ",
 "Upcoming Nov 24, 6:00 PM Women's · Wagner at Cornell | ",
 "Upcoming Dec 2, 7:00 PM Women's · Wagner vs Iona | ",
 "Upcoming Dec 6, 2:00 PM Women's · Wagner vs Columbia | ",
 "Upcoming Dec 10, 6:00 PM Women's · Wagner at Siena | ",
 "Upcoming Dec 13, 3:00 PM Women's · Wagner at Marquette | ",
 "Upcoming Dec 19, 1:00 PM Women's · Wagner at Seton Hall | ",
 "Upcoming Dec 30, 2:00 PM Women's · Wagner vs SUNY New Paltz | ",
 "Upcoming Jan 2, 2:00 PM Women's · Wagner vs Stonehill | ",
 "Upcoming Jan 6, 7:00 PM Women's · Wagner vs New Haven | ",
 "Upcoming Jan 9, 1:00 PM Women's · Wagner at Chicago State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Wagner at Mercyhurst | ",
 "Upcoming Jan 16, 1:00 PM Women's · Wagner at Le Moyne | ",
 "Upcoming Jan 20, 7:00 PM Women's · Wagner vs Chicago State | ",
 "Upcoming Jan 28, 7:00 PM Women's · Wagner vs FDU | ",
 "Upcoming Jan 30, 2:00 PM Women's · Wagner at LIU | ",
 "Upcoming Feb 4, 6:00 PM Women's · Wagner at Stonehill | ",
 "Upcoming Feb 6, 1:00 PM Women's · Wagner at New Haven | ",
 "Upcoming Feb 13, 2:00 PM Women's · Wagner vs LIU | ",
 "Upcoming Feb 18 Women's · Wagner at FDU | ",
 "Upcoming Feb 20 Women's · Wagner at CCSU | ",
 "Upcoming Feb 25, 7:00 PM Women's · Wagner vs Le Moyne | ",
 "Upcoming Feb 27, 2:00 PM Women's · Wagner vs Mercyhurst | ",
 "Upcoming Mar 4, 7:00 PM Women's · Wagner vs CCSU | ",
 "Upcoming Mar 8 Women's · Wagner at NEC Quarterfinal | ",
 "Upcoming Mar 11 Women's · Wagner at NEC Semifinal | ",
 "Upcoming Mar 14 Women's · Wagner at NEC Championship | "
]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[
 "Final Oct 10 Wagner at Bud Whitman Memorial | Completed",
 "Upcoming Oct 24 Wagner at Seahawk Classic | ",
 "Upcoming Nov 13 Wagner at NEC Meet #1 | ",
 "Upcoming Nov 20 Wagner at Jersey Jamboree | ",
 "Upcoming Jan 15 Wagner at Northeast Classic | ",
 "Upcoming Jan 29 Wagner at Eastern Intercollegiate Bowling Tournament | ",
 "Upcoming Feb 12 Wagner at NEC Meet #2 | ",
 "Upcoming Feb 27 Wagner at Dr. Robert Cincotta Memorial | ",
 "Upcoming Mar 13 Wagner at Northeast Region Roundup | ",
 "Upcoming Mar 19 Wagner at NEC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · Wagner at Back to the Bowl | 2nd of 8",
 "Final Sep 18 Women's · Wagner at LIU Fall Festival | 2nd of 4",
 "Final Oct 17 Women's · Wagner at IC4A/ECAC Cross Country Championships | Completed",
 "Upcoming Oct 31 Women's · Wagner at NEC Championship | ",
 "Upcoming Nov 13 Women's · Wagner at NCAA Northeast Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · Wagner at Back to the Bowl | 3rd of 11",
 "Final Sep 18 Men's · Wagner at LIU Fall Festival | 3rd of 5",
 "Final Oct 17 Men's · Wagner at IC4A/ECAC Cross Country Championships | 24th of 25",
 "Upcoming Oct 31 Men's · Wagner at NEC Championship | ",
 "Upcoming Nov 13 Men's · Wagner at NCAA Northeast Regional Championships | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Oct 24 Women's · Wagner at Coach Nikki Franke Classic | ",
 "Upcoming Nov 1 Women's · Wagner at NYU Invitational | ",
 "Upcoming Nov 8 Women's · Wagner at Drew Invitational | ",
 "Upcoming Nov 22 Women's · Wagner at Vassar Invitational | ",
 "Upcoming Dec 6 Women's · Wagner at Seahawk Challenge | ",
 "Upcoming Jan 13 Women's · Wagner at Princeton | ",
 "Upcoming Jan 13 Women's · Wagner at NJIT | ",
 "Upcoming Jan 16 Women's · Wagner at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 23 Women's · Wagner at Penn State Invitational | ",
 "Upcoming Jan 31 Women's · Wagner at Brian Palestis Memorial Invitational | ",
 "Upcoming Feb 28 Women's · Wagner at East Coast Fencing Conference Championships | ",
 "Upcoming Mar 13 Women's · Wagner at NCAA | ",
 "Upcoming Mar 25 Women's · Wagner at NCAA | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Oct 25 Men's · Wagner at Coach Nikki Franke Classic | ",
 "Upcoming Nov 1 Men's · Wagner at NYU Invitational | ",
 "Upcoming Nov 8 Men's · Wagner at Drew Invitational | ",
 "Upcoming Nov 22 Men's · Wagner at Vassar Invitational | ",
 "Upcoming Dec 6 Men's · Wagner at Seahawk Challenge | ",
 "Upcoming Jan 13 Men's · Wagner at Princeton | ",
 "Upcoming Jan 13 Men's · Wagner at NJIT | ",
 "Upcoming Jan 16 Men's · Wagner at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 23 Men's · Wagner at Penn State Invitational | ",
 "Upcoming Jan 31 Men's · Wagner at Brian Palestis Memorial Invitational | ",
 "Upcoming Feb 27 Men's · Wagner at East Coast Fencing Conference Championships | ",
 "Upcoming Mar 13 Men's · Wagner at NCAA | ",
 "Upcoming Mar 25 Men's · Wagner at NCAA | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Wagner at UAlbany | L, 1-4",
 "Final Aug 30 Wagner vs Rutgers | L, 1-7",
 "Final Sep 4 Wagner vs Hofstra | L, 4-5",
 "Final Sep 6 Wagner vs Temple | L, 1-2",
 "Final Sep 11 Wagner at Drexel | L, 0-7",
 "Final Sep 13 Wagner at Monmouth | L, 1-8",
 "Final Sep 18 Wagner at Mercyhurst | W, 3-0",
 "Final Sep 20 Wagner vs Lehigh | W, 4-1",
 "Final Sep 24 Wagner vs LIU | W, 6-0",
 "Final Oct 2 Wagner at Quinnipiac | W, 2-1",
 "Final Oct 9 Wagner vs Sacred Heart | W, 2-0",
 "Final Oct 16 Wagner at Rider | W, 2-1",
 "Final Oct 18 Wagner vs Stonehill | W, 1-0",
 "Today Oct 23, 7:00 PM Wagner at Merrimack | ",
 "Upcoming Oct 25, 12:00 PM Wagner vs Villanova | ",
 "Upcoming Oct 30, 3:00 PM Wagner vs New Haven | ",
 "Upcoming Nov 5 Wagner at NEC Semifinals | ",
 "Upcoming Nov 7 Wagner at NEC Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Wagner vs Robert Morris | L, 7-28",
 "Final Sep 5 Wagner vs Southern Connecticut State | W, 31-7",
 "Final Sep 12 Wagner at James Madison | L, 3-87",
 "Final Sep 19 Wagner at California | L, 7-49",
 "Final Oct 3 Wagner at CCSU | L, 14-45",
 "Final Oct 10 Wagner vs Princeton | L, 13-28",
 "Final Oct 17 Wagner vs LIU | L, 9-14",
 "Upcoming Oct 24, 12:00 PM Wagner at Duquesne | ",
 "Upcoming Oct 31, 12:00 PM Wagner at Merrimack | ",
 "Upcoming Nov 7, 12:00 PM Wagner at Mercyhurst | ",
 "Upcoming Nov 14, 12:00 PM Wagner vs New Haven | ",
 "Upcoming Nov 21, 12:00 PM Wagner at Stonehill | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 Women's · Wagner at Fall Women's Golf Schedule | 10th of 15",
 "Final Sep 28 Women's · Wagner at Fall Women's Golf Schedule | 4th of 11",
 "Final Oct 12 Women's · Wagner at Fall Women's Golf Schedule | 7th of 10",
 "Final Oct 18 Women's · Wagner at Fall Women's Golf Schedule | 1st of 4",
 "Upcoming Oct 25 Women's · Wagner at Fall Women's Golf Schedule | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Wagner at Fall Men's Golf Schedule | 10th of 11",
 "Final Sep 20 Men's · Wagner at Fall Men's Golf Schedule | 6th of 7",
 "Final Oct 4 Men's · Wagner at Fall Men's Golf Schedule | 12th of 13",
 "Final Oct 12 Men's · Wagner at Fall Men's Golf Schedule | 16th of 18"
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Wagner vs Rider | L, 0-1",
 "Final Aug 16 Wagner vs Monmouth | W, 2-1",
 "Final Aug 23 Wagner at Manhattan | L, 1-3",
 "Final Aug 30 Wagner at Lafayette | L, 0-2",
 "Final Sep 3 Wagner vs NJIT | L, 0-1",
 "Final Sep 6 Wagner at UMBC | L, 0-1",
 "Final Sep 10 Wagner at Seton Hall | T, 0-0",
 "Final Sep 13 Wagner at Saint Joseph's | T, 0-0",
 "Final Sep 20 Wagner vs CCSU | W, 2-1",
 "Final Sep 27 Wagner vs Howard | W, 1-0",
 "Final Oct 1 Wagner at New Haven | W, 3-0",
 "Final Oct 4 Wagner vs Stonehill | L, 0-2",
 "Final Oct 11 Wagner at LIU | W, 4-0",
 "Final Oct 15 Wagner at FDU | L, 1-2",
 "Upcoming Oct 25, 12:00 PM Wagner at Chicago State | ",
 "Upcoming Oct 29, 1:00 PM Wagner at Mercyhurst | ",
 "Upcoming Nov 1, 1:00 PM Wagner vs Le Moyne | ",
 "Upcoming Nov 8, 1:00 PM Wagner vs Delaware State | ",
 "Upcoming Nov 12 Wagner at NEC Semifinals | ",
 "Upcoming Nov 15 Wagner at NEC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Oct 4 Wagner vs Monroe | W, 13-1",
 "Final Oct 10 Wagner at Rutgers | L, 4-14",
 "Final Oct 17 Wagner vs Dominican NY (Game 1) | W, 10-4",
 "Final Oct 17 Wagner vs Dominican NY (Game 2) | W, 9-1"
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · Wagner at Iona | L, 51-172",
 "Final Oct 17 Women's · Wagner vs Sacred Heart | L, 51-184",
 "Upcoming Oct 24, 11:00 AM Women's · Wagner at Monmouth | ",
 "Upcoming Oct 24, 11:00 AM Women's · Wagner vs Manhattan | ",
 "Upcoming Oct 30, 4:00 PM Women's · Wagner at Southern Connecticut State | ",
 "Upcoming Oct 30, 4:00 PM Women's · Wagner vs CCSU | ",
 "Upcoming Nov 7, 11:00 AM Women's · Wagner at LIU | ",
 "Upcoming Nov 20 Women's · Wagner at Harold Anderson Invitational | ",
 "Upcoming Jan 23, 11:00 AM Women's · Wagner at Seton Hall | ",
 "Upcoming Jan 23, 11:00 AM Women's · Wagner vs Saint Peter's | ",
 "Upcoming Jan 29 Women's · Wagner vs LIU | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Wagner at Fall Women's Tennis Schedule | Completed",
 "Final Oct 2 Women's · Wagner at Fordham Four Invite | Completed",
 "Final Oct 7 Women's · Wagner at Monmouth | W, 6-1",
 "Final Oct 15 Women's · Wagner at ITA Regionals | Completed",
 "Upcoming Nov 6, 2:30 PM Women's · Wagner at Iona | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Wagner at Fall Men's Tennis Schedule | Completed",
 "Final Oct 6 Men's · Wagner at Monmouth | Completed",
 "Final Oct 10 Men's · Wagner at Fordham Invitational | Completed",
 "Final Oct 15 Men's · Wagner at ITA Regionals | Completed",
 "Upcoming Nov 6, 2:30 PM Men's · Wagner at Iona | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 19 Wagner at Duquesne Invitational | Completed",
 "Final Oct 4 Wagner at Navy Collegiate Cup | Completed",
 "Final Oct 17 Wagner at NCAA East Regional | Completed",
 "Upcoming Nov 8 Wagner at NCAA Nationals | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Wagner module checks passed");
