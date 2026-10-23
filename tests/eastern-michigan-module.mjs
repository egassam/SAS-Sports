import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {easternMichiganSchool} from '../src/schools/eastern-michigan.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='eastern-michigan');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,easternMichiganHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/eastern-michigan-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit emueagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['eastern-michigan'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',easternMichiganSchool.scheduleUrls],['roster',easternMichiganSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('eastern-michigan|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'emueagles.com',`${key} must stay on emueagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://emueagles.com/sports/baseball/schedule"],"roster":["https://emueagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://emueagles.com/sports/mens-basketball/schedule","https://emueagles.com/sports/womens-basketball/schedule"],"roster":["https://emueagles.com/sports/mens-basketball/roster","https://emueagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://emueagles.com/sports/womens-cross-country/schedule","https://emueagles.com/sports/mens-cross-country/schedule"],"roster":["https://emueagles.com/sports/womens-cross-country/roster","https://emueagles.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://emueagles.com/sports/football/schedule"],"roster":["https://emueagles.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://emueagles.com/sports/womens-golf/schedule","https://emueagles.com/sports/mens-golf/schedule"],"roster":["https://emueagles.com/sports/womens-golf/roster","https://emueagles.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://emueagles.com/sports/womens-gymnastics/schedule"],"roster":["https://emueagles.com/sports/womens-gymnastics/roster"],"combined":false},"Lacrosse":{"schedule":["https://emueagles.com/sports/lacrosse/schedule"],"roster":["https://emueagles.com/sports/lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://emueagles.com/sports/womens-rowing/schedule"],"roster":["https://emueagles.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://emueagles.com/sports/womens-soccer/schedule"],"roster":["https://emueagles.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://emueagles.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://emueagles.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://emueagles.com/sports/womens-tennis/schedule"],"roster":["https://emueagles.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://emueagles.com/sports/womens-track-and-field/schedule","https://emueagles.com/sports/mens-track-and-field/schedule"],"roster":["https://emueagles.com/sports/womens-track-and-field/roster","https://emueagles.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://emueagles.com/sports/womens-volleyball/schedule"],"roster":["https://emueagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'eastern-michigan|"+sport+"':"),`${sport} routes must live in the Eastern Michigan module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://emueagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.easternMichiganHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=eastern-michigan)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · Eastern Michigan at Michigan (Exhibition) | L, 62-87",
 "Upcoming Nov 2, 7:00 PM Men's · Eastern Michigan at Coastal Carolina | ",
 "Upcoming Nov 6, 7:00 PM Men's · Eastern Michigan at Xavier | ",
 "Upcoming Nov 11, 6:30 PM Men's · Eastern Michigan vs Great Lakes Christian | ",
 "Upcoming Nov 18, 6:30 PM Men's · Eastern Michigan vs Detroit Mercy | ",
 "Upcoming Nov 21, 1:00 PM Men's · Eastern Michigan vs Denver | ",
 "Upcoming Nov 24, 6:00 PM Men's · Eastern Michigan vs Kennesaw State | ",
 "Upcoming Nov 25 Men's · Eastern Michigan vs UTEP/College of Charleston | ",
 "Upcoming Dec 2, 6:30 PM Men's · Eastern Michigan vs UMass | ",
 "Upcoming Dec 5, 1:00 PM Men's · Eastern Michigan at Ball State | ",
 "Upcoming Dec 9 Men's · Eastern Michigan at Toledo | ",
 "Upcoming Dec 12, 2:00 PM Men's · Eastern Michigan vs Central Michigan | ",
 "Upcoming Dec 19, 1:30 PM Men's · Eastern Michigan at Louisville | ",
 "Upcoming Dec 21, 6:30 PM Men's · Eastern Michigan vs Grace Christian | ",
 "Upcoming Jan 2, 2:00 PM Men's · Eastern Michigan at Miami | ",
 "Upcoming Jan 5 Men's · Eastern Michigan at Western Michigan | ",
 "Upcoming Jan 9, 3:30 PM Men's · Eastern Michigan vs Bowling Green | ",
 "Upcoming Jan 12, 6:30 PM Men's · Eastern Michigan vs Akron | ",
 "Upcoming Jan 16 Men's · Eastern Michigan at Ohio | ",
 "Upcoming Jan 19, 6:30 PM Men's · Eastern Michigan vs Kent State | ",
 "Upcoming Jan 23, 3:30 PM Men's · Eastern Michigan vs Ball State | ",
 "Upcoming Jan 26 Men's · Eastern Michigan at Buffalo | ",
 "Upcoming Jan 30, 2:00 PM Men's · Eastern Michigan vs Western Michigan | ",
 "Upcoming Feb 2, 6:30 PM Men's · Eastern Michigan vs Toledo | ",
 "Upcoming Feb 6, 2:00 PM Men's · Eastern Michigan at Sun Belt Conference | ",
 "Upcoming Feb 9, 7:00 PM Men's · Eastern Michigan at Central Michigan | ",
 "Upcoming Feb 13, 12:30 PM Men's · Eastern Michigan at Massachusetts | ",
 "Upcoming Feb 16, 6:30 PM Men's · Eastern Michigan vs Ohio | ",
 "Upcoming Feb 20 Men's · Eastern Michigan at Akron | ",
 "Upcoming Feb 23, 6:30 PM Men's · Eastern Michigan vs Miami | ",
 "Upcoming Feb 27, 3:30 PM Men's · Eastern Michigan vs Buffalo | ",
 "Upcoming Mar 2 Men's · Eastern Michigan at Kent State | ",
 "Upcoming Mar 5 Men's · Eastern Michigan at Bowling Green | ",
 "Upcoming Mar 10 Men's · Eastern Michigan at MAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Eastern Michigan vs Appalachian State | ",
 "Upcoming Nov 5, 7:00 PM Women's · Eastern Michigan at Purdue | ",
 "Upcoming Nov 11, 6:00 PM Women's · Eastern Michigan at Robert Morris | ",
 "Upcoming Nov 15, 12:00 PM Women's · Eastern Michigan at Kentucky | ",
 "Upcoming Nov 18, 6:30 PM Women's · Eastern Michigan at Oakland | ",
 "Upcoming Nov 22, 2:00 PM Women's · Eastern Michigan at Butler | ",
 "Upcoming Nov 29, 2:00 PM Women's · Eastern Michigan at Michigan State | ",
 "Upcoming Dec 6, 1:00 PM Women's · Eastern Michigan vs Canisius | ",
 "Upcoming Dec 9, 6:00 PM Women's · Eastern Michigan at Duquesne | ",
 "Upcoming Dec 13, 1:00 PM Women's · Eastern Michigan vs Valparaiso | ",
 "Upcoming Dec 18, 7:00 PM Women's · Eastern Michigan at Purdue Fort Wayne | ",
 "Upcoming Dec 20, 2:00 PM Women's · Eastern Michigan vs Defiance | ",
 "Upcoming Dec 29, 6:30 PM Women's · Eastern Michigan vs Davenport | ",
 "Upcoming Jan 2, 1:00 PM Women's · Eastern Michigan at Western Michigan | ",
 "Upcoming Jan 6, 6:30 PM Women's · Eastern Michigan vs Kent State | ",
 "Upcoming Jan 9, 1:00 PM Women's · Eastern Michigan vs Ohio | ",
 "Upcoming Jan 13, 6:30 PM Women's · Eastern Michigan at Central Michigan | ",
 "Upcoming Jan 16, 12:00 PM Women's · Eastern Michigan at Buffalo | ",
 "Upcoming Jan 20, 6:30 PM Women's · Eastern Michigan vs Bowling Green | ",
 "Upcoming Jan 23, 1:00 PM Women's · Eastern Michigan vs Akron | ",
 "Upcoming Jan 27, 6:30 PM Women's · Eastern Michigan at Ball State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Eastern Michigan at Toledo | ",
 "Upcoming Feb 3, 5:00 PM Women's · Eastern Michigan vs Buffalo | ",
 "Upcoming Feb 6 Women's · Eastern Michigan at Sun Belt Conference | ",
 "Upcoming Feb 10, 6:00 PM Women's · Eastern Michigan at Massachusetts | ",
 "Upcoming Feb 13, 2:00 PM Women's · Eastern Michigan vs Miami | ",
 "Upcoming Feb 17, 6:30 PM Women's · Eastern Michigan vs Western Michigan | ",
 "Upcoming Feb 20, 1:00 PM Women's · Eastern Michigan at Ohio | ",
 "Upcoming Feb 24, 7:00 PM Women's · Eastern Michigan at Bowling Green | ",
 "Upcoming Feb 27, 1:00 PM Women's · Eastern Michigan vs Central Michigan | ",
 "Upcoming Mar 3, 6:30 PM Women's · Eastern Michigan vs Toledo | ",
 "Upcoming Mar 6, 1:00 PM Women's · Eastern Michigan at Kent State | ",
 "Upcoming Mar 10 Women's · Eastern Michigan at MAC Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Eastern Michigan at Jeff Drenth Memorial | 3rd · 62 pts",
 "Final Sep 18 Women's · Eastern Michigan at George Dales Invitational | 7th · 163 pts",
 "Final Oct 2 Women's · Eastern Michigan at Joe Piane Invitational | 5th · 186 pts",
 "Final Oct 16 Women's · Eastern Michigan at Pre-National Invitational | 9th · 252 pts",
 "Upcoming Oct 23, 5:00 PM Women's · Eastern Michigan at EMU Fall Classic | ",
 "Upcoming Oct 30, 11:00 AM Women's · Eastern Michigan at MAC Championships | ",
 "Upcoming Nov 13, 10:00 AM Women's · Eastern Michigan at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Women's · Eastern Michigan at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Eastern Michigan at Jeff Drenth Memorial | Completed",
 "Final Sep 11 Men's · Eastern Michigan at Spartan Invitational | 6th · 184 pts",
 "Final Oct 2 Men's · Eastern Michigan at Joe Piane Invitational | 10th · 286 pts",
 "Final Oct 16 Men's · Eastern Michigan at Pre-National Invitational | 35th · 977 pts",
 "Upcoming Oct 23, 4:30 PM Men's · Eastern Michigan at EMU Fall Classic | ",
 "Upcoming Oct 30, 12:00 PM Men's · Eastern Michigan at MAC Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · Eastern Michigan at NCAA Great Lakes Regional | ",
 "Upcoming Nov 21 Men's · Eastern Michigan at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Eastern Michigan vs Sacramento State | W, 28-17",
 "Final Sep 4 Eastern Michigan vs San Jose State | L, 21-27",
 "Final Sep 12 Eastern Michigan at Michigan State | L, 7-35",
 "Final Sep 19 Eastern Michigan at Wisconsin | L, 10-54",
 "Final Sep 26 Eastern Michigan vs Lindenwood | W, 29-3",
 "Final Oct 3 Eastern Michigan at Massachusetts | W, 38-14",
 "Final Oct 10 Eastern Michigan at Akron | W, 25-23",
 "Final Oct 17 Eastern Michigan vs Toledo | L, 14-34",
 "Upcoming Oct 24, 4:00 PM Eastern Michigan at Ohio | ",
 "Upcoming Nov 4 Eastern Michigan vs Central Michigan | ",
 "Upcoming Nov 17, 7:00 PM Eastern Michigan at Western Michigan | ",
 "Upcoming Nov 24, 7:00 PM Eastern Michigan vs Kent State | ",
 "Upcoming Dec 5, 12:00 PM Eastern Michigan at MAC Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Eastern Michigan at Leadership & Golf Invitational | 1st",
 "Final Sep 21 Women's · Eastern Michigan at Golfweek Red Sky Classic | 6th",
 "Final Oct 5 Women's · Eastern Michigan at Oklahoma Intercollegiate | 6th",
 "Final Oct 19 Women's · Eastern Michigan at Rainbow Wahine Invitational | T4th",
 "Upcoming Oct 26, 10:30 AM Women's · Eastern Michigan at East Lake Cup | ",
 "Upcoming Feb 13, 8:00 AM Women's · Eastern Michigan at Alice & John Wallace Golf Classic | ",
 "Upcoming Feb 22, 8:00 AM Women's · Eastern Michigan at Bruin Wave Invitational | ",
 "Upcoming Mar 6, 8:00 AM Women's · Eastern Michigan at Gators Invitational | ",
 "Upcoming Mar 15, 8:00 AM Women's · Eastern Michigan at GameAbove Golf Invitational | ",
 "Upcoming Mar 21, 8:00 AM Women's · Eastern Michigan at Florida State Match Up | ",
 "Upcoming Apr 5, 8:00 AM Women's · Eastern Michigan at Huntington Bank Collegiate | ",
 "Upcoming Apr 25, 8:00 AM Women's · Eastern Michigan at Mid-American Conference Championship | ",
 "Upcoming May 10, 8:00 AM Women's · Eastern Michigan at NCAA Regionals | ",
 "Upcoming May 21, 8:00 AM Women's · Eastern Michigan at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Eastern Michigan at Bombs Darts Birds Collegiate | T5th",
 "Final Sep 21 Men's · Eastern Michigan at Highlands Invitational | 3rd",
 "Final Oct 5 Men's · Eastern Michigan at Nemacolin Collegiate | 2nd",
 "Final Oct 5 Men's · Eastern Michigan at Shepherd's Rock Individual | Completed",
 "Final Oct 19 Men's · Eastern Michigan at Bank of Tennessee Invitational | 2nd",
 "Upcoming Feb 15, 8:00 AM Men's · Eastern Michigan at The Prestige - Team | ",
 "Upcoming Feb 15, 8:00 AM Men's · Eastern Michigan at The Prestige - Individual | ",
 "Upcoming Feb 22, 8:00 AM Men's · Eastern Michigan at Wyoming Desert Collegiate | ",
 "Upcoming Mar 1, 8:00 AM Men's · Eastern Michigan at Sam Ryder Collegiate | ",
 "Upcoming Mar 21, 8:00 AM Men's · Eastern Michigan at Players Collegiate | ",
 "Upcoming Apr 4, 8:00 AM Men's · Eastern Michigan at Calusa Cup | ",
 "Upcoming Apr 12, 8:00 AM Men's · Eastern Michigan at The Mountaineer - Team | ",
 "Upcoming Apr 12, 8:00 AM Men's · Eastern Michigan at The Mountaineer - Individual | ",
 "Upcoming Apr 30, 8:00 AM Men's · Eastern Michigan at Mid-American Conference Championships | ",
 "Upcoming May 17, 8:00 AM Men's · Eastern Michigan at NCAA Regional | ",
 "Upcoming May 28, 8:00 AM Men's · Eastern Michigan at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[
 "Upcoming Jan 10, 1:00 PM Eastern Michigan at Bowling Green | ",
 "Upcoming Jan 17, 1:00 PM Eastern Michigan at Ball State | ",
 "Upcoming Jan 17, 1:00 PM Eastern Michigan at Wisconsin-Whitewater | ",
 "Upcoming Jan 17, 1:00 PM Eastern Michigan at Central Michigan | ",
 "Upcoming Jan 24, 1:00 PM Eastern Michigan at Western Michigan | ",
 "Upcoming Jan 31, 1:00 PM Eastern Michigan at Central Michigan | ",
 "Upcoming Feb 5 Eastern Michigan at Illinois State | ",
 "Upcoming Feb 5 Eastern Michigan at Centenary College | ",
 "Upcoming Feb 14, 1:00 PM Eastern Michigan at Illinois State | ",
 "Upcoming Feb 14, 1:00 PM Eastern Michigan at SEMO | ",
 "Upcoming Feb 19 Eastern Michigan at Arizona | ",
 "Upcoming Feb 28, 2:00 PM Eastern Michigan at West Virginia | ",
 "Upcoming Feb 28, 2:00 PM Eastern Michigan at Temple | ",
 "Upcoming Mar 7 Eastern Michigan at Michigan State | ",
 "Upcoming Mar 13, 2:00 PM Eastern Michigan at Kent State | ",
 "Upcoming Mar 20, 2:00 PM Eastern Michigan at MAC Championships | ",
 "Upcoming Apr 1 Eastern Michigan at NCAA Regionals | ",
 "Upcoming Apr 15 Eastern Michigan at NCAA Championships | "
]);
  const v_lacrosse=parse("Lacrosse","lacrosse");
  assert.deepEqual(v_lacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Eastern Michigan vs Duquesne | W, 3-1",
 "Final Aug 16 Eastern Michigan at Detroit Mercy | L, 0-1",
 "Final Aug 27 Eastern Michigan at Michigan State | T, 0-0",
 "Final Aug 30 Eastern Michigan at Robert Morris | T, 0-0",
 "Final Sep 6 Eastern Michigan vs Southern Indiana | W, 3-1",
 "Final Sep 10 Eastern Michigan at Milwaukee | T, 0-0",
 "Final Sep 17 Eastern Michigan at Bowling Green | T, 0-0",
 "Final Sep 20 Eastern Michigan vs Central Michigan | W, 3-0",
 "Final Sep 27 Eastern Michigan at Buffalo | W, 2-0",
 "Final Oct 1 Eastern Michigan at Ball State | W, 1-0",
 "Final Oct 4 Eastern Michigan vs Kent State | W, 2-1",
 "Final Oct 11 Eastern Michigan vs Miami | L, 1-3",
 "Final Oct 15 Eastern Michigan vs Western Michigan | L, 1-3",
 "Final Oct 18 Eastern Michigan at Ohio | L, 0-1",
 "Upcoming Oct 24, 1:00 PM Eastern Michigan vs Toledo | ",
 "Upcoming Oct 29, 6:30 PM Eastern Michigan at Akron | ",
 "Upcoming Nov 1, 12:00 PM Eastern Michigan vs Massachusetts | ",
 "Upcoming Nov 7 Eastern Michigan at MAC Tournament | ",
 "Upcoming Nov 13 Eastern Michigan at MAC Tournament | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 16 Women's · Eastern Michigan vs Toledo | W, 217.5-144.5",
 "Final Oct 16 Women's · Eastern Michigan vs Aquinas | W, 274-84",
 "Final Oct 16 Women's · Eastern Michigan vs Wayne State | W, 257-106",
 "Upcoming Oct 30, 5:00 PM Women's · Eastern Michigan vs Buffalo | ",
 "Upcoming Nov 13, 5:00 PM Women's · Eastern Michigan vs Calvin | ",
 "Upcoming Nov 19, 4:00 PM Women's · Eastern Michigan vs Oakland | ",
 "Upcoming Dec 2 Women's · Eastern Michigan at Golden Grizzly Classic | ",
 "Upcoming Jan 16, 11:00 AM Women's · Eastern Michigan vs Ohio | ",
 "Upcoming Jan 30, 1:00 PM Women's · Eastern Michigan at Toledo | ",
 "Upcoming Feb 6, 1:00 PM Women's · Eastern Michigan vs Senior Day Extravaganza (Exhibition) | ",
 "Upcoming Feb 24 Women's · Eastern Michigan at MAC Championships | ",
 "Upcoming Mar 8 Women's · Eastern Michigan at NCAA Zone Diving Championships | ",
 "Upcoming Mar 11 Women's · Eastern Michigan at CSCAA Championships | ",
 "Upcoming Mar 17 Women's · Eastern Michigan at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Eastern Michigan at EMU Hidden Duals | Completed",
 "Final Oct 2 Eastern Michigan at Spartan Invitational | Completed",
 "Final Oct 8 Eastern Michigan at ITA Midwest Regional | Completed",
 "Upcoming Oct 23, 9:00 AM Eastern Michigan at MAC Individual Championships | ",
 "Upcoming Nov 6, 9:00 AM Eastern Michigan at Michigan State Classic | ",
 "Upcoming Jan 16 Eastern Michigan at Cleveland State | ",
 "Upcoming Jan 22 Eastern Michigan vs Eastern Kentucky | ",
 "Upcoming Jan 24 Eastern Michigan vs Ferris State | ",
 "Upcoming Jan 29 Eastern Michigan at Butler | ",
 "Upcoming Feb 6 Eastern Michigan at Michigan State | ",
 "Upcoming Feb 12 Eastern Michigan at UIC | ",
 "Upcoming Feb 13 Eastern Michigan at Northwestern | ",
 "Upcoming Feb 20 Eastern Michigan vs Youngstown State | ",
 "Upcoming Feb 26 Eastern Michigan at Xavier | ",
 "Upcoming Feb 28 Eastern Michigan at Murray State | ",
 "Upcoming Mar 2 Eastern Michigan at Austin Peay | ",
 "Upcoming Mar 12 Eastern Michigan vs Bowling Green | ",
 "Upcoming Mar 14 Eastern Michigan vs Oakland | ",
 "Upcoming Mar 19 Eastern Michigan at Toledo | ",
 "Upcoming Mar 20 Eastern Michigan vs Valparaiso | ",
 "Upcoming Mar 26 Eastern Michigan at Western Michigan | ",
 "Upcoming Apr 2 Eastern Michigan vs Massachusetts | ",
 "Upcoming Apr 9 Eastern Michigan vs Ball State | ",
 "Upcoming Apr 16 Eastern Michigan vs Miami | ",
 "Upcoming Apr 22 Eastern Michigan at Buffalo | ",
 "Upcoming May 1 Eastern Michigan at MAC Tournament (Semifinal) | ",
 "Upcoming May 2 Eastern Michigan at MAC Tournament (Final) | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Eastern Michigan vs Northern Illinois | W, 3-2",
 "Final Aug 28 Eastern Michigan at Southern Indiana | W, 3-1",
 "Final Aug 29 Eastern Michigan vs Murray State | W, 3-0",
 "Final Sep 4 Eastern Michigan at Duquesne | L, 0-3",
 "Final Sep 4 Eastern Michigan at Robert Morris | W, 3-0",
 "Final Sep 5 Eastern Michigan vs Elon | W, 3-0",
 "Final Sep 6 Eastern Michigan vs Illinois State | L, 2-3",
 "Final Sep 11 Eastern Michigan vs Montana | W, 3-0",
 "Final Sep 11 Eastern Michigan vs UAB | L, 1-3",
 "Final Sep 12 Eastern Michigan at Oakland | L, 0-3",
 "Final Sep 17 Eastern Michigan at Michigan | L, 1-3",
 "Final Sep 18 Eastern Michigan vs Cornell | L, 1-3",
 "Final Sep 22 Eastern Michigan at Central Michigan | W, 3-0",
 "Final Sep 25 Eastern Michigan vs Ohio | L, 1-3",
 "Final Oct 2 Eastern Michigan at Western Michigan | L, 0-3",
 "Final Oct 3 Eastern Michigan vs Central Michigan | W, 3-0",
 "Final Oct 9 Eastern Michigan at Buffalo | L, 2-3",
 "Final Oct 10 Eastern Michigan at Buffalo | L, 1-3",
 "Final Oct 15 Eastern Michigan vs Miami | L, 1-3",
 "Final Oct 16 Eastern Michigan vs Miami | L, 0-3",
 "Today Oct 22, 6:00 PM Eastern Michigan at Kent State | ",
 "Upcoming Oct 23, 6:00 PM Eastern Michigan at Kent State | ",
 "Upcoming Oct 30, 6:00 PM Eastern Michigan vs Akron | ",
 "Upcoming Oct 31, 4:00 PM Eastern Michigan vs Akron | ",
 "Upcoming Nov 3, 6:00 PM Eastern Michigan vs Western Michigan | ",
 "Upcoming Nov 6, 6:00 PM Eastern Michigan at Toledo | ",
 "Upcoming Nov 13, 6:30 PM Eastern Michigan at Bowling Green | ",
 "Upcoming Nov 14, 4:00 PM Eastern Michigan vs Ball State | ",
 "Upcoming Nov 20 Eastern Michigan at MAC Tournament Quarterfinals | ",
 "Upcoming Nov 21 Eastern Michigan at MAC Tournament Semifinals | ",
 "Upcoming Nov 22 Eastern Michigan at MAC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_lacrosse,"Lacrosse lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Eastern Michigan module checks passed");
