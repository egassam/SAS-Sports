import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {washingtonStateSchool,WASHINGTON_STATE_TFRRS_TEAMS} from '../src/schools/washington-state.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='washington-state');
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
const worker=Function(...Object.keys(deps),source+';return {attachOfficialMeetResults,officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,washingtonStateHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/washington-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads wsucougars.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['washington-state'];
assert.equal(sports.length,11);
assert.deepEqual(Object.keys(washingtonStateSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',washingtonStateSchool.scheduleUrls],['roster',washingtonStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('washington-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'wsucougars.com',`${key} must stay on wsucougars.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/wsucougars\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/wsucougars\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(washingtonStateSchool.scheduleUrls[`washington-state|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'washington-state|"+sport+"':"),`${sport} routes must live in the Washington State module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'washington-state',host:'wsucougars.com',sportIds:Object.fromEntries(Object.entries(washingtonStateSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(washingtonStateSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(washingtonStateSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,washingtonStateSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,washingtonStateSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf"]);
const parity={"Baseball":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-basketball/roster","https://wsucougars.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-golf/roster","https://wsucougars.com/sports/mens-golf/roster"],"combined":true},"Rowing":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-swimming/roster"],"combined":false},"Tennis":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://wsucougars.com/sports/womens-volleyball/roster"],"combined":false}};

const now=new Date("2026-10-19T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(washingtonStateSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.washingtonStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=washington-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[]);
  const v_api12=parse("Basketball","api-12");
  assert.deepEqual(v_api12.map(line),[
 "Upcoming Oct 25, 11:00 AM Women's · Washington State vs Westmont (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Washington State at California | ",
 "Upcoming Nov 6, 7:00 PM Women's · Washington State at Oregon | ",
 "Upcoming Nov 9, 11:00 AM Women's · Washington State vs Idaho | ",
 "Upcoming Nov 13, 6:00 PM Women's · Washington State vs Southern Utah | ",
 "Upcoming Nov 17, 7:30 PM Women's · Washington State vs Washington | ",
 "Upcoming Nov 26, 1:00 PM Women's · Washington State vs Kansas | ",
 "Upcoming Nov 27, 1:00 PM Women's · Washington State vs Missouri State | ",
 "Upcoming Dec 1, 6:00 PM Women's · Washington State at Nevada | ",
 "Upcoming Dec 5, 2:00 PM Women's · Washington State vs Portland | ",
 "Upcoming Dec 8, 6:00 PM Women's · Washington State vs Eastern Washington | ",
 "Upcoming Dec 12, 3:30 PM Women's · Washington State vs Arizona State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Washington State at San Diego | ",
 "Upcoming Dec 16, 6:00 PM Women's · Washington State vs UNLV | ",
 "Upcoming Dec 20, 11:00 AM Women's · Washington State vs Liberty | ",
 "Upcoming Dec 21 Women's · Washington State vs St. Joseph's/Holy Cross | ",
 "Upcoming Dec 30, 6:00 PM Women's · Washington State vs Cal State L.A. | ",
 "Upcoming Jan 9, 12:00 PM Women's · Washington State vs Texas State | ",
 "Upcoming Jan 14, 5:30 PM Women's · Washington State at Boise State | ",
 "Upcoming Jan 17, 1:00 PM Women's · Washington State at Oregon State | ",
 "Upcoming Jan 20, 6:00 PM Women's · Washington State vs Colorado State | ",
 "Upcoming Jan 23, 11:00 AM Women's · Washington State at Utah St | ",
 "Upcoming Jan 28, 6:00 PM Women's · Washington State vs Fresno State | ",
 "Upcoming Jan 31, 12:00 PM Women's · Washington State at Texas State | ",
 "Upcoming Feb 3, 6:00 PM Women's · Washington State vs San Diego State | ",
 "Upcoming Feb 7, 1:00 PM Women's · Washington State vs Oregon State | ",
 "Upcoming Feb 14, 10:30 AM Women's · Washington State at Colorado State | ",
 "Upcoming Feb 17, 7:00 PM Women's · Washington State vs Gonzaga | ",
 "Upcoming Feb 21, 1:00 PM Women's · Washington State at San Diego State | ",
 "Upcoming Feb 24, 6:30 PM Women's · Washington State at Fresno State | ",
 "Upcoming Feb 28, 11:00 AM Women's · Washington State vs Boise State | ",
 "Upcoming Mar 3, 6:00 PM Women's · Washington State vs Utah St | ",
 "Upcoming Mar 6, 7:00 PM Women's · Washington State at Gonzaga | ",
 "Upcoming Mar 10 Women's · Washington State at Pac-12 First Round | ",
 "Upcoming Mar 11 Women's · Washington State at Pac-12 Quarterfinals | ",
 "Upcoming Mar 12 Women's · Washington State at Pac-12 Semifinals | ",
 "Upcoming Mar 13 Women's · Washington State at Pac-12 Championship | "
]);
  const v_api4=parse("Basketball","api-4");
  assert.deepEqual(v_api4.map(line),[
 "Upcoming Oct 18, 1:00 PM Men's · Washington State at New Mexico (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Men's · Washington State at Washington (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Washington State vs Davidson | ",
 "Upcoming Nov 7, 2:00 PM Men's · Washington State at High Point | ",
 "Upcoming Nov 10, 4:00 PM Men's · Washington State at Duquesne | ",
 "Upcoming Nov 14 Men's · Washington State vs Northwest (Wash.) | ",
 "Upcoming Nov 18 Men's · Washington State vs Hawai'i | ",
 "Upcoming Nov 21, 8:00 PM Men's · Washington State vs Duke | ",
 "Upcoming Nov 24, 6:00 PM Men's · Washington State vs Sam Houston | ",
 "Upcoming Nov 27, 5:00 PM Men's · Washington State vs Idaho | ",
 "Upcoming Nov 30 Men's · Washington State at Murray State | ",
 "Upcoming Dec 3, 5:00 PM Men's · Washington State at Southern Illinois | ",
 "Upcoming Dec 6, 1:00 PM Men's · Washington State vs North Dakota State | ",
 "Upcoming Dec 9, 11:00 AM Men's · Washington State at Weber State | ",
 "Upcoming Dec 12 Men's · Washington State vs UNLV | ",
 "Upcoming Dec 19 Men's · Washington State vs Seattle U | ",
 "Upcoming Dec 22 Men's · Washington State vs Eastern Washington | ",
 "Upcoming Dec 28, 5:00 PM Men's · Washington State at LSU | ",
 "Upcoming Jan 3, 1:00 PM Men's · Washington State at Fresno State | ",
 "Upcoming Jan 6, 6:00 PM Men's · Washington State vs Gonzaga | ",
 "Upcoming Jan 13, 6:00 PM Men's · Washington State at Boise State | ",
 "Upcoming Jan 17, 1:00 PM Men's · Washington State vs San Diego State | ",
 "Upcoming Jan 21, 7:00 PM Men's · Washington State at Colorado State | ",
 "Upcoming Jan 23, 3:45 PM Men's · Washington State at Utah State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Washington State vs Oregon State | ",
 "Upcoming Jan 30, 5:30 PM Men's · Washington State vs Fresno State | ",
 "Upcoming Feb 6, 6:00 PM Men's · Washington State vs Texas State | ",
 "Upcoming Feb 10 Men's · Washington State at Oregon State | ",
 "Upcoming Feb 13, 4:45 PM Men's · Washington State vs Colorado State | ",
 "Upcoming Feb 17, 7:00 PM Men's · Washington State at Gonzaga | ",
 "Upcoming Feb 20, 1:30 PM Men's · Washington State at San Diego State | ",
 "Upcoming Feb 25 Men's · Washington State vs Boise State | ",
 "Upcoming Feb 27, 11:15 AM Men's · Washington State at Texas State | ",
 "Upcoming Mar 6, 4:45 PM Men's · Washington State vs Utah State | ",
 "Upcoming Mar 9, 6:00 PM Men's · Washington State vs Pac-12 Play-In Game | ",
 "Upcoming Mar 10 Men's · Washington State at Pac-12 First Round | ",
 "Upcoming Mar 11 Men's · Washington State at Pac-12 Quarterfinals | ",
 "Upcoming Mar 12 Men's · Washington State at Pac-12 Semifinals | ",
 "Upcoming Mar 13, 5:30 PM Men's · Washington State at Pac-12 Championship | "
]);
  const v_api2=parse("Cross Country","api-2");
  assert.deepEqual(v_api2.map(line),[
 "Final Sep 11 Washington State at Cougar Classic | Completed",
 "Final Sep 19 Washington State at John McNichols Invitational | Women's team: 3rd / Men's team: 5th",
 "Final Oct 9 Washington State at Nuttycombe Wisconsin Invitational | Completed",
 "Upcoming Oct 23 Washington State at Tyson Invitational | ",
 "Upcoming Oct 30 Washington State at Pac-12 Championships | ",
 "Upcoming Nov 13 Washington State at NCAA West Regional | ",
 "Upcoming Nov 21 Washington State at NCAA Championships | "
]);
  const v_api3=parse("Football","api-3");
  assert.deepEqual(v_api3.map(line),[
 "Final Sep 6 Washington State at Washington | L, 10-24",
 "Final Sep 12 Washington State at Kansas State | L, 7-34",
 "Final Sep 19 Washington State vs Duquesne | W, 48-7",
 "Final Sep 26 Washington State vs Arizona | L, 24-34",
 "Final Oct 3 Washington State vs Fresno State | L, 6-26",
 "Final Oct 9 Washington State at Utah State | L, 16-17",
 "Final Oct 17 Washington State at Oregon State | L, 30-48",
 "Upcoming Oct 24, 3:00 PM Washington State vs Boise State | ",
 "Upcoming Oct 31, 4:00 PM Washington State at San Diego State | ",
 "Upcoming Nov 14, 7:30 PM Washington State vs Colorado State | ",
 "Upcoming Nov 21, 3:00 PM Washington State at Texas State | ",
 "Upcoming Nov 28 Washington State vs FLEX: Oregon State | ",
 "Upcoming Dec 4 Washington State at Pac-12 Football Championship | "
]);
  const v_api13=parse("Golf","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Final Sep 13 Women's · Washington State at Badger Invitational | 9th",
 "Final Sep 21 Women's · Washington State at Ben Connell Ram Invitational | T4th",
 "Final Oct 5 Women's · Washington State at Pat Lesser Harbottle Invitational | Completed",
 "Today Oct 19 Women's · Washington State at Rainbow Wahine Invitational | ",
 "Upcoming Feb 22 Women's · Washington State at Westbrook Invitational | ",
 "Upcoming Mar 13 Women's · Washington State at Valspar Agusta Invitational | ",
 "Upcoming Mar 22 Women's · Washington State at Bell Bank \"Pay It Forward\" Intercollegiate | ",
 "Upcoming Apr 6 Women's · Washington State at Wyoming Cowgirl Classic | ",
 "Upcoming Apr 25 Women's · Washington State at 2027 Pac-12 Conference Championships | "
]);
  const v_api5=parse("Golf","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Final Sep 7 Men's · Washington State at Bombs Darts Birds Collegiate | 10th",
 "Final Oct 5 Men's · Washington State at Oregon State Invitational | Completed",
 "Final Oct 12 Men's · Washington State at The Bryson Invitational | 3rd",
 "Today Oct 19 Men's · Washington State at Saint Mary's Invitational | ",
 "Upcoming Feb 11 Men's · Washington State at John Burns Intercollegiate | ",
 "Upcoming Feb 15 Men's · Washington State at The Prestige | ",
 "Upcoming Mar 15 Men's · Washington State at Arizona Thunderbirds Intercollegiate | ",
 "Upcoming Mar 25 Men's · Washington State at The Goodwin | ",
 "Upcoming Apr 5 Men's · Washington State at Golfweek Invitational | ",
 "Upcoming Apr 30 Men's · Washington State at Pac-12 Championships | "
]);
  const v_api6=parse("Rowing","api-6");
  assert.deepEqual(v_api6.map(line),[
 "Final Oct 10 Washington State at Head of the Snake | Completed",
 "Final Oct 17 Washington State at Head of the Spokane | Completed",
 "Upcoming Nov 1 Washington State at Head of the Lake | "
]);
  const v_api7=parse("Soccer","api-7");
  assert.deepEqual(v_api7.map(line),[
 "Final Aug 12 Washington State vs Idaho | L, 0-3",
 "Final Aug 15 Washington State vs South Florida | W, 4-1",
 "Final Aug 20 Washington State at South Dakota State | L, 0-3",
 "Final Aug 23 Washington State at North Dakota State | T, 0-0",
 "Final Aug 27 Washington State vs UC Irvine | W, 2-0",
 "Final Sep 3 Washington State vs Utah Valley | L, 0-1",
 "Final Sep 6 Washington State at Hawai'i | T, 0-0",
 "Final Sep 13 Washington State at Cal State Fullerton | T, 1-1",
 "Final Sep 16 Washington State vs Seattle U | W, 2-1",
 "Final Oct 1 Washington State vs Oregon State | W, 3-1",
 "Final Oct 4 Washington State vs Fresno State | W, 4-0",
 "Final Oct 8 Washington State at Utah State | L, 0-2",
 "Final Oct 17 Washington State at Gonzaga | L, 0-2",
 "Upcoming Oct 22, 4:00 PM Washington State vs San Diego State | ",
 "Upcoming Oct 25, 1:00 PM Washington State vs Texas State | ",
 "Upcoming Oct 31, 11:00 AM Washington State at Colorado State | ",
 "Upcoming Nov 5, 6:00 PM Washington State at Boise State | ",
 "Upcoming Nov 11 Washington State at Pac-12 Semifinals | ",
 "Upcoming Nov 14, 6:30 PM Washington State at Pac-12 Final | "
]);
  const v_api8=parse("Swimming & Diving","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Final Oct 10 Washington State vs Seattle U | W, 219-43",
 "Final Oct 16 Washington State vs Air Force and Denver | Denver: L, 144-150 · Air Force: W, 157-137",
 "Final Oct 17 Washington State at MPSF Open Water Championships | 2nd",
 "Final Oct 17 Washington State at Colorado State | Completed",
 "Upcoming Oct 30, 3:30 PM Washington State at Northern Arizona | ",
 "Upcoming Oct 31, 12:00 PM Washington State at Grand Canyon | ",
 "Upcoming Nov 6, 5:00 PM Washington State vs Fresno State | ",
 "Upcoming Nov 19 Washington State at 2026 Northwest Collegiate Invitational | ",
 "Upcoming Jan 29, 5:00 PM Washington State at Idaho | ",
 "Upcoming Feb 24 Washington State at Pac-12 Swimming & Diving Championships | ",
 "Upcoming Mar 17 Washington State at NCAA Championships | "
]);
  const v_api9=parse("Tennis","api-9");
  assert.deepEqual(v_api9.map(line),[
 "Final Sep 11 Washington State at 2026 Cougar Classic | Completed",
 "Final Sep 18 Washington State at Barb Chandler Classic | Completed",
 "Final Oct 2 Washington State at Duck Invitational | Completed",
 "Final Oct 8 Washington State at ITA Northwest Regionals | Completed",
 "Upcoming Oct 23 Washington State at Pac-12 Fall Qualifier | ",
 "Upcoming Oct 30 Washington State at Gonzaga Invitational | ",
 "Upcoming Nov 5 Washington State at ITA Sectional Championships | ",
 "Upcoming Nov 5 Washington State at ITA Masters | ",
 "Upcoming Nov 17 Washington State at NCAA Individuals | "
]);
  const v_api10=parse("Track & Field","api-10");
  assert.deepEqual(v_api10.map(line),[]);
  const v_api11=parse("Volleyball","api-11");
  assert.deepEqual(v_api11.map(line),[
 "Final Aug 15 Washington State vs Idaho (Exhibition) | W, 3-1",
 "Final Aug 28 Washington State vs Omaha | W, 3-0",
 "Final Aug 29 Washington State vs Montana | W, 3-1",
 "Final Aug 30 Washington State vs Central Michigan | W, 3-0",
 "Final Sep 5 Washington State vs Long Island | W, 3-0",
 "Final Sep 6 Washington State at Oregon | L, 1-3",
 "Final Sep 11 Washington State vs Lipscomb | L, 2-3",
 "Final Sep 12 Washington State vs Southern Utah | W, 3-0",
 "Final Sep 13 Washington State at Washington | L, 1-3",
 "Final Sep 17 Washington State vs Long Beach State | L, 0-3",
 "Final Sep 18 Washington State vs Long Beach State | L, 2-3",
 "Final Sep 24 Washington State at Fresno State | W, 3-0",
 "Final Sep 26 Washington State at Oregon State | L, 2-3",
 "Final Oct 3 Washington State vs San Diego State | L, 0-3",
 "Final Oct 8 Washington State at Colorado State | L, 0-3",
 "Final Oct 10 Washington State at Texas State | W, 3-1",
 "Final Oct 15 Washington State at Boise State | W, 3-2",
 "Final Oct 17 Washington State vs Fresno State | L, 2-3",
 "Upcoming Oct 22, 7:30 PM Washington State vs Colorado State | ",
 "Upcoming Oct 24, 11:00 AM Washington State vs Texas State | ",
 "Upcoming Oct 29, 6:00 PM Washington State at Utah State | ",
 "Upcoming Oct 31, 12:00 PM Washington State at San Diego State | ",
 "Upcoming Nov 7, 12:00 PM Washington State at Gonzaga | ",
 "Upcoming Nov 12, 6:00 PM Washington State vs Utah St | ",
 "Upcoming Nov 14, 12:00 PM Washington State vs Oregon State | ",
 "Upcoming Nov 17, 5:00 PM Washington State vs Boise State | ",
 "Upcoming Nov 19, 6:00 PM Washington State vs Gonzaga | ",
 "Upcoming Nov 23 Washington State at Pac-12 Tournament | "
]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api12,"Basketball api-12");
  ownRecapsOnly(v_api4,"Basketball api-4");
  ownRecapsOnly(v_api2,"Cross Country api-2");
  ownRecapsOnly(v_api3,"Football api-3");
  ownRecapsOnly(v_api13,"Golf api-13");
  ownRecapsOnly(v_api5,"Golf api-5");
  ownRecapsOnly(v_api6,"Rowing api-6");
  ownRecapsOnly(v_api7,"Soccer api-7");
  ownRecapsOnly(v_api8,"Swimming & Diving api-8");
  ownRecapsOnly(v_api9,"Tennis api-9");
  ownRecapsOnly(v_api10,"Track & Field api-10");
  ownRecapsOnly(v_api11,"Volleyball api-11");
}
// END generated

