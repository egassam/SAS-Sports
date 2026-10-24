import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {vmiSchool} from '../src/schools/vmi.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='vmi');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,vmiHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/vmi-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit vmikeydets.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['vmi'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',vmiSchool.scheduleUrls],['roster',vmiSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('vmi|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'vmikeydets.com',`${key} must stay on vmikeydets.com`);
  }
}
const parity={"Baseball":{"schedule":["https://vmikeydets.com/sports/baseball/schedule"],"roster":["https://vmikeydets.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://vmikeydets.com/sports/mens-basketball/schedule"],"roster":["https://vmikeydets.com/sports/mens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://vmikeydets.com/sports/womens-cross-country/schedule","https://vmikeydets.com/sports/mens-cross-country/schedule"],"roster":["https://vmikeydets.com/sports/womens-cross-country/roster","https://vmikeydets.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://vmikeydets.com/sports/football/schedule"],"roster":["https://vmikeydets.com/sports/football/roster"],"combined":false},"Lacrosse":{"schedule":["https://vmikeydets.com/sports/lacrosse/schedule"],"roster":["https://vmikeydets.com/sports/lacrosse/roster"],"combined":false},"Rifle":{"schedule":["https://vmikeydets.com/sports/mens-rifle/schedule"],"roster":["https://vmikeydets.com/sports/mens-rifle/roster"],"combined":false},"Soccer":{"schedule":["https://vmikeydets.com/sports/womens-soccer/schedule","https://vmikeydets.com/sports/mens-soccer/schedule"],"roster":["https://vmikeydets.com/sports/womens-soccer/roster","https://vmikeydets.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://vmikeydets.com/sports/womens-swimming-and-diving/schedule","https://vmikeydets.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://vmikeydets.com/sports/womens-swimming-and-diving/roster","https://vmikeydets.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://vmikeydets.com/sports/womens-track-and-field/schedule","https://vmikeydets.com/sports/mens-track-and-field/schedule"],"roster":["https://vmikeydets.com/sports/womens-track-and-field/roster","https://vmikeydets.com/sports/mens-track-and-field/roster"],"combined":true},"Water Polo":{"schedule":["https://vmikeydets.com/sports/womens-water-polo/schedule"],"roster":["https://vmikeydets.com/sports/womens-water-polo/roster"],"combined":false},"Wrestling":{"schedule":["https://vmikeydets.com/sports/wrestling/schedule"],"roster":["https://vmikeydets.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'vmi|"+sport+"':"),`${sport} routes must live in the VMI module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://vmikeydets.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.vmiHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=vmi)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Men's · VMI vs VU Lynchburg | ",
 "Upcoming Nov 5 Men's · VMI at SMU | ",
 "Upcoming Nov 7 Men's · VMI at UTSA | ",
 "Upcoming Nov 11, 6:00 PM Men's · VMI vs North Carolina Central | ",
 "Upcoming Nov 13 Men's · VMI vs Mary Baldwin | ",
 "Upcoming Nov 18, 7:00 PM Men's · VMI at Longwood | ",
 "Upcoming Nov 21 Men's · VMI vs Gardner-Webb | ",
 "Upcoming Nov 24, 6:00 PM Men's · VMI vs Southern Indiana | ",
 "Upcoming Nov 28 Men's · VMI at Richmond | ",
 "Upcoming Dec 1, 6:00 PM Men's · VMI vs UNCG | ",
 "Upcoming Dec 5, 1:00 PM Men's · VMI vs ETSU | ",
 "Upcoming Dec 7, 6:00 PM Men's · VMI vs Christendom | ",
 "Upcoming Dec 10, 6:00 PM Men's · VMI vs Bluefield | ",
 "Upcoming Dec 21 Men's · VMI at Virginia Tech | ",
 "Upcoming Dec 30, 6:00 PM Men's · VMI vs Furman | ",
 "Upcoming Jan 2, 1:00 PM Men's · VMI at Western Carolina | ",
 "Upcoming Jan 7 Men's · VMI at Tennessee Tech | ",
 "Upcoming Jan 9, 2:00 PM Men's · VMI at Chattanooga | ",
 "Upcoming Jan 13, 6:00 PM Men's · VMI vs Wofford | ",
 "Upcoming Jan 16, 10:00 AM Men's · VMI vs The Citadel | ",
 "Upcoming Jan 18 Men's · VMI at Samford | ",
 "Upcoming Jan 20 Men's · VMI at Mercer | ",
 "Upcoming Jan 28, 6:00 PM Men's · VMI vs Chattanooga | ",
 "Upcoming Jan 30, 1:00 PM Men's · VMI vs Tennessee Tech | ",
 "Upcoming Feb 3, 6:00 PM Men's · VMI at Wofford | ",
 "Upcoming Feb 6 Men's · VMI at ETSU | ",
 "Upcoming Feb 11, 6:00 PM Men's · VMI vs Mercer | ",
 "Upcoming Feb 13, 1:00 PM Men's · VMI vs Samford | ",
 "Upcoming Feb 18 Men's · VMI at Furman | ",
 "Upcoming Feb 20 Men's · VMI at The Citadel | ",
 "Upcoming Feb 24 Men's · VMI at UNCG | ",
 "Upcoming Feb 27, 1:00 PM Men's · VMI vs Western Carolina | ",
 "Upcoming Mar 5 Men's · VMI at Ingles SoCon Basketball Tournament | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · VMI at Spider Alumni Open | Completed",
 "Final Sep 11 Women's · VMI at Shenandoah Twilight | Completed",
 "Final Sep 25 Women's · VMI at Tryon Western NC XC Showcase | Completed",
 "Final Oct 2 Women's · VMI at Richmond Invitational | Completed",
 "Final Oct 16 Women's · VMI at Panorama Farms Invitational | Completed",
 "Upcoming Oct 31, 9:00 AM Women's · VMI at Southern Conference Championship | ",
 "Upcoming Nov 13 Women's · VMI at NCAA Southeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · VMI at Spider Alumni Open | Completed",
 "Final Sep 11 Men's · VMI at Shenandoah Twilight | Completed",
 "Final Sep 25 Men's · VMI at Tryon Western NC XC Showcase | Completed",
 "Final Oct 2 Men's · VMI at Richmond Invitational | Completed",
 "Final Oct 16 Men's · VMI at Panorama Farms Invitational | Completed",
 "Upcoming Oct 31, 9:00 AM Men's · VMI at Southern Conference Championship | ",
 "Upcoming Nov 13, 9:30 AM Men's · VMI at NCAA Southeast Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 VMI at Idaho State | L, 10-38",
 "Final Sep 5 VMI at Virginia Tech | L, 3-73",
 "Final Sep 12 VMI vs Bucknell | L, 3-14",
 "Final Sep 19 VMI at Davidson | L, 24-27",
 "Final Sep 26 VMI at Samford | L, 7-45",
 "Final Oct 3 VMI vs Mercer | L, 3-54",
 "Final Oct 17 VMI at Wofford | L, 14-41",
 "Today Oct 24, 1:30 PM VMI vs ETSU | ",
 "Upcoming Oct 31, 1:00 PM VMI at Chattanooga | ",
 "Upcoming Nov 7, 2:30 PM VMI at Tennessee Tech | ",
 "Upcoming Nov 14, 12:30 PM VMI vs The Citadel | ",
 "Upcoming Nov 21, 12:00 PM VMI vs Furman | "
]);
  const v_lacrosse=parse("Lacrosse","lacrosse");
  assert.deepEqual(v_lacrosse.map(line),[]);
  const v_mensrifle=parse("Rifle","mens-rifle");
  assert.deepEqual(v_mensrifle.map(line),[
 "Final Sep 26 VMI at Navy | TCU | Completed",
 "Final Oct 17 VMI at Mount Aloysius | Completed",
 "Upcoming Oct 25, 8:00 AM VMI at The Citadel | ",
 "Upcoming Nov 1, 8:00 AM VMI at Ohio State | ",
 "Upcoming Nov 8, 8:00 AM VMI at John Jay | ",
 "Upcoming Nov 14, 8:00 AM VMI at UAB | ",
 "Upcoming Dec 5, 8:00 AM VMI at Wofford | ",
 "Upcoming Jan 16, 8:00 AM VMI at Georgia Southern | ",
 "Upcoming Jan 23, 8:00 AM VMI at Wofford | ",
 "Upcoming Jan 30, 8:00 AM VMI at The Citadel | ",
 "Upcoming Feb 12, 8:00 AM VMI at VMI Rifle Invitational | ",
 "Upcoming Feb 13, 8:00 AM VMI at VMI Rifle Invitational | ",
 "Upcoming Feb 20, 8:00 AM VMI at West Virginia | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · VMI at George Mason | L, 1-4",
 "Final Aug 16 Women's · VMI at Virginia Tech | L, 0-6",
 "Final Aug 20 Women's · VMI at Winthrop | L, 0-1",
 "Final Aug 27 Women's · VMI vs Longwood | L, 0-1",
 "Final Aug 30 Women's · VMI vs Gardner-Webb | T, 1-1",
 "Final Sep 3 Women's · VMI vs Elon | L, 0-5",
 "Final Sep 6 Women's · VMI vs Navy | L, 0-3",
 "Final Sep 10 Women's · VMI vs Richmond | L, 0-1",
 "Final Sep 13 Women's · VMI at UNC Asheville | L, 1-5",
 "Final Sep 17 Women's · VMI at The Citadel | L, 3-5",
 "Final Sep 20 Women's · VMI vs UNCG | L, 2-4",
 "Final Sep 27 Women's · VMI at Furman | L, 1-7",
 "Final Oct 1 Women's · VMI vs Chattanooga | L, 0-2",
 "Final Oct 4 Women's · VMI at Tennessee Tech | L, 0-5",
 "Final Oct 11 Women's · VMI vs ETSU | L, 0-3",
 "Final Oct 15 Women's · VMI vs Western Carolina | L, 0-2",
 "Final Oct 18 Women's · VMI at Mercer | L, 1-4",
 "Upcoming Oct 29, 6:00 PM Women's · VMI at Wofford | ",
 "Upcoming Nov 1, 2:00 PM Women's · VMI vs Samford | ",
 "Upcoming Nov 5 Women's · VMI at Southern Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · VMI at Elon | L, 0-3",
 "Final Aug 22 Men's · VMI vs Regent | W, 6-0",
 "Final Aug 24 Men's · VMI vs Presbyterian | W, 3-1",
 "Final Aug 26 Men's · VMI vs Randolph | W, 2-1",
 "Final Aug 29 Men's · VMI at Saint Peter's | L, 1-2",
 "Final Aug 31 Men's · VMI at Central Connecticut State | L, 0-3",
 "Final Sep 5 Men's · VMI vs Winthrop | L, 0-3",
 "Final Sep 9 Men's · VMI vs Warren Wilson | W, 8-0",
 "Final Sep 12 Men's · VMI vs UNC Asheville | L, 0-4",
 "Final Sep 19 Men's · VMI at Howard | L, 1-2",
 "Final Sep 23 Men's · VMI at Radford | L, 1-3",
 "Final Sep 27 Men's · VMI at ETSU | L, 1-2",
 "Final Sep 30 Men's · VMI vs Eastern Mennonite | T, 1-1",
 "Final Oct 3 Men's · VMI vs Wofford | L, 0-1",
 "Final Oct 10 Men's · VMI at Furman | L, 1-6",
 "Final Oct 17 Men's · VMI vs UNC Greensboro | L, 0-4",
 "Today Oct 24, 12:30 PM Men's · VMI vs Mercer | ",
 "Upcoming Oct 30, 3:00 PM Men's · VMI at Liberty | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · VMI at UMBC | Completed",
 "Final Oct 3 Women's · VMI vs American | Completed",
 "Final Oct 10 Women's · VMI vs Sweet Briar | Completed",
 "Final Oct 10 Women's · VMI vs Hollins | Completed",
 "Final Oct 16 Women's · VMI vs Mount St. Mary's | Completed",
 "Upcoming Nov 13 Women's · VMI at Keydet Invite | ",
 "Upcoming Dec 2 Women's · VMI at U.S. Open Championships | ",
 "Upcoming Dec 12 Women's · VMI at CSCAA Open Water Championships | ",
 "Upcoming Jan 15, 1:00 PM Women's · VMI at American | ",
 "Upcoming Jan 22, 6:00 PM Women's · VMI vs Washington and Lee | ",
 "Upcoming Jan 23, 11:00 AM Women's · VMI vs Davidson | ",
 "Upcoming Jan 29 Women's · VMI at VT Invite | ",
 "Upcoming Feb 17 Women's · VMI at NEC Championships | ",
 "Upcoming Mar 8 Women's · VMI at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 11 Women's · VMI at CSCAA NIC | ",
 "Upcoming Mar 17 Women's · VMI at Women's NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · VMI at UMBC | Completed",
 "Final Oct 3 Men's · VMI vs American | Completed",
 "Final Oct 10 Men's · VMI vs Hampden-Sydney | Completed",
 "Final Oct 16 Men's · VMI vs Mount St. Mary's (Md.) | Completed",
 "Upcoming Nov 13 Men's · VMI at Keydet Invite | ",
 "Upcoming Dec 2 Men's · VMI at U.S. Open Championships | ",
 "Upcoming Dec 12 Men's · VMI at CSCAA Open Water Championships | ",
 "Upcoming Jan 15, 1:00 PM Men's · VMI at American | ",
 "Upcoming Jan 22, 6:00 PM Men's · VMI vs Washington and Lee | ",
 "Upcoming Jan 23, 11:00 AM Men's · VMI vs Davidson | ",
 "Upcoming Jan 29 Men's · VMI at VT Invite | ",
 "Upcoming Feb 17 Men's · VMI at NEC Championships | ",
 "Upcoming Mar 8 Men's · VMI at NCAA Zone A Diving Championships | ",
 "Upcoming Mar 11 Men's · VMI at CSCAA NIC | ",
 "Upcoming Mar 24 Men's · VMI at Men's NCAA Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 3 Women's · VMI at Liberty Kickoff | ",
 "Upcoming Jan 16 Women's · VMI at VMI Team Challenge | ",
 "Upcoming Jan 22 Women's · VMI at VMI Invitational | ",
 "Upcoming Jan 29 Women's · VMI at Winter Relays | ",
 "Upcoming Feb 13 Women's · VMI at Winter Classic | ",
 "Upcoming Feb 26 Women's · VMI at SoCon Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 3 Men's · VMI at Liberty Kickoff | ",
 "Upcoming Jan 16 Men's · VMI at VMI Team Challenge | ",
 "Upcoming Jan 22 Men's · VMI at VMI Invitational | ",
 "Upcoming Jan 29 Men's · VMI at Winter Relays | ",
 "Upcoming Feb 13 Men's · VMI at Winter Classic | ",
 "Upcoming Feb 26 Men's · VMI at SoCon Championships | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[
 "Upcoming Nov 7, 10:00 AM VMI vs Salem | ",
 "Upcoming Nov 7, 4:00 PM VMI vs Mount St. Mary's (Md.) | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 2:00 PM VMI vs Michigan | ",
 "Upcoming Nov 7 VMI vs Michigan State Open | ",
 "Upcoming Nov 14, 11:00 AM VMI vs Salem | ",
 "Upcoming Nov 14, 1:00 PM VMI vs LIU | ",
 "Upcoming Nov 14, 3:00 PM VMI vs Presbyterian | ",
 "Upcoming Nov 22 VMI at Black Knight Invite | ",
 "Upcoming Dec 6 VMI vs Patriot Open | ",
 "Upcoming Dec 20, 12:00 PM VMI vs Bloomsburg | ",
 "Upcoming Dec 20, 2:00 PM VMI at Sacred Heart | ",
 "Upcoming Jan 8, 3:00 PM VMI vs Appalachian State | ",
 "Upcoming Jan 16, 1:00 PM VMI vs Brown | ",
 "Upcoming Jan 16, 3:00 PM VMI vs Morgan State | ",
 "Upcoming Jan 22, 6:00 PM VMI vs Ohio | ",
 "Upcoming Jan 24, 2:00 PM VMI at Bellarmine | ",
 "Upcoming Jan 29, 7:00 PM VMI at Campbell | ",
 "Upcoming Feb 4, 7:00 PM VMI at Davidson | ",
 "Upcoming Feb 12, 7:00 PM VMI at Chattanooga | ",
 "Upcoming Feb 14, 1:00 PM VMI vs Mercyhurst | ",
 "Upcoming Feb 14, 3:00 PM VMI vs Gardner-Webb | ",
 "Upcoming Feb 19, 7:00 PM VMI vs The Citadel | ",
 "Upcoming Mar 5 VMI at Southern Conference Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_lacrosse,"Lacrosse lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("VMI module checks passed");
