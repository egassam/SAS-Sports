import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mercyhurstSchool} from '../src/schools/mercyhurst.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='mercyhurst');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,mercyhurstHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/mercyhurst-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit hurstathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['mercyhurst'];
assert.equal(sports.length,18);
for(const [name,map] of [['schedule',mercyhurstSchool.scheduleUrls],['roster',mercyhurstSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('mercyhurst|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'hurstathletics.com',`${key} must stay on hurstathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://hurstathletics.com/sports/baseball/schedule"],"roster":["https://hurstathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://hurstathletics.com/sports/mens-basketball/schedule","https://hurstathletics.com/sports/womens-basketball/schedule"],"roster":["https://hurstathletics.com/sports/mens-basketball/roster","https://hurstathletics.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://hurstathletics.com/sports/bowling/schedule"],"roster":["https://hurstathletics.com/sports/bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://hurstathletics.com/sports/womens-cross-country/schedule","https://hurstathletics.com/sports/mens-cross-country/schedule"],"roster":["https://hurstathletics.com/sports/womens-cross-country/roster","https://hurstathletics.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://hurstathletics.com/sports/field-hockey/schedule"],"roster":["https://hurstathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://hurstathletics.com/sports/football/schedule"],"roster":["https://hurstathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://hurstathletics.com/sports/womens-golf/schedule","https://hurstathletics.com/sports/mens-golf/schedule"],"roster":["https://hurstathletics.com/sports/womens-golf/roster","https://hurstathletics.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://hurstathletics.com/sports/womens-ice-hockey/schedule"],"roster":["https://hurstathletics.com/sports/womens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://hurstathletics.com/sports/womens-lacrosse/schedule","https://hurstathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://hurstathletics.com/sports/womens-lacrosse/roster","https://hurstathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://hurstathletics.com/sports/womens-rowing/schedule","https://hurstathletics.com/sports/mens-rowing/schedule"],"roster":["https://hurstathletics.com/sports/womens-rowing/roster","https://hurstathletics.com/sports/mens-rowing/roster"],"combined":true},"STUNT":{"schedule":["https://hurstathletics.com/sports/stunt/schedule"],"roster":["https://hurstathletics.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://hurstathletics.com/sports/womens-soccer/schedule","https://hurstathletics.com/sports/mens-soccer/schedule"],"roster":["https://hurstathletics.com/sports/womens-soccer/roster","https://hurstathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://hurstathletics.com/sports/softball/schedule"],"roster":["https://hurstathletics.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://hurstathletics.com/sports/womens-tennis/schedule","https://hurstathletics.com/sports/mens-tennis/schedule"],"roster":["https://hurstathletics.com/sports/womens-tennis/roster","https://hurstathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://hurstathletics.com/sports/womens-track-and-field/schedule","https://hurstathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://hurstathletics.com/sports/womens-track-and-field/roster","https://hurstathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://hurstathletics.com/sports/womens-volleyball/schedule"],"roster":["https://hurstathletics.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://hurstathletics.com/sports/womens-water-polo/schedule","https://hurstathletics.com/sports/mens-water-polo/schedule"],"roster":["https://hurstathletics.com/sports/womens-water-polo/roster","https://hurstathletics.com/sports/mens-water-polo/roster"],"combined":true},"Wrestling":{"schedule":["https://hurstathletics.com/sports/wrestling/schedule","https://hurstathletics.com/sports/womens-wrestling/schedule"],"roster":["https://hurstathletics.com/sports/wrestling/roster","https://hurstathletics.com/sports/womens-wrestling/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'mercyhurst|"+sport+"':"),`${sport} routes must live in the Mercyhurst module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://hurstathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.mercyhurstHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=mercyhurst)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 28, 7:00 PM Men's · Mercyhurst at Louisville (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Mercyhurst at Marquette | ",
 "Upcoming Nov 5, 7:00 PM Men's · Mercyhurst at Notre Dame | ",
 "Upcoming Nov 7, 4:00 PM Men's · Mercyhurst vs Penn St Shenango | ",
 "Upcoming Nov 12, 6:30 PM Men's · Mercyhurst at Penn State | ",
 "Upcoming Nov 15, 4:00 PM Men's · Mercyhurst at JMU | ",
 "Upcoming Nov 20, 5:30 PM Men's · Mercyhurst at Canisius | ",
 "Upcoming Nov 21, 1:30 PM Men's · Mercyhurst vs Western Illinois | ",
 "Upcoming Nov 22, 3:30 PM Men's · Mercyhurst vs University at Albany | ",
 "Upcoming Nov 24, 7:00 PM Men's · Mercyhurst vs Fredonia St | ",
 "Upcoming Dec 1, 7:00 PM Men's · Mercyhurst at WVU | ",
 "Upcoming Dec 5, 2:00 PM Men's · Mercyhurst at Morgan State | ",
 "Upcoming Dec 7, 7:00 PM Men's · Mercyhurst at Coppin St | ",
 "Upcoming Dec 12, 5:00 PM Men's · Mercyhurst at Syracuse | ",
 "Upcoming Dec 14, 12:00 PM Men's · Mercyhurst vs Mount Aloysius | ",
 "Upcoming Dec 16, 7:00 PM Men's · Mercyhurst at Northwestern | ",
 "Upcoming Dec 19, 12:00 PM Men's · Mercyhurst at St Bonaventure | ",
 "Upcoming Jan 2 Men's · Mercyhurst at New Haven | ",
 "Upcoming Jan 4 Men's · Mercyhurst at Le Moyne | ",
 "Upcoming Jan 8, 7:00 PM Men's · Mercyhurst vs Stonehill | ",
 "Upcoming Jan 10, 2:00 PM Men's · Mercyhurst vs Central Connecticut | ",
 "Upcoming Jan 14 Men's · Mercyhurst at Wagner | ",
 "Upcoming Jan 16 Men's · Mercyhurst at FDU | ",
 "Upcoming Jan 21 Men's · Mercyhurst at LIU | ",
 "Upcoming Jan 23, 3:30 PM Men's · Mercyhurst vs Le Moyne | ",
 "Upcoming Jan 30, 2:00 PM Men's · Mercyhurst vs Chicago State | ",
 "Upcoming Feb 4, 7:00 PM Men's · Mercyhurst vs LIU | ",
 "Upcoming Feb 11 Men's · Mercyhurst at Stonehill | ",
 "Upcoming Feb 13 Men's · Mercyhurst at Central Connecticut | ",
 "Upcoming Feb 17 Men's · Mercyhurst at Chicago State | ",
 "Upcoming Feb 20, 2:00 PM Men's · Mercyhurst vs New Haven | ",
 "Upcoming Feb 25, 7:00 PM Men's · Mercyhurst vs FDU | ",
 "Upcoming Feb 27, 2:00 PM Men's · Mercyhurst vs Wagner | ",
 "Upcoming Mar 3 Men's · Mercyhurst at NEC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Women's · Mercyhurst at Seton Hall | ",
 "Upcoming Nov 5, 6:00 PM Women's · Mercyhurst vs Penn St Beaver | ",
 "Upcoming Nov 8, 1:00 PM Women's · Mercyhurst at Ohio State | ",
 "Upcoming Nov 11, 4:30 PM Women's · Mercyhurst at St Bonaventure | ",
 "Upcoming Nov 14, 5:00 PM Women's · Mercyhurst vs Akron | ",
 "Upcoming Nov 18, 6:00 PM Women's · Mercyhurst at Cornell | ",
 "Upcoming Nov 21, 5:00 PM Women's · Mercyhurst vs Siena | ",
 "Upcoming Nov 25, 1:00 PM Women's · Mercyhurst vs Canisius | ",
 "Upcoming Nov 29, 1:00 PM Women's · Mercyhurst vs Thiel | ",
 "Upcoming Dec 2, 6:00 PM Women's · Mercyhurst at Colgate | ",
 "Upcoming Dec 6, 1:00 PM Women's · Mercyhurst vs Niagara | ",
 "Upcoming Dec 11, 7:00 PM Women's · Mercyhurst at Cleveland St | ",
 "Upcoming Dec 15, 7:00 PM Women's · Mercyhurst at Minnesota | ",
 "Upcoming Dec 17, 7:00 PM Women's · Mercyhurst at Pitt | ",
 "Upcoming Dec 20, 11:00 AM Women's · Mercyhurst at RMU | ",
 "Upcoming Dec 29, 6:00 PM Women's · Mercyhurst vs Allegheny | ",
 "Upcoming Jan 2, 1:00 PM Women's · Mercyhurst at Le Moyne | ",
 "Upcoming Jan 7, 6:00 PM Women's · Mercyhurst at Stonehill | ",
 "Upcoming Jan 9, 1:00 PM Women's · Mercyhurst at Central Connecticut | ",
 "Upcoming Jan 14, 6:00 PM Women's · Mercyhurst vs Wagner | ",
 "Upcoming Jan 16 Women's · Mercyhurst vs FDU | ",
 "Upcoming Jan 21 Women's · Mercyhurst vs Long Island | ",
 "Upcoming Jan 23, 1:00 PM Women's · Mercyhurst vs New Haven | ",
 "Upcoming Jan 30, 1:00 PM Women's · Mercyhurst at Chicago State | ",
 "Upcoming Feb 4, 7:00 PM Women's · Mercyhurst at Long Island | ",
 "Upcoming Feb 11, 6:00 PM Women's · Mercyhurst vs Stonehill | ",
 "Upcoming Feb 13, 1:00 PM Women's · Mercyhurst vs Central Connecticut | ",
 "Upcoming Feb 17, 6:00 PM Women's · Mercyhurst vs Chicago State | ",
 "Upcoming Feb 20, 1:00 PM Women's · Mercyhurst at New Haven | ",
 "Upcoming Feb 25, 5:00 PM Women's · Mercyhurst at FDU | ",
 "Upcoming Feb 27, 2:00 PM Women's · Mercyhurst at Wagner | ",
 "Upcoming Mar 4, 6:00 PM Women's · Mercyhurst vs Le Moyne | ",
 "Upcoming Mar 8 Women's · Mercyhurst at NEC Tournament | "
]);
  const v_bowling=parse("Bowling","bowling");
  assert.deepEqual(v_bowling.map(line),[
 "Final Oct 3 Mercyhurst at Mercyhurst Invitational | 5th of 9",
 "Final Oct 16 Mercyhurst at Chelsea Gilliam Penguin Classic | 15th of 18",
 "Upcoming Oct 24 Mercyhurst at Niagara Brunswick Fall Open | ",
 "Upcoming Nov 6 Mercyhurst at Duquesne Invitational | ",
 "Upcoming Nov 13 Mercyhurst at NEC Meet #1 | ",
 "Upcoming Feb 5 Mercyhurst at Mount Shootout | ",
 "Upcoming Feb 12 Mercyhurst at NEC Meet #2 | ",
 "Upcoming Feb 20 Mercyhurst at Niagara Brunswick Spring Classic | ",
 "Upcoming Mar 19 Mercyhurst at NEC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 1 Women's · Mercyhurst at Race in the Park (Exhibition) | Completed",
 "Final Sep 5 Women's · Mercyhurst at Doug Watts Open | Completed",
 "Final Sep 26 Women's · Mercyhurst at Lock Haven Invitational | Completed",
 "Final Oct 3 Women's · Mercyhurst at Louisville Cross Country Classic | Completed",
 "Final Oct 17 Women's · Mercyhurst at Canisius Alumni Classic | Completed",
 "Upcoming Oct 31 Women's · Mercyhurst at NEC Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 1 Men's · Mercyhurst at Race in the Park (Exhibition) | Completed",
 "Final Sep 5 Men's · Mercyhurst at Doug Watts Open | Completed",
 "Final Sep 26 Men's · Mercyhurst at Lock Haven Invitational | Completed",
 "Final Oct 3 Men's · Mercyhurst at Louisville Cross Country Classic | Completed",
 "Final Oct 17 Men's · Mercyhurst at Canisius Alumni Classic | Completed",
 "Upcoming Oct 31 Men's · Mercyhurst at NEC Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Mercyhurst at Lock Haven | L, 2-5",
 "Final Sep 6 Mercyhurst at Saint Louis | L, 1-4",
 "Final Sep 8 Mercyhurst vs Saint Francis | W, 2-1",
 "Final Sep 11 Mercyhurst at Central Michigan | L, 0-9",
 "Final Sep 12 Mercyhurst vs Saint Louis | L, 0-6",
 "Final Sep 18 Mercyhurst vs Wagner | L, 0-3",
 "Final Sep 25 Mercyhurst at Merrimack | L, 1-2",
 "Final Sep 28 Mercyhurst at Stonehill | L, 1-2",
 "Final Oct 2 Mercyhurst vs LIU | L, 2-4",
 "Final Oct 4 Mercyhurst at Ohio | L, 0-14",
 "Final Oct 6 Mercyhurst at Saint Francis | W, 3-0",
 "Final Oct 9 Mercyhurst at Rider | L, 0-7",
 "Final Oct 16 Mercyhurst vs Quinnipiac | L, 1-5",
 "Final Oct 18 Mercyhurst vs New Haven | W, 3-1",
 "Today Oct 23, 5:00 PM Mercyhurst at Davidson | ",
 "Upcoming Oct 30, 12:00 PM Mercyhurst at Sacred Heart | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Mercyhurst at Youngstown State | L, 10-43",
 "Final Sep 5 Mercyhurst at New Mexico State | L, 14-51",
 "Final Sep 12 Mercyhurst at New Mexico | L, 7-70",
 "Final Sep 19 Mercyhurst vs Glenville State | W, 49-20",
 "Final Sep 26 Mercyhurst at Western Kentucky | L, 7-52",
 "Final Oct 3 Mercyhurst at LIU | L, 24-27",
 "Final Oct 17 Mercyhurst vs Central Connecticut State | L, 40-43",
 "Upcoming Oct 24, 2:00 PM Mercyhurst at Robert Morris | ",
 "Upcoming Oct 31, 12:00 PM Mercyhurst at Stonehill | ",
 "Upcoming Nov 7, 12:00 PM Mercyhurst vs Wagner | ",
 "Upcoming Nov 14, 12:00 PM Mercyhurst at Duquesne | ",
 "Upcoming Nov 21, 12:00 PM Mercyhurst vs New Haven | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Mercyhurst at Roseann Schwartz Invitational | 9th of 11",
 "Final Sep 11 Women's · Mercyhurst at Bucknell Fall Invitational | 9th of 15",
 "Final Sep 28 Women's · Mercyhurst at Duquesne Fall Invitational | 6th of 7",
 "Final Oct 4 Women's · Mercyhurst at Youngstown State | Match play: 0-1",
 "Final Oct 12 Women's · Mercyhurst at Evann Parker Memorial | 2nd of 6"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Mercyhurst at Marshall Joe Feaganes Invitational | 14th of 14",
 "Final Sep 20 Men's · Mercyhurst at Mercyhurst Fall Invitational | 2nd of 7",
 "Final Oct 4 Men's · Mercyhurst at Binghamton Matthews Auto Collegiate Invitational | 11th of 13",
 "Final Oct 11 Men's · Mercyhurst at Bucknell Invitational | 11th of 18",
 "Upcoming Oct 24 Men's · Mercyhurst at Lehigh Invitational | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 18 Mercyhurst vs RPI | W, 3-1",
 "Final Sep 19 Mercyhurst vs RPI | W, 3-0",
 "Final Sep 25 Mercyhurst at UMD | L, 0-2",
 "Final Sep 26 Mercyhurst at UMD | L, 0-4",
 "Final Oct 2 Mercyhurst vs Syracuse | L, 1-3",
 "Final Oct 3 Mercyhurst vs Syracuse | W, 5-2",
 "Final Oct 8 Mercyhurst at Lindenwood | W, 2-1",
 "Final Oct 9 Mercyhurst at Lindenwood | W, 4-0",
 "Today Oct 23, 6:00 PM Mercyhurst at UConn | ",
 "Upcoming Oct 24, 1:00 PM Mercyhurst at UConn | ",
 "Upcoming Oct 30, 6:00 PM Mercyhurst vs Assumption | ",
 "Upcoming Oct 31, 1:00 PM Mercyhurst vs Assumption | ",
 "Upcoming Nov 6, 6:00 PM Mercyhurst at Delaware | ",
 "Upcoming Nov 7, 2:00 PM Mercyhurst at Delaware | ",
 "Upcoming Nov 13, 6:00 PM Mercyhurst vs Penn State | ",
 "Upcoming Nov 14, 1:00 PM Mercyhurst vs Penn State | ",
 "Upcoming Nov 20, 6:00 PM Mercyhurst at Robert Morris | ",
 "Upcoming Nov 21, 2:00 PM Mercyhurst vs Robert Morris | ",
 "Upcoming Nov 27, 6:00 PM Mercyhurst vs RIT | ",
 "Upcoming Nov 28, 1:00 PM Mercyhurst vs RIT | ",
 "Upcoming Dec 4, 6:00 PM Mercyhurst vs Lindenwood | ",
 "Upcoming Dec 5, 1:00 PM Mercyhurst vs Lindenwood | ",
 "Upcoming Jan 1, 6:00 PM Mercyhurst vs Colgate | ",
 "Upcoming Jan 2, 1:00 PM Mercyhurst vs Colgate | ",
 "Upcoming Jan 8 Mercyhurst at Syracuse | ",
 "Upcoming Jan 9 Mercyhurst at Syracuse | ",
 "Upcoming Jan 22 Mercyhurst at Penn State | ",
 "Upcoming Jan 23 Mercyhurst at Penn State | ",
 "Upcoming Jan 29, 6:00 PM Mercyhurst vs Robert Morris | ",
 "Upcoming Jan 30, 2:00 PM Mercyhurst at Robert Morris | ",
 "Upcoming Feb 5, 6:00 PM Mercyhurst vs Delaware | ",
 "Upcoming Feb 6, 1:00 PM Mercyhurst vs Delaware | ",
 "Upcoming Feb 12, 3:00 PM Mercyhurst at RIT | ",
 "Upcoming Feb 13, 2:00 PM Mercyhurst at RIT | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Mercyhurst vs Challenge on the Canal | ",
 "Upcoming Nov 1 Women's · Mercyhurst vs Princeton Chase | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24 Men's Lightweight · Mercyhurst vs Challenge on the Canal | ",
 "Upcoming Nov 1 Men's Lightweight · Mercyhurst vs Princeton Chase | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Mercyhurst vs Oakland | L, 0-3",
 "Final Aug 16 Women's · Mercyhurst vs Buffalo | L, 0-2",
 "Final Aug 23 Women's · Mercyhurst at Toledo | L, 2-6",
 "Final Aug 27 Women's · Mercyhurst at Robert Morris | W, 1-0",
 "Final Aug 30 Women's · Mercyhurst at Ohio | L, 0-6",
 "Final Sep 3 Women's · Mercyhurst at Morehead State | L, 1-2",
 "Final Sep 6 Women's · Mercyhurst at Louisville | L, 1-3",
 "Final Sep 10 Women's · Mercyhurst vs Akron | L, 0-4",
 "Final Sep 17 Women's · Mercyhurst vs Chicago State | W, 3-1",
 "Final Sep 20 Women's · Mercyhurst vs LIU | L, 1-2",
 "Final Sep 24 Women's · Mercyhurst at FDU | L, 1-4",
 "Final Sep 27 Women's · Mercyhurst vs New Haven | L, 0-1",
 "Final Oct 4 Women's · Mercyhurst at Le Moyne | T, 2-2",
 "Final Oct 11 Women's · Mercyhurst vs Central Connecticut | L, 0-6",
 "Final Oct 18 Women's · Mercyhurst at Stonehill | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Women's · Mercyhurst at Delaware State | ",
 "Upcoming Oct 29, 1:00 PM Women's · Mercyhurst vs Wagner | ",
 "Upcoming Nov 8, 1:00 PM Women's · Mercyhurst at Howard | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Mercyhurst at Penn State | L, 2-3",
 "Final Aug 23 Men's · Mercyhurst vs Drexel | L, 0-2",
 "Final Aug 28 Men's · Mercyhurst at Cleveland State | W, 2-1",
 "Final Sep 1 Men's · Mercyhurst vs Detroit Mercy | T, 2-2",
 "Final Sep 5 Men's · Mercyhurst vs Canisius | W, 3-1",
 "Final Sep 9 Men's · Mercyhurst vs Niagara | T, 0-0",
 "Final Sep 14 Men's · Mercyhurst at Robert Morris | W, 1-0",
 "Final Sep 19 Men's · Mercyhurst vs Bowling Green | T, 0-0",
 "Final Oct 1 Men's · Mercyhurst vs LIU | L, 0-2",
 "Final Oct 4 Men's · Mercyhurst at Howard | T, 1-1",
 "Final Oct 11 Men's · Mercyhurst at Central Connecticut | T, 0-0",
 "Final Oct 15 Men's · Mercyhurst at FDU | T, 1-1",
 "Final Oct 18 Men's · Mercyhurst vs New Haven | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Men's · Mercyhurst vs Le Moyne | ",
 "Upcoming Nov 1, 1:00 PM Men's · Mercyhurst at Stonehill | ",
 "Upcoming Nov 8, 1:00 PM Men's · Mercyhurst vs Chicago State | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 5 Women's · Mercyhurst at Allegheny Invitational | Completed",
 "Final Sep 25 Women's · Mercyhurst at NEC Tournament | Completed",
 "Final Oct 15 Women's · Mercyhurst at ITA Championship | Completed",
 "Today Oct 23 Women's · Mercyhurst at Cleveland State Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 12 Men's · Mercyhurst at YSU Invitational | Completed",
 "Final Sep 18 Men's · Mercyhurst at UNC Wilmington | Completed",
 "Final Sep 25 Men's · Mercyhurst at NEC Tournament | Completed",
 "Final Oct 15 Men's · Mercyhurst at ITA Championship | Completed",
 "Upcoming Oct 30 Men's · Mercyhurst at Cleveland State Invite | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Mercyhurst at Youngstown State | L, 0-3",
 "Final Aug 28 Mercyhurst vs Canisius | W, 3-2",
 "Final Aug 29 Mercyhurst vs Duquesne | L, 0-3",
 "Final Sep 4 Mercyhurst vs Morehead State | L, 0-3",
 "Final Sep 4 Mercyhurst vs Siena | W, 3-2",
 "Final Sep 5 Mercyhurst vs Cleveland State | L, 1-3",
 "Final Sep 11 Mercyhurst vs Columbia | L, 1-3",
 "Final Sep 11 Mercyhurst vs Kent State | L, 2-3",
 "Final Sep 12 Mercyhurst vs Niagara | W, 3-0",
 "Final Sep 18 Mercyhurst vs UNC Asheville | L, 1-3",
 "Final Sep 18 Mercyhurst vs Morgan State | W, 3-0",
 "Final Sep 19 Mercyhurst at Ohio | L, 1-3",
 "Final Oct 2 Mercyhurst at FDU | L, 0-3",
 "Final Oct 3 Mercyhurst at FDU | L, 1-3",
 "Final Oct 9 Mercyhurst at Stonehill | L, 2-3",
 "Final Oct 10 Mercyhurst at Stonehill | W, 3-1",
 "Final Oct 16 Mercyhurst vs Le Moyne | W, 3-0",
 "Final Oct 17 Mercyhurst vs Le Moyne | W, 3-1",
 "Today Oct 23, 6:00 PM Mercyhurst vs Central Connecticut | ",
 "Upcoming Oct 24, 1:00 PM Mercyhurst vs Central Connecticut | ",
 "Upcoming Oct 29 Mercyhurst at New Haven | ",
 "Upcoming Oct 30, 1:00 PM Mercyhurst at New Haven | ",
 "Upcoming Nov 6, 6:00 PM Mercyhurst at Chicago State | ",
 "Upcoming Nov 7, 1:00 PM Mercyhurst at Chicago State | ",
 "Upcoming Nov 13, 6:00 PM Mercyhurst vs LIU | ",
 "Upcoming Nov 14, 1:00 PM Mercyhurst vs LIU | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · Mercyhurst at UC San Diego | L, 4-21",
 "Final Aug 29 Men's · Mercyhurst vs Long Beach State | L, 4-24",
 "Final Aug 29 Men's · Mercyhurst vs La Verne | L, 17-20",
 "Final Aug 30 Men's · Mercyhurst vs UC Santa Barbara | L, 6-27",
 "Final Aug 30 Men's · Mercyhurst vs St. Mary's | L, 9-26",
 "Final Sep 12 Men's · Mercyhurst at Johns Hopkins | L, 6-21",
 "Final Sep 12 Men's · Mercyhurst at Salem | L, 10-23",
 "Final Sep 13 Men's · Mercyhurst at Washington and Jefferson | W, 16-9",
 "Final Sep 19 Men's · Mercyhurst at MIT | L, 11-24",
 "Final Sep 19 Men's · Mercyhurst at Fordham | L, 3-26",
 "Final Sep 20 Men's · Mercyhurst at Wagner | L, 15-17",
 "Final Sep 25 Men's · Mercyhurst vs Gannon | L, 16-23",
 "Final Sep 26 Men's · Mercyhurst vs Penn State Behrend | W, 18-16",
 "Final Sep 26 Men's · Mercyhurst vs Bucknell | L, 20-9",
 "Final Sep 27 Men's · Mercyhurst vs Mount St. Mary's | L, 8-24",
 "Final Oct 3 Men's · Mercyhurst vs Navy | L, 4-20",
 "Final Oct 4 Men's · Mercyhurst vs George Washington | L, 15-17",
 "Final Oct 10 Men's · Mercyhurst at Bucknell | L, 6-20",
 "Final Oct 17 Men's · Mercyhurst at Fordham | L, 4-26",
 "Final Oct 18 Men's · Mercyhurst at Wagner | L, 10-19",
 "Upcoming Oct 24, 1:00 PM Men's · Mercyhurst at Washington and Jefferson | ",
 "Upcoming Oct 24, 5:40 PM Men's · Mercyhurst at McKendree | ",
 "Upcoming Oct 25, 9:20 AM Men's · Mercyhurst at Gannon | ",
 "Upcoming Oct 25, 12:00 PM Men's · Mercyhurst at Salem | ",
 "Upcoming Oct 31, 3:00 PM Men's · Mercyhurst at Mount St. Mary's | ",
 "Upcoming Nov 1, 10:00 AM Men's · Mercyhurst at Navy | ",
 "Upcoming Nov 1, 3:00 PM Men's · Mercyhurst at George Washington | ",
 "Upcoming Nov 7 Men's · Mercyhurst vs McKendree | ",
 "Upcoming Nov 7 Men's · Mercyhurst vs Gannon | ",
 "Upcoming Nov 8 Men's · Mercyhurst vs Penn State Behrend | ",
 "Upcoming Nov 8 Men's · Mercyhurst vs Salem | ",
 "Upcoming Nov 20 Men's · Mercyhurst at MAWPC Championship | ",
 "Upcoming Nov 22 Men's · Mercyhurst at MAWPC Championship (Game 1) | ",
 "Upcoming Nov 22 Men's · Mercyhurst at MAWPC Championship (Game 2) | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Men's · Mercyhurst at Hurst Invitational | ",
 "Upcoming Nov 7 Men's · Mercyhurst at West Virginia | ",
 "Upcoming Nov 8, 6:00 PM Men's · Mercyhurst vs Penn State Behrend | ",
 "Upcoming Nov 14 Men's · Mercyhurst at Bob Del Rosa Open | ",
 "Upcoming Nov 21 Men's · Mercyhurst at LIU | ",
 "Upcoming Nov 22 Men's · Mercyhurst at Sacred Heart | ",
 "Upcoming Dec 11 Men's · Mercyhurst at Davidson | ",
 "Upcoming Dec 12 Men's · Mercyhurst at Ferrum | ",
 "Upcoming Dec 20 Men's · Mercyhurst at Clarion | ",
 "Upcoming Dec 20 Men's · Mercyhurst at Northwestern | ",
 "Upcoming Jan 9 Men's · Mercyhurst at Bobby Kauffman Open | ",
 "Upcoming Jan 15, 7:00 PM Men's · Mercyhurst vs Edinboro | ",
 "Upcoming Jan 23 Men's · Mercyhurst at Jamestown Open | ",
 "Upcoming Jan 29, 6:00 PM Men's · Mercyhurst vs Bethany | ",
 "Upcoming Feb 5, 6:00 PM Men's · Mercyhurst vs Point Park | ",
 "Upcoming Feb 14 Men's · Mercyhurst at Virginia Military Institute | ",
 "Upcoming Feb 14 Men's · Mercyhurst at Gardner-Webb | ",
 "Upcoming Feb 21, 12:00 PM Men's · Mercyhurst vs Kent State | ",
 "Upcoming Mar 6 Men's · Mercyhurst at NCWA Mid-East Conference Championships | ",
 "Upcoming Mar 18 Men's · Mercyhurst at NCWA Nationals | "
]);
  const v_womenswrestling=parse("Wrestling","womens-wrestling");
  assert.deepEqual(v_womenswrestling.map(line),[
 "Upcoming Nov 1, 11:00 AM Women's · Mercyhurst at Tiffin Open | ",
 "Upcoming Nov 14, 10:00 AM Women's · Mercyhurst at Adrian College Duals | ",
 "Upcoming Nov 22, 11:00 AM Women's · Mercyhurst at John Carroll Duals | ",
 "Upcoming Dec 5, 11:00 AM Women's · Mercyhurst at Gannon Duals | ",
 "Upcoming Dec 13, 7:00 AM Women's · Mercyhurst at North Central Invite | ",
 "Upcoming Dec 18, 6:00 PM Women's · Mercyhurst vs Edinboro | ",
 "Upcoming Jan 8 Women's · Mercyhurst at National Duals | ",
 "Upcoming Jan 15, 6:00 PM Women's · Mercyhurst vs Bethany | ",
 "Upcoming Jan 23, 11:00 AM Women's · Mercyhurst at Sacred Heart | ",
 "Upcoming Jan 29, 12:00 PM Women's · Mercyhurst at Warrior Open | ",
 "Upcoming Feb 6, 10:00 AM Women's · Mercyhurst at Bobcat Open | ",
 "Upcoming Feb 19 Women's · Mercyhurst at NCAA Regionals | ",
 "Upcoming Mar 5 Women's · Mercyhurst at NCAA Nationals | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_bowling,"Bowling bowling");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
  ownRecapsOnly(v_womenswrestling,"Wrestling womens-wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Mercyhurst module checks passed");
