import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bucknellSchool} from '../src/schools/bucknell.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='bucknell');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bucknellHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/bucknell-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bucknellbison.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['bucknell'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',bucknellSchool.scheduleUrls],['roster',bucknellSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('bucknell|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bucknellbison.com',`${key} must stay on bucknellbison.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bucknellbison.com/sports/baseball/schedule"],"roster":["https://bucknellbison.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bucknellbison.com/sports/mens-basketball/schedule","https://bucknellbison.com/sports/womens-basketball/schedule"],"roster":["https://bucknellbison.com/sports/mens-basketball/roster","https://bucknellbison.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://bucknellbison.com/sports/womens-cross-country/schedule","https://bucknellbison.com/sports/mens-cross-country/schedule"],"roster":["https://bucknellbison.com/sports/womens-cross-country/roster","https://bucknellbison.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://bucknellbison.com/sports/field-hockey/schedule"],"roster":["https://bucknellbison.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://bucknellbison.com/sports/football/schedule"],"roster":["https://bucknellbison.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bucknellbison.com/sports/womens-golf/schedule","https://bucknellbison.com/sports/mens-golf/schedule"],"roster":["https://bucknellbison.com/sports/womens-golf/roster","https://bucknellbison.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://bucknellbison.com/sports/womens-lacrosse/schedule","https://bucknellbison.com/sports/mens-lacrosse/schedule"],"roster":["https://bucknellbison.com/sports/womens-lacrosse/roster","https://bucknellbison.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://bucknellbison.com/sports/mens-crew/schedule","https://bucknellbison.com/sports/womens-rowing/schedule"],"roster":["https://bucknellbison.com/sports/mens-crew/roster","https://bucknellbison.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://bucknellbison.com/sports/womens-soccer/schedule","https://bucknellbison.com/sports/mens-soccer/schedule"],"roster":["https://bucknellbison.com/sports/womens-soccer/roster","https://bucknellbison.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://bucknellbison.com/sports/softball/schedule"],"roster":["https://bucknellbison.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://bucknellbison.com/sports/womens-swimming-and-diving/schedule","https://bucknellbison.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://bucknellbison.com/sports/womens-swimming-and-diving/roster","https://bucknellbison.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://bucknellbison.com/sports/womens-tennis/schedule","https://bucknellbison.com/sports/mens-tennis/schedule"],"roster":["https://bucknellbison.com/sports/womens-tennis/roster","https://bucknellbison.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://bucknellbison.com/sports/womens-track-and-field/schedule","https://bucknellbison.com/sports/mens-track-and-field/schedule"],"roster":["https://bucknellbison.com/sports/womens-track-and-field/roster","https://bucknellbison.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://bucknellbison.com/sports/womens-volleyball/schedule"],"roster":["https://bucknellbison.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://bucknellbison.com/sports/womens-water-polo/schedule","https://bucknellbison.com/sports/mens-water-polo/schedule"],"roster":["https://bucknellbison.com/sports/womens-water-polo/roster","https://bucknellbison.com/sports/mens-water-polo/roster"],"combined":true},"Wrestling":{"schedule":["https://bucknellbison.com/sports/wrestling/schedule"],"roster":["https://bucknellbison.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'bucknell|"+sport+"':"),`${sport} routes must live in the Bucknell module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://bucknellbison.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bucknellHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=bucknell)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 24, 12:00 PM Men's · Bucknell vs Endicott (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Bucknell at Maryland | ",
 "Upcoming Nov 7, 5:00 PM Men's · Bucknell vs Old Dominion | ",
 "Upcoming Nov 10, 9:00 PM Men's · Bucknell at Virginia | ",
 "Upcoming Nov 13, 7:00 PM Men's · Bucknell vs Columbia | ",
 "Upcoming Nov 17, 7:00 PM Men's · Bucknell vs Akron | ",
 "Upcoming Nov 21, 11:00 AM Men's · Bucknell vs Siena | ",
 "Upcoming Nov 24, 8:00 PM Men's · Bucknell at Cornell | ",
 "Upcoming Nov 27, 3:30 PM Men's · Bucknell vs La Salle | ",
 "Upcoming Nov 28, 6:00 PM Men's · Bucknell at Pennsylvania | ",
 "Upcoming Dec 2, 7:00 PM Men's · Bucknell at Delaware | ",
 "Upcoming Dec 5, 2:00 PM Men's · Bucknell vs St. Thomas | ",
 "Upcoming Dec 8, 6:00 PM Men's · Bucknell at UMBC | ",
 "Upcoming Dec 18, 7:00 PM Men's · Bucknell vs Immaculata | ",
 "Upcoming Dec 21, 7:00 PM Men's · Bucknell at Hofstra | ",
 "Upcoming Dec 30, 7:00 PM Men's · Bucknell vs Colgate | ",
 "Upcoming Jan 2, 2:00 PM Men's · Bucknell at Navy | ",
 "Upcoming Jan 6, 6:00 PM Men's · Bucknell at Boston University | ",
 "Upcoming Jan 9, 2:00 PM Men's · Bucknell vs Lehigh | ",
 "Upcoming Jan 13, 6:00 PM Men's · Bucknell at Army | ",
 "Upcoming Jan 16, 2:00 PM Men's · Bucknell vs Loyola | ",
 "Upcoming Jan 20, 7:00 PM Men's · Bucknell vs Holy Cross | ",
 "Upcoming Jan 23, 2:00 PM Men's · Bucknell at Colgate | ",
 "Upcoming Jan 27, 7:00 PM Men's · Bucknell at American | ",
 "Upcoming Jan 30, 5:00 PM Men's · Bucknell vs Army | ",
 "Upcoming Feb 3, 7:00 PM Men's · Bucknell vs Navy | ",
 "Upcoming Feb 6, 2:00 PM Men's · Bucknell at Lehigh | ",
 "Upcoming Feb 10, 7:00 PM Men's · Bucknell at Holy Cross | ",
 "Upcoming Feb 13, 2:00 PM Men's · Bucknell vs Lafayette | ",
 "Upcoming Feb 15, 6:30 PM Men's · Bucknell vs Boston University | ",
 "Upcoming Feb 21, 1:00 PM Men's · Bucknell at Loyola | ",
 "Upcoming Feb 24, 7:00 PM Men's · Bucknell vs American | ",
 "Upcoming Feb 27, 1:00 PM Men's · Bucknell at Lafayette | ",
 "Upcoming Mar 2 Men's · Bucknell vs Patriot League First Round | ",
 "Upcoming Mar 4 Men's · Bucknell at Patriot League Quarterfinals | ",
 "Upcoming Mar 7 Men's · Bucknell at Patriot League Semifinals | ",
 "Upcoming Mar 10 Men's · Bucknell at Patriot League Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Bucknell at Florida | ",
 "Upcoming Nov 7, 3:00 PM Women's · Bucknell at Brown | ",
 "Upcoming Nov 11, 6:00 PM Women's · Bucknell vs Fordham | ",
 "Upcoming Nov 14, 1:00 PM Women's · Bucknell at Mount St. Mary's | ",
 "Upcoming Nov 18, 11:00 AM Women's · Bucknell at UAlbany | ",
 "Upcoming Nov 21, 5:00 PM Women's · Bucknell vs Iona | ",
 "Upcoming Nov 24, 11:00 AM Women's · Bucknell at Le Moyne | ",
 "Upcoming Nov 27, 1:00 PM Women's · Bucknell vs Delaware State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Bucknell at DePaul | ",
 "Upcoming Dec 5, 2:00 PM Women's · Bucknell at James Madison | ",
 "Upcoming Dec 8, 11:00 AM Women's · Bucknell vs Susquehanna | ",
 "Upcoming Dec 18, 10:00 AM Women's · Bucknell at Syracuse | ",
 "Upcoming Dec 21, 2:00 PM Women's · Bucknell vs Delaware | ",
 "Upcoming Dec 30, 6:00 PM Women's · Bucknell at Colgate | ",
 "Upcoming Jan 2, 2:00 PM Women's · Bucknell vs Navy | ",
 "Upcoming Jan 6, 6:00 PM Women's · Bucknell vs Boston University | ",
 "Upcoming Jan 9, 2:00 PM Women's · Bucknell at Lehigh | ",
 "Upcoming Jan 13, 6:00 PM Women's · Bucknell vs Army | ",
 "Upcoming Jan 16, 2:00 PM Women's · Bucknell at Loyola | ",
 "Upcoming Jan 20, 6:00 PM Women's · Bucknell at Holy Cross | ",
 "Upcoming Jan 23, 2:00 PM Women's · Bucknell vs Colgate | ",
 "Upcoming Jan 27, 6:00 PM Women's · Bucknell vs American | ",
 "Upcoming Jan 30, 2:00 PM Women's · Bucknell at Army | ",
 "Upcoming Feb 3, 6:00 PM Women's · Bucknell at Navy | ",
 "Upcoming Feb 6, 2:00 PM Women's · Bucknell vs Lehigh | ",
 "Upcoming Feb 10, 6:00 PM Women's · Bucknell vs Holy Cross | ",
 "Upcoming Feb 13, 2:00 PM Women's · Bucknell at Lafayette | ",
 "Upcoming Feb 17, 6:00 PM Women's · Bucknell at Boston University | ",
 "Upcoming Feb 20 Women's · Bucknell vs Loyola | ",
 "Upcoming Feb 23, 6:00 PM Women's · Bucknell at American | ",
 "Upcoming Feb 26, 6:00 PM Women's · Bucknell vs Lafayette | ",
 "Upcoming Mar 1 Women's · Bucknell at Patriot League Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Bucknell vs Lafayette | W, 21-40",
 "Final Sep 11 Women's · Bucknell at Spiked Shoe Invitational | 6th of 9",
 "Final Oct 2 Women's · Bucknell at Paul Short Run | 14th of 37",
 "Final Oct 17 Women's · Bucknell at ECAC-IC4A Championships | 6th of 26",
 "Final Oct 23 Women's · Bucknell at Bucknell Open | Completed",
 "Upcoming Oct 31, 11:00 AM Women's · Bucknell at Patriot League Championships | ",
 "Upcoming Nov 13 Women's · Bucknell at NCAA Mid Atlantic Regional Championships | ",
 "Upcoming Nov 21 Women's · Bucknell at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Bucknell vs Lafayette | W, 16-46",
 "Final Sep 11 Men's · Bucknell at Spiked Shoe Invitational | 6th of 8",
 "Final Oct 2 Men's · Bucknell at Paul Short Run | 25th of 35",
 "Final Oct 17 Men's · Bucknell at ECAC-IC4A Championships | 12th of 25",
 "Final Oct 23 Men's · Bucknell at Bucknell Open | Completed",
 "Upcoming Oct 31, 12:00 PM Men's · Bucknell at Patriot League Championships | ",
 "Upcoming Nov 13 Men's · Bucknell at NCAA Mid Atlantic Regional Championships | ",
 "Upcoming Nov 21 Men's · Bucknell at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Bucknell vs Ball State | W, 1-0",
 "Final Aug 30 Bucknell vs Sacred Heart | W, 2-1",
 "Final Sep 4 Bucknell vs Quinnipiac | W, 2-1",
 "Final Sep 6 Bucknell vs Cornell | W, 3-1",
 "Final Sep 13 Bucknell vs Syracuse | L, 0-10",
 "Final Sep 18 Bucknell vs American | L, 0-1",
 "Final Sep 20 Bucknell at Kent State | L, 1-3",
 "Final Sep 26 Bucknell vs Boston University | L, 2-7",
 "Final Sep 28 Bucknell vs Penn State | L, 0-3",
 "Final Oct 3 Bucknell at Holy Cross | L, 1-2",
 "Final Oct 9 Bucknell vs Lafayette | L, 1-2",
 "Final Oct 16 Bucknell at Colgate | W, 2-1",
 "Final Oct 18 Bucknell vs La Salle | W, 1-0",
 "Final Oct 23 Bucknell at Lehigh | W, 2-1",
 "Upcoming Oct 27, 6:00 PM Bucknell vs Lock Haven | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Bucknell at Richmond | L, 14-35",
 "Final Sep 5 Bucknell vs Villanova | L, 16-17",
 "Final Sep 12 Bucknell at VMI | W, 14-3",
 "Final Sep 19 Bucknell vs Pennsylvania | L, 7-20",
 "Final Sep 26 Bucknell at Pittsburgh | L, 0-59",
 "Final Oct 10 Bucknell at Georgetown | L, 14-21",
 "Final Oct 17 Bucknell vs Lafayette | L, 7-20",
 "Today Oct 24, 1:00 PM Bucknell at Holy Cross | ",
 "Upcoming Oct 31, 12:00 PM Bucknell at Lehigh | ",
 "Upcoming Nov 7, 1:00 PM Bucknell vs Fordham | ",
 "Upcoming Nov 14, 1:00 PM Bucknell at William & Mary | ",
 "Upcoming Nov 21, 1:00 PM Bucknell vs Colgate | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Bucknell at Nittany Lion Invitational | 8th of 18",
 "Final Sep 11 Women's · Bucknell at Bucknell Invitational | 1st of 14",
 "Final Sep 28 Women's · Bucknell at Golf Galaxy Collegiate | 1st of 7",
 "Final Oct 12 Women's · Bucknell at Quinnipiac Classic | 2nd of 10",
 "Final Oct 19 Women's · Bucknell at Spider Invitational | 4th of 7",
 "Upcoming Oct 26 Women's · Bucknell at Keswick Cup | ",
 "Upcoming Apr 23 Women's · Bucknell at Patriot League Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Bucknell at Alex Lagowitz Memorial | 5th of 13",
 "Final Sep 19 Men's · Bucknell at The Goat | 14th of 14",
 "Final Oct 4 Men's · Bucknell at Matthews Auto Collegiate Golf Invitational | 1st of 13",
 "Final Oct 11 Men's · Bucknell at Bucknell Invitational | 10th of 18",
 "Final Oct 19 Men's · Bucknell at Delaware Invitational | T8th of 14",
 "Upcoming Feb 28 Men's · Bucknell at Loyola Intercollegiate | ",
 "Upcoming Mar 21 Men's · Bucknell at UC San Diego Invitational | ",
 "Upcoming Apr 5 Men's · Bucknell at Wildcat Invitational | ",
 "Upcoming Apr 10 Men's · Bucknell at Princeton Invitational | ",
 "Upcoming Apr 17 Men's · Bucknell at Rutgers Invitational | ",
 "Upcoming Apr 30 Men's · Bucknell at Patriot League Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_menscrew=parse("Rowing","mens-crew");
  assert.deepEqual(v_menscrew.map(line),[
 "Upcoming Nov 1 Men's · Bucknell at Princeton Chase | ",
 "Upcoming Nov 7 Men's · Bucknell at Wahoo Henley | ",
 "Upcoming Mar 27, 10:00 AM Men's · Bucknell vs Susquehanna Duals | ",
 "Upcoming May 2 Men's · Bucknell at MARC Championship | ",
 "Upcoming May 21 Men's · Bucknell at ACRA National Championships | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Nov 1 Women's · Bucknell at Princeton Chase | ",
 "Upcoming Nov 14 Women's · Bucknell at US Rowing Small Boat National Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Bucknell at Montana | W, 1-0",
 "Final Aug 16 Women's · Bucknell at Eastern Washington | L, 0-1",
 "Final Aug 20 Women's · Bucknell vs Mount St. Mary's | W, 8-1",
 "Final Aug 23 Women's · Bucknell vs La Salle | W, 4-0",
 "Final Aug 27 Women's · Bucknell at Penn State | L, 0-5",
 "Final Aug 30 Women's · Bucknell vs Saint Joseph's | L, 0-1",
 "Final Sep 3 Women's · Bucknell vs Delaware | L, 0-2",
 "Final Sep 6 Women's · Bucknell at Towson | L, 1-3",
 "Final Sep 10 Women's · Bucknell at Villanova | T, 0-0",
 "Final Sep 19 Women's · Bucknell vs Lehigh | W, 3-1",
 "Final Sep 26 Women's · Bucknell vs Holy Cross | T, 0-0",
 "Final Sep 30 Women's · Bucknell at Lafayette | W, 1-0",
 "Final Oct 3 Women's · Bucknell vs Loyola | T, 0-0",
 "Final Oct 10 Women's · Bucknell at Boston University | W, 2-1",
 "Final Oct 16 Women's · Bucknell at Navy | L, 0-1",
 "Today Oct 24, 1:00 PM Women's · Bucknell vs Army | ",
 "Upcoming Oct 31, 2:00 PM Women's · Bucknell vs Colgate | ",
 "Upcoming Nov 4, 1:00 PM Women's · Bucknell at American | ",
 "Upcoming Nov 8 Women's · Bucknell at Patriot League Quarterfinals | ",
 "Upcoming Nov 11 Women's · Bucknell at Patriot League Semifinals | ",
 "Upcoming Nov 15 Women's · Bucknell at Patriot League Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Bucknell vs Hofstra | L, 1-2",
 "Final Aug 24 Men's · Bucknell at Pittsburgh | L, 1-3",
 "Final Aug 28 Men's · Bucknell vs Fordham | L, 0-2",
 "Final Sep 6 Men's · Bucknell at Old Dominion | L, 0-3",
 "Final Sep 12 Men's · Bucknell vs Lafayette | W, 1-0",
 "Final Sep 15 Men's · Bucknell vs George Mason | W, 3-1",
 "Final Sep 19 Men's · Bucknell vs Colgate | T, 0-0",
 "Final Sep 22 Men's · Bucknell vs Saint Joseph's | W, 2-1",
 "Final Sep 28 Men's · Bucknell at Boston University | L, 0-5",
 "Final Oct 3 Men's · Bucknell at American | L, 0-2",
 "Final Oct 6 Men's · Bucknell vs Mount St. Mary's | W, 1-0",
 "Final Oct 10 Men's · Bucknell vs Holy Cross | W, 1-0",
 "Final Oct 17 Men's · Bucknell vs Lehigh | W, 2-0",
 "Final Oct 20 Men's · Bucknell vs Cornell | L, 1-6",
 "Upcoming Oct 25, 4:00 PM Men's · Bucknell at Army | ",
 "Upcoming Oct 30, 7:00 PM Men's · Bucknell vs Navy | ",
 "Upcoming Nov 3, 6:00 PM Men's · Bucknell at Loyola | ",
 "Upcoming Nov 7 Men's · Bucknell at Patriot League Quarterfinals | ",
 "Upcoming Nov 10 Men's · Bucknell at Patriot League Semifinals | ",
 "Upcoming Nov 14 Men's · Bucknell at Patriot League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 26 Bucknell vs Bloomsburg (Game 1) | W, 3-1",
 "Final Sep 26 Bucknell vs Bloomsburg (Game 2) | L, 2-4",
 "Final Oct 3 Bucknell at Penn State | L, 2-11",
 "Final Oct 3 Bucknell vs Seton Hill | W, 3-2",
 "Final Oct 4 Bucknell vs Lock Haven (Game 1) | W, 5-0",
 "Final Oct 4 Bucknell vs Lock Haven (Game 2) | L, 4-10",
 "Final Oct 18 Bucknell vs Mansfield | W, 20-0"
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · Bucknell vs Boston University | L, 143-157",
 "Today Oct 24, 12:00 PM Women's · Bucknell vs Howard (Tri-Meet) | ",
 "Today Oct 24, 12:00 PM Women's · Bucknell vs Seton Hall (Tri-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Women's · Bucknell vs Navy (Quad-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Women's · Bucknell vs American (Quad-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Women's · Bucknell vs Lafayette (Quad-Meet) | ",
 "Upcoming Dec 4 Women's · Bucknell at Bucknell Invitational | ",
 "Upcoming Jan 15, 12:00 PM Women's · Bucknell vs Loyola | ",
 "Upcoming Jan 16, 12:00 PM Women's · Bucknell vs Army | ",
 "Upcoming Jan 23, 1:00 PM Women's · Bucknell vs Lehigh | ",
 "Upcoming Jan 30, 12:00 PM Women's · Bucknell at Bison Invitational | ",
 "Upcoming Feb 17, 5:00 PM Women's · Bucknell at Patriot League Championships | ",
 "Upcoming Mar 17 Women's · Bucknell at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 17 Men's · Bucknell vs Boston University | L, 101-199",
 "Today Oct 24, 12:00 PM Men's · Bucknell vs Seton Hall (Tri-Meet) | ",
 "Today Oct 24, 12:00 PM Men's · Bucknell vs Howard (Tri-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Men's · Bucknell vs Navy (Quad-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Men's · Bucknell vs American (Quad-Meet) | ",
 "Upcoming Nov 7, 12:00 PM Men's · Bucknell vs Lafayette (Quad-Meet) | ",
 "Upcoming Dec 4 Men's · Bucknell at Bucknell Invitational | ",
 "Upcoming Jan 15, 12:00 PM Men's · Bucknell vs Loyola | ",
 "Upcoming Jan 16, 12:00 PM Men's · Bucknell vs Army | ",
 "Upcoming Jan 23, 1:00 PM Men's · Bucknell vs Lehigh | ",
 "Upcoming Jan 30, 12:00 PM Men's · Bucknell at Bison Invitational | ",
 "Upcoming Feb 17, 5:00 PM Men's · Bucknell at Patriot League Championships | ",
 "Upcoming Mar 24 Men's · Bucknell at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Bucknell at Bucknell Tournament | Completed",
 "Final Sep 25 Women's · Bucknell at West Point Tournament | Completed",
 "Final Oct 2 Women's · Bucknell at Big Easy Classic | Completed",
 "Today Oct 23 Women's · Bucknell at Patriot League ITA Conference Masters Qualifier | ",
 "Today Oct 24, 12:00 PM Women's · Bucknell vs Millersville | ",
 "Upcoming Jan 24, 12:00 PM Women's · Bucknell vs Saint Joseph's | ",
 "Upcoming Jan 29 Women's · Bucknell at Seton Hall | ",
 "Upcoming Jan 30 Women's · Bucknell at NJIT | ",
 "Upcoming Feb 13, 2:00 PM Women's · Bucknell at Stony Brook | ",
 "Upcoming Feb 14 Women's · Bucknell at Drexel | ",
 "Upcoming Feb 19 Women's · Bucknell at Buffalo | ",
 "Upcoming Feb 20 Women's · Bucknell at Niagara | ",
 "Upcoming Feb 27, 1:00 PM Women's · Bucknell vs Mercyhurst | ",
 "Upcoming Feb 28 Women's · Bucknell at Wagner | ",
 "Upcoming Mar 5 Women's · Bucknell vs Delaware | ",
 "Upcoming Mar 6 Women's · Bucknell at Norfolk State | ",
 "Upcoming Mar 7 Women's · Bucknell at William & Mary | ",
 "Upcoming Mar 21, 1:00 PM Women's · Bucknell at Lafayette | ",
 "Upcoming Mar 28, 12:00 PM Women's · Bucknell vs Navy | ",
 "Upcoming Apr 3, 1:00 PM Women's · Bucknell vs Colgate | ",
 "Upcoming Apr 4 Women's · Bucknell at St. Bonaventure | ",
 "Upcoming Apr 10, 1:00 PM Women's · Bucknell vs Howard | ",
 "Upcoming Apr 11, 12:00 PM Women's · Bucknell vs Loyola | ",
 "Upcoming Apr 17, 1:00 PM Women's · Bucknell vs Lehigh | ",
 "Upcoming Apr 18 Women's · Bucknell at Villanova | ",
 "Upcoming Apr 24 Women's · Bucknell at Army | ",
 "Upcoming Apr 29 Women's · Bucknell at Patriot League First Round | ",
 "Upcoming Apr 30 Women's · Bucknell at Patriot League Quarterfinals | ",
 "Upcoming May 1 Women's · Bucknell at Patriot League Semifinals | ",
 "Upcoming May 2 Women's · Bucknell at Patriot League Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Bucknell at Carousel Classic | Completed",
 "Final Sep 25 Men's · Bucknell at Carnegie Mellon Tournament | Completed",
 "Final Oct 15 Men's · Bucknell at ITA Regionals | Completed",
 "Today Oct 23 Men's · Bucknell at Patriot League ITA Conference Masters Qualifier | ",
 "Upcoming Nov 5 Men's · Bucknell at ITA Conference Masters | ",
 "Upcoming Nov 6 Men's · Bucknell at Navy Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Bucknell vs Ohio | L, 0-3",
 "Final Aug 28 Bucknell at Marshall | L, 0-3",
 "Final Aug 29 Bucknell vs Niagara | W, 3-1",
 "Final Sep 4 Bucknell vs New Hampshire | L, 0-3",
 "Final Sep 4 Bucknell at Boston College | L, 0-3",
 "Final Sep 5 Bucknell vs Stonehill | W, 3-1",
 "Final Sep 11 Bucknell vs Le Moyne | W, 3-0",
 "Final Sep 12 Bucknell vs Delaware State | W, 3-0",
 "Final Sep 12 Bucknell at Siena | L, 0-3",
 "Final Sep 18 Bucknell at Lafayette | W, 3-2",
 "Final Sep 19 Bucknell at Lehigh | L, 0-3",
 "Final Sep 25 Bucknell at Loyola | L, 0-3",
 "Final Sep 26 Bucknell at Navy | L, 1-3",
 "Final Oct 2 Bucknell vs Army | W, 3-1",
 "Final Oct 3 Bucknell vs Colgate | W, 3-2",
 "Final Oct 10 Bucknell vs American | L, 0-3",
 "Final Oct 11 Bucknell vs Holy Cross | L, 1-3",
 "Final Oct 17 Bucknell at Holy Cross | L, 2-3",
 "Today Oct 24, 4:00 PM Bucknell vs Lehigh | ",
 "Upcoming Oct 25, 2:00 PM Bucknell vs Lafayette | ",
 "Upcoming Oct 30, 7:00 PM Bucknell vs Loyola | ",
 "Upcoming Oct 31, 5:00 PM Bucknell vs Navy | ",
 "Upcoming Nov 6, 6:00 PM Bucknell at Army | ",
 "Upcoming Nov 7, 4:00 PM Bucknell at Colgate | ",
 "Upcoming Nov 13, 6:00 PM Bucknell at American | ",
 "Upcoming Nov 17 Bucknell at Patriot League Quarterfinals | ",
 "Upcoming Nov 20 Bucknell at Patriot League Semifinals | ",
 "Upcoming Nov 22 Bucknell at Patriot League Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Bucknell at UC San Diego | L, 9-19",
 "Final Aug 28 Men's · Bucknell vs Long Beach State | L, 15-28",
 "Final Aug 29 Men's · Bucknell vs Occidental | W, 22-10",
 "Final Aug 29 Men's · Bucknell vs UCLA | L, 8-23",
 "Final Aug 30 Men's · Bucknell vs Saint Mary's | L, 9-12",
 "Final Sep 12 Men's · Bucknell vs Santa Clara | L, 9-16",
 "Final Sep 13 Men's · Bucknell vs Saint Mary's | W, 14-9",
 "Final Sep 13 Men's · Bucknell vs Iona | W, 16-13",
 "Final Sep 19 Men's · Bucknell vs Fordham | L, 11-21",
 "Final Sep 19 Men's · Bucknell vs Salem | W, 15-9",
 "Final Sep 20 Men's · Bucknell vs Wagner | W, 19-14",
 "Final Sep 20 Men's · Bucknell vs LIU | W, 17-9",
 "Final Sep 26 Men's · Bucknell at Mercyhurst | W, 20-9",
 "Final Sep 26 Men's · Bucknell vs Mount St. Mary's (Md.) | W, 27-14",
 "Final Oct 3 Men's · Bucknell vs George Washington | W, 14-13",
 "Final Oct 4 Men's · Bucknell vs Navy | L, 8-15",
 "Final Oct 10 Men's · Bucknell vs Mount St. Mary's (Md.) | W, 15-13",
 "Final Oct 10 Men's · Bucknell vs Mercyhurst | W, 20-6",
 "Final Oct 17 Men's · Bucknell at Fordham | L, 5-19",
 "Final Oct 17 Men's · Bucknell at Wagner | L, 14-15",
 "Final Oct 23 Men's · Bucknell vs Saint Mary's | L, 10-12",
 "Today Oct 24, 2:40 PM Men's · Bucknell vs Pomona-Pitzer | ",
 "Today Oct 24, 6:40 PM Men's · Bucknell vs Pacific | ",
 "Upcoming Oct 25, 12:20 PM Men's · Bucknell at San Jose State | ",
 "Upcoming Nov 1, 10:00 AM Men's · Bucknell at George Washington | ",
 "Upcoming Nov 1, 3:00 PM Men's · Bucknell at Navy | ",
 "Upcoming Nov 20 Men's · Bucknell at MAWPC Championships | ",
 "Upcoming Nov 21 Men's · Bucknell at MAWPC Championships | ",
 "Upcoming Nov 22 Men's · Bucknell at MAWPC Championships | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 7:00 PM Bucknell at Iowa State | ",
 "Upcoming Nov 7 Bucknell at Michigan State Open | ",
 "Upcoming Nov 15, 12:00 PM Bucknell vs LIU | ",
 "Upcoming Nov 15, 5:00 PM Bucknell at Lock Haven | ",
 "Upcoming Nov 20, 7:00 PM Bucknell at North Dakota State | ",
 "Upcoming Nov 22, 2:00 PM Bucknell at Minnesota | ",
 "Upcoming Dec 4 Bucknell at Cliff Keen Invitational | ",
 "Upcoming Dec 20, 12:00 PM Bucknell at Hofstra | ",
 "Upcoming Dec 20, 2:00 PM Bucknell at Purdue | ",
 "Upcoming Jan 2 Bucknell at Southern Scuffle | ",
 "Upcoming Jan 15, 6:00 PM Bucknell vs Army | ",
 "Upcoming Jan 16, 1:00 PM Bucknell at Cornell | ",
 "Upcoming Jan 30, 5:30 PM Bucknell at Binghamton | ",
 "Upcoming Feb 5, 6:00 PM Bucknell at Morgan State | ",
 "Upcoming Feb 7, 2:00 PM Bucknell vs Navy | ",
 "Upcoming Feb 12, 6:00 PM Bucknell vs Lehigh | ",
 "Upcoming Feb 14, 12:00 PM Bucknell at American | ",
 "Upcoming Feb 20, 2:00 PM Bucknell vs Bloomsburg | ",
 "Upcoming Feb 20, 4:00 PM Bucknell vs Columbia | ",
 "Upcoming Mar 5 Bucknell at EIWA Championships | ",
 "Upcoming Mar 18 Bucknell at NCAA National Championships | "
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
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_menscrew,"Rowing mens-crew");
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
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Bucknell module checks passed");
