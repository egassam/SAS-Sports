import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {calPolySchool} from '../src/schools/cal-poly.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='cal-poly');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,calPolyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cal-poly-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gopoly.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['cal-poly'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',calPolySchool.scheduleUrls],['roster',calPolySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cal-poly|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gopoly.com',`${key} must stay on gopoly.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gopoly.com/sports/baseball/schedule"],"roster":["https://gopoly.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gopoly.com/sports/mens-basketball/schedule","https://gopoly.com/sports/womens-basketball/schedule"],"roster":["https://gopoly.com/sports/mens-basketball/roster","https://gopoly.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gopoly.com/sports/womens-beach-volleyball/schedule"],"roster":["https://gopoly.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gopoly.com/sports/cross-country/schedule"],"roster":["https://gopoly.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gopoly.com/sports/football/schedule"],"roster":["https://gopoly.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gopoly.com/sports/womens-golf/schedule","https://gopoly.com/sports/mens-golf/schedule"],"roster":["https://gopoly.com/sports/womens-golf/roster","https://gopoly.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gopoly.com/sports/womens-soccer/schedule","https://gopoly.com/sports/mens-soccer/schedule"],"roster":["https://gopoly.com/sports/womens-soccer/roster","https://gopoly.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gopoly.com/sports/softball/schedule"],"roster":["https://gopoly.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gopoly.com/sports/womens-tennis/schedule","https://gopoly.com/sports/mens-tennis/schedule"],"roster":["https://gopoly.com/sports/womens-tennis/roster","https://gopoly.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gopoly.com/sports/track-and-field/schedule"],"roster":["https://gopoly.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gopoly.com/sports/womens-volleyball/schedule"],"roster":["https://gopoly.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gopoly.com/sports/wrestling/schedule"],"roster":["https://gopoly.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'cal-poly|"+sport+"':"),`${sport} routes must live in the Cal Poly module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gopoly.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.calPolyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=cal-poly)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 23, 11:00 AM Men's · Cal Poly vs Westmont (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Cal Poly vs Cal State San Marcos | ",
 "Upcoming Nov 5, 7:30 PM Men's · Cal Poly at Arizona | ",
 "Upcoming Nov 11, 6:00 PM Men's · Cal Poly at Grand Canyon | ",
 "Upcoming Nov 13, 5:00 PM Men's · Cal Poly at Idaho | ",
 "Upcoming Nov 15, 3:00 PM Men's · Cal Poly at Montana State | ",
 "Upcoming Nov 21, 4:00 PM Men's · Cal Poly vs Northern Arizona | ",
 "Upcoming Dec 3, 7:00 PM Men's · Cal Poly at CSUN | ",
 "Upcoming Dec 5, 6:00 PM Men's · Cal Poly at UC Santa Barbara | ",
 "Upcoming Dec 12, 2:30 PM Men's · Cal Poly vs Montana | ",
 "Upcoming Dec 15, 6:00 PM Men's · Cal Poly at Colorado | ",
 "Upcoming Dec 22, 7:00 PM Men's · Cal Poly at UNLV | ",
 "Upcoming Dec 31, 2:00 PM Men's · Cal Poly at UC Riverside | ",
 "Upcoming Jan 2, 5:00 PM Men's · Cal Poly at California Baptist | ",
 "Upcoming Jan 7, 7:00 PM Men's · Cal Poly vs Long Beach State | ",
 "Upcoming Jan 9, 4:00 PM Men's · Cal Poly vs Cal State Fullerton | ",
 "Upcoming Jan 14, 7:00 PM Men's · Cal Poly at Sacramento State | ",
 "Upcoming Jan 16, 1:00 PM Men's · Cal Poly at Utah Valley | ",
 "Upcoming Jan 21, 7:00 PM Men's · Cal Poly vs Cal State Bakersfield | ",
 "Upcoming Jan 23, 4:00 PM Men's · Cal Poly vs CSUN | ",
 "Upcoming Jan 28, 7:00 PM Men's · Cal Poly vs UC Irvine | ",
 "Upcoming Jan 30, 4:00 PM Men's · Cal Poly vs UC San Diego | ",
 "Upcoming Feb 4, 7:00 PM Men's · Cal Poly at Cal State Fullerton | ",
 "Upcoming Feb 6, 6:00 PM Men's · Cal Poly at Long Beach State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Cal Poly vs California Baptist | ",
 "Upcoming Feb 13, 4:00 PM Men's · Cal Poly vs UC Riverside | ",
 "Upcoming Feb 18, 11:00 AM Men's · Cal Poly at CSU Bakersfield | ",
 "Upcoming Feb 20, 4:00 PM Men's · Cal Poly vs UC Santa Barbara | ",
 "Upcoming Feb 25, 7:00 PM Men's · Cal Poly at UC San Diego | ",
 "Upcoming Feb 27, 7:00 PM Men's · Cal Poly at UC Irvine | ",
 "Upcoming Mar 4, 7:00 PM Men's · Cal Poly vs Utah Valley | ",
 "Upcoming Mar 6, 4:00 PM Men's · Cal Poly vs Sacramento State | ",
 "Upcoming Mar 10 Men's · Cal Poly vs Opening Round (TBD) | ",
 "Upcoming Mar 11 Men's · Cal Poly at Quarterfinal (TBD) | ",
 "Upcoming Mar 12 Men's · Cal Poly at Semifinal (TBD) | ",
 "Upcoming Mar 13 Men's · Cal Poly at Championship (TBD) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 21 Women's · Cal Poly vs Cal State San Marcos (exhib.) (Exhibition) | W, 70-38",
 "Upcoming Oct 29, 11:00 AM Women's · Cal Poly vs Cal State Monterey Bay (exhib.) (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · Cal Poly vs UC Merced | ",
 "Upcoming Nov 5, 6:00 PM Women's · Cal Poly vs Whittier College | ",
 "Upcoming Nov 9, 6:00 PM Women's · Cal Poly at Idaho State | ",
 "Upcoming Nov 11, 6:00 PM Women's · Cal Poly vs Seattle | ",
 "Upcoming Nov 19, 7:00 PM Women's · Cal Poly at UCLA | ",
 "Upcoming Nov 22, 2:00 PM Women's · Cal Poly at Washington | ",
 "Upcoming Dec 3, 6:00 PM Women's · Cal Poly vs CSUN | ",
 "Upcoming Dec 5, 2:00 PM Women's · Cal Poly vs UC Santa Barbara | ",
 "Upcoming Dec 12, 12:00 PM Women's · Cal Poly vs Eastern Washington | ",
 "Upcoming Dec 19, 12:00 PM Women's · Cal Poly at Utah Tech | ",
 "Upcoming Dec 28, 2:00 PM Women's · Cal Poly at Stanford | ",
 "Upcoming Dec 31, 4:00 PM Women's · Cal Poly vs UC Riverside | ",
 "Upcoming Jan 2, 2:00 PM Women's · Cal Poly vs California Baptist | ",
 "Upcoming Jan 7, 6:00 PM Women's · Cal Poly at Long Beach State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Cal Poly at Cal State Fullerton | ",
 "Upcoming Jan 14, 6:00 PM Women's · Cal Poly vs Sacramento State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Cal Poly vs Utah Valley | ",
 "Upcoming Jan 21, 6:30 PM Women's · Cal Poly at Cal State Bakersfield | ",
 "Upcoming Jan 23, 2:00 PM Women's · Cal Poly at CSUN | ",
 "Upcoming Jan 28, 6:00 PM Women's · Cal Poly at UC Irvine | ",
 "Upcoming Jan 30, 4:00 PM Women's · Cal Poly at UC San Diego | ",
 "Upcoming Feb 4, 6:00 PM Women's · Cal Poly vs Cal State Fullerton | ",
 "Upcoming Feb 6, 2:00 PM Women's · Cal Poly vs Long Beach State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Cal Poly at California Baptist | ",
 "Upcoming Feb 13, 4:00 PM Women's · Cal Poly at UC Riverside | ",
 "Upcoming Feb 18, 6:00 PM Women's · Cal Poly vs Cal State Bakersfield | ",
 "Upcoming Feb 20, 2:00 PM Women's · Cal Poly at UC Santa Barbara | ",
 "Upcoming Feb 25, 6:00 PM Women's · Cal Poly vs UC San Diego | ",
 "Upcoming Feb 27, 2:00 PM Women's · Cal Poly vs UC Irvine | ",
 "Upcoming Mar 4, 5:00 PM Women's · Cal Poly at Utah Valley | ",
 "Upcoming Mar 6, 1:00 PM Women's · Cal Poly at Sacramento State | ",
 "Upcoming Mar 10 Women's · Cal Poly at 2027 Credit Union 1 Big West Basketball Championships | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 3 Cal Poly at Gaucho Twilight | Women's team: 1st / Men's team: 1st",
 "Final Sep 25 Cal Poly at Sean Earl Lakefront Invitational | Women's team: 14th / Men's team: 15th",
 "Final Oct 2 Cal Poly at Pacific Invitational | Women's team: 1st",
 "Final Oct 16 Cal Poly at Arturo Barrios Invitational | Women's team: 10th / Men's team: 7th",
 "Final Oct 17 Cal Poly at Bronco Invitational | Women's team: 7th",
 "Upcoming Oct 31 Cal Poly at Big West Championships | ",
 "Upcoming Nov 13 Cal Poly at NCAA West Regional | ",
 "Upcoming Nov 21 Cal Poly at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Cal Poly vs Idaho | W, 38-34",
 "Final Sep 5 Cal Poly vs Central Washington | W, 24-17",
 "Final Sep 12 Cal Poly at San Jose State | L, 20-30",
 "Final Sep 19 Cal Poly vs San Diego | L, 35-38",
 "Final Sep 26 Cal Poly at Eastern Washington | W, 31-27",
 "Final Oct 3 Cal Poly vs Weber State | L, 34-42",
 "Final Oct 10 Cal Poly at Idaho State | W, 25-24",
 "Final Oct 17 Cal Poly at Northern Colorado | L, 18-28",
 "Upcoming Oct 24, 2:00 PM Cal Poly vs Utah Tech | ",
 "Upcoming Oct 31, 12:00 PM Cal Poly at Montana State | ",
 "Upcoming Nov 7, 2:00 PM Cal Poly vs Northern Arizona | ",
 "Upcoming Nov 21, 1:00 PM Cal Poly at UC Davis | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Cal Poly at Leadership & Golf Invitational | 13th",
 "Final Sep 21 Women's · Cal Poly at Connell Resources Ram Classic | 7th",
 "Final Oct 12 Women's · Cal Poly at Golf Iconic Classic | 12th",
 "Final Oct 19 Women's · Cal Poly at Route 66 Invitational | 5th",
 "Upcoming Feb 1 Women's · Cal Poly at Paradise Invitational | ",
 "Upcoming Feb 22 Women's · Cal Poly at Causeway Invitational | ",
 "Upcoming Mar 9 Women's · Cal Poly at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · Cal Poly at Dr. Donnis Invitational | ",
 "Upcoming Apr 5 Women's · Cal Poly at Chevron Silverado Showdown | ",
 "Upcoming Apr 18 Women's · Cal Poly at 2027 Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Cal Poly at The Canadian Collegiate | 9th",
 "Final Sep 28 Men's · Cal Poly at The Windon Memorial | 7th",
 "Final Oct 19 Men's · Cal Poly at Saint Mary's Invitational | Completed",
 "Upcoming Oct 26 Men's · Cal Poly at The Preserve Golf Club Collegiate | ",
 "Upcoming Feb 1 Men's · Cal Poly at Bill Cullum Invitational | ",
 "Upcoming Feb 11 Men's · Cal Poly at John A. Burns Intercollegiate | ",
 "Upcoming Mar 15 Men's · Cal Poly at The All-American Intercollegiate | ",
 "Upcoming Mar 22 Men's · Cal Poly at Pathway to Progression Collegiate Invitational | ",
 "Upcoming Mar 25 Men's · Cal Poly at The Goodwin | ",
 "Upcoming Apr 19 Men's · Cal Poly at Seattle Seahawk Invitational | ",
 "Upcoming May 2 Men's · Cal Poly at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Cal Poly vs UNLV | W, 1-0",
 "Final Aug 16 Women's · Cal Poly vs Stanford | L, 0-1",
 "Final Aug 23 Women's · Cal Poly vs San Jose State | W, 3-0",
 "Final Aug 27 Women's · Cal Poly vs San Diego | T, 1-1",
 "Final Aug 30 Women's · Cal Poly at Arizona State | L, 0-2",
 "Final Sep 3 Women's · Cal Poly at Cal | T, 0-0",
 "Final Sep 10 Women's · Cal Poly at Pacific | W, 4-1",
 "Final Sep 19 Women's · Cal Poly at Seattle | L, 0-2",
 "Final Sep 23 Women's · Cal Poly vs California Baptist | W, 2-1",
 "Final Sep 26 Women's · Cal Poly vs Long Beach State | T, 1-1",
 "Final Sep 30 Women's · Cal Poly at Cal State Fullerton | L, 0-1",
 "Final Oct 3 Women's · Cal Poly at UC San Diego | W, 1-0",
 "Final Oct 10 Women's · Cal Poly vs Utah Valley | L, 1-2",
 "Final Oct 14 Women's · Cal Poly at CSUN | T, 1-1",
 "Final Oct 17 Women's · Cal Poly at Cal State Bakersfield | T, 0-0",
 "Final Oct 21 Women's · Cal Poly vs UC Santa Barbara | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Women's · Cal Poly vs UC Irvine | ",
 "Upcoming Oct 28, 6:00 PM Women's · Cal Poly at UC Riverside | ",
 "Upcoming Oct 31, 1:00 PM Women's · Cal Poly vs Sacramento State | ",
 "Upcoming Nov 4 Women's · Cal Poly at Big West Women's Soccer Championship | ",
 "Upcoming Nov 7 Women's · Cal Poly at Big West Women's Soccer Championship | ",
 "Upcoming Nov 14 Women's · Cal Poly at Big West Women's Soccer Championship | ",
 "Upcoming Nov 20 Women's · Cal Poly at NCAA First Round | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Cal Poly at Denver (RV) | T, 2-2",
 "Final Aug 23 Men's · Cal Poly at UC Davis | T, 2-2",
 "Final Aug 27 Men's · Cal Poly vs San Jose State | W, 3-0",
 "Final Aug 30 Men's · Cal Poly vs San Diego State | T, 1-1",
 "Final Sep 4 Men's · Cal Poly at Indiana | L, 0-2",
 "Final Sep 7 Men's · Cal Poly at LMU | W, 1-0",
 "Final Sep 10 Men's · Cal Poly vs Utah Tech | W, 2-0",
 "Final Sep 16 Men's · Cal Poly vs Cal State Bakersfield | L, 2-3",
 "Final Sep 25 Men's · Cal Poly vs UC Santa Barbara (RV) | W, 2-1",
 "Final Sep 30 Men's · Cal Poly at UC San Diego | T, 1-1",
 "Final Oct 4 Men's · Cal Poly vs California Baptist | L, 1-3",
 "Final Oct 7 Men's · Cal Poly at San Diego State | T, 1-1",
 "Final Oct 10 Men's · Cal Poly at UC Santa Barbara | L, 1-3",
 "Final Oct 14 Men's · Cal Poly vs Utah Valley | W, 3-1",
 "Final Oct 17 Men's · Cal Poly vs Oregon State | W, 4-3",
 "Final Oct 21 Men's · Cal Poly at UC Irvine | L, 0-1",
 "Upcoming Oct 24, 6:00 PM Men's · Cal Poly at Gonzaga | ",
 "Upcoming Oct 31, 7:00 PM Men's · Cal Poly vs UC Riverside | ",
 "Upcoming Nov 7 Men's · Cal Poly at Pac-12 Tournament (Semifinals) | ",
 "Upcoming Nov 13 Men's · Cal Poly at Pac-12 Tournament (Championship) | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Cal Poly at Cal Poly Invitational | Completed",
 "Final Oct 1 Women's · Cal Poly at Big West Fall Selection | Completed",
 "Final Oct 15 Women's · Cal Poly at ITA Southwest Regionals | Completed",
 "Upcoming Oct 30 Women's · Cal Poly at Dennis Rizza Classic | ",
 "Upcoming Nov 5 Women's · Cal Poly at ITA Conference Masters Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Cal Poly at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Cal Poly at Sherwood Collegiate Cup | Completed",
 "Final Oct 9 Men's · Cal Poly at UCSB Classic | Completed",
 "Final Oct 15 Men's · Cal Poly at ITA Regionals | Completed",
 "Upcoming Oct 30 Men's · Cal Poly at Dennis Rizza Classic | ",
 "Upcoming Nov 5 Men's · Cal Poly at USTA SoCal Intercollegiates | ",
 "Upcoming Nov 5 Men's · Cal Poly at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · Cal Poly at ITA Conference Masters | ",
 "Upcoming Nov 6 Men's · Cal Poly at GCU Hidden Dual | ",
 "Upcoming Nov 17 Men's · Cal Poly at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Cal Poly vs Grand Canyon | W, 3-0",
 "Final Aug 29 Cal Poly at Texas A&M | L, 0-3",
 "Final Aug 30 Cal Poly vs Arkansas State | W, 3-0",
 "Final Sep 4 Cal Poly vs San Diego State | W, 3-1",
 "Final Sep 5 Cal Poly at UC Davis | L, 2-3",
 "Final Sep 10 Cal Poly at Indiana | L, 0-3",
 "Final Sep 11 Cal Poly vs Eastern Illinois | W, 3-0",
 "Final Sep 17 Cal Poly vs Santa Clara | L, 2-3",
 "Final Sep 18 Cal Poly vs Arizona State | L, 2-3",
 "Final Sep 20 Cal Poly vs Stanford | L, 1-3",
 "Final Sep 25 Cal Poly vs Cal State Bakersfield | W, 3-0",
 "Final Sep 26 Cal Poly vs CSUN | W, 3-1",
 "Final Oct 1 Cal Poly at Sacramento State | W, 3-0",
 "Final Oct 3 Cal Poly at Utah Valley | W, 3-0",
 "Final Oct 9 Cal Poly at Cal State Fullerton | W, 3-0",
 "Final Oct 10 Cal Poly at Long Beach State | W, 3-0",
 "Final Oct 16 Cal Poly vs California Baptist | W, 3-2",
 "Final Oct 17 Cal Poly vs UC Riverside | W, 3-1",
 "Today Oct 22, 7:30 PM Cal Poly at UC Santa Barbara | ",
 "Upcoming Oct 24, 7:00 PM Cal Poly vs UC Santa Barbara | ",
 "Upcoming Oct 30, 6:00 PM Cal Poly at UC Irvine | ",
 "Upcoming Oct 31, 5:00 PM Cal Poly at UC San Diego | ",
 "Upcoming Nov 6, 6:00 PM Cal Poly vs Long Beach State | ",
 "Upcoming Nov 7, 6:00 PM Cal Poly vs Cal State Fullerton | ",
 "Upcoming Nov 13, 5:00 PM Cal Poly vs Utah Valley | ",
 "Upcoming Nov 14, 4:00 PM Cal Poly vs Sacramento State | ",
 "Upcoming Nov 20, 6:00 PM Cal Poly at UC Riverside | ",
 "Upcoming Nov 21, 4:00 PM Cal Poly at California Baptist | ",
 "Upcoming Nov 25 Cal Poly at Big West Women's Volleyball Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Cal Poly at Navy Classic | ",
 "Upcoming Nov 13, 7:30 PM Cal Poly vs Michigan State | ",
 "Upcoming Nov 22 Cal Poly at Roadrunner Open | ",
 "Upcoming Dec 4 Cal Poly at Cliff Keen Invitational | ",
 "Upcoming Dec 18, 6:00 PM Cal Poly at Air Force | ",
 "Upcoming Dec 29 Cal Poly at Midlands Championships | ",
 "Upcoming Jan 10, 2:00 PM Cal Poly at Oregon State | ",
 "Upcoming Jan 17, 1:00 PM Cal Poly vs Little Rock | ",
 "Upcoming Jan 22, 7:00 PM Cal Poly vs South Dakota State | ",
 "Upcoming Jan 24, 1:00 PM Cal Poly vs North Dakota State | ",
 "Upcoming Feb 5, 7:00 PM Cal Poly vs Northern Colorado | ",
 "Upcoming Feb 21 Cal Poly at Northern Illinois | ",
 "Upcoming Feb 24, 6:30 PM Cal Poly at Cal State Bakersfield | ",
 "Upcoming Mar 4 Cal Poly at Pac-12 Championships | ",
 "Upcoming Mar 18 Cal Poly at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Records as gopoly.com publishes them: football plays in the Big Sky (4-4,
// Big Sky 3-2; the Big West sponsors no football). Mutation: without the
// module's league name football shows no conference record.
assert.deepEqual(worker.groupEvents(parse('Football','football'),now)[0].records.map(r=>`${r.text} ${r.conference?.name} ${r.conference?.text}`),['4-4 Big Sky 3-2']);

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Cal Poly module checks passed");
