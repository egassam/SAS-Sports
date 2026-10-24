import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bostonUniversitySchool} from '../src/schools/boston-university.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='boston-university');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bostonUniversityHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/boston-university-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goterriers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['boston-university'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',bostonUniversitySchool.scheduleUrls],['roster',bostonUniversitySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('boston-university|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goterriers.com',`${key} must stay on goterriers.com`);
  }
}
const parity={"Basketball":{"schedule":["https://goterriers.com/sports/mens-basketball/schedule","https://goterriers.com/sports/womens-basketball/schedule"],"roster":["https://goterriers.com/sports/mens-basketball/roster","https://goterriers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goterriers.com/sports/womens-cross-country/schedule","https://goterriers.com/sports/mens-cross-country/schedule"],"roster":["https://goterriers.com/sports/womens-cross-country/roster","https://goterriers.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://goterriers.com/sports/field-hockey/schedule"],"roster":["https://goterriers.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://goterriers.com/sports/womens-golf/schedule"],"roster":["https://goterriers.com/sports/womens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://goterriers.com/sports/mens-ice-hockey/schedule","https://goterriers.com/sports/womens-ice-hockey/schedule"],"roster":["https://goterriers.com/sports/mens-ice-hockey/roster","https://goterriers.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://goterriers.com/sports/womens-lacrosse/schedule","https://goterriers.com/sports/mens-lacrosse/schedule"],"roster":["https://goterriers.com/sports/womens-lacrosse/roster","https://goterriers.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://goterriers.com/sports/mens-rowing/schedule"],"roster":["https://goterriers.com/sports/mens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://goterriers.com/sports/womens-soccer/schedule","https://goterriers.com/sports/mens-soccer/schedule"],"roster":["https://goterriers.com/sports/womens-soccer/roster","https://goterriers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goterriers.com/sports/softball/schedule"],"roster":["https://goterriers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goterriers.com/sports/womens-swimming-and-diving/schedule","https://goterriers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goterriers.com/sports/womens-swimming-and-diving/roster","https://goterriers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goterriers.com/sports/womens-tennis/schedule","https://goterriers.com/sports/mens-tennis/schedule"],"roster":["https://goterriers.com/sports/womens-tennis/roster","https://goterriers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goterriers.com/sports/womens-track-and-field/schedule","https://goterriers.com/sports/mens-track-and-field/schedule"],"roster":["https://goterriers.com/sports/womens-track-and-field/roster","https://goterriers.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'boston-university|"+sport+"':"),`${sport} routes must live in the Boston University module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goterriers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bostonUniversityHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=boston-university)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · BU vs Northeastern | ",
 "Upcoming Nov 6, 7:00 PM Men's · BU at Brown | ",
 "Upcoming Nov 9, 8:00 PM Men's · BU at Northwestern | ",
 "Upcoming Nov 12, 6:00 PM Men's · BU vs Johnson & Wales | ",
 "Upcoming Nov 15, 1:00 PM Men's · BU vs Dartmouth | ",
 "Upcoming Nov 18, 7:00 PM Men's · BU at Merrimack | ",
 "Upcoming Nov 21, 12:00 PM Men's · BU vs Columbia | ",
 "Upcoming Nov 24, 7:00 PM Men's · BU at Harvard | ",
 "Upcoming Dec 1, 7:00 PM Men's · BU at Fordham | ",
 "Upcoming Dec 5, 4:30 PM Men's · BU vs New Hampshire | ",
 "Upcoming Dec 8, 7:00 PM Men's · BU at Saint Joseph's | ",
 "Upcoming Dec 12, 1:00 PM Men's · BU at Maine | ",
 "Upcoming Dec 20, 1:00 PM Men's · BU at UMass Lowell | ",
 "Upcoming Dec 30, 2:00 PM Men's · BU at Loyola Maryland | ",
 "Upcoming Jan 2, 2:00 PM Men's · BU at Lehigh | ",
 "Upcoming Jan 6, 6:00 PM Men's · BU vs Bucknell | ",
 "Upcoming Jan 9, 12:00 PM Men's · BU vs Navy | ",
 "Upcoming Jan 13, 7:00 PM Men's · BU at Lafayette | ",
 "Upcoming Jan 16, 1:00 PM Men's · BU vs American | ",
 "Upcoming Jan 18, 5:00 PM Men's · BU at Colgate | ",
 "Upcoming Jan 23, 2:00 PM Men's · BU at Holy Cross | ",
 "Upcoming Jan 27, 6:00 PM Men's · BU vs Lafayette | ",
 "Upcoming Jan 30, 2:00 PM Men's · BU at American | ",
 "Upcoming Feb 3, 6:00 PM Men's · BU vs Lehigh | ",
 "Upcoming Feb 6, 1:00 PM Men's · BU at Army West Point | ",
 "Upcoming Feb 10, 6:00 PM Men's · BU vs Colgate | ",
 "Upcoming Feb 13, 1:00 PM Men's · BU vs Loyola Maryland | ",
 "Upcoming Feb 15, 6:30 PM Men's · BU at Bucknell | ",
 "Upcoming Feb 21, 1:00 PM Men's · BU vs Holy Cross | ",
 "Upcoming Feb 24, 6:00 PM Men's · BU at Navy | ",
 "Upcoming Feb 27, 1:00 PM Men's · BU vs Army West Point | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · BU at Dartmouth | ",
 "Upcoming Nov 6, 6:00 PM Women's · BU vs Northeastern | ",
 "Upcoming Nov 10, 6:00 PM Women's · BU vs UMass Boston | ",
 "Upcoming Nov 14, 2:00 PM Women's · BU at Quinnipiac | ",
 "Upcoming Nov 18, 5:00 PM Women's · BU at Stonehill | ",
 "Upcoming Nov 22, 2:00 PM Women's · BU vs New Hampshire | ",
 "Upcoming Nov 25, 12:00 PM Women's · BU vs Brown | ",
 "Upcoming Nov 29, 1:00 PM Women's · BU at Bryant | ",
 "Upcoming Dec 2, 6:00 PM Women's · BU at UMass Lowell | ",
 "Upcoming Dec 5, 1:00 PM Women's · BU vs UNLV | ",
 "Upcoming Dec 9, 6:00 PM Women's · BU vs New Haven | ",
 "Upcoming Dec 12, 12:00 PM Women's · BU vs Marist | ",
 "Upcoming Dec 19, 1:00 PM Women's · BU vs Vermont | ",
 "Upcoming Dec 30, 6:00 PM Women's · BU vs Loyola Maryland | ",
 "Upcoming Jan 2, 2:00 PM Women's · BU vs Lehigh | ",
 "Upcoming Jan 6, 6:00 PM Women's · BU at Bucknell | ",
 "Upcoming Jan 9, 1:00 PM Women's · BU at Navy | ",
 "Upcoming Jan 13, 11:30 AM Women's · BU vs Lafayette | ",
 "Upcoming Jan 16, 1:00 PM Women's · BU at American | ",
 "Upcoming Jan 20, 6:00 PM Women's · BU vs Colgate | ",
 "Upcoming Jan 23, 2:00 PM Women's · BU vs Holy Cross | ",
 "Upcoming Jan 27, 6:00 PM Women's · BU at Lafayette | ",
 "Upcoming Jan 30, 2:00 PM Women's · BU vs American | ",
 "Upcoming Feb 3, 6:00 PM Women's · BU at Lehigh | ",
 "Upcoming Feb 6, 2:00 PM Women's · BU vs Army West Point | ",
 "Upcoming Feb 10, 6:00 PM Women's · BU at Colgate | ",
 "Upcoming Feb 14 Women's · BU at Loyola Maryland | ",
 "Upcoming Feb 17, 6:00 PM Women's · BU vs Bucknell | ",
 "Upcoming Feb 20, 2:00 PM Women's · BU at Holy Cross | ",
 "Upcoming Feb 23, 6:00 PM Women's · BU vs Navy | ",
 "Upcoming Feb 26, 6:00 PM Women's · BU at Army West Point | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · BU at Friar Cross Country Invitational | 6-of-9",
 "Final Sep 19 Women's · BU at UMass Dartmouth Cross Country Invitational | 1-of-33",
 "Final Sep 26 Women's · BU at Princeton Fall Meadows Challenge | 10-of-17",
 "Final Oct 17 Women's · BU at IC4A/ECAC Championships | 1-of-26",
 "Upcoming Oct 31, 11:00 AM Women's · BU at Patriot League Championships | ",
 "Upcoming Nov 13, 11:00 AM Women's · BU at NCAA Northeast Regional Championships | ",
 "Upcoming Nov 21, 10:20 AM Women's · BU at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · BU at Friar Cross Country Invitational | 8-of-9",
 "Final Sep 26 Men's · BU at Princeton Fall Meadows Challenge | 11-of-15",
 "Final Oct 17 Men's · BU at IC4A/ECAC Championships | 2-of-25",
 "Upcoming Oct 31, 11:00 AM Men's · BU at Patriot League Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · BU at NCAA Northeast Regional Championships | ",
 "Upcoming Nov 21, 10:20 AM Men's · BU at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 BU vs Merrimack | W, 7-2",
 "Final Aug 30 BU at Providence | L, 2-3",
 "Final Sep 4 BU at Massachusetts | L, 1-5",
 "Final Sep 6 BU vs Dartmouth | W, 5-1",
 "Final Sep 11 BU at Brown | L, 4-5",
 "Final Sep 13 BU vs Maine | L, 2-3",
 "Final Sep 18 BU at Bryant | L, 1-4",
 "Final Sep 20 BU at New Hampshire | W, 5-1",
 "Final Sep 26 BU at Bucknell | W, 7-2",
 "Final Oct 3 BU vs Lehigh | W, 7-1",
 "Final Oct 9 BU vs Holy Cross | W, 3-1",
 "Final Oct 11 BU at Boston College | L, 1-5",
 "Final Oct 16 BU at American | L, 2-3",
 "Final Oct 18 BU at Harvard | L, 1-5",
 "Final Oct 23 BU vs Colgate | W, 2-1",
 "Upcoming Oct 25, 1:00 PM BU vs Northeastern | ",
 "Upcoming Oct 30, 6:00 PM BU at Lafayette | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 BU at Warrior Invitational | 1st of 9",
 "Final Sep 21 BU at Red Bandanna Invitational | 7th of 15",
 "Final Sep 25 BU at Princeton Invitational | 10th of 12",
 "Final Oct 3 BU at Yale Invitational | 8th of 8",
 "Upcoming Feb 20 BU at Space Coast Classic | ",
 "Upcoming Mar 15 BU at Low Country Intercollegiate | ",
 "Upcoming Apr 4 BU at Ironwood Invitational | ",
 "Upcoming Apr 10 BU at Rutgers Invitational | ",
 "Upcoming Apr 23 BU at Patriot League Championship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · BU at Alaska | W, 2-1",
 "Final Oct 3 Men's · BU at Alaska | W, 4-0",
 "Final Oct 10 Men's · BU vs Brown (Exhibition) | W, 3-1",
 "Final Oct 16 Men's · BU at Vermont | L, 1-2",
 "Final Oct 17 Men's · BU at Vermont | W, 2-1",
 "Final Oct 22 Men's · BU at UConn | L, 4-5",
 "Today Oct 24, 7:00 PM Men's · BU vs UConn | ",
 "Upcoming Oct 30, 7:00 PM Men's · BU vs Maine | ",
 "Upcoming Oct 31, 6:00 PM Men's · BU vs Maine | ",
 "Upcoming Nov 6, 7:00 PM Men's · BU at Michigan State | ",
 "Upcoming Nov 7 Men's · BU at Michigan State | ",
 "Upcoming Nov 10, 7:00 PM Men's · BU vs Harvard | ",
 "Upcoming Nov 18, 7:00 PM Men's · BU vs Quinnipiac | ",
 "Upcoming Nov 20, 7:00 PM Men's · BU at Merrimack | ",
 "Upcoming Nov 21, 6:00 PM Men's · BU vs Merrimack | ",
 "Upcoming Nov 27, 6:00 PM Men's · BU vs Denver | ",
 "Upcoming Nov 28, 6:00 PM Men's · BU vs Denver | ",
 "Upcoming Dec 4, 7:00 PM Men's · BU at Cornell | ",
 "Upcoming Dec 5, 5:00 PM Men's · BU at Colgate | ",
 "Upcoming Dec 11, 7:00 PM Men's · BU vs Northeastern | ",
 "Upcoming Dec 12, 6:00 PM Men's · BU vs Northeastern | ",
 "Upcoming Jan 3, 4:00 PM Men's · BU vs McGill (Exhibition) | ",
 "Upcoming Jan 8, 7:00 PM Men's · BU vs UMass | ",
 "Upcoming Jan 9, 7:00 PM Men's · BU at UMass | ",
 "Upcoming Jan 15, 7:15 PM Men's · BU at UMass Lowell | ",
 "Upcoming Jan 16, 6:00 PM Men's · BU vs UMass Lowell | ",
 "Upcoming Jan 22, 7:00 PM Men's · BU vs Providence | ",
 "Upcoming Jan 23, 6:00 PM Men's · BU at Providence | ",
 "Upcoming Jan 29, 7:00 PM Men's · BU at Boston College | ",
 "Upcoming Feb 1 Men's · BU vs Boston College | ",
 "Upcoming Feb 5, 7:00 PM Men's · BU at Maine | ",
 "Upcoming Feb 8 Men's · BU vs Harvard/Northeastern | ",
 "Upcoming Feb 19, 7:00 PM Men's · BU vs New Hampshire | ",
 "Upcoming Feb 20, 7:00 PM Men's · BU at New Hampshire | ",
 "Upcoming Feb 26, 7:00 PM Men's · BU at Boston College | ",
 "Upcoming Feb 27, 7:00 PM Men's · BU vs Boston College | ",
 "Upcoming Mar 5, 7:00 PM Men's · BU vs Northeastern | ",
 "Upcoming Mar 6, 6:00 PM Men's · BU vs UMass Lowell | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Oct 1 Women's · BU at Wisconsin | L, 0-7",
 "Final Oct 2 Women's · BU at Wisconsin | L, 1-4",
 "Final Oct 9 Women's · BU at New Hampshire | T, 4-4",
 "Final Oct 10 Women's · BU at Holy Cross | W, 2-1",
 "Final Oct 16 Women's · BU vs Colgate | L, 0-2",
 "Final Oct 17 Women's · BU vs Colgate | L, 0-1",
 "Upcoming Oct 23, 7:00 PM Women's · BU vs Yale | ",
 "Today Oct 24 Women's · BU vs Minnesota State/Robert Morris | ",
 "Upcoming Oct 30, 6:00 PM Women's · BU vs Northeastern | ",
 "Upcoming Oct 31, 4:00 PM Women's · BU vs Northeastern | ",
 "Upcoming Nov 6, 6:00 PM Women's · BU vs Maine | ",
 "Upcoming Nov 7, 4:00 PM Women's · BU vs Maine | ",
 "Upcoming Nov 13 Women's · BU at Boston College | ",
 "Upcoming Nov 14, 4:00 PM Women's · BU vs Boston College | ",
 "Upcoming Nov 20, 11:00 AM Women's · BU at Providence | ",
 "Upcoming Nov 21, 4:00 PM Women's · BU vs Providence | ",
 "Upcoming Dec 4, 6:00 PM Women's · BU vs UConn | ",
 "Upcoming Dec 5 Women's · BU at UConn | ",
 "Upcoming Dec 9, 6:00 PM Women's · BU vs Brown | ",
 "Upcoming Jan 5 Women's · BU at Brown | ",
 "Upcoming Jan 8, 6:00 PM Women's · BU vs New Hampshire | ",
 "Upcoming Jan 12 Women's · BU at Boston College | ",
 "Upcoming Jan 15, 6:00 PM Women's · BU vs Holy Cross | ",
 "Upcoming Jan 19 Women's · BU vs Harvard/Northeastern | ",
 "Upcoming Jan 22, 6:00 PM Women's · BU at Vermont | ",
 "Upcoming Jan 23, 3:00 PM Women's · BU at Vermont | ",
 "Upcoming Jan 29, 6:00 PM Women's · BU vs Merrimack | ",
 "Upcoming Jan 30 Women's · BU at Merrimack | ",
 "Upcoming Feb 4, 6:00 PM Women's · BU at Providence | ",
 "Upcoming Feb 5, 6:00 PM Women's · BU vs Boston College | ",
 "Upcoming Feb 12, 6:00 PM Women's · BU vs Northeastern | ",
 "Upcoming Feb 13, 2:00 PM Women's · BU at New Hampshire | ",
 "Upcoming Feb 18 Women's · BU at Merrimack | ",
 "Upcoming Feb 20, 4:00 PM Women's · BU vs Vermont | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Today Oct 24, 9:30 AM Men's · BU vs Alumni Game | "
]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · BU vs Northeastern | L, 0-1",
 "Final Aug 16 Women's · BU at UAlbany | W, 5-1",
 "Final Aug 20 Women's · BU at Fairfield | L, 2-5",
 "Final Aug 23 Women's · BU at UConn | L, 1-2",
 "Final Aug 30 Women's · BU vs San Francisco | W, 3-1",
 "Final Sep 3 Women's · BU vs Harvard | L, 1-2",
 "Final Sep 6 Women's · BU vs Providence | T, 1-1",
 "Final Sep 10 Women's · BU at Boston College | L, 0-4",
 "Final Sep 13 Women's · BU at Bryant | W, 2-1",
 "Final Sep 19 Women's · BU vs Navy | W, 2-1",
 "Final Sep 26 Women's · BU at Loyola Maryland | W, 1-0",
 "Final Sep 30 Women's · BU vs Army West Point | L, 0-2",
 "Final Oct 4 Women's · BU at Lafayette | L, 1-2",
 "Final Oct 10 Women's · BU vs Bucknell | L, 1-2",
 "Final Oct 17 Women's · BU at American | W, 2-1",
 "Final Oct 23 Women's · BU at Holy Cross | T, 1-1",
 "Upcoming Oct 31, 1:00 PM Women's · BU vs Lehigh | ",
 "Upcoming Nov 4, 6:00 PM Women's · BU at Colgate | ",
 "Upcoming Nov 8 Women's · BU at PL First Round | ",
 "Upcoming Nov 11 Women's · BU at PL Semifinal | ",
 "Upcoming Nov 15 Women's · BU at PL Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · BU at UCF | L, 0-1",
 "Final Aug 28 Men's · BU at Northeastern | L, 1-2",
 "Final Aug 31 Men's · BU at Providence | T, 1-1",
 "Final Sep 4 Men's · BU vs New Hampshire | T, 0-0",
 "Final Sep 8 Men's · BU vs Vermont | T, 0-0",
 "Final Sep 12 Men's · BU vs Army West Point | W, 4-0",
 "Final Sep 19 Men's · BU at Navy | W, 2-0",
 "Final Sep 22 Men's · BU vs Harvard | W, 2-1",
 "Final Sep 28 Men's · BU vs Bucknell | W, 5-0",
 "Final Oct 3 Men's · BU at Loyola Maryland | W, 2-1",
 "Final Oct 9 Men's · BU at Colgate | W, 2-1",
 "Final Oct 13 Men's · BU vs Boston College | T, 2-2",
 "Final Oct 18 Men's · BU vs American | L, 0-1",
 "Today Oct 24, 4:00 PM Men's · BU at Lehigh | ",
 "Upcoming Oct 30, 7:00 PM Men's · BU vs Lafayette | ",
 "Upcoming Nov 3, 6:00 PM Men's · BU at Holy Cross | ",
 "Upcoming Nov 7 Men's · BU at PL First Round | ",
 "Upcoming Nov 10 Men's · BU at PL Semifinal | ",
 "Upcoming Nov 14 Men's · BU at PL Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 10 Women's · BU vs Holy Cross | W, 191-109",
 "Final Oct 17 Women's · BU at Bucknell | W, 157-143",
 "Upcoming Oct 31, 1:30 PM Women's · BU vs Massachusetts | ",
 "Upcoming Nov 6, 6:30 PM Women's · BU at MIT (Exhibition) | ",
 "Upcoming Nov 20, 10:00 AM Women's · BU at Terrier Invite | ",
 "Upcoming Jan 9, 1:30 PM Women's · BU vs Colgate | ",
 "Upcoming Jan 9, 1:30 PM Women's · BU vs Fairfield | ",
 "Upcoming Jan 15 Women's · BU vs Boston College | ",
 "Upcoming Jan 22, 5:00 PM Women's · BU at Harvard | ",
 "Upcoming Jan 23, 1:30 PM Women's · BU vs Bryant | ",
 "Upcoming Feb 5, 6:00 PM Women's · BU vs BU Winter Open | ",
 "Upcoming Feb 17, 1:00 PM Women's · BU at Patriot League Championships | ",
 "Upcoming Mar 8 Women's · BU at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 17 Women's · BU at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 10 Men's · BU vs Holy Cross | W, 234.5-65.6",
 "Final Oct 17 Men's · BU at Bucknell | W, 199-101",
 "Upcoming Oct 31, 1:30 PM Men's · BU vs Massachusetts | ",
 "Upcoming Nov 6, 6:30 PM Men's · BU at MIT (Exhibition) | ",
 "Upcoming Nov 20, 10:00 AM Men's · BU at Terrier Invite | ",
 "Upcoming Jan 9, 1:30 PM Men's · BU vs Colgate | ",
 "Upcoming Jan 9, 1:30 PM Men's · BU vs Fairfield | ",
 "Upcoming Jan 15 Men's · BU vs Boston College | ",
 "Upcoming Jan 22, 5:00 PM Men's · BU at Harvard | ",
 "Upcoming Jan 23, 1:30 PM Men's · BU vs Bryant | ",
 "Upcoming Feb 5, 6:00 PM Men's · BU vs BU Winter Open | ",
 "Upcoming Feb 17, 1:00 PM Men's · BU at Patriot League Championships | ",
 "Upcoming Mar 8 Men's · BU at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 24 Men's · BU at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · BU at Bulldog Invitational | Completed",
 "Final Oct 2 Women's · BU at Harvard Fall Classic | Completed",
 "Final Oct 8 Women's · BU at ITA Regionals | Completed",
 "Today Oct 23 Women's · BU at ITA Patriot League Masters Qualifier | ",
 "Upcoming Nov 5 Women's · BU at ITA Patriot League Masters Championships | ",
 "Upcoming Nov 6 Women's · BU at Harvard Invitational | ",
 "Upcoming Nov 17 Women's · BU at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · BU at BU Invite | Completed",
 "Final Oct 8 Men's · BU at ITA Regionals | Completed",
 "Today Oct 23 Men's · BU at ITA Masters Qualifiers | ",
 "Upcoming Nov 6 Men's · BU at Battle of Boston | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Boston University module checks passed");
