import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mississippiStateSchool} from '../src/schools/mississippi-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mississippi-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mississippiStateHandlers,attachOfficialMeetResults,decodeHtml,recapArticleText};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mississippi-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hailstate.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mississippi-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',mississippiStateSchool.scheduleUrls],['roster',mississippiStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mississippi-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hailstate.com',`${key} must stay on hailstate.com`);
  }
}
const parity={"Baseball":{"schedule":["https://hailstate.com/sports/baseball/schedule"],"roster":["https://hailstate.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hailstate.com/sports/mens-basketball/schedule","https://hailstate.com/sports/womens-basketball/schedule"],"roster":["https://hailstate.com/sports/mens-basketball/roster","https://hailstate.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://hailstate.com/sports/cross-country/schedule"],"roster":["https://hailstate.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://hailstate.com/sports/football/schedule"],"roster":["https://hailstate.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hailstate.com/sports/mens-golf/schedule","https://hailstate.com/sports/womens-golf/schedule"],"roster":["https://hailstate.com/sports/mens-golf/roster","https://hailstate.com/sports/womens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://hailstate.com/sports/womens-soccer/schedule"],"roster":["https://hailstate.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://hailstate.com/sports/softball/schedule"],"roster":["https://hailstate.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://hailstate.com/sports/mens-tennis/schedule","https://hailstate.com/sports/womens-tennis/schedule"],"roster":["https://hailstate.com/sports/mens-tennis/roster","https://hailstate.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://hailstate.com/sports/track-and-field/schedule"],"roster":["https://hailstate.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://hailstate.com/sports/womens-volleyball/schedule"],"roster":["https://hailstate.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mississippi-state|"+sport+"':"),`${sport} routes must live in the Mississippi State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://hailstate.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mississippiStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mississippi-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 8, 6:00 PM Mississippi State vs Auburn | ",
 "Upcoming Oct 18, 1:00 PM Mississippi State vs Western Kentucky (Exhibition) | ",
 "Upcoming Oct 30, 6:00 PM Mississippi State vs Little Rock (Exhibition) | ",
 "Upcoming Mar 5, 7:00 PM Mississippi State vs Dallas Baptist | ",
 "Upcoming Mar 6, 3:00 PM Mississippi State vs UCLA | ",
 "Upcoming Mar 7, 10:30 AM Mississippi State vs Wake Forest | ",
 "Upcoming Mar 19 Mississippi State vs Missouri | ",
 "Upcoming Mar 20 Mississippi State vs Missouri | ",
 "Upcoming Mar 21 Mississippi State vs Missouri | ",
 "Upcoming Mar 25 Mississippi State at Georgia | ",
 "Upcoming Mar 26 Mississippi State at Georgia | ",
 "Upcoming Mar 27 Mississippi State at Georgia | ",
 "Upcoming Apr 2 Mississippi State vs Ole Miss | ",
 "Upcoming Apr 3 Mississippi State vs Ole Miss | ",
 "Upcoming Apr 4 Mississippi State vs Ole Miss | ",
 "Upcoming Apr 9 Mississippi State at Florida | ",
 "Upcoming Apr 10 Mississippi State at Florida | ",
 "Upcoming Apr 11 Mississippi State at Florida | ",
 "Upcoming Apr 16 Mississippi State vs Texas A&M | ",
 "Upcoming Apr 17 Mississippi State vs Texas A&M | ",
 "Upcoming Apr 18 Mississippi State vs Texas A&M | ",
 "Upcoming Apr 23 Mississippi State at Vanderbilt | ",
 "Upcoming Apr 24 Mississippi State at Vanderbilt | ",
 "Upcoming Apr 25 Mississippi State at Vanderbilt | ",
 "Upcoming Apr 30 Mississippi State vs Oklahoma | ",
 "Upcoming May 1 Mississippi State vs Oklahoma | ",
 "Upcoming May 2 Mississippi State vs Oklahoma | ",
 "Upcoming May 7 Mississippi State at Tennessee | ",
 "Upcoming May 8 Mississippi State at Tennessee | ",
 "Upcoming May 9 Mississippi State at Tennessee | ",
 "Upcoming May 14 Mississippi State at LSU | ",
 "Upcoming May 15 Mississippi State at LSU | ",
 "Upcoming May 16 Mississippi State at LSU | ",
 "Upcoming May 20 Mississippi State vs Arkansas | ",
 "Upcoming May 21 Mississippi State vs Arkansas | ",
 "Upcoming May 22 Mississippi State vs Arkansas | ",
 "Upcoming May 25 Mississippi State at SEC Tournament | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 3:00 PM Men's · Mississippi State vs North Carolina State (Exhibition) | ",
 "Upcoming Oct 23 Men's · Mississippi State vs Memphis (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Mississippi State vs Tennessee Tech | ",
 "Upcoming Nov 5, 6:30 PM Men's · Mississippi State vs Northwestern State | ",
 "Upcoming Nov 9, 6:30 PM Men's · Mississippi State vs Jackson State | ",
 "Upcoming Nov 13, 8:00 PM Men's · Mississippi State vs Xavier | ",
 "Upcoming Nov 17 Men's · Mississippi State at UCF | ",
 "Upcoming Nov 20, 6:30 PM Men's · Mississippi State vs Tulsa | ",
 "Upcoming Nov 25, 6:30 PM Men's · Mississippi State vs Wake Forest | ",
 "Upcoming Nov 27 Men's · Mississippi State at Battle 4 Atlantis | ",
 "Upcoming Dec 2, 8:15 PM Men's · Mississippi State vs Georgia Tech | ",
 "Upcoming Dec 7, 6:00 PM Men's · Mississippi State vs Alabama A&M | ",
 "Upcoming Dec 12 Men's · Mississippi State at Marquette | ",
 "Upcoming Dec 15, 6:30 PM Men's · Mississippi State vs Mississippi Valley State | ",
 "Upcoming Dec 19, 2:00 PM Men's · Mississippi State vs VCU | ",
 "Upcoming Dec 28, 6:30 PM Men's · Mississippi State vs Campbell | ",
 "Upcoming Jan 2, 5:00 PM Men's · Mississippi State vs Alabama | ",
 "Upcoming Jan 6, 6:00 PM Men's · Mississippi State at Vanderbilt | ",
 "Upcoming Jan 9, 5:00 PM Men's · Mississippi State at Oklahoma | ",
 "Upcoming Jan 13, 8:00 PM Men's · Mississippi State vs Florida | ",
 "Upcoming Jan 16, 2:30 PM Men's · Mississippi State at Georgia | ",
 "Upcoming Jan 20, 7:30 PM Men's · Mississippi State vs Kentucky | ",
 "Upcoming Jan 23, 12:00 PM Men's · Mississippi State vs South Carolina | ",
 "Upcoming Jan 26, 6:00 PM Men's · Mississippi State at Auburn | ",
 "Upcoming Jan 30, 7:30 PM Men's · Mississippi State at Arkansas | ",
 "Upcoming Feb 3, 7:00 PM Men's · Mississippi State vs Missouri | ",
 "Upcoming Feb 6, 5:00 PM Men's · Mississippi State vs Texas A&M | ",
 "Upcoming Feb 13, 7:30 PM Men's · Mississippi State at Ole Miss | ",
 "Upcoming Feb 16, 8:00 PM Men's · Mississippi State at Alabama | ",
 "Upcoming Feb 20, 5:00 PM Men's · Mississippi State vs LSU | ",
 "Upcoming Feb 24, 6:00 PM Men's · Mississippi State vs Texas | ",
 "Upcoming Feb 27, 12:00 PM Men's · Mississippi State at South Carolina | ",
 "Upcoming Mar 2, 5:00 PM Men's · Mississippi State at Tennessee | ",
 "Upcoming Mar 6, 3:00 PM Men's · Mississippi State vs Ole Miss | ",
 "Upcoming Mar 10 Men's · Mississippi State at SEC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 18, 4:00 PM Women's · Mississippi State vs Louisiana Tech (Exhibition) | ",
 "Upcoming Nov 3, 6:30 PM Women's · Mississippi State vs North Alabama | ",
 "Upcoming Nov 8, 2:00 PM Women's · Mississippi State at UT Martin | ",
 "Upcoming Nov 11, 6:30 PM Women's · Mississippi State vs Troy | ",
 "Upcoming Nov 14, 11:00 AM Women's · Mississippi State at Buffalo | ",
 "Upcoming Nov 17, 11:00 AM Women's · Mississippi State vs Alabama State | ",
 "Upcoming Nov 22, 2:00 PM Women's · Mississippi State at Southern Miss | ",
 "Upcoming Nov 27, 10:00 AM Women's · Mississippi State vs Indiana | ",
 "Upcoming Nov 28, 10:00 AM Women's · Mississippi State vs TCU | ",
 "Upcoming Dec 3, 8:00 PM Women's · Mississippi State vs Virginia | ",
 "Upcoming Dec 6, 5:00 PM Women's · Mississippi State vs Sam Houston | ",
 "Upcoming Dec 13, 2:00 PM Women's · Mississippi State vs Texas Tech | ",
 "Upcoming Dec 16, 6:30 PM Women's · Mississippi State vs Samford | ",
 "Upcoming Dec 20 Women's · Mississippi State at Davidson | ",
 "Upcoming Dec 28 Women's · Mississippi State vs Jackson State | ",
 "Upcoming Dec 31 Women's · Mississippi State at Missouri | ",
 "Upcoming Jan 3 Women's · Mississippi State vs Texas A&M | ",
 "Upcoming Jan 7 Women's · Mississippi State vs South Carolina | ",
 "Upcoming Jan 10 Women's · Mississippi State at Vanderbilt | ",
 "Upcoming Jan 14 Women's · Mississippi State at LSU | ",
 "Upcoming Jan 21 Women's · Mississippi State vs Oklahoma | ",
 "Upcoming Jan 24 Women's · Mississippi State vs Texas | ",
 "Upcoming Jan 28 Women's · Mississippi State at Arkansas | ",
 "Upcoming Jan 31 Women's · Mississippi State at Georgia | ",
 "Upcoming Feb 4 Women's · Mississippi State vs Tennessee | ",
 "Upcoming Feb 7 Women's · Mississippi State vs Ole Miss | ",
 "Upcoming Feb 11 Women's · Mississippi State at Florida | ",
 "Upcoming Feb 15 Women's · Mississippi State at Auburn | ",
 "Upcoming Feb 21 Women's · Mississippi State vs Alabama | ",
 "Upcoming Feb 25 Women's · Mississippi State vs Arkansas | ",
 "Upcoming Feb 28 Women's · Mississippi State at Kentucky | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 18 Mississippi State at Southern Showcase | 5th",
 "Final Oct 3 Mississippi State at Chile Pepper Cross Country Festival | 2nd",
 "Upcoming Oct 16, 9:20 AM Mississippi State at Crimson Classic | ",
 "Upcoming Oct 16, 10:00 AM Mississippi State at Pre-National Invitational | ",
 "Upcoming Oct 30 Mississippi State at SEC Cross Country Championships | ",
 "Upcoming Nov 13 Mississippi State at NCAA South Region Championships | ",
 "Upcoming Nov 21 Mississippi State at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Mississippi State vs ULM | W, 62-13",
 "Final Sep 12 Mississippi State at Minnesota | W, 38-13",
 "Final Sep 19 Mississippi State at South Carolina | W, 41-34",
 "Final Sep 26 Mississippi State vs Missouri | W, 31-24",
 "Final Oct 3 Mississippi State vs Alabama | L, 23-56",
 "Upcoming Oct 17 Mississippi State at LSU | ",
 "Upcoming Oct 24 Mississippi State vs Oklahoma | ",
 "Upcoming Oct 31 Mississippi State at Texas | ",
 "Upcoming Nov 7 Mississippi State vs Vanderbilt | ",
 "Upcoming Nov 14 Mississippi State vs Auburn | ",
 "Upcoming Nov 21, 12:00 PM Mississippi State vs Tennessee Tech | ",
 "Upcoming Nov 27, 11:00 AM Mississippi State at Ole Miss | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 Men's · Mississippi State at Visit Knoxville Collegiate | T6th",
 "Final Sep 13 Men's · Mississippi State at Canadian Collegiate Invitational | 4th",
 "Final Oct 5 Men's · Mississippi State at Cullan Brown Collegiate | 2nd",
 "Upcoming Oct 17 Men's · Mississippi State at Fallen Oak Collegiate Invitational | ",
 "Upcoming Oct 31 Men's · Mississippi State at Steelwood Collegiate Invitational | ",
 "Upcoming Feb 15 Men's · Mississippi State at Watersound Invitational | ",
 "Upcoming Mar 15 Men's · Mississippi State at The All-American Intercollegiate | ",
 "Upcoming Mar 22 Men's · Mississippi State at The Bruin Invitational | ",
 "Upcoming Apr 2 Men's · Mississippi State at Mason Rudolph Championship | ",
 "Upcoming Apr 12 Men's · Mississippi State at Mossy Oak Collegiate | ",
 "Upcoming Apr 21 Men's · Mississippi State at SEC Championship | ",
 "Upcoming May 17 Men's · Mississippi State at NCAA Regionals | ",
 "Upcoming May 28 Men's · Mississippi State at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Mississippi State at Boilermaker Classic | 3rd",
 "Final Sep 18 Women's · Mississippi State at Mason Rudolph Championship | 1st",
 "Final Oct 5 Women's · Mississippi State at The Ally | 3rd",
 "Upcoming Oct 19 Women's · Mississippi State at The Fin | ",
 "Upcoming Feb 1 Women's · Mississippi State at UCF Challenge | ",
 "Upcoming Feb 14 Women's · Mississippi State at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · Mississippi State at Ladyluck Invitational | ",
 "Upcoming Mar 22 Women's · Mississippi State at Dr. Donnis Thompson Invitational | ",
 "Upcoming Apr 5 Women's · Mississippi State at Birmingham Matchplay | ",
 "Upcoming Apr 16 Women's · Mississippi State at SEC Tournament | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Mississippi State vs South Alabama | W, 3-0",
 "Final Aug 16 Mississippi State at UAB | W, 2-1",
 "Final Aug 23 Mississippi State vs Southern Miss | W, 4-0",
 "Final Aug 27 Mississippi State vs Oklahoma State | W, 4-1",
 "Final Aug 30 Mississippi State vs Alcorn State | W, 2-0",
 "Final Sep 3 Mississippi State vs Louisiana | W, 2-1",
 "Final Sep 6 Mississippi State vs Charlotte | L, 0-3",
 "Final Sep 11 Mississippi State at Ole Miss | W, 4-1",
 "Final Sep 18 Mississippi State vs Florida | T, 2-2",
 "Final Sep 24 Mississippi State at Tennessee | T, 0-0",
 "Final Sep 27 Mississippi State at Kentucky | T, 0-0",
 "Final Oct 2 Mississippi State vs South Carolina | T, 0-0",
 "Upcoming Oct 9, 7:00 PM Mississippi State vs Texas A&M | ",
 "Upcoming Oct 15, 6:00 PM Mississippi State vs Oklahoma | ",
 "Upcoming Oct 18, 5:00 PM Mississippi State at Auburn | ",
 "Upcoming Oct 25, 2:00 PM Mississippi State at LSU | ",
 "Upcoming Nov 1, 12:00 PM Mississippi State vs Alabama | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Final Oct 2 Mississippi State vs Wallace State CC (Exhibition) | W, 7-0",
 "Final Oct 2 Mississippi State vs Itawamba CC (Exhibition) | W, 6-2",
 "Today Oct 7, 6:00 PM Mississippi State vs Pearl River CC (Exhibition) | ",
 "Upcoming Oct 9, 4:00 PM Mississippi State at Copiah-Lincoln CC (Exhibition) | ",
 "Upcoming Oct 23, 5:00 PM Mississippi State vs Fall World Series (Exhibition) | ",
 "Upcoming Oct 25, 1:00 PM Mississippi State vs Ole Miss (Exhibition) (Game 1) | ",
 "Upcoming Oct 25, 3:00 PM Mississippi State vs Ole Miss (Exhibition) (Game 2) | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Mississippi State at Milwaukee Tennis Classic | Completed",
 "Final Sep 18 Men's · Mississippi State at SEC Starkvegas Showdown | Completed",
 "Final Sep 19 Men's · Mississippi State at ITA All-American Championships | Completed",
 "Final Sep 21 Men's · Mississippi State at ITF M15 Columbia | Completed",
 "Final Sep 28 Men's · Mississippi State at ITF M15 Fayetteville | Completed",
 "Final Sep 28 Men's · Mississippi State at ITF M15 Ann Arbor | Completed",
 "Upcoming Oct 8 Men's · Mississippi State at ITA Regional Championships | ",
 "Upcoming Oct 12 Men's · Mississippi State at ITF M15 Lexington | ",
 "Upcoming Oct 19 Men's · Mississippi State at ITF M25 Stillwater | ",
 "Upcoming Oct 23 Men's · Mississippi State at RTC Collegiate Invite | ",
 "Upcoming Oct 26 Men's · Mississippi State at ITF M25 Norman | ",
 "Upcoming Oct 26 Men's · Mississippi State at ITF M15 Las Vegas | ",
 "Upcoming Nov 5 Men's · Mississippi State at ITA South Sectional Champions | ",
 "Upcoming Nov 5 Men's · Mississippi State at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Men's · Mississippi State at NCAA Singles & Doubles Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Mississippi State at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Mississippi State at Blue Gray Classic | Completed",
 "Upcoming Oct 8 Women's · Mississippi State at ITA Regional Championships | ",
 "Upcoming Oct 30 Women's · Mississippi State at Roberta Allison Classic | ",
 "Upcoming Nov 5 Women's · Mississippi State at ITA Sectional Championships | ",
 "Upcoming Nov 6 Women's · Mississippi State at June Stewart Invitational | ",
 "Upcoming Nov 17 Women's · Mississippi State at NCAA Singles and Doubles Championship | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Mississippi State vs Georgia State | W, 3-0",
 "Final Aug 29 Mississippi State at South Alabama | W, 3-0",
 "Final Aug 30 Mississippi State vs Rice | L, 1-3",
 "Final Sep 3 Mississippi State vs Iowa | W, 3-1",
 "Final Sep 4 Mississippi State vs Northwestern | W, 3-1",
 "Final Sep 8 Mississippi State at Wake Forest | W, 3-1",
 "Final Sep 11 Mississippi State vs Alcorn State | W, 3-0",
 "Final Sep 12 Mississippi State at Memphis | W, 3-0",
 "Final Sep 17 Mississippi State at Louisiana | W, 3-0",
 "Final Sep 18 Mississippi State vs Jackson State | W, 3-0",
 "Final Sep 19 Mississippi State vs UT Arlington | W, 3-0",
 "Final Sep 27 Mississippi State vs LSU | W, 3-2",
 "Final Oct 2 Mississippi State at Texas | L, 0-3",
 "Final Oct 4 Mississippi State at Texas A&M | L, 0-3",
 "Upcoming Oct 9, 5:00 PM Mississippi State vs Georgia | ",
 "Upcoming Oct 11, 2:00 PM Mississippi State vs South Carolina | ",
 "Upcoming Oct 14, 6:00 PM Mississippi State at Missouri | ",
 "Upcoming Oct 18, 1:00 PM Mississippi State at Vanderbilt | ",
 "Upcoming Oct 23, 5:00 PM Mississippi State vs Oklahoma | ",
 "Upcoming Oct 25, 2:00 PM Mississippi State vs Arkansas | ",
 "Upcoming Oct 30, 6:00 PM Mississippi State at Ole Miss | ",
 "Upcoming Nov 1, 4:00 PM Mississippi State at Alabama | ",
 "Upcoming Nov 6, 5:30 PM Mississippi State at Tennessee | ",
 "Upcoming Nov 8, 12:00 PM Mississippi State at Kentucky | ",
 "Upcoming Nov 13, 7:00 PM Mississippi State vs Florida | ",
 "Upcoming Nov 15, 2:00 PM Mississippi State vs Auburn | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// Stories from a sport's archive: the listing and every saved story it links.
const fromArchive=(host,slug)=>{
  const listing=fixture(`${slug}-archives.html.gz`);recapFixtures.set(`https://${host}/sports/${slug}/archives`,listing);
  for(const path of new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])){
    try{recapFixtures.set(`https://${host}${path}`,fixture(recapFile(path)));}catch{}
  }
};
// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>{
  const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
  const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
  const published=[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')];
  const computed=worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]);
  assert.deepEqual(computed,[published],`${sport}: the computed records are the official ones`);
  return published;
};

