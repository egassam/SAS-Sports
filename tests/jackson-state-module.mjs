import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {jacksonStateSchool} from '../src/schools/jackson-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='jackson-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,jacksonStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/jackson-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gojsutigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['jackson-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',jacksonStateSchool.scheduleUrls],['roster',jacksonStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('jackson-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gojsutigers.com',`${key} must stay on gojsutigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gojsutigers.com/sports/baseball/schedule"],"roster":["https://gojsutigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gojsutigers.com/sports/mens-basketball/schedule","https://gojsutigers.com/sports/womens-basketball/schedule"],"roster":["https://gojsutigers.com/sports/mens-basketball/roster","https://gojsutigers.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://gojsutigers.com/sports/womens-bowling/schedule"],"roster":["https://gojsutigers.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://gojsutigers.com/sports/womens-cross-country/schedule","https://gojsutigers.com/sports/mens-cross-country/schedule"],"roster":["https://gojsutigers.com/sports/womens-cross-country/roster","https://gojsutigers.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gojsutigers.com/sports/football/schedule"],"roster":["https://gojsutigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gojsutigers.com/sports/womens-golf/schedule","https://gojsutigers.com/sports/mens-golf/schedule"],"roster":["https://gojsutigers.com/sports/womens-golf/roster","https://gojsutigers.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gojsutigers.com/sports/womens-soccer/schedule"],"roster":["https://gojsutigers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gojsutigers.com/sports/softball/schedule"],"roster":["https://gojsutigers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gojsutigers.com/sports/womens-tennis/schedule","https://gojsutigers.com/sports/mens-tennis/schedule"],"roster":["https://gojsutigers.com/sports/womens-tennis/roster","https://gojsutigers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gojsutigers.com/sports/womens-track-and-field/schedule","https://gojsutigers.com/sports/mens-track-and-field/schedule"],"roster":["https://gojsutigers.com/sports/womens-track-and-field/roster","https://gojsutigers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gojsutigers.com/sports/womens-volleyball/schedule"],"roster":["https://gojsutigers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'jackson-state|"+sport+"':"),`${sport} routes must live in the Jackson State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://gojsutigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.jacksonStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=jackson-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · Jackson State at Texas Tech | ",
 "Upcoming Nov 5, 6:30 PM Men's · Jackson State at Tulane | ",
 "Upcoming Nov 9, 6:30 PM Men's · Jackson State at Mississippi State | ",
 "Upcoming Nov 11, 7:00 PM Men's · Jackson State at Southern Miss | ",
 "Upcoming Nov 14, 2:30 PM Men's · Jackson State at Winthrop | ",
 "Upcoming Nov 18, 11:00 AM Men's · Jackson State at Baylor | ",
 "Upcoming Nov 25, 2:00 PM Men's · Jackson State at Oklahoma State | ",
 "Upcoming Dec 2, 11:00 AM Men's · Jackson State at Memphis | ",
 "Upcoming Dec 8, 7:00 PM Men's · Jackson State at Texas | ",
 "Upcoming Dec 15 Men's · Jackson State at Tulsa | ",
 "Upcoming Dec 17, 8:00 PM Men's · Jackson State at Oklahoma | ",
 "Upcoming Dec 20, 2:00 PM Men's · Jackson State at Saint Louis | ",
 "Upcoming Dec 22, 2:00 PM Men's · Jackson State at Louisiana Tech | ",
 "Upcoming Dec 28, 6:00 PM Men's · Jackson State at Ole Miss | ",
 "Upcoming Jan 2, 3:00 PM Men's · Jackson State at Alcorn State | ",
 "Upcoming Jan 9, 2:30 PM Men's · Jackson State vs Alabama State | ",
 "Upcoming Jan 11, 7:00 PM Men's · Jackson State vs Alabama A&M | ",
 "Upcoming Jan 16 Men's · Jackson State at Prairie View A&M | ",
 "Upcoming Jan 18 Men's · Jackson State at Texas Southern | ",
 "Upcoming Jan 23, 2:30 PM Men's · Jackson State vs Bethune-Cookman | ",
 "Upcoming Jan 25, 7:00 PM Men's · Jackson State vs Florida A&M | ",
 "Upcoming Jan 30 Men's · Jackson State at Grambling State | ",
 "Upcoming Feb 1 Men's · Jackson State at Southern | ",
 "Upcoming Feb 6, 2:30 PM Men's · Jackson State vs Mississippi Valley State | ",
 "Upcoming Feb 8, 7:00 PM Men's · Jackson State vs Arkansas-Pine Bluff | ",
 "Upcoming Feb 13, 4:00 PM Men's · Jackson State at Florida A&M | ",
 "Upcoming Feb 15 Men's · Jackson State at Bethune-Cookman | ",
 "Upcoming Feb 20, 3:00 PM Men's · Jackson State vs Alcorn State | ",
 "Upcoming Feb 25, 7:00 PM Men's · Jackson State vs Prairie View A&M | ",
 "Upcoming Feb 27, 3:00 PM Men's · Jackson State vs Texas Southern | ",
 "Upcoming Mar 2 Men's · Jackson State at Arkansas-Pine Bluff | ",
 "Upcoming Mar 4 Men's · Jackson State at Mississippi Valley State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Jackson State at Arizona State | ",
 "Upcoming Nov 4 Women's · Jackson State at Grand Canyon | ",
 "Upcoming Nov 9 Women's · Jackson State vs Mississippi University for Women | ",
 "Upcoming Nov 12 Women's · Jackson State at Southern Miss | ",
 "Upcoming Nov 17 Women's · Jackson State at Arkansas State | ",
 "Upcoming Nov 23 Women's · Jackson State at North Alabama | ",
 "Upcoming Nov 29, 4:00 PM Women's · Jackson State at Louisiana | ",
 "Upcoming Dec 11 Women's · Jackson State at Northwestern State | ",
 "Upcoming Dec 17 Women's · Jackson State at Auburn | ",
 "Upcoming Dec 19 Women's · Jackson State at UAB | ",
 "Upcoming Dec 28 Women's · Jackson State at Mississippi State | ",
 "Upcoming Jan 2 Women's · Jackson State at Alcorn State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Jackson State vs Alabama A&M | ",
 "Upcoming Jan 9, 12:00 PM Women's · Jackson State vs Alabama State | ",
 "Upcoming Jan 14 Women's · Jackson State at Texas Southern | ",
 "Upcoming Jan 16 Women's · Jackson State at Prairie View A&M | ",
 "Upcoming Jan 21, 6:00 PM Women's · Jackson State vs Florida A&M | ",
 "Upcoming Jan 23, 12:00 PM Women's · Jackson State vs Bethune-Cookman | ",
 "Upcoming Jan 28 Women's · Jackson State at Southern | ",
 "Upcoming Jan 30 Women's · Jackson State at Grambling State | ",
 "Upcoming Feb 4, 6:00 PM Women's · Jackson State vs Arkansas-Pine Bluff | ",
 "Upcoming Feb 6, 12:00 PM Women's · Jackson State vs Mississippi Valley State | ",
 "Upcoming Feb 11 Women's · Jackson State at Bethune-Cookman | ",
 "Upcoming Feb 13 Women's · Jackson State at Florida A&M | ",
 "Upcoming Feb 20, 1:00 PM Women's · Jackson State vs Alcorn State | ",
 "Upcoming Feb 25, 5:00 PM Women's · Jackson State vs Prairie View A&M | ",
 "Upcoming Feb 27, 1:00 PM Women's · Jackson State vs Texas Southern | ",
 "Upcoming Mar 2 Women's · Jackson State at Arkansas-Pine Bluff | ",
 "Upcoming Mar 4 Women's · Jackson State at Mississippi Valley State | ",
 "Upcoming Mar 8 Women's · Jackson State at SWAC Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 Jackson State vs Prairie View A&M | W, 829-733",
 "Final Oct 9 Jackson State vs Oklahoma Christian | W, 832-796",
 "Final Oct 9 Jackson State vs Sam Houston | L, 842-920",
 "Final Oct 9 Jackson State vs Louisiana Tech | L, 894-961",
 "Final Oct 9 Jackson State vs Texas Southern | W, 883-791",
 "Final Oct 10 Jackson State vs Alabama State | L, 881-948",
 "Final Oct 10 Jackson State vs Southern | L, 860-897",
 "Final Oct 10 Jackson State vs UAB | W, 893-875",
 "Final Oct 10 Jackson State at Tulane | L, 919-1007",
 "Final Oct 10 Jackson State vs North Carolina A&T State | L, 783-969",
 "Final Oct 11 Jackson State vs Emmanuel (Ga.) (Game 1) | L, 1205-1214",
 "Final Oct 11 Jackson State vs Texas Southern | W, 1203-1128",
 "Final Oct 11 Jackson State vs Emmanuel (Ga.) (Game 2) | W, 1017-1010",
 "Upcoming Nov 6 Jackson State at Bulldog Classic | ",
 "Upcoming Nov 13 Jackson State at Track Kat Klash | ",
 "Upcoming Jan 15 Jackson State at SWAC West Roundup | ",
 "Upcoming Jan 22 Jackson State at Prairie View Invitational | ",
 "Upcoming Jan 29 Jackson State at Hammer Saints Invite | ",
 "Upcoming Feb 5 Jackson State at SWAC East Roundup | ",
 "Upcoming Feb 12 Jackson State at TNBA Open | ",
 "Upcoming Mar 5 Jackson State at Music City Classic | ",
 "Upcoming Mar 19 Jackson State at SWAC Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Jackson State at MC Season Opener | Completed",
 "Final Sep 25 Women's · Jackson State at ULM Cross Country Invitational | Completed",
 "Final Oct 3 Women's · Jackson State at Nicholls XC Invitational | Completed",
 "Final Oct 16 Women's · Jackson State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27 Women's · Jackson State at SWAC Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Jackson State at MC Season Opener | Completed",
 "Final Sep 25 Men's · Jackson State at ULM Cross Country Invitational | Completed",
 "Final Oct 3 Men's · Jackson State at Nicholls XC Invitational | Completed",
 "Final Oct 16 Men's · Jackson State at Watson Cross Country Classic | Completed",
 "Upcoming Oct 27 Men's · Jackson State at SWAC Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Jackson State at Tennessee State | W, 26-24",
 "Final Sep 5 Jackson State vs Edward Waters | W, 66-14",
 "Final Sep 19 Jackson State vs Tuskegee | W, 41-7",
 "Final Sep 26 Jackson State vs Southern | W, 35-17",
 "Final Oct 3 Jackson State vs Alabama A&M | W, 31-28",
 "Final Oct 10 Jackson State at Grambling State | L, 38-45",
 "Final Oct 17 Jackson State vs Florida A&M | W, 27-17",
 "Final Oct 24 Jackson State at Bethune-Cookman | L, 21-24",
 "Upcoming Nov 7, 2:00 PM Jackson State vs Mississippi Valley State | ",
 "Upcoming Nov 14, 2:00 PM Jackson State at Alabama State | ",
 "Upcoming Nov 21, 2:00 PM Jackson State at Alcorn State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Jackson State at Tulane Classic | Completed",
 "Final Sep 21 Women's · Jackson State at Thomas W. Dortch Jr. HBCU Golf Classic | Completed",
 "Upcoming Oct 26 Women's · Jackson State at The Judson | ",
 "Upcoming Nov 2 Women's · Jackson State at Tiger Fall Classic | ",
 "Upcoming Nov 8 Women's · Jackson State at SWAC Fall Preview | ",
 "Upcoming Feb 15 Women's · Jackson State at TheeILove Intercollegiate | ",
 "Upcoming Mar 8 Women's · Jackson State at Lady Bison Invitational | ",
 "Upcoming Mar 16 Women's · Jackson State at ASU Spring Classic | ",
 "Upcoming Mar 29 Women's · Jackson State at National Women's Collegiate Golf Championship | ",
 "Upcoming Apr 5 Women's · Jackson State at Brickyard Collegiate | ",
 "Upcoming Apr 12 Women's · Jackson State at SWAC Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Jackson State at TheeILove Intercollegiate | Completed",
 "Final Sep 14 Men's · Jackson State at Magicians on the Green | Completed",
 "Final Sep 21 Men's · Jackson State at Thomas W. Dortch Jr. HBCU Golf Classic | Completed",
 "Upcoming Nov 2 Men's · Jackson State at Tiger Fall Classic | ",
 "Upcoming Nov 8 Men's · Jackson State at SWAC Fall Preview | ",
 "Upcoming Mar 16 Men's · Jackson State at ASU Spring Classic | ",
 "Upcoming Mar 23 Men's · Jackson State at AAMU Invitational | ",
 "Upcoming Apr 5 Men's · Jackson State at Robinson Invitational | ",
 "Upcoming Apr 12 Men's · Jackson State at SWAC Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Jackson State vs Mercer | L, 1-2",
 "Final Aug 15 Jackson State vs Abilene Christian | L, 1-3",
 "Final Aug 20 Jackson State at McNeese State | L, 0-2",
 "Final Aug 23 Jackson State at ULM | L, 1-5",
 "Final Sep 4 Jackson State at Arkansas | L, 0-5",
 "Final Sep 7 Jackson State vs Delta State | W, 5-1",
 "Final Sep 13 Jackson State at Stephen F. Austin | L, 2-4",
 "Final Sep 18 Jackson State vs Austin Peay | W, 3-1",
 "Final Sep 20 Jackson State vs Middle Tennessee | W, 4-1",
 "Final Sep 27 Jackson State vs Southern | W, 3-0",
 "Final Oct 8 Jackson State at Grambling State | W, 2-1",
 "Final Oct 11 Jackson State at Arkansas-Pine Bluff | W, 6-0",
 "Final Oct 18 Jackson State vs Alabama A&M | W, 5-0",
 "Final Oct 22 Jackson State vs Alcorn State | T, 2-2",
 "Upcoming Oct 25, 12:00 PM Jackson State at Prairie View A&M | ",
 "Upcoming Nov 1, 1:00 PM Jackson State at Alabama State | ",
 "Upcoming Nov 5, 3:00 PM Jackson State vs Texas Southern | ",
 "Upcoming Nov 12 Jackson State at SWAC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Jackson State at JSU Tiger Invite | Completed",
 "Final Sep 17 Women's · Jackson State at HBCU Fall Individual Championship | Completed",
 "Final Oct 19 Women's · Jackson State at SWAC Fall Individual Championship | Completed",
 "Upcoming Jan 16 Women's · Jackson State vs Houston | ",
 "Upcoming Jan 22 Women's · Jackson State at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 24, 11:00 AM Women's · Jackson State at Sam Houston | ",
 "Upcoming Jan 31, 12:00 PM Women's · Jackson State vs Xavier University of Louisiana (La.) | ",
 "Upcoming Jan 31, 4:00 PM Women's · Jackson State vs Copiah-Lincoln Community College | ",
 "Upcoming Feb 2, 11:00 AM Women's · Jackson State at Mississippi Christian | ",
 "Upcoming Feb 6, 12:00 PM Women's · Jackson State vs McNeese State | ",
 "Upcoming Feb 7, 12:00 PM Women's · Jackson State vs Southeast Missouri State | ",
 "Upcoming Feb 7, 4:00 PM Women's · Jackson State vs Southwest Mississippi Community College | ",
 "Upcoming Feb 13, 11:00 AM Women's · Jackson State at New Orleans | ",
 "Upcoming Feb 21, 3:00 PM Women's · Jackson State at Mississippi State | ",
 "Upcoming Feb 25, 2:00 PM Women's · Jackson State at Southeastern Louisiana | ",
 "Upcoming Mar 4 Women's · Jackson State vs Bethune-Cookman | ",
 "Upcoming Mar 5 Women's · Jackson State vs Alabama State | ",
 "Upcoming Mar 7 Women's · Jackson State vs Southern | ",
 "Upcoming Mar 9, 2:00 PM Women's · Jackson State at Southern Mississippi | ",
 "Upcoming Mar 20, 1:00 PM Women's · Jackson State vs Dillard (La.) | ",
 "Upcoming Mar 25, 11:00 AM Women's · Jackson State vs Florida A&M | ",
 "Upcoming Mar 26 Women's · Jackson State vs Mississippi Valley State | ",
 "Upcoming Mar 27 Women's · Jackson State vs Grambling State | ",
 "Upcoming Mar 28 Women's · Jackson State vs Alabama A&M | ",
 "Upcoming Apr 2, 11:00 AM Women's · Jackson State at Alcorn State | ",
 "Upcoming Apr 10, 10:00 AM Women's · Jackson State vs West Florida | ",
 "Upcoming Apr 16 Women's · Jackson State at SWAC Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Jackson State at JSU Tiger Invite | Completed",
 "Final Sep 17 Men's · Jackson State at HBCU Fall Individual Championship | Completed",
 "Final Oct 19 Men's · Jackson State at SWAC Fall Individual Championship | Completed",
 "Upcoming Jan 17, 4:00 PM Men's · Jackson State at Mississippi State | ",
 "Upcoming Jan 22 Men's · Jackson State at Texas A&M - Corpus Christi | ",
 "Upcoming Jan 31, 12:00 PM Men's · Jackson State vs XULA | ",
 "Upcoming Jan 31, 4:00 PM Men's · Jackson State vs Copiah-Lincoln Community College | ",
 "Upcoming Feb 2, 2:00 PM Men's · Jackson State at Mississippi Christian | ",
 "Upcoming Feb 5, 12:00 PM Men's · Jackson State vs UTRGV | ",
 "Upcoming Feb 7, 4:00 PM Men's · Jackson State vs Southwest Mississippi Community College | ",
 "Upcoming Feb 13, 11:00 AM Men's · Jackson State at New Orleans | ",
 "Upcoming Feb 16, 1:00 PM Men's · Jackson State vs TroY | ",
 "Upcoming Feb 26 Men's · Jackson State vs Incarnate Word | ",
 "Upcoming Feb 28, 3:30 PM Men's · Jackson State at Memphis | ",
 "Upcoming Mar 5 Men's · Jackson State vs Alabama State | ",
 "Upcoming Mar 7 Men's · Jackson State at Southern | ",
 "Upcoming Mar 9, 2:00 PM Men's · Jackson State at Southern Miss | ",
 "Upcoming Mar 16, 2:00 PM Men's · Jackson State vs Lamar | ",
 "Upcoming Mar 20, 1:00 PM Men's · Jackson State vs Dillard | ",
 "Upcoming Mar 26 Men's · Jackson State vs Mississippi Valley State | ",
 "Upcoming Mar 28 Men's · Jackson State vs Alabama A&M | ",
 "Upcoming Apr 2 Men's · Jackson State at Alcorn State | ",
 "Upcoming Apr 10 Men's · Jackson State vs West Florida | ",
 "Upcoming Apr 16 Men's · Jackson State at SWAC Tournament | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Jackson State vs Kansas City | L, 0-3",
 "Final Aug 28 Jackson State at Austin Peay | W, 3-2",
 "Final Aug 29 Jackson State vs UT-Martin | W, 3-1",
 "Final Sep 4 Jackson State at North Alabama Tournament | L, 0-3",
 "Final Sep 4 Jackson State vs UT Martin | W, 3-0",
 "Final Sep 5 Jackson State vs Chattanooga | L, 2-3",
 "Final Sep 8 Jackson State at Northwestern State | L, 1-3",
 "Final Sep 11 Jackson State vs Houston Christian | W, 3-2",
 "Final Sep 12 Jackson State vs Lamar | L, 0-3",
 "Final Sep 12 Jackson State at Southern Miss Invitational | L, 0-3",
 "Final Sep 18 Jackson State vs UT Arlington | L, 0-3",
 "Final Sep 18 Jackson State vs Mississippi State | L, 0-3",
 "Final Sep 19 Jackson State at Louisiana | L, 1-3",
 "Final Sep 25 Jackson State vs Prairie View A&M | W, 3-2",
 "Final Sep 27 Jackson State vs Texas Southern | W, 3-1",
 "Final Sep 30 Jackson State at Mississippi Valley State | W, 3-0",
 "Final Oct 2 Jackson State vs Bethune-Cookman | L, 1-3",
 "Final Oct 4 Jackson State vs Florida A&M | L, 1-3",
 "Final Oct 9 Jackson State at Alcorn State | W, 3-2",
 "Final Oct 11 Jackson State at Southern | W, 3-1",
 "Final Oct 16 Jackson State at Alabama A&M | L, 0-3",
 "Final Oct 18 Jackson State at Alabama State | L, 1-3",
 "Upcoming Oct 30, 6:00 PM Jackson State vs Grambling State | ",
 "Upcoming Nov 1, 12:00 PM Jackson State vs Arkansas-Pine Bluff | ",
 "Upcoming Nov 4, 6:00 PM Jackson State vs Mississippi Valley State | ",
 "Upcoming Nov 6, 6:00 PM Jackson State vs Alabama A&M | ",
 "Upcoming Nov 8, 12:00 PM Jackson State vs Alabama State | ",
 "Upcoming Nov 13, 6:00 PM Jackson State at Bethune-Cookman | ",
 "Upcoming Nov 15, 12:00 PM Jackson State at Florida A&M | ",
 "Upcoming Nov 20 Jackson State at SWAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Jackson State module checks passed");
