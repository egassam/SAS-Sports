import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {libertySchool} from '../src/schools/liberty.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='liberty');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,libertyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/liberty-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit libertyflames.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['liberty'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',libertySchool.scheduleUrls],['roster',libertySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('liberty|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'libertyflames.com',`${key} must stay on libertyflames.com`);
  }
}
const parity={"Baseball":{"schedule":["https://libertyflames.com/sports/baseball/schedule"],"roster":["https://libertyflames.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://libertyflames.com/sports/mens-basketball/schedule","https://libertyflames.com/sports/womens-basketball/schedule"],"roster":["https://libertyflames.com/sports/mens-basketball/roster","https://libertyflames.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://libertyflames.com/sports/cross-country/schedule"],"roster":["https://libertyflames.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://libertyflames.com/sports/field-hockey/schedule"],"roster":["https://libertyflames.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://libertyflames.com/sports/football/schedule"],"roster":["https://libertyflames.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://libertyflames.com/sports/mens-golf/schedule"],"roster":["https://libertyflames.com/sports/mens-golf/roster"],"combined":false},"Lacrosse":{"schedule":["https://libertyflames.com/sports/womens-lacrosse/schedule"],"roster":["https://libertyflames.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://libertyflames.com/sports/womens-soccer/schedule","https://libertyflames.com/sports/mens-soccer/schedule"],"roster":["https://libertyflames.com/sports/womens-soccer/roster","https://libertyflames.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://libertyflames.com/sports/softball/schedule"],"roster":["https://libertyflames.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://libertyflames.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://libertyflames.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://libertyflames.com/sports/womens-tennis/schedule","https://libertyflames.com/sports/mens-tennis/schedule"],"roster":["https://libertyflames.com/sports/womens-tennis/roster","https://libertyflames.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://libertyflames.com/sports/track-and-field/schedule"],"roster":["https://libertyflames.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://libertyflames.com/sports/womens-volleyball/schedule"],"roster":["https://libertyflames.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'liberty|"+sport+"':"),`${sport} routes must live in the Liberty module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://libertyflames.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.libertyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=liberty)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 12:00 AM Men's · Liberty vs High Point | ",
 "Upcoming Nov 7, 2:00 PM Men's · Liberty vs Boyce | ",
 "Upcoming Nov 13, 7:30 PM Men's · Liberty vs NC Central | ",
 "Upcoming Nov 17, 6:00 PM Men's · Liberty vs Southern Illinois | ",
 "Upcoming Nov 20, 4:30 PM Men's · Liberty vs Rhode Island | ",
 "Upcoming Nov 22, 4:30 PM Men's · Liberty vs Richmond | ",
 "Upcoming Nov 25, 4:00 PM Men's · Liberty vs Princeton | ",
 "Upcoming Nov 27, 12:00 PM Men's · Liberty vs St. Thomas | ",
 "Upcoming Nov 28, 3:00 PM Men's · Liberty at UNCW | ",
 "Upcoming Dec 5, 1:00 PM Men's · Liberty vs Christendom | ",
 "Upcoming Dec 11, 7:00 PM Men's · Liberty vs Kentucky Christian | ",
 "Upcoming Dec 17, 7:00 PM Men's · Liberty vs Coppin State | ",
 "Upcoming Dec 19, 6:00 PM Men's · Liberty vs Dayton | ",
 "Upcoming Dec 22, 4:00 PM Men's · Liberty vs Maryland Eastern Shore | ",
 "Upcoming Jan 2, 6:00 PM Men's · Liberty vs Delaware | ",
 "Upcoming Jan 7, 9:00 PM Men's · Liberty at FIU | ",
 "Upcoming Jan 9, 3:00 PM Men's · Liberty at Missouri State | ",
 "Upcoming Jan 14, 8:30 PM Men's · Liberty vs Middle Tennessee | ",
 "Upcoming Jan 16, 12:00 PM Men's · Liberty vs Western Kentucky | ",
 "Upcoming Jan 21, 7:00 PM Men's · Liberty at Jacksonville State | ",
 "Upcoming Jan 23, 6:00 PM Men's · Liberty at Kennesaw State | ",
 "Upcoming Jan 28, 8:30 PM Men's · Liberty vs Sam Houston | ",
 "Upcoming Jan 30, 4:00 PM Men's · Liberty vs New Mexico State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Liberty vs Missouri State | ",
 "Upcoming Feb 6, 6:00 PM Men's · Liberty vs FIU | ",
 "Upcoming Feb 11, 9:00 PM Men's · Liberty at Western Kentucky | ",
 "Upcoming Feb 13, 4:00 PM Men's · Liberty at Middle Tennessee | ",
 "Upcoming Feb 18, 8:30 PM Men's · Liberty vs Kennesaw State | ",
 "Upcoming Feb 20, 6:00 PM Men's · Liberty vs Jacksonville State | ",
 "Upcoming Feb 25, 8:30 PM Men's · Liberty at New Mexico State | ",
 "Upcoming Feb 27, 4:00 PM Men's · Liberty at Sam Houston | ",
 "Upcoming Mar 6, 2:00 PM Men's · Liberty at Delaware | ",
 "Upcoming Mar 9 Men's · Liberty at Conference USA Men's Basketball Championship | ",
 "Upcoming Mar 13, 8:30 PM Men's · Liberty at Conference USA Men's Basketball Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · Liberty vs Frostburg State | ",
 "Upcoming Nov 7, 5:00 PM Women's · Liberty at East Carolina | ",
 "Upcoming Nov 11, 7:00 PM Women's · Liberty at NC State | ",
 "Upcoming Nov 17, 7:00 PM Women's · Liberty at North Carolina A&T | ",
 "Upcoming Nov 19, 11:00 AM Women's · Liberty at Elon | ",
 "Upcoming Nov 22, 2:00 PM Women's · Liberty vs Lees-McRae | ",
 "Upcoming Nov 28, 12:00 PM Women's · Liberty at Lehigh | ",
 "Upcoming Nov 29 Women's · Liberty vs Harvard/Pittsburgh | ",
 "Upcoming Dec 5, 4:00 PM Women's · Liberty vs George Mason | ",
 "Upcoming Dec 8, 7:00 PM Women's · Liberty vs James Madison | ",
 "Upcoming Dec 13, 2:00 PM Women's · Liberty at Richmond | ",
 "Upcoming Dec 16, 7:00 PM Women's · Liberty vs King | ",
 "Upcoming Dec 20, 2:00 PM Women's · Liberty vs Washington State | ",
 "Upcoming Dec 21, 11:00 AM Women's · Liberty vs Holy Cross/Saint Joseph's | ",
 "Upcoming Jan 2, 2:00 PM Women's · Liberty at Delaware | ",
 "Upcoming Jan 8, 7:00 PM Women's · Liberty vs FIU | ",
 "Upcoming Jan 10, 2:00 PM Women's · Liberty vs Missouri State | ",
 "Upcoming Jan 14, 7:00 PM Women's · Liberty at Middle Tennessee | ",
 "Upcoming Jan 16, 3:00 PM Women's · Liberty at Western Kentucky | ",
 "Upcoming Jan 21, 7:00 PM Women's · Liberty vs Jacksonville State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Liberty vs Kennesaw State | ",
 "Upcoming Jan 28, 7:30 PM Women's · Liberty at Sam Houston | ",
 "Upcoming Jan 30, 3:00 PM Women's · Liberty at New Mexico State | ",
 "Upcoming Feb 4, 7:30 PM Women's · Liberty at Missouri State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Liberty at FIU | ",
 "Upcoming Feb 11, 7:00 PM Women's · Liberty vs Western Kentucky | ",
 "Upcoming Feb 13, 2:00 PM Women's · Liberty vs Middle Tennessee | ",
 "Upcoming Feb 18, 6:00 PM Women's · Liberty at Kennesaw State | ",
 "Upcoming Feb 20, 3:00 PM Women's · Liberty at Jacksonville State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Liberty vs New Mexico State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Liberty vs Sam Houston | ",
 "Upcoming Mar 6, 2:00 PM Women's · Liberty vs Delaware | ",
 "Upcoming Mar 9 Women's · Liberty at Conference USA Women's Basketball Championship | ",
 "Upcoming Mar 13, 5:30 PM Women's · Liberty at Conference USA Women's Basketball Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Liberty at Eye Opener | Women's team: 3rd / Men's team: 2nd",
 "Final Sep 11 Liberty at SU Twilight Open | No Team Score",
 "Final Sep 18 Liberty at adidas XC Challenge | Women's team: 3rd / Men's team: 3rd",
 "Final Oct 2 Liberty at Paul Short Run | Women's team: 1st / Men's team: 8th",
 "Final Oct 16 Liberty at Under Armour Pre-National Invitational | Women's team: 25th / Men's team: 39th",
 "Final Oct 17 Liberty at Roanoke XC Invitational | No Team Score",
 "Upcoming Oct 31, 10:00 AM Liberty at Conference USA Championships | ",
 "Upcoming Nov 13, 10:00 AM Liberty at NCAA Division I Southeast Regional Championships | ",
 "Upcoming Nov 21, 10:20 AM Liberty at NCAA Division I Cross Country Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Liberty at Maine | W, 5-0",
 "Final Aug 29 Liberty vs UMass | L, 2-3",
 "Final Sep 4 Liberty at Saint Joseph's | W, 5-1",
 "Final Sep 6 Liberty at James Madison | W, 2-1",
 "Final Sep 11 Liberty vs Virginia | L, 1-2",
 "Final Sep 13 Liberty vs Longwood | W, 8-0",
 "Final Sep 19 Liberty vs Miami (OH) | L, 4-5",
 "Final Sep 20 Liberty vs Appalachian State | W, 7-2",
 "Final Sep 25 Liberty at Connecticut | L, 2-3",
 "Final Oct 2 Liberty vs Old Dominion | W, 2-0",
 "Final Oct 4 Liberty at Richmond | W, 2-0",
 "Final Oct 9 Liberty vs Georgetown | W, 4-2",
 "Final Oct 11 Liberty vs North Carolina | W, 2-1",
 "Final Oct 16 Liberty at Providence | W, 3-1",
 "Upcoming Oct 23, 2:00 PM Liberty vs Temple | ",
 "Upcoming Oct 25, 1:00 PM Liberty vs Duke | ",
 "Upcoming Oct 30, 12:00 PM Liberty at Villanova | ",
 "Upcoming Nov 6 Liberty at BIG EAST Field Hockey Championship | ",
 "Upcoming Nov 8 Liberty at BIG EAST Field Hockey Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Liberty at James Madison | L, 13-20",
 "Final Sep 12 Liberty vs Gardner-Webb | W, 24-23",
 "Final Sep 19 Liberty vs Ball State | W, 51-15",
 "Final Sep 24 Liberty at Coastal Carolina | W, 34-17",
 "Final Oct 2 Liberty at Delaware | W, 30-14",
 "Final Oct 8 Liberty vs Sam Houston | W, 35-3",
 "Today Oct 22, 7:00 PM Liberty at Kennesaw State | ",
 "Upcoming Oct 31, 3:30 PM Liberty vs FIU | ",
 "Upcoming Nov 7, 5:00 PM Liberty at New Mexico State | ",
 "Upcoming Nov 14, 3:30 PM Liberty vs Middle Tennessee | ",
 "Upcoming Nov 21, 1:00 PM Liberty vs Western Kentucky | ",
 "Upcoming Nov 28, 2:00 PM Liberty at Missouri State | ",
 "Upcoming Dec 4, 7:00 PM Liberty at Conference USA | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Liberty at Visit Knoxville Collegiate | 10th of 17",
 "Final Sep 14 Liberty at Bearcat Invitational | 1st of 17",
 "Final Sep 28 Liberty at Bryan Bros Collegiate | 3rd of 16",
 "Final Oct 18 Liberty at Quail Valley Collegiate Invitational | 9th of 15",
 "Upcoming Feb 1 Liberty at Sea Best Invitational | ",
 "Upcoming Feb 13 Liberty at Gator Invitational | ",
 "Upcoming Mar 6 Liberty at The Hayt | ",
 "Upcoming Mar 14 Liberty at Michael A. Marino Classic | ",
 "Upcoming Mar 28 Liberty at Bull Bay Rodeo Intercollegiate | ",
 "Upcoming Apr 12 Liberty at Lewis Chitengwa Memorial | ",
 "Upcoming Apr 26 Liberty at CUSA Men’s Golf Championship | ",
 "Upcoming May 17 Liberty at NCAA Men’s Golf Regionals | ",
 "Upcoming May 28 Liberty at NCAA Men's Golf Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Liberty vs East Carolina | W, 2-0",
 "Final Aug 16 Women's · Liberty at Virginia | L, 0-2",
 "Final Aug 20 Women's · Liberty at Virginia Tech | T, 2-2",
 "Final Aug 23 Women's · Liberty at VCU | W, 1-0",
 "Final Aug 27 Women's · Liberty at Pitt | L, 0-1",
 "Final Aug 30 Women's · Liberty vs Charlotte | W, 2-0",
 "Final Sep 3 Women's · Liberty at William & Mary | W, 2-0",
 "Final Sep 6 Women's · Liberty vs George Mason | W, 4-3",
 "Final Sep 10 Women's · Liberty vs James Madison | W, 1-0",
 "Final Sep 13 Women's · Liberty vs Old Dominion | W, 2-1",
 "Final Sep 26 Women's · Liberty vs Western Kentucky | W, 1-0",
 "Final Oct 1 Women's · Liberty at Middle Tennessee | W, 2-1",
 "Final Oct 4 Women's · Liberty at New Mexico State | W, 3-0",
 "Final Oct 11 Women's · Liberty vs FIU | W, 1-0",
 "Final Oct 17 Women's · Liberty at Kennesaw State | W, 2-0",
 "Today Oct 22, 5:00 PM Women's · Liberty vs Delaware | ",
 "Upcoming Oct 25, 2:00 PM Women's · Liberty at Sam Houston | ",
 "Upcoming Nov 1, 1:00 PM Women's · Liberty vs Missouri State | ",
 "Upcoming Nov 8 Women's · Liberty at CUSA Championship Quarterfinal | ",
 "Upcoming Nov 10 Women's · Liberty at CUSA Championship Semifinal | ",
 "Upcoming Nov 13 Women's · Liberty at CUSA Championship Final | ",
 "Upcoming Nov 20 Women's · Liberty at NCAA Championship First Round | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Liberty at San Diego State | W, 2-1",
 "Final Aug 23 Men's · Liberty at San Diego | L, 1-3",
 "Final Aug 28 Men's · Liberty vs FGCU | L, 2-3",
 "Final Sep 2 Men's · Liberty at Georgia Southern | T, 1-1",
 "Final Sep 6 Men's · Liberty at American | W, 2-1",
 "Final Sep 12 Men's · Liberty at Virginia | L, 2-3",
 "Final Sep 19 Men's · Liberty at UNCG | L, 1-2",
 "Final Sep 22 Men's · Liberty at James Madison | T, 2-2",
 "Final Sep 26 Men's · Liberty vs Furman | W, 1-0",
 "Final Oct 3 Men's · Liberty vs Mercer | W, 3-0",
 "Final Oct 10 Men's · Liberty at ETSU | L, 0-2",
 "Final Oct 17 Men's · Liberty at Wofford | L, 0-4",
 "Final Oct 20 Men's · Liberty at Seton Hall | L, 0-2",
 "Upcoming Oct 27, 1:00 PM Men's · Liberty vs Oral Roberts | ",
 "Upcoming Oct 30, 3:00 PM Men's · Liberty vs VMI | ",
 "Upcoming Nov 3 Men's · Liberty at Southern Conference | ",
 "Upcoming Nov 5 Men's · Liberty at Southern Conference | ",
 "Upcoming Nov 8 Men's · Liberty at Southern Conference | ",
 "Upcoming Nov 13 Men's · Liberty at Southern Conference | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · Liberty vs Lynchburg (Exhibition) | Completed",
 "Final Oct 2 Women's · Liberty at Virginia Tech Tri Meet | Completed",
 "Final Oct 3 Women's · Liberty at Virginia Tech | L, 113-240",
 "Final Oct 3 Women's · Liberty vs Penn State | W, 240-111",
 "Final Oct 16 Women's · Liberty vs Rutgers/James Madison | Completed",
 "Final Oct 17 Women's · Liberty vs Rutgers | L, 153-200",
 "Final Oct 17 Women's · Liberty vs James Madison | W, 233-120",
 "Upcoming Oct 23, 12:00 PM Women's · Liberty at Miami (Fla.) | ",
 "Upcoming Oct 24, 10:00 AM Women's · Liberty at Vanderbilt | ",
 "Upcoming Oct 24, 3:00 PM Women's · Liberty at FIU | ",
 "Upcoming Nov 20 Women's · Liberty at TYR '85 Invite | ",
 "Upcoming Dec 9 Women's · Liberty at USA Diving Winter National Championships | ",
 "Upcoming Jan 15 Women's · Liberty at East Carolina | ",
 "Upcoming Jan 22 Women's · Liberty vs Campbell | ",
 "Upcoming Feb 17 Women's · Liberty at American Conference Swimming & Diving Championships | ",
 "Upcoming Mar 8 Women's · Liberty at NCAA Division I Zone A Diving Championships | ",
 "Upcoming Mar 17 Women's · Liberty at NCAA Division I Swimming & Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Liberty at ITA All American Championships | Completed",
 "Final Oct 2 Women's · Liberty at Martha Thorn Invitational | Completed",
 "Final Oct 10 Women's · Liberty at ITA Women's Hall of Fame Invite | Completed",
 "Final Oct 15 Women's · Liberty at ITA Atlantic Regional | Completed",
 "Upcoming Oct 30 Women's · Liberty at Wofford Invite | ",
 "Upcoming Nov 5 Women's · Liberty at ITA Conference Masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Liberty at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · Liberty at Liberty Dual | Completed",
 "Final Oct 8 Men's · Liberty at ITA Atlantic Regional | Completed",
 "Upcoming Nov 5 Men's · Liberty at ITA Sectionals | ",
 "Upcoming Nov 17 Men's · Liberty at NCAA Singles and Doubles Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 3 Liberty at Liberty Kickoff | ",
 "Upcoming Dec 4 Liberty at Sharon Colyear-Danville Season Opener | ",
 "Upcoming Jan 8 Liberty at The Burg Open | ",
 "Upcoming Jan 15 Liberty at Virginia Tech Invitational | ",
 "Upcoming Jan 22 Liberty at Liberty Open | ",
 "Upcoming Jan 29 Liberty at Brant Tolsma Elite Invitational Sponsored by Beynon | ",
 "Upcoming Feb 12 Liberty at David Hemery Valentine Invitational | ",
 "Upcoming Feb 12 Liberty at Tiger Paw Invitational | ",
 "Upcoming Feb 12 Liberty at Darius Dixon Memorial Invitational | ",
 "Upcoming Feb 26 Liberty at Conference USA Indoor Track Championships | ",
 "Upcoming Mar 12 Liberty at NCAA Division I Indoor Track Championships | ",
 "Upcoming Mar 20 Liberty at Virginia Opener | ",
 "Upcoming Mar 25 Liberty at Raleigh Relays | ",
 "Upcoming Mar 26 Liberty at Dr. Jack M. Toms Alumni Invitational | ",
 "Upcoming Apr 2 Liberty at Florida Relays | ",
 "Upcoming Apr 9 Liberty at Dennis Craddock Coaches Classic | ",
 "Upcoming Apr 14 Liberty at Bryan Clay Multis | ",
 "Upcoming Apr 15 Liberty at Wake Forest Invitational | ",
 "Upcoming Apr 16 Liberty at WildCat Invitational | ",
 "Upcoming Apr 16 Liberty at Virginia Challenge | ",
 "Upcoming Apr 23 Liberty at Charlotte Invitational | ",
 "Upcoming Apr 24 Liberty at The Hill City Twilight | ",
 "Upcoming Apr 30 Liberty at Torrin Lawrence Memorial | ",
 "Upcoming Apr 30 Liberty at East Coast Relays | ",
 "Upcoming May 5 Liberty at Liberty Twilight Qualifier | ",
 "Upcoming May 13 Liberty at Conference USA Outdoor Track Championships | ",
 "Upcoming May 26 Liberty at NCAA Division I East First Rounds | ",
 "Upcoming Jun 9 Liberty at NCAA Division I Outdoor Track Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Liberty vs Auburn | L, 0-3",
 "Final Aug 29 Liberty vs Akron | W, 3-1",
 "Final Aug 29 Liberty at ETSU | W, 3-2",
 "Final Sep 1 Liberty at Virginia | L, 1-3",
 "Final Sep 4 Liberty vs Lamar | W, 3-0",
 "Final Sep 6 Liberty vs High Point | L, 1-3",
 "Final Sep 8 Liberty at Radford | W, 3-0",
 "Final Sep 11 Liberty vs Army | L, 0-3",
 "Final Sep 11 Liberty at Hofstra | W, 3-2",
 "Final Sep 12 Liberty vs Fairfield | W, 3-1",
 "Final Sep 17 Liberty vs North Alabama | W, 3-0",
 "Final Sep 18 Liberty vs North Alabama | W, 3-0",
 "Final Sep 25 Liberty vs Middle Tennessee | L, 2-3",
 "Final Sep 26 Liberty vs Middle Tennessee | W, 3-1",
 "Final Oct 2 Liberty at Jacksonville State | W, 3-0",
 "Final Oct 3 Liberty at Jacksonville State | W, 3-0",
 "Final Oct 9 Liberty vs New Mexico State | W, 3-0",
 "Final Oct 10 Liberty vs New Mexico State | L, 0-3",
 "Final Oct 16 Liberty at FIU | L, 0-3",
 "Final Oct 17 Liberty at FIU | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Liberty vs Sam Houston | ",
 "Upcoming Oct 24, 1:00 PM Liberty vs Sam Houston | ",
 "Upcoming Oct 30, 7:00 PM Liberty at Kennesaw State | ",
 "Upcoming Oct 31, 2:00 PM Liberty at Kennesaw State | ",
 "Upcoming Nov 6, 7:00 PM Liberty at Western Kentucky | ",
 "Upcoming Nov 7, 2:00 PM Liberty at Western Kentucky | ",
 "Upcoming Nov 12, 6:00 PM Liberty vs Delaware | ",
 "Upcoming Nov 13, 3:00 PM Liberty vs Delaware | ",
 "Upcoming Nov 20 Liberty at Conference USA Volleyball Championship | ",
 "Upcoming Nov 21 Liberty at Conference USA Volleyball Championship | ",
 "Upcoming Nov 22 Liberty at Conference USA Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Liberty module checks passed");
