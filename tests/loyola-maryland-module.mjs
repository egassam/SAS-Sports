import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loyolaMarylandSchool} from '../src/schools/loyola-maryland.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='loyola-maryland');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,loyolaMarylandHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/loyola-maryland-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit loyolagreyhounds.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['loyola-maryland'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',loyolaMarylandSchool.scheduleUrls],['roster',loyolaMarylandSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('loyola-maryland|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'loyolagreyhounds.com',`${key} must stay on loyolagreyhounds.com`);
  }
}
const parity={"Basketball":{"schedule":["https://loyolagreyhounds.com/sports/mens-basketball/schedule","https://loyolagreyhounds.com/sports/womens-basketball/schedule"],"roster":["https://loyolagreyhounds.com/sports/mens-basketball/roster","https://loyolagreyhounds.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://loyolagreyhounds.com/sports/cross-country/schedule"],"roster":["https://loyolagreyhounds.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://loyolagreyhounds.com/sports/mens-golf/schedule"],"roster":["https://loyolagreyhounds.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://loyolagreyhounds.com/sports/womens-lacrosse/schedule","https://loyolagreyhounds.com/sports/mens-lacrosse/schedule"],"roster":["https://loyolagreyhounds.com/sports/womens-lacrosse/roster","https://loyolagreyhounds.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://loyolagreyhounds.com/sports/rowing/schedule"],"roster":["https://loyolagreyhounds.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://loyolagreyhounds.com/sports/womens-soccer/schedule","https://loyolagreyhounds.com/sports/mens-soccer/schedule"],"roster":["https://loyolagreyhounds.com/sports/womens-soccer/roster","https://loyolagreyhounds.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://loyolagreyhounds.com/sports/swimming-and-diving/schedule"],"roster":["https://loyolagreyhounds.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://loyolagreyhounds.com/sports/womens-tennis/schedule","https://loyolagreyhounds.com/sports/mens-tennis/schedule"],"roster":["https://loyolagreyhounds.com/sports/womens-tennis/roster","https://loyolagreyhounds.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://loyolagreyhounds.com/sports/womens-track-and-field/schedule"],"roster":["https://loyolagreyhounds.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://loyolagreyhounds.com/sports/womens-volleyball/schedule"],"roster":["https://loyolagreyhounds.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'loyola-maryland|"+sport+"':"),`${sport} routes must live in the Loyola Maryland module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://loyolagreyhounds.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.loyolaMarylandHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=loyola-maryland)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Men's · Loyola Maryland at Georgetown | ",
 "Upcoming Nov 6, 7:00 PM Men's · Loyola Maryland at Mount St. Mary's | ",
 "Upcoming Nov 9, 7:00 PM Men's · Loyola Maryland vs Washington (Md.) | ",
 "Upcoming Nov 12, 7:00 PM Men's · Loyola Maryland at Towson | ",
 "Upcoming Nov 14 Men's · Loyola Maryland vs Morgan State or UMBC | ",
 "Upcoming Nov 20, 7:00 PM Men's · Loyola Maryland at Virginia | ",
 "Upcoming Nov 24, 7:00 PM Men's · Loyola Maryland vs Rider | ",
 "Upcoming Nov 30, 7:00 PM Men's · Loyola Maryland vs Hartwick | ",
 "Upcoming Dec 2, 7:00 PM Men's · Loyola Maryland at Dayton | ",
 "Upcoming Dec 8, 7:00 PM Men's · Loyola Maryland at Manhattan | ",
 "Upcoming Dec 13, 5:00 PM Men's · Loyola Maryland vs Central Connecticut State | ",
 "Upcoming Dec 18, 7:00 PM Men's · Loyola Maryland vs Fairleigh Dickinson | ",
 "Upcoming Dec 21, 7:00 PM Men's · Loyola Maryland at High Point | ",
 "Upcoming Dec 30, 2:00 PM Men's · Loyola Maryland vs Boston University | ",
 "Upcoming Jan 2, 5:00 PM Men's · Loyola Maryland vs Army West Point | ",
 "Upcoming Jan 6, 7:00 PM Men's · Loyola Maryland at Lafayette | ",
 "Upcoming Jan 9, 2:00 PM Men's · Loyola Maryland vs Holy Cross | ",
 "Upcoming Jan 11, 6:30 PM Men's · Loyola Maryland vs American | ",
 "Upcoming Jan 16, 2:00 PM Men's · Loyola Maryland at Bucknell | ",
 "Upcoming Jan 20, 7:00 PM Men's · Loyola Maryland vs Lafayette | ",
 "Upcoming Jan 23, 5:00 PM Men's · Loyola Maryland vs Lehigh | ",
 "Upcoming Jan 27, 7:00 PM Men's · Loyola Maryland at Navy | ",
 "Upcoming Jan 30, 1:00 PM Men's · Loyola Maryland at Holy Cross | ",
 "Upcoming Feb 3, 7:00 PM Men's · Loyola Maryland vs Colgate | ",
 "Upcoming Feb 6, 4:00 PM Men's · Loyola Maryland at American | ",
 "Upcoming Feb 10, 7:00 PM Men's · Loyola Maryland vs Navy | ",
 "Upcoming Feb 13, 1:00 PM Men's · Loyola Maryland at Boston University | ",
 "Upcoming Feb 17, 6:00 PM Men's · Loyola Maryland at Lehigh | ",
 "Upcoming Feb 21, 1:00 PM Men's · Loyola Maryland vs Bucknell | ",
 "Upcoming Feb 24, 3:30 PM Men's · Loyola Maryland at Army West Point | ",
 "Upcoming Feb 27, 2:00 PM Men's · Loyola Maryland at Colgate | ",
 "Upcoming Mar 2 Men's · Loyola Maryland vs Patriot League First Round | ",
 "Upcoming Mar 4 Men's · Loyola Maryland at Patriot League Quarterfinals | ",
 "Upcoming Mar 7 Men's · Loyola Maryland at Patriot League Semifinals | ",
 "Upcoming Mar 10 Men's · Loyola Maryland at Patriot League Championship Game | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Loyola Maryland vs Notre Dame (Md.) | ",
 "Upcoming Nov 7, 12:00 PM Women's · Loyola Maryland at La Salle | ",
 "Upcoming Nov 10, 7:00 PM Women's · Loyola Maryland vs Yale | ",
 "Upcoming Nov 13, 11:00 AM Women's · Loyola Maryland vs Towson | ",
 "Upcoming Nov 15 Women's · Loyola Maryland vs Morgan State or UMBC | ",
 "Upcoming Nov 22, 1:00 PM Women's · Loyola Maryland vs Drexel | ",
 "Upcoming Nov 25, 1:00 PM Women's · Loyola Maryland vs Washington Adventist | ",
 "Upcoming Nov 28, 1:00 PM Women's · Loyola Maryland vs Cornell | ",
 "Upcoming Dec 3, 7:00 PM Women's · Loyola Maryland at Delaware | ",
 "Upcoming Dec 8 Women's · Loyola Maryland at George Washington | ",
 "Upcoming Dec 13, 2:00 PM Women's · Loyola Maryland at Georgetown | ",
 "Upcoming Dec 20, 1:00 PM Women's · Loyola Maryland vs William & Mary | ",
 "Upcoming Dec 30, 6:00 PM Women's · Loyola Maryland at Boston University | ",
 "Upcoming Jan 2, 1:00 PM Women's · Loyola Maryland at Army West Point | ",
 "Upcoming Jan 6, 7:00 PM Women's · Loyola Maryland vs Lafayette | ",
 "Upcoming Jan 9, 2:00 PM Women's · Loyola Maryland at Holy Cross | ",
 "Upcoming Jan 13, 6:00 PM Women's · Loyola Maryland at American | ",
 "Upcoming Jan 16, 1:00 PM Women's · Loyola Maryland vs Bucknell | ",
 "Upcoming Jan 20, 11:00 AM Women's · Loyola Maryland at Lafayette | ",
 "Upcoming Jan 23, 2:00 PM Women's · Loyola Maryland at Lehigh | ",
 "Upcoming Jan 27, 7:00 PM Women's · Loyola Maryland vs Navy | ",
 "Upcoming Jan 30, 1:00 PM Women's · Loyola Maryland vs Holy Cross | ",
 "Upcoming Feb 3, 6:00 PM Women's · Loyola Maryland at Colgate | ",
 "Upcoming Feb 6, 1:00 PM Women's · Loyola Maryland vs American | ",
 "Upcoming Feb 10, 6:00 PM Women's · Loyola Maryland at Navy | ",
 "Upcoming Feb 14, 1:00 PM Women's · Loyola Maryland vs Boston University | ",
 "Upcoming Feb 17, 7:00 PM Women's · Loyola Maryland vs Lehigh | ",
 "Upcoming Feb 20 Women's · Loyola Maryland at Bucknell | ",
 "Upcoming Feb 23, 7:00 PM Women's · Loyola Maryland vs Army West Point | ",
 "Upcoming Feb 26, 7:00 PM Women's · Loyola Maryland vs Colgate | ",
 "Upcoming Mar 1 Women's · Loyola Maryland vs Patriot League First Round | ",
 "Upcoming Mar 3 Women's · Loyola Maryland at Patriot League Quarterfinals | ",
 "Upcoming Mar 6 Women's · Loyola Maryland at Patriot League Semifinals | ",
 "Upcoming Mar 9 Women's · Loyola Maryland at Patriot League Championship Game | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Loyola Maryland at Temple Owls Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 12 Loyola Maryland at Cantello Invitational | Women's team: 4th / Men's team: 4th",
 "Final Oct 3 Loyola Maryland at Swags Louisville Cross Country Classic | Women's team: 10th / Men's team: 6th",
 "Final Oct 16 Loyola Maryland at Panorama Farms Invitational | Women's team: 12th / Men's team: 12th",
 "Upcoming Oct 31 Loyola Maryland at Patriot League Championships | ",
 "Upcoming Nov 13 Loyola Maryland at NCAA Mid-Atlantic Regional Championship | ",
 "Upcoming Nov 21 Loyola Maryland at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Loyola Maryland at Redhawk Intercollegiate | 5th",
 "Final Sep 25 Loyola Maryland at Macdonald Cup | Completed",
 "Final Sep 28 Loyola Maryland at Maryland Individual Invitational | No team score (individuals only)",
 "Final Oct 5 Loyola Maryland at Hamptons Intercollegiate | Completed",
 "Final Oct 19 Loyola Maryland at Qubein Cup | 4th",
 "Upcoming Oct 26 Loyola Maryland at Monterrey Collegiate Classic | ",
 "Upcoming Feb 28 Loyola Maryland at Loyola Intercollegiate | ",
 "Upcoming Mar 12 Loyola Maryland at Seminole Intercollegiate | ",
 "Upcoming Mar 20 Loyola Maryland at Carpetbagger Classic | ",
 "Upcoming Mar 22 Loyola Maryland at Seahawk Intercollegiate | ",
 "Upcoming Apr 9 Loyola Maryland at Robert Kepler Invitational | ",
 "Upcoming Apr 17 Loyola Maryland at Rutgers Invitational | ",
 "Upcoming Apr 30 Loyola Maryland at Patriot League Championships | ",
 "Upcoming May 17 Loyola Maryland at NCAA Regional Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Today Oct 24 Loyola Maryland at Head of the Schuylkill Regatta | ",
 "Upcoming Oct 31 Loyola Maryland at Head of the Occoquan Regatta | ",
 "Upcoming Nov 1 Loyola Maryland at Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Loyola Maryland vs William & Mary | T, 1-1",
 "Final Aug 16 Women's · Loyola Maryland vs Arkansas | T, 1-1",
 "Final Aug 20 Women's · Loyola Maryland at Princeton | L, 0-3",
 "Final Aug 30 Women's · Loyola Maryland at George Mason | T, 0-0",
 "Final Sep 3 Women's · Loyola Maryland vs Stony Brook | T, 0-0",
 "Final Sep 6 Women's · Loyola Maryland vs FDU | T, 0-0",
 "Final Sep 10 Women's · Loyola Maryland vs Iowa State | T, 1-1",
 "Final Sep 13 Women's · Loyola Maryland vs James Madison | T, 1-1",
 "Final Sep 20 Women's · Loyola Maryland at Holy Cross | W, 2-1",
 "Final Sep 26 Women's · Loyola Maryland vs Boston University | L, 0-1",
 "Final Sep 30 Women's · Loyola Maryland vs American | T, 2-2",
 "Final Oct 3 Women's · Loyola Maryland at Bucknell | T, 0-0",
 "Final Oct 10 Women's · Loyola Maryland vs Lehigh | W, 4-0",
 "Final Oct 17 Women's · Loyola Maryland at Colgate | W, 1-0",
 "Today Oct 24, 3:00 PM Women's · Loyola Maryland at Lafayette | ",
 "Upcoming Oct 31, 1:00 PM Women's · Loyola Maryland vs Army West Point | ",
 "Upcoming Nov 4, 8:00 PM Women's · Loyola Maryland at Navy | ",
 "Upcoming Nov 8 Women's · Loyola Maryland at Patriot League Quarterfinals | ",
 "Upcoming Nov 11 Women's · Loyola Maryland at Patriot League Semifinals | ",
 "Upcoming Nov 15 Women's · Loyola Maryland at Patriot League Championship Game | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Loyola Maryland vs St. John's | L, 0-5",
 "Final Aug 23 Men's · Loyola Maryland at UMBC | L, 2-3",
 "Final Aug 28 Men's · Loyola Maryland at Syracuse | L, 0-2",
 "Final Sep 1 Men's · Loyola Maryland at NJIT | L, 0-1",
 "Final Sep 4 Men's · Loyola Maryland vs Mount St. Mary's | W, 3-0",
 "Final Sep 8 Men's · Loyola Maryland vs Delaware | L, 0-3",
 "Final Sep 12 Men's · Loyola Maryland vs Lehigh | L, 0-2",
 "Final Sep 19 Men's · Loyola Maryland at American | T, 1-1",
 "Final Sep 22 Men's · Loyola Maryland vs Hofstra | L, 0-2",
 "Final Sep 26 Men's · Loyola Maryland at Holy Cross | W, 4-2",
 "Final Oct 3 Men's · Loyola Maryland vs Boston University | L, 1-2",
 "Final Oct 6 Men's · Loyola Maryland vs Penn | T, 0-0",
 "Final Oct 10 Men's · Loyola Maryland at Lafayette | L, 0-1",
 "Final Oct 17 Men's · Loyola Maryland vs Colgate | W, 3-1",
 "Today Oct 24, 8:00 PM Men's · Loyola Maryland at Navy | ",
 "Upcoming Oct 30, 6:00 PM Men's · Loyola Maryland at Army West Point | ",
 "Upcoming Nov 3, 6:00 PM Men's · Loyola Maryland vs Bucknell | ",
 "Upcoming Nov 7 Men's · Loyola Maryland at Patriot League Quarterfinals | ",
 "Upcoming Nov 10 Men's · Loyola Maryland at Patriot League Semifinals | ",
 "Upcoming Nov 14 Men's · Loyola Maryland at Patriot League Championship | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 26 Loyola Maryland vs Charm City Relays | Completed",
 "Final Oct 3 Loyola Maryland vs Green & Grey Meet | Completed",
 "Final Oct 9 Loyola Maryland at Navy | Men's team: L, 64-236 / Women's team: L, 88-212",
 "Final Oct 9 Loyola Maryland vs LSU | Men's team: L, 91-209 / Women's team: L, 53-247",
 "Final Oct 10 Loyola Maryland at Lehigh | Women's team: W, 169.5-130.5",
 "Final Oct 17 Loyola Maryland at Lafayette | Men's team: W, 219-81 / Women's team: W, 199.5-100.5",
 "Today Oct 23 Loyola Maryland at Thomas Murphy Invitational | ",
 "Upcoming Oct 28 Loyola Maryland at USA Swimming Short-Course World Championships Trials | ",
 "Upcoming Nov 7, 1:00 PM Loyola Maryland at George Washington | ",
 "Upcoming Nov 20, 10:00 AM Loyola Maryland at H2ounds Invitational | ",
 "Upcoming Dec 2 Loyola Maryland at Toyota U.S. Open Championships | ",
 "Upcoming Dec 5 Loyola Maryland at Hopkins Open | ",
 "Upcoming Dec 12, 8:30 AM Loyola Maryland at CSCAA Open Water Championships | ",
 "Upcoming Jan 15, 1:00 PM Loyola Maryland at Bucknell | ",
 "Upcoming Jan 23, 1:00 PM Loyola Maryland at Army West Point | ",
 "Upcoming Jan 30, 1:00 PM Loyola Maryland vs Mount St. Mary's | ",
 "Upcoming Feb 17 Loyola Maryland at Patriot League Championships | ",
 "Upcoming Feb 26 Loyola Maryland at ECAC Championships | ",
 "Upcoming Mar 17 Loyola Maryland at NCAA Women's Swimming & Diving Championships | ",
 "Upcoming Mar 24 Loyola Maryland at NCAA Men's Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Loyola Maryland vs Coppin State | W, 4-1",
 "Final Sep 26 Women's · Loyola Maryland at Delaware State | Completed",
 "Final Sep 27 Women's · Loyola Maryland at Morgan State | Completed",
 "Final Oct 2 Women's · Loyola Maryland at McClure Invitational | Completed",
 "Final Oct 15 Women's · Loyola Maryland at ITA Atlantic Regional | Completed",
 "Today Oct 23 Women's · Loyola Maryland at ITA Conference Masters Qualifier | ",
 "Upcoming Oct 31 Women's · Loyola Maryland at Navy Blinds | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Loyola Maryland vs Coppin State | W, 6-1",
 "Final Sep 12 Men's · Loyola Maryland vs Georgetown | W, 3-2",
 "Final Sep 18 Men's · Loyola Maryland vs Morgan State | W, 4-3",
 "Final Sep 19 Men's · Loyola Maryland vs Dickinson | W, 7-0",
 "Final Sep 20 Men's · Loyola Maryland vs Mount St. Mary's | W, 4-3",
 "Final Oct 8 Men's · Loyola Maryland at ITA Regionals | Completed",
 "Final Oct 9 Men's · Loyola Maryland at Gold Invitational | Completed",
 "Today Oct 23 Men's · Loyola Maryland at ITA Conference Masters Qualifier | ",
 "Today Oct 24 Men's · Loyola Maryland at Morgan State Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Loyola Maryland at James Madison | L, 0-3",
 "Final Aug 29 Loyola Maryland at James Madison | L, 0-3",
 "Final Sep 4 Loyola Maryland vs Towson | L, 1-3",
 "Final Sep 5 Loyola Maryland at Morgan State | W, 3-2",
 "Final Sep 6 Loyola Maryland vs Saint Peter's | W, 3-0",
 "Final Sep 11 Loyola Maryland vs George Washington | L, 1-3",
 "Final Sep 12 Loyola Maryland at Georgetown | L, 0-3",
 "Final Sep 13 Loyola Maryland vs George Mason | L, 1-3",
 "Final Sep 18 Loyola Maryland at Army West Point | L, 1-3",
 "Final Sep 19 Loyola Maryland at Colgate | L, 0-3",
 "Final Sep 25 Loyola Maryland vs Bucknell | W, 3-0",
 "Final Sep 26 Loyola Maryland vs Lehigh | W, 3-2",
 "Final Sep 29 Loyola Maryland at Coppin State | L, 2-3",
 "Final Oct 2 Loyola Maryland at Navy | W, 3-1",
 "Final Oct 3 Loyola Maryland at American | L, 1-3",
 "Final Oct 9 Loyola Maryland at Holy Cross | L, 1-3",
 "Final Oct 10 Loyola Maryland at Lafayette | W, 3-0",
 "Final Oct 17 Loyola Maryland vs Lafayette | W, 3-1",
 "Final Oct 23 Loyola Maryland vs Colgate | L, 1-3",
 "Today Oct 24, 4:00 PM Loyola Maryland vs Army West Point | ",
 "Upcoming Oct 30, 7:00 PM Loyola Maryland at Bucknell | ",
 "Upcoming Oct 31, 4:00 PM Loyola Maryland at Lehigh | ",
 "Upcoming Nov 4, 6:00 PM Loyola Maryland vs American | ",
 "Upcoming Nov 8, 2:00 PM Loyola Maryland vs Navy | ",
 "Upcoming Nov 14, 3:00 PM Loyola Maryland vs Holy Cross | ",
 "Upcoming Nov 17 Loyola Maryland at Patriot League Quarterfinals | ",
 "Upcoming Nov 20 Loyola Maryland at Patriot League Semifinals | ",
 "Upcoming Nov 22 Loyola Maryland at Patriot League Championship Game | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Loyola Maryland module checks passed");
