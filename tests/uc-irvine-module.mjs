import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ucIrvineSchool} from '../src/schools/uc-irvine.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='uc-irvine');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ucIrvineHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/uc-irvine-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ucirvinesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['uc-irvine'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',ucIrvineSchool.scheduleUrls],['roster',ucIrvineSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('uc-irvine|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ucirvinesports.com',`${key} must stay on ucirvinesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ucirvinesports.com/sports/baseball/schedule"],"roster":["https://ucirvinesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ucirvinesports.com/sports/mens-basketball/schedule","https://ucirvinesports.com/sports/womens-basketball/schedule"],"roster":["https://ucirvinesports.com/sports/mens-basketball/roster","https://ucirvinesports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://ucirvinesports.com/sports/womens-cross-country/schedule","https://ucirvinesports.com/sports/mens-cross-country/schedule"],"roster":["https://ucirvinesports.com/sports/womens-cross-country/roster","https://ucirvinesports.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://ucirvinesports.com/sports/womens-golf/schedule","https://ucirvinesports.com/sports/mens-golf/schedule"],"roster":["https://ucirvinesports.com/sports/womens-golf/roster","https://ucirvinesports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://ucirvinesports.com/sports/womens-soccer/schedule","https://ucirvinesports.com/sports/mens-soccer/schedule"],"roster":["https://ucirvinesports.com/sports/womens-soccer/roster","https://ucirvinesports.com/sports/mens-soccer/roster"],"combined":true},"Tennis":{"schedule":["https://ucirvinesports.com/sports/womens-tennis/schedule","https://ucirvinesports.com/sports/mens-tennis/schedule"],"roster":["https://ucirvinesports.com/sports/womens-tennis/roster","https://ucirvinesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ucirvinesports.com/sports/womens-track-and-field/schedule","https://ucirvinesports.com/sports/mens-track-and-field/schedule"],"roster":["https://ucirvinesports.com/sports/womens-track-and-field/roster","https://ucirvinesports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://ucirvinesports.com/sports/womens-volleyball/schedule","https://ucirvinesports.com/sports/mens-volleyball/schedule"],"roster":["https://ucirvinesports.com/sports/womens-volleyball/roster","https://ucirvinesports.com/sports/mens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://ucirvinesports.com/sports/womens-water-polo/schedule","https://ucirvinesports.com/sports/mens-water-polo/schedule"],"roster":["https://ucirvinesports.com/sports/womens-water-polo/roster","https://ucirvinesports.com/sports/mens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'uc-irvine|"+sport+"':"),`${sport} routes must live in the UC Irvine module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://ucirvinesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ucIrvineHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=uc-irvine)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Aug 14 Men's · UC Irvine vs Chinese Taipei White (Exhibition) | W, 88-67",
 "Final Aug 14 Men's · UC Irvine vs Jordan (Exhibition) | W, 84-66",
 "Final Aug 15 Men's · UC Irvine vs Malaysia (Exhibition) | W, 87-55",
 "Final Aug 18 Men's · UC Irvine vs Chinese Taipei White (Exhibition) | W, 81-57",
 "Final Aug 18 Men's · UC Irvine vs Malaysia (Exhibition) | W, 81-62",
 "Final Aug 19 Men's · UC Irvine vs Jordan (Exhibition) | W, 80-49",
 "Final Aug 22 Men's · UC Irvine vs Chinese Taipei Blue (Exhibition) | W, 96-71",
 "Final Aug 23 Men's · UC Irvine vs Wonju DB New Generation South Korea (Exhibition) | L, 78-98",
 "Final Oct 10 Men's · UC Irvine at Université du Québec à Montréal (Exhibition) | W, 101-70",
 "Upcoming Oct 27, 7:00 PM Men's · UC Irvine vs Cal State LA (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · UC Irvine vs Chapman | ",
 "Upcoming Nov 7, 7:00 PM Men's · UC Irvine vs San José State | ",
 "Upcoming Nov 11, 7:00 PM Men's · UC Irvine vs Lincoln University CA | ",
 "Upcoming Nov 17, 7:00 PM Men's · UC Irvine at Stanford | ",
 "Upcoming Nov 21, 1:30 PM Men's · UC Irvine vs San Diego | ",
 "Upcoming Nov 22, 1:30 PM Men's · UC Irvine vs LMU | ",
 "Upcoming Nov 28, 2:00 PM Men's · UC Irvine at Seattle | ",
 "Upcoming Dec 3, 7:00 PM Men's · UC Irvine vs UC Riverside | ",
 "Upcoming Dec 5, 7:00 PM Men's · UC Irvine vs UC San Diego | ",
 "Upcoming Dec 11, 7:00 PM Men's · UC Irvine vs Northern Iowa | ",
 "Upcoming Dec 18, 7:00 PM Men's · UC Irvine vs New Mexico | ",
 "Upcoming Dec 20, 10:00 PM Men's · UC Irvine at Hawai'i | ",
 "Upcoming Dec 29, 7:00 PM Men's · UC Irvine vs Fresno State | ",
 "Upcoming Dec 31, 6:00 PM Men's · UC Irvine at Long Beach State | ",
 "Upcoming Jan 2, 4:00 PM Men's · UC Irvine at Cal State Fullerton | ",
 "Upcoming Jan 7, 7:00 PM Men's · UC Irvine vs Sacramento State | ",
 "Upcoming Jan 9, 7:00 PM Men's · UC Irvine vs Utah Valley | ",
 "Upcoming Jan 14, 7:00 PM Men's · UC Irvine at California Baptist | ",
 "Upcoming Jan 16, 5:00 PM Men's · UC Irvine at UC Riverside | ",
 "Upcoming Jan 21, 7:00 PM Men's · UC Irvine vs Cal State Fullerton | ",
 "Upcoming Jan 23, 7:00 PM Men's · UC Irvine vs Long Beach State | ",
 "Upcoming Jan 28, 7:00 PM Men's · UC Irvine at Cal Poly | ",
 "Upcoming Jan 30, 6:00 PM Men's · UC Irvine at UC Santa Barbara | ",
 "Upcoming Feb 4, 7:00 PM Men's · UC Irvine vs Cal State Bakersfield | ",
 "Upcoming Feb 6, 7:00 PM Men's · UC Irvine vs CSUN | ",
 "Upcoming Feb 11, 5:00 PM Men's · UC Irvine at Utah Valley | ",
 "Upcoming Feb 13, 7:00 PM Men's · UC Irvine at Sacramento State | ",
 "Upcoming Feb 18, 7:00 PM Men's · UC Irvine vs California Baptist | ",
 "Upcoming Feb 20, 6:00 PM Men's · UC Irvine at UC San Diego | ",
 "Upcoming Feb 25, 7:00 PM Men's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Feb 27, 7:00 PM Men's · UC Irvine vs Cal Poly | ",
 "Upcoming Mar 4, 7:00 PM Men's · UC Irvine at CSUN | ",
 "Upcoming Mar 6, 2:00 PM Men's · UC Irvine at Cal State Bakersfield | ",
 "Upcoming Mar 10 Men's · UC Irvine at Big West First Round | ",
 "Upcoming Mar 11 Men's · UC Irvine at Big West Second Round | ",
 "Upcoming Mar 12 Men's · UC Irvine at Big West Semifinal | ",
 "Upcoming Mar 13 Men's · UC Irvine at Big West Final | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 7:00 PM Women's · UC Irvine at UCLA | ",
 "Upcoming Nov 10, 5:00 PM Women's · UC Irvine at Northern Arizona | ",
 "Upcoming Nov 15, 2:00 PM Women's · UC Irvine at Eastern Washington | ",
 "Upcoming Nov 18, 6:00 PM Women's · UC Irvine vs Idaho State | ",
 "Upcoming Nov 21, 7:00 PM Women's · UC Irvine at San Diego | ",
 "Upcoming Nov 27, 2:00 PM Women's · UC Irvine vs Jacksonville State | ",
 "Upcoming Nov 28, 4:30 PM Women's · UC Irvine vs Utah State | ",
 "Upcoming Dec 3, 6:00 PM Women's · UC Irvine at UC Riverside | ",
 "Upcoming Dec 5, 2:00 PM Women's · UC Irvine at UC San Diego | ",
 "Upcoming Dec 12, 2:00 PM Women's · UC Irvine vs UTEP | ",
 "Upcoming Dec 14, 6:00 PM Women's · UC Irvine vs New Mexico State | ",
 "Upcoming Dec 18, 6:00 PM Women's · UC Irvine at New Mexico | ",
 "Upcoming Dec 31, 2:00 PM Women's · UC Irvine vs Long Beach State | ",
 "Upcoming Jan 2, 2:00 PM Women's · UC Irvine vs Cal State Fullerton | ",
 "Upcoming Jan 7, 6:30 PM Women's · UC Irvine at Sacramento State | ",
 "Upcoming Jan 9, 1:00 PM Women's · UC Irvine at Utah Valley | ",
 "Upcoming Jan 14, 6:00 PM Women's · UC Irvine vs California Baptist | ",
 "Upcoming Jan 16, 2:00 PM Women's · UC Irvine vs UC Riverside | ",
 "Upcoming Jan 21, 7:00 PM Women's · UC Irvine at Cal State Fullerton | ",
 "Upcoming Jan 23, 2:00 PM Women's · UC Irvine at Long Beach State | ",
 "Upcoming Jan 28, 6:00 PM Women's · UC Irvine vs Cal Poly | ",
 "Upcoming Jan 30, 1:00 PM Women's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Feb 4, 6:30 PM Women's · UC Irvine at Cal State Bakersfield | ",
 "Upcoming Feb 6, 2:00 PM Women's · UC Irvine at CSUN | ",
 "Upcoming Feb 11, 6:00 PM Women's · UC Irvine vs Utah Valley | ",
 "Upcoming Feb 13, 2:00 PM Women's · UC Irvine vs Sacramento State | ",
 "Upcoming Feb 18, 6:00 PM Women's · UC Irvine at California Baptist | ",
 "Upcoming Feb 20, 1:00 PM Women's · UC Irvine vs UC San Diego | ",
 "Upcoming Feb 25, 6:00 PM Women's · UC Irvine at UC Santa Barbara | ",
 "Upcoming Feb 27, 2:00 PM Women's · UC Irvine at Cal Poly | ",
 "Upcoming Mar 4, 6:00 PM Women's · UC Irvine vs CSUN | ",
 "Upcoming Mar 6, 2:00 PM Women's · UC Irvine vs Cal State Bakersfield | ",
 "Upcoming Mar 10 Women's · UC Irvine at Big West Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 3 Women's · UC Irvine at Aztec Coastal Classic | 3rd (65 points)",
 "Final Sep 19 Women's · UC Irvine at UC Riverside Invitational | 6K - 1st (65 pts); 5K - 2nd (96 pts)",
 "Final Oct 9 Women's · UC Irvine at Bill Dellinger Invitational | 4th (118 points)",
 "Final Oct 17 Women's · UC Irvine at Highlander Invitational | Completed",
 "Upcoming Oct 31, 9:15 AM Women's · UC Irvine at Big West Championship | ",
 "Upcoming Nov 13 Women's · UC Irvine at NCAA West Regional | ",
 "Upcoming Nov 21 Women's · UC Irvine at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 3 Men's · UC Irvine at Aztec Coastal Classic | 2nd (50 points)",
 "Final Sep 19 Men's · UC Irvine at UC Riverside Invitational | 11th (315 points)",
 "Final Oct 9 Men's · UC Irvine at Bill Dellinger Invitational | 9th (223 points)",
 "Final Oct 17 Men's · UC Irvine at Highlander Invitational | Completed",
 "Upcoming Oct 31, 8:30 AM Men's · UC Irvine at Big West Championship | ",
 "Upcoming Nov 13 Men's · UC Irvine at NCAA West Regional | ",
 "Upcoming Nov 21 Men's · UC Irvine at NCAA Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · UC Irvine at McGuire Invitational | 11th",
 "Final Sep 21 Women's · UC Irvine at Golfweek Red Sky Classic | 17th",
 "Final Oct 5 Women's · UC Irvine at Pat Lesser-Harbottle Invitational | 4th",
 "Final Oct 12 Women's · UC Irvine at Illini Women's Invitational | 15th",
 "Upcoming Feb 13, 8:00 AM Women's · UC Irvine at Alice & John Wallace Classic | ",
 "Upcoming Feb 22, 8:00 AM Women's · UC Irvine at Bruin/Wave Invitational | ",
 "Upcoming Mar 8, 8:00 AM Women's · UC Irvine at Fresno State Classic | ",
 "Upcoming Mar 22, 8:00 AM Women's · UC Irvine at Silicon Valley Showcase | ",
 "Upcoming Apr 12, 8:00 AM Women's · UC Irvine at Bobcat Desert Classic | ",
 "Upcoming Apr 18, 8:00 AM Women's · UC Irvine at Big West Championship | ",
 "Upcoming May 10 Women's · UC Irvine at NCAA Regionals | ",
 "Upcoming May 21 Women's · UC Irvine at NCAA Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · UC Irvine at CDA National Reserve | 15th",
 "Final Oct 5 Men's · UC Irvine at Oregon State Invitational | 10th",
 "Final Oct 12 Men's · UC Irvine at Visit Stockton Invitational | 12th",
 "Upcoming Oct 26 Men's · UC Irvine at Ka'anapali Classic | ",
 "Upcoming Feb 1 Men's · UC Irvine at Bill Cullum Invitational | ",
 "Upcoming Feb 22 Men's · UC Irvine at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 1 Men's · UC Irvine at The Watney Invitational | ",
 "Upcoming Mar 21 Men's · UC Irvine at UC San Diego Invitational | ",
 "Upcoming Mar 29 Men's · UC Irvine at Wyoming Cowboy Classic | ",
 "Upcoming Apr 5 Men's · UC Irvine at UCSB Invitational | ",
 "Upcoming May 2 Men's · UC Irvine at Big West Championship | ",
 "Upcoming May 17 Men's · UC Irvine at NCAA Regional | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 5 Women's · UC Irvine vs Arizona (Exhibition) | T, 0-0",
 "Final Aug 12 Women's · UC Irvine vs Utah Tech | T, 1-1",
 "Final Aug 15 Women's · UC Irvine vs Concordia Irvine (Exhibition) | W, 5-1",
 "Final Aug 23 Women's · UC Irvine at Stanford | L, 0-6",
 "Final Aug 27 Women's · UC Irvine at Washington State | L, 0-2",
 "Final Aug 30 Women's · UC Irvine vs Grand Canyon | T, 1-1",
 "Final Sep 3 Women's · UC Irvine at Southern Utah | W, 1-0",
 "Final Sep 10 Women's · UC Irvine vs San Diego | L, 1-3",
 "Final Sep 17 Women's · UC Irvine vs Fresno State | W, 4-1",
 "Final Sep 23 Women's · UC Irvine at Sacramento State | T, 1-1",
 "Final Sep 26 Women's · UC Irvine vs Cal State Bakersfield | W, 2-0",
 "Final Sep 30 Women's · UC Irvine vs Utah Valley | L, 1-3",
 "Final Oct 3 Women's · UC Irvine at UC Riverside | W, 2-1",
 "Final Oct 10 Women's · UC Irvine vs CSUN | L, 2-4",
 "Final Oct 14 Women's · UC Irvine at UC Santa Barbara | L, 0-1",
 "Final Oct 17 Women's · UC Irvine vs Long Beach State | L, 1-2",
 "Final Oct 21 Women's · UC Irvine at California Baptist | L, 0-4",
 "Upcoming Oct 25, 1:00 PM Women's · UC Irvine at Cal Poly | ",
 "Upcoming Oct 28, 6:00 PM Women's · UC Irvine vs Cal State Fullerton | ",
 "Upcoming Oct 31, 1:00 PM Women's · UC Irvine at UC San Diego | ",
 "Upcoming Nov 4 Women's · UC Irvine at Big West First Round | ",
 "Upcoming Nov 7 Women's · UC Irvine at Big West Semifinal | ",
 "Upcoming Nov 14 Women's · UC Irvine at Big West Final | ",
 "Upcoming Nov 20 Women's · UC Irvine at NCAA Tournament | ",
 "Upcoming Dec 11 Women's · UC Irvine at NCAA College Cup | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 11 Men's · UC Irvine at UCLA (Exhibition) | W, 1-0",
 "Final Aug 20 Men's · UC Irvine vs Oregon State | T, 3-3",
 "Final Aug 24 Men's · UC Irvine vs Loyola Marymount | W, 3-1",
 "Final Aug 30 Men's · UC Irvine at Pacific | W, 3-0",
 "Final Sep 5 Men's · UC Irvine vs Missouri State | L, 1-2",
 "Final Sep 8 Men's · UC Irvine vs San Diego | L, 1-2",
 "Final Sep 13 Men's · UC Irvine vs UNLV | L, 0-2",
 "Final Sep 17 Men's · UC Irvine at UC Riverside | W, 2-0",
 "Final Sep 20 Men's · UC Irvine at UC San Diego | W, 2-0",
 "Final Sep 24 Men's · UC Irvine vs California Baptist | L, 0-1",
 "Final Sep 30 Men's · UC Irvine at Utah Valley | L, 0-2",
 "Final Oct 3 Men's · UC Irvine vs Cal State Fullerton | W, 3-1",
 "Final Oct 7 Men's · UC Irvine vs CSUN | W, 2-1",
 "Final Oct 10 Men's · UC Irvine at Cal State Bakersfield | T, 0-0",
 "Final Oct 14 Men's · UC Irvine vs San Diego State | W, 1-0",
 "Final Oct 17 Men's · UC Irvine at Sacramento State | W, 3-0",
 "Final Oct 21 Men's · UC Irvine vs Cal Poly | W, 1-0",
 "Upcoming Oct 24, 6:00 PM Men's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Oct 31, 2:00 PM Men's · UC Irvine at California Baptist | ",
 "Upcoming Nov 7 Men's · UC Irvine at Big West Semifinal | ",
 "Upcoming Nov 13 Men's · UC Irvine at Big West Final | ",
 "Upcoming Nov 19 Men's · UC Irvine at NCAA Tournament | ",
 "Upcoming Dec 11 Men's · UC Irvine at NCAA College Cup | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 1 Women's · UC Irvine at Big West Fall Selection Event | Completed",
 "Final Oct 15 Women's · UC Irvine at ITA Southwest Regional | Completed",
 "Upcoming Oct 29 Women's · UC Irvine at UCI Fall Invitational | ",
 "Upcoming Oct 30 Women's · UC Irvine at JKC Dennis Rizza | ",
 "Upcoming Nov 6 Women's · UC Irvine at CSUN Fall Invitational | ",
 "Upcoming Nov 14 Women's · UC Irvine at Pomona-Pitzer Invitational | ",
 "Upcoming Jan 15 Women's · UC Irvine at Long Beach State Invitational | ",
 "Upcoming Jan 22, 1:00 PM Women's · UC Irvine at LMU | ",
 "Upcoming Feb 6, 11:00 AM Women's · UC Irvine vs New Mexico | ",
 "Upcoming Feb 12, 1:00 PM Women's · UC Irvine vs Occidental | ",
 "Upcoming Feb 13, 11:00 AM Women's · UC Irvine vs Bowling Green | ",
 "Upcoming Feb 20, 12:00 PM Women's · UC Irvine at Caltech | ",
 "Upcoming Feb 21, 10:00 AM Women's · UC Irvine vs New Mexico State | ",
 "Upcoming Feb 27, 11:00 AM Women's · UC Irvine at Pacific | ",
 "Upcoming Feb 28, 11:00 AM Women's · UC Irvine at Fresno State | ",
 "Upcoming Mar 2, 2:00 PM Women's · UC Irvine vs Oakland | ",
 "Upcoming Mar 11, 2:00 PM Women's · UC Irvine at UC Riverside | ",
 "Upcoming Mar 12, 1:00 PM Women's · UC Irvine vs Northern Arizona | ",
 "Upcoming Mar 24, 1:00 PM Women's · UC Irvine at Westmont College (Calif.) | ",
 "Upcoming Mar 30, 1:30 PM Women's · UC Irvine vs Brown | ",
 "Upcoming Apr 2, 1:00 PM Women's · UC Irvine vs Sacramento State | ",
 "Upcoming Apr 3, 11:00 AM Women's · UC Irvine at CSUN | ",
 "Upcoming Apr 10, 11:00 AM Women's · UC Irvine at UC Santa Barbara | ",
 "Upcoming Apr 11, 11:00 AM Women's · UC Irvine at Cal Poly | ",
 "Upcoming Apr 16, 1:00 PM Women's · UC Irvine vs Cal State Fullerton | ",
 "Upcoming Apr 17, 11:00 AM Women's · UC Irvine vs Long Beach State | ",
 "Upcoming Apr 24, 10:30 AM Women's · UC Irvine vs UC San Diego | ",
 "Upcoming Apr 28 Women's · UC Irvine at Big West Championship | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · UC Irvine at San Diego Veterans Tennis Classic | Completed",
 "Final Oct 9 Men's · UC Irvine at UCSB Fall Invite | Completed",
 "Final Oct 15 Men's · UC Irvine at ITA Southwest Regional Championships | Completed",
 "Upcoming Oct 30 Men's · UC Irvine at Jack Kramer Collegiate | ",
 "Upcoming Nov 5 Men's · UC Irvine at SoCal Intercollegiate Championships | ",
 "Upcoming Jan 14, 1:00 PM Men's · UC Irvine at UCLA | ",
 "Upcoming Jan 17 Men's · UC Irvine at USC | ",
 "Upcoming Jan 30, 12:00 PM Men's · UC Irvine at Grand Canyon | ",
 "Upcoming Feb 6 Men's · UC Irvine at San Diego State | ",
 "Upcoming Feb 13 Men's · UC Irvine at Saint Mary's | ",
 "Upcoming Feb 14 Men's · UC Irvine at Nevada | ",
 "Upcoming Feb 20, 11:00 AM Men's · UC Irvine vs Santa Clara | ",
 "Upcoming Feb 25 Men's · UC Irvine at Pacific Coast Doubles Championship | ",
 "Upcoming Mar 2, 10:00 AM Men's · UC Irvine vs Villanova | ",
 "Upcoming Mar 4, 12:00 PM Men's · UC Irvine vs LMU | ",
 "Upcoming Mar 6 Men's · UC Irvine vs Creighton | ",
 "Upcoming Mar 20 Men's · UC Irvine vs Columbia | ",
 "Upcoming Mar 21 Men's · UC Irvine vs Hawai'i | ",
 "Upcoming Mar 26 Men's · UC Irvine vs DePaul | ",
 "Upcoming Mar 29 Men's · UC Irvine vs Brown | ",
 "Upcoming Apr 3, 12:00 PM Men's · UC Irvine at UC Riverside | ",
 "Upcoming Apr 9 Men's · UC Irvine vs Sacramento State | ",
 "Upcoming Apr 10 Men's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Apr 17 Men's · UC Irvine at Cal Poly | ",
 "Upcoming Apr 20 Men's · UC Irvine vs Denver | ",
 "Upcoming Apr 24, 2:00 PM Men's · UC Irvine vs UC San Diego | ",
 "Upcoming Apr 29 Men's · UC Irvine at Big West Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · UC Irvine at Washington | L, 1-3",
 "Final Aug 29 Women's · UC Irvine vs IU Indy | L, 0-3",
 "Final Aug 30 Women's · UC Irvine vs San Diego State | L, 0-3",
 "Final Sep 3 Women's · UC Irvine vs New Mexico State | L, 2-3",
 "Final Sep 4 Women's · UC Irvine vs Southern Utah | W, 3-0",
 "Final Sep 5 Women's · UC Irvine at Fresno State | L, 1-3",
 "Final Sep 11 Women's · UC Irvine vs LMU | L, 2-3",
 "Final Sep 12 Women's · UC Irvine vs Utah Tech | L, 0-3",
 "Final Sep 13 Women's · UC Irvine vs San José State | L, 2-3",
 "Final Sep 18 Women's · UC Irvine vs Southeastern Louisiana | W, 3-1",
 "Final Sep 19 Women's · UC Irvine at UNLV | L, 1-3",
 "Final Sep 25 Women's · UC Irvine vs Long Beach State | L, 0-3",
 "Final Sep 26 Women's · UC Irvine vs Cal State Fullerton | W, 3-1",
 "Final Oct 2 Women's · UC Irvine at UC Riverside | W, 3-1",
 "Final Oct 3 Women's · UC Irvine at California Baptist | W, 3-2",
 "Final Oct 9 Women's · UC Irvine vs Utah Valley | W, 3-0",
 "Final Oct 10 Women's · UC Irvine vs Sacramento State | L, 1-3",
 "Final Oct 16 Women's · UC Irvine at Cal State Bakersfield | W, 3-1",
 "Final Oct 17 Women's · UC Irvine at CSUN | W, 3-1",
 "Upcoming Oct 23, 6:00 PM Women's · UC Irvine at UC San Diego | ",
 "Upcoming Oct 24, 5:00 PM Women's · UC Irvine vs UC San Diego | ",
 "Upcoming Oct 30, 6:00 PM Women's · UC Irvine vs Cal Poly | ",
 "Upcoming Oct 31, 5:00 PM Women's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Nov 5, 7:00 PM Women's · UC Irvine at Sacramento State | ",
 "Upcoming Nov 7, 12:00 PM Women's · UC Irvine at Utah Valley | ",
 "Upcoming Nov 13, 6:00 PM Women's · UC Irvine vs CSUN | ",
 "Upcoming Nov 14, 5:00 PM Women's · UC Irvine vs Cal State Bakersfield | ",
 "Upcoming Nov 20, 6:00 PM Women's · UC Irvine at Cal State Fullerton | ",
 "Upcoming Nov 21, 6:00 PM Women's · UC Irvine at Long Beach State | ",
 "Upcoming Nov 25 Women's · UC Irvine at Big West Championship | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 Men's · UC Irvine vs Chapman | W, 29-4",
 "Final Aug 28 Men's · UC Irvine vs George Washington | W, 13-9",
 "Final Aug 29 Men's · UC Irvine vs Stanford | L, 12-22",
 "Final Aug 29 Men's · UC Irvine vs Concordia Irvine | W, 16-9",
 "Final Sep 4 Men's · UC Irvine at Redlands | W, 16-6",
 "Final Sep 4 Men's · UC Irvine vs Cal Lutheran | W, 19-8",
 "Final Sep 5 Men's · UC Irvine at Claremont-Mudd-Scripps | W, 12-5",
 "Final Sep 5 Men's · UC Irvine vs Pomona-Pitzer | W, 12-8",
 "Final Sep 11 Men's · UC Irvine vs UCLA | L, 14-16",
 "Final Sep 12 Men's · UC Irvine at USC | L, 15-24",
 "Final Sep 18 Men's · UC Irvine vs UC Davis | W, 14-10",
 "Final Sep 19 Men's · UC Irvine vs California | L, 8-16",
 "Final Sep 19 Men's · UC Irvine vs UC San Diego | L, 9-11",
 "Final Sep 20 Men's · UC Irvine vs San José State | W, 15-14",
 "Final Sep 26 Men's · UC Irvine vs LMU | W, 13-8",
 "Final Sep 26 Men's · UC Irvine vs Santa Clara | W, 14-13",
 "Final Sep 27 Men's · UC Irvine vs Navy | W, 11-10",
 "Final Oct 2 Men's · UC Irvine vs Whittier College | W, 13-6",
 "Final Oct 2 Men's · UC Irvine vs Cal Lutheran | W, 19-9",
 "Final Oct 9 Men's · UC Irvine vs Cal State Fullerton | W, 19-6",
 "Final Oct 17 Men's · UC Irvine at California Baptist | W, 12-9",
 "Upcoming Oct 23, 6:00 PM Men's · UC Irvine vs UC San Diego | ",
 "Upcoming Oct 25, 12:00 PM Men's · UC Irvine vs Air Force | ",
 "Upcoming Oct 30, 6:00 PM Men's · UC Irvine vs UC Santa Barbara | ",
 "Upcoming Nov 6, 7:00 PM Men's · UC Irvine at Long Beach State | ",
 "Upcoming Nov 13, 6:00 PM Men's · UC Irvine vs Pacific | ",
 "Upcoming Nov 20 Men's · UC Irvine at Big West Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("UC Irvine module checks passed");
