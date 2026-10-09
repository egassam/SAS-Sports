import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {michiganStateSchool,MICHIGAN_STATE_TFRRS_TEAMS as michiganStateTfrrs} from '../src/schools/michigan-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='michigan-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,michiganStateHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,verifiedInstagram};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/michigan-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit msuspartans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['michigan-state'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',michiganStateSchool.scheduleUrls],['roster',michiganStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('michigan-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'msuspartans.com',`${key} must stay on msuspartans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://msuspartans.com/sports/baseball/schedule"],"roster":["https://msuspartans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://msuspartans.com/sports/mens-basketball/schedule","https://msuspartans.com/sports/womens-basketball/schedule"],"roster":["https://msuspartans.com/sports/mens-basketball/roster","https://msuspartans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://msuspartans.com/sports/cross-country/schedule"],"roster":["https://msuspartans.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://msuspartans.com/sports/field-hockey/schedule"],"roster":["https://msuspartans.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://msuspartans.com/sports/football/schedule"],"roster":["https://msuspartans.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://msuspartans.com/sports/womens-golf/schedule","https://msuspartans.com/sports/mens-golf/schedule"],"roster":["https://msuspartans.com/sports/womens-golf/roster","https://msuspartans.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://msuspartans.com/sports/womens-gymnastics/schedule"],"roster":["https://msuspartans.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://msuspartans.com/sports/mens-ice-hockey/schedule"],"roster":["https://msuspartans.com/sports/mens-ice-hockey/roster"],"combined":false},"Rowing":{"schedule":["https://msuspartans.com/sports/womens-rowing/schedule"],"roster":["https://msuspartans.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://msuspartans.com/sports/womens-soccer/schedule","https://msuspartans.com/sports/mens-soccer/schedule"],"roster":["https://msuspartans.com/sports/womens-soccer/roster","https://msuspartans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://msuspartans.com/sports/softball/schedule"],"roster":["https://msuspartans.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://msuspartans.com/sports/womens-tennis/schedule","https://msuspartans.com/sports/mens-tennis/schedule"],"roster":["https://msuspartans.com/sports/womens-tennis/roster","https://msuspartans.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://msuspartans.com/sports/track-and-field/schedule"],"roster":["https://msuspartans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://msuspartans.com/sports/womens-volleyball/schedule"],"roster":["https://msuspartans.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://msuspartans.com/sports/wrestling/schedule"],"roster":["https://msuspartans.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'michigan-state|"+sport+"':"),`${sport} routes must live in the Michigan State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://msuspartans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.michiganStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=michigan-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 9, 5:00 PM Michigan State vs Western Michigan (Exhibition) | ",
 "Upcoming Oct 18, 1:00 PM Michigan State vs Alma | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 2 Men's · Michigan State vs Incarnate Word (exhibition) | W, 89-59",
 "Upcoming Oct 20, 7:00 PM Men's · Michigan State vs UConn (exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Men's · Michigan State at Marquette (exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Michigan State vs Quinnipiac | ",
 "Upcoming Nov 5, 8:00 PM Men's · Michigan State vs Toledo | ",
 "Upcoming Nov 10, 7:00 PM Men's · Michigan State vs Duke | ",
 "Upcoming Nov 13, 7:00 PM Men's · Michigan State vs Northern Iowa | ",
 "Upcoming Nov 17, 9:00 PM Men's · Michigan State at Tennessee | ",
 "Upcoming Nov 21, 12:00 PM Men's · Michigan State vs Detroit Mercy | ",
 "Upcoming Nov 26, 4:30 PM Men's · Michigan State vs Arkansas | ",
 "Upcoming Dec 2, 6:30 PM Men's · Michigan State vs Minnesota | ",
 "Upcoming Dec 5, 2:30 PM Men's · Michigan State vs Drake | ",
 "Upcoming Dec 9, 8:30 PM Men's · Michigan State at Maryland | ",
 "Upcoming Dec 12, 2:00 PM Men's · Michigan State vs Merrimack | ",
 "Upcoming Dec 19 Men's · Michigan State vs Gonzaga | ",
 "Upcoming Dec 22, 6:00 PM Men's · Michigan State vs Oakland | ",
 "Upcoming Dec 29, 8:00 PM Men's · Michigan State vs Pennsylvania | ",
 "Upcoming Jan 2, 3:45 PM Men's · Michigan State at Nebraska | ",
 "Upcoming Jan 5, 6:30 PM Men's · Michigan State vs Washington | ",
 "Upcoming Jan 9, 8:00 PM Men's · Michigan State at UCLA | ",
 "Upcoming Jan 12, 10:00 PM Men's · Michigan State at USC | ",
 "Upcoming Jan 16, 4:00 PM Men's · Michigan State vs Oregon | ",
 "Upcoming Jan 23, 1:00 PM Men's · Michigan State at Ohio State | ",
 "Upcoming Jan 26, 7:00 PM Men's · Michigan State vs Penn State | ",
 "Upcoming Jan 30 Men's · Michigan State vs Purdue | ",
 "Upcoming Feb 2, 7:00 PM Men's · Michigan State vs Maryland | ",
 "Upcoming Feb 5, 8:00 PM Men's · Michigan State at Illinois | ",
 "Upcoming Feb 10, 6:30 PM Men's · Michigan State vs Rutgers | ",
 "Upcoming Feb 13, 1:00 PM Men's · Michigan State at Michigan | ",
 "Upcoming Feb 16, 9:00 PM Men's · Michigan State at Iowa | ",
 "Upcoming Feb 20, 8:00 PM Men's · Michigan State vs Nebraska | ",
 "Upcoming Feb 23, 7:00 PM Men's · Michigan State at Indiana | ",
 "Upcoming Feb 26, 8:00 PM Men's · Michigan State vs Michigan | ",
 "Upcoming Mar 2, 8:30 PM Men's · Michigan State at Northwestern | ",
 "Upcoming Mar 6, 3:45 PM Men's · Michigan State vs Wisconsin | ",
 "Upcoming Mar 9 Men's · Michigan State at Big Ten Tournament | ",
 "Upcoming Mar 16 Men's · Michigan State at NCAA Tournament - Opening Round | ",
 "Upcoming Mar 18 Men's · Michigan State at NCAA Tournament - First & Second Rounds | ",
 "Upcoming Mar 25 Men's · Michigan State at NCAA Tournament - Regionals | ",
 "Upcoming Apr 3 Men's · Michigan State at NCAA Final Four | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Michigan State vs Michigan Tech (Exhibition) | ",
 "Upcoming Nov 3, 6:30 PM Women's · Michigan State vs Valparaiso | ",
 "Upcoming Nov 7, 2:00 PM Women's · Michigan State at Toledo | ",
 "Upcoming Nov 11, 6:30 PM Women's · Michigan State vs Oakland | ",
 "Upcoming Nov 15, 2:00 PM Women's · Michigan State at Harvard | ",
 "Upcoming Nov 19, 6:30 PM Women's · Michigan State vs Sacred Heart | ",
 "Upcoming Nov 23, 12:00 PM Women's · Michigan State vs Alcorn State | ",
 "Upcoming Nov 24 Women's · Michigan State vs UT Martin/Virginia Tech | ",
 "Upcoming Nov 29, 6:30 PM Women's · Michigan State vs Eastern Michigan | ",
 "Upcoming Dec 3, 6:30 PM Women's · Michigan State vs Maine | ",
 "Upcoming Dec 6, 4:00 PM Women's · Michigan State vs Penn State | ",
 "Upcoming Dec 9, 6:30 PM Women's · Michigan State vs Milwaukee | ",
 "Upcoming Dec 13, 2:00 PM Women's · Michigan State vs DePaul | ",
 "Upcoming Dec 19 Women's · Michigan State vs Gonzaga | ",
 "Upcoming Dec 29, 6:00 PM Women's · Michigan State at Michigan | ",
 "Upcoming Jan 1, 2:00 PM Women's · Michigan State vs Iowa | ",
 "Upcoming Jan 7, 8:00 PM Women's · Michigan State at Northwestern | ",
 "Upcoming Jan 10 Women's · Michigan State at Nebraska | ",
 "Upcoming Jan 13, 6:30 PM Women's · Michigan State vs Oregon | ",
 "Upcoming Jan 17 Women's · Michigan State at Illinois | ",
 "Upcoming Jan 20, 6:30 PM Women's · Michigan State vs Washington | ",
 "Upcoming Jan 24, 2:00 PM Women's · Michigan State vs Indiana | ",
 "Upcoming Jan 28, 7:00 PM Women's · Michigan State at Rutgers | ",
 "Upcoming Feb 1, 7:00 PM Women's · Michigan State at Maryland | ",
 "Upcoming Feb 7, 1:00 PM Women's · Michigan State at Ohio State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Michigan State vs Purdue | ",
 "Upcoming Feb 14, 2:00 PM Women's · Michigan State vs Minnesota | ",
 "Upcoming Feb 18, 10:00 PM Women's · Michigan State at USC | ",
 "Upcoming Feb 21, 3:00 PM Women's · Michigan State at UCLA | ",
 "Upcoming Feb 25, 6:00 PM Women's · Michigan State vs Wisconsin | ",
 "Upcoming Feb 28, 1:00 PM Women's · Michigan State vs Michigan | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Michigan State at Spartan Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 19 Michigan State at John McNichols Invitational | Women's team: 9th / Men's team: 6th",
 "Today Oct 9 Michigan State at Nuttycombe Wisconsin Invitational | ",
 "Upcoming Oct 23 Michigan State at EMU Fall Classic | ",
 "Upcoming Oct 30 Michigan State at Big Ten Championships | ",
 "Upcoming Nov 13 Michigan State at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Michigan State at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Michigan State at Ohio | W, 3-1",
 "Final Aug 29 Michigan State vs Saint Louis | W, 3-0",
 "Final Sep 4 Michigan State at Miami (Ohio) | L, 0-6",
 "Final Sep 6 Michigan State vs Louisville | L, 0-4",
 "Final Sep 11 Michigan State at Kent State | W, 3-1",
 "Final Sep 13 Michigan State vs Cal | L, 2-3",
 "Final Sep 18 Michigan State vs Michigan | L, 1-2",
 "Final Sep 20 Michigan State at Ball State | W, 4-1",
 "Final Sep 25 Michigan State at Northwestern | L, 0-6",
 "Final Oct 2 Michigan State vs Indiana | L, 0-1",
 "Final Oct 4 Michigan State vs Iowa | L, 3-4",
 "Today Oct 9, 3:00 PM Michigan State vs Penn State | ",
 "Upcoming Oct 11, 11:00 AM Michigan State vs Longwood | ",
 "Upcoming Oct 16, 4:00 PM Michigan State at Maryland | ",
 "Upcoming Oct 18, 12:00 PM Michigan State at Rutgers | ",
 "Upcoming Oct 23, 3:00 PM Michigan State at Ohio State | ",
 "Upcoming Oct 25, 12:00 PM Michigan State vs Bellarmine | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Michigan State vs Toledo | W, 30-20",
 "Final Sep 12 Michigan State vs Eastern Michigan | W, 35-7",
 "Final Sep 19 Michigan State at Notre Dame | L, 10-27",
 "Final Sep 26 Michigan State vs Nebraska | L, 13-31",
 "Final Oct 3 Michigan State at Wisconsin | L, 3-31",
 "Upcoming Oct 10, 3:30 PM Michigan State vs Illinois | ",
 "Upcoming Oct 17, 12:00 PM Michigan State vs Northwestern | ",
 "Upcoming Oct 24 Michigan State at UCLA | ",
 "Upcoming Nov 7 Michigan State at Michigan | ",
 "Upcoming Nov 14 Michigan State vs Washington | ",
 "Upcoming Nov 20, 8:00 PM Michigan State vs Oregon | ",
 "Upcoming Nov 28 Michigan State at Rutgers | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Michigan State at Folds of Honor Collegiate | 7th of 12",
 "Final Sep 20 Women's · Michigan State at Mary Fossum Invitational | 3rd of 15",
 "Upcoming Oct 16 Women's · Michigan State at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 23 Women's · Michigan State at Landfall Tradition | ",
 "Upcoming Feb 1 Women's · Michigan State at CIEE Paradise Invitational | ",
 "Upcoming Feb 14 Women's · Michigan State at Spartan Sun Coast Invitational | ",
 "Upcoming Feb 22 Women's · Michigan State at Momentum Invitational | ",
 "Upcoming Mar 21 Women's · Michigan State at Clemson Invitational | ",
 "Upcoming Apr 4 Women's · Michigan State at Carolina Challenge Cup | ",
 "Upcoming Apr 17 Women's · Michigan State at Buckeye Invitational | ",
 "Upcoming Apr 23 Women's · Michigan State at 2027 Big Ten Women's Golf Championships | ",
 "Upcoming May 10 Women's · Michigan State at 2027 NCAA Division I Women's Golf Regional | ",
 "Upcoming May 21 Women's · Michigan State at 2027 NCAA Division I Women's Golf Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Michigan State at New York Harbor Cup | T3rd of 9",
 "Final Sep 7 Men's · Michigan State at Folds of Honor Collegiate | T6th of 14",
 "Final Sep 28 Men's · Michigan State at Windon Memorial | 11th of 16",
 "Final Oct 2 Men's · Michigan State at The Indy at Forest Hills | Completed",
 "Final Oct 4 Men's · Michigan State at Fighting Irish Classic | 7th of 14",
 "Upcoming Oct 12 Men's · Michigan State at Golden Flash Individual | ",
 "Upcoming Oct 18 Men's · Michigan State at Quail Valley Intercollegiate | ",
 "Upcoming Jan 30 Men's · Michigan State at The Gantner Cup | ",
 "Upcoming Feb 15 Men's · Michigan State at Watersound Invitational | ",
 "Upcoming Mar 7 Men's · Michigan State at Colleton River Collegiate | ",
 "Upcoming Mar 28 Men's · Michigan State at Hootie Intercollegiate | ",
 "Upcoming Apr 5 Men's · Michigan State at Golfweek.com Intercollegiate | ",
 "Upcoming Apr 24 Men's · Michigan State at Illini Invitational | ",
 "Upcoming Apr 30 Men's · Michigan State at 2027 Big Ten Men's Golf Championships | ",
 "Upcoming May 17 Men's · Michigan State at 2027 NCAA Division I Men's Golf Regional | ",
 "Upcoming May 28 Men's · Michigan State at 2027 NCAA Division I Men's Golf Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Michigan State vs Boston College (Exhibition) | W, 5-2",
 "Today Oct 9, 7:30 PM Michigan State vs Northern Michigan | ",
 "Upcoming Oct 11, 1:00 PM Michigan State vs Northern Michigan | ",
 "Upcoming Oct 17, 7:05 PM Michigan State at RIT | ",
 "Upcoming Oct 23, 7:00 PM Michigan State at New Hampshire | ",
 "Upcoming Oct 24, 7:00 PM Michigan State at New Hampshire | ",
 "Upcoming Oct 31, 8:07 PM Michigan State vs North Dakota | ",
 "Upcoming Nov 6, 7:00 PM Michigan State vs Boston University | ",
 "Upcoming Nov 7 Michigan State vs Boston University | ",
 "Upcoming Nov 12 Michigan State at Notre Dame | ",
 "Upcoming Nov 13 Michigan State at Notre Dame | ",
 "Upcoming Nov 20 Michigan State at Michigan | ",
 "Upcoming Nov 21 Michigan State vs Michigan | ",
 "Upcoming Dec 3 Michigan State at Ohio State | ",
 "Upcoming Dec 4 Michigan State at Ohio State | ",
 "Upcoming Dec 11 Michigan State vs Minnesota | ",
 "Upcoming Dec 12 Michigan State vs Minnesota | ",
 "Upcoming Dec 29, 7:00 PM Michigan State vs Lindenwood | ",
 "Upcoming Dec 30 Michigan State vs Michigan Tech or Western Michigan | ",
 "Upcoming Jan 3, 4:00 PM Michigan State vs US National Team Development Program (Exhibition) | ",
 "Upcoming Jan 8 Michigan State at Wisconsin | ",
 "Upcoming Jan 9 Michigan State at Wisconsin | ",
 "Upcoming Jan 15 Michigan State vs Penn State | ",
 "Upcoming Jan 16 Michigan State vs Penn State | ",
 "Upcoming Jan 29 Michigan State at Minnesota | ",
 "Upcoming Jan 30 Michigan State at Minnesota | ",
 "Upcoming Feb 5 Michigan State vs Michigan | ",
 "Upcoming Feb 6 Michigan State vs Michigan | ",
 "Upcoming Feb 12 Michigan State vs Wisconsin | ",
 "Upcoming Feb 13 Michigan State vs Wisconsin | ",
 "Upcoming Feb 19 Michigan State at Penn State | ",
 "Upcoming Feb 20 Michigan State at Penn State | ",
 "Upcoming Feb 25 Michigan State vs Notre Dame | ",
 "Upcoming Feb 27 Michigan State vs Notre Dame | ",
 "Upcoming Mar 4 Michigan State vs Ohio State | ",
 "Upcoming Mar 5 Michigan State vs Ohio State | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Michigan State vs Xavier | W, 2-0",
 "Final Aug 19 Women's · Michigan State vs Loyola | W, 1-0",
 "Final Aug 23 Women's · Michigan State at North Carolina | W, 3-2",
 "Final Aug 27 Women's · Michigan State vs Eastern Michigan | T, 0-0",
 "Final Aug 30 Women's · Michigan State vs Colorado | W, 3-2",
 "Final Sep 3 Women's · Michigan State at Notre Dame | T, 2-2",
 "Final Sep 10 Women's · Michigan State at USC | W, 5-0",
 "Final Sep 13 Women's · Michigan State at UCLA | W, 1-0",
 "Final Sep 20 Women's · Michigan State vs Michigan | L, 1-3",
 "Final Sep 24 Women's · Michigan State vs Nebraska | W, 3-2",
 "Final Sep 27 Women's · Michigan State vs Washington | W, 3-0",
 "Final Oct 4 Women's · Michigan State at Illinois | W, 1-0",
 "Final Oct 8 Women's · Michigan State vs Minnesota | W, 4-0",
 "Upcoming Oct 11, 1:00 PM Women's · Michigan State at Purdue | ",
 "Upcoming Oct 16, 7:30 PM Women's · Michigan State at Indiana | ",
 "Upcoming Oct 22, 6:00 PM Women's · Michigan State vs Penn State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Michigan State vs Maryland | ",
 "Upcoming Oct 30, 7:30 PM Women's · Michigan State at Northwestern | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 8 Men's · Michigan State vs Loyola Chicago (Exhibition) | T, 1-1",
 "Final Aug 14 Men's · Michigan State at Notre Dame (Exhibition) | T, 2-2",
 "Final Aug 20 Men's · Michigan State vs UAlbany | W, 6-2",
 "Final Aug 23 Men's · Michigan State vs Seattle | W, 2-1",
 "Final Aug 27 Men's · Michigan State vs SIUE | W, 4-0",
 "Final Aug 30 Men's · Michigan State vs Niagara | W, 4-1",
 "Final Sep 3 Men's · Michigan State vs Pitt | T, 0-0",
 "Final Sep 11 Men's · Michigan State at Kansas City | L, 1-3",
 "Final Sep 15 Men's · Michigan State vs Northwestern | W, 2-0",
 "Final Sep 18 Men's · Michigan State at Penn State | W, 1-0",
 "Final Sep 25 Men's · Michigan State vs Wisconsin | W, 3-0",
 "Final Oct 3 Men's · Michigan State at UCLA | L, 0-3",
 "Today Oct 9, 7:30 PM Men's · Michigan State at Maryland | ",
 "Upcoming Oct 13, 7:00 PM Men's · Michigan State vs Michigan | ",
 "Upcoming Oct 16, 7:00 PM Men's · Michigan State at Ohio State | ",
 "Upcoming Oct 23, 7:00 PM Men's · Michigan State vs Washington | ",
 "Upcoming Oct 27, 6:00 PM Men's · Michigan State vs Green Bay | ",
 "Upcoming Oct 30, 7:00 PM Men's · Michigan State vs Rutgers | ",
 "Upcoming Nov 4, 8:00 PM Men's · Michigan State at Indiana | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 11, 2:00 PM Michigan State at Toledo (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Michigan State at ITA All-American Pre-Qualifying | Completed",
 "Final Sep 21 Women's · Michigan State at ITA All-American Qualifying | Completed",
 "Final Oct 2 Women's · Michigan State at Spartan Invite | Completed",
 "Today Oct 8 Women's · Michigan State at ITA Regionals | ",
 "Upcoming Nov 5 Women's · Michigan State at ITA Sectional Championship | ",
 "Upcoming Nov 6 Women's · Michigan State at Michigan State Classic | ",
 "Upcoming Nov 17 Women's · Michigan State at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Michigan State at ITA All-American Championships | Completed",
 "Final Oct 1 Men's · Michigan State at Battle In The Bay | Completed",
 "Final Oct 2 Men's · Michigan State at Hope College RSM Invite | Completed",
 "Upcoming Oct 15 Men's · Michigan State at ITA Regionals | ",
 "Upcoming Oct 23 Men's · Michigan State at Louisville Invite | ",
 "Upcoming Oct 29 Men's · Michigan State at Big Ten Indoors | ",
 "Upcoming Nov 5 Men's · Michigan State at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Michigan State at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Michigan State vs Miami | W, 3-2",
 "Final Aug 29 Michigan State vs LIU | W, 3-0",
 "Final Sep 1 Michigan State vs LSU | W, 3-0",
 "Final Sep 2 Michigan State vs South Carolina | W, 3-0",
 "Final Sep 5 Michigan State at Central Michigan | W, 3-0",
 "Final Sep 8 Michigan State vs Western Michigan | W, 3-0",
 "Final Sep 11 Michigan State vs Cincinnati | W, 3-0",
 "Final Sep 12 Michigan State at Morehead State | W, 3-0",
 "Final Sep 15 Michigan State vs Oakland | W, 3-1",
 "Final Sep 18 Michigan State vs Drake | W, 3-0",
 "Final Sep 25 Michigan State vs Washington | L, 1-3",
 "Final Sep 27 Michigan State vs Penn State | W, 3-1",
 "Final Oct 2 Michigan State at UCLA | W, 3-0",
 "Final Oct 4 Michigan State at USC | W, 3-2",
 "Today Oct 9, 7:30 PM Michigan State vs Oregon | ",
 "Upcoming Oct 11, 1:00 PM Michigan State vs Iowa | ",
 "Upcoming Oct 15, 7:00 PM Michigan State at Illinois | ",
 "Upcoming Oct 17, 8:00 PM Michigan State at Northwestern | ",
 "Upcoming Oct 23, 7:00 PM Michigan State at Rutgers | ",
 "Upcoming Oct 25, 12:00 PM Michigan State at Maryland | ",
 "Upcoming Oct 30, 6:00 PM Michigan State vs Indiana | ",
 "Upcoming Oct 31, 4:30 PM Michigan State vs Nebraska | ",
 "Upcoming Nov 5, 8:00 PM Michigan State at Wisconsin | ",
 "Upcoming Nov 7 Michigan State vs Ohio State | ",
 "Upcoming Nov 12, 6:00 PM Michigan State vs Purdue | ",
 "Upcoming Nov 14, 8:00 PM Michigan State at Minnesota | ",
 "Upcoming Nov 17, 6:00 PM Michigan State vs Michigan | ",
 "Upcoming Nov 20 Michigan State at Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7 Michigan State at Michigan State Open | ",
 "Upcoming Nov 13 Michigan State at Cal Poly | ",
 "Upcoming Nov 14 Michigan State at CSU Bakersfield | ",
 "Upcoming Nov 22 Michigan State at Keystone Classic | ",
 "Upcoming Dec 4 Michigan State at North Dakota State | ",
 "Upcoming Dec 4 Michigan State vs Duke | ",
 "Upcoming Dec 12 Michigan State vs Rider | ",
 "Upcoming Dec 12 Michigan State vs The Citadel | ",
 "Upcoming Dec 29 Michigan State at Midlands Championships | ",
 "Upcoming Jan 10 Michigan State at Iowa | ",
 "Upcoming Jan 15 Michigan State at Maryland | ",
 "Upcoming Jan 17 Michigan State vs Michigan | ",
 "Upcoming Jan 22 Michigan State vs Penn State | ",
 "Upcoming Jan 29 Michigan State at Ohio State | ",
 "Upcoming Jan 31 Michigan State at Northwestern | ",
 "Upcoming Feb 5, 1:00 PM Michigan State vs Purdue | ",
 "Upcoming Feb 7, 7:00 PM Michigan State vs Wisconsin | ",
 "Upcoming Feb 13, 2:00 PM Michigan State vs Kent State | ",
 "Upcoming Feb 19 Michigan State at Central Michigan | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
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
  const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://msuspartans.com/sports/${slug}/archives`,listing);
  for(const path of new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){
    const [,y,m,d,slug]=path.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/(.+)/);
    try{recapFixtures.set(`https://msuspartans.com${path}`,fixture(`story-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text??null]).flat();
const finals=(sport,slug)=>parse(sport,slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline]);

// Golf: the team score, then the place in the field ("880 (7th of 12)"); the
// last round's is the tournament's. The Indy at Forest Hills (Oct 2) has no
// place on its card and no story in the archive: it is not listed.
{
  assert.deepEqual(finals('Golf','womens-golf'),[["Folds of Honor Collegiate","7th of 12"],["Mary Fossum Invitational","3rd of 15"]]);
  assert.deepEqual(finals('Golf','mens-golf'),[["New York Harbor Cup","T3rd of 9"],["Folds of Honor Collegiate","T6th of 14"],["Windon Memorial","11th of 16"],["The Indy at Forest Hills","Completed"],["Fighting Irish Classic","7th of 14"]]);
  fromArchive('mens-golf');
  const events=parse('Golf','mens-golf');
  for(const event of events.filter(worker.michiganStateHandlers.isFinalWithoutStory))await worker.michiganStateHandlers.attachArchiveStory(event);
  const listed=await worker.schoolModule('michigan-state').feed(events,'Golf');
  assert.deepEqual(listed.filter(e=>e.status==='Final').map(e=>e.opponent),["New York Harbor Cup","Folds of Honor Collegiate","Windon Memorial","Fighting Irish Classic"]);
  recapFixtures.clear();requests.length=0;
}

// Tennis: men's tennis posted the ITA All-American Championships (Sep 19-25)
// on Sep 28; Battle In The Bay and the Hope College RSM Invite (Oct 1-4)
// have no story in the archive and are not listed.
{
  fromArchive('mens-tennis');
  const events=parse('Tennis','mens-tennis');
  for(const event of events.filter(worker.michiganStateHandlers.isFinalWithoutStory))await worker.michiganStateHandlers.attachArchiveStory(event);
  assert.equal(events.find(e=>e.opponent==='ITA All-American Championships').recap_url,'https://msuspartans.com/news/2026/9/28/mens-tennis-michigan-state-mens-tennis-opened-fall-season-with-solid-showing-at-ita-all-american-championships');
  const listed=await worker.schoolModule('michigan-state').feed(events,'Tennis');
  assert.deepEqual(listed.filter(e=>e.status==='Final').map(e=>e.opponent),["ITA All-American Championships"]);
  recapFixtures.clear();requests.length=0;
}

// Rankings are not names: "No. 6/7 North Carolina", "[RV] Xavier", "(RV)
// Miami".
assert.deepEqual(finals('Soccer','womens-soccer').slice(0,5).map(([opponent])=>opponent),["Xavier","Loyola","North Carolina","Eastern Michigan","Colorado"]);
assert.deepEqual(finals('Volleyball','womens-volleyball').slice(0,1).map(([opponent])=>opponent),["Miami"]);

// Bracket days published once per day are one event each ("NCAA Final Four",
// Apr 3-5).
assert.deepEqual(parse('Basketball','mens-basketball').filter(e=>/Tournament|Final Four/.test(e.opponent)).map(e=>[e.opponent,String(e.start_time).slice(0,10),String(e.end_time||'').slice(0,10)]),[["Big Ten Tournament","2027-03-09","2027-03-14"],["NCAA Tournament - Opening Round","2027-03-16","2027-03-17"],["NCAA Tournament - First & Second Rounds","2027-03-18","2027-03-21"],["NCAA Tournament - Regionals","2027-03-25","2027-03-28"],["NCAA Final Four","2027-04-03","2027-04-05"]]);

// Cross Country: one page for both teams; places from TFRRS.
{
  fromTfrrs(michiganStateTfrrs);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Spartan Invitational","Women's team: 1st · 40 pts / Men's team: 1st · 15 pts",true],["John McNichols Invitational","Women's team: 9th · 267 pts / Men's team: 6th · 212 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Michigan State's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Michigan State at Wisconsin","Final","L, 3-31"]]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[["Michigan State at USC","Final","W, 3-2"]]);
  live('Soccer','soccer-espn-2026-10-08.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-09T12:00:00Z'),[["Women's · Michigan State vs Minnesota","Final","W, 4-0"]],"Women's");
}

// Records, counted from the finals.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey']].map(([sport,slug])=>records(sport,slug)),[["2-3","0-2"],["13-1","3-1"],["10-1-2","5-1"],["7-2-1","3-1"],["4-7","0-4"]]);
for(const sport of ['Basketball','Golf','Soccer','Tennis'])assert.ok(worker.schoolCombinedSports(school).has(sport),sport);

// Other schools and other hosts never reach the Michigan State reader.
assert.equal(worker.michiganStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://msuspartans.com/',now),null);
assert.equal(worker.michiganStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='michigan'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Michigan State module checks passed');
