import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bethuneCookmanSchool} from '../src/schools/bethune-cookman.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='bethune-cookman');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bethuneCookmanHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/bethune-cookman-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bcuathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['bethune-cookman'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',bethuneCookmanSchool.scheduleUrls],['roster',bethuneCookmanSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('bethune-cookman|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bcuathletics.com',`${key} must stay on bcuathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bcuathletics.com/sports/baseball/schedule"],"roster":["https://bcuathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bcuathletics.com/sports/mens-basketball/schedule","https://bcuathletics.com/sports/womens-basketball/schedule"],"roster":["https://bcuathletics.com/sports/mens-basketball/roster","https://bcuathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://bcuathletics.com/sports/cross-country/schedule"],"roster":["https://bcuathletics.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://bcuathletics.com/sports/football/schedule"],"roster":["https://bcuathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bcuathletics.com/sports/womens-golf/schedule"],"roster":["https://bcuathletics.com/sports/womens-golf/roster"],"combined":false},"Softball":{"schedule":["https://bcuathletics.com/sports/softball/schedule"],"roster":["https://bcuathletics.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://bcuathletics.com/sports/womens-tennis/schedule"],"roster":["https://bcuathletics.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://bcuathletics.com/sports/track-and-field/schedule"],"roster":["https://bcuathletics.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://bcuathletics.com/sports/womens-volleyball/schedule"],"roster":["https://bcuathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'bethune-cookman|"+sport+"':"),`${sport} routes must live in the Bethune-Cookman module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://bcuathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bethuneCookmanHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=bethune-cookman)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Bethune-Cookman vs Furman | ",
 "Upcoming Nov 5, 9:00 PM Men's · Bethune-Cookman at Texas Tech | ",
 "Upcoming Nov 7, 8:00 PM Men's · Bethune-Cookman at Grand Canyon | ",
 "Upcoming Nov 11, 5:00 PM Men's · Bethune-Cookman at San Diego State | ",
 "Upcoming Nov 15, 8:00 PM Men's · Bethune-Cookman vs Paine College | ",
 "Upcoming Nov 18, 9:00 PM Men's · Bethune-Cookman at Creighton | ",
 "Upcoming Nov 25, 6:00 PM Men's · Bethune-Cookman at Richmond | ",
 "Upcoming Nov 28, 7:00 PM Men's · Bethune-Cookman at San Francisco | ",
 "Upcoming Dec 5, 7:00 PM Men's · Bethune-Cookman at Marshall | ",
 "Upcoming Dec 8, 7:00 PM Men's · Bethune-Cookman at Virginia | ",
 "Upcoming Dec 17, 9:00 PM Men's · Bethune-Cookman at Iowa | ",
 "Upcoming Dec 20, 4:00 PM Men's · Bethune-Cookman at North Texas | ",
 "Upcoming Dec 22, 6:00 PM Men's · Bethune-Cookman at Florida State | ",
 "Upcoming Dec 29, 5:00 PM Men's · Bethune-Cookman at Cincinnati | ",
 "Upcoming Jan 2, 3:30 PM Men's · Bethune-Cookman at Florida A&M | ",
 "Upcoming Jan 9 Men's · Bethune-Cookman at Grambling State | ",
 "Upcoming Jan 11, 7:00 PM Men's · Bethune-Cookman at Southern (La.) | ",
 "Upcoming Jan 16, 5:30 PM Men's · Bethune-Cookman vs Mississippi Valley State | ",
 "Upcoming Jan 18, 7:00 PM Men's · Bethune-Cookman vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 23, 3:30 PM Men's · Bethune-Cookman at Jackson State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Bethune-Cookman at Alcorn State | ",
 "Upcoming Jan 30, 5:30 PM Men's · Bethune-Cookman vs Alabama State | ",
 "Upcoming Feb 1, 7:00 PM Men's · Bethune-Cookman vs Alabama A&M | ",
 "Upcoming Feb 6, 4:00 PM Men's · Bethune-Cookman at Prairie View A&M | ",
 "Upcoming Feb 8 Men's · Bethune-Cookman at Texas Southern | ",
 "Upcoming Feb 13, 5:30 PM Men's · Bethune-Cookman vs Alcorn State | ",
 "Upcoming Feb 15, 7:00 PM Men's · Bethune-Cookman vs Jackson State | ",
 "Upcoming Feb 18, 8:00 PM Men's · Bethune-Cookman at Alabama State | ",
 "Upcoming Feb 20 Men's · Bethune-Cookman at Alabama A&M | ",
 "Upcoming Feb 25, 8:00 PM Men's · Bethune-Cookman vs Grambling State | ",
 "Upcoming Feb 27, 5:30 PM Men's · Bethune-Cookman vs Southern (La.) | ",
 "Upcoming Mar 4 Men's · Bethune-Cookman vs Florida A&M | ",
 "Upcoming Mar 9 Men's · Bethune-Cookman at SWAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Bethune-Cookman vs Florida Memorial | ",
 "Upcoming Nov 5, 7:00 PM Women's · Bethune-Cookman at South Carolina State | ",
 "Upcoming Nov 9, 9:00 PM Women's · Bethune-Cookman at Utah | ",
 "Upcoming Nov 11, 1:00 PM Women's · Bethune-Cookman at BYU | ",
 "Upcoming Nov 13, 1:00 PM Women's · Bethune-Cookman at Utah State | ",
 "Upcoming Nov 19, 6:00 PM Women's · Bethune-Cookman vs North Florida | ",
 "Upcoming Nov 24, 1:00 PM Women's · Bethune-Cookman vs Wright State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Bethune-Cookman at New Orleans | ",
 "Upcoming Dec 8, 7:00 PM Women's · Bethune-Cookman vs Webber International | ",
 "Upcoming Dec 11, 7:00 PM Women's · Bethune-Cookman vs New Orleans | ",
 "Upcoming Dec 14, 6:00 PM Women's · Bethune-Cookman at Florida | ",
 "Upcoming Dec 20, 11:00 AM Women's · Bethune-Cookman vs Towson | ",
 "Upcoming Dec 21, 2:00 PM Women's · Bethune-Cookman vs Longwood | ",
 "Upcoming Dec 28, 7:00 PM Women's · Bethune-Cookman at Miami | ",
 "Upcoming Jan 2, 1:00 PM Women's · Bethune-Cookman at Florida A&M | ",
 "Upcoming Jan 7, 7:00 PM Women's · Bethune-Cookman at Southern | ",
 "Upcoming Jan 9 Women's · Bethune-Cookman at Grambling State | ",
 "Upcoming Jan 14, 7:00 PM Women's · Bethune-Cookman vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 16, 3:00 PM Women's · Bethune-Cookman vs Mississippi Valley State | ",
 "Upcoming Jan 21 Women's · Bethune-Cookman at Alcorn State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Bethune-Cookman at Jackson State | ",
 "Upcoming Jan 28, 7:00 PM Women's · Bethune-Cookman vs Alabama A&M | ",
 "Upcoming Jan 30, 3:00 PM Women's · Bethune-Cookman vs Alabama State | ",
 "Upcoming Feb 4 Women's · Bethune-Cookman at Texas Southern | ",
 "Upcoming Feb 6, 1:00 PM Women's · Bethune-Cookman at Prairie View A&M | ",
 "Upcoming Feb 11, 7:00 PM Women's · Bethune-Cookman vs Jackson State | ",
 "Upcoming Feb 13, 3:00 PM Women's · Bethune-Cookman vs Alcorn State | ",
 "Upcoming Feb 18 Women's · Bethune-Cookman at Alabama State | ",
 "Upcoming Feb 20 Women's · Bethune-Cookman at Alabama A&M | ",
 "Upcoming Feb 25, 5:30 PM Women's · Bethune-Cookman vs Grambling State | ",
 "Upcoming Feb 27, 3:00 PM Women's · Bethune-Cookman vs Southern | ",
 "Upcoming Mar 4, 5:30 PM Women's · Bethune-Cookman vs Florida A&M | ",
 "Upcoming Mar 8 Women's · Bethune-Cookman at SWAC Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Bethune-Cookman at Florida Intercollegiate XC Invitational | Women's team: 14th / Men's team: 7th",
 "Final Sep 18 Bethune-Cookman at Florida State Pre Regional | Women's team: 21st / Men's team: 13th",
 "Final Oct 10 Bethune-Cookman at 19th Annual Sandshark Invitational | Women's team: 3rd / Men's team: 1st",
 "Final Oct 16 Bethune-Cookman at Ed Holloway Classic | Men's team: 4th",
 "Upcoming Oct 27, 6:00 AM Bethune-Cookman at SWAC Cross Country Championship | ",
 "Upcoming Nov 13, 6:00 AM Bethune-Cookman at NCAA DI Cross Country South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Bethune-Cookman at UCF | L, 6-73",
 "Final Sep 12 Bethune-Cookman vs Stetson | W, 43-18",
 "Final Sep 19 Bethune-Cookman vs Virginia Lynchburg | W, 62-3",
 "Final Sep 26 Bethune-Cookman vs South Carolina State | L, 21-31",
 "Final Oct 3 Bethune-Cookman vs Alabama State | W, 16-10",
 "Final Oct 10 Bethune-Cookman at Alabama A&M | L, 17-55",
 "Final Oct 17 Bethune-Cookman at Mississippi Valley State | W, 34-14",
 "Final Oct 24 Bethune-Cookman vs Jackson State | W, 24-21",
 "Upcoming Oct 31, 3:00 PM Bethune-Cookman at Arkansas - Pine Bluff | ",
 "Upcoming Nov 7, 3:00 PM Bethune-Cookman at Southern (La.) | ",
 "Upcoming Nov 14, 1:00 PM Bethune-Cookman vs Grambling State | ",
 "Upcoming Nov 21, 3:30 PM Bethune-Cookman vs Florida A&M | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Bethune-Cookman at SSC Warm Up | 5th of 5",
 "Final Sep 21 Bethune-Cookman at Stampede at the Creek | 4th of 5",
 "Final Sep 28 Bethune-Cookman at Powercat Classic | 12th of 12",
 "Upcoming Nov 2 Bethune-Cookman at TSU Tiger Invitational | ",
 "Upcoming Nov 9 Bethune-Cookman at Southwestern Athletic Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 17 Bethune-Cookman at HBCU National Championships | Completed",
 "Final Oct 19 Bethune-Cookman at SWAC Fall Tournament | Completed",
 "Upcoming Oct 30 Bethune-Cookman at Stetson Fall Invitational Tournament | ",
 "Upcoming Jan 17, 4:00 PM Bethune-Cookman at UCF | ",
 "Upcoming Jan 18 Bethune-Cookman at Florida | ",
 "Upcoming Feb 7, 11:00 AM Bethune-Cookman vs Stetson | ",
 "Upcoming Feb 20 Bethune-Cookman at Edward Waters | ",
 "Upcoming Feb 27, 3:00 PM Bethune-Cookman at Stetson | ",
 "Upcoming Mar 4, 11:00 AM Bethune-Cookman vs Jackson State | ",
 "Upcoming Mar 5 Bethune-Cookman at Grambling State | ",
 "Upcoming Mar 6 Bethune-Cookman vs Alabama A&M | ",
 "Upcoming Mar 7 Bethune-Cookman vs Alcorn State | ",
 "Upcoming Mar 25, 3:00 PM Bethune-Cookman vs Alabama State | ",
 "Upcoming Mar 26 Bethune-Cookman vs Florida A&M | ",
 "Upcoming Mar 27 Bethune-Cookman vs Southern (La.) | ",
 "Upcoming Mar 28 Bethune-Cookman vs Mississippi Valley State | ",
 "Upcoming Apr 16 Bethune-Cookman at SWAC Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Bethune-Cookman vs Hampton | L, 0-3",
 "Final Aug 28 Bethune-Cookman at East Carolina | L, 0-3",
 "Final Aug 29 Bethune-Cookman vs Radford | W, 3-2",
 "Final Sep 4 Bethune-Cookman vs Stetson | L, 0-3",
 "Final Sep 5 Bethune-Cookman at Stetson | L, 1-3",
 "Final Sep 11 Bethune-Cookman vs Cal State Fullerton | L, 0-3",
 "Final Sep 11 Bethune-Cookman vs The Citadel | W, 3-1",
 "Final Sep 12 Bethune-Cookman at Charleston Southern | L, 0-3",
 "Final Sep 18 Bethune-Cookman at South Carolina State | W, 3-1",
 "Final Sep 19 Bethune-Cookman at South Carolina State | W, 3-0",
 "Final Sep 25 Bethune-Cookman vs Alabama A&M | L, 0-3",
 "Final Sep 27 Bethune-Cookman vs Alabama State | W, 3-1",
 "Final Oct 2 Bethune-Cookman at Jackson State | W, 3-1",
 "Final Oct 4 Bethune-Cookman at Mississippi Valley State | W, 3-0",
 "Final Oct 7 Bethune-Cookman at Florida A&M | L, 0-3",
 "Final Oct 9 Bethune-Cookman vs Grambling State | W, 3-1",
 "Final Oct 11 Bethune-Cookman vs Arkansas - Pine Bluff | W, 3-0",
 "Final Oct 16 Bethune-Cookman vs Florida A&M | L, 1-3",
 "Final Oct 23 Bethune-Cookman vs Alcorn | W, 3-0",
 "Upcoming Oct 25, 12:00 PM Bethune-Cookman vs Southern (La.) | ",
 "Upcoming Oct 30, 7:00 PM Bethune-Cookman at Alabama A&M | ",
 "Upcoming Nov 1, 1:00 PM Bethune-Cookman at Alabama State | ",
 "Upcoming Nov 6, 7:00 PM Bethune-Cookman at Prairie View A&M | ",
 "Upcoming Nov 8, 1:00 PM Bethune-Cookman at Texas Southern | ",
 "Upcoming Nov 13, 6:00 PM Bethune-Cookman vs Jackson State | ",
 "Upcoming Nov 15, 12:00 PM Bethune-Cookman vs Mississippi Valley State | ",
 "Upcoming Nov 20 Bethune-Cookman at SWAC Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Bethune-Cookman module checks passed");
