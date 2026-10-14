import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {purdueSchool,PURDUE_TFRRS_TEAMS,purdueGolfCardPlace} from '../src/schools/purdue.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='purdue');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,purdueHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/purdue-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit purduesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['purdue'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',purdueSchool.scheduleUrls],['roster',purdueSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('purdue|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'purduesports.com',`${key} must stay on purduesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://purduesports.com/sports/baseball/schedule"],"roster":["https://purduesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://purduesports.com/sports/mens-basketball/schedule","https://purduesports.com/sports/womens-basketball/schedule"],"roster":["https://purduesports.com/sports/mens-basketball/roster","https://purduesports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://purduesports.com/sports/cross-country/schedule"],"roster":["https://purduesports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://purduesports.com/sports/football/schedule"],"roster":["https://purduesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://purduesports.com/sports/womens-golf/schedule","https://purduesports.com/sports/mens-golf/schedule"],"roster":["https://purduesports.com/sports/womens-golf/roster","https://purduesports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://purduesports.com/sports/soccer/schedule"],"roster":["https://purduesports.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://purduesports.com/sports/softball/schedule"],"roster":["https://purduesports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://purduesports.com/sports/womens-swimming-diving/schedule","https://purduesports.com/sports/mens-swimming-diving/schedule"],"roster":["https://purduesports.com/sports/womens-swimming-diving/roster","https://purduesports.com/sports/mens-swimming-diving/roster"],"combined":true},"Tennis":{"schedule":["https://purduesports.com/sports/womens-tennis/schedule","https://purduesports.com/sports/mens-tennis/schedule"],"roster":["https://purduesports.com/sports/womens-tennis/roster","https://purduesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://purduesports.com/sports/track-field/schedule"],"roster":["https://purduesports.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://purduesports.com/sports/volleyball/schedule"],"roster":["https://purduesports.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://purduesports.com/sports/wrestling/schedule"],"roster":["https://purduesports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'purdue|"+sport+"':"),`${sport} routes must live in the Purdue module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://purduesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.purdueHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];




// BEGIN generated (scripts/generate-module-tests.mjs --school=purdue)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 18, 1:00 PM Purdue at Dayton (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 2:00 PM Men's · Purdue vs Ball State (Exhibition) | ",
 "Upcoming Oct 22, 7:00 PM Men's · Purdue at Purdue Fort Wayne (Exhibition) | ",
 "Upcoming Oct 27, 7:00 PM Men's · Purdue at Connecticut (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Purdue vs Gonzaga | ",
 "Upcoming Nov 6, 6:30 PM Men's · Purdue vs Valparaiso | ",
 "Upcoming Nov 9, 8:30 PM Men's · Purdue vs Illinois State | ",
 "Upcoming Nov 13, 7:00 PM Men's · Purdue vs Ohio | ",
 "Upcoming Nov 17, 6:30 PM Men's · Purdue vs Lipscomb | ",
 "Upcoming Nov 20, 7:00 PM Men's · Purdue vs Oakland | ",
 "Upcoming Nov 24, 6:00 PM Men's · Purdue vs DePaul | ",
 "Upcoming Nov 26, 12:00 PM Men's · Purdue vs Oklahoma | ",
 "Upcoming Dec 1, 7:00 PM Men's · Purdue vs Iowa | ",
 "Upcoming Dec 5, 8:00 PM Men's · Purdue at Iowa State | ",
 "Upcoming Dec 8, 9:00 PM Men's · Purdue at Wisconsin | ",
 "Upcoming Dec 11, 8:00 PM Men's · Purdue vs Tennessee | ",
 "Upcoming Dec 19, 5:30 PM Men's · Purdue vs Colorado | ",
 "Upcoming Dec 21, 6:00 PM Men's · Purdue vs Cal Baptist | ",
 "Upcoming Dec 30, 6:00 PM Men's · Purdue vs Southern California | ",
 "Upcoming Jan 2, 12:00 PM Men's · Purdue vs Rutgers | ",
 "Upcoming Jan 5, 9:00 PM Men's · Purdue at Illinois | ",
 "Upcoming Jan 8, 8:00 PM Men's · Purdue at Michigan | ",
 "Upcoming Jan 12, 8:00 PM Men's · Purdue vs Ohio State | ",
 "Upcoming Jan 17, 2:00 PM Men's · Purdue at Minnesota | ",
 "Upcoming Jan 20, 6:30 PM Men's · Purdue at Penn State | ",
 "Upcoming Jan 23, 12:00 PM Men's · Purdue vs Maryland | ",
 "Upcoming Jan 26, 6:00 PM Men's · Purdue vs Nebraska | ",
 "Upcoming Jan 30 Men's · Purdue at Michigan State | ",
 "Upcoming Feb 3, 6:30 PM Men's · Purdue at Rutgers | ",
 "Upcoming Feb 6, 12:00 PM Men's · Purdue vs Northwestern | ",
 "Upcoming Feb 12, 8:00 PM Men's · Purdue vs Illinois | ",
 "Upcoming Feb 16, 7:00 PM Men's · Purdue at Indiana | ",
 "Upcoming Feb 21, 1:00 PM Men's · Purdue vs UCLA | ",
 "Upcoming Feb 24, 10:30 PM Men's · Purdue at Oregon | ",
 "Upcoming Feb 27, 8:30 PM Men's · Purdue at Washington | ",
 "Upcoming Mar 5, 8:00 PM Men's · Purdue vs Indiana | ",
 "Upcoming Mar 9 Men's · Purdue at Big Ten Tournament (First Round) | ",
 "Upcoming Mar 10 Men's · Purdue at Big Ten Tournament (Second Round) | ",
 "Upcoming Mar 11 Men's · Purdue at Big Ten Tournament (Third Round) | ",
 "Upcoming Mar 12 Men's · Purdue at Big Ten Tournament (Quarterfinals) | ",
 "Upcoming Mar 13 Men's · Purdue at Big Ten Tournament (Semifinals) | ",
 "Upcoming Mar 14 Men's · Purdue at Big Ten Tournament (Championship) | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 24, 2:00 PM Women's · Purdue vs UIC (exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Women's · Purdue vs IU Indy | ",
 "Upcoming Nov 5, 7:00 PM Women's · Purdue vs Eastern Michigan | ",
 "Upcoming Nov 10, 7:00 PM Women's · Purdue vs Southeast Missouri State | ",
 "Upcoming Nov 15, 12:00 PM Women's · Purdue vs Samford | ",
 "Upcoming Nov 19, 11:00 AM Women's · Purdue vs Florida St. | ",
 "Upcoming Nov 21, 2:30 PM Women's · Purdue vs Texas Tech | ",
 "Upcoming Nov 25, 12:00 PM Women's · Purdue vs Murray State | ",
 "Upcoming Nov 29, 12:00 PM Women's · Purdue vs UT Martin | ",
 "Upcoming Dec 6, 2:00 PM Women's · Purdue vs Minnesota | ",
 "Upcoming Dec 10, 11:00 AM Women's · Purdue vs Central Michigan | ",
 "Upcoming Dec 13, 12:00 PM Women's · Purdue vs Eastern Illinois | ",
 "Upcoming Dec 19, 1:00 PM Women's · Purdue at Dayton | ",
 "Upcoming Dec 22, 12:00 PM Women's · Purdue vs Western Michigan | ",
 "Upcoming Dec 29, 6:00 PM Women's · Purdue at Penn State | ",
 "Upcoming Jan 1, 12:00 PM Women's · Purdue vs Michigan | ",
 "Upcoming Jan 5, 7:00 PM Women's · Purdue vs UCLA | ",
 "Upcoming Jan 10, 2:30 PM Women's · Purdue at Illinois | ",
 "Upcoming Jan 14, 7:00 PM Women's · Purdue vs Wisconsin | ",
 "Upcoming Jan 17, 5:00 PM Women's · Purdue at Washington | ",
 "Upcoming Jan 20, 10:00 PM Women's · Purdue at Oregon | ",
 "Upcoming Jan 24, 12:00 PM Women's · Purdue vs Southern California | ",
 "Upcoming Jan 31, 2:00 PM Women's · Purdue at Indiana | ",
 "Upcoming Feb 4, 6:00 PM Women's · Purdue vs Maryland | ",
 "Upcoming Feb 7, 12:00 PM Women's · Purdue vs Nebraska | ",
 "Upcoming Feb 11, 6:00 PM Women's · Purdue at Michigan State | ",
 "Upcoming Feb 14, 2:00 PM Women's · Purdue at Rutgers | ",
 "Upcoming Feb 17, 7:00 PM Women's · Purdue vs Indiana | ",
 "Upcoming Feb 21, 2:00 PM Women's · Purdue at Iowa | ",
 "Upcoming Feb 24, 7:00 PM Women's · Purdue at Ohio State | ",
 "Upcoming Feb 28, 12:00 PM Women's · Purdue vs Northwestern | ",
 "Upcoming Mar 2 Women's · Purdue at Big Ten Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 19 Purdue at John McNichols Invitational | Completed",
 "Final Sep 25 Purdue at Sean Earl Loyola Lakefront Invitational | Completed",
 "Upcoming Oct 16, 10:00 AM Purdue at Pre-National Invitational | ",
 "Upcoming Oct 30, 11:45 AM Purdue at Big Ten Championships | ",
 "Upcoming Nov 13, 10:00 AM Purdue at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21, 9:20 AM Purdue at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Purdue vs Indiana State | W, 44-19",
 "Final Sep 12 Purdue vs Wake Forest | L, 36-38",
 "Final Sep 19 Purdue at UCLA | L, 38-52",
 "Final Sep 26 Purdue vs Notre Dame | L, 10-49",
 "Final Oct 3 Purdue at Illinois | W, 24-17",
 "Final Oct 10 Purdue vs Minnesota | W, 41-13",
 "Upcoming Oct 16, 8:00 PM Purdue vs Washington | ",
 "Upcoming Oct 31 Purdue at Penn State | ",
 "Upcoming Nov 7 Purdue vs Maryland | ",
 "Upcoming Nov 14 Purdue at Iowa | ",
 "Upcoming Nov 21 Purdue vs Wisconsin | ",
 "Upcoming Nov 28 Purdue at Indiana | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Purdue at Boilermaker Classic | 4th of 16",
 "Final Sep 18 Women's · Purdue at Mason Rudolph Championship | 5th of 15",
 "Final Sep 26 Women's · Purdue at Fighting Irish Classic | 1st of 14",
 "Final Oct 5 Women's · Purdue at Windy City Collegiate Classic | 5th of 12",
 "Upcoming Oct 19 Women's · Purdue at Abilene Christian Intercollegiate | ",
 "Upcoming Jan 31, 9:00 AM Women's · Purdue at Golf Reservations Center Dominican Republic Classic - Hosted by Purdue | ",
 "Upcoming Feb 14 Women's · Purdue at Spartan Sun Coast Invitational | ",
 "Upcoming Mar 19 Women's · Purdue at Hawkeye El Tigre Invitational | ",
 "Upcoming Mar 29 Women's · Purdue at Coach Mo Classic | ",
 "Upcoming Apr 11 Women's · Purdue at Boilermaker Spring Classic | ",
 "Upcoming Apr 23 Women's · Purdue at Big Ten Championships | ",
 "Upcoming May 10 Women's · Purdue at NCAA Regionals | ",
 "Upcoming May 21 Women's · Purdue at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Purdue at New York Harbor Cup | 2nd of 9",
 "Final Sep 13 Men's · Purdue at Inverness Intercollegiate | T10th of 18",
 "Final Oct 4 Men's · Purdue at Fighting Irish Classic | 8th of 14",
 "Final Oct 12 Men's · Purdue at Purdue Fall Invitational | 1st of 13",
 "Upcoming Oct 26 Men's · Purdue at Ka'anapali Classic | ",
 "Upcoming Feb 14 Men's · Purdue at Purdue Dominican Republic Classic | ",
 "Upcoming Mar 6 Men's · Purdue at The Hayt | ",
 "Upcoming Mar 15 Men's · Purdue at Arizona Thunderbirds | ",
 "Upcoming Mar 28 Men's · Purdue at Hootie Intercollegiate | ",
 "Upcoming Apr 17 Men's · Purdue at Boilermaker Invitational | ",
 "Upcoming Apr 24 Men's · Purdue at Fighting Illini Collegiate | ",
 "Upcoming Apr 30 Men's · Purdue at Big Ten Championships | ",
 "Upcoming May 17 Men's · Purdue at NCAA Regional Championships | ",
 "Upcoming May 28 Men's · Purdue at NCAA National Championships | "
]);
  const v_soccer=parse("Soccer","soccer");
  assert.deepEqual(v_soccer.map(line),[
 "Final Aug 13 Purdue vs Evansville | T, 1-1",
 "Final Aug 16 Purdue vs Purdue Fort Wayne | W, 7-1",
 "Final Aug 20 Purdue vs Chicago State | W, 7-0",
 "Final Aug 23 Purdue vs Eastern Illinois | W, 8-0",
 "Final Aug 27 Purdue vs Ball State | W, 5-0",
 "Final Aug 30 Purdue at Southern Indiana | W, 3-0",
 "Final Sep 3 Purdue at Middle Tennessee State | W, 3-0",
 "Final Sep 10 Purdue at UCLA | L, 1-2",
 "Final Sep 13 Purdue at USC | W, 2-0",
 "Final Sep 20 Purdue at Rutgers | W, 2-1",
 "Final Sep 24 Purdue vs Illinois | W, 3-0",
 "Final Sep 27 Purdue vs Minnesota | W, 3-0",
 "Final Oct 3 Purdue at Penn State | T, 2-2",
 "Final Oct 8 Purdue vs Michigan | W, 6-5",
 "Final Oct 11 Purdue vs Michigan State | W, 2-1",
 "Upcoming Oct 18, 12:00 PM Purdue vs Ohio State | ",
 "Upcoming Oct 22, 7:00 PM Purdue at Indiana | ",
 "Upcoming Oct 25, 6:00 PM Purdue at Northwestern | ",
 "Upcoming Oct 30, 7:00 PM Purdue vs Nebraska | ",
 "Upcoming Oct 31 Purdue at Big Ten Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Sep 19 Purdue vs Bryant & Stratton | W, 15-0",
 "Final Sep 20 Purdue vs Loyola (IL) | W, 6-1",
 "Final Sep 27 Purdue vs DePaul | W, 6-0",
 "Final Sep 27 Purdue vs DePaul | L, 2-4",
 "Final Oct 3 Purdue vs Illinois St. | W, 9-1",
 "Final Oct 4 Purdue vs Eastern Ill. | W, 8-2",
 "Upcoming Oct 25, 12:00 PM Purdue vs Western Ky. | ",
 "Upcoming Oct 25, 2:30 PM Purdue vs Western Ky. | "
]);
  const v_womensswimmingdiving=parse("Swimming & Diving","womens-swimming-diving");
  assert.deepEqual(v_womensswimmingdiving.map(line),[
 "Final Oct 2 Women's · Purdue at Illinois | W, 167.5-132.5",
 "Upcoming Oct 23, 4:00 PM Women's · Purdue vs UCLA | ",
 "Upcoming Oct 23, 4:00 PM Women's · Purdue at Iowa | ",
 "Upcoming Oct 24, 11:00 AM Women's · Purdue at Dan Ross Indiana Intercollegiate | ",
 "Upcoming Oct 30, 5:00 PM Women's · Purdue vs Oakland | ",
 "Upcoming Oct 31, 11:00 AM Women's · Purdue vs Oakland | ",
 "Upcoming Nov 17, 5:00 PM Women's · Purdue at Opening Night Relays | ",
 "Upcoming Nov 18 Women's · Purdue at Ohio State Invite | ",
 "Upcoming Dec 9 Women's · Purdue at USA Diving Winter Nationals | ",
 "Upcoming Jan 23, 10:00 AM Women's · Purdue vs Indiana | ",
 "Upcoming Jan 29, 5:00 PM Women's · Purdue vs Minnesota | ",
 "Upcoming Jan 29, 5:00 PM Women's · Purdue vs Northwestern | ",
 "Upcoming Jan 30, 11:00 AM Women's · Purdue vs Minnesota | ",
 "Upcoming Jan 30, 11:00 AM Women's · Purdue vs Northwestern | ",
 "Upcoming Feb 17, 5:00 PM Women's · Purdue at Opening Night Relays & Team Diving | ",
 "Upcoming Feb 18, 11:00 AM Women's · Purdue at Big Tens | ",
 "Upcoming Mar 8, 1:00 PM Women's · Purdue at Zones | ",
 "Upcoming Mar 17, 11:00 AM Women's · Purdue at NCAAs | ",
 "Upcoming Apr 21 Women's · Purdue at TYR Pro Swim Series - Fort Lauderdale | "
]);
  const v_mensswimmingdiving=parse("Swimming & Diving","mens-swimming-diving");
  assert.deepEqual(v_mensswimmingdiving.map(line),[
 "Final Oct 10 Men's · Purdue at Seminole Fall Classic | W, 352.5-347.5",
 "Upcoming Oct 24, 11:00 AM Men's · Purdue at Dan Ross Indiana Intercollegiate | ",
 "Upcoming Oct 30, 5:00 PM Men's · Purdue vs Oakland | ",
 "Upcoming Oct 31, 11:00 AM Men's · Purdue vs Oakland | ",
 "Upcoming Nov 17, 5:00 PM Men's · Purdue at Opening Night Relays | ",
 "Upcoming Nov 18 Men's · Purdue at Ohio State Invite | ",
 "Upcoming Dec 5, 1:00 PM Men's · Purdue at Wisconsin | ",
 "Upcoming Dec 9 Men's · Purdue at USA Diving Winter Nationals | ",
 "Upcoming Jan 23, 10:00 AM Men's · Purdue vs Indiana | ",
 "Upcoming Jan 29, 5:00 PM Men's · Purdue vs Northwestern | ",
 "Upcoming Jan 29, 5:00 PM Men's · Purdue vs Minnesota | ",
 "Upcoming Jan 30, 11:00 AM Men's · Purdue vs Minnesota | ",
 "Upcoming Jan 30, 11:00 AM Men's · Purdue vs Northwestern | ",
 "Upcoming Feb 24, 5:00 PM Men's · Purdue at Opening Night Relays & Team Diving | ",
 "Upcoming Feb 25, 10:00 AM Men's · Purdue at Big Tens | ",
 "Upcoming Mar 8, 1:00 PM Men's · Purdue at Zones | ",
 "Upcoming Mar 24, 11:00 AM Men's · Purdue at NCAAs | ",
 "Upcoming Apr 21 Men's · Purdue at TYR Pro Swim Series - Fort Lauderdale | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Purdue at Milwaukee Tennis Classic | Completed",
 "Final Sep 18 Women's · Purdue at UC/Pam Whitehead Invitational | Completed",
 "Final Sep 19 Women's · Purdue at ITA All-American Championships | Completed",
 "Final Oct 1 Women's · Purdue at Battle in the Bay Classic | Completed",
 "Final Oct 2 Women's · Purdue at Hoosier Classic | Completed",
 "Final Oct 8 Women's · Purdue at ITA Ohio Valley Regional Championships | Completed",
 "Upcoming Oct 23 Women's · Purdue at Battle for the Boot JAE Foundation Open | ",
 "Upcoming Nov 5 Women's · Purdue at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Purdue at NCAA Individuals Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 21 Men's · Purdue at All-American Tournament | Completed",
 "Final Sep 25 Men's · Purdue at Ted Farnsworth Invitational | Completed",
 "Final Oct 2 Men's · Purdue at Hope College RSM Invite | Completed",
 "Final Oct 8 Men's · Purdue at ITA Regionals | Completed",
 "Upcoming Oct 29 Men's · Purdue at Big Ten Individuals Championships | ",
 "Upcoming Nov 5 Men's · Purdue at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Purdue at NCAA Singles Championship | ",
 "Upcoming Mar 13 Men's · Purdue vs Northwestern | ",
 "Upcoming Mar 14 Men's · Purdue vs Illinois | ",
 "Upcoming Mar 20 Men's · Purdue vs Indiana | ",
 "Upcoming Mar 27 Men's · Purdue at UCLA | ",
 "Upcoming Mar 28 Men's · Purdue at Southern California | ",
 "Upcoming Apr 3 Men's · Purdue vs Oregon | ",
 "Upcoming Apr 4 Men's · Purdue vs Washington | ",
 "Upcoming Apr 10 Men's · Purdue at Ohio State | ",
 "Upcoming Apr 11 Men's · Purdue at Penn State | ",
 "Upcoming Apr 17 Men's · Purdue at Wisconsin | ",
 "Upcoming Apr 18 Men's · Purdue at Nebraska | ",
 "Upcoming Apr 24 Men's · Purdue vs Michigan State | ",
 "Upcoming Apr 25 Men's · Purdue vs Michigan | "
]);
  const v_trackfield=parse("Track & Field","track-field");
  assert.deepEqual(v_trackfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 14 Purdue vs Ball State (Exhibition) | W, 5-0",
 "Final Aug 21 Purdue vs Butler (Exhibition) | W, 4-0",
 "Final Aug 28 Purdue vs Creighton | L, 2-3",
 "Final Sep 1 Purdue vs Texas A&M | W, 3-0",
 "Final Sep 2 Purdue vs Georgia | W, 3-2",
 "Final Sep 6 Purdue vs TCU | L, 0-3",
 "Final Sep 9 Purdue vs IU Indy | W, 3-0",
 "Final Sep 12 Purdue vs Houston | W, 3-0",
 "Final Sep 13 Purdue vs SMU | W, 3-0",
 "Final Sep 17 Purdue vs UAlbany | W, 3-0",
 "Final Sep 19 Purdue vs UCF | W, 3-0",
 "Final Sep 24 Purdue vs Maryland | W, 3-0",
 "Final Sep 27 Purdue vs Wisconsin | L, 0-3",
 "Final Oct 2 Purdue at Oregon | L, 2-3",
 "Final Oct 4 Purdue at Washington | L, 0-3",
 "Final Oct 9 Purdue vs USC | W, 3-0",
 "Final Oct 11 Purdue vs Illinois | W, 3-2",
 "Upcoming Oct 15, 9:00 PM Purdue at Iowa | ",
 "Upcoming Oct 17, 5:00 PM Purdue at Nebraska | ",
 "Upcoming Oct 23, 7:00 PM Purdue vs Minnesota | ",
 "Upcoming Oct 25, 4:00 PM Purdue vs Northwestern | ",
 "Upcoming Oct 29, 7:00 PM Purdue vs Rutgers | ",
 "Upcoming Oct 31 Purdue at Penn State | ",
 "Upcoming Nov 4, 7:00 PM Purdue at Ohio State | ",
 "Upcoming Nov 7, 8:00 PM Purdue vs UCLA | ",
 "Upcoming Nov 12, 6:00 PM Purdue at Michigan State | ",
 "Upcoming Nov 14, 6:00 PM Purdue at Michigan | ",
 "Upcoming Nov 17, 7:00 PM Purdue at Indiana | ",
 "Upcoming Nov 20 Purdue at Big Ten Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 1:00 PM Purdue vs Kent State | ",
 "Upcoming Nov 7, 2:30 PM Purdue vs Air Force | ",
 "Upcoming Nov 7, 5:00 PM Purdue vs The Citadel | ",
 "Upcoming Nov 14 Purdue at Tiger Style Invitational | ",
 "Upcoming Nov 20, 12:00 PM Purdue at George Mason | ",
 "Upcoming Nov 20, 7:00 PM Purdue at American | ",
 "Upcoming Dec 4 Purdue at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 12, 12:00 PM Purdue vs Chattanooga | ",
 "Upcoming Dec 12, 2:00 PM Purdue vs Central Michigan | ",
 "Upcoming Dec 20 Purdue at Bucknell | ",
 "Upcoming Dec 20 Purdue vs Hofstra | ",
 "Upcoming Jan 3 Purdue vs Nebraska | ",
 "Upcoming Jan 10 Purdue at Ohio State | ",
 "Upcoming Jan 17 Purdue vs Minnesota | ",
 "Upcoming Jan 22 Purdue at Michigan | ",
 "Upcoming Jan 24 Purdue at Northwestern | ",
 "Upcoming Jan 29 Purdue vs Maryland | ",
 "Upcoming Feb 5 Purdue at Michigan State | ",
 "Upcoming Feb 14 Purdue vs Indiana | ",
 "Upcoming Mar 6 Purdue at Big Ten Championships | ",
 "Upcoming Mar 18 Purdue at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackfield,"Track & Field track-field");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: one card per meet for both teams; both TFRRS team pages are
// read (Penn State's rule).
{
  fromTfrrs(PURDUE_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.team_label||null,e.opponent,e.headline,Boolean(e.meet_results_verified)]),[[null,"John McNichols Invitational","Women's team: 20th · 567 pts / Men's team: 21st · 572 pts",true],[null,"Sean Earl Loyola Lakefront Invitational","Women's team: 1st · 67 pts / Men's team: 12th · 295 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Golf: the card's result line gives the place, the field and the team score
// (women's: the rounds, then the total; men's: "Teams" and a 54-hole total
// that can carry a comma).
assert.deepEqual(['4th/16 (+29; 293-304-296—893 )','2nd / 9 Teams (-23; 829)','T-10th / 18 Teams (+24; 876)','1st / 13 Teams (-4; 1,076)'].map(text=>purdueGolfCardPlace(text)?.results.map(r=>r.value).join(' · ')),["4th of 16 · 893","2nd of 9 · 829","T10th of 18 · 876","1st of 13 · 1076"]);

// Records: each page publishes its Overall and Conf. records; the app counts
// its own from the finals.
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  const published=slug=>{const raw=fixture(`${slug}-schedule.html.gz`).replace(/ data-v-\w+/g,''),stat=label=>(raw.match(new RegExp(`schedule-stats-item__label">${label}</strong><strong class="schedule-stats-item__value">([^<]*)`))||[])[1]||null;return[stat('Overall'),stat('Conf\\.')];};
  const pages=[['Football','football'],['Volleyball','volleyball'],['Soccer','soccer']];
  assert.deepEqual(pages.map(([sport,slug])=>[slug,...records(sport,slug)]),pages.map(([,slug])=>[slug,...published(slug)]));
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Purdue module checks passed');
