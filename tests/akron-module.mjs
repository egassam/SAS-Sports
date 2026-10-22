import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {akronSchool} from '../src/schools/akron.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='akron');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,akronHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/akron-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gozips.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['akron'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',akronSchool.scheduleUrls],['roster',akronSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('akron|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gozips.com',`${key} must stay on gozips.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gozips.com/sports/baseball/schedule"],"roster":["https://gozips.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gozips.com/sports/mens-basketball/schedule","https://gozips.com/sports/womens-basketball/schedule"],"roster":["https://gozips.com/sports/mens-basketball/roster","https://gozips.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gozips.com/sports/cross-country/schedule"],"roster":["https://gozips.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gozips.com/sports/football/schedule"],"roster":["https://gozips.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gozips.com/sports/womens-golf/schedule"],"roster":["https://gozips.com/sports/womens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://gozips.com/sports/womens-lacrosse/schedule"],"roster":["https://gozips.com/sports/womens-lacrosse/roster"],"combined":false},"Rifle":{"schedule":["https://gozips.com/sports/rifle/schedule"],"roster":["https://gozips.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://gozips.com/sports/womens-soccer/schedule","https://gozips.com/sports/mens-soccer/schedule"],"roster":["https://gozips.com/sports/womens-soccer/roster","https://gozips.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gozips.com/sports/softball/schedule"],"roster":["https://gozips.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gozips.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://gozips.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gozips.com/sports/track-and-field/schedule"],"roster":["https://gozips.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gozips.com/sports/womens-volleyball/schedule"],"roster":["https://gozips.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'akron|"+sport+"':"),`${sport} routes must live in the Akron module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gozips.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.akronHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=akron)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 7:00 PM Men's · Akron vs Youngstown State (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · Akron at Louisiana | ",
 "Upcoming Nov 9, 7:00 PM Men's · Akron vs Muskingum | ",
 "Upcoming Nov 14, 12:00 PM Men's · Akron vs Tulane | ",
 "Upcoming Nov 17, 7:00 PM Men's · Akron at Bucknell | ",
 "Upcoming Nov 20, 6:00 PM Men's · Akron vs West Virginia Tech | ",
 "Upcoming Nov 23, 1:30 PM Men's · Akron vs Wright State | ",
 "Upcoming Nov 24, 12:30 PM Men's · Akron vs Belmont | ",
 "Upcoming Nov 25, 3:00 PM Men's · Akron vs Appalachian State | ",
 "Upcoming Dec 2, 7:00 PM Men's · Akron vs Ball State | ",
 "Upcoming Dec 13, 2:00 PM Men's · Akron vs Frostburg State | ",
 "Upcoming Dec 16, 6:30 PM Men's · Akron at Buffalo | ",
 "Upcoming Dec 19, 2:00 PM Men's · Akron vs Bowling Green | ",
 "Upcoming Dec 29, 7:00 PM Men's · Akron at UMass | ",
 "Upcoming Jan 2, 2:00 PM Men's · Akron vs Western Michigan | ",
 "Upcoming Jan 5, 7:00 PM Men's · Akron at Ohio | ",
 "Upcoming Jan 8, 7:00 PM Men's · Akron vs Miami | ",
 "Upcoming Jan 12, 6:30 PM Men's · Akron at Eastern Michigan | ",
 "Upcoming Jan 15, 8:00 PM Men's · Akron at Toledo | ",
 "Upcoming Jan 19, 7:00 PM Men's · Akron vs Central Michigan | ",
 "Upcoming Jan 22, 8:00 PM Men's · Akron at Miami | ",
 "Upcoming Jan 26, 7:00 PM Men's · Akron vs Ohio | ",
 "Upcoming Jan 30, 2:00 PM Men's · Akron vs UMass | ",
 "Upcoming Feb 2, 7:00 PM Men's · Akron at Western Michigan | ",
 "Upcoming Feb 6 Men's · Akron vs MAC-SBC Challenge | ",
 "Upcoming Feb 9, 7:00 PM Men's · Akron vs Buffalo | ",
 "Upcoming Feb 13 Men's · Akron at Kent State | ",
 "Upcoming Feb 16, 7:00 PM Men's · Akron at Bowling Green | ",
 "Upcoming Feb 20 Men's · Akron vs Eastern Michigan | ",
 "Upcoming Feb 23, 7:00 PM Men's · Akron vs Toledo | ",
 "Upcoming Feb 27 Men's · Akron at Ball State | ",
 "Upcoming Mar 2, 7:00 PM Men's · Akron at Central Michigan | ",
 "Upcoming Mar 5 Men's · Akron vs Kent State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Akron vs South Alabama | ",
 "Upcoming Nov 5, 7:00 PM Women's · Akron at George Mason | ",
 "Upcoming Nov 9, 6:30 PM Women's · Akron at Xavier | ",
 "Upcoming Nov 14, 5:00 PM Women's · Akron at Mercyhurst | ",
 "Upcoming Nov 17, 10:30 AM Women's · Akron at West Virginia | ",
 "Upcoming Nov 20, 11:00 AM Women's · Akron vs Robert Morris | ",
 "Upcoming Nov 24, 6:30 PM Women's · Akron at Youngstown State | ",
 "Upcoming Nov 27, 12:00 PM Women's · Akron at Louisville | ",
 "Upcoming Dec 2, 6:30 PM Women's · Akron at Ohio State | ",
 "Upcoming Dec 6, 12:00 PM Women's · Akron vs Yale | ",
 "Upcoming Dec 14, 6:00 PM Women's · Akron vs Cleveland State | ",
 "Upcoming Dec 17, 6:00 PM Women's · Akron vs Duquesne | ",
 "Upcoming Dec 21, 11:00 AM Women's · Akron vs Lake Erie | ",
 "Upcoming Jan 2, 4:00 PM Women's · Akron vs UMass | ",
 "Upcoming Jan 6, 6:00 PM Women's · Akron vs Ball State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Akron at Toledo | ",
 "Upcoming Jan 13, 6:00 PM Women's · Akron at Buffalo | ",
 "Upcoming Jan 16, 12:00 PM Women's · Akron vs Ohio | ",
 "Upcoming Jan 20, 6:00 PM Women's · Akron vs Central Michigan | ",
 "Upcoming Jan 23, 1:00 PM Women's · Akron at Eastern Michigan | ",
 "Upcoming Jan 27, 6:00 PM Women's · Akron at UMass | ",
 "Upcoming Jan 30, 4:00 PM Women's · Akron vs Kent State | ",
 "Upcoming Feb 3, 7:00 PM Women's · Akron at Western Michigan | ",
 "Upcoming Feb 6 Women's · Akron at MAC-SBC Challenge | ",
 "Upcoming Feb 10, 6:00 PM Women's · Akron vs Bowling Green | ",
 "Upcoming Feb 13, 1:00 PM Women's · Akron at Central Michigan | ",
 "Upcoming Feb 17, 6:30 PM Women's · Akron at Ball State | ",
 "Upcoming Feb 20, 4:00 PM Women's · Akron vs Miami | ",
 "Upcoming Feb 24, 6:00 PM Women's · Akron vs Toledo | ",
 "Upcoming Feb 27, 3:30 PM Women's · Akron at Kent State | ",
 "Upcoming Mar 3, 7:00 PM Women's · Akron at Ohio | ",
 "Upcoming Mar 6, 12:00 PM Women's · Akron vs Western Michigan | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Akron at 56th Annual Tommy Evans Invitational | Women's team: 1st / Men's team: 2nd",
 "Final Sep 18 Akron at George Dales Invitational | Women's team: 1st / Men's team: 4th",
 "Final Oct 2 Akron at Joe Piane Notre Dame Invitational | Women's team: 9th / Men's team: 12th",
 "Final Oct 16 Akron at Falcon Invitational | Men's team: 5th",
 "Upcoming Oct 30, 11:00 AM Akron at Mid-American Conference Championships | ",
 "Upcoming Nov 13 Akron at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Akron at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Akron at Wake Forest | L, 16-38",
 "Final Sep 12 Akron vs Robert Morris | W, 45-10",
 "Final Sep 19 Akron at Minnesota | L, 7-41",
 "Final Sep 26 Akron vs UNLV | L, 10-38",
 "Final Oct 3 Akron at Central Michigan | L, 17-41",
 "Final Oct 10 Akron vs Eastern Michigan | L, 23-25",
 "Final Oct 17 Akron at Miami | L, 14-34",
 "Upcoming Oct 24, 1:00 PM Akron at Kent State | ",
 "Upcoming Nov 3, 7:00 PM Akron vs Ohio | ",
 "Upcoming Nov 10, 7:00 PM Akron vs Western Michigan | ",
 "Upcoming Nov 18 Akron at UMass | ",
 "Upcoming Nov 27, 12:00 PM Akron vs Buffalo | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Akron at Roseann Schwartz Invitational | 2nd",
 "Final Sep 7 Akron at Nittany Lion Invitational | 13th",
 "Final Sep 14 Akron at Rocket Classic | 3rd",
 "Final Sep 21 Akron at Bettie Lou Evans Invitational | 12th",
 "Final Oct 5 Akron at Butler Fall Invite | T4th",
 "Upcoming Feb 1 Akron at Battle at Bentwater | ",
 "Upcoming Feb 19 Akron at Rio Verde Invitational | ",
 "Upcoming Mar 22 Akron at Henssler Financial Invitational | ",
 "Upcoming Mar 29 Akron at Golfweek Conference Challenge | ",
 "Upcoming Apr 5 Akron at Colonel Classic | ",
 "Upcoming Apr 17 Akron at Therese Hession Buckeye Invite | ",
 "Upcoming Apr 25 Akron at Mid-American Conference Women's Golf Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 11 Akron at Zippy Open | Completed",
 "Final Sep 18 Akron at Zippy Open | Completed",
 "Final Sep 26 Akron at Nebraska | L, 4673-4743",
 "Final Oct 3 Akron vs Navy | L, 4674-4732",
 "Final Oct 17 Akron at Kentucky | L, 4693-4718",
 "Upcoming Nov 7 Akron at Alaska Fairbanks | ",
 "Upcoming Nov 7 Akron at UAB | ",
 "Upcoming Nov 8 Akron at UAB | ",
 "Upcoming Nov 14 Akron at Memphis | ",
 "Upcoming Nov 16 Akron at Morehead | ",
 "Upcoming Jan 16 Akron at Army | ",
 "Upcoming Jan 16 Akron at Jacksonville State | ",
 "Upcoming Jan 17 Akron at Jacksonville State | ",
 "Upcoming Jan 23 Akron at Army | ",
 "Upcoming Jan 30 Akron at WVU | ",
 "Upcoming Jan 31 Akron at OSU | ",
 "Upcoming Feb 6 Akron at Mount Aloysius | ",
 "Upcoming Feb 20 Akron at Mount Aloysius | ",
 "Upcoming Feb 27 Akron at GARC Championships - Smallbore | ",
 "Upcoming Feb 28 Akron at GARC Championships - Air Rifle | ",
 "Upcoming Mar 12 Akron at NCAA Championships - Smallbore | ",
 "Upcoming Mar 13 Akron at NCAA Championships - Air Rifle | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Akron vs Oakland | W, 3-0",
 "Final Aug 20 Women's · Akron at Southern Indiana | W, 2-1",
 "Final Aug 27 Women's · Akron at Duquesne | L, 0-2",
 "Final Aug 30 Women's · Akron at Louisville | L, 0-5",
 "Final Sep 3 Women's · Akron vs Cleveland State | W, 2-0",
 "Final Sep 6 Women's · Akron at Robert Morris | L, 0-1",
 "Final Sep 10 Women's · Akron at Mercyhurst | W, 4-0",
 "Final Sep 17 Women's · Akron at Miami | L, 1-2",
 "Final Sep 20 Women's · Akron vs Bowling Green | T, 1-1",
 "Final Sep 27 Women's · Akron vs Ohio | W, 1-0",
 "Final Oct 1 Women's · Akron at Toledo | W, 1-0",
 "Final Oct 4 Women's · Akron vs Ball State | L, 0-3",
 "Final Oct 11 Women's · Akron at UMass | T, 1-1",
 "Final Oct 15 Women's · Akron at Central Michigan | W, 1-0",
 "Final Oct 18 Women's · Akron vs Buffalo | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · Akron at Kent State | ",
 "Upcoming Oct 29, 6:30 PM Women's · Akron vs Eastern Michigan | ",
 "Upcoming Nov 1, 3:00 PM Women's · Akron at Western Michigan | ",
 "Upcoming Nov 7 Women's · Akron at Mid-American Conference Tournament Quarterfinals | ",
 "Upcoming Nov 10 Women's · Akron at Mid-American Conference Tournament Semifnals | ",
 "Upcoming Nov 13 Women's · Akron at Mid-American Conference Tournament Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Akron vs Dayton | W, 3-0",
 "Final Aug 24 Men's · Akron vs Army | T, 0-0",
 "Final Aug 28 Men's · Akron vs Wake Forest | W, 1-0",
 "Final Sep 8 Men's · Akron vs Cornell | W, 3-2",
 "Final Sep 12 Men's · Akron at Saint Louis | W, 2-1",
 "Final Sep 18 Men's · Akron vs Butler | T, 0-0",
 "Final Sep 22 Men's · Akron vs Robert Morris | W, 5-2",
 "Final Sep 25 Men's · Akron vs Georgetown | L, 1-3",
 "Final Oct 2 Men's · Akron at DePaul | W, 2-0",
 "Final Oct 6 Men's · Akron vs Syracuse | W, 2-1",
 "Final Oct 11 Men's · Akron vs Creighton | T, 1-1",
 "Final Oct 16 Men's · Akron at Providence | T, 1-1",
 "Final Oct 20 Men's · Akron at Cleveland State | W, 3-2",
 "Upcoming Oct 24, 6:00 PM Men's · Akron vs Xavier | ",
 "Upcoming Oct 31, 1:00 PM Men's · Akron at Villanova | ",
 "Upcoming Nov 6, 7:00 PM Men's · Akron at Marquette | ",
 "Upcoming Nov 12 Men's · Akron at Big East Tournament Semifinals | ",
 "Upcoming Nov 15 Men's · Akron at Big East Tournament Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Akron at Bowling Green | W, 200.5-179.5",
 "Final Oct 16 Women's · Akron at Akron Zips Classic | Completed",
 "Upcoming Nov 19 Women's · Akron at Magnus Cup Invitational | ",
 "Upcoming Dec 3 Women's · Akron at Zippy Invitational | ",
 "Upcoming Jan 8 Women's · Akron at Buffalo Diving Invite | ",
 "Upcoming Jan 15, 1:00 PM Women's · Akron at Ball State | ",
 "Upcoming Jan 22 Women's · Akron at Tim Welsh Classic | ",
 "Upcoming Jan 29 Women's · Akron vs Buffalo | ",
 "Upcoming Feb 12 Women's · Akron at OSU Winter Invite | ",
 "Upcoming Feb 24 Women's · Akron at MAC Swimming & Diving Championships | ",
 "Upcoming Mar 8 Women's · Akron at NCAA Diving Zones | ",
 "Upcoming Mar 11 Women's · Akron at CSCAA National Invitational Champs | ",
 "Upcoming Mar 17 Women's · Akron at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Akron at East Tennessee | W, 3-2",
 "Final Aug 29 Akron vs Liberty | L, 1-3",
 "Final Aug 29 Akron vs Auburn | L, 0-3",
 "Final Sep 3 Akron vs Marshall | L, 0-3",
 "Final Sep 4 Akron at Butler | L, 0-3",
 "Final Sep 5 Akron at IU Indy | L, 2-3",
 "Final Sep 10 Akron vs Cleveland State | W, 3-1",
 "Final Sep 11 Akron vs Coppin State | L, 2-3",
 "Final Sep 12 Akron vs Valparaiso | W, 3-1",
 "Final Sep 17 Akron vs Youngstown State | W, 3-1",
 "Final Sep 18 Akron at Cleveland State | W, 3-1",
 "Final Sep 20 Akron at Xavier | L, 1-3",
 "Final Sep 23 Akron at Kent State | W, 3-0",
 "Final Sep 25 Akron vs Toledo | L, 0-3",
 "Final Oct 2 Akron at Ohio | L, 1-3",
 "Final Oct 3 Akron at Ohio | L, 1-3",
 "Final Oct 8 Akron vs Western Michigan | W, 3-2",
 "Final Oct 9 Akron vs Western Michigan | L, 1-3",
 "Final Oct 13 Akron vs Buffalo | W, 3-1",
 "Final Oct 17 Akron vs Bowling Green | L, 1-3",
 "Upcoming Oct 23, 6:00 PM Akron at Ball State | ",
 "Upcoming Oct 24, 4:00 PM Akron at Miami (OH) | ",
 "Upcoming Oct 30, 6:00 PM Akron at Eastern Michigan | ",
 "Upcoming Oct 31, 4:00 PM Akron at Eastern Michigan | ",
 "Upcoming Nov 6, 6:00 PM Akron vs Central Michigan | ",
 "Upcoming Nov 7, 4:00 PM Akron vs Central Michigan | ",
 "Upcoming Nov 10, 6:00 PM Akron at Buffalo | ",
 "Upcoming Nov 14, 6:00 PM Akron vs Kent State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// The Zippy Open (rifle, Sep 11-13 and Sep 18-20) has no result line and no
// story: not listed (K-State's rule), while a scored dual stays. Mutation:
// without Rifle in the rule both are listed as "Completed".
{
  const rifle=parse('Rifle','rifle').filter(e=>e.status==='Final');
  const zippy=rifle.filter(e=>/Zippy Open/.test(e.opponent));
  assert.equal(zippy.length,2);
  for(const event of zippy)assert.equal(worker.akronHandlers.isTennisWithoutStory(event),true);
  assert.equal(worker.akronHandlers.isTennisWithoutStory(rifle.find(e=>/Nebraska/.test(e.opponent))),false);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Akron module checks passed");
