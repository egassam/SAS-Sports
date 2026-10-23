import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {towsonSchool} from '../src/schools/towson.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='towson');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,towsonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/towson-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit towsontigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['towson'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',towsonSchool.scheduleUrls],['roster',towsonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('towson|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'towsontigers.com',`${key} must stay on towsontigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://towsontigers.com/sports/baseball/schedule"],"roster":["https://towsontigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://towsontigers.com/sports/mens-basketball/schedule","https://towsontigers.com/sports/womens-basketball/schedule"],"roster":["https://towsontigers.com/sports/mens-basketball/roster","https://towsontigers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://towsontigers.com/sports/womens-cross-country/schedule"],"roster":["https://towsontigers.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://towsontigers.com/sports/field-hockey/schedule"],"roster":["https://towsontigers.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://towsontigers.com/sports/football/schedule"],"roster":["https://towsontigers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://towsontigers.com/sports/womens-golf/schedule","https://towsontigers.com/sports/mens-golf/schedule"],"roster":["https://towsontigers.com/sports/womens-golf/roster","https://towsontigers.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://towsontigers.com/sports/womens-gymnastics/schedule"],"roster":["https://towsontigers.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://towsontigers.com/sports/womens-lacrosse/schedule","https://towsontigers.com/sports/mens-lacrosse/schedule"],"roster":["https://towsontigers.com/sports/womens-lacrosse/roster","https://towsontigers.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://towsontigers.com/sports/womens-soccer/schedule"],"roster":["https://towsontigers.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://towsontigers.com/sports/softball/schedule"],"roster":["https://towsontigers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://towsontigers.com/sports/womens-swimming-and-diving/schedule","https://towsontigers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://towsontigers.com/sports/womens-swimming-and-diving/roster","https://towsontigers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://towsontigers.com/sports/womens-tennis/schedule"],"roster":["https://towsontigers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://towsontigers.com/sports/track-field/schedule"],"roster":["https://towsontigers.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://towsontigers.com/sports/womens-volleyball/schedule"],"roster":["https://towsontigers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'towson|"+sport+"':"),`${sport} routes must live in the Towson module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://towsontigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.towsonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=towson)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 10:00 PM Men's · Towson at Santa Clara | ",
 "Upcoming Nov 5, 9:00 PM Men's · Towson at Utah | ",
 "Upcoming Nov 9, 7:00 PM Men's · Towson vs LIU | ",
 "Upcoming Nov 12, 7:00 PM Men's · Towson vs Loyola | ",
 "Upcoming Nov 14 Men's · Towson vs UMBC or Morgan State | ",
 "Upcoming Nov 18, 7:00 PM Men's · Towson vs James Madison | ",
 "Upcoming Nov 22, 1:00 PM Men's · Towson at American | ",
 "Upcoming Nov 27, 6:00 PM Men's · Towson at Penn | ",
 "Upcoming Nov 28, 3:30 PM Men's · Towson vs Buffalo | ",
 "Upcoming Dec 2, 7:00 PM Men's · Towson vs Penn State York | ",
 "Upcoming Dec 14 Men's · Towson at Howard | ",
 "Upcoming Dec 19, 3:30 PM Men's · Towson vs George Mason | ",
 "Upcoming Dec 22, 1:00 PM Men's · Towson at UCF | ",
 "Upcoming Dec 28, 6:00 PM Men's · Towson vs Johns Hopkins | ",
 "Upcoming Jan 2, 12:00 PM Men's · Towson at Campbell | ",
 "Upcoming Jan 7, 7:00 PM Men's · Towson vs Hofstra | ",
 "Upcoming Jan 9, 4:00 PM Men's · Towson at Stony Brook | ",
 "Upcoming Jan 14, 7:00 PM Men's · Towson vs Monmouth | ",
 "Upcoming Jan 16, 7:00 PM Men's · Towson at UNCW | ",
 "Upcoming Jan 18, 7:00 PM Men's · Towson at Charleston | ",
 "Upcoming Jan 21, 7:00 PM Men's · Towson vs North Carolina A&T | ",
 "Upcoming Jan 23, 2:00 PM Men's · Towson vs William & Mary | ",
 "Upcoming Jan 28, 7:00 PM Men's · Towson at Drexel | ",
 "Upcoming Jan 30, 2:00 PM Men's · Towson vs Hampton | ",
 "Upcoming Feb 6, 4:00 PM Men's · Towson at Hofstra | ",
 "Upcoming Feb 11, 7:00 PM Men's · Towson at Monmouth | ",
 "Upcoming Feb 13, 2:00 PM Men's · Towson vs Northeastern | ",
 "Upcoming Feb 18, 6:30 PM Men's · Towson vs Elon | ",
 "Upcoming Feb 20, 4:00 PM Men's · Towson vs UNCW | ",
 "Upcoming Feb 25, 6:30 PM Men's · Towson at William & Mary | ",
 "Upcoming Feb 27, 2:00 PM Men's · Towson at Hampton | ",
 "Upcoming Mar 2, 7:00 PM Men's · Towson vs Drexel | ",
 "Upcoming Mar 5 Men's · Towson at CAA Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Women's · Towson at Iowa | ",
 "Upcoming Nov 5, 11:00 AM Women's · Towson vs Frostburg State | ",
 "Upcoming Nov 9, 4:00 PM Women's · Towson vs Delaware | ",
 "Upcoming Nov 13, 11:00 AM Women's · Towson at Loyola | ",
 "Upcoming Nov 15 Women's · Towson vs UMBC or Morgan State | ",
 "Upcoming Nov 18, 7:00 PM Women's · Towson at Villanova | ",
 "Upcoming Nov 20, 5:30 PM Women's · Towson at Lehigh | ",
 "Upcoming Nov 28, 4:00 PM Women's · Towson vs Maryland | ",
 "Upcoming Dec 3, 6:00 PM Women's · Towson at Coppin State | ",
 "Upcoming Dec 20, 11:30 AM Women's · Towson vs Bethune-Cookman | ",
 "Upcoming Dec 21, 11:30 AM Women's · Towson at Stetson | ",
 "Upcoming Dec 29, 3:00 PM Women's · Towson vs UMES | ",
 "Upcoming Jan 1, 2:00 PM Women's · Towson at Stony Brook | ",
 "Upcoming Jan 3, 1:00 PM Women's · Towson vs Elon | ",
 "Upcoming Jan 8, 6:00 PM Women's · Towson at Monmouth | ",
 "Upcoming Jan 10, 3:00 PM Women's · Towson at Hofstra | ",
 "Upcoming Jan 15, 6:30 PM Women's · Towson vs Campbell | ",
 "Upcoming Jan 17, 2:00 PM Women's · Towson vs Hampton | ",
 "Upcoming Jan 22, 7:00 PM Women's · Towson at Northeastern | ",
 "Upcoming Jan 24, 2:00 PM Women's · Towson at Drexel | ",
 "Upcoming Jan 29 Women's · Towson vs Hofstra | ",
 "Upcoming Feb 5, 6:00 PM Women's · Towson at UNCW | ",
 "Upcoming Feb 7, 1:00 PM Women's · Towson at Charleston | ",
 "Upcoming Feb 12, 6:30 PM Women's · Towson vs William & Mary | ",
 "Upcoming Feb 14, 1:00 PM Women's · Towson vs Stony Brook | ",
 "Upcoming Feb 19, 6:30 PM Women's · Towson vs Monmouth | ",
 "Upcoming Feb 26, 7:00 PM Women's · Towson at Hampton | ",
 "Upcoming Feb 28, 1:00 PM Women's · Towson at William & Mary | ",
 "Upcoming Mar 4, 6:30 PM Women's · Towson vs North Carolina A&T | ",
 "Upcoming Mar 6, 2:00 PM Women's · Towson vs Drexel | ",
 "Upcoming Mar 10 Women's · Towson at CAA Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Towson at Mount St. Mary's (Md.) | 2nd of 6",
 "Final Sep 18 Towson at Haverford College | 7th of 13",
 "Final Oct 17 Towson at Gettysburg College | 5th of 46",
 "Upcoming Oct 30 Towson at CAA Championship | ",
 "Upcoming Nov 13 Towson at NCAA Mid-Atlantic Regionals | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Towson at Appalachian State | L, 0-1",
 "Final Aug 30 Towson at Davidson | L, 0-4",
 "Final Sep 4 Towson vs Georgetown | W, 3-1",
 "Final Sep 6 Towson vs Rider | W, 1-0",
 "Final Sep 11 Towson at Maryland | L, 0-6",
 "Final Sep 13 Towson vs American | L, 1-6",
 "Final Sep 18 Towson at Monmouth | L, 1-2",
 "Final Sep 20 Towson vs Penn | W, 4-3",
 "Final Sep 25 Towson vs Fairfield | L, 2-4",
 "Final Sep 27 Towson vs Maine | W, 1-0",
 "Final Oct 2 Towson at William & Mary | L, 1-2",
 "Final Oct 4 Towson at VCU | L, 0-1",
 "Final Oct 9 Towson at Northeastern | L, 1-2",
 "Final Oct 11 Towson at Bryant | W, 3-0",
 "Final Oct 16 Towson vs Drexel | L, 2-5",
 "Upcoming Oct 25, 11:00 AM Towson vs UC Davis | ",
 "Upcoming Oct 30, 1:00 PM Towson vs Hofstra | ",
 "Upcoming Oct 31, 4:00 PM Towson at Delaware | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Towson vs Maine | L, 18-21",
 "Final Sep 5 Towson at Navy | L, 15-42",
 "Final Sep 12 Towson at South Carolina | L, 9-45",
 "Final Sep 19 Towson vs Morgan State | L, 26-41",
 "Final Sep 26 Towson at Delaware State | L, 28-33",
 "Final Oct 3 Towson at Monmouth | L, 40-41",
 "Final Oct 10 Towson vs Stony Brook | L, 24-31",
 "Final Oct 17 Towson at Campbell | L, 20-24",
 "Upcoming Oct 31, 1:00 PM Towson vs Hampton | ",
 "Upcoming Nov 7, 12:00 PM Towson at Sacred Heart | ",
 "Upcoming Nov 14, 12:00 PM Towson at Rhode Island | ",
 "Upcoming Nov 21, 1:00 PM Towson vs Elon | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Towson at Nittany Lion Invitational | 16th of 18",
 "Final Sep 28 Women's · Towson at Golf Galaxy Collegiate | 4th of 7",
 "Final Oct 3 Women's · Towson at Navy Fall Invitational | 5th of 10",
 "Upcoming Oct 26 Women's · Towson at Lehigh Invitational | ",
 "Upcoming Mar 21 Women's · Towson at Kingsmill Intercollegiate | ",
 "Upcoming Mar 29 Women's · Towson at Mimosa Hills Invitational | ",
 "Upcoming Apr 4 Women's · Towson at ECU Ironwood Invitational | ",
 "Upcoming Apr 16 Women's · Towson at CAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Towson at Doc Gimmler Invitational | 3rd of 14",
 "Final Sep 21 Men's · Towson at River Run Collegiate | 5th of 13",
 "Final Oct 5 Men's · Towson at Nemacolin Collegiate Invitational | T9th of 16",
 "Final Oct 12 Men's · Towson at Metropolis Intercollegiate | 11th of 12",
 "Upcoming Mar 8 Men's · Towson at Babygrande Donald Ross Collegiate | ",
 "Upcoming Mar 22 Men's · Towson at Golden Horseshoe Intercollegiate | ",
 "Upcoming Apr 5 Men's · Towson at Giles Spratley Collegiate | ",
 "Upcoming Apr 17 Men's · Towson at Rutherford Intercollegiate | ",
 "Upcoming Apr 25 Men's · Towson at CAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 17 Towson at Mount St. Mary's | W, 2-0",
 "Final Aug 20 Towson at St. John's | L, 1-2",
 "Final Aug 23 Towson vs George Washington | T, 2-2",
 "Final Aug 27 Towson at Delaware | T, 0-0",
 "Final Sep 3 Towson at UMBC | L, 1-3",
 "Final Sep 6 Towson vs Bucknell | W, 3-1",
 "Final Sep 10 Towson vs Navy | W, 1-0",
 "Final Sep 13 Towson vs Penn | L, 0-1",
 "Final Sep 20 Towson at Hofstra | L, 1-2",
 "Final Sep 24 Towson at William & Mary | W, 2-0",
 "Final Sep 27 Towson at Hampton | W, 3-1",
 "Final Oct 4 Towson vs Stony Brook | W, 4-0",
 "Final Oct 8 Towson vs UNCW | L, 1-2",
 "Final Oct 11 Towson vs College of Charleston | W, 2-0",
 "Final Oct 17 Towson vs Northeastern | W, 2-0",
 "Upcoming Oct 25, 1:00 PM Towson at Monmouth | ",
 "Upcoming Nov 1, 1:00 PM Towson vs Drexel | ",
 "Upcoming Nov 5 Towson vs CAA First Round | ",
 "Upcoming Nov 8 Towson at CAA Semifinals | ",
 "Upcoming Nov 14 Towson at CAA Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Towson vs Delaware | L, 107-193",
 "Final Oct 2 Women's · Towson vs Georgetown | W, 136-107",
 "Final Oct 3 Women's · Towson at La Salle | Completed",
 "Today Oct 23, 10:00 AM Women's · Towson at Thomas Murphy Invite | ",
 "Upcoming Nov 7 Women's · Towson at UMBC Diving Invite | ",
 "Upcoming Nov 18, 6:00 PM Women's · Towson at Patriot Invitational | ",
 "Upcoming Dec 2 Women's · Towson at U.S. Open | ",
 "Upcoming Dec 18, 12:00 PM Women's · Towson at George Mason | ",
 "Upcoming Jan 13, 10:00 AM Women's · Towson vs Howard | ",
 "Upcoming Jan 15, 9:00 AM Women's · Towson at George Washington | ",
 "Upcoming Jan 23, 10:00 AM Women's · Towson vs Drexel | ",
 "Upcoming Jan 30, 11:00 AM Women's · Towson at UMBC | ",
 "Upcoming Feb 4 Women's · Towson at Cavalier Invite | ",
 "Upcoming Feb 6, 12:00 PM Women's · Towson at Tiger Winter Diving Invite | ",
 "Upcoming Feb 24 Women's · Towson at CAA Championships | ",
 "Upcoming Mar 8 Women's · Towson at NCAA Zone \"A\" Diving | ",
 "Upcoming Mar 17 Women's · Towson at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Towson vs Delaware | Completed",
 "Final Oct 2 Men's · Towson vs Georgetown | W, 131-112",
 "Final Oct 3 Men's · Towson at La Salle | W, 179-121",
 "Today Oct 23, 10:00 AM Men's · Towson at Thomas Murphy Invite | ",
 "Upcoming Nov 7 Men's · Towson at UMBC Diving Invite | ",
 "Upcoming Nov 18, 6:00 PM Men's · Towson at Patriot Invitational | ",
 "Upcoming Dec 2 Men's · Towson at U.S. Open | ",
 "Upcoming Dec 18, 12:00 PM Men's · Towson at George Mason | ",
 "Upcoming Dec 31, 11:00 AM Men's · Towson at Navy | ",
 "Upcoming Jan 13, 10:00 AM Men's · Towson vs Howard | ",
 "Upcoming Jan 15, 9:00 AM Men's · Towson at George Washington | ",
 "Upcoming Jan 23, 10:00 AM Men's · Towson vs Drexel | ",
 "Upcoming Jan 30, 11:00 AM Men's · Towson at UMBC | ",
 "Upcoming Feb 4 Men's · Towson at Cavalier Invite | ",
 "Upcoming Feb 6, 12:00 PM Men's · Towson at Tiger Winter Diving Invite | ",
 "Upcoming Feb 24 Men's · Towson at CAA Championships | ",
 "Upcoming Mar 8 Men's · Towson at NCAA Zone \"A\" Diving | ",
 "Upcoming Mar 24 Men's · Towson at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Towson at Morgan State | Completed",
 "Final Oct 2 Towson at Loyola Invitational | Completed",
 "Final Oct 15 Towson at ITA Atlantic Regional | Completed",
 "Upcoming Oct 31 Towson at Navy Duals | "
]);
  const v_trackfield=parse("Track & Field","track-field");
  assert.deepEqual(v_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Towson vs Idaho | L, 2-3",
 "Final Aug 28 Towson at Missouri | L, 0-3",
 "Final Aug 29 Towson vs Western Illinois | W, 3-1",
 "Final Sep 4 Towson at Loyola | W, 3-1",
 "Final Sep 5 Towson vs Saint Peter's | W, 3-0",
 "Final Sep 6 Towson at Morgan State | W, 3-0",
 "Final Sep 11 Towson vs Arkansas | L, 0-3",
 "Final Sep 12 Towson vs Robert Morris | W, 3-0",
 "Final Sep 13 Towson vs Howard | W, 3-0",
 "Final Sep 18 Towson vs Northeastern | W, 3-0",
 "Final Sep 19 Towson vs Northeastern | W, 3-1",
 "Final Sep 25 Towson at Charleston | L, 0-3",
 "Final Sep 26 Towson at Charleston | L, 2-3",
 "Final Oct 2 Towson vs William & Mary | W, 3-1",
 "Final Oct 3 Towson vs William & Mary | L, 1-3",
 "Final Oct 9 Towson at Campbell | L, 1-3",
 "Final Oct 10 Towson at Campbell | W, 3-1",
 "Final Oct 14 Towson at Coppin State | W, 3-0",
 "Final Oct 22 Towson vs Hampton | W, 3-0",
 "Today Oct 23, 2:00 PM Towson vs Hampton | ",
 "Upcoming Oct 29, 6:00 PM Towson at North Carolina A&T | ",
 "Upcoming Oct 30, 4:00 PM Towson at North Carolina A&T | ",
 "Upcoming Nov 6, 5:00 PM Towson vs Hofstra | ",
 "Upcoming Nov 7, 3:00 PM Towson vs Hofstra | ",
 "Upcoming Nov 13, 5:00 PM Towson at Stony Brook | ",
 "Upcoming Nov 14, 1:00 PM Towson at Stony Brook | ",
 "Upcoming Nov 19 Towson at CAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackfield,"Track & Field track-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Towson module checks passed");
