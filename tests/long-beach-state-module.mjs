import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {longBeachStateSchool} from '../src/schools/long-beach-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='long-beach-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,longBeachStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/long-beach-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit longbeachstate.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['long-beach-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',longBeachStateSchool.scheduleUrls],['roster',longBeachStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('long-beach-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'longbeachstate.com',`${key} must stay on longbeachstate.com`);
  }
}
const parity={"Baseball":{"schedule":["https://longbeachstate.com/sports/baseball/schedule"],"roster":["https://longbeachstate.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://longbeachstate.com/sports/mens-basketball/schedule","https://longbeachstate.com/sports/womens-basketball/schedule"],"roster":["https://longbeachstate.com/sports/mens-basketball/roster","https://longbeachstate.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://longbeachstate.com/sports/womens-beach-volleyball/schedule"],"roster":["https://longbeachstate.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://longbeachstate.com/sports/cross-country/schedule"],"roster":["https://longbeachstate.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://longbeachstate.com/sports/womens-golf/schedule","https://longbeachstate.com/sports/mens-golf/schedule"],"roster":["https://longbeachstate.com/sports/womens-golf/roster","https://longbeachstate.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://longbeachstate.com/sports/womens-soccer/schedule"],"roster":["https://longbeachstate.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://longbeachstate.com/sports/softball/schedule"],"roster":["https://longbeachstate.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://longbeachstate.com/sports/womens-tennis/schedule"],"roster":["https://longbeachstate.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://longbeachstate.com/sports/track-and-field/schedule"],"roster":["https://longbeachstate.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://longbeachstate.com/sports/womens-volleyball/schedule","https://longbeachstate.com/sports/mens-volleyball/schedule"],"roster":["https://longbeachstate.com/sports/womens-volleyball/roster","https://longbeachstate.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://longbeachstate.com/sports/womens-water-polo/schedule","https://longbeachstate.com/sports/mens-water-polo/schedule"],"roster":["https://longbeachstate.com/sports/womens-water-polo/roster","https://longbeachstate.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'long-beach-state|"+sport+"':"),`${sport} routes must live in the Long Beach State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://longbeachstate.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.longBeachStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=long-beach-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · Long Beach State at San Diego State (Exhib.) (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Long Beach State at Utah | ",
 "Upcoming Nov 7, 6:00 PM Men's · Long Beach State at Montana State | ",
 "Upcoming Nov 11, 7:00 PM Men's · Long Beach State vs Pacific | ",
 "Upcoming Nov 16, 7:00 PM Men's · Long Beach State at UCLA | ",
 "Upcoming Nov 23, 1:00 PM Men's · Long Beach State at FIU | ",
 "Upcoming Nov 24, 3:30 PM Men's · Long Beach State vs Arkansas State | ",
 "Upcoming Nov 25, 1:00 PM Men's · Long Beach State vs Southern Utah | ",
 "Upcoming Dec 3, 7:00 PM Men's · Long Beach State vs Utah Valley | ",
 "Upcoming Dec 5, 6:00 PM Men's · Long Beach State at Cal State Fullerton | ",
 "Upcoming Dec 8, 7:00 PM Men's · Long Beach State at San Jose State | ",
 "Upcoming Dec 10, 6:00 PM Men's · Long Beach State at Illinois State | ",
 "Upcoming Dec 22, 2:00 PM Men's · Long Beach State vs Portland | ",
 "Upcoming Dec 31, 6:00 PM Men's · Long Beach State vs UC Irvine | ",
 "Upcoming Jan 2, 6:00 PM Men's · Long Beach State vs UC San Diego | ",
 "Upcoming Jan 7, 7:00 PM Men's · Long Beach State at Cal Poly | ",
 "Upcoming Jan 9, 6:00 PM Men's · Long Beach State at UC Santa Barbara | ",
 "Upcoming Jan 14, 7:00 PM Men's · Long Beach State vs CSUN | ",
 "Upcoming Jan 16, 6:00 PM Men's · Long Beach State vs Cal State Bakersfield | ",
 "Upcoming Jan 21, 7:00 PM Men's · Long Beach State at UC San Diego | ",
 "Upcoming Jan 23, 6:00 PM Men's · Long Beach State at UC Irvine | ",
 "Upcoming Jan 28, 7:00 PM Men's · Long Beach State at California Baptist | ",
 "Upcoming Jan 30, 7:00 PM Men's · Long Beach State at UC Riverside | ",
 "Upcoming Feb 4, 7:00 PM Men's · Long Beach State vs UC Santa Barbara | ",
 "Upcoming Feb 6, 6:00 PM Men's · Long Beach State vs Cal Poly | ",
 "Upcoming Feb 11, 7:00 PM Men's · Long Beach State at Cal State Bakersfield | ",
 "Upcoming Feb 13, 5:00 PM Men's · Long Beach State at CSUN | ",
 "Upcoming Feb 18, 7:00 PM Men's · Long Beach State vs Sacramento State | ",
 "Upcoming Feb 20, 6:00 PM Men's · Long Beach State vs Cal State Fullerton | ",
 "Upcoming Feb 25, 7:00 PM Men's · Long Beach State at Utah Valley | ",
 "Upcoming Feb 27, 7:00 PM Men's · Long Beach State at Sacramento State | ",
 "Upcoming Mar 4, 7:00 PM Men's · Long Beach State vs UC Riverside | ",
 "Upcoming Mar 6, 6:00 PM Men's · Long Beach State vs California Baptist | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 6:00 PM Women's · Long Beach State at California | ",
 "Upcoming Nov 9, 6:00 PM Women's · Long Beach State vs Santa Clara | ",
 "Upcoming Nov 14, 6:00 PM Women's · Long Beach State at Portland | ",
 "Upcoming Nov 19, 6:00 PM Women's · Long Beach State at San Francisco | ",
 "Upcoming Nov 21, 11:00 AM Women's · Long Beach State at San José State | ",
 "Upcoming Nov 30, 6:00 PM Women's · Long Beach State vs Hope International | ",
 "Upcoming Dec 3, 5:00 PM Women's · Long Beach State at Utah Valley | ",
 "Upcoming Dec 5, 2:00 PM Women's · Long Beach State vs Cal State Fullerton | ",
 "Upcoming Dec 9, 6:00 PM Women's · Long Beach State vs Idaho | ",
 "Upcoming Dec 13, 2:00 PM Women's · Long Beach State vs LMU | ",
 "Upcoming Dec 21, 6:00 PM Women's · Long Beach State vs Northern Arizona | ",
 "Upcoming Dec 31, 6:00 PM Women's · Long Beach State at UC Irvine | ",
 "Upcoming Jan 2, 4:00 PM Women's · Long Beach State at UC San Diego | ",
 "Upcoming Jan 7, 6:00 PM Women's · Long Beach State vs Cal Poly | ",
 "Upcoming Jan 9, 2:00 PM Women's · Long Beach State vs UC Santa Barbara | ",
 "Upcoming Jan 14, 11:30 AM Women's · Long Beach State at CSUN | ",
 "Upcoming Jan 16, 2:00 PM Women's · Long Beach State at Cal State Bakersfield | ",
 "Upcoming Jan 21, 6:00 PM Women's · Long Beach State vs UC San Diego | ",
 "Upcoming Jan 23, 2:00 PM Women's · Long Beach State vs UC Irvine | ",
 "Upcoming Jan 28, 6:00 PM Women's · Long Beach State vs California Baptist | ",
 "Upcoming Jan 30, 2:00 PM Women's · Long Beach State vs UC Riverside | ",
 "Upcoming Feb 4, 6:00 PM Women's · Long Beach State at UC Santa Barbara | ",
 "Upcoming Feb 6, 2:00 PM Women's · Long Beach State at Cal Poly | ",
 "Upcoming Feb 11, 6:00 PM Women's · Long Beach State vs Cal State Bakersfield | ",
 "Upcoming Feb 13, 2:00 PM Women's · Long Beach State vs CSUN | ",
 "Upcoming Feb 18, 6:30 PM Women's · Long Beach State at Sacramento State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Long Beach State at Cal State Fullerton | ",
 "Upcoming Feb 25, 6:00 PM Women's · Long Beach State vs Utah Valley | ",
 "Upcoming Feb 27, 2:00 PM Women's · Long Beach State vs Sacramento State | ",
 "Upcoming Mar 4, 6:00 PM Women's · Long Beach State at UC Riverside | ",
 "Upcoming Mar 6, 1:00 PM Women's · Long Beach State at California Baptist | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Long Beach State at Mark Covert Classic | Women's team: 7th / Men's team: 2nd",
 "Final Sep 19 Long Beach State at UC Riverside Invitational | Women's team: 21st / Men's team: 21st",
 "Final Oct 17 Long Beach State at Bronco Invitational | Completed",
 "Upcoming Oct 31 Long Beach State at Big West Championships | ",
 "Upcoming Nov 13 Long Beach State at NCAA West Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 2 Women's · Long Beach State at Pan-Pacific University Golf Super League | 6th of 12",
 "Final Sep 14 Women's · Long Beach State at Leadership and Golf Invitational | T10th of 17",
 "Final Sep 18 Women's · Long Beach State at Rudolph Championship | 13th of 15",
 "Final Oct 2 Women's · Long Beach State at Ron Moore Intercollegiate | 7th of 15",
 "Final Oct 19 Women's · Long Beach State at Rainbow Wahine Invitational | 2nd of 14",
 "Upcoming Feb 8 Women's · Long Beach State at San Diego State Dual Match | ",
 "Upcoming Feb 13 Women's · Long Beach State at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Feb 22 Women's · Long Beach State at Bruin Wave Invitational | ",
 "Upcoming Mar 9 Women's · Long Beach State at Juli Inkster Invitational | ",
 "Upcoming Apr 5 Women's · Long Beach State at Silverado Showdown | ",
 "Upcoming Apr 18 Women's · Long Beach State at Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Long Beach State at Vuori Invitaitonal | 8th of 12",
 "Final Sep 25 Men's · Long Beach State at William Tucker Invitational | 13th of 15",
 "Final Sep 29 Men's · Long Beach State at Mark Simpson Colorado Invitational | 2nd of 17",
 "Final Oct 19 Men's · Long Beach State at Saint Mary's Invitational | T13th of 18",
 "Upcoming Feb 11 Men's · Long Beach State at John A. Burns Intercollegiate | ",
 "Upcoming Mar 8 Men's · Long Beach State at R.E. Lamkin Invitational | ",
 "Upcoming Mar 15 Men's · Long Beach State at Arizona Thunderbirds Intercollegiate | ",
 "Upcoming Mar 26 Men's · Long Beach State at The Goodwin | ",
 "Upcoming Apr 5 Men's · Long Beach State at Golfweek.com Invitational | ",
 "Upcoming Apr 9 Men's · Long Beach State at ASU Thunderbird Collegiate | ",
 "Upcoming May 2 Men's · Long Beach State at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Long Beach State vs Saint Mary's | T, 0-0",
 "Final Aug 16 Long Beach State vs Colgate | W, 1-0",
 "Final Aug 20 Long Beach State at Fresno State | W, 5-0",
 "Final Aug 23 Long Beach State at NM State | W, 2-0",
 "Final Aug 29 Long Beach State vs Weber State | W, 3-0",
 "Final Sep 3 Long Beach State vs Portland | W, 2-1",
 "Final Sep 6 Long Beach State at Grand Canyon | T, 1-1",
 "Final Sep 12 Long Beach State vs Utah | L, 1-5",
 "Final Sep 17 Long Beach State at Nevada | W, 3-0",
 "Final Sep 23 Long Beach State at UC Santa Barbara | T, 2-2",
 "Final Sep 26 Long Beach State at Cal Poly | T, 1-1",
 "Final Sep 30 Long Beach State vs CSUN | L, 3-4",
 "Final Oct 3 Long Beach State vs Sacramento State | T, 2-2",
 "Final Oct 10 Long Beach State vs California Baptist | W, 1-0",
 "Final Oct 14 Long Beach State vs Cal State Fullerton | L, 1-2",
 "Final Oct 17 Long Beach State at UC Irvine | W, 2-1",
 "Final Oct 21 Long Beach State at UC San Diego | L, 1-2",
 "Upcoming Oct 24, 7:00 PM Long Beach State vs UC Riverside | ",
 "Upcoming Oct 28, 6:00 PM Long Beach State at Utah Valley | ",
 "Upcoming Oct 31, 1:00 PM Long Beach State vs Cal State Bakersfield | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 1 Long Beach State at Big West Fall Tournament | Completed",
 "Final Oct 15 Long Beach State at ITA Southwest Regionals | Completed",
 "Upcoming Oct 30 Long Beach State at Dennis Rizza Intercollegiate | ",
 "Upcoming Nov 6 Long Beach State at CSUN Fall Tournament | ",
 "Upcoming Jan 15 Long Beach State at Long Beach State Tennis Winter Invite | ",
 "Upcoming Jan 22 Long Beach State at ITA Kick-Off Weekend | ",
 "Upcoming Jan 27 Long Beach State vs UC Riverside | ",
 "Upcoming Feb 5 Long Beach State vs New Mexico | ",
 "Upcoming Feb 11 Long Beach State at Northern Arizona | ",
 "Upcoming Feb 12 Long Beach State at Grand Canyon | ",
 "Upcoming Feb 13 Long Beach State vs Washington State | ",
 "Upcoming Feb 19 Long Beach State at UC San Diego | ",
 "Upcoming Feb 20 Long Beach State vs Nevada | ",
 "Upcoming Feb 26 Long Beach State at LMU | ",
 "Upcoming Mar 2 Long Beach State vs Youngstown State | ",
 "Upcoming Mar 11 Long Beach State at UC Davis | ",
 "Upcoming Mar 12 Long Beach State at Sacramento State | ",
 "Upcoming Mar 13 Long Beach State at Saint Mary's | ",
 "Upcoming Mar 17 Long Beach State at Fresno State | ",
 "Upcoming Mar 27 Long Beach State at Cal State Fullerton | ",
 "Upcoming Mar 28 Long Beach State vs Brown | ",
 "Upcoming Apr 2 Long Beach State vs UC Santa Barbara | ",
 "Upcoming Apr 10 Long Beach State vs CSUN | ",
 "Upcoming Apr 16 Long Beach State vs Cal Poly | ",
 "Upcoming Apr 17 Long Beach State at UC Irvine | ",
 "Upcoming Apr 28 Long Beach State at Big West Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Long Beach State vs UCLA | L, 1-3",
 "Final Aug 29 Women's · Long Beach State at UCLA | L, 0-3",
 "Final Sep 4 Women's · Long Beach State vs Eastern Illinois | W, 3-0",
 "Final Sep 5 Women's · Long Beach State at Utah | W, 3-2",
 "Final Sep 6 Women's · Long Beach State vs Wyoming | W, 3-2",
 "Final Sep 11 Women's · Long Beach State vs Brown | W, 3-1",
 "Final Sep 12 Women's · Long Beach State vs San José State | W, 3-1",
 "Final Sep 13 Women's · Long Beach State vs Loyola Marymount | W, 3-0",
 "Final Sep 17 Women's · Long Beach State at Washington State | W, 3-0",
 "Final Sep 18 Women's · Long Beach State at Washington State | W, 3-2",
 "Final Sep 25 Women's · Long Beach State at UC Irvine | W, 3-0",
 "Final Sep 26 Women's · Long Beach State at UC San Diego | W, 3-1",
 "Final Oct 2 Women's · Long Beach State at CSUN | L, 0-3",
 "Final Oct 3 Women's · Long Beach State at Cal State Bakersfield | W, 3-0",
 "Final Oct 9 Women's · Long Beach State vs UC Santa Barbara | W, 3-1",
 "Final Oct 10 Women's · Long Beach State vs Cal Poly | L, 0-3",
 "Final Oct 15 Women's · Long Beach State at Utah Valley | W, 3-2",
 "Final Oct 17 Women's · Long Beach State at Sacramento State | W, 3-0",
 "Upcoming Oct 23, 7:00 PM Women's · Long Beach State vs Cal State Fullerton | ",
 "Upcoming Oct 24, 2:00 PM Women's · Long Beach State at Cal State Fullerton | ",
 "Upcoming Oct 30, 7:00 PM Women's · Long Beach State vs Cal State Bakersfield | ",
 "Upcoming Oct 31, 3:00 PM Women's · Long Beach State vs CSUN | ",
 "Upcoming Nov 6, 6:00 PM Women's · Long Beach State at Cal Poly | ",
 "Upcoming Nov 7, 7:00 PM Women's · Long Beach State at UC Santa Barbara | ",
 "Upcoming Nov 13, 7:00 PM Women's · Long Beach State vs UC Riverside | ",
 "Upcoming Nov 14, 6:00 PM Women's · Long Beach State vs California Baptist | ",
 "Upcoming Nov 20, 7:00 PM Women's · Long Beach State vs UC San Diego | ",
 "Upcoming Nov 21, 6:00 PM Women's · Long Beach State vs UC Irvine | ",
 "Upcoming Nov 25 Women's · Long Beach State at Big West Championship | ",
 "Upcoming Nov 27 Women's · Long Beach State at Big West Championship | ",
 "Upcoming Nov 28 Women's · Long Beach State at Big West Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Long Beach State vs McKendree | W, 28-9",
 "Final Aug 28 Men's · Long Beach State vs Bucknell | W, 28-15",
 "Final Aug 29 Men's · Long Beach State vs Mercyhurst | W, 24-4",
 "Final Aug 29 Men's · Long Beach State vs Saint Mary's | W, 16-10",
 "Final Aug 30 Men's · Long Beach State vs Pepperdine | W, 20-18",
 "Final Aug 30 Men's · Long Beach State vs La Verne | W, 25-6",
 "Final Sep 4 Men's · Long Beach State vs USC | L, 11-17",
 "Final Sep 5 Men's · Long Beach State vs Golden West College (Exhib.) (Exhibition) | W, 20-11",
 "Final Sep 5 Men's · Long Beach State vs Orange Coast College (Exhib.) (Exhibition) | W, 20-7",
 "Final Sep 18 Men's · Long Beach State vs UC Santa Barbara | W, 16-9",
 "Final Sep 19 Men's · Long Beach State at Stanford | L, 13-17",
 "Final Sep 19 Men's · Long Beach State vs San Jose State | W, 17-11",
 "Final Sep 20 Men's · Long Beach State vs UC San Diego | W, 17-16",
 "Final Sep 25 Men's · Long Beach State vs Pacific | L, 11-12",
 "Final Sep 27 Men's · Long Beach State vs Fordham | L, 10-14",
 "Final Oct 3 Men's · Long Beach State vs Redlands | W, 20-8",
 "Final Oct 3 Men's · Long Beach State vs Concordia Irvine | W, 16-12",
 "Final Oct 9 Men's · Long Beach State vs UC San Diego | L, 12-13",
 "Final Oct 10 Men's · Long Beach State at Claremont-Mudd-Scripps | W, 21-7",
 "Final Oct 10 Men's · Long Beach State at Pomona-Pitzer | W, 15-8",
 "Final Oct 16 Men's · Long Beach State vs Cal State Fullerton | W, 20-7",
 "Final Oct 17 Men's · Long Beach State vs Chapman | W, 24-10",
 "Upcoming Oct 23, 3:00 PM Men's · Long Beach State vs Stanford | ",
 "Upcoming Oct 24, 12:00 PM Men's · Long Beach State at UC Santa Barbara | ",
 "Upcoming Oct 31, 12:00 PM Men's · Long Beach State at California Baptist | ",
 "Upcoming Nov 6, 7:00 PM Men's · Long Beach State vs UC Irvine | ",
 "Upcoming Nov 12, 6:00 PM Men's · Long Beach State at LMU | ",
 "Upcoming Nov 14, 5:00 PM Men's · Long Beach State at Pepperdine | ",
 "Upcoming Nov 20, 10:00 AM Men's · Long Beach State at Big West Championship (Game 1) | ",
 "Upcoming Nov 20, 12:00 PM Men's · Long Beach State at Big West Championship (Game 2) | ",
 "Upcoming Nov 21, 10:00 AM Men's · Long Beach State at Big West Championship (Game 1) | ",
 "Upcoming Nov 21, 12:00 PM Men's · Long Beach State at Big West Championship (Game 2) | ",
 "Upcoming Nov 22, 12:00 PM Men's · Long Beach State at Big West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Long Beach State module checks passed");
