import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {middleTennesseeSchool} from '../src/schools/middle-tennessee.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='middle-tennessee');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,middleTennesseeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/middle-tennessee-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goblueraiders.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['middle-tennessee'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',middleTennesseeSchool.scheduleUrls],['roster',middleTennesseeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('middle-tennessee|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goblueraiders.com',`${key} must stay on goblueraiders.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goblueraiders.com/sports/baseball/schedule"],"roster":["https://goblueraiders.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goblueraiders.com/sports/mens-basketball/schedule","https://goblueraiders.com/sports/womens-basketball/schedule"],"roster":["https://goblueraiders.com/sports/mens-basketball/roster","https://goblueraiders.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goblueraiders.com/sports/womens-track-and-field/schedule","https://goblueraiders.com/sports/mens-track-and-field/schedule"],"roster":["https://goblueraiders.com/sports/womens-track-and-field/roster","https://goblueraiders.com/sports/mens-track-and-field/roster"],"combined":true},"Football":{"schedule":["https://goblueraiders.com/sports/football/schedule"],"roster":["https://goblueraiders.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goblueraiders.com/sports/womens-golf/schedule","https://goblueraiders.com/sports/mens-golf/schedule"],"roster":["https://goblueraiders.com/sports/womens-golf/roster","https://goblueraiders.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goblueraiders.com/sports/womens-soccer/schedule"],"roster":["https://goblueraiders.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goblueraiders.com/sports/softball/schedule"],"roster":["https://goblueraiders.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goblueraiders.com/sports/womens-tennis/schedule","https://goblueraiders.com/sports/mens-tennis/schedule"],"roster":["https://goblueraiders.com/sports/womens-tennis/roster","https://goblueraiders.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goblueraiders.com/sports/womens-track-and-field/schedule","https://goblueraiders.com/sports/mens-track-and-field/schedule"],"roster":["https://goblueraiders.com/sports/womens-track-and-field/roster","https://goblueraiders.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goblueraiders.com/sports/womens-volleyball/schedule"],"roster":["https://goblueraiders.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'middle-tennessee|"+sport+"':"),`${sport} routes must live in the Middle Tennessee module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://goblueraiders.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.middleTennesseeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=middle-tennessee)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 2 Middle Tennessee vs North Alabama (Exhibition) | T, 6-6",
 "Final Oct 4 Middle Tennessee vs Tennessee Tech (Exhibition) | W, 15-11",
 "Final Oct 18 Middle Tennessee at Tennessee Tech (Exhibition) | W, 17-6",
 "Upcoming Mar 26 Middle Tennessee at Western Kentucky | ",
 "Upcoming Mar 27 Middle Tennessee at Western Kentucky | ",
 "Upcoming Mar 28 Middle Tennessee at Western Kentucky | ",
 "Upcoming Apr 2 Middle Tennessee vs Florida International | ",
 "Upcoming Apr 3 Middle Tennessee vs Florida International | ",
 "Upcoming Apr 4 Middle Tennessee vs Florida International | ",
 "Upcoming Apr 9 Middle Tennessee at Kennesaw State | ",
 "Upcoming Apr 10 Middle Tennessee at Kennesaw State | ",
 "Upcoming Apr 11 Middle Tennessee at Kennesaw State | ",
 "Upcoming Apr 16 Middle Tennessee vs Jax State | ",
 "Upcoming Apr 17 Middle Tennessee vs Jax State | ",
 "Upcoming Apr 18 Middle Tennessee vs Jax State | ",
 "Upcoming Apr 23 Middle Tennessee at Liberty | ",
 "Upcoming Apr 24 Middle Tennessee at Liberty | ",
 "Upcoming Apr 25 Middle Tennessee at Liberty | ",
 "Upcoming Apr 30 Middle Tennessee vs Mo State | ",
 "Upcoming May 1 Middle Tennessee vs Mo State | ",
 "Upcoming May 2 Middle Tennessee vs Mo State | ",
 "Upcoming May 7 Middle Tennessee at New Mexico State | ",
 "Upcoming May 8 Middle Tennessee at New Mexico State | ",
 "Upcoming May 9 Middle Tennessee at New Mexico State | ",
 "Upcoming May 14 Middle Tennessee vs Sam Houston | ",
 "Upcoming May 15 Middle Tennessee vs Sam Houston | ",
 "Upcoming May 16 Middle Tennessee vs Sam Houston | ",
 "Upcoming May 20 Middle Tennessee at Delaware | ",
 "Upcoming May 21 Middle Tennessee at Delaware | ",
 "Upcoming May 22 Middle Tennessee at Delaware | ",
 "Upcoming May 26 Middle Tennessee at 2027 Conference USA Baseball Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 10:30 AM Men's · Middle Tennessee vs Fisk | ",
 "Upcoming Nov 6, 8:00 PM Men's · Middle Tennessee at Kansas | ",
 "Upcoming Nov 10, 6:30 PM Men's · Middle Tennessee vs Evansville | ",
 "Upcoming Nov 13, 6:30 PM Men's · Middle Tennessee vs SEMO | ",
 "Upcoming Nov 17, 7:00 PM Men's · Middle Tennessee at Georgia Southern | ",
 "Upcoming Nov 20, 11:30 AM Men's · Middle Tennessee vs Temple | ",
 "Upcoming Nov 22 Men's · Middle Tennessee at Paradise Jam | ",
 "Upcoming Nov 28, 5:30 PM Men's · Middle Tennessee vs Toccoa Falls | ",
 "Upcoming Dec 1, 6:30 PM Men's · Middle Tennessee vs Tennessee Tech | ",
 "Upcoming Dec 5, 7:00 PM Men's · Middle Tennessee at Belmont | ",
 "Upcoming Dec 15, 7:00 PM Men's · Middle Tennessee vs Auburn | ",
 "Upcoming Dec 17 Men's · Middle Tennessee at UAB | ",
 "Upcoming Dec 20, 2:00 PM Men's · Middle Tennessee vs UT Southern | ",
 "Upcoming Dec 31, 4:00 PM Men's · Middle Tennessee at Jacksonville State | ",
 "Upcoming Jan 2, 1:00 PM Men's · Middle Tennessee at Kennesaw State | ",
 "Upcoming Jan 7, 6:30 PM Men's · Middle Tennessee vs Sam Houston | ",
 "Upcoming Jan 9, 5:00 PM Men's · Middle Tennessee vs New Mexico State | ",
 "Upcoming Jan 14, 7:30 PM Men's · Middle Tennessee at Liberty | ",
 "Upcoming Jan 16, 1:00 PM Men's · Middle Tennessee at Delaware | ",
 "Upcoming Jan 21, 6:30 PM Men's · Middle Tennessee vs FIU | ",
 "Upcoming Jan 23, 5:00 PM Men's · Middle Tennessee vs Missouri State | ",
 "Upcoming Jan 30, 3:00 PM Men's · Middle Tennessee at WKU | ",
 "Upcoming Feb 4, 7:30 PM Men's · Middle Tennessee at New Mexico State | ",
 "Upcoming Feb 6, 2:30 PM Men's · Middle Tennessee at Sam Houston | ",
 "Upcoming Feb 11, 6:30 PM Men's · Middle Tennessee vs Delaware | ",
 "Upcoming Feb 13, 3:00 PM Men's · Middle Tennessee vs Liberty | ",
 "Upcoming Feb 18, 7:00 PM Men's · Middle Tennessee at Missouri State | ",
 "Upcoming Feb 20, 1:00 PM Men's · Middle Tennessee at FIU | ",
 "Upcoming Feb 27, 1:00 PM Men's · Middle Tennessee vs WKU | ",
 "Upcoming Mar 4, 7:00 PM Men's · Middle Tennessee vs Kennesaw State | ",
 "Upcoming Mar 6, 2:00 PM Men's · Middle Tennessee vs Jacksonville State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 19 Women's · Middle Tennessee vs Lemoyne-Owen (Exhibition) | W, 112-48",
 "Upcoming Oct 26, 6:30 PM Women's · Middle Tennessee vs Johnson (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Women's · Middle Tennessee vs Saint Louis | ",
 "Upcoming Nov 6, 6:00 PM Women's · Middle Tennessee at Memphis | ",
 "Upcoming Nov 12 Women's · Middle Tennessee at Tennessee | ",
 "Upcoming Nov 16, 6:30 PM Women's · Middle Tennessee vs Tennessee Tech | ",
 "Upcoming Nov 20, 6:00 PM Women's · Middle Tennessee at Auburn | ",
 "Upcoming Nov 23, 11:00 AM Women's · Middle Tennessee vs Oregon State | ",
 "Upcoming Nov 25, 3:00 PM Women's · Middle Tennessee vs Montana State | ",
 "Upcoming Nov 30, 6:30 PM Women's · Middle Tennessee vs Lipscomb | ",
 "Upcoming Dec 3, 10:30 AM Women's · Middle Tennessee vs Southern Indiana | ",
 "Upcoming Dec 6, 1:00 PM Women's · Middle Tennessee vs Wichita State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Middle Tennessee at Belmont | ",
 "Upcoming Dec 17, 6:00 PM Women's · Middle Tennessee vs Rice | ",
 "Upcoming Dec 20, 5:30 PM Women's · Middle Tennessee vs Tulsa | ",
 "Upcoming Dec 21, 5:30 PM Women's · Middle Tennessee vs South Florida | ",
 "Upcoming Jan 2, 2:00 PM Women's · Middle Tennessee vs Jax State | ",
 "Upcoming Jan 4, 6:30 PM Women's · Middle Tennessee vs Kennesaw State | ",
 "Upcoming Jan 8, 6:30 PM Women's · Middle Tennessee at Sam Houston | ",
 "Upcoming Jan 10, 1:00 PM Women's · Middle Tennessee at NM State | ",
 "Upcoming Jan 14 Women's · Middle Tennessee vs Liberty | ",
 "Upcoming Jan 16, 6:00 PM Women's · Middle Tennessee vs Delaware | ",
 "Upcoming Jan 21, 6:00 PM Women's · Middle Tennessee at FIU | ",
 "Upcoming Jan 23, 1:00 PM Women's · Middle Tennessee at Missouri State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Middle Tennessee vs WKU | ",
 "Upcoming Feb 4, 6:30 PM Women's · Middle Tennessee vs NM State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Middle Tennessee vs Sam Houston | ",
 "Upcoming Feb 11, 6:00 PM Women's · Middle Tennessee at Delaware | ",
 "Upcoming Feb 13, 1:00 PM Women's · Middle Tennessee at Liberty | ",
 "Upcoming Feb 18, 6:30 PM Women's · Middle Tennessee vs Missouri State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Middle Tennessee vs FIU | ",
 "Upcoming Feb 27, 2:00 PM Women's · Middle Tennessee at WKU | ",
 "Upcoming Mar 4, 1:00 PM Women's · Middle Tennessee at Kennesaw State | ",
 "Upcoming Mar 6, 2:00 PM Women's · Middle Tennessee at Jax State | "
]);
  const v_womenstrackandfield=parse("Cross Country","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Final Sep 5 Women's · Middle Tennessee at Memphis Twilight Classic | Women's team: 2nd / Men's team: 1st",
 "Final Sep 11 Women's · Middle Tennessee at Tennessee Invitational | Women's team: 3rd / Men's team: 1st",
 "Final Sep 25 Women's · Middle Tennessee at Sean Earl Lakefront Invitational | Women's team: 5th / Men's team: 6th",
 "Final Oct 16 Women's · Middle Tennessee at Crimson Classic | Women's team: 5th / Men's team: 4th",
 "Upcoming Oct 31 Women's · Middle Tennessee at Conference USA Championships | ",
 "Upcoming Nov 13 Women's · Middle Tennessee at NCAA South Regional | ",
 "Upcoming Nov 21 Women's · Middle Tennessee at NCAA Championships | "
]);
  const v_menstrackandfield=parse("Cross Country","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Final Sep 5 Men's · Middle Tennessee at Memphis Twilight Classic | Women's team: 2nd / Men's team: 1st",
 "Final Sep 11 Men's · Middle Tennessee at Tennessee Invitational | Women's team: 3rd / Men's team: 1st",
 "Final Sep 25 Men's · Middle Tennessee at Sean Earl Lakefront Invitational | Women's team: 5th / Men's team: 6th",
 "Final Oct 16 Men's · Middle Tennessee at Crimson Classic | Women's team: 5th / Men's team: 4th",
 "Upcoming Oct 31 Men's · Middle Tennessee at Conference USA Championships | ",
 "Upcoming Nov 13 Men's · Middle Tennessee at NCAA South Regional | ",
 "Upcoming Nov 21 Men's · Middle Tennessee at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Middle Tennessee vs Murray State | W, 38-14",
 "Final Sep 12 Middle Tennessee at Marshall | L, 26-28",
 "Final Sep 19 Middle Tennessee vs Nevada | W, 27-20",
 "Final Sep 26 Middle Tennessee at Jacksonville State | L, 13-23",
 "Final Oct 3 Middle Tennessee at Kansas | L, 0-55",
 "Final Oct 13 Middle Tennessee vs Delaware | W, 33-30",
 "Final Oct 20 Middle Tennessee at Florida International | W, 26-23",
 "Upcoming Oct 28, 6:00 PM Middle Tennessee vs Kennesaw State | ",
 "Upcoming Nov 7, 2:30 PM Middle Tennessee vs Western Kentucky | ",
 "Upcoming Nov 14, 2:30 PM Middle Tennessee at Liberty | ",
 "Upcoming Nov 21, 1:00 PM Middle Tennessee at Sam Houston | ",
 "Upcoming Nov 28, 1:00 PM Middle Tennessee vs New Mexico State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 18 Women's · Middle Tennessee at Mason Rudolph Championship | 15th of 15",
 "Final Oct 5 Women's · Middle Tennessee at Marilynn Smith Sunflower Invitational | 11th of 14",
 "Final Oct 12 Women's · Middle Tennessee at Haskins Women's Intercollegiate | 11th of 13",
 "Upcoming Oct 26 Women's · Middle Tennessee at Pat Bradley Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Middle Tennessee at JT Poston Invitational | T13th of 17",
 "Final Sep 14 Men's · Middle Tennessee at Grover Page Classic | No team score (individuals only)",
 "Final Sep 21 Men's · Middle Tennessee at Bayou City Collegiate Classic | 6th of 13",
 "Final Oct 3 Men's · Middle Tennessee at Blessings Collegiate Invitational | 7th of 9",
 "Final Oct 19 Men's · Middle Tennessee at Bank of Tennessee Intercollegiate | 5th of 13"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Middle Tennessee vs Troy | W, 2-0",
 "Final Aug 16 Middle Tennessee at Southern Indiana | W, 2-0",
 "Final Aug 20 Middle Tennessee at UT Martin | T, 0-0",
 "Final Aug 23 Middle Tennessee at West Georgia | W, 2-0",
 "Final Aug 27 Middle Tennessee vs Miami (OH) | W, 3-2",
 "Final Aug 30 Middle Tennessee vs Lipscomb | T, 0-0",
 "Final Sep 3 Middle Tennessee vs Purdue | L, 0-3",
 "Final Sep 6 Middle Tennessee at Alabama A&M | W, 5-0",
 "Final Sep 10 Middle Tennessee vs Evansville | W, 3-1",
 "Final Sep 13 Middle Tennessee at Tennessee Tech | W, 2-0",
 "Final Sep 20 Middle Tennessee at Jackson State | L, 1-4",
 "Final Sep 27 Middle Tennessee at Jax State | W, 2-0",
 "Final Oct 1 Middle Tennessee vs Liberty | L, 1-2",
 "Final Oct 4 Middle Tennessee vs Sam Houston | T, 2-2",
 "Final Oct 11 Middle Tennessee at Missouri State | T, 1-1",
 "Final Oct 18 Middle Tennessee at Delaware | L, 0-1",
 "Today Oct 22, 7:00 PM Middle Tennessee vs New Mexico State | ",
 "Upcoming Oct 25, 2:00 PM Middle Tennessee at Kennesaw State | ",
 "Upcoming Nov 1, 5:00 PM Middle Tennessee vs Western Kentucky | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Mar 12 Middle Tennessee vs Delaware | ",
 "Upcoming Mar 13 Middle Tennessee vs Delaware | ",
 "Upcoming Mar 14 Middle Tennessee vs Delaware | ",
 "Upcoming Mar 19 Middle Tennessee at New Mexico State | ",
 "Upcoming Mar 20 Middle Tennessee at New Mexico State | ",
 "Upcoming Mar 21 Middle Tennessee at New Mexico State | ",
 "Upcoming Mar 26 Middle Tennessee vs Kennesaw State | ",
 "Upcoming Mar 27 Middle Tennessee vs Kennesaw State | ",
 "Upcoming Mar 28 Middle Tennessee vs Kennesaw State | ",
 "Upcoming Apr 2 Middle Tennessee at Liberty | ",
 "Upcoming Apr 3 Middle Tennessee at Liberty | ",
 "Upcoming Apr 4 Middle Tennessee at Liberty | ",
 "Upcoming Apr 9 Middle Tennessee vs Sam Houston | ",
 "Upcoming Apr 10 Middle Tennessee vs Sam Houston | ",
 "Upcoming Apr 11 Middle Tennessee vs Sam Houston | ",
 "Upcoming Apr 16 Middle Tennessee at Florida International | ",
 "Upcoming Apr 17 Middle Tennessee at Florida International | ",
 "Upcoming Apr 18 Middle Tennessee at Florida International | ",
 "Upcoming Apr 23 Middle Tennessee vs Western Kentucky | ",
 "Upcoming Apr 24 Middle Tennessee vs Western Kentucky | ",
 "Upcoming Apr 25 Middle Tennessee vs Western Kentucky | ",
 "Upcoming Apr 30 Middle Tennessee vs Jacksonville State | ",
 "Upcoming May 1 Middle Tennessee vs Jacksonville State | ",
 "Upcoming May 2 Middle Tennessee vs Jacksonville State | ",
 "Upcoming May 6 Middle Tennessee at Missouri State | ",
 "Upcoming May 7 Middle Tennessee at Missouri State | ",
 "Upcoming May 8 Middle Tennessee at Missouri State | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Middle Tennessee at Wally Tidwell Tennis Pro-Am | Completed",
 "Final Sep 18 Women's · Middle Tennessee at Memphis Invitational | Completed",
 "Final Sep 25 Women's · Middle Tennessee at Belmont/Lipscomb Hidden Duals | Completed",
 "Final Oct 8 Women's · Middle Tennessee at ITA Regional Championships | Completed",
 "Upcoming Oct 23 Women's · Middle Tennessee at MTSU Fall Invite | ",
 "Upcoming Oct 29 Women's · Middle Tennessee at UTR PTT | ",
 "Upcoming Nov 5 Women's · Middle Tennessee at ITA Conference Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Middle Tennessee at Wally Tidwell Tennis Pro-Am | Completed",
 "Final Sep 18 Men's · Middle Tennessee at Rocky Top Invite | Completed",
 "Final Oct 2 Men's · Middle Tennessee at Black and Gold Invitational | Completed",
 "Final Oct 8 Men's · Middle Tennessee at Ohio Valley Regionals | Completed",
 "Final Oct 16 Men's · Middle Tennessee at Middle Tennessee Invite | Completed",
 "Upcoming Oct 23 Men's · Middle Tennessee at Rome Invitational | ",
 "Upcoming Oct 30 Men's · Middle Tennessee at Coach Bouldin Shootout | ",
 "Upcoming Nov 5 Men's · Middle Tennessee at ITA Conference Masters Cup | ",
 "Upcoming Nov 5 Men's · Middle Tennessee at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Middle Tennessee at NCAA Singles and Doubles Championships | "
]);
  const v_womenstrackandfield_trackfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield_trackfield.map(line),[]);
  const v_menstrackandfield_trackfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Middle Tennessee vs Boise State | W, 3-2",
 "Final Aug 29 Middle Tennessee vs Boise State | W, 3-0",
 "Final Aug 29 Middle Tennessee at UNC Asheville | L, 1-3",
 "Final Sep 4 Middle Tennessee vs Samford | W, 3-0",
 "Final Sep 5 Middle Tennessee vs South Alabama | W, 3-1",
 "Final Sep 6 Middle Tennessee at Belmont | L, 2-3",
 "Final Sep 11 Middle Tennessee vs Georgia State | L, 1-3",
 "Final Sep 11 Middle Tennessee vs Northern Colorado | W, 3-1",
 "Final Sep 12 Middle Tennessee vs Murray State | W, 3-1",
 "Final Sep 18 Middle Tennessee vs CCSU | W, 3-1",
 "Final Sep 19 Middle Tennessee vs Brown | W, 3-1",
 "Final Sep 19 Middle Tennessee at Fairfield | W, 3-1",
 "Final Sep 25 Middle Tennessee at Liberty | W, 3-2",
 "Final Sep 26 Middle Tennessee at Liberty | L, 1-3",
 "Final Oct 2 Middle Tennessee vs Delaware | W, 3-0",
 "Final Oct 3 Middle Tennessee vs Delaware | W, 3-0",
 "Final Oct 9 Middle Tennessee vs FIU | W, 3-1",
 "Final Oct 10 Middle Tennessee vs FIU | W, 3-0",
 "Final Oct 16 Middle Tennessee at WKU | L, 0-3",
 "Final Oct 17 Middle Tennessee at WKU | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Middle Tennessee vs New Mexico State | ",
 "Upcoming Oct 24, 2:00 PM Middle Tennessee vs New Mexico State | ",
 "Upcoming Oct 30, 6:00 PM Middle Tennessee at Missouri State | ",
 "Upcoming Oct 31, 1:00 PM Middle Tennessee at Missouri State | ",
 "Upcoming Nov 5, 5:00 PM Middle Tennessee vs Sam Houston | ",
 "Upcoming Nov 6, 1:00 PM Middle Tennessee vs Sam Houston | ",
 "Upcoming Nov 13, 6:00 PM Middle Tennessee at Kennesaw State | ",
 "Upcoming Nov 14, 1:00 PM Middle Tennessee at Kennesaw State | ",
 "Upcoming Nov 20 Middle Tennessee at Conference USA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenstrackandfield,"Cross Country womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Cross Country mens-track-and-field");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield_trackfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield_trackfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Middle Tennessee module checks passed");
