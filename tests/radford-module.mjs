import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {radfordSchool} from '../src/schools/radford.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='radford');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,radfordHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/radford-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit radfordathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['radford'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',radfordSchool.scheduleUrls],['roster',radfordSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('radford|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'radfordathletics.com',`${key} must stay on radfordathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://radfordathletics.com/sports/baseball/schedule"],"roster":["https://radfordathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://radfordathletics.com/sports/mens-basketball/schedule","https://radfordathletics.com/sports/womens-basketball/schedule"],"roster":["https://radfordathletics.com/sports/mens-basketball/roster","https://radfordathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://radfordathletics.com/sports/cross-country/schedule"],"roster":["https://radfordathletics.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://radfordathletics.com/sports/field-hockey/schedule"],"roster":["https://radfordathletics.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://radfordathletics.com/sports/womens-golf/schedule","https://radfordathletics.com/sports/mens-golf/schedule"],"roster":["https://radfordathletics.com/sports/womens-golf/roster","https://radfordathletics.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://radfordathletics.com/sports/womens-lacrosse/schedule"],"roster":["https://radfordathletics.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://radfordathletics.com/sports/womens-soccer/schedule","https://radfordathletics.com/sports/mens-soccer/schedule"],"roster":["https://radfordathletics.com/sports/womens-soccer/roster","https://radfordathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://radfordathletics.com/sports/softball/schedule"],"roster":["https://radfordathletics.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://radfordathletics.com/sports/womens-track-and-field/schedule","https://radfordathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://radfordathletics.com/sports/womens-track-and-field/roster","https://radfordathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://radfordathletics.com/sports/womens-volleyball/schedule"],"roster":["https://radfordathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'radford|"+sport+"':"),`${sport} routes must live in the Radford module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://radfordathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.radfordHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=radford)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Men's · Radford vs Ferrum (Exhibition) | ",
 "Upcoming Nov 2, 10:00 PM Men's · Radford at San Francisco | ",
 "Upcoming Nov 4, 9:00 PM Men's · Radford at California | ",
 "Upcoming Nov 9, 7:00 PM Men's · Radford at Tennessee | ",
 "Upcoming Nov 14, 2:30 PM Men's · Radford vs Shenandoah | ",
 "Upcoming Nov 18, 7:00 PM Men's · Radford vs Furman | ",
 "Upcoming Nov 21, 7:00 PM Men's · Radford at Chattanooga | ",
 "Upcoming Nov 27, 4:00 PM Men's · Radford at American | ",
 "Upcoming Nov 28, 1:00 PM Men's · Radford vs Hampton | ",
 "Upcoming Nov 29, 1:00 PM Men's · Radford vs UMass Lowell | ",
 "Upcoming Dec 3, 7:00 PM Men's · Radford vs Virginia-Lynchburg | ",
 "Upcoming Dec 5, 4:00 PM Men's · Radford at East Carolina | ",
 "Upcoming Dec 13, 1:00 PM Men's · Radford at Virginia Tech | ",
 "Upcoming Dec 15, 7:00 PM Men's · Radford vs Bluefield | ",
 "Upcoming Dec 19, 2:00 PM Men's · Radford at UNC Wilmington | ",
 "Upcoming Dec 22, 7:00 PM Men's · Radford vs Elon | ",
 "Upcoming Dec 29, 6:30 PM Men's · Radford at Maryland | ",
 "Upcoming Jan 1, 4:00 PM Men's · Radford vs Presbyterian | ",
 "Upcoming Jan 3, 4:00 PM Men's · Radford vs Charleston Southern | ",
 "Upcoming Jan 6, 6:30 PM Men's · Radford at USC Upstate | ",
 "Upcoming Jan 9, 2:30 PM Men's · Radford vs High Point | ",
 "Upcoming Jan 13 Men's · Radford at Winthrop | ",
 "Upcoming Jan 16, 3:00 PM Men's · Radford at Longwood | ",
 "Upcoming Jan 20, 7:00 PM Men's · Radford vs UNC Asheville | ",
 "Upcoming Jan 28, 7:00 PM Men's · Radford at Gardner-Webb | ",
 "Upcoming Jan 30, 7:00 PM Men's · Radford vs Winthrop | ",
 "Upcoming Feb 3, 6:30 PM Men's · Radford at UNC Asheville | ",
 "Upcoming Feb 6, 4:30 PM Men's · Radford vs USC Upstate | ",
 "Upcoming Feb 11, 7:00 PM Men's · Radford at Presbyterian | ",
 "Upcoming Feb 13, 2:00 PM Men's · Radford at Charleston Southern | ",
 "Upcoming Feb 18, 7:00 PM Men's · Radford vs Gardner-Webb | ",
 "Upcoming Feb 20, 7:00 PM Men's · Radford vs Longwood | ",
 "Upcoming Feb 27, 7:00 PM Men's · Radford at High Point | ",
 "Upcoming Mar 3 Men's · Radford at Big South Men's Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · Radford vs Southern Virginia (Exhibition) | ",
 "Upcoming Nov 2, 12:00 PM Women's · Radford at RV/RV Clemson | ",
 "Upcoming Nov 4, 7:00 PM Women's · Radford vs Bluefield | ",
 "Upcoming Nov 7, 3:00 PM Women's · Radford at Eastern Kentucky | ",
 "Upcoming Nov 11, 6:00 PM Women's · Radford at Campbell | ",
 "Upcoming Nov 16, 11:00 AM Women's · Radford vs Ferrum | ",
 "Upcoming Nov 19, 7:00 PM Women's · Radford at RV/RV Tennessee | ",
 "Upcoming Nov 23, 6:30 PM Women's · Radford at Furman | ",
 "Upcoming Nov 29, 2:00 PM Women's · Radford vs Norfolk State | ",
 "Upcoming Dec 2, 7:00 PM Women's · Radford vs ETSU | ",
 "Upcoming Dec 5, 1:00 PM Women's · Radford at Ohio | ",
 "Upcoming Dec 13, 1:00 PM Women's · Radford at Davidson | ",
 "Upcoming Dec 16, 5:00 PM Women's · Radford at Chattanooga | ",
 "Upcoming Dec 19, 2:00 PM Women's · Radford vs Concord | ",
 "Upcoming Dec 21, 12:00 PM Women's · Radford at RV/-- Virginia Tech | ",
 "Upcoming Dec 30, 7:00 PM Women's · Radford vs Gardner-Webb | ",
 "Upcoming Jan 2, 2:00 PM Women's · Radford at Presbyterian | ",
 "Upcoming Jan 6, 7:00 PM Women's · Radford vs Winthrop | ",
 "Upcoming Jan 9, 2:00 PM Women's · Radford at High Point | ",
 "Upcoming Jan 13, 7:00 PM Women's · Radford at Longwood | ",
 "Upcoming Jan 16, 2:00 PM Women's · Radford vs Charleston Southern | ",
 "Upcoming Jan 20, 6:30 PM Women's · Radford at UNC Asheville | ",
 "Upcoming Jan 23, 2:00 PM Women's · Radford vs USC Upstate | ",
 "Upcoming Jan 30 Women's · Radford at Gardner-Webb | ",
 "Upcoming Feb 3, 6:00 PM Women's · Radford at Winthrop | ",
 "Upcoming Feb 6, 2:00 PM Women's · Radford vs Presbyterian | ",
 "Upcoming Feb 10, 7:00 PM Women's · Radford vs High Point | ",
 "Upcoming Feb 13, 4:00 PM Women's · Radford at USC Upstate | ",
 "Upcoming Feb 20, 2:00 PM Women's · Radford at Charleston Southern | ",
 "Upcoming Feb 24, 7:00 PM Women's · Radford vs Longwood | ",
 "Upcoming Feb 27, 2:00 PM Women's · Radford vs UNC Asheville | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 18 Radford at Hokie Invitational | Completed",
 "Final Oct 3 Radford at Fast Times Invite | Completed",
 "Final Oct 17 Radford at Upstate Invite | Women's team: 10th / Men's team: 7th",
 "Upcoming Oct 30 Radford at Big South Championships | ",
 "Upcoming Nov 13, 10:00 AM Radford at NCAA Southeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Radford at Golfweek Program Challenge | 16th",
 "Final Sep 14 Women's · Radford at ECU Invitational | 13th",
 "Final Sep 28 Women's · Radford at Tot Hill Farm Intercollegiate | 7th",
 "Final Oct 19 Women's · Radford at Edisto Island Intercollegiate | 8th",
 "Upcoming Oct 26 Women's · Radford at UVA Invitational at Keswick | ",
 "Upcoming Feb 8 Women's · Radford at The Citadel | ",
 "Upcoming Mar 22 Women's · Radford at Kingsmill Invitational | ",
 "Upcoming Mar 29 Women's · Radford at Caledonia Invitational | ",
 "Upcoming Apr 5 Women's · Radford at Hokie Highlander Invitational | ",
 "Upcoming Apr 18 Women's · Radford at Big South Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Radford at Golfweek Program Challenge | 12th",
 "Final Sep 12 Men's · Radford at Bryan National Collegiate | 2nd",
 "Final Sep 21 Men's · Radford at Davidson Invitational | 6th",
 "Final Oct 5 Men's · Radford at Testudo Cup | 7th",
 "Final Oct 12 Men's · Radford at Phoenix Invitational | 9th",
 "Upcoming Feb 15 Men's · Radford at Wexford Intercollegiate | ",
 "Upcoming Mar 8 Men's · Radford at Surf Club Intercollegiate | ",
 "Upcoming Mar 14 Men's · Radford at Cutter Creek Invitational | ",
 "Upcoming Mar 29 Men's · Radford at Golfweek Invitational | ",
 "Upcoming Apr 25 Men's · Radford at Big South Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Radford vs Concord | W, 3-0",
 "Final Aug 16 Women's · Radford vs Charlotte | L, 0-2",
 "Final Aug 20 Women's · Radford at Tennessee Tech | L, 0-1",
 "Final Aug 27 Women's · Radford vs Emory & Henry | W, 7-2",
 "Final Aug 30 Women's · Radford at UNC Greensboro | L, 0-3",
 "Final Sep 3 Women's · Radford vs Navy | L, 0-5",
 "Final Sep 6 Women's · Radford vs Richmond | L, 1-2",
 "Final Sep 13 Women's · Radford vs ETSU | T, 1-1",
 "Final Sep 19 Women's · Radford at USC Upstate | L, 0-2",
 "Final Sep 26 Women's · Radford vs Winthrop | W, 2-1",
 "Final Sep 30 Women's · Radford vs UNC Asheville | L, 0-7",
 "Final Oct 3 Women's · Radford at High Point | L, 0-3",
 "Final Oct 10 Women's · Radford vs Gardner-Webb | W, 2-0",
 "Final Oct 14 Women's · Radford at Longwood | W, 2-0",
 "Final Oct 17 Women's · Radford at Charleston Southern | W, 2-0",
 "Upcoming Oct 31, 7:00 PM Women's · Radford vs Presbyterian | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 23 Men's · Radford at William & Mary | L, 1-4",
 "Final Aug 29 Men's · Radford vs James Madison | W, 2-1",
 "Final Sep 2 Men's · Radford at Old Dominion | L, 1-7",
 "Final Sep 5 Men's · Radford vs Bob Jones | W, 3-0",
 "Final Sep 12 Men's · Radford at Howard | L, 0-1",
 "Final Sep 15 Men's · Radford at Elon | L, 0-3",
 "Final Sep 19 Men's · Radford vs Winthrop | L, 1-3",
 "Final Sep 23 Men's · Radford vs VMI | W, 3-1",
 "Final Sep 26 Men's · Radford at Gardner-Webb | L, 1-5",
 "Final Sep 30 Men's · Radford vs ETSU | T, 0-0",
 "Final Oct 3 Men's · Radford at USC Upstate | L, 1-2",
 "Final Oct 9 Men's · Radford vs Presbyterian | T, 2-2",
 "Final Oct 14 Men's · Radford at Campbell | T, 1-1",
 "Final Oct 18 Men's · Radford vs UNC Asheville | W, 4-2",
 "Upcoming Oct 24, 7:00 PM Men's · Radford at High Point | ",
 "Upcoming Oct 30, 7:00 PM Men's · Radford at Longwood | ",
 "Upcoming Nov 5 Men's · Radford at Big South Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 1:00 PM Radford at Liberty | ",
 "Upcoming Oct 30, 5:00 PM Radford vs Virginia Tech | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Radford vs Hampton | W, 3-2",
 "Final Aug 29 Radford vs Bethune-Cookman | L, 2-3",
 "Final Aug 30 Radford at East Carolina | L, 1-3",
 "Final Sep 4 Radford vs Prairie View A&M | W, 3-1",
 "Final Sep 4 Radford vs Eastern Kentucky | L, 2-3",
 "Final Sep 5 Radford at Georgia Southern | L, 0-3",
 "Final Sep 8 Radford vs Liberty | L, 0-3",
 "Final Sep 11 Radford at Kansas City | L, 1-3",
 "Final Sep 11 Radford vs Drake | L, 0-3",
 "Final Sep 12 Radford vs Utah Valley | L, 2-3",
 "Final Sep 15 Radford at North Carolina Central | W, 3-2",
 "Final Sep 18 Radford vs Chattanooga | W, 3-0",
 "Final Sep 18 Radford vs Norfolk State | W, 3-0",
 "Final Sep 19 Radford vs Bellarmine | W, 3-2",
 "Final Sep 25 Radford at High Point | L, 0-3",
 "Final Oct 2 Radford at UNC Asheville | W, 3-1",
 "Final Oct 3 Radford at USC Upstate | W, 3-1",
 "Final Oct 9 Radford vs Winthrop | L, 1-3",
 "Final Oct 10 Radford vs Gardner-Webb | W, 3-2",
 "Final Oct 16 Radford at Presbyterian | W, 3-0",
 "Final Oct 17 Radford at Charleston Southern | L, 1-3",
 "Today Oct 23, 6:00 PM Radford vs USC Upstate | ",
 "Upcoming Oct 24, 4:00 PM Radford vs UNC Asheville | ",
 "Upcoming Oct 30, 6:00 PM Radford vs Charleston Southern | ",
 "Upcoming Oct 31, 4:00 PM Radford vs Presbyterian | ",
 "Upcoming Nov 6, 6:00 PM Radford at Gardner-Webb | ",
 "Upcoming Nov 7, 2:00 PM Radford at Winthrop | ",
 "Upcoming Nov 13, 6:00 PM Radford vs High Point | ",
 "Upcoming Nov 20 Radford at Big South Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Radford module checks passed");
