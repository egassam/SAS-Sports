import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {richmondSchool} from '../src/schools/richmond.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='richmond');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,richmondHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/richmond-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit richmondspiders.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['richmond'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',richmondSchool.scheduleUrls],['roster',richmondSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('richmond|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'richmondspiders.com',`${key} must stay on richmondspiders.com`);
  }
}
const parity={"Baseball":{"schedule":["https://richmondspiders.com/sports/baseball/schedule"],"roster":["https://richmondspiders.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://richmondspiders.com/sports/mens-basketball/schedule","https://richmondspiders.com/sports/womens-basketball/schedule"],"roster":["https://richmondspiders.com/sports/mens-basketball/roster","https://richmondspiders.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://richmondspiders.com/sports/cross-country/schedule"],"roster":["https://richmondspiders.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://richmondspiders.com/sports/field-hockey/schedule"],"roster":["https://richmondspiders.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://richmondspiders.com/sports/football/schedule"],"roster":["https://richmondspiders.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://richmondspiders.com/sports/womens-golf/schedule","https://richmondspiders.com/sports/mens-golf/schedule"],"roster":["https://richmondspiders.com/sports/womens-golf/roster","https://richmondspiders.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://richmondspiders.com/sports/womens-lacrosse/schedule","https://richmondspiders.com/sports/mens-lacrosse/schedule"],"roster":["https://richmondspiders.com/sports/womens-lacrosse/roster","https://richmondspiders.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://richmondspiders.com/sports/womens-soccer/schedule"],"roster":["https://richmondspiders.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://richmondspiders.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://richmondspiders.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://richmondspiders.com/sports/womens-tennis/schedule","https://richmondspiders.com/sports/mens-tennis/schedule"],"roster":["https://richmondspiders.com/sports/womens-tennis/roster","https://richmondspiders.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://richmondspiders.com/sports/womens-track-and-field/schedule"],"roster":["https://richmondspiders.com/sports/womens-track-and-field/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'richmond|"+sport+"':"),`${sport} routes must live in the Richmond module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://richmondspiders.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.richmondHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=richmond)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Richmond vs UNC Asheville | ",
 "Upcoming Nov 5, 7:00 PM Men's · Richmond vs Southern Virginia | ",
 "Upcoming Nov 8, 5:00 PM Men's · Richmond vs Temple | ",
 "Upcoming Nov 12, 8:00 PM Men's · Richmond at Southern Illinois | ",
 "Upcoming Nov 16, 7:00 PM Men's · Richmond at Virginia Tech | ",
 "Upcoming Nov 20, 7:00 PM Men's · Richmond vs Western Kentucky | ",
 "Upcoming Nov 22, 4:30 PM Men's · Richmond vs Liberty | ",
 "Upcoming Nov 25, 6:00 PM Men's · Richmond vs Bethune-Cookman | ",
 "Upcoming Nov 28, 6:00 PM Men's · Richmond vs VMI | ",
 "Upcoming Dec 1, 7:00 PM Men's · Richmond at East Carolina | ",
 "Upcoming Dec 5, 2:00 PM Men's · Richmond at Old Dominion | ",
 "Upcoming Dec 12, 6:00 PM Men's · Richmond vs Elon | ",
 "Upcoming Dec 18, 7:00 PM Men's · Richmond vs William & Mary | ",
 "Upcoming Dec 21, 7:00 PM Men's · Richmond vs Lafayette | ",
 "Upcoming Dec 30, 7:00 PM Men's · Richmond at George Mason | ",
 "Upcoming Jan 2, 6:00 PM Men's · Richmond vs Loyola Chicago | ",
 "Upcoming Jan 6, 8:00 PM Men's · Richmond vs Saint Louis | ",
 "Upcoming Jan 9, 2:30 PM Men's · Richmond at Davidson | ",
 "Upcoming Jan 13, 7:00 PM Men's · Richmond at Dayton | ",
 "Upcoming Jan 16, 4:30 PM Men's · Richmond vs Rhode Island | ",
 "Upcoming Jan 20, 7:00 PM Men's · Richmond vs Duquesne | ",
 "Upcoming Jan 27, 7:00 PM Men's · Richmond at George Washington | ",
 "Upcoming Jan 30, 8:00 PM Men's · Richmond at VCU | ",
 "Upcoming Feb 3, 7:00 PM Men's · Richmond vs Davidson | ",
 "Upcoming Feb 6, 2:30 PM Men's · Richmond at St. Bonaventure | ",
 "Upcoming Feb 10, 7:00 PM Men's · Richmond vs George Washington | ",
 "Upcoming Feb 13, 12:00 PM Men's · Richmond vs VCU | ",
 "Upcoming Feb 17, 7:00 PM Men's · Richmond at Rhode Island | ",
 "Upcoming Feb 20, 2:30 PM Men's · Richmond vs St. Bonaventure | ",
 "Upcoming Feb 27, 4:30 PM Men's · Richmond at La Salle | ",
 "Upcoming Mar 3, 2:00 PM Men's · Richmond at Saint Joseph's | ",
 "Upcoming Mar 6, 6:00 PM Men's · Richmond vs Fordham | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Richmond at Charlotte | ",
 "Upcoming Nov 6, 6:00 PM Women's · Richmond vs Princeton | ",
 "Upcoming Nov 8, 2:30 PM Women's · Richmond vs Rice | ",
 "Upcoming Nov 12, 6:00 PM Women's · Richmond vs Old Dominion | ",
 "Upcoming Nov 15, 2:00 PM Women's · Richmond vs William & Mary | ",
 "Upcoming Nov 19, 7:00 PM Women's · Richmond at Delaware | ",
 "Upcoming Nov 22, 2:00 PM Women's · Richmond vs Holy Cross | ",
 "Upcoming Nov 27, 2:30 PM Women's · Richmond vs St. John's | ",
 "Upcoming Nov 28, 5:00 PM Women's · Richmond vs Coppin State | ",
 "Upcoming Dec 2, 8:00 PM Women's · Richmond at Loyola Chicago | ",
 "Upcoming Dec 6, 2:00 PM Women's · Richmond vs UNC Greensboro | ",
 "Upcoming Dec 13, 2:00 PM Women's · Richmond vs Liberty | ",
 "Upcoming Dec 20, 12:00 PM Women's · Richmond at College of Charleston | ",
 "Upcoming Dec 22, 11:00 AM Women's · Richmond vs Campbell | ",
 "Upcoming Dec 30, 6:00 PM Women's · Richmond vs Duquesne | ",
 "Upcoming Jan 2, 1:00 PM Women's · Richmond at St. Bonaventure | ",
 "Upcoming Jan 6 Women's · Richmond at Davidson | ",
 "Upcoming Jan 10, 2:00 PM Women's · Richmond vs Saint Joseph's | ",
 "Upcoming Jan 13, 6:00 PM Women's · Richmond vs George Mason | ",
 "Upcoming Jan 17, 2:00 PM Women's · Richmond vs VCU | ",
 "Upcoming Jan 20, 6:00 PM Women's · Richmond at Duquesne | ",
 "Upcoming Jan 23, 3:00 PM Women's · Richmond at Fordham | ",
 "Upcoming Jan 27, 6:00 PM Women's · Richmond vs Saint Louis | ",
 "Upcoming Jan 31, 12:00 PM Women's · Richmond vs Davidson | ",
 "Upcoming Feb 6, 2:00 PM Women's · Richmond vs St. Bonaventure | ",
 "Upcoming Feb 10, 6:00 PM Women's · Richmond at Rhode Island | ",
 "Upcoming Feb 14, 12:00 PM Women's · Richmond at VCU | ",
 "Upcoming Feb 17, 6:00 PM Women's · Richmond vs Dayton | ",
 "Upcoming Feb 21, 2:00 PM Women's · Richmond at Saint Joseph's | ",
 "Upcoming Feb 24, 6:30 PM Women's · Richmond at La Salle | ",
 "Upcoming Feb 27, 2:00 PM Women's · Richmond vs George Washington | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Richmond at Spider Alumni Open | Women's team: 3rd / Men's team: 5th",
 "Final Sep 18 Richmond at Adidas XC Challenge | Women's team: 4th / Men's team: 7th",
 "Final Oct 2 Richmond at Richmond Invitational | Women's team: T2nd / Men's team: 8th",
 "Final Oct 16 Richmond at Texas A&M Arturo Barrios Invitational | Women's team: 27th / Men's team: 27th",
 "Upcoming Oct 31 Richmond at Atlantic 10 Championships | ",
 "Upcoming Nov 13 Richmond at NCAA Southeast Region Championships | ",
 "Upcoming Nov 21 Richmond at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Richmond vs Queens (NC) | W, 12-0",
 "Final Aug 30 Richmond vs Duke | L, 0-1",
 "Final Sep 4 Richmond at American | W, 2-0",
 "Final Sep 6 Richmond at Longwood | W, 6-0",
 "Final Sep 11 Richmond vs Georgetown | W, 4-0",
 "Final Sep 13 Richmond vs North Carolina | L, 1-2",
 "Final Sep 18 Richmond vs Davidson | W, 5-2",
 "Final Sep 20 Richmond at William & Mary | W, 5-2",
 "Final Sep 25 Richmond at Saint Joseph's | L, 1-3",
 "Final Oct 2 Richmond vs La Salle | W, 8-1",
 "Final Oct 4 Richmond vs Liberty | L, 0-2",
 "Final Oct 9 Richmond at Saint Louis | W, 2-0",
 "Final Oct 16 Richmond vs Delaware | L, 2-3",
 "Final Oct 18 Richmond vs Old Dominion | L, 3-4",
 "Upcoming Oct 23, 3:00 PM Richmond at Lock Haven | ",
 "Upcoming Oct 25, 12:00 PM Richmond vs Louisville | ",
 "Upcoming Oct 30, 5:00 PM Richmond vs VCU | ",
 "Upcoming Nov 5 Richmond at Atlantic 10 Championship Semifinals | ",
 "Upcoming Nov 7 Richmond at Atlantic 10 Conference Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Richmond vs Bucknell | W, 35-14",
 "Final Sep 5 Richmond at Howard | W, 28-21",
 "Final Sep 11 Richmond at NC State | L, 0-73",
 "Final Sep 19 Richmond vs Georgetown | W, 24-21",
 "Final Sep 26 Richmond vs Furman | W, 13-9",
 "Final Oct 3 Richmond at Lafayette | W, 40-31",
 "Final Oct 10 Richmond at Fordham | L, 14-20",
 "Upcoming Oct 24, 2:00 PM Richmond vs Colgate | ",
 "Upcoming Oct 31, 1:00 PM Richmond at Holy Cross | ",
 "Upcoming Nov 7, 1:00 PM Richmond at Villanova | ",
 "Upcoming Nov 14, 2:00 PM Richmond vs Lehigh | ",
 "Upcoming Nov 21, 12:00 PM Richmond vs William & Mary | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Richmond at Nittany Lion Invitational | 11th of 18",
 "Final Sep 21 Women's · Richmond at Bettie Lou Evans Invitational | 7th of 13",
 "Final Oct 12 Women's · Richmond at Holy Cross | Completed",
 "Final Oct 19 Women's · Richmond at Spider Invitational | T1st of 7",
 "Upcoming Oct 26 Women's · Richmond at Keswick Cup | ",
 "Upcoming Jan 25 Women's · Richmond at Sea Best Invitational | ",
 "Upcoming Feb 20 Women's · Richmond at Space Coast Classic | ",
 "Upcoming Mar 15 Women's · Richmond at Low Country Intercollegiate | ",
 "Upcoming Mar 20 Women's · Richmond at More Than Golf Invitational | ",
 "Upcoming Apr 5 Women's · Richmond at Hokie Highlander Classic | ",
 "Upcoming Apr 19 Women's · Richmond at Atlantic 10 Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · Richmond at Virtues Intercollegiate | 3rd of 12",
 "Final Sep 14 Men's · Richmond at RedHawk Intercollegiate | T6th of 14",
 "Final Sep 21 Men's · Richmond at Rod Myers Invitational | 9th of 13",
 "Final Oct 11 Men's · Richmond at Davidson | Completed",
 "Final Oct 18 Men's · Richmond at Furman Intercollegiate | T6th of 15",
 "Upcoming Feb 7 Men's · Richmond at Dorado Beach Collegiate | ",
 "Upcoming Feb 28 Men's · Richmond at Lake Jovita Invitational | ",
 "Upcoming Mar 8 Men's · Richmond at Donald Ross Collegiate Classic | ",
 "Upcoming Mar 22 Men's · Richmond at Seahawk Intercollegiate | ",
 "Upcoming Apr 5 Men's · Richmond at Giles-Spratley Collegiate | ",
 "Upcoming Apr 17 Men's · Richmond at Rutgers Invitational | ",
 "Upcoming Apr 26 Men's · Richmond at Atlantic 10 Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Richmond vs Wofford | W, 1-0",
 "Final Aug 20 Richmond vs American | T, 1-1",
 "Final Aug 23 Richmond vs Queens (N.C.) | W, 3-0",
 "Final Aug 30 Richmond at Mount St. Mary's | T, 0-0",
 "Final Sep 3 Richmond vs Longwood | T, 0-0",
 "Final Sep 6 Richmond at Radford | W, 2-1",
 "Final Sep 10 Richmond at VMI | W, 1-0",
 "Final Sep 13 Richmond vs Howard | W, 4-1",
 "Final Sep 20 Richmond at George Washington | T, 1-1",
 "Final Sep 24 Richmond vs Duquesne | T, 1-1",
 "Final Sep 27 Richmond vs St. Bonaventure | W, 2-1",
 "Final Oct 3 Richmond at George Mason | L, 0-1",
 "Final Oct 8 Richmond at La Salle | L, 0-2",
 "Final Oct 11 Richmond vs Davidson | W, 1-0",
 "Final Oct 17 Richmond at Saint Louis | L, 0-2",
 "Today Oct 22, 4:00 PM Richmond vs VCU | ",
 "Upcoming Oct 25, 1:00 PM Richmond at Rhode Island | ",
 "Upcoming Nov 1, 1:30 PM Richmond vs Fordham | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Richmond at The Richmond Invitational | Completed",
 "Final Oct 10 Women's · Richmond vs The Richmond Duals | Completed",
 "Upcoming Oct 23, 4:00 PM Women's · Richmond at Fordham | ",
 "Upcoming Nov 7, 1:00 PM Women's · Richmond at ECU Quad Meet | ",
 "Upcoming Nov 18 Women's · Richmond at Patriot Invitational | ",
 "Upcoming Dec 12 Women's · Richmond at CSCAA Open Water Championship | ",
 "Upcoming Jan 8 Women's · Richmond at Tribe Quad-Meet | ",
 "Upcoming Jan 15 Women's · Richmond at James Madison | ",
 "Upcoming Jan 16 Women's · Richmond vs Villanova | ",
 "Upcoming Feb 4 Women's · Richmond at Cavalier Invite | ",
 "Upcoming Feb 17 Women's · Richmond at Atlantic 10 Championships | ",
 "Upcoming Feb 26 Women's · Richmond at Cavalier Last Chance Meet | ",
 "Upcoming Mar 6 Women's · Richmond at NCAA Zone Diving | ",
 "Upcoming Mar 11 Women's · Richmond at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Richmond at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Richmond at William & Mary | Completed",
 "Final Sep 19 Women's · Richmond at ITA All-Americans | Completed",
 "Final Sep 25 Women's · Richmond at Navy Invite | Completed",
 "Final Oct 2 Women's · Richmond at Atlantic 10 Conference Masters | Completed",
 "Final Oct 2 Women's · Richmond at River City Tennis Open | Completed",
 "Final Oct 15 Women's · Richmond at ITA Regionals | Completed",
 "Upcoming Oct 26 Women's · Richmond at Sumter W15 | ",
 "Upcoming Nov 5 Women's · Richmond at NCAA Conference Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Richmond at Liberty Hidden Dual | Completed",
 "Final Oct 2 Men's · Richmond at River City Tennis Open | Completed",
 "Final Oct 2 Men's · Richmond at Atlantic 10 Qualifier | Completed",
 "Final Oct 8 Men's · Richmond at ITA Atlantic Regionals | Completed",
 "Upcoming Nov 6 Men's · Richmond at Tribe Fall Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Richmond module checks passed");
