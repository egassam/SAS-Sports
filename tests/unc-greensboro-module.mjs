import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uncGreensboroSchool} from '../src/schools/unc-greensboro.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='unc-greensboro');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uncGreensboroHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/unc-greensboro-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uncgspartans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['unc-greensboro'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',uncGreensboroSchool.scheduleUrls],['roster',uncGreensboroSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('unc-greensboro|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uncgspartans.com',`${key} must stay on uncgspartans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uncgspartans.com/sports/baseball/schedule"],"roster":["https://uncgspartans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uncgspartans.com/sports/mens-basketball/schedule","https://uncgspartans.com/sports/womens-basketball/schedule"],"roster":["https://uncgspartans.com/sports/mens-basketball/roster","https://uncgspartans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uncgspartans.com/sports/cross-country/schedule"],"roster":["https://uncgspartans.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://uncgspartans.com/sports/womens-golf/schedule","https://uncgspartans.com/sports/mens-golf/schedule"],"roster":["https://uncgspartans.com/sports/womens-golf/roster","https://uncgspartans.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://uncgspartans.com/sports/womens-soccer/schedule","https://uncgspartans.com/sports/mens-soccer/schedule"],"roster":["https://uncgspartans.com/sports/womens-soccer/roster","https://uncgspartans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uncgspartans.com/sports/softball/schedule"],"roster":["https://uncgspartans.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://uncgspartans.com/sports/womens-tennis/schedule","https://uncgspartans.com/sports/mens-tennis/schedule"],"roster":["https://uncgspartans.com/sports/womens-tennis/roster","https://uncgspartans.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uncgspartans.com/sports/track-and-field/schedule"],"roster":["https://uncgspartans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://uncgspartans.com/sports/womens-volleyball/schedule"],"roster":["https://uncgspartans.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'unc-greensboro|"+sport+"':"),`${sport} routes must live in the UNC Greensboro module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://uncgspartans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uncGreensboroHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=unc-greensboro)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 24 Men's · UNCG at UNC Wilmington (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · UNCG vs Milligan | ",
 "Upcoming Nov 6 Men's · UNCG at Elon | ",
 "Upcoming Nov 9 Men's · UNCG at UIC | ",
 "Upcoming Nov 11, 7:00 PM Men's · UNCG vs Lees-McRae | ",
 "Upcoming Nov 14, 11:00 AM Men's · UNCG at Cornell | ",
 "Upcoming Nov 18, 8:00 PM Men's · UNCG at Gardner-Webb | ",
 "Upcoming Nov 21, 11:00 AM Men's · UNCG vs USC Upstate | ",
 "Upcoming Nov 23 Men's · UNCG at Pepperdine | ",
 "Upcoming Nov 24, 9:00 PM Men's · UNCG at UC Santa Barbara | ",
 "Upcoming Dec 1, 6:00 PM Men's · UNCG at VMI | ",
 "Upcoming Dec 5, 2:00 PM Men's · UNCG vs Furman | ",
 "Upcoming Dec 11 Men's · UNCG at NC State | ",
 "Upcoming Dec 15 Men's · UNCG at Seton Hall | ",
 "Upcoming Dec 19 Men's · UNCG at ETSU | ",
 "Upcoming Dec 21 Men's · UNCG vs Carolina | ",
 "Upcoming Dec 30, 7:00 PM Men's · UNCG vs The Citadel | ",
 "Upcoming Jan 2, 2:00 PM Men's · UNCG vs Wofford | ",
 "Upcoming Jan 7, 7:00 PM Men's · UNCG at Chattanooga | ",
 "Upcoming Jan 9, 7:30 PM Men's · UNCG at Tennessee Tech | ",
 "Upcoming Jan 13, 7:00 PM Men's · UNCG vs Western Carolina | ",
 "Upcoming Jan 16, 2:00 PM Men's · UNCG vs ETSU | ",
 "Upcoming Jan 21, 7:30 PM Men's · UNCG at Samford | ",
 "Upcoming Jan 23, 2:00 PM Men's · UNCG at Mercer | ",
 "Upcoming Jan 28, 7:00 PM Men's · UNCG vs Tennessee Tech | ",
 "Upcoming Jan 30 Men's · UNCG vs Chattanooga | ",
 "Upcoming Feb 3 Men's · UNCG at The Citadel | ",
 "Upcoming Feb 11, 7:00 PM Men's · UNCG vs Samford | ",
 "Upcoming Feb 13 Men's · UNCG vs Mercer | ",
 "Upcoming Feb 18, 6:00 PM Men's · UNCG at Wofford | ",
 "Upcoming Feb 20 Men's · UNCG at Western Carolina | ",
 "Upcoming Feb 24, 7:00 PM Men's · UNCG vs VMI | ",
 "Upcoming Feb 27, 4:00 PM Men's · UNCG at Furman | ",
 "Upcoming Mar 5 Men's · UNCG at SoCon Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 5:00 PM Women's · UNCG at Wake Forest (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · UNCG vs Presbyterian | ",
 "Upcoming Nov 5, 7:00 PM Women's · UNCG vs Columbia College (S.C.) | ",
 "Upcoming Nov 8, 2:00 PM Women's · UNCG at Clemson | ",
 "Upcoming Nov 11, 6:00 PM Women's · UNCG at Gardner-Webb | ",
 "Upcoming Nov 14, 1:00 PM Women's · UNCG vs USC Upstate | ",
 "Upcoming Nov 19, 7:00 PM Women's · UNCG vs North Carolina Central | ",
 "Upcoming Nov 25, 11:00 AM Women's · UNCG vs Montreat | ",
 "Upcoming Nov 29, 2:00 PM Women's · UNCG at Virginia Tech | ",
 "Upcoming Dec 2, 7:00 PM Women's · UNCG vs Longwood | ",
 "Upcoming Dec 6, 2:00 PM Women's · UNCG at Richmond | ",
 "Upcoming Dec 13, 2:00 PM Women's · UNCG vs Virginia University of Lynchburg | ",
 "Upcoming Dec 16, 7:00 PM Women's · UNCG vs Carolina | ",
 "Upcoming Dec 20, 1:00 PM Women's · UNCG at Elon | ",
 "Upcoming Dec 29, 7:00 PM Women's · UNCG vs Furman | ",
 "Upcoming Jan 2, 2:00 PM Women's · UNCG at Samford | ",
 "Upcoming Jan 5, 7:00 PM Women's · UNCG vs Western Carolina | ",
 "Upcoming Jan 9, 2:00 PM Women's · UNCG at Mercer | ",
 "Upcoming Jan 12, 6:30 PM Women's · UNCG at UNC Asheville | ",
 "Upcoming Jan 16, 2:00 PM Women's · UNCG at Chattanooga | ",
 "Upcoming Jan 19, 7:00 PM Women's · UNCG vs Wofford | ",
 "Upcoming Jan 23, 2:00 PM Women's · UNCG vs Tennessee Tech | ",
 "Upcoming Jan 26, 7:00 PM Women's · UNCG at ETSU | ",
 "Upcoming Jan 30 Women's · UNCG vs Mercer | ",
 "Upcoming Feb 2, 6:00 PM Women's · UNCG at Western Carolina | ",
 "Upcoming Feb 9, 11:00 AM Women's · UNCG at Wofford | ",
 "Upcoming Feb 13, 3:00 PM Women's · UNCG vs Chattanooga | ",
 "Upcoming Feb 16, 6:30 PM Women's · UNCG at Furman | ",
 "Upcoming Feb 20, 2:00 PM Women's · UNCG vs Samford | ",
 "Upcoming Feb 23, 11:00 AM Women's · UNCG vs ETSU | ",
 "Upcoming Feb 27, 2:00 PM Women's · UNCG at Tennessee Tech | ",
 "Upcoming Mar 3 Women's · UNCG at SoCon Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UNCG at Friday Night Lights (women only) | 5th of 15",
 "Final Sep 18 UNCG at adidas XC Challenge | Women's team: 8th / Men's team: 6th",
 "Final Oct 2 UNCG at Spartan Classic | Women's team: 1st / Men's team: 1st",
 "Final Oct 17 UNCG at Upstate Invitational | Women's team: 8th / Men's team: 5th",
 "Upcoming Oct 31 UNCG at SoCon Championships | ",
 "Upcoming Nov 13 UNCG at NCAA DI Southeast Regional Championships | ",
 "Upcoming Nov 21 UNCG at NCAA DI Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · UNCG at Tiger Classic | 6th",
 "Final Sep 6 Women's · UNCG at Golfweek Caledonia | 11th",
 "Final Sep 14 Women's · UNCG at Pirate Collegiate | 2nd",
 "Final Oct 12 Women's · UNCG at Terrier Collegiate | 2nd",
 "Final Oct 19 Women's · UNCG at UNCG Collegiate | 1st",
 "Upcoming Feb 7 Women's · UNCG at Treasure Coast Invitational | ",
 "Upcoming Feb 26 Women's · UNCG at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 8 Women's · UNCG at Dorado Del Mar Collegiate | ",
 "Upcoming Mar 13 Women's · UNCG at Valspar Augusta Invitational | ",
 "Upcoming Apr 4 Women's · UNCG at Ironwood Invitational | ",
 "Upcoming Apr 19 Women's · UNCG at SoCon Championships | ",
 "Upcoming May 10 Women's · UNCG at NCAA Regionals | ",
 "Upcoming May 21 Women's · UNCG at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · UNCG at Bryan National Collegiate | 1st",
 "Final Sep 21 Men's · UNCG at Rod Myers Invitational | 1st",
 "Final Oct 3 Men's · UNCG at Blessings Collegiate Invitational | 2nd",
 "Final Oct 12 Men's · UNCG at Elon Phoenix Invitational (Individuals) | No team score (individuals only)",
 "Final Oct 18 Men's · UNCG at Quail Valley Invitational | 8th",
 "Upcoming Feb 7 Men's · UNCG at Dorado Beach Collegiate | ",
 "Upcoming Feb 12 Men's · UNCG at Palmas del Mar Collegiate | ",
 "Upcoming Mar 8 Men's · UNCG at Surf Club Intercollegiate | ",
 "Upcoming Mar 19 Men's · UNCG at Linger Longer Invitational | ",
 "Upcoming Mar 30 Men's · UNCG at Maridoe Collegiate | ",
 "Upcoming Apr 10 Men's · UNCG at Tarheel Collegiate | ",
 "Upcoming Apr 26 Men's · UNCG at SoCon Championships | ",
 "Upcoming May 17 Men's · UNCG at NCAA Regionals | ",
 "Upcoming May 28 Men's · UNCG at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UNCG at High Point | W, 1-0",
 "Final Aug 16 Women's · UNCG vs East Carolina | T, 2-2",
 "Final Aug 23 Women's · UNCG vs Iowa | L, 1-5",
 "Final Aug 27 Women's · UNCG vs Coastal Carolina | L, 0-1",
 "Final Aug 30 Women's · UNCG vs Radford | W, 3-0",
 "Final Sep 3 Women's · UNCG at American | W, 2-1",
 "Final Sep 6 Women's · UNCG at James Madison | L, 1-4",
 "Final Sep 10 Women's · UNCG at Campbell | W, 2-1",
 "Final Sep 17 Women's · UNCG vs Western Carolina | L, 0-1",
 "Final Sep 20 Women's · UNCG at VMI | W, 4-2",
 "Final Sep 24 Women's · UNCG at The Citadel | T, 1-1",
 "Final Oct 1 Women's · UNCG vs Tennessee Tech | W, 2-0",
 "Final Oct 4 Women's · UNCG vs Mercer | W, 3-0",
 "Final Oct 15 Women's · UNCG at Furman | L, 1-2",
 "Final Oct 18 Women's · UNCG vs ETSU | T, 0-0",
 "Final Oct 23 Women's · UNCG at Chattanooga | T, 1-1",
 "Upcoming Oct 29, 7:00 PM Women's · UNCG at Samford | ",
 "Upcoming Nov 1, 2:00 PM Women's · UNCG vs Wofford | ",
 "Upcoming Nov 6 Women's · UNCG at Southern Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UNCG vs VCU | W, 4-1",
 "Final Aug 23 Men's · UNCG vs San Francisco | T, 0-0",
 "Final Aug 28 Men's · UNCG vs West Virginia | T, 1-1",
 "Final Sep 1 Men's · UNCG at Davidson | T, 2-2",
 "Final Sep 5 Men's · UNCG at Dayton | T, 1-1",
 "Final Sep 11 Men's · UNCG at South Carolina | L, 0-1",
 "Final Sep 15 Men's · UNCG vs South Florida | W, 5-0",
 "Final Sep 19 Men's · UNCG vs Liberty | W, 2-1",
 "Final Sep 26 Men's · UNCG at Mercer | T, 0-0",
 "Final Oct 7 Men's · UNCG vs NC State | W, 3-1",
 "Final Oct 13 Men's · UNCG vs Marshall | L, 1-5",
 "Final Oct 17 Men's · UNCG at VMI | W, 4-0",
 "Final Oct 20 Men's · UNCG at High Point | T, 1-1",
 "Today Oct 24, 6:00 PM Men's · UNCG at Wofford | ",
 "Upcoming Oct 27, 6:00 PM Men's · UNCG vs Furman | ",
 "Upcoming Oct 31, 6:00 PM Men's · UNCG vs ETSU | ",
 "Upcoming Nov 3 Men's · UNCG at Southern Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:00 PM UNCG vs Charlotte | ",
 "Upcoming Oct 25, 1:00 PM UNCG vs Chowan | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · UNCG at College of Charleston Invitational | Completed",
 "Final Oct 15 Women's · UNCG at ITA Regionals | Completed",
 "Upcoming Oct 30 Women's · UNCG at William & Mary Hidden Dual | ",
 "Upcoming Jan 13 Women's · UNCG at Tennessee | ",
 "Upcoming Jan 16 Women's · UNCG vs Kansas State | ",
 "Upcoming Jan 16 Women's · UNCG at Clemson | ",
 "Upcoming Jan 25, 1:00 PM Women's · UNCG vs UNC Asheville | ",
 "Upcoming Jan 30 Women's · UNCG at Wake Forest | ",
 "Upcoming Feb 12, 1:00 PM Women's · UNCG vs UNC Wilmington | ",
 "Upcoming Feb 13, 1:00 PM Women's · UNCG vs Davidson | ",
 "Upcoming Feb 17 Women's · UNCG at North Carolina | ",
 "Upcoming Feb 19, 1:00 PM Women's · UNCG vs Queens | ",
 "Upcoming Feb 20, 1:00 PM Women's · UNCG vs Campbell | ",
 "Upcoming Feb 27, 1:00 PM Women's · UNCG vs Saint Joseph's | ",
 "Upcoming Feb 28, 1:00 PM Women's · UNCG vs James Madison | ",
 "Upcoming Mar 3 Women's · UNCG at Richmond | ",
 "Upcoming Mar 7 Women's · UNCG at Western Carolina | ",
 "Upcoming Mar 13 Women's · UNCG at Charleston Southern | ",
 "Upcoming Mar 19 Women's · UNCG at Chattanooga | ",
 "Upcoming Mar 20 Women's · UNCG at Kennesaw State | ",
 "Upcoming Mar 26 Women's · UNCG at Furman | ",
 "Upcoming Mar 31, 1:00 PM Women's · UNCG vs Wofford | ",
 "Upcoming Apr 4 Women's · UNCG at Virginia Tech | ",
 "Upcoming Apr 5 Women's · UNCG at ETSU | ",
 "Upcoming Apr 9, 1:00 PM Women's · UNCG vs Samford | ",
 "Upcoming Apr 15, 1:00 PM Women's · UNCG vs Mercer | ",
 "Upcoming Apr 22 Women's · UNCG at Southern Conference Tournament | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UNCG at Spartan Fall Invitational | Completed",
 "Final Oct 8 Men's · UNCG at ITA Regionals | Completed",
 "Final Oct 16 Men's · UNCG at UNCG Fall Invitational | Completed",
 "Upcoming Oct 30 Men's · UNCG at Pelican Bay Collegiate Invite | ",
 "Upcoming Jan 12 Men's · UNCG at NC State | ",
 "Upcoming Jan 18 Men's · UNCG at Virginia Tech | ",
 "Upcoming Jan 23, 3:00 PM Men's · UNCG at James Madison | ",
 "Upcoming Jan 30, 1:00 PM Men's · UNCG vs USC Sumter | ",
 "Upcoming Feb 2 Men's · UNCG vs Belmont Abbey | ",
 "Upcoming Feb 9, 1:00 PM Men's · UNCG vs Catawba | ",
 "Upcoming Feb 13 Men's · UNCG vs The Citadel | ",
 "Upcoming Feb 19, 12:30 PM Men's · UNCG at North Carolina Central | ",
 "Upcoming Feb 26, 2:00 PM Men's · UNCG vs Coastal Carolina | ",
 "Upcoming Mar 6 Men's · UNCG vs ETSU | ",
 "Upcoming Mar 12, 3:00 PM Men's · UNCG at Furman | ",
 "Upcoming Mar 14, 1:00 PM Men's · UNCG vs Wofford | ",
 "Upcoming Mar 17 Men's · UNCG vs Richmond | ",
 "Upcoming Mar 19, 1:00 PM Men's · UNCG at Samford | ",
 "Upcoming Mar 21 Men's · UNCG at Mercer | ",
 "Upcoming Mar 23, 2:00 PM Men's · UNCG vs North Carolina A&T | ",
 "Upcoming Mar 25, 3:00 PM Men's · UNCG at Davidson | ",
 "Upcoming Mar 27 Men's · UNCG at Tennessee Tech | ",
 "Upcoming Mar 31, 2:00 PM Men's · UNCG vs Campbell | ",
 "Upcoming Apr 6, 2:00 PM Men's · UNCG vs UNC Asheville | ",
 "Upcoming Apr 15, 3:00 PM Men's · UNCG at Elon | ",
 "Upcoming Apr 17, 1:00 PM Men's · UNCG vs Chattanooga | ",
 "Upcoming Apr 22 Men's · UNCG at SoCon Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UNCG at South Carolina | L, 0-3",
 "Final Aug 29 UNCG vs Northeastern | W, 3-1",
 "Final Sep 4 UNCG at Clemson | L, 1-3",
 "Final Sep 5 UNCG vs Appalachian State | W, 3-0",
 "Final Sep 6 UNCG vs East Carolina | W, 3-2",
 "Final Sep 11 UNCG at North Carolina A&T | W, 3-1",
 "Final Sep 12 UNCG vs Davidson | L, 1-3",
 "Final Sep 12 UNCG vs North Carolina Central | W, 3-1",
 "Final Sep 18 UNCG at James Madison | L, 1-3",
 "Final Sep 19 UNCG vs George Mason | W, 3-2",
 "Final Sep 20 UNCG vs Delaware State | W, 3-2",
 "Final Sep 25 UNCG vs Western Carolina | W, 3-0",
 "Final Sep 26 UNCG vs Western Carolina | W, 3-1",
 "Final Oct 2 UNCG at Wofford | L, 0-3",
 "Final Oct 3 UNCG at Wofford | L, 0-3",
 "Final Oct 6 UNCG at ETSU | L, 2-3",
 "Final Oct 9 UNCG vs The Citadel | W, 3-0",
 "Final Oct 10 UNCG vs The Citadel | W, 3-1",
 "Final Oct 16 UNCG at Tennessee Tech | W, 3-0",
 "Final Oct 17 UNCG at Tennessee Tech | W, 3-0",
 "Final Oct 23 UNCG vs Chattanooga | W, 3-1",
 "Today Oct 24, 3:00 PM UNCG vs Chattanooga | ",
 "Upcoming Oct 27, 6:00 PM UNCG vs ETSU | ",
 "Upcoming Oct 30, 6:00 PM UNCG at Furman | ",
 "Upcoming Oct 31, 7:00 PM UNCG at Furman | ",
 "Upcoming Nov 6, 6:00 PM UNCG vs Samford | ",
 "Upcoming Nov 7, 3:00 PM UNCG vs Samford | ",
 "Upcoming Nov 13, 6:00 PM UNCG at Mercer | ",
 "Upcoming Nov 14, 2:00 PM UNCG at Mercer | ",
 "Upcoming Nov 19 UNCG at Southern Conference Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UNC Greensboro module checks passed");