// Golf: rounds name no tournament (the opponent does); the place is the
// standing after the final round, "Team Champions" is 1st, and after a
// cancelled final round the round before's standing is final.
{
  const men=parse('Golf','mens-golf').filter(e=>e.status==='Final'),women=parse('Golf','womens-golf').filter(e=>e.status==='Final');
  assert.deepEqual(men.map(e=>[e.opponent,e.headline]),[['Visit Knoxville Collegiate','T6th'],['Canadian Collegiate Invitational','4th'],['Cullan Brown Collegiate','2nd']]);
  assert.deepEqual(women.map(e=>[e.opponent,e.headline]),[['Boilermaker Classic','3rd'],['Mason Rudolph Championship','1st'],['The Ally','3rd']]);
  assert.match(women.at(-1).recap_url,/final-round-of-the-ally-canceled-bulldogs-take-third$/);
  // The Cullan Brown's last round links no story: the archive's final one.
  fromArchive('hailstate.com','mens-golf');
  const cullan=men.at(-1);
  assert.ok(worker.mississippiStateHandlers.isFinalWithoutStory(cullan));
  await worker.mississippiStateHandlers.attachArchiveStory(cullan);
  assert.equal(cullan.recap_url,'https://hailstate.com/news/2026/10/6/mens-golf-mens-golf-takes-second-place-in-lexington');
  recapFixtures.clear();requests.length=0;
}

