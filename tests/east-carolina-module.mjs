import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {eastCarolinaSchool} from '../src/schools/east-carolina.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='east-carolina');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,eastCarolinaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/east-carolina-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ecupirates.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['east-carolina'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',eastCarolinaSchool.scheduleUrls],['roster',eastCarolinaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('east-carolina|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ecupirates.com',`${key} must stay on ecupirates.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ecupirates.com/sports/baseball/schedule"],"roster":["https://ecupirates.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ecupirates.com/sports/mens-basketball/schedule","https://ecupirates.com/sports/womens-basketball/schedule"],"roster":["https://ecupirates.com/sports/mens-basketball/roster","https://ecupirates.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ecupirates.com/sports/cross-country/schedule"],"roster":["https://ecupirates.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ecupirates.com/sports/football/schedule"],"roster":["https://ecupirates.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ecupirates.com/sports/womens-golf/schedule","https://ecupirates.com/sports/mens-golf/schedule"],"roster":["https://ecupirates.com/sports/womens-golf/roster","https://ecupirates.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://ecupirates.com/sports/womens-lacrosse/schedule"],"roster":["https://ecupirates.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://ecupirates.com/sports/womens-soccer/schedule"],"roster":["https://ecupirates.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ecupirates.com/sports/softball/schedule"],"roster":["https://ecupirates.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ecupirates.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://ecupirates.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://ecupirates.com/sports/womens-tennis/schedule"],"roster":["https://ecupirates.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://ecupirates.com/sports/track-and-field/schedule"],"roster":["https://ecupirates.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ecupirates.com/sports/womens-volleyball/schedule"],"roster":["https://ecupirates.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'east-carolina|"+sport+"':"),`${sport} routes must live in the East Carolina module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ecupirates.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.eastCarolinaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=east-carolina)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24 East Carolina vs Pitt Community College | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · East Carolina vs USC Upstate | ",
 "Upcoming Nov 7, 2:00 PM Men's · East Carolina vs UNCW | ",
 "Upcoming Nov 11, 4:00 PM Men's · East Carolina vs NC A&T | ",
 "Upcoming Nov 14, 4:00 PM Men's · East Carolina vs Delaware State | ",
 "Upcoming Nov 20, 9:00 PM Men's · East Carolina vs Utah Valley | ",
 "Upcoming Nov 21 Men's · East Carolina at Paradise Jam | ",
 "Upcoming Nov 27, 7:00 PM Men's · East Carolina vs NC Wesleyan | ",
 "Upcoming Dec 1, 7:00 PM Men's · East Carolina vs Richmond | ",
 "Upcoming Dec 5, 2:00 PM Men's · East Carolina vs Radford | ",
 "Upcoming Dec 9, 7:00 PM Men's · East Carolina vs Coastal Carolina | ",
 "Upcoming Dec 13, 1:00 PM Men's · East Carolina at App State | ",
 "Upcoming Dec 18, 7:00 PM Men's · East Carolina vs Campbell | ",
 "Upcoming Dec 21, 4:00 PM Men's · East Carolina vs Virginia-Lynchburg | ",
 "Upcoming Dec 30 Men's · East Carolina at Memphis | ",
 "Upcoming Jan 2 Men's · East Carolina at UAB | ",
 "Upcoming Jan 7 Men's · East Carolina vs Tulane | ",
 "Upcoming Jan 10 Men's · East Carolina vs UTSA | ",
 "Upcoming Jan 14 Men's · East Carolina at Tulsa | ",
 "Upcoming Jan 17 Men's · East Carolina at Wichita State | ",
 "Upcoming Jan 23 Men's · East Carolina vs UAB | ",
 "Upcoming Jan 28 Men's · East Carolina vs Florida Atlantic | ",
 "Upcoming Jan 31 Men's · East Carolina vs Charlotte | ",
 "Upcoming Feb 4 Men's · East Carolina at Rice | ",
 "Upcoming Feb 7 Men's · East Carolina at Temple | ",
 "Upcoming Feb 10 Men's · East Carolina vs South Florida | ",
 "Upcoming Feb 17 Men's · East Carolina vs Rice | ",
 "Upcoming Feb 21 Men's · East Carolina at Tulane | ",
 "Upcoming Feb 24 Men's · East Carolina at UTSA | ",
 "Upcoming Feb 27 Men's · East Carolina vs Temple | ",
 "Upcoming Mar 2 Men's · East Carolina vs North Texas | ",
 "Upcoming Mar 7 Men's · East Carolina at Charlotte | ",
 "Upcoming Mar 10 Men's · East Carolina at American Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 11:00 AM Women's · East Carolina vs Charleston Southern | ",
 "Upcoming Nov 7, 5:00 PM Women's · East Carolina vs Liberty | ",
 "Upcoming Nov 11, 7:00 PM Women's · East Carolina vs High Point | ",
 "Upcoming Nov 15, 1:00 PM Women's · East Carolina at JMU | ",
 "Upcoming Nov 22, 1:00 PM Women's · East Carolina at UNCW | ",
 "Upcoming Nov 27 Women's · East Carolina vs Delaware | ",
 "Upcoming Nov 28 Women's · East Carolina at California | ",
 "Upcoming Dec 2, 6:00 PM Women's · East Carolina at Coastal Carolina | ",
 "Upcoming Dec 6, 2:00 PM Women's · East Carolina vs UMES | ",
 "Upcoming Dec 12, 2:00 PM Women's · East Carolina vs UNC Asheville | ",
 "Upcoming Dec 17, 11:00 AM Women's · East Carolina vs Campbell | ",
 "Upcoming Dec 21, 1:00 PM Women's · East Carolina vs Winthrop | ",
 "Upcoming Dec 30 Women's · East Carolina vs Rice | ",
 "Upcoming Jan 3 Women's · East Carolina at Tulsa | ",
 "Upcoming Jan 6 Women's · East Carolina at Wichita State | ",
 "Upcoming Jan 9 Women's · East Carolina vs Tulane | ",
 "Upcoming Jan 13 Women's · East Carolina at Temple | ",
 "Upcoming Jan 17 Women's · East Carolina vs South Florida | ",
 "Upcoming Jan 21 Women's · East Carolina at Florida Atlantic | ",
 "Upcoming Jan 27 Women's · East Carolina vs Memphis | ",
 "Upcoming Jan 30 Women's · East Carolina vs UTSA | ",
 "Upcoming Feb 3 Women's · East Carolina at South Florida | ",
 "Upcoming Feb 6 Women's · East Carolina at UAB | ",
 "Upcoming Feb 9 Women's · East Carolina vs Florida Atlantic | ",
 "Upcoming Feb 13 Women's · East Carolina vs Charlotte | ",
 "Upcoming Feb 17 Women's · East Carolina at Rice | ",
 "Upcoming Feb 20 Women's · East Carolina at UTSA | ",
 "Upcoming Feb 24 Women's · East Carolina vs UAB | ",
 "Upcoming Feb 27 Women's · East Carolina vs North Texas | ",
 "Upcoming Mar 6 Women's · East Carolina at Charlotte | ",
 "Upcoming Mar 9 Women's · East Carolina at American Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 East Carolina at Elon Friday Night Lights | Women's team: 7th / Men's team: 10th",
 "Final Sep 18 East Carolina at Adidas Challenge | Women's team: 11th",
 "Final Oct 2 East Carolina at Dill Family Invitational | Women's team: 1st / Men's team: 3rd",
 "Upcoming Oct 31 East Carolina at American Conference Championship | ",
 "Upcoming Nov 14 East Carolina at NCAA Southeast XC Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 East Carolina at Alabama | L, 10-48",
 "Final Sep 12 East Carolina vs App State | L, 24-27",
 "Final Sep 19 East Carolina at Old Dominion | W, 20-17",
 "Final Sep 26 East Carolina vs N.C. Central | W, 42-9",
 "Final Oct 10 East Carolina vs Rice | W, 28-12",
 "Final Oct 15 East Carolina at UAB | L, 17-30",
 "Today Oct 22, 7:30 PM East Carolina at Memphis | ",
 "Upcoming Oct 31, 3:00 PM East Carolina vs Temple | ",
 "Upcoming Nov 6, 7:30 PM East Carolina vs South Florida | ",
 "Upcoming Nov 14 East Carolina at Charlotte | ",
 "Upcoming Nov 21 East Carolina at Army | ",
 "Upcoming Nov 28 East Carolina vs Florida Atlantic | ",
 "Upcoming Dec 5, 8:00 PM East Carolina at American Conference | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · East Carolina at Tiger Classic | 3rd of 8",
 "Final Sep 14 Women's · East Carolina at Pirate Collegiate Classic | 3rd of 13",
 "Final Sep 21 Women's · East Carolina at Bettie Lou Evans Invitational | 8th of 13",
 "Final Oct 4 Women's · East Carolina at Mercedes Benz Intercollegiate | 5th of 15",
 "Upcoming Oct 23 Women's · East Carolina at Landfall Tradition | ",
 "Upcoming Feb 1 Women's · East Carolina at UCF Challenge | ",
 "Upcoming Mar 1 Women's · East Carolina at Daniel Island Intercollegiate | ",
 "Upcoming Mar 15 Women's · East Carolina at Briars Creek Invitational | ",
 "Upcoming Mar 21 Women's · East Carolina at City of Oaks Collegiate | ",
 "Upcoming Apr 4 Women's · East Carolina at Ironwood Invitational | ",
 "Upcoming Apr 19 Women's · East Carolina at American Conference Championship | ",
 "Upcoming May 10 Women's · East Carolina at NCAA Regional Championship | ",
 "Upcoming May 21 Women's · East Carolina at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · East Carolina at Myrtle Beach Golf Trips Intercollegiate | T11th of 16",
 "Final Sep 21 Men's · East Carolina at River Run Collegiate | T3rd of 13",
 "Final Sep 28 Men's · East Carolina at Ironwood Collegiate Classic | 1st of 14",
 "Final Oct 19 Men's · East Carolina at Bank of Tennessee Collegiate | 11th of 13",
 "Upcoming Oct 25 Men's · East Carolina at ODU/Kilmarlic Collegiate | ",
 "Upcoming Feb 15 Men's · East Carolina at Wexford Intercollegiate | ",
 "Upcoming Mar 8 Men's · East Carolina at Cleveland Golf Palmetto Invitational | ",
 "Upcoming Mar 14 Men's · East Carolina at Cutter Creek Intercollegiate | ",
 "Upcoming Mar 22 Men's · East Carolina at Seahawk Invitational | ",
 "Upcoming Mar 29 Men's · East Carolina at ECU Intercollegiate | ",
 "Upcoming Apr 25 Men's · East Carolina at American Conference Championship | ",
 "Upcoming May 17 Men's · East Carolina at NCAA Regional Championship | ",
 "Upcoming May 28 Men's · East Carolina at NCAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 East Carolina at Liberty | L, 0-2",
 "Final Aug 16 East Carolina at UNCG | T, 2-2",
 "Final Aug 20 East Carolina vs Campbell | T, 0-0",
 "Final Aug 23 East Carolina vs High Point | T, 2-2",
 "Final Aug 27 East Carolina vs App State | L, 0-4",
 "Final Aug 30 East Carolina at Western Carolina | W, 2-0",
 "Final Sep 3 East Carolina at UNCW | T, 0-0",
 "Final Sep 10 East Carolina vs VCU | T, 2-2",
 "Final Sep 17 East Carolina at Tulsa | T, 1-1",
 "Final Sep 24 East Carolina vs UTSA | W, 1-0",
 "Final Sep 27 East Carolina vs UAB | L, 1-2",
 "Final Oct 1 East Carolina at Temple | T, 2-2",
 "Final Oct 8 East Carolina at Charlotte | L, 0-4",
 "Final Oct 11 East Carolina vs Rice | T, 2-2",
 "Final Oct 15 East Carolina at Florida Atlantic | W, 1-0",
 "Today Oct 22, 7:00 PM East Carolina vs North Texas | ",
 "Upcoming Oct 30, 8:00 PM East Carolina at Memphis | ",
 "Upcoming Nov 3, 7:00 PM East Carolina vs South Florida | ",
 "Upcoming Nov 8 East Carolina at American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 25, 12:00 PM East Carolina vs Elon | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 East Carolina at TYR Fall Classic | Completed",
 "Final Oct 16 East Carolina vs UNC Pembroke | W, 251-96",
 "Final Oct 16 East Carolina vs UNC Asheville | W, 284-68",
 "Upcoming Oct 23 East Carolina at UNCW | ",
 "Upcoming Oct 31 East Carolina at Georgia Tech | ",
 "Upcoming Oct 31 East Carolina vs Boston College | ",
 "Upcoming Nov 7, 1:00 PM East Carolina at Richmond | ",
 "Upcoming Nov 7, 1:00 PM East Carolina at Campbell | ",
 "Upcoming Nov 7, 1:00 PM East Carolina at Georgia Southern | ",
 "Upcoming Nov 17 East Carolina at Gamecock Invitational (Swimming Only) | ",
 "Upcoming Nov 19 East Carolina at TYR '85 Invitational | ",
 "Upcoming Jan 15 East Carolina at ECU Dual Meet | ",
 "Upcoming Jan 29 East Carolina at NC State | ",
 "Upcoming Jan 29 East Carolina at Gardner-Webb | ",
 "Upcoming Feb 18 East Carolina at American Conference Swimming and Diving Championship | ",
 "Upcoming Mar 8 East Carolina at NCAA Zone Diving | ",
 "Upcoming Mar 12 East Carolina at CSCAA NIC Championship | ",
 "Upcoming Mar 17 East Carolina at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 East Carolina at Charleston Southern Invite | Completed",
 "Final Oct 2 East Carolina at Elon Invitational | Completed",
 "Final Oct 15 East Carolina at ITA Carolina Regionals | Completed",
 "Today Oct 22 East Carolina at American Individuals | ",
 "Upcoming Oct 23 East Carolina at CNU Fall Invite | ",
 "Upcoming Oct 30 East Carolina at William & Mary Hidden Duals | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 East Carolina vs Bethune-Cookman | W, 3-0",
 "Final Aug 29 East Carolina vs Hampton | W, 3-0",
 "Final Aug 30 East Carolina vs Radford | W, 3-1",
 "Final Sep 4 East Carolina vs Appalachian State | W, 3-2",
 "Final Sep 5 East Carolina at Clemson | L, 1-3",
 "Final Sep 6 East Carolina vs UNC Greensboro | L, 2-3",
 "Final Sep 11 East Carolina at Wake Forest | W, 3-0",
 "Final Sep 12 East Carolina vs East Tennessee State | L, 2-3",
 "Final Sep 13 East Carolina vs Georgia Southern | L, 0-3",
 "Final Sep 17 East Carolina vs Old Dominion | W, 3-0",
 "Final Sep 18 East Carolina vs Maryland | L, 0-3",
 "Final Sep 19 East Carolina vs Campbell | W, 3-0",
 "Final Sep 23 East Carolina vs Charlotte | W, 3-0",
 "Final Sep 25 East Carolina at Rice | W, 3-1",
 "Final Oct 2 East Carolina vs North Texas | W, 3-0",
 "Final Oct 4 East Carolina vs UTSA | W, 3-0",
 "Final Oct 7 East Carolina at Charlotte | W, 3-0",
 "Final Oct 11 East Carolina vs Florida Atlantic | L, 2-3",
 "Final Oct 16 East Carolina at UAB | W, 3-0",
 "Final Oct 18 East Carolina at Memphis | W, 3-1",
 "Upcoming Oct 23, 6:00 PM East Carolina vs Wichita State | ",
 "Upcoming Oct 25, 2:00 PM East Carolina at Tulane | ",
 "Upcoming Oct 30, 12:00 PM East Carolina vs Temple | ",
 "Upcoming Nov 1, 1:00 PM East Carolina vs South Florida | ",
 "Upcoming Nov 6, 12:00 PM East Carolina at Temple | ",
 "Upcoming Nov 8, 12:00 PM East Carolina vs Tulsa | ",
 "Upcoming Nov 13, 6:00 PM East Carolina at Florida Atlantic | ",
 "Upcoming Nov 15, 1:00 PM East Carolina at South Florida | ",
 "Upcoming Nov 19 East Carolina at American Volleyball Championship | "
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
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("East Carolina module checks passed");
