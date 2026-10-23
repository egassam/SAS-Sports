import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bellarmineSchool} from '../src/schools/bellarmine.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='bellarmine');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bellarmineHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/bellarmine-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit athletics.bellarmine.edu routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['bellarmine'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',bellarmineSchool.scheduleUrls],['roster',bellarmineSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('bellarmine|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'athletics.bellarmine.edu',`${key} must stay on athletics.bellarmine.edu`);
  }
}
const parity={"Baseball":{"schedule":["https://athletics.bellarmine.edu/sports/baseball/schedule"],"roster":["https://athletics.bellarmine.edu/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://athletics.bellarmine.edu/sports/mens-basketball/schedule","https://athletics.bellarmine.edu/sports/womens-basketball/schedule"],"roster":["https://athletics.bellarmine.edu/sports/mens-basketball/roster","https://athletics.bellarmine.edu/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://athletics.bellarmine.edu/sports/womens-cross-country/schedule","https://athletics.bellarmine.edu/sports/mens-cross-country/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-cross-country/roster","https://athletics.bellarmine.edu/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://athletics.bellarmine.edu/sports/field-hockey/schedule"],"roster":["https://athletics.bellarmine.edu/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://athletics.bellarmine.edu/sports/womens-golf/schedule","https://athletics.bellarmine.edu/sports/mens-golf/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-golf/roster","https://athletics.bellarmine.edu/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://athletics.bellarmine.edu/sports/mens-lacrosse/schedule"],"roster":["https://athletics.bellarmine.edu/sports/mens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://athletics.bellarmine.edu/sports/womens-soccer/schedule","https://athletics.bellarmine.edu/sports/mens-soccer/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-soccer/roster","https://athletics.bellarmine.edu/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://athletics.bellarmine.edu/sports/softball/schedule"],"roster":["https://athletics.bellarmine.edu/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://athletics.bellarmine.edu/sports/womens-swimming/schedule","https://athletics.bellarmine.edu/sports/mens-swimming/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-swimming/roster","https://athletics.bellarmine.edu/sports/mens-swimming/roster"],"combined":true},"Tennis":{"schedule":["https://athletics.bellarmine.edu/sports/womens-tennis/schedule","https://athletics.bellarmine.edu/sports/mens-tennis/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-tennis/roster","https://athletics.bellarmine.edu/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://athletics.bellarmine.edu/sports/womens-track-and-field/schedule","https://athletics.bellarmine.edu/sports/mens-track-and-field/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-track-and-field/roster","https://athletics.bellarmine.edu/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://athletics.bellarmine.edu/sports/womens-volleyball/schedule"],"roster":["https://athletics.bellarmine.edu/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://athletics.bellarmine.edu/sports/wrestling/schedule"],"roster":["https://athletics.bellarmine.edu/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'bellarmine|"+sport+"':"),`${sport} routes must live in the Bellarmine module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://athletics.bellarmine.edu/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bellarmineHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=bellarmine)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Bellarmine at Vanderbilt | ",
 "Upcoming Nov 5, 6:00 PM Men's · Bellarmine at Indiana | ",
 "Upcoming Nov 7, 5:00 PM Men's · Bellarmine at Miami University (OH) | ",
 "Upcoming Nov 11, 7:00 PM Men's · Bellarmine vs Franklin College | ",
 "Upcoming Nov 14, 2:00 PM Men's · Bellarmine vs Northern Illinois | ",
 "Upcoming Nov 17, 8:00 PM Men's · Bellarmine at Illinois State | ",
 "Upcoming Nov 20, 7:00 PM Men's · Bellarmine at Eastern Kentucky | ",
 "Upcoming Nov 24 Men's · Bellarmine vs Georgia Southern | ",
 "Upcoming Nov 25, 7:00 PM Men's · Bellarmine at Northern Kentucky | ",
 "Upcoming Nov 27, 3:00 PM Men's · Bellarmine at Butler | ",
 "Upcoming Dec 2, 7:45 PM Men's · Bellarmine at Morehead State | ",
 "Upcoming Dec 5, 2:00 PM Men's · Bellarmine vs Eastern Illinois | ",
 "Upcoming Dec 10, 7:00 PM Men's · Bellarmine vs Spalding | ",
 "Upcoming Dec 16, 8:00 PM Men's · Bellarmine at Southern Indiana | ",
 "Upcoming Dec 19, 3:00 PM Men's · Bellarmine at Austin Peay State | ",
 "Upcoming Dec 21, 2:00 PM Men's · Bellarmine vs Indiana University Columbus | ",
 "Upcoming Dec 31, 2:00 PM Men's · Bellarmine vs North Alabama | ",
 "Upcoming Jan 2, 2:00 PM Men's · Bellarmine vs West Georgia | ",
 "Upcoming Jan 7, 7:00 PM Men's · Bellarmine at North Florida | ",
 "Upcoming Jan 9, 6:00 PM Men's · Bellarmine at Jacksonville | ",
 "Upcoming Jan 14, 7:00 PM Men's · Bellarmine vs Florida Gulf Coast | ",
 "Upcoming Jan 16, 2:00 PM Men's · Bellarmine vs Stetson | ",
 "Upcoming Jan 23, 8:00 PM Men's · Bellarmine at Lipscomb | ",
 "Upcoming Jan 28, 7:00 PM Men's · Bellarmine at Queens University of Charlotte | ",
 "Upcoming Jan 30, 2:00 PM Men's · Bellarmine at West Florida | ",
 "Upcoming Feb 4, 7:00 PM Men's · Bellarmine vs Jacksonville | ",
 "Upcoming Feb 6, 2:00 PM Men's · Bellarmine vs North Florida | ",
 "Upcoming Feb 11, 7:00 PM Men's · Bellarmine at Stetson | ",
 "Upcoming Feb 13, 2:00 PM Men's · Bellarmine at Florida Gulf Coast | ",
 "Upcoming Feb 20, 7:00 PM Men's · Bellarmine vs Lipscomb | ",
 "Upcoming Feb 25, 7:00 PM Men's · Bellarmine vs West Florida | ",
 "Upcoming Feb 27, 2:00 PM Men's · Bellarmine vs Queens University of Charlotte | ",
 "Upcoming Mar 4 Men's · Bellarmine at ASUN Conference Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 6:30 PM Women's · Bellarmine vs Spalding University (Ky.) (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · Bellarmine at Louisville | ",
 "Upcoming Nov 5, 6:30 PM Women's · Bellarmine vs Simmons College of Kentucky | ",
 "Upcoming Nov 8, 1:00 PM Women's · Bellarmine at Miami University (OH) | ",
 "Upcoming Nov 10, 11:00 AM Women's · Bellarmine at Bowling Green | ",
 "Upcoming Nov 14, 5:00 PM Women's · Bellarmine vs Bradley | ",
 "Upcoming Nov 17, 7:00 PM Women's · Bellarmine at Indiana State | ",
 "Upcoming Nov 20, 6:30 PM Women's · Bellarmine vs Alice Lloyd College (Ky.) | ",
 "Upcoming Nov 29, 2:00 PM Women's · Bellarmine vs Brescia (Ky.) | ",
 "Upcoming Dec 2, 11:00 AM Women's · Bellarmine at Cincinnati | ",
 "Upcoming Dec 6, 2:00 PM Women's · Bellarmine at Kentucky | ",
 "Upcoming Dec 9, 6:30 PM Women's · Bellarmine vs Austin Peay State | ",
 "Upcoming Dec 13, 1:00 PM Women's · Bellarmine vs Mercer | ",
 "Upcoming Dec 15, 6:30 PM Women's · Bellarmine vs Murray State | ",
 "Upcoming Dec 21, 6:30 PM Women's · Bellarmine vs Eastern Kentucky | ",
 "Upcoming Dec 31, 2:00 PM Women's · Bellarmine at North Alabama | ",
 "Upcoming Jan 2, 2:00 PM Women's · Bellarmine at West Georgia | ",
 "Upcoming Jan 9, 1:00 PM Women's · Bellarmine vs Lipscomb | ",
 "Upcoming Jan 14, 7:00 PM Women's · Bellarmine at North Florida | ",
 "Upcoming Jan 16, 1:00 PM Women's · Bellarmine at Jacksonville | ",
 "Upcoming Jan 21, 6:30 PM Women's · Bellarmine vs Florida Gulf Coast | ",
 "Upcoming Jan 23, 2:00 PM Women's · Bellarmine vs Stetson | ",
 "Upcoming Jan 28, 7:00 PM Women's · Bellarmine vs Queens University of Charlotte | ",
 "Upcoming Jan 30 Women's · Bellarmine vs West Florida | ",
 "Upcoming Feb 4, 11:00 AM Women's · Bellarmine at Stetson | ",
 "Upcoming Feb 6, 4:00 PM Women's · Bellarmine at Florida Gulf Coast | ",
 "Upcoming Feb 11, 6:30 PM Women's · Bellarmine vs Jacksonville | ",
 "Upcoming Feb 13, 2:00 PM Women's · Bellarmine vs North Florida | ",
 "Upcoming Feb 20, 3:00 PM Women's · Bellarmine at Lipscomb | ",
 "Upcoming Feb 25, 7:00 PM Women's · Bellarmine at West Florida | ",
 "Upcoming Feb 27, 2:00 PM Women's · Bellarmine at Queens University of Charlotte | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Bellarmine at Stegemoller Screagle Twilight | 4th of 4",
 "Final Sep 18 Women's · Bellarmine at National Catholic Invite | 9th of 15",
 "Final Oct 3 Women's · Bellarmine at Swags Louisville Cross Country Classic | Silver: 2nd of 25",
 "Final Oct 16 Women's · Bellarmine at Under Armour Pre-National Invitational | White: 26th of 26",
 "Upcoming Oct 30, 10:30 AM Women's · Bellarmine at ASUN Cross Country Championship | ",
 "Upcoming Nov 13, 10:00 AM Women's · Bellarmine at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Bellarmine at Stegemoller Screagle Twilight | 3rd of 4",
 "Final Sep 18 Men's · Bellarmine at National Catholic Invite | 8th of 16",
 "Final Oct 3 Men's · Bellarmine at Swags Louisville Cross Country Classic | Gold: 16th of 24; Blue: 19th of 23",
 "Final Oct 16 Men's · Bellarmine at Under Armour Pre-National Invitational | White: 13th of 16",
 "Upcoming Oct 30, 10:30 AM Men's · Bellarmine at ASUN Cross Country Championship | ",
 "Upcoming Nov 13, 10:00 AM Men's · Bellarmine at NCAA Southeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 Bellarmine vs Old Dominion | L, 0-7",
 "Final Aug 30 Bellarmine at Ohio State | L, 0-2",
 "Final Sep 4 Bellarmine at Stanford | L, 0-5",
 "Final Sep 6 Bellarmine at UC Davis | L, 1-2",
 "Final Sep 18 Bellarmine at Appalachian State | L, 0-1",
 "Final Sep 20 Bellarmine at Davidson College | L, 0-2",
 "Final Sep 25 Bellarmine vs Longwood | W, 3-1",
 "Final Sep 27 Bellarmine vs Ohio | L, 2-3",
 "Final Oct 2 Bellarmine at Kent State | W, 3-2",
 "Final Oct 6 Bellarmine at Louisville | L, 0-4",
 "Final Oct 9 Bellarmine at James Madison | L, 1-4",
 "Final Oct 11 Bellarmine at William & Mary | L, 0-2",
 "Final Oct 16 Bellarmine vs Miami University (OH) | L, 1-6",
 "Final Oct 18 Bellarmine vs UMass Amherst | L, 0-11",
 "Today Oct 23, 2:00 PM Bellarmine at Central Michigan | ",
 "Upcoming Oct 25 Bellarmine at Michigan State | ",
 "Upcoming Oct 29, 3:00 PM Bellarmine vs Ball State | ",
 "Upcoming Nov 1 Bellarmine vs Saint Louis | ",
 "Upcoming Nov 4 Bellarmine at Mid-American Conference Tournament | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Bellarmine at A-Ga-Ming Invitational | 12th of 13",
 "Final Oct 12 Women's · Bellarmine at The Robbie | 6th of 7",
 "Final Oct 19 Women's · Bellarmine at Charles Braun Jr. Intercollegiate | 4th of 11",
 "Upcoming Nov 2 Women's · Bellarmine at Samford Intercollegiate | ",
 "Upcoming Feb 14 Women's · Bellarmine at Battle at The Beach | ",
 "Upcoming Mar 8 Women's · Bellarmine at Babs Steffens Invitational | ",
 "Upcoming Mar 22 Women's · Bellarmine at The Nashville Invitational | ",
 "Upcoming Mar 29 Women's · Bellarmine at Austin Peay Invitational | ",
 "Upcoming Apr 5 Women's · Bellarmine at Colonel Classic | ",
 "Upcoming Apr 21 Women's · Bellarmine at ASUN Women's Golf Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Bellarmine at Chaney-Denham-Landrum Shootout | 1st of 3",
 "Final Sep 7 Men's · Bellarmine at Golfweek Fall Challenge | 16th of 16",
 "Final Sep 14 Men's · Bellarmine at Joe Feaganes Invitational | 1st of 14",
 "Final Sep 28 Men's · Bellarmine at Derek Dolenc Invitational | 11th of 17",
 "Final Oct 5 Men's · Bellarmine at Kemper Lakes Invitational | 11th of 12",
 "Final Oct 12 Men's · Bellarmine at Bubba Barnett Intercollegiate | 9th of 17",
 "Upcoming Feb 15 Men's · Bellarmine at Wexford Intercollegiate | ",
 "Upcoming Feb 20 Men's · Bellarmine at Savannah Intercollegiate | ",
 "Upcoming Mar 29 Men's · Bellarmine at Don Benbow Invitational | ",
 "Upcoming Apr 5 Men's · Bellarmine at The Jewell | ",
 "Upcoming Apr 12 Men's · Bellarmine at Daytona Beach Intercollegiate | ",
 "Upcoming Apr 20 Men's · Bellarmine at ASUN Men's Golf Championship | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Bellarmine at Lindenwood | L, 0-1",
 "Final Aug 21 Women's · Bellarmine at Indiana | T, 1-1",
 "Final Aug 27 Women's · Bellarmine at Northern Kentucky | L, 0-2",
 "Final Sep 3 Women's · Bellarmine at IU Indy | L, 2-5",
 "Final Sep 10 Women's · Bellarmine vs Wright State | W, 2-1",
 "Final Sep 13 Women's · Bellarmine vs Marshall | L, 2-4",
 "Final Sep 20 Women's · Bellarmine vs Morehead State | W, 2-1",
 "Final Sep 24 Women's · Bellarmine at North Florida | T, 1-1",
 "Final Sep 27 Women's · Bellarmine at Jacksonville | L, 1-2",
 "Final Oct 1 Women's · Bellarmine vs Stetson | W, 3-0",
 "Final Oct 4 Women's · Bellarmine vs Florida Gulf Coast | L, 1-2",
 "Final Oct 8 Women's · Bellarmine at Queens University of Charlotte | W, 4-0",
 "Final Oct 18 Women's · Bellarmine at Lipscomb | W, 3-2",
 "Final Oct 22 Women's · Bellarmine vs West Florida | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · Bellarmine vs Queens University of Charlotte | ",
 "Upcoming Oct 28, 1:00 PM Women's · Bellarmine at West Florida | ",
 "Upcoming Oct 31, 4:00 PM Women's · Bellarmine vs Lipscomb | ",
 "Upcoming Nov 5 Women's · Bellarmine at ASUN Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Bellarmine vs Evansville | W, 3-2",
 "Final Aug 25 Men's · Bellarmine at Xavier | T, 0-0",
 "Final Aug 30 Men's · Bellarmine at Northern Kentucky | W, 2-1",
 "Final Sep 5 Men's · Bellarmine vs Stetson | W, 1-0",
 "Final Sep 8 Men's · Bellarmine at Southern Indiana | W, 2-1",
 "Final Sep 12 Men's · Bellarmine vs Chicago State | W, 6-0",
 "Final Sep 15 Men's · Bellarmine vs Hanover College | T, 1-1",
 "Final Sep 19 Men's · Bellarmine vs Central Arkansas | L, 1-2",
 "Final Sep 26 Men's · Bellarmine at West Florida | L, 2-3",
 "Final Oct 3 Men's · Bellarmine at Florida Gulf Coast | T, 1-1",
 "Final Oct 10 Men's · Bellarmine vs North Florida | T, 0-0",
 "Final Oct 13 Men's · Bellarmine vs IU Indy | W, 2-0",
 "Final Oct 17 Men's · Bellarmine at Jacksonville | L, 0-1",
 "Upcoming Oct 24, 7:00 PM Men's · Bellarmine vs Lipscomb | ",
 "Upcoming Oct 31, 4:00 PM Men's · Bellarmine at Queens University of Charlotte | ",
 "Upcoming Nov 7 Men's · Bellarmine at ASUN Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimming=parse("Swimming & Diving","womens-swimming");
  assert.deepEqual(v_womensswimming.map(line),[
 "Final Oct 3 Women's · Bellarmine at IU Indy Invite | Completed",
 "Final Oct 10 Women's · Bellarmine at Evansville | Completed",
 "Upcoming Oct 31, 1:00 PM Women's · Bellarmine at Southern Indiana | ",
 "Upcoming Nov 12 Women's · Bellarmine at Southern Illinois Invite | ",
 "Upcoming Jan 9, 1:00 PM Women's · Bellarmine vs Ball State | ",
 "Upcoming Jan 16, 1:00 PM Women's · Bellarmine vs Xavier | ",
 "Upcoming Jan 23, 1:00 PM Women's · Bellarmine vs Northern Kentucky | ",
 "Upcoming Jan 31 Women's · Bellarmine at Butler Invite | ",
 "Upcoming Feb 17 Women's · Bellarmine at ASUN Swimming and Diving Championships | "
]);
  const v_mensswimming=parse("Swimming & Diving","mens-swimming");
  assert.deepEqual(v_mensswimming.map(line),[
 "Final Oct 3 Men's · Bellarmine at IU Indy Invite | Completed",
 "Final Oct 10 Men's · Bellarmine at Evansville | Completed",
 "Upcoming Oct 31, 1:00 PM Men's · Bellarmine at Southern Indiana | ",
 "Upcoming Nov 12 Men's · Bellarmine at Southern Illinois Invite | ",
 "Upcoming Jan 9, 1:00 PM Men's · Bellarmine vs Ball State | ",
 "Upcoming Jan 16, 1:00 PM Men's · Bellarmine vs Xavier | ",
 "Upcoming Jan 23, 1:00 PM Men's · Bellarmine vs Northern Kentucky | ",
 "Upcoming Jan 31 Men's · Bellarmine at Butler Invite | ",
 "Upcoming Feb 17 Men's · Bellarmine at ASUN Swimming and Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Bellarmine at Big Blue Invite | Completed",
 "Final Oct 16 Women's · Bellarmine at Lipscomb/Belmont Hidden Dual | Completed",
 "Upcoming Oct 29 Women's · Bellarmine at UTR D1 Invitational | ",
 "Upcoming Jan 18, 12:30 PM Women's · Bellarmine vs Western Kentucky | ",
 "Upcoming Jan 22, 11:00 AM Women's · Bellarmine at Alabama | ",
 "Upcoming Jan 29, 3:30 PM Women's · Bellarmine vs Austin Peay State | ",
 "Upcoming Jan 30, 3:30 PM Women's · Bellarmine vs Murray State | ",
 "Upcoming Feb 4, 1:00 PM Women's · Bellarmine at Ball State | ",
 "Upcoming Feb 6, 11:00 AM Women's · Bellarmine at Notre Dame | ",
 "Upcoming Feb 12, 5:00 PM Women's · Bellarmine vs Purdue | ",
 "Upcoming Feb 13 Women's · Bellarmine vs Tennessee at Chattanooga | ",
 "Upcoming Feb 14, 11:00 AM Women's · Bellarmine vs Butler | ",
 "Upcoming Feb 19, 10:00 AM Women's · Bellarmine at Tennessee | ",
 "Upcoming Feb 27, 12:00 PM Women's · Bellarmine at UAB | ",
 "Upcoming Feb 28, 12:00 PM Women's · Bellarmine vs Samford | ",
 "Upcoming Mar 2, 1:00 PM Women's · Bellarmine at West Florida | ",
 "Upcoming Mar 5, 9:00 AM Women's · Bellarmine vs Chicago State | ",
 "Upcoming Mar 12, 11:00 AM Women's · Bellarmine at Louisiana Tech | ",
 "Upcoming Mar 12, 4:00 PM Women's · Bellarmine vs Alcorn State | ",
 "Upcoming Mar 14 Women's · Bellarmine at Mississippi State | ",
 "Upcoming Mar 16, 10:00 AM Women's · Bellarmine vs Liberty | ",
 "Upcoming Mar 18, 10:00 AM Women's · Bellarmine vs North Florida | ",
 "Upcoming Mar 26, 10:00 AM Women's · Bellarmine at Florida Gulf Coast | ",
 "Upcoming Mar 27, 10:00 AM Women's · Bellarmine vs Lipscomb | ",
 "Upcoming Apr 3, 11:00 AM Women's · Bellarmine vs Stetson | ",
 "Upcoming Apr 3, 4:00 PM Women's · Bellarmine vs New Mexico State | ",
 "Upcoming Apr 9, 11:00 AM Women's · Bellarmine at Queens University of Charlotte | ",
 "Upcoming Apr 23 Women's · Bellarmine at Atlantic Sun Conference Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · Bellarmine at Louisville Invite | Completed",
 "Final Oct 7 Men's · Bellarmine at ITA Regionals | Completed",
 "Today Oct 21 Men's · Bellarmine at ASUN Individual Tournament | ",
 "Upcoming Nov 6 Men's · Bellarmine at Ball State Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Bellarmine at Commonwealth College Opener | ",
 "Upcoming Jan 15 Women's · Bellarmine at Bellarmine Open | ",
 "Upcoming Jan 29 Women's · Bellarmine at Lenny Lyles Invitational | ",
 "Upcoming Feb 5 Women's · Bellarmine at Fairgrounds Invitational | ",
 "Upcoming Feb 12 Women's · Bellarmine at PNC Bank Bellarmine Classic | ",
 "Upcoming Feb 20 Women's · Bellarmine at Meyo Invitational | ",
 "Upcoming Feb 26 Women's · Bellarmine at ASUN Indoor Championships | ",
 "Upcoming Mar 26 Women's · Bellarmine at Jim Vargo Invitational | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · Bellarmine at Commonwealth College Opener | ",
 "Upcoming Jan 15 Men's · Bellarmine at Bellarmine Open | ",
 "Upcoming Jan 29 Men's · Bellarmine at Lenny Lyles Invitational | ",
 "Upcoming Feb 5 Men's · Bellarmine at Fairgrounds Invitational | ",
 "Upcoming Feb 12 Men's · Bellarmine at PNC Bank Bellarmine Classic | ",
 "Upcoming Feb 20 Men's · Bellarmine at Meyo Invitational | ",
 "Upcoming Feb 26 Men's · Bellarmine at ASUN Indoor Championships | ",
 "Upcoming Mar 26 Men's · Bellarmine at Jim Vargo Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Bellarmine vs Rutgers | L, 1-3",
 "Final Aug 29 Bellarmine vs Purdue Fort Wayne | W, 3-2",
 "Final Aug 29 Bellarmine vs Evansville | W, 3-0",
 "Final Sep 4 Bellarmine at UNC Asheville | L, 0-3",
 "Final Sep 4 Bellarmine vs Western Carolina | L, 2-3",
 "Final Sep 5 Bellarmine vs Jacksonville State | W, 3-2",
 "Final Sep 10 Bellarmine at Butler | L, 1-3",
 "Final Sep 12 Bellarmine vs Butler | W, 3-0",
 "Final Sep 18 Bellarmine vs Norfolk State | W, 3-1",
 "Final Sep 18 Bellarmine vs Tennessee at Chattanooga | W, 3-1",
 "Final Sep 19 Bellarmine at Radford | L, 2-3",
 "Final Sep 26 Bellarmine vs Lipscomb | W, 3-0",
 "Final Oct 2 Bellarmine vs Jacksonville | L, 1-3",
 "Final Oct 3 Bellarmine vs North Florida | W, 3-1",
 "Final Oct 9 Bellarmine at Florida Gulf Coast | L, 2-3",
 "Final Oct 11 Bellarmine at Stetson | W, 3-0",
 "Final Oct 16 Bellarmine at West Florida | L, 2-3",
 "Final Oct 18 Bellarmine at Queens University of Charlotte | L, 1-3",
 "Today Oct 23, 6:00 PM Bellarmine vs Stetson | ",
 "Upcoming Oct 24, 5:00 PM Bellarmine vs Florida Gulf Coast | ",
 "Upcoming Oct 30, 6:00 PM Bellarmine vs Queens University of Charlotte | ",
 "Upcoming Oct 31, 4:00 PM Bellarmine vs West Florida | ",
 "Upcoming Nov 6, 6:00 PM Bellarmine at North Florida | ",
 "Upcoming Nov 7, 6:00 PM Bellarmine at Jacksonville | ",
 "Upcoming Nov 14, 5:00 PM Bellarmine at Lipscomb | ",
 "Upcoming Nov 19 Bellarmine at Atlantic Sun Conference Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Bellarmine at Navy Classic | ",
 "Upcoming Nov 7 Bellarmine at Ohio | ",
 "Upcoming Nov 13 Bellarmine at Iowa | ",
 "Upcoming Nov 15 Bellarmine at Northern Illinois | ",
 "Upcoming Nov 22 Bellarmine vs Ohio State | ",
 "Upcoming Dec 5 Bellarmine vs Kent State Open | ",
 "Upcoming Dec 18, 7:00 PM Bellarmine vs Davidson College | ",
 "Upcoming Jan 2 Bellarmine at Southern Scuffle | ",
 "Upcoming Jan 8 Bellarmine vs F&M Open | ",
 "Upcoming Jan 17 Bellarmine vs Appalachian State | ",
 "Upcoming Jan 24 Bellarmine vs Virginia Military Institute | ",
 "Upcoming Feb 5 Bellarmine at Campbell | ",
 "Upcoming Feb 5 Bellarmine vs Presbyterian College | ",
 "Upcoming Feb 5 Bellarmine vs Air Force | ",
 "Upcoming Feb 7, 2:00 PM Bellarmine at Gardner-Webb | ",
 "Upcoming Feb 14 Bellarmine vs The Citadel | ",
 "Upcoming Feb 20, 7:30 PM Bellarmine at Tennessee at Chattanooga | ",
 "Upcoming Mar 5 Bellarmine at Southern Conference Championships | ",
 "Upcoming Mar 18 Bellarmine at NCAA D1 Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Bellarmine module checks passed");
