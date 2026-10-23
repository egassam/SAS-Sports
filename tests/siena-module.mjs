import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sienaSchool} from '../src/schools/siena.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='siena');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,sienaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/siena-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit sienasaints.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['siena'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',sienaSchool.scheduleUrls],['roster',sienaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('siena|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'sienasaints.com',`${key} must stay on sienasaints.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://sienasaints.com/sports/acrobatics-tumbling/schedule"],"roster":["https://sienasaints.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://sienasaints.com/sports/baseball/schedule"],"roster":["https://sienasaints.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://sienasaints.com/sports/mens-basketball/schedule","https://sienasaints.com/sports/womens-basketball/schedule"],"roster":["https://sienasaints.com/sports/mens-basketball/roster","https://sienasaints.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://sienasaints.com/sports/cross-country/schedule"],"roster":["https://sienasaints.com/sports/cross-country/roster"],"combined":false},"Golf":{"schedule":["https://sienasaints.com/sports/womens-golf/schedule","https://sienasaints.com/sports/mens-golf/schedule"],"roster":["https://sienasaints.com/sports/womens-golf/roster","https://sienasaints.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://sienasaints.com/sports/womens-lacrosse/schedule","https://sienasaints.com/sports/mens-lacrosse/schedule"],"roster":["https://sienasaints.com/sports/womens-lacrosse/roster","https://sienasaints.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://sienasaints.com/sports/womens-soccer/schedule","https://sienasaints.com/sports/mens-soccer/schedule"],"roster":["https://sienasaints.com/sports/womens-soccer/roster","https://sienasaints.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://sienasaints.com/sports/softball/schedule"],"roster":["https://sienasaints.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://sienasaints.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://sienasaints.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://sienasaints.com/sports/womens-tennis/schedule","https://sienasaints.com/sports/mens-tennis/schedule"],"roster":["https://sienasaints.com/sports/womens-tennis/roster","https://sienasaints.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://sienasaints.com/sports/womens-volleyball/schedule"],"roster":["https://sienasaints.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://sienasaints.com/sports/womens-water-polo/schedule"],"roster":["https://sienasaints.com/sports/womens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'siena|"+sport+"':"),`${sport} routes must live in the Siena module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://sienasaints.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sienaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=siena)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Siena vs Syracuse (Exhibition) | L, 76-81",
 "Upcoming Nov 2, 8:00 PM Men's · Siena at Bryant | ",
 "Upcoming Nov 8, 1:00 PM Men's · Siena vs Princeton | ",
 "Upcoming Nov 10, 7:00 PM Men's · Siena at Dayton | ",
 "Upcoming Nov 14, 7:00 PM Men's · Siena vs Brown | ",
 "Upcoming Nov 18, 7:00 PM Men's · Siena at St. John's | ",
 "Upcoming Nov 21, 11:00 AM Men's · Siena at Bucknell | ",
 "Upcoming Nov 24, 7:00 PM Men's · Siena vs Vermont | ",
 "Upcoming Nov 28, 12:00 PM Men's · Siena at Seton Hall | ",
 "Upcoming Dec 4, 7:00 PM Men's · Siena vs Merrimack | ",
 "Upcoming Dec 6, 2:00 PM Men's · Siena at Quinnipiac | ",
 "Upcoming Dec 9, 7:00 PM Men's · Siena vs St. Bonaventure | ",
 "Upcoming Dec 12, 7:00 PM Men's · Siena at UAlbany | ",
 "Upcoming Dec 15 Men's · Siena at Monmouth | ",
 "Upcoming Dec 20, 12:00 PM Men's · Siena at Colgate | ",
 "Upcoming Dec 29, 7:00 PM Men's · Siena at Fairfield | ",
 "Upcoming Jan 1, 3:00 PM Men's · Siena vs Iona | ",
 "Upcoming Jan 8, 7:00 PM Men's · Siena vs Sacred Heart | ",
 "Upcoming Jan 10, 2:00 PM Men's · Siena at Mount St. Mary's | ",
 "Upcoming Jan 13, 7:00 PM Men's · Siena vs Fairfield | ",
 "Upcoming Jan 16, 2:00 PM Men's · Siena at Saint Peter's | ",
 "Upcoming Jan 18, 2:00 PM Men's · Siena vs Manhattan | ",
 "Upcoming Jan 22, 6:30 PM Men's · Siena at Niagara | ",
 "Upcoming Jan 29, 7:00 PM Men's · Siena vs Quinnipiac | ",
 "Upcoming Jan 31, 2:00 PM Men's · Siena at Marist | ",
 "Upcoming Feb 5, 7:00 PM Men's · Siena vs Mount St. Mary's | ",
 "Upcoming Feb 7, 1:00 PM Men's · Siena at Iona | ",
 "Upcoming Feb 11, 7:00 PM Men's · Siena at Merrimack | ",
 "Upcoming Feb 13, 4:00 PM Men's · Siena vs Canisius | ",
 "Upcoming Feb 19, 7:00 PM Men's · Siena vs Rider | ",
 "Upcoming Feb 21, 12:00 PM Men's · Siena at Sacred Heart | ",
 "Upcoming Feb 26, 7:00 PM Men's · Siena at Manhattan | ",
 "Upcoming Feb 28, 2:00 PM Men's · Siena vs Marist | ",
 "Upcoming Mar 4 Men's · Siena vs Metro First Round | ",
 "Upcoming Mar 5 Men's · Siena at Metro Conference Championships | ",
 "Upcoming Mar 7 Men's · Siena at Metro Semifinals | ",
 "Upcoming Mar 9 Men's · Siena at Metro Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Siena vs Brown | ",
 "Upcoming Nov 5, 6:00 PM Women's · Siena at Maine | ",
 "Upcoming Nov 8, 4:00 PM Women's · Siena vs Binghamton | ",
 "Upcoming Nov 11, 6:00 PM Women's · Siena at Syracuse | ",
 "Upcoming Nov 15, 1:00 PM Women's · Siena at New Haven | ",
 "Upcoming Nov 19, 6:00 PM Women's · Siena vs Army West Point | ",
 "Upcoming Nov 21, 5:00 PM Women's · Siena at Mercyhurst | ",
 "Upcoming Nov 24, 2:00 PM Women's · Siena at Colgate | ",
 "Upcoming Nov 30, 6:00 PM Women's · Siena vs Cornell | ",
 "Upcoming Dec 2, 6:30 PM Women's · Siena at Dartmouth | ",
 "Upcoming Dec 5, 2:00 PM Women's · Siena vs UAlbany | ",
 "Upcoming Dec 10, 6:00 PM Women's · Siena vs Wagner | ",
 "Upcoming Dec 19, 6:00 PM Women's · Siena at Merrimack | ",
 "Upcoming Dec 21, 11:00 AM Women's · Siena vs Quinnipiac | ",
 "Upcoming Dec 29, 6:00 PM Women's · Siena vs Fairfield | ",
 "Upcoming Jan 1, 1:00 PM Women's · Siena at Iona | ",
 "Upcoming Jan 7, 7:00 PM Women's · Siena at Sacred Heart | ",
 "Upcoming Jan 9, 2:00 PM Women's · Siena vs Mount St. Mary's | ",
 "Upcoming Jan 13, 11:00 AM Women's · Siena at Fairfield | ",
 "Upcoming Jan 16, 2:00 PM Women's · Siena vs Saint Peter's | ",
 "Upcoming Jan 18, 6:00 PM Women's · Siena at Manhattan | ",
 "Upcoming Jan 21, 6:00 PM Women's · Siena vs Niagara | ",
 "Upcoming Jan 28, 6:30 PM Women's · Siena at Quinnipiac | ",
 "Upcoming Jan 30, 2:00 PM Women's · Siena vs Marist | ",
 "Upcoming Feb 4, 11:00 AM Women's · Siena at Mount St. Mary's | ",
 "Upcoming Feb 6, 2:00 PM Women's · Siena vs Iona | ",
 "Upcoming Feb 11, 6:00 PM Women's · Siena vs Merrimack | ",
 "Upcoming Feb 13, 1:00 PM Women's · Siena at Canisius | ",
 "Upcoming Feb 18, 6:00 PM Women's · Siena at Rider | ",
 "Upcoming Feb 20, 2:00 PM Women's · Siena vs Sacred Heart | ",
 "Upcoming Feb 25, 6:00 PM Women's · Siena vs Manhattan | ",
 "Upcoming Feb 27, 7:00 PM Women's · Siena at Marist | ",
 "Upcoming Mar 4 Women's · Siena vs Metro First Round | ",
 "Upcoming Mar 5 Women's · Siena at Metro Conference Championships | ",
 "Upcoming Mar 7 Women's · Siena at Metro Semifinals | ",
 "Upcoming Mar 8 Women's · Siena at Metro Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Siena at Marist Opener | Women's team: 4th / Men's team: 2nd",
 "Final Sep 19 Siena at Jasper Invitational | Women's team: 12th / Men's team: 3rd",
 "Final Sep 26 Siena at RPI Fairgrounds Showdown | Women's team: 8th",
 "Final Oct 2 Siena at Paul Short Run | Men's team: 24th",
 "Final Oct 17 Siena at ECAC / IC4A Cross Country Championships | Women's team: 19th / Men's team: 16th",
 "Upcoming Oct 31 Siena at Metro Conference Championship | ",
 "Upcoming Nov 13 Siena at NCAA Northeast Regional Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 18 Women's · Siena at Crosstown Challenge | Match play: 0-1",
 "Final Sep 21 Women's · Siena at Red Bandana Invitational | 14th",
 "Final Sep 28 Women's · Siena at SHU Fall Classic | 8th",
 "Final Oct 11 Women's · Siena at UAlbany Doc Sauers Invitational | 10th",
 "Final Oct 19 Women's · Siena at Crusader Invitational | 6th"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Siena at Ryan T. Lee Memorial Collegiate | 8th",
 "Final Sep 27 Men's · Siena at UConn Invitational | 8th",
 "Final Oct 3 Men's · Siena at Columbia Autumn Invitational | Completed",
 "Final Oct 12 Men's · Siena at Metropolis Intercollegiate | 7th",
 "Upcoming Oct 26 Men's · Siena at Wykagyl Collegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Siena at Boston College | L, 1-7",
 "Final Aug 16 Women's · Siena vs New Hampshire | W, 1-0",
 "Final Aug 20 Women's · Siena vs UAlbany | W, 1-0",
 "Final Aug 23 Women's · Siena at Bryant | W, 1-0",
 "Final Aug 27 Women's · Siena at Binghamton | T, 0-0",
 "Final Sep 2 Women's · Siena at Le Moyne | W, 4-0",
 "Final Sep 5 Women's · Siena vs Manhattan | W, 1-0",
 "Final Sep 12 Women's · Siena at Rider | W, 6-0",
 "Final Sep 19 Women's · Siena vs Fairfield | L, 1-2",
 "Final Sep 23 Women's · Siena at Niagara | L, 0-1",
 "Final Oct 3 Women's · Siena at Sacred Heart | W, 3-2",
 "Final Oct 7 Women's · Siena vs Canisius | W, 2-0",
 "Final Oct 10 Women's · Siena at Saint Peter's | W, 3-1",
 "Final Oct 17 Women's · Siena vs Mount St. Mary's | W, 2-0",
 "Final Oct 21 Women's · Siena at Merrimack | W, 2-1",
 "Upcoming Oct 24, 1:00 PM Women's · Siena vs Iona | ",
 "Upcoming Oct 31, 12:00 PM Women's · Siena at Quinnipiac | ",
 "Upcoming Nov 4, 2:00 PM Women's · Siena vs Marist | ",
 "Upcoming Nov 8 Women's · Siena at Metro Quarterfinals | ",
 "Upcoming Nov 12 Women's · Siena at Metro Semifinals | ",
 "Upcoming Nov 15 Women's · Siena at Metro Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Siena at NJIT | W, 3-1",
 "Final Aug 23 Men's · Siena at Boston College | L, 1-3",
 "Final Aug 31 Men's · Siena vs Northeastern | T, 3-3",
 "Final Sep 3 Men's · Siena at FDU | L, 1-4",
 "Final Sep 8 Men's · Siena at UAlbany | L, 1-2",
 "Final Sep 15 Men's · Siena vs LIU | W, 3-0",
 "Final Sep 19 Men's · Siena at Fairfield | L, 1-2",
 "Final Sep 22 Men's · Siena at UConn | L, 1-3",
 "Final Sep 26 Men's · Siena vs Manhattan | T, 1-1",
 "Final Sep 30 Men's · Siena at Niagara | T, 0-0",
 "Final Oct 3 Men's · Siena vs Saint Peter's | T, 3-3",
 "Final Oct 14 Men's · Siena vs Canisius | W, 1-0",
 "Final Oct 17 Men's · Siena at Mount St. Mary's | T, 1-1",
 "Upcoming Oct 24, 3:30 PM Men's · Siena at Sacred Heart | ",
 "Upcoming Oct 28, 3:00 PM Men's · Siena vs Merrimack | ",
 "Upcoming Oct 31, 2:00 PM Men's · Siena vs Quinnipiac | ",
 "Upcoming Nov 4, 6:00 PM Men's · Siena at Marist | ",
 "Upcoming Nov 7 Men's · Siena at Metro Quarterfinals | ",
 "Upcoming Nov 11 Men's · Siena at Metro Semifinals | ",
 "Upcoming Nov 14 Men's · Siena at Metro Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Siena vs Iona | L, 134-164",
 "Final Oct 10 Women's · Siena at Rhode Island | L, 76-223",
 "Final Oct 10 Women's · Siena vs Stonehill | W, 230-66",
 "Final Oct 17 Women's · Siena at Rochester | W, 165-135",
 "Final Oct 17 Women's · Siena vs Canisius | W, 157-142",
 "Upcoming Oct 31, 11:00 AM Women's · Siena at New Hampshire | ",
 "Upcoming Oct 31, 11:00 AM Women's · Siena vs Merrimack | ",
 "Upcoming Nov 6, 4:00 PM Women's · Siena at Sacred Heart | ",
 "Upcoming Nov 6, 4:00 PM Women's · Siena vs Rider | ",
 "Upcoming Nov 14, 12:00 PM Women's · Siena vs Stony Brook | ",
 "Upcoming Dec 4 Women's · Siena at ECAC Winter Championships | ",
 "Upcoming Jan 14, 1:00 PM Women's · Siena vs Lafayette | ",
 "Upcoming Jan 16, 12:00 PM Women's · Siena vs Vermont | ",
 "Upcoming Jan 30, 12:00 PM Women's · Siena vs Saint Peter's | ",
 "Upcoming Jan 30, 12:00 PM Women's · Siena vs Stonehill | ",
 "Upcoming Feb 17 Women's · Siena at Metro Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Siena at Hofstra Invitational | Completed",
 "Final Sep 26 Women's · Siena at Colgate Invitational | No Team Scores",
 "Final Oct 2 Women's · Siena at Metro Masters Tournament | No Team Scores",
 "Upcoming Nov 5 Women's · Siena at ITA Masters Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Siena at BU Invitational | No Team Scores",
 "Final Oct 2 Men's · Siena at Metro Masters Tournament | No Team Scores",
 "Final Oct 8 Men's · Siena at ITA Regionals | No Team Scores",
 "Upcoming Oct 28, 2:00 PM Men's · Siena at Monmouth | ",
 "Upcoming Nov 5 Men's · Siena at ITA Masters Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Siena vs Rhode Island | L, 2-3",
 "Final Aug 29 Siena vs Holy Cross | L, 1-3",
 "Final Aug 29 Siena at Central Connecticut State | W, 3-0",
 "Final Sep 4 Siena vs Cleveland State | W, 3-1",
 "Final Sep 4 Siena at Mercyhurst | L, 2-3",
 "Final Sep 5 Siena vs Morehead State | L, 1-3",
 "Final Sep 11 Siena vs Delaware State | L, 0-3",
 "Final Sep 11 Siena vs Le Moyne | W, 3-0",
 "Final Sep 12 Siena vs Bucknell | W, 3-0",
 "Final Sep 18 Siena vs Maryland Eastern Shore | W, 3-0",
 "Final Sep 18 Siena at Robert Morris | L, 0-3",
 "Final Sep 19 Siena at Duquesne | L, 0-3",
 "Final Sep 25 Siena at Saint Peter's | L, 1-3",
 "Final Sep 26 Siena at Rider | W, 3-0",
 "Final Sep 29 Siena vs Marist | W, 3-1",
 "Final Oct 2 Siena vs Manhattan | W, 3-1",
 "Final Oct 3 Siena vs Iona | W, 3-0",
 "Final Oct 7 Siena vs UAlbany | L, 1-3",
 "Final Oct 9 Siena at Quinnipiac | W, 3-1",
 "Final Oct 10 Siena at Merrimack | L, 1-3",
 "Final Oct 16 Siena vs Sacred Heart | W, 3-2",
 "Final Oct 17 Siena vs Fairfield | L, 2-3",
 "Final Oct 20 Siena at Le Moyne | W, 3-0",
 "Today Oct 23, 6:00 PM Siena vs Niagara | ",
 "Upcoming Oct 24, 2:00 PM Siena vs Canisius | ",
 "Upcoming Oct 27, 7:00 PM Siena at Marist | ",
 "Upcoming Oct 30, 5:00 PM Siena at Iona | ",
 "Upcoming Oct 31, 2:00 PM Siena at Manhattan | ",
 "Upcoming Nov 6, 6:00 PM Siena at Canisius | ",
 "Upcoming Nov 7, 2:00 PM Siena at Niagara | ",
 "Upcoming Nov 13, 6:00 PM Siena vs Merrimack | ",
 "Upcoming Nov 14, 2:00 PM Siena vs Quinnipiac | ",
 "Upcoming Nov 17 Siena at Metro Quarterfinals | ",
 "Upcoming Nov 20 Siena at Metro Semifinals / Championship | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Siena module checks passed");
