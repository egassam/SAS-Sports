import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {hamptonSchool} from '../src/schools/hampton.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='hampton');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,hamptonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/hampton-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hamptonpirates.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['hampton'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',hamptonSchool.scheduleUrls],['roster',hamptonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('hampton|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hamptonpirates.com',`${key} must stay on hamptonpirates.com`);
  }
}
const parity={"Basketball":{"schedule":["https://hamptonpirates.com/sports/mens-basketball/schedule","https://hamptonpirates.com/sports/womens-basketball/schedule"],"roster":["https://hamptonpirates.com/sports/mens-basketball/roster","https://hamptonpirates.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://hamptonpirates.com/sports/womens-cross-country/schedule","https://hamptonpirates.com/sports/mens-cross-country/schedule"],"roster":["https://hamptonpirates.com/sports/womens-cross-country/roster","https://hamptonpirates.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://hamptonpirates.com/sports/football/schedule"],"roster":["https://hamptonpirates.com/sports/football/roster"],"combined":false},"Lacrosse":{"schedule":["https://hamptonpirates.com/sports/mens-lacrosse/schedule"],"roster":["https://hamptonpirates.com/sports/mens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://hamptonpirates.com/sports/womens-soccer/schedule"],"roster":["https://hamptonpirates.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://hamptonpirates.com/sports/softball/schedule"],"roster":["https://hamptonpirates.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://hamptonpirates.com/sports/womens-tennis/schedule","https://hamptonpirates.com/sports/mens-tennis/schedule"],"roster":["https://hamptonpirates.com/sports/womens-tennis/roster","https://hamptonpirates.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://hamptonpirates.com/sports/womens-track-and-field/schedule","https://hamptonpirates.com/sports/mens-track-and-field/schedule"],"roster":["https://hamptonpirates.com/sports/womens-track-and-field/roster","https://hamptonpirates.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://hamptonpirates.com/sports/triathlon/schedule"],"roster":["https://hamptonpirates.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://hamptonpirates.com/sports/womens-volleyball/schedule"],"roster":["https://hamptonpirates.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'hampton|"+sport+"':"),`${sport} routes must live in the Hampton module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://hamptonpirates.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.hamptonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=hampton)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Hampton at Georgia Tech | ",
 "Upcoming Nov 7, 6:00 PM Men's · Hampton at George Washington | ",
 "Upcoming Nov 10, 11:00 AM Men's · Hampton vs Apprentice School | ",
 "Upcoming Nov 14, 4:00 PM Men's · Hampton at Navy | ",
 "Upcoming Nov 24, 7:00 PM Men's · Hampton at Old Dominion | ",
 "Upcoming Nov 27, 1:00 PM Men's · Hampton vs UMassLowell | ",
 "Upcoming Nov 28, 1:00 PM Men's · Hampton vs Radford | ",
 "Upcoming Nov 29, 4:00 PM Men's · Hampton vs American | ",
 "Upcoming Dec 5, 8:30 PM Men's · Hampton vs Howard | ",
 "Upcoming Dec 8, 7:00 PM Men's · Hampton at Wake Forest | ",
 "Upcoming Dec 12, 4:00 PM Men's · Hampton vs Norfolk State | ",
 "Upcoming Dec 16, 7:00 PM Men's · Hampton vs Mid-Atlantic Christian | ",
 "Upcoming Dec 19, 2:00 PM Men's · Hampton vs UMES | ",
 "Upcoming Dec 31, 1:00 PM Men's · Hampton vs Regent | ",
 "Upcoming Jan 2, 2:00 PM Men's · Hampton vs Drexel | ",
 "Upcoming Jan 7, 7:00 PM Men's · Hampton at Monmouth | ",
 "Upcoming Jan 9, 2:00 PM Men's · Hampton at Northeastern | ",
 "Upcoming Jan 14, 7:00 PM Men's · Hampton at William & Mary | ",
 "Upcoming Jan 16, 2:00 PM Men's · Hampton vs Hofstra | ",
 "Upcoming Jan 18, 9:00 PM Men's · Hampton at N.C. A&T | ",
 "Upcoming Jan 21, 7:00 PM Men's · Hampton vs Elon | ",
 "Upcoming Jan 25, 8:30 PM Men's · Hampton vs Campbell | ",
 "Upcoming Jan 28 Men's · Hampton at Stony Brook | ",
 "Upcoming Jan 30, 2:00 PM Men's · Hampton at Towson | ",
 "Upcoming Feb 4, 7:00 PM Men's · Hampton vs Charleston | ",
 "Upcoming Feb 6, 7:00 PM Men's · Hampton at UNCW | ",
 "Upcoming Feb 13, 7:00 PM Men's · Hampton at Elon | ",
 "Upcoming Feb 18, 7:00 PM Men's · Hampton vs N.C. A&T | ",
 "Upcoming Feb 20, 2:00 PM Men's · Hampton vs Monmouth | ",
 "Upcoming Feb 25, 7:00 PM Men's · Hampton at Charleston | ",
 "Upcoming Feb 27, 2:00 PM Men's · Hampton vs Towson | ",
 "Upcoming Mar 2, 7:00 PM Men's · Hampton vs William & Mary | ",
 "Upcoming Mar 5 Men's · Hampton at CAA Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 1:00 PM Women's · Hampton at Houston | ",
 "Upcoming Nov 5, 12:00 PM Women's · Hampton at SMU | ",
 "Upcoming Nov 9, 7:00 PM Women's · Hampton vs The Apprentice School | ",
 "Upcoming Nov 14, 6:00 PM Women's · Hampton vs Norfolk State | ",
 "Upcoming Nov 16, 7:00 PM Women's · Hampton at High Point | ",
 "Upcoming Nov 22, 2:00 PM Women's · Hampton at Delaware | ",
 "Upcoming Nov 30, 5:00 PM Women's · Hampton at Winthrop | ",
 "Upcoming Dec 4, 7:00 PM Women's · Hampton at Howard | ",
 "Upcoming Dec 14, 7:00 PM Women's · Hampton vs Saint Francis (Pa.) | ",
 "Upcoming Dec 18, 1:30 PM Women's · Hampton vs N.C. Central | ",
 "Upcoming Dec 19, 1:30 PM Women's · Hampton vs Morgan State | ",
 "Upcoming Jan 1, 2:00 PM Women's · Hampton at N.C. A&T | ",
 "Upcoming Jan 3, 2:00 PM Women's · Hampton at Campbell | ",
 "Upcoming Jan 8, 7:00 PM Women's · Hampton vs Charleston | ",
 "Upcoming Jan 10, 2:00 PM Women's · Hampton vs Northeastern | ",
 "Upcoming Jan 15, 7:00 PM Women's · Hampton at William & Mary | ",
 "Upcoming Jan 17, 2:00 PM Women's · Hampton at Towson | ",
 "Upcoming Jan 22, 7:00 PM Women's · Hampton vs UNCW | ",
 "Upcoming Jan 24, 2:00 PM Women's · Hampton vs Hofstra | ",
 "Upcoming Jan 29, 7:00 PM Women's · Hampton at Elon | ",
 "Upcoming Jan 31, 2:00 PM Women's · Hampton vs William & Mary | ",
 "Upcoming Feb 5, 7:00 PM Women's · Hampton vs N.C. A&T | ",
 "Upcoming Feb 12, 1:00 PM Women's · Hampton at Stony Brook | ",
 "Upcoming Feb 14, 2:00 PM Women's · Hampton at Monmouth | ",
 "Upcoming Feb 19, 6:00 PM Women's · Hampton at UNCW | ",
 "Upcoming Feb 21, 2:00 PM Women's · Hampton vs Drexel | ",
 "Upcoming Feb 26, 7:00 PM Women's · Hampton vs Towson | ",
 "Upcoming Feb 28, 2:00 PM Women's · Hampton vs Elon | ",
 "Upcoming Mar 4, 7:00 PM Women's · Hampton at Charleston | ",
 "Upcoming Mar 10 Women's · Hampton at CAA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Hampton at Spider Alumni Open | 7th",
 "Final Sep 18 Women's · Hampton at CNU Invitational | 4th",
 "Final Oct 2 Women's · Hampton at Richmond Invitational | 10th",
 "Upcoming Oct 30 Women's · Hampton at CAA Championships | ",
 "Upcoming Nov 13 Women's · Hampton at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Hampton at Spider Alumni Open | 11th",
 "Final Sep 18 Men's · Hampton at CNU Invitational | 3rd",
 "Final Oct 2 Men's · Hampton at Richmond Invitational | Completed",
 "Upcoming Oct 30 Men's · Hampton at CAA Championships | ",
 "Upcoming Nov 13 Men's · Hampton at NCAA Southeast Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Hampton vs Virginia University of Lynchburg | W, 45-0",
 "Final Sep 5 Hampton at Maryland | L, 0-62",
 "Final Sep 12 Hampton vs Bryant | L, 3-31",
 "Final Sep 19 Hampton at Norfolk State | L, 21-42",
 "Final Sep 26 Hampton vs Campbell | L, 20-44",
 "Final Oct 3 Hampton vs Howard | L, 13-27",
 "Final Oct 17 Hampton at Sacred Heart | L, 21-35",
 "Upcoming Oct 24, 2:02 PM Hampton vs Monmouth | ",
 "Upcoming Oct 31, 1:00 PM Hampton at Towson | ",
 "Upcoming Nov 7, 2:00 PM Hampton at Elon | ",
 "Upcoming Nov 14, 1:02 PM Hampton vs N.C. A&T | ",
 "Upcoming Nov 21, 12:00 PM Hampton at Stony Brook | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Hampton at Indiana | L, 1-2",
 "Final Aug 15 Hampton vs Temple | L, 0-1",
 "Final Aug 22 Hampton vs Howard | T, 1-1",
 "Final Aug 30 Hampton at USC Upstate | L, 0-4",
 "Final Sep 3 Hampton at Delaware State | W, 1-0",
 "Final Sep 6 Hampton at Longwood | L, 0-1",
 "Final Sep 13 Hampton at George Mason | L, 0-3",
 "Final Sep 20 Hampton vs UNCW | L, 0-6",
 "Final Sep 24 Hampton vs Drexel | L, 1-4",
 "Final Sep 27 Hampton vs Towson | L, 1-3",
 "Final Sep 30 Hampton at S.C. State | W, 1-0",
 "Final Oct 4 Hampton vs Charleston | L, 1-4",
 "Final Oct 8 Hampton at Stony Brook | L, 0-1",
 "Final Oct 11 Hampton at Hofstra | L, 1-2",
 "Final Oct 14 Hampton at Virginia State | W, 6-0",
 "Final Oct 18 Hampton at Campbell | L, 3-4",
 "Upcoming Oct 25, 1:00 PM Hampton at Elon | ",
 "Upcoming Oct 28, 2:00 PM Hampton at Regent | ",
 "Upcoming Nov 1, 12:00 PM Hampton vs William & Mary | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Hampton at Christopher Newport Invitational | Completed",
 "Final Sep 17 Women's · Hampton at HBCU Championships | Completed",
 "Final Oct 2 Women's · Hampton at River City Open | Completed",
 "Final Oct 15 Women's · Hampton at ITA Regionals | Completed",
 "Upcoming Oct 24 Women's · Hampton at Morgan State | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Hampton at Christopher Newport | Completed",
 "Final Sep 17 Men's · Hampton at HBCU Championships | Completed",
 "Final Oct 2 Men's · Hampton at River City Open | Completed",
 "Final Oct 8 Men's · Hampton at ITA Regionals | Completed",
 "Upcoming Oct 24 Men's · Hampton at Morgan State Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 4 Hampton at Buccaneer Collegiate Cup | Completed",
 "Final Sep 13 Hampton at Patriots Triathlon | Completed",
 "Final Sep 20 Hampton at Robious Landing Triathlon | Completed",
 "Upcoming Nov 8 Hampton at NCAA Nationals | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Hampton vs Bethune-Cookman | W, 3-0",
 "Final Aug 29 Hampton vs Radford | L, 2-3",
 "Final Aug 29 Hampton vs East Carolina | L, 0-3",
 "Final Sep 2 Hampton at Norfolk State | L, 2-3",
 "Final Sep 5 Hampton vs UMES | W, 3-0",
 "Final Sep 6 Hampton vs George Mason | L, 0-3",
 "Final Sep 11 Hampton vs Florida International | L, 0-3",
 "Final Sep 11 Hampton vs Louisiana | L, 0-3",
 "Final Sep 12 Hampton vs Florida A&M | L, 2-3",
 "Final Sep 18 Hampton at Hofstra | L, 0-3",
 "Final Sep 19 Hampton at Hofstra | L, 0-3",
 "Final Sep 24 Hampton vs Elon | L, 0-3",
 "Final Sep 25 Hampton vs Elon | L, 0-3",
 "Final Sep 30 Hampton vs Norfolk State | L, 1-3",
 "Final Oct 9 Hampton at Charleston | L, 0-3",
 "Final Oct 10 Hampton at Charleston | L, 0-3",
 "Final Oct 16 Hampton vs Campbell | L, 0-3",
 "Final Oct 17 Hampton vs Campbell | L, 0-3",
 "Final Oct 22 Hampton at Towson | L, 0-3",
 "Today Oct 23, 2:00 PM Hampton at Towson | ",
 "Upcoming Oct 30, 6:00 PM Hampton vs Northeastern | ",
 "Upcoming Oct 31, 2:00 PM Hampton vs Northeastern | ",
 "Upcoming Nov 6, 6:00 PM Hampton at William & Mary | ",
 "Upcoming Nov 8, 12:00 PM Hampton at William & Mary | ",
 "Upcoming Nov 12, 6:00 PM Hampton vs UNCW | ",
 "Upcoming Nov 13, 2:00 PM Hampton vs UNCW | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_triathlon,"Triathlon triathlon");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Hampton module checks passed");
