import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {oklahomaSchool} from '../src/schools/oklahoma.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='oklahoma');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,oklahomaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/oklahoma-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit soonersports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['oklahoma'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',oklahomaSchool.scheduleUrls],['roster',oklahomaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('oklahoma|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'soonersports.com',`${key} must stay on soonersports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://soonersports.com/sports/baseball/schedule"],"roster":["https://soonersports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://soonersports.com/sports/mens-basketball/schedule","https://soonersports.com/sports/womens-basketball/schedule"],"roster":["https://soonersports.com/sports/mens-basketball/roster","https://soonersports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://soonersports.com/sports/cross-country/schedule"],"roster":["https://soonersports.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://soonersports.com/sports/football/schedule"],"roster":["https://soonersports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://soonersports.com/sports/womens-golf/schedule","https://soonersports.com/sports/mens-golf/schedule"],"roster":["https://soonersports.com/sports/womens-golf/roster","https://soonersports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://soonersports.com/sports/womens-gymnastics/schedule","https://soonersports.com/sports/mens-gymnastics/schedule"],"roster":["https://soonersports.com/sports/womens-gymnastics/roster","https://soonersports.com/sports/mens-gymnastics/roster"],"combined":true},"Rowing":{"schedule":["https://soonersports.com/sports/rowing/schedule"],"roster":["https://soonersports.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://soonersports.com/sports/soccer/schedule"],"roster":["https://soonersports.com/sports/soccer/roster"],"combined":false},"Softball":{"schedule":["https://soonersports.com/sports/softball/schedule"],"roster":["https://soonersports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://soonersports.com/sports/womens-tennis/schedule","https://soonersports.com/sports/mens-tennis/schedule"],"roster":["https://soonersports.com/sports/womens-tennis/roster","https://soonersports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://soonersports.com/sports/track-and-field/schedule"],"roster":["https://soonersports.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://soonersports.com/sports/volleyball/schedule"],"roster":["https://soonersports.com/sports/volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://soonersports.com/sports/wrestling/schedule"],"roster":["https://soonersports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'oklahoma|"+sport+"':"),`${sport} routes must live in the Oklahoma module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-08T15:00:00Z");
const page=slug=>`https://soonersports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.oklahomaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=oklahoma)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 8, 3:00 PM Oklahoma vs Missouri State (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Oklahoma at Texas Tech (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM Oklahoma at Texas Tech (Exhibition) | ",
 "Upcoming Feb 19, 11:00 AM Oklahoma vs Arizona | ",
 "Upcoming Feb 20, 3:00 PM Oklahoma vs Clemson | ",
 "Upcoming Feb 21, 6:30 PM Oklahoma vs TCU | ",
 "Upcoming Mar 5, 6:00 PM Oklahoma vs UC Irvine | ",
 "Upcoming Mar 6, 4:00 PM Oklahoma vs Kansas | ",
 "Upcoming Mar 7, 3:00 PM Oklahoma vs Southern Miss | ",
 "Upcoming Mar 19 Oklahoma at Tennessee | ",
 "Upcoming Mar 20 Oklahoma at Tennessee | ",
 "Upcoming Mar 21 Oklahoma at Tennessee | ",
 "Upcoming Mar 25 Oklahoma vs Auburn | ",
 "Upcoming Mar 26 Oklahoma vs Auburn | ",
 "Upcoming Mar 27 Oklahoma vs Auburn | ",
 "Upcoming Apr 2 Oklahoma vs Georgia | ",
 "Upcoming Apr 3 Oklahoma vs Georgia | ",
 "Upcoming Apr 4 Oklahoma vs Georgia | ",
 "Upcoming Apr 9 Oklahoma at Texas A&M | ",
 "Upcoming Apr 10 Oklahoma at Texas A&M | ",
 "Upcoming Apr 11 Oklahoma at Texas A&M | ",
 "Upcoming Apr 16 Oklahoma vs Kentucky | ",
 "Upcoming Apr 17 Oklahoma vs Kentucky | ",
 "Upcoming Apr 18 Oklahoma vs Kentucky | ",
 "Upcoming Apr 23 Oklahoma at Missouri | ",
 "Upcoming Apr 24 Oklahoma at Missouri | ",
 "Upcoming Apr 25 Oklahoma at Missouri | ",
 "Upcoming Apr 30 Oklahoma at Mississippi State | ",
 "Upcoming May 1 Oklahoma at Mississippi State | ",
 "Upcoming May 2 Oklahoma at Mississippi State | ",
 "Upcoming May 7 Oklahoma vs Texas | ",
 "Upcoming May 8 Oklahoma vs Texas | ",
 "Upcoming May 9 Oklahoma vs Texas | ",
 "Upcoming May 14 Oklahoma at Ole Miss | ",
 "Upcoming May 15 Oklahoma at Ole Miss | ",
 "Upcoming May 16 Oklahoma at Ole Miss | ",
 "Upcoming May 20 Oklahoma vs South Carolina | ",
 "Upcoming May 21 Oklahoma vs South Carolina | ",
 "Upcoming May 22 Oklahoma vs South Carolina | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Oklahoma vs East Texas A&M | ",
 "Upcoming Nov 6, 7:00 PM Men's · Oklahoma vs Mississippi Valley State | ",
 "Upcoming Nov 9, 7:00 PM Men's · Oklahoma vs North Alabama | ",
 "Upcoming Nov 13, 7:00 PM Men's · Oklahoma vs FDU | ",
 "Upcoming Nov 18, 7:00 PM Men's · Oklahoma vs Campbell | ",
 "Upcoming Nov 24, 12:30 PM Men's · Oklahoma vs Pitt | ",
 "Upcoming Nov 26, 11:00 AM Men's · Oklahoma vs Purdue | ",
 "Upcoming Dec 1, 8:00 PM Men's · Oklahoma vs Syracuse | ",
 "Upcoming Dec 5, 11:00 AM Men's · Oklahoma vs Arizona State | ",
 "Upcoming Dec 7, 8:00 PM Men's · Oklahoma vs Alabama State | ",
 "Upcoming Dec 12, 1:30 PM Men's · Oklahoma vs Oklahoma State | ",
 "Upcoming Dec 17, 8:00 PM Men's · Oklahoma vs Jackson State | ",
 "Upcoming Dec 22, 7:30 PM Men's · Oklahoma at SMU | ",
 "Upcoming Dec 28, 7:00 PM Men's · Oklahoma vs ULM | ",
 "Upcoming Jan 2, 11:00 AM Men's · Oklahoma vs Kentucky | ",
 "Upcoming Jan 6, 8:00 PM Men's · Oklahoma at Florida | ",
 "Upcoming Jan 9, 5:00 PM Men's · Oklahoma vs Mississippi State | ",
 "Upcoming Jan 12, 6:00 PM Men's · Oklahoma at Georgia | ",
 "Upcoming Jan 16, 11:00 AM Men's · Oklahoma at Texas | ",
 "Upcoming Jan 19, 6:00 PM Men's · Oklahoma vs Missouri | ",
 "Upcoming Jan 23, 7:30 PM Men's · Oklahoma at Alabama | ",
 "Upcoming Jan 30, 12:00 PM Men's · Oklahoma vs South Carolina | ",
 "Upcoming Feb 2, 8:00 PM Men's · Oklahoma at Texas A&M | ",
 "Upcoming Feb 6, 2:30 PM Men's · Oklahoma at Auburn | ",
 "Upcoming Feb 10, 6:00 PM Men's · Oklahoma vs Tennessee | ",
 "Upcoming Feb 13, 12:00 PM Men's · Oklahoma vs LSU | ",
 "Upcoming Feb 16, 6:00 PM Men's · Oklahoma at Missouri | ",
 "Upcoming Feb 20, 7:30 PM Men's · Oklahoma vs Texas | ",
 "Upcoming Feb 24, 8:00 PM Men's · Oklahoma vs Georgia | ",
 "Upcoming Feb 27, 2:30 PM Men's · Oklahoma at Ole Miss | ",
 "Upcoming Mar 3, 8:00 PM Men's · Oklahoma vs Vanderbilt | ",
 "Upcoming Mar 6, 11:00 AM Men's · Oklahoma at Arkansas | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Women's · Oklahoma vs Southern Nazarene (Exhibition) | ",
 "Upcoming Nov 2, 1:30 PM Women's · Oklahoma vs North Carolina | ",
 "Upcoming Nov 8, 2:00 PM Women's · Oklahoma vs Morgan State | ",
 "Upcoming Nov 10, 6:00 PM Women's · Oklahoma vs San Jose State | ",
 "Upcoming Nov 13, 10:30 AM Women's · Oklahoma vs Oral Roberts | ",
 "Upcoming Nov 15, 1:00 PM Women's · Oklahoma vs Southern | ",
 "Upcoming Nov 17, 8:00 PM Women's · Oklahoma vs Texas Southern | ",
 "Upcoming Nov 19, 6:00 PM Women's · Oklahoma vs Northwestern State | ",
 "Upcoming Nov 23, 1:30 PM Women's · Oklahoma vs Virginia | ",
 "Upcoming Nov 24, 3:00 PM Women's · Oklahoma vs Montana State | ",
 "Upcoming Dec 3, 6:00 PM Women's · Oklahoma at Syracuse | ",
 "Upcoming Dec 5, 1:00 PM Women's · Oklahoma vs Michigan | ",
 "Upcoming Dec 9, 6:00 PM Women's · Oklahoma vs SIUE | ",
 "Upcoming Dec 12, 11:00 AM Women's · Oklahoma vs Oklahoma State | ",
 "Upcoming Dec 21, 1:00 PM Women's · Oklahoma vs Louisiana Monroe | ",
 "Upcoming Dec 31, 7:00 PM Women's · Oklahoma at Ole Miss | ",
 "Upcoming Jan 3, 3:00 PM Women's · Oklahoma vs Missouri | ",
 "Upcoming Jan 7, 6:00 PM Women's · Oklahoma vs Georgia | ",
 "Upcoming Jan 10, 4:00 PM Women's · Oklahoma at Tennessee | ",
 "Upcoming Jan 14, 6:30 PM Women's · Oklahoma at South Carolina | ",
 "Upcoming Jan 18, 11:00 AM Women's · Oklahoma vs UCLA | ",
 "Upcoming Jan 21, 6:30 PM Women's · Oklahoma at Mississippi State | ",
 "Upcoming Jan 24, 1:00 PM Women's · Oklahoma vs Kentucky | ",
 "Upcoming Jan 28, 8:00 PM Women's · Oklahoma vs Vanderbilt | ",
 "Upcoming Jan 31, 1:00 PM Women's · Oklahoma at Texas A&M | ",
 "Upcoming Feb 4, 6:00 PM Women's · Oklahoma vs Alabama | ",
 "Upcoming Feb 8, 6:00 PM Women's · Oklahoma vs South Carolina | ",
 "Upcoming Feb 11, 6:30 PM Women's · Oklahoma at Arkansas | ",
 "Upcoming Feb 14, 11:00 AM Women's · Oklahoma at Florida | ",
 "Upcoming Feb 21, 2:00 PM Women's · Oklahoma vs Auburn | ",
 "Upcoming Feb 25, 7:00 PM Women's · Oklahoma vs Texas | ",
 "Upcoming Feb 28, 1:00 PM Women's · Oklahoma at LSU | ",
 "Upcoming Mar 3 Women's · Oklahoma at SEC Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 Oklahoma at Cowboy Preview | Completed",
 "Final Sep 26 Oklahoma at Cowboy Jamboree | Completed",
 "Upcoming Oct 9, 8:00 AM Oklahoma at Nuttycombe Invitational | ",
 "Upcoming Oct 17, 8:00 AM Oklahoma at Weis-Crockett Invitational | ",
 "Upcoming Oct 30, 8:00 AM Oklahoma at SEC Cross Country Championships | ",
 "Upcoming Nov 13, 8:00 AM Oklahoma at NCAA Midwest Regionals | ",
 "Upcoming Nov 21 Oklahoma at NCAA Cross Country Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 4 Oklahoma vs UTEP | W, 51-0",
 "Final Sep 12 Oklahoma at Michigan | L, 10-17",
 "Final Sep 19 Oklahoma vs New Mexico | W, 14-6",
 "Final Sep 26 Oklahoma at Georgia | L, 13-41",
 "Upcoming Oct 10, 2:30 PM Oklahoma vs Texas | ",
 "Upcoming Oct 17, 6:30 PM Oklahoma vs Kentucky | ",
 "Upcoming Oct 24 Oklahoma at Mississippi State | ",
 "Upcoming Oct 31 Oklahoma vs South Carolina | ",
 "Upcoming Nov 7 Oklahoma at Florida | ",
 "Upcoming Nov 14 Oklahoma vs Ole Miss | ",
 "Upcoming Nov 21 Oklahoma vs Texas A&M | ",
 "Upcoming Nov 28 Oklahoma at Missouri | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 8 Women's · Oklahoma at The Bruzzy | 1st of 11",
 "Final Sep 19 Women's · Oklahoma at Schooner Fall Classic | 2nd of 16",
 "Final Sep 29 Women's · Oklahoma at NB3 Matchplay | Match play: 2-0-1",
 "Final Oct 5 Women's · Oklahoma at OU Intercollegiate Presented by PDI | 1st of 11",
 "Upcoming Oct 19 Women's · Oklahoma at The Fin | ",
 "Upcoming Feb 1 Women's · Oklahoma at Paradise Invitational | ",
 "Upcoming Feb 14 Women's · Oklahoma at Spartan Sun Coast Invitational | ",
 "Upcoming Mar 6 Women's · Oklahoma at Gator Invitational | ",
 "Upcoming Mar 20 Women's · Oklahoma at FSU Match Up | ",
 "Upcoming Apr 5 Women's · Oklahoma at Huntington Bank Collegiate | ",
 "Upcoming Apr 16 Women's · Oklahoma at SEC Championship | ",
 "Upcoming May 10 Women's · Oklahoma at NCAA Regional | ",
 "Upcoming May 21 Women's · Oklahoma at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Oklahoma at Inverness Intercollegiate | T10th of 18",
 "Final Sep 20 Men's · Oklahoma at Gopher Invitational | 2nd of 15",
 "Final Sep 28 Men's · Oklahoma at Ben Hogan Collegiate | 10th of 16",
 "Upcoming Oct 18 Men's · Oklahoma at Williams Cup | ",
 "Upcoming Oct 26 Men's · Oklahoma at Ka'anapali Classic | ",
 "Upcoming Feb 13 Men's · Oklahoma at Gators Invitational | ",
 "Upcoming Feb 28 Men's · Oklahoma at Las Vegas Invitational | ",
 "Upcoming Mar 15 Men's · Oklahoma at Arizona Thunderbirds Collegiate | ",
 "Upcoming Mar 22 Men's · Oklahoma at Valspar Collegiate Invitational | ",
 "Upcoming Mar 30 Men's · Oklahoma at Maridoe Collegiate | ",
 "Upcoming Apr 9 Men's · Oklahoma at Aggie Invitational | ",
 "Upcoming Apr 21 Men's · Oklahoma at SEC Championship | ",
 "Upcoming May 17 Men's · Oklahoma at NCAA Regionals | ",
 "Upcoming May 28 Men's · Oklahoma at NCAA Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Nov 1, 9:00 AM Oklahoma vs Princeton Chase | ",
 "Upcoming Nov 3, 9:00 AM Oklahoma at Columbia University | "
]);
  const v_soccer=parse("Soccer","soccer");
  assert.deepEqual(v_soccer.map(line),[
 "Final Aug 12 Oklahoma vs Northwestern State | W, 9-0",
 "Final Aug 16 Oklahoma at East Texas A&M | W, 2-0",
 "Final Aug 20 Oklahoma at Oklahoma State | W, 2-0",
 "Final Aug 23 Oklahoma vs Colorado College | W, 6-0",
 "Final Aug 27 Oklahoma vs Tulsa | W, 4-1",
 "Final Aug 30 Oklahoma at Oral Roberts | T, 1-1",
 "Final Sep 3 Oklahoma at North Texas | W, 6-2",
 "Final Sep 5 Oklahoma at BYU | T, 1-1",
 "Final Sep 11 Oklahoma vs Missouri | W, 3-1",
 "Final Sep 18 Oklahoma at Georgia | W, 3-1",
 "Final Sep 24 Oklahoma vs LSU | W, 3-1",
 "Final Sep 27 Oklahoma vs Alabama | L, 1-3",
 "Final Oct 4 Oklahoma at Texas | L, 1-2",
 "Upcoming Oct 9, 7:00 PM Oklahoma vs RV/- Auburn | ",
 "Upcoming Oct 15, 6:00 PM Oklahoma at Mississippi State | ",
 "Upcoming Oct 18, 3:00 PM Oklahoma at Ole Miss | ",
 "Upcoming Oct 23, 7:00 PM Oklahoma vs Arkansas | ",
 "Upcoming Nov 1, 1:00 PM Oklahoma at Tennessee | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 6:30 PM Oklahoma vs University of Science and Arts (Okla.) (Exhibition) | ",
 "Upcoming Oct 30, 6:30 PM Oklahoma vs Seminole State (Exhibition) | ",
 "Upcoming Nov 4, 6:00 PM Oklahoma vs East Texas A&M | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Oklahoma at ITA All-American Championships | Completed",
 "Upcoming Oct 15 Women's · Oklahoma at ITA Regional Championships | ",
 "Upcoming Oct 22 Women's · Oklahoma at TCU JAE Foundation Invitational | ",
 "Upcoming Nov 5 Women's · Oklahoma at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Oklahoma at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Oklahoma at ITA All-American Championships | Completed",
 "Today Oct 7 Men's · Oklahoma at ITA Central Regional Championships | ",
 "Upcoming Oct 12 Men's · Oklahoma at Austin 25K | ",
 "Upcoming Oct 19 Men's · Oklahoma at Fort Worth 75K | ",
 "Upcoming Nov 2 Men's · Oklahoma at Hilton Head 15K | ",
 "Upcoming Nov 2 Men's · Oklahoma at Charlottesville Challenger | ",
 "Upcoming Nov 5 Men's · Oklahoma at ITA Sectional Championships | ",
 "Upcoming Nov 9 Men's · Oklahoma at Naples 15K | ",
 "Upcoming Nov 9 Men's · Oklahoma at Knoxville Challenger | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_volleyball=parse("Volleyball","volleyball");
  assert.deepEqual(v_volleyball.map(line),[
 "Final Aug 28 Oklahoma at Texas State | W, 3-0",
 "Final Aug 29 Oklahoma vs Louisiana | W, 3-0",
 "Final Sep 3 Oklahoma vs Ohio State | W, 3-2",
 "Final Sep 4 Oklahoma vs Washington | L, 1-3",
 "Final Sep 8 Oklahoma at Georgia Tech | L, 1-3",
 "Final Sep 13 Oklahoma vs Abilene Christian | W, 3-0",
 "Final Sep 15 Oklahoma vs East Texas A&M | W, 3-0",
 "Final Sep 17 Oklahoma at Western Kentucky | W, 3-2",
 "Final Sep 18 Oklahoma vs East Tennessee State | W, 3-2",
 "Final Sep 27 Oklahoma vs Florida | L, 0-3",
 "Final Oct 2 Oklahoma at South Carolina | W, 3-1",
 "Final Oct 4 Oklahoma at Georgia | L, 1-3",
 "Final Oct 7 Oklahoma vs Texas A&M | W, 3-2",
 "Upcoming Oct 11, 2:00 PM Oklahoma vs Texas | ",
 "Upcoming Oct 16, 6:00 PM Oklahoma vs Kentucky | ",
 "Upcoming Oct 18, 2:00 PM Oklahoma vs Tennessee | ",
 "Upcoming Oct 23, 5:00 PM Oklahoma at Mississippi State | ",
 "Upcoming Oct 25, 2:00 PM Oklahoma at Alabama | ",
 "Upcoming Oct 30, 6:00 PM Oklahoma at Arkansas | ",
 "Upcoming Nov 1, 2:00 PM Oklahoma at Auburn | ",
 "Upcoming Nov 6, 3:00 PM Oklahoma at Ole Miss | ",
 "Upcoming Nov 8, 1:00 PM Oklahoma at LSU | ",
 "Upcoming Nov 13, 6:00 PM Oklahoma vs Missouri | ",
 "Upcoming Nov 15, 2:00 PM Oklahoma vs Vanderbilt | ",
 "Upcoming Nov 20 Oklahoma at SEC Volleyball Tournament | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Oct 23, 5:00 PM Oklahoma vs Crimson & Cream Dual | ",
 "Upcoming Nov 1, 2:00 PM Oklahoma vs Northeastern State | ",
 "Upcoming Nov 8, 2:00 PM Oklahoma at Northern Colorado | ",
 "Upcoming Nov 15, 6:00 PM Oklahoma vs Penn State | ",
 "Upcoming Nov 20, 7:00 PM Oklahoma at Indiana | ",
 "Upcoming Dec 12 Oklahoma at National Duals Invitational | ",
 "Upcoming Jan 2 Oklahoma at Southern Scuffle | ",
 "Upcoming Jan 8, 7:00 PM Oklahoma vs Missouri | ",
 "Upcoming Jan 10, 2:00 PM Oklahoma vs Rider | ",
 "Upcoming Jan 17, 2:00 PM Oklahoma at Arizona State | ",
 "Upcoming Jan 24, 2:00 PM Oklahoma vs Oklahoma State | ",
 "Upcoming Jan 29, 7:00 PM Oklahoma at Iowa State | ",
 "Upcoming Jan 30, 7:00 PM Oklahoma at Northern Iowa | ",
 "Upcoming Feb 7, 1:00 PM Oklahoma at West Virginia | ",
 "Upcoming Feb 12, 7:00 PM Oklahoma vs Utah Valley | ",
 "Upcoming Feb 14, 2:00 PM Oklahoma vs Wyoming | ",
 "Upcoming Mar 5 Oklahoma at Big 12 Wrestling Championship | ",
 "Upcoming Mar 18 Oklahoma at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_soccer,"Soccer soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_volleyball,"Volleyball volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};
const records=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records.map(r=>[r.text,r.conference?.text]).flat();

// Golf: the place in the field, then the team score to par ("1st/11 - 831
// (-33)"; men's golf without a suffix, "10/16 - 864 (+24)"); match play (the
// NB3 Matchplay) reads as its matches.
{
  const final=slug=>parse('Golf',slug).filter(e=>e.status==='Final').map(e=>[e.opponent,e.headline,e.results.map(r=>`${r.label}: ${r.value ?? r.result}`).join(' / ')]);
  assert.deepEqual(final('womens-golf'),[["The Bruzzy","1st of 11","Result: 1st of 11 / Team score: 831 (-33)"],["Schooner Fall Classic","2nd of 16","Result: 2nd of 16 / Team score: 827 (-13)"],["NB3 Matchplay","Match play: 2-0-1","vs New Mexico: W, 4-1 / vs New Mexico State: W, 4-1 / vs NC State: T, 2.5-2.5"],["OU Intercollegiate Presented by PDI","1st of 11","Result: 1st of 11 / Team score: 839 (-13)"]]);
  assert.deepEqual(final('mens-golf'),[["Inverness Intercollegiate","T10th of 18","Result: T10th of 18 / Team score: 876 (+24)"],["Gopher Invitational","2nd of 15","Result: 2nd of 15 / Team score: 849 (-3)"],["Ben Hogan Collegiate","10th of 16","Result: 10th of 16 / Team score: 864 (+24)"]]);
}

// Internal events are not listed (baseball's Fall World Series, softball's
// Battle Series); "#-/22 Texas" is a two-poll ranking; "Southern Nazarene -
// EXH" is an exhibition; the tennis pages' pro events ("W75 Templeton",
// "Columbia Futures 15K") are the players', not the team's.
{
  assert.equal(parse('Baseball','baseball').filter(e=>/World Series/.test(e.opponent)).length,0);
  assert.equal(parse('Softball','softball').filter(e=>/Battle Series/.test(e.opponent)).length,0);
  assert.ok(parse('Soccer','soccer').some(e=>e.title==='Oklahoma at Texas'));
  assert.ok(parse('Basketball','womens-basketball').some(e=>e.opponent==='Southern Nazarene (Exhibition)'));
  for(const slug of ['womens-tennis','mens-tennis'])assert.equal(parse('Tennis',slug).filter(e=>/^[WM]\d|Futures|ITF/.test(e.opponent)).length,0,slug);
}

// Cross Country: TFRRS gives both teams' places.
{
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  fromTfrrs({Women:'https://www.tfrrs.org/teams/xc/OK_college_f_Oklahoma.html',Men:'https://www.tfrrs.org/teams/xc/OK_college_m_Oklahoma.html'});
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Cowboy Preview","Women's team: 2nd · 61 pts / Men's team: 2nd · 57 pts",true],["Cowboy Jamboree","Women's team: 5th · 158 pts / Men's: Ronald Ngetich 12th",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for Oklahoma's game only.
{
  live('Football','football-espn-2026-09-26.json.gz',parse('Football','football'),new Date('2026-09-27T12:00:00Z'),[["Oklahoma at Georgia","Final","L, 13-41"]]);
  live('Volleyball','volleyball-espn-2026-10-07.json.gz',parse('Volleyball','volleyball'),new Date('2026-10-08T12:00:00Z'),[["Oklahoma vs Texas A&M","Final","W, 3-2"]]);
  live('Soccer','soccer-espn-2026-10-04.json.gz',parse('Soccer','soccer'),new Date('2026-10-05T12:00:00Z'),[["Oklahoma at Texas","Final","L, 1-2"]]);
}

// Records equal the ones the official pages publish (volleyball .692 and SEC
// .500; soccer .769 and SEC .600); football's are counted from its finals
// (2-2: UTEP, New Mexico; SEC 0-1: Georgia).
assert.deepEqual([['Football','football'],['Volleyball','volleyball'],['Soccer','soccer']].map(([sport,slug])=>records(sport,slug)),[["2-2","0-1"],["9-4","2-2"],["9-2-2","3-2"]]);

// Other schools and other hosts never reach the Oklahoma reader.
assert.equal(worker.oklahomaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://soonersports.com/',now),null);
assert.equal(worker.oklahomaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Oklahoma module checks passed');
