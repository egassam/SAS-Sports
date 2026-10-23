import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uscUpstateSchool} from '../src/schools/usc-upstate.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='usc-upstate');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uscUpstateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/usc-upstate-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit upstatespartans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['usc-upstate'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',uscUpstateSchool.scheduleUrls],['roster',uscUpstateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('usc-upstate|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'upstatespartans.com',`${key} must stay on upstatespartans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://upstatespartans.com/sports/baseball/schedule"],"roster":["https://upstatespartans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://upstatespartans.com/sports/mens-basketball/schedule","https://upstatespartans.com/sports/womens-basketball/schedule"],"roster":["https://upstatespartans.com/sports/mens-basketball/roster","https://upstatespartans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://upstatespartans.com/sports/cross-country/schedule"],"roster":["https://upstatespartans.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://upstatespartans.com/sports/womens-golf/schedule","https://upstatespartans.com/sports/mens-golf/schedule"],"roster":["https://upstatespartans.com/sports/womens-golf/roster","https://upstatespartans.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://upstatespartans.com/sports/womens-soccer/schedule","https://upstatespartans.com/sports/mens-soccer/schedule"],"roster":["https://upstatespartans.com/sports/womens-soccer/roster","https://upstatespartans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://upstatespartans.com/sports/softball/schedule"],"roster":["https://upstatespartans.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://upstatespartans.com/sports/track-and-field/schedule"],"roster":["https://upstatespartans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://upstatespartans.com/sports/womens-volleyball/schedule"],"roster":["https://upstatespartans.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'usc-upstate|"+sport+"':"),`${sport} routes must live in the USC Upstate module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://upstatespartans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uscUpstateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=usc-upstate)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19 USC Upstate at Florida State | ",
 "Upcoming Feb 20 USC Upstate at Florida State | ",
 "Upcoming Feb 21 USC Upstate at Florida State | ",
 "Upcoming Feb 23 USC Upstate vs South Carolina | ",
 "Upcoming Feb 24 USC Upstate vs Cincinatti | ",
 "Upcoming Feb 26 USC Upstate vs Maine | ",
 "Upcoming Feb 27 USC Upstate vs Maine | ",
 "Upcoming Feb 28 USC Upstate vs Maine | ",
 "Upcoming Mar 2 USC Upstate at North Carolina | ",
 "Upcoming Mar 5 USC Upstate at Austin Peay | ",
 "Upcoming Mar 6 USC Upstate at Austin Peay | ",
 "Upcoming Mar 7 USC Upstate at Austin Peay | ",
 "Upcoming Mar 9 USC Upstate vs West Virginia | ",
 "Upcoming Mar 10 USC Upstate vs West Virginia | ",
 "Upcoming Mar 12 USC Upstate at ETSU | ",
 "Upcoming Mar 13 USC Upstate at ETSU | ",
 "Upcoming Mar 14 USC Upstate at ETSU | ",
 "Upcoming Mar 16 USC Upstate at Stetson | ",
 "Upcoming Mar 19 USC Upstate vs Presbyterian | ",
 "Upcoming Mar 20 USC Upstate vs Presbyterian | ",
 "Upcoming Mar 21 USC Upstate vs Presbyterian | ",
 "Upcoming Mar 23 USC Upstate vs Wofford | ",
 "Upcoming Mar 25 USC Upstate at UNC Asheville | ",
 "Upcoming Mar 26 USC Upstate at UNC Asheville | ",
 "Upcoming Mar 27 USC Upstate at UNC Asheville | ",
 "Upcoming Mar 30 USC Upstate vs College of Charleston | ",
 "Upcoming Apr 2 USC Upstate vs Longwood | ",
 "Upcoming Apr 3 USC Upstate vs Longwood | ",
 "Upcoming Apr 4 USC Upstate vs Longwood | ",
 "Upcoming Apr 6 USC Upstate at Charlotte | ",
 "Upcoming Apr 9 USC Upstate at William & Mary | ",
 "Upcoming Apr 10 USC Upstate at William & Mary | ",
 "Upcoming Apr 11 USC Upstate at William & Mary | ",
 "Upcoming Apr 13 USC Upstate at Georgia | ",
 "Upcoming Apr 16 USC Upstate at High Point | ",
 "Upcoming Apr 17 USC Upstate at High Point | ",
 "Upcoming Apr 18 USC Upstate at High Point | ",
 "Upcoming Apr 20 USC Upstate at Clemson | ",
 "Upcoming Apr 23 USC Upstate at Gardner-Webb | ",
 "Upcoming Apr 24 USC Upstate at Gardner-Webb | ",
 "Upcoming Apr 25 USC Upstate at Gardner-Webb | ",
 "Upcoming Apr 27 USC Upstate vs Western Carolina | ",
 "Upcoming Apr 30 USC Upstate vs UNCW | ",
 "Upcoming May 1 USC Upstate vs UNCW | ",
 "Upcoming May 2 USC Upstate vs UNCW | ",
 "Upcoming May 4 USC Upstate at Western Carolina | ",
 "Upcoming May 7 USC Upstate vs Winthrop | ",
 "Upcoming May 8 USC Upstate vs Winthrop | ",
 "Upcoming May 9 USC Upstate vs Winthrop | ",
 "Upcoming May 11 USC Upstate vs Wofford | ",
 "Upcoming May 14 USC Upstate vs Radford | ",
 "Upcoming May 15 USC Upstate vs Radford | ",
 "Upcoming May 16 USC Upstate vs Radford | ",
 "Upcoming May 21 USC Upstate at Charleston Southern | ",
 "Upcoming May 22 USC Upstate at Charleston Southern | ",
 "Upcoming May 23 USC Upstate at Charleston Southern | ",
 "Upcoming May 26 USC Upstate at Big South Baseball Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · USC Upstate at East Carolina | ",
 "Upcoming Nov 6, 6:30 PM Men's · USC Upstate vs SC State | ",
 "Upcoming Nov 9 Men's · USC Upstate at Coastal Carolina | ",
 "Upcoming Nov 11, 6:30 PM Men's · USC Upstate vs Bob Jones | ",
 "Upcoming Nov 14 Men's · USC Upstate at Campbell | ",
 "Upcoming Nov 18, 6:30 PM Men's · USC Upstate vs Samford | ",
 "Upcoming Nov 21, 11:00 AM Men's · USC Upstate at UNC Greensboro | ",
 "Upcoming Nov 25 Men's · USC Upstate at Citadel | ",
 "Upcoming Nov 29, 2:00 PM Men's · USC Upstate vs West Georgia | ",
 "Upcoming Dec 2, 7:00 PM Men's · USC Upstate vs Georgia Southern | ",
 "Upcoming Dec 5, 2:00 PM Men's · USC Upstate at NC Central | ",
 "Upcoming Dec 12 Men's · USC Upstate at Davidson | ",
 "Upcoming Dec 16, 7:00 PM Men's · USC Upstate at Butler | ",
 "Upcoming Dec 18, 5:00 PM Men's · USC Upstate vs Paine College | ",
 "Upcoming Dec 21, 1:00 PM Men's · USC Upstate at Miami | ",
 "Upcoming Dec 28, 2:00 PM Men's · USC Upstate vs Virginia University of Lynchburg | ",
 "Upcoming Jan 1, 2:00 PM Men's · USC Upstate vs UNC Asheville | ",
 "Upcoming Jan 3, 2:00 PM Men's · USC Upstate at High Point | ",
 "Upcoming Jan 6, 6:30 PM Men's · USC Upstate vs Radford | ",
 "Upcoming Jan 9, 2:00 PM Men's · USC Upstate vs Winthrop | ",
 "Upcoming Jan 13, 7:00 PM Men's · USC Upstate at Charleston Southern | ",
 "Upcoming Jan 20, 7:00 PM Men's · USC Upstate at Presbyterian | ",
 "Upcoming Jan 23, 2:00 PM Men's · USC Upstate vs Gardner-Webb | ",
 "Upcoming Jan 28, 7:00 PM Men's · USC Upstate at Longwood | ",
 "Upcoming Jan 30, 2:00 PM Men's · USC Upstate vs High Point | ",
 "Upcoming Feb 3, 6:30 PM Men's · USC Upstate vs Presbyterian | ",
 "Upcoming Feb 6, 4:30 PM Men's · USC Upstate at Radford | ",
 "Upcoming Feb 13, 2:00 PM Men's · USC Upstate at Winthrop | ",
 "Upcoming Feb 18, 6:30 PM Men's · USC Upstate vs Charleston Southern | ",
 "Upcoming Feb 20, 4:30 PM Men's · USC Upstate at UNC Asheville | ",
 "Upcoming Feb 25, 7:00 PM Men's · USC Upstate at Gardner-Webb | ",
 "Upcoming Feb 27, 2:00 PM Men's · USC Upstate vs Longwood | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · USC Upstate at Wake Forest | ",
 "Upcoming Nov 4, 6:30 PM Women's · USC Upstate vs Johnson | ",
 "Upcoming Nov 7, 4:00 PM Women's · USC Upstate vs Southern Wesleyan | ",
 "Upcoming Nov 10 Women's · USC Upstate at SC State | ",
 "Upcoming Nov 14 Women's · USC Upstate at UNC Greensboro | ",
 "Upcoming Nov 18, 7:00 PM Women's · USC Upstate at Clemson | ",
 "Upcoming Nov 21, 2:00 PM Women's · USC Upstate at Tennessee Tech | ",
 "Upcoming Nov 25, 4:00 PM Women's · USC Upstate vs Tennessee State | ",
 "Upcoming Nov 28 Women's · USC Upstate vs Georgia Southern-East Georgia Campus | ",
 "Upcoming Dec 2, 4:00 PM Women's · USC Upstate vs Queens University of Charlotte | ",
 "Upcoming Dec 5, 2:00 PM Women's · USC Upstate vs Samford | ",
 "Upcoming Dec 12, 6:00 PM Women's · USC Upstate vs Western Carolina | ",
 "Upcoming Dec 16, 11:00 AM Women's · USC Upstate vs Kennesaw State | ",
 "Upcoming Dec 19, 12:00 PM Women's · USC Upstate at Campbell | ",
 "Upcoming Dec 30, 6:30 PM Women's · USC Upstate vs UNC Asheville | ",
 "Upcoming Jan 2, 4:00 PM Women's · USC Upstate vs Winthrop | ",
 "Upcoming Jan 6, 7:00 PM Women's · USC Upstate at High Point | ",
 "Upcoming Jan 13, 6:30 PM Women's · USC Upstate vs Charleston Southern | ",
 "Upcoming Jan 16, 4:00 PM Women's · USC Upstate vs Presbyterian | ",
 "Upcoming Jan 20 Women's · USC Upstate at Gardner-Webb | ",
 "Upcoming Jan 23, 2:00 PM Women's · USC Upstate at Radford | ",
 "Upcoming Jan 27, 6:30 PM Women's · USC Upstate vs Longwood | ",
 "Upcoming Jan 30, 2:00 PM Women's · USC Upstate at Winthrop | ",
 "Upcoming Feb 3 Women's · USC Upstate at Presbyterian | ",
 "Upcoming Feb 6, 4:00 PM Women's · USC Upstate vs High Point | ",
 "Upcoming Feb 13, 4:00 PM Women's · USC Upstate vs Radford | ",
 "Upcoming Feb 17, 7:00 PM Women's · USC Upstate at Longwood | ",
 "Upcoming Feb 20, 4:00 PM Women's · USC Upstate vs Gardner-Webb | ",
 "Upcoming Feb 24, 6:30 PM Women's · USC Upstate at UNC Asheville | ",
 "Upcoming Feb 27, 2:00 PM Women's · USC Upstate at Charleston Southern | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 USC Upstate at Eye Opener | Completed",
 "Final Sep 18 USC Upstate at Brevard XC Classic | Completed",
 "Final Oct 3 USC Upstate at Live in Lou | Completed",
 "Final Oct 17 USC Upstate at Upstate Invite | Completed",
 "Upcoming Oct 30 USC Upstate at Big South Championships | ",
 "Upcoming Nov 13 USC Upstate at NCAA | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · USC Upstate at Golfweek Fall Challenge | 20th of 23",
 "Final Sep 14 Women's · USC Upstate at Elon Invitational | 13th of 15",
 "Final Oct 12 Women's · USC Upstate at Haskins Award Invitational | 13th of 13",
 "Today Oct 23 Women's · USC Upstate at Fripp Island Intercollegiate | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · USC Upstate at GolfWeek Fall Invite | 4th of 16",
 "Final Sep 20 Men's · USC Upstate at GMAC Invitational | 12th of 13",
 "Final Sep 27 Men's · USC Upstate at The Carolina Cup | Completed",
 "Today Oct 23 Men's · USC Upstate at Fripp Island Intercollegiate | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · USC Upstate at Charleston | T, 1-1",
 "Final Aug 20 Women's · USC Upstate vs Davidson | W, 3-2",
 "Final Aug 23 Women's · USC Upstate at Charlotte | L, 0-1",
 "Final Aug 30 Women's · USC Upstate vs Hampton | W, 4-0",
 "Final Sep 3 Women's · USC Upstate at Wofford | W, 3-1",
 "Final Sep 6 Women's · USC Upstate at Eastern Kentucky | L, 1-2",
 "Final Sep 10 Women's · USC Upstate at Furman | T, 2-2",
 "Final Sep 13 Women's · USC Upstate at Queens | W, 3-1",
 "Final Sep 16 Women's · USC Upstate vs USC Aiken | T, 0-0",
 "Final Sep 19 Women's · USC Upstate vs Radford | W, 2-0",
 "Final Sep 23 Women's · USC Upstate at Charleston Southern | W, 2-1",
 "Final Sep 26 Women's · USC Upstate at Longwood | W, 2-0",
 "Final Sep 30 Women's · USC Upstate vs Presbyterian | W, 4-1",
 "Final Oct 3 Women's · USC Upstate vs Winthrop | W, 5-1",
 "Final Oct 10 Women's · USC Upstate at High Point | W, 1-0",
 "Final Oct 17 Women's · USC Upstate vs UNC Asheville | T, 1-1",
 "Final Oct 21 Women's · USC Upstate vs South Carolina State | W, 6-0",
 "Upcoming Oct 28, 7:00 PM Women's · USC Upstate at Gardner-Webb | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · USC Upstate at Georgia State | L, 1-2",
 "Final Aug 24 Men's · USC Upstate at South Carolina | L, 0-4",
 "Final Aug 27 Men's · USC Upstate vs West Florida | W, 3-0",
 "Final Sep 1 Men's · USC Upstate at ETSU | W, 3-0",
 "Final Sep 5 Men's · USC Upstate at UAB | L, 3-4",
 "Final Sep 8 Men's · USC Upstate at Wake Forest | L, 0-3",
 "Final Sep 12 Men's · USC Upstate vs College of Charleston | L, 1-2",
 "Final Sep 15 Men's · USC Upstate at Wofford | L, 2-3",
 "Final Sep 19 Men's · USC Upstate at Presbyterian | W, 3-1",
 "Final Sep 26 Men's · USC Upstate at Longwood | L, 0-2",
 "Final Sep 29 Men's · USC Upstate at Elon | L, 1-3",
 "Final Oct 3 Men's · USC Upstate vs Radford | W, 2-1",
 "Final Oct 9 Men's · USC Upstate vs High Point | L, 1-2",
 "Final Oct 17 Men's · USC Upstate at Gardner-Webb | L, 4-5",
 "Final Oct 20 Men's · USC Upstate at Furman | L, 1-7",
 "Upcoming Oct 24, 2:00 PM Men's · USC Upstate at UNC Asheville | ",
 "Upcoming Oct 31, 2:00 PM Men's · USC Upstate vs Winthrop | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 USC Upstate at Old Dominion | W, 3-2",
 "Final Aug 28 USC Upstate at Norfolk State | W, 3-1",
 "Final Aug 29 USC Upstate vs St. John's | L, 1-3",
 "Final Sep 4 USC Upstate vs Alabama State | W, 3-0",
 "Final Sep 5 USC Upstate vs West Florida | L, 1-3",
 "Final Sep 9 USC Upstate at Queens | W, 3-2",
 "Final Sep 11 USC Upstate at North Carolina Central | W, 3-0",
 "Final Sep 12 USC Upstate at Elon | L, 1-3",
 "Final Sep 17 USC Upstate at Western Carolina | W, 3-1",
 "Final Sep 18 USC Upstate vs Western Carolina | W, 3-0",
 "Final Sep 20 USC Upstate at Clemson | L, 1-3",
 "Final Sep 25 USC Upstate vs UNC Asheville | L, 2-3",
 "Final Oct 2 USC Upstate vs High Point | L, 0-3",
 "Final Oct 3 USC Upstate vs Radford | L, 1-3",
 "Final Oct 9 USC Upstate vs Charleston Southern | W, 3-0",
 "Final Oct 10 USC Upstate vs Presbyterian | L, 1-3",
 "Final Oct 16 USC Upstate at Gardner-Webb | L, 0-3",
 "Final Oct 17 USC Upstate at Winthrop | L, 0-3",
 "Today Oct 23, 6:00 PM USC Upstate at Radford | ",
 "Upcoming Oct 24, 4:00 PM USC Upstate at High Point | ",
 "Upcoming Oct 30, 6:00 PM USC Upstate vs Winthrop | ",
 "Upcoming Oct 31, 5:30 PM USC Upstate vs Gardner-Webb | ",
 "Upcoming Nov 6, 6:00 PM USC Upstate at Presbyterian | ",
 "Upcoming Nov 7, 6:00 PM USC Upstate at Charleston Southern | ",
 "Upcoming Nov 13, 6:00 PM USC Upstate at UNC Asheville | "
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
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("USC Upstate module checks passed");
