import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {holyCrossSchool} from '../src/schools/holy-cross.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='holy-cross');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,holyCrossHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/holy-cross-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goholycross.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['holy-cross'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',holyCrossSchool.scheduleUrls],['roster',holyCrossSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('holy-cross|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goholycross.com',`${key} must stay on goholycross.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goholycross.com/sports/baseball/schedule"],"roster":["https://goholycross.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goholycross.com/sports/mens-basketball/schedule","https://goholycross.com/sports/womens-basketball/schedule"],"roster":["https://goholycross.com/sports/mens-basketball/roster","https://goholycross.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goholycross.com/sports/womens-cross-country/schedule","https://goholycross.com/sports/mens-cross-country/schedule"],"roster":["https://goholycross.com/sports/womens-cross-country/roster","https://goholycross.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://goholycross.com/sports/field-hockey/schedule"],"roster":["https://goholycross.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goholycross.com/sports/football/schedule"],"roster":["https://goholycross.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goholycross.com/sports/womens-golf/schedule","https://goholycross.com/sports/mens-golf/schedule"],"roster":["https://goholycross.com/sports/womens-golf/roster","https://goholycross.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://goholycross.com/sports/mens-ice-hockey/schedule","https://goholycross.com/sports/womens-ice-hockey/schedule"],"roster":["https://goholycross.com/sports/mens-ice-hockey/roster","https://goholycross.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://goholycross.com/sports/womens-lacrosse/schedule","https://goholycross.com/sports/mens-lacrosse/schedule"],"roster":["https://goholycross.com/sports/womens-lacrosse/roster","https://goholycross.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goholycross.com/sports/womens-rowing/schedule"],"roster":["https://goholycross.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://goholycross.com/sports/womens-soccer/schedule","https://goholycross.com/sports/mens-soccer/schedule"],"roster":["https://goholycross.com/sports/womens-soccer/roster","https://goholycross.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goholycross.com/sports/softball/schedule"],"roster":["https://goholycross.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goholycross.com/sports/womens-swimming-and-diving/schedule","https://goholycross.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goholycross.com/sports/womens-swimming-and-diving/roster","https://goholycross.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goholycross.com/sports/womens-tennis/schedule","https://goholycross.com/sports/mens-tennis/schedule"],"roster":["https://goholycross.com/sports/womens-tennis/roster","https://goholycross.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goholycross.com/sports/womens-track-and-field/schedule","https://goholycross.com/sports/mens-track-and-field/schedule"],"roster":["https://goholycross.com/sports/womens-track-and-field/roster","https://goholycross.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goholycross.com/sports/womens-volleyball/schedule"],"roster":["https://goholycross.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'holy-cross|"+sport+"':"),`${sport} routes must live in the Holy Cross module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goholycross.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.holyCrossHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=holy-cross)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Holy Cross at Vermont (Exhibition) | L, 80-90",
 "Upcoming Oct 27, 7:00 PM Men's · Holy Cross vs Central Connecticut State (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Holy Cross at Rhode Island | ",
 "Upcoming Nov 6, 7:00 PM Men's · Holy Cross at Villanova | ",
 "Upcoming Nov 11, 7:00 PM Men's · Holy Cross vs Furman | ",
 "Upcoming Nov 15, 2:00 PM Men's · Holy Cross vs UAlbany | ",
 "Upcoming Nov 18, 7:00 PM Men's · Holy Cross vs Brown | ",
 "Upcoming Nov 20, 7:00 PM Men's · Holy Cross vs Harvard | ",
 "Upcoming Nov 25, 5:00 PM Men's · Holy Cross at Dartmouth | ",
 "Upcoming Nov 29, 2:00 PM Men's · Holy Cross vs New Hampshire | ",
 "Upcoming Dec 2, 7:00 PM Men's · Holy Cross at Northeastern | ",
 "Upcoming Dec 5, 1:00 PM Men's · Holy Cross at Stonehill | ",
 "Upcoming Dec 8, 7:00 PM Men's · Holy Cross vs Johnson & Wales | ",
 "Upcoming Dec 15, 7:00 PM Men's · Holy Cross vs Lesley | ",
 "Upcoming Dec 17, 7:00 PM Men's · Holy Cross at Texas A&M | ",
 "Upcoming Dec 19, 5:00 PM Men's · Holy Cross at TCU | ",
 "Upcoming Dec 30, 2:00 PM Men's · Holy Cross vs Army West Point | ",
 "Upcoming Jan 2, 2:00 PM Men's · Holy Cross at American | ",
 "Upcoming Jan 6, 7:00 PM Men's · Holy Cross vs Navy | ",
 "Upcoming Jan 9, 2:00 PM Men's · Holy Cross at Loyola (Md.) | ",
 "Upcoming Jan 13, 6:00 PM Men's · Holy Cross at Lehigh | ",
 "Upcoming Jan 16, 2:00 PM Men's · Holy Cross vs Colgate | ",
 "Upcoming Jan 20, 7:00 PM Men's · Holy Cross at Bucknell | ",
 "Upcoming Jan 23, 2:00 PM Men's · Holy Cross vs Boston University | ",
 "Upcoming Jan 27, 6:00 PM Men's · Holy Cross at Army West Point | ",
 "Upcoming Jan 30, 1:00 PM Men's · Holy Cross vs Loyola (Md.) | ",
 "Upcoming Feb 1, 6:30 PM Men's · Holy Cross at Lafayette | ",
 "Upcoming Feb 6, 2:00 PM Men's · Holy Cross at Navy | ",
 "Upcoming Feb 10, 7:00 PM Men's · Holy Cross vs Bucknell | ",
 "Upcoming Feb 13, 2:00 PM Men's · Holy Cross vs Lehigh | ",
 "Upcoming Feb 17, 7:00 PM Men's · Holy Cross at Colgate | ",
 "Upcoming Feb 21, 1:00 PM Men's · Holy Cross at Boston University | ",
 "Upcoming Feb 24, 7:00 PM Men's · Holy Cross vs Lafayette | ",
 "Upcoming Feb 27, 12:00 PM Men's · Holy Cross vs American | ",
 "Upcoming Mar 2 Men's · Holy Cross at Patriot League Tournament First Round | ",
 "Upcoming Mar 4 Men's · Holy Cross at Patriot League Tournament Quarterfinals | ",
 "Upcoming Mar 7 Men's · Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Mar 10, 7:00 PM Men's · Holy Cross at Patriot League Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Holy Cross at Boston College | ",
 "Upcoming Nov 5, 6:00 PM Women's · Holy Cross vs Dartmouth | ",
 "Upcoming Nov 9, 6:00 PM Women's · Holy Cross vs Harvard | ",
 "Upcoming Nov 12, 4:30 PM Women's · Holy Cross at Brown | ",
 "Upcoming Nov 16, 6:00 PM Women's · Holy Cross vs Bryant | ",
 "Upcoming Nov 22, 2:00 PM Women's · Holy Cross at Richmond | ",
 "Upcoming Nov 25, 1:00 PM Women's · Holy Cross vs Rhode Island | ",
 "Upcoming Nov 30, 7:00 PM Women's · Holy Cross at Sacred Heart | ",
 "Upcoming Dec 7, 6:00 PM Women's · Holy Cross at Massachusetts | ",
 "Upcoming Dec 16, 6:00 PM Women's · Holy Cross vs Western Kentucky | ",
 "Upcoming Dec 20, 12:00 PM Women's · Holy Cross at Saint Joseph's | ",
 "Upcoming Dec 21, 11:00 AM Women's · Holy Cross vs Liberty or Washington State | ",
 "Upcoming Dec 30, 6:00 PM Women's · Holy Cross at Army West Point | ",
 "Upcoming Jan 2, 2:00 PM Women's · Holy Cross vs American | ",
 "Upcoming Jan 6, 6:00 PM Women's · Holy Cross at Navy | ",
 "Upcoming Jan 9, 2:00 PM Women's · Holy Cross vs Loyola (Md.) | ",
 "Upcoming Jan 13, 10:30 AM Women's · Holy Cross vs Lehigh | ",
 "Upcoming Jan 16, 2:00 PM Women's · Holy Cross at Colgate | ",
 "Upcoming Jan 20, 6:00 PM Women's · Holy Cross vs Bucknell | ",
 "Upcoming Jan 23, 2:00 PM Women's · Holy Cross at Boston University | ",
 "Upcoming Jan 27, 6:00 PM Women's · Holy Cross vs Army West Point | ",
 "Upcoming Jan 30, 1:00 PM Women's · Holy Cross at Loyola (Md.) | ",
 "Upcoming Feb 3, 6:00 PM Women's · Holy Cross vs Lafayette | ",
 "Upcoming Feb 6, 3:00 PM Women's · Holy Cross vs Navy | ",
 "Upcoming Feb 10, 6:00 PM Women's · Holy Cross at Bucknell | ",
 "Upcoming Feb 13 Women's · Holy Cross at Lehigh | ",
 "Upcoming Feb 17, 6:00 PM Women's · Holy Cross vs Colgate | ",
 "Upcoming Feb 20, 2:00 PM Women's · Holy Cross vs Boston University | ",
 "Upcoming Feb 23, 6:00 PM Women's · Holy Cross at Lafayette | ",
 "Upcoming Feb 26, 6:00 PM Women's · Holy Cross at American | ",
 "Upcoming Mar 1 Women's · Holy Cross at Patriot League Tournament First Round | ",
 "Upcoming Mar 3 Women's · Holy Cross at Patriot League Tournament Quarterfinals | ",
 "Upcoming Mar 6 Women's · Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Mar 9 Women's · Holy Cross at Patriot League Tournament Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Holy Cross at Ken O'Brien Minuteman Invitational | 2nd of 3",
 "Final Sep 19 Women's · Holy Cross at UMass Dartmouth Invitational | 4th of 33",
 "Final Oct 9 Women's · Holy Cross at New England Championship | 5th of 18",
 "Final Oct 23 Women's · Holy Cross at Rothenberg Run | Completed",
 "Upcoming Oct 31, 11:00 AM Women's · Holy Cross at Patriot League Championship | ",
 "Upcoming Nov 13 Women's · Holy Cross at NCAA Northeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Holy Cross at Ken O'Brien Minuteman Invitational | 3rd of 3",
 "Final Sep 19 Men's · Holy Cross at UMass Dartmouth Invitational | 3rd of 32",
 "Final Oct 9 Men's · Holy Cross at New England Championship | 4th of 18",
 "Final Oct 23 Men's · Holy Cross at Rothenberg Run | Completed",
 "Upcoming Oct 31, 11:00 AM Men's · Holy Cross at Patriot League Championship | ",
 "Upcoming Nov 13 Men's · Holy Cross at NCAA Northeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Holy Cross vs Stonehill | W, 2-1",
 "Final Aug 30 Holy Cross at Fairfield | L, 0-4",
 "Final Sep 4 Holy Cross vs Northeastern | W, 3-2",
 "Final Sep 6 Holy Cross vs Merrimack | W, 3-0",
 "Final Sep 11 Holy Cross vs Stanford | L, 0-3",
 "Final Sep 13 Holy Cross vs Bryant | W, 3-1",
 "Final Sep 19 Holy Cross at Lehigh | W, 4-0",
 "Final Sep 25 Holy Cross vs Lafayette | L, 0-1",
 "Final Oct 3 Holy Cross vs Bucknell | W, 2-1",
 "Final Oct 9 Holy Cross at Boston University | L, 1-3",
 "Final Oct 11 Holy Cross at Providence | W, 2-1",
 "Final Oct 14 Holy Cross vs New Haven | W, 8-0",
 "Final Oct 18 Holy Cross at UAlbany | L, 1-3",
 "Upcoming Oct 25, 12:00 PM Holy Cross vs American | ",
 "Upcoming Oct 31, 11:00 AM Holy Cross at Colgate | ",
 "Upcoming Nov 5 Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Nov 7 Holy Cross at Patriot League Tournament Championship Game | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Holy Cross vs Lehigh | L, 10-35",
 "Final Sep 5 Holy Cross at Colgate | L, 10-35",
 "Final Sep 12 Holy Cross at Miami (Ohio) | L, 7-45",
 "Final Sep 19 Holy Cross vs Yale | L, 28-38",
 "Final Sep 26 Holy Cross at Lafayette | W, 38-30",
 "Final Oct 3 Holy Cross at William & Mary | W, 41-14",
 "Final Oct 17 Holy Cross at Harvard | L, 7-30",
 "Today Oct 24, 1:00 PM Holy Cross vs Bucknell | ",
 "Upcoming Oct 31, 1:00 PM Holy Cross vs Richmond | ",
 "Upcoming Nov 7, 12:30 PM Holy Cross at Georgetown | ",
 "Upcoming Nov 14, 12:00 PM Holy Cross vs Villanova | ",
 "Upcoming Nov 21, 12:00 PM Holy Cross vs Fordham | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Holy Cross at Warrior Invitational | 6th of 9",
 "Final Sep 28 Women's · Holy Cross at Stonehill Invitational | 8th of 9",
 "Final Oct 12 Women's · Holy Cross at Doonbeg Dash | 2nd of 2",
 "Final Oct 19 Women's · Holy Cross at Crusader Invitational | 7th of 13",
 "Upcoming Feb 20 Women's · Holy Cross at Space Coast Classic | ",
 "Upcoming Mar 12 Women's · Holy Cross at Northern Kentucky Spring Fling | ",
 "Upcoming Mar 22 Women's · Holy Cross at Kingsmill Intercollegiate | ",
 "Upcoming Apr 12 Women's · Holy Cross at Lehigh Spring Spectacular | ",
 "Upcoming Apr 23 Women's · Holy Cross at Patriot League Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Holy Cross at Alex Lagowitz Memorial | 3rd of 14",
 "Final Sep 19 Men's · Holy Cross at Goat Invitational | 5th of 15",
 "Final Sep 27 Men's · Holy Cross at UConn Invitational | 7th of 14",
 "Final Oct 5 Men's · Holy Cross at Testudo Cup | 13th of 14",
 "Final Oct 12 Men's · Holy Cross at Metropolis Intercollegiate | 2nd of 12",
 "Upcoming Feb 7 Men's · Holy Cross at Dorado Beach Collegiate | ",
 "Upcoming Mar 21 Men's · Holy Cross at UC San Diego Invitational | ",
 "Upcoming Mar 29 Men's · Holy Cross at Columbia Spring Invitational | ",
 "Upcoming Apr 11 Men's · Holy Cross at Abarta Coca-Cola Collegiate Invitational | ",
 "Upcoming Apr 30 Men's · Holy Cross at Patriot League Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Holy Cross vs Maine | L, 1-4",
 "Final Oct 3 Men's · Holy Cross vs Maine | W, 3-2",
 "Final Oct 9 Men's · Holy Cross at Arizona State | W, 2-1",
 "Final Oct 10 Men's · Holy Cross at Arizona State | L, 4-5",
 "Final Oct 17 Men's · Holy Cross vs Army West Point | L, 2-5",
 "Final Oct 18 Men's · Holy Cross vs Army West Point | L, 1-3",
 "Upcoming Oct 23, 7:00 PM Men's · Holy Cross vs Sacred Heart | ",
 "Today Oct 24, 5:00 PM Men's · Holy Cross at Sacred Heart | ",
 "Upcoming Oct 30, 7:00 PM Men's · Holy Cross vs Bentley | ",
 "Upcoming Oct 31, 6:00 PM Men's · Holy Cross at Bentley | ",
 "Upcoming Nov 6, 7:00 PM Men's · Holy Cross at Merrimack | ",
 "Upcoming Nov 7, 7:00 PM Men's · Holy Cross vs Northeastern | ",
 "Upcoming Nov 13, 7:00 PM Men's · Holy Cross at Niagara | ",
 "Upcoming Nov 14, 6:00 PM Men's · Holy Cross at Niagara | ",
 "Upcoming Nov 21, 3:30 PM Men's · Holy Cross at Quinnipiac | ",
 "Upcoming Nov 27, 7:00 PM Men's · Holy Cross vs Air Force | ",
 "Upcoming Nov 28, 5:00 PM Men's · Holy Cross vs Air Force | ",
 "Upcoming Dec 8, 7:00 PM Men's · Holy Cross at Cornell | ",
 "Upcoming Dec 15, 6:30 PM Men's · Holy Cross at Dartmouth | ",
 "Upcoming Dec 28, 2:05 PM Men's · Holy Cross at Massachusetts-Lowell (Exhibition) | ",
 "Upcoming Jan 3, 6:00 PM Men's · Holy Cross vs Maryville (Exhibition) | ",
 "Upcoming Jan 8, 7:00 PM Men's · Holy Cross at Canisius | ",
 "Upcoming Jan 9, 5:00 PM Men's · Holy Cross at Canisius | ",
 "Upcoming Jan 15, 7:00 PM Men's · Holy Cross vs Niagara | ",
 "Upcoming Jan 16, 6:00 PM Men's · Holy Cross vs Niagara | ",
 "Upcoming Jan 22, 7:00 PM Men's · Holy Cross at RIT | ",
 "Upcoming Jan 23, 5:00 PM Men's · Holy Cross at RIT | ",
 "Upcoming Jan 30, 4:00 PM Men's · Holy Cross vs Robert Morris | ",
 "Upcoming Jan 31, 2:00 PM Men's · Holy Cross vs Robert Morris | ",
 "Upcoming Feb 5, 7:00 PM Men's · Holy Cross at Bentley | ",
 "Upcoming Feb 6, 7:00 PM Men's · Holy Cross vs Bentley | ",
 "Upcoming Feb 12, 9:00 PM Men's · Holy Cross at Air Force | ",
 "Upcoming Feb 13, 7:00 PM Men's · Holy Cross at Air Force | ",
 "Upcoming Feb 26, 7:00 PM Men's · Holy Cross at Sacred Heart | ",
 "Upcoming Feb 27, 7:00 PM Men's · Holy Cross vs Sacred Heart | ",
 "Upcoming Mar 2 Men's · Holy Cross at Atlantic Hockey Tournament First Round | ",
 "Upcoming Mar 5 Men's · Holy Cross at Atlantic Hockey Tournament Quarterfinal | ",
 "Upcoming Mar 12 Men's · Holy Cross at Atlantic Hockey Tournament Semifinals | ",
 "Upcoming Mar 20 Men's · Holy Cross at Atlantic Hockey Tournament Championship Game | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · Holy Cross vs Delaware | T, 2-2",
 "Final Sep 26 Women's · Holy Cross vs Delaware | W, 4-0",
 "Final Oct 1 Women's · Holy Cross vs Assumption | T, 2-2",
 "Final Oct 9 Women's · Holy Cross vs Boston College | L, 1-3",
 "Final Oct 10 Women's · Holy Cross vs Boston University | L, 1-2",
 "Final Oct 16 Women's · Holy Cross vs Harvard | L, 1-5",
 "Final Oct 17 Women's · Holy Cross at Harvard | L, 2-8",
 "Final Oct 23 Women's · Holy Cross at Dartmouth | T, 1-1",
 "Today Oct 24, 6:00 PM Women's · Holy Cross at Dartmouth | ",
 "Upcoming Oct 29, 7:00 PM Women's · Holy Cross vs Connecticut | ",
 "Upcoming Oct 30, 6:00 PM Women's · Holy Cross at Connecticut | ",
 "Upcoming Nov 6, 7:00 PM Women's · Holy Cross vs Merrimack | ",
 "Upcoming Nov 7, 2:00 PM Women's · Holy Cross at Merrimack | ",
 "Upcoming Nov 13, 5:00 PM Women's · Holy Cross at Maine | ",
 "Upcoming Nov 14, 4:00 PM Women's · Holy Cross at Maine | ",
 "Upcoming Nov 19, 7:00 PM Women's · Holy Cross vs New Hampshire | ",
 "Upcoming Nov 20, 6:00 PM Women's · Holy Cross at New Hampshire | ",
 "Upcoming Nov 27, 7:00 PM Women's · Holy Cross at St. Thomas | ",
 "Upcoming Nov 28, 2:00 PM Women's · Holy Cross at St. Thomas | ",
 "Upcoming Dec 4, 6:00 PM Women's · Holy Cross vs Vermont | ",
 "Upcoming Dec 5, 2:00 PM Women's · Holy Cross vs Vermont | ",
 "Upcoming Jan 8, 6:00 PM Women's · Holy Cross at Boston College | ",
 "Upcoming Jan 15, 6:00 PM Women's · Holy Cross at Boston University | ",
 "Upcoming Jan 22, 6:00 PM Women's · Holy Cross at Providence | ",
 "Upcoming Jan 23, 7:00 PM Women's · Holy Cross vs Providence | ",
 "Upcoming Jan 28, 7:00 PM Women's · Holy Cross at Northeastern | ",
 "Upcoming Jan 29, 6:00 PM Women's · Holy Cross vs Northeastern | ",
 "Upcoming Feb 4, 4:00 PM Women's · Holy Cross at Vermont | ",
 "Upcoming Feb 6, 1:00 PM Women's · Holy Cross vs Northeastern | ",
 "Upcoming Feb 12, 6:00 PM Women's · Holy Cross vs Maine | ",
 "Upcoming Feb 13 Women's · Holy Cross vs Connecticut | ",
 "Upcoming Feb 18, 6:00 PM Women's · Holy Cross at New Hampshire | ",
 "Upcoming Feb 19, 6:00 PM Women's · Holy Cross at Boston College | ",
 "Upcoming Feb 24 Women's · Holy Cross at Hockey East Tournament First Round | ",
 "Upcoming Feb 27 Women's · Holy Cross at Hockey East Tournament Quarterfinals | ",
 "Upcoming Mar 2 Women's · Holy Cross at Hockey East Tournament Semifinals | ",
 "Upcoming Mar 6 Women's · Holy Cross at Hockey East Tournament Championship Game | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Today Oct 24, 8:30 AM Women's · Holy Cross vs Wormtown Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Holy Cross vs Quinnipiac | T, 2-2",
 "Final Aug 16 Women's · Holy Cross at Syracuse | L, 1-3",
 "Final Aug 19 Women's · Holy Cross vs Stonehill | W, 3-2",
 "Final Aug 23 Women's · Holy Cross vs Brown | W, 1-0",
 "Final Aug 27 Women's · Holy Cross at Marist | W, 2-0",
 "Final Sep 3 Women's · Holy Cross at Central Connecticut | W, 1-0",
 "Final Sep 10 Women's · Holy Cross at Dartmouth | L, 0-1",
 "Final Sep 13 Women's · Holy Cross vs Maine | L, 0-1",
 "Final Sep 20 Women's · Holy Cross vs Loyola (Md.) | L, 1-2",
 "Final Sep 26 Women's · Holy Cross at Bucknell | T, 0-0",
 "Final Sep 30 Women's · Holy Cross vs Colgate | W, 2-1",
 "Final Oct 3 Women's · Holy Cross at Navy | L, 1-3",
 "Final Oct 10 Women's · Holy Cross vs Lafayette | W, 3-1",
 "Final Oct 13 Women's · Holy Cross at Cornell | L, 1-6",
 "Final Oct 17 Women's · Holy Cross at Lehigh | W, 4-2",
 "Final Oct 23 Women's · Holy Cross vs Boston University | T, 1-1",
 "Upcoming Nov 1, 1:00 PM Women's · Holy Cross vs American | ",
 "Upcoming Nov 4, 6:00 PM Women's · Holy Cross at Army West Point | ",
 "Upcoming Nov 8 Women's · Holy Cross at Patriot League Tournament Quarterfinals | ",
 "Upcoming Nov 11 Women's · Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Nov 15 Women's · Holy Cross at Patriot League Tournament Championship Game | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Holy Cross vs Northeastern | L, 0-5",
 "Final Aug 23 Men's · Holy Cross vs Merrimack | T, 2-2",
 "Final Aug 29 Men's · Holy Cross at Rhode Island | L, 1-2",
 "Final Sep 1 Men's · Holy Cross at Vermont | L, 0-2",
 "Final Sep 5 Men's · Holy Cross at Iona | T, 1-1",
 "Final Sep 8 Men's · Holy Cross at Massachusetts-Lowell | T, 0-0",
 "Final Sep 12 Men's · Holy Cross vs Navy | T, 1-1",
 "Final Sep 19 Men's · Holy Cross at Lafayette | T, 1-1",
 "Final Sep 23 Men's · Holy Cross vs Stonehill | W, 3-2",
 "Final Sep 26 Men's · Holy Cross vs Loyola (Md.) | L, 2-4",
 "Final Oct 3 Men's · Holy Cross vs Lehigh | T, 3-3",
 "Final Oct 10 Men's · Holy Cross at Bucknell | L, 0-1",
 "Final Oct 13 Men's · Holy Cross at Columbia | L, 0-3",
 "Final Oct 17 Men's · Holy Cross vs Army West Point | W, 3-0",
 "Today Oct 24, 5:00 PM Men's · Holy Cross at Colgate | ",
 "Upcoming Oct 27, 7:00 PM Men's · Holy Cross vs Brown | ",
 "Upcoming Oct 30, 1:00 PM Men's · Holy Cross at American | ",
 "Upcoming Nov 3, 6:00 PM Men's · Holy Cross vs Boston University | ",
 "Upcoming Nov 7 Men's · Holy Cross at Patriot League Tournament Quarterfinals | ",
 "Upcoming Nov 10 Men's · Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · Holy Cross at Patriot League Tournament Championship Game | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 10 Women's · Holy Cross at Boston University | L, 109-191",
 "Today Oct 24, 12:00 PM Women's · Holy Cross at Bridgeport | ",
 "Today Oct 24, 12:00 PM Women's · Holy Cross vs Assumption | ",
 "Upcoming Oct 30, 4:00 PM Women's · Holy Cross at Bentley | ",
 "Upcoming Nov 6, 5:00 PM Women's · Holy Cross at Bryant | ",
 "Upcoming Nov 7, 10:00 AM Women's · Holy Cross at Worcester City Championship | ",
 "Upcoming Nov 19 Women's · Holy Cross at Harold Anderson Invitational | ",
 "Upcoming Jan 15, 12:00 PM Women's · Holy Cross vs Colgate | ",
 "Upcoming Jan 20, 5:00 PM Women's · Holy Cross vs Providence | ",
 "Upcoming Feb 5, 6:00 PM Women's · Holy Cross at Boston University Winter Open | ",
 "Upcoming Feb 17 Women's · Holy Cross at Patriot League Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 10 Men's · Holy Cross at Boston University | Completed",
 "Today Oct 24, 12:00 PM Men's · Holy Cross at Bridgeport | ",
 "Today Oct 24, 12:00 PM Men's · Holy Cross vs Assumption | ",
 "Upcoming Oct 30, 4:00 PM Men's · Holy Cross at Bentley | ",
 "Upcoming Nov 6, 5:00 PM Men's · Holy Cross at Bryant | ",
 "Upcoming Nov 7, 10:00 AM Men's · Holy Cross at Worcester City Championship | ",
 "Upcoming Nov 19 Men's · Holy Cross at Harold Anderson Invitational | ",
 "Upcoming Jan 15, 12:00 PM Men's · Holy Cross vs Colgate | ",
 "Upcoming Jan 20, 5:00 PM Men's · Holy Cross vs Providence | ",
 "Upcoming Feb 5, 6:00 PM Men's · Holy Cross at Boston University Winter Open | ",
 "Upcoming Feb 17 Men's · Holy Cross at Patriot League Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 1 Women's · Holy Cross at Assumption | W, 6-1",
 "Final Oct 8 Women's · Holy Cross at ITA New England Regional | No Team Scores",
 "Final Oct 17 Women's · Holy Cross at Holy Cross Women's Invitational | No Team Scores",
 "Today Oct 23, 8:00 AM Women's · Holy Cross at Patriot League ITA Masters Qualifier | ",
 "Upcoming Oct 30, 2:00 PM Women's · Holy Cross vs Siena | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 5 Men's · Holy Cross vs Wheaton (Mass.) | W, 7-0",
 "Final Sep 18 Men's · Holy Cross vs Iona | L, 2-5",
 "Final Oct 2 Men's · Holy Cross at Army Invitational | No Team Scores",
 "Final Oct 8 Men's · Holy Cross at ITA New England Regional | No Team Scores",
 "Today Oct 23, 8:00 AM Men's · Holy Cross at Patriot League ITA Masters Qualifier | ",
 "Upcoming Oct 30, 2:00 PM Men's · Holy Cross vs Siena | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Holy Cross at Central Connecticut State | L, 2-3",
 "Final Aug 29 Holy Cross vs Siena | W, 3-1",
 "Final Aug 29 Holy Cross vs Rhode Island | L, 2-3",
 "Final Sep 1 Holy Cross at New Haven | W, 3-0",
 "Final Sep 4 Holy Cross at Northeastern | L, 0-3",
 "Final Sep 5 Holy Cross vs Fairfield | L, 1-3",
 "Final Sep 5 Holy Cross at Harvard | L, 1-3",
 "Final Sep 8 Holy Cross vs Marist | W, 3-1",
 "Final Sep 11 Holy Cross vs Stonehill | W, 3-1",
 "Final Sep 12 Holy Cross vs Manhattan | W, 3-1",
 "Final Sep 12 Holy Cross at Providence | L, 0-3",
 "Final Sep 15 Holy Cross at Stonehill | W, 3-0",
 "Final Sep 18 Holy Cross vs American | L, 2-3",
 "Final Sep 19 Holy Cross vs Navy | L, 0-3",
 "Final Sep 26 Holy Cross vs Colgate | L, 1-3",
 "Final Sep 27 Holy Cross vs Army West Point | L, 1-3",
 "Final Oct 2 Holy Cross at Lafayette | W, 3-2",
 "Final Oct 3 Holy Cross at Lehigh | L, 1-3",
 "Final Oct 6 Holy Cross vs Bryant | W, 3-0",
 "Final Oct 9 Holy Cross vs Loyola (Md.) | W, 3-1",
 "Final Oct 11 Holy Cross at Bucknell | W, 3-1",
 "Final Oct 17 Holy Cross vs Bucknell | W, 3-2",
 "Final Oct 23 Holy Cross at Navy | W, 3-0",
 "Today Oct 24, 4:00 PM Holy Cross at American | ",
 "Upcoming Oct 30, 7:00 PM Holy Cross at Army West Point | ",
 "Upcoming Oct 31, 4:00 PM Holy Cross at Colgate | ",
 "Upcoming Nov 6, 6:00 PM Holy Cross vs Lafayette | ",
 "Upcoming Nov 7, 4:00 PM Holy Cross vs Lehigh | ",
 "Upcoming Nov 14, 3:00 PM Holy Cross at Loyola (Md.) | ",
 "Upcoming Nov 17 Holy Cross at Patriot League Tournament Quarterfinals | ",
 "Upcoming Nov 20 Holy Cross at Patriot League Tournament Semifinals | ",
 "Upcoming Nov 22 Holy Cross at Championship Match | "
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
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
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
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Holy Cross module checks passed");
