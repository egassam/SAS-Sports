import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {marshallSchool} from '../src/schools/marshall.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='marshall');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,marshallHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/marshall-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit herdzone.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['marshall'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',marshallSchool.scheduleUrls],['roster',marshallSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('marshall|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'herdzone.com',`${key} must stay on herdzone.com`);
  }
}
const parity={"Baseball":{"schedule":["https://herdzone.com/sports/baseball/schedule"],"roster":["https://herdzone.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://herdzone.com/sports/mens-basketball/schedule","https://herdzone.com/sports/womens-basketball/schedule"],"roster":["https://herdzone.com/sports/mens-basketball/roster","https://herdzone.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://herdzone.com/sports/cross-country/schedule"],"roster":["https://herdzone.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://herdzone.com/sports/football/schedule"],"roster":["https://herdzone.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://herdzone.com/sports/womens-golf/schedule","https://herdzone.com/sports/mens-golf/schedule"],"roster":["https://herdzone.com/sports/womens-golf/roster","https://herdzone.com/sports/mens-golf/roster"],"combined":true},"STUNT":{"schedule":["https://herdzone.com/sports/stunt/schedule"],"roster":["https://herdzone.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://herdzone.com/sports/womens-soccer/schedule","https://herdzone.com/sports/mens-soccer/schedule"],"roster":["https://herdzone.com/sports/womens-soccer/roster","https://herdzone.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://herdzone.com/sports/softball/schedule"],"roster":["https://herdzone.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://herdzone.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://herdzone.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://herdzone.com/sports/womens-tennis/schedule"],"roster":["https://herdzone.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://herdzone.com/sports/track-and-field/schedule"],"roster":["https://herdzone.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://herdzone.com/sports/womens-volleyball/schedule"],"roster":["https://herdzone.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'marshall|"+sport+"':"),`${sport} routes must live in the Marshall module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://herdzone.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.marshallHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=marshall)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 23, 6:00 PM Marshall vs Green & White World Series | ",
 "Upcoming Oct 24, 4:00 PM Marshall vs Green & White World Series | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 22, 7:00 PM Men's · Marshall vs West Virginia Wesleyan (Exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · Marshall vs UPIKE (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Marshall vs Buffalo | ",
 "Upcoming Nov 7, 2:00 PM Men's · Marshall vs Toledo | ",
 "Upcoming Nov 9, 6:00 PM Men's · Marshall at Ohio State | ",
 "Upcoming Nov 14, 6:00 PM Men's · Marshall at Youngstown State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Marshall vs ETSU | ",
 "Upcoming Nov 20, 9:00 PM Men's · Marshall at North Carolina | ",
 "Upcoming Nov 25, 4:00 PM Men's · Marshall vs Prairie View A&M | ",
 "Upcoming Nov 28, 4:00 PM Men's · Marshall vs East Texas A&M | ",
 "Upcoming Dec 2, 7:00 PM Men's · Marshall vs UNC Wilmington | ",
 "Upcoming Dec 5, 7:00 PM Men's · Marshall vs Bethune-Cookman | ",
 "Upcoming Dec 12, 7:00 PM Men's · Marshall vs Kentucky Christian | ",
 "Upcoming Dec 16, 7:00 PM Men's · Marshall vs Old Dominion | ",
 "Upcoming Dec 19, 4:00 PM Men's · Marshall at Louisiana | ",
 "Upcoming Dec 23, 7:00 PM Men's · Marshall vs WVU Tech | ",
 "Upcoming Dec 31, 4:00 PM Men's · Marshall vs South Alabama | ",
 "Upcoming Jan 2, 4:00 PM Men's · Marshall vs Arkansas State | ",
 "Upcoming Jan 7, 7:30 PM Men's · Marshall at ULM | ",
 "Upcoming Jan 9, 4:00 PM Men's · Marshall at Louisiana Tech | ",
 "Upcoming Jan 14 Men's · Marshall at Georgia State | ",
 "Upcoming Jan 16, 7:00 PM Men's · Marshall vs Georgia Southern | ",
 "Upcoming Jan 21, 7:00 PM Men's · Marshall at JMU | ",
 "Upcoming Jan 23, 3:00 PM Men's · Marshall at Coastal Carolina | ",
 "Upcoming Jan 28, 7:00 PM Men's · Marshall vs Georgia State | ",
 "Upcoming Jan 30, 7:00 PM Men's · Marshall vs App State | ",
 "Upcoming Feb 3 Men's · Marshall at Georgia Southern | ",
 "Upcoming Feb 6 Men's · Marshall at at Opponent TBA | ",
 "Upcoming Feb 11, 7:00 PM Men's · Marshall vs Coastal Carolina | ",
 "Upcoming Feb 13, 7:00 PM Men's · Marshall vs JMU | ",
 "Upcoming Feb 18, 6:30 PM Men's · Marshall at App State | ",
 "Upcoming Feb 20, 7:00 PM Men's · Marshall at Old Dominion | ",
 "Upcoming Feb 26, 9:00 PM Men's · Marshall vs Troy | ",
 "Upcoming Mar 2 Men's · Marshall at 2027 Sun Belt Men's Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · Marshall vs Kentucky Christian (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Marshall at UMass | ",
 "Upcoming Nov 6, 6:00 PM Women's · Marshall vs NC A&T | ",
 "Upcoming Nov 10, 6:00 PM Women's · Marshall vs Howard | ",
 "Upcoming Nov 12, 11:00 AM Women's · Marshall vs West Virginia State | ",
 "Upcoming Nov 15, 3:00 PM Women's · Marshall at Duke | ",
 "Upcoming Nov 18, 5:00 PM Women's · Marshall at Wright State | ",
 "Upcoming Nov 20, 6:00 PM Women's · Marshall at Kentucky | ",
 "Upcoming Nov 24, 6:00 PM Women's · Marshall vs Davis & Elkins | ",
 "Upcoming Nov 30, 6:00 PM Women's · Marshall vs Ohio | ",
 "Upcoming Dec 3, 12:00 PM Women's · Marshall at Tennessee Tech | ",
 "Upcoming Dec 6, 1:00 PM Women's · Marshall vs Harvard | ",
 "Upcoming Dec 12, 3:30 PM Women's · Marshall at Kent State | ",
 "Upcoming Dec 16, 11:00 AM Women's · Marshall vs App State | ",
 "Upcoming Dec 19, 3:00 PM Women's · Marshall at South Alabama | ",
 "Upcoming Dec 22, 12:00 PM Women's · Marshall at NKU | ",
 "Upcoming Dec 30 Women's · Marshall at Troy | ",
 "Upcoming Jan 2 Women's · Marshall at Arkansas State | ",
 "Upcoming Jan 7, 6:00 PM Women's · Marshall vs LA Tech | ",
 "Upcoming Jan 9, 1:00 PM Women's · Marshall vs Louisiana | ",
 "Upcoming Jan 14, 6:00 PM Women's · Marshall vs Georgia State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Marshall vs JMU | ",
 "Upcoming Jan 20, 6:00 PM Women's · Marshall at Georgia Southern | ",
 "Upcoming Jan 23, 4:00 PM Women's · Marshall at Old Dominion | ",
 "Upcoming Jan 28, 6:00 PM Women's · Marshall at JMU | ",
 "Upcoming Jan 30, 2:00 PM Women's · Marshall at App State | ",
 "Upcoming Feb 3, 6:00 PM Women's · Marshall vs Georgia Southern | ",
 "Upcoming Feb 6, 1:00 PM Women's · Marshall vs MAC-SBC Challenge | ",
 "Upcoming Feb 13, 1:00 PM Women's · Marshall vs ULM | ",
 "Upcoming Feb 18, 6:00 PM Women's · Marshall at Coastal Carolina | ",
 "Upcoming Feb 20 Women's · Marshall at Georgia State | ",
 "Upcoming Feb 23, 6:00 PM Women's · Marshall vs Old Dominion | ",
 "Upcoming Feb 26, 6:00 PM Women's · Marshall vs Coastal Carolina | ",
 "Upcoming Mar 2 Women's · Marshall at 2027 Sun Belt Women's Basketball Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Marshall at Thundering Herd Invitational | Women's team: 1st / Men's team: 2nd",
 "Final Sep 11 Marshall at Queen City Invite | Women's team: 3rd / Men's team: 3rd",
 "Final Oct 3 Marshall at Louisville Cross Country Classic | Women's team: 4th / Men's team: 7th",
 "Final Oct 16 Marshall at Eagle Invitational | Women's team: 1st / Men's team: 1st",
 "Upcoming Oct 30 Marshall at Sun Belt Conference Championship | ",
 "Upcoming Nov 13 Marshall at NCAA Mid-Atlantic Regional Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Marshall at Penn State | L, 0-45",
 "Final Sep 12 Marshall vs Middle Tennessee | W, 28-26",
 "Final Sep 19 Marshall at Missouri State | W, 30-24",
 "Final Sep 26 Marshall vs Gardner-Webb | W, 36-35",
 "Final Oct 3 Marshall at JMU | L, 17-45",
 "Final Oct 10 Marshall vs Coastal Carolina | L, 21-27",
 "Final Oct 20 Marshall vs South Alabama | W, 20-13",
 "Upcoming Oct 31, 1:00 PM Marshall at Old Dominion | ",
 "Upcoming Nov 7 Marshall at Georgia Southern | ",
 "Upcoming Nov 14 Marshall vs App State | ",
 "Upcoming Nov 21 Marshall vs Georgia State | ",
 "Upcoming Nov 28 Marshall at ULM | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Marshall at Tribe Invitational | Completed",
 "Final Sep 14 Women's · Marshall at Rocket Classic | Completed",
 "Final Sep 28 Women's · Marshall at Duquesne Dukes Invitational | Completed",
 "Final Oct 19 Women's · Marshall at UNCG Fall Invitational | Completed",
 "Upcoming Feb 15 Women's · Marshall at Rivertowne Invitational | ",
 "Upcoming Mar 1 Women's · Marshall at UNCW River Landing Invite | ",
 "Upcoming Mar 12 Women's · Marshall at NKU Spring Invite | ",
 "Upcoming Mar 22 Women's · Marshall at Kingsmill Intercollegiate | ",
 "Upcoming Apr 5 Women's · Marshall at WKU Invitational | ",
 "Upcoming Apr 19 Women's · Marshall at Sun Belt Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · Marshall at Virtues Intercollegiate | Completed",
 "Final Sep 14 Men's · Marshall at Joe Feaganes Marshall Invitational | Completed",
 "Final Sep 21 Men's · Marshall at River Run Collegiate | Completed",
 "Final Oct 5 Men's · Marshall at Tom Tontimonia Invitational | Completed",
 "Final Oct 19 Men's · Marshall at Dayton Flyer Intercollgiate | Completed",
 "Upcoming Feb 15 Men's · Marshall at Wexford Intercollegiate | ",
 "Upcoming Feb 26 Men's · Marshall at Sea Palms Invitational | ",
 "Upcoming Mar 15 Men's · Marshall at Tiger Invitational | ",
 "Upcoming Mar 27 Men's · Marshall at Sweetens Cove Intercollegiate | ",
 "Upcoming Apr 6 Men's · Marshall at Racer Intercollegiate | ",
 "Upcoming Apr 12 Men's · Marshall at Wofford Invitational | ",
 "Upcoming Apr 26 Men's · Marshall at Sun Belt Championship | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Marshall vs Morehead State | W, 3-1",
 "Final Aug 20 Women's · Marshall at High Point | L, 0-4",
 "Final Aug 23 Women's · Marshall vs Wright State | W, 3-2",
 "Final Aug 27 Women's · Marshall at Belmont | T, 3-3",
 "Final Aug 30 Women's · Marshall at UT Martin | W, 1-0",
 "Final Sep 3 Women's · Marshall vs Murray State | T, 0-0",
 "Final Sep 6 Women's · Marshall at WVU | L, 0-1",
 "Final Sep 13 Women's · Marshall at Bellarmine | W, 4-2",
 "Final Sep 19 Women's · Marshall vs Louisiana Tech | T, 1-1",
 "Final Sep 24 Women's · Marshall at Troy | W, 2-1",
 "Final Sep 27 Women's · Marshall vs JMU | W, 2-1",
 "Final Oct 4 Women's · Marshall vs Georgia Southern | T, 2-2",
 "Final Oct 8 Women's · Marshall at Old Dominion | L, 0-3",
 "Final Oct 11 Women's · Marshall vs ULM | W, 1-0",
 "Final Oct 18 Women's · Marshall at Louisiana | T, 1-1",
 "Today Oct 22, 7:00 PM Women's · Marshall at Georgia State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Marshall vs App State | ",
 "Upcoming Nov 1, 1:00 PM Women's · Marshall at Coastal Carolina | ",
 "Upcoming Nov 9 Women's · Marshall at 2026 Sun Belt Conference Women's Soccer Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Marshall vs Fairfield | W, 2-1",
 "Final Aug 27 Men's · Marshall at UC Santa Barbara | T, 1-1",
 "Final Sep 1 Men's · Marshall at George Mason | T, 3-3",
 "Final Sep 6 Men's · Marshall vs VCU | W, 3-1",
 "Final Sep 11 Men's · Marshall vs Utah Valley | L, 1-2",
 "Final Sep 18 Men's · Marshall at Kentucky | W, 1-0",
 "Final Sep 22 Men's · Marshall vs Eastern Illinois | W, 2-1",
 "Final Sep 27 Men's · Marshall vs WVU | T, 1-1",
 "Final Oct 3 Men's · Marshall at UCF | L, 0-4",
 "Final Oct 9 Men's · Marshall vs Georgia Southern | T, 2-2",
 "Final Oct 13 Men's · Marshall at UNC Greensboro | W, 5-1",
 "Final Oct 17 Men's · Marshall at Coastal Carolina | W, 2-1",
 "Final Oct 21 Men's · Marshall vs JMU | W, 1-0",
 "Upcoming Oct 25, 4:00 PM Men's · Marshall at Georgia State | ",
 "Upcoming Oct 30, 7:00 PM Men's · Marshall at South Carolina | ",
 "Upcoming Nov 3, 7:15 PM Men's · Marshall vs Old Dominion | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 22, 5:00 PM Marshall vs Glenville State (10 Innings) | ",
 "Upcoming Oct 30, 5:00 PM Marshall vs West Virginia State (10 Innings) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 19 Women's · Marshall vs Green & White Meet | Completed",
 "Final Oct 1 Women's · Marshall at Fairmont State | W, 181-65",
 "Final Oct 2 Women's · Marshall at West Virginia | L, 61-214",
 "Upcoming Oct 30, 12:00 PM Women's · Marshall vs James Madison | ",
 "Upcoming Nov 6, 2:00 PM Women's · Marshall vs Ohio | ",
 "Upcoming Nov 20 Women's · Marshall at TYR 85' Liberty Invite | ",
 "Upcoming Dec 2 Women's · Marshall at Toyota US Open | ",
 "Upcoming Dec 16 Women's · Marshall at FIU | ",
 "Upcoming Jan 15, 11:00 AM Women's · Marshall vs Cumberland | ",
 "Upcoming Jan 22, 5:00 PM Women's · Marshall at Bowling Green | ",
 "Upcoming Jan 23, 11:00 AM Women's · Marshall at Toledo | ",
 "Upcoming Jan 29, 5:00 PM Women's · Marshall at Duquesne | ",
 "Upcoming Feb 17 Women's · Marshall at American Conference Championship | ",
 "Upcoming Mar 11 Women's · Marshall at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Marshall at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Marshall at Thunder in the Mountains | Completed",
 "Final Sep 19 Marshall at ITA All-American Championships | Completed",
 "Final Oct 2 Marshall at West Virginia Tournament | Completed",
 "Final Oct 9 Marshall at Virginia Tournament | Completed",
 "Final Oct 15 Marshall at ITA Atlantic Regional | Completed",
 "Upcoming Oct 30 Marshall at Elon Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 5 Marshall at Marshall Alumni Opener | ",
 "Upcoming Jan 16 Marshall at Marshall Ohio River Classic | ",
 "Upcoming Feb 12 Marshall at Marshall Jewel City Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Marshall vs Niagara | W, 3-0",
 "Final Aug 28 Marshall vs Bucknell | W, 3-0",
 "Final Aug 29 Marshall vs Ohio | L, 0-3",
 "Final Sep 3 Marshall vs Akron | W, 3-0",
 "Final Sep 4 Marshall at IU Indy | W, 3-1",
 "Final Sep 5 Marshall vs Youngstown State | W, 3-2",
 "Final Sep 11 Marshall at Duke | L, 1-3",
 "Final Sep 12 Marshall vs Belmont | L, 1-3",
 "Final Sep 15 Marshall at EKU | L, 0-3",
 "Final Sep 18 Marshall vs Morehead State | W, 3-0",
 "Final Sep 19 Marshall at Morehead State | W, 3-0",
 "Final Sep 24 Marshall vs Georgia State | W, 3-2",
 "Final Sep 25 Marshall vs Georgia State | W, 3-2",
 "Final Oct 2 Marshall at ULM | W, 3-1",
 "Final Oct 3 Marshall at ULM | L, 2-3",
 "Final Oct 8 Marshall vs James Madison | L, 2-3",
 "Final Oct 9 Marshall vs James Madison | W, 3-1",
 "Final Oct 17 Marshall at Coastal Carolina | L, 2-3",
 "Final Oct 18 Marshall at Coastal Carolina | W, 3-0",
 "Upcoming Oct 23, 6:00 PM Marshall at Old Dominion | ",
 "Upcoming Oct 24, 2:00 PM Marshall at Old Dominion | ",
 "Upcoming Oct 29, 6:00 PM Marshall vs Georgia Southern | ",
 "Upcoming Oct 30, 6:00 PM Marshall vs Georgia Southern | ",
 "Upcoming Nov 5, 6:00 PM Marshall at App State | ",
 "Upcoming Nov 6, 6:00 PM Marshall at App State | ",
 "Upcoming Nov 12, 7:30 PM Marshall vs Southern Miss | ",
 "Upcoming Nov 13, 6:00 PM Marshall vs Southern Miss | ",
 "Upcoming Nov 19 Marshall at Sun Belt Conference Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
// An unpublished season's empty template ("@season STUNT Schedule") is a
// valid empty schedule, not a failed source (502 on the first preview).
{
  const schoolEntry=schools.find(s=>s.id==='marshall'),url=Object.entries(marshallSchool.scheduleUrls).find(([key])=>key.endsWith('|STUNT'))[1];
  const raw='<html><head><title>@season STUNT Schedule - Athletics</title></head><body></body></html>';
  const events=worker.marshallHandlers.parseSchedule(raw,schoolEntry,'STUNT',url,now);
  assert.equal(events.length,0);
  assert.equal(worker.marshallHandlers.isEmptySchedule(events),true);
}
console.log("Marshall module checks passed");
