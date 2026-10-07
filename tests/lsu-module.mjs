import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lsuSchool,lsuSeasonYear,lsuGolfPlace} from '../src/schools/lsu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='lsu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,lsuHandlers,rosterProfiles,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/lsu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit lsusports.net routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['lsu'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',lsuSchool.scheduleUrls],['roster',lsuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('lsu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'lsusports.net',`${key} must stay on lsusports.net`);
  }
}
const parity={"Baseball":{"schedule":["https://lsusports.net/sports/bsb/schedule"],"roster":["https://lsusports.net/sports/bsb/roster"],"combined":false},"Basketball":{"schedule":["https://lsusports.net/sports/mb/schedule","https://lsusports.net/sports/wbball/schedule"],"roster":["https://lsusports.net/sports/mb/roster","https://lsusports.net/sports/wbball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://lsusports.net/sports/bvb/schedule"],"roster":["https://lsusports.net/sports/bvb/roster"],"combined":false},"Cross Country":{"schedule":["https://lsusports.net/sports/xc/schedule"],"roster":["https://lsusports.net/sports/xc/roster"],"combined":false},"Football":{"schedule":["https://lsusports.net/sports/fb/schedule"],"roster":["https://lsusports.net/sports/fb/roster"],"combined":false},"Golf":{"schedule":["https://lsusports.net/sports/mg/schedule","https://lsusports.net/sports/wg/schedule"],"roster":["https://lsusports.net/sports/mg/roster","https://lsusports.net/sports/wg/roster"],"combined":true},"Gymnastics":{"schedule":["https://lsusports.net/sports/gm/schedule"],"roster":["https://lsusports.net/sports/gm/roster"],"combined":false},"Soccer":{"schedule":["https://lsusports.net/sports/sc/schedule"],"roster":["https://lsusports.net/sports/sc/roster"],"combined":false},"Softball":{"schedule":["https://lsusports.net/sports/sb/schedule"],"roster":["https://lsusports.net/sports/sb/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://lsusports.net/sports/sd/schedule"],"roster":["https://lsusports.net/sports/sd/roster"],"combined":false},"Tennis":{"schedule":["https://lsusports.net/sports/mt/schedule","https://lsusports.net/sports/wt/schedule"],"roster":["https://lsusports.net/sports/mt/roster","https://lsusports.net/sports/wt/roster"],"combined":true},"Track & Field":{"schedule":["https://lsusports.net/sports/tf/schedule"],"roster":["https://lsusports.net/sports/tf/roster"],"combined":false},"Volleyball":{"schedule":["https://lsusports.net/sports/vb/schedule"],"roster":["https://lsusports.net/sports/vb/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'lsu|"+sport+"':"),`${sport} routes must live in the LSU module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const page=slug=>`https://lsusports.net/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.lsuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=lsu)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_bsb=parse("Baseball","bsb");
  assert.deepEqual(v_bsb.map(line),[
 "Upcoming Oct 31, 3:00 PM LSU vs Samford (Exhibition) | ",
 "Upcoming Nov 1, 1:00 PM LSU vs Samford (Exhibition) | ",
 "Upcoming Nov 8, 1:00 PM LSU vs Troy (Exhibition) | ",
 "Upcoming Nov 13 LSU vs Southeastern Louisiana (Exhibition) | ",
 "Upcoming Feb 19 LSU vs Long Island | ",
 "Upcoming Feb 20 LSU vs Long Island | ",
 "Upcoming Feb 21, 1:00 PM LSU vs Long Island | ",
 "Upcoming Feb 23, 6:00 PM LSU vs Milwaukee | ",
 "Upcoming Feb 26, 4:00 PM LSU vs The Citadel | ",
 "Upcoming Feb 27, 2:00 PM LSU vs The Citadel | ",
 "Upcoming Feb 28, 1:00 PM LSU vs The Citadel | ",
 "Upcoming Mar 2 LSU at Tulane | ",
 "Upcoming Mar 5, 8:00 PM LSU vs Oregon State | ",
 "Upcoming Mar 6, 8:00 PM LSU vs Arizona State | ",
 "Upcoming Mar 7, 7:00 PM LSU vs Iowa | ",
 "Upcoming Mar 8, 8:00 PM LSU at UNLV | ",
 "Upcoming Mar 12, 6:00 PM LSU vs Cornell | ",
 "Upcoming Mar 13, 6:00 PM LSU vs Cornell | ",
 "Upcoming Mar 14, 1:00 PM LSU vs Cornell | ",
 "Upcoming Mar 16, 6:00 PM LSU vs LSU New Orleans | ",
 "Upcoming Mar 19 LSU vs Texas | ",
 "Upcoming Mar 20 LSU vs Texas | ",
 "Upcoming Mar 21 LSU vs Texas | ",
 "Upcoming Mar 23, 6:00 PM LSU vs Southeastern Louisiana | ",
 "Upcoming Mar 25 LSU at Florida | ",
 "Upcoming Mar 26 LSU at Florida | ",
 "Upcoming Mar 27 LSU at Florida | ",
 "Upcoming Mar 30, 6:00 PM LSU vs Southern | ",
 "Upcoming Apr 2 LSU vs Vanderbilt | ",
 "Upcoming Apr 3 LSU vs Vanderbilt | ",
 "Upcoming Apr 4 LSU vs Vanderbilt | ",
 "Upcoming Apr 6, 6:00 PM LSU vs Grambling | ",
 "Upcoming Apr 9 LSU at Arkansas | ",
 "Upcoming Apr 10 LSU at Arkansas | ",
 "Upcoming Apr 11 LSU at Arkansas | ",
 "Upcoming Apr 13, 6:00 PM LSU vs Nicholls | ",
 "Upcoming Apr 16 LSU vs Ole Miss | ",
 "Upcoming Apr 17 LSU vs Ole Miss | ",
 "Upcoming Apr 18 LSU vs Ole Miss | ",
 "Upcoming Apr 20, 6:00 PM LSU vs UL-Lafayette | ",
 "Upcoming Apr 23 LSU at Texas A&M | ",
 "Upcoming Apr 24 LSU at Texas A&M | ",
 "Upcoming Apr 25 LSU at Texas A&M | ",
 "Upcoming Apr 27, 6:00 PM LSU vs McNeese | ",
 "Upcoming Apr 30 LSU vs Georgia | ",
 "Upcoming May 1 LSU vs Georgia | ",
 "Upcoming May 2 LSU vs Georgia | ",
 "Upcoming May 4, 6:00 PM LSU vs Louisiana Tech | ",
 "Upcoming May 7 LSU at Missouri | ",
 "Upcoming May 8 LSU at Missouri | ",
 "Upcoming May 9 LSU at Missouri | ",
 "Upcoming May 11, 6:00 PM LSU vs ULM | ",
 "Upcoming May 14 LSU vs Mississippi State | ",
 "Upcoming May 15 LSU vs Mississippi State | ",
 "Upcoming May 16 LSU vs Mississippi State | ",
 "Upcoming May 18, 6:00 PM LSU vs South Alabama | ",
 "Upcoming May 20 LSU at Kentucky | ",
 "Upcoming May 21 LSU at Kentucky | ",
 "Upcoming May 22 LSU at Kentucky | ",
 "Upcoming May 25 LSU vs SEC Tournament | ",
 "Upcoming Jun 4 LSU vs NCAA Regionals | ",
 "Upcoming Jun 11 LSU vs NCAA Super Regionals | ",
 "Upcoming Jun 18 LSU vs College World Series | "
]);
  const v_mb=parse("Basketball","mb");
  assert.deepEqual(v_mb.map(line),[
 "Upcoming Oct 8, 6:30 PM Men's · LSU at McNeese (Exhibition) | ",
 "Upcoming Oct 14, 7:00 PM Men's · LSU vs UCF (Exhibition) | ",
 "Upcoming Oct 24, 12:00 PM Men's · LSU at Florida State (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · LSU vs LSU New Orleans | ",
 "Upcoming Nov 6, 7:00 PM Men's · LSU vs Texas Southern | ",
 "Upcoming Nov 9, 7:00 PM Men's · LSU vs Louisiana Tech | ",
 "Upcoming Nov 14 Men's · LSU vs Gonzaga | ",
 "Upcoming Nov 18, 7:00 PM Men's · LSU vs ULM | ",
 "Upcoming Nov 21 Men's · LSU vs Queens | ",
 "Upcoming Nov 25, 1:00 PM Men's · LSU vs Arizona State | ",
 "Upcoming Nov 26, 6:00 PM Men's · LSU vs SMU | ",
 "Upcoming Dec 1, 8:00 PM Men's · LSU vs Wake Forest | ",
 "Upcoming Dec 5, 1:00 PM Men's · LSU vs Hofstra | ",
 "Upcoming Dec 13, 2:30 PM Men's · LSU vs Houston | ",
 "Upcoming Dec 18, 7:00 PM Men's · LSU vs High Point | ",
 "Upcoming Dec 22, 5:00 PM Men's · LSU vs UL-Lafayette | ",
 "Upcoming Dec 28, 7:00 PM Men's · LSU vs Washington St. | ",
 "Upcoming Jan 2, 2:30 PM Men's · LSU vs South Carolina | ",
 "Upcoming Jan 5, 6:00 PM Men's · LSU at Alabama | ",
 "Upcoming Jan 9, 7:30 PM Men's · LSU vs Tennessee | ",
 "Upcoming Jan 13, 6:00 PM Men's · LSU at Kentucky | ",
 "Upcoming Jan 16, 5:00 PM Men's · LSU at Texas A&M | ",
 "Upcoming Jan 19, 8:00 PM Men's · LSU vs Texas | ",
 "Upcoming Jan 23, 2:30 PM Men's · LSU vs Auburn | ",
 "Upcoming Jan 26, 8:00 PM Men's · LSU at Arkansas | ",
 "Upcoming Jan 30, 2:30 PM Men's · LSU at Georgia | ",
 "Upcoming Feb 2, 8:00 PM Men's · LSU vs Vanderbilt | ",
 "Upcoming Feb 6, 3:00 PM Men's · LSU vs Ole Miss | ",
 "Upcoming Feb 13, 12:00 PM Men's · LSU at Oklahoma | ",
 "Upcoming Feb 17, 7:00 PM Men's · LSU vs Florida | ",
 "Upcoming Feb 20, 5:00 PM Men's · LSU at Mississippi State | ",
 "Upcoming Feb 24, 6:00 PM Men's · LSU at Auburn | ",
 "Upcoming Feb 27, 7:30 PM Men's · LSU vs Texas A&M | ",
 "Upcoming Mar 2, 8:00 PM Men's · LSU vs Arkansas | ",
 "Upcoming Mar 6, 1:00 PM Men's · LSU at Missouri | ",
 "Upcoming Mar 10, 12:00 AM Men's · LSU vs SEC Tournament | ",
 "Upcoming Mar 16 Men's · LSU vs NCAA Tournament | "
]);
  const v_wbball=parse("Basketball","wbball");
  assert.deepEqual(v_wbball.map(line),[
 "Upcoming Oct 22, 7:00 PM Women's · LSU vs UNT Dallas (Exhibition) | ",
 "Upcoming Oct 29, 7:00 PM Women's · LSU vs Loyola (N.O.) (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · LSU vs Southeastern Louisiana | ",
 "Upcoming Nov 5, 7:00 PM Women's · LSU vs Texas Southern | ",
 "Upcoming Nov 10, 7:00 PM Women's · LSU vs McNeese | ",
 "Upcoming Nov 13, 6:00 PM Women's · LSU vs Denver | ",
 "Upcoming Nov 16, 7:00 PM Women's · LSU vs Troy | ",
 "Upcoming Nov 19, 7:00 PM Women's · LSU vs Fairleigh Dickinson | ",
 "Upcoming Nov 23, 7:00 PM Women's · LSU vs Belmont | ",
 "Upcoming Nov 27, 3:30 PM Women's · LSU vs Villanova | ",
 "Upcoming Nov 28, 3:30 PM Women's · LSU vs NC State | ",
 "Upcoming Dec 2, 6:15 PM Women's · LSU at North Carolina | ",
 "Upcoming Dec 6, 2:00 PM Women's · LSU at Northwestern State | ",
 "Upcoming Dec 13, 12:00 PM Women's · LSU vs Houston | ",
 "Upcoming Dec 15, 11:00 AM Women's · LSU vs Stonehill | ",
 "Upcoming Dec 20, 12:00 PM Women's · LSU vs UConn | ",
 "Upcoming Dec 27, 2:00 PM Women's · LSU vs Alcorn State | ",
 "Upcoming Dec 31, 6:00 PM Women's · LSU at Auburn | ",
 "Upcoming Jan 3, 12:00 PM Women's · LSU vs Vanderbilt | ",
 "Upcoming Jan 7, 8:00 PM Women's · LSU vs Texas A&M | ",
 "Upcoming Jan 10, 1:00 PM Women's · LSU at Florida | ",
 "Upcoming Jan 14, 7:00 PM Women's · LSU vs Mississippi State | ",
 "Upcoming Jan 17, 1:00 PM Women's · LSU at Arkansas | ",
 "Upcoming Jan 21, 6:00 PM Women's · LSU at Alabama | ",
 "Upcoming Jan 28, 7:00 PM Women's · LSU vs Auburn | ",
 "Upcoming Feb 1, 7:00 PM Women's · LSU vs Ole Miss | ",
 "Upcoming Feb 4, 7:00 PM Women's · LSU at Kentucky | ",
 "Upcoming Feb 7, 1:00 PM Women's · LSU at Missouri | ",
 "Upcoming Feb 11, 6:00 PM Women's · LSU vs Texas | ",
 "Upcoming Feb 14, 2:00 PM Women's · LSU vs Georgia | ",
 "Upcoming Feb 21, 2:00 PM Women's · LSU at South Carolina | ",
 "Upcoming Feb 25, 5:00 PM Women's · LSU at Tennessee | ",
 "Upcoming Feb 28, 1:00 PM Women's · LSU vs Oklahoma | ",
 "Upcoming Mar 3 Women's · LSU vs SEC Tournament | ",
 "Upcoming Mar 17 Women's · LSU vs NCAA Tournament | "
]);
  const v_bvb=parse("Beach Volleyball","bvb");
  assert.deepEqual(v_bvb.map(line),[
 "Upcoming Oct 9 LSU at AVCA Pairs Qualifier | ",
 "Upcoming Oct 16 LSU at Houston Christian Tournament | ",
 "Upcoming Oct 31 LSU at LSU Fall Competition | ",
 "Upcoming Nov 6 LSU at AVCA Pairs Championship | ",
 "Upcoming Feb 26 LSU at Green Wave Invitational | ",
 "Upcoming Mar 5 LSU at Tiger Beach Challenge | ",
 "Upcoming Mar 12 LSU at MPSF Coast to Coast Classic | ",
 "Upcoming Mar 19 LSU at UAB March to May | ",
 "Upcoming Mar 26 LSU at Texas Invitational | ",
 "Upcoming Apr 2 LSU at Death Volley Invitaitonal | ",
 "Upcoming Apr 16 LSU at Battle on the Bayou | ",
 "Upcoming Apr 23 LSU at TCU Tournament | ",
 "Upcoming Apr 28 LSU at MPSF Championship | ",
 "Upcoming May 7 LSU at NCAA Championship | "
]);
  const v_xc=parse("Cross Country","xc");
  assert.deepEqual(v_xc.map(line),[
 "Final Sep 4 LSU at Battle for New Orleans | Completed",
 "Final Sep 18 LSU at LSU Twilight Relay Invitational | Completed",
 "Final Oct 2 LSU at Paul Short Run | Completed",
 "Upcoming Oct 16, 8:15 AM LSU at Arturo Barrios Invitational | ",
 "Upcoming Oct 30 LSU at SEC Championships | ",
 "Upcoming Nov 13 LSU at NCAA South Central Regional | ",
 "Upcoming Nov 21 LSU at NCAA Championships | "
]);
  const v_fb=parse("Football","fb");
  assert.deepEqual(v_fb.map(line),[
 "Final Sep 5 LSU vs Clemson | W, 51-10",
 "Final Sep 12 LSU vs Louisiana Tech | W, 45-14",
 "Final Sep 19 LSU at Ole Miss | L, 24-32",
 "Final Sep 26 LSU vs Texas A&M | W, 35-6",
 "Final Oct 3 LSU vs McNeese | W, 63-14",
 "Upcoming Oct 10, 6:00 PM LSU at Kentucky | ",
 "Upcoming Oct 17, 11:00 AM LSU vs Mississippi State | ",
 "Upcoming Oct 24, 11:00 AM LSU at Auburn | ",
 "Upcoming Nov 7 LSU vs Alabama | ",
 "Upcoming Nov 14 LSU vs Texas | ",
 "Upcoming Nov 21 LSU at Tennessee | ",
 "Upcoming Nov 28 LSU at Arkansas | "
]);
  const v_mg=parse("Golf","mg");
  assert.deepEqual(v_mg.map(line),[
 "Final Sep 13 Men's · LSU at Inverness Intercollegiate | Completed",
 "Final Sep 18 Men's · LSU at Olympia Fields/Fighting Illini Invitational | Completed",
 "Final Sep 28 Men's · LSU at Bryan Bros Collegiate | Completed",
 "Upcoming Oct 17, 10:00 AM Men's · LSU at Fallen Oak Collegiate Invitational | ",
 "Upcoming Feb 4 Men's · LSU at Amer Ari Invitational | ",
 "Upcoming Feb 28 Men's · LSU at Cabo Collegiate | ",
 "Upcoming Mar 8 Men's · LSU at Louisiana Classics | ",
 "Upcoming Mar 15 Men's · LSU at Pauma Valley Invitational | ",
 "Upcoming Apr 3 Men's · LSU at Augusta Haskins Award Invitational | ",
 "Upcoming Apr 12 Men's · LSU at The Ford Collegiate | ",
 "Upcoming Apr 21 Men's · LSU at SEC Championships | ",
 "Upcoming May 17 Men's · LSU at NCAA Regional | ",
 "Upcoming May 28 Men's · LSU at NCAA Championships | "
]);
  const v_wg=parse("Golf","wg");
  assert.deepEqual(v_wg.map(line),[
 "Final Sep 7 Women's · LSU at Cougar Classic | Completed",
 "Final Sep 8 Women's · LSU at Tulane Classic | Completed",
 "Final Sep 21 Women's · LSU at Red Sky Classic | Completed",
 "Upcoming Oct 12 Women's · LSU at Haskins Intercollegiate | ",
 "Upcoming Oct 19, 9:30 AM Women's · LSU at The Fin | ",
 "Upcoming Jan 31 Women's · LSU at Dominican Republic Classic | ",
 "Upcoming Feb 14 Women's · LSU at Moon Golf Invitational | ",
 "Upcoming Mar 1 Women's · LSU at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 15 Women's · LSU at Valspar Augusta Invitational | ",
 "Upcoming Mar 15 Women's · LSU at Magnolia Collegiate | ",
 "Upcoming Mar 21 Women's · LSU at Clemson Invitational | ",
 "Upcoming Apr 16 Women's · LSU at SEC Championships | ",
 "Upcoming May 10 Women's · LSU at NCAA Regional | ",
 "Upcoming May 21 Women's · LSU at NCAA Championships | "
]);
  const v_gm=parse("Gymnastics","gm");
  assert.deepEqual(v_gm.map(line),[
 "Upcoming Jan 1 LSU at Gymnastics 101/Open Mike Night (Exhibition) | ",
 "Upcoming Jan 9, 12:00 PM LSU at Sprouts Farmers Market Collegiate Quad | ",
 "Upcoming Jan 15, 7:30 PM LSU vs Arizona State | ",
 "Upcoming Jan 22, 6:45 PM LSU at Kentucky | ",
 "Upcoming Jan 24, 2:00 PM LSU at Texas Woman's | ",
 "Upcoming Jan 29, 7:00 PM LSU vs Georgia | ",
 "Upcoming Feb 5, 7:00 PM LSU at Auburn | ",
 "Upcoming Feb 12, 8:00 PM LSU vs Oklahoma | ",
 "Upcoming Feb 19, 8:00 PM LSU at Alabama | ",
 "Upcoming Feb 26, 8:00 PM LSU vs Florida | ",
 "Upcoming Mar 5, 7:00 PM LSU at Arkansas | ",
 "Upcoming Mar 12, 7:30 PM LSU vs Missouri | ",
 "Upcoming Mar 20 LSU at SEC Championships | ",
 "Upcoming Mar 31 LSU at NCAA Regionals | ",
 "Upcoming Apr 15 LSU at NCAA Championships | "
]);
  const v_sc=parse("Soccer","sc");
  assert.deepEqual(v_sc.map(line),[
 "Final Aug 12 LSU at Wake Forest | L, 0-2",
 "Final Aug 16 LSU vs Northwestern State | W, 5-0",
 "Final Aug 20 LSU vs UCF | L, 1-2",
 "Final Aug 23 LSU vs Florida Gulf Coast | L, 2-3",
 "Final Aug 27 LSU at Arizona State | L, 0-1",
 "Final Aug 30 LSU vs Arizona | T, 1-1",
 "Final Sep 3 LSU vs Baylor | L, 0-2",
 "Final Sep 6 LSU at Miami (Ohio) | W, 3-2",
 "Final Sep 11 LSU vs Tennessee | L, 1-3",
 "Final Sep 18 LSU vs South Carolina | L, 1-3",
 "Final Sep 24 LSU at Oklahoma | L, 1-3",
 "Final Sep 27 LSU vs Georgia | T, 1-1",
 "Final Oct 2 LSU at Florida | W, 2-1",
 "Upcoming Oct 9, 7:00 PM LSU vs Arkansas | ",
 "Upcoming Oct 15, 7:00 PM LSU at Texas | ",
 "Upcoming Oct 18, 2:00 PM LSU at Texas A&M | ",
 "Upcoming Oct 25, 2:00 PM LSU vs Mississippi State | ",
 "Upcoming Nov 1, 12:00 PM LSU at Missouri | ",
 "Upcoming Nov 8 LSU vs SEC Tournament | ",
 "Upcoming Nov 20 LSU vs NCAA Tournament | "
]);
  const v_sb=parse("Softball","sb");
  assert.deepEqual(v_sb.map(line),[
 "Upcoming Oct 15, 5:00 PM LSU vs Northwestern State (Exhibition) | ",
 "Upcoming Oct 24, 4:00 PM LSU vs Florida State (Exhibition) | ",
 "Upcoming Oct 25, 12:00 PM LSU vs Florida State (Exhibition) | ",
 "Upcoming Oct 29, 6:00 PM LSU vs McNeese (Exhibition) | ",
 "Upcoming Nov 1, 4:00 PM LSU vs Belhaven (Exhibition) | ",
 "Upcoming Nov 1, 6:00 PM LSU vs Northwest Florida State (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM LSU vs Southern (Exhibition) | ",
 "Upcoming Nov 11, 5:00 PM LSU vs Co-Lin CC (Exhibition) | ",
 "Upcoming Mar 19 LSU at Kentucky | ",
 "Upcoming Mar 20 LSU at Kentucky | ",
 "Upcoming Mar 21 LSU at Kentucky | ",
 "Upcoming Mar 26 LSU vs Tennessee | ",
 "Upcoming Mar 27 LSU vs Tennessee | ",
 "Upcoming Mar 28 LSU vs Tennessee | ",
 "Upcoming Apr 2 LSU at Florida | ",
 "Upcoming Apr 3 LSU at Florida | ",
 "Upcoming Apr 4 LSU at Florida | ",
 "Upcoming Apr 9 LSU vs Arkansas | ",
 "Upcoming Apr 10 LSU vs Arkansas | ",
 "Upcoming Apr 11 LSU vs Arkansas | ",
 "Upcoming Apr 16 LSU vs Texas | ",
 "Upcoming Apr 17 LSU vs Texas | ",
 "Upcoming Apr 18 LSU vs Texas | ",
 "Upcoming Apr 23 LSU at Oklahoma | ",
 "Upcoming Apr 24 LSU at Oklahoma | ",
 "Upcoming Apr 25 LSU at Oklahoma | ",
 "Upcoming Apr 30 LSU at Alabama | ",
 "Upcoming May 1 LSU at Alabama | ",
 "Upcoming May 2 LSU at Alabama | ",
 "Upcoming May 6 LSU vs Georgia | ",
 "Upcoming May 7 LSU vs Georgia | ",
 "Upcoming May 8 LSU vs Georgia | ",
 "Upcoming May 11 LSU vs SEC Tournament | ",
 "Upcoming May 21 LSU vs NCAA Regional | ",
 "Upcoming May 27 LSU vs NCAA Super Regional | ",
 "Upcoming Jun 3 LSU vs Women's College World Series | "
]);
  const v_sd=parse("Swimming & Diving","sd");
  assert.deepEqual(v_sd.map(line),[
 "Upcoming Oct 9, 3:00 PM LSU at Navy w/ Loyola (Md.) | ",
 "Upcoming Oct 23, 5:00 PM LSU vs Texas A&M | ",
 "Upcoming Nov 5, 12:00 PM LSU vs Auburn | ",
 "Upcoming Nov 19 LSU at Georgia Invitational | ",
 "Upcoming Jan 9, 10:00 AM LSU at Missouri | ",
 "Upcoming Jan 22, 10:00 AM LSU at Eddie Reese Texas Showdown | ",
 "Upcoming Jan 30 LSU vs SMU | ",
 "Upcoming Feb 14, 12:00 PM LSU at SEC Championships | ",
 "Upcoming Feb 26 LSU at Auburn Last Chance Invitational | ",
 "Upcoming Mar 8 LSU at NCAA Zone D Diving Regional | ",
 "Upcoming Mar 17, 10:00 AM LSU at NCAA Women's Championships | ",
 "Upcoming Mar 24, 10:00 AM LSU at NCAA Men's Championships | "
]);
  const v_mt=parse("Tennis","mt");
  assert.deepEqual(v_mt.map(line),[
 "Upcoming Oct 6 Men's · LSU at ATP M15 Lexington | ",
 "Upcoming Oct 12 Men's · LSU at ITF M25 Austin | ",
 "Upcoming Oct 26 Men's · LSU at ATP Challenger 100 MarketBeat Open | ",
 "Upcoming Oct 26 Men's · LSU at ITF M25 Las Vegas | ",
 "Upcoming Nov 2 Men's · LSU at ATP Jonathan Fried Men's Pro Challenger 75 | ",
 "Upcoming Nov 5 Men's · LSU at ITA South Sectional Championships | ",
 "Upcoming Nov 9 Men's · LSU at ATP Knoxville Challenger 75 | ",
 "Upcoming Nov 9 Men's · LSU at ITF M25 Columbus | ",
 "Upcoming Nov 9 Men's · LSU at ITF M15 Naples | ",
 "Upcoming Nov 17 Men's · LSU at NCAA Individual Championships | ",
 "Upcoming Jan 10 Men's · LSU at ATP Challenger 50 | ",
 "Upcoming Jan 18, 11:30 AM Men's · LSU vs Clemson | ",
 "Upcoming Jan 18, 4:00 PM Men's · LSU vs Alcorn State | ",
 "Upcoming Jan 22, 6:00 PM Men's · LSU vs Jacksonville State | ",
 "Upcoming Jan 23 Men's · LSU vs Florida State or Arkansas | ",
 "Upcoming Jan 28, 5:30 PM Men's · LSU vs Texas A&M | ",
 "Upcoming Jan 31, 11:00 AM Men's · LSU at Ohio State | ",
 "Upcoming Feb 12 Men's · LSU at ITA National Team Indoor Championship | ",
 "Upcoming Feb 25, 5:30 PM Men's · LSU vs Vanderbilt | ",
 "Upcoming Feb 27 Men's · LSU at Arkansas | ",
 "Upcoming Mar 1, 1:00 PM Men's · LSU at Tulane | ",
 "Upcoming Mar 6, 12:00 PM Men's · LSU vs Texas | ",
 "Upcoming Mar 12 Men's · LSU at Tennessee | ",
 "Upcoming Mar 14 Men's · LSU at Kentucky | ",
 "Upcoming Mar 18, 5:30 PM Men's · LSU vs Florida | ",
 "Upcoming Mar 20, 12:00 PM Men's · LSU vs South Carolina | ",
 "Upcoming Mar 20, 4:00 PM Men's · LSU vs LSU New Orleans | ",
 "Upcoming Mar 25 Men's · LSU at Oklahoma | ",
 "Upcoming Mar 27 Men's · LSU at Texas A&M | ",
 "Upcoming Apr 1, 5:30 PM Men's · LSU vs Georgia | ",
 "Upcoming Apr 3, 12:00 PM Men's · LSU vs Auburn | ",
 "Upcoming Apr 3, 3:30 PM Men's · LSU vs Southern | ",
 "Upcoming Apr 11, 1:00 PM Men's · LSU vs Alabama | ",
 "Upcoming Apr 16 Men's · LSU at Ole Miss | ",
 "Upcoming Apr 18 Men's · LSU at Mississippi State | ",
 "Upcoming Apr 21 Men's · LSU at SEC Championship | ",
 "Upcoming May 7 Men's · LSU at NCAA Team Championship | "
]);
  const v_wt=parse("Tennis","wt");
  assert.deepEqual(v_wt.map(line),[
 "Upcoming Oct 8, 8:00 AM Women's · LSU at ITA Southern Regional Championships | ",
 "Upcoming Oct 22 Women's · LSU at Battle for the Boot JAE Foundation Open | ",
 "Upcoming Oct 23 Women's · LSU at Rome Collegiate Invitational | ",
 "Upcoming Nov 5 Women's · LSU at ITA South Sectional Championships | ",
 "Upcoming Nov 5 Women's · LSU at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Women's · LSU at NCAA Individual Championships | "
]);
  const v_tf=parse("Track & Field","tf");
  assert.deepEqual(v_tf.map(line),[]);
  const v_vb=parse("Volleyball","vb");
  assert.deepEqual(v_vb.map(line),[
 "Final Aug 28 LSU vs Wake Forest | W, 3-2",
 "Final Aug 29 LSU vs Incarnate Word | W, 3-1",
 "Final Sep 1 LSU vs Michigan State | L, 0-3",
 "Final Sep 2 LSU at Michigan | L, 1-3",
 "Final Sep 8 LSU vs NC State | L, 2-3",
 "Final Sep 11 LSU vs Charlotte | W, 3-0",
 "Final Sep 13 LSU at Southeastern Louisiana | W, 3-0",
 "Final Sep 17 LSU at Miami (Fla.) | L, 1-3",
 "Final Sep 18 LSU vs Tulsa | W, 3-2",
 "Final Sep 23 LSU vs Alabama | W, 3-2",
 "Final Sep 27 LSU at Mississippi State | L, 2-3",
 "Final Sep 30 LSU vs Vanderbilt | L, 0-3",
 "Final Oct 4 LSU vs Missouri | W, 3-2",
 "Upcoming Oct 9, 6:00 PM LSU at Kentucky | ",
 "Upcoming Oct 11, 1:00 PM LSU at Tennessee | ",
 "Upcoming Oct 16, 7:00 PM LSU vs South Carolina | ",
 "Upcoming Oct 18, 1:00 PM LSU vs Georgia | ",
 "Upcoming Oct 23, 6:00 PM LSU at Florida | ",
 "Upcoming Oct 25, 2:00 PM LSU at Auburn | ",
 "Upcoming Nov 1, 2:00 PM LSU at Ole Miss | ",
 "Upcoming Nov 4, 6:00 PM LSU vs Arkansas | ",
 "Upcoming Nov 8, 1:00 PM LSU vs Oklahoma | ",
 "Upcoming Nov 13, 7:00 PM LSU at Texas A&M | ",
 "Upcoming Nov 15, 2:00 PM LSU at Texas | ",
 "Upcoming Nov 20 LSU vs SEC Tournament | ",
 "Upcoming Dec 3 LSU vs NCAA Tournament | "
]);
  ownRecapsOnly(v_bsb,"Baseball bsb");
  ownRecapsOnly(v_mb,"Basketball mb");
  ownRecapsOnly(v_wbball,"Basketball wbball");
  ownRecapsOnly(v_bvb,"Beach Volleyball bvb");
  ownRecapsOnly(v_xc,"Cross Country xc");
  ownRecapsOnly(v_fb,"Football fb");
  ownRecapsOnly(v_mg,"Golf mg");
  ownRecapsOnly(v_wg,"Golf wg");
  ownRecapsOnly(v_gm,"Gymnastics gm");
  ownRecapsOnly(v_sc,"Soccer sc");
  ownRecapsOnly(v_sb,"Softball sb");
  ownRecapsOnly(v_sd,"Swimming & Diving sd");
  ownRecapsOnly(v_mt,"Tennis mt");
  ownRecapsOnly(v_wt,"Tennis wt");
  ownRecapsOnly(v_tf,"Track & Field tf");
  ownRecapsOnly(v_vb,"Volleyball vb");
}
// END generated

// The cards show the day only; the page title's season gives the year.
{
  const year=(title,sport)=>lsuSeasonYear(`<title>${title} - LSUsports.net</title>`,sport);
  assert.deepEqual([9,1].map(year('Football 2026','Football')),[2026,2027]);
  assert.deepEqual([10,3].map(year('Baseball 2027','Baseball')),[2026,2027],'a spring page: its fall exhibitions are the year before');
  assert.deepEqual([11,2].map(year("Men's Basketball 2026-27",'Basketball')),[2026,2027]);
  assert.equal(year('LSUsports.net','Football'),null);
  // Last spring's track page is not this season: a valid empty schedule.
  const track=worker.parseHtml(fixture('tf-schedule.html.gz'),school,'Track & Field',page('tf'),now);
  assert.equal(track.length,0);
  assert.equal(worker.lsuHandlers.isEmptySchedule(worker.lsuHandlers.parseSchedule(fixture('tf-schedule.html.gz'),school,'Track & Field',page('tf'),now)),true);
}

// Golf and swimming publish a card per day; cross country one per team.
{
  const golf=parse('Golf','mg');
  const inverness=golf.find(e=>e.opponent==='Inverness Intercollegiate');
  assert.equal(inverness.end_time,'2026-09-15T23:59:59Z','the third day comes after another tournament (RedHawk) on the page');
  assert.match(inverness.recap_url,/finishes-12th-at-inverness/,'the last day\'s story');
  assert.ok(!golf.some(e=>e.opponent==='RedHawk Intercollegiate'),'a past tournament with neither story nor place is not listed');
  assert.equal(golf.filter(e=>e.opponent==='Fallen Oak Collegiate Invitational').length,1);
  const xc=parse('Cross Country','xc');
  assert.deepEqual(xc.filter(e=>e.status==='Final').map(e=>[e.title,e.end_time||null]),[['LSU at Battle for New Orleans',null],['LSU at LSU Twilight Relay Invitational',null],['LSU at Paul Short Run',null]],'one meet per day, both teams; the men\'s cancelled race is not listed');
  const swim=parse('Swimming & Diving','sd');
  assert.ok(!swim.some(e=>/purple/i.test(e.opponent)),'the intrasquad is internal');
  assert.deepEqual(swim.filter(e=>/Georgia Invitational/.test(e.opponent)).map(e=>[e.title,e.end_time]),[['LSU at Georgia Invitational','2026-11-21T23:59:59Z']]);
  // A dual follows its card's divider; a tournament is "at".
  const tennis=parse('Tennis','mt');
  assert.equal(tennis.find(e=>e.opponent==='Clemson').title,"Men's · LSU vs Clemson");
  assert.equal(tennis.find(e=>e.opponent==='ITA South Sectional Championships').title,"Men's · LSU at ITA South Sectional Championships");
  assert.ok(!tennis.some(e=>e.status==='Final'&&!e.recap_url),'a past tennis tournament without a story is not listed');
  // Exhibitions: the "Exhibition" heading; softball's intrasquad series is internal.
  assert.equal(parse('Basketball','mb').find(e=>e.opponent.startsWith('McNeese')).opponent,'McNeese (Exhibition)');
  assert.ok(!parse('Softball','sb').some(e=>/purple/i.test(e.opponent)));
  // A cancelled card is not listed (the slot reads "Canceled (Weather)").
  const soccer=fixture('sc-schedule.html.gz'),cancelled=soccer.replace(/(schedule-event-item-result__label[^>]*>)7:00 PM CT/,'$1Canceled (Weather)');
  assert.notEqual(cancelled,soccer);
  const read=raw=>worker.parseHtml(raw,school,'Soccer',page('sc'),now).map(e=>e.opponent);
  assert.ok(read(soccer).includes('Arkansas')&&!read(cancelled).includes('Arkansas'));
}

// Golf: the team's place from the final story's headline, never a player's.
{
  assert.equal(lsuGolfPlace('LSU Men’s Golf Finishes 12th at Inverness Intercollegiate'),'12');
  assert.equal(lsuGolfPlace('Men’s Golf Finishes Seventh at the Bryan Bros Collegiate'),'7');
  assert.equal(lsuGolfPlace('LSU Women’s Golf Ties for T4th at Example'),'T4');
  assert.equal(lsuGolfPlace('Rocio Tejedo Brings Home T15 Finish in LSU Women’s Golf Opener'),null);
  assert.equal(lsuGolfPlace('Victorian Kristensen Finishes Third in First LSU Collegiate Golf Tournament'),null);
  assert.equal(lsuGolfPlace('Dan Hayes’ 11-Under Performance Powers Tigers to Top-10 Finish in Olympia Fields'),null);
  const golf=parse('Golf','mg').filter(e=>e.status==='Final');
  for(const event of golf)recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
  for(const event of golf)await worker.lsuHandlers.attachGolfPlace(event);
  assert.deepEqual(golf.map(e=>[e.opponent,e.headline]),[['Inverness Intercollegiate','12th'],['Olympia Fields/Fighting Illini Invitational','Completed'],['Bryan Bros Collegiate','7th']]);
  recapFixtures.clear();requests.length=0;
}

// Cross Country: TFRRS gives both teams' places and every runner.
{
  const xc=parse('Cross Country','xc').filter(e=>e.status==='Final');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/LA_college_f_LSU.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/LA_college_m_LSU.html','tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/27447/2026_Battle_for_New_Orleans_American_Conference_Preview','tfrrs-27447.html.gz'],['https://www.tfrrs.org/results/xc/28449/LSU_Twilight_Cross_Country_Relay_Invitational','tfrrs-28449.html.gz'],['https://www.tfrrs.org/results/xc/27832/Lehigh_Paul_Short_Run_College','tfrrs-27832.html.gz']])recapFixtures.set(url,fixture(file));
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,e.meet_results_verified]),[['Battle for New Orleans',"Women's team: 3rd · 78 pts / Men's: Hugh Carlson 11th",true],['LSU Twilight Relay Invitational',"Women's team: 1st · 17 pts / Men's team: 2nd · 73 pts",true],['Paul Short Run',"Women's team: 7th · 225 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Live: ESPN joins the official card for LSU's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','fb'),new Date('2026-10-04T12:00:00Z'),[['LSU vs McNeese','Final','W, 63-14']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','vb'),new Date('2026-10-05T12:00:00Z'),[['LSU vs Missouri','Final','W, 3-2']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','sc'),new Date('2026-10-03T12:00:00Z'),[['LSU at Florida','Final','W, 2-1']]);
}

// Records: each sport's overall and SEC record equals the one its page publishes
// (the first two win-loss records in the page data).
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const [overall,conference]=data.filter(value=>value&&!Array.isArray(value)&&typeof value==='object'&&Object.keys(value).sort().join()==='loses,pct,ties,wins').map(r=>[data[r.wins],data[r.loses],data[r.ties]].filter((n,i)=>i<2||n).join('-'));
    return[overall,conference];
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug] of [['Football','fb'],['Volleyball','vb'],['Soccer','sc']]){
    const [overall,conference]=published(slug);
    assert.deepEqual(record(sport,slug).map(r=>[r.text,r.conference?.text]),[[overall,conference]],`${sport}: the computed records are the official ones (${overall}, ${conference} SEC)`);
  }
  assert.deepEqual(['fb','vb','sc'].map(published),[['4-1','1-1'],['7-6','2-2'],['3-8-2','1-3-1']]);
}

// Roster: basketball links profiles under the season
// (/roster/season/2026-27/player/...); each card's Instagram is read.
{
  const profiles=worker.rosterProfiles(fixture('mb-roster.html.gz'),'https://lsusports.net/sports/mb/roster');
  assert.ok(profiles.length>=4&&profiles.every(p=>/\/roster\/season\/2026-27\/player\//.test(p.url)&&p.instagram_url),'every men\'s basketball card with its Instagram');
}

// Other schools and other hosts never reach the LSU reader.
assert.equal(worker.lsuHandlers.parseSchedule(fixture('fb-schedule.html.gz'),school,'Football','https://lsusports.net/',now),null);
assert.equal(worker.lsuHandlers.parseSchedule(fixture('fb-schedule.html.gz'),schools.find(s=>s.id==='illinois'),'Football',page('fb'),now),null);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('LSU module checks passed');
