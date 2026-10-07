import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tcuSchool} from '../src/schools/tcu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='tcu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,tcuHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/tcu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gofrogs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['tcu'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',tcuSchool.scheduleUrls],['roster',tcuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('tcu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gofrogs.com',`${key} must stay on gofrogs.com`);
  }
}
// Routes: the official pages only (the generic basketball, golf and tennis
// pages, the separate swimming pages and the homepage render SIDEARM's empty
// "@season @sport" template); beach volleyball is /womens-beach-volleyball/;
// basketball, golf and tennis teams labeled; swimming is one page.
const page=slug=>`https://gofrogs.com/sports/${slug}/schedule`,roster=slug=>`https://gofrogs.com/sports/${slug}/roster`;
const routes={Baseball:['baseball'],Basketball:['mens-basketball','womens-basketball'],'Beach Volleyball':['womens-beach-volleyball'],'Cross Country':['cross-country'],Equestrian:['equestrian'],Football:['football'],Golf:['womens-golf','mens-golf'],Rifle:['rifle'],Soccer:['womens-soccer'],'Swimming & Diving':['swimming-and-diving'],Tennis:['womens-tennis','mens-tennis'],'Track & Field':['track-and-field'],Triathlon:['triathlon'],Volleyball:['womens-volleyball']};
const rosters={...routes,Basketball:['mens-basketball','womens-basketball','basketball'],Golf:['womens-golf','mens-golf','golf'],Tennis:['womens-tennis','mens-tennis','tennis'],'Track & Field':['track-and-field','track-field']};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),routes[sport].map(page),`${sport} schedule routes`);
  assert.deepEqual(worker.rosterUrls(school,sport),rosters[sport].map(roster),`${sport} roster routes`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),['Basketball','Golf','Tennis'].includes(sport),`${sport} team combination`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'tcu|"+sport+"':"),`${sport} routes must live in the TCU module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.tcuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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
 "Upcoming Feb 19, 3:00 PM TCU vs Virginia | ",
 "Upcoming Feb 20, 7:00 PM TCU vs Texas | ",
 "Upcoming Feb 21, 6:30 PM TCU vs Oklahoma | ",
 "Upcoming Mar 19, 5:00 PM TCU at UCF | ",
 "Upcoming Mar 20, 5:00 PM TCU at UCF | ",
 "Upcoming Mar 21, 12:00 PM TCU at UCF | ",
 "Upcoming Mar 25, 6:00 PM TCU vs Oklahoma State | ",
 "Upcoming Mar 26, 6:00 PM TCU vs Oklahoma State | ",
 "Upcoming Mar 27, 2:00 PM TCU vs Oklahoma State | ",
 "Upcoming Apr 2, 6:00 PM TCU vs Baylor | ",
 "Upcoming Apr 3, 4:00 PM TCU vs Baylor | ",
 "Upcoming Apr 4, 1:00 PM TCU vs Baylor | ",
 "Upcoming Apr 9 TCU at Arizona | ",
 "Upcoming Apr 10 TCU at Arizona | ",
 "Upcoming Apr 11 TCU at Arizona | ",
 "Upcoming Apr 16, 6:00 PM TCU vs Kansas State | ",
 "Upcoming Apr 17, 4:00 PM TCU vs Kansas State | ",
 "Upcoming Apr 18, 1:00 PM TCU vs Kansas State | ",
 "Upcoming Apr 23 TCU at Cincinnati | ",
 "Upcoming Apr 24 TCU at Cincinnati | ",
 "Upcoming Apr 25 TCU at Cincinnati | ",
 "Upcoming Apr 29, 6:00 PM TCU vs BYU | ",
 "Upcoming Apr 30, 6:00 PM TCU vs BYU | ",
 "Upcoming May 1, 4:00 PM TCU vs BYU | ",
 "Upcoming May 7, 6:30 PM TCU at Texas Tech | ",
 "Upcoming May 8, 2:00 PM TCU at Texas Tech | ",
 "Upcoming May 9, 2:00 PM TCU at Texas Tech | ",
 "Upcoming May 14 TCU at Houston | ",
 "Upcoming May 15 TCU at Houston | ",
 "Upcoming May 16 TCU at Houston | ",
 "Upcoming May 20, 6:00 PM TCU vs West Virginia | ",
 "Upcoming May 21, 6:00 PM TCU vs West Virginia | ",
 "Upcoming May 22, 4:00 PM TCU vs West Virginia | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Aug 1 Men's · TCU vs University of Ottawa (Exhibition) | W, 93-66",
 "Final Aug 2 Men's · TCU vs University of Ottawa (Exhibition) | W, 99-70",
 "Upcoming Oct 17, 1:00 PM Men's · TCU vs Wyoming (Exhibition) | ",
 "Upcoming Nov 2 Men's · TCU vs Lindenwood | ",
 "Upcoming Nov 6 Men's · TCU vs Southern | ",
 "Upcoming Nov 10 Men's · TCU vs ULM | ",
 "Upcoming Nov 13 Men's · TCU vs Milwaukee | ",
 "Upcoming Nov 19 Men's · TCU vs Texas A&M | ",
 "Upcoming Nov 24, 2:00 PM Men's · TCU vs Miami | ",
 "Upcoming Nov 26 Men's · TCU vs Creighton/Michigan | ",
 "Upcoming Nov 27 Men's · TCU at Players Era Championship | ",
 "Upcoming Nov 28 Men's · TCU at Players Era Championship | ",
 "Upcoming Dec 5 Men's · TCU at Notre Dame | ",
 "Upcoming Dec 8 Men's · TCU vs Alabama State | ",
 "Upcoming Dec 12 Men's · TCU vs Clemson | ",
 "Upcoming Dec 19 Men's · TCU vs Holy Cross | ",
 "Upcoming Dec 22 Men's · TCU vs Houston Christian | ",
 "Upcoming Dec 29 Men's · TCU vs Oral Roberts | ",
 "Upcoming Jan 2 Men's · TCU at Houston | ",
 "Upcoming Jan 5 Men's · TCU vs Arizona State | ",
 "Upcoming Jan 9 Men's · TCU vs Texas Tech | ",
 "Upcoming Jan 12 Men's · TCU at Cincinnati | ",
 "Upcoming Jan 16 Men's · TCU at Kansas State | ",
 "Upcoming Jan 19 Men's · TCU vs Baylor | ",
 "Upcoming Jan 23 Men's · TCU at Oklahoma State | ",
 "Upcoming Jan 27 Men's · TCU vs BYU | ",
 "Upcoming Jan 30 Men's · TCU vs Colorado | ",
 "Upcoming Feb 6 Men's · TCU at Arizona State | ",
 "Upcoming Feb 8, 8:00 PM Men's · TCU at Arizona | ",
 "Upcoming Feb 13 Men's · TCU vs Oklahoma State | ",
 "Upcoming Feb 16 Men's · TCU vs Utah | ",
 "Upcoming Feb 20 Men's · TCU at BYU | ",
 "Upcoming Feb 24 Men's · TCU vs Kansas | ",
 "Upcoming Feb 27 Men's · TCU at Iowa State | ",
 "Upcoming Mar 3 Men's · TCU at West Virginia | ",
 "Upcoming Mar 6 Men's · TCU vs UCF | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:30 PM Women's · TCU vs Oral Roberts | ",
 "Upcoming Nov 5, 6:30 PM Women's · TCU vs Le Moyne | ",
 "Upcoming Nov 8, 2:00 PM Women's · TCU vs Tarleton | ",
 "Upcoming Nov 10, 4:00 PM Women's · TCU vs Iona | ",
 "Upcoming Nov 12, 6:30 PM Women's · TCU vs Southeastern Louisiana | ",
 "Upcoming Nov 15, 2:00 PM Women's · TCU vs Abilene Christian | ",
 "Upcoming Nov 18, 6:30 PM Women's · TCU vs UT Arlington | ",
 "Upcoming Nov 22 Women's · TCU vs Utah State | ",
 "Upcoming Nov 27, 12:30 PM Women's · TCU vs Georgia Tech | ",
 "Upcoming Nov 28, 10:00 AM Women's · TCU vs Mississippi State | ",
 "Upcoming Dec 3, 6:00 PM Women's · TCU at Memphis | ",
 "Upcoming Dec 6 Women's · TCU vs Texas | ",
 "Upcoming Dec 10, 6:30 PM Women's · TCU vs UTSA | ",
 "Upcoming Dec 13, 2:00 PM Women's · TCU vs Penn State | ",
 "Upcoming Dec 20 Women's · TCU vs Cincinnati | ",
 "Upcoming Dec 30 Women's · TCU at Iowa State | ",
 "Upcoming Jan 2 Women's · TCU vs Texas Tech | ",
 "Upcoming Jan 6 Women's · TCU vs Utah | ",
 "Upcoming Jan 10 Women's · TCU at West Virginia | ",
 "Upcoming Jan 14 Women's · TCU vs Baylor | ",
 "Upcoming Jan 17 Women's · TCU at Arizona | ",
 "Upcoming Jan 20 Women's · TCU at Arizona State | ",
 "Upcoming Jan 23 Women's · TCU vs BYU | ",
 "Upcoming Jan 28 Women's · TCU at Oklahoma State | ",
 "Upcoming Jan 31 Women's · TCU vs Colorado | ",
 "Upcoming Feb 4 Women's · TCU at Kansas State | ",
 "Upcoming Feb 7 Women's · TCU vs Houston | ",
 "Upcoming Feb 10 Women's · TCU at Kansas | ",
 "Upcoming Feb 15 Women's · TCU vs West Virginia | ",
 "Upcoming Feb 20 Women's · TCU at University of Houston | ",
 "Upcoming Feb 23 Women's · TCU vs UCF | ",
 "Upcoming Feb 28 Women's · TCU at Baylor | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 17 TCU at TCU Fall Invitational (Exhibition) | ",
 "Upcoming Nov 6 TCU vs Texas (Exhibition) | ",
 "Upcoming Nov 6 TCU at AVCA Pairs National Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 TCU at John McKenzie Invitational | Women's team: 2nd / Men's team: 2nd",
 "Final Sep 11 TCU at Texas A&M Invitational | Women's team: 5th / Men's team: 3rd",
 "Final Sep 26 TCU at Cowboy Jamboree | Completed",
 "Upcoming Oct 16 TCU at Arturo Barrios Invitational | ",
 "Upcoming Oct 31 TCU at Big 12 Championships | ",
 "Upcoming Nov 13 TCU at NCAA South Central Regional | ",
 "Upcoming Nov 21 TCU at NCAA Cross Country Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 18 TCU vs South Dakota State | W, 16-2",
 "Final Oct 1 TCU at SMU | L, 7-12",
 "Final Oct 2 TCU at South Carolina | L, 5-14",
 "Upcoming Oct 8, 10:00 AM TCU vs Fresno State | ",
 "Upcoming Oct 23 TCU at Baylor | ",
 "Upcoming Oct 30 TCU at Oklahoma State | ",
 "Upcoming Nov 6, 10:00 AM TCU vs South Carolina | ",
 "Upcoming Jan 28, 10:00 AM TCU vs Minnesota Crookston | ",
 "Upcoming Feb 5 TCU vs Delaware State | ",
 "Upcoming Feb 6 TCU at Fresno State | ",
 "Upcoming Feb 19 TCU at South Dakota State | ",
 "Upcoming Feb 26, 12:00 PM TCU vs Oklahoma State | ",
 "Upcoming Mar 5, 11:00 AM TCU vs Baylor | ",
 "Upcoming Mar 26 TCU at Big 12 Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 TCU vs North Carolina | L, 10-15",
 "Final Sep 12 TCU vs Grambling State | W, 63-7",
 "Final Sep 19 TCU vs Arkansas State | W, 31-7",
 "Final Sep 26 TCU at UCF | L, 13-21",
 "Final Oct 3 TCU vs BYU | L, 10-17",
 "Upcoming Oct 17, 6:00 PM TCU at Baylor | ",
 "Upcoming Oct 24 TCU vs West Virginia | ",
 "Upcoming Oct 31 TCU vs Kansas | ",
 "Upcoming Nov 6, 9:15 PM TCU at Arizona | ",
 "Upcoming Nov 14 TCU vs Kansas State | ",
 "Upcoming Nov 21 TCU vs Utah | ",
 "Upcoming Nov 26, 7:00 PM TCU at Texas Tech | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 2 Women's · TCU at Pan Pacific Super League | 2nd of 12",
 "Final Sep 19 Women's · TCU at Schooner Fall Classic | 5th of 16",
 "Today Oct 5, 9:15 AM Women's · TCU at The Ally | ",
 "Upcoming Oct 12 Women's · TCU at Illini Women's Invitational at Medinah | ",
 "Upcoming Oct 18 Women's · TCU at Jim West Challenge | ",
 "Upcoming Jan 29 Women's · TCU at Collegiate Invitational at Guadalajara Country Club | ",
 "Upcoming Feb 22 Women's · TCU at The Chevron Collegiate | ",
 "Upcoming Mar 14 Women's · TCU at MountainView Collegiate | ",
 "Upcoming Mar 22 Women's · TCU at Charles Schwab Women's Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · TCU at Huntington Bank Collegiate | ",
 "Upcoming Apr 21 Women's · TCU at Big 12 Championship | ",
 "Upcoming May 10 Women's · TCU at NCAA Regional Championships | ",
 "Upcoming May 21 Women's · TCU at NCAA National Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 2 Men's · TCU at Pan Pacific Super League Tournament | 3rd of 14",
 "Final Sep 14 Men's · TCU at Bearcat Invitational | 2nd of 17",
 "Final Sep 28 Men's · TCU at Ben Hogan Collegiate Invitational presented by Charles Schwab | 11th of 15",
 "Upcoming Oct 12 Men's · TCU at Big 12 Match Play Tournament | ",
 "Upcoming Oct 26 Men's · TCU at Ka'anapali Classic | ",
 "Upcoming Feb 7 Men's · TCU at Dorado Beach Collegiate | ",
 "Upcoming Feb 14 Men's · TCU at Watersound Invitational | ",
 "Upcoming Mar 15 Men's · TCU at Black Desert Collegiate | ",
 "Upcoming Mar 25 Men's · TCU at The Goodwin | ",
 "Upcoming Apr 12 Men's · TCU at Mountaineer Invitational | ",
 "Upcoming Apr 26 Men's · TCU at Big 12 Championship | ",
 "Upcoming May 18 Men's · TCU at NCAA Regional | ",
 "Upcoming May 28 Men's · TCU at NCAA Championship | "
]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Sep 26 TCU at Navy/VMI | 2nd - 4,718",
 "Final Oct 4 TCU at Ohio State/Navy | 2nd - 4,724",
 "Upcoming Oct 11 TCU at Army | ",
 "Upcoming Oct 24 TCU at UTEP | ",
 "Upcoming Oct 31 TCU at The Citadel | ",
 "Upcoming Nov 7 TCU at Ole Miss | ",
 "Upcoming Nov 14 TCU at West Virginia Fall Classic (Smallbore) | ",
 "Upcoming Nov 15 TCU at West Virginia Fall Classic (Air Rifle) | ",
 "Upcoming Jan 17 TCU at Ohio State/Schreiner | ",
 "Upcoming Jan 18 TCU at Ohio State University | ",
 "Upcoming Jan 24 TCU at US Olympic Training Center | ",
 "Upcoming Jan 30 TCU at UTEP | ",
 "Upcoming Feb 5 TCU at Patriot Rifle Conference Championships (Smallbore) | ",
 "Upcoming Feb 6 TCU at Patriot Rifle Conference Championships (Air Rifle) | ",
 "Upcoming Feb 13 TCU at Air Force | ",
 "Upcoming Feb 20 TCU at Air Force (NCAA Qualifier) | ",
 "Upcoming Mar 12 TCU at NCAA Championships (Smallbore) | ",
 "Upcoming Mar 13 TCU at NCAA Championships (Air Rifle) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 TCU at Wisconsin | W, 1-0",
 "Final Aug 16 TCU vs UTSA | T, 2-2",
 "Final Aug 20 TCU at Alabama | L, 2-3",
 "Final Aug 27 TCU vs Georgia | W, 3-2",
 "Final Sep 3 TCU at Texas A&M | W, 3-0",
 "Final Sep 6 TCU vs Texas | L, 0-1",
 "Final Sep 17 TCU at Oklahoma State | L, 1-3",
 "Final Sep 24 TCU at Utah | W, 1-0",
 "Final Sep 28 TCU at BYU | L, 0-2",
 "Final Oct 2 TCU vs Cincinnati | W, 2-0",
 "Upcoming Oct 8, 7:00 PM TCU vs UCF | ",
 "Upcoming Oct 11, 1:00 PM TCU vs Texas Tech | ",
 "Upcoming Oct 16, 7:00 PM TCU at Baylor | ",
 "Upcoming Oct 22, 7:00 PM TCU at Houston | ",
 "Upcoming Oct 25, 1:00 PM TCU vs Kansas | ",
 "Upcoming Oct 30, 6:00 PM TCU at West Virginia | ",
 "Upcoming Nov 5, 7:00 PM TCU vs Arizona | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 TCU at Texas A&M | Completed",
 "Final Sep 26 TCU at Incarnate Word | Completed",
 "Final Oct 3 TCU at Arkansas and Drury | Completed",
 "Upcoming Oct 8, 3:00 PM TCU at USC Invite Day One | ",
 "Upcoming Oct 9, 11:00 AM TCU at USC Invite Day Two | ",
 "Upcoming Oct 30, 6:00 PM TCU vs SMU (Women Only) | ",
 "Upcoming Nov 4, 4:00 PM TCU at SMU (Men Only) | ",
 "Upcoming Nov 12 TCU at Texas Diving Invitational | ",
 "Upcoming Nov 18, 10:00 AM TCU at Texas Invite | ",
 "Upcoming Dec 2 TCU at US Open | ",
 "Upcoming Dec 9 TCU at USA Diving Qualifier | ",
 "Upcoming Dec 12 TCU at CSCAA Open Water Championship | ",
 "Upcoming Jan 16 TCU at Big 12 East Championship | ",
 "Upcoming Jan 22, 10:00 AM TCU at Eddie Reese Invite | ",
 "Upcoming Jan 30 TCU vs Oklahoma Christian | ",
 "Upcoming Feb 23 TCU at Big 12 Championships | ",
 "Upcoming Mar 7 TCU at NCAA Diving Zones | ",
 "Upcoming Mar 17 TCU at Women's NCAA Championships | ",
 "Upcoming Mar 24 TCU at Men's NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Upcoming Oct 8 Women's · TCU at ITA Regional Championships | ",
 "Upcoming Oct 12 Women's · TCU at ITF Edmond W100 | ",
 "Upcoming Oct 19 Women's · TCU at ITF Austin W50 | ",
 "Upcoming Oct 22 Women's · TCU at Battle for the Boot JAE Foundation Open | ",
 "Upcoming Oct 26 Women's · TCU at ITF Norman W35 | ",
 "Upcoming Oct 29 Women's · TCU at HEB Invite | ",
 "Upcoming Nov 2 Women's · TCU at ITF Stillwater W35 | ",
 "Upcoming Nov 5 Women's · TCU at ITA Sectionals | ",
 "Upcoming Nov 5 Women's · TCU at ITA Conference Masters (Game 1) | ",
 "Upcoming Nov 5 Women's · TCU at ITA Conference Masters (Game 2) | ",
 "Upcoming Nov 9 Women's · TCU at ITF Lincoln W15 | ",
 "Upcoming Nov 16 Women's · TCU at ITF Clemson W15 | ",
 "Upcoming Nov 17 Women's · TCU at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · TCU at Milwaukee Tennis Classic | Completed",
 "Final Sep 19 Men's · TCU at ITA All-American Championships | Completed",
 "Final Sep 30 Men's · TCU at Battle in the Bay Classic | Completed",
 "Upcoming Oct 8 Men's · TCU at ITA Texas Regional | ",
 "Upcoming Oct 23 Men's · TCU at Baylor Invitational | ",
 "Upcoming Oct 30 Men's · TCU at Ralston / Neufeld Coaches Challenge | ",
 "Upcoming Nov 5 Men's · TCU at ITA Sectional Championships | ",
 "Upcoming Nov 5 Men's · TCU at ITA Conference Masters Championships | ",
 "Upcoming Nov 17 Men's · TCU at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Jan 15 TCU at LeTourneau Team Invite | ",
 "Upcoming Jan 22 TCU at Texas A&M Ted Nelson Invitational | ",
 "Upcoming Jan 29 TCU at UW Invite | ",
 "Upcoming Feb 5 TCU at New Mexico Collegiate Classic | ",
 "Upcoming Feb 5 TCU at Charlie Thomas Invitational | ",
 "Upcoming Feb 12 TCU at Don Kirby Elite | ",
 "Upcoming Feb 19 TCU at Alex Wilson Invite | ",
 "Upcoming Feb 19 TCU at Crimson Invite | ",
 "Upcoming Feb 26 TCU at Big 12 Indoor Championships | ",
 "Upcoming Mar 12 TCU at NCAA Indoor Championships | ",
 "Upcoming Mar 19 TCU at TCU Alumni Invite | ",
 "Upcoming Mar 26 TCU at Baylor Clyde Hart Classic | ",
 "Upcoming Apr 1 TCU at Texas Relays | ",
 "Upcoming Apr 10 TCU at 44 Farms Invite | ",
 "Upcoming Apr 14 TCU at Mt. SAC Relays | ",
 "Upcoming Apr 14 TCU at Bryan Clay Invitational | ",
 "Upcoming Apr 14 TCU at Michael Johnson Invitational | ",
 "Upcoming Apr 22 TCU at Penn Relays | ",
 "Upcoming Apr 29 TCU at TCU Horned Frog Invite | ",
 "Upcoming May 13 TCU at Big 12 Outdoor Championships | ",
 "Upcoming May 27 TCU at NCAA West Preliminary Round | ",
 "Upcoming Jun 10 TCU at NCAA Outdoor Championships | "
]);
  const v_triathlon=parse("Triathlon","triathlon");
  assert.deepEqual(v_triathlon.map(line),[
 "Final Sep 5 TCU at Southern Hills Collegiate Cup | 2nd Place (290 Points)",
 "Final Sep 27 TCU at Deserts Edge Collegiate Cup | 1st Place (298 Points)",
 "Final Oct 4 TCU at Navy Collegiate Cup | 1st Place (286 Points)",
 "Upcoming Oct 18 TCU at West Regional National Qualifier | ",
 "Upcoming Nov 8 TCU at National Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 TCU vs Texas | L, 0-3",
 "Final Aug 30 TCU vs UNLV | W, 3-0",
 "Final Sep 2 TCU vs SMU | W, 3-2",
 "Final Sep 4 TCU at Louisville | L, 0-3",
 "Final Sep 6 TCU at Purdue | W, 3-0",
 "Final Sep 10 TCU at USF | W, 3-0",
 "Final Sep 11 TCU vs Michigan | W, 3-1",
 "Final Sep 12 TCU vs Dayton | W, 3-1",
 "Final Sep 16 TCU vs UTEP | W, 3-1",
 "Final Sep 18 TCU vs Yale | W, 3-0",
 "Final Sep 18 TCU vs Rice | W, 3-1",
 "Final Sep 25 TCU at Cincinnati | W, 3-0",
 "Final Sep 27 TCU at West Virginia | W, 3-1",
 "Final Oct 2 TCU vs Colorado | W, 3-1",
 "Final Oct 4 TCU vs UCF | W, 3-1",
 "Upcoming Oct 9, 6:30 PM TCU vs Arizona | ",
 "Upcoming Oct 11, 4:00 PM TCU at Arizona State | ",
 "Upcoming Oct 16, 6:30 PM TCU vs Texas Tech | ",
 "Upcoming Oct 18, 2:00 PM TCU vs Baylor | ",
 "Upcoming Oct 23, 7:00 PM TCU vs Kansas | ",
 "Upcoming Oct 30, 7:00 PM TCU at Baylor | ",
 "Upcoming Nov 1, 2:00 PM TCU vs Kansas State | ",
 "Upcoming Nov 6, 6:30 PM TCU at Houston | ",
 "Upcoming Nov 13, 6:30 PM TCU at Kansas State | ",
 "Upcoming Nov 15, 2:00 PM TCU at Kansas | ",
 "Upcoming Nov 20, 6:30 PM TCU vs Arizona State | ",
 "Upcoming Nov 22, 2:00 PM TCU vs Iowa State | ",
 "Upcoming Nov 25, 8:00 PM TCU at Utah | ",
 "Upcoming Nov 27, 7:30 PM TCU at BYU | "
]);
  // Each final matches only its own story (Volleyball's Yale and Rice share one).
  for(const [events,label,count] of [[v_football,'Football',5],[v_womensvolleyball,'Volleyball',15],[v_womenssoccer,'Soccer',10],[v_equestrian,'Equestrian',3],[v_mensbasketball,'Basketball',2]])assert.equal(ownRecapsOnly(events,label),count);
  // "(Exh.)" is an exhibition label; an event-named opponent reads "at".
  assert.ok(!v_mensbasketball.some(e=>/\(Exh\.\)/.test(e.title)));
  assert.equal(v_womensbeachvolleyball[0].title,'TCU at TCU Fall Invitational (Exhibition)');
  assert.ok(v_womenstennis.filter(e=>/ITF/.test(e.title)).every(e=>/\bTCU at ITF/.test(e.title))&&v_womenstennis.some(e=>/ITF/.test(e.title)));
  // Men's golf places carry no suffix ("3/14"): read as "3rd of 14".
  assert.deepEqual(v_mensgolf.filter(e=>e.status==='Final').map(e=>e.headline),['3rd of 14','2nd of 17','11th of 15']);
  // The Ally's final round was cancelled: the place after round two stands.
  const ally=parse('Golf','womens-golf',new Date('2026-10-08T15:00:00Z')).find(e=>e.opponent==='The Ally');
  assert.equal(line(ally),"Final Oct 5 Women's · TCU at The Ally | 6th of 17");
}