// Volleyball: a story that gives only the set scores (25-22, 25-20, 28-26) is
// the 0-3 match's story; a 3-2 story found by its score as before.
{
  const vb=parse('Volleyball','womens-volleyball').filter(e=>e.status==='Final'&&!e.recap_url);
  fromArchive('hailstate.com','womens-volleyball');
  for(const event of vb)await worker.mississippiStateHandlers.attachArchiveStory(event);
  assert.deepEqual(vb.map(e=>[e.opponent,e.recap_url]),[['LSU','https://hailstate.com/news/2026/9/27/volleyball-bulldogs-open-sec-play-with-a-win'],['Texas A&M','https://hailstate.com/news/2026/10/4/volleyball-state-comes-up-short-to-the-aggies']]);
  recapFixtures.clear();requests.length=0;
}

// Tennis: a sentence in the result field is not a result.
assert.deepEqual(parse('Tennis','womens-tennis').filter(e=>e.status==='Final').map(e=>e.headline),['Completed','Completed']);

// Cross Country: TFRRS names the women's team "Miss State" (there is no
// men's team). The Chile Pepper (Oct 3) is not on TFRRS yet.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/MS_college_f_Mississippi_St.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['Southern Showcase',"Women's team: 5th · 163 pts",true],['Chile Pepper Cross Country Festival','2nd',false]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Mississippi State's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['Mississippi State vs Alabama','Final','L, 23-56']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['Mississippi State at Texas A&M','Final','L, 0-3']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['Mississippi State vs South Carolina','Final','T, 0-0']]);
}

// Records equal the ones the official pages publish.
assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']].map(([sport,slug])=>records(sport,slug)),[["4-1","2-1"],["11-3","1-2"],["7-1-4","1-0-4"]]);

// Football recaps are SIDEARM story blocks: the expanded view reads the
// whole story, not the team stats after it.
{
  const text=worker.recapArticleText(fixture('recap-2026-10-3-football-game-day-state-vs-alabama.html.gz'));
  assert.match(text,/^STARKVILLE — In a battle of undefeateds, No\. 7 Alabama topped No\. 16 Mississippi State by a final score of 56-23/);
  assert.match(text,/FINAL SCORE - ALABAMA 56, MISSISSIPPI STATE 23/);
  assert.doesNotMatch(text,/Total Yards/);
}

// Other schools and other hosts never reach the Mississippi State reader.
assert.equal(worker.mississippiStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://hailstate.com/',now),null);
assert.equal(worker.mississippiStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Mississippi State module checks passed');
