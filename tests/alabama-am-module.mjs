import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {alabamaAmSchool} from '../src/schools/alabama-am.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='alabama-am');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,alabamaAmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/alabama-am-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit aamusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['alabama-am'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',alabamaAmSchool.scheduleUrls],['roster',alabamaAmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('alabama-am|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'aamusports.com',`${key} must stay on aamusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://aamusports.com/sports/baseball/schedule"],"roster":["https://aamusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://aamusports.com/sports/mens-basketball/schedule","https://aamusports.com/sports/womens-basketball/schedule"],"roster":["https://aamusports.com/sports/mens-basketball/roster","https://aamusports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://aamusports.com/sports/bowl/schedule"],"roster":["https://aamusports.com/sports/bowl/roster"],"combined":false},"Cross Country":{"schedule":["https://aamusports.com/sports/womens-cross-country/schedule","https://aamusports.com/sports/mens-cross-country/schedule"],"roster":["https://aamusports.com/sports/womens-cross-country/roster","https://aamusports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://aamusports.com/sports/football/schedule"],"roster":["https://aamusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://aamusports.com/sports/mens-golf/schedule"],"roster":["https://aamusports.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://aamusports.com/sports/womens-soccer/schedule"],"roster":["https://aamusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://aamusports.com/sports/softball/schedule"],"roster":["https://aamusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://aamusports.com/sports/womens-tennis/schedule","https://aamusports.com/sports/mens-tennis/schedule"],"roster":["https://aamusports.com/sports/womens-tennis/roster","https://aamusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://aamusports.com/sports/mens-track-and-field/schedule"],"roster":["https://aamusports.com/sports/mens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://aamusports.com/sports/womens-volleyball/schedule"],"roster":["https://aamusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'alabama-am|"+sport+"':"),`${sport} routes must live in the Alabama A&M module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://aamusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.alabamaAmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=alabama-am)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 27, 2:30 PM Alabama A&M vs Lawson State CC | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · Alabama A&M vs Samford (Exhibition) | L, 61-71",
 "Today Oct 24, 3:30 PM Men's · Alabama A&M at Detroit Mercy (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Alabama A&M vs Oakwood | ",
 "Upcoming Nov 6, 7:00 PM Men's · Alabama A&M vs Mississippi University for Women | ",
 "Upcoming Nov 9, 8:00 PM Men's · Alabama A&M at DePaul | ",
 "Upcoming Nov 12, 7:00 PM Men's · Alabama A&M vs West Florida | ",
 "Upcoming Nov 15, 2:00 PM Men's · Alabama A&M vs Cleveland State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Alabama A&M vs Lipscomb | ",
 "Upcoming Nov 24, 7:00 PM Men's · Alabama A&M at North Alabama | ",
 "Upcoming Dec 1, 7:00 PM Men's · Alabama A&M at Chattanooga | ",
 "Upcoming Dec 7, 6:00 PM Men's · Alabama A&M at Mississippi State | ",
 "Upcoming Dec 13, 1:00 PM Men's · Alabama A&M at Georgia | ",
 "Upcoming Dec 15, 7:00 PM Men's · Alabama A&M vs LeMoyne-Owen | ",
 "Upcoming Dec 19, 3:30 PM Men's · Alabama A&M at Tennessee State | ",
 "Upcoming Dec 22, 12:00 PM Men's · Alabama A&M at NC State | ",
 "Upcoming Dec 30, 7:00 PM Men's · Alabama A&M vs William Carey | ",
 "Upcoming Jan 2, 4:00 PM Men's · Alabama A&M vs Arkansas-Pine Bluff | ",
 "Upcoming Jan 4, 7:30 PM Men's · Alabama A&M vs Mississippi Valley State | ",
 "Upcoming Jan 9, 3:00 PM Men's · Alabama A&M at Alcorn State | ",
 "Upcoming Jan 11, 7:00 PM Men's · Alabama A&M at Jackson State | ",
 "Upcoming Jan 16, 4:00 PM Men's · Alabama A&M vs Alabama State | ",
 "Upcoming Jan 23, 4:00 PM Men's · Alabama A&M vs Texas Southern | ",
 "Upcoming Jan 25, 7:00 PM Men's · Alabama A&M vs Prairie View A&M | ",
 "Upcoming Jan 30 Men's · Alabama A&M at Florida A&M | ",
 "Upcoming Feb 1 Men's · Alabama A&M at Bethune-Cookman | ",
 "Upcoming Feb 6, 4:00 PM Men's · Alabama A&M vs Southern | ",
 "Upcoming Feb 8, 7:00 PM Men's · Alabama A&M vs Grambling State | ",
 "Upcoming Feb 13, 3:00 PM Men's · Alabama A&M at Mississippi Valley State | ",
 "Upcoming Feb 15 Men's · Alabama A&M at Arkansas-Pine Bluff | ",
 "Upcoming Feb 18, 7:30 PM Men's · Alabama A&M vs Florida A&M | ",
 "Upcoming Feb 20, 4:00 PM Men's · Alabama A&M vs Bethune-Cookman | ",
 "Upcoming Feb 27, 2:30 PM Men's · Alabama A&M at Alabama State | ",
 "Upcoming Mar 2 Men's · Alabama A&M at Grambling State | ",
 "Upcoming Mar 4, 7:00 PM Men's · Alabama A&M at Southern | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 22 Women's · Alabama A&M vs Rust College (Exhibition) | W, 100-48",
 "Upcoming Nov 2, 5:30 PM Women's · Alabama A&M vs Talladega | ",
 "Upcoming Nov 5, 6:00 PM Women's · Alabama A&M at Alabama | ",
 "Upcoming Nov 9, 11:00 AM Women's · Alabama A&M vs Miles | ",
 "Upcoming Nov 13, 6:30 PM Women's · Alabama A&M vs Loyola-Marymount | ",
 "Upcoming Nov 15, 5:00 PM Women's · Alabama A&M vs Saint Mary's | ",
 "Upcoming Nov 19, 6:00 PM Women's · Alabama A&M vs UAB | ",
 "Upcoming Nov 22, 2:00 PM Women's · Alabama A&M at Ole Miss | ",
 "Upcoming Nov 28, 11:00 AM Women's · Alabama A&M vs North Carolina Central | ",
 "Upcoming Nov 29, 1:30 PM Women's · Alabama A&M vs South Carolina/Tennessee State | ",
 "Upcoming Dec 3, 6:00 PM Women's · Alabama A&M vs Tuskegee | ",
 "Upcoming Dec 15, 6:00 PM Women's · Alabama A&M at Tennessee | ",
 "Upcoming Dec 22, 11:00 AM Women's · Alabama A&M at Marquette | ",
 "Upcoming Dec 29, 6:00 PM Women's · Alabama A&M vs Allen | ",
 "Upcoming Jan 2, 2:00 PM Women's · Alabama A&M vs Arkansas-Pine Bluff | ",
 "Upcoming Jan 4, 5:30 PM Women's · Alabama A&M vs Mississippi Valley State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Alabama A&M at Jackson State | ",
 "Upcoming Jan 9, 1:00 PM Women's · Alabama A&M at Alcorn State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Alabama A&M vs Alabama State | ",
 "Upcoming Jan 21, 6:00 PM Women's · Alabama A&M vs Prairie View A&M | ",
 "Upcoming Jan 23, 2:00 PM Women's · Alabama A&M vs Texas Southern | ",
 "Upcoming Jan 28, 6:00 PM Women's · Alabama A&M at Bethune-Cookman | ",
 "Upcoming Jan 30 Women's · Alabama A&M at Florida A&M | ",
 "Upcoming Feb 4, 6:00 PM Women's · Alabama A&M vs Grambling State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Alabama A&M vs Southern | ",
 "Upcoming Feb 11 Women's · Alabama A&M at Arkansas-Pine Bluff | ",
 "Upcoming Feb 13, 1:00 PM Women's · Alabama A&M at Mississippi Valley State | ",
 "Upcoming Feb 18, 5:30 PM Women's · Alabama A&M vs Florida A&M | ",
 "Upcoming Feb 20, 2:00 PM Women's · Alabama A&M vs Bethune-Cookman | ",
 "Upcoming Feb 27, 12:00 PM Women's · Alabama A&M at Alabama State | ",
 "Upcoming Mar 2 Women's · Alabama A&M at Grambling State | ",
 "Upcoming Mar 4, 5:00 PM Women's · Alabama A&M at Southern | "
]);
  const v_bowl=parse("Bowling","bowl");
  assert.deepEqual(v_bowl.map(line),[
 "Final Oct 9 Alabama A&M at Colonial Classic | 9th of 14",
 "Today Oct 23 Alabama A&M at Warhawk Classic | ",
 "Upcoming Oct 30 Alabama A&M at Destination Orlando Invitational | ",
 "Upcoming Nov 6 Alabama A&M at Bulldog Classic | ",
 "Upcoming Nov 13 Alabama A&M at Bearcat Invitational | ",
 "Upcoming Jan 15 Alabama A&M at SWAC West Regional | ",
 "Upcoming Jan 22 Alabama A&M at PVAMU Invitational | ",
 "Upcoming Feb 5 Alabama A&M at SWAC East Regional | ",
 "Upcoming Feb 12 Alabama A&M at TNBA Open | ",
 "Upcoming Feb 26 Alabama A&M at Stallings Invitational | ",
 "Upcoming Mar 5 Alabama A&M at Music City Classic | ",
 "Upcoming Mar 19 Alabama A&M at SWAC Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · Alabama A&M at Vanderbilt Opener | 4th of 5",
 "Final Sep 11 Women's · Alabama A&M at Legacy Series Invite | 1st of 6",
 "Final Sep 18 Women's · Alabama A&M at Southern Showcase | 1st of 26",
 "Final Oct 3 Women's · Alabama A&M at Louisville Classic | 1st of 25",
 "Upcoming Oct 27, 8:00 AM Women's · Alabama A&M at SWAC Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · Alabama A&M at Vanderbilt Opener | 5th of 5",
 "Final Sep 11 Men's · Alabama A&M at Legacy Series Invite | 2nd of 5",
 "Final Sep 18 Men's · Alabama A&M at Southern Showcase | No Team Score",
 "Final Oct 3 Men's · Alabama A&M at Louisville Classic | No Team Score",
 "Upcoming Oct 27, 7:00 AM Men's · Alabama A&M at SWAC Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Alabama A&M vs Howard | L, 24-31",
 "Final Sep 5 Alabama A&M vs Miles College | W, 38-23",
 "Final Sep 12 Alabama A&M vs Tennessee State | W, 30-3",
 "Final Sep 19 Alabama A&M vs Bowie State | W, 45-3",
 "Final Sep 26 Alabama A&M at Florida A&M | W, 40-21",
 "Final Oct 3 Alabama A&M vs Jackson State | L, 28-31",
 "Final Oct 10 Alabama A&M vs Bethune-Cookman | W, 55-17",
 "Final Oct 17 Alabama A&M vs Grambling State | W, 61-31",
 "Upcoming Oct 31, 2:30 PM Alabama A&M vs Alabama State | ",
 "Upcoming Nov 7, 2:00 PM Alabama A&M at Prairie View A&M | ",
 "Upcoming Nov 14, 2:00 PM Alabama A&M vs Texas Southern | ",
 "Upcoming Nov 21, 2:00 PM Alabama A&M at Mississippi Valley State | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Alabama A&M at Jaguar Invitational | 8th of 10",
 "Final Oct 12 Alabama A&M at The Scrappy at Pinetree | 11th of 11",
 "Final Oct 19 Alabama A&M at Blue Hen Intercollegiate | 10th of 14",
 "Upcoming Nov 2 Alabama A&M at TSU Tiger Fall Classic | ",
 "Upcoming Feb 20 Alabama A&M at HBCU Championship | ",
 "Upcoming Mar 15 Alabama A&M at ASU Spring Classic | ",
 "Upcoming Mar 23 Alabama A&M at Bulldog Classic Sponsored by The Underground | ",
 "Upcoming Apr 5 Alabama A&M at NCCU Tournament | ",
 "Upcoming Apr 12 Alabama A&M at SWAC Golf Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Alabama A&M vs SIUE | L, 1-2",
 "Final Aug 27 Alabama A&M at Chicago State | W, 2-1",
 "Final Aug 30 Alabama A&M at Southern Illinois | L, 0-8",
 "Final Sep 3 Alabama A&M vs North Florida | T, 1-1",
 "Final Sep 6 Alabama A&M vs Middle Tennessee | L, 0-5",
 "Final Sep 10 Alabama A&M at East Texas A&M | T, 1-1",
 "Final Sep 17 Alabama A&M vs Morehead State | L, 0-1",
 "Final Sep 20 Alabama A&M vs South Carolina State | W, 3-0",
 "Final Sep 27 Alabama A&M at Grambling State | T, 0-0",
 "Final Oct 4 Alabama A&M vs Alabama State | W, 1-0",
 "Final Oct 11 Alabama A&M vs Texas Southern | W, 1-0",
 "Final Oct 18 Alabama A&M at Jackson State | L, 0-5",
 "Final Oct 22 Alabama A&M vs Prairie View A&M | W, 3-1",
 "Upcoming Oct 25, 1:00 PM Alabama A&M at Arkansas-Pine Bluff | ",
 "Upcoming Nov 1, 1:00 PM Alabama A&M vs Southern | ",
 "Upcoming Nov 5, 6:00 PM Alabama A&M at Alcorn State | ",
 "Upcoming Nov 11 Alabama A&M at SWAC Women's Soccer Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 17 Women's · Alabama A&M at HBCU Nationals | No Team Score",
 "Final Sep 25 Women's · Alabama A&M at Austin Peay Invitational | No Team Score",
 "Final Oct 5 Women's · Alabama A&M at SWAC Tournament | No Team Score",
 "Final Oct 8 Women's · Alabama A&M at ITA Regionals | No Team Score"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Alabama A&M at Austin Peay Invitational | No Team Score",
 "Final Sep 17 Men's · Alabama A&M at HBCU Nationals | No Team Score",
 "Final Oct 5 Men's · Alabama A&M at SWAC Tournament | No Team Score",
 "Final Oct 9 Men's · Alabama A&M at ITA Regionals | No Team Score",
 "Upcoming Nov 6 Men's · Alabama A&M at Georgia State Invite | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 21 Alabama A&M vs Clark Atlanta (Exhibition) | W, 3-0",
 "Final Aug 28 Alabama A&M vs Maryland Eastern Shore | W, 3-0",
 "Final Aug 28 Alabama A&M vs South Carolina State | W, 3-0",
 "Final Aug 29 Alabama A&M vs North Carolina Central | W, 3-2",
 "Final Sep 2 Alabama A&M at North Alabama | L, 0-3",
 "Final Sep 4 Alabama A&M at West Georgia | W, 3-2",
 "Final Sep 4 Alabama A&M vs Georgia State | W, 3-2",
 "Final Sep 5 Alabama A&M at Kennesaw State | L, 0-3",
 "Final Sep 10 Alabama A&M at Bradley | L, 0-3",
 "Final Sep 11 Alabama A&M at Southeast Missouri State | L, 1-3",
 "Final Sep 12 Alabama A&M at Loyola-Chicago | L, 0-3",
 "Final Sep 18 Alabama A&M at Jacksonville | L, 1-3",
 "Final Sep 18 Alabama A&M at Florida International | L, 2-3",
 "Final Sep 19 Alabama A&M at Central Michigan | W, 3-0",
 "Final Sep 22 Alabama A&M vs Tennessee State | W, 3-1",
 "Final Sep 25 Alabama A&M at Bethune-Cookman | W, 3-0",
 "Final Sep 27 Alabama A&M at Florida A&M | W, 3-2",
 "Final Oct 2 Alabama A&M vs Alabama State | W, 3-0",
 "Final Oct 9 Alabama A&M at Prairie View A&M | W, 3-1",
 "Final Oct 11 Alabama A&M at Texas Southern | L, 1-3",
 "Final Oct 13 Alabama A&M vs Miles College | W, 3-0",
 "Final Oct 16 Alabama A&M vs Jackson State | W, 3-0",
 "Final Oct 19 Alabama A&M vs Mississippi Valley State | W, 3-0",
 "Final Oct 21 Alabama A&M at Alabama State | L, 1-3",
 "Final Oct 23 Alabama A&M at Grambling State | W, 3-0",
 "Upcoming Oct 25, 12:00 PM Alabama A&M at Arkansas Pine Bluff | ",
 "Upcoming Oct 30, 6:00 PM Alabama A&M vs Bethune-Cookman | ",
 "Upcoming Nov 1, 12:00 PM Alabama A&M vs Florida A&M | ",
 "Upcoming Nov 6, 6:00 PM Alabama A&M at Jackson State | ",
 "Upcoming Nov 8, 12:00 PM Alabama A&M at Mississippi Valley State | ",
 "Upcoming Nov 13, 6:00 PM Alabama A&M vs Southern | ",
 "Upcoming Nov 15, 11:00 AM Alabama A&M vs Alcorn State | ",
 "Upcoming Nov 20 Alabama A&M at SWAC Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bowl,"Bowling bowl");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Alabama A&M module checks passed");
