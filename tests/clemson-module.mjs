import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {clemsonSchool,clemsonGolfPlace} from '../src/schools/clemson.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='clemson');
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
const worker=Function(...Object.keys(deps),source+';return {verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,clemsonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/clemson-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit clemsontigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['clemson'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',clemsonSchool.scheduleUrls],['roster',clemsonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('clemson|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'clemsontigers.com',`${key} must stay on clemsontigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://clemsontigers.com/sports/baseball/schedule"],"roster":["https://clemsontigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://clemsontigers.com/sports/mens-basketball/schedule","https://clemsontigers.com/sports/w-basketball/schedule"],"roster":["https://clemsontigers.com/sports/mens-basketball/roster","https://clemsontigers.com/sports/w-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://clemsontigers.com/sports/cross-country/schedule"],"roster":["https://clemsontigers.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://clemsontigers.com/sports/football/schedule"],"roster":["https://clemsontigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://clemsontigers.com/sports/womens-golf/schedule","https://clemsontigers.com/sports/mens-golf/schedule"],"roster":["https://clemsontigers.com/sports/womens-golf/roster","https://clemsontigers.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://clemsontigers.com/sports/gymnastics/schedule"],"roster":["https://clemsontigers.com/sports/gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://clemsontigers.com/sports/womens-lacrosse/schedule"],"roster":["https://clemsontigers.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://clemsontigers.com/sports/rowing/schedule"],"roster":["https://clemsontigers.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://clemsontigers.com/sports/womens-soccer/schedule","https://clemsontigers.com/sports/mens-soccer/schedule"],"roster":["https://clemsontigers.com/sports/womens-soccer/roster","https://clemsontigers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://clemsontigers.com/sports/softball/schedule"],"roster":["https://clemsontigers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://clemsontigers.com/sports/womens-tennis/schedule","https://clemsontigers.com/sports/mens-tennis/schedule"],"roster":["https://clemsontigers.com/sports/womens-tennis/roster","https://clemsontigers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://clemsontigers.com/sports/track-field/schedule"],"roster":["https://clemsontigers.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://clemsontigers.com/sports/volleyball/schedule"],"roster":["https://clemsontigers.com/sports/volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'clemson|"+sport+"':"),`${sport} routes must live in the Clemson module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://clemsontigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.clemsonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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


// Volleyball's "Orange vs. Purple" intrasquad (Aug 22) is internal even when
// its card carries a score.
{
  const raw=fixture('volleyball-schedule.html.gz').replace(/(Orange vs\. Purple[\s\S]*?)<div class="schedule-event-item-result__text"[^>]*>--<\/div>/,'$1<div class="schedule-event-item-result__label"><strong class="schedule-event-item-result__win"> W </strong><span class="sr-only">Win</span> 3-1</div>');
  assert.ok(raw.includes('Win</span> 3-1</div>'));
  const events=worker.parseHtml(raw,school,'Volleyball',page('volleyball'),now);
  assert.ok(events.length&&!events.some(e=>/Orange|Purple/.test(e.opponent)),'intrasquad left out');
}

// Golf: the team's place from the final story's headline when the card has
// none (women's cards publish no place).
assert.deepEqual(["Clemson Opens Campaign as Co-Champions of the Tiger Classic","Clemson Women's Golf Finishes Ninth at Cougar Classic","Clemson Women's Golf Finishes 10th at Mason Rudolph Championship","Ohio State Defeats Clemson at Final Day of Barbara Nicklaus Cup"].map(clemsonGolfPlace),['T1','9','10',null]);

// BEGIN generated (scripts/generate-module-tests.mjs --school=clemson)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Final Oct 9 Clemson vs Coastal Carolina (Exhibition) | W, 5-1",
 "Upcoming Oct 18, 1:00 PM Clemson at Georgia (Exhibition) | ",
 "Upcoming Oct 31, 1:00 PM Clemson at Georgia Tech (Exhibition) | ",
 "Upcoming Nov 1, 1:00 PM Clemson vs Georgia Tech (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Jul 29 Men's · Clemson at BC Silute (Exhibition) | W, 40-35",
 "Final Aug 1 Men's · Clemson at Pro Camp (Exhibition) | W, 69-58",
 "Final Aug 4 Men's · Clemson at Orange Bassano (Exhibition) | W, 99-54",
 "Upcoming Oct 23, 6:30 PM Men's · Clemson vs Georgia (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · Clemson vs Presbyterian College (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Clemson vs Stetson | ",
 "Upcoming Nov 6, 7:00 PM Men's · Clemson vs American | ",
 "Upcoming Nov 9, 7:00 PM Men's · Clemson vs North Dakota | ",
 "Upcoming Nov 13, 6:00 PM Men's · Clemson vs Georgetown | ",
 "Upcoming Nov 16, 7:00 PM Men's · Clemson vs The Citadel | ",
 "Upcoming Nov 23, 2:30 PM Men's · Clemson vs Ole Miss | ",
 "Upcoming Nov 24 Men's · Clemson vs Washington/BYU | ",
 "Upcoming Nov 25 Men's · Clemson vs TBA | ",
 "Upcoming Dec 1, 7:00 PM Men's · Clemson vs Auburn | ",
 "Upcoming Dec 6, 1:00 PM Men's · Clemson vs Le Moyne | ",
 "Upcoming Dec 12, 4:30 PM Men's · Clemson at TCU | ",
 "Upcoming Dec 15, 9:00 PM Men's · Clemson at South Carolina | ",
 "Upcoming Dec 19, 9:00 PM Men's · Clemson vs Cincinnati | ",
 "Upcoming Dec 22, 2:00 PM Men's · Clemson vs Colgate | ",
 "Upcoming Dec 29, 6:00 PM Men's · Clemson vs Virginia | ",
 "Upcoming Jan 2, 1:00 PM Men's · Clemson at NC State | ",
 "Upcoming Jan 5, 9:00 PM Men's · Clemson at Boston College | ",
 "Upcoming Jan 9, 12:00 PM Men's · Clemson vs Wake Forest | ",
 "Upcoming Jan 12, 9:00 PM Men's · Clemson vs Georgia Tech | ",
 "Upcoming Jan 16, 4:00 PM Men's · Clemson at Pittburgh | ",
 "Upcoming Jan 23, 12:00 PM Men's · Clemson vs Florida State | ",
 "Upcoming Jan 27, 7:00 PM Men's · Clemson at Miami | ",
 "Upcoming Jan 30 Men's · Clemson vs Duke | ",
 "Upcoming Feb 2, 8:00 PM Men's · Clemson at Virginia Tech | ",
 "Upcoming Feb 6, 12:00 PM Men's · Clemson vs California | ",
 "Upcoming Feb 10, 7:00 PM Men's · Clemson vs Syracuse | ",
 "Upcoming Feb 13, 3:15 PM Men's · Clemson at Florida State | ",
 "Upcoming Feb 16, 7:00 PM Men's · Clemson at Georgia Tech | ",
 "Upcoming Feb 20, 12:00 PM Men's · Clemson vs Stanford | ",
 "Upcoming Feb 23, 10:00 PM Men's · Clemson at SMU | ",
 "Upcoming Mar 2, 7:00 PM Men's · Clemson vs Notre Dame | ",
 "Upcoming Mar 6, 12:00 PM Men's · Clemson at Louisville | "
]);
  const v_wbasketball=parse("Basketball","w-basketball");
  assert.deepEqual(v_wbasketball.map(line),[
 "Upcoming Nov 2, 12:00 PM Women's · Clemson vs Radford | ",
 "Upcoming Nov 5, 7:00 PM Women's · Clemson vs ETSU | ",
 "Upcoming Nov 8, 2:00 PM Women's · Clemson vs UNC Greensboro | ",
 "Upcoming Nov 12, 7:00 PM Women's · Clemson vs South Carolina | ",
 "Upcoming Nov 15, 5:00 PM Women's · Clemson vs Stetson | ",
 "Upcoming Nov 18, 6:00 PM Women's · Clemson vs USC Upstate | ",
 "Upcoming Nov 20, 5:00 PM Women's · Clemson vs UNC Asheville | ",
 "Upcoming Nov 26, 11:00 AM Women's · Clemson vs Robert Morris | ",
 "Upcoming Nov 27, 1:15 PM Women's · Clemson vs Georgetown | ",
 "Upcoming Nov 29, 2:00 PM Women's · Clemson vs Elon | ",
 "Upcoming Dec 3, 7:00 PM Women's · Clemson at Kentucky | ",
 "Upcoming Dec 6, 6:00 PM Women's · Clemson vs Gardner-Webb | ",
 "Upcoming Dec 13, 2:00 PM Women's · Clemson at Wake Forest | ",
 "Upcoming Dec 15, 11:00 AM Women's · Clemson vs Western Carolina | ",
 "Upcoming Dec 20, 5:30 PM Women's · Clemson at Louisville | ",
 "Upcoming Dec 28, 7:00 PM Women's · Clemson vs Kennesaw State | ",
 "Upcoming Dec 31, 7:00 PM Women's · Clemson vs Stanford | ",
 "Upcoming Jan 3, 2:00 PM Women's · Clemson vs North Carolina | ",
 "Upcoming Jan 7, 7:00 PM Women's · Clemson at Georgia Tech | ",
 "Upcoming Jan 14, 7:00 PM Women's · Clemson at SMU | ",
 "Upcoming Jan 17, 2:00 PM Women's · Clemson vs Virginia | ",
 "Upcoming Jan 21, 7:00 PM Women's · Clemson vs Miami | ",
 "Upcoming Jan 24, 12:00 PM Women's · Clemson at Duke | ",
 "Upcoming Jan 28, 6:00 PM Women's · Clemson at Pitt | ",
 "Upcoming Feb 4, 6:00 PM Women's · Clemson vs Virginia Tech | ",
 "Upcoming Feb 7, 12:00 PM Women's · Clemson vs Notre Dame | ",
 "Upcoming Feb 11, 6:00 PM Women's · Clemson at Florida State | ",
 "Upcoming Feb 14, 12:00 PM Women's · Clemson at Boston College | ",
 "Upcoming Feb 18, 8:00 PM Women's · Clemson vs Cal | ",
 "Upcoming Feb 22, 6:00 PM Women's · Clemson vs Syracuse | ",
 "Upcoming Feb 25, 7:00 PM Women's · Clemson vs Georgia Tech | ",
 "Upcoming Feb 28, 12:00 PM Women's · Clemson at NC State | ",
 "Upcoming Mar 3 Women's · Clemson vs ACC Tournament TBD | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Clemson at USC Upstate Eyeopener | Completed",
 "Final Sep 18 Clemson at Southern Showcase | Completed",
 "Final Oct 2 Clemson at Joe Piane Invitational | Completed",
 "Upcoming Oct 16 Clemson at Pre-Nationals | ",
 "Upcoming Oct 30 Clemson at ACC Championships | ",
 "Upcoming Nov 13 Clemson at Southeast Regionals | ",
 "Upcoming Nov 21 Clemson at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Clemson at LSU | L, 10-51",
 "Final Sep 12 Clemson vs Georgia Southern | W, 22-7",
 "Final Sep 19 Clemson vs North Carolina | W, 28-20",
 "Final Sep 25 Clemson at California | W, 24-10",
 "Final Oct 3 Clemson vs Miami (Fla.) | L, 13-41",
 "Upcoming Oct 17, 12:00 PM Clemson vs Charleston Southern | ",
 "Upcoming Oct 24 Clemson vs Virginia Tech | ",
 "Upcoming Oct 31 Clemson at Florida State | ",
 "Upcoming Nov 7 Clemson at Syracuse | ",
 "Upcoming Nov 14 Clemson vs Georgia Tech | ",
 "Upcoming Nov 20, 7:30 PM Clemson at Duke | ",
 "Upcoming Nov 28 Clemson vs South Carolina | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · Clemson at Tiger Classic | Completed",
 "Final Sep 7 Women's · Clemson at Cougar Classic | Completed",
 "Final Sep 18 Women's · Clemson at Mason Rudolph Championship | Completed",
 "Final Oct 5 Women's · Clemson at Barbara Nicklaus Cup | Completed",
 "Upcoming Oct 23 Women's · Clemson at Landfall Tradition | ",
 "Upcoming Feb 1 Women's · Clemson at FAU Paradise Invitational | ",
 "Upcoming Feb 22 Women's · Clemson at Momentum Transportation UNF Collegiate | ",
 "Upcoming Mar 6 Women's · Clemson at Florida Gators Invitational | ",
 "Upcoming Mar 15 Women's · Clemson at Briar's Creek Invitational | ",
 "Upcoming Mar 21 Women's · Clemson at Clemson Invitational | ",
 "Upcoming Apr 15 Women's · Clemson at ACC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Clemson at Inverness Intercollegiate | 13th of 18",
 "Final Sep 28 Men's · Clemson at Bryan Bros Collegiate | 4th of 16",
 "Final Oct 5 Men's · Clemson at Barbara Nicklaus Cup | Completed",
 "Upcoming Oct 16 Men's · Clemson at Golf Club of Georgia Collegiate Invitational | ",
 "Upcoming Oct 26 Men's · Clemson at Ka'anapali Classic | ",
 "Upcoming Feb 15 Men's · Clemson at Battle at Briar's Creek | ",
 "Upcoming Mar 6 Men's · Clemson at The Hayt | ",
 "Upcoming Mar 14 Men's · Clemson at Michael A. Marino Classic | ",
 "Upcoming Mar 28 Men's · Clemson at The Hootie | ",
 "Upcoming Apr 12 Men's · Clemson at Mountaineer Invitational | ",
 "Upcoming Apr 22 Men's · Clemson at ACC Championship | ",
 "Upcoming May 17 Men's · Clemson at NCAA Regionals | ",
 "Upcoming May 28 Men's · Clemson at NCAA Championship | "
]);
  const v_gymnastics=parse("Gymnastics","gymnastics");
  assert.deepEqual(v_gymnastics.map(line),[
 "Upcoming Jan 10, 1:00 PM Clemson at Sprouts Farmer Market Collegiate Quad | ",
 "Upcoming Jan 15, 10:30 PM Clemson at California | ",
 "Upcoming Jan 22, 7:00 PM Clemson vs North Carolina | ",
 "Upcoming Jan 31, 4:00 PM Clemson vs NC State | ",
 "Upcoming Feb 6, 8:15 PM Clemson at Metroplex Challenge | ",
 "Upcoming Feb 13, 4:00 PM Clemson vs Pitt | ",
 "Upcoming Feb 19, 7:00 PM Clemson vs Stanford | ",
 "Upcoming Feb 21, 3:00 PM Clemson vs Georgia | ",
 "Upcoming Feb 26, 7:00 PM Clemson at Clemson Quad Meet | ",
 "Upcoming Mar 7, 5:30 PM Clemson at North Carolina | ",
 "Upcoming Mar 12, 7:00 PM Clemson at Clemson Quad Meet | ",
 "Upcoming Mar 20 Clemson at ACC Tournament | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 17, 1:00 PM Clemson vs Navy (Exhibition) | ",
 "Upcoming Oct 18, 12:00 PM Clemson vs Rutgers (Exhibition) | ",
 "Upcoming Oct 25, 10:00 AM Clemson vs Liberty (Exhibition) | ",
 "Upcoming Oct 25, 1:30 PM Clemson vs Charlotte (Exhibition) | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Nov 1 Clemson at Princeton Chase | ",
 "Upcoming Nov 8 Clemson at Rivanna Romp | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Clemson at Auburn | T, 0-0",
 "Final Aug 16 Women's · Clemson vs Ohio State | T, 0-0",
 "Final Aug 20 Women's · Clemson at South Carolina | L, 0-1",
 "Final Aug 23 Women's · Clemson vs Campbell | W, 5-0",
 "Final Aug 27 Women's · Clemson at Arkansas | W, 1-0",
 "Final Sep 3 Women's · Clemson vs Gardner-Webb | W, 5-1",
 "Final Sep 6 Women's · Clemson vs UNC Asheville | W, 3-0",
 "Final Sep 11 Women's · Clemson at Notre Dame | L, 1-2",
 "Final Sep 17 Women's · Clemson vs Syracuse | W, 2-0",
 "Final Sep 24 Women's · Clemson at Miami | W, 3-2",
 "Final Sep 27 Women's · Clemson vs Boston College | T, 3-3",
 "Final Oct 4 Women's · Clemson vs Florida State | L, 1-2",
 "Final Oct 10 Women's · Clemson vs Louisville | T, 1-1",
 "Today Oct 15, 8:00 PM Women's · Clemson vs North Carolina | ",
 "Upcoming Oct 22, 7:00 PM Women's · Clemson at Virginia | ",
 "Upcoming Oct 25, 5:00 PM Women's · Clemson at Virginia Tech | ",
 "Upcoming Nov 5, 5:00 PM Women's · Clemson at Wake Forest | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Clemson vs Furman | W, 5-1",
 "Final Aug 23 Men's · Clemson vs ETSU | W, 2-0",
 "Final Aug 28 Men's · Clemson at South Carolina | L, 2-3",
 "Final Sep 1 Men's · Clemson at UCF | W, 4-1",
 "Final Sep 4 Men's · Clemson at Syracuse | W, 1-0",
 "Final Sep 11 Men's · Clemson vs Notre Dame | L, 0-1",
 "Final Sep 15 Men's · Clemson vs North Florida | W, 5-1",
 "Final Sep 19 Men's · Clemson at North Carolina | W, 2-1",
 "Final Sep 25 Men's · Clemson vs Boston College | W, 4-0",
 "Final Sep 29 Men's · Clemson vs Wofford | W, 4-1",
 "Final Oct 2 Men's · Clemson vs UNCW | W, 4-1",
 "Final Oct 6 Men's · Clemson vs Georgia Southern | T, 2-2",
 "Final Oct 11 Men's · Clemson at Stanford | W, 3-2",
 "Upcoming Oct 16, 7:30 PM Men's · Clemson vs Louisville | ",
 "Upcoming Oct 25, 2:00 PM Men's · Clemson at Virginia Tech | ",
 "Upcoming Oct 30, 7:00 PM Men's · Clemson vs Wake Forest | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 15, 6:00 PM Clemson vs North Greenville (Exhibition) | ",
 "Upcoming Oct 18, 2:00 PM Clemson vs App State (Exhibition) | ",
 "Upcoming Oct 23, 6:00 PM Clemson at Furman (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Today Oct 15 Women's · Clemson at ITA Regionals | ",
 "Upcoming Oct 23 Women's · Clemson at Rome Fall Invite | ",
 "Upcoming Nov 5 Women's · Clemson at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Clemson at ITA Sectionals | ",
 "Upcoming Nov 17 Women's · Clemson at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Upcoming Nov 5 Men's · Clemson at ITA Masters | ",
 "Upcoming Nov 5 Men's · Clemson at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Clemson at NCAA Individual Championships | "
]);
  const v_trackfield=parse("Track & Field","track-field");
  assert.deepEqual(v_trackfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 28 Clemson vs Charleston Southern | W, 3-1",
 "Final Aug 29 Clemson vs Butler | L, 2-3",
 "Final Aug 30 Clemson vs Western Carolina | W, 3-1",
 "Final Sep 4 Clemson vs UNC Greensboro | W, 3-1",
 "Final Sep 5 Clemson vs East Carolina | W, 3-1",
 "Final Sep 6 Clemson vs App State | W, 3-2",
 "Final Sep 8 Clemson at Ole Miss | L, 2-3",
 "Final Sep 11 Clemson vs South Carolina | L, 1-3",
 "Final Sep 13 Clemson at Wofford | L, 1-3",
 "Final Sep 17 Clemson vs Furman | L, 2-3",
 "Final Sep 18 Clemson vs New Hampshire | L, 0-3",
 "Final Sep 20 Clemson vs USC Upstate | W, 3-1",
 "Final Sep 25 Clemson vs Virginia | L, 2-3",
 "Final Sep 27 Clemson vs Virginia Tech | L, 1-3",
 "Final Oct 2 Clemson at North Carolina | L, 0-3",
 "Final Oct 4 Clemson at Duke | L, 0-3",
 "Final Oct 9 Clemson at Miami (Fla.) | L, 1-3",
 "Final Oct 11 Clemson at Florida State | L, 0-3",
 "Upcoming Oct 16, 6:00 PM Clemson vs Boston College | ",
 "Upcoming Oct 18, 1:00 PM Clemson vs Syracuse | ",
 "Upcoming Oct 23, 6:00 PM Clemson vs SMU | ",
 "Upcoming Oct 25, 1:00 PM Clemson vs Pitt | ",
 "Upcoming Oct 30, 7:00 PM Clemson at Louisville | ",
 "Upcoming Nov 1, 1:00 PM Clemson at Notre Dame | ",
 "Upcoming Nov 6, 6:00 PM Clemson vs Wake Forest | ",
 "Upcoming Nov 8, 1:00 PM Clemson vs NC State | ",
 "Upcoming Nov 13, 10:00 PM Clemson at Stanford | ",
 "Upcoming Nov 15, 4:00 PM Clemson at California | ",
 "Upcoming Nov 18, 7:00 PM Clemson at Georgia Tech | ",
 "Upcoming Nov 20, 6:00 PM Clemson vs Georgia Tech | ",
 "Upcoming Nov 24, 2:00 PM Clemson vs Florida State | ",
 "Upcoming Nov 27, 3:00 PM Clemson at Wake Forest | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_wbasketball,"Basketball w-basketball");
  ownRecapsOnly(v_gymnastics,"Gymnastics gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackfield,"Track & Field track-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Clemson module checks passed');
