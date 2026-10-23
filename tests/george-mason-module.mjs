import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {georgeMasonSchool} from '../src/schools/george-mason.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='george-mason');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,georgeMasonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/george-mason-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gomason.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['george-mason'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',georgeMasonSchool.scheduleUrls],['roster',georgeMasonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('george-mason|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gomason.com',`${key} must stay on gomason.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gomason.com/sports/baseball/schedule"],"roster":["https://gomason.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gomason.com/sports/mens-basketball/schedule","https://gomason.com/sports/womens-basketball/schedule"],"roster":["https://gomason.com/sports/mens-basketball/roster","https://gomason.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gomason.com/sports/womens-cross-country/schedule","https://gomason.com/sports/mens-cross-country/schedule"],"roster":["https://gomason.com/sports/womens-cross-country/roster","https://gomason.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gomason.com/sports/mens-golf/schedule"],"roster":["https://gomason.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gomason.com/sports/womens-lacrosse/schedule"],"roster":["https://gomason.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://gomason.com/sports/womens-rowing/schedule"],"roster":["https://gomason.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gomason.com/sports/womens-soccer/schedule","https://gomason.com/sports/mens-soccer/schedule"],"roster":["https://gomason.com/sports/womens-soccer/roster","https://gomason.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gomason.com/sports/softball/schedule"],"roster":["https://gomason.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gomason.com/sports/womens-swimming-and-diving/schedule","https://gomason.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gomason.com/sports/womens-swimming-and-diving/roster","https://gomason.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gomason.com/sports/womens-tennis/schedule","https://gomason.com/sports/mens-tennis/schedule"],"roster":["https://gomason.com/sports/womens-tennis/roster","https://gomason.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gomason.com/sports/womens-track-and-field/schedule","https://gomason.com/sports/mens-track-and-field/schedule"],"roster":["https://gomason.com/sports/womens-track-and-field/roster","https://gomason.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gomason.com/sports/womens-volleyball/schedule","https://gomason.com/sports/mens-volleyball/schedule"],"roster":["https://gomason.com/sports/womens-volleyball/roster","https://gomason.com/sports/mens-volleyball/roster"],"combined":true},"Wrestling":{"schedule":["https://gomason.com/sports/wrestling/schedule"],"roster":["https://gomason.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'george-mason|"+sport+"':"),`${sport} routes must live in the George Mason module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gomason.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.georgeMasonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=george-mason)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · George Mason at Villanova (Exhibition) | L, 67-84",
 "Upcoming Oct 25, 2:00 PM Men's · George Mason vs St. Mary's (Md.) (Exhibition) | ",
 "Upcoming Nov 2, 4:00 PM Men's · George Mason vs UMBC | ",
 "Upcoming Nov 6, 7:00 PM Men's · George Mason vs Coppin State | ",
 "Upcoming Nov 12, 3:00 PM Men's · George Mason vs Kansas City | ",
 "Upcoming Nov 14, 1:00 PM Men's · George Mason vs Bradley | ",
 "Upcoming Nov 18, 7:00 PM Men's · George Mason vs North Carolina Central | ",
 "Upcoming Nov 21, 4:00 PM Men's · George Mason vs South Florida | ",
 "Upcoming Nov 25, 7:00 PM Men's · George Mason vs Longwood | ",
 "Upcoming Nov 28, 2:00 PM Men's · George Mason vs Marist | ",
 "Upcoming Dec 2, 7:00 PM Men's · George Mason at High Point | ",
 "Upcoming Dec 8, 7:00 PM Men's · George Mason vs Morgan State | ",
 "Upcoming Dec 12, 12:30 PM Men's · George Mason vs Old Dominion | ",
 "Upcoming Dec 19, 3:30 PM Men's · George Mason vs Towson | ",
 "Upcoming Dec 22, 7:00 PM Men's · George Mason vs Bryant | ",
 "Upcoming Dec 27, 4:00 PM Men's · George Mason vs McDaniel | ",
 "Upcoming Dec 30, 7:00 PM Men's · George Mason vs Richmond | ",
 "Upcoming Jan 2, 4:30 PM Men's · George Mason at Rhode Island | ",
 "Upcoming Jan 6, 7:00 PM Men's · George Mason vs Fordham | ",
 "Upcoming Jan 9, 4:30 PM Men's · George Mason at Saint Joseph's | ",
 "Upcoming Jan 13, 7:00 PM Men's · George Mason vs St. Bonaventure | ",
 "Upcoming Jan 18, 1:00 PM Men's · George Mason at George Washington | ",
 "Upcoming Jan 23, 2:30 PM Men's · George Mason vs Loyola Chicago | ",
 "Upcoming Jan 27, 6:00 PM Men's · George Mason at VCU | ",
 "Upcoming Jan 30, 4:30 PM Men's · George Mason vs Saint Joseph's | ",
 "Upcoming Feb 3, 7:00 PM Men's · George Mason at St. Bonaventure | ",
 "Upcoming Feb 6, 12:00 PM Men's · George Mason vs George Washington | ",
 "Upcoming Feb 13, 2:00 PM Men's · George Mason at Davidson | ",
 "Upcoming Feb 17, 7:00 PM Men's · George Mason vs La Salle | ",
 "Upcoming Feb 20, 12:30 PM Men's · George Mason at Duquesne | ",
 "Upcoming Feb 23, 8:30 PM Men's · George Mason at Dayton | ",
 "Upcoming Feb 26, 7:00 PM Men's · George Mason vs VCU | ",
 "Upcoming Mar 3, 7:00 PM Men's · George Mason vs Rhode Island | ",
 "Upcoming Mar 6, 2:30 PM Men's · George Mason at Saint Louis | ",
 "Upcoming Mar 10 Men's · George Mason at Atlantic 10 Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 24, 2:00 PM Women's · George Mason vs Mount St. Mary's (Md.) - Exhibition (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · George Mason vs Temple | ",
 "Upcoming Nov 5, 7:00 PM Women's · George Mason vs Akron | ",
 "Upcoming Nov 8, 1:00 PM Women's · George Mason at Maryland | ",
 "Upcoming Nov 11, 6:00 PM Women's · George Mason at Army | ",
 "Upcoming Nov 14, 3:00 PM Women's · George Mason vs North Carolina Central | ",
 "Upcoming Nov 18, 7:00 PM Women's · George Mason at Princeton | ",
 "Upcoming Nov 21, 12:00 PM Women's · George Mason vs JMU | ",
 "Upcoming Nov 24, 2:00 PM Women's · George Mason at Longwood | ",
 "Upcoming Nov 27, 11:00 AM Women's · George Mason vs Vermont | ",
 "Upcoming Nov 28, 1:00 PM Women's · George Mason vs Providence | ",
 "Upcoming Dec 2, 6:30 PM Women's · George Mason at La Salle | ",
 "Upcoming Dec 5, 4:00 PM Women's · George Mason at Liberty | ",
 "Upcoming Dec 7, 6:00 PM Women's · George Mason at Navy | ",
 "Upcoming Dec 16, 7:00 PM Women's · George Mason at FGCU | ",
 "Upcoming Dec 20, 1:00 PM Women's · George Mason vs UMES | ",
 "Upcoming Dec 30, 12:00 PM Women's · George Mason vs Dayton | ",
 "Upcoming Jan 2, 3:00 PM Women's · George Mason vs Rhode Island | ",
 "Upcoming Jan 6, 7:00 PM Women's · George Mason at Saint Louis | ",
 "Upcoming Jan 9, 3:00 PM Women's · George Mason vs St. Bonaventure | ",
 "Upcoming Jan 13, 6:00 PM Women's · George Mason at Richmond | ",
 "Upcoming Jan 16, 6:00 PM Women's · George Mason at Fordham | ",
 "Upcoming Jan 20, 7:00 PM Women's · George Mason vs Davidson | ",
 "Upcoming Jan 23, 1:00 PM Women's · George Mason at Loyola Chicago | ",
 "Upcoming Jan 27, 7:00 PM Women's · George Mason vs Duquesne | ",
 "Upcoming Jan 31, 12:00 PM Women's · George Mason at Rhode Island | ",
 "Upcoming Feb 3, 7:00 PM Women's · George Mason vs VCU | ",
 "Upcoming Feb 7, 2:00 PM Women's · George Mason vs George Washington | ",
 "Upcoming Feb 10, 7:00 PM Women's · George Mason vs Fordham | ",
 "Upcoming Feb 14, 12:00 PM Women's · George Mason at Davidson | ",
 "Upcoming Feb 20, 2:00 PM Women's · George Mason at George Washington | ",
 "Upcoming Feb 24, 6:00 PM Women's · George Mason at VCU | ",
 "Upcoming Feb 27, 3:00 PM Women's · George Mason vs Saint Joseph's | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · George Mason at Salisbury University Fall Classic | Women's team: 2nd",
 "Final Sep 18 Women's · George Mason at Main Line Invitational | Women's team: 5th",
 "Final Oct 2 Women's · George Mason at Richmond Invitational | Women's team: 7th",
 "Final Oct 16 Women's · George Mason at Princeton Fall Classic | Women's team: 16th",
 "Upcoming Oct 31 Women's · George Mason at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Women's · George Mason at NCAA Southeast Regional Championships | ",
 "Upcoming Nov 21 Women's · George Mason at NCAA National Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · George Mason at Salisbury University Fall Classic | Men's team: 1st",
 "Final Sep 18 Men's · George Mason at Main Line Invitational | Men's team: 2nd",
 "Final Oct 2 Men's · George Mason at Richmond Invitational | Men's team: 5th",
 "Final Oct 16 Men's · George Mason at Princeton Fall Classic | Men's team: 4th",
 "Upcoming Oct 31 Men's · George Mason at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Men's · George Mason at NCAA Southeast Regional Championships | ",
 "Upcoming Nov 21 Men's · George Mason at NCAA National Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 George Mason at Rod Myers Invitational | Completed",
 "Final Oct 5 George Mason at Nemacolin Collegiate Invitational by WVU | Completed",
 "Final Oct 12 George Mason at Moraine Intercollegiate | Completed",
 "Upcoming Feb 7 George Mason at Compadres Collegiate | ",
 "Upcoming Mar 8 George Mason at Babygrande Donald Ross Collegiate | ",
 "Upcoming Mar 15 George Mason at All American Intercollegiate | ",
 "Upcoming Mar 21 George Mason at UC San Diego Invitational | ",
 "Upcoming Apr 12 George Mason at Mountaineer Invitational at Pete Dye | ",
 "Upcoming Apr 17 George Mason at Rutherford Intercollegiate | ",
 "Upcoming Apr 26 George Mason at Atlantic 10 Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Feb 7, 2:00 PM George Mason vs Longwood | ",
 "Upcoming Feb 12, 1:00 PM George Mason vs LIU | ",
 "Upcoming Feb 14, 1:00 PM George Mason at Radford | ",
 "Upcoming Feb 19, 4:00 PM George Mason vs Winthrop | ",
 "Upcoming Feb 24, 1:00 PM George Mason vs American | ",
 "Upcoming Feb 27 George Mason at Howard | ",
 "Upcoming Mar 3, 4:00 PM George Mason vs Youngstown State | ",
 "Upcoming Mar 13, 11:00 AM George Mason at St. Bonaventure | ",
 "Upcoming Mar 20, 12:00 PM George Mason vs La Salle | ",
 "Upcoming Mar 24 George Mason at Richmond | ",
 "Upcoming Mar 27, 12:00 PM George Mason vs VCU | ",
 "Upcoming Apr 3 George Mason at George Washington | ",
 "Upcoming Apr 11, 12:00 PM George Mason vs Davidson | ",
 "Upcoming Apr 17 George Mason at Saint Joseph's | ",
 "Upcoming Apr 24 George Mason at Rhode Island | ",
 "Upcoming May 1, 12:00 PM George Mason vs Duquesne | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · George Mason vs Virginia Military Institute | W, 4-1",
 "Final Aug 16 Women's · George Mason at James Madison | L, 1-2",
 "Final Aug 20 Women's · George Mason vs Pennsylvania | W, 1-0",
 "Final Aug 23 Women's · George Mason vs Mount St. Mary's (Md.) | W, 4-2",
 "Final Aug 30 Women's · George Mason vs Loyola University Maryland | T, 0-0",
 "Final Sep 6 Women's · George Mason at Liberty | L, 3-4",
 "Final Sep 10 Women's · George Mason at Longwood | T, 1-1",
 "Final Sep 13 Women's · George Mason vs Hampton | W, 3-0",
 "Final Sep 19 Women's · George Mason at Saint Joseph's | T, 1-1",
 "Final Sep 24 Women's · George Mason vs Fordham | W, 4-2",
 "Final Sep 27 Women's · George Mason at Saint Louis | L, 0-3",
 "Final Oct 3 Women's · George Mason vs Richmond | W, 1-0",
 "Final Oct 8 Women's · George Mason at George Washington | L, 0-2",
 "Final Oct 11 Women's · George Mason vs Duquesne | W, 1-0",
 "Final Oct 17 Women's · George Mason at St. Bonaventure | W, 3-2",
 "Today Oct 22, 6:00 PM Women's · George Mason vs Rhode Island | ",
 "Upcoming Oct 25, 1:00 PM Women's · George Mason vs La Salle | ",
 "Upcoming Nov 1, 1:30 PM Women's · George Mason at Davidson College | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · George Mason at Vermont | L, 0-2",
 "Final Aug 27 Men's · George Mason vs William & Mary | W, 3-1",
 "Final Sep 1 Men's · George Mason vs Marshall | T, 3-3",
 "Final Sep 7 Men's · George Mason at West Virginia | L, 1-2",
 "Final Sep 11 Men's · George Mason at Davidson College | L, 2-3",
 "Final Sep 15 Men's · George Mason at Bucknell | L, 1-3",
 "Final Sep 19 Men's · George Mason at Saint Joseph's | T, 2-2",
 "Final Sep 25 Men's · George Mason vs Ohio State | T, 1-1",
 "Final Oct 3 Men's · George Mason vs Duquesne | L, 1-2",
 "Final Oct 7 Men's · George Mason vs Loyola University Chicago | W, 4-0",
 "Final Oct 11 Men's · George Mason vs Stony Brook | L, 0-2",
 "Final Oct 17 Men's · George Mason vs George Washington | W, 1-0",
 "Final Oct 21 Men's · George Mason at La Salle | W, 1-0",
 "Upcoming Oct 25, 4:00 PM Men's · George Mason vs Rhode Island | ",
 "Upcoming Oct 31, 3:00 PM Men's · George Mason at Virginia Commonwealth | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · George Mason at Potomac Relays | Completed",
 "Final Oct 2 Women's · George Mason at Old Dominion | W, 149-113",
 "Final Oct 9 Women's · George Mason at Richmond | L, 121-176",
 "Final Oct 10 Women's · George Mason vs Davidson College | W, 183-113",
 "Final Oct 10 Women's · George Mason vs Duquesne | L, 93-204",
 "Upcoming Oct 23 Women's · George Mason at Seahawk Diving Invitational | ",
 "Upcoming Nov 7, 12:00 PM Women's · George Mason vs William & Mary | ",
 "Upcoming Nov 18, 5:00 PM Women's · George Mason at Patriot Invitational | ",
 "Upcoming Dec 18, 12:00 PM Women's · George Mason vs Towson | ",
 "Upcoming Jan 14 Women's · George Mason at La Salle | ",
 "Upcoming Jan 23, 12:00 PM Women's · George Mason vs Georgetown | ",
 "Upcoming Feb 17 Women's · George Mason at Atlantic 10 Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 25 Men's · George Mason at Potomac Relays | Completed",
 "Final Oct 2 Men's · George Mason at Old Dominion | W, 139-123",
 "Final Oct 9 Men's · George Mason at Davidson College | W, 192-108",
 "Upcoming Oct 23 Men's · George Mason at Seahawk Diving Invitational | ",
 "Upcoming Nov 7, 12:00 PM Men's · George Mason vs William & Mary | ",
 "Upcoming Nov 18, 5:00 PM Men's · George Mason at Patriot Invitational | ",
 "Upcoming Dec 18, 12:00 PM Men's · George Mason vs Towson | ",
 "Upcoming Jan 14 Men's · George Mason at La Salle | ",
 "Upcoming Jan 23, 12:00 PM Men's · George Mason vs Georgetown | ",
 "Upcoming Feb 17 Men's · George Mason at Atlantic 10 Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · George Mason at Moore Invitational | Completed",
 "Final Oct 10 Women's · George Mason at Women's Fall Invitational | Completed",
 "Final Oct 15 Women's · George Mason at ITA Regional | Completed"
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · George Mason at Joe Hunt Invitational | Completed",
 "Final Sep 19 Men's · George Mason at Mary Washington Invitational | Completed",
 "Final Oct 8 Men's · George Mason at ITA Regional | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · George Mason vs Northwestern | W, 3-1",
 "Final Aug 29 Women's · George Mason at Georgetown | L, 1-3",
 "Final Aug 30 Women's · George Mason at Howard | W, 3-2",
 "Final Sep 5 Women's · George Mason vs UMES | W, 3-1",
 "Final Sep 6 Women's · George Mason vs Hampton | W, 3-0",
 "Final Sep 7 Women's · George Mason at Maryland | L, 0-3",
 "Final Sep 11 Women's · George Mason at UMBC | W, 3-2",
 "Final Sep 12 Women's · George Mason at Morgan State | W, 3-1",
 "Final Sep 13 Women's · George Mason at Loyola Maryland | W, 3-1",
 "Final Sep 18 Women's · George Mason vs Delaware State | W, 3-1",
 "Final Sep 19 Women's · George Mason vs UNCG | L, 2-3",
 "Final Sep 20 Women's · George Mason at JMU | L, 0-3",
 "Final Sep 25 Women's · George Mason vs Rhode Island | W, 3-1",
 "Final Sep 26 Women's · George Mason vs Rhode Island | W, 3-0",
 "Final Oct 2 Women's · George Mason at Davidson | W, 3-1",
 "Final Oct 3 Women's · George Mason at Davidson | W, 3-1",
 "Final Oct 7 Women's · George Mason vs George Washington | W, 3-0",
 "Final Oct 10 Women's · George Mason at Fordham | L, 1-3",
 "Final Oct 11 Women's · George Mason at Fordham | L, 1-3",
 "Final Oct 16 Women's · George Mason vs VCU | L, 1-3",
 "Final Oct 17 Women's · George Mason vs VCU | L, 2-3",
 "Upcoming Oct 23, 5:00 PM Women's · George Mason at Saint Louis | ",
 "Upcoming Oct 24, 1:30 PM Women's · George Mason at Saint Louis | ",
 "Upcoming Oct 28, 6:00 PM Women's · George Mason at George Washington | ",
 "Upcoming Oct 30, 6:00 PM Women's · George Mason vs Dayton | ",
 "Upcoming Oct 31, 12:00 PM Women's · George Mason vs Dayton | ",
 "Upcoming Nov 6, 7:00 PM Women's · George Mason at Loyola Chicago | ",
 "Upcoming Nov 7, 3:00 PM Women's · George Mason at Loyola Chicago | ",
 "Upcoming Nov 13, 6:00 PM Women's · George Mason vs Duquesne | ",
 "Upcoming Nov 14, 3:00 PM Women's · George Mason vs Duquesne | ",
 "Upcoming Nov 20 Women's · George Mason at Atlantic 10 Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 10:00 AM George Mason at Southeast Open | ",
 "Upcoming Nov 7, 9:00 AM George Mason at Davis & Elkins College | ",
 "Upcoming Nov 7, 10:30 AM George Mason at Marymount | ",
 "Upcoming Nov 7, 12:00 PM George Mason at UCNJ | ",
 "Upcoming Nov 7, 1:30 PM George Mason at Williams College | ",
 "Upcoming Nov 13, 6:00 PM George Mason at SIUE | ",
 "Upcoming Nov 20, 12:00 PM George Mason vs Purdue | ",
 "Upcoming Nov 22, 9:00 AM George Mason at Big Red Invitational | ",
 "Upcoming Dec 4, 7:00 PM George Mason vs University at Buffalo | ",
 "Upcoming Dec 6, 10:00 AM George Mason at A Better Way Classic | ",
 "Upcoming Dec 20, 9:30 AM George Mason at Kent State Open | ",
 "Upcoming Jan 7, 7:00 PM George Mason at Edinboro University of Pennsylvania | ",
 "Upcoming Jan 9, 6:00 PM George Mason at Kent State | ",
 "Upcoming Jan 15, 5:00 PM George Mason vs Bloomsburg | ",
 "Upcoming Jan 16, 2:00 PM George Mason vs Navy | ",
 "Upcoming Jan 24, 1:00 PM George Mason at Campbell | ",
 "Upcoming Jan 28, 7:00 PM George Mason vs Lock Haven | ",
 "Upcoming Jan 31, 12:00 PM George Mason at Rider | ",
 "Upcoming Jan 31, 2:00 PM George Mason vs Davidson College | ",
 "Upcoming Feb 7, 2:00 PM George Mason vs Central Michigan | ",
 "Upcoming Feb 14, 5:00 PM George Mason vs American | ",
 "Upcoming Feb 18, 7:00 PM George Mason vs Gardner-Webb | ",
 "Upcoming Feb 21 George Mason at Patriots Last Chance | ",
 "Upcoming Mar 5 George Mason at Mid-American Conference Championships | ",
 "Upcoming Mar 18 George Mason at NCAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("George Mason module checks passed");
