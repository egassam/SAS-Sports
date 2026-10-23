import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {norfolkStateSchool} from '../src/schools/norfolk-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='norfolk-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,norfolkStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/norfolk-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit nsuspartans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['norfolk-state'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',norfolkStateSchool.scheduleUrls],['roster',norfolkStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('norfolk-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'nsuspartans.com',`${key} must stay on nsuspartans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://nsuspartans.com/sports/baseball/schedule"],"roster":["https://nsuspartans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://nsuspartans.com/sports/mens-basketball/schedule","https://nsuspartans.com/sports/womens-basketball/schedule"],"roster":["https://nsuspartans.com/sports/mens-basketball/roster","https://nsuspartans.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://nsuspartans.com/sports/womens-bowling/schedule"],"roster":["https://nsuspartans.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://nsuspartans.com/sports/womens-cross-country/schedule","https://nsuspartans.com/sports/mens-cross-country/schedule"],"roster":["https://nsuspartans.com/sports/womens-cross-country/roster","https://nsuspartans.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://nsuspartans.com/sports/football/schedule"],"roster":["https://nsuspartans.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://nsuspartans.com/sports/womens-golf/schedule"],"roster":["https://nsuspartans.com/sports/womens-golf/roster"],"combined":false},"Softball":{"schedule":["https://nsuspartans.com/sports/softball/schedule"],"roster":["https://nsuspartans.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://nsuspartans.com/sports/womens-tennis/schedule","https://nsuspartans.com/sports/mens-tennis/schedule"],"roster":["https://nsuspartans.com/sports/womens-tennis/roster","https://nsuspartans.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://nsuspartans.com/sports/womens-track-and-field/schedule","https://nsuspartans.com/sports/mens-track-and-field/schedule"],"roster":["https://nsuspartans.com/sports/womens-track-and-field/roster","https://nsuspartans.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://nsuspartans.com/sports/womens-volleyball/schedule"],"roster":["https://nsuspartans.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'norfolk-state|"+sport+"':"),`${sport} routes must live in the Norfolk State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://nsuspartans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.norfolkStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=norfolk-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Aug 12 Men's · Norfolk State at LBP Blue All-Stars | L, 77-79",
 "Final Aug 13 Men's · Norfolk State at LBP White All-Stars | W, 82-81",
 "Final Aug 14 Men's · Norfolk State at LBP Red All-Stars | L, 67-76",
 "Upcoming Nov 2, 8:00 PM Men's · Norfolk State vs Regent | ",
 "Upcoming Nov 4, 8:00 PM Men's · Norfolk State vs Randolph | ",
 "Upcoming Nov 8, 6:00 PM Men's · Norfolk State at William & Mary | ",
 "Upcoming Nov 11, 7:00 PM Men's · Norfolk State vs Old Dominion | ",
 "Upcoming Nov 15, 1:00 PM Men's · Norfolk State at Georgia State | ",
 "Upcoming Nov 17, 7:00 PM Men's · Norfolk State at Georgia Tech | ",
 "Upcoming Nov 21, 6:00 PM Men's · Norfolk State vs UNC Wilmington | ",
 "Upcoming Nov 25, 7:00 PM Men's · Norfolk State at NC State | ",
 "Upcoming Nov 29, 7:30 PM Men's · Norfolk State at Univ. of Washington | ",
 "Upcoming Dec 1, 10:00 PM Men's · Norfolk State at Univ. of Seattle | ",
 "Upcoming Dec 4, 8:30 PM Men's · Norfolk State vs Florida A&M | ",
 "Upcoming Dec 5, 2:00 PM Men's · Norfolk State at Campbell | ",
 "Upcoming Dec 9, 7:00 PM Men's · Norfolk State vs Apprentice | ",
 "Upcoming Dec 12, 4:00 PM Men's · Norfolk State at Hampton | ",
 "Upcoming Dec 16, 6:00 PM Men's · Norfolk State at Columbia | ",
 "Upcoming Dec 18, 7:00 PM Men's · Norfolk State vs Virginia Lynchburg | ",
 "Upcoming Dec 22, 6:00 PM Men's · Norfolk State at Drexel | ",
 "Upcoming Dec 29, 7:00 PM Men's · Norfolk State at Tennessee | ",
 "Upcoming Jan 2, 4:30 PM Men's · Norfolk State vs North Carolina Central * | ",
 "Upcoming Jan 9, 4:30 PM Men's · Norfolk State vs Delaware State * | ",
 "Upcoming Jan 11, 7:00 PM Men's · Norfolk State at Maryland Eastern Shore * | ",
 "Upcoming Jan 16, 4:30 PM Men's · Norfolk State vs South Carolina State * | ",
 "Upcoming Jan 23, 4:30 PM Men's · Norfolk State at Coppin State * | ",
 "Upcoming Jan 25, 7:00 PM Men's · Norfolk State at Morgan State * | ",
 "Upcoming Jan 30, 4:30 PM Men's · Norfolk State vs Howard * | ",
 "Upcoming Feb 6, 4:30 PM Men's · Norfolk State at North Carolina Central * | ",
 "Upcoming Feb 13, 4:30 PM Men's · Norfolk State at Delaware State * | ",
 "Upcoming Feb 15, 7:00 PM Men's · Norfolk State vs Maryland Eastern Shore * | ",
 "Upcoming Feb 20, 4:30 PM Men's · Norfolk State at South Carolina State * | ",
 "Upcoming Feb 27, 4:30 PM Men's · Norfolk State vs Coppin State * | ",
 "Upcoming Mar 1, 7:00 PM Men's · Norfolk State vs Morgan State * | ",
 "Upcoming Mar 4, 8:00 PM Men's · Norfolk State at Howard * | ",
 "Upcoming Mar 10 Men's · Norfolk State at MEAC Tournament | ",
 "Upcoming Mar 12 Men's · Norfolk State at MEAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:30 PM Women's · Norfolk State vs Virginia State | ",
 "Upcoming Nov 4, 5:30 PM Women's · Norfolk State vs District of Columbia | ",
 "Upcoming Nov 8, 2:00 PM Women's · Norfolk State vs Pennsylvania | ",
 "Upcoming Nov 12, 7:00 PM Women's · Norfolk State vs Duke | ",
 "Upcoming Nov 14, 6:00 PM Women's · Norfolk State at Hampton | ",
 "Upcoming Nov 17, 6:00 PM Women's · Norfolk State vs Bluefield State | ",
 "Upcoming Nov 20, 6:00 PM Women's · Norfolk State vs Campbell | ",
 "Upcoming Nov 23, 6:00 PM Women's · Norfolk State vs Appalachian State | ",
 "Upcoming Nov 29, 2:00 PM Women's · Norfolk State at Radford | ",
 "Upcoming Dec 1, 12:00 PM Women's · Norfolk State at Iowa State | ",
 "Upcoming Dec 8, 11:00 AM Women's · Norfolk State vs Chowan | ",
 "Upcoming Dec 13, 2:00 PM Women's · Norfolk State vs Elon | ",
 "Upcoming Dec 15, 7:00 PM Women's · Norfolk State vs Ole Miss | ",
 "Upcoming Dec 17, 6:00 PM Women's · Norfolk State at Florida | ",
 "Upcoming Dec 21, 4:00 PM Women's · Norfolk State at North Carolina | ",
 "Upcoming Dec 23, 12:00 PM Women's · Norfolk State at High Point | ",
 "Upcoming Dec 28, 6:00 PM Women's · Norfolk State at Virginia | ",
 "Upcoming Jan 2, 2:00 PM Women's · Norfolk State vs North Carolina Central | ",
 "Upcoming Jan 7, 6:00 PM Women's · Norfolk State at Maryland Eastern Shore | ",
 "Upcoming Jan 9, 2:00 PM Women's · Norfolk State vs Delaware State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Norfolk State vs South Carolina State | ",
 "Upcoming Jan 21, 6:00 PM Women's · Norfolk State at Morgan State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Norfolk State at Coppin State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Norfolk State vs Howard | ",
 "Upcoming Feb 6, 2:00 PM Women's · Norfolk State at North Carolina Central | ",
 "Upcoming Feb 11, 6:00 PM Women's · Norfolk State vs Maryland Eastern Shore | ",
 "Upcoming Feb 13, 2:00 PM Women's · Norfolk State at Delaware State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Norfolk State at South Carolina State | ",
 "Upcoming Feb 25, 6:00 PM Women's · Norfolk State vs Morgan State | ",
 "Upcoming Feb 27, 2:00 PM Women's · Norfolk State vs Coppin State | ",
 "Upcoming Mar 4, 6:00 PM Women's · Norfolk State at Howard | ",
 "Upcoming Mar 10 Women's · Norfolk State at MEAC Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 17 Norfolk State at Kutztown | L, 649-842",
 "Final Oct 17 Norfolk State vs Molloy | W, 857-769",
 "Final Oct 17 Norfolk State vs Delaware State | L, 872-925",
 "Final Oct 17 Norfolk State vs Adelphi | W, 840-814",
 "Final Oct 17 Norfolk State vs FDU | W, 892-847",
 "Final Oct 18 Norfolk State vs D'Youville | L, 736-814",
 "Final Oct 18 Norfolk State vs Holy Family | L, 0-4",
 "Final Oct 18 Norfolk State vs Wilmington (Del.) | W, 770-730",
 "Upcoming Nov 6 Norfolk State at Duquesne Invitational | ",
 "Upcoming Nov 14 Norfolk State at CSU Lady Eagles Invite | ",
 "Upcoming Jan 15 Norfolk State at Northeast Classic | ",
 "Upcoming Jan 23 Norfolk State at DSU Hornet Classic | ",
 "Upcoming Feb 5 Norfolk State at MEAC #1 | ",
 "Upcoming Feb 26 Norfolk State at Stallings Invitational | ",
 "Upcoming Mar 13 Norfolk State at Northeast Roundup | ",
 "Upcoming Mar 19 Norfolk State at MEAC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Norfolk State at Spider Alumni Open | 12th of 16 (341 pts)",
 "Final Sep 18 Women's · Norfolk State at CNU Invitational | 3rd of 8 (77pts)",
 "Final Oct 2 Women's · Norfolk State at Paul Short Invitational | No Team Score",
 "Final Oct 16 Women's · Norfolk State at Panorama Farms Invitational | No Team Score",
 "Upcoming Oct 30, 11:00 AM Women's · Norfolk State at MEAC Championships | ",
 "Upcoming Nov 13 Women's · Norfolk State at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Women's · Norfolk State at NCAA Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Norfolk State at Spider Alumni Open | 3rd of 14 (60pts)",
 "Final Sep 11 Men's · Norfolk State at Virginia Invitational | 4th of 6 (93pts)",
 "Final Oct 2 Men's · Norfolk State at Paul Short Invitational | 11th of 35 (305 pts)",
 "Final Oct 16 Men's · Norfolk State at Panorama Farms Invitational | 4th of 14 (112 pts)",
 "Upcoming Oct 30, 12:00 PM Men's · Norfolk State at MEAC Championships | ",
 "Upcoming Nov 13 Men's · Norfolk State at NCAA Southeast Regionals | ",
 "Upcoming Nov 21 Men's · Norfolk State at NCAA National Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Norfolk State vs Winston-Salem State | W, 56-0",
 "Final Sep 5 Norfolk State at Old Dominion | L, 10-31",
 "Final Sep 11 Norfolk State at Virginia | L, 3-59",
 "Final Sep 19 Norfolk State vs Hampton | W, 42-21",
 "Final Sep 26 Norfolk State at Chicago State | W, 43-20",
 "Final Oct 3 Norfolk State at Robert Morris | L, 31-33",
 "Final Oct 10 Norfolk State vs Virginia-Lynchburg | W, 62-0",
 "Upcoming Oct 24, 1:30 PM Norfolk State at South Carolina State | ",
 "Upcoming Oct 31, 3:00 PM Norfolk State vs Delaware State | ",
 "Upcoming Nov 7, 12:00 PM Norfolk State vs North Carolina Central | ",
 "Upcoming Nov 14, 12:00 PM Norfolk State at Morgan State | ",
 "Upcoming Nov 21, 12:00 PM Norfolk State vs Howard | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 27 Norfolk State at Anita Hobson Invitational | Completed",
 "Upcoming Apr 17 Norfolk State at Mid-Atlantic Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Aug 21 Women's · Norfolk State at Mixed Doubles Season Opener | Completed",
 "Final Sep 17 Women's · Norfolk State at HBCU National Champs Singles and Doubles | Completed",
 "Final Sep 21 Women's · Norfolk State at ALL American Qualifying | Completed",
 "Final Oct 1 Women's · Norfolk State at MEAC Individual Champs | Completed",
 "Final Oct 15 Women's · Norfolk State at Regional Champs | Completed",
 "Upcoming Oct 30 Women's · Norfolk State at W&M Hidden Dual | ",
 "Upcoming Nov 4 Women's · Norfolk State at ITA masters | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Aug 21 Men's · Norfolk State at Mixed Doubles Season Opener | Completed",
 "Final Sep 4 Men's · Norfolk State at UTR | Completed",
 "Final Sep 17 Men's · Norfolk State at HBCU National Champs Singles and Doubles | Completed",
 "Final Sep 25 Men's · Norfolk State at ODU Fall Tournament | Completed",
 "Final Oct 1 Men's · Norfolk State at MEAC Individual Champs | Completed",
 "Final Oct 11 Men's · Norfolk State at Regional Champs | Completed",
 "Upcoming Nov 4 Men's · Norfolk State at ITA masters | ",
 "Upcoming Nov 5 Men's · Norfolk State at ITA Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 Norfolk State vs North Carolina A&T (Exhibition) | W, 3-2",
 "Final Aug 21 Norfolk State vs Elizabeth City (Exhibition) | W, 3-0",
 "Final Aug 28 Norfolk State vs USC Upstate | L, 1-3",
 "Final Aug 29 Norfolk State vs Elon | W, 3-1",
 "Final Sep 1 Norfolk State vs Old Dominion | L, 0-3",
 "Final Sep 2 Norfolk State vs Hampton | W, 3-2",
 "Final Sep 8 Norfolk State vs William & Mary | L, 0-3",
 "Final Sep 11 Norfolk State at UNC Wilmington | L, 1-3",
 "Final Sep 11 Norfolk State vs Harvard | L, 1-3",
 "Final Sep 12 Norfolk State vs UNC Asheville | L, 0-3",
 "Final Sep 15 Norfolk State vs Bowie State | W, 3-0",
 "Final Sep 18 Norfolk State vs Bellarmine | L, 1-3",
 "Final Sep 18 Norfolk State at Radford | L, 0-3",
 "Final Sep 19 Norfolk State vs UT Chattanooga | L, 2-3",
 "Final Sep 25 Norfolk State vs Morgan State | L, 1-3",
 "Final Sep 27 Norfolk State vs Coppin State | L, 0-3",
 "Final Sep 30 Norfolk State at Hampton | W, 3-1",
 "Final Oct 2 Norfolk State vs Maryland Eastern Shore | W, 3-1",
 "Final Oct 4 Norfolk State at Delaware State | L, 0-3",
 "Final Oct 8 Norfolk State vs North Carolina Central | W, 3-2",
 "Final Oct 9 Norfolk State vs South Carolina State | W, 3-0",
 "Final Oct 15 Norfolk State vs Howard | L, 1-3",
 "Final Oct 18 Norfolk State at Coppin State | L, 1-3",
 "Today Oct 23, 5:00 PM Norfolk State at Morgan State | ",
 "Upcoming Oct 30, 6:00 PM Norfolk State at Maryland Eastern Shore | ",
 "Upcoming Nov 1, 1:00 PM Norfolk State vs Delaware State | ",
 "Upcoming Nov 6, 6:00 PM Norfolk State at South Carolina State | ",
 "Upcoming Nov 8, 1:00 PM Norfolk State at North Carolina Central | ",
 "Upcoming Nov 13, 6:00 PM Norfolk State at Howard | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Norfolk State module checks passed");
