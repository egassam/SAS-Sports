import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {morganStateSchool} from '../src/schools/morgan-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='morgan-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,morganStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/morgan-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit morganstatebears.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['morgan-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',morganStateSchool.scheduleUrls],['roster',morganStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('morgan-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'morganstatebears.com',`${key} must stay on morganstatebears.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://morganstatebears.com/sports/acrobatics-and-tumbling/schedule"],"roster":["https://morganstatebears.com/sports/acrobatics-and-tumbling/roster"],"combined":false},"Basketball":{"schedule":["https://morganstatebears.com/sports/mens-basketball/schedule","https://morganstatebears.com/sports/womens-basketball/schedule"],"roster":["https://morganstatebears.com/sports/mens-basketball/roster","https://morganstatebears.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://morganstatebears.com/sports/womens-bowling/schedule"],"roster":["https://morganstatebears.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://morganstatebears.com/sports/womens-cross-country/schedule","https://morganstatebears.com/sports/mens-cross-country/schedule"],"roster":["https://morganstatebears.com/sports/womens-cross-country/roster","https://morganstatebears.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://morganstatebears.com/sports/football/schedule"],"roster":["https://morganstatebears.com/sports/football/roster"],"combined":false},"Softball":{"schedule":["https://morganstatebears.com/sports/softball/schedule"],"roster":["https://morganstatebears.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://morganstatebears.com/sports/womens-tennis/schedule","https://morganstatebears.com/sports/mens-tennis/schedule"],"roster":["https://morganstatebears.com/sports/womens-tennis/roster","https://morganstatebears.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://morganstatebears.com/sports/womens-track-and-field/schedule","https://morganstatebears.com/sports/mens-track-and-field/schedule"],"roster":["https://morganstatebears.com/sports/womens-track-and-field/roster","https://morganstatebears.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://morganstatebears.com/sports/womens-volleyball/schedule"],"roster":["https://morganstatebears.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://morganstatebears.com/sports/wrestling/schedule"],"roster":["https://morganstatebears.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'morgan-state|"+sport+"':"),`${sport} routes must live in the Morgan State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://morganstatebears.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.morganStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=morgan-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticsandtumbling=parse("Acrobatics & Tumbling","acrobatics-and-tumbling");
  assert.deepEqual(v_acrobaticsandtumbling.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Morgan State vs Cheyney University of Pennsylvania | ",
 "Upcoming Nov 4, 7:00 PM Men's · Morgan State vs Virginia University of Lynchburg | ",
 "Upcoming Nov 7, 6:30 PM Men's · Morgan State at Niagara | ",
 "Upcoming Nov 12, 6:00 PM Men's · Morgan State at UMBC | ",
 "Upcoming Nov 14 Men's · Morgan State at Towson | ",
 "Upcoming Nov 18, 7:00 PM Men's · Morgan State at North Carolina A&T State | ",
 "Upcoming Nov 21, 2:00 PM Men's · Morgan State vs Cornell | ",
 "Upcoming Nov 24, 7:00 PM Men's · Morgan State vs Mount St. Mary's (Md.) | ",
 "Upcoming Nov 28, 2:00 PM Men's · Morgan State vs Manhattan | ",
 "Upcoming Dec 5, 2:00 PM Men's · Morgan State vs Mercyhurst | ",
 "Upcoming Dec 8, 7:00 PM Men's · Morgan State at George Mason | ",
 "Upcoming Dec 15, 8:00 PM Men's · Morgan State at Maryland | ",
 "Upcoming Dec 19, 3:00 PM Men's · Morgan State at Longwood | ",
 "Upcoming Dec 22, 7:00 PM Men's · Morgan State at Virginia Commonwealth | ",
 "Upcoming Dec 29, 8:30 PM Men's · Morgan State at Auburn | ",
 "Upcoming Jan 2 Men's · Morgan State vs Maryland Eastern Shore | ",
 "Upcoming Jan 9, 4:00 PM Men's · Morgan State at South Carolina State | ",
 "Upcoming Jan 11, 7:00 PM Men's · Morgan State at North Carolina Central | ",
 "Upcoming Jan 16, 4:00 PM Men's · Morgan State vs Delaware State | ",
 "Upcoming Jan 23, 4:00 PM Men's · Morgan State vs Howard | ",
 "Upcoming Jan 25, 7:00 PM Men's · Morgan State vs Norfolk State | ",
 "Upcoming Jan 30, 4:00 PM Men's · Morgan State vs Coppin State | ",
 "Upcoming Feb 6, 3:30 PM Men's · Morgan State at Maryland Eastern Shore | ",
 "Upcoming Feb 13, 4:00 PM Men's · Morgan State vs South Carolina State | ",
 "Upcoming Feb 15, 7:00 PM Men's · Morgan State vs North Carolina Central | ",
 "Upcoming Feb 20 Men's · Morgan State at Delaware State | ",
 "Upcoming Feb 27 Men's · Morgan State at Howard | ",
 "Upcoming Mar 1, 7:00 PM Men's · Morgan State at Norfolk State | ",
 "Upcoming Mar 4, 8:00 PM Men's · Morgan State at Coppin State | ",
 "Upcoming Mar 9 Men's · Morgan State at MEAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Morgan State vs Washington Adventist | ",
 "Upcoming Nov 4, 8:00 PM Women's · Morgan State at Colorado | ",
 "Upcoming Nov 6, 3:00 PM Women's · Morgan State at Oklahoma State | ",
 "Upcoming Nov 8, 5:00 PM Women's · Morgan State at Oklahoma | ",
 "Upcoming Nov 13, 6:30 PM Women's · Morgan State at UMBC | ",
 "Upcoming Nov 15, 1:00 PM Women's · Morgan State at Loyola University Maryland / Towson | ",
 "Upcoming Nov 18, 6:00 PM Women's · Morgan State vs Virginia University of Lynchburg | ",
 "Upcoming Nov 21, 12:00 PM Women's · Morgan State at Maryland | ",
 "Upcoming Nov 24, 6:00 PM Women's · Morgan State at Virginia Commonwealth | ",
 "Upcoming Dec 2, 2:00 PM Women's · Morgan State at Georgetown | ",
 "Upcoming Dec 4 Women's · Morgan State at South Florida | ",
 "Upcoming Dec 7, 6:30 PM Women's · Morgan State at Central Florida | ",
 "Upcoming Dec 10, 6:00 PM Women's · Morgan State vs Mount St. Mary's (Md.) | ",
 "Upcoming Dec 18, 11:00 AM Women's · Morgan State at Florida International | ",
 "Upcoming Dec 19, 1:30 PM Women's · Morgan State vs Hampton | ",
 "Upcoming Dec 20, 2:00 PM Women's · Morgan State at Miami | ",
 "Upcoming Dec 28, 2:00 PM Women's · Morgan State at Old Dominion | ",
 "Upcoming Jan 2, 2:00 PM Women's · Morgan State vs Maryland Eastern Shore | ",
 "Upcoming Jan 7 Women's · Morgan State at North Carolina Central | ",
 "Upcoming Jan 9 Women's · Morgan State at South Carolina State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Morgan State vs Delaware State | ",
 "Upcoming Jan 21, 6:00 PM Women's · Morgan State vs Norfolk State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Morgan State vs Howard | ",
 "Upcoming Jan 30, 2:00 PM Women's · Morgan State vs Coppin State | ",
 "Upcoming Feb 6, 1:00 PM Women's · Morgan State at Maryland Eastern Shore | ",
 "Upcoming Feb 11, 6:00 PM Women's · Morgan State vs North Carolina Central | ",
 "Upcoming Feb 13, 2:00 PM Women's · Morgan State vs South Carolina State | ",
 "Upcoming Feb 20 Women's · Morgan State at Delaware State | ",
 "Upcoming Feb 25 Women's · Morgan State at Norfolk State | ",
 "Upcoming Feb 27 Women's · Morgan State at Howard | ",
 "Upcoming Mar 4, 5:30 PM Women's · Morgan State at Coppin State | ",
 "Upcoming Mar 10 Women's · Morgan State at Mid-Eastern Athletic Conference | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 2 Morgan State at Coppin State | Completed",
 "Final Oct 17 Morgan State at Golden Bear Invitational | Completed",
 "Upcoming Oct 24 Morgan State at Seahawk Classic | ",
 "Upcoming Nov 14 Morgan State at CSU Lady Eagles Invitational | ",
 "Upcoming Jan 15 Morgan State at Northeast Classic | ",
 "Upcoming Jan 23 Morgan State at Hornet Classic | ",
 "Upcoming Jan 30 Morgan State at Griffin Baker Classic | ",
 "Upcoming Feb 5 Morgan State at MEAC No. 1 | ",
 "Upcoming Feb 26 Morgan State at Stallings Invite | ",
 "Upcoming Mar 13 Morgan State at Northeast Roundup | ",
 "Upcoming Mar 19 Morgan State at Mid-Eastern Athletic Conference Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Morgan State at Delaware Invitational | Completed",
 "Final Sep 11 Women's · Morgan State at Delaware State Sting Invitational | Completed",
 "Final Sep 19 Women's · Morgan State at UMES Soaring Hawks Invite | Completed",
 "Final Oct 2 Women's · Morgan State at Richmond Invitational | Completed",
 "Final Oct 16 Women's · Morgan State at Joe Handelman '52 Fall Classic | Completed",
 "Upcoming Oct 30, 11:00 AM Women's · Morgan State at MEAC Championship | ",
 "Upcoming Nov 14 Women's · Morgan State at NCAA Regional Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Morgan State at Delaware Invitational | Completed",
 "Final Sep 11 Men's · Morgan State at Delaware State Sting Invitational | Completed",
 "Final Sep 19 Men's · Morgan State at UMES Soaring Hawks Invite | Completed",
 "Final Oct 2 Men's · Morgan State at Richmond Invitational | Completed",
 "Final Oct 16 Men's · Morgan State at Joe Handelman '52 Fall Classic | Completed",
 "Upcoming Oct 30, 11:00 AM Men's · Morgan State at MEAC Championships | ",
 "Upcoming Nov 14 Men's · Morgan State at NCAA Regional Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Morgan State at North Carolina A&T State | W, 17-7",
 "Final Sep 5 Morgan State at Arizona State | L, 7-70",
 "Final Sep 12 Morgan State vs Virginia University of Lynchburg | W, 55-0",
 "Final Sep 19 Morgan State at Towson | W, 41-26",
 "Final Oct 3 Morgan State at Villanova | W, 38-35",
 "Final Oct 10 Morgan State vs Robert Morris | W, 28-27",
 "Final Oct 17 Morgan State at Tennessee State | L, 16-25",
 "Upcoming Oct 24, 3:00 PM Morgan State vs Howard | ",
 "Upcoming Oct 29, 7:00 PM Morgan State vs South Carolina State | ",
 "Upcoming Nov 7, 1:00 PM Morgan State at Delaware State | ",
 "Upcoming Nov 14, 12:00 PM Morgan State vs Norfolk State | ",
 "Upcoming Nov 21, 2:00 PM Morgan State at North Carolina Central | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Today Oct 23, 3:30 PM Morgan State vs Howard Community College | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Morgan State at William and Mary Invitational | Completed",
 "Final Sep 18 Women's · Morgan State at Moore Invitational (Navy) | Completed",
 "Final Sep 25 Women's · Morgan State at Towson Invitational | Completed",
 "Final Oct 1 Women's · Morgan State at MEAC Individual (Cary) | Completed",
 "Final Oct 2 Women's · Morgan State at Loyola Invitational | Completed",
 "Final Oct 15 Women's · Morgan State at ITA Regionals (Liberty) | Completed",
 "Upcoming Oct 24 Women's · Morgan State at Bear 4-1 Invitational (Clifton) | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Morgan State at Navy | Completed",
 "Final Sep 18 Men's · Morgan State at Loyola Maryland Invitational | Completed",
 "Final Sep 25 Men's · Morgan State at Bloomsburg Invitational | Completed",
 "Final Oct 1 Men's · Morgan State at MEAC Individual Championship | Completed",
 "Final Oct 9 Men's · Morgan State at Gold Invitational | Completed",
 "Final Oct 12 Men's · Morgan State at Virginia Tech | Completed",
 "Upcoming Oct 24 Men's · Morgan State at Bear 4-1 Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Morgan State vs Cleveland State | L, 0-3",
 "Final Aug 29 Morgan State vs Gardner-Webb | L, 0-3",
 "Final Aug 29 Morgan State at Lehigh | L, 0-3",
 "Final Sep 4 Morgan State vs Saint Peter's | W, 3-1",
 "Final Sep 5 Morgan State vs Loyola University Maryland | L, 2-3",
 "Final Sep 6 Morgan State vs Towson | L, 0-3",
 "Final Sep 11 Morgan State vs Georgetown | L, 0-3",
 "Final Sep 12 Morgan State vs George Mason | L, 1-3",
 "Final Sep 13 Morgan State vs George Washington | L, 1-3",
 "Final Sep 18 Morgan State at Ohio | L, 1-3",
 "Final Sep 18 Morgan State vs Mercyhurst | L, 0-3",
 "Final Sep 19 Morgan State vs UNC Asheville | L, 1-3",
 "Final Sep 25 Morgan State at Norfolk State | W, 3-1",
 "Final Sep 27 Morgan State vs Howard | L, 1-3",
 "Final Oct 2 Morgan State at North Carolina Central | L, 2-3",
 "Final Oct 4 Morgan State at South Carolina State | W, 3-2",
 "Final Oct 9 Morgan State vs Delaware State | W, 3-2",
 "Final Oct 11 Morgan State at Maryland Eastern Shore | W, 3-1",
 "Final Oct 16 Morgan State at Coppin State | W, 3-2",
 "Today Oct 23, 5:00 PM Morgan State vs Norfolk State | ",
 "Upcoming Oct 25, 1:00 PM Morgan State at Howard | ",
 "Upcoming Oct 30, 6:00 PM Morgan State vs North Carolina Central | ",
 "Upcoming Nov 1, 1:00 PM Morgan State vs South Carolina State | ",
 "Upcoming Nov 6, 6:00 PM Morgan State at Delaware State | ",
 "Upcoming Nov 8, 1:00 PM Morgan State vs Maryland Eastern Shore | ",
 "Upcoming Nov 13, 6:00 PM Morgan State vs Coppin State | ",
 "Upcoming Nov 20 Morgan State at Mid-Eastern Athletic Conference Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1 Morgan State at Navy Classic Tournament | ",
 "Upcoming Nov 14 Morgan State at Missouri - St. Louis | ",
 "Upcoming Nov 22, 3:00 PM Morgan State at Maryland / Ohio | ",
 "Upcoming Dec 6, 3:00 PM Morgan State vs American / Liberty | ",
 "Upcoming Dec 12, 12:00 PM Morgan State vs Columbia | ",
 "Upcoming Dec 19, 12:00 PM Morgan State vs Navy | ",
 "Upcoming Jan 2 Morgan State at Southern Scuffle | ",
 "Upcoming Jan 10 Morgan State vs Virginia | ",
 "Upcoming Jan 16 Morgan State at Virginia Military Institute / Brown | ",
 "Upcoming Jan 23 Morgan State at Lehigh | ",
 "Upcoming Jan 31, 3:00 PM Morgan State vs Franklin & Marshall College | ",
 "Upcoming Feb 5, 6:00 PM Morgan State vs Bucknell | ",
 "Upcoming Feb 13 Morgan State at Sacred Heart | ",
 "Upcoming Feb 21, 2:00 PM Morgan State at Army West Point | ",
 "Upcoming Mar 5 Morgan State at EIWA Championships | ",
 "Upcoming Mar 18 Morgan State at NCAA Championships | "
]);
  ownRecapsOnly(v_acrobaticsandtumbling,"Acrobatics & Tumbling acrobatics-and-tumbling");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Morgan State module checks passed");
