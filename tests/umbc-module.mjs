import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {umbcSchool} from '../src/schools/umbc.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='umbc');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,umbcHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/umbc-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit umbcretrievers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['umbc'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',umbcSchool.scheduleUrls],['roster',umbcSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('umbc|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'umbcretrievers.com',`${key} must stay on umbcretrievers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://umbcretrievers.com/sports/baseball/schedule"],"roster":["https://umbcretrievers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://umbcretrievers.com/sports/mens-basketball/schedule","https://umbcretrievers.com/sports/womens-basketball/schedule"],"roster":["https://umbcretrievers.com/sports/mens-basketball/roster","https://umbcretrievers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://umbcretrievers.com/sports/womens-cross-country/schedule","https://umbcretrievers.com/sports/mens-cross-country/schedule"],"roster":["https://umbcretrievers.com/sports/womens-cross-country/roster","https://umbcretrievers.com/sports/mens-cross-country/roster"],"combined":true},"Lacrosse":{"schedule":["https://umbcretrievers.com/sports/womens-lacrosse/schedule","https://umbcretrievers.com/sports/mens-lacrosse/schedule"],"roster":["https://umbcretrievers.com/sports/womens-lacrosse/roster","https://umbcretrievers.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://umbcretrievers.com/sports/womens-soccer/schedule","https://umbcretrievers.com/sports/mens-soccer/schedule"],"roster":["https://umbcretrievers.com/sports/womens-soccer/roster","https://umbcretrievers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://umbcretrievers.com/sports/softball/schedule"],"roster":["https://umbcretrievers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://umbcretrievers.com/sports/womens-swimming-and-diving/schedule","https://umbcretrievers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://umbcretrievers.com/sports/womens-swimming-and-diving/roster","https://umbcretrievers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://umbcretrievers.com/sports/womens-track-and-field/schedule","https://umbcretrievers.com/sports/mens-track-and-field/schedule"],"roster":["https://umbcretrievers.com/sports/womens-track-and-field/roster","https://umbcretrievers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://umbcretrievers.com/sports/womens-volleyball/schedule"],"roster":["https://umbcretrievers.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'umbc|"+sport+"':"),`${sport} routes must live in the UMBC module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://umbcretrievers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.umbcHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=umbc)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 23, 5:00 PM UMBC vs CCBC-Catonsville | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · UMBC vs LIU (Exhibition) | L, 79-86",
 "Final Oct 17 Men's · UMBC at Navy (Exhibition) | W, 61-55",
 "Final Oct 21 Men's · UMBC at Fordham (Exhibition) | L, 67-87",
 "Upcoming Nov 2, 4:00 PM Men's · UMBC at George Mason | ",
 "Upcoming Nov 5, 7:00 PM Men's · UMBC at Marist | ",
 "Upcoming Nov 9, 6:00 PM Men's · UMBC vs McDaniel | ",
 "Upcoming Nov 12, 6:00 PM Men's · UMBC vs Morgan State | ",
 "Upcoming Nov 14, 5:00 PM Men's · UMBC vs Towson/Loyola (Md.) | ",
 "Upcoming Nov 16, 6:00 PM Men's · UMBC vs Iona | ",
 "Upcoming Nov 19, 7:00 PM Men's · UMBC at Ohio State | ",
 "Upcoming Nov 22 Men's · UMBC vs Lancaster Bible | ",
 "Upcoming Nov 24, 7:00 PM Men's · UMBC at Iowa | ",
 "Upcoming Nov 27, 4:00 PM Men's · UMBC at George Washington | ",
 "Upcoming Dec 2, 11:00 AM Men's · UMBC at Army | ",
 "Upcoming Dec 5 Men's · UMBC at Delaware State | ",
 "Upcoming Dec 8, 6:00 PM Men's · UMBC vs Bucknell | ",
 "Upcoming Dec 12 Men's · UMBC at Wagner College | ",
 "Upcoming Dec 22, 9:00 PM Men's · UMBC at Grand Canyon | ",
 "Upcoming Dec 29, 6:00 PM Men's · UMBC vs Coppin State | ",
 "Upcoming Jan 2, 1:00 PM Men's · UMBC vs NJIT | ",
 "Upcoming Jan 7 Men's · UMBC at New Hampshire | ",
 "Upcoming Jan 9 Men's · UMBC at Maine | ",
 "Upcoming Jan 14 Men's · UMBC at Bryant | ",
 "Upcoming Jan 18 Men's · UMBC vs University at Albany | ",
 "Upcoming Jan 21, 6:00 PM Men's · UMBC vs Vermont | ",
 "Upcoming Jan 23, 1:00 PM Men's · UMBC vs Massachusetts Lowell | ",
 "Upcoming Jan 28 Men's · UMBC at Binghamton | ",
 "Upcoming Feb 4, 6:00 PM Men's · UMBC vs Bryant | ",
 "Upcoming Feb 6 Men's · UMBC at University at Albany | ",
 "Upcoming Feb 11, 6:00 PM Men's · UMBC vs Maine | ",
 "Upcoming Feb 13, 1:00 PM Men's · UMBC vs New Hampshire | ",
 "Upcoming Feb 18 Men's · UMBC at Vermont | ",
 "Upcoming Feb 20 Men's · UMBC at Massachusetts Lowell | ",
 "Upcoming Feb 25 Men's · UMBC at NJIT | ",
 "Upcoming Mar 2, 6:00 PM Men's · UMBC vs Binghamton | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · UMBC vs Stevenson | ",
 "Upcoming Nov 5, 6:00 PM Women's · UMBC vs Mount St. Mary's | ",
 "Upcoming Nov 8, 2:00 PM Women's · UMBC at Quinnipiac | ",
 "Upcoming Nov 13, 6:30 PM Women's · UMBC vs Morgan State | ",
 "Upcoming Nov 15 Women's · UMBC vs Towson/Loyola (Md.) | ",
 "Upcoming Nov 18, 11:00 AM Women's · UMBC at Pittsburgh | ",
 "Upcoming Nov 21, 1:00 PM Women's · UMBC at Brown | ",
 "Upcoming Nov 27, 12:00 PM Women's · UMBC at Iona | ",
 "Upcoming Dec 3, 6:00 PM Women's · UMBC at Navy | ",
 "Upcoming Dec 7, 6:00 PM Women's · UMBC vs Coppin State | ",
 "Upcoming Dec 12, 2:00 PM Women's · UMBC vs Notre Dame of Maryland | ",
 "Upcoming Dec 18, 11:00 AM Women's · UMBC at Maryland | ",
 "Upcoming Dec 21, 12:00 PM Women's · UMBC vs American | ",
 "Upcoming Dec 31, 1:00 PM Women's · UMBC at Binghamton | ",
 "Upcoming Jan 3 Women's · UMBC vs NJIT | ",
 "Upcoming Jan 7, 6:00 PM Women's · UMBC vs Maine | ",
 "Upcoming Jan 9, 2:00 PM Women's · UMBC vs New Hampshire | ",
 "Upcoming Jan 14, 12:00 PM Women's · UMBC vs Bryant | ",
 "Upcoming Jan 16, 2:00 PM Women's · UMBC at Ualbany | ",
 "Upcoming Jan 21, 6:00 PM Women's · UMBC at Vermont | ",
 "Upcoming Jan 23, 5:00 PM Women's · UMBC at Umass Lowell | ",
 "Upcoming Jan 28, 6:00 PM Women's · UMBC vs Binghamton | ",
 "Upcoming Feb 4, 11:00 AM Women's · UMBC at Bryant | ",
 "Upcoming Feb 6 Women's · UMBC vs UAlbany | ",
 "Upcoming Feb 11, 6:00 PM Women's · UMBC at Maine | ",
 "Upcoming Feb 13, 12:00 PM Women's · UMBC at New Hampshire | ",
 "Upcoming Feb 18, 6:00 PM Women's · UMBC vs Vermont | ",
 "Upcoming Feb 20, 2:00 PM Women's · UMBC vs Umass Lowell | ",
 "Upcoming Feb 25, 5:00 PM Women's · UMBC at NJIT | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · UMBC at Mount St. Mary's (Md.) | Completed",
 "Final Sep 12 Women's · UMBC at Navy (Cantello Invitational) | 3rd/4, 65 Points",
 "Final Oct 2 Women's · UMBC at Lehigh (Paul Short Invitational) | Completed",
 "Final Oct 16 Women's · UMBC at Panorama Farms Invitational | 7th of 16 (223 points)",
 "Upcoming Oct 30 Women's · UMBC at America East Championships | ",
 "Upcoming Nov 13 Women's · UMBC at NCAA Mid-Atlantic Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · UMBC at Mount St. Mary's (Md.) | Completed",
 "Final Sep 12 Men's · UMBC at Navy (Cantello Invitational) | 3rd/4, 66 Points",
 "Final Oct 2 Men's · UMBC at Lehigh (Paul Short Invitational) | 18th/32 (510 pts)",
 "Final Oct 16 Men's · UMBC at Panorama Farms Invitational | 5th of 14 (172 points)",
 "Upcoming Oct 30 Men's · UMBC at America East Championships | ",
 "Upcoming Nov 13 Men's · UMBC at NCAA Mid-Atlantic Regionals | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · UMBC vs Mount St. Mary's (Md.) | W, 3-1",
 "Final Aug 16 Women's · UMBC vs American | W, 2-1",
 "Final Aug 20 Women's · UMBC vs Fairmont State | W, 5-3",
 "Final Aug 23 Women's · UMBC vs West Chester | T, 2-2",
 "Final Aug 27 Women's · UMBC vs St. John's | L, 0-2",
 "Final Aug 30 Women's · UMBC at Delaware | T, 0-0",
 "Final Sep 3 Women's · UMBC vs Towson | W, 3-1",
 "Final Sep 6 Women's · UMBC vs Wagner College | W, 1-0",
 "Final Sep 10 Women's · UMBC at Robert Morris | L, 0-1",
 "Final Sep 13 Women's · UMBC at Longwood | W, 2-0",
 "Final Sep 20 Women's · UMBC at Vermont | L, 1-3",
 "Final Sep 27 Women's · UMBC vs New Hampshire | W, 2-1",
 "Final Oct 1 Women's · UMBC at NJIT | W, 1-0",
 "Final Oct 4 Women's · UMBC vs University at Albany | W, 5-0",
 "Final Oct 15 Women's · UMBC vs Binghamton | T, 0-0",
 "Final Oct 18 Women's · UMBC at Massachusetts Lowell | L, 0-2",
 "Upcoming Oct 25, 1:00 PM Women's · UMBC at Bryant | ",
 "Upcoming Nov 1, 12:00 PM Women's · UMBC vs Maine | ",
 "Upcoming Nov 5 Women's · UMBC at America East Quarterfinals | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 23 Men's · UMBC vs Loyola (Md.) | W, 3-2",
 "Final Aug 28 Men's · UMBC vs Presbyterian | W, 5-1",
 "Final Aug 31 Men's · UMBC vs George Washington | L, 0-3",
 "Final Sep 5 Men's · UMBC at Lehigh | T, 0-0",
 "Final Sep 11 Men's · UMBC at Old Dominion | L, 1-5",
 "Final Sep 15 Men's · UMBC vs Howard | W, 2-0",
 "Final Sep 19 Men's · UMBC vs William & Mary | L, 1-2",
 "Final Sep 26 Men's · UMBC vs UMass Lowell | L, 2-3",
 "Final Oct 2 Men's · UMBC at Bryant | L, 0-1",
 "Final Oct 10 Men's · UMBC vs Vermont | L, 0-1",
 "Final Oct 17 Men's · UMBC at Binghamton | T, 1-1",
 "Upcoming Oct 24, 3:00 PM Men's · UMBC at New Hampshire | ",
 "Upcoming Oct 30, 7:00 PM Men's · UMBC vs UAlbany | ",
 "Upcoming Nov 3, 7:00 PM Men's · UMBC vs NJIT | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · UMBC vs Alumni/Black & Gold Meet | Completed",
 "Final Oct 3 Women's · UMBC vs American | W, 212-81",
 "Final Oct 3 Women's · UMBC vs VMI | W, 238-59",
 "Final Oct 10 Women's · UMBC at Navy | L, 59-240",
 "Final Oct 10 Women's · UMBC vs William & Mary | L, 92-201",
 "Today Oct 23 Women's · UMBC at Thomas Murphy Invitational | ",
 "Upcoming Nov 7, 1:00 PM Women's · UMBC vs Mount St. Mary's (Swimming Only) | ",
 "Upcoming Nov 14, 1:00 PM Women's · UMBC at La Salle | ",
 "Upcoming Dec 4 Women's · UMBC at Bucknell Invite | ",
 "Upcoming Jan 23 Women's · UMBC at Johns Hopkins (Swimming Only) | ",
 "Upcoming Jan 23, 1:00 PM Women's · UMBC at Retriever Diving Invite | ",
 "Upcoming Jan 30, 1:00 PM Women's · UMBC at Towson | ",
 "Upcoming Feb 7 Women's · UMBC at Navy Winter Invite (Diving Only) | ",
 "Upcoming Feb 24 Women's · UMBC at America East Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · UMBC vs Alumni/Black & Gold Meet | Completed",
 "Final Oct 3 Men's · UMBC vs American | W, 231-66",
 "Final Oct 3 Men's · UMBC at VMI | Completed",
 "Final Oct 10 Men's · UMBC at Navy | L, 96-196",
 "Final Oct 10 Men's · UMBC vs William & Mary | L, 126-168",
 "Today Oct 23 Men's · UMBC at Thomas Murphy Invitational | ",
 "Upcoming Nov 7, 1:00 PM Men's · UMBC vs Mount St. Mary's (Swimming Only) | ",
 "Upcoming Nov 14, 1:00 PM Men's · UMBC at La Salle | ",
 "Upcoming Dec 4 Men's · UMBC at Bucknell Invite | ",
 "Upcoming Jan 23 Men's · UMBC at Johns Hopkins (Swimming Only) | ",
 "Upcoming Jan 23, 1:00 PM Men's · UMBC at Retriever Diving Invite | ",
 "Upcoming Jan 30, 1:00 PM Men's · UMBC at Towson | ",
 "Upcoming Feb 7 Men's · UMBC at Navy Winter Invite (Diving Only) | ",
 "Upcoming Feb 24 Men's · UMBC at America East Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 UMBC vs UTRGV | W, 3-0",
 "Final Aug 30 UMBC at West Virginia | W, 3-2",
 "Final Sep 4 UMBC at Buffalo | L, 2-3",
 "Final Sep 5 UMBC at Canisius | W, 3-0",
 "Final Sep 11 UMBC vs George Mason | L, 2-3",
 "Final Sep 12 UMBC vs George Washington | L, 1-3",
 "Final Sep 13 UMBC vs Georgetown | W, 3-1",
 "Final Sep 18 UMBC at Villanova | L, 2-3",
 "Final Sep 19 UMBC at Temple | L, 0-3",
 "Final Sep 25 UMBC at UAlbany | W, 3-2",
 "Final Sep 27 UMBC at Bryant | W, 3-0",
 "Final Oct 4 UMBC vs NJIT | W, 3-0",
 "Final Oct 9 UMBC at Binghamton | W, 3-0",
 "Final Oct 13 UMBC vs Howard | W, 3-1",
 "Final Oct 18 UMBC vs New Hampshire | W, 3-0",
 "Upcoming Oct 24, 1:00 PM UMBC vs Bryant | ",
 "Upcoming Oct 28, 5:00 PM UMBC vs Coppin State | ",
 "Upcoming Nov 1, 1:00 PM UMBC vs UAlbany | ",
 "Upcoming Nov 6, 7:00 PM UMBC at New Hampshire | ",
 "Upcoming Nov 13, 5:00 PM UMBC at NJIT | ",
 "Upcoming Nov 15, 1:00 PM UMBC vs Binghamton | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UMBC module checks passed");
