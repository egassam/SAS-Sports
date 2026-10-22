import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {troySchool} from '../src/schools/troy.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='troy');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,troyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/troy-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit troytrojans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['troy'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',troySchool.scheduleUrls],['roster',troySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('troy|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'troytrojans.com',`${key} must stay on troytrojans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://troytrojans.com/sports/baseball/schedule"],"roster":["https://troytrojans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://troytrojans.com/sports/mens-basketball/schedule","https://troytrojans.com/sports/womens-basketball/schedule"],"roster":["https://troytrojans.com/sports/mens-basketball/roster","https://troytrojans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://troytrojans.com/sports/cross-country/schedule"],"roster":["https://troytrojans.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://troytrojans.com/sports/football/schedule"],"roster":["https://troytrojans.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://troytrojans.com/sports/womens-golf/schedule","https://troytrojans.com/sports/mens-golf/schedule"],"roster":["https://troytrojans.com/sports/womens-golf/roster","https://troytrojans.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://troytrojans.com/sports/womens-soccer/schedule"],"roster":["https://troytrojans.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://troytrojans.com/sports/softball/schedule"],"roster":["https://troytrojans.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://troytrojans.com/sports/womens-tennis/schedule","https://troytrojans.com/sports/mens-tennis/schedule"],"roster":["https://troytrojans.com/sports/womens-tennis/roster","https://troytrojans.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://troytrojans.com/sports/track-and-field/schedule"],"roster":["https://troytrojans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://troytrojans.com/sports/womens-volleyball/schedule"],"roster":["https://troytrojans.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'troy|"+sport+"':"),`${sport} routes must live in the Troy module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://troytrojans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.troyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=troy)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 1:00 PM Troy vs Florida (Exhibition) | ",
 "Upcoming Nov 8, 1:00 PM Troy at LSU (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Men's · Troy vs Stillman College (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Troy vs UMass | ",
 "Upcoming Nov 6, 6:00 PM Men's · Troy at Florida State | ",
 "Upcoming Nov 10, 6:00 PM Men's · Troy vs LMU | ",
 "Upcoming Nov 13, 6:00 PM Men's · Troy at NC State | ",
 "Upcoming Nov 17, 6:00 PM Men's · Troy vs CSUN | ",
 "Upcoming Nov 21, 7:00 PM Men's · Troy vs Valparaiso | ",
 "Upcoming Nov 22, 2:00 PM Men's · Troy vs Nicholls | ",
 "Upcoming Nov 28, 1:00 PM Men's · Troy at Chattanooga | ",
 "Upcoming Dec 1, 6:00 PM Men's · Troy vs Furman | ",
 "Upcoming Dec 5, 4:15 PM Men's · Troy vs UAB | ",
 "Upcoming Dec 12, 3:33 PM Men's · Troy vs MUW | ",
 "Upcoming Dec 16, 7:30 PM Men's · Troy vs Louisiana Tech | ",
 "Upcoming Dec 19, 3:33 PM Men's · Troy vs Coastal Carolina | ",
 "Upcoming Dec 21, 12:00 PM Men's · Troy vs William Carey | ",
 "Upcoming Dec 31, 12:00 PM Men's · Troy at App State | ",
 "Upcoming Jan 2, 1:00 PM Men's · Troy at James Madison | ",
 "Upcoming Jan 6, 6:00 PM Men's · Troy vs Georgia State | ",
 "Upcoming Jan 9, 3:33 PM Men's · Troy vs Georgia Southern | ",
 "Upcoming Jan 13, 7:30 PM Men's · Troy at Southern Miss | ",
 "Upcoming Jan 16, 3:33 PM Men's · Troy vs ULM | ",
 "Upcoming Jan 21, 6:30 PM Men's · Troy at Louisiana Tech | ",
 "Upcoming Jan 23, 4:00 PM Men's · Troy at Louisiana | ",
 "Upcoming Jan 27, 6:00 PM Men's · Troy vs South Alabama | ",
 "Upcoming Jan 30, 3:33 PM Men's · Troy vs Arkansas State | ",
 "Upcoming Feb 3, 6:30 PM Men's · Troy at ULM | ",
 "Upcoming Feb 6 Men's · Troy at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 6:00 PM Men's · Troy vs Louisiana | ",
 "Upcoming Feb 13 Men's · Troy at Arkansas State | ",
 "Upcoming Feb 18 Men's · Troy at South Alabama | ",
 "Upcoming Feb 20, 4:15 PM Men's · Troy vs Southern Miss | ",
 "Upcoming Feb 26, 8:00 PM Men's · Troy at Marshall | ",
 "Upcoming Mar 2 Men's · Troy at Sun Belt Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · Troy vs Tuskegee (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Troy at Kent State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Troy vs Thomas | ",
 "Upcoming Nov 11, 6:30 PM Women's · Troy at Mississippi State | ",
 "Upcoming Nov 13, 11:00 AM Women's · Troy at Belmont | ",
 "Upcoming Nov 16, 7:00 PM Women's · Troy at LSU | ",
 "Upcoming Nov 19, 6:00 PM Women's · Troy vs Longwood | ",
 "Upcoming Nov 27, 5:30 PM Women's · Troy vs UC Davis | ",
 "Upcoming Nov 29, 3:00 PM Women's · Troy at Nevada | ",
 "Upcoming Dec 5, 2:00 PM Women's · Troy vs Alabama State | ",
 "Upcoming Dec 12, 3:15 PM Women's · Troy vs Colorado State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Troy vs Oral Roberts | ",
 "Upcoming Dec 16, 5:15 PM Women's · Troy vs ULM | ",
 "Upcoming Dec 19 Women's · Troy at Georgia State | ",
 "Upcoming Dec 30, 6:00 PM Women's · Troy vs Marshall | ",
 "Upcoming Jan 2, 3:33 PM Women's · Troy vs James Madison | ",
 "Upcoming Jan 6, 5:00 PM Women's · Troy at Coastal Carolina | ",
 "Upcoming Jan 9, 1:00 PM Women's · Troy at Georgia Southern | ",
 "Upcoming Jan 13, 5:00 PM Women's · Troy at Southern Miss | ",
 "Upcoming Jan 16 Women's · Troy at Arkansas State | ",
 "Upcoming Jan 23, 3:33 PM Women's · Troy vs App State | ",
 "Upcoming Jan 28, 6:30 PM Women's · Troy at ULM | ",
 "Upcoming Jan 30, 5:30 PM Women's · Troy at Louisiana Tech | ",
 "Upcoming Feb 3, 6:00 PM Women's · Troy vs South Alabama | ",
 "Upcoming Feb 6, 3:33 PM Women's · Troy vs MAC-SBC Challenge | ",
 "Upcoming Feb 11, 6:00 PM Women's · Troy at Louisiana | ",
 "Upcoming Feb 13, 2:00 PM Women's · Troy at South Alabama | ",
 "Upcoming Feb 17, 6:00 PM Women's · Troy vs Southern Miss | ",
 "Upcoming Feb 20, 2:00 PM Women's · Troy vs Arkansas State | ",
 "Upcoming Feb 23, 6:00 PM Women's · Troy vs Louisiana Tech | ",
 "Upcoming Feb 26, 6:00 PM Women's · Troy vs Louisiana | ",
 "Upcoming Mar 2 Women's · Troy at Sun Belt Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Troy at JSU Foothills Invitational | Women's team: 7th / Men's team: 5th",
 "Final Sep 18 Troy at Falcon Classic | Women's team: 2nd / Men's team: 1st",
 "Final Sep 25 Troy at Azalea City Classic | Women's team: 2nd / Men's team: 1st",
 "Final Oct 9 Troy at FSU XC Invite | Women's team: 7th / Men's team: 5th",
 "Upcoming Oct 30 Troy at Sun Belt Championships | ",
 "Upcoming Nov 13 Troy at NCAA South Region Championship | ",
 "Upcoming Nov 21 Troy at NCAA Cross Country National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Troy vs Sam Houston | W, 24-21",
 "Final Sep 12 Troy vs Alabama State | W, 34-17",
 "Final Sep 19 Troy at Missouri | L, 17-27",
 "Final Sep 26 Troy at Utah State | L, 10-21",
 "Final Oct 6 Troy vs Southern Miss | W, 55-34",
 "Final Oct 17 Troy at Louisiana | L, 6-33",
 "Upcoming Oct 24, 3:00 PM Troy vs ULM | ",
 "Upcoming Oct 29, 6:30 PM Troy at James Madison | ",
 "Upcoming Nov 7, 3:00 PM Troy vs Louisiana Tech | ",
 "Upcoming Nov 14 Troy at South Alabama | ",
 "Upcoming Nov 21, 3:00 PM Troy vs Georgia Southern | ",
 "Upcoming Nov 28, 2:00 PM Troy at Arkansas State | ",
 "Upcoming Dec 4, 6:00 PM Troy at Sun Belt Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Troy at Golfweek Challenge | 8th of 23",
 "Final Sep 14 Women's · Troy at Pirate Collegiate Classic | 8th of 13",
 "Final Oct 12 Women's · Troy at Lady Red Wolves Classic | 7th of 13",
 "Upcoming Oct 26 Women's · Troy at Pat Bradley Invitational | ",
 "Upcoming Feb 7 Women's · Troy at Treasure Coast Invitational | ",
 "Upcoming Feb 22 Women's · Troy at Hatter Invitational | ",
 "Upcoming Mar 7 Women's · Troy at Chris Banister Golf Classic | ",
 "Upcoming Mar 15 Women's · Troy at Magnolia Collegiate | ",
 "Upcoming Mar 21 Women's · Troy at City of Oaks Collegiate | ",
 "Upcoming Apr 4 Women's · Troy at UNC Challenge Cup | ",
 "Upcoming Apr 19 Women's · Troy at Sun Belt Championship | ",
 "Upcoming May 10 Women's · Troy at NCAA Regional | ",
 "Upcoming May 21 Women's · Troy at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Troy at Golfweek Fall Challenge | 2nd of 16",
 "Final Sep 27 Men's · Troy at Argent Financial Classic | 1st of 13",
 "Final Oct 5 Men's · Troy at West Bay Collegiate | T3rd of 15",
 "Final Oct 12 Men's · Troy at Bryson Invitational | 7th of 12",
 "Final Oct 19 Men's · Troy at Qubein Cup | 5th of 11",
 "Upcoming Feb 7 Men's · Troy at The Compadres Collegiate | ",
 "Upcoming Mar 12 Men's · Troy at Seminole Intercollegiate | ",
 "Upcoming Mar 29 Men's · Troy at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 13 Men's · Troy at Mossy Oak Collegiate | ",
 "Upcoming Apr 27 Men's · Troy at Sun Belt Championship | ",
 "Upcoming May 17 Men's · Troy at NCAA Regionals | ",
 "Upcoming May 28 Men's · Troy at NCAA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Troy at Middle Tennessee | L, 0-2",
 "Final Aug 20 Troy at Southeastern Louisiana | L, 0-1",
 "Final Aug 23 Troy vs Stetson | W, 2-0",
 "Final Aug 27 Troy at Alabama | L, 0-3",
 "Final Aug 30 Troy at Jacksonville State | L, 3-4",
 "Final Sep 4 Troy vs Kennesaw State | T, 2-2",
 "Final Sep 7 Troy vs West Florida | L, 1-3",
 "Final Sep 13 Troy vs Alcorn State | T, 3-3",
 "Final Sep 17 Troy at South Alabama | L, 0-2",
 "Final Sep 24 Troy vs Marshall | L, 1-2",
 "Final Sep 27 Troy at Louisiana | L, 0-5",
 "Final Oct 3 Troy vs Coastal Carolina | W, 1-0",
 "Final Oct 8 Troy vs Louisiana Tech | W, 4-2",
 "Final Oct 11 Troy at Southern Miss | T, 2-2",
 "Final Oct 17 Troy vs ULM | T, 1-1",
 "Today Oct 22, 4:00 PM Troy at Georgia Southern | ",
 "Upcoming Oct 25, 12:30 PM Troy vs Arkansas State | ",
 "Upcoming Nov 1, 1:00 PM Troy at App State | ",
 "Upcoming Nov 9 Troy at Sun Belt Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 21, 5:00 PM Troy vs Central Alabama CC (Exhibition) | ",
 "Upcoming Oct 28, 5:00 PM Troy vs Gulf Coast (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Troy at River State Shoot-Out | Completed",
 "Final Oct 8 Women's · Troy at ITA Southern Regional | Completed",
 "Upcoming Oct 30 Women's · Troy at West Florida Fall Invitational | ",
 "Upcoming Nov 6 Women's · Troy at Samford Fall Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Troy at ITA All-American | Completed",
 "Final Oct 1 Men's · Troy at Mercer Tournament | Completed",
 "Final Oct 8 Men's · Troy at ITA Regionals | Completed",
 "Upcoming Oct 29 Men's · Troy at UTR College Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Troy vs Mercer | W, 3-0",
 "Final Aug 29 Troy vs North Alabama | L, 0-3",
 "Final Aug 30 Troy vs Alabama State | W, 3-0",
 "Final Sep 6 Troy at South Carolina | L, 1-3",
 "Final Sep 12 Troy vs Florida Atlantic | L, 1-3",
 "Final Sep 13 Troy at Florida | L, 0-3",
 "Final Sep 17 Troy vs Murray State | W, 3-0",
 "Final Sep 18 Troy vs The Citadel | W, 3-0",
 "Final Sep 19 Troy vs Northwestern State | W, 3-0",
 "Final Sep 25 Troy vs Louisiana | W, 3-1",
 "Final Sep 26 Troy vs Louisiana | L, 2-3",
 "Final Oct 2 Troy at Southern Miss | W, 3-1",
 "Final Oct 3 Troy at Southern Miss | W, 3-1",
 "Final Oct 9 Troy vs ULM | W, 3-1",
 "Final Oct 10 Troy vs ULM | W, 3-0",
 "Final Oct 16 Troy at Louisiana Tech | W, 3-1",
 "Final Oct 17 Troy at Louisiana Tech | W, 3-0",
 "Today Oct 22, 6:00 PM Troy vs South Alabama | ",
 "Upcoming Oct 23, 6:00 PM Troy vs South Alabama | ",
 "Upcoming Oct 30, 6:00 PM Troy at Arkansas State | ",
 "Upcoming Oct 31, 1:00 PM Troy at Arkansas State | ",
 "Upcoming Nov 5, 5:00 PM Troy at Coastal Carolina | ",
 "Upcoming Nov 6, 5:00 PM Troy at Coastal Carolina | ",
 "Upcoming Nov 13, 6:00 PM Troy vs App State | ",
 "Upcoming Nov 14, 2:00 PM Troy vs App State | ",
 "Upcoming Nov 19 Troy at Sun Belt Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Troy module checks passed");
