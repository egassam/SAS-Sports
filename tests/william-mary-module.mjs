import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {williamMarySchool} from '../src/schools/william-mary.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='william-mary');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,williamMaryHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/william-mary-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit tribeathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['william-mary'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',williamMarySchool.scheduleUrls],['roster',williamMarySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('william-mary|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'tribeathletics.com',`${key} must stay on tribeathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://tribeathletics.com/sports/baseball/schedule"],"roster":["https://tribeathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://tribeathletics.com/sports/mens-basketball/schedule","https://tribeathletics.com/sports/womens-basketball/schedule"],"roster":["https://tribeathletics.com/sports/mens-basketball/roster","https://tribeathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://tribeathletics.com/sports/cross-country/schedule"],"roster":["https://tribeathletics.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://tribeathletics.com/sports/field-hockey/schedule"],"roster":["https://tribeathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://tribeathletics.com/sports/football/schedule"],"roster":["https://tribeathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://tribeathletics.com/sports/womens-golf/schedule","https://tribeathletics.com/sports/mens-golf/schedule"],"roster":["https://tribeathletics.com/sports/womens-golf/roster","https://tribeathletics.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://tribeathletics.com/sports/womens-gymnastics/schedule","https://tribeathletics.com/sports/mens-gymnastics/schedule"],"roster":["https://tribeathletics.com/sports/womens-gymnastics/roster","https://tribeathletics.com/sports/mens-gymnastics/roster"],"combined":true},"Lacrosse":{"schedule":["https://tribeathletics.com/sports/womens-lacrosse/schedule"],"roster":["https://tribeathletics.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://tribeathletics.com/sports/womens-soccer/schedule","https://tribeathletics.com/sports/mens-soccer/schedule"],"roster":["https://tribeathletics.com/sports/womens-soccer/roster","https://tribeathletics.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://tribeathletics.com/sports/swimming-and-diving/schedule"],"roster":["https://tribeathletics.com/sports/swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://tribeathletics.com/sports/womens-tennis/schedule","https://tribeathletics.com/sports/mens-tennis/schedule"],"roster":["https://tribeathletics.com/sports/womens-tennis/roster","https://tribeathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://tribeathletics.com/sports/track-and-field/schedule"],"roster":["https://tribeathletics.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://tribeathletics.com/sports/womens-volleyball/schedule"],"roster":["https://tribeathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'william-mary|"+sport+"':"),`${sport} routes must live in the William & Mary module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://tribeathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.williamMaryHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=william-mary)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Nov 1, 2:00 PM William & Mary vs VCU | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · William & Mary vs Bridgewater | ",
 "Upcoming Nov 8, 6:00 PM Men's · William & Mary vs Norfolk State | ",
 "Upcoming Nov 11, 7:00 PM Men's · William & Mary at Florida Atlantic | ",
 "Upcoming Nov 15, 2:00 PM Men's · William & Mary at Michigan | ",
 "Upcoming Nov 17, 7:00 PM Men's · William & Mary vs Bowling Green | ",
 "Upcoming Nov 20, 11:00 AM Men's · William & Mary vs Averett | ",
 "Upcoming Nov 22, 2:00 PM Men's · William & Mary at Youngstown State | ",
 "Upcoming Nov 23 Men's · William & Mary vs IU Indy | ",
 "Upcoming Nov 29, 4:00 PM Men's · William & Mary at James Madison | ",
 "Upcoming Dec 1, 7:00 PM Men's · William & Mary vs Winston-Salem State | ",
 "Upcoming Dec 7, 8:00 PM Men's · William & Mary at Ole Miss | ",
 "Upcoming Dec 10, 7:00 PM Men's · William & Mary at Delaware | ",
 "Upcoming Dec 18, 7:00 PM Men's · William & Mary at Richmond | ",
 "Upcoming Dec 22, 12:00 PM Men's · William & Mary vs Coastal Carolina | ",
 "Upcoming Dec 31, 2:00 PM Men's · William & Mary vs Drexel | ",
 "Upcoming Jan 2, 2:00 PM Men's · William & Mary vs Elon | ",
 "Upcoming Jan 7, 7:00 PM Men's · William & Mary at Northeastern | ",
 "Upcoming Jan 9, 2:00 PM Men's · William & Mary at Hofstra | ",
 "Upcoming Jan 14, 7:00 PM Men's · William & Mary vs Hampton | ",
 "Upcoming Jan 16, 2:00 PM Men's · William & Mary vs Campbell | ",
 "Upcoming Jan 18, 7:00 PM Men's · William & Mary at UNCW | ",
 "Upcoming Jan 21 Men's · William & Mary at Stony Brook | ",
 "Upcoming Jan 23, 2:00 PM Men's · William & Mary at Towson | ",
 "Upcoming Jan 30, 2:00 PM Men's · William & Mary vs Northeastern | ",
 "Upcoming Feb 4, 6:00 PM Men's · William & Mary vs UNCW | ",
 "Upcoming Feb 6, 12:00 PM Men's · William & Mary vs Charleston | ",
 "Upcoming Feb 13, 2:00 PM Men's · William & Mary at Campbell | ",
 "Upcoming Feb 18, 7:00 PM Men's · William & Mary vs Monmouth | ",
 "Upcoming Feb 20 Men's · William & Mary at N.C. A&T | ",
 "Upcoming Feb 25, 6:30 PM Men's · William & Mary vs Towson | ",
 "Upcoming Feb 27, 7:00 PM Men's · William & Mary at Elon | ",
 "Upcoming Mar 2, 7:00 PM Men's · William & Mary at Hampton | ",
 "Upcoming Mar 5 Men's · William & Mary at CAA Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30, 7:00 PM Women's · William & Mary vs Christopher Newport (Exhibition) | ",
 "Upcoming Nov 2, 4:00 PM Women's · William & Mary vs Chowan | ",
 "Upcoming Nov 5, 7:00 PM Women's · William & Mary vs Tennessee State | ",
 "Upcoming Nov 8, 2:00 PM Women's · William & Mary at Virginia | ",
 "Upcoming Nov 15, 2:00 PM Women's · William & Mary at Richmond | ",
 "Upcoming Nov 19, 6:30 PM Women's · William & Mary at Old Dominion | ",
 "Upcoming Nov 24, 11:00 AM Women's · William & Mary at Coppin State | ",
 "Upcoming Nov 28, 1:00 PM Women's · William & Mary vs Longwood | ",
 "Upcoming Dec 3, 7:00 PM Women's · William & Mary vs American | ",
 "Upcoming Dec 15, 7:00 PM Women's · William & Mary vs Virginia-Lynchburg | ",
 "Upcoming Dec 18, 11:00 AM Women's · William & Mary at Penn | ",
 "Upcoming Dec 20, 1:00 PM Women's · William & Mary at Loyola Maryland | ",
 "Upcoming Jan 1, 1:00 PM Women's · William & Mary vs Campbell | ",
 "Upcoming Jan 8, 7:00 PM Women's · William & Mary at Elon | ",
 "Upcoming Jan 10, 1:00 PM Women's · William & Mary vs Charleston | ",
 "Upcoming Jan 15, 7:00 PM Women's · William & Mary vs Hampton | ",
 "Upcoming Jan 17, 1:00 PM Women's · William & Mary at UNCW | ",
 "Upcoming Jan 22, 7:00 PM Women's · William & Mary vs Hofstra | ",
 "Upcoming Jan 24, 1:00 PM Women's · William & Mary vs Elon | ",
 "Upcoming Jan 29 Women's · William & Mary at Campbell | ",
 "Upcoming Jan 31 Women's · William & Mary at Hampton | ",
 "Upcoming Feb 7, 1:00 PM Women's · William & Mary vs N.C. A&T | ",
 "Upcoming Feb 12 Women's · William & Mary at Towson | ",
 "Upcoming Feb 14, 1:00 PM Women's · William & Mary at Drexel | ",
 "Upcoming Feb 19, 7:00 PM Women's · William & Mary vs Northeastern | ",
 "Upcoming Feb 21, 2:00 PM Women's · William & Mary at N.C. A&T | ",
 "Upcoming Feb 26, 7:00 PM Women's · William & Mary vs UNCW | ",
 "Upcoming Feb 28, 1:00 PM Women's · William & Mary vs Towson | ",
 "Upcoming Mar 4, 6:00 PM Women's · William & Mary at Monmouth | ",
 "Upcoming Mar 6 Women's · William & Mary at Stony Brook | ",
 "Upcoming Mar 10 Women's · William & Mary at CAA Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 William & Mary at Spider Alumni Open | Women's team: 1st / Men's team: 1st",
 "Final Sep 11 William & Mary at Virginia Invitational | Women's team: 4th / Men's team: 2nd",
 "Final Oct 2 William & Mary at Firetower Project Run | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 16 William & Mary at Princeton Fall Classic | Women's team: 7th / Men's team: 2nd",
 "Upcoming Oct 30 William & Mary at Coastal Athletic Association Championships | ",
 "Upcoming Nov 13 William & Mary at NCAA Southeast Regional | ",
 "Upcoming Nov 21 William & Mary at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 William & Mary at Duke | L, 0-7",
 "Final Sep 4 William & Mary vs Longwood | W, 5-2",
 "Final Sep 6 William & Mary vs VCU | L, 2-4",
 "Final Sep 11 William & Mary at American | L, 0-8",
 "Final Sep 13 William & Mary vs Georgetown | L, 2-3",
 "Final Sep 20 William & Mary vs Richmond | L, 2-5",
 "Final Sep 25 William & Mary at Northeastern | L, 0-2",
 "Final Sep 28 William & Mary vs Old Dominion | L, 0-2",
 "Final Oct 2 William & Mary vs Towson | W, 2-1",
 "Final Oct 4 William & Mary vs James Madison | L, 2-3",
 "Final Oct 9 William & Mary vs Fairfield | L, 0-5",
 "Final Oct 11 William & Mary vs Bellarmine | W, 2-0",
 "Final Oct 16 William & Mary at Monmouth | L, 0-5",
 "Final Oct 18 William & Mary at Lafayette | L, 0-6",
 "Today Oct 23, 3:00 PM William & Mary at Hofstra | ",
 "Upcoming Oct 30, 5:00 PM William & Mary vs Drexel | ",
 "Upcoming Nov 4 William & Mary at CAA Semifinals | ",
 "Upcoming Nov 6 William & Mary at CAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 William & Mary at Villanova | W, 35-32",
 "Final Sep 5 William & Mary vs Delaware State | W, 22-15",
 "Final Sep 12 William & Mary at Lehigh | L, 20-44",
 "Final Sep 19 William & Mary vs Fordham | L, 27-52",
 "Final Sep 26 William & Mary at Duke | L, 7-62",
 "Final Oct 3 William & Mary vs Holy Cross | L, 14-41",
 "Final Oct 10 William & Mary at North Carolina Central | W, 17-14",
 "Upcoming Oct 24, 3:30 PM William & Mary vs Georgetown | ",
 "Upcoming Oct 31, 1:00 PM William & Mary at Colgate | ",
 "Upcoming Nov 7, 1:00 PM William & Mary vs Lafayette | ",
 "Upcoming Nov 14, 1:00 PM William & Mary vs Bucknell | ",
 "Upcoming Nov 21, 12:00 PM William & Mary at Richmond | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · William & Mary at Tribe Invitational | 2nd of 8",
 "Final Sep 14 Women's · William & Mary at Elon Invitational | 2nd of 15",
 "Final Oct 9 Women's · William & Mary at Evie Odom Invitational | T13th of 14",
 "Final Oct 19 Women's · William & Mary at Spider Invitational | 5th of 7",
 "Upcoming Oct 26 Women's · William & Mary at Keswick Cup | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · William & Mary at Bryan National Collegiate | T3rd of 13",
 "Final Sep 19 Men's · William & Mary at The Goat | T3rd of 14",
 "Final Oct 5 Men's · William & Mary at WVU Nemacolin College Invitational | 4th of 16",
 "Final Oct 19 Men's · William & Mary at Bank of Tennessee Intercollegiate | 6th of 13",
 "Upcoming Oct 25 Men's · William & Mary at ODU/OBX Intercollegiate | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · William & Mary at Loyola Maryland | T, 1-1",
 "Final Aug 20 Women's · William & Mary at Army | L, 2-3",
 "Final Aug 27 Women's · William & Mary vs Virginia Tech | L, 1-3",
 "Final Aug 30 Women's · William & Mary at Appalachian State | L, 1-2",
 "Final Sep 3 Women's · William & Mary vs Liberty | L, 0-2",
 "Final Sep 6 Women's · William & Mary vs VCU | T, 2-2",
 "Final Sep 13 Women's · William & Mary at American | W, 5-1",
 "Final Sep 19 Women's · William & Mary at College of Charleston | T, 1-1",
 "Final Sep 24 Women's · William & Mary vs Towson | L, 0-2",
 "Final Sep 27 Women's · William & Mary vs Drexel | W, 4-0",
 "Final Oct 2 Women's · William & Mary vs Campbell | W, 2-1",
 "Final Oct 8 Women's · William & Mary at Hofstra | W, 1-0",
 "Final Oct 11 Women's · William & Mary at Stony Brook | L, 0-1",
 "Final Oct 18 Women's · William & Mary at Elon | L, 0-2",
 "Upcoming Oct 25, 1:00 PM Women's · William & Mary vs UNCW | ",
 "Upcoming Nov 1, 12:00 PM Women's · William & Mary at Hampton | ",
 "Upcoming Nov 5 Women's · William & Mary vs Coastal Athletic Association | ",
 "Upcoming Nov 8 Women's · William & Mary vs Coastal Athletic Association | ",
 "Upcoming Nov 14 Women's · William & Mary vs Coastal Athletic Association | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · William & Mary vs Longwood | L, 5-6",
 "Final Aug 23 Men's · William & Mary vs Radford | W, 4-1",
 "Final Aug 27 Men's · William & Mary at George Mason | L, 1-3",
 "Final Aug 30 Men's · William & Mary at Elon | T, 1-1",
 "Final Sep 5 Men's · William & Mary vs Charleston | W, 2-0",
 "Final Sep 12 Men's · William & Mary at UNCW | L, 1-2",
 "Final Sep 19 Men's · William & Mary at UMBC | W, 2-1",
 "Final Sep 22 Men's · William & Mary at Old Dominion | L, 1-2",
 "Final Sep 26 Men's · William & Mary vs Campbell | W, 2-1",
 "Final Sep 29 Men's · William & Mary at American | W, 1-0",
 "Final Oct 3 Men's · William & Mary vs Elon | L, 1-3",
 "Final Oct 8 Men's · William & Mary vs Howard | W, 4-0",
 "Final Oct 13 Men's · William & Mary vs Navy | W, 4-0",
 "Final Oct 17 Men's · William & Mary at Charleston | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Men's · William & Mary at Campbell | ",
 "Upcoming Oct 27, 6:00 PM Men's · William & Mary at North Carolina | ",
 "Upcoming Oct 31, 2:00 PM Men's · William & Mary vs UNCW | ",
 "Upcoming Nov 5 Men's · William & Mary vs Coastal Athletic Association | ",
 "Upcoming Nov 8 Men's · William & Mary vs Coastal Athletic Association | ",
 "Upcoming Nov 14 Men's · William & Mary vs Coastal Athletic Association | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 26 William & Mary at Georgetown | Men's team: W, 158-136 / Women's team: W, 177-117",
 "Final Oct 3 William & Mary vs George Washington | Men's team: L, 108-153 / Women's team: W, 174-87",
 "Final Oct 10 William & Mary at Navy | Men's team: L, 105-181 / Women's team: L, 128-166",
 "Final Oct 10 William & Mary at UMBC | Men's team: W, 168-126 / Women's team: W, 201-92",
 "Upcoming Oct 31, 12:00 PM William & Mary vs Johns Hopkins | ",
 "Upcoming Nov 7, 12:00 PM William & Mary at George Mason | ",
 "Upcoming Nov 19, 10:00 AM William & Mary at Navy Invitational (Day One) | ",
 "Upcoming Nov 20, 10:00 AM William & Mary at Navy Invitational (Day Two) | ",
 "Upcoming Nov 21, 10:00 AM William & Mary at Navy Invitational (Day Three) | ",
 "Upcoming Jan 8, 4:00 PM William & Mary at UNCW | ",
 "Upcoming Jan 8, 4:00 PM William & Mary at Old Dominion | ",
 "Upcoming Jan 8, 4:00 PM William & Mary at Richmond (women only) | ",
 "Upcoming Jan 16, 12:00 PM William & Mary vs Davidson | ",
 "Upcoming Feb 4, 10:00 AM William & Mary at Cavalier Invitational (Day One) | ",
 "Upcoming Feb 5, 10:00 AM William & Mary at Cavalier Invitational (Day Two) | ",
 "Upcoming Feb 6, 10:00 AM William & Mary at Cavalier Invitational (Day Three) | ",
 "Upcoming Feb 24 William & Mary at CAA Championships (Day One) | ",
 "Upcoming Feb 25 William & Mary at CAA Championships (Day Two) | ",
 "Upcoming Feb 26 William & Mary at CAA Championships (Day Three) | ",
 "Upcoming Feb 27 William & Mary at CAA Championships (Day Four) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · William & Mary at Tribe Invitational | Completed",
 "Final Sep 25 Women's · William & Mary at Navy Blue & Gold Invitational | Completed",
 "Final Oct 10 Women's · William & Mary at Hall of Fame Invite | Completed",
 "Final Oct 15 Women's · William & Mary at ITA Atlantic Region Championships | Completed",
 "Upcoming Oct 30 Women's · William & Mary at W&M Hidden Dual | ",
 "Upcoming Nov 5 Women's · William & Mary at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Women's · William & Mary at NCAA Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · William & Mary at Porter's Neck Invitational | Completed",
 "Final Sep 25 Men's · William & Mary at Liberty Dual | Completed",
 "Final Oct 2 Men's · William & Mary at River City Open | Completed",
 "Final Oct 8 Men's · William & Mary at ITA Atlantic Region Championships | Completed",
 "Upcoming Nov 5 Men's · William & Mary at ITA Conference Masters Championships | ",
 "Upcoming Nov 5 Men's · William & Mary at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · William & Mary at Tribe Fall Invite | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 William & Mary vs Coppin State | L, 1-3",
 "Final Aug 28 William & Mary at Virginia Tech | W, 3-2",
 "Final Aug 29 William & Mary vs Kent State | L, 2-3",
 "Final Sep 4 William & Mary vs Virginia | L, 1-3",
 "Final Sep 5 William & Mary vs ETSU | W, 3-0",
 "Final Sep 8 William & Mary at Norfolk State | W, 3-0",
 "Final Sep 11 William & Mary at Appalachian State | L, 0-3",
 "Final Sep 12 William & Mary vs Western Carolina | L, 1-3",
 "Final Sep 13 William & Mary vs North Florida | W, 3-1",
 "Final Sep 18 William & Mary vs Stony Brook | L, 0-3",
 "Final Sep 19 William & Mary vs Stony Brook | L, 2-3",
 "Final Oct 2 William & Mary at Towson | L, 1-3",
 "Final Oct 3 William & Mary at Towson | W, 3-1",
 "Final Oct 9 William & Mary vs North Carolina A&T | L, 0-3",
 "Final Oct 10 William & Mary vs North Carolina A&T | L, 1-3",
 "Final Oct 16 William & Mary at Elon | L, 0-3",
 "Final Oct 17 William & Mary at Elon | W, 3-0",
 "Final Oct 22 William & Mary vs Hofstra | L, 1-3",
 "Today Oct 23, 4:00 PM William & Mary vs Hofstra | ",
 "Upcoming Oct 30, 6:00 PM William & Mary at Charleston | ",
 "Upcoming Oct 31, 2:00 PM William & Mary at Charleston | ",
 "Upcoming Nov 6, 6:00 PM William & Mary vs Hampton | ",
 "Upcoming Nov 8, 12:00 PM William & Mary vs Hampton | ",
 "Upcoming Nov 14, 2:00 PM William & Mary at Northeastern | ",
 "Upcoming Nov 15, 2:00 PM William & Mary at Northeastern | ",
 "Upcoming Nov 19 William & Mary at CAA Quarterfinals | ",
 "Upcoming Nov 20 William & Mary at CAA Semifinals | ",
 "Upcoming Nov 21 William & Mary at CAA Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("William & Mary module checks passed");
