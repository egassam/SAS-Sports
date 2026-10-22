import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bowlingGreenSchool} from '../src/schools/bowling-green.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='bowling-green');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bowlingGreenHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/bowling-green-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bgsufalcons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['bowling-green'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',bowlingGreenSchool.scheduleUrls],['roster',bowlingGreenSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('bowling-green|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bgsufalcons.com',`${key} must stay on bgsufalcons.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bgsufalcons.com/sports/baseball/schedule"],"roster":["https://bgsufalcons.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bgsufalcons.com/sports/mens-basketball/schedule","https://bgsufalcons.com/sports/womens-basketball/schedule"],"roster":["https://bgsufalcons.com/sports/mens-basketball/roster","https://bgsufalcons.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://bgsufalcons.com/sports/womens-cross-country/schedule","https://bgsufalcons.com/sports/mens-cross-country/schedule"],"roster":["https://bgsufalcons.com/sports/womens-cross-country/roster","https://bgsufalcons.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://bgsufalcons.com/sports/football/schedule"],"roster":["https://bgsufalcons.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bgsufalcons.com/sports/womens-golf/schedule","https://bgsufalcons.com/sports/mens-golf/schedule"],"roster":["https://bgsufalcons.com/sports/womens-golf/roster","https://bgsufalcons.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://bgsufalcons.com/sports/womens-gymnastics/schedule"],"roster":["https://bgsufalcons.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://bgsufalcons.com/sports/mens-ice-hockey/schedule"],"roster":["https://bgsufalcons.com/sports/mens-ice-hockey/roster"],"combined":false},"Soccer":{"schedule":["https://bgsufalcons.com/sports/womens-soccer/schedule","https://bgsufalcons.com/sports/mens-soccer/schedule"],"roster":["https://bgsufalcons.com/sports/womens-soccer/roster","https://bgsufalcons.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://bgsufalcons.com/sports/softball/schedule"],"roster":["https://bgsufalcons.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://bgsufalcons.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://bgsufalcons.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://bgsufalcons.com/sports/womens-tennis/schedule"],"roster":["https://bgsufalcons.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://bgsufalcons.com/sports/womens-track-and-field/schedule"],"roster":["https://bgsufalcons.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://bgsufalcons.com/sports/womens-volleyball/schedule"],"roster":["https://bgsufalcons.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'bowling-green|"+sport+"':"),`${sport} routes must live in the Bowling Green module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://bgsufalcons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bowlingGreenHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=bowling-green)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Bowling Green at Georgia State | ",
 "Upcoming Nov 9, 7:00 PM Men's · Bowling Green vs Cleveland State | ",
 "Upcoming Nov 12, 7:00 PM Men's · Bowling Green vs Niagara | ",
 "Upcoming Nov 17, 7:00 PM Men's · Bowling Green at William & Mary | ",
 "Upcoming Nov 21, 2:00 PM Men's · Bowling Green vs Northern Illinois | ",
 "Upcoming Nov 24, 7:00 PM Men's · Bowling Green vs Gardner-Webb | ",
 "Upcoming Nov 27, 6:00 PM Men's · Bowling Green at Indiana | ",
 "Upcoming Dec 2, 7:00 PM Men's · Bowling Green at Kent State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Bowling Green vs Western Michigan | ",
 "Upcoming Dec 16, 7:00 PM Men's · Bowling Green vs Miami (OH) | ",
 "Upcoming Dec 19, 2:00 PM Men's · Bowling Green at Akron | ",
 "Upcoming Dec 22, 2:00 PM Men's · Bowling Green vs Cornerstone | ",
 "Upcoming Dec 29, 6:00 PM Men's · Bowling Green vs Aquinas College | ",
 "Upcoming Jan 2, 2:00 PM Men's · Bowling Green vs Ohio | ",
 "Upcoming Jan 5, 7:00 PM Men's · Bowling Green at Central Michigan | ",
 "Upcoming Jan 9, 3:30 PM Men's · Bowling Green at Eastern Michigan | ",
 "Upcoming Jan 12, 7:00 PM Men's · Bowling Green vs Ball State | ",
 "Upcoming Jan 16 Men's · Bowling Green at Buffalo | ",
 "Upcoming Jan 19, 7:00 PM Men's · Bowling Green vs UMass | ",
 "Upcoming Jan 22, 7:00 PM Men's · Bowling Green vs Kent State | ",
 "Upcoming Jan 26, 7:00 PM Men's · Bowling Green at Western Michigan | ",
 "Upcoming Jan 30, 5:00 PM Men's · Bowling Green vs Toledo | ",
 "Upcoming Feb 2, 7:00 PM Men's · Bowling Green at Ball State | ",
 "Upcoming Feb 6, 2:00 PM Men's · Bowling Green vs MAC-Sun Belt Challenge | ",
 "Upcoming Feb 9, 7:00 PM Men's · Bowling Green at Miami (OH) | ",
 "Upcoming Feb 13, 1:00 PM Men's · Bowling Green vs Buffalo | ",
 "Upcoming Feb 16, 7:00 PM Men's · Bowling Green vs Akron | ",
 "Upcoming Feb 20, 2:00 PM Men's · Bowling Green at Toledo | ",
 "Upcoming Feb 23, 7:00 PM Men's · Bowling Green vs Central Michigan | ",
 "Upcoming Feb 27, 6:00 PM Men's · Bowling Green at UMass | ",
 "Upcoming Mar 2, 7:00 PM Men's · Bowling Green at Ohio | ",
 "Upcoming Mar 5, 7:00 PM Men's · Bowling Green vs Eastern Michigan | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 4:00 PM Women's · Bowling Green vs Ohio Dominican (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Bowling Green vs Georgia Southern | ",
 "Upcoming Nov 5, 7:00 PM Women's · Bowling Green vs Cleveland State | ",
 "Upcoming Nov 10, 11:00 AM Women's · Bowling Green vs Bellarmine | ",
 "Upcoming Nov 16, 11:00 AM Women's · Bowling Green vs Lawrence Tech (Mich.) | ",
 "Upcoming Nov 19, 11:00 AM Women's · Bowling Green at Penn State | ",
 "Upcoming Nov 27 Women's · Bowling Green vs Texas A&M | ",
 "Upcoming Nov 28 Women's · Bowling Green vs Tulsa | ",
 "Upcoming Dec 1, 7:00 PM Women's · Bowling Green at North Carolina A&T | ",
 "Upcoming Dec 3, 11:00 AM Women's · Bowling Green at UNC Wilmington | ",
 "Upcoming Dec 13 Women's · Bowling Green at Notre Dame | ",
 "Upcoming Dec 15, 7:00 PM Women's · Bowling Green vs St. Thomas | ",
 "Upcoming Dec 21, 7:00 PM Women's · Bowling Green at Purdue Fort Wayne | ",
 "Upcoming Dec 28, 1:00 PM Women's · Bowling Green vs Fresno State | ",
 "Upcoming Jan 2 Women's · Bowling Green at Ohio | ",
 "Upcoming Jan 6, 6:30 PM Women's · Bowling Green at Central Michigan | ",
 "Upcoming Jan 9, 2:00 PM Women's · Bowling Green vs Buffalo | ",
 "Upcoming Jan 13, 7:00 PM Women's · Bowling Green vs Western Michigan | ",
 "Upcoming Jan 16 Women's · Bowling Green at Ball State | ",
 "Upcoming Jan 20 Women's · Bowling Green at Eastern Michigan | ",
 "Upcoming Jan 23, 4:00 PM Women's · Bowling Green vs Toledo | ",
 "Upcoming Jan 27, 7:00 PM Women's · Bowling Green vs Kent State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Bowling Green at Buffalo | ",
 "Upcoming Feb 3, 7:00 PM Women's · Bowling Green vs Massachusetts | ",
 "Upcoming Feb 6 Women's · Bowling Green at MAC-Sun Belt Challenge | ",
 "Upcoming Feb 10 Women's · Bowling Green at Akron | ",
 "Upcoming Feb 13, 5:00 PM Women's · Bowling Green vs Ohio | ",
 "Upcoming Feb 17 Women's · Bowling Green at Miami | ",
 "Upcoming Feb 20, 2:00 PM Women's · Bowling Green vs Ball State | ",
 "Upcoming Feb 24, 7:00 PM Women's · Bowling Green vs Eastern Michigan | ",
 "Upcoming Feb 27, 2:00 PM Women's · Bowling Green at Toledo | ",
 "Upcoming Mar 3, 7:00 PM Women's · Bowling Green vs Central Michigan | ",
 "Upcoming Mar 6, 1:00 PM Women's · Bowling Green at Massachusetts | ",
 "Upcoming Mar 10 Women's · Bowling Green at MAC Tournament First Round | ",
 "Upcoming Mar 11 Women's · Bowling Green at MAC Tournament Quarterfinals | ",
 "Upcoming Mar 12 Women's · Bowling Green at MAC Tournament Semifinals | ",
 "Upcoming Mar 13 Women's · Bowling Green at MAC Tournament Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Bowling Green at Mel Brodt Collegiate Open | 2nd of 2 Teams / 34 points",
 "Final Sep 18 Women's · Bowling Green at George Dales Invite | 2nd of 14 Teams / 66 Points",
 "Final Oct 2 Women's · Bowling Green at Paul Short Run | 9th of 37 Teams / 278 Points",
 "Final Oct 16 Women's · Bowling Green at Falcon Invitational | 1st of 6 Teams / 22 Points",
 "Upcoming Oct 30 Women's · Bowling Green at MAC Championship | ",
 "Upcoming Nov 13 Women's · Bowling Green at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Bowling Green at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Bowling Green at Mel Brodt Collegiate Open | 2nd of 2 Teams / 41 Points",
 "Final Sep 18 Men's · Bowling Green at George Dales Invite | 5th of 10 Teams / 104 Points",
 "Final Oct 2 Men's · Bowling Green at Paul Short Run | 34th of 35 Teams / 877 Points",
 "Final Oct 16 Men's · Bowling Green at Falcon Invitational | 1st of 5 Teams / 39 Points",
 "Upcoming Oct 30 Men's · Bowling Green at MAC Championship | ",
 "Upcoming Nov 13 Men's · Bowling Green at NCAA Great Lakes Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Bowling Green vs Tarleton State | L, 13-20",
 "Final Sep 12 Bowling Green at Nebraska | L, 7-56",
 "Final Sep 19 Bowling Green at Iowa State | L, 7-55",
 "Final Sep 26 Bowling Green vs South Florida | L, 6-14",
 "Final Oct 3 Bowling Green at Miami (OH) | W, 24-20",
 "Final Oct 10 Bowling Green vs Sacramento State | W, 38-10",
 "Final Oct 17 Bowling Green vs Ball State | L, 31-32",
 "Upcoming Oct 24, 3:30 PM Bowling Green at Buffalo | ",
 "Upcoming Oct 31, 12:00 PM Bowling Green at Western Michigan | ",
 "Upcoming Nov 10, 7:00 PM Bowling Green vs Kent State | ",
 "Upcoming Nov 20, 7:30 PM Bowling Green at Toledo | ",
 "Upcoming Nov 28, 12:00 PM Bowling Green vs UMass | ",
 "Upcoming Dec 5 Bowling Green at MAC Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Bowling Green at Roseann Schwartz Invitational | 3rd of 11",
 "Final Sep 6 Women's · Bowling Green at A-Ga-Ming Invitational | 2nd of 13",
 "Final Sep 21 Women's · Bowling Green at Mary Fossum Invitational | T4th of 15",
 "Final Sep 29 Women's · Bowling Green at Diane Thomason Invitational | 4th of 13",
 "Final Oct 9 Women's · Bowling Green at Evie Odom Invitational | 11th of 14",
 "Upcoming Feb 19 Women's · Bowling Green at Rio Verde Collegiate Invitational | ",
 "Upcoming Mar 8 Women's · Bowling Green at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 13 Women's · Bowling Green at Valspar Augusta Invitational | ",
 "Upcoming Mar 21 Women's · Bowling Green at City of Oaks Collegiate | ",
 "Upcoming Apr 10 Women's · Bowling Green at Dolores Black Falcon Invitational | ",
 "Upcoming Apr 25 Women's · Bowling Green at MAC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 30 Men's · Bowling Green at Virtues Intercollegiate | T5th of 12",
 "Final Sep 15 Men's · Bowling Green at Redhawk Intercollegiate | 10th of 14",
 "Final Sep 27 Men's · Bowling Green at Earl Yestingsmeier Invitational | T7th of 16",
 "Final Oct 6 Men's · Bowling Green at Tom Tontimonia Invitational | T8th of 12",
 "Final Oct 12 Men's · Bowling Green at Purdue Fall Intercollegiate | 13th of 13",
 "Upcoming Feb 20, 8:00 AM Men's · Bowling Green at The Savannah Intercolligate | ",
 "Upcoming Feb 28, 8:00 AM Men's · Bowling Green at Lake Jovita Invitational | ",
 "Upcoming Mar 8, 8:00 AM Men's · Bowling Green at Babygrande Ross Collegiate Classic | ",
 "Upcoming Mar 27 Men's · Bowling Green at Sweetens Cove Invitational | ",
 "Upcoming Apr 12, 8:00 AM Men's · Bowling Green at Indian Ridge Shootout | ",
 "Upcoming Apr 17, 8:00 AM Men's · Bowling Green at Purdue Spring Boilermaker Shootout | ",
 "Upcoming Apr 30, 8:00 AM Men's · Bowling Green at MAC Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 10, 1:00 PM Bowling Green at Eastern Michigan | ",
 "Upcoming Jan 15, 7:00 PM Bowling Green at Wisconsin-Whitewater | ",
 "Upcoming Jan 15 Bowling Green at Wilberforce | ",
 "Upcoming Jan 15 Bowling Green at Ball State | ",
 "Upcoming Jan 22 Bowling Green at Northern Illinois | ",
 "Upcoming Jan 31, 2:00 PM Bowling Green at Ball State | ",
 "Upcoming Feb 14, 2:00 PM Bowling Green at Western Michigan | ",
 "Upcoming Feb 21, 2:00 PM Bowling Green at Kent State | ",
 "Upcoming Feb 26, 6:00 PM Bowling Green at Centenary College (Louisiana) | ",
 "Upcoming Feb 28, 2:00 PM Bowling Green at Texas Woman's | ",
 "Upcoming Mar 7, 1:00 PM Bowling Green at Central Michigan | ",
 "Upcoming Mar 20, 2:00 PM Bowling Green at MAC Championships | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Bowling Green at Michigan | L, 2-7",
 "Final Oct 3 Bowling Green vs Michigan | L, 3-4",
 "Final Oct 9 Bowling Green vs Sacred Heart | W, 3-2",
 "Final Oct 10 Bowling Green vs UConn | W, 5-2",
 "Final Oct 16 Bowling Green vs Niagara | L, 2-3",
 "Final Oct 17 Bowling Green vs Niagara | L, 1-2",
 "Upcoming Oct 23, 7:07 PM Bowling Green at Lake Superior State | ",
 "Upcoming Oct 24, 7:07 PM Bowling Green at Lake Superior State | ",
 "Upcoming Nov 6, 7:07 PM Bowling Green vs Bemidji State | ",
 "Upcoming Nov 7, 6:07 PM Bowling Green vs Bemidji State | ",
 "Upcoming Nov 13, 7:07 PM Bowling Green at Northern Michigan | ",
 "Upcoming Nov 14, 6:07 PM Bowling Green at Northern Michigan | ",
 "Upcoming Nov 20, 7:07 PM Bowling Green vs Augustana | ",
 "Upcoming Nov 21, 6:07 PM Bowling Green vs Augustana | ",
 "Upcoming Nov 24, 6:30 PM Bowling Green at Notre Dame | ",
 "Upcoming Nov 27, 7:07 PM Bowling Green vs Maryville | ",
 "Upcoming Nov 28, 6:07 PM Bowling Green vs Maryville (Exhibition) | ",
 "Upcoming Dec 4, 8:07 PM Bowling Green at Minnesota State | ",
 "Upcoming Dec 5, 7:07 PM Bowling Green at Minnesota State | ",
 "Upcoming Dec 11, 7:07 PM Bowling Green vs Ferris State | ",
 "Upcoming Dec 12, 6:07 PM Bowling Green vs Ferris State | ",
 "Upcoming Dec 28, 6:00 PM Bowling Green at USA Hockey NTDP (Exhibition) | ",
 "Upcoming Jan 1, 7:07 PM Bowling Green vs Denver | ",
 "Upcoming Jan 2, 6:07 PM Bowling Green vs Denver | ",
 "Upcoming Jan 8, 7:07 PM Bowling Green vs Lake Superior State | ",
 "Upcoming Jan 9, 6:07 PM Bowling Green vs Lake Superior State | ",
 "Upcoming Jan 15, 8:07 PM Bowling Green at Bemidji State | ",
 "Upcoming Jan 16, 7:07 PM Bowling Green at Bemidji State | ",
 "Upcoming Jan 22, 7:07 PM Bowling Green vs Minnesota State | ",
 "Upcoming Jan 23, 7:07 PM Bowling Green vs Minnesota State | ",
 "Upcoming Feb 5, 7:07 PM Bowling Green vs Northern Michigan | ",
 "Upcoming Feb 6, 6:07 PM Bowling Green vs Northern Michigan | ",
 "Upcoming Feb 12, 8:07 PM Bowling Green at Augustana | ",
 "Upcoming Feb 13, 7:07 PM Bowling Green at Augustana | ",
 "Upcoming Feb 19, 7:07 PM Bowling Green vs Michigan Tech | ",
 "Upcoming Feb 20, 6:07 PM Bowling Green vs Michigan Tech | ",
 "Upcoming Feb 26, 7:07 PM Bowling Green at Ferris State | ",
 "Upcoming Feb 27, 6:07 PM Bowling Green at Ferris State | ",
 "Upcoming Mar 5 Bowling Green at CCHA Tournament | ",
 "Upcoming Mar 13 Bowling Green at CCHA Semifinals | ",
 "Upcoming Mar 19 Bowling Green at CCHA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Bowling Green vs Robert Morris | W, 2-0",
 "Final Aug 20 Women's · Bowling Green at Oakland | W, 1-0",
 "Final Aug 23 Women's · Bowling Green at Cincinnati | T, 0-0",
 "Final Aug 30 Women's · Bowling Green vs Michigan | L, 0-1",
 "Final Sep 6 Women's · Bowling Green at Kentucky | W, 2-1",
 "Final Sep 10 Women's · Bowling Green vs Detroit Mercy | W, 2-0",
 "Final Sep 17 Women's · Bowling Green vs Eastern Michigan | T, 0-0",
 "Final Sep 20 Women's · Bowling Green at Akron | T, 1-1",
 "Final Sep 26 Women's · Bowling Green at Central Michigan | W, 1-0",
 "Final Oct 1 Women's · Bowling Green vs Massachusetts | T, 2-2",
 "Final Oct 4 Women's · Bowling Green at Western Michigan | W, 1-0",
 "Final Oct 10 Women's · Bowling Green at Ball State | L, 0-1",
 "Final Oct 15 Women's · Bowling Green vs Toledo | T, 1-1",
 "Final Oct 18 Women's · Bowling Green at Kent State | L, 1-2",
 "Upcoming Oct 24, 1:00 PM Women's · Bowling Green vs Buffalo | ",
 "Upcoming Oct 29, 7:00 PM Women's · Bowling Green at Miami | ",
 "Upcoming Nov 1, 1:00 PM Women's · Bowling Green vs Ohio | ",
 "Upcoming Nov 7 Women's · Bowling Green at MAC Tournament Quarterfinal | ",
 "Upcoming Nov 10 Women's · Bowling Green at MAC Tournament Semifinal | ",
 "Upcoming Nov 13 Women's · Bowling Green at MAC Tournament Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Bowling Green vs Wright State | W, 5-2",
 "Final Aug 23 Men's · Bowling Green at Duquesne | L, 0-3",
 "Final Aug 28 Men's · Bowling Green at IU Indy | L, 0-1",
 "Final Aug 31 Men's · Bowling Green vs Wake Forest | L, 0-1",
 "Final Sep 4 Men's · Bowling Green at Xavier | L, 0-2",
 "Final Sep 11 Men's · Bowling Green vs DePaul | T, 2-2",
 "Final Sep 15 Men's · Bowling Green at Milwaukee | L, 0-1",
 "Final Sep 19 Men's · Bowling Green at Mercyhurst | T, 0-0",
 "Final Sep 25 Men's · Bowling Green vs Western Michigan | L, 0-1",
 "Final Sep 29 Men's · Bowling Green at Northern Kentucky | W, 2-1",
 "Final Oct 3 Men's · Bowling Green at Bradley | W, 2-1",
 "Final Oct 10 Men's · Bowling Green vs Drake | W, 3-1",
 "Final Oct 17 Men's · Bowling Green at Evansville | W, 1-0",
 "Final Oct 20 Men's · Bowling Green at Oakland | W, 2-0",
 "Upcoming Oct 25, 3:00 PM Men's · Bowling Green vs Belmont | ",
 "Upcoming Oct 28, 7:00 PM Men's · Bowling Green vs Wilmington | ",
 "Upcoming Nov 4, 7:00 PM Men's · Bowling Green at UIC | ",
 "Upcoming Nov 7 Men's · Bowling Green at MVC Tournament Quarterfinals | ",
 "Upcoming Nov 11 Men's · Bowling Green at MVC Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · Bowling Green at MVC Tournament Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Bowling Green at IU Indy | W, 200-99",
 "Final Oct 3 Women's · Bowling Green at Bellarmine | W, 239-53",
 "Final Oct 3 Women's · Bowling Green at Eastern Illinois | W, 235-58",
 "Final Oct 3 Women's · Bowling Green at Xavier | W, 216-74",
 "Final Oct 3 Women's · Bowling Green at Butler | W, 222-71",
 "Final Oct 9 Women's · Bowling Green vs Akron | L, 179.5-200.5",
 "Upcoming Nov 6, 6:00 PM Women's · Bowling Green at UTRGV | ",
 "Upcoming Nov 19 Women's · Bowling Green at Magnus Cup Invitational | ",
 "Upcoming Dec 4, 6:00 PM Women's · Bowling Green vs John Carroll | ",
 "Upcoming Dec 4, 6:00 PM Women's · Bowling Green vs Ohio Northern | ",
 "Upcoming Jan 16, 11:00 AM Women's · Bowling Green at Buffalo | ",
 "Upcoming Jan 22, 5:00 PM Women's · Bowling Green vs Marshall | ",
 "Upcoming Jan 23, 1:00 PM Women's · Bowling Green vs Ball State | ",
 "Upcoming Feb 5, 5:00 PM Women's · Bowling Green at Toledo | ",
 "Upcoming Feb 24 Women's · Bowling Green at MAC Championships | ",
 "Upcoming Mar 8 Women's · Bowling Green at NCAA Zone C Diving | ",
 "Upcoming Mar 11 Women's · Bowling Green at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Bowling Green at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Bowling Green at Eastern Michigan Hidden Dual | No Team Scores",
 "Final Oct 2 Bowling Green at Rocket Invitational | Completed",
 "Final Oct 8 Bowling Green at ITA Midwest Regional | Completed",
 "Upcoming Oct 23 Bowling Green at Fall MAC Individual Championships | ",
 "Upcoming Oct 30 Bowling Green at NIU Huskie Indoor Invitational | ",
 "Upcoming Jan 22, 1:00 PM Bowling Green vs Cleveland State | ",
 "Upcoming Jan 29 Bowling Green at Indiana | ",
 "Upcoming Feb 6 Bowling Green at Cincinnati | ",
 "Upcoming Feb 7, 2:30 PM Bowling Green vs Oakland | ",
 "Upcoming Feb 12, 11:00 AM Bowling Green at UC Irvine | ",
 "Upcoming Feb 13 Bowling Green at Cal State Fullerton | ",
 "Upcoming Feb 18, 1:00 PM Bowling Green vs Mercyhurst | ",
 "Upcoming Feb 19, 1:00 PM Bowling Green vs Youngstown State | ",
 "Upcoming Feb 25, 1:00 PM Bowling Green vs Marshall | ",
 "Upcoming Feb 27 Bowling Green at Spring Break (opponents and dates TBA) | ",
 "Upcoming Mar 2 Bowling Green vs Seton Hall | ",
 "Upcoming Mar 6 Bowling Green at Wayne State | ",
 "Upcoming Mar 12 Bowling Green at Eastern Michigan | ",
 "Upcoming Mar 19, 1:00 PM Bowling Green vs Miami | ",
 "Upcoming Mar 26 Bowling Green at Toledo | ",
 "Upcoming Apr 2, 1:00 PM Bowling Green vs Western Michigan | ",
 "Upcoming Apr 4 Bowling Green at Dayton | ",
 "Upcoming Apr 9 Bowling Green at Buffalo | ",
 "Upcoming Apr 16 Bowling Green at Ball State | ",
 "Upcoming Apr 23 Bowling Green vs Massachusetts | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Bowling Green at Tom Wright Open | ",
 "Upcoming Dec 12 Bowling Green at Midwest Classic | ",
 "Upcoming Jan 8 Bowling Green at Falcon Early Bird Open | ",
 "Upcoming Jan 15 Bowling Green at Al Campbell Invite | ",
 "Upcoming Jan 29 Bowling Green at Meyo Invitational | ",
 "Upcoming Feb 5 Bowling Green at Doug Raymond Invitational | ",
 "Upcoming Feb 12 Bowling Green at GVSU Big Meet | ",
 "Upcoming Feb 12 Bowling Green at Heartland Invitational | ",
 "Upcoming Feb 19 Bowling Green at Silverston Invitational | ",
 "Upcoming Feb 26 Bowling Green at MAC Indoor Championship | ",
 "Upcoming Mar 12 Bowling Green at NCAA Indoor Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Bowling Green at Ohio State | W, 3-1",
 "Final Aug 29 Bowling Green vs Northern Kentucky | W, 3-2",
 "Final Aug 30 Bowling Green vs Fresno State | W, 3-0",
 "Final Sep 4 Bowling Green vs Arkansas State | L, 2-3",
 "Final Sep 4 Bowling Green vs American | W, 3-1",
 "Final Sep 5 Bowling Green vs Northern Kentucky | W, 3-1",
 "Final Sep 11 Bowling Green vs Austin Peay | W, 3-1",
 "Final Sep 12 Bowling Green vs Saint Louis | W, 3-0",
 "Final Sep 12 Bowling Green at Xavier | L, 0-3",
 "Final Sep 18 Bowling Green vs Dayton | W, 3-1",
 "Final Sep 19 Bowling Green vs Missouri | L, 1-3",
 "Final Sep 24 Bowling Green vs Miami (OH) | W, 3-1",
 "Final Sep 25 Bowling Green vs Miami (OH) | W, 3-0",
 "Final Oct 1 Bowling Green at Kent State | W, 3-0",
 "Final Oct 2 Bowling Green at Kent State | L, 2-3",
 "Final Oct 9 Bowling Green vs Ohio | W, 3-2",
 "Final Oct 10 Bowling Green vs Ohio | W, 3-0",
 "Final Oct 16 Bowling Green at Buffalo | W, 3-1",
 "Final Oct 17 Bowling Green at Akron | W, 3-1",
 "Upcoming Oct 23, 6:00 PM Bowling Green vs Central Michigan | ",
 "Upcoming Oct 24, 4:00 PM Bowling Green vs Central Michigan | ",
 "Upcoming Oct 30, 6:00 PM Bowling Green at Ball State | ",
 "Upcoming Oct 31, 3:00 PM Bowling Green at Ball State | ",
 "Upcoming Nov 3, 6:00 PM Bowling Green vs Toledo | ",
 "Upcoming Nov 7, 4:00 PM Bowling Green at Western Michigan | ",
 "Upcoming Nov 13, 6:00 PM Bowling Green vs Eastern Michigan | ",
 "Upcoming Nov 14, 7:30 PM Bowling Green at Toledo | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Bowling Green module checks passed");
