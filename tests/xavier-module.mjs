import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {xavierSchool} from '../src/schools/xavier.mjs';
import {golfStoryPlace,createGolfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='xavier');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,xavierHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/xavier-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goxavier.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['xavier'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',xavierSchool.scheduleUrls],['roster',xavierSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('xavier|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goxavier.com',`${key} must stay on goxavier.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goxavier.com/sports/baseball/schedule"],"roster":["https://goxavier.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goxavier.com/sports/mens-basketball/schedule","https://goxavier.com/sports/womens-basketball/schedule"],"roster":["https://goxavier.com/sports/mens-basketball/roster","https://goxavier.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goxavier.com/sports/cross-country/schedule"],"roster":["https://goxavier.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://goxavier.com/sports/womens-golf/schedule","https://goxavier.com/sports/golf/schedule"],"roster":["https://goxavier.com/sports/womens-golf/roster","https://goxavier.com/sports/golf/roster"],"combined":false},"Soccer":{"schedule":["https://goxavier.com/sports/womens-soccer/schedule","https://goxavier.com/sports/mens-soccer/schedule"],"roster":["https://goxavier.com/sports/womens-soccer/roster","https://goxavier.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://goxavier.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goxavier.com/sports/mens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://goxavier.com/sports/womens-tennis/schedule","https://goxavier.com/sports/mens-tennis/schedule"],"roster":["https://goxavier.com/sports/womens-tennis/roster","https://goxavier.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goxavier.com/sports/track-and-field/schedule"],"roster":["https://goxavier.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goxavier.com/sports/womens-volleyball/schedule"],"roster":["https://goxavier.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'xavier|"+sport+"':"),`${sport} routes must live in the Xavier module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://goxavier.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.xavierHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=xavier)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 7 Men's · Xavier vs Dayton (Exhibition) | W, 82-76",
 "Final Oct 15 Men's · Xavier at Tennessee (Exhibition) | W, 86-70",
 "Upcoming Oct 23, 7:00 PM Men's · Xavier vs Kent State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Xavier vs Mount St. Mary's | ",
 "Upcoming Nov 6, 7:00 PM Men's · Xavier vs Eastern Michigan | ",
 "Upcoming Nov 10, 7:00 PM Men's · Xavier vs Detroit Mercy | ",
 "Upcoming Nov 13, 9:00 PM Men's · Xavier vs Mississippi State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Xavier vs Cleveland State | ",
 "Upcoming Nov 20, 7:30 PM Men's · Xavier vs Iowa | ",
 "Upcoming Nov 25, 2:30 PM Men's · Xavier vs Texas A&M | ",
 "Upcoming Nov 27, 11:00 AM Men's · Xavier vs Virginia | ",
 "Upcoming Dec 2, 7:00 PM Men's · Xavier vs Texas Southern | ",
 "Upcoming Dec 5, 8:00 PM Men's · Xavier at Cincinnati | ",
 "Upcoming Dec 9, 7:00 PM Men's · Xavier vs Purdue Fort Wayne | ",
 "Upcoming Dec 12, 6:00 PM Men's · Xavier vs Florida International | ",
 "Upcoming Dec 19, 6:30 PM Men's · Xavier at Marquette | ",
 "Upcoming Dec 22, 8:30 PM Men's · Xavier vs Creighton | ",
 "Upcoming Dec 30, 8:00 PM Men's · Xavier at Georgetown | ",
 "Upcoming Jan 2, 12:00 PM Men's · Xavier vs Seton Hall | ",
 "Upcoming Jan 6, 7:00 PM Men's · Xavier vs Villanova | ",
 "Upcoming Jan 9, 1:00 PM Men's · Xavier at Providence | ",
 "Upcoming Jan 12, 8:00 PM Men's · Xavier vs Butler | ",
 "Upcoming Jan 16, 12:00 PM Men's · Xavier at UConn | ",
 "Upcoming Jan 19, 6:30 PM Men's · Xavier at Villanova | ",
 "Upcoming Jan 23, 2:00 PM Men's · Xavier vs Marquette | ",
 "Upcoming Jan 26, 8:00 PM Men's · Xavier vs St. John's | ",
 "Upcoming Jan 30, 2:00 PM Men's · Xavier at DePaul | ",
 "Upcoming Feb 6, 3:30 PM Men's · Xavier at Butler | ",
 "Upcoming Feb 9, 7:00 PM Men's · Xavier vs Georgetown | ",
 "Upcoming Feb 13, 1:00 PM Men's · Xavier at St. John's | ",
 "Upcoming Feb 20, 3:00 PM Men's · Xavier vs DePaul | ",
 "Upcoming Feb 24, 8:30 PM Men's · Xavier at Creighton | ",
 "Upcoming Feb 28, 12:00 PM Men's · Xavier at Seton Hall | ",
 "Upcoming Mar 3, 7:00 PM Men's · Xavier vs Providence | ",
 "Upcoming Mar 6, 2:30 PM Men's · Xavier vs UConn | ",
 "Upcoming Mar 10 Men's · Xavier at BIG EAST Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 12:00 PM Women's · Xavier vs Mercyhurst (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Xavier at Purdue Fort Wayne | ",
 "Upcoming Nov 5, 8:00 PM Women's · Xavier at Northwestern | ",
 "Upcoming Nov 9, 6:30 PM Women's · Xavier vs Akron | ",
 "Upcoming Nov 16, 6:30 PM Women's · Xavier vs Cleveland State | ",
 "Upcoming Nov 21, 1:00 PM Women's · Xavier at Ohio | ",
 "Upcoming Nov 23, 7:00 PM Women's · Xavier at Dayton | ",
 "Upcoming Nov 26, 9:00 PM Women's · Xavier vs Santa Clara | ",
 "Upcoming Nov 28 Women's · Xavier vs Texas Tech/Air Force | ",
 "Upcoming Dec 4, 11:00 AM Women's · Xavier vs Marquette | ",
 "Upcoming Dec 6, 1:00 PM Women's · Xavier vs St. John's | ",
 "Upcoming Dec 10, 6:30 PM Women's · Xavier vs IU Southeast | ",
 "Upcoming Dec 15, 6:30 PM Women's · Xavier vs Cincinnati | ",
 "Upcoming Dec 20, 2:00 PM Women's · Xavier at Georgetown | ",
 "Upcoming Dec 23, 12:00 PM Women's · Xavier at Seton Hall | ",
 "Upcoming Dec 31, 5:00 PM Women's · Xavier vs UConn | ",
 "Upcoming Jan 3, 1:00 PM Women's · Xavier vs Providence | ",
 "Upcoming Jan 7, 7:00 PM Women's · Xavier at St. John's | ",
 "Upcoming Jan 10, 2:00 PM Women's · Xavier at Villanova | ",
 "Upcoming Jan 13, 6:30 PM Women's · Xavier vs DePaul | ",
 "Upcoming Jan 16, 2:00 PM Women's · Xavier at Butler | ",
 "Upcoming Jan 20, 7:30 PM Women's · Xavier at Creighton | ",
 "Upcoming Jan 27, 6:30 PM Women's · Xavier vs Seton Hall | ",
 "Upcoming Jan 31, 1:00 PM Women's · Xavier vs Villanova | ",
 "Upcoming Feb 3, 7:30 PM Women's · Xavier at Marquette | ",
 "Upcoming Feb 6, 1:00 PM Women's · Xavier at Providence | ",
 "Upcoming Feb 10, 6:30 PM Women's · Xavier vs Butler | ",
 "Upcoming Feb 13, 12:00 PM Women's · Xavier at UConn | ",
 "Upcoming Feb 21, 1:00 PM Women's · Xavier vs Georgetown | ",
 "Upcoming Feb 24, 6:30 PM Women's · Xavier vs Creighton | ",
 "Upcoming Feb 28, 3:00 PM Women's · Xavier at DePaul | ",
 "Upcoming Mar 5 Women's · Xavier at BIG EAST Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Xavier at Otterbein Invitational | Completed",
 "Final Sep 19 Xavier at Rumble In The Fort | Completed",
 "Final Oct 3 Xavier at Louisville Cross Country Classic | Women's team: 5th / Men's team: 13th",
 "Final Oct 16 Xavier at Bradley Pink Classic | Women's team: 17th / Men's team: 19th",
 "Upcoming Oct 30 Xavier at BIG EAST Championships | ",
 "Upcoming Nov 13 Xavier at NCAA Great Lakes Regional | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Xavier at The Bruzzy presented by Ashley Herrera | 6th of 11",
 "Final Sep 18 Xavier at Lady Paladin Invitational | T3rd of 12",
 "Final Sep 26 Xavier at Fighting Irish Classic | 6th of 14",
 "Final Oct 2 Xavier at Ron Moore Intercollegiate | 2nd of 15",
 "Final Oct 5 Xavier at Golfweek Put Me In Coach Invitational | Completed",
 "Final Oct 19 Xavier at Flyer Invitational | Completed",
 "Upcoming Feb 19 Xavier at WMU Rio Verde Invitational | ",
 "Upcoming Mar 1 Xavier at Daniel Island Invitational | ",
 "Upcoming Mar 22 Xavier at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Apr 5 Xavier at WKU Olde Stone Intercollegiate | ",
 "Upcoming Apr 10 Xavier at Dolores Black Falcon Invitational | ",
 "Upcoming Apr 17 Xavier at Therese Hession Buckeye Invitational | ",
 "Upcoming Apr 24 Xavier at BIG EAST Championships | "
]);
  const v_golf=parse("Golf","golf");
  assert.deepEqual(v_golf.map(line),[
 "Final Sep 14 Xavier at Bearcat Invitational | 17th of 17",
 "Final Sep 21 Xavier at Rod Myers Invitational | 6th of 13",
 "Final Oct 2 Xavier at The Indy at Forest Hills | Completed",
 "Final Oct 5 Xavier at Cullan Brown Collegiate | 8th of 15",
 "Final Oct 12 Xavier at Moraine Intercollegiate | 8th of 16",
 "Final Oct 12 Xavier at Raider Individual | Completed",
 "Final Oct 19 Xavier at Gateway Logistics Invitational | 1st of 9",
 "Today Oct 19, 11:00 AM Xavier at Saint Mary's Invitational | ",
 "Upcoming Feb 15 Xavier at Hal Williams Collegiate | ",
 "Upcoming Feb 28 Xavier at Lake Jovita Invitational | ",
 "Upcoming Mar 8 Xavier at 42nd Louisiana Classics | ",
 "Upcoming Mar 22 Xavier at Seahawk Intercollegiate | ",
 "Upcoming Apr 5 Xavier at Northern Kentucky's The Jewell | ",
 "Upcoming Apr 8 Xavier at Robert Kepler Intercollegiate | ",
 "Upcoming Apr 10 Xavier at Wright State Invitational | ",
 "Upcoming Apr 12 Xavier at Mountaineer Invitational | ",
 "Upcoming May 1 Xavier at BIG EAST Championships | ",
 "Upcoming May 16 Xavier at NCAA Tournament | ",
 "Upcoming May 28 Xavier at NCAA Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Xavier at Michigan State | L, 0-2",
 "Final Aug 16 Women's · Xavier vs Miami (Ohio) | W, 3-0",
 "Final Aug 26 Women's · Xavier vs Indiana | W, 3-2",
 "Final Sep 6 Women's · Xavier at Vanderbilt | L, 1-4",
 "Final Sep 10 Women's · Xavier vs Dayton | W, 4-0",
 "Final Sep 13 Women's · Xavier vs Western Michigan | W, 3-1",
 "Final Sep 17 Women's · Xavier at Eastern Kentucky | W, 2-0",
 "Final Sep 20 Women's · Xavier at Southern Indiana | W, 2-0",
 "Final Sep 26 Women's · Xavier at Georgetown | W, 4-3",
 "Final Sep 30 Women's · Xavier vs DePaul | T, 1-1",
 "Final Oct 3 Women's · Xavier vs Seton Hall | W, 2-0",
 "Final Oct 7 Women's · Xavier at Villanova | T, 0-0",
 "Final Oct 10 Women's · Xavier vs UConn | T, 2-2",
 "Final Oct 17 Women's · Xavier vs Creighton | W, 5-0",
 "Today Oct 21, 7:00 PM Women's · Xavier at Marquette | ",
 "Upcoming Oct 24, 1:00 PM Women's · Xavier at St. John's | ",
 "Upcoming Oct 28, 6:30 PM Women's · Xavier vs Providence | ",
 "Upcoming Nov 7, 7:00 PM Women's · Xavier at Butler | ",
 "Upcoming Nov 11 Women's · Xavier at BIG EAST Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Xavier vs Purdue Fort Wayne | W, 2-1",
 "Final Aug 25 Men's · Xavier vs Bellarmine | T, 0-0",
 "Final Aug 31 Men's · Xavier at Northwestern | W, 3-2",
 "Final Sep 4 Men's · Xavier vs Bowling Green | W, 2-0",
 "Final Sep 13 Men's · Xavier at St. Thomas | W, 1-0",
 "Final Sep 18 Men's · Xavier at DePaul | T, 1-1",
 "Final Sep 22 Men's · Xavier vs Wright State | W, 6-0",
 "Final Sep 26 Men's · Xavier vs Villanova | W, 2-0",
 "Final Oct 2 Men's · Xavier vs Marquette | W, 3-0",
 "Final Oct 6 Men's · Xavier vs Evansville | W, 4-0",
 "Final Oct 10 Men's · Xavier at Seton Hall | T, 0-0",
 "Final Oct 15 Men's · Xavier vs Creighton | T, 1-1",
 "Final Oct 20 Men's · Xavier vs Northern Kentucky | W, 3-1",
 "Upcoming Oct 24, 7:00 PM Men's · Xavier at Akron | ",
 "Upcoming Oct 31, 6:30 PM Men's · Xavier vs UConn | ",
 "Upcoming Nov 6, 7:00 PM Men's · Xavier at Butler | ",
 "Upcoming Nov 12 Men's · Xavier at BIG EAST Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Xavier at Louisville | Completed",
 "Final Oct 3 Xavier at IU Indy Invite | Women's team: L, 2-3 / Men's team: L, 0-3",
 "Final Oct 16 Xavier at Akron Zips Classic | Completed",
 "Upcoming Oct 24, 1:00 PM Xavier at Denison | ",
 "Upcoming Nov 7, 1:00 PM Xavier vs Northern Kentucky (Senior Meet) | ",
 "Upcoming Nov 19, 10:00 AM Xavier at Denison Swimming and Diving Invitational | ",
 "Upcoming Jan 16, 1:00 PM Xavier at Bellarmine | ",
 "Upcoming Jan 22, 3:00 PM Xavier at Cincinnati | ",
 "Upcoming Jan 23, 11:00 AM Xavier at Miami (Ohio) | ",
 "Upcoming Jan 31, 12:00 PM Xavier at Butler Invite | ",
 "Upcoming Feb 17, 5:45 PM Xavier at BIG EAST Swimming and Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Xavier at NKU Hidden Dual | Completed",
 "Final Oct 8 Women's · Xavier at ITA Ohio Valley Regional (Hosted by Cincinnati) | Completed",
 "Final Oct 16 Women's · Xavier at Lipscomb Hidden Dual | Completed"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Xavier at NKU Hidden Dual | Completed",
 "Final Sep 25 Men's · Xavier at UTR Sports College Circuit at Coastal Georgia | Completed",
 "Final Oct 8 Men's · Xavier at ITA Ohio Valley Regional (Hosted at the Farm & Forge Club) | Completed",
 "Upcoming Oct 23 Men's · Xavier at Wake Forest Invitational | ",
 "Upcoming Nov 5 Men's · Xavier at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Xavier at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Men's · Xavier at Stetson Invite | ",
 "Upcoming Nov 17 Men's · Xavier at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 24 Xavier vs Pitt | L, 0-3",
 "Final Aug 29 Xavier vs Ball State | L, 1-3",
 "Final Aug 30 Xavier at Notre Dame | W, 3-1",
 "Final Sep 4 Xavier vs Campbell | W, 3-2",
 "Final Sep 5 Xavier vs Southern Indiana | W, 3-1",
 "Final Sep 6 Xavier at Georgia Tech | L, 0-3",
 "Final Sep 11 Xavier vs Saint Louis | W, 3-1",
 "Final Sep 12 Xavier vs Austin Peay | W, 3-0",
 "Final Sep 12 Xavier vs Bowling Green | W, 3-0",
 "Final Sep 18 Xavier vs Cincinnati | L, 1-3",
 "Final Sep 20 Xavier vs Akron | W, 3-1",
 "Final Sep 25 Xavier vs Georgetown | W, 3-0",
 "Final Sep 26 Xavier vs Villanova | W, 3-2",
 "Final Oct 2 Xavier at St. John's | L, 2-3",
 "Final Oct 3 Xavier at Seton Hall | W, 3-1",
 "Final Oct 7 Xavier at Butler | W, 3-0",
 "Final Oct 11 Xavier at Creighton | L, 1-3",
 "Final Oct 16 Xavier vs Providence | L, 0-3",
 "Final Oct 17 Xavier vs UConn | W, 3-1",
 "Upcoming Oct 24, 6:00 PM Xavier at DePaul | ",
 "Upcoming Oct 25, 4:00 PM Xavier at Marquette | ",
 "Upcoming Oct 30, 6:00 PM Xavier vs Seton Hall | ",
 "Upcoming Oct 31, 4:00 PM Xavier vs St. John's | ",
 "Upcoming Nov 4, 6:00 PM Xavier vs Butler | ",
 "Upcoming Nov 7, 3:00 PM Xavier vs Creighton | ",
 "Upcoming Nov 13, 6:00 PM Xavier at UConn | ",
 "Upcoming Nov 14, 3:00 PM Xavier at Providence | ",
 "Upcoming Nov 20 Xavier at BIG EAST Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_golf,"Golf golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Golf without a card place: a story of a tournament the team played as
// individuals gives "No team score (individuals only)" (Golfweek Put Me In
// Coach, "individuals only"; Flyer Invitational, "compete as individuals"),
// and a player who "paced the Musketeers" gives no team place (the Flyer
// story's "placing 10th" is Madison Glisson's).
{
  const team="(?:Musketeers|Xavier|(?:Men's|Women's) Golf)";
  assert.deepEqual(['recap-2026-10-6-womens-golf-wraps-up-action-at-golfweek-.html.gz','recap-2026-10-20-womens-golf-glisson-finishes-10th-at-day.html.gz','recap-2026-10-2-mens-golf-aj-adams-wins-the-indy-at-fore.html.gz','recap-2026-10-20-mens-golf-xavier-wins-gateway-logistics-.html.gz'].map(name=>golfStoryPlace(fixture(name),{team})),["No team score (individuals only)","No team score (individuals only)","No team score (individuals only)","1st"]);
  // A tournament named for individuals (Raider Individual, Oct 12-13) has no team place either.
  const story=createGolfStoryPlace({host:'goxavier.com',team,converted:()=>true,decodeHtml:s=>s,fetch:async()=>({ok:true,text:async()=>fixture('recap-2026-10-13-mens-golf-posts-three-top-15-finishes-at.html.gz')})});
  const event={sport:'Golf',status:'Final',headline:'Completed',opponent:'Raider Individual',start_time:'2026-10-12T09:00:00Z',end_time:'2026-10-13T09:00:00Z',recap_url:'https://goxavier.com/news/2026/10/13/mens-golf-posts-three-top-15-finishes-at-raider-individual'};
  await story.attachGolfPlace(event);
  assert.equal(event.headline,'No team score (individuals only)');
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Xavier module checks passed');
