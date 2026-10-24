import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {siueSchool} from '../src/schools/siue.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='siue');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,siueHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/siue-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit siuecougars.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['siue'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',siueSchool.scheduleUrls],['roster',siueSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('siue|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'siuecougars.com',`${key} must stay on siuecougars.com`);
  }
}
const parity={"Baseball":{"schedule":["https://siuecougars.com/sports/baseball/schedule"],"roster":["https://siuecougars.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://siuecougars.com/sports/mens-basketball/schedule","https://siuecougars.com/sports/womens-basketball/schedule"],"roster":["https://siuecougars.com/sports/mens-basketball/roster","https://siuecougars.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://siuecougars.com/sports/womens-cross-country/schedule","https://siuecougars.com/sports/mens-cross-country/schedule"],"roster":["https://siuecougars.com/sports/womens-cross-country/roster","https://siuecougars.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://siuecougars.com/sports/mens-golf/schedule"],"roster":["https://siuecougars.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://siuecougars.com/sports/womens-soccer/schedule","https://siuecougars.com/sports/mens-soccer/schedule"],"roster":["https://siuecougars.com/sports/womens-soccer/roster","https://siuecougars.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://siuecougars.com/sports/softball/schedule"],"roster":["https://siuecougars.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://siuecougars.com/sports/womens-tennis/schedule"],"roster":["https://siuecougars.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://siuecougars.com/sports/womens-track-and-field/schedule","https://siuecougars.com/sports/mens-track-and-field/schedule"],"roster":["https://siuecougars.com/sports/womens-track-and-field/roster","https://siuecougars.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://siuecougars.com/sports/womens-volleyball/schedule"],"roster":["https://siuecougars.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://siuecougars.com/sports/wrestling/schedule"],"roster":["https://siuecougars.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'siue|"+sport+"':"),`${sport} routes must live in the SIUE module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://siuecougars.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.siueHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=siue)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 3:00 PM Men's · SIUE vs Arkansas State | ",
 "Upcoming Oct 28, 7:00 PM Men's · SIUE at Bradley | ",
 "Upcoming Nov 2, 6:00 PM Men's · SIUE vs Eureka College | ",
 "Upcoming Nov 4, 6:00 PM Men's · SIUE vs Concordia Chicago | ",
 "Upcoming Nov 7, 4:00 PM Men's · SIUE at Lipscomb | ",
 "Upcoming Nov 9, 7:00 PM Men's · SIUE at Missouri | ",
 "Upcoming Nov 13, 7:00 PM Men's · SIUE at Duke | ",
 "Upcoming Nov 16, 7:00 PM Men's · SIUE at North Dakota | ",
 "Upcoming Nov 19, 6:00 PM Men's · SIUE vs North Park | ",
 "Upcoming Nov 25, 6:00 PM Men's · SIUE vs Northern Illinois | ",
 "Upcoming Nov 29, 3:00 PM Men's · SIUE vs UTSA | ",
 "Upcoming Dec 2, 6:00 PM Men's · SIUE at Indiana State | ",
 "Upcoming Dec 5, 3:00 PM Men's · SIUE vs Denver | ",
 "Upcoming Dec 9, 6:00 PM Men's · SIUE vs North Dakota | ",
 "Upcoming Dec 13, 3:00 PM Men's · SIUE vs Missouri Baptist | ",
 "Upcoming Dec 18, 6:00 PM Men's · SIUE at Valparaiso | ",
 "Upcoming Dec 21, 2:00 PM Men's · SIUE at Kansas City | ",
 "Upcoming Dec 30, 8:00 PM Men's · SIUE vs Lindenwood | ",
 "Upcoming Jan 2, 3:00 PM Men's · SIUE at Western Illinois | ",
 "Upcoming Jan 9, 3:30 PM Men's · SIUE at Tennessee State | ",
 "Upcoming Jan 14, 7:30 PM Men's · SIUE vs UT Martin | ",
 "Upcoming Jan 16, 3:30 PM Men's · SIUE vs Southeast Missouri | ",
 "Upcoming Jan 21, 7:30 PM Men's · SIUE at Southern Indiana | ",
 "Upcoming Jan 23, 2:30 PM Men's · SIUE at Morehead State | ",
 "Upcoming Jan 28, 8:00 PM Men's · SIUE at UT Martin | ",
 "Upcoming Jan 30, 3:30 PM Men's · SIUE vs Western Illinois | ",
 "Upcoming Feb 6, 3:30 PM Men's · SIUE at Eastern Illinois | ",
 "Upcoming Feb 11, 7:30 PM Men's · SIUE vs Morehead State | ",
 "Upcoming Feb 13, 3:30 PM Men's · SIUE at Southeast Missouri | ",
 "Upcoming Feb 17, 7:00 PM Men's · SIUE vs Tennessee State | ",
 "Upcoming Feb 20, 3:30 PM Men's · SIUE at Lindenwood | ",
 "Upcoming Feb 25, 7:30 PM Men's · SIUE vs Eastern Illinois | ",
 "Upcoming Feb 27, 3:30 PM Men's · SIUE vs Southern Indiana | ",
 "Upcoming Mar 3 Men's · SIUE at Ohio Valley Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 26, 6:00 PM Women's · SIUE at Illinois State | ",
 "Upcoming Nov 3, 6:00 PM Women's · SIUE vs Judson | ",
 "Upcoming Nov 5, 5:30 PM Women's · SIUE at IU Indy | ",
 "Upcoming Nov 8, 1:00 PM Women's · SIUE vs Milwaukee | ",
 "Upcoming Nov 12, 11:00 AM Women's · SIUE vs Central Methodist (Mo.) | ",
 "Upcoming Nov 14, 1:00 PM Women's · SIUE vs Eureka College | ",
 "Upcoming Nov 17, 6:00 PM Women's · SIUE at Northern Illinois | ",
 "Upcoming Nov 22, 1:00 PM Women's · SIUE vs Valparaiso | ",
 "Upcoming Nov 24, 5:30 PM Women's · SIUE at Missouri | ",
 "Upcoming Dec 2, 11:00 AM Women's · SIUE at Indiana State | ",
 "Upcoming Dec 5 Women's · SIUE at Murray State | ",
 "Upcoming Dec 7, 6:00 PM Women's · SIUE vs SIU Carbondale | ",
 "Upcoming Dec 9, 6:00 PM Women's · SIUE at Oklahoma | ",
 "Upcoming Dec 19, 11:00 AM Women's · SIUE vs Kent State | ",
 "Upcoming Dec 20, 11:00 AM Women's · SIUE vs North Florida | ",
 "Upcoming Dec 22, 1:00 PM Women's · SIUE vs St. Francis (Ill.) | ",
 "Upcoming Dec 30, 5:00 PM Women's · SIUE vs Lindenwood | ",
 "Upcoming Jan 2, 1:00 PM Women's · SIUE at Western Illinois | ",
 "Upcoming Jan 9, 1:00 PM Women's · SIUE at Tennessee State | ",
 "Upcoming Jan 14, 5:00 PM Women's · SIUE vs UT Martin | ",
 "Upcoming Jan 16, 1:00 PM Women's · SIUE vs Southeast Missouri | ",
 "Upcoming Jan 21, 5:00 PM Women's · SIUE at Southern Indiana | ",
 "Upcoming Jan 23, 12:00 PM Women's · SIUE at Morehead State | ",
 "Upcoming Jan 28, 5:00 PM Women's · SIUE at UT Martin | ",
 "Upcoming Jan 30, 1:00 PM Women's · SIUE vs Western Illinois | ",
 "Upcoming Feb 6, 1:00 PM Women's · SIUE at Eastern Illinois | ",
 "Upcoming Feb 11, 5:00 PM Women's · SIUE vs Morehead State | ",
 "Upcoming Feb 13, 1:30 PM Women's · SIUE at Southeast Missouri | ",
 "Upcoming Feb 18, 5:00 PM Women's · SIUE vs Tennessee State | ",
 "Upcoming Feb 20, 1:00 PM Women's · SIUE at Lindenwood | ",
 "Upcoming Feb 25, 5:00 PM Women's · SIUE vs Eastern Illinois | ",
 "Upcoming Feb 27, 1:00 PM Women's · SIUE vs Southern Indiana | ",
 "Upcoming Mar 3 Women's · SIUE at Ohio Valley Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · SIUE at SEMO Redhawk Invite (5K) | 2nd of 4",
 "Final Sep 18 Women's · SIUE at SIUE Cougar XC Challenge (5K) | 2nd of 4",
 "Final Oct 2 Women's · SIUE at Nike XC Town Twilight (6K) | 9th of 17",
 "Final Oct 16 Women's · SIUE at Bradley Pink Invite (6K) | 23rd of 25",
 "Upcoming Oct 30, 9:00 AM Women's · SIUE at OVC Championships (6K) | ",
 "Upcoming Nov 13, 11:00 AM Women's · SIUE at NCAA Midwest Regionals (6K) | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · SIUE at SEMO Redhawk Invite (5K) | 2nd of 3",
 "Final Sep 18 Men's · SIUE at SIUE Cougar XC Challenge (8K) | Completed",
 "Final Oct 2 Men's · SIUE at Nike XC Town Twilight (8K) | 11th of 15",
 "Final Oct 16 Men's · SIUE at Bradley Pink Invite (8K) | 25th of 25",
 "Upcoming Oct 30, 9:00 AM Men's · SIUE at OVC Championships (8K) | ",
 "Upcoming Nov 13, 12:00 PM Men's · SIUE at NCAA Midwest Regionals (10K) | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 SIUE at UT Martin Grover Page Classic | 4th of 10",
 "Final Sep 19 SIUE at Air Force Gene Miranda Falcon Invitational | 18th of 18",
 "Final Sep 28 SIUE at SIUE Dolenc Invitational | 2nd of 17",
 "Final Oct 12 SIUE at Arkansas State Bubba Barnett Intercollegiate | T15th of 17",
 "Final Oct 19 SIUE at Missouri State Twin Oaks Intercollegiate | 4th of 7",
 "Upcoming Feb 18 SIUE at UT Martin/SIUE Matchplay Dual | ",
 "Upcoming Feb 28 SIUE at Loyola Intercollegiate | ",
 "Upcoming Mar 5 SIUE at Bandon Dunes Championships | ",
 "Upcoming Mar 29 SIUE at Butler Don Benbow Invitational | ",
 "Upcoming Apr 7 SIUE at Murray State Racer Intercollegiate | ",
 "Upcoming Apr 18 SIUE at Iowa Hawkeye Invitational | ",
 "Upcoming Apr 25 SIUE at Ohio Valley Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · SIUE at Alabama A&M | W, 2-1",
 "Final Aug 16 Women's · SIUE vs Valparaiso | T, 2-2",
 "Final Aug 20 Women's · SIUE vs Austin Peay | W, 3-0",
 "Final Aug 23 Women's · SIUE vs IU Indy | T, 2-2",
 "Final Aug 30 Women's · SIUE at Drake | L, 0-3",
 "Final Sep 6 Women's · SIUE vs Indiana State | T, 2-2",
 "Final Sep 10 Women's · SIUE at SIU Carbondale | L, 0-1",
 "Final Sep 20 Women's · SIUE at Missouri State | L, 1-6",
 "Final Sep 27 Women's · SIUE vs Eastern Illinois | W, 4-2",
 "Final Oct 4 Women's · SIUE at Morehead State | W, 4-0",
 "Final Oct 10 Women's · SIUE vs UT Martin | W, 2-1",
 "Final Oct 15 Women's · SIUE at Western Illinois | L, 0-2",
 "Final Oct 18 Women's · SIUE vs Southern Indiana | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · SIUE at Lindenwood | ",
 "Upcoming Nov 1, 1:00 PM Women's · SIUE at Southeast Missouri | ",
 "Upcoming Nov 5 Women's · SIUE at Ohio Valley Conference | ",
 "Upcoming Nov 8 Women's · SIUE at Ohio Valley Conference | ",
 "Upcoming Nov 12 Women's · SIUE at Ohio Valley Conference | ",
 "Upcoming Nov 15 Women's · SIUE at Ohio Valley Conference | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · SIUE at Kansas City | L, 0-5",
 "Final Aug 27 Men's · SIUE at Michigan State | L, 0-4",
 "Final Aug 30 Men's · SIUE at Michigan | L, 2-3",
 "Final Sep 6 Men's · SIUE vs Saint Louis | W, 1-0",
 "Final Sep 10 Men's · SIUE at Loyola (Ill.) | L, 0-1",
 "Final Sep 16 Men's · SIUE vs Bradley | T, 1-1",
 "Final Sep 20 Men's · SIUE vs Webster | W, 3-0",
 "Final Sep 26 Men's · SIUE vs Southern Indiana | W, 3-1",
 "Final Oct 1 Men's · SIUE vs Western Illinois | W, 1-0",
 "Final Oct 4 Men's · SIUE at Eastern Illinois | L, 0-1",
 "Final Oct 8 Men's · SIUE at Incarnate Word | T, 1-1",
 "Final Oct 11 Men's · SIUE at Houston Christian | W, 2-1",
 "Final Oct 15 Men's · SIUE vs Lindenwood | L, 0-4",
 "Final Oct 18 Men's · SIUE vs UTRGV | W, 3-0",
 "Upcoming Oct 24, 7:00 PM Men's · SIUE at Southern Indiana | ",
 "Upcoming Oct 29, 3:00 PM Men's · SIUE at Western Illinois | ",
 "Upcoming Nov 1, 1:00 PM Men's · SIUE vs Eastern Illinois | ",
 "Upcoming Nov 8 Men's · SIUE at Ohio Valley Conference Championship | ",
 "Upcoming Nov 11 Men's · SIUE at Ohio Valley Conference Championship | ",
 "Upcoming Nov 14 Men's · SIUE at Ohio Valley Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 4 SIUE at Cougar Invite | Completed",
 "Final Sep 11 SIUE at Lindenwood Invite | Completed",
 "Final Sep 25 SIUE at OVC Fall Championship | Completed",
 "Final Oct 3 SIUE at Bearcat Hidden Duals | Completed",
 "Final Oct 8 SIUE at ITA Regional Championship | Completed",
 "Upcoming Nov 6 SIUE at ITA Conference Masters Championships | ",
 "Upcoming Jan 22, 2:30 PM SIUE vs Illinois Springfield | ",
 "Upcoming Jan 29, 2:00 PM SIUE vs Marquette | ",
 "Upcoming Jan 30, 2:30 PM SIUE vs Missouri Baptist | ",
 "Upcoming Feb 6, 4:30 PM SIUE at Illinois State | ",
 "Upcoming Feb 12, 2:30 PM SIUE vs Bradley | ",
 "Upcoming Feb 13, 2:30 PM SIUE vs Chicago State | ",
 "Upcoming Feb 21, 11:00 AM SIUE at Butler | ",
 "Upcoming Feb 27 SIUE vs St. Thomas (Minn.) | ",
 "Upcoming Feb 28 SIUE at Northern Iowa | ",
 "Upcoming Mar 5, 2:30 PM SIUE vs William Woods | ",
 "Upcoming Mar 8, 3:00 PM SIUE at Western Kentucky | ",
 "Upcoming Mar 10 SIUE at Alabama A&M | ",
 "Upcoming Mar 12, 2:00 PM SIUE at Tennessee State | ",
 "Upcoming Mar 27, 1:00 PM SIUE vs Southeast Missouri | ",
 "Upcoming Apr 2, 1:00 PM SIUE vs Southern Indiana | ",
 "Upcoming Apr 9, 2:00 PM SIUE vs Lindenwood | ",
 "Upcoming Apr 17, 1:00 PM SIUE at Western Illinois | ",
 "Upcoming Apr 23 SIUE at OVC Championships | ",
 "Upcoming May 8 SIUE at NCAA Division I Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · SIUE at Saluki Fast Start | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · SIUE at Saluki Fast Start | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 SIUE at Arkansas | L, 0-3",
 "Final Aug 29 SIUE vs UT Arlington | L, 2-3",
 "Final Aug 29 SIUE vs UTSA | L, 2-3",
 "Final Sep 3 SIUE at Denver | L, 1-3",
 "Final Sep 4 SIUE vs Marist | L, 2-3",
 "Final Sep 5 SIUE vs Idaho | L, 1-3",
 "Final Sep 11 SIUE vs Arkansas Pine Bluff | W, 3-0",
 "Final Sep 11 SIUE vs Chicago State | W, 3-0",
 "Final Sep 12 SIUE vs Northern Illinois | L, 0-3",
 "Final Sep 18 SIUE vs SIU Carbondale | L, 0-3",
 "Final Sep 18 SIUE at Austin Peay | L, 0-3",
 "Final Sep 19 SIUE vs Gardner-Webb | L, 1-3",
 "Final Sep 25 SIUE vs UT Martin | L, 0-3",
 "Final Sep 26 SIUE vs UT Martin | W, 3-2",
 "Final Oct 2 SIUE at Southeast Missouri | L, 0-3",
 "Final Oct 3 SIUE at Southeast Missouri | L, 0-3",
 "Final Oct 9 SIUE vs Tennessee State | W, 3-0",
 "Final Oct 10 SIUE vs Tennessee State | W, 3-0",
 "Final Oct 21 SIUE at Lindenwood | L, 0-3",
 "Today Oct 23, 6:00 PM SIUE at Lindenwood | ",
 "Upcoming Oct 30, 6:00 PM SIUE at Western Illinois | ",
 "Upcoming Oct 31, 2:00 PM SIUE at Western Illinois | ",
 "Upcoming Nov 6, 6:00 PM SIUE vs Morehead State | ",
 "Upcoming Nov 7, 2:00 PM SIUE vs Morehead State | ",
 "Upcoming Nov 12, 6:00 PM SIUE at Eastern Illinois | ",
 "Upcoming Nov 13, 4:00 PM SIUE at Eastern Illinois | ",
 "Upcoming Nov 17, 6:00 PM SIUE vs Southern Indiana | ",
 "Upcoming Nov 18, 5:00 PM SIUE vs Southern Indiana | ",
 "Upcoming Nov 22 SIUE at Ohio Valley Conference Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM SIUE at Cowboy Invite | ",
 "Upcoming Nov 8, 6:30 PM SIUE vs Friends (Kan.) | ",
 "Upcoming Nov 8, 8:00 PM SIUE vs Maryville | ",
 "Upcoming Nov 13, 6:00 PM SIUE vs George Mason | ",
 "Upcoming Nov 22, 11:00 AM SIUE vs Princeton | ",
 "Upcoming Nov 22, 1:00 PM SIUE vs Davidson | ",
 "Upcoming Nov 22, 3:00 PM SIUE at Northwestern | ",
 "Upcoming Dec 1, 7:00 PM SIUE at Minnesota | ",
 "Upcoming Dec 6, 10:00 AM SIUE vs Cougar Clash | ",
 "Upcoming Dec 18, 6:00 PM SIUE at Central Michigan | ",
 "Upcoming Dec 29, 9:30 AM SIUE at Midlands | ",
 "Upcoming Jan 8, 6:00 PM SIUE vs Ohio | ",
 "Upcoming Jan 9, 1:00 PM SIUE vs Bloomsburg | ",
 "Upcoming Jan 16, 12:00 PM SIUE at Rider | ",
 "Upcoming Feb 5, 6:00 PM SIUE at Lock Haven | ",
 "Upcoming Feb 12, 6:00 PM SIUE vs Buffalo | ",
 "Upcoming Feb 19, 6:00 PM SIUE at Kent State | ",
 "Upcoming Mar 5 SIUE at Mid-American Conference Championships | ",
 "Upcoming Mar 18 SIUE at NCAA Division I Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("SIUE module checks passed");
