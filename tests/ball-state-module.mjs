import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ballStateSchool} from '../src/schools/ball-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ball-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ballStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ball-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ballstatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['ball-state'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',ballStateSchool.scheduleUrls],['roster',ballStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ball-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ballstatesports.com',`${key} must stay on ballstatesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ballstatesports.com/sports/baseball/schedule"],"roster":["https://ballstatesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ballstatesports.com/sports/mens-basketball/schedule","https://ballstatesports.com/sports/womens-basketball/schedule"],"roster":["https://ballstatesports.com/sports/mens-basketball/roster","https://ballstatesports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ballstatesports.com/sports/womens-cross-country/schedule"],"roster":["https://ballstatesports.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://ballstatesports.com/sports/field-hockey/schedule"],"roster":["https://ballstatesports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://ballstatesports.com/sports/football/schedule"],"roster":["https://ballstatesports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ballstatesports.com/sports/womens-golf/schedule","https://ballstatesports.com/sports/mens-golf/schedule"],"roster":["https://ballstatesports.com/sports/womens-golf/roster","https://ballstatesports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://ballstatesports.com/sports/womens-gymnastics/schedule"],"roster":["https://ballstatesports.com/sports/womens-gymnastics/roster"],"combined":false},"Soccer":{"schedule":["https://ballstatesports.com/sports/womens-soccer/schedule"],"roster":["https://ballstatesports.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://ballstatesports.com/sports/softball/schedule"],"roster":["https://ballstatesports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ballstatesports.com/sports/womens-swimming-and-diving/schedule","https://ballstatesports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://ballstatesports.com/sports/womens-swimming-and-diving/roster","https://ballstatesports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://ballstatesports.com/sports/womens-tennis/schedule","https://ballstatesports.com/sports/mens-tennis/schedule"],"roster":["https://ballstatesports.com/sports/womens-tennis/roster","https://ballstatesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ballstatesports.com/sports/womens-track-and-field/schedule"],"roster":["https://ballstatesports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ballstatesports.com/sports/womens-volleyball/schedule"],"roster":["https://ballstatesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'ball-state|"+sport+"':"),`${sport} routes must live in the Ball State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ballstatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ballStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=ball-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Ball State at Purdue (Exhibition) | L, 55-87",
 "Upcoming Oct 28, 7:00 PM Men's · Ball State vs Purdue Fort Wayne (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Ball State at Georgia Southern | ",
 "Upcoming Nov 6, 7:00 PM Men's · Ball State vs Indiana State | ",
 "Upcoming Nov 9, 7:00 PM Men's · Ball State vs Brescia (Ky.) | ",
 "Upcoming Nov 13, 9:00 PM Men's · Ball State at SMU | ",
 "Upcoming Nov 17, 7:00 PM Men's · Ball State at Florida State | ",
 "Upcoming Nov 23, 7:00 PM Men's · Ball State vs Spalding (Ky.) | ",
 "Upcoming Nov 28, 2:00 PM Men's · Ball State at Southern Indiana | ",
 "Upcoming Dec 2, 7:00 PM Men's · Ball State at Akron | ",
 "Upcoming Dec 5, 1:00 PM Men's · Ball State vs Eastern Michigan | ",
 "Upcoming Dec 8, 7:00 PM Men's · Ball State vs Evansville | ",
 "Upcoming Dec 16, 7:00 PM Men's · Ball State vs Ohio | ",
 "Upcoming Dec 19, 1:00 PM Men's · Ball State at Miami | ",
 "Upcoming Dec 29, 7:00 PM Men's · Ball State vs East-West | ",
 "Upcoming Jan 2, 2:00 PM Men's · Ball State at UMass | ",
 "Upcoming Jan 5, 7:00 PM Men's · Ball State vs Kent State | ",
 "Upcoming Jan 9, 1:30 PM Men's · Ball State vs Central Michigan | ",
 "Upcoming Jan 12, 7:00 PM Men's · Ball State at Bowling Green | ",
 "Upcoming Jan 16, 2:30 PM Men's · Ball State at Western Michigan | ",
 "Upcoming Jan 19, 7:00 PM Men's · Ball State vs Toledo | ",
 "Upcoming Jan 23, 3:30 PM Men's · Ball State at Eastern Michigan | ",
 "Upcoming Jan 26, 7:00 PM Men's · Ball State at Kent State | ",
 "Upcoming Jan 30, 1:00 PM Men's · Ball State vs Buffalo | ",
 "Upcoming Feb 2, 7:00 PM Men's · Ball State vs Bowling Green | ",
 "Upcoming Feb 6, 1:00 PM Men's · Ball State at MAC-SBC Challenge | ",
 "Upcoming Feb 9, 7:00 PM Men's · Ball State at Toledo | ",
 "Upcoming Feb 13, 1:30 PM Men's · Ball State vs Miami | ",
 "Upcoming Feb 16, 7:00 PM Men's · Ball State vs UMass | ",
 "Upcoming Feb 20, 4:00 PM Men's · Ball State at Ohio | ",
 "Upcoming Feb 23, 7:00 PM Men's · Ball State vs Western Michigan | ",
 "Upcoming Feb 27, 1:30 PM Men's · Ball State vs Akron | ",
 "Upcoming Mar 2, 6:30 PM Men's · Ball State at Buffalo | ",
 "Upcoming Mar 5, 7:00 PM Men's · Ball State at Central Michigan | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Ball State vs Arkansas State | ",
 "Upcoming Nov 7, 1:00 PM Women's · Ball State vs High Point | ",
 "Upcoming Nov 12, 8:00 PM Women's · Ball State vs Louisville | ",
 "Upcoming Nov 18, 6:30 PM Women's · Ball State vs Illinois | ",
 "Upcoming Nov 21, 2:00 PM Women's · Ball State at UIC | ",
 "Upcoming Nov 24 Women's · Ball State at Temple | ",
 "Upcoming Nov 29, 1:00 PM Women's · Ball State vs Robert Morris | ",
 "Upcoming Dec 1, 6:30 PM Women's · Ball State at Maryland | ",
 "Upcoming Dec 4, 6:30 PM Women's · Ball State at Cincinnati | ",
 "Upcoming Dec 9, 11:00 AM Women's · Ball State vs IU Indy | ",
 "Upcoming Dec 18 Women's · Ball State at Maui Classic (Oregon State, Idaho State, San Francisco) | ",
 "Upcoming Dec 30, 6:30 PM Women's · Ball State vs Fresno State | ",
 "Upcoming Jan 2, 1:00 PM Women's · Ball State vs Central Michigan | ",
 "Upcoming Jan 6, 6:00 PM Women's · Ball State at Akron | ",
 "Upcoming Jan 9, 11:00 AM Women's · Ball State vs Miami University (OH) | ",
 "Upcoming Jan 13, 7:00 PM Women's · Ball State at Kent State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Ball State vs Bowling Green | ",
 "Upcoming Jan 20, 11:00 AM Women's · Ball State at Massachusetts | ",
 "Upcoming Jan 23 Women's · Ball State at Western Michigan | ",
 "Upcoming Jan 27, 6:30 PM Women's · Ball State vs Eastern Michigan | ",
 "Upcoming Jan 31, 4:00 PM Women's · Ball State at Miami University (OH) | ",
 "Upcoming Feb 3, 6:30 PM Women's · Ball State vs Toledo | ",
 "Upcoming Feb 6 Women's · Ball State at SBC Challenge | ",
 "Upcoming Feb 10 Women's · Ball State at Ohio | ",
 "Upcoming Feb 13, 11:00 AM Women's · Ball State vs University at Buffalo | ",
 "Upcoming Feb 17, 6:30 PM Women's · Ball State vs Akron | ",
 "Upcoming Feb 20 Women's · Ball State at Bowling Green | ",
 "Upcoming Feb 24 Women's · Ball State at Central Michigan | ",
 "Upcoming Feb 27, 11:00 AM Women's · Ball State vs Massachusetts | ",
 "Upcoming Mar 3, 6:30 PM Women's · Ball State vs Kent State | ",
 "Upcoming Mar 6 Women's · Ball State at Toledo | ",
 "Upcoming Mar 10 Women's · Ball State at Mid-American Conference Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Ball State at Sam Bell Invitational | 3rd of 3",
 "Final Sep 18 Ball State at George Dales Invite | 6th of 13 Teams, 161 Points",
 "Final Oct 2 Ball State at Joe Piane Invitational | 13th of 24 Teams, 347 Points",
 "Final Oct 16 Ball State at Under Armour Pre-Nationals Invitational | Completed",
 "Upcoming Oct 30 Ball State at MAC Championship | ",
 "Upcoming Nov 13 Ball State at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Ball State at NCAA XC National Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Ball State at Bucknell | L, 0-1",
 "Final Aug 29 Ball State at Sacred Heart | W, 3-2",
 "Final Sep 5 Ball State vs Lehigh | W, 5-4",
 "Final Sep 6 Ball State at Iowa | L, 0-8",
 "Final Sep 13 Ball State vs Indiana | L, 1-7",
 "Final Sep 18 Ball State vs James Madison | L, 1-3",
 "Final Sep 20 Ball State vs Michigan State | L, 1-4",
 "Final Sep 25 Ball State at Central Michigan | L, 0-1",
 "Final Sep 27 Ball State vs Longwood | W, 3-1",
 "Final Oct 2 Ball State at Appalachian State | L, 0-2",
 "Final Oct 4 Ball State at Davidson College | L, 1-3",
 "Final Oct 9 Ball State at Kent State | L, 1-4",
 "Final Oct 16 Ball State vs Massachusetts | L, 1-7",
 "Final Oct 18 Ball State vs Miami University (OH) | L, 0-10",
 "Upcoming Oct 23, 12:00 PM Ball State vs Ohio | ",
 "Upcoming Oct 25, 12:00 PM Ball State vs Queens University of Charlotte | ",
 "Upcoming Oct 29, 3:00 PM Ball State at Bellarmine | ",
 "Upcoming Oct 30, 3:00 PM Ball State at Saint Louis | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Ball State at Ohio State | L, 3-56",
 "Final Sep 12 Ball State vs Stony Brook | W, 41-17",
 "Final Sep 19 Ball State at Liberty | L, 15-51",
 "Final Sep 26 Ball State at Kent State | L, 13-26",
 "Final Oct 3 Ball State vs Toledo | L, 24-39",
 "Final Oct 10 Ball State at Northwestern | L, 14-45",
 "Final Oct 17 Ball State at Bowling Green | W, 32-31",
 "Upcoming Oct 24, 3:30 PM Ball State vs Sacramento State | ",
 "Upcoming Nov 4 Ball State at Massachusetts | ",
 "Upcoming Nov 11 Ball State vs Buffalo | ",
 "Upcoming Nov 17 Ball State at Ohio | ",
 "Upcoming Nov 28, 12:00 PM Ball State vs Central Michigan | ",
 "Upcoming Dec 5, 12:00 PM Ball State at Mid-American Conference | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Ball State at Boilermaker Classic | 14th of 16",
 "Final Sep 14 Women's · Ball State at Brittany Kelly Classic | 1st of 14",
 "Final Sep 21 Women's · Ball State at Golfweek Red Sky Classic | 14th of 20",
 "Final Sep 26 Women's · Ball State at Fighting Irish Classic | 7th of 14",
 "Final Oct 5 Women's · Ball State at Golfweek Put Me In Coach Invitational (Individuals Only) | No team score (individuals only)",
 "Final Oct 18 Women's · Ball State at Diamante Intercollegiate | 9th of 20"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Ball State at Island Resort Intercollegiate | 6th of 12",
 "Final Sep 14 Men's · Ball State at RedHawk Intercollegiate | 4th of 14",
 "Final Sep 26 Men's · Ball State at Earl Yestingsmeier Invitational - Presented by Devoe Chevorlet | 2nd of 16",
 "Final Oct 5 Men's · Ball State at Golfweek Put Me In Coach Invitational (Individuals Only) | No team score (individuals only)",
 "Final Oct 12 Men's · Ball State at Purdue Fall Invitational | 3rd of 13",
 "Final Oct 19 Men's · Ball State at Flyer Invitational | T3rd of 13"
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 20 Ball State at Butler | T, 1-1",
 "Final Aug 23 Ball State at Western Kentucky | L, 0-2",
 "Final Aug 27 Ball State at Purdue | L, 0-5",
 "Final Aug 30 Ball State vs Cincinnati | W, 1-0",
 "Final Sep 6 Ball State vs Eastern Illinois | W, 1-0",
 "Final Sep 13 Ball State at Dayton | L, 0-1",
 "Final Sep 17 Ball State vs UMass | L, 0-1",
 "Final Sep 20 Ball State at Western Michigan | T, 1-1",
 "Final Sep 27 Ball State at Miami | T, 1-1",
 "Final Oct 1 Ball State vs Eastern Michigan | L, 0-1",
 "Final Oct 4 Ball State at Akron | W, 3-0",
 "Final Oct 10 Ball State vs Bowling Green | W, 1-0",
 "Final Oct 15 Ball State at Kent State | T, 0-0",
 "Final Oct 18 Ball State at Toledo | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Ball State vs Ohio | ",
 "Upcoming Oct 29, 7:00 PM Ball State at Central Michigan | ",
 "Upcoming Nov 1, 1:00 PM Ball State vs Buffalo | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Today Oct 22, 3:00 PM Women's · Ball State at IU Indy | ",
 "Upcoming Oct 24, 12:00 PM Women's · Ball State vs Indiana Intercollegiates | ",
 "Upcoming Oct 30, 5:30 PM Women's · Ball State vs Miami University (OH) | ",
 "Upcoming Nov 7, 12:00 PM Women's · Ball State vs UIC | ",
 "Upcoming Dec 3 Women's · Ball State at Akron Zippy Invite | ",
 "Upcoming Jan 9, 1:00 PM Women's · Ball State at Bellarmine | ",
 "Upcoming Jan 15 Women's · Ball State vs Akron | ",
 "Upcoming Jan 23, 1:00 PM Women's · Ball State at Bowling Green | ",
 "Upcoming Jan 30, 2:00 PM Women's · Ball State vs Southern Illinois | ",
 "Upcoming Jan 30, 2:00 PM Women's · Ball State at Indiana State | ",
 "Upcoming Feb 24 Women's · Ball State at Mid-American Conference Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Today Oct 22, 3:00 PM Men's · Ball State at IU Indy | ",
 "Upcoming Oct 24, 12:00 PM Men's · Ball State vs Indiana Intercollegiates | ",
 "Upcoming Oct 30, 5:30 PM Men's · Ball State vs Miami University (OH) | ",
 "Upcoming Nov 7, 12:00 PM Men's · Ball State vs UIC | ",
 "Upcoming Dec 3 Men's · Ball State at Akron Zippy Invite | ",
 "Upcoming Jan 9, 1:00 PM Men's · Ball State at Bellarmine | ",
 "Upcoming Jan 22, 6:00 PM Men's · Ball State at Valparaiso | ",
 "Upcoming Jan 30, 2:00 PM Men's · Ball State vs Southern Illinois | ",
 "Upcoming Jan 31, 12:00 PM Men's · Ball State at Butler Invitational | ",
 "Upcoming Feb 17 Men's · Ball State at Missouri Valley Conference Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Ball State at Kentucky Invite | Completed",
 "Final Oct 2 Women's · Ball State at Indiana Invite | Completed",
 "Upcoming Oct 23 Women's · Ball State at MAC Individual Championship (Western Michigan) | ",
 "Upcoming Nov 6 Women's · Ball State at Michigan State Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Ball State at Western Michigan Invite | Completed",
 "Final Oct 8 Men's · Ball State at ITA Ohio Valley Regional | Completed",
 "Upcoming Oct 23 Men's · Ball State at MAC Indoor | ",
 "Upcoming Nov 6 Men's · Ball State at Ball State Fall Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Ball State at Notre Dame | W, 3-2",
 "Final Aug 29 Ball State vs Xavier | W, 3-1",
 "Final Sep 3 Ball State vs Western Kentucky | W, 3-1",
 "Final Sep 4 Ball State vs Dayton | W, 3-0",
 "Final Sep 5 Ball State at Wright State | W, 3-0",
 "Final Sep 11 Ball State vs Stetson | W, 3-0",
 "Final Sep 11 Ball State at Campbell | W, 3-0",
 "Final Sep 12 Ball State vs Furman | W, 3-1",
 "Final Sep 15 Ball State at Cincinnati | L, 0-3",
 "Final Sep 17 Ball State vs Northwestern | L, 1-3",
 "Final Sep 19 Ball State vs IU Indy | W, 3-1",
 "Final Sep 25 Ball State vs Western Michigan | W, 3-0",
 "Final Sep 26 Ball State vs Western Michigan | W, 3-0",
 "Final Oct 2 Ball State at Toledo | L, 1-3",
 "Final Oct 3 Ball State at Toledo | L, 1-3",
 "Final Oct 6 Ball State vs Miami | L, 1-3",
 "Final Oct 10 Ball State vs Central Michigan | W, 3-0",
 "Final Oct 16 Ball State at Ohio | W, 3-0",
 "Final Oct 17 Ball State at Ohio | W, 3-0",
 "Final Oct 20 Ball State at Miami | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Ball State vs Akron | ",
 "Upcoming Oct 30, 6:00 PM Ball State vs Bowling Green | ",
 "Upcoming Oct 31, 3:00 PM Ball State vs Bowling Green | ",
 "Upcoming Nov 6, 6:00 PM Ball State at Buffalo | ",
 "Upcoming Nov 7, 4:00 PM Ball State at Buffalo | ",
 "Upcoming Nov 13, 6:00 PM Ball State vs Kent State | ",
 "Upcoming Nov 14, 4:00 PM Ball State at Eastern Michigan | ",
 "Upcoming Nov 20, 4:00 PM Ball State at MAC Quarterfinal - Match 1 | ",
 "Upcoming Nov 20, 7:00 PM Ball State at MAC Quarterfinal - Match 2 | ",
 "Upcoming Nov 21, 4:00 PM Ball State at MAC Semifinal - Match 1 | ",
 "Upcoming Nov 21, 7:00 PM Ball State at MAC Semifinal - Match 2 | ",
 "Upcoming Nov 22, 4:00 PM Ball State at MAC Championship Match | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Ball State module checks passed");
