import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {utsaSchool} from '../src/schools/utsa.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utsa');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,utsaHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utsa-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads goutsa.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['utsa'];
assert.equal(sports.length,10);
assert.deepEqual(Object.keys(utsaSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',utsaSchool.scheduleUrls],['roster',utsaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utsa|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'goutsa.com',`${key} must stay on goutsa.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/goutsa\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/goutsa\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(utsaSchool.scheduleUrls[`utsa|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'utsa|"+sport+"':"),`${sport} routes must live in the UTSA module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'utsa',host:'goutsa.com',sportIds:Object.fromEntries(Object.entries(utsaSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(utsaSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(utsaSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,utsaSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,utsaSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Tennis"]);
const parity={"Baseball":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/womens-basketball/roster","https://goutsa.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=54&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/womens-golf/roster","https://goutsa.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/womens-tennis/roster","https://goutsa.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/track-fieldcross-country/roster"],"combined":false},"Volleyball":{"schedule":["https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goutsa.com/sports/volleyball/roster"],"combined":false}};

const now=new Date("2026-10-22T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(utsaSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.utsaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=utsa)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api2=parse("Baseball","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Upcoming Oct 23, 6:30 PM UTSA vs Fall World Series (Game 1) | ",
 "Upcoming Oct 24, 11:00 AM UTSA vs Fall World Series (Game 2) | ",
 "Upcoming Oct 25, 1:00 PM UTSA vs Fall World Series (Game 3) | ",
 "Upcoming Oct 30, 2:00 PM UTSA vs Alvin CC | ",
 "Upcoming Nov 3, 3:00 PM UTSA vs McClennan CC | ",
 "Upcoming Nov 6, 2:00 PM UTSA vs Navarro College | "
]);
  const v_api16=parse("Basketball","api-16");
  assert.deepEqual(v_api16.map(line),[
 "Upcoming Nov 6 Women's · UTSA at UNLV | ",
 "Upcoming Nov 8 Women's · UTSA at San Diego State | ",
 "Upcoming Nov 11 Women's · UTSA vs UIW | ",
 "Upcoming Nov 16 Women's · UTSA vs Louisiana | ",
 "Upcoming Nov 21 Women's · UTSA vs North Dakota State | ",
 "Upcoming Nov 26 Women's · UTSA vs Binghamton | ",
 "Upcoming Nov 27 Women's · UTSA vs Howard | ",
 "Upcoming Dec 6 Women's · UTSA at Baylor | ",
 "Upcoming Dec 10 Women's · UTSA at TCU | ",
 "Upcoming Dec 16 Women's · UTSA at Texas State | ",
 "Upcoming Dec 20 Women's · UTSA at SMU | ",
 "Upcoming Dec 30 Women's · UTSA at Florida Atlantic | ",
 "Upcoming Jan 2 Women's · UTSA at South Florida | ",
 "Upcoming Jan 6 Women's · UTSA vs North Texas | ",
 "Upcoming Jan 10 Women's · UTSA vs Wichita State | ",
 "Upcoming Jan 13 Women's · UTSA at Tulsa | ",
 "Upcoming Jan 16 Women's · UTSA vs Rice | ",
 "Upcoming Jan 24 Women's · UTSA vs UAB | ",
 "Upcoming Jan 27 Women's · UTSA at Charlotte | ",
 "Upcoming Jan 30 Women's · UTSA at East Carolina | ",
 "Upcoming Feb 3 Women's · UTSA vs Tulsa | ",
 "Upcoming Feb 6 Women's · UTSA vs Temple | ",
 "Upcoming Feb 10 Women's · UTSA at Memphis | ",
 "Upcoming Feb 13 Women's · UTSA at North Texas | ",
 "Upcoming Feb 17 Women's · UTSA vs South Florida | ",
 "Upcoming Feb 20 Women's · UTSA vs East Carolina | ",
 "Upcoming Feb 27 Women's · UTSA at Rice | ",
 "Upcoming Mar 3 Women's · UTSA vs Florida Atlantic | ",
 "Upcoming Mar 6 Women's · UTSA at Tulane | ",
 "Upcoming Mar 9 Women's · UTSA at American Conference Women's Basketball Championship | "
]);
  const v_api5=parse("Basketball","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Upcoming Nov 2 Men's · UTSA at San Jose State | ",
 "Upcoming Nov 7 Men's · UTSA vs VMI | ",
 "Upcoming Nov 11 Men's · UTSA at Seattle U | ",
 "Upcoming Nov 15 Men's · UTSA vs Texas State | ",
 "Upcoming Nov 18 Men's · UTSA vs Florida A&M | ",
 "Upcoming Nov 21 Men's · UTSA vs Air Force | ",
 "Upcoming Nov 26 Men's · UTSA vs Army | ",
 "Upcoming Nov 29 Men's · UTSA at SIUE | ",
 "Upcoming Dec 5 Men's · UTSA at South Alabama | ",
 "Upcoming Dec 8 Men's · UTSA at SMU | ",
 "Upcoming Dec 11 Men's · UTSA vs Denver | ",
 "Upcoming Dec 15 Men's · UTSA vs Our Lady of the Lake | ",
 "Upcoming Dec 22 Men's · UTSA vs Huston-Tillotson | ",
 "Upcoming Dec 29 Men's · UTSA at Minnesota | ",
 "Upcoming Jan 2 Men's · UTSA at Temple | ",
 "Upcoming Jan 7 Men's · UTSA vs Tulsa | ",
 "Upcoming Jan 10 Men's · UTSA at East Carolina | ",
 "Upcoming Jan 13 Men's · UTSA at Charlotte | ",
 "Upcoming Jan 17 Men's · UTSA vs Tulane | ",
 "Upcoming Jan 20 Men's · UTSA at Rice | ",
 "Upcoming Jan 23 Men's · UTSA vs South Florida | ",
 "Upcoming Jan 28 Men's · UTSA vs North Texas | ",
 "Upcoming Jan 31 Men's · UTSA at Wichita State | ",
 "Upcoming Feb 4 Men's · UTSA vs Florida Atlantic | ",
 "Upcoming Feb 7 Men's · UTSA vs Rice | ",
 "Upcoming Feb 14 Men's · UTSA vs Memphis | ",
 "Upcoming Feb 18 Men's · UTSA at Tulane | ",
 "Upcoming Feb 21 Men's · UTSA at Tulsa | ",
 "Upcoming Feb 24 Men's · UTSA vs East Carolina | ",
 "Upcoming Feb 27 Men's · UTSA at North Texas | ",
 "Upcoming Mar 4 Men's · UTSA at UAB | ",
 "Upcoming Mar 7 Men's · UTSA vs Temple | ",
 "Upcoming Mar 10 Men's · UTSA at American Conference Championships | "
]);
  const v_api54=parse("Cross Country","api-54");
  assert.deepEqual(v_api54.map(line),[
 "Final Sep 1 UTSA at Sam Musgrave UIW Twilight Invitational | Men's team: 3rd / Women's team: 4th",
 "Final Sep 12 UTSA at UIW Invitational | Men's team: 4th / Women's team: 4th",
 "Final Oct 2 UTSA at Joe Piane Notre Dame Invitational | Men's team: 17th / Women's team: 11th",
 "Final Oct 16 UTSA at Arturo Barrios Invitational | Men's team: 26th / Women's team: 35th",
 "Upcoming Oct 31 UTSA at American Conference Cross Country Championships | ",
 "Upcoming Nov 13 UTSA at NCAA South Central Regional Cross Country Championships | ",
 "Upcoming Nov 21 UTSA at NCAA Cross Country National Championships | "
]);
  const v_api4=parse("Football","api-4");
  assert.deepEqual(v_api4.map(line),[
 "Final Sep 5 UTSA vs UTRGV | W, 45-16",
 "Final Sep 12 UTSA at Texas State | W, 31-26",
 "Final Sep 19 UTSA at Texas | L, 6-30",
 "Final Sep 26 UTSA vs Colorado State | W, 59-45",
 "Final Oct 3 UTSA at Rice | W, 16-14",
 "Final Oct 8 UTSA vs South Florida | W, 31-24",
 "Final Oct 17 UTSA vs Navy | W, 38-34",
 "Upcoming Oct 24, 7:00 PM UTSA at Tulane | ",
 "Upcoming Nov 5, 7:00 PM UTSA at Florida Atlantic | ",
 "Upcoming Nov 14 UTSA vs North Texas | ",
 "Upcoming Nov 21 UTSA at UAB | ",
 "Upcoming Nov 27 UTSA vs Tulsa | ",
 "Upcoming Dec 5, 7:00 PM UTSA at American Football Championship | "
]);
  const v_api18=parse("Golf","api-18");
  assert.deepEqual(v_api18.map(line),[
 "Final Sep 8 Women's · UTSA at The Bruzzy | 2nd of 11",
 "Final Sep 21 Women's · UTSA at Canadian Collegiate Invitational and Michigan | 10th of 11",
 "Final Oct 2 Women's · UTSA at Ron Moore Intercollegiate | 11th of 15",
 "Final Oct 12 Women's · UTSA at Golf Iconic Classic | 3rd of 19",
 "Upcoming Feb 1 Women's · UTSA at FAU Paradise Invitational | ",
 "Upcoming Feb 15 Women's · UTSA at Texas Golf Throwdown | ",
 "Upcoming Feb 26 Women's · UTSA at Reynolds Lake Oconee Invitational | ",
 "Upcoming Mar 9 Women's · UTSA at Alamo Invitational | ",
 "Upcoming Mar 29 Women's · UTSA at Coach Mo Classic and North Florida | ",
 "Upcoming Apr 5 Women's · UTSA at The \"Mo\"Morial | ",
 "Upcoming Apr 19 Women's · UTSA at American Conference Championship | "
]);
  const v_api7=parse("Golf","api-7");
  assert.deepEqual(v_api7.map(line),[
 "Final Sep 6 Men's · UTSA at Myrtle Beach Golf Trips Intercollegiate | 4th of 16",
 "Final Sep 21 Men's · UTSA at Rod Myers Invitational | T10th of 13",
 "Final Oct 5 Men's · UTSA at West Bay Collegiate Invitational | 11th of 15",
 "Final Oct 19 Men's · UTSA at Qubein Cup | 2nd of 11",
 "Upcoming Feb 7 Men's · UTSA at Compadres Collegiate | ",
 "Upcoming Feb 21 Men's · UTSA at Military City Collegiate | ",
 "Upcoming Mar 15 Men's · UTSA at Arizona Thunderbirds Intercollegiate | ",
 "Upcoming Mar 22 Men's · UTSA at Bell Bank \"Pay It Forward\" Collegiate | ",
 "Upcoming Apr 2 Men's · UTSA at Mason Rudolph Championship | ",
 "Upcoming Apr 10 Men's · UTSA at The Aggie Invitational | ",
 "Upcoming Apr 25 Men's · UTSA at American Conference Championship | "
]);
  const v_api10=parse("Soccer","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Final Aug 5 UTSA vs Texas (Exhibition) | T, 1-1",
 "Final Aug 8 UTSA at Texas A&M-Corpus Christi (Exhibition) | T, 0-0",
 "Final Aug 12 UTSA vs Texas State | T, 2-2",
 "Final Aug 16 UTSA at TCU | T, 2-2",
 "Final Aug 20 UTSA vs Colorado College | W, 2-0",
 "Final Aug 23 UTSA vs St. Mary's (TX) | W, 4-1",
 "Final Aug 27 UTSA vs Texas Southern | T, 1-1",
 "Final Sep 3 UTSA at East Texas A&M | W, 2-1",
 "Final Sep 10 UTSA vs UIW | W, 3-1",
 "Final Sep 17 UTSA vs Santa Clara | L, 0-1",
 "Final Sep 24 UTSA at East Carolina | L, 0-1",
 "Final Sep 27 UTSA at Charlotte | T, 1-1",
 "Final Oct 2 UTSA vs Rice | L, 0-3",
 "Final Oct 8 UTSA at South Florida | W, 3-0",
 "Final Oct 11 UTSA vs UAB | W, 2-1",
 "Final Oct 15 UTSA vs Tulsa | T, 1-1",
 "Today Oct 22, 7:00 PM UTSA at Memphis | ",
 "Upcoming Oct 25, 1:00 PM UTSA vs Temple | ",
 "Upcoming Oct 30, 7:00 PM UTSA at North Texas | ",
 "Upcoming Nov 3, 7:00 PM UTSA vs Florida Atlantic | ",
 "Upcoming Nov 8 UTSA at American Conference Championships | "
]);
  const v_api11=parse("Softball","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Today Oct 22, 7:00 PM UTSA at Texas State | ",
 "Upcoming Oct 29, 7:00 PM UTSA at Texas | ",
 "Upcoming Oct 30, 5:00 PM UTSA vs Texas A&M-San Antonio | ",
 "Upcoming Oct 30, 7:00 PM UTSA vs Navarro College | "
]);
  const v_api19=parse("Tennis","api-19");
  assert.deepEqual(v_api19.map(line),[
 "Final Sep 18 Women's · UTSA at Kimbell Memorial Invitational | Completed",
 "Final Sep 25 Women's · UTSA at Rice Fall Invitational | Completed",
 "Final Oct 3 Women's · UTSA at River State Shootout | Completed",
 "Final Oct 8 Women's · UTSA at Texas ITA Regional Championships | Completed",
 "Today Oct 22 Women's · UTSA at American Conference Individual Championships | ",
 "Upcoming Oct 29 Women's · UTSA at H-E-B Invitational | "
]);
  const v_api8=parse("Tennis","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Final Sep 11 Men's · UTSA at Islander Open | Completed",
 "Final Oct 8 Men's · UTSA at ITA Texas Regionals | Completed",
 "Today Oct 22 Men's · UTSA at American Individual Championships | ",
 "Upcoming Oct 23 Men's · UTSA at Waco Invite | ",
 "Upcoming Oct 30 Men's · UTSA at SMU Invitational | ",
 "Upcoming Nov 5 Men's · UTSA at ITA Masters/Sectionals | ",
 "Upcoming Nov 17 Men's · UTSA at NCAA Individual Championships | "
]);
  const v_api14=parse("Track & Field","api-14");
  assert.deepEqual(v_api14.map(line),[]);
  const v_api15=parse("Volleyball","api-15");
  assert.deepEqual(v_api15.map(line),[
 "Final Aug 28 UTSA vs UT Arlington | L, 1-3",
 "Final Aug 29 UTSA vs SIU Edwardsville | W, 3-2",
 "Final Aug 30 UTSA at Arkansas | L, 1-3",
 "Final Sep 3 UTSA vs UIW | W, 3-2",
 "Final Sep 4 UTSA vs Tarleton State | W, 3-0",
 "Final Sep 10 UTSA vs Gonzaga | W, 3-0",
 "Final Sep 11 UTSA vs East Texas A&M | W, 3-0",
 "Final Sep 12 UTSA vs IU Indy | W, 3-0",
 "Final Sep 17 UTSA at HCU | W, 3-1",
 "Final Sep 18 UTSA at Houston | W, 3-1",
 "Final Sep 19 UTSA vs Texas State | W, 3-2",
 "Final Sep 25 UTSA vs Tulane | L, 2-3",
 "Final Sep 27 UTSA vs Florida Atlantic | L, 2-3",
 "Final Oct 2 UTSA at Charlotte | W, 3-1",
 "Final Oct 4 UTSA at East Carolina | L, 0-3",
 "Final Oct 9 UTSA at Tulsa | L, 0-3",
 "Final Oct 11 UTSA vs South Florida | W, 3-2",
 "Final Oct 14 UTSA vs North Texas | W, 3-0",
 "Final Oct 16 UTSA at Wichita State | L, 2-3",
 "Upcoming Oct 23, 6:00 PM UTSA vs UAB | ",
 "Upcoming Oct 25, 11:00 AM UTSA at Temple | ",
 "Upcoming Oct 30, 6:30 PM UTSA at Memphis | ",
 "Upcoming Nov 1, 1:00 PM UTSA at UAB | ",
 "Upcoming Nov 6, 6:00 PM UTSA vs Rice | ",
 "Upcoming Nov 8, 1:00 PM UTSA vs Wichita State | ",
 "Upcoming Nov 11, 5:00 PM UTSA at North Texas | ",
 "Upcoming Nov 15, 1:00 PM UTSA vs Memphis | ",
 "Upcoming Nov 20 UTSA at American Conference Championship | "
]);
  ownRecapsOnly(v_api2,"Baseball api-2");
  ownRecapsOnly(v_api16,"Basketball api-16");
  ownRecapsOnly(v_api5,"Basketball api-5");
  ownRecapsOnly(v_api54,"Cross Country api-54");
  ownRecapsOnly(v_api4,"Football api-4");
  ownRecapsOnly(v_api18,"Golf api-18");
  ownRecapsOnly(v_api7,"Golf api-7");
  ownRecapsOnly(v_api10,"Soccer api-10");
  ownRecapsOnly(v_api11,"Softball api-11");
  ownRecapsOnly(v_api19,"Tennis api-19");
  ownRecapsOnly(v_api8,"Tennis api-8");
  ownRecapsOnly(v_api14,"Track & Field api-14");
  ownRecapsOnly(v_api15,"Volleyball api-15");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('UTSA module checks passed');
