import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {marylandSchool} from '../src/schools/maryland.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='maryland');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,marylandHandlers,attachOfficialMeetResults,decodeHtml,schoolModule};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/maryland-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit umterps.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['maryland'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',marylandSchool.scheduleUrls],['roster',marylandSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('maryland|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'umterps.com',`${key} must stay on umterps.com`);
  }
}
const parity={"Baseball":{"schedule":["https://umterps.com/sports/baseball/schedule"],"roster":["https://umterps.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://umterps.com/sports/mens-basketball/schedule","https://umterps.com/sports/womens-basketball/schedule"],"roster":["https://umterps.com/sports/mens-basketball/roster","https://umterps.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://umterps.com/sports/womens-cross-country/schedule"],"roster":["https://umterps.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://umterps.com/sports/field-hockey/schedule"],"roster":["https://umterps.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://umterps.com/sports/football/schedule"],"roster":["https://umterps.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://umterps.com/sports/womens-golf/schedule","https://umterps.com/sports/mens-golf/schedule"],"roster":["https://umterps.com/sports/womens-golf/roster","https://umterps.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://umterps.com/sports/womens-gymnastics/schedule"],"roster":["https://umterps.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://umterps.com/sports/womens-lacrosse/schedule","https://umterps.com/sports/mens-lacrosse/schedule"],"roster":["https://umterps.com/sports/womens-lacrosse/roster","https://umterps.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://umterps.com/sports/womens-soccer/schedule","https://umterps.com/sports/mens-soccer/schedule"],"roster":["https://umterps.com/sports/womens-soccer/roster","https://umterps.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://umterps.com/sports/softball/schedule"],"roster":["https://umterps.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://umterps.com/sports/womens-tennis/schedule"],"roster":["https://umterps.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://umterps.com/sports/track-and-field/schedule"],"roster":["https://umterps.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://umterps.com/sports/womens-volleyball/schedule"],"roster":["https://umterps.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://umterps.com/sports/wrestling/schedule"],"roster":["https://umterps.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'maryland|"+sport+"':"),`${sport} routes must live in the Maryland module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://umterps.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.marylandHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=maryland)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 10 Maryland vs Towson | ",
 "Upcoming Oct 18 Maryland vs Georgetown | ",
 "Upcoming Oct 24 Maryland at St. John's | ",
 "Upcoming Nov 8 Maryland vs Navy | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 11, 4:30 PM Men's · Maryland vs Georgia Tech (Exhibition) | ",
 "Upcoming Oct 18, 3:00 PM Men's · Maryland vs West Virginia (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Maryland vs Bucknell | ",
 "Upcoming Nov 7, 7:30 PM Men's · Maryland at Georgetown | ",
 "Upcoming Nov 13, 8:00 PM Men's · Maryland vs Virginia | ",
 "Upcoming Nov 16, 6:00 PM Men's · Maryland vs Alcorn State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Maryland vs Wagner | ",
 "Upcoming Nov 24, 3:00 PM Men's · Maryland vs Tennessee | ",
 "Upcoming Nov 26 Men's · Maryland vs Iowa State/San Diego State | ",
 "Upcoming Nov 27 Men's · Maryland at Players Era Championship Tournament | ",
 "Upcoming Dec 2, 7:00 PM Men's · Maryland vs American | ",
 "Upcoming Dec 6, 12:00 PM Men's · Maryland at Ohio State | ",
 "Upcoming Dec 9, 8:30 PM Men's · Maryland vs Michigan State | ",
 "Upcoming Dec 15, 8:00 PM Men's · Maryland vs Morgan State | ",
 "Upcoming Dec 19, 1:00 PM Men's · Maryland vs South Carolina | ",
 "Upcoming Dec 29, 6:30 PM Men's · Maryland vs Radford | ",
 "Upcoming Jan 2, 6:00 PM Men's · Maryland vs UCLA | ",
 "Upcoming Jan 5, 8:00 PM Men's · Maryland vs USC | ",
 "Upcoming Jan 9, 6:00 PM Men's · Maryland at Iowa | ",
 "Upcoming Jan 12, 6:00 PM Men's · Maryland at Indiana | ",
 "Upcoming Jan 16, 2:00 PM Men's · Maryland vs Illinois | ",
 "Upcoming Jan 19, 7:00 PM Men's · Maryland vs Rutgers | ",
 "Upcoming Jan 23, 12:00 PM Men's · Maryland at Purdue | ",
 "Upcoming Jan 26, 7:00 PM Men's · Maryland vs Wisconsin | ",
 "Upcoming Jan 30, 12:00 PM Men's · Maryland at Penn State | ",
 "Upcoming Feb 2, 7:00 PM Men's · Maryland at Michigan State | ",
 "Upcoming Feb 9, 6:30 PM Men's · Maryland vs Nebraska | ",
 "Upcoming Feb 13, 12:00 PM Men's · Maryland vs Indiana | ",
 "Upcoming Feb 17, 9:00 PM Men's · Maryland at Oregon | ",
 "Upcoming Feb 20, 5:00 PM Men's · Maryland at Washington | ",
 "Upcoming Feb 24, 6:30 PM Men's · Maryland vs Minnesota | ",
 "Upcoming Feb 28, 5:00 PM Men's · Maryland at Rutgers | ",
 "Upcoming Mar 4, 6:30 PM Men's · Maryland at Michigan | ",
 "Upcoming Mar 7, 1:00 PM Men's · Maryland vs Northwestern | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 19, 6:00 PM Women's · Maryland vs Virginia Tech (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Women's · Maryland vs North Carolina (Exhibition) | ",
 "Upcoming Nov 2, 12:00 PM Women's · Maryland vs South Carolina | ",
 "Upcoming Nov 8, 1:00 PM Women's · Maryland vs George Mason | ",
 "Upcoming Nov 15, 1:00 PM Women's · Maryland vs Columbia | ",
 "Upcoming Nov 18, 6:00 PM Women's · Maryland vs Coppin State | ",
 "Upcoming Nov 21, 12:00 PM Women's · Maryland vs Morgan State | ",
 "Upcoming Nov 24, 7:00 PM Women's · Maryland vs Monmouth | ",
 "Upcoming Nov 28 Women's · Maryland at Towson | ",
 "Upcoming Dec 1, 6:30 PM Women's · Maryland vs Ball State | ",
 "Upcoming Dec 5, 4:30 PM Women's · Maryland vs Connecticut | ",
 "Upcoming Dec 7, 7:00 PM Women's · Maryland vs Lehigh | ",
 "Upcoming Dec 11, 7:00 PM Women's · Maryland vs Michigan | ",
 "Upcoming Dec 13, 12:00 PM Women's · Maryland vs Mount St. Mary's | ",
 "Upcoming Dec 18, 11:00 AM Women's · Maryland vs UMBC | ",
 "Upcoming Dec 30, 4:00 PM Women's · Maryland vs Minnesota | ",
 "Upcoming Jan 2, 4:00 PM Women's · Maryland at Ohio State | ",
 "Upcoming Jan 5, 7:00 PM Women's · Maryland at Indiana | ",
 "Upcoming Jan 8, 8:00 PM Women's · Maryland vs USC | ",
 "Upcoming Jan 14, 9:00 PM Women's · Maryland at Washington | ",
 "Upcoming Jan 17 Women's · Maryland at Oregon | ",
 "Upcoming Jan 21, 7:00 PM Women's · Maryland vs Ohio State | ",
 "Upcoming Jan 24, 12:00 PM Women's · Maryland vs UCLA | ",
 "Upcoming Jan 28, 7:00 PM Women's · Maryland at Wisconsin | ",
 "Upcoming Feb 1, 7:00 PM Women's · Maryland vs Michigan State | ",
 "Upcoming Feb 4, 6:00 PM Women's · Maryland at Purdue | ",
 "Upcoming Feb 7 Women's · Maryland at Penn State | ",
 "Upcoming Feb 14, 12:00 PM Women's · Maryland vs Nebraska | ",
 "Upcoming Feb 17, 7:00 PM Women's · Maryland vs Illinois | ",
 "Upcoming Feb 21, 1:00 PM Women's · Maryland at Northwestern | ",
 "Upcoming Feb 25, 7:30 PM Women's · Maryland at Iowa | ",
 "Upcoming Feb 28, 12:00 PM Women's · Maryland vs Rutgers | ",
 "Upcoming Mar 3 Women's · Maryland at Big Ten Tournament | ",
 "Upcoming Mar 17 Women's · Maryland at NCAA First and Second Rounds | ",
 "Upcoming Mar 26 Women's · Maryland at NCAA Regionals | ",
 "Upcoming Apr 2 Women's · Maryland at NCAA Final Four | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Maryland at Delaware Invitational | 1st of 11",
 "Final Sep 11 Maryland at Spiked Shoe Invitational | 5th of 9",
 "Final Oct 2 Maryland at Paul Short Invitational | Completed",
 "Upcoming Oct 16, 9:30 AM Maryland at Panorama Farms Invitational | ",
 "Upcoming Oct 30, 11:45 AM Maryland at Big Ten Championships | ",
 "Upcoming Nov 13 Maryland at NCAA Mid-Atlantic Regional Championship | ",
 "Upcoming Nov 21 Maryland at NCAA National Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Maryland vs Drexel | W, 3-0",
 "Final Aug 30 Maryland vs Temple | W, 3-1",
 "Final Sep 4 Maryland at Boston College | W, 2-0",
 "Final Sep 6 Maryland vs Duke | W, 3-2",
 "Final Sep 11 Maryland vs Towson | W, 6-0",
 "Final Sep 13 Maryland vs Saint Joseph's | W, 5-0",
 "Final Sep 17 Maryland at Penn State | W, 4-1",
 "Final Sep 20 Maryland vs Wake Forest | W, 1-0",
 "Final Sep 25 Maryland vs Rutgers | W, 3-0",
 "Final Sep 29 Maryland at Princeton | W, 4-3",
 "Final Oct 4 Maryland vs Delaware | W, 4-1",
 "Today Oct 9, 4:00 PM Maryland at Michigan | ",
 "Upcoming Oct 16, 4:00 PM Maryland vs Michigan State | ",
 "Upcoming Oct 18, 12:00 PM Maryland vs Ohio State | ",
 "Upcoming Oct 22, 8:00 PM Maryland at Northwestern | ",
 "Upcoming Oct 25, 12:00 PM Maryland at Indiana | ",
 "Upcoming Oct 30, 1:00 PM Maryland vs Iowa | ",
 "Upcoming Nov 4 Maryland at Big Ten Tournament | ",
 "Upcoming Nov 13 Maryland at NCAA First and Second Rounds | ",
 "Upcoming Nov 20 Maryland at NCAA Semifinals and Finals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Maryland vs Hampton | W, 62-0",
 "Final Sep 12 Maryland at UConn | W, 38-14",
 "Final Sep 19 Maryland vs Virginia Tech | L, 26-35",
 "Final Sep 26 Maryland vs UCLA | L, 3-54",
 "Final Oct 3 Maryland at Nebraska | L, 23-48",
 "Upcoming Oct 10, 4:15 PM Maryland at Ohio State | ",
 "Upcoming Oct 17, 12:30 PM Maryland vs Rutgers | ",
 "Upcoming Oct 31 Maryland vs Illinois | ",
 "Upcoming Nov 7 Maryland at Purdue | ",
 "Upcoming Nov 14 Maryland vs Wisconsin | ",
 "Upcoming Nov 21 Maryland at USC | ",
 "Upcoming Nov 28 Maryland vs Penn State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Maryland at Nittany Lion Invitational | 2nd of 18",
 "Final Sep 21 Women's · Maryland at Canadian Collegiate | 6th of 11",
 "Final Sep 26 Women's · Maryland at Navy | Completed",
 "Upcoming Oct 12 Women's · Maryland at Illini Invitational | ",
 "Upcoming Oct 26 Women's · Maryland at UNC Asheville Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Maryland at Bearcat Invitational | T7th of 17",
 "Final Sep 21 Men's · Maryland at Chicago Highland Invitational | T5th of 12",
 "Final Oct 5 Men's · Maryland at Testudo Cup | 1st of 14",
 "Upcoming Oct 18 Men's · Maryland at Quail Valley Collegiate | ",
 "Upcoming Oct 31 Men's · Maryland at Steelwood Intercollegiate | ",
 "Upcoming Feb 22 Men's · Maryland at Wyoming Desert Collegiate | ",
 "Upcoming Mar 15 Men's · Maryland at Johnnie-O Invitational | ",
 "Upcoming Mar 19 Men's · Maryland at The Schenkel Invitational | ",
 "Upcoming Apr 12 Men's · Maryland at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 17 Men's · Maryland at Rutgers Invitational | ",
 "Upcoming Apr 30 Men's · Maryland at Big Ten Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24, 12:00 PM Women's · Maryland vs Virginia (Exhibition) | ",
 "Upcoming Oct 24, 1:20 PM Women's · Maryland vs Virginia Tech (Exhibition) | ",
 "Upcoming Oct 25, 10:00 AM Women's · Maryland vs San Diego State (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM Women's · Maryland vs James Madison (Exhibition) | ",
 "Upcoming Oct 25, 3:00 PM Women's · Maryland vs Temple (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Maryland vs Fordham | W, 1-0",
 "Final Aug 20 Women's · Maryland vs FDU | W, 2-1",
 "Final Aug 23 Women's · Maryland at Virginia Tech | T, 2-2",
 "Final Aug 27 Women's · Maryland at Navy | L, 0-2",
 "Final Sep 3 Women's · Maryland vs Old Dominion | L, 0-2",
 "Final Sep 6 Women's · Maryland vs Binghamton | W, 2-1",
 "Final Sep 10 Women's · Maryland at Washington | L, 0-2",
 "Final Sep 13 Women's · Maryland at Oregon | L, 0-1",
 "Final Sep 18 Women's · Maryland vs Penn State | L, 0-2",
 "Final Sep 24 Women's · Maryland vs Wisconsin | L, 0-1",
 "Final Sep 27 Women's · Maryland vs UCLA | L, 0-2",
 "Final Oct 2 Women's · Maryland at Minnesota | L, 0-4",
 "Final Oct 8 Women's · Maryland vs Nebraska | T, 0-0",
 "Upcoming Oct 11, 12:00 PM Women's · Maryland vs Northwestern | ",
 "Upcoming Oct 16, 7:00 PM Women's · Maryland vs Iowa | ",
 "Upcoming Oct 22, 7:00 PM Women's · Maryland at Michigan | ",
 "Upcoming Oct 25, 1:00 PM Women's · Maryland at Michigan State | ",
 "Upcoming Oct 30, 7:00 PM Women's · Maryland at Rutgers | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Maryland at Pittsburgh | W, 2-1",
 "Final Aug 24 Men's · Maryland vs New Haven | W, 3-2",
 "Final Aug 29 Men's · Maryland vs High Point | W, 1-0",
 "Final Sep 4 Men's · Maryland vs Delaware | W, 4-3",
 "Final Sep 7 Men's · Maryland vs Georgetown | W, 3-2",
 "Final Sep 11 Men's · Maryland at Northwestern | L, 0-4",
 "Final Sep 18 Men's · Maryland vs Wisconsin | W, 1-0",
 "Final Sep 25 Men's · Maryland vs UCLA | T, 2-2",
 "Final Oct 2 Men's · Maryland at Indiana | L, 1-3",
 "Final Oct 6 Men's · Maryland at Rutgers | W, 2-1",
 "Today Oct 9, 7:30 PM Men's · Maryland vs Michigan State | ",
 "Upcoming Oct 16, 7:00 PM Men's · Maryland at Michigan | ",
 "Upcoming Oct 20, 7:00 PM Men's · Maryland vs St. John's | ",
 "Upcoming Oct 24, 7:00 PM Men's · Maryland vs Ohio State | ",
 "Upcoming Oct 30, 8:00 PM Men's · Maryland at Washington | ",
 "Upcoming Nov 4, 7:00 PM Men's · Maryland vs Penn State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 10, 12:00 PM Maryland vs Frostburg State (Exhibition) (Game 1) | ",
 "Upcoming Oct 10, 2:30 PM Maryland vs Frostburg State (Exhibition) (Game 2) | ",
 "Upcoming Oct 11, 1:00 PM Maryland vs Shepherd (Exhibition) (Game 1) | ",
 "Upcoming Oct 11, 3:30 PM Maryland vs Shepherd (Exhibition) (Game 2) | ",
 "Upcoming Oct 17, 2:00 PM Maryland vs Virginia (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Maryland at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 18 Maryland at Bill & Sandra Moore Invitational | Completed",
 "Final Sep 19 Maryland at ITA All American Championships | Completed",
 "Final Oct 2 Maryland at 49er Invite | Completed",
 "Upcoming Oct 15 Maryland at ITA Regionals | ",
 "Upcoming Nov 5 Maryland at ITA Sectionals Championship | ",
 "Upcoming Nov 6 Maryland at UNF Fall Invite | ",
 "Upcoming Nov 17 Maryland at NCAA Singles and Doubles Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Maryland at Howard | W, 3-0",
 "Final Sep 1 Maryland at Vanderbilt | L, 0-3",
 "Final Sep 2 Maryland vs Arkansas | W, 3-1",
 "Final Sep 6 Maryland vs UMES | W, 3-0",
 "Final Sep 7 Maryland vs George Mason | W, 3-0",
 "Final Sep 11 Maryland vs Seton Hall | W, 3-0",
 "Final Sep 12 Maryland vs Princeton | W, 3-0",
 "Final Sep 13 Maryland vs Saint Peter's | W, 3-0",
 "Final Sep 17 Maryland vs Campbell | W, 3-0",
 "Final Sep 18 Maryland at East Carolina | W, 3-0",
 "Final Sep 19 Maryland vs Old Dominion | W, 3-0",
 "Final Sep 24 Maryland at Purdue | L, 0-3",
 "Final Sep 26 Maryland at Indiana | L, 0-3",
 "Final Oct 1 Maryland vs Iowa | W, 3-2",
 "Final Oct 3 Maryland vs Nebraska | L, 0-3",
 "Today Oct 9, 6:30 PM Maryland vs UCLA | ",
 "Upcoming Oct 10, 7:00 PM Maryland vs Northwestern | ",
 "Upcoming Oct 16, 7:00 PM Maryland at Wisconsin | ",
 "Upcoming Oct 17, 7:00 PM Maryland at Minnesota | ",
 "Upcoming Oct 23, 7:00 PM Maryland vs Illinois | ",
 "Upcoming Oct 25, 12:00 PM Maryland vs Michigan State | ",
 "Upcoming Oct 30, 10:00 PM Maryland at Oregon | ",
 "Upcoming Nov 1, 3:00 PM Maryland at Washington | ",
 "Upcoming Nov 5, 7:00 PM Maryland vs USC | ",
 "Upcoming Nov 7, 7:00 PM Maryland vs Michigan | ",
 "Upcoming Nov 11, 7:00 PM Maryland vs Penn State | ",
 "Upcoming Nov 13, 7:00 PM Maryland at Rutgers | ",
 "Upcoming Nov 17, 7:00 PM Maryland at Ohio State | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Jan 10 Maryland at Minnesota | ",
 "Upcoming Jan 15 Maryland vs Michigan State | ",
 "Upcoming Jan 17 Maryland at Penn State | ",
 "Upcoming Jan 22 Maryland vs Nebraska | ",
 "Upcoming Jan 29 Maryland at Purdue | ",
 "Upcoming Jan 31 Maryland at Illinois | ",
 "Upcoming Feb 7 Maryland vs Northwestern | ",
 "Upcoming Feb 12 Maryland vs Rutgers | ",
 "Upcoming Mar 6 Maryland at Big Ten Championships | ",
 "Upcoming Mar 18 Maryland at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
// A sport's /archives page and the saved stories it lists.
const fromArchive=slug=>{
  const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://umterps.com/sports/${slug}/archives`,listing);
  for(const path of new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){
    const [,y,m,d,slug]=path.split('/').slice(1).length&&path.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/(.+)/);
    try{recapFixtures.set(`https://umterps.com${path}`,fixture(`story-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();

// Golf: the place in the field from the page ("2nd of 18", "T-7th of 17").
// A tournament whose card links no story takes the archive story whose
// headline names it ("Terps Finish Second at Nittany Lion Invitational",
// Sep 8), not a later one that names it only in its text ("Terps Trio Named
// to Big Ten Golfers to Watch List", Sep 9). A past event with neither a
// place nor a story (women's golf at Navy, Sep 26) is not listed.
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline]);
  assert.deepEqual(final('womens-golf'),[["Nittany Lion Invitational","2nd of 18"],["Canadian Collegiate","6th of 11"],["Navy","Completed"]]);
  assert.deepEqual(final('mens-golf'),[["Bearcat Invitational","T7th of 17"],["Chicago Highland Invitational","T5th of 12"],["Testudo Cup","1st of 14"]]);
  fromArchive('womens-golf');
  const events=parse('Golf','womens-golf'),nittany=events.find(e=>e.opponent==='Nittany Lion Invitational');
  await worker.marylandHandlers.attachArchiveStory(nittany);
  assert.equal(nittany.recap_url,'https://umterps.com/news/2026/9/8/womens-golf-terps-finish-second-at-nittany-lion-invitational');
  const navy=events.find(e=>e.opponent==='Navy');
  await worker.marylandHandlers.attachArchiveStory(navy);
  assert.equal(navy.recap_url,undefined);
  const listed=await worker.schoolModule('maryland').feed(events,'Golf');
  assert.deepEqual(listed.filter(e=>e.status==='Final').map(e=>e.opponent),['Nittany Lion Invitational','Canadian Collegiate']);
  recapFixtures.clear();requests.length=0;
}

// Cross Country: women only (womens-cross-country), places from TFRRS.
{
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/MD_college_f_Maryland.html'});
  const xc=parse('Cross Country','womens-cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Delaware Invitational","Women's team: 1st · 22 pts",true],["Spiked Shoe Invitational","Women's team: 5th · 124 pts",true],["Paul Short Invitational","Women's team: 17th · 496 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Maryland's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[["Maryland at Nebraska","Final","L, 23-48"]]);
  live('Volleyball','volleyball-espn-2026-10-03.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-04T12:00:00Z'),[["Maryland vs Nebraska","Final","L, 0-3"]]);
  live('Soccer','soccer-espn-2026-10-08.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-09T12:00:00Z'),[["Women's · Maryland vs Nebraska","Final","T, 0-0"]],"Women's");
}

// Records, counted from the finals.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey']].map(([sport,slug])=>records(sport,slug)),[["2-3","0-2"],["11-4","1-3"],["3-8-2","0-6-1"],["7-2-1","2-2-1"],["11-0","2-0"]]);

// Baseball's "Fall WS Game 1-3" are intrasquad games; men's and women's
// pages are labeled.
assert.ok(!parse('Baseball','baseball').some(e=>/Fall WS/.test(e.opponent)));
for(const sport of ['Basketball','Golf','Lacrosse','Soccer'])assert.ok(worker.schoolCombinedSports(school).has(sport),sport);

// Other schools and other hosts never reach the Maryland reader.
assert.equal(worker.marylandHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://umterps.com/',now),null);
assert.equal(worker.marylandHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Maryland module checks passed');
