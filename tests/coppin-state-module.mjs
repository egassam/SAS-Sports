import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {coppinStateSchool} from '../src/schools/coppin-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='coppin-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,coppinStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/coppin-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit coppinstatesports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['coppin-state'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',coppinStateSchool.scheduleUrls],['roster',coppinStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('coppin-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'coppinstatesports.com',`${key} must stay on coppinstatesports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://coppinstatesports.com/sports/baseball/schedule"],"roster":["https://coppinstatesports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://coppinstatesports.com/sports/mens-basketball/schedule","https://coppinstatesports.com/sports/womens-basketball/schedule"],"roster":["https://coppinstatesports.com/sports/mens-basketball/roster","https://coppinstatesports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://coppinstatesports.com/sports/womens-bowling/schedule"],"roster":["https://coppinstatesports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://coppinstatesports.com/sports/womens-cross-country/schedule","https://coppinstatesports.com/sports/mens-cross-country/schedule"],"roster":["https://coppinstatesports.com/sports/womens-cross-country/roster","https://coppinstatesports.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://coppinstatesports.com/sports/womens-golf/schedule","https://coppinstatesports.com/sports/mens-golf/schedule"],"roster":["https://coppinstatesports.com/sports/womens-golf/roster","https://coppinstatesports.com/sports/mens-golf/roster"],"combined":true},"Softball":{"schedule":["https://coppinstatesports.com/sports/softball/schedule"],"roster":["https://coppinstatesports.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://coppinstatesports.com/sports/womens-tennis/schedule","https://coppinstatesports.com/sports/mens-tennis/schedule"],"roster":["https://coppinstatesports.com/sports/womens-tennis/roster","https://coppinstatesports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://coppinstatesports.com/sports/womens-track-and-field/schedule","https://coppinstatesports.com/sports/mens-track-and-field/schedule"],"roster":["https://coppinstatesports.com/sports/womens-track-and-field/roster","https://coppinstatesports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://coppinstatesports.com/sports/womens-volleyball/schedule"],"roster":["https://coppinstatesports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'coppin-state|"+sport+"':"),`${sport} routes must live in the Coppin State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://coppinstatesports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.coppinStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=coppin-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · Coppin State at Virginia Tech | ",
 "Upcoming Nov 6, 7:00 PM Men's · Coppin State at George Mason | ",
 "Upcoming Nov 9, 11:00 AM Men's · Coppin State vs Cheyney | ",
 "Upcoming Nov 12, 6:00 PM Men's · Coppin State vs Bradley | ",
 "Upcoming Nov 14, 2:00 PM Men's · Coppin State at USF | ",
 "Upcoming Nov 18, 7:00 PM Men's · Coppin State at La Salle | ",
 "Upcoming Nov 21, 6:00 PM Men's · Coppin State at Georgetown | ",
 "Upcoming Nov 24, 7:00 PM Men's · Coppin State at Villanova | ",
 "Upcoming Nov 30, 7:00 PM Men's · Coppin State vs Central Penn | ",
 "Upcoming Dec 3, 7:00 PM Men's · Coppin State at VCU | ",
 "Upcoming Dec 7, 7:00 PM Men's · Coppin State vs Mercyhurst | ",
 "Upcoming Dec 10, 7:00 PM Men's · Coppin State vs Mount St. Mary's (Md.) | ",
 "Upcoming Dec 13, 3:00 PM Men's · Coppin State at West Virginia | ",
 "Upcoming Dec 17, 7:00 PM Men's · Coppin State at Liberty | ",
 "Upcoming Dec 19, 2:00 PM Men's · Coppin State at Saint Joseph's | ",
 "Upcoming Dec 22, 3:00 PM Men's · Coppin State at James Madison | ",
 "Upcoming Dec 29, 6:00 PM Men's · Coppin State at UMBC | ",
 "Upcoming Jan 2, 5:00 PM Men's · Coppin State vs Delaware State | ",
 "Upcoming Jan 9, 5:00 PM Men's · Coppin State at N.C. Central | ",
 "Upcoming Jan 11, 7:00 PM Men's · Coppin State at South Carolina State | ",
 "Upcoming Jan 16, 5:00 PM Men's · Coppin State vs Maryland Eastern Shore | ",
 "Upcoming Jan 20, 7:00 PM Men's · Coppin State vs UDC | ",
 "Upcoming Jan 23, 5:00 PM Men's · Coppin State vs Norfolk State | ",
 "Upcoming Jan 25, 7:00 PM Men's · Coppin State at Howard | ",
 "Upcoming Jan 30, 5:00 PM Men's · Coppin State at Morgan State | ",
 "Upcoming Feb 6, 5:00 PM Men's · Coppin State at Delaware State | ",
 "Upcoming Feb 13, 5:00 PM Men's · Coppin State vs N.C. Central | ",
 "Upcoming Feb 15, 7:00 PM Men's · Coppin State vs South Carolina State | ",
 "Upcoming Feb 20, 5:00 PM Men's · Coppin State at Maryland Eastern Shore | ",
 "Upcoming Feb 27, 5:00 PM Men's · Coppin State at Norfolk State | ",
 "Upcoming Mar 1, 7:00 PM Men's · Coppin State vs Howard | ",
 "Upcoming Mar 4, 8:00 PM Men's · Coppin State vs Morgan State | ",
 "Upcoming Mar 10 Men's · Coppin State at MEAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Coppin State vs Cheyney | ",
 "Upcoming Nov 5, 7:00 PM Women's · Coppin State vs Tennessee | ",
 "Upcoming Nov 9, 7:00 PM Women's · Coppin State at Central Connecticut State | ",
 "Upcoming Nov 11, 6:00 PM Women's · Coppin State at Hofstra | ",
 "Upcoming Nov 18, 6:00 PM Women's · Coppin State at Maryland | ",
 "Upcoming Nov 24, 11:00 AM Women's · Coppin State vs William & Mary | ",
 "Upcoming Nov 27, 7:30 PM Women's · Coppin State vs VCU | ",
 "Upcoming Nov 28, 5:00 PM Women's · Coppin State vs Richmond | ",
 "Upcoming Nov 30, 7:00 PM Women's · Coppin State at West Virginia | ",
 "Upcoming Dec 3, 6:00 PM Women's · Coppin State vs Towson | ",
 "Upcoming Dec 7, 6:00 PM Women's · Coppin State at UMBC | ",
 "Upcoming Dec 9, 7:00 PM Women's · Coppin State at LIU | ",
 "Upcoming Dec 11, 6:00 PM Women's · Coppin State vs Monmouth | ",
 "Upcoming Dec 13, 2:00 PM Women's · Coppin State at Rutgers | ",
 "Upcoming Dec 18, 7:30 PM Women's · Coppin State at SMU | ",
 "Upcoming Dec 22, 7:00 PM Women's · Coppin State at Dayton | ",
 "Upcoming Jan 2, 2:00 PM Women's · Coppin State vs Delaware State | ",
 "Upcoming Jan 7, 7:00 PM Women's · Coppin State at South Carolina State | ",
 "Upcoming Jan 9, 2:00 PM Women's · Coppin State at North Carolina Central | ",
 "Upcoming Jan 12, 6:00 PM Women's · Coppin State vs Lincoln (Pa.) | ",
 "Upcoming Jan 16, 2:00 PM Women's · Coppin State vs Maryland Eastern Shore | ",
 "Upcoming Jan 21, 7:00 PM Women's · Coppin State at Howard | ",
 "Upcoming Jan 23, 2:00 PM Women's · Coppin State vs Norfolk State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Coppin State at Morgan State | ",
 "Upcoming Feb 2, 6:00 PM Women's · Coppin State vs Washington Adventist | ",
 "Upcoming Feb 6, 2:00 PM Women's · Coppin State at Delaware State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Coppin State vs South Carolina State | ",
 "Upcoming Feb 13, 2:00 PM Women's · Coppin State vs North Carolina Central | ",
 "Upcoming Feb 20, 2:00 PM Women's · Coppin State at Maryland Eastern Shore | ",
 "Upcoming Feb 25, 7:00 PM Women's · Coppin State vs Howard | ",
 "Upcoming Feb 27, 2:00 PM Women's · Coppin State at Norfolk State | ",
 "Upcoming Mar 4, 5:30 PM Women's · Coppin State vs Morgan State | ",
 "Upcoming Mar 10 Women's · Coppin State at MEAC Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 2 Coppin State vs 410 Clash on the Lanes | W, 2-0",
 "Final Oct 10 Coppin State at Bud Whitman Memorial | 6th of 9 (3-6 Overall)",
 "Upcoming Oct 30 Coppin State at Virginia Union Invitational | ",
 "Upcoming Nov 6 Coppin State at Duquesne Invitational | ",
 "Upcoming Nov 14 Coppin State at CSU Lady Eagles Invitational | ",
 "Upcoming Jan 23 Coppin State at Hornet Classic | ",
 "Upcoming Jan 30 Coppin State at Griffin Baker Classic | ",
 "Upcoming Feb 5 Coppin State at MEAC Meet #1 | ",
 "Upcoming Feb 26 Coppin State at Stallings Invitational | ",
 "Upcoming Mar 7 Coppin State at Battle of the Beltway | ",
 "Upcoming Mar 19 Coppin State at MEAC Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Coppin State at Delaware Invitational | 8th of 8",
 "Final Sep 11 Women's · Coppin State at DSU Sting Invitational | 3rd of 6",
 "Final Sep 19 Women's · Coppin State at UMES Invite | 2nd of 4",
 "Final Oct 10 Women's · Coppin State at WCU Golden Ram Open | 4th of 6 (Paulino-Martinez 5th)",
 "Final Oct 16 Women's · Coppin State at Panorama Farms Invitational | 16th of 16",
 "Upcoming Oct 30 Women's · Coppin State at MEAC Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Coppin State at Delaware Invitational | 3rd of 8",
 "Final Sep 11 Men's · Coppin State at DSU Sting Invitational | 2nd of 7",
 "Final Sep 19 Men's · Coppin State at UMES Invite | 1st of 4",
 "Final Oct 10 Men's · Coppin State at WCU Golden Ram Open | 3rd of 4 (Maila 3rd Overall)",
 "Final Oct 16 Men's · Coppin State at Panorama Farms Invitational | 14th of 14",
 "Upcoming Oct 30 Men's · Coppin State at MEAC Championships | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Coppin State at Elon Invitational | 15th",
 "Final Oct 5 Women's · Coppin State at Maurice Allen Intercollegiate Championship | 3rd of 3",
 "Final Oct 12 Women's · Coppin State at Evann Parker Memorial | Completed",
 "Today Oct 23 Women's · Coppin State at Fripp Island Intercollegiate | ",
 "Upcoming Feb 15 Women's · Coppin State at Rivertowne Invitational | ",
 "Upcoming Feb 22 Women's · Coppin State at Stetson Hatter Invitational | ",
 "Upcoming Mar 1 Women's · Coppin State at River Landing Classic | ",
 "Upcoming Mar 29 Women's · Coppin State at NKU Spring Invitational | ",
 "Upcoming Apr 10 Women's · Coppin State at Rutgers Invitational | ",
 "Upcoming Apr 22 Women's · Coppin State at MEAC Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · Coppin State at TheelLove Invitational | No team score (individuals only)",
 "Final Sep 20 Men's · Coppin State at Laker Fall Invitational | Completed",
 "Final Sep 28 Men's · Coppin State at Ironwood Collegiate Classic | Completed",
 "Final Oct 5 Men's · Coppin State at Maurice Allen Intercollegiate Championship | 2nd of 4",
 "Today Oct 23 Men's · Coppin State at Fripp Island Intercollegiate | ",
 "Upcoming Mar 15 Men's · Coppin State at Sacred Heart Spring Break Invite | ",
 "Upcoming Mar 20 Men's · Coppin State at Carpetbagger Classic | ",
 "Upcoming Mar 26 Men's · Coppin State at Battle at Rum Pointe | ",
 "Upcoming Apr 5 Men's · Coppin State at Robinson Invitational | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · Coppin State at Towson Invitational | Completed",
 "Final Oct 2 Women's · Coppin State at MEAC Fall Individuals | Completed",
 "Final Oct 15 Women's · Coppin State at ITA Atlantic Regionals | Completed",
 "Upcoming Oct 24 Women's · Coppin State at Morgan State Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Coppin State at Loyola Invitational | Completed",
 "Final Oct 2 Men's · Coppin State at MEAC Fall Individuals | Completed",
 "Final Oct 8 Men's · Coppin State at ITA Atlantic Regionals | Completed",
 "Upcoming Oct 24 Men's · Coppin State at Morgan State Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 5 Women's · Coppin State at Youree Spence-Garcia Invitational | ",
 "Upcoming Jan 8 Women's · Coppin State at VCU Ram Indoor Invite | ",
 "Upcoming Jan 16 Women's · Coppin State at HBCU Showcase Presented by Nike Running | ",
 "Upcoming Jan 30 Women's · Coppin State at Penn State National Open | ",
 "Upcoming Feb 6 Women's · Coppin State at ECAC/IC4A Indoor Track & Field Championships | ",
 "Upcoming Feb 21 Women's · Coppin State at MEAC Indoor Championships | ",
 "Upcoming Mar 5 Women's · Coppin State at HBCU Indoor Track & Field Championship | ",
 "Upcoming Mar 12 Women's · Coppin State at NCAA Indoor Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 5 Men's · Coppin State at Youree Spence-Garcia Invitational | ",
 "Upcoming Jan 8 Men's · Coppin State at VCU Ram Indoor Invite | ",
 "Upcoming Jan 16 Men's · Coppin State at HBCU Showcase Presented by Nike Running | ",
 "Upcoming Jan 30 Men's · Coppin State at Penn State National Open | ",
 "Upcoming Feb 6 Men's · Coppin State at ECAC/IC4A Indoor Track & Field Championships | ",
 "Upcoming Feb 21 Men's · Coppin State at MEAC Indoor Championships | ",
 "Upcoming Mar 5 Men's · Coppin State at HBCU Indoor Track & Field Championship | ",
 "Upcoming Mar 12 Men's · Coppin State at NCAA Indoor Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Coppin State vs William & Mary | W, 3-1",
 "Final Aug 28 Coppin State vs Kent State | L, 2-3",
 "Final Aug 29 Coppin State at Virginia Tech | L, 1-3",
 "Final Sep 4 Coppin State at Navy | L, 1-3",
 "Final Sep 5 Coppin State vs Penn | L, 2-3",
 "Final Sep 5 Coppin State vs Stony Brook | L, 2-3",
 "Final Sep 10 Coppin State vs Valparaiso | W, 3-1",
 "Final Sep 11 Coppin State at Akron | W, 3-2",
 "Final Sep 12 Coppin State at Cleveland State | W, 3-1",
 "Final Sep 18 Coppin State at UConn | W, 3-1",
 "Final Sep 19 Coppin State vs Rhode Island | W, 3-1",
 "Final Sep 19 Coppin State vs Merrimack | W, 3-0",
 "Final Sep 20 Coppin State at New Haven | W, 3-1",
 "Final Sep 24 Coppin State at Howard | W, 3-0",
 "Final Sep 27 Coppin State at Norfolk State | W, 3-0",
 "Final Sep 29 Coppin State vs Loyola Maryland | W, 3-2",
 "Final Oct 2 Coppin State at South Carolina State | W, 3-0",
 "Final Oct 4 Coppin State at North Carolina Central | W, 3-1",
 "Final Oct 9 Coppin State vs Maryland Eastern Shore | W, 3-0",
 "Final Oct 11 Coppin State at Delaware State | W, 3-0",
 "Final Oct 14 Coppin State vs Towson | L, 0-3",
 "Final Oct 16 Coppin State vs Morgan State | L, 2-3",
 "Final Oct 18 Coppin State vs Norfolk State | W, 3-1",
 "Today Oct 23, 6:00 PM Coppin State vs Howard | ",
 "Upcoming Oct 28, 5:00 PM Coppin State at UMBC | ",
 "Upcoming Oct 30, 6:00 PM Coppin State vs South Carolina State | ",
 "Upcoming Nov 1, 1:00 PM Coppin State vs North Carolina Central | ",
 "Upcoming Nov 5, 6:00 PM Coppin State at Maryland Eastern Shore | ",
 "Upcoming Nov 8, 1:00 PM Coppin State vs Delaware State | ",
 "Upcoming Nov 13, 6:00 PM Coppin State at Morgan State | ",
 "Upcoming Nov 20 Coppin State at MEAC Tournament | ",
 "Upcoming Nov 21 Coppin State at MEAC Tournament | ",
 "Upcoming Nov 22 Coppin State at MEAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Coppin State module checks passed");
