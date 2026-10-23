import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {drexelSchool} from '../src/schools/drexel.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='drexel');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,drexelHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/drexel-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit drexeldragons.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['drexel'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',drexelSchool.scheduleUrls],['roster',drexelSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('drexel|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'drexeldragons.com',`${key} must stay on drexeldragons.com`);
  }
}
const parity={"Basketball":{"schedule":["https://drexeldragons.com/sports/mens-basketball/schedule","https://drexeldragons.com/sports/womens-basketball/schedule"],"roster":["https://drexeldragons.com/sports/mens-basketball/roster","https://drexeldragons.com/sports/womens-basketball/roster"],"combined":true},"Field Hockey":{"schedule":["https://drexeldragons.com/sports/field-hockey/schedule"],"roster":["https://drexeldragons.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://drexeldragons.com/sports/mens-golf/schedule"],"roster":["https://drexeldragons.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://drexeldragons.com/sports/womens-lacrosse/schedule","https://drexeldragons.com/sports/mens-lacrosse/schedule"],"roster":["https://drexeldragons.com/sports/womens-lacrosse/roster","https://drexeldragons.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://drexeldragons.com/sports/womens-crew/schedule","https://drexeldragons.com/sports/mens-crew/schedule"],"roster":["https://drexeldragons.com/sports/womens-crew/roster","https://drexeldragons.com/sports/mens-crew/roster"],"combined":true},"Soccer":{"schedule":["https://drexeldragons.com/sports/womens-soccer/schedule","https://drexeldragons.com/sports/mens-soccer/schedule"],"roster":["https://drexeldragons.com/sports/womens-soccer/roster","https://drexeldragons.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://drexeldragons.com/sports/softball/schedule"],"roster":["https://drexeldragons.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://drexeldragons.com/sports/womens-swimming-and-diving/schedule","https://drexeldragons.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://drexeldragons.com/sports/womens-swimming-and-diving/roster","https://drexeldragons.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://drexeldragons.com/sports/womens-tennis/schedule","https://drexeldragons.com/sports/mens-tennis/schedule"],"roster":["https://drexeldragons.com/sports/womens-tennis/roster","https://drexeldragons.com/sports/mens-tennis/roster"],"combined":true},"Wrestling":{"schedule":["https://drexeldragons.com/sports/wrestling/schedule"],"roster":["https://drexeldragons.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'drexel|"+sport+"':"),`${sport} routes must live in the Drexel module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://drexeldragons.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.drexelHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=drexel)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 14 Men's · Drexel at St. John's (Exhibition) | L, 52-81",
 "Final Oct 22 Men's · Drexel at Lafayette (Exhibition) | L, 58-83",
 "Upcoming Oct 26, 7:00 PM Men's · Drexel vs Penn State (Exhibition) | ",
 "Upcoming Nov 3, 7:30 PM Men's · Drexel at Virginia | ",
 "Upcoming Nov 7, 2:00 PM Men's · Drexel vs Colgate | ",
 "Upcoming Nov 11, 7:00 PM Men's · Drexel vs American | ",
 "Upcoming Nov 14, 1:00 PM Men's · Drexel at Maine | ",
 "Upcoming Nov 20, 7:00 PM Men's · Drexel vs Saint Joseph's | ",
 "Upcoming Nov 24, 8:00 PM Men's · Drexel at Penn | ",
 "Upcoming Nov 28, 4:00 PM Men's · Drexel at Mount St. Mary's | ",
 "Upcoming Dec 1, 7:00 PM Men's · Drexel at Old Dominion | ",
 "Upcoming Dec 5 Men's · Drexel at Big 5 | ",
 "Upcoming Dec 13, 4:00 PM Men's · Drexel at NJIT | ",
 "Upcoming Dec 15, 7:00 PM Men's · Drexel at Pittsburgh | ",
 "Upcoming Dec 19, 4:00 PM Men's · Drexel vs UAlbany | ",
 "Upcoming Dec 22, 6:00 PM Men's · Drexel vs Norfolk State | ",
 "Upcoming Dec 28, 12:00 PM Men's · Drexel vs Cairn | ",
 "Upcoming Dec 31, 2:00 PM Men's · Drexel at William & Mary | ",
 "Upcoming Jan 2, 2:00 PM Men's · Drexel at Hampton | ",
 "Upcoming Jan 7, 6:00 PM Men's · Drexel vs Charleston | ",
 "Upcoming Jan 14, 7:00 PM Men's · Drexel vs Northeastern | ",
 "Upcoming Jan 16, 2:00 PM Men's · Drexel at Monmouth | ",
 "Upcoming Jan 18, 7:00 PM Men's · Drexel at Hofstra | ",
 "Upcoming Jan 23, 2:00 PM Men's · Drexel vs North Carolina A&T | ",
 "Upcoming Jan 28, 7:00 PM Men's · Drexel vs Towson | ",
 "Upcoming Feb 1, 8:30 PM Men's · Drexel at Stony Brook | ",
 "Upcoming Feb 4, 7:00 PM Men's · Drexel at Northeastern | ",
 "Upcoming Feb 8, 9:00 PM Men's · Drexel vs Monmouth | ",
 "Upcoming Feb 11, 7:00 PM Men's · Drexel at Campbell | ",
 "Upcoming Feb 13 Men's · Drexel at North Carolina A&T | ",
 "Upcoming Feb 18, 7:00 PM Men's · Drexel vs UNCW | ",
 "Upcoming Feb 20, 4:00 PM Men's · Drexel vs Elon | ",
 "Upcoming Feb 25, 7:00 PM Men's · Drexel vs Stony Brook | ",
 "Upcoming Feb 27, 2:00 PM Men's · Drexel vs Hofstra | ",
 "Upcoming Mar 2, 7:00 PM Men's · Drexel at Towson | ",
 "Upcoming Mar 5 Men's · Drexel at CAA Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Drexel vs Marist | ",
 "Upcoming Nov 6, 1:00 PM Women's · Drexel at Penn | ",
 "Upcoming Nov 11, 6:00 PM Women's · Drexel at Virginia | ",
 "Upcoming Nov 15, 2:00 PM Women's · Drexel vs Saint Joseph's | ",
 "Upcoming Nov 18, 6:00 PM Women's · Drexel at American | ",
 "Upcoming Nov 22, 1:00 PM Women's · Drexel at Loyola (Md.) | ",
 "Upcoming Nov 27, 2:30 PM Women's · Drexel vs Southern Miss | ",
 "Upcoming Nov 28 Women's · Drexel vs Iona Turkey Tip-Off | ",
 "Upcoming Dec 3, 6:00 PM Women's · Drexel vs Arcadia | ",
 "Upcoming Dec 6 Women's · Drexel at Big 5 Classic | ",
 "Upcoming Dec 13, 12:00 PM Women's · Drexel at Vermont | ",
 "Upcoming Dec 16, 6:00 PM Women's · Drexel vs Delaware Valley | ",
 "Upcoming Dec 21, 1:00 PM Women's · Drexel vs Buffalo | ",
 "Upcoming Dec 28, 2:30 PM Women's · Drexel vs NJIT | ",
 "Upcoming Jan 1, 1:00 PM Women's · Drexel vs Elon | ",
 "Upcoming Jan 3, 1:00 PM Women's · Drexel at Northeastern | ",
 "Upcoming Jan 8 Women's · Drexel at Campbell | ",
 "Upcoming Jan 10, 1:00 PM Women's · Drexel at North Carolina A&T | ",
 "Upcoming Jan 15, 6:00 PM Women's · Drexel vs Stony Brook | ",
 "Upcoming Jan 17, 2:00 PM Women's · Drexel at Monmouth | ",
 "Upcoming Jan 22, 6:00 PM Women's · Drexel vs Charleston | ",
 "Upcoming Jan 24, 2:00 PM Women's · Drexel vs Towson | ",
 "Upcoming Jan 31 Women's · Drexel at Stony Brook | ",
 "Upcoming Feb 5, 6:00 PM Women's · Drexel at Hofstra | ",
 "Upcoming Feb 7, 2:00 PM Women's · Drexel vs Monmouth | ",
 "Upcoming Feb 12, 6:00 PM Women's · Drexel vs UNCW | ",
 "Upcoming Feb 14, 1:00 PM Women's · Drexel vs William & Mary | ",
 "Upcoming Feb 19, 7:00 PM Women's · Drexel at Elon | ",
 "Upcoming Feb 21 Women's · Drexel at Hampton | ",
 "Upcoming Feb 26, 6:00 PM Women's · Drexel vs Hofstra | ",
 "Upcoming Feb 28, 2:00 PM Women's · Drexel vs Northeastern | ",
 "Upcoming Mar 6 Women's · Drexel at Towson | ",
 "Upcoming Mar 10 Women's · Drexel at CAA Tournament | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Drexel at Maryland | L, 0-3",
 "Final Aug 30 Drexel vs James Madison | W, 1-0",
 "Final Sep 4 Drexel vs LIU | W, 11-0",
 "Final Sep 6 Drexel vs Saint Joseph's | W, 4-3",
 "Final Sep 11 Drexel vs Wagner | W, 7-0",
 "Final Sep 13 Drexel vs Lafayette | L, 1-4",
 "Final Sep 18 Drexel at Fairfield | W, 2-1",
 "Final Sep 20 Drexel at Villanova | W, 2-0",
 "Final Sep 27 Drexel vs Penn | W, 3-0",
 "Final Oct 2 Drexel vs Monmouth | L, 0-3",
 "Final Oct 4 Drexel vs Georgetown | W, 2-0",
 "Final Oct 9 Drexel vs Hofstra | W, 6-1",
 "Final Oct 11 Drexel at Lehigh | W, 5-0",
 "Final Oct 16 Drexel at Towson | W, 5-2",
 "Final Oct 18 Drexel vs Lock Haven | W, 8-0",
 "Today Oct 23, 3:00 PM Drexel vs Northeastern | ",
 "Upcoming Oct 25, 3:00 PM Drexel vs La Salle | ",
 "Upcoming Oct 30, 5:00 PM Drexel at William & Mary | ",
 "Upcoming Nov 4 Drexel at CAA Semifinals | ",
 "Upcoming Nov 6 Drexel vs CAA Finals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Drexel at J.T. Poston Invitational | 14th of 17",
 "Final Sep 20 Drexel at Temple Fall Invitational | 6th of 12",
 "Final Oct 4 Drexel at Nemacolin Collegiate Invitational | 8th of 16",
 "Upcoming Oct 24 Drexel at Monterrey Collegiate Classic | ",
 "Upcoming Oct 28 Drexel at Temple | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenscrew=parse("Rowing","womens-crew");
  assert.deepEqual(v_womenscrew.map(line),[
 "Upcoming Oct 24 Women's · Drexel at Head of the Schuylkill Regatta | ",
 "Upcoming Nov 1 Women's · Drexel at Princeton Chase | "
]);
  const v_menscrew=parse("Rowing","mens-crew");
  assert.deepEqual(v_menscrew.map(line),[
 "Upcoming Oct 24 Men's · Drexel at Head of the Schuylkill Regatta | ",
 "Upcoming Nov 1 Men's · Drexel at Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Drexel at Saint Joseph's | L, 2-3",
 "Final Aug 21 Women's · Drexel vs Holy Family | W, 5-0",
 "Final Aug 23 Women's · Drexel at Seton Hall | L, 0-1",
 "Final Aug 28 Women's · Drexel at La Salle | T, 1-1",
 "Final Aug 30 Women's · Drexel at NJIT | W, 2-1",
 "Final Sep 3 Women's · Drexel vs Lehigh | W, 2-1",
 "Final Sep 6 Women's · Drexel vs Lafayette | W, 2-1",
 "Final Sep 13 Women's · Drexel vs Delaware | L, 1-3",
 "Final Sep 20 Women's · Drexel vs Northeastern | L, 0-3",
 "Final Sep 24 Women's · Drexel at Hampton | W, 4-1",
 "Final Sep 27 Women's · Drexel at William & Mary | L, 0-4",
 "Final Oct 4 Women's · Drexel at Monmouth | T, 0-0",
 "Final Oct 8 Women's · Drexel vs Charleston | L, 0-3",
 "Final Oct 11 Women's · Drexel vs UNCW | L, 0-3",
 "Final Oct 18 Women's · Drexel vs Stony Brook | W, 1-0",
 "Upcoming Oct 25, 12:00 PM Women's · Drexel vs Hofstra | ",
 "Upcoming Nov 1, 1:00 PM Women's · Drexel at Towson | ",
 "Upcoming Nov 5 Women's · Drexel vs CAA First Round | ",
 "Upcoming Nov 8 Women's · Drexel at CAA Semifinals | ",
 "Upcoming Nov 14 Women's · Drexel vs CAA Finals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Drexel at Robert Morris | W, 2-1",
 "Final Aug 23 Men's · Drexel at Mercyhurst | W, 2-0",
 "Final Aug 29 Men's · Drexel at Monmouth | L, 0-1",
 "Final Sep 5 Men's · Drexel at Hofstra | L, 0-1",
 "Final Sep 9 Men's · Drexel at George Washington | T, 1-1",
 "Final Sep 12 Men's · Drexel vs Northeastern | W, 4-3",
 "Final Sep 15 Men's · Drexel vs La Salle | W, 3-1",
 "Final Sep 19 Men's · Drexel vs Stony Brook | W, 2-1",
 "Final Sep 22 Men's · Drexel at Villanova | L, 2-4",
 "Final Sep 29 Men's · Drexel at NJIT | L, 2-3",
 "Final Oct 3 Men's · Drexel at Northeastern | L, 1-2",
 "Final Oct 10 Men's · Drexel vs Hofstra | T, 1-1",
 "Final Oct 13 Men's · Drexel vs Penn | L, 0-1",
 "Final Oct 18 Men's · Drexel at Stony Brook | L, 0-2",
 "Final Oct 20 Men's · Drexel at Lafayette | W, 3-1",
 "Upcoming Oct 31, 1:00 PM Men's · Drexel vs Monmouth | ",
 "Upcoming Nov 5 Men's · Drexel at CAA Quarterfinals | ",
 "Upcoming Nov 8 Men's · Drexel at CAA Semifinals | ",
 "Upcoming Nov 14 Men's · Drexel at CAA Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Drexel vs Blue and Goal Meet | Completed",
 "Final Oct 17 Women's · Drexel vs La Salle | W, 195-101",
 "Upcoming Nov 7 Women's · Drexel at Seton Hall | ",
 "Upcoming Nov 19 Women's · Drexel at Bruno Invitational | ",
 "Upcoming Jan 8, 4:00 PM Women's · Drexel vs Saint Peter's | ",
 "Upcoming Jan 9 Women's · Drexel at Lehigh | ",
 "Upcoming Jan 23 Women's · Drexel at Towson | ",
 "Upcoming Jan 30 Women's · Drexel vs Catholic | ",
 "Upcoming Feb 6 Women's · Drexel vs Monmouth | ",
 "Upcoming Feb 24 Women's · Drexel at CAA Championships | ",
 "Upcoming Mar 8 Women's · Drexel at NCAA Diving Zone A Championships | ",
 "Upcoming Mar 11 Women's · Drexel at National Invitational Championships | ",
 "Upcoming Mar 17 Women's · Drexel at NCAA Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Drexel vs Blue and Goal Meet | Completed",
 "Final Oct 17 Men's · Drexel vs La Salle | W, 191.5-108.5",
 "Upcoming Nov 7 Men's · Drexel at Seton Hall | ",
 "Upcoming Nov 19 Men's · Drexel at Bruno Invitational | ",
 "Upcoming Jan 8, 4:00 PM Men's · Drexel vs Saint Peter's | ",
 "Upcoming Jan 9 Men's · Drexel at Lehigh | ",
 "Upcoming Jan 23 Men's · Drexel at Towson | ",
 "Upcoming Jan 30 Men's · Drexel vs Catholic | ",
 "Upcoming Feb 6 Men's · Drexel at Monmouth | ",
 "Upcoming Feb 24 Men's · Drexel at CAA Championships | ",
 "Upcoming Mar 8 Men's · Drexel at NCAA Diving Zone A Championships | ",
 "Upcoming Mar 11, 11:00 AM Men's · Drexel at National Invitational Championships | ",
 "Upcoming Mar 24 Men's · Drexel at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Drexel at Penn Invitational | Completed",
 "Final Oct 2 Women's · Drexel at Army | Completed",
 "Final Oct 3 Women's · Drexel at NJIT | Completed",
 "Final Oct 9 Women's · Drexel at Cissie Leary Invitational | Completed",
 "Final Oct 15 Women's · Drexel at ITA Northeast Regionals | Completed",
 "Upcoming Oct 30 Women's · Drexel at Dragon Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Drexel at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Drexel at Farnsworth Invitational | Completed",
 "Final Oct 2 Men's · Drexel at Saint Joseph's Invitational | Completed",
 "Final Oct 10 Men's · Drexel at Fordham Invitational | Completed",
 "Final Oct 15 Men's · Drexel at ITA Northeast Regionals | Completed",
 "Upcoming Nov 5 Men's · Drexel at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · Drexel at Dragon Invitational | ",
 "Upcoming Nov 17 Men's · Drexel at NCAA Individual Championships | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Drexel at Mercyhurst Open | ",
 "Upcoming Nov 8, 1:00 PM Drexel at Oklahoma State | ",
 "Upcoming Nov 9, 7:00 PM Drexel at Little Rock | ",
 "Upcoming Nov 15 Drexel at Appalachian State Invite | ",
 "Upcoming Nov 22 Drexel at PRTC Keystone Classic | ",
 "Upcoming Dec 4, 7:00 PM Drexel vs Rutgers | ",
 "Upcoming Dec 13, 1:00 PM Drexel vs LIU | ",
 "Upcoming Jan 2 Drexel at Southern Scuffle | ",
 "Upcoming Jan 16, 1:00 PM Drexel vs Sacred Heart | ",
 "Upcoming Jan 17, 2:00 PM Drexel vs Binghamton | ",
 "Upcoming Jan 23, 6:00 PM Drexel vs Navy | ",
 "Upcoming Jan 24, 3:00 PM Drexel at Hofstra | ",
 "Upcoming Jan 30, 1:00 PM Drexel vs American | ",
 "Upcoming Feb 6, 7:00 PM Drexel at Franklin and Marshall | ",
 "Upcoming Feb 13, 2:00 PM Drexel at Rider | ",
 "Upcoming Feb 19, 7:30 PM Drexel vs Maryland | ",
 "Upcoming Mar 5 Drexel at EIWA Championships | ",
 "Upcoming Mar 18 Drexel at NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenscrew,"Rowing womens-crew");
  ownRecapsOnly(v_menscrew,"Rowing mens-crew");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Drexel module checks passed");
