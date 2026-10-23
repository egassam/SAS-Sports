import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {elonSchool} from '../src/schools/elon.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='elon');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,elonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/elon-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit elonphoenix.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['elon'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',elonSchool.scheduleUrls],['roster',elonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('elon|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'elonphoenix.com',`${key} must stay on elonphoenix.com`);
  }
}
const parity={"Baseball":{"schedule":["https://elonphoenix.com/sports/baseball/schedule"],"roster":["https://elonphoenix.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://elonphoenix.com/sports/mens-basketball/schedule","https://elonphoenix.com/sports/womens-basketball/schedule"],"roster":["https://elonphoenix.com/sports/mens-basketball/roster","https://elonphoenix.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://elonphoenix.com/sports/cross-country/schedule"],"roster":["https://elonphoenix.com/sports/womens-cross-country/roster","https://elonphoenix.com/sports/mens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://elonphoenix.com/sports/football/schedule"],"roster":["https://elonphoenix.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://elonphoenix.com/sports/womens-golf/schedule","https://elonphoenix.com/sports/mens-golf/schedule"],"roster":["https://elonphoenix.com/sports/womens-golf/roster","https://elonphoenix.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://elonphoenix.com/sports/womens-lacrosse/schedule"],"roster":["https://elonphoenix.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://elonphoenix.com/sports/womens-soccer/schedule","https://elonphoenix.com/sports/mens-soccer/schedule"],"roster":["https://elonphoenix.com/sports/womens-soccer/roster","https://elonphoenix.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://elonphoenix.com/sports/softball/schedule"],"roster":["https://elonphoenix.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://elonphoenix.com/sports/womens-tennis/schedule","https://elonphoenix.com/sports/mens-tennis/schedule"],"roster":["https://elonphoenix.com/sports/womens-tennis/roster","https://elonphoenix.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://elonphoenix.com/sports/womens-track-and-field/schedule"],"roster":["https://elonphoenix.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://elonphoenix.com/sports/womens-volleyball/schedule"],"roster":["https://elonphoenix.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'elon|"+sport+"':"),`${sport} routes must live in the Elon module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://elonphoenix.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.elonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=elon)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Elon at Columbia | ",
 "Upcoming Nov 6, 7:00 PM Men's · Elon vs UNCG | ",
 "Upcoming Nov 10, 7:00 PM Men's · Elon at George Washington | ",
 "Upcoming Nov 13, 7:00 PM Men's · Elon vs Chattanooga | ",
 "Upcoming Nov 18, 7:00 PM Men's · Elon at South Carolina | ",
 "Upcoming Nov 21, 7:00 PM Men's · Elon vs Morehead State | ",
 "Upcoming Nov 24, 6:30 PM Men's · Elon at Furman | ",
 "Upcoming Nov 28, 12:00 PM Men's · Elon at NC State | ",
 "Upcoming Dec 3, 7:00 PM Men's · Elon vs James Madison | ",
 "Upcoming Dec 6, 2:00 PM Men's · Elon vs NC Wesleyan | ",
 "Upcoming Dec 12, 6:00 PM Men's · Elon at Richmond | ",
 "Upcoming Dec 16, 7:00 PM Men's · Elon vs Longwood | ",
 "Upcoming Dec 19, 7:00 PM Men's · Elon vs Montreat College | ",
 "Upcoming Dec 22, 7:00 PM Men's · Elon at Radford | ",
 "Upcoming Dec 31, 2:00 PM Men's · Elon vs North Carolina A&T | ",
 "Upcoming Jan 2, 2:00 PM Men's · Elon at William & Mary | ",
 "Upcoming Jan 7, 7:00 PM Men's · Elon at Campbell | ",
 "Upcoming Jan 11, 8:30 PM Men's · Elon vs UNCW | ",
 "Upcoming Jan 14, 6:30 PM Men's · Elon vs Hofstra | ",
 "Upcoming Jan 16, 7:00 PM Men's · Elon vs Stony Brook | ",
 "Upcoming Jan 21, 7:00 PM Men's · Elon at Hampton | ",
 "Upcoming Jan 23, 4:00 PM Men's · Elon at College of Charleston | ",
 "Upcoming Jan 28, 7:00 PM Men's · Elon vs Northeastern | ",
 "Upcoming Jan 30, 7:00 PM Men's · Elon vs Monmouth | ",
 "Upcoming Feb 4 Men's · Elon at Stony Brook | ",
 "Upcoming Feb 11 Men's · Elon at North Carolina A&T | ",
 "Upcoming Feb 13, 7:00 PM Men's · Elon vs Hampton | ",
 "Upcoming Feb 18, 6:30 PM Men's · Elon at Towson | ",
 "Upcoming Feb 20, 4:00 PM Men's · Elon at Drexel | ",
 "Upcoming Feb 25, 7:00 PM Men's · Elon vs Campbell | ",
 "Upcoming Feb 27, 7:00 PM Men's · Elon vs William & Mary | ",
 "Upcoming Mar 2, 7:00 PM Men's · Elon at UNCW | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Elon vs UNC Pembroke | ",
 "Upcoming Nov 6, 7:00 PM Women's · Elon at Howard | ",
 "Upcoming Nov 11, 7:00 PM Women's · Elon vs ETSU | ",
 "Upcoming Nov 15, 3:00 PM Women's · Elon at Wake Forest | ",
 "Upcoming Nov 19, 11:00 AM Women's · Elon vs Liberty | ",
 "Upcoming Nov 23, 5:00 PM Women's · Elon at North Carolina Central | ",
 "Upcoming Nov 29, 2:00 PM Women's · Elon at Clemson | ",
 "Upcoming Dec 2, 7:00 PM Women's · Elon vs Appalachian State | ",
 "Upcoming Dec 6, 2:00 PM Women's · Elon at North Carolina | ",
 "Upcoming Dec 13, 2:00 PM Women's · Elon at Norfolk State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Elon at Presbyterian | ",
 "Upcoming Dec 20, 1:00 PM Women's · Elon vs UNCG | ",
 "Upcoming Dec 29, 2:00 PM Women's · Elon vs NC Wesleyan | ",
 "Upcoming Jan 1, 1:00 PM Women's · Elon at Drexel | ",
 "Upcoming Jan 3 Women's · Elon at Towson | ",
 "Upcoming Jan 8, 7:00 PM Women's · Elon vs William & Mary | ",
 "Upcoming Jan 10, 1:00 PM Women's · Elon vs Stony Brook | ",
 "Upcoming Jan 17, 1:00 PM Women's · Elon vs North Carolina A&T | ",
 "Upcoming Jan 22 Women's · Elon at Campbell | ",
 "Upcoming Jan 24 Women's · Elon at William & Mary | ",
 "Upcoming Jan 29, 7:00 PM Women's · Elon vs Hampton | ",
 "Upcoming Jan 31, 1:00 PM Women's · Elon vs College of Charleston | ",
 "Upcoming Feb 5, 6:00 PM Women's · Elon at Monmouth | ",
 "Upcoming Feb 7 Women's · Elon at Northeastern | ",
 "Upcoming Feb 14, 1:00 PM Women's · Elon vs Hofstra | ",
 "Upcoming Feb 19, 7:00 PM Women's · Elon vs Drexel | ",
 "Upcoming Feb 21, 1:00 PM Women's · Elon vs UNCW | ",
 "Upcoming Feb 26, 7:00 PM Women's · Elon at North Carolina A&T | ",
 "Upcoming Feb 28 Women's · Elon at Hampton | ",
 "Upcoming Mar 4, 7:00 PM Women's · Elon vs Campbell | ",
 "Upcoming Mar 6, 1:00 PM Women's · Elon at College of Charleston | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Elon at Elon Opener | Women's team: 1st / Men's team: 5th",
 "Final Sep 11 Elon at Queen City Invite | Women's team: 1st / Men's team: 4th",
 "Final Oct 2 Elon at Richmond Invitational | Women's team: 1st / Men's team: 9th",
 "Final Oct 16 Elon at Princeton Fall Classic | Women's team: 1st / Men's team: 13th",
 "Upcoming Oct 30, 10:00 AM Elon at CAA Championships | ",
 "Upcoming Nov 13 Elon at NCAA Southeast Regional Championships | ",
 "Upcoming Nov 21 Elon at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Elon vs Glenville State | W, 42-7",
 "Final Sep 5 Elon at Davidson | W, 38-0",
 "Final Sep 12 Elon at Rhode Island | L, 10-31",
 "Final Sep 19 Elon vs Sacred Heart | W, 24-21",
 "Final Sep 26 Elon vs Maine | W, 43-17",
 "Final Oct 3 Elon at New Hampshire | L, 23-30",
 "Final Oct 10 Elon vs Wofford | L, 0-16",
 "Final Oct 17 Elon at Stanford | L, 7-34",
 "Upcoming Oct 31, 1:00 PM Elon at North Carolina A&T | ",
 "Upcoming Nov 7, 2:00 PM Elon vs Hampton | ",
 "Upcoming Nov 14, 2:00 PM Elon vs Campbell | ",
 "Upcoming Nov 21, 1:00 PM Elon at Towson | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Elon at Elon Invitational | 1st",
 "Final Sep 28 Women's · Elon at Tot Hill Farm Invitational | 10th",
 "Final Oct 12 Women's · Elon at Terrier Intercollegiate | T8th",
 "Final Oct 19 Women's · Elon at Edisto Island Invitational | 6th",
 "Upcoming Feb 7 Women's · Elon at Treasure Coast Invitational | ",
 "Upcoming Feb 26 Women's · Elon at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 15 Women's · Elon at Magnolia Collegiate | ",
 "Upcoming Mar 20 Women's · Elon at Florida State Match Up | ",
 "Upcoming Apr 5 Women's · Elon at Hokie Highlander Collegiate | ",
 "Upcoming Apr 16 Women's · Elon at CAA Championship | ",
 "Upcoming May 10 Women's · Elon at NCAA Regional | ",
 "Upcoming May 21 Women's · Elon at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Elon at Myrtle Beach Golf Trips Intercollegiate | 2nd",
 "Final Sep 13 Men's · Elon at JT Poston Invitational | 7th",
 "Final Oct 5 Men's · Elon at West Bay Collegiate Invitational | T6th",
 "Final Oct 12 Men's · Elon at Elon Phoenix Invitational | 2nd",
 "Upcoming Feb 1 Men's · Elon at Sea Best Invitational | ",
 "Upcoming Feb 15 Men's · Elon at Battle at Briar's Creek | ",
 "Upcoming Mar 15 Men's · Elon at Tiger Invitational | ",
 "Upcoming Mar 19 Men's · Elon at Linger Longer Invitational | ",
 "Upcoming Apr 5 Men's · Elon at Giles-Spratley Collegiate | ",
 "Upcoming Apr 10 Men's · Elon at Tar Heel Intercollegiate | ",
 "Upcoming Apr 25 Men's · Elon at CAA Championship | ",
 "Upcoming May 17 Men's · Elon at NCAA Regional Championship | ",
 "Upcoming May 28 Men's · Elon at NCAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Elon vs VCU | W, 4-1",
 "Final Aug 20 Women's · Elon at South Carolina State | W, 6-0",
 "Final Aug 23 Women's · Elon at NC State | L, 1-2",
 "Final Aug 27 Women's · Elon at Davidson | T, 3-3",
 "Final Aug 30 Women's · Elon vs High Point | W, 2-1",
 "Final Sep 3 Women's · Elon at VMI | W, 5-0",
 "Final Sep 6 Women's · Elon at American | T, 0-0",
 "Final Sep 13 Women's · Elon vs Charleston Southern | W, 3-0",
 "Final Sep 20 Women's · Elon vs Campbell | W, 2-0",
 "Final Sep 24 Women's · Elon vs Stony Brook | W, 2-1",
 "Final Sep 27 Women's · Elon vs Hofstra | T, 1-1",
 "Final Oct 3 Women's · Elon at UNCW | L, 1-5",
 "Final Oct 8 Women's · Elon at Northeastern | L, 0-1",
 "Final Oct 11 Women's · Elon at Monmouth | T, 2-2",
 "Final Oct 18 Women's · Elon vs William & Mary | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Women's · Elon vs Hampton | ",
 "Upcoming Nov 1, 1:00 PM Women's · Elon at College of Charleston | ",
 "Upcoming Nov 5 Women's · Elon at CAA Tournament | ",
 "Upcoming Nov 8 Women's · Elon at CAA Tournament | ",
 "Upcoming Nov 14 Women's · Elon at CAA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Elon vs VMI | W, 3-0",
 "Final Aug 24 Men's · Elon at Old Dominion | L, 3-5",
 "Final Aug 30 Men's · Elon vs William & Mary | T, 1-1",
 "Final Sep 5 Men's · Elon at UNCW | L, 0-1",
 "Final Sep 12 Men's · Elon at Campbell | W, 3-0",
 "Final Sep 15 Men's · Elon vs Radford | W, 3-0",
 "Final Sep 19 Men's · Elon vs College of Charleston | T, 1-1",
 "Final Sep 22 Men's · Elon at Davidson | W, 2-1",
 "Final Sep 25 Men's · Elon at Duke | W, 1-0",
 "Final Sep 29 Men's · Elon vs USC Upstate | W, 3-1",
 "Final Oct 3 Men's · Elon at William & Mary | W, 3-1",
 "Final Oct 6 Men's · Elon vs Guilford College | W, 8-0",
 "Final Oct 9 Men's · Elon at College of Charleston | T, 1-1",
 "Final Oct 13 Men's · Elon vs Longwood | T, 2-2",
 "Final Oct 17 Men's · Elon vs UNCW | T, 0-0",
 "Upcoming Oct 24, 7:00 PM Men's · Elon vs Wake Forest | ",
 "Upcoming Oct 31, 7:00 PM Men's · Elon vs Campbell | ",
 "Upcoming Nov 5 Men's · Elon at CAA Tournament | ",
 "Upcoming Nov 8 Men's · Elon at CAA Tournament | ",
 "Upcoming Nov 14 Men's · Elon at CAA Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 5:00 PM Elon vs Mount Olive | ",
 "Upcoming Oct 25, 12:00 PM Elon at East Carolina | ",
 "Upcoming Oct 28, 5:00 PM Elon vs Louisburg College | ",
 "Upcoming Oct 30, 6:00 PM Elon vs Duke | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Elon at Kitty Harrison Invitational | Completed",
 "Final Sep 19 Women's · Elon at ITA Women's All-American Championships | Completed",
 "Final Oct 2 Women's · Elon at Jimmy Powell Invitational | Completed",
 "Final Oct 15 Women's · Elon at ITA Carolina Regionals | Completed",
 "Upcoming Oct 30 Women's · Elon at Elon Fall Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Elon at Elon Invitational | Completed",
 "Final Sep 25 Men's · Elon at Liberty Dual Tournament | Completed",
 "Final Oct 8 Men's · Elon at ITA Carolina Regionals | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 3 Elon at Liberty Kickoff | ",
 "Upcoming Dec 6 Elon at ASICS Early Bird Invitational | ",
 "Upcoming Jan 16 Elon at Mondo College Invitational | ",
 "Upcoming Jan 22 Elon at Doc Hale Invite | ",
 "Upcoming Jan 22 Elon at Liberty Open | ",
 "Upcoming Jan 24 Elon at ASICS College Classic | ",
 "Upcoming Jan 29 Elon at John Thomas Terrier Classic | ",
 "Upcoming Jan 29 Elon at Brant Tolsma Elite Invitational | ",
 "Upcoming Jan 31 Elon at ASICS Sound Invite | ",
 "Upcoming Feb 5 Elon at ASICS Camel City Sprints | ",
 "Upcoming Feb 5 Elon at Queen & Kristi Classic | ",
 "Upcoming Feb 6 Elon at ASICS Camel City Distance | ",
 "Upcoming Feb 12 Elon at Darius Dixon Memorial Invitational | ",
 "Upcoming Feb 13 Elon at David Hemery Valentine Invitational | ",
 "Upcoming Feb 13 Elon at Cochrane Elite Invitational | ",
 "Upcoming Feb 24 Elon at CAA Indoor Championships | ",
 "Upcoming Mar 12 Elon at Phoenix Invitational | ",
 "Upcoming Mar 12 Elon at NCAA Indoor Championships | ",
 "Upcoming Mar 18 Elon at 49er Classic | ",
 "Upcoming Mar 19 Elon at Black & Gold Challenge | ",
 "Upcoming Mar 19 Elon at Bob Davidson Team Challenge | ",
 "Upcoming Mar 25 Elon at Raleigh Relays | ",
 "Upcoming Apr 2 Elon at VertKlasse Meeting | ",
 "Upcoming Apr 7 Elon at Duke Invitational | ",
 "Upcoming Apr 15 Elon at Wake Forest Invitational | ",
 "Upcoming Apr 16 Elon at Aggie Invitational | ",
 "Upcoming Apr 22 Elon at Penn Relays | ",
 "Upcoming Apr 30 Elon at Aggie Classic | ",
 "Upcoming May 2 Elon at Duke Twilight | ",
 "Upcoming May 14 Elon at CAA Outdoor Championships | ",
 "Upcoming May 16 Elon at Dani Palooza Last Chance | ",
 "Upcoming May 26 Elon at NCAA East First Round | ",
 "Upcoming Jun 9 Elon at NCAA Outdoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Elon vs St. John's | L, 1-3",
 "Final Aug 29 Elon vs Norfolk State | L, 1-3",
 "Final Aug 29 Elon at Old Dominion | W, 3-1",
 "Final Sep 1 Elon at UNC Asheville | L, 2-3",
 "Final Sep 4 Elon at Robert Morris | W, 3-0",
 "Final Sep 4 Elon at Duquesne | L, 0-3",
 "Final Sep 5 Elon vs Eastern Michigan | L, 0-3",
 "Final Sep 8 Elon vs Appalachian State | L, 1-3",
 "Final Sep 11 Elon vs Davidson | L, 1-3",
 "Final Sep 12 Elon vs USC Upstate | W, 3-1",
 "Final Sep 19 Elon vs College of Charleston | L, 0-3",
 "Final Sep 20 Elon vs College of Charleston | L, 0-3",
 "Final Sep 24 Elon at Hampton | W, 3-0",
 "Final Sep 25 Elon at Hampton | W, 3-0",
 "Final Oct 2 Elon vs Stony Brook | W, 3-1",
 "Final Oct 3 Elon vs Stony Brook | L, 1-3",
 "Final Oct 9 Elon at Northeastern | W, 3-1",
 "Final Oct 10 Elon at Northeastern | W, 3-1",
 "Final Oct 16 Elon vs William & Mary | W, 3-0",
 "Final Oct 17 Elon vs William & Mary | L, 0-3",
 "Today Oct 23, 6:00 PM Elon at UNCW | ",
 "Upcoming Oct 24, 2:00 PM Elon at UNCW | ",
 "Upcoming Oct 30, 6:00 PM Elon vs Campbell | ",
 "Upcoming Oct 31, 3:00 PM Elon vs Campbell | ",
 "Upcoming Nov 6, 6:00 PM Elon at North Carolina A&T | ",
 "Upcoming Nov 7, 3:00 PM Elon at North Carolina A&T | ",
 "Upcoming Nov 10, 6:00 PM Elon vs Gardner-Webb | ",
 "Upcoming Nov 12, 6:00 PM Elon at North Carolina Central | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Elon module checks passed");
