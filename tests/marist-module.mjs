import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {maristSchool} from '../src/schools/marist.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='marist');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,maristHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/marist-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goredfoxes.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['marist'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',maristSchool.scheduleUrls],['roster',maristSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('marist|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goredfoxes.com',`${key} must stay on goredfoxes.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goredfoxes.com/sports/baseball/schedule"],"roster":["https://goredfoxes.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goredfoxes.com/sports/mens-basketball/schedule","https://goredfoxes.com/sports/womens-basketball/schedule"],"roster":["https://goredfoxes.com/sports/mens-basketball/roster","https://goredfoxes.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goredfoxes.com/sports/womens-cross-country/schedule","https://goredfoxes.com/sports/mens-cross-country/schedule"],"roster":["https://goredfoxes.com/sports/womens-cross-country/roster","https://goredfoxes.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goredfoxes.com/sports/football/schedule"],"roster":["https://goredfoxes.com/sports/football/roster"],"combined":false},"Lacrosse":{"schedule":["https://goredfoxes.com/sports/womens-lacrosse/schedule","https://goredfoxes.com/sports/mens-lacrosse/schedule"],"roster":["https://goredfoxes.com/sports/womens-lacrosse/roster","https://goredfoxes.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goredfoxes.com/sports/womens-rowing/schedule","https://goredfoxes.com/sports/mens-rowing/schedule"],"roster":["https://goredfoxes.com/sports/womens-rowing/roster","https://goredfoxes.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://goredfoxes.com/sports/womens-soccer/schedule","https://goredfoxes.com/sports/mens-soccer/schedule"],"roster":["https://goredfoxes.com/sports/womens-soccer/roster","https://goredfoxes.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goredfoxes.com/sports/softball/schedule"],"roster":["https://goredfoxes.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goredfoxes.com/sports/womens-swimming-and-diving/schedule","https://goredfoxes.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goredfoxes.com/sports/womens-swimming-and-diving/roster","https://goredfoxes.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goredfoxes.com/sports/womens-tennis/schedule","https://goredfoxes.com/sports/mens-tennis/schedule"],"roster":["https://goredfoxes.com/sports/womens-tennis/roster","https://goredfoxes.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goredfoxes.com/sports/womens-track-and-field/schedule","https://goredfoxes.com/sports/mens-track-and-field/schedule"],"roster":["https://goredfoxes.com/sports/womens-track-and-field/roster","https://goredfoxes.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goredfoxes.com/sports/womens-volleyball/schedule"],"roster":["https://goredfoxes.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://goredfoxes.com/sports/womens-water-polo/schedule"],"roster":["https://goredfoxes.com/sports/womens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'marist|"+sport+"':"),`${sport} routes must live in the Marist module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://goredfoxes.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.maristHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=marist)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Marist vs Dartmouth | ",
 "Upcoming Nov 5, 7:00 PM Men's · Marist vs UMBC | ",
 "Upcoming Nov 8, 1:00 PM Men's · Marist at UMass Lowell | ",
 "Upcoming Nov 13, 7:00 PM Men's · Marist at Lehigh | ",
 "Upcoming Nov 17, 6:00 PM Men's · Marist at Army West Point | ",
 "Upcoming Nov 24, 7:00 PM Men's · Marist vs Bryant | ",
 "Upcoming Nov 28, 2:00 PM Men's · Marist at George Mason | ",
 "Upcoming Dec 4, 7:00 PM Men's · Marist vs Sacred Heart | ",
 "Upcoming Dec 6, 1:00 PM Men's · Marist at Iona | ",
 "Upcoming Dec 12, 7:00 PM Men's · Marist vs Oneonta | ",
 "Upcoming Dec 20, 4:00 PM Men's · Marist at Tennessee | ",
 "Upcoming Dec 22, 7:00 PM Men's · Marist at Cincinnati | ",
 "Upcoming Dec 29, 7:00 PM Men's · Marist at Mount St. Mary's | ",
 "Upcoming Jan 1, 2:00 PM Men's · Marist vs Canisius | ",
 "Upcoming Jan 3, 2:00 PM Men's · Marist vs Niagara | ",
 "Upcoming Jan 8, 7:00 PM Men's · Marist at Merrimack | ",
 "Upcoming Jan 10, 2:00 PM Men's · Marist at Quinnipiac | ",
 "Upcoming Jan 13, 7:00 PM Men's · Marist vs Manhattan | ",
 "Upcoming Jan 18, 2:00 PM Men's · Marist at Rider | ",
 "Upcoming Jan 22, 7:00 PM Men's · Marist vs Merrimack | ",
 "Upcoming Jan 24, 7:00 PM Men's · Marist at Sacred Heart | ",
 "Upcoming Jan 29, 7:00 PM Men's · Marist vs Iona | ",
 "Upcoming Jan 31, 2:00 PM Men's · Marist vs Siena | ",
 "Upcoming Feb 5, 6:30 PM Men's · Marist at Niagara | ",
 "Upcoming Feb 7, 1:00 PM Men's · Marist at Canisius | ",
 "Upcoming Feb 11, 7:00 PM Men's · Marist vs Fairfield | ",
 "Upcoming Feb 13, 2:00 PM Men's · Marist at Saint Peter's | ",
 "Upcoming Feb 19, 7:00 PM Men's · Marist vs Mount St. Mary's | ",
 "Upcoming Feb 21, 2:00 PM Men's · Marist vs Rider | ",
 "Upcoming Feb 28, 2:00 PM Men's · Marist at Siena | ",
 "Upcoming Mar 4 Men's · Marist at Metro Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Marist at Drexel | ",
 "Upcoming Nov 5, 6:00 PM Women's · Marist at Bryant | ",
 "Upcoming Nov 8, 5:00 PM Women's · Marist vs NJIT | ",
 "Upcoming Nov 11, 6:00 PM Women's · Marist at Duquesne | ",
 "Upcoming Nov 15, 2:00 PM Women's · Marist vs Lafayette | ",
 "Upcoming Nov 17, 6:00 PM Women's · Marist at Monmouth | ",
 "Upcoming Nov 23, 7:00 PM Women's · Marist vs Binghamton | ",
 "Upcoming Nov 28, 7:00 PM Women's · Marist vs Yale | ",
 "Upcoming Dec 2, 7:00 PM Women's · Marist at Brown | ",
 "Upcoming Dec 5, 5:00 PM Women's · Marist vs St. Bonaventure | ",
 "Upcoming Dec 12, 12:00 PM Women's · Marist at Boston University | ",
 "Upcoming Dec 19, 2:00 PM Women's · Marist at Sacred Heart | ",
 "Upcoming Dec 21, 7:00 PM Women's · Marist vs Iona | ",
 "Upcoming Dec 29, 2:00 PM Women's · Marist vs Mount St. Mary's | ",
 "Upcoming Jan 1, 1:00 PM Women's · Marist at Canisius | ",
 "Upcoming Jan 3, 12:00 PM Women's · Marist at Niagara | ",
 "Upcoming Jan 7, 11:00 AM Women's · Marist vs Merrimack | ",
 "Upcoming Jan 9, 7:00 PM Women's · Marist vs Quinnipiac | ",
 "Upcoming Jan 13, 7:00 PM Women's · Marist at Manhattan | ",
 "Upcoming Jan 18, 2:00 PM Women's · Marist vs Rider | ",
 "Upcoming Jan 21, 7:00 PM Women's · Marist at Merrimack | ",
 "Upcoming Jan 23, 7:00 PM Women's · Marist vs Sacred Heart | ",
 "Upcoming Jan 28, 6:00 PM Women's · Marist at Iona | ",
 "Upcoming Jan 30, 2:00 PM Women's · Marist at Siena | ",
 "Upcoming Feb 4, 7:00 PM Women's · Marist vs Niagara | ",
 "Upcoming Feb 6, 7:00 PM Women's · Marist vs Canisius | ",
 "Upcoming Feb 11, 7:00 PM Women's · Marist at Fairfield | ",
 "Upcoming Feb 13, 7:00 PM Women's · Marist vs Saint Peter's | ",
 "Upcoming Feb 18, 7:00 PM Women's · Marist at Mount St. Mary's | ",
 "Upcoming Feb 20, 2:00 PM Women's · Marist at Rider | ",
 "Upcoming Feb 27, 7:00 PM Women's · Marist vs Siena | ",
 "Upcoming Mar 4 Women's · Marist at Metro Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Marist at Marist Season Opener | 1st of 4",
 "Final Sep 19 Women's · Marist at Jasper Invitational | 3rd of 12",
 "Final Oct 17 Women's · Marist at ECAC Championships | 14th of 25",
 "Upcoming Oct 31 Women's · Marist at Metro Conference | ",
 "Upcoming Nov 13 Women's · Marist at NCAA Northeast Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Marist at Marist Season Opener | 4th of 4",
 "Final Sep 19 Men's · Marist at Jasper Invitational | 10th of 12",
 "Final Oct 10 Men's · Marist at NJIT Highlander Invitational | 5th of 22",
 "Final Oct 17 Men's · Marist at IC4A Championships | 10th of 25",
 "Upcoming Oct 31 Men's · Marist at Metro Championships | ",
 "Upcoming Nov 13 Men's · Marist at NCAA Northeast Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Marist at New Haven | L, 21-22",
 "Final Sep 4 Marist vs Franklin Pierce | W, 27-18",
 "Final Sep 12 Marist at Lafayette | L, 9-13",
 "Final Sep 26 Marist vs Presbyterian | W, 42-7",
 "Final Oct 3 Marist at Stetson | W, 28-14",
 "Final Oct 9 Marist vs Columbia | L, 28-41",
 "Final Oct 17 Marist at Drake | W, 27-22",
 "Upcoming Oct 24 Marist vs St. Thomas | ",
 "Upcoming Oct 31, 4:00 PM Marist at San Diego | ",
 "Upcoming Nov 7 Marist vs Morehead State | ",
 "Upcoming Nov 14 Marist vs Butler | ",
 "Upcoming Nov 21, 1:00 PM Marist at Davidson | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Marist at Head of the Fish Regatta | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24, 9:00 AM Men's · Marist at Head of the Fish Regatta | ",
 "Upcoming Nov 1, 9:00 AM Men's · Marist vs Princeton 3-Mile Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Marist at Binghamton | L, 0-2",
 "Final Aug 20 Women's · Marist vs Colgate | L, 0-1",
 "Final Aug 23 Women's · Marist vs Fordham | L, 1-2",
 "Final Aug 27 Women's · Marist vs Holy Cross | L, 0-2",
 "Final Aug 30 Women's · Marist at Navy | L, 1-3",
 "Final Sep 5 Women's · Marist vs Merrimack | W, 1-0",
 "Final Sep 12 Women's · Marist at Sacred Heart | W, 3-2",
 "Final Sep 19 Women's · Marist at Quinnipiac | L, 1-2",
 "Final Sep 23 Women's · Marist vs Manhattan | T, 0-0",
 "Final Sep 26 Women's · Marist vs Niagara | W, 3-0",
 "Final Oct 3 Women's · Marist at Mount St. Mary's | W, 1-0",
 "Final Oct 7 Women's · Marist vs Fairfield | L, 1-5",
 "Final Oct 10 Women's · Marist at Canisius | W, 2-0",
 "Final Oct 17 Women's · Marist vs Saint Peter's | L, 0-1",
 "Final Oct 21 Women's · Marist at Iona | W, 2-1",
 "Upcoming Oct 24, 7:00 PM Women's · Marist vs Rider | ",
 "Upcoming Nov 4, 2:00 PM Women's · Marist at Siena | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Marist vs Stony Brook | T, 2-2",
 "Final Aug 23 Men's · Marist vs Air Force | T, 0-0",
 "Final Aug 29 Men's · Marist vs Cornell | L, 0-3",
 "Final Sep 4 Men's · Marist at Saint Mary's (CA) | W, 4-1",
 "Final Sep 7 Men's · Marist at San Francisco | W, 4-1",
 "Final Sep 15 Men's · Marist vs UAlbany | T, 2-2",
 "Final Sep 19 Men's · Marist vs Mount St. Mary's (Md.) | L, 3-4",
 "Final Sep 30 Men's · Marist at Sacred Heart | W, 1-0",
 "Final Oct 3 Men's · Marist vs Iona | T, 1-1",
 "Final Oct 10 Men's · Marist at Canisius | W, 3-1",
 "Final Oct 14 Men's · Marist at Fairfield | L, 0-1",
 "Final Oct 17 Men's · Marist vs Merrimack College | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Men's · Marist at Rider | ",
 "Upcoming Oct 28, 11:00 AM Men's · Marist vs Saint Peter's | ",
 "Upcoming Oct 31, 5:00 PM Men's · Marist at Manhattan | ",
 "Upcoming Nov 4, 6:00 PM Men's · Marist vs Siena | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 24 Women's · Marist at Army | L, 545-1003",
 "Final Oct 3 Women's · Marist vs Red/White Meet | Completed",
 "Final Oct 22 Women's · Marist at Rider | W, 198-102",
 "Upcoming Oct 31, 1:00 PM Women's · Marist vs Fairfield | ",
 "Upcoming Nov 6, 5:00 PM Women's · Marist vs Colgate | ",
 "Upcoming Nov 18, 5:00 PM Women's · Marist at Patriot Invitational | ",
 "Upcoming Dec 13, 8:00 AM Women's · Marist at CSCAA Open Water Invitate | ",
 "Upcoming Jan 16, 1:00 PM Women's · Marist vs Bryant | ",
 "Upcoming Jan 23, 1:00 PM Women's · Marist at Binghamton | ",
 "Upcoming Jan 30 Women's · Marist vs Iona | ",
 "Upcoming Feb 17 Women's · Marist at Metro Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 24 Men's · Marist at Army | L, 705-1080",
 "Final Oct 3 Men's · Marist vs Red/White Meet | Completed",
 "Final Oct 22 Men's · Marist at Rider | L, 135-159",
 "Upcoming Oct 31, 1:00 PM Men's · Marist vs Fairfield | ",
 "Upcoming Nov 6, 5:00 PM Men's · Marist vs Colgate | ",
 "Upcoming Nov 18, 5:00 PM Men's · Marist at Patriot Invitational | ",
 "Upcoming Dec 13, 8:00 AM Men's · Marist at CSCAA Open Water Invitate | ",
 "Upcoming Jan 16, 1:00 PM Men's · Marist vs Bryant | ",
 "Upcoming Jan 23, 1:00 PM Men's · Marist at Binghamton | ",
 "Upcoming Jan 30 Men's · Marist vs Iona | ",
 "Upcoming Feb 17 Men's · Marist at Metro Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Marist at Lehigh Invite | Completed",
 "Final Sep 19 Women's · Marist at Army Invite | Completed",
 "Final Sep 25 Women's · Marist at West Point Invite | Completed",
 "Final Oct 2 Women's · Marist at Metro Masters | Completed",
 "Final Oct 8 Women's · Marist at ITA New England Regionals | Completed",
 "Upcoming Oct 22, 3:00 PM Women's · Marist vs Monmouth | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 10 Men's · Marist vs Union College | W, 7-0",
 "Final Sep 19 Men's · Marist at Army Invite | Completed",
 "Final Sep 25 Men's · Marist at Hofstra Invitational | Completed",
 "Final Oct 2 Men's · Marist at Metro Masters | Completed",
 "Final Oct 8 Men's · Marist at ITA New England Regionals | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Marist at Lafayette College | L, 1-3",
 "Final Aug 29 Marist vs Delaware | L, 0-3",
 "Final Aug 30 Marist vs Montana State | L, 2-3",
 "Final Sep 3 Marist vs Idaho | L, 2-3",
 "Final Sep 4 Marist vs SIUE | W, 3-2",
 "Final Sep 5 Marist at Denver | L, 1-3",
 "Final Sep 8 Marist at Holy Cross | L, 1-3",
 "Final Sep 11 Marist at Bryant | W, 3-1",
 "Final Sep 11 Marist vs Fordham | W, 3-1",
 "Final Sep 12 Marist at Bryant | W, 3-1",
 "Final Sep 18 Marist at Oakland | L, 2-3",
 "Final Sep 19 Marist vs Illinois State | L, 0-3",
 "Final Sep 23 Marist vs New Haven | W, 3-0",
 "Final Sep 25 Marist at Rider | W, 3-0",
 "Final Sep 26 Marist at Saint Peter's | W, 3-0",
 "Final Sep 29 Marist at Siena College | L, 1-3",
 "Final Oct 2 Marist vs Iona | W, 3-0",
 "Final Oct 3 Marist vs Manhattan | W, 3-1",
 "Final Oct 9 Marist at Merrimack College | L, 2-3",
 "Final Oct 10 Marist at Quinnipiac | L, 2-3",
 "Final Oct 16 Marist vs Fairfield | L, 0-3",
 "Final Oct 17 Marist vs Sacred Heart | W, 3-1",
 "Today Oct 23, 11:00 AM Marist vs Canisius | ",
 "Upcoming Oct 24, 6:00 PM Marist vs Niagara | ",
 "Upcoming Oct 27, 7:00 PM Marist vs Siena College | ",
 "Upcoming Oct 30, 6:00 PM Marist at Manhattan | ",
 "Upcoming Oct 31, 2:00 PM Marist at Iona | ",
 "Upcoming Nov 6, 6:00 PM Marist at Niagara | ",
 "Upcoming Nov 7, 2:00 PM Marist at Canisius | ",
 "Upcoming Nov 13, 7:00 PM Marist vs Quinnipiac | ",
 "Upcoming Nov 14, 6:00 PM Marist vs Merrimack College | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Marist module checks passed");
