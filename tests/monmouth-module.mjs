import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {monmouthSchool} from '../src/schools/monmouth.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='monmouth');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,monmouthHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/monmouth-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit monmouthhawks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['monmouth'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',monmouthSchool.scheduleUrls],['roster',monmouthSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('monmouth|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'monmouthhawks.com',`${key} must stay on monmouthhawks.com`);
  }
}
const parity={"Baseball":{"schedule":["https://monmouthhawks.com/sports/baseball/schedule"],"roster":["https://monmouthhawks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://monmouthhawks.com/sports/mens-basketball/schedule","https://monmouthhawks.com/sports/womens-basketball/schedule"],"roster":["https://monmouthhawks.com/sports/mens-basketball/roster","https://monmouthhawks.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://monmouthhawks.com/sports/womens-bowling/schedule"],"roster":["https://monmouthhawks.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://monmouthhawks.com/sports/womens-cross-country/schedule","https://monmouthhawks.com/sports/mens-cross-country/schedule"],"roster":["https://monmouthhawks.com/sports/womens-cross-country/roster","https://monmouthhawks.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://monmouthhawks.com/sports/field-hockey/schedule"],"roster":["https://monmouthhawks.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://monmouthhawks.com/sports/football/schedule"],"roster":["https://monmouthhawks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://monmouthhawks.com/sports/womens-golf/schedule","https://monmouthhawks.com/sports/mens-golf/schedule"],"roster":["https://monmouthhawks.com/sports/womens-golf/roster","https://monmouthhawks.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://monmouthhawks.com/sports/womens-lacrosse/schedule","https://monmouthhawks.com/sports/mens-lacrosse/schedule"],"roster":["https://monmouthhawks.com/sports/womens-lacrosse/roster","https://monmouthhawks.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://monmouthhawks.com/sports/rowing/schedule"],"roster":["https://monmouthhawks.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://monmouthhawks.com/sports/womens-soccer/schedule","https://monmouthhawks.com/sports/mens-soccer/schedule"],"roster":["https://monmouthhawks.com/sports/womens-soccer/roster","https://monmouthhawks.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://monmouthhawks.com/sports/softball/schedule"],"roster":["https://monmouthhawks.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://monmouthhawks.com/sports/womens-swimming-and-diving/schedule","https://monmouthhawks.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://monmouthhawks.com/sports/womens-swimming-and-diving/roster","https://monmouthhawks.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://monmouthhawks.com/sports/womens-tennis/schedule","https://monmouthhawks.com/sports/mens-tennis/schedule"],"roster":["https://monmouthhawks.com/sports/womens-tennis/roster","https://monmouthhawks.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://monmouthhawks.com/sports/womens-track-and-field/schedule","https://monmouthhawks.com/sports/mens-track-and-field/schedule"],"roster":["https://monmouthhawks.com/sports/womens-track-and-field/roster","https://monmouthhawks.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'monmouth|"+sport+"':"),`${sport} routes must live in the Monmouth module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://monmouthhawks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.monmouthHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=monmouth)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 7:00 PM Men's · Monmouth vs Seton Hall (Exhibition) | ",
 "Upcoming Oct 27, 7:00 PM Men's · Monmouth vs Rhode Island College (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Monmouth at St. John's | ",
 "Upcoming Nov 7, 4:00 PM Men's · Monmouth vs Rhode Island | ",
 "Upcoming Nov 12, 7:00 PM Men's · Monmouth at Quinnipiac | ",
 "Upcoming Nov 17, 7:00 PM Men's · Monmouth at Wake Forest | ",
 "Upcoming Nov 20, 7:00 PM Men's · Monmouth at Princeton | ",
 "Upcoming Nov 23, 8:00 PM Men's · Monmouth at North Carolina | ",
 "Upcoming Nov 28, 5:00 PM Men's · Monmouth vs Saint Joseph's | ",
 "Upcoming Dec 2, 7:00 PM Men's · Monmouth at Cincinnati | ",
 "Upcoming Dec 5, 2:00 PM Men's · Monmouth at Lehigh | ",
 "Upcoming Dec 8, 7:00 PM Men's · Monmouth vs La Salle | ",
 "Upcoming Dec 13, 2:00 PM Men's · Monmouth at Robert Morris | ",
 "Upcoming Dec 15, 5:00 PM Men's · Monmouth vs Siena | ",
 "Upcoming Dec 19 Men's · Monmouth at Penn | ",
 "Upcoming Dec 21, 7:00 PM Men's · Monmouth vs Cornell | ",
 "Upcoming Dec 31, 1:00 PM Men's · Monmouth at Stony Brook | ",
 "Upcoming Jan 7, 7:00 PM Men's · Monmouth vs Hampton | ",
 "Upcoming Jan 9, 1:00 PM Men's · Monmouth vs College of Charleston | ",
 "Upcoming Jan 14, 7:00 PM Men's · Monmouth at Towson | ",
 "Upcoming Jan 16, 2:00 PM Men's · Monmouth vs Drexel | ",
 "Upcoming Jan 18, 2:00 PM Men's · Monmouth at Northeastern | ",
 "Upcoming Jan 21, 7:00 PM Men's · Monmouth vs UNCW | ",
 "Upcoming Jan 28, 7:00 PM Men's · Monmouth at North Carolina A&T | ",
 "Upcoming Jan 30, 7:00 PM Men's · Monmouth at Elon | ",
 "Upcoming Feb 4, 7:00 PM Men's · Monmouth vs Campbell | ",
 "Upcoming Feb 8, 9:00 PM Men's · Monmouth at Drexel | ",
 "Upcoming Feb 11, 7:00 PM Men's · Monmouth vs Towson | ",
 "Upcoming Feb 15, 8:30 PM Men's · Monmouth vs Hofstra | ",
 "Upcoming Feb 18, 7:00 PM Men's · Monmouth at William & Mary | ",
 "Upcoming Feb 20 Men's · Monmouth at Hampton | ",
 "Upcoming Feb 25, 7:00 PM Men's · Monmouth vs Northeastern | ",
 "Upcoming Feb 27, 2:00 PM Men's · Monmouth vs Stony Brook | ",
 "Upcoming Mar 2, 7:00 PM Men's · Monmouth at Hofstra | ",
 "Upcoming Mar 5 Men's · Monmouth at CAA Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 21 Women's · Monmouth vs Rider (Exhibition) | W, 78-49",
 "Upcoming Nov 2, 6:00 PM Women's · Monmouth vs Binghamton | ",
 "Upcoming Nov 6, 6:00 PM Women's · Monmouth vs Lehigh | ",
 "Upcoming Nov 11, 7:00 PM Women's · Monmouth at Rutgers | ",
 "Upcoming Nov 13, 6:00 PM Women's · Monmouth vs Bryant & Stratton College | ",
 "Upcoming Nov 17, 7:00 PM Women's · Monmouth vs Marist | ",
 "Upcoming Nov 21, 2:00 PM Women's · Monmouth vs UMES | ",
 "Upcoming Nov 24, 7:00 PM Women's · Monmouth at Maryland | ",
 "Upcoming Nov 28, 1:00 PM Women's · Monmouth vs FDU | ",
 "Upcoming Dec 2, 4:30 PM Women's · Monmouth at NJIT | ",
 "Upcoming Dec 6 Women's · Monmouth at Howard | ",
 "Upcoming Dec 11, 6:00 PM Women's · Monmouth at Coppin State | ",
 "Upcoming Dec 15, 11:30 AM Women's · Monmouth vs Georgian Court | ",
 "Upcoming Dec 20, 1:00 PM Women's · Monmouth vs Cornell | ",
 "Upcoming Dec 28, 5:00 PM Women's · Monmouth vs Cheyney State | ",
 "Upcoming Jan 1 Women's · Monmouth at UNCW | ",
 "Upcoming Jan 3, 1:00 PM Women's · Monmouth at College of Charleston | ",
 "Upcoming Jan 8, 6:00 PM Women's · Monmouth vs Towson | ",
 "Upcoming Jan 15, 6:00 PM Women's · Monmouth at Hofstra | ",
 "Upcoming Jan 17, 2:00 PM Women's · Monmouth vs Drexel | ",
 "Upcoming Jan 22, 6:00 PM Women's · Monmouth vs Stony Brook | ",
 "Upcoming Jan 24, 2:00 PM Women's · Monmouth vs College of Charleston | ",
 "Upcoming Jan 29, 7:00 PM Women's · Monmouth at North Carolina A&T | ",
 "Upcoming Jan 31, 2:00 PM Women's · Monmouth at Campbell | ",
 "Upcoming Feb 5, 6:00 PM Women's · Monmouth vs Elon | ",
 "Upcoming Feb 7 Women's · Monmouth at Drexel | ",
 "Upcoming Feb 12, 6:00 PM Women's · Monmouth vs Northeastern | ",
 "Upcoming Feb 14, 2:00 PM Women's · Monmouth vs Hampton | ",
 "Upcoming Feb 19 Women's · Monmouth at Towson | ",
 "Upcoming Feb 21 Women's · Monmouth at Stony Brook | ",
 "Upcoming Feb 28, 2:00 PM Women's · Monmouth vs Hofstra | ",
 "Upcoming Mar 4, 6:00 PM Women's · Monmouth vs William & Mary | ",
 "Upcoming Mar 6 Women's · Monmouth at Northeastern | ",
 "Upcoming Mar 10 Women's · Monmouth at CAA Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Upcoming Oct 24 Monmouth at Seahawk Invite (2026-27) | ",
 "Upcoming Nov 13 Monmouth at NEC 1 (2026-27) | ",
 "Upcoming Nov 20 Monmouth at Jersey Jamboree (2026-27) | ",
 "Upcoming Jan 23 Monmouth at Dover Classic (2026-27) | ",
 "Upcoming Jan 30 Monmouth at Griffin Baker Classic (2026-27) | ",
 "Upcoming Feb 12 Monmouth at NEC 2 (2026-27) | ",
 "Upcoming Feb 27 Monmouth at Dr. Bob Cincotta Memorial Tournament (2026-27) | ",
 "Upcoming Mar 5 Monmouth at Music City Classic (2026-27) | ",
 "Upcoming Mar 12 Monmouth at USBC Sectionals | ",
 "Upcoming Mar 19 Monmouth at NEC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Monmouth at Adelphi Invitational | Completed",
 "Final Sep 11 Women's · Monmouth at Spiked Shoe Classic | Completed",
 "Final Oct 2 Women's · Monmouth at Paul Short Run | Completed",
 "Final Oct 16 Women's · Monmouth at Princeton Fall Classic | Completed",
 "Upcoming Oct 30, 10:00 AM Women's · Monmouth at CAA Cross Country Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Monmouth at NCAA Mid-Atlantic Regional Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Monmouth at Adelphi Invitational | Completed",
 "Final Sep 11 Men's · Monmouth at Spiked Shoe Classic | Completed",
 "Final Oct 16 Men's · Monmouth at Princeton Fall Classic | Completed",
 "Upcoming Oct 30, 10:00 AM Men's · Monmouth at CAA Cross Country Championships | ",
 "Upcoming Nov 13, 10:00 AM Men's · Monmouth at NCAA Mid-Atlantic Regional Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Monmouth vs Rutgers | W, 5-1",
 "Final Aug 30 Monmouth vs Delaware | L, 1-2",
 "Final Sep 4 Monmouth vs Rider | W, 8-0",
 "Final Sep 11 Monmouth at Temple | W, 4-2",
 "Final Sep 13 Monmouth vs Wagner | W, 8-1",
 "Final Sep 18 Monmouth vs Towson | W, 2-1",
 "Final Sep 20 Monmouth vs Penn State | W, 2-1",
 "Final Sep 25 Monmouth at Hofstra | W, 4-0",
 "Final Oct 2 Monmouth at Drexel | W, 3-0",
 "Final Oct 4 Monmouth vs Yale | L, 0-2",
 "Final Oct 11 Monmouth at Michigan | L, 1-2",
 "Final Oct 16 Monmouth vs William & Mary | W, 5-0",
 "Final Oct 18 Monmouth at Virginia | L, 3-4",
 "Today Oct 23, 4:00 PM Monmouth vs Fairfield | ",
 "Upcoming Oct 25, 12:00 PM Monmouth at Harvard | ",
 "Upcoming Oct 30, 3:00 PM Monmouth at Northeastern | ",
 "Upcoming Nov 4 Monmouth at CAA Championship | ",
 "Upcoming Nov 6 Monmouth at CAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Monmouth at Tennessee Tech | L, 14-38",
 "Final Sep 5 Monmouth vs Sacred Heart | W, 31-24",
 "Final Sep 12 Monmouth at Western Michigan | L, 14-49",
 "Final Sep 19 Monmouth at UAlbany | W, 28-20",
 "Final Sep 26 Monmouth at Dartmouth | W, 31-28",
 "Final Oct 3 Monmouth vs Towson | W, 41-40",
 "Final Oct 17 Monmouth at New Hampshire | W, 42-21",
 "Upcoming Oct 24, 2:00 PM Monmouth at Hampton | ",
 "Upcoming Oct 31, 1:00 PM Monmouth vs Bryant | ",
 "Upcoming Nov 7, 12:00 PM Monmouth vs North Carolina A&T | ",
 "Upcoming Nov 14, 12:00 PM Monmouth vs Merrimack | ",
 "Upcoming Nov 21, 12:00 PM Monmouth at Campbell | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 21 Women's · Monmouth at Red Bandanna Invitational | Completed",
 "Final Sep 28 Women's · Monmouth at Powercat Classic | Completed",
 "Final Oct 3 Women's · Monmouth at Navy Fall Invitational | Completed",
 "Final Oct 12 Women's · Monmouth at Quinnipiac Classic | Completed",
 "Upcoming Oct 26 Women's · Monmouth at Lehigh Fall Invitational | ",
 "Upcoming Mar 1 Women's · Monmouth at Grand Canyon Invitational | ",
 "Upcoming Mar 7 Women's · Monmouth at 2027 Lady Bison at Hawkstone | ",
 "Upcoming Mar 29 Women's · Monmouth at Golfweek/Stifel Spring Challenge | ",
 "Upcoming Apr 5 Women's · Monmouth at St. John's Invitational | ",
 "Upcoming Apr 16 Women's · Monmouth at CAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Oct 3 Men's · Monmouth at Columbia Autumn Invitational | Completed",
 "Final Oct 12 Men's · Monmouth at Bucknell Invitational | Completed",
 "Final Oct 19 Men's · Monmouth at Blue Hen Intercollegiate | Completed",
 "Upcoming Oct 26 Men's · Monmouth at Wykagyl Intercollegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 24, 8:00 AM Monmouth at Head of Schuylkill Regatta | ",
 "Upcoming Nov 1, 8:00 AM Monmouth at Princeton 3-Mile Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Monmouth vs Manhattan | W, 1-0",
 "Final Aug 16 Women's · Monmouth at Wagner | L, 1-2",
 "Final Aug 20 Women's · Monmouth at Providence | T, 1-1",
 "Final Aug 27 Women's · Monmouth at Army | W, 3-0",
 "Final Aug 30 Women's · Monmouth vs FDU | T, 2-2",
 "Final Sep 3 Women's · Monmouth vs St. John's | W, 1-0",
 "Final Sep 6 Women's · Monmouth at NJIT | W, 3-0",
 "Final Sep 13 Women's · Monmouth vs Columbia | W, 2-0",
 "Final Sep 20 Women's · Monmouth at Stony Brook | L, 0-1",
 "Final Sep 24 Women's · Monmouth at UNCW | T, 2-2",
 "Final Sep 27 Women's · Monmouth at Charleston | W, 1-0",
 "Final Oct 4 Women's · Monmouth vs Drexel | T, 0-0",
 "Final Oct 8 Women's · Monmouth vs Campbell | W, 3-0",
 "Final Oct 11 Women's · Monmouth vs Elon | T, 2-2",
 "Final Oct 18 Women's · Monmouth at Hofstra | L, 2-3",
 "Upcoming Oct 25, 1:00 PM Women's · Monmouth vs Towson | ",
 "Upcoming Nov 1, 1:00 PM Women's · Monmouth at Northeastern | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 21 Men's · Monmouth vs Iona | L, 1-4",
 "Final Aug 29 Men's · Monmouth vs Drexel | W, 1-0",
 "Final Sep 1 Men's · Monmouth at Penn | L, 1-4",
 "Final Sep 6 Men's · Monmouth vs La Salle | L, 2-4",
 "Final Sep 12 Men's · Monmouth vs Hofstra | T, 1-1",
 "Final Sep 19 Men's · Monmouth at Northeastern | L, 0-1",
 "Final Sep 22 Men's · Monmouth vs Rutgers-Newark | W, 2-0",
 "Final Sep 28 Men's · Monmouth at Stony Brook | L, 1-2",
 "Final Oct 6 Men's · Monmouth at St. John's | L, 0-1",
 "Final Oct 10 Men's · Monmouth vs Northeastern | T, 1-1",
 "Final Oct 17 Men's · Monmouth at Hofstra | L, 0-2",
 "Upcoming Oct 24, 1:00 PM Men's · Monmouth vs Stony Brook | ",
 "Upcoming Oct 27, 7:00 PM Men's · Monmouth at Temple | ",
 "Upcoming Oct 31, 1:00 PM Men's · Monmouth at Drexel | ",
 "Upcoming Nov 5 Men's · Monmouth at CAA Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · Monmouth vs Seton Hall | L, 66-137",
 "Upcoming Oct 24, 11:00 AM Women's · Monmouth vs Monmouth Tri-Meet | ",
 "Upcoming Nov 7 Women's · Monmouth at Iona | ",
 "Upcoming Nov 18, 10:00 AM Women's · Monmouth at Patriot Invitational | ",
 "Upcoming Jan 9 Women's · Monmouth at Army | ",
 "Upcoming Jan 22, 5:00 PM Women's · Monmouth at Monmouth Tri-Meet | ",
 "Upcoming Jan 30, 11:00 AM Women's · Monmouth at La Salle | ",
 "Upcoming Feb 6, 11:00 AM Women's · Monmouth vs Drexel | ",
 "Upcoming Feb 24 Women's · Monmouth at CAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · Monmouth at NJIT | Completed",
 "Final Oct 17 Men's · Monmouth vs Seton Hall | L, 93-112",
 "Upcoming Oct 24, 11:00 AM Men's · Monmouth vs Monmouth Tri-Meet | ",
 "Upcoming Nov 7 Men's · Monmouth at Iona | ",
 "Upcoming Nov 18, 10:00 AM Men's · Monmouth at Patriot Invitational | ",
 "Upcoming Jan 9 Men's · Monmouth at Army | ",
 "Upcoming Jan 22, 5:00 PM Men's · Monmouth at Monmouth Tri-Meet | ",
 "Upcoming Jan 30, 11:00 AM Men's · Monmouth at La Salle | ",
 "Upcoming Feb 6, 11:00 AM Men's · Monmouth vs Drexel | ",
 "Upcoming Feb 24 Men's · Monmouth at CAA Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Monmouth at Bill and Sandra Moore Invitational | Completed",
 "Final Sep 24 Women's · Monmouth vs Lafayette | W, 5-2",
 "Final Oct 7 Women's · Monmouth vs Wagner | L, 1-6",
 "Final Oct 17 Women's · Monmouth vs Providence | L, 3-4",
 "Final Oct 18 Women's · Monmouth at Holy Cross | L, 1-6",
 "Final Oct 22 Women's · Monmouth at Marist | L, 1-6",
 "Today Oct 23, 2:30 PM Women's · Monmouth vs Le Moyne | ",
 "Upcoming Feb 6, 5:00 PM Women's · Monmouth vs St. John's | ",
 "Upcoming Feb 12, 6:30 PM Women's · Monmouth vs Iona | ",
 "Upcoming Feb 20 Women's · Monmouth vs Rhode Island | ",
 "Upcoming Feb 21, 3:00 PM Women's · Monmouth vs Delaware | ",
 "Upcoming Feb 27, 10:00 AM Women's · Monmouth at Army | ",
 "Upcoming Feb 28 Women's · Monmouth vs Lehigh | ",
 "Upcoming Mar 13 Women's · Monmouth at NJIT | ",
 "Upcoming Mar 25, 11:00 AM Women's · Monmouth at George Washington | ",
 "Upcoming Mar 26, 10:00 AM Women's · Monmouth at George Mason | ",
 "Upcoming Apr 1 Women's · Monmouth at Stony Brook | ",
 "Upcoming Apr 4, 1:00 PM Women's · Monmouth vs Towson | ",
 "Upcoming Apr 9, 3:00 PM Women's · Monmouth vs Hofstra | ",
 "Upcoming Apr 11, 3:00 PM Women's · Monmouth at Drexel | ",
 "Upcoming Apr 16, 3:00 PM Women's · Monmouth at Wagner | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 23 Men's · Monmouth at Lafayette | W, 7-0",
 "Final Sep 30 Men's · Monmouth vs Adelphi | W, 6-1",
 "Final Oct 15 Men's · Monmouth at ITA Regionals | Completed",
 "Today Oct 23, 11:00 AM Men's · Monmouth vs Le Moyne | ",
 "Upcoming Oct 28, 2:00 PM Men's · Monmouth vs Siena | ",
 "Upcoming Nov 6 Men's · Monmouth at Dragon Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Monmouth module checks passed");
