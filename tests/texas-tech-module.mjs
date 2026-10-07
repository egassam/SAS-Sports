import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {texasTechSchool} from '../src/schools/texas-tech.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='texas-tech');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,texasTechHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/texas-tech-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit texastech.com routes, each
// corrected to the official pages (generic and homepage candidates dropped).
const sports=sponsoredSports['texas-tech'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',texasTechSchool.scheduleUrls],['roster',texasTechSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('texas-tech|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'texastech.com',`${key} must stay on texastech.com`);
  }
}
const parity={"Baseball":{"schedule":["https://texastech.com/sports/baseball/schedule"],"roster":["https://texastech.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://texastech.com/sports/mens-basketball/schedule","https://texastech.com/sports/womens-basketball/schedule"],"roster":["https://texastech.com/sports/mens-basketball/roster","https://texastech.com/sports/womens-basketball/roster","https://texastech.com/sports/basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://texastech.com/sports/cross-country/schedule"],"roster":["https://texastech.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://texastech.com/sports/football/schedule"],"roster":["https://texastech.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://texastech.com/sports/womens-golf/schedule","https://texastech.com/sports/mens-golf/schedule"],"roster":["https://texastech.com/sports/womens-golf/roster","https://texastech.com/sports/mens-golf/roster","https://texastech.com/sports/golf/roster"],"combined":true},"Soccer":{"schedule":["https://texastech.com/sports/womens-soccer/schedule"],"roster":["https://texastech.com/sports/womens-soccer/roster","https://texastech.com/sports/wsoc/roster","https://texastech.com/sports/soccer/roster","https://texastech.com/sports/mens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://texastech.com/sports/softball/schedule"],"roster":["https://texastech.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://texastech.com/sports/womens-tennis/schedule","https://texastech.com/sports/mens-tennis/schedule"],"roster":["https://texastech.com/sports/womens-tennis/roster","https://texastech.com/sports/mens-tennis/roster","https://texastech.com/sports/tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://texastech.com/sports/track-and-field/schedule"],"roster":["https://texastech.com/sports/track-and-field/roster","https://texastech.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://texastech.com/sports/womens-volleyball/schedule"],"roster":["https://texastech.com/sports/womens-volleyball/roster","https://texastech.com/sports/wvball/roster","https://texastech.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'texas-tech|"+sport+"':"),`${sport} routes must live in the Texas Tech module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://texastech.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.texasTechHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 15, 3:00 PM Texas Tech vs Weatherford College (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Texas Tech vs Oklahoma (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM Texas Tech vs Oklahoma (Exhibition) | ",
 "Upcoming Oct 29, 3:00 PM Texas Tech vs McLennan Community College (Exhibition) | ",
 "Upcoming Feb 19, 6:30 PM Texas Tech vs Saint Mary's | ",
 "Upcoming Feb 20, 2:00 PM Texas Tech vs Saint Mary's | ",
 "Upcoming Feb 21, 1:00 PM Texas Tech vs Saint Mary's | ",
 "Upcoming Feb 23 Texas Tech at UTSA | ",
 "Upcoming Feb 24 Texas Tech at UTSA | ",
 "Upcoming Feb 26, 6:00 PM Texas Tech vs Texas State | ",
 "Upcoming Feb 27, 1:00 PM Texas Tech vs La Tech | ",
 "Upcoming Feb 28, 12:00 PM Texas Tech vs Alabama | ",
 "Upcoming Mar 2 Texas Tech vs Oklahoma | ",
 "Upcoming Mar 5, 6:30 PM Texas Tech vs San Diego | ",
 "Upcoming Mar 6, 2:00 PM Texas Tech vs San Diego | ",
 "Upcoming Mar 7, 1:00 PM Texas Tech vs San Diego | ",
 "Upcoming Mar 11 Texas Tech at Oregon State | ",
 "Upcoming Mar 12 Texas Tech at Oregon State | ",
 "Upcoming Mar 13 Texas Tech at Oregon State | ",
 "Upcoming Mar 14 Texas Tech at Oregon State | ",
 "Upcoming Mar 18, 4:00 PM Texas Tech at BYU | ",
 "Upcoming Mar 19, 4:00 PM Texas Tech at BYU | ",
 "Upcoming Mar 21, 2:00 PM Texas Tech at BYU | ",
 "Upcoming Mar 23 Texas Tech at DBU | ",
 "Upcoming Mar 25, 6:30 PM Texas Tech vs Baylor | ",
 "Upcoming Mar 26, 6:00 PM Texas Tech vs Baylor | ",
 "Upcoming Mar 27, 2:00 PM Texas Tech vs Baylor | ",
 "Upcoming Mar 29, 2:00 PM Texas Tech vs New Mexico | ",
 "Upcoming Mar 30, 7:00 PM Texas Tech vs UTA | ",
 "Upcoming Apr 2, 6:00 PM Texas Tech at Kansas | ",
 "Upcoming Apr 3, 2:00 PM Texas Tech at Kansas | ",
 "Upcoming Apr 4, 1:00 PM Texas Tech at Kansas | ",
 "Upcoming Apr 6, 6:30 PM Texas Tech vs ACU | ",
 "Upcoming Apr 9, 6:30 PM Texas Tech vs Cincinnati | ",
 "Upcoming Apr 10, 2:00 PM Texas Tech vs Cincinnati | ",
 "Upcoming Apr 11, 1:00 PM Texas Tech vs Cincinnati | ",
 "Upcoming Apr 13, 6:30 PM Texas Tech vs DBU | ",
 "Upcoming Apr 16 Texas Tech at Houston | ",
 "Upcoming Apr 17 Texas Tech at Houston | ",
 "Upcoming Apr 18 Texas Tech at Houston | ",
 "Upcoming Apr 20, 3:00 PM Texas Tech at New Mexico | ",
 "Upcoming Apr 21, 6:30 PM Texas Tech vs SFA | ",
 "Upcoming Apr 23, 6:30 PM Texas Tech vs Arizona State | ",
 "Upcoming Apr 24, 2:00 PM Texas Tech vs Arizona State | ",
 "Upcoming Apr 25, 1:00 PM Texas Tech vs Arizona State | ",
 "Upcoming Apr 27, 6:30 PM Texas Tech vs UTRGV | ",
 "Upcoming Apr 30 Texas Tech at Oklahoma State | ",
 "Upcoming May 1 Texas Tech at Oklahoma State | ",
 "Upcoming May 2 Texas Tech at Oklahoma State | ",
 "Upcoming May 3 Texas Tech at Oklahoma | ",
 "Upcoming May 7, 6:30 PM Texas Tech vs TCU | ",
 "Upcoming May 8, 2:00 PM Texas Tech vs TCU | ",
 "Upcoming May 9, 2:00 PM Texas Tech vs TCU | ",
 "Upcoming May 11 Texas Tech at ACU | ",
 "Upcoming May 14, 6:00 PM Texas Tech at UCF | ",
 "Upcoming May 15, 6:00 PM Texas Tech at University of Central Florida | ",
 "Upcoming May 16, 1:00 PM Texas Tech at UCF | ",
 "Upcoming May 20, 6:30 PM Texas Tech vs Utah | ",
 "Upcoming May 21, 6:00 PM Texas Tech vs Utah | ",
 "Upcoming May 22, 2:00 PM Texas Tech vs Utah | ",
 "Upcoming May 25 Texas Tech at Big 12 Championship Presented by Allstate | ",
 "Upcoming Jun 4 Texas Tech at NCAA Regionals | ",
 "Upcoming Jun 10 Texas Tech at NCAA Super Regionals | ",
 "Upcoming Jun 18 Texas Tech at NCAA College World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23 Men's · Texas Tech at Kentucky (Exhibition) | ",
 "Upcoming Nov 2 Men's · Texas Tech vs Jackson State | ",
 "Upcoming Nov 5 Men's · Texas Tech vs Bethune-Cookman | ",
 "Upcoming Nov 10 Men's · Texas Tech vs Illinois | ",
 "Upcoming Nov 14 Men's · Texas Tech vs Stonehill College | ",
 "Upcoming Nov 18 Men's · Texas Tech vs New Orleans | ",
 "Upcoming Nov 24, 7:00 PM Men's · Texas Tech vs Louisville | ",
 "Upcoming Nov 26 Men's · Texas Tech vs Oregon or St. John's | ",
 "Upcoming Nov 27 Men's · Texas Tech vs Tennessee, Maryland, San Diego State or Iowa State | ",
 "Upcoming Nov 28, 9:30 PM Men's · Texas Tech vs Players Era Championship Game | ",
 "Upcoming Dec 8 Men's · Texas Tech vs Omaha | ",
 "Upcoming Dec 13, 1:00 PM Men's · Texas Tech vs USC | ",
 "Upcoming Dec 15 Men's · Texas Tech vs Incarnate Word | ",
 "Upcoming Dec 21, 6:00 PM Men's · Texas Tech vs Duke | ",
 "Upcoming Dec 28 Men's · Texas Tech vs Mississippi Valley State | ",
 "Upcoming Jan 2 Men's · Texas Tech at Cincinnati | ",
 "Upcoming Jan 6 Men's · Texas Tech vs Baylor | ",
 "Upcoming Jan 9 Men's · Texas Tech at TCU | ",
 "Upcoming Jan 12 Men's · Texas Tech vs Arizona State | ",
 "Upcoming Jan 16 Men's · Texas Tech vs Iowa State | ",
 "Upcoming Jan 19 Men's · Texas Tech at Houston | ",
 "Upcoming Jan 22 Men's · Texas Tech vs Arizona | ",
 "Upcoming Jan 27 Men's · Texas Tech at Oklahoma State | ",
 "Upcoming Jan 30 Men's · Texas Tech vs UCF | ",
 "Upcoming Feb 2 Men's · Texas Tech at Colorado | ",
 "Upcoming Feb 6, 11:00 AM Men's · Texas Tech at Kansas | ",
 "Upcoming Feb 13 Men's · Texas Tech vs West Virginia | ",
 "Upcoming Feb 15, 8:00 PM Men's · Texas Tech vs Houston | ",
 "Upcoming Feb 20 Men's · Texas Tech at UCF | ",
 "Upcoming Feb 24 Men's · Texas Tech at Kansas State | ",
 "Upcoming Feb 27 Men's · Texas Tech vs Cincinnati | ",
 "Upcoming Mar 2 Men's · Texas Tech at Utah | ",
 "Upcoming Mar 5 Men's · Texas Tech vs BYU | ",
 "Upcoming Mar 9 Men's · Texas Tech at Phillips 66 Big 12 Tournament | ",
 "Upcoming Mar 18 Men's · Texas Tech at NCAA Tournament First and Second Rounds | ",
 "Upcoming Mar 25 Men's · Texas Tech at NCAA Tournament Sweet 16 and Elite 8 Rounds | ",
 "Upcoming Apr 3 Men's · Texas Tech at NCAA Championship Semifinals | ",
 "Upcoming Apr 5 Men's · Texas Tech at NCAA Championship Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 18, 1:00 PM Women's · Texas Tech vs Angelo State University (Exhibition) | ",
 "Upcoming Nov 5 Women's · Texas Tech vs Charlotte | ",
 "Upcoming Nov 9 Women's · Texas Tech vs Lamar University | ",
 "Upcoming Nov 13 Women's · Texas Tech vs Auburn University | ",
 "Upcoming Nov 15 Women's · Texas Tech vs Southeastern Louisiana University | ",
 "Upcoming Nov 19, 5:00 PM Women's · Texas Tech vs University of North Carolina | ",
 "Upcoming Nov 21, 1:30 PM Women's · Texas Tech vs Purdue University | ",
 "Upcoming Nov 22, 12:00 PM Women's · Texas Tech vs University of South Florida | ",
 "Upcoming Nov 26, 4:30 PM Women's · Texas Tech vs Air Force | ",
 "Upcoming Nov 28 Women's · Texas Tech vs Xavier/Santa Clara | ",
 "Upcoming Dec 1 Women's · Texas Tech vs Texas Southern University | ",
 "Upcoming Dec 13 Women's · Texas Tech at Mississippi State University | ",
 "Upcoming Dec 16 Women's · Texas Tech vs University of North Florida | ",
 "Upcoming Dec 20 Women's · Texas Tech vs University of Colorado | ",
 "Upcoming Dec 30 Women's · Texas Tech at Baylor University | ",
 "Upcoming Jan 2 Women's · Texas Tech at Texas Christian University | ",
 "Upcoming Jan 5 Women's · Texas Tech vs University of Cincinnati | ",
 "Upcoming Jan 9 Women's · Texas Tech vs University of Utah | ",
 "Upcoming Jan 13 Women's · Texas Tech at University of Arizona | ",
 "Upcoming Jan 16 Women's · Texas Tech at Arizona State University | ",
 "Upcoming Jan 20 Women's · Texas Tech vs Baylor University | ",
 "Upcoming Jan 23 Women's · Texas Tech at University of Central Florida | ",
 "Upcoming Jan 27 Women's · Texas Tech vs West Virginia University | ",
 "Upcoming Jan 30 Women's · Texas Tech vs Brigham Young University | ",
 "Upcoming Feb 3 Women's · Texas Tech at Iowa State University | ",
 "Upcoming Feb 7 Women's · Texas Tech at Kansas State University | ",
 "Upcoming Feb 13 Women's · Texas Tech vs University of Central Florida | ",
 "Upcoming Feb 17 Women's · Texas Tech vs University of Houston | ",
 "Upcoming Feb 20 Women's · Texas Tech at West Virginia University | ",
 "Upcoming Feb 24 Women's · Texas Tech vs Oklahoma State | ",
 "Upcoming Feb 28 Women's · Texas Tech at University of Kansas | ",
 "Upcoming Mar 3 Women's · Texas Tech at Phillips 66 Big 12 Women's Basketball Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Texas Tech at Cowboy Preview | Completed",
 "Final Sep 11 Texas Tech at NMJC Dr. Steve McCleery Invite | Completed",
 "Final Sep 18 Texas Tech at Texas Tech Open | Completed",
 "Final Oct 2 Texas Tech at Nike XC Town Twilight | Completed",
 "Upcoming Oct 16 Texas Tech at Arturo Barrios Invite | ",
 "Upcoming Oct 31 Texas Tech at Big 12 Cross Country Championships | ",
 "Upcoming Nov 13 Texas Tech at NCAA Mountain Region Championships | ",
 "Upcoming Nov 21 Texas Tech at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Texas Tech vs Abilene Christian | W, 33-10",
 "Final Sep 12 Texas Tech at Oregon State | W, 35-24",
 "Final Sep 18 Texas Tech vs Houston | W, 28-26",
 "Final Sep 26 Texas Tech vs Sam Houston | W, 49-14",
 "Final Oct 3 Texas Tech at Colorado | W, 29-7",
 "Upcoming Oct 17, 2:30 PM Texas Tech vs Arizona State | ",
 "Upcoming Oct 24 Texas Tech at Cincinnati | ",
 "Upcoming Oct 31 Texas Tech vs Arizona | ",
 "Upcoming Nov 7 Texas Tech vs West Virginia | ",
 "Upcoming Nov 14 Texas Tech at Oklahoma State | ",
 "Upcoming Nov 21 Texas Tech at Baylor | ",
 "Upcoming Nov 26, 7:00 PM Texas Tech vs TCU | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Texas Tech at The Bruzzy presented by Ashley Herrera | 7th of 11",
 "Final Sep 22 Women's · Texas Tech at Red Raider Invitational | 2nd of 12",
 "Upcoming Oct 12 Women's · Texas Tech at Illini Women’s Invitational | ",
 "Upcoming Oct 19 Women's · Texas Tech at The Fin | ",
 "Upcoming Feb 1 Women's · Texas Tech at Paradise Invitational | ",
 "Upcoming Feb 8 Women's · Texas Tech at Thunderbird Intercollegiate | ",
 "Upcoming Feb 22 Women's · Texas Tech at Chevron Invitational | ",
 "Upcoming Mar 1 Women's · Texas Tech at Lady Luck Invitational | ",
 "Upcoming Mar 14 Women's · Texas Tech at MountainView Collegiate | ",
 "Upcoming Apr 5 Women's · Texas Tech at SMU Invitational | ",
 "Upcoming Apr 21 Women's · Texas Tech at Big 12 Championship | ",
 "Upcoming May 10 Women's · Texas Tech at NCAA Regionals | ",
 "Upcoming May 21 Women's · Texas Tech at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Texas Tech at Inverness Intercollegiate | 4th of 18",
 "Final Sep 18 Men's · Texas Tech at OFCC/Fighting Illini Invitational | 3rd of 15",
 "Final Sep 28 Men's · Texas Tech at Ben Hogan Collegiate Invitational | T3rd of 16",
 "Upcoming Oct 12 Men's · Texas Tech at Big 12 Match Play | ",
 "Upcoming Feb 4 Men's · Texas Tech at Amer Ari Invitational | ",
 "Upcoming Feb 28 Men's · Texas Tech at Las Vegas Collegiate | ",
 "Upcoming Mar 6 Men's · Texas Tech at The Hayt | ",
 "Upcoming Mar 22 Men's · Texas Tech at Valspar Collegiate Invitational | ",
 "Upcoming Apr 3 Men's · Texas Tech at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 12 Men's · Texas Tech at Western Intercollegiate | ",
 "Upcoming Apr 26 Men's · Texas Tech at Big 12 Championship | ",
 "Upcoming May 17 Men's · Texas Tech at NCAA Regionals | ",
 "Upcoming May 28 Men's · Texas Tech at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 6 Texas Tech vs New Mexico (Exhibition) | W, 4-1",
 "Final Aug 13 Texas Tech at Hawaii | W, 1-0",
 "Final Aug 15 Texas Tech vs Seattle | T, 0-0",
 "Final Aug 23 Texas Tech vs Boise State | W, 2-0",
 "Final Aug 27 Texas Tech vs Pepperdine | T, 1-1",
 "Final Sep 3 Texas Tech at SMU | T, 1-1",
 "Final Sep 6 Texas Tech vs San Diego State | W, 2-1",
 "Final Sep 11 Texas Tech vs Kent State | W, 3-0",
 "Final Sep 17 Texas Tech at UCF | T, 2-2",
 "Final Sep 24 Texas Tech vs Cincinnati | W, 2-0",
 "Final Sep 27 Texas Tech vs Colorado | W, 3-1",
 "Final Oct 2 Texas Tech vs Arizona State | W, 2-0",
 "Upcoming Oct 8, 7:00 PM Texas Tech at Oklahoma State | ",
 "Upcoming Oct 11, 1:00 PM Texas Tech at TCU | ",
 "Upcoming Oct 16, 8:00 PM Texas Tech at BYU | ",
 "Upcoming Oct 22, 7:00 PM Texas Tech vs West Virginia | ",
 "Upcoming Oct 25, 2:00 PM Texas Tech at Utah | ",
 "Upcoming Oct 30, 7:00 PM Texas Tech vs Baylor | ",
 "Upcoming Nov 5, 6:00 PM Texas Tech at Kansas | ",
 "Upcoming Nov 9 Texas Tech at Big 12 Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 11, 2:00 PM Texas Tech at West Texas A&M (Exhibition) | ",
 "Upcoming Oct 18, 12:00 PM Texas Tech vs New Mexico (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Texas Tech vs Odessa College (Exhibition) | ",
 "Upcoming Feb 12, 4:00 PM Texas Tech vs Jacksonville State | ",
 "Upcoming Feb 12, 7:00 PM Texas Tech vs Notre Dame | ",
 "Upcoming Feb 13, 1:00 PM Texas Tech vs Liberty | ",
 "Upcoming Feb 13, 6:00 PM Texas Tech vs Northwestern | ",
 "Upcoming Feb 14, 9:00 AM Texas Tech vs Virginia Tech | ",
 "Upcoming Feb 14, 12:00 PM Texas Tech vs NC State | ",
 "Upcoming Mar 12 Texas Tech vs Kansas | ",
 "Upcoming Mar 13 Texas Tech vs Kansas | ",
 "Upcoming Mar 14 Texas Tech vs Kansas | ",
 "Upcoming Mar 19 Texas Tech at Baylor | ",
 "Upcoming Mar 20 Texas Tech at Baylor | ",
 "Upcoming Mar 21 Texas Tech at Baylor | ",
 "Upcoming Mar 25 Texas Tech vs UCF | ",
 "Upcoming Mar 26 Texas Tech vs UCF | ",
 "Upcoming Mar 27, 11:30 AM Texas Tech vs UCF | ",
 "Upcoming Apr 2 Texas Tech at Iowa State | ",
 "Upcoming Apr 3 Texas Tech at Iowa State | ",
 "Upcoming Apr 4 Texas Tech at Iowa State | ",
 "Upcoming Apr 16 Texas Tech at Arizona | ",
 "Upcoming Apr 17 Texas Tech at Arizona | ",
 "Upcoming Apr 18 Texas Tech at Arizona | ",
 "Upcoming Apr 23 Texas Tech vs Houston | ",
 "Upcoming Apr 24 Texas Tech vs Houston | ",
 "Upcoming Apr 25 Texas Tech vs Houston | ",
 "Upcoming Apr 30 Texas Tech at Oklahoma State | ",
 "Upcoming May 1 Texas Tech at Oklahoma State | ",
 "Upcoming May 2 Texas Tech at Oklahoma State | ",
 "Upcoming May 6, 6:00 PM Texas Tech vs Arizona State | ",
 "Upcoming May 7, 6:00 PM Texas Tech vs Arizona State | ",
 "Upcoming May 8, 12:00 PM Texas Tech vs Arizona State | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Texas Tech at ACU Invitational | Completed",
 "Final Sep 19 Women's · Texas Tech at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Texas Tech at Air Force | Completed",
 "Upcoming Oct 8 Women's · Texas Tech at ITA Texas Regionals | ",
 "Upcoming Oct 19 Women's · Texas Tech at Lubbock 25K | ",
 "Upcoming Nov 5 Women's · Texas Tech at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Texas Tech at UNF Invite | ",
 "Upcoming Nov 18 Women's · Texas Tech at NCAA Individual Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Texas Tech at Midland Racquet Club Collegiate Invitational | Completed",
 "Final Sep 11 Men's · Texas Tech at Milwaukee Tennis Classic | Completed",
 "Final Sep 19 Men's · Texas Tech at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Texas Tech at Blue Gray National Tennis Classic | Completed",
 "Upcoming Oct 8 Men's · Texas Tech at ITA Texas Regionals | ",
 "Upcoming Oct 19 Men's · Texas Tech at Texas Tech UTR Pro Fall Slam | ",
 "Upcoming Oct 30 Men's · Texas Tech at Ralston/Neufeld Coaches Challenge | ",
 "Upcoming Nov 5 Men's · Texas Tech at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Texas Tech at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Texas Tech at NCAA Singles & Doubles Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Texas Tech at Wyoming | L, 1-3",
 "Final Aug 29 Texas Tech vs St. Thomas | W, 3-2",
 "Final Sep 3 Texas Tech vs Saint Mary's | W, 3-1",
 "Final Sep 4 Texas Tech at Sacramento State | L, 0-3",
 "Final Sep 5 Texas Tech vs Nevada | W, 3-2",
 "Final Sep 10 Texas Tech vs UTRGV | W, 3-1",
 "Final Sep 10 Texas Tech vs Prairie View A&M | W, 3-2",
 "Final Sep 11 Texas Tech vs Portland State | W, 3-0",
 "Final Sep 15 Texas Tech vs Tarleton State | W, 3-1",
 "Final Sep 18 Texas Tech vs Central Arkansas | W, 3-1",
 "Final Sep 18 Texas Tech vs West Florida | L, 1-3",
 "Final Sep 19 Texas Tech at Iowa | L, 1-3",
 "Final Sep 25 Texas Tech vs Iowa State | L, 2-3",
 "Final Sep 27 Texas Tech vs Kansas | L, 0-3",
 "Final Oct 2 Texas Tech vs West Virginia | L, 2-3",
 "Final Oct 4 Texas Tech at Arizona | L, 0-3",
 "Upcoming Oct 8, 6:00 PM Texas Tech vs Baylor | ",
 "Upcoming Oct 16, 6:30 PM Texas Tech at TCU | ",
 "Upcoming Oct 18, 1:00 PM Texas Tech at Houston | ",
 "Upcoming Oct 23, 6:00 PM Texas Tech vs UCF | ",
 "Upcoming Oct 25, 1:00 PM Texas Tech at Kansas State | ",
 "Upcoming Nov 1, 12:00 PM Texas Tech at Colorado | ",
 "Upcoming Nov 6, 6:00 PM Texas Tech vs Arizona State | ",
 "Upcoming Nov 8, 12:00 PM Texas Tech vs Arizona | ",
 "Upcoming Nov 12, 6:00 PM Texas Tech at Utah | ",
 "Upcoming Nov 14, 12:00 PM Texas Tech at BYU | ",
 "Upcoming Nov 19, 6:00 PM Texas Tech vs Kansas State | ",
 "Upcoming Nov 22, 1:00 PM Texas Tech vs Houston | ",
 "Upcoming Nov 25, 11:00 AM Texas Tech at Cincinnati | ",
 "Upcoming Nov 27, 2:00 PM Texas Tech at West Virginia | "
]);
  // Each final matches only its own recap.
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

  // Bracket rounds with no opponent yet read as their tournament; the Final
  // Four's games are named after their round ("at").
  assert.deepEqual(v_mensbasketball.filter(e=>/NCAA|Big 12/.test(e.title)).map(e=>e.title),["Men's · Texas Tech at Phillips 66 Big 12 Tournament","Men's · Texas Tech at NCAA Tournament First and Second Rounds","Men's · Texas Tech at NCAA Tournament Sweet 16 and Elite 8 Rounds","Men's · Texas Tech at NCAA Championship Semifinals","Men's · Texas Tech at NCAA Championship Final"]);
  assert.ok(!v_mensbasketball.some(e=>/Opponents TBD/.test(e.title)));
  // The home Lubbock 25K is listed against "Texas Tech University".
  assert.equal(v_womenstennis.find(e=>e.display_time==='Oct 19').title,"Women's · Texas Tech at Lubbock 25K");
  assert.equal(v_menstennis.find(e=>e.display_time==='Oct 19').title,"Men's · Texas Tech at Texas Tech UTR Pro Fall Slam");
  // Track & Field: the page still lists the 2025-26 season.
  assert.deepEqual(v_trackandfield,[]);
}

// Cross Country: the Nike XC Town Twilight's story is in the archive (the
// schedule links none, Oct 2) and TFRRS adds Texas Tech's results to every meet.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  const twilight=xc.find(e=>e.opponent==='Nike XC Town Twilight');
  assert.equal(worker.texasTechHandlers.isFinalWithoutStory(twilight),true);
  recapFixtures.set('https://texastech.com/sports/cross-country/archives',fixture('cross-country-archives.html.gz'));
  recapFixtures.set('https://texastech.com/news/2026/10/2/cross-country-kimaru-and-mather-win-nike-xc-town-twilight-races',fixture('story-2026-10-2-cross-country-kimaru-and-mather-win-nike.html.gz'));
  await worker.texasTechHandlers.attachArchiveStory(twilight);
  assert.equal(twilight.recap_url,'https://texastech.com/news/2026/10/2/cross-country-kimaru-and-mather-win-nike-xc-town-twilight-races');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/TX_college_f_Texas_Tech.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/TX_college_m_Texas_Tech.html','tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/28300/Cowboy_Preview','tfrrs-28300.html.gz'],['https://www.tfrrs.org/results/xc/27594/Texas_Tech_Open','tfrrs-27594.html.gz'],['https://www.tfrrs.org/results/xc/28576/NMJC_Dr_Steve_McCleery_Invitational_','tfrrs-28576.html.gz'],['https://www.tfrrs.org/results/xc/27813/NIKE_XC_Town_Twilight','tfrrs-27813.html.gz']])recapFixtures.set(url,fixture(file));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  // The women did not run the NMJC meet; at the Twilight the men ran no team.
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline]),[['Cowboy Preview',"Women's team: 4th · 76 pts / Men's team: 4th · 95 pts"],['NMJC Dr. Steve McCleery Invite',"Men's team: 5th · 128 pts"],['Texas Tech Open',"Women's team: 2nd · 60 pts / Men's team: 13th · 332 pts"],['Nike XC Town Twilight',"Women's team: 2nd · 52 pts / Men's: Titus Kimaru 1st"]]);
  recapFixtures.clear();
}

// Live: ESPN joins the official card for Texas Tech's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['Texas Tech at Colorado','Final','W, 29-7']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Texas Tech at Arizona','Final','L, 0-3']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Texas Tech vs Arizona St','Final','W, 2-0']]);
}

// Records: each sport's overall and Big 12 record equals the one its page publishes.
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
    return holder?[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')]:null;
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug,overall,conference] of [['Football','football','5-0','2-0'],['Volleyball','womens-volleyball','8-8','0-4'],['Soccer','womens-soccer','7-0-4','3-0-1']]){
    assert.deepEqual(published(slug),[overall,conference],`${sport}: the official page publishes ${overall} (${conference} Big 12)`);
    assert.deepEqual(record(sport,slug).map(r=>[r.text,r.conference?.text]),[[overall,conference]],`${sport}: the computed records are the official ones`);
  }
  // The soccer exhibition (New Mexico) is not in the record.
  assert.deepEqual(record('Cross Country','cross-country'),[]);
}

// Other schools and other hosts never reach the Texas Tech reader.
assert.equal(worker.texasTechHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://texastech.com/',now),null);
assert.equal(worker.texasTechHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='west-virginia'),'Football',page('football'),now),null);
requests.length=0;

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Texas Tech module checks passed');
