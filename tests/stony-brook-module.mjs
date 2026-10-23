import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {stonyBrookSchool} from '../src/schools/stony-brook.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='stony-brook');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,stonyBrookHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/stony-brook-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit stonybrookathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['stony-brook'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',stonyBrookSchool.scheduleUrls],['roster',stonyBrookSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('stony-brook|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'stonybrookathletics.com',`${key} must stay on stonybrookathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://stonybrookathletics.com/sports/baseball/schedule"],"roster":["https://stonybrookathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://stonybrookathletics.com/sports/mens-basketball/schedule","https://stonybrookathletics.com/sports/womens-basketball/schedule"],"roster":["https://stonybrookathletics.com/sports/mens-basketball/roster","https://stonybrookathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://stonybrookathletics.com/sports/womens-cross-country/schedule","https://stonybrookathletics.com/sports/mens-cross-country/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-cross-country/roster","https://stonybrookathletics.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://stonybrookathletics.com/sports/football/schedule"],"roster":["https://stonybrookathletics.com/sports/football/roster"],"combined":false},"Lacrosse":{"schedule":["https://stonybrookathletics.com/sports/womens-lacrosse/schedule","https://stonybrookathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-lacrosse/roster","https://stonybrookathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://stonybrookathletics.com/sports/womens-soccer/schedule","https://stonybrookathletics.com/sports/mens-soccer/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-soccer/roster","https://stonybrookathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://stonybrookathletics.com/sports/softball/schedule"],"roster":["https://stonybrookathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://stonybrookathletics.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://stonybrookathletics.com/sports/womens-tennis/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://stonybrookathletics.com/sports/womens-track-and-field/schedule","https://stonybrookathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-track-and-field/roster","https://stonybrookathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://stonybrookathletics.com/sports/womens-volleyball/schedule"],"roster":["https://stonybrookathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'stony-brook|"+sport+"':"),`${sport} routes must live in the Stony Brook module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://stonybrookathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.stonyBrookHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=stony-brook)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:31 PM Men's · Stony Brook vs SUNY Old Westbury | ",
 "Upcoming Nov 6, 8:00 PM Men's · Stony Brook at Northwestern | ",
 "Upcoming Nov 11, 7:00 PM Men's · Stony Brook at Princeton | ",
 "Upcoming Nov 17, 6:31 PM Men's · Stony Brook vs SUNY Potsdam | ",
 "Upcoming Nov 21, 2:00 PM Men's · Stony Brook at Saint Peter's | ",
 "Upcoming Nov 25, 1:00 PM Men's · Stony Brook vs Lindenwood | ",
 "Upcoming Nov 28, 4:00 PM Men's · Stony Brook vs Delaware | ",
 "Upcoming Dec 2, 6:31 PM Men's · Stony Brook vs Maryland Eastern Shore | ",
 "Upcoming Dec 5, 1:00 PM Men's · Stony Brook at Maine | ",
 "Upcoming Dec 8, 6:31 PM Men's · Stony Brook vs SUNY Canton | ",
 "Upcoming Dec 12, 2:00 PM Men's · Stony Brook vs La Salle | ",
 "Upcoming Dec 15, 6:00 PM Men's · Stony Brook at Ohio State | ",
 "Upcoming Dec 18, 6:31 PM Men's · Stony Brook vs New Haven | ",
 "Upcoming Dec 22, 4:00 PM Men's · Stony Brook at Brown | ",
 "Upcoming Dec 31, 1:00 PM Men's · Stony Brook vs Monmouth | ",
 "Upcoming Jan 2, 2:00 PM Men's · Stony Brook at Hofstra | ",
 "Upcoming Jan 9, 4:00 PM Men's · Stony Brook vs Towson | ",
 "Upcoming Jan 14, 7:00 PM Men's · Stony Brook at North Carolina A&T | ",
 "Upcoming Jan 16, 7:00 PM Men's · Stony Brook at Elon | ",
 "Upcoming Jan 18, 7:00 PM Men's · Stony Brook at Campbell | ",
 "Upcoming Jan 21, 6:31 PM Men's · Stony Brook vs William & Mary | ",
 "Upcoming Jan 23, 4:00 PM Men's · Stony Brook at Northeastern | ",
 "Upcoming Jan 28, 6:31 PM Men's · Stony Brook vs Hampton | ",
 "Upcoming Feb 1, 8:30 PM Men's · Stony Brook vs Drexel | ",
 "Upcoming Feb 4, 6:31 PM Men's · Stony Brook vs Elon | ",
 "Upcoming Feb 6, 2:00 PM Men's · Stony Brook vs Campbell | ",
 "Upcoming Feb 11, 7:00 PM Men's · Stony Brook at Charleston | ",
 "Upcoming Feb 13, 7:00 PM Men's · Stony Brook at UNCW | ",
 "Upcoming Feb 22, 7:00 PM Men's · Stony Brook vs Hofstra | ",
 "Upcoming Feb 25, 7:00 PM Men's · Stony Brook at Drexel | ",
 "Upcoming Feb 27, 2:00 PM Men's · Stony Brook at Monmouth | ",
 "Upcoming Mar 2, 6:31 PM Men's · Stony Brook vs Northeastern | ",
 "Upcoming Mar 5 Men's · Stony Brook at CAA Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:31 PM Women's · Stony Brook vs Queens College (Exhibition) | ",
 "Upcoming Nov 2, 4:30 PM Women's · Stony Brook vs Molloy | ",
 "Upcoming Nov 5, 1:00 PM Women's · Stony Brook at Iona | ",
 "Upcoming Nov 11, 6:00 PM Women's · Stony Brook at Niagara | ",
 "Upcoming Nov 15, 1:00 PM Women's · Stony Brook vs Sacred Heart | ",
 "Upcoming Nov 21, 1:00 PM Women's · Stony Brook at Duquesne | ",
 "Upcoming Nov 24, 6:31 PM Women's · Stony Brook vs Lehigh | ",
 "Upcoming Dec 2, 6:00 PM Women's · Stony Brook at Vermont | ",
 "Upcoming Dec 6, 2:00 PM Women's · Stony Brook at Miami | ",
 "Upcoming Dec 8, 11:00 AM Women's · Stony Brook at Florida Atlantic | ",
 "Upcoming Dec 14, 6:31 PM Women's · Stony Brook vs Georgian Court | ",
 "Upcoming Dec 17, 11:00 AM Women's · Stony Brook vs Delaware | ",
 "Upcoming Dec 22, 1:00 PM Women's · Stony Brook at Virginia | ",
 "Upcoming Jan 1, 2:00 PM Women's · Stony Brook vs Towson | ",
 "Upcoming Jan 3, 1:00 PM Women's · Stony Brook vs Hofstra | ",
 "Upcoming Jan 8, 7:00 PM Women's · Stony Brook at North Carolina A&T | ",
 "Upcoming Jan 10, 1:00 PM Women's · Stony Brook at Elon | ",
 "Upcoming Jan 15, 6:00 PM Women's · Stony Brook at Drexel | ",
 "Upcoming Jan 17, 1:00 PM Women's · Stony Brook vs Campbell | ",
 "Upcoming Jan 22, 6:00 PM Women's · Stony Brook at Monmouth | ",
 "Upcoming Jan 29, 6:31 PM Women's · Stony Brook vs Northeastern | ",
 "Upcoming Jan 31, 1:00 PM Women's · Stony Brook vs Drexel | ",
 "Upcoming Feb 5, 6:00 PM Women's · Stony Brook at Charleston | ",
 "Upcoming Feb 7, 1:00 PM Women's · Stony Brook at UNCW | ",
 "Upcoming Feb 12, 1:00 PM Women's · Stony Brook vs Hampton | ",
 "Upcoming Feb 14, 1:00 PM Women's · Stony Brook at Towson | ",
 "Upcoming Feb 19, 6:31 PM Women's · Stony Brook vs Charleston | ",
 "Upcoming Feb 21, 1:00 PM Women's · Stony Brook vs Monmouth | ",
 "Upcoming Feb 26, 7:00 PM Women's · Stony Brook at Northeastern | ",
 "Upcoming Mar 4, 6:00 PM Women's · Stony Brook at Hofstra | ",
 "Upcoming Mar 6, 1:00 PM Women's · Stony Brook vs William & Mary | ",
 "Upcoming Mar 10 Women's · Stony Brook at CAA Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Stony Brook at Stony Brook Season Opener | 2nd · 56 pts",
 "Final Sep 18 Women's · Stony Brook at Main Line Invitational | 3rd · 73 pts",
 "Final Oct 17 Women's · Stony Brook at IC4A/ECAC Championships | 10th · 252 pts",
 "Today Oct 23, 3:00 PM Women's · Stony Brook at Short Course Showdown | ",
 "Upcoming Oct 30, 10:00 AM Women's · Stony Brook at CAA Championship | ",
 "Upcoming Nov 13, 10:00 AM Women's · Stony Brook at NCAA Northeast Regionals | ",
 "Upcoming Nov 21, 11:00 AM Women's · Stony Brook at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Stony Brook at Stony Brook Season Opener | 1st · 28 pts",
 "Final Sep 18 Men's · Stony Brook at Main Line Invitational | 1st · 34 pts",
 "Final Oct 2 Men's · Stony Brook at Paul Short Run | 6th · 227 pts",
 "Final Oct 17 Men's · Stony Brook at IC4A/ECAC Championships | 1st · 63 pts",
 "Today Oct 23, 2:00 PM Men's · Stony Brook at Short Course Showdown | ",
 "Upcoming Oct 30, 10:00 AM Men's · Stony Brook at CAA Championship | ",
 "Upcoming Nov 13, 10:00 AM Men's · Stony Brook at NCAA Northeast Regionals | ",
 "Upcoming Nov 21, 11:00 AM Men's · Stony Brook at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Stony Brook at Delaware State | L, 34-41",
 "Final Sep 3 Stony Brook vs Lindenwood | W, 36-32",
 "Final Sep 12 Stony Brook at Ball State | L, 17-41",
 "Final Sep 19 Stony Brook vs Rhode Island | W, 56-24",
 "Final Sep 26 Stony Brook at Fordham | W, 31-16",
 "Final Oct 10 Stony Brook at Towson | W, 31-24",
 "Final Oct 17 Stony Brook vs UAlbany | L, 31-48",
 "Upcoming Oct 24, 2:00 PM Stony Brook at Bryant | ",
 "Upcoming Oct 31, 12:00 PM Stony Brook vs Sacred Heart | ",
 "Upcoming Nov 7, 1:00 PM Stony Brook at Campbell | ",
 "Upcoming Nov 14, 1:00 PM Stony Brook at New Hampshire | ",
 "Upcoming Nov 21, 12:00 PM Stony Brook vs Hampton | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Stony Brook vs UConn | T, 2-2",
 "Final Aug 16 Women's · Stony Brook vs New Haven | W, 5-0",
 "Final Aug 20 Women's · Stony Brook at Harvard | W, 2-1",
 "Final Aug 30 Women's · Stony Brook vs Penn | W, 2-0",
 "Final Sep 3 Women's · Stony Brook at Loyola (Md.) | T, 0-0",
 "Final Sep 6 Women's · Stony Brook vs Lehigh | T, 2-2",
 "Final Sep 13 Women's · Stony Brook at UAlbany | T, 2-2",
 "Final Sep 20 Women's · Stony Brook vs Monmouth | W, 1-0",
 "Final Sep 24 Women's · Stony Brook at Elon | L, 1-2",
 "Final Sep 27 Women's · Stony Brook at Campbell | T, 0-0",
 "Final Oct 4 Women's · Stony Brook at Towson | L, 0-4",
 "Final Oct 8 Women's · Stony Brook vs Hampton | W, 1-0",
 "Final Oct 11 Women's · Stony Brook vs William & Mary | W, 1-0",
 "Final Oct 18 Women's · Stony Brook at Drexel | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Women's · Stony Brook vs Northeastern | ",
 "Upcoming Nov 1, 1:00 PM Women's · Stony Brook at Hofstra | ",
 "Upcoming Nov 5 Women's · Stony Brook at CAA Quarterfinal | ",
 "Upcoming Nov 8 Women's · Stony Brook at CAA Semifinal | ",
 "Upcoming Nov 14 Women's · Stony Brook at CAA Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Stony Brook at Marist | T, 2-2",
 "Final Aug 24 Men's · Stony Brook at Sacred Heart | T, 1-1",
 "Final Aug 29 Men's · Stony Brook vs Hofstra | T, 1-1",
 "Final Sep 6 Men's · Stony Brook at Northeastern | T, 1-1",
 "Final Sep 9 Men's · Stony Brook at Quinnipiac | W, 2-1",
 "Final Sep 12 Men's · Stony Brook vs Saint Peter's | T, 1-1",
 "Final Sep 15 Men's · Stony Brook at Army | W, 4-1",
 "Final Sep 19 Men's · Stony Brook at Drexel | L, 1-2",
 "Final Sep 22 Men's · Stony Brook vs Rhode Island | W, 3-1",
 "Final Sep 28 Men's · Stony Brook vs Monmouth | W, 2-1",
 "Final Oct 3 Men's · Stony Brook at Hofstra | W, 3-0",
 "Final Oct 11 Men's · Stony Brook at George Mason | W, 2-0",
 "Final Oct 14 Men's · Stony Brook vs Farmingdale State | W, 5-0",
 "Final Oct 18 Men's · Stony Brook vs Drexel | W, 2-0",
 "Upcoming Oct 24, 1:00 PM Men's · Stony Brook at Monmouth | ",
 "Upcoming Oct 30, 6:00 PM Men's · Stony Brook vs Northeastern | ",
 "Upcoming Nov 5 Men's · Stony Brook at CAA Quarterfinal | ",
 "Upcoming Nov 8 Men's · Stony Brook at CAA Semifinal | ",
 "Upcoming Nov 14 Men's · Stony Brook at CAA Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Nov 7 Women's · Stony Brook at Manhattan | ",
 "Upcoming Nov 14 Women's · Stony Brook at Siena | ",
 "Upcoming Nov 21 Women's · Stony Brook vs Sacred Heart | ",
 "Upcoming Dec 4 Women's · Stony Brook at ECAC Championships | ",
 "Upcoming Jan 9 Women's · Stony Brook vs Johns Hopkins | ",
 "Upcoming Jan 16 Women's · Stony Brook at Northeastern | ",
 "Upcoming Jan 27 Women's · Stony Brook vs Manhattan | ",
 "Upcoming Jan 30 Women's · Stony Brook at Rhode Island | ",
 "Upcoming Jan 30 Women's · Stony Brook vs Central Connecticut | ",
 "Upcoming Feb 6 Women's · Stony Brook at Bryant | ",
 "Upcoming Feb 6 Women's · Stony Brook vs NJIT | ",
 "Upcoming Feb 24 Women's · Stony Brook at CAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Stony Brook at Hofstra Invite | Completed",
 "Final Sep 25 Stony Brook at Columbia Invite | Completed",
 "Final Oct 2 Stony Brook at Harvard Invitational | Completed",
 "Final Oct 15 Stony Brook at ITA Regionals | Completed",
 "Today Oct 23 Stony Brook at Fordham Invitational | ",
 "Upcoming Oct 31 Stony Brook vs Seton Hall | ",
 "Upcoming Nov 5 Stony Brook at ITA Sectionals | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Stony Brook vs Robert Morris | W, 3-2",
 "Final Aug 28 Stony Brook vs NC State | L, 0-3",
 "Final Aug 29 Stony Brook at UCF | L, 0-3",
 "Final Aug 30 Stony Brook at Florida | L, 0-3",
 "Final Sep 4 Stony Brook vs Penn | W, 3-2",
 "Final Sep 5 Stony Brook vs Coppin State | W, 3-2",
 "Final Sep 6 Stony Brook at Navy | W, 3-0",
 "Final Sep 10 Stony Brook at Rutgers | L, 0-3",
 "Final Sep 11 Stony Brook vs Rider | W, 3-0",
 "Final Sep 12 Stony Brook vs Delaware | W, 3-0",
 "Final Sep 18 Stony Brook at William & Mary | W, 3-0",
 "Final Sep 19 Stony Brook at William & Mary | W, 3-2",
 "Final Sep 25 Stony Brook vs Hofstra | L, 0-3",
 "Final Sep 26 Stony Brook vs Hofstra | L, 1-3",
 "Final Oct 2 Stony Brook at Elon | L, 1-3",
 "Final Oct 3 Stony Brook at Elon | W, 3-1",
 "Final Oct 16 Stony Brook vs Charleston | L, 1-3",
 "Final Oct 17 Stony Brook vs Charleston | L, 0-3",
 "Upcoming Oct 24, 2:00 PM Stony Brook at Northeastern | ",
 "Upcoming Oct 25, 2:00 PM Stony Brook at Northeastern | ",
 "Upcoming Oct 30, 5:30 PM Stony Brook vs UNCW | ",
 "Upcoming Oct 31, 1:00 PM Stony Brook vs UNCW | ",
 "Upcoming Nov 6, 6:00 PM Stony Brook at Campbell | ",
 "Upcoming Nov 7, 2:00 PM Stony Brook at Campbell | ",
 "Upcoming Nov 13, 5:00 PM Stony Brook vs Towson | ",
 "Upcoming Nov 14, 1:00 PM Stony Brook vs Towson | ",
 "Upcoming Nov 19 Stony Brook at CAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Stony Brook module checks passed");
