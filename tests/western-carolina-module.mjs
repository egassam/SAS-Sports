import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westernCarolinaSchool} from '../src/schools/western-carolina.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='western-carolina');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westernCarolinaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/western-carolina-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit catamountsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['western-carolina'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',westernCarolinaSchool.scheduleUrls],['roster',westernCarolinaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('western-carolina|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'catamountsports.com',`${key} must stay on catamountsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://catamountsports.com/sports/baseball/schedule"],"roster":["https://catamountsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://catamountsports.com/sports/mens-basketball/schedule","https://catamountsports.com/sports/womens-basketball/schedule"],"roster":["https://catamountsports.com/sports/mens-basketball/roster","https://catamountsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://catamountsports.com/sports/mens-cross-country/schedule"],"roster":["https://catamountsports.com/sports/mens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://catamountsports.com/sports/football/schedule"],"roster":["https://catamountsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://catamountsports.com/sports/womens-golf/schedule","https://catamountsports.com/sports/mens-golf/schedule"],"roster":["https://catamountsports.com/sports/womens-golf/roster","https://catamountsports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://catamountsports.com/sports/womens-soccer/schedule"],"roster":["https://catamountsports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://catamountsports.com/sports/softball/schedule"],"roster":["https://catamountsports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://catamountsports.com/sports/womens-tennis/schedule"],"roster":["https://catamountsports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://catamountsports.com/sports/mens-track-and-field/schedule"],"roster":["https://catamountsports.com/sports/mens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://catamountsports.com/sports/womens-volleyball/schedule"],"roster":["https://catamountsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'western-carolina|"+sport+"':"),`${sport} routes must live in the Western Carolina module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://catamountsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westernCarolinaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=western-carolina)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 20 Men's · Western Carolina at Appalachian State (Exhibition) | W, 83-76",
 "Upcoming Oct 26, 6:00 PM Men's · Western Carolina vs USC Upstate (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Western Carolina at RV/RV North Carolina | ",
 "Upcoming Nov 7, 5:30 PM Men's · Western Carolina at UNC Asheville | ",
 "Upcoming Nov 11, 6:00 PM Men's · Western Carolina vs Virginia University of Lynchburg | ",
 "Upcoming Nov 14, 7:00 PM Men's · Western Carolina vs Lipscomb | ",
 "Upcoming Nov 17, 7:00 PM Men's · Western Carolina at Butler | ",
 "Upcoming Nov 21 Men's · Western Carolina at Wake Forest | ",
 "Upcoming Nov 25, 2:00 PM Men's · Western Carolina vs Montreat | ",
 "Upcoming Nov 29 Men's · Western Carolina at Charlotte | ",
 "Upcoming Dec 2, 6:00 PM Men's · Western Carolina vs Piedmont | ",
 "Upcoming Dec 5, 1:00 PM Men's · Western Carolina vs The Citadel | ",
 "Upcoming Dec 7, 11:00 AM Men's · Western Carolina vs Southern Virginia | ",
 "Upcoming Dec 13, 12:00 PM Men's · Western Carolina at Virginia | ",
 "Upcoming Dec 19, 6:30 PM Men's · Western Carolina at Furman | ",
 "Upcoming Dec 22, 6:00 PM Men's · Western Carolina at Wofford | ",
 "Upcoming Dec 30, 1:00 PM Men's · Western Carolina vs Chattanooga | ",
 "Upcoming Jan 2, 1:00 PM Men's · Western Carolina vs VMI | ",
 "Upcoming Jan 6, 6:00 PM Men's · Western Carolina at Mercer | ",
 "Upcoming Jan 9, 4:00 PM Men's · Western Carolina at ETSU | ",
 "Upcoming Jan 13, 7:00 PM Men's · Western Carolina at UNCG | ",
 "Upcoming Jan 16, 1:00 PM Men's · Western Carolina vs Samford | ",
 "Upcoming Jan 18, 6:00 PM Men's · Western Carolina vs Mercer | ",
 "Upcoming Jan 21, 7:30 PM Men's · Western Carolina at Tennessee Tech | ",
 "Upcoming Jan 23, 4:30 PM Men's · Western Carolina at Chattanooga | ",
 "Upcoming Jan 27, 6:00 PM Men's · Western Carolina vs Wofford | ",
 "Upcoming Feb 3, 6:00 PM Men's · Western Carolina vs Tennessee Tech | ",
 "Upcoming Feb 7, 4:00 PM Men's · Western Carolina at Samford | ",
 "Upcoming Feb 10, 7:00 PM Men's · Western Carolina at The Citadel | ",
 "Upcoming Feb 13, 10:00 AM Men's · Western Carolina vs Furman | ",
 "Upcoming Feb 18, 6:00 PM Men's · Western Carolina vs ETSU | ",
 "Upcoming Feb 20, 3:30 PM Men's · Western Carolina vs UNCG | ",
 "Upcoming Feb 27, 1:00 PM Men's · Western Carolina at VMI | ",
 "Upcoming Mar 5 Men's · Western Carolina vs SoCon 1st Round | ",
 "Upcoming Mar 6 Men's · Western Carolina at SoCon Quarterfinals | ",
 "Upcoming Mar 7 Men's · Western Carolina at SoCon Semifinals | ",
 "Upcoming Mar 8 Men's · Western Carolina at SoCon Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Western Carolina vs Carolina | ",
 "Upcoming Nov 5, 6:00 PM Women's · Western Carolina vs West Florida | ",
 "Upcoming Nov 8, 2:00 PM Women's · Western Carolina vs Johnson University - Tennessee | ",
 "Upcoming Nov 12, 6:30 PM Women's · Western Carolina at UNC Asheville | ",
 "Upcoming Nov 15, 2:00 PM Women's · Western Carolina vs Virginia University of Lynchburg | ",
 "Upcoming Nov 18, 5:00 PM Women's · Western Carolina at Cincinnati | ",
 "Upcoming Nov 22, 2:00 PM Women's · Western Carolina vs Morehead State | ",
 "Upcoming Nov 27, 4:00 PM Women's · Western Carolina vs Queens | ",
 "Upcoming Nov 28, 4:30 PM Women's · Western Carolina at Appalachian State | ",
 "Upcoming Dec 2, 11:30 AM Women's · Western Carolina vs Gardner-Webb | ",
 "Upcoming Dec 5, 2:00 PM Women's · Western Carolina at Presbyterian | ",
 "Upcoming Dec 12, 6:00 PM Women's · Western Carolina at USC Upstate | ",
 "Upcoming Dec 15, 11:00 AM Women's · Western Carolina at Clemson | ",
 "Upcoming Dec 19, 2:00 PM Women's · Western Carolina vs Kennesaw State | ",
 "Upcoming Dec 21, 12:00 PM Women's · Western Carolina vs Columbia College (S.C.) | ",
 "Upcoming Dec 29, 6:00 PM Women's · Western Carolina vs Mercer | ",
 "Upcoming Jan 2, 4:00 PM Women's · Western Carolina at ETSU | ",
 "Upcoming Jan 5, 7:00 PM Women's · Western Carolina at UNCG | ",
 "Upcoming Jan 9, 2:00 PM Women's · Western Carolina vs Wofford | ",
 "Upcoming Jan 12, 6:00 PM Women's · Western Carolina at Samford | ",
 "Upcoming Jan 19, 6:00 PM Women's · Western Carolina vs ETSU | ",
 "Upcoming Jan 23, 2:00 PM Women's · Western Carolina at Chattanooga | ",
 "Upcoming Jan 26, 7:00 PM Women's · Western Carolina at Furman | ",
 "Upcoming Jan 30, 2:00 PM Women's · Western Carolina vs Tennessee Tech | ",
 "Upcoming Feb 2, 6:00 PM Women's · Western Carolina vs UNCG | ",
 "Upcoming Feb 6, 2:00 PM Women's · Western Carolina at Wofford | ",
 "Upcoming Feb 9, 6:00 PM Women's · Western Carolina vs Samford | ",
 "Upcoming Feb 16, 6:30 PM Women's · Western Carolina at Tennessee Tech | ",
 "Upcoming Feb 20, 1:00 PM Women's · Western Carolina vs Furman | ",
 "Upcoming Feb 23, 7:00 PM Women's · Western Carolina at Mercer | ",
 "Upcoming Feb 27, 2:00 PM Women's · Western Carolina vs Chattanooga | ",
 "Upcoming Mar 3 Women's · Western Carolina at SoCon Basketball Tournament | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Western Carolina at Duel in The Valley | Women's team: 2nd / Men's team: 1st",
 "Final Sep 18 Western Carolina at Southern Showcase | Women's team: 19th / Men's team: 12th",
 "Final Sep 25 Western Carolina at Fall Collegiate Cross Country Invitational | Women's team: 5th / Men's team: 1st",
 "Final Oct 17 Western Carolina at Upstate Invitational | Completed",
 "Upcoming Oct 31 Western Carolina at SoCon Cross Country Championships | ",
 "Upcoming Nov 13 Western Carolina at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Western Carolina at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Western Carolina vs Eastern Kentucky | W, 45-21",
 "Final Sep 6 Western Carolina at Campbell | L, 19-28",
 "Final Sep 12 Western Carolina at Cincinnati | L, 10-62",
 "Final Sep 19 Western Carolina vs Presbyterian | W, 58-14",
 "Final Sep 26 Western Carolina at ETSU | L, 31-58",
 "Final Oct 3 Western Carolina vs Tennessee Tech | W, 44-20",
 "Final Oct 10 Western Carolina at Mercer | L, 14-17",
 "Today Oct 24, 2:30 PM Western Carolina vs Chattanooga | ",
 "Upcoming Oct 31, 2:00 PM Western Carolina at Furman | ",
 "Upcoming Nov 7, 1:00 PM Western Carolina vs Wofford | ",
 "Upcoming Nov 14, 3:30 PM Western Carolina at Samford | ",
 "Upcoming Nov 21, 1:00 PM Western Carolina vs The Citadel | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Western Carolina at Tiger Classic | 7th",
 "Final Sep 14 Women's · Western Carolina at Elon Invitational | 5th",
 "Final Sep 28 Women's · Western Carolina at Tot Hill Farm Invitational | 9th",
 "Final Oct 12 Women's · Western Carolina at Terrier Intercollegiate | 4th",
 "Final Oct 19 Women's · Western Carolina at Edisto Island Invitational | 10th",
 "Upcoming Mar 2 Women's · Western Carolina at Puerto Rico Iguana Invitational | ",
 "Upcoming Mar 15 Women's · Western Carolina at Low Country Intercollegiate | ",
 "Upcoming Mar 21 Women's · Western Carolina at City of Oaks Collegiate | ",
 "Upcoming Apr 5 Women's · Western Carolina at Hokie Highlander Collegiate | ",
 "Upcoming Apr 19 Women's · Western Carolina at Southern Conference Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Western Carolina at Augusta Jaguar Fall Invitational | 4th",
 "Final Sep 13 Men's · Western Carolina at J.T. Poston Invitational | 10th",
 "Final Sep 21 Men's · Western Carolina at Highlands Invitational | 10th",
 "Final Sep 27 Men's · Western Carolina at Badger Invitational | 9th",
 "Final Oct 12 Men's · Western Carolina at Phoenix Invitational | 3rd",
 "Upcoming Feb 2 Men's · Western Carolina at Sea Best Invitational | ",
 "Upcoming Feb 7 Men's · Western Carolina at Compadres Collegiate | ",
 "Upcoming Feb 26 Men's · Western Carolina at The Peoples Golf Championship at Sea Palms | ",
 "Upcoming Mar 19 Men's · Western Carolina at Linger Longer Invitational | ",
 "Upcoming Apr 10 Men's · Western Carolina at Tar Heel Intercollegiate | ",
 "Upcoming Apr 26 Men's · Western Carolina at Southern Conference Men's Golf Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Western Carolina vs Winthrop | W, 4-2",
 "Final Aug 16 Western Carolina vs UNCW | L, 1-2",
 "Final Aug 20 Western Carolina at App State | T, 0-0",
 "Final Aug 23 Western Carolina at Tennessee | L, 0-4",
 "Final Aug 30 Western Carolina vs East Carolina | L, 0-2",
 "Final Sep 3 Western Carolina vs NC State | L, 0-2",
 "Final Sep 6 Western Carolina at West Georgia | W, 1-0",
 "Final Sep 11 Western Carolina at Miami (OH) | L, 0-3",
 "Final Sep 17 Western Carolina at UNCG | W, 1-0",
 "Final Sep 20 Western Carolina vs Samford | L, 1-2",
 "Final Sep 25 Western Carolina at Wofford | T, 1-1",
 "Final Oct 1 Western Carolina vs ETSU | L, 1-3",
 "Final Oct 4 Western Carolina at Chattanooga | L, 0-5",
 "Final Oct 11 Western Carolina vs The Citadel | L, 1-4",
 "Final Oct 15 Western Carolina at VMI | W, 2-0",
 "Final Oct 23 Western Carolina vs Mercer | T, 2-2",
 "Upcoming Oct 29, 6:00 PM Western Carolina vs Tennessee Tech | ",
 "Upcoming Nov 1, 2:00 PM Western Carolina at Furman | ",
 "Upcoming Nov 6 Western Carolina at SoCon Tournament (Play In) | ",
 "Upcoming Nov 8 Western Carolina at SoCon Tournament (Quarterfinals) | ",
 "Upcoming Nov 13 Western Carolina at SoCon Tournament (Semifinals) | ",
 "Upcoming Nov 15 Western Carolina at SoCon Tournament (Championship) | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Western Carolina at CSU Invitational | Completed",
 "Final Oct 1 Western Carolina at Mercer Gridiron Classic | Completed",
 "Final Oct 15 Western Carolina at ITA Carolina Regionals | Completed",
 "Upcoming Oct 30 Western Carolina at Wofford Invite | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Western Carolina vs Butler | L, 2-3",
 "Final Aug 29 Western Carolina vs Charleston Southern | L, 2-3",
 "Final Aug 30 Western Carolina at Clemson | L, 1-3",
 "Final Sep 4 Western Carolina vs Bellarmine | W, 3-2",
 "Final Sep 5 Western Carolina vs Jacksonville State | W, 3-1",
 "Final Sep 6 Western Carolina vs Seton Hall | L, 2-3",
 "Final Sep 8 Western Carolina vs Gardner-Webb | W, 3-1",
 "Final Sep 11 Western Carolina vs North Florida | L, 0-3",
 "Final Sep 12 Western Carolina vs William & Mary | W, 3-1",
 "Final Sep 13 Western Carolina at Appalachian State | L, 1-3",
 "Final Sep 15 Western Carolina at UNC Asheville | L, 2-3",
 "Final Sep 17 Western Carolina vs USC Upstate | L, 1-3",
 "Final Sep 18 Western Carolina at USC Upstate | L, 0-3",
 "Final Sep 25 Western Carolina at UNCG | L, 0-3",
 "Final Sep 26 Western Carolina at UNCG | L, 1-3",
 "Final Oct 1 Western Carolina vs Samford | W, 3-1",
 "Final Oct 2 Western Carolina vs Samford | L, 2-3",
 "Final Oct 6 Western Carolina at Wofford | L, 0-3",
 "Final Oct 9 Western Carolina vs Furman | L, 0-3",
 "Final Oct 10 Western Carolina vs Furman | W, 3-1",
 "Final Oct 16 Western Carolina at Chattanooga | L, 1-3",
 "Final Oct 17 Western Carolina at Chattanooga | W, 3-0",
 "Final Oct 22 Western Carolina vs Mercer | W, 3-0",
 "Final Oct 23 Western Carolina vs Mercer | W, 3-2",
 "Upcoming Oct 27, 6:00 PM Western Carolina vs Wofford | ",
 "Upcoming Oct 30, 6:00 PM Western Carolina at The Citadel | ",
 "Upcoming Oct 31, 2:00 PM Western Carolina at The Citadel | ",
 "Upcoming Nov 6, 7:00 PM Western Carolina at Tennessee Tech | ",
 "Upcoming Nov 7, 8:00 PM Western Carolina at Tennessee Tech | ",
 "Upcoming Nov 13, 6:00 PM Western Carolina vs ETSU | ",
 "Upcoming Nov 14, 2:00 PM Western Carolina vs ETSU | ",
 "Upcoming Nov 19 Western Carolina at Southern Conference 1st Round | ",
 "Upcoming Nov 20 Western Carolina at Southern Conference Quarterfinals | ",
 "Upcoming Nov 21 Western Carolina at Southern Conference Semifinals | ",
 "Upcoming Nov 22 Western Carolina at Southern Conference Finals | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Western Carolina module checks passed");
