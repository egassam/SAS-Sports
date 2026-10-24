import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {omahaSchool} from '../src/schools/omaha.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='omaha');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,omahaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/omaha-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit omahamavs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['omaha'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',omahaSchool.scheduleUrls],['roster',omahaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('omaha|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'omahamavs.com',`${key} must stay on omahamavs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://omahamavs.com/sports/baseball/schedule"],"roster":["https://omahamavs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://omahamavs.com/sports/mens-basketball/schedule","https://omahamavs.com/sports/womens-basketball/schedule"],"roster":["https://omahamavs.com/sports/mens-basketball/roster","https://omahamavs.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://omahamavs.com/sports/womens-cross-country/schedule"],"roster":["https://omahamavs.com/sports/womens-cross-country/roster"],"combined":false},"Golf":{"schedule":["https://omahamavs.com/sports/womens-golf/schedule","https://omahamavs.com/sports/mens-golf/schedule"],"roster":["https://omahamavs.com/sports/womens-golf/roster","https://omahamavs.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://omahamavs.com/sports/mens-ice-hockey/schedule"],"roster":["https://omahamavs.com/sports/mens-ice-hockey/roster"],"combined":false},"Soccer":{"schedule":["https://omahamavs.com/sports/womens-soccer/schedule","https://omahamavs.com/sports/mens-soccer/schedule"],"roster":["https://omahamavs.com/sports/womens-soccer/roster","https://omahamavs.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://omahamavs.com/sports/softball/schedule"],"roster":["https://omahamavs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://omahamavs.com/sports/womens-swimming-and-diving/schedule","https://omahamavs.com/sports/mswim/schedule"],"roster":["https://omahamavs.com/sports/womens-swimming-and-diving/roster","https://omahamavs.com/sports/mswim/roster"],"combined":true},"Tennis":{"schedule":["https://omahamavs.com/sports/womens-tennis/schedule","https://omahamavs.com/sports/mens-tennis/schedule"],"roster":["https://omahamavs.com/sports/womens-tennis/roster","https://omahamavs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://omahamavs.com/sports/womens-track-and-field/schedule"],"roster":["https://omahamavs.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://omahamavs.com/sports/womens-volleyball/schedule"],"roster":["https://omahamavs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'omaha|"+sport+"':"),`${sport} routes must live in the Omaha module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://omahamavs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.omahaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=omaha)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 15 Men's · Omaha at Minnesota (Exhibition) | L, 52-72",
 "Upcoming Nov 2, 7:00 PM Men's · Omaha vs Mid-America Christian | ",
 "Upcoming Nov 6, 8:00 PM Men's · Omaha at BYU | ",
 "Upcoming Nov 7, 3:00 PM Men's · Omaha at Utah State | ",
 "Upcoming Nov 10, 7:00 PM Men's · Omaha vs York (Neb.) | ",
 "Upcoming Nov 13, 7:45 PM Men's · Omaha vs Lindenwood | ",
 "Upcoming Nov 17, 7:00 PM Men's · Omaha vs Lamar | ",
 "Upcoming Nov 25, 7:30 PM Men's · Omaha vs UC Davis | ",
 "Upcoming Nov 26, 9:30 PM Men's · Omaha vs Pacific | ",
 "Upcoming Nov 27, 9:30 PM Men's · Omaha vs Jacksonville State | ",
 "Upcoming Dec 1, 7:00 PM Men's · Omaha vs Mount Marty (S.D.) | ",
 "Upcoming Dec 5, 1:00 PM Men's · Omaha at Lindenwood | ",
 "Upcoming Dec 8, 6:30 PM Men's · Omaha at Texas Tech | ",
 "Upcoming Dec 15, 7:45 PM Men's · Omaha vs Sam Houston | ",
 "Upcoming Dec 20, 6:00 PM Men's · Omaha vs Kent State | ",
 "Upcoming Dec 21 Men's · Omaha vs Howard/UTEP | ",
 "Upcoming Dec 29, 7:00 PM Men's · Omaha at Kansas State | ",
 "Upcoming Dec 31, 1:00 PM Men's · Omaha vs Park (AZ.) | ",
 "Upcoming Jan 7, 7:00 PM Men's · Omaha vs North Dakota | ",
 "Upcoming Jan 9, 1:00 PM Men's · Omaha vs North Dakota State | ",
 "Upcoming Jan 16, 6:00 PM Men's · Omaha at St. Thomas | ",
 "Upcoming Jan 21, 7:00 PM Men's · Omaha at Kansas City | ",
 "Upcoming Jan 23, 7:00 PM Men's · Omaha at Oral Roberts | ",
 "Upcoming Jan 28, 7:00 PM Men's · Omaha vs South Dakota | ",
 "Upcoming Jan 31, 1:00 PM Men's · Omaha vs South Dakota State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Omaha at North Dakota State | ",
 "Upcoming Feb 6, 1:00 PM Men's · Omaha at North Dakota | ",
 "Upcoming Feb 13, 7:00 PM Men's · Omaha vs St. Thomas | ",
 "Upcoming Feb 18, 7:00 PM Men's · Omaha vs Oral Roberts | ",
 "Upcoming Feb 21, 1:00 PM Men's · Omaha vs Kansas City | ",
 "Upcoming Feb 25, 7:00 PM Men's · Omaha at South Dakota State | ",
 "Upcoming Feb 27 Men's · Omaha at South Dakota | ",
 "Upcoming Mar 4 Men's · Omaha at Summit League Men's Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Omaha vs Northern State (Exhibition) | ",
 "Upcoming Nov 3, 6:30 PM Women's · Omaha at Kansas | ",
 "Upcoming Nov 7, 12:00 PM Women's · Omaha vs Avila (Mo.) | ",
 "Upcoming Nov 9, 6:30 PM Women's · Omaha vs Western Illinois | ",
 "Upcoming Nov 13, 5:30 PM Women's · Omaha vs Drake | ",
 "Upcoming Nov 18, 6:00 PM Women's · Omaha at Creighton | ",
 "Upcoming Nov 22, 12:00 PM Women's · Omaha vs Air Force | ",
 "Upcoming Nov 27, 5:00 PM Women's · Omaha vs Detroit Mercy | ",
 "Upcoming Nov 28, 5:00 PM Women's · Omaha vs Saint Louis | ",
 "Upcoming Dec 1, 7:00 PM Women's · Omaha at Nebraska | ",
 "Upcoming Dec 4, 6:30 PM Women's · Omaha vs Stephen F. Austin | ",
 "Upcoming Dec 8, 1:00 PM Women's · Omaha at CSU Bakersfield | ",
 "Upcoming Dec 12, 2:00 PM Women's · Omaha at Wichita State | ",
 "Upcoming Dec 15, 5:30 PM Women's · Omaha vs Northern Colorado | ",
 "Upcoming Dec 18, 6:00 PM Women's · Omaha at Northern Illinois | ",
 "Upcoming Dec 20, 11:00 AM Women's · Omaha at Wisconsin | ",
 "Upcoming Dec 30, 6:30 PM Women's · Omaha vs Mount Marty (S.D.) | ",
 "Upcoming Jan 7, 7:00 PM Women's · Omaha at North Dakota | ",
 "Upcoming Jan 9, 1:00 PM Women's · Omaha at North Dakota State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Omaha vs St. Thomas | ",
 "Upcoming Jan 21, 6:30 PM Women's · Omaha vs Kansas City | ",
 "Upcoming Jan 24, 1:00 PM Women's · Omaha vs Oral Roberts | ",
 "Upcoming Jan 28, 7:00 PM Women's · Omaha at South Dakota | ",
 "Upcoming Jan 30, 1:00 PM Women's · Omaha at South Dakota State | ",
 "Upcoming Feb 4, 6:30 PM Women's · Omaha vs North Dakota State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Omaha vs North Dakota | ",
 "Upcoming Feb 13, 1:00 PM Women's · Omaha at St. Thomas | ",
 "Upcoming Feb 18, 7:00 PM Women's · Omaha at Oral Roberts | ",
 "Upcoming Feb 20, 1:00 PM Women's · Omaha at Kansas City | ",
 "Upcoming Feb 25, 6:30 PM Women's · Omaha vs South Dakota State | ",
 "Upcoming Feb 27, 1:00 PM Women's · Omaha vs South Dakota | ",
 "Upcoming Mar 4 Women's · Omaha at Summit League Women's Basketball Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Omaha at Platte River Rumble Gold | 3rd of 4",
 "Final Oct 2 Omaha at Joe Piane Invitational | 15th of 24",
 "Final Oct 16 Omaha at Platte River Rumble College | 4th of 10",
 "Upcoming Oct 31 Omaha at Summit League Championships | ",
 "Upcoming Nov 13 Omaha at NCAA Midwest Regional Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · Omaha at Fall Stampede at the Creek | 1st",
 "Final Sep 28 Women's · Omaha at Diane Thomason Invitational | 8th",
 "Final Oct 5 Women's · Omaha at Marilynn Smith Sunflower Invitational | 13th",
 "Final Oct 12 Women's · Omaha at Big O Classic | 1st",
 "Upcoming Feb 15 Women's · Omaha at Islanders Collegiate Invitational | ",
 "Upcoming Mar 2 Women's · Omaha at GCU Invitational | ",
 "Upcoming Mar 22 Women's · Omaha at Bell Bank Pay It Forward Intercollegiate | ",
 "Upcoming Apr 12 Women's · Omaha at Spring Stampede at the Creek | ",
 "Upcoming Apr 25 Women's · Omaha at The Summit League Conference Tournament | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Omaha at ANF Hawkeye Fall Classic | 5th",
 "Final Sep 14 Men's · Omaha at Wildcat Classic | 7th",
 "Final Sep 21 Men's · Omaha at Bluejay Invitational | Completed",
 "Final Sep 27 Men's · Omaha at Badger Invitational | 15th",
 "Final Oct 12 Men's · Omaha at Fall Purdue Invite | 12th",
 "Final Oct 19 Men's · Omaha at Zach Johnson Invitational | 9th",
 "Upcoming Feb 22 Men's · Omaha at Wyoming Desert Intercollegiate | ",
 "Upcoming Feb 28 Men's · Omaha at Loyola Intercollegiate | ",
 "Upcoming Mar 29 Men's · Omaha at Wyoming Cowboy Classic | ",
 "Upcoming Apr 5 Men's · Omaha at Tiger Invitational | ",
 "Upcoming Apr 18 Men's · Omaha at Iowa | ",
 "Upcoming May 2 Men's · Omaha at The Summit League Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Omaha at Air Force (Exhibition) | W, 4-1",
 "Final Oct 7 Omaha vs Manitoba (Exhibition) | W, 9-2",
 "Final Oct 15 Omaha at Augustana | L, 1-2",
 "Final Oct 17 Omaha vs Augustana | L, 2-3",
 "Final Oct 23 Omaha at Lindenwood | W, 7-4",
 "Today Oct 24, 7:00 PM Omaha at Lindenwood | ",
 "Upcoming Oct 30, 8:00 PM Omaha at Denver | ",
 "Upcoming Oct 31, 7:00 PM Omaha at Denver | ",
 "Upcoming Nov 6, 7:00 PM Omaha vs St. Cloud State | ",
 "Upcoming Nov 7, 7:00 PM Omaha vs St. Cloud State | ",
 "Upcoming Nov 13, 6:05 PM Omaha at Miami (Ohio) | ",
 "Upcoming Nov 14, 5:05 PM Omaha at Miami (Ohio) | ",
 "Upcoming Nov 20, 7:00 PM Omaha vs Western Michigan | ",
 "Upcoming Nov 21, 7:00 PM Omaha vs Western Michigan | ",
 "Upcoming Nov 27, 6:00 PM Omaha vs Yale | ",
 "Upcoming Nov 28, 6:00 PM Omaha vs Yale | ",
 "Upcoming Dec 4, 7:00 PM Omaha at St. Thomas | ",
 "Upcoming Dec 5, 6:00 PM Omaha at St. Thomas | ",
 "Upcoming Dec 10 Omaha at Wisconsin | ",
 "Upcoming Dec 11 Omaha at Wisconsin | ",
 "Upcoming Jan 2, 4:00 PM Omaha vs Cornell | ",
 "Upcoming Jan 3, 2:00 PM Omaha vs Cornell | ",
 "Upcoming Jan 8, 7:00 PM Omaha vs Arizona State | ",
 "Upcoming Jan 9, 7:00 PM Omaha vs Arizona State | ",
 "Upcoming Jan 15, 6:00 PM Omaha at Western Michigan | ",
 "Upcoming Jan 16, 5:00 PM Omaha at Western Michigan | ",
 "Upcoming Jan 22, 7:00 PM Omaha vs North Dakota | ",
 "Upcoming Jan 23, 7:00 PM Omaha vs North Dakota | ",
 "Upcoming Jan 29, 7:00 PM Omaha vs Minnesota Duluth | ",
 "Upcoming Jan 30, 7:00 PM Omaha vs Minnesota Duluth | ",
 "Upcoming Feb 12 Omaha at St. Cloud State | ",
 "Upcoming Feb 13 Omaha at St. Cloud State | ",
 "Upcoming Feb 19, 7:00 PM Omaha vs Colorado College | ",
 "Upcoming Feb 20, 7:00 PM Omaha vs Colorado College | ",
 "Upcoming Feb 26, 9:00 PM Omaha at Arizona State | ",
 "Upcoming Feb 27, 7:00 PM Omaha at Arizona State | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Omaha vs Iowa State | L, 0-1",
 "Final Aug 20 Women's · Omaha at Northern Iowa | W, 1-0",
 "Final Aug 23 Women's · Omaha at Green Bay | T, 0-0",
 "Final Aug 27 Women's · Omaha at Nebraska | L, 0-3",
 "Final Aug 30 Women's · Omaha vs Lindenwood | T, 0-0",
 "Final Sep 3 Women's · Omaha vs Idaho State | L, 0-2",
 "Final Sep 12 Women's · Omaha vs Drake | T, 1-1",
 "Final Sep 16 Women's · Omaha vs Creighton | L, 0-1",
 "Final Sep 24 Women's · Omaha vs St. Thomas | W, 3-2",
 "Final Sep 27 Women's · Omaha at Oral Roberts | L, 0-2",
 "Final Oct 3 Women's · Omaha vs Kansas City | W, 1-0",
 "Final Oct 8 Women's · Omaha at North Dakota | T, 0-0",
 "Final Oct 11 Women's · Omaha at North Dakota State | T, 0-0",
 "Final Oct 15 Women's · Omaha vs South Dakota | L, 0-1",
 "Final Oct 18 Women's · Omaha vs South Dakota State | L, 0-2",
 "Today Oct 24, 3:00 PM Women's · Omaha at St. Thomas | ",
 "Upcoming Oct 29, 7:00 PM Women's · Omaha vs Oral Roberts | ",
 "Upcoming Nov 1, 1:00 PM Women's · Omaha at Kansas City | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Omaha vs Eastern Illinois | W, 4-2",
 "Final Aug 23 Men's · Omaha vs FIU | T, 0-0",
 "Final Aug 27 Men's · Omaha vs Bradley | W, 4-0",
 "Final Sep 3 Men's · Omaha at Utah Valley | T, 1-1",
 "Final Sep 6 Men's · Omaha at UCLA | L, 1-2",
 "Final Sep 10 Men's · Omaha vs Yale | W, 6-0",
 "Final Sep 13 Men's · Omaha vs Saint Mary's | L, 1-2",
 "Final Sep 17 Men's · Omaha at Western Illinois | W, 1-0",
 "Final Sep 26 Men's · Omaha vs Delaware | T, 3-3",
 "Final Sep 29 Men's · Omaha vs Creighton | L, 2-4",
 "Final Oct 3 Men's · Omaha vs Nebraska Wesleyan | W, 4-0",
 "Final Oct 10 Men's · Omaha at UMass | W, 3-0",
 "Final Oct 16 Men's · Omaha vs Oral Roberts | W, 3-1",
 "Final Oct 20 Men's · Omaha vs Drake | W, 3-1",
 "Final Oct 24 Men's · Omaha at St. Thomas | L, 0-4",
 "Upcoming Oct 31, 5:00 PM Men's · Omaha vs Kansas City | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · Omaha at The Good Life Relays (Exhibition) | Completed",
 "Final Oct 3 Women's · Omaha vs Rockhurst | W, 236-43",
 "Final Oct 16 Women's · Omaha vs College of St. Mary | W, 199-53",
 "Final Oct 16 Women's · Omaha vs Iowa Western | W, 201-49",
 "Final Oct 17 Women's · Omaha vs SDSU | W, 184.5-113.5",
 "Final Oct 17 Women's · Omaha vs UNL | L, 79-220",
 "Upcoming Oct 30 Women's · Omaha at Missouri State | ",
 "Upcoming Nov 12 Women's · Omaha at A3 Invitational | ",
 "Upcoming Nov 18 Women's · Omaha at Mizzou Invite | ",
 "Upcoming Dec 11, 4:00 PM Women's · Omaha vs Augustana | ",
 "Upcoming Jan 15 Women's · Omaha vs St. Thomas | ",
 "Upcoming Jan 22 Women's · Omaha at South Dakota | ",
 "Upcoming Feb 5 Women's · Omaha at Coyote Invite | ",
 "Upcoming Feb 24 Women's · Omaha at The Summit League Championships | "
]);
  const v_mswim=parse("Swimming & Diving","mswim");
  assert.deepEqual(v_mswim.map(line),[
 "Final Sep 25 Men's · Omaha at The Good Life Relays (Exhibition) | Completed",
 "Final Oct 3 Men's · Omaha vs Rockhurst | W, 208-73",
 "Final Oct 16 Men's · Omaha vs Iowa Western | W, 147-114",
 "Final Oct 17 Men's · Omaha vs SDSU | W, 183-111",
 "Upcoming Oct 30 Men's · Omaha at Missouri State | ",
 "Upcoming Nov 12 Men's · Omaha at A3 Invitational | ",
 "Upcoming Nov 18 Men's · Omaha at Mizzou Invite | ",
 "Upcoming Dec 11, 4:00 PM Men's · Omaha vs Augustana | ",
 "Upcoming Jan 15 Men's · Omaha vs St. Thomas | ",
 "Upcoming Jan 22 Men's · Omaha at South Dakota | ",
 "Upcoming Feb 5 Men's · Omaha at Coyote Invite | ",
 "Upcoming Feb 24 Men's · Omaha at The Summit League Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Omaha at Tulsa Invite | Completed",
 "Final Oct 16 Women's · Omaha at Marquette Invite | Completed",
 "Today Oct 24 Women's · Omaha at Omaha/Creighton Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Omaha at Milwaukee Tennis Classic | Completed",
 "Final Sep 18 Men's · Omaha at Washburn Invite | Completed",
 "Final Sep 25 Men's · Omaha at Creighton Invite | Completed",
 "Final Oct 7 Men's · Omaha at ITA Central Regionals | Completed",
 "Today Oct 23 Men's · Omaha at MAC Indoor Championship | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Omaha at Washington State | L, 0-3",
 "Final Aug 29 Omaha vs Central Michigan | W, 3-0",
 "Final Sep 3 Omaha vs Western Michigan | L, 2-3",
 "Final Sep 4 Omaha vs Louisiana Tech | W, 3-0",
 "Final Sep 5 Omaha vs Chicago State | W, 3-0",
 "Final Sep 10 Omaha at Northern Arizona | L, 1-3",
 "Final Sep 11 Omaha vs UC Riverside | W, 3-0",
 "Final Sep 12 Omaha vs Grand Canyon | W, 3-2",
 "Final Sep 15 Omaha at Drake | W, 3-1",
 "Final Sep 19 Omaha vs Kansas State | L, 1-3",
 "Final Sep 24 Omaha at North Dakota | W, 3-1",
 "Final Sep 26 Omaha at North Dakota State | W, 3-1",
 "Final Oct 1 Omaha vs South Dakota State | W, 3-2",
 "Final Oct 3 Omaha vs South Dakota | L, 0-3",
 "Final Oct 9 Omaha vs St. Thomas | L, 0-3",
 "Final Oct 15 Omaha at Oral Roberts | W, 3-2",
 "Final Oct 17 Omaha at Kansas City | W, 3-2",
 "Final Oct 22 Omaha vs North Dakota State | L, 0-3",
 "Today Oct 24, 1:00 PM Omaha vs North Dakota | ",
 "Upcoming Oct 29, 7:00 PM Omaha at South Dakota | ",
 "Upcoming Oct 31, 11:00 AM Omaha at South Dakota State | ",
 "Upcoming Nov 6, 7:00 PM Omaha at St. Thomas | ",
 "Upcoming Nov 12, 6:30 PM Omaha vs Kansas City | ",
 "Upcoming Nov 14, 1:00 PM Omaha vs Oral Roberts | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mswim,"Swimming & Diving mswim");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Omaha module checks passed");
