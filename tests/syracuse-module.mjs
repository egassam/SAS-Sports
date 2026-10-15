import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {syracuseSchool} from '../src/schools/syracuse.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='syracuse');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,syracuseHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/syracuse-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cuse.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['syracuse'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',syracuseSchool.scheduleUrls],['roster',syracuseSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('syracuse|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cuse.com',`${key} must stay on cuse.com`);
  }
}
const parity={"Basketball":{"schedule":["https://cuse.com/sports/mens-basketball/schedule","https://cuse.com/sports/womens-basketball/schedule"],"roster":["https://cuse.com/sports/mens-basketball/roster","https://cuse.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://cuse.com/sports/cross-country/schedule"],"roster":["https://cuse.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://cuse.com/sports/field-hockey/schedule"],"roster":["https://cuse.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://cuse.com/sports/football/schedule"],"roster":["https://cuse.com/sports/football/roster"],"combined":false},"Hockey":{"schedule":["https://cuse.com/sports/womens-ice-hockey/schedule"],"roster":["https://cuse.com/sports/womens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://cuse.com/sports/womens-lacrosse/schedule","https://cuse.com/sports/mens-lacrosse/schedule"],"roster":["https://cuse.com/sports/womens-lacrosse/roster","https://cuse.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://cuse.com/sports/rowing/schedule","https://cuse.com/sports/mens-crew/schedule"],"roster":["https://cuse.com/sports/rowing/roster","https://cuse.com/sports/mens-crew/roster"],"combined":true},"Soccer":{"schedule":["https://cuse.com/sports/womens-soccer/schedule","https://cuse.com/sports/mens-soccer/schedule"],"roster":["https://cuse.com/sports/womens-soccer/roster","https://cuse.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://cuse.com/sports/softball/schedule"],"roster":["https://cuse.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://cuse.com/sports/womens-tennis/schedule"],"roster":["https://cuse.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://cuse.com/sports/track-and-field/schedule"],"roster":["https://cuse.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://cuse.com/sports/womens-volleyball/schedule"],"roster":["https://cuse.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'syracuse|"+sport+"':"),`${sport} routes must live in the Syracuse module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://cuse.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.syracuseHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=syracuse)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 13 Men's · Syracuse vs UConn (exhibition) | L, 52-72",
 "Upcoming Oct 18, 2:00 PM Men's · Syracuse at Siena (exhibition) | ",
 "Upcoming Oct 24, 3:00 PM Men's · Syracuse vs Niagara (exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Syracuse vs New Haven | ",
 "Upcoming Nov 5, 7:00 PM Men's · Syracuse vs Central Connecticut State | ",
 "Upcoming Nov 9, 6:30 PM Men's · Syracuse vs Indiana | ",
 "Upcoming Nov 15, 7:00 PM Men's · Syracuse at St. John's | ",
 "Upcoming Nov 18, 8:00 PM Men's · Syracuse vs Cornell | ",
 "Upcoming Nov 21, 2:00 PM Men's · Syracuse vs Lafayette | ",
 "Upcoming Nov 25, 6:00 PM Men's · Syracuse vs Albany | ",
 "Upcoming Dec 1, 9:00 PM Men's · Syracuse at Oklahoma | ",
 "Upcoming Dec 8, 7:00 PM Men's · Syracuse vs Colgate | ",
 "Upcoming Dec 12, 5:00 PM Men's · Syracuse vs Mercyhurst | ",
 "Upcoming Dec 16, 7:00 PM Men's · Syracuse vs Canisius | ",
 "Upcoming Dec 19, 12:00 PM Men's · Syracuse vs Providence | ",
 "Upcoming Dec 22, 4:00 PM Men's · Syracuse vs Binghamton | ",
 "Upcoming Dec 29, 6:00 PM Men's · Syracuse at Florida State | ",
 "Upcoming Jan 2, 12:00 PM Men's · Syracuse vs Georgia Tech | ",
 "Upcoming Jan 5, 7:00 PM Men's · Syracuse vs Duke | ",
 "Upcoming Jan 9, 3:00 PM Men's · Syracuse at Miami | ",
 "Upcoming Jan 12, 7:00 PM Men's · Syracuse at Pittsburgh | ",
 "Upcoming Jan 16, 2:00 PM Men's · Syracuse vs Louisville | ",
 "Upcoming Jan 19, 7:00 PM Men's · Syracuse vs Boston College | ",
 "Upcoming Jan 23, 12:00 PM Men's · Syracuse vs North Carolina | ",
 "Upcoming Jan 27, 11:00 PM Men's · Syracuse at Stanford | ",
 "Upcoming Jan 30, 5:30 PM Men's · Syracuse at California | ",
 "Upcoming Feb 3, 9:00 PM Men's · Syracuse vs Virginia | ",
 "Upcoming Feb 6, 11:00 AM Men's · Syracuse vs Rutgers | ",
 "Upcoming Feb 10, 7:00 PM Men's · Syracuse at Clemson | ",
 "Upcoming Feb 17, 9:00 PM Men's · Syracuse vs Stanford | ",
 "Upcoming Feb 20, 2:15 PM Men's · Syracuse at SMU | ",
 "Upcoming Feb 23, 8:00 PM Men's · Syracuse vs Pittsburgh | ",
 "Upcoming Feb 27, 8:00 PM Men's · Syracuse at Notre Dame | ",
 "Upcoming Mar 3, 9:00 PM Men's · Syracuse at Virginia Tech | ",
 "Upcoming Mar 6, 5:30 PM Men's · Syracuse vs Wake Forest | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 12 Women's · Syracuse vs UConn (exhibition) | L, 60-88",
 "Upcoming Nov 3, 6:00 PM Women's · Syracuse vs Sacred Heart | ",
 "Upcoming Nov 8, 2:00 PM Women's · Syracuse vs Cornell | ",
 "Upcoming Nov 11, 6:00 PM Women's · Syracuse vs Siena | ",
 "Upcoming Nov 15, 7:00 PM Women's · Syracuse vs Canisius | ",
 "Upcoming Nov 18, 5:00 PM Women's · Syracuse at Harvard | ",
 "Upcoming Nov 25, 11:00 AM Women's · Syracuse vs Southern | ",
 "Upcoming Nov 26, 1:30 PM Women's · Syracuse vs Wisconsin | ",
 "Upcoming Nov 27, 11:00 AM Women's · Syracuse vs Auburn | ",
 "Upcoming Dec 3, 7:00 PM Women's · Syracuse vs Oklahoma | ",
 "Upcoming Dec 6, 2:00 PM Women's · Syracuse vs SMU | ",
 "Upcoming Dec 16, 6:00 PM Women's · Syracuse at Le Moyne | ",
 "Upcoming Dec 18, 10:00 AM Women's · Syracuse vs Bucknell | ",
 "Upcoming Dec 28, 6:00 PM Women's · Syracuse at Duke | ",
 "Upcoming Dec 31, 6:00 PM Women's · Syracuse vs North Carolina | ",
 "Upcoming Jan 3, 4:00 PM Women's · Syracuse at Virginia Tech | ",
 "Upcoming Jan 7, 6:00 PM Women's · Syracuse vs Pittsburgh | ",
 "Upcoming Jan 10, 12:00 PM Women's · Syracuse at Florida State | ",
 "Upcoming Jan 14, 6:00 PM Women's · Syracuse vs Boston College | ",
 "Upcoming Jan 17, 3:00 PM Women's · Syracuse vs Notre Dame | ",
 "Upcoming Jan 21, 10:00 PM Women's · Syracuse at Stanford | ",
 "Upcoming Jan 24, 6:00 PM Women's · Syracuse at California | ",
 "Upcoming Jan 28, 6:00 PM Women's · Syracuse vs Miami | ",
 "Upcoming Jan 31, 6:00 PM Women's · Syracuse at Georgia Tech | ",
 "Upcoming Feb 7, 12:00 PM Women's · Syracuse vs NC State | ",
 "Upcoming Feb 11, 6:00 PM Women's · Syracuse at Louisville | ",
 "Upcoming Feb 14, 2:00 PM Women's · Syracuse vs Virginia | ",
 "Upcoming Feb 18, 6:00 PM Women's · Syracuse at Boston College | ",
 "Upcoming Feb 22, 6:00 PM Women's · Syracuse at Clemson | ",
 "Upcoming Feb 28, 12:00 PM Women's · Syracuse vs Wake Forest | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Syracuse at Harry Lang Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 11 Syracuse at Harry Groves Spiked Shoe Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 26 Syracuse at Meadows Challenge | Women's team: 5th / Men's team: 2nd",
 "Upcoming Oct 16 Syracuse at NCAA Pre-Nationals | ",
 "Upcoming Oct 16 Syracuse at Princeton Invitational | ",
 "Upcoming Oct 23 Syracuse at John Reif Memorial | ",
 "Upcoming Oct 30 Syracuse at ACC Championships | ",
 "Upcoming Nov 13 Syracuse at NCAA Northeast Regionals | ",
 "Upcoming Nov 21 Syracuse at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Syracuse at Fairfield | W, 2-1",
 "Final Aug 30 Syracuse at Northeastern | W, 3-2",
 "Final Sep 4 Syracuse vs Ohio State | W, 3-2",
 "Final Sep 6 Syracuse at Rutgers | L, 1-2",
 "Final Sep 13 Syracuse at Bucknell | W, 10-0",
 "Final Sep 18 Syracuse vs UMass Lowell | W, 3-2",
 "Final Sep 25 Syracuse at Virginia | W, 3-0",
 "Final Sep 27 Syracuse at Wake Forest | L, 2-4",
 "Final Oct 2 Syracuse at Duke | L, 0-2",
 "Final Oct 9 Syracuse vs Louisville | W, 4-2",
 "Final Oct 11 Syracuse vs Harvard | L, 1-3",
 "Upcoming Oct 18, 2:00 PM Syracuse at North Carolina | ",
 "Upcoming Oct 23, 5:00 PM Syracuse vs Stanford | ",
 "Upcoming Oct 25, 12:00 PM Syracuse vs California | ",
 "Upcoming Oct 30, 4:30 PM Syracuse vs Boston College | ",
 "Upcoming Nov 3 Syracuse at ACC Championship | ",
 "Upcoming Nov 13 Syracuse at NCAA Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Syracuse vs New Hampshire | W, 66-3",
 "Final Sep 12 Syracuse vs Cal | L, 18-21",
 "Final Sep 17 Syracuse at Pittsburgh | L, 13-27",
 "Final Oct 3 Syracuse at UConn | W, 42-41",
 "Final Oct 10 Syracuse at Virginia | L, 25-28",
 "Upcoming Oct 17, 7:30 PM Syracuse vs Louisville | ",
 "Upcoming Oct 24, 7:30 PM Syracuse at North Carolina | ",
 "Upcoming Oct 31 Syracuse vs SMU | ",
 "Upcoming Nov 7 Syracuse vs Clemson | ",
 "Upcoming Nov 14 Syracuse at NC State | ",
 "Upcoming Nov 21 Syracuse at Boston College | ",
 "Upcoming Nov 28 Syracuse vs Notre Dame | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Syracuse vs Stonehill | W, 3-0",
 "Final Sep 26 Syracuse vs Stonehill | W, 4-1",
 "Final Oct 2 Syracuse at Mercyhurst | W, 3-1",
 "Final Oct 3 Syracuse at Mercyhurst | L, 2-5",
 "Final Oct 9 Syracuse vs Penn State | W, 5-4",
 "Final Oct 10 Syracuse vs Penn State | L, 0-4",
 "Upcoming Oct 16, 7:00 PM Syracuse at Robert Morris | ",
 "Upcoming Oct 17, 3:00 PM Syracuse at Robert Morris | ",
 "Upcoming Oct 29, 5:00 PM Syracuse vs Delaware | ",
 "Upcoming Oct 30, 3:00 PM Syracuse vs Delaware | ",
 "Upcoming Nov 6, 4:00 PM Syracuse at Lindenwood | ",
 "Upcoming Nov 7, 1:00 PM Syracuse at Lindenwood | ",
 "Upcoming Nov 13, 6:00 PM Syracuse at RPI | ",
 "Upcoming Nov 14, 3:00 PM Syracuse vs RPI | ",
 "Upcoming Nov 17, 6:00 PM Syracuse vs Colgate | ",
 "Upcoming Nov 20, 6:00 PM Syracuse vs RIT | ",
 "Upcoming Nov 21, 3:00 PM Syracuse at RIT | ",
 "Upcoming Nov 24, 6:00 PM Syracuse vs Clarkson | ",
 "Upcoming Nov 28, 3:00 PM Syracuse at Clarkson | ",
 "Upcoming Dec 4, 6:00 PM Syracuse at Penn State | ",
 "Upcoming Dec 5, 2:00 PM Syracuse at Penn State | ",
 "Upcoming Jan 1, 3:00 PM Syracuse vs Union | ",
 "Upcoming Jan 2, 3:00 PM Syracuse at Union | ",
 "Upcoming Jan 5, 11:00 AM Syracuse at Colgate | ",
 "Upcoming Jan 8, 6:00 PM Syracuse vs Mercyhurst | ",
 "Upcoming Jan 9, 3:00 PM Syracuse vs Mercyhurst | ",
 "Upcoming Jan 15, 6:00 PM Syracuse at Delaware | ",
 "Upcoming Jan 16, 2:00 PM Syracuse at Delaware | ",
 "Upcoming Jan 22, 4:00 PM Syracuse vs Lindenwood | ",
 "Upcoming Jan 23, 1:00 PM Syracuse vs Lindenwood | ",
 "Upcoming Jan 29, 3:00 PM Syracuse at RIT | ",
 "Upcoming Jan 30, 3:00 PM Syracuse vs RIT | ",
 "Upcoming Feb 12, 6:00 PM Syracuse vs Robert Morris | ",
 "Upcoming Feb 13, 1:00 PM Syracuse vs Robert Morris | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Oct 24, 12:00 PM Men's · Syracuse at Rutgers (Exhibition) | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Nov 7 Women's · Syracuse at Cornell | ",
 "Upcoming Mar 27 Women's · Syracuse at Doc Hosea Invitational | ",
 "Upcoming Apr 3 Women's · Syracuse at Ivy Invitational | ",
 "Upcoming Apr 10 Women's · Syracuse vs Yale | ",
 "Upcoming Apr 10 Women's · Syracuse vs Dartmouth | ",
 "Upcoming Apr 17 Women's · Syracuse at New York State Championships | ",
 "Upcoming Apr 24 Women's · Syracuse at Michigan | ",
 "Upcoming Apr 24 Women's · Syracuse vs Ohio State | ",
 "Upcoming May 15 Women's · Syracuse at ACC Championship | ",
 "Upcoming May 16 Women's · Syracuse at ACC Championship | ",
 "Upcoming May 28 Women's · Syracuse at NCAA Championship | ",
 "Upcoming May 29 Women's · Syracuse at NCAA Championship | ",
 "Upcoming May 30 Women's · Syracuse at NCAA Championship | "
]);
  const v_menscrew=parse("Rowing","mens-crew");
  assert.deepEqual(v_menscrew.map(line),[
 "Final Jul 2 Men's · Syracuse at Oxford Brookes University 'E' | Completed",
 "Final Jul 3 Men's · Syracuse at Washington | Completed"
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Syracuse vs Villanova | T, 0-0",
 "Final Aug 16 Women's · Syracuse vs Holy Cross | W, 3-1",
 "Final Aug 20 Women's · Syracuse at Northwestern | W, 1-0",
 "Final Aug 23 Women's · Syracuse vs Princeton | W, 3-0",
 "Final Aug 27 Women's · Syracuse vs Niagara | L, 1-2",
 "Final Aug 30 Women's · Syracuse vs Harvard | T, 0-0",
 "Final Sep 3 Women's · Syracuse at Binghamton | L, 0-1",
 "Final Sep 13 Women's · Syracuse at Boston College | L, 0-2",
 "Final Sep 17 Women's · Syracuse at Clemson | L, 0-2",
 "Final Sep 20 Women's · Syracuse vs Virginia Tech | L, 0-1",
 "Final Sep 24 Women's · Syracuse vs Pittsburgh | W, 2-1",
 "Final Oct 3 Women's · Syracuse at Virginia | L, 0-4",
 "Final Oct 8 Women's · Syracuse vs Stanford | L, 0-2",
 "Today Oct 15, 6:00 PM Women's · Syracuse at NC State | ",
 "Upcoming Oct 23, 7:00 PM Women's · Syracuse at Louisville | ",
 "Upcoming Oct 29, 7:00 PM Women's · Syracuse vs Miami | ",
 "Upcoming Nov 5, 7:00 PM Women's · Syracuse vs California | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 8 Men's · Syracuse vs Marist (Exhibition) | W, 4-0",
 "Final Aug 11 Men's · Syracuse vs Mercyhurst (Exhibition) | W, 1-0",
 "Final Aug 14 Men's · Syracuse at Penn State (Exhibition) | T, 1-1",
 "Final Aug 20 Men's · Syracuse at UConn | W, 2-1",
 "Final Aug 23 Men's · Syracuse vs New Hampshire | L, 2-3",
 "Final Aug 28 Men's · Syracuse vs Loyola | W, 2-0",
 "Final Aug 31 Men's · Syracuse vs Iona | W, 4-0",
 "Final Sep 4 Men's · Syracuse vs Clemson | L, 0-1",
 "Final Sep 9 Men's · Syracuse vs St. John's | W, 5-0",
 "Final Sep 12 Men's · Syracuse at Boston College | L, 0-2",
 "Final Sep 15 Men's · Syracuse at Colgate | W, 3-0",
 "Final Sep 19 Men's · Syracuse vs Le Moyne | W, 2-0",
 "Final Sep 25 Men's · Syracuse at Notre Dame | W, 1-0",
 "Final Oct 2 Men's · Syracuse vs Pittsburgh | T, 1-1",
 "Final Oct 6 Men's · Syracuse at Akron | L, 1-2",
 "Final Oct 10 Men's · Syracuse vs Louisville | L, 0-1",
 "Upcoming Oct 17, 7:00 PM Men's · Syracuse at Wake Forest | ",
 "Upcoming Oct 24, 1:00 PM Men's · Syracuse vs Virginia | ",
 "Upcoming Oct 30, 5:00 PM Men's · Syracuse at Virginia Tech | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Syracuse at Villanova/Delaware Invite | Completed",
 "Final Sep 28 Syracuse at UTR Pro Fall Slam | Completed",
 "Final Oct 9 Syracuse at ITA Regional Championships | Completed",
 "Upcoming Oct 23 Syracuse at Fordham Invite | ",
 "Upcoming Nov 5 Syracuse at ITA Sectional Championships | ",
 "Upcoming Nov 6 Syracuse at Buffalo Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Syracuse vs Cincinnati | L, 0-3",
 "Final Aug 30 Syracuse at Illinois | L, 0-3",
 "Final Sep 3 Syracuse vs Howard | W, 3-0",
 "Final Sep 4 Syracuse vs UAlbany | W, 3-0",
 "Final Sep 5 Syracuse at Cornell | W, 3-2",
 "Final Sep 9 Syracuse vs Arkansas | L, 1-3",
 "Final Sep 13 Syracuse vs Canisius | W, 3-0",
 "Final Sep 18 Syracuse vs FDU | W, 3-1",
 "Final Sep 20 Syracuse vs Buffalo | L, 0-3",
 "Final Sep 25 Syracuse vs Louisville | L, 0-3",
 "Final Sep 27 Syracuse vs Notre Dame | L, 0-3",
 "Final Oct 2 Syracuse vs SMU | L, 0-3",
 "Final Oct 4 Syracuse vs Pittsburgh | L, 0-3",
 "Final Oct 9 Syracuse at NC State | L, 1-3",
 "Final Oct 11 Syracuse at Wake Forest | L, 0-3",
 "Upcoming Oct 16, 7:00 PM Syracuse at Georgia Tech | ",
 "Upcoming Oct 18, 1:00 PM Syracuse at Clemson | ",
 "Upcoming Oct 23, 6:00 PM Syracuse vs Virginia | ",
 "Upcoming Oct 25, 1:00 PM Syracuse vs Virginia Tech | ",
 "Upcoming Oct 30, 7:00 PM Syracuse at North Carolina | ",
 "Upcoming Nov 1, 1:00 PM Syracuse at Duke | ",
 "Upcoming Nov 4, 5:00 PM Syracuse vs Boston College | ",
 "Upcoming Nov 8, 1:00 PM Syracuse at Boston College | ",
 "Upcoming Nov 13, 6:00 PM Syracuse vs Miami | ",
 "Upcoming Nov 15, 1:00 PM Syracuse vs Florida State | ",
 "Upcoming Nov 20, 10:00 PM Syracuse at Stanford | ",
 "Upcoming Nov 22, 4:00 PM Syracuse at California | ",
 "Upcoming Nov 25, 4:00 PM Syracuse vs Duke | ",
 "Upcoming Nov 28, 1:00 PM Syracuse at Notre Dame | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_menscrew,"Rowing mens-crew");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');

// Women's hockey plays in Atlantic Hockey America: the page data marks no
// league games, so a regular-season game against a member is one (Mercyhurst,
// listed "rv Mercyhurst", and Penn State; Stonehill is not a member).
assert.deepEqual(parse('Hockey','womens-ice-hockey').filter(e=>e.status==='Final').map(e=>[e.opponent,e.conference_game,e.conference_name]),[["Stonehill",false,"Atlantic Hockey America"],["Stonehill",false,"Atlantic Hockey America"],["Mercyhurst",true,"Atlantic Hockey America"],["Mercyhurst",true,"Atlantic Hockey America"],["Penn State",true,"Atlantic Hockey America"],["Penn State",true,"Atlantic Hockey America"]]);
// Men's rowing is /sports/mens-crew; its page is still 2025-26 (Henley in
// July): its two regattas have no result or story, and the feed leaves them
// out (as every storyless past regatta). Women's rowing is labeled.
assert.ok(parse('Rowing','mens-crew').every(e=>worker.syracuseHandlers.isTennisWithoutStory(e)));
assert.deepEqual(parse('Rowing','mens-crew').map(line),["Final Jul 2 Men's · Syracuse at Oxford Brookes University 'E' | Completed","Final Jul 3 Men's · Syracuse at Washington | Completed"]);
assert.ok(parse('Rowing','rowing').every(e=>e.team_label==="Women's"));
console.log('Syracuse module checks passed');
