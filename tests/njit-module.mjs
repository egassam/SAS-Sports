import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {njitSchool} from '../src/schools/njit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='njit');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,njitHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/njit-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit njithighlanders.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['njit'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',njitSchool.scheduleUrls],['roster',njitSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('njit|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'njithighlanders.com',`${key} must stay on njithighlanders.com`);
  }
}
const parity={"Baseball":{"schedule":["https://njithighlanders.com/sports/baseball/schedule"],"roster":["https://njithighlanders.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://njithighlanders.com/sports/mens-basketball/schedule","https://njithighlanders.com/sports/womens-basketball/schedule"],"roster":["https://njithighlanders.com/sports/mens-basketball/roster","https://njithighlanders.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://njithighlanders.com/sports/womens-cross-country/schedule","https://njithighlanders.com/sports/mens-cross-country/schedule"],"roster":["https://njithighlanders.com/sports/womens-cross-country/roster","https://njithighlanders.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://njithighlanders.com/sports/womens-fencing/schedule","https://njithighlanders.com/sports/mens-fencing/schedule"],"roster":["https://njithighlanders.com/sports/womens-fencing/roster","https://njithighlanders.com/sports/mens-fencing/roster"],"combined":true},"Hockey":{"schedule":["https://njithighlanders.com/sports/mens-ice-hockey/schedule"],"roster":["https://njithighlanders.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://njithighlanders.com/sports/mens-lacrosse/schedule"],"roster":["https://njithighlanders.com/sports/mens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://njithighlanders.com/sports/womens-soccer/schedule","https://njithighlanders.com/sports/mens-soccer/schedule"],"roster":["https://njithighlanders.com/sports/womens-soccer/roster","https://njithighlanders.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://njithighlanders.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://njithighlanders.com/sports/mens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://njithighlanders.com/sports/womens-tennis/schedule","https://njithighlanders.com/sports/mens-tennis/schedule"],"roster":["https://njithighlanders.com/sports/womens-tennis/roster","https://njithighlanders.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://njithighlanders.com/sports/womens-track-and-field/schedule","https://njithighlanders.com/sports/mens-track-and-field/schedule"],"roster":["https://njithighlanders.com/sports/womens-track-and-field/roster","https://njithighlanders.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://njithighlanders.com/sports/womens-volleyball/schedule","https://njithighlanders.com/sports/mens-volleyball/schedule"],"roster":["https://njithighlanders.com/sports/womens-volleyball/roster","https://njithighlanders.com/sports/mens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'njit|"+sport+"':"),`${sport} routes must live in the NJIT module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://njithighlanders.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.njitHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=njit)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · NJIT at Dayton | ",
 "Upcoming Nov 5, 7:00 PM Men's · NJIT at Iona | ",
 "Upcoming Nov 8, 4:00 PM Men's · NJIT vs Saint Peter's | ",
 "Upcoming Nov 10, 6:30 PM Men's · NJIT at Rutgers | ",
 "Upcoming Nov 11, 7:00 PM Men's · NJIT at VCU | ",
 "Upcoming Nov 14, 7:00 PM Men's · NJIT at Fairfield | ",
 "Upcoming Nov 18, 7:00 PM Men's · NJIT at FDU | ",
 "Upcoming Nov 22, 5:00 PM Men's · NJIT at Boston College | ",
 "Upcoming Nov 25, 2:00 PM Men's · NJIT vs Manhattan | ",
 "Upcoming Nov 29, 2:00 PM Men's · NJIT at Sacred Heart | ",
 "Upcoming Dec 2, 7:00 PM Men's · NJIT vs Navy | ",
 "Upcoming Dec 7, 7:00 PM Men's · NJIT at Seton Hall | ",
 "Upcoming Dec 9, 7:00 PM Men's · NJIT at New Haven | ",
 "Upcoming Dec 13, 4:00 PM Men's · NJIT vs Drexel | ",
 "Upcoming Dec 23, 1:00 PM Men's · NJIT at Wagner | ",
 "Upcoming Dec 29, 2:00 PM Men's · NJIT vs Saint Elizabeth | ",
 "Upcoming Jan 2, 1:00 PM Men's · NJIT at UMBC | ",
 "Upcoming Jan 7, 6:00 PM Men's · NJIT at Maine | ",
 "Upcoming Jan 9, 12:00 PM Men's · NJIT at New Hampshire | ",
 "Upcoming Jan 14, 11:00 AM Men's · NJIT vs UAlbany | ",
 "Upcoming Jan 18, 2:00 PM Men's · NJIT vs Binghamton | ",
 "Upcoming Jan 21, 6:00 PM Men's · NJIT at Bryant | ",
 "Upcoming Jan 23, 4:00 PM Men's · NJIT vs Vermont | ",
 "Upcoming Jan 30, 4:00 PM Men's · NJIT vs UMass Lowell | ",
 "Upcoming Feb 4, 6:30 PM Men's · NJIT at UAlbany | ",
 "Upcoming Feb 6, 2:00 PM Men's · NJIT at Binghamton | ",
 "Upcoming Feb 11, 7:00 PM Men's · NJIT vs New Hampshire | ",
 "Upcoming Feb 13, 4:00 PM Men's · NJIT vs Maine | ",
 "Upcoming Feb 18, 6:00 PM Men's · NJIT at UMass Lowell | ",
 "Upcoming Feb 20, 3:00 PM Men's · NJIT at Vermont | ",
 "Upcoming Feb 25, 7:30 PM Men's · NJIT vs UMBC | ",
 "Upcoming Feb 27, 4:00 PM Men's · NJIT vs Bryant | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · NJIT vs Rider | ",
 "Upcoming Nov 5 Women's · NJIT vs Merrimack | ",
 "Upcoming Nov 8, 5:00 PM Women's · NJIT at Marist | ",
 "Upcoming Nov 11, 6:00 PM Women's · NJIT at Lafayette | ",
 "Upcoming Nov 14, 1:00 PM Women's · NJIT at Dartmouth | ",
 "Upcoming Nov 18, 6:00 PM Women's · NJIT vs Delaware State | ",
 "Upcoming Nov 21, 3:00 PM Women's · NJIT at Marquette | ",
 "Upcoming Nov 25, 12:00 PM Women's · NJIT at Saint Peter's | ",
 "Upcoming Dec 2, 4:30 PM Women's · NJIT vs Monmouth | ",
 "Upcoming Dec 5, 2:00 PM Women's · NJIT at Manhattan | ",
 "Upcoming Dec 9, 7:00 PM Women's · NJIT at FDU | ",
 "Upcoming Dec 13, 1:00 PM Women's · NJIT vs Sacred Heart | ",
 "Upcoming Dec 28, 2:30 PM Women's · NJIT at Drexel | ",
 "Upcoming Jan 3, 2:00 PM Women's · NJIT at UMBC | ",
 "Upcoming Jan 7, 6:00 PM Women's · NJIT vs New Hampshire | ",
 "Upcoming Jan 9, 2:00 PM Women's · NJIT vs Maine | ",
 "Upcoming Jan 14, 6:30 PM Women's · NJIT at UAlbany | ",
 "Upcoming Jan 16, 2:00 PM Women's · NJIT at Binghamton | ",
 "Upcoming Jan 21, 6:00 PM Women's · NJIT vs Bryant | ",
 "Upcoming Jan 23, 2:00 PM Women's · NJIT at Vermont | ",
 "Upcoming Jan 30, 2:00 PM Women's · NJIT at UMass Lowell | ",
 "Upcoming Feb 4, 6:00 PM Women's · NJIT vs UAlbany | ",
 "Upcoming Feb 6, 3:00 PM Women's · NJIT vs Binghamton | ",
 "Upcoming Feb 11, 6:00 PM Women's · NJIT at New Hampshire | ",
 "Upcoming Feb 13, 1:00 PM Women's · NJIT at Maine | ",
 "Upcoming Feb 18, 6:00 PM Women's · NJIT vs UMass Lowell | ",
 "Upcoming Feb 20, 2:00 PM Women's · NJIT vs Vermont | ",
 "Upcoming Feb 25, 5:00 PM Women's · NJIT vs UMBC | ",
 "Upcoming Feb 27, 12:00 PM Women's · NJIT at Bryant | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · NJIT at Owls Cross Country Invitational | Completed",
 "Final Sep 11 Women's · NJIT at Lafayette XC Invitational | Completed",
 "Final Sep 19 Women's · NJIT at John McNichols Invitational | Completed",
 "Final Oct 10 Women's · NJIT at 22nd Annual NJIT XC Invitational | 3rd of 24",
 "Upcoming Oct 30, 10:00 AM Women's · NJIT at America East Conference Championships | ",
 "Upcoming Nov 13 Women's · NJIT at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 Women's · NJIT at NCAA Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · NJIT at Owls Cross Country Invitational | Completed",
 "Final Sep 11 Men's · NJIT at Lafayette XC Invitational | Completed",
 "Final Sep 19 Men's · NJIT at John McNichols Invitational | Completed",
 "Final Oct 10 Men's · NJIT at 22nd Annual NJIT XC Invitational | Completed",
 "Final Oct 16 Men's · NJIT at Joe Handelman '52 Fall Classic | Completed",
 "Upcoming Oct 30, 11:00 AM Men's · NJIT at America East Conference Championships | ",
 "Upcoming Nov 13 Men's · NJIT at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 Men's · NJIT at NCAA Cross Country Championships | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Oct 24, 8:00 AM Women's · NJIT at Nikki Franke Open | ",
 "Upcoming Nov 1, 10:00 AM Women's · NJIT at NJIT Invitational | ",
 "Upcoming Nov 7, 9:00 AM Women's · NJIT at Drew Invitational | ",
 "Upcoming Nov 8, 5:00 PM Women's · NJIT at Columbia Invitational | ",
 "Upcoming Nov 22, 8:00 AM Women's · NJIT at Vassar Invitational | ",
 "Upcoming Dec 6, 10:00 AM Women's · NJIT at Traditional Invitational | ",
 "Upcoming Jan 16, 8:00 AM Women's · NJIT at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 31, 8:00 AM Women's · NJIT at Eric Sollee Invitational | ",
 "Upcoming Feb 7, 10:00 AM Women's · NJIT at Stevens Invitational | ",
 "Upcoming Feb 27, 9:00 AM Women's · NJIT at ECFC Conference Championships | ",
 "Upcoming Mar 13, 8:00 AM Women's · NJIT at NCAA Fencing Mid-Atlantic/South Region Championship | ",
 "Upcoming Mar 25, 8:00 AM Women's · NJIT at NCAA Fencing Championships (at Duke) | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Oct 25, 8:00 AM Men's · NJIT at Nikki Franke Open | ",
 "Upcoming Nov 1, 10:00 AM Men's · NJIT at NJIT Invitational | ",
 "Upcoming Nov 7, 9:00 AM Men's · NJIT at Drew Invitational | ",
 "Upcoming Nov 8, 5:00 PM Men's · NJIT at Columbia Invitational | ",
 "Upcoming Nov 22, 8:00 AM Men's · NJIT at Vassar Invitational | ",
 "Upcoming Dec 6, 10:00 AM Men's · NJIT at Traditional Invitational | ",
 "Upcoming Jan 16 Men's · NJIT at Dave Micahnik Penn Invitational | ",
 "Upcoming Jan 31, 8:00 AM Men's · NJIT at Eric Sollee Invitational | ",
 "Upcoming Feb 7, 10:00 AM Men's · NJIT at Stevens Invitational | ",
 "Upcoming Feb 27, 9:00 AM Men's · NJIT at ECFC Conference Championships | ",
 "Upcoming Mar 13, 8:00 AM Men's · NJIT at NCAA Fencing Mid-Atlantic/South Region Championship | ",
 "Upcoming Mar 25, 8:00 AM Men's · NJIT at NCAA Fencing Championships (at Duke) | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Sep 19 NJIT at Stevens | L, 0-6",
 "Final Sep 27 NJIT vs Drexel | L, 2-5",
 "Final Oct 2 NJIT at Hofstra | L, 4-5",
 "Final Oct 3 NJIT at Seton Hall | L, 4-5",
 "Final Oct 11 NJIT at St. Thomas Aquinas College | L, 4-6",
 "Final Oct 18 NJIT vs Rutgers | W, 3-1",
 "Upcoming Oct 24, 8:30 PM NJIT at TCNJ | ",
 "Upcoming Oct 25, 5:30 PM NJIT vs TCNJ | ",
 "Upcoming Oct 31, 8:45 PM NJIT at Yeshiva | ",
 "Upcoming Nov 1, 3:00 PM NJIT at Bloomsburg | ",
 "Upcoming Nov 7, 8:45 PM NJIT at Seton Hall | ",
 "Upcoming Nov 8, 8:30 PM NJIT vs SUNY Maritime | ",
 "Upcoming Nov 15, 8:30 PM NJIT vs Hofstra | ",
 "Upcoming Nov 21, 8:30 PM NJIT at Drexel | ",
 "Upcoming Nov 22, 8:30 PM NJIT at Stevens | ",
 "Upcoming Dec 6, 8:30 PM NJIT vs Yeshiva | ",
 "Upcoming Jan 23, 8:30 PM NJIT vs Stevens | ",
 "Upcoming Jan 24, 8:30 PM NJIT vs St. Thomas Aquinas College | ",
 "Upcoming Jan 31, 5:30 PM NJIT vs Seton Hall | ",
 "Upcoming Feb 7, 6:40 PM NJIT at Rutgers | ",
 "Upcoming Feb 13, 8:30 PM NJIT vs USMMA | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · NJIT vs Rider | T, 1-1",
 "Final Aug 20 Women's · NJIT at UMass | L, 0-1",
 "Final Aug 23 Women's · NJIT at Lehigh | W, 2-1",
 "Final Aug 30 Women's · NJIT vs Drexel | L, 1-2",
 "Final Sep 3 Women's · NJIT at Wagner | W, 1-0",
 "Final Sep 6 Women's · NJIT vs Monmouth | L, 0-3",
 "Final Sep 10 Women's · NJIT at LIU | W, 3-0",
 "Final Sep 13 Women's · NJIT at North Carolina | L, 0-5",
 "Final Sep 20 Women's · NJIT vs New Hampshire | W, 3-2",
 "Final Sep 27 Women's · NJIT at UAlbany | L, 0-2",
 "Final Oct 1 Women's · NJIT vs UMBC | L, 0-1",
 "Final Oct 4 Women's · NJIT at Bryant | L, 0-1",
 "Final Oct 11 Women's · NJIT at Maine | L, 0-2",
 "Final Oct 18 Women's · NJIT vs Vermont | T, 0-0",
 "Final Oct 22 Women's · NJIT at Binghamton | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Women's · NJIT vs UMass Lowell | ",
 "Upcoming Nov 5 Women's · NJIT at America East Quarterfinals | ",
 "Upcoming Nov 8 Women's · NJIT at America East Semifinals | ",
 "Upcoming Nov 15 Women's · NJIT at America East Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · NJIT vs Siena | L, 1-3",
 "Final Aug 23 Men's · NJIT at Saint Joseph's | L, 0-1",
 "Final Aug 28 Men's · NJIT vs Manhattan | W, 4-1",
 "Final Sep 1 Men's · NJIT vs Loyola Maryland | W, 1-0",
 "Final Sep 4 Men's · NJIT at Rider | L, 2-3",
 "Final Sep 7 Men's · NJIT vs James Madison | W, 2-0",
 "Final Sep 12 Men's · NJIT vs FDU | L, 1-2",
 "Final Sep 19 Men's · NJIT at Brown | T, 1-1",
 "Final Sep 26 Men's · NJIT vs Binghamton | W, 2-1",
 "Final Sep 29 Men's · NJIT vs Drexel | W, 3-2",
 "Final Oct 3 Men's · NJIT at Vermont | T, 1-1",
 "Final Oct 10 Men's · NJIT vs New Hampshire | W, 6-3",
 "Final Oct 13 Men's · NJIT at La Salle | T, 3-3",
 "Final Oct 17 Men's · NJIT vs UAlbany | W, 3-1",
 "Upcoming Oct 24, 6:00 PM Men's · NJIT at UMass Lowell | ",
 "Upcoming Oct 30, 6:00 PM Men's · NJIT vs Bryant | ",
 "Upcoming Nov 3, 7:00 PM Men's · NJIT at UMBC | ",
 "Upcoming Nov 7 Men's · NJIT at America East Quarterfinals | ",
 "Upcoming Nov 11 Men's · NJIT at America East Semifinals | ",
 "Upcoming Nov 15 Men's · NJIT at America East Finals | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 NJIT vs Iona | W, 165-127",
 "Final Oct 9 NJIT at NJIT Invitational (Monmouth, Saint Peter's, Bridgeport, Villanova) | Completed",
 "Upcoming Oct 31, 1:00 PM NJIT at Fordham | ",
 "Upcoming Nov 7, 12:00 PM NJIT at Binghamton | ",
 "Upcoming Nov 20 NJIT at Loyola University Maryland | ",
 "Upcoming Dec 5 NJIT at ECAC Championships | ",
 "Upcoming Jan 16 NJIT at Rider | ",
 "Upcoming Jan 23, 12:00 PM NJIT vs Lafayette | ",
 "Upcoming Feb 6, 1:00 PM NJIT at Bryant | ",
 "Upcoming Feb 24 NJIT at America East Conference Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · NJIT at Villanova Invitational | Completed",
 "Final Sep 25 Women's · NJIT at Army West Point Invitational | Completed",
 "Final Oct 2 Women's · NJIT at Villanova Invitational | Completed",
 "Final Oct 15 Women's · NJIT at ITA Regionals | Completed",
 "Today Oct 23 Women's · NJIT at Big South Individuals | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · NJIT at Army Invitational | Completed",
 "Final Sep 19 Men's · NJIT at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · NJIT at Yale Invitational | Completed",
 "Final Oct 2 Men's · NJIT at Saint Joseph's Invitational | Completed",
 "Final Oct 9 Men's · NJIT at Fordham Invitational | Completed",
 "Final Oct 15 Men's · NJIT at ITA Northeast Regional Championship | Completed",
 "Today Oct 23 Men's · NJIT at Big South Individual Championships | ",
 "Upcoming Nov 5 Men's · NJIT at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Men's · NJIT at ITA Sectional Championships | ",
 "Upcoming Nov 6 Men's · NJIT at Drexel Invitational | ",
 "Upcoming Nov 18 Men's · NJIT at NCAA Singles & Doubles Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · NJIT at The Armory Collegiate Distance Carnival | ",
 "Upcoming Dec 5 Women's · NJIT at BU Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 5 Women's · NJIT at Youree Spence-Garcia Invitational | ",
 "Upcoming Dec 11 Women's · NJIT at FDU Team Challenge | ",
 "Upcoming Jan 15 Women's · NJIT at Gotham Cup | ",
 "Upcoming Jan 22 Women's · NJIT at Ramapo College Indoor Invite | ",
 "Upcoming Jan 29 Women's · NJIT at Dr. Sanders Scorcher | ",
 "Upcoming Jan 29 Women's · NJIT at Penn Invite | ",
 "Upcoming Feb 5 Women's · NJIT at Rutgers Scarlet Knight Invite | ",
 "Upcoming Feb 12 Women's · NJIT at Valentine Invitational | ",
 "Upcoming Feb 13 Women's · NJIT at Widener Last Chance | ",
 "Upcoming Feb 19 Women's · NJIT at Philly Metro | ",
 "Upcoming Feb 26 Women's · NJIT at America East Indoor Championships | ",
 "Upcoming Mar 12 Women's · NJIT at NCAA Indoor National Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 4 Men's · NJIT at The Armory Collegiate Distance Carnival | ",
 "Upcoming Dec 5 Men's · NJIT at BU Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 5 Men's · NJIT at Youree Spence-Garcia Invitational | ",
 "Upcoming Dec 11 Men's · NJIT at FDU Team Challenge | ",
 "Upcoming Jan 15 Men's · NJIT at Gotham Cup | ",
 "Upcoming Jan 22 Men's · NJIT at Ramapo College Indoor Invite | ",
 "Upcoming Jan 29 Men's · NJIT at Dr. Sanders Scorcher | ",
 "Upcoming Jan 29 Men's · NJIT at Penn Invite | ",
 "Upcoming Feb 5 Men's · NJIT at Rutgers Scarlet Knight Invite | ",
 "Upcoming Feb 12 Men's · NJIT at Valentine Invitational | ",
 "Upcoming Feb 13 Men's · NJIT at Widener Last Chance | ",
 "Upcoming Feb 19 Men's · NJIT at Philly Metro | ",
 "Upcoming Feb 26 Men's · NJIT at America East Indoor Championships | ",
 "Upcoming Mar 12 Men's · NJIT at NCAA Indoor National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · NJIT vs FDU | L, 0-3",
 "Final Aug 29 Women's · NJIT vs Illinois State | L, 0-3",
 "Final Aug 30 Women's · NJIT at Seton Hall | L, 0-3",
 "Final Sep 2 Women's · NJIT vs Manhattan | W, 3-2",
 "Final Sep 4 Women's · NJIT at Delaware State | L, 0-3",
 "Final Sep 5 Women's · NJIT vs Lehigh | L, 0-3",
 "Final Sep 5 Women's · NJIT vs Quinnipiac | L, 0-3",
 "Final Sep 9 Women's · NJIT vs Lafayette | L, 1-3",
 "Final Sep 11 Women's · NJIT at Iona | L, 1-3",
 "Final Sep 12 Women's · NJIT vs Central Connecticut State | L, 0-3",
 "Final Sep 12 Women's · NJIT vs St. John's | L, 0-3",
 "Final Sep 17 Women's · NJIT vs Seton Hall | L, 2-3",
 "Final Sep 18 Women's · NJIT vs New Haven | L, 1-3",
 "Final Sep 19 Women's · NJIT vs Iona | L, 2-3",
 "Final Sep 25 Women's · NJIT at Bryant | L, 1-3",
 "Final Oct 2 Women's · NJIT vs UAlbany | L, 1-3",
 "Final Oct 4 Women's · NJIT at UMBC | L, 0-3",
 "Final Oct 7 Women's · NJIT vs Saint Peter's | L, 1-3",
 "Final Oct 11 Women's · NJIT at New Hampshire | L, 0-3",
 "Final Oct 16 Women's · NJIT vs Binghamton | L, 0-3",
 "Today Oct 23, 6:00 PM Women's · NJIT at UAlbany | ",
 "Upcoming Oct 30, 2:00 PM Women's · NJIT vs Bryant | ",
 "Upcoming Nov 1, 1:00 PM Women's · NJIT vs New Hampshire | ",
 "Upcoming Nov 8, 12:00 PM Women's · NJIT at Binghamton | ",
 "Upcoming Nov 13, 5:00 PM Women's · NJIT vs UMBC | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("NJIT module checks passed");
