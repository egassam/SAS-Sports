import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sanDiegoStateSchool} from '../src/schools/san-diego-state.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='san-diego-state');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,sanDiegoStateHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/san-diego-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads goaztecs.com's schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['san-diego-state'];
assert.equal(sports.length,13);
assert.deepEqual(Object.keys(sanDiegoStateSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',sanDiegoStateSchool.scheduleUrls],['roster',sanDiegoStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('san-diego-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'goaztecs.com',`${key} must stay on goaztecs.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/goaztecs\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/goaztecs\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(sanDiegoStateSchool.scheduleUrls[`san-diego-state|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'san-diego-state|"+sport+"':"),`${sport} routes must live in the San Diego State module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'san-diego-state',host:'goaztecs.com',sportIds:Object.fromEntries(Object.entries(sanDiegoStateSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(sanDiegoStateSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(sanDiegoStateSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,sanDiegoStateSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,sanDiegoStateSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),["Basketball","Golf","Soccer","Tennis"]);
const parity={"Baseball":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-basketball/roster","https://goaztecs.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-golf/roster","https://goaztecs.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-soccer/roster","https://goaztecs.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament","https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/womens-tennis/roster","https://goaztecs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=21&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=23&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament"],"roster":["https://goaztecs.com/sports/water-polo/roster"],"combined":false}};

const now=new Date("2026-10-18T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(sanDiegoStateSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${slug.replace(/^api-/,'')}&`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sanDiegoStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=san-diego-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_api1=parse("Baseball","api-1");
  assert.deepEqual(v_api1.map(line),[]);
  const v_api13=parse("Basketball","api-13");
  assert.deepEqual(v_api13.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · San Diego State vs Cal State Fullerton | ",
 "Upcoming Nov 5, 11:00 AM Women's · San Diego State vs North Texas | ",
 "Upcoming Nov 8, 1:00 PM Women's · San Diego State vs UTSA | ",
 "Upcoming Nov 11, 7:00 PM Women's · San Diego State vs Colorado | ",
 "Upcoming Nov 19, 6:00 PM Women's · San Diego State at CSUN | ",
 "Upcoming Nov 22, 1:00 PM Women's · San Diego State vs Winthrop | ",
 "Upcoming Nov 27, 2:00 PM Women's · San Diego State at Hawaii | ",
 "Upcoming Nov 28, 4:30 PM Women's · San Diego State vs Stanford | ",
 "Upcoming Nov 29, 3:30 PM Women's · San Diego State vs Columbia | ",
 "Upcoming Dec 3, 7:00 PM Women's · San Diego State at Santa Clara | ",
 "Upcoming Dec 9, 2:00 PM Women's · San Diego State at Saint Mary's | ",
 "Upcoming Dec 11, 6:00 PM Women's · San Diego State at Pacific | ",
 "Upcoming Dec 20, 12:30 PM Women's · San Diego State vs IU Indy | ",
 "Upcoming Dec 21, 12:30 PM Women's · San Diego State vs Saint Louis | ",
 "Upcoming Dec 29, 6:00 PM Women's · San Diego State vs Point Loma | ",
 "Upcoming Jan 6, 6:00 PM Women's · San Diego State vs Utah State | ",
 "Upcoming Jan 10, 1:00 PM Women's · San Diego State vs Boise State | ",
 "Upcoming Jan 13, 7:00 PM Women's · San Diego State at Oregon State | ",
 "Upcoming Jan 16, 6:00 PM Women's · San Diego State at Colorado State | ",
 "Upcoming Jan 21, 6:00 PM Women's · San Diego State vs Gonzaga | ",
 "Upcoming Jan 24, 9:00 AM Women's · San Diego State at Texas State | ",
 "Upcoming Jan 31, 12:00 PM Women's · San Diego State vs Colorado State | ",
 "Upcoming Feb 3 Women's · San Diego State at Washington State | ",
 "Upcoming Feb 6, 8:00 PM Women's · San Diego State at Gonzaga | ",
 "Upcoming Feb 10, 6:00 PM Women's · San Diego State vs Fresno State | ",
 "Upcoming Feb 14, 1:00 PM Women's · San Diego State at Boise State | ",
 "Upcoming Feb 17, 6:00 PM Women's · San Diego State vs Oregon State | ",
 "Upcoming Feb 21, 1:00 PM Women's · San Diego State vs Washington State | ",
 "Upcoming Feb 24 Women's · San Diego State at Utah State | ",
 "Upcoming Feb 27 Women's · San Diego State at Fresno State | ",
 "Upcoming Mar 6, 1:00 PM Women's · San Diego State vs Texas State | "
]);
  const v_api7=parse("Basketball","api-7");
  assert.deepEqual(v_api7.map(line),[
 "Final Oct 16 Men's · San Diego State at Arizona (Exhibition) | L, 67-82",
 "Upcoming Oct 23, 7:00 PM Men's · San Diego State vs Southern California (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · San Diego State vs Long Beach State (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · San Diego State vs Cal State Fullerton | ",
 "Upcoming Nov 7, 12:30 PM Men's · San Diego State vs Colorado | ",
 "Upcoming Nov 11, 2:00 PM Men's · San Diego State vs Bethune-Cookman | ",
 "Upcoming Nov 15, 12:30 PM Men's · San Diego State vs New Mexico State | ",
 "Upcoming Nov 18, 7:00 PM Men's · San Diego State vs Texas Southern | ",
 "Upcoming Nov 24, 2:30 PM Men's · San Diego State vs Iowa State | ",
 "Upcoming Nov 26 Men's · San Diego State vs Maryland/Tennessee | ",
 "Upcoming Nov 27 Men's · San Diego State vs TBD | ",
 "Upcoming Nov 28 Men's · San Diego State vs TBD (if necessary) | ",
 "Upcoming Dec 5, 1:30 PM Men's · San Diego State vs UNLV | ",
 "Upcoming Dec 11, 7:00 PM Men's · San Diego State vs Montana State | ",
 "Upcoming Dec 19, 7:00 PM Men's · San Diego State vs Brigham Young | ",
 "Upcoming Dec 22, 3:00 PM Men's · San Diego State vs LIU | ",
 "Upcoming Dec 29, 7:00 PM Men's · San Diego State at UCLA | ",
 "Upcoming Dec 31, 2:00 PM Men's · San Diego State vs Life Pacific | ",
 "Upcoming Jan 6, 7:00 PM Men's · San Diego State at Oregon State | ",
 "Upcoming Jan 9, 7:30 PM Men's · San Diego State vs Fresno State | ",
 "Upcoming Jan 14, 6:00 PM Men's · San Diego State vs Colorado State | ",
 "Upcoming Jan 17, 1:00 PM Men's · San Diego State at Washington State | ",
 "Upcoming Jan 20, 7:00 PM Men's · San Diego State vs Texas State | ",
 "Upcoming Jan 23, 7:00 PM Men's · San Diego State at Boise State | ",
 "Upcoming Jan 30, 3:30 PM Men's · San Diego State at Colorado State | ",
 "Upcoming Feb 4, 6:00 PM Men's · San Diego State vs Utah State | ",
 "Upcoming Feb 6, 1:30 PM Men's · San Diego State vs Gonzaga | ",
 "Upcoming Feb 11, 5:00 PM Men's · San Diego State at Texas State | ",
 "Upcoming Feb 17, 5:00 PM Men's · San Diego State at Utah State | ",
 "Upcoming Feb 20, 1:30 PM Men's · San Diego State vs Washington State | ",
 "Upcoming Feb 25, 7:30 PM Men's · San Diego State vs Oregon State | ",
 "Upcoming Feb 27, 1:00 PM Men's · San Diego State at Gonzaga | ",
 "Upcoming Mar 3, 7:00 PM Men's · San Diego State at Fresno State | ",
 "Upcoming Mar 6, 7:30 PM Men's · San Diego State vs Boise State | "
]);
  const v_api14=parse("Cross Country","api-14");
  assert.deepEqual(v_api14.map(line),[
 "Final Sep 3 San Diego State at Aztec Coastal Classic (5K) | 1st",
 "Final Sep 18 San Diego State at Saint Mary's Invitational | 6th",
 "Final Oct 9 San Diego State at Bill Dellinger Invitational | 9th",
 "Final Oct 17 San Diego State at Highlander Invitational | 13th",
 "Upcoming Oct 30 San Diego State at Pac-12 | ",
 "Upcoming Nov 13 San Diego State at NCAA Championships | "
]);
  const v_api5=parse("Football","api-5");
  assert.deepEqual(v_api5.map(line),[
 "Final Sep 5 San Diego State vs Portland State | W, 53-20",
 "Final Sep 12 San Diego State at UCLA | L, 10-28",
 "Final Sep 19 San Diego State vs James Madison | L, 13-26",
 "Final Sep 26 San Diego State at Toledo | L, 16-41",
 "Final Oct 3 San Diego State vs Texas State | W, 31-29",
 "Final Oct 10 San Diego State at Oregon State | L, 14-66",
 "Final Oct 17 San Diego State vs Fresno State | W, 26-23",
 "Upcoming Oct 24, 3:30 PM San Diego State at Colorado State | ",
 "Upcoming Oct 31, 4:00 PM San Diego State vs Washington State | ",
 "Upcoming Nov 14, 6:30 PM San Diego State vs Utah State | ",
 "Upcoming Nov 21, 6:30 PM San Diego State at Boise State | ",
 "Upcoming Nov 28 San Diego State at TBA | ",
 "Upcoming Dec 4, 5:00 PM San Diego State vs TBA | "
]);
  const v_api15=parse("Golf","api-15");
  assert.deepEqual(v_api15.map(line),[
 "Final Sep 8 Women's · San Diego State at Tulane Classic | 4th",
 "Final Sep 21 Women's · San Diego State at Ben Connell Ram Classic | 3rd",
 "Final Oct 12 Women's · San Diego State at Golf Iconic Classic | 1st",
 "Upcoming Oct 19, 12:30 PM Women's · San Diego State at Rainbow Wahine Invitational | ",
 "Upcoming Feb 15, 8:00 AM Women's · San Diego State at The Molly Collegiate Invitational | ",
 "Upcoming Feb 22 Women's · San Diego State at The Causeway Invitational | ",
 "Upcoming Mar 8 Women's · San Diego State at Fresno State Classic | ",
 "Upcoming Mar 22 Women's · San Diego State at Silicon Valley Showcase | ",
 "Upcoming Mar 29 Women's · San Diego State at Coach Mo Classic | ",
 "Upcoming Apr 12 Women's · San Diego State at Bobcat Desert Classic | ",
 "Upcoming Apr 25 Women's · San Diego State at Pac-12 Championship | ",
 "Upcoming May 10 Women's · San Diego State at NCAA Regionals | ",
 "Upcoming May 21 Women's · San Diego State at NCAA Championships | "
]);
  const v_api8=parse("Golf","api-8");
  assert.deepEqual(v_api8.map(line),[
 "Final Sep 12 Men's · San Diego State at Sahalee Players | T10th of 12",
 "Final Sep 14 Men's · San Diego State at Vuori Invitational | 7th of 12",
 "Final Sep 25 Men's · San Diego State at William H. Tucker Intercollegiate | 1st of 15",
 "Upcoming Jan 25 Men's · San Diego State at Southwestern Invitational | ",
 "Upcoming Feb 28 Men's · San Diego State at TPC Summerlin Invitational | ",
 "Upcoming Mar 8 Men's · San Diego State at The Desimone Invitational | ",
 "Upcoming Mar 15 Men's · San Diego State at Pauma Valley Invitational | ",
 "Upcoming Mar 21 Men's · San Diego State at Game Above Collegiate | ",
 "Upcoming Apr 5 Men's · San Diego State at Golfweek Invitational | ",
 "Upcoming Apr 12 Men's · San Diego State at Western Intercollegiate | ",
 "Upcoming Apr 30 Men's · San Diego State at Pac-12 Championship | ",
 "Upcoming May 17 Men's · San Diego State at NCAA Regional | ",
 "Upcoming May 28 Men's · San Diego State at NCAA Championship | "
]);
  const v_api16=parse("Lacrosse","api-16");
  assert.deepEqual(v_api16.map(line),[]);
  const v_api18=parse("Soccer","api-18");
  assert.deepEqual(v_api18.map(line),[
 "Final Aug 12 Women's · San Diego State at UC San Diego | W, 2-0",
 "Final Aug 19 Women's · San Diego State vs Washington | L, 0-1",
 "Final Aug 23 Women's · San Diego State vs Portland State | W, 1-0",
 "Final Aug 27 Women's · San Diego State vs Pacific | W, 7-0",
 "Final Sep 3 Women's · San Diego State at Oklahoma State | T, 1-1",
 "Final Sep 6 Women's · San Diego State at Texas Tech | L, 1-2",
 "Final Sep 12 Women's · San Diego State at Utah Valley | W, 2-1",
 "Final Sep 17 Women's · San Diego State vs Pepperdine | W, 2-0",
 "Final Sep 20 Women's · San Diego State vs Northern Colorado | W, 5-0",
 "Final Oct 1 Women's · San Diego State vs Boise State | L, 1-4",
 "Final Oct 4 Women's · San Diego State at Texas State | W, 1-0",
 "Final Oct 8 Women's · San Diego State at Oregon State | T, 2-2",
 "Final Oct 11 Women's · San Diego State vs Colorado State | W, 3-1",
 "Upcoming Oct 22, 4:00 PM Women's · San Diego State at Washington State | ",
 "Upcoming Oct 25, 12:00 PM Women's · San Diego State vs Fresno State | ",
 "Upcoming Oct 30, 7:00 PM Women's · San Diego State vs Gonzaga | ",
 "Upcoming Nov 5, 6:30 PM Women's · San Diego State at Utah State | ",
 "Upcoming Nov 11 Women's · San Diego State at Pac-12 Tournament Semifinal | ",
 "Upcoming Nov 14, 6:30 PM Women's · San Diego State at Pac-12 Tournament Final | "
]);
  const v_api9=parse("Soccer","api-9");
  assert.deepEqual(v_api9.map(line),[
 "Final Aug 15 Men's · San Diego State vs Point Loma (Friendly) (Exhibition) | W, 1-0",
 "Final Aug 20 Men's · San Diego State vs Liberty | L, 1-2",
 "Final Aug 23 Men's · San Diego State vs Navy | T, 2-2",
 "Final Aug 27 Men's · San Diego State vs Life Pacific | W, 7-1",
 "Final Aug 30 Men's · San Diego State at Cal Poly | T, 1-1",
 "Final Sep 5 Men's · San Diego State vs Cal State Bakersfield | T, 2-2",
 "Final Sep 11 Men's · San Diego State vs Sacramento State | W, 2-0",
 "Final Sep 13 Men's · San Diego State at San Diego | L, 1-2",
 "Final Sep 17 Men's · San Diego State at UC Santa Barbara | L, 0-2",
 "Final Sep 20 Men's · San Diego State at Santa Clara | L, 1-2",
 "Final Sep 26 Men's · San Diego State vs Cal State Fullerton | L, 0-3",
 "Final Sep 30 Men's · San Diego State at Oregon State | T, 2-2",
 "Final Oct 3 Men's · San Diego State at CSUN | L, 0-3",
 "Final Oct 7 Men's · San Diego State vs Cal Poly | T, 1-1",
 "Final Oct 10 Men's · San Diego State vs Gonzaga | W, 1-0",
 "Final Oct 14 Men's · San Diego State at UC Irvine | L, 0-1",
 "Final Oct 17 Men's · San Diego State at California Baptist | T, 0-0",
 "Upcoming Oct 21, 7:00 PM Men's · San Diego State vs Utah Valley | ",
 "Upcoming Oct 24, 7:00 PM Men's · San Diego State at UC Riverside | ",
 "Upcoming Oct 31, 7:00 PM Men's · San Diego State vs UC San Diego | ",
 "Upcoming Nov 7 Men's · San Diego State at Pac-12 Tournament (Semifinals) | ",
 "Upcoming Nov 14 Men's · San Diego State at Pac-12 Tournament Championship | "
]);
  const v_api12=parse("Softball","api-12");
  assert.deepEqual(v_api12.map(line),[
 "Upcoming Feb 12, 11:00 AM San Diego State vs Oregon | ",
 "Upcoming Feb 13, 1:30 PM San Diego State vs California | ",
 "Upcoming Feb 13, 4:00 PM San Diego State at Hawaii | ",
 "Upcoming Feb 14, 11:00 AM San Diego State vs Utah Valley | ",
 "Upcoming Feb 14, 1:30 PM San Diego State vs Texas | ",
 "Upcoming Feb 19, 2:00 PM San Diego State vs Portland State | ",
 "Upcoming Feb 19, 7:00 PM San Diego State vs Texas | ",
 "Upcoming Feb 20, 2:00 PM San Diego State vs Kentucky | ",
 "Upcoming Feb 20, 4:30 PM San Diego State vs Loyola Marymount | ",
 "Upcoming Feb 21, 12:30 PM San Diego State vs Loyola Marymount | ",
 "Upcoming Feb 25, 8:00 PM San Diego State vs Bethune-Cookman | ",
 "Upcoming Feb 26, 3:00 PM San Diego State vs Rutgers | ",
 "Upcoming Feb 26, 5:30 PM San Diego State vs Saint Mary's | ",
 "Upcoming Feb 27, 2:30 PM San Diego State vs Mississippi State | ",
 "Upcoming Feb 27, 7:30 PM San Diego State vs Cal State Fullerton | ",
 "Upcoming Mar 4, 6:00 PM San Diego State vs Brigham Young | ",
 "Upcoming Mar 5, 6:00 PM San Diego State vs Long Beach State | ",
 "Upcoming Mar 6, 1:30 PM San Diego State vs Long Island | ",
 "Upcoming Mar 6, 4:00 PM San Diego State vs UC Riverside | ",
 "Upcoming Mar 12, 4:00 PM San Diego State vs North Dakota State | ",
 "Upcoming Mar 13, 4:00 PM San Diego State vs Holy Cross | ",
 "Upcoming Mar 14, 1:00 PM San Diego State vs Nevada | ",
 "Upcoming Mar 14, 3:30 PM San Diego State vs Grand Canyon | ",
 "Upcoming Mar 16, 6:00 PM San Diego State vs UNLV | ",
 "Upcoming Mar 20, 1:00 PM San Diego State at Stanford | ",
 "Upcoming Mar 20, 3:30 PM San Diego State at Stanford | ",
 "Upcoming Mar 21, 1:00 PM San Diego State at Stanford | ",
 "Upcoming Mar 23, 6:00 PM San Diego State vs San Diego | ",
 "Upcoming Mar 25, 6:00 PM San Diego State vs Oregon State | ",
 "Upcoming Mar 26, 6:00 PM San Diego State vs Oregon State | ",
 "Upcoming Mar 27, 12:00 PM San Diego State vs Oregon State | ",
 "Upcoming Apr 2, 6:00 PM San Diego State at Boise State | ",
 "Upcoming Apr 3, 3:00 PM San Diego State at Boise State | ",
 "Upcoming Apr 4, 11:00 AM San Diego State at Boise State | ",
 "Upcoming Apr 6, 6:00 PM San Diego State at California Baptist | ",
 "Upcoming Apr 9, 3:00 PM San Diego State at Colorado State | ",
 "Upcoming Apr 10, 1:00 PM San Diego State at Colorado State | ",
 "Upcoming Apr 11, 11:00 AM San Diego State at Colorado State | ",
 "Upcoming Apr 14, 6:00 PM San Diego State vs California | ",
 "Upcoming Apr 16, 6:00 PM San Diego State vs Utah State | ",
 "Upcoming Apr 17, 4:00 PM San Diego State vs Utah State | ",
 "Upcoming Apr 18, 12:00 PM San Diego State vs Utah State | ",
 "Upcoming Apr 23, 4:00 PM San Diego State at Texas State | ",
 "Upcoming Apr 24, 12:00 PM San Diego State at Texas State | ",
 "Upcoming Apr 25, 10:00 AM San Diego State at Texas State | ",
 "Upcoming Apr 28, 6:00 PM San Diego State vs Arizona State | ",
 "Upcoming Apr 30, 6:00 PM San Diego State vs Fresno State | ",
 "Upcoming May 1, 6:00 PM San Diego State vs Fresno State | ",
 "Upcoming May 2, 12:00 PM San Diego State vs Fresno State | ",
 "Upcoming May 12 San Diego State at Pac-12 Tournament | "
]);
  const v_api19=parse("Swimming & Diving","api-19");
  assert.deepEqual(v_api19.map(line),[
 "Final Sep 18 San Diego State at San Diego | W, 33-24",
 "Final Oct 2 San Diego State at San Diego | W, 79-64",
 "Final Oct 15 San Diego State at Pepperdine | W, 84-59",
 "Final Oct 16 San Diego State at Gary Ota Memorial Invitational | 1st of 5",
 "Upcoming Nov 6, 11:00 AM San Diego State at Rick Rowland Joust | ",
 "Upcoming Nov 18 San Diego State at Trailblazer Invitational | ",
 "Upcoming Nov 19 San Diego State at Lumberjack Diving Invite #1 | ",
 "Upcoming Dec 18, 3:00 PM San Diego State vs Cal State Bakersfield | ",
 "Upcoming Jan 4, 1:00 PM San Diego State at SDSU Quad Meet | ",
 "Upcoming Jan 8, 10:30 AM San Diego State vs San Diego State Double Dual #1 | ",
 "Upcoming Jan 8 San Diego State at Bruin Diving Invitational | ",
 "Upcoming Jan 9, 10:30 AM San Diego State at Aztec Invitational | ",
 "Upcoming Jan 12, 2:00 PM San Diego State vs San Diego State Double Dual #2 | ",
 "Upcoming Jan 16, 11:00 AM San Diego State vs GCU Double Dual | ",
 "Upcoming Jan 22, 2:00 PM San Diego State vs San Diego | ",
 "Upcoming Jan 28 San Diego State at Lumberjack Diving Invitational #2 | ",
 "Upcoming Feb 24 San Diego State at Pac-12 Championships | ",
 "Upcoming Mar 8 San Diego State at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 17 San Diego State at NCAA Championships | "
]);
  const v_api20=parse("Tennis","api-20");
  assert.deepEqual(v_api20.map(line),[
 "Final Sep 19 Women's · San Diego State at ITA All-American Championships | No team score (individuals only)",
 "Final Sep 24 Women's · San Diego State at USTA SoCal Intercollegiate Championships | No team score (individuals only)",
 "Today Oct 15, 9:00 AM Women's · San Diego State at ITA Southwest Regional Championships | ",
 "Upcoming Oct 23 Women's · San Diego State at Pac-12 Fall Qualifier | ",
 "Upcoming Nov 6 Women's · San Diego State at Aztec Fall Invitational | "
]);
  const v_api10=parse("Tennis","api-10");
  assert.deepEqual(v_api10.map(line),[
 "Final Sep 11 Men's · San Diego State at Kinlen & Vivian Gee Wildcat Invite | No team score (individuals only)",
 "Final Oct 2 Men's · San Diego State at San Diego Veterans Tennis Classic | No team score (individuals only)",
 "Today Oct 15, 9:00 AM Men's · San Diego State at ITA Southwest Regional Championships | ",
 "Upcoming Oct 23 Men's · San Diego State at Pac-12 Fall Qualifier | ",
 "Upcoming Oct 30 Men's · San Diego State at Dennis Rizza Hidden Duals | ",
 "Upcoming Nov 6 Men's · San Diego State at USTA SoCal Intercollegiate Championships | "
]);
  const v_api21=parse("Track & Field","api-21");
  assert.deepEqual(v_api21.map(line),[]);
  const v_api22=parse("Volleyball","api-22");
  assert.deepEqual(v_api22.map(line),[
 "Final Aug 28 San Diego State vs IU Indy | W, 3-1",
 "Final Aug 29 San Diego State at Washington | L, 0-3",
 "Final Aug 30 San Diego State vs UC Irvine | W, 3-0",
 "Final Sep 3 San Diego State at UC Davis | W, 3-0",
 "Final Sep 4 San Diego State vs Cal Poly | L, 1-3",
 "Final Sep 11 San Diego State at Santa Clara | W, 3-0",
 "Final Sep 12 San Diego State vs California | L, 2-3",
 "Final Sep 13 San Diego State vs CSU Bakersfield | W, 3-1",
 "Final Sep 18 San Diego State vs Arizona | L, 2-3",
 "Final Sep 19 San Diego State at San Diego | L, 1-3",
 "Final Sep 24 San Diego State at Colorado State | L, 1-3",
 "Final Sep 26 San Diego State at Fresno State | W, 3-0",
 "Final Oct 1 San Diego State at Boise State | W, 3-1",
 "Final Oct 3 San Diego State at Washington State | W, 3-0",
 "Final Oct 8 San Diego State vs Oregon State | W, 3-0",
 "Final Oct 10 San Diego State vs Gonzaga | W, 3-0",
 "Final Oct 15 San Diego State vs Utah State | W, 3-2",
 "Final Oct 17 San Diego State vs Texas State | W, 3-0",
 "Upcoming Oct 24, 12:00 PM San Diego State at Gonzaga | ",
 "Upcoming Oct 29, 6:00 PM San Diego State vs Boise State | ",
 "Upcoming Oct 31, 12:00 PM San Diego State vs Washington State | ",
 "Upcoming Nov 5, 6:00 PM San Diego State vs Fresno State | ",
 "Upcoming Nov 12, 4:00 PM San Diego State at Texas St. | ",
 "Upcoming Nov 14, 12:00 PM San Diego State vs Colorado State | ",
 "Upcoming Nov 17, 6:00 PM San Diego State at Oregon State | ",
 "Upcoming Nov 19, 6:00 PM San Diego State at Utah State | ",
 "Upcoming Nov 23 San Diego State at Pac-12 Championship | "
]);
  const v_api23=parse("Water Polo","api-23");
  assert.deepEqual(v_api23.map(line),[]);
  ownRecapsOnly(v_api1,"Baseball api-1");
  ownRecapsOnly(v_api13,"Basketball api-13");
  ownRecapsOnly(v_api7,"Basketball api-7");
  ownRecapsOnly(v_api14,"Cross Country api-14");
  ownRecapsOnly(v_api5,"Football api-5");
  ownRecapsOnly(v_api15,"Golf api-15");
  ownRecapsOnly(v_api8,"Golf api-8");
  ownRecapsOnly(v_api16,"Lacrosse api-16");
  ownRecapsOnly(v_api18,"Soccer api-18");
  ownRecapsOnly(v_api9,"Soccer api-9");
  ownRecapsOnly(v_api12,"Softball api-12");
  ownRecapsOnly(v_api19,"Swimming & Diving api-19");
  ownRecapsOnly(v_api20,"Tennis api-20");
  ownRecapsOnly(v_api10,"Tennis api-10");
  ownRecapsOnly(v_api21,"Track & Field api-21");
  ownRecapsOnly(v_api22,"Volleyball api-22");
  ownRecapsOnly(v_api23,"Water Polo api-23");
}
// END generated

// Golf: one entry a day, each named after the tournament with no tournament
// object, is one event with the last day's place; "4th - 890 (+26)" and
// "T-10th of 12; 906 (+42)" give the place and the team score. Mutation:
// without the opponent-name merge the Tulane Classic is two finals (T-4th
// after day one); without the formats each reads its raw text.
{
  const results=(slug,name)=>parse('Golf',slug).filter(e=>e.opponent===name).map(e=>e.results.map(r=>`${r.label}: ${r.value}`));
  assert.deepEqual(results('api-15','Tulane Classic'),[["Result: 4th","Team score: 890 (+26)"]]);
  assert.deepEqual(results('api-15','Golf Iconic Classic'),[["Result: 1st","Team score: 851 (-13)"]]);
  assert.deepEqual(results('api-8','Sahalee Players'),[["Result: T10th of 12","Team score: 906 (+42)"]]);
  assert.deepEqual(results('api-8','William H. Tucker Intercollegiate'),[["Result: 1st of 15","Team score: 833 (-31)"]]);
}
// Rankings written into names ("#9 San Diego", "No. 10 Washington", "(rv)
// Cal Poly") are not part of them.
{
  const opponents=(sport,slug)=>parse(sport,slug).map(e=>e.opponent);
  assert.ok(opponents('Soccer','api-9').includes('San Diego')&&!opponents('Soccer','api-9').some(o=>/^#|^No\. /.test(o)));
  assert.ok(opponents('Soccer','api-18').includes('Washington'));
  assert.ok(opponents('Volleyball','api-22').includes('Cal Poly')&&!opponents('Volleyball','api-22').some(o=>/\(rv\)/i.test(o)));
}
// Cross country meets named by their host take the meet's name from their
// story ("... at Bill Dellinger Invitational"); "6th (157 pts)" is the place
// and the team score.
{
  const meets=parse('Cross Country','api-14').filter(e=>e.status==='Final').map(e=>`${e.opponent}: ${e.results.map(r=>`${r.label} ${r.value}`).join(', ')}`);
  assert.deepEqual(meets,["Aztec Coastal Classic (5K): Result 1st, Team score 27 pts","Saint Mary's Invitational: Result 6th, Team score 157 pts","Bill Dellinger Invitational: Result 9th, Team score 233 pts","Highlander Invitational: Result 13th, Team score 339 pts"]);
}
// Swimming "1st of 5 teams (1,090.50 pts)"; tennis "NTS"; the ATP San Diego
// Challenger is a pro event, not listed.
{
  const ota=parse('Swimming & Diving','api-19').find(e=>/Gary Ota/.test(e.opponent));
  assert.deepEqual(ota.results.map(r=>`${r.label}: ${r.value}`),["Result: 1st of 5","Team score: 1,090.50 pts"]);
  const men=parse('Tennis','api-10');
  assert.ok(!men.some(e=>/Challenger/.test(e.opponent)));
  assert.equal(men.find(e=>/Veterans/.test(e.opponent)).headline,'No team score (individuals only)');
}
// NIL marketplace and pins.
assert.deepEqual(sanDiegoStateSchool.inflcr,{school:'san-diego-state-university'});
assert.ok(!Object.keys(sanDiegoStateSchool.verifiedInstagrams).some(key=>/\d{4}$/.test(key)),'no season roster as an athlete');

assert.equal(requests.length,0,'no unexpected network requests');
console.log('San Diego State module checks passed');
