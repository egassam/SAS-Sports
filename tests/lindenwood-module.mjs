import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lindenwoodSchool} from '../src/schools/lindenwood.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lindenwood');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lindenwoodHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lindenwood-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lindenwoodlions.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lindenwood'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',lindenwoodSchool.scheduleUrls],['roster',lindenwoodSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lindenwood|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lindenwoodlions.com',`${key} must stay on lindenwoodlions.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lindenwoodlions.com/sports/baseball/schedule"],"roster":["https://lindenwoodlions.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lindenwoodlions.com/sports/mens-basketball/schedule","https://lindenwoodlions.com/sports/womens-basketball/schedule"],"roster":["https://lindenwoodlions.com/sports/mens-basketball/roster","https://lindenwoodlions.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://lindenwoodlions.com/sports/beach-volleyball/schedule"],"roster":["https://lindenwoodlions.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://lindenwoodlions.com/sports/womens-cross-country/schedule","https://lindenwoodlions.com/sports/mens-cross-country/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-cross-country/roster","https://lindenwoodlions.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://lindenwoodlions.com/sports/football/schedule"],"roster":["https://lindenwoodlions.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://lindenwoodlions.com/sports/womens-golf/schedule","https://lindenwoodlions.com/sports/mens-golf/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-golf/roster","https://lindenwoodlions.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://lindenwoodlions.com/sports/mhockey-ncaa/schedule","https://lindenwoodlions.com/sports/womens-ice-hockey/schedule"],"roster":["https://lindenwoodlions.com/sports/mhockey-ncaa/roster","https://lindenwoodlions.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://lindenwoodlions.com/sports/womens-lacrosse/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://lindenwoodlions.com/sports/womens-soccer/schedule","https://lindenwoodlions.com/sports/mens-soccer/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-soccer/roster","https://lindenwoodlions.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://lindenwoodlions.com/sports/softball/schedule"],"roster":["https://lindenwoodlions.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://lindenwoodlions.com/sports/womens-tennis/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://lindenwoodlions.com/sports/womens-track-and-field/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://lindenwoodlions.com/sports/mens-volleyball/schedule","https://lindenwoodlions.com/sports/womens-volleyball/schedule"],"roster":["https://lindenwoodlions.com/sports/mens-volleyball/roster","https://lindenwoodlions.com/sports/womens-volleyball/roster"],"combined":true},"Wrestling":{"schedule":["https://lindenwoodlions.com/sports/womens-wrestling/schedule"],"roster":["https://lindenwoodlions.com/sports/womens-wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lindenwood|"+sport+"':"),`${sport} routes must live in the Lindenwood module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://lindenwoodlions.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lindenwoodHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lindenwood)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 20 Men's · Lindenwood at Southern Illinois (Exhibition) | L, 71-75",
 "Upcoming Nov 2, 7:00 PM Men's · Lindenwood at TCU | ",
 "Upcoming Nov 5, 6:00 PM Men's · Lindenwood vs Central Bible | ",
 "Upcoming Nov 7, 3:30 PM Men's · Lindenwood vs East-West | ",
 "Upcoming Nov 11, 8:00 PM Men's · Lindenwood at Nebraska | ",
 "Upcoming Nov 13, 7:45 PM Men's · Lindenwood at Nebraska at Omaha | ",
 "Upcoming Nov 17, 7:00 PM Men's · Lindenwood at Northern Iowa | ",
 "Upcoming Nov 24, 1:00 PM Men's · Lindenwood vs New Haven | ",
 "Upcoming Nov 25, 1:00 PM Men's · Lindenwood at Stony Brook | ",
 "Upcoming Nov 30, 7:00 PM Men's · Lindenwood at Missouri State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Lindenwood vs Nebraska at Omaha | ",
 "Upcoming Dec 8, 6:00 PM Men's · Lindenwood vs Mission College | ",
 "Upcoming Dec 12, 1:00 PM Men's · Lindenwood vs Northern Illinois | ",
 "Upcoming Dec 15, 6:00 PM Men's · Lindenwood vs Westminster College (MO) | ",
 "Upcoming Dec 19, 2:00 PM Men's · Lindenwood at Kansas City | ",
 "Upcoming Dec 21, 7:00 PM Men's · Lindenwood at Kansas State | ",
 "Upcoming Dec 30, 8:00 PM Men's · Lindenwood at SIUE | ",
 "Upcoming Jan 2, 3:30 PM Men's · Lindenwood vs UT Martin | ",
 "Upcoming Jan 7, 7:30 PM Men's · Lindenwood at Southern Indiana | ",
 "Upcoming Jan 9, 3:30 PM Men's · Lindenwood at Morehead State | ",
 "Upcoming Jan 14, 7:30 PM Men's · Lindenwood vs Southeast Missouri State | ",
 "Upcoming Jan 16, 3:30 PM Men's · Lindenwood at Eastern Illinois | ",
 "Upcoming Jan 21, 7:30 PM Men's · Lindenwood vs Tennessee State | ",
 "Upcoming Jan 28, 7:30 PM Men's · Lindenwood vs Morehead State | ",
 "Upcoming Jan 30, 3:30 PM Men's · Lindenwood vs Eastern Illinois | ",
 "Upcoming Feb 4, 7:30 PM Men's · Lindenwood at Tennessee State | ",
 "Upcoming Feb 6, 3:30 PM Men's · Lindenwood at UT Martin | ",
 "Upcoming Feb 11, 7:30 PM Men's · Lindenwood at Western Illinois | ",
 "Upcoming Feb 13, 3:30 PM Men's · Lindenwood vs Southern Indiana | ",
 "Upcoming Feb 17, 6:30 PM Men's · Lindenwood at Southeast Missouri State | ",
 "Upcoming Feb 20, 3:30 PM Men's · Lindenwood vs SIUE | ",
 "Upcoming Feb 27, 3:30 PM Men's · Lindenwood vs Western Illinois | ",
 "Upcoming Mar 3 Men's · Lindenwood at Ohio Valley Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Women's · Lindenwood at Colorado State | ",
 "Upcoming Nov 4, 6:00 PM Women's · Lindenwood at Denver | ",
 "Upcoming Nov 7, 1:00 PM Women's · Lindenwood vs Evansville | ",
 "Upcoming Nov 10, 7:00 PM Women's · Lindenwood at Louisville | ",
 "Upcoming Nov 13, 11:00 AM Women's · Lindenwood vs Stephens College (Mo.) | ",
 "Upcoming Nov 15, 2:00 PM Women's · Lindenwood at Missouri | ",
 "Upcoming Nov 19, 7:00 PM Women's · Lindenwood at UIC | ",
 "Upcoming Nov 21, 1:00 PM Women's · Lindenwood at Evansville | ",
 "Upcoming Nov 24, 3:00 PM Women's · Lindenwood vs Western Michigan | ",
 "Upcoming Nov 25, 3:00 PM Women's · Lindenwood at Cleveland State | ",
 "Upcoming Dec 1, 6:00 PM Women's · Lindenwood vs Hannibal-LaGrange | ",
 "Upcoming Dec 4, 6:00 PM Women's · Lindenwood vs South Dakota | ",
 "Upcoming Dec 14, 6:00 PM Women's · Lindenwood vs Missouri Baptist | ",
 "Upcoming Dec 16, 6:30 PM Women's · Lindenwood at Kansas | ",
 "Upcoming Dec 20, 12:00 PM Women's · Lindenwood vs Central Michigan | ",
 "Upcoming Dec 22, 2:00 PM Women's · Lindenwood at Kansas City | ",
 "Upcoming Dec 30, 5:00 PM Women's · Lindenwood at SIUE | ",
 "Upcoming Jan 2, 1:00 PM Women's · Lindenwood vs UT Martin | ",
 "Upcoming Jan 7, 5:00 PM Women's · Lindenwood at Southern Indiana | ",
 "Upcoming Jan 9, 1:00 PM Women's · Lindenwood at Morehead State | ",
 "Upcoming Jan 14, 5:00 PM Women's · Lindenwood vs Southeast Missouri State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Lindenwood at Eastern Illinois | ",
 "Upcoming Jan 21, 5:00 PM Women's · Lindenwood vs Tennessee State | ",
 "Upcoming Jan 28, 5:00 PM Women's · Lindenwood vs Morehead State | ",
 "Upcoming Jan 30, 1:00 PM Women's · Lindenwood vs Eastern Illinois | ",
 "Upcoming Feb 4, 5:00 PM Women's · Lindenwood at Tennessee State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Lindenwood at UT Martin | ",
 "Upcoming Feb 11, 5:00 PM Women's · Lindenwood at Western Illinois | ",
 "Upcoming Feb 13, 1:00 PM Women's · Lindenwood vs Southern Indiana | ",
 "Upcoming Feb 18, 6:30 PM Women's · Lindenwood at Southeast Missouri State | ",
 "Upcoming Feb 20, 1:00 PM Women's · Lindenwood vs SIUE | ",
 "Upcoming Feb 27, 1:00 PM Women's · Lindenwood vs Western Illinois | ",
 "Upcoming Mar 3 Women's · Lindenwood at Ohio Valley Conference Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Lindenwood at Redhawks Invitational | 3rd (75)",
 "Final Sep 11 Women's · Lindenwood at Larry Young Invitational | 4th (105)",
 "Final Sep 25 Women's · Lindenwood at Gans Creek Classic | 18th (526)",
 "Final Oct 16 Women's · Lindenwood at Bradley Pink Classic | 10th (284)",
 "Upcoming Oct 30, 9:00 AM Women's · Lindenwood at Ohio Valley Conference | ",
 "Upcoming Nov 5, 7:00 PM Women's · Lindenwood at WashU Open | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Lindenwood at Redhawks Invitational | 3rd (59)",
 "Final Sep 11 Men's · Lindenwood at Larry Young Invitational | 4th (92)",
 "Final Sep 25 Men's · Lindenwood at Gans Creek Classic | 17th (476)",
 "Final Oct 16 Men's · Lindenwood at Bradley Pink Classic | 13th (405)",
 "Upcoming Oct 30, 9:00 AM Men's · Lindenwood at Ohio Valley Conference Championships | ",
 "Upcoming Nov 5, 7:00 PM Men's · Lindenwood at WashU Open | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Lindenwood vs Charleston Southern | W, 20-17",
 "Final Sep 3 Lindenwood at Stony Brook | L, 32-36",
 "Final Sep 12 Lindenwood at Missouri State | L, 14-48",
 "Final Sep 26 Lindenwood at Eastern Michigan | L, 3-29",
 "Final Oct 10 Lindenwood vs Southeast Missouri State | L, 27-38",
 "Final Oct 17 Lindenwood at Eastern Illinois | W, 20-13",
 "Upcoming Oct 24, 2:00 PM Lindenwood vs Chicago State | ",
 "Upcoming Oct 31, 1:00 PM Lindenwood vs Tennessee State | ",
 "Upcoming Nov 7, 1:30 PM Lindenwood at Gardner-Webb | ",
 "Upcoming Nov 14, 2:00 PM Lindenwood at UT Martin | ",
 "Upcoming Nov 21, 2:00 PM Lindenwood vs Western Illinois | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Lindenwood at Brittany Kelly Classic | T11th",
 "Final Sep 21 Women's · Lindenwood at Johnie Imes Invitational | T6th",
 "Final Oct 4 Women's · Lindenwood at Coyote Creek Classic | 5th",
 "Final Oct 12 Women's · Lindenwood at Payne Stewart Memorial | 7th",
 "Upcoming Mar 1 Women's · Lindenwood at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 14 Women's · Lindenwood at SoCal Spring Invitational | ",
 "Upcoming Mar 22 Women's · Lindenwood at Ozarks National Invitational | ",
 "Upcoming Apr 5 Women's · Lindenwood at Colonel Classic | ",
 "Upcoming Apr 18 Women's · Lindenwood at Ohio Valley Conference Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Lindenwood at Wildcat Invitational | 13th",
 "Final Sep 21 Men's · Lindenwood at Bluejay Invitational | No team score (individuals only)",
 "Final Sep 28 Men's · Lindenwood at Derek Dolenc Invitational | T13th",
 "Final Oct 4 Men's · Lindenwood at Coyote Creek Classic | Completed",
 "Final Oct 12 Men's · Lindenwood at Bubba Barnett Intercollegiate | 10th",
 "Final Oct 19 Men's · Lindenwood at Zach Johnson Invitational | T1st",
 "Upcoming Mar 22 Men's · Lindenwood at Skyhawk Invitational | ",
 "Upcoming Apr 5 Men's · Lindenwood at Racer Intercollegiate | ",
 "Upcoming Apr 11 Men's · Lindenwood at Wright State | ",
 "Upcoming Apr 25 Men's · Lindenwood at Ohio Valley Conference Championships | "
]);
  const v_mhockeyncaa=parse("Hockey","mhockey-ncaa");
  assert.deepEqual(v_mhockeyncaa.map(line),[
 "Final Oct 2 Men's · Lindenwood vs Arizona State | L, 0-5",
 "Final Oct 3 Men's · Lindenwood vs Arizona State | W, 9-6",
 "Final Oct 8 Men's · Lindenwood vs Lake Superior State | W, 7-4",
 "Final Oct 9 Men's · Lindenwood vs Lake Superior State | L, 3-4",
 "Final Oct 15 Men's · Lindenwood at Air Force | L, 2-5",
 "Final Oct 16 Men's · Lindenwood at Air Force | W, 7-4",
 "Today Oct 23, 7:00 PM Men's · Lindenwood vs Nebraska at Omaha | ",
 "Upcoming Oct 24, 7:00 PM Men's · Lindenwood vs Nebraska at Omaha | ",
 "Upcoming Nov 6, 8:00 PM Men's · Lindenwood at Colorado College | ",
 "Upcoming Nov 7, 5:00 PM Men's · Lindenwood at Colorado College | ",
 "Upcoming Nov 13, 8:00 PM Men's · Lindenwood at Denver | ",
 "Upcoming Nov 14, 7:00 PM Men's · Lindenwood at Denver | ",
 "Upcoming Nov 20, 7:00 PM Men's · Lindenwood vs LIU | ",
 "Upcoming Nov 21, 5:00 PM Men's · Lindenwood vs LIU | ",
 "Upcoming Nov 27, 7:07 PM Men's · Lindenwood at North Dakota | ",
 "Upcoming Nov 28, 6:07 PM Men's · Lindenwood at North Dakota | ",
 "Upcoming Dec 11, 7:00 PM Men's · Lindenwood vs Maryville (Exhibition) | ",
 "Upcoming Dec 29, 7:00 PM Men's · Lindenwood vs Michigan State | ",
 "Upcoming Dec 30 Men's · Lindenwood at Great Lakes Invitational | ",
 "Upcoming Jan 8, 7:00 PM Men's · Lindenwood vs Maryville (Exhibition) | ",
 "Upcoming Jan 9, 5:00 PM Men's · Lindenwood vs Maryville (Exhibition) | ",
 "Upcoming Jan 15, 6:00 PM Men's · Lindenwood at Stonehill College | ",
 "Upcoming Jan 16, 6:00 PM Men's · Lindenwood at Stonehill College | ",
 "Upcoming Jan 22, 7:00 PM Men's · Lindenwood vs Alaska Fairbanks | ",
 "Upcoming Jan 23, 5:00 PM Men's · Lindenwood vs Alaska Fairbanks | ",
 "Upcoming Jan 29, 6:30 PM Men's · Lindenwood at LIU | ",
 "Upcoming Jan 30, 6:30 PM Men's · Lindenwood at LIU | ",
 "Upcoming Feb 5, 7:00 PM Men's · Lindenwood vs Stonehill College | ",
 "Upcoming Feb 6, 5:00 PM Men's · Lindenwood vs Stonehill College | ",
 "Upcoming Feb 12, 10:00 PM Men's · Lindenwood at Alaska Anchorage | ",
 "Upcoming Feb 13, 9:00 PM Men's · Lindenwood at Alaska Anchorage | ",
 "Upcoming Feb 21, 2:00 PM Men's · Lindenwood vs Maryville (Exhibition) | ",
 "Upcoming Mar 4 Men's · Lindenwood at United Collegiate Hockey Cup | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 18 Women's · Lindenwood at Post | W, 5-0",
 "Final Sep 19 Women's · Lindenwood at Post | W, 7-0",
 "Final Sep 24 Women's · Lindenwood at Merrimack College | W, 3-2",
 "Final Sep 25 Women's · Lindenwood at Merrimack College | L, 0-3",
 "Final Oct 3 Women's · Lindenwood at Delaware | L, 1-4",
 "Final Oct 4 Women's · Lindenwood at Delaware | W, 3-1",
 "Final Oct 8 Women's · Lindenwood vs Mercyhurst | L, 1-2",
 "Final Oct 9 Women's · Lindenwood vs Mercyhurst | L, 0-4",
 "Final Oct 16 Women's · Lindenwood at Penn State | L, 4-5",
 "Final Oct 17 Women's · Lindenwood at Penn State | L, 0-3",
 "Final Oct 22 Women's · Lindenwood at Minnesota | L, 0-11",
 "Final Oct 23 Women's · Lindenwood at Minnesota | L, 2-5",
 "Upcoming Oct 29, 7:15 PM Women's · Lindenwood vs Robert Morris | ",
 "Upcoming Oct 30, 12:00 PM Women's · Lindenwood vs Robert Morris | ",
 "Upcoming Nov 6, 4:00 PM Women's · Lindenwood vs Syracuse | ",
 "Upcoming Nov 7, 1:00 PM Women's · Lindenwood vs Syracuse | ",
 "Upcoming Nov 13, 3:00 PM Women's · Lindenwood at RIT | ",
 "Upcoming Nov 14, 1:00 PM Women's · Lindenwood at RIT | ",
 "Upcoming Nov 27, 6:00 PM Women's · Lindenwood at Bemidji State | ",
 "Upcoming Nov 28, 3:00 PM Women's · Lindenwood at Bemidji State | ",
 "Upcoming Dec 4, 6:00 PM Women's · Lindenwood at Mercyhurst | ",
 "Upcoming Dec 5, 1:00 PM Women's · Lindenwood at Mercyhurst | ",
 "Upcoming Jan 2, 2:00 PM Women's · Lindenwood vs Minnesota State University, Mankato | ",
 "Upcoming Jan 3, 1:00 PM Women's · Lindenwood vs Minnesota State University, Mankato | ",
 "Upcoming Jan 8, 3:00 PM Women's · Lindenwood vs Delaware | ",
 "Upcoming Jan 9, 11:00 AM Women's · Lindenwood vs Delaware | ",
 "Upcoming Jan 15, 4:00 PM Women's · Lindenwood vs RIT | ",
 "Upcoming Jan 16, 1:00 PM Women's · Lindenwood vs RIT | ",
 "Upcoming Jan 22, 4:00 PM Women's · Lindenwood at Syracuse | ",
 "Upcoming Jan 23, 1:00 PM Women's · Lindenwood at Syracuse | ",
 "Upcoming Feb 5, 7:00 PM Women's · Lindenwood at Robert Morris | ",
 "Upcoming Feb 6, 12:00 PM Women's · Lindenwood at Robert Morris | ",
 "Upcoming Feb 12, 2:00 PM Women's · Lindenwood vs Penn State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Lindenwood vs Penn State | ",
 "Upcoming Feb 18 Women's · Lindenwood at AHA Tournament | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Lindenwood vs Bellarmine | W, 1-0",
 "Final Aug 16 Women's · Lindenwood at Saint Louis | L, 0-5",
 "Final Aug 20 Women's · Lindenwood vs Illinois State | L, 0-1",
 "Final Aug 23 Women's · Lindenwood vs DePaul | L, 0-1",
 "Final Aug 27 Women's · Lindenwood at Evansville | W, 3-1",
 "Final Aug 30 Women's · Lindenwood at Nebraska at Omaha | T, 0-0",
 "Final Sep 3 Women's · Lindenwood at Southern Illinois | L, 0-1",
 "Final Sep 13 Women's · Lindenwood vs Murray State | W, 1-0",
 "Final Sep 17 Women's · Lindenwood vs St. Thomas | W, 3-2",
 "Final Sep 20 Women's · Lindenwood at Western Kentucky | T, 0-0",
 "Final Sep 27 Women's · Lindenwood vs Morehead State | W, 3-0",
 "Final Oct 4 Women's · Lindenwood at UT Martin | L, 0-1",
 "Final Oct 11 Women's · Lindenwood at Eastern Illinois | L, 0-3",
 "Final Oct 15 Women's · Lindenwood vs Southern Indiana | W, 1-0",
 "Final Oct 18 Women's · Lindenwood at Southeast Missouri State | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Women's · Lindenwood vs SIUE | ",
 "Upcoming Nov 1, 1:00 PM Women's · Lindenwood vs Western Illinois | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Lindenwood vs Chicago State | W, 3-0",
 "Final Aug 24 Men's · Lindenwood at IU Indy | L, 0-1",
 "Final Aug 26 Men's · Lindenwood vs Blackburn College | W, 7-0",
 "Final Aug 30 Men's · Lindenwood at Wright State | T, 1-1",
 "Final Sep 4 Men's · Lindenwood at Butler | W, 2-0",
 "Final Sep 11 Men's · Lindenwood vs Evansville | L, 0-3",
 "Final Sep 15 Men's · Lindenwood vs Tulsa | T, 0-0",
 "Final Sep 20 Men's · Lindenwood at Seattle | T, 1-1",
 "Final Sep 26 Men's · Lindenwood at The University of Texas Rio Grande Valley | T, 0-0",
 "Final Oct 1 Men's · Lindenwood vs Incarnate Word | W, 2-0",
 "Final Oct 4 Men's · Lindenwood vs Houston Christian | T, 1-1",
 "Final Oct 8 Men's · Lindenwood vs The University of Texas Rio Grande Valley | W, 3-1",
 "Final Oct 11 Men's · Lindenwood vs Western Illinois | T, 1-1",
 "Final Oct 15 Men's · Lindenwood at SIUE | W, 4-0",
 "Final Oct 18 Men's · Lindenwood at Southern Indiana | L, 0-1",
 "Today Oct 23, 7:00 PM Men's · Lindenwood vs Eastern Illinois | ",
 "Upcoming Oct 29, 7:00 PM Men's · Lindenwood at Houston Christian | ",
 "Upcoming Nov 1, 11:30 AM Men's · Lindenwood at Incarnate Word | ",
 "Upcoming Nov 8 Men's · Lindenwood at Ohio Valley Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 6:00 PM Lindenwood at Missouri | ",
 "Upcoming Oct 28, 5:00 PM Lindenwood vs East Central College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Lindenwood at LU Invite | Completed",
 "Final Sep 25 Lindenwood at OVC Fall Championships | Completed",
 "Final Oct 15 Lindenwood at Intercollegiate Tennis Association Championships | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5, 2:00 PM Lindenwood at Saluki Fast Start | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Lindenwood vs UIC | W, 3-0",
 "Final Aug 29 Women's · Lindenwood vs University at Buffalo | L, 1-3",
 "Final Aug 30 Women's · Lindenwood at Saint Louis | W, 3-2",
 "Final Sep 4 Women's · Lindenwood vs Portland State | W, 3-0",
 "Final Sep 5 Women's · Lindenwood vs Murray State | W, 3-1",
 "Final Sep 5 Women's · Lindenwood at Northern Illinois | W, 3-0",
 "Final Sep 9 Women's · Lindenwood at Illinois | L, 0-3",
 "Final Sep 11 Women's · Lindenwood vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 12 Women's · Lindenwood at Illinois State | W, 3-1",
 "Final Sep 18 Women's · Lindenwood vs New Mexico State | W, 3-1",
 "Final Sep 18 Women's · Lindenwood vs The University of Texas Rio Grande Valley | W, 3-0",
 "Final Sep 19 Women's · Lindenwood at Bradley | W, 3-2",
 "Final Sep 25 Women's · Lindenwood at Morehead State | W, 3-0",
 "Final Sep 26 Women's · Lindenwood at Morehead State | W, 3-0",
 "Final Oct 2 Women's · Lindenwood vs Eastern Illinois | W, 3-0",
 "Final Oct 3 Women's · Lindenwood vs Eastern Illinois | W, 3-0",
 "Final Oct 9 Women's · Lindenwood at Southeast Missouri State | W, 3-1",
 "Final Oct 10 Women's · Lindenwood at Southeast Missouri State | L, 1-3",
 "Final Oct 16 Women's · Lindenwood vs Southern Indiana | W, 3-1",
 "Final Oct 17 Women's · Lindenwood vs Southern Indiana | W, 3-0",
 "Final Oct 21 Women's · Lindenwood vs SIUE | W, 3-0",
 "Today Oct 23, 6:00 PM Women's · Lindenwood vs SIUE | ",
 "Upcoming Nov 5, 6:00 PM Women's · Lindenwood at UT Martin | ",
 "Upcoming Nov 6, 5:00 PM Women's · Lindenwood at UT Martin | ",
 "Upcoming Nov 12, 6:00 PM Women's · Lindenwood vs Tennessee State | ",
 "Upcoming Nov 13, 5:00 PM Women's · Lindenwood vs Tennessee State | ",
 "Upcoming Nov 17, 6:00 PM Women's · Lindenwood at Western Illinois | ",
 "Upcoming Nov 18, 6:00 PM Women's · Lindenwood at Western Illinois | ",
 "Upcoming Nov 22 Women's · Lindenwood at Ohio Valley Conference Tournament | "
]);
  const v_womenswrestling=parse("Wrestling","womens-wrestling");
  assert.deepEqual(v_womenswrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Lindenwood at Simpson College | ",
 "Upcoming Nov 13, 9:00 AM Lindenwood at Missouri Valley College | ",
 "Upcoming Nov 22, 10:00 AM Lindenwood at Lindenwood Duals | ",
 "Upcoming Dec 6, 9:00 AM Lindenwood at Carthage College | ",
 "Upcoming Dec 13, 9:00 AM Lindenwood at North Central College | ",
 "Upcoming Jan 9, 11:00 AM Lindenwood at Tiffin (Ohio) | ",
 "Upcoming Jan 15, 9:00 AM Lindenwood at Missouri Baptist | ",
 "Upcoming Jan 24, 9:00 AM Lindenwood at Northeastern State | ",
 "Upcoming Jan 24, 9:00 AM Lindenwood vs Fort Hays State | ",
 "Upcoming Feb 3, 6:00 PM Lindenwood vs Quincy | ",
 "Upcoming Feb 6, 10:00 AM Lindenwood at Lindsey Wilson College (Ky.) | ",
 "Upcoming Feb 20, 11:00 AM Lindenwood at NCAA Regional Tournament | ",
 "Upcoming Mar 5, 11:00 AM Lindenwood at NCAA National Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mhockeyncaa,"Hockey mhockey-ncaa");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswrestling,"Wrestling womens-wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Lindenwood module checks passed");
