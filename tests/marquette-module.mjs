import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {marquetteSchool} from '../src/schools/marquette.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='marquette');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,marquetteHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/marquette-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gomarquette.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['marquette'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',marquetteSchool.scheduleUrls],['roster',marquetteSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('marquette|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gomarquette.com',`${key} must stay on gomarquette.com`);
  }
}
const parity={"Basketball":{"schedule":["https://gomarquette.com/sports/mens-basketball/schedule","https://gomarquette.com/sports/womens-basketball/schedule"],"roster":["https://gomarquette.com/sports/mens-basketball/roster","https://gomarquette.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gomarquette.com/sports/cross-country/schedule"],"roster":["https://gomarquette.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gomarquette.com/sports/mens-golf/schedule"],"roster":["https://gomarquette.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gomarquette.com/sports/womens-lacrosse/schedule","https://gomarquette.com/sports/mens-lacrosse/schedule"],"roster":["https://gomarquette.com/sports/womens-lacrosse/roster","https://gomarquette.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://gomarquette.com/sports/womens-soccer/schedule","https://gomarquette.com/sports/mens-soccer/schedule"],"roster":["https://gomarquette.com/sports/womens-soccer/roster","https://gomarquette.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://gomarquette.com/sports/womens-tennis/schedule","https://gomarquette.com/sports/mens-tennis/schedule"],"roster":["https://gomarquette.com/sports/womens-tennis/roster","https://gomarquette.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gomarquette.com/sports/track-and-field/schedule"],"roster":["https://gomarquette.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gomarquette.com/sports/womens-volleyball/schedule"],"roster":["https://gomarquette.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'marquette|"+sport+"':"),`${sport} routes must live in the Marquette module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://gomarquette.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.marquetteHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=marquette)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 12:00 PM Men's · Marquette vs Michigan State (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Marquette vs Mercyhurst | ",
 "Upcoming Nov 6, 7:00 PM Men's · Marquette vs Detroit Mercy | ",
 "Upcoming Nov 11, 6:00 PM Men's · Marquette at Michigan | ",
 "Upcoming Nov 15, 1:30 PM Men's · Marquette vs Missouri | ",
 "Upcoming Nov 18, 6:30 PM Men's · Marquette vs Northern Illinois | ",
 "Upcoming Nov 22, 12:00 PM Men's · Marquette vs Chicago State | ",
 "Upcoming Nov 25, 11:00 AM Men's · Marquette vs Virginia | ",
 "Upcoming Nov 27, 4:00 PM Men's · Marquette vs Texas A&M | ",
 "Upcoming Dec 1, 6:30 PM Men's · Marquette vs Wagner | ",
 "Upcoming Dec 5, 1:00 PM Men's · Marquette vs Wisconsin | ",
 "Upcoming Dec 9, 6:30 PM Men's · Marquette vs New Hampshire | ",
 "Upcoming Dec 12, 5:30 PM Men's · Marquette vs Mississippi State | ",
 "Upcoming Dec 19, 5:30 PM Men's · Marquette vs Xavier | ",
 "Upcoming Dec 23, 5:00 PM Men's · Marquette at Butler | ",
 "Upcoming Dec 31, 4:00 PM Men's · Marquette at Creighton | ",
 "Upcoming Jan 5, 7:00 PM Men's · Marquette vs Providence | ",
 "Upcoming Jan 9, 4:00 PM Men's · Marquette at Villanova | ",
 "Upcoming Jan 12, 6:00 PM Men's · Marquette at UConn | ",
 "Upcoming Jan 16, 12:30 PM Men's · Marquette vs DePaul | ",
 "Upcoming Jan 20, 6:00 PM Men's · Marquette vs Creighton | ",
 "Upcoming Jan 23, 1:00 PM Men's · Marquette at Xavier | ",
 "Upcoming Jan 27, 5:30 PM Men's · Marquette at Seton Hall | ",
 "Upcoming Jan 30, 12:30 PM Men's · Marquette vs Butler | ",
 "Upcoming Feb 2, 6:30 PM Men's · Marquette vs St. John's | ",
 "Upcoming Feb 6, 12:30 PM Men's · Marquette vs Georgetown | ",
 "Upcoming Feb 10, 6:00 PM Men's · Marquette at Providence | ",
 "Upcoming Feb 17, 6:00 PM Men's · Marquette at St. John's | ",
 "Upcoming Feb 20, 1:30 PM Men's · Marquette vs UConn | ",
 "Upcoming Feb 23, 8:00 PM Men's · Marquette vs Seton Hall | ",
 "Upcoming Feb 26, 8:00 PM Men's · Marquette vs Villanova | ",
 "Upcoming Mar 2, 5:30 PM Men's · Marquette at Georgetown | ",
 "Upcoming Mar 6, 6:00 PM Men's · Marquette at DePaul | ",
 "Upcoming Mar 10 Men's · Marquette at BIG EAST Championship First Round | ",
 "Upcoming Mar 11 Men's · Marquette at BIG EAST Championship Quarterfinals | ",
 "Upcoming Mar 12 Men's · Marquette at BIG EAST Championship Semifinals | ",
 "Upcoming Mar 13 Men's · Marquette at BIG EAST Championship Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · Marquette vs Mississippi Valley State | ",
 "Upcoming Nov 7, 2:00 PM Women's · Marquette vs Minnesota | ",
 "Upcoming Nov 10, 11:00 AM Women's · Marquette vs Presbyterian College | ",
 "Upcoming Nov 13, 6:30 PM Women's · Marquette at Missouri State | ",
 "Upcoming Nov 17, 6:30 PM Women's · Marquette at Wisconsin | ",
 "Upcoming Nov 21, 2:00 PM Women's · Marquette vs NJIT | ",
 "Upcoming Nov 23, 6:00 PM Women's · Marquette at Milwaukee | ",
 "Upcoming Nov 27, 10:00 AM Women's · Marquette vs Illinois | ",
 "Upcoming Nov 29, 3:00 PM Women's · Marquette vs Belmont | ",
 "Upcoming Dec 4, 10:00 AM Women's · Marquette at Xavier | ",
 "Upcoming Dec 6, 2:00 PM Women's · Marquette vs Butler | ",
 "Upcoming Dec 10, 8:00 PM Women's · Marquette vs Villanova | ",
 "Upcoming Dec 13, 2:00 PM Women's · Marquette vs Wagner | ",
 "Upcoming Dec 20, 2:00 PM Women's · Marquette vs St. John's | ",
 "Upcoming Dec 22, 11:00 AM Women's · Marquette vs Alabama A&M | ",
 "Upcoming Dec 31, 12:00 PM Women's · Marquette at Providence | ",
 "Upcoming Jan 3, 2:00 PM Women's · Marquette vs Seton Hall | ",
 "Upcoming Jan 10, 2:00 PM Women's · Marquette at DePaul | ",
 "Upcoming Jan 13, 6:00 PM Women's · Marquette at UConn | ",
 "Upcoming Jan 17, 2:00 PM Women's · Marquette vs Georgetown | ",
 "Upcoming Jan 20, 6:00 PM Women's · Marquette at Butler | ",
 "Upcoming Jan 23, 12:00 PM Women's · Marquette at Seton Hall | ",
 "Upcoming Jan 28, 6:00 PM Women's · Marquette vs Creighton | ",
 "Upcoming Jan 31, 1:00 PM Women's · Marquette at St. John's | ",
 "Upcoming Feb 3 Women's · Marquette vs Xavier | ",
 "Upcoming Feb 7, 1:30 PM Women's · Marquette vs UConn | ",
 "Upcoming Feb 10, 6:00 PM Women's · Marquette at Georgetown | ",
 "Upcoming Feb 18, 7:00 PM Women's · Marquette at Villanova | ",
 "Upcoming Feb 21, 3:00 PM Women's · Marquette vs Providence | ",
 "Upcoming Feb 24, 6:30 PM Women's · Marquette vs DePaul | ",
 "Upcoming Feb 27, 11:30 AM Women's · Marquette at Creighton | ",
 "Upcoming Mar 5 Women's · Marquette at BIG EAST Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 12 Marquette at Phoenix Open | Women's team: 3rd / Men's team: 2nd",
 "Final Sep 25 Marquette at Jim Allen Classic | Women's team: 1st / Men's team: 1st",
 "Final Oct 2 Marquette at Joe Piane Invitational | Women's team: 20th / Men's team: 3rd",
 "Final Oct 16 Marquette at Panorama Farms Invitational | Women's team: 10th / Men's team: 8th",
 "Upcoming Oct 30, 9:00 AM Marquette at BIG EAST Championships | ",
 "Upcoming Nov 13, 9:00 AM Marquette at NCAA Great Lakes Regional Championships | ",
 "Upcoming Nov 21 Marquette at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Marquette at NY Harbor Cup | T6th of 9",
 "Final Sep 6 Marquette at The Island Resort Intercollegiate | 7th of 12",
 "Final Sep 20 Marquette at Gopher Invitational | T6th of 15",
 "Final Sep 28 Marquette at Windon Memorial Classic | T12th of 16",
 "Final Oct 18 Marquette at Quail Valley Invitational | Completed",
 "Upcoming Feb 12 Marquette at Dominican Republic Classic | ",
 "Upcoming Mar 5 Marquette at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Marquette at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Mar 29 Marquette at Wyoming Cowboy Classic | ",
 "Upcoming Apr 12 Marquette at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 24 Marquette at Fighting Illini Spring Collegiate | ",
 "Upcoming May 1 Marquette at BIG EAST Championship | ",
 "Upcoming May 17 Marquette at NCAA Men's Golf Championship - Regionals | ",
 "Upcoming May 28 Marquette at NCAA Men's Golf Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Marquette at St. Thomas (Minn.) | W, 4-0",
 "Final Aug 16 Women's · Marquette at North Dakota State | W, 2-0",
 "Final Aug 19 Women's · Marquette vs Truman State (Mo.) | W, 4-1",
 "Final Aug 23 Women's · Marquette at Wisconsin | T, 1-1",
 "Final Aug 27 Women's · Marquette vs Milwaukee | T, 0-0",
 "Final Aug 30 Women's · Marquette vs Northern Illinois | T, 0-0",
 "Final Sep 10 Women's · Marquette at Baylor | L, 0-1",
 "Final Sep 13 Women's · Marquette vs Loyola | T, 1-1",
 "Final Sep 19 Women's · Marquette vs Eastern Illinois | W, 3-1",
 "Final Sep 26 Women's · Marquette at Butler | T, 1-1",
 "Final Sep 30 Women's · Marquette at Georgetown | T, 0-0",
 "Final Oct 7 Women's · Marquette vs Creighton | W, 2-1",
 "Final Oct 10 Women's · Marquette at DePaul | W, 1-0",
 "Final Oct 17 Women's · Marquette at St. John's | W, 2-0",
 "Today Oct 21, 6:00 PM Women's · Marquette vs Xavier | ",
 "Upcoming Oct 24, 1:00 PM Women's · Marquette vs UConn | ",
 "Upcoming Oct 28, 5:00 PM Women's · Marquette at Seton Hall | ",
 "Upcoming Oct 31, 1:00 PM Women's · Marquette vs Villanova | ",
 "Upcoming Nov 7, 6:00 PM Women's · Marquette vs Providence | ",
 "Upcoming Nov 12 Women's · Marquette at BIG EAST Tournament Semifinals | ",
 "Upcoming Nov 15 Women's · Marquette at BIG EAST Tournament Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Marquette vs Oakland | T, 2-2",
 "Final Aug 23 Men's · Marquette vs Saint Mary's | W, 2-0",
 "Final Aug 27 Men's · Marquette at Northern Illinois | W, 4-2",
 "Final Aug 31 Men's · Marquette at Wisconsin | L, 1-3",
 "Final Sep 5 Men's · Marquette vs Northwestern | W, 3-1",
 "Final Sep 9 Men's · Marquette vs St. Thomas | W, 2-0",
 "Final Sep 12 Men's · Marquette vs Southern Indiana | W, 3-2",
 "Final Sep 18 Men's · Marquette at Georgetown | L, 0-3",
 "Final Sep 22 Men's · Marquette vs Milwaukee | W, 1-0",
 "Final Sep 26 Men's · Marquette vs Creighton | L, 2-3",
 "Final Oct 2 Men's · Marquette at Xavier | L, 0-3",
 "Final Oct 6 Men's · Marquette vs Carroll | W, 7-2",
 "Final Oct 10 Men's · Marquette vs Butler | W, 4-0",
 "Final Oct 16 Men's · Marquette vs UConn | L, 0-1",
 "Upcoming Oct 24, 2:00 PM Men's · Marquette at DePaul | ",
 "Upcoming Oct 31, 6:00 PM Men's · Marquette at St. John's | ",
 "Upcoming Nov 6, 6:00 PM Men's · Marquette vs Akron | ",
 "Upcoming Nov 12 Men's · Marquette at Big East Semifinals | ",
 "Upcoming Nov 15 Men's · Marquette at Big East Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Marquette at Milwaukee Tennis Classic | Completed",
 "Final Sep 25 Women's · Marquette at Gopher Invitational | Completed",
 "Final Oct 2 Women's · Marquette at Michigan State Invitational | Completed",
 "Final Oct 8 Women's · Marquette at ITA Midwest Regionals | Completed",
 "Final Oct 16 Women's · Marquette at Marquette Invitational | Completed",
 "Upcoming Oct 30 Women's · Marquette at Huskie Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Marquette at Milwaukee Tennis Classic | Completed",
 "Final Sep 12 Men's · Marquette at Youngstown State Invitational | Completed",
 "Final Sep 18 Men's · Marquette at River Forest Invitational | Completed",
 "Final Sep 25 Men's · Marquette at Western Michigan Invitational | Completed",
 "Final Oct 15 Men's · Marquette at ITA Midwest Regionals | Completed",
 "Upcoming Oct 30 Men's · Marquette at Cleveland State Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 24 Marquette vs Texas | L, 2-3",
 "Final Aug 28 Marquette at Dayton | L, 1-3",
 "Final Aug 29 Marquette at Wright State | W, 3-0",
 "Final Sep 5 Marquette vs South Florida | W, 3-0",
 "Final Sep 6 Marquette at Stanford | L, 1-3",
 "Final Sep 11 Marquette vs Illinois | W, 3-0",
 "Final Sep 13 Marquette at Illinois | L, 2-3",
 "Final Sep 17 Marquette at Wisconsin | L, 1-3",
 "Final Sep 19 Marquette vs St. Thomas | W, 3-2",
 "Final Sep 20 Marquette vs Milwaukee | W, 3-0",
 "Final Sep 25 Marquette at UConn | W, 3-0",
 "Final Sep 26 Marquette at Providence | W, 3-0",
 "Final Sep 30 Marquette at DePaul | L, 2-3",
 "Final Oct 4 Marquette at Creighton | W, 3-2",
 "Final Oct 9 Marquette vs Georgetown | W, 3-0",
 "Final Oct 10 Marquette vs Villanova | W, 3-1",
 "Final Oct 16 Marquette at St. John's | W, 3-0",
 "Final Oct 17 Marquette at Seton Hall | W, 3-0",
 "Upcoming Oct 24, 1:00 PM Marquette vs Butler | ",
 "Upcoming Oct 25, 3:00 PM Marquette vs Xavier | ",
 "Upcoming Oct 29, 6:00 PM Marquette vs Creighton | ",
 "Upcoming Nov 1, 1:00 PM Marquette vs DePaul | ",
 "Upcoming Nov 6, 4:00 PM Marquette at Villanova | ",
 "Upcoming Nov 7, 5:00 PM Marquette at Georgetown | ",
 "Upcoming Nov 13, 7:00 PM Marquette vs Seton Hall | ",
 "Upcoming Nov 14, 5:00 PM Marquette vs St. John's | ",
 "Upcoming Nov 21 Marquette at BIG EAST Semifinal | ",
 "Upcoming Nov 22, 1:00 PM Marquette at BIG EAST Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf: Quail Valley (Oct 18-19) publishes no card place; its story's
// headline "Golden Eagles Close Fall With Fifth-Place Finish" gives it.
assert.equal(golfStoryPlace(fixture('story-2026-10-19-mens-golf-golden-eagles-close-fall-with-.html.gz'),{team:"(?:Golden Eagles|Marquette|(?:Men's|Women's) Golf)"}),'5th');

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Marquette module checks passed');
