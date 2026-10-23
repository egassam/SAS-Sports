import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {umassLowellSchool} from '../src/schools/umass-lowell.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='umass-lowell');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,umassLowellHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/umass-lowell-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goriverhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['umass-lowell'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',umassLowellSchool.scheduleUrls],['roster',umassLowellSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('umass-lowell|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goriverhawks.com',`${key} must stay on goriverhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goriverhawks.com/sports/baseball/schedule"],"roster":["https://goriverhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goriverhawks.com/sports/mens-basketball/schedule","https://goriverhawks.com/sports/womens-basketball/schedule"],"roster":["https://goriverhawks.com/sports/mens-basketball/roster","https://goriverhawks.com/sports/womens-basketball/roster"],"combined":true},"Field Hockey":{"schedule":["https://goriverhawks.com/sports/field-hockey/schedule"],"roster":["https://goriverhawks.com/sports/field-hockey/roster"],"combined":false},"Hockey":{"schedule":["https://goriverhawks.com/sports/mens-ice-hockey/schedule"],"roster":["https://goriverhawks.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://goriverhawks.com/sports/womens-lacrosse/schedule","https://goriverhawks.com/sports/mens-lacrosse/schedule"],"roster":["https://goriverhawks.com/sports/womens-lacrosse/roster","https://goriverhawks.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://goriverhawks.com/sports/womens-soccer/schedule","https://goriverhawks.com/sports/mens-soccer/schedule"],"roster":["https://goriverhawks.com/sports/womens-soccer/roster","https://goriverhawks.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goriverhawks.com/sports/softball/schedule"],"roster":["https://goriverhawks.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://goriverhawks.com/sports/womens-track-and-field/schedule","https://goriverhawks.com/sports/mens-track-and-field/schedule"],"roster":["https://goriverhawks.com/sports/womens-track-and-field/roster","https://goriverhawks.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'umass-lowell|"+sport+"':"),`${sport} routes must live in the UMass Lowell module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goriverhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.umassLowellHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=umass-lowell)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UMass Lowell vs Rivier | ",
 "Upcoming Nov 5, 7:00 PM Men's · UMass Lowell at Merrimack | ",
 "Upcoming Nov 8, 1:00 PM Men's · UMass Lowell vs Marist | ",
 "Upcoming Nov 11, 7:00 PM Men's · UMass Lowell at Massachusetts | ",
 "Upcoming Nov 17, 6:00 PM Men's · UMass Lowell vs Saint Peter's | ",
 "Upcoming Nov 22, 2:00 PM Men's · UMass Lowell at Cincinnati | ",
 "Upcoming Nov 27, 1:00 PM Men's · UMass Lowell vs Hampton | ",
 "Upcoming Nov 28, 4:00 PM Men's · UMass Lowell at American | ",
 "Upcoming Nov 29, 1:00 PM Men's · UMass Lowell vs Radford | ",
 "Upcoming Dec 2, 6:30 PM Men's · UMass Lowell at Georgetown | ",
 "Upcoming Dec 5, 7:00 PM Men's · UMass Lowell at Boston College | ",
 "Upcoming Dec 9, 11:00 AM Men's · UMass Lowell at Sacred Heart | ",
 "Upcoming Dec 12, 2:00 PM Men's · UMass Lowell vs Stonehill | ",
 "Upcoming Dec 16, 6:00 PM Men's · UMass Lowell vs Fisher College (Mass.) | ",
 "Upcoming Dec 20, 1:00 PM Men's · UMass Lowell vs Boston University | ",
 "Upcoming Dec 29, 2:00 PM Men's · UMass Lowell vs Emerson | ",
 "Upcoming Jan 2, 2:00 PM Men's · UMass Lowell vs New Hampshire | ",
 "Upcoming Jan 7, 7:00 PM Men's · UMass Lowell at Vermont | ",
 "Upcoming Jan 9, 2:00 PM Men's · UMass Lowell vs Bryant | ",
 "Upcoming Jan 14, 6:00 PM Men's · UMass Lowell vs Binghamton | ",
 "Upcoming Jan 18, 2:00 PM Men's · UMass Lowell at Maine | ",
 "Upcoming Jan 23, 1:00 PM Men's · UMass Lowell at UMBC | ",
 "Upcoming Jan 28, 6:00 PM Men's · UMass Lowell vs UAlbany | ",
 "Upcoming Jan 30, 4:00 PM Men's · UMass Lowell at NJIT | ",
 "Upcoming Feb 4, 6:00 PM Men's · UMass Lowell vs Maine | ",
 "Upcoming Feb 6, 2:00 PM Men's · UMass Lowell at New Hampshire | ",
 "Upcoming Feb 13, 2:00 PM Men's · UMass Lowell at Binghamton | ",
 "Upcoming Feb 18, 6:00 PM Men's · UMass Lowell vs NJIT | ",
 "Upcoming Feb 20, 1:00 PM Men's · UMass Lowell vs UMBC | ",
 "Upcoming Feb 25, 6:00 PM Men's · UMass Lowell at Bryant | ",
 "Upcoming Feb 27, 5:00 PM Men's · UMass Lowell vs Vermont | ",
 "Upcoming Mar 2 Men's · UMass Lowell at UAlbany | ",
 "Upcoming Mar 6 Men's · UMass Lowell at America East Quarterfinals | ",
 "Upcoming Mar 9 Men's · UMass Lowell at America East Semifinals | ",
 "Upcoming Mar 13 Men's · UMass Lowell at America East Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 4:00 PM Women's · UMass Lowell vs Saint Anselm | ",
 "Upcoming Nov 5, 7:00 PM Women's · UMass Lowell vs Niagara | ",
 "Upcoming Nov 8, 12:00 PM Women's · UMass Lowell at Canisius | ",
 "Upcoming Nov 11, 6:00 PM Women's · UMass Lowell at Boston College | ",
 "Upcoming Nov 15, 12:00 PM Women's · UMass Lowell vs West Georgia | ",
 "Upcoming Nov 18, 6:00 PM Women's · UMass Lowell vs Central Connecticut State | ",
 "Upcoming Nov 22, 1:00 PM Women's · UMass Lowell at Merrimack | ",
 "Upcoming Nov 28, 2:00 PM Women's · UMass Lowell vs New Haven | ",
 "Upcoming Dec 2, 6:00 PM Women's · UMass Lowell vs Boston University | ",
 "Upcoming Dec 5, 4:00 PM Women's · UMass Lowell at Stonehill | ",
 "Upcoming Dec 9, 6:00 PM Women's · UMass Lowell vs Dartmouth | ",
 "Upcoming Dec 12, 1:00 PM Women's · UMass Lowell at Providence | ",
 "Upcoming Dec 16, 6:00 PM Women's · UMass Lowell at Massachusetts | ",
 "Upcoming Dec 22, 11:00 AM Women's · UMass Lowell at Northeastern | ",
 "Upcoming Dec 31, 2:00 PM Women's · UMass Lowell vs UAlbany | ",
 "Upcoming Jan 3, 1:00 PM Women's · UMass Lowell at New Hampshire | ",
 "Upcoming Jan 7, 11:00 AM Women's · UMass Lowell vs Vermont | ",
 "Upcoming Jan 9, 2:00 PM Women's · UMass Lowell at Bryant | ",
 "Upcoming Jan 14, 11:00 AM Women's · UMass Lowell at Binghamton | ",
 "Upcoming Jan 16, 2:00 PM Women's · UMass Lowell vs Maine | ",
 "Upcoming Jan 23, 5:00 PM Women's · UMass Lowell vs UMBC | ",
 "Upcoming Jan 28, 6:30 PM Women's · UMass Lowell at UAlbany | ",
 "Upcoming Jan 30, 2:00 PM Women's · UMass Lowell vs NJIT | ",
 "Upcoming Feb 4, 5:00 PM Women's · UMass Lowell at Maine | ",
 "Upcoming Feb 6, 2:00 PM Women's · UMass Lowell vs New Hampshire | ",
 "Upcoming Feb 13, 1:00 PM Women's · UMass Lowell vs Binghamton | ",
 "Upcoming Feb 18, 6:00 PM Women's · UMass Lowell at NJIT | ",
 "Upcoming Feb 20, 2:00 PM Women's · UMass Lowell at UMBC | ",
 "Upcoming Feb 25, 6:00 PM Women's · UMass Lowell vs Bryant | ",
 "Upcoming Feb 27, 2:00 PM Women's · UMass Lowell at Vermont | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 UMass Lowell at Stanford | L, 1-2",
 "Final Aug 30 UMass Lowell at UC Davis | W, 3-1",
 "Final Sep 4 UMass Lowell at Harvard | L, 1-5",
 "Final Sep 6 UMass Lowell at Massachusetts | L, 1-3",
 "Final Sep 11 UMass Lowell vs New Haven | W, 8-0",
 "Final Sep 13 UMass Lowell vs Merrimack | W, 3-0",
 "Final Sep 18 UMass Lowell at Syracuse | L, 2-3",
 "Final Sep 20 UMass Lowell vs Stonehill | W, 4-1",
 "Final Sep 27 UMass Lowell vs Brown | W, 2-0",
 "Final Oct 2 UMass Lowell vs Bryant | W, 1-0",
 "Final Oct 4 UMass Lowell at Providence | L, 0-1",
 "Final Oct 9 UMass Lowell at Vermont | L, 0-1",
 "Final Oct 11 UMass Lowell vs Sacred Heart | W, 3-2",
 "Final Oct 16 UMass Lowell at New Hampshire | W, 4-0",
 "Final Oct 18 UMass Lowell vs Dartmouth | L, 0-1",
 "Today Oct 23, 3:00 PM UMass Lowell vs Maine | ",
 "Upcoming Oct 29, 2:00 PM UMass Lowell at UAlbany | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 UMass Lowell vs Concordia (Exhibition) | W, 5-3",
 "Final Oct 9 UMass Lowell vs Clarkson | L, 2-3",
 "Final Oct 10 UMass Lowell vs St. Lawrence | W, 4-2",
 "Final Oct 16 UMass Lowell vs Arizona State | L, 4-5",
 "Final Oct 17 UMass Lowell vs Arizona State | L, 2-4",
 "Today Oct 23, 7:05 PM UMass Lowell vs Providence | ",
 "Upcoming Oct 24, 6:00 PM UMass Lowell at Providence | ",
 "Upcoming Oct 30, 7:30 PM UMass Lowell at Colgate | ",
 "Upcoming Oct 31, 7:30 PM UMass Lowell at Colgate | ",
 "Upcoming Nov 6, 7:14 PM UMass Lowell vs New Hampshire | ",
 "Upcoming Nov 7, 7:00 PM UMass Lowell at New Hampshire | ",
 "Upcoming Nov 13, 7:14 PM UMass Lowell vs Union | ",
 "Upcoming Nov 14, 4:05 PM UMass Lowell vs RPI | ",
 "Upcoming Nov 20, 7:14 PM UMass Lowell vs Vermont | ",
 "Upcoming Nov 21, 6:05 PM UMass Lowell vs Vermont | ",
 "Upcoming Dec 4, 7:00 PM UMass Lowell at Boston College | ",
 "Upcoming Dec 5, 6:05 PM UMass Lowell vs Boston College | ",
 "Upcoming Dec 11, 7:05 PM UMass Lowell vs Maine | ",
 "Upcoming Dec 28, 2:05 PM UMass Lowell vs Holy Cross (Exhibition) | ",
 "Upcoming Jan 1, 7:00 PM UMass Lowell at Princeton | ",
 "Upcoming Jan 2, 4:00 PM UMass Lowell at Princeton | ",
 "Upcoming Jan 7, 7:05 PM UMass Lowell vs UConn | ",
 "Upcoming Jan 9, 2:00 PM UMass Lowell at UConn | ",
 "Upcoming Jan 15, 7:14 PM UMass Lowell vs Boston University | ",
 "Upcoming Jan 16, 6:00 PM UMass Lowell at Boston University | ",
 "Upcoming Jan 22, 7:00 PM UMass Lowell at Maine | ",
 "Upcoming Jan 23, 7:00 PM UMass Lowell at Maine | ",
 "Upcoming Feb 2, 7:00 PM UMass Lowell at Massachusetts | ",
 "Upcoming Feb 5, 7:14 PM UMass Lowell vs Merrimack | ",
 "Upcoming Feb 6, 7:00 PM UMass Lowell at Merrimack | ",
 "Upcoming Feb 12, 7:14 PM UMass Lowell vs Northeastern | ",
 "Upcoming Feb 13, 6:05 PM UMass Lowell vs Northeastern | ",
 "Upcoming Feb 19, 7:00 PM UMass Lowell at Massachusetts | ",
 "Upcoming Feb 20, 6:05 PM UMass Lowell vs Massachusetts | ",
 "Upcoming Mar 5, 7:14 PM UMass Lowell vs Merrimack | ",
 "Upcoming Mar 6, 6:00 PM UMass Lowell at Boston University | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UMass Lowell at Providence | T, 1-1",
 "Final Aug 16 Women's · UMass Lowell vs Fairfield | L, 2-3",
 "Final Aug 20 Women's · UMass Lowell at Dartmouth | L, 1-2",
 "Final Aug 23 Women's · UMass Lowell vs Merrimack | W, 5-2",
 "Final Aug 30 Women's · UMass Lowell at Charleston | L, 0-3",
 "Final Sep 6 Women's · UMass Lowell at Massachusetts | L, 1-4",
 "Final Sep 10 Women's · UMass Lowell at Stonehill | W, 1-0",
 "Final Sep 13 Women's · UMass Lowell vs New Haven | W, 1-0",
 "Final Sep 20 Women's · UMass Lowell at Binghamton | T, 1-1",
 "Final Sep 27 Women's · UMass Lowell at Maine | T, 1-1",
 "Final Oct 1 Women's · UMass Lowell vs Vermont | T, 0-0",
 "Final Oct 11 Women's · UMass Lowell at UAlbany | L, 0-1",
 "Final Oct 18 Women's · UMass Lowell vs UMBC | W, 2-0",
 "Final Oct 22 Women's · UMass Lowell vs New Hampshire | L, 3-4",
 "Upcoming Oct 25, 1:00 PM Women's · UMass Lowell at NJIT | ",
 "Upcoming Nov 1, 1:00 PM Women's · UMass Lowell vs Bryant | ",
 "Upcoming Nov 5 Women's · UMass Lowell at America East Quarterfinals | ",
 "Upcoming Nov 8 Women's · UMass Lowell at America East Semifinals | ",
 "Upcoming Nov 15 Women's · UMass Lowell at America East Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UMass Lowell at Incarnate Word | T, 1-1",
 "Final Aug 23 Men's · UMass Lowell at Houston Christian | L, 0-1",
 "Final Aug 27 Men's · UMass Lowell vs CCSU | W, 2-1",
 "Final Sep 2 Men's · UMass Lowell at Massachusetts | L, 0-1",
 "Final Sep 8 Men's · UMass Lowell vs Holy Cross | T, 0-0",
 "Final Sep 12 Men's · UMass Lowell at Iona | W, 5-2",
 "Final Sep 15 Men's · UMass Lowell at Merrimack | W, 1-0",
 "Final Sep 18 Men's · UMass Lowell vs Manhattan | W, 2-1",
 "Final Sep 26 Men's · UMass Lowell at UMBC | W, 3-2",
 "Final Oct 3 Men's · UMass Lowell vs UAlbany | L, 0-1",
 "Final Oct 10 Men's · UMass Lowell at Binghamton | L, 1-2",
 "Final Oct 17 Men's · UMass Lowell vs Bryant | T, 0-0",
 "Upcoming Oct 24, 6:00 PM Men's · UMass Lowell vs NJIT | ",
 "Upcoming Oct 30, 6:00 PM Men's · UMass Lowell at New Hampshire | ",
 "Upcoming Nov 3, 6:00 PM Men's · UMass Lowell vs Vermont | ",
 "Upcoming Nov 7 Men's · UMass Lowell at America East Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UMass Lowell module checks passed");
