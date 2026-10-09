import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {nebraskaSchool,nebraskaGolfCardPlace,nebraskaGolfStoryPlace} from '../src/schools/nebraska.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='nebraska');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,nebraskaHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/nebraska-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit huskers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['nebraska'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',nebraskaSchool.scheduleUrls],['roster',nebraskaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('nebraska|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'huskers.com',`${key} must stay on huskers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://huskers.com/sports/baseball/schedule"],"roster":["https://huskers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://huskers.com/sports/mens-basketball/schedule","https://huskers.com/sports/womens-basketball/schedule"],"roster":["https://huskers.com/sports/mens-basketball/roster","https://huskers.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://huskers.com/sports/beach-volleyball/schedule"],"roster":["https://huskers.com/sports/beach-volleyball/roster"],"combined":false},"Bowling":{"schedule":["https://huskers.com/sports/bowling/schedule"],"roster":["https://huskers.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://huskers.com/sports/cross-country/schedule"],"roster":["https://huskers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://huskers.com/sports/football/schedule"],"roster":["https://huskers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://huskers.com/sports/mens-golf/schedule","https://huskers.com/sports/womens-golf/schedule"],"roster":["https://huskers.com/sports/mens-golf/roster","https://huskers.com/sports/womens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://huskers.com/sports/mens-gymnastics/schedule","https://huskers.com/sports/womens-gymnastics/schedule"],"roster":["https://huskers.com/sports/mens-gymnastics/roster","https://huskers.com/sports/womens-gymnastics/roster"],"combined":true},"Rifle":{"schedule":["https://huskers.com/sports/rifle/schedule"],"roster":["https://huskers.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://huskers.com/sports/soccer/schedule"],"roster":["https://huskers.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://huskers.com/sports/softball/schedule"],"roster":["https://huskers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://huskers.com/sports/swimming-and-diving/schedule"],"roster":["https://huskers.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://huskers.com/sports/mens-tennis/schedule","https://huskers.com/sports/womens-tennis/schedule"],"roster":["https://huskers.com/sports/mens-tennis/roster","https://huskers.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://huskers.com/sports/track-and-field/schedule"],"roster":["https://huskers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://huskers.com/sports/volleyball/schedule"],"roster":["https://huskers.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://huskers.com/sports/wrestling/schedule"],"roster":["https://huskers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'nebraska|"+sport+"':"),`${sport} routes must live in the Nebraska module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://huskers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.nebraskaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];



// BEGIN generated (scripts/generate-module-tests.mjs --school=nebraska)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Sep 26 Nebraska at Wichita State (Exhibition) | L, 7-13",
 "Today Oct 9, 6:00 PM Nebraska vs Creighton | ",
 "Upcoming Feb 19, 9:00 PM Nebraska vs UC Santa Barbara | ",
 "Upcoming Feb 20, 5:30 PM Nebraska vs Oregon State | ",
 "Upcoming Feb 21, 9:00 PM Nebraska vs Vanderbilt | ",
 "Upcoming Feb 22 Nebraska at Grand Canyon | ",
 "Upcoming Feb 26 Nebraska vs Notre Dame | ",
 "Upcoming Feb 27 Nebraska vs Air Force | ",
 "Upcoming Feb 28 Nebraska vs Army | ",
 "Upcoming Mar 4 Nebraska at Pepperdine | ",
 "Upcoming Mar 5 Nebraska at Pepperdine | ",
 "Upcoming Mar 6 Nebraska at Pepperdine | ",
 "Upcoming Mar 7 Nebraska at Pepperdine | ",
 "Upcoming Mar 9 Nebraska vs Kansas State | ",
 "Upcoming Mar 12 Nebraska vs Illinois | ",
 "Upcoming Mar 13 Nebraska vs Illinois | ",
 "Upcoming Mar 14 Nebraska vs Illinois | ",
 "Upcoming Mar 16 Nebraska vs Wichita State | ",
 "Upcoming Mar 17 Nebraska vs Wichita State | ",
 "Upcoming Mar 19 Nebraska at Indiana | ",
 "Upcoming Mar 20 Nebraska at Indiana | ",
 "Upcoming Mar 21 Nebraska at Indiana | ",
 "Upcoming Mar 23 Nebraska at Kansas State | ",
 "Upcoming Mar 26 Nebraska vs Oregon | ",
 "Upcoming Mar 27 Nebraska vs Oregon | ",
 "Upcoming Mar 28 Nebraska vs Oregon | ",
 "Upcoming Mar 30 Nebraska vs Creighton | ",
 "Upcoming Apr 2 Nebraska at Rutgers | ",
 "Upcoming Apr 3 Nebraska at Rutgers | ",
 "Upcoming Apr 4 Nebraska at Rutgers | ",
 "Upcoming Apr 6 Nebraska vs Kansas | ",
 "Upcoming Apr 9 Nebraska vs Purdue | ",
 "Upcoming Apr 10 Nebraska vs Purdue | ",
 "Upcoming Apr 11 Nebraska vs Purdue | ",
 "Upcoming Apr 13 Nebraska vs Creighton | ",
 "Upcoming Apr 16 Nebraska at Iowa | ",
 "Upcoming Apr 17 Nebraska at Iowa | ",
 "Upcoming Apr 18 Nebraska at Iowa | ",
 "Upcoming Apr 21 Nebraska vs South Dakota State | ",
 "Upcoming Apr 23 Nebraska at Northwestern | ",
 "Upcoming Apr 24 Nebraska at Northwestern | ",
 "Upcoming Apr 25 Nebraska at Northwestern | ",
 "Upcoming Apr 27 Nebraska at Kansas | ",
 "Upcoming Apr 30 Nebraska vs Houston Christian | ",
 "Upcoming May 1 Nebraska vs Houston Christian | ",
 "Upcoming May 2 Nebraska vs Houston Christian | ",
 "Upcoming May 7 Nebraska vs Michigan | ",
 "Upcoming May 8 Nebraska vs Michigan | ",
 "Upcoming May 9 Nebraska vs Michigan | ",
 "Upcoming May 11 Nebraska at Creighton | ",
 "Upcoming May 14 Nebraska at Washington | ",
 "Upcoming May 15 Nebraska at Washington | ",
 "Upcoming May 16 Nebraska at Washington | ",
 "Upcoming May 20 Nebraska vs Ohio State | ",
 "Upcoming May 21 Nebraska vs Ohio State | ",
 "Upcoming May 22 Nebraska vs Ohio State | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 9, 7:00 PM Men's · Nebraska vs Saint Louis (Exhibition) | ",
 "Upcoming Oct 16 Men's · Nebraska at BYU (Exhibition) | ",
 "Upcoming Oct 26, 6:30 PM Men's · Nebraska vs Kansas St. (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Nebraska vs Le Moyne | ",
 "Upcoming Nov 7, 6:00 PM Men's · Nebraska vs Providence | ",
 "Upcoming Nov 11, 8:00 PM Men's · Nebraska vs Lindenwood | ",
 "Upcoming Nov 15, 12:00 PM Men's · Nebraska vs Boise St. | ",
 "Upcoming Nov 18, 7:30 PM Men's · Nebraska vs South Dakota | ",
 "Upcoming Nov 22, 12:00 PM Men's · Nebraska vs Butler | ",
 "Upcoming Nov 25, 4:00 PM Men's · Nebraska vs Southern U. | ",
 "Upcoming Dec 2, 7:30 PM Men's · Nebraska vs Ohio St. | ",
 "Upcoming Dec 5, 12:00 PM Men's · Nebraska at Creighton | ",
 "Upcoming Dec 8, 7:00 PM Men's · Nebraska at Penn State | ",
 "Upcoming Dec 12, 6:00 PM Men's · Nebraska vs Missouri | ",
 "Upcoming Dec 17, 6:00 PM Men's · Nebraska vs Mount St. Mary's | ",
 "Upcoming Dec 20, 3:00 PM Men's · Nebraska vs FDU | ",
 "Upcoming Dec 30, 1:00 PM Men's · Nebraska vs New Haven | ",
 "Upcoming Jan 2, 2:45 PM Men's · Nebraska vs Michigan St. | ",
 "Upcoming Jan 5, 6:00 PM Men's · Nebraska vs Michigan | ",
 "Upcoming Jan 10, 5:30 PM Men's · Nebraska at Oregon | ",
 "Upcoming Jan 13, 10:00 PM Men's · Nebraska at Washington | ",
 "Upcoming Jan 16, 7:00 PM Men's · Nebraska vs Iowa | ",
 "Upcoming Jan 19, 8:00 PM Men's · Nebraska at Illinois | ",
 "Upcoming Jan 22, 8:00 PM Men's · Nebraska vs UCLA | ",
 "Upcoming Jan 26, 5:00 PM Men's · Nebraska at Purdue | ",
 "Upcoming Jan 30, 4:00 PM Men's · Nebraska at Iowa | ",
 "Upcoming Feb 6 Men's · Nebraska vs Indiana | ",
 "Upcoming Feb 9, 5:30 PM Men's · Nebraska at Maryland | ",
 "Upcoming Feb 12, 8:30 PM Men's · Nebraska vs Penn State | ",
 "Upcoming Feb 16, 6:00 PM Men's · Nebraska vs Rutgers | ",
 "Upcoming Feb 20, 7:00 PM Men's · Nebraska at Michigan St. | ",
 "Upcoming Feb 23, 8:00 PM Men's · Nebraska vs USC | ",
 "Upcoming Feb 27, 2:00 PM Men's · Nebraska at Northwestern | ",
 "Upcoming Mar 3, 7:30 PM Men's · Nebraska at Wisconsin | ",
 "Upcoming Mar 7, 6:00 PM Men's · Nebraska vs Minnesota | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 23, 6:00 PM Women's · Nebraska vs Wayne State (Exhibition) | ",
 "Upcoming Nov 2, 12:00 PM Women's · Nebraska vs San Jose State | ",
 "Upcoming Nov 7, 2:00 PM Women's · Nebraska vs Western Illinois | ",
 "Upcoming Nov 10, 7:00 PM Women's · Nebraska vs North Carolina A&T | ",
 "Upcoming Nov 14, 3:30 PM Women's · Nebraska vs Kansas | ",
 "Upcoming Nov 17, 7:00 PM Women's · Nebraska vs Mount St. Mary's | ",
 "Upcoming Nov 22, 2:00 PM Women's · Nebraska at Creighton | ",
 "Upcoming Nov 24, 7:00 PM Women's · Nebraska vs Kansas City | ",
 "Upcoming Dec 1, 7:00 PM Women's · Nebraska vs Omaha | ",
 "Upcoming Dec 5, 5:00 PM Women's · Nebraska at Iowa | ",
 "Upcoming Dec 8, 7:00 PM Women's · Nebraska vs North Dakota | ",
 "Upcoming Dec 12, 11:00 AM Women's · Nebraska vs Texas A&M | ",
 "Upcoming Dec 20, 5:00 PM Women's · Nebraska vs California | ",
 "Upcoming Dec 29, 7:00 PM Women's · Nebraska vs Washington | ",
 "Upcoming Jan 2, 7:00 PM Women's · Nebraska at UCLA | ",
 "Upcoming Jan 5, 9:00 PM Women's · Nebraska at Southern California | ",
 "Upcoming Jan 10, 3:30 PM Women's · Nebraska vs Michigan St. | ",
 "Upcoming Jan 13, 6:00 PM Women's · Nebraska vs Michigan | ",
 "Upcoming Jan 17 Women's · Nebraska vs Ohio St. | ",
 "Upcoming Jan 20, 7:00 PM Women's · Nebraska at Northwestern | ",
 "Upcoming Jan 26, 6:00 PM Women's · Nebraska at Illinois | ",
 "Upcoming Jan 31, 1:00 PM Women's · Nebraska vs Oregon | ",
 "Upcoming Feb 4, 7:30 PM Women's · Nebraska vs Iowa | ",
 "Upcoming Feb 7, 11:00 AM Women's · Nebraska at Purdue | ",
 "Upcoming Feb 11, 7:00 PM Women's · Nebraska vs Minnesota | ",
 "Upcoming Feb 14, 11:00 AM Women's · Nebraska at Maryland | ",
 "Upcoming Feb 17, 7:00 PM Women's · Nebraska vs Wisconsin | ",
 "Upcoming Feb 21, 2:00 PM Women's · Nebraska vs Penn State | ",
 "Upcoming Feb 24, 6:00 PM Women's · Nebraska at Rutgers | ",
 "Upcoming Feb 27, 11:00 AM Women's · Nebraska at Indiana | ",
 "Upcoming Mar 3 Women's · Nebraska at Big Ten Tournament | ",
 "Upcoming Mar 17 Women's · Nebraska at Opening Round (12 games) | ",
 "Upcoming Mar 19 Women's · Nebraska at First & Second Rounds | ",
 "Upcoming Mar 26 Women's · Nebraska at Regionals | ",
 "Upcoming Apr 2 Women's · Nebraska at Women's Final Four | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[
 "Upcoming Oct 16 Nebraska at Chelsea Gilliam Penguin Classic | ",
 "Upcoming Oct 30 Nebraska at Destination Orlando | ",
 "Upcoming Nov 6 Nebraska at Bulldog Classic | ",
 "Upcoming Nov 13 Nebraska at Bearcat Classic | ",
 "Upcoming Jan 15 Nebraska at Northeast Classic | ",
 "Upcoming Jan 22 Nebraska at Prairie View | ",
 "Upcoming Jan 29 Nebraska at Saints Invite | ",
 "Upcoming Feb 19 Nebraska at Big Red Invitational | ",
 "Upcoming Feb 26 Nebraska at Stallings Invitational | ",
 "Upcoming Mar 17 Nebraska at Conference USA Championships | ",
 "Upcoming Apr 6 Nebraska at NCAA Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Nebraska at Cyclone Preview | Completed",
 "Final Sep 25 Nebraska at Gans Creek Classic | Completed",
 "Today Oct 9, 10:00 AM Nebraska at Nuttycombe Invitational | ",
 "Upcoming Oct 30, 10:45 AM Nebraska at Big Ten Championships | ",
 "Upcoming Nov 13, 10:00 AM Nebraska at Midwest Regional | ",
 "Upcoming Nov 21, 10:00 AM Nebraska at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Nebraska vs Ohio | W, 49-21",
 "Final Sep 12 Nebraska vs Bowling Green | W, 56-7",
 "Final Sep 19 Nebraska vs North Dakota | W, 34-7",
 "Final Sep 26 Nebraska at Michigan State | W, 31-13",
 "Final Oct 3 Nebraska vs Maryland | W, 48-23",
 "Upcoming Oct 10, 11:00 AM Nebraska vs Indiana | ",
 "Upcoming Oct 17 Nebraska at Oregon | ",
 "Upcoming Oct 31 Nebraska vs Washington | ",
 "Upcoming Nov 6, 7:00 PM Nebraska at Illinois | ",
 "Upcoming Nov 14 Nebraska at Rutgers | ",
 "Upcoming Nov 21 Nebraska vs Ohio State | ",
 "Upcoming Nov 27, 11:00 AM Nebraska at Iowa | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Nebraska at New York Harbor Cup | 9th of 9",
 "Final Sep 14 Men's · Nebraska at Bearcat Invitational | 14th of 17",
 "Final Sep 20 Men's · Nebraska at 2nd Swing Gopher Invitational | 13th of 15",
 "Final Oct 3 Men's · Nebraska at Blessings Collegiate | 8th of 9",
 "Upcoming Oct 18, 8:00 AM Men's · Nebraska at Quail Valley Collegiate | ",
 "Upcoming Oct 31, 9:00 AM Men's · Nebraska at Steelwood Collegiate | ",
 "Upcoming Feb 15, 11:00 AM Men's · Nebraska at The Prestige | ",
 "Upcoming Mar 15, 8:00 AM Men's · Nebraska at The Johnnie-O | ",
 "Upcoming Mar 21, 9:00 AM Men's · Nebraska at GameAbove Collegiate | ",
 "Upcoming Apr 5, 9:00 AM Men's · Nebraska at The Tiger Invitational | ",
 "Upcoming Apr 17, 8:00 AM Men's · Nebraska at Rutgers Invitational | ",
 "Upcoming Apr 30, 9:00 AM Men's · Nebraska at Big Ten Championship | ",
 "Upcoming May 17, 9:00 AM Men's · Nebraska at NCAA Regionals | ",
 "Upcoming May 28, 10:00 AM Men's · Nebraska at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Nebraska at The Bruzzy presented by Ashley Herrera | T4th of 11",
 "Final Sep 21 Women's · Nebraska at Ben Connell Ram Classic | 6th of 13",
 "Final Oct 5 Women's · Nebraska at Oklahoma Intercollegiate presented by PDI | 5th of 11",
 "Upcoming Oct 12, 9:00 AM Women's · Nebraska at Golf Iconic Classic | ",
 "Upcoming Feb 1, 8:00 AM Women's · Nebraska at CIEE Paradise Invitational | ",
 "Upcoming Feb 15, 9:00 AM Women's · Nebraska at Texas Golf Throwdown | ",
 "Upcoming Feb 21, 10:00 AM Women's · Nebraska at Westbrook Spring Invitational | ",
 "Upcoming Mar 8, 10:00 AM Women's · Nebraska at Fresno State Classic | ",
 "Upcoming Mar 22, 10:00 AM Women's · Nebraska at Bell Bank \"Pay It Forward\" | ",
 "Upcoming Apr 5, 8:00 AM Women's · Nebraska at \"Mo\" Morial Invitational | ",
 "Upcoming Apr 23, 8:30 AM Women's · Nebraska at Big Ten Championship | ",
 "Upcoming May 10, 8:00 AM Women's · Nebraska at NCAA Regionals | ",
 "Upcoming May 21, 10:00 AM Women's · Nebraska at NCAA Championship | "
]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 26 Nebraska vs Akron | W, 4743-4673",
 "Final Oct 3 Nebraska at Ohio St. | W, 4730-4675",
 "Upcoming Oct 10, 8:00 AM Nebraska vs Memphis | ",
 "Upcoming Oct 10, 8:00 AM Nebraska at Ole Miss | ",
 "Upcoming Oct 11, 8:00 AM Nebraska at Memphis | ",
 "Upcoming Oct 24, 8:00 AM Nebraska vs Kentucky | ",
 "Upcoming Oct 25, 8:00 AM Nebraska vs Alaska Fairbanks | ",
 "Upcoming Nov 8, 7:00 AM Nebraska at Georgia Southern | ",
 "Upcoming Nov 14, 7:00 AM Nebraska at WVU Fall Classic | ",
 "Upcoming Jan 9, 8:00 AM Nebraska vs UTEP | ",
 "Upcoming Jan 10, 8:00 AM Nebraska vs UTEP | ",
 "Upcoming Jan 23, 9:00 AM Nebraska at Air Force | ",
 "Upcoming Jan 23, 9:00 AM Nebraska vs Alaska Fairbanks | ",
 "Upcoming Jan 24, 9:00 AM Nebraska vs Alaska Fairbanks | ",
 "Upcoming Jan 24, 9:00 AM Nebraska at Air Force | ",
 "Upcoming Feb 5 Nebraska at PRC Championships | ",
 "Upcoming Feb 20, 8:00 AM Nebraska vs Ohio State | ",
 "Upcoming Mar 12 Nebraska at NCAA Championships | "
]);
  const v_soccer=parse("Soccer","soccer");
  assert.deepEqual(v_soccer.map(line),[
 "Final Aug 12 Nebraska at Louisville | W, 3-1",
 "Final Aug 16 Nebraska vs South Dakota | T, 1-1",
 "Final Aug 20 Nebraska vs Notre Dame | T, 1-1",
 "Final Aug 23 Nebraska vs Alabama | L, 0-2",
 "Final Aug 27 Nebraska vs Omaha | W, 3-0",
 "Final Aug 30 Nebraska at Kansas St. | T, 0-0",
 "Final Sep 10 Nebraska vs Indiana | L, 0-1",
 "Final Sep 13 Nebraska at Iowa | T, 0-0",
 "Final Sep 20 Nebraska vs Washington | T, 2-2",
 "Final Sep 24 Nebraska at Michigan St. | L, 2-3",
 "Final Sep 27 Nebraska at Michigan | W, 1-0",
 "Final Oct 4 Nebraska vs Wisconsin | T, 0-0",
 "Final Oct 8 Nebraska at Maryland | T, 0-0",
 "Upcoming Oct 11, 12:00 PM Nebraska at Rutgers | ",
 "Upcoming Oct 18, 1:05 PM Nebraska vs Illinois | ",
 "Upcoming Oct 22, 7:05 PM Nebraska vs Southern California | ",
 "Upcoming Oct 25, 1:05 PM Nebraska vs UCLA | ",
 "Upcoming Oct 30, 7:00 PM Nebraska at Purdue | ",
 "Upcoming Nov 4 Nebraska at Big Ten Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 26 Nebraska vs Kansas (Exhibition) | W, 6-0",
 "Final Sep 26 Nebraska vs Kansas (Exhibition) | W, 7-0",
 "Final Oct 4 Nebraska vs Omaha (Exhibition) | W, 2-0",
 "Final Oct 4 Nebraska vs Omaha (Exhibition) | L, 2-3",
 "Upcoming Oct 10, 1:00 PM Nebraska at KC Diamonds (Exhibition) | ",
 "Upcoming Oct 10, 4:00 PM Nebraska vs Kansas (Exhibition) | ",
 "Upcoming Oct 17, 2:00 PM Nebraska vs South Dakota St. (Exhibition) | ",
 "Upcoming Oct 17, 4:00 PM Nebraska vs South Dakota St. (Exhibition) | ",
 "Upcoming Feb 11, 5:00 PM Nebraska vs Auburn | ",
 "Upcoming Feb 12, 12:00 PM Nebraska vs Virginia Tech | ",
 "Upcoming Feb 12, 3:00 PM Nebraska vs Tennessee | ",
 "Upcoming Feb 13, 12:00 PM Nebraska vs Mississippi St. | ",
 "Upcoming Feb 13, 3:00 PM Nebraska vs Liberty | ",
 "Upcoming Feb 14, 9:00 AM Nebraska vs Bethune-Cookman | ",
 "Upcoming Mar 5, 4:00 PM Nebraska vs Drake | ",
 "Upcoming Mar 5, 6:30 PM Nebraska vs Northern Colo. | ",
 "Upcoming Mar 6, 4:00 PM Nebraska vs South Dakota St. | ",
 "Upcoming Mar 7, 1:30 PM Nebraska vs South Dakota St. | ",
 "Upcoming Mar 7, 4:00 PM Nebraska vs Drake | ",
 "Upcoming Mar 12, 6:00 PM Nebraska vs Minnesota | ",
 "Upcoming Mar 13, 1:00 PM Nebraska vs Minnesota | ",
 "Upcoming Mar 14, 12:00 PM Nebraska vs Minnesota | ",
 "Upcoming Mar 19, 6:00 PM Nebraska vs Northwestern | ",
 "Upcoming Mar 20, 1:00 PM Nebraska vs Northwestern | ",
 "Upcoming Mar 21, 12:00 PM Nebraska vs Northwestern | ",
 "Upcoming Mar 23 Nebraska at Omaha | ",
 "Upcoming Mar 26 Nebraska at Indiana | ",
 "Upcoming Mar 27 Nebraska at Indiana | ",
 "Upcoming Mar 28 Nebraska at Indiana | ",
 "Upcoming Apr 2, 6:00 PM Nebraska at Iowa | ",
 "Upcoming Apr 3, 1:00 PM Nebraska at Iowa | ",
 "Upcoming Apr 4, 12:00 PM Nebraska at Iowa | ",
 "Upcoming Apr 8, 6:00 PM Nebraska vs Connecticut | ",
 "Upcoming Apr 9, 6:00 PM Nebraska vs Connecticut | ",
 "Upcoming Apr 10, 12:00 PM Nebraska vs Connecticut | ",
 "Upcoming Apr 16, 6:00 PM Nebraska vs Ohio St. | ",
 "Upcoming Apr 17, 1:00 PM Nebraska vs Ohio St. | ",
 "Upcoming Apr 18, 12:00 PM Nebraska vs Ohio St. | ",
 "Upcoming Apr 23, 8:00 PM Nebraska at Oregon | ",
 "Upcoming Apr 24, 5:00 PM Nebraska at Oregon | ",
 "Upcoming Apr 25, 2:00 PM Nebraska at Oregon | ",
 "Upcoming Apr 30, 6:00 PM Nebraska vs Purdue | ",
 "Upcoming May 1, 1:00 PM Nebraska vs Purdue | ",
 "Upcoming May 2, 12:00 PM Nebraska vs Purdue | ",
 "Upcoming May 7 Nebraska at Illinois | ",
 "Upcoming May 8 Nebraska at Illinois | ",
 "Upcoming May 9 Nebraska at Illinois | ",
 "Upcoming May 12 Nebraska at Big Ten Softball Tournament | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 Nebraska at Nebraska Good Life Relays (Exhibition) | Completed",
 "Final Oct 2 Nebraska vs Iowa State | W, 197-101",
 "Upcoming Oct 17, 12:00 PM Nebraska at Omaha | ",
 "Upcoming Oct 17, 12:00 PM Nebraska vs South Dakota St. | ",
 "Upcoming Oct 23, 4:00 PM Nebraska at South Dakota | ",
 "Upcoming Oct 23, 4:00 PM Nebraska vs Minnesota | ",
 "Upcoming Nov 6, 4:00 PM Nebraska at Kansas | ",
 "Upcoming Nov 17 Nebraska at Hawkeye Invitational | ",
 "Upcoming Dec 9, 7:00 AM Nebraska at USA Diving Winter Nationals | ",
 "Upcoming Jan 15, 5:00 PM Nebraska vs Iowa | ",
 "Upcoming Jan 15, 5:00 PM Nebraska vs Illinois | ",
 "Upcoming Jan 16, 10:00 AM Nebraska vs Iowa | ",
 "Upcoming Jan 16, 10:00 AM Nebraska vs Illinois | ",
 "Upcoming Jan 29, 5:00 PM Nebraska at Rutgers | ",
 "Upcoming Jan 30, 10:00 AM Nebraska at Rutgers | ",
 "Upcoming Feb 17 Nebraska at Big Ten Championships | ",
 "Upcoming Feb 27 Nebraska at Mizzou Last Chance Meet | ",
 "Upcoming Mar 8 Nebraska at NCAA Zone D Diving Meet | ",
 "Upcoming Mar 17 Nebraska at NCAA Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Nebraska at ITA All-American Championships | Completed",
 "Final Sep 26 Men's · Nebraska at Creighton Invite | Completed",
 "Today Oct 7, 9:00 AM Men's · Nebraska at ITA Regional Tournament | ",
 "Upcoming Oct 29 Men's · Nebraska at Big Ten Individual Championships | ",
 "Upcoming Nov 5 Men's · Nebraska at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Nebraska at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Nebraska at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Nebraska at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Nebraska at Husker Invitational | Completed",
 "Upcoming Oct 14 Women's · Nebraska at ITA Regionals | ",
 "Upcoming Oct 23 Women's · Nebraska at TCU Jae Foundation Battle of the Boot | ",
 "Upcoming Nov 5 Women's · Nebraska at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Nebraska at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Women's · Nebraska at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 27 Nebraska vs Florida (Exhibition) | W, 2-0",
 "Final Aug 27 Nebraska vs SMU (Exhibition) | W, 2-0",
 "Final Aug 29 Nebraska vs UNLV | W, 3-0",
 "Final Aug 30 Nebraska vs Texas | W, 3-0",
 "Final Sep 2 Nebraska at South Dakota State | W, 3-0",
 "Final Sep 4 Nebraska at DePaul | W, 3-0",
 "Final Sep 10 Nebraska vs New Mexico | W, 3-0",
 "Final Sep 11 Nebraska vs Baylor | W, 3-0",
 "Final Sep 12 Nebraska vs Georgia Tech | W, 3-1",
 "Final Sep 16 Nebraska vs Creighton | W, 3-0",
 "Final Sep 18 Nebraska vs North Carolina | W, 3-1",
 "Final Sep 20 Nebraska vs FGCU | W, 3-1",
 "Final Sep 23 Nebraska vs Missouri | W, 3-0",
 "Final Sep 25 Nebraska vs Rutgers | W, 3-0",
 "Final Sep 26 Nebraska vs Ohio State | W, 3-0",
 "Final Oct 1 Nebraska at Penn State | W, 3-0",
 "Final Oct 3 Nebraska at Maryland | W, 3-0",
 "Final Oct 8 Nebraska at Indiana | W, 3-0",
 "Upcoming Oct 10, 6:00 PM Nebraska vs Wisconsin | ",
 "Upcoming Oct 15, 7:00 PM Nebraska at Northwestern | ",
 "Upcoming Oct 17 Nebraska vs Purdue | ",
 "Upcoming Oct 22, 6:00 PM Nebraska vs UCLA | ",
 "Upcoming Oct 24, 8:00 PM Nebraska vs USC | ",
 "Upcoming Oct 30, 5:30 PM Nebraska at Michigan | ",
 "Upcoming Oct 31, 3:30 PM Nebraska at Michigan State | ",
 "Upcoming Nov 7, 9:00 PM Nebraska at Oregon | ",
 "Upcoming Nov 8 Nebraska at Washington | ",
 "Upcoming Nov 12, 6:00 PM Nebraska vs Illinois | ",
 "Upcoming Nov 14 Nebraska vs Iowa | ",
 "Upcoming Nov 17, 7:30 PM Nebraska vs Minnesota | ",
 "Upcoming Nov 20 Nebraska at Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 8, 3:00 PM Nebraska vs Wyoming | ",
 "Upcoming Nov 13 Nebraska at Oklahoma State | ",
 "Upcoming Nov 21 Nebraska at Penn | ",
 "Upcoming Nov 22 Nebraska at Keystone Classic | ",
 "Upcoming Dec 4, 11:00 AM Nebraska at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 19, 6:00 PM Nebraska vs Campbell | ",
 "Upcoming Dec 20, 1:30 PM Nebraska vs Virginia | ",
 "Upcoming Jan 3 Nebraska at Purdue | ",
 "Upcoming Jan 15 Nebraska vs Rutgers | ",
 "Upcoming Jan 22 Nebraska at Maryland | ",
 "Upcoming Jan 24 Nebraska vs Illinois | ",
 "Upcoming Jan 29 Nebraska vs Indiana | ",
 "Upcoming Jan 31 Nebraska at Ohio St. | ",
 "Upcoming Feb 6, 1:00 PM Nebraska vs Minnesota | ",
 "Upcoming Feb 12 Nebraska at Iowa | ",
 "Upcoming Feb 21 Nebraska vs Arizona State | ",
 "Upcoming Mar 6 Nebraska at Big Ten Wrestling Championships | ",
 "Upcoming Mar 18 Nebraska at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_soccer,"Soccer soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_volleyball,"Volleyball volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Nebraska's cards (a newer WMT generation than Iowa's): the venue in its own
// chip (schedule-event-venue__type--home), the day in
// schedule-event-date__label, the opponent in
// schedule-event-item-default__opponent-name, the links (the recap's label
// "Recap") in schedule-event-bottom__link anchors.
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();
const published=slug=>{const raw=fixture(`${slug}-schedule.html.gz`),stat=label=>(raw.match(new RegExp(`schedule-stats-item__label">${label}</strong><strong class="schedule-stats-item__value">([^<]*)`))||[])[1];return[stat('Overall'),stat('Conf\\.')];};
{
  // Venue chips: home and neutral cards read "vs", away "at"; a home rifle
  // match is a dual ("vs Akron"), an invitational a meet.
  assert.deepEqual(parse('Volleyball','volleyball').filter(e=>e.status==='Final').slice(0,6).map(e=>e.title),["Nebraska vs Florida (Exhibition)","Nebraska vs SMU (Exhibition)","Nebraska vs UNLV","Nebraska vs Texas","Nebraska at South Dakota State","Nebraska at DePaul"]);
  assert.deepEqual(parse('Rifle','rifle').filter(e=>/Akron|Ohio St|WVU|PRC/.test(e.opponent)).map(e=>e.title),["Nebraska vs Akron","Nebraska at Ohio St.","Nebraska at WVU Fall Classic","Nebraska at PRC Championships","Nebraska vs Ohio State"]);
  // Internal games are not listed: baseball's "Red-White Series", softball's
  // "Scarlet vs. Cream", volleyball's "Red-White Scrimmage"; nor the "NCAA
  // Selection Show" or swimming's "Holiday Training Trip".
  for(const [sport,slug] of [['Baseball','baseball'],['Softball','softball'],['Volleyball','volleyball'],['Golf','mens-golf'],['Basketball','womens-basketball'],['Swimming & Diving','swimming-and-diving']])assert.ok(!parse(sport,slug).some(e=>/red-white|scarlet|selection show|training trip/i.test(e.opponent)),`${sport}: ${slug}`);
  // A game sport's event-named card reads "at"; the site's exhibition tag
  // labels the game.
  assert.deepEqual(parse('Basketball','womens-basketball').slice(-5).map(e=>e.title),["Women's · Nebraska at Big Ten Tournament","Women's · Nebraska at Opening Round (12 games)","Women's · Nebraska at First & Second Rounds","Women's · Nebraska at Regionals","Women's · Nebraska at Women's Final Four"]);
  assert.deepEqual(parse('Volleyball','volleyball').filter(e=>/Exhibition/.test(e.opponent)).map(e=>[e.title,e.headline]),[["Nebraska vs Florida (Exhibition)","W, 2-0"],["Nebraska vs SMU (Exhibition)","W, 2-0"]]);
  // A tournament on one card under way is today's (men's ITA Regional, Oct
  // 7-11); wrestling's per-day invitational cards are one event.
  assert.deepEqual(parse('Tennis','mens-tennis').filter(e=>e.status==='Today').map(e=>[e.title,e.recency_label,e.end_time]),[["Men's · Nebraska at ITA Regional Tournament","In progress","2026-10-11T23:59:59Z"]]);
  // The page groups keep it while it runs (its first day has passed; its
  // last has not), and drop it once its last day has passed without a final.
  const shown=at=>worker.groupEvents(parse('Tennis','mens-tennis',at),at)[0].upcoming.filter(e=>/ITA Regional/.test(e.opponent)).map(e=>[e.status,e.title]);
  assert.deepEqual(shown(now),[["Today","Men's · Nebraska at ITA Regional Tournament"]]);
  assert.deepEqual(shown(new Date('2026-10-12T15:00:00Z')),[]);
  assert.deepEqual(parse('Wrestling','wrestling').filter(e=>/Cliff Keen/.test(e.opponent)).map(e=>[e.title,e.start_time,e.end_time]),[["Nebraska at Cliff Keen Las Vegas Invitational","2026-12-04T11:00:00.000Z","2026-12-05T23:59:59Z"]]);
  // Each final's own recap link (schedule-event-bottom__link labeled "Recap").
  assert.deepEqual(parse('Football','football').filter(e=>e.status==='Final').map(e=>[e.title,e.headline,e.recap_url]),[["Nebraska vs Ohio","W, 49-21","https://huskers.com/news/2026/09/5/huskers-roll-in-second-half-to-beat-bobcats"],["Nebraska vs Bowling Green","W, 56-7","https://huskers.com/news/2026/09/13/big-red-blasts-bowling-green"],["Nebraska vs North Dakota","W, 34-7","https://huskers.com/news/2026/09/20/huskers-fight-past-hawks"],["Nebraska at Michigan State","W, 31-13","https://huskers.com/news/2026/09/27/huskers-down-spartans-to-remain-undefeated"],["Nebraska vs Maryland","W, 48-23","https://huskers.com/news/2026/10/4/huskers-sprint-past-terps-in-second-half"]]);
  // The records the schedule pages publish (Overall, Conf.).
  for(const [sport,slug] of [['Football','football'],['Volleyball','volleyball'],['Soccer','soccer']])assert.deepEqual(records(sport,slug),published(slug),`${sport}: the computed records are the official ones`);
  // Rifle is not a Big Ten sport: its record has no conference part.
  assert.deepEqual(records('Rifle','rifle'),['2-0',undefined]);
  assert.deepEqual([['Football','football'],['Volleyball','volleyball'],['Soccer','soccer']].map(([,slug])=>published(slug)),[["5-0","2-0"],["16-0","5-0"],["3-3-7","1-2-4"]]);
  // Last season's pages (track, gymnastics "2025-26"; beach volleyball's
  // spring "2026") are empty until the new season is published.
  for(const [sport,slug] of [['Track & Field','track-and-field'],['Gymnastics','mens-gymnastics'],['Gymnastics','womens-gymnastics'],['Beach Volleyball','beach-volleyball']]){const events=worker.nebraskaHandlers.parseSchedule(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),now);assert.ok(worker.nebraskaHandlers.isEmptySchedule(events),`${slug} is a valid empty schedule`);}
}
// Golf: the card's place ("9th/9 (889)", "T4th/11 (852)": the place, the
// field and the team score).
{
  assert.deepEqual(nebraskaGolfCardPlace('T4th/11 (852)'),{"headline":"T4th of 11","results":[{"label":"Result","value":"T4th of 11"},{"label":"Team score","value":"852"}]});
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value}`).join(' / ')]);
  assert.deepEqual([final('mens-golf'),final('womens-golf')],[[["New York Harbor Cup","9th of 9","Result: 9th of 9 / Team score: 889"],["Bearcat Invitational","14th of 17","Result: 14th of 17 / Team score: 864"],["2nd Swing Gopher Invitational","13th of 15","Result: 13th of 15 / Team score: 889"],["Blessings Collegiate","8th of 9","Result: 8th of 9 / Team score: 927"]],[["The Bruzzy presented by Ashley Herrera","T4th of 11","Result: T4th of 11 / Team score: 852"],["Ben Connell Ram Classic","6th of 13","Result: 6th of 13 / Team score: 864"],["Oklahoma Intercollegiate presented by PDI","5th of 11","Result: 5th of 11 / Team score: 855"]]]);
}
// Tennis: a past tournament takes the sport's news-list story whose headline
// names it, dated from its first day to two days after its last (the women's
// ITA All-American story, Sep 24, came while the event ran to Sep 27); one
// without a story is not listed (the men's Creighton Invite).
{
  const stories=(slug,names)=>{recapFixtures.set(`https://huskers.com/sports/${slug}/news`,fixture(`${slug}-archives.html.gz`));for(const name of names){const [y,m,d,...rest]=name.split('-');recapFixtures.set(`https://huskers.com/news/${y}/${m}/${d}/${rest.join('-')}`,fixture(`story-${y}-${m}-${d}-${rest.join('-').slice(0,40)}.html.gz`));}};
  stories('womens-tennis',['2026-09-24-huskers-wrap-up-ita-all-american-championships-look-toward-hosting-husker-invitational','2026-09-27-nu-dominates-husker-invitational-preps-for-utr-pro-tournament']);
  stories('mens-tennis',['2026-09-21-rafiq-continues-on-to-qualifying-draw','2026-09-21-rafiq-seals-upset-win-advances-to-east-draw-round-of-32','2026-09-25-huskers-stay-home-for-utr-pro-tournament']);
  const listed=async slug=>(await worker.schoolModule('nebraska').feed(parse('Tennis',slug),'Tennis')).filter(e=>e.status==='Final').map(e=>[e.title,e.recap_url]);
  assert.deepEqual([await listed('womens-tennis'),await listed('mens-tennis')],[[["Women's · Nebraska at ITA All-American Championships","https://huskers.com/news/2026/09/24/huskers-wrap-up-ita-all-american-championships-look-toward-hosting-husker-invitational"],["Women's · Nebraska at Husker Invitational","https://huskers.com/news/2026/09/27/nu-dominates-husker-invitational-preps-for-utr-pro-tournament"]],[]]);
  const ita=(await worker.schoolModule('nebraska').feed(parse('Tennis','womens-tennis'),'Tennis')).find(e=>/All-American/.test(e.opponent));
  const raw=fixture('story-2026-09-24-huskers-wrap-up-ita-all-american-champio.html.gz');
  assert.equal(worker.nebraskaHandlers.matchesRecap(raw,ita,ita.recap_url),true,'the story dated while the tournament ran is its own');
  assert.equal(worker.nebraskaHandlers.matchesRecap(raw,{...ita,end_time:'2026-09-21T23:59:59Z'},ita.recap_url),false,'a story after the event ended (by more than its window) is not');
  recapFixtures.clear();requests.length=0;
}
// Cross country: one page for both teams; TFRRS gives each race.
{
  recapFixtures.set('https://www.tfrrs.org/teams/xc/NE_college_f_Nebraska.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/NE_college_m_Nebraska.html',fixture('tfrrs-team-m.html.gz'));
  for(const page of [fixture('tfrrs-team-f.html.gz'),fixture('tfrrs-team-m.html.gz')])for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{const body=fixture(`tfrrs-${meet}.html.gz`),url=new URL(href,'https://www.tfrrs.org').href;recapFixtures.set(url,body);recapFixtures.set(url.replace(/\/?$/,'/'),body);}catch{}
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.nebraskaHandlers.attachMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified),[...new Set(e.results.map(r=>r.group.split(' ')[0]))].join()]),[["Cyclone Preview","Women's team: 3rd · 98 pts / Men's team: 5th · 115 pts",true,"Women's,Men's"],["Gans Creek Classic","Women's team: 6th · 200 pts / Men's team: 19th · 508 pts",true,"Women's,Men's"]]);
  recapFixtures.clear();requests.length=0;
}
// Live: ESPN joins the official card for Nebraska's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Nebraska vs Maryland","Final","W, 48-23"]]);
  live('Volleyball','volleyball-espn-2026-10-08.json.gz',parse('Volleyball','volleyball'),new Date('2026-10-09T12:00:00Z'),[["Nebraska at Indiana","Final","W, 3-0"]]);
  live('Soccer','soccer-espn-2026-10-08.json.gz',parse('Soccer','soccer'),new Date('2026-10-09T12:00:00Z'),[["Nebraska at Maryland","Final","T, 0-0"]]);
}
// Other schools and other hosts never reach the Nebraska reader.
assert.equal(worker.nebraskaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://huskers.com/',now),null);
assert.equal(worker.nebraskaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='iowa'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Nebraska module checks passed');
