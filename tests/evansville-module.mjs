import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {evansvilleSchool} from '../src/schools/evansville.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='evansville');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,evansvilleHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/evansville-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gopurpleaces.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['evansville'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',evansvilleSchool.scheduleUrls],['roster',evansvilleSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('evansville|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gopurpleaces.com',`${key} must stay on gopurpleaces.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gopurpleaces.com/sports/baseball/schedule"],"roster":["https://gopurpleaces.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gopurpleaces.com/sports/mens-basketball/schedule","https://gopurpleaces.com/sports/womens-basketball/schedule"],"roster":["https://gopurpleaces.com/sports/mens-basketball/roster","https://gopurpleaces.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gopurpleaces.com/sports/womens-cross-country/schedule","https://gopurpleaces.com/sports/mens-cross-country/schedule"],"roster":["https://gopurpleaces.com/sports/womens-cross-country/roster","https://gopurpleaces.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gopurpleaces.com/sports/womens-golf/schedule","https://gopurpleaces.com/sports/mens-golf/schedule"],"roster":["https://gopurpleaces.com/sports/womens-golf/roster","https://gopurpleaces.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gopurpleaces.com/sports/womens-soccer/schedule","https://gopurpleaces.com/sports/mens-soccer/schedule"],"roster":["https://gopurpleaces.com/sports/womens-soccer/roster","https://gopurpleaces.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gopurpleaces.com/sports/softball/schedule"],"roster":["https://gopurpleaces.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gopurpleaces.com/sports/womens-swimming-and-diving/schedule","https://gopurpleaces.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gopurpleaces.com/sports/womens-swimming-and-diving/roster","https://gopurpleaces.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gopurpleaces.com/sports/track-and-field/schedule"],"roster":["https://gopurpleaces.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gopurpleaces.com/sports/womens-volleyball/schedule"],"roster":["https://gopurpleaces.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'evansville|"+sport+"':"),`${sport} routes must live in the Evansville module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gopurpleaces.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.evansvilleHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=evansville)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · Evansville at Austin Peay (Exhibition) | L, 74-79",
 "Final Oct 21 Men's · Evansville vs SEMO (Exhibition) | L, 81-89",
 "Upcoming Oct 29, 6:00 PM Men's · Evansville vs Wabash (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Evansville vs IU Kokomo | ",
 "Upcoming Nov 7, 7:00 PM Men's · Evansville vs Southern Indiana | ",
 "Upcoming Nov 10 Men's · Evansville at Middle Tennessee State | ",
 "Upcoming Nov 14, 1:00 PM Men's · Evansville vs Miami Ohio | ",
 "Upcoming Nov 17, 7:00 PM Men's · Evansville vs Le Moyne College | ",
 "Upcoming Nov 22, 1:00 PM Men's · Evansville at Memphis | ",
 "Upcoming Nov 24, 8:00 PM Men's · Evansville at Missouri | ",
 "Upcoming Nov 30, 7:00 PM Men's · Evansville vs Chicago State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Evansville vs Western Kentucky | ",
 "Upcoming Dec 8, 6:00 PM Men's · Evansville at Ball State | ",
 "Upcoming Dec 11, 11:00 AM Men's · Evansville vs Brescia | ",
 "Upcoming Dec 15, 7:00 PM Men's · Evansville vs Drake | ",
 "Upcoming Dec 22 Men's · Evansville at Valparaiso | ",
 "Upcoming Dec 29, 7:00 PM Men's · Evansville vs Illinois State | ",
 "Upcoming Jan 2 Men's · Evansville at UNI | ",
 "Upcoming Jan 5, 7:00 PM Men's · Evansville vs Indiana State | ",
 "Upcoming Jan 9 Men's · Evansville at Murray State | ",
 "Upcoming Jan 12, 7:00 PM Men's · Evansville vs Belmont | ",
 "Upcoming Jan 16, 3:00 PM Men's · Evansville vs UIC | ",
 "Upcoming Jan 18 Men's · Evansville at Southern Illinois | ",
 "Upcoming Jan 21 Men's · Evansville at Bradley | ",
 "Upcoming Jan 24, 3:00 PM Men's · Evansville vs UNI | ",
 "Upcoming Jan 30 Men's · Evansville at Indiana State | ",
 "Upcoming Feb 3, 7:00 PM Men's · Evansville vs Bradley | ",
 "Upcoming Feb 6 Men's · Evansville at Drake | ",
 "Upcoming Feb 9, 7:00 PM Men's · Evansville vs Murray State | ",
 "Upcoming Feb 12 Men's · Evansville at Belmont | ",
 "Upcoming Feb 15, 7:00 PM Men's · Evansville vs Valparaiso | ",
 "Upcoming Feb 18 Men's · Evansville at UIC | ",
 "Upcoming Feb 21, 2:00 PM Men's · Evansville at Illinois State | ",
 "Upcoming Feb 28, 3:00 PM Men's · Evansville vs Southern Illinois | ",
 "Upcoming Mar 4 Men's · Evansville vs Opening Round | ",
 "Upcoming Mar 5 Men's · Evansville at 2027 Arch Madness Second Round | ",
 "Upcoming Mar 6 Men's · Evansville at 2027 Arch Madness Semifinals | ",
 "Upcoming Mar 7 Men's · Evansville at 2027 Arch Madness Championship Game | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 4:00 PM Women's · Evansville vs IU East (Exhibition) | ",
 "Upcoming Nov 3, 6:00 PM Women's · Evansville at DePaul | ",
 "Upcoming Nov 7, 1:00 PM Women's · Evansville at Lindenwood | ",
 "Upcoming Nov 11, 5:30 PM Women's · Evansville at Kentucky | ",
 "Upcoming Nov 14, 1:00 PM Women's · Evansville at Eastern Illinois | ",
 "Upcoming Nov 18, 5:30 PM Women's · Evansville at IU Indy | ",
 "Upcoming Nov 21, 1:00 PM Women's · Evansville vs Lindenwood | ",
 "Upcoming Nov 24, 6:00 PM Women's · Evansville vs SEMO | ",
 "Upcoming Nov 28, 2:00 PM Women's · Evansville at Austin Peay | ",
 "Upcoming Dec 1, 6:00 PM Women's · Evansville vs North Alabama | ",
 "Upcoming Dec 6, 2:00 PM Women's · Evansville vs Western Kentucky | ",
 "Upcoming Dec 10, 7:00 PM Women's · Evansville vs UT Martin | ",
 "Upcoming Dec 13, 2:00 PM Women's · Evansville at Illinois | ",
 "Upcoming Dec 18, 6:00 PM Women's · Evansville at Drake | ",
 "Upcoming Dec 20, 2:00 PM Women's · Evansville at Northern Iowa | ",
 "Upcoming Dec 29, 7:00 PM Women's · Evansville at UIC | ",
 "Upcoming Dec 31 Women's · Evansville vs Southern Illinois | ",
 "Upcoming Jan 3, 2:00 PM Women's · Evansville vs Belmont | ",
 "Upcoming Jan 9, 1:00 PM Women's · Evansville vs Bradley | ",
 "Upcoming Jan 11, 6:00 PM Women's · Evansville at Murray State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Evansville vs Valparaiso | ",
 "Upcoming Jan 17, 2:00 PM Women's · Evansville vs Illinois State | ",
 "Upcoming Jan 21, 6:30 PM Women's · Evansville at Belmont | ",
 "Upcoming Jan 25, 6:00 PM Women's · Evansville at Southern Illinois | ",
 "Upcoming Jan 28, 6:00 PM Women's · Evansville vs Indiana State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Evansville at Bradley | ",
 "Upcoming Feb 4, 6:00 PM Women's · Evansville at Valparaiso | ",
 "Upcoming Feb 7, 2:00 PM Women's · Evansville at Illinois State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Evansville vs Northern Iowa | ",
 "Upcoming Feb 13, 1:00 PM Women's · Evansville vs Drake | ",
 "Upcoming Feb 18, 6:00 PM Women's · Evansville vs UIC | ",
 "Upcoming Feb 21 Women's · Evansville at Indiana State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Evansville vs Murray State | ",
 "Upcoming Mar 3 Women's · Evansville vs Opening Round | ",
 "Upcoming Mar 5 Women's · Evansville at 2027 Arch Madness Second Round | ",
 "Upcoming Mar 6 Women's · Evansville at 2027 Arch Madness Semifinals | ",
 "Upcoming Mar 7 Women's · Evansville at 2027 Arch Madness Championship Game | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Evansville at Stegemoller Screagle Twilight | 3rd of 4",
 "Final Sep 18 Women's · Evansville at The Southern Showcase | 29th of 31",
 "Final Oct 3 Women's · Evansville at Swags Louisville Cross Country Classic | 18th of 24",
 "Final Oct 16 Women's · Evansville at Under Armour Pre-National Invitational | 25th of 26",
 "Upcoming Oct 30, 10:30 AM Women's · Evansville at Missouri Valley Conference Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Evansville at NCAA Great Lakes Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Evansville at Stegemoller Screagle Twilight | 4th of 4",
 "Final Sep 18 Men's · Evansville at The Southern Showcase | 27th of 29",
 "Final Oct 3 Men's · Evansville at Swags Louisville Cross Country Classic | 19th of 24",
 "Final Oct 16 Men's · Evansville at Under Armour Pre-National Invitational | 14th of 16",
 "Upcoming Oct 30, 10:30 AM Men's · Evansville at Missouri Valley Conference Championships | ",
 "Upcoming Nov 13, 10:00 AM Men's · Evansville at NCAA Great Lakes Regional | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Evansville at Redbird Invitational | 13th of 13",
 "Final Sep 28 Women's · Evansville at NKU Fall Invitational | 11th of 11",
 "Final Oct 4 Women's · Evansville at Coyote Creek Classic | 9th of 9",
 "Final Oct 19 Women's · Evansville at Braun Intercollegiate | 9th of 11",
 "Final Oct 22 Women's · Evansville at Battle of the Expressway | Completed"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · Evansville at Virtues Intercollegiate | 12th of 12",
 "Final Sep 8 Men's · Evansville at ANF Fall Classic | T13th of 14",
 "Final Sep 26 Men's · Evansville at Earl Yestingsmeier Invitational | T9th of 16",
 "Final Oct 4 Men's · Evansville at Coyote Creek Classic | 5th of 6",
 "Final Oct 12 Men's · Evansville at Bubba Barnett Intercollegiate | 14th of 17",
 "Final Oct 22 Men's · Evansville at Battle of the Expressway | Completed"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Evansville at Purdue | T, 1-1",
 "Final Aug 20 Women's · Evansville vs SEMO | W, 2-0",
 "Final Aug 27 Women's · Evansville vs Lindenwood | L, 1-3",
 "Final Sep 3 Women's · Evansville vs Austin Peay | W, 2-0",
 "Final Sep 10 Women's · Evansville at Middle Tennessee | L, 1-3",
 "Final Sep 19 Women's · Evansville vs Southern Illinois | L, 1-2",
 "Final Sep 26 Women's · Evansville vs Drake | L, 1-2",
 "Final Oct 3 Women's · Evansville at Indiana State | L, 0-1",
 "Final Oct 10 Women's · Evansville at Belmont | W, 2-1",
 "Final Oct 15 Women's · Evansville vs Northern Iowa | W, 1-0",
 "Final Oct 18 Women's · Evansville at Valparaiso | L, 1-5",
 "Upcoming Oct 25, 1:00 PM Women's · Evansville vs Illinois State | ",
 "Upcoming Nov 1, 1:00 PM Women's · Evansville vs Murray State | ",
 "Upcoming Nov 5, 1:00 PM Women's · Evansville at UIC | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Evansville at Bellarmine | L, 2-3",
 "Final Aug 23 Men's · Evansville at Indiana | L, 0-3",
 "Final Aug 28 Men's · Evansville vs Northwestern | L, 1-2",
 "Final Sep 4 Men's · Evansville at Kentucky | T, 1-1",
 "Final Sep 8 Men's · Evansville vs Louisville | L, 0-1",
 "Final Sep 11 Men's · Evansville at Lindenwood | W, 3-0",
 "Final Sep 15 Men's · Evansville vs Southern Indiana | T, 0-0",
 "Final Sep 21 Men's · Evansville at Georgetown | L, 2-3",
 "Final Sep 26 Men's · Evansville vs Drake | W, 1-0",
 "Final Oct 6 Men's · Evansville at Xavier | L, 0-4",
 "Final Oct 11 Men's · Evansville at Western Michigan | W, 1-0",
 "Final Oct 17 Men's · Evansville vs Bowling Green | L, 0-1",
 "Final Oct 20 Men's · Evansville at Wisconsin | L, 1-2",
 "Upcoming Oct 24, 7:00 PM Men's · Evansville at UIC | ",
 "Upcoming Oct 27, 6:00 PM Men's · Evansville vs Lipscomb | ",
 "Upcoming Oct 30, 6:00 PM Men's · Evansville at Bradley | ",
 "Upcoming Nov 4, 6:00 PM Men's · Evansville vs Belmont | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Evansville vs Alumni Weekend | Completed",
 "Final Oct 10 Women's · Evansville vs Bellarmine | Completed",
 "Final Oct 17 Women's · Evansville vs Valparaiso | L, 105-157",
 "Upcoming Oct 24, 11:00 AM Women's · Evansville at USI | ",
 "Upcoming Nov 6, 2:00 PM Women's · Evansville at Indiana State (W), UIC (M/W) | ",
 "Upcoming Nov 19 Women's · Evansville at House of Champions Invite | ",
 "Upcoming Jan 29 Women's · Evansville vs USI | ",
 "Upcoming Feb 5 Women's · Evansville at Southern Illinois | ",
 "Upcoming Feb 17 Women's · Evansville at MVC Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Evansville vs Alumni Weekend | Completed",
 "Final Oct 10 Men's · Evansville vs Bellarmine | Completed",
 "Final Oct 17 Men's · Evansville vs Valparaiso | L, 117-145",
 "Upcoming Oct 24, 11:00 AM Men's · Evansville at USI | ",
 "Upcoming Nov 6, 2:00 PM Men's · Evansville at Indiana State (W), UIC (M/W) | ",
 "Upcoming Nov 19 Men's · Evansville at House of Champions Invite | ",
 "Upcoming Jan 29 Men's · Evansville vs USI | ",
 "Upcoming Feb 5 Men's · Evansville at Southern Illinois | ",
 "Upcoming Feb 17 Men's · Evansville at MVC Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Evansville vs Purdue Fort Wayne | L, 1-3",
 "Final Aug 29 Evansville vs Rutgers | L, 1-3",
 "Final Aug 29 Evansville at Bellarmine | L, 0-3",
 "Final Sep 1 Evansville vs SEMO | L, 1-3",
 "Final Sep 4 Evansville at Miami Ohio | L, 1-3",
 "Final Sep 4 Evansville vs Purdue Fort Wayne | L, 0-3",
 "Final Sep 5 Evansville vs Kansas City | L, 1-3",
 "Final Sep 10 Evansville at Tennessee State | W, 3-1",
 "Final Sep 12 Evansville vs Tennessee State | W, 3-1",
 "Final Sep 15 Evansville at UT Martin | L, 1-3",
 "Final Sep 18 Evansville at USI | L, 0-3",
 "Final Sep 19 Evansville vs USI | W, 3-2",
 "Final Sep 25 Evansville vs Southern Illinois | L, 2-3",
 "Final Sep 26 Evansville vs Bradley | L, 1-3",
 "Final Oct 2 Evansville at Murray State | W, 3-1",
 "Final Oct 3 Evansville at Belmont | L, 0-3",
 "Final Oct 8 Evansville at Valparaiso | L, 1-3",
 "Final Oct 9 Evansville at UIC | L, 1-3",
 "Final Oct 16 Evansville vs Illinois State | L, 1-3",
 "Final Oct 17 Evansville vs Belmont | L, 1-3",
 "Today Oct 23, 6:00 PM Evansville at UNI | ",
 "Upcoming Oct 24, 5:00 PM Evansville at Drake | ",
 "Upcoming Oct 27, 5:00 PM Evansville at Indiana State | ",
 "Upcoming Oct 31, 5:00 PM Evansville vs UNI | ",
 "Upcoming Nov 6, 6:00 PM Evansville vs Murray State | ",
 "Upcoming Nov 7, 4:00 PM Evansville vs Valparaiso | ",
 "Upcoming Nov 10, 6:00 PM Evansville vs Indiana State | ",
 "Upcoming Nov 13, 6:00 PM Evansville at Southern Illinois | ",
 "Upcoming Nov 18 Evansville at MVC Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Evansville module checks passed");
