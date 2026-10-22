import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {seattleUSchool} from '../src/schools/seattle-u.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='seattle-u');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,seattleUHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/seattle-u-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads goseattleu.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['seattle-u'];
assert.equal(sports.length,11);
assert.deepEqual(Object.keys(seattleUSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',seattleUSchool.scheduleUrls],['roster',seattleUSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('seattle-u|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'goseattleu.com',`${key} must stay on goseattleu.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/goseattleu\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/goseattleu\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(seattleUSchool.scheduleUrls[`seattle-u|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'seattle-u|"+sport+"':"),`${sport} routes must live in the Seattle U module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'seattle-u',host:'goseattleu.com',sportIds:Object.fromEntries(Object.entries(seattleUSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(seattleUSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(seattleUSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,seattleUSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,seattleUSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Soccer","Swimming & Diving"]);
const parity={"Baseball":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-basketball/roster","https://goseattleu.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-golf/roster","https://goseattleu.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-soccer/roster","https://goseattleu.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-swimming/roster","https://goseattleu.com/sports/mens-swimming/roster"],"combined":true},"Tennis":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goseattleu.com/sports/volleyball/roster"],"combined":false}};

const now=new Date("2026-10-22T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(seattleUSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.seattleUHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=seattle-u)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[]);
  const v_api11=parse("Basketball","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Upcoming Oct 24, 1:00 PM Women's · Seattle U vs CSU Dominguez Hills (Exhibition) | ",
 "Upcoming Nov 2, 10:00 AM Women's · Seattle U at New Mexico | ",
 "Upcoming Nov 6, 6:00 PM Women's · Seattle U vs UC Riverside | ",
 "Upcoming Nov 9, 6:00 PM Women's · Seattle U at UC Santa Barbara | ",
 "Upcoming Nov 11, 6:00 PM Women's · Seattle U at Cal Poly | ",
 "Upcoming Nov 18, 11:00 AM Women's · Seattle U vs Pacific Lutheran | ",
 "Upcoming Nov 21, 6:15 PM Women's · Seattle U vs Chicago State | ",
 "Upcoming Nov 22 Women's · Seattle U vs Louisville/Alaska-Anchorage | ",
 "Upcoming Nov 25, 12:00 PM Women's · Seattle U vs Weber State | ",
 "Upcoming Nov 29, 1:00 PM Women's · Seattle U vs Montana | ",
 "Upcoming Dec 5, 1:00 PM Women's · Seattle U vs North Texas | ",
 "Upcoming Dec 12, 1:00 PM Women's · Seattle U vs Lewis & Clark | ",
 "Upcoming Dec 18, 6:00 PM Women's · Seattle U vs Portland State | ",
 "Upcoming Dec 21, 2:00 PM Women's · Seattle U at Idaho | ",
 "Upcoming Dec 31, 6:00 PM Women's · Seattle U at LMU | ",
 "Upcoming Jan 2 Women's · Seattle U at Pepperdine | ",
 "Upcoming Jan 7, 6:00 PM Women's · Seattle U vs Denver | ",
 "Upcoming Jan 9, 1:00 PM Women's · Seattle U vs San Diego | ",
 "Upcoming Jan 14 Women's · Seattle U at Santa Clara | ",
 "Upcoming Jan 16 Women's · Seattle U at Saint Mary's | ",
 "Upcoming Jan 21, 6:00 PM Women's · Seattle U vs San Francisco | ",
 "Upcoming Jan 23, 1:00 PM Women's · Seattle U vs Pepperdine | ",
 "Upcoming Jan 28 Women's · Seattle U at Denver | ",
 "Upcoming Jan 30, 1:00 PM Women's · Seattle U vs Saint Mary's | ",
 "Upcoming Feb 4, 6:00 PM Women's · Seattle U at Portland | ",
 "Upcoming Feb 6, 2:00 PM Women's · Seattle U at Pacific | ",
 "Upcoming Feb 11, 6:00 PM Women's · Seattle U vs Santa Clara | ",
 "Upcoming Feb 13, 1:00 PM Women's · Seattle U vs LMU | ",
 "Upcoming Feb 18, 6:00 PM Women's · Seattle U at San Diego | ",
 "Upcoming Feb 20, 1:00 PM Women's · Seattle U vs Portland | ",
 "Upcoming Feb 25, 6:00 PM Women's · Seattle U at San Francisco | ",
 "Upcoming Feb 27, 1:00 PM Women's · Seattle U vs Pacific | "
]);
  const v_api3=parse("Basketball","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Final Oct 15 Men's · Seattle U at Oregon (Exhibition) | W, 71-65",
 "Upcoming Nov 2, 9:00 PM Men's · Seattle U at Hawaii | ",
 "Upcoming Nov 7, 7:00 PM Men's · Seattle U vs Portland St. | ",
 "Upcoming Nov 11, 7:00 PM Men's · Seattle U vs UTSA | ",
 "Upcoming Nov 14, 7:00 PM Men's · Seattle U vs Idaho St. | ",
 "Upcoming Nov 17 Men's · Seattle U at California Baptist | ",
 "Upcoming Nov 22, 6:30 PM Men's · Seattle U vs UC San Diego | ",
 "Upcoming Nov 23 Men's · Seattle U vs Loyola Chicago/San Jose State | ",
 "Upcoming Nov 28, 2:00 PM Men's · Seattle U vs UC Irvine | ",
 "Upcoming Dec 1, 7:00 PM Men's · Seattle U vs Norfolk State | ",
 "Upcoming Dec 5 Men's · Seattle U at San Jose St. | ",
 "Upcoming Dec 12, 5:00 PM Men's · Seattle U vs Puget Sound | ",
 "Upcoming Dec 15, 7:00 PM Men's · Seattle U vs Austin Peay | ",
 "Upcoming Dec 19, 4:30 PM Men's · Seattle U vs Washington State | ",
 "Upcoming Dec 22, 7:00 PM Men's · Seattle U vs UC Davis | ",
 "Upcoming Dec 29 Men's · Seattle U at Illinois | ",
 "Upcoming Jan 2, 7:00 PM Men's · Seattle U vs Loyola Marymount | ",
 "Upcoming Jan 6, 7:00 PM Men's · Seattle U vs Pepperdine | ",
 "Upcoming Jan 9 Men's · Seattle U at Denver | ",
 "Upcoming Jan 13, 7:00 PM Men's · Seattle U vs San Francisco | ",
 "Upcoming Jan 16 Men's · Seattle U at Pacific | ",
 "Upcoming Jan 20, 7:00 PM Men's · Seattle U vs San Diego | ",
 "Upcoming Jan 23, 7:00 PM Men's · Seattle U vs Portland | ",
 "Upcoming Jan 27 Men's · Seattle U at Loyola Marymount | ",
 "Upcoming Feb 3 Men's · Seattle U at Santa Clara | ",
 "Upcoming Feb 6, 8:30 PM Men's · Seattle U vs Saint Mary's | ",
 "Upcoming Feb 10 Men's · Seattle U at Pepperdine | ",
 "Upcoming Feb 13 Men's · Seattle U at San Diego | ",
 "Upcoming Feb 16, 8:00 PM Men's · Seattle U vs Santa Clara | ",
 "Upcoming Feb 20, 7:00 PM Men's · Seattle U vs Denver | ",
 "Upcoming Feb 24 Men's · Seattle U at Saint Mary's | ",
 "Upcoming Feb 27 Men's · Seattle U at San Francisco | ",
 "Upcoming Mar 5 Men's · Seattle U at WCC Championship | "
]);
  const v_api2=parse("Cross Country","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Final Sep 11 Seattle U at Ash Creek Collegiate | Men's team: 4th / Women's team: 4th",
 "Final Sep 18 Seattle U at Saint Mary's College Invite | Men's team: 6th / Women's team: 9th",
 "Final Sep 26 Seattle U at Mike Johnson Classic | Men's team: 7th / Women's team: 10th",
 "Final Oct 3 Seattle U at Charles Bowles Invite | Men's team: 5th / Women's team: 6th",
 "Final Oct 17 Seattle U at George Oja Invite | Men's team: 5th / Women's team: 6th",
 "Upcoming Oct 30 Seattle U at WCC Championship | ",
 "Upcoming Nov 13 Seattle U at NCAA West Regional | ",
 "Upcoming Nov 21 Seattle U at NCAA Championship | "
]);
  const v_api12=parse("Golf","api-12");
  assert.deepEqual(v_api12.map(line),[
 "Final Sep 14 Women's · Seattle U at Leadership & Golf Invitational | 14th of 17",
 "Final Sep 21 Women's · Seattle U at Red Bandanna Invitational | 2nd of 15",
 "Final Oct 5 Women's · Seattle U at Pat Lesser Harbottle Invitational | 6th of 16",
 "Final Oct 19 Women's · Seattle U at Route 66 Invitational | 16th of 16",
 "Upcoming Feb 13 Women's · Seattle U at Alice and John Wallace Classic | ",
 "Upcoming Feb 22 Women's · Seattle U at Causeway Invitational | ",
 "Upcoming Mar 9 Women's · Seattle U at Juli Inkster | ",
 "Upcoming Mar 22 Women's · Seattle U at Santa Clara Invitational | ",
 "Upcoming Apr 5 Women's · Seattle U at Huntington Bank Intercollegiate | ",
 "Upcoming Apr 23 Women's · Seattle U at WCC Championship | "
]);
  const v_api4=parse("Golf","api-4");
  assert.deepEqual(v_api4.map(line),[
 "Final Sep 1 Men's · Seattle U at Pan Pacific University Golf League Super Tournament | 5th of 14",
 "Final Sep 10 Men's · Seattle U at Ram Masters Invitational | 14th of 16",
 "Final Sep 21 Men's · Seattle U at CDA National Reserve Invitational | 6th of 16",
 "Final Oct 12 Men's · Seattle U at Visit Stockton Pacific Invitational | 7th of 18",
 "Final Oct 19 Men's · Seattle U at Saint Mary's Invitational | 9th of 18",
 "Upcoming Feb 11 Men's · Seattle U at Burns Intercollegiate | ",
 "Upcoming Mar 5 Men's · Seattle U at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Men's · Seattle U at Duck Invitational | ",
 "Upcoming Mar 29 Men's · Seattle U at Wyoming Cowboy Classic | ",
 "Upcoming Apr 19 Men's · Seattle U at Redhawk Invitational | ",
 "Upcoming Apr 30 Men's · Seattle U at WCC Championship | "
]);
  const v_api13=parse("Rowing","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Upcoming Nov 1 Seattle U at Head of the Lake | "
]);
  const v_api14=parse("Soccer","api-14");
  assert.deepEqual(v_api14.map(line),[
 "Final Aug 13 Women's · Seattle U vs Kansas State | L, 0-4",
 "Final Aug 15 Women's · Seattle U vs Texas Tech | T, 0-0",
 "Final Aug 20 Women's · Seattle U vs Montana | W, 4-0",
 "Final Aug 23 Women's · Seattle U vs Simon Fraser | T, 1-1",
 "Final Aug 27 Women's · Seattle U vs Nevada | W, 4-0",
 "Final Aug 30 Women's · Seattle U vs Gonzaga | W, 3-2",
 "Final Sep 4 Women's · Seattle U at Washington | L, 0-1",
 "Final Sep 10 Women's · Seattle U at Oregon State | W, 4-0",
 "Final Sep 13 Women's · Seattle U vs Central Washington | W, 4-1",
 "Final Sep 16 Women's · Seattle U at Washington State | L, 1-2",
 "Final Sep 19 Women's · Seattle U vs Cal Poly | W, 2-0",
 "Final Sep 26 Women's · Seattle U vs San Francisco | W, 4-0",
 "Final Oct 3 Women's · Seattle U at Pepperdine | L, 1-3",
 "Final Oct 7 Women's · Seattle U vs San Diego | W, 4-0",
 "Final Oct 10 Women's · Seattle U at Pacific | W, 2-1",
 "Final Oct 17 Women's · Seattle U vs Santa Clara | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Women's · Seattle U vs Loyola Marymount | ",
 "Upcoming Oct 28, 6:00 PM Women's · Seattle U at Portland | ",
 "Upcoming Oct 31, 1:00 PM Women's · Seattle U at Saint Mary's | ",
 "Upcoming Nov 7, 1:00 PM Women's · Seattle U vs Denver | "
]);
  const v_api5=parse("Soccer","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Final Aug 20 Men's · Seattle U at Saint Louis | L, 0-4",
 "Final Aug 23 Men's · Seattle U at Michigan State | L, 1-2",
 "Final Aug 31 Men's · Seattle U vs Cal St. Fullerton | W, 7-1",
 "Final Sep 3 Men's · Seattle U vs UC Davis | W, 6-1",
 "Final Sep 13 Men's · Seattle U at Western Mich. | W, 3-0",
 "Final Sep 20 Men's · Seattle U vs Lindenwood | T, 1-1",
 "Final Sep 23 Men's · Seattle U at Oregon State | L, 1-3",
 "Final Sep 26 Men's · Seattle U vs Santa Clara | T, 0-0",
 "Final Sep 30 Men's · Seattle U at Pacific | T, 3-3",
 "Final Oct 3 Men's · Seattle U vs Saint Mary's | W, 4-2",
 "Final Oct 14 Men's · Seattle U at Washington | L, 1-3",
 "Final Oct 17 Men's · Seattle U at Loyola Marymount | L, 0-2",
 "Final Oct 21 Men's · Seattle U vs Portland | L, 0-3",
 "Upcoming Oct 24, 7:00 PM Men's · Seattle U at San Francisco | ",
 "Upcoming Oct 31, 7:00 PM Men's · Seattle U vs San Diego | ",
 "Upcoming Nov 6, 4:00 PM Men's · Seattle U at Denver | "
]);
  const v_api8=parse("Softball","api-8");
  assert.deepEqual(v_api8.map(line),[]);
  const v_api15=parse("Swimming & Diving","api-15");
  assert.deepEqual(v_api15.map(line),[
 "Final Oct 9 Women's · Seattle U at Idaho | L, 62-232",
 "Final Oct 10 Women's · Seattle U at Washington State | L, 43-219",
 "Upcoming Oct 23, 4:00 PM Women's · Seattle U at Pepperdine / Denver | ",
 "Upcoming Nov 7, 9:15 AM Women's · Seattle U vs Pacific and Alaska Fairbanks | ",
 "Upcoming Nov 19 Women's · Seattle U at Northwest College Invitational | ",
 "Upcoming Dec 18 Women's · Seattle U at Hawaii / CBU and California Baptist | ",
 "Upcoming Jan 8 Women's · Seattle U at Air Force / Colorado Mesa | ",
 "Upcoming Jan 22 Women's · Seattle U at Saint Mary's | ",
 "Upcoming Feb 5 Women's · Seattle U at Cal State Bakersfield | ",
 "Upcoming Feb 17 Women's · Seattle U at MPSF Championships | "
]);
  const v_api6=parse("Swimming & Diving","api-6");
  assert.deepEqual(v_api6.map(line),[
 "Final Oct 9 Men's · Seattle U at Puget Sound / Simon Fraser | Completed",
 "Upcoming Oct 23, 4:00 PM Men's · Seattle U at Denver | ",
 "Upcoming Nov 7, 9:15 AM Men's · Seattle U vs Pacific | ",
 "Upcoming Nov 19 Men's · Seattle U at Idaho | ",
 "Upcoming Dec 18 Men's · Seattle U at Hawaii | ",
 "Upcoming Jan 8 Men's · Seattle U at Air Force / Colorado Mesa | ",
 "Upcoming Jan 22 Men's · Seattle U at Saint Mary's | ",
 "Upcoming Feb 5 Men's · Seattle U at Cal State Bakersfield | ",
 "Upcoming Feb 22 Men's · Seattle U at MPSF Championships | "
]);
  const v_api16=parse("Tennis","api-16");
  assert.deepEqual(v_api16.map(line),[
 "Final Sep 26 Seattle U at Eastern Washington | Completed",
 "Final Oct 8 Seattle U at ITA Regionals | Completed",
 "Upcoming Nov 6 Seattle U at Oregon | ",
 "Upcoming Jan 16, 2:00 PM Seattle U vs Montana | ",
 "Upcoming Jan 17, 11:00 AM Seattle U at Gonzaga | ",
 "Upcoming Jan 23 Seattle U at Washington State | ",
 "Upcoming Jan 24 Seattle U vs Idaho | ",
 "Upcoming Feb 6 Seattle U vs UC Riverside | ",
 "Upcoming Feb 7 Seattle U at Oregon | ",
 "Upcoming Feb 12, 12:00 PM Seattle U at Puget Sound | ",
 "Upcoming Feb 13, 12:00 PM Seattle U vs Sacramento State | ",
 "Upcoming Feb 18 Seattle U vs Loyola Marymount | ",
 "Upcoming Feb 20 Seattle U at Portland State | ",
 "Upcoming Mar 5 Seattle U at Montana State | ",
 "Upcoming Mar 6 Seattle U vs New Mexico State | ",
 "Upcoming Mar 12, 10:00 AM Seattle U vs Utah State | ",
 "Upcoming Mar 21 Seattle U at Denver | ",
 "Upcoming Mar 26 Seattle U at Pacific | ",
 "Upcoming Mar 27 Seattle U at Saint Mary's | ",
 "Upcoming Apr 3 Seattle U at Santa Clara | ",
 "Upcoming Apr 18 Seattle U vs Portland | "
]);
  const v_api9=parse("Track & Field","api-9");
  assert.deepEqual(v_api9.map(line),[]);
  const v_api10=parse("Volleyball","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Final Aug 28 Seattle U vs Chicago State | W, 3-0",
 "Final Aug 29 Seattle U vs North Dakota | W, 3-2",
 "Final Aug 30 Seattle U vs Eastern Washington | L, 1-3",
 "Final Sep 3 Seattle U vs Montana | L, 0-3",
 "Final Sep 4 Seattle U vs California Baptist | L, 1-3",
 "Final Sep 5 Seattle U at Oregon State | L, 0-3",
 "Final Sep 11 Seattle U vs Southern Utah | W, 3-1",
 "Final Sep 17 Seattle U at Gonzaga | L, 1-3",
 "Final Sep 18 Seattle U vs Montana | L, 0-3",
 "Final Sep 19 Seattle U vs North Dakota State | L, 0-3",
 "Final Sep 26 Seattle U vs Portland | L, 0-3",
 "Final Oct 1 Seattle U vs San Francisco | L, 0-3",
 "Final Oct 3 Seattle U vs Santa Clara | L, 0-3",
 "Final Oct 8 Seattle U at Saint Mary's | L, 0-3",
 "Final Oct 10 Seattle U at Pacific | W, 3-1",
 "Final Oct 15 Seattle U vs San Diego | L, 0-3",
 "Final Oct 17 Seattle U vs Denver | L, 0-3",
 "Upcoming Oct 24, 1:00 PM Seattle U at Portland | ",
 "Upcoming Oct 29, 6:00 PM Seattle U vs Pepperdine | ",
 "Upcoming Oct 31, 1:00 PM Seattle U vs LMU | ",
 "Upcoming Nov 5, 7:00 PM Seattle U at Santa Clara | ",
 "Upcoming Nov 7, 12:00 PM Seattle U at San Francisco | ",
 "Upcoming Nov 12, 6:00 PM Seattle U vs Pacific | ",
 "Upcoming Nov 14, 1:00 PM Seattle U vs Saint Mary's | ",
 "Upcoming Nov 19, 5:00 PM Seattle U at Denver | ",
 "Upcoming Nov 21, 12:00 PM Seattle U at San Diego | ",
 "Upcoming Nov 25, 6:00 PM Seattle U at LMU | ",
 "Upcoming Nov 28, 12:00 PM Seattle U at Pepperdine | "
]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api11,"Basketball api-11");
  ownRecapsOnly(v_api3,"Basketball api-3");
  ownRecapsOnly(v_api2,"Cross Country api-2");
  ownRecapsOnly(v_api12,"Golf api-12");
  ownRecapsOnly(v_api4,"Golf api-4");
  ownRecapsOnly(v_api13,"Rowing api-13");
  ownRecapsOnly(v_api14,"Soccer api-14");
  ownRecapsOnly(v_api5,"Soccer api-5");
  ownRecapsOnly(v_api8,"Softball api-8");
  ownRecapsOnly(v_api15,"Swimming & Diving api-15");
  ownRecapsOnly(v_api6,"Swimming & Diving api-6");
  ownRecapsOnly(v_api16,"Tennis api-16");
  ownRecapsOnly(v_api9,"Track & Field api-9");
  ownRecapsOnly(v_api10,"Volleyball api-10");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Seattle U module checks passed');
