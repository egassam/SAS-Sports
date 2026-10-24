import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {moreheadStateSchool} from '../src/schools/morehead-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='morehead-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,moreheadStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/morehead-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit msueagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['morehead-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',moreheadStateSchool.scheduleUrls],['roster',moreheadStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('morehead-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'msueagles.com',`${key} must stay on msueagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://msueagles.com/sports/baseball/schedule"],"roster":["https://msueagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://msueagles.com/sports/mens-basketball/schedule","https://msueagles.com/sports/womens-basketball/schedule"],"roster":["https://msueagles.com/sports/mens-basketball/roster","https://msueagles.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://msueagles.com/sports/womens-beach-volleyball/schedule"],"roster":["https://msueagles.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://msueagles.com/sports/womens-cross-country/schedule","https://msueagles.com/sports/mens-cross-country/schedule"],"roster":["https://msueagles.com/sports/womens-cross-country/roster","https://msueagles.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://msueagles.com/sports/football/schedule"],"roster":["https://msueagles.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://msueagles.com/sports/womens-golf/schedule","https://msueagles.com/sports/mens-golf/schedule"],"roster":["https://msueagles.com/sports/womens-golf/roster","https://msueagles.com/sports/mens-golf/roster"],"combined":true},"Rifle":{"schedule":["https://msueagles.com/sports/mens-rifle/schedule"],"roster":["https://msueagles.com/sports/mens-rifle/roster"],"combined":false},"Soccer":{"schedule":["https://msueagles.com/sports/womens-soccer/schedule"],"roster":["https://msueagles.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://msueagles.com/sports/softball/schedule"],"roster":["https://msueagles.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://msueagles.com/sports/womens-track-and-field/schedule","https://msueagles.com/sports/mens-track-and-field/schedule"],"roster":["https://msueagles.com/sports/womens-track-and-field/roster","https://msueagles.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://msueagles.com/sports/womens-volleyball/schedule"],"roster":["https://msueagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'morehead-state|"+sport+"':"),`${sport} routes must live in the Morehead State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://msueagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.moreheadStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=morehead-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Morehead State at Eastern Kentucky (Exhibition) | L, 67-78",
 "Upcoming Oct 24, 7:00 PM Men's · Morehead State at Dayton (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Morehead State at Western Kentucky | ",
 "Upcoming Nov 5, 5:15 PM Men's · Morehead State vs Virginia University-Lynchburg | ",
 "Upcoming Nov 7, 12:00 PM Men's · Morehead State at Louisville | ",
 "Upcoming Nov 14, 7:30 PM Men's · Morehead State vs IU Indy | ",
 "Upcoming Nov 16, 11:00 AM Men's · Morehead State vs Miami-Hamilton (Ohio) | ",
 "Upcoming Nov 18, 7:00 PM Men's · Morehead State at Ohio | ",
 "Upcoming Nov 21, 7:00 PM Men's · Morehead State at Elon | ",
 "Upcoming Nov 28, 7:00 PM Men's · Morehead State vs Charleston Southern | ",
 "Upcoming Nov 29, 4:00 PM Men's · Morehead State at East Tennessee | ",
 "Upcoming Dec 2, 7:45 PM Men's · Morehead State vs Bellarmine | ",
 "Upcoming Dec 5, 2:00 PM Men's · Morehead State vs Presbyterian | ",
 "Upcoming Dec 15, 5:00 PM Men's · Morehead State vs North Alabama | ",
 "Upcoming Dec 16, 8:00 PM Men's · Morehead State at Tennessee | ",
 "Upcoming Dec 19, 4:30 PM Men's · Morehead State at UNC Asheville | ",
 "Upcoming Dec 21, 1:00 PM Men's · Morehead State vs Kentucky Christian | ",
 "Upcoming Dec 30, 9:00 PM Men's · Morehead State at UT Martin | ",
 "Upcoming Jan 2, 3:30 PM Men's · Morehead State vs Asbury (Ky.) | ",
 "Upcoming Jan 7, 7:45 PM Men's · Morehead State vs Eastern Illinois | ",
 "Upcoming Jan 9, 3:30 PM Men's · Morehead State vs Lindenwood | ",
 "Upcoming Jan 13, 7:45 PM Men's · Morehead State vs Southern Indiana | ",
 "Upcoming Jan 16, 12:00 PM Men's · Morehead State at Tennessee State | ",
 "Upcoming Jan 21, 7:45 PM Men's · Morehead State vs Western Illinois | ",
 "Upcoming Jan 23, 3:30 PM Men's · Morehead State vs SIUE | ",
 "Upcoming Jan 28, 8:30 PM Men's · Morehead State at Lindenwood | ",
 "Upcoming Jan 30, 4:30 PM Men's · Morehead State at Southern Indiana | ",
 "Upcoming Feb 4, 7:45 PM Men's · Morehead State vs Southeast Missouri | ",
 "Upcoming Feb 6, 3:30 PM Men's · Morehead State vs Tennessee State | ",
 "Upcoming Feb 11, 8:30 PM Men's · Morehead State at SIUE | ",
 "Upcoming Feb 13, 4:30 PM Men's · Morehead State at Western Illinois | ",
 "Upcoming Feb 20, 3:30 PM Men's · Morehead State vs UT Martin | ",
 "Upcoming Feb 25, 8:30 PM Men's · Morehead State at Southeast Missouri | ",
 "Upcoming Feb 27, 4:30 PM Men's · Morehead State at Eastern Illinois | ",
 "Upcoming Mar 3 Men's · Morehead State at Ohio Valley Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Morehead State at Kentucky | ",
 "Upcoming Nov 5, 7:45 PM Women's · Morehead State vs Eastern Kentucky | ",
 "Upcoming Nov 9, 7:30 PM Women's · Morehead State at Vanderbilt | ",
 "Upcoming Nov 12, 8:00 PM Women's · Morehead State at Murray State | ",
 "Upcoming Nov 15, 6:00 PM Women's · Morehead State vs IU Indy | ",
 "Upcoming Nov 19, 6:00 PM Women's · Morehead State vs Tusculum (Tenn.) | ",
 "Upcoming Nov 22, 2:00 PM Women's · Morehead State at Western Carolina | ",
 "Upcoming Nov 27, 12:00 PM Women's · Morehead State vs Buffalo | ",
 "Upcoming Nov 28, 12:00 PM Women's · Morehead State vs Western Kentucky | ",
 "Upcoming Dec 2, 5:15 PM Women's · Morehead State vs Louisiana | ",
 "Upcoming Dec 6, 2:00 PM Women's · Morehead State at East Tennessee | ",
 "Upcoming Dec 13, 1:00 PM Women's · Morehead State vs Northern Kentucky | ",
 "Upcoming Dec 17, 11:00 AM Women's · Morehead State vs Alice Lloyd (Ky.) | ",
 "Upcoming Dec 19, 1:00 PM Women's · Morehead State vs Davis & Elkins (W.Va.) | ",
 "Upcoming Dec 21, 2:00 PM Women's · Morehead State at Tennessee | ",
 "Upcoming Dec 30, 6:30 PM Women's · Morehead State at UT Martin | ",
 "Upcoming Jan 2, 1:00 PM Women's · Morehead State vs Kentucky Christian | ",
 "Upcoming Jan 7, 5:15 PM Women's · Morehead State vs Eastern Illinois | ",
 "Upcoming Jan 9, 1:00 PM Women's · Morehead State vs Lindenwood | ",
 "Upcoming Jan 13, 5:15 PM Women's · Morehead State vs Southern Indiana | ",
 "Upcoming Jan 16, 3:00 PM Women's · Morehead State at Tennessee State | ",
 "Upcoming Jan 21, 5:15 PM Women's · Morehead State vs Western Illinois | ",
 "Upcoming Jan 23, 1:00 PM Women's · Morehead State vs SIUE | ",
 "Upcoming Jan 28, 6:00 PM Women's · Morehead State at Lindenwood | ",
 "Upcoming Jan 30, 2:00 PM Women's · Morehead State at Southern Indiana | ",
 "Upcoming Feb 4, 5:15 PM Women's · Morehead State vs Southeast Missouri | ",
 "Upcoming Feb 6, 1:00 PM Women's · Morehead State vs Tennessee State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Morehead State at SIUE | ",
 "Upcoming Feb 13, 2:00 PM Women's · Morehead State at Western Illinois | ",
 "Upcoming Feb 20, 1:00 PM Women's · Morehead State vs UT Martin | ",
 "Upcoming Feb 25, 6:00 PM Women's · Morehead State at Southeast Missouri | ",
 "Upcoming Feb 27, 2:00 PM Women's · Morehead State at Eastern Illinois | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Morehead State at EKU Invitational | 2nd of 2",
 "Final Sep 18 Women's · Morehead State at Southern Showcase | 23rd of 31",
 "Final Oct 3 Women's · Morehead State at Swags Louisville Cross Country Classic | 12th of 24 (Gold Division)",
 "Final Oct 16 Women's · Morehead State at Eagle/Knight Invitational | 4th of 5",
 "Upcoming Oct 30 Women's · Morehead State at Ohio Valley Conference Championship | ",
 "Upcoming Nov 13 Women's · Morehead State at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Morehead State at EKU Invitational | 2nd of 2",
 "Final Sep 18 Men's · Morehead State at Southern Showcase | 22nd of 29",
 "Final Oct 3 Men's · Morehead State at Swags Louisville Cross Country Classic | 18th of 24 (Gold Division)",
 "Final Oct 16 Men's · Morehead State at Eagle/Knight Invitational | 2nd of 5",
 "Upcoming Oct 30 Men's · Morehead State at Ohio Valley Conference Championship | ",
 "Upcoming Nov 13 Men's · Morehead State at NCAA Southeast Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Morehead State vs Ohio Dominican | L, 40-42",
 "Final Sep 3 Morehead State vs Kentucky Christian | W, 75-24",
 "Final Sep 12 Morehead State at Austin Peay | L, 7-63",
 "Final Sep 19 Morehead State at Western Illinois | L, 2-59",
 "Final Oct 3 Morehead State vs Valparaiso | L, 3-37",
 "Final Oct 10 Morehead State at Dayton | L, 28-56",
 "Final Oct 17 Morehead State at Davidson | L, 31-34",
 "Upcoming Oct 24, 2:00 PM Morehead State vs Stetson | ",
 "Upcoming Oct 31, 1:00 PM Morehead State vs Drake | ",
 "Upcoming Nov 7, 12:00 PM Morehead State at Marist | ",
 "Upcoming Nov 14, 12:00 PM Morehead State vs Presbyterian | ",
 "Upcoming Nov 21, 1:00 PM Morehead State at Butler | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Morehead State at Golfweek Fall Challenge | 14th of 23",
 "Final Sep 14 Women's · Morehead State at Brittany Kelly Classic | 3rd of 14",
 "Final Sep 26 Women's · Morehead State at Fighting Irish Classic | 13th of 14",
 "Final Oct 12 Women's · Morehead State at Lady Red Wolves Classic | 10th of 13",
 "Upcoming Feb 19 Women's · Morehead State at 24th Annual Rio Verde Invitational | ",
 "Upcoming Mar 8 Women's · Morehead State at Babs Steffens Invitational | ",
 "Upcoming Mar 14 Women's · Morehead State at MSU Southern California Invitational | ",
 "Upcoming Mar 27 Women's · Morehead State at Liz Murphy Collegiate Classic | ",
 "Upcoming Apr 4 Women's · Morehead State at Ironwood Invitational | ",
 "Upcoming Apr 18 Women's · Morehead State at Ohio Valley Conference Championship | ",
 "Upcoming May 10 Women's · Morehead State at NCAA Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Morehead State at Chaney-Denham-Landrum Shootout | 3rd of 3",
 "Final Sep 14 Men's · Morehead State at Joe Feaganes Invitational | 5th of 14",
 "Final Sep 28 Men's · Morehead State at SIUE Dolenc Invitational | 9th of 17",
 "Final Oct 2 Men's · Morehead State at The Indy at Forest Hills (Individuals) | No team score (individuals only)",
 "Final Oct 5 Men's · Morehead State at Kemper Lakes Intercollegiate | 5th of 12",
 "Final Oct 19 Men's · Morehead State at Xavier Invitational | 9th of 9",
 "Upcoming Feb 20 Men's · Morehead State at Savannah Intercollegiate | ",
 "Upcoming Mar 5 Men's · Morehead State at Bandon Dunes Championship | ",
 "Upcoming Mar 12 Men's · Morehead State at Jackrabbit Invitational | ",
 "Upcoming Mar 20 Men's · Morehead State at Carpenter-Chaney Classic | ",
 "Upcoming Mar 22 Men's · Morehead State at UT Martin | ",
 "Upcoming Apr 5 Men's · Morehead State at Racer Intercollegiate | ",
 "Upcoming Apr 11 Men's · Morehead State at Wright State Invitational | ",
 "Upcoming Apr 25 Men's · Morehead State at Ohio Valley Conference Championship | ",
 "Upcoming May 17 Men's · Morehead State at NCAA Regionals | "
]);
  const v_mensrifle=parse("Rifle","mens-rifle");
  assert.deepEqual(v_mensrifle.map(line),[
 "Final Oct 3 Morehead State vs Mount Aloysius (Pa.) | W, 4669-4591",
 "Final Oct 4 Morehead State vs Mount Aloysius (Pa.) | W, 4689-4592",
 "Final Oct 10 Morehead State at Jacksonville State | W, 4695-4677",
 "Final Oct 17 Morehead State vs Murray State | L, 4660-4712",
 "Final Oct 23 Morehead State vs UT Martin | W, 4672-4582",
 "Upcoming Oct 24, 8:00 AM Morehead State at UT Martin | ",
 "Upcoming Oct 31, 8:00 AM Morehead State at Jacksonville State | ",
 "Upcoming Nov 7, 9:00 AM Morehead State at Memphis | ",
 "Upcoming Nov 8, 9:00 AM Morehead State at UT Martin | ",
 "Upcoming Nov 16, 8:00 AM Morehead State at Akron | ",
 "Upcoming Jan 23, 9:00 AM Morehead State at Tri-Match (Ohio State and Mount Aloysius) | ",
 "Upcoming Jan 24, 9:00 AM Morehead State at Tri-Match (Ohio State and Mount Aloysius) | ",
 "Upcoming Feb 6, 8:00 AM Morehead State at OVC Championship - Smallbore | ",
 "Upcoming Feb 7, 8:00 AM Morehead State at OVC Championship - Air Rifle | ",
 "Upcoming Feb 20, 8:00 AM Morehead State at NCAA Qualfier (at Kentucky) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Morehead State at Marshall | L, 1-3",
 "Final Aug 16 Morehead State vs Brescia (Ky.) | W, 2-0",
 "Final Aug 20 Morehead State at Miami (Ohio) | L, 1-2",
 "Final Aug 23 Morehead State vs Cleveland State | W, 2-0",
 "Final Aug 27 Morehead State at Eastern Kentucky | L, 0-1",
 "Final Aug 30 Morehead State vs Northern Kentucky | W, 2-0",
 "Final Sep 3 Morehead State vs Mercyhurst | W, 2-1",
 "Final Sep 6 Morehead State vs Chattanooga | L, 1-2",
 "Final Sep 10 Morehead State vs Indiana State | L, 1-2",
 "Final Sep 17 Morehead State at Alabama A&M | W, 1-0",
 "Final Sep 20 Morehead State at Bellarmine | L, 1-2",
 "Final Sep 27 Morehead State at Lindenwood | L, 0-3",
 "Final Oct 4 Morehead State vs SIUE | L, 0-4",
 "Final Oct 11 Morehead State at Southeast Missouri | L, 1-2",
 "Final Oct 15 Morehead State at UT Martin | T, 0-0",
 "Final Oct 18 Morehead State vs Eastern Illinois | L, 0-1",
 "Upcoming Oct 25, 2:00 PM Morehead State at Western Illinois | ",
 "Upcoming Nov 1, 2:00 PM Morehead State vs Southern Indiana | ",
 "Upcoming Nov 5 Morehead State at Ohio Valley Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 21 Morehead State vs Northern Kentucky (Exhibition) | L, 2-3",
 "Final Aug 22 Morehead State at Eastern Kentucky (Exhibition) | L, 0-3",
 "Final Aug 28 Morehead State vs Fairfield | W, 3-2",
 "Final Aug 29 Morehead State at Tennessee | L, 0-3",
 "Final Aug 30 Morehead State vs Colgate | L, 2-3",
 "Final Sep 4 Morehead State at Mercyhurst | W, 3-0",
 "Final Sep 4 Morehead State vs Cleveland State | W, 3-1",
 "Final Sep 5 Morehead State vs Siena | W, 3-1",
 "Final Sep 10 Morehead State vs Cincinnati | L, 0-3",
 "Final Sep 12 Morehead State vs Michigan State | L, 0-3",
 "Final Sep 18 Morehead State at Marshall | L, 0-3",
 "Final Sep 19 Morehead State vs Marshall | L, 0-3",
 "Final Sep 25 Morehead State vs Lindenwood | L, 0-3",
 "Final Sep 26 Morehead State vs Lindenwood | L, 0-3",
 "Final Oct 2 Morehead State at UT Martin | W, 3-1",
 "Final Oct 3 Morehead State at UT Martin | W, 3-1",
 "Final Oct 9 Morehead State at Southern Indiana | W, 3-2",
 "Final Oct 10 Morehead State at Southern Indiana | L, 0-3",
 "Final Oct 16 Morehead State vs Southeast Missouri | L, 0-3",
 "Final Oct 17 Morehead State vs Southeast Missouri | L, 0-3",
 "Today Oct 23, 7:00 PM Morehead State at Tennessee State | ",
 "Upcoming Oct 24, 1:00 PM Morehead State at Tennessee State | ",
 "Upcoming Oct 29, 5:00 PM Morehead State vs Eastern Illinois | ",
 "Upcoming Oct 30, 12:00 PM Morehead State vs Eastern Illinois | ",
 "Upcoming Nov 6, 7:00 PM Morehead State at SIUE | ",
 "Upcoming Nov 7, 3:00 PM Morehead State at SIUE | ",
 "Upcoming Nov 12, 6:00 PM Morehead State vs Western Illinois | ",
 "Upcoming Nov 13, 5:00 PM Morehead State vs Western Illinois | "
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
  ownRecapsOnly(v_mensrifle,"Rifle mens-rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Morehead State module checks passed");
