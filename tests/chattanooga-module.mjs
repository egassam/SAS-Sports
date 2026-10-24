import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {chattanoogaSchool} from '../src/schools/chattanooga.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='chattanooga');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,chattanoogaHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/chattanooga-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gomocs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['chattanooga'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',chattanoogaSchool.scheduleUrls],['roster',chattanoogaSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('chattanooga|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gomocs.com',`${key} must stay on gomocs.com`);
  }
}
const parity={"Basketball":{"schedule":["https://gomocs.com/sports/mens-basketball/schedule","https://gomocs.com/sports/womens-basketball/schedule"],"roster":["https://gomocs.com/sports/mens-basketball/roster","https://gomocs.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://gomocs.com/sports/womens-beach-volleyball/schedule"],"roster":["https://gomocs.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://gomocs.com/sports/cross-country/schedule"],"roster":["https://gomocs.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://gomocs.com/sports/football/schedule"],"roster":["https://gomocs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gomocs.com/sports/mglf/schedule","https://gomocs.com/sports/wglf/schedule"],"roster":["https://gomocs.com/sports/mglf/roster","https://gomocs.com/sports/wglf/roster"],"combined":true},"Soccer":{"schedule":["https://gomocs.com/sports/womens-soccer/schedule"],"roster":["https://gomocs.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://gomocs.com/sports/softball/schedule"],"roster":["https://gomocs.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gomocs.com/sports/womens-tennis/schedule","https://gomocs.com/sports/mens-tennis/schedule"],"roster":["https://gomocs.com/sports/womens-tennis/roster","https://gomocs.com/sports/mens-tennis/roster"],"combined":true},"Volleyball":{"schedule":["https://gomocs.com/sports/womens-volleyball/schedule"],"roster":["https://gomocs.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://gomocs.com/sports/wr/schedule"],"roster":["https://gomocs.com/sports/wr/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'chattanooga|"+sport+"':"),`${sport} routes must live in the Chattanooga module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://gomocs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.chattanoogaHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=chattanooga)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 30, 5:30 PM Men's · Chattanooga vs Boo & Gold Halloween Fan Event | ",
 "Upcoming Nov 2, 9:00 PM Men's · Chattanooga at Louisville | ",
 "Upcoming Nov 5, 6:00 PM Men's · Chattanooga at Penn State | ",
 "Upcoming Nov 9, 7:00 PM Men's · Chattanooga vs Covenant | ",
 "Upcoming Nov 13, 7:00 PM Men's · Chattanooga at Elon | ",
 "Upcoming Nov 18, 7:00 PM Men's · Chattanooga at Winthrop | ",
 "Upcoming Nov 21, 7:00 PM Men's · Chattanooga vs Radford | ",
 "Upcoming Nov 24, 7:00 PM Men's · Chattanooga vs Delaware State | ",
 "Upcoming Nov 28, 2:00 PM Men's · Chattanooga vs Troy | ",
 "Upcoming Dec 1, 7:00 PM Men's · Chattanooga vs Alabama A&M | ",
 "Upcoming Dec 5, 2:00 PM Men's · Chattanooga vs Brescia | ",
 "Upcoming Dec 8, 7:00 PM Men's · Chattanooga vs Point | ",
 "Upcoming Dec 16, 7:30 PM Men's · Chattanooga vs South Carolina State | ",
 "Upcoming Dec 19, 2:00 PM Men's · Chattanooga vs Mercer | ",
 "Upcoming Dec 22, 7:00 PM Men's · Chattanooga vs Samford | ",
 "Upcoming Dec 30, 1:00 PM Men's · Chattanooga at Western Carolina | ",
 "Upcoming Jan 2 Men's · Chattanooga at The Citadel | ",
 "Upcoming Jan 7, 7:00 PM Men's · Chattanooga vs UNCG | ",
 "Upcoming Jan 9, 2:00 PM Men's · Chattanooga vs VMI | ",
 "Upcoming Jan 16, 5:00 PM Men's · Chattanooga at Wofford | ",
 "Upcoming Jan 18, 8:30 PM Men's · Chattanooga vs Tennessee Tech | ",
 "Upcoming Jan 21, 7:00 PM Men's · Chattanooga at ETSU | ",
 "Upcoming Jan 23, 4:30 PM Men's · Chattanooga vs Western Carolina | ",
 "Upcoming Jan 28, 6:00 PM Men's · Chattanooga at VMI | ",
 "Upcoming Jan 30, 12:00 PM Men's · Chattanooga at UNCG | ",
 "Upcoming Feb 3, 7:00 PM Men's · Chattanooga vs ETSU | ",
 "Upcoming Feb 7, 6:00 PM Men's · Chattanooga vs Wofford | ",
 "Upcoming Feb 11, 5:00 PM Men's · Chattanooga at Furman | ",
 "Upcoming Feb 13, 2:00 PM Men's · Chattanooga vs The Citadel | ",
 "Upcoming Feb 17, 6:00 PM Men's · Chattanooga at Samford | ",
 "Upcoming Feb 20, 2:00 PM Men's · Chattanooga at Mercer | ",
 "Upcoming Feb 24, 7:00 PM Men's · Chattanooga vs Furman | ",
 "Upcoming Feb 27, 7:30 PM Men's · Chattanooga at Tennessee Tech | ",
 "Upcoming Mar 4 Men's · Chattanooga at Southern Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 30, 5:30 PM Women's · Chattanooga vs Boo & Gold Halloween Event | ",
 "Upcoming Nov 2, 6:00 PM Women's · Chattanooga vs UVA Wise | ",
 "Upcoming Nov 4, 7:30 PM Women's · Chattanooga at Western Kentucky | ",
 "Upcoming Nov 8, 2:00 PM Women's · Chattanooga vs Florida | ",
 "Upcoming Nov 12, 11:00 AM Women's · Chattanooga at Northern Kentucky | ",
 "Upcoming Nov 15, 2:00 PM Women's · Chattanooga vs Lipscomb | ",
 "Upcoming Nov 19, 7:00 PM Women's · Chattanooga at Austin Peay | ",
 "Upcoming Nov 23, 12:00 PM Women's · Chattanooga vs St. Bonaventure | ",
 "Upcoming Nov 25, 12:00 PM Women's · Chattanooga at Georgia State | ",
 "Upcoming Nov 30, 6:00 PM Women's · Chattanooga vs King (Tenn.) | ",
 "Upcoming Dec 5, 3:00 PM Women's · Chattanooga at Charleston Southern | ",
 "Upcoming Dec 13, 3:00 PM Women's · Chattanooga at UAB | ",
 "Upcoming Dec 16, 5:00 PM Women's · Chattanooga vs Radford | ",
 "Upcoming Dec 18, 6:00 PM Women's · Chattanooga vs Tennessee State | ",
 "Upcoming Dec 20, 1:00 PM Women's · Chattanooga at Alabama | ",
 "Upcoming Dec 29, 6:00 PM Women's · Chattanooga vs Samford | ",
 "Upcoming Jan 2, 2:00 PM Women's · Chattanooga at Mercer | ",
 "Upcoming Jan 9, 2:00 PM Women's · Chattanooga at Tennessee Tech | ",
 "Upcoming Jan 12, 6:00 PM Women's · Chattanooga vs Furman | ",
 "Upcoming Jan 16, 2:00 PM Women's · Chattanooga vs UNC Greensboro | ",
 "Upcoming Jan 19 Women's · Chattanooga at Samford | ",
 "Upcoming Jan 23, 2:00 PM Women's · Chattanooga vs Western Carolina | ",
 "Upcoming Jan 26, 6:00 PM Women's · Chattanooga at Wofford | ",
 "Upcoming Jan 30, 2:00 PM Women's · Chattanooga vs ETSU | ",
 "Upcoming Feb 2, 6:30 PM Women's · Chattanooga at Furman | ",
 "Upcoming Feb 6, 2:00 PM Women's · Chattanooga vs Tennessee Tech | ",
 "Upcoming Feb 13, 3:00 PM Women's · Chattanooga at UNC Greensboro | ",
 "Upcoming Feb 16, 6:00 PM Women's · Chattanooga vs Mercer | ",
 "Upcoming Feb 20, 4:00 PM Women's · Chattanooga at ETSU | ",
 "Upcoming Feb 23, 6:00 PM Women's · Chattanooga vs Wofford | ",
 "Upcoming Feb 27, 2:00 PM Women's · Chattanooga at Western Carolina | ",
 "Upcoming Mar 3 Women's · Chattanooga at Southern Conference Tournament | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 16 Chattanooga at AVCA East Coast National Qualifier | Completed",
 "Today Oct 24 Chattanooga at AVCA Central National Qualifier | ",
 "Upcoming Nov 6 Chattanooga at AVCA Beach National Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Chattanooga at Golden Eagle Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 18 Chattanooga at Southern Showcase | Women's team: 20th / Men's team: 19th",
 "Final Oct 2 Chattanooga at Georgia Tech XC Invite | Women's team: 3rd / Men's team: 4th",
 "Final Oct 16 Chattanooga at Crimson Classic | Men 11 | Women 16",
 "Upcoming Oct 31 Chattanooga at Southern Conference Championships | ",
 "Upcoming Nov 13 Chattanooga at NCAA South Region Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 Chattanooga at West Georgia | W, 24-10",
 "Final Sep 5 Chattanooga vs Tennessee Tech | L, 9-24",
 "Final Sep 12 Chattanooga at Eastern Kentucky | L, 17-22",
 "Final Sep 19 Chattanooga vs Wofford | W, 41-7",
 "Final Sep 26 Chattanooga at The Citadel | W, 27-8",
 "Final Oct 3 Chattanooga at ETSU | L, 3-14",
 "Final Oct 10 Chattanooga vs Samford | W, 19-3",
 "Today Oct 24, 2:30 PM Chattanooga at Western Carolina | ",
 "Upcoming Oct 31, 1:00 PM Chattanooga vs VMI | ",
 "Upcoming Nov 7, 1:00 PM Chattanooga vs Mercer | ",
 "Upcoming Nov 14, 1:00 PM Chattanooga at Furman | ",
 "Upcoming Nov 21, 2:00 PM Chattanooga at Alabama | "
]);
  const v_mglf=parse("Golf","mglf");
  assert.deepEqual(v_mglf.map(line),[
 "Final Aug 31 Men's · Chattanooga at Visit Knoxville Collegiate | T3rd of 17",
 "Final Sep 14 Men's · Chattanooga at Bearcat Invitational | 10th of 17",
 "Final Sep 28 Men's · Chattanooga at Bryan Bros Collegiate | 9th of 16",
 "Final Oct 4 Men's · Chattanooga at Trinity Forest Invitational | 3rd of 16",
 "Final Oct 19 Men's · Chattanooga at Qubein Cup | 1st of 11",
 "Upcoming Jan 25, 9:00 AM Men's · Chattanooga at Southwestern Invitational | ",
 "Upcoming Feb 13, 9:00 AM Men's · Chattanooga at Gator Invitational | ",
 "Upcoming Mar 6, 9:00 AM Men's · Chattanooga at Hayt Collegiate | ",
 "Upcoming Mar 30, 9:00 AM Men's · Chattanooga at Maridoe Collegiate | ",
 "Upcoming Apr 12, 9:00 AM Men's · Chattanooga at Western Intercollegiate | ",
 "Upcoming Apr 26, 9:00 AM Men's · Chattanooga at SoCon Championships | ",
 "Upcoming May 17, 9:00 AM Men's · Chattanooga at NCAA Tournament | ",
 "Upcoming May 28, 9:00 AM Men's · Chattanooga at NCAA Tournament | "
]);
  const v_wglf=parse("Golf","wglf");
  assert.deepEqual(v_wglf.map(line),[
 "Final Sep 14 Women's · Chattanooga at Rocket Classic | 4th",
 "Final Oct 4 Women's · Chattanooga at Mercedes-Benz Intercollegiate | 15th",
 "Upcoming Oct 26 Women's · Chattanooga at French Broad Collegiate | ",
 "Upcoming Nov 1 Women's · Chattanooga at Samford Intercollegiate | ",
 "Upcoming Feb 7 Women's · Chattanooga at Treasure Coast Invitational | ",
 "Upcoming Feb 21 Women's · Chattanooga at Westbrook Invitational | ",
 "Upcoming Mar 6 Women's · Chattanooga at Gator Invitational | ",
 "Upcoming Mar 20 Women's · Chattanooga at More Than Golf Invitational | ",
 "Upcoming Mar 27 Women's · Chattanooga at Liz Murphey Collegiate | ",
 "Upcoming Apr 12 Women's · Chattanooga at Strutting Gus Shootout | ",
 "Upcoming Apr 19 Women's · Chattanooga at Southern Conference Championship | ",
 "Upcoming May 10 Women's · Chattanooga at NCAA Tournament Regionals | ",
 "Upcoming May 21 Women's · Chattanooga at NCAA Tournament Championships | ",
 "Upcoming May 24 Women's · Chattanooga at NCAA Tournament - Championships Final Medal Round | ",
 "Upcoming May 25 Women's · Chattanooga at NCAA Tournament - Championship Match Play | ",
 "Upcoming May 26 Women's · Chattanooga at NCAA Tournament - Championship Match Play Finals | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Chattanooga vs UT Martin | T, 1-1",
 "Final Aug 16 Chattanooga at Winthrop | W, 5-0",
 "Final Aug 20 Chattanooga at Belmont | L, 1-2",
 "Final Aug 23 Chattanooga vs Austin Peay | W, 3-0",
 "Final Aug 27 Chattanooga at Lipscomb | T, 2-2",
 "Final Aug 30 Chattanooga vs Eastern Kentucky | W, 2-1",
 "Final Sep 6 Chattanooga at Morehead State | W, 2-1",
 "Final Sep 10 Chattanooga at North Alabama | T, 1-1",
 "Final Sep 17 Chattanooga at Tennessee Tech | T, 1-1",
 "Final Sep 20 Chattanooga vs The Citadel | W, 3-0",
 "Final Oct 1 Chattanooga at VMI | W, 2-0",
 "Final Oct 4 Chattanooga vs Western Carolina | W, 5-0",
 "Final Oct 9 Chattanooga at Wofford | W, 2-1",
 "Final Oct 15 Chattanooga vs Samford | L, 0-1",
 "Final Oct 18 Chattanooga at Furman | L, 0-2",
 "Final Oct 23 Chattanooga vs UNC Greensboro | T, 1-1",
 "Upcoming Oct 29, 12:00 PM Chattanooga vs East Tennessee | ",
 "Upcoming Nov 1, 2:00 PM Chattanooga at Mercer | ",
 "Upcoming Nov 5 Chattanooga at Southern Conference First Round | ",
 "Upcoming Nov 8 Chattanooga at Southern Conference Quarterfinal | ",
 "Upcoming Nov 13 Chattanooga at Southern Conference Semifinal | ",
 "Upcoming Nov 15 Chattanooga at Southern Conference Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Chattanooga at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Chattanooga at APSU Fall Invite | Completed",
 "Final Oct 8 Women's · Chattanooga at ITA Ohio Valley Regional Championships | Completed",
 "Today Oct 23 Women's · Chattanooga at MTSU Fall Invite | ",
 "Upcoming Oct 30 Women's · Chattanooga at UTR Sports Rome Tournament | ",
 "Upcoming Nov 5 Women's · Chattanooga at ITA Sectionals/Masters | ",
 "Upcoming Nov 7 Women's · Chattanooga at UTC Alumni Day | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Chattanooga at Austin Peay Fall Invitational | Completed",
 "Final Sep 19 Men's · Chattanooga at ITA All-American Championships | Completed",
 "Final Oct 8 Men's · Chattanooga at ITA Ohio Valley Regional Championships | Completed",
 "Upcoming Oct 29 Men's · Chattanooga at UTR Sports/NCAA DI Invite | ",
 "Upcoming Nov 5 Men's · Chattanooga at ITA Sectionals/Masters | ",
 "Upcoming Nov 7 Men's · Chattanooga at UTC Alumni Match | ",
 "Upcoming Nov 17 Men's · Chattanooga at NCAA Division I Individual Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Chattanooga vs Tennessee State | W, 3-0",
 "Final Aug 28 Chattanooga vs Valparaiso | L, 1-3",
 "Final Aug 29 Chattanooga vs UAB | L, 1-3",
 "Final Sep 4 Chattanooga vs UT Martin | W, 3-0",
 "Final Sep 4 Chattanooga at North Alabama | L, 0-3",
 "Final Sep 5 Chattanooga vs Jackson State | W, 3-2",
 "Final Sep 11 Chattanooga at Queens (N.C.) | L, 1-3",
 "Final Sep 11 Chattanooga vs Presbyterian | W, 3-1",
 "Final Sep 12 Chattanooga vs Buffalo | L, 0-3",
 "Final Sep 18 Chattanooga at Radford | L, 0-3",
 "Final Sep 18 Chattanooga vs Bellarmine | L, 1-3",
 "Final Sep 19 Chattanooga vs Norfolk State | W, 3-2",
 "Final Sep 25 Chattanooga vs Wofford | L, 1-3",
 "Final Sep 26 Chattanooga vs Wofford | L, 1-3",
 "Final Oct 1 Chattanooga at Furman | L, 2-3",
 "Final Oct 2 Chattanooga at Furman | L, 0-3",
 "Final Oct 6 Chattanooga at Tennessee Tech | L, 1-3",
 "Final Oct 9 Chattanooga vs ETSU | L, 0-3",
 "Final Oct 10 Chattanooga vs ETSU | L, 0-3",
 "Final Oct 16 Chattanooga vs Western Carolina | W, 3-1",
 "Final Oct 17 Chattanooga vs Western Carolina | L, 0-3",
 "Final Oct 23 Chattanooga at UNCG | L, 1-3",
 "Today Oct 24, 3:00 PM Chattanooga at UNCG | ",
 "Upcoming Oct 27, 6:00 PM Chattanooga vs Tennessee Tech | ",
 "Upcoming Oct 30, 7:30 PM Chattanooga at Samford | ",
 "Upcoming Oct 31, 2:00 PM Chattanooga at Samford | ",
 "Upcoming Nov 5, 6:00 PM Chattanooga vs Mercer | ",
 "Upcoming Nov 6, 6:00 PM Chattanooga vs Mercer | ",
 "Upcoming Nov 13, 6:00 PM Chattanooga at The Citadel | ",
 "Upcoming Nov 14, 2:00 PM Chattanooga at The Citadel | ",
 "Upcoming Nov 19 Chattanooga at Southern Conference Tournament | "
]);
  const v_wr=parse("Wrestling","wr");
  assert.deepEqual(v_wr.map(line),[
 "Upcoming Nov 1 Chattanooga at Southeast Open | ",
 "Upcoming Nov 14 Chattanooga at Princeton | ",
 "Upcoming Nov 14 Chattanooga vs Ohio | ",
 "Upcoming Nov 14 Chattanooga vs Duke | ",
 "Upcoming Nov 22, 2:00 PM Chattanooga vs Little Rock | ",
 "Upcoming Dec 12, 10:00 AM Chattanooga at Central Michigan | ",
 "Upcoming Dec 12, 12:00 PM Chattanooga at Purdue | ",
 "Upcoming Dec 20 Chattanooga at Kent State Open | ",
 "Upcoming Jan 2 Chattanooga at Southern Scuffle | ",
 "Upcoming Jan 16 Chattanooga vs North Dakota State | ",
 "Upcoming Jan 16 Chattanooga vs Utah Valley | ",
 "Upcoming Jan 17 Chattanooga at Davidson Open | ",
 "Upcoming Jan 22, 7:00 PM Chattanooga at The Citadel | ",
 "Upcoming Jan 24, 10:00 AM Chattanooga at Presbyterian | ",
 "Upcoming Jan 29, 7:00 PM Chattanooga vs Gardner-Webb | ",
 "Upcoming Feb 5, 7:00 PM Chattanooga at Davidson | ",
 "Upcoming Feb 7, 3:00 PM Chattanooga at Appalachian State | ",
 "Upcoming Feb 12, 7:00 PM Chattanooga vs VMI | ",
 "Upcoming Feb 13, 7:00 PM Chattanooga vs Campbell | ",
 "Upcoming Feb 20, 7:30 PM Chattanooga vs Bellarmine | ",
 "Upcoming Mar 5 Chattanooga at Southern Conference Championships | ",
 "Upcoming Mar 18 Chattanooga at NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mglf,"Golf mglf");
  ownRecapsOnly(v_wglf,"Golf wglf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wr,"Wrestling wr");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Chattanooga module checks passed");
