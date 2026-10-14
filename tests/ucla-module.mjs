import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uclaSchool,UCLA_TFRRS_TEAMS,uclaGolfCardPlace} from '../src/schools/ucla.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ucla');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uclaHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ucla-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uclabruins.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ucla'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',uclaSchool.scheduleUrls],['roster',uclaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ucla|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uclabruins.com',`${key} must stay on uclabruins.com`);
  }
}
const parity={"Baseball":{"schedule":["https://uclabruins.com/sports/baseball/schedule"],"roster":["https://uclabruins.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://uclabruins.com/sports/mens-basketball/schedule","https://uclabruins.com/sports/womens-basketball/schedule"],"roster":["https://uclabruins.com/sports/mens-basketball/roster","https://uclabruins.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://uclabruins.com/sports/womens-beach-volleyball/schedule"],"roster":["https://uclabruins.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://uclabruins.com/sports/cross-country/schedule"],"roster":["https://uclabruins.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://uclabruins.com/sports/football/schedule"],"roster":["https://uclabruins.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://uclabruins.com/sports/womens-golf/schedule","https://uclabruins.com/sports/mens-golf/schedule"],"roster":["https://uclabruins.com/sports/womens-golf/roster","https://uclabruins.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://uclabruins.com/sports/womens-gymnastics/schedule"],"roster":["https://uclabruins.com/sports/womens-gymnastics/roster"],"combined":false},"Rowing":{"schedule":["https://uclabruins.com/sports/womens-rowing/schedule"],"roster":["https://uclabruins.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://uclabruins.com/sports/womens-soccer/schedule","https://uclabruins.com/sports/mens-soccer/schedule"],"roster":["https://uclabruins.com/sports/womens-soccer/roster","https://uclabruins.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://uclabruins.com/sports/softball/schedule"],"roster":["https://uclabruins.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://uclabruins.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://uclabruins.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://uclabruins.com/sports/womens-tennis/schedule","https://uclabruins.com/sports/mens-tennis/schedule"],"roster":["https://uclabruins.com/sports/womens-tennis/roster","https://uclabruins.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://uclabruins.com/sports/track-and-field/schedule"],"roster":["https://uclabruins.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://uclabruins.com/sports/womens-volleyball/schedule"],"roster":["https://uclabruins.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://uclabruins.com/sports/womens-water-polo/schedule","https://uclabruins.com/sports/mens-water-polo/schedule"],"roster":["https://uclabruins.com/sports/womens-water-polo/roster","https://uclabruins.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ucla|"+sport+"':"),`${sport} routes must live in the UCLA module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://uclabruins.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uclaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];




// BEGIN generated (scripts/generate-module-tests.mjs --school=ucla)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 21, 7:00 PM Men's · UCLA vs Cal Baptist (Exhibition) | ",
 "Upcoming Oct 27, 7:00 PM Men's · UCLA vs San Diego (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · UCLA vs Arizona | ",
 "Upcoming Nov 6, 7:30 PM Men's · UCLA vs North Florida | ",
 "Upcoming Nov 11, 6:00 PM Men's · UCLA vs TBD | ",
 "Upcoming Nov 16, 7:00 PM Men's · UCLA vs Long Beach State | ",
 "Upcoming Nov 18, 7:30 PM Men's · UCLA vs Cal State Fullerton | ",
 "Upcoming Nov 22, 4:00 PM Men's · UCLA vs Delaware | ",
 "Upcoming Nov 26, 2:00 PM Men's · UCLA vs Saint Mary's | ",
 "Upcoming Nov 27 Men's · UCLA vs Georgetown or Texas | ",
 "Upcoming Dec 1, 7:00 PM Men's · UCLA vs Oregon | ",
 "Upcoming Dec 5, 8:30 PM Men's · UCLA vs Gonzaga | ",
 "Upcoming Dec 13, 5:00 PM Men's · UCLA at Washington | ",
 "Upcoming Dec 19, 1:30 PM Men's · UCLA vs Quinnipiac | ",
 "Upcoming Dec 22, 1:00 PM Men's · UCLA vs UC Riverside | ",
 "Upcoming Dec 29, 7:00 PM Men's · UCLA vs San Diego State | ",
 "Upcoming Jan 2, 3:00 PM Men's · UCLA at Maryland | ",
 "Upcoming Jan 5, 3:00 PM Men's · UCLA at Rutgers | ",
 "Upcoming Jan 9, 5:00 PM Men's · UCLA vs Michigan State | ",
 "Upcoming Jan 16, 12:00 PM Men's · UCLA vs Washington | ",
 "Upcoming Jan 19, 7:30 PM Men's · UCLA vs Wisconsin | ",
 "Upcoming Jan 22, 6:00 PM Men's · UCLA at Nebraska | ",
 "Upcoming Jan 26, 7:00 PM Men's · UCLA vs Michigan | ",
 "Upcoming Jan 30, 9:00 AM Men's · UCLA at Indiana | ",
 "Upcoming Feb 2, 6:00 PM Men's · UCLA at Illinois | ",
 "Upcoming Feb 6 Men's · UCLA vs Iowa | ",
 "Upcoming Feb 9, 7:00 PM Men's · UCLA vs Minnesota | ",
 "Upcoming Feb 13, 2:30 PM Men's · UCLA at USC | ",
 "Upcoming Feb 17, 8:00 PM Men's · UCLA vs Ohio State | ",
 "Upcoming Feb 21, 10:00 AM Men's · UCLA at Purdue | ",
 "Upcoming Feb 24, 5:30 PM Men's · UCLA at Northwestern | ",
 "Upcoming Feb 27, 7:30 PM Men's · UCLA vs Penn State | ",
 "Upcoming Mar 3, 7:30 PM Men's · UCLA at Oregon | ",
 "Upcoming Mar 6, 2:30 PM Men's · UCLA vs USC | ",
 "Upcoming Mar 9 Men's · UCLA at Big Ten Tournament | ",
 "Upcoming Mar 10 Men's · UCLA at Big Ten Tournament | ",
 "Upcoming Mar 11 Men's · UCLA at Big Ten Tournament | ",
 "Upcoming Mar 12 Men's · UCLA at Big Ten Tournament | ",
 "Upcoming Mar 13 Men's · UCLA at Big Ten Tournament | ",
 "Upcoming Mar 14 Men's · UCLA at Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Today Oct 14, 6:00 PM Women's · UCLA at Cal (Exhibition) | ",
 "Upcoming Oct 25, 11:00 AM Women's · UCLA at Texas (Exhibition) | ",
 "Upcoming Nov 2, 11:30 AM Women's · UCLA vs Lehigh | ",
 "Upcoming Nov 5, 7:00 PM Women's · UCLA vs UC Irvine | ",
 "Upcoming Nov 12, 7:30 PM Women's · UCLA vs Arizona | ",
 "Upcoming Nov 15, 3:00 PM Women's · UCLA vs Princeton | ",
 "Upcoming Nov 19, 7:00 PM Women's · UCLA vs Cal Poly | ",
 "Upcoming Nov 22, 2:30 PM Women's · UCLA at Tennessee | ",
 "Upcoming Nov 24, 2:00 PM Women's · UCLA vs St. John's | ",
 "Upcoming Nov 29, 2:00 PM Women's · UCLA vs Penn | ",
 "Upcoming Dec 6, 3:00 PM Women's · UCLA at Oregon | ",
 "Upcoming Dec 11, 7:00 PM Women's · UCLA vs CSU Bakersfield | ",
 "Upcoming Dec 16, 4:00 PM Women's · UCLA vs Duke | ",
 "Upcoming Dec 19, 5:30 PM Women's · UCLA vs South Carolina | ",
 "Upcoming Dec 20, 2:00 PM Women's · UCLA vs Texas | ",
 "Upcoming Dec 30, 6:00 PM Women's · UCLA vs Northwestern | ",
 "Upcoming Jan 2, 5:00 PM Women's · UCLA vs Nebraska | ",
 "Upcoming Jan 5, 4:00 PM Women's · UCLA at Purdue | ",
 "Upcoming Jan 8, 3:00 PM Women's · UCLA at Indiana | ",
 "Upcoming Jan 12, 7:30 PM Women's · UCLA vs Minnesota | ",
 "Upcoming Jan 15, 7:00 PM Women's · UCLA vs Penn State | ",
 "Upcoming Jan 18, 9:00 AM Women's · UCLA vs Oklahoma | ",
 "Upcoming Jan 21 Women's · UCLA at Rutgers | ",
 "Upcoming Jan 24, 9:00 AM Women's · UCLA at Maryland | ",
 "Upcoming Jan 30, 12:00 PM Women's · UCLA vs Illinois | ",
 "Upcoming Feb 2, 7:00 PM Women's · UCLA vs Michigan | ",
 "Upcoming Feb 7, 5:00 PM Women's · UCLA vs USC | ",
 "Upcoming Feb 11, 6:00 PM Women's · UCLA at Wisconsin | ",
 "Upcoming Feb 14, 11:00 AM Women's · UCLA at Iowa | ",
 "Upcoming Feb 18, 7:30 PM Women's · UCLA vs Ohio State | ",
 "Upcoming Feb 21, 12:00 PM Women's · UCLA vs Michigan State | ",
 "Upcoming Feb 25, 6:30 PM Women's · UCLA at USC | ",
 "Upcoming Feb 28, 11:00 AM Women's · UCLA at Washington | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 UCLA at UC Riverside | Completed",
 "Final Sep 18 UCLA at Saint Mary's | Completed",
 "Final Oct 9 UCLA at Nuttycombe Invite | Completed",
 "Upcoming Oct 17, 8:00 AM UCLA at Highlander Invitational | ",
 "Upcoming Oct 30 UCLA at Big Ten Championship | ",
 "Upcoming Nov 13 UCLA at NCAA Regional | ",
 "Upcoming Nov 21 UCLA at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 UCLA at California | W, 45-24",
 "Final Sep 12 UCLA vs San Diego State | W, 28-10",
 "Final Sep 19 UCLA vs Purdue | W, 52-38",
 "Final Sep 26 UCLA at Maryland | W, 54-3",
 "Final Oct 10 UCLA at Oregon | W, 17-15",
 "Upcoming Oct 17, 4:30 PM UCLA vs Wisconsin | ",
 "Upcoming Oct 24 UCLA vs Michigan State | ",
 "Upcoming Oct 31 UCLA vs Nevada | ",
 "Upcoming Nov 7 UCLA at Minnesota | ",
 "Upcoming Nov 13, 6:00 PM UCLA vs Illinois | ",
 "Upcoming Nov 21 UCLA at Michigan | ",
 "Upcoming Nov 28 UCLA vs USC | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · UCLA at ANNIKA Intercollegiate | T6th of 12",
 "Final Sep 21 Women's · UCLA at Canadian Collegiate Invitational | 3rd of 11",
 "Upcoming Oct 16 Women's · UCLA at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · UCLA at Nanea Invitational | ",
 "Upcoming Jan 22 Women's · UCLA at Battle of LA | ",
 "Upcoming Jan 31 Women's · UCLA at Therese Hession Regional Challenge | ",
 "Upcoming Feb 22 Women's · UCLA at Bruin Wave Invitational | ",
 "Upcoming Mar 11 Women's · UCLA at Nanea Cup | ",
 "Upcoming Mar 22 Women's · UCLA at PING/ASU Invitational | ",
 "Upcoming Apr 5 Women's · UCLA at Silverado Showdown | ",
 "Upcoming Apr 23 Women's · UCLA at Big Ten Championships | ",
 "Upcoming May 10 Women's · UCLA at NCAA Regionals | ",
 "Upcoming May 21 Women's · UCLA at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · UCLA at Sahalee Players Championship | 8th",
 "Final Sep 28 Men's · UCLA at Ben Hogan Collegiate Invitational | T8th",
 "Final Oct 4 Men's · UCLA at Fighting Irish Classic | 9th",
 "Upcoming Oct 16 Men's · UCLA at Golf Club of Georgia Collegiate Invitational | ",
 "Upcoming Oct 26 Men's · UCLA at East Lake Cup | ",
 "Upcoming Jan 25 Men's · UCLA at Southwestern Invitational | ",
 "Upcoming Feb 4 Men's · UCLA at Amer Ari Intercollegiate | ",
 "Upcoming Feb 28 Men's · UCLA at Las Vegas Collegiate | ",
 "Upcoming Mar 8 Men's · UCLA at The Desimone Invitational | ",
 "Upcoming Mar 22 Men's · UCLA at Bruin Invitational | ",
 "Upcoming Apr 5 Men's · UCLA at USC Golfweek Intercollegiate | ",
 "Upcoming Apr 16 Men's · UCLA at The Thunderbird Collegiate | ",
 "Upcoming Apr 30 Men's · UCLA at Big Ten Championships | ",
 "Upcoming May 17 Men's · UCLA at NCAA Regionals | ",
 "Upcoming May 28 Men's · UCLA at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · UCLA vs BYU | L, 1-2",
 "Final Aug 16 Women's · UCLA vs Duke | T, 1-1",
 "Final Aug 20 Women's · UCLA vs San Diego | W, 2-0",
 "Final Aug 27 Women's · UCLA at Stanford | L, 0-3",
 "Final Aug 30 Women's · UCLA at Santa Clara | W, 3-2",
 "Final Sep 4 Women's · UCLA vs Pepperdine | W, 3-0",
 "Final Sep 10 Women's · UCLA vs Purdue | W, 2-1",
 "Final Sep 13 Women's · UCLA vs Michigan State | L, 0-1",
 "Final Sep 17 Women's · UCLA vs Ohio State | W, 1-0",
 "Final Sep 24 Women's · UCLA at Rutgers | W, 1-0",
 "Final Sep 27 Women's · UCLA at Maryland | W, 2-0",
 "Final Oct 2 Women's · UCLA at Oregon | W, 1-0",
 "Final Oct 8 Women's · UCLA vs Indiana | W, 5-0",
 "Final Oct 11 Women's · UCLA vs Illinois | W, 2-1",
 "Upcoming Oct 16, 8:00 PM Women's · UCLA vs Washington | ",
 "Upcoming Oct 22, 5:00 PM Women's · UCLA at Iowa | ",
 "Upcoming Oct 25, 11:00 AM Women's · UCLA at Nebraska | ",
 "Upcoming Oct 30, 7:00 PM Women's · UCLA at USC | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · UCLA at Virginia | W, 2-1",
 "Final Aug 24 Men's · UCLA vs CSU Bakersfield | T, 1-1",
 "Final Aug 28 Men's · UCLA vs Denver | W, 3-0",
 "Final Sep 1 Men's · UCLA at Cal | T, 2-2",
 "Final Sep 6 Men's · UCLA vs Omaha | W, 2-1",
 "Final Sep 11 Men's · UCLA at Rutgers | L, 1-3",
 "Final Sep 18 Men's · UCLA vs Michigan | T, 1-1",
 "Final Sep 25 Men's · UCLA at Maryland | T, 2-2",
 "Final Sep 28 Men's · UCLA at Penn State | W, 4-2",
 "Final Oct 3 Men's · UCLA vs Michigan State | W, 3-0",
 "Final Oct 6 Men's · UCLA vs Westmont | W, 5-1",
 "Final Oct 10 Men's · UCLA vs Ohio State | W, 2-1",
 "Upcoming Oct 16, 5:00 PM Men's · UCLA at Wisconsin | ",
 "Upcoming Oct 19, 4:00 PM Men's · UCLA at Northwestern | ",
 "Upcoming Oct 25, 6:00 PM Men's · UCLA vs San Diego | ",
 "Upcoming Oct 30, 7:00 PM Men's · UCLA vs Indiana | ",
 "Upcoming Nov 4 Men's · UCLA vs Washington | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 23, 1:00 PM UCLA at Iowa, Purdue | ",
 "Upcoming Nov 6 UCLA at USC, Arizona State, Arizona | ",
 "Upcoming Nov 12 UCLA at Trojan Diving Invite | ",
 "Upcoming Nov 17 UCLA at Ohio State Invite | ",
 "Upcoming Dec 2 UCLA at Toyota US Open Championships | ",
 "Upcoming Dec 9 UCLA at 2026 USA Diving Winter National Championships | ",
 "Upcoming Jan 8 UCLA at Bruin Diving Invite | ",
 "Upcoming Jan 9 UCLA at UC San Diego, Cal Baptist | ",
 "Upcoming Jan 14 UCLA at Cal | ",
 "Upcoming Jan 15 UCLA at Stanford | ",
 "Upcoming Jan 23 UCLA vs Pepperdine | ",
 "Upcoming Feb 5, 1:00 PM UCLA vs USC | ",
 "Upcoming Feb 17 UCLA at Big Ten Championships | ",
 "Upcoming Mar 6 UCLA at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 17 UCLA at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · UCLA at ITA All-American Championships | Completed",
 "Final Sep 24 Women's · UCLA at USTA SoCal Intercollegiate Championships | Completed",
 "Upcoming Oct 15 Women's · UCLA at ITA Regional Championships | ",
 "Upcoming Oct 30 Women's · UCLA at Dennis Rizza Intercollegiate Classic at Jack Kramer Club | ",
 "Upcoming Nov 5 Women's · UCLA at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Women's · UCLA at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · UCLA at NCAA Singles & Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · UCLA at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · UCLA at Sherwood Collegiate Cup | Completed",
 "Final Oct 9 Men's · UCLA at UC Santa Barbara Fall Classic | Completed",
 "Upcoming Oct 15 Men's · UCLA at ITA Regional Championships | ",
 "Upcoming Oct 30 Men's · UCLA at Dennis Rizza Intercollegiate Classic at Jack Kramer Club | ",
 "Upcoming Nov 5 Men's · UCLA at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · UCLA at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Men's · UCLA at NCAA Singles & Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 UCLA at Long Beach State | W, 3-1",
 "Final Aug 29 UCLA vs Long Beach State | W, 3-0",
 "Final Sep 2 UCLA at Kentucky | L, 0-3",
 "Final Sep 4 UCLA at Miami | W, 3-0",
 "Final Sep 5 UCLA at Miami | W, 3-0",
 "Final Sep 9 UCLA at Utah State | W, 3-0",
 "Final Sep 11 UCLA at BYU | L, 2-3",
 "Final Sep 13 UCLA at Utah | W, 3-1",
 "Final Sep 18 UCLA vs Iowa State | W, 3-0",
 "Final Sep 19 UCLA vs Texas A&M-Corpus Christi | W, 3-0",
 "Final Sep 20 UCLA vs Hawai'i | W, 3-2",
 "Final Sep 24 UCLA at Indiana | L, 0-3",
 "Final Sep 26 UCLA at Northwestern | W, 3-0",
 "Final Oct 2 UCLA vs Michigan State | L, 0-3",
 "Final Oct 3 UCLA vs Michigan | W, 3-0",
 "Final Oct 9 UCLA at Maryland | W, 3-2",
 "Final Oct 10 UCLA at Rutgers | W, 3-1",
 "Upcoming Oct 16, 7:00 PM UCLA vs Penn State | ",
 "Upcoming Oct 18, 3:00 PM UCLA vs Ohio State | ",
 "Upcoming Oct 22, 4:00 PM UCLA at Nebraska | ",
 "Upcoming Oct 24, 4:00 PM UCLA at Iowa | ",
 "Upcoming Oct 30, 7:00 PM UCLA vs Minnesota | ",
 "Upcoming Nov 1, 2:00 PM UCLA vs Wisconsin | ",
 "Upcoming Nov 5, 5:00 PM UCLA at Illinois | ",
 "Upcoming Nov 7, 5:00 PM UCLA at Purdue | ",
 "Upcoming Nov 12, 11:00 AM UCLA vs Washington | ",
 "Upcoming Nov 14, 2:00 PM UCLA vs Oregon | ",
 "Upcoming Nov 17, 7:30 PM UCLA vs USC | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Men's · UCLA vs Saint Mary's | W, 23-5",
 "Final Aug 29 Men's · UCLA vs Bucknell | W, 23-8",
 "Final Sep 4 Men's · UCLA at Pacific | W, 13-11",
 "Final Sep 5 Men's · UCLA at UC Davis | W, 14-10",
 "Final Sep 5 Men's · UCLA vs Santa Clara | W, 13-8",
 "Final Sep 11 Men's · UCLA at UC Irvine | W, 16-14",
 "Final Sep 12 Men's · UCLA vs UC Santa Barbara | W, 13-9",
 "Final Sep 12 Men's · UCLA vs LMU | W, 24-12",
 "Final Sep 18 Men's · UCLA vs Claremont-Mudd-Scripps | W, 23-4",
 "Final Sep 19 Men's · UCLA vs UC San Diego | W, 16-8",
 "Final Sep 19 Men's · UCLA vs California | W, 11-10",
 "Final Sep 20 Men's · UCLA at Stanford | W, 11-10",
 "Final Sep 25 Men's · UCLA vs Fordham | W, 16-11",
 "Final Sep 26 Men's · UCLA at Pepperdine | W, 16-11",
 "Final Oct 3 Men's · UCLA vs Stanford | L, 15-19",
 "Final Oct 4 Men's · UCLA vs California | W, 13-11",
 "Final Oct 10 Men's · UCLA vs California Baptist | W, 21-9",
 "Upcoming Oct 17, 1:00 PM Men's · UCLA at USC | ",
 "Upcoming Oct 31, 1:00 PM Men's · UCLA at California | ",
 "Upcoming Nov 1, 1:00 PM Men's · UCLA at Stanford | ",
 "Upcoming Nov 7, 1:00 PM Men's · UCLA vs UC San Diego | ",
 "Upcoming Nov 14, 1:00 PM Men's · UCLA vs USC | ",
 "Upcoming Nov 20 Men's · UCLA at MPSF Championship Tournament | ",
 "Upcoming Nov 21 Men's · UCLA at MPSF Championship Tournament | ",
 "Upcoming Nov 22 Men's · UCLA at MPSF Championship Tournament | ",
 "Upcoming Dec 4 Men's · UCLA at NCAA Championship | ",
 "Upcoming Dec 5 Men's · UCLA at NCAA Championship | ",
 "Upcoming Dec 6 Men's · UCLA at NCAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: TFRRS for both teams; the UCR/UCLA Dual is dated Sep 3 on
// TFRRS and Sep 4 on the card (individual results only: no team scores).
{
  fromTfrrs(UCLA_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["UC Riverside","Women's: Gwenyth Meyers 4th / Men's: Josiah Bowman 5th",true],["Saint Mary's","Women's team: 5th · 142 pts / Men's team: 7th · 140 pts",true],["Nuttycombe Invite","Women's team: 27th · 627 pts / Men's team: 22nd · 559 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Golf: the card's place, (field,) score to par and team score.
assert.deepEqual(['8th (+33, 897)','T-8th (+22, 862)','3rd/11 (+27, 891)','T-6th/12 (+3, 867)'].map(text=>uclaGolfCardPlace(text)?.results.map(r=>r.value).join(' · ')),["8th · 897","T8th · 862","3rd of 11 · 891","T6th of 12 · 867"]);

// Records equal the published ones: football 5-0 (3-0), volleyball 13-4
// (4-2), women's soccer 10-3-1 (7-1), men's soccer 7-1-4 (3-1-2). Men's water
// polo publishes MPSF 1-1; the cards name no league, so no conference
// record is shown for it.
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Water Polo','mens-water-polo']].map(([sport,slug])=>records(sport,slug)),[["5-0","3-0"],["13-4","4-2"],["10-3-1","7-1"],["7-1-4","3-1-2"],["16-1",null]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('UCLA module checks passed');
