import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {duquesneSchool} from '../src/schools/duquesne.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='duquesne');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,duquesneHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/duquesne-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goduquesne.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['duquesne'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',duquesneSchool.scheduleUrls],['roster',duquesneSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('duquesne|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goduquesne.com',`${key} must stay on goduquesne.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://goduquesne.com/sports/acrobatics-and-tumbling/schedule"],"roster":["https://goduquesne.com/sports/acrobatics-and-tumbling/roster"],"combined":false},"Basketball":{"schedule":["https://goduquesne.com/sports/mens-basketball/schedule","https://goduquesne.com/sports/womens-basketball/schedule"],"roster":["https://goduquesne.com/sports/mens-basketball/roster","https://goduquesne.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://goduquesne.com/"],"roster":["https://goduquesne.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://goduquesne.com/sports/womens-cross-country/schedule","https://goduquesne.com/sports/mens-cross-country/schedule"],"roster":["https://goduquesne.com/sports/womens-cross-country/roster","https://goduquesne.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goduquesne.com/sports/football/schedule"],"roster":["https://goduquesne.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goduquesne.com/sports/womens-golf/schedule"],"roster":["https://goduquesne.com/sports/womens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://goduquesne.com/sports/womens-lacrosse/schedule"],"roster":["https://goduquesne.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://goduquesne.com/sports/womens-rowing/schedule"],"roster":["https://goduquesne.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://goduquesne.com/sports/womens-soccer/schedule","https://goduquesne.com/sports/mens-soccer/schedule"],"roster":["https://goduquesne.com/sports/womens-soccer/roster","https://goduquesne.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://goduquesne.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://goduquesne.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goduquesne.com/sports/womens-tennis/schedule","https://goduquesne.com/sports/mens-tennis/schedule"],"roster":["https://goduquesne.com/sports/womens-tennis/roster","https://goduquesne.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goduquesne.com/sports/womens-track-and-field/schedule","https://goduquesne.com/sports/mens-track-and-field/schedule"],"roster":["https://goduquesne.com/sports/womens-track-and-field/roster","https://goduquesne.com/sports/mens-track-and-field/roster"],"combined":true},"Triathlon":{"schedule":["https://goduquesne.com/sports/triathlon/schedule"],"roster":["https://goduquesne.com/sports/triathlon/roster"],"combined":false},"Volleyball":{"schedule":["https://goduquesne.com/sports/womens-volleyball/schedule"],"roster":["https://goduquesne.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'duquesne|"+sport+"':"),`${sport} routes must live in the Duquesne module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://goduquesne.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.duquesneHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=duquesne)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticsandtumbling=parse("Acrobatics & Tumbling","acrobatics-and-tumbling");
  assert.deepEqual(v_acrobaticsandtumbling.map(line),[
 "Upcoming Feb 7, 3:00 PM Duquesne vs Saint Leo | ",
 "Upcoming Feb 14, 3:00 PM Duquesne vs Canisius | ",
 "Upcoming Feb 28, 3:00 PM Duquesne at Missouri State | ",
 "Upcoming Mar 8, 6:00 PM Duquesne vs Augustana | ",
 "Upcoming Mar 25, 5:00 PM Duquesne at La Salle | ",
 "Upcoming Apr 8, 6:00 PM Duquesne vs Gannon | ",
 "Upcoming Apr 22 Duquesne at NCAA Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Duquesne vs Purdue Fort Wayne | ",
 "Upcoming Nov 7, 7:30 PM Men's · Duquesne vs Central State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Duquesne vs Washington State | ",
 "Upcoming Nov 14, 7:30 PM Men's · Duquesne vs Binghamton | ",
 "Upcoming Nov 18, 7:00 PM Men's · Duquesne vs Howard | ",
 "Upcoming Nov 22, 2:00 PM Men's · Duquesne vs Wyoming | ",
 "Upcoming Nov 24, 7:30 PM Men's · Duquesne vs High Point | ",
 "Upcoming Nov 28, 7:30 PM Men's · Duquesne vs South Carolina State | ",
 "Upcoming Dec 5 Men's · Duquesne vs Kansas City | ",
 "Upcoming Dec 9, 8:30 PM Men's · Duquesne vs Robert Morris | ",
 "Upcoming Dec 12, 7:30 PM Men's · Duquesne vs Canisius | ",
 "Upcoming Dec 15, 7:00 PM Men's · Duquesne vs Delaware | ",
 "Upcoming Dec 20, 2:00 PM Men's · Duquesne vs Niagara | ",
 "Upcoming Dec 27, 2:00 PM Men's · Duquesne vs Cleary | ",
 "Upcoming Dec 30, 7:00 PM Men's · Duquesne vs Davidson | ",
 "Upcoming Jan 2, 12:30 PM Men's · Duquesne at VCU | ",
 "Upcoming Jan 6, 7:00 PM Men's · Duquesne vs Rhode Island | ",
 "Upcoming Jan 9, 2:00 PM Men's · Duquesne at Loyola Chicago | ",
 "Upcoming Jan 16, 7:00 PM Men's · Duquesne vs Fordham | ",
 "Upcoming Jan 20, 7:00 PM Men's · Duquesne at Richmond | ",
 "Upcoming Jan 23, 1:00 PM Men's · Duquesne at Rhode Island | ",
 "Upcoming Jan 26, 7:00 PM Men's · Duquesne vs Dayton | ",
 "Upcoming Jan 30, 2:00 PM Men's · Duquesne vs St. Bonaventure | ",
 "Upcoming Feb 3, 7:00 PM Men's · Duquesne at George Washington | ",
 "Upcoming Feb 6, 2:00 PM Men's · Duquesne vs Loyola Chicago | ",
 "Upcoming Feb 10, 7:00 PM Men's · Duquesne at La Salle | ",
 "Upcoming Feb 13 Men's · Duquesne at Dayton | ",
 "Upcoming Feb 20, 12:30 PM Men's · Duquesne vs George Mason | ",
 "Upcoming Feb 24, 7:00 PM Men's · Duquesne vs Saint Joseph's | ",
 "Upcoming Feb 27, 2:00 PM Men's · Duquesne at St. Bonaventure | ",
 "Upcoming Mar 3, 7:00 PM Men's · Duquesne vs Saint Louis | ",
 "Upcoming Mar 6, 2:00 PM Men's · Duquesne at Davidson | ",
 "Upcoming Mar 11 Men's · Duquesne at Atlantic 10 Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Duquesne at Tennessee | ",
 "Upcoming Nov 8, 2:00 PM Women's · Duquesne vs Clarion | ",
 "Upcoming Nov 11, 6:00 PM Women's · Duquesne vs Marist | ",
 "Upcoming Nov 14, 1:00 PM Women's · Duquesne at Kent State | ",
 "Upcoming Nov 16, 6:00 PM Women's · Duquesne vs Robert Morris | ",
 "Upcoming Nov 21, 1:00 PM Women's · Duquesne vs Stony Brook | ",
 "Upcoming Nov 23, 6:00 PM Women's · Duquesne vs Canisius | ",
 "Upcoming Nov 24, 6:00 PM Women's · Duquesne vs Niagara | ",
 "Upcoming Nov 29, 2:00 PM Women's · Duquesne vs West Liberty | ",
 "Upcoming Dec 2, 6:00 PM Women's · Duquesne at George Washington | ",
 "Upcoming Dec 6, 12:00 PM Women's · Duquesne at Buffalo | ",
 "Upcoming Dec 9, 6:00 PM Women's · Duquesne vs Eastern Michigan | ",
 "Upcoming Dec 13, 2:00 PM Women's · Duquesne vs Western Michigan | ",
 "Upcoming Dec 17, 6:00 PM Women's · Duquesne at Akron | ",
 "Upcoming Dec 20, 12:00 PM Women's · Duquesne at Pitt | ",
 "Upcoming Dec 30, 6:00 PM Women's · Duquesne at Richmond | ",
 "Upcoming Jan 2, 2:00 PM Women's · Duquesne vs VCU | ",
 "Upcoming Jan 6, 7:00 PM Women's · Duquesne at Loyola Chicago | ",
 "Upcoming Jan 9, 2:00 PM Women's · Duquesne vs Fordham | ",
 "Upcoming Jan 13, 6:00 PM Women's · Duquesne vs Saint Joseph's | ",
 "Upcoming Jan 16 Women's · Duquesne at Saint Louis | ",
 "Upcoming Jan 20, 6:00 PM Women's · Duquesne vs Richmond | ",
 "Upcoming Jan 24, 11:00 AM Women's · Duquesne vs St. Bonaventure | ",
 "Upcoming Jan 27, 7:00 PM Women's · Duquesne at George Mason | ",
 "Upcoming Jan 31, 2:00 PM Women's · Duquesne vs Dayton | ",
 "Upcoming Feb 3, 6:30 PM Women's · Duquesne at La Salle | ",
 "Upcoming Feb 6, 2:00 PM Women's · Duquesne at VCU | ",
 "Upcoming Feb 10, 11:00 AM Women's · Duquesne vs Davidson | ",
 "Upcoming Feb 13, 2:00 PM Women's · Duquesne vs Rhode Island | ",
 "Upcoming Feb 20, 1:00 PM Women's · Duquesne at Dayton | ",
 "Upcoming Feb 24, 6:00 PM Women's · Duquesne at St. Bonaventure | ",
 "Upcoming Feb 27, 2:00 PM Women's · Duquesne vs Loyola Chicago | ",
 "Upcoming Mar 3 Women's · Duquesne at Atlantic 10 Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Duquesne at SFU Father Bede Invitational | 1st (of 5)",
 "Final Sep 11 Women's · Duquesne at RMU Colonial Invitational | 10th (of 11)",
 "Final Sep 18 Women's · Duquesne at National Catholic Invitational | 6th (of 15)",
 "Final Oct 3 Women's · Duquesne at Swags Louisville Cross Country Classic | 11th (of 24)",
 "Final Oct 10 Women's · Duquesne at CMU Invitational | Completed",
 "Final Oct 16 Women's · Duquesne at Panorama Farms Invitational | 13 (of 16)",
 "Upcoming Oct 31, 10:00 AM Women's · Duquesne at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 12:00 PM Women's · Duquesne at NCAA Mid-Atlantic Regional Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Duquesne at SFU Father Bede Invitational | 1st (of 5)",
 "Final Sep 11 Men's · Duquesne at RMU Colonial Invitational | Completed",
 "Final Sep 18 Men's · Duquesne at National Catholic Invitational | 4th (of 16)",
 "Final Oct 3 Men's · Duquesne at Swags Louisville Cross Country Classic | 11th (of 24)",
 "Final Oct 10 Men's · Duquesne at CMU Invitational | 17th (of 23)",
 "Final Oct 16 Men's · Duquesne at Panorama Farms Invitational | 10th (of 14)",
 "Upcoming Oct 31, 11:00 AM Men's · Duquesne at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 1:00 PM Men's · Duquesne at NCAA Mid-Atlantic Regional Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Duquesne at Air Force | L, 0-34",
 "Final Sep 12 Duquesne at Youngstown State | L, 13-70",
 "Final Sep 19 Duquesne at Washington State | L, 7-48",
 "Final Sep 26 Duquesne vs Rio Grande (Ohio) | W, 53-0",
 "Final Oct 10 Duquesne vs LIU | L, 14-17",
 "Final Oct 17 Duquesne at Stonehill | W, 14-7",
 "Upcoming Oct 24, 12:00 PM Duquesne vs Wagner | ",
 "Upcoming Oct 31, 12:00 PM Duquesne at New Haven | ",
 "Upcoming Nov 7, 12:00 PM Duquesne vs Robert Morris | ",
 "Upcoming Nov 14, 12:00 PM Duquesne vs Mercyhurst | ",
 "Upcoming Nov 21, 12:00 PM Duquesne at Central Connecticut State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Duquesne at Nittany Lion Invitational | 17th of 18",
 "Final Sep 11 Duquesne at Bucknell Fall Invitational | T7th of 16",
 "Final Sep 28 Duquesne at Golf Galaxy Collegiate | 2nd of 7",
 "Upcoming Oct 26 Duquesne at Lehigh Invitational | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Feb 14, 1:00 PM Duquesne vs Akron | ",
 "Upcoming Feb 20, 1:00 PM Duquesne vs Butler | ",
 "Upcoming Feb 24, 1:00 PM Duquesne vs Robert Morris | ",
 "Upcoming Feb 28 Duquesne at Kent State | ",
 "Upcoming Mar 3 Duquesne at Mount St. Mary's | ",
 "Upcoming Mar 6, 12:00 PM Duquesne at Youngstown State | ",
 "Upcoming Mar 9, 1:00 PM Duquesne vs Mercyhurst | ",
 "Upcoming Mar 13 Duquesne at Rhode Island | ",
 "Upcoming Mar 20, 1:00 PM Duquesne vs George Washington | ",
 "Upcoming Mar 24, 1:00 PM Duquesne vs St. Bonaventure | ",
 "Upcoming Mar 27, 12:00 PM Duquesne at Davidson | ",
 "Upcoming Apr 3 Duquesne at Richmond | ",
 "Upcoming Apr 10, 1:00 PM Duquesne vs VCU | ",
 "Upcoming Apr 17, 12:00 PM Duquesne at La Salle | ",
 "Upcoming Apr 24, 1:00 PM Duquesne vs Saint Joseph's | ",
 "Upcoming May 1, 12:00 PM Duquesne at George Mason | ",
 "Upcoming May 6 Duquesne at Atlantic 10 Tournament | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 31 Duquesne at Head of the Occoquan | ",
 "Upcoming Nov 7 Duquesne vs West Virginia | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Duquesne at Eastern Michigan | L, 1-3",
 "Final Aug 20 Women's · Duquesne at Cleveland State | W, 3-0",
 "Final Aug 23 Women's · Duquesne at West Virginia | L, 0-2",
 "Final Aug 27 Women's · Duquesne vs Akron | W, 2-0",
 "Final Aug 30 Women's · Duquesne vs Kent State | W, 1-0",
 "Final Sep 3 Women's · Duquesne vs Toledo | L, 0-1",
 "Final Sep 10 Women's · Duquesne at Youngstown State | T, 1-1",
 "Final Sep 13 Women's · Duquesne vs Ohio | L, 1-2",
 "Final Sep 19 Women's · Duquesne vs Rhode Island | W, 2-1",
 "Final Sep 24 Women's · Duquesne at Richmond | T, 1-1",
 "Final Sep 27 Women's · Duquesne at VCU | W, 2-1",
 "Final Oct 4 Women's · Duquesne vs George Washington | T, 0-0",
 "Final Oct 8 Women's · Duquesne vs Dayton | L, 1-3",
 "Final Oct 11 Women's · Duquesne at George Mason | L, 0-1",
 "Final Oct 18 Women's · Duquesne at Loyola Chicago | L, 0-2",
 "Today Oct 22, 7:00 PM Women's · Duquesne vs Davidson | ",
 "Upcoming Oct 25, 1:00 PM Women's · Duquesne vs Saint Louis | ",
 "Upcoming Oct 31 Women's · Duquesne at La Salle | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Duquesne vs Lafayette | T, 0-0",
 "Final Aug 23 Men's · Duquesne vs Bowling Green | W, 3-0",
 "Final Aug 27 Men's · Duquesne vs Mount St. Mary's | W, 2-0",
 "Final Aug 30 Men's · Duquesne at Robert Morris | T, 1-1",
 "Final Sep 5 Men's · Duquesne at Detroit Mercy | W, 2-1",
 "Final Sep 19 Men's · Duquesne vs Rhode Island | W, 1-0",
 "Final Sep 22 Men's · Duquesne at West Virginia | L, 0-1",
 "Final Sep 26 Men's · Duquesne at Saint Louis | L, 0-1",
 "Final Oct 3 Men's · Duquesne at George Mason | W, 2-1",
 "Final Oct 10 Men's · Duquesne vs Dayton | W, 3-1",
 "Final Oct 13 Men's · Duquesne at Pitt | L, 1-2",
 "Final Oct 17 Men's · Duquesne vs Davidson | W, 3-0",
 "Final Oct 21 Men's · Duquesne at St. Bonaventure | W, 4-0",
 "Upcoming Oct 24, 7:00 PM Men's · Duquesne vs VCU | ",
 "Upcoming Oct 28, 7:00 PM Men's · Duquesne at Penn State | ",
 "Upcoming Oct 31, 5:00 PM Men's · Duquesne at La Salle | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 19 Women's · Duquesne vs Red & Blue Meet | Completed",
 "Final Oct 3 Women's · Duquesne at CMU Relays | Completed",
 "Final Oct 9 Women's · Duquesne at Richmond Invitational | Completed",
 "Final Oct 10 Women's · Duquesne at Richmond | W, 168-131",
 "Final Oct 10 Women's · Duquesne vs George Mason | W, 204-93",
 "Final Oct 10 Women's · Duquesne vs Davidson | W, 213-85",
 "Final Oct 17 Women's · Duquesne at Clarion Diving Invite | Completed",
 "Upcoming Nov 6, 4:00 PM Women's · Duquesne at St. Bonaventure | ",
 "Upcoming Nov 20 Women's · Duquesne at TYR ‘85 Invite | ",
 "Upcoming Dec 2 Women's · Duquesne at Toyota US Open | ",
 "Upcoming Dec 10 Women's · Duquesne at Speedo Winter Junior Nationals | ",
 "Upcoming Dec 28 Women's · Duquesne at Winter Training Camp | ",
 "Upcoming Dec 29 Women's · Duquesne at Winter Training Camp (Diving) | ",
 "Upcoming Jan 8 Women's · Duquesne at UB Diving Invite | ",
 "Upcoming Jan 8, 5:00 PM Women's · Duquesne vs Buffalo | ",
 "Upcoming Jan 22, 4:00 PM Women's · Duquesne at Western PA Invite | ",
 "Upcoming Jan 23, 11:00 AM Women's · Duquesne at West Virginia | ",
 "Upcoming Jan 23, 11:00 AM Women's · Duquesne vs Villanova | ",
 "Upcoming Jan 29, 6:00 PM Women's · Duquesne vs Marshall | ",
 "Upcoming Feb 17 Women's · Duquesne at Atlantic 10 Championships | ",
 "Upcoming Mar 8 Women's · Duquesne at NCAA Diving Zones | ",
 "Upcoming Mar 11 Women's · Duquesne at National Invitational Championships | ",
 "Upcoming Mar 17 Women's · Duquesne at NCAA Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 5 Women's · Duquesne at Brad Hanes Invitational | Completed",
 "Final Oct 2 Women's · Duquesne at A-10 Masters | Completed",
 "Final Oct 2 Women's · Duquesne at Martha Thorn Invitational | Completed",
 "Final Oct 15 Women's · Duquesne at ITA Championships | Completed",
 "Upcoming Oct 23 Women's · Duquesne at West Virginia Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 5 Men's · Duquesne at Brad Hanes Invitational | Completed",
 "Final Sep 12 Men's · Duquesne at YSU Invitational | Completed",
 "Final Sep 25 Men's · Duquesne at CMU Invite | Completed",
 "Final Oct 2 Men's · Duquesne at A-10 Masters | Completed",
 "Upcoming Oct 30 Men's · Duquesne at Viking Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · Duquesne at YSU IceBreaker | ",
 "Upcoming Jan 15 Women's · Duquesne at YSU Collegiate Invite | ",
 "Upcoming Jan 23 Women's · Duquesne at Ashland Collegiate Invitational | ",
 "Upcoming Jan 26 Women's · Duquesne at Penn State National Open | ",
 "Upcoming Feb 6 Women's · Duquesne at Penn State Sykes & Sabock Challenge | ",
 "Upcoming Feb 12 Women's · Duquesne at YSU Last Chance | ",
 "Upcoming Feb 26 Women's · Duquesne at Atlantic 10 Indoor Championships | ",
 "Upcoming Mar 19 Women's · Duquesne at 49er Classic | ",
 "Upcoming Mar 26 Women's · Duquesne at Carnegie Mellon | ",
 "Upcoming Apr 2 Women's · Duquesne at Dalton Ebanks Invitational | ",
 "Upcoming Apr 7 Women's · Duquesne at Duke Invitational | ",
 "Upcoming Apr 23 Women's · Duquesne at Penn Relays | ",
 "Upcoming Apr 30 Women's · Duquesne at Jesse Owens Classic | ",
 "Upcoming May 14 Women's · Duquesne at Atlantic 10 Outdoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Mar 19 Men's · Duquesne at 49er Classic | ",
 "Upcoming Mar 26 Men's · Duquesne at CMU Invitational | ",
 "Upcoming Apr 2 Men's · Duquesne at Dalton Ebanks Invitational | ",
 "Upcoming Apr 7 Men's · Duquesne at Duke Invitational | ",
 "Upcoming Apr 23 Men's · Duquesne at Penn Relays | ",
 "Upcoming Apr 30 Men's · Duquesne at Jesse Owens Classic | ",
 "Upcoming May 14 Men's · Duquesne at Atlantic 10 Outdoor Championships | "
]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Aug 30 Duquesne at Duquesne Cup | 2nd",
 "Final Sep 4 Duquesne at ETSU Buccaneer Collegiate Cup | Completed",
 "Final Sep 19 Duquesne at Duquesne Invitational | 2nd (of 10)",
 "Final Oct 4 Duquesne at Navy Collegiate Cup | 2nd (of 10)",
 "Final Oct 17 Duquesne at Women's Collegiate Triathlon East Regional Championship | 3rd",
 "Upcoming Nov 8 Duquesne at Women's Collegiate Triathlon National Championships | ",
 "Upcoming Mar 6 Duquesne at Clermont Draft Legal Challenge | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Duquesne vs Canisius | W, 3-0",
 "Final Aug 28 Duquesne at Youngstown State | W, 3-1",
 "Final Aug 29 Duquesne vs Mercyhurst | W, 3-0",
 "Final Sep 4 Duquesne vs Eastern Michigan | W, 3-0",
 "Final Sep 4 Duquesne vs Elon | W, 3-0",
 "Final Sep 5 Duquesne vs Robert Morris | W, 3-0",
 "Final Sep 11 Duquesne vs Northern Kentucky | L, 2-3",
 "Final Sep 11 Duquesne at College of Charleston | L, 0-3",
 "Final Sep 12 Duquesne vs Notre Dame | W, 3-2",
 "Final Sep 18 Duquesne vs UMES | W, 3-0",
 "Final Sep 19 Duquesne vs Siena | W, 3-0",
 "Final Sep 25 Duquesne vs Fordham | W, 3-2",
 "Final Sep 26 Duquesne vs Fordham | W, 3-1",
 "Final Oct 2 Duquesne at Saint Louis | L, 1-3",
 "Final Oct 3 Duquesne at Saint Louis | W, 3-2",
 "Final Oct 6 Duquesne at Dayton | L, 1-3",
 "Final Oct 9 Duquesne vs Loyola Chicago | L, 2-3",
 "Final Oct 10 Duquesne vs Loyola Chicago | L, 0-3",
 "Final Oct 16 Duquesne at Rhode Island | L, 2-3",
 "Final Oct 17 Duquesne at Rhode Island | W, 3-2",
 "Upcoming Oct 23, 6:00 PM Duquesne vs VCU | ",
 "Upcoming Oct 24, 2:00 PM Duquesne vs VCU | ",
 "Upcoming Oct 27, 5:00 PM Duquesne vs Dayton | ",
 "Upcoming Oct 31, 2:00 PM Duquesne at Davidson | ",
 "Upcoming Nov 1, 1:00 PM Duquesne at Davidson | ",
 "Upcoming Nov 6, 6:00 PM Duquesne vs George Washington | ",
 "Upcoming Nov 7, 2:00 PM Duquesne vs George Washington | ",
 "Upcoming Nov 13, 6:00 PM Duquesne at George Mason | ",
 "Upcoming Nov 14, 3:00 PM Duquesne at George Mason | ",
 "Upcoming Nov 20 Duquesne at Atlantic 10 Championships | "
]);
  ownRecapsOnly(v_acrobaticsandtumbling,"Acrobatics & Tumbling acrobatics-and-tumbling");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Duquesne module checks passed");
