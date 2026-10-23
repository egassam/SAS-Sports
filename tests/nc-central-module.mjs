import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ncCentralSchool} from '../src/schools/nc-central.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='nc-central');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ncCentralHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/nc-central-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit nccueaglepride.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['nc-central'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',ncCentralSchool.scheduleUrls],['roster',ncCentralSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('nc-central|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'nccueaglepride.com',`${key} must stay on nccueaglepride.com`);
  }
}
const parity={"Basketball":{"schedule":["https://nccueaglepride.com/sports/mens-basketball/schedule","https://nccueaglepride.com/sports/womens-basketball/schedule"],"roster":["https://nccueaglepride.com/sports/mens-basketball/roster","https://nccueaglepride.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://nccueaglepride.com/sports/cross-country/schedule"],"roster":["https://nccueaglepride.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://nccueaglepride.com/sports/football/schedule"],"roster":["https://nccueaglepride.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://nccueaglepride.com/sports/womens-golf/schedule","https://nccueaglepride.com/sports/mens-golf/schedule"],"roster":["https://nccueaglepride.com/sports/womens-golf/roster","https://nccueaglepride.com/sports/mens-golf/roster"],"combined":true},"Softball":{"schedule":["https://nccueaglepride.com/sports/softball/schedule"],"roster":["https://nccueaglepride.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://nccueaglepride.com/sports/womens-tennis/schedule","https://nccueaglepride.com/sports/mens-tennis/schedule"],"roster":["https://nccueaglepride.com/sports/womens-tennis/roster","https://nccueaglepride.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://nccueaglepride.com/sports/track-and-field/schedule"],"roster":["https://nccueaglepride.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://nccueaglepride.com/sports/womens-volleyball/schedule"],"roster":["https://nccueaglepride.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'nc-central|"+sport+"':"),`${sport} routes must live in the North Carolina Central module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://nccueaglepride.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ncCentralHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=nc-central)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · NC Central at Georgia | ",
 "Upcoming Nov 7, 3:00 PM Men's · NC Central at Longwood | ",
 "Upcoming Nov 11, 6:00 PM Men's · NC Central at VMI | ",
 "Upcoming Nov 13, 7:30 PM Men's · NC Central at Liberty | ",
 "Upcoming Nov 16, 7:00 PM Men's · NC Central vs Virginia-Lynchburg | ",
 "Upcoming Nov 18, 7:00 PM Men's · NC Central at George Mason | ",
 "Upcoming Nov 23, 7:30 PM Men's · NC Central vs Carolina U | ",
 "Upcoming Nov 28, 1:00 PM Men's · NC Central at Gardner-Webb | ",
 "Upcoming Dec 1, 7:30 PM Men's · NC Central vs Toccoa Falls | ",
 "Upcoming Dec 5, 2:00 PM Men's · NC Central vs USC Upstate | ",
 "Upcoming Dec 7, 7:00 PM Men's · NC Central at VCU | ",
 "Upcoming Dec 11, 7:30 PM Men's · NC Central at Drake | ",
 "Upcoming Dec 13, 6:00 PM Men's · NC Central at Iowa State | ",
 "Upcoming Dec 15, 7:00 PM Men's · NC Central at High Point | ",
 "Upcoming Dec 22, 4:00 PM Men's · NC Central at South Carolina | ",
 "Upcoming Dec 28, 2:00 PM Men's · NC Central vs Truett McConnell | ",
 "Upcoming Jan 2, 4:30 PM Men's · NC Central at Norfolk State | ",
 "Upcoming Jan 9, 5:00 PM Men's · NC Central vs Coppin State | ",
 "Upcoming Jan 11, 7:00 PM Men's · NC Central vs Morgan State | ",
 "Upcoming Jan 16 Men's · NC Central at Howard | ",
 "Upcoming Jan 23 Men's · NC Central at Delaware State | ",
 "Upcoming Jan 25, 6:00 PM Men's · NC Central at Maryland Eastern Shore | ",
 "Upcoming Jan 30, 5:00 PM Men's · NC Central vs South Carolina State | ",
 "Upcoming Feb 6, 5:00 PM Men's · NC Central vs Norfolk State | ",
 "Upcoming Feb 13, 5:00 PM Men's · NC Central at Coppin State | ",
 "Upcoming Feb 15, 7:00 PM Men's · NC Central at Morgan State | ",
 "Upcoming Feb 20 Men's · NC Central vs Howard | ",
 "Upcoming Feb 27, 5:00 PM Men's · NC Central vs Delaware State | ",
 "Upcoming Mar 1, 7:00 PM Men's · NC Central vs Maryland Eastern Shore | ",
 "Upcoming Mar 4 Men's · NC Central at South Carolina State | ",
 "Upcoming Mar 10 Men's · NC Central at MEAC Basketball Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · NC Central at Virginia Tech | ",
 "Upcoming Nov 4, 6:00 PM Women's · NC Central vs Johnson C. Smith | ",
 "Upcoming Nov 7, 12:00 PM Women's · NC Central at UNC Wilmington | ",
 "Upcoming Nov 9, 6:00 PM Women's · NC Central vs Fayetteville State | ",
 "Upcoming Nov 11, 7:00 PM Women's · NC Central at North Carolina | ",
 "Upcoming Nov 14, 3:00 PM Women's · NC Central at George Mason | ",
 "Upcoming Nov 16, 6:00 PM Women's · NC Central at Virginia Commonwealth | ",
 "Upcoming Nov 19, 7:00 PM Women's · NC Central at UNC Greensboro | ",
 "Upcoming Nov 23, 5:00 PM Women's · NC Central vs Elon | ",
 "Upcoming Nov 28, 12:00 PM Women's · NC Central vs Alabama A&M | ",
 "Upcoming Nov 29, 12:00 PM Women's · NC Central vs South Carolina/Tennessee State | ",
 "Upcoming Dec 1, 5:00 PM Women's · NC Central vs CarolinaU | ",
 "Upcoming Dec 5, 2:00 PM Women's · NC Central at High Point | ",
 "Upcoming Dec 8, 7:00 PM Women's · NC Central at Tennessee | ",
 "Upcoming Dec 16, 6:00 PM Women's · NC Central vs North Carolina A&T State | ",
 "Upcoming Dec 18, 1:30 PM Women's · NC Central vs Hampton | ",
 "Upcoming Dec 19, 11:00 AM Women's · NC Central at Florida International | ",
 "Upcoming Dec 22, 1:00 PM Women's · NC Central vs Queens (N.C.) | ",
 "Upcoming Jan 2, 2:00 PM Women's · NC Central at Norfolk State | ",
 "Upcoming Jan 7, 6:30 PM Women's · NC Central vs Morgan State | ",
 "Upcoming Jan 9, 2:00 PM Women's · NC Central vs Coppin State | ",
 "Upcoming Jan 16, 2:00 PM Women's · NC Central at Howard | ",
 "Upcoming Jan 21, 6:30 PM Women's · NC Central at Maryland Eastern Shore | ",
 "Upcoming Jan 23, 2:00 PM Women's · NC Central at Delaware State | ",
 "Upcoming Jan 30, 2:00 PM Women's · NC Central vs South Carolina State | ",
 "Upcoming Feb 6, 2:00 PM Women's · NC Central vs Norfolk State | ",
 "Upcoming Feb 11, 6:30 PM Women's · NC Central at Morgan State | ",
 "Upcoming Feb 13, 2:00 PM Women's · NC Central at Coppin State | ",
 "Upcoming Feb 20, 2:00 PM Women's · NC Central vs Howard | ",
 "Upcoming Feb 25, 6:00 PM Women's · NC Central vs Maryland Eastern Shore | ",
 "Upcoming Feb 27, 2:00 PM Women's · NC Central vs Delaware State | ",
 "Upcoming Mar 4, 6:30 PM Women's · NC Central at South Carolina State | ",
 "Upcoming Mar 10 Women's · NC Central at MEAC Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 NC Central at Elon Opener | Completed",
 "Final Sep 11 NC Central at Queen City Invite | Aaron Alukunyang Races To Second Straight Victory",
 "Final Sep 18 NC Central at adidas Cross Country Challenge | Completed",
 "Final Oct 9 NC Central at Lancer Pink Invitational | Completed",
 "Final Oct 17 NC Central at Upstate Invite | Completed",
 "Upcoming Oct 30 NC Central at MEAC Championships | ",
 "Upcoming Nov 14, 9:00 AM NC Central at NCAA Southeast Regional | ",
 "Upcoming Nov 21 NC Central at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 NC Central at Texas Southern | L, 30-42",
 "Final Sep 5 NC Central vs Elizabeth City State | W, 27-6",
 "Final Sep 12 NC Central vs North Carolina A&T | W, 30-22",
 "Final Sep 19 NC Central at Gardner-Webb | L, 20-44",
 "Final Sep 26 NC Central at East Carolina | L, 9-42",
 "Final Oct 3 NC Central vs Campbell | L, 31-38",
 "Final Oct 10 NC Central vs William & Mary | L, 14-17",
 "Today Oct 23, 5:00 PM NC Central at Delaware State | ",
 "Upcoming Oct 31, 2:00 PM NC Central vs Howard | ",
 "Upcoming Nov 7, 12:00 PM NC Central at Norfolk State | ",
 "Upcoming Nov 14, 1:30 PM NC Central at South Carolina State | ",
 "Upcoming Nov 21, 2:00 PM NC Central vs Morgan State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · NC Central at Elon Invitational | Completed",
 "Final Sep 21 Women's · NC Central at Thomas W. Dortch Jr. HBCU Golf Classic | Completed",
 "Final Oct 17 Women's · NC Central at SAS Championship HBCU Invitational | Completed",
 "Today Oct 23 Women's · NC Central at Fripp Island Intercollegiate | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · NC Central at Thomas W. Dortch Jr. HBCU Golf Classic | Completed",
 "Final Sep 28 Men's · NC Central at Ironwood Collegiate Classic | Completed",
 "Final Oct 12 Men's · NC Central at Bubba Barnett Intercollegiate | Completed",
 "Final Oct 17 Men's · NC Central at SAS Championship HBCU Invitational | Completed",
 "Today Oct 23 Men's · NC Central at Fripp Island Intercollegiate | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · NC Central at Tribe Invitational | Completed",
 "Final Sep 19 Women's · NC Central at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · NC Central at MEAC Invitational | Completed",
 "Today Oct 23 Women's · NC Central at CNU Invitational | ",
 "Upcoming Oct 30 Women's · NC Central at Elon Fall Invitational | ",
 "Upcoming Nov 5 Women's · NC Central at ITA Conference Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · NC Central at Spartan Fall Invitational | Completed",
 "Final Sep 17 Men's · NC Central at HBCU National Tennis Championships | Completed",
 "Final Oct 2 Men's · NC Central at MEAC Invitational | Completed",
 "Final Oct 16 Men's · NC Central at UNCG Fall Invitational | Completed"
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 NC Central vs Florida A&M | W, 3-1",
 "Final Aug 28 NC Central vs Arkansas-Pine Bluff | W, 3-0",
 "Final Aug 29 NC Central at Alabama A&M | L, 2-3",
 "Final Sep 1 NC Central vs Gardner-Webb | L, 1-3",
 "Final Sep 8 NC Central vs UNC Asheville | L, 0-3",
 "Final Sep 10 NC Central at North Carolina A&T | L, 0-3",
 "Final Sep 11 NC Central vs USC Upstate | L, 0-3",
 "Final Sep 12 NC Central at UNC Greensboro | L, 1-3",
 "Final Sep 15 NC Central vs Radford | L, 2-3",
 "Final Sep 19 NC Central vs UNC Wilmington | L, 1-3",
 "Final Sep 19 NC Central at Winthrop | L, 0-3",
 "Final Sep 25 NC Central at Delaware State | L, 0-3",
 "Final Sep 27 NC Central at Maryland Eastern Shore | W, 3-2",
 "Final Oct 2 NC Central vs Morgan State | W, 3-2",
 "Final Oct 4 NC Central vs Coppin State | L, 1-3",
 "Final Oct 8 NC Central at Norfolk State | L, 2-3",
 "Final Oct 9 NC Central at Howard | L, 1-3",
 "Final Oct 16 NC Central vs South Carolina State | W, 3-0",
 "Final Oct 20 NC Central at Gardner-Webb | L, 1-3",
 "Today Oct 23, 6:00 PM NC Central vs Delaware State | ",
 "Upcoming Oct 25, 1:00 PM NC Central vs Maryland Eastern Shore | ",
 "Upcoming Oct 30, 6:00 PM NC Central at Morgan State | ",
 "Upcoming Nov 1, 1:00 PM NC Central at Coppin State | ",
 "Upcoming Nov 6, 6:00 PM NC Central vs Howard | ",
 "Upcoming Nov 8, 1:00 PM NC Central vs Norfolk State | ",
 "Upcoming Nov 12, 6:00 PM NC Central vs Elon | ",
 "Upcoming Nov 13, 6:00 PM NC Central at South Carolina State | ",
 "Upcoming Nov 19 NC Central at MEAC Championship | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Carolina Central module checks passed");
