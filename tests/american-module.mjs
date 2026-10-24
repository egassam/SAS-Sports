import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {americanSchool} from '../src/schools/american.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='american');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,americanHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/american-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit aueagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['american'];
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',americanSchool.scheduleUrls],['roster',americanSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('american|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'aueagles.com',`${key} must stay on aueagles.com`);
  }
}
const parity={"Basketball":{"schedule":["https://aueagles.com/sports/mens-basketball/schedule","https://aueagles.com/sports/womens-basketball/schedule"],"roster":["https://aueagles.com/sports/mens-basketball/roster","https://aueagles.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://aueagles.com/sports/cross-country/schedule"],"roster":["https://aueagles.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://aueagles.com/sports/field-hockey/schedule"],"roster":["https://aueagles.com/sports/field-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://aueagles.com/sports/womens-lacrosse/schedule"],"roster":["https://aueagles.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://aueagles.com/sports/womens-soccer/schedule","https://aueagles.com/sports/mens-soccer/schedule"],"roster":["https://aueagles.com/sports/womens-soccer/roster","https://aueagles.com/sports/mens-soccer/roster"],"combined":true},"Swimming & Diving":{"schedule":["https://aueagles.com/sports/swimming-and-diving/schedule"],"roster":["https://aueagles.com/sports/swimming-and-diving/roster"],"combined":true},"Track & Field":{"schedule":["https://aueagles.com/sports/track-and-field/schedule"],"roster":["https://aueagles.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://aueagles.com/sports/womens-volleyball/schedule"],"roster":["https://aueagles.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://aueagles.com/sports/wrestling/schedule"],"roster":["https://aueagles.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'american|"+sport+"':"),`${sport} routes must live in the American module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://aueagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.americanHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=american)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 25, 1:00 PM Men's · American vs Howard (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · American at Cincinnati | ",
 "Upcoming Nov 6, 7:00 PM Men's · American at Clemson | ",
 "Upcoming Nov 11, 7:00 PM Men's · American at Drexel | ",
 "Upcoming Nov 15, 1:00 PM Men's · American vs Harvard | ",
 "Upcoming Nov 19, 7:00 PM Men's · American vs Mary Baldwin | ",
 "Upcoming Nov 22, 1:00 PM Men's · American vs Towson | ",
 "Upcoming Nov 27, 4:00 PM Men's · American vs Radford | ",
 "Upcoming Nov 28, 4:00 PM Men's · American vs UMass Lowell | ",
 "Upcoming Nov 29, 4:00 PM Men's · American vs Hampton | ",
 "Upcoming Dec 2, 7:00 PM Men's · American at Maryland | ",
 "Upcoming Dec 6, 1:00 PM Men's · American at UCF | ",
 "Upcoming Dec 9, 7:00 PM Men's · American at George Washington | ",
 "Upcoming Dec 13, 2:00 PM Men's · American at UMES | ",
 "Upcoming Dec 22, 6:00 PM Men's · American at Penn | ",
 "Upcoming Dec 30, 4:30 PM Men's · American at Lehigh | ",
 "Upcoming Jan 2, 2:00 PM Men's · American vs Holy Cross | ",
 "Upcoming Jan 6, 7:00 PM Men's · American at Colgate | ",
 "Upcoming Jan 9, 4:00 PM Men's · American vs Lafayette | ",
 "Upcoming Jan 11, 6:30 PM Men's · American at Loyola Maryland | ",
 "Upcoming Jan 16, 1:00 PM Men's · American at Boston University | ",
 "Upcoming Jan 20, 7:00 PM Men's · American vs Navy | ",
 "Upcoming Jan 23, 12:00 PM Men's · American at Lafayette | ",
 "Upcoming Jan 27, 7:00 PM Men's · American vs Bucknell | ",
 "Upcoming Jan 30, 2:00 PM Men's · American vs Boston University | ",
 "Upcoming Feb 3, 6:00 PM Men's · American at Army | ",
 "Upcoming Feb 6, 4:00 PM Men's · American vs Loyola Maryland | ",
 "Upcoming Feb 8, 7:00 PM Men's · American vs Lehigh | ",
 "Upcoming Feb 13, 4:00 PM Men's · American at Navy | ",
 "Upcoming Feb 17, 7:00 PM Men's · American vs Army | ",
 "Upcoming Feb 21, 2:00 PM Men's · American vs Colgate | ",
 "Upcoming Feb 24, 7:00 PM Men's · American at Bucknell | ",
 "Upcoming Feb 27, 12:00 PM Men's · American at Holy Cross | ",
 "Upcoming Mar 2 Men's · American vs Patriot League First Round | ",
 "Upcoming Mar 4 Men's · American at Patriot League Quarterfinals | ",
 "Upcoming Mar 7 Men's · American at Patriot League Semifinals | ",
 "Upcoming Mar 10 Men's · American at Patriot League Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 5, 7:00 PM Women's · American at Georgetown | ",
 "Upcoming Nov 13, 11:00 AM Women's · American at Delaware State | ",
 "Upcoming Nov 15, 4:00 PM Women's · American at Delaware | ",
 "Upcoming Nov 18, 6:00 PM Women's · American vs Drexel | ",
 "Upcoming Nov 21, 1:00 PM Women's · American vs La Salle | ",
 "Upcoming Nov 24, 11:00 AM Women's · American at Yale | ",
 "Upcoming Nov 30, 6:00 PM Women's · American vs Washington Adventist | ",
 "Upcoming Dec 3, 7:00 PM Women's · American at William & Mary | ",
 "Upcoming Dec 6, 1:00 PM Women's · American vs LIU | ",
 "Upcoming Dec 9, 6:00 PM Women's · American at Virginia | ",
 "Upcoming Dec 21, 12:00 PM Women's · American at UMBC | ",
 "Upcoming Dec 30, 2:00 PM Women's · American at Lehigh | ",
 "Upcoming Jan 2, 2:00 PM Women's · American at Holy Cross | ",
 "Upcoming Jan 6, 6:00 PM Women's · American vs Colgate | ",
 "Upcoming Jan 9, 1:00 PM Women's · American at Lafayette | ",
 "Upcoming Jan 13, 6:00 PM Women's · American vs Loyola Md. | ",
 "Upcoming Jan 16, 1:00 PM Women's · American vs Boston U. | ",
 "Upcoming Jan 20, 6:00 PM Women's · American at Navy | ",
 "Upcoming Jan 23, 1:00 PM Women's · American vs Lafayette | ",
 "Upcoming Jan 27, 6:00 PM Women's · American at Bucknell | ",
 "Upcoming Jan 30, 2:00 PM Women's · American at Boston U. | ",
 "Upcoming Feb 3, 6:00 PM Women's · American vs Army | ",
 "Upcoming Feb 6, 1:00 PM Women's · American at Loyola Md. | ",
 "Upcoming Feb 8, 4:30 PM Women's · American vs Lehigh | ",
 "Upcoming Feb 13, 6:00 PM Women's · American vs Navy | ",
 "Upcoming Feb 17, 6:00 PM Women's · American at Army | ",
 "Upcoming Feb 20, 2:00 PM Women's · American at Colgate | ",
 "Upcoming Feb 23, 6:00 PM Women's · American vs Bucknell | ",
 "Upcoming Feb 26, 5:00 PM Women's · American vs Holy Cross | ",
 "Upcoming Mar 1 Women's · American vs Patriot League First Round | ",
 "Upcoming Mar 3 Women's · American at Patriot League Quarterfinals | ",
 "Upcoming Mar 6 Women's · American at Patriot League Semifinals | ",
 "Upcoming Mar 9 Women's · American at Patriot League Championship | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 5 American at Spider Alumni Open | Women's team: 5th / Men's team: 4th",
 "Final Sep 11 American at Spiked Shoe Invitational | Women's team: 8th / Men's team: 5th",
 "Final Oct 2 American at Paul Short Run | Completed",
 "Final Oct 16 American at Panorama Farms Invitational | Women's team: 9th / Men's team: 7th",
 "Upcoming Oct 31 American at Patriot League Championships | ",
 "Upcoming Nov 13 American at NCAA Regional Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 American at Cal | L, 3-4",
 "Final Aug 30 American at Stanford | L, 1-3",
 "Final Sep 4 American vs Richmond | L, 0-2",
 "Final Sep 6 American vs App State | W, 2-1",
 "Final Sep 11 American vs William & Mary | W, 8-0",
 "Final Sep 13 American at Towson | W, 6-1",
 "Final Sep 18 American at Bucknell | W, 1-0",
 "Final Sep 20 American at Lock Haven | W, 6-0",
 "Final Sep 25 American vs Maine | W, 3-0",
 "Final Sep 27 American vs Providence | L, 1-2",
 "Final Oct 2 American at Lafayette | L, 0-1",
 "Final Oct 4 American at Rutgers | L, 2-4",
 "Final Oct 10 American vs Colgate | W, 4-1",
 "Final Oct 16 American vs Boston U. | W, 3-2",
 "Final Oct 18 American vs Georgetown | W, 3-1",
 "Upcoming Oct 25, 12:00 PM American at Holy Cross | ",
 "Upcoming Oct 31, 12:00 PM American vs Lehigh | ",
 "Upcoming Nov 5 American at Patriot League Semifinals | ",
 "Upcoming Nov 7 American at Patriot League Championship | ",
 "Upcoming Nov 11 American at NCAA Opening Round | ",
 "Upcoming Nov 13 American at NCAA Tournament First Round | ",
 "Upcoming Nov 15 American vs Sweet Sixteen | ",
 "Upcoming Nov 20 American vs Final Four | ",
 "Upcoming Nov 22 American at National Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · American at La Salle | L, 1-2",
 "Final Aug 16 Women's · American at UMBC | L, 1-2",
 "Final Aug 20 Women's · American at Richmond | T, 1-1",
 "Final Aug 23 Women's · American vs Longwood | L, 0-3",
 "Final Sep 3 Women's · American vs UNC Greensboro | L, 1-2",
 "Final Sep 6 Women's · American vs Elon | T, 0-0",
 "Final Sep 10 Women's · American at George Washington | L, 1-5",
 "Final Sep 13 Women's · American vs William & Mary | L, 1-5",
 "Final Sep 19 Women's · American at Army | L, 0-3",
 "Final Sep 26 Women's · American vs Lafayette | L, 0-1",
 "Final Sep 30 Women's · American at Loyola Maryland | T, 2-2",
 "Final Oct 4 Women's · American at Lehigh | T, 2-2",
 "Final Oct 10 Women's · American vs Colgate | L, 0-2",
 "Final Oct 17 Women's · American vs Boston University | L, 1-2",
 "Upcoming Oct 23, 7:00 PM Women's · American at Navy | ",
 "Upcoming Nov 1, 1:00 PM Women's · American at Holy Cross | ",
 "Upcoming Nov 4, 1:00 PM Women's · American vs Bucknell | ",
 "Upcoming Nov 8 Women's · American at Patriot League First Round | ",
 "Upcoming Nov 11 Women's · American at Patriot League Semifinals | ",
 "Upcoming Nov 15 Women's · American at Patriot League Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · American vs Rutgers | T, 0-0",
 "Final Aug 23 Men's · American at Hofstra | L, 0-2",
 "Final Aug 28 Men's · American at Virginia | L, 0-4",
 "Final Sep 1 Men's · American vs Delaware | T, 0-0",
 "Final Sep 6 Men's · American vs Liberty | L, 1-2",
 "Final Sep 11 Men's · American at Colgate | W, 1-0",
 "Final Sep 15 Men's · American at North Carolina | L, 0-2",
 "Final Sep 19 Men's · American vs Loyola Maryland | T, 1-1",
 "Final Sep 29 Men's · American vs William & Mary | L, 0-1",
 "Final Oct 3 Men's · American vs Bucknell | W, 2-0",
 "Final Oct 9 Men's · American at Lehigh | L, 0-2",
 "Final Oct 12 Men's · American vs West Virginia | T, 0-0",
 "Final Oct 18 Men's · American at Boston University | W, 1-0",
 "Final Oct 21 Men's · American at Army | W, 2-0",
 "Today Oct 24, 1:00 PM Men's · American vs Lafayette | ",
 "Upcoming Oct 30, 1:00 PM Men's · American vs Holy Cross | ",
 "Upcoming Nov 3, 7:00 PM Men's · American at Navy | ",
 "Upcoming Nov 7 Men's · American vs Patriot League First Round | ",
 "Upcoming Nov 10 Men's · American at Patriot League Semifinals | ",
 "Upcoming Nov 14 Men's · American at Patriot League Championship | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 25 American at Potomac Diving Invitational | Completed",
 "Final Sep 25 American at Potomac Relay Invitational | Completed",
 "Final Oct 3 American at UMBC (w/ VMI) | Women's team: T, 1-1 / Men's team: L, 0-2",
 "Final Oct 10 American at Mount St. Mary's | Women's team: W, 1-0 / Men's team: W, 1-0",
 "Upcoming Oct 30, 5:00 PM American at Catholic | ",
 "Upcoming Oct 31, 12:00 PM American vs Howard | ",
 "Upcoming Nov 7, 12:00 PM American at Bucknell (w/ Navy and Lafayette) | ",
 "Upcoming Nov 18, 5:00 PM American at George Mason Patriot Invitational | ",
 "Upcoming Jan 15, 1:00 PM American vs VMI | ",
 "Upcoming Jan 22, 2:00 PM American vs Old Dominion | ",
 "Upcoming Jan 30 American at Bucknell Invitational | ",
 "Upcoming Feb 4 American at Cavalier Invite | ",
 "Upcoming Feb 17, 5:00 PM American at Patriot League Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 American vs Georgetown | L, 1-3",
 "Final Aug 29 American vs Northwestern | W, 3-2",
 "Final Aug 30 American at Virginia | W, 3-1",
 "Final Sep 4 American vs Northern Kentucky | W, 3-1",
 "Final Sep 4 American at Bowling Green | L, 1-3",
 "Final Sep 5 American vs Arkansas State | L, 1-3",
 "Final Sep 8 American vs Howard | W, 3-0",
 "Final Sep 10 American vs Villanova | L, 0-3",
 "Final Sep 12 American vs Iowa State | W, 3-0",
 "Final Sep 18 American at Holy Cross | W, 3-2",
 "Final Sep 19 American at Army | W, 3-0",
 "Final Sep 25 American vs Lehigh | W, 3-2",
 "Final Sep 26 American vs Lafayette | W, 3-0",
 "Final Oct 3 American vs Loyola Maryland | W, 3-1",
 "Final Oct 4 American vs Navy | W, 3-0",
 "Final Oct 9 American vs Colgate | W, 3-0",
 "Final Oct 10 American at Bucknell | W, 3-0",
 "Final Oct 17 American at Colgate | W, 3-1",
 "Final Oct 23 American vs Army | W, 3-0",
 "Today Oct 24, 4:00 PM American vs Holy Cross | ",
 "Upcoming Oct 30, 7:00 PM American at Lehigh | ",
 "Upcoming Oct 31, 6:00 PM American at Lafayette | ",
 "Upcoming Nov 4, 6:00 PM American at Loyola Maryland | ",
 "Upcoming Nov 6, 6:00 PM American at Navy | ",
 "Upcoming Nov 13, 6:00 PM American vs Bucknell | ",
 "Upcoming Nov 17 American at Patriot League Quarterfinals | ",
 "Upcoming Nov 20 American at Patriot League Semifinals | ",
 "Upcoming Nov 22 American at Patriot League Championship | ",
 "Upcoming Dec 3 American at NCAA First Round | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 2:00 PM American at Central Michigan | ",
 "Upcoming Nov 1, 4:00 PM American at CSU Bakersfield | ",
 "Upcoming Nov 8, 9:00 AM American at Averett Cougar Open | ",
 "Upcoming Nov 15, 3:30 PM American vs Davidson College | ",
 "Upcoming Nov 20, 7:00 PM American vs Purdue | ",
 "Upcoming Nov 22, 1:00 PM American at West Virginia | ",
 "Upcoming Nov 29, 9:30 AM American at Lock Haven | ",
 "Upcoming Dec 3, 7:00 PM American at Maryland | ",
 "Upcoming Dec 6 American at Morgan State | ",
 "Upcoming Dec 13, 1:00 PM American vs Columbia | ",
 "Upcoming Dec 20, 1:00 PM American at LIU | ",
 "Upcoming Jan 2, 10:00 AM American at Southern Scuffle | ",
 "Upcoming Jan 15, 7:00 PM American vs Lehigh | ",
 "Upcoming Jan 17, 1:00 PM American vs Army | ",
 "Upcoming Jan 24, 1:00 PM American at Navy | ",
 "Upcoming Jan 30, 1:00 PM American at Drexel | ",
 "Upcoming Jan 30, 6:00 PM American at Rutgers | ",
 "Upcoming Feb 14, 12:00 PM American vs Bucknell | ",
 "Upcoming Feb 14, 5:00 PM American at George Mason | ",
 "Upcoming Feb 20, 1:00 PM American vs Franklin and Marshall College | ",
 "Upcoming Mar 5, 9:00 AM American at EIWA Championships | ",
 "Upcoming Mar 18, 12:00 PM American at NCAA Championships | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("American module checks passed");
