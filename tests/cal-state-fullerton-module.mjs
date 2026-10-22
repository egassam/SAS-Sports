import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {calStateFullertonSchool} from '../src/schools/cal-state-fullerton.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='cal-state-fullerton');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,calStateFullertonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cal-state-fullerton-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fullertontitans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['cal-state-fullerton'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',calStateFullertonSchool.scheduleUrls],['roster',calStateFullertonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cal-state-fullerton|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fullertontitans.com',`${key} must stay on fullertontitans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fullertontitans.com/sports/baseball/schedule"],"roster":["https://fullertontitans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fullertontitans.com/sports/mens-basketball/schedule","https://fullertontitans.com/sports/womens-basketball/schedule"],"roster":["https://fullertontitans.com/sports/mens-basketball/roster","https://fullertontitans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://fullertontitans.com/sports/cross-country/schedule"],"roster":["https://fullertontitans.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://fullertontitans.com/sports/womens-golf/schedule","https://fullertontitans.com/sports/mens-golf/schedule"],"roster":["https://fullertontitans.com/sports/womens-golf/roster","https://fullertontitans.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://fullertontitans.com/sports/womens-soccer/schedule","https://fullertontitans.com/sports/mens-soccer/schedule"],"roster":["https://fullertontitans.com/sports/womens-soccer/roster","https://fullertontitans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://fullertontitans.com/sports/softball/schedule"],"roster":["https://fullertontitans.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://fullertontitans.com/sports/womens-tennis/schedule"],"roster":["https://fullertontitans.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://fullertontitans.com/sports/track-and-field/schedule"],"roster":["https://fullertontitans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://fullertontitans.com/sports/womens-volleyball/schedule"],"roster":["https://fullertontitans.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://fullertontitans.com/sports/womens-water-polo/schedule","https://fullertontitans.com/sports/mens-water-polo/schedule"],"roster":["https://fullertontitans.com/sports/womens-water-polo/roster","https://fullertontitans.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'cal-state-fullerton|"+sport+"':"),`${sport} routes must live in the Cal State Fullerton module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://fullertontitans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.calStateFullertonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=cal-state-fullerton)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Cal State Fullerton at San Diego State | ",
 "Upcoming Nov 7, 11:00 AM Men's · Cal State Fullerton at South Dakota | ",
 "Upcoming Nov 12, 6:00 PM Men's · Cal State Fullerton vs Lincoln | ",
 "Upcoming Nov 18, 7:30 PM Men's · Cal State Fullerton at UCLA | ",
 "Upcoming Nov 22, 2:00 PM Men's · Cal State Fullerton at Portland State | ",
 "Upcoming Nov 28, 2:00 PM Men's · Cal State Fullerton vs Weber State | ",
 "Upcoming Dec 3, 7:00 PM Men's · Cal State Fullerton vs Sacramento State | ",
 "Upcoming Dec 5, 4:00 PM Men's · Cal State Fullerton vs Long Beach State | ",
 "Upcoming Dec 10, 6:00 PM Men's · Cal State Fullerton at Idaho State | ",
 "Upcoming Dec 12, 1:30 PM Men's · Cal State Fullerton at BYU | ",
 "Upcoming Dec 20, 2:00 PM Men's · Cal State Fullerton vs Utah Tech | ",
 "Upcoming Dec 22, 12:00 PM Men's · Cal State Fullerton vs Grace U | ",
 "Upcoming Dec 31, 2:00 PM Men's · Cal State Fullerton vs UC San Diego | ",
 "Upcoming Jan 2, 4:00 PM Men's · Cal State Fullerton vs UC Irvine | ",
 "Upcoming Jan 7, 6:00 PM Men's · Cal State Fullerton at UC Santa Barbara | ",
 "Upcoming Jan 9, 4:00 PM Men's · Cal State Fullerton at Cal Poly | ",
 "Upcoming Jan 14, 7:00 PM Men's · Cal State Fullerton vs CSU Bakersfield | ",
 "Upcoming Jan 16, 4:00 PM Men's · Cal State Fullerton vs CSUN | ",
 "Upcoming Jan 21, 7:00 PM Men's · Cal State Fullerton at UC Irvine | ",
 "Upcoming Jan 23, 6:00 PM Men's · Cal State Fullerton at UC San Diego | ",
 "Upcoming Jan 28, 7:00 PM Men's · Cal State Fullerton at UC Riverside | ",
 "Upcoming Jan 30, 5:00 PM Men's · Cal State Fullerton at Cal Baptist | ",
 "Upcoming Feb 4, 7:00 PM Men's · Cal State Fullerton vs Cal Poly | ",
 "Upcoming Feb 6, 4:00 PM Men's · Cal State Fullerton vs UC Santa Barbara | ",
 "Upcoming Feb 11, 7:00 PM Men's · Cal State Fullerton at CSUN | ",
 "Upcoming Feb 13, 2:00 PM Men's · Cal State Fullerton at CSU Bakersfield | ",
 "Upcoming Feb 18, 7:00 PM Men's · Cal State Fullerton vs Utah Valley | ",
 "Upcoming Feb 20, 6:00 PM Men's · Cal State Fullerton at Long Beach State | ",
 "Upcoming Feb 25, 7:00 PM Men's · Cal State Fullerton at Sacramento State | ",
 "Upcoming Feb 27, 1:00 PM Men's · Cal State Fullerton at Utah Valley | ",
 "Upcoming Mar 4, 7:00 PM Men's · Cal State Fullerton vs Cal Baptist | ",
 "Upcoming Mar 6, 4:00 PM Men's · Cal State Fullerton vs UC Riverside | ",
 "Upcoming Mar 10 Men's · Cal State Fullerton at Big West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Cal State Fullerton at San Diego State | ",
 "Upcoming Nov 4, 7:00 PM Women's · Cal State Fullerton vs Hope International | ",
 "Upcoming Nov 7, 2:00 PM Women's · Cal State Fullerton vs Westcliff | ",
 "Upcoming Nov 12, 11:00 AM Women's · Cal State Fullerton at UC Davis | ",
 "Upcoming Nov 15, 2:00 PM Women's · Cal State Fullerton vs Pacific | ",
 "Upcoming Nov 19, 7:00 PM Women's · Cal State Fullerton vs Weber State | ",
 "Upcoming Nov 24, 7:00 PM Women's · Cal State Fullerton at Portland State | ",
 "Upcoming Dec 3, 6:30 PM Women's · Cal State Fullerton at Sacramento State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Cal State Fullerton at Long Beach State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Cal State Fullerton vs Denver | ",
 "Upcoming Dec 18, 5:30 PM Women's · Cal State Fullerton at Southern Utah | ",
 "Upcoming Dec 20, 11:00 AM Women's · Cal State Fullerton vs Air Force | ",
 "Upcoming Dec 31, 2:00 PM Women's · Cal State Fullerton at UC San Diego | ",
 "Upcoming Jan 2, 2:00 PM Women's · Cal State Fullerton at UC Irvine | ",
 "Upcoming Jan 7, 7:00 PM Women's · Cal State Fullerton vs UC Santa Barbara | ",
 "Upcoming Jan 9, 2:00 PM Women's · Cal State Fullerton vs Cal Poly | ",
 "Upcoming Jan 14, 6:30 PM Women's · Cal State Fullerton at Cal State Bakersfield | ",
 "Upcoming Jan 16, 2:00 PM Women's · Cal State Fullerton at CSUN | ",
 "Upcoming Jan 21, 7:00 PM Women's · Cal State Fullerton vs UC Irvine | ",
 "Upcoming Jan 23, 2:00 PM Women's · Cal State Fullerton vs UC San Diego | ",
 "Upcoming Jan 28, 7:00 PM Women's · Cal State Fullerton vs UC Riverside | ",
 "Upcoming Jan 30, 2:00 PM Women's · Cal State Fullerton vs California Baptist | ",
 "Upcoming Feb 4, 6:00 PM Women's · Cal State Fullerton at Cal Poly | ",
 "Upcoming Feb 6, 2:00 PM Women's · Cal State Fullerton at UC Santa Barbara | ",
 "Upcoming Feb 11, 7:00 PM Women's · Cal State Fullerton vs CSUN | ",
 "Upcoming Feb 13, 2:00 PM Women's · Cal State Fullerton vs Cal State Bakersfield | ",
 "Upcoming Feb 18, 5:00 PM Women's · Cal State Fullerton at Utah Valley | ",
 "Upcoming Feb 20, 2:00 PM Women's · Cal State Fullerton vs Long Beach State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Cal State Fullerton vs Sacramento State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Cal State Fullerton vs Utah Valley | ",
 "Upcoming Mar 4, 6:00 PM Women's · Cal State Fullerton at California Baptist | ",
 "Upcoming Mar 6, 4:00 PM Women's · Cal State Fullerton at UC Riverside | ",
 "Upcoming Mar 10 Women's · Cal State Fullerton at The Big West Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Cal State Fullerton at Mark Covert Classic | Completed",
 "Final Sep 19 Cal State Fullerton at UCR Invite | Completed",
 "Final Oct 17 Cal State Fullerton at UCR Highlander Invitational | Completed",
 "Upcoming Oct 23, 5:00 PM Cal State Fullerton at John Elders Titan Classic | ",
 "Upcoming Oct 31, 8:30 AM Cal State Fullerton at Big West Championships | ",
 "Upcoming Nov 13 Cal State Fullerton at NCAA West Regionals | ",
 "Upcoming Nov 21 Cal State Fullerton at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Cal State Fullerton at Branch Law Firm/Dick McGuire Invitational | Completed",
 "Final Sep 21 Women's · Cal State Fullerton at Golfweek Red Sky Classic | Completed",
 "Final Oct 5 Women's · Cal State Fullerton at Pat Lesser-Harbottle Invitational | Completed",
 "Final Oct 16 Women's · Cal State Fullerton at Stanford Intercollegiate | Completed",
 "Upcoming Feb 15 Women's · Cal State Fullerton at The Molly Collegiate Invitational | ",
 "Upcoming Feb 22 Women's · Cal State Fullerton at Bruin Wave Invitational | ",
 "Upcoming Mar 8 Women's · Cal State Fullerton at Fresno State Classic | ",
 "Upcoming Mar 25 Women's · Cal State Fullerton at PING ASU Invitational | ",
 "Upcoming Apr 5 Women's · Cal State Fullerton at Chevron Silverado Showdown | ",
 "Upcoming Apr 18 Women's · Cal State Fullerton at Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Cal State Fullerton at Ram Masters Invitational | Completed",
 "Final Oct 5 Men's · Cal State Fullerton at Oregon State Invitational | Completed",
 "Final Oct 12 Men's · Cal State Fullerton at Visit Stockton Pacific Invitational | Completed",
 "Upcoming Nov 4 Men's · Cal State Fullerton at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 1 Men's · Cal State Fullerton at Bill Cullum Invitational | ",
 "Upcoming Feb 22 Men's · Cal State Fullerton at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · Cal State Fullerton at The Watney Invitational | ",
 "Upcoming Mar 22 Men's · Cal State Fullerton at The Duck Invite | ",
 "Upcoming Mar 29 Men's · Cal State Fullerton at Wyoming Cowboy Classic | ",
 "Upcoming Apr 9 Men's · Cal State Fullerton at El Macero Classic | ",
 "Upcoming May 2 Men's · Cal State Fullerton at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Cal State Fullerton at San Diego | T, 0-0",
 "Final Aug 20 Women's · Cal State Fullerton at Colorado | L, 2-3",
 "Final Aug 23 Women's · Cal State Fullerton vs LMU | W, 2-1",
 "Final Aug 27 Women's · Cal State Fullerton at San Jose State | T, 2-2",
 "Final Aug 30 Women's · Cal State Fullerton at Stanford | L, 0-7",
 "Final Sep 3 Women's · Cal State Fullerton vs UNLV | W, 6-1",
 "Final Sep 6 Women's · Cal State Fullerton vs Portland | W, 1-0",
 "Final Sep 13 Women's · Cal State Fullerton vs Washington State | T, 1-1",
 "Final Sep 23 Women's · Cal State Fullerton vs UC Riverside | W, 2-0",
 "Final Sep 26 Women's · Cal State Fullerton at CSUN | T, 3-3",
 "Final Sep 30 Women's · Cal State Fullerton vs Cal Poly | W, 1-0",
 "Final Oct 3 Women's · Cal State Fullerton at Utah Valley | T, 1-1",
 "Final Oct 10 Women's · Cal State Fullerton vs UC Santa Barbara | W, 5-0",
 "Final Oct 14 Women's · Cal State Fullerton at Long Beach State | W, 2-1",
 "Final Oct 17 Women's · Cal State Fullerton at Sacramento State | W, 1-0",
 "Final Oct 21 Women's · Cal State Fullerton vs Cal State Bakersfield | W, 3-0",
 "Upcoming Oct 24, 4:00 PM Women's · Cal State Fullerton vs UC San Diego | ",
 "Upcoming Oct 28, 6:00 PM Women's · Cal State Fullerton at UC Irvine | ",
 "Upcoming Oct 31, 1:00 PM Women's · Cal State Fullerton vs California Baptist | ",
 "Upcoming Nov 4 Women's · Cal State Fullerton at The Big West Championship | ",
 "Upcoming Nov 7 Women's · Cal State Fullerton at The Big West Championship | ",
 "Upcoming Nov 13 Women's · Cal State Fullerton at The Big West Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 23 Men's · Cal State Fullerton vs Oregon State | L, 0-3",
 "Final Aug 27 Men's · Cal State Fullerton vs Oral Roberts | T, 2-2",
 "Final Aug 31 Men's · Cal State Fullerton at Seattle | L, 1-7",
 "Final Sep 3 Men's · Cal State Fullerton at Washington | T, 2-2",
 "Final Sep 9 Men's · Cal State Fullerton at Cal | L, 0-1",
 "Final Sep 16 Men's · Cal State Fullerton vs LMU | T, 0-0",
 "Final Sep 20 Men's · Cal State Fullerton vs San Jose State | W, 2-1",
 "Final Sep 23 Men's · Cal State Fullerton at UC San Diego | W, 2-1",
 "Final Sep 26 Men's · Cal State Fullerton at San Diego State | W, 3-0",
 "Final Sep 30 Men's · Cal State Fullerton at UC Riverside | W, 1-0",
 "Final Oct 3 Men's · Cal State Fullerton at UC Irvine | L, 1-3",
 "Final Oct 7 Men's · Cal State Fullerton vs Utah Valley | L, 1-2",
 "Final Oct 10 Men's · Cal State Fullerton at CSUN | L, 1-3",
 "Final Oct 14 Men's · Cal State Fullerton vs California Baptist | L, 1-3",
 "Final Oct 17 Men's · Cal State Fullerton vs UC Santa Barbara | L, 1-2",
 "Final Oct 21 Men's · Cal State Fullerton at Gonzaga | T, 3-3",
 "Upcoming Oct 24, 7:00 PM Men's · Cal State Fullerton vs Cal State Bakersfield | ",
 "Upcoming Oct 31, 3:00 PM Men's · Cal State Fullerton at Sacramento State | ",
 "Upcoming Nov 7 Men's · Cal State Fullerton at Big West Championship Semifinals | ",
 "Upcoming Nov 13 Men's · Cal State Fullerton at Big West Championship Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 1 Cal State Fullerton at Big West Fall Tournament | Completed",
 "Final Oct 15 Cal State Fullerton at ITA Regionals | Completed",
 "Upcoming Oct 30 Cal State Fullerton at Dennis Riza Classic at Jack Kramer Tennis Club | ",
 "Upcoming Nov 14 Cal State Fullerton at Pomona Pitzer Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Cal State Fullerton at Sam Houston | L, 0-3",
 "Final Aug 28 Cal State Fullerton vs McNeese | W, 3-0",
 "Final Aug 29 Cal State Fullerton vs Miami (OH) | L, 1-3",
 "Final Sep 3 Cal State Fullerton at Gonzaga | L, 0-3",
 "Final Sep 4 Cal State Fullerton vs Eastern Washington | W, 3-2",
 "Final Sep 5 Cal State Fullerton vs Oral Roberts | L, 1-3",
 "Final Sep 11 Cal State Fullerton vs Bethune-Cookman | W, 3-0",
 "Final Sep 11 Cal State Fullerton at Charleston Southern | W, 3-2",
 "Final Sep 12 Cal State Fullerton vs The Citadel | L, 1-3",
 "Final Sep 17 Cal State Fullerton at Tulane | L, 0-3",
 "Final Sep 18 Cal State Fullerton vs Florida A&M | W, 3-1",
 "Final Sep 18 Cal State Fullerton vs New Orleans | L, 1-3",
 "Final Sep 19 Cal State Fullerton vs Idaho | L, 1-3",
 "Final Sep 25 Cal State Fullerton at UC San Diego | L, 0-3",
 "Final Sep 26 Cal State Fullerton at UC Irvine | L, 1-3",
 "Final Oct 2 Cal State Fullerton at Cal State Bakersfield | L, 0-3",
 "Final Oct 3 Cal State Fullerton at CSUN | L, 0-3",
 "Final Oct 9 Cal State Fullerton vs Cal Poly | L, 0-3",
 "Final Oct 10 Cal State Fullerton vs UC Santa Barbara | W, 3-2",
 "Final Oct 15 Cal State Fullerton at Sacramento State | L, 1-3",
 "Final Oct 17 Cal State Fullerton at Utah Valley | L, 0-3",
 "Upcoming Oct 23, 7:00 PM Cal State Fullerton at Long Beach State | ",
 "Upcoming Oct 24, 2:00 PM Cal State Fullerton vs Long Beach State | ",
 "Upcoming Oct 30, 6:00 PM Cal State Fullerton vs CSUN | ",
 "Upcoming Oct 31, 2:00 PM Cal State Fullerton vs Cal State Bakersfield | ",
 "Upcoming Nov 6, 6:00 PM Cal State Fullerton at UC Santa Barbara | ",
 "Upcoming Nov 7, 6:00 PM Cal State Fullerton at Cal Poly | ",
 "Upcoming Nov 13, 6:00 PM Cal State Fullerton vs California Baptist | ",
 "Upcoming Nov 14, 2:00 PM Cal State Fullerton vs UC Riverside | ",
 "Upcoming Nov 20, 6:00 PM Cal State Fullerton vs UC Irvine | ",
 "Upcoming Nov 21, 2:00 PM Cal State Fullerton vs UC San Diego | ",
 "Upcoming Nov 25 Cal State Fullerton at The Big West Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Cal State Fullerton vs Concordia University Irvine | L, 11-13",
 "Final Aug 28 Men's · Cal State Fullerton vs LMU | L, 5-15",
 "Final Aug 29 Men's · Cal State Fullerton vs Stanford | L, 4-16",
 "Final Aug 29 Men's · Cal State Fullerton vs Redlands | W, 13-8",
 "Final Sep 4 Men's · Cal State Fullerton vs Fresno Pacific | W, 15-6",
 "Final Sep 4 Men's · Cal State Fullerton vs Claremont-Mudd-Scripps | W, 13-10",
 "Final Sep 5 Men's · Cal State Fullerton vs Concordia University Irvine | L, 9-13",
 "Final Sep 5 Men's · Cal State Fullerton vs Redlands | W, 11-5",
 "Final Sep 11 Men's · Cal State Fullerton vs Pomona | L, 8-10",
 "Final Sep 11 Men's · Cal State Fullerton vs UC San Diego | L, 9-16",
 "Final Sep 12 Men's · Cal State Fullerton vs Air Force | L, 11-17",
 "Final Sep 12 Men's · Cal State Fullerton vs Chapman | W, 16-13",
 "Final Sep 18 Men's · Cal State Fullerton vs Fresno Pacific | W, 11-8",
 "Final Sep 18 Men's · Cal State Fullerton vs Cal Lutheran | W, 18-12",
 "Final Sep 19 Men's · Cal State Fullerton vs Brown | W, 12-11",
 "Final Sep 19 Men's · Cal State Fullerton vs Biola | W, 14-12",
 "Final Sep 25 Men's · Cal State Fullerton vs Cal Baptist | L, 6-17",
 "Final Sep 26 Men's · Cal State Fullerton vs Fresno Pacific | W, 14-11",
 "Final Sep 26 Men's · Cal State Fullerton vs Toronto | W, 18-9",
 "Final Sep 30 Men's · Cal State Fullerton vs McKendree | W, 19-7",
 "Final Oct 1 Men's · Cal State Fullerton vs UC Merced | W, 10-8",
 "Final Oct 2 Men's · Cal State Fullerton vs Claremont-Mudd-Scripps | W, 12-8",
 "Final Oct 2 Men's · Cal State Fullerton vs Chapman | W, 18-11",
 "Final Oct 3 Men's · Cal State Fullerton vs La Verne | W, 20-14",
 "Final Oct 3 Men's · Cal State Fullerton vs Whittier College | W, 14-8",
 "Final Oct 9 Men's · Cal State Fullerton at UC Irvine | L, 6-19",
 "Final Oct 16 Men's · Cal State Fullerton at Long Beach State | L, 7-20",
 "Today Oct 22, 6:00 PM Men's · Cal State Fullerton vs Cal Baptist | ",
 "Upcoming Oct 30, 6:00 PM Men's · Cal State Fullerton at UC San Diego | ",
 "Upcoming Nov 8, 12:00 PM Men's · Cal State Fullerton vs UC Santa Barbara | ",
 "Upcoming Nov 13, 6:00 PM Men's · Cal State Fullerton vs Concordia University Irvine | ",
 "Upcoming Nov 20 Men's · Cal State Fullerton at Big West Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Cal State Fullerton module checks passed");
