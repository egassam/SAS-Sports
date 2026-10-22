import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {delawareSchool} from '../src/schools/delaware.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='delaware');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,delawareHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/delaware-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bluehens.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['delaware'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',delawareSchool.scheduleUrls],['roster',delawareSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('delaware|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bluehens.com',`${key} must stay on bluehens.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bluehens.com/sports/baseball/schedule"],"roster":["https://bluehens.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bluehens.com/sports/mens-basketball/schedule","https://bluehens.com/sports/womens-basketball/schedule"],"roster":["https://bluehens.com/sports/mens-basketball/roster","https://bluehens.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://bluehens.com/sports/womens-cross-country/schedule"],"roster":["https://bluehens.com/sports/womens-cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://bluehens.com/sports/field-hockey/schedule"],"roster":["https://bluehens.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://bluehens.com/sports/football/schedule"],"roster":["https://bluehens.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bluehens.com/sports/womens-golf/schedule","https://bluehens.com/sports/mens-golf/schedule"],"roster":["https://bluehens.com/sports/womens-golf/roster","https://bluehens.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://bluehens.com/sports/ice-hockey/schedule"],"roster":["https://bluehens.com/sports/ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://bluehens.com/sports/womens-lacrosse/schedule","https://bluehens.com/sports/mens-lacrosse/schedule"],"roster":["https://bluehens.com/sports/womens-lacrosse/roster","https://bluehens.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://bluehens.com/sports/rowing/schedule"],"roster":["https://bluehens.com/sports/rowing/roster"],"combined":false},"Soccer":{"schedule":["https://bluehens.com/sports/womens-soccer/schedule","https://bluehens.com/sports/mens-soccer/schedule"],"roster":["https://bluehens.com/sports/womens-soccer/roster","https://bluehens.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://bluehens.com/sports/softball/schedule"],"roster":["https://bluehens.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://bluehens.com/sports/womens-swimming-and-diving/schedule","https://bluehens.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://bluehens.com/sports/womens-swimming-and-diving/roster","https://bluehens.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://bluehens.com/sports/womens-tennis/schedule","https://bluehens.com/sports/mens-tennis/schedule"],"roster":["https://bluehens.com/sports/womens-tennis/roster","https://bluehens.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://bluehens.com/sports/track-and-field/schedule"],"roster":["https://bluehens.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://bluehens.com/sports/womens-volleyball/schedule"],"roster":["https://bluehens.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'delaware|"+sport+"':"),`${sport} routes must live in the Delaware module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://bluehens.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.delawareHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=delaware)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Mar 26 Delaware at Kennesaw State | ",
 "Upcoming Mar 27 Delaware at Kennesaw State | ",
 "Upcoming Mar 28 Delaware at Kennesaw State | ",
 "Upcoming Apr 2 Delaware vs Sam Houston | ",
 "Upcoming Apr 3 Delaware vs Sam Houston | ",
 "Upcoming Apr 4 Delaware vs Sam Houston | ",
 "Upcoming Apr 9 Delaware at Western Kentucky | ",
 "Upcoming Apr 10 Delaware at Western Kentucky | ",
 "Upcoming Apr 11 Delaware at Western Kentucky | ",
 "Upcoming Apr 16 Delaware vs Liberty | ",
 "Upcoming Apr 17 Delaware vs Liberty | ",
 "Upcoming Apr 18 Delaware vs Liberty | ",
 "Upcoming Apr 23 Delaware at FIU | ",
 "Upcoming Apr 24 Delaware at FIU | ",
 "Upcoming Apr 25 Delaware at FIU | ",
 "Upcoming Apr 30 Delaware vs New Mexico State | ",
 "Upcoming May 1 Delaware vs New Mexico State | ",
 "Upcoming May 2 Delaware vs New Mexico State | ",
 "Upcoming May 7 Delaware at Missouri State | ",
 "Upcoming May 8 Delaware at Missouri State | ",
 "Upcoming May 9 Delaware at Missouri State | ",
 "Upcoming May 14 Delaware at Jacksonville State | ",
 "Upcoming May 15 Delaware at Jacksonville State | ",
 "Upcoming May 16 Delaware at Jacksonville State | ",
 "Upcoming May 20 Delaware vs Middle Tennessee | ",
 "Upcoming May 21 Delaware vs Middle Tennessee | ",
 "Upcoming May 22 Delaware vs Middle Tennessee | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Delaware vs Notre Dame of Maryland | ",
 "Upcoming Nov 6, 7:30 PM Men's · Delaware at Wisconsin | ",
 "Upcoming Nov 11, 7:00 PM Men's · Delaware vs James Madison | ",
 "Upcoming Nov 15, 1:00 PM Men's · Delaware vs Colgate | ",
 "Upcoming Nov 17, 11:00 AM Men's · Delaware vs Wilson College | ",
 "Upcoming Nov 20, 6:00 PM Men's · Delaware at CSUN | ",
 "Upcoming Nov 22, 7:00 PM Men's · Delaware at UCLA | ",
 "Upcoming Nov 28, 4:00 PM Men's · Delaware at Stony Brook | ",
 "Upcoming Dec 2, 7:00 PM Men's · Delaware vs Bucknell | ",
 "Upcoming Dec 5, 2:00 PM Men's · Delaware vs Yale | ",
 "Upcoming Dec 10, 7:00 PM Men's · Delaware vs William & Mary | ",
 "Upcoming Dec 15 Men's · Delaware at Duquesne | ",
 "Upcoming Dec 20, 1:00 PM Men's · Delaware at Bryant | ",
 "Upcoming Dec 29, 2:00 PM Men's · Delaware vs Georgian Court | ",
 "Upcoming Jan 2, 6:00 PM Men's · Delaware at Liberty | ",
 "Upcoming Jan 7, 8:00 PM Men's · Delaware at Missouri State | ",
 "Upcoming Jan 9, 2:00 PM Men's · Delaware at FIU | ",
 "Upcoming Jan 14, 7:00 PM Men's · Delaware vs WKU | ",
 "Upcoming Jan 16, 2:00 PM Men's · Delaware vs Middle Tennessee | ",
 "Upcoming Jan 21, 7:00 PM Men's · Delaware at Kennesaw State | ",
 "Upcoming Jan 23, 5:00 PM Men's · Delaware at Jacksonville State | ",
 "Upcoming Jan 28, 7:00 PM Men's · Delaware vs New Mexico State | ",
 "Upcoming Jan 30, 2:00 PM Men's · Delaware vs Sam Houston | ",
 "Upcoming Feb 4, 7:00 PM Men's · Delaware vs FIU | ",
 "Upcoming Feb 6, 7:00 PM Men's · Delaware vs Missouri State | ",
 "Upcoming Feb 11, 7:30 PM Men's · Delaware at Middle Tennessee | ",
 "Upcoming Feb 13, 7:00 PM Men's · Delaware at WKU | ",
 "Upcoming Feb 18, 7:00 PM Men's · Delaware vs Jacksonville State | ",
 "Upcoming Feb 20, 4:00 PM Men's · Delaware vs Kennesaw State | ",
 "Upcoming Feb 25, 7:30 PM Men's · Delaware at Sam Houston | ",
 "Upcoming Feb 27, 3:00 PM Men's · Delaware at New Mexico State | ",
 "Upcoming Mar 6, 2:00 PM Men's · Delaware vs Liberty | ",
 "Upcoming Mar 9 Men's · Delaware at Air National Guard CUSA Basketball Championships | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 4, 6:00 PM Women's · Delaware at Virginia Tech | ",
 "Upcoming Nov 9, 5:00 PM Women's · Delaware at Towson | ",
 "Upcoming Nov 11, 6:30 PM Women's · Delaware at Wisconsin | ",
 "Upcoming Nov 15, 4:00 PM Women's · Delaware vs American | ",
 "Upcoming Nov 19, 7:00 PM Women's · Delaware vs Richmond | ",
 "Upcoming Nov 22, 2:00 PM Women's · Delaware vs Hampton | ",
 "Upcoming Nov 27, 7:00 PM Women's · Delaware at California | ",
 "Upcoming Nov 28 Women's · Delaware vs Gardner-Webb/ECU | ",
 "Upcoming Dec 3, 7:00 PM Women's · Delaware vs Loyola (Md.) | ",
 "Upcoming Dec 17, 11:00 AM Women's · Delaware at Stony Brook | ",
 "Upcoming Dec 21, 2:00 PM Women's · Delaware at Bucknell | ",
 "Upcoming Dec 30, 2:00 PM Women's · Delaware vs Saint Francis | ",
 "Upcoming Jan 2, 2:00 PM Women's · Delaware vs Liberty | ",
 "Upcoming Jan 8, 7:00 PM Women's · Delaware vs Missouri State | ",
 "Upcoming Jan 10, 1:00 PM Women's · Delaware vs FIU | ",
 "Upcoming Jan 14, 6:00 PM Women's · Delaware at WKU | ",
 "Upcoming Jan 16, 2:00 PM Women's · Delaware at Middle Tennessee | ",
 "Upcoming Jan 21, 11:00 AM Women's · Delaware vs Kennesaw State | ",
 "Upcoming Jan 23, 1:00 PM Women's · Delaware vs Jax State | ",
 "Upcoming Jan 28, 7:00 PM Women's · Delaware at New Mexico State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Delaware at Sam Houston | ",
 "Upcoming Feb 4, 7:00 PM Women's · Delaware at FIU | ",
 "Upcoming Feb 6, 1:00 PM Women's · Delaware at Missouri State | ",
 "Upcoming Feb 11, 7:00 PM Women's · Delaware vs Middle Tennessee | ",
 "Upcoming Feb 13, 2:00 PM Women's · Delaware vs WKU | ",
 "Upcoming Feb 18, 7:00 PM Women's · Delaware at Jax State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Delaware at Kennesaw State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Delaware vs Sam Houston | ",
 "Upcoming Feb 27, 1:00 PM Women's · Delaware vs New Mexico State | ",
 "Upcoming Mar 6, 2:00 PM Women's · Delaware at Liberty | ",
 "Upcoming Mar 9 Women's · Delaware at Air National Guard CUSA Basketball Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Delaware at Delaware Invitational | Completed",
 "Final Sep 18 Delaware at Southern Showcase | Completed",
 "Final Oct 2 Delaware at Paul Short Run | Completed",
 "Final Oct 16 Delaware at Panorama Farms Invitational | Completed",
 "Upcoming Oct 31, 8:30 AM Delaware at Conference USA | ",
 "Upcoming Nov 13, 10:00 AM Delaware at NCAA Mid-Atlantic Regionals | ",
 "Upcoming Nov 21, 10:20 AM Delaware at NCAA National Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Delaware vs Villanova | L, 1-2",
 "Final Aug 30 Delaware at Monmouth | W, 2-1",
 "Final Sep 6 Delaware at Penn State | L, 1-2",
 "Final Sep 11 Delaware at Ohio State | L, 3-4",
 "Final Sep 13 Delaware at Kent State | W, 2-1",
 "Final Sep 18 Delaware vs Wake Forest | L, 1-5",
 "Final Sep 20 Delaware at Old Dominion | L, 2-4",
 "Final Sep 27 Delaware vs Fairfield | W, 3-2",
 "Final Oct 2 Delaware at Temple | W, 2-1",
 "Final Oct 4 Delaware at Maryland | L, 1-4",
 "Final Oct 9 Delaware vs Lehigh | W, 5-0",
 "Final Oct 11 Delaware at Lafayette | L, 0-1",
 "Final Oct 16 Delaware at Richmond | W, 3-2",
 "Final Oct 18 Delaware at VCU | W, 2-1",
 "Upcoming Oct 23, 5:00 PM Delaware vs UC Davis | ",
 "Upcoming Oct 25, 1:00 PM Delaware vs Georgetown | ",
 "Upcoming Oct 31, 4:00 PM Delaware vs Towson | ",
 "Upcoming Nov 6, 12:00 PM Delaware at MPSF Semifinal | ",
 "Upcoming Nov 7, 12:00 PM Delaware at MPSF Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 3 Delaware vs Merrimack | W, 42-7",
 "Final Sep 12 Delaware at Vanderbilt | L, 26-35",
 "Final Sep 19 Delaware vs Coastal Carolina | W, 22-14",
 "Final Sep 26 Delaware at Virginia | L, 3-42",
 "Final Oct 2 Delaware vs Liberty | L, 14-30",
 "Final Oct 13 Delaware at Middle Tennessee | L, 30-33",
 "Final Oct 20 Delaware vs Missouri State | W, 61-38",
 "Upcoming Oct 27, 7:00 PM Delaware at WKU | ",
 "Upcoming Nov 7, 3:00 PM Delaware at Kennesaw State | ",
 "Upcoming Nov 14, 3:00 PM Delaware vs FIU | ",
 "Upcoming Nov 21, 3:00 PM Delaware at New Mexico State | ",
 "Upcoming Nov 28, 3:30 PM Delaware vs Jax State | ",
 "Upcoming Dec 4 Delaware at Conference USA Championship | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Delaware at Happy Valley Individuals | No team score (individuals only)",
 "Final Sep 7 Women's · Delaware at Nittany Lion Invitational | Completed",
 "Final Sep 13 Women's · Delaware at Badger Invitational | Completed",
 "Final Sep 20 Women's · Delaware at Mary Fossum Invitational | Completed",
 "Final Oct 5 Women's · Delaware at Marilynn Smith Sunflower Invitational | Completed",
 "Upcoming Oct 24 Women's · Delaware at Lady Blue Hen Invitational | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Delaware at Bryan National Collegiate | Completed",
 "Final Sep 21 Men's · Delaware at Temple Invitational | Completed",
 "Final Oct 5 Men's · Delaware at Nemacolin Collegiate Invitational | Completed",
 "Final Oct 5 Men's · Delaware at Shepherd's Rock Individual | No team score (individuals only)",
 "Final Oct 19 Men's · Delaware at Blue Hen Intercollegiate | Completed"
]);
  const v_icehockey=parse("Hockey","ice-hockey");
  assert.deepEqual(v_icehockey.map(line),[
 "Final Sep 25 Delaware at Holy Cross | T, 2-2",
 "Final Sep 26 Delaware at Holy Cross | L, 0-4",
 "Final Oct 3 Delaware vs Lindenwood | W, 4-1",
 "Final Oct 4 Delaware vs Lindenwood | L, 1-3",
 "Final Oct 9 Delaware at RIT | L, 1-4",
 "Final Oct 10 Delaware at RIT | L, 2-3",
 "Final Oct 16 Delaware vs Union | W, 2-1",
 "Final Oct 17 Delaware vs Union | L, 2-5",
 "Upcoming Oct 23, 3:00 PM Delaware at LIU | ",
 "Upcoming Oct 24, 2:00 PM Delaware at LIU | ",
 "Upcoming Oct 29, 5:00 PM Delaware at Syracuse | ",
 "Upcoming Oct 30, 3:00 PM Delaware at Syracuse | ",
 "Upcoming Nov 6, 6:00 PM Delaware vs Mercyhurst | ",
 "Upcoming Nov 7, 2:00 PM Delaware vs Mercyhurst | ",
 "Upcoming Nov 12, 6:00 PM Delaware vs Robert Morris | ",
 "Upcoming Nov 13, 2:00 PM Delaware vs Robert Morris | ",
 "Upcoming Nov 19, 6:00 PM Delaware at Penn State | ",
 "Upcoming Nov 20, 6:00 PM Delaware at Penn State | ",
 "Upcoming Nov 24, 10:30 AM Delaware at Princeton | ",
 "Upcoming Nov 27, 2:00 PM Delaware at Stonehill | ",
 "Upcoming Nov 28, 2:00 PM Delaware at Stonehill | ",
 "Upcoming Dec 4, 6:00 PM Delaware vs RIT | ",
 "Upcoming Dec 5, 2:00 PM Delaware vs RIT | ",
 "Upcoming Jan 5, 11:30 AM Delaware vs Princeton | ",
 "Upcoming Jan 8, 4:00 PM Delaware at Lindenwood | ",
 "Upcoming Jan 9, 1:00 PM Delaware at Lindenwood | ",
 "Upcoming Jan 15, 6:00 PM Delaware vs Syracuse | ",
 "Upcoming Jan 16, 2:00 PM Delaware vs Syracuse | ",
 "Upcoming Jan 22, 3:00 PM Delaware at Robert Morris | ",
 "Upcoming Jan 23, 12:00 PM Delaware at Robert Morris | ",
 "Upcoming Jan 29, 6:00 PM Delaware vs Penn State | ",
 "Upcoming Jan 30, 2:00 PM Delaware vs Penn State | ",
 "Upcoming Feb 5, 6:00 PM Delaware at Mercyhurst | ",
 "Upcoming Feb 6, 1:00 PM Delaware at Mercyhurst | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[
 "Upcoming Oct 24, 12:00 PM Men's · Delaware at Georgetown (Exhibition) | ",
 "Upcoming Oct 30, 7:00 PM Men's · Delaware at Rutgers (Exhibition) | "
]);
  const v_rowing=parse("Rowing","rowing");
  assert.deepEqual(v_rowing.map(line),[
 "Upcoming Oct 24, 10:40 AM Delaware at Head of the Schuylkill Regatta | ",
 "Upcoming Nov 1 Delaware at Princeton 3-Mile Chase | ",
 "Upcoming Nov 8 Delaware at Villanova | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 15 Women's · Delaware vs George Washington | W, 3-2",
 "Final Aug 20 Women's · Delaware vs VCU | W, 3-1",
 "Final Aug 23 Women's · Delaware vs Navy | T, 2-2",
 "Final Aug 27 Women's · Delaware vs Towson | T, 0-0",
 "Final Aug 30 Women's · Delaware vs UMBC | T, 0-0",
 "Final Sep 3 Women's · Delaware at Bucknell | W, 2-0",
 "Final Sep 10 Women's · Delaware vs Georgetown | L, 0-1",
 "Final Sep 13 Women's · Delaware at Drexel | W, 3-1",
 "Final Sep 17 Women's · Delaware at Villanova | L, 1-2",
 "Final Sep 20 Women's · Delaware vs Columbia | W, 2-1",
 "Final Sep 27 Women's · Delaware vs Missouri State | W, 1-0",
 "Final Oct 1 Women's · Delaware at FIU | W, 1-0",
 "Final Oct 4 Women's · Delaware at Kennesaw State | W, 5-1",
 "Final Oct 11 Women's · Delaware vs Western Kentucky | T, 2-2",
 "Final Oct 18 Women's · Delaware vs Middle Tennessee | W, 1-0",
 "Today Oct 22, 5:00 PM Women's · Delaware at Liberty | ",
 "Upcoming Oct 25, 1:00 PM Women's · Delaware at Jacksonville State | ",
 "Upcoming Oct 31, 6:00 PM Women's · Delaware vs Sam Houston | ",
 "Upcoming Nov 8 Women's · Delaware at CUSA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Delaware vs Howard | W, 1-0",
 "Final Aug 23 Men's · Delaware vs Temple | W, 1-0",
 "Final Aug 27 Men's · Delaware at Georgetown | L, 0-1",
 "Final Sep 1 Men's · Delaware at American | T, 0-0",
 "Final Sep 4 Men's · Delaware at Maryland | L, 3-4",
 "Final Sep 8 Men's · Delaware at Loyola (Md.) | W, 3-0",
 "Final Sep 12 Men's · Delaware vs Mount St. Mary's | T, 2-2",
 "Final Sep 15 Men's · Delaware at Penn | T, 3-3",
 "Final Sep 18 Men's · Delaware vs LIU | W, 3-2",
 "Final Sep 22 Men's · Delaware vs George Washington | W, 6-1",
 "Final Sep 26 Men's · Delaware at Omaha | T, 3-3",
 "Final Sep 29 Men's · Delaware vs Lehigh | W, 1-0",
 "Final Oct 3 Men's · Delaware vs La Salle | W, 2-1",
 "Final Oct 10 Men's · Delaware at St. Thomas | T, 0-0",
 "Final Oct 17 Men's · Delaware vs Kansas City | L, 0-2",
 "Upcoming Oct 24, 7:00 PM Men's · Delaware vs Oral Roberts | ",
 "Upcoming Oct 31, 1:00 PM Men's · Delaware at UMass | ",
 "Upcoming Nov 6 Men's · Delaware at The Summit League Championship | ",
 "Upcoming Nov 11 Men's · Delaware at The Summit League Championship | ",
 "Upcoming Nov 14 Men's · Delaware at The Summit League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 23, 5:00 PM Delaware vs Villanova | ",
 "Upcoming Oct 30, 5:00 PM Delaware vs Wilmington | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Sep 18 Women's · Delaware vs Blue & Gold Intersquad (Exhibition) | Completed",
 "Final Sep 26 Women's · Delaware at Towson | W, 193-107",
 "Upcoming Oct 23, 5:00 PM Women's · Delaware at West Virginia | ",
 "Upcoming Oct 23, 5:00 PM Women's · Delaware at Cincinnati | ",
 "Upcoming Oct 31, 12:00 PM Women's · Delaware vs Penn | ",
 "Upcoming Nov 20 Women's · Delaware at Princeton Big Al Invitational | ",
 "Upcoming Dec 2 Women's · Delaware at U.S. Open | ",
 "Upcoming Jan 8 Women's · Delaware at Princeton | ",
 "Upcoming Jan 8, 5:00 PM Women's · Delaware at Navy | ",
 "Upcoming Jan 8, 5:00 PM Women's · Delaware at Notre Dame | ",
 "Upcoming Jan 23, 11:30 AM Women's · Delaware vs George Washington | ",
 "Upcoming Feb 17 Women's · Delaware at Atlantic Sun Championships | ",
 "Upcoming Mar 8 Women's · Delaware at NCAA Diving Zones | ",
 "Upcoming Mar 11 Women's · Delaware at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17 Women's · Delaware at NCAA Women's National Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Sep 18 Men's · Delaware vs Blue & Gold Intersquad (Exhibition) | Completed",
 "Final Sep 26 Men's · Delaware at Towson | W, 177.5-122.5",
 "Upcoming Oct 23, 5:00 PM Men's · Delaware at West Virginia | ",
 "Upcoming Oct 23, 5:00 PM Men's · Delaware at Cincinnati | ",
 "Upcoming Oct 31, 12:00 PM Men's · Delaware vs Penn (Exhibition) | ",
 "Upcoming Nov 20 Men's · Delaware at Princeton Big Al Invitational | ",
 "Upcoming Dec 2 Men's · Delaware at U.S. Open | ",
 "Upcoming Jan 8, 5:00 PM Men's · Delaware at Princeton | ",
 "Upcoming Jan 8, 5:00 PM Men's · Delaware at Navy | ",
 "Upcoming Jan 8, 5:00 PM Men's · Delaware at Notre Dame | ",
 "Upcoming Jan 23, 11:30 AM Men's · Delaware vs George Washington | ",
 "Upcoming Feb 17 Men's · Delaware at Atlantic Sun Championships | ",
 "Upcoming Mar 8 Men's · Delaware at NCAA Diving Zones | ",
 "Upcoming Mar 11 Men's · Delaware at CSCAA National Invitational Championship | ",
 "Upcoming Mar 24 Men's · Delaware at NCAA Men's National Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 18 Women's · Delaware at UD/Villanova Invite | Completed",
 "Final Oct 2 Women's · Delaware at Fightin' Blue Hens Fall Classic | Completed",
 "Final Oct 15 Women's · Delaware at ITA Regionals | Completed",
 "Upcoming Oct 30 Women's · Delaware at Dragon Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Delaware at Joe Hunt Invitational | Completed",
 "Final Oct 2 Men's · Delaware at SJU Invitational | Completed",
 "Final Oct 15 Men's · Delaware at ITA Regionals | Completed",
 "Upcoming Nov 5 Men's · Delaware at ITA Sectionals | ",
 "Upcoming Nov 6 Men's · Delaware at Dragon Invite | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Delaware vs Montana State | L, 2-3",
 "Final Aug 29 Delaware vs Marist | W, 3-0",
 "Final Aug 30 Delaware at Lafayette | L, 2-3",
 "Final Sep 4 Delaware vs Fordham | W, 3-2",
 "Final Sep 5 Delaware vs New Haven | W, 3-0",
 "Final Sep 10 Delaware vs Rider | W, 3-0",
 "Final Sep 11 Delaware at Rutgers | L, 1-3",
 "Final Sep 12 Delaware vs Stony Brook | L, 0-3",
 "Final Sep 17 Delaware vs VCU | W, 3-2",
 "Final Sep 18 Delaware vs VCU | L, 1-3",
 "Final Sep 25 Delaware vs Jax State | W, 3-1",
 "Final Sep 26 Delaware vs Jax State | W, 3-0",
 "Final Oct 2 Delaware at Middle Tennessee | L, 0-3",
 "Final Oct 3 Delaware at Middle Tennessee | L, 0-3",
 "Final Oct 9 Delaware vs Kennesaw State | L, 1-3",
 "Final Oct 10 Delaware vs Kennesaw State | L, 0-3",
 "Final Oct 16 Delaware at Sam Houston | L, 2-3",
 "Final Oct 17 Delaware at Sam Houston | L, 1-3",
 "Upcoming Oct 23, 12:00 PM Delaware vs Missouri State | ",
 "Upcoming Oct 24, 12:00 PM Delaware vs Missouri State | ",
 "Upcoming Oct 30, 8:00 PM Delaware at New Mexico State | ",
 "Upcoming Oct 31, 1:00 PM Delaware at New Mexico State | ",
 "Upcoming Nov 6, 6:00 PM Delaware vs FIU | ",
 "Upcoming Nov 7, 2:00 PM Delaware vs FIU | ",
 "Upcoming Nov 12, 6:00 PM Delaware at Liberty | ",
 "Upcoming Nov 13, 3:00 PM Delaware at Liberty | ",
 "Upcoming Nov 20 Delaware at Conference USA Tournament | ",
 "Upcoming Nov 21 Delaware at Conference USA Tournament | ",
 "Upcoming Nov 22 Delaware at Conference USA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_icehockey,"Hockey ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rowing,"Rowing rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Delaware module checks passed");
