import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southFloridaSchool} from '../src/schools/south-florida.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='south-florida');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,southFloridaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/south-florida-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gousfbulls.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['south-florida'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',southFloridaSchool.scheduleUrls],['roster',southFloridaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('south-florida|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gousfbulls.com',`${key} must stay on gousfbulls.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gousfbulls.com/sports/baseball/schedule"],"roster":["https://gousfbulls.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gousfbulls.com/sports/mens-basketball/schedule","https://gousfbulls.com/sports/womens-basketball/schedule"],"roster":["https://gousfbulls.com/sports/mens-basketball/roster","https://gousfbulls.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gousfbulls.com/sports/cross-country/schedule"],"roster":["https://gousfbulls.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gousfbulls.com/sports/football/schedule"],"roster":["https://gousfbulls.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gousfbulls.com/sports/womens-golf/schedule","https://gousfbulls.com/sports/mens-golf/schedule"],"roster":["https://gousfbulls.com/sports/womens-golf/roster","https://gousfbulls.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://gousfbulls.com/sports/womens-lacrosse/schedule"],"roster":["https://gousfbulls.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://gousfbulls.com/sports/womens-soccer/schedule","https://gousfbulls.com/sports/mens-soccer/schedule"],"roster":["https://gousfbulls.com/sports/womens-soccer/roster","https://gousfbulls.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gousfbulls.com/sports/softball/schedule"],"roster":["https://gousfbulls.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gousfbulls.com/sports/womens-tennis/schedule","https://gousfbulls.com/sports/mens-tennis/schedule"],"roster":["https://gousfbulls.com/sports/womens-tennis/roster","https://gousfbulls.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gousfbulls.com/sports/track-and-field/schedule"],"roster":["https://gousfbulls.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gousfbulls.com/sports/womens-volleyball/schedule"],"roster":["https://gousfbulls.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'south-florida|"+sport+"':"),`${sport} routes must live in the South Florida module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gousfbulls.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.southFloridaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=south-florida)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 1:00 PM USF vs Florida State | ",
 "Upcoming Nov 1, 2:00 PM USF vs Florida Southern | ",
 "Upcoming Nov 7, 2:00 PM USF vs Air Force | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 19 Men's · USF vs Saint Leo (Exhibition) | W, 104-72",
 "Upcoming Nov 2, 7:00 PM Men's · USF vs Charleston Southern | ",
 "Upcoming Nov 5, 8:30 PM Men's · USF at DePaul | ",
 "Upcoming Nov 11, 3:00 PM Men's · USF vs Saint Joseph's | ",
 "Upcoming Nov 14, 2:00 PM Men's · USF vs Coppin State | ",
 "Upcoming Nov 17, 7:00 PM Men's · USF vs Tennessee State | ",
 "Upcoming Nov 21, 4:00 PM Men's · USF at George Mason | ",
 "Upcoming Nov 24, 7:00 PM Men's · USF vs Stetson | ",
 "Upcoming Nov 29, 3:30 PM Men's · USF vs Saint Louis | ",
 "Upcoming Dec 2, 7:00 PM Men's · USF vs West Florida | ",
 "Upcoming Dec 9, 7:00 PM Men's · USF vs Jacksonville | ",
 "Upcoming Dec 12, 7:00 PM Men's · USF at Dayton | ",
 "Upcoming Dec 16 Men's · USF vs Alabama | ",
 "Upcoming Dec 19, 2:00 PM Men's · USF vs Kennesaw State | ",
 "Upcoming Dec 22, 7:00 PM Men's · USF at College of Charleston | ",
 "Upcoming Dec 30 Men's · USF at Tulsa | ",
 "Upcoming Jan 3 Men's · USF vs Memphis | ",
 "Upcoming Jan 7 Men's · USF vs Charlotte | ",
 "Upcoming Jan 10 Men's · USF at Tulane | ",
 "Upcoming Jan 14 Men's · USF at Temple | ",
 "Upcoming Jan 17 Men's · USF vs Tulsa | ",
 "Upcoming Jan 23 Men's · USF at UTSA | ",
 "Upcoming Jan 26 Men's · USF vs Rice | ",
 "Upcoming Jan 31 Men's · USF at Florida Atlantic | ",
 "Upcoming Feb 4 Men's · USF vs Wichita State | ",
 "Upcoming Feb 7 Men's · USF at Charlotte | ",
 "Upcoming Feb 10 Men's · USF at East Carolina | ",
 "Upcoming Feb 13 Men's · USF vs Temple | ",
 "Upcoming Feb 18 Men's · USF at Wichita State | ",
 "Upcoming Feb 21 Men's · USF vs UAB | ",
 "Upcoming Feb 24 Men's · USF vs North Texas | ",
 "Upcoming Feb 28 Men's · USF at Memphis | ",
 "Upcoming Mar 4 Men's · USF vs Florida Atlantic | ",
 "Upcoming Mar 10 Men's · USF at American Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · USF vs Furman | ",
 "Upcoming Nov 6, 8:30 PM Women's · USF vs Belmont | ",
 "Upcoming Nov 8, 1:00 PM Women's · USF vs Rhode Island | ",
 "Upcoming Nov 12, 6:00 PM Women's · USF at Florida | ",
 "Upcoming Nov 15, 3:00 PM Women's · USF vs Florida International | ",
 "Upcoming Nov 18, 7:00 PM Women's · USF vs Binghamton | ",
 "Upcoming Nov 22, 1:00 PM Women's · USF vs Texas Tech | ",
 "Upcoming Nov 27, 9:00 PM Women's · USF vs Seton Hall | ",
 "Upcoming Nov 28, 6:30 PM Women's · USF vs vs. Baylor or Penn State | ",
 "Upcoming Dec 1, 7:00 PM Women's · USF vs Arkansas Pine Bluff | ",
 "Upcoming Dec 4, 7:00 PM Women's · USF vs Morgan State | ",
 "Upcoming Dec 15, 7:00 PM Women's · USF vs Longwood | ",
 "Upcoming Dec 20, 9:00 PM Women's · USF vs Auburn | ",
 "Upcoming Dec 21, 6:30 PM Women's · USF vs Middle Tennessee | ",
 "Upcoming Dec 30 Women's · USF at UNT | ",
 "Upcoming Jan 2 Women's · USF vs UTSA | ",
 "Upcoming Jan 6 Women's · USF vs Tulsa | ",
 "Upcoming Jan 14 Women's · USF at Charlotte | ",
 "Upcoming Jan 17 Women's · USF at ECU | ",
 "Upcoming Jan 20 Women's · USF vs Temple | ",
 "Upcoming Jan 24 Women's · USF vs FAU | ",
 "Upcoming Jan 27 Women's · USF at Wichita State | ",
 "Upcoming Jan 30 Women's · USF at Tulsa | ",
 "Upcoming Feb 3 Women's · USF vs ECU | ",
 "Upcoming Feb 6 Women's · USF vs Tulane | ",
 "Upcoming Feb 10 Women's · USF vs UAB | ",
 "Upcoming Feb 17 Women's · USF at UTSA | ",
 "Upcoming Feb 20 Women's · USF vs Rice | ",
 "Upcoming Feb 24 Women's · USF at FAU | ",
 "Upcoming Feb 27 Women's · USF at Temple | ",
 "Upcoming Mar 2 Women's · USF vs Memphis | ",
 "Upcoming Mar 6 Women's · USF at Rice | ",
 "Upcoming Mar 17 Women's · USF at NCAA Opening Round | ",
 "Upcoming Mar 19 Women's · USF at NCAA First Round | ",
 "Upcoming Mar 21 Women's · USF at NCAA Second Round | ",
 "Upcoming Mar 26 Women's · USF at NCAA Sweet 16 | ",
 "Upcoming Mar 28 Women's · USF at NCAA Elite Eight | ",
 "Upcoming Apr 2 Women's · USF at NCAA Final Four | ",
 "Upcoming Apr 4 Women's · USF at NCAA National Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 USF at Florida Intercollegiate XC Invitational | Completed",
 "Final Sep 18 USF at FSU Pre-Regional | Completed",
 "Final Oct 3 USF at Swags Louisville Cross Country Classic | Completed",
 "Final Oct 16 USF at Crimson Classic | Completed",
 "Upcoming Oct 31 USF at American Cross Country Championships | ",
 "Upcoming Nov 13 USF at NCAA South Regional | ",
 "Upcoming Nov 21 USF at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 USF vs FIU | W, 19-9",
 "Final Sep 12 USF at Army | W, 28-24",
 "Final Sep 19 USF vs Delaware State | W, 59-17",
 "Final Sep 26 USF at Bowling Green | W, 14-6",
 "Final Oct 3 USF vs Temple | L, 13-17",
 "Final Oct 8 USF at UTSA | L, 24-31",
 "Final Oct 17 USF vs Kent State | W, 29-2",
 "Upcoming Oct 31, 12:00 PM USF vs UAB | ",
 "Upcoming Nov 6, 7:30 PM USF at ECU | ",
 "Upcoming Nov 12, 8:00 PM USF vs Memphis | ",
 "Upcoming Nov 21 USF at FAU | ",
 "Upcoming Nov 28 USF vs Tulane | ",
 "Upcoming Dec 5, 8:00 PM USF at American Conference Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · USF at Canadian Collegiate Invitational | 7th of 11",
 "Final Sep 21 Women's · USF at Eckerd Invitational | No team score (individuals only)",
 "Final Oct 4 Women's · USF at Mercedes Benz Intercollegiate | 4th of 15",
 "Upcoming Oct 23 Women's · USF at Landfall Invitational | ",
 "Upcoming Feb 1 Women's · USF at PDI Intercollegiate at UCF | ",
 "Upcoming Mar 6 Women's · USF at Gator Invitational | ",
 "Upcoming Mar 15 Women's · USF at Briars Creek Invitational | ",
 "Upcoming Mar 20 Women's · USF at FSU Matchup | ",
 "Upcoming Apr 5 Women's · USF at \"Mo” Morial Invitational | ",
 "Upcoming Apr 19 Women's · USF at American Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · USF at New York Harbor Cup | 6th of 9",
 "Final Sep 21 Men's · USF at FAU Invitational | 8th of 11",
 "Final Sep 28 Men's · USF at Windon Memorial Classic | 9th of 16",
 "Final Oct 5 Men's · USF at West Bay Collegiate | No team score (individuals only)",
 "Final Oct 18 Men's · USF at Quail Valley Collegiate Invitational | 7th of 15",
 "Upcoming Feb 7 Men's · USF at Dorado Beach Collegiate | ",
 "Upcoming Feb 13 Men's · USF at Florida Gators Invitational | ",
 "Upcoming Feb 28 Men's · USF at Ball State Invitational | ",
 "Upcoming Mar 6 Men's · USF at Hayt Invitational | ",
 "Upcoming Mar 15 Men's · USF at Pauma Valley Invitational | ",
 "Upcoming Mar 22 Men's · USF at Valspar Collegiate | ",
 "Upcoming Apr 10 Men's · USF at Tar Heel Intercollegiate | ",
 "Upcoming Apr 25 Men's · USF at American Championship | ",
 "Upcoming May 17 Men's · USF at NCAA Regional | ",
 "Upcoming May 28 Men's · USF at NCAA Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · USF at Gonzaga | L, 1-5",
 "Final Aug 15 Women's · USF at Washington State | L, 1-4",
 "Final Aug 23 Women's · USF vs UCF | L, 0-2",
 "Final Aug 30 Women's · USF at Stetson | W, 3-0",
 "Final Sep 3 Women's · USF vs Wake Forest | L, 0-3",
 "Final Sep 6 Women's · USF vs Youngstown State | W, 2-0",
 "Final Sep 10 Women's · USF vs Mercer | T, 2-2",
 "Final Sep 17 Women's · USF at North Texas | T, 1-1",
 "Final Sep 24 Women's · USF vs Memphis | T, 1-1",
 "Final Oct 1 Women's · USF at Florida Atlantic | L, 0-3",
 "Final Oct 8 Women's · USF vs UTSA | L, 0-3",
 "Final Oct 11 Women's · USF vs Temple | L, 0-1",
 "Final Oct 15 Women's · USF at Charlotte | L, 1-2",
 "Today Oct 22, 7:00 PM Women's · USF vs Rice | ",
 "Upcoming Oct 25, 2:00 PM Women's · USF at Tulsa | ",
 "Upcoming Oct 30, 7:00 PM Women's · USF vs UAB | ",
 "Upcoming Nov 3, 7:00 PM Women's · USF at East Carolina | ",
 "Upcoming Nov 8 Women's · USF at American Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · USF vs Winthrop | L, 1-2",
 "Final Aug 23 Men's · USF vs West Florida | W, 3-1",
 "Final Aug 28 Men's · USF at UCF | L, 0-2",
 "Final Sep 1 Men's · USF vs UNF | L, 0-1",
 "Final Sep 6 Men's · USF vs UTRGV | L, 0-5",
 "Final Sep 11 Men's · USF at UAB | L, 2-3",
 "Final Sep 15 Men's · USF at UNC Greensboro | L, 0-5",
 "Final Sep 20 Men's · USF vs Tulsa | T, 0-0",
 "Final Sep 26 Men's · USF at Missouri State | L, 2-3",
 "Final Oct 2 Men's · USF vs FIU | L, 0-1",
 "Final Oct 6 Men's · USF vs Stetson | L, 2-4",
 "Final Oct 11 Men's · USF at Charlotte | L, 0-1",
 "Final Oct 14 Men's · USF vs Jacksonville | T, 2-2",
 "Final Oct 18 Men's · USF vs Temple | T, 3-3",
 "Upcoming Oct 23, 7:00 PM Men's · USF vs Memphis | ",
 "Upcoming Oct 28, 7:00 PM Men's · USF at Florida Atlantic | ",
 "Upcoming Oct 30, 4:00 PM Men's · USF vs Florida College | ",
 "Upcoming Nov 6 Men's · USF at American Conference First Round | ",
 "Upcoming Nov 11 Men's · USF at American Conference Semi Finals | ",
 "Upcoming Nov 14 Men's · USF at American Conference Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 25, 2:00 PM USF at UCF (Exhibition) | ",
 "Upcoming Oct 27, 6:00 PM USF at Florida (Exhibition) | ",
 "Upcoming Oct 30, 12:30 PM USF vs Florida Southwestern State (Exhibition) | ",
 "Upcoming Nov 1, 2:00 PM USF vs Bethune-Cookman (Exhibition) | ",
 "Upcoming Nov 6, 6:00 PM USF vs Tampa (Exhibition) | ",
 "Upcoming Nov 8, 12:00 PM USF vs Eckerd (Exhibition) | ",
 "Upcoming Nov 13, 6:00 PM USF vs Polk State (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · USF at Milwaukee Tennis Classic | Completed",
 "Final Sep 25 Women's · USF at Bedford Cup | Completed",
 "Final Oct 8 Women's · USF at ITA Regionals | Completed",
 "Today Oct 22 Women's · USF at American Fall Individual Conference Championships | ",
 "Upcoming Oct 26 Women's · USF at 15K Sumter | ",
 "Upcoming Oct 29 Women's · USF at UTR Event | ",
 "Upcoming Nov 2 Women's · USF at 15k Hilton Head | ",
 "Upcoming Nov 6 Women's · USF at UNF Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · USF at Bedford Cup | Completed",
 "Final Oct 5 Men's · USF at UTR Pro Tennis Tournament | Completed",
 "Final Oct 14 Men's · USF at South East Regionals | Completed",
 "Today Oct 22 Men's · USF at American Single and Double Championships | ",
 "Upcoming Nov 5 Men's · USF at Battle of Boca | ",
 "Upcoming Nov 17 Men's · USF at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 USF vs Eastern Kentucky | L, 2-3",
 "Final Aug 29 USF at Kentucky | L, 0-3",
 "Final Aug 30 USF vs Utah State | W, 3-0",
 "Final Sep 3 USF at Stanford | L, 1-3",
 "Final Sep 5 USF vs Marquette | L, 0-3",
 "Final Sep 10 USF vs TCU | L, 0-3",
 "Final Sep 11 USF vs Dayton | L, 1-3",
 "Final Sep 12 USF vs Michigan | L, 0-3",
 "Final Sep 18 USF at Penn State | L, 0-3",
 "Final Sep 19 USF vs Tennessee | L, 0-3",
 "Final Sep 25 USF at Tulsa | L, 0-3",
 "Final Sep 27 USF at Wichita State | W, 3-1",
 "Final Oct 2 USF vs Rice | W, 3-0",
 "Final Oct 4 USF vs Temple | W, 3-0",
 "Final Oct 9 USF at North Texas | L, 2-3",
 "Final Oct 11 USF at UTSA | L, 2-3",
 "Final Oct 16 USF vs Charlotte | W, 3-0",
 "Final Oct 18 USF vs Tulane | L, 2-3",
 "Final Oct 21 USF vs Florida Atlantic | W, 3-2",
 "Upcoming Oct 25, 1:00 PM USF vs Memphis | ",
 "Upcoming Oct 30, 8:00 PM USF at Rice | ",
 "Upcoming Nov 1, 1:00 PM USF at East Carolina | ",
 "Upcoming Nov 4, 6:00 PM USF at Florida Atlantic | ",
 "Upcoming Nov 8, 1:00 PM USF vs UAB | ",
 "Upcoming Nov 13, 7:30 PM USF at Tulane | ",
 "Upcoming Nov 15, 1:00 PM USF vs East Carolina | ",
 "Upcoming Nov 20 USF at American Conference Tournament | "
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
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("South Florida module checks passed");
