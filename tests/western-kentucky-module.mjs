import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westernKentuckySchool} from '../src/schools/western-kentucky.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='western-kentucky');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westernKentuckyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/western-kentucky-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit wkusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['western-kentucky'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',westernKentuckySchool.scheduleUrls],['roster',westernKentuckySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('western-kentucky|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'wkusports.com',`${key} must stay on wkusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://wkusports.com/sports/baseball/schedule"],"roster":["https://wkusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://wkusports.com/sports/mens-basketball/schedule","https://wkusports.com/sports/womens-basketball/schedule"],"roster":["https://wkusports.com/sports/mens-basketball/roster","https://wkusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://wkusports.com/sports/cross-country/schedule"],"roster":["https://wkusports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://wkusports.com/sports/football/schedule"],"roster":["https://wkusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://wkusports.com/sports/womens-golf/schedule","https://wkusports.com/sports/mens-golf/schedule"],"roster":["https://wkusports.com/sports/womens-golf/roster","https://wkusports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://wkusports.com/sports/womens-soccer/schedule"],"roster":["https://wkusports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://wkusports.com/sports/softball/schedule"],"roster":["https://wkusports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://wkusports.com/sports/womens-tennis/schedule"],"roster":["https://wkusports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://wkusports.com/sports/track-and-field/schedule"],"roster":["https://wkusports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://wkusports.com/sports/womens-volleyball/schedule"],"roster":["https://wkusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'western-kentucky|"+sport+"':"),`${sport} routes must live in the Western Kentucky module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://wkusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westernKentuckyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=western-kentucky)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 20 Men's · WKU vs Bowling Green (Exhibition) | W, 65-62",
 "Upcoming Oct 25, 3:00 PM Men's · WKU vs Indiana (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · WKU vs Morehead State | ",
 "Upcoming Nov 5, 6:30 PM Men's · WKU vs Kentucky Wesleyan | ",
 "Upcoming Nov 8, 2:00 PM Men's · WKU at Tennessee Tech | ",
 "Upcoming Nov 11, 6:30 PM Men's · WKU vs Campbellsville | ",
 "Upcoming Nov 16 Men's · WKU at Tulsa | ",
 "Upcoming Nov 20, 6:00 PM Men's · WKU vs Richmond | ",
 "Upcoming Nov 22, 1:00 PM Men's · WKU vs George Washington | ",
 "Upcoming Nov 27, 5:00 PM Men's · WKU at Illinois | ",
 "Upcoming Dec 1, 6:30 PM Men's · WKU vs Belmont | ",
 "Upcoming Dec 5, 1:00 PM Men's · WKU at Evansville | ",
 "Upcoming Dec 12, 6:00 PM Men's · WKU vs UAB | ",
 "Upcoming Dec 16, 6:30 PM Men's · WKU vs Lipscomb | ",
 "Upcoming Dec 22, 11:00 AM Men's · WKU vs Tulane | ",
 "Upcoming Dec 28, 6:30 PM Men's · WKU vs Bethel (Tenn.) | ",
 "Upcoming Dec 31, 5:00 PM Men's · WKU at Kennesaw State | ",
 "Upcoming Jan 2, 4:00 PM Men's · WKU at Jax State | ",
 "Upcoming Jan 7, 6:30 PM Men's · WKU vs New Mexico State | ",
 "Upcoming Jan 9, 3:00 PM Men's · WKU vs Sam Houston | ",
 "Upcoming Jan 14, 6:00 PM Men's · WKU at Delaware | ",
 "Upcoming Jan 16, 11:00 AM Men's · WKU at Liberty | ",
 "Upcoming Jan 21, 8:00 PM Men's · WKU vs Missouri State | ",
 "Upcoming Jan 23, 6:00 PM Men's · WKU vs FIU | ",
 "Upcoming Jan 30, 3:00 PM Men's · WKU vs Middle Tennessee | ",
 "Upcoming Feb 4, 7:00 PM Men's · WKU at Sam Houston | ",
 "Upcoming Feb 6, 3:00 PM Men's · WKU at New Mexico State | ",
 "Upcoming Feb 11, 8:00 PM Men's · WKU vs Liberty | ",
 "Upcoming Feb 13, 6:00 PM Men's · WKU vs Delaware | ",
 "Upcoming Feb 18, 6:00 PM Men's · WKU at FIU | ",
 "Upcoming Feb 20, 2:00 PM Men's · WKU at Missouri State | ",
 "Upcoming Feb 27, 1:00 PM Men's · WKU at Middle Tennessee | ",
 "Upcoming Mar 4, 6:30 PM Men's · WKU vs Jax State | ",
 "Upcoming Mar 6, 2:00 PM Men's · WKU vs Kennesaw State | ",
 "Upcoming Mar 9 Men's · WKU at Conference USA Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 31, 2:00 PM Women's · WKU vs Young Harris College (Exhibition) | ",
 "Upcoming Nov 4, 6:30 PM Women's · WKU vs Chattanooga | ",
 "Upcoming Nov 8, 2:00 PM Women's · WKU vs Christian Brothers | ",
 "Upcoming Nov 11, 6:30 PM Women's · WKU at Vanderbilt | ",
 "Upcoming Nov 16, 6:30 PM Women's · WKU vs Kentucky State | ",
 "Upcoming Nov 24, 6:30 PM Women's · WKU vs Southern Illinois | ",
 "Upcoming Nov 27, 1:00 PM Women's · WKU vs Florida Atlantic | ",
 "Upcoming Nov 28, 11:00 AM Women's · WKU vs Morehead State | ",
 "Upcoming Dec 2 Women's · WKU at Campbell | ",
 "Upcoming Dec 6, 2:00 PM Women's · WKU at Evansville | ",
 "Upcoming Dec 13, 2:00 PM Women's · WKU vs Miami (OH) | ",
 "Upcoming Dec 16, 5:00 PM Women's · WKU at Holy Cross | ",
 "Upcoming Dec 19, 1:00 PM Women's · WKU at Yale | ",
 "Upcoming Dec 29, 6:30 PM Women's · WKU vs Arkansas Tech | ",
 "Upcoming Jan 2 Women's · WKU vs Kennesaw State | ",
 "Upcoming Jan 4 Women's · WKU vs Jax State | ",
 "Upcoming Jan 8 Women's · WKU at New Mexico State | ",
 "Upcoming Jan 10 Women's · WKU at Sam Houston | ",
 "Upcoming Jan 14 Women's · WKU vs Delaware | ",
 "Upcoming Jan 16 Women's · WKU vs Liberty | ",
 "Upcoming Jan 21 Women's · WKU at Missouri State | ",
 "Upcoming Jan 23 Women's · WKU at FIU | ",
 "Upcoming Jan 30 Women's · WKU at Middle Tennessee | ",
 "Upcoming Feb 4 Women's · WKU vs Sam Houston | ",
 "Upcoming Feb 6 Women's · WKU vs New Mexico State | ",
 "Upcoming Feb 11 Women's · WKU at Liberty | ",
 "Upcoming Feb 13 Women's · WKU at Delaware | ",
 "Upcoming Feb 18 Women's · WKU vs FIU | ",
 "Upcoming Feb 20 Women's · WKU vs Missouri State | ",
 "Upcoming Feb 27 Women's · WKU vs Middle Tennessee | ",
 "Upcoming Mar 4 Women's · WKU at Jax State | ",
 "Upcoming Mar 6 Women's · WKU at Kennesaw State | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 WKU at Stegemoller Screagle Twilight | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 25 WKU at Gans Creek Classic | Women's team: 2nd / Men's team: 27th",
 "Final Oct 3 WKU at Louisville Classic | Women's team: 9th / Men's team: 5th",
 "Final Oct 16 WKU at Crimson Classic | Women's team: 15th / Men's team: 7th",
 "Upcoming Oct 31 WKU at Conference USA Championships | ",
 "Upcoming Nov 13 WKU at NCAA Southeast Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 WKU at Nevada | L, 14-49",
 "Final Sep 12 WKU at Georgia | L, 20-70",
 "Final Sep 19 WKU at Indiana | L, 0-38",
 "Final Sep 26 WKU vs Mercyhurst | W, 52-7",
 "Final Oct 1 WKU at New Mexico State | L, 13-34",
 "Final Oct 8 WKU vs Missouri State | W, 34-13",
 "Final Oct 14 WKU at Sam Houston | W, 16-3",
 "Upcoming Oct 27, 6:00 PM WKU vs Delaware | ",
 "Upcoming Nov 7, 2:30 PM WKU at Middle Tennessee | ",
 "Upcoming Nov 14, 2:30 PM WKU vs Jax State | ",
 "Upcoming Nov 21, 12:00 PM WKU at Liberty | ",
 "Upcoming Nov 28, 12:00 PM WKU vs Kennesaw State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · WKU at Boilermaker Classic | T9th of 16",
 "Final Sep 13 Women's · WKU at Badger Invitational | 14th of 16",
 "Final Sep 18 Women's · WKU at Mason Rudolph Intercollegiate | T11th of 15",
 "Final Oct 4 Women's · WKU at Mercedes Benz Intercollegiate | 12th of 15",
 "Upcoming Feb 26 Women's · WKU at Reynolds Lake Oconee Classic | ",
 "Upcoming Mar 14 Women's · WKU at Mountain View Collegiate | ",
 "Upcoming Mar 21 Women's · WKU at City of Oaks Collegiate | ",
 "Upcoming Mar 27 Women's · WKU at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 4 Women's · WKU at Olde Stone Collegiate | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · WKU at ANF Fall Classic | 2nd of 14",
 "Final Sep 20 Men's · WKU at Greame McDowell Invitational | 2nd of 13",
 "Final Sep 27 Men's · WKU at Badger Invitational | T3rd of 19",
 "Final Oct 5 Men's · WKU at Cullan Brown Invitational | T9th of 15",
 "Final Oct 18 Men's · WKU at Furman Intercollegiate | T8th of 15",
 "Upcoming Feb 21 Men's · WKU at Military City Collegiate | ",
 "Upcoming Mar 12 Men's · WKU at Seminole Intercollegiate | ",
 "Upcoming Mar 22 Men's · WKU at Skyhawk Invitational | ",
 "Upcoming Mar 29 Men's · WKU at Mobile Bay Intercollegiate | ",
 "Upcoming Apr 9 Men's · WKU at Robert Kepler Intercollegiate | ",
 "Upcoming Apr 26 Men's · WKU at Conference USA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 WKU vs Murray State (Exhibition) | W, 4-1",
 "Final Aug 7 WKU vs Samford (Exhibition) | T, 1-1",
 "Final Aug 13 WKU vs Missouri | T, 0-0",
 "Final Aug 16 WKU at Indiana State | W, 1-0",
 "Final Aug 20 WKU vs UAB | T, 1-1",
 "Final Aug 23 WKU vs Ball State | W, 2-0",
 "Final Aug 27 WKU vs Union | W, 2-0",
 "Final Sep 3 WKU at DePaul | W, 1-0",
 "Final Sep 6 WKU at UIC | W, 1-0",
 "Final Sep 13 WKU at Lipscomb | T, 1-1",
 "Final Sep 17 WKU vs SEMO | W, 4-1",
 "Final Sep 20 WKU vs Lindenwood | T, 0-0",
 "Final Sep 26 WKU at Liberty | L, 0-1",
 "Final Oct 1 WKU vs Sam Houston | W, 2-0",
 "Final Oct 4 WKU vs Missouri State | W, 1-0",
 "Final Oct 11 WKU at Delaware | T, 2-2",
 "Final Oct 18 WKU at FIU | T, 1-1",
 "Today Oct 22, 6:00 PM WKU vs Jacksonville State | ",
 "Upcoming Oct 25, 1:00 PM WKU vs New Mexico State | ",
 "Upcoming Nov 1, 5:00 PM WKU at Middle Tennessee | ",
 "Upcoming Nov 8 WKU at Conference USA Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 WKU at APSU Fall Tournament | Completed",
 "Final Oct 8 WKU at ITA Ohio Valley Regionals | Completed",
 "Upcoming Oct 23 WKU at Middle Tennessee Fall Invitational | ",
 "Upcoming Jan 14, 1:00 PM WKU vs Eastern Kentucky | ",
 "Upcoming Jan 17, 11:00 AM WKU at Louisville | ",
 "Upcoming Jan 18, 11:30 AM WKU at Bellarmine | ",
 "Upcoming Jan 23, 12:00 PM WKU at Ball State | ",
 "Upcoming Jan 24, 8:00 AM WKU at Butler | ",
 "Upcoming Jan 29, 6:00 PM WKU at Northern Kentucky | ",
 "Upcoming Jan 30, 12:30 PM WKU at Cincinnati | ",
 "Upcoming Feb 5, 1:00 PM WKU vs Southern Indiana | ",
 "Upcoming Feb 5, 5:30 PM WKU vs Tennessee State | ",
 "Upcoming Feb 13, 12:30 PM WKU at Lipscomb | ",
 "Upcoming Feb 19, 2:00 PM WKU vs Austin Peay | ",
 "Upcoming Feb 26, 2:00 PM WKU vs Jax State | ",
 "Upcoming Feb 27, 1:00 PM WKU vs SEMO | ",
 "Upcoming Mar 7, 2:00 PM WKU vs Murray State | ",
 "Upcoming Mar 8, 3:00 PM WKU vs SIU Edwardsville | ",
 "Upcoming Mar 12, 1:30 PM WKU vs Missouri State | ",
 "Upcoming Mar 14, 1:30 PM WKU vs Liberty | ",
 "Upcoming Mar 23, 5:00 PM WKU vs St. Thomas | ",
 "Upcoming Mar 26, 2:00 PM WKU at Belmont | ",
 "Upcoming Mar 27, 11:00 AM WKU vs FIU | ",
 "Upcoming Mar 31, 1:00 PM WKU vs Alabama A&M | ",
 "Upcoming Apr 5, 2:00 PM WKU at Middle Tennessee | ",
 "Upcoming Apr 11, 1:30 PM WKU vs UAB | ",
 "Upcoming Apr 17, 1:00 PM WKU at Sam Houston | ",
 "Upcoming Apr 22 WKU at Conference USA Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 19 WKU vs IU Indy (Exhibition) | W, 3-0",
 "Final Aug 28 WKU at SEMO | W, 3-0",
 "Final Aug 28 WKU vs Oregon | L, 0-3",
 "Final Aug 29 WKU at SEMO | W, 3-0",
 "Final Sep 3 WKU vs Ball State | L, 1-3",
 "Final Sep 4 WKU at Wright State | W, 3-0",
 "Final Sep 5 WKU vs Dayton | L, 2-3",
 "Final Sep 10 WKU vs Pepperdine | W, 3-1",
 "Final Sep 11 WKU vs James Madison | W, 3-2",
 "Final Sep 12 WKU vs Eastern Kentucky | L, 1-3",
 "Final Sep 16 WKU vs Louisville | L, 0-3",
 "Final Sep 17 WKU vs Oklahoma | L, 2-3",
 "Final Sep 19 WKU vs ETSU | W, 3-0",
 "Final Sep 25 WKU at NM State | W, 3-1",
 "Final Sep 26 WKU at NM State | W, 3-2",
 "Final Oct 2 WKU vs Missouri State | W, 3-0",
 "Final Oct 3 WKU vs Missouri State | W, 3-0",
 "Final Oct 9 WKU at Jacksonville State | W, 3-0",
 "Final Oct 10 WKU at Jacksonville State | W, 3-0",
 "Final Oct 16 WKU vs Middle Tennessee | W, 3-0",
 "Final Oct 17 WKU vs Middle Tennessee | W, 3-0",
 "Upcoming Oct 23, 6:00 PM WKU vs Kennesaw State | ",
 "Upcoming Oct 24, 1:00 PM WKU vs Kennesaw State | ",
 "Upcoming Oct 30, 5:00 PM WKU at FIU | ",
 "Upcoming Oct 31, 11:00 AM WKU at FIU | ",
 "Upcoming Nov 6, 6:00 PM WKU vs Liberty | ",
 "Upcoming Nov 7, 1:00 PM WKU vs Liberty | ",
 "Upcoming Nov 12, 6:00 PM WKU at Sam Houston | ",
 "Upcoming Nov 13, 1:00 PM WKU at Sam Houston | ",
 "Upcoming Nov 20 WKU at Conference USA Tournament | "
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
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Western Kentucky module checks passed");
