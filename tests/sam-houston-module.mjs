import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {samHoustonSchool} from '../src/schools/sam-houston.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='sam-houston');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,samHoustonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/sam-houston-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobearkats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['sam-houston'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',samHoustonSchool.scheduleUrls],['roster',samHoustonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('sam-houston|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobearkats.com',`${key} must stay on gobearkats.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gobearkats.com/sports/baseball/schedule"],"roster":["https://gobearkats.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobearkats.com/sports/mens-basketball/schedule","https://gobearkats.com/sports/womens-basketball/schedule"],"roster":["https://gobearkats.com/sports/mens-basketball/roster","https://gobearkats.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://gobearkats.com/sports/womens-bowling/schedule"],"roster":["https://gobearkats.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://gobearkats.com/sports/womens-cross-country/schedule","https://gobearkats.com/sports/mens-cross-country/schedule"],"roster":["https://gobearkats.com/sports/womens-cross-country/roster","https://gobearkats.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://gobearkats.com/sports/football/schedule"],"roster":["https://gobearkats.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gobearkats.com/sports/womens-golf/schedule","https://gobearkats.com/sports/mens-golf/schedule"],"roster":["https://gobearkats.com/sports/womens-golf/roster","https://gobearkats.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://gobearkats.com/sports/womens-soccer/schedule"],"roster":["https://gobearkats.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gobearkats.com/sports/softball/schedule"],"roster":["https://gobearkats.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gobearkats.com/sports/womens-tennis/schedule"],"roster":["https://gobearkats.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://gobearkats.com/sports/womens-track-and-field/schedule","https://gobearkats.com/sports/mens-track-and-field/schedule"],"roster":["https://gobearkats.com/sports/womens-track-and-field/roster","https://gobearkats.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://gobearkats.com/sports/womens-volleyball/schedule"],"roster":["https://gobearkats.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'sam-houston|"+sport+"':"),`${sport} routes must live in the Sam Houston module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gobearkats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.samHoustonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=sam-houston)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 2:00 PM Sam Houston vs Baylor | ",
 "Upcoming Oct 30, 4:30 PM Sam Houston at Dallas Baptist | ",
 "Upcoming Mar 25 Sam Houston vs Missouri State | ",
 "Upcoming Mar 26 Sam Houston vs Missouri State | ",
 "Upcoming Mar 27 Sam Houston vs Missouri State | ",
 "Upcoming Apr 2 Sam Houston at Delaware | ",
 "Upcoming Apr 3 Sam Houston at Delaware | ",
 "Upcoming Apr 4 Sam Houston at Delaware | ",
 "Upcoming Apr 9 Sam Houston at Jax State | ",
 "Upcoming Apr 10 Sam Houston at Jax State | ",
 "Upcoming Apr 11 Sam Houston at Jax State | ",
 "Upcoming Apr 16 Sam Houston vs NM State | ",
 "Upcoming Apr 17 Sam Houston vs NM State | ",
 "Upcoming Apr 18 Sam Houston vs NM State | ",
 "Upcoming Apr 23 Sam Houston at WKU | ",
 "Upcoming Apr 24 Sam Houston at WKU | ",
 "Upcoming Apr 25 Sam Houston at WKU | ",
 "Upcoming Apr 30 Sam Houston vs Liberty | ",
 "Upcoming May 1 Sam Houston vs Liberty | ",
 "Upcoming May 2 Sam Houston vs Liberty | ",
 "Upcoming May 7 Sam Houston vs FIU | ",
 "Upcoming May 8 Sam Houston vs FIU | ",
 "Upcoming May 9 Sam Houston vs FIU | ",
 "Upcoming May 14 Sam Houston at Middle Tennessee | ",
 "Upcoming May 15 Sam Houston at Middle Tennessee | ",
 "Upcoming May 16 Sam Houston at Middle Tennessee | ",
 "Upcoming May 20 Sam Houston vs Kennesaw State | ",
 "Upcoming May 21 Sam Houston vs Kennesaw State | ",
 "Upcoming May 22 Sam Houston vs Kennesaw State | ",
 "Upcoming May 26 Sam Houston at Conference USA Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3 Men's · Sam Houston at Alabama | ",
 "Upcoming Nov 7, 2:30 PM Men's · Sam Houston vs Howard Payne | ",
 "Upcoming Nov 11, 6:30 PM Men's · Sam Houston vs Pepperdine | ",
 "Upcoming Nov 13, 6:00 PM Men's · Sam Houston at Illinois | ",
 "Upcoming Nov 17, 7:30 PM Men's · Sam Houston at Wyoming | ",
 "Upcoming Nov 20 Men's · Sam Houston at Boise State | ",
 "Upcoming Nov 24, 8:00 PM Men's · Sam Houston at Washington State | ",
 "Upcoming Nov 28, 2:30 PM Men's · Sam Houston vs Paul Quinn | ",
 "Upcoming Dec 4, 7:00 PM Men's · Sam Houston at Rice | ",
 "Upcoming Dec 9, 3:00 PM Men's · Sam Houston vs Denver | ",
 "Upcoming Dec 12, 9:00 PM Men's · Sam Houston at Nevada | ",
 "Upcoming Dec 15, 7:45 PM Men's · Sam Houston at Omaha | ",
 "Upcoming Dec 19, 6:00 PM Men's · Sam Houston at Utah | ",
 "Upcoming Dec 27, 2:30 PM Men's · Sam Houston vs Our Lady of the Lake | ",
 "Upcoming Dec 31, 2:30 PM Men's · Sam Houston vs Missouri State | ",
 "Upcoming Jan 2, 2:30 PM Men's · Sam Houston vs FIU | ",
 "Upcoming Jan 7 Men's · Sam Houston at Middle Tennessee | ",
 "Upcoming Jan 9, 3:00 PM Men's · Sam Houston at WKU | ",
 "Upcoming Jan 14, 6:30 PM Men's · Sam Houston vs Kennesaw State | ",
 "Upcoming Jan 16, 2:30 PM Men's · Sam Houston vs Jax State | ",
 "Upcoming Jan 23, 2:00 PM Men's · Sam Houston at NM State | ",
 "Upcoming Jan 28, 7:30 PM Men's · Sam Houston at Liberty | ",
 "Upcoming Jan 30, 1:00 PM Men's · Sam Houston at Delaware | ",
 "Upcoming Feb 4, 7:00 PM Men's · Sam Houston vs WKU | ",
 "Upcoming Feb 6, 2:30 PM Men's · Sam Houston vs Middle Tennessee | ",
 "Upcoming Feb 11, 6:00 PM Men's · Sam Houston at Jax State | ",
 "Upcoming Feb 13 Men's · Sam Houston at Kennesaw State | ",
 "Upcoming Feb 20 Men's · Sam Houston vs NM State | ",
 "Upcoming Feb 25, 6:30 PM Men's · Sam Houston vs Delaware | ",
 "Upcoming Feb 27, 3:00 PM Men's · Sam Houston vs Liberty | ",
 "Upcoming Mar 4, 1:00 PM Men's · Sam Houston at FIU | ",
 "Upcoming Mar 6, 7:00 PM Men's · Sam Houston at Missouri State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Sam Houston vs McMurry | ",
 "Upcoming Nov 5, 7:00 PM Women's · Sam Houston at Houston | ",
 "Upcoming Nov 10, 6:30 PM Women's · Sam Houston vs Jarvis Christian | ",
 "Upcoming Nov 14, 7:00 PM Women's · Sam Houston at Northern Colorado | ",
 "Upcoming Nov 19, 6:30 PM Women's · Sam Houston at ULM | ",
 "Upcoming Nov 24, 2:00 PM Women's · Sam Houston vs Pepperdine | ",
 "Upcoming Nov 30, 6:30 PM Women's · Sam Houston vs UTRGV | ",
 "Upcoming Dec 6, 5:00 PM Women's · Sam Houston at Mississippi State | ",
 "Upcoming Dec 17, 2:00 PM Women's · Sam Houston at Texas A&M | ",
 "Upcoming Dec 20, 12:00 PM Women's · Sam Houston vs Wichita State | ",
 "Upcoming Dec 29, 2:00 PM Women's · Sam Houston vs UNT Dallas | ",
 "Upcoming Jan 2, 1:00 PM Women's · Sam Houston at Missouri State | ",
 "Upcoming Jan 4, 6:00 PM Women's · Sam Houston at FIU | ",
 "Upcoming Jan 8, 6:30 PM Women's · Sam Houston vs Middle Tennessee | ",
 "Upcoming Jan 10, 2:00 PM Women's · Sam Houston vs WKU | ",
 "Upcoming Jan 14, 5:00 PM Women's · Sam Houston at Kennesaw State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Sam Houston at Jax State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Sam Houston vs NM State | ",
 "Upcoming Jan 28, 6:30 PM Women's · Sam Houston vs Liberty | ",
 "Upcoming Jan 30, 1:00 PM Women's · Sam Houston vs Delaware | ",
 "Upcoming Feb 4, 6:30 PM Women's · Sam Houston at WKU | ",
 "Upcoming Feb 6, 2:00 PM Women's · Sam Houston at Middle Tennessee | ",
 "Upcoming Feb 11, 6:30 PM Women's · Sam Houston vs Jax State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Sam Houston vs Kennesaw State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Sam Houston at NM State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Sam Houston at Delaware | ",
 "Upcoming Feb 27, 1:00 PM Women's · Sam Houston at Liberty | ",
 "Upcoming Mar 4, 6:30 PM Women's · Sam Houston vs FIU | ",
 "Upcoming Mar 6, 1:00 PM Women's · Sam Houston vs Missouri State | ",
 "Upcoming Mar 9 Women's · Sam Houston at Conference USA Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 3 Sam Houston at Kat Klub Kickoff Exhibition | Completed",
 "Final Oct 9 Sam Houston at Colonial Lanes Classic | 3rd of 14",
 "Upcoming Oct 25 Sam Houston at Kat Klub Dual | ",
 "Upcoming Nov 6 Sam Houston at Bulldog Classic | ",
 "Upcoming Nov 13 Sam Houston at TRACK Kat Klash | ",
 "Upcoming Jan 15 Sam Houston at North East Classic | ",
 "Upcoming Jan 22 Sam Houston at Prairie View Invite | ",
 "Upcoming Feb 5 Sam Houston at Lewis Flyer Classic | ",
 "Upcoming Feb 12 Sam Houston at TNBA Open | ",
 "Upcoming Feb 19 Sam Houston at Big Red Invite | ",
 "Upcoming Mar 5 Sam Houston at Music City Classic | ",
 "Upcoming Mar 12 Sam Houston at Intercollegiate Singles Championships | ",
 "Upcoming Mar 17 Sam Houston at CUSA Championships | ",
 "Upcoming Apr 10 Sam Houston at NCAA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Sam Houston at Bearkat Twilight | Completed",
 "Final Sep 11 Women's · Sam Houston at Texas A&M Invitational | 12th of 14",
 "Final Sep 24 Women's · Sam Houston at Prairie View Invite | 1st of 3",
 "Final Oct 16 Women's · Sam Houston at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31 Women's · Sam Houston at Conference USA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Sam Houston at Bearkat Twilight | Completed",
 "Final Sep 11 Men's · Sam Houston at Texas A&M Invitational | Completed",
 "Final Sep 24 Men's · Sam Houston at Prairie View Invite | Completed",
 "Final Oct 16 Men's · Sam Houston at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31 Men's · Sam Houston at Conference USA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Sam Houston at Troy | L, 21-24",
 "Final Sep 12 Sam Houston vs Tulsa | L, 17-23",
 "Final Sep 19 Sam Houston vs Nicholls | W, 59-0",
 "Final Sep 26 Sam Houston at Texas Tech | L, 14-49",
 "Final Oct 8 Sam Houston at Liberty | L, 3-35",
 "Final Oct 14 Sam Houston vs WKU | L, 3-16",
 "Final Oct 21 Sam Houston vs NM State | L, 24-30",
 "Upcoming Oct 27, 7:00 PM Sam Houston at Missouri State | ",
 "Upcoming Nov 7, 6:00 PM Sam Houston at Jax State | ",
 "Upcoming Nov 14, 1:00 PM Sam Houston vs Kennesaw State | ",
 "Upcoming Nov 21, 1:00 PM Sam Houston vs Middle Tennessee | ",
 "Upcoming Nov 28, 1:00 PM Sam Houston at FIU | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 Women's · Sam Houston at Badger Invitational | 15th of 16",
 "Final Sep 22 Women's · Sam Houston at Red Raider Invitational | 5th of 12",
 "Final Oct 5 Women's · Sam Houston at PD Intercollegiate | 8th of 11",
 "Final Oct 18 Women's · Sam Houston at Diamante Intercollegiate | 1st of 20",
 "Upcoming Feb 1 Women's · Sam Houston at The Battle at Bentwater | ",
 "Upcoming Feb 8 Women's · Sam Houston at Texas Golf Throwdown | ",
 "Upcoming Mar 8 Women's · Sam Houston at Riverbend Intercollegiate | ",
 "Upcoming Mar 27 Women's · Sam Houston at Liz Murphey Collegiate Classic | ",
 "Upcoming Apr 5 Women's · Sam Houston at Mo Memorial | ",
 "Upcoming Apr 19 Women's · Sam Houston at CUSA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Sam Houston at Bearcat Invitational | 9th of 17",
 "Final Sep 21 Men's · Sam Houston at Bayou City Collegiate | 2nd of 13",
 "Final Oct 12 Men's · Sam Houston at Moraine Intercollegiate | 2nd of 16",
 "Today Oct 20 Men's · Sam Houston at Saint Mary's Invitational | ",
 "Upcoming Feb 8 Men's · Sam Houston at Bearkat Intercollegiate | ",
 "Upcoming Feb 15 Men's · Sam Houston at Border Olympics | ",
 "Upcoming Mar 15 Men's · Sam Houston at All-American Intercollegiate | ",
 "Upcoming Mar 22 Men's · Sam Houston at Bruin Invitational | ",
 "Upcoming Mar 30 Men's · Sam Houston at Maridoe Collegiate | ",
 "Upcoming Apr 10 Men's · Sam Houston at Aggie Invitational | ",
 "Upcoming Apr 26 Men's · Sam Houston at CUSA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Sam Houston at Oklahoma State | T, 1-1",
 "Final Aug 16 Sam Houston at Lamar | T, 0-0",
 "Final Aug 22 Sam Houston at Texas A&M | L, 0-5",
 "Final Aug 27 Sam Houston at Texas A&M Corpus Christi | T, 1-1",
 "Final Sep 3 Sam Houston vs UTRGV | W, 4-2",
 "Final Sep 6 Sam Houston vs Texas Southern | W, 3-1",
 "Final Sep 10 Sam Houston at Houston | L, 0-5",
 "Final Sep 13 Sam Houston vs McNeese | W, 1-0",
 "Final Sep 21 Sam Houston vs A&M-San Antonio | W, 7-0",
 "Final Sep 26 Sam Houston vs Kennesaw State | L, 1-2",
 "Final Oct 1 Sam Houston at WKU | L, 0-2",
 "Final Oct 4 Sam Houston at Middle Tennessee | T, 2-2",
 "Final Oct 11 Sam Houston vs NM State | W, 2-1",
 "Final Oct 17 Sam Houston at Jax State | T, 1-1",
 "Today Oct 22, 7:00 PM Sam Houston vs FIU | ",
 "Upcoming Oct 25, 12:00 PM Sam Houston vs Liberty | ",
 "Upcoming Oct 31, 6:00 PM Sam Houston at Delaware | ",
 "Upcoming Nov 8 Sam Houston at CUSA Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 22, 6:00 PM Sam Houston vs Navarro College (Exhibition) | ",
 "Upcoming Oct 28 Sam Houston vs San Jacinto College (Exhibition) | ",
 "Upcoming Oct 30 Sam Houston vs Trinity Valley CC (Exhibition) | ",
 "Upcoming Nov 4 Sam Houston vs Angelina College (Exhibition) | ",
 "Upcoming Mar 12 Sam Houston vs Kennesaw State | ",
 "Upcoming Mar 13 Sam Houston vs Kennesaw State | ",
 "Upcoming Mar 14 Sam Houston vs Kennesaw State | ",
 "Upcoming Mar 19 Sam Houston at Missouri State | ",
 "Upcoming Mar 20 Sam Houston at Missouri State | ",
 "Upcoming Mar 21 Sam Houston at Missouri State | ",
 "Upcoming Mar 26 Sam Houston vs WKU | ",
 "Upcoming Mar 27 Sam Houston vs WKU | ",
 "Upcoming Mar 28 Sam Houston vs WKU | ",
 "Upcoming Apr 2 Sam Houston vs FIU | ",
 "Upcoming Apr 3 Sam Houston vs FIU | ",
 "Upcoming Apr 4 Sam Houston vs FIU | ",
 "Upcoming Apr 9 Sam Houston at Middle Tennessee | ",
 "Upcoming Apr 10 Sam Houston at Middle Tennessee | ",
 "Upcoming Apr 11 Sam Houston at Middle Tennessee | ",
 "Upcoming Apr 16 Sam Houston vs NM State | ",
 "Upcoming Apr 17 Sam Houston vs NM State | ",
 "Upcoming Apr 18 Sam Houston vs NM State | ",
 "Upcoming Apr 23 Sam Houston at Jax State | ",
 "Upcoming Apr 24 Sam Houston at Jax State | ",
 "Upcoming Apr 25 Sam Houston at Jax State | ",
 "Upcoming Apr 30 Sam Houston vs Liberty | ",
 "Upcoming May 1 Sam Houston vs Liberty | ",
 "Upcoming May 2 Sam Houston vs Liberty | ",
 "Upcoming May 6 Sam Houston at Delaware | ",
 "Upcoming May 7 Sam Houston at Delaware | ",
 "Upcoming May 8 Sam Houston at Delaware | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Sam Houston at Lady Demon Invitational | Completed",
 "Final Sep 25 Sam Houston at Rice Invitational | Completed",
 "Final Oct 8 Sam Houston at ITA Regionals | Completed",
 "Final Oct 16 Sam Houston at Bearkat Invitational | Completed",
 "Upcoming Nov 7 Sam Houston at Texas State Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Sam Houston vs Cal State Fullerton | W, 3-0",
 "Final Aug 28 Sam Houston vs Miami (OH) | W, 3-2",
 "Final Aug 29 Sam Houston vs McNeese | W, 3-0",
 "Final Sep 4 Sam Houston vs Army | L, 0-3",
 "Final Sep 5 Sam Houston vs Kent State | W, 3-0",
 "Final Sep 5 Sam Houston at UT Arlington | W, 3-2",
 "Final Sep 8 Sam Houston vs Stephen F. Austin | L, 1-3",
 "Final Sep 10 Sam Houston at Tarleton | L, 0-3",
 "Final Sep 11 Sam Houston vs Texas A&M Corpus Christi | W, 3-0",
 "Final Sep 12 Sam Houston vs Denver | L, 0-3",
 "Final Sep 18 Sam Houston vs ULM | W, 3-1",
 "Final Sep 18 Sam Houston vs North Dakota | W, 3-1",
 "Final Sep 19 Sam Houston at Lamar | W, 3-0",
 "Final Sep 25 Sam Houston at Kennesaw State | W, 3-1",
 "Final Sep 26 Sam Houston at Kennesaw State | W, 3-1",
 "Final Oct 2 Sam Houston vs NM State | W, 3-0",
 "Final Oct 3 Sam Houston vs NM State | L, 2-3",
 "Final Oct 9 Sam Houston at Missouri State | L, 1-3",
 "Final Oct 10 Sam Houston at Missouri State | L, 2-3",
 "Final Oct 16 Sam Houston vs Delaware | W, 3-2",
 "Final Oct 17 Sam Houston vs Delaware | W, 3-1",
 "Upcoming Oct 23, 6:00 PM Sam Houston at Liberty | ",
 "Upcoming Oct 24, 1:00 PM Sam Houston at Liberty | ",
 "Upcoming Oct 30, 6:00 PM Sam Houston vs Jax State | ",
 "Upcoming Oct 31, 1:00 PM Sam Houston vs Jax State | ",
 "Upcoming Nov 5, 5:00 PM Sam Houston at Middle Tennessee | ",
 "Upcoming Nov 6, 1:00 PM Sam Houston at Middle Tennessee | ",
 "Upcoming Nov 12, 6:00 PM Sam Houston vs WKU | ",
 "Upcoming Nov 13, 1:00 PM Sam Houston vs WKU | ",
 "Upcoming Nov 20 Sam Houston at CUSA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Sam Houston module checks passed");
