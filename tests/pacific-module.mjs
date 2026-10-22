import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pacificSchool} from '../src/schools/pacific.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='pacific');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,pacificHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/pacific-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit pacifictigers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['pacific'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',pacificSchool.scheduleUrls],['roster',pacificSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('pacific|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'pacifictigers.com',`${key} must stay on pacifictigers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://pacifictigers.com/sports/baseball/schedule"],"roster":["https://pacifictigers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://pacifictigers.com/sports/womens-basketball/schedule","https://pacifictigers.com/sports/mens-basketball/schedule"],"roster":["https://pacifictigers.com/sports/womens-basketball/roster","https://pacifictigers.com/sports/mens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://pacifictigers.com/sports/womens-beach-volleyball/schedule"],"roster":["https://pacifictigers.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://pacifictigers.com/sports/womens-cross-country/schedule","https://pacifictigers.com/sports/mens-cross-country/schedule"],"roster":["https://pacifictigers.com/sports/womens-cross-country/roster","https://pacifictigers.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://pacifictigers.com/sports/mens-golf/schedule"],"roster":["https://pacifictigers.com/sports/mens-golf/roster"],"combined":false},"STUNT":{"schedule":["https://pacifictigers.com/sports/stunt/schedule"],"roster":["https://pacifictigers.com/sports/stunt/roster"],"combined":false},"Soccer":{"schedule":["https://pacifictigers.com/sports/womens-soccer/schedule","https://pacifictigers.com/sports/mens-soccer/schedule"],"roster":["https://pacifictigers.com/sports/womens-soccer/roster","https://pacifictigers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://pacifictigers.com/sports/softball/schedule"],"roster":["https://pacifictigers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://pacifictigers.com/sports/womens-swimming-and-diving/schedule","https://pacifictigers.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://pacifictigers.com/sports/womens-swimming-and-diving/roster","https://pacifictigers.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://pacifictigers.com/sports/womens-tennis/schedule","https://pacifictigers.com/sports/mens-tennis/schedule"],"roster":["https://pacifictigers.com/sports/womens-tennis/roster","https://pacifictigers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://pacifictigers.com/sports/womens-track-and-field/schedule","https://pacifictigers.com/sports/mens-track/schedule"],"roster":["https://pacifictigers.com/sports/womens-track-and-field/roster","https://pacifictigers.com/sports/mens-track/roster"],"combined":true},"Volleyball":{"schedule":["https://pacifictigers.com/sports/womens-volleyball/schedule","https://pacifictigers.com/sports/mens-volleyball/schedule"],"roster":["https://pacifictigers.com/sports/womens-volleyball/roster","https://pacifictigers.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://pacifictigers.com/sports/womens-water-polo/schedule","https://pacifictigers.com/sports/mens-water-polo/schedule"],"roster":["https://pacifictigers.com/sports/womens-water-polo/roster","https://pacifictigers.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'pacific|"+sport+"':"),`${sport} routes must live in the Pacific module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://pacifictigers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.pacificHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=pacific)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Pacific vs Simpson | ",
 "Upcoming Nov 5, 7:00 PM Women's · Pacific at Washington | ",
 "Upcoming Nov 13, 5:00 PM Women's · Pacific at California Baptist | ",
 "Upcoming Nov 15, 2:00 PM Women's · Pacific at Cal State Fullerton | ",
 "Upcoming Nov 20, 11:00 AM Women's · Pacific at Sacramento State | ",
 "Upcoming Nov 25 Women's · Pacific at Texas State | ",
 "Upcoming Nov 27 Women's · Pacific vs UTEP | ",
 "Upcoming Nov 28 Women's · Pacific vs Bradley | ",
 "Upcoming Dec 2, 11:00 AM Women's · Pacific vs UC Davis | ",
 "Upcoming Dec 11, 6:00 PM Women's · Pacific vs San Diego State | ",
 "Upcoming Dec 14, 6:00 PM Women's · Pacific at UC San Diego | ",
 "Upcoming Dec 18, 5:00 PM Women's · Pacific vs Nevada | ",
 "Upcoming Dec 22, 2:00 PM Women's · Pacific vs Texas A&M - Corpus Christi | ",
 "Upcoming Dec 31, 2:00 PM Women's · Pacific vs Portland | ",
 "Upcoming Jan 2 Women's · Pacific at Denver | ",
 "Upcoming Jan 7, 6:00 PM Women's · Pacific vs Pepperdine | ",
 "Upcoming Jan 9, 2:00 PM Women's · Pacific vs San Francisco | ",
 "Upcoming Jan 14, 6:00 PM Women's · Pacific at San Diego | ",
 "Upcoming Jan 16, 7:00 PM Women's · Pacific at LMU | ",
 "Upcoming Jan 21, 6:00 PM Women's · Pacific vs Saint Mary's | ",
 "Upcoming Jan 23, 2:00 PM Women's · Pacific vs Santa Clara | ",
 "Upcoming Jan 28, 6:00 PM Women's · Pacific at Pepperdine | ",
 "Upcoming Jan 30, 4:00 PM Women's · Pacific vs LMU | ",
 "Upcoming Feb 4 Women's · Pacific at Saint Mary's | ",
 "Upcoming Feb 6, 2:00 PM Women's · Pacific vs Seattle U | ",
 "Upcoming Feb 11, 6:00 PM Women's · Pacific at San Francisco | ",
 "Upcoming Feb 13, 2:00 PM Women's · Pacific vs San Diego | ",
 "Upcoming Feb 18, 7:00 PM Women's · Pacific at Santa Clara | ",
 "Upcoming Feb 20, 4:00 PM Women's · Pacific vs Denver | ",
 "Upcoming Feb 25, 6:00 PM Women's · Pacific at Portland | ",
 "Upcoming Feb 27, 1:00 PM Women's · Pacific at Seattle U | ",
 "Upcoming Mar 5 Women's · Pacific at West Coast Conference Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3 Men's · Pacific vs Bethesda | ",
 "Upcoming Nov 7 Men's · Pacific at Bradley | ",
 "Upcoming Nov 11 Men's · Pacific at Long Beach State | ",
 "Upcoming Nov 14 Men's · Pacific vs Air Force | ",
 "Upcoming Nov 17 Men's · Pacific vs Pacific Union | ",
 "Upcoming Nov 21 Men's · Pacific vs Bradley | ",
 "Upcoming Nov 25 Men's · Pacific vs Jacksonville State | ",
 "Upcoming Nov 26 Men's · Pacific vs Omaha | ",
 "Upcoming Nov 27 Men's · Pacific vs UC Davis | ",
 "Upcoming Dec 2 Men's · Pacific at Nevada | ",
 "Upcoming Dec 6 Men's · Pacific at Stanford | ",
 "Upcoming Dec 12 Men's · Pacific vs Utah Valley | ",
 "Upcoming Dec 15 Men's · Pacific at New Mexico State | ",
 "Upcoming Dec 18 Men's · Pacific vs Southern | ",
 "Upcoming Dec 22 Men's · Pacific at Sacramento State | ",
 "Upcoming Dec 29 Men's · Pacific at Utah State | ",
 "Upcoming Jan 2 Men's · Pacific vs Santa Clara | ",
 "Upcoming Jan 6 Men's · Pacific at Portland | ",
 "Upcoming Jan 12 Men's · Pacific at LMU | ",
 "Upcoming Jan 16 Men's · Pacific vs Seattle U | ",
 "Upcoming Jan 20 Men's · Pacific at Saint Mary's | ",
 "Upcoming Jan 23 Men's · Pacific at Santa Clara | ",
 "Upcoming Jan 27 Men's · Pacific vs Denver | ",
 "Upcoming Jan 30 Men's · Pacific vs Pepperdine | ",
 "Upcoming Feb 3 Men's · Pacific vs San Diego | ",
 "Upcoming Feb 6 Men's · Pacific at San Francisco | ",
 "Upcoming Feb 10 Men's · Pacific vs Portland | ",
 "Upcoming Feb 13 Men's · Pacific at Denver | ",
 "Upcoming Feb 18 Men's · Pacific vs Saint Mary's | ",
 "Upcoming Feb 21 Men's · Pacific vs San Francisco | ",
 "Upcoming Feb 24 Men's · Pacific at San Diego | ",
 "Upcoming Feb 27 Men's · Pacific at Pepperdine | ",
 "Upcoming Mar 5 Men's · Pacific at West Coast Conference Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Pacific at USF Invitational | Completed",
 "Final Sep 18 Women's · Pacific at Saint Mary's Invitational | Completed",
 "Final Sep 19 Women's · Pacific at Riverside Invitational | Completed",
 "Final Oct 2 Women's · Pacific at Pacific Invitational | 3rd of 5",
 "Final Oct 17 Women's · Pacific at Bronco Invitational | Completed",
 "Upcoming Oct 30 Women's · Pacific at WCC Championships | ",
 "Upcoming Nov 13 Women's · Pacific at NCAA West Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Pacific at USF Invitational | Completed",
 "Final Sep 18 Men's · Pacific at Saint Mary's Invitational | Completed",
 "Final Sep 19 Men's · Pacific at Riverside Invitational | Completed",
 "Final Oct 2 Men's · Pacific at Pacific Invitational | 1st of 5",
 "Final Oct 17 Men's · Pacific at Bronco Invitational | Completed",
 "Upcoming Oct 30 Men's · Pacific at WCC Championships | ",
 "Upcoming Nov 13 Men's · Pacific at NCAA West Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Pacific at Vuori Invitational | 9th of 12",
 "Final Sep 21 Pacific at CDA National Reserve Invitational | 2nd of 16",
 "Final Sep 29 Pacific at Mark Simpson Invitational | 9th of 17",
 "Final Oct 12 Pacific at Visit Stockton Pacific Invitational | 1st of 18",
 "Final Oct 19 Pacific at Saint Mary's Invitational | Completed",
 "Upcoming Feb 4 Pacific at Amer Ari Invitational | ",
 "Upcoming Mar 1 Pacific at The Watney Invitational | ",
 "Upcoming Mar 8 Pacific at Lamkin Invitational | ",
 "Upcoming Mar 22 Pacific at Bruin Invitational | ",
 "Upcoming Mar 29 Pacific at Wyoming Cowboy Classic | ",
 "Upcoming Apr 19 Pacific at Chambers Bay Invitational | ",
 "Upcoming Apr 30 Pacific at WCC Championships | "
]);
  const v_stunt=parse("STUNT","stunt");
  assert.deepEqual(v_stunt.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Pacific at Sacramento State | L, 2-5",
 "Final Aug 20 Women's · Pacific vs Nevada | L, 1-2",
 "Final Aug 27 Women's · Pacific at San Diego State | L, 0-7",
 "Final Aug 30 Women's · Pacific at UC San Diego | L, 0-2",
 "Final Sep 3 Women's · Pacific vs Weber State | L, 0-1",
 "Final Sep 6 Women's · Pacific at UC Davis | L, 0-1",
 "Final Sep 10 Women's · Pacific vs Cal Poly | L, 1-4",
 "Final Sep 13 Women's · Pacific vs Cal State Bakersfield | W, 1-0",
 "Final Sep 17 Women's · Pacific at UNLV | L, 2-3",
 "Final Sep 26 Women's · Pacific vs LMU | L, 0-1",
 "Final Oct 2 Women's · Pacific at Portland | T, 1-1",
 "Final Oct 7 Women's · Pacific at Santa Clara | L, 1-2",
 "Final Oct 10 Women's · Pacific vs Seattle | L, 1-2",
 "Final Oct 17 Women's · Pacific at San Francisco | T, 1-1",
 "Upcoming Oct 24, 7:00 PM Women's · Pacific vs Pepperdine | ",
 "Upcoming Oct 28, 6:00 PM Women's · Pacific vs Saint Mary's | ",
 "Upcoming Oct 31, 2:00 PM Women's · Pacific at Denver | ",
 "Upcoming Nov 7, 1:00 PM Women's · Pacific vs San Diego | ",
 "Upcoming Nov 11 Women's · Pacific at West Coast Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Pacific at Utah Valley | L, 1-2",
 "Final Aug 23 Men's · Pacific at Utah Tech | W, 3-2",
 "Final Aug 27 Men's · Pacific vs UC Davis | T, 3-3",
 "Final Aug 30 Men's · Pacific vs UC Irvine | L, 0-3",
 "Final Sep 5 Men's · Pacific at UC San Diego | L, 0-1",
 "Final Sep 10 Men's · Pacific at San Jose State | T, 2-2",
 "Final Sep 13 Men's · Pacific vs CSUN | L, 1-3",
 "Final Sep 17 Men's · Pacific at Sacramento State | L, 2-4",
 "Final Sep 20 Men's · Pacific at Cal Baptist | L, 0-2",
 "Final Sep 25 Men's · Pacific vs California | L, 0-3",
 "Final Sep 30 Men's · Pacific vs Seattle | T, 3-3",
 "Final Oct 3 Men's · Pacific vs Santa Clara | W, 2-1",
 "Final Oct 10 Men's · Pacific at Saint Mary's | W, 2-1",
 "Final Oct 17 Men's · Pacific vs San Diego | L, 0-3",
 "Final Oct 21 Men's · Pacific at San Francisco | L, 0-2",
 "Upcoming Oct 24, 2:00 PM Men's · Pacific at Denver | ",
 "Upcoming Oct 31, 7:00 PM Men's · Pacific vs Portland | ",
 "Upcoming Nov 6, 6:00 PM Men's · Pacific at LMU | ",
 "Upcoming Nov 11 Men's · Pacific at West Coast Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:30 PM Pacific vs Stanislaus State | ",
 "Upcoming Oct 30, 5:00 PM Pacific vs Cal State East Bay | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Pacific at PAC Invite | Completed",
 "Upcoming Oct 31 Women's · Pacific at San Jose State | ",
 "Upcoming Oct 31 Women's · Pacific at UC Santa Cruz | ",
 "Upcoming Nov 7 Women's · Pacific at Seattle | ",
 "Upcoming Dec 14 Women's · Pacific at UNLV Invite | ",
 "Upcoming Jan 8 Women's · Pacific at Saint Mary's | ",
 "Upcoming Jan 8 Women's · Pacific at Denver | ",
 "Upcoming Jan 17, 11:00 AM Women's · Pacific vs UC Santa Barbara | ",
 "Upcoming Jan 17, 11:00 AM Women's · Pacific vs UC Davis | ",
 "Upcoming Jan 22, 5:00 PM Women's · Pacific vs Simon Fraser | ",
 "Upcoming Jan 23, 10:00 AM Women's · Pacific vs Cal State Bakersfield | ",
 "Upcoming Feb 16 Women's · Pacific at MPSF Diving Championships | ",
 "Upcoming Feb 17 Women's · Pacific at MPSF Swimming Championships | ",
 "Upcoming Mar 11 Women's · Pacific at National Invitational Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Pacific at PAC Invite | Completed",
 "Upcoming Oct 31 Men's · Pacific at San Jose State | ",
 "Upcoming Oct 31 Men's · Pacific at UC Santa Cruz | ",
 "Upcoming Nov 7 Men's · Pacific at Seattle | ",
 "Upcoming Dec 14 Men's · Pacific at UNLV Invite | ",
 "Upcoming Jan 8 Men's · Pacific at Saint Mary's | ",
 "Upcoming Jan 8 Men's · Pacific at Denver | ",
 "Upcoming Jan 17, 11:00 AM Men's · Pacific vs UC Santa Barbara | ",
 "Upcoming Jan 17, 11:00 AM Men's · Pacific vs UC Davis | ",
 "Upcoming Jan 22, 5:00 PM Men's · Pacific vs Simon Fraser | ",
 "Upcoming Jan 23, 10:00 AM Men's · Pacific vs Cal State Bakersfield | ",
 "Upcoming Feb 16 Men's · Pacific at MPSF Diving Championships | ",
 "Upcoming Feb 22 Men's · Pacific at MPSF Swimming Championships | ",
 "Upcoming Mar 11 Men's · Pacific at National Invitational Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Pacific at Central Valley Clash | Completed",
 "Final Oct 8 Women's · Pacific at ITA Regionals | Completed",
 "Upcoming Oct 23 Women's · Pacific at Santa Clara Invitational | ",
 "Upcoming Nov 6 Women's · Pacific at CSUN Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Pacific at Sherwood Invite | Completed",
 "Final Sep 25 Men's · Pacific at UC Davis Invite | Completed",
 "Final Oct 2 Men's · Pacific at Saint Mary's Invite | Completed",
 "Final Oct 2 Men's · Pacific at Battle in the Bay | Completed",
 "Final Oct 15 Men's · Pacific at Northwest Regional Championship | Completed",
 "Upcoming Oct 30 Men's · Pacific at Pacific Invite | ",
 "Upcoming Nov 5 Men's · Pacific at Intercollegiate Championships | ",
 "Upcoming Nov 5 Men's · Pacific at Sectional Championships | ",
 "Upcoming Nov 5 Men's · Pacific at Conference Masters | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrack=parse("Track & Field","mens-track");
  assert.deepEqual(v_menstrack.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Pacific at California | L, 0-3",
 "Final Aug 29 Women's · Pacific vs Gonzaga | W, 3-1",
 "Final Aug 30 Women's · Pacific vs Southern Utah | W, 3-2",
 "Final Sep 3 Women's · Pacific vs UC Riverside | W, 3-2",
 "Final Sep 4 Women's · Pacific at San Jose State | L, 1-3",
 "Final Sep 5 Women's · Pacific vs LSU New Orleans | W, 3-1",
 "Final Sep 11 Women's · Pacific at UTEP | L, 0-3",
 "Final Sep 12 Women's · Pacific at New Mexico State | L, 0-3",
 "Final Sep 13 Women's · Pacific vs UC San Diego | L, 0-3",
 "Final Sep 17 Women's · Pacific at Idaho State | L, 0-3",
 "Final Sep 18 Women's · Pacific vs Boise State | L, 0-3",
 "Final Sep 19 Women's · Pacific vs Wyoming | L, 1-3",
 "Final Sep 24 Women's · Pacific at Denver | L, 0-3",
 "Final Sep 26 Women's · Pacific at San Diego | L, 0-3",
 "Final Oct 1 Women's · Pacific at Pepperdine | L, 0-3",
 "Final Oct 3 Women's · Pacific at LMU | L, 0-3",
 "Final Oct 8 Women's · Pacific vs Portland | L, 0-3",
 "Final Oct 10 Women's · Pacific vs Seattle U | L, 1-3",
 "Final Oct 15 Women's · Pacific at Santa Clara | L, 1-3",
 "Final Oct 17 Women's · Pacific at San Francisco | L, 1-3",
 "Today Oct 22, 6:00 PM Women's · Pacific vs San Diego | ",
 "Upcoming Oct 24, 1:00 PM Women's · Pacific vs Denver | ",
 "Upcoming Oct 31, 2:00 PM Women's · Pacific at Saint Mary's | ",
 "Upcoming Nov 5, 6:00 PM Women's · Pacific vs LMU | ",
 "Upcoming Nov 7, 12:00 PM Women's · Pacific vs Pepperdine | ",
 "Upcoming Nov 12, 6:00 PM Women's · Pacific at Seattle U | ",
 "Upcoming Nov 14, 1:00 PM Women's · Pacific at Portland | ",
 "Upcoming Nov 19, 6:00 PM Women's · Pacific vs San Francisco | ",
 "Upcoming Nov 21, 2:00 PM Women's · Pacific vs Santa Clara | ",
 "Upcoming Nov 28, 2:00 PM Women's · Pacific vs Saint Mary's | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Men's · Pacific vs Fordham | L, 14-15",
 "Final Aug 29 Men's · Pacific vs Iona | W, 21-9",
 "Final Aug 30 Men's · Pacific at Harvard | W, 12-11",
 "Final Aug 30 Men's · Pacific vs MIT | W, 22-5",
 "Final Sep 4 Men's · Pacific vs UCLA | L, 11-13",
 "Final Sep 11 Men's · Pacific at California | L, 7-18",
 "Final Sep 13 Men's · Pacific vs Stanford | L, 6-19",
 "Final Sep 25 Men's · Pacific at Long Beach State | W, 12-11",
 "Final Sep 27 Men's · Pacific at USC | L, 8-15",
 "Final Oct 9 Men's · Pacific at San Jose State | W, 13-10",
 "Final Oct 11 Men's · Pacific vs LMU | L, 11-12",
 "Final Oct 16 Men's · Pacific at UC Davis | L, 11-13",
 "Final Oct 17 Men's · Pacific at Saint Mary's | W, 15-11",
 "Final Oct 18 Men's · Pacific vs Princeton | L, 10-11",
 "Upcoming Oct 23, 11:20 AM Men's · Pacific vs Harvard | ",
 "Upcoming Oct 24, 11:40 AM Men's · Pacific vs Iona | ",
 "Upcoming Oct 24, 3:40 PM Men's · Pacific vs Bucknell | ",
 "Upcoming Nov 1, 12:00 PM Men's · Pacific at Air Force | ",
 "Upcoming Nov 6, 7:00 PM Men's · Pacific vs Santa Clara | ",
 "Upcoming Nov 8, 1:00 PM Men's · Pacific vs Pepperdine | ",
 "Upcoming Nov 13, 6:00 PM Men's · Pacific at UC Irvine | ",
 "Upcoming Nov 20 Men's · Pacific at WCC Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_stunt,"STUNT stunt");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrack,"Track & Field mens-track");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Pacific module checks passed");
