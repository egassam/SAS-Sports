import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dukeSchool,dukeGolfStoryPlace} from '../src/schools/duke.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='duke');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,dukeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/duke-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goduke.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['duke'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',dukeSchool.scheduleUrls],['roster',dukeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('duke|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goduke.com',`${key} must stay on goduke.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goduke.com/sports/baseball/schedule"],"roster":["https://goduke.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goduke.com/sports/mens-basketball/schedule","https://goduke.com/sports/womens-basketball/schedule"],"roster":["https://goduke.com/sports/mens-basketball/roster","https://goduke.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goduke.com/sports/cross-country/schedule"],"roster":["https://goduke.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://goduke.com/sports/fencing/schedule"],"roster":["https://goduke.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://goduke.com/sports/field-hockey/schedule"],"roster":["https://goduke.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://goduke.com/sports/football/schedule"],"roster":["https://goduke.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goduke.com/sports/womens-golf/schedule","https://goduke.com/sports/mens-golf/schedule"],"roster":["https://goduke.com/sports/womens-golf/roster","https://goduke.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://goduke.com/sports/womens-lacrosse/schedule","https://goduke.com/sports/mens-lacrosse/schedule"],"roster":["https://goduke.com/sports/womens-lacrosse/roster","https://goduke.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goduke.com/sports/rowing/schedule"],"roster":["https://goduke.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://goduke.com/sports/womens-soccer/schedule","https://goduke.com/sports/mens-soccer/schedule"],"roster":["https://goduke.com/sports/womens-soccer/roster","https://goduke.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goduke.com/sports/softball/schedule"],"roster":["https://goduke.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goduke.com/sports/swimming-and-diving/schedule"],"roster":["https://goduke.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goduke.com/sports/womens-tennis/schedule","https://goduke.com/sports/mens-tennis/schedule"],"roster":["https://goduke.com/sports/womens-tennis/roster","https://goduke.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goduke.com/sports/track-and-field/schedule"],"roster":["https://goduke.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goduke.com/sports/womens-volleyball/schedule"],"roster":["https://goduke.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://goduke.com/sports/wrestling/schedule"],"roster":["https://goduke.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'duke|"+sport+"':"),`${sport} routes must live in the Duke module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://goduke.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.dukeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// Golf: the team's place from the final story's headline (Windy City
// Classic, Oct 6: the card publishes none); a player's finish gives none.
{
  const title=name=>(fixture(name).match(/og:title" content="([^"]*)/)||[])[1];
  assert.equal(dukeGolfStoryPlace(title('recap-2026-10-6-womens-golf-li-turns-in-second-consecuti.html.gz')),'T2nd');
  assert.deepEqual(['Duke Places Third at Folds of Honor Collegiate','Blue Devils Tie for 8th at Hamptons Intercollegiate','Looney Leads Duke at Hamptons Intercollegiate','Li Turns in Second Consecutive Top-5 Finish'].map(dukeGolfStoryPlace),['3rd','T8th',null,null]);
}

// BEGIN generated (scripts/generate-module-tests.mjs --school=duke)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 8 Men's · Duke vs Belmont (Exhibition) | W, 102-62",
 "Upcoming Oct 20, 7:00 PM Men's · Duke vs Tennessee (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Men's · Duke at Kansas (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Duke vs Army West Point | ",
 "Upcoming Nov 5, 8:00 PM Men's · Duke vs Coastal Carolina | ",
 "Upcoming Nov 10, 7:00 PM Men's · Duke vs Michigan State | ",
 "Upcoming Nov 13, 8:00 PM Men's · Duke vs SIU Edwardsville | ",
 "Upcoming Nov 17, 7:00 PM Men's · Duke vs Illinois | ",
 "Upcoming Nov 21, 11:00 PM Men's · Duke vs Washington State | ",
 "Upcoming Nov 25, 7:00 PM Men's · Duke vs UConn | ",
 "Upcoming Dec 1, 9:30 PM Men's · Duke at Florida | ",
 "Upcoming Dec 4, 7:00 PM Men's · Duke vs Harvard | ",
 "Upcoming Dec 8, 9:00 PM Men's · Duke vs Georgia | ",
 "Upcoming Dec 15, 7:00 PM Men's · Duke vs Campbell | ",
 "Upcoming Dec 17, 8:00 PM Men's · Duke vs Grambling State | ",
 "Upcoming Dec 21, 7:00 PM Men's · Duke vs Texas Tech | ",
 "Upcoming Dec 30, 7:00 PM Men's · Duke at Georgia Tech | ",
 "Upcoming Jan 2, 2:15 PM Men's · Duke vs Cal | ",
 "Upcoming Jan 5, 7:00 PM Men's · Duke at Syracuse | ",
 "Upcoming Jan 9, 2:00 PM Men's · Duke vs Pitt | ",
 "Upcoming Jan 13, 9:00 PM Men's · Duke vs Stanford | ",
 "Upcoming Jan 16, 7:00 PM Men's · Duke at Boston College | ",
 "Upcoming Jan 20, 9:00 PM Men's · Duke at Wake Forest | ",
 "Upcoming Jan 23, 2:15 PM Men's · Duke vs Notre Dame | ",
 "Upcoming Jan 30 Men's · Duke at Clemson | ",
 "Upcoming Feb 1, 7:00 PM Men's · Duke vs Miami | ",
 "Upcoming Feb 6 Men's · Duke at Virginia | ",
 "Upcoming Feb 9, 9:00 PM Men's · Duke at SMU | ",
 "Upcoming Feb 13, 5:30 PM Men's · Duke vs North Carolina | ",
 "Upcoming Feb 16, 7:00 PM Men's · Duke vs Florida State | ",
 "Upcoming Feb 20, 8:00 PM Men's · Duke vs Gonzaga | ",
 "Upcoming Feb 24, 7:00 PM Men's · Duke at Louisville | ",
 "Upcoming Feb 27, 12:00 PM Men's · Duke vs NC State | ",
 "Upcoming Mar 1, 7:00 PM Men's · Duke vs Virginia | ",
 "Upcoming Mar 6 Men's · Duke at North Carolina | ",
 "Upcoming Mar 9 Men's · Duke at ACC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Duke vs Green Bay | ",
 "Upcoming Nov 8, 2:00 PM Women's · Duke vs North Texas | ",
 "Upcoming Nov 12, 7:00 PM Women's · Duke at Norfolk State | ",
 "Upcoming Nov 15, 3:00 PM Women's · Duke vs Marshall | ",
 "Upcoming Nov 19, 11:00 AM Women's · Duke vs Fordham | ",
 "Upcoming Nov 21, 7:00 PM Women's · Duke at Columbia | ",
 "Upcoming Nov 28, 7:00 PM Women's · Duke vs UConn | ",
 "Upcoming Dec 3, 7:00 PM Women's · Duke vs South Carolina | ",
 "Upcoming Dec 6, 2:00 PM Women's · Duke vs Virginia Tech | ",
 "Upcoming Dec 16, 7:00 PM Women's · Duke vs UCLA | ",
 "Upcoming Dec 19, 6:00 PM Women's · Duke vs Texas | ",
 "Upcoming Dec 20, 10:00 PM Women's · Duke vs Southern California | ",
 "Upcoming Dec 28, 6:00 PM Women's · Duke vs Syracuse | ",
 "Upcoming Dec 31, 8:00 PM Women's · Duke at Virginia | ",
 "Upcoming Jan 3, 3:00 PM Women's · Duke at NC State | ",
 "Upcoming Jan 10, 12:00 PM Women's · Duke at Notre Dame | ",
 "Upcoming Jan 14, 7:00 PM Women's · Duke vs Cal | ",
 "Upcoming Jan 17, 12:00 PM Women's · Duke vs Stanford | ",
 "Upcoming Jan 21, 6:00 PM Women's · Duke at Boston College | ",
 "Upcoming Jan 24, 12:00 PM Women's · Duke vs Clemson | ",
 "Upcoming Jan 28, 8:00 PM Women's · Duke at Florida State | ",
 "Upcoming Jan 31, 5:00 PM Women's · Duke at North Carolina | ",
 "Upcoming Feb 7, 2:00 PM Women's · Duke vs Miami | ",
 "Upcoming Feb 11, 8:00 PM Women's · Duke at Georgia Tech | ",
 "Upcoming Feb 14, 12:00 PM Women's · Duke vs Pitt | ",
 "Upcoming Feb 18, 7:00 PM Women's · Duke vs Louisville | ",
 "Upcoming Feb 21, 6:00 PM Women's · Duke at Wake Forest | ",
 "Upcoming Feb 25, 6:00 PM Women's · Duke at Southern Methodist University | ",
 "Upcoming Feb 28, 4:00 PM Women's · Duke vs North Carolina | ",
 "Upcoming Mar 3 Women's · Duke at Ally ACC Women's Basketball Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 26 Duke at Meadows Challenge | Women's team: 4th / Men's team: 8th",
 "Final Oct 2 Duke at Richmond Invitational | Men's team: 2nd",
 "Upcoming Oct 16 Duke at NCAA Division I Pre-Nationals | ",
 "Upcoming Oct 17 Duke at Upstate Invitational | ",
 "Upcoming Oct 30 Duke at ACC Championships | ",
 "Upcoming Nov 6, 3:45 PM Duke at Hokie Open | ",
 "Upcoming Nov 13 Duke at NCAA Southeast Regional | ",
 "Upcoming Nov 21 Duke at NCAA Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Upcoming Nov 7 Duke at North Carolina | ",
 "Upcoming Nov 14 Duke at Elite Invitational | ",
 "Upcoming Jan 16 Duke at Dave Micahnik Penn Invitational | ",
 "Upcoming Feb 6 Duke at The Beguinet Classic | ",
 "Upcoming Feb 7 Duke at The Miller Invitational | ",
 "Upcoming Feb 20 Duke at ACC Championships | ",
 "Upcoming Mar 13 Duke at NCAA Mid-Atlantic/South Regional | ",
 "Upcoming Mar 25 Duke at NCAA Fencing Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Duke vs William & Mary | W, 7-0",
 "Final Aug 30 Duke at Richmond | W, 1-0",
 "Final Sep 4 Duke vs Northwestern | L, 3-4",
 "Final Sep 6 Duke vs Maryland | L, 2-3",
 "Final Sep 11 Duke vs James Madison | W, 5-1",
 "Final Sep 13 Duke vs VCU | W, 4-0",
 "Final Sep 18 Duke vs Virginia | W, 1-0",
 "Final Sep 25 Duke at Wake Forest | W, 3-2",
 "Final Sep 27 Duke vs Boston College | W, 1-0",
 "Final Oct 2 Duke vs Syracuse | W, 2-0",
 "Final Oct 4 Duke vs Saint Joseph's | W, 2-1",
 "Final Oct 9 Duke at Stanford | L, 2-3",
 "Final Oct 11 Duke at Cal | W, 3-2",
 "Upcoming Oct 17, 1:00 PM Duke at Louisville | ",
 "Upcoming Oct 25, 1:00 PM Duke at Liberty | ",
 "Upcoming Oct 30, 6:00 PM Duke vs North Carolina | ",
 "Upcoming Nov 3 Duke at ACC Championship | ",
 "Upcoming Nov 13 Duke at NCAA Championship | ",
 "Upcoming Nov 20 Duke at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Duke vs Tulane | W, 17-3",
 "Final Sep 12 Duke at Illinois | W, 31-27",
 "Final Sep 19 Duke vs Stanford | W, 35-7",
 "Final Sep 26 Duke vs William & Mary | W, 62-7",
 "Final Oct 10 Duke at Georgia Tech | L, 25-28",
 "Upcoming Oct 17, 3:30 PM Duke vs North Carolina | ",
 "Upcoming Oct 23, 7:00 PM Duke at Virginia | ",
 "Upcoming Oct 31 Duke vs Boston College | ",
 "Upcoming Nov 7 Duke at NC State | ",
 "Upcoming Nov 14 Duke at Miami | ",
 "Upcoming Nov 20, 7:30 PM Duke vs Clemson | ",
 "Upcoming Nov 28 Duke at Wake Forest | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Duke at Folds of Honor Collegiate | 3rd of 12",
 "Final Oct 5 Women's · Duke at Windy City Collegiate Classic | Completed",
 "Upcoming Oct 16 Women's · Duke at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 23 Women's · Duke at Landfall Tradition | ",
 "Upcoming Jan 25 Women's · Duke at Sea Best Intercollegiate | ",
 "Upcoming Feb 14 Women's · Duke at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Duke at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 22 Women's · Duke at Charles Schwab Women's Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · Duke at Country Club of Birmingham Women's Collegiate Classic | ",
 "Upcoming Apr 15 Women's · Duke at ACC Championship | ",
 "Upcoming May 10 Women's · Duke at NCAA Regional Championship | ",
 "Upcoming May 21 Women's · Duke at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Duke at Sahalee Players Championship | 5th of 12",
 "Final Sep 21 Men's · Duke at Rod Myers Invitational | 4th of 13",
 "Final Oct 5 Men's · Duke at Hamptons Intercollegiate | T8th of 12",
 "Upcoming Oct 16 Men's · Duke at Golf Club of Georgia Collegiate | ",
 "Upcoming Oct 26 Men's · Duke at The Preserve Golf Club Collegiate | ",
 "Upcoming Feb 7 Men's · Duke at Dorado Beach Collegiate | ",
 "Upcoming Feb 15 Men's · Duke at The Prestige | ",
 "Upcoming Mar 6 Men's · Duke at The Hayt | ",
 "Upcoming Mar 15 Men's · Duke at Johnnie-O at Sea Island | ",
 "Upcoming Apr 10 Men's · Duke at Tar Heel Intercollegiate | ",
 "Upcoming Apr 22 Men's · Duke at ACC Championship | ",
 "Upcoming May 17 Men's · Duke at NCAA Regional | ",
 "Upcoming May 28 Men's · Duke at NCAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24 Women's · Duke vs Duke Invitational (Exhibition) | ",
 "Upcoming Oct 25, 10:00 AM Women's · Duke vs Ohio State (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 17 Duke at Head of the Charles | ",
 "Upcoming Oct 24 Duke at High Point Rowing Festival | ",
 "Upcoming Oct 31 Duke at North Carolina | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Duke at Southern California | W, 3-1",
 "Final Aug 16 Women's · Duke at UCLA | T, 1-1",
 "Final Aug 20 Women's · Duke vs FIU | W, 4-0",
 "Final Aug 23 Women's · Duke vs Rhode Island | W, 6-1",
 "Final Aug 27 Women's · Duke at Old Dominion | W, 2-1",
 "Final Aug 30 Women's · Duke vs VCU | W, 6-0",
 "Final Sep 13 Women's · Duke vs Stanford | W, 5-0",
 "Final Sep 17 Women's · Duke at North Carolina | L, 2-4",
 "Final Sep 24 Women's · Duke vs Notre Dame | T, 1-1",
 "Final Sep 27 Women's · Duke at Pitt | T, 0-0",
 "Final Oct 3 Women's · Duke vs California | T, 1-1",
 "Final Oct 10 Women's · Duke at Boston College | W, 2-1",
 "Upcoming Oct 16, 8:30 PM Women's · Duke at SMU | ",
 "Upcoming Oct 24, 5:00 PM Women's · Duke vs NC State | ",
 "Upcoming Oct 29, 8:00 PM Women's · Duke at Florida State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Duke vs Virginia | ",
 "Upcoming Nov 8 Women's · Duke vs ACC Quarterfinal | ",
 "Upcoming Nov 12 Women's · Duke at ACC Semifinal | ",
 "Upcoming Nov 15, 12:00 PM Women's · Duke at ACC Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Duke vs Seton Hall | W, 2-1",
 "Final Aug 23 Men's · Duke vs California Baptist University | W, 3-1",
 "Final Aug 27 Men's · Duke vs Furman | L, 3-4",
 "Final Aug 30 Men's · Duke vs Georgetown | L, 0-3",
 "Final Sep 5 Men's · Duke at Wake Forest | L, 1-6",
 "Final Sep 10 Men's · Duke at NC State | L, 1-3",
 "Final Sep 15 Men's · Duke vs Queens | W, 2-0",
 "Final Sep 18 Men's · Duke vs Virginia Tech | L, 2-4",
 "Final Sep 22 Men's · Duke vs Howard | W, 3-1",
 "Final Sep 25 Men's · Duke vs Elon | L, 0-1",
 "Final Oct 2 Men's · Duke vs Stanford | L, 2-3",
 "Final Oct 6 Men's · Duke vs Wofford | W, 3-0",
 "Final Oct 10 Men's · Duke at SMU | L, 0-6",
 "Final Oct 13 Men's · Duke vs Greensboro College | W, 2-0",
 "Upcoming Oct 16, 7:00 PM Men's · Duke vs Virginia | ",
 "Upcoming Oct 23, 8:00 PM Men's · Duke vs North Carolina | ",
 "Upcoming Oct 30, 7:00 PM Men's · Duke at Notre Dame | ",
 "Upcoming Nov 4 Men's · Duke at ACC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 16, 6:00 PM Duke vs East Carolina (Exhibition) | ",
 "Upcoming Oct 18, 1:00 PM Duke vs Walters State (Exhibition) | ",
 "Upcoming Oct 24, 2:00 PM Duke vs Florida Vibe (Exhibition) | ",
 "Upcoming Oct 25, 2:00 PM Duke at Charlotte (Exhibition) | ",
 "Upcoming Oct 30, 6:00 PM Duke at Elon (Exhibition) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 2 Duke at Davidson | Men's team: W, 193-106 / Women's team: W, 246.5-53.5",
 "Upcoming Oct 16, 5:00 PM Duke at North Carolina | ",
 "Upcoming Oct 24, 11:00 AM Duke vs Virginia Tech | ",
 "Upcoming Nov 6, 5:00 PM Duke vs Northwestern | ",
 "Upcoming Nov 18, 10:00 AM Duke at Texas Invitational | ",
 "Upcoming Nov 19, 9:00 AM Duke at Georgia Fall Invitational | ",
 "Upcoming Jan 15 Duke at Georgia Tech | ",
 "Upcoming Jan 29, 5:00 PM Duke vs Tennessee | ",
 "Upcoming Feb 3, 5:00 PM Duke at UNC Invitational | ",
 "Upcoming Feb 16, 9:00 AM Duke at ACC Championships | ",
 "Upcoming Feb 26 Duke at Last Chance Meet | ",
 "Upcoming Mar 7 Duke at NCAA Diving Zones | ",
 "Upcoming Mar 11, 9:00 AM Duke at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17, 10:00 AM Duke at NCAA Women's Championships | ",
 "Upcoming Mar 24, 10:00 AM Duke at NCAA Men's Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Duke at Kitty Harrison Invitational | Completed",
 "Final Sep 19 Women's · Duke at ITA All-American Championship | Completed",
 "Final Oct 1 Women's · Duke at Battle in the Bay | Completed",
 "Upcoming Oct 16 Women's · Duke at ITA Fall Regionals | ",
 "Upcoming Nov 5 Women's · Duke at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Duke at NCAA Individual Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Duke at Orange & Blue Classic | Completed",
 "Final Sep 19 Men's · Duke at ITA All-American Championships | Completed",
 "Final Oct 1 Men's · Duke at Battle of the Bay | Completed",
 "Final Oct 8 Men's · Duke at ITA Regional Championships | Completed",
 "Upcoming Oct 23 Men's · Duke at Wake Forest Invite | ",
 "Upcoming Nov 5 Men's · Duke at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Duke at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Duke at Coastal Carolina | W, 3-1",
 "Final Aug 29 Duke vs Queens University of Charlotte | W, 3-0",
 "Final Sep 3 Duke vs Tulane | L, 0-3",
 "Final Sep 4 Duke at North Florida | W, 3-1",
 "Final Sep 5 Duke vs FIU | W, 3-0",
 "Final Sep 8 Duke vs Charleston Southern | W, 3-0",
 "Final Sep 11 Duke vs Marshall | W, 3-1",
 "Final Sep 12 Duke vs Belmont | W, 3-0",
 "Final Sep 18 Duke at Butler | W, 3-1",
 "Final Sep 19 Duke vs LIU | L, 2-3",
 "Final Sep 25 Duke at Wake Forest | W, 3-2",
 "Final Sep 27 Duke at NC State | L, 1-3",
 "Final Oct 2 Duke vs Georgia Tech | L, 1-3",
 "Final Oct 4 Duke vs Clemson | W, 3-0",
 "Final Oct 9 Duke at Virginia | W, 3-2",
 "Final Oct 11 Duke at Virginia Tech | W, 3-2",
 "Upcoming Oct 16, 7:00 PM Duke at Louisville | ",
 "Upcoming Oct 18, 1:00 PM Duke at Notre Dame | ",
 "Upcoming Oct 23, 6:30 PM Duke vs Stanford | ",
 "Upcoming Oct 25, 1:00 PM Duke vs Cal | ",
 "Upcoming Oct 30, 6:30 PM Duke vs Boston College | ",
 "Upcoming Nov 1, 1:00 PM Duke vs Syracuse | ",
 "Upcoming Nov 6, 7:00 PM Duke at Pitt | ",
 "Upcoming Nov 8, 2:00 PM Duke at SMU | ",
 "Upcoming Nov 12, 6:30 PM Duke vs North Carolina | ",
 "Upcoming Nov 15, 1:00 PM Duke at North Carolina | ",
 "Upcoming Nov 20, 12:00 PM Duke vs Florida State | ",
 "Upcoming Nov 22, 1:00 PM Duke vs Miami | ",
 "Upcoming Nov 25, 4:00 PM Duke at Syracuse | ",
 "Upcoming Nov 28, 3:00 PM Duke vs Virginia Tech | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 12:00 PM Duke vs Black & Blue Matches (Exhibition) | ",
 "Upcoming Nov 7 Duke vs Journeymen Wranglemania | ",
 "Upcoming Nov 8 Duke at Journeymen Collegiate Classic | ",
 "Upcoming Nov 14, 10:00 AM Duke at Princeton | ",
 "Upcoming Nov 14, 12:00 PM Duke at Ohio | ",
 "Upcoming Nov 14, 2:00 PM Duke at Chattanooga | ",
 "Upcoming Nov 20, 7:00 PM Duke at Appalachian State | ",
 "Upcoming Nov 22, 1:00 PM Duke vs Northern Iowa | ",
 "Upcoming Dec 4, 3:00 PM Duke at North Dakota State | ",
 "Upcoming Dec 4, 5:00 PM Duke vs Michigan State | ",
 "Upcoming Dec 18, 5:00 PM Duke vs Gardner-Webb | ",
 "Upcoming Dec 20 Duke at Buffalo | ",
 "Upcoming Dec 20 Duke at Northern Colorado | ",
 "Upcoming Dec 20 Duke at Penn State | ",
 "Upcoming Jan 2 Duke at Chattanooga | ",
 "Upcoming Jan 8, 7:00 PM Duke at NC State | ",
 "Upcoming Jan 15, 12:00 PM Duke vs Brown | ",
 "Upcoming Jan 16, 1:00 PM Duke vs Stanford | ",
 "Upcoming Jan 22, 7:00 PM Duke vs Virginia Tech | ",
 "Upcoming Jan 31, 1:00 PM Duke at Pitt | ",
 "Upcoming Feb 12, 7:00 PM Duke vs North Carolina | ",
 "Upcoming Feb 19, 7:00 PM Duke at Virginia | ",
 "Upcoming Mar 6 Duke at ACC Championships | ",
 "Upcoming Mar 18 Duke at NCAA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Duke module checks passed');
