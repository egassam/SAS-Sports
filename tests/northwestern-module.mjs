import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {northwesternSchool,northwesternGolfPlace,northwesternGolfStoryPlace} from '../src/schools/northwestern.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='northwestern');
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
const worker=Function(...Object.keys(deps),source+';return {verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,northwesternHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/northwestern-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit nusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['northwestern'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',northwesternSchool.scheduleUrls],['roster',northwesternSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('northwestern|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'nusports.com',`${key} must stay on nusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://nusports.com/sports/baseball/schedule"],"roster":["https://nusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://nusports.com/sports/mens-basketball/schedule","https://nusports.com/sports/womens-basketball/schedule"],"roster":["https://nusports.com/sports/mens-basketball/roster","https://nusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://nusports.com/sports/womens-cross-country/schedule"],"roster":["https://nusports.com/sports/womens-cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://nusports.com/sports/womens-fencing/schedule"],"roster":["https://nusports.com/sports/womens-fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://nusports.com/sports/field-hockey/schedule"],"roster":["https://nusports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://nusports.com/sports/football/schedule"],"roster":["https://nusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://nusports.com/sports/womens-golf/schedule","https://nusports.com/sports/mens-golf/schedule"],"roster":["https://nusports.com/sports/womens-golf/roster","https://nusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://nusports.com/sports/womens-lacrosse/schedule"],"roster":["https://nusports.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://nusports.com/sports/womens-soccer/schedule","https://nusports.com/sports/mens-soccer/schedule"],"roster":["https://nusports.com/sports/womens-soccer/roster","https://nusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://nusports.com/sports/softball/schedule"],"roster":["https://nusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://nusports.com/sports/womens-swimming-and-diving/schedule","https://nusports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://nusports.com/sports/womens-swimming-and-diving/roster","https://nusports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://nusports.com/sports/womens-tennis/schedule","https://nusports.com/sports/mens-tennis/schedule"],"roster":["https://nusports.com/sports/womens-tennis/roster","https://nusports.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://nusports.com/sports/womens-volleyball/schedule"],"roster":["https://nusports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://nusports.com/sports/wrestling/schedule"],"roster":["https://nusports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'northwestern|"+sport+"':"),`${sport} routes must live in the Northwestern module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://nusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.northwesternHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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


// BEGIN generated (scripts/generate-module-tests.mjs --school=northwestern)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 4:00 PM Men's · Northwestern at Illinois State (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM Men's · Northwestern vs Iowa State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Northwestern vs Binghamton | ",
 "Upcoming Nov 6, 7:00 PM Men's · Northwestern vs Stony Brook | ",
 "Upcoming Nov 9, 7:00 PM Men's · Northwestern vs Boston University | ",
 "Upcoming Nov 13 Men's · Northwestern vs DePaul | ",
 "Upcoming Nov 16, 7:00 PM Men's · Northwestern vs Columbia | ",
 "Upcoming Nov 20, 2:00 PM Men's · Northwestern vs Virginia Tech | ",
 "Upcoming Nov 22, 12:00 PM Men's · Northwestern vs Dayton | ",
 "Upcoming Nov 27, 7:00 PM Men's · Northwestern vs Northeastern | ",
 "Upcoming Dec 1, 8:00 PM Men's · Northwestern vs Wisconsin | ",
 "Upcoming Dec 5 Men's · Northwestern vs BYU | ",
 "Upcoming Dec 12, 3:30 PM Men's · Northwestern at Michigan | ",
 "Upcoming Dec 16, 7:00 PM Men's · Northwestern vs Mercyhurst | ",
 "Upcoming Dec 20 Men's · Northwestern vs Oklahoma State | ",
 "Upcoming Dec 29, 7:00 PM Men's · Northwestern vs Chicago State | ",
 "Upcoming Jan 3, 6:30 PM Men's · Northwestern vs Minnesota | ",
 "Upcoming Jan 6, 5:30 PM Men's · Northwestern at Ohio State | ",
 "Upcoming Jan 10, 11:00 AM Men's · Northwestern at Penn State | ",
 "Upcoming Jan 13, 8:00 PM Men's · Northwestern vs Illinois | ",
 "Upcoming Jan 16, 12:00 PM Men's · Northwestern vs Rutgers | ",
 "Upcoming Jan 20, 9:30 PM Men's · Northwestern at Washington | ",
 "Upcoming Jan 23, 6:00 PM Men's · Northwestern at Oregon | ",
 "Upcoming Jan 27, 6:00 PM Men's · Northwestern vs Indiana | ",
 "Upcoming Jan 30, 1:00 PM Men's · Northwestern vs USC | ",
 "Upcoming Feb 6, 11:00 AM Men's · Northwestern at Purdue | ",
 "Upcoming Feb 9, 6:00 PM Men's · Northwestern at Indiana | ",
 "Upcoming Feb 13, 1:00 PM Men's · Northwestern vs Iowa | ",
 "Upcoming Feb 16, 8:00 PM Men's · Northwestern at Illinois | ",
 "Upcoming Feb 21, 1:00 PM Men's · Northwestern at Minnesota | ",
 "Upcoming Feb 24, 7:30 PM Men's · Northwestern vs UCLA | ",
 "Upcoming Feb 27, 2:00 PM Men's · Northwestern vs Nebraska | ",
 "Upcoming Mar 2, 7:30 PM Men's · Northwestern vs Michigan State | ",
 "Upcoming Mar 7, 12:00 PM Men's · Northwestern at Maryland | ",
 "Upcoming Mar 10 Men's · Northwestern vs Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30 Women's · Northwestern vs Lewis (Exhibition) | ",
 "Upcoming Nov 3 Women's · Northwestern vs Milwaukee | ",
 "Upcoming Nov 5 Women's · Northwestern vs Xavier | ",
 "Upcoming Nov 8 Women's · Northwestern at UIC | ",
 "Upcoming Nov 13, 4:30 PM Women's · Northwestern vs West Virginia | ",
 "Upcoming Nov 14, 5:00 PM Women's · Northwestern vs Appalachian State | ",
 "Upcoming Nov 18, 5:30 PM Women's · Northwestern at Abilene Christian | ",
 "Upcoming Nov 21 Women's · Northwestern vs Northern Illinois | ",
 "Upcoming Nov 23 Women's · Northwestern vs Oakland | ",
 "Upcoming Nov 27 Women's · Northwestern vs DePaul | ",
 "Upcoming Nov 30 Women's · Northwestern vs Illinois State | ",
 "Upcoming Dec 5, 1:00 PM Women's · Northwestern vs Indiana | ",
 "Upcoming Dec 13, 3:00 PM Women's · Northwestern at Kansas | ",
 "Upcoming Dec 16, 11:00 AM Women's · Northwestern at Loyola Chicago | ",
 "Upcoming Dec 18 Women's · Northwestern vs George Washington | ",
 "Upcoming Dec 21 Women's · Northwestern vs Eastern Illinois | ",
 "Upcoming Dec 30 Women's · Northwestern at UCLA | ",
 "Upcoming Jan 2 Women's · Northwestern at USC | ",
 "Upcoming Jan 7, 7:00 PM Women's · Northwestern vs Michigan State | ",
 "Upcoming Jan 10 Women's · Northwestern vs Washington | ",
 "Upcoming Jan 14, 7:00 PM Women's · Northwestern at Iowa | ",
 "Upcoming Jan 17 Women's · Northwestern at Wisconsin | ",
 "Upcoming Jan 20 Women's · Northwestern vs Nebraska | ",
 "Upcoming Jan 23 Women's · Northwestern vs Illinois | ",
 "Upcoming Jan 28, 5:30 PM Women's · Northwestern at Ohio State | ",
 "Upcoming Jan 31, 1:00 PM Women's · Northwestern at Rutgers | ",
 "Upcoming Feb 4, 7:00 PM Women's · Northwestern vs Penn State | ",
 "Upcoming Feb 7, 3:00 PM Women's · Northwestern at Illinois | ",
 "Upcoming Feb 12 Women's · Northwestern at Michigan | ",
 "Upcoming Feb 16 Women's · Northwestern vs Oregon | ",
 "Upcoming Feb 21, 12:00 PM Women's · Northwestern vs Maryland | ",
 "Upcoming Feb 25 Women's · Northwestern vs Minnesota | ",
 "Upcoming Feb 28 Women's · Northwestern at Purdue | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Northwestern at Badger Classic | Completed",
 "Final Sep 19 Northwestern at John McNichols Invitational | Completed",
 "Final Sep 25 Northwestern at Loyola Lakefront Invitational | Completed",
 "Today Oct 9, 10:30 AM Northwestern at Nuttycombe Invitational | ",
 "Upcoming Oct 30, 10:35 AM Northwestern at Big Ten Championships | ",
 "Upcoming Nov 13 Northwestern at NCAA Midwest Regional | ",
 "Upcoming Nov 21 Northwestern at NCAA Championships | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Final Sep 26 Northwestern at Remenyik ROC/RJCC | Completed",
 "Today Oct 9 Northwestern at October NAC | ",
 "Upcoming Nov 7 Northwestern at Western Invitational | ",
 "Upcoming Nov 20 Northwestern at November NAC | ",
 "Upcoming Jan 8 Northwestern at January NAC | ",
 "Upcoming Jan 17 Northwestern at Tufts Invitational | ",
 "Upcoming Jan 23 Northwestern at Penn State Invitational | ",
 "Upcoming Jan 30 Northwestern at Schiller Duals | ",
 "Upcoming Feb 12 Northwestern at February NAC | ",
 "Upcoming Feb 20 Northwestern at CCFC Championships | ",
 "Upcoming Mar 14 Northwestern at NCAA Midwest Regional | ",
 "Upcoming Mar 27 Northwestern at NCAA Championships | ",
 "Upcoming Apr 16 Northwestern at April NAC | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Northwestern vs VCU | W, 2-0",
 "Final Aug 30 Northwestern vs Lafayette | W, 1-0",
 "Final Sep 4 Northwestern vs Duke | W, 4-3",
 "Final Sep 6 Northwestern at Boston College | W, 2-0",
 "Final Sep 11 Northwestern vs Louisville | W, 3-1",
 "Final Sep 13 Northwestern vs Miami (OH) | W, 2-0",
 "Final Sep 17 Northwestern at Stanford | W, 3-1",
 "Final Sep 19 Northwestern vs Cal | W, 2-0",
 "Final Sep 20 Northwestern at UC Davis | W, 7-0",
 "Final Sep 25 Northwestern vs Michigan State | W, 6-0",
 "Final Oct 2 Northwestern at Ohio State | W, 5-0",
 "Final Oct 4 Northwestern at Michigan | W, 6-1",
 "Today Oct 9, 3:00 PM Northwestern vs Iowa | ",
 "Upcoming Oct 11, 11:00 AM Northwestern at Princeton | ",
 "Upcoming Oct 16, 2:00 PM Northwestern at Indiana | ",
 "Upcoming Oct 22, 7:00 PM Northwestern vs Maryland | ",
 "Upcoming Oct 25, 12:00 PM Northwestern vs Rutgers | ",
 "Upcoming Oct 30, 2:00 PM Northwestern at Penn State | ",
 "Upcoming Nov 4 Northwestern vs Big Ten Tournament | ",
 "Upcoming Nov 13 Northwestern vs NCAA Tournament | ",
 "Upcoming Nov 20 Northwestern vs NCAA Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Northwestern vs South Dakota State | W, 34-18",
 "Final Sep 19 Northwestern vs Colorado | W, 41-7",
 "Final Sep 25 Northwestern at Indiana | L, 23-29",
 "Final Oct 2 Northwestern vs Penn State | W, 34-13",
 "Upcoming Oct 10, 11:30 AM Northwestern vs Ball State | ",
 "Upcoming Oct 17, 11:00 AM Northwestern at Michigan State | ",
 "Upcoming Oct 24 Northwestern vs Rutgers | ",
 "Upcoming Oct 31 Northwestern at Oregon | ",
 "Upcoming Nov 7 Northwestern vs Iowa | ",
 "Upcoming Nov 14 Northwestern at Ohio State | ",
 "Upcoming Nov 21 Northwestern at Minnesota | ",
 "Upcoming Nov 28 Northwestern vs Illinois | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Northwestern at Badger Invitational | Completed",
 "Final Sep 18 Women's · Northwestern at Mason Rudolph Championship | Completed",
 "Final Oct 5 Women's · Northwestern at Windy City Collegiate Classic | Completed",
 "Upcoming Oct 16 Women's · Northwestern at Stanford Intercollegiate | ",
 "Upcoming Jan 16 Women's · Northwestern at MLK Practice Trip | ",
 "Upcoming Jan 31 Women's · Northwestern at Golf Reservations Center Domincan Republic Classic | ",
 "Upcoming Feb 22 Women's · Northwestern at Bruin-Wave Invitational | ",
 "Upcoming Mar 1 Women's · Northwestern at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 25 Women's · Northwestern at PING ASU Invitational | ",
 "Upcoming Apr 11 Women's · Northwestern at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Northwestern at Big Ten Championships | ",
 "Upcoming May 10 Women's · Northwestern at NCAA Regionals | ",
 "Upcoming May 21 Women's · Northwestern at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Northwestern at Folds of Honor Collegiate | Completed",
 "Final Sep 18 Men's · Northwestern at Olympia Fields Fighting Illini Collegiate | Completed",
 "Final Sep 28 Men's · Northwestern at Windon Memorial Classic | Completed",
 "Final Oct 5 Men's · Northwestern at Kemper Lakes Intercollegiate (Individuals Only) | Completed",
 "Upcoming Oct 16 Men's · Northwestern at Golf Club of Georgia Collegiate | ",
 "Upcoming Oct 26 Men's · Northwestern at The Preserve Golf Club Collegiate | ",
 "Upcoming Jan 30 Men's · Northwestern at The Gantner Cup | ",
 "Upcoming Feb 15 Men's · Northwestern at The Prestige | ",
 "Upcoming Mar 7 Men's · Northwestern at Colleton River Collegiate | ",
 "Upcoming Mar 25 Men's · Northwestern at The Goodwin | ",
 "Upcoming Apr 12 Men's · Northwestern at The Lewis Chitengwa Memorial | ",
 "Upcoming Apr 23 Men's · Northwestern at Big Ten Championships | ",
 "Upcoming May 17 Men's · Northwestern at NCAA Regionals | ",
 "Upcoming May 28 Men's · Northwestern at NCAA Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Northwestern at Virginia | L, 1-3",
 "Final Aug 20 Women's · Northwestern vs Syracuse | L, 0-1",
 "Final Aug 23 Women's · Northwestern vs Denver | W, 1-0",
 "Final Aug 27 Women's · Northwestern vs Illinois State | T, 1-1",
 "Final Aug 30 Women's · Northwestern at Butler | W, 1-0",
 "Final Sep 3 Women's · Northwestern vs Loyola Chicago | T, 0-0",
 "Final Sep 6 Women's · Northwestern at Tennessee | L, 0-1",
 "Final Sep 10 Women's · Northwestern vs Michigan | W, 1-0",
 "Final Sep 13 Women's · Northwestern at Wisconsin | L, 0-2",
 "Final Sep 20 Women's · Northwestern at Minnesota | T, 2-2",
 "Final Sep 24 Women's · Northwestern vs Oregon | W, 1-0",
 "Final Sep 27 Women's · Northwestern vs Indiana | W, 2-0",
 "Final Oct 3 Women's · Northwestern at Ohio State | L, 0-3",
 "Final Oct 8 Women's · Northwestern at Rutgers | L, 2-3",
 "Upcoming Oct 11, 11:00 AM Women's · Northwestern at Maryland | ",
 "Upcoming Oct 17, 1:00 PM Women's · Northwestern vs USC | ",
 "Upcoming Oct 22, 6:00 PM Women's · Northwestern at Illinois | ",
 "Upcoming Oct 25, 5:00 PM Women's · Northwestern vs Purdue | ",
 "Upcoming Oct 30, 6:30 PM Women's · Northwestern vs Michigan State | ",
 "Upcoming Nov 4 Women's · Northwestern vs Big Ten Tournament | ",
 "Upcoming Nov 20 Women's · Northwestern vs NCAA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Northwestern vs New Haven | W, 3-1",
 "Final Aug 23 Men's · Northwestern at Notre Dame | T, 1-1",
 "Final Aug 28 Men's · Northwestern at Evansville | W, 2-1",
 "Final Aug 31 Men's · Northwestern vs Xavier | L, 2-3",
 "Final Sep 5 Men's · Northwestern at Marquette | L, 1-3",
 "Final Sep 11 Men's · Northwestern vs Maryland | W, 4-0",
 "Final Sep 15 Men's · Northwestern at Michigan State | L, 0-2",
 "Final Sep 19 Men's · Northwestern at UIC | W, 5-2",
 "Final Sep 25 Men's · Northwestern vs Michigan | W, 1-0",
 "Final Oct 2 Men's · Northwestern at Rutgers | L, 0-4",
 "Upcoming Oct 10, 9:00 PM Men's · Northwestern at Washington | ",
 "Upcoming Oct 16, 6:30 PM Men's · Northwestern vs Penn State | ",
 "Upcoming Oct 19, 6:00 PM Men's · Northwestern vs UCLA | ",
 "Upcoming Oct 23, 6:00 PM Men's · Northwestern at Indiana | ",
 "Upcoming Oct 30, 6:00 PM Men's · Northwestern at Ohio State | ",
 "Upcoming Nov 4, 6:30 PM Men's · Northwestern vs Wisconsin | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 9, 6:00 PM Northwestern vs Loyola Chicago | ",
 "Upcoming Oct 11, 12:00 PM Northwestern vs Spoon River | ",
 "Upcoming Oct 16, 6:00 PM Northwestern vs Bryant & Stratton | ",
 "Upcoming Oct 18, 12:00 PM Northwestern vs UIC | ",
 "Upcoming Oct 23, 3:00 PM Northwestern vs DePaul | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Northwestern vs Miami (OH) | W, 230-87",
 "Today Oct 9, 11:00 AM Women's · Northwestern at Indiana | ",
 "Upcoming Oct 23, 2:00 PM Women's · Northwestern vs Notre Dame | ",
 "Upcoming Oct 28 Women's · Northwestern at Short Course World Trials | ",
 "Upcoming Nov 6, 5:00 PM Women's · Northwestern at Duke | ",
 "Upcoming Nov 18 Women's · Northwestern at Texas Hall of Fame Invite (Swim) | ",
 "Upcoming Nov 19 Women's · Northwestern at Ohio State Fall Invite (Dive) | ",
 "Upcoming Jan 9, 11:00 AM Women's · Northwestern vs UChicago | ",
 "Upcoming Jan 16, 4:00 PM Women's · Northwestern vs Wisconsin | ",
 "Upcoming Jan 29, 5:00 PM Women's · Northwestern at Purdue | ",
 "Upcoming Jan 29, 5:00 PM Women's · Northwestern at Minnesota | ",
 "Upcoming Feb 17 Women's · Northwestern at Big Ten Championships | ",
 "Upcoming Mar 8 Women's · Northwestern vs NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · Northwestern at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Northwestern vs Miami (OH) | W, 187-130",
 "Today Oct 9, 11:00 AM Men's · Northwestern at Indiana | ",
 "Upcoming Oct 23, 2:00 PM Men's · Northwestern vs Notre Dame | ",
 "Upcoming Oct 28 Men's · Northwestern at Short Course World Trials | ",
 "Upcoming Nov 6, 5:00 PM Men's · Northwestern at Duke | ",
 "Upcoming Nov 18 Men's · Northwestern at Texas Hall of Fame Invite (Swim) | ",
 "Upcoming Nov 19 Men's · Northwestern at Ohio State Fall Invite (Dive) | ",
 "Upcoming Jan 9, 11:00 AM Men's · Northwestern vs UChicago | ",
 "Upcoming Jan 16, 4:00 PM Men's · Northwestern vs Wisconsin | ",
 "Upcoming Jan 29, 5:00 PM Men's · Northwestern at Purdue | ",
 "Upcoming Jan 29, 5:00 PM Men's · Northwestern at Minnesota | ",
 "Upcoming Feb 24 Men's · Northwestern at Big Ten Championships | ",
 "Upcoming Mar 8 Men's · Northwestern vs NCAA Diving Zones | ",
 "Upcoming Mar 24 Men's · Northwestern at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Upcoming Oct 8 Women's · Northwestern at ITA Regional Championships | ",
 "Upcoming Oct 23 Women's · Northwestern at TCU Invite | ",
 "Upcoming Nov 5 Women's · Northwestern at ITA Central Sectional | ",
 "Upcoming Nov 6 Women's · Northwestern at Michigan State Classic | ",
 "Upcoming Nov 17 Women's · Northwestern at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Upcoming Oct 15 Men's · Northwestern at ITA Regional Championships | ",
 "Upcoming Oct 29 Men's · Northwestern at Big Ten Singles & Doubles Championships | ",
 "Upcoming Nov 5 Men's · Northwestern at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Northwestern at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · Northwestern at Southern California Intercollegiate Championships | ",
 "Upcoming Nov 17 Men's · Northwestern at NCAA Singles & Doubles Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Northwestern at George Mason | L, 1-3",
 "Final Aug 29 Northwestern at American | L, 2-3",
 "Final Aug 30 Northwestern at Georgetown | W, 3-0",
 "Final Sep 3 Northwestern vs Alabama | W, 3-1",
 "Final Sep 4 Northwestern at Mississippi State | L, 1-3",
 "Final Sep 8 Northwestern vs Butler | W, 3-1",
 "Final Sep 11 Northwestern vs Virginia Tech | W, 3-0",
 "Final Sep 12 Northwestern vs LIU | W, 3-0",
 "Final Sep 13 Northwestern vs Green Bay | L, 2-3",
 "Final Sep 17 Northwestern at Ball State | W, 3-1",
 "Final Sep 18 Northwestern vs IU Indy | W, 3-0",
 "Final Sep 24 Northwestern vs USC | L, 0-3",
 "Final Sep 26 Northwestern vs UCLA | L, 0-3",
 "Final Oct 1 Northwestern at Minnesota | L, 0-3",
 "Final Oct 3 Northwestern vs Ohio State | L, 1-3",
 "Today Oct 9, 6:30 PM Northwestern at Penn State | ",
 "Upcoming Oct 10, 6:00 PM Northwestern at Maryland | ",
 "Upcoming Oct 15, 7:00 PM Northwestern vs Nebraska | ",
 "Upcoming Oct 17, 7:00 PM Northwestern vs Michigan State | ",
 "Upcoming Oct 22, 7:00 PM Northwestern vs Michigan | ",
 "Upcoming Oct 25, 3:00 PM Northwestern at Purdue | ",
 "Upcoming Oct 29, 8:00 PM Northwestern at Illinois | ",
 "Upcoming Oct 31, 7:00 PM Northwestern vs Rutgers | ",
 "Upcoming Nov 6, 9:00 PM Northwestern at Washington | ",
 "Upcoming Nov 8, 8:00 PM Northwestern at Oregon | ",
 "Upcoming Nov 12, 7:00 PM Northwestern vs Iowa | ",
 "Upcoming Nov 14, 7:00 PM Northwestern at Indiana | ",
 "Upcoming Nov 17, 7:00 PM Northwestern at Wisconsin | ",
 "Upcoming Nov 20 Northwestern vs Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 7 Northwestern at Michigan State Open | ",
 "Upcoming Nov 22 Northwestern vs Princeton | ",
 "Upcoming Nov 22 Northwestern vs Davidson | ",
 "Upcoming Nov 22 Northwestern vs SIUE | ",
 "Upcoming Dec 4 Northwestern at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 20 Northwestern at Clarion | ",
 "Upcoming Dec 20 Northwestern vs Mercyhurst | ",
 "Upcoming Dec 29 Northwestern at Midlands Championships | ",
 "Upcoming Jan 8 Northwestern at Illinois | ",
 "Upcoming Jan 15 Northwestern vs Ohio State | ",
 "Upcoming Jan 22 Northwestern at Iowa | ",
 "Upcoming Jan 24 Northwestern vs Purdue | ",
 "Upcoming Jan 28 Northwestern at NIU | ",
 "Upcoming Jan 31 Northwestern vs Michigan State | ",
 "Upcoming Feb 5 Northwestern at Rutgers | ",
 "Upcoming Feb 7 Northwestern at Maryland | ",
 "Upcoming Feb 12 Northwestern vs Indiana | ",
 "Upcoming Feb 21 Northwestern at Patriot Last Chance Open | ",
 "Upcoming Mar 6 Northwestern at Big Ten Championships | ",
 "Upcoming Mar 18 Northwestern at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

const finals=(sport,slug)=>parse(sport,slug).filter(e=>e.status==='Final');

// Golf: the cards publish no place; the final story's headline gives the
// team's ("Wildcats Open Season With Runner-Up Finish", "... in Ninth",
// "Wildcats Take Fourth Place"), or, when it names a player, its text ("the
// 'Cats ... close out the event in 12th place"; "the Northwestern women's
// golf team finished the event in ninth"). A player's share of a place is not
// the team's.
assert.equal(northwesternGolfPlace('Wildcats Open Season With Runner-Up Finish at Badger Invitational'),'2');
assert.equal(northwesternGolfPlace('Wildcats Wrap Up Windy City Collegiate Classic in Ninth'),'9');
assert.equal(northwesternGolfPlace('Wildcats Take Fourth Place at Windon Memorial Classic'),'4');
assert.equal(northwesternGolfPlace('Knai Posts Late Surge to Close Out Mason Rudolph Championship'),null);
assert.equal(northwesternGolfStoryPlace("Junior Emilie Knai made a late charge up the leaderboard to close out the Mason Rudolph Championship in a share of 11 th , as the Northwestern women's golf team finished the event in ninth."),'9');
assert.equal(northwesternGolfStoryPlace('The senior finished his week in a share of 23 rd .'),null);
{
  const golf=[...finals('Golf','womens-golf'),...finals('Golf','mens-golf')].filter(e=>e.recap_url);
  for(const event of golf)recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
  for(const event of golf)await worker.northwesternHandlers.attachGolfPlace(event);
  assert.deepEqual(golf.map(e=>[e.team_label,e.opponent,e.headline]),[["Women's","Badger Invitational","2nd"],["Women's","Mason Rudolph Championship","9th"],["Women's","Windy City Collegiate Classic","9th"],["Men's","Folds of Honor Collegiate","9th"],["Men's","Olympia Fields Fighting Illini Collegiate","12th"],["Men's","Windon Memorial Classic","4th"]]);
  recapFixtures.clear();requests.length=0;
}

// Soccer: the Sep 20 draw at Minnesota links no story; the archive's (dated
// the game day, naming the opponent and "draw") is attached.
{
  const listing=fixture('womens-soccer-archives.html.gz');recapFixtures.set('https://nusports.com/sports/womens-soccer/archives',listing);
  const url='https://nusports.com/news/2026/09/20/wildcats-take-home-a-point-in-2-2-draw-at-minnesota';
  recapFixtures.set(url,fixture('story-2026-09-20-wildcats-take-home-a-point-in-2-2-draw-at-m.html.gz'));
  const game=finals('Soccer','womens-soccer').find(e=>e.opponent==='Minnesota');
  assert.ok(worker.northwesternHandlers.isFinalWithoutStory(game));
  await worker.northwesternHandlers.attachArchiveStory(game);
  assert.equal(game.recap_url,url);
  recapFixtures.clear();requests.length=0;
}

// Soccer's ESPN boards carry their team: an unlabeled women's final (Oct 8
// at Rutgers) did not join the labeled card and showed twice.
assert.deepEqual(northwesternSchool.liveScoreboards.Soccer.map(b=>[b.path,b.team_label]),[["soccer/usa.ncaa.m.1","Men's"],["soccer/usa.ncaa.w.1","Women's"]]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Northwestern module checks passed');
