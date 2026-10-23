import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {saintJosephsSchool} from '../src/schools/saint-josephs.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='saint-josephs');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,saintJosephsHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/saint-josephs-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit sjuhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['saint-josephs'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',saintJosephsSchool.scheduleUrls],['roster',saintJosephsSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('saint-josephs|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'sjuhawks.com',`${key} must stay on sjuhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://sjuhawks.com/sports/baseball/schedule"],"roster":["https://sjuhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://sjuhawks.com/sports/mens-basketball/schedule","https://sjuhawks.com/sports/womens-basketball/schedule"],"roster":["https://sjuhawks.com/sports/mens-basketball/roster","https://sjuhawks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://sjuhawks.com/sports/womens-cross-country/schedule","https://sjuhawks.com/sports/mens-cross-country/schedule"],"roster":["https://sjuhawks.com/sports/womens-cross-country/roster","https://sjuhawks.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://sjuhawks.com/sports/field-hockey/schedule"],"roster":["https://sjuhawks.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://sjuhawks.com/sports/womens-golf/schedule","https://sjuhawks.com/sports/mens-golf/schedule"],"roster":["https://sjuhawks.com/sports/womens-golf/roster","https://sjuhawks.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://sjuhawks.com/sports/womens-lacrosse/schedule","https://sjuhawks.com/sports/mens-lacrosse/schedule"],"roster":["https://sjuhawks.com/sports/womens-lacrosse/roster","https://sjuhawks.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://sjuhawks.com/sports/womens-rowing/schedule","https://sjuhawks.com/sports/mens-rowing/schedule"],"roster":["https://sjuhawks.com/sports/womens-rowing/roster","https://sjuhawks.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://sjuhawks.com/sports/womens-soccer/schedule","https://sjuhawks.com/sports/mens-soccer/schedule"],"roster":["https://sjuhawks.com/sports/womens-soccer/roster","https://sjuhawks.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://sjuhawks.com/sports/softball/schedule"],"roster":["https://sjuhawks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://sjuhawks.com/sports/womens-tennis/schedule","https://sjuhawks.com/sports/mens-tennis/schedule"],"roster":["https://sjuhawks.com/sports/womens-tennis/roster","https://sjuhawks.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://sjuhawks.com/sports/womens-track-and-field/schedule","https://sjuhawks.com/sports/mens-track-and-field/schedule"],"roster":["https://sjuhawks.com/sports/womens-track-and-field/roster","https://sjuhawks.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'saint-josephs|"+sport+"':"),`${sport} routes must live in the Saint Joseph's module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://sjuhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.saintJosephsHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=saint-josephs)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 25, 12:00 PM Saint Joseph's vs Navy | ",
 "Upcoming Nov 1, 1:00 PM Saint Joseph's at Rutgers | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 4, 7:00 PM Men's · Saint Joseph's vs Longwood | ",
 "Upcoming Nov 7, 4:00 PM Men's · Saint Joseph's vs Lafayette | ",
 "Upcoming Nov 11, 3:00 PM Men's · Saint Joseph's vs South Florida | ",
 "Upcoming Nov 14, 6:30 PM Men's · Saint Joseph's vs Penn | ",
 "Upcoming Nov 17, 7:00 PM Men's · Saint Joseph's vs Wagner | ",
 "Upcoming Nov 20, 7:00 PM Men's · Saint Joseph's at Drexel | ",
 "Upcoming Nov 25, 12:00 PM Men's · Saint Joseph's vs Penn State Abington | ",
 "Upcoming Nov 28, 5:00 PM Men's · Saint Joseph's at Monmouth | ",
 "Upcoming Dec 5 Men's · Saint Joseph's at Big 5 Classic | ",
 "Upcoming Dec 8, 7:00 PM Men's · Saint Joseph's vs Boston University | ",
 "Upcoming Dec 16, 7:00 PM Men's · Saint Joseph's vs UMES | ",
 "Upcoming Dec 19, 2:00 PM Men's · Saint Joseph's vs Coppin State | ",
 "Upcoming Dec 22, 7:00 PM Men's · Saint Joseph's vs Penn State | ",
 "Upcoming Dec 30, 7:00 PM Men's · Saint Joseph's vs Rhode Island | ",
 "Upcoming Jan 2, 4:00 PM Men's · Saint Joseph's at George Washington | ",
 "Upcoming Jan 6, 7:00 PM Men's · Saint Joseph's at St. Bonaventure | ",
 "Upcoming Jan 9, 4:30 PM Men's · Saint Joseph's vs George Mason | ",
 "Upcoming Jan 13, 7:00 PM Men's · Saint Joseph's at Fordham | ",
 "Upcoming Jan 18, 3:00 PM Men's · Saint Joseph's vs VCU | ",
 "Upcoming Jan 23, 8:00 PM Men's · Saint Joseph's vs Saint Louis | ",
 "Upcoming Jan 27, 7:00 PM Men's · Saint Joseph's at Davidson | ",
 "Upcoming Jan 30, 4:30 PM Men's · Saint Joseph's at George Mason | ",
 "Upcoming Feb 6, 12:30 PM Men's · Saint Joseph's vs La Salle | ",
 "Upcoming Feb 9, 7:00 PM Men's · Saint Joseph's vs Fordham | ",
 "Upcoming Feb 12, 7:00 PM Men's · Saint Joseph's at Saint Louis | ",
 "Upcoming Feb 16, 7:00 PM Men's · Saint Joseph's vs Loyola Chicago | ",
 "Upcoming Feb 19, 5:00 PM Men's · Saint Joseph's at Dayton | ",
 "Upcoming Feb 24, 7:00 PM Men's · Saint Joseph's at Duquesne | ",
 "Upcoming Feb 27, 2:30 PM Men's · Saint Joseph's vs Davidson | ",
 "Upcoming Mar 3, 7:00 PM Men's · Saint Joseph's vs Richmond | ",
 "Upcoming Mar 6, 4:00 PM Men's · Saint Joseph's at La Salle | ",
 "Upcoming Mar 10 Men's · Saint Joseph's at Atlantic 10 Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 7, 1:00 PM Women's · Saint Joseph's vs Kutztown | ",
 "Upcoming Nov 11, 6:30 PM Women's · Saint Joseph's at Cincinnati | ",
 "Upcoming Nov 15, 2:00 PM Women's · Saint Joseph's at Drexel | ",
 "Upcoming Nov 18, 7:00 PM Women's · Saint Joseph's vs Penn | ",
 "Upcoming Nov 22, 1:00 PM Women's · Saint Joseph's at Penn State | ",
 "Upcoming Nov 27, 1:30 PM Women's · Saint Joseph's vs USC | ",
 "Upcoming Nov 29, 11:00 AM Women's · Saint Joseph's vs Illinois | ",
 "Upcoming Dec 3, 7:00 PM Women's · Saint Joseph's vs Rhode Island | ",
 "Upcoming Dec 6 Women's · Saint Joseph's at Big 5 Classic | ",
 "Upcoming Dec 9, 11:00 AM Women's · Saint Joseph's vs Columbia | ",
 "Upcoming Dec 20, 12:00 PM Women's · Saint Joseph's vs Holy Cross | ",
 "Upcoming Dec 21, 1:00 PM Women's · Saint Joseph's vs Washington State/Liberty | ",
 "Upcoming Dec 30, 7:00 PM Women's · Saint Joseph's at Saint Louis | ",
 "Upcoming Jan 3, 2:00 PM Women's · Saint Joseph's vs George Washington | ",
 "Upcoming Jan 6, 7:00 PM Women's · Saint Joseph's vs La Salle | ",
 "Upcoming Jan 10, 2:00 PM Women's · Saint Joseph's at Richmond | ",
 "Upcoming Jan 13, 6:00 PM Women's · Saint Joseph's at Duquesne | ",
 "Upcoming Jan 17, 12:00 PM Women's · Saint Joseph's vs Davidson | ",
 "Upcoming Jan 20, 7:00 PM Women's · Saint Joseph's vs Fordham | ",
 "Upcoming Jan 23, 1:00 PM Women's · Saint Joseph's at Dayton | ",
 "Upcoming Jan 27, 6:00 PM Women's · Saint Joseph's at St. Bonaventure | ",
 "Upcoming Jan 30, 2:00 PM Women's · Saint Joseph's vs Loyola Chicago | ",
 "Upcoming Feb 6, 2:00 PM Women's · Saint Joseph's at La Salle | ",
 "Upcoming Feb 10, 7:00 PM Women's · Saint Joseph's vs St. Bonaventure | ",
 "Upcoming Feb 13, 2:00 PM Women's · Saint Joseph's at George Washington | ",
 "Upcoming Feb 17, 11:00 AM Women's · Saint Joseph's at VCU | ",
 "Upcoming Feb 21, 2:00 PM Women's · Saint Joseph's vs Richmond | ",
 "Upcoming Feb 24, 7:00 PM Women's · Saint Joseph's vs Saint Louis | ",
 "Upcoming Feb 27, 3:00 PM Women's · Saint Joseph's at George Mason | ",
 "Upcoming Mar 3 Women's · Saint Joseph's at Atlantic 10 Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Saint Joseph's at Lehigh Invitational | 2nd of 10",
 "Final Sep 11 Women's · Saint Joseph's at Harry Groves Spiked Shoe Invitational | 7th of 9",
 "Final Oct 2 Women's · Saint Joseph's at Paul Short Run | No Team Result",
 "Final Oct 16 Women's · Saint Joseph's at Princeton Fall Classic | 12th of 18",
 "Upcoming Oct 23, 4:30 PM Women's · Saint Joseph's at Haverford Invitational | ",
 "Upcoming Oct 31, 10:00 AM Women's · Saint Joseph's at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 12:00 PM Women's · Saint Joseph's at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21, 10:20 AM Women's · Saint Joseph's at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Saint Joseph's at Lehigh Invitational | 2nd of 9",
 "Final Sep 11 Men's · Saint Joseph's at Harry Groves Spiked Shoe Invitational | 4th of 8",
 "Final Oct 2 Men's · Saint Joseph's at Paul Short Run | 13th of 35",
 "Final Oct 16 Men's · Saint Joseph's at Princeton Fall Classic | 7th of 20",
 "Upcoming Oct 23, 5:00 PM Men's · Saint Joseph's at Haverford Invitational | ",
 "Upcoming Oct 31, 10:45 AM Men's · Saint Joseph's at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 1:00 PM Men's · Saint Joseph's at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21, 11:10 AM Men's · Saint Joseph's at NCAA Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Saint Joseph's vs New Hampshire | W, 2-1",
 "Final Aug 30 Saint Joseph's vs UConn | L, 1-4",
 "Final Sep 4 Saint Joseph's vs Liberty | L, 1-5",
 "Final Sep 6 Saint Joseph's at Drexel | L, 3-4",
 "Final Sep 11 Saint Joseph's at Lehigh | W, 3-0",
 "Final Sep 13 Saint Joseph's at Maryland | L, 0-5",
 "Final Sep 18 Saint Joseph's at Saint Louis | W, 2-1",
 "Final Sep 20 Saint Joseph's at Louisville | L, 0-2",
 "Final Sep 25 Saint Joseph's vs Richmond | W, 3-1",
 "Final Oct 2 Saint Joseph's at Davidson | W, 5-1",
 "Final Oct 4 Saint Joseph's at Duke | L, 1-2",
 "Final Oct 9 Saint Joseph's vs North Carolina | L, 0-8",
 "Final Oct 11 Saint Joseph's at Penn | L, 2-3",
 "Final Oct 16 Saint Joseph's vs Lock Haven | W, 11-0",
 "Final Oct 18 Saint Joseph's vs Villanova | W, 4-3",
 "Upcoming Oct 23, 3:00 PM Saint Joseph's at VCU | ",
 "Upcoming Oct 25, 12:00 PM Saint Joseph's at Princeton | ",
 "Upcoming Oct 30, 3:00 PM Saint Joseph's vs La Salle | ",
 "Upcoming Nov 5 Saint Joseph's at Atlantic 10 Championship | ",
 "Upcoming Nov 7, 12:00 PM Saint Joseph's at Atlantic 10 Championship | ",
 "Upcoming Nov 11 Saint Joseph's at NCAA Opening Round | ",
 "Upcoming Nov 13 Saint Joseph's at NCAA First Round | ",
 "Upcoming Nov 15 Saint Joseph's at NCAA Second Round | ",
 "Upcoming Nov 20 Saint Joseph's at NCAA Semifinals | ",
 "Upcoming Nov 22 Saint Joseph's at NCAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Saint Joseph's at Nittany Lion Invitational | Completed",
 "Final Sep 11 Women's · Saint Joseph's at Bucknell Invitational | Completed",
 "Final Sep 28 Women's · Saint Joseph's at Autumn Harvest | Completed",
 "Final Oct 18 Women's · Saint Joseph's at La Salle and Wagner | Completed",
 "Upcoming Oct 26, 8:00 AM Women's · Saint Joseph's at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Saint Joseph's at Alex Lagowitz Memorial | Completed",
 "Final Sep 19 Men's · Saint Joseph's at The Goat | Completed",
 "Final Oct 5 Men's · Saint Joseph's at Nemacolin Collegiate Invitational | Completed",
 "Upcoming Oct 25, 8:00 AM Men's · Saint Joseph's at ODU/OBX Intercollegiate | ",
 "Upcoming Oct 29, 8:00 AM Men's · Saint Joseph's at Big 5 Invitational | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Saint Joseph's at Head of the Schuylkill | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24 Men's · Saint Joseph's at Head of the Schuylkill | ",
 "Upcoming Nov 1 Men's · Saint Joseph's at Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Saint Joseph's vs Drexel | W, 3-2",
 "Final Aug 15 Women's · Saint Joseph's vs Hofstra | W, 3-1",
 "Final Aug 23 Women's · Saint Joseph's at Lafayette | T, 1-1",
 "Final Aug 30 Women's · Saint Joseph's at Bucknell | W, 1-0",
 "Final Sep 3 Women's · Saint Joseph's at Temple | W, 2-0",
 "Final Sep 6 Women's · Saint Joseph's vs Vermont | L, 1-2",
 "Final Sep 10 Women's · Saint Joseph's at Penn | L, 0-4",
 "Final Sep 13 Women's · Saint Joseph's vs Wagner | T, 0-0",
 "Final Sep 19 Women's · Saint Joseph's vs George Mason | T, 1-1",
 "Final Sep 24 Women's · Saint Joseph's at Davidson | T, 1-1",
 "Final Sep 27 Women's · Saint Joseph's at George Washington | W, 3-2",
 "Final Oct 3 Women's · Saint Joseph's vs VCU | W, 2-1",
 "Final Oct 8 Women's · Saint Joseph's at Saint Louis | L, 1-2",
 "Final Oct 11 Women's · Saint Joseph's vs Fordham | W, 2-0",
 "Final Oct 17 Women's · Saint Joseph's at Rhode Island | L, 1-4",
 "Today Oct 22, 7:00 PM Women's · Saint Joseph's vs St. Bonaventure | ",
 "Upcoming Oct 25, 1:00 PM Women's · Saint Joseph's vs Dayton | ",
 "Upcoming Nov 1, 1:30 PM Women's · Saint Joseph's at Loyola Chicago | ",
 "Upcoming Nov 6 Women's · Saint Joseph's at Atlantic 10 Championship | ",
 "Upcoming Nov 11 Women's · Saint Joseph's at Atlantic 10 Semifinals | ",
 "Upcoming Nov 15 Women's · Saint Joseph's at Atlantic 10 Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 23 Men's · Saint Joseph's vs NJIT | W, 1-0",
 "Final Aug 28 Men's · Saint Joseph's at Temple | T, 1-1",
 "Final Aug 31 Men's · Saint Joseph's at Mount St. Mary's | T, 1-1",
 "Final Sep 8 Men's · Saint Joseph's at Rider | T, 0-0",
 "Final Sep 12 Men's · Saint Joseph's vs LIU | W, 2-0",
 "Final Sep 15 Men's · Saint Joseph's vs Iona | W, 1-0",
 "Final Sep 19 Men's · Saint Joseph's vs George Mason | T, 2-2",
 "Final Sep 22 Men's · Saint Joseph's at Bucknell | L, 1-2",
 "Final Sep 29 Men's · Saint Joseph's at Rhode Island | L, 0-3",
 "Final Oct 3 Men's · Saint Joseph's at Saint Louis | L, 0-1",
 "Final Oct 7 Men's · Saint Joseph's vs La Salle | T, 2-2",
 "Final Oct 10 Men's · Saint Joseph's vs St. Bonaventure | L, 0-1",
 "Final Oct 17 Men's · Saint Joseph's vs Northeastern | W, 3-0",
 "Final Oct 20 Men's · Saint Joseph's at George Washington | W, 2-0",
 "Upcoming Oct 24, 2:00 PM Men's · Saint Joseph's vs Davidson | ",
 "Upcoming Oct 27, 7:00 PM Men's · Saint Joseph's vs Villanova | ",
 "Upcoming Oct 31, 5:00 PM Men's · Saint Joseph's at Fordham | ",
 "Upcoming Nov 7 Men's · Saint Joseph's at Atlantic 10 Quarterfinals | ",
 "Upcoming Nov 11 Men's · Saint Joseph's at Atlantic 10 Semifinals | ",
 "Upcoming Nov 15 Men's · Saint Joseph's at Atlantic 10 Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Saint Joseph's at Villanova/Delaware Invitational | Completed",
 "Final Sep 25 Women's · Saint Joseph's at Seton Hall | L, 1-6",
 "Final Oct 2 Women's · Saint Joseph's at Atlantic 10 Conference Masters | Completed",
 "Final Oct 9 Women's · Saint Joseph's at Cissie Leary Invitational | Completed",
 "Final Oct 15 Women's · Saint Joseph's at ITA Northeast Regionals | Completed",
 "Upcoming Oct 30 Women's · Saint Joseph's at Dragon Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Saint Joseph's at Haverford | Completed",
 "Final Oct 2 Men's · Saint Joseph's at Atlantic 10 Conference Masters | Completed",
 "Final Oct 2 Men's · Saint Joseph's at Saint Joseph's Invitational | Completed",
 "Final Oct 15 Men's · Saint Joseph's at ITA Northeast Regionals | Completed",
 "Upcoming Nov 6 Men's · Saint Joseph's at Dragon Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Saint Joseph's module checks passed");
