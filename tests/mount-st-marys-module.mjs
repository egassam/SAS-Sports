import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mountStMarysSchool} from '../src/schools/mount-st-marys.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mount-st-marys');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mountStMarysHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mount-st-marys-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit mountathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mount-st-marys'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',mountStMarysSchool.scheduleUrls],['roster',mountStMarysSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mount-st-marys|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'mountathletics.com',`${key} must stay on mountathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://mountathletics.com/sports/baseball/schedule"],"roster":["https://mountathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://mountathletics.com/sports/mens-basketball/schedule","https://mountathletics.com/sports/womens-basketball/schedule"],"roster":["https://mountathletics.com/sports/mens-basketball/roster","https://mountathletics.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://mountathletics.com/sports/womens-bowling/schedule"],"roster":["https://mountathletics.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://mountathletics.com/sports/cross-country/schedule"],"roster":["https://mountathletics.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://mountathletics.com/sports/womens-golf/schedule","https://mountathletics.com/sports/mens-golf/schedule"],"roster":["https://mountathletics.com/sports/womens-golf/roster","https://mountathletics.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://mountathletics.com/sports/womens-lacrosse/schedule","https://mountathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://mountathletics.com/sports/womens-lacrosse/roster","https://mountathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://mountathletics.com/sports/womens-soccer/schedule","https://mountathletics.com/sports/mens-soccer/schedule"],"roster":["https://mountathletics.com/sports/womens-soccer/roster","https://mountathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://mountathletics.com/sports/softball/schedule"],"roster":["https://mountathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://mountathletics.com/sports/womens-swimming-and-diving/schedule","https://mountathletics.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://mountathletics.com/sports/womens-swimming-and-diving/roster","https://mountathletics.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://mountathletics.com/sports/womens-tennis/schedule","https://mountathletics.com/sports/mens-tennis/schedule"],"roster":["https://mountathletics.com/sports/womens-tennis/roster","https://mountathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://mountathletics.com/sports/track-and-field/schedule"],"roster":["https://mountathletics.com/sports/track-and-field/roster"],"combined":false},"Water Polo":{"schedule":["https://mountathletics.com/sports/womens-water-polo/schedule","https://mountathletics.com/sports/mens-water-polo/schedule"],"roster":["https://mountathletics.com/sports/womens-water-polo/roster","https://mountathletics.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mount-st-marys|"+sport+"':"),`${sport} routes must live in the Mount St. Mary's module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://mountathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mountStMarysHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mount-st-marys)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · Mount St. Mary's vs Navy | ",
 "Upcoming Nov 2, 7:00 PM Men's · Mount St. Mary's at Xavier | ",
 "Upcoming Nov 6, 7:00 PM Men's · Mount St. Mary's vs Loyola | ",
 "Upcoming Nov 13, 7:00 PM Men's · Mount St. Mary's at Virginia Tech | ",
 "Upcoming Nov 17, 7:00 PM Men's · Mount St. Mary's vs Lehigh | ",
 "Upcoming Nov 20, 7:00 PM Men's · Mount St. Mary's vs Western Michigan | ",
 "Upcoming Nov 24, 7:00 PM Men's · Mount St. Mary's at Morgan State | ",
 "Upcoming Nov 28, 4:00 PM Men's · Mount St. Mary's vs Drexel | ",
 "Upcoming Dec 4, 6:30 PM Men's · Mount St. Mary's at Niagara | ",
 "Upcoming Dec 6, 1:00 PM Men's · Mount St. Mary's at Canisius | ",
 "Upcoming Dec 10, 7:00 PM Men's · Mount St. Mary's at Coppin State | ",
 "Upcoming Dec 15, 8:00 PM Men's · Mount St. Mary's at Creighton | ",
 "Upcoming Dec 17, 7:00 PM Men's · Mount St. Mary's at Nebraska | ",
 "Upcoming Dec 20, 12:00 PM Men's · Mount St. Mary's vs Central Penn | ",
 "Upcoming Dec 29, 7:00 PM Men's · Mount St. Mary's vs Marist | ",
 "Upcoming Jan 3, 2:00 PM Men's · Mount St. Mary's vs Manhattan | ",
 "Upcoming Jan 8, 7:00 PM Men's · Mount St. Mary's at Rider | ",
 "Upcoming Jan 10, 2:00 PM Men's · Mount St. Mary's vs Siena | ",
 "Upcoming Jan 13, 6:00 PM Men's · Mount St. Mary's at Sacred Heart | ",
 "Upcoming Jan 16, 4:00 PM Men's · Mount St. Mary's vs Fairfield | ",
 "Upcoming Jan 18, 2:00 PM Men's · Mount St. Mary's vs Saint Peter's | ",
 "Upcoming Jan 22, 7:00 PM Men's · Mount St. Mary's at Manhattan | ",
 "Upcoming Jan 24, 1:00 PM Men's · Mount St. Mary's at Iona | ",
 "Upcoming Jan 29, 7:00 PM Men's · Mount St. Mary's vs Merrimack | ",
 "Upcoming Jan 31, 2:00 PM Men's · Mount St. Mary's at Fairfield | ",
 "Upcoming Feb 5, 7:00 PM Men's · Mount St. Mary's at Siena | ",
 "Upcoming Feb 11, 7:00 PM Men's · Mount St. Mary's vs Rider | ",
 "Upcoming Feb 13, 4:00 PM Men's · Mount St. Mary's vs Sacred Heart | ",
 "Upcoming Feb 19, 7:00 PM Men's · Mount St. Mary's at Marist | ",
 "Upcoming Feb 21, 2:00 PM Men's · Mount St. Mary's at Quinnipiac | ",
 "Upcoming Feb 26, 7:00 PM Men's · Mount St. Mary's vs Canisius | ",
 "Upcoming Feb 28, 2:00 PM Men's · Mount St. Mary's vs Niagara | ",
 "Upcoming Mar 4 Men's · Mount St. Mary's at Metro Basketball Championships | ",
 "Upcoming Mar 9 Men's · Mount St. Mary's at Metro Basketball Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 24, 2:00 PM Women's · Mount St. Mary's at George Mason | ",
 "Upcoming Nov 2, 7:00 PM Women's · Mount St. Mary's vs Navy | ",
 "Upcoming Nov 5, 6:00 PM Women's · Mount St. Mary's at UMBC | ",
 "Upcoming Nov 8, 2:00 PM Women's · Mount St. Mary's vs UAlbany | ",
 "Upcoming Nov 11, 6:00 PM Women's · Mount St. Mary's at Lehigh | ",
 "Upcoming Nov 14, 2:00 PM Women's · Mount St. Mary's vs Bucknell | ",
 "Upcoming Nov 17, 7:00 PM Women's · Mount St. Mary's at Nebraska | ",
 "Upcoming Nov 21, 1:00 PM Women's · Mount St. Mary's vs St. Mary's (MD) | ",
 "Upcoming Nov 30, 6:00 PM Women's · Mount St. Mary's at UMES | ",
 "Upcoming Dec 3, 7:00 PM Women's · Mount St. Mary's at West Virginia | ",
 "Upcoming Dec 6, 1:00 PM Women's · Mount St. Mary's at Dayton | ",
 "Upcoming Dec 10, 6:00 PM Women's · Mount St. Mary's at Morgan State | ",
 "Upcoming Dec 13, 12:00 PM Women's · Mount St. Mary's at Maryland | ",
 "Upcoming Dec 19, 1:00 PM Women's · Mount St. Mary's vs Niagara | ",
 "Upcoming Dec 21, 1:00 PM Women's · Mount St. Mary's vs Canisius | ",
 "Upcoming Dec 29, 2:00 PM Women's · Mount St. Mary's at Marist | ",
 "Upcoming Jan 3, 6:00 PM Women's · Mount St. Mary's at Manhattan | ",
 "Upcoming Jan 7, 7:00 PM Women's · Mount St. Mary's vs Rider | ",
 "Upcoming Jan 9, 2:00 PM Women's · Mount St. Mary's at Siena | ",
 "Upcoming Jan 13, 7:00 PM Women's · Mount St. Mary's vs Sacred Heart | ",
 "Upcoming Jan 16, 2:00 PM Women's · Mount St. Mary's at Fairfield | ",
 "Upcoming Jan 18, 6:00 PM Women's · Mount St. Mary's at Saint Peter's | ",
 "Upcoming Jan 21, 7:00 PM Women's · Mount St. Mary's vs Manhattan | ",
 "Upcoming Jan 23, 1:00 PM Women's · Mount St. Mary's vs Iona | ",
 "Upcoming Jan 28, 7:00 PM Women's · Mount St. Mary's at Merrimack | ",
 "Upcoming Jan 30, 2:00 PM Women's · Mount St. Mary's vs Fairfield | ",
 "Upcoming Feb 4, 11:00 AM Women's · Mount St. Mary's vs Siena | ",
 "Upcoming Feb 11, 6:00 PM Women's · Mount St. Mary's at Rider | ",
 "Upcoming Feb 13, 2:00 PM Women's · Mount St. Mary's at Sacred Heart | ",
 "Upcoming Feb 18, 7:00 PM Women's · Mount St. Mary's vs Marist | ",
 "Upcoming Feb 20, 1:00 PM Women's · Mount St. Mary's vs Quinnipiac | ",
 "Upcoming Feb 25, 6:00 PM Women's · Mount St. Mary's at Canisius | ",
 "Upcoming Feb 27, 1:00 PM Women's · Mount St. Mary's at Niagara | ",
 "Upcoming Mar 4 Women's · Mount St. Mary's at Metro Basketball Championships | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 10 Mount St. Mary's at Bud Whitman Memorial | 3rd (8-1)",
 "Final Oct 10 Mount St. Mary's vs Delaware State | W, 976-890",
 "Final Oct 10 Mount St. Mary's vs Wilmington | W, 971-765",
 "Final Oct 10 Mount St. Mary's vs Coppin State | W, 932-719",
 "Final Oct 10 Mount St. Mary's at Wagner | W, 980-536",
 "Final Oct 10 Mount St. Mary's vs Sacred Heart | W, 951-777",
 "Final Oct 11 Mount St. Mary's vs FDU | L, 0-1",
 "Final Oct 11 Mount St. Mary's vs Felician | W, 4-3",
 "Final Oct 16 Mount St. Mary's at Chelsea Gilliam Penguin Classic | 8th (10-3)",
 "Final Oct 16 Mount St. Mary's vs Mercyhurst | W, 889-841",
 "Final Oct 16 Mount St. Mary's vs Vanderbilt | L, 925-1001",
 "Final Oct 16 Mount St. Mary's at Youngstown State | W, 1079-1043",
 "Final Oct 16 Mount St. Mary's vs Nebraska | L, 1055-1070",
 "Final Oct 16 Mount St. Mary's at Penguin Classic | W, 4.5-3.5",
 "Final Oct 17 Mount St. Mary's vs Valparaiso | W, 898-784",
 "Final Oct 17 Mount St. Mary's vs Maryville | W, 1067-876",
 "Final Oct 17 Mount St. Mary's vs William Smith | W, 1036-1000",
 "Final Oct 17 Mount St. Mary's vs Duquesne | W, 947-892",
 "Final Oct 17 Mount St. Mary's vs Niagara | W, 971-926",
 "Final Oct 18 Mount St. Mary's vs Bryant | W, 4-1",
 "Final Oct 18 Mount St. Mary's vs Arkansas State | L, 0-4",
 "Upcoming Oct 30 Mount St. Mary's at Destination Florida | ",
 "Upcoming Nov 13 Mount St. Mary's at Kat Klash | ",
 "Upcoming Nov 20 Mount St. Mary's at Jersey Jamboree | ",
 "Upcoming Jan 15 Mount St. Mary's at Northeast Classic | ",
 "Upcoming Feb 6 Mount St. Mary's at Mount Shootout | ",
 "Upcoming Feb 20 Mount St. Mary's at Niagara Spring Classic | ",
 "Upcoming Feb 26 Mount St. Mary's at Stallings Invitational | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Mount St. Mary's at Mount 5K Duals | Women's team: 4th / Men's team: 3rd",
 "Final Sep 18 Mount St. Mary's at Stevenson Invitational | Women's team: 2nd / Men's team: 4th",
 "Final Sep 25 Mount St. Mary's at JMU XC Invitational | Women's team: 2nd",
 "Final Oct 17 Mount St. Mary's at Aubrey Shenk Invitational | Women's team: 8th / Men's team: 18th",
 "Upcoming Oct 31 Mount St. Mary's at Metro Cross Country Championships | ",
 "Upcoming Nov 13 Mount St. Mary's at NCAA Mid-Atlantic Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 11 Women's · Mount St. Mary's at Bucknell Invitational | 15th",
 "Final Sep 14 Women's · Mount St. Mary's at Charge at Quail | 8th",
 "Final Sep 28 Women's · Mount St. Mary's at Autumn Harvest | 8th",
 "Final Oct 3 Women's · Mount St. Mary's at Navy Fall Invite | 9th",
 "Upcoming Oct 26 Women's · Mount St. Mary's at Lehigh Invitational | ",
 "Upcoming Mar 22 Women's · Mount St. Mary's at Kingsmill Invitational | ",
 "Upcoming Mar 26 Women's · Mount St. Mary's at Prospect Bay Intercollegiate | ",
 "Upcoming Apr 5 Women's · Mount St. Mary's at Hokie Highlander Invitational | ",
 "Upcoming Apr 11 Women's · Mount St. Mary's at Terps Invitational | ",
 "Upcoming Apr 20 Women's · Mount St. Mary's at Metro Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Mount St. Mary's at Joe Feaganes Marshall Invitational | 11th",
 "Final Sep 21 Men's · Mount St. Mary's at River Run Collegiate | 13th",
 "Final Oct 5 Men's · Mount St. Mary's at Testudo Cup | 14th",
 "Final Oct 13 Men's · Mount St. Mary's at Bucknell Invitational | 18th",
 "Today Oct 23 Men's · Mount St. Mary's at Fripp Island Invitational | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Mount St. Mary's at UMBC | L, 1-3",
 "Final Aug 17 Women's · Mount St. Mary's vs Towson | L, 0-2",
 "Final Aug 20 Women's · Mount St. Mary's at Bucknell | L, 1-8",
 "Final Aug 23 Women's · Mount St. Mary's at George Mason | L, 2-4",
 "Final Aug 30 Women's · Mount St. Mary's vs Richmond | T, 0-0",
 "Final Sep 5 Women's · Mount St. Mary's at Iona | T, 0-0",
 "Final Sep 12 Women's · Mount St. Mary's vs Quinnipiac | L, 1-4",
 "Final Sep 19 Women's · Mount St. Mary's at Saint Peter's | W, 3-2",
 "Final Sep 23 Women's · Mount St. Mary's at Rider | W, 2-1",
 "Final Sep 26 Women's · Mount St. Mary's vs Fairfield | L, 0-2",
 "Final Oct 3 Women's · Mount St. Mary's vs Marist | L, 0-1",
 "Final Oct 7 Women's · Mount St. Mary's at Niagara | L, 1-2",
 "Final Oct 10 Women's · Mount St. Mary's vs Manhattan | L, 1-2",
 "Final Oct 17 Women's · Mount St. Mary's at Siena | L, 0-2",
 "Upcoming Oct 24, 12:00 PM Women's · Mount St. Mary's at Sacred Heart | ",
 "Upcoming Oct 31, 12:00 PM Women's · Mount St. Mary's vs Merrimack | ",
 "Upcoming Nov 4, 12:00 PM Women's · Mount St. Mary's vs Canisius | ",
 "Upcoming Nov 8 Women's · Mount St. Mary's at Metro Women's Soccer Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Mount St. Mary's vs Binghamton | T, 0-0",
 "Final Aug 27 Men's · Mount St. Mary's at Duquesne | L, 0-2",
 "Final Aug 31 Men's · Mount St. Mary's vs Saint Joseph's | T, 1-1",
 "Final Sep 4 Men's · Mount St. Mary's at Loyola | L, 0-3",
 "Final Sep 8 Men's · Mount St. Mary's vs Navy | T, 0-0",
 "Final Sep 12 Men's · Mount St. Mary's at Delaware | T, 2-2",
 "Final Sep 19 Men's · Mount St. Mary's at Marist | W, 4-3",
 "Final Sep 26 Men's · Mount St. Mary's vs Iona | W, 4-0",
 "Final Sep 30 Men's · Mount St. Mary's at Canisius | T, 1-1",
 "Final Oct 3 Men's · Mount St. Mary's vs Merrimack | T, 1-1",
 "Final Oct 6 Men's · Mount St. Mary's at Bucknell | L, 0-1",
 "Final Oct 10 Men's · Mount St. Mary's vs Fairfield | L, 0-3",
 "Final Oct 14 Men's · Mount St. Mary's at Rider | L, 0-2",
 "Final Oct 17 Men's · Mount St. Mary's vs Siena | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Men's · Mount St. Mary's at Quinnipiac | ",
 "Upcoming Oct 28, 2:00 PM Men's · Mount St. Mary's vs Niagara | ",
 "Upcoming Oct 31, 3:00 PM Men's · Mount St. Mary's at Saint Peter's | ",
 "Upcoming Nov 7 Men's · Mount St. Mary's at Metro Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Mount St. Mary's at Charm City Relays | Completed",
 "Final Oct 10 Women's · Mount St. Mary's vs American | L, 73-145",
 "Final Oct 16 Women's · Mount St. Mary's at Virginia Military Institute | L, 125-170",
 "Today Oct 23 Women's · Mount St. Mary's at Thomas Murphy Invitational | ",
 "Upcoming Nov 7 Women's · Mount St. Mary's at UMBC | ",
 "Upcoming Nov 20 Women's · Mount St. Mary's at Franklin and Marshall Invitational | ",
 "Upcoming Dec 4 Women's · Mount St. Mary's at ECAC | ",
 "Upcoming Jan 16 Women's · Mount St. Mary's at Howard | ",
 "Upcoming Jan 18 Women's · Mount St. Mary's at Lafayette College | ",
 "Upcoming Jan 30 Women's · Mount St. Mary's at Loyola | ",
 "Upcoming Feb 17 Women's · Mount St. Mary's at Metro Swimming & Diving Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Mount St. Mary's at Charm City Relays | Completed",
 "Final Oct 10 Men's · Mount St. Mary's vs American | L, 102-116",
 "Final Oct 16 Men's · Mount St. Mary's at Virginia Military Institute | L, 76-218",
 "Today Oct 23 Men's · Mount St. Mary's at Thomas Murphy Invitational | ",
 "Upcoming Nov 7 Men's · Mount St. Mary's at UMBC | ",
 "Upcoming Nov 20 Men's · Mount St. Mary's at Franklin and Marshall Invitational | ",
 "Upcoming Dec 4 Men's · Mount St. Mary's at ECAC Winter Championships | ",
 "Upcoming Jan 16 Men's · Mount St. Mary's at Howard | ",
 "Upcoming Jan 18 Men's · Mount St. Mary's at Lafayette College | ",
 "Upcoming Jan 30 Men's · Mount St. Mary's at Loyola | ",
 "Upcoming Feb 17 Men's · Mount St. Mary's at Metro Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Mount St. Mary's at Loyola Invitational | Completed",
 "Final Oct 2 Women's · Mount St. Mary's at Metro Masters Tennis Tournament | Completed",
 "Final Oct 10 Women's · Mount St. Mary's at George Mason Invitational | Completed",
 "Final Oct 15 Women's · Mount St. Mary's at ITA Atlantic Regional | Completed",
 "Upcoming Oct 24 Women's · Mount St. Mary's at Morgan State Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Mount St. Mary's at McClure Invitational | Completed",
 "Final Oct 2 Men's · Mount St. Mary's at Metro Masters Tennis Tournament | Completed",
 "Final Oct 8 Men's · Mount St. Mary's at ITA Atlantic Regional | Completed",
 "Final Oct 9 Men's · Mount St. Mary's at Navy Gold Invite | Completed",
 "Upcoming Oct 24 Men's · Mount St. Mary's at Bear 4+1 Invitational | ",
 "Upcoming Nov 5 Men's · Mount St. Mary's at ITA Conference Masters | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Sep 4 Men's · Mount St. Mary's at Navy | L, 14-15",
 "Final Sep 5 Men's · Mount St. Mary's vs Austin | W, 16-12",
 "Final Sep 6 Men's · Mount St. Mary's vs Air Force | L, 13-17",
 "Final Sep 11 Men's · Mount St. Mary's vs LIU | W, 13-10",
 "Final Sep 12 Men's · Mount St. Mary's vs Saint Mary's | L, 6-16",
 "Final Sep 13 Men's · Mount St. Mary's vs Iona | W, 17-16",
 "Final Sep 13 Men's · Mount St. Mary's at Princeton | L, 5-18",
 "Final Sep 19 Men's · Mount St. Mary's vs Fordham | L, 5-23",
 "Final Sep 19 Men's · Mount St. Mary's vs MIT | L, 10-15",
 "Final Sep 20 Men's · Mount St. Mary's vs LIU | L, 13-16",
 "Final Sep 26 Men's · Mount St. Mary's vs Gannon | W, 16-12",
 "Final Sep 26 Men's · Mount St. Mary's vs Bucknell | L, 14-27",
 "Final Sep 27 Men's · Mount St. Mary's vs Penn State Behrend | W, 20-17",
 "Final Sep 27 Men's · Mount St. Mary's at Mercyhurst | W, 24-8",
 "Final Oct 1 Men's · Mount St. Mary's at Concordia University Irvine | L, 14-18",
 "Final Oct 2 Men's · Mount St. Mary's vs Chapman | W, 16-10",
 "Final Oct 2 Men's · Mount St. Mary's vs Redlands | L, 10-11",
 "Final Oct 3 Men's · Mount St. Mary's vs Claremont-Mudd-Scripps Colleges | L, 4-13",
 "Final Oct 3 Men's · Mount St. Mary's vs La Verne | L, 16-18",
 "Final Oct 10 Men's · Mount St. Mary's at Bucknell | L, 13-15",
 "Final Oct 17 Men's · Mount St. Mary's at Wagner | W, 15-14",
 "Final Oct 17 Men's · Mount St. Mary's at Fordham | L, 8-24",
 "Upcoming Oct 24, 2:00 PM Men's · Mount St. Mary's vs George Washington | ",
 "Upcoming Oct 31, 3:00 PM Men's · Mount St. Mary's vs Mercyhurst | ",
 "Upcoming Nov 7, 10:00 AM Men's · Mount St. Mary's at Navy | ",
 "Upcoming Nov 7, 5:00 PM Men's · Mount St. Mary's at George Washington | ",
 "Upcoming Nov 8, 12:00 PM Men's · Mount St. Mary's vs Wagner | ",
 "Upcoming Nov 20 Men's · Mount St. Mary's at MAWPC Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Mount St. Mary's module checks passed");
