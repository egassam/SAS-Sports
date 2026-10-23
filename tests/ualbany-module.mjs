import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ualbanySchool} from '../src/schools/ualbany.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ualbany');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ualbanyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ualbany-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ualbanysports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ualbany'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',ualbanySchool.scheduleUrls],['roster',ualbanySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ualbany|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ualbanysports.com',`${key} must stay on ualbanysports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ualbanysports.com/sports/baseball/schedule"],"roster":["https://ualbanysports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ualbanysports.com/sports/mens-basketball/schedule","https://ualbanysports.com/sports/womens-basketball/schedule"],"roster":["https://ualbanysports.com/sports/mens-basketball/roster","https://ualbanysports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ualbanysports.com/sports/womens-cross-country/schedule","https://ualbanysports.com/sports/mens-cross-country/schedule"],"roster":["https://ualbanysports.com/sports/womens-cross-country/roster","https://ualbanysports.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://ualbanysports.com/sports/field-hockey/schedule"],"roster":["https://ualbanysports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://ualbanysports.com/sports/football/schedule"],"roster":["https://ualbanysports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ualbanysports.com/sports/womens-golf/schedule"],"roster":["https://ualbanysports.com/sports/womens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://ualbanysports.com/sports/womens-lacrosse/schedule","https://ualbanysports.com/sports/mens-lacrosse/schedule"],"roster":["https://ualbanysports.com/sports/womens-lacrosse/roster","https://ualbanysports.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://ualbanysports.com/sports/womens-rowing/schedule"],"roster":["https://ualbanysports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://ualbanysports.com/sports/womens-soccer/schedule","https://ualbanysports.com/sports/mens-soccer/schedule"],"roster":["https://ualbanysports.com/sports/womens-soccer/roster","https://ualbanysports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ualbanysports.com/sports/softball/schedule"],"roster":["https://ualbanysports.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://ualbanysports.com/sports/womens-track-and-field/schedule","https://ualbanysports.com/sports/mens-track-and-field/schedule"],"roster":["https://ualbanysports.com/sports/womens-track-and-field/roster","https://ualbanysports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://ualbanysports.com/sports/womens-volleyball/schedule"],"roster":["https://ualbanysports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ualbany|"+sport+"':"),`${sport} routes must live in the UAlbany module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://ualbanysports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ualbanyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ualbany)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Men's · UAlbany vs Rhode Island College | ",
 "Upcoming Nov 5, 7:00 PM Men's · UAlbany at Manhattan | ",
 "Upcoming Nov 8, 2:00 PM Men's · UAlbany vs Merrimack | ",
 "Upcoming Nov 11, 1:00 PM Men's · UAlbany vs Dartmouth | ",
 "Upcoming Nov 15, 2:00 PM Men's · UAlbany at Holy Cross | ",
 "Upcoming Nov 20, 3:00 PM Men's · UAlbany vs Western Illinois | ",
 "Upcoming Nov 21, 4:00 PM Men's · UAlbany at Canisius | ",
 "Upcoming Nov 22, 3:30 PM Men's · UAlbany vs Mercyhurst | ",
 "Upcoming Nov 25, 6:00 PM Men's · UAlbany at Syracuse | ",
 "Upcoming Dec 1, 7:00 PM Men's · UAlbany at Penn State | ",
 "Upcoming Dec 5, 7:00 PM Men's · UAlbany vs Army | ",
 "Upcoming Dec 8, 7:00 PM Men's · UAlbany at Cornell | ",
 "Upcoming Dec 12, 7:00 PM Men's · UAlbany vs Siena | ",
 "Upcoming Dec 16, 7:00 PM Men's · UAlbany at St. Bonaventure | ",
 "Upcoming Dec 19, 4:00 PM Men's · UAlbany at Drexel | ",
 "Upcoming Dec 29, 6:30 PM Men's · UAlbany vs Columbia | ",
 "Upcoming Jan 7, 6:30 PM Men's · UAlbany vs Bryant | ",
 "Upcoming Jan 9, 4:00 PM Men's · UAlbany vs Binghamton | ",
 "Upcoming Jan 14, 11:00 AM Men's · UAlbany at NJIT | ",
 "Upcoming Jan 18 Men's · UAlbany at UMBC | ",
 "Upcoming Jan 21, 6:30 PM Men's · UAlbany vs New Hampshire | ",
 "Upcoming Jan 23, 2:00 PM Men's · UAlbany vs Maine | ",
 "Upcoming Jan 28 Men's · UAlbany at UMass Lowell | ",
 "Upcoming Jan 30, 6:00 PM Men's · UAlbany at Vermont | ",
 "Upcoming Feb 4, 6:30 PM Men's · UAlbany vs NJIT | ",
 "Upcoming Feb 6, 7:00 PM Men's · UAlbany vs UMBC | ",
 "Upcoming Feb 11, 6:00 PM Men's · UAlbany at Bryant | ",
 "Upcoming Feb 13, 7:00 PM Men's · UAlbany vs Vermont | ",
 "Upcoming Feb 17, 7:00 PM Men's · UAlbany at Binghamton | ",
 "Upcoming Feb 25, 6:00 PM Men's · UAlbany at New Hampshire | ",
 "Upcoming Feb 27, 2:00 PM Men's · UAlbany at Maine | ",
 "Upcoming Mar 2, 6:30 PM Men's · UAlbany vs UMass Lowell | ",
 "Upcoming Mar 6 Men's · UAlbany at America East Tournament Quarterfinals | ",
 "Upcoming Mar 9 Men's · UAlbany at America East Tournament Semifinals | ",
 "Upcoming Mar 13 Men's · UAlbany at America East Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:30 PM Women's · UAlbany vs St. Thomas Aquinas (Exhibition) | ",
 "Upcoming Nov 2 Women's · UAlbany at Northeastern | ",
 "Upcoming Nov 5, 6:30 PM Women's · UAlbany vs Manhattan | ",
 "Upcoming Nov 8 Women's · UAlbany at Mount St. Mary's | ",
 "Upcoming Nov 11 Women's · UAlbany at Ole Miss | ",
 "Upcoming Nov 16 Women's · UAlbany at Rutgers | ",
 "Upcoming Nov 18, 11:00 AM Women's · UAlbany vs Bucknell | ",
 "Upcoming Nov 21, 2:00 PM Women's · UAlbany vs Cornell | ",
 "Upcoming Nov 25, 2:00 PM Women's · UAlbany vs Union | ",
 "Upcoming Nov 29, 2:00 PM Women's · UAlbany vs Stonehill | ",
 "Upcoming Dec 5 Women's · UAlbany at Siena | ",
 "Upcoming Dec 8, 6:30 PM Women's · UAlbany vs Colgate | ",
 "Upcoming Dec 12 Women's · UAlbany at Hofstra | ",
 "Upcoming Dec 16 Women's · UAlbany at South Carolina | ",
 "Upcoming Dec 19, 2:00 PM Women's · UAlbany vs St. Bonaventure | ",
 "Upcoming Dec 21 Women's · UAlbany at UMass | ",
 "Upcoming Dec 31 Women's · UAlbany at UMass Lowell | ",
 "Upcoming Jan 7 Women's · UAlbany at Bryant | ",
 "Upcoming Jan 9, 1:00 PM Women's · UAlbany vs Binghamton | ",
 "Upcoming Jan 14, 6:30 PM Women's · UAlbany vs NJIT | ",
 "Upcoming Jan 16, 2:00 PM Women's · UAlbany vs UMBC | ",
 "Upcoming Jan 21 Women's · UAlbany at New Hampshire | ",
 "Upcoming Jan 23 Women's · UAlbany at Maine | ",
 "Upcoming Jan 28, 6:30 PM Women's · UAlbany vs UMass Lowell | ",
 "Upcoming Jan 30, 2:00 PM Women's · UAlbany vs Vermont | ",
 "Upcoming Feb 4 Women's · UAlbany at NJIT | ",
 "Upcoming Feb 6 Women's · UAlbany at UMBC | ",
 "Upcoming Feb 11, 11:00 AM Women's · UAlbany vs Bryant | ",
 "Upcoming Feb 13 Women's · UAlbany at Vermont | ",
 "Upcoming Feb 18 Women's · UAlbany at Binghamton | ",
 "Upcoming Feb 25, 6:30 PM Women's · UAlbany vs New Hampshire | ",
 "Upcoming Feb 27, 7:00 PM Women's · UAlbany vs Maine | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · UAlbany at Marist Season Opener | 2nd · 52 pts",
 "Final Sep 19 Women's · UAlbany at Jasper Fall Invite | 8th · 214 pts",
 "Final Oct 10 Women's · UAlbany at NJIT Invitational | 2nd · 50 pts",
 "Final Oct 16 Women's · UAlbany at R. Keith Munsey Invitational | 2nd · 40 pts",
 "Upcoming Oct 30 Women's · UAlbany at America East Championships | ",
 "Upcoming Nov 13 Women's · UAlbany at NCAA Northeast Regional Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · UAlbany at Marist Season Opener | 3rd · 60 pts",
 "Final Sep 19 Men's · UAlbany at Jasper Fall Invite | 11th · 315 pts",
 "Final Oct 10 Men's · UAlbany at NJIT Invitational | 2nd · 75 pts",
 "Final Oct 16 Men's · UAlbany at R. Keith Munsey Invitational | 3rd · 80 pts",
 "Upcoming Oct 30 Men's · UAlbany at America East Championships | ",
 "Upcoming Nov 13 Men's · UAlbany at NCAA Northeast Regional Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 UAlbany vs Wagner | W, 4-1",
 "Final Aug 30 UAlbany vs Boston College | W, 4-3",
 "Final Sep 4 UAlbany at Colgate | W, 4-2",
 "Final Sep 6 UAlbany at Yale | L, 1-9",
 "Final Sep 11 UAlbany at Columbia | L, 1-2",
 "Final Sep 18 UAlbany vs Rutgers | L, 2-7",
 "Final Sep 20 UAlbany vs UMass | L, 0-3",
 "Final Oct 2 UAlbany at Maine | L, 1-3",
 "Final Oct 4 UAlbany at Hofstra | W, 3-2",
 "Final Oct 9 UAlbany vs Bryant | W, 2-0",
 "Final Oct 11 UAlbany at Cornell | W, 3-2",
 "Final Oct 16 UAlbany vs Vermont | W, 3-1",
 "Final Oct 18 UAlbany vs Holy Cross | W, 3-1",
 "Today Oct 23, 12:00 PM UAlbany at New Hampshire | ",
 "Upcoming Oct 29, 2:00 PM UAlbany vs UMass Lowell | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 UAlbany vs New Hampshire | W, 28-14",
 "Final Sep 3 UAlbany at Buffalo | L, 17-21",
 "Final Sep 12 UAlbany at LIU | W, 35-13",
 "Final Sep 19 UAlbany vs Monmouth | L, 20-28",
 "Final Sep 26 UAlbany at Princeton | L, 0-22",
 "Final Oct 3 UAlbany vs Delaware State | W, 28-3",
 "Final Oct 17 UAlbany at Stony Brook | W, 48-31",
 "Upcoming Oct 24, 12:00 PM UAlbany at Rhode Island | ",
 "Upcoming Oct 31, 12:00 PM UAlbany vs Campbell | ",
 "Upcoming Nov 7, 1:00 PM UAlbany at Bryant | ",
 "Upcoming Nov 14, 12:00 PM UAlbany vs Maine | ",
 "Upcoming Nov 21, 12:00 PM UAlbany at North Carolina A&T | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 UAlbany at Bucknell Invitational | 5th",
 "Final Sep 18 UAlbany at Crosstown Challenge | 1st",
 "Final Sep 25 UAlbany at Princeton Invitational | 9th",
 "Final Oct 3 UAlbany at Yale Invitational | 7th",
 "Final Oct 11 UAlbany at UAlbany Doc Sauers Invitational | 1st"
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 UAlbany at Head of the Fish | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · UAlbany vs Boston University | L, 1-5",
 "Final Aug 20 Women's · UAlbany at Siena | L, 0-1",
 "Final Aug 23 Women's · UAlbany at CCSU | L, 0-2",
 "Final Aug 29 Women's · UAlbany vs Quinnipiac | L, 1-2",
 "Final Sep 3 Women's · UAlbany vs Stonehill | W, 2-1",
 "Final Sep 6 Women's · UAlbany vs Le Moyne | W, 2-1",
 "Final Sep 13 Women's · UAlbany vs Stony Brook | T, 2-2",
 "Final Sep 20 Women's · UAlbany at Maine | L, 0-2",
 "Final Sep 27 Women's · UAlbany vs NJIT | W, 2-0",
 "Final Oct 1 Women's · UAlbany vs Binghamton | L, 0-6",
 "Final Oct 4 Women's · UAlbany at UMBC | L, 0-5",
 "Final Oct 11 Women's · UAlbany vs UMass Lowell | W, 1-0",
 "Final Oct 18 Women's · UAlbany vs Bryant | W, 1-0",
 "Final Oct 22 Women's · UAlbany at Vermont | T, 2-2",
 "Upcoming Nov 1, 2:00 PM Women's · UAlbany at New Hampshire | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UAlbany at Michigan State | L, 2-6",
 "Final Aug 30 Men's · UAlbany vs Colgate | W, 3-0",
 "Final Sep 4 Men's · UAlbany at Dartmouth | W, 1-0",
 "Final Sep 8 Men's · UAlbany vs Siena | W, 2-1",
 "Final Sep 12 Men's · UAlbany vs Princeton | L, 0-1",
 "Final Sep 15 Men's · UAlbany at Marist | T, 2-2",
 "Final Sep 20 Men's · UAlbany at CCSU | W, 1-0",
 "Final Sep 26 Men's · UAlbany vs New Hampshire | W, 2-0",
 "Final Oct 3 Men's · UAlbany at UMass Lowell | W, 1-0",
 "Final Oct 10 Men's · UAlbany vs Bryant | L, 1-2",
 "Final Oct 13 Men's · UAlbany vs Northeastern | W, 2-0",
 "Final Oct 17 Men's · UAlbany at NJIT | L, 1-3",
 "Upcoming Oct 24, 6:00 PM Men's · UAlbany vs Vermont | ",
 "Upcoming Oct 30, 7:00 PM Men's · UAlbany at UMBC | ",
 "Upcoming Nov 3, 6:00 PM Men's · UAlbany at Binghamton | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 UAlbany vs Iowa | L, 1-3",
 "Final Aug 29 UAlbany vs Sacred Heart | L, 0-3",
 "Final Aug 30 UAlbany at Army | L, 2-3",
 "Final Sep 4 UAlbany vs Syracuse | L, 0-3",
 "Final Sep 5 UAlbany at Cornell | W, 3-2",
 "Final Sep 5 UAlbany vs Howard | W, 3-0",
 "Final Sep 11 UAlbany vs Dartmouth | L, 1-3",
 "Final Sep 12 UAlbany at Colgate | L, 1-3",
 "Final Sep 13 UAlbany vs Northeastern | W, 3-2",
 "Final Sep 17 UAlbany at Purdue | L, 0-3",
 "Final Sep 18 UAlbany vs UCF | L, 0-3",
 "Final Sep 25 UAlbany vs UMBC | L, 2-3",
 "Final Oct 2 UAlbany at NJIT | W, 3-1",
 "Final Oct 4 UAlbany vs New Hampshire | L, 0-3",
 "Final Oct 7 UAlbany at Siena | W, 3-1",
 "Final Oct 11 UAlbany at Binghamton | L, 2-3",
 "Final Oct 17 UAlbany at Bryant | L, 2-3",
 "Today Oct 23, 6:00 PM UAlbany vs NJIT | ",
 "Upcoming Nov 1, 1:00 PM UAlbany at UMBC | ",
 "Upcoming Nov 6, 6:00 PM UAlbany vs Binghamton | ",
 "Upcoming Nov 8 UAlbany vs Bryant | ",
 "Upcoming Nov 15, 1:00 PM UAlbany at New Hampshire | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UAlbany module checks passed");
