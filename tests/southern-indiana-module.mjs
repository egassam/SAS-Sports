import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southernIndianaSchool} from '../src/schools/southern-indiana.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='southern-indiana');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southernIndianaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/southern-indiana-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit usiscreamingeagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['southern-indiana'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',southernIndianaSchool.scheduleUrls],['roster',southernIndianaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('southern-indiana|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'usiscreamingeagles.com',`${key} must stay on usiscreamingeagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://usiscreamingeagles.com/sports/baseball/schedule"],"roster":["https://usiscreamingeagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://usiscreamingeagles.com/sports/mens-basketball/schedule","https://usiscreamingeagles.com/sports/womens-basketball/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-basketball/roster","https://usiscreamingeagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://usiscreamingeagles.com/sports/mens-cross-country/schedule","https://usiscreamingeagles.com/sports/womens-cross-country/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-cross-country/roster","https://usiscreamingeagles.com/sports/womens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://usiscreamingeagles.com/sports/mens-golf/schedule","https://usiscreamingeagles.com/sports/womens-golf/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-golf/roster","https://usiscreamingeagles.com/sports/womens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://usiscreamingeagles.com/sports/mens-soccer/schedule","https://usiscreamingeagles.com/sports/womens-soccer/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-soccer/roster","https://usiscreamingeagles.com/sports/womens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://usiscreamingeagles.com/sports/softball/schedule"],"roster":["https://usiscreamingeagles.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://usiscreamingeagles.com/sports/mens-swimming-diving/schedule","https://usiscreamingeagles.com/sports/womens-swimming-diving/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-swimming-diving/roster","https://usiscreamingeagles.com/sports/womens-swimming-diving/roster"],"combined":true},"Tennis":{"schedule":["https://usiscreamingeagles.com/sports/mens-tennis/schedule","https://usiscreamingeagles.com/sports/womens-tennis/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-tennis/roster","https://usiscreamingeagles.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://usiscreamingeagles.com/sports/mens-track-and-field/schedule","https://usiscreamingeagles.com/sports/womens-track-and-field/schedule"],"roster":["https://usiscreamingeagles.com/sports/mens-track-and-field/roster","https://usiscreamingeagles.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://usiscreamingeagles.com/sports/womens-volleyball/schedule"],"roster":["https://usiscreamingeagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'southern-indiana|"+sport+"':"),`${sport} routes must live in the Southern Indiana module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://usiscreamingeagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southernIndianaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=southern-indiana)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Men's · USI at Belmont | ",
 "Upcoming Nov 4, 7:00 PM Men's · USI vs Saint Mary-of-the-Woods College | ",
 "Upcoming Nov 7, 7:00 PM Men's · USI vs Evansville | ",
 "Upcoming Nov 11, 5:30 PM Men's · USI at IU Indianapolis | ",
 "Upcoming Nov 15, 3:30 PM Men's · USI vs Western Michigan | ",
 "Upcoming Nov 18, 7:00 PM Men's · USI vs Lindsey Wilson College (Ky.) | ",
 "Upcoming Nov 22, 2:00 PM Men's · USI at Texas | ",
 "Upcoming Nov 24, 5:00 PM Men's · USI at Virginia Military Institute | ",
 "Upcoming Nov 28, 1:00 PM Men's · USI vs Ball State | ",
 "Upcoming Dec 1, 10:00 AM Men's · USI at West Georgia | ",
 "Upcoming Dec 6 Men's · USI at Indiana State | ",
 "Upcoming Dec 16, 7:00 PM Men's · USI vs Bellarmine | ",
 "Upcoming Dec 18, 4:00 PM Men's · USI at Vanderbilt | ",
 "Upcoming Dec 21, 7:00 PM Men's · USI vs Wright State Lake | ",
 "Upcoming Dec 28, 7:00 PM Men's · USI vs Brescia (Ky.) | ",
 "Upcoming Dec 31, 7:30 PM Men's · USI vs Tennessee State | ",
 "Upcoming Jan 2, 3:45 PM Men's · USI at Southeast Missouri State | ",
 "Upcoming Jan 7, 7:30 PM Men's · USI vs Lindenwood | ",
 "Upcoming Jan 9, 3:30 PM Men's · USI at UT Martin | ",
 "Upcoming Jan 13, 6:45 PM Men's · USI at Morehead State | ",
 "Upcoming Jan 21, 7:30 PM Men's · USI vs SIU Edwardsville | ",
 "Upcoming Jan 23, 3:30 PM Men's · USI vs Western Illinois | ",
 "Upcoming Jan 28, 7:30 PM Men's · USI at Tennessee State | ",
 "Upcoming Jan 30, 3:30 PM Men's · USI vs Morehead State | ",
 "Upcoming Feb 4, 7:30 PM Men's · USI at Eastern Illinois | ",
 "Upcoming Feb 6, 7:30 PM Men's · USI vs Southeast Missouri State | ",
 "Upcoming Feb 13, 3:30 PM Men's · USI at Lindenwood | ",
 "Upcoming Feb 18, 7:30 PM Men's · USI vs UT Martin | ",
 "Upcoming Feb 20, 3:30 PM Men's · USI vs Eastern Illinois | ",
 "Upcoming Feb 25, 7:30 PM Men's · USI at Western Illinois | ",
 "Upcoming Feb 27, 3:30 PM Men's · USI at SIU Edwardsville | ",
 "Upcoming Mar 3 Men's · USI at Ohio Valley Conference Tournament First Round | ",
 "Upcoming Mar 4 Men's · USI at Ohio Valley Conference Tournament Quarterfinals | ",
 "Upcoming Mar 5 Men's · USI at Ohio Valley Conference Tournament Semifinals | ",
 "Upcoming Mar 6 Men's · USI at Ohio Valley Conference Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · USI vs Murray State | ",
 "Upcoming Nov 5, 6:30 PM Women's · USI at Kansas State | ",
 "Upcoming Nov 8, 3:00 PM Women's · USI vs Louisville | ",
 "Upcoming Nov 12, 11:00 AM Women's · USI vs Spalding (Ky.) | ",
 "Upcoming Nov 15, 1:00 PM Women's · USI vs Rose-Hulman | ",
 "Upcoming Nov 17, 6:00 PM Women's · USI vs Indiana University Southeast | ",
 "Upcoming Nov 20, 6:00 PM Women's · USI vs Miami University (OH) | ",
 "Upcoming Nov 22, 1:00 PM Women's · USI at Indiana | ",
 "Upcoming Nov 25 Women's · USI at Northern Kentucky | ",
 "Upcoming Nov 30, 6:00 PM Women's · USI at Michigan | ",
 "Upcoming Dec 3, 10:30 AM Women's · USI at Middle Tennessee | ",
 "Upcoming Dec 6, 1:00 PM Women's · USI vs Brescia (Ky.) | ",
 "Upcoming Dec 13, 3:00 PM Women's · USI vs East Tennessee State | ",
 "Upcoming Dec 20, 1:00 PM Women's · USI vs Loyola University Chicago | ",
 "Upcoming Dec 22, 5:00 PM Women's · USI at Arkansas State | ",
 "Upcoming Dec 31, 5:00 PM Women's · USI vs Tennessee State | ",
 "Upcoming Jan 2, 1:30 PM Women's · USI at Southeast Missouri State | ",
 "Upcoming Jan 7, 5:00 PM Women's · USI vs Lindenwood | ",
 "Upcoming Jan 9, 1:00 PM Women's · USI at UT Martin | ",
 "Upcoming Jan 13, 4:15 PM Women's · USI at Morehead State | ",
 "Upcoming Jan 21, 5:00 PM Women's · USI vs SIU Edwardsville | ",
 "Upcoming Jan 23, 1:00 PM Women's · USI vs Western Illinois | ",
 "Upcoming Jan 28, 10:30 AM Women's · USI at Tennessee State | ",
 "Upcoming Jan 30, 1:00 PM Women's · USI vs Morehead State | ",
 "Upcoming Feb 4, 5:00 PM Women's · USI at Eastern Illinois | ",
 "Upcoming Feb 6, 5:00 PM Women's · USI vs Southeast Missouri State | ",
 "Upcoming Feb 13, 1:00 PM Women's · USI at Lindenwood | ",
 "Upcoming Feb 18, 5:00 PM Women's · USI vs UT Martin | ",
 "Upcoming Feb 20, 1:00 PM Women's · USI vs Eastern Illinois | ",
 "Upcoming Feb 25, 5:00 PM Women's · USI at Western Illinois | ",
 "Upcoming Feb 27, 1:00 PM Women's · USI at SIU Edwardsville | ",
 "Upcoming Mar 3 Women's · USI at Ohio Valley Conference Tournament First Round | ",
 "Upcoming Mar 4 Women's · USI at Ohio Valley Conference Tournament Quarterfinals | ",
 "Upcoming Mar 5 Women's · USI at Ohio Valley Conference Tournament Semifinals | ",
 "Upcoming Mar 6 Women's · USI at Ohio Valley Conference Tournament Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · USI at Stegemoller Screagle Twilight | 1st of 4",
 "Final Sep 11 Men's · USI at Spartan Invite | 5th of 23",
 "Final Sep 18 Men's · USI at Ohio Valley Conference Preview Meet | 4th of 4",
 "Final Sep 25 Men's · USI at Gans Creek Classic | 21st of 30",
 "Final Oct 2 Men's · USI at Nike XC Town Twilight | 3rd of 15",
 "Final Oct 16 Men's · USI at Under Armour Pre-National Invitational | 38th of 44 (Blue Race; 3rd of 16 in White Race)",
 "Upcoming Oct 30, 10:00 AM Men's · USI at OVC Championships | ",
 "Upcoming Nov 13 Men's · USI at NCAA Great Lakes Region Championships | ",
 "Upcoming Nov 21 Men's · USI at NCAA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · USI at Stegemoller Screagle Twilight | 1st of 4",
 "Final Sep 11 Women's · USI at Spartan Invite | 7th of 24",
 "Final Sep 18 Women's · USI at Ohio Valley Conference Preview Meet | 3rd of 3",
 "Final Sep 25 Women's · USI at Gans Creek Classic | 23rd of 29",
 "Final Oct 2 Women's · USI at Nike XC Town Twilight | 5th of 17",
 "Final Oct 16 Women's · USI at Under Armour Pre-National Invitational | 5th of 26 (White Race)",
 "Upcoming Oct 30, 9:00 AM Women's · USI at OVC Championships | ",
 "Upcoming Nov 13 Women's · USI at NCAA Great Lakes Region Championships | ",
 "Upcoming Nov 21 Women's · USI at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · USI at Grover Page Classic | 5th of 10",
 "Final Sep 28 Men's · USI at Derek Dolenc Invitational | T13th of 17",
 "Final Oct 4 Men's · USI at Coyote Creek Classic | 2nd of 6",
 "Final Oct 12 Men's · USI at Bubba Barnett Intercollegiate | 8th of 17",
 "Final Oct 19 Men's · USI at Xavier Invitational | T6th of 9",
 "Final Oct 22 Men's · USI at Battle of the Expressway | Completed",
 "Upcoming Mar 22 Men's · USI at Skyhawk Invitational | ",
 "Upcoming Mar 29 Men's · USI at Don Benbow Butler Spring Invitational | ",
 "Upcoming Apr 5 Men's · USI at Racer Intercollegiate | ",
 "Upcoming Apr 11 Men's · USI at Wright State Invitational | ",
 "Upcoming Apr 25 Men's · USI at OVC Men's Golf Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · USI at Midwest Match Play Championship | Completed",
 "Final Sep 14 Women's · USI at Brittany Kelly Classic | T8th of 14",
 "Final Sep 28 Women's · USI at Hill Yeah! | 5th of 9",
 "Final Oct 5 Women's · USI at Butler Fall Invitational | T12th of 14",
 "Final Oct 19 Women's · USI at Charles Braun Intercollegiate | 7th of 11",
 "Final Oct 22 Women's · USI at Battle of the Expressway | Completed",
 "Upcoming Feb 22 Women's · USI at Stetson Hatter Invitational | ",
 "Upcoming Mar 8 Women's · USI at Orange Tree Invitational | ",
 "Upcoming Mar 29 Women's · USI at The Julie Invitational | ",
 "Upcoming Apr 5 Women's · USI at Colonel Classic | ",
 "Upcoming Apr 18 Women's · USI at OVC Women's Golf Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · USI at Milwaukee | T, 0-0",
 "Final Aug 24 Men's · USI at Northern Kentucky | T, 2-2",
 "Final Sep 2 Men's · USI vs IU Indy | L, 0-1",
 "Final Sep 8 Men's · USI vs Bellarmine | L, 1-2",
 "Final Sep 12 Men's · USI at Marquette | L, 2-3",
 "Final Sep 15 Men's · USI at Evansville | T, 0-0",
 "Final Sep 18 Men's · USI at Belmont | L, 1-4",
 "Final Sep 26 Men's · USI at SIUE | L, 1-3",
 "Final Oct 1 Men's · USI vs Eastern Illinois | L, 2-6",
 "Final Oct 4 Men's · USI at Western Illinois | W, 3-1",
 "Final Oct 8 Men's · USI at Houston Christian | T, 1-1",
 "Final Oct 11 Men's · USI at Incarnate Word | L, 2-4",
 "Final Oct 15 Men's · USI vs The University of Texas Rio Grande Valley | L, 3-4",
 "Final Oct 18 Men's · USI vs Lindenwood | W, 1-0",
 "Upcoming Oct 24, 7:00 PM Men's · USI vs SIUE | ",
 "Upcoming Oct 29, 2:00 PM Men's · USI at Eastern Illinois | ",
 "Upcoming Nov 1, 3:00 PM Men's · USI vs Western Illinois | ",
 "Upcoming Nov 8 Men's · USI at Ohio Valley Conference Tournament Quarterfinals | ",
 "Upcoming Nov 11 Men's · USI at Ohio Valley Conference Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · USI at Ohio Valley Conference Tournament Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · USI vs Wright State | T, 0-0",
 "Final Aug 16 Women's · USI vs Middle Tennessee | L, 0-2",
 "Final Aug 20 Women's · USI vs Akron | L, 1-2",
 "Final Aug 23 Women's · USI at Purdue Fort Wayne | T, 0-0",
 "Final Aug 30 Women's · USI vs Purdue | L, 0-3",
 "Final Sep 3 Women's · USI vs Arkansas State | L, 0-1",
 "Final Sep 6 Women's · USI at Eastern Michigan | L, 1-3",
 "Final Sep 10 Women's · USI at Cleveland State | W, 1-0",
 "Final Sep 13 Women's · USI at Valparaiso | L, 0-2",
 "Final Sep 17 Women's · USI at DePaul | T, 1-1",
 "Final Sep 20 Women's · USI vs Xavier | L, 0-2",
 "Final Sep 27 Women's · USI vs UT Martin | T, 0-0",
 "Final Oct 4 Women's · USI at Southeast Missouri State | T, 1-1",
 "Final Oct 11 Women's · USI vs Western Illinois | W, 2-0",
 "Final Oct 15 Women's · USI at Lindenwood | L, 0-1",
 "Final Oct 18 Women's · USI at SIUE | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · USI vs Eastern Illinois | ",
 "Upcoming Nov 1, 1:00 PM Women's · USI at Morehead State | ",
 "Upcoming Nov 5 Women's · USI at OVC Women's Soccer Tournament First Round | ",
 "Upcoming Nov 8 Women's · USI at OVC Women's Soccer Tournament Quarterfinals | ",
 "Upcoming Nov 12 Women's · USI at OVC Women's Soccer Tournament Semifinals | ",
 "Upcoming Nov 15 Women's · USI at OVC Women's Soccer Tournament Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_mensswimmingdiving=parse("Swimming & Diving","mens-swimming-diving");
  assert.deepEqual(v_mensswimmingdiving.map(line),[
 "Final Sep 26 Men's · USI vs Red & Blue Meet (Exhibition) | Completed",
 "Final Oct 9 Men's · USI at Valparaiso | W, 152-110",
 "Final Oct 10 Men's · USI at Illinois Chicago | L, 75-225",
 "Upcoming Oct 24, 11:00 AM Men's · USI vs Evansville | ",
 "Upcoming Oct 31, 11:00 AM Men's · USI vs Bellarmine | ",
 "Upcoming Nov 19 Men's · USI at House of Champions | ",
 "Upcoming Jan 16, 12:00 PM Men's · USI at Saint Louis | ",
 "Upcoming Jan 22, 5:00 PM Men's · USI at Eastern Illinois | ",
 "Upcoming Jan 29 Men's · USI at Evansville | ",
 "Upcoming Feb 6, 11:00 AM Men's · USI at UIC Diving Invite | ",
 "Upcoming Feb 24 Men's · USI at The Summit League Championships | ",
 "Upcoming Mar 8 Men's · USI at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 11 Men's · USI at CSCAA National Invivtational Championship | ",
 "Upcoming Mar 24 Men's · USI at NCAA Championships | "
]);
  const v_womensswimmingdiving=parse("Swimming & Diving","womens-swimming-diving");
  assert.deepEqual(v_womensswimmingdiving.map(line),[
 "Final Sep 26 Women's · USI vs Red & Blue Meet (Exhibition) | Completed",
 "Final Oct 9 Women's · USI at Valparaiso | W, 169-93",
 "Final Oct 10 Women's · USI at Illinois Chicago | L, 77-222",
 "Final Oct 10 Women's · USI vs Northern Iowa | L, 104-196",
 "Upcoming Oct 24, 11:00 AM Women's · USI vs Evansville | ",
 "Upcoming Oct 31, 11:00 AM Women's · USI vs Bellarmine | ",
 "Upcoming Oct 31, 11:00 AM Women's · USI vs Butler | ",
 "Upcoming Nov 19 Women's · USI at House of Champions | ",
 "Upcoming Jan 16, 12:00 PM Women's · USI at Saint Louis | ",
 "Upcoming Jan 22, 5:00 PM Women's · USI at Eastern Illinois | ",
 "Upcoming Jan 29 Women's · USI at Evansville | ",
 "Upcoming Feb 6, 11:00 AM Women's · USI at UIC Diving Invite | ",
 "Upcoming Feb 24 Women's · USI at The Summit League Championships | ",
 "Upcoming Mar 8 Women's · USI at NCAA Zone C Diving Championships | ",
 "Upcoming Mar 11 Women's · USI at CSCAA National Invivtational Championship | ",
 "Upcoming Mar 17 Women's · USI at NCAA Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · USI at NKU Fall Invitational | Completed",
 "Final Sep 25 Men's · USI at Horizon League Fall Invitational | Completed",
 "Final Oct 8 Men's · USI at ITA Fall Regional Championships | Completed",
 "Upcoming Nov 5 Men's · USI at ITA Conference Masters | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 4 Women's · USI at SIUE Cougar Invitational | Completed",
 "Final Sep 25 Women's · USI at OVC Fall Invitational | Completed",
 "Final Oct 8 Women's · USI at ITA Fall Regional Championships | Completed"
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 USI vs Murray State | W, 3-1",
 "Final Aug 28 USI vs Eastern Michigan | L, 1-3",
 "Final Aug 29 USI vs Northern Illinois | W, 3-0",
 "Final Sep 4 USI at Georgia Tech | L, 0-3",
 "Final Sep 4 USI vs Campbell | L, 1-3",
 "Final Sep 5 USI vs Xavier | L, 1-3",
 "Final Sep 7 USI vs Indiana | L, 1-3",
 "Final Sep 11 USI vs Youngstown State | W, 3-1",
 "Final Sep 12 USI at Ohio State | L, 1-3",
 "Final Sep 13 USI vs Winthrop | W, 3-2",
 "Final Sep 18 USI vs Evansville | W, 3-0",
 "Final Sep 19 USI at Evansville | L, 2-3",
 "Final Sep 25 USI at Eastern Illinois | L, 1-3",
 "Final Sep 26 USI at Eastern Illinois | W, 3-2",
 "Final Oct 9 USI vs Morehead State | L, 2-3",
 "Final Oct 10 USI vs Morehead State | W, 3-0",
 "Final Oct 16 USI at Lindenwood | L, 1-3",
 "Final Oct 17 USI at Lindenwood | L, 0-3",
 "Today Oct 23, 6:00 PM USI vs Western Illinois | ",
 "Upcoming Oct 24, 2:00 PM USI vs Western Illinois | ",
 "Upcoming Oct 29, 6:00 PM USI vs UT Martin | ",
 "Upcoming Oct 30, 6:00 PM USI vs UT Martin | ",
 "Upcoming Nov 6, 6:00 PM USI at Tennessee State | ",
 "Upcoming Nov 7, 12:00 PM USI at Tennessee State | ",
 "Upcoming Nov 12, 6:00 PM USI vs Southeast Missouri State | ",
 "Upcoming Nov 13, 5:00 PM USI vs Southeast Missouri State | ",
 "Upcoming Nov 17, 6:00 PM USI at SIUE | ",
 "Upcoming Nov 18, 5:00 PM USI at SIUE | ",
 "Upcoming Nov 22 USI at Ohio Valley Conference Tournament Quarterfinals | ",
 "Upcoming Nov 23 USI at Ohio Valley Conference Tournament Semifinals | ",
 "Upcoming Nov 24 USI at Ohio Valley Conference Tournament Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_mensswimmingdiving,"Swimming & Diving mens-swimming-diving");
  ownRecapsOnly(v_womensswimmingdiving,"Swimming & Diving womens-swimming-diving");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Southern Indiana module checks passed");
