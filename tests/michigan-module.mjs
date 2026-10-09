import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {michiganSchool,MICHIGAN_TFRRS_TEAMS as michiganTfrrs} from '../src/schools/michigan.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='michigan');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,michiganHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,verifiedInstagram};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/michigan-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mgoblue.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['michigan'];
assert.equal(sports.length,18);
for(const [name,map] of [['schedule',michiganSchool.scheduleUrls],['roster',michiganSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('michigan|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mgoblue.com',`${key} must stay on mgoblue.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mgoblue.com/sports/baseball/schedule"],"roster":["https://mgoblue.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mgoblue.com/sports/mens-basketball/schedule","https://mgoblue.com/sports/womens-basketball/schedule"],"roster":["https://mgoblue.com/sports/mens-basketball/roster","https://mgoblue.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://mgoblue.com/sports/womens-cross-country/schedule","https://mgoblue.com/sports/mens-cross-country/schedule"],"roster":["https://mgoblue.com/sports/womens-cross-country/roster","https://mgoblue.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://mgoblue.com/sports/field-hockey/schedule"],"roster":["https://mgoblue.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://mgoblue.com/sports/football/schedule"],"roster":["https://mgoblue.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://mgoblue.com/sports/womens-golf/schedule","https://mgoblue.com/sports/mens-golf/schedule"],"roster":["https://mgoblue.com/sports/womens-golf/roster","https://mgoblue.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://mgoblue.com/sports/womens-gymnastics/schedule","https://mgoblue.com/sports/mens-gymnastics/schedule"],"roster":["https://mgoblue.com/sports/womens-gymnastics/roster","https://mgoblue.com/sports/mens-gymnastics/roster"],"combined":true},"Hockey":{"schedule":["https://mgoblue.com/sports/mens-ice-hockey/schedule"],"roster":["https://mgoblue.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://mgoblue.com/sports/womens-lacrosse/schedule","https://mgoblue.com/sports/mens-lacrosse/schedule"],"roster":["https://mgoblue.com/sports/womens-lacrosse/roster","https://mgoblue.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://mgoblue.com/sports/womens-rowing/schedule"],"roster":["https://mgoblue.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://mgoblue.com/sports/womens-soccer/schedule","https://mgoblue.com/sports/mens-soccer/schedule"],"roster":["https://mgoblue.com/sports/womens-soccer/roster","https://mgoblue.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://mgoblue.com/sports/softball/schedule"],"roster":["https://mgoblue.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://mgoblue.com/sports/womens-swimming-and-diving/schedule","https://mgoblue.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://mgoblue.com/sports/womens-swimming-and-diving/roster","https://mgoblue.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://mgoblue.com/sports/womens-tennis/schedule","https://mgoblue.com/sports/mens-tennis/schedule"],"roster":["https://mgoblue.com/sports/womens-tennis/roster","https://mgoblue.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://mgoblue.com/sports/womens-track-and-field/schedule","https://mgoblue.com/sports/mens-track-and-field/schedule"],"roster":["https://mgoblue.com/sports/womens-track-and-field/roster","https://mgoblue.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://mgoblue.com/sports/womens-volleyball/schedule"],"roster":["https://mgoblue.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://mgoblue.com/sports/womens-water-polo/schedule"],"roster":["https://mgoblue.com/sports/womens-water-polo/roster"],"combined":false},"Wrestling":{"schedule":["https://mgoblue.com/sports/wrestling/schedule"],"roster":["https://mgoblue.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'michigan|"+sport+"':"),`${sport} routes must live in the Michigan module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://mgoblue.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.michiganHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];

// BEGIN generated (scripts/generate-module-tests.mjs --school=michigan)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 10, 12:00 PM Michigan vs Eastern Michigan | ",
 "Upcoming Oct 11, 1:00 PM Michigan vs Ohio | ",
 "Upcoming Oct 16, 5:00 PM Michigan vs Western Michigan | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 11, 2:00 PM Men's · Michigan vs Eastern Michigan (Exhibition) | ",
 "Upcoming Oct 16, 7:00 PM Men's · Michigan vs Oregon State (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Men's · Michigan vs Houston (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Michigan vs Oakland | ",
 "Upcoming Nov 6, 8:00 PM Men's · Michigan vs UConn | ",
 "Upcoming Nov 11, 7:00 PM Men's · Michigan vs Marquette | ",
 "Upcoming Nov 15, 2:00 PM Men's · Michigan vs William & Mary | ",
 "Upcoming Nov 21, 7:00 PM Men's · Michigan vs Villanova | ",
 "Upcoming Nov 24, 2:30 PM Men's · Michigan vs Creighton | ",
 "Upcoming Nov 26, 12:30 PM Men's · Michigan vs TCU/Miami | ",
 "Upcoming Nov 27 Men's · Michigan vs Players Era Semifinal/Placement Game | ",
 "Upcoming Nov 28, 7:30 PM Men's · Michigan vs Players Era Championship Game (if qualified) | ",
 "Upcoming Dec 1, 7:00 PM Men's · Michigan vs Mississippi Valley State | ",
 "Upcoming Dec 5, 12:00 PM Men's · Michigan vs Louisville | ",
 "Upcoming Dec 9, 6:30 PM Men's · Michigan at Rutgers | ",
 "Upcoming Dec 12, 4:30 PM Men's · Michigan vs Northwestern | ",
 "Upcoming Dec 21, 4:00 PM Men's · Michigan vs Detroit Mercy | ",
 "Upcoming Dec 30, 12:00 PM Men's · Michigan vs Toledo | ",
 "Upcoming Jan 2, 2:00 PM Men's · Michigan vs Washington | ",
 "Upcoming Jan 5, 6:00 PM Men's · Michigan at Nebraska | ",
 "Upcoming Jan 8, 8:00 PM Men's · Michigan vs Purdue | ",
 "Upcoming Jan 12, 6:30 PM Men's · Michigan vs Minnesota | ",
 "Upcoming Jan 16, 1:00 PM Men's · Michigan at Indiana | ",
 "Upcoming Jan 19, 7:00 PM Men's · Michigan vs Oregon | ",
 "Upcoming Jan 23, 12:00 PM Men's · Michigan at USC | ",
 "Upcoming Jan 26, 7:00 PM Men's · Michigan at UCLA | ",
 "Upcoming Jan 30 Men's · Michigan vs Ohio State | ",
 "Upcoming Feb 6 Men's · Michigan at Wisconsin | ",
 "Upcoming Feb 9, 7:00 PM Men's · Michigan vs Illinois | ",
 "Upcoming Feb 13, 1:00 PM Men's · Michigan vs Michigan State | ",
 "Upcoming Feb 16, 7:00 PM Men's · Michigan at Minnesota | ",
 "Upcoming Feb 20, 1:00 PM Men's · Michigan vs Iowa | ",
 "Upcoming Feb 23, 6:00 PM Men's · Michigan at Penn State | ",
 "Upcoming Feb 26, 8:00 PM Men's · Michigan at Michigan State | ",
 "Upcoming Mar 4, 6:30 PM Men's · Michigan vs Maryland | ",
 "Upcoming Mar 7, 2:15 PM Men's · Michigan at Ohio State | ",
 "Upcoming Mar 9 Men's · Michigan at Big Ten Tournament (First Round) | ",
 "Upcoming Mar 10 Men's · Michigan at Big Ten Tournament (Second Round) | ",
 "Upcoming Mar 11 Men's · Michigan at Big Ten Tournament (Third Round) | ",
 "Upcoming Mar 12 Men's · Michigan at Big Ten Tournament (Quarterfinals) | ",
 "Upcoming Mar 13 Men's · Michigan at Big Ten Tournament (Semifinals) | ",
 "Upcoming Mar 14 Men's · Michigan at Big Ten Tournament (Championship) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Women's · Michigan vs Rochester Christian (Exhibition) | ",
 "Upcoming Nov 5, 6:30 PM Women's · Michigan vs UConn | ",
 "Upcoming Nov 8 Women's · Michigan vs Wright State | ",
 "Upcoming Nov 12, 7:00 PM Women's · Michigan at Columbia | ",
 "Upcoming Nov 16, 6:30 PM Women's · Michigan at Central Michigan | ",
 "Upcoming Nov 18, 7:00 PM Women's · Michigan vs Niagara | ",
 "Upcoming Nov 23, 4:00 PM Women's · Michigan vs Miami | ",
 "Upcoming Nov 25, 1:30 PM Women's · Michigan vs Toledo | ",
 "Upcoming Nov 30, 7:00 PM Women's · Michigan vs Southern Indiana | ",
 "Upcoming Dec 5, 2:00 PM Women's · Michigan vs Oklahoma | ",
 "Upcoming Dec 7, 7:00 PM Women's · Michigan vs Kent State | ",
 "Upcoming Dec 11, 7:00 PM Women's · Michigan at Maryland | ",
 "Upcoming Dec 21, 12:00 PM Women's · Michigan vs Detroit Mercy | ",
 "Upcoming Dec 29, 6:00 PM Women's · Michigan vs Michigan State | ",
 "Upcoming Jan 1, 12:00 PM Women's · Michigan at Purdue | ",
 "Upcoming Jan 7, 7:00 PM Women's · Michigan vs Ohio State | ",
 "Upcoming Jan 10, 12:00 PM Women's · Michigan vs Oregon | ",
 "Upcoming Jan 13, 6:00 PM Women's · Michigan at Nebraska | ",
 "Upcoming Jan 17, 4:00 PM Women's · Michigan vs Rutgers | ",
 "Upcoming Jan 20, 7:00 PM Women's · Michigan at Illinois | ",
 "Upcoming Jan 23, 5:00 PM Women's · Michigan vs Washington | ",
 "Upcoming Jan 27, 7:00 PM Women's · Michigan vs Penn State | ",
 "Upcoming Jan 30, 2:30 PM Women's · Michigan at USC | ",
 "Upcoming Feb 2, 7:00 PM Women's · Michigan at UCLA | ",
 "Upcoming Feb 7, 12:00 PM Women's · Michigan vs Iowa | ",
 "Upcoming Feb 12 Women's · Michigan vs Northwestern | ",
 "Upcoming Feb 17 Women's · Michigan at Minnesota | ",
 "Upcoming Feb 20, 12:00 PM Women's · Michigan at Wisconsin | ",
 "Upcoming Feb 24, 6:30 PM Women's · Michigan vs Indiana | ",
 "Upcoming Feb 28, 1:00 PM Women's · Michigan at Michigan State | ",
 "Upcoming Mar 3 Women's · Michigan at Big Ten Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Michigan at Michigan Open | Canceled",
 "Final Sep 11 Women's · Michigan at Spartan Invitational | 3rd of 24",
 "Final Sep 25 Women's · Michigan at Sean Earl Loyola Lakefront Invite | 9th of 17",
 "Upcoming Oct 16, 11:00 AM Women's · Michigan at Pre-National Invitational | ",
 "Upcoming Oct 23 Women's · Michigan at EMU Fall Classic | ",
 "Upcoming Oct 30 Women's · Michigan at Big Ten Championships | ",
 "Upcoming Nov 13 Women's · Michigan at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Michigan at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 25 Men's · Michigan at Sean Earl Loyola Lakefront Invite | 2nd of 17",
 "Today Oct 9, 11:10 AM Men's · Michigan at Nuttycombe Invitational | ",
 "Upcoming Oct 16, 11:00 AM Men's · Michigan at Pre-National Invitational | ",
 "Upcoming Oct 23 Men's · Michigan at EMU Fall Classic | ",
 "Upcoming Oct 30 Men's · Michigan at Big Ten Championships | ",
 "Upcoming Nov 13 Men's · Michigan at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Michigan at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Michigan vs North Carolina | W, 2-1",
 "Final Aug 30 Michigan at Wake Forest | L, 0-2",
 "Final Sep 4 Michigan vs Kent State | W, 4-0",
 "Final Sep 6 Michigan vs Vermont | W, 4-1",
 "Final Sep 11 Michigan vs California | L, 0-1",
 "Final Sep 18 Michigan at Michigan State | W, 2-1",
 "Final Sep 20 Michigan at Central Michigan | W, 5-0",
 "Final Sep 26 Michigan at Indiana | L, 0-1",
 "Final Oct 2 Michigan vs Iowa | L, 1-2",
 "Final Oct 4 Michigan vs Northwestern | L, 1-6",
 "Today Oct 9, 4:00 PM Michigan vs Maryland | ",
 "Upcoming Oct 11, 11:00 AM Michigan vs Monmouth | ",
 "Upcoming Oct 16, 3:00 PM Michigan at Rutgers | ",
 "Upcoming Oct 18, 12:00 PM Michigan at Penn State | ",
 "Upcoming Oct 25, 1:00 PM Michigan at Miami (Ohio) | ",
 "Upcoming Oct 30, 5:00 PM Michigan vs Ohio State | ",
 "Upcoming Nov 4 Michigan at Big Ten Tournament | ",
 "Upcoming Nov 13 Michigan at NCAA Tournament First/Second Rounds | ",
 "Upcoming Nov 20 Michigan at NCAA Tournament Final Four | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Michigan vs Western Michigan | W, 13-12",
 "Final Sep 12 Michigan vs Oklahoma | W, 17-10",
 "Final Sep 19 Michigan vs UTEP | W, 52-17",
 "Final Sep 26 Michigan vs Iowa | L, 19-20",
 "Final Oct 3 Michigan at Minnesota | L, 14-20",
 "Upcoming Oct 17, 3:30 PM Michigan vs Penn State | ",
 "Upcoming Oct 24 Michigan vs Indiana | ",
 "Upcoming Oct 31 Michigan at Rutgers | ",
 "Upcoming Nov 7 Michigan vs Michigan State | ",
 "Upcoming Nov 14 Michigan at Oregon | ",
 "Upcoming Nov 21 Michigan vs UCLA | ",
 "Upcoming Nov 28, 12:00 PM Michigan at Ohio State | ",
 "Upcoming Dec 5 Michigan at Big Ten Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Michigan at Badger Invitational | 6th of 16",
 "Final Sep 21 Women's · Michigan at Canadian Collegiate Invitational | 8th of 11",
 "Final Oct 5 Women's · Michigan at Barbara Nicklaus Cup | Match play: 1-2",
 "Upcoming Oct 16 Women's · Michigan at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · Michigan at Pat Bradley Invitational | ",
 "Upcoming Feb 14 Women's · Michigan at Spartan Sun Coast Invitational | ",
 "Upcoming Feb 26 Women's · Michigan at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 9 Women's · Michigan at The Alamo Invitational | ",
 "Upcoming Mar 25 Women's · Michigan at PING ASU Invitational | ",
 "Upcoming Apr 12 Women's · Michigan at Terps Invitational | ",
 "Upcoming Apr 23 Women's · Michigan at Big Ten Championships | ",
 "Upcoming May 10 Women's · Michigan at NCAA Regional | ",
 "Upcoming May 21 Women's · Michigan at NCAA Finals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · Michigan at Virtues Intercollegiate | 1st of 12",
 "Final Sep 6 Men's · Michigan at Island Resort Intercollegiate | 1st of 12",
 "Final Sep 13 Men's · Michigan at Inverness Intercollegiate | 14th of 18",
 "Final Sep 28 Men's · Michigan at Bryan Bros Collegiate | T11th of 16",
 "Final Oct 5 Men's · Michigan at Barbara Nicklaus Cup | Match play: 0-2-1",
 "Upcoming Oct 12 Men's · Michigan at The Bryson | ",
 "Upcoming Oct 19 Men's · Michigan at Abilene Christian Invitational | ",
 "Upcoming Mar 15 Men's · Michigan at Pauma Valley Collegiate | ",
 "Upcoming Mar 20 Men's · Michigan at The Collegiate Players Championship | ",
 "Upcoming Apr 17 Men's · Michigan at Rutherford Intercollegiate | ",
 "Upcoming Apr 30 Men's · Michigan at Big Ten Championships | ",
 "Upcoming May 17 Men's · Michigan at NCAA Regional | ",
 "Upcoming May 28 Men's · Michigan at NCAA Finals | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Michigan vs Bowling Green | W, 7-2",
 "Final Oct 3 Michigan at Bowling Green | W, 4-3",
 "Today Oct 9, 7:00 PM Michigan vs Alaska Anchorage | ",
 "Upcoming Oct 10, 7:00 PM Michigan vs Alaska Anchorage | ",
 "Upcoming Oct 16, 7:00 PM Michigan at Denver | ",
 "Upcoming Oct 17, 6:00 PM Michigan at Denver | ",
 "Upcoming Oct 23, 7:00 PM Michigan vs Western Michigan | ",
 "Upcoming Oct 31 Michigan at Ohio State | ",
 "Upcoming Nov 1 Michigan at Ohio State | ",
 "Upcoming Nov 13 Michigan vs Penn State | ",
 "Upcoming Nov 14 Michigan vs Penn State | ",
 "Upcoming Nov 20 Michigan vs Michigan State | ",
 "Upcoming Nov 21 Michigan at Michigan State | ",
 "Upcoming Nov 27, 7:00 PM Michigan vs Ferris State | ",
 "Upcoming Nov 28, 7:00 PM Michigan vs Ferris State | ",
 "Upcoming Dec 4 Michigan vs Wisconsin | ",
 "Upcoming Dec 5 Michigan vs Wisconsin | ",
 "Upcoming Jan 2 Michigan at USNTDP (Exhibition) | ",
 "Upcoming Jan 8 Michigan at Minnesota | ",
 "Upcoming Jan 9 Michigan at Minnesota | ",
 "Upcoming Jan 15 Michigan at Notre Dame | ",
 "Upcoming Jan 16 Michigan at Notre Dame | ",
 "Upcoming Jan 22 Michigan vs Ohio State | ",
 "Upcoming Jan 23 Michigan vs Ohio State | ",
 "Upcoming Jan 30 Michigan vs Western Michigan | ",
 "Upcoming Feb 5 Michigan at Michigan State | ",
 "Upcoming Feb 6 Michigan vs Michigan State | ",
 "Upcoming Feb 12 Michigan vs Notre Dame | ",
 "Upcoming Feb 13 Michigan vs Notre Dame | ",
 "Upcoming Feb 18 Michigan at Wisconsin | ",
 "Upcoming Feb 20 Michigan vs Wisconsin | ",
 "Upcoming Feb 26 Michigan vs Minnesota | ",
 "Upcoming Feb 27 Michigan vs Minnesota | ",
 "Upcoming Mar 4 Michigan at Penn State | ",
 "Upcoming Mar 5 Michigan at Penn State | ",
 "Upcoming Mar 10 Michigan vs Big Ten Quarterfinal | ",
 "Upcoming Mar 13 Michigan at Big Ten Semifinal | ",
 "Upcoming Mar 19 Michigan at Big Ten Championship | ",
 "Upcoming Mar 25 Michigan at NCAA Regional | ",
 "Upcoming Apr 8 Michigan at NCAA Frozen Four | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Michigan at Utah Valley | T, 1-1",
 "Final Aug 16 Women's · Michigan at Utah State | T, 2-2",
 "Final Aug 27 Women's · Michigan vs Notre Dame | T, 1-1",
 "Final Aug 30 Women's · Michigan at Bowling Green | W, 1-0",
 "Final Sep 3 Women's · Michigan vs Georgia Southern | W, 3-0",
 "Final Sep 10 Women's · Michigan at Northwestern | L, 0-1",
 "Final Sep 13 Women's · Michigan at Illinois | W, 2-0",
 "Final Sep 20 Women's · Michigan at Michigan State | W, 3-1",
 "Final Sep 24 Women's · Michigan vs Washington | L, 0-1",
 "Final Sep 27 Women's · Michigan vs Nebraska | L, 0-1",
 "Final Oct 4 Women's · Michigan at Indiana | W, 3-2",
 "Final Oct 8 Women's · Michigan at Purdue | L, 5-6",
 "Upcoming Oct 11, 1:00 PM Women's · Michigan vs Wisconsin | ",
 "Upcoming Oct 16, 6:00 PM Women's · Michigan at Oregon | ",
 "Upcoming Oct 22, 7:00 PM Women's · Michigan vs Maryland | ",
 "Upcoming Oct 25, 1:00 PM Women's · Michigan vs Penn State | ",
 "Upcoming Oct 30, 7:00 PM Women's · Michigan vs Ohio State | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Michigan vs LMU | T, 0-0",
 "Final Aug 27 Men's · Michigan vs Niagara | W, 3-1",
 "Final Aug 30 Men's · Michigan vs SIUE | W, 3-2",
 "Final Sep 6 Men's · Michigan at Notre Dame | L, 1-2",
 "Final Sep 11 Men's · Michigan vs Indiana | L, 0-1",
 "Final Sep 18 Men's · Michigan at UCLA | T, 1-1",
 "Final Sep 25 Men's · Michigan at Northwestern | L, 0-1",
 "Final Sep 29 Men's · Michigan vs Oakland | W, 2-1",
 "Final Oct 4 Men's · Michigan vs Portland | L, 1-2",
 "Today Oct 9, 7:00 PM Men's · Michigan vs Penn State | ",
 "Upcoming Oct 13, 7:00 PM Men's · Michigan at Michigan State | ",
 "Upcoming Oct 16, 7:00 PM Men's · Michigan vs Maryland | ",
 "Upcoming Oct 23, 7:00 PM Men's · Michigan at Rutgers | ",
 "Upcoming Oct 26, 7:00 PM Men's · Michigan vs Washington | ",
 "Upcoming Oct 30, 7:00 PM Men's · Michigan at Wisconsin | ",
 "Upcoming Nov 4, 8:00 PM Men's · Michigan vs Ohio State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 9, 5:00 PM Michigan vs Bowling Green (Exhibition) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 24 Women's · Michigan vs CSL Match #1 | Completed",
 "Final Sep 25 Women's · Michigan at TEAM BE BETTER Invitational (Exhibition) | Completed",
 "Today Oct 9, 2:00 PM Women's · Michigan vs Pittsburgh | ",
 "Today Oct 9, 6:30 PM Women's · Michigan vs CSL Match #4 | ",
 "Upcoming Nov 5, 5:30 PM Women's · Michigan vs CSL Wild Card | ",
 "Upcoming Nov 6, 4:00 PM Women's · Michigan at Oakland | ",
 "Upcoming Nov 6, 5:30 PM Women's · Michigan at CSL Championship | ",
 "Upcoming Nov 17, 10:00 AM Women's · Michigan at Ohio State Fall Invitational | ",
 "Upcoming Jan 8, 12:00 PM Women's · Michigan at Indiana | ",
 "Upcoming Jan 16, 12:00 PM Women's · Michigan vs Ohio State | ",
 "Upcoming Jan 30, 12:00 PM Women's · Michigan vs Denison | ",
 "Upcoming Feb 17, 10:00 AM Women's · Michigan at Big Ten Championships | ",
 "Upcoming Mar 17, 10:00 AM Women's · Michigan at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 24 Men's · Michigan vs CSL Match #1 | Completed",
 "Final Sep 25 Men's · Michigan at TEAM BE BETTER Invitational (Exhibition) | Completed",
 "Today Oct 9, 2:00 PM Men's · Michigan vs Pittsburgh | ",
 "Today Oct 9, 6:30 PM Men's · Michigan vs CSL Match #4 | ",
 "Upcoming Nov 5, 5:30 PM Men's · Michigan vs CSL Wild Card | ",
 "Upcoming Nov 6, 4:00 PM Men's · Michigan at Oakland | ",
 "Upcoming Nov 6, 5:30 PM Men's · Michigan at CSL Championship | ",
 "Upcoming Nov 17, 10:00 AM Men's · Michigan at Ohio State Fall Invitational | ",
 "Upcoming Jan 8, 12:00 PM Men's · Michigan at Indiana | ",
 "Upcoming Jan 16, 12:00 PM Men's · Michigan vs Ohio State | ",
 "Upcoming Jan 30, 12:00 PM Men's · Michigan vs Denison | ",
 "Upcoming Feb 24, 10:00 AM Men's · Michigan at Big Ten Championships | ",
 "Upcoming Mar 24, 10:00 AM Men's · Michigan at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Michigan at Kitty Harrison Invitational | Completed",
 "Final Sep 21 Women's · Michigan at ITA All-American Championships | Completed",
 "Today Oct 8, 10:30 AM Women's · Michigan at ITA Midwest Regional Championships | ",
 "Upcoming Oct 23 Women's · Michigan at Rome Invite | ",
 "Upcoming Oct 30 Women's · Michigan at ASU Thunderbird Invitational | ",
 "Upcoming Nov 5 Women's · Michigan at ITA Sectional Championships | ",
 "Upcoming Nov 5 Women's · Michigan at ITA Conference Masters | ",
 "Upcoming Nov 6 Women's · Michigan at MSU Invite | ",
 "Upcoming Nov 17 Women's · Michigan at NCAA Singles and Doubles Championships | ",
 "Upcoming Jan 15 Women's · Michigan at Michigan Invitational | ",
 "Upcoming Jan 22, 12:00 PM Women's · Michigan vs Western Michigan | ",
 "Upcoming Jan 22, 5:00 PM Women's · Michigan vs Oakland | ",
 "Upcoming Jan 24, 12:00 PM Women's · Michigan vs Notre Dame | ",
 "Upcoming Jan 29, 4:00 PM Women's · Michigan at Virginia | ",
 "Upcoming Feb 5 Women's · Michigan at ITA National Team Indoor Championships | ",
 "Upcoming Feb 19, 3:00 PM Women's · Michigan at NC State | ",
 "Upcoming Feb 21, 12:00 PM Women's · Michigan at Duke | ",
 "Upcoming Mar 6, 12:00 PM Women's · Michigan vs Penn State | ",
 "Upcoming Mar 7, 12:00 PM Women's · Michigan vs Ohio State | ",
 "Upcoming Mar 12, 5:00 PM Women's · Michigan at Iowa | ",
 "Upcoming Mar 14, 11:00 AM Women's · Michigan at Nebraska | ",
 "Upcoming Mar 20, 12:00 PM Women's · Michigan vs Northwestern | ",
 "Upcoming Mar 26, 12:00 PM Women's · Michigan at USC | ",
 "Upcoming Mar 27, 9:30 AM Women's · Michigan at UCLA | ",
 "Upcoming Apr 3, 1:00 PM Women's · Michigan vs Michigan State | ",
 "Upcoming Apr 10, 12:00 PM Women's · Michigan vs Washington | ",
 "Upcoming Apr 11, 11:00 AM Women's · Michigan vs Oregon | ",
 "Upcoming Apr 16, 12:00 PM Women's · Michigan at Rutgers | ",
 "Upcoming Apr 18, 11:00 AM Women's · Michigan at Maryland | ",
 "Upcoming Apr 22 Women's · Michigan at Big Ten Tournament | ",
 "Upcoming May 8 Women's · Michigan at NCAA Tournament First Round | ",
 "Upcoming May 9 Women's · Michigan at NCAA Tournament Second Round | ",
 "Upcoming May 15 Women's · Michigan at NCAA Tournament Third Round | ",
 "Upcoming May 20 Women's · Michigan at NCAA Tournament Quarterfinals | ",
 "Upcoming May 22 Women's · Michigan at NCAA Tournament Semifinals | ",
 "Upcoming May 23 Women's · Michigan at NCAA Tournament Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Michigan at Fighting Irish Invitational | Completed",
 "Final Oct 2 Men's · Michigan at Hope College Invite | Completed",
 "Upcoming Oct 14 Men's · Michigan at ITA Midwest Regional Championships | ",
 "Upcoming Oct 30 Men's · Michigan at Big Ten Individuals | ",
 "Upcoming Nov 5 Men's · Michigan at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Michigan at ITA Conference Masters | ",
 "Upcoming Nov 17 Men's · Michigan at NCAA Individual Championships | ",
 "Upcoming Jan 8 Men's · Michigan at Florida Hidden Duals | ",
 "Upcoming Jan 16, 6:00 PM Men's · Michigan vs NC State | ",
 "Upcoming Jan 23 Men's · Michigan at Princeton | ",
 "Upcoming Jan 24 Men's · Michigan at Wake Forest/BYU | ",
 "Upcoming Jan 31, 10:00 AM Men's · Michigan vs Toledo | ",
 "Upcoming Feb 12 Men's · Michigan at ITA National Indoor Championship | ",
 "Upcoming Feb 19, 5:00 PM Men's · Michigan at Columbia | ",
 "Upcoming Feb 21, 12:00 PM Men's · Michigan at Princeton | ",
 "Upcoming Mar 3, 5:00 PM Men's · Michigan vs Western Michigan | ",
 "Upcoming Mar 12, 3:00 PM Men's · Michigan at USC | ",
 "Upcoming Mar 13, 2:00 PM Men's · Michigan at UCLA | ",
 "Upcoming Mar 19, 5:00 PM Men's · Michigan vs Washington | ",
 "Upcoming Mar 21, 11:00 AM Men's · Michigan vs Oregon | ",
 "Upcoming Mar 26, 6:00 PM Men's · Michigan at Wisconsin | ",
 "Upcoming Mar 28, 12:00 PM Men's · Michigan at Nebraska | ",
 "Upcoming Apr 3, 12:00 PM Men's · Michigan at Michigan State | ",
 "Upcoming Apr 9, 5:00 PM Men's · Michigan vs Northwestern | ",
 "Upcoming Apr 11, 2:30 PM Men's · Michigan vs Illinois | ",
 "Upcoming Apr 16, 5:00 PM Men's · Michigan vs Penn State | ",
 "Upcoming Apr 18, 12:00 PM Men's · Michigan vs Ohio State | ",
 "Upcoming Apr 23, 4:00 PM Men's · Michigan at Indiana | ",
 "Upcoming Apr 25, 12:00 PM Men's · Michigan at Purdue | ",
 "Upcoming Apr 29 Men's · Michigan at Big Ten Tournament | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Michigan vs LIU | W, 3-0",
 "Final Aug 29 Michigan vs Miami | W, 3-0",
 "Final Sep 1 Michigan vs South Carolina | L, 2-3",
 "Final Sep 2 Michigan vs LSU | W, 3-1",
 "Final Sep 5 Michigan vs Cincinnati | W, 3-0",
 "Final Sep 6 Michigan at Valparaiso | W, 3-1",
 "Final Sep 11 Michigan vs TCU | L, 1-3",
 "Final Sep 12 Michigan at South Florida | W, 3-0",
 "Final Sep 17 Michigan vs Eastern Michigan | W, 3-1",
 "Final Sep 19 Michigan vs Cornell | W, 3-0",
 "Final Sep 20 Michigan vs Cornell | W, 3-0",
 "Final Sep 25 Michigan vs Penn State | L, 1-3",
 "Final Sep 27 Michigan vs Washington | L, 0-3",
 "Final Oct 2 Michigan at USC | W, 3-1",
 "Final Oct 3 Michigan at UCLA | L, 0-3",
 "Today Oct 9, 7:00 PM Michigan vs Iowa | ",
 "Upcoming Oct 10, 7:00 PM Michigan vs Oregon | ",
 "Upcoming Oct 16, 7:00 PM Michigan at Minnesota | ",
 "Upcoming Oct 18, 1:00 PM Michigan at Illinois | ",
 "Upcoming Oct 22, 7:00 PM Michigan at Northwestern | ",
 "Upcoming Oct 25, 12:00 PM Michigan at Wisconsin | ",
 "Upcoming Oct 30, 6:30 PM Michigan vs Nebraska | ",
 "Upcoming Oct 31, 7:00 PM Michigan vs Indiana | ",
 "Upcoming Nov 5, 7:00 PM Michigan at Rutgers | ",
 "Upcoming Nov 7, 7:00 PM Michigan at Maryland | ",
 "Upcoming Nov 11, 7:00 PM Michigan vs Ohio State | ",
 "Upcoming Nov 14, 6:00 PM Michigan vs Purdue | ",
 "Upcoming Nov 17, 6:00 PM Michigan at Michigan State | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Nov 13, 1:30 PM Michigan at Harvard (Exhibition) | ",
 "Upcoming Nov 14, 10:00 AM Michigan vs Siena University (Exhibition) | ",
 "Upcoming Nov 14, 4:00 PM Michigan vs Team Canada (Exhibition) | ",
 "Upcoming Nov 15, 9:00 AM Michigan vs Harvard (Exhibition) | ",
 "Upcoming Nov 15, 11:00 AM Michigan at Brown (Exhibition) | ",
 "Upcoming Dec 4, 7:30 AM Michigan vs Indiana (Exhibition) (Game 1) | ",
 "Upcoming Dec 4, 12:00 PM Michigan vs Indiana (Exhibition) (Game 2) | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 2:00 PM Michigan at VMI | ",
 "Upcoming Nov 7, 9:30 AM Michigan at Michigan State Open | ",
 "Upcoming Nov 13, 7:00 PM Michigan vs Columbia | ",
 "Upcoming Nov 20, 7:00 PM Michigan at Rider | ",
 "Upcoming Nov 22 Michigan at Northern Colorado | ",
 "Upcoming Dec 4, 9:00 PM Michigan at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Jan 9 Michigan vs Wisconsin | ",
 "Upcoming Jan 15 Michigan at Penn State | ",
 "Upcoming Jan 17 Michigan at Michigan State | ",
 "Upcoming Jan 22 Michigan vs Purdue | ",
 "Upcoming Jan 29 Michigan at Illinois | ",
 "Upcoming Feb 5 Michigan vs Ohio State | ",
 "Upcoming Feb 7 Michigan at Indiana | ",
 "Upcoming Feb 14 Michigan vs Minnesota | ",
 "Upcoming Feb 21 Michigan vs Central Michigan | ",
 "Upcoming Mar 6 Michigan at Big Ten Championships | ",
 "Upcoming Mar 18 Michigan at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
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
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
// A sport's /archives page and the saved stories it lists.
const fromArchive=slug=>{
  const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://mgoblue.com/sports/${slug}/archives`,listing);
  for(const path of new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){
    const [,y,m,d,slug]=path.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/(.+)/);
    try{recapFixtures.set(`https://mgoblue.com${path}`,fixture(`story-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text??null]).flat();
const finals=(sport,slug)=>parse(sport,slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline]);

// Golf: the place in the field from the page; match play (the Barbara
// Nicklaus Cup) reads as its matches.
assert.deepEqual(finals('Golf','womens-golf'),[["Badger Invitational","6th of 16"],["Canadian Collegiate Invitational","8th of 11"],["Barbara Nicklaus Cup","Match play: 1-2"]]);
assert.deepEqual(finals('Golf','mens-golf'),[["Virtues Intercollegiate","1st of 12"],["Island Resort Intercollegiate","1st of 12"],["Inverness Intercollegiate","14th of 18"],["Bryan Bros Collegiate","T11th of 16"],["Barbara Nicklaus Cup","Match play: 0-2-1"]]);

// Cross Country: one page per team (womens-/mens-cross-country, not the
// generic cross-country page, which is the site's event list); each team's
// event keeps its own TFRRS race.
{
  fromTfrrs(michiganTfrrs);
  const xc=[...parse('Cross Country','womens-cross-country'),...parse('Cross Country','mens-cross-country')].filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.team_label,e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Women's","Michigan Open","Canceled",false],["Women's","Spartan Invitational","Women's team: 3rd · 81 pts",true],["Women's","Sean Earl Loyola Lakefront Invite","Women's team: 9th · 217 pts",true],["Men's","Sean Earl Loyola Lakefront Invite","Men's team: 2nd · 88 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Tennis: men's tennis posts a tournament's page the day before it starts and
// fills it in afterward: the Fighting Irish Invitational (Sep 25-26) takes
// the Sep 24 "Michigan at Fighting Irish Mini Duals" story and is listed.
{
  fromArchive('mens-tennis');
  const events=parse('Tennis','mens-tennis'),irish=events.find(e=>e.opponent==='Fighting Irish Invitational');
  await worker.michiganHandlers.attachArchiveStory(irish);
  assert.equal(irish.recap_url,'https://mgoblue.com/news/2026/9/24/mens-tennis-michigan-at-fighting-irish-mini-duals');
  const listed=await worker.schoolModule('michigan').feed(events,'Tennis');
  assert.deepEqual(listed.filter(e=>e.status==='Final').map(e=>e.opponent),["Fighting Irish Invitational","Hope College Invite"]);
  recapFixtures.clear();requests.length=0;
}

// Page marks are not names: "Mississippi Valley State*", "TEAM BE BETTER;
// Invitational"; water polo's "Maize & Blue Exhibition" is intrasquad; the
// women's Big Ten Tournament, published once per day (Mar 3-7), is one event.
assert.ok(parse('Basketball','mens-basketball').some(e=>e.opponent==='Mississippi Valley State'));
assert.ok(parse('Swimming & Diving','womens-swimming-and-diving').some(e=>e.opponent==='TEAM BE BETTER Invitational (Exhibition)'));
assert.ok(!parse('Water Polo','womens-water-polo').some(e=>/Maize/.test(e.opponent)));
assert.deepEqual(parse('Basketball','womens-basketball').filter(e=>/Big Ten Tournament/.test(e.opponent)).map(e=>[e.opponent,String(e.start_time).slice(0,10),String(e.end_time||'').slice(0,10)]),[["Big Ten Tournament","2027-03-03","2027-03-07"]]);

// Live: ESPN joins the official card for Michigan's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Michigan at Minnesota","Final","L, 14-20"]]);
  live('Volleyball','volleyball-espn-2026-10-03.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-04T12:00:00Z'),[["Michigan at UCLA","Final","L, 0-3"]]);
  live('Soccer','soccer-espn-2026-10-08.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-09T12:00:00Z'),[["Women's · Michigan at Purdue","Final","L, 5-6"]],"Women's");
}

// Records, counted from the finals.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey'],['Hockey','mens-ice-hockey']].map(([sport,slug])=>records(sport,slug)),[["3-2","0-2"],["10-5","1-3"],["5-4-3","3-4"],["3-4-2","0-2-1"],["5-5","1-3"],["2-0",null]]);
for(const sport of ['Basketball','Cross Country','Golf','Gymnastics','Lacrosse','Soccer','Swimming & Diving','Tennis','Track & Field'])assert.ok(worker.schoolCombinedSports(school).has(sport),sport);

// Athlete links on Michigan's profile pages: a link written inside another is
// the inner one (Wyatt Novara); a link with a space is broken, not "alex"
// (Alex Gatto); the site menu's team account is never the athlete's.
assert.equal(worker.verifiedInstagram('<a target="_blank" href="https://www.instagram.com/https://www.instagram.com/wyattnovara" aria-label="Visit Wyatt Novara Instagram profile page">'),'https://www.instagram.com/wyattnovara/');
assert.equal(worker.verifiedInstagram('<a target="_blank" href="https://www.instagram.com/Alex Gatto._" aria-label="Visit Alex Gatto Instagram profile page">'),null);
assert.equal(worker.verifiedInstagram('<a href="https://www.instagram.com/msu_baseball/" rel="noopener noreferrer" target="_blank" data-s-nav-link class="c-navigation__url c-navigation__url--level-2 flex">'),null);

// Other schools and other hosts never reach the Michigan reader.
assert.equal(worker.michiganHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://mgoblue.com/',now),null);
assert.equal(worker.michiganHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Michigan module checks passed');
