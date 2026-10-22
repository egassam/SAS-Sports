import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {csuBakersfieldSchool} from '../src/schools/csu-bakersfield.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='csu-bakersfield');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,csuBakersfieldHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/csu-bakersfield-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gorunners.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['csu-bakersfield'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',csuBakersfieldSchool.scheduleUrls],['roster',csuBakersfieldSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('csu-bakersfield|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gorunners.com',`${key} must stay on gorunners.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gorunners.com/sports/baseball/schedule"],"roster":["https://gorunners.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gorunners.com/sports/mens-basketball/schedule","https://gorunners.com/sports/womens-basketball/schedule"],"roster":["https://gorunners.com/sports/mens-basketball/roster","https://gorunners.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gorunners.com/sports/womens-beach-volleyball/schedule"],"roster":["https://gorunners.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gorunners.com/sports/womens-cross-country/schedule"],"roster":["https://gorunners.com/sports/womens-cross-country/roster"],"combined":false},"Golf":{"schedule":["https://gorunners.com/sports/womens-golf/schedule"],"roster":["https://gorunners.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://gorunners.com/sports/womens-soccer/schedule","https://gorunners.com/sports/mens-soccer/schedule"],"roster":["https://gorunners.com/sports/womens-soccer/roster","https://gorunners.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gorunners.com/sports/softball/schedule"],"roster":["https://gorunners.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gorunners.com/sports/womens-swimming-and-diving/schedule","https://gorunners.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gorunners.com/sports/womens-swimming-and-diving/roster","https://gorunners.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://gorunners.com/sports/track-and-field/schedule"],"roster":["https://gorunners.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gorunners.com/sports/womens-volleyball/schedule"],"roster":["https://gorunners.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gorunners.com/sports/wrestling/schedule"],"roster":["https://gorunners.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'csu-bakersfield|"+sport+"':"),`${sport} routes must live in the CSU Bakersfield module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://gorunners.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.csuBakersfieldHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=csu-bakersfield)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 6:00 PM Men's · CSU Bakersfield at Montana (Exhib.) | ",
 "Upcoming Oct 31, 3:00 PM Men's · CSU Bakersfield vs Redlands (Exhib.) | ",
 "Upcoming Nov 5, 6:30 PM Men's · CSU Bakersfield vs Stanton | ",
 "Upcoming Nov 8, 3:00 PM Men's · CSU Bakersfield vs North Dakota State | ",
 "Upcoming Nov 12, 3:00 PM Men's · CSU Bakersfield at Western Illinois | ",
 "Upcoming Nov 15, 11:00 AM Men's · CSU Bakersfield at North Dakota State | ",
 "Upcoming Nov 20, 6:00 PM Men's · CSU Bakersfield at Idaho | ",
 "Upcoming Nov 25, 5:00 PM Men's · CSU Bakersfield at Pepperdine | ",
 "Upcoming Nov 28, 2:00 PM Men's · CSU Bakersfield vs Northern Arizona | ",
 "Upcoming Dec 3, 6:30 PM Men's · CSU Bakersfield vs UC Santa Barbara | ",
 "Upcoming Dec 5, 2:00 PM Men's · CSU Bakersfield vs CSUN | ",
 "Upcoming Dec 12, 6:30 PM Men's · CSU Bakersfield vs Whittier | ",
 "Upcoming Dec 19, 7:00 PM Men's · CSU Bakersfield at LMU | ",
 "Upcoming Dec 22, 1:00 PM Men's · CSU Bakersfield at San Diego | ",
 "Upcoming Dec 31, 1:00 PM Men's · CSU Bakersfield at Utah Valley | ",
 "Upcoming Jan 2, 7:00 PM Men's · CSU Bakersfield at Sacramento State | ",
 "Upcoming Jan 7, 6:30 PM Men's · CSU Bakersfield vs UC Riverside | ",
 "Upcoming Jan 9, 2:00 PM Men's · CSU Bakersfield vs California Baptist | ",
 "Upcoming Jan 14, 7:00 PM Men's · CSU Bakersfield at Cal State Fullerton | ",
 "Upcoming Jan 16 Men's · CSU Bakersfield at Long Beach State | ",
 "Upcoming Jan 21, 7:00 PM Men's · CSU Bakersfield at Cal Poly | ",
 "Upcoming Jan 23, 6:00 PM Men's · CSU Bakersfield at UC Santa Barbara | ",
 "Upcoming Jan 28, 8:00 PM Men's · CSU Bakersfield vs Sacramento State | ",
 "Upcoming Jan 30, 2:00 PM Men's · CSU Bakersfield vs Utah Valley | ",
 "Upcoming Feb 4, 7:00 PM Men's · CSU Bakersfield at UC Irvine | ",
 "Upcoming Feb 6, 6:00 PM Men's · CSU Bakersfield at UC San Diego | ",
 "Upcoming Feb 11, 6:30 PM Men's · CSU Bakersfield vs Long Beach State | ",
 "Upcoming Feb 13, 6:30 PM Men's · CSU Bakersfield vs Cal State Fullerton | ",
 "Upcoming Feb 18, 11:00 AM Men's · CSU Bakersfield vs Cal Poly | ",
 "Upcoming Feb 20, 5:00 PM Men's · CSU Bakersfield at CSUN | ",
 "Upcoming Feb 25, 7:00 PM Men's · CSU Bakersfield at California Baptist | ",
 "Upcoming Feb 27, 5:00 PM Men's · CSU Bakersfield at UC Riverside | ",
 "Upcoming Mar 4, 6:30 PM Men's · CSU Bakersfield vs UC San Diego | ",
 "Upcoming Mar 6, 2:00 PM Men's · CSU Bakersfield vs UC Irvine | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 11:00 AM Women's · CSU Bakersfield vs Stan State | ",
 "Upcoming Nov 12, 7:00 PM Women's · CSU Bakersfield at Washington | ",
 "Upcoming Nov 18, 6:30 PM Women's · CSU Bakersfield vs Utah Tech | ",
 "Upcoming Nov 22, 2:00 PM Women's · CSU Bakersfield at San Francisco | ",
 "Upcoming Nov 28, 1:30 PM Women's · CSU Bakersfield at Arizona State | ",
 "Upcoming Nov 29, 9:00 AM Women's · CSU Bakersfield vs Quinnipiac | ",
 "Upcoming Dec 3 Women's · CSU Bakersfield at UC Santa Barbara | ",
 "Upcoming Dec 5, 2:00 PM Women's · CSU Bakersfield at CSUN | ",
 "Upcoming Dec 8, 11:00 AM Women's · CSU Bakersfield vs Omaha | ",
 "Upcoming Dec 11 Women's · CSU Bakersfield at UCLA | ",
 "Upcoming Dec 14, 6:30 PM Women's · CSU Bakersfield vs UTEP | ",
 "Upcoming Dec 19, 2:00 PM Women's · CSU Bakersfield vs San Jose State | ",
 "Upcoming Dec 31, 5:00 PM Women's · CSU Bakersfield vs Utah Valley | ",
 "Upcoming Jan 2, 2:00 PM Women's · CSU Bakersfield vs Sacramento State | ",
 "Upcoming Jan 7 Women's · CSU Bakersfield at UC Riverside | ",
 "Upcoming Jan 9, 1:00 PM Women's · CSU Bakersfield at California Baptist | ",
 "Upcoming Jan 14, 6:30 PM Women's · CSU Bakersfield vs Cal State Fullerton | ",
 "Upcoming Jan 16, 2:00 PM Women's · CSU Bakersfield vs Long Beach State | ",
 "Upcoming Jan 21, 6:30 PM Women's · CSU Bakersfield vs Cal Poly | ",
 "Upcoming Jan 23, 2:00 PM Women's · CSU Bakersfield vs UC Santa Barbara | ",
 "Upcoming Jan 28, 6:30 PM Women's · CSU Bakersfield at Sacramento State | ",
 "Upcoming Jan 30, 1:00 PM Women's · CSU Bakersfield at Utah Valley | ",
 "Upcoming Feb 4, 6:30 PM Women's · CSU Bakersfield vs UC Irvine | ",
 "Upcoming Feb 6, 2:00 PM Women's · CSU Bakersfield vs UC San Diego | ",
 "Upcoming Feb 11, 2:00 PM Women's · CSU Bakersfield at Long Beach State | ",
 "Upcoming Feb 13, 2:00 PM Women's · CSU Bakersfield at Cal State Fullerton | ",
 "Upcoming Feb 18, 6:00 PM Women's · CSU Bakersfield at Cal Poly | ",
 "Upcoming Feb 20, 2:00 PM Women's · CSU Bakersfield vs CSUN | ",
 "Upcoming Feb 25, 6:30 PM Women's · CSU Bakersfield vs California Baptist | ",
 "Upcoming Feb 27, 2:00 PM Women's · CSU Bakersfield vs UC Riverside | ",
 "Upcoming Mar 4, 6:00 PM Women's · CSU Bakersfield at UC San Diego | ",
 "Upcoming Mar 6, 2:00 PM Women's · CSU Bakersfield at UC Irvine | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 CSU Bakersfield at Waves Invitational | 3rd of 5",
 "Final Oct 3 CSU Bakersfield at Master's Invitational | 14th of 21",
 "Final Oct 17 CSU Bakersfield at Bronco Invitational | 22nd of 23",
 "Upcoming Oct 31, 9:15 AM CSU Bakersfield at Big West Championships | ",
 "Upcoming Nov 13 CSU Bakersfield at NCAA West Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 CSU Bakersfield at UNC Bear Crawl | 4th of 6",
 "Final Sep 14 CSU Bakersfield at Wolverine Invitational | 6th of 10",
 "Final Sep 21 CSU Bakersfield at Kalispel Invitational | 6th of 14",
 "Upcoming Oct 25 CSU Bakersfield at Clash at Boulder Creek | ",
 "Upcoming Feb 1 CSU Bakersfield at Battle at Bentwater | ",
 "Upcoming Feb 8 CSU Bakersfield at Ventura Harbor Collegiate | ",
 "Upcoming Mar 2 CSU Bakersfield at GCU Invitational | ",
 "Upcoming Mar 8 CSU Bakersfield at Fresno State Classic | ",
 "Upcoming Mar 14 CSU Bakersfield at MSU SoCal Invitational | ",
 "Upcoming Apr 18 CSU Bakersfield at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · CSU Bakersfield at San Francisco | L, 0-4",
 "Final Aug 23 Women's · CSU Bakersfield vs Idaho State | L, 0-2",
 "Final Aug 27 Women's · CSU Bakersfield at Idaho | L, 0-1",
 "Final Aug 30 Women's · CSU Bakersfield at Eastern Washington | L, 0-2",
 "Final Sep 3 Women's · CSU Bakersfield vs Texas A&M - CC | W, 2-1",
 "Final Sep 6 Women's · CSU Bakersfield at San Diego | L, 0-1",
 "Final Sep 10 Women's · CSU Bakersfield vs Boise State | L, 0-2",
 "Final Sep 13 Women's · CSU Bakersfield at Pacific | L, 0-1",
 "Final Sep 20 Women's · CSU Bakersfield at Fresno State | T, 2-2",
 "Final Sep 23 Women's · CSU Bakersfield at Utah Valley | L, 1-7",
 "Final Sep 26 Women's · CSU Bakersfield at UC Irvine | L, 0-2",
 "Final Sep 30 Women's · CSU Bakersfield vs UC Santa Barbara | L, 0-1",
 "Final Oct 3 Women's · CSU Bakersfield vs CSUN | L, 1-4",
 "Final Oct 10 Women's · CSU Bakersfield at Sacramento State | L, 0-2",
 "Final Oct 14 Women's · CSU Bakersfield vs UC Riverside | W, 2-1",
 "Final Oct 17 Women's · CSU Bakersfield vs Cal Poly | T, 0-0",
 "Final Oct 21 Women's · CSU Bakersfield at Cal State Fullerton | L, 0-3",
 "Upcoming Oct 24, 7:00 PM Women's · CSU Bakersfield at California Baptist | ",
 "Upcoming Oct 28, 7:00 PM Women's · CSU Bakersfield vs UC San Diego | ",
 "Upcoming Oct 31, 1:00 PM Women's · CSU Bakersfield at Long Beach State | ",
 "Upcoming Nov 4 Women's · CSU Bakersfield vs Big West First Round | ",
 "Upcoming Nov 7 Women's · CSU Bakersfield at Big West Semifinal | ",
 "Upcoming Nov 13 Women's · CSU Bakersfield at Big West Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · CSU Bakersfield vs Utah Tech | W, 1-0",
 "Final Aug 24 Men's · CSU Bakersfield at UCLA | T, 1-1",
 "Final Aug 29 Men's · CSU Bakersfield vs UNLV | L, 1-2",
 "Final Sep 5 Men's · CSU Bakersfield at San Diego State | T, 2-2",
 "Final Sep 12 Men's · CSU Bakersfield vs Gonzaga | L, 0-1",
 "Final Sep 16 Men's · CSU Bakersfield at Cal Poly | W, 3-2",
 "Final Sep 20 Men's · CSU Bakersfield vs San Francisco | W, 2-1",
 "Final Sep 30 Men's · CSU Bakersfield at CSUN | T, 2-2",
 "Final Oct 3 Men's · CSU Bakersfield at Sacramento State | T, 2-2",
 "Final Oct 7 Men's · CSU Bakersfield vs UC Santa Barbara | T, 0-0",
 "Final Oct 10 Men's · CSU Bakersfield vs UC Irvine | T, 0-0",
 "Final Oct 14 Men's · CSU Bakersfield at Oregon State | W, 1-0",
 "Final Oct 17 Men's · CSU Bakersfield at UC San Diego | L, 2-4",
 "Final Oct 21 Men's · CSU Bakersfield vs UC Riverside | T, 2-2",
 "Upcoming Oct 24, 7:00 PM Men's · CSU Bakersfield at Cal State Fullerton | ",
 "Upcoming Oct 31, 7:00 PM Men's · CSU Bakersfield vs Utah Valley | ",
 "Upcoming Nov 7 Men's · CSU Bakersfield at Big West Championship Semifinal | ",
 "Upcoming Nov 13 Men's · CSU Bakersfield at Big West Championship Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 25 Women's · CSU Bakersfield vs The Master's | W, 165-77",
 "Final Oct 2 Women's · CSU Bakersfield at PAC Invite | Completed",
 "Final Oct 3 Women's · CSU Bakersfield vs Claremont-Mudd-Scripps (Dive only) | Completed",
 "Upcoming Oct 23, 6:00 PM Women's · CSU Bakersfield at Fresno State | ",
 "Upcoming Nov 6, 3:00 PM Women's · CSU Bakersfield vs Saint Mary's | ",
 "Upcoming Nov 6, 3:00 PM Women's · CSU Bakersfield vs Biola (dive only) | ",
 "Upcoming Nov 19 Women's · CSU Bakersfield at NW Collegiate Invite | ",
 "Upcoming Dec 17 Women's · CSU Bakersfield vs UC Santa Barbara | ",
 "Upcoming Dec 18, 3:00 PM Women's · CSU Bakersfield at San Diego State | ",
 "Upcoming Dec 19, 11:00 AM Women's · CSU Bakersfield at UC San Diego | ",
 "Upcoming Dec 19, 11:00 AM Women's · CSU Bakersfield vs San Diego | ",
 "Upcoming Jan 22, 5:00 PM Women's · CSU Bakersfield at Pacific | ",
 "Upcoming Jan 22, 5:00 PM Women's · CSU Bakersfield at Simon Fraser | ",
 "Upcoming Feb 5 Women's · CSU Bakersfield at Seattle U | ",
 "Upcoming Feb 16 Women's · CSU Bakersfield at MPSF Diving Championships | ",
 "Upcoming Feb 17 Women's · CSU Bakersfield at MPSF Championships | ",
 "Upcoming Mar 8 Women's · CSU Bakersfield at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 11 Women's · CSU Bakersfield at National Invitational Championships | ",
 "Upcoming Mar 17 Women's · CSU Bakersfield at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 25 Men's · CSU Bakersfield vs The Master's | W, 183-60",
 "Final Oct 2 Men's · CSU Bakersfield at PAC Invite | Completed",
 "Final Oct 3 Men's · CSU Bakersfield vs Claremont-Mudd-Scripps (Dive only) | Completed",
 "Upcoming Oct 29, 5:00 PM Men's · CSU Bakersfield at UNLV | ",
 "Upcoming Nov 6, 3:00 PM Men's · CSU Bakersfield vs Saint Mary's | ",
 "Upcoming Nov 6, 3:00 PM Men's · CSU Bakersfield vs Biola (dive only) | ",
 "Upcoming Nov 19 Men's · CSU Bakersfield at NW Collegiate Invite | ",
 "Upcoming Dec 17 Men's · CSU Bakersfield vs UC Santa Barbara | ",
 "Upcoming Dec 19, 11:00 AM Men's · CSU Bakersfield at UC San Diego | ",
 "Upcoming Dec 19, 11:00 AM Men's · CSU Bakersfield vs San Diego | ",
 "Upcoming Jan 22, 5:00 PM Men's · CSU Bakersfield at Pacific | ",
 "Upcoming Jan 22, 5:00 PM Men's · CSU Bakersfield at Simon Fraser | ",
 "Upcoming Feb 5 Men's · CSU Bakersfield at Seattle U | ",
 "Upcoming Feb 16 Men's · CSU Bakersfield at MPSF Diving Championships | ",
 "Upcoming Feb 22 Men's · CSU Bakersfield at MPSF Championships | ",
 "Upcoming Mar 8 Men's · CSU Bakersfield at Zone E Diving Championships | ",
 "Upcoming Mar 11 Men's · CSU Bakersfield at National Invitational Championships | ",
 "Upcoming Mar 24 Men's · CSU Bakersfield at NCAA Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Dec 5 CSU Bakersfield at Silver State Invitational | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 CSU Bakersfield vs Lamar | W, 3-0",
 "Final Aug 28 CSU Bakersfield vs North Texas | L, 1-3",
 "Final Aug 29 CSU Bakersfield at Abilene Christian | W, 3-1",
 "Final Sep 1 CSU Bakersfield at San Francisco | L, 0-3",
 "Final Sep 4 CSU Bakersfield vs Weber State | L, 1-3",
 "Final Sep 5 CSU Bakersfield vs Weber State | W, 3-2",
 "Final Sep 12 CSU Bakersfield at Santa Clara | L, 2-3",
 "Final Sep 13 CSU Bakersfield vs San Diego State | L, 1-3",
 "Final Sep 15 CSU Bakersfield at Saint Mary's | W, 3-2",
 "Final Sep 17 CSU Bakersfield vs Portland | L, 1-3",
 "Final Sep 18 CSU Bakersfield at Eastern Washington | W, 3-2",
 "Final Sep 19 CSU Bakersfield vs Nevada | L, 2-3",
 "Final Sep 25 CSU Bakersfield at Cal Poly | L, 0-3",
 "Final Sep 26 CSU Bakersfield at UC Santa Barbara | L, 0-3",
 "Final Oct 2 CSU Bakersfield vs Cal State Fullerton | W, 3-0",
 "Final Oct 3 CSU Bakersfield vs Long Beach State | L, 0-3",
 "Final Oct 9 CSU Bakersfield at California Baptist | W, 3-0",
 "Final Oct 10 CSU Bakersfield at UC Riverside | W, 3-2",
 "Final Oct 16 CSU Bakersfield vs UC Irvine | L, 1-3",
 "Final Oct 17 CSU Bakersfield vs UC San Diego | W, 3-1",
 "Upcoming Oct 23, 6:00 PM CSU Bakersfield at CSUN | ",
 "Upcoming Oct 24, 6:00 PM CSU Bakersfield vs CSUN | ",
 "Upcoming Oct 30, 7:00 PM CSU Bakersfield at Long Beach State | ",
 "Upcoming Oct 31, 2:00 PM CSU Bakersfield at Cal State Fullerton | ",
 "Upcoming Nov 6, 6:00 PM CSU Bakersfield vs UC Riverside | ",
 "Upcoming Nov 7, 6:00 PM CSU Bakersfield vs California Baptist | ",
 "Upcoming Nov 13, 6:00 PM CSU Bakersfield at UC San Diego | ",
 "Upcoming Nov 14, 5:00 PM CSU Bakersfield at UC Irvine | ",
 "Upcoming Nov 19, 11:00 AM CSU Bakersfield vs Utah Valley | ",
 "Upcoming Nov 20, 6:00 PM CSU Bakersfield vs Sacramento State | ",
 "Upcoming Nov 25 CSU Bakersfield at Big West Championship First Round | ",
 "Upcoming Nov 27 CSU Bakersfield at Big West Championship Semifinal | ",
 "Upcoming Nov 28 CSU Bakersfield at Big West Championship Final | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 1:00 PM CSU Bakersfield at American | ",
 "Upcoming Nov 1, 3:00 PM CSU Bakersfield at Central Michigan | ",
 "Upcoming Nov 7 CSU Bakersfield at Menlo Open | ",
 "Upcoming Nov 13, 6:30 PM CSU Bakersfield vs Stanford | ",
 "Upcoming Nov 14, 6:30 PM CSU Bakersfield vs Michigan State | ",
 "Upcoming Nov 22 CSU Bakersfield vs Roadrunner Open | ",
 "Upcoming Dec 4 CSU Bakersfield at Cliff Keen Invitational | ",
 "Upcoming Dec 19, 8:00 AM CSU Bakersfield at Northern Illinois | ",
 "Upcoming Jan 8 CSU Bakersfield at NWCA National Duals | ",
 "Upcoming Jan 17, 6:30 PM CSU Bakersfield vs Little Rock | ",
 "Upcoming Jan 22, 6:30 PM CSU Bakersfield vs North Dakota State | ",
 "Upcoming Jan 24, 2:00 PM CSU Bakersfield vs South Dakota State | ",
 "Upcoming Jan 31, 2:00 PM CSU Bakersfield at Oregon State | ",
 "Upcoming Feb 7, 6:00 PM CSU Bakersfield at Air Force | ",
 "Upcoming Feb 14, 11:00 AM CSU Bakersfield at Northern Colorado | ",
 "Upcoming Feb 24, 6:30 PM CSU Bakersfield vs Cal Poly | ",
 "Upcoming Mar 5 CSU Bakersfield at Pac-12 Championships | ",
 "Upcoming Mar 18 CSU Bakersfield at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("CSU Bakersfield module checks passed");
