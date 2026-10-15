import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {virginiaTechSchool} from '../src/schools/virginia-tech.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='virginia-tech');
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
const worker=Function(...Object.keys(deps),source+';return {rosterProfiles,officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,virginiaTechHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/virginia-tech-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads hokiesports.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['virginia-tech'];
assert.equal(sports.length,13);
assert.deepEqual(Object.keys(virginiaTechSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',virginiaTechSchool.scheduleUrls],['roster',virginiaTechSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('virginia-tech|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'hokiesports.com',`${key} must stay on hokiesports.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/hokiesports\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/hokiesports\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(virginiaTechSchool.scheduleUrls[`virginia-tech|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'virginia-tech|"+sport+"':"),`${sport} routes must live in the Virginia Tech module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'virginia-tech',host:'hokiesports.com',sportIds:Object.fromEntries(Object.entries(virginiaTechSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(virginiaTechSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(virginiaTechSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,virginiaTechSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,virginiaTechSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Soccer","Tennis"]);
const parity={"Baseball":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/womens-basketball/roster","https://hokiesports.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/womens-golf/roster","https://hokiesports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/womens-soccer/roster","https://hokiesports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/swimming-diving/roster"],"combined":false},"Tennis":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/womens-tennis/roster","https://hokiesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://hokiesports.com/sports/wrestling/roster"],"combined":false}};

const now=new Date("2026-10-15T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(virginiaTechSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.virginiaTechHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=virginia-tech)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[]);
  const v_api14=parse("Basketball","api-14");
  assert.deepEqual(v_api14.map(line),[
 "Upcoming Oct 19, 6:00 PM Women's · Virginia Tech at Maryland (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Virginia Tech vs NC Central | ",
 "Upcoming Nov 4, 6:00 PM Women's · Virginia Tech vs Delaware | ",
 "Upcoming Nov 8, 6:00 PM Women's · Virginia Tech vs James Madison | ",
 "Upcoming Nov 12, 6:00 PM Women's · Virginia Tech at VCU | ",
 "Upcoming Nov 15, 2:00 PM Women's · Virginia Tech vs La Salle | ",
 "Upcoming Nov 23, 2:30 PM Women's · Virginia Tech vs UT Martin | ",
 "Upcoming Nov 24 Women's · Virginia Tech vs Alcorn State/Michigan State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Virginia Tech vs UNCG | ",
 "Upcoming Dec 3, 9:00 PM Women's · Virginia Tech vs Tennessee | ",
 "Upcoming Dec 6, 2:00 PM Women's · Virginia Tech at Duke | ",
 "Upcoming Dec 9, 6:00 PM Women's · Virginia Tech vs App State | ",
 "Upcoming Dec 13, 5:00 PM Women's · Virginia Tech vs Campbell | ",
 "Upcoming Dec 19, 2:00 PM Women's · Virginia Tech vs Wake Forest | ",
 "Upcoming Dec 21, 12:00 PM Women's · Virginia Tech vs Radford | ",
 "Upcoming Dec 28, 2:00 PM Women's · Virginia Tech vs College of Charleston | ",
 "Upcoming Dec 31, 2:00 PM Women's · Virginia Tech at Pitt | ",
 "Upcoming Jan 3, 4:00 PM Women's · Virginia Tech vs Syracuse | ",
 "Upcoming Jan 7, 6:00 PM Women's · Virginia Tech vs Notre Dame | ",
 "Upcoming Jan 10, 2:00 PM Women's · Virginia Tech at Virginia | ",
 "Upcoming Jan 14, 7:00 PM Women's · Virginia Tech at NC State | ",
 "Upcoming Jan 17, 2:00 PM Women's · Virginia Tech vs Louisville | ",
 "Upcoming Jan 24, 2:00 PM Women's · Virginia Tech vs Florida State | ",
 "Upcoming Jan 28, 6:00 PM Women's · Virginia Tech at Boston College | ",
 "Upcoming Jan 31, 2:00 PM Women's · Virginia Tech vs Cal | ",
 "Upcoming Feb 4, 6:00 PM Women's · Virginia Tech at Clemson | ",
 "Upcoming Feb 7, 2:00 PM Women's · Virginia Tech at North Carolina | ",
 "Upcoming Feb 11, 6:00 PM Women's · Virginia Tech vs SMU | ",
 "Upcoming Feb 18, 6:00 PM Women's · Virginia Tech vs Stanford | ",
 "Upcoming Feb 21, 2:00 PM Women's · Virginia Tech at Georgia Tech | ",
 "Upcoming Feb 25, 7:00 PM Women's · Virginia Tech at Miami | ",
 "Upcoming Feb 28, 6:00 PM Women's · Virginia Tech vs Virginia | ",
 "Upcoming Mar 3 Women's · Virginia Tech at ACC Tournament | "
]);
  const v_api6=parse("Basketball","api-6");
  assert.deepEqual(v_api6.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Virginia Tech vs Coppin State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Virginia Tech vs Mercer | ",
 "Upcoming Nov 10 Men's · Virginia Tech vs Iowa | ",
 "Upcoming Nov 13, 7:00 PM Men's · Virginia Tech vs Mount St. Mary's | ",
 "Upcoming Nov 16, 7:00 PM Men's · Virginia Tech vs Richmond | ",
 "Upcoming Nov 20, 3:00 PM Men's · Virginia Tech vs Northwestern | ",
 "Upcoming Nov 22, 3:30 PM Men's · Virginia Tech vs Oklahoma State | ",
 "Upcoming Nov 27, 5:00 PM Men's · Virginia Tech vs Old Dominion | ",
 "Upcoming Dec 1, 9:00 PM Men's · Virginia Tech vs Ole Miss | ",
 "Upcoming Dec 5, 4:30 PM Men's · Virginia Tech at West Virginia | ",
 "Upcoming Dec 10, 7:00 PM Men's · Virginia Tech vs Maryland Eastern Shore | ",
 "Upcoming Dec 13, 1:00 PM Men's · Virginia Tech vs Radford | ",
 "Upcoming Dec 19 Men's · Virginia Tech vs UCF | ",
 "Upcoming Dec 21, 6:00 PM Men's · Virginia Tech vs VMI | ",
 "Upcoming Dec 30, 8:00 PM Men's · Virginia Tech vs Louisville | ",
 "Upcoming Jan 2, 3:30 PM Men's · Virginia Tech at Wake Forest | ",
 "Upcoming Jan 6, 7:00 PM Men's · Virginia Tech at Notre Dame | ",
 "Upcoming Jan 9, 8:00 PM Men's · Virginia Tech vs Boston College | ",
 "Upcoming Jan 16, 12:00 PM Men's · Virginia Tech vs SMU | ",
 "Upcoming Jan 20, 7:00 PM Men's · Virginia Tech at Florida State | ",
 "Upcoming Jan 23, 6:00 PM Men's · Virginia Tech vs Miami | ",
 "Upcoming Jan 27, 9:00 PM Men's · Virginia Tech at Pitt | ",
 "Upcoming Jan 30, 6:00 PM Men's · Virginia Tech at Virginia | ",
 "Upcoming Feb 2, 8:00 PM Men's · Virginia Tech vs Clemson | ",
 "Upcoming Feb 10, 9:00 PM Men's · Virginia Tech at Cal | ",
 "Upcoming Feb 13, 4:30 PM Men's · Virginia Tech at Stanford | ",
 "Upcoming Feb 17, 7:00 PM Men's · Virginia Tech vs NC State | ",
 "Upcoming Feb 20, 12:00 PM Men's · Virginia Tech at Boston College | ",
 "Upcoming Feb 23, 7:00 PM Men's · Virginia Tech vs Virginia | ",
 "Upcoming Feb 27, 7:00 PM Men's · Virginia Tech vs North Carolina | ",
 "Upcoming Mar 3, 9:00 PM Men's · Virginia Tech vs Syracuse | ",
 "Upcoming Mar 6, 12:00 PM Men's · Virginia Tech at Georgia Tech | ",
 "Upcoming Mar 9 Men's · Virginia Tech at ACC Tournament | "
]);
  const v_api2=parse("Cross Country","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Final Sep 4 Virginia Tech at VT Invitational | Men's team: 1st / Women's team: 1st",
 "Final Sep 18 Virginia Tech at Hokie Invitational | Men's team: 1st / Women's team: 1st",
 "Final Oct 2 Virginia Tech at App State | Men's team: 1st / Women's team: 1st",
 "Final Oct 3 Virginia Tech at ECE - Fast Times Invitational | Completed",
 "Upcoming Oct 16, 9:30 AM Virginia Tech at Virginia | ",
 "Upcoming Oct 30, 10:00 AM Virginia Tech at ACC Championships | ",
 "Upcoming Nov 6, 3:45 PM Virginia Tech at Hokie Open | ",
 "Upcoming Nov 13, 11:00 AM Virginia Tech at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Virginia Tech at NCAA Championships | "
]);
  const v_api3=parse("Football","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Final Sep 5 Virginia Tech vs VMI | W, 73-3",
 "Final Sep 12 Virginia Tech vs Old Dominion | W, 44-21",
 "Final Sep 19 Virginia Tech at Maryland | W, 35-26",
 "Final Sep 26 Virginia Tech at Boston College | W, 21-14",
 "Final Oct 2 Virginia Tech vs Pitt | L, 33-35",
 "Final Oct 10 Virginia Tech at Cal | L, 20-25",
 "Upcoming Oct 17, 3:30 PM Virginia Tech vs Georgia Tech | ",
 "Upcoming Oct 24 Virginia Tech at Clemson | ",
 "Upcoming Nov 6, 7:00 PM Virginia Tech at SMU | ",
 "Upcoming Nov 14 Virginia Tech vs Stanford | ",
 "Upcoming Nov 21 Virginia Tech at Miami | ",
 "Upcoming Nov 28 Virginia Tech vs Virginia | ",
 "Upcoming Dec 5, 12:00 PM Virginia Tech at ACC Championship | "
]);
  const v_api15=parse("Golf","api-15");
  assert.deepEqual(v_api15.map(line),[
 "Final Sep 7 Women's · Virginia Tech at Nittany Lion Invitational | 1st of 18",
 "Final Sep 19 Women's · Virginia Tech at Schooner Fall Classic | 4th of 16",
 "Final Oct 5 Women's · Virginia Tech at The Ally | 7th of 17",
 "Upcoming Oct 16 Women's · Virginia Tech at Ruth's Chris Tar Heel Invitational | ",
 "Upcoming Oct 26 Women's · Virginia Tech at Keswick Invitational | ",
 "Upcoming Jan 29 Women's · Virginia Tech at Collegiate Invitational | ",
 "Upcoming Feb 14 Women's · Virginia Tech at Moon Golf Invitational | ",
 "Upcoming Mar 9 Women's · Virginia Tech at Alamo Invitational | ",
 "Upcoming Mar 21 Women's · Virginia Tech at Clemson Invitational | ",
 "Upcoming Apr 5 Women's · Virginia Tech at Hokie Highlander Invitational | ",
 "Upcoming Apr 15 Women's · Virginia Tech at ACC Women's Golf Championship | ",
 "Upcoming May 10 Women's · Virginia Tech at NCAA Regional | ",
 "Upcoming May 21 Women's · Virginia Tech at NCAA Championship | "
]);
  const v_api7=parse("Golf","api-7");
  assert.deepEqual(v_api7.map(line),[
 "Final Aug 31 Men's · Virginia Tech at Visit Knoxville Collegiate | 13th of 17",
 "Final Sep 13 Men's · Virginia Tech at J.T. Poston Invitational | T2nd of 17",
 "Final Sep 21 Men's · Virginia Tech at Rod Myers Invitational | 13th of 13",
 "Final Oct 5 Men's · Virginia Tech at Testudo Cup | 2nd of 14",
 "Upcoming Oct 19 Men's · Virginia Tech at Bank of Tennessee Intercollegiate | ",
 "Upcoming Oct 31 Men's · Virginia Tech at Steelwood Intercollegiate | ",
 "Upcoming Feb 7 Men's · Virginia Tech at Dorado Beach Collegiate | ",
 "Upcoming Mar 8 Men's · Virginia Tech at Palmetto Intercollegiate | ",
 "Upcoming Mar 19 Men's · Virginia Tech at Linger Longer Invitational | ",
 "Upcoming Apr 12 Men's · Virginia Tech at Lewis Chitengwa Invitational | ",
 "Upcoming Apr 22 Men's · Virginia Tech at ACC Men's Golf Championship | ",
 "Upcoming May 17 Men's · Virginia Tech at NCAA Regional | ",
 "Upcoming May 28 Men's · Virginia Tech at NCAA Championship | "
]);
  const v_api5=parse("Lacrosse","api-5");
  assert.deepEqual(v_api5.map(line),[]);
  const v_api16=parse("Soccer","api-16");
  assert.deepEqual(v_api16.map(line),[
 "Final Aug 13 Women's · Virginia Tech vs Old Dominion | W, 2-1",
 "Final Aug 16 Women's · Virginia Tech vs VMI | W, 6-0",
 "Final Aug 20 Women's · Virginia Tech vs Liberty | T, 2-2",
 "Final Aug 23 Women's · Virginia Tech vs Maryland | T, 2-2",
 "Final Aug 27 Women's · Virginia Tech at William & Mary | W, 3-1",
 "Final Aug 30 Women's · Virginia Tech at Georgetown | W, 2-1",
 "Final Sep 3 Women's · Virginia Tech at Penn State | T, 1-1",
 "Final Sep 6 Women's · Virginia Tech vs Illinois | L, 0-1",
 "Final Sep 17 Women's · Virginia Tech at Pitt | W, 2-1",
 "Final Sep 20 Women's · Virginia Tech at Syracuse | W, 1-0",
 "Final Sep 27 Women's · Virginia Tech at NC State | L, 0-3",
 "Final Oct 3 Women's · Virginia Tech vs Louisville | L, 1-2",
 "Final Oct 8 Women's · Virginia Tech at SMU | T, 1-1",
 "Upcoming Oct 16, 7:00 PM Women's · Virginia Tech vs Virginia | ",
 "Upcoming Oct 22, 7:00 PM Women's · Virginia Tech vs Wake Forest | ",
 "Upcoming Oct 25, 5:00 PM Women's · Virginia Tech vs Clemson | ",
 "Upcoming Oct 29, 7:00 PM Women's · Virginia Tech vs Boston College | ",
 "Upcoming Nov 5, 6:30 PM Women's · Virginia Tech at Florida State | "
]);
  const v_api8=parse("Soccer","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Final Aug 20 Men's · Virginia Tech at Ohio State | L, 0-1",
 "Final Aug 23 Men's · Virginia Tech vs Howard | W, 7-0",
 "Final Aug 28 Men's · Virginia Tech vs Kentucky | W, 3-0",
 "Final Sep 5 Men's · Virginia Tech at NC State | T, 1-1",
 "Final Sep 9 Men's · Virginia Tech vs ETSU | L, 1-3",
 "Final Sep 13 Men's · Virginia Tech vs Wake Forest | W, 2-1",
 "Final Sep 18 Men's · Virginia Tech at Duke | W, 4-2",
 "Final Sep 22 Men's · Virginia Tech vs Queens (NC) | W, 3-0",
 "Final Sep 27 Men's · Virginia Tech vs SMU | L, 0-3",
 "Final Oct 2 Men's · Virginia Tech at Virginia | W, 2-1",
 "Final Oct 6 Men's · Virginia Tech vs Longwood | W, 3-1",
 "Final Oct 9 Men's · Virginia Tech at Pitt | L, 0-3",
 "Upcoming Oct 16, 6:00 PM Men's · Virginia Tech at Furman | ",
 "Upcoming Oct 21, 6:00 PM Men's · Virginia Tech vs Winthrop | ",
 "Upcoming Oct 25, 2:00 PM Men's · Virginia Tech vs Clemson | ",
 "Upcoming Oct 30, 5:00 PM Men's · Virginia Tech vs Syracuse | "
]);
  const v_api10=parse("Softball","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Upcoming Oct 16, 5:00 PM Virginia Tech vs Radford | ",
 "Upcoming Oct 24, 12:00 PM Virginia Tech at George Mason | ",
 "Upcoming Oct 30, 5:00 PM Virginia Tech at Radford | "
]);
  const v_api11=parse("Swimming & Diving","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Final Oct 2 Virginia Tech at Tri-Meet | West Virginia: Men: W, 264-89 · Liberty: Women: W, 240-113 · Penn State: Women: W, 312-41 | Men: W, 265.50-87.50",
 "Final Oct 9 Virginia Tech at SMU Classic | Men's team: 2nd / Women's team: 5th",
 "Upcoming Oct 23, 2:00 PM Virginia Tech at Tri-Meet | ",
 "Upcoming Oct 24, 11:00 AM Virginia Tech at Duke | ",
 "Upcoming Oct 28 Virginia Tech at USA Swimming SCM World Trials | ",
 "Upcoming Nov 5, 3:00 PM Virginia Tech vs North Carolina | ",
 "Upcoming Nov 18 Virginia Tech at NC State Invite | ",
 "Upcoming Nov 18 Virginia Tech at Ohio State Fall Invite | ",
 "Upcoming Dec 2 Virginia Tech at Toyota US Open | ",
 "Upcoming Jan 16 Virginia Tech at Virginia | ",
 "Upcoming Jan 23 Virginia Tech vs NC State | ",
 "Upcoming Jan 29 Virginia Tech at Virginia Tech Invitational | ",
 "Upcoming Feb 16 Virginia Tech at ACC Championships | ",
 "Upcoming Mar 8 Virginia Tech at NCAA Zone Diving | ",
 "Upcoming Mar 17 Virginia Tech at Women's NCAA Championships | ",
 "Upcoming Mar 24 Virginia Tech at Men's NCAA Championships | "
]);
  const v_api17=parse("Tennis","api-17");
  assert.deepEqual(v_api17.map(line),[
 "Today Oct 15 Women's · Virginia Tech at ITA Regional Championships | ",
 "Upcoming Oct 30 Women's · Virginia Tech at William & Mary Hidden Dual | ",
 "Upcoming Nov 5 Women's · Virginia Tech at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Virginia Tech at NCAA Individual Championships | "
]);
  const v_api9=parse("Tennis","api-9");
  assert.deepEqual(v_api9.map(line),[
 "Upcoming Nov 5 Men's · Virginia Tech at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Virginia Tech at NCAA Individual Championships | "
]);
  const v_api12=parse("Track & Field","api-12");
  assert.deepEqual(v_api12.map(line),[]);
  const v_api13=parse("Volleyball","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Final Aug 28 Virginia Tech vs William & Mary | L, 2-3",
 "Final Aug 28 Virginia Tech vs Kent State | W, 3-0",
 "Final Aug 29 Virginia Tech vs Coppin State | W, 3-1",
 "Final Sep 3 Virginia Tech at Winthrop | L, 0-3",
 "Final Sep 4 Virginia Tech vs Old Dominion | W, 3-0",
 "Final Sep 11 Virginia Tech at Northwestern | L, 0-3",
 "Final Sep 12 Virginia Tech vs Wisconsin-Green Bay | L, 2-3",
 "Final Sep 13 Virginia Tech vs LIU | L, 1-3",
 "Final Sep 18 Virginia Tech at South Carolina | L, 0-3",
 "Final Sep 25 Virginia Tech at Georgia Tech | L, 0-3",
 "Final Sep 27 Virginia Tech at Clemson | W, 3-1",
 "Final Oct 2 Virginia Tech at Stanford | L, 0-3",
 "Final Oct 3 Virginia Tech at Cal | L, 1-3",
 "Final Oct 9 Virginia Tech vs North Carolina | L, 0-3",
 "Final Oct 11 Virginia Tech vs Duke | L, 2-3",
 "Final Oct 14 Virginia Tech at Virginia | L, 1-3",
 "Upcoming Oct 16, 6:00 PM Virginia Tech vs Virginia | ",
 "Upcoming Oct 23, 7:00 PM Virginia Tech at Boston College | ",
 "Upcoming Oct 25, 1:00 PM Virginia Tech at Syracuse | ",
 "Upcoming Oct 30, 6:00 PM Virginia Tech vs Florida State | ",
 "Upcoming Nov 1, 1:00 PM Virginia Tech vs Miami | ",
 "Upcoming Nov 6, 6:00 PM Virginia Tech vs Notre Dame | ",
 "Upcoming Nov 8, 1:00 PM Virginia Tech vs Louisville | ",
 "Upcoming Nov 13, 7:00 PM Virginia Tech at NC State | ",
 "Upcoming Nov 15, 1:00 PM Virginia Tech at Wake Forest | ",
 "Upcoming Nov 20, 6:00 PM Virginia Tech vs SMU | ",
 "Upcoming Nov 22, 12:00 PM Virginia Tech vs Pitt | ",
 "Upcoming Nov 25, 1:00 PM Virginia Tech vs Wake Forest | ",
 "Upcoming Nov 28, 3:00 PM Virginia Tech at Duke | "
]);
  const v_api18=parse("Wrestling","api-18");
  assert.deepEqual(v_api18.map(line),[
 "Upcoming Nov 1 Virginia Tech at Southeast Open | ",
 "Upcoming Nov 6, 7:00 PM Virginia Tech at Lehigh | ",
 "Upcoming Nov 19, 7:00 PM Virginia Tech vs The Citadel | ",
 "Upcoming Nov 22 Virginia Tech at PRTC Keystone Classic | ",
 "Upcoming Dec 4, 7:00 PM Virginia Tech vs Pennsylvania | ",
 "Upcoming Dec 12, 10:00 AM Virginia Tech at National Duals Invitational | ",
 "Upcoming Dec 18, 7:00 PM Virginia Tech at App State | ",
 "Upcoming Jan 2 Virginia Tech at Southern Scuffle | ",
 "Upcoming Jan 10, 5:00 PM Virginia Tech at Stanford | ",
 "Upcoming Jan 15, 7:00 PM Virginia Tech vs Pitt | ",
 "Upcoming Jan 22, 7:00 PM Virginia Tech at Duke | ",
 "Upcoming Jan 29, 7:00 PM Virginia Tech vs Virginia | ",
 "Upcoming Feb 5, 7:00 PM Virginia Tech at North Carolina | ",
 "Upcoming Feb 19, 7:00 PM Virginia Tech vs NC State | ",
 "Upcoming Mar 6 Virginia Tech at ACC Championships | ",
 "Upcoming Mar 18 Virginia Tech at NCAA Championship | "
]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api14,"Basketball api-14");
  ownRecapsOnly(v_api6,"Basketball api-6");
  ownRecapsOnly(v_api2,"Cross Country api-2");
  ownRecapsOnly(v_api3,"Football api-3");
  ownRecapsOnly(v_api15,"Golf api-15");
  ownRecapsOnly(v_api7,"Golf api-7");
  ownRecapsOnly(v_api5,"Lacrosse api-5");
  ownRecapsOnly(v_api16,"Soccer api-16");
  ownRecapsOnly(v_api8,"Soccer api-8");
  ownRecapsOnly(v_api10,"Softball api-10");
  ownRecapsOnly(v_api17,"Tennis api-17");
  ownRecapsOnly(v_api9,"Tennis api-9");
  ownRecapsOnly(v_api12,"Track & Field api-12");
  ownRecapsOnly(v_api13,"Volleyball api-13");
  ownRecapsOnly(v_api18,"Wrestling api-18");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');

