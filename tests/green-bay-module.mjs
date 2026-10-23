import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {greenBaySchool} from '../src/schools/green-bay.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='green-bay');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,greenBayHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/green-bay-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit greenbayphoenix.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['green-bay'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',greenBaySchool.scheduleUrls],['roster',greenBaySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('green-bay|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'greenbayphoenix.com',`${key} must stay on greenbayphoenix.com`);
  }
}
const parity={"Basketball":{"schedule":["https://greenbayphoenix.com/sports/mens-basketball/schedule","https://greenbayphoenix.com/sports/womens-basketball/schedule"],"roster":["https://greenbayphoenix.com/sports/mens-basketball/roster","https://greenbayphoenix.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://greenbayphoenix.com/sports/cross-country/schedule"],"roster":["https://greenbayphoenix.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://greenbayphoenix.com/sports/womens-golf/schedule","https://greenbayphoenix.com/sports/mens-golf/schedule"],"roster":["https://greenbayphoenix.com/sports/womens-golf/roster","https://greenbayphoenix.com/sports/mens-golf/roster"],"combined":true},"Skiing":{"schedule":["https://greenbayphoenix.com/sports/nordic-skiing/schedule"],"roster":["https://greenbayphoenix.com/sports/nordic-skiing/roster"],"combined":false},"Soccer":{"schedule":["https://greenbayphoenix.com/sports/womens-soccer/schedule","https://greenbayphoenix.com/sports/mens-soccer/schedule"],"roster":["https://greenbayphoenix.com/sports/womens-soccer/roster","https://greenbayphoenix.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://greenbayphoenix.com/sports/softball/schedule"],"roster":["https://greenbayphoenix.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://greenbayphoenix.com/sports/swimming-and-diving/schedule"],"roster":["https://greenbayphoenix.com/sports/swimming-and-diving/roster"],"combined":true},"Volleyball":{"schedule":["https://greenbayphoenix.com/sports/womens-volleyball/schedule"],"roster":["https://greenbayphoenix.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'green-bay|"+sport+"':"),`${sport} routes must live in the Green Bay module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://greenbayphoenix.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.greenBayHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=green-bay)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 15 Men's · Green Bay vs Wisconsin (Exhibition) | L, 77-96",
 "Final Oct 19 Men's · Green Bay vs Marquette (Exhibition) | L, 60-87",
 "Upcoming Oct 24, 4:00 PM Men's · Green Bay vs Illinois State (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Green Bay vs Lawrence | ",
 "Upcoming Nov 5, 6:00 PM Men's · Green Bay at Cincinnati | ",
 "Upcoming Nov 8, 1:00 PM Men's · Green Bay at St. Thomas | ",
 "Upcoming Nov 10 Men's · Green Bay at UNI | ",
 "Upcoming Nov 13, 11:00 AM Men's · Green Bay vs Viterbo | ",
 "Upcoming Nov 17, 6:00 PM Men's · Green Bay at West Florida | ",
 "Upcoming Nov 20, 7:00 PM Men's · Green Bay at Florida State | ",
 "Upcoming Nov 24, 7:00 PM Men's · Green Bay at UMKC | ",
 "Upcoming Nov 29, 1:00 PM Men's · Green Bay vs North Dakota | ",
 "Upcoming Dec 3, 6:30 PM Men's · Green Bay vs Northern Illinois | ",
 "Upcoming Dec 5, 1:00 PM Men's · Green Bay vs Wright State | ",
 "Upcoming Dec 8, 7:00 PM Men's · Green Bay at Bradley | ",
 "Upcoming Dec 17, 7:00 PM Men's · Green Bay at North Dakota | ",
 "Upcoming Dec 21 Men's · Green Bay at South Dakota State | ",
 "Upcoming Dec 30, 6:00 PM Men's · Green Bay at Oakland | ",
 "Upcoming Jan 3, 12:00 PM Men's · Green Bay at Detroit Mercy | ",
 "Upcoming Jan 7, 6:30 PM Men's · Green Bay vs Northern Kentucky | ",
 "Upcoming Jan 9, 1:00 PM Men's · Green Bay vs Purdue Fort Wayne | ",
 "Upcoming Jan 14, 6:30 PM Men's · Green Bay vs Youngstown State | ",
 "Upcoming Jan 17, 2:00 PM Men's · Green Bay at Northern Illinois | ",
 "Upcoming Jan 20, 6:00 PM Men's · Green Bay at Cleveland State | ",
 "Upcoming Jan 23, 1:00 PM Men's · Green Bay vs Milwaukee | ",
 "Upcoming Jan 27, 5:30 PM Men's · Green Bay at IU Indy | ",
 "Upcoming Jan 30, 1:00 PM Men's · Green Bay vs Robert Morris | ",
 "Upcoming Feb 4, 6:30 PM Men's · Green Bay vs Detroit Mercy | ",
 "Upcoming Feb 7, 2:00 PM Men's · Green Bay at Milwaukee | ",
 "Upcoming Feb 11 Men's · Green Bay at Wright State | ",
 "Upcoming Feb 13, 4:00 PM Men's · Green Bay at Northern Kentucky | ",
 "Upcoming Feb 19, 6:30 PM Men's · Green Bay vs Cleveland State | ",
 "Upcoming Feb 21, 1:00 PM Men's · Green Bay vs IU Indy | ",
 "Upcoming Feb 24, 5:30 PM Men's · Green Bay at Youngstown State | ",
 "Upcoming Feb 27 Men's · Green Bay at Robert Morris | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:30 PM Women's · Green Bay vs UW-Stevens Point (Exhibition) | ",
 "Upcoming Nov 3, 6:00 PM Women's · Green Bay at Duke | ",
 "Upcoming Nov 7, 6:00 PM Women's · Green Bay vs Loyola Chicago | ",
 "Upcoming Nov 11, 6:30 PM Women's · Green Bay at Illinois State | ",
 "Upcoming Nov 14, 1:00 PM Women's · Green Bay vs Wisconsin | ",
 "Upcoming Nov 18, 6:30 PM Women's · Green Bay vs Texas | ",
 "Upcoming Nov 23, 6:00 PM Women's · Green Bay at Northern Iowa | ",
 "Upcoming Nov 28, 1:00 PM Women's · Green Bay vs Eastern Illinois | ",
 "Upcoming Dec 3, 5:00 PM Women's · Green Bay at Robert Morris | ",
 "Upcoming Dec 5, 4:30 PM Women's · Green Bay at Youngstown State | ",
 "Upcoming Dec 9, 6:30 PM Women's · Green Bay vs UW-Stout | ",
 "Upcoming Dec 12, 3:00 PM Women's · Green Bay at Utah | ",
 "Upcoming Dec 16, 6:30 PM Women's · Green Bay vs Wisconsin Lutheran College | ",
 "Upcoming Dec 19, 1:00 PM Women's · Green Bay vs Miami (OH) | ",
 "Upcoming Dec 22, 6:00 PM Women's · Green Bay at St. Thomas | ",
 "Upcoming Dec 31, 1:00 PM Women's · Green Bay vs Cleveland State | ",
 "Upcoming Jan 2, 1:00 PM Women's · Green Bay vs Purdue Fort Wayne | ",
 "Upcoming Jan 7, 6:00 PM Women's · Green Bay at Wright State | ",
 "Upcoming Jan 10 Women's · Green Bay at Northern Kentucky | ",
 "Upcoming Jan 13, 6:30 PM Women's · Green Bay vs Detroit Mercy | ",
 "Upcoming Jan 16, 2:00 PM Women's · Green Bay at Milwaukee | ",
 "Upcoming Jan 21, 6:30 PM Women's · Green Bay vs Wright State | ",
 "Upcoming Jan 24, 1:00 PM Women's · Green Bay at Purdue Fort Wayne | ",
 "Upcoming Jan 28, 6:30 PM Women's · Green Bay vs Robert Morris | ",
 "Upcoming Jan 31, 1:00 PM Women's · Green Bay vs Northern Illinois | ",
 "Upcoming Feb 3, 5:30 PM Women's · Green Bay at Oakland | ",
 "Upcoming Feb 6 Women's · Green Bay at Detroit Mercy | ",
 "Upcoming Feb 9, 6:00 PM Women's · Green Bay at Cleveland State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Green Bay vs Milwaukee | ",
 "Upcoming Feb 17, 6:30 PM Women's · Green Bay vs IU Indy | ",
 "Upcoming Feb 20, 1:00 PM Women's · Green Bay vs Youngstown State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Green Bay at Northern Illinois | ",
 "Upcoming Feb 27, 1:00 PM Women's · Green Bay vs Northern Kentucky | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Green Bay at St. Norbert College Tom Barry Invitational | Women's team: 1st / Men's team: 1st",
 "Final Sep 12 Green Bay at Phoenix Open | Women's team: 5th / Men's team: 3rd",
 "Final Sep 25 Green Bay at Jim Allen Classic | Women's team: 2nd / Men's team: 2nd",
 "Final Oct 2 Green Bay at Joe Piane Notre Dame Invite | Women's team: 22nd / Men's team: 8th",
 "Final Oct 16 Green Bay at Bradley Pink Classic | Women's team: 21st / Men's team: 14th",
 "Upcoming Oct 31, 12:00 PM Green Bay at Horizon League Championships | ",
 "Upcoming Nov 13, 12:00 PM Green Bay at NCAA Regional Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 6 Women's · Green Bay at A-Ga-Ming Invitational | 10th of 13",
 "Final Sep 14 Women's · Green Bay at Brittany Kelly Classic | T5th of 14",
 "Final Sep 28 Women's · Green Bay at NKU Fall Invitational | T6th of 11",
 "Final Oct 5 Women's · Green Bay at Butler Fall Invitational | 6th of 14",
 "Final Oct 12 Women's · Green Bay at Motor City Matchup | 2nd"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 8 Men's · Green Bay at ANF Fall Classic | 7th of 14",
 "Final Sep 27 Men's · Green Bay at Badger Invitational | T10th of 19",
 "Final Oct 5 Men's · Green Bay at Tom Tontimonia Invite | T2nd of 12",
 "Final Oct 12 Men's · Green Bay at Motor City Matchup | 2nd",
 "Final Oct 19 Men's · Green Bay at Zach Johnson Invitational | 7th of 13"
]);
  const v_nordicskiing=parse("Skiing","nordic-skiing");
  assert.deepEqual(v_nordicskiing.map(line),[
 "Upcoming Dec 12 Green Bay at Skate Sprint | ",
 "Upcoming Dec 13 Green Bay at 7.5k Skate Mass Start | ",
 "Upcoming Dec 19 Green Bay at 7.5k Skate Individual Start | ",
 "Upcoming Dec 20 Green Bay at 10k Classic Mass Start | ",
 "Upcoming Jan 2 Green Bay at 10K Skate | ",
 "Upcoming Jan 4 Green Bay at Classic Sprint | ",
 "Upcoming Jan 6 Green Bay at 20K Classic | ",
 "Upcoming Jan 7 Green Bay at Skate Sprint | ",
 "Upcoming Jan 16 Green Bay at Classic Sprint | ",
 "Upcoming Jan 17 Green Bay at 15k Classic Mass Start | ",
 "Upcoming Jan 30 Green Bay at Classic Sprint | ",
 "Upcoming Jan 31 Green Bay at 7.5k Skate Individual Start | ",
 "Upcoming Feb 20 Green Bay at Skate Sprint | ",
 "Upcoming Feb 21 Green Bay at 20k Classic Mass Start | ",
 "Upcoming Feb 27 Green Bay at 7.5k Skate Individual Start | ",
 "Upcoming Feb 28 Green Bay at 20k Classic Mass Start | ",
 "Upcoming Mar 11 Green Bay at 10K Skate Individual Start | ",
 "Upcoming Mar 12 Green Bay at Classic Sprint | ",
 "Upcoming Mar 14 Green Bay at 20k Classic Mass Start | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Green Bay at North Dakota State | W, 3-0",
 "Final Aug 16 Women's · Green Bay at North Dakota | W, 2-1",
 "Final Aug 20 Women's · Green Bay vs South Dakota | W, 1-0",
 "Final Aug 23 Women's · Green Bay vs Omaha | T, 0-0",
 "Final Aug 27 Women's · Green Bay vs St. Thomas | T, 1-1",
 "Final Aug 30 Women's · Green Bay at Western Illinois | W, 1-0",
 "Final Sep 10 Women's · Green Bay vs Chicago State | W, 3-0",
 "Final Sep 19 Women's · Green Bay at NIU | W, 1-0",
 "Final Sep 24 Women's · Green Bay vs Detroit Mercy | W, 1-0",
 "Final Sep 27 Women's · Green Bay vs Oakland | W, 1-0",
 "Final Oct 1 Women's · Green Bay at Wright State | L, 1-2",
 "Final Oct 4 Women's · Green Bay at Northern Kentucky | T, 1-1",
 "Final Oct 10 Women's · Green Bay vs IU Indy | W, 1-0",
 "Final Oct 15 Women's · Green Bay vs Robert Morris | W, 3-1",
 "Final Oct 18 Women's · Green Bay vs Youngstown State | W, 3-2",
 "Final Oct 22 Women's · Green Bay at Cleveland State | T, 0-0",
 "Upcoming Oct 25, 12:00 PM Women's · Green Bay at Purdue Fort Wayne | ",
 "Upcoming Oct 31, 1:00 PM Women's · Green Bay at Milwaukee | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Green Bay vs Loyola | L, 0-2",
 "Final Aug 23 Men's · Green Bay at St. Thomas | T, 1-1",
 "Final Aug 26 Men's · Green Bay at Drake | L, 0-2",
 "Final Aug 30 Men's · Green Bay at Bradley | L, 3-5",
 "Final Sep 2 Men's · Green Bay at Saint Louis | L, 0-2",
 "Final Sep 5 Men's · Green Bay vs Western Illinois | W, 2-1",
 "Final Sep 9 Men's · Green Bay vs Northern Kentucky | W, 3-1",
 "Final Sep 12 Men's · Green Bay at Wright State | L, 1-3",
 "Final Sep 19 Men's · Green Bay at Cleveland State | T, 1-1",
 "Final Sep 26 Men's · Green Bay vs Robert Morris | T, 0-0",
 "Final Oct 3 Men's · Green Bay vs Detroit Mercy | W, 1-0",
 "Final Oct 7 Men's · Green Bay at Oakland | T, 0-0",
 "Final Oct 10 Men's · Green Bay vs NIU | L, 2-3",
 "Final Oct 17 Men's · Green Bay at Purdue Fort Wayne | L, 1-2",
 "Upcoming Oct 24, 1:00 PM Men's · Green Bay vs IU Indy | ",
 "Upcoming Oct 27, 5:00 PM Men's · Green Bay at Michigan State | ",
 "Upcoming Nov 3, 1:00 PM Men's · Green Bay at Milwaukee | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Oct 3 Green Bay at St Thomas - Gustavus Adolphus | Completed",
 "Final Oct 17 Green Bay at All Wisconsin Showcase | Completed",
 "Today Oct 23 Green Bay at Wisconsin-Stevens Point | ",
 "Upcoming Oct 30, 2:00 PM Green Bay vs IU Indy - Valparaiso | ",
 "Upcoming Nov 6, 5:30 PM Green Bay at St. Norbert College | ",
 "Upcoming Nov 19 Green Bay at IU Indy House of Champions Invite | ",
 "Upcoming Jan 23 Green Bay at Milwaukee | ",
 "Upcoming Jan 30, 2:00 PM Green Bay at Northern Michigan - Lake Superior St | ",
 "Upcoming Feb 5 Green Bay at Badger First Chance Invite | ",
 "Upcoming Feb 17 Green Bay at Horizon League Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Green Bay at Western Michigan | L, 1-3",
 "Final Aug 29 Green Bay vs Indiana State | L, 0-3",
 "Final Aug 30 Green Bay vs Navy | W, 3-0",
 "Final Sep 4 Green Bay vs Tennessee State | W, 3-0",
 "Final Sep 4 Green Bay at Tennessee Tech | L, 2-3",
 "Final Sep 5 Green Bay vs Austin Peay | L, 2-3",
 "Final Sep 11 Green Bay vs LIU | W, 3-1",
 "Final Sep 12 Green Bay vs Virginia Tech | W, 3-2",
 "Final Sep 13 Green Bay at Northwestern | W, 3-2",
 "Final Sep 18 Green Bay vs Western Illinois | W, 3-0",
 "Final Sep 19 Green Bay vs Western Illinois | W, 3-0",
 "Final Sep 25 Green Bay vs Oakland | W, 3-2",
 "Final Sep 26 Green Bay vs Oakland | W, 3-2",
 "Final Sep 29 Green Bay at Milwaukee | W, 3-2",
 "Final Oct 2 Green Bay at Northern Illinois | W, 3-1",
 "Final Oct 9 Green Bay at Wright State | L, 0-3",
 "Final Oct 10 Green Bay at Wright State | L, 2-3",
 "Final Oct 13 Green Bay vs Milwaukee | W, 3-0",
 "Final Oct 16 Green Bay vs Northern Illinois | W, 3-1",
 "Today Oct 23, 6:00 PM Green Bay vs Purdue Fort Wayne | ",
 "Upcoming Oct 24, 12:30 PM Green Bay vs IU Indy | ",
 "Upcoming Oct 30, 5:00 PM Green Bay at Cleveland State | ",
 "Upcoming Oct 31, 12:00 PM Green Bay at Cleveland State | ",
 "Upcoming Nov 6, 6:00 PM Green Bay vs Northern Kentucky | ",
 "Upcoming Nov 7, 1:00 PM Green Bay vs Northern Kentucky | ",
 "Upcoming Nov 13, 5:00 PM Green Bay at Youngstown State | ",
 "Upcoming Nov 14, 2:00 PM Green Bay at Robert Morris | ",
 "Upcoming Nov 19 Green Bay at Horizon League Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_nordicskiing,"Skiing nordic-skiing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Green Bay module checks passed");
