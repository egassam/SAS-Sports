import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westVirginiaSchool} from '../src/schools/west-virginia.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='west-virginia');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,westVirginiaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/west-virginia-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit wvusports.com routes, each
// corrected to the official pages (generic and homepage candidates dropped).
const sports=sponsoredSports['west-virginia'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',westVirginiaSchool.scheduleUrls],['roster',westVirginiaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('west-virginia|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'wvusports.com',`${key} must stay on wvusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://wvusports.com/sports/baseball/schedule"],"roster":["https://wvusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://wvusports.com/sports/mens-basketball/schedule","https://wvusports.com/sports/womens-basketball/schedule"],"roster":["https://wvusports.com/sports/mens-basketball/roster","https://wvusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://wvusports.com/sports/womens-cross-country/schedule"],"roster":["https://wvusports.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://wvusports.com/sports/football/schedule"],"roster":["https://wvusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://wvusports.com/sports/mens-golf/schedule"],"roster":["https://wvusports.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://wvusports.com/sports/womens-gymnastics/schedule"],"roster":["https://wvusports.com/sports/womens-gymnastics/roster"],"combined":false},"Rifle":{"schedule":["https://wvusports.com/sports/rifle/schedule"],"roster":["https://wvusports.com/sports/rifle/roster"],"combined":false},"Rowing":{"schedule":["https://wvusports.com/sports/womens-rowing/schedule"],"roster":["https://wvusports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://wvusports.com/sports/womens-soccer/schedule"],"roster":["https://wvusports.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://wvusports.com/sports/womens-swimming-and-diving/schedule","https://wvusports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://wvusports.com/sports/womens-swimming-and-diving/roster","https://wvusports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://wvusports.com/sports/womens-tennis/schedule"],"roster":["https://wvusports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://wvusports.com/sports/womens-track-and-field/schedule"],"roster":["https://wvusports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://wvusports.com/sports/womens-volleyball/schedule"],"roster":["https://wvusports.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://wvusports.com/sports/wrestling/schedule"],"roster":["https://wvusports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'west-virginia|"+sport+"':"),`${sport} routes must live in the West Virginia module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://wvusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.westVirginiaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 17 WVU vs Wright State (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM WVU at Wake Forest (Exhibition) | ",
 "Upcoming Feb 26, 3:00 PM WVU vs Indiana State | ",
 "Upcoming Feb 27, 11:00 AM WVU vs St. John's | ",
 "Upcoming Feb 28, 3:00 PM WVU vs Michigan | ",
 "Upcoming Mar 19 WVU at Houston | ",
 "Upcoming Mar 20 WVU at Houston | ",
 "Upcoming Mar 21 WVU at Houston | ",
 "Upcoming Mar 25, 6:30 PM WVU vs Kansas | ",
 "Upcoming Mar 26, 6:30 PM WVU vs Kansas | ",
 "Upcoming Mar 27, 1:00 PM WVU vs Kansas | ",
 "Upcoming Apr 2, 6:00 PM WVU at UCF | ",
 "Upcoming Apr 3, 6:00 PM WVU at UCF | ",
 "Upcoming Apr 4, 1:00 PM WVU at UCF | ",
 "Upcoming Apr 9, 6:30 PM WVU vs Arizona State | ",
 "Upcoming Apr 10, 4:00 PM WVU vs Arizona State | ",
 "Upcoming Apr 11, 1:00 PM WVU vs Arizona State | ",
 "Upcoming Apr 16, 6:30 PM WVU vs Baylor | ",
 "Upcoming Apr 17, 4:00 PM WVU vs Baylor | ",
 "Upcoming Apr 18, 1:00 PM WVU vs Baylor | ",
 "Upcoming Apr 22, 8:00 PM WVU at BYU | ",
 "Upcoming Apr 23, 8:00 PM WVU at BYU | ",
 "Upcoming Apr 24, 3:00 PM WVU at BYU | ",
 "Upcoming Apr 30, 6:30 PM WVU vs Cincinnati | ",
 "Upcoming May 1, 4:00 PM WVU vs Cincinnati | ",
 "Upcoming May 2, 1:00 PM WVU vs Cincinnati | ",
 "Upcoming May 7 WVU at Arizona | ",
 "Upcoming May 8 WVU at Arizona | ",
 "Upcoming May 9 WVU at Arizona | ",
 "Upcoming May 12, 5:30 PM WVU vs Virginia | ",
 "Upcoming May 14, 6:30 PM WVU vs Oklahoma State | ",
 "Upcoming May 15, 4:00 PM WVU vs Oklahoma State | ",
 "Upcoming May 16, 1:00 PM WVU vs Oklahoma State | ",
 "Upcoming May 20, 7:00 PM WVU at TCU | ",
 "Upcoming May 21, 7:00 PM WVU at TCU | ",
 "Upcoming May 22, 5:00 PM WVU at TCU | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 18, 3:00 PM Men's · WVU at Maryland (exhibition) | ",
 "Upcoming Oct 23, 7:00 PM Men's · WVU at Glenville State (exhibition) | ",
 "Upcoming Oct 28, 7:00 PM Men's · WVU vs Wheeling (exhibition) | ",
 "Upcoming Nov 2 Men's · WVU vs Niagara | ",
 "Upcoming Nov 6 Men's · WVU vs Stetson | ",
 "Upcoming Nov 12 Men's · WVU vs Mercer | ",
 "Upcoming Nov 17, 11:59 PM Men's · WVU vs Auburn | ",
 "Upcoming Nov 18 Men's · WVU vs Kansas or UNLV | ",
 "Upcoming Nov 19 Men's · WVU vs Houston, Rutgers, Florida or Notre Dame | ",
 "Upcoming Nov 27, 7:00 PM Men's · WVU vs North Carolina | ",
 "Upcoming Dec 1 Men's · WVU vs Mercyhurst | ",
 "Upcoming Dec 5 Men's · WVU vs Virginia Tech | ",
 "Upcoming Dec 9, 6:00 PM Men's · WVU vs Pitt | ",
 "Upcoming Dec 13 Men's · WVU vs Coppin State | ",
 "Upcoming Dec 16 Men's · WVU vs Northern Arizona | ",
 "Upcoming Dec 19, 3:30 PM Men's · WVU vs Wake Forest | ",
 "Upcoming Dec 21 Men's · WVU vs South Carolina State | ",
 "Upcoming Jan 2 Men's · WVU at Kansas | ",
 "Upcoming Jan 5 Men's · WVU vs Oklahoma State | ",
 "Upcoming Jan 9 Men's · WVU at Colorado | ",
 "Upcoming Jan 12 Men's · WVU vs Kansas State | ",
 "Upcoming Jan 16 Men's · WVU vs Cincinnati | ",
 "Upcoming Jan 20 Men's · WVU at Utah | ",
 "Upcoming Jan 23 Men's · WVU at BYU | ",
 "Upcoming Jan 27 Men's · WVU vs Arizona State | ",
 "Upcoming Jan 30 Men's · WVU vs Arizona | ",
 "Upcoming Feb 3 Men's · WVU at UCF | ",
 "Upcoming Feb 6 Men's · WVU vs Iowa State | ",
 "Upcoming Feb 13 Men's · WVU at Texas Tech | ",
 "Upcoming Feb 16 Men's · WVU vs UCF | ",
 "Upcoming Feb 20 Men's · WVU at Baylor | ",
 "Upcoming Feb 24 Men's · WVU at Cincinnati | ",
 "Upcoming Feb 27 Men's · WVU vs Houston | ",
 "Upcoming Mar 3 Men's · WVU vs TCU | ",
 "Upcoming Mar 6 Men's · WVU at Iowa State | ",
 "Upcoming Mar 9 Men's · WVU at Big 12 Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 7:00 PM Women's · WVU vs Frostburg State (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Women's · WVU vs Rhode Island | ",
 "Upcoming Nov 5, 7:00 PM Women's · WVU vs George Washington | ",
 "Upcoming Nov 8 Women's · WVU at Georgia Tech | ",
 "Upcoming Nov 13, 5:30 PM Women's · WVU vs Northwestern | ",
 "Upcoming Nov 17, 10:30 AM Women's · WVU vs Akron | ",
 "Upcoming Nov 24, 3:30 PM Women's · WVU vs Florida | ",
 "Upcoming Nov 26, 11:30 AM Women's · WVU vs Notre Dame | ",
 "Upcoming Nov 30, 7:00 PM Women's · WVU vs Coppin State | ",
 "Upcoming Dec 3, 7:00 PM Women's · WVU vs Mount St. Mary's | ",
 "Upcoming Dec 4, 7:00 PM Women's · WVU vs Harvard | ",
 "Upcoming Dec 12, 6:00 PM Women's · WVU at Villanova | ",
 "Upcoming Dec 15, 7:00 PM Women's · WVU vs Robert Morris | ",
 "Upcoming Dec 20, 2:00 PM Women's · WVU at UCF | ",
 "Upcoming Dec 30 Women's · WVU vs Kansas | ",
 "Upcoming Jan 3 Women's · WVU at Oklahoma State | ",
 "Upcoming Jan 6 Women's · WVU at Houston | ",
 "Upcoming Jan 10 Women's · WVU vs TCU | ",
 "Upcoming Jan 13 Women's · WVU vs Kansas State | ",
 "Upcoming Jan 17 Women's · WVU at Baylor | ",
 "Upcoming Jan 20 Women's · WVU vs Colorado | ",
 "Upcoming Jan 23 Women's · WVU vs Iowa State | ",
 "Upcoming Jan 27 Women's · WVU at Texas Tech | ",
 "Upcoming Jan 30 Women's · WVU vs Cincinnati | ",
 "Upcoming Feb 3 Women's · WVU at Arizona State | ",
 "Upcoming Feb 6 Women's · WVU at Arizona | ",
 "Upcoming Feb 9 Women's · WVU vs Utah | ",
 "Upcoming Feb 15 Women's · WVU at TCU | ",
 "Upcoming Feb 20 Women's · WVU vs Texas Tech | ",
 "Upcoming Feb 23 Women's · WVU vs BYU | ",
 "Upcoming Feb 27 Women's · WVU at Cincinnati | ",
 "Upcoming Mar 3 Women's · WVU at Big 12 Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 11 WVU at RMU Invitational | Women's team: 1st",
 "Final Sep 19 WVU at John McNichols Invitational | Women's team: 2nd",
 "Upcoming Oct 9, 11:30 AM WVU at Nuttycombe Invitational | ",
 "Upcoming Oct 10, 10:45 AM WVU at Carnegie Mellon Invitational | ",
 "Upcoming Oct 31, 11:00 AM WVU at Big 12 Championships | ",
 "Upcoming Nov 13 WVU at NCAA Mid-Atlantic Regional | ",
 "Upcoming Nov 21 WVU at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 WVU vs Coastal Carolina | W, 31-24",
 "Final Sep 12 WVU vs UT Martin | W, 52-7",
 "Final Sep 19 WVU vs Virginia | W, 38-27",
 "Final Sep 26 WVU vs Oklahoma State | L, 24-41",
 "Final Oct 3 WVU at Iowa State | L, 42-45",
 "Upcoming Oct 10, 12:00 PM WVU vs Arizona | ",
 "Upcoming Oct 17, 12:00 PM WVU vs Cincinnati | ",
 "Upcoming Oct 24 WVU at TCU | ",
 "Upcoming Nov 7 WVU at Texas Tech | ",
 "Upcoming Nov 14 WVU vs Kansas | ",
 "Upcoming Nov 21 WVU vs Houston | ",
 "Upcoming Nov 27, 9:00 PM WVU at Utah | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 31 WVU at New York Harbor Cup | 8th",
 "Final Sep 6 WVU at Island Resort Collegiate | 2nd",
 "Final Sep 20 WVU at Gopher Invitational | T6th",
 "Final Oct 5 WVU at Nemacolin Collegiate Invitational | 3rd",
 "Upcoming Oct 12 WVU at Big 12 Match Play Championship | ",
 "Upcoming Nov 4 WVU at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 7 WVU at Dorado Beach Collegiate | ",
 "Upcoming Feb 15 WVU at Battle at Briar's Creek | ",
 "Upcoming Mar 19 WVU at Schenkel Invitational | ",
 "Upcoming Mar 28 WVU at Bulls Bay Rodeo Intercollegiate | ",
 "Upcoming Apr 12 WVU at Mountaineer Invitational | ",
 "Upcoming Apr 26 WVU at Big 12 Golf Championship | ",
 "Upcoming May 17 WVU at NCAA Regionals | ",
 "Upcoming May 28 WVU at NCAA Championship | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 26 WVU vs Mount Aloysius | W, 4737-4587",
 "Final Oct 3 WVU at Army | W, 4750-4665",
 "Final Oct 4 WVU vs Norwich | W, 4756-4380",
 "Final Oct 4 WVU vs John Jay | W, 4756-4329",
 "Upcoming Oct 17, 9:00 AM WVU at Georgia Southern | ",
 "Upcoming Oct 18, 9:00 AM WVU at Georgia Southern | ",
 "Upcoming Oct 18, 9:00 AM WVU at UAB | ",
 "Upcoming Oct 24, 9:00 AM WVU at Memphis | ",
 "Upcoming Nov 14, 11:00 AM WVU at Kentucky | ",
 "Upcoming Nov 14, 11:00 AM WVU at Nebraska | ",
 "Upcoming Nov 14, 11:00 AM WVU at TCU | ",
 "Upcoming Nov 14, 11:00 AM WVU at Ole Miss | ",
 "Upcoming Jan 15 WVU at Alaska Fairbanks | ",
 "Upcoming Jan 16 WVU at Alaska Fairbanks | ",
 "Upcoming Jan 23 WVU at Navy | ",
 "Upcoming Jan 30 WVU at Akron | ",
 "Upcoming Feb 13 WVU at Kentucky | ",
 "Upcoming Feb 20 WVU at NCAA Qualifying Match (VMI) | ",
 "Upcoming Feb 27 WVU at GARC Championship (SB) | ",
 "Upcoming Feb 28 WVU at GARC Championship (AR) | ",
 "Upcoming Mar 12 WVU at NCAA Championships (SB) | ",
 "Upcoming Mar 13 WVU at NCAA Championships (AR) | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 WVU vs Dayton | W, 2-0",
 "Final Aug 20 WVU vs Penn State | W, 2-1",
 "Final Aug 23 WVU vs Duquesne | W, 2-0",
 "Final Aug 30 WVU at Army | W, 2-1",
 "Final Sep 6 WVU vs Marshall | W, 1-0",
 "Final Sep 13 WVU vs UCONN | T, 1-1",
 "Final Sep 18 WVU vs Baylor | T, 1-1",
 "Final Sep 24 WVU at Colorado | L, 0-2",
 "Final Sep 27 WVU at Iowa State | W, 2-0",
 "Final Oct 2 WVU at Houston | W, 2-0",
 "Upcoming Oct 8, 7:00 PM WVU vs BYU | ",
 "Upcoming Oct 11, 12:00 PM WVU vs Utah | ",
 "Upcoming Oct 16, 3:00 PM WVU vs UCF | ",
 "Upcoming Oct 22, 8:00 PM WVU at Texas Tech | ",
 "Upcoming Oct 25, 2:00 PM WVU at Oklahoma State | ",
 "Upcoming Oct 30, 7:00 PM WVU vs TCU | ",
 "Upcoming Nov 5, 7:00 PM WVU at Cincinnati | ",
 "Upcoming Nov 9 WVU at Big 12 Tournament | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · WVU vs Marshall | W, 214-61",
 "Upcoming Oct 23, 5:00 PM Women's · WVU vs Delaware | ",
 "Upcoming Oct 23, 5:00 PM Women's · WVU vs Cincinnati | ",
 "Upcoming Nov 6, 4:00 PM Women's · WVU at Clarion (diving only) | ",
 "Upcoming Nov 7, 11:00 AM Women's · WVU at Virginia | ",
 "Upcoming Nov 17 Women's · WVU at Ohio State Invitational | ",
 "Upcoming Dec 12 Women's · WVU at CSCAA Open Water Championships | ",
 "Upcoming Jan 9, 10:00 AM Women's · WVU at Pitt | ",
 "Upcoming Jan 16 Women's · WVU at Big 12 East Showdown | ",
 "Upcoming Jan 23, 10:00 AM Women's · WVU vs Duquesne | ",
 "Upcoming Jan 23, 10:00 AM Women's · WVU vs Villanova | ",
 "Upcoming Jan 30, 11:00 AM Women's · WVU at Penn State | ",
 "Upcoming Feb 23 Women's · WVU at Big 12 Championships | ",
 "Upcoming Mar 8 Women's · WVU at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 17 Women's · WVU at NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · WVU at Penn State | W, 217-134",
 "Final Oct 2 Men's · WVU at Virginia Tech | L, 87-266",
 "Upcoming Oct 23, 5:00 PM Men's · WVU vs Cincinnati | ",
 "Upcoming Oct 23, 5:00 PM Men's · WVU vs Delaware | ",
 "Upcoming Nov 6, 4:00 PM Men's · WVU at Clarion (diving only) | ",
 "Upcoming Nov 7, 11:00 AM Men's · WVU at Virginia | ",
 "Upcoming Nov 17 Men's · WVU at Ohio State Invitational | ",
 "Upcoming Dec 12 Men's · WVU at CSCAA Open Water Championships | ",
 "Upcoming Jan 9, 10:00 AM Men's · WVU at Pitt | ",
 "Upcoming Jan 16 Men's · WVU at Big 12 East Showdown | ",
 "Upcoming Jan 23, 10:00 AM Men's · WVU vs Villanova | ",
 "Upcoming Jan 30, 11:00 AM Men's · WVU at Penn State | ",
 "Upcoming Feb 23 Men's · WVU at Big 12 Championships | ",
 "Upcoming Mar 8 Men's · WVU at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 24 Men's · WVU at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 WVU at UTR Charleston | Completed",
 "Final Sep 25 WVU at Penn Invitational | Completed",
 "Final Oct 2 WVU at Martha Thorn Invitational | Completed",
 "Upcoming Oct 9, 12:00 PM WVU at Wahoowa Invitational | ",
 "Upcoming Oct 15 WVU at ITA Regionals | ",
 "Upcoming Oct 30 WVU at D1 Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 22 WVU at James Madison (Exhibition) | L, 2-3",
 "Final Aug 28 WVU vs UTRGV | W, 3-1",
 "Final Aug 30 WVU vs UMBC | L, 2-3",
 "Final Sep 4 WVU vs FAU | W, 3-2",
 "Final Sep 5 WVU at FGCU | W, 3-1",
 "Final Sep 10 WVU vs VCU | W, 3-1",
 "Final Sep 11 WVU vs Lehigh | L, 2-3",
 "Final Sep 11 WVU vs Toledo | L, 2-3",
 "Final Sep 17 WVU vs East Texas A&M | W, 3-1",
 "Final Sep 18 WVU at North Texas | W, 3-1",
 "Final Sep 19 WVU vs Tarleton State | W, 3-0",
 "Final Sep 25 WVU vs Arizona State | W, 3-2",
 "Final Sep 27 WVU vs TCU | L, 1-3",
 "Final Oct 2 WVU at Texas Tech | W, 3-2",
 "Final Oct 4 WVU vs Houston | L, 1-3",
 "Upcoming Oct 8, 9:00 PM WVU at Utah | ",
 "Upcoming Oct 10, 8:30 PM WVU at BYU | ",
 "Upcoming Oct 16, 6:00 PM WVU vs Cincinnati | ",
 "Upcoming Oct 18, 1:00 PM WVU at UCF | ",
 "Upcoming Oct 23, 6:00 PM WVU vs Arizona | ",
 "Upcoming Oct 30, 7:00 PM WVU at Iowa State | ",
 "Upcoming Nov 1, 1:00 PM WVU at Cincinnati | ",
 "Upcoming Nov 8, 1:00 PM WVU vs Colorado | ",
 "Upcoming Nov 12, 7:00 PM WVU at Houston | ",
 "Upcoming Nov 15, 1:00 PM WVU vs UCF | ",
 "Upcoming Nov 20, 7:00 PM WVU at Kansas | ",
 "Upcoming Nov 22, 2:00 PM WVU at Kansas State | ",
 "Upcoming Nov 25, 2:00 PM WVU vs Baylor | ",
 "Upcoming Nov 27, 3:00 PM WVU vs Texas Tech | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 WVU at Southeast Open | ",
 "Upcoming Nov 7, 7:00 PM WVU vs Mercyhurst | ",
 "Upcoming Nov 15 WVU vs Hofstra | ",
 "Upcoming Nov 15, 12:00 PM WVU at Brown | ",
 "Upcoming Nov 19, 7:00 PM WVU at Utah Valley | ",
 "Upcoming Nov 22, 1:00 PM WVU vs American | ",
 "Upcoming Dec 4 WVU at Cliff Keen Las Vegas Invitational | ",
 "Upcoming Dec 13, 2:00 PM WVU at Penn State | ",
 "Upcoming Dec 18, 7:00 PM WVU vs Northern Iowa | ",
 "Upcoming Dec 20, 2:00 PM WVU at Edinboro | ",
 "Upcoming Jan 9, 7:00 PM WVU vs North Carolina | ",
 "Upcoming Jan 14, 7:00 PM WVU at Missouri | ",
 "Upcoming Jan 17, 2:00 PM WVU at Oklahoma State | ",
 "Upcoming Jan 22, 8:00 PM WVU vs Iowa State | ",
 "Upcoming Jan 24, 1:00 PM WVU vs Arizona State | ",
 "Upcoming Jan 29, 7:00 PM WVU at Wyoming | ",
 "Upcoming Feb 7, 1:00 PM WVU vs Oklahoma | ",
 "Upcoming Feb 21, 1:00 PM WVU vs Lock Haven | ",
 "Upcoming Mar 5 WVU at Big 12 Wrestling Championships | ",
 "Upcoming Mar 18 WVU at NCAA Championships | "
]);
  // Each final matches only its own recap.
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");

  // Tennis and wrestling list a tournament once per day: one event each.
  assert.deepEqual(v_womenstennis.filter(e=>e.status==='Final').map(e=>[e.opponent,e.start_time.slice(0,10),e.end_time.slice(0,10)]),[['UTR Charleston','2026-09-18','2026-09-20'],['Penn Invitational','2026-09-25','2026-09-27'],['Martha Thorn Invitational','2026-10-02','2026-10-04']]);
  assert.equal(v_wrestling.filter(e=>e.opponent==='NCAA Championships').length,1);
  // The intrasquad "Wrestle Off" is not a meet.
  assert.ok(!v_wrestling.some(e=>/Wrestle Off/i.test(e.title)));
  // Golf writes its place alone ("T-6th Place", the last round's).
  assert.equal(v_mensgolf.find(e=>e.opponent==='Gopher Invitational').headline,'T6th');
  // Gymnastics, rowing and track still list the 2025-26 season.
  assert.deepEqual([v_womensgymnastics,v_womensrowing,v_womenstrackandfield],[[],[],[]]);
}

