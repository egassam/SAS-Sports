import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rhodeIslandSchool} from '../src/schools/rhode-island.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='rhode-island');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,rhodeIslandHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/rhode-island-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gorhody.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['rhode-island'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',rhodeIslandSchool.scheduleUrls],['roster',rhodeIslandSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('rhode-island|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gorhody.com',`${key} must stay on gorhody.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gorhody.com/sports/baseball/schedule"],"roster":["https://gorhody.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gorhody.com/sports/mens-basketball/schedule","https://gorhody.com/sports/womens-basketball/schedule"],"roster":["https://gorhody.com/sports/mens-basketball/roster","https://gorhody.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gorhody.com/sports/womens-cross-country/schedule","https://gorhody.com/sports/mens-cross-country/schedule"],"roster":["https://gorhody.com/sports/womens-cross-country/roster","https://gorhody.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gorhody.com/sports/football/schedule"],"roster":["https://gorhody.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gorhody.com/sports/mens-golf/schedule"],"roster":["https://gorhody.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gorhody.com/sports/womens-lacrosse/schedule"],"roster":["https://gorhody.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://gorhody.com/sports/womens-rowing/schedule"],"roster":["https://gorhody.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gorhody.com/sports/womens-soccer/schedule","https://gorhody.com/sports/mens-soccer/schedule"],"roster":["https://gorhody.com/sports/womens-soccer/roster","https://gorhody.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gorhody.com/sports/softball/schedule"],"roster":["https://gorhody.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gorhody.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://gorhody.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gorhody.com/sports/womens-tennis/schedule"],"roster":["https://gorhody.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gorhody.com/sports/womens-track-and-field/schedule","https://gorhody.com/sports/mens-track-and-field/schedule"],"roster":["https://gorhody.com/sports/womens-track-and-field/roster","https://gorhody.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gorhody.com/sports/womens-volleyball/schedule"],"roster":["https://gorhody.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'rhode-island|"+sport+"':"),`${sport} routes must live in the Rhode Island module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gorhody.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.rhodeIslandHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=rhode-island)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · Rhode Island at Massachusetts (Exhibition) | L, 68-81",
 "Upcoming Oct 27, 7:00 PM Men's · Rhode Island vs Southern New Hampshire (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Rhode Island vs Holy Cross | ",
 "Upcoming Nov 7, 4:00 PM Men's · Rhode Island vs Monmouth | ",
 "Upcoming Nov 10, 7:00 PM Men's · Rhode Island vs Maine | ",
 "Upcoming Nov 12, 7:00 PM Men's · Rhode Island vs Maryland Eastern Shore | ",
 "Upcoming Nov 15, 2:00 PM Men's · Rhode Island vs Princeton | ",
 "Upcoming Nov 20, 4:30 PM Men's · Rhode Island vs Liberty | ",
 "Upcoming Nov 22, 7:00 PM Men's · Rhode Island vs UAB | ",
 "Upcoming Nov 25, 1:00 PM Men's · Rhode Island vs American International | ",
 "Upcoming Dec 1, 7:00 PM Men's · Rhode Island vs Brown | ",
 "Upcoming Dec 5, 12:00 PM Men's · Rhode Island vs Providence | ",
 "Upcoming Dec 12, 1:00 PM Men's · Rhode Island at Tulane | ",
 "Upcoming Dec 19, 1:00 PM Men's · Rhode Island at Northeastern | ",
 "Upcoming Dec 22, 6:00 PM Men's · Rhode Island vs Buffalo | ",
 "Upcoming Dec 30, 7:00 PM Men's · Rhode Island at Saint Joseph's | ",
 "Upcoming Jan 2, 4:30 PM Men's · Rhode Island vs George Mason | ",
 "Upcoming Jan 6, 7:00 PM Men's · Rhode Island at Duquesne | ",
 "Upcoming Jan 9, 1:00 PM Men's · Rhode Island vs La Salle | ",
 "Upcoming Jan 13, 7:00 PM Men's · Rhode Island vs George Washington | ",
 "Upcoming Jan 16, 4:30 PM Men's · Rhode Island at Richmond | ",
 "Upcoming Jan 23, 1:00 PM Men's · Rhode Island vs Duquesne | ",
 "Upcoming Jan 26, 7:00 PM Men's · Rhode Island at Saint Louis | ",
 "Upcoming Jan 30, 2:00 PM Men's · Rhode Island at La Salle | ",
 "Upcoming Feb 3, 7:00 PM Men's · Rhode Island vs Fordham | ",
 "Upcoming Feb 7, 2:00 PM Men's · Rhode Island vs Davidson | ",
 "Upcoming Feb 10, 7:00 PM Men's · Rhode Island at VCU | ",
 "Upcoming Feb 13, 4:00 PM Men's · Rhode Island at Loyola Chicago | ",
 "Upcoming Feb 17, 7:00 PM Men's · Rhode Island vs Richmond | ",
 "Upcoming Feb 20, 2:00 PM Men's · Rhode Island at Fordham | ",
 "Upcoming Feb 27, 6:00 PM Men's · Rhode Island vs Dayton | ",
 "Upcoming Mar 3, 7:00 PM Men's · Rhode Island at George Mason | ",
 "Upcoming Mar 6, 1:00 PM Men's · Rhode Island vs St. Bonaventure | ",
 "Upcoming Mar 10 Men's · Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Mar 14, 1:00 PM Men's · Rhode Island at Atlantic 10 Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Rhode Island at West Virginia | ",
 "Upcoming Nov 6, 6:00 PM Women's · Rhode Island vs Columbia | ",
 "Upcoming Nov 8, 1:00 PM Women's · Rhode Island vs USF | ",
 "Upcoming Nov 12, 7:00 PM Women's · Rhode Island at Wagner | ",
 "Upcoming Nov 14, 2:00 PM Women's · Rhode Island at St. John's | ",
 "Upcoming Nov 17, 6:00 PM Women's · Rhode Island vs Emmanuel College | ",
 "Upcoming Nov 20, 6:00 PM Women's · Rhode Island vs New Haven | ",
 "Upcoming Nov 25, 1:00 PM Women's · Rhode Island at Holy Cross | ",
 "Upcoming Dec 3, 7:00 PM Women's · Rhode Island at Saint Joseph's | ",
 "Upcoming Dec 7, 6:00 PM Women's · Rhode Island vs Providence | ",
 "Upcoming Dec 10, 11:00 AM Women's · Rhode Island at Princeton | ",
 "Upcoming Dec 13, 1:00 PM Women's · Rhode Island vs Maine | ",
 "Upcoming Dec 18, 6:00 PM Women's · Rhode Island vs Dartmouth | ",
 "Upcoming Dec 20, 1:00 PM Women's · Rhode Island vs CCSU | ",
 "Upcoming Dec 30, 6:00 PM Women's · Rhode Island vs Fordham | ",
 "Upcoming Jan 2, 3:00 PM Women's · Rhode Island at George Mason | ",
 "Upcoming Jan 6, 6:00 PM Women's · Rhode Island vs Dayton | ",
 "Upcoming Jan 9, 2:00 PM Women's · Rhode Island at La Salle | ",
 "Upcoming Jan 13, 6:00 PM Women's · Rhode Island at St. Bonaventure | ",
 "Upcoming Jan 17 Women's · Rhode Island vs George Washington | ",
 "Upcoming Jan 20, 11:00 AM Women's · Rhode Island vs Saint Louis | ",
 "Upcoming Jan 23, 1:00 PM Women's · Rhode Island at Davidson | ",
 "Upcoming Jan 27, 6:00 PM Women's · Rhode Island vs VCU | ",
 "Upcoming Jan 31 Women's · Rhode Island vs George Mason | ",
 "Upcoming Feb 3 Women's · Rhode Island at Saint Louis | ",
 "Upcoming Feb 7, 3:00 PM Women's · Rhode Island at Fordham | ",
 "Upcoming Feb 10, 6:00 PM Women's · Rhode Island vs Richmond | ",
 "Upcoming Feb 13, 2:00 PM Women's · Rhode Island at Duquesne | ",
 "Upcoming Feb 20, 1:00 PM Women's · Rhode Island vs Loyola | ",
 "Upcoming Feb 24 Women's · Rhode Island at George Washington | ",
 "Upcoming Feb 27 Women's · Rhode Island vs La Salle | ",
 "Upcoming Mar 3 Women's · Rhode Island at Atlantic 10 Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · Rhode Island at Shawn M. Nassaney Invitational | 4th of 5",
 "Final Sep 19 Women's · Rhode Island at UMass Dartmouth Invitational | 10th of 33",
 "Final Oct 2 Women's · Rhode Island at Paul Short Invitational | 30th of 37",
 "Final Oct 17 Women's · Rhode Island at ECAC Championship | 18th of 26",
 "Upcoming Oct 31, 10:45 AM Women's · Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Nov 13, 11:00 AM Women's · Rhode Island at NCAA Northeast Regional Championship | ",
 "Upcoming Nov 21, 10:00 AM Women's · Rhode Island at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · Rhode Island at Bryant Nassaney Invitational | 1st of 4",
 "Final Oct 2 Men's · Rhode Island at Paul Short Run | 14th of 35",
 "Final Oct 17 Men's · Rhode Island at ICAAAA Championships | 6th of 25",
 "Upcoming Oct 31, 10:50 PM Men's · Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Nov 13 Men's · Rhode Island at NCAA Northeast Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Rhode Island at Merrimack | W, 34-7",
 "Final Sep 5 Rhode Island at Temple | L, 14-38",
 "Final Sep 12 Rhode Island vs Elon | W, 31-10",
 "Final Sep 19 Rhode Island at Stony Brook | L, 24-56",
 "Final Sep 26 Rhode Island at North Carolina A&T | L, 18-22",
 "Final Oct 3 Rhode Island vs Brown | W, 13-10",
 "Final Oct 17 Rhode Island at Yale | W, 41-23",
 "Upcoming Oct 24, 12:00 PM Rhode Island vs UAlbany | ",
 "Upcoming Oct 31, 12:00 PM Rhode Island vs Maine | ",
 "Upcoming Nov 7, 1:00 PM Rhode Island at New Hampshire | ",
 "Upcoming Nov 14, 12:00 PM Rhode Island vs Towson | ",
 "Upcoming Nov 21, 1:00 PM Rhode Island at Bryant | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Rhode Island at The Doc Gimmler | 10th of 14",
 "Final Sep 21 Rhode Island at River Run Collegiate | 10th of 13",
 "Final Sep 27 Rhode Island at UConn Invitational at GreatHorse | 1st of 14",
 "Final Oct 12 Rhode Island at Moraine Intercollegiate | 10th of 16",
 "Upcoming Oct 26 Rhode Island at Monterrey Collegiate Classic | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24 Rhode Island vs Alumni Game | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Nov 1 Rhode Island vs Princeton Chase | ",
 "Upcoming Mar 27 Rhode Island at Doc Hosea Invitational | ",
 "Upcoming Apr 3 Rhode Island at Overpeck Rams Invitational | ",
 "Upcoming Apr 17 Rhode Island vs Columbia / Boston | ",
 "Upcoming Apr 24 Rhode Island vs Brown / Cornell | ",
 "Upcoming May 2 Rhode Island vs Eastern Sprints | ",
 "Upcoming May 15 Rhode Island at Atlantic 10 Championship | ",
 "Upcoming May 28 Rhode Island at NCAA | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Rhode Island vs Maine | W, 1-0",
 "Final Aug 15 Women's · Rhode Island at Providence | L, 0-3",
 "Final Aug 20 Women's · Rhode Island vs Northeastern | T, 0-0",
 "Final Aug 23 Women's · Rhode Island at Duke | L, 1-6",
 "Final Aug 27 Women's · Rhode Island at New Hampshire | L, 0-1",
 "Final Aug 30 Women's · Rhode Island at CCSU | W, 1-0",
 "Final Sep 3 Women's · Rhode Island at Bryant | T, 1-1",
 "Final Sep 10 Women's · Rhode Island vs Brown | T, 1-1",
 "Final Sep 19 Women's · Rhode Island at Duquesne | L, 1-2",
 "Final Sep 24 Women's · Rhode Island vs George Washington | W, 3-2",
 "Final Sep 27 Women's · Rhode Island at La Salle | W, 3-2",
 "Final Oct 4 Women's · Rhode Island vs Loyola Chicago | T, 1-1",
 "Final Oct 8 Women's · Rhode Island at Davidson | W, 1-0",
 "Final Oct 11 Women's · Rhode Island vs St. Bonaventure | W, 2-0",
 "Final Oct 17 Women's · Rhode Island vs Saint Joseph's | W, 4-1",
 "Today Oct 22, 6:00 PM Women's · Rhode Island at George Mason | ",
 "Upcoming Oct 25, 1:00 PM Women's · Rhode Island vs Richmond | ",
 "Upcoming Oct 31, 8:00 PM Women's · Rhode Island at Saint Louis | ",
 "Upcoming Nov 6 Women's · Rhode Island at Atlantic 10 Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Rhode Island at Stonehill | L, 2-3",
 "Final Aug 25 Men's · Rhode Island vs Bryant | L, 0-1",
 "Final Aug 29 Men's · Rhode Island vs Holy Cross | W, 2-1",
 "Final Sep 2 Men's · Rhode Island vs Merrimack | L, 1-3",
 "Final Sep 7 Men's · Rhode Island at Providence | L, 0-3",
 "Final Sep 12 Men's · Rhode Island at Central Connecticut State | W, 2-1",
 "Final Sep 15 Men's · Rhode Island at Brown | L, 1-2",
 "Final Sep 19 Men's · Rhode Island at Duquesne | L, 0-1",
 "Final Sep 22 Men's · Rhode Island at Stony Brook | L, 1-3",
 "Final Sep 29 Men's · Rhode Island vs Saint Joseph's | W, 3-0",
 "Final Oct 3 Men's · Rhode Island at George Washington | W, 1-0",
 "Final Oct 7 Men's · Rhode Island vs Davidson | W, 3-1",
 "Final Oct 11 Men's · Rhode Island at Fordham | W, 4-3",
 "Final Oct 17 Men's · Rhode Island vs La Salle | W, 5-0",
 "Final Oct 21 Men's · Rhode Island vs Dayton | L, 2-3",
 "Upcoming Oct 25, 4:00 PM Men's · Rhode Island at George Mason | ",
 "Upcoming Oct 30, 7:00 PM Men's · Rhode Island vs UM Fort Kent | ",
 "Upcoming Nov 6 Men's · Rhode Island at Atlantic 10 Championship Quarterfinals | ",
 "Upcoming Nov 10 Men's · Rhode Island at Atlantic 10 Championship Semifinals | ",
 "Upcoming Nov 14 Men's · Rhode Island at Atlantic 10 Championship Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 10 Women's · Rhode Island vs Siena | W, 223-76",
 "Final Oct 10 Women's · Rhode Island vs Stonehill | W, 244-52",
 "Upcoming Oct 24, 12:00 PM Women's · Rhode Island at Northeastern | ",
 "Upcoming Oct 31, 12:00 PM Women's · Rhode Island at UConn | ",
 "Upcoming Nov 4, 5:00 PM Women's · Rhode Island vs Providence | ",
 "Upcoming Nov 19, 5:00 PM Women's · Rhode Island at Harold Anderson Invitational | ",
 "Upcoming Dec 5, 10:00 AM Women's · Rhode Island at Massachusetts | ",
 "Upcoming Dec 5, 10:00 AM Women's · Rhode Island vs La Salle | ",
 "Upcoming Jan 15, 2:00 PM Women's · Rhode Island vs New Hampshire | ",
 "Upcoming Jan 23, 10:30 AM Women's · Rhode Island at Vermont | ",
 "Upcoming Jan 30, 1:00 PM Women's · Rhode Island vs Central Connecticut State | ",
 "Upcoming Jan 30, 1:00 PM Women's · Rhode Island vs Stony Brook | ",
 "Upcoming Feb 5, 6:00 PM Women's · Rhode Island at BU Winter Open | ",
 "Upcoming Feb 17 Women's · Rhode Island at Atlantic 10 Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Rhode Island at UConn Invitational | Completed",
 "Final Oct 2 Rhode Island at Atlantic 10 Masters | Completed",
 "Final Oct 8 Rhode Island at ITA New England Regionals | Completed",
 "Final Oct 17 Rhode Island at Brown Classic | Completed",
 "Upcoming Oct 23, 1:00 PM Rhode Island at Providence | ",
 "Upcoming Oct 24, 10:00 AM Rhode Island at Sacred Heart | ",
 "Upcoming Oct 25 Rhode Island at Quinnipiac | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 3, 2:00 PM Women's · Rhode Island at 31st Annual URI Pentathlon | ",
 "Upcoming Dec 4 Women's · Rhode Island at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Dec 4, 2:00 PM Women's · Rhode Island at URI Four-Team Meet: Bryant, New Hampshire, Stonehill | ",
 "Upcoming Jan 16, 11:00 AM Women's · Rhode Island at URI Invitational | ",
 "Upcoming Jan 23, 11:00 AM Women's · Rhode Island at Scarlett & White Invitational | ",
 "Upcoming Jan 29, 10:00 AM Women's · Rhode Island at John Thomas Terrier Classic Invitational | ",
 "Upcoming Jan 30, 10:00 AM Women's · Rhode Island at Harvard Invitational | ",
 "Upcoming Feb 6, 10:00 AM Women's · Rhode Island at ECAC Championship | ",
 "Upcoming Feb 13, 11:00 AM Women's · Rhode Island at URI Coaches Invitational | ",
 "Upcoming Feb 13, 2:00 PM Women's · Rhode Island at David Hemery Valentines Classic | ",
 "Upcoming Feb 20, 10:00 AM Women's · Rhode Island at Brown | ",
 "Upcoming Feb 26, 9:00 AM Women's · Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Mar 5, 10:00 AM Women's · Rhode Island at New England Indoor Track & Field Championship | ",
 "Upcoming Mar 12, 4:00 PM Women's · Rhode Island at NCAA Indoor Track & Field Championship | ",
 "Upcoming Mar 19, 11:00 AM Women's · Rhode Island at Black & Gold Invitational | ",
 "Upcoming Mar 25, 12:00 PM Women's · Rhode Island at Raleigh Relays | ",
 "Upcoming Mar 26, 10:30 AM Women's · Rhode Island at Black & Gold Invitational | ",
 "Upcoming Apr 3, 10:00 AM Women's · Rhode Island at Ocean State Cup | ",
 "Upcoming Apr 9, 4:00 PM Women's · Rhode Island at Friar Invitational | ",
 "Upcoming Apr 17, 10:00 AM Women's · Rhode Island at Holy Cross Invitational | ",
 "Upcoming Apr 22, 10:00 AM Women's · Rhode Island at Penn Relays | ",
 "Upcoming Apr 23 Women's · Rhode Island at New England Outdoor Championship | ",
 "Upcoming Apr 30 Women's · Rhode Island at Carisella & Donahue Invitational | ",
 "Upcoming May 14, 10:00 AM Women's · Rhode Island at Atlantic 10 Championship | ",
 "Upcoming May 27 Women's · Rhode Island at NCAA East Preliminary | ",
 "Upcoming Jun 10 Women's · Rhode Island at NCAA Championship | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 3, 2:00 PM Men's · Rhode Island at URI Heptathlon | ",
 "Upcoming Dec 4, 2:00 PM Men's · Rhode Island at URI Opener | ",
 "Upcoming Dec 5 Men's · Rhode Island at Sharon Colyear-Danville 5K | ",
 "Upcoming Jan 16, 11:00 AM Men's · Rhode Island at URI Invitational | ",
 "Upcoming Jan 23 Men's · Rhode Island at Bruce Lehane Scarlet and White | ",
 "Upcoming Jan 30 Men's · Rhode Island at BU Terrier Classic | ",
 "Upcoming Feb 6 Men's · Rhode Island at IC4A Indoor Championships | ",
 "Upcoming Feb 12 Men's · Rhode Island at BU Valentine Invitational | ",
 "Upcoming Feb 13 Men's · Rhode Island at URI Coaches Invitational | ",
 "Upcoming Feb 20 Men's · Rhode Island at Brown University Invitational | ",
 "Upcoming Feb 26 Men's · Rhode Island at Atlantic 10 Indoor Championships | ",
 "Upcoming Mar 5 Men's · Rhode Island at NEICAAA Indoor Championships | ",
 "Upcoming Mar 12 Men's · Rhode Island at NCAA Indoor Championships | ",
 "Upcoming Mar 25 Men's · Rhode Island at Raleigh Relays | ",
 "Upcoming Mar 26 Men's · Rhode Island at Black and Gold Invitational | ",
 "Upcoming Apr 3 Men's · Rhode Island at Ocean State Cup | ",
 "Upcoming Apr 9 Men's · Rhode Island at Ocean State Invitational | ",
 "Upcoming Apr 17 Men's · Rhode Island at UCONN Northeast Challenge | ",
 "Upcoming Apr 22 Men's · Rhode Island at Penn Relays | ",
 "Upcoming Apr 23 Men's · Rhode Island at NEICAAA Outdoor Championships | ",
 "Upcoming May 1 Men's · Rhode Island at Jay Carisella and Joe Donahue Coach Invitational | ",
 "Upcoming May 14 Men's · Rhode Island at Atlantic 10 Outdoor Championships | ",
 "Upcoming May 26 Men's · Rhode Island at NCAA Preliminary Round | ",
 "Upcoming Jun 10 Men's · Rhode Island at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Rhode Island vs Siena | W, 3-2",
 "Final Aug 29 Rhode Island vs Holy Cross | W, 3-2",
 "Final Aug 30 Rhode Island at Central Connecticut State | W, 3-1",
 "Final Sep 4 Rhode Island vs Bryant | L, 0-3",
 "Final Sep 5 Rhode Island vs Brown | L, 2-3",
 "Final Sep 6 Rhode Island vs Providence | L, 0-3",
 "Final Sep 12 Rhode Island at Lafayette | L, 2-3",
 "Final Sep 13 Rhode Island vs Penn | L, 2-3",
 "Final Sep 13 Rhode Island vs Quinnipiac | W, 3-1",
 "Final Sep 18 Rhode Island vs Merrimack | W, 3-0",
 "Final Sep 19 Rhode Island vs Coppin State | L, 1-3",
 "Final Sep 20 Rhode Island at UConn | L, 1-3",
 "Final Sep 25 Rhode Island at George Mason | L, 1-3",
 "Final Sep 26 Rhode Island at George Mason | L, 0-3",
 "Final Oct 3 Rhode Island vs Loyola Chicago | L, 0-3",
 "Final Oct 4 Rhode Island vs Loyola Chicago | L, 0-3",
 "Final Oct 7 Rhode Island vs Fordham | L, 0-3",
 "Final Oct 9 Rhode Island at VCU | L, 1-3",
 "Final Oct 10 Rhode Island at VCU | L, 0-3",
 "Final Oct 16 Rhode Island vs Duquesne | W, 3-2",
 "Final Oct 17 Rhode Island vs Duquesne | L, 2-3",
 "Upcoming Oct 23, 7:00 PM Rhode Island at Davidson | ",
 "Upcoming Oct 24, 1:00 PM Rhode Island at Davidson | ",
 "Upcoming Oct 28, 5:00 PM Rhode Island at Fordham | ",
 "Upcoming Oct 31, 7:00 PM Rhode Island vs George Washington | ",
 "Upcoming Nov 1, 1:00 PM Rhode Island vs George Washington | ",
 "Upcoming Nov 6, 7:00 PM Rhode Island at Dayton | ",
 "Upcoming Nov 7, 12:00 PM Rhode Island at Dayton | ",
 "Upcoming Nov 12, 5:00 PM Rhode Island vs Saint Louis | ",
 "Upcoming Nov 13, 12:00 PM Rhode Island vs Saint Louis | ",
 "Upcoming Nov 20 Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Nov 21 Rhode Island at Atlantic 10 Championship | ",
 "Upcoming Nov 22 Rhode Island at Atlantic 10 Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Rhode Island module checks passed");
