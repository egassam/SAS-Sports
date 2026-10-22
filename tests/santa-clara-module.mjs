import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {santaClaraSchool} from '../src/schools/santa-clara.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='santa-clara');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,santaClaraHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/santa-clara-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit santaclarabroncos.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['santa-clara'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',santaClaraSchool.scheduleUrls],['roster',santaClaraSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('santa-clara|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'santaclarabroncos.com',`${key} must stay on santaclarabroncos.com`);
  }
}
const parity={"Baseball":{"schedule":["https://santaclarabroncos.com/sports/baseball/schedule"],"roster":["https://santaclarabroncos.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://santaclarabroncos.com/sports/mens-basketball/schedule","https://santaclarabroncos.com/sports/womens-basketball/schedule"],"roster":["https://santaclarabroncos.com/sports/mens-basketball/roster","https://santaclarabroncos.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://santaclarabroncos.com/sports/womens-beach-volleyball/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://santaclarabroncos.com/sports/womens-cross-country/schedule","https://santaclarabroncos.com/sports/mens-cross-country/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-cross-country/roster","https://santaclarabroncos.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://santaclarabroncos.com/sports/womens-golf/schedule","https://santaclarabroncos.com/sports/mens-golf/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-golf/roster","https://santaclarabroncos.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://santaclarabroncos.com/sports/womens-rowing/schedule","https://santaclarabroncos.com/sports/mens-rowing/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-rowing/roster","https://santaclarabroncos.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://santaclarabroncos.com/sports/womens-soccer/schedule","https://santaclarabroncos.com/sports/mens-soccer/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-soccer/roster","https://santaclarabroncos.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://santaclarabroncos.com/sports/softball/schedule"],"roster":["https://santaclarabroncos.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://santaclarabroncos.com/sports/womens-tennis/schedule","https://santaclarabroncos.com/sports/mens-tennis/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-tennis/roster","https://santaclarabroncos.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://santaclarabroncos.com/sports/womens-volleyball/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://santaclarabroncos.com/sports/womens-water-polo/schedule","https://santaclarabroncos.com/sports/mens-water-polo/schedule"],"roster":["https://santaclarabroncos.com/sports/womens-water-polo/roster","https://santaclarabroncos.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'santa-clara|"+sport+"':"),`${sport} routes must live in the Santa Clara module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://santaclarabroncos.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.santaClaraHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=santa-clara)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Santa Clara vs Stanford (Exhibition) | W, 83-78",
 "Upcoming Oct 24, 1:00 PM Men's · Santa Clara at Utah State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Santa Clara vs Towson | ",
 "Upcoming Nov 4, 7:00 PM Men's · Santa Clara vs Milwaukee | ",
 "Upcoming Nov 7, 7:00 PM Men's · Santa Clara vs Sacramento State | ",
 "Upcoming Nov 11, 5:00 PM Men's · Santa Clara at North Texas | ",
 "Upcoming Nov 14, 7:00 PM Men's · Santa Clara vs New Mexico | ",
 "Upcoming Nov 19, 7:30 PM Men's · Santa Clara vs VCU | ",
 "Upcoming Nov 23, 4:00 PM Men's · Santa Clara vs Illinois State | ",
 "Upcoming Nov 24, 4:00 PM Men's · Santa Clara vs Nevada | ",
 "Upcoming Nov 28, 4:00 PM Men's · Santa Clara vs Utah Tech | ",
 "Upcoming Dec 2, 7:00 PM Men's · Santa Clara vs Fresno State | ",
 "Upcoming Dec 5, 5:00 PM Men's · Santa Clara at GCU | ",
 "Upcoming Dec 12, 4:00 PM Men's · Santa Clara vs Murray State | ",
 "Upcoming Dec 14, 6:00 PM Men's · Santa Clara vs McNeese State | ",
 "Upcoming Dec 21, 2:00 PM Men's · Santa Clara vs Boise State | ",
 "Upcoming Dec 23, 3:30 PM Men's · Santa Clara vs Oregon State | ",
 "Upcoming Dec 29, 5:00 PM Men's · Santa Clara vs Dominican | ",
 "Upcoming Jan 2 Men's · Santa Clara at Pacific | ",
 "Upcoming Jan 7, 8:00 PM Men's · Santa Clara vs San Francisco | ",
 "Upcoming Jan 13 Men's · Santa Clara at San Diego | ",
 "Upcoming Jan 16, 3:00 PM Men's · Santa Clara at LMU | ",
 "Upcoming Jan 20, 7:00 PM Men's · Santa Clara vs Pepperdine | ",
 "Upcoming Jan 23, 4:00 PM Men's · Santa Clara vs Pacific | ",
 "Upcoming Jan 27 Men's · Santa Clara at Portland | ",
 "Upcoming Jan 30, 7:00 PM Men's · Santa Clara at Saint Mary's | ",
 "Upcoming Feb 3, 7:00 PM Men's · Santa Clara vs Seattle | ",
 "Upcoming Feb 6, 6:00 PM Men's · Santa Clara vs San Diego | ",
 "Upcoming Feb 10, 7:00 PM Men's · Santa Clara vs Denver | ",
 "Upcoming Feb 13 Men's · Santa Clara at Pepperdine | ",
 "Upcoming Feb 16, 8:00 PM Men's · Santa Clara at Seattle | ",
 "Upcoming Feb 20, 6:00 PM Men's · Santa Clara vs LMU | ",
 "Upcoming Feb 24, 8:00 PM Men's · Santa Clara at San Francisco | ",
 "Upcoming Feb 27 Men's · Santa Clara vs Saint Mary's | ",
 "Upcoming Mar 5 Men's · Santa Clara at WCC Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Women's · Santa Clara at Wyoming | ",
 "Upcoming Nov 7, 3:00 PM Women's · Santa Clara at Utah Valley | ",
 "Upcoming Nov 9, 6:00 PM Women's · Santa Clara at Long Beach State | ",
 "Upcoming Nov 13, 7:00 PM Women's · Santa Clara vs Stanford | ",
 "Upcoming Nov 17, 7:00 PM Women's · Santa Clara vs Grand Canyon | ",
 "Upcoming Nov 20, 5:30 PM Women's · Santa Clara at Arizona State | ",
 "Upcoming Nov 26, 5:00 PM Women's · Santa Clara vs Xavier | ",
 "Upcoming Nov 28 Women's · Santa Clara vs Texas Tech or Air Force | ",
 "Upcoming Dec 3, 7:00 PM Women's · Santa Clara vs San Diego State | ",
 "Upcoming Dec 6, 1:00 PM Women's · Santa Clara vs UC Santa Cruz | ",
 "Upcoming Dec 13, 1:00 PM Women's · Santa Clara at Boise State | ",
 "Upcoming Dec 17 Women's · Santa Clara at Washington | ",
 "Upcoming Dec 21, 1:00 PM Women's · Santa Clara vs Montana State | ",
 "Upcoming Dec 28, 7:00 PM Women's · Santa Clara vs Dominican | ",
 "Upcoming Dec 31 Women's · Santa Clara at Denver | ",
 "Upcoming Jan 2 Women's · Santa Clara vs Portland | ",
 "Upcoming Jan 7 Women's · Santa Clara at Saint Mary's | ",
 "Upcoming Jan 9 Women's · Santa Clara vs LMU | ",
 "Upcoming Jan 14 Women's · Santa Clara vs Seattle | ",
 "Upcoming Jan 16 Women's · Santa Clara at San Francisco | ",
 "Upcoming Jan 21 Women's · Santa Clara vs Denver | ",
 "Upcoming Jan 23 Women's · Santa Clara at Pacific | ",
 "Upcoming Jan 28 Women's · Santa Clara vs San Diego | ",
 "Upcoming Jan 30 Women's · Santa Clara at Pepperdine | ",
 "Upcoming Feb 4 Women's · Santa Clara vs San Francisco | ",
 "Upcoming Feb 6 Women's · Santa Clara vs Saint Mary's | ",
 "Upcoming Feb 11 Women's · Santa Clara at Seattle | ",
 "Upcoming Feb 13 Women's · Santa Clara at Portland | ",
 "Upcoming Feb 18 Women's · Santa Clara vs Pacific | ",
 "Upcoming Feb 20 Women's · Santa Clara vs Pepperdine | ",
 "Upcoming Feb 25 Women's · Santa Clara at LMU | ",
 "Upcoming Feb 27 Women's · Santa Clara at San Diego | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Santa Clara at USF Invitational | 5th of 12",
 "Final Sep 18 Women's · Santa Clara at Saint Mary's College Invitational | 11th of 15",
 "Final Sep 25 Women's · Santa Clara at Sean Earl Lakefront Invitational | 5th of 8 (Open Race)",
 "Final Oct 17 Women's · Santa Clara at Bronco Invitational | 4th of 23",
 "Upcoming Oct 30 Women's · Santa Clara at West Coast Conference Championship | ",
 "Upcoming Nov 13 Women's · Santa Clara at NCAA West Regional | ",
 "Upcoming Nov 21 Women's · Santa Clara at NCAA National Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Santa Clara at USF Invitational | 4th of 17",
 "Final Sep 18 Men's · Santa Clara at Saint Mary's College Invitational | 11th of 13",
 "Final Sep 19 Men's · Santa Clara at John McNichols Invitational | 24th of 34",
 "Final Oct 17 Men's · Santa Clara at Bronco Invitational | 2nd of 22",
 "Upcoming Oct 30 Men's · Santa Clara at West Coast Conference Championship | ",
 "Upcoming Nov 13 Men's · Santa Clara at NCAA West Regional | ",
 "Upcoming Nov 21 Men's · Santa Clara at NCAA National Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Santa Clara at Leadership and Golf Invitational | Completed",
 "Final Oct 5 Women's · Santa Clara at Oklahoma Intercollegiate | Completed",
 "Final Oct 16 Women's · Santa Clara at Stanford Intercollegiate | Completed"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Santa Clara at Bomb Darts Birds Collegiate | Completed",
 "Final Sep 13 Men's · Santa Clara at Canadian Collegiate Invitational | Completed",
 "Final Sep 25 Men's · Santa Clara at William H. Tucker Intercollegiate | Completed",
 "Final Oct 19 Men's · Santa Clara at Saint Mary's Invitational | Completed",
 "Upcoming Oct 26 Men's · Santa Clara at The Preserve Golf Club Collegiate | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Santa Clara at San Jose State | W, 2-0",
 "Final Aug 16 Women's · Santa Clara vs California | T, 1-1",
 "Final Aug 20 Women's · Santa Clara vs Oregon | T, 1-1",
 "Final Aug 23 Women's · Santa Clara vs Pitt | T, 1-1",
 "Final Aug 27 Women's · Santa Clara vs UC Davis | W, 1-0",
 "Final Aug 30 Women's · Santa Clara vs UCLA | L, 2-3",
 "Final Sep 6 Women's · Santa Clara vs Stanford | L, 0-4",
 "Final Sep 13 Women's · Santa Clara vs Fresno State | W, 4-0",
 "Final Sep 17 Women's · Santa Clara at UTSA | W, 1-0",
 "Final Sep 20 Women's · Santa Clara at Texas State | T, 0-0",
 "Final Sep 26 Women's · Santa Clara at San Diego | W, 3-1",
 "Final Oct 3 Women's · Santa Clara vs Denver | W, 3-0",
 "Final Oct 7 Women's · Santa Clara vs Pacific | W, 2-1",
 "Final Oct 10 Women's · Santa Clara at LMU | T, 1-1",
 "Final Oct 17 Women's · Santa Clara at Seattle | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Women's · Santa Clara vs Saint Mary's | ",
 "Upcoming Oct 28, 3:00 PM Women's · Santa Clara at Pepperdine | ",
 "Upcoming Oct 31, 1:00 PM Women's · Santa Clara at San Francisco | ",
 "Upcoming Nov 7, 1:00 PM Women's · Santa Clara vs Portland | ",
 "Upcoming Nov 11 Women's · Santa Clara at West Coast Conference Tournament | ",
 "Upcoming Nov 14 Women's · Santa Clara at West Coast Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Santa Clara vs Cleveland State | W, 2-1",
 "Final Aug 23 Men's · Santa Clara vs Fordham | W, 2-0",
 "Final Aug 27 Men's · Santa Clara vs California | L, 0-1",
 "Final Aug 30 Men's · Santa Clara vs Utah Valley | L, 0-1",
 "Final Sep 4 Men's · Santa Clara vs Loyola Chicago | L, 2-3",
 "Final Sep 7 Men's · Santa Clara at Creighton | L, 1-4",
 "Final Sep 15 Men's · Santa Clara at Stanford | L, 0-1",
 "Final Sep 20 Men's · Santa Clara vs San Diego State | W, 2-1",
 "Final Sep 26 Men's · Santa Clara at Seattle U | T, 0-0",
 "Final Sep 30 Men's · Santa Clara vs San Francisco | T, 1-1",
 "Final Oct 3 Men's · Santa Clara at Pacific | L, 1-2",
 "Final Oct 10 Men's · Santa Clara vs LMU | W, 2-0",
 "Final Oct 17 Men's · Santa Clara vs Saint Mary's | T, 0-0",
 "Final Oct 21 Men's · Santa Clara at San Diego | L, 1-3",
 "Upcoming Oct 24, 7:00 PM Men's · Santa Clara at Portland | ",
 "Upcoming Oct 31, 7:00 PM Men's · Santa Clara vs Denver | ",
 "Upcoming Nov 11 Men's · Santa Clara at WCC Tournament | ",
 "Upcoming Nov 14 Men's · Santa Clara at WCC Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 8 Women's · Santa Clara at ITA Regional Championships | Completed",
 "Upcoming Oct 23, 10:00 AM Women's · Santa Clara at Santa Clara Hidden Dual | ",
 "Upcoming Nov 6 Women's · Santa Clara at San Jose State Hidden Dual | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Santa Clara at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Santa Clara at UC Davis Aggies Invitational | Completed",
 "Final Oct 2 Men's · Santa Clara at San Diego Veterans Classic | Completed",
 "Final Oct 9 Men's · Santa Clara at UC Santa Barbara Invitational | Completed",
 "Final Oct 15 Men's · Santa Clara at ITA Regional Championships | Completed",
 "Upcoming Oct 30 Men's · Santa Clara at Pacific Invitational | ",
 "Upcoming Nov 5 Men's · Santa Clara at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Men's · Santa Clara at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Santa Clara at NCAA Singles & Doubles Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Santa Clara vs Eastern Illinois | L, 2-3",
 "Final Aug 28 Santa Clara at Wright State | L, 2-3",
 "Final Aug 29 Santa Clara at Dayton | L, 1-3",
 "Final Sep 1 Santa Clara at Cincinnati | W, 3-0",
 "Final Sep 4 Santa Clara vs Manhattan | W, 3-0",
 "Final Sep 5 Santa Clara vs Hofstra | L, 0-3",
 "Final Sep 5 Santa Clara at Yale | L, 1-3",
 "Final Sep 11 Santa Clara vs San Diego State | L, 0-3",
 "Final Sep 12 Santa Clara vs CSU Bakersfield | W, 3-2",
 "Final Sep 13 Santa Clara vs California | L, 1-3",
 "Final Sep 17 Santa Clara at Cal Poly | W, 3-2",
 "Final Sep 18 Santa Clara vs Stanford | L, 1-3",
 "Final Sep 24 Santa Clara vs Pepperdine | L, 2-3",
 "Final Sep 26 Santa Clara vs LMU | L, 1-3",
 "Final Oct 1 Santa Clara at Portland | W, 3-0",
 "Final Oct 3 Santa Clara at Seattle | W, 3-0",
 "Final Oct 10 Santa Clara at San Francisco | W, 3-1",
 "Final Oct 15 Santa Clara vs Pacific | W, 3-1",
 "Final Oct 17 Santa Clara vs Saint Mary's | L, 2-3",
 "Today Oct 22, 6:00 PM Santa Clara at LMU | ",
 "Upcoming Oct 24 Santa Clara at Pepperdine | ",
 "Upcoming Oct 29, 5:00 PM Santa Clara at Denver | ",
 "Upcoming Oct 31 Santa Clara at San Diego | ",
 "Upcoming Nov 5, 7:00 PM Santa Clara vs Seattle | ",
 "Upcoming Nov 7, 1:00 PM Santa Clara vs Portland | ",
 "Upcoming Nov 14, 1:00 PM Santa Clara vs San Francisco | ",
 "Upcoming Nov 19, 6:30 PM Santa Clara at Saint Mary's | ",
 "Upcoming Nov 21, 2:00 PM Santa Clara at Pacific | ",
 "Upcoming Nov 23, 7:00 PM Santa Clara vs San Diego | ",
 "Upcoming Nov 25, 2:00 PM Santa Clara vs Denver | ",
 "Upcoming Dec 3 Santa Clara at NCAA Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Santa Clara at UC Merced | W, 18-4",
 "Final Aug 28 Men's · Santa Clara vs Fresno Pacific | W, 23-7",
 "Final Sep 5 Men's · Santa Clara vs UCLA | L, 8-13",
 "Final Sep 5 Men's · Santa Clara vs UC Merced | W, 18-1",
 "Final Sep 5 Men's · Santa Clara vs Cuesta College (Exhibition) | W, 18-8",
 "Final Sep 11 Men's · Santa Clara vs Wagner | W, 17-9",
 "Final Sep 12 Men's · Santa Clara vs Bucknell | W, 16-9",
 "Final Sep 12 Men's · Santa Clara vs Harvard | W, 13-11",
 "Final Sep 18 Men's · Santa Clara vs Stanford | L, 4-21",
 "Final Sep 19 Men's · Santa Clara vs UC Santa Barbara | L, 13-15",
 "Final Sep 19 Men's · Santa Clara vs Cal Baptist | L, 11-16",
 "Final Sep 20 Men's · Santa Clara vs Claremont-Mudd-Scripps | W, 12-10",
 "Final Sep 25 Men's · Santa Clara at Chapman | W, 20-8",
 "Final Sep 26 Men's · Santa Clara vs Navy | L, 10-13",
 "Final Sep 26 Men's · Santa Clara at UC Irvine | L, 13-14",
 "Final Oct 9 Men's · Santa Clara vs UC Davis | L, 8-13",
 "Final Oct 10 Men's · Santa Clara at Stanford | L, 9-22",
 "Final Oct 17 Men's · Santa Clara at Pepperdine | L, 16-17",
 "Final Oct 18 Men's · Santa Clara at LMU | L, 13-14",
 "Today Oct 22, 2:30 PM Men's · Santa Clara vs Princeton | ",
 "Upcoming Oct 23, 2:00 PM Men's · Santa Clara vs LIU | ",
 "Upcoming Oct 24, 9:00 AM Men's · Santa Clara vs Brown | ",
 "Upcoming Oct 25, 9:20 AM Men's · Santa Clara vs Iona | ",
 "Upcoming Oct 30, 2:30 PM Men's · Santa Clara vs Saint Mary's | ",
 "Upcoming Oct 31 Men's · Santa Clara vs San Jose State | ",
 "Upcoming Nov 6, 7:00 PM Men's · Santa Clara at Pacific | ",
 "Upcoming Nov 8 Men's · Santa Clara vs Air Force | ",
 "Upcoming Nov 20 Men's · Santa Clara at WCC Championship First Round | ",
 "Upcoming Nov 21 Men's · Santa Clara at WCC Championship Semifinals | ",
 "Upcoming Nov 22 Men's · Santa Clara at WCC Championship Championship | ",
 "Upcoming Dec 5 Men's · Santa Clara at NCAA Championship First Round | ",
 "Upcoming Dec 6 Men's · Santa Clara at NCAA Championship Semifinals | ",
 "Upcoming Dec 7 Men's · Santa Clara at NCAA Championship Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Santa Clara module checks passed");
