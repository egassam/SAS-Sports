import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fairfieldSchool} from '../src/schools/fairfield.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='fairfield');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,fairfieldHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/fairfield-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fairfieldstags.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['fairfield'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',fairfieldSchool.scheduleUrls],['roster',fairfieldSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('fairfield|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fairfieldstags.com',`${key} must stay on fairfieldstags.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fairfieldstags.com/sports/baseball/schedule"],"roster":["https://fairfieldstags.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fairfieldstags.com/sports/mens-basketball/schedule","https://fairfieldstags.com/sports/womens-basketball/schedule"],"roster":["https://fairfieldstags.com/sports/mens-basketball/roster","https://fairfieldstags.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://fairfieldstags.com/sports/womens-cross-country/schedule","https://fairfieldstags.com/sports/mens-cross-country/schedule"],"roster":["https://fairfieldstags.com/sports/womens-cross-country/roster","https://fairfieldstags.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://fairfieldstags.com/sports/field-hockey/schedule"],"roster":["https://fairfieldstags.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://fairfieldstags.com/sports/womens-golf/schedule","https://fairfieldstags.com/sports/mens-golf/schedule"],"roster":["https://fairfieldstags.com/sports/womens-golf/roster","https://fairfieldstags.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://fairfieldstags.com/sports/womens-lacrosse/schedule","https://fairfieldstags.com/sports/mens-lacrosse/schedule"],"roster":["https://fairfieldstags.com/sports/womens-lacrosse/roster","https://fairfieldstags.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://fairfieldstags.com/sports/womens-rowing/schedule","https://fairfieldstags.com/sports/mens-rowing/schedule"],"roster":["https://fairfieldstags.com/sports/womens-rowing/roster","https://fairfieldstags.com/sports/mens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://fairfieldstags.com/sports/womens-soccer/schedule","https://fairfieldstags.com/sports/mens-soccer/schedule"],"roster":["https://fairfieldstags.com/sports/womens-soccer/roster","https://fairfieldstags.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://fairfieldstags.com/sports/softball/schedule"],"roster":["https://fairfieldstags.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://fairfieldstags.com/sports/womens-swimming-and-diving/schedule","https://fairfieldstags.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://fairfieldstags.com/sports/womens-swimming-and-diving/roster","https://fairfieldstags.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://fairfieldstags.com/sports/womens-tennis/schedule","https://fairfieldstags.com/sports/mens-tennis/schedule"],"roster":["https://fairfieldstags.com/sports/womens-tennis/roster","https://fairfieldstags.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://fairfieldstags.com/sports/womens-volleyball/schedule"],"roster":["https://fairfieldstags.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'fairfield|"+sport+"':"),`${sport} routes must live in the Fairfield module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://fairfieldstags.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.fairfieldHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=fairfield)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 7:00 PM Men's · Fairfield vs Fordham (Exhibition) | ",
 "Upcoming Nov 5, 7:00 PM Men's · Fairfield vs Vermont | ",
 "Upcoming Nov 8, 1:00 PM Men's · Fairfield at Bryant | ",
 "Upcoming Nov 10 Men's · Fairfield at Wisconsin | ",
 "Upcoming Nov 14, 7:00 PM Men's · Fairfield vs NJIT | ",
 "Upcoming Nov 18, 7:00 PM Men's · Fairfield vs St. Joseph's Brooklyn | ",
 "Upcoming Nov 22, 1:00 PM Men's · Fairfield at LIU | ",
 "Upcoming Nov 27, 2:00 PM Men's · Fairfield vs Navy | ",
 "Upcoming Nov 29, 2:00 PM Men's · Fairfield vs Central Connecticut State | ",
 "Upcoming Dec 4, 7:00 PM Men's · Fairfield vs Manhattan | ",
 "Upcoming Dec 6, 1:00 PM Men's · Fairfield at Merrimack | ",
 "Upcoming Dec 8, 7:00 PM Men's · Fairfield at Providence | ",
 "Upcoming Dec 13, 5:00 PM Men's · Fairfield vs Le Moyne | ",
 "Upcoming Dec 22, 1:00 PM Men's · Fairfield at New Hampshire | ",
 "Upcoming Dec 29, 7:00 PM Men's · Fairfield vs Siena | ",
 "Upcoming Jan 1, 7:00 PM Men's · Fairfield at Rider | ",
 "Upcoming Jan 3, 1:00 PM Men's · Fairfield at Iona | ",
 "Upcoming Jan 10, 2:00 PM Men's · Fairfield vs Merrimack | ",
 "Upcoming Jan 13, 7:00 PM Men's · Fairfield at Siena | ",
 "Upcoming Jan 16, 4:00 PM Men's · Fairfield at Mount St. Mary's | ",
 "Upcoming Jan 18, 2:00 PM Men's · Fairfield vs Canisius | ",
 "Upcoming Jan 22, 7:00 PM Men's · Fairfield vs Rider | ",
 "Upcoming Jan 24, 2:00 PM Men's · Fairfield at Quinnipiac | ",
 "Upcoming Jan 31, 2:00 PM Men's · Fairfield vs Mount St. Mary's | ",
 "Upcoming Feb 5, 7:00 PM Men's · Fairfield at Sacred Heart | ",
 "Upcoming Feb 7, 2:00 PM Men's · Fairfield vs Saint Peter's | ",
 "Upcoming Feb 11, 7:00 PM Men's · Fairfield at Marist | ",
 "Upcoming Feb 13, 7:00 PM Men's · Fairfield vs Quinnipiac | ",
 "Upcoming Feb 19, 7:00 PM Men's · Fairfield at Canisius | ",
 "Upcoming Feb 21, 2:00 PM Men's · Fairfield at Niagara | ",
 "Upcoming Feb 26, 7:00 PM Men's · Fairfield vs Iona | ",
 "Upcoming Feb 28, 2:00 PM Men's · Fairfield vs Sacred Heart | ",
 "Upcoming Mar 4 Men's · Fairfield at Metro Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Final Oct 21 Women's · Fairfield vs New Haven (Exhibition) | W, 107-41",
 "Upcoming Nov 6, 7:00 PM Women's · Fairfield vs Binghamton | ",
 "Upcoming Nov 8, 2:00 PM Women's · Fairfield vs Vermont | ",
 "Upcoming Nov 12, 7:00 PM Women's · Fairfield at Seton Hall | ",
 "Upcoming Nov 15, 2:00 PM Women's · Fairfield vs Villanova | ",
 "Upcoming Nov 19, 7:00 PM Women's · Fairfield at Oregon | ",
 "Upcoming Nov 21 Women's · Fairfield at Oregon State | ",
 "Upcoming Nov 26, 3:30 PM Women's · Fairfield vs North Dakota State | ",
 "Upcoming Nov 27, 2:30 PM Women's · Fairfield vs BYU | ",
 "Upcoming Dec 3, 11:00 AM Women's · Fairfield at Lehigh | ",
 "Upcoming Dec 9, 6:00 PM Women's · Fairfield vs Maine | ",
 "Upcoming Dec 13, 1:00 PM Women's · Fairfield vs Howard | ",
 "Upcoming Dec 16, 7:00 PM Women's · Fairfield vs Columbia | ",
 "Upcoming Dec 19, 6:00 PM Women's · Fairfield at Manhattan | ",
 "Upcoming Dec 21, 7:00 PM Women's · Fairfield vs Merrimack | ",
 "Upcoming Dec 29, 6:00 PM Women's · Fairfield at Siena | ",
 "Upcoming Jan 1, 2:00 PM Women's · Fairfield vs Rider | ",
 "Upcoming Jan 3, 2:00 PM Women's · Fairfield vs Iona | ",
 "Upcoming Jan 9 Women's · Fairfield at Merrimack | ",
 "Upcoming Jan 13, 11:00 AM Women's · Fairfield vs Siena | ",
 "Upcoming Jan 16, 2:00 PM Women's · Fairfield vs Mount St. Mary's | ",
 "Upcoming Jan 18, 1:00 PM Women's · Fairfield at Canisius | ",
 "Upcoming Jan 21, 6:00 PM Women's · Fairfield at Rider | ",
 "Upcoming Jan 23, 2:00 PM Women's · Fairfield vs Quinnipiac | ",
 "Upcoming Jan 30, 2:00 PM Women's · Fairfield at Mount St. Mary's | ",
 "Upcoming Feb 4, 7:00 PM Women's · Fairfield vs Sacred Heart | ",
 "Upcoming Feb 6, 2:00 PM Women's · Fairfield at Saint Peter's | ",
 "Upcoming Feb 11, 7:00 PM Women's · Fairfield vs Marist | ",
 "Upcoming Feb 13, 2:00 PM Women's · Fairfield at Quinnipiac | ",
 "Upcoming Feb 18, 7:00 PM Women's · Fairfield vs Canisius | ",
 "Upcoming Feb 20, 2:00 PM Women's · Fairfield vs Niagara | ",
 "Upcoming Feb 25, 6:00 PM Women's · Fairfield at Iona | ",
 "Upcoming Feb 27, 2:00 PM Women's · Fairfield at Sacred Heart | ",
 "Upcoming Mar 4 Women's · Fairfield at Metro Conference Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Fairfield at Marist Season Opener | 3rd of 4",
 "Final Sep 19 Women's · Fairfield at Jasper Fall XC Invite | 7th of 12",
 "Final Oct 2 Women's · Fairfield at Paul Short Run | 36th of 37",
 "Final Oct 17 Women's · Fairfield at ECAC Championship | 17th of 26",
 "Upcoming Oct 31 Women's · Fairfield at Metro Championship | ",
 "Upcoming Nov 13 Women's · Fairfield at NCAA Northeast Regional Championship | ",
 "Upcoming Nov 21 Women's · Fairfield at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Fairfield at Marist Season Opener | 1st of 4",
 "Final Sep 19 Men's · Fairfield at Jasper Fall XC Invite | 6th of 12",
 "Final Oct 2 Men's · Fairfield at Paul Short Run | No Team Scoring",
 "Final Oct 17 Men's · Fairfield at IC4A Championship | 20th of 25",
 "Upcoming Oct 31 Men's · Fairfield at Metro Championship | ",
 "Upcoming Nov 13 Men's · Fairfield at NCAA Northeast Regional Championship | ",
 "Upcoming Nov 21 Men's · Fairfield at NCAA Championship | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Fairfield vs Syracuse | L, 1-2",
 "Final Aug 30 Fairfield vs Holy Cross | W, 4-0",
 "Final Sep 6 Fairfield vs LIU | W, 7-0",
 "Final Sep 11 Fairfield at Yale | L, 1-2",
 "Final Sep 13 Fairfield vs Brown | W, 4-2",
 "Final Sep 18 Fairfield vs Drexel | L, 1-2",
 "Final Sep 20 Fairfield vs Vermont | L, 1-3",
 "Final Sep 25 Fairfield at Towson | W, 4-2",
 "Final Sep 27 Fairfield at Delaware | L, 2-3",
 "Final Oct 2 Fairfield vs Hofstra | W, 4-0",
 "Final Oct 4 Fairfield vs Lehigh | W, 6-0",
 "Final Oct 9 Fairfield at William & Mary | W, 5-0",
 "Final Oct 11 Fairfield at VCU | W, 2-0",
 "Final Oct 16 Fairfield vs Northeastern | W, 3-1",
 "Today Oct 23, 4:00 PM Fairfield at Monmouth | ",
 "Upcoming Oct 25, 12:00 PM Fairfield at Providence | ",
 "Upcoming Oct 30, 3:00 PM Fairfield at UConn | ",
 "Upcoming Nov 4 Fairfield at CAA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Fairfield at The Charge at Quail Valley | 3rd of 9",
 "Final Sep 21 Women's · Fairfield at Red Bandanna Invitational | 5th of 15",
 "Final Sep 28 Women's · Fairfield at SHU Fall Classic | 3rd of 8",
 "Final Oct 12 Women's · Fairfield at Quinnipiac Classic | 4th of 10",
 "Upcoming Oct 26 Women's · Fairfield at Lehigh Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · Fairfield at Ryan T. Lee Memorial Collegiate | 14th of 18",
 "Final Sep 27 Men's · Fairfield at UConn Invitational at Greathorse | 5th of 14",
 "Final Oct 5 Men's · Fairfield at Testudo Cup | 8th of 14",
 "Final Oct 12 Men's · Fairfield at Sacred Heart Fall Classic | 5th of 11",
 "Final Oct 19 Men's · Fairfield at Nassau Intercollegiate | 5th of 7",
 "Upcoming Oct 26 Men's · Fairfield at Wykagyl Collegiate | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Fairfield vs Wormtown Chase | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[
 "Upcoming Oct 24 Men's · Fairfield vs Wormtown Chase | ",
 "Upcoming Nov 1 Men's · Fairfield vs Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Fairfield at North Carolina | L, 0-4",
 "Final Aug 16 Women's · Fairfield at UMass Lowell | W, 3-2",
 "Final Aug 20 Women's · Fairfield vs Boston University | W, 5-2",
 "Final Aug 23 Women's · Fairfield vs Rutgers | T, 0-0",
 "Final Aug 27 Women's · Fairfield at Harvard | L, 0-4",
 "Final Sep 2 Women's · Fairfield at FDU | L, 0-2",
 "Final Sep 5 Women's · Fairfield vs Rider | W, 3-0",
 "Final Sep 12 Women's · Fairfield vs Canisius | W, 2-0",
 "Final Sep 19 Women's · Fairfield at Siena | W, 2-1",
 "Final Sep 23 Women's · Fairfield vs Iona | W, 6-1",
 "Final Sep 26 Women's · Fairfield at Mount St. Mary's | W, 2-0",
 "Final Oct 7 Women's · Fairfield at Marist | W, 5-1",
 "Final Oct 10 Women's · Fairfield vs Merrimack | W, 7-1",
 "Final Oct 17 Women's · Fairfield at Niagara | L, 1-2",
 "Final Oct 21 Women's · Fairfield vs Quinnipiac | L, 0-1",
 "Upcoming Oct 24, 1:30 PM Women's · Fairfield at Manhattan | ",
 "Upcoming Oct 31, 12:00 PM Women's · Fairfield vs Saint Peter's | ",
 "Upcoming Nov 4, 7:00 PM Women's · Fairfield at Sacred Heart | ",
 "Upcoming Nov 8 Women's · Fairfield at Metro Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Fairfield at Marshall | L, 1-2",
 "Final Aug 27 Men's · Fairfield at UConn | W, 1-0",
 "Final Sep 1 Men's · Fairfield vs Lehigh | T, 2-2",
 "Final Sep 5 Men's · Fairfield at Columbia | T, 3-3",
 "Final Sep 12 Men's · Fairfield vs New Haven | W, 2-1",
 "Final Sep 19 Men's · Fairfield vs Siena | W, 2-1",
 "Final Sep 30 Men's · Fairfield at Saint Peter's | W, 4-0",
 "Final Oct 3 Men's · Fairfield vs Manhattan | W, 3-0",
 "Final Oct 7 Men's · Fairfield at Quinnipiac | W, 2-1",
 "Final Oct 10 Men's · Fairfield at Mount St. Mary's | W, 3-0",
 "Final Oct 14 Men's · Fairfield vs Marist | W, 1-0",
 "Final Oct 17 Men's · Fairfield at Iona | L, 0-1",
 "Final Oct 20 Men's · Fairfield at Yale | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Men's · Fairfield vs Canisius | ",
 "Upcoming Oct 31, 2:00 PM Men's · Fairfield at Niagara | ",
 "Upcoming Nov 4, 6:00 PM Men's · Fairfield vs Sacred Heart | ",
 "Upcoming Nov 8 Men's · Fairfield at Metro Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Fairfield at Fairfield Invitational (Diving) | Completed",
 "Final Oct 3 Women's · Fairfield at Fairfield Invitational (Swimming) | Completed",
 "Final Oct 9 Women's · Fairfield at Bryant | Completed",
 "Final Oct 17 Women's · Fairfield vs Providence | W, 209-90",
 "Upcoming Oct 31, 1:00 PM Women's · Fairfield at Marist | ",
 "Upcoming Nov 20, 10:00 AM Women's · Fairfield at Terrier Invitational | ",
 "Upcoming Jan 9, 1:30 PM Women's · Fairfield at Boston University | ",
 "Upcoming Jan 23, 1:00 PM Women's · Fairfield at Iona | ",
 "Upcoming Jan 30, 10:00 AM Women's · Fairfield vs UMass | ",
 "Upcoming Feb 17 Women's · Fairfield at Metro Conference Championship Day 1 | ",
 "Upcoming Feb 18 Women's · Fairfield at Metro Conference Championship Day 2 | ",
 "Upcoming Feb 19 Women's · Fairfield at Metro Conference Championship Day 3 | ",
 "Upcoming Feb 20 Women's · Fairfield at Metro Conference Championship Day 4 | ",
 "Upcoming Mar 11 Women's · Fairfield at National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Fairfield at NCAA Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Fairfield at Fairfield Invitational (Diving) | Completed",
 "Final Oct 3 Men's · Fairfield at Fairfield Invitational (Swimming) | Completed",
 "Final Oct 9 Men's · Fairfield at Bryant | L, 88-174",
 "Final Oct 17 Men's · Fairfield vs Providence | W, 232-66",
 "Upcoming Oct 31, 1:00 PM Men's · Fairfield at Marist | ",
 "Upcoming Nov 20, 10:00 AM Men's · Fairfield at Terrier Invitational | ",
 "Upcoming Jan 9, 1:30 PM Men's · Fairfield at Boston University | ",
 "Upcoming Jan 23, 1:00 PM Men's · Fairfield at Iona | ",
 "Upcoming Jan 30, 10:00 AM Men's · Fairfield vs UMass | ",
 "Upcoming Feb 17 Men's · Fairfield at Metro Conference Championship Day 1 | ",
 "Upcoming Feb 18 Men's · Fairfield at Metro Conference Championship Day 2 | ",
 "Upcoming Feb 19 Men's · Fairfield at Metro Conference Championship Day 3 | ",
 "Upcoming Feb 20 Men's · Fairfield at Metro Conference Championship Day 4 | ",
 "Upcoming Mar 11 Men's · Fairfield at National Invitational Championship | ",
 "Upcoming Mar 24 Men's · Fairfield at NCAA Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Fairfield at Sacred Heart | Completed",
 "Final Sep 12 Women's · Fairfield at New Haven | Completed",
 "Final Sep 13 Women's · Fairfield at Army West Point | Completed",
 "Final Sep 25 Women's · Fairfield at West Point Invite Day 1 | Completed",
 "Final Sep 26 Women's · Fairfield at West Point Invite Day 2 | Completed",
 "Final Sep 27 Women's · Fairfield at West Point Invite Day 3 | Completed",
 "Final Oct 2 Women's · Fairfield at Metro Masters Tournament Day 1 | Completed",
 "Final Oct 3 Women's · Fairfield at Metro Masters Tournament Day 2 | Completed",
 "Final Oct 4 Women's · Fairfield at Metro Masters Tournament Day 3 | Completed",
 "Final Oct 8 Women's · Fairfield at ITA New England Regional Championship Day 1 | Completed",
 "Final Oct 9 Women's · Fairfield at ITA New England Regional Championship Day 2 | Completed",
 "Final Oct 10 Women's · Fairfield at ITA New England Regional Championship Day 3 | Completed",
 "Today Oct 23 Women's · Fairfield at Binghamton Hidden Duals Day 1 | ",
 "Upcoming Oct 24 Women's · Fairfield at Binghamton Hidden Duals Day 2 | ",
 "Upcoming Oct 25 Women's · Fairfield at Binghamton Hidden Duals Day 3 | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Fairfield at Fairfield Invitational Day 1 | Completed",
 "Final Sep 19 Men's · Fairfield at Fairfield Invitational Day 2 | Completed",
 "Final Sep 19 Men's · Fairfield at ITA Men's All-American Championships Day 1 | Completed",
 "Final Sep 20 Men's · Fairfield at ITA Men's All-American Championships Day 2 | Completed",
 "Final Sep 25 Men's · Fairfield at Bulldog Invitational Day 1 | Completed",
 "Final Sep 27 Men's · Fairfield at Bulldog Invitational Day 3 | Completed",
 "Final Oct 2 Men's · Fairfield at Metro Masters Tournament Day 1 | Completed",
 "Final Oct 3 Men's · Fairfield at Metro Masters Tournament Day 2 | Completed",
 "Final Oct 8 Men's · Fairfield at ITA New England Regional Championship Day 1 | Completed",
 "Final Oct 9 Men's · Fairfield at ITA New England Regional Championship Day 2 | Completed",
 "Final Oct 10 Men's · Fairfield at ITA New England Regional Championship Day 3 | Completed",
 "Today Oct 23 Men's · Fairfield at Binghamton Hidden Duals Day 1 | ",
 "Upcoming Oct 24 Men's · Fairfield at Binghamton Hidden Duals Day 2 | ",
 "Upcoming Oct 25 Men's · Fairfield at Binghamton Hidden Duals Day 3 | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Fairfield vs Morehead State | L, 2-3",
 "Final Aug 29 Fairfield vs Colgate | W, 3-0",
 "Final Aug 29 Fairfield at Tennessee | L, 0-3",
 "Final Sep 4 Fairfield at Harvard | L, 0-3",
 "Final Sep 5 Fairfield vs Holy Cross | W, 3-1",
 "Final Sep 5 Fairfield at Northeastern | W, 3-2",
 "Final Sep 11 Fairfield vs Army West Point | W, 3-0",
 "Final Sep 12 Fairfield vs Liberty | L, 1-3",
 "Final Sep 17 Fairfield vs Central Connecticut State | W, 3-1",
 "Final Sep 18 Fairfield vs Brown | W, 3-1",
 "Final Sep 19 Fairfield vs Middle Tennessee | L, 1-3",
 "Final Sep 25 Fairfield at Niagara | W, 3-1",
 "Final Sep 26 Fairfield at Canisius | W, 3-1",
 "Final Sep 29 Fairfield at Sacred Heart | W, 3-2",
 "Final Oct 2 Fairfield vs Quinnipiac | W, 3-0",
 "Final Oct 3 Fairfield vs Merrimack | W, 3-1",
 "Final Oct 9 Fairfield vs Saint Peter's | W, 3-2",
 "Final Oct 10 Fairfield vs Rider | W, 3-0",
 "Final Oct 16 Fairfield at Marist | W, 3-0",
 "Final Oct 17 Fairfield at Siena | W, 3-2",
 "Today Oct 23, 5:00 PM Fairfield vs Manhattan | ",
 "Upcoming Oct 24, 2:00 PM Fairfield vs Iona | ",
 "Upcoming Oct 27, 6:00 PM Fairfield vs Sacred Heart | ",
 "Upcoming Oct 30, 6:00 PM Fairfield at Merrimack | ",
 "Upcoming Oct 31, 3:00 PM Fairfield at Quinnipiac | ",
 "Upcoming Nov 6, 6:00 PM Fairfield at Rider | ",
 "Upcoming Nov 7, 1:00 PM Fairfield at Saint Peter's | ",
 "Upcoming Nov 13, 5:00 PM Fairfield vs Canisius | ",
 "Upcoming Nov 14, 1:00 PM Fairfield vs Niagara | ",
 "Upcoming Nov 17 Fairfield at Metro Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Fairfield module checks passed");
