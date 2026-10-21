import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {creightonSchool} from '../src/schools/creighton.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='creighton');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,creightonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/creighton-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gocreighton.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['creighton'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',creightonSchool.scheduleUrls],['roster',creightonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('creighton|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gocreighton.com',`${key} must stay on gocreighton.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gocreighton.com/sports/baseball/schedule"],"roster":["https://gocreighton.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gocreighton.com/sports/mens-basketball/schedule","https://gocreighton.com/sports/womens-basketball/schedule"],"roster":["https://gocreighton.com/sports/mens-basketball/roster","https://gocreighton.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gocreighton.com/sports/womens-cross-country/schedule","https://gocreighton.com/sports/mens-cross-country/schedule"],"roster":["https://gocreighton.com/sports/womens-cross-country/roster","https://gocreighton.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://gocreighton.com/sports/womens-golf/schedule","https://gocreighton.com/sports/mens-golf/schedule"],"roster":["https://gocreighton.com/sports/womens-golf/roster","https://gocreighton.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://gocreighton.com/sports/womens-rowing/schedule"],"roster":["https://gocreighton.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://gocreighton.com/sports/womens-soccer/schedule","https://gocreighton.com/sports/mens-soccer/schedule"],"roster":["https://gocreighton.com/sports/womens-soccer/roster","https://gocreighton.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gocreighton.com/sports/softball/schedule"],"roster":["https://gocreighton.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gocreighton.com/sports/womens-tennis/schedule","https://gocreighton.com/sports/mens-tennis/schedule"],"roster":["https://gocreighton.com/sports/womens-tennis/roster","https://gocreighton.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://gocreighton.com/sports/womens-volleyball/schedule"],"roster":["https://gocreighton.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'creighton|"+sport+"':"),`${sport} routes must live in the Creighton module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://gocreighton.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.creightonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=creighton)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19 Creighton at UCLA | ",
 "Upcoming Feb 20 Creighton at UCLA | ",
 "Upcoming Feb 21 Creighton at UCLA | ",
 "Upcoming Feb 26, 11:00 AM Creighton vs Illinois State | ",
 "Upcoming Feb 26, 3:00 PM Creighton vs Ball State | ",
 "Upcoming Feb 27, 3:00 PM Creighton vs Ball State | ",
 "Upcoming Feb 28, 10:00 AM Creighton vs Illinois State | ",
 "Upcoming Mar 5 Creighton at UC Davis | ",
 "Upcoming Mar 6 Creighton at UC Davis | ",
 "Upcoming Mar 7 Creighton at UC Davis | ",
 "Upcoming Mar 9 Creighton at Sacramento State | ",
 "Upcoming Mar 10 Creighton at San Francisco State | ",
 "Upcoming Mar 12, 6:00 PM Creighton vs Milwaukee | ",
 "Upcoming Mar 13, 2:00 PM Creighton vs Milwaukee | ",
 "Upcoming Mar 14, 1:00 PM Creighton vs Milwaukee | ",
 "Upcoming Mar 20 Creighton at Stanford | ",
 "Upcoming Mar 21 Creighton at Stanford | ",
 "Upcoming Mar 24 Creighton at Omaha | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Creighton at Iowa State (Exhibition) | W, 83-80",
 "Upcoming Oct 23, 7:30 PM Men's · Creighton vs Minnesota (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Creighton vs Kansas City | ",
 "Upcoming Nov 5, 7:00 PM Men's · Creighton vs Le Moyne | ",
 "Upcoming Nov 10 Men's · Creighton at Kansas State | ",
 "Upcoming Nov 15 Men's · Creighton vs Iowa | ",
 "Upcoming Nov 18, 8:00 PM Men's · Creighton vs Bethune-Cookman | ",
 "Upcoming Nov 24, 4:30 PM Men's · Creighton vs Michigan | ",
 "Upcoming Nov 26 Men's · Creighton vs TCU or Miami (Fla.) | ",
 "Upcoming Nov 27 Men's · Creighton at Players Era 16 | ",
 "Upcoming Nov 28, 9:30 PM Men's · Creighton at Players Era 16 | ",
 "Upcoming Dec 1, 7:00 PM Men's · Creighton vs Oral Roberts | ",
 "Upcoming Dec 5, 12:00 PM Men's · Creighton vs Nebraska | ",
 "Upcoming Dec 12, 9:00 PM Men's · Creighton vs Gonzaga | ",
 "Upcoming Dec 15, 7:00 PM Men's · Creighton vs Mount St. Mary's | ",
 "Upcoming Dec 19, 7:00 PM Men's · Creighton vs Villanova | ",
 "Upcoming Dec 22, 7:30 PM Men's · Creighton at Xavier | ",
 "Upcoming Dec 31, 4:00 PM Men's · Creighton vs Marquette | ",
 "Upcoming Jan 3, 1:00 PM Men's · Creighton vs Connecticut | ",
 "Upcoming Jan 6, 5:00 PM Men's · Creighton at Seton Hall | ",
 "Upcoming Jan 9, 11:00 AM Men's · Creighton at Georgetown | ",
 "Upcoming Jan 13, 8:00 PM Men's · Creighton vs DePaul | ",
 "Upcoming Jan 16, 2:30 PM Men's · Creighton vs St. John's | ",
 "Upcoming Jan 20, 6:00 PM Men's · Creighton at Marquette | ",
 "Upcoming Jan 27, 6:00 PM Men's · Creighton at Villanova | ",
 "Upcoming Jan 30, 2:30 PM Men's · Creighton vs Georgetown | ",
 "Upcoming Feb 3, 8:00 PM Men's · Creighton vs Providence | ",
 "Upcoming Feb 7, 3:30 PM Men's · Creighton at Connecticut | ",
 "Upcoming Feb 10, 5:30 PM Men's · Creighton at St. John's | ",
 "Upcoming Feb 14, 2:00 PM Men's · Creighton vs Seton Hall | ",
 "Upcoming Feb 17, 7:30 PM Men's · Creighton at Butler | ",
 "Upcoming Feb 24, 7:30 PM Men's · Creighton vs Xavier | ",
 "Upcoming Feb 27, 6:00 PM Men's · Creighton at DePaul | ",
 "Upcoming Mar 2, 8:30 PM Men's · Creighton vs Butler | ",
 "Upcoming Mar 6, 7:00 PM Men's · Creighton at Providence | ",
 "Upcoming Mar 10 Men's · Creighton at BIG EAST Tournament First Round | ",
 "Upcoming Mar 11 Men's · Creighton at BIG EAST Tournament Quarterfinals | ",
 "Upcoming Mar 12 Men's · Creighton at BIG EAST Tournament Semifinals | ",
 "Upcoming Mar 13, 5:30 PM Men's · Creighton at BIG EAST Tournament Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 19 Women's · Creighton vs Truman State (Exhibition) | W, 72-61",
 "Upcoming Oct 24, 3:00 PM Women's · Creighton vs Missouri (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Creighton at South Dakota State | ",
 "Upcoming Nov 9, 7:00 PM Women's · Creighton at North Dakota State | ",
 "Upcoming Nov 11, 6:00 PM Women's · Creighton vs South Dakota | ",
 "Upcoming Nov 15, 2:00 PM Women's · Creighton at Northern Iowa | ",
 "Upcoming Nov 18, 6:30 PM Women's · Creighton vs Omaha | ",
 "Upcoming Nov 22, 1:00 PM Women's · Creighton vs Nebraska | ",
 "Upcoming Nov 27, 3:00 PM Women's · Creighton vs Houston | ",
 "Upcoming Nov 29 Women's · Creighton vs Tennessee/Florida Gulf Coast | ",
 "Upcoming Dec 5, 3:30 PM Women's · Creighton vs Drake | ",
 "Upcoming Dec 12, 5:00 PM Women's · Creighton vs Kansas State | ",
 "Upcoming Dec 16, 6:00 PM Women's · Creighton at Connecticut | ",
 "Upcoming Dec 20, 2:00 PM Women's · Creighton at DePaul | ",
 "Upcoming Dec 22, 5:00 PM Women's · Creighton vs Butler | ",
 "Upcoming Dec 30, 12:00 PM Women's · Creighton at Seton Hall | ",
 "Upcoming Jan 2, 1:00 PM Women's · Creighton at Georgetown | ",
 "Upcoming Jan 7, 7:00 PM Women's · Creighton vs Villanova | ",
 "Upcoming Jan 10, 1:00 PM Women's · Creighton vs Connecticut | ",
 "Upcoming Jan 14, 6:30 PM Women's · Creighton vs St. John's | ",
 "Upcoming Jan 17, 12:00 PM Women's · Creighton at Providence | ",
 "Upcoming Jan 20, 6:30 PM Women's · Creighton vs Xavier | ",
 "Upcoming Jan 24, 12:00 PM Women's · Creighton at Butler | ",
 "Upcoming Jan 28, 6:00 PM Women's · Creighton at Marquette | ",
 "Upcoming Jan 31, 1:00 PM Women's · Creighton vs Seton Hall | ",
 "Upcoming Feb 6, 1:00 PM Women's · Creighton vs Georgetown | ",
 "Upcoming Feb 10, 6:30 PM Women's · Creighton vs DePaul | ",
 "Upcoming Feb 14, 10:00 AM Women's · Creighton at St. John's | ",
 "Upcoming Feb 18, 6:30 PM Women's · Creighton vs Providence | ",
 "Upcoming Feb 21, 1:00 PM Women's · Creighton at Villanova | ",
 "Upcoming Feb 24, 5:30 PM Women's · Creighton at Xavier | ",
 "Upcoming Feb 27, 11:30 AM Women's · Creighton vs Marquette | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Creighton at Platte River Rumble \"Gold\" | 2nd of 4",
 "Final Sep 18 Women's · Creighton at Iowa State Invitational | Cancelled",
 "Final Oct 3 Women's · Creighton at Briar Cliff Invite | 1st of 8",
 "Final Oct 16 Women's · Creighton at Platte River Rumble \"Collegiate\" | 3rd of 10",
 "Upcoming Oct 30 Women's · Creighton at BIG EAST Championships | ",
 "Upcoming Nov 13 Women's · Creighton at NCAA Midwest Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Creighton at Platte River Rumble \"Gold\" | 2nd of 5",
 "Final Sep 18 Men's · Creighton at Iowa State Invitational | Cancelled",
 "Final Oct 3 Men's · Creighton at Briar Cliff Invite | 1st of 8",
 "Final Oct 16 Men's · Creighton at Platte River Rumble \"Collegiate\" | 2nd of 7",
 "Upcoming Oct 30 Men's · Creighton at BIG EAST Championships | ",
 "Upcoming Nov 13 Men's · Creighton at NCAA Midwest Regional | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · Creighton at Yellowstone Intercollegiate | 11th of 11",
 "Final Sep 28 Women's · Creighton at Powercat Classic | 9th of 11",
 "Final Oct 5 Women's · Creighton at Marilyn Smith Sunflower Invitational | 12th of 14",
 "Final Oct 12 Women's · Creighton at Big O Classic | 2nd of 7",
 "Upcoming Feb 19 Women's · Creighton at Rio Verde Collegiate | ",
 "Upcoming Mar 8 Women's · Creighton at Babs Steffens Invitational | ",
 "Upcoming Mar 22 Women's · Creighton at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Apr 12 Women's · Creighton at Stampede at the Creek | ",
 "Upcoming Apr 24 Women's · Creighton at BIG EAST Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Creighton at ANF Fall Classic | 9th of 14",
 "Final Sep 14 Men's · Creighton at Wildcat Invitational | 5th of 15",
 "Final Sep 21 Men's · Creighton at Bluejay Invitational | No team score (individuals only)",
 "Final Oct 19 Men's · Creighton at Zach Johnson Invitational | 11th of 13"
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Final Sep 26 Creighton vs Kansas State | W, 1-1",
 "Upcoming Oct 31, 9:00 AM Creighton at Drake | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Creighton at Colorado College | L, 1-3",
 "Final Aug 16 Women's · Creighton at Air Force | L, 1-3",
 "Final Aug 23 Women's · Creighton at Iowa State | T, 0-0",
 "Final Aug 27 Women's · Creighton vs Kansas City | W, 1-0",
 "Final Aug 30 Women's · Creighton vs Missouri | W, 1-0",
 "Final Sep 4 Women's · Creighton vs Northern Colorado | W, 1-0",
 "Final Sep 13 Women's · Creighton vs Gonzaga | L, 0-3",
 "Final Sep 16 Women's · Creighton at Omaha | W, 1-0",
 "Final Sep 26 Women's · Creighton vs Providence | T, 1-1",
 "Final Sep 30 Women's · Creighton vs Villanova | L, 1-2",
 "Final Oct 3 Women's · Creighton at St. John's | T, 0-0",
 "Final Oct 7 Women's · Creighton at Marquette | L, 1-2",
 "Final Oct 10 Women's · Creighton vs Butler | W, 2-1",
 "Final Oct 17 Women's · Creighton at Xavier | L, 0-5",
 "Today Oct 21, 6:00 PM Women's · Creighton vs Connecticut | ",
 "Upcoming Oct 28, 6:00 PM Women's · Creighton at Georgetown | ",
 "Upcoming Oct 31, 12:00 PM Women's · Creighton at Seton Hall | ",
 "Upcoming Nov 7, 1:00 PM Women's · Creighton vs DePaul | ",
 "Upcoming Nov 12 Women's · Creighton at BIG EAST Championships | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 11 Men's · Creighton vs Missouri State (Exhibition) | L, 1-3",
 "Final Aug 15 Men's · Creighton vs Kansas City (Exhibition) | T, 0-0",
 "Final Aug 20 Men's · Creighton vs Florida International | W, 6-2",
 "Final Aug 23 Men's · Creighton vs Drake | T, 1-1",
 "Final Aug 27 Men's · Creighton vs San Francisco | W, 4-2",
 "Final Aug 31 Men's · Creighton at Tulsa | W, 5-0",
 "Final Sep 4 Men's · Creighton vs Gonzaga | W, 2-0",
 "Final Sep 7 Men's · Creighton vs Santa Clara | W, 4-1",
 "Final Sep 10 Men's · Creighton vs Saint Mary's College | T, 3-3",
 "Final Sep 13 Men's · Creighton vs Yale | W, 3-1",
 "Final Sep 18 Men's · Creighton vs Providence | W, 3-0",
 "Final Sep 22 Men's · Creighton at Denver | W, 1-0",
 "Final Sep 26 Men's · Creighton at Marquette | W, 3-2",
 "Final Sep 29 Men's · Creighton at Omaha | W, 4-2",
 "Final Oct 2 Men's · Creighton vs St. John's | T, 1-1",
 "Final Oct 11 Men's · Creighton at Akron | T, 1-1",
 "Final Oct 15 Men's · Creighton at Xavier | T, 1-1",
 "Upcoming Oct 24, 7:00 PM Men's · Creighton vs Butler | ",
 "Upcoming Oct 30, 5:00 PM Men's · Creighton at Georgetown | ",
 "Upcoming Nov 6, 6:00 PM Men's · Creighton vs DePaul | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Creighton at Augustana Invite | Completed",
 "Upcoming Oct 24, 9:00 AM Women's · Creighton at Bluejay/Maverick Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · Creighton at Augustana Invite | Completed",
 "Final Sep 12 Men's · Creighton vs Gustavus Adolphus | W, 7-0",
 "Final Sep 25 Men's · Creighton at Creighton Invite | Completed",
 "Final Sep 27 Men's · Creighton vs Northwest Missouri State | W, 5-0",
 "Final Sep 27 Men's · Creighton vs Washburn | L, 2-5",
 "Final Oct 7 Men's · Creighton at ITA Central Regional (Hosted by Nebraska) | Completed"
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Creighton vs Purdue | W, 3-2",
 "Final Aug 29 Creighton vs Minnesota | L, 0-3",
 "Final Aug 30 Creighton vs USC | W, 3-1",
 "Final Sep 4 Creighton vs Arizona | W, 3-2",
 "Final Sep 5 Creighton vs Pepperdine | W, 3-1",
 "Final Sep 6 Creighton vs Tulsa | L, 2-3",
 "Final Sep 11 Creighton vs Northern Iowa | W, 3-1",
 "Final Sep 12 Creighton vs Louisville | L, 1-3",
 "Final Sep 13 Creighton at Rice | L, 1-3",
 "Final Sep 16 Creighton at Nebraska | L, 0-3",
 "Final Sep 18 Creighton vs Kansas State | L, 1-3",
 "Final Sep 20 Creighton vs Texas A&M | L, 1-3",
 "Final Sep 25 Creighton at Seton Hall | W, 3-0",
 "Final Sep 26 Creighton at St. John's | W, 3-1",
 "Final Oct 2 Creighton vs DePaul | W, 3-1",
 "Final Oct 4 Creighton vs Marquette | L, 2-3",
 "Final Oct 9 Creighton vs Butler | W, 3-0",
 "Final Oct 11 Creighton vs Xavier | W, 3-1",
 "Final Oct 16 Creighton at Villanova | W, 3-1",
 "Final Oct 17 Creighton at Georgetown | L, 2-3",
 "Upcoming Oct 22, 8:00 PM Creighton vs Connecticut | ",
 "Upcoming Oct 23, 6:00 PM Creighton vs Providence | ",
 "Upcoming Oct 29, 6:00 PM Creighton at Marquette | ",
 "Upcoming Oct 30, 7:00 PM Creighton at DePaul | ",
 "Upcoming Nov 7, 2:00 PM Creighton at Xavier | ",
 "Upcoming Nov 8, 12:00 PM Creighton at Butler | ",
 "Upcoming Nov 13, 6:00 PM Creighton vs Georgetown | ",
 "Upcoming Nov 15, 1:00 PM Creighton vs Villanova | ",
 "Upcoming Nov 21 Creighton at BIG EAST Tournament (Semifinals) | ",
 "Upcoming Nov 22 Creighton at BIG EAST Championship (Final) | ",
 "Upcoming Dec 3 Creighton at NCAA First & Second Rounds | ",
 "Upcoming Dec 10 Creighton at NCAA Regionals | ",
 "Upcoming Dec 17 Creighton at NCAA Final Four | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Cross country: each team's page is its own event, read from its own TFRRS
// team page, and keeps only its own team's race (createTeamTfrrsMeetResults,
// Florida State's split made shared; both pages list every meet).
{
  const h=worker.creightonHandlers;
  recapFixtures.set('https://www.tfrrs.org/teams/xc/NE_college_f_Creighton.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/NE_college_m_Creighton.html',fixture('tfrrs-team-m.html.gz'));
  for(const [number,name] of [['28487','Platte_River_Rumble-Gold'],['28172','Briar_Cliff_XC_Invite'],['27693','Platte_River_Rumble_Collegiate_Meet']])for(const url of [`https://www.tfrrs.org/results/xc/${number}/${name}`,`https://www.tfrrs.org/results/xc/${number}/${name}/`])recapFixtures.set(url,fixture(`tfrrs-${number}.html.gz`));
  const rows=[];
  for(const slug of ['womens-cross-country','mens-cross-country'])for(const event of parse('Cross Country',slug).filter(e=>e.status==='Final'&&e.headline!=='Cancelled')){
    if(h.isCrossCountry(event))await h.attachMeetResults(event);
    rows.push([line(event),event.results.map(r=>r.group||r.label).filter((v,i,a)=>a.indexOf(v)===i)]);
  }
  assert.deepEqual(rows,[["Final Sep 4 Women's · Creighton at Platte River Rumble \"Gold\" | Women's team: 2nd · 53 pts",["Women's 5K"]],["Final Oct 3 Women's · Creighton at Briar Cliff Invite | Women's team: 1st · 47 pts",["Women's 6K"]],["Final Oct 16 Women's · Creighton at Platte River Rumble \"Collegiate\" | Women's team: 3rd · 109 pts",["Women's 6K"]],["Final Sep 4 Men's · Creighton at Platte River Rumble \"Gold\" | Men's team: 2nd · 38 pts",["Men's 6K"]],["Final Oct 3 Men's · Creighton at Briar Cliff Invite | Men's team: 1st · 36 pts",["Men's 8K"]],["Final Oct 16 Men's · Creighton at Platte River Rumble \"Collegiate\" | Men's team: 2nd · 59 pts",["Men's 8K"]]]);
  recapFixtures.clear();requests.length=0;
}

// Bracket games named only by their round or "vs. TBD" read as their
// tournament ("Players Era 16", "BIG EAST Tournament Final"), "at".
{
  const rows=parse('Basketball','mens-basketball').filter(e=>/Players Era|BIG EAST/.test(e.title)).map(line);
  assert.deepEqual(rows,["Upcoming Nov 27 Men's · Creighton at Players Era 16 | ","Upcoming Nov 28, 9:30 PM Men's · Creighton at Players Era 16 | ","Upcoming Mar 10 Men's · Creighton at BIG EAST Tournament First Round | ","Upcoming Mar 11 Men's · Creighton at BIG EAST Tournament Quarterfinals | ","Upcoming Mar 12 Men's · Creighton at BIG EAST Tournament Semifinals | ","Upcoming Mar 13, 5:30 PM Men's · Creighton at BIG EAST Tournament Final | "]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Creighton module checks passed');
