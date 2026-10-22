import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {miamiOhSchool} from '../src/schools/miami-oh.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='miami-oh');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,miamiOhHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/miami-oh-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit miamiredhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['miami-oh'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',miamiOhSchool.scheduleUrls],['roster',miamiOhSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('miami-oh|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'miamiredhawks.com',`${key} must stay on miamiredhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://miamiredhawks.com/sports/baseball/schedule"],"roster":["https://miamiredhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://miamiredhawks.com/sports/mens-basketball/schedule","https://miamiredhawks.com/sports/womens-basketball/schedule"],"roster":["https://miamiredhawks.com/sports/mens-basketball/roster","https://miamiredhawks.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://miamiredhawks.com/sports/track-and-field/schedule"],"roster":["https://miamiredhawks.com/sports/track-and-field/roster"],"combined":false},"Field Hockey":{"schedule":["https://miamiredhawks.com/sports/field-hockey/schedule"],"roster":["https://miamiredhawks.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://miamiredhawks.com/sports/football/schedule"],"roster":["https://miamiredhawks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://miamiredhawks.com/sports/mens-golf/schedule"],"roster":["https://miamiredhawks.com/sports/mens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://miamiredhawks.com/sports/mens-ice-hockey/schedule"],"roster":["https://miamiredhawks.com/sports/mens-ice-hockey/roster"],"combined":false},"Soccer":{"schedule":["https://miamiredhawks.com/sports/womens-soccer/schedule"],"roster":["https://miamiredhawks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://miamiredhawks.com/sports/softball/schedule"],"roster":["https://miamiredhawks.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://miamiredhawks.com/sports/swimming-and-diving/schedule"],"roster":["https://miamiredhawks.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://miamiredhawks.com/sports/womens-tennis/schedule"],"roster":["https://miamiredhawks.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://miamiredhawks.com/sports/track-and-field/schedule"],"roster":["https://miamiredhawks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://miamiredhawks.com/sports/womens-volleyball/schedule"],"roster":["https://miamiredhawks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'miami-oh|"+sport+"':"),`${sport} routes must live in the Miami (OH) module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://miamiredhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.miamiOhHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=miami-oh)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 26, 7:00 PM Men's · Miami (OH) vs Indiana East (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Miami (OH) at James Madison | ",
 "Upcoming Nov 7, 5:00 PM Men's · Miami (OH) vs Bellarmine | ",
 "Upcoming Nov 14, 1:00 PM Men's · Miami (OH) at Evansville | ",
 "Upcoming Nov 18, 7:00 PM Men's · Miami (OH) vs Defiance | ",
 "Upcoming Nov 22, 12:00 PM Men's · Miami (OH) vs UIC | ",
 "Upcoming Nov 25, 2:00 PM Men's · Miami (OH) vs Eastern Kentucky | ",
 "Upcoming Dec 2, 7:00 PM Men's · Miami (OH) vs Central Michigan | ",
 "Upcoming Dec 5, 2:00 PM Men's · Miami (OH) at Buffalo | ",
 "Upcoming Dec 12, 1:00 PM Men's · Miami (OH) vs High Point | ",
 "Upcoming Dec 16, 7:00 PM Men's · Miami (OH) at Bowling Green | ",
 "Upcoming Dec 19, 1:00 PM Men's · Miami (OH) vs Ball State | ",
 "Upcoming Dec 22, 7:00 PM Men's · Miami (OH) vs Wright State | ",
 "Upcoming Dec 29, 7:00 PM Men's · Miami (OH) vs Union Commonwealth | ",
 "Upcoming Jan 2, 2:00 PM Men's · Miami (OH) vs Eastern Michigan | ",
 "Upcoming Jan 5, 7:00 PM Men's · Miami (OH) at Toledo | ",
 "Upcoming Jan 8, 7:00 PM Men's · Miami (OH) at Akron | ",
 "Upcoming Jan 12, 7:00 PM Men's · Miami (OH) vs Western Michigan | ",
 "Upcoming Jan 16, 6:00 PM Men's · Miami (OH) at Kent State | ",
 "Upcoming Jan 19, 7:00 PM Men's · Miami (OH) vs Buffalo | ",
 "Upcoming Jan 22, 8:00 PM Men's · Miami (OH) vs Akron | ",
 "Upcoming Jan 26, 6:00 PM Men's · Miami (OH) at UMass | ",
 "Upcoming Jan 29, 7:00 PM Men's · Miami (OH) at Ohio | ",
 "Upcoming Feb 2, 7:00 PM Men's · Miami (OH) vs Kent State | ",
 "Upcoming Feb 6, 1:00 PM Men's · Miami (OH) vs Sunbelt (TBD) | ",
 "Upcoming Feb 9, 7:00 PM Men's · Miami (OH) vs Bowling Green | ",
 "Upcoming Feb 13, 1:30 PM Men's · Miami (OH) at Ball State | ",
 "Upcoming Feb 16, 7:00 PM Men's · Miami (OH) vs Toledo | ",
 "Upcoming Feb 20 Men's · Miami (OH) at Central Michigan | ",
 "Upcoming Feb 23, 6:30 PM Men's · Miami (OH) at Eastern Michigan | ",
 "Upcoming Feb 27, 3:30 PM Men's · Miami (OH) vs Ohio | ",
 "Upcoming Mar 2, 7:00 PM Men's · Miami (OH) at Western Michigan | ",
 "Upcoming Mar 5, 7:00 PM Men's · Miami (OH) vs Massachusetts | ",
 "Upcoming Mar 10 Men's · Miami (OH) at MAC Tournament | ",
 "Upcoming Mar 11 Men's · Miami (OH) at MAC Tournament | ",
 "Upcoming Mar 12 Men's · Miami (OH) at MAC Tournament | ",
 "Upcoming Mar 13 Men's · Miami (OH) at MAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Miami (OH) vs James Madison | ",
 "Upcoming Nov 5, 11:00 AM Women's · Miami (OH) at Southeast Missouri State | ",
 "Upcoming Nov 8, 1:00 PM Women's · Miami (OH) vs Bellarmine | ",
 "Upcoming Nov 11, 10:30 AM Women's · Miami (OH) vs Mount Vernon Nazarene | ",
 "Upcoming Nov 15, 1:00 PM Women's · Miami (OH) vs Oakland | ",
 "Upcoming Nov 20, 6:00 PM Women's · Miami (OH) at Southern Indiana | ",
 "Upcoming Nov 26, 9:00 PM Women's · Miami (OH) vs Cincinnati | ",
 "Upcoming Nov 27, 6:30 PM Women's · Miami (OH) vs Kansas | ",
 "Upcoming Dec 6, 1:00 PM Women's · Miami (OH) vs Indiana State | ",
 "Upcoming Dec 13, 2:00 PM Women's · Miami (OH) at Western Kentucky | ",
 "Upcoming Dec 16, 6:30 PM Women's · Miami (OH) at Ohio State | ",
 "Upcoming Dec 19, 1:00 PM Women's · Miami (OH) at Green Bay | ",
 "Upcoming Jan 2, 2:00 PM Women's · Miami (OH) at Buffalo | ",
 "Upcoming Jan 6, 7:00 PM Women's · Miami (OH) vs Toledo | ",
 "Upcoming Jan 9, 11:00 AM Women's · Miami (OH) at Ball State | ",
 "Upcoming Jan 13, 7:00 PM Women's · Miami (OH) vs Massachusetts | ",
 "Upcoming Jan 16, 1:00 PM Women's · Miami (OH) vs Central Michigan | ",
 "Upcoming Jan 20 Women's · Miami (OH) at Toledo | ",
 "Upcoming Jan 23, 1:00 PM Women's · Miami (OH) at Ohio | ",
 "Upcoming Jan 27, 7:00 PM Women's · Miami (OH) vs Western Michigan | ",
 "Upcoming Jan 31, 4:00 PM Women's · Miami (OH) vs Ball State | ",
 "Upcoming Feb 3, 6:30 PM Women's · Miami (OH) at Central Michigan | ",
 "Upcoming Feb 6 Women's · Miami (OH) at Sun Belt Challenge | ",
 "Upcoming Feb 10, 7:00 PM Women's · Miami (OH) vs Kent State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Miami (OH) at Eastern Michigan | ",
 "Upcoming Feb 17, 7:00 PM Women's · Miami (OH) vs Bowling Green | ",
 "Upcoming Feb 20, 4:00 PM Women's · Miami (OH) at Akron | ",
 "Upcoming Feb 24, 6:00 PM Women's · Miami (OH) at Massachusetts | ",
 "Upcoming Feb 27, 1:00 PM Women's · Miami (OH) vs Buffalo | ",
 "Upcoming Mar 3, 7:00 PM Women's · Miami (OH) at Western Michigan | ",
 "Upcoming Mar 6, 1:00 PM Women's · Miami (OH) vs Ohio | "
]);
  const v_trackandfield=parse("Cross Country","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Final Sep 4 Miami (OH) at RedHawk Rumble | Women's team: 1st / Men's team: 1st",
 "Final Sep 25 Miami (OH) at Loyola Lakefront Invite | Women's team: 13th / Men's team: 14th",
 "Final Oct 16 Miami (OH) at Pre-National Invitational | Women's team: 41st / Men's team: 30th",
 "Upcoming Oct 30 Miami (OH) at MAC Cross Country Championships | ",
 "Upcoming Nov 13 Miami (OH) at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Miami (OH) at NCAA National Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Miami (OH) at Louisville | L, 1-2",
 "Final Aug 29 Miami (OH) vs Indiana | W, 2-1",
 "Final Sep 4 Miami (OH) vs Michigan State | W, 6-0",
 "Final Sep 11 Miami (OH) vs Iowa | L, 1-2",
 "Final Sep 13 Miami (OH) at Northwestern | L, 0-2",
 "Final Sep 17 Miami (OH) at Longwood | W, 7-0",
 "Final Sep 19 Miami (OH) at Liberty | W, 5-4",
 "Final Sep 25 Miami (OH) vs James Madison | W, 4-2",
 "Final Sep 27 Miami (OH) vs Appalachian State | W, 2-1",
 "Final Oct 2 Miami (OH) at Massachusetts | L, 2-3",
 "Final Oct 4 Miami (OH) at New Hampshire | W, 5-0",
 "Final Oct 9 Miami (OH) vs Ohio | W, 10-0",
 "Final Oct 16 Miami (OH) at Bellarmine | W, 6-1",
 "Final Oct 18 Miami (OH) at Ball State | W, 10-0",
 "Upcoming Oct 23, 1:00 PM Miami (OH) vs Kent State | ",
 "Upcoming Oct 25, 1:00 PM Miami (OH) vs Michigan | ",
 "Upcoming Oct 30, 2:00 PM Miami (OH) at Central Michigan | ",
 "Upcoming Nov 4 Miami (OH) at MAC Tournament | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Miami (OH) at Pittsburgh | L, 14-59",
 "Final Sep 12 Miami (OH) vs Holy Cross | W, 45-7",
 "Final Sep 19 Miami (OH) at Cincinnati | L, 31-35",
 "Final Sep 26 Miami (OH) vs Connecticut | W, 24-21",
 "Final Oct 3 Miami (OH) vs Bowling Green | L, 20-24",
 "Final Oct 10 Miami (OH) at Massachusetts | W, 20-19",
 "Final Oct 17 Miami (OH) vs Akron | W, 34-14",
 "Upcoming Oct 24, 1:00 PM Miami (OH) at Central Michigan | ",
 "Upcoming Nov 3, 7:00 PM Miami (OH) vs Buffalo | ",
 "Upcoming Nov 10, 7:00 PM Miami (OH) vs Ohio | ",
 "Upcoming Nov 17, 7:00 PM Miami (OH) at Kent State | ",
 "Upcoming Nov 24 Miami (OH) at Western Michigan | ",
 "Upcoming Dec 5, 12:00 PM Miami (OH) at MAC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Miami (OH) at Virtues Intercollegiate | 2nd",
 "Final Sep 6 Miami (OH) at Island Resort Intercollegiate | 10th",
 "Final Sep 14 Miami (OH) at RedHawk Intercollegiate | 6th",
 "Final Sep 20 Miami (OH) at 2nd Swing Gopher Invitational | 15th",
 "Final Sep 27 Miami (OH) at Alumni Outing (Exhibition) | Completed",
 "Final Oct 2 Miami (OH) at The Indy at Forest Hills (Individuals Only) | Completed",
 "Final Oct 12 Miami (OH) at Raider Individual (Individuals Only) | Completed",
 "Final Oct 12 Miami (OH) at Moraine Intercollegiate | 9th",
 "Final Oct 19 Miami (OH) at Flyer Invitational | 2nd",
 "Upcoming Feb 6 Miami (OH) at Thomas Sharkey Individual (Individuals Only) | ",
 "Upcoming Feb 15 Miami (OH) at Border Olympics | ",
 "Upcoming Mar 19 Miami (OH) at Schenkel Invitational | ",
 "Upcoming Apr 4 Miami (OH) at Calusa Cup | ",
 "Upcoming Apr 5 Miami (OH) at NKU Jewell Invitational (B Team) | ",
 "Upcoming Apr 12 Miami (OH) at Indian Ridge Shootout | ",
 "Upcoming Apr 17 Miami (OH) at Spring Boilermaker Invitational | ",
 "Upcoming Apr 24 Miami (OH) at Fighting Illini Spring Collegiate | ",
 "Upcoming Apr 30 Miami (OH) at MAC Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Miami (OH) at Northern Michigan | L, 0-3",
 "Final Oct 3 Miami (OH) at Northern Michigan | W, 4-1",
 "Final Oct 15 Miami (OH) vs Robert Morris | W, 7-1",
 "Final Oct 17 Miami (OH) at Robert Morris | W, 3-2",
 "Upcoming Oct 23, 7:05 PM Miami (OH) vs Alaska Anchorage | ",
 "Upcoming Oct 24, 6:05 PM Miami (OH) vs Alaska Anchorage | ",
 "Upcoming Oct 30, 7:05 PM Miami (OH) vs St. Thomas | ",
 "Upcoming Oct 31, 7:30 PM Miami (OH) vs St. Thomas | ",
 "Upcoming Nov 6, 8:07 PM Miami (OH) at Minnesota Duluth | ",
 "Upcoming Nov 7, 7:07 PM Miami (OH) at Minnesota Duluth | ",
 "Upcoming Nov 13, 7:05 PM Miami (OH) vs Omaha | ",
 "Upcoming Nov 14, 6:05 PM Miami (OH) vs Omaha | ",
 "Upcoming Nov 20, 9:00 PM Miami (OH) at Colorado College | ",
 "Upcoming Nov 21, 8:00 PM Miami (OH) at Colorado College | ",
 "Upcoming Nov 27, 7:00 PM Miami (OH) at Stonehill | ",
 "Upcoming Nov 28, 7:00 PM Miami (OH) at Stonehill | ",
 "Upcoming Dec 4, 7:00 PM Miami (OH) at Western Michigan | ",
 "Upcoming Dec 5, 6:00 PM Miami (OH) at Western Michigan | ",
 "Upcoming Jan 1, 7:00 PM Miami (OH) at Maine | ",
 "Upcoming Jan 2, 7:00 PM Miami (OH) at Maine | ",
 "Upcoming Jan 8, 7:05 PM Miami (OH) vs North Dakota | ",
 "Upcoming Jan 9, 6:05 PM Miami (OH) vs North Dakota | ",
 "Upcoming Jan 15, 8:00 PM Miami (OH) at St. Cloud State | ",
 "Upcoming Jan 16, 7:00 PM Miami (OH) at St. Cloud State | ",
 "Upcoming Jan 22, 7:05 PM Miami (OH) vs Arizona State | ",
 "Upcoming Jan 23, 6:05 PM Miami (OH) vs Arizona State | ",
 "Upcoming Feb 5, 8:00 PM Miami (OH) at St. Thomas | ",
 "Upcoming Feb 6, 7:00 PM Miami (OH) at St. Thomas | ",
 "Upcoming Feb 12, 7:05 PM Miami (OH) vs Denver | ",
 "Upcoming Feb 13, 6:05 PM Miami (OH) vs Denver | ",
 "Upcoming Feb 19, 8:07 PM Miami (OH) at North Dakota | ",
 "Upcoming Feb 20, 7:07 PM Miami (OH) at North Dakota | ",
 "Upcoming Feb 26, 7:05 PM Miami (OH) vs Western Michigan | ",
 "Upcoming Feb 27, 6:05 PM Miami (OH) vs Western Michigan | ",
 "Upcoming Mar 5 Miami (OH) at NCHC First Round (Best-of-3) | ",
 "Upcoming Mar 6 Miami (OH) at NCHC First Round (Best-of-3) | ",
 "Upcoming Mar 7 Miami (OH) at NCHC First Round (Best-of-3) | ",
 "Upcoming Mar 12 Miami (OH) at NCHC Quarterfinal (If necessary) | ",
 "Upcoming Mar 13 Miami (OH) at NCHC Semifinal | ",
 "Upcoming Mar 19 Miami (OH) at NCHC Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Miami (OH) at Xavier | L, 0-3",
 "Final Aug 20 Miami (OH) vs Morehead State | W, 2-1",
 "Final Aug 23 Miami (OH) vs Butler | L, 0-1",
 "Final Aug 27 Miami (OH) at Middle Tennessee | L, 2-3",
 "Final Aug 30 Miami (OH) vs Youngstown State | W, 2-0",
 "Final Sep 3 Miami (OH) at Eastern Kentucky | W, 1-0",
 "Final Sep 6 Miami (OH) vs LSU | L, 2-3",
 "Final Sep 11 Miami (OH) vs Western Carolina | W, 3-0",
 "Final Sep 17 Miami (OH) vs Akron | W, 2-1",
 "Final Sep 20 Miami (OH) at Kent State | L, 0-2",
 "Final Sep 27 Miami (OH) vs Ball State | T, 1-1",
 "Final Oct 1 Miami (OH) vs Buffalo | T, 0-0",
 "Final Oct 4 Miami (OH) at Central Michigan | T, 0-0",
 "Final Oct 11 Miami (OH) at Eastern Michigan | W, 3-1",
 "Final Oct 15 Miami (OH) vs Ohio | W, 1-0",
 "Final Oct 18 Miami (OH) at Massachusetts | L, 2-3",
 "Upcoming Oct 25, 1:00 PM Miami (OH) at Western Michigan | ",
 "Upcoming Oct 29, 7:00 PM Miami (OH) vs Bowling Green | ",
 "Upcoming Nov 1, 1:00 PM Miami (OH) at Toledo | ",
 "Upcoming Nov 7 Miami (OH) at MAC Tournament Quarterfinal | ",
 "Upcoming Nov 10 Miami (OH) at MAC Tournament Semifinal | ",
 "Upcoming Nov 13 Miami (OH) at MAC Tournament Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 3 Miami (OH) at Northwestern | Women's team: L, 87-230 / Men's team: L, 130-187",
 "Final Oct 16 Miami (OH) vs Cincinnati | Women's team: L, 112-188 / Men's team: W, 165-135",
 "Upcoming Oct 30, 5:30 PM Miami (OH) at Ball State | ",
 "Upcoming Nov 6, 3:00 PM Miami (OH) vs Toledo [with Northern Kentucky] (Co-Ed) | ",
 "Upcoming Dec 3 Miami (OH) at Zippy Invitational | ",
 "Upcoming Jan 8, 5:00 PM Miami (OH) at Denison [with Oakland] (Co-Ed) | ",
 "Upcoming Jan 23, 11:00 AM Miami (OH) vs Xavier | ",
 "Upcoming Feb 5, 3:00 PM Miami (OH) at Ohio University [With Youngstown State] | ",
 "Upcoming Feb 17 Miami (OH) at Missouri Valley Conference Championship (Men) | ",
 "Upcoming Feb 24 Miami (OH) at Mid-American Conference Championships (Women) | ",
 "Upcoming Mar 9 Miami (OH) at NCAA Diving Zones | ",
 "Upcoming Mar 17 Miami (OH) at NCAA Women’s Championships | ",
 "Upcoming Mar 24 Miami (OH) at NCAA Men's Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Miami (OH) at UC/Pam Whitehead Invitational | Completed",
 "Final Oct 2 Miami (OH) at Indiana Invitational | Completed",
 "Final Oct 8 Miami (OH) at Ohio Valley Regional Championships | Completed",
 "Upcoming Oct 23 Miami (OH) at MAC Fall Individual Championships | ",
 "Upcoming Oct 23 Miami (OH) at Middle Tennessee Invitational | ",
 "Upcoming Oct 30 Miami (OH) at Invite Tennis Fest | ",
 "Upcoming Nov 5 Miami (OH) at ITA Conference Masters | "
]);
  const v_trackandfield_trackfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Miami (OH) vs McNeese | W, 3-0",
 "Final Aug 28 Miami (OH) at Sam Houston | L, 2-3",
 "Final Aug 29 Miami (OH) vs Cal State Fullerton | W, 3-1",
 "Final Sep 4 Miami (OH) vs Evansville | W, 3-1",
 "Final Sep 4 Miami (OH) vs Kansas City | W, 3-0",
 "Final Sep 5 Miami (OH) vs Purdue Fort Wayne | W, 3-1",
 "Final Sep 11 Miami (OH) vs Nicholls | W, 3-0",
 "Final Sep 11 Miami (OH) at Alabama State | W, 3-0",
 "Final Sep 12 Miami (OH) vs South Carolina State | W, 3-0",
 "Final Sep 18 Miami (OH) vs Northern Kentucky | L, 0-3",
 "Final Sep 19 Miami (OH) at Northern Kentucky | L, 0-3",
 "Final Sep 24 Miami (OH) at Bowling Green | L, 1-3",
 "Final Sep 25 Miami (OH) at Bowling Green | L, 0-3",
 "Final Oct 1 Miami (OH) vs Buffalo | W, 3-0",
 "Final Oct 2 Miami (OH) vs Buffalo | W, 3-1",
 "Final Oct 6 Miami (OH) at Ball State | W, 3-1",
 "Final Oct 9 Miami (OH) vs Central Michigan | W, 3-0",
 "Final Oct 15 Miami (OH) at Eastern Michigan | W, 3-1",
 "Final Oct 16 Miami (OH) at Eastern Michigan | W, 3-0",
 "Final Oct 20 Miami (OH) vs Ball State | W, 3-0",
 "Upcoming Oct 24, 4:00 PM Miami (OH) vs Akron | ",
 "Upcoming Oct 30, 6:30 PM Miami (OH) vs Toledo | ",
 "Upcoming Oct 31, 4:00 PM Miami (OH) vs Toledo | ",
 "Upcoming Nov 7, 4:00 PM Miami (OH) at Kent State | ",
 "Upcoming Nov 8, 4:00 PM Miami (OH) at Ohio | ",
 "Upcoming Nov 12, 6:00 PM Miami (OH) vs Ohio | ",
 "Upcoming Nov 13, 6:00 PM Miami (OH) at Western Michigan | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_trackandfield,"Cross Country track-and-field");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield_trackfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// The golf story pattern names Miami as its stories do ("Miami (OH)",
// "Miami (Ohio)", "RedHawks"); the port had written "Miami (OH)" raw, a
// pattern that never matched the name. Mutation: the raw name fails.
{
  const team=read('../src/schools/miami-oh.mjs').match(/createGolfStoryPlace\(\{host:HOST,team:"((?:[^"\\]|\\.)*)"/)[1].replace(/\\\\/g,'\\');
  for(const name of ['Miami (OH)','Miami (Ohio)','RedHawks','Miami'])assert.ok(new RegExp(`^${team}$`).test(name),name);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Miami (OH) module checks passed");
