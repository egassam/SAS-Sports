import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sacramentoStateSchool} from '../src/schools/sacramento-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='sacramento-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,sacramentoStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/sacramento-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hornetsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['sacramento-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',sacramentoStateSchool.scheduleUrls],['roster',sacramentoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('sacramento-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hornetsports.com',`${key} must stay on hornetsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://hornetsports.com/sports/baseball/schedule"],"roster":["https://hornetsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hornetsports.com/sports/mens-basketball/schedule","https://hornetsports.com/sports/womens-basketball/schedule"],"roster":["https://hornetsports.com/sports/mens-basketball/roster","https://hornetsports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://hornetsports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://hornetsports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://hornetsports.com/sports/cross-country/schedule"],"roster":["https://hornetsports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://hornetsports.com/sports/football/schedule"],"roster":["https://hornetsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hornetsports.com/sports/womens-golf/schedule","https://hornetsports.com/sports/mens-golf/schedule"],"roster":["https://hornetsports.com/sports/womens-golf/roster","https://hornetsports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://hornetsports.com/sports/womens-gymnastics/schedule"],"roster":["https://hornetsports.com/sports/womens-gymnastics/roster"],"combined":false},"Rowing":{"schedule":["https://hornetsports.com/sports/womens-rowing/schedule"],"roster":["https://hornetsports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://hornetsports.com/sports/womens-soccer/schedule","https://hornetsports.com/sports/mens-soccer/schedule"],"roster":["https://hornetsports.com/sports/womens-soccer/roster","https://hornetsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://hornetsports.com/sports/softball/schedule"],"roster":["https://hornetsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://hornetsports.com/sports/womens-tennis/schedule","https://hornetsports.com/sports/mens-tennis/schedule"],"roster":["https://hornetsports.com/sports/womens-tennis/roster","https://hornetsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://hornetsports.com/sports/track/schedule"],"roster":["https://hornetsports.com/sports/track/roster"],"combined":false},"Volleyball":{"schedule":["https://hornetsports.com/sports/womens-volleyball/schedule"],"roster":["https://hornetsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'sacramento-state|"+sport+"':"),`${sport} routes must live in the Sacramento State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://hornetsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sacramentoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=sacramento-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Sacramento State vs Jessup (Calif.) | ",
 "Upcoming Nov 7, 7:00 PM Men's · Sacramento State at Santa Clara | ",
 "Upcoming Nov 14, 5:00 PM Men's · Sacramento State vs UC Davis | ",
 "Upcoming Nov 19, 7:00 PM Men's · Sacramento State at Stanford | ",
 "Upcoming Nov 28, 11:00 AM Men's · Sacramento State at Presbyterian | ",
 "Upcoming Dec 3, 7:00 PM Men's · Sacramento State at Cal State Fullerton | ",
 "Upcoming Dec 5, 1:00 PM Men's · Sacramento State at Utah Valley | ",
 "Upcoming Dec 9, 7:00 PM Men's · Sacramento State vs Bethesda (CA) | ",
 "Upcoming Dec 13, 2:00 PM Men's · Sacramento State vs Pepperdine | ",
 "Upcoming Dec 19, 1:30 PM Men's · Sacramento State at Fresno State | ",
 "Upcoming Dec 22, 7:00 PM Men's · Sacramento State vs Pacific | ",
 "Upcoming Dec 31, 1:00 PM Men's · Sacramento State vs CSUN | ",
 "Upcoming Jan 2, 7:00 PM Men's · Sacramento State vs CSU Bakersfield | ",
 "Upcoming Jan 7, 7:00 PM Men's · Sacramento State at UC Irvine | ",
 "Upcoming Jan 9, 6:00 PM Men's · Sacramento State at UC San Diego | ",
 "Upcoming Jan 14, 7:00 PM Men's · Sacramento State vs Cal Poly | ",
 "Upcoming Jan 16, 7:00 PM Men's · Sacramento State vs UC Santa Barbara | ",
 "Upcoming Jan 21, 7:00 PM Men's · Sacramento State vs UC Riverside | ",
 "Upcoming Jan 23, 7:00 PM Men's · Sacramento State vs California Baptist | ",
 "Upcoming Jan 28, 8:00 PM Men's · Sacramento State at CSU Bakersfield | ",
 "Upcoming Jan 30, 5:00 PM Men's · Sacramento State at CSUN | ",
 "Upcoming Feb 4, 7:00 PM Men's · Sacramento State at California Baptist | ",
 "Upcoming Feb 6, 5:00 PM Men's · Sacramento State at UC Riverside | ",
 "Upcoming Feb 11, 7:00 PM Men's · Sacramento State vs UC San Diego | ",
 "Upcoming Feb 13, 7:00 PM Men's · Sacramento State vs UC Irvine | ",
 "Upcoming Feb 18, 7:00 PM Men's · Sacramento State at Long Beach State | ",
 "Upcoming Feb 20, 7:00 PM Men's · Sacramento State vs Utah Valley | ",
 "Upcoming Feb 25, 7:00 PM Men's · Sacramento State vs Cal State Fullerton | ",
 "Upcoming Feb 27, 7:00 PM Men's · Sacramento State vs Long Beach State | ",
 "Upcoming Mar 4, 6:00 PM Men's · Sacramento State at UC Santa Barbara | ",
 "Upcoming Mar 6, 4:00 PM Men's · Sacramento State at Cal Poly | ",
 "Upcoming Mar 10 Men's · Sacramento State at Big West Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Sacramento State vs Stanislaus State | ",
 "Upcoming Nov 3, 4:30 PM Women's · Sacramento State at UT Arlington | ",
 "Upcoming Nov 7, 6:00 PM Women's · Sacramento State at Nevada | ",
 "Upcoming Nov 9, 6:30 PM Women's · Sacramento State vs Cal State East Bay | ",
 "Upcoming Nov 12, 3:00 PM Women's · Sacramento State at Buffalo | ",
 "Upcoming Nov 14, 10:00 AM Women's · Sacramento State at Niagara | ",
 "Upcoming Nov 20, 11:00 AM Women's · Sacramento State vs Pacific | ",
 "Upcoming Nov 29, 1:00 PM Women's · Sacramento State at Arizona | ",
 "Upcoming Dec 3, 6:30 PM Women's · Sacramento State vs Cal State Fullerton | ",
 "Upcoming Dec 5 Women's · Sacramento State vs Utah Valley | ",
 "Upcoming Dec 8, 6:30 PM Women's · Sacramento State vs San Francisco | ",
 "Upcoming Dec 11, 5:30 PM Women's · Sacramento State at Boise State | ",
 "Upcoming Dec 20, 1:00 PM Women's · Sacramento State vs Simpson (CA) | ",
 "Upcoming Dec 31, 1:00 PM Women's · Sacramento State at CSUN | ",
 "Upcoming Jan 2, 2:00 PM Women's · Sacramento State at Cal State Bakersfield | ",
 "Upcoming Jan 7, 6:30 PM Women's · Sacramento State vs UC Irvine | ",
 "Upcoming Jan 9, 1:00 PM Women's · Sacramento State vs UC San Diego | ",
 "Upcoming Jan 14, 6:00 PM Women's · Sacramento State at Cal Poly | ",
 "Upcoming Jan 16, 2:00 PM Women's · Sacramento State at UC Santa Barbara | ",
 "Upcoming Jan 21, 6:00 PM Women's · Sacramento State at UC Riverside | ",
 "Upcoming Jan 23, 1:00 PM Women's · Sacramento State at California Baptist | ",
 "Upcoming Jan 28, 6:30 PM Women's · Sacramento State vs Cal State Bakersfield | ",
 "Upcoming Jan 30, 1:00 PM Women's · Sacramento State vs CSUN | ",
 "Upcoming Feb 4, 6:30 PM Women's · Sacramento State vs California Baptist | ",
 "Upcoming Feb 6, 1:00 PM Women's · Sacramento State vs UC Riverside | ",
 "Upcoming Feb 11, 6:00 PM Women's · Sacramento State at UC San Diego | ",
 "Upcoming Feb 13, 2:00 PM Women's · Sacramento State at UC Irvine | ",
 "Upcoming Feb 18, 6:30 PM Women's · Sacramento State vs Long Beach State | ",
 "Upcoming Feb 20, 1:00 PM Women's · Sacramento State at Utah Valley | ",
 "Upcoming Feb 25, 7:00 PM Women's · Sacramento State at Cal State Fullerton | ",
 "Upcoming Feb 27, 2:00 PM Women's · Sacramento State at Long Beach State | ",
 "Upcoming Mar 4, 6:30 PM Women's · Sacramento State vs UC Santa Barbara | ",
 "Upcoming Mar 6, 1:00 PM Women's · Sacramento State vs Cal Poly | ",
 "Upcoming Mar 10 Women's · Sacramento State at The Big West Championships | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Sacramento State at USF Invitational | Women's team: 8th / Men's team: 6th",
 "Final Sep 19 Sacramento State at UCR Invitational | Women's team: 8th / Men's team: 16th",
 "Final Oct 2 Sacramento State at Pacific Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 17 Sacramento State at Santa Clara Bronco Invite | Women's team: 6th / Men's team: 11th",
 "Upcoming Oct 31 Sacramento State at Big West Championships | ",
 "Upcoming Nov 13 Sacramento State at NCAA Div. I West Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Sacramento State at Eastern Michigan | L, 17-28",
 "Final Sep 5 Sacramento State vs Mississippi Valley State | W, 52-0",
 "Final Sep 12 Sacramento State at Fresno State | L, 3-49",
 "Final Sep 19 Sacramento State vs North Dakota State | L, 10-31",
 "Final Sep 26 Sacramento State vs Massachusetts | L, 6-35",
 "Final Oct 10 Sacramento State at Bowling Green | L, 10-38",
 "Final Oct 17 Sacramento State vs Ohio | L, 7-48",
 "Upcoming Oct 24, 12:30 PM Sacramento State at Ball State | ",
 "Upcoming Oct 30, 7:30 PM Sacramento State vs Kent State | ",
 "Upcoming Nov 4 Sacramento State vs Toledo | ",
 "Upcoming Nov 11 Sacramento State at Central Michigan | ",
 "Upcoming Nov 28, 8:00 PM Sacramento State at Hawaii | ",
 "Upcoming Dec 5, 9:00 AM Sacramento State at MAC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Sacramento State at Dick McGuire Invitational | 6th of 13",
 "Final Sep 21 Women's · Sacramento State at Kalispel Invitational | 4th of 14",
 "Final Oct 9 Women's · Sacramento State at Evie Odom Invitational | 10th of 14",
 "Final Oct 19 Women's · Sacramento State at Rainbow Wahine Invitational | 8th of 14",
 "Upcoming Jan 29 Women's · Sacramento State at Collegiate Invitational at GCC | ",
 "Upcoming Feb 15 Women's · Sacramento State at San Diego State Classic | ",
 "Upcoming Feb 22 Women's · Sacramento State at Causeway Invitational | ",
 "Upcoming Mar 9 Women's · Sacramento State at Juli Inkster Invitational | ",
 "Upcoming Mar 22 Women's · Sacramento State at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 6 Women's · Sacramento State at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 18 Women's · Sacramento State at Big West Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Sacramento State at CDA National Reserve Invitational | 5th of 16",
 "Final Oct 5 Men's · Sacramento State at Oregon State Invitational | T8th of 12",
 "Final Oct 12 Men's · Sacramento State at Visit Stockton Invitational | 15th of 18",
 "Upcoming Oct 26 Men's · Sacramento State at Ka'anapali Classic | ",
 "Upcoming Feb 22 Men's · Sacramento State at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · Sacramento State at Nick Watney Invitational | ",
 "Upcoming Mar 22 Men's · Sacramento State at The Duck Invitational | ",
 "Upcoming Mar 29 Men's · Sacramento State at Wyoming Cowboy Classic | ",
 "Upcoming Apr 9 Men's · Sacramento State at El Macero Classic | ",
 "Upcoming May 2 Men's · Sacramento State at Big West Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Dec 6, 2:00 PM Sacramento State at Flip Fest | ",
 "Upcoming Jan 10, 2:00 PM Sacramento State at Alaska Anchorage | ",
 "Upcoming Jan 10, 2:00 PM Sacramento State at UC Davis | ",
 "Upcoming Jan 10, 2:00 PM Sacramento State at Wisconsin-Stout | ",
 "Upcoming Jan 15, 6:00 PM Sacramento State at Boise State | ",
 "Upcoming Jan 15, 6:00 PM Sacramento State at BYU | ",
 "Upcoming Jan 22 Sacramento State at Alabama | ",
 "Upcoming Jan 31, 2:00 PM Sacramento State at San Jose State | ",
 "Upcoming Jan 31, 2:00 PM Sacramento State at Arizona State | ",
 "Upcoming Feb 7, 2:00 PM Sacramento State at UC Davis | ",
 "Upcoming Feb 12, 7:00 PM Sacramento State at San Jose State | ",
 "Upcoming Feb 12, 7:00 PM Sacramento State at UC Davis | ",
 "Upcoming Feb 19, 5:30 PM Sacramento State at Arizona | ",
 "Upcoming Feb 19, 5:30 PM Sacramento State at Eastern Michigan | ",
 "Upcoming Feb 28, 2:00 PM Sacramento State at UC Davis | ",
 "Upcoming Mar 5, 6:30 PM Sacramento State at Southeast Missouri State | ",
 "Upcoming Mar 5, 6:30 PM Sacramento State at Bridgeport | ",
 "Upcoming Mar 12, 7:00 PM Sacramento State at San Jose State | ",
 "Upcoming Mar 14, 2:00 PM Sacramento State at Stanford | ",
 "Upcoming Mar 14, 2:00 PM Sacramento State at Arizona State | ",
 "Upcoming Mar 14, 2:00 PM Sacramento State at Washington | ",
 "Upcoming Mar 20, 3:00 PM Sacramento State at Alaska Anchorage | ",
 "Upcoming Mar 31 Sacramento State at NCAA Regional | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Sacramento State at Head of the American | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Sacramento State vs Pacific | W, 5-2",
 "Final Aug 16 Women's · Sacramento State at UC Davis | W, 1-0",
 "Final Aug 20 Women's · Sacramento State at San Francisco | T, 1-1",
 "Final Aug 23 Women's · Sacramento State at Nevada | W, 2-1",
 "Final Aug 27 Women's · Sacramento State vs Southern Utah | W, 2-1",
 "Final Sep 3 Women's · Sacramento State at Fresno State | T, 1-1",
 "Final Sep 10 Women's · Sacramento State vs Saint Mary's | L, 2-3",
 "Final Sep 17 Women's · Sacramento State at San Jose State | L, 0-2",
 "Final Sep 23 Women's · Sacramento State vs UC Irvine | T, 1-1",
 "Final Sep 26 Women's · Sacramento State at UC Santa Barbara | L, 0-1",
 "Final Sep 30 Women's · Sacramento State vs UC Riverside | T, 1-1",
 "Final Oct 3 Women's · Sacramento State at Long Beach State | T, 2-2",
 "Final Oct 10 Women's · Sacramento State vs Cal State Bakersfield | W, 2-0",
 "Final Oct 14 Women's · Sacramento State at UC San Diego | L, 0-3",
 "Final Oct 17 Women's · Sacramento State vs Cal State Fullerton | L, 0-1",
 "Final Oct 21 Women's · Sacramento State at Utah Valley | L, 1-6",
 "Upcoming Oct 24, 3:00 PM Women's · Sacramento State vs CSUN | ",
 "Upcoming Oct 28, 3:00 PM Women's · Sacramento State vs California Baptist | ",
 "Upcoming Oct 31, 1:00 PM Women's · Sacramento State at Cal Poly | ",
 "Upcoming Nov 4 Women's · Sacramento State at Big West Tournament Quarterfinals | ",
 "Upcoming Nov 7 Women's · Sacramento State at Big West Tournament Semifinals | ",
 "Upcoming Nov 13 Women's · Sacramento State at Big West Tournament Championship | ",
 "Upcoming Nov 20 Women's · Sacramento State at NCAA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Sacramento State vs UC Davis | W, 3-1",
 "Final Aug 23 Men's · Sacramento State vs Grand Canyon | L, 0-1",
 "Final Aug 27 Men's · Sacramento State at Saint Mary's | L, 1-2",
 "Final Aug 31 Men's · Sacramento State at Utah Tech | L, 0-1",
 "Final Sep 6 Men's · Sacramento State at San Jose State | L, 1-2",
 "Final Sep 11 Men's · Sacramento State at San Diego State | L, 0-2",
 "Final Sep 17 Men's · Sacramento State vs Pacific | W, 4-2",
 "Final Sep 23 Men's · Sacramento State vs UC Riverside | W, 3-1",
 "Final Sep 30 Men's · Sacramento State at UC Santa Barbara | T, 1-1",
 "Final Oct 3 Men's · Sacramento State vs Cal State Bakersfield | T, 2-2",
 "Final Oct 7 Men's · Sacramento State vs Gonzaga | L, 1-3",
 "Final Oct 10 Men's · Sacramento State at Utah Valley | L, 0-3",
 "Final Oct 14 Men's · Sacramento State vs UC San Diego | W, 3-2",
 "Final Oct 17 Men's · Sacramento State vs UC Irvine | L, 0-3",
 "Final Oct 21 Men's · Sacramento State at Oregon State | L, 1-8",
 "Upcoming Oct 24, 7:00 PM Men's · Sacramento State at CSUN | ",
 "Upcoming Oct 31, 3:00 PM Men's · Sacramento State vs Cal State Fullerton | ",
 "Upcoming Nov 7 Men's · Sacramento State at Big West Championship Semifinals | ",
 "Upcoming Nov 14 Men's · Sacramento State at Big West Championship Finals | ",
 "Upcoming Nov 19 Men's · Sacramento State at NCAA Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 12:00 PM Sacramento State vs Dominican (Calif.) | ",
 "Upcoming Oct 24, 2:00 PM Sacramento State at Saint Mary's | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Sacramento State at ITA All-America Championships | Completed",
 "Final Sep 25 Women's · Sacramento State at Pacific Hidden Duals | Completed",
 "Final Oct 1 Women's · Sacramento State at Big West Fall Selection Tournament | Completed",
 "Final Oct 8 Women's · Sacramento State at ITA Northwest Regionals | Completed",
 "Upcoming Oct 23 Women's · Sacramento State at Santa Clara Hidden Duals | ",
 "Upcoming Nov 5 Women's · Sacramento State at ITA Sectional Championships | ",
 "Upcoming Nov 6 Women's · Sacramento State at CSUN Hidden Duals | ",
 "Upcoming Jan 17 Women's · Sacramento State vs Iowa State | ",
 "Upcoming Jan 23, 1:00 PM Women's · Sacramento State at Fresno State | ",
 "Upcoming Feb 6, 11:00 AM Women's · Sacramento State vs UC Davis | ",
 "Upcoming Feb 7 Women's · Sacramento State at Saint Mary's | ",
 "Upcoming Feb 12 Women's · Sacramento State at Seattle U | ",
 "Upcoming Feb 14, 10:00 AM Women's · Sacramento State at Portland | ",
 "Upcoming Feb 19, 5:00 PM Women's · Sacramento State at Kansas | ",
 "Upcoming Feb 20, 1:00 PM Women's · Sacramento State vs Wichita State | ",
 "Upcoming Feb 28, 11:00 AM Women's · Sacramento State vs Cal Poly | ",
 "Upcoming Mar 4, 1:00 PM Women's · Sacramento State vs Pacific | ",
 "Upcoming Mar 12 Women's · Sacramento State vs Long Beach State | ",
 "Upcoming Mar 19, 11:00 AM Women's · Sacramento State at Cal State Fullerton | ",
 "Upcoming Mar 21, 11:00 AM Women's · Sacramento State at CSUN | ",
 "Upcoming Mar 23, 10:00 AM Women's · Sacramento State vs Arkansas State | ",
 "Upcoming Mar 31, 1:00 PM Women's · Sacramento State vs Miami | ",
 "Upcoming Apr 2 Women's · Sacramento State at UC Irvine | ",
 "Upcoming Apr 4 Women's · Sacramento State at UC San Diego | ",
 "Upcoming Apr 9, 3:00 PM Women's · Sacramento State vs Stanislaus State | ",
 "Upcoming Apr 15, 1:00 PM Women's · Sacramento State vs UC Riverside | ",
 "Upcoming Apr 17 Women's · Sacramento State vs UC Santa Barbara | ",
 "Upcoming Apr 28 Women's · Sacramento State at The Big West Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Sacramento State at Aggie Invitational | Completed",
 "Final Oct 2 Men's · Sacramento State at NorCal Invitational Shootout | Completed",
 "Final Oct 15 Men's · Sacramento State at ITA Northwest Regionals | Completed",
 "Upcoming Oct 30 Men's · Sacramento State at Pacific Invitational | ",
 "Upcoming Jan 20, 10:00 AM Men's · Sacramento State at UC Riverside | ",
 "Upcoming Jan 21, 11:00 AM Men's · Sacramento State at Biola (Calif.) | ",
 "Upcoming Jan 23, 11:00 AM Men's · Sacramento State at Loyola Marymount | ",
 "Upcoming Jan 30, 2:30 PM Men's · Sacramento State at Santa Clara | ",
 "Upcoming Feb 6, 1:00 PM Men's · Sacramento State vs Pacific | ",
 "Upcoming Feb 14, 1:00 PM Men's · Sacramento State vs Saint Mary's | ",
 "Upcoming Feb 20, 1:00 PM Men's · Sacramento State vs UC Davis | ",
 "Upcoming Feb 27, 10:00 AM Men's · Sacramento State vs American River College | ",
 "Upcoming Mar 5, 10:00 AM Men's · Sacramento State vs New Mexico State | ",
 "Upcoming Mar 6, 1:00 PM Men's · Sacramento State vs Montana | ",
 "Upcoming Mar 13, 1:00 PM Men's · Sacramento State vs Idaho | ",
 "Upcoming Mar 14, 11:00 AM Men's · Sacramento State vs Creighton | ",
 "Upcoming Mar 21, 1:00 PM Men's · Sacramento State vs Cal Poly | ",
 "Upcoming Mar 26 Men's · Sacramento State at Portland State | ",
 "Upcoming Mar 27 Men's · Sacramento State at UC San Diego | ",
 "Upcoming Apr 4, 1:00 PM Men's · Sacramento State at Nevada | ",
 "Upcoming Apr 9, 11:00 AM Men's · Sacramento State at UC Irvine | ",
 "Upcoming Apr 11, 11:00 AM Men's · Sacramento State at UC Riverside | ",
 "Upcoming Apr 18, 11:00 AM Men's · Sacramento State vs UC Santa Barbara | ",
 "Upcoming Apr 27 Men's · Sacramento State at Big West Championship | "
]);
  const v_track=parse("Track & Field","track");
  assert.deepEqual(v_track.map(line),[
 "Upcoming Dec 4 Sacramento State at Silver State Invitational & Combined | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Sacramento State vs South Dakota State | L, 2-3",
 "Final Aug 29 Sacramento State vs Villanova | L, 1-3",
 "Final Aug 30 Sacramento State at Pepperdine | L, 2-3",
 "Final Sep 3 Sacramento State vs Nevada | W, 3-2",
 "Final Sep 4 Sacramento State vs Texas Tech | W, 3-0",
 "Final Sep 5 Sacramento State vs Saint Mary's | W, 3-2",
 "Final Sep 10 Sacramento State at Boise State | L, 0-3",
 "Final Sep 11 Sacramento State vs Eastern Washington | L, 2-3",
 "Final Sep 12 Sacramento State vs Saint Mary's | W, 3-1",
 "Final Sep 18 Sacramento State at San Jose State | W, 3-1",
 "Final Sep 19 Sacramento State vs California | L, 2-3",
 "Final Sep 24 Sacramento State vs California Baptist | W, 3-0",
 "Final Sep 26 Sacramento State vs UC Riverside | W, 3-0",
 "Final Oct 1 Sacramento State vs Cal Poly | L, 0-3",
 "Final Oct 3 Sacramento State vs UC Santa Barbara | L, 1-3",
 "Final Oct 9 Sacramento State at UC San Diego | W, 3-1",
 "Final Oct 10 Sacramento State at UC Irvine | W, 3-1",
 "Final Oct 15 Sacramento State vs Cal State Fullerton | W, 3-1",
 "Final Oct 17 Sacramento State vs Long Beach State | L, 0-3",
 "Today Oct 22, 7:00 PM Sacramento State vs Utah Valley | ",
 "Upcoming Oct 24, 12:00 PM Sacramento State at Utah Valley | ",
 "Upcoming Oct 30, 6:00 PM Sacramento State at UC Riverside | ",
 "Upcoming Oct 31, 6:00 PM Sacramento State at California Baptist | ",
 "Upcoming Nov 5, 7:00 PM Sacramento State vs UC Irvine | ",
 "Upcoming Nov 7, 1:00 PM Sacramento State vs UC San Diego | ",
 "Upcoming Nov 13, 7:00 PM Sacramento State at UC Santa Barbara | ",
 "Upcoming Nov 14, 4:00 PM Sacramento State at Cal Poly | ",
 "Upcoming Nov 20, 6:00 PM Sacramento State at CSU Bakersfield | ",
 "Upcoming Nov 21, 4:00 PM Sacramento State at CSUN | ",
 "Upcoming Nov 25 Sacramento State at Big West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_track,"Track & Field track");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Football plays in the MAC from 2026 (1-6, MAC 0-4 as hornetsports.com
// publishes). Mutation: without the league name it shows no conference record.
assert.deepEqual(worker.groupEvents(parse('Football','football'),now)[0].records.map(r=>`${r.text} ${r.conference?.name} ${r.conference?.text}`),['1-6 MAC 0-4']);

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Sacramento State module checks passed");
