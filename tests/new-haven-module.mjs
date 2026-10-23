import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {newHavenSchool} from '../src/schools/new-haven.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='new-haven');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,newHavenHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/new-haven-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit newhavenchargers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['new-haven'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',newHavenSchool.scheduleUrls],['roster',newHavenSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('new-haven|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'newhavenchargers.com',`${key} must stay on newhavenchargers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://newhavenchargers.com/sports/baseball/schedule"],"roster":["https://newhavenchargers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://newhavenchargers.com/sports/mens-basketball/schedule","https://newhavenchargers.com/sports/womens-basketball/schedule"],"roster":["https://newhavenchargers.com/sports/mens-basketball/roster","https://newhavenchargers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://newhavenchargers.com/sports/womens-cross-country/schedule","https://newhavenchargers.com/sports/mens-cross-country/schedule"],"roster":["https://newhavenchargers.com/sports/womens-cross-country/roster","https://newhavenchargers.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://newhavenchargers.com/sports/field-hockey/schedule"],"roster":["https://newhavenchargers.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://newhavenchargers.com/sports/football/schedule"],"roster":["https://newhavenchargers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://newhavenchargers.com/sports/womens-golf/schedule","https://newhavenchargers.com/sports/mens-golf/schedule"],"roster":["https://newhavenchargers.com/sports/womens-golf/roster","https://newhavenchargers.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://newhavenchargers.com/sports/womens-lacrosse/schedule"],"roster":["https://newhavenchargers.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://newhavenchargers.com/sports/womens-soccer/schedule","https://newhavenchargers.com/sports/mens-soccer/schedule"],"roster":["https://newhavenchargers.com/sports/womens-soccer/roster","https://newhavenchargers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://newhavenchargers.com/sports/softball/schedule"],"roster":["https://newhavenchargers.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://newhavenchargers.com/sports/womens-tennis/schedule"],"roster":["https://newhavenchargers.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://newhavenchargers.com/sports/womens-track-and-field/schedule","https://newhavenchargers.com/sports/mens-track-and-field/schedule"],"roster":["https://newhavenchargers.com/sports/womens-track-and-field/roster","https://newhavenchargers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://newhavenchargers.com/sports/womens-volleyball/schedule"],"roster":["https://newhavenchargers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'new-haven|"+sport+"':"),`${sport} routes must live in the New Haven module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://newhavenchargers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.newHavenHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=new-haven)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · New Haven at Syracuse | ",
 "Upcoming Nov 6, 7:00 PM Men's · New Haven at Rutgers | ",
 "Upcoming Nov 10, 7:00 PM Men's · New Haven vs Army | ",
 "Upcoming Nov 15, 4:30 PM Men's · New Haven at Penn State | ",
 "Upcoming Nov 18, 7:00 PM Men's · New Haven vs Massachusetts College of Liberal Arts | ",
 "Upcoming Nov 21 Men's · New Haven vs New Hampshire | ",
 "Upcoming Nov 24 Men's · New Haven vs Lindenwood | ",
 "Upcoming Nov 29, 1:00 PM Men's · New Haven vs Mitchell College | ",
 "Upcoming Dec 1 Men's · New Haven at Delaware State | ",
 "Upcoming Dec 4, 6:00 PM Men's · New Haven vs Columbia | ",
 "Upcoming Dec 6, 5:00 PM Men's · New Haven vs Medgar Evers College | ",
 "Upcoming Dec 9, 7:00 PM Men's · New Haven vs New Jersey Institute of Technology | ",
 "Upcoming Dec 18 Men's · New Haven at Stony Brook | ",
 "Upcoming Dec 20, 12:00 PM Men's · New Haven at Boston College | ",
 "Upcoming Dec 30, 2:00 PM Men's · New Haven at Nebraska | ",
 "Upcoming Jan 2, 1:00 PM Men's · New Haven vs Mercyhurst | ",
 "Upcoming Jan 4 Men's · New Haven vs LIU | ",
 "Upcoming Jan 8, 7:00 PM Men's · New Haven vs Wagner College | ",
 "Upcoming Jan 14 Men's · New Haven at Central Connecticut State | ",
 "Upcoming Jan 16, 2:00 PM Men's · New Haven at Chicago State | ",
 "Upcoming Jan 21, 7:00 PM Men's · New Haven vs FDU | ",
 "Upcoming Jan 23 Men's · New Haven at LIU | ",
 "Upcoming Jan 27, 7:00 PM Men's · New Haven at Stonehill College | ",
 "Upcoming Jan 30, 1:00 PM Men's · New Haven vs Central Connecticut State | ",
 "Upcoming Feb 3, 7:00 PM Men's · New Haven vs Le Moyne College | ",
 "Upcoming Feb 6, 1:00 PM Men's · New Haven at Wagner College | ",
 "Upcoming Feb 11, 7:00 PM Men's · New Haven at FDU | ",
 "Upcoming Feb 13, 1:00 PM Men's · New Haven vs Chicago State | ",
 "Upcoming Feb 18, 7:00 PM Men's · New Haven at Le Moyne College | ",
 "Upcoming Feb 20 Men's · New Haven at Mercyhurst | ",
 "Upcoming Feb 25, 7:00 PM Men's · New Haven vs Stonehill College | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · New Haven vs Mitchell College | ",
 "Upcoming Nov 10, 6:00 PM Women's · New Haven at Tennessee | ",
 "Upcoming Nov 15, 1:00 PM Women's · New Haven vs Siena College | ",
 "Upcoming Nov 18 Women's · New Haven at Iona | ",
 "Upcoming Nov 20, 6:00 PM Women's · New Haven at Rhode Island | ",
 "Upcoming Nov 24, 2:00 PM Women's · New Haven vs Sacred Heart | ",
 "Upcoming Nov 28, 2:00 PM Women's · New Haven at Massachusetts Lowell | ",
 "Upcoming Nov 30, 6:00 PM Women's · New Haven vs Dartmouth College | ",
 "Upcoming Dec 3, 6:00 PM Women's · New Haven vs Northeastern | ",
 "Upcoming Dec 6, 1:00 PM Women's · New Haven vs New Hampshire | ",
 "Upcoming Dec 9, 6:00 PM Women's · New Haven at Boston University | ",
 "Upcoming Dec 19, 1:00 PM Women's · New Haven vs Albertus Magnus College | ",
 "Upcoming Dec 22, 1:00 PM Women's · New Haven at St. John's | ",
 "Upcoming Dec 30, 5:00 PM Women's · New Haven at Yale | ",
 "Upcoming Jan 2, 5:00 PM Women's · New Haven at LIU | ",
 "Upcoming Jan 6, 7:00 PM Women's · New Haven at Wagner College | ",
 "Upcoming Jan 14, 6:00 PM Women's · New Haven vs Central Connecticut State | ",
 "Upcoming Jan 16, 1:00 PM Women's · New Haven vs Chicago State | ",
 "Upcoming Jan 20, 7:00 PM Women's · New Haven at FDU | ",
 "Upcoming Jan 23, 1:00 PM Women's · New Haven at Mercyhurst | ",
 "Upcoming Jan 28, 6:00 PM Women's · New Haven vs Stonehill College | ",
 "Upcoming Jan 30, 1:00 PM Women's · New Haven at Central Connecticut State | ",
 "Upcoming Feb 4, 6:00 PM Women's · New Haven at Le Moyne College | ",
 "Upcoming Feb 6, 1:00 PM Women's · New Haven vs Wagner College | ",
 "Upcoming Feb 11, 6:00 PM Women's · New Haven vs FDU | ",
 "Upcoming Feb 13, 1:00 PM Women's · New Haven at Chicago State | ",
 "Upcoming Feb 17, 6:00 PM Women's · New Haven vs Le Moyne College | ",
 "Upcoming Feb 20, 1:00 PM Women's · New Haven vs Mercyhurst | ",
 "Upcoming Feb 24, 6:00 PM Women's · New Haven at Stonehill College | ",
 "Upcoming Mar 4, 6:00 PM Women's · New Haven vs LIU | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · New Haven at Hartford XC Invitational | 3rd of 10",
 "Final Sep 19 Women's · New Haven at 53rd UMass Dartmouth XC Invitational | 19th of 33",
 "Final Oct 9 Women's · New Haven at NEICAAA Cross Country Championships | 14th of 22",
 "Upcoming Oct 31 Women's · New Haven at NEC Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · New Haven at Hartford XC Invitational | 5th of 11",
 "Final Sep 19 Men's · New Haven at 53rd UMass Dartmouth XC Invitational | 18th of 32",
 "Final Oct 9 Men's · New Haven at NEICAAA Cross Country Championships | 18th of 20",
 "Today Oct 23, 4:00 PM Men's · New Haven at CCSU Mini Meet | ",
 "Upcoming Oct 31 Men's · New Haven at NEC Cross Country Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 New Haven at Colgate | L, 0-5",
 "Final Aug 30 New Haven vs St. Thomas Aquinas College | W, 4-0",
 "Final Sep 4 New Haven at Providence College | L, 0-11",
 "Final Sep 6 New Haven at Villanova | L, 0-10",
 "Final Sep 11 New Haven at Massachusetts Lowell | L, 0-8",
 "Final Sep 20 New Haven vs La Salle | L, 0-8",
 "Final Sep 25 New Haven vs Rider | L, 1-4",
 "Final Sep 29 New Haven at LIU | L, 3-4",
 "Final Oct 2 New Haven vs Sacred Heart | L, 2-5",
 "Final Oct 9 New Haven vs Stonehill College | L, 1-2",
 "Final Oct 11 New Haven at New Hampshire | L, 0-2",
 "Final Oct 14 New Haven at Holy Cross | L, 0-8",
 "Final Oct 16 New Haven vs Merrimack College | W, 2-1",
 "Final Oct 18 New Haven at Mercyhurst | L, 1-3",
 "Final Oct 23 New Haven vs Quinnipiac | L, 0-6",
 "Upcoming Oct 25, 12:00 PM New Haven vs Maryville | ",
 "Upcoming Oct 30, 3:00 PM New Haven at Wagner College | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 New Haven vs Marist | W, 22-21",
 "Final Sep 5 New Haven vs Stonehill College | L, 3-21",
 "Final Sep 12 New Haven at South Dakota State | L, 14-57",
 "Final Sep 19 New Haven vs Brown | L, 10-17",
 "Final Sep 26 New Haven at Merrimack College | L, 10-17",
 "Final Oct 3 New Haven at Austin Peay State | L, 17-42",
 "Final Oct 17 New Haven at Robert Morris | W, 26-15",
 "Upcoming Oct 24, 12:00 PM New Haven at Central Connecticut State | ",
 "Upcoming Oct 31, 12:00 PM New Haven vs Duquesne | ",
 "Upcoming Nov 7, 12:00 PM New Haven vs LIU | ",
 "Upcoming Nov 14, 12:00 PM New Haven at Wagner College | ",
 "Upcoming Nov 21, 12:00 PM New Haven at Mercyhurst | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 12 Women's · New Haven at Bucknell Invitational | 12th of 16",
 "Final Sep 21 Women's · New Haven at Boston College Red Bandana Invitational | 15th of 15",
 "Final Sep 28 Women's · New Haven at Sacred Heart Fall Classic | 4th of 8",
 "Final Oct 11 Women's · New Haven at UAlbany Great Dane Invitational | 9th of 10",
 "Final Oct 19 Women's · New Haven at Holy Cross Crusader Classic | Completed",
 "Upcoming Oct 25 Women's · New Haven at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · New Haven at Boston College Red Bandana Invitational | 6th of 11",
 "Final Sep 19 Men's · New Haven at Brown University Ryan T. Lee Memorial Collegiate | T4th of 18",
 "Final Oct 12 Men's · New Haven at Sacred Heart Fall Classic | 8th of 11",
 "Final Oct 19 Men's · New Haven at Delaware Blue Hen Intercollegiate | Completed",
 "Upcoming Oct 26 Men's · New Haven at Iona University Wykagyl Collegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · New Haven at Stony Brook | L, 0-5",
 "Final Aug 20 Women's · New Haven at Brown | L, 0-4",
 "Final Aug 21 Women's · New Haven vs Monroe | T, 2-2",
 "Final Aug 27 Women's · New Haven at Sacred Heart | L, 0-1",
 "Final Aug 30 Women's · New Haven vs Seton Hall | L, 0-5",
 "Final Sep 6 Women's · New Haven vs Bryant | L, 0-1",
 "Final Sep 9 Women's · New Haven vs Saint Peter's | W, 2-1",
 "Final Sep 13 Women's · New Haven at Massachusetts Lowell | L, 0-1",
 "Final Sep 20 Women's · New Haven vs Howard | L, 1-2",
 "Final Sep 24 Women's · New Haven vs Stonehill College | L, 0-3",
 "Final Sep 27 Women's · New Haven at Mercyhurst | W, 1-0",
 "Final Oct 1 Women's · New Haven vs Wagner College | L, 0-3",
 "Final Oct 11 Women's · New Haven at Chicago State | W, 4-1",
 "Final Oct 15 Women's · New Haven at Central Connecticut State | L, 2-3",
 "Final Oct 18 Women's · New Haven vs FDU | T, 0-0",
 "Upcoming Oct 25, 1:00 PM Women's · New Haven vs LIU | ",
 "Upcoming Nov 1 Women's · New Haven at Delaware State | ",
 "Upcoming Nov 8, 1:00 PM Women's · New Haven at Le Moyne College | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · New Haven at Northwestern | L, 1-3",
 "Final Aug 24 Men's · New Haven at Maryland | L, 2-3",
 "Final Aug 28 Men's · New Haven at Brown | L, 0-2",
 "Final Sep 2 Men's · New Haven vs Quinnipiac | W, 2-0",
 "Final Sep 8 Men's · New Haven at New Hampshire | L, 2-6",
 "Final Sep 12 Men's · New Haven at Fairfield | L, 1-2",
 "Final Sep 15 Men's · New Haven at Boston College | L, 1-2",
 "Final Sep 22 Men's · New Haven at Yale | L, 0-2",
 "Final Sep 27 Men's · New Haven vs LIU | W, 3-1",
 "Final Oct 1 Men's · New Haven at Le Moyne College | T, 2-2",
 "Final Oct 6 Men's · New Haven at Villanova | L, 1-3",
 "Final Oct 11 Men's · New Haven vs Chicago State | T, 2-2",
 "Final Oct 18 Men's · New Haven at Mercyhurst | L, 0-1",
 "Upcoming Oct 25, 11:00 AM Men's · New Haven at Howard | ",
 "Upcoming Nov 1, 6:00 PM Men's · New Haven vs FDU | ",
 "Upcoming Nov 5, 6:00 PM Men's · New Haven at Central Connecticut State | ",
 "Upcoming Nov 8, 6:00 PM Men's · New Haven vs Stonehill College | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 New Haven at Quinnipiac Invitational | Completed",
 "Final Sep 18 New Haven at Hofstra Invitational | Completed",
 "Final Sep 25 New Haven at NEC Individuals - Binghamton | Completed",
 "Final Oct 8 New Haven at Yale ITA | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 New Haven at New Hampshire | L, 2-3",
 "Final Aug 29 New Haven vs Providence College | L, 0-3",
 "Final Aug 29 New Haven vs Saint Peter's | W, 3-1",
 "Final Sep 1 New Haven vs Holy Cross | L, 0-3",
 "Final Sep 4 New Haven vs Fordham | L, 1-3",
 "Final Sep 5 New Haven at Delaware | L, 0-3",
 "Final Sep 11 New Haven vs Temple | L, 0-3",
 "Final Sep 12 New Haven at Binghamton | L, 0-3",
 "Final Sep 12 New Haven vs Cornell | L, 0-3",
 "Final Sep 18 New Haven at New Jersey Institute of Technology | W, 3-1",
 "Final Sep 19 New Haven vs Seton Hall | W, 3-1",
 "Final Sep 19 New Haven vs Iona | W, 3-0",
 "Final Sep 20 New Haven vs Coppin State | L, 1-3",
 "Final Sep 23 New Haven at Marist | L, 0-3",
 "Final Oct 2 New Haven vs Central Connecticut State | W, 3-1",
 "Final Oct 3 New Haven vs Central Connecticut State | W, 3-1",
 "Final Oct 9 New Haven at Le Moyne College | W, 3-1",
 "Final Oct 10 New Haven at Le Moyne College | W, 3-0",
 "Final Oct 16 New Haven at LIU | L, 0-3",
 "Final Oct 17 New Haven at LIU | L, 0-3",
 "Today Oct 23, 6:00 PM New Haven vs Stonehill College | ",
 "Upcoming Oct 24, 1:00 PM New Haven vs Stonehill College | ",
 "Upcoming Oct 29, 3:00 PM New Haven vs Mercyhurst | ",
 "Upcoming Oct 30, 1:00 PM New Haven vs Mercyhurst | ",
 "Upcoming Nov 6, 6:00 PM New Haven at FDU | ",
 "Upcoming Nov 7, 5:00 PM New Haven at FDU | ",
 "Upcoming Nov 13, 6:00 PM New Haven vs Chicago State | ",
 "Upcoming Nov 14, 1:00 PM New Haven vs Chicago State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("New Haven module checks passed");
