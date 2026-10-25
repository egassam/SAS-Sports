import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {floridaAmSchool} from '../src/schools/florida-am.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='florida-am');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,floridaAmHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/florida-am-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit famuathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['florida-am'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',floridaAmSchool.scheduleUrls],['roster',floridaAmSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('florida-am|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'famuathletics.com',`${key} must stay on famuathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://famuathletics.com/sports/baseball/schedule"],"roster":["https://famuathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://famuathletics.com/sports/mens-basketball/schedule","https://famuathletics.com/sports/womens-basketball/schedule"],"roster":["https://famuathletics.com/sports/mens-basketball/roster","https://famuathletics.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://famuathletics.com/sports/womens-bowling/schedule"],"roster":["https://famuathletics.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://famuathletics.com/sports/womens-cross-country/schedule"],"roster":["https://famuathletics.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://famuathletics.com/sports/football/schedule"],"roster":["https://famuathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://famuathletics.com/sports/mens-golf/schedule"],"roster":["https://famuathletics.com/sports/mens-golf/roster"],"combined":false},"Softball":{"schedule":["https://famuathletics.com/sports/softball/schedule"],"roster":["https://famuathletics.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://famuathletics.com/sports/womens-tennis/schedule"],"roster":["https://famuathletics.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://famuathletics.com/sports/womens-track-and-field/schedule","https://famuathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://famuathletics.com/sports/womens-track-and-field/roster","https://famuathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://famuathletics.com/sports/womens-volleyball/schedule"],"roster":["https://famuathletics.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'florida-am|"+sport+"':"),`${sport} routes must live in the Florida A&M module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://famuathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.floridaAmHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=florida-am)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 27, 11:30 AM Men's · Florida A&M vs Saint Leo (Fla.) (Exhibition) | ",
 "Upcoming Nov 2, 8:30 PM Men's · Florida A&M vs Florida State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Florida A&M vs Fort Valley State | ",
 "Upcoming Nov 9 Men's · Florida A&M at UAB | ",
 "Upcoming Nov 11 Men's · Florida A&M vs Kansas City | ",
 "Upcoming Nov 15, 8:00 PM Men's · Florida A&M at UTEP | ",
 "Upcoming Nov 18 Men's · Florida A&M at UTSA | ",
 "Upcoming Nov 24, 8:00 PM Men's · Florida A&M at South Alabama | ",
 "Upcoming Nov 30, 7:00 PM Men's · Florida A&M at Kennesaw State | ",
 "Upcoming Dec 4, 8:30 PM Men's · Florida A&M vs Norfolk State | ",
 "Upcoming Dec 5, 6:00 PM Men's · Florida A&M vs Tennessee State | ",
 "Upcoming Dec 12 Men's · Florida A&M at Tulsa | ",
 "Upcoming Dec 15 Men's · Florida A&M at Saint Louis | ",
 "Upcoming Dec 21, 7:00 PM Men's · Florida A&M at Florida | ",
 "Upcoming Dec 30, 7:00 PM Men's · Florida A&M vs Thomas (Ga.) | ",
 "Upcoming Jan 2 Men's · Florida A&M vs Bethune-Cookman | ",
 "Upcoming Jan 9 Men's · Florida A&M at Southern | ",
 "Upcoming Jan 11 Men's · Florida A&M at Grambling State | ",
 "Upcoming Jan 16 Men's · Florida A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 18 Men's · Florida A&M vs Mississippi Valley State | ",
 "Upcoming Jan 23, 4:00 PM Men's · Florida A&M at Alcorn State | ",
 "Upcoming Jan 25, 8:00 PM Men's · Florida A&M at Jackson State | ",
 "Upcoming Jan 30 Men's · Florida A&M vs Alabama A&M | ",
 "Upcoming Feb 1 Men's · Florida A&M vs Alabama State | ",
 "Upcoming Feb 6 Men's · Florida A&M at Texas Southern | ",
 "Upcoming Feb 8 Men's · Florida A&M at Prairie View A&M | ",
 "Upcoming Feb 13, 4:00 PM Men's · Florida A&M vs Jackson State | ",
 "Upcoming Feb 15 Men's · Florida A&M vs Alcorn State | ",
 "Upcoming Feb 18, 8:30 PM Men's · Florida A&M at Alabama A&M | ",
 "Upcoming Feb 20, 4:00 PM Men's · Florida A&M at Alabama State | ",
 "Upcoming Feb 25 Men's · Florida A&M vs Southern | ",
 "Upcoming Feb 27 Men's · Florida A&M vs Grambling State | ",
 "Upcoming Mar 4 Men's · Florida A&M at Bethune-Cookman | ",
 "Upcoming Mar 8 Men's · Florida A&M at SWAC Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:30 PM Women's · Florida A&M at Tennessee (Exhibition) | ",
 "Upcoming Nov 3, 6:30 PM Women's · Florida A&M at UCF | ",
 "Upcoming Nov 8, 2:00 PM Women's · Florida A&M at Florida State | ",
 "Upcoming Nov 12, 11:00 AM Women's · Florida A&M vs Albany State | ",
 "Upcoming Nov 15, 2:00 PM Women's · Florida A&M at West Florida | ",
 "Upcoming Nov 19, 8:30 PM Women's · Florida A&M vs Alabama | ",
 "Upcoming Nov 25, 2:00 PM Women's · Florida A&M at Kennesaw State | ",
 "Upcoming Dec 1, 7:00 PM Women's · Florida A&M at Stetson | ",
 "Upcoming Dec 6, 2:00 PM Women's · Florida A&M vs Florida Gulf Coast | ",
 "Upcoming Dec 14, 6:30 PM Women's · Florida A&M vs Mobile (Ala.) | ",
 "Upcoming Dec 17, 6:30 PM Women's · Florida A&M vs Thomas (Ga.) | ",
 "Upcoming Dec 19, 4:00 PM Women's · Florida A&M vs South Carolina State | ",
 "Upcoming Dec 22, 1:00 PM Women's · Florida A&M at Florida | ",
 "Upcoming Dec 30, 4:00 PM Women's · Florida A&M vs Fort Lauderdale | ",
 "Upcoming Jan 2, 2:00 PM Women's · Florida A&M vs Bethune-Cookman | ",
 "Upcoming Jan 7, 7:00 PM Women's · Florida A&M at Grambling State | ",
 "Upcoming Jan 9, 3:30 PM Women's · Florida A&M at Southern (La.) | ",
 "Upcoming Jan 14, 6:30 PM Women's · Florida A&M vs Mississippi Valley State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Florida A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Jan 21, 7:00 PM Women's · Florida A&M at Jackson State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Florida A&M at Alcorn | ",
 "Upcoming Jan 28, 6:30 PM Women's · Florida A&M vs Alabama State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Florida A&M vs Alabama A&M | ",
 "Upcoming Feb 4 Women's · Florida A&M at Prairie View A&M | ",
 "Upcoming Feb 6 Women's · Florida A&M at Texas Southern | ",
 "Upcoming Feb 11, 6:30 PM Women's · Florida A&M vs Alcorn | ",
 "Upcoming Feb 13, 2:00 PM Women's · Florida A&M vs Jackson State | ",
 "Upcoming Feb 18, 6:30 PM Women's · Florida A&M at Alabama A&M | ",
 "Upcoming Feb 20, 2:00 PM Women's · Florida A&M at Alabama State | ",
 "Upcoming Feb 25, 6:30 PM Women's · Florida A&M vs Southern (La.) | ",
 "Upcoming Feb 27, 2:00 PM Women's · Florida A&M vs Grambling State | ",
 "Upcoming Mar 4, 5:30 PM Women's · Florida A&M at Bethune-Cookman | ",
 "Upcoming Mar 8 Women's · Florida A&M at SWAC Tournament | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 Florida A&M at Colonial Lanes Classic | 11th of 14",
 "Upcoming Oct 30 Florida A&M at Virginia Union Invitational | ",
 "Upcoming Nov 13 Florida A&M at Track Kat Klash | ",
 "Upcoming Jan 15 Florida A&M at SWAC Roundup – West | ",
 "Upcoming Jan 29 Florida A&M at Rattlers Beach Bowl | ",
 "Upcoming Feb 5 Florida A&M at SWAC Roundup – East | ",
 "Upcoming Feb 12 Florida A&M at TNBA Open | ",
 "Upcoming Feb 26 Florida A&M at Stallings Invitational | ",
 "Upcoming Mar 19 Florida A&M at SWAC Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Florida A&M at Florida Intercollegiate XC Invitational | 11th of 19",
 "Final Sep 11 Florida A&M at Willie Laster Cross Country Invitational | 1st of 6",
 "Final Sep 18 Florida A&M at Pre-Regionals | 15th of 28",
 "Final Oct 9 Florida A&M at FSU XC Invite | 6th of 16",
 "Upcoming Oct 27, 8:00 AM Florida A&M at SWAC Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Florida A&M vs Albany State | W, 20-7",
 "Final Sep 6 Florida A&M vs South Carolina State | L, 13-31",
 "Final Sep 10 Florida A&M at Miami (Fla.) | L, 7-77",
 "Final Sep 19 Florida A&M vs Tennessee State | L, 26-29",
 "Final Sep 26 Florida A&M vs Alabama A&M | L, 21-40",
 "Final Oct 9 Florida A&M at Alabama State | W, 28-27",
 "Final Oct 17 Florida A&M at Jackson State | L, 17-27",
 "Today Oct 24, 3:00 PM Florida A&M vs Arkansas - Pine Bluff | ",
 "Upcoming Oct 31, 3:00 PM Florida A&M vs Southern | ",
 "Upcoming Nov 7, 3:00 PM Florida A&M at Alcorn State | ",
 "Upcoming Nov 14, 3:00 PM Florida A&M vs Mississippi Valley State | ",
 "Upcoming Nov 21, 3:30 PM Florida A&M vs Bethune-Cookman | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Florida A&M at Folds of Honor | 11th of 14",
 "Final Sep 14 Florida A&M at Jackson T. Stephens Cup | No team score (individuals only)",
 "Final Sep 21 Florida A&M at Florida Atlantic Invitational | 10th of 11",
 "Final Oct 12 Florida A&M at The Scrappy at Pinetree | 6th of 11",
 "Final Oct 17 Florida A&M at SAS HBCU Invitational | 1st of 4",
 "Today Oct 23, 8:00 AM Florida A&M at Fripp Island Intercollegiate | ",
 "Upcoming Nov 9 Florida A&M at Southwestern Athletic Conference Fall Tournament | ",
 "Upcoming Feb 20, 8:00 AM Florida A&M at Savannah Intercollegiate | ",
 "Upcoming Mar 1, 8:00 AM Florida A&M at Sam Ryder Intercollegiate (Stetson) | ",
 "Upcoming Mar 12, 8:00 AM Florida A&M at Seminole Intercollegiate (FSU) | ",
 "Upcoming Mar 21, 8:00 AM Florida A&M at Game Above Collegiate (Eastern Michigan) | ",
 "Upcoming Apr 5, 8:00 AM Florida A&M at Memphis Intercollegiate | ",
 "Upcoming Apr 12, 8:00 AM Florida A&M at SWAC Championship | ",
 "Upcoming May 1, 8:00 AM Florida A&M at PGA WORKS Collegiate Championship | ",
 "Upcoming May 13, 8:00 AM Florida A&M at NCAA Regionals | ",
 "Upcoming May 24, 8:00 AM Florida A&M at NCAA Championships | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 17 Florida A&M at HBCU National Championships | Completed",
 "Final Sep 25 Florida A&M at Bedford Cup | Completed",
 "Final Oct 2 Florida A&M at Mercer Gridiron Classic | Completed",
 "Final Oct 19 Florida A&M at SWAC Fall Tournament | Completed",
 "Upcoming Oct 31 Florida A&M at Stetson Fall Tournament | ",
 "Upcoming Jan 23, 4:00 PM Florida A&M at Florida State | ",
 "Upcoming Jan 24 Florida A&M vs Jacksonville State | ",
 "Upcoming Jan 30 Florida A&M vs Georgia Southern | ",
 "Upcoming Feb 6 Florida A&M vs Edward Waters | ",
 "Upcoming Feb 12 Florida A&M at Kennesaw State | ",
 "Upcoming Feb 13, 11:00 AM Florida A&M at Mercer | ",
 "Upcoming Feb 14, 11:00 AM Florida A&M vs Tulane | ",
 "Upcoming Feb 21, 10:00 AM Florida A&M vs Georgia State | ",
 "Upcoming Feb 22, 1:00 PM Florida A&M vs West Florida | ",
 "Upcoming Feb 24, 2:00 PM Florida A&M at Troy | ",
 "Upcoming Feb 27 Florida A&M at Stetson | ",
 "Upcoming Mar 6 Florida A&M vs Grambling State | ",
 "Upcoming Mar 7 Florida A&M vs Mississippi Valley State | ",
 "Upcoming Mar 13 Florida A&M vs Alabama A&M | ",
 "Upcoming Mar 14, 10:00 AM Florida A&M vs Southern Miss | ",
 "Upcoming Mar 20, 10:00 AM Florida A&M vs Alcorn | ",
 "Upcoming Mar 25 Florida A&M at Jackson State | ",
 "Upcoming Mar 26 Florida A&M vs Bethune-Cookman | ",
 "Upcoming Mar 28 Florida A&M vs Southern (La.) | ",
 "Upcoming Apr 4, 11:00 AM Florida A&M at Alabama State | ",
 "Upcoming Apr 16 Florida A&M at SWAC Championships | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 23 Florida A&M vs Edward Waters (Exhibition) | W, 5-0",
 "Final Aug 28 Florida A&M vs Delaware State | L, 1-3",
 "Final Aug 28 Florida A&M vs North Carolina Central | L, 1-3",
 "Final Aug 29 Florida A&M vs Maryland Eastern Shore | W, 3-0",
 "Final Sep 4 Florida A&M vs Connecticut | W, 3-2",
 "Final Sep 5 Florida A&M vs Coastal Carolina | L, 1-3",
 "Final Sep 6 Florida A&M at Jacksonville | L, 0-3",
 "Final Sep 10 Florida A&M vs Louisiana | W, 3-2",
 "Final Sep 11 Florida A&M vs Florida International | L, 0-3",
 "Final Sep 12 Florida A&M vs Hampton | W, 3-2",
 "Final Sep 15 Florida A&M at Mercer | L, 0-3",
 "Final Sep 18 Florida A&M vs Cal State Fullerton | L, 1-3",
 "Final Sep 18 Florida A&M vs Idaho | L, 2-3",
 "Final Sep 19 Florida A&M at LSU New Orleans | W, 3-1",
 "Final Sep 25 Florida A&M vs Alabama State | W, 3-1",
 "Final Sep 27 Florida A&M vs Alabama A&M | L, 2-3",
 "Final Oct 2 Florida A&M at Mississippi Valley State | W, 3-1",
 "Final Oct 4 Florida A&M at Jackson State | W, 3-1",
 "Final Oct 7 Florida A&M vs Bethune-Cookman | W, 3-0",
 "Final Oct 9 Florida A&M vs Arkansas - Pine Bluff | W, 3-0",
 "Final Oct 11 Florida A&M vs Grambling State | W, 3-1",
 "Final Oct 16 Florida A&M at Bethune-Cookman | W, 3-1",
 "Upcoming Oct 25 Florida A&M vs Alcorn State | ",
 "Upcoming Oct 26 Florida A&M vs Southern (La.) | ",
 "Upcoming Oct 30, 6:00 PM Florida A&M at Alabama State | ",
 "Upcoming Nov 1, 12:00 PM Florida A&M at Alabama A&M | ",
 "Upcoming Nov 6, 6:00 PM Florida A&M at Texas Southern | ",
 "Upcoming Nov 8, 12:00 PM Florida A&M at Prairie View A&M | ",
 "Upcoming Nov 13, 6:00 PM Florida A&M vs Mississippi Valley State | ",
 "Upcoming Nov 15 Florida A&M vs Jackson State | ",
 "Upcoming Nov 20 Florida A&M at SWAC Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Florida A&M module checks passed");
