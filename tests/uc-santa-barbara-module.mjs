import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ucSantaBarbaraSchool} from '../src/schools/uc-santa-barbara.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uc-santa-barbara');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ucSantaBarbaraHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uc-santa-barbara-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ucsbgauchos.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uc-santa-barbara'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',ucSantaBarbaraSchool.scheduleUrls],['roster',ucSantaBarbaraSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uc-santa-barbara|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ucsbgauchos.com',`${key} must stay on ucsbgauchos.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ucsbgauchos.com/sports/baseball/schedule"],"roster":["https://ucsbgauchos.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ucsbgauchos.com/sports/mens-basketball/schedule","https://ucsbgauchos.com/sports/womens-basketball/schedule"],"roster":["https://ucsbgauchos.com/sports/mens-basketball/roster","https://ucsbgauchos.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ucsbgauchos.com/sports/mens-cross-country/schedule","https://ucsbgauchos.com/sports/womens-cross-country/schedule"],"roster":["https://ucsbgauchos.com/sports/mens-cross-country/roster","https://ucsbgauchos.com/sports/womens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://ucsbgauchos.com/sports/mens-golf/schedule"],"roster":["https://ucsbgauchos.com/sports/mens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://ucsbgauchos.com/sports/womens-soccer/schedule","https://ucsbgauchos.com/sports/mens-soccer/schedule"],"roster":["https://ucsbgauchos.com/sports/womens-soccer/roster","https://ucsbgauchos.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://ucsbgauchos.com/sports/softball/schedule"],"roster":["https://ucsbgauchos.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ucsbgauchos.com/sports/womens-swimming-and-diving/schedule","https://ucsbgauchos.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://ucsbgauchos.com/sports/womens-swimming-and-diving/roster","https://ucsbgauchos.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://ucsbgauchos.com/sports/womens-tennis/schedule","https://ucsbgauchos.com/sports/mens-tennis/schedule"],"roster":["https://ucsbgauchos.com/sports/womens-tennis/roster","https://ucsbgauchos.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ucsbgauchos.com/sports/mens-track-and-field/schedule","https://ucsbgauchos.com/sports/womens-track-and-field/schedule"],"roster":["https://ucsbgauchos.com/sports/mens-track-and-field/roster","https://ucsbgauchos.com/sports/womens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://ucsbgauchos.com/sports/womens-volleyball/schedule","https://ucsbgauchos.com/sports/mens-volleyball/schedule"],"roster":["https://ucsbgauchos.com/sports/womens-volleyball/roster","https://ucsbgauchos.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://ucsbgauchos.com/sports/womens-water-polo/schedule","https://ucsbgauchos.com/sports/mens-water-polo/schedule"],"roster":["https://ucsbgauchos.com/sports/womens-water-polo/roster","https://ucsbgauchos.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uc-santa-barbara|"+sport+"':"),`${sport} routes must live in the UC Santa Barbara module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ucsbgauchos.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ucSantaBarbaraHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uc-santa-barbara)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Men's · UC Santa Barbara at LMU (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Men's · UC Santa Barbara vs San Francisco State | ",
 "Upcoming Nov 7, 1:00 PM Men's · UC Santa Barbara vs Oakland | ",
 "Upcoming Nov 11, 6:00 PM Men's · UC Santa Barbara vs Nevada | ",
 "Upcoming Nov 15, 1:00 PM Men's · UC Santa Barbara vs UC Merced | ",
 "Upcoming Nov 19 Men's · UC Santa Barbara at Pepperdine | ",
 "Upcoming Nov 24, 6:00 PM Men's · UC Santa Barbara vs UNC Greensboro | ",
 "Upcoming Nov 27, 4:00 PM Men's · UC Santa Barbara vs Lehigh | ",
 "Upcoming Dec 3, 6:30 PM Men's · UC Santa Barbara at Cal State Bakersfield | ",
 "Upcoming Dec 5, 6:00 PM Men's · UC Santa Barbara vs Cal Poly | ",
 "Upcoming Dec 12 Men's · UC Santa Barbara vs Yale | ",
 "Upcoming Dec 18, 6:00 PM Men's · UC Santa Barbara vs Weber State | ",
 "Upcoming Dec 22, 4:00 PM Men's · UC Santa Barbara at Fresno State | ",
 "Upcoming Dec 31, 6:00 PM Men's · UC Santa Barbara at California Baptist | ",
 "Upcoming Jan 2, 1:00 PM Men's · UC Santa Barbara at UC Riverside | ",
 "Upcoming Jan 7, 6:00 PM Men's · UC Santa Barbara vs Cal State Fullerton | ",
 "Upcoming Jan 9, 6:00 PM Men's · UC Santa Barbara vs Long Beach State | ",
 "Upcoming Jan 14, 5:00 PM Men's · UC Santa Barbara at Utah Valley | ",
 "Upcoming Jan 16, 7:00 PM Men's · UC Santa Barbara at Sacramento State | ",
 "Upcoming Jan 21, 6:00 PM Men's · UC Santa Barbara vs CSUN | ",
 "Upcoming Jan 23, 6:00 PM Men's · UC Santa Barbara vs Cal State Bakersfield | ",
 "Upcoming Jan 28, 6:00 PM Men's · UC Santa Barbara vs UC San Diego | ",
 "Upcoming Jan 30, 6:00 PM Men's · UC Santa Barbara vs UC Irvine | ",
 "Upcoming Feb 4, 7:00 PM Men's · UC Santa Barbara at Long Beach State | ",
 "Upcoming Feb 6, 4:00 PM Men's · UC Santa Barbara at Cal State Fullerton | ",
 "Upcoming Feb 11, 6:00 PM Men's · UC Santa Barbara vs UC Riverside | ",
 "Upcoming Feb 13, 6:00 PM Men's · UC Santa Barbara vs California Baptist | ",
 "Upcoming Feb 18, 7:00 PM Men's · UC Santa Barbara at CSUN | ",
 "Upcoming Feb 20, 4:00 PM Men's · UC Santa Barbara at Cal Poly | ",
 "Upcoming Feb 25, 7:00 PM Men's · UC Santa Barbara at UC Irvine | ",
 "Upcoming Feb 27, 6:00 PM Men's · UC Santa Barbara at UC San Diego | ",
 "Upcoming Mar 4, 6:00 PM Men's · UC Santa Barbara vs Sacramento State | ",
 "Upcoming Mar 6, 6:00 PM Men's · UC Santa Barbara vs Utah Valley | ",
 "Upcoming Mar 10 Men's · UC Santa Barbara at The Big West Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 28, 6:00 PM Women's · UC Santa Barbara at Stanford (Exhibition) | ",
 "Upcoming Nov 3, 6:00 PM Women's · UC Santa Barbara vs UC Santa Cruz | ",
 "Upcoming Nov 5, 6:00 PM Women's · UC Santa Barbara at Pepperdine | ",
 "Upcoming Nov 9, 6:00 PM Women's · UC Santa Barbara vs Seattle | ",
 "Upcoming Nov 14, 12:00 PM Women's · UC Santa Barbara vs California | ",
 "Upcoming Nov 17, 6:00 PM Women's · UC Santa Barbara vs California Lutheran | ",
 "Upcoming Nov 20, 6:00 PM Women's · UC Santa Barbara vs Utah Tech | ",
 "Upcoming Nov 25, 2:00 PM Women's · UC Santa Barbara at Portland | ",
 "Upcoming Nov 28, 12:00 PM Women's · UC Santa Barbara at Portland State | ",
 "Upcoming Dec 3, 6:00 PM Women's · UC Santa Barbara vs Cal State Bakersfield | ",
 "Upcoming Dec 5, 2:00 PM Women's · UC Santa Barbara at Cal Poly | ",
 "Upcoming Dec 13 Women's · UC Santa Barbara vs UNLV | ",
 "Upcoming Dec 19, 11:00 AM Women's · UC Santa Barbara at UTEP | ",
 "Upcoming Dec 31, 6:00 PM Women's · UC Santa Barbara vs California Baptist | ",
 "Upcoming Jan 2, 2:00 PM Women's · UC Santa Barbara vs UC Riverside | ",
 "Upcoming Jan 7, 7:00 PM Women's · UC Santa Barbara at Cal State Fullerton | ",
 "Upcoming Jan 9, 2:00 PM Women's · UC Santa Barbara at Long Beach State | ",
 "Upcoming Jan 14, 6:00 PM Women's · UC Santa Barbara vs Utah Valley | ",
 "Upcoming Jan 16, 1:00 PM Women's · UC Santa Barbara vs Sacramento State | ",
 "Upcoming Jan 21, 6:00 PM Women's · UC Santa Barbara at CSUN | ",
 "Upcoming Jan 23, 2:00 PM Women's · UC Santa Barbara at Cal State Bakersfield | ",
 "Upcoming Jan 28, 6:00 PM Women's · UC Santa Barbara at UC San Diego | ",
 "Upcoming Jan 30, 1:00 PM Women's · UC Santa Barbara at UC Irvine | ",
 "Upcoming Feb 4, 6:00 PM Women's · UC Santa Barbara vs Long Beach State | ",
 "Upcoming Feb 6, 2:00 PM Women's · UC Santa Barbara vs Cal State Fullerton | ",
 "Upcoming Feb 11, 6:00 PM Women's · UC Santa Barbara at UC Riverside | ",
 "Upcoming Feb 13, 1:00 PM Women's · UC Santa Barbara at California Baptist | ",
 "Upcoming Feb 18, 6:00 PM Women's · UC Santa Barbara vs CSUN | ",
 "Upcoming Feb 20, 2:00 PM Women's · UC Santa Barbara vs Cal Poly | ",
 "Upcoming Feb 25, 6:00 PM Women's · UC Santa Barbara vs UC Irvine | ",
 "Upcoming Feb 27, 2:00 PM Women's · UC Santa Barbara vs UC San Diego | ",
 "Upcoming Mar 4, 6:30 PM Women's · UC Santa Barbara at Sacramento State | ",
 "Upcoming Mar 6, 1:00 PM Women's · UC Santa Barbara at Utah Valley | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 3 Men's · UC Santa Barbara at Gaucho Twilight | 2nd of 5 (50 points)",
 "Final Sep 12 Men's · UC Santa Barbara at Kim Duyst Invite | 1st of 10 (41 points)",
 "Final Sep 25 Men's · UC Santa Barbara at Sean Earl Loyola Lakefront Invitational | 3rd of 4 (51 points)",
 "Final Oct 17 Men's · UC Santa Barbara at Highlander Invite | 10th of 16 (219 points)",
 "Upcoming Oct 31, 9:00 AM Men's · UC Santa Barbara at Big West Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 3 Women's · UC Santa Barbara at Gaucho Twilight | 2nd of 5 (49 points)",
 "Final Sep 12 Women's · UC Santa Barbara at Kim Duyst Invite | 2nd of 7 (33 points)",
 "Final Sep 25 Women's · UC Santa Barbara at Sean Earl Loyola Lakefront Invitational | 3rd of 8 (71 points)",
 "Final Oct 17 Women's · UC Santa Barbara at Highlander Invite | 1st of 20 (78 points)",
 "Upcoming Oct 31, 10:00 AM Women's · UC Santa Barbara at Big West Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 UC Santa Barbara at Ram Masters Invitational | Completed",
 "Final Sep 19 UC Santa Barbara at Gene Miranda Falcon Invitational | Completed",
 "Final Sep 25 UC Santa Barbara at William H. Tucker Invitational | Completed",
 "Final Oct 12 UC Santa Barbara at Visit Stockton Pacific Invitational | Completed",
 "Upcoming Feb 22, 8:30 AM UC Santa Barbara at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1, 8:00 AM UC Santa Barbara at The Watney Invitational | ",
 "Upcoming Mar 8, 8:00 AM UC Santa Barbara at R.E. Lamkin Invitational | ",
 "Upcoming Mar 22, 8:00 AM UC Santa Barbara at Admired Leadership Bruin Invitational | ",
 "Upcoming Apr 5, 9:00 AM UC Santa Barbara at Gaucho Invitational | ",
 "Upcoming Apr 10, 9:00 AM UC Santa Barbara at The Aggie Invitational | ",
 "Upcoming May 2, 11:00 AM UC Santa Barbara at Big West Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 8 Women's · UC Santa Barbara vs Trinity Western (Exhibition) | W, 2-0",
 "Final Aug 12 Women's · UC Santa Barbara vs LMU | W, 1-0",
 "Final Aug 20 Women's · UC Santa Barbara vs San Jose State | W, 1-0",
 "Final Aug 23 Women's · UC Santa Barbara vs Fresno State | W, 4-0",
 "Final Aug 27 Women's · UC Santa Barbara at California Baptist | L, 0-2",
 "Final Aug 30 Women's · UC Santa Barbara at UC Davis | T, 1-1",
 "Final Sep 3 Women's · UC Santa Barbara vs North Dakota | T, 2-2",
 "Final Sep 6 Women's · UC Santa Barbara vs North Dakota State | T, 3-3",
 "Final Sep 10 Women's · UC Santa Barbara at Idaho State | W, 3-1",
 "Final Sep 13 Women's · UC Santa Barbara at Weber State | W, 2-1",
 "Final Sep 23 Women's · UC Santa Barbara vs Long Beach State | T, 2-2",
 "Final Sep 26 Women's · UC Santa Barbara vs Sacramento State | W, 1-0",
 "Final Sep 30 Women's · UC Santa Barbara at Cal State Bakersfield | W, 1-0",
 "Final Oct 3 Women's · UC Santa Barbara at California Baptist | T, 0-0",
 "Final Oct 10 Women's · UC Santa Barbara at Cal State Fullerton | L, 0-5",
 "Final Oct 14 Women's · UC Santa Barbara vs UC Irvine | W, 1-0",
 "Final Oct 17 Women's · UC Santa Barbara vs UC San Diego | T, 1-1",
 "Final Oct 21 Women's · UC Santa Barbara at Cal Poly | L, 0-2",
 "Upcoming Oct 24, 6:00 PM Women's · UC Santa Barbara vs Utah Valley | ",
 "Upcoming Oct 28, 7:00 PM Women's · UC Santa Barbara at CSUN | ",
 "Upcoming Oct 31, 1:00 PM Women's · UC Santa Barbara at UC Riverside | ",
 "Upcoming Nov 4 Women's · UC Santa Barbara at The Big West Championships First Round | ",
 "Upcoming Nov 7 Women's · UC Santa Barbara at The Big West Championships Second Round | ",
 "Upcoming Nov 14 Women's · UC Santa Barbara at Big West Championship Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 14 Men's · UC Santa Barbara vs LMU (Exhibition) | W, 1-0",
 "Final Aug 21 Men's · UC Santa Barbara vs San Jose State | W, 3-0",
 "Final Aug 27 Men's · UC Santa Barbara vs Marshall | T, 1-1",
 "Final Aug 31 Men's · UC Santa Barbara vs San Diego | T, 1-1",
 "Final Sep 4 Men's · UC Santa Barbara at Cornell | L, 1-2",
 "Final Sep 7 Men's · UC Santa Barbara at Rutgers | W, 1-0",
 "Final Sep 12 Men's · UC Santa Barbara at Grand Canyon | W, 2-1",
 "Final Sep 17 Men's · UC Santa Barbara vs San Diego State | W, 2-0",
 "Final Sep 20 Men's · UC Santa Barbara vs Oregon State | L, 1-3",
 "Final Sep 25 Men's · UC Santa Barbara at Cal Poly | L, 1-2",
 "Final Sep 30 Men's · UC Santa Barbara vs Sacramento State | T, 1-1",
 "Final Oct 3 Men's · UC Santa Barbara vs Utah Valley | W, 3-2",
 "Final Oct 7 Men's · UC Santa Barbara at Cal State Bakersfield | T, 0-0",
 "Final Oct 10 Men's · UC Santa Barbara vs Cal Poly | W, 3-1",
 "Final Oct 14 Men's · UC Santa Barbara at Gonzaga | W, 2-1",
 "Final Oct 17 Men's · UC Santa Barbara at Cal State Fullerton | W, 2-1",
 "Upcoming Oct 24, 6:00 PM Men's · UC Santa Barbara at UC Irvine | ",
 "Upcoming Oct 27, 7:00 PM Men's · UC Santa Barbara vs California Baptist | ",
 "Upcoming Oct 31, 7:00 PM Men's · UC Santa Barbara vs CSUN | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 10:00 AM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Oct 27, 1:30 PM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Nov 4, 10:00 AM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Nov 6, 10:00 AM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Nov 11, 9:00 AM UC Santa Barbara vs Santa Barbara City College | ",
 "Upcoming Nov 11, 11:30 AM UC Santa Barbara vs Ventura College | ",
 "Upcoming Nov 17, 1:30 PM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Nov 20, 10:00 AM UC Santa Barbara vs Blue/Gold Series | ",
 "Upcoming Nov 23, 10:00 AM UC Santa Barbara vs Blue/Gold Series | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · UC Santa Barbara at PAC Invite | Completed",
 "Final Oct 9 Women's · UC Santa Barbara vs Saint Mary's | Completed",
 "Final Oct 16 Women's · UC Santa Barbara vs BYU | L, 102-122",
 "Final Oct 17 Women's · UC Santa Barbara at MPSF Open Water Championships | Completed",
 "Upcoming Nov 6, 11:00 AM Women's · UC Santa Barbara at California Baptist | ",
 "Upcoming Nov 7 Women's · UC Santa Barbara at California Baptist | ",
 "Upcoming Nov 13 Women's · UC Santa Barbara at Pepperdine/UC San Diego | ",
 "Upcoming Nov 18 Women's · UC Santa Barbara at Navy | ",
 "Upcoming Dec 17 Women's · UC Santa Barbara at Cal State Bakersfield | ",
 "Upcoming Jan 9 Women's · UC Santa Barbara vs San Diego State/Colorado State/Fresno State | ",
 "Upcoming Jan 15 Women's · UC Santa Barbara vs Stanford | ",
 "Upcoming Jan 16 Women's · UC Santa Barbara at Saint Mary's College of California | ",
 "Upcoming Jan 17 Women's · UC Santa Barbara vs Pacific | ",
 "Upcoming Jan 29 Women's · UC Santa Barbara at UC Santa Barbara Invite | ",
 "Upcoming Feb 17 Women's · UC Santa Barbara at MPSF Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · UC Santa Barbara at PAC Invite | Completed",
 "Final Oct 9 Men's · UC Santa Barbara vs Saint Mary's | Completed",
 "Final Oct 16 Men's · UC Santa Barbara vs BYU | L, 54-170",
 "Final Oct 17 Men's · UC Santa Barbara at MPSF Open Water Championships | Completed",
 "Upcoming Nov 13 Men's · UC Santa Barbara at Pepperdine/UC San Diego | ",
 "Upcoming Nov 18 Men's · UC Santa Barbara at Navy Invite | ",
 "Upcoming Dec 17 Men's · UC Santa Barbara at Cal State Bakersfield | ",
 "Upcoming Jan 9 Men's · UC Santa Barbara at UC San Diego | ",
 "Upcoming Jan 15 Men's · UC Santa Barbara vs Stanford/UCLA | ",
 "Upcoming Jan 16 Men's · UC Santa Barbara at Saint Mary's College | ",
 "Upcoming Jan 17 Men's · UC Santa Barbara vs Pacific/UC Davis | ",
 "Upcoming Jan 29 Men's · UC Santa Barbara at UC Santa Barbara Invite | ",
 "Upcoming Feb 22 Men's · UC Santa Barbara at MPSF Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 1 Women's · UC Santa Barbara at Battle in the Bay Classic | Completed",
 "Final Oct 1 Women's · UC Santa Barbara at The Big West Fall Selection | Completed",
 "Final Oct 15 Women's · UC Santa Barbara at ITA Southwest Regionals | Completed",
 "Upcoming Oct 30 Women's · UC Santa Barbara at Dennis Rizza Classic | ",
 "Upcoming Nov 5 Women's · UC Santa Barbara at ITA West Sectionals | ",
 "Upcoming Nov 5 Women's · UC Santa Barbara at ITA Conference Masters | ",
 "Upcoming Nov 17 Women's · UC Santa Barbara at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 1 Men's · UC Santa Barbara at Battle in the Bay Classic | Completed",
 "Final Oct 9 Men's · UC Santa Barbara at UCSB Classic | Completed",
 "Final Oct 15 Men's · UC Santa Barbara at ITA Southwest Regionals | Completed",
 "Upcoming Nov 5 Men's · UC Santa Barbara at SoCal Intercollegiate | ",
 "Upcoming Nov 5 Men's · UC Santa Barbara at ITA Sectionals | ",
 "Upcoming Nov 5 Men's · UC Santa Barbara at ITA Conference Masters | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Women's · UC Santa Barbara vs Fresno State (Exhibition) | W, 3-0",
 "Final Aug 28 Women's · UC Santa Barbara vs Tarleton State | W, 3-2",
 "Final Aug 29 Women's · UC Santa Barbara vs Prairie View A&M | W, 3-0",
 "Final Aug 30 Women's · UC Santa Barbara at Arizona | W, 3-0",
 "Final Sep 3 Women's · UC Santa Barbara vs Iowa State | L, 1-3",
 "Final Sep 5 Women's · UC Santa Barbara vs Utah State | W, 3-1",
 "Final Sep 10 Women's · UC Santa Barbara at Wyoming | L, 2-3",
 "Final Sep 11 Women's · UC Santa Barbara at Colorado State | L, 0-3",
 "Final Sep 12 Women's · UC Santa Barbara vs South Dakota | L, 0-3",
 "Final Sep 18 Women's · UC Santa Barbara at Pepperdine | L, 1-3",
 "Final Sep 19 Women's · UC Santa Barbara vs UC Davis | L, 1-3",
 "Final Sep 20 Women's · UC Santa Barbara at USC | L, 0-3",
 "Final Sep 25 Women's · UC Santa Barbara vs CSUN | W, 3-1",
 "Final Sep 26 Women's · UC Santa Barbara vs Cal State Bakersfield | W, 3-0",
 "Final Oct 1 Women's · UC Santa Barbara at Utah Valley | W, 3-0",
 "Final Oct 3 Women's · UC Santa Barbara at Sacramento State | W, 3-1",
 "Final Oct 9 Women's · UC Santa Barbara at Long Beach State | L, 1-3",
 "Final Oct 10 Women's · UC Santa Barbara at Cal State Fullerton | L, 2-3",
 "Final Oct 16 Women's · UC Santa Barbara vs UC Riverside | W, 3-0",
 "Final Oct 17 Women's · UC Santa Barbara vs California Baptist | W, 3-2",
 "Today Oct 22, 7:30 PM Women's · UC Santa Barbara vs Cal Poly | ",
 "Upcoming Oct 24, 7:00 PM Women's · UC Santa Barbara at Cal Poly | ",
 "Upcoming Oct 30, 6:00 PM Women's · UC Santa Barbara at UC San Diego | ",
 "Upcoming Oct 31, 5:00 PM Women's · UC Santa Barbara at UC Irvine | ",
 "Upcoming Nov 6, 7:00 PM Women's · UC Santa Barbara vs Cal State Fullerton | ",
 "Upcoming Nov 7, 7:00 PM Women's · UC Santa Barbara vs Long Beach State | ",
 "Upcoming Nov 13, 7:00 PM Women's · UC Santa Barbara vs Sacramento State | ",
 "Upcoming Nov 14, 7:00 PM Women's · UC Santa Barbara vs Utah Valley | ",
 "Upcoming Nov 20, 6:00 PM Women's · UC Santa Barbara at California Baptist | ",
 "Upcoming Nov 21, 4:00 PM Women's · UC Santa Barbara at UC Riverside | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · UC Santa Barbara vs Saint Mary's | W, 16-14",
 "Final Aug 28 Men's · UC Santa Barbara vs McKendree | W, 25-11",
 "Final Aug 29 Men's · UC Santa Barbara vs California | L, 9-14",
 "Final Aug 29 Men's · UC Santa Barbara vs Occidental | W, 19-5",
 "Final Aug 30 Men's · UC Santa Barbara vs Mercyhurst | W, 27-6",
 "Final Aug 30 Men's · UC Santa Barbara vs USC | L, 10-27",
 "Final Sep 3 Men's · UC Santa Barbara vs Biola | W, 17-9",
 "Final Sep 3 Men's · UC Santa Barbara at Pepperdine | L, 9-13",
 "Final Sep 4 Men's · UC Santa Barbara at Claremont-Mudd-Scripps | W, 11-10",
 "Final Sep 4 Men's · UC Santa Barbara vs Fresno Pacific | W, 15-5",
 "Final Sep 5 Men's · UC Santa Barbara vs Pomona-Pitzer | W, 14-12",
 "Final Sep 5 Men's · UC Santa Barbara vs Occidental | W, 17-8",
 "Final Sep 6 Men's · UC Santa Barbara vs Stanford | L, 13-24",
 "Final Sep 6 Men's · UC Santa Barbara vs Cal Lutheran | W, 25-5",
 "Final Sep 12 Men's · UC Santa Barbara at UCLA | L, 9-13",
 "Final Sep 12 Men's · UC Santa Barbara vs LMU | W, 13-12",
 "Final Sep 18 Men's · UC Santa Barbara vs Long Beach State | L, 9-16",
 "Final Sep 19 Men's · UC Santa Barbara vs Santa Clara | W, 15-13",
 "Final Sep 19 Men's · UC Santa Barbara vs Princeton | L, 14-15",
 "Final Sep 20 Men's · UC Santa Barbara vs Pepperdine | L, 10-15",
 "Final Sep 25 Men's · UC Santa Barbara vs Austin College | W, 30-10",
 "Final Sep 26 Men's · UC Santa Barbara vs Wagner | W, 20-10",
 "Final Sep 26 Men's · UC Santa Barbara at Air Force | W, 21-14",
 "Final Sep 27 Men's · UC Santa Barbara vs Occidental | W, 35-8",
 "Final Oct 3 Men's · UC Santa Barbara at San Jose State | W, 13-12",
 "Final Oct 3 Men's · UC Santa Barbara vs Saint Mary's | W, 14-8",
 "Final Oct 10 Men's · UC Santa Barbara vs California Baptist | L, 12-14",
 "Final Oct 16 Men's · UC Santa Barbara at UC San Diego | W, 14-8",
 "Upcoming Oct 24 Men's · UC Santa Barbara vs Long Beach State | ",
 "Upcoming Oct 30, 7:00 PM Men's · UC Santa Barbara at UC Irvine | ",
 "Upcoming Nov 7, 1:00 PM Men's · UC Santa Barbara vs USC | ",
 "Upcoming Nov 8 Men's · UC Santa Barbara at Cal State Fullerton | ",
 "Upcoming Nov 20 Men's · UC Santa Barbara at The Big West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

// Men's soccer vs LMU (Aug 14) is a "Pre-Season Friendly": out of the record
// (8-3-4, Big West 2-0-2 as ucsbgauchos.com publishes). Mutation: without the
// promotion rule the friendly counts (9-3-4).
assert.deepEqual(worker.groupEvents([...parse('Soccer','mens-soccer'),...parse('Soccer','womens-soccer')],now)[0].records.map(r=>`${r.team_label} ${r.text} ${r.conference?.text}`),["Men's 8-3-4 2-0-2","Women's 8-3-6 3-2-3"]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UC Santa Barbara module checks passed");
