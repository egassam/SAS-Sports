import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uncAshevilleSchool} from '../src/schools/unc-asheville.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='unc-asheville');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uncAshevilleHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/unc-asheville-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uncabulldogs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['unc-asheville'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',uncAshevilleSchool.scheduleUrls],['roster',uncAshevilleSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('unc-asheville|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uncabulldogs.com',`${key} must stay on uncabulldogs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uncabulldogs.com/sports/baseball/schedule"],"roster":["https://uncabulldogs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uncabulldogs.com/sports/mens-basketball/schedule","https://uncabulldogs.com/sports/womens-basketball/schedule"],"roster":["https://uncabulldogs.com/sports/mens-basketball/roster","https://uncabulldogs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://uncabulldogs.com/sports/cross-country/schedule"],"roster":["https://uncabulldogs.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://uncabulldogs.com/sports/womens-golf/schedule"],"roster":["https://uncabulldogs.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://uncabulldogs.com/sports/womens-soccer/schedule","https://uncabulldogs.com/sports/mens-soccer/schedule"],"roster":["https://uncabulldogs.com/sports/womens-soccer/roster","https://uncabulldogs.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://uncabulldogs.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://uncabulldogs.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://uncabulldogs.com/sports/womens-tennis/schedule","https://uncabulldogs.com/sports/mens-tennis/schedule"],"roster":["https://uncabulldogs.com/sports/womens-tennis/roster","https://uncabulldogs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uncabulldogs.com/sports/track-and-field/schedule"],"roster":["https://uncabulldogs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://uncabulldogs.com/sports/womens-volleyball/schedule"],"roster":["https://uncabulldogs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'unc-asheville|"+sport+"':"),`${sport} routes must live in the UNC Asheville module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://uncabulldogs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uncAshevilleHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=unc-asheville)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · UNC Asheville at Richmond | ",
 "Upcoming Nov 4, 7:00 PM Men's · UNC Asheville vs Erskine | ",
 "Upcoming Nov 7, 5:30 PM Men's · UNC Asheville vs Western Carolina | ",
 "Upcoming Nov 11, 7:00 PM Men's · UNC Asheville at West Georgia | ",
 "Upcoming Nov 14 Men's · UNC Asheville at Georgia Tech | ",
 "Upcoming Nov 18, 6:30 PM Men's · UNC Asheville vs Tennessee Tech | ",
 "Upcoming Nov 22, 5:00 PM Men's · UNC Asheville at Samford | ",
 "Upcoming Nov 24, 9:00 PM Men's · UNC Asheville at Florida State | ",
 "Upcoming Nov 28, 2:00 PM Men's · UNC Asheville vs Georgia Southern | ",
 "Upcoming Dec 2, 8:00 PM Men's · UNC Asheville at Lipscomb | ",
 "Upcoming Dec 6, 2:00 PM Men's · UNC Asheville vs Alice Lloyd College | ",
 "Upcoming Dec 10, 8:00 PM Men's · UNC Asheville at St. Thomas | ",
 "Upcoming Dec 16, 7:00 PM Men's · UNC Asheville at Queens (N.C.) | ",
 "Upcoming Dec 19, 4:30 PM Men's · UNC Asheville vs Morehead State | ",
 "Upcoming Dec 21 Men's · UNC Asheville at UAB | ",
 "Upcoming Dec 29, 2:00 PM Men's · UNC Asheville vs Spartanburg Methodist College | ",
 "Upcoming Jan 1, 2:00 PM Men's · UNC Asheville at USC Upstate | ",
 "Upcoming Jan 3, 2:00 PM Men's · UNC Asheville vs Winthrop | ",
 "Upcoming Jan 9, 2:00 PM Men's · UNC Asheville vs Charleston Southern | ",
 "Upcoming Jan 13, 6:30 PM Men's · UNC Asheville vs Longwood | ",
 "Upcoming Jan 16, 1:00 PM Men's · UNC Asheville at Gardner-Webb | ",
 "Upcoming Jan 20, 7:00 PM Men's · UNC Asheville at Radford | ",
 "Upcoming Jan 23, 2:00 PM Men's · UNC Asheville vs Presbyterian | ",
 "Upcoming Jan 28, 7:00 PM Men's · UNC Asheville at High Point | ",
 "Upcoming Feb 3, 6:30 PM Men's · UNC Asheville vs Radford | ",
 "Upcoming Feb 6, 2:00 PM Men's · UNC Asheville at Winthrop | ",
 "Upcoming Feb 11, 6:30 PM Men's · UNC Asheville vs High Point | ",
 "Upcoming Feb 13, 3:00 PM Men's · UNC Asheville at Longwood | ",
 "Upcoming Feb 18, 7:00 PM Men's · UNC Asheville at Presbyterian | ",
 "Upcoming Feb 20, 4:30 PM Men's · UNC Asheville vs USC Upstate | ",
 "Upcoming Feb 25, 7:00 PM Men's · UNC Asheville at Charleston Southern | ",
 "Upcoming Feb 27, 2:00 PM Men's · UNC Asheville vs Gardner-Webb | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 4:30 PM Women's · UNC Asheville vs Clinton College | ",
 "Upcoming Nov 6, 6:30 PM Women's · UNC Asheville vs Georgia State | ",
 "Upcoming Nov 9, 12:00 PM Women's · UNC Asheville at Samford | ",
 "Upcoming Nov 12, 6:30 PM Women's · UNC Asheville vs Western Carolina | ",
 "Upcoming Nov 20, 5:00 PM Women's · UNC Asheville at Clemson | ",
 "Upcoming Nov 24, 6:30 PM Women's · UNC Asheville vs East Tennessee State | ",
 "Upcoming Nov 27, 6:30 PM Women's · UNC Asheville at Appalachian State | ",
 "Upcoming Nov 28, 2:00 PM Women's · UNC Asheville vs Queens (N.C.) | ",
 "Upcoming Dec 2, 11:30 AM Women's · UNC Asheville vs Warren Wilson | ",
 "Upcoming Dec 5 Women's · UNC Asheville at South Carolina State | ",
 "Upcoming Dec 8, 6:30 PM Women's · UNC Asheville vs Furman | ",
 "Upcoming Dec 12, 2:00 PM Women's · UNC Asheville at East Carolina | ",
 "Upcoming Dec 16, 6:00 PM Women's · UNC Asheville at Wake Forest | ",
 "Upcoming Dec 19, 2:00 PM Women's · UNC Asheville vs Montreat College (N.C.) | ",
 "Upcoming Dec 30, 6:30 PM Women's · UNC Asheville at USC Upstate | ",
 "Upcoming Jan 2, 2:00 PM Women's · UNC Asheville at Gardner-Webb | ",
 "Upcoming Jan 6, 6:30 PM Women's · UNC Asheville vs Charleston Southern | ",
 "Upcoming Jan 9, 2:00 PM Women's · UNC Asheville at Presbyterian | ",
 "Upcoming Jan 12, 6:30 PM Women's · UNC Asheville vs UNC Greensboro | ",
 "Upcoming Jan 16, 2:00 PM Women's · UNC Asheville vs High Point | ",
 "Upcoming Jan 20, 6:30 PM Women's · UNC Asheville vs Radford | ",
 "Upcoming Jan 23, 2:00 PM Women's · UNC Asheville at Longwood | ",
 "Upcoming Jan 27, 6:30 PM Women's · UNC Asheville vs Winthrop | ",
 "Upcoming Jan 30, 7:00 PM Women's · UNC Asheville at High Point | ",
 "Upcoming Feb 3, 6:00 PM Women's · UNC Asheville at Charleston Southern | ",
 "Upcoming Feb 6, 2:00 PM Women's · UNC Asheville vs Gardner-Webb | ",
 "Upcoming Feb 10, 6:30 PM Women's · UNC Asheville vs Longwood | ",
 "Upcoming Feb 17, 6:00 PM Women's · UNC Asheville at Winthrop | ",
 "Upcoming Feb 20, 2:00 PM Women's · UNC Asheville vs Presbyterian | ",
 "Upcoming Feb 24, 6:30 PM Women's · UNC Asheville vs USC Upstate | ",
 "Upcoming Feb 27, 2:00 PM Women's · UNC Asheville at Radford | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UNC Asheville at Duel in the Valley | 1st (Women) / 2nd (Men)",
 "Final Sep 19 UNC Asheville at Southeast Regional Kickoff | 1st (Women) / 3rd (Men)",
 "Final Oct 2 UNC Asheville at Fire Tower Open | 5th (Men) / 6th (Women)",
 "Final Oct 16 UNC Asheville at UVA Panorama Farms | 8th (Women) / 11th (Men)",
 "Upcoming Oct 30, 9:00 AM UNC Asheville at Big South Conference Championship | ",
 "Upcoming Nov 13 UNC Asheville at NCAA Southeast Regional Championships | ",
 "Upcoming Nov 20 UNC Asheville at NCAA National Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 UNC Asheville at Tiger Classic | 8th",
 "Final Sep 6 UNC Asheville at Golfweek Women's Fall Challenge | 18th",
 "Final Sep 21 UNC Asheville at Golfweek Red Sky Classic | 20th",
 "Final Sep 28 UNC Asheville at Tot Hill Farm Invitational | 11th",
 "Final Oct 18 UNC Asheville at Diamante Intercollegiate | 16th",
 "Upcoming Oct 26 UNC Asheville at French Broad Collegiate Invitational | ",
 "Upcoming Mar 15 UNC Asheville at Low Country Intercollegiate | ",
 "Upcoming Mar 22 UNC Asheville at Henssler Financial Invitational | ",
 "Upcoming Mar 29 UNC Asheville at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 UNC Asheville at Hokie Highlander Invitational | ",
 "Upcoming Apr 18 UNC Asheville at 2027 Big South Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UNC Asheville vs Wofford | T, 2-2",
 "Final Aug 15 Women's · UNC Asheville vs North Alabama | T, 3-3",
 "Final Aug 19 Women's · UNC Asheville vs Southern Wesleyan | W, 6-0",
 "Final Aug 23 Women's · UNC Asheville vs East Tennessee State | L, 0-2",
 "Final Aug 30 Women's · UNC Asheville at Furman | L, 0-1",
 "Final Sep 3 Women's · UNC Asheville vs The Citadel | T, 1-1",
 "Final Sep 6 Women's · UNC Asheville at Clemson | L, 0-3",
 "Final Sep 10 Women's · UNC Asheville at Davidson | W, 1-0",
 "Final Sep 13 Women's · UNC Asheville vs VMI | W, 5-1",
 "Final Sep 19 Women's · UNC Asheville vs Presbyterian | W, 3-1",
 "Final Sep 26 Women's · UNC Asheville vs High Point | W, 1-0",
 "Final Sep 30 Women's · UNC Asheville at Radford | W, 7-0",
 "Final Oct 3 Women's · UNC Asheville at Gardner-Webb | W, 4-0",
 "Final Oct 9 Women's · UNC Asheville vs Longwood | L, 0-1",
 "Final Oct 17 Women's · UNC Asheville at USC Upstate | T, 1-1",
 "Upcoming Oct 28, 6:00 PM Women's · UNC Asheville vs Winthrop | ",
 "Upcoming Nov 1, 1:00 PM Women's · UNC Asheville at Charleston Southern | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UNC Asheville vs Northern Kentucky | W, 1-0",
 "Final Aug 24 Men's · UNC Asheville at Furman | T, 1-1",
 "Final Sep 1 Men's · UNC Asheville vs Warren Wilson | W, 15-0",
 "Final Sep 4 Men's · UNC Asheville at Memphis | L, 1-3",
 "Final Sep 8 Men's · UNC Asheville vs Wofford | W, 1-0",
 "Final Sep 12 Men's · UNC Asheville at VMI | W, 4-0",
 "Final Sep 16 Men's · UNC Asheville vs East Tennessee State | W, 2-1",
 "Final Sep 19 Men's · UNC Asheville vs Longwood | W, 3-0",
 "Final Sep 23 Men's · UNC Asheville at Georgia State | W, 3-0",
 "Final Sep 27 Men's · UNC Asheville at Presbyterian | W, 5-0",
 "Final Oct 2 Men's · UNC Asheville at Gardner-Webb | L, 0-3",
 "Final Oct 9 Men's · UNC Asheville vs Winthrop | W, 3-0",
 "Final Oct 13 Men's · UNC Asheville at Wake Forest | L, 1-3",
 "Final Oct 18 Men's · UNC Asheville at Radford | L, 2-4",
 "Upcoming Oct 24, 2:00 PM Men's · UNC Asheville vs USC Upstate | ",
 "Upcoming Oct 31, 7:00 PM Men's · UNC Asheville at High Point | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · UNC Asheville at East Carolina | L, 96-251",
 "Today Oct 23, 4:00 PM Women's · UNC Asheville vs Diving (Exhibition) | ",
 "Upcoming Oct 24, 11:00 AM Women's · UNC Asheville vs Campbell (Swimming) | ",
 "Upcoming Oct 30, 5:30 PM Women's · UNC Asheville at Davidson | ",
 "Upcoming Nov 20 Women's · UNC Asheville at TYR '85 Invite | ",
 "Upcoming Dec 10, 3:30 PM Women's · UNC Asheville at Georgia Southern | ",
 "Upcoming Dec 16 Women's · UNC Asheville at Florida Gulf Coast | ",
 "Upcoming Jan 8, 4:00 PM Women's · UNC Asheville vs Queens (N.C.) (Diving) | ",
 "Upcoming Jan 9, 11:00 AM Women's · UNC Asheville vs Gardner-Webb (Swimming) | ",
 "Upcoming Jan 15 Women's · UNC Asheville at Georgia Southern (Diving) | ",
 "Upcoming Jan 23, 11:00 AM Women's · UNC Asheville vs UNC Pembroke | ",
 "Upcoming Feb 17 Women's · UNC Asheville at Atlantic Sun Swimming & Diving Championships | ",
 "Upcoming Mar 8 Women's · UNC Asheville at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 17 Women's · UNC Asheville at NCAA Swimming Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · UNC Asheville at Sixth Annual Emily McNall Classic | Completed",
 "Final Oct 2 Women's · UNC Asheville at Appalachian State Invite | Completed",
 "Today Oct 23 Women's · UNC Asheville at Big South Conference Fall Championships | ",
 "Today Oct 23 Women's · UNC Asheville at Middle Tennessee State Tournament | ",
 "Upcoming Oct 30 Women's · UNC Asheville at Wofford Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · UNC Asheville at UNCG Invite | Completed",
 "Final Sep 25 Men's · UNC Asheville at Davidson Invitational | Completed",
 "Final Oct 8 Men's · UNC Asheville at ITA Carolina Regionals | Completed",
 "Today Oct 23 Men's · UNC Asheville at Big South Conference Fall Championships | ",
 "Upcoming Nov 6 Men's · UNC Asheville at Wofford Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UNC Asheville vs Montreat College (N.C.) | W, 3-0",
 "Final Aug 28 UNC Asheville vs Boise State | L, 0-3",
 "Final Aug 29 UNC Asheville vs Middle Tennessee State | W, 3-1",
 "Final Sep 1 UNC Asheville vs Elon | W, 3-2",
 "Final Sep 4 UNC Asheville vs Bellarmine | W, 3-0",
 "Final Sep 5 UNC Asheville vs Seton Hall | W, 3-0",
 "Final Sep 6 UNC Asheville vs Jacksonville State | W, 3-0",
 "Final Sep 8 UNC Asheville at North Carolina Central | W, 3-0",
 "Final Sep 11 UNC Asheville vs Harvard | L, 0-3",
 "Final Sep 11 UNC Asheville at UNC Wilmington | W, 3-2",
 "Final Sep 12 UNC Asheville vs Norfolk State | W, 3-0",
 "Final Sep 15 UNC Asheville vs Western Carolina | W, 3-2",
 "Final Sep 18 UNC Asheville vs Mercyhurst | W, 3-1",
 "Final Sep 18 UNC Asheville at Ohio | L, 0-3",
 "Final Sep 19 UNC Asheville vs Morgan State | W, 3-1",
 "Final Sep 22 UNC Asheville vs Queens (N.C.) | L, 1-3",
 "Final Sep 25 UNC Asheville at USC Upstate | W, 3-2",
 "Final Oct 2 UNC Asheville vs Radford | L, 1-3",
 "Final Oct 3 UNC Asheville vs High Point | L, 0-3",
 "Final Oct 9 UNC Asheville vs Presbyterian | W, 3-1",
 "Final Oct 10 UNC Asheville vs Charleston Southern | L, 2-3",
 "Final Oct 16 UNC Asheville at Winthrop | L, 2-3",
 "Final Oct 17 UNC Asheville at Gardner-Webb | L, 2-3",
 "Today Oct 23, 6:00 PM UNC Asheville at High Point | ",
 "Upcoming Oct 24, 4:00 PM UNC Asheville at Radford | ",
 "Upcoming Oct 30, 6:00 PM UNC Asheville vs Gardner-Webb | ",
 "Upcoming Oct 31, 4:00 PM UNC Asheville vs Winthrop | ",
 "Upcoming Nov 6, 6:00 PM UNC Asheville at Charleston Southern | ",
 "Upcoming Nov 7, 2:00 PM UNC Asheville at Presbyterian | ",
 "Upcoming Nov 13, 6:00 PM UNC Asheville vs USC Upstate | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UNC Asheville module checks passed");
