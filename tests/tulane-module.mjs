import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tulaneSchool} from '../src/schools/tulane.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tulane');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tulaneHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tulane-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tulanegreenwave.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tulane'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',tulaneSchool.scheduleUrls],['roster',tulaneSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tulane|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tulanegreenwave.com',`${key} must stay on tulanegreenwave.com`);
  }
}
const parity={"Baseball":{"schedule":["https://tulanegreenwave.com/sports/baseball/schedule"],"roster":["https://tulanegreenwave.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://tulanegreenwave.com/sports/mens-basketball/schedule","https://tulanegreenwave.com/sports/womens-basketball/schedule"],"roster":["https://tulanegreenwave.com/sports/mens-basketball/roster","https://tulanegreenwave.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://tulanegreenwave.com/sports/womens-beach-volleyball/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-beach-volleyball/roster"],"combined":false},"Bowling":{"schedule":["https://tulanegreenwave.com/sports/womens-bowling/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://tulanegreenwave.com/sports/cross-country/schedule"],"roster":["https://tulanegreenwave.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://tulanegreenwave.com/sports/football/schedule"],"roster":["https://tulanegreenwave.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tulanegreenwave.com/sports/womens-golf/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-golf/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://tulanegreenwave.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://tulanegreenwave.com/sports/womens-tennis/schedule","https://tulanegreenwave.com/sports/mens-tennis/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-tennis/roster","https://tulanegreenwave.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://tulanegreenwave.com/sports/track-and-field/schedule"],"roster":["https://tulanegreenwave.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://tulanegreenwave.com/sports/womens-volleyball/schedule"],"roster":["https://tulanegreenwave.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tulane|"+sport+"':"),`${sport} routes must live in the Tulane module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://tulanegreenwave.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tulaneHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=tulane)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Men's · Tulane vs Spring Hill College (Ala.) (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Tulane vs UT Martin | ",
 "Upcoming Nov 5, 6:30 PM Men's · Tulane vs Jackson State | ",
 "Upcoming Nov 10, 6:30 PM Men's · Tulane vs Nicholls | ",
 "Upcoming Nov 14, 11:00 AM Men's · Tulane at Akron | ",
 "Upcoming Nov 19, 6:30 PM Men's · Tulane at Louisiana Tech | ",
 "Upcoming Nov 23, 3:00 PM Men's · Tulane vs Georgia State | ",
 "Upcoming Nov 25, 12:30 PM Men's · Tulane vs Davidson | ",
 "Upcoming Nov 29, 1:00 PM Men's · Tulane vs Louisiana-Monroe | ",
 "Upcoming Dec 2, 7:30 PM Men's · Tulane at Southern Miss | ",
 "Upcoming Dec 6, 1:00 PM Men's · Tulane vs Louisiana-Lafayette | ",
 "Upcoming Dec 9, 4:00 PM Men's · Tulane vs Dillard | ",
 "Upcoming Dec 12, 1:00 PM Men's · Tulane vs Rhode Island | ",
 "Upcoming Dec 18, 6:30 PM Men's · Tulane vs Mississippi Valley State | ",
 "Upcoming Dec 22, 11:00 AM Men's · Tulane vs Western Kentucky | ",
 "Upcoming Dec 30 Men's · Tulane at UAB | ",
 "Upcoming Jan 3 Men's · Tulane vs Rice | ",
 "Upcoming Jan 7 Men's · Tulane at East Carolina | ",
 "Upcoming Jan 10 Men's · Tulane vs South Florida | ",
 "Upcoming Jan 14 Men's · Tulane at North Texas | ",
 "Upcoming Jan 17 Men's · Tulane at UTSA | ",
 "Upcoming Jan 20 Men's · Tulane vs Temple | ",
 "Upcoming Jan 23 Men's · Tulane vs Charlotte | ",
 "Upcoming Jan 30 Men's · Tulane at Rice | ",
 "Upcoming Feb 2 Men's · Tulane vs Memphis | ",
 "Upcoming Feb 7 Men's · Tulane at Tulsa | ",
 "Upcoming Feb 10 Men's · Tulane at Wichita State | ",
 "Upcoming Feb 14 Men's · Tulane vs Florida Atlantic | ",
 "Upcoming Feb 18 Men's · Tulane vs UTSA | ",
 "Upcoming Feb 21 Men's · Tulane vs East Carolina | ",
 "Upcoming Feb 24 Men's · Tulane at Temple | ",
 "Upcoming Mar 3 Men's · Tulane vs Wichita State | ",
 "Upcoming Mar 7 Men's · Tulane at Memphis | ",
 "Upcoming Mar 10 Men's · Tulane at American Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · Tulane vs Loyola (Exhibition) | ",
 "Upcoming Nov 2, 4:00 PM Women's · Tulane vs Texas Southern | ",
 "Upcoming Nov 8, 12:00 PM Women's · Tulane vs Alabama | ",
 "Upcoming Nov 12, 6:30 PM Women's · Tulane vs LSU New Orleans | ",
 "Upcoming Nov 16, 6:30 PM Women's · Tulane vs McNeese State | ",
 "Upcoming Nov 20, 11:00 AM Women's · Tulane vs Alcorn State | ",
 "Upcoming Nov 27, 11:15 AM Women's · Tulane vs Missouri | ",
 "Upcoming Nov 28, 10:00 AM Women's · Tulane vs Maine | ",
 "Upcoming Dec 2, 5:30 PM Women's · Tulane at Central Florida | ",
 "Upcoming Dec 9, 7:00 PM Women's · Tulane vs Southeastern Louisiana | ",
 "Upcoming Dec 13, 2:00 PM Women's · Tulane vs Louisiana | ",
 "Upcoming Dec 19, 12:00 PM Women's · Tulane vs Stonehill College | ",
 "Upcoming Dec 20 Women's · Tulane vs UAPB / Texas State | ",
 "Upcoming Dec 30 Women's · Tulane vs Wichita State | ",
 "Upcoming Jan 2 Women's · Tulane at Charlotte | ",
 "Upcoming Jan 9 Women's · Tulane at East Carolina | ",
 "Upcoming Jan 13 Women's · Tulane vs UAB | ",
 "Upcoming Jan 16 Women's · Tulane vs Florida Atlantic | ",
 "Upcoming Jan 20 Women's · Tulane at Memphis | ",
 "Upcoming Jan 23 Women's · Tulane at North Texas | ",
 "Upcoming Jan 27 Women's · Tulane vs Rice | ",
 "Upcoming Jan 30 Women's · Tulane vs Temple | ",
 "Upcoming Feb 3 Women's · Tulane at Florida Atlantic | ",
 "Upcoming Feb 6 Women's · Tulane at South Florida | ",
 "Upcoming Feb 13 Women's · Tulane vs Memphis | ",
 "Upcoming Feb 17 Women's · Tulane vs North Texas | ",
 "Upcoming Feb 21 Women's · Tulane at Wichita State | ",
 "Upcoming Feb 24 Women's · Tulane at Tulsa | ",
 "Upcoming Feb 27 Women's · Tulane vs Charlotte | ",
 "Upcoming Mar 3 Women's · Tulane at UAB | ",
 "Upcoming Mar 6 Women's · Tulane vs UTSA | ",
 "Upcoming Mar 9 Women's · Tulane at American Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24 Tulane at AVCA Team Event | ",
 "Upcoming Nov 6 Tulane at AVCA Pairs National Championship | ",
 "Upcoming Nov 20 Tulane at Tulane Pairs Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 3 Tulane at SWIBC I | 1st of 12",
 "Final Oct 4 Tulane at SWIBC II | 2nd of 11",
 "Final Oct 9 Tulane at Colonial Lanes Classic | 4th of 14",
 "Upcoming Oct 30 Tulane at Destination Florida | ",
 "Upcoming Nov 6 Tulane at Bulldog Classic | ",
 "Upcoming Nov 13 Tulane at Track Kat Klash | ",
 "Upcoming Jan 15 Tulane at Northeast Classic | ",
 "Upcoming Jan 29 Tulane at Hammer Saints Invite | ",
 "Upcoming Feb 5 Tulane at Flyer Classic | ",
 "Upcoming Feb 19 Tulane at Big Red Invite | ",
 "Upcoming Feb 26 Tulane at TNBA Open | ",
 "Upcoming Mar 5 Tulane at Music City Classic | ",
 "Upcoming Mar 12 Tulane at USBC Intercollegiate Sectionals | ",
 "Upcoming Mar 17 Tulane at Conference USA Championships | ",
 "Upcoming Apr 6 Tulane at NCAA Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Tulane at Battle for New Orleans | Women's team: 1st / Men's team: 1st",
 "Final Sep 25 Tulane at 47th Sean Earl Lakefront Invitational | Women's team: 8th / Men's team: 5th",
 "Final Oct 3 Tulane at Nicholls XC Invitational | Completed",
 "Final Oct 16 Tulane at Arturo Barrios Invitational | 3rd of 48",
 "Final Oct 16 Tulane at Pre-Nationals | 11th of 44",
 "Upcoming Oct 31, 9:15 AM Tulane at American Conference Cross Country Championships | ",
 "Upcoming Nov 13 Tulane at NCAA South Central Regional | ",
 "Upcoming Nov 21 Tulane at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Tulane at Duke | L, 3-17",
 "Final Sep 12 Tulane vs South Alabama | W, 28-24",
 "Final Sep 19 Tulane at Kansas State | L, 20-31",
 "Final Sep 26 Tulane vs Southern Miss (Hall of Fame) | W, 24-21",
 "Final Oct 10 Tulane at Army | L, 17-20",
 "Final Oct 16 Tulane vs Memphis | W, 31-17",
 "Upcoming Oct 24, 7:00 PM Tulane vs UTSA | ",
 "Upcoming Oct 30, 6:00 PM Tulane at Charlotte | ",
 "Upcoming Nov 7 Tulane vs Tulsa (Homecoming) | ",
 "Upcoming Nov 14 Tulane at Rice | ",
 "Upcoming Nov 21 Tulane vs North Texas | ",
 "Upcoming Nov 28 Tulane at South Florida | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Tulane at Tulane Classic Presented by Chad Brownstein | 1st of 12",
 "Final Sep 19 Tulane at Schooner Fall Classic | 11th of 16",
 "Final Oct 2 Tulane at Ron Moore Intercollegiate | 3rd of 15",
 "Final Oct 19 Tulane at Rainbow Wahine Invitational | Completed",
 "Upcoming Oct 26 Tulane at The Judson | ",
 "Upcoming Feb 1 Tulane at Paradise Invitational | ",
 "Upcoming Feb 22 Tulane at Momentum Transportation UNF Collegiate | ",
 "Upcoming Mar 14 Tulane at Mountain View Collegiate | ",
 "Upcoming Mar 29 Tulane at ULM Invitational | ",
 "Upcoming Apr 5 Tulane at Huntington Bank Collegiate | ",
 "Upcoming Apr 19 Tulane at American Conference Championship | ",
 "Upcoming May 10 Tulane at NCAA Regional | ",
 "Upcoming May 21 Tulane at NCAA Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Tulane at FIU TYR Fall Classic | Completed",
 "Upcoming Oct 23, 2:00 PM Tulane at North Carolina | ",
 "Upcoming Oct 23, 4:00 PM Tulane at North Carolina Wilmington | ",
 "Upcoming Nov 6 Tulane at Houston | ",
 "Upcoming Nov 6 Tulane at Rice | ",
 "Upcoming Nov 17 Tulane at Phil Hansel Invitational | ",
 "Upcoming Dec 3 Tulane at US Open (Qualifiers Only) | ",
 "Upcoming Dec 12 Tulane at CSCAA | ",
 "Upcoming Jan 3 Tulane at Hawaii | ",
 "Upcoming Jan 8 Tulane at Bruin Diving Invite | ",
 "Upcoming Jan 15 Tulane at Mardi Gras Invite | ",
 "Upcoming Jan 30 Tulane vs West Florida | ",
 "Upcoming Feb 5 Tulane at UH First Chance Meet | ",
 "Upcoming Feb 17 Tulane at American Conference | ",
 "Upcoming Mar 7 Tulane at Zone D Diving (Qualifiers Only) | ",
 "Upcoming Mar 11 Tulane at National Invitational Championships | ",
 "Upcoming Mar 17 Tulane at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Tulane at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Tulane at Rice Invitational | Completed",
 "Final Oct 8 Women's · Tulane at ITA Southern Regional Championships | Completed",
 "Today Oct 22 Women's · Tulane at American Conference Fall Championships | ",
 "Upcoming Oct 30 Women's · Tulane at Roberta Alison Invitational | ",
 "Upcoming Nov 5 Women's · Tulane at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Tulane at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Tulane at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Tulane at Sugarcane Classic | Completed",
 "Final Sep 19 Men's · Tulane at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Tulane at Blue Gray National Tennis Classic | Completed",
 "Final Oct 8 Men's · Tulane at ITA Southern Regional Championships | Completed",
 "Final Oct 16 Men's · Tulane at Rice Invitational | Completed",
 "Today Oct 22 Men's · Tulane at American Conference Fall Championships | ",
 "Upcoming Oct 23 Men's · Tulane at CCB Invite | ",
 "Upcoming Nov 5 Men's · Tulane at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Tulane at ITA Sectional Championships | ",
 "Upcoming Nov 6 Men's · Tulane at Alabama Invitational | ",
 "Upcoming Nov 17 Men's · Tulane at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Tulane vs North Dakota State | L, 2-3",
 "Final Aug 30 Tulane vs Tennessee Tech | W, 3-0",
 "Final Sep 3 Tulane vs Duke | W, 3-0",
 "Final Sep 4 Tulane vs FIU | W, 3-2",
 "Final Sep 5 Tulane at North Florida | W, 3-0",
 "Final Sep 11 Tulane vs Georgia | L, 0-3",
 "Final Sep 12 Tulane vs Kennesaw State | W, 3-0",
 "Final Sep 13 Tulane at South Alabama | W, 3-1",
 "Final Sep 17 Tulane vs Cal State Fullerton | W, 3-0",
 "Final Sep 20 Tulane vs LSU New Orleans | W, 3-0",
 "Final Sep 25 Tulane at UTSA | W, 3-2",
 "Final Sep 27 Tulane at North Texas | W, 3-0",
 "Final Oct 2 Tulane at Memphis | W, 3-2",
 "Final Oct 4 Tulane vs Wichita State | W, 3-1",
 "Final Oct 9 Tulane vs Charlotte | W, 3-0",
 "Final Oct 11 Tulane vs UAB | W, 3-1",
 "Final Oct 16 Tulane at Florida Atlantic | L, 2-3",
 "Final Oct 18 Tulane at South Florida | W, 3-2",
 "Upcoming Oct 23, 6:30 PM Tulane vs Tulsa | ",
 "Upcoming Oct 25, 1:00 PM Tulane vs East Carolina | ",
 "Upcoming Oct 28, 6:00 PM Tulane at Rice | ",
 "Upcoming Nov 1, 11:00 AM Tulane at Temple | ",
 "Upcoming Nov 6, 6:30 PM Tulane vs Memphis | ",
 "Upcoming Nov 8, 12:00 PM Tulane at Charlotte | ",
 "Upcoming Nov 13, 6:30 PM Tulane vs South Florida | ",
 "Upcoming Nov 15, 1:00 PM Tulane vs Rice | ",
 "Upcoming Nov 20 Tulane at American Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Tulane module checks passed");
