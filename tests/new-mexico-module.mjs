import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {newMexicoSchool} from '../src/schools/new-mexico.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='new-mexico');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,newMexicoHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/new-mexico-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads golobos.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['new-mexico'];
assert.equal(sports.length,11);
assert.deepEqual(Object.keys(newMexicoSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',newMexicoSchool.scheduleUrls],['roster',newMexicoSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('new-mexico|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'golobos.com',`${key} must stay on golobos.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/golobos\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/golobos\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(newMexicoSchool.scheduleUrls[`new-mexico|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'new-mexico|"+sport+"':"),`${sport} routes must live in the New Mexico module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'new-mexico',host:'golobos.com',sportIds:Object.fromEntries(Object.entries(newMexicoSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(newMexicoSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(newMexicoSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,newMexicoSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,newMexicoSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Tennis"]);
const parity={"Baseball":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/mbball/roster","https://golobos.com/sports/wbball/roster"],"combined":true},"Cross Country":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/cross/roster"],"combined":false},"Football":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/mgolf/roster","https://golobos.com/sports/wgolf/roster"],"combined":true},"Soccer":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/wsoc/roster"],"combined":false},"Softball":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/wswim/roster"],"combined":false},"Tennis":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/mten/roster","https://golobos.com/sports/wten/roster"],"combined":true},"Track & Field":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/track/roster"],"combined":false},"Volleyball":{"schedule":["https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://golobos.com/sports/wvball/roster"],"combined":false}};

const now=new Date("2026-10-22T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(newMexicoSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.newMexicoHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=new-mexico)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[
 "Upcoming Oct 30, 2:00 PM New Mexico vs New Mexico JC (Exhibition) | "
]);
  const v_api5=parse("Basketball","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Final Oct 11 Men's · New Mexico at Oklahoma State (Exhibition) | W, 99-89",
 "Final Oct 18 Men's · New Mexico vs Washington State (Exhibition) | W, 92-64",
 "Upcoming Oct 25, 2:00 PM Men's · New Mexico vs Arizona State (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · New Mexico vs Utah Tech | ",
 "Upcoming Nov 7, 4:00 PM Men's · New Mexico vs Northern Arizona | ",
 "Upcoming Nov 10, 7:00 PM Men's · New Mexico vs Little Rock | ",
 "Upcoming Nov 14, 8:00 PM Men's · New Mexico at Santa Clara | ",
 "Upcoming Nov 21, 12:00 PM Men's · New Mexico at Wichita State | ",
 "Upcoming Nov 25, 7:00 PM Men's · New Mexico vs Mississippi Valley State | ",
 "Upcoming Nov 29, 12:00 PM Men's · New Mexico vs Utah State | ",
 "Upcoming Dec 5, 12:15 PM Men's · New Mexico vs New Mexico State | ",
 "Upcoming Dec 12, 4:30 PM Men's · New Mexico vs Saint Mary's | ",
 "Upcoming Dec 15, 7:00 PM Men's · New Mexico vs Mercer | ",
 "Upcoming Dec 18, 8:00 PM Men's · New Mexico at UC Irvine | ",
 "Upcoming Dec 21, 4:00 PM Men's · New Mexico vs Oregon St | ",
 "Upcoming Dec 23, 1:30 PM Men's · New Mexico vs Boise State | ",
 "Upcoming Dec 29, 7:00 PM Men's · New Mexico vs Northern New Mexico | ",
 "Upcoming Jan 2, 6:00 PM Men's · New Mexico at UTEP | ",
 "Upcoming Jan 5, 8:00 PM Men's · New Mexico vs Nevada | ",
 "Upcoming Jan 9, 4:45 PM Men's · New Mexico vs UC Davis | ",
 "Upcoming Jan 12, 8:30 PM Men's · New Mexico at UNLV | ",
 "Upcoming Jan 16, 2:30 PM Men's · New Mexico at Air Force | ",
 "Upcoming Jan 20, 9:00 PM Men's · New Mexico vs San Jose State | ",
 "Upcoming Jan 23, 2:30 PM Men's · New Mexico vs Grand Canyon | ",
 "Upcoming Jan 26, 10:00 PM Men's · New Mexico at Hawai'i | ",
 "Upcoming Jan 30, 6:00 PM Men's · New Mexico vs Air Force | ",
 "Upcoming Feb 2, 8:00 PM Men's · New Mexico at San Jose State | ",
 "Upcoming Feb 6, 4:30 PM Men's · New Mexico at Grand Canyon | ",
 "Upcoming Feb 13, 4:00 PM Men's · New Mexico vs UNLV | ",
 "Upcoming Feb 17, 9:00 PM Men's · New Mexico at Wyoming | ",
 "Upcoming Feb 20, 8:30 PM Men's · New Mexico vs UTEP | ",
 "Upcoming Feb 24, 6:00 PM Men's · New Mexico vs Hawai'i | ",
 "Upcoming Feb 27, 5:00 PM Men's · New Mexico at UC Davis | ",
 "Upcoming Mar 2, 8:00 PM Men's · New Mexico vs Wyoming | ",
 "Upcoming Mar 5, 7:00 PM Men's · New Mexico at Nevada | ",
 "Upcoming Mar 10 Men's · New Mexico at Mountain West Tournament | "
]);
  const v_api9=parse("Basketball","api-9");
  assert.deepEqual(v_api9.map(line),[
 "Upcoming Oct 26, 7:00 PM Women's · New Mexico vs MSU Denver (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · New Mexico vs Seattle | ",
 "Upcoming Nov 6, 7:00 PM Women's · New Mexico vs New Mexico Highlands | ",
 "Upcoming Nov 11, 7:30 PM Women's · New Mexico at Fresno State | ",
 "Upcoming Nov 14, 2:00 PM Women's · New Mexico at BYU | ",
 "Upcoming Nov 18, 7:00 PM Women's · New Mexico vs Colorado | ",
 "Upcoming Nov 21, 1:00 PM Women's · New Mexico vs New Mexico State | ",
 "Upcoming Nov 24, 7:00 PM Women's · New Mexico vs Eastern Kentucky | ",
 "Upcoming Dec 2, 7:00 PM Women's · New Mexico vs Loyola Marymount | ",
 "Upcoming Dec 5, 8:30 PM Women's · New Mexico vs Arizona | ",
 "Upcoming Dec 18, 7:00 PM Women's · New Mexico vs UC Irvine | ",
 "Upcoming Dec 21, 12:00 PM Women's · New Mexico vs Portland | ",
 "Upcoming Dec 30, 7:00 PM Women's · New Mexico vs UTEP | ",
 "Upcoming Jan 2, 1:00 PM Women's · New Mexico vs San José State | ",
 "Upcoming Jan 6, 6:00 PM Women's · New Mexico at Grand Canyon | ",
 "Upcoming Jan 9, 8:00 PM Women's · New Mexico vs Nevada | ",
 "Upcoming Jan 13 Women's · New Mexico at Hawai'i | ",
 "Upcoming Jan 16, 6:00 PM Women's · New Mexico vs UNLV | ",
 "Upcoming Jan 20, 8:00 PM Women's · New Mexico at San José State | ",
 "Upcoming Jan 23, 2:00 PM Women's · New Mexico at Wyoming | ",
 "Upcoming Jan 27, 7:00 PM Women's · New Mexico vs UC Davis | ",
 "Upcoming Jan 30, 1:00 PM Women's · New Mexico at Air Force | ",
 "Upcoming Feb 3, 7:00 PM Women's · New Mexico vs Hawai'i | ",
 "Upcoming Feb 6, 1:00 PM Women's · New Mexico vs Grand Canyon | ",
 "Upcoming Feb 13, 8:00 PM Women's · New Mexico at UNLV | ",
 "Upcoming Feb 17, 7:00 PM Women's · New Mexico vs Wyoming | ",
 "Upcoming Feb 20, 5:00 PM Women's · New Mexico at UC Davis | ",
 "Upcoming Feb 24, 7:00 PM Women's · New Mexico at Nevada | ",
 "Upcoming Feb 27, 1:00 PM Women's · New Mexico vs Air Force | ",
 "Upcoming Mar 2, 7:00 PM Women's · New Mexico at UTEP | "
]);
  const v_api2=parse("Cross Country","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Final Sep 5 New Mexico at UNM Lobo XC Invite | No team score (individuals only)",
 "Final Sep 26 New Mexico at Cowboy Jamboree | Men's team: 1st / Women's team: 3rd",
 "Final Oct 9 New Mexico at Nuttycombe Invitational | Men's team: 1st / Women's team: 4th",
 "Upcoming Oct 30 New Mexico at Mountain West XC Championships | ",
 "Upcoming Nov 13 New Mexico at NCAA Mountain Regional Championship | ",
 "Upcoming Nov 21 New Mexico at NCAA Championships | "
]);
  const v_api3=parse("Football","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Final Sep 5 New Mexico vs Central Michigan | W, 38-7",
 "Final Sep 12 New Mexico vs Mercyhurst | W, 70-7",
 "Final Sep 19 New Mexico at Oklahoma | L, 6-14",
 "Final Sep 26 New Mexico at New Mexico State | W, 42-18",
 "Final Oct 3 New Mexico vs UTEP | W, 61-7",
 "Final Oct 17 New Mexico at Hawai'i | W, 21-10",
 "Upcoming Oct 24, 8:00 PM New Mexico vs North Dakota State | ",
 "Upcoming Oct 31, 2:00 PM New Mexico at San José State | ",
 "Upcoming Nov 6, 7:00 PM New Mexico at Nevada | ",
 "Upcoming Nov 14, 5:30 PM New Mexico vs UNLV | ",
 "Upcoming Nov 20, 7:00 PM New Mexico at Wyoming | ",
 "Upcoming Nov 27, 2:30 PM New Mexico vs Air Force | "
]);
  const v_api4=parse("Golf","api-4");
  assert.deepEqual(v_api4.map(line),[
 "Final Sep 2 Men's · New Mexico at Pan Pacfiic University Golf Super League | 2nd of 14",
 "Final Sep 13 Men's · New Mexico at Canadian Collegiate Invitational | 1st of 13",
 "Final Sep 25 Men's · New Mexico at William H. Tucker Intercollegiate | 2nd of 15",
 "Final Sep 29 Men's · New Mexico at NB3 Matchplay at Twin Warriors | Match play: 1-2",
 "Final Oct 19 Men's · New Mexico at The Clerico | 2nd of 13",
 "Upcoming Feb 11 Men's · New Mexico at John A. Burns Intercollegiate | ",
 "Upcoming Feb 22 Men's · New Mexico at Wyoming Desert Intercollegiate (individuals) | ",
 "Upcoming Feb 28 Men's · New Mexico at Las Vegas Collegiate | ",
 "Upcoming Mar 15 Men's · New Mexico at Pauma Valley Invitational | ",
 "Upcoming Mar 21 Men's · New Mexico at Game Above Collegiate | ",
 "Upcoming Apr 5 Men's · New Mexico at Golfweek.com Invitational | ",
 "Upcoming Apr 16 Men's · New Mexico at ASU Thunderbird Intercollegiate | ",
 "Upcoming May 3 Men's · New Mexico at Mountain West Championship | ",
 "Upcoming May 17 Men's · New Mexico at NCAA Regional | ",
 "Upcoming May 28 Men's · New Mexico at NCAA Championship | "
]);
  const v_api10=parse("Golf","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Final Sep 14 Women's · New Mexico at Branch Law Firm/Dick McGuire Invitational | 3rd of 13",
 "Final Sep 22 Women's · New Mexico at Red Raider Invitational | 3rd of 12",
 "Final Sep 29 Women's · New Mexico at NB3 Matchplay at Twin Warriors | Match play: 0-2-1",
 "Final Oct 5 Women's · New Mexico at Marilynn Smith Sunflower Invitational | 9th of 14",
 "Final Oct 18 Women's · New Mexico at Jim West Challenge | 9th of 11",
 "Upcoming Feb 22 Women's · New Mexico at Bruin Wave Invitational | ",
 "Upcoming Mar 1 Women's · New Mexico at Lady Luck Invitational | ",
 "Upcoming Mar 14 Women's · New Mexico at MountainView Collegiate | ",
 "Upcoming Mar 25 Women's · New Mexico at PING/ASU Invitational | ",
 "Upcoming Apr 6 Women's · New Mexico at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 20 Women's · New Mexico at Mountain West Championship | ",
 "Upcoming May 10 Women's · New Mexico at NCAA Regional | ",
 "Upcoming May 21 Women's · New Mexico at NCAA Championship | "
]);
  const v_api11=parse("Soccer","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Final Aug 20 New Mexico vs Northern Arizona | W, 2-0",
 "Final Aug 23 New Mexico vs Gonzaga | L, 1-3",
 "Final Aug 30 New Mexico vs Cal State Northridge | W, 3-2",
 "Final Sep 3 New Mexico at Colorado | L, 0-3",
 "Final Sep 6 New Mexico at Northern Colorado | W, 4-2",
 "Final Sep 12 New Mexico at New Mexico State | T, 1-1",
 "Final Sep 20 New Mexico vs Idaho State | T, 1-1",
 "Final Sep 24 New Mexico vs San José State | W, 3-0",
 "Final Sep 27 New Mexico vs Nevada | W, 5-2",
 "Final Oct 3 New Mexico at Grand Canyon | L, 1-2",
 "Final Oct 7 New Mexico at Colorado College | L, 0-2",
 "Final Oct 11 New Mexico vs UC Davis | W, 2-1",
 "Final Oct 15 New Mexico at Wyoming | T, 1-1",
 "Final Oct 18 New Mexico vs UNLV | W, 2-0",
 "Upcoming Oct 24, 7:00 PM New Mexico at UTEP | ",
 "Upcoming Nov 1, 8:00 PM New Mexico at Hawaii | ",
 "Upcoming Nov 7, 7:30 PM New Mexico vs Air Force | "
]);
  const v_api8=parse("Softball","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Upcoming Mar 25, 6:00 PM New Mexico vs Nevada | ",
 "Upcoming Mar 26, 2:00 PM New Mexico vs Nevada | ",
 "Upcoming Mar 27, 12:00 PM New Mexico vs Nevada | ",
 "Upcoming Apr 2 New Mexico at Hawai'i | ",
 "Upcoming Apr 3 New Mexico at Hawai'i | ",
 "Upcoming Apr 4 New Mexico at Hawai'i | ",
 "Upcoming Apr 9, 6:00 PM New Mexico vs San José State | ",
 "Upcoming Apr 10, 2:00 PM New Mexico vs San José State | ",
 "Upcoming Apr 11, 12:00 PM New Mexico vs San José State | ",
 "Upcoming Apr 16 New Mexico at UTEP | ",
 "Upcoming Apr 17 New Mexico at UTEP | ",
 "Upcoming Apr 18 New Mexico at UTEP | ",
 "Upcoming Apr 23 New Mexico at Grand Canyon | ",
 "Upcoming Apr 24 New Mexico at Grand Canyon | ",
 "Upcoming Apr 25 New Mexico at Grand Canyon | ",
 "Upcoming Apr 30, 6:00 PM New Mexico vs UC Davis | ",
 "Upcoming May 1, 2:00 PM New Mexico vs UC Davis | ",
 "Upcoming May 2, 12:00 PM New Mexico vs UC Davis | ",
 "Upcoming May 7 New Mexico at UNLV | ",
 "Upcoming May 8 New Mexico at UNLV | ",
 "Upcoming May 9 New Mexico at UNLV | ",
 "Upcoming May 12 New Mexico vs Mountain West Conference | "
]);
  const v_api12=parse("Swimming & Diving","api-12");
  assert.deepEqual(v_api12.map(line),[
 "Final Oct 10 New Mexico vs North Texas | L, 117-126",
 "Final Oct 16 New Mexico vs UTRGV | W, 184-110",
 "Upcoming Nov 17 New Mexico at Phill Hansel Invitational | ",
 "Upcoming Dec 2 New Mexico at U.S. Open - Long Course | ",
 "Upcoming Dec 9, 10:00 AM New Mexico at U.S. Diving Championships | ",
 "Upcoming Dec 17, 2:00 PM New Mexico vs Nevada | ",
 "Upcoming Jan 4, 1:00 PM New Mexico at San Diego State | ",
 "Upcoming Jan 8, 12:00 PM New Mexico at Bruin Diving Invitational | ",
 "Upcoming Jan 15, 12:00 PM New Mexico at Mardi Gras Invitational | ",
 "Upcoming Jan 23 New Mexico vs New Mexico State | ",
 "Upcoming Jan 28 New Mexico at NAU Diving Invitational | ",
 "Upcoming Jan 30 New Mexico at Northern Arizona | ",
 "Upcoming Feb 16, 12:00 PM New Mexico at Mountain West Championships | ",
 "Upcoming Mar 6 New Mexico at NCAA Diving Zone Championships - Team Event | ",
 "Upcoming Mar 8, 12:00 PM New Mexico at NCAA Diving Zone Championships - Individual Events | ",
 "Upcoming Mar 11 New Mexico at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17, 12:00 PM New Mexico at NCAA Championships | ",
 "Upcoming Apr 21 New Mexico at TYR Pro Series | "
]);
  const v_api6=parse("Tennis","api-6");
  assert.deepEqual(v_api6.map(line),[
 "Final Sep 11 Men's · New Mexico at Arizona Wildcat Invitational | No team score (individuals only)",
 "Final Sep 18 Men's · New Mexico at Bedford Cup | No team score (individuals only)",
 "Final Sep 19 Men's · New Mexico at ITA All-America Championships | No team score (individuals only)",
 "Final Sep 25 Men's · New Mexico at Sherwood Collegiate Cup | No Team Scores Kept",
 "Today Oct 21 Men's · New Mexico at Mountain West Fall Qualifiers | ",
 "Upcoming Nov 5, 10:00 AM Men's · New Mexico at ITA Sectionals | "
]);
  const v_api13=parse("Tennis","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Final Sep 25 Women's · New Mexico at ITA Bedford Cup in the Mountains | No Team Scores Kept",
 "Final Oct 2 Women's · New Mexico at Tulsa Invitational | No team scores kept",
 "Today Oct 20 Women's · New Mexico at Mountain West Fall Qualifier | ",
 "Upcoming Nov 6 Women's · New Mexico at CSUN Fall Invitational | "
]);
  const v_api7=parse("Track & Field","api-7");
  assert.deepEqual(v_api7.map(line),[]);
  const v_api14=parse("Volleyball","api-14");
  assert.deepEqual(v_api14.map(line),[
 "Final Aug 21 New Mexico vs Northern Arizona (Exhibition) | L, 2-3",
 "Final Aug 22 New Mexico vs Arizona (Exhibition) | W, 3-1",
 "Final Aug 28 New Mexico vs Cal Baptist | L, 1-3",
 "Final Aug 30 New Mexico vs Tulsa | L, 1-3",
 "Final Sep 4 New Mexico vs Northern Colorado | W, 3-1",
 "Final Sep 5 New Mexico at Colorado | L, 2-3",
 "Final Sep 7 New Mexico vs New Mexico State | W, 3-1",
 "Final Sep 10 New Mexico at Nebraska | L, 0-3",
 "Final Sep 11 New Mexico vs Georgia Tech | L, 0-3",
 "Final Sep 12 New Mexico vs Baylor | L, 0-3",
 "Final Sep 17 New Mexico at St. Mary's | L, 0-3",
 "Final Sep 18 New Mexico vs Fresno State | L, 1-3",
 "Final Sep 25 New Mexico at Hawai'i | L, 0-3",
 "Final Sep 26 New Mexico at Hawai'i | L, 0-3",
 "Final Oct 2 New Mexico vs Nevada | W, 3-0",
 "Final Oct 4 New Mexico vs Nevada | W, 3-1",
 "Final Oct 8 New Mexico at UC Davis | W, 3-2",
 "Final Oct 10 New Mexico at UC Davis | W, 3-1",
 "Final Oct 15 New Mexico at UTEP | L, 0-3",
 "Final Oct 17 New Mexico vs UTEP | W, 3-1",
 "Upcoming Oct 23, 7:00 PM New Mexico vs San Jose State | ",
 "Upcoming Oct 25, 7:00 PM New Mexico vs San Jose State | ",
 "Upcoming Oct 29, 6:30 PM New Mexico vs Grand Canyon | ",
 "Upcoming Oct 31, 1:00 PM New Mexico vs Grand Canyon | ",
 "Upcoming Nov 5, 6:00 PM New Mexico at Air Force | ",
 "Upcoming Nov 7, 1:00 PM New Mexico at Air Force | ",
 "Upcoming Nov 12, 7:00 PM New Mexico at UNLV | ",
 "Upcoming Nov 14, 2:00 PM New Mexico at UNLV | ",
 "Upcoming Nov 18, 1:00 PM New Mexico vs Wyoming | ",
 "Upcoming Nov 19, 6:30 PM New Mexico vs Wyoming | "
]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api5,"Basketball api-5");
  ownRecapsOnly(v_api9,"Basketball api-9");
  ownRecapsOnly(v_api2,"Cross Country api-2");
  ownRecapsOnly(v_api3,"Football api-3");
  ownRecapsOnly(v_api4,"Golf api-4");
  ownRecapsOnly(v_api10,"Golf api-10");
  ownRecapsOnly(v_api11,"Soccer api-11");
  ownRecapsOnly(v_api8,"Softball api-8");
  ownRecapsOnly(v_api12,"Swimming & Diving api-12");
  ownRecapsOnly(v_api6,"Tennis api-6");
  ownRecapsOnly(v_api13,"Tennis api-13");
  ownRecapsOnly(v_api7,"Track & Field api-7");
  ownRecapsOnly(v_api14,"Volleyball api-14");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('New Mexico module checks passed');
