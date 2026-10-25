import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {alabamaStateSchool} from '../src/schools/alabama-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='alabama-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,alabamaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/alabama-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bamastatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['alabama-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',alabamaStateSchool.scheduleUrls],['roster',alabamaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('alabama-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bamastatesports.com',`${key} must stay on bamastatesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bamastatesports.com/sports/baseball/schedule"],"roster":["https://bamastatesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bamastatesports.com/sports/mens-basketball/schedule","https://bamastatesports.com/sports/womens-basketball/schedule"],"roster":["https://bamastatesports.com/sports/mens-basketball/roster","https://bamastatesports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://bamastatesports.com/sports/womens-bowling/schedule"],"roster":["https://bamastatesports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://bamastatesports.com/sports/womens-cross-country/schedule","https://bamastatesports.com/sports/mens-cross-country/schedule"],"roster":["https://bamastatesports.com/sports/womens-cross-country/roster","https://bamastatesports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://bamastatesports.com/sports/football/schedule"],"roster":["https://bamastatesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bamastatesports.com/sports/womens-golf/schedule","https://bamastatesports.com/sports/mens-golf/schedule"],"roster":["https://bamastatesports.com/sports/womens-golf/roster","https://bamastatesports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://bamastatesports.com/sports/womens-soccer/schedule"],"roster":["https://bamastatesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://bamastatesports.com/sports/softball/schedule"],"roster":["https://bamastatesports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://bamastatesports.com/sports/womens-tennis/schedule","https://bamastatesports.com/sports/mens-tennis/schedule"],"roster":["https://bamastatesports.com/sports/womens-tennis/roster","https://bamastatesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://bamastatesports.com/sports/mens-track-and-field/schedule","https://bamastatesports.com/sports/womens-track-and-field/schedule"],"roster":["https://bamastatesports.com/sports/mens-track-and-field/roster","https://bamastatesports.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://bamastatesports.com/sports/womens-volleyball/schedule"],"roster":["https://bamastatesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'alabama-state|"+sport+"':"),`${sport} routes must live in the Alabama State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://bamastatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.alabamaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=alabama-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3 Men's · Alabama State at Texas A&M | ",
 "Upcoming Nov 9, 6:00 PM Men's · Alabama State vs Georgia Gwinnett College | ",
 "Upcoming Nov 11, 6:00 PM Men's · Alabama State vs Oklahoma Panhandle State | ",
 "Upcoming Nov 15 Men's · Alabama State at San Jose State | ",
 "Upcoming Nov 17, 8:00 PM Men's · Alabama State at UC Davis | ",
 "Upcoming Nov 20 Men's · Alabama State at Fresno State | ",
 "Upcoming Nov 23, 9:00 PM Men's · Alabama State at Cal | ",
 "Upcoming Nov 29, 4:00 PM Men's · Alabama State vs Arkansas -Monticello | ",
 "Upcoming Dec 7, 8:00 PM Men's · Alabama State at Oklahoma | ",
 "Upcoming Dec 8, 7:00 PM Men's · Alabama State at TCU | ",
 "Upcoming Dec 13 Men's · Alabama State at Auburn | ",
 "Upcoming Dec 16, 6:00 PM Men's · Alabama State at West Florida | ",
 "Upcoming Dec 18, 7:30 PM Men's · Alabama State at Air Force | ",
 "Upcoming Dec 23, 12:00 AM Men's · Alabama State at Hawaii | ",
 "Upcoming Dec 30, 6:00 PM Men's · Alabama State vs Talladega College | ",
 "Upcoming Jan 2, 3:00 PM Men's · Alabama State vs Mississippi Valley State | ",
 "Upcoming Jan 4, 7:00 PM Men's · Alabama State vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 9 Men's · Alabama State at Jackson State | ",
 "Upcoming Jan 11 Men's · Alabama State at Alcorn State | ",
 "Upcoming Jan 16 Men's · Alabama State at Alabama A&M | ",
 "Upcoming Jan 23, 3:00 PM Men's · Alabama State vs Prairie View A&M | ",
 "Upcoming Jan 25, 6:30 PM Men's · Alabama State vs Texas Southern | ",
 "Upcoming Jan 30 Men's · Alabama State at Bethune-Cookman | ",
 "Upcoming Feb 1 Men's · Alabama State at Florida A&M | ",
 "Upcoming Feb 6, 3:00 PM Men's · Alabama State vs Grambling State | ",
 "Upcoming Feb 8, 6:00 PM Men's · Alabama State vs Southern | ",
 "Upcoming Feb 13 Men's · Alabama State at Arkansas - Pine Bluff | ",
 "Upcoming Feb 15 Men's · Alabama State at Mississippi Valley State | ",
 "Upcoming Feb 18, 7:00 PM Men's · Alabama State vs Bethune-Cookman | ",
 "Upcoming Feb 20, 3:00 PM Men's · Alabama State vs Florida A&M | ",
 "Upcoming Feb 27, 3:00 PM Men's · Alabama State vs Alabama A&M | ",
 "Upcoming Mar 2 Men's · Alabama State at Southern | ",
 "Upcoming Mar 4 Men's · Alabama State at Grambling State | ",
 "Upcoming Mar 8 Men's · Alabama State at SWAC Championship Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Alabama State at Auburn | ",
 "Upcoming Nov 7, 1:00 PM Women's · Alabama State at West Georgia | ",
 "Upcoming Nov 10, 5:00 PM Women's · Alabama State vs Talladega | ",
 "Upcoming Nov 14 Women's · Alabama State at UTEP | ",
 "Upcoming Nov 17, 11:00 AM Women's · Alabama State at Mississippi State | ",
 "Upcoming Nov 24, 6:30 PM Women's · Alabama State at Northwestern State | ",
 "Upcoming Nov 30, 5:00 PM Women's · Alabama State vs Auburn-Montgomery | ",
 "Upcoming Dec 5 Women's · Alabama State at Troy | ",
 "Upcoming Dec 14, 6:00 PM Women's · Alabama State at Southeastern Louisiana | ",
 "Upcoming Dec 17 Women's · Alabama State at South Carolina State | ",
 "Upcoming Dec 21, 2:00 PM Women's · Alabama State at Georgia | ",
 "Upcoming Dec 29, 12:00 PM Women's · Alabama State vs Rust (Miss.) | ",
 "Upcoming Jan 2, 1:00 PM Women's · Alabama State vs Mississippi Valley State | ",
 "Upcoming Jan 4, 5:00 PM Women's · Alabama State vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 7 Women's · Alabama State at Alcorn State | ",
 "Upcoming Jan 9 Women's · Alabama State at Jackson State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Alabama State at Alabama A&M | ",
 "Upcoming Jan 21, 6:00 PM Women's · Alabama State vs Texas Southern | ",
 "Upcoming Jan 23, 1:00 PM Women's · Alabama State vs Prairie View A&M | ",
 "Upcoming Jan 28 Women's · Alabama State at Florida A&M | ",
 "Upcoming Jan 30 Women's · Alabama State at Bethune-Cookman | ",
 "Upcoming Feb 4, 6:00 PM Women's · Alabama State vs Southern | ",
 "Upcoming Feb 6, 1:00 PM Women's · Alabama State vs Grambling State | ",
 "Upcoming Feb 11 Women's · Alabama State at Mississippi Valley State | ",
 "Upcoming Feb 13 Women's · Alabama State at Arkansas - Pine Bluff | ",
 "Upcoming Feb 18, 5:00 PM Women's · Alabama State vs Bethune-Cookman | ",
 "Upcoming Feb 20, 1:00 PM Women's · Alabama State vs Florida A&M | ",
 "Upcoming Feb 27, 1:00 PM Women's · Alabama State vs Alabama A&M | ",
 "Upcoming Mar 2 Women's · Alabama State at Southern | ",
 "Upcoming Mar 4 Women's · Alabama State at Grambling State | ",
 "Upcoming Mar 8 Women's · Alabama State at SWAC Championship Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 Alabama State at Tulane Colonial Invite | 5th of 14",
 "Final Oct 9 Alabama State vs Sam Houston | L, 928-1122",
 "Final Oct 9 Alabama State vs Louisiana Tech | L, 914-922",
 "Final Oct 9 Alabama State vs Texas Southern | W, 1001-803",
 "Final Oct 9 Alabama State vs Southern | W, 1024-775",
 "Final Oct 9 Alabama State vs Tulane | L, 865-910",
 "Final Oct 10 Alabama State vs Jackson State | W, 948-881",
 "Final Oct 10 Alabama State vs Prairie View A&M | W, 988-857",
 "Final Oct 10 Alabama State vs Oklahoma Christian | W, 1141-791",
 "Final Oct 10 Alabama State vs North Carolina A&T | L, 904-1050",
 "Final Oct 10 Alabama State vs Florida A&M | W, 987-865",
 "Final Oct 11 Alabama State vs Tulane | L, 3-4",
 "Final Oct 11 Alabama State vs Sam Houston | L, 0-4",
 "Final Oct 11 Alabama State vs UAB | W, 4-3",
 "Upcoming Oct 30 Alabama State at Destination Orlando | ",
 "Upcoming Nov 6 Alabama State at Bulldog Classic | ",
 "Upcoming Nov 13 Alabama State at TRACK Kat Klash | ",
 "Upcoming Jan 15 Alabama State at SWAC West Round-Up | ",
 "Upcoming Jan 23 Alabama State at Hornet Classic | ",
 "Upcoming Feb 5 Alabama State at SWAC East Round-Up | ",
 "Upcoming Feb 12 Alabama State at TNBA Open | ",
 "Upcoming Feb 26 Alabama State at Stallings Invite | ",
 "Upcoming Mar 6 Alabama State at Music City Classic | ",
 "Upcoming Mar 19 Alabama State at Southwestern Athletic Conference Championship Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Alabama State at Foothills Invitational | Completed",
 "Final Sep 18 Women's · Alabama State at Montevallo Invitational | Completed",
 "Final Sep 25 Women's · Alabama State at Azalea City Classic | Completed",
 "Final Oct 9 Women's · Alabama State at Florida State Invitational | Completed",
 "Upcoming Oct 27 Women's · Alabama State at Southwestern Athletic Conference Championship | ",
 "Upcoming Nov 13 Women's · Alabama State at NCAA South Regional | ",
 "Upcoming Nov 22 Women's · Alabama State at NCAA National Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Alabama State at Foothills Invitational | Completed",
 "Final Sep 18 Men's · Alabama State at Montevallo Invitational | Completed",
 "Final Sep 25 Men's · Alabama State at Azalea City Classic | Completed",
 "Final Oct 9 Men's · Alabama State at Florida State Invitational | Completed",
 "Upcoming Oct 27 Men's · Alabama State at Southwestern Athletic Conference Championship | ",
 "Upcoming Nov 13 Men's · Alabama State at NCAA South Regional | ",
 "Upcoming Nov 22 Men's · Alabama State at NCAA National Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Alabama State vs Southern | W, 30-17",
 "Final Sep 5 Alabama State vs Lane College | W, 34-0",
 "Final Sep 12 Alabama State at Troy | L, 17-34",
 "Final Sep 26 Alabama State vs Mississippi Valley State | W, 41-15",
 "Final Oct 3 Alabama State at Bethune-Cookman | L, 10-16",
 "Final Oct 9 Alabama State vs Florida A&M | L, 27-28",
 "Final Oct 17 Alabama State at Arkansas - Pine Bluff | W, 21-15",
 "Upcoming Oct 31, 2:30 PM Alabama State vs Alabama A&M | ",
 "Upcoming Nov 7, 2:00 PM Alabama State at Texas Southern | ",
 "Upcoming Nov 14, 2:00 PM Alabama State vs Jackson State | ",
 "Upcoming Nov 21, 2:00 PM Alabama State vs Prairie View A&M | ",
 "Upcoming Nov 26, 2:00 PM Alabama State vs Tuskegee | ",
 "Upcoming Dec 5 Alabama State at Southwestern Athletic Conference | ",
 "Upcoming Dec 12 Alabama State at Cricket Celebration Bowl | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Alabama State at The Velvet | Completed",
 "Final Sep 28 Women's · Alabama State at NKU Fall Invitational | Completed",
 "Final Oct 12 Women's · Alabama State at Motor City Matchup | Match play: 0-1",
 "Upcoming Oct 26 Women's · Alabama State at The Judson | ",
 "Upcoming Nov 9 Women's · Alabama State at SWAC Fall Invitational | ",
 "Upcoming Feb 22 Women's · Alabama State at ARCIS HBCU Golf Championship | ",
 "Upcoming Mar 8 Women's · Alabama State at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 15 Women's · Alabama State at ASU Spring Classic | ",
 "Upcoming Mar 22 Women's · Alabama State at Lamar Cardinal Challenge | ",
 "Upcoming Mar 29 Women's · Alabama State at WIGF National Women's Collegiate Golf Championship | ",
 "Upcoming Apr 12 Women's · Alabama State at SWAC Championship Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 30 Men's · Alabama State at Augusta University Fall Jaguar Invitational | Completed",
 "Final Sep 21 Men's · Alabama State at Thomas W. Dortch Jr. HBCU Collegiate Golf Classic | Completed",
 "Final Oct 12 Men's · Alabama State at Motor City Matchup | Match play: 0-1",
 "Upcoming Nov 9 Men's · Alabama State at SWAC Fall Invitational | ",
 "Upcoming Feb 12 Men's · Alabama State at Palmas del Mar Collegiate | ",
 "Upcoming Feb 22 Men's · Alabama State at ARCIS HBCU Golf Championship | ",
 "Upcoming Mar 15 Men's · Alabama State at ASU Spring Invitational | ",
 "Upcoming Mar 23 Men's · Alabama State at Alabama A&M Bulldog Invitational presented by The Underground | ",
 "Upcoming Apr 5 Men's · Alabama State at TSU Big Blue Intercollegiate | ",
 "Upcoming Apr 13 Men's · Alabama State at SWAC Championship Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 9 Alabama State vs Southern Union (Exhibition) | W, 3-0",
 "Final Aug 10 Alabama State vs Mobile (Ala.) (Exhibition) | T, 1-1",
 "Final Aug 13 Alabama State vs Southern Miss | L, 0-4",
 "Final Aug 16 Alabama State vs Presbyterian | L, 1-3",
 "Final Aug 20 Alabama State at South Alabama | L, 0-4",
 "Final Aug 23 Alabama State vs Kennesaw State | L, 0-5",
 "Final Aug 27 Alabama State at Central Arkansas | L, 0-7",
 "Final Aug 30 Alabama State at Arkansas State | T, 2-2",
 "Final Sep 6 Alabama State at Mercer | L, 0-5",
 "Final Sep 13 Alabama State at Jacksonville State | L, 0-1",
 "Final Sep 27 Alabama State vs Alcorn State | T, 0-0",
 "Final Oct 4 Alabama State at Alabama A&M | L, 0-1",
 "Final Oct 8 Alabama State at Prairie View A&M | W, 1-0",
 "Final Oct 12 Alabama State vs Grambling State | L, 0-2",
 "Final Oct 18 Alabama State at Texas Southern | L, 1-3",
 "Final Oct 22 Alabama State vs Arkansas - Pine Bluff | W, 12-0",
 "Upcoming Oct 25, 1:00 PM Alabama State at Southern | ",
 "Upcoming Nov 1, 1:00 PM Alabama State vs Jackson State | ",
 "Upcoming Nov 12 Alabama State at Southwestern Athletic Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Feb 12 Alabama State at Stinger Classic | ",
 "Upcoming Feb 19 Alabama State at Jacksonville State Tournament | ",
 "Upcoming Feb 24 Alabama State vs West Georgia | ",
 "Upcoming Feb 26 Alabama State at HBCU Softball Classic | ",
 "Upcoming Mar 3 Alabama State at Troy | ",
 "Upcoming Mar 6 Alabama State at Mississippi State | ",
 "Upcoming Mar 12 Alabama State vs Jackson State | ",
 "Upcoming Mar 16 Alabama State vs Georgia State | ",
 "Upcoming Mar 19 Alabama State at Alabama A&M | ",
 "Upcoming Mar 26 Alabama State at Bethune-Cookman | ",
 "Upcoming Apr 2 Alabama State vs Mississippi Valley State | ",
 "Upcoming Apr 9 Alabama State at Florida A&M | ",
 "Upcoming Apr 16 Alabama State vs Bethune-Cookman | ",
 "Upcoming Apr 20 Alabama State at North Alabama | ",
 "Upcoming Apr 23 Alabama State vs Alabama A&M | ",
 "Upcoming Apr 27 Alabama State at West Georgia | ",
 "Upcoming Apr 30 Alabama State at Jackson State | ",
 "Upcoming May 11 Alabama State at Southwestern Athletic Conference Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 16 Women's · Alabama State at HBCU National Tournament | Completed",
 "Final Sep 25 Women's · Alabama State at Columbus State Invitational | Completed",
 "Final Oct 2 Women's · Alabama State at SWAC Masters | Completed",
 "Today Oct 23 Women's · Alabama State at Alabama State Hidden Dual | ",
 "Upcoming Dec 4 Women's · Alabama State at ITA Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 16 Men's · Alabama State at HBCU National Tournament | Completed",
 "Final Oct 2 Men's · Alabama State at Blue-Gray Tournament | Completed",
 "Final Oct 2 Men's · Alabama State at SWAC Masters | Completed",
 "Final Oct 7 Men's · Alabama State at ITA Fall Regionals | Completed",
 "Today Oct 23 Men's · Alabama State at Alabama State Hidden Dual | ",
 "Upcoming Dec 4 Men's · Alabama State at ITA Masters | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 Alabama State vs UAB (Exhibition) | L, 0-3",
 "Final Aug 28 Alabama State vs North Alabama | L, 0-3",
 "Final Aug 29 Alabama State vs Mercer | L, 2-3",
 "Final Aug 30 Alabama State vs Troy | L, 0-3",
 "Final Sep 3 Alabama State vs UNC Wilmington | L, 1-3",
 "Final Sep 4 Alabama State vs West Florida | L, 0-3",
 "Final Sep 4 Alabama State vs USC Upstate | L, 0-3",
 "Final Sep 5 Alabama State at Gardner-Webb | L, 0-3",
 "Final Sep 11 Alabama State vs South Carolina State | W, 3-1",
 "Final Sep 11 Alabama State vs Miami (OH) | L, 0-3",
 "Final Sep 12 Alabama State vs Nicholls State | W, 3-1",
 "Final Sep 18 Alabama State vs Florida Atlantic | L, 0-3",
 "Final Sep 19 Alabama State vs Stetson | L, 2-3",
 "Final Sep 19 Alabama State vs Florida Atlantic | L, 0-3",
 "Final Sep 25 Alabama State at Florida A&M | L, 1-3",
 "Final Sep 27 Alabama State at Bethune-Cookman | L, 1-3",
 "Final Oct 2 Alabama State at Alabama A&M | L, 0-3",
 "Final Oct 9 Alabama State at Texas Southern | L, 1-3",
 "Final Oct 11 Alabama State at Prairie View A&M | L, 2-3",
 "Final Oct 15 Alabama State vs Mississippi Valley State | W, 3-0",
 "Final Oct 18 Alabama State vs Jackson State | W, 3-1",
 "Final Oct 21 Alabama State vs Alabama A&M | W, 3-1",
 "Final Oct 23 Alabama State at Arkansas - Pine Bluff | W, 3-1",
 "Upcoming Oct 25, 12:00 PM Alabama State at Grambling State | ",
 "Upcoming Oct 30, 6:00 PM Alabama State vs Florida A&M | ",
 "Upcoming Nov 1, 12:00 PM Alabama State vs Bethune-Cookman | ",
 "Upcoming Nov 6, 6:00 PM Alabama State at Mississippi Valley State | ",
 "Upcoming Nov 8, 12:00 PM Alabama State at Jackson State | ",
 "Upcoming Nov 13, 6:00 PM Alabama State vs Alcorn State | ",
 "Upcoming Nov 15, 12:00 PM Alabama State vs Southern | ",
 "Upcoming Nov 20 Alabama State at Southwestern Athletic Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Alabama State module checks passed");
