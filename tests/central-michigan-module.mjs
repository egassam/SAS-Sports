import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {centralMichiganSchool} from '../src/schools/central-michigan.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='central-michigan');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,centralMichiganHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/central-michigan-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cmuchippewas.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['central-michigan'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',centralMichiganSchool.scheduleUrls],['roster',centralMichiganSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('central-michigan|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cmuchippewas.com',`${key} must stay on cmuchippewas.com`);
  }
}
const parity={"Baseball":{"schedule":["https://cmuchippewas.com/sports/baseball/schedule"],"roster":["https://cmuchippewas.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://cmuchippewas.com/sports/mens-basketball/schedule","https://cmuchippewas.com/sports/womens-basketball/schedule"],"roster":["https://cmuchippewas.com/sports/mens-basketball/roster","https://cmuchippewas.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://cmuchippewas.com/sports/womens-cross-country/schedule","https://cmuchippewas.com/sports/mens-cross-country/schedule"],"roster":["https://cmuchippewas.com/sports/womens-cross-country/roster","https://cmuchippewas.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://cmuchippewas.com/sports/field-hockey/schedule"],"roster":["https://cmuchippewas.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://cmuchippewas.com/sports/football/schedule"],"roster":["https://cmuchippewas.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://cmuchippewas.com/sports/womens-golf/schedule","https://cmuchippewas.com/sports/mens-golf/schedule"],"roster":["https://cmuchippewas.com/sports/womens-golf/roster","https://cmuchippewas.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://cmuchippewas.com/sports/womens-gymnastics/schedule"],"roster":["https://cmuchippewas.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://cmuchippewas.com/sports/womens-lacrosse/schedule"],"roster":["https://cmuchippewas.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://cmuchippewas.com/sports/womens-soccer/schedule"],"roster":["https://cmuchippewas.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://cmuchippewas.com/sports/softball/schedule"],"roster":["https://cmuchippewas.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://cmuchippewas.com/sports/womens-track-and-field/schedule"],"roster":["https://cmuchippewas.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://cmuchippewas.com/sports/womens-volleyball/schedule"],"roster":["https://cmuchippewas.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://cmuchippewas.com/sports/wrestling/schedule"],"roster":["https://cmuchippewas.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'central-michigan|"+sport+"':"),`${sport} routes must live in the Central Michigan module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://cmuchippewas.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.centralMichiganHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=central-michigan)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Central Michigan vs Saginaw Valley State (Exhibition) | W, 99-62",
 "Upcoming Oct 27, 7:30 PM Men's · Central Michigan vs North Park (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Central Michigan at Louisiana-Monroe | ",
 "Upcoming Nov 6, 7:00 PM Men's · Central Michigan vs Alma | ",
 "Upcoming Nov 10, 7:00 PM Men's · Central Michigan vs Youngstown State | ",
 "Upcoming Nov 14, 3:30 PM Men's · Central Michigan at Northern Kentucky | ",
 "Upcoming Nov 17, 7:00 PM Men's · Central Michigan at Dayton | ",
 "Upcoming Nov 20, 7:00 PM Men's · Central Michigan at Pittsburgh | ",
 "Upcoming Nov 24, 8:00 PM Men's · Central Michigan at Notre Dame | ",
 "Upcoming Dec 2 Men's · Central Michigan at Miami (Ohio) | ",
 "Upcoming Dec 5 Men's · Central Michigan vs Ohio | ",
 "Upcoming Dec 9, 7:00 PM Men's · Central Michigan vs Kent State | ",
 "Upcoming Dec 12, 2:00 PM Men's · Central Michigan at Eastern Michigan | ",
 "Upcoming Dec 22, 7:00 PM Men's · Central Michigan at Arkansas | ",
 "Upcoming Dec 29 Men's · Central Michigan vs UM-Dearborn | ",
 "Upcoming Jan 2, 3:00 PM Men's · Central Michigan vs Toledo | ",
 "Upcoming Jan 5, 7:00 PM Men's · Central Michigan vs Bowling Green | ",
 "Upcoming Jan 9, 1:30 PM Men's · Central Michigan at Ball State | ",
 "Upcoming Jan 12, 7:00 PM Men's · Central Michigan vs Buffalo | ",
 "Upcoming Jan 16, 3:30 PM Men's · Central Michigan at Massachusetts | ",
 "Upcoming Jan 19, 7:00 PM Men's · Central Michigan at Akron | ",
 "Upcoming Jan 23 Men's · Central Michigan vs Western Michigan | ",
 "Upcoming Jan 26, 7:00 PM Men's · Central Michigan at Toledo | ",
 "Upcoming Jan 30, 2:00 PM Men's · Central Michigan at Kent State | ",
 "Upcoming Feb 2, 7:00 PM Men's · Central Michigan vs Massachusetts | ",
 "Upcoming Feb 6 Men's · Central Michigan at MAC-SBC Challenge | ",
 "Upcoming Feb 9, 7:00 PM Men's · Central Michigan vs Eastern Michigan | ",
 "Upcoming Feb 13 Men's · Central Michigan at Ohio | ",
 "Upcoming Feb 16, 6:30 PM Men's · Central Michigan at Buffalo | ",
 "Upcoming Feb 20 Men's · Central Michigan vs Miami (Ohio) | ",
 "Upcoming Feb 23, 7:00 PM Men's · Central Michigan at Bowling Green | ",
 "Upcoming Feb 27, 5:00 PM Men's · Central Michigan at Western Michigan | ",
 "Upcoming Mar 2, 7:00 PM Men's · Central Michigan vs Akron | ",
 "Upcoming Mar 5, 7:00 PM Men's · Central Michigan vs Ball State | ",
 "Upcoming Mar 10 Men's · Central Michigan at 2027 Mid-American Conference Tournament (March 10-13, 2026) | ",
 "Upcoming Mar 11 Men's · Central Michigan at 2027 Mid-American Conference Tournament (March 10-13, 2026) | ",
 "Upcoming Mar 12 Men's · Central Michigan at 2027 Mid-American Conference Tournament (March 10-13, 2026) | ",
 "Upcoming Mar 13 Men's · Central Michigan at 2027 Mid-American Conference Tournament (March 10-13, 2026) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 1:00 PM Women's · Central Michigan vs IU Indianapolis (Exhibition) | ",
 "Upcoming Nov 2, 11:00 AM Women's · Central Michigan vs Old Dominion | ",
 "Upcoming Nov 5, 6:30 PM Women's · Central Michigan at Ohio State | ",
 "Upcoming Nov 8, 1:00 PM Women's · Central Michigan vs Butler | ",
 "Upcoming Nov 16, 8:00 PM Women's · Central Michigan vs Michigan | ",
 "Upcoming Nov 22 Women's · Central Michigan at Minnesota | ",
 "Upcoming Nov 24, 12:00 PM Women's · Central Michigan at Saint Thomas | ",
 "Upcoming Nov 27 Women's · Central Michigan vs Tulsa | ",
 "Upcoming Nov 28 Women's · Central Michigan vs Central Florida | ",
 "Upcoming Dec 6, 1:00 PM Women's · Central Michigan vs Valparaiso | ",
 "Upcoming Dec 10, 11:00 AM Women's · Central Michigan at Purdue | ",
 "Upcoming Dec 20, 1:00 PM Women's · Central Michigan at Lindenwood | ",
 "Upcoming Dec 29, 6:30 PM Women's · Central Michigan vs Indiana Wesleyan | ",
 "Upcoming Jan 2, 1:00 PM Women's · Central Michigan at Ball State | ",
 "Upcoming Jan 6, 6:30 PM Women's · Central Michigan vs Bowling Green | ",
 "Upcoming Jan 9, 1:00 PM Women's · Central Michigan at Kent State | ",
 "Upcoming Jan 13, 6:30 PM Women's · Central Michigan vs Eastern Michigan | ",
 "Upcoming Jan 16 Women's · Central Michigan at Miami (OH) | ",
 "Upcoming Jan 20, 6:00 PM Women's · Central Michigan at Akron | ",
 "Upcoming Jan 23, 1:00 PM Women's · Central Michigan vs Massachusetts | ",
 "Upcoming Jan 27, 11:00 AM Women's · Central Michigan at Buffalo | ",
 "Upcoming Jan 30, 1:00 PM Women's · Central Michigan vs Western Michigan | ",
 "Upcoming Feb 3, 6:30 PM Women's · Central Michigan vs Miami (OH) | ",
 "Upcoming Feb 6 Women's · Central Michigan at MAC-Sun Belt Challenge | ",
 "Upcoming Feb 10, 7:00 PM Women's · Central Michigan at Toledo | ",
 "Upcoming Feb 13, 1:00 PM Women's · Central Michigan vs Akron | ",
 "Upcoming Feb 17, 6:30 PM Women's · Central Michigan vs Ohio | ",
 "Upcoming Feb 20, 12:00 PM Women's · Central Michigan at Western Michigan | ",
 "Upcoming Feb 24, 6:30 PM Women's · Central Michigan vs Ball State | ",
 "Upcoming Feb 27, 1:00 PM Women's · Central Michigan at Eastern Michigan | ",
 "Upcoming Mar 3, 7:00 PM Women's · Central Michigan at Bowling Green | ",
 "Upcoming Mar 6, 1:00 PM Women's · Central Michigan vs Buffalo | ",
 "Upcoming Mar 10 Women's · Central Michigan at MAC Tournament First Round | ",
 "Upcoming Mar 11 Women's · Central Michigan at MAC Tournament Quarterfinals | ",
 "Upcoming Mar 12 Women's · Central Michigan at MAC Tournament Semifinals | ",
 "Upcoming Mar 13, 11:00 AM Women's · Central Michigan at MAC Tournament Final | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Central Michigan at Jeff Drenth Memorial | 1st of 9",
 "Final Sep 18 Women's · Central Michigan at George Dales Invitational | 8th of 13",
 "Final Oct 2 Women's · Central Michigan at Joe Piane Invite | 4th of 24",
 "Final Oct 16 Women's · Central Michigan at Pre Nationals | 10th of 26",
 "Upcoming Oct 30, 11:00 AM Women's · Central Michigan at MAC Championships | ",
 "Upcoming Nov 13 Women's · Central Michigan at Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Central Michigan at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Central Michigan at Jeff Drenth Memorial | 1st of 8",
 "Final Sep 18 Men's · Central Michigan at George Dales Invitational | 3rd of 10",
 "Final Oct 2 Men's · Central Michigan at Joe Piane Invite | 15th of 18",
 "Final Oct 16 Men's · Central Michigan at Pre Nationals | 12th of 16",
 "Upcoming Oct 30, 12:00 PM Men's · Central Michigan at MAC Championships | ",
 "Upcoming Nov 13 Men's · Central Michigan at Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Central Michigan at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Central Michigan at UC Davis | L, 1-2",
 "Final Aug 30 Central Michigan at California | L, 2-4",
 "Final Aug 31 Central Michigan at Stanford | L, 1-2",
 "Final Sep 6 Central Michigan vs New Hampshire | L, 1-2",
 "Final Sep 7 Central Michigan at Indiana | L, 0-5",
 "Final Sep 11 Central Michigan vs Mercyhurst | W, 9-0",
 "Final Sep 13 Central Michigan vs Saint Louis | W, 3-2",
 "Final Sep 18 Central Michigan at Kent State | L, 0-1",
 "Final Sep 20 Central Michigan vs Michigan | L, 0-5",
 "Final Sep 25 Central Michigan vs Ball State | W, 1-0",
 "Final Sep 27 Central Michigan vs Massachusetts | L, 0-3",
 "Final Oct 2 Central Michigan at Ohio | L, 1-2",
 "Final Oct 9 Central Michigan vs Longwood | W, 7-0",
 "Final Oct 11 Central Michigan at Saint Louis | L, 1-2",
 "Final Oct 16 Central Michigan at Appalachian State | L, 0-5",
 "Final Oct 18 Central Michigan at James Madison | L, 1-3",
 "Upcoming Oct 23, 2:00 PM Central Michigan vs Bellarmine | ",
 "Upcoming Oct 30, 2:00 PM Central Michigan vs Miami (OH) | ",
 "Upcoming Nov 4 Central Michigan at Mid-American Conference Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Central Michigan at New Mexico | L, 7-38",
 "Final Sep 12 Central Michigan vs Colgate | W, 13-10",
 "Final Sep 19 Central Michigan vs Wyoming | W, 24-10",
 "Final Sep 26 Central Michigan at Miami (Fla.) | L, 3-52",
 "Final Oct 3 Central Michigan vs Akron | W, 41-17",
 "Final Oct 10 Central Michigan at Ohio | L, 14-31",
 "Final Oct 17 Central Michigan vs Western Michigan | L, 14-21",
 "Upcoming Oct 24, 1:00 PM Central Michigan vs Miami (Ohio) | ",
 "Upcoming Nov 4, 7:00 PM Central Michigan vs Eastern Michigan | ",
 "Upcoming Nov 11, 7:00 PM Central Michigan vs Sacramento State | ",
 "Upcoming Nov 18, 7:00 PM Central Michigan at Buffalo | ",
 "Upcoming Nov 28, 12:00 PM Central Michigan at Ball State | ",
 "Upcoming Dec 5, 12:00 PM Central Michigan at MAC Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Central Michigan at A-Ga-Ming Invitational | 1st of 13",
 "Final Sep 14 Women's · Central Michigan at Rocket Classic | 1st of 7",
 "Final Sep 20 Women's · Central Michigan at Mary Fossum Invitational | 2nd of 15",
 "Final Oct 12 Women's · Central Michigan at Motor City Matchup | Match play: 2-0",
 "Final Oct 19 Women's · Central Michigan at Dayton Flyer Invitational | 3rd of 11",
 "Upcoming Jan 25 Women's · Central Michigan at Sea Best Intercollegiate | ",
 "Upcoming Mar 7 Women's · Central Michigan at Chris Banister Classic | ",
 "Upcoming Mar 21 Women's · Central Michigan at City of Oaks Collegiate | ",
 "Upcoming Apr 12 Women's · Central Michigan at Terps Invitational | ",
 "Upcoming Apr 25 Women's · Central Michigan at MAC Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Central Michigan at Joe Feaganes Marshall Inv. | 12th of 14",
 "Final Sep 26 Men's · Central Michigan at Earl Yestingmeier Inv. | T9th of 16",
 "Final Oct 5 Men's · Central Michigan at Kemper Lakes Intercollegiate | 10th of 12",
 "Final Oct 12 Men's · Central Michigan at Motor City Matchup | Match play: 2-0",
 "Upcoming Feb 12 Men's · Central Michigan at Palmas del Mar Collegiate | ",
 "Upcoming Feb 28 Men's · Central Michigan at Lake Jovita Inv. | ",
 "Upcoming Mar 22 Men's · Central Michigan at Pathway to Progression Collegiate Inv. | ",
 "Upcoming Apr 5 Men's · Central Michigan at Tiger Intercollegiate | ",
 "Upcoming Apr 9 Men's · Central Michigan at Robert Kepler Inv. | ",
 "Upcoming Apr 17 Men's · Central Michigan at Boilermaker Inv. | ",
 "Upcoming Apr 30 Men's · Central Michigan at Mid-American Conference Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24 Central Michigan at Louisville Play Day (Exhibition) | ",
 "Upcoming Oct 30 Central Michigan at Grand Valley (Exhibition) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Central Michigan at Loyola Chicago | L, 0-1",
 "Final Aug 20 Central Michigan at Charleston Southern | W, 3-2",
 "Final Aug 23 Central Michigan at Coastal Carolina | L, 0-2",
 "Final Aug 27 Central Michigan vs Purdue Fort Wayne | W, 6-1",
 "Final Sep 3 Central Michigan vs Cincinnati | T, 1-1",
 "Final Sep 6 Central Michigan vs Wisconsin | L, 2-6",
 "Final Sep 13 Central Michigan at Butler | L, 0-3",
 "Final Sep 17 Central Michigan vs Buffalo | L, 0-1",
 "Final Sep 20 Central Michigan at Eastern Michigan | L, 0-3",
 "Final Sep 26 Central Michigan vs Bowling Green | L, 0-1",
 "Final Oct 1 Central Michigan at Ohio | T, 2-2",
 "Final Oct 4 Central Michigan vs Miami (OH) | T, 0-0",
 "Final Oct 9 Central Michigan at Toledo | T, 1-1",
 "Final Oct 15 Central Michigan vs Akron | L, 0-1",
 "Final Oct 18 Central Michigan vs Western Michigan | L, 0-3",
 "Upcoming Oct 24, 12:00 PM Central Michigan at Massachusetts | ",
 "Upcoming Oct 29, 7:00 PM Central Michigan vs Ball State | ",
 "Upcoming Nov 1, 1:00 PM Central Michigan at Kent State | ",
 "Upcoming Nov 7 Central Michigan at MAC Quarterfinals | ",
 "Upcoming Nov 10 Central Michigan at MAC Semifinals | ",
 "Upcoming Nov 13 Central Michigan at MAC Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 3:00 PM Central Michigan vs Ferris State (10 inn.) (Exhibition) | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Central Michigan vs Montana | L, 0-3",
 "Final Aug 29 Central Michigan vs Omaha | L, 0-3",
 "Final Aug 30 Central Michigan at Washington State | L, 0-3",
 "Final Sep 2 Central Michigan vs Oakland | L, 1-3",
 "Final Sep 4 Central Michigan vs Illinois State | L, 0-3",
 "Final Sep 5 Central Michigan vs Illinois State | L, 0-3",
 "Final Sep 5 Central Michigan vs Michigan State | L, 0-3",
 "Final Sep 11 Central Michigan at DePaul | L, 0-3",
 "Final Sep 12 Central Michigan vs Auburn | L, 0-3",
 "Final Sep 12 Central Michigan at UIC | L, 0-3",
 "Final Sep 18 Central Michigan at FIU | L, 0-3",
 "Final Sep 18 Central Michigan vs Jacksonville | L, 1-3",
 "Final Sep 19 Central Michigan vs Alabama A&M | L, 0-3",
 "Final Sep 22 Central Michigan vs Eastern Michigan | L, 0-3",
 "Final Sep 26 Central Michigan vs Ohio | L, 0-3",
 "Final Sep 29 Central Michigan at Western Michigan | L, 0-3",
 "Final Oct 3 Central Michigan at Eastern Michigan | L, 0-3",
 "Final Oct 9 Central Michigan at Miami (OH) | L, 0-3",
 "Final Oct 10 Central Michigan at Ball State | L, 0-3",
 "Final Oct 14 Central Michigan vs Kent State | L, 2-3",
 "Final Oct 15 Central Michigan vs Kent State | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Central Michigan at Bowling Green | ",
 "Upcoming Oct 24, 4:00 PM Central Michigan at Bowling Green | ",
 "Upcoming Oct 30, 6:30 PM Central Michigan vs Buffalo | ",
 "Upcoming Oct 31, 5:30 PM Central Michigan vs Buffalo | ",
 "Upcoming Nov 6, 6:00 PM Central Michigan at Akron | ",
 "Upcoming Nov 7, 4:00 PM Central Michigan at Akron | ",
 "Upcoming Nov 13, 6:30 PM Central Michigan vs Toledo | ",
 "Upcoming Nov 14, 5:30 PM Central Michigan vs Western Michigan | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 2:00 PM Central Michigan at American | ",
 "Upcoming Nov 1, 6:00 PM Central Michigan at CSU Bakersfield | ",
 "Upcoming Nov 7, 9:00 AM Central Michigan at Michigan State Open | ",
 "Upcoming Nov 15, 2:00 PM Central Michigan vs Indiana | ",
 "Upcoming Dec 5 Central Michigan at Kent State Open | ",
 "Upcoming Dec 12, 10:00 AM Central Michigan at Chattanooga | ",
 "Upcoming Dec 12, 2:00 PM Central Michigan at Purdue | ",
 "Upcoming Dec 18, 7:00 PM Central Michigan vs SIUE | ",
 "Upcoming Dec 29, 10:30 AM Central Michigan at Midlands Championships | ",
 "Upcoming Jan 8 Central Michigan at NWCA National Duals | ",
 "Upcoming Jan 15, 7:00 PM Central Michigan at Buffalo | ",
 "Upcoming Jan 21, 7:00 PM Central Michigan vs Lock Haven | ",
 "Upcoming Jan 24, 2:00 PM Central Michigan vs Clarion | ",
 "Upcoming Jan 29, 7:00 PM Central Michigan at Ohio | ",
 "Upcoming Jan 31 Central Michigan at Bloomsburg | ",
 "Upcoming Feb 7, 2:00 PM Central Michigan at George Mason | ",
 "Upcoming Feb 12, 7:00 PM Central Michigan vs Kent State | ",
 "Upcoming Feb 19, 7:00 PM Central Michigan vs Michigan State | ",
 "Upcoming Feb 21, 2:00 PM Central Michigan at Michigan | ",
 "Upcoming Mar 5 Central Michigan at MAC Championships | ",
 "Upcoming Mar 18 Central Michigan at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Central Michigan module checks passed");
