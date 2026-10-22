import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {memphisSchool} from '../src/schools/memphis.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='memphis');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,memphisHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/memphis-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gotigersgo.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['memphis'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',memphisSchool.scheduleUrls],['roster',memphisSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('memphis|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gotigersgo.com',`${key} must stay on gotigersgo.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gotigersgo.com/sports/baseball/schedule"],"roster":["https://gotigersgo.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gotigersgo.com/sports/mens-basketball/schedule","https://gotigersgo.com/sports/womens-basketball/schedule"],"roster":["https://gotigersgo.com/sports/mens-basketball/roster","https://gotigersgo.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gotigersgo.com/sports/womens-cross-country/schedule","https://gotigersgo.com/sports/mens-cross-country/schedule"],"roster":["https://gotigersgo.com/sports/womens-cross-country/roster","https://gotigersgo.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gotigersgo.com/sports/football/schedule"],"roster":["https://gotigersgo.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gotigersgo.com/sports/womens-golf/schedule","https://gotigersgo.com/sports/mens-golf/schedule"],"roster":["https://gotigersgo.com/sports/womens-golf/roster","https://gotigersgo.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://gotigersgo.com/sports/rifle/schedule"],"roster":["https://gotigersgo.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://gotigersgo.com/sports/womens-soccer/schedule","https://gotigersgo.com/sports/mens-soccer/schedule"],"roster":["https://gotigersgo.com/sports/womens-soccer/roster","https://gotigersgo.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gotigersgo.com/sports/softball/schedule"],"roster":["https://gotigersgo.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gotigersgo.com/sports/womens-tennis/schedule","https://gotigersgo.com/sports/mens-tennis/schedule"],"roster":["https://gotigersgo.com/sports/womens-tennis/roster","https://gotigersgo.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gotigersgo.com/sports/womens-track-and-field/schedule","https://gotigersgo.com/sports/mens-track-and-field/schedule"],"roster":["https://gotigersgo.com/sports/womens-track-and-field/roster","https://gotigersgo.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gotigersgo.com/sports/womens-volleyball/schedule"],"roster":["https://gotigersgo.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'memphis|"+sport+"':"),`${sport} routes must live in the Memphis module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gotigersgo.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.memphisHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=memphis)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 7:00 PM Men's · Memphis at Mississippi State (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · Memphis at Arkansas (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Memphis vs Iowa State | ",
 "Upcoming Nov 7, 2:00 PM Men's · Memphis vs VCU | ",
 "Upcoming Nov 10, 6:00 PM Men's · Memphis at Vanderbilt | ",
 "Upcoming Nov 15, 12:00 PM Men's · Memphis vs Louisville | ",
 "Upcoming Nov 22, 1:00 PM Men's · Memphis vs Evansville | ",
 "Upcoming Nov 25, 4:00 PM Men's · Memphis vs Penn State | ",
 "Upcoming Nov 29, 12:00 PM Men's · Memphis vs Dayton | ",
 "Upcoming Dec 2, 11:00 AM Men's · Memphis vs Jackson State | ",
 "Upcoming Dec 5, 11:00 AM Men's · Memphis at Baylor | ",
 "Upcoming Dec 11, 7:00 PM Men's · Memphis vs Grand Canyon | ",
 "Upcoming Dec 16, 8:00 PM Men's · Memphis at Texas | ",
 "Upcoming Dec 22, 7:00 PM Men's · Memphis vs Little Rock | ",
 "Upcoming Dec 30, 7:00 PM Men's · Memphis vs East Carolina | ",
 "Upcoming Jan 3 Men's · Memphis at South Florida | ",
 "Upcoming Jan 6, 7:00 PM Men's · Memphis vs Rice | ",
 "Upcoming Jan 10 Men's · Memphis at Florida Atlantic | ",
 "Upcoming Jan 14 Men's · Memphis vs Wichita State | ",
 "Upcoming Jan 17 Men's · Memphis at UAB | ",
 "Upcoming Jan 20 Men's · Memphis at Charlotte | ",
 "Upcoming Jan 23, 2:00 PM Men's · Memphis vs North Texas | ",
 "Upcoming Jan 28 Men's · Memphis at Wichita State | ",
 "Upcoming Feb 2 Men's · Memphis at Tulane | ",
 "Upcoming Feb 7, 2:00 PM Men's · Memphis vs UAB | ",
 "Upcoming Feb 11, 7:00 PM Men's · Memphis vs Charlotte | ",
 "Upcoming Feb 14 Men's · Memphis at UTSA | ",
 "Upcoming Feb 17 Men's · Memphis at North Texas | ",
 "Upcoming Feb 20 Men's · Memphis vs Utah State | ",
 "Upcoming Feb 25 Men's · Memphis vs Tulsa | ",
 "Upcoming Feb 28 Men's · Memphis vs South Florida | ",
 "Upcoming Mar 4 Men's · Memphis at Temple | ",
 "Upcoming Mar 7, 2:00 PM Men's · Memphis vs Tulane | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Memphis vs LeMoyne-Owen | ",
 "Upcoming Nov 6, 6:00 PM Women's · Memphis vs Middle Tennessee | ",
 "Upcoming Nov 9, 6:00 PM Women's · Memphis vs Little Rock | ",
 "Upcoming Nov 12, 6:00 PM Women's · Memphis vs Alabama | ",
 "Upcoming Nov 19, 11:00 AM Women's · Memphis vs South Alabama | ",
 "Upcoming Nov 23, 3:00 PM Women's · Memphis vs Old Dominion | ",
 "Upcoming Nov 25, 3:00 PM Women's · Memphis vs SMU | ",
 "Upcoming Nov 29, 2:00 PM Women's · Memphis at Ole Miss | ",
 "Upcoming Dec 3, 6:00 PM Women's · Memphis vs TCU | ",
 "Upcoming Dec 7, 6:30 PM Women's · Memphis at Louisiana Tech | ",
 "Upcoming Dec 13, 2:00 PM Women's · Memphis at Bradley | ",
 "Upcoming Dec 16, 6:00 PM Women's · Memphis vs Mississippi Valley State | ",
 "Upcoming Dec 20, 2:00 PM Women's · Memphis vs Fisk | ",
 "Upcoming Dec 31 Women's · Memphis at Tulsa | ",
 "Upcoming Jan 7, 6:00 PM Women's · Memphis vs Temple | ",
 "Upcoming Jan 10, 2:00 PM Women's · Memphis vs Charlotte | ",
 "Upcoming Jan 13, 6:00 PM Women's · Memphis vs Florida Atlantic | ",
 "Upcoming Jan 16 Women's · Memphis at UAB | ",
 "Upcoming Jan 20, 6:00 PM Women's · Memphis vs Tulane | ",
 "Upcoming Jan 23 Women's · Memphis at Charlotte | ",
 "Upcoming Jan 27 Women's · Memphis at East Carolina | ",
 "Upcoming Jan 30, 2:00 PM Women's · Memphis vs North Texas | ",
 "Upcoming Feb 3, 6:00 PM Women's · Memphis at Wichita State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Memphis at Rice | ",
 "Upcoming Feb 10, 6:00 PM Women's · Memphis vs UTSA | ",
 "Upcoming Feb 13 Women's · Memphis at Tulane | ",
 "Upcoming Feb 20, 2:00 PM Women's · Memphis vs Tulsa | ",
 "Upcoming Feb 24, 6:00 PM Women's · Memphis vs Wichita State | ",
 "Upcoming Feb 27 Women's · Memphis at Florida Atlantic | ",
 "Upcoming Mar 2 Women's · Memphis at South Florida | ",
 "Upcoming Mar 6, 2:00 PM Women's · Memphis vs UAB | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Memphis at City Auto Memphis Twilight Classic | 12th of 18",
 "Final Sep 19 Women's · Memphis at Rhodes Invitational | 1st of 10",
 "Final Oct 3 Women's · Memphis at Chile Pepper Invitational | 21st of 28",
 "Final Oct 16 Women's · Memphis at Crimson Classic | 19th of 19",
 "Upcoming Oct 31 Women's · Memphis at American Conference Championships | ",
 "Upcoming Nov 13 Women's · Memphis at NCAA South Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Memphis at City Auto Memphis Twilight Classic | 9th of 20",
 "Final Sep 19 Men's · Memphis at Rhodes Invitational | 1th of 10",
 "Final Oct 3 Men's · Memphis at Chile Pepper Invitational | 21st of 26",
 "Final Oct 16 Men's · Memphis at Crimson Classic | 12th of 14",
 "Upcoming Oct 31 Men's · Memphis at American Conference Championships | ",
 "Upcoming Nov 13 Men's · Memphis at NCAA South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Memphis at UNLV | W, 27-21",
 "Final Sep 5 Memphis vs Arkansas State | W, 42-24",
 "Final Sep 12 Memphis at Boise State | L, 20-38",
 "Final Sep 19 Memphis vs UT Martin | W, 45-21",
 "Final Oct 3 Memphis at Charlotte | W, 59-8",
 "Final Oct 10 Memphis vs UAB | W, 38-13",
 "Final Oct 16 Memphis at Tulane | L, 17-31",
 "Today Oct 22, 6:30 PM Memphis vs East Carolina | ",
 "Upcoming Oct 31, 7:00 PM Memphis vs Army | ",
 "Upcoming Nov 12, 7:00 PM Memphis at South Florida | ",
 "Upcoming Nov 21, 11:00 AM Memphis at Navy | ",
 "Upcoming Nov 27, 11:00 AM Memphis vs Temple | ",
 "Upcoming Dec 5, 7:00 PM Memphis at American Conference Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Memphis at Golfweek Challenge at Caledonia | 5th of 23",
 "Final Oct 3 Women's · Memphis at Yale Invitational | 5th of 8",
 "Final Oct 12 Women's · Memphis at Lady Red Wolves Classic | 12th of 13",
 "Final Oct 18 Women's · Memphis at Diamante Intercollegiate | 13th of 20",
 "Upcoming Feb 1 Women's · Memphis at UCF Challenge | ",
 "Upcoming Mar 7 Women's · Memphis at Chris Banister Golf Classic | ",
 "Upcoming Mar 15 Women's · Memphis at Magnolia Collegiate | ",
 "Upcoming Mar 22 Women's · Memphis at Nashville Invitational | ",
 "Upcoming Apr 4 Women's · Memphis at ECU Ironwood Invitational | ",
 "Upcoming Apr 12 Women's · Memphis at Vanderbilt One Day | ",
 "Upcoming Apr 19 Women's · Memphis at American Conference Championship | ",
 "Upcoming May 10 Women's · Memphis at NCAA Regionals | ",
 "Upcoming May 21 Women's · Memphis at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Memphis at Visit Knoxville Collegiate | 2nd of 17",
 "Final Sep 14 Men's · Memphis at Bearcat Invitational | 4th of 17",
 "Final Oct 5 Men's · Memphis at Cullan Brown Collegiate | T6th of 15",
 "Final Oct 18 Men's · Memphis at Quail Valley Collegiate Invitational | T3rd of 15",
 "Upcoming Oct 31 Men's · Memphis at Steelwood Collegiate Invitational | ",
 "Upcoming Feb 1 Men's · Memphis at N.I.T. | ",
 "Upcoming Feb 15 Men's · Memphis at Hal Williams Collegiate | ",
 "Upcoming Mar 7 Men's · Memphis at Colleton River Collegiate | ",
 "Upcoming Mar 15 Men's · Memphis at The Jonnie-O @ Sea Island | ",
 "Upcoming Apr 5 Men's · Memphis at Memphis Intercollegiate: Spirited by Old Dominick | ",
 "Upcoming Apr 12 Men's · Memphis at Mossy Oak Collegiate | ",
 "Upcoming Apr 25 Men's · Memphis at American Conference Championship | ",
 "Upcoming May 17 Men's · Memphis at NCAA Regionals | ",
 "Upcoming May 28 Men's · Memphis at NCAA Championships | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 10 Memphis at Ole Miss | L, 4709-4724",
 "Final Oct 10 Memphis vs Nebraska | W, 4709-4696",
 "Final Oct 11 Memphis vs Nebraska | W, 4710-4697",
 "Upcoming Oct 24, 8:00 AM Memphis at West Virginia | ",
 "Upcoming Oct 25, 8:00 AM Memphis at Navy | ",
 "Upcoming Oct 25, 8:00 AM Memphis at Mount Aloysius | ",
 "Upcoming Nov 7 Memphis at Morehead State | ",
 "Upcoming Nov 14 Memphis at Akron | ",
 "Upcoming Nov 15 Memphis at UT Martin | ",
 "Upcoming Jan 16 Memphis at Kentucky | ",
 "Upcoming Jan 24 Memphis at Withrow Open (Hosted by Murray State) | ",
 "Upcoming Jan 30 Memphis at Murray State | ",
 "Upcoming Feb 13 Memphis at Army | ",
 "Upcoming Feb 14 Memphis at Norwich | ",
 "Upcoming Feb 20 Memphis at Ole Miss | ",
 "Upcoming Feb 27 Memphis at GARC Championships | ",
 "Upcoming Feb 28 Memphis at GARC Championships | ",
 "Upcoming Mar 12 Memphis at NCAA | ",
 "Upcoming Mar 13 Memphis at NCAA | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Memphis vs Kennesaw State | W, 2-0",
 "Final Aug 15 Women's · Memphis vs Alabama | L, 1-2",
 "Final Aug 21 Women's · Memphis at Vanderbilt | L, 1-4",
 "Final Aug 27 Women's · Memphis at Ole Miss | W, 3-1",
 "Final Sep 3 Women's · Memphis vs Houston | T, 1-1",
 "Final Sep 6 Women's · Memphis at Ohio State | L, 1-3",
 "Final Sep 13 Women's · Memphis vs Kansas City | W, 1-0",
 "Final Sep 17 Women's · Memphis vs Rice | W, 2-0",
 "Final Sep 24 Women's · Memphis at South Florida | T, 1-1",
 "Final Sep 27 Women's · Memphis at Florida Atlantic | W, 5-0",
 "Final Oct 8 Women's · Memphis vs Tulsa | W, 4-0",
 "Final Oct 11 Women's · Memphis vs Charlotte | W, 2-1",
 "Final Oct 15 Women's · Memphis at Temple | W, 2-0",
 "Today Oct 22, 7:00 PM Women's · Memphis vs UTSA | ",
 "Upcoming Oct 25, 1:00 PM Women's · Memphis at North Texas | ",
 "Upcoming Oct 30, 7:00 PM Women's · Memphis vs East Carolina | ",
 "Upcoming Nov 3, 7:00 PM Women's · Memphis at UAB | ",
 "Upcoming Nov 8 Women's · Memphis at American Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Memphis at Belmont | W, 2-0",
 "Final Aug 24 Men's · Memphis vs North Carolina | W, 3-2",
 "Final Aug 28 Men's · Memphis at Ohio State | L, 0-2",
 "Final Aug 31 Men's · Memphis at Butler | W, 5-1",
 "Final Sep 4 Men's · Memphis vs UNC Asheville | W, 3-1",
 "Final Sep 12 Men's · Memphis at Furman | T, 2-2",
 "Final Sep 20 Men's · Memphis vs Florida Atlantic | T, 2-2",
 "Final Sep 25 Men's · Memphis at FIU | T, 2-2",
 "Final Sep 29 Men's · Memphis vs Jacksonville | L, 0-1",
 "Final Oct 3 Men's · Memphis vs Missouri State | T, 1-1",
 "Final Oct 6 Men's · Memphis vs Lipscomb | W, 4-3",
 "Final Oct 11 Men's · Memphis at Temple | W, 3-0",
 "Final Oct 17 Men's · Memphis vs UAB | T, 1-1",
 "Upcoming Oct 23, 6:00 PM Men's · Memphis at South Florida | ",
 "Upcoming Oct 28, 7:00 PM Men's · Memphis vs Charlotte | ",
 "Upcoming Nov 1, 6:00 PM Men's · Memphis at Tulsa | ",
 "Upcoming Nov 6 Men's · Memphis at American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 6:00 PM Memphis vs Northeast Mississippi | ",
 "Upcoming Oct 23, 3:30 PM Memphis vs Dyersburg State | ",
 "Upcoming Oct 27, 5:00 PM Memphis vs Freed-Hardeman | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Memphis at Memphis Invitational | Completed",
 "Final Sep 19 Women's · Memphis at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Memphis at Blue Gray National Tennis Classic | Completed",
 "Final Oct 2 Women's · Memphis at Hurricane Invite | Completed",
 "Final Oct 15 Women's · Memphis at ITA Central Region Championships | Completed",
 "Today Oct 22 Women's · Memphis at American Conference Championships | ",
 "Upcoming Nov 5 Women's · Memphis at ITA Sectionals OR Conference Masters | ",
 "Upcoming Nov 5 Women's · Memphis at Bonita Bay Collegiate Classic | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Memphis at UT Invite | Completed",
 "Final Oct 1 Men's · Memphis at Little Rock Classic | Completed",
 "Final Oct 7 Men's · Memphis at ITA Division I Central Regional Championship | Completed",
 "Today Oct 22 Men's · Memphis at American Conference | ",
 "Upcoming Oct 29 Men's · Memphis at MTSU Invite | ",
 "Upcoming Nov 5 Men's · Memphis at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · Memphis at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Memphis at Bonita Bay Invite | ",
 "Upcoming Nov 9 Men's · Memphis at UTR Tennis Tour Tournament | ",
 "Upcoming Nov 16 Men's · Memphis at UTR Tennis Tour Tournament | ",
 "Upcoming Nov 17 Men's · Memphis at NCAA Singles and Doubles | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Memphis vs Harding (Exhibition) | W, 3-2",
 "Final Aug 22 Memphis vs Tennessee State (Exhibition) | W, 3-0",
 "Final Aug 28 Memphis at Lipscomb | L, 1-3",
 "Final Aug 29 Memphis at Vanderbilt | L, 0-3",
 "Final Aug 30 Memphis vs College of Charleston | L, 2-3",
 "Final Sep 4 Memphis vs Southeastern Louisiana | L, 1-3",
 "Final Sep 5 Memphis at Louisiana | W, 3-2",
 "Final Sep 10 Memphis vs Alcorn State | W, 3-0",
 "Final Sep 11 Memphis vs Boston College | L, 1-3",
 "Final Sep 12 Memphis vs Mississippi State | L, 0-3",
 "Final Sep 15 Memphis vs Ole Miss | W, 3-1",
 "Final Sep 17 Memphis vs Southern Miss | W, 3-0",
 "Final Sep 19 Memphis vs Little Rock | W, 3-0",
 "Final Sep 25 Memphis at Wichita State | L, 1-3",
 "Final Sep 27 Memphis at Tulsa | L, 1-3",
 "Final Sep 30 Memphis vs UAB | W, 3-1",
 "Final Oct 2 Memphis vs Tulane | L, 2-3",
 "Final Oct 9 Memphis at UAB | L, 1-3",
 "Final Oct 11 Memphis at Rice | L, 1-3",
 "Final Oct 16 Memphis vs Temple | W, 3-2",
 "Final Oct 18 Memphis vs East Carolina | L, 1-3",
 "Upcoming Oct 23, 5:00 PM Memphis at Florida Atlantic | ",
 "Upcoming Oct 25, 12:00 PM Memphis at South Florida | ",
 "Upcoming Oct 30, 6:30 PM Memphis vs UTSA | ",
 "Upcoming Nov 1, 1:00 PM Memphis vs Charlotte | ",
 "Upcoming Nov 6, 6:00 PM Memphis at Tulane | ",
 "Upcoming Nov 8, 1:00 PM Memphis vs North Texas | ",
 "Upcoming Nov 13, 5:00 PM Memphis vs Tulsa | ",
 "Upcoming Nov 15, 1:00 PM Memphis at UTSA | ",
 "Upcoming Nov 20 Memphis at American Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Memphis module checks passed");
