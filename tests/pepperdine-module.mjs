import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pepperdineSchool} from '../src/schools/pepperdine.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='pepperdine');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,pepperdineHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/pepperdine-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit pepperdinewaves.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['pepperdine'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',pepperdineSchool.scheduleUrls],['roster',pepperdineSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('pepperdine|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'pepperdinewaves.com',`${key} must stay on pepperdinewaves.com`);
  }
}
const parity={"Baseball":{"schedule":["https://pepperdinewaves.com/sports/baseball/schedule"],"roster":["https://pepperdinewaves.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://pepperdinewaves.com/sports/mens-basketball/schedule","https://pepperdinewaves.com/sports/womens-basketball/schedule"],"roster":["https://pepperdinewaves.com/sports/mens-basketball/roster","https://pepperdinewaves.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://pepperdinewaves.com/sports/womens-beach-volleyball/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://pepperdinewaves.com/sports/cross-country/schedule"],"roster":["https://pepperdinewaves.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://pepperdinewaves.com/sports/womens-golf/schedule","https://pepperdinewaves.com/sports/mens-golf/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-golf/roster","https://pepperdinewaves.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://pepperdinewaves.com/sports/womens-soccer/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://pepperdinewaves.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://pepperdinewaves.com/sports/womens-tennis/schedule","https://pepperdinewaves.com/sports/mens-tennis/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-tennis/roster","https://pepperdinewaves.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://pepperdinewaves.com/sports/track-and-field/schedule"],"roster":["https://pepperdinewaves.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://pepperdinewaves.com/sports/womens-volleyball/schedule"],"roster":["https://pepperdinewaves.com/sports/womens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://pepperdinewaves.com/sports/mens-water-polo/schedule"],"roster":["https://pepperdinewaves.com/sports/mens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'pepperdine|"+sport+"':"),`${sport} routes must live in the Pepperdine module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://pepperdinewaves.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.pepperdineHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=pepperdine)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · Pepperdine at Cornell | ",
 "Upcoming Nov 5, 7:30 PM Men's · Pepperdine vs La Sierra | ",
 "Upcoming Nov 7 Men's · Pepperdine vs Bethesda (CA) | ",
 "Upcoming Nov 11, 6:30 PM Men's · Pepperdine at Sam Houston | ",
 "Upcoming Nov 15, 2:00 PM Men's · Pepperdine at Oregon | ",
 "Upcoming Nov 19 Men's · Pepperdine vs UC Santa Barbara | ",
 "Upcoming Nov 23 Men's · Pepperdine vs UNC Greensboro | ",
 "Upcoming Nov 25 Men's · Pepperdine vs CSU Bakersfield | ",
 "Upcoming Nov 28, 10:30 AM Men's · Pepperdine vs Lehigh | ",
 "Upcoming Dec 1, 7:00 PM Men's · Pepperdine at Abilene Christian | ",
 "Upcoming Dec 5, 5:00 PM Men's · Pepperdine vs Florida Gulf Coast | ",
 "Upcoming Dec 9 Men's · Pepperdine vs Prairie View A&M | ",
 "Upcoming Dec 13, 2:00 PM Men's · Pepperdine at Sacramento State | ",
 "Upcoming Dec 18, 7:00 PM Men's · Pepperdine at Montana | ",
 "Upcoming Dec 21 Men's · Pepperdine vs Quinnipiac | ",
 "Upcoming Dec 29, 7:00 PM Men's · Pepperdine at LMU | ",
 "Upcoming Jan 2 Men's · Pepperdine at Portland | ",
 "Upcoming Jan 6, 7:00 PM Men's · Pepperdine at Seattle | ",
 "Upcoming Jan 9 Men's · Pepperdine vs LMU | ",
 "Upcoming Jan 13 Men's · Pepperdine vs Denver | ",
 "Upcoming Jan 16 Men's · Pepperdine vs Saint Mary's | ",
 "Upcoming Jan 20, 7:00 PM Men's · Pepperdine at Santa Clara | ",
 "Upcoming Jan 23, 4:00 PM Men's · Pepperdine at San Francisco | ",
 "Upcoming Jan 27 Men's · Pepperdine vs San Diego | ",
 "Upcoming Jan 30 Men's · Pepperdine at Pacific | ",
 "Upcoming Feb 6 Men's · Pepperdine at Denver | ",
 "Upcoming Feb 10 Men's · Pepperdine vs Seattle | ",
 "Upcoming Feb 13 Men's · Pepperdine vs Santa Clara | ",
 "Upcoming Feb 17 Men's · Pepperdine at San Diego | ",
 "Upcoming Feb 21, 5:00 PM Men's · Pepperdine at Saint Mary's | ",
 "Upcoming Feb 24 Men's · Pepperdine vs Portland | ",
 "Upcoming Feb 27 Men's · Pepperdine vs Pacific | ",
 "Upcoming Mar 5 Men's · Pepperdine at WCC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · Pepperdine vs Azusa Pacific (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Pepperdine at Portland State | ",
 "Upcoming Nov 5, 5:00 PM Women's · Pepperdine vs UC Santa Barbara | ",
 "Upcoming Nov 10 Women's · Pepperdine vs Cal State Dominguez Hills | ",
 "Upcoming Nov 13 Women's · Pepperdine vs Princeton | ",
 "Upcoming Nov 17, 11:00 AM Women's · Pepperdine at Nevada | ",
 "Upcoming Nov 22, 5:00 PM Women's · Pepperdine at Rice | ",
 "Upcoming Nov 24, 12:00 PM Women's · Pepperdine at Sam Houston | ",
 "Upcoming Dec 2, 7:00 PM Women's · Pepperdine at San Jose State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Pepperdine vs Boise State | ",
 "Upcoming Dec 9, 6:00 PM Women's · Pepperdine at California Baptist | ",
 "Upcoming Dec 12 Women's · Pepperdine vs Utah Valley | ",
 "Upcoming Dec 18 Women's · Pepperdine vs Air Force | ",
 "Upcoming Dec 20 Women's · Pepperdine vs Hawai'i | ",
 "Upcoming Dec 31 Women's · Pepperdine vs San Francisco | ",
 "Upcoming Jan 2 Women's · Pepperdine vs Seattle | ",
 "Upcoming Jan 7, 6:00 PM Women's · Pepperdine at Pacific | ",
 "Upcoming Jan 9 Women's · Pepperdine at Saint Mary's | ",
 "Upcoming Jan 14 Women's · Pepperdine at Denver | ",
 "Upcoming Jan 16 Women's · Pepperdine vs Portland | ",
 "Upcoming Jan 21 Women's · Pepperdine vs LMU | ",
 "Upcoming Jan 23, 1:00 PM Women's · Pepperdine at Seattle | ",
 "Upcoming Jan 28 Women's · Pepperdine vs Pacific | ",
 "Upcoming Jan 30 Women's · Pepperdine vs Santa Clara | ",
 "Upcoming Feb 4, 6:00 PM Women's · Pepperdine at San Diego | ",
 "Upcoming Feb 6, 2:00 PM Women's · Pepperdine at LMU | ",
 "Upcoming Feb 11 Women's · Pepperdine vs Denver | ",
 "Upcoming Feb 13 Women's · Pepperdine vs Saint Mary's | ",
 "Upcoming Feb 18, 6:00 PM Women's · Pepperdine at San Francisco | ",
 "Upcoming Feb 20 Women's · Pepperdine at Santa Clara | ",
 "Upcoming Feb 25 Women's · Pepperdine vs San Diego | ",
 "Upcoming Feb 27, 5:00 PM Women's · Pepperdine at Portland | ",
 "Upcoming Mar 5 Women's · Pepperdine at WCC Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24, 8:00 AM Pepperdine at West Coast AVCA Bid Tournament | ",
 "Upcoming Nov 6, 6:00 AM Pepperdine at AVCA Pairs Championship | ",
 "Upcoming Nov 7, 9:00 AM Pepperdine at Cal State Bakersfield (Exhibition) | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Pepperdine at Waves Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 19 Pepperdine at Riverside Invitational | Women's team: 16th / Men's team: 2nd",
 "Final Oct 3 Pepperdine at The Master's Invitational | Women's team: 3rd / Men's team: 9th",
 "Final Oct 17 Pepperdine at Highlander Invitational | Women's team: 10th / Men's team: 10th",
 "Final Oct 17 Pepperdine at Bronco Invitational | Women's team: 12th / Men's team: 4th",
 "Upcoming Oct 30 Pepperdine at West Coast Conference Championships | ",
 "Upcoming Nov 13 Pepperdine at NCAA West Regional Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Pepperdine at Branch Law Firm / McGuire Invitational | 2nd of 13",
 "Final Sep 21 Women's · Pepperdine at Golfweek Red Sky Classic | T3rd of 20",
 "Final Oct 12 Women's · Pepperdine at Haskins Women's Intercollegiate | T5th of 13",
 "Final Oct 16 Women's · Pepperdine at Stanford Intercollegiate | 9th of 17",
 "Upcoming Jan 31 Women's · Pepperdine at Therese Hession Regional Challenge | ",
 "Upcoming Feb 22 Women's · Pepperdine at Bruin Wave Invitational | ",
 "Upcoming Mar 15 Women's · Pepperdine at GameAbove Invitational | ",
 "Upcoming Mar 22 Women's · Pepperdine at Silicon Valley Showcase | ",
 "Upcoming Apr 23 Women's · Pepperdine at WCC Championships | ",
 "Upcoming May 10 Women's · Pepperdine at NCAA Regionals | ",
 "Upcoming May 16 Women's · Pepperdine at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Pepperdine at Sahalee Players Championship | T10th of 12",
 "Final Sep 18 Men's · Pepperdine at Fighting Illini Invitational | T9th of 15",
 "Final Sep 28 Men's · Pepperdine at Ben Hogan Collegiate Invitational presented by Charles Schwab | 13th of 16",
 "Final Oct 16 Men's · Pepperdine at Golf Club of Georgia Collegiate Invitational | 4th of 14",
 "Upcoming Jan 25 Men's · Pepperdine at Southwestern Invitational | ",
 "Upcoming Feb 4 Men's · Pepperdine at Amer Ari Intercollegiate | ",
 "Upcoming Feb 28 Men's · Pepperdine at Las Vegas Collegiate | ",
 "Upcoming Mar 15 Men's · Pepperdine at Black Desert Collegiate | ",
 "Upcoming Mar 25 Men's · Pepperdine at The Goodwin | ",
 "Upcoming Apr 12 Men's · Pepperdine at Western Intercollegiate | ",
 "Upcoming Apr 30 Men's · Pepperdine at West Coast Conference Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Pepperdine vs Colgate | W, 3-1",
 "Final Aug 16 Pepperdine vs Southern California | T, 1-1",
 "Final Aug 20 Pepperdine vs California | W, 1-0",
 "Final Aug 27 Pepperdine at Texas Tech | T, 1-1",
 "Final Aug 30 Pepperdine at Baylor | L, 1-3",
 "Final Sep 4 Pepperdine at UCLA | L, 0-3",
 "Final Sep 10 Pepperdine at Fresno State | W, 4-0",
 "Final Sep 13 Pepperdine vs Arizona | W, 2-0",
 "Final Sep 17 Pepperdine at San Diego State | L, 0-2",
 "Final Sep 26 Pepperdine at Portland | W, 1-0",
 "Final Oct 3 Pepperdine vs Seattle | W, 3-1",
 "Final Oct 7 Pepperdine at Denver | W, 3-2",
 "Final Oct 10 Pepperdine vs San Francisco | W, 5-0",
 "Final Oct 17 Pepperdine vs LMU | L, 0-1",
 "Upcoming Oct 24, 7:00 PM Pepperdine at Pacific | ",
 "Upcoming Oct 28, 3:00 PM Pepperdine vs Santa Clara | ",
 "Upcoming Oct 31, 12:00 PM Pepperdine vs San Diego | ",
 "Upcoming Nov 7, 1:00 PM Pepperdine at Saint Mary's | ",
 "Upcoming Nov 11 Pepperdine at WCC Championships | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Pepperdine at Rodionoff Invitational | Completed",
 "Final Oct 15 Women's · Pepperdine vs San Diego State | L, 84-59",
 "Upcoming Oct 23, 4:00 PM Women's · Pepperdine vs Seattle U | ",
 "Upcoming Oct 23, 4:00 PM Women's · Pepperdine vs Denver | ",
 "Upcoming Nov 12, 10:00 AM Women's · Pepperdine at Trojan Diving Invitational | ",
 "Upcoming Nov 13, 11:00 AM Women's · Pepperdine vs UC Santa Barbara | ",
 "Upcoming Nov 13, 11:00 AM Women's · Pepperdine vs UC San Diego | ",
 "Upcoming Nov 19 Women's · Pepperdine at NW Collegiate Invite | ",
 "Upcoming Jan 8, 10:30 AM Women's · Pepperdine at San Diego State | ",
 "Upcoming Jan 8, 10:30 AM Women's · Pepperdine vs Utah Tech | ",
 "Upcoming Jan 9, 11:00 AM Women's · Pepperdine vs Colorado State | ",
 "Upcoming Jan 9, 11:00 AM Women's · Pepperdine vs UTRGV | ",
 "Upcoming Jan 16, 10:00 AM Women's · Pepperdine at San Diego | ",
 "Upcoming Jan 23, 10:00 AM Women's · Pepperdine at UCLA | ",
 "Upcoming Jan 30, 11:00 AM Women's · Pepperdine vs Azusa Pacific | ",
 "Upcoming Feb 16 Women's · Pepperdine at MPSF Dive Championships | ",
 "Upcoming Feb 17 Women's · Pepperdine at MPSF Swim Championships | ",
 "Upcoming Mar 8 Women's · Pepperdine at NCAA Diving Zones | ",
 "Upcoming Mar 11 Women's · Pepperdine at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Pepperdine at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 21 Women's · Pepperdine at ITA All-American Championships | Completed",
 "Final Oct 1 Women's · Pepperdine at Battle in the Bay Classic | Completed",
 "Final Oct 15 Women's · Pepperdine at ITA Regionals | Completed",
 "Upcoming Nov 2 Women's · Pepperdine at American Tennis Open Miami | ",
 "Upcoming Nov 5 Women's · Pepperdine at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Pepperdine at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Pepperdine at NCAA Singles & Doubles Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Pepperdine at Milwaukee Tennis Classic | Completed",
 "Final Sep 20 Men's · Pepperdine at San Diego 2 | Completed",
 "Final Sep 21 Men's · Pepperdine at ITA All-American Championships | Completed",
 "Final Sep 24 Men's · Pepperdine at Sherwood Collegiate Cup | Completed",
 "Final Sep 27 Men's · Pepperdine at Columbus Challenger | Completed",
 "Final Oct 1 Men's · Pepperdine at Battle in the Bay Classic | Completed",
 "Final Oct 9 Men's · Pepperdine at UCSB Invite | Completed",
 "Final Oct 15 Men's · Pepperdine at ITA Division I Regional Championships | Completed",
 "Today Oct 19 Men's · Pepperdine at Fort Worth 75k Challenger | ",
 "Upcoming Oct 25 Men's · Pepperdine at MarketBeat Open | ",
 "Upcoming Nov 5 Men's · Pepperdine at ITA West Sectional Championships | ",
 "Upcoming Nov 5 Men's · Pepperdine at SoCal Invitational | ",
 "Upcoming Nov 5 Men's · Pepperdine at ITA Conference Masters | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Pepperdine vs Villanova | W, 3-1",
 "Final Aug 29 Women's · Pepperdine vs South Dakota State | W, 3-0",
 "Final Aug 30 Women's · Pepperdine vs Sacramento State | W, 3-2",
 "Final Sep 4 Women's · Pepperdine vs Tulsa | L, 1-3",
 "Final Sep 5 Women's · Pepperdine at Creighton | L, 1-3",
 "Final Sep 6 Women's · Pepperdine vs Arizona | W, 3-2",
 "Final Sep 10 Women's · Pepperdine at Western Kentucky | L, 1-3",
 "Final Sep 11 Women's · Pepperdine vs Eastern Kentucky | W, 3-0",
 "Final Sep 12 Women's · Pepperdine vs James Madison | W, 3-1",
 "Final Sep 18 Women's · Pepperdine vs UC Santa Barbara | W, 3-1",
 "Final Sep 19 Women's · Pepperdine at USC | W, 3-0",
 "Final Sep 24 Women's · Pepperdine at Santa Clara | W, 3-2",
 "Final Sep 26 Women's · Pepperdine at San Francisco | W, 3-1",
 "Final Oct 1 Women's · Pepperdine vs Pacific | W, 3-0",
 "Final Oct 3 Women's · Pepperdine vs Saint Mary's | L, 1-3",
 "Final Oct 8 Women's · Pepperdine at Denver | W, 3-0",
 "Final Oct 10 Women's · Pepperdine at San Diego | W, 3-0",
 "Final Oct 17 Women's · Pepperdine at LMU | W, 3-1",
 "Today Oct 22, 6:00 PM Women's · Pepperdine vs San Francisco | ",
 "Upcoming Oct 24, 12:00 PM Women's · Pepperdine vs Santa Clara | ",
 "Upcoming Oct 29, 6:00 PM Women's · Pepperdine at Seattle | ",
 "Upcoming Oct 31, 1:00 PM Women's · Pepperdine at Portland | ",
 "Upcoming Nov 5, 6:30 PM Women's · Pepperdine at Saint Mary's | ",
 "Upcoming Nov 7, 12:00 PM Women's · Pepperdine at Pacific | ",
 "Upcoming Nov 12, 7:00 PM Women's · Pepperdine vs San Diego | ",
 "Upcoming Nov 14, 12:00 PM Women's · Pepperdine vs Denver | ",
 "Upcoming Nov 21, 12:00 PM Women's · Pepperdine vs LMU | ",
 "Upcoming Nov 25, 12:00 PM Women's · Pepperdine vs Portland | ",
 "Upcoming Nov 28, 12:00 PM Women's · Pepperdine vs Seattle | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Pepperdine vs McKendree | W, 23-7",
 "Final Aug 29 Pepperdine vs Claremont-Mudd-Scripps | W, 16-9",
 "Final Aug 30 Pepperdine vs Long Beach State | L, 18-20",
 "Final Aug 30 Pepperdine at UC San Diego | L, 15-17",
 "Final Sep 3 Pepperdine vs Biola | W, 20-12",
 "Final Sep 3 Pepperdine vs UC Santa Barbara | W, 13-9",
 "Final Sep 5 Pepperdine vs Stanford | L, 6-14",
 "Final Sep 6 Pepperdine at Southern California | L, 14-17",
 "Final Sep 11 Pepperdine at Fordham | L, 12-16",
 "Final Sep 13 Pepperdine at Princeton | L, 9-12",
 "Final Sep 18 Pepperdine vs UC San Diego | L, 9-10",
 "Final Sep 19 Pepperdine vs Claremont-Mudd-Scripps | W, 14-10",
 "Final Sep 19 Pepperdine vs LMU | L, 14-15",
 "Final Sep 20 Pepperdine vs UC Santa Barbara | W, 15-10",
 "Final Sep 26 Pepperdine vs UCLA | L, 11-16",
 "Final Oct 3 Pepperdine at LMU | L, 10-13",
 "Final Oct 10 Pepperdine at Air Force | W, 16-15",
 "Final Oct 17 Pepperdine vs Santa Clara | W, 17-16",
 "Final Oct 18 Pepperdine vs San Jose State | L, 13-16",
 "Upcoming Oct 23, 1:00 PM Pepperdine at California | ",
 "Upcoming Oct 24, 2:20 PM Pepperdine vs Brown | ",
 "Upcoming Oct 30, 12:00 PM Pepperdine vs UC Davis | ",
 "Upcoming Nov 6, 6:30 PM Pepperdine at Saint Mary's | ",
 "Upcoming Nov 8, 1:00 PM Pepperdine at Pacific | ",
 "Upcoming Nov 14, 5:00 PM Pepperdine vs Long Beach State | ",
 "Upcoming Nov 20 Pepperdine at WCC Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Pepperdine module checks passed");
