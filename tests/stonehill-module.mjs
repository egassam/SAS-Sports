import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {stonehillSchool} from '../src/schools/stonehill.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='stonehill');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,stonehillHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/stonehill-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit stonehillskyhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['stonehill'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',stonehillSchool.scheduleUrls],['roster',stonehillSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('stonehill|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'stonehillskyhawks.com',`${key} must stay on stonehillskyhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://stonehillskyhawks.com/sports/baseball/schedule"],"roster":["https://stonehillskyhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://stonehillskyhawks.com/sports/mens-basketball/schedule","https://stonehillskyhawks.com/sports/womens-basketball/schedule"],"roster":["https://stonehillskyhawks.com/sports/mens-basketball/roster","https://stonehillskyhawks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://stonehillskyhawks.com/sports/womens-cross-country/schedule","https://stonehillskyhawks.com/sports/mens-cross-country/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-cross-country/roster","https://stonehillskyhawks.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://stonehillskyhawks.com/sports/equestrian/schedule"],"roster":["https://stonehillskyhawks.com/sports/equestrian/roster"],"combined":false},"Field Hockey":{"schedule":["https://stonehillskyhawks.com/sports/field-hockey/schedule"],"roster":["https://stonehillskyhawks.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://stonehillskyhawks.com/sports/football/schedule"],"roster":["https://stonehillskyhawks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://stonehillskyhawks.com/sports/womens-golf/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://stonehillskyhawks.com/sports/mens-ice-hockey/schedule","https://stonehillskyhawks.com/sports/womens-ice-hockey/schedule"],"roster":["https://stonehillskyhawks.com/sports/mens-ice-hockey/roster","https://stonehillskyhawks.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://stonehillskyhawks.com/sports/womens-lacrosse/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://stonehillskyhawks.com/sports/womens-soccer/schedule","https://stonehillskyhawks.com/sports/mens-soccer/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-soccer/roster","https://stonehillskyhawks.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://stonehillskyhawks.com/sports/softball/schedule"],"roster":["https://stonehillskyhawks.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://stonehillskyhawks.com/sports/womens-swimming-and-diving/schedule","https://stonehillskyhawks.com/sports/mens-swimming-diving/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-swimming-and-diving/roster","https://stonehillskyhawks.com/sports/mens-swimming-diving/roster"],"combined":true},"Tennis":{"schedule":["https://stonehillskyhawks.com/sports/womens-tennis/schedule","https://stonehillskyhawks.com/sports/mens-tennis/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-tennis/roster","https://stonehillskyhawks.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://stonehillskyhawks.com/sports/womens-track-and-field/schedule","https://stonehillskyhawks.com/sports/mens-track-and-field/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-track-and-field/roster","https://stonehillskyhawks.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://stonehillskyhawks.com/sports/womens-volleyball/schedule"],"roster":["https://stonehillskyhawks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'stonehill|"+sport+"':"),`${sport} routes must live in the Stonehill module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://stonehillskyhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.stonehillHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=stonehill)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Stonehill vs Curry College | ",
 "Upcoming Nov 5, 7:00 PM Men's · Stonehill at Fordham | ",
 "Upcoming Nov 9, 7:00 PM Men's · Stonehill at Columbia | ",
 "Upcoming Nov 14, 1:00 PM Men's · Stonehill at Texas Tech | ",
 "Upcoming Nov 18, 8:00 PM Men's · Stonehill vs New Hampshire | ",
 "Upcoming Nov 21, 5:00 PM Men's · Stonehill vs Northeastern | ",
 "Upcoming Nov 24, 1:00 PM Men's · Stonehill vs Vermont State University Randolph | ",
 "Upcoming Nov 28, 8:00 PM Men's · Stonehill at Notre Dame | ",
 "Upcoming Dec 1, 7:00 PM Men's · Stonehill at Providence College | ",
 "Upcoming Dec 5, 1:00 PM Men's · Stonehill vs Holy Cross | ",
 "Upcoming Dec 12, 2:00 PM Men's · Stonehill at UMass Lowell | ",
 "Upcoming Dec 15, 11:00 AM Men's · Stonehill vs Regis College | ",
 "Upcoming Dec 19, 1:00 PM Men's · Stonehill at Massachusetts | ",
 "Upcoming Dec 22, 7:00 PM Men's · Stonehill at Boston College | ",
 "Upcoming Dec 29, 2:00 PM Men's · Stonehill at Dartmouth College | ",
 "Upcoming Jan 2, 2:00 PM Men's · Stonehill vs Wagner College | ",
 "Upcoming Jan 4, 7:00 PM Men's · Stonehill vs FDU | ",
 "Upcoming Jan 8, 7:00 PM Men's · Stonehill at Mercyhurst | ",
 "Upcoming Jan 10, 1:00 PM Men's · Stonehill at Le Moyne | ",
 "Upcoming Jan 16, 1:00 PM Men's · Stonehill at LIU | ",
 "Upcoming Jan 20, 7:00 PM Men's · Stonehill vs Central Connecticut State | ",
 "Upcoming Jan 23, 2:00 PM Men's · Stonehill at Chicago State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Stonehill vs New Haven | ",
 "Upcoming Jan 30, 5:00 PM Men's · Stonehill at FDU | ",
 "Upcoming Feb 4, 7:00 PM Men's · Stonehill at Wagner College | ",
 "Upcoming Feb 6, 1:00 PM Men's · Stonehill at Central Connecticut State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Stonehill vs Mercyhurst | ",
 "Upcoming Feb 13, 2:00 PM Men's · Stonehill vs Le Moyne College | ",
 "Upcoming Feb 18, 7:00 PM Men's · Stonehill vs LIU | ",
 "Upcoming Feb 25, 7:00 PM Men's · Stonehill at New Haven | ",
 "Upcoming Feb 27, 2:00 PM Men's · Stonehill vs Chicago State | ",
 "Upcoming Mar 3 Men's · Stonehill at NEC Quarterfinals | ",
 "Upcoming Mar 6 Men's · Stonehill at NEC Semifinals | ",
 "Upcoming Mar 9 Men's · Stonehill at NEC Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Stonehill at Providence | ",
 "Upcoming Nov 6, 7:00 PM Women's · Stonehill at Notre Dame | ",
 "Upcoming Nov 8, 2:00 PM Women's · Stonehill at DePaul | ",
 "Upcoming Nov 13, 6:00 PM Women's · Stonehill vs West Georgia | ",
 "Upcoming Nov 18, 5:00 PM Women's · Stonehill vs Boston University | ",
 "Upcoming Nov 22, 2:00 PM Women's · Stonehill vs Illinois State | ",
 "Upcoming Nov 24, 6:00 PM Women's · Stonehill at Bryant | ",
 "Upcoming Nov 29, 2:00 PM Women's · Stonehill at UAlbany | ",
 "Upcoming Dec 5, 4:00 PM Women's · Stonehill vs UMass Lowell | ",
 "Upcoming Dec 11, 6:00 PM Women's · Stonehill vs Framingham State | ",
 "Upcoming Dec 15, 11:00 AM Women's · Stonehill at LSU | ",
 "Upcoming Dec 19, 12:00 PM Women's · Stonehill at Tulane | ",
 "Upcoming Dec 20 Women's · Stonehill at Tulane Tournament | ",
 "Upcoming Dec 28, 4:00 PM Women's · Stonehill at New Hampshire | ",
 "Upcoming Jan 2, 2:00 PM Women's · Stonehill at Wagner | ",
 "Upcoming Jan 7, 6:00 PM Women's · Stonehill vs Mercyhurst | ",
 "Upcoming Jan 9, 2:00 PM Women's · Stonehill vs Le Moyne | ",
 "Upcoming Jan 16, 2:00 PM Women's · Stonehill vs LIU | ",
 "Upcoming Jan 21 Women's · Stonehill at Central Connecticut State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Stonehill vs Chicago State | ",
 "Upcoming Jan 28 Women's · Stonehill at New Haven | ",
 "Upcoming Jan 30, 2:00 PM Women's · Stonehill at FDU | ",
 "Upcoming Feb 4, 6:00 PM Women's · Stonehill vs Wagner | ",
 "Upcoming Feb 6, 2:00 PM Women's · Stonehill vs Central Connecticut State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Stonehill at Mercyhurst | ",
 "Upcoming Feb 13, 1:00 PM Women's · Stonehill at Le Moyne | ",
 "Upcoming Feb 18, 7:00 PM Women's · Stonehill at LIU | ",
 "Upcoming Feb 24, 6:00 PM Women's · Stonehill vs New Haven | ",
 "Upcoming Feb 27, 1:00 PM Women's · Stonehill at Chicago State | ",
 "Upcoming Mar 4, 6:00 PM Women's · Stonehill vs FDU | ",
 "Upcoming Mar 8 Women's · Stonehill at NEC Tournament Quarterfinals | ",
 "Upcoming Mar 11 Women's · Stonehill at NEC Tournament Semifinals | ",
 "Upcoming Mar 14 Women's · Stonehill at NEC Tournament Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · Stonehill at Shawn M Nassaney Invitational | 3rd of 5",
 "Final Sep 19 Women's · Stonehill at UMass Dartmouth | 8th of 33",
 "Final Oct 9 Women's · Stonehill at New England Championships | 11th of 25",
 "Today Oct 23, 4:30 PM Women's · Stonehill at Brown | ",
 "Upcoming Oct 31 Women's · Stonehill at NEC Championship | ",
 "Upcoming Nov 13 Women's · Stonehill at NCAA Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · Stonehill at Bryant Invitational | Completed",
 "Final Sep 19 Men's · Stonehill at UMass Dartmouth | 1st of 32",
 "Final Oct 2 Men's · Stonehill at Lehigh | 22nd of 35",
 "Final Oct 9 Men's · Stonehill at New England Championships | 2nd of 18",
 "Today Oct 23, 5:00 PM Men's · Stonehill at Brown | ",
 "Upcoming Oct 31 Men's · Stonehill at NEC Championship | ",
 "Upcoming Nov 13 Men's · Stonehill at NCAA Regional Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 24, 9:00 AM Stonehill vs Stonehill Home Show | ",
 "Upcoming Oct 31, 9:00 AM Stonehill vs Babson/Wellesley | ",
 "Upcoming Nov 1, 9:00 AM Stonehill at Brandeis | ",
 "Upcoming Nov 8, 9:00 AM Stonehill vs Boston College/Bridgewater State | ",
 "Upcoming Nov 15, 9:00 AM Stonehill at Wheaton | ",
 "Upcoming Mar 28, 9:00 AM Stonehill at IHSA Zone 1, Region 4 Championships | ",
 "Upcoming Apr 3, 9:00 AM Stonehill at IHSA Zone 1 Championships | ",
 "Upcoming May 7 Stonehill at IHSA National Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Stonehill at Holy Cross | L, 1-2",
 "Final Sep 4 Stonehill at Maine | L, 0-4",
 "Final Sep 5 Stonehill vs Davidson | L, 0-6",
 "Final Sep 11 Stonehill at Bryant | L, 1-3",
 "Final Sep 18 Stonehill vs Merrimack | W, 4-1",
 "Final Sep 20 Stonehill at UMass Lowell | L, 1-4",
 "Final Sep 25 Stonehill vs Sacred Heart | L, 1-2",
 "Final Sep 28 Stonehill vs Mercyhurst | W, 2-1",
 "Final Oct 3 Stonehill vs Queens | L, 1-2",
 "Final Oct 9 Stonehill at New Haven | W, 2-1",
 "Final Oct 11 Stonehill at Northeastern | L, 0-4",
 "Final Oct 16 Stonehill at LIU | L, 0-4",
 "Final Oct 18 Stonehill at Wagner | L, 0-1",
 "Today Oct 23, 3:00 PM Stonehill vs Rider | ",
 "Upcoming Oct 25, 12:00 PM Stonehill vs Colgate | ",
 "Upcoming Oct 30, 1:00 PM Stonehill at Quinnipiac | ",
 "Upcoming Nov 5 Stonehill at NEC Tournament Semifinals | ",
 "Upcoming Nov 7 Stonehill at NEC Tournament Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Stonehill vs Bryant | L, 6-24",
 "Final Sep 5 Stonehill at New Haven | W, 21-3",
 "Final Sep 12 Stonehill at New Hampshire | L, 35-42",
 "Final Sep 19 Stonehill at Massachusetts | L, 14-36",
 "Final Sep 26 Stonehill at Ohio | L, 7-35",
 "Final Oct 10 Stonehill at Sacred Heart | W, 28-7",
 "Final Oct 17 Stonehill vs Duquesne | L, 7-14",
 "Upcoming Oct 24, 12:00 PM Stonehill at LIU | ",
 "Upcoming Oct 31, 12:00 PM Stonehill vs Mercyhurst | ",
 "Upcoming Nov 7, 1:00 PM Stonehill vs Central Connecticut State | ",
 "Upcoming Nov 14, 12:00 PM Stonehill at Robert Morris | ",
 "Upcoming Nov 21, 12:00 PM Stonehill vs Wagner | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Stonehill at Merrimack Invitational | 3rd of 9",
 "Final Sep 26 Stonehill at Fighting Irish Classic | 14th of 14",
 "Final Sep 28 Stonehill at Hill Yeah! | 6th of 9",
 "Final Oct 11 Stonehill at University at Albany | 8th of 10",
 "Final Oct 19 Stonehill at Crusader Invitational | 1st of 13",
 "Upcoming Feb 13 Stonehill at Battle at the Beach | ",
 "Upcoming Mar 21 Stonehill at The Nashville Invitational | ",
 "Upcoming Apr 3 Stonehill at Carolina Challenge Cup | ",
 "Upcoming Apr 9 Stonehill at Senior Showdown | ",
 "Upcoming Apr 16 Stonehill at Northeast Conference | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Stonehill at Providence (Exhibition) | T, 3-3",
 "Final Oct 9 Men's · Stonehill vs Colgate | W, 2-1",
 "Final Oct 10 Men's · Stonehill vs Colgate | W, 4-2",
 "Final Oct 16 Men's · Stonehill at Northern Michigan | L, 1-5",
 "Final Oct 17 Men's · Stonehill at Northern Michigan | W, 2-1",
 "Upcoming Oct 24, 6:00 PM Men's · Stonehill at Massachusetts | ",
 "Upcoming Oct 30, 7:00 PM Men's · Stonehill vs Princeton | ",
 "Upcoming Oct 31, 7:00 PM Men's · Stonehill vs Princeton | ",
 "Upcoming Nov 6, 7:00 PM Men's · Stonehill vs Alaska Fairbanks | ",
 "Upcoming Nov 7, 7:00 PM Men's · Stonehill vs Alaska Fairbanks | ",
 "Upcoming Nov 19, 7:00 PM Men's · Stonehill vs Northeastern | ",
 "Upcoming Nov 20, 7:00 PM Men's · Stonehill vs Northeastern | ",
 "Upcoming Nov 27, 7:00 PM Men's · Stonehill vs Miami (OH) | ",
 "Upcoming Nov 28, 7:00 PM Men's · Stonehill vs Miami (OH) | ",
 "Upcoming Dec 5, 7:00 PM Men's · Stonehill vs Yale | ",
 "Upcoming Dec 6, 4:00 PM Men's · Stonehill at Brown | ",
 "Upcoming Dec 10, 7:00 PM Men's · Stonehill at Dartmouth | ",
 "Upcoming Dec 12 Men's · Stonehill at Quinnipiac | ",
 "Upcoming Jan 1 Men's · Stonehill at Notre Dame | ",
 "Upcoming Jan 2 Men's · Stonehill at Notre Dame | ",
 "Upcoming Jan 9, 1:00 PM Men's · Stonehill at Boston College | ",
 "Upcoming Jan 15, 7:00 PM Men's · Stonehill vs Lindenwood | ",
 "Upcoming Jan 16, 7:00 PM Men's · Stonehill vs Lindenwood | ",
 "Upcoming Jan 21, 7:00 PM Men's · Stonehill at Bentley | ",
 "Upcoming Jan 29, 7:00 PM Men's · Stonehill vs Alaska Anchorage | ",
 "Upcoming Jan 30, 7:00 PM Men's · Stonehill vs Alaska Anchorage | ",
 "Upcoming Feb 5, 8:00 PM Men's · Stonehill at Lindenwood | ",
 "Upcoming Feb 6, 6:00 PM Men's · Stonehill at Lindenwood | ",
 "Upcoming Feb 12, 7:00 PM Men's · Stonehill vs LIU | ",
 "Upcoming Feb 13, 7:00 PM Men's · Stonehill vs LIU | ",
 "Upcoming Feb 19, 2:00 PM Men's · Stonehill at LIU | ",
 "Upcoming Feb 20, 3:00 PM Men's · Stonehill at LIU | ",
 "Upcoming Mar 4 Men's · Stonehill at United Collegiate Hockey Cup | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 19 Women's · Stonehill at Merrimack (Exhibition) | L, 1-7",
 "Final Sep 25 Women's · Stonehill at Syracuse | L, 0-3",
 "Final Sep 26 Women's · Stonehill at Syracuse | L, 1-4",
 "Final Oct 3 Women's · Stonehill vs Boston College | L, 0-17",
 "Final Oct 9 Women's · Stonehill at Saint Michael's | W, 8-0",
 "Final Oct 10 Women's · Stonehill at Saint Michael's | W, 5-0",
 "Final Oct 16 Women's · Stonehill vs Post | W, 3-1",
 "Final Oct 17 Women's · Stonehill vs Post | L, 1-2",
 "Today Oct 23, 2:00 PM Women's · Stonehill at New Hampshire | ",
 "Upcoming Oct 30, 6:00 PM Women's · Stonehill at Saint Anselm | ",
 "Upcoming Oct 31, 2:00 PM Women's · Stonehill vs Saint Anselm | ",
 "Upcoming Nov 6, 5:00 PM Women's · Stonehill vs Sacred Heart | ",
 "Upcoming Nov 7, 2:00 PM Women's · Stonehill vs Sacred Heart | ",
 "Upcoming Nov 13, 5:00 PM Women's · Stonehill vs LIU | ",
 "Upcoming Nov 14, 2:00 PM Women's · Stonehill vs LIU | ",
 "Upcoming Nov 20, 4:30 PM Women's · Stonehill at Assumption | ",
 "Upcoming Nov 21, 2:00 PM Women's · Stonehill vs Assumption | ",
 "Upcoming Nov 27, 2:00 PM Women's · Stonehill vs Delaware | ",
 "Upcoming Nov 28, 2:00 PM Women's · Stonehill vs Delaware | ",
 "Upcoming Dec 4, 5:00 PM Women's · Stonehill vs Franklin Pierce | ",
 "Upcoming Dec 5, 7:30 PM Women's · Stonehill at Franklin Pierce | ",
 "Upcoming Jan 8, 7:45 PM Women's · Stonehill at Post | ",
 "Upcoming Jan 9, 3:00 PM Women's · Stonehill at Post | ",
 "Upcoming Jan 15, 5:00 PM Women's · Stonehill vs Saint Michael's | ",
 "Upcoming Jan 16, 2:00 PM Women's · Stonehill vs Saint Michael's | ",
 "Upcoming Jan 22, 5:00 PM Women's · Stonehill vs Saint Anselm | ",
 "Upcoming Jan 23, 1:00 PM Women's · Stonehill at Saint Anselm | ",
 "Upcoming Jan 29, 7:00 PM Women's · Stonehill at Sacred Heart | ",
 "Upcoming Jan 30, 2:00 PM Women's · Stonehill at Sacred Heart | ",
 "Upcoming Feb 5, 3:00 PM Women's · Stonehill at LIU | ",
 "Upcoming Feb 6, 2:00 PM Women's · Stonehill at LIU | ",
 "Upcoming Feb 12, 5:00 PM Women's · Stonehill vs Assumption | ",
 "Upcoming Feb 13, 3:30 PM Women's · Stonehill at Assumption | ",
 "Upcoming Feb 19, 7:00 PM Women's · Stonehill at Franklin Pierce | ",
 "Upcoming Feb 20, 2:00 PM Women's · Stonehill vs Franklin Pierce | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Stonehill vs New Hampshire | T, 1-1",
 "Final Aug 16 Women's · Stonehill at Bryant | T, 0-0",
 "Final Aug 19 Women's · Stonehill at Holy Cross | L, 2-3",
 "Final Aug 27 Women's · Stonehill at Providence | L, 1-2",
 "Final Aug 30 Women's · Stonehill vs Vermont | T, 1-1",
 "Final Sep 3 Women's · Stonehill at Albany | L, 1-2",
 "Final Sep 6 Women's · Stonehill vs Fordham | T, 1-1",
 "Final Sep 10 Women's · Stonehill vs UMass Lowell | L, 0-1",
 "Final Sep 17 Women's · Stonehill at Delaware State | W, 8-0",
 "Final Sep 20 Women's · Stonehill vs FDU | L, 0-1",
 "Final Sep 24 Women's · Stonehill at New Haven | W, 3-0",
 "Final Oct 1 Women's · Stonehill vs Le Moyne | W, 1-0",
 "Final Oct 4 Women's · Stonehill at Wagner | W, 2-0",
 "Final Oct 8 Women's · Stonehill at Chicago State | W, 7-1",
 "Final Oct 18 Women's · Stonehill vs Mercyhurst | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Women's · Stonehill vs Howard | ",
 "Upcoming Nov 1, 2:00 PM Women's · Stonehill at Central Connecticut | ",
 "Upcoming Nov 8, 1:00 PM Women's · Stonehill vs LIU | ",
 "Upcoming Nov 12 Women's · Stonehill at NEC Semifinals | ",
 "Upcoming Nov 15 Women's · Stonehill at NEC Championships | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Stonehill vs Rhode Island | W, 3-2",
 "Final Aug 23 Men's · Stonehill vs Northeastern | W, 1-0",
 "Final Aug 27 Men's · Stonehill vs Merrimack College | T, 1-1",
 "Final Sep 3 Men's · Stonehill at Army | T, 2-2",
 "Final Sep 7 Men's · Stonehill at Dartmouth College | L, 0-2",
 "Final Sep 11 Men's · Stonehill at Brown | L, 0-1",
 "Final Sep 16 Men's · Stonehill vs Massachusetts | L, 0-1",
 "Final Sep 23 Men's · Stonehill at Holy Cross | L, 2-3",
 "Final Oct 1 Men's · Stonehill at Central Connecticut State | L, 0-1",
 "Final Oct 4 Men's · Stonehill vs Le Moyne | L, 0-3",
 "Final Oct 8 Men's · Stonehill vs Chicago State | W, 6-1",
 "Final Oct 11 Men's · Stonehill vs Howard | W, 3-0",
 "Final Oct 18 Men's · Stonehill at FDU | L, 0-3",
 "Final Oct 21 Men's · Stonehill at Harvard | L, 1-4",
 "Upcoming Oct 25, 1:00 PM Men's · Stonehill at LIU | ",
 "Upcoming Nov 1, 1:00 PM Men's · Stonehill vs Mercyhurst | ",
 "Upcoming Nov 8, 6:00 PM Men's · Stonehill at New Haven | ",
 "Upcoming Nov 12 Men's · Stonehill at NEC Semifinals | ",
 "Upcoming Nov 15 Men's · Stonehill at NEC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 19 Women's · Stonehill vs Purple and White | Completed",
 "Final Sep 26 Women's · Stonehill at Hannah/Gibbons Invite | Completed",
 "Final Oct 10 Women's · Stonehill vs Siena | L, 66-230",
 "Final Oct 10 Women's · Stonehill at Rhode Island | L, 52-244",
 "Upcoming Oct 24, 11:00 AM Women's · Stonehill at Providence | ",
 "Upcoming Oct 31, 12:30 PM Women's · Stonehill at Sacred Heart | ",
 "Upcoming Nov 7, 1:00 PM Women's · Stonehill vs Babson | ",
 "Upcoming Nov 19, 5:00 PM Women's · Stonehill at Harold Anderson Invitational | ",
 "Upcoming Jan 13 Women's · Stonehill at Brandeis | ",
 "Upcoming Jan 16 Women's · Stonehill at Roger Williams | ",
 "Upcoming Jan 23 Women's · Stonehill at Merrimack | ",
 "Upcoming Jan 30 Women's · Stonehill at Siena | ",
 "Upcoming Jan 30 Women's · Stonehill vs Saint Peter's | ",
 "Upcoming Feb 17 Women's · Stonehill at NEC Championships | "
]);
  const v_mensswimmingdiving=parse("Swimming & Diving","mens-swimming-diving");
  assert.deepEqual(v_mensswimmingdiving.map(line),[
 "Final Sep 19 Men's · Stonehill vs Purple and White | Completed",
 "Final Sep 26 Men's · Stonehill at Hannah/Gibbons Invite | Completed",
 "Upcoming Oct 24, 11:00 AM Men's · Stonehill at Providence | ",
 "Upcoming Nov 7, 1:00 PM Men's · Stonehill vs Babson | ",
 "Upcoming Nov 19, 5:00 PM Men's · Stonehill at Harold Anderson Invitational | ",
 "Upcoming Jan 13 Men's · Stonehill at Brandeis | ",
 "Upcoming Jan 16 Men's · Stonehill at Roger Williams | ",
 "Upcoming Jan 23 Men's · Stonehill at Merrimack | ",
 "Upcoming Jan 30 Men's · Stonehill at Siena | ",
 "Upcoming Jan 30 Men's · Stonehill vs Saint Peter's | ",
 "Upcoming Feb 17 Men's · Stonehill at NEC Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Stonehill at Bryant Invitational | No Team Score",
 "Final Sep 25 Women's · Stonehill at Binghamton Championships | No Team Score",
 "Final Oct 8 Women's · Stonehill at ITA Regional Tournament | No Team Score",
 "Upcoming Jan 23 Women's · Stonehill at Boston University | ",
 "Upcoming Jan 24, 11:00 AM Women's · Stonehill vs Portland | ",
 "Upcoming Jan 30, 4:30 PM Women's · Stonehill vs Merrimack College | ",
 "Upcoming Feb 5 Women's · Stonehill at Iona | ",
 "Upcoming Feb 13 Women's · Stonehill at Binghamton | ",
 "Upcoming Feb 15 Women's · Stonehill at Le Moyne College | ",
 "Upcoming Feb 26 Women's · Stonehill at Boston College | ",
 "Upcoming Feb 28 Women's · Stonehill at Sacred Heart | ",
 "Upcoming Mar 8 Women's · Stonehill at Coastal Carolina | ",
 "Upcoming Mar 9 Women's · Stonehill at College of Charleston | ",
 "Upcoming Mar 14 Women's · Stonehill vs Rhode Island | ",
 "Upcoming Mar 21 Women's · Stonehill at Wagner College | ",
 "Upcoming Apr 3 Women's · Stonehill at New Haven | ",
 "Upcoming Apr 10 Women's · Stonehill vs Providence College | ",
 "Upcoming Apr 11 Women's · Stonehill vs LIU | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 15 Men's · Stonehill vs Franklin Pierce | W, 7-0",
 "Final Sep 19 Men's · Stonehill at Boston University Tournament | No Team Score",
 "Final Sep 25 Men's · Stonehill at Binghamton Championships | No Team Score",
 "Final Oct 2 Men's · Stonehill at Army Invitational | No Team Score",
 "Final Oct 8 Men's · Stonehill at ITA Regional Tournament | No Team Score",
 "Upcoming Jan 30 Men's · Stonehill at Army | ",
 "Upcoming Feb 5 Men's · Stonehill vs Siena | ",
 "Upcoming Feb 7 Men's · Stonehill vs Sacred Heart | ",
 "Upcoming Feb 13 Men's · Stonehill at Washington College (Md.) | ",
 "Upcoming Feb 14 Men's · Stonehill vs Loyola | ",
 "Upcoming Feb 27 Men's · Stonehill vs LIU | ",
 "Upcoming Feb 28 Men's · Stonehill at Iona | ",
 "Upcoming Mar 6 Men's · Stonehill vs Weber State | ",
 "Upcoming Mar 7 Men's · Stonehill at Utah State | ",
 "Upcoming Mar 9 Men's · Stonehill at BYU | ",
 "Upcoming Mar 20 Men's · Stonehill vs Binghamton | ",
 "Upcoming Apr 1 Men's · Stonehill vs Assumption | ",
 "Upcoming Apr 3 Men's · Stonehill at Brandeis | ",
 "Upcoming Apr 4 Men's · Stonehill at Wagner College | ",
 "Upcoming Apr 7 Men's · Stonehill vs FDU | ",
 "Upcoming Apr 10 Men's · Stonehill vs Mercyhurst | ",
 "Upcoming Apr 11 Men's · Stonehill at St. Bonaventure | ",
 "Upcoming Apr 17 Men's · Stonehill vs Le Moyne | ",
 "Upcoming Apr 20 Men's · Stonehill vs Merrimack College | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Stonehill vs Nicholls | L, 2-3",
 "Final Aug 28 Stonehill vs Oral Roberts | L, 0-3",
 "Final Aug 29 Stonehill at New Orleans | W, 3-1",
 "Final Aug 29 Stonehill vs Alcorn State | W, 3-0",
 "Final Sep 2 Stonehill at Bryant | L, 0-3",
 "Final Sep 3 Stonehill at Boston College | L, 0-3",
 "Final Sep 4 Stonehill vs New Hampshire | L, 0-3",
 "Final Sep 5 Stonehill vs Bucknell | L, 1-3",
 "Final Sep 11 Stonehill vs Holy Cross | L, 1-3",
 "Final Sep 12 Stonehill at Providence College | L, 0-3",
 "Final Sep 12 Stonehill vs Manhattan | W, 3-1",
 "Final Sep 15 Stonehill vs Holy Cross | L, 0-3",
 "Final Sep 18 Stonehill vs Indiana State | L, 1-3",
 "Final Sep 18 Stonehill at Purdue Fort Wayne | L, 0-3",
 "Final Sep 19 Stonehill vs Columbia | L, 0-3",
 "Final Sep 30 Stonehill at New Hampshire | L, 0-3",
 "Final Oct 2 Stonehill at Chicago State | L, 2-3",
 "Final Oct 3 Stonehill at Chicago State | W, 3-2",
 "Final Oct 9 Stonehill vs Mercyhurst | W, 3-2",
 "Final Oct 10 Stonehill vs Mercyhurst | L, 1-3",
 "Final Oct 16 Stonehill vs FDU | W, 3-0",
 "Final Oct 17 Stonehill vs FDU | L, 1-3",
 "Today Oct 23, 6:00 PM Stonehill at New Haven | ",
 "Upcoming Oct 24, 1:00 PM Stonehill at New Haven | ",
 "Upcoming Oct 30, 6:00 PM Stonehill at Le Moyne College | ",
 "Upcoming Oct 31, 1:00 PM Stonehill at Le Moyne College | ",
 "Upcoming Nov 6, 6:00 PM Stonehill vs LIU | ",
 "Upcoming Nov 7, 4:30 PM Stonehill vs LIU | ",
 "Upcoming Nov 13, 6:00 PM Stonehill at Central Connecticut State | ",
 "Upcoming Nov 14, 1:00 PM Stonehill at Central Connecticut State | ",
 "Upcoming Nov 20 Stonehill at NEC Semifinals | ",
 "Upcoming Nov 21 Stonehill at NEC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimmingdiving,"Swimming & Diving mens-swimming-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Stonehill module checks passed");
