import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {georgeWashingtonSchool} from '../src/schools/george-washington.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='george-washington');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,georgeWashingtonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/george-washington-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gwsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['george-washington'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',georgeWashingtonSchool.scheduleUrls],['roster',georgeWashingtonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('george-washington|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gwsports.com',`${key} must stay on gwsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gwsports.com/sports/baseball/schedule"],"roster":["https://gwsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gwsports.com/sports/mens-basketball/schedule","https://gwsports.com/sports/womens-basketball/schedule"],"roster":["https://gwsports.com/sports/mens-basketball/roster","https://gwsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gwsports.com/sports/womens-cross-country/schedule","https://gwsports.com/sports/mens-cross-country/schedule"],"roster":["https://gwsports.com/sports/womens-cross-country/roster","https://gwsports.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gwsports.com/sports/mens-golf/schedule"],"roster":["https://gwsports.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://gwsports.com/sports/womens-gymnastics/schedule"],"roster":["https://gwsports.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://gwsports.com/sports/womens-lacrosse/schedule"],"roster":["https://gwsports.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://gwsports.com/sports/womens-rowing/schedule"],"roster":["https://gwsports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gwsports.com/sports/womens-soccer/schedule","https://gwsports.com/sports/mens-soccer/schedule"],"roster":["https://gwsports.com/sports/womens-soccer/roster","https://gwsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gwsports.com/sports/softball/schedule"],"roster":["https://gwsports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gwsports.com/sports/womens-swimming-and-diving/schedule","https://gwsports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gwsports.com/sports/womens-swimming-and-diving/roster","https://gwsports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gwsports.com/sports/womens-tennis/schedule"],"roster":["https://gwsports.com/sports/womens-tennis/roster"],"combined":false},"Volleyball":{"schedule":["https://gwsports.com/sports/womens-volleyball/schedule"],"roster":["https://gwsports.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://gwsports.com/sports/mens-water-polo/schedule"],"roster":["https://gwsports.com/sports/mens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'george-washington|"+sport+"':"),`${sport} routes must live in the George Washington module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gwsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.georgeWashingtonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=george-washington)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 12:00 PM George Washington at Old Dominion | ",
 "Upcoming Nov 6 George Washington vs Buff & Blue World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · George Washington vs Georgetown (Exhibition) | L, 68-76",
 "Upcoming Nov 2, 7:30 PM Men's · George Washington vs Navy | ",
 "Upcoming Nov 7, 6:00 PM Men's · George Washington vs Hampton | ",
 "Upcoming Nov 10, 7:00 PM Men's · George Washington vs Elon | ",
 "Upcoming Nov 13, 7:00 PM Men's · George Washington vs Harvard | ",
 "Upcoming Nov 16, 12:00 PM Men's · George Washington vs Ferrum | ",
 "Upcoming Nov 20, 2:00 PM Men's · George Washington vs UAB | ",
 "Upcoming Nov 22, 2:00 PM Men's · George Washington vs Western Kentucky | ",
 "Upcoming Nov 27, 4:00 PM Men's · George Washington vs UMBC | ",
 "Upcoming Dec 1, 7:00 PM Men's · George Washington vs Southeastern Louisiana | ",
 "Upcoming Dec 5, 2:00 PM Men's · George Washington vs Long Island | ",
 "Upcoming Dec 9, 7:00 PM Men's · George Washington vs American | ",
 "Upcoming Dec 12, 12:00 PM Men's · George Washington at Boston College | ",
 "Upcoming Dec 19, 6:00 PM Men's · George Washington vs San Francisco | ",
 "Upcoming Dec 21, 6:30 PM Men's · George Washington vs Utah State | ",
 "Upcoming Dec 30, 8:00 PM Men's · George Washington at Loyola Chicago | ",
 "Upcoming Jan 2, 4:00 PM Men's · George Washington vs Saint Joseph's | ",
 "Upcoming Jan 6, 7:00 PM Men's · George Washington at La Salle | ",
 "Upcoming Jan 9, 2:00 PM Men's · George Washington vs VCU | ",
 "Upcoming Jan 13, 7:00 PM Men's · George Washington at Rhode Island | ",
 "Upcoming Jan 18, 1:00 PM Men's · George Washington vs George Mason | ",
 "Upcoming Jan 23, 12:30 PM Men's · George Washington at St. Bonaventure | ",
 "Upcoming Jan 27, 7:00 PM Men's · George Washington vs Richmond | ",
 "Upcoming Jan 30, 2:30 PM Men's · George Washington at Fordham | ",
 "Upcoming Feb 3, 7:00 PM Men's · George Washington vs Duquesne | ",
 "Upcoming Feb 6, 12:00 PM Men's · George Washington at George Mason | ",
 "Upcoming Feb 10, 7:00 PM Men's · George Washington at Richmond | ",
 "Upcoming Feb 13, 6:00 PM Men's · George Washington vs La Salle | ",
 "Upcoming Feb 16, 7:00 PM Men's · George Washington vs Dayton | ",
 "Upcoming Feb 24, 7:00 PM Men's · George Washington at Davidson | ",
 "Upcoming Feb 27, 8:00 PM Men's · George Washington vs Saint Louis | ",
 "Upcoming Mar 2, 6:00 PM Men's · George Washington at Dayton | ",
 "Upcoming Mar 6, 4:30 PM Men's · George Washington vs Loyola Chicago | ",
 "Upcoming Mar 10 Men's · George Washington at ATLANTIC 10 CHAMPIONSHIP | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 18 Women's · George Washington vs Towson (Exhibition) | W, 72-69",
 "Upcoming Nov 2, 5:00 PM Women's · George Washington vs UDC | ",
 "Upcoming Nov 5, 7:00 PM Women's · George Washington at West Virginia | ",
 "Upcoming Nov 11, 6:00 PM Women's · George Washington vs Georgetown | ",
 "Upcoming Nov 14, 5:30 PM Women's · George Washington vs Long Island | ",
 "Upcoming Nov 17, 6:00 PM Women's · George Washington vs Temple | ",
 "Upcoming Nov 20, 7:00 PM Women's · George Washington at Howard | ",
 "Upcoming Nov 23, 7:30 PM Women's · George Washington vs UAB | ",
 "Upcoming Nov 25, 1:30 PM Women's · George Washington vs Arizona | ",
 "Upcoming Nov 28, 2:00 PM Women's · George Washington vs Saint Francis | ",
 "Upcoming Dec 2, 6:00 PM Women's · George Washington vs Duquesne | ",
 "Upcoming Dec 5, 1:00 PM Women's · George Washington at Brown | ",
 "Upcoming Dec 8, 6:00 PM Women's · George Washington vs Loyola (MD) | ",
 "Upcoming Dec 12, 2:00 PM Women's · George Washington vs Rider | ",
 "Upcoming Dec 18, 12:00 PM Women's · George Washington at Northwestern | ",
 "Upcoming Dec 21, 1:00 PM Women's · George Washington vs Maine | ",
 "Upcoming Dec 30, 6:30 PM Women's · George Washington at La Salle | ",
 "Upcoming Jan 3, 2:00 PM Women's · George Washington at Saint Joseph's | ",
 "Upcoming Jan 6, 6:00 PM Women's · George Washington vs St. Bonaventure | ",
 "Upcoming Jan 10, 12:00 PM Women's · George Washington vs Davidson | ",
 "Upcoming Jan 13, 6:00 PM Women's · George Washington vs Fordham | ",
 "Upcoming Jan 17, 2:00 PM Women's · George Washington at Rhode Island | ",
 "Upcoming Jan 20, 6:00 PM Women's · George Washington vs VCU | ",
 "Upcoming Jan 23, 7:00 PM Women's · George Washington at Saint Louis | ",
 "Upcoming Jan 27, 7:00 PM Women's · George Washington at Dayton | ",
 "Upcoming Jan 30, 2:00 PM Women's · George Washington vs La Salle | ",
 "Upcoming Feb 7, 2:00 PM Women's · George Washington at George Mason | ",
 "Upcoming Feb 10, 8:00 PM Women's · George Washington at Loyola Chicago | ",
 "Upcoming Feb 13, 2:00 PM Women's · George Washington vs Saint Joseph's | ",
 "Upcoming Feb 17, 6:00 PM Women's · George Washington at Fordham | ",
 "Upcoming Feb 20, 2:00 PM Women's · George Washington vs George Mason | ",
 "Upcoming Feb 24, 6:00 PM Women's · George Washington vs Rhode Island | ",
 "Upcoming Feb 27, 2:00 PM Women's · George Washington at Richmond | ",
 "Upcoming Mar 3 Women's · George Washington at Atlantic 10 Basketball Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · George Washington at Piper Cross Country Challenge | 1st of 10",
 "Final Sep 12 Women's · George Washington at Navy Cantello Invitational | 2nd of 4",
 "Final Oct 2 Women's · George Washington at Richmond Invitational | 4th of 14",
 "Final Oct 17 Women's · George Washington at ECAC / IC4A Championships | 8th of 26",
 "Upcoming Oct 31, 10:00 AM Women's · George Washington at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Women's · George Washington at NCAA Mid-Atlantic Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · George Washington at Piper Cross Country Challenge | 1st of 9",
 "Final Sep 12 Men's · George Washington at Navy Cantello Invitational | 2nd of 4",
 "Final Oct 2 Men's · George Washington at Richmond Invitational | 3rd of 16",
 "Final Oct 17 Men's · George Washington at ECAC / IC4A Championships | 7th of 25",
 "Upcoming Oct 31, 10:50 AM Men's · George Washington at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Men's · George Washington at NCAA Mid-Atlantic Regional | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 George Washington at Bryan National Collegiate | Completed",
 "Final Sep 19 George Washington at The Goat | Completed",
 "Final Oct 5 George Washington at Nemacolin Collegiate Invitational | Completed",
 "Final Oct 12 George Washington at Elon Phoenix Invitational | Completed",
 "Upcoming Oct 26 George Washington at Monterrey Collegiate Classic | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24, 3:00 PM George Washington at Bucknell | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 George Washington at Head of the Schuylkill | ",
 "Upcoming Nov 1 George Washington at Princeton Chase | ",
 "Upcoming Nov 8 George Washington at Rivanna Romp | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · George Washington vs Temple | W, 4-0",
 "Final Aug 15 Women's · George Washington at Delaware | L, 2-3",
 "Final Aug 19 Women's · George Washington at Howard | T, 0-0",
 "Final Aug 23 Women's · George Washington at Towson | T, 2-2",
 "Final Aug 27 Women's · George Washington at Penn | L, 1-3",
 "Final Sep 6 Women's · George Washington vs Colgate | W, 3-0",
 "Final Sep 10 Women's · George Washington vs American | W, 5-1",
 "Final Sep 16 Women's · George Washington at Georgetown | L, 1-4",
 "Final Sep 20 Women's · George Washington vs Richmond | T, 1-1",
 "Final Sep 24 Women's · George Washington at Rhode Island | L, 2-3",
 "Final Sep 27 Women's · George Washington vs Saint Joseph's | L, 2-3",
 "Final Oct 4 Women's · George Washington at Duquesne | T, 0-0",
 "Final Oct 8 Women's · George Washington vs George Mason | W, 2-0",
 "Final Oct 11 Women's · George Washington at Dayton | T, 1-1",
 "Final Oct 17 Women's · George Washington at VCU | W, 3-2",
 "Final Oct 22 Women's · George Washington vs Loyola Chicago | W, 2-1",
 "Upcoming Oct 25, 1:00 PM Women's · George Washington at Fordham | ",
 "Upcoming Nov 1, 1:00 PM Women's · George Washington vs St. Bonaventure | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · George Washington vs Old Dominion | L, 1-3",
 "Final Aug 23 Men's · George Washington at Binghamton | W, 3-0",
 "Final Aug 28 Men's · George Washington at Navy | W, 2-0",
 "Final Aug 31 Men's · George Washington at UMBC | W, 3-0",
 "Final Sep 9 Men's · George Washington vs Drexel | T, 1-1",
 "Final Sep 13 Men's · George Washington at Villanova | W, 3-2",
 "Final Sep 19 Men's · George Washington vs La Salle | L, 2-3",
 "Final Sep 22 Men's · George Washington at Delaware | L, 1-6",
 "Final Sep 26 Men's · George Washington at Loyola Chicago | T, 1-1",
 "Final Oct 3 Men's · George Washington vs Rhode Island | L, 0-1",
 "Final Oct 7 Men's · George Washington at VCU | T, 1-1",
 "Final Oct 13 Men's · George Washington at High Point | L, 0-2",
 "Final Oct 17 Men's · George Washington at George Mason | L, 0-1",
 "Final Oct 20 Men's · George Washington vs Saint Joseph's | L, 0-2",
 "Upcoming Oct 24, 7:00 PM Men's · George Washington at Dayton | ",
 "Upcoming Oct 31, 2:00 PM Men's · George Washington vs St. Bonaventure | ",
 "Upcoming Nov 7 Men's · George Washington at Atlantic 10 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · George Washington at Navy (Dive Only) | L, 119-142",
 "Final Oct 3 Women's · George Washington at William & Mary (Swim Only) | L, 87-174",
 "Final Oct 16 Women's · George Washington vs Auburn | L, 197-593",
 "Final Oct 16 Women's · George Washington vs Penn State | L, 373-413",
 "Final Oct 17 Women's · George Washington vs Florida State | L, 203-586",
 "Upcoming Oct 28, 4:00 PM Women's · George Washington at Navy | ",
 "Upcoming Nov 7 Women's · George Washington vs Loyola (MD) | ",
 "Upcoming Nov 18 Women's · George Washington at Wolfpack Invitational (Swim Only) | ",
 "Upcoming Nov 19 Women's · George Washington at Tennessee Diving Invitational | ",
 "Upcoming Jan 15 Women's · George Washington vs Towson | ",
 "Upcoming Jan 16 Women's · George Washington at Georgetown | ",
 "Upcoming Jan 23 Women's · George Washington at Delaware | ",
 "Upcoming Feb 17 Women's · George Washington at Atlantic 10 Championships | ",
 "Upcoming Mar 8 Women's · George Washington at Diving Zone A | ",
 "Upcoming Mar 11 Women's · George Washington at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Women's · George Washington at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · George Washington at Navy (Dive Only) | L, 90-164",
 "Final Oct 3 Men's · George Washington at William & Mary (Swim Only) | W, 153-108",
 "Final Oct 16 Men's · George Washington vs Auburn | L, 197-593",
 "Final Oct 16 Men's · George Washington vs Penn State | L, 373-413",
 "Final Oct 17 Men's · George Washington vs Florida State | L, 203-586",
 "Upcoming Oct 28, 4:00 PM Men's · George Washington at Navy | ",
 "Upcoming Nov 7 Men's · George Washington vs Loyola (MD) | ",
 "Upcoming Nov 18 Men's · George Washington at Wolfpack Invitational (Swim Only) | ",
 "Upcoming Nov 19 Men's · George Washington at Tennessee Diving Invitational | ",
 "Upcoming Jan 15 Men's · George Washington vs Towson | ",
 "Upcoming Jan 16 Men's · George Washington at Georgetown | ",
 "Upcoming Jan 23 Men's · George Washington at Delaware | ",
 "Upcoming Feb 17 Men's · George Washington at Atlantic 10 Championships | ",
 "Upcoming Mar 8 Men's · George Washington at Diving Zone A | ",
 "Upcoming Mar 11 Men's · George Washington at CSCAA National Invitational Championship | ",
 "Upcoming Mar 24 Men's · George Washington at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 George Washington at Blue & Gold Invite | Completed",
 "Final Oct 2 George Washington at River City Open | Completed",
 "Final Oct 10 George Washington at George Mason Invite | Completed",
 "Final Oct 15 George Washington at ITA Regionals | Completed",
 "Upcoming Oct 23 George Washington at CNU Fall Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 George Washington vs Furman | L, 2-3",
 "Final Aug 28 George Washington at Georgia | L, 0-3",
 "Final Aug 29 George Washington vs North Florida | L, 1-3",
 "Final Sep 4 George Washington at NC State | L, 0-3",
 "Final Sep 5 George Washington vs Charlotte | W, 3-0",
 "Final Sep 6 George Washington vs Wofford | L, 0-3",
 "Final Sep 11 George Washington at Loyola Maryland | W, 3-1",
 "Final Sep 12 George Washington at UMBC | W, 3-1",
 "Final Sep 13 George Washington at Morgan State | W, 3-1",
 "Final Sep 15 George Washington at Virginia | L, 1-3",
 "Final Sep 18 George Washington at Georgetown | L, 0-3",
 "Final Sep 19 George Washington vs Howard | W, 3-0",
 "Final Sep 25 George Washington vs Saint Louis | L, 2-3",
 "Final Sep 26 George Washington vs Saint Louis | W, 3-2",
 "Final Oct 2 George Washington at VCU | L, 0-3",
 "Final Oct 3 George Washington at VCU | W, 3-0",
 "Final Oct 7 George Washington at George Mason | L, 0-3",
 "Final Oct 10 George Washington vs Davidson | W, 3-1",
 "Final Oct 11 George Washington vs Davidson | W, 3-2",
 "Final Oct 16 George Washington at Dayton | L, 2-3",
 "Final Oct 17 George Washington at Dayton | L, 0-3",
 "Upcoming Oct 23, 6:00 PM George Washington vs Fordham | ",
 "Upcoming Oct 24, 1:00 PM George Washington vs Fordham | ",
 "Upcoming Oct 28, 6:00 PM George Washington vs George Mason | ",
 "Upcoming Oct 31, 7:00 PM George Washington at Rhode Island | ",
 "Upcoming Nov 1, 1:00 PM George Washington at Rhode Island | ",
 "Upcoming Nov 6, 6:00 PM George Washington at Duquesne | ",
 "Upcoming Nov 7, 2:00 PM George Washington at Duquesne | ",
 "Upcoming Nov 13, 1:30 PM George Washington vs Loyola Chicago | ",
 "Upcoming Nov 14, 1:00 PM George Washington vs Loyola Chicago | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 George Washington vs Biola | W, 16-13",
 "Final Aug 28 George Washington at (T) UC Irvine | L, 9-13",
 "Final Aug 29 George Washington vs (D-III) Redlands | W, 12-11",
 "Final Aug 29 George Washington vs LMU | L, 12-15",
 "Final Sep 4 George Washington vs Princeton | L, 11-23",
 "Final Sep 5 George Washington vs LIU | W, 14-13",
 "Final Sep 5 George Washington vs Iona | W, 18-10",
 "Final Sep 6 George Washington vs Chapman | W, 23-11",
 "Final Sep 6 George Washington vs Air Force | L, 18-19",
 "Final Sep 12 George Washington vs Fresno Pacific | W, 19-11",
 "Final Sep 12 George Washington vs Gannon | W, 15-8",
 "Final Sep 13 George Washington vs (D-III) Johns Hopkins | W, 10-8",
 "Final Sep 13 George Washington at Salem | W, 16-10",
 "Final Sep 19 George Washington at (D-III) Johns Hopkins | L, 8-13",
 "Final Oct 3 George Washington at Bucknell | L, 13-14",
 "Final Oct 4 George Washington at Mercyhurst | W, 17-15",
 "Final Oct 4 George Washington at Gannon | L, 14-15",
 "Final Oct 11 George Washington at Fordham | L, 12-17",
 "Final Oct 11 George Washington at Wagner | L, 11-12",
 "Upcoming Oct 23, 7:30 PM George Washington at Navy | ",
 "Upcoming Oct 24, 2:00 PM George Washington at Mount St. Mary's | ",
 "Upcoming Oct 25, 2:00 PM George Washington vs Fordham | ",
 "Upcoming Nov 1, 10:00 AM George Washington vs Bucknell | ",
 "Upcoming Nov 1, 3:00 PM George Washington vs Mercyhurst | ",
 "Upcoming Nov 7, 10:00 AM George Washington vs Wagner | ",
 "Upcoming Nov 7, 5:00 PM George Washington vs Mount St. Mary's | ",
 "Upcoming Nov 8, 1:00 PM George Washington vs Navy | ",
 "Upcoming Nov 20 George Washington at MAWPC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("George Washington module checks passed");
