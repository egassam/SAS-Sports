import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sanJoseStateSchool} from '../src/schools/san-jose-state.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='san-jose-state');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,sanJoseStateHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/san-jose-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads sjsuspartans.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['san-jose-state'];
assert.equal(sports.length,14);
assert.deepEqual(Object.keys(sanJoseStateSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',sanJoseStateSchool.scheduleUrls],['roster',sanJoseStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('san-jose-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'sjsuspartans.com',`${key} must stay on sjsuspartans.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/sjsuspartans\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/sjsuspartans\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(sanJoseStateSchool.scheduleUrls[`san-jose-state|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'san-jose-state|"+sport+"':"),`${sport} routes must live in the San Jose State module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'san-jose-state',host:'sjsuspartans.com',sportIds:Object.fromEntries(Object.entries(sanJoseStateSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(sanJoseStateSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(sanJoseStateSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,sanJoseStateSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,sanJoseStateSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Soccer","Water Polo"]);
const parity={"Baseball":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-basketball/roster","https://sjsuspartans.com/sports/mens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=36&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-golf/roster","https://sjsuspartans.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-soccer/roster","https://sjsuspartans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=37&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=23&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://sjsuspartans.com/sports/womens-water-polo/roster","https://sjsuspartans.com/sports/mens-water-polo/roster"],"combined":true}};

const now=new Date("2026-10-22T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(sanJoseStateSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sanJoseStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=san-jose-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[
 "Upcoming Mar 25 San Jose State vs Nevada | ",
 "Upcoming Mar 26 San Jose State vs Nevada | ",
 "Upcoming Mar 27 San Jose State vs Nevada | ",
 "Upcoming Apr 2 San Jose State at Grand Canyon | ",
 "Upcoming Apr 3 San Jose State at Grand Canyon | ",
 "Upcoming Apr 4 San Jose State at Grand Canyon | ",
 "Upcoming Apr 9 San Jose State vs UNLV | ",
 "Upcoming Apr 10 San Jose State vs UNLV | ",
 "Upcoming Apr 11 San Jose State vs UNLV | ",
 "Upcoming Apr 16 San Jose State at New Mexico | ",
 "Upcoming Apr 17 San Jose State at New Mexico | ",
 "Upcoming Apr 18 San Jose State at New Mexico | ",
 "Upcoming Apr 23 San Jose State vs UC Davis | ",
 "Upcoming Apr 24 San Jose State vs UC Davis | ",
 "Upcoming Apr 25 San Jose State vs UC Davis | ",
 "Upcoming Apr 30 San Jose State at Utah Tech | ",
 "Upcoming May 1 San Jose State at Utah Tech | ",
 "Upcoming May 2 San Jose State at Utah Tech | ",
 "Upcoming May 7 San Jose State vs Air Force | ",
 "Upcoming May 8 San Jose State vs Air Force | ",
 "Upcoming May 9 San Jose State vs Air Force | ",
 "Upcoming May 14 San Jose State at Hawaii | ",
 "Upcoming May 16 San Jose State at Hawaii | ",
 "Upcoming May 16 San Jose State at Hawaii | "
]);
  const v_api13=parse("Basketball","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Upcoming Oct 28, 7:00 PM Women's · San Jose State vs Cal State East Bay (Exhibition) | ",
 "Upcoming Nov 2, 10:00 AM Women's · San Jose State at Nebraska | ",
 "Upcoming Nov 10, 4:00 PM Women's · San Jose State at Oklahoma | ",
 "Upcoming Nov 15, 1:00 PM Women's · San Jose State vs Portland State | ",
 "Upcoming Nov 18, 11:00 AM Women's · San Jose State vs California Baptist | ",
 "Upcoming Nov 21, 11:00 AM Women's · San Jose State vs Long Beach State | ",
 "Upcoming Nov 24, 5:30 PM Women's · San Jose State at Arizona State | ",
 "Upcoming Nov 28, 4:00 PM Women's · San Jose State at Saint Mary's | ",
 "Upcoming Dec 2, 7:00 PM Women's · San Jose State vs Pepperdine | ",
 "Upcoming Dec 5 Women's · San Jose State at Utah State | ",
 "Upcoming Dec 12, 12:00 PM Women's · San Jose State vs Southern Utah | ",
 "Upcoming Dec 19, 2:00 PM Women's · San Jose State at CSU Bakersfield | ",
 "Upcoming Dec 21, 1:00 PM Women's · San Jose State at San Diego | ",
 "Upcoming Dec 30, 7:00 PM Women's · San Jose State vs Grand Canyon | ",
 "Upcoming Jan 2, 12:00 PM Women's · San Jose State at New Mexico | ",
 "Upcoming Jan 6, 7:00 PM Women's · San Jose State vs UNLV | ",
 "Upcoming Jan 9 Women's · San Jose State at UTEP | ",
 "Upcoming Jan 13 Women's · San Jose State at Nevada | ",
 "Upcoming Jan 16, 2:00 PM Women's · San Jose State vs Air Force | ",
 "Upcoming Jan 20, 7:00 PM Women's · San Jose State vs New Mexico | ",
 "Upcoming Jan 23, 4:00 PM Women's · San Jose State at UC Davis | ",
 "Upcoming Jan 27, 7:00 PM Women's · San Jose State vs Wyoming | ",
 "Upcoming Jan 30 Women's · San Jose State at Hawai‘i | ",
 "Upcoming Feb 6, 2:00 PM Women's · San Jose State vs Nevada | ",
 "Upcoming Feb 10 Women's · San Jose State at Grand Canyon | ",
 "Upcoming Feb 13 Women's · San Jose State at Air Force | ",
 "Upcoming Feb 17, 7:00 PM Women's · San Jose State vs Hawai‘i | ",
 "Upcoming Feb 20 Women's · San Jose State vs UTEP | ",
 "Upcoming Feb 24 Women's · San Jose State at UNLV | ",
 "Upcoming Feb 27, 2:00 PM Women's · San Jose State vs UC Davis | ",
 "Upcoming Mar 2, 5:30 PM Women's · San Jose State at Wyoming | ",
 "Upcoming Mar 7 Women's · San Jose State vs TBA | "
]);
  const v_api5=parse("Basketball","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Upcoming Oct 24, 6:00 PM Men's · San Jose State vs Cal St. East Bay (Exhibition) | ",
 "Upcoming Nov 2, 12:00 PM Men's · San Jose State vs UTSA | ",
 "Upcoming Nov 7, 7:00 PM Men's · San Jose State at UC Irvine | ",
 "Upcoming Nov 12, 7:00 PM Men's · San Jose State vs UC Riverside | ",
 "Upcoming Nov 15, 6:00 PM Men's · San Jose State vs Alabama St. | ",
 "Upcoming Nov 18, 6:00 PM Men's · San Jose State vs Fresno State | ",
 "Upcoming Nov 22, 9:00 PM Men's · San Jose State vs Loyola Chicago | ",
 "Upcoming Nov 23 Men's · San Jose State vs Seattle/UC San Diego | ",
 "Upcoming Nov 28, 1:00 PM Men's · San Jose State at Utah Valley | ",
 "Upcoming Dec 5, 6:00 PM Men's · San Jose State vs Seattle | ",
 "Upcoming Dec 8, 7:00 PM Men's · San Jose State vs Long Beach St. | ",
 "Upcoming Dec 12, 6:00 PM Men's · San Jose State vs Southern Utah | ",
 "Upcoming Dec 18, 7:00 PM Men's · San Jose State at Stanford | ",
 "Upcoming Dec 22, 4:30 PM Men's · San Jose State vs UC San Diego | ",
 "Upcoming Dec 29, 4:30 PM Men's · San Jose State vs Lincoln | ",
 "Upcoming Jan 2 Men's · San Jose State vs Hawaii | ",
 "Upcoming Jan 5, 5:30 PM Men's · San Jose State at Air Force | ",
 "Upcoming Jan 9 Men's · San Jose State vs UNLV | ",
 "Upcoming Jan 13, 8:00 PM Men's · San Jose State vs Grand Canyon | ",
 "Upcoming Jan 16 Men's · San Jose State at UC Davis | ",
 "Upcoming Jan 20, 8:00 PM Men's · San Jose State at New Mexico | ",
 "Upcoming Jan 23 Men's · San Jose State vs Nevada | ",
 "Upcoming Jan 30 Men's · San Jose State at UTEP | ",
 "Upcoming Feb 2, 7:00 PM Men's · San Jose State vs New Mexico | ",
 "Upcoming Feb 6, 3:00 PM Men's · San Jose State at UNLV | ",
 "Upcoming Feb 9, 7:30 PM Men's · San Jose State vs UC Davis | ",
 "Upcoming Feb 13 Men's · San Jose State vs Air Force | ",
 "Upcoming Feb 16 Men's · San Jose State at Hawaii | ",
 "Upcoming Feb 20 Men's · San Jose State vs Wyoming | ",
 "Upcoming Feb 23 Men's · San Jose State at Nevada | ",
 "Upcoming Feb 26, 8:00 PM Men's · San Jose State at Grand Canyon | ",
 "Upcoming Mar 2 Men's · San Jose State vs UTEP | ",
 "Upcoming Mar 5, 8:00 PM Men's · San Jose State at Wyoming | "
]);
  const v_api14=parse("Beach Volleyball","api-14");
  assert.deepEqual(v_api14.map(line),[]);
  const v_api36=parse("Cross Country","api-36");
  assert.deepEqual(v_api36.map(line),[
 "Final Sep 4 San Jose State at USF Invitational | Completed",
 "Final Sep 18 San Jose State at Saint Mary's College Invite | Completed",
 "Final Oct 9 San Jose State at San Francisco State Invitational | Completed",
 "Final Oct 17 San Jose State at Santa Clara Bronco Invite | Completed",
 "Upcoming Oct 30 San Jose State at Mountain West XC Championships | "
]);
  const v_api3=parse("Football","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Final Aug 29 San Jose State at Southern California | L, 26-42",
 "Final Sep 4 San Jose State at Eastern Michigan | W, 27-21",
 "Final Sep 12 San Jose State vs Cal Poly | W, 30-20",
 "Final Sep 19 San Jose State vs Fresno State | L, 10-26",
 "Final Oct 3 San Jose State at Hawai‘i | W, 20-16",
 "Final Oct 9 San Jose State vs Wyoming | L, 13-16 (1OT)",
 "Final Oct 17 San Jose State at UTEP | W, 24-11",
 "Upcoming Oct 24, 2:00 PM San Jose State at Nevada | ",
 "Upcoming Oct 31, 1:00 PM San Jose State vs New Mexico | ",
 "Upcoming Nov 7, 1:00 PM San Jose State vs Northern Illinois | ",
 "Upcoming Nov 14, 4:00 PM San Jose State at Air Force | ",
 "Upcoming Nov 21, 4:00 PM San Jose State vs UNLV | ",
 "Upcoming Nov 27, 12:30 PM San Jose State vs North Dakota State | ",
 "Upcoming Dec 4, 6:00 PM San Jose State vs Mountain West | "
]);
  const v_api16=parse("Golf","api-16");
  assert.deepEqual(v_api16.map(line),[
 "Final Sep 2 Women's · San Jose State at Pan-Pacific. University Golf Super League by NGITA | 4th (2nd among American Universities)",
 "Final Sep 14 Women's · San Jose State at Leadership and Golf Invitational | 6th of 17",
 "Final Oct 16 Women's · San Jose State at Stanford Intercollegiate | 13th of 17",
 "Upcoming Oct 26 Women's · San Jose State at Nanea Invitational | ",
 "Upcoming Jan 31 Women's · San Jose State at Therese Hession Regional Challenge | ",
 "Upcoming Feb 13 Women's · San Jose State at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Mar 1 Women's · San Jose State at Stanford - Match Play | ",
 "Upcoming Mar 9 Women's · San Jose State at Juli Inkster Invitational at TPC Harding Park | ",
 "Upcoming Apr 5 Women's · San Jose State at Chevron Silverado Showdown | ",
 "Upcoming Apr 20 Women's · San Jose State at Mountain West Championship | ",
 "Upcoming May 10 Women's · San Jose State at NCAA Regionals | ",
 "Upcoming May 21 Women's · San Jose State at NCAA Championship | "
]);
  const v_api7=parse("Golf","api-7");
  assert.deepEqual(v_api7.map(line),[
 "Final Sep 14 Men's · San Jose State at Vuori Invitational | 12th of 12",
 "Final Sep 19 Men's · San Jose State at Gene Miranda Falcon Invitational | 10th of 18",
 "Final Oct 19 Men's · San Jose State at The Clerico | 13th of 13",
 "Upcoming Oct 26 Men's · San Jose State at Ka'anapali Classic | ",
 "Upcoming Jan 25 Men's · San Jose State at Southwestern Invitational | ",
 "Upcoming Feb 4 Men's · San Jose State at Amer Ari Invitational | ",
 "Upcoming Mar 5 Men's · San Jose State at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Men's · San Jose State at The Duck Invitational | ",
 "Upcoming Mar 25 Men's · San Jose State at The Goodwin | ",
 "Upcoming Apr 12 Men's · San Jose State at 80th Western Intercollegiate | ",
 "Upcoming Apr 27 Men's · San Jose State at Mountain West Championship | "
]);
  const v_api17=parse("Gymnastics","api-17");
  assert.deepEqual(v_api17.map(line),[]);
  const v_api18=parse("Soccer","api-18");
  assert.deepEqual(v_api18.map(line),[
 "Final Aug 12 Women's · San Jose State vs Santa Clara | L, 0-2",
 "Final Aug 20 Women's · San Jose State at UC Santa Barbara | L, 0-1",
 "Final Aug 23 Women's · San Jose State at Cal Poly | L, 0-3",
 "Final Aug 27 Women's · San Jose State vs Cal St. Fullerton | T, 2-2",
 "Final Sep 3 Women's · San Jose State at CSUN | T, 0-0",
 "Final Sep 13 Women's · San Jose State vs Saint Mary's | L, 0-2",
 "Final Sep 17 Women's · San Jose State vs Sacramento St. | W, 2-0",
 "Final Sep 24 Women's · San Jose State at New Mexico | L, 0-3",
 "Final Sep 27 Women's · San Jose State at Texas at El Paso | L, 0-1",
 "Final Oct 3 Women's · San Jose State vs UNLV | W, 4-1",
 "Final Oct 7 Women's · San Jose State at Wyoming | L, 0-4",
 "Final Oct 11 Women's · San Jose State vs Colorado Col. | L, 0-2",
 "Final Oct 15 Women's · San Jose State vs Hawaii | L, 0-2",
 "Final Oct 18 Women's · San Jose State at Grand Canyon | L, 0-1",
 "Upcoming Oct 24, 3:00 PM Women's · San Jose State at Air Force | ",
 "Upcoming Oct 28, 4:00 PM Women's · San Jose State vs UC Davis | ",
 "Upcoming Nov 1, 12:00 PM Women's · San Jose State vs Nevada | ",
 "Upcoming Nov 11 Women's · San Jose State at Mountain West Tournament | "
]);
  const v_api8=parse("Soccer","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Final Aug 21 Men's · San Jose State at UC Santa Barbara | L, 0-3",
 "Final Aug 27 Men's · San Jose State at Cal Poly | L, 0-3",
 "Final Aug 30 Men's · San Jose State vs Saint Mary's | W, 4-2",
 "Final Sep 4 Men's · San Jose State vs Stanford | L, 0-1",
 "Final Sep 6 Men's · San Jose State vs Sacramento St. | W, 2-1",
 "Final Sep 10 Men's · San Jose State vs Pacific | T, 2-2",
 "Final Sep 17 Men's · San Jose State at CSUN | W, 1-0",
 "Final Sep 20 Men's · San Jose State at Cal St. Fullerton | L, 1-2",
 "Final Sep 26 Men's · San Jose State vs UC Davis | T, 1-1",
 "Final Sep 30 Men's · San Jose State at UNLV | L, 1-2",
 "Final Oct 4 Men's · San Jose State at Grand Canyon | L, 1-2",
 "Final Oct 10 Men's · San Jose State vs Air Force | W, 3-1",
 "Final Oct 14 Men's · San Jose State at Utah Tech | W, 2-0",
 "Final Oct 18 Men's · San Jose State vs UNLV | W, 2-1",
 "Upcoming Oct 24, 6:00 PM Men's · San Jose State at Air Force | ",
 "Upcoming Oct 28, 7:00 PM Men's · San Jose State vs Grand Canyon | ",
 "Upcoming Nov 1, 6:00 PM Men's · San Jose State vs Utah Tech | ",
 "Upcoming Nov 6, 6:00 PM Men's · San Jose State at UC Davis | "
]);
  const v_api11=parse("Softball","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Upcoming Oct 30, 3:30 PM San Jose State vs San Jose City College (Exhibition) | ",
 "Upcoming Mar 25 San Jose State at UNLV | ",
 "Upcoming Mar 26 San Jose State at UNLV | ",
 "Upcoming Mar 27 San Jose State at UNLV | ",
 "Upcoming Apr 2 San Jose State vs Grand Canyon | ",
 "Upcoming Apr 3 San Jose State vs Grand Canyon | ",
 "Upcoming Apr 4 San Jose State vs Grand Canyon | ",
 "Upcoming Apr 9 San Jose State at New Mexico | ",
 "Upcoming Apr 10 San Jose State at New Mexico | ",
 "Upcoming Apr 11 San Jose State at New Mexico | ",
 "Upcoming Apr 16 San Jose State vs UC Davis | ",
 "Upcoming Apr 17 San Jose State vs UC Davis | ",
 "Upcoming Apr 18 San Jose State vs UC Davis | ",
 "Upcoming Apr 23 San Jose State vs UTEP | ",
 "Upcoming Apr 24 San Jose State vs UTEP | ",
 "Upcoming Apr 25 San Jose State vs UTEP | ",
 "Upcoming Apr 30 San Jose State at Hawaii | ",
 "Upcoming May 1 San Jose State at Hawaii | ",
 "Upcoming May 2 San Jose State at Hawaii | ",
 "Upcoming May 7 San Jose State vs Nevada | ",
 "Upcoming May 8 San Jose State vs Nevada | ",
 "Upcoming May 9 San Jose State vs Nevada | ",
 "Upcoming May 12 San Jose State at Mountain West Tournament | "
]);
  const v_api19=parse("Swimming & Diving","api-19");
  assert.deepEqual(v_api19.map(line),[
 "Final Oct 10 San Jose State vs Nevada | L, 48-61",
 "Final Oct 16 San Jose State at Gary Ota Memorial Invite | 5th of 5",
 "Upcoming Oct 31, 12:00 PM San Jose State vs Pacific, UC Santa Cruz and UC Santa Cruz | ",
 "Upcoming Nov 17 San Jose State at Phill Hansel Invitational | ",
 "Upcoming Jan 16, 1:00 PM San Jose State vs Cal State East Bay | ",
 "Upcoming Jan 23, 1:00 PM San Jose State at Fresno State | ",
 "Upcoming Jan 28 San Jose State at Air Force Invitational | ",
 "Upcoming Jan 30, 12:00 PM San Jose State at UC Davis | ",
 "Upcoming Feb 16 San Jose State at MW Championship | ",
 "Upcoming Mar 8 San Jose State at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 11 San Jose State at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17 San Jose State at NCAA Championship | "
]);
  const v_api20=parse("Tennis","api-20");
  assert.deepEqual(v_api20.map(line),[
 "Final Sep 24 San Jose State at USD USTA Invite | Completed",
 "Final Oct 1 San Jose State at Battle in the Bay | Completed",
 "Final Oct 8 San Jose State at ITA Regional Championships | Completed",
 "Today Oct 21 San Jose State at MW Fall Championships | ",
 "Upcoming Oct 23 San Jose State at Santa Clara Invite | ",
 "Upcoming Oct 30 San Jose State at Saint Mary's Invite | ",
 "Upcoming Nov 6 San Jose State at SJSU Fall Invite | "
]);
  const v_api37=parse("Track & Field","api-37");
  assert.deepEqual(v_api37.map(line),[
 "Upcoming Jan 15 San Jose State at Nevada Invitational & Multi's | ",
 "Upcoming Jan 29 San Jose State at Wolfpack Invitational | ",
 "Upcoming Feb 12 San Jose State at Battle Born Classic | ",
 "Upcoming Feb 25 San Jose State at Mountain West Indoor Championships | ",
 "Upcoming Mar 12 San Jose State at NCAA Indoor Championships | ",
 "Upcoming Mar 20 San Jose State at Cal Opener | ",
 "Upcoming Apr 2 San Jose State at Stanford Invitational | ",
 "Upcoming Apr 3 San Jose State at Brutis Hamilton Invitational | ",
 "Upcoming Apr 14 San Jose State at Bryan Clay Invitational | ",
 "Upcoming Apr 15 San Jose State at Beach Invitational | ",
 "Upcoming Apr 15 San Jose State at Mt. Sac Invitational | ",
 "Upcoming May 1 San Jose State at Fresno State Invitational | ",
 "Upcoming May 1 San Jose State at Desert Heat Invitational | ",
 "Upcoming May 13 San Jose State at Mountain West Outdoor Championships | ",
 "Upcoming May 26 San Jose State at NCAA West Prelims | ",
 "Upcoming Jun 9 San Jose State at NCAA Outdoor Championships | "
]);
  const v_api22=parse("Volleyball","api-22");
  assert.deepEqual(v_api22.map(line),[
 "Final Aug 28 San Jose State vs Belmont | L, 2-3",
 "Final Aug 29 San Jose State at Weber State | L, 0-3",
 "Final Aug 30 San Jose State vs San Francisco | W, 3-0",
 "Final Sep 3 San Jose State vs Portland | W, 3-2",
 "Final Sep 4 San Jose State vs Pacific | W, 3-1",
 "Final Sep 6 San Jose State vs LSU New Orleans | W, 3-0",
 "Final Sep 11 San Jose State vs Utah Tech | L, 0-3",
 "Final Sep 12 San Jose State at Long Beach State | L, 1-3",
 "Final Sep 13 San Jose State at UC Irvine | W, 3-2",
 "Final Sep 18 San Jose State vs Sacramento State and Sacramento St. | L, 1-3",
 "Final Sep 20 San Jose State vs California | L, 1-3",
 "Final Sep 24 San Jose State at Air Force | L, 0-3",
 "Final Sep 26 San Jose State at Air Force | L, 2-3",
 "Final Oct 1 San Jose State vs Wyoming | W, 3-1",
 "Final Oct 3 San Jose State vs Wyoming | L, 0-3",
 "Final Oct 9 San Jose State at Hawai‘ii | L, 0-3",
 "Final Oct 10 San Jose State at Hawai‘ii | L, 0-3",
 "Final Oct 16 San Jose State vs UC Davis | L, 0-3",
 "Final Oct 17 San Jose State vs UC Davis | W, 3-2",
 "Upcoming Oct 23, 6:00 PM San Jose State at New Mexico | ",
 "Upcoming Oct 25, 6:00 PM San Jose State at New Mexico | ",
 "Upcoming Oct 29, 6:00 PM San Jose State vs UTEP | ",
 "Upcoming Oct 30, 6:00 PM San Jose State vs UTEP | ",
 "Upcoming Nov 5, 5:00 PM San Jose State at Grand Canyon | ",
 "Upcoming Nov 7, 10:30 AM San Jose State at Grand Canyon | ",
 "Upcoming Nov 12, 6:00 PM San Jose State at Nevada | ",
 "Upcoming Nov 14, 1:00 PM San Jose State at Nevada | ",
 "Upcoming Nov 18, 4:00 PM San Jose State vs UNLV | ",
 "Upcoming Nov 19, 3:00 PM San Jose State vs UNLV | ",
 "Upcoming Nov 24 San Jose State at Semifinal Matches | ",
 "Upcoming Nov 25 San Jose State at Championship Match | "
]);
  const v_api23=parse("Water Polo","api-23");
  assert.deepEqual(v_api23.map(line),[]);
  const v_api10=parse("Water Polo","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Final Sep 5 Men's · San Jose State vs American River (Exhibition) | W, 12-6",
 "Final Sep 5 Men's · San Jose State vs Cal | L, 10-14",
 "Final Sep 5 Men's · San Jose State vs Harvard | W, 14-8",
 "Final Sep 11 Men's · San Jose State vs LIU | W, 22-10",
 "Final Sep 11 Men's · San Jose State vs Wagner | W, 18-6",
 "Final Sep 12 Men's · San Jose State at Princeton | L, 11-15",
 "Final Sep 12 Men's · San Jose State vs Harvard | W, 13-9",
 "Final Sep 13 Men's · San Jose State at Fordham | L, 10-14",
 "Final Sep 18 Men's · San Jose State vs Princeton | W, 14-12",
 "Final Sep 19 Men's · San Jose State vs Long Beach State | L, 11-17",
 "Final Sep 19 Men's · San Jose State vs Southern California | L, 7-16",
 "Final Sep 20 Men's · San Jose State vs UC Irvine | L, 14-15 (OT)",
 "Final Sep 25 Men's · San Jose State at Stanford | L, 10-16",
 "Final Sep 26 Men's · San Jose State vs UC Merced | W, 20-10",
 "Final Sep 26 Men's · San Jose State vs West Valley College (Exhibition) | W, 13-10",
 "Final Oct 3 Men's · San Jose State vs UC Santa Barbara | L, 12-13 (OT)",
 "Final Oct 9 Men's · San Jose State vs Pacific | L, 13-10",
 "Final Oct 11 Men's · San Jose State vs UC Davis | L, 9-16",
 "Final Oct 17 Men's · San Jose State at Loyola Marymount | L, 9-13",
 "Final Oct 18 Men's · San Jose State at Pepperdine | W, 16-13",
 "Upcoming Oct 23, 12:40 PM Men's · San Jose State vs Brown | ",
 "Upcoming Oct 24, 9:00 AM Men's · San Jose State vs California Baptist | ",
 "Upcoming Oct 25, 9:20 AM Men's · San Jose State vs Bucknell | ",
 "Upcoming Oct 31, 12:00 PM Men's · San Jose State at Santa Clara | ",
 "Upcoming Nov 6, 12:00 PM Men's · San Jose State vs Air Force | ",
 "Upcoming Nov 8, 12:00 PM Men's · San Jose State vs Saint Mary's | ",
 "Upcoming Nov 20 Men's · San Jose State at WCC Tournament | "
]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api13,"Basketball api-13");
  ownRecapsOnly(v_api5,"Basketball api-5");
  ownRecapsOnly(v_api14,"Beach Volleyball api-14");
  ownRecapsOnly(v_api36,"Cross Country api-36");
  ownRecapsOnly(v_api3,"Football api-3");
  ownRecapsOnly(v_api16,"Golf api-16");
  ownRecapsOnly(v_api7,"Golf api-7");
  ownRecapsOnly(v_api17,"Gymnastics api-17");
  ownRecapsOnly(v_api18,"Soccer api-18");
  ownRecapsOnly(v_api8,"Soccer api-8");
  ownRecapsOnly(v_api11,"Softball api-11");
  ownRecapsOnly(v_api19,"Swimming & Diving api-19");
  ownRecapsOnly(v_api20,"Tennis api-20");
  ownRecapsOnly(v_api37,"Track & Field api-37");
  ownRecapsOnly(v_api22,"Volleyball api-22");
  ownRecapsOnly(v_api23,"Water Polo api-23");
  ownRecapsOnly(v_api10,"Water Polo api-10");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('San Jose State module checks passed');
