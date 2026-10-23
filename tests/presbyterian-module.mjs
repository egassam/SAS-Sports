import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {presbyterianSchool} from '../src/schools/presbyterian.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='presbyterian');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,presbyterianHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/presbyterian-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobluehose.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['presbyterian'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',presbyterianSchool.scheduleUrls],['roster',presbyterianSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('presbyterian|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobluehose.com',`${key} must stay on gobluehose.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://gobluehose.com/sports/acrobatics-tumbling/schedule"],"roster":["https://gobluehose.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://gobluehose.com/sports/baseball/schedule"],"roster":["https://gobluehose.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobluehose.com/sports/mens-basketball/schedule","https://gobluehose.com/sports/womens-basketball/schedule"],"roster":["https://gobluehose.com/sports/mens-basketball/roster","https://gobluehose.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobluehose.com/sports/womens-cross-country/schedule","https://gobluehose.com/sports/mens-cross-country/schedule"],"roster":["https://gobluehose.com/sports/womens-cross-country/roster","https://gobluehose.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gobluehose.com/sports/football/schedule"],"roster":["https://gobluehose.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gobluehose.com/sports/womens-golf/schedule","https://gobluehose.com/sports/mens-golf/schedule"],"roster":["https://gobluehose.com/sports/womens-golf/roster","https://gobluehose.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gobluehose.com/sports/womens-lacrosse/schedule"],"roster":["https://gobluehose.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gobluehose.com/sports/womens-soccer/schedule","https://gobluehose.com/sports/mens-soccer/schedule"],"roster":["https://gobluehose.com/sports/womens-soccer/roster","https://gobluehose.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gobluehose.com/sports/softball/schedule"],"roster":["https://gobluehose.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gobluehose.com/sports/womens-tennis/schedule","https://gobluehose.com/sports/mens-tennis/schedule"],"roster":["https://gobluehose.com/sports/womens-tennis/roster","https://gobluehose.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://gobluehose.com/sports/womens-volleyball/schedule"],"roster":["https://gobluehose.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gobluehose.com/sports/wrestling/schedule","https://gobluehose.com/sports/womens-wrestling/schedule"],"roster":["https://gobluehose.com/sports/wrestling/roster","https://gobluehose.com/sports/womens-wrestling/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'presbyterian|"+sport+"':"),`${sport} routes must live in the Presbyterian module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gobluehose.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.presbyterianHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=presbyterian)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 22, 7:00 PM Men's · Presbyterian vs Blue Madness | ",
 "Upcoming Oct 28, 7:00 PM Men's · Presbyterian at Clemson (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Presbyterian vs St. Thomas | ",
 "Upcoming Nov 6, 7:00 PM Men's · Presbyterian at Georgia | ",
 "Upcoming Nov 10, 7:00 PM Men's · Presbyterian at NC State | ",
 "Upcoming Nov 18, 7:00 PM Men's · Presbyterian vs Mercer | ",
 "Upcoming Nov 21, 7:30 PM Men's · Presbyterian at Tennessee Tech | ",
 "Upcoming Nov 24, 7:00 PM Men's · Presbyterian vs Carolina Christian | ",
 "Upcoming Nov 28, 2:00 PM Men's · Presbyterian vs Sacramento State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Presbyterian at Butler | ",
 "Upcoming Dec 5, 2:00 PM Men's · Presbyterian at Morehead State | ",
 "Upcoming Dec 8, 7:00 PM Men's · Presbyterian at ETSU | ",
 "Upcoming Dec 12, 7:00 PM Men's · Presbyterian vs Samford | ",
 "Upcoming Dec 15, 12:00 PM Men's · Presbyterian vs Allen | ",
 "Upcoming Dec 19, 2:00 PM Men's · Presbyterian at Navy | ",
 "Upcoming Dec 22, 4:00 PM Men's · Presbyterian at Wake Forest | ",
 "Upcoming Dec 28, 7:00 PM Men's · Presbyterian vs CIU | ",
 "Upcoming Jan 1, 4:00 PM Men's · Presbyterian at Radford | ",
 "Upcoming Jan 3, 3:00 PM Men's · Presbyterian at Longwood | ",
 "Upcoming Jan 6, 7:00 PM Men's · Presbyterian vs High Point | ",
 "Upcoming Jan 9, 1:00 PM Men's · Presbyterian at Gardner-Webb | ",
 "Upcoming Jan 16, 2:00 PM Men's · Presbyterian vs Winthrop | ",
 "Upcoming Jan 20, 7:00 PM Men's · Presbyterian vs USC Upstate | ",
 "Upcoming Jan 23, 2:00 PM Men's · Presbyterian at UNC Asheville | ",
 "Upcoming Jan 28, 7:00 PM Men's · Presbyterian at Charleston Southern | ",
 "Upcoming Jan 30, 2:00 PM Men's · Presbyterian vs Gardner-Webb | ",
 "Upcoming Feb 3, 6:30 PM Men's · Presbyterian at USC Upstate | ",
 "Upcoming Feb 6, 2:00 PM Men's · Presbyterian vs Longwood | ",
 "Upcoming Feb 11, 7:00 PM Men's · Presbyterian vs Radford | ",
 "Upcoming Feb 18, 7:00 PM Men's · Presbyterian vs UNC Asheville | ",
 "Upcoming Feb 20, 2:00 PM Men's · Presbyterian at High Point | ",
 "Upcoming Feb 25, 6:30 PM Men's · Presbyterian at Winthrop | ",
 "Upcoming Feb 27, 2:00 PM Men's · Presbyterian vs Charleston Southern | ",
 "Upcoming Mar 3 Men's · Presbyterian at Big South Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 22, 7:00 PM Women's · Presbyterian vs Blue Madness | ",
 "Upcoming Nov 2, 7:00 PM Women's · Presbyterian at UNC Greensboro | ",
 "Upcoming Nov 5, 6:00 PM Women's · Presbyterian at Wake Forest | ",
 "Upcoming Nov 10, 12:00 PM Women's · Presbyterian at Marquette | ",
 "Upcoming Nov 16, 11:00 AM Women's · Presbyterian vs UNC Wilmington | ",
 "Upcoming Nov 19, 6:00 PM Women's · Presbyterian vs Erskine | ",
 "Upcoming Nov 21, 2:00 PM Women's · Presbyterian at Wofford | ",
 "Upcoming Nov 25, 1:00 PM Women's · Presbyterian vs Furman | ",
 "Upcoming Nov 28, 4:30 PM Women's · Presbyterian vs Columbia International | ",
 "Upcoming Dec 2, 12:00 PM Women's · Presbyterian at Eastern Kentucky | ",
 "Upcoming Dec 5, 2:00 PM Women's · Presbyterian vs Western Carolina | ",
 "Upcoming Dec 9, 6:00 PM Women's · Presbyterian vs Southern Wesleyan | ",
 "Upcoming Dec 16, 6:00 PM Women's · Presbyterian vs Elon | ",
 "Upcoming Dec 20, 1:00 PM Women's · Presbyterian at Jacksonville State | ",
 "Upcoming Dec 30, 2:00 PM Women's · Presbyterian at Longwood | ",
 "Upcoming Jan 2, 2:00 PM Women's · Presbyterian vs Radford | ",
 "Upcoming Jan 9, 2:00 PM Women's · Presbyterian vs UNC Asheville | ",
 "Upcoming Jan 13, 6:00 PM Women's · Presbyterian vs Winthrop | ",
 "Upcoming Jan 16, 4:00 PM Women's · Presbyterian at USC Upstate | ",
 "Upcoming Jan 20, 6:00 PM Women's · Presbyterian at Charleston Southern | ",
 "Upcoming Jan 23, 2:00 PM Women's · Presbyterian vs Gardner-Webb | ",
 "Upcoming Jan 27, 6:00 PM Women's · Presbyterian vs High Point | ",
 "Upcoming Feb 3, 6:00 PM Women's · Presbyterian vs USC Upstate | ",
 "Upcoming Feb 6, 2:00 PM Women's · Presbyterian at Radford | ",
 "Upcoming Feb 10 Women's · Presbyterian at Gardner-Webb | ",
 "Upcoming Feb 13, 2:00 PM Women's · Presbyterian vs Longwood | ",
 "Upcoming Feb 17, 7:00 PM Women's · Presbyterian at High Point | ",
 "Upcoming Feb 20, 2:00 PM Women's · Presbyterian at UNC Asheville | ",
 "Upcoming Feb 24, 6:00 PM Women's · Presbyterian vs Charleston Southern | ",
 "Upcoming Feb 27, 2:00 PM Women's · Presbyterian at Winthrop | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Presbyterian at Bruins XC Night Classic | 8th",
 "Final Sep 18 Women's · Presbyterian at Southern Showcase | 7th",
 "Final Oct 9 Women's · Presbyterian at Royals Cross Country Challenge | 24th",
 "Final Oct 17 Women's · Presbyterian at USC Upstate Invite | 25th",
 "Upcoming Oct 30 Women's · Presbyterian at Big South Conference Championship | ",
 "Upcoming Nov 13 Women's · Presbyterian at NCAA Southeast Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Presbyterian at Bruins XC Night Classic | 3rd",
 "Final Sep 18 Men's · Presbyterian at Southern Showcase | 7th",
 "Final Sep 25 Men's · Presbyterian at Tryon Western NC XC Showcase | 11th",
 "Final Oct 9 Men's · Presbyterian at Royals Cross Country Challenge | 20th",
 "Final Oct 17 Men's · Presbyterian at USC Upstate Invite | 22nd",
 "Upcoming Oct 30 Men's · Presbyterian at Big South Conference Championship | ",
 "Upcoming Nov 13 Men's · Presbyterian at NCAA Southeast Regional Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Presbyterian vs UVA Wise | W, 47-37",
 "Final Sep 5 Presbyterian at Mercer | L, 3-62",
 "Final Sep 19 Presbyterian at Western Carolina | L, 14-58",
 "Final Sep 26 Presbyterian at Marist | L, 7-42",
 "Final Oct 3 Presbyterian vs St. Thomas | W, 55-21",
 "Final Oct 10 Presbyterian vs Davidson | W, 38-21",
 "Final Oct 17 Presbyterian at Stetson | W, 47-43",
 "Upcoming Oct 24, 1:00 PM Presbyterian at Valparaiso | ",
 "Upcoming Oct 31, 1:00 PM Presbyterian vs Butler | ",
 "Upcoming Nov 14, 12:00 PM Presbyterian at Morehead State | ",
 "Upcoming Nov 21, 1:00 PM Presbyterian vs Dayton | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Presbyterian at Golfweek Intercollegiate - Caledonia Golf & Fish Club | 21st",
 "Final Sep 14 Women's · Presbyterian at Elon Invitational - Alamance CC | Completed",
 "Final Oct 12 Women's · Presbyterian at Terrier Intercollegiate - The CC of Spartanburg | 10th",
 "Final Oct 19 Women's · Presbyterian at Edisto Island Invitational - The Plantation Course | 12th",
 "Today Oct 23 Women's · Presbyterian at Fripp Island Intercollegiate - Ocean Creek Golf Course | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Presbyterian at Golfweek Fall Challenge | 13th",
 "Final Sep 21 Men's · Presbyterian at River Run Collegiate | Completed",
 "Final Sep 28 Men's · Presbyterian at Ironwood Collegiate | 13th",
 "Final Oct 12 Men's · Presbyterian at Elon Phoenix Invitational | 4th",
 "Final Oct 18 Men's · Presbyterian at Furman Intercollegiate | 10th",
 "Today Oct 23 Men's · Presbyterian at Fripp Island Intercollegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Presbyterian at Alabama State | W, 3-1",
 "Final Aug 21 Women's · Presbyterian vs Newberry | W, 2-0",
 "Final Aug 27 Women's · Presbyterian at North Dakota | L, 1-2",
 "Final Aug 30 Women's · Presbyterian at North Dakota State | T, 0-0",
 "Final Sep 3 Women's · Presbyterian at Furman | L, 0-1",
 "Final Sep 10 Women's · Presbyterian vs Kennesaw State | L, 1-2",
 "Final Sep 19 Women's · Presbyterian at UNC Asheville | L, 1-3",
 "Final Sep 23 Women's · Presbyterian vs Gardner-Webb | L, 1-2",
 "Final Sep 30 Women's · Presbyterian at USC Upstate | L, 1-4",
 "Final Oct 6 Women's · Presbyterian vs South Carolina State | W, 4-2",
 "Final Oct 9 Women's · Presbyterian vs Charleston Southern | L, 0-2",
 "Final Oct 14 Women's · Presbyterian at Winthrop | L, 0-4",
 "Final Oct 17 Women's · Presbyterian vs Longwood | W, 1-0",
 "Final Oct 21 Women's · Presbyterian vs High Point | L, 0-4",
 "Upcoming Oct 31, 7:00 PM Women's · Presbyterian at Radford | ",
 "Upcoming Nov 5 Women's · Presbyterian at Big South Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Presbyterian vs Ferrum | L, 0-1",
 "Final Aug 24 Men's · Presbyterian at VMI | L, 1-3",
 "Final Aug 28 Men's · Presbyterian at UMBC | L, 1-5",
 "Final Aug 31 Men's · Presbyterian at Navy | L, 0-3",
 "Final Sep 5 Men's · Presbyterian vs Georgia State | L, 0-3",
 "Final Sep 15 Men's · Presbyterian at Stetson | L, 1-4",
 "Final Sep 19 Men's · Presbyterian vs USC Upstate | L, 1-3",
 "Final Sep 22 Men's · Presbyterian at ETSU | L, 2-6",
 "Final Sep 27 Men's · Presbyterian vs UNC Asheville | L, 0-5",
 "Final Oct 2 Men's · Presbyterian at Winthrop | L, 0-4",
 "Final Oct 9 Men's · Presbyterian at Radford | T, 2-2",
 "Final Oct 13 Men's · Presbyterian at Queens | L, 1-2",
 "Final Oct 17 Men's · Presbyterian vs High Point | L, 0-8",
 "Today Oct 23, 7:00 PM Men's · Presbyterian vs Longwood | ",
 "Upcoming Oct 27, 7:00 PM Men's · Presbyterian vs Davidson | ",
 "Upcoming Oct 31, 2:00 PM Men's · Presbyterian at Gardner-Webb | ",
 "Upcoming Nov 4 Men's · Presbyterian at Big South Conference Tournament Quarterfinals | ",
 "Upcoming Nov 8 Men's · Presbyterian at Big South Conference Tournament Semifinals | ",
 "Upcoming Nov 14 Men's · Presbyterian at Big South Conference Tournament Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Presbyterian at Emily McNall Classic | Completed",
 "Final Oct 8 Women's · Presbyterian at Lander Invite | Completed",
 "Final Oct 15 Women's · Presbyterian at ITA Carolina Regionals | Completed",
 "Today Oct 23 Women's · Presbyterian at Big South Individual Championships | ",
 "Upcoming Oct 30 Women's · Presbyterian at Wofford Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Presbyterian at Seahawk Fall Invitational | Completed",
 "Final Sep 25 Men's · Presbyterian at UNF Hidden Duals | Completed",
 "Final Oct 8 Men's · Presbyterian at ITA Regionals | Completed",
 "Today Oct 23 Men's · Presbyterian at Big South Individual Championships | ",
 "Upcoming Nov 5 Men's · Presbyterian at ITA Conference Masters | ",
 "Upcoming Nov 6 Men's · Presbyterian at Charleston Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Presbyterian vs Grambling State | W, 3-1",
 "Final Aug 29 Presbyterian vs Northwestern State | W, 3-0",
 "Final Aug 29 Presbyterian at West Georgia | W, 3-1",
 "Final Sep 1 Presbyterian at Wofford | L, 1-3",
 "Final Sep 3 Presbyterian at Furman | L, 1-3",
 "Final Sep 4 Presbyterian vs North Carolina A&T | W, 3-1",
 "Final Sep 5 Presbyterian vs Queens | W, 3-1",
 "Final Sep 8 Presbyterian vs Charleston | L, 0-3",
 "Final Sep 11 Presbyterian vs Buffalo | W, 3-1",
 "Final Sep 11 Presbyterian vs Chattanooga | L, 1-3",
 "Final Sep 12 Presbyterian at Queens | L, 0-3",
 "Final Sep 18 Presbyterian at Eastern Kentucky | L, 0-3",
 "Final Sep 18 Presbyterian vs Appalachian State | L, 0-3",
 "Final Sep 19 Presbyterian vs Tennessee Tech | L, 2-3",
 "Final Sep 25 Presbyterian vs Charleston Southern | W, 3-1",
 "Final Oct 2 Presbyterian at Gardner-Webb | L, 0-3",
 "Final Oct 3 Presbyterian at Winthrop | L, 1-3",
 "Final Oct 9 Presbyterian at UNC Asheville | L, 1-3",
 "Final Oct 10 Presbyterian at USC Upstate | W, 3-1",
 "Final Oct 16 Presbyterian vs Radford | L, 0-3",
 "Final Oct 17 Presbyterian vs High Point | L, 1-3",
 "Today Oct 23, 6:00 PM Presbyterian vs Winthrop | ",
 "Upcoming Oct 24, 2:00 PM Presbyterian vs Gardner-Webb | ",
 "Upcoming Oct 30, 6:00 PM Presbyterian at High Point | ",
 "Upcoming Oct 31, 4:00 PM Presbyterian at Radford | ",
 "Upcoming Nov 6, 6:00 PM Presbyterian vs USC Upstate | ",
 "Upcoming Nov 7, 2:00 PM Presbyterian vs UNC Asheville | ",
 "Upcoming Nov 13, 6:00 PM Presbyterian at Charleston Southern | ",
 "Upcoming Nov 20 Presbyterian at Big South Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[]);
  const v_womenswrestling=parse("Wrestling","womens-wrestling");
  assert.deepEqual(v_womenswrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Women's · Presbyterian at Princeton Open | ",
 "Upcoming Nov 7 Women's · Presbyterian at Trojan Open | ",
 "Upcoming Nov 7, 1:00 PM Women's · Presbyterian at Grand Valley State | ",
 "Upcoming Nov 7, 2:00 PM Women's · Presbyterian at Iowa | ",
 "Upcoming Nov 8, 10:00 AM Women's · Presbyterian at Delaware State | ",
 "Upcoming Nov 15, 10:00 AM Women's · Presbyterian vs Blue Hose Challenge | ",
 "Upcoming Dec 6, 3:00 PM Women's · Presbyterian at King | ",
 "Upcoming Dec 15, 6:00 PM Women's · Presbyterian vs Newberry | ",
 "Upcoming Dec 20, 1:00 PM Women's · Presbyterian at Desert Duals | ",
 "Upcoming Jan 2, 10:00 AM Women's · Presbyterian at South Carolina Women's Wrestling Showcase | ",
 "Upcoming Jan 8 Women's · Presbyterian at NWCA National Duals | ",
 "Upcoming Jan 9 Women's · Presbyterian at Red Lady Duals | ",
 "Upcoming Jan 10, 10:00 AM Women's · Presbyterian at Red Lady Open | ",
 "Upcoming Jan 17 Women's · Presbyterian at Life | ",
 "Upcoming Jan 17 Women's · Presbyterian vs Cumberlands | ",
 "Upcoming Jan 24, 9:00 AM Women's · Presbyterian at Georgia Open | ",
 "Upcoming Jan 29 Women's · Presbyterian at Warrior Open | ",
 "Upcoming Jan 29, 6:00 PM Women's · Presbyterian vs Montreat | ",
 "Upcoming Feb 7, 9:00 AM Women's · Presbyterian at Bobcat Open | ",
 "Upcoming Feb 19 Women's · Presbyterian at NCAA Region III Championships | ",
 "Upcoming Mar 5 Women's · Presbyterian at NCAA National Championships | "
]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
  ownRecapsOnly(v_womenswrestling,"Wrestling womens-wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Presbyterian module checks passed");
