import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {missouriStateSchool} from '../src/schools/missouri-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='missouri-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,missouriStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/missouri-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit missouristatebears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['missouri-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',missouriStateSchool.scheduleUrls],['roster',missouriStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('missouri-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'missouristatebears.com',`${key} must stay on missouristatebears.com`);
  }
}
const parity={"Baseball":{"schedule":["https://missouristatebears.com/sports/baseball/schedule"],"roster":["https://missouristatebears.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://missouristatebears.com/sports/mens-basketball/schedule","https://missouristatebears.com/sports/womens-basketball/schedule"],"roster":["https://missouristatebears.com/sports/mens-basketball/roster","https://missouristatebears.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://missouristatebears.com/sports/womens-beach-volleyball/schedule"],"roster":["https://missouristatebears.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://missouristatebears.com/sports/womens-cross-country/schedule"],"roster":["https://missouristatebears.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://missouristatebears.com/sports/football/schedule"],"roster":["https://missouristatebears.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://missouristatebears.com/sports/womens-golf/schedule","https://missouristatebears.com/sports/mens-golf/schedule"],"roster":["https://missouristatebears.com/sports/womens-golf/roster","https://missouristatebears.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://missouristatebears.com/sports/womens-soccer/schedule","https://missouristatebears.com/sports/mens-soccer/schedule"],"roster":["https://missouristatebears.com/sports/womens-soccer/roster","https://missouristatebears.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://missouristatebears.com/sports/softball/schedule"],"roster":["https://missouristatebears.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://missouristatebears.com/sports/swimming-and-diving/schedule"],"roster":["https://missouristatebears.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://missouristatebears.com/sports/womens-tennis/schedule"],"roster":["https://missouristatebears.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://missouristatebears.com/sports/womens-track-and-field/schedule"],"roster":["https://missouristatebears.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://missouristatebears.com/sports/womens-volleyball/schedule"],"roster":["https://missouristatebears.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'missouri-state|"+sport+"':"),`${sport} routes must live in the Missouri State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://missouristatebears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.missouriStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=missouri-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 3 Missouri State at Drury (Exhibition) | W, 13-5",
 "Final Oct 8 Missouri State at Oklahoma (Exhibition) (Game 1) | L, 11-14",
 "Final Oct 8 Missouri State at Oklahoma (Exhibition) (Game 2) | L, 0-3",
 "Upcoming Oct 25, 2:00 PM Missouri State vs Lindenwood (Exhibition) | ",
 "Upcoming Oct 25, 6:00 PM Missouri State vs Saint Louis (Exhibition) | ",
 "Upcoming Mar 25 Missouri State at Sam Houston | ",
 "Upcoming Mar 26 Missouri State at Sam Houston | ",
 "Upcoming Mar 27 Missouri State at Sam Houston | ",
 "Upcoming Apr 1 Missouri State vs Kennesaw State | ",
 "Upcoming Apr 2 Missouri State vs Kennesaw State | ",
 "Upcoming Apr 3 Missouri State vs Kennesaw State | ",
 "Upcoming Apr 9 Missouri State at New Mexico State | ",
 "Upcoming Apr 10 Missouri State at New Mexico State | ",
 "Upcoming Apr 11 Missouri State at New Mexico State | ",
 "Upcoming Apr 16 Missouri State vs FIU | ",
 "Upcoming Apr 17 Missouri State vs FIU | ",
 "Upcoming Apr 18 Missouri State vs FIU | ",
 "Upcoming Apr 23 Missouri State at Jacksonville State | ",
 "Upcoming Apr 24 Missouri State at Jacksonville State | ",
 "Upcoming Apr 25 Missouri State at Jacksonville State | ",
 "Upcoming Apr 30 Missouri State at Middle Tennessee | ",
 "Upcoming May 1 Missouri State at Middle Tennessee | ",
 "Upcoming May 2 Missouri State at Middle Tennessee | ",
 "Upcoming May 7 Missouri State vs Delaware | ",
 "Upcoming May 8 Missouri State vs Delaware | ",
 "Upcoming May 9 Missouri State vs Delaware | ",
 "Upcoming May 13 Missouri State vs Liberty | ",
 "Upcoming May 14 Missouri State vs Liberty | ",
 "Upcoming May 15 Missouri State vs Liberty | ",
 "Upcoming May 20 Missouri State at Western Kentucky | ",
 "Upcoming May 21 Missouri State at Western Kentucky | ",
 "Upcoming May 22 Missouri State at Western Kentucky | ",
 "Upcoming May 26 Missouri State at CUSA Baseball Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Missouri State vs Lincoln | ",
 "Upcoming Nov 6, 7:00 PM Men's · Missouri State vs Truman State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Missouri State vs Newman | ",
 "Upcoming Nov 16, 7:00 PM Men's · Missouri State vs Abilene Christian | ",
 "Upcoming Nov 21, 2:00 PM Men's · Missouri State vs Drake | ",
 "Upcoming Nov 27, 7:00 PM Men's · Missouri State at Oral Roberts | ",
 "Upcoming Nov 30, 7:00 PM Men's · Missouri State vs Lindenwood | ",
 "Upcoming Dec 3, 7:00 PM Men's · Missouri State at Arkansas State | ",
 "Upcoming Dec 6, 6:00 PM Men's · Missouri State vs Tulsa | ",
 "Upcoming Dec 12, 4:00 PM Men's · Missouri State at Tarleton State | ",
 "Upcoming Dec 18, 8:30 PM Men's · Missouri State vs Iowa State | ",
 "Upcoming Dec 21, 2:00 PM Men's · Missouri State vs UIC | ",
 "Upcoming Dec 31, 2:30 PM Men's · Missouri State at Sam Houston | ",
 "Upcoming Jan 2, 3:00 PM Men's · Missouri State at New Mexico State | ",
 "Upcoming Jan 7, 7:00 PM Men's · Missouri State vs Delaware | ",
 "Upcoming Jan 9, 2:00 PM Men's · Missouri State vs Liberty | ",
 "Upcoming Jan 16, 1:00 PM Men's · Missouri State at FIU | ",
 "Upcoming Jan 21, 8:00 PM Men's · Missouri State at Western Kentucky | ",
 "Upcoming Jan 23, 5:00 PM Men's · Missouri State at Middle Tennessee | ",
 "Upcoming Jan 28, 7:00 PM Men's · Missouri State vs Kennesaw State | ",
 "Upcoming Jan 30, 2:00 PM Men's · Missouri State vs Jacksonville State | ",
 "Upcoming Feb 4, 6:00 PM Men's · Missouri State at Liberty | ",
 "Upcoming Feb 6, 6:00 PM Men's · Missouri State at Delaware | ",
 "Upcoming Feb 13, 2:00 PM Men's · Missouri State vs FIU | ",
 "Upcoming Feb 18, 7:00 PM Men's · Missouri State vs Middle Tennessee | ",
 "Upcoming Feb 20, 2:00 PM Men's · Missouri State vs Western Kentucky | ",
 "Upcoming Feb 25, 6:00 PM Men's · Missouri State at Kennesaw State | ",
 "Upcoming Feb 27, 4:00 PM Men's · Missouri State at Jacksonville State | ",
 "Upcoming Mar 4, 7:00 PM Men's · Missouri State vs New Mexico State | ",
 "Upcoming Mar 6, 12:00 PM Men's · Missouri State vs Sam Houston | ",
 "Upcoming Mar 9 Men's · Missouri State at CUSA Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Missouri State vs Missouri Southern (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Women's · Missouri State vs Southeast Missouri State | ",
 "Upcoming Nov 7, 8:00 PM Women's · Missouri State at Wyoming | ",
 "Upcoming Nov 10, 11:00 AM Women's · Missouri State at Wichita State | ",
 "Upcoming Nov 13, 6:30 PM Women's · Missouri State vs Marquette | ",
 "Upcoming Nov 18, 7:00 PM Women's · Missouri State at Saint Louis | ",
 "Upcoming Nov 22, 11:00 AM Women's · Missouri State vs Kansas City | ",
 "Upcoming Nov 26, 5:30 PM Women's · Missouri State vs Minnesota | ",
 "Upcoming Nov 27, 3:00 PM Women's · Missouri State vs Washington State | ",
 "Upcoming Dec 3, 6:30 PM Women's · Missouri State at Kansas | ",
 "Upcoming Dec 6, 2:00 PM Women's · Missouri State vs Central Arkansas | ",
 "Upcoming Dec 12, 1:00 PM Women's · Missouri State vs North Dakota State | ",
 "Upcoming Dec 16, 6:30 PM Women's · Missouri State vs UT Arlington | ",
 "Upcoming Dec 19, 2:00 PM Women's · Missouri State at Arkansas | ",
 "Upcoming Dec 22, 1:00 PM Women's · Missouri State vs Austin Peay | ",
 "Upcoming Jan 2, 1:00 PM Women's · Missouri State vs Sam Houston | ",
 "Upcoming Jan 4, 6:30 PM Women's · Missouri State vs New Mexico State | ",
 "Upcoming Jan 8, 6:00 PM Women's · Missouri State at Delaware | ",
 "Upcoming Jan 10, 1:00 PM Women's · Missouri State at Liberty | ",
 "Upcoming Jan 16, 11:00 AM Women's · Missouri State vs FIU | ",
 "Upcoming Jan 21, 6:30 PM Women's · Missouri State vs Western Kentucky | ",
 "Upcoming Jan 23, 1:00 PM Women's · Missouri State vs Middle Tennessee | ",
 "Upcoming Jan 28, 5:00 PM Women's · Missouri State at Kennesaw State | ",
 "Upcoming Jan 30, 11:00 AM Women's · Missouri State at Jacksonville State | ",
 "Upcoming Feb 4, 6:30 PM Women's · Missouri State vs Liberty | ",
 "Upcoming Feb 6, 1:00 PM Women's · Missouri State vs Delaware | ",
 "Upcoming Feb 13, 12:00 PM Women's · Missouri State at FIU | ",
 "Upcoming Feb 18, 6:30 PM Women's · Missouri State at Middle Tennessee | ",
 "Upcoming Feb 20, 2:00 PM Women's · Missouri State at Western Kentucky | ",
 "Upcoming Feb 25, 6:30 PM Women's · Missouri State vs Kennesaw State | ",
 "Upcoming Feb 27, 1:00 PM Women's · Missouri State vs Jacksonville State | ",
 "Upcoming Mar 4, 7:00 PM Women's · Missouri State at New Mexico State | ",
 "Upcoming Mar 6, 1:00 PM Women's · Missouri State at Sam Houston | ",
 "Upcoming Mar 9 Women's · Missouri State at CUSA Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 2 Missouri State at AVCA Fall Championship Qualifier | Completed"
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 Missouri State at Queen City After Dark | 1st of 13",
 "Final Sep 25 Missouri State at Gans Creek Classic | 19th of 29",
 "Final Oct 3 Missouri State at Chile Pepper Festival | 7th of 29",
 "Final Oct 16 Missouri State at Bradley Pink Classic | 6th of 25",
 "Upcoming Oct 30, 9:00 AM Missouri State at Conference USA Championship | ",
 "Upcoming Nov 13 Missouri State at NCAA Midwest Regional Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Missouri State at Texas A&M | L, 0-50",
 "Final Sep 12 Missouri State vs Lindenwood | W, 48-14",
 "Final Sep 19 Missouri State vs Marshall | L, 24-30",
 "Final Sep 26 Missouri State at SMU | L, 24-34",
 "Final Oct 8 Missouri State at Western Kentucky | L, 13-34",
 "Final Oct 14 Missouri State vs Kennesaw State | W, 24-21",
 "Final Oct 20 Missouri State at Delaware | L, 38-61",
 "Upcoming Oct 27, 7:00 PM Missouri State vs Sam Houston | ",
 "Upcoming Nov 7, 3:00 PM Missouri State at FIU | ",
 "Upcoming Nov 14, 2:00 PM Missouri State vs New Mexico State | ",
 "Upcoming Nov 21, 1:00 PM Missouri State at Jacksonville State | ",
 "Upcoming Nov 28, 1:00 PM Missouri State vs Liberty | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Missouri State at Boilermaker Classic | T15th of 16",
 "Final Sep 21 Women's · Missouri State at Johnie Imes Invitational | 2nd of 9",
 "Final Sep 28 Women's · Missouri State at Diane Thomason/Hawkeye Invitational | 2nd of 13",
 "Final Oct 12 Women's · Missouri State at MoState/Payne Stewart Memorial | 2nd of 12",
 "Final Oct 18 Women's · Missouri State at Diamante Intercollegiate | 8th of 20",
 "Upcoming Feb 19 Women's · Missouri State at Rio Verde Invitational | ",
 "Upcoming Mar 1 Women's · Missouri State at West Texas Classic | ",
 "Upcoming Mar 15 Women's · Missouri State at Briars Creek Invitational | ",
 "Upcoming Mar 22 Women's · Missouri State at Ozarks National Invitational | ",
 "Upcoming Apr 11 Women's · Missouri State at Boilermaker Spring Classic | ",
 "Upcoming Apr 19 Women's · Missouri State at Conference USA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Missouri State at Golfweek Invitational | 14th of 16",
 "Final Sep 14 Men's · Missouri State at Grover Page Classic | 3rd of 10",
 "Final Sep 28 Men's · Missouri State at Derek Dolenc | 7th of 17",
 "Final Oct 12 Men's · Missouri State at The Scrappy at Pinetree | 10th of 11",
 "Final Oct 19 Men's · Missouri State at Twin Oaks Intercollegiate | 3rd of 7",
 "Upcoming Feb 8 Men's · Missouri State at Bentwater Intercollegiate | ",
 "Upcoming Feb 28 Men's · Missouri State at Loyola Intercollegiate | ",
 "Upcoming Mar 12 Men's · Missouri State at Jackrabbit Invitational | ",
 "Upcoming Apr 5 Men's · Missouri State at Tiger Intercollegiate | ",
 "Upcoming Apr 19 Men's · Missouri State at Hawkeye Invitational | ",
 "Upcoming Apr 26 Men's · Missouri State at Conference USA Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Missouri State vs Kansas | L, 0-7",
 "Final Aug 20 Women's · Missouri State at Kansas State | L, 0-3",
 "Final Aug 23 Women's · Missouri State vs Missouri | W, 1-0",
 "Final Aug 27 Women's · Missouri State vs SEMO | T, 0-0",
 "Final Aug 30 Women's · Missouri State vs Central Arkansas | W, 3-0",
 "Final Sep 3 Women's · Missouri State at Iowa State | L, 0-2",
 "Final Sep 6 Women's · Missouri State at Iowa | L, 0-3",
 "Final Sep 10 Women's · Missouri State at Kansas City | L, 0-2",
 "Final Sep 20 Women's · Missouri State vs SIUE | W, 6-1",
 "Final Sep 27 Women's · Missouri State at Delaware | L, 0-1",
 "Final Oct 1 Women's · Missouri State vs Jacksonville State | T, 1-1",
 "Final Oct 4 Women's · Missouri State at Western Kentucky | L, 0-1",
 "Final Oct 11 Women's · Missouri State vs Middle Tennessee | T, 1-1",
 "Final Oct 18 Women's · Missouri State at New Mexico State | T, 1-1",
 "Today Oct 22, 4:00 PM Women's · Missouri State vs Kennesaw State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Missouri State vs Florida International | ",
 "Upcoming Nov 1, 12:00 PM Women's · Missouri State at Liberty | ",
 "Upcoming Nov 8 Women's · Missouri State at CUSA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Missouri State vs Quinnipiac | W, 3-1",
 "Final Aug 23 Men's · Missouri State vs Penn State | W, 3-1",
 "Final Aug 30 Men's · Missouri State vs Chicago State | W, 5-0",
 "Final Sep 5 Men's · Missouri State at UC Irvine | W, 2-1",
 "Final Sep 11 Men's · Missouri State vs FIU | W, 2-1",
 "Final Sep 16 Men's · Missouri State vs Kansas City | T, 3-3",
 "Final Sep 20 Men's · Missouri State at Temple | W, 3-0",
 "Final Sep 26 Men's · Missouri State vs South Florida | W, 3-2",
 "Final Sep 29 Men's · Missouri State vs Central Arkansas | W, 2-0",
 "Final Oct 3 Men's · Missouri State at Memphis | T, 1-1",
 "Final Oct 7 Men's · Missouri State vs Oral Roberts | W, 1-0",
 "Final Oct 11 Men's · Missouri State vs Tulsa | L, 1-2",
 "Final Oct 18 Men's · Missouri State at Florida Atlantic | T, 0-0",
 "Today Oct 22, 7:30 PM Men's · Missouri State vs Bradley | ",
 "Upcoming Oct 28, 7:00 PM Men's · Missouri State vs UAB | ",
 "Upcoming Nov 1, 5:00 PM Men's · Missouri State at Charlotte | ",
 "Upcoming Nov 6 Men's · Missouri State at American Conference Championship | ",
 "Upcoming Nov 11 Men's · Missouri State at American Conference Championship | ",
 "Upcoming Nov 14 Men's · Missouri State at American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Mar 12 Missouri State at Jacksonville State | ",
 "Upcoming Mar 13 Missouri State at Jacksonville State | ",
 "Upcoming Mar 14 Missouri State at Jacksonville State | ",
 "Upcoming Mar 19 Missouri State vs Sam Houston | ",
 "Upcoming Mar 20 Missouri State vs Sam Houston | ",
 "Upcoming Mar 21 Missouri State vs Sam Houston | ",
 "Upcoming Mar 25 Missouri State vs Delaware | ",
 "Upcoming Mar 26 Missouri State vs Delaware | ",
 "Upcoming Mar 27 Missouri State vs Delaware | ",
 "Upcoming Apr 2 Missouri State at Kennesaw State | ",
 "Upcoming Apr 3 Missouri State at Kennesaw State | ",
 "Upcoming Apr 4 Missouri State at Kennesaw State | ",
 "Upcoming Apr 9 Missouri State vs Western Kentucky | ",
 "Upcoming Apr 10 Missouri State vs Western Kentucky | ",
 "Upcoming Apr 11 Missouri State vs Western Kentucky | ",
 "Upcoming Apr 16 Missouri State at Liberty | ",
 "Upcoming Apr 17 Missouri State at Liberty | ",
 "Upcoming Apr 18 Missouri State at Liberty | ",
 "Upcoming Apr 23 Missouri State vs FIU | ",
 "Upcoming Apr 24 Missouri State vs FIU | ",
 "Upcoming Apr 25 Missouri State vs FIU | ",
 "Upcoming Apr 30 Missouri State at New Mexico State | ",
 "Upcoming May 1 Missouri State at New Mexico State | ",
 "Upcoming May 2 Missouri State at New Mexico State | ",
 "Upcoming May 6 Missouri State vs Middle Tennessee | ",
 "Upcoming May 7 Missouri State vs Middle Tennessee | ",
 "Upcoming May 8 Missouri State vs Middle Tennessee | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 2 Missouri State at Southern Illinois | Men's team: W, 196-157 / Women's team: L, 152-199",
 "Final Oct 16 Missouri State at Missouri / Indiana State | Men's team: L, 104-249 / Women's team: L, 83-270",
 "Upcoming Oct 29, 10:00 AM Missouri State at Short Course World Championship Trials | ",
 "Upcoming Oct 30, 4:00 PM Missouri State vs Omaha | ",
 "Upcoming Nov 19 Missouri State at House of Champions Invitational | ",
 "Upcoming Jan 15, 5:00 PM Missouri State at Drury | ",
 "Upcoming Jan 29, 4:00 PM Missouri State vs UIC | ",
 "Upcoming Feb 17 Missouri State at Missouri Valley Conference Championships | ",
 "Upcoming Mar 8 Missouri State at NCAA Zone Diving Championships | ",
 "Upcoming Mar 17 Missouri State at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 Missouri State at NCAA Men's Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Missouri State at Drury Invitational | Completed",
 "Final Oct 2 Missouri State at Washburn Invitational | Completed",
 "Final Oct 15 Missouri State at ITA Regionals | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Missouri State vs Idaho State | W, 3-0",
 "Final Aug 29 Missouri State vs Stephen F. Austin | L, 2-3",
 "Final Aug 30 Missouri State at Wichita State | L, 0-3",
 "Final Sep 3 Missouri State vs Little Rock | W, 3-0",
 "Final Sep 4 Missouri State vs Northwestern State | W, 3-0",
 "Final Sep 5 Missouri State vs Indiana State | W, 3-1",
 "Final Sep 10 Missouri State vs Incarnate Word | W, 3-1",
 "Final Sep 11 Missouri State vs Southern Illinois | W, 3-0",
 "Final Sep 12 Missouri State at Iowa | W, 3-1",
 "Final Sep 17 Missouri State at Kansas City | W, 3-0",
 "Final Sep 18 Missouri State vs Southeast Missouri State | W, 3-1",
 "Final Sep 19 Missouri State vs Saint Louis | L, 2-3",
 "Final Sep 25 Missouri State vs FIU | W, 3-1",
 "Final Sep 26 Missouri State vs FIU | W, 3-0",
 "Final Oct 2 Missouri State at Western Kentucky | L, 0-3",
 "Final Oct 3 Missouri State at Western Kentucky | L, 0-3",
 "Final Oct 9 Missouri State vs Sam Houston | W, 3-1",
 "Final Oct 10 Missouri State vs Sam Houston | W, 3-2",
 "Final Oct 16 Missouri State at Kennesaw State | W, 3-2",
 "Final Oct 17 Missouri State at Kennesaw State | W, 3-2",
 "Upcoming Oct 23, 11:00 AM Missouri State at Delaware | ",
 "Upcoming Oct 24, 11:00 AM Missouri State at Delaware | ",
 "Upcoming Oct 30, 6:00 PM Missouri State vs Middle Tennessee | ",
 "Upcoming Oct 31, 1:00 PM Missouri State vs Middle Tennessee | ",
 "Upcoming Nov 6, 7:00 PM Missouri State at New Mexico State | ",
 "Upcoming Nov 7, 12:00 PM Missouri State at New Mexico State | ",
 "Upcoming Nov 12, 6:00 PM Missouri State vs Jacksonville State | ",
 "Upcoming Nov 13, 6:00 PM Missouri State vs Jacksonville State | ",
 "Upcoming Nov 20 Missouri State at CUSA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Missouri State module checks passed");
