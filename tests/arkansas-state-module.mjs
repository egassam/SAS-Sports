import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {arkansasStateSchool} from '../src/schools/arkansas-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arkansas-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,arkansasStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/arkansas-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit astateredwolves.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['arkansas-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',arkansasStateSchool.scheduleUrls],['roster',arkansasStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('arkansas-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'astateredwolves.com',`${key} must stay on astateredwolves.com`);
  }
}
const parity={"Baseball":{"schedule":["https://astateredwolves.com/sports/baseball/schedule"],"roster":["https://astateredwolves.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://astateredwolves.com/sports/mens-basketball/schedule","https://astateredwolves.com/sports/womens-basketball/schedule"],"roster":["https://astateredwolves.com/sports/mens-basketball/roster","https://astateredwolves.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://astateredwolves.com/sports/womens-bowling/schedule"],"roster":["https://astateredwolves.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://astateredwolves.com/sports/cross-country/schedule"],"roster":["https://astateredwolves.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://astateredwolves.com/sports/football/schedule"],"roster":["https://astateredwolves.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://astateredwolves.com/sports/womens-golf/schedule","https://astateredwolves.com/sports/mens-golf/schedule"],"roster":["https://astateredwolves.com/sports/womens-golf/roster","https://astateredwolves.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://astateredwolves.com/sports/womens-soccer/schedule"],"roster":["https://astateredwolves.com/sports/womens-soccer/roster"],"combined":false},"Tennis":{"schedule":["https://astateredwolves.com/sports/womens-tennis/schedule"],"roster":["https://astateredwolves.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://astateredwolves.com/sports/track-and-field/schedule"],"roster":["https://astateredwolves.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://astateredwolves.com/sports/womens-volleyball/schedule"],"roster":["https://astateredwolves.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'arkansas-state|"+sport+"':"),`${sport} routes must live in the Arkansas State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://astateredwolves.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.arkansasStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=arkansas-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Arkansas State vs Toledo | ",
 "Upcoming Nov 6 Men's · Arkansas State at Alabama | ",
 "Upcoming Nov 10, 7:00 PM Men's · Arkansas State vs UT Martin | ",
 "Upcoming Nov 14, 7:00 PM Men's · Arkansas State vs Dillard (LA) | ",
 "Upcoming Nov 18, 7:00 PM Men's · Arkansas State vs Arkansas-Pine Bluff | ",
 "Upcoming Nov 23, 2:30 PM Men's · Arkansas State vs Southern Utah | ",
 "Upcoming Nov 24, 2:30 PM Men's · Arkansas State vs Long Beach State | ",
 "Upcoming Nov 25, 2:30 PM Men's · Arkansas State at FIU | ",
 "Upcoming Nov 29, 1:00 PM Men's · Arkansas State vs Rice | ",
 "Upcoming Dec 3, 7:00 PM Men's · Arkansas State vs Missouri State | ",
 "Upcoming Dec 6, 2:00 PM Men's · Arkansas State vs Little Rock | ",
 "Upcoming Dec 12, 2:00 PM Men's · Arkansas State at St. Thomas | ",
 "Upcoming Dec 16, 7:00 PM Men's · Arkansas State vs South Alabama | ",
 "Upcoming Dec 19, 2:00 PM Men's · Arkansas State vs Georgia Southern | ",
 "Upcoming Dec 22, 7:30 PM Men's · Arkansas State vs Crowley's Ridge | ",
 "Upcoming Dec 31, 1:00 PM Men's · Arkansas State at James Madison | ",
 "Upcoming Jan 2, 3:00 PM Men's · Arkansas State at Marshall | ",
 "Upcoming Jan 7, 7:00 PM Men's · Arkansas State vs App State | ",
 "Upcoming Jan 9, 2:00 PM Men's · Arkansas State vs Georgia State | ",
 "Upcoming Jan 14, 6:30 PM Men's · Arkansas State at Louisiana Tech | ",
 "Upcoming Jan 16, 2:30 PM Men's · Arkansas State vs Southern Miss | ",
 "Upcoming Jan 23, 6:00 PM Men's · Arkansas State at Old Dominion | ",
 "Upcoming Jan 27, 7:00 PM Men's · Arkansas State vs Louisiana | ",
 "Upcoming Jan 30, 3:33 PM Men's · Arkansas State at Troy | ",
 "Upcoming Feb 3, 7:00 PM Men's · Arkansas State at South Alabama | ",
 "Upcoming Feb 6, 12:00 PM Men's · Arkansas State at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 7:00 PM Men's · Arkansas State vs ULM | ",
 "Upcoming Feb 13, 2:00 PM Men's · Arkansas State vs Troy | ",
 "Upcoming Feb 17, 7:00 PM Men's · Arkansas State at Louisiana | ",
 "Upcoming Feb 20, 2:30 PM Men's · Arkansas State at ULM | ",
 "Upcoming Feb 24, 7:30 PM Men's · Arkansas State at Southern Miss | ",
 "Upcoming Feb 26, 7:30 PM Men's · Arkansas State vs Louisiana Tech | ",
 "Upcoming Mar 2 Men's · Arkansas State at Sun Belt Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · Arkansas State vs Delta State (Exhibition) | ",
 "Upcoming Nov 2, 5:30 PM Women's · Arkansas State at Ball State | ",
 "Upcoming Nov 7, 1:00 PM Women's · Arkansas State at Florida Gulf Coast | ",
 "Upcoming Nov 11, 7:00 PM Women's · Arkansas State at Loyola Chicago | ",
 "Upcoming Nov 17, 7:00 PM Women's · Arkansas State vs Jackson State | ",
 "Upcoming Nov 22, 1:00 PM Women's · Arkansas State vs North Texas | ",
 "Upcoming Nov 24, 6:00 PM Women's · Arkansas State vs Stephen F. Austin | ",
 "Upcoming Nov 29, 3:30 PM Women's · Arkansas State vs Central Arkansas | ",
 "Upcoming Dec 2, 7:00 PM Women's · Arkansas State at Little Rock | ",
 "Upcoming Dec 6, 2:00 PM Women's · Arkansas State at Arkansas | ",
 "Upcoming Dec 10, 7:00 PM Women's · Arkansas State at Texas | ",
 "Upcoming Dec 14, 7:00 PM Women's · Arkansas State vs Mississippi Valley State | ",
 "Upcoming Dec 19, 1:00 PM Women's · Arkansas State at Georgia Southern | ",
 "Upcoming Dec 22, 5:00 PM Women's · Arkansas State vs Southern Indiana | ",
 "Upcoming Dec 30, 7:00 PM Women's · Arkansas State vs James Madison | ",
 "Upcoming Jan 2, 2:00 PM Women's · Arkansas State vs Marshall | ",
 "Upcoming Jan 7, 6:00 PM Women's · Arkansas State at Georgia State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Arkansas State at Appalachian State | ",
 "Upcoming Jan 13, 7:00 PM Women's · Arkansas State vs South Alabama | ",
 "Upcoming Jan 16, 12:00 PM Women's · Arkansas State vs Troy | ",
 "Upcoming Jan 21, 6:30 PM Women's · Arkansas State at ULM | ",
 "Upcoming Jan 23, 2:00 PM Women's · Arkansas State at South Alabama | ",
 "Upcoming Jan 28, 7:00 PM Women's · Arkansas State vs Louisiana | ",
 "Upcoming Jan 30, 2:00 PM Women's · Arkansas State vs Southern Miss | ",
 "Upcoming Feb 3, 11:00 AM Women's · Arkansas State vs Old Dominion | ",
 "Upcoming Feb 6, 2:00 PM Women's · Arkansas State at MAC-SBC Challenge | ",
 "Upcoming Feb 11, 5:00 PM Women's · Arkansas State at Southern Miss | ",
 "Upcoming Feb 13, 1:00 PM Women's · Arkansas State at Louisiana | ",
 "Upcoming Feb 17, 6:30 PM Women's · Arkansas State at Louisiana Tech | ",
 "Upcoming Feb 20, 2:00 PM Women's · Arkansas State at Troy | ",
 "Upcoming Feb 23, 7:00 PM Women's · Arkansas State vs ULM | ",
 "Upcoming Feb 26, 5:00 PM Women's · Arkansas State vs Louisiana Tech | ",
 "Upcoming Mar 2 Women's · Arkansas State at Sun Belt Conference Championship | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 16 Arkansas State vs Vanderbilt | L, 984-1032",
 "Final Oct 16 Arkansas State vs Youngstown State | W, 1087-887",
 "Final Oct 16 Arkansas State vs Nebraska | L, 989-1110",
 "Final Oct 16 Arkansas State vs Sacred Heart | W, 1101-914",
 "Final Oct 16 Arkansas State vs Maryville | W, 996-878",
 "Final Oct 17 Arkansas State vs Jacksonville State | L, 866-963",
 "Final Oct 17 Arkansas State vs William Smith College | W, 993-927",
 "Final Oct 17 Arkansas State vs Duquesne | L, 1000-1007",
 "Final Oct 17 Arkansas State vs Niagara | W, 1043-977",
 "Final Oct 17 Arkansas State vs Mercyhurst | W, 1071-859",
 "Final Oct 18 Arkansas State at Wright State | L, 2.5-4.5",
 "Final Oct 18 Arkansas State vs North Carolina A&T | L, 2-4",
 "Final Oct 18 Arkansas State vs Mount St. Mary's | W, 4-0",
 "Upcoming Oct 30 Arkansas State at Destination Orlando | ",
 "Upcoming Oct 31 Arkansas State at Destination Orlando | ",
 "Upcoming Nov 1 Arkansas State at Destination Orlando | ",
 "Upcoming Nov 6 Arkansas State at Bulldog Classic | ",
 "Upcoming Nov 7 Arkansas State at Bulldog Classic | ",
 "Upcoming Nov 8 Arkansas State at Bulldog Classic | ",
 "Upcoming Nov 20 Arkansas State at Jersey Jamboree | ",
 "Upcoming Nov 21 Arkansas State at Jersey Jamboree | ",
 "Upcoming Nov 22 Arkansas State at Jersey Jamboree | ",
 "Upcoming Jan 15 Arkansas State at Northeast Classic | ",
 "Upcoming Jan 16 Arkansas State at Northeast Classic | ",
 "Upcoming Jan 17 Arkansas State at Northeast Classic | ",
 "Upcoming Jan 22 Arkansas State at Prairie View Invitational | ",
 "Upcoming Jan 23 Arkansas State at Prairie View Invitational | ",
 "Upcoming Jan 24 Arkansas State at Prairie View Invitational | ",
 "Upcoming Feb 5 Arkansas State at Flyer Classic | ",
 "Upcoming Feb 6 Arkansas State at Flyer Classic | ",
 "Upcoming Feb 7 Arkansas State at Flyer Classic | ",
 "Upcoming Feb 19 Arkansas State at Big Red Invitational | ",
 "Upcoming Feb 20 Arkansas State at Big Red Invitational | ",
 "Upcoming Feb 21 Arkansas State at Big Red Invitational | ",
 "Upcoming Mar 5 Arkansas State at Music City Classic | ",
 "Upcoming Mar 6 Arkansas State at Music City Classic | ",
 "Upcoming Mar 7 Arkansas State at Music City Classic | ",
 "Upcoming Mar 17 Arkansas State at Conference USA Championship | ",
 "Upcoming Mar 18 Arkansas State at Conference USA Championship | ",
 "Upcoming Mar 19 Arkansas State at Conference USA Championship | ",
 "Upcoming Mar 20 Arkansas State at Conference USA Championship | ",
 "Upcoming Mar 21 Arkansas State at Conference USA Championship | ",
 "Upcoming Apr 6 Arkansas State at NCAA Championship | ",
 "Upcoming Apr 7 Arkansas State at NCAA Championship | ",
 "Upcoming Apr 8 Arkansas State at NCAA Championship | ",
 "Upcoming Apr 9 Arkansas State at NCAA Championship | ",
 "Upcoming Apr 10 Arkansas State at NCAA Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Arkansas State at City Auto Twilight Memphis XC Classic | Completed",
 "Final Sep 18 Arkansas State at Southern Showcase | Completed",
 "Final Oct 3 Arkansas State at CBU Invitational | Completed",
 "Final Oct 16 Arkansas State at Crimson Classic | Completed",
 "Upcoming Oct 30 Arkansas State at Sun Belt Conference Cross Country Championships | ",
 "Upcoming Nov 13 Arkansas State at NCAA South Central Regional | ",
 "Upcoming Nov 21 Arkansas State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Arkansas State at Memphis | L, 24-42",
 "Final Sep 12 Arkansas State vs West Georgia | W, 52-7",
 "Final Sep 19 Arkansas State at TCU | L, 7-31",
 "Final Sep 26 Arkansas State vs Kennesaw State | W, 17-14",
 "Final Oct 3 Arkansas State at Louisiana | L, 20-23",
 "Final Oct 8 Arkansas State vs South Alabama | L, 49-56",
 "Final Oct 17 Arkansas State at Southern Miss | W, 23-13",
 "Upcoming Oct 24, 6:00 PM Arkansas State vs Georgia State | ",
 "Upcoming Nov 7, 2:00 PM Arkansas State vs ULM | ",
 "Upcoming Nov 14 Arkansas State at Coastal Carolina | ",
 "Upcoming Nov 21 Arkansas State at Louisiana Tech | ",
 "Upcoming Nov 28, 2:00 PM Arkansas State vs Troy | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Arkansas State at Golfweek Fall Challenge | 13th of 23",
 "Final Sep 19 Women's · Arkansas State at Schooner Fall Classic | 16th of 16",
 "Final Oct 12 Women's · Arkansas State at Lady Red Wolves Classic | 1st of 13",
 "Final Oct 18 Women's · Arkansas State at Diamante Invitational | 7th of 20",
 "Upcoming Oct 26 Women's · Arkansas State at 48th Annual Pat Bradley Invitational | ",
 "Upcoming Feb 7 Women's · Arkansas State at Treasure Coast Invitational | ",
 "Upcoming Mar 1 Women's · Arkansas State at Daniel Island Invitational | ",
 "Upcoming Mar 8 Women's · Arkansas State at Riverbend Intercollegiate | ",
 "Upcoming Apr 4 Women's · Arkansas State at Ironwood Invitational | ",
 "Upcoming Apr 19 Women's · Arkansas State at Sun Belt Conference Championship | ",
 "Upcoming May 10 Women's · Arkansas State at NCAA Regionals | ",
 "Upcoming May 21 Women's · Arkansas State at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Arkansas State at Bomb Darts Birds Collegiate | 3rd of 13",
 "Final Sep 25 Men's · Arkansas State at William H. Tucker Invitational | 6th of 15",
 "Final Sep 29 Men's · Arkansas State at Mark Simpson Colorado Invitational | 1st of 17",
 "Final Oct 12 Men's · Arkansas State at Bubba Barnett Intercollegiate | 1st of 17",
 "Final Oct 19 Men's · Arkansas State at The Saint Mary's Invitational | Completed",
 "Upcoming Mar 8 Men's · Arkansas State at R.E. Lamkin Invitational | ",
 "Upcoming Mar 14 Men's · Arkansas State at Michael A. Marino Classic | ",
 "Upcoming Mar 22 Men's · Arkansas State at Bell Bank Pay It Forward Collegiate | ",
 "Upcoming Apr 5 Men's · Arkansas State at Golfweek Intercollegiate at Rolling Hills CC | ",
 "Upcoming Apr 26 Men's · Arkansas State at Sun Belt Conference Championship | ",
 "Upcoming May 17 Men's · Arkansas State at NCAA Regionals | ",
 "Upcoming May 28 Men's · Arkansas State at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Arkansas State at UT Martin (Exhibition) | T, 1-1",
 "Final Aug 12 Arkansas State at Lipscomb | L, 0-1",
 "Final Aug 16 Arkansas State vs Little Rock | L, 1-2",
 "Final Aug 23 Arkansas State vs Central Arkansas | T, 2-2",
 "Final Aug 27 Arkansas State vs Stephen F. Austin | W, 2-1",
 "Final Aug 30 Arkansas State vs Alabama State | T, 2-2",
 "Final Sep 3 Arkansas State at Southern Indiana | W, 1-0",
 "Final Sep 13 Arkansas State at Georgia Southern | L, 0-3",
 "Final Sep 24 Arkansas State vs Southern Miss | L, 0-1",
 "Final Sep 27 Arkansas State at ULM | W, 3-2",
 "Final Oct 2 Arkansas State at Georgia State | L, 0-2",
 "Final Oct 7 Arkansas State vs James Madison | L, 0-2",
 "Final Oct 11 Arkansas State at Louisiana Tech | L, 0-2",
 "Final Oct 16 Arkansas State vs Appalachian State | T, 1-1",
 "Today Oct 22, 4:00 PM Arkansas State vs South Alabama | ",
 "Upcoming Oct 25, 1:00 PM Arkansas State at Troy | ",
 "Upcoming Nov 1, 1:00 PM Arkansas State vs Louisiana | ",
 "Upcoming Nov 9 Arkansas State at Sun Belt Conference Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Arkansas State at Memphis Invite | Completed",
 "Final Sep 19 Arkansas State at ITA All-Americans | Completed",
 "Final Oct 2 Arkansas State at Tulsa Invite | Completed",
 "Final Oct 15 Arkansas State at ITA Regionals | Completed",
 "Upcoming Nov 5 Arkansas State at ITA Sectionals | ",
 "Upcoming Nov 5 Arkansas State at Hawaii Invitational | ",
 "Upcoming Jan 16 Arkansas State vs Middle Tennessee | ",
 "Upcoming Jan 18 Arkansas State vs St. John's | ",
 "Upcoming Jan 23, 11:00 AM Arkansas State vs Tulsa | ",
 "Upcoming Jan 30 Arkansas State at Missouri State | ",
 "Upcoming Jan 30 Arkansas State vs Southeast Missouri | ",
 "Upcoming Feb 12 Arkansas State at Oklahoma State | ",
 "Upcoming Feb 13 Arkansas State vs New Mexico | ",
 "Upcoming Feb 20, 5:00 PM Arkansas State at Missouri | ",
 "Upcoming Feb 26 Arkansas State at Memphis | ",
 "Upcoming Feb 27 Arkansas State vs Michigan State | ",
 "Upcoming Mar 7 Arkansas State vs Oral Roberts | ",
 "Upcoming Mar 13 Arkansas State at North Texas | ",
 "Upcoming Mar 16 Arkansas State at UAB | ",
 "Upcoming Mar 20 Arkansas State at Santa Clara | ",
 "Upcoming Mar 23 Arkansas State at Sacramento State | ",
 "Upcoming Mar 26 Arkansas State vs UT Arlington | ",
 "Upcoming Mar 28 Arkansas State vs Georgia State | ",
 "Upcoming Apr 2 Arkansas State vs Georgia Southern | ",
 "Upcoming Apr 4 Arkansas State vs Louisiana Tech | ",
 "Upcoming Apr 9 Arkansas State at James Madison | ",
 "Upcoming Apr 16 Arkansas State at Butler | ",
 "Upcoming Apr 29 Arkansas State at Sun Belt Conference Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Arkansas State at 8 Texas A&M | L, 0-3",
 "Final Aug 29 Arkansas State vs Grand Canyon | L, 0-3",
 "Final Aug 30 Arkansas State vs Cal Poly | L, 0-3",
 "Final Sep 4 Arkansas State at Bowling Green | W, 3-2",
 "Final Sep 4 Arkansas State vs Northern Kentucky | W, 3-1",
 "Final Sep 5 Arkansas State vs American | W, 3-1",
 "Final Sep 11 Arkansas State at Missouri | L, 1-3",
 "Final Sep 12 Arkansas State vs Wichita State | W, 3-1",
 "Final Sep 12 Arkansas State vs FGCU | L, 0-3",
 "Final Sep 18 Arkansas State vs Arkansas | L, 0-3",
 "Final Sep 20 Arkansas State vs Illinois | L, 0-3",
 "Final Sep 24 Arkansas State vs ULM | W, 3-0",
 "Final Sep 25 Arkansas State vs ULM | W, 3-0",
 "Final Oct 1 Arkansas State at Louisiana | W, 3-1",
 "Final Oct 2 Arkansas State at Louisiana | L, 2-3",
 "Final Oct 9 Arkansas State vs South Alabama | W, 3-0",
 "Final Oct 10 Arkansas State vs South Alabama | W, 3-1",
 "Final Oct 16 Arkansas State at Georgia Southern | W, 3-2",
 "Final Oct 17 Arkansas State at Georgia Southern | W, 3-0",
 "Today Oct 22, 6:00 PM Arkansas State at Southern Miss | ",
 "Upcoming Oct 23, 6:00 PM Arkansas State at Southern Miss | ",
 "Upcoming Oct 30, 6:00 PM Arkansas State vs Troy | ",
 "Upcoming Oct 31, 1:00 PM Arkansas State vs Troy | ",
 "Upcoming Nov 6, 6:00 PM Arkansas State at Louisiana Tech | ",
 "Upcoming Nov 7, 1:00 PM Arkansas State at Louisiana Tech | ",
 "Upcoming Nov 13, 6:00 PM Arkansas State vs James Madison | ",
 "Upcoming Nov 14, 12:00 PM Arkansas State vs James Madison | ",
 "Upcoming Nov 18 Arkansas State at Sun Belt Volleyball Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
// One story, one tennis tournament: the Memphis Invite story (Sep 20) is
// not also the ITA All-Americans' (which, storyless, is not listed).
{
  const tennis=parse('Tennis','womens-tennis');
  assert.ok(tennis.find(e=>/Memphis Invite/.test(e.title)).recap_url.includes('memphis-invite'));
  assert.ok(!tennis.some(e=>/ITA All-Americans/.test(e.title)&&e.recap_url));
}
console.log("Arkansas State module checks passed");