// Cross Country: TFRRS adds West Virginia's results to both meets; the
// schedule's "RMU Invitational" is TFRRS's "RMU Colonial Cross Country
// Invitational".
{
  const xc=parse('Cross Country','womens-cross-country').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/WV_college_f_West_Virginia.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/results/xc/27786/RMU_Colonial_Cross_Country_Invitational','tfrrs-27786.html.gz'],['https://www.tfrrs.org/results/xc/27812/John_McNichols_Invitational','tfrrs-27812.html.gz']])recapFixtures.set(url,fixture(file));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline]),[['RMU Invitational',"Women's team: 1st \u00b7 36 pts"],['John McNichols Invitational',"Women's team: 2nd \u00b7 74 pts"]]);
  recapFixtures.clear();
}

// Live: ESPN joins the official card for West Virginia's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['WVU at Iowa State','Final','L, 42-45']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['WVU vs Houston','Final','L, 1-3']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['WVU at Houston','Final','W, 2-0']]);
}

// Records: each sport's overall and Big 12 record equals the one its page publishes.
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
    return holder?[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')]:null;
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug] of [['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer']]){
    const [overall,conference]=published(slug);
    assert.deepEqual(record(sport,slug).map(r=>[r.text,r.conference?.text]),[[overall,conference]],`${sport}: the computed records are the official ones (${overall}, ${conference} Big 12)`);
  }
  // The volleyball exhibition at James Madison is not in the record.
  assert.equal(published('womens-volleyball')[0],'9-5');
}

// Other schools and other hosts never reach the West Virginia reader.
assert.equal(worker.westVirginiaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://wvusports.com/',now),null);
assert.equal(worker.westVirginiaHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('football'),now),null);
requests.length=0;

assert.equal(requests.length,0,'no unexpected network requests');
console.log('West Virginia module checks passed');