// Cross Country: the Cowboy Jamboree's story is in the archive (the schedule
// links none) and TFRRS adds TCU's women's results.
{
  const jamboree=parse('Cross Country','cross-country').find(e=>e.opponent==='Cowboy Jamboree');
  assert.equal(worker.tcuHandlers.isFinalWithoutStory(jamboree),true);
  recapFixtures.set('https://gofrogs.com/sports/cross-country/archives',fixture('cross-country-archives.html.gz'));
  for(const path of ['2026/9/26/kowa-and-gonzales-lead-cross-country-at-cowboy-jamboree','2026/9/25/cross-country-preview-cowboy-jamboree'])recapFixtures.set(`https://gofrogs.com/news/${path}`,fixture(`story-${path.split('/').slice(0,3).join('-')}-${path.split('/')[3].slice(0,40)}.html.gz`.replace('story-2026-9-25-cross-country-preview-cowboy-jamboree','story-2026-9-26-kowa-and-gonzales-lead-cross-country-at-')));
  await worker.tcuHandlers.attachArchiveStory(jamboree);
  assert.equal(jamboree.recap_url,'https://gofrogs.com/news/2026/9/26/kowa-and-gonzales-lead-cross-country-at-cowboy-jamboree');
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/TX_college_f_TCU.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/TX_college_m_TCU.html','tfrrs-team-m.html.gz'],['https://www.tfrrs.org/results/xc/28553/2026_Cowboy_Jamboree_','tfrrs-28553.html.gz'],['https://www.tfrrs.org/results/xc/28243/TCU_John_McKenzie_Invitational','tfrrs-28243.html.gz'],['https://www.tfrrs.org/results/xc/28142/Texas_AM_Invitational_College_Entries','tfrrs-28142.html.gz']])recapFixtures.set(url,fixture(file));
  await worker.attachOfficialMeetResults(jamboree);
  assert.match(jamboree.headline,/^Women's team: \d+(st|nd|rd|th)/);
  const [mckenzie]=parse('Cross Country','cross-country');
  await worker.attachOfficialMeetResults(mckenzie);
  assert.match(mckenzie.headline,/^Women's team: 2nd · \d+ pts \/ Men's team: 2nd · \d+ pts$/);
  recapFixtures.clear();
}

// Swimming & Diving: the schedule gives past meets no score and links no
// story; each is final ("Completed") with its story from the archive (the
// Sep 26 story covers Texas A&M and Incarnate Word); the double dual names
// both hosts.
{
  const sw=parse('Swimming & Diving','swimming-and-diving').filter(e=>e.status==='Final');
  assert.deepEqual(sw.map(line),['Final Sep 25 TCU at Texas A&M | Completed','Final Sep 26 TCU at Incarnate Word | Completed','Final Oct 3 TCU at Arkansas and Drury | Completed']);
  recapFixtures.set('https://gofrogs.com/sports/swimming-and-diving/archives',fixture('swimming-and-diving-archives.html.gz'));
  for(const [path,file] of [['2026/9/26/swimming-and-diving-tcu-sweeps-incarnate-word-competes-against-texas-am','story-2026-9-26-swimming-and-diving-tcu-sweeps-incarnate.html.gz'],['2026/10/3/swimming-and-diving-tcu-splits-double-dual-with-arkansas-and-drury','story-2026-10-3-swimming-and-diving-tcu-splits-double-du.html.gz']])recapFixtures.set(`https://gofrogs.com/news/${path}`,fixture(file));
  for(const meet of sw){assert.equal(worker.tcuHandlers.isFinalWithoutStory(meet),true);await worker.tcuHandlers.attachArchiveStory(meet);}
  assert.deepEqual(sw.map(e=>e.recap_url.split('/news/')[1]),['2026/9/26/swimming-and-diving-tcu-sweeps-incarnate-word-competes-against-texas-am','2026/9/26/swimming-and-diving-tcu-sweeps-incarnate-word-competes-against-texas-am','2026/10/3/swimming-and-diving-tcu-splits-double-dual-with-arkansas-and-drury']);
  recapFixtures.clear();
}

// Live: ESPN joins the official card for TCU's game only.
{
  live('Football','football-espn-2026-10-03.json.gz',parse('Football','football'),new Date('2026-10-04T12:00:00Z'),[['TCU vs BYU','Final','L, 10-17']]);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',parse('Volleyball','womens-volleyball'),new Date('2026-10-05T12:00:00Z'),[['TCU vs UCF','Final','W, 3-1']]);
  live('Soccer','soccer-espn-2026-10-02.json.gz',parse('Soccer','womens-soccer'),new Date('2026-10-03T12:00:00Z'),[['TCU vs Cincinnati','Final','W, 2-0']]);
}

// Records: each sport's overall and Big 12 record equals the one its page publishes.
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
    return holder?[String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,''),String(data[holder.conference]).replace(/\s+/g,'')]:null;
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug,overall,conference,computed] of [['Football','football','2-3','0-2','0-2'],['Volleyball','womens-volleyball','13-2','4-0','4-0'],['Soccer','womens-soccer','5-4-1','2-2-0','2-2'],['Equestrian','equestrian','1-2','0-0','0-0']]){
    // Soccer's page writes no ties as "2-2-0".
    assert.deepEqual(published(slug),[overall,conference],`${sport}: the official page publishes ${overall} (${conference} Big 12)`);
    assert.deepEqual(record(sport,slug).map(r=>[r.text,r.conference?.text||'0-0']),[[overall,computed]],`${sport}: the computed records are the official ones`);
  }
  // Exhibitions (the Costa Rica tour) are not in the record.
  assert.deepEqual(worker.groupEvents(parse('Basketball','mens-basketball'),now)[0]?.records||[],[]);
  assert.deepEqual(record('Cross Country','cross-country'),[]);
}

// Triathlon: the official card doubles Sara Gimena's Instagram link; the
// account it names is listed.
assert.equal(tcuSchool.verifiedInstagrams['tcu|Triathlon|Sara Gimena'],'https://www.instagram.com/saragimena_02/');

// Other schools and other hosts never reach the TCU reader.
assert.equal(worker.tcuHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://gofrogs.com/',now),null);
assert.equal(worker.tcuHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='texas-tech'),'Football',page('football'),now),null);
requests.length=0;

assert.equal(requests.length,0,'no unexpected network requests');
console.log('TCU module checks passed');
