import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {leMoyneSchool} from '../src/schools/le-moyne.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='le-moyne');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,leMoyneHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/le-moyne-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lemoynedolphins.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['le-moyne'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',leMoyneSchool.scheduleUrls],['roster',leMoyneSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('le-moyne|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lemoynedolphins.com',`${key} must stay on lemoynedolphins.com`);
  }
}
const parity={"Baseball":{"schedule":["https://lemoynedolphins.com/sports/baseball/schedule"],"roster":["https://lemoynedolphins.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://lemoynedolphins.com/sports/mens-basketball/schedule","https://lemoynedolphins.com/sports/womens-basketball/schedule"],"roster":["https://lemoynedolphins.com/sports/mens-basketball/roster","https://lemoynedolphins.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://lemoynedolphins.com/sports/womens-bowling/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://lemoynedolphins.com/sports/womens-cross-country/schedule","https://lemoynedolphins.com/sports/mens-cross-country/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-cross-country/roster","https://lemoynedolphins.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://lemoynedolphins.com/sports/womens-golf/schedule","https://lemoynedolphins.com/sports/mens-golf/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-golf/roster","https://lemoynedolphins.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://lemoynedolphins.com/sports/womens-lacrosse/schedule","https://lemoynedolphins.com/sports/mens-lacrosse/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-lacrosse/roster","https://lemoynedolphins.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://lemoynedolphins.com/sports/womens-soccer/schedule","https://lemoynedolphins.com/sports/mens-soccer/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-soccer/roster","https://lemoynedolphins.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://lemoynedolphins.com/sports/softball/schedule"],"roster":["https://lemoynedolphins.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://lemoynedolphins.com/sports/womens-swimming-and-diving/schedule","https://lemoynedolphins.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-swimming-and-diving/roster","https://lemoynedolphins.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://lemoynedolphins.com/sports/womens-tennis/schedule","https://lemoynedolphins.com/sports/mens-tennis/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-tennis/roster","https://lemoynedolphins.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://lemoynedolphins.com/sports/womens-track-and-field/schedule","https://lemoynedolphins.com/sports/mens-track-and-field/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-track-and-field/roster","https://lemoynedolphins.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://lemoynedolphins.com/sports/womens-volleyball/schedule"],"roster":["https://lemoynedolphins.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'le-moyne|"+sport+"':"),`${sport} routes must live in the Le Moyne module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://lemoynedolphins.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.leMoyneHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=le-moyne)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:30 PM Men's · Le Moyne at Nebraska | ",
 "Upcoming Nov 5, 8:00 PM Men's · Le Moyne at Creighton | ",
 "Upcoming Nov 9, 7:00 PM Men's · Le Moyne vs Elmira College | ",
 "Upcoming Nov 14, 6:00 PM Men's · Le Moyne vs Manhattan | ",
 "Upcoming Nov 17, 8:00 PM Men's · Le Moyne at Evansville | ",
 "Upcoming Nov 20, 8:00 PM Men's · Le Moyne at Missouri | ",
 "Upcoming Nov 23, 7:00 PM Men's · Le Moyne vs Mansfield | ",
 "Upcoming Nov 27, 2:00 PM Men's · Le Moyne vs Maine | ",
 "Upcoming Nov 28, 2:00 PM Men's · Le Moyne vs Niagara | ",
 "Upcoming Nov 29, 2:30 PM Men's · Le Moyne at Lafayette College | ",
 "Upcoming Dec 3, 7:00 PM Men's · Le Moyne vs Binghamton | ",
 "Upcoming Dec 6, 1:00 PM Men's · Le Moyne at Clemson | ",
 "Upcoming Dec 13, 5:00 PM Men's · Le Moyne at Fairfield | ",
 "Upcoming Dec 18, 7:00 PM Men's · Le Moyne at Saint Peter's | ",
 "Upcoming Dec 21, 2:00 PM Men's · Le Moyne at Notre Dame | ",
 "Upcoming Dec 29, 7:00 PM Men's · Le Moyne vs SUNY - Environmental Science and Forestry | ",
 "Upcoming Jan 2, 2:00 PM Men's · Le Moyne at LIU | ",
 "Upcoming Jan 4, 7:00 PM Men's · Le Moyne vs Mercyhurst | ",
 "Upcoming Jan 8, 7:00 PM Men's · Le Moyne vs Central Connecticut State | ",
 "Upcoming Jan 10, 1:00 PM Men's · Le Moyne vs Stonehill College | ",
 "Upcoming Jan 14, 7:00 PM Men's · Le Moyne at FDU | ",
 "Upcoming Jan 16, 1:00 PM Men's · Le Moyne at Wagner College | ",
 "Upcoming Jan 23, 3:30 PM Men's · Le Moyne at Mercyhurst | ",
 "Upcoming Jan 28, 7:00 PM Men's · Le Moyne vs Chicago State | ",
 "Upcoming Feb 3, 7:00 PM Men's · Le Moyne at New Haven | ",
 "Upcoming Feb 6, 1:00 PM Men's · Le Moyne vs LIU | ",
 "Upcoming Feb 11, 7:00 PM Men's · Le Moyne at Central Connecticut State | ",
 "Upcoming Feb 13, 2:00 PM Men's · Le Moyne at Stonehill College | ",
 "Upcoming Feb 18, 7:00 PM Men's · Le Moyne vs New Haven | ",
 "Upcoming Feb 20, 2:00 PM Men's · Le Moyne at Chicago State | ",
 "Upcoming Feb 25, 7:00 PM Men's · Le Moyne vs Wagner College | ",
 "Upcoming Feb 27, 1:00 PM Men's · Le Moyne vs FDU | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:30 PM Women's · Le Moyne at SMU | ",
 "Upcoming Nov 5, 7:30 PM Women's · Le Moyne at TCU | ",
 "Upcoming Nov 10, 6:00 PM Women's · Le Moyne vs SUNY Geneseo | ",
 "Upcoming Nov 13, 5:30 PM Women's · Le Moyne at Central Florida | ",
 "Upcoming Nov 16, 11:00 AM Women's · Le Moyne at Miami | ",
 "Upcoming Nov 21, 1:00 PM Women's · Le Moyne at Niagara | ",
 "Upcoming Nov 24, 11:00 AM Women's · Le Moyne vs Bucknell | ",
 "Upcoming Nov 29, 1:00 PM Women's · Le Moyne vs Lafayette College | ",
 "Upcoming Dec 2, 11:00 AM Women's · Le Moyne at Manhattan | ",
 "Upcoming Dec 6, 2:00 PM Women's · Le Moyne at Cornell | ",
 "Upcoming Dec 13, 12:00 PM Women's · Le Moyne vs Kentucky | ",
 "Upcoming Dec 16, 6:00 PM Women's · Le Moyne vs Syracuse | ",
 "Upcoming Dec 19, 1:00 PM Women's · Le Moyne vs Colgate | ",
 "Upcoming Dec 21, 1:00 PM Women's · Le Moyne at St. Bonaventure | ",
 "Upcoming Dec 30, 6:00 PM Women's · Le Moyne vs Marywood | ",
 "Upcoming Jan 2, 1:00 PM Women's · Le Moyne vs Mercyhurst | ",
 "Upcoming Jan 7, 7:00 PM Women's · Le Moyne at Central Connecticut State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Le Moyne at Stonehill College | ",
 "Upcoming Jan 14, 6:00 PM Women's · Le Moyne vs FDU | ",
 "Upcoming Jan 16, 1:00 PM Women's · Le Moyne vs Wagner College | ",
 "Upcoming Jan 23, 1:00 PM Women's · Le Moyne vs LIU | ",
 "Upcoming Jan 28, 7:00 PM Women's · Le Moyne at Chicago State | ",
 "Upcoming Feb 4, 6:00 PM Women's · Le Moyne vs New Haven | ",
 "Upcoming Feb 6, 2:00 PM Women's · Le Moyne at LIU | ",
 "Upcoming Feb 11, 6:00 PM Women's · Le Moyne vs Central Connecticut State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Le Moyne vs Stonehill College | ",
 "Upcoming Feb 17, 6:00 PM Women's · Le Moyne at New Haven | ",
 "Upcoming Feb 20, 1:00 PM Women's · Le Moyne vs Chicago State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Le Moyne at Wagner College | ",
 "Upcoming Feb 27, 2:00 PM Women's · Le Moyne at FDU | ",
 "Upcoming Mar 4, 6:00 PM Women's · Le Moyne at Mercyhurst | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 3 Le Moyne vs William Smith College | L, 801-887",
 "Final Oct 3 Le Moyne vs Hilbert College | W, 843-806",
 "Final Oct 3 Le Moyne vs Duquesne | W, 885-882",
 "Final Oct 3 Le Moyne vs Roberts Wesleyan | L, 745-785",
 "Final Oct 4 Le Moyne vs D'Youville | L, 832-868",
 "Final Oct 4 Le Moyne at Mercyhurst | W, 875-773",
 "Final Oct 4 Le Moyne vs Daemen | W, 857-845",
 "Final Oct 4 Le Moyne vs Niagara | L, 861-956",
 "Final Oct 4 Le Moyne vs Hilbert College (7th Place Match) | W, 4-1",
 "Upcoming Oct 24 Le Moyne at Niagara University Fall Open | ",
 "Upcoming Oct 30 Le Moyne at Windy City Classic | ",
 "Upcoming Nov 13 Le Moyne at NEC Meet #1 | ",
 "Upcoming Jan 15 Le Moyne at Northeast Classic | ",
 "Upcoming Jan 30 Le Moyne at William Smith College | ",
 "Upcoming Feb 12 Le Moyne at NEC Meet #2 | ",
 "Upcoming Feb 20 Le Moyne at Niagara University Spring Classic | ",
 "Upcoming Mar 5 Le Moyne at Music City Classic | ",
 "Upcoming Mar 19 Le Moyne at NEC Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Le Moyne at Harry Lang Invitational | 3rd of 3 · 74 pts",
 "Final Sep 12 Women's · Le Moyne at Frank Dillon Memorial Invitational | 2nd of 2 · 37 pts",
 "Final Sep 19 Women's · Le Moyne at Yellowjacket Invitational | 9th of 16 · 261 pts",
 "Final Oct 17 Women's · Le Moyne at Canisius Alumni Classic | 6th of 12 · 174 pts",
 "Upcoming Oct 31 Women's · Le Moyne at NEC Championships | ",
 "Upcoming Nov 13 Women's · Le Moyne at NCAA Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Le Moyne at Harry Lang Invitational | 3rd of 3 · 70 pts",
 "Final Sep 12 Men's · Le Moyne at Frank Dillon Memorial Invitational | 2nd of 3 · 31 pts",
 "Final Sep 19 Men's · Le Moyne at Yellowjacket Invitational | 9th of 17 · 242 pts",
 "Final Oct 17 Men's · Le Moyne at Canisius Alumni Classic | 6th of 13 · 180 pts",
 "Upcoming Oct 31 Men's · Le Moyne at NEC Championships | ",
 "Upcoming Nov 13 Men's · Le Moyne at NCAA Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Le Moyne at Roseann Schwartz Invitational | 10th of 11",
 "Final Sep 7 Women's · Le Moyne at Tribe Invitational | 5th of 8",
 "Final Sep 11 Women's · Le Moyne at Bucknell Invitational | T7th of 16",
 "Final Sep 21 Women's · Le Moyne at Red Bandanna Invitational | 10th of 15",
 "Final Sep 28 Women's · Le Moyne at Lehigh Invitational | 5th of 11",
 "Final Oct 19 Women's · Le Moyne at Crusader Invitational Presented By Cove Risk | T7th of 13",
 "Upcoming Feb 22 Women's · Le Moyne at Babs Steffens Invitational | ",
 "Upcoming Mar 8 Women's · Le Moyne at Le Moyne Spring Invitational | ",
 "Upcoming Mar 22 Women's · Le Moyne at Kingsmill Intercollegiate | ",
 "Upcoming Apr 11 Women's · Le Moyne at Lehigh Spring Spectacular | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Le Moyne at Alex Lagowitz Memorial | 12th of 14",
 "Final Sep 19 Men's · Le Moyne at Ryan T. Lee Memorial Collegiate | 10th of 18",
 "Final Sep 27 Men's · Le Moyne at CNY Challenge Cup | 2nd of 3",
 "Final Oct 4 Men's · Le Moyne at Matthews Auto Collegiate Invitational | 5th of 13",
 "Final Oct 19 Men's · Le Moyne at Blue Hen Intercollegiate | 5th of 14",
 "Upcoming Mar 1 Men's · Le Moyne at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 20 Men's · Le Moyne at Carpetbagger Classic | ",
 "Upcoming Mar 29 Men's · Le Moyne at ECU Intercollegiate | ",
 "Upcoming Apr 11 Men's · Le Moyne at Abarta Coca-Cola Collegiate Invitational | ",
 "Upcoming Apr 17 Men's · Le Moyne at Rutherford Intercollegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Le Moyne at Canisius | L, 0-2",
 "Final Aug 16 Women's · Le Moyne vs Iona | L, 1-2",
 "Final Aug 20 Women's · Le Moyne vs Niagara | L, 0-2",
 "Final Aug 23 Women's · Le Moyne vs Binghamton | L, 0-4",
 "Final Aug 27 Women's · Le Moyne at St. Bonaventure | L, 0-2",
 "Final Aug 30 Women's · Le Moyne at Saint Peter's | W, 2-1",
 "Final Sep 2 Women's · Le Moyne vs Siena | L, 0-4",
 "Final Sep 6 Women's · Le Moyne at University at Albany | L, 1-2",
 "Final Sep 10 Women's · Le Moyne vs Temple | L, 0-1",
 "Final Sep 17 Women's · Le Moyne at FDU | L, 0-5",
 "Final Sep 27 Women's · Le Moyne vs Delaware State | W, 3-1",
 "Final Oct 1 Women's · Le Moyne at Stonehill College | L, 0-1",
 "Final Oct 4 Women's · Le Moyne vs Mercyhurst | T, 2-2",
 "Final Oct 8 Women's · Le Moyne vs LIU | W, 2-1",
 "Final Oct 11 Women's · Le Moyne at Howard | W, 3-2",
 "Final Oct 18 Women's · Le Moyne at Chicago State | W, 3-1",
 "Upcoming Oct 25, 1:00 PM Women's · Le Moyne vs Central Connecticut State | ",
 "Upcoming Nov 1, 1:00 PM Women's · Le Moyne at Wagner College | ",
 "Upcoming Nov 8, 1:00 PM Women's · Le Moyne vs New Haven | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Le Moyne vs Canisius | W, 1-0",
 "Final Aug 23 Men's · Le Moyne vs SUNY Polytechnic Institute | W, 2-0",
 "Final Aug 27 Men's · Le Moyne at Colgate | W, 3-1",
 "Final Aug 30 Men's · Le Moyne at St. Bonaventure | T, 0-0",
 "Final Sep 5 Men's · Le Moyne vs Niagara | L, 0-1",
 "Final Sep 12 Men's · Le Moyne at Binghamton | T, 1-1",
 "Final Sep 15 Men's · Le Moyne vs Lafayette College | W, 3-0",
 "Final Sep 19 Men's · Le Moyne at Syracuse | L, 0-2",
 "Final Oct 1 Men's · Le Moyne vs New Haven | T, 2-2",
 "Final Oct 4 Men's · Le Moyne at Stonehill College | W, 3-0",
 "Final Oct 11 Men's · Le Moyne vs FDU | T, 1-1",
 "Final Oct 15 Men's · Le Moyne at Chicago State | W, 4-0",
 "Final Oct 18 Men's · Le Moyne vs Central Connecticut State | L, 0-1",
 "Upcoming Oct 25, 1:00 PM Men's · Le Moyne at Mercyhurst | ",
 "Upcoming Nov 1, 1:00 PM Men's · Le Moyne vs Howard | ",
 "Upcoming Nov 8, 1:00 PM Men's · Le Moyne at LIU | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 26 Women's · Le Moyne at Binghamton | Completed",
 "Final Sep 26 Women's · Le Moyne at Stonehill College | Completed",
 "Final Oct 9 Women's · Le Moyne at Colgate Invite | Completed",
 "Today Oct 23, 12:00 PM Women's · Le Moyne vs Niagara | ",
 "Upcoming Nov 13 Women's · Le Moyne at Keydet Invite | ",
 "Upcoming Dec 12 Women's · Le Moyne at CSCAA Open Water National Championships | ",
 "Upcoming Jan 13, 12:00 PM Women's · Le Moyne at Canisius | ",
 "Upcoming Jan 17, 1:00 PM Women's · Le Moyne at Colgate | ",
 "Upcoming Jan 23 Women's · Le Moyne vs St. Bonaventure | ",
 "Upcoming Jan 30, 12:00 PM Women's · Le Moyne at Binghamton | ",
 "Upcoming Feb 18 Women's · Le Moyne at NEC Championships | ",
 "Upcoming Mar 12 Women's · Le Moyne at CSCAA National Invitational Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 26 Men's · Le Moyne at Binghamton | Completed",
 "Final Oct 9 Men's · Le Moyne at Colgate Invite | Completed",
 "Final Oct 23 Men's · Le Moyne vs Niagara | W, 155-136",
 "Upcoming Nov 13 Men's · Le Moyne at Keydet Invite | ",
 "Upcoming Dec 2 Men's · Le Moyne at USA Swimming Toyota U.S. Open Championships - Neil Adamski & Lucas Clay | ",
 "Upcoming Dec 12 Men's · Le Moyne at CSCAA Open Water National Championships | ",
 "Upcoming Jan 13, 12:00 PM Men's · Le Moyne at Canisius | ",
 "Upcoming Jan 17, 1:00 PM Men's · Le Moyne at Colgate | ",
 "Upcoming Jan 23 Men's · Le Moyne vs St. Bonaventure | ",
 "Upcoming Jan 30, 12:00 PM Men's · Le Moyne at Binghamton | ",
 "Upcoming Feb 17 Men's · Le Moyne at Northeast Conference Championships | ",
 "Upcoming Mar 12 Men's · Le Moyne at CSCAA National Invitational Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Le Moyne at Binghamton Championships | Completed",
 "Final Oct 8 Women's · Le Moyne at ITA New England Regional | Completed",
 "Today Oct 23, 2:30 PM Women's · Le Moyne at Monmouth | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Le Moyne at Binghamton Championships | Completed",
 "Final Oct 3 Men's · Le Moyne at Colgate University Invitational | Completed",
 "Final Oct 8 Men's · Le Moyne at ITA New England Regional | Completed",
 "Today Oct 23, 11:00 AM Men's · Le Moyne at Monmouth | ",
 "Upcoming Oct 24, 6:00 PM Men's · Le Moyne vs Iona | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Le Moyne at North Carolina Wilmington | L, 0-3",
 "Final Aug 28 Le Moyne vs The Citadel | L, 0-3",
 "Final Aug 29 Le Moyne vs Kennesaw State | L, 0-3",
 "Final Sep 4 Le Moyne at Sacred Heart | L, 0-3",
 "Final Sep 5 Le Moyne vs Binghamton | L, 0-3",
 "Final Sep 11 Le Moyne vs Bucknell | L, 0-3",
 "Final Sep 11 Le Moyne at Siena | L, 0-3",
 "Final Sep 12 Le Moyne vs Delaware State | L, 1-3",
 "Final Sep 18 Le Moyne vs Valparaiso | L, 0-3",
 "Final Sep 18 Le Moyne at Canisius | L, 0-3",
 "Final Sep 19 Le Moyne at Niagara | L, 0-3",
 "Final Oct 2 Le Moyne at LIU | L, 0-3",
 "Final Oct 3 Le Moyne at LIU | L, 0-3",
 "Final Oct 9 Le Moyne vs New Haven | L, 1-3",
 "Final Oct 10 Le Moyne vs New Haven | L, 0-3",
 "Final Oct 16 Le Moyne at Mercyhurst | L, 0-3",
 "Final Oct 17 Le Moyne at Mercyhurst | L, 1-3",
 "Final Oct 20 Le Moyne vs Siena | L, 0-3",
 "Today Oct 23, 7:00 PM Le Moyne at Chicago State | ",
 "Upcoming Oct 24, 2:00 PM Le Moyne at Chicago State | ",
 "Upcoming Oct 30, 6:00 PM Le Moyne vs Stonehill College | ",
 "Upcoming Oct 31, 1:00 PM Le Moyne vs Stonehill College | ",
 "Upcoming Nov 6, 6:00 PM Le Moyne at Central Connecticut State | ",
 "Upcoming Nov 7, 1:00 PM Le Moyne at Central Connecticut State | ",
 "Upcoming Nov 13, 6:00 PM Le Moyne vs FDU | ",
 "Upcoming Nov 14, 1:00 PM Le Moyne vs FDU | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Le Moyne module checks passed");