// Golf: the score to par, the total, then the place ("+29 (893), 9th",
// "-1 (863), T-4th"). Mutation: without the rule each reads its raw text.
{
  const results=(slug,name)=>parse('Golf',slug).find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('api-13','Badger Invitational'),["Result: 9th","Team score: 893 (+29)"]);
  assert.deepEqual(results('api-13','Ben Connell Ram Invitational'),["Result: T4th","Team score: 863 (-1)"]);
  assert.deepEqual(results('api-5','The Bryson Invitational'),["Result: 3rd","Team score: 861 (-3)"]);
}
// Cross country "3rd (W), 5th (M)": both teams' places.
assert.deepEqual(parse('Cross Country','api-2').find(e=>/McNichols/.test(e.opponent)).results.map(r=>`${r.label}: ${r.value}`),["Women's team: 3rd","Men's team: 5th"]);
// Swimming against two teams at once, scored dual by dual by code ("DU:
// L,150-144; AF: W, 157-137"), the opponent written once ("Air Force/Denver"
// with "Denver" again as the second).
{
  const duals=parse('Swimming & Diving','api-8').find(e=>/Air Force/.test(e.opponent));
  assert.deepEqual([duals.opponent,...duals.results.map(r=>`${r.label}: ${r.value}`)],["Air Force and Denver","Denver: L, 144-150","Air Force: W, 157-137"]);
}
// Head races are events: "at", never "vs".
assert.ok(parse('Rowing','api-6').every(e=>/ at Head of the /.test(e.title)));
// TFRRS names the team "Washington St.": its races are read (the full name
// has no rows). Mutation: without the short-name retry the meets keep
// "Completed".
{
  const meet=parse('Cross Country','api-2').find(e=>/Nuttycombe/.test(e.opponent));
  const tfrrs=new Map([[WASHINGTON_STATE_TFRRS_TEAMS.Women,'tfrrs-team-f.html.gz'],[WASHINGTON_STATE_TFRRS_TEAMS.Men,'tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/28897/Nuttycombe_Wisconsin_Invitational','tfrrs-28897.html.gz']]);
  for(const [url,file] of tfrrs)recapFixtures.set(url,fixture(file));
  await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(meet.headline,"Women's team: 7th · 263 pts / Men's team: 23rd · 561 pts");
  requests.length=0;
}
assert.deepEqual(washingtonStateSchool.opendorse,{marketplace:'washingtonstate-cougars',team:'Washington State Cougars'});

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Washington State module checks passed');
