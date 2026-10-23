import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northAlabamaSchool} from '../src/schools/north-alabama.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='north-alabama');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northAlabamaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/north-alabama-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit roarlions.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['north-alabama'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',northAlabamaSchool.scheduleUrls],['roster',northAlabamaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('north-alabama|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'roarlions.com',`${key} must stay on roarlions.com`);
  }
}
const parity={"Baseball":{"schedule":["https://roarlions.com/sports/baseball/schedule"],"roster":["https://roarlions.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://roarlions.com/sports/mens-basketball/schedule","https://roarlions.com/sports/womens-basketball/schedule"],"roster":["https://roarlions.com/sports/mens-basketball/roster","https://roarlions.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://roarlions.com/sports/womens-beach-volleyball/schedule"],"roster":["https://roarlions.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://roarlions.com/sports/womens-cross-country/schedule","https://roarlions.com/sports/mens-cross-country/schedule"],"roster":["https://roarlions.com/sports/womens-cross-country/roster","https://roarlions.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://roarlions.com/sports/football/schedule"],"roster":["https://roarlions.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://roarlions.com/sports/womens-golf/schedule","https://roarlions.com/sports/mens-golf/schedule"],"roster":["https://roarlions.com/sports/womens-golf/roster","https://roarlions.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://roarlions.com/sports/womens-soccer/schedule"],"roster":["https://roarlions.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://roarlions.com/sports/softball/schedule"],"roster":["https://roarlions.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://roarlions.com/sports/womens-tennis/schedule","https://roarlions.com/sports/mens-tennis/schedule"],"roster":["https://roarlions.com/sports/womens-tennis/roster","https://roarlions.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://roarlions.com/sports/womens-track-and-field/schedule","https://roarlions.com/sports/mens-track/schedule"],"roster":["https://roarlions.com/sports/womens-track-and-field/roster","https://roarlions.com/sports/mens-track/roster"],"combined":true},"Volleyball":{"schedule":["https://roarlions.com/sports/wvball/schedule"],"roster":["https://roarlions.com/sports/wvball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'north-alabama|"+sport+"':"),`${sport} routes must live in the North Alabama module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://roarlions.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northAlabamaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=north-alabama)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2 Men's · North Alabama at UC Davis | ",
 "Upcoming Nov 5, 6:30 PM Men's · North Alabama vs Union (TN) | ",
 "Upcoming Nov 9 Men's · North Alabama at Oklahoma | ",
 "Upcoming Nov 13 Men's · North Alabama at Miami (FL) | ",
 "Upcoming Nov 16, 11:00 AM Men's · North Alabama vs Fisk | ",
 "Upcoming Nov 19, 6:30 PM Men's · North Alabama vs Tusculum | ",
 "Upcoming Nov 24, 7:00 PM Men's · North Alabama vs Alabama A&M | ",
 "Upcoming Dec 1 Men's · North Alabama at DePaul | ",
 "Upcoming Dec 6 Men's · North Alabama at Charlotte | ",
 "Upcoming Dec 9, 6:30 PM Men's · North Alabama vs UT Martin | ",
 "Upcoming Dec 11, 6:00 PM Men's · North Alabama vs Cumberland (TN) | ",
 "Upcoming Dec 15 Men's · North Alabama at Morehead State | ",
 "Upcoming Dec 19, 3:00 PM Men's · North Alabama vs Queens | ",
 "Upcoming Dec 21, 6:00 PM Men's · North Alabama vs West Florida | ",
 "Upcoming Dec 31 Men's · North Alabama at Bellarmine | ",
 "Upcoming Jan 2, 4:00 PM Men's · North Alabama at Lipscomb | ",
 "Upcoming Jan 6 Men's · North Alabama at West Georgia | ",
 "Upcoming Jan 9, 5:00 PM Men's · North Alabama vs Austin Peay | ",
 "Upcoming Jan 16 Men's · North Alabama at EKU | ",
 "Upcoming Jan 20, 7:45 PM Men's · North Alabama vs Abilene Christian | ",
 "Upcoming Jan 23, 5:00 PM Men's · North Alabama vs UT Arlington | ",
 "Upcoming Jan 27 Men's · North Alabama at Central Arkansas | ",
 "Upcoming Jan 30 Men's · North Alabama at Little Rock | ",
 "Upcoming Feb 3, 6:30 PM Men's · North Alabama vs West Georgia | ",
 "Upcoming Feb 6, 6:00 PM Men's · North Alabama vs EKU | ",
 "Upcoming Feb 10 Men's · North Alabama at Tarleton State | ",
 "Upcoming Feb 13, 6:00 PM Men's · North Alabama vs Little Rock | ",
 "Upcoming Feb 17 Men's · North Alabama at Abilene Christian | ",
 "Upcoming Feb 20 Men's · North Alabama at UT Arlington | ",
 "Upcoming Feb 24, 7:45 PM Men's · North Alabama vs Central Arkansas | ",
 "Upcoming Feb 27 Men's · North Alabama at Austin Peay | ",
 "Upcoming Mar 6, 7:00 PM Men's · North Alabama vs Tarleton State | ",
 "Upcoming Mar 10 Men's · North Alabama at UAC Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · North Alabama at Mississippi State | ",
 "Upcoming Nov 5 Women's · North Alabama at Ole Miss | ",
 "Upcoming Nov 9 Women's · North Alabama at Jacksonville State | ",
 "Upcoming Nov 13, 6:00 PM Women's · North Alabama vs Fisk | ",
 "Upcoming Nov 18 Women's · North Alabama at Vanderbilt | ",
 "Upcoming Nov 23, 6:30 PM Women's · North Alabama vs Jackson State | ",
 "Upcoming Nov 27, 2:00 PM Women's · North Alabama vs UT Southern | ",
 "Upcoming Dec 1 Women's · North Alabama at Evansville | ",
 "Upcoming Dec 5 Women's · North Alabama at UT Martin | ",
 "Upcoming Dec 10, 6:30 PM Women's · North Alabama vs Tennessee State | ",
 "Upcoming Dec 19 Women's · North Alabama at Queens | ",
 "Upcoming Dec 21 Women's · North Alabama at West Florida | ",
 "Upcoming Dec 31, 1:00 PM Women's · North Alabama vs Bellarmine | ",
 "Upcoming Jan 2, 2:00 PM Women's · North Alabama vs Lipscomb | ",
 "Upcoming Jan 6, 6:30 PM Women's · North Alabama vs Little Rock | ",
 "Upcoming Jan 9 Women's · North Alabama at Austin Peay | ",
 "Upcoming Jan 13 Women's · North Alabama at EKU | ",
 "Upcoming Jan 16, 5:00 PM Women's · North Alabama vs Tarleton State | ",
 "Upcoming Jan 20, 5:30 PM Women's · North Alabama vs Central Arkansas | ",
 "Upcoming Jan 23 Women's · North Alabama at Abilene Christian | ",
 "Upcoming Jan 27 Women's · North Alabama at Tarleton State | ",
 "Upcoming Jan 30, 1:00 PM Women's · North Alabama at UT Arlington | ",
 "Upcoming Feb 6, 3:30 PM Women's · North Alabama vs Abilene Christian | ",
 "Upcoming Feb 10, 6:30 PM Women's · North Alabama vs West Georgia | ",
 "Upcoming Feb 13, 3:30 PM Women's · North Alabama vs Austin Peay | ",
 "Upcoming Feb 17 Women's · North Alabama at Central Arkansas | ",
 "Upcoming Feb 20 Women's · North Alabama at Little Rock | ",
 "Upcoming Feb 24, 5:30 PM Women's · North Alabama vs EKU | ",
 "Upcoming Feb 27, 1:00 PM Women's · North Alabama vs UT Arlington | ",
 "Upcoming Mar 6 Women's · North Alabama at West Georgia | ",
 "Upcoming Mar 10 Women's · North Alabama at UAC Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24 North Alabama at Central Bid AVCA Qualifier | ",
 "Upcoming Nov 5 North Alabama at AVCA Pairs National Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · North Alabama at UNA Invitational | 1st of 4",
 "Final Sep 18 Women's · North Alabama at Southern Showcase | 31st of 31",
 "Final Oct 9 Women's · North Alabama at FSU Pre-Regional | 8th of 16",
 "Final Oct 16 Women's · North Alabama at Kennemer Classic | 5th of 12",
 "Upcoming Oct 30 Women's · North Alabama at UAC Championship | ",
 "Upcoming Nov 13 Women's · North Alabama at NCAA South Regional | ",
 "Upcoming Nov 21 Women's · North Alabama at NCAA Nationals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · North Alabama at UNA Invitational | 1st of 5",
 "Final Sep 18 Men's · North Alabama at Southern Showcase | 14th of 29",
 "Final Oct 9 Men's · North Alabama at FSU Pre-Regional | 4th of 12",
 "Final Oct 16 Men's · North Alabama at Kennemer Classic | 3rd of 12",
 "Upcoming Oct 30 Men's · North Alabama at UAC Championship | ",
 "Upcoming Nov 13 Men's · North Alabama at NCAA South Regional | ",
 "Upcoming Nov 21 Men's · North Alabama at NCAA Nationals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 North Alabama vs Samford | W, 22-10",
 "Final Sep 5 North Alabama at Arkansas | L, 14-31",
 "Final Sep 12 North Alabama at Southeastern Louisiana | L, 25-30",
 "Final Sep 19 North Alabama vs Alcorn State | W, 38-20",
 "Final Sep 26 North Alabama vs Western Illinois | W, 23-20",
 "Final Oct 3 North Alabama at Eastern Kentucky | W, 20-16",
 "Final Oct 17 North Alabama vs Abilene Christian | L, 28-31",
 "Upcoming Oct 24, 6:00 PM North Alabama vs Austin Peay | ",
 "Upcoming Oct 31, 4:00 PM North Alabama at Central Arkansas | ",
 "Upcoming Nov 7, 6:00 PM North Alabama vs West Florida | ",
 "Upcoming Nov 14, 1:00 PM North Alabama at West Georgia | ",
 "Upcoming Nov 21, 3:00 PM North Alabama vs Tarleton State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · North Alabama at The Velvet Classic | 5th of 14",
 "Final Oct 12 Women's · North Alabama at The Robbie | 5th of 7",
 "Final Oct 18 Women's · North Alabama at Diamante Intercollegiate | Completed",
 "Upcoming Oct 26 Women's · North Alabama at The Judson | ",
 "Upcoming Nov 1 Women's · North Alabama at Samford Intercollegiate | ",
 "Upcoming Mar 1 Women's · North Alabama at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 15 Women's · North Alabama at Magnolia Collegiate | ",
 "Upcoming Mar 22 Women's · North Alabama at The Nashville Invitational | ",
 "Upcoming Mar 30 Women's · North Alabama at Mini Mason | ",
 "Upcoming Apr 5 Women's · North Alabama at Brickyard Collegiate | ",
 "Upcoming Apr 10 Women's · North Alabama at Jan Weaver Invitational | ",
 "Upcoming Apr 23 Women's · North Alabama at United Athletic Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · North Alabama at Myrtle Beach Golf Trips Intercollegiate | 16th of 16",
 "Final Sep 21 Men's · North Alabama at Highlands Invitational | 11th of 12",
 "Final Oct 5 Men's · North Alabama at Cullan Brown Collegiate | 14th of 15",
 "Final Oct 19 Men's · North Alabama at The Clerico | 9th of 13",
 "Upcoming Feb 14 Men's · North Alabama at The Prestige | ",
 "Upcoming Feb 27 Men's · North Alabama at In Good Standing Classic | ",
 "Upcoming Mar 14 Men's · North Alabama at Seminole Intercollegiate | ",
 "Upcoming Mar 19 Men's · North Alabama at Linger Longer Invitational | ",
 "Upcoming Mar 29 Men's · North Alabama at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 10 Men's · North Alabama at The Aggie | ",
 "Upcoming Apr 26 Men's · North Alabama at UAC Tournament | ",
 "Upcoming May 17 Men's · North Alabama at NCAA Championships | ",
 "Upcoming May 28 Men's · North Alabama at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 15 North Alabama at UNC Asheville | T, 3-3",
 "Final Aug 19 North Alabama vs Union (Tenn.) | W, 6-1",
 "Final Aug 23 North Alabama vs Tennessee Tech | W, 2-0",
 "Final Aug 30 North Alabama vs Southeast Missouri | W, 2-1",
 "Final Sep 3 North Alabama at California Baptist | L, 0-3",
 "Final Sep 6 North Alabama at UC San Diego | T, 0-0",
 "Final Sep 10 North Alabama vs Chattanooga | T, 1-1",
 "Final Sep 24 North Alabama at West Georgia | W, 1-0",
 "Final Sep 27 North Alabama at Austin Peay | W, 2-1",
 "Final Oct 4 North Alabama vs Eastern Kentucky | L, 2-3",
 "Final Oct 8 North Alabama vs Abilene Christian | L, 0-1",
 "Final Oct 11 North Alabama vs Tarleton State | T, 1-1",
 "Final Oct 15 North Alabama at Little Rock | T, 1-1",
 "Final Oct 18 North Alabama at Central Arkansas | L, 0-2",
 "Upcoming Oct 25, 1:00 PM North Alabama at Eastern Kentucky | ",
 "Upcoming Oct 29, 7:00 PM North Alabama vs Austin Peay | ",
 "Upcoming Nov 1, 1:00 PM North Alabama vs West Georgia | ",
 "Upcoming Nov 8 North Alabama at UAC Tournament Quarterfinals | ",
 "Upcoming Nov 11 North Alabama at UAC Tournament Semifinals | ",
 "Upcoming Nov 14 North Alabama at UAC Tournament Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · North Alabama at Lipscomb/Belmont Invite | Completed",
 "Final Oct 2 Women's · North Alabama at Blue Gray National Tennis Classic | Completed",
 "Final Oct 8 Women's · North Alabama at ITA Regionals | Completed",
 "Today Oct 23 Women's · North Alabama at United Athletic Conference Individual Tournament | ",
 "Upcoming Oct 29 Women's · North Alabama at UTR Invite | ",
 "Upcoming Nov 5 Women's · North Alabama at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · North Alabama at Samford Hidden Dual | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · North Alabama at Grizzly Invite | Completed",
 "Final Oct 2 Men's · North Alabama at Black and Gold Invitational | Completed",
 "Final Oct 8 Men's · North Alabama at ITA Regionals | Completed",
 "Today Oct 22 Men's · North Alabama at ASUN Men's Tennis Individual Tournament | ",
 "Today Oct 23 Men's · North Alabama at CBB Invite | ",
 "Upcoming Oct 29 Men's · North Alabama at UTR Invite | ",
 "Upcoming Nov 13 Men's · North Alabama at Samford Invite | ",
 "Upcoming Nov 13 Men's · North Alabama at PTT Ole Miss | ",
 "Upcoming Nov 13 Men's · North Alabama at ITA Conference Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrack=parse("Track & Field","mens-track");
  assert.deepEqual(v_menstrack.map(line),[]);
  const v_wvball=parse("Volleyball","wvball");
  assert.deepEqual(v_wvball.map(line),[
 "Final Aug 28 North Alabama vs Alabama State | W, 3-0",
 "Final Aug 29 North Alabama at Troy | W, 3-0",
 "Final Aug 30 North Alabama vs Mercer | W, 3-0",
 "Final Sep 2 North Alabama vs Alabama A&M | W, 3-0",
 "Final Sep 4 North Alabama vs Jackson State | W, 3-0",
 "Final Sep 4 North Alabama vs Chattanooga | W, 3-0",
 "Final Sep 5 North Alabama vs UT Martin | W, 3-0",
 "Final Sep 8 North Alabama at Tennessee State | W, 3-0",
 "Final Sep 11 North Alabama at Samford | W, 3-2",
 "Final Sep 12 North Alabama vs Jacksonville State | W, 3-0",
 "Final Sep 14 North Alabama at Florida State | L, 0-3",
 "Final Sep 17 North Alabama at Liberty | L, 0-3",
 "Final Sep 18 North Alabama at Liberty | L, 0-3",
 "Final Sep 24 North Alabama vs Abilene Christian | W, 3-2",
 "Final Sep 26 North Alabama at Tarleton State | L, 0-3",
 "Final Sep 29 North Alabama at West Georgia | W, 3-0",
 "Final Oct 3 North Alabama vs Central Arkansas | W, 3-1",
 "Final Oct 8 North Alabama at Austin Peay | W, 3-2",
 "Final Oct 10 North Alabama at Eastern Kentucky | L, 0-3",
 "Final Oct 15 North Alabama vs UT Arlington | W, 3-2",
 "Final Oct 16 North Alabama vs Austin Peay | W, 3-2",
 "Final Oct 22 North Alabama at Abilene Christian | L, 1-3",
 "Upcoming Oct 24, 1:00 PM North Alabama at UT Arlington | ",
 "Upcoming Oct 29, 6:00 PM North Alabama vs Tarleton State | ",
 "Upcoming Oct 31, 1:00 PM North Alabama vs Eastern Kentucky | ",
 "Upcoming Nov 5, 6:00 PM North Alabama at Little Rock | ",
 "Upcoming Nov 6, 6:00 PM North Alabama at Central Arkansas | ",
 "Upcoming Nov 10, 6:00 PM North Alabama vs West Georgia | ",
 "Upcoming Nov 14, 1:00 PM North Alabama vs Little Rock | ",
 "Upcoming Nov 19 North Alabama at United Athletic Conference | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrack,"Track & Field mens-track");
  ownRecapsOnly(v_wvball,"Volleyball wvball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Alabama module checks passed");
