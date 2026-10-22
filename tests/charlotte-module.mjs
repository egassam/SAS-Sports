import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {charlotteSchool} from '../src/schools/charlotte.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='charlotte');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,charlotteHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/charlotte-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit charlotte49ers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['charlotte'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',charlotteSchool.scheduleUrls],['roster',charlotteSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('charlotte|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'charlotte49ers.com',`${key} must stay on charlotte49ers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://charlotte49ers.com/sports/baseball/schedule"],"roster":["https://charlotte49ers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://charlotte49ers.com/sports/mens-basketball/schedule","https://charlotte49ers.com/sports/womens-basketball/schedule"],"roster":["https://charlotte49ers.com/sports/mens-basketball/roster","https://charlotte49ers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://charlotte49ers.com/sports/cross-country/schedule"],"roster":["https://charlotte49ers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://charlotte49ers.com/sports/football/schedule"],"roster":["https://charlotte49ers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://charlotte49ers.com/sports/womens-golf/schedule","https://charlotte49ers.com/sports/mens-golf/schedule"],"roster":["https://charlotte49ers.com/sports/womens-golf/roster","https://charlotte49ers.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://charlotte49ers.com/sports/womens-lacrosse/schedule"],"roster":["https://charlotte49ers.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://charlotte49ers.com/sports/womens-soccer/schedule","https://charlotte49ers.com/sports/mens-soccer/schedule"],"roster":["https://charlotte49ers.com/sports/womens-soccer/roster","https://charlotte49ers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://charlotte49ers.com/sports/softball/schedule"],"roster":["https://charlotte49ers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://charlotte49ers.com/sports/womens-tennis/schedule","https://charlotte49ers.com/sports/mens-tennis/schedule"],"roster":["https://charlotte49ers.com/sports/womens-tennis/roster","https://charlotte49ers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://charlotte49ers.com/sports/track-and-field/schedule"],"roster":["https://charlotte49ers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://charlotte49ers.com/sports/womens-volleyball/schedule"],"roster":["https://charlotte49ers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'charlotte|"+sport+"':"),`${sport} routes must live in the Charlotte module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://charlotte49ers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.charlotteHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=charlotte)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:30 PM Men's · Charlotte at North Carolina (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Charlotte at Indiana State | ",
 "Upcoming Nov 5 Men's · Charlotte vs Georgia State | ",
 "Upcoming Nov 9 Men's · Charlotte vs Seton Hall | ",
 "Upcoming Nov 13 Men's · Charlotte vs App State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Charlotte at Davidson | ",
 "Upcoming Nov 23 Men's · Charlotte vs Florida Gulf Coast | ",
 "Upcoming Nov 25 Men's · Charlotte vs Northern Iowa | ",
 "Upcoming Nov 29 Men's · Charlotte vs Western Carolina | ",
 "Upcoming Dec 2 Men's · Charlotte vs College of Charleston | ",
 "Upcoming Dec 6 Men's · Charlotte vs North Alabama | ",
 "Upcoming Dec 13 Men's · Charlotte vs Johnson C. Smith | ",
 "Upcoming Dec 15 Men's · Charlotte vs Iona | ",
 "Upcoming Dec 18 Men's · Charlotte at UIC | ",
 "Upcoming Dec 22 Men's · Charlotte vs North Carolina A&T | ",
 "Upcoming Dec 31 Men's · Charlotte at Florida Atlantic | ",
 "Upcoming Jan 3 Men's · Charlotte vs Wichita State | ",
 "Upcoming Jan 7 Men's · Charlotte at South Florida | ",
 "Upcoming Jan 10 Men's · Charlotte vs Temple | ",
 "Upcoming Jan 13 Men's · Charlotte vs UTSA | ",
 "Upcoming Jan 17 Men's · Charlotte at North Texas | ",
 "Upcoming Jan 20 Men's · Charlotte vs Memphis | ",
 "Upcoming Jan 23 Men's · Charlotte at Tulane | ",
 "Upcoming Jan 26 Men's · Charlotte vs UAB | ",
 "Upcoming Jan 31 Men's · Charlotte at East Carolina | ",
 "Upcoming Feb 7 Men's · Charlotte vs South Florida | ",
 "Upcoming Feb 11 Men's · Charlotte at Memphis | ",
 "Upcoming Feb 14 Men's · Charlotte at UAB | ",
 "Upcoming Feb 17 Men's · Charlotte vs Florida Atlantic | ",
 "Upcoming Feb 20 Men's · Charlotte vs Rice | ",
 "Upcoming Feb 28 Men's · Charlotte at Wichita State | ",
 "Upcoming Mar 3 Men's · Charlotte at Tulsa | ",
 "Upcoming Mar 7 Men's · Charlotte vs East Carolina | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Charlotte vs Richmond | ",
 "Upcoming Nov 5 Women's · Charlotte at Texas Tech | ",
 "Upcoming Nov 9, 7:00 PM Women's · Charlotte vs Longwood | ",
 "Upcoming Nov 18, 7:00 PM Women's · Charlotte vs Wofford | ",
 "Upcoming Nov 21, 7:00 PM Women's · Charlotte at Davidson | ",
 "Upcoming Nov 27 Women's · Charlotte vs UCF | ",
 "Upcoming Nov 28 Women's · Charlotte vs Texas A&M | ",
 "Upcoming Dec 2, 5:30 PM Women's · Charlotte vs Kennesaw State | ",
 "Upcoming Dec 6 Women's · Charlotte at VCU | ",
 "Upcoming Dec 16, 11:00 AM Women's · Charlotte vs Winthrop | ",
 "Upcoming Dec 20 Women's · Charlotte at ETSU | ",
 "Upcoming Dec 30 Women's · Charlotte at Temple | ",
 "Upcoming Jan 2 Women's · Charlotte vs Tulane | ",
 "Upcoming Jan 7 Women's · Charlotte at UAB | ",
 "Upcoming Jan 10 Women's · Charlotte at Memphis | ",
 "Upcoming Jan 14 Women's · Charlotte vs South Florida | ",
 "Upcoming Jan 17 Women's · Charlotte at Wichita State | ",
 "Upcoming Jan 20 Women's · Charlotte at Tulsa | ",
 "Upcoming Jan 23 Women's · Charlotte vs Memphis | ",
 "Upcoming Jan 27 Women's · Charlotte vs UTSA | ",
 "Upcoming Jan 31 Women's · Charlotte at Rice | ",
 "Upcoming Feb 6 Women's · Charlotte vs Florida Atlantic | ",
 "Upcoming Feb 10 Women's · Charlotte at North Texas | ",
 "Upcoming Feb 13 Women's · Charlotte at East Carolina | ",
 "Upcoming Feb 16 Women's · Charlotte vs Wichita State | ",
 "Upcoming Feb 21 Women's · Charlotte vs UAB | ",
 "Upcoming Feb 24 Women's · Charlotte vs North Texas | ",
 "Upcoming Feb 27 Women's · Charlotte at Tulane | ",
 "Upcoming Mar 6 Women's · Charlotte vs East Carolina | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 11 Charlotte at Queen City Invite | Completed",
 "Final Oct 2 Charlotte at Paul Short Invitational | Completed",
 "Final Oct 9 Charlotte at Royals Cross Country Challenge | Completed",
 "Final Oct 16 Charlotte at Panorama Farms Invitational | Completed",
 "Upcoming Oct 31 Charlotte at American Conference | ",
 "Upcoming Nov 13 Charlotte at NCAA Southeast Regional | ",
 "Upcoming Nov 21 Charlotte at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Charlotte vs The Citadel | L, 41-43",
 "Final Sep 12 Charlotte at Ole Miss | L, 9-41",
 "Final Sep 19 Charlotte at App State | L, 21-26",
 "Final Sep 26 Charlotte vs Louisiana | L, 7-34",
 "Final Oct 3 Charlotte vs Memphis | L, 8-59",
 "Final Oct 10 Charlotte at North Texas | L, 10-50",
 "Final Oct 17 Charlotte at Temple | W, 38-31",
 "Upcoming Oct 30, 7:00 PM Charlotte vs Tulane | ",
 "Upcoming Nov 7 Charlotte at UAB | ",
 "Upcoming Nov 14 Charlotte vs East Carolina | ",
 "Upcoming Nov 21 Charlotte at Tulsa | ",
 "Upcoming Nov 28 Charlotte vs Navy | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Charlotte at AOD Summit | 2nd of 6",
 "Final Sep 7 Women's · Charlotte at Cougar Classic | 18th of 18",
 "Final Sep 28 Women's · Charlotte at Tot Hill Farm Invitational | 6th of 12",
 "Final Oct 5 Women's · Charlotte at Barbara Nicklaus Cup | Match play: 1-2",
 "Final Oct 16 Women's · Charlotte at Ruth's Chris Tar Heel Invitational | 12th of 14",
 "Upcoming Oct 26 Women's · Charlotte at French Broad Collegiate Invitational | ",
 "Upcoming Feb 8 Women's · Charlotte at Thunderbird Collegiate | ",
 "Upcoming Mar 1 Women's · Charlotte at Daniel Island Invitational | ",
 "Upcoming Mar 15 Women's · Charlotte at Briar's Creek | ",
 "Upcoming Mar 29 Women's · Charlotte at Mimosa Hills Intercollegiate | ",
 "Upcoming Apr 5 Women's · Charlotte at Hokie Highlander Collegiate | ",
 "Upcoming Apr 19 Women's · Charlotte at American Conference Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Charlotte at Visit Knoxville Collegiate | 11th of 17",
 "Final Sep 28 Men's · Charlotte at Windon Memorial | T5th of 16",
 "Final Oct 5 Men's · Charlotte at Barbara Nicklaus Cup | Match play: 2-0-1",
 "Final Oct 16 Men's · Charlotte at Golf Club of Georgia Collegiate | 8th of 14",
 "Upcoming Feb 12 Men's · Charlotte at Gator Invitational | ",
 "Upcoming Mar 6 Men's · Charlotte at The Hayt | ",
 "Upcoming Mar 15 Men's · Charlotte at Pauma Valley Invitational | ",
 "Upcoming Mar 21 Men's · Charlotte at GAMEABOVE Collegiate | ",
 "Upcoming Apr 2 Men's · Charlotte at Mason Rudolph Intercollegiate | ",
 "Upcoming Apr 12 Men's · Charlotte at Ford Collegiate | ",
 "Upcoming Apr 25 Men's · Charlotte at American Conference Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 25 Charlotte vs Liberty (Exhibition) | ",
 "Upcoming Oct 25, 1:30 PM Charlotte at Clemson (Exhibition) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Charlotte vs Furman | W, 2-1",
 "Final Aug 16 Women's · Charlotte at Radford | W, 2-0",
 "Final Aug 20 Women's · Charlotte at NC State | L, 1-4",
 "Final Aug 23 Women's · Charlotte vs USC Upstate | W, 1-0",
 "Final Aug 30 Women's · Charlotte at Liberty | L, 0-2",
 "Final Sep 6 Women's · Charlotte at Mississippi State | W, 3-0",
 "Final Sep 10 Women's · Charlotte vs UNCW | L, 0-2",
 "Final Sep 17 Women's · Charlotte at Florida Atlantic | L, 2-3",
 "Final Sep 24 Women's · Charlotte vs North Texas | W, 3-0",
 "Final Sep 27 Women's · Charlotte vs UTSA | T, 1-1",
 "Final Oct 2 Women's · Charlotte at Tulsa | W, 3-1",
 "Final Oct 8 Women's · Charlotte vs East Carolina | W, 4-0",
 "Final Oct 11 Women's · Charlotte at Memphis | L, 1-2",
 "Final Oct 15 Women's · Charlotte vs South Florida | W, 2-1",
 "Upcoming Oct 25, 7:00 PM Women's · Charlotte at UAB | ",
 "Upcoming Oct 30, 1:30 PM Women's · Charlotte at Rice | ",
 "Upcoming Nov 3, 7:00 PM Women's · Charlotte vs Temple | ",
 "Upcoming Nov 8 Women's · Charlotte at American Conference Championships | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Charlotte vs West Virginia | W, 3-0",
 "Final Aug 24 Men's · Charlotte vs Wofford | T, 1-1",
 "Final Aug 28 Men's · Charlotte at Vermont | T, 2-2",
 "Final Sep 3 Men's · Charlotte vs South Carolina | L, 1-2",
 "Final Sep 11 Men's · Charlotte at Florida Atlantic | T, 1-1",
 "Final Sep 15 Men's · Charlotte vs Winthrop | W, 2-1",
 "Final Sep 20 Men's · Charlotte vs UAB | W, 1-0",
 "Final Sep 26 Men's · Charlotte at Temple | W, 2-1",
 "Final Oct 3 Men's · Charlotte at ETSU | W, 4-2",
 "Final Oct 6 Men's · Charlotte vs Mercer | W, 6-0",
 "Final Oct 11 Men's · Charlotte vs South Florida | W, 1-0",
 "Final Oct 17 Men's · Charlotte vs FIU | T, 1-1",
 "Today Oct 22, 8:00 PM Men's · Charlotte at Tulsa | ",
 "Upcoming Oct 28, 7:00 PM Men's · Charlotte at Memphis | ",
 "Upcoming Nov 1, 6:00 PM Men's · Charlotte vs Missouri State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:00 PM Charlotte at UNCG | ",
 "Upcoming Oct 24, 2:00 PM Charlotte vs App State | ",
 "Upcoming Oct 25, 2:00 PM Charlotte vs Duke | ",
 "Upcoming Oct 28, 6:00 PM Charlotte vs Queens | ",
 "Upcoming Oct 29, 7:00 PM Charlotte vs Catawba | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Charlotte at Kitty Harrison Invitational | Completed",
 "Final Sep 19 Women's · Charlotte at ITA All Americans | Completed",
 "Final Oct 1 Women's · Charlotte at 49er Invite | Completed",
 "Final Oct 15 Women's · Charlotte at ITA Regionals | Completed",
 "Today Oct 22 Women's · Charlotte at American Conference Individual Championships | ",
 "Upcoming Oct 30 Women's · Charlotte at Elon Invite | ",
 "Upcoming Nov 5 Women's · Charlotte at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · Charlotte at ITA Conference Masters Championships | ",
 "Upcoming Nov 6 Women's · Charlotte at UNF Fall Invite | ",
 "Upcoming Nov 17 Women's · Charlotte at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Charlotte at Elon Invite | Completed",
 "Final Sep 25 Men's · Charlotte at Liberty Invite | Completed",
 "Final Oct 8 Men's · Charlotte at ITA Regionals | Completed",
 "Today Oct 22 Men's · Charlotte at American Conference Individual Championships | ",
 "Upcoming Oct 23 Men's · Charlotte at Wake Forest Invitational | ",
 "Upcoming Nov 5 Men's · Charlotte at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Charlotte at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Charlotte vs Bryant | W, 3-0",
 "Final Aug 29 Charlotte vs App State | L, 2-3",
 "Final Aug 30 Charlotte vs North Carolina A&T | W, 3-0",
 "Final Sep 4 Charlotte vs Wofford | L, 0-3",
 "Final Sep 5 Charlotte vs George Washington | L, 0-3",
 "Final Sep 6 Charlotte at NC State | L, 2-3",
 "Final Sep 11 Charlotte at LSU | L, 0-3",
 "Final Sep 11 Charlotte at Southeastern Louisiana | L, 1-3",
 "Final Sep 12 Charlotte vs Texas Southern | L, 0-3",
 "Final Sep 17 Charlotte at Queens | W, 3-1",
 "Final Sep 19 Charlotte at Davidson | L, 1-3",
 "Final Sep 23 Charlotte at East Carolina | L, 0-3",
 "Final Sep 27 Charlotte at Temple | L, 0-3",
 "Final Oct 2 Charlotte vs UTSA | L, 1-3",
 "Final Oct 4 Charlotte vs North Texas | W, 3-2",
 "Final Oct 7 Charlotte vs East Carolina | L, 0-3",
 "Final Oct 9 Charlotte at Tulane | L, 0-3",
 "Final Oct 16 Charlotte at South Florida | L, 0-3",
 "Final Oct 18 Charlotte at Florida Atlantic | L, 0-3",
 "Upcoming Oct 23, 12:00 PM Charlotte vs Temple | ",
 "Upcoming Oct 25, 1:00 PM Charlotte vs Wichita State | ",
 "Upcoming Oct 30, 7:30 PM Charlotte at UAB | ",
 "Upcoming Nov 1, 2:00 PM Charlotte at Memphis | ",
 "Upcoming Nov 6, 6:00 PM Charlotte vs Tulsa | ",
 "Upcoming Nov 8, 1:00 PM Charlotte vs Tulane | ",
 "Upcoming Nov 13, 7:00 PM Charlotte at Rice | ",
 "Upcoming Nov 15, 1:00 PM Charlotte vs Florida Atlantic | ",
 "Upcoming Nov 20 Charlotte at American Conference Championships | "
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
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Charlotte module checks passed");