// The Hokie Invitational (volleyball, Aug 28-29) lists every match it hosts:
// a neutral match between two other teams ("Kent State vs Coppin State", the
// winner as the result text) is not Virginia Tech's.
assert.deepEqual(parse('Volleyball','api-13').filter(e=>/^Aug 2[89]/.test(e.display_time)).map(e=>e.opponent),['William & Mary','Kent State','Coppin State']);
// Golf: "1st/18 (286-278-280)", the place in the field and each round.
assert.deepEqual(parse('Golf','api-15').filter(e=>e.status==='Final').map(e=>[e.headline,e.results.map(r=>r.value).join(' / ')]),[["1st of 18","1st of 18 / 844 (286-278-280)"],["4th of 16","4th of 16 / 830 (277-278-275)"],["7th of 17","7th of 17 / 586 (294-292)"]]);
assert.deepEqual(parse('Golf','api-7').filter(e=>e.status==='Final').map(e=>e.headline),["13th of 17","T2nd of 17","13th of 13","2nd of 14"]);
// Swimming: the Hokie Belt Challenge is the team's intrasquad (Maroon vs
// Orange); the Oct 2 tri-meet is one meet with each opponent's result and
// its own story (the Penn State entry carried last season's).
{
  const swim=parse('Swimming & Diving','api-11');
  assert.ok(!swim.some(e=>/Hokie Belt/.test(e.opponent)));
  const tri=swim.find(e=>e.opponent==='Tri-Meet');
  assert.equal(tri.headline,'West Virginia: Men: W, 264-89 · Liberty: Women: W, 240-113 · Penn State: Women: W, 312-41 | Men: W, 265.50-87.50');
  assert.deepEqual(tri.results.map(r=>`${r.label}: ${r.value}`),['West Virginia: Men: W, 264-89','Liberty: Women: W, 240-113','Penn State: Women: W, 312-41 | Men: W, 265.50-87.50']);
  assert.match(tri.recap_url,/\/news\/2026\/10\/03\/virginia-tech-swim-dive-hokies-kick-off-season/);
}
// Wrestling's roster cards: the link wraps the whole card ("Chris Bacchioni
// 149 lbs Senior"); the card's title names the athlete.
{
  const card=(slug,name,fields)=>`<div class="roster-card-item" data-v-6ea3e9bb><a href="/sports/wrestling/roster/player/${slug}" class="roster-card-item__link"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${name}" class="image roster-card-item__image"><div class="roster-card-item__body"><div class="roster-card-item__content"><h3 class="roster-card-item__title">${name}</h3><div class="roster-players-cards-item__profile-fields"><span class="roster-player-card-profile-field__value">${fields[0]}</span><span class="roster-player-card-profile-field__value">${fields[1]}</span></div></div></div></a></div>`;
  const raw=card('chris-bacchioni','Chris Bacchioni',['149 lbs','Senior'])+card('bo-bassett','Bo Bassett',['141 lbs','Freshman']);
  assert.deepEqual(worker.rosterProfiles(raw,'https://hokiesports.com/sports/wrestling/roster').map(p=>[p.name,p.url]),[['Chris Bacchioni','https://hokiesports.com/sports/wrestling/roster/player/chris-bacchioni'],['Bo Bassett','https://hokiesports.com/sports/wrestling/roster/player/bo-bassett']]);
}
console.log('Virginia Tech module checks passed');
