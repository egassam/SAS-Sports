import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {oldDominionSchool} from '../src/schools/old-dominion.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='old-dominion');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,oldDominionHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/old-dominion-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads odusports.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['old-dominion'];
assert.equal(sports.length,12);
assert.deepEqual(Object.keys(oldDominionSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',oldDominionSchool.scheduleUrls],['roster',oldDominionSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('old-dominion|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'odusports.com',`${key} must stay on odusports.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/odusports\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/odusports\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(oldDominionSchool.scheduleUrls[`old-dominion|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'old-dominion|"+sport+"':"),`${sport} routes must live in the Old Dominion module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'old-dominion',host:'odusports.com',sportIds:Object.fromEntries(Object.entries(oldDominionSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(oldDominionSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(oldDominionSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,oldDominionSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,oldDominionSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Soccer","Tennis"]);
const parity={"Baseball":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-basketball/roster","https://odusports.com/sports/mens-basketball/roster"],"combined":true},"Field Hockey":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=26&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-golf/roster","https://odusports.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=27&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=28&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=29&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-soccer/roster","https://odusports.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/swimming/roster"],"combined":false},"Tennis":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=30&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/womens-tennis/roster","https://odusports.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=25&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=38&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://odusports.com/sports/wrestling/roster"],"combined":false}};

const now=new Date("2026-10-22T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(oldDominionSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.oldDominionHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=old-dominion)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api6=parse("Baseball","api-6");
  assert.deepEqual(v_api6.map(line),[]);
  const v_api1=parse("Basketball","api-1");
  assert.deepEqual(v_api1.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · Old Dominion vs Chris. Newport (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Old Dominion at Central Michigan | ",
 "Upcoming Nov 5, 6:30 PM Women's · Old Dominion vs Virginia State | ",
 "Upcoming Nov 8, 2:00 PM Women's · Old Dominion vs Tennessee St. | ",
 "Upcoming Nov 12, 6:00 PM Women's · Old Dominion at Richmond | ",
 "Upcoming Nov 15, 2:00 PM Women's · Old Dominion vs Virginia | ",
 "Upcoming Nov 19, 6:30 PM Women's · Old Dominion vs William & Mary | ",
 "Upcoming Nov 23 Women's · Old Dominion vs Memphis | ",
 "Upcoming Nov 25 Women's · Old Dominion vs Saint Mary's College | ",
 "Upcoming Nov 30, 6:00 PM Women's · Old Dominion at Navy | ",
 "Upcoming Dec 3, 7:00 PM Women's · Old Dominion at Columbia | ",
 "Upcoming Dec 15, 6:30 PM Women's · Old Dominion vs Virginia Union | ",
 "Upcoming Dec 19, 2:00 PM Women's · Old Dominion vs Southern Miss | ",
 "Upcoming Dec 22, 12:00 PM Women's · Old Dominion at Illinois | ",
 "Upcoming Dec 28, 2:00 PM Women's · Old Dominion vs Morgan St. | ",
 "Upcoming Dec 31, 7:30 PM Women's · Old Dominion at ULM | ",
 "Upcoming Jan 2, 4:00 PM Women's · Old Dominion at Louisiana Tech | ",
 "Upcoming Jan 6, 6:30 PM Women's · Old Dominion vs Louisiana | ",
 "Upcoming Jan 9, 1:00 PM Women's · Old Dominion vs South Alabama | ",
 "Upcoming Jan 14, 11:00 AM Women's · Old Dominion at App State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Old Dominion at Coastal Carolina | ",
 "Upcoming Jan 20, 6:30 PM Women's · Old Dominion vs James Madison | ",
 "Upcoming Jan 23, 4:00 PM Women's · Old Dominion vs Marshall | ",
 "Upcoming Jan 27, 11:00 AM Women's · Old Dominion at Georgia State | ",
 "Upcoming Jan 30 Women's · Old Dominion at James Madison | ",
 "Upcoming Feb 3, 11:00 AM Women's · Old Dominion at Arkansas State | ",
 "Upcoming Feb 6, 2:00 PM Women's · Old Dominion vs TBD | ",
 "Upcoming Feb 10, 11:00 AM Women's · Old Dominion vs Coastal Carolina | ",
 "Upcoming Feb 13, 6:30 PM Women's · Old Dominion vs Georgia State | ",
 "Upcoming Feb 18, 6:30 PM Women's · Old Dominion vs Georgia Southern | ",
 "Upcoming Feb 20, 4:00 PM Women's · Old Dominion vs App State | ",
 "Upcoming Feb 23, 6:00 PM Women's · Old Dominion at Marshall | ",
 "Upcoming Feb 26, 5:00 PM Women's · Old Dominion at Georgia Southern | ",
 "Upcoming Mar 2 Women's · Old Dominion vs TBD | "
]);
  const v_api2=parse("Basketball","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Upcoming Oct 24, 7:00 PM Men's · Old Dominion vs Virginia State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Old Dominion vs Western Michigan | ",
 "Upcoming Nov 4, 7:00 PM Men's · Old Dominion vs Regent | ",
 "Upcoming Nov 7, 5:00 PM Men's · Old Dominion at Bucknell | ",
 "Upcoming Nov 11, 7:00 PM Men's · Old Dominion at Norfolk State | ",
 "Upcoming Nov 14, 4:00 PM Men's · Old Dominion vs Longwood | ",
 "Upcoming Nov 17, 9:00 PM Men's · Old Dominion at Virginia | ",
 "Upcoming Nov 24, 7:00 PM Men's · Old Dominion vs Hampton | ",
 "Upcoming Nov 27, 5:00 PM Men's · Old Dominion at Virginia Tech | ",
 "Upcoming Dec 1, 7:00 PM Men's · Old Dominion vs Drexel | ",
 "Upcoming Dec 5, 2:00 PM Men's · Old Dominion vs Richmond | ",
 "Upcoming Dec 12 Men's · Old Dominion at George Mason | ",
 "Upcoming Dec 16, 7:00 PM Men's · Old Dominion at Marshall | ",
 "Upcoming Dec 19, 7:00 PM Men's · Old Dominion at South Alabama | ",
 "Upcoming Dec 22, 1:00 PM Men's · Old Dominion vs The Apprentice School | ",
 "Upcoming Dec 28, 5:00 PM Men's · Old Dominion vs Charleston Southern | ",
 "Upcoming Dec 31, 2:00 PM Men's · Old Dominion vs ULM | ",
 "Upcoming Jan 2, 2:00 PM Men's · Old Dominion vs Louisiana Tech | ",
 "Upcoming Jan 7, 8:00 PM Men's · Old Dominion at Louisiana | ",
 "Upcoming Jan 9, 3:00 PM Men's · Old Dominion at Southern Miss | ",
 "Upcoming Jan 13, 7:00 PM Men's · Old Dominion vs App State | ",
 "Upcoming Jan 16, 2:00 PM Men's · Old Dominion at James Madison | ",
 "Upcoming Jan 23, 7:00 PM Men's · Old Dominion vs Arkansas State | ",
 "Upcoming Jan 27, 6:30 PM Men's · Old Dominion at App State | ",
 "Upcoming Jan 30, 3:00 PM Men's · Old Dominion at Georgia Southern | ",
 "Upcoming Feb 3, 7:00 PM Men's · Old Dominion vs Georgia State | ",
 "Upcoming Feb 6 Men's · Old Dominion at MAC School | ",
 "Upcoming Feb 11, 7:00 PM Men's · Old Dominion vs Georgia Southern | ",
 "Upcoming Feb 13, 3:00 PM Men's · Old Dominion at Coastal Carolina | ",
 "Upcoming Feb 17, 7:00 PM Men's · Old Dominion vs James Madison | ",
 "Upcoming Feb 20, 7:00 PM Men's · Old Dominion vs Marshall | ",
 "Upcoming Feb 23 Men's · Old Dominion at Georgia State | ",
 "Upcoming Feb 26, 7:00 PM Men's · Old Dominion vs Coastal Carolina | ",
 "Upcoming Mar 2 Men's · Old Dominion vs TBD | "
]);
  const v_api15=parse("Field Hockey","api-15");
  assert.deepEqual(v_api15.map(line),[
 "Final Aug 28 Old Dominion at Ohio St. | W, 3-2",
 "Final Aug 29 Old Dominion at Bellarmine | W, 7-0",
 "Final Sep 4 Old Dominion vs Princeton | L, 0-4",
 "Final Sep 6 Old Dominion vs Penn | W, 3-0",
 "Final Sep 11 Old Dominion at North Carolina | W, 5-4 (OT)",
 "Final Sep 18 Old Dominion vs Providence | L, 0-2",
 "Final Sep 20 Old Dominion vs Delaware | W, 4-2",
 "Final Sep 27 Old Dominion vs St. Louis | W, 5-1",
 "Final Sep 28 Old Dominion at William & Mary | W, 2-0",
 "Final Oct 2 Old Dominion at Liberty | L, 0-2",
 "Final Oct 9 Old Dominion vs Villanova | W, 4-3 (OT)",
 "Final Oct 12 Old Dominion vs Queens (NC) | W, 9-0",
 "Final Oct 16 Old Dominion at Temple | W, 2-1",
 "Final Oct 18 Old Dominion at Richmond | W, 4-3 (OT)",
 "Upcoming Oct 23, 3:00 PM Old Dominion vs Connecticut | ",
 "Upcoming Oct 25, 11:00 AM Old Dominion vs Longwood | ",
 "Upcoming Oct 30, 1:00 PM Old Dominion at Georgetown | "
]);
  const v_api16=parse("Football","api-16");
  assert.deepEqual(v_api16.map(line),[
 "Final Sep 5 Old Dominion vs Norfolk State | W, 31-10",
 "Final Sep 12 Old Dominion at Virginia Tech | L, 21-44",
 "Final Sep 19 Old Dominion vs East Carolina | L, 17-20",
 "Final Sep 26 Old Dominion vs James Madison | L, 20-46",
 "Final Oct 3 Old Dominion at Georgia State | L, 10-42",
 "Final Oct 10 Old Dominion at Appalachian State | W, 10-3",
 "Final Oct 15 Old Dominion vs Georgia Southern | L, 15-23",
 "Upcoming Oct 24, 5:00 PM Old Dominion at Louisiana Tech | ",
 "Upcoming Oct 31, 1:00 PM Old Dominion vs Marshall | ",
 "Upcoming Nov 7 Old Dominion at Coastal Carolina | ",
 "Upcoming Nov 21, 3:30 PM Old Dominion at UConn | ",
 "Upcoming Nov 28 Old Dominion vs Southern Miss | "
]);
  const v_api26=parse("Golf","api-26");
  assert.deepEqual(v_api26.map(line),[
 "Final Sep 6 Women's · Old Dominion at Golfweek Fall Challenge | 6th of 23",
 "Final Sep 18 Women's · Old Dominion at Lady Paladin Invitational | 5th of 12",
 "Final Sep 28 Women's · Old Dominion at Tot Hill Farm Invitational | 5th of 12",
 "Final Oct 9 Women's · Old Dominion at Evie Odom Invitational | 9th of 14",
 "Final Oct 19 Women's · Old Dominion at Spider Invitational | T31st (Colombier) & T33rd (Fialová)",
 "Upcoming Jan 31 Women's · Old Dominion at Dominican Republic Classic | ",
 "Upcoming Feb 22 Women's · Old Dominion at UNF Momentum Transportation Collegiate | ",
 "Upcoming Mar 15 Women's · Old Dominion at Briar's Creek Invitational | ",
 "Upcoming Mar 27 Women's · Old Dominion at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 4 Women's · Old Dominion at Ironwood Invitational | ",
 "Upcoming Apr 19 Women's · Old Dominion at Sun Belt Championship | "
]);
  const v_api19=parse("Golf","api-19");
  assert.deepEqual(v_api19.map(line),[
 "Final Sep 6 Men's · Old Dominion at Golfweek Fall Challenge | T5th of 16",
 "Final Sep 21 Men's · Old Dominion at Florida Atlantic Invitational | 11th of 11",
 "Final Sep 28 Men's · Old Dominion at Ironwood Collegiate Classic | T3rd of 14",
 "Final Oct 12 Men's · Old Dominion at Phoenix Invitational | T6th of 17",
 "Upcoming Oct 25 Men's · Old Dominion at ODU/OBX Intercollegiate | ",
 "Upcoming Feb 12 Men's · Old Dominion at Palmas del Mar Collegiate | ",
 "Upcoming Mar 8 Men's · Old Dominion at Babygrande Golf Donald Ross Collegiate | ",
 "Upcoming Mar 15 Men's · Old Dominion at Auburn Tiger Invitational | ",
 "Upcoming Mar 29 Men's · Old Dominion at ECU Intercollegiate | ",
 "Upcoming Apr 5 Men's · Old Dominion at Missouri Tiger Invitational | ",
 "Upcoming Apr 26 Men's · Old Dominion at Sun Belt Championship | "
]);
  const v_api27=parse("Lacrosse","api-27");
  assert.deepEqual(v_api27.map(line),[]);
  const v_api28=parse("Rowing","api-28");
  assert.deepEqual(v_api28.map(line),[
 "Upcoming Oct 31 Old Dominion at TBD | ",
 "Upcoming Nov 8 Old Dominion at TBD | ",
 "Upcoming Mar 26 Old Dominion at Sarasota 2K | ",
 "Upcoming Apr 3 Old Dominion vs Old Dominion | ",
 "Upcoming Apr 11 Old Dominion at TBD | ",
 "Upcoming Apr 17 Old Dominion vs Delaware | ",
 "Upcoming Apr 23 Old Dominion at TBD | ",
 "Upcoming May 16 Old Dominion at Big 12 Championships | "
]);
  const v_api29=parse("Soccer","api-29");
  assert.deepEqual(v_api29.map(line),[
 "Final Aug 13 Women's · Old Dominion at Virginia Tech | L, 1-2",
 "Final Aug 16 Women's · Old Dominion vs Longwood | W, 3-0",
 "Final Aug 20 Women's · Old Dominion at UNCW | L, 1-2",
 "Final Aug 23 Women's · Old Dominion at Wake Forest | L, 0-1",
 "Final Aug 27 Women's · Old Dominion vs Duke | L, 1-2",
 "Final Sep 3 Women's · Old Dominion at Maryland | W, 2-0",
 "Final Sep 13 Women's · Old Dominion at Liberty | L, 1-2",
 "Final Sep 18 Women's · Old Dominion at ULM | W, 1-0",
 "Final Sep 24 Women's · Old Dominion vs Louisiana | T, 0-0",
 "Final Sep 27 Women's · Old Dominion at Appalachian St. | T, 0-0",
 "Final Oct 3 Women's · Old Dominion vs South Alabama | W, 1-0",
 "Final Oct 8 Women's · Old Dominion vs Marshall | W, 3-0",
 "Final Oct 11 Women's · Old Dominion at James Madison | L, 1-2",
 "Final Oct 18 Women's · Old Dominion vs Georgia Southern | W, 2-1",
 "Today Oct 22, 8:30 PM Women's · Old Dominion at Louisiana Tech | ",
 "Upcoming Oct 25, 2:00 PM Women's · Old Dominion vs Coastal Caro. | ",
 "Upcoming Nov 1, 5:00 PM Women's · Old Dominion at Georgia St. | "
]);
  const v_api20=parse("Soccer","api-20");
  assert.deepEqual(v_api20.map(line),[
 "Final Aug 20 Men's · Old Dominion at George Washington | W, 3-1",
 "Final Aug 24 Men's · Old Dominion vs Elon | W, 5-3",
 "Final Aug 28 Men's · Old Dominion vs Lehigh | W, 2-0",
 "Final Sep 2 Men's · Old Dominion vs Radford | W, 7-1",
 "Final Sep 6 Men's · Old Dominion vs Bucknell | W, 3-0",
 "Final Sep 11 Men's · Old Dominion vs Maryland-Baltimore-County | W, 5-1",
 "Final Sep 14 Men's · Old Dominion at VCU | W, 2-1",
 "Final Sep 18 Men's · Old Dominion vs South Carolina | L, 1-2",
 "Final Sep 22 Men's · Old Dominion vs William & Mary | W, 2-1",
 "Final Sep 27 Men's · Old Dominion at Georgia Southern | L, 1-3",
 "Final Oct 2 Men's · Old Dominion at Kentucky | L, 2-4",
 "Final Oct 9 Men's · Old Dominion vs West Virginia | W, 2-1",
 "Final Oct 17 Men's · Old Dominion at UCF | L, 1-5",
 "Final Oct 21 Men's · Old Dominion vs Georgia St. | W, 2-1",
 "Upcoming Oct 25, 6:00 PM Men's · Old Dominion at Coastal Caro. | ",
 "Upcoming Oct 30, 7:00 PM Men's · Old Dominion vs James Madison | ",
 "Upcoming Nov 3, 7:15 PM Men's · Old Dominion at Marshall | "
]);
  const v_api4=parse("Swimming & Diving","api-4");
  assert.deepEqual(v_api4.map(line),[
 "Final Oct 2 Old Dominion vs George Mason | L, 113-149",
 "Final Oct 9 Old Dominion at Gardner-Webb | W, 204.5-131.5",
 "Upcoming Nov 7, 2:00 PM Old Dominion vs Howard | ",
 "Upcoming Nov 19, 10:00 AM Old Dominion at Navy | ",
 "Upcoming Dec 12, 8:30 AM Old Dominion at Open Water Championships | ",
 "Upcoming Dec 19, 10:00 AM Old Dominion vs Florida Atlantic | ",
 "Upcoming Jan 8, 4:00 PM Old Dominion vs Davidson | ",
 "Upcoming Jan 8, 4:00 PM Old Dominion vs William & Mary, UNCW, Richmond | ",
 "Upcoming Jan 22, 2:00 PM Old Dominion at American | ",
 "Upcoming Feb 17, 9:30 AM Old Dominion at ASUN Tournament | ",
 "Upcoming Mar 11, 9:30 AM Old Dominion at National Invitational Tournament | ",
 "Upcoming Mar 17 Old Dominion at Women's NCAA Championship | ",
 "Upcoming Mar 24 Old Dominion at Men's NCAA Championship | "
]);
  const v_api30=parse("Tennis","api-30");
  assert.deepEqual(v_api30.map(line),[
 "Upcoming Oct 23 Women's · Old Dominion at Rome Invitational | ",
 "Upcoming Nov 5 Women's · Old Dominion at ITA Masters | ",
 "Upcoming Nov 5 Women's · Old Dominion at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Old Dominion at NCAA Individual Championships | "
]);
  const v_api3=parse("Tennis","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Upcoming Nov 5 Men's · Old Dominion at ITA Conference Masters | ",
 "Upcoming Nov 5 Men's · Old Dominion at ITA East Sectional Championships | ",
 "Upcoming Nov 6 Men's · Old Dominion at Tribe Invite | ",
 "Upcoming Nov 17 Men's · Old Dominion at NCAA Individual Championships | "
]);
  const v_api25=parse("Volleyball","api-25");
  assert.deepEqual(v_api25.map(line),[
 "Final Aug 28 Old Dominion vs St. John's (N.Y.) | W, 3-2",
 "Final Aug 28 Old Dominion vs USC Upstate | L, 2-3",
 "Final Aug 29 Old Dominion vs Elon | L, 1-3",
 "Final Sep 1 Old Dominion at Norfolk State | W, 3-0",
 "Final Sep 4 Old Dominion vs Virginia Tech | L, 0-3",
 "Final Sep 5 Old Dominion at Winthrop | L, 2-3",
 "Final Sep 11 Old Dominion vs Navy | W, 3-0",
 "Final Sep 13 Old Dominion vs Maryland Eastern Shore | W, 3-1",
 "Final Sep 17 Old Dominion at East Carolina | L, 0-3",
 "Final Sep 18 Old Dominion vs Campbell | L, 2-3",
 "Final Sep 19 Old Dominion vs Maryland | L, 0-3",
 "Final Sep 24 Old Dominion vs App State | L, 1-3",
 "Final Sep 25 Old Dominion vs App State | L, 0-3",
 "Final Oct 2 Old Dominion at Georgia Southern | L, 0-3",
 "Final Oct 3 Old Dominion at Georgia Southern | L, 0-3",
 "Final Oct 9 Old Dominion vs Coastal Carolina | L, 1-3",
 "Final Oct 10 Old Dominion vs Coastal Carolina | L, 1-3",
 "Final Oct 16 Old Dominion at Georgia State | L, 1-3",
 "Final Oct 17 Old Dominion at Georgia State | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Old Dominion vs Marshall | ",
 "Upcoming Oct 24, 2:00 PM Old Dominion vs Marshall | ",
 "Upcoming Oct 30, 7:00 PM Old Dominion at Louisiana Tech | ",
 "Upcoming Oct 31, 12:00 PM Old Dominion at Louisiana Tech | ",
 "Upcoming Nov 6, 6:00 PM Old Dominion at James Madison | ",
 "Upcoming Nov 7, 1:00 PM Old Dominion at James Madison | ",
 "Upcoming Nov 13, 6:00 PM Old Dominion vs ULM | ",
 "Upcoming Nov 14, 2:00 PM Old Dominion vs ULM | ",
 "Upcoming Nov 19 Old Dominion vs TBD | "
]);
  const v_api38=parse("Wrestling","api-38");
  assert.deepEqual(v_api38.map(line),[]);
  ownRecapsOnly(v_api6,"Baseball api-6");
  ownRecapsOnly(v_api1,"Basketball api-1");
  ownRecapsOnly(v_api2,"Basketball api-2");
  ownRecapsOnly(v_api15,"Field Hockey api-15");
  ownRecapsOnly(v_api16,"Football api-16");
  ownRecapsOnly(v_api26,"Golf api-26");
  ownRecapsOnly(v_api19,"Golf api-19");
  ownRecapsOnly(v_api27,"Lacrosse api-27");
  ownRecapsOnly(v_api28,"Rowing api-28");
  ownRecapsOnly(v_api29,"Soccer api-29");
  ownRecapsOnly(v_api20,"Soccer api-20");
  ownRecapsOnly(v_api4,"Swimming & Diving api-4");
  ownRecapsOnly(v_api30,"Tennis api-30");
  ownRecapsOnly(v_api3,"Tennis api-3");
  ownRecapsOnly(v_api25,"Volleyball api-25");
  ownRecapsOnly(v_api38,"Wrestling api-38");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Old Dominion module checks passed');
