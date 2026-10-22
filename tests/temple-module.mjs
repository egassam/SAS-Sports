import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {templeSchool} from '../src/schools/temple.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='temple');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,templeHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/temple-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit owlsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['temple'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',templeSchool.scheduleUrls],['roster',templeSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('temple|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'owlsports.com',`${key} must stay on owlsports.com`);
  }
}
const parity={"Basketball":{"schedule":["https://owlsports.com/sports/mens-basketball/schedule","https://owlsports.com/sports/womens-basketball/schedule"],"roster":["https://owlsports.com/sports/mens-basketball/roster","https://owlsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://owlsports.com/sports/womens-cross-country/schedule","https://owlsports.com/sports/mens-cross-country/schedule"],"roster":["https://owlsports.com/sports/womens-cross-country/roster","https://owlsports.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://owlsports.com/sports/womens-fencing/schedule"],"roster":["https://owlsports.com/sports/womens-fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://owlsports.com/sports/field-hockey/schedule"],"roster":["https://owlsports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://owlsports.com/sports/football/schedule"],"roster":["https://owlsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://owlsports.com/sports/mens-golf/schedule"],"roster":["https://owlsports.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://owlsports.com/sports/womens-gymnastics/schedule"],"roster":["https://owlsports.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://owlsports.com/sports/womens-lacrosse/schedule"],"roster":["https://owlsports.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://owlsports.com/sports/womens-rowing/schedule"],"roster":["https://owlsports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://owlsports.com/sports/womens-soccer/schedule","https://owlsports.com/sports/mens-soccer/schedule"],"roster":["https://owlsports.com/sports/womens-soccer/roster","https://owlsports.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://owlsports.com/sports/womens-tennis/schedule","https://owlsports.com/sports/mens-tennis/schedule"],"roster":["https://owlsports.com/sports/womens-tennis/roster","https://owlsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://owlsports.com/sports/womens-track-and-field/schedule"],"roster":["https://owlsports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://owlsports.com/sports/womens-volleyball/schedule"],"roster":["https://owlsports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'temple|"+sport+"':"),`${sport} routes must live in the Temple module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://owlsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.templeHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=temple)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2 Men's · Temple vs Central Connecticut State | ",
 "Upcoming Nov 8 Men's · Temple vs Richmond | ",
 "Upcoming Nov 11 Men's · Temple vs Charleston | ",
 "Upcoming Nov 15 Men's · Temple at La Salle | ",
 "Upcoming Nov 20, 12:30 PM Men's · Temple vs Middle Tennessee | ",
 "Upcoming Nov 21 Men's · Temple at Paradise Jam | ",
 "Upcoming Nov 23 Men's · Temple at Paradise Jam | ",
 "Upcoming Dec 1 Men's · Temple vs Villanova | ",
 "Upcoming Dec 5 Men's · Temple at Big 5 Classic | ",
 "Upcoming Dec 9 Men's · Temple vs Cheyney | ",
 "Upcoming Dec 12 Men's · Temple vs St. Bonaventure | ",
 "Upcoming Dec 16 Men's · Temple vs Dartmouth | ",
 "Upcoming Dec 19 Men's · Temple vs Wright State | ",
 "Upcoming Dec 22 Men's · Temple at Princeton | ",
 "Upcoming Dec 30 Men's · Temple at Rice | ",
 "Upcoming Jan 2 Men's · Temple vs UTSA | ",
 "Upcoming Jan 5 Men's · Temple vs UAB | ",
 "Upcoming Jan 10 Men's · Temple at Charlotte | ",
 "Upcoming Jan 14 Men's · Temple vs South Florida | ",
 "Upcoming Jan 17 Men's · Temple vs Rice | ",
 "Upcoming Jan 20 Men's · Temple at Tulane | ",
 "Upcoming Jan 28 Men's · Temple vs Tulsa | ",
 "Upcoming Jan 31 Men's · Temple at UAB | ",
 "Upcoming Feb 4 Men's · Temple at North Texas | ",
 "Upcoming Feb 7 Men's · Temple vs East Carolina | ",
 "Upcoming Feb 10 Men's · Temple at Florida Atlantic | ",
 "Upcoming Feb 13 Men's · Temple at South Florida | ",
 "Upcoming Feb 21 Men's · Temple vs Wichita State | ",
 "Upcoming Feb 24 Men's · Temple vs Tulane | ",
 "Upcoming Feb 27 Men's · Temple at East Carolina | ",
 "Upcoming Mar 4 Men's · Temple vs Memphis | ",
 "Upcoming Mar 7 Men's · Temple at UTSA | ",
 "Upcoming Mar 10 Men's · Temple at American Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · Temple at George Mason | ",
 "Upcoming Nov 7 Women's · Temple vs Navy | ",
 "Upcoming Nov 11 Women's · Temple at La Salle | ",
 "Upcoming Nov 17 Women's · Temple at George Washington | ",
 "Upcoming Nov 22 Women's · Temple vs Georgetown | ",
 "Upcoming Nov 24 Women's · Temple vs Ball State | ",
 "Upcoming Dec 1 Women's · Temple vs Villanova | ",
 "Upcoming Dec 6 Women's · Temple at Big 5 Classic | ",
 "Upcoming Dec 8 Women's · Temple vs Binghamton | ",
 "Upcoming Dec 13 Women's · Temple at St. John's | ",
 "Upcoming Dec 17 Women's · Temple vs Cheyney | ",
 "Upcoming Dec 20 Women's · Temple vs Ole Miss | ",
 "Upcoming Dec 21 Women's · Temple vs North Dakota State | ",
 "Upcoming Dec 30 Women's · Temple vs Charlotte | ",
 "Upcoming Jan 2 Women's · Temple vs Rice | ",
 "Upcoming Jan 7 Women's · Temple at Memphis | ",
 "Upcoming Jan 10 Women's · Temple at UAB | ",
 "Upcoming Jan 13 Women's · Temple vs East Carolina | ",
 "Upcoming Jan 16 Women's · Temple vs North Texas | ",
 "Upcoming Jan 20 Women's · Temple at USF | ",
 "Upcoming Jan 23 Women's · Temple at Wichita State | ",
 "Upcoming Jan 27 Women's · Temple vs UAB | ",
 "Upcoming Jan 30 Women's · Temple at Tulane | ",
 "Upcoming Feb 6 Women's · Temple at UTSA | ",
 "Upcoming Feb 9 Women's · Temple vs Tulsa | ",
 "Upcoming Feb 13 Women's · Temple vs Wichita State | ",
 "Upcoming Feb 17 Women's · Temple vs FAU | ",
 "Upcoming Feb 21 Women's · Temple at North Texas | ",
 "Upcoming Feb 24 Women's · Temple at Rice | ",
 "Upcoming Feb 27 Women's · Temple vs USF | ",
 "Upcoming Mar 6 Women's · Temple at FAU | ",
 "Upcoming Mar 10 Women's · Temple at American Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Temple at Temple Owl Invitational | 1st of 5",
 "Final Sep 19 Women's · Temple at Jasper Fall XC Invitational | 5th of 12",
 "Final Oct 2 Women's · Temple at Paul Short Invitational | 28th of 37",
 "Final Oct 16 Women's · Temple at Princeton Fall Classic | Completed",
 "Upcoming Oct 23 Women's · Temple at Haverford Invitational | ",
 "Upcoming Oct 31 Women's · Temple at American Conference Championship | ",
 "Upcoming Nov 13 Women's · Temple at NCAA Mid Atlantic Regional Championships | ",
 "Upcoming Nov 21 Women's · Temple at NCAA National Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Temple at Temple Owl Invitational | 1st of 5th",
 "Final Sep 18 Men's · Temple at Southern Showcase | 8th of 29th",
 "Final Oct 2 Men's · Temple at Paul Short Invitational | 19th of 35",
 "Final Oct 16 Men's · Temple at Princeton Fall Classic | Completed",
 "Upcoming Oct 23 Men's · Temple at Haverford Invitational | ",
 "Upcoming Oct 31 Men's · Temple at American Conference Championship | ",
 "Upcoming Nov 13 Men's · Temple at NCAA Mid Atlantic Regional Championships | ",
 "Upcoming Nov 21 Men's · Temple at NCAA National Championship | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Oct 24 Temple at Coach Nikki Franke Classic (Exhibition) | ",
 "Upcoming Nov 14 Temple at Elite Invitational | ",
 "Upcoming Nov 20 Temple at USA Fencing North American Cup | ",
 "Upcoming Dec 6 Temple at Sacred Heart Invitational | ",
 "Upcoming Jan 15 Temple at Philadelphia Invitational | ",
 "Upcoming Jan 17 Temple at Philadelphia Invitational | ",
 "Upcoming Jan 23 Temple at Penn State Invitational | ",
 "Upcoming Jan 29 Temple at Schiller Duals | ",
 "Upcoming Feb 6 Temple at Beguinet Classic | ",
 "Upcoming Feb 21 Temple at Temple Invitational | ",
 "Upcoming Mar 6 Temple at NIWFA Championships | ",
 "Upcoming Mar 13 Temple at NCAA Regional Championships | ",
 "Upcoming Mar 25 Temple at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Temple vs James Madison | W, 2-1",
 "Final Aug 30 Temple at Maryland | L, 1-3",
 "Final Sep 4 Temple at Lafayette | L, 3-4",
 "Final Sep 6 Temple at Wagner | W, 2-1",
 "Final Sep 11 Temple vs Monmouth | L, 2-4",
 "Final Sep 13 Temple vs Rider | W, 5-0",
 "Final Sep 18 Temple vs Georgetown | W, 2-1",
 "Final Sep 20 Temple vs Hofstra | W, 4-2",
 "Final Sep 25 Temple at Villanova | L, 1-4",
 "Final Oct 2 Temple vs Delaware | L, 1-2",
 "Final Oct 4 Temple at Princeton | L, 0-3",
 "Final Oct 9 Temple at UConn | L, 0-4",
 "Final Oct 11 Temple at Yale | L, 1-2",
 "Final Oct 16 Temple vs Old Dominion | L, 1-2",
 "Final Oct 18 Temple vs New Hampshire | W, 3-2",
 "Upcoming Oct 23, 2:00 PM Temple at Liberty | ",
 "Upcoming Oct 30, 12:00 PM Temple vs Providence | ",
 "Upcoming Nov 1, 12:00 PM Temple at Penn | ",
 "Upcoming Nov 6 Temple at BIG EAST Semifinals | ",
 "Upcoming Nov 8 Temple at BIG EAST Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Temple vs Rhode Island | W, 38-14",
 "Final Sep 12 Temple vs Penn State | L, 9-27",
 "Final Sep 19 Temple at Toledo | L, 48-49",
 "Final Sep 25 Temple vs Army | L, 17-21",
 "Final Oct 3 Temple at South Florida | W, 17-13",
 "Final Oct 10 Temple vs UConn | L, 20-34",
 "Final Oct 17 Temple vs Charlotte | L, 31-38",
 "Upcoming Oct 31, 3:00 PM Temple at East Carolina | ",
 "Upcoming Nov 7, 3:30 PM Temple at Navy | ",
 "Upcoming Nov 14 Temple vs UAB | ",
 "Upcoming Nov 19, 7:30 PM Temple vs Rice | ",
 "Upcoming Nov 27 Temple at Memphis | ",
 "Upcoming Dec 5, 8:00 PM Temple at American Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Temple at Temple Invitational | 1st of 12",
 "Final Sep 28 Temple at Ironwood Collegiate Classic | 9th of 14",
 "Final Oct 12 Temple at Phoenix Invitational | 17th of 17",
 "Upcoming Oct 24 Temple at Lehigh Invitational | ",
 "Upcoming Oct 29 Temple at Big 5 Invitational | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Dec 5 Temple at Cherry and White Intersquad (Exhibition) | ",
 "Upcoming Jan 10, 1:00 PM Temple at Maryland | ",
 "Upcoming Jan 10, 1:00 PM Temple at LIU | ",
 "Upcoming Jan 10, 1:00 PM Temple at Centenary College (Louisiana) | ",
 "Upcoming Jan 16, 6:00 PM Temple at LIU | ",
 "Upcoming Jan 16, 6:00 PM Temple at Southeast Missouri State | ",
 "Upcoming Jan 22, 6:00 PM Temple at George Washington | ",
 "Upcoming Jan 24, 2:00 PM Temple at Pennsylvania | ",
 "Upcoming Jan 24, 2:00 PM Temple at Towson | ",
 "Upcoming Jan 24, 2:00 PM Temple at William & Mary | ",
 "Upcoming Jan 29, 6:00 PM Temple at Ursinus College | ",
 "Upcoming Jan 29, 6:00 PM Temple at Pennsylvania | ",
 "Upcoming Jan 29, 6:00 PM Temple at Towson | ",
 "Upcoming Feb 5, 6:00 PM Temple at New Hampshire | ",
 "Upcoming Feb 5, 6:00 PM Temple at Southern Connecticut State | ",
 "Upcoming Feb 12 Temple at Air Force | ",
 "Upcoming Feb 14, 2:00 PM Temple at Denver | ",
 "Upcoming Feb 19, 6:00 PM Temple at Yale | ",
 "Upcoming Feb 19, 6:00 PM Temple at Towson | ",
 "Upcoming Feb 19, 6:00 PM Temple at William & Mary | ",
 "Upcoming Feb 24, 6:00 PM Temple at Towson | ",
 "Upcoming Feb 24, 6:00 PM Temple at West Virginia | ",
 "Upcoming Feb 28, 2:00 PM Temple at West Virginia | ",
 "Upcoming Feb 28, 2:00 PM Temple at Eastern Michigan | ",
 "Upcoming Mar 6, 4:00 PM Temple at Maryland | ",
 "Upcoming Mar 6, 4:00 PM Temple at Southern Connecticut State | ",
 "Upcoming Mar 13, 4:00 PM Temple at NC State | ",
 "Upcoming Mar 13, 4:00 PM Temple at Rutgers | ",
 "Upcoming Mar 20 Temple at EAGL (East Atlantic Gymnastics League) | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 24 Temple vs Saint Joseph's (Exhibition) | ",
 "Upcoming Oct 24 Temple vs Villanova | ",
 "Upcoming Oct 24 Temple vs La Salle (Exhibition) | ",
 "Upcoming Oct 24 Temple vs Drexel | ",
 "Upcoming Oct 25 Temple at JMU (Exhibition) | ",
 "Upcoming Oct 25 Temple at SDSU (Exhibition) | ",
 "Upcoming Oct 25 Temple at Maryland (Exhibition) | ",
 "Upcoming Jan 30 Temple vs Penn State | ",
 "Upcoming Feb 5 Temple at Delaware | ",
 "Upcoming Feb 7 Temple vs Delaware State | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Temple at George Washington | L, 0-4",
 "Final Aug 15 Women's · Temple at Hampton | W, 1-0",
 "Final Aug 20 Women's · Temple vs LIU | W, 3-0",
 "Final Aug 23 Women's · Temple vs Saint Peter's | W, 1-0",
 "Final Aug 27 Women's · Temple at Rider | W, 2-1",
 "Final Sep 3 Women's · Temple vs Saint Joseph's | L, 0-2",
 "Final Sep 10 Women's · Temple at Le Moyne | W, 1-0",
 "Final Sep 13 Women's · Temple vs Delaware State | W, 6-0",
 "Final Sep 17 Women's · Temple vs UAB | W, 2-0",
 "Final Sep 24 Women's · Temple at Rice | L, 1-5",
 "Final Sep 27 Women's · Temple at North Texas | T, 1-1",
 "Final Oct 1 Women's · Temple vs East Carolina | T, 2-2",
 "Final Oct 11 Women's · Temple at South Florida | W, 1-0",
 "Final Oct 15 Women's · Temple vs Memphis | L, 0-2",
 "Today Oct 22, 7:00 PM Women's · Temple vs Florida Atlantic | ",
 "Upcoming Oct 25, 2:00 PM Women's · Temple at UTSA | ",
 "Upcoming Oct 30, 7:00 PM Women's · Temple vs Tulsa | ",
 "Upcoming Nov 3, 7:00 PM Women's · Temple at Charlotte | ",
 "Upcoming Nov 8 Women's · Temple at American Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Temple at Villanova | L, 0-1",
 "Final Aug 23 Men's · Temple at Delaware | L, 0-1",
 "Final Aug 28 Men's · Temple vs Saint Joseph's | T, 1-1",
 "Final Sep 1 Men's · Temple at St. Peter's | L, 0-4",
 "Final Sep 5 Men's · Temple at Navy | T, 0-0",
 "Final Sep 11 Men's · Temple at Tulsa | L, 1-4",
 "Final Sep 15 Men's · Temple vs Columbia | L, 0-1",
 "Final Sep 20 Men's · Temple vs Missouri State | L, 0-3",
 "Final Sep 26 Men's · Temple vs Charlotte | L, 1-2",
 "Final Oct 2 Men's · Temple at FAU | W, 2-1",
 "Final Oct 6 Men's · Temple at Lafayette | W, 1-0",
 "Final Oct 11 Men's · Temple vs Memphis | L, 0-3",
 "Final Oct 18 Men's · Temple at South Florida | T, 3-3",
 "Upcoming Oct 23, 8:00 PM Men's · Temple at UAB | ",
 "Upcoming Oct 27, 7:00 PM Men's · Temple vs Monmouth | ",
 "Upcoming Nov 1, 7:00 PM Men's · Temple vs FIU | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Temple at Villanova Invitational | Completed",
 "Final Oct 2 Women's · Temple at Fightin' Blue Hen Fall Classic | Completed",
 "Final Oct 9 Women's · Temple at Cissie Leary Invitational | Completed",
 "Final Oct 15 Women's · Temple at ITA Regionals | Completed",
 "Today Oct 22 Women's · Temple at American Conference Individuals | ",
 "Upcoming Oct 30 Women's · Temple at Dragon Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 26 Men's · Temple at Lehigh Invitational | Completed",
 "Final Oct 2 Men's · Temple at Saint Joseph's Invite | Completed",
 "Final Oct 15 Men's · Temple at ITA Regionals | Completed",
 "Today Oct 22 Men's · Temple at American Conference Individuals | ",
 "Upcoming Nov 6 Men's · Temple at Dragon Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Temple vs Manhattan | W, 3-0",
 "Final Aug 29 Temple vs Fordham | L, 1-3",
 "Final Aug 30 Temple vs Rider | W, 3-0",
 "Final Sep 4 Temple vs San Francisco | W, 3-0",
 "Final Sep 5 Temple vs Louisiana Monroe | W, 3-0",
 "Final Sep 6 Temple at Grand Canyon | L, 1-3",
 "Final Sep 10 Temple at Binghamton | L, 2-3",
 "Final Sep 11 Temple vs New Haven | W, 3-0",
 "Final Sep 12 Temple vs Cornell | L, 2-3",
 "Final Sep 18 Temple at Princeton | W, 3-2",
 "Final Sep 19 Temple vs UMBC | W, 3-0",
 "Final Sep 23 Temple at Fairleigh Dickinson | W, 3-2",
 "Final Sep 25 Temple vs UAB | W, 3-0",
 "Final Sep 27 Temple vs Charlotte | W, 3-0",
 "Final Oct 2 Temple at Florida Atlantic | L, 1-3",
 "Final Oct 4 Temple at South Florida | L, 0-3",
 "Final Oct 9 Temple vs Florida Atlantic | L, 2-3",
 "Final Oct 11 Temple vs North Texas | W, 3-2",
 "Final Oct 16 Temple at Memphis | L, 2-3",
 "Final Oct 18 Temple at UAB | L, 0-3",
 "Upcoming Oct 23, 12:00 PM Temple at Charlotte | ",
 "Upcoming Oct 25, 12:00 PM Temple vs UTSA | ",
 "Upcoming Oct 30, 12:00 PM Temple at East Carolina | ",
 "Upcoming Nov 1, 12:00 PM Temple vs Tulane | ",
 "Upcoming Nov 6, 12:00 PM Temple vs East Carolina | ",
 "Upcoming Nov 8, 12:00 PM Temple vs Rice | ",
 "Upcoming Nov 13, 7:00 PM Temple at Wichita State | ",
 "Upcoming Nov 15, 1:00 PM Temple at Tulsa | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Temple module checks passed");
