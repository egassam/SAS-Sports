import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {saintMarysSchool} from '../src/schools/saint-marys.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='saint-marys');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,saintMarysHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/saint-marys-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit smcgaels.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['saint-marys'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',saintMarysSchool.scheduleUrls],['roster',saintMarysSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('saint-marys|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'smcgaels.com',`${key} must stay on smcgaels.com`);
  }
}
const parity={"Baseball":{"schedule":["https://smcgaels.com/sports/baseball/schedule"],"roster":["https://smcgaels.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://smcgaels.com/sports/mens-basketball/schedule","https://smcgaels.com/sports/womens-basketball/schedule"],"roster":["https://smcgaels.com/sports/mens-basketball/roster","https://smcgaels.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://smcgaels.com/sports/womens-beach-volleyball/schedule"],"roster":["https://smcgaels.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://smcgaels.com/sports/womens-cross-country/schedule","https://smcgaels.com/sports/mens-cross-country/schedule"],"roster":["https://smcgaels.com/sports/womens-cross-country/roster","https://smcgaels.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://smcgaels.com/sports/mens-golf/schedule"],"roster":["https://smcgaels.com/sports/mens-golf/roster"],"combined":false},"Rowing":{"schedule":["https://smcgaels.com/sports/womens-rowing/schedule"],"roster":["https://smcgaels.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://smcgaels.com/sports/womens-soccer/schedule","https://smcgaels.com/sports/mens-soccer/schedule"],"roster":["https://smcgaels.com/sports/womens-soccer/roster","https://smcgaels.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://smcgaels.com/sports/softball/schedule"],"roster":["https://smcgaels.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://smcgaels.com/sports/swimming/schedule"],"roster":["https://smcgaels.com/sports/swimming/roster"],"combined":true},"Tennis":{"schedule":["https://smcgaels.com/sports/womens-tennis/schedule","https://smcgaels.com/sports/mens-tennis/schedule"],"roster":["https://smcgaels.com/sports/womens-tennis/roster","https://smcgaels.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://smcgaels.com/sports/womens-track-and-field/schedule","https://smcgaels.com/sports/track-and-field/schedule"],"roster":["https://smcgaels.com/sports/womens-track-and-field/roster","https://smcgaels.com/sports/track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://smcgaels.com/sports/womens-volleyball/schedule"],"roster":["https://smcgaels.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://smcgaels.com/sports/mens-water-polo/schedule"],"roster":["https://smcgaels.com/sports/mens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'saint-marys|"+sport+"':"),`${sport} routes must live in the Saint Mary's module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://smcgaels.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.saintMarysHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=saint-marys)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 17 Men's · Saint Mary's vs Utah State (Exb.) (Exhibition) | L, 89-97",
 "Upcoming Nov 2, 7:00 PM Men's · Saint Mary's vs Illinois State | ",
 "Upcoming Nov 4, 7:00 PM Men's · Saint Mary's vs North Dakota State | ",
 "Upcoming Nov 8, 1:30 PM Men's · Saint Mary's vs Nevada | ",
 "Upcoming Nov 13, 7:00 PM Men's · Saint Mary's vs UIC | ",
 "Upcoming Nov 16, 7:00 PM Men's · Saint Mary's vs Portland State | ",
 "Upcoming Nov 20, 8:00 PM Men's · Saint Mary's vs Saint Louis | ",
 "Upcoming Nov 22, 5:00 PM Men's · Saint Mary's vs Menlo College | ",
 "Upcoming Nov 26, 2:00 PM Men's · Saint Mary's vs UCLA | ",
 "Upcoming Nov 27 Men's · Saint Mary's vs Georgetown -OR- Texas | ",
 "Upcoming Dec 1, 6:30 PM Men's · Saint Mary's vs Hofstra | ",
 "Upcoming Dec 5, 12:15 PM Men's · Saint Mary's at Oklahoma State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Saint Mary's vs New Mexico State | ",
 "Upcoming Dec 12, 3:30 PM Men's · Saint Mary's at New Mexico | ",
 "Upcoming Dec 18, 7:00 PM Men's · Saint Mary's vs Iona | ",
 "Upcoming Dec 22, 6:00 PM Men's · Saint Mary's vs Harvard | ",
 "Upcoming Dec 29, 7:00 PM Men's · Saint Mary's vs Princeton | ",
 "Upcoming Jan 2, 7:00 PM Men's · Saint Mary's vs San Diego | ",
 "Upcoming Jan 6 Men's · Saint Mary's at Denver | ",
 "Upcoming Jan 13, 7:00 PM Men's · Saint Mary's vs Portland | ",
 "Upcoming Jan 16 Men's · Saint Mary's at Pepperdine | ",
 "Upcoming Jan 20, 8:00 PM Men's · Saint Mary's vs Pacific | ",
 "Upcoming Jan 23, 7:00 PM Men's · Saint Mary's vs LMU | ",
 "Upcoming Jan 27, 8:00 PM Men's · Saint Mary's at San Francisco | ",
 "Upcoming Jan 30, 7:00 PM Men's · Saint Mary's vs Santa Clara | ",
 "Upcoming Feb 3, 8:00 PM Men's · Saint Mary's at Portland | ",
 "Upcoming Feb 6, 8:30 PM Men's · Saint Mary's at Seattle U | ",
 "Upcoming Feb 9, 8:00 PM Men's · Saint Mary's vs San Francisco | ",
 "Upcoming Feb 13, 7:30 PM Men's · Saint Mary's at LMU | ",
 "Upcoming Feb 18, 7:30 PM Men's · Saint Mary's at Pacific | ",
 "Upcoming Feb 21, 5:00 PM Men's · Saint Mary's vs Pepperdine | ",
 "Upcoming Feb 24, 7:00 PM Men's · Saint Mary's vs Seattle U | ",
 "Upcoming Feb 27 Men's · Saint Mary's at Santa Clara | ",
 "Upcoming Mar 5 Men's · Saint Mary's at Credit Union One WCC Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30, 6:00 PM Women's · Saint Mary's vs UC Santa Cruz (Exhibition) | ",
 "Upcoming Nov 4, 7:00 PM Women's · Saint Mary's at Stanford | ",
 "Upcoming Nov 7, 1:00 PM Women's · Saint Mary's at Air Force | ",
 "Upcoming Nov 10, 6:00 PM Women's · Saint Mary's vs Chico State | ",
 "Upcoming Nov 13, 11:00 AM Women's · Saint Mary's vs Hawaii | ",
 "Upcoming Nov 15, 12:00 PM Women's · Saint Mary's vs Alabama A&M | ",
 "Upcoming Nov 23, 6:00 PM Women's · Saint Mary's vs SMU | ",
 "Upcoming Nov 25, 12:00 PM Women's · Saint Mary's vs Old Dominion | ",
 "Upcoming Nov 28, 4:00 PM Women's · Saint Mary's vs San Jose State | ",
 "Upcoming Dec 2, 6:00 PM Women's · Saint Mary's at New Mexico State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Saint Mary's at Fresno State | ",
 "Upcoming Dec 9, 2:00 PM Women's · Saint Mary's vs San Diego State | ",
 "Upcoming Dec 12, 1:00 PM Women's · Saint Mary's at Nevada | ",
 "Upcoming Dec 15, 6:00 PM Women's · Saint Mary's vs San Francisco State | ",
 "Upcoming Dec 22 Women's · Saint Mary's at Boise State | ",
 "Upcoming Dec 31 Women's · Saint Mary's at San Diego | ",
 "Upcoming Jan 2 Women's · Saint Mary's at LMU | ",
 "Upcoming Jan 7 Women's · Saint Mary's vs Santa Clara | ",
 "Upcoming Jan 9 Women's · Saint Mary's vs Pepperdine | ",
 "Upcoming Jan 14 Women's · Saint Mary's at San Francisco | ",
 "Upcoming Jan 16 Women's · Saint Mary's vs Seattle U | ",
 "Upcoming Jan 21 Women's · Saint Mary's at Pacific | ",
 "Upcoming Jan 23 Women's · Saint Mary's vs Denver | ",
 "Upcoming Jan 28 Women's · Saint Mary's at Portland | ",
 "Upcoming Jan 30 Women's · Saint Mary's at Seattle U | ",
 "Upcoming Feb 4 Women's · Saint Mary's vs Pacific | ",
 "Upcoming Feb 6 Women's · Saint Mary's at Santa Clara | ",
 "Upcoming Feb 11 Women's · Saint Mary's vs San Diego | ",
 "Upcoming Feb 13 Women's · Saint Mary's at Pepperdine | ",
 "Upcoming Feb 18 Women's · Saint Mary's vs Portland | ",
 "Upcoming Feb 20 Women's · Saint Mary's vs San Francisco | ",
 "Upcoming Feb 25 Women's · Saint Mary's at Denver | ",
 "Upcoming Feb 27 Women's · Saint Mary's vs LMU | ",
 "Upcoming Mar 5 Women's · Saint Mary's at Credit Union 1 WCC Basketball Championships | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 3 Women's · Saint Mary's at UCSB Gaucho Invitational | 3rd of 5",
 "Final Sep 18 Women's · Saint Mary's at Saint Mary's Invitational | 7th of 15",
 "Final Oct 2 Women's · Saint Mary's at Pacific Invitational | 4th of 5",
 "Final Oct 3 Women's · Saint Mary's at Charles Bowles Invitational | 7th of 25",
 "Final Oct 17 Women's · Saint Mary's at Bronco Invitational | 10th of 23",
 "Upcoming Oct 30 Women's · Saint Mary's at WCC Championships | ",
 "Upcoming Nov 13 Women's · Saint Mary's at NCAA West Regionals | ",
 "Upcoming Nov 21 Women's · Saint Mary's at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Saint Mary's at USF Invitational | 10th of 17",
 "Final Sep 18 Men's · Saint Mary's at Saint Mary's Invitational | 2nd of 13",
 "Final Oct 2 Men's · Saint Mary's at Pacific Invitational | 3rd of 5",
 "Final Oct 9 Men's · Saint Mary's at Bill Dellinger Invitational | 5th of 10",
 "Final Oct 17 Men's · Saint Mary's at Bronco Invitational | 20th of 22",
 "Upcoming Oct 30 Men's · Saint Mary's at WCC Championships | ",
 "Upcoming Nov 13 Men's · Saint Mary's at NCAA West Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Saint Mary's at Island Resort Intercollegiate | T4th of 12",
 "Final Sep 21 Saint Mary's at CDA National Reserve Invitational | 1st of 16",
 "Final Oct 12 Saint Mary's at Visit Stockton Invitational | 4th of 18",
 "Final Oct 19 Saint Mary's at Saint Mary's Invitational | T11th of 18",
 "Upcoming Oct 26 Saint Mary's at The Preserve Golf Club Collegiate | ",
 "Upcoming Feb 1 Saint Mary's at National Invitational Tournament | ",
 "Upcoming Feb 11 Saint Mary's at John Burns Intercollegiate | ",
 "Upcoming Mar 8 Saint Mary's at R.E.L. Lamkin Invitational | ",
 "Upcoming Mar 22 Saint Mary's at The Duck Invitational | ",
 "Upcoming Mar 29 Saint Mary's at Wyoming Cowboy Classic | ",
 "Upcoming Apr 5 Saint Mary's at Missouri Tiger Intercollegiate | ",
 "Upcoming Apr 19 Saint Mary's at Chambers Bay Invitational | ",
 "Upcoming Apr 30 Saint Mary's at WCC Men's Golf Championships | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Saint Mary's at Long Beach State | T, 0-0",
 "Final Aug 16 Women's · Saint Mary's vs Fresno State | W, 4-0",
 "Final Aug 20 Women's · Saint Mary's vs UC Davis | W, 3-0",
 "Final Aug 23 Women's · Saint Mary's vs Georgetown | T, 0-0",
 "Final Aug 30 Women's · Saint Mary's at USC | W, 1-0",
 "Final Sep 3 Women's · Saint Mary's vs Columbia | T, 0-0",
 "Final Sep 6 Women's · Saint Mary's vs Northern Arizona | W, 1-0",
 "Final Sep 10 Women's · Saint Mary's at Sacramento State | W, 3-2",
 "Final Sep 13 Women's · Saint Mary's at San Jose State | W, 2-0",
 "Final Sep 20 Women's · Saint Mary's at Utah State | T, 1-1",
 "Final Sep 26 Women's · Saint Mary's at Denver | L, 1-2",
 "Final Oct 2 Women's · Saint Mary's vs San Francisco | W, 3-0",
 "Final Oct 7 Women's · Saint Mary's vs LMU | L, 0-1",
 "Final Oct 10 Women's · Saint Mary's at Portland | W, 1-0",
 "Final Oct 17 Women's · Saint Mary's vs San Diego | W, 1-0",
 "Upcoming Oct 24, 1:00 PM Women's · Saint Mary's at Santa Clara | ",
 "Upcoming Oct 28, 6:00 PM Women's · Saint Mary's at Pacific | ",
 "Upcoming Oct 31, 1:00 PM Women's · Saint Mary's vs Seattle U | ",
 "Upcoming Nov 7, 1:00 PM Women's · Saint Mary's vs Pepperdine | ",
 "Upcoming Nov 11 Women's · Saint Mary's at West Coast Conference Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Saint Mary's at Wisconsin | L, 0-5",
 "Final Aug 23 Men's · Saint Mary's at Marquette | L, 0-2",
 "Final Aug 27 Men's · Saint Mary's vs Sacramento State | W, 2-1",
 "Final Aug 30 Men's · Saint Mary's at San Jose State | L, 2-4",
 "Final Sep 4 Men's · Saint Mary's vs Marist | L, 1-4",
 "Final Sep 7 Men's · Saint Mary's vs Air Force | T, 2-2",
 "Final Sep 10 Men's · Saint Mary's at Creighton | T, 3-3",
 "Final Sep 13 Men's · Saint Mary's at Omaha | W, 2-1",
 "Final Sep 19 Men's · Saint Mary's vs UC Davis | T, 2-2",
 "Final Sep 26 Men's · Saint Mary's vs San Francisco | T, 1-1",
 "Final Sep 30 Men's · Saint Mary's at Portland | L, 0-5",
 "Final Oct 3 Men's · Saint Mary's at Seattle U | L, 2-4",
 "Final Oct 10 Men's · Saint Mary's vs Pacific | L, 1-2",
 "Final Oct 14 Men's · Saint Mary's at Cal | L, 0-4",
 "Final Oct 17 Men's · Saint Mary's at Santa Clara | T, 0-0",
 "Final Oct 21 Men's · Saint Mary's vs Denver | L, 2-3",
 "Upcoming Oct 25, 1:00 PM Men's · Saint Mary's vs LMU | ",
 "Upcoming Nov 6, 7:00 PM Men's · Saint Mary's at San Diego | ",
 "Upcoming Nov 11 Men's · Saint Mary's at West Coast Conference Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_swimming=parse("Swimming & Diving","swimming");
  assert.deepEqual(v_swimming.map(line),[
 "Final Oct 2 Saint Mary's at PAC Invite | Completed",
 "Final Oct 9 Saint Mary's at UC Santa Barbara | Women's team: L, 69-226 / Men's team: L, 98-198",
 "Upcoming Oct 23, 3:00 PM Saint Mary's at UC Santa Cruz | ",
 "Upcoming Oct 24, 12:00 PM Saint Mary's at Cal | ",
 "Upcoming Nov 6 Saint Mary's at CSU Bakersfield | ",
 "Upcoming Nov 19 Saint Mary's at Northwest Collegiate Invite | ",
 "Upcoming Jan 2, 12:00 PM Saint Mary's at UC Davis | ",
 "Upcoming Jan 8 Saint Mary's vs Denver and Pacific | ",
 "Upcoming Jan 16, 12:00 PM Saint Mary's vs UC Santa Barbara | ",
 "Upcoming Jan 22 Saint Mary's at Seattle U | ",
 "Upcoming Feb 17 Saint Mary's at Women's MPSF Championships | ",
 "Upcoming Feb 22 Saint Mary's at Men's MPSF Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Saint Mary's at Cal Poly Invitational | Completed",
 "Final Oct 1 Women's · Saint Mary's at Battle in the Bay Classic | Completed",
 "Final Oct 8 Women's · Saint Mary's at ITA Northwest Regional Championships | Completed",
 "Upcoming Oct 29 Women's · Saint Mary's at Saint Mary's Fall Invitational | ",
 "Upcoming Oct 29 Women's · Saint Mary's at Jack Kramer Invitational | ",
 "Upcoming Nov 5 Women's · Saint Mary's at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · Saint Mary's at ITA West Sectional Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 25 Men's · Saint Mary's at Sherwood Collegiate Cup | Completed",
 "Final Sep 25 Men's · Saint Mary's at Aggie Invite | Completed",
 "Final Oct 1 Men's · Saint Mary's at Battle in the Bay Classic | Completed",
 "Final Oct 3 Men's · Saint Mary's at NorCal Invitational Shootout | Completed",
 "Final Oct 16 Men's · Saint Mary's at ITA Regionals | Completed",
 "Upcoming Oct 30 Men's · Saint Mary's at Pacific Invite | ",
 "Upcoming Nov 5 Men's · Saint Mary's at SoCal Intercollegiate | ",
 "Upcoming Nov 5 Men's · Saint Mary's at ITA West Sectionals | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Saint Mary's vs UC San Diego | L, 1-3",
 "Final Aug 29 Saint Mary's vs Southern Utah | W, 3-0",
 "Final Aug 30 Saint Mary's vs Cal | W, 3-2",
 "Final Sep 3 Saint Mary's vs Texas Tech | L, 1-3",
 "Final Sep 4 Saint Mary's vs Nevada | W, 3-0",
 "Final Sep 5 Saint Mary's at Sacramento State | L, 2-3",
 "Final Sep 10 Saint Mary's vs Eastern Washington | W, 3-0",
 "Final Sep 11 Saint Mary's at Boise State | L, 0-3",
 "Final Sep 12 Saint Mary's vs Sacramento State | L, 1-3",
 "Final Sep 15 Saint Mary's vs CSU Bakersfield | L, 2-3",
 "Final Sep 17 Saint Mary's vs New Mexico | W, 3-0",
 "Final Sep 19 Saint Mary's vs Fresno State | L, 2-3",
 "Final Sep 24 Saint Mary's at San Diego | W, 3-2",
 "Final Sep 26 Saint Mary's at Denver | W, 3-1",
 "Final Oct 1 Saint Mary's at LMU | L, 0-3",
 "Final Oct 3 Saint Mary's at Pepperdine | W, 3-1",
 "Final Oct 8 Saint Mary's vs Seattle U | W, 3-0",
 "Final Oct 10 Saint Mary's vs Portland | W, 3-1",
 "Final Oct 15 Saint Mary's at San Francisco | W, 3-2",
 "Final Oct 17 Saint Mary's at Santa Clara | W, 3-2",
 "Today Oct 22, 6:30 PM Saint Mary's vs Denver | ",
 "Upcoming Oct 24, 2:00 PM Saint Mary's vs San Diego | ",
 "Upcoming Oct 31, 2:00 PM Saint Mary's vs Pacific | ",
 "Upcoming Nov 5, 6:30 PM Saint Mary's vs Pepperdine | ",
 "Upcoming Nov 7, 2:00 PM Saint Mary's vs LMU | ",
 "Upcoming Nov 12, 6:00 PM Saint Mary's at Portland | ",
 "Upcoming Nov 14, 1:00 PM Saint Mary's at Seattle U | ",
 "Upcoming Nov 19, 6:30 PM Saint Mary's vs Santa Clara | ",
 "Upcoming Nov 21, 2:00 PM Saint Mary's vs San Francisco | ",
 "Upcoming Nov 28, 2:00 PM Saint Mary's at Pacific | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Saint Mary's vs UC Santa Barbara | L, 14-16",
 "Final Aug 28 Saint Mary's vs USC | L, 9-22",
 "Final Aug 29 Saint Mary's vs UCLA | L, 5-23",
 "Final Aug 29 Saint Mary's vs Long Beach State | L, 10-15",
 "Final Aug 30 Saint Mary's vs Bucknell | W, 12-9",
 "Final Aug 30 Saint Mary's vs Mercyhurst | W, 26-9",
 "Final Sep 6 Saint Mary's vs Whittier | W, 20-11",
 "Final Sep 11 Saint Mary's at Princeton | L, 8-15",
 "Final Sep 12 Saint Mary's vs Wagner | W, 19-11",
 "Final Sep 12 Saint Mary's vs Mount St. Mary's | W, 16-6",
 "Final Sep 13 Saint Mary's vs Bucknell | L, 9-14",
 "Final Sep 24 Saint Mary's at Cal | L, 8-22",
 "Final Sep 26 Saint Mary's vs Diablo Valley College (Exhib) (Exhibition) | W, 23-4",
 "Final Oct 3 Saint Mary's vs UC Santa Barbara | L, 8-14",
 "Final Oct 9 Saint Mary's vs LMU | L, 10-12",
 "Final Oct 16 Saint Mary's vs Air Force | W, 16-10",
 "Final Oct 17 Saint Mary's vs Pacific | L, 11-15",
 "Upcoming Oct 23, 10:00 AM Saint Mary's vs Bucknell | ",
 "Upcoming Oct 24, 3:40 PM Saint Mary's vs Pomona Pitzer | ",
 "Upcoming Oct 25, 8:00 AM Saint Mary's vs Harvard | ",
 "Upcoming Oct 30, 2:30 PM Saint Mary's at Santa Clara | ",
 "Upcoming Nov 1, 1:00 PM Saint Mary's at UC Davis | ",
 "Upcoming Nov 6, 6:30 PM Saint Mary's vs Pepperdine | ",
 "Upcoming Nov 8, 12:00 PM Saint Mary's at San Jose State | ",
 "Upcoming Nov 14, 12:00 PM Saint Mary's at UC San Diego | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimming,"Swimming & Diving swimming");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Saint Mary's module checks passed");
