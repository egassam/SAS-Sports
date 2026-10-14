import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {washingtonSchool,WASHINGTON_TFRRS_TEAMS} from '../src/schools/washington.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='washington');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,washingtonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/washington-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gohuskies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['washington'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',washingtonSchool.scheduleUrls],['roster',washingtonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('washington|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gohuskies.com',`${key} must stay on gohuskies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gohuskies.com/sports/baseball/schedule"],"roster":["https://gohuskies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gohuskies.com/sports/mens-basketball/schedule","https://gohuskies.com/sports/womens-basketball/schedule"],"roster":["https://gohuskies.com/sports/mens-basketball/roster","https://gohuskies.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gohuskies.com/sports/beach-volleyball/schedule"],"roster":["https://gohuskies.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gohuskies.com/sports/cross-country/schedule"],"roster":["https://gohuskies.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gohuskies.com/sports/football/schedule"],"roster":["https://gohuskies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gohuskies.com/sports/womens-golf/schedule","https://gohuskies.com/sports/mens-golf/schedule"],"roster":["https://gohuskies.com/sports/womens-golf/roster","https://gohuskies.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://gohuskies.com/sports/womens-gymnastics/schedule"],"roster":["https://gohuskies.com/sports/womens-gymnastics/roster"],"combined":false},"Rowing":{"schedule":["https://gohuskies.com/sports/womens-rowing/schedule"],"roster":["https://gohuskies.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gohuskies.com/sports/womens-soccer/schedule","https://gohuskies.com/sports/mens-soccer/schedule"],"roster":["https://gohuskies.com/sports/womens-soccer/roster","https://gohuskies.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gohuskies.com/sports/softball/schedule"],"roster":["https://gohuskies.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gohuskies.com/sports/womens-tennis/schedule","https://gohuskies.com/sports/mens-tennis/schedule"],"roster":["https://gohuskies.com/sports/womens-tennis/roster","https://gohuskies.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gohuskies.com/sports/track-and-field/schedule"],"roster":["https://gohuskies.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gohuskies.com/sports/womens-volleyball/schedule"],"roster":["https://gohuskies.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'washington|"+sport+"':"),`${sport} routes must live in the Washington module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://gohuskies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.washingtonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=washington)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 17, 6:00 PM Men's · Washington at Boise State (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Men's · Washington vs Washington State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Washington vs Colgate | ",
 "Upcoming Nov 9, 7:00 PM Men's · Washington vs Mississippi Valley State | ",
 "Upcoming Nov 14, 4:00 PM Men's · Washington at Utah | ",
 "Upcoming Nov 19, 6:00 PM Men's · Washington vs Utah Tech | ",
 "Upcoming Nov 23, 2:00 PM Men's · Washington vs BYU | ",
 "Upcoming Nov 24 Men's · Washington at Southwest Maui Invitational | ",
 "Upcoming Nov 29, 4:30 PM Men's · Washington vs Norfolk State | ",
 "Upcoming Dec 2, 7:30 PM Men's · Washington at USC | ",
 "Upcoming Dec 8, 7:00 PM Men's · Washington vs Southern Utah | ",
 "Upcoming Dec 13, 5:00 PM Men's · Washington vs UCLA | ",
 "Upcoming Dec 19, 7:00 PM Men's · Washington vs Baylor | ",
 "Upcoming Dec 28, 7:00 PM Men's · Washington vs Cornell | ",
 "Upcoming Jan 2, 11:00 AM Men's · Washington at Michigan | ",
 "Upcoming Jan 5, 3:30 PM Men's · Washington at Michigan State | ",
 "Upcoming Jan 9, 12:00 PM Men's · Washington vs Indiana | ",
 "Upcoming Jan 13, 8:00 PM Men's · Washington vs Nebraska | ",
 "Upcoming Jan 16, 12:00 PM Men's · Washington at UCLA | ",
 "Upcoming Jan 20, 7:30 PM Men's · Washington vs Northwestern | ",
 "Upcoming Jan 23, 11:00 AM Men's · Washington at Wisconsin | ",
 "Upcoming Jan 26, 6:00 PM Men's · Washington at Minnesota | ",
 "Upcoming Jan 30, 1:00 PM Men's · Washington vs Rutgers | ",
 "Upcoming Feb 7, 1:30 PM Men's · Washington at Oregon | ",
 "Upcoming Feb 10, 7:30 PM Men's · Washington vs USC | ",
 "Upcoming Feb 14, 10:00 AM Men's · Washington at Ohio State | ",
 "Upcoming Feb 17, 4:00 PM Men's · Washington at Penn State | ",
 "Upcoming Feb 20, 2:00 PM Men's · Washington vs Maryland | ",
 "Upcoming Feb 23, 7:00 PM Men's · Washington vs Illinois | ",
 "Upcoming Feb 27, 5:30 PM Men's · Washington vs Purdue | ",
 "Upcoming Mar 2, 4:00 PM Men's · Washington at Iowa | ",
 "Upcoming Mar 6, 7:00 PM Men's · Washington vs Oregon | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Washington vs UC San Diego | ",
 "Upcoming Nov 5 Women's · Washington vs Pacific | ",
 "Upcoming Nov 12 Women's · Washington vs Cal State Bakersfield | ",
 "Upcoming Nov 17 Women's · Washington at Washington State | ",
 "Upcoming Nov 20 Women's · Washington vs Stanford | ",
 "Upcoming Nov 22 Women's · Washington vs Cal Poly | ",
 "Upcoming Nov 27, 10:30 AM Women's · Washington vs Oklahoma State | ",
 "Upcoming Nov 28, 10:30 AM Women's · Washington vs UMass | ",
 "Upcoming Dec 5 Women's · Washington vs USC | ",
 "Upcoming Dec 10 Women's · Washington vs Southern | ",
 "Upcoming Dec 12 Women's · Washington vs Northern Colorado | ",
 "Upcoming Dec 17 Women's · Washington vs Santa Clara | ",
 "Upcoming Dec 20 Women's · Washington vs Portland State | ",
 "Upcoming Dec 29 Women's · Washington at Nebraska | ",
 "Upcoming Jan 2 Women's · Washington vs Wisconsin | ",
 "Upcoming Jan 7 Women's · Washington at Illinois | ",
 "Upcoming Jan 10 Women's · Washington at Northwestern | ",
 "Upcoming Jan 14 Women's · Washington vs Maryland | ",
 "Upcoming Jan 17 Women's · Washington vs Purdue | ",
 "Upcoming Jan 20 Women's · Washington at Michigan State | ",
 "Upcoming Jan 23 Women's · Washington at Michigan | ",
 "Upcoming Jan 27 Women's · Washington vs Iowa | ",
 "Upcoming Feb 4 Women's · Washington at Oregon | ",
 "Upcoming Feb 7 Women's · Washington vs Indiana | ",
 "Upcoming Feb 10 Women's · Washington at Ohio State | ",
 "Upcoming Feb 13 Women's · Washington at Penn State | ",
 "Upcoming Feb 17 Women's · Washington vs Rutgers | ",
 "Upcoming Feb 20 Women's · Washington at Minnesota | ",
 "Upcoming Feb 25 Women's · Washington vs Oregon | ",
 "Upcoming Feb 28 Women's · Washington vs UCLA | ",
 "Upcoming Mar 3 Women's · Washington vs Big Ten Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 19 Washington at John McNichols Invitational | Women's team: 6th / Men's team: 3rd",
 "Final Sep 25 Washington at Loyola Lakefront Invitational | Men's team: 11th",
 "Final Oct 9 Washington at Nuttycombe Wisconsin Invitational | Women's team: 16th / Men's team: 24th",
 "Upcoming Oct 30, 8:45 AM Washington at Big Ten Championships | ",
 "Upcoming Nov 13 Washington at NCAA West Regionals | ",
 "Upcoming Nov 21 Washington at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 6 Washington vs Washington State | W, 24-10",
 "Final Sep 12 Washington vs Utah State | W, 16-14",
 "Final Sep 19 Washington vs Eastern Washington | W, 48-16",
 "Final Sep 26 Washington vs Minnesota | L, 24-27",
 "Final Oct 3 Washington at USC | L, 21-25",
 "Final Oct 9 Washington vs Iowa | L, 24-41",
 "Upcoming Oct 16, 5:00 PM Washington at Purdue | ",
 "Upcoming Oct 31 Washington at Nebraska | ",
 "Upcoming Nov 7 Washington vs Penn State | ",
 "Upcoming Nov 14 Washington at Michigan State | ",
 "Upcoming Nov 21 Washington vs Indiana | ",
 "Upcoming Nov 28 Washington at Oregon | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Washington at Leadership & Golf Invitational | T8th",
 "Final Sep 21 Women's · Washington at Ben Connell Ram Classic | 2nd",
 "Today Oct 12 Women's · Washington at St Andrews Links Collegiate | ",
 "Upcoming Oct 26 Women's · Washington at Nanea Invitational | ",
 "Upcoming Jan 29 Women's · Washington at Collegiate Invitational at GCC | ",
 "Upcoming Feb 13 Women's · Washington at Alice & John Wallace Women's Golf Classic | ",
 "Upcoming Mar 9 Women's · Washington at Juli Inkster Invitational at TPC Harding Park | ",
 "Upcoming Mar 22 Women's · Washington at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 5 Women's · Washington at Chevron Silverado Showdown | ",
 "Upcoming Apr 23 Women's · Washington at Big Ten Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Washington at Sahalee Players Championship | 3rd",
 "Final Sep 28 Men's · Washington at Windon Memorial Classic | 2nd",
 "Today Oct 12 Men's · Washington at St Andrews Links Collegiate | ",
 "Upcoming Oct 19 Men's · Washington at Saint Mary's Invitational | ",
 "Upcoming Jan 25 Men's · Washington at Southwestern Invitational | ",
 "Upcoming Feb 4 Men's · Washington at Amer Ari Invitational | ",
 "Upcoming Mar 8 Men's · Washington at The Desimone Invitational | ",
 "Upcoming Mar 22 Men's · Washington at The Duck Invitational | ",
 "Upcoming Mar 25 Men's · Washington at The Goodwin | ",
 "Upcoming Apr 12 Men's · Washington at Western Intercollegiate | ",
 "Upcoming Apr 16 Men's · Washington at The Thunderbird Collegiate | ",
 "Upcoming Apr 30 Men's · Washington at Big Ten Championships | ",
 "Upcoming May 17 Men's · Washington at NCAA Men's Golf Regional | ",
 "Upcoming May 28 Men's · Washington at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Washington vs Portland | W, 1-0",
 "Final Aug 19 Women's · Washington at San Diego State | W, 1-0",
 "Final Aug 23 Women's · Washington vs Montana | W, 4-0",
 "Final Aug 27 Women's · Washington vs Gonzaga | T, 1-1",
 "Final Aug 30 Women's · Washington at Oregon State | W, 2-1",
 "Final Sep 4 Women's · Washington vs Seattle U | W, 1-0",
 "Final Sep 10 Women's · Washington vs Maryland | W, 2-0",
 "Final Sep 13 Women's · Washington vs Rutgers | W, 1-0",
 "Final Sep 20 Women's · Washington at Nebraska | T, 2-2",
 "Final Sep 24 Women's · Washington at Michigan | W, 1-0",
 "Final Sep 27 Women's · Washington at Michigan State | L, 0-3",
 "Final Oct 3 Women's · Washington vs USC | W, 1-0",
 "Final Oct 8 Women's · Washington vs Iowa | W, 2-1",
 "Final Oct 11 Women's · Washington vs Penn State | W, 1-0",
 "Upcoming Oct 16, 8:00 PM Women's · Washington at UCLA | ",
 "Upcoming Oct 22, 5:00 PM Women's · Washington at Minnesota | ",
 "Upcoming Oct 25, 11:00 AM Women's · Washington at Wisconsin | ",
 "Upcoming Oct 30, 8:00 PM Women's · Washington vs Oregon | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Washington vs San Diego | L, 1-2",
 "Final Aug 23 Men's · Washington at Gonzaga | W, 4-0",
 "Final Aug 27 Men's · Washington vs Portland | W, 4-2",
 "Final Aug 30 Men's · Washington at Oregon State | L, 3-4",
 "Final Sep 3 Men's · Washington vs Cal State Fullerton | T, 2-2",
 "Final Sep 5 Men's · Washington vs UC Davis | W, 4-0",
 "Final Sep 11 Men's · Washington vs Penn State | W, 4-2",
 "Final Sep 18 Men's · Washington at Indiana | L, 0-1",
 "Final Sep 21 Men's · Washington at Ohio State | W, 4-0",
 "Final Sep 25 Men's · Washington vs Rutgers | W, 4-1",
 "Final Oct 2 Men's · Washington vs Wisconsin | T, 0-0",
 "Final Oct 10 Men's · Washington vs Northwestern | W, 2-1",
 "Today Oct 14, 7:00 PM Men's · Washington vs Seattle U | ",
 "Upcoming Oct 23, 4:00 PM Men's · Washington at Michigan State | ",
 "Upcoming Oct 26, 4:00 PM Men's · Washington at Michigan | ",
 "Upcoming Oct 30, 5:00 PM Men's · Washington vs Maryland | ",
 "Upcoming Nov 4 Men's · Washington at UCLA | ",
 "Upcoming Nov 8 Men's · Washington at Big Ten Tournament | ",
 "Upcoming Nov 19 Men's · Washington at NCAA Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Oct 3 Washington vs Warner Pacific (Exhibition) | W, 19-0",
 "Final Oct 3 Washington vs Western Washington (Exhibition) | W, 4-1",
 "Final Oct 4 Washington vs Saint Martin's (Exhibition) | W, 8-0",
 "Final Oct 4 Washington vs British Columbia (Exhibition) | W, 13-1",
 "Final Oct 7 Washington vs Edmonds (Exhibition) | W, 12-0",
 "Upcoming Oct 17, 12:00 PM Washington vs Boise State (Exhibition) | ",
 "Upcoming Oct 17, 2:00 PM Washington vs Mount Hood (Exhibition) | ",
 "Upcoming Oct 18, 12:00 PM Washington vs Mount Hood (Exhibition) | ",
 "Upcoming Mar 19 Washington at Rutgers | ",
 "Upcoming Mar 20 Washington at Rutgers | ",
 "Upcoming Mar 21 Washington at Rutgers | ",
 "Upcoming Mar 26 Washington at Wisconsin | ",
 "Upcoming Mar 27 Washington at Wisconsin | ",
 "Upcoming Mar 28 Washington at Wisconsin | ",
 "Upcoming Apr 2 Washington vs Purdue | ",
 "Upcoming Apr 3 Washington vs Purdue | ",
 "Upcoming Apr 4 Washington vs Purdue | ",
 "Upcoming Apr 9 Washington vs Illinois | ",
 "Upcoming Apr 10 Washington vs Illinois | ",
 "Upcoming Apr 11 Washington vs Illinois | ",
 "Upcoming Apr 16 Washington at UCLA | ",
 "Upcoming Apr 17 Washington at UCLA | ",
 "Upcoming Apr 18 Washington at UCLA | ",
 "Upcoming Apr 23 Washington vs Michigan | ",
 "Upcoming Apr 24 Washington vs Michigan | ",
 "Upcoming Apr 25 Washington vs Michigan | ",
 "Upcoming Apr 30 Washington at Indiana | ",
 "Upcoming May 1 Washington at Indiana | ",
 "Upcoming May 2 Washington at Indiana | ",
 "Upcoming May 7 Washington vs Oregon | ",
 "Upcoming May 8 Washington vs Oregon | ",
 "Upcoming May 9 Washington vs Oregon | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Washington at Barb Chandler Classic | Completed",
 "Final Sep 19 Women's · Washington at ITA All-American Championships | Completed",
 "Final Oct 8 Women's · Washington at ITA Regional Championships | Completed",
 "Upcoming Nov 5 Women's · Washington at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Washington at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Washington at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Washington at San Diego Veterans Tennis Classic | Completed",
 "Upcoming Oct 15 Men's · Washington at ITA Northwest Regionals | ",
 "Upcoming Nov 5 Men's · Washington at Gonzaga Fall Invite | ",
 "Upcoming Nov 5 Men's · Washington at SoCal Intercollegiates | ",
 "Upcoming Nov 5 Men's · Washington at ITA West Sectionals | ",
 "Upcoming Nov 5 Men's · Washington at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Washington at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Jan 15 Washington at UW Preview | ",
 "Upcoming Jan 29 Washington at UW Invitational/Mile City | ",
 "Upcoming Feb 12 Washington at Husky Classic | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Washington vs Oregon State (Exhibition) | W, 3-1",
 "Final Aug 21 Washington vs Montana State (Exhibition) | W, 4-0",
 "Final Aug 28 Washington vs UC Irvine | W, 3-1",
 "Final Aug 29 Washington vs San Diego State | W, 3-0",
 "Final Aug 30 Washington vs IU Indianapolis | W, 3-2",
 "Final Sep 3 Washington vs Ole Miss | W, 3-2",
 "Final Sep 4 Washington at Oklahoma | W, 3-1",
 "Final Sep 10 Washington vs Lipscomb | W, 3-0",
 "Final Sep 13 Washington vs Washington State | W, 3-1",
 "Final Sep 18 Washington vs South Dakota State | W, 3-0",
 "Final Sep 19 Washington vs South Dakota | W, 3-0",
 "Final Sep 25 Washington at Michigan State | W, 3-1",
 "Final Sep 27 Washington at Michigan | W, 3-0",
 "Final Oct 2 Washington vs Illinois | L, 0-3",
 "Final Oct 4 Washington vs Purdue | W, 3-0",
 "Final Oct 9 Washington at Ohio State | W, 3-0",
 "Final Oct 11 Washington at Penn State | L, 0-3",
 "Upcoming Oct 16, 7:00 PM Washington vs Rutgers | ",
 "Upcoming Oct 18, 2:00 PM Washington vs Indiana | ",
 "Upcoming Oct 23, 6:00 PM Washington at Wisconsin | ",
 "Upcoming Oct 25, 11:00 AM Washington at Minnesota | ",
 "Upcoming Oct 30, 7:00 PM Washington vs Iowa | ",
 "Upcoming Nov 1, 12:00 PM Washington vs Maryland | ",
 "Upcoming Nov 6, 7:00 PM Washington vs Northwestern | ",
 "Upcoming Nov 8 Washington vs Nebraska | ",
 "Upcoming Nov 12, 11:00 AM Washington at UCLA | ",
 "Upcoming Nov 14, 7:00 PM Washington at USC | ",
 "Upcoming Nov 17, 6:00 PM Washington at Oregon | ",
 "Upcoming Nov 20 Washington at Big Ten Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
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
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: one card per meet; TFRRS gives each team's place.
{
  fromTfrrs(WASHINGTON_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["John McNichols Invitational","Women's team: 6th · 176 pts / Men's team: 3rd · 190 pts",true],["Loyola Lakefront Invitational","Men's team: 11th · 257 pts",true],["Nuttycombe Wisconsin Invitational","Women's team: 16th · 431 pts / Men's team: 24th · 569 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Golf: the card's place and total ("T-8th (+24, 888)"; men's "3rd, 890
// (+26)").
assert.deepEqual(['Golf|womens-golf','Golf|mens-golf'].flatMap(key=>{const [sport,slug]=key.split('|');return parse(sport,slug).filter(e=>e.status==='Final').map(e=>e.results.map(r=>r.value).join(' · '));}),["T8th · 888 (+24)","2nd · 860 (-4)","3rd · 890 (+26)","2nd · 837 (-3)"]);

// Records equal the published ones: football 3-3 (0-3), volleyball 13-2
// (4-2), women's soccer 11-1-2 (6-1-1), men's soccer 7-3-2 (4-1-1).
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer']].map(([sport,slug])=>records(sport,slug)),[["3-3","0-3"],["13-2","4-2"],["11-1-2","6-1-1"],["7-3-2","4-1-1"]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Washington module checks passed');
