import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {cornellSchool} from '../src/schools/cornell.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='cornell');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,cornellHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cornell-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cornellbigred.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['cornell'];
assert.equal(sports.length,19);
for(const [name,map] of [['schedule',cornellSchool.scheduleUrls],['roster',cornellSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cornell|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cornellbigred.com',`${key} must stay on cornellbigred.com`);
  }
}
const parity={"Baseball":{"schedule":["https://cornellbigred.com/sports/baseball/schedule"],"roster":["https://cornellbigred.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://cornellbigred.com/sports/mens-basketball/schedule","https://cornellbigred.com/sports/womens-basketball/schedule"],"roster":["https://cornellbigred.com/sports/mens-basketball/roster","https://cornellbigred.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://cornellbigred.com/sports/womens-cross-country/schedule","https://cornellbigred.com/sports/mens-cross-country/schedule"],"roster":["https://cornellbigred.com/sports/womens-cross-country/roster","https://cornellbigred.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://cornellbigred.com/sports/equestrian/schedule"],"roster":["https://cornellbigred.com/sports/equestrian/roster"],"combined":false},"Fencing":{"schedule":["https://cornellbigred.com/sports/fencing/schedule"],"roster":["https://cornellbigred.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://cornellbigred.com/sports/field-hockey/schedule"],"roster":["https://cornellbigred.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://cornellbigred.com/sports/football/schedule"],"roster":["https://cornellbigred.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://cornellbigred.com/sports/mens-golf/schedule"],"roster":["https://cornellbigred.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://cornellbigred.com/sports/womens-gymnastics/schedule"],"roster":["https://cornellbigred.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://cornellbigred.com/sports/mens-ice-hockey/schedule","https://cornellbigred.com/sports/womens-ice-hockey/schedule"],"roster":["https://cornellbigred.com/sports/mens-ice-hockey/roster","https://cornellbigred.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://cornellbigred.com/sports/womens-lacrosse/schedule","https://cornellbigred.com/sports/mens-lacrosse/schedule"],"roster":["https://cornellbigred.com/sports/womens-lacrosse/roster","https://cornellbigred.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://cornellbigred.com/sports/womens-rowing/schedule","https://cornellbigred.com/sports/rowing/schedule","https://cornellbigred.com/sports/mens-rowing/schedule"],"roster":["https://cornellbigred.com/sports/womens-rowing/roster","https://cornellbigred.com/sports/rowing/roster","https://cornellbigred.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://cornellbigred.com/sports/womens-soccer/schedule","https://cornellbigred.com/sports/mens-soccer/schedule"],"roster":["https://cornellbigred.com/sports/womens-soccer/roster","https://cornellbigred.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://cornellbigred.com/sports/softball/schedule"],"roster":["https://cornellbigred.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://cornellbigred.com/sports/womens-swimming-and-diving/schedule","https://cornellbigred.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://cornellbigred.com/sports/womens-swimming-and-diving/roster","https://cornellbigred.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://cornellbigred.com/sports/womens-tennis/schedule","https://cornellbigred.com/sports/mens-tennis/schedule"],"roster":["https://cornellbigred.com/sports/womens-tennis/roster","https://cornellbigred.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://cornellbigred.com/sports/womens-track-and-field/schedule","https://cornellbigred.com/sports/mens-track-and-field/schedule"],"roster":["https://cornellbigred.com/sports/womens-track-and-field/roster","https://cornellbigred.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://cornellbigred.com/sports/womens-volleyball/schedule"],"roster":["https://cornellbigred.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://cornellbigred.com/sports/wrestling/schedule"],"roster":["https://cornellbigred.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'cornell|"+sport+"':"),`${sport} routes must live in the Cornell module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://cornellbigred.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.cornellHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=cornell)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · Cornell vs Pepperdine | ",
 "Upcoming Nov 5, 7:00 PM Men's · Cornell at Lehigh | ",
 "Upcoming Nov 8, 2:00 PM Men's · Cornell vs Keuka College | ",
 "Upcoming Nov 11, 7:00 PM Men's · Cornell at St. Bonaventure | ",
 "Upcoming Nov 14, 11:00 AM Men's · Cornell vs UNC Greensboro | ",
 "Upcoming Nov 18, 8:00 PM Men's · Cornell at Syracuse | ",
 "Upcoming Nov 21, 7:00 PM Men's · Cornell at Morgan State | ",
 "Upcoming Nov 24, 8:00 PM Men's · Cornell vs Bucknell | ",
 "Upcoming Nov 28, 7:00 PM Men's · Cornell vs St. Lawrence | ",
 "Upcoming Dec 2, 7:00 PM Men's · Cornell at LIU | ",
 "Upcoming Dec 5, 2:00 PM Men's · Cornell at Colgate | ",
 "Upcoming Dec 8, 7:00 PM Men's · Cornell vs University at Albany | ",
 "Upcoming Dec 21, 7:00 PM Men's · Cornell at Monmouth | ",
 "Upcoming Dec 28, 7:00 PM Men's · Cornell at Washington | ",
 "Upcoming Dec 31, 5:00 PM Men's · Cornell at Gonzaga | ",
 "Upcoming Jan 5, 7:00 PM Men's · Cornell at Columbia | ",
 "Upcoming Jan 9, 2:00 PM Men's · Cornell at Dartmouth College | ",
 "Upcoming Jan 15, 6:00 PM Men's · Cornell vs Brown | ",
 "Upcoming Jan 18, 6:30 PM Men's · Cornell vs Yale | ",
 "Upcoming Jan 23, 2:00 PM Men's · Cornell vs Harvard | ",
 "Upcoming Jan 29, 7:00 PM Men's · Cornell at Pennsylvania | ",
 "Upcoming Jan 30, 6:00 PM Men's · Cornell at Princeton | ",
 "Upcoming Feb 5, 6:00 PM Men's · Cornell vs Columbia | ",
 "Upcoming Feb 12, 6:00 PM Men's · Cornell vs Pennsylvania | ",
 "Upcoming Feb 13, 5:00 PM Men's · Cornell vs Princeton | ",
 "Upcoming Feb 20, 2:00 PM Men's · Cornell at Harvard | ",
 "Upcoming Feb 26, 7:00 PM Men's · Cornell at Brown | ",
 "Upcoming Feb 27, 7:00 PM Men's · Cornell at Yale | ",
 "Upcoming Mar 6, 2:00 PM Men's · Cornell vs Dartmouth College | ",
 "Upcoming Mar 12 Men's · Cornell at Ivy League Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Cornell at Connecticut | ",
 "Upcoming Nov 5, 7:00 PM Women's · Cornell vs Fredonia | ",
 "Upcoming Nov 8, 2:00 PM Women's · Cornell at Syracuse | ",
 "Upcoming Nov 13, 5:00 PM Women's · Cornell vs Canisius | ",
 "Upcoming Nov 18, 6:00 PM Women's · Cornell vs Mercyhurst | ",
 "Upcoming Nov 21, 2:00 PM Women's · Cornell at University at Albany | ",
 "Upcoming Nov 24, 6:00 PM Women's · Cornell vs Wagner College | ",
 "Upcoming Nov 28, 1:00 PM Women's · Cornell at Loyola University Maryland | ",
 "Upcoming Nov 30, 6:00 PM Women's · Cornell at Siena College | ",
 "Upcoming Dec 2, 6:00 PM Women's · Cornell at Niagara | ",
 "Upcoming Dec 6, 2:00 PM Women's · Cornell vs LeMoyne College | ",
 "Upcoming Dec 8, 11:00 AM Women's · Cornell vs St. Bonaventure | ",
 "Upcoming Dec 20, 1:00 PM Women's · Cornell at Monmouth | ",
 "Upcoming Dec 29, 6:00 PM Women's · Cornell at University at Buffalo | ",
 "Upcoming Jan 3, 1:00 PM Women's · Cornell vs Columbia | ",
 "Upcoming Jan 4, 3:00 PM Women's · Cornell vs New Paltz | ",
 "Upcoming Jan 9, 2:00 PM Women's · Cornell vs Dartmouth College | ",
 "Upcoming Jan 16, 2:00 PM Women's · Cornell at Yale | ",
 "Upcoming Jan 18, 1:00 PM Women's · Cornell at Brown | ",
 "Upcoming Jan 23, 4:00 PM Women's · Cornell at Harvard | ",
 "Upcoming Jan 29 Women's · Cornell vs Princeton | ",
 "Upcoming Jan 30 Women's · Cornell vs Pennsylvania | ",
 "Upcoming Feb 6 Women's · Cornell at Columbia | ",
 "Upcoming Feb 12, 7:00 PM Women's · Cornell at Princeton | ",
 "Upcoming Feb 13, 4:00 PM Women's · Cornell at Pennsylvania | ",
 "Upcoming Feb 20 Women's · Cornell vs Harvard | ",
 "Upcoming Feb 26 Women's · Cornell vs Yale | ",
 "Upcoming Feb 27 Women's · Cornell vs Brown | ",
 "Upcoming Mar 6, 2:00 PM Women's · Cornell at Dartmouth College | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Cornell at Panthers XC Invite | 1st · 33 pts",
 "Final Sep 11 Women's · Cornell at Ithaca College | 1st · 22 pts",
 "Final Sep 11 Women's · Cornell at SUNY Cortland | 1st · 22 pts",
 "Final Sep 26 Women's · Cornell at Princeton Meadows Challenge | 17th · 468 pts",
 "Final Oct 16 Women's · Cornell at Pre-National Invitational | 7th of 26, 224 points",
 "Today Oct 23, 5:00 PM Women's · Cornell at Syracuse | ",
 "Upcoming Oct 31, 12:00 PM Women's · Cornell at Ivy League Heptagonal Championships | ",
 "Upcoming Nov 13, 12:00 PM Women's · Cornell at NCAA Northeast Regional Championships | ",
 "Upcoming Nov 21, 12:00 PM Women's · Cornell at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Cornell at Panthers XC Invite | 1st · 18 pts",
 "Final Sep 11 Men's · Cornell at Ithaca College | 1st · 16 pts",
 "Final Sep 11 Men's · Cornell at SUNY Cortland | 1st · 16 pts",
 "Final Sep 26 Men's · Cornell at Princeton Meadows Challenge | 7th · 186 pts",
 "Final Oct 16 Men's · Cornell at Pre-National Invitational | 7th of 44, 246 points",
 "Today Oct 23, 5:00 PM Men's · Cornell at Syracuse | ",
 "Upcoming Oct 31, 12:00 PM Men's · Cornell at Ivy League Heptagonal Championships | ",
 "Upcoming Nov 13, 12:00 PM Men's · Cornell at NCAA Northeast Regional Championships | ",
 "Upcoming Nov 21, 12:00 PM Men's · Cornell at NCAA Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 24 Cornell at RIT Show I | ",
 "Upcoming Nov 1 Cornell vs Cornell Show I | ",
 "Upcoming Nov 14 Cornell at Nazareth Show I | ",
 "Upcoming Feb 14 Cornell at Alfred Show II | ",
 "Upcoming Feb 21 Cornell vs Cornell Show II | ",
 "Upcoming Mar 7 Cornell at Regional Championships | ",
 "Upcoming Apr 3 Cornell at Zone II Championships | ",
 "Upcoming Apr 18 Cornell vs Ivy Show | ",
 "Upcoming May 6 Cornell at IHSA Nationals | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Sep 4 Cornell vs La Salle | W, 5-0",
 "Final Sep 6 Cornell at Bucknell | L, 1-3",
 "Final Sep 7 Cornell at Lafayette College | L, 1-2",
 "Final Sep 11 Cornell vs Indiana | L, 1-2",
 "Final Sep 13 Cornell at Ohio State | L, 0-2",
 "Final Sep 18 Cornell vs Columbia | W, 3-2",
 "Final Sep 26 Cornell at Yale | W, 3-2",
 "Final Oct 2 Cornell vs Brown | W, 4-0",
 "Final Oct 4 Cornell at Colgate | W, 3-2",
 "Final Oct 9 Cornell at Harvard | L, 1-4",
 "Final Oct 11 Cornell vs University at Albany | L, 2-3",
 "Final Oct 16 Cornell vs Princeton | L, 1-2",
 "Final Oct 18 Cornell vs Connecticut | L, 0-2",
 "Today Oct 23, 3:00 PM Cornell at Dartmouth College | ",
 "Upcoming Oct 25, 12:00 PM Cornell at New Hampshire | ",
 "Upcoming Oct 31, 12:00 PM Cornell at Pennsylvania | ",
 "Upcoming Nov 6 Cornell at Ivy League Tournament Semifinal | ",
 "Upcoming Nov 8 Cornell at Ivy League Tournament Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 19 Cornell at Colgate | L, 7-20",
 "Final Sep 26 Cornell vs Yale | W, 38-25",
 "Final Oct 3 Cornell at Georgetown | W, 35-14",
 "Final Oct 10 Cornell vs Harvard | L, 29-41",
 "Final Oct 17 Cornell vs Lehigh | W, 48-38",
 "Upcoming Oct 24, 12:00 PM Cornell at Brown | ",
 "Upcoming Oct 31, 12:00 PM Cornell at Princeton | ",
 "Upcoming Nov 7, 1:00 PM Cornell vs Pennsylvania | ",
 "Upcoming Nov 14, 1:00 PM Cornell vs Dartmouth College | ",
 "Upcoming Nov 21, 12:00 PM Cornell at Columbia | ",
 "Upcoming Nov 28 Cornell at NCAA FCS Playoff | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Cornell at Alex Lagowitz Memorial | T9th of 14",
 "Final Sep 19 Cornell at Ryan T Lee Memorial Collegiate | 13th of 18",
 "Final Sep 25 Cornell at 48th Macdonald Cup | 10th of 11",
 "Final Oct 3 Cornell at Columbia Autumn Invitational | 3rd of 13",
 "Final Oct 12 Cornell at The Metropolis Intercollegiate | 12th of 12",
 "Upcoming Feb 15 Cornell at Wexford Intercollegiate | ",
 "Upcoming Feb 27 Cornell at In Good Standing Classic | ",
 "Upcoming Mar 27 Cornell at Cornell/Harvard/Yale Invitational | ",
 "Upcoming Apr 10 Cornell at Princeton Spring Invitational | ",
 "Upcoming Apr 17 Cornell at Columbia | ",
 "Upcoming Apr 23 Cornell at Ivy League Men's Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 17 Men's · Cornell vs Waterloo (Exhibition) | W, 4-1",
 "Upcoming Oct 30, 7:00 PM Men's · Cornell vs Sacred Heart | ",
 "Upcoming Oct 31, 7:00 PM Men's · Cornell vs Sacred Heart | ",
 "Upcoming Nov 6, 7:00 PM Men's · Cornell vs Quinnipiac | ",
 "Upcoming Nov 7, 7:00 PM Men's · Cornell vs Princeton | ",
 "Upcoming Nov 13, 7:00 PM Men's · Cornell at Brown | ",
 "Upcoming Nov 14, 7:00 PM Men's · Cornell at Yale | ",
 "Upcoming Nov 20, 7:00 PM Men's · Cornell vs Clarkson | ",
 "Upcoming Nov 21, 7:00 PM Men's · Cornell vs St. Lawrence | ",
 "Upcoming Nov 28, 12:00 PM Men's · Cornell vs Maine | ",
 "Upcoming Dec 4, 7:00 PM Men's · Cornell vs Boston University | ",
 "Upcoming Dec 5, 7:00 PM Men's · Cornell vs RIT | ",
 "Upcoming Dec 8, 7:00 PM Men's · Cornell vs Holy Cross | ",
 "Upcoming Jan 2, 4:00 PM Men's · Cornell at Nebraska Omaha | ",
 "Upcoming Jan 3, 2:00 PM Men's · Cornell at Nebraska Omaha | ",
 "Upcoming Jan 8, 7:00 PM Men's · Cornell at Union College | ",
 "Upcoming Jan 9, 4:00 PM Men's · Cornell at Rensselaer Polytechnic Institute | ",
 "Upcoming Jan 15, 7:00 PM Men's · Cornell at Princeton | ",
 "Upcoming Jan 16, 7:00 PM Men's · Cornell at Quinnipiac | ",
 "Upcoming Jan 22, 7:00 PM Men's · Cornell vs Harvard | ",
 "Upcoming Jan 23, 7:00 PM Men's · Cornell vs Dartmouth College | ",
 "Upcoming Jan 29, 7:00 PM Men's · Cornell vs Colgate | ",
 "Upcoming Jan 30, 7:00 PM Men's · Cornell at Colgate | ",
 "Upcoming Feb 5, 7:00 PM Men's · Cornell at St. Lawrence | ",
 "Upcoming Feb 6, 7:00 PM Men's · Cornell at Clarkson | ",
 "Upcoming Feb 12, 7:00 PM Men's · Cornell vs Yale | ",
 "Upcoming Feb 13, 7:00 PM Men's · Cornell vs Brown | ",
 "Upcoming Feb 19, 7:00 PM Men's · Cornell at Dartmouth College | ",
 "Upcoming Feb 20, 7:00 PM Men's · Cornell at Harvard | ",
 "Upcoming Feb 26, 7:00 PM Men's · Cornell vs Rensselaer Polytechnic Institute | ",
 "Upcoming Feb 27, 7:00 PM Men's · Cornell vs Union College | ",
 "Upcoming Mar 5 Men's · Cornell at ECAC Hockey Championship | ",
 "Upcoming Mar 12 Men's · Cornell at ECAC Hockey Championship | ",
 "Upcoming Mar 19 Men's · Cornell at ECAC Hockey Semifinals | ",
 "Upcoming Mar 20 Men's · Cornell at ECAC Hockey Championship Game | ",
 "Upcoming Mar 25 Men's · Cornell at Regional Semifinals | ",
 "Upcoming Mar 27 Men's · Cornell at Regional Finals | ",
 "Upcoming Apr 8 Men's · Cornell at National Semifinals | ",
 "Upcoming Apr 10 Men's · Cornell at National Championship | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 16 Women's · Cornell vs Vermont | W, 3-2",
 "Final Oct 17 Women's · Cornell vs Vermont | W, 1-0",
 "Today Oct 23, 6:00 PM Women's · Cornell at Boston College | ",
 "Upcoming Oct 24, 3:00 PM Women's · Cornell at Boston College | ",
 "Upcoming Oct 30, 3:00 PM Women's · Cornell vs Union College | ",
 "Upcoming Oct 31, 3:00 PM Women's · Cornell vs Rensselaer Polytechnic Institute | ",
 "Upcoming Nov 6, 6:00 PM Women's · Cornell at Quinnipiac | ",
 "Upcoming Nov 7, 6:00 PM Women's · Cornell at Princeton | ",
 "Upcoming Nov 13, 6:00 PM Women's · Cornell vs Harvard | ",
 "Upcoming Nov 14, 3:00 PM Women's · Cornell vs Dartmouth College | ",
 "Upcoming Nov 20, 3:00 PM Women's · Cornell vs Colgate | ",
 "Upcoming Nov 21, 3:00 PM Women's · Cornell at Colgate | ",
 "Upcoming Nov 28, 4:00 PM Women's · Cornell vs Northeastern | ",
 "Upcoming Nov 29, 2:00 PM Women's · Cornell vs Northeastern | ",
 "Upcoming Dec 4, 6:00 PM Women's · Cornell at Clarkson | ",
 "Upcoming Dec 5, 3:00 PM Women's · Cornell at St. Lawrence | ",
 "Upcoming Jan 1, 6:00 PM Women's · Cornell at Penn State | ",
 "Upcoming Jan 2, 3:00 PM Women's · Cornell at Penn State | ",
 "Upcoming Jan 8, 3:00 PM Women's · Cornell at Dartmouth College | ",
 "Upcoming Jan 9, 3:00 PM Women's · Cornell at Harvard | ",
 "Upcoming Jan 15, 6:00 PM Women's · Cornell vs Brown | ",
 "Upcoming Jan 16, 3:00 PM Women's · Cornell vs Yale | ",
 "Upcoming Jan 22, 3:00 PM Women's · Cornell vs St. Lawrence | ",
 "Upcoming Jan 23, 3:00 PM Women's · Cornell vs Clarkson | ",
 "Upcoming Jan 29, 3:00 PM Women's · Cornell at Rensselaer Polytechnic Institute | ",
 "Upcoming Jan 30, 3:00 PM Women's · Cornell at Union College | ",
 "Upcoming Feb 5, 6:00 PM Women's · Cornell vs Princeton | ",
 "Upcoming Feb 6, 3:00 PM Women's · Cornell vs Quinnipiac | ",
 "Upcoming Feb 12, 6:00 PM Women's · Cornell at Yale | ",
 "Upcoming Feb 13, 3:00 PM Women's · Cornell at Brown | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Oct 17 Women's · Cornell at Head of the Charles | 4th of 48",
 "Final Oct 18 Women's · Cornell at Head of the Charles | V8: 10th of 19",
 "Upcoming Oct 24, 1:00 PM Women's · Cornell at Head of the Fish | ",
 "Upcoming Nov 7, 8:00 AM Women's · Cornell vs Syracuse (Exhibition) | ",
 "Upcoming Mar 20 Women's · Cornell vs Duquesne (Exhibition) | ",
 "Upcoming Mar 27, 8:00 AM Women's · Cornell vs Boston University | ",
 "Upcoming Apr 10 Women's · Cornell vs Cooper River Regatta | ",
 "Upcoming Apr 17 Women's · Cornell vs Dartmouth College | ",
 "Upcoming Apr 24 Women's · Cornell at Brown | ",
 "Upcoming May 2 Women's · Cornell at Women's Sprints Championships | ",
 "Upcoming May 15 Women's · Cornell at Ivy League Championships | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 31 Men's Heavyweight · Cornell vs Dartmouth College & Syracuse | ",
 "Upcoming Mar 27 Men's Heavyweight · Cornell vs Drexel | ",
 "Upcoming Apr 3 Men's Heavyweight · Cornell vs Harvard | ",
 "Upcoming Apr 10 Men's Heavyweight · Cornell vs Boston University | ",
 "Upcoming Apr 17 Men's Heavyweight · Cornell at Goes Trophy | ",
 "Upcoming Apr 24 Men's Heavyweight · Cornell vs Carnegie Cup | ",
 "Upcoming Apr 30 Men's Heavyweight · Cornell vs Holy Cross | ",
 "Upcoming May 1 Men's Heavyweight · Cornell vs Oregon State | ",
 "Upcoming May 1 Men's Heavyweight · Cornell at Pennsylvania | ",
 "Upcoming May 16 Men's Heavyweight · Cornell at Eastern Sprints Championship | ",
 "Upcoming May 28 Men's Heavyweight · Cornell at IRA National Championship | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Nov 1 Men's Lightweight · Cornell at Princeton Chase | ",
 "Upcoming Apr 3, 8:00 AM Men's Lightweight · Cornell at NCLI Race | ",
 "Upcoming Apr 10, 8:00 AM Men's Lightweight · Cornell at Matthews/Leonard Cup | ",
 "Upcoming Apr 24, 8:00 AM Men's Lightweight · Cornell vs Baggaley Bowl | ",
 "Upcoming May 1, 8:00 AM Men's Lightweight · Cornell vs Geiger Cup | ",
 "Upcoming May 16, 8:00 AM Men's Lightweight · Cornell at Eastern Sprints Championships | ",
 "Upcoming May 30, 8:00 AM Men's Lightweight · Cornell at IRA National Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Women's · Cornell vs St. Bonaventure | W, 3-2",
 "Final Aug 23 Women's · Cornell vs Boston College | L, 1-3",
 "Final Aug 27 Women's · Cornell vs Lafayette College | W, 2-0",
 "Final Aug 30 Women's · Cornell vs Pittsburgh | L, 1-2",
 "Final Sep 3 Women's · Cornell at Colgate | T, 0-0",
 "Final Sep 6 Women's · Cornell at Kent State | T, 0-0",
 "Final Sep 10 Women's · Cornell at Army West Point | L, 0-1",
 "Final Sep 13 Women's · Cornell at Binghamton | W, 1-0",
 "Final Sep 26 Women's · Cornell vs Yale | W, 1-0",
 "Final Oct 3 Women's · Cornell at Harvard | L, 1-4",
 "Final Oct 10 Women's · Cornell at Columbia | L, 0-3",
 "Final Oct 13 Women's · Cornell vs Holy Cross | W, 6-1",
 "Final Oct 17 Women's · Cornell vs Princeton | L, 0-3",
 "Upcoming Oct 24, 12:00 PM Women's · Cornell vs Pennsylvania | ",
 "Upcoming Oct 31, 3:30 PM Women's · Cornell at Brown | ",
 "Upcoming Nov 7, 6:00 PM Women's · Cornell vs Dartmouth College | ",
 "Upcoming Nov 12 Women's · Cornell at Ivy League Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 29 Men's · Cornell at Marist | W, 3-0",
 "Final Sep 4 Men's · Cornell vs California Santa Barbara | W, 2-1",
 "Final Sep 8 Men's · Cornell at Akron | L, 2-3",
 "Final Sep 15 Men's · Cornell at Pittsburgh | L, 0-2",
 "Final Sep 19 Men's · Cornell at Western Michigan | W, 2-0",
 "Final Sep 22 Men's · Cornell vs Binghamton | W, 3-1",
 "Final Sep 26 Men's · Cornell vs Harvard | W, 4-1",
 "Final Oct 3 Men's · Cornell at Brown | W, 2-1",
 "Final Oct 10 Men's · Cornell vs Pennsylvania | W, 5-3",
 "Final Oct 13 Men's · Cornell at Colgate | L, 0-1",
 "Final Oct 17 Men's · Cornell at Princeton | W, 1-0",
 "Final Oct 20 Men's · Cornell at Bucknell | W, 6-1",
 "Upcoming Oct 24, 3:00 PM Men's · Cornell vs Dartmouth College | ",
 "Upcoming Oct 31, 5:00 PM Men's · Cornell at Yale | ",
 "Upcoming Nov 7, 3:00 PM Men's · Cornell vs Columbia | ",
 "Upcoming Nov 12 Men's · Cornell at Ivy League Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Nov 6, 5:00 PM Women's · Cornell vs Harvard | ",
 "Upcoming Nov 6, 5:00 PM Women's · Cornell vs Pennsylvania | ",
 "Upcoming Nov 13, 4:00 PM Women's · Cornell at Yale | ",
 "Upcoming Nov 13, 4:00 PM Women's · Cornell at Dartmouth College | ",
 "Upcoming Nov 20 Women's · Cornell at Western New York Invitational | ",
 "Upcoming Dec 3 Women's · Cornell at Zippy Invitational | ",
 "Upcoming Jan 9 Women's · Cornell at St. Bonaventure | ",
 "Upcoming Jan 16, 12:00 PM Women's · Cornell at Brown | ",
 "Upcoming Jan 16, 12:00 PM Women's · Cornell vs Princeton | ",
 "Upcoming Jan 30, 12:00 PM Women's · Cornell vs Columbia | ",
 "Upcoming Feb 17 Women's · Cornell at Ivy League Championship | ",
 "Upcoming Mar 8 Women's · Cornell at NCAA Zone Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Upcoming Nov 6 Men's · Cornell vs Pennsylvania | ",
 "Upcoming Nov 6 Men's · Cornell vs Harvard | ",
 "Upcoming Nov 13 Men's · Cornell at Dartmouth College | ",
 "Upcoming Nov 13 Men's · Cornell at Yale | ",
 "Upcoming Nov 20 Men's · Cornell at UB Invitational | ",
 "Upcoming Dec 3 Men's · Cornell at Zippy Invitational | ",
 "Upcoming Jan 9 Men's · Cornell at St. Bonaventure | ",
 "Upcoming Jan 16 Men's · Cornell at Brown | ",
 "Upcoming Jan 16 Men's · Cornell at Princeton | ",
 "Upcoming Jan 29 Men's · Cornell vs Columbia | ",
 "Upcoming Feb 5 Men's · Cornell at Boston University Invitational | ",
 "Upcoming Feb 24 Men's · Cornell at Ivy League Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Cornell at UD/Villanova Invite | Completed",
 "Final Oct 8 Women's · Cornell at ITA New England Regionals | Completed",
 "Today Oct 23 Women's · Cornell at West Virginia University UTR | ",
 "Today Oct 23 Women's · Cornell at Ivy League Championship | ",
 "Upcoming Nov 5 Women's · Cornell at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Cornell at ITA Sectionals | ",
 "Upcoming Nov 6 Women's · Cornell at UB Indoor Invite | ",
 "Upcoming Nov 17 Women's · Cornell at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Cornell at Chowderfest | Completed",
 "Final Sep 22 Men's · Cornell at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · Cornell at ITA New England Regionals | Completed",
 "Today Oct 23 Men's · Cornell at Ivy League Championship | ",
 "Upcoming Nov 5 Men's · Cornell at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Cornell at ITA Sectionals | ",
 "Upcoming Nov 16 Men's · Cornell at NCAA Individual Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Sep 4 Cornell vs Howard | W, 3-0",
 "Final Sep 5 Cornell vs University at Albany | L, 2-3",
 "Final Sep 5 Cornell vs Syracuse | L, 2-3",
 "Final Sep 11 Cornell at Binghamton | L, 2-3",
 "Final Sep 12 Cornell vs Temple | W, 3-2",
 "Final Sep 12 Cornell vs New Haven | W, 3-0",
 "Final Sep 18 Cornell vs Eastern Michigan | W, 3-1",
 "Final Sep 19 Cornell at Michigan | L, 0-3",
 "Final Sep 20 Cornell at Michigan | L, 0-3",
 "Final Sep 26 Cornell vs Columbia | W, 3-0",
 "Final Oct 2 Cornell at Pennsylvania | W, 3-0",
 "Final Oct 3 Cornell at Princeton | W, 3-0",
 "Final Oct 9 Cornell vs Dartmouth College | W, 3-0",
 "Final Oct 10 Cornell vs Harvard | W, 3-0",
 "Final Oct 16 Cornell at Brown | W, 3-1",
 "Final Oct 17 Cornell at Yale | L, 1-3",
 "Upcoming Oct 24, 6:00 PM Cornell at Columbia | ",
 "Upcoming Oct 30, 5:00 PM Cornell vs Princeton | ",
 "Upcoming Oct 31, 5:00 PM Cornell vs Pennsylvania | ",
 "Upcoming Nov 6, 6:00 PM Cornell vs Yale | ",
 "Upcoming Nov 7, 5:00 PM Cornell vs Brown | ",
 "Upcoming Nov 13, 6:00 PM Cornell at Harvard | ",
 "Upcoming Nov 14, 5:00 PM Cornell at Dartmouth College | ",
 "Upcoming Nov 20 Cornell at Ivy League Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 8, 9:00 AM Cornell at Journeymen Classic | ",
 "Upcoming Nov 22, 9:00 AM Cornell at Big Red Invitational | ",
 "Upcoming Dec 4 Cornell at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 20, 1:00 PM Cornell vs NC State | ",
 "Upcoming Dec 20, 3:00 PM Cornell vs Pittsburgh | ",
 "Upcoming Jan 2 Cornell at Soldier Salute Collegiate Wrestling Tournament | ",
 "Upcoming Jan 9, 6:30 PM Cornell vs Lehigh | ",
 "Upcoming Jan 16, 1:00 PM Cornell vs Bucknell | ",
 "Upcoming Jan 23, 9:00 AM Cornell at Bloomsburg Open | ",
 "Upcoming Jan 24, 10:00 AM Cornell at Brown | ",
 "Upcoming Jan 24, 2:30 PM Cornell at Harvard | ",
 "Upcoming Jan 30, 6:00 PM Cornell at Army West Point | ",
 "Upcoming Jan 31, 1:00 PM Cornell at Columbia | ",
 "Upcoming Feb 6, 1:00 PM Cornell vs Princeton | ",
 "Upcoming Feb 7, 1:00 PM Cornell vs Pennsylvania | ",
 "Upcoming Feb 13, 1:00 PM Cornell at Northern Iowa | ",
 "Upcoming Feb 14, 1:00 PM Cornell at Iowa State | ",
 "Upcoming Feb 19, 7:00 PM Cornell at Binghamton | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Cornell module checks passed");
