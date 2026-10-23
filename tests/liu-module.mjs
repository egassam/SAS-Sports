import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {liuSchool} from '../src/schools/liu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='liu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,liuHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/liu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit liuathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['liu'];
assert.equal(sports.length,21);
for(const [name,map] of [['schedule',liuSchool.scheduleUrls],['roster',liuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('liu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'liuathletics.com',`${key} must stay on liuathletics.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://liuathletics.com/sports/acrobatics-and-tumbling/schedule"],"roster":["https://liuathletics.com/sports/acrobatics-and-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://liuathletics.com/sports/baseball/schedule"],"roster":["https://liuathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://liuathletics.com/sports/mens-basketball/schedule"],"roster":["https://liuathletics.com/sports/mens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://liuathletics.com/sports/womens-bowling/schedule"],"roster":["https://liuathletics.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://liuathletics.com/sports/womens-cross-country/schedule","https://liuathletics.com/sports/mens-cross-country/schedule"],"roster":["https://liuathletics.com/sports/womens-cross-country/roster","https://liuathletics.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://liuathletics.com/sports/equestrian/schedule"],"roster":["https://liuathletics.com/sports/equestrian/roster"],"combined":false},"Fencing":{"schedule":["https://liuathletics.com/sports/womens-fencing/schedule","https://liuathletics.com/sports/mens-fencing/schedule"],"roster":["https://liuathletics.com/sports/womens-fencing/roster","https://liuathletics.com/sports/mens-fencing/roster"],"combined":true},"Field Hockey":{"schedule":["https://liuathletics.com/sports/field-hockey/schedule"],"roster":["https://liuathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://liuathletics.com/sports/football/schedule"],"roster":["https://liuathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://liuathletics.com/sports/womens-golf/schedule"],"roster":["https://liuathletics.com/sports/womens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://liuathletics.com/sports/womens-gymnastics/schedule"],"roster":["https://liuathletics.com/sports/womens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://liuathletics.com/sports/mens-ice-hockey/schedule"],"roster":["https://liuathletics.com/sports/mens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://liuathletics.com/sports/womens-lacrosse/schedule"],"roster":["https://liuathletics.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://liuathletics.com/sports/womens-rowing/schedule"],"roster":["https://liuathletics.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://liuathletics.com/sports/womens-soccer/schedule"],"roster":["https://liuathletics.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://liuathletics.com/sports/softball/schedule"],"roster":["https://liuathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://liuathletics.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://liuathletics.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://liuathletics.com/sports/womens-tennis/schedule"],"roster":["https://liuathletics.com/sports/womens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://liuathletics.com/sports/womens-track-and-field/schedule","https://liuathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://liuathletics.com/sports/womens-track-and-field/roster","https://liuathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://liuathletics.com/sports/womens-volleyball/schedule"],"roster":["https://liuathletics.com/sports/womens-volleyball/roster"],"combined":true},"Water Polo":{"schedule":["https://liuathletics.com/sports/womens-water-polo/schedule"],"roster":["https://liuathletics.com/sports/womens-water-polo/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'liu|"+sport+"':"),`${sport} routes must live in the LIU module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://liuathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.liuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=liu)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticsandtumbling=parse("Acrobatics & Tumbling","acrobatics-and-tumbling");
  assert.deepEqual(v_acrobaticsandtumbling.map(line),[]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 11 Men's · LIU at UMBC (Exhibition) | W, 86-77",
 "Upcoming Nov 2, 7:00 PM Men's · LIU at Florida Atlantic | ",
 "Upcoming Nov 5, 6:30 PM Men's · LIU at Seton Hall | ",
 "Upcoming Nov 7, 3:30 PM Men's · LIU at La Salle | ",
 "Upcoming Nov 9 Men's · LIU at Towson | ",
 "Upcoming Nov 13 Men's · LIU at Fordham | ",
 "Upcoming Nov 16, 7:00 PM Men's · LIU vs St. Thomas | ",
 "Upcoming Nov 18, 7:00 PM Men's · LIU vs UNC Wilmington | ",
 "Upcoming Nov 22, 1:00 PM Men's · LIU vs Fairfield | ",
 "Upcoming Dec 2, 7:00 PM Men's · LIU vs Cornell | ",
 "Upcoming Dec 5, 2:00 PM Men's · LIU at George Washington | ",
 "Upcoming Dec 8, 7:00 PM Men's · LIU at Notre Dame | ",
 "Upcoming Dec 12, 1:00 PM Men's · LIU vs Princeton | ",
 "Upcoming Dec 16, 9:00 PM Men's · LIU at Louisville | ",
 "Upcoming Dec 22 Men's · LIU at San Diego State | ",
 "Upcoming Dec 29, 6:00 PM Men's · LIU at Florida | ",
 "Upcoming Jan 2, 1:00 PM Men's · LIU vs Le Moyne | ",
 "Upcoming Jan 4, 1:00 PM Men's · LIU at New Haven | ",
 "Upcoming Jan 10, 1:00 PM Men's · LIU vs FDU | ",
 "Upcoming Jan 13, 7:00 PM Men's · LIU at Chicago State | ",
 "Upcoming Jan 16, 1:00 PM Men's · LIU vs Stonehill | ",
 "Upcoming Jan 21, 7:00 PM Men's · LIU vs Mercyhurst | ",
 "Upcoming Jan 23, 1:00 PM Men's · LIU vs New Haven | ",
 "Upcoming Jan 28 Men's · LIU at Central Connecticut State | ",
 "Upcoming Jan 30, 1:00 PM Men's · LIU at Wagner | ",
 "Upcoming Feb 4 Men's · LIU at Mercyhurst | ",
 "Upcoming Feb 6, 1:00 PM Men's · LIU at Le Moyne | ",
 "Upcoming Feb 11, 7:00 PM Men's · LIU vs Chicago State | ",
 "Upcoming Feb 13, 1:00 PM Men's · LIU vs Wagner | ",
 "Upcoming Feb 18, 7:00 PM Men's · LIU at Stonehill | ",
 "Upcoming Feb 20, 7:00 PM Men's · LIU at FDU | ",
 "Upcoming Feb 27, 1:00 PM Men's · LIU vs Central Connecticut State | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 10 LIU at EIBT #1 | Completed",
 "Upcoming Oct 24, 9:00 AM LIU at Seahawk Classic | ",
 "Upcoming Nov 13, 9:00 AM LIU at NEC Meet #1 | ",
 "Upcoming Nov 20, 9:00 AM LIU at Jersey Jamboree | ",
 "Upcoming Jan 15, 9:00 AM LIU at Northeast Classic | ",
 "Upcoming Jan 30, 9:00 AM LIU at EIBT #3 | ",
 "Upcoming Feb 12 LIU at NEC Meet #2 | ",
 "Upcoming Feb 27 LIU at Dr. Robert Cincotta Memorial | ",
 "Upcoming Mar 5, 9:00 AM LIU at Music City Classic | ",
 "Upcoming Mar 13, 9:00 AM LIU at Northeast Roundup | ",
 "Upcoming Mar 19 LIU at NEC Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · LIU at Regionals Preview | Completed",
 "Final Sep 18 Women's · LIU at Fall Festival | 3rd · 65 pts",
 "Final Oct 10 Women's · LIU at Mets Championships | Completed",
 "Final Oct 16 Women's · LIU at IC4A/ECAC Championship | Completed",
 "Upcoming Oct 31 Women's · LIU at NEC Championships | ",
 "Upcoming Nov 13 Women's · LIU at NCAA Regionals | ",
 "Upcoming Nov 21 Women's · LIU at NCAA Championship | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · LIU at Regionals Preview | Completed",
 "Final Sep 18 Men's · LIU at Fall Festival | 2nd · 66 pts",
 "Final Oct 10 Men's · LIU at Mets Championships | Completed",
 "Final Oct 16 Men's · LIU at IC4A/ECAC Championship | Completed",
 "Upcoming Oct 31 Men's · LIU at NEC Championships | ",
 "Upcoming Nov 13 Men's · LIU at NCAA Regionals | ",
 "Upcoming Nov 21 Men's · LIU at NCAA Championship | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Upcoming Oct 25, 9:00 AM LIU at New York | ",
 "Upcoming Nov 1, 9:00 AM LIU at Molloy | ",
 "Upcoming Nov 8, 9:00 AM LIU vs LIU | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 LIU at Lehigh | L, 0-2",
 "Final Sep 4 LIU at Drexel | L, 0-11",
 "Final Sep 6 LIU at Fairfield | L, 0-7",
 "Final Sep 11 LIU at Vermont | L, 0-9",
 "Final Sep 13 LIU at Columbia | L, 0-9",
 "Final Sep 18 LIU vs Rider | L, 0-4",
 "Final Sep 20 LIU at Queens (N.C.) | L, 1-7",
 "Final Sep 24 LIU at Wagner | L, 0-6",
 "Final Sep 29 LIU vs New Haven | W, 4-3",
 "Final Oct 2 LIU at Mercyhurst | W, 4-2",
 "Final Oct 4 LIU at La Salle | L, 2-4",
 "Final Oct 9 LIU vs Quinnipiac | L, 1-7",
 "Final Oct 16 LIU vs Stonehill | W, 4-0",
 "Final Oct 18 LIU at Bryant | L, 2-6",
 "Final Oct 23 LIU at Sacred Heart | L, 0-3",
 "Upcoming Oct 30, 5:00 PM LIU at Merrimack | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 27 LIU at North Dakota | L, 21-42",
 "Final Sep 4 LIU at Kansas | L, 6-51",
 "Final Sep 12 LIU vs UAlbany | L, 13-35",
 "Final Sep 19 LIU vs Villanova | L, 16-20",
 "Final Sep 26 LIU at Florida International | L, 3-20",
 "Final Oct 3 LIU vs Mercyhurst | W, 27-24",
 "Final Oct 10 LIU at Duquesne | W, 17-14",
 "Final Oct 17 LIU at Wagner | W, 14-9",
 "Upcoming Oct 24, 12:00 PM LIU vs Stonehill | ",
 "Upcoming Nov 7, 12:00 PM LIU at New Haven | ",
 "Upcoming Nov 14, 12:00 PM LIU vs Central Connecticut State | ",
 "Upcoming Nov 21, 12:00 PM LIU at Robert Morris | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 LIU at Tribe Invitational | 7th of 8",
 "Final Sep 21 LIU at Red Bandanna Invitational | 9th of 15",
 "Final Sep 28 LIU at Hill YEAH! | 4th of 9",
 "Final Oct 3 LIU at Navy Fall Invite | 6th of 10",
 "Final Oct 11 LIU at UAlbany Doc Sauers Invitational | 6th of 10",
 "Upcoming Feb 13 LIU at Battle at the Beach | ",
 "Upcoming Mar 8 LIU at Orange Tree Invitational | ",
 "Upcoming Mar 12 LIU at 2027 NKU Spring Fling | ",
 "Upcoming Apr 5 LIU at St John's Women's Invitational | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · LIU at Minnesota Duluth | L, 4-7",
 "Final Oct 3 Men's · LIU at Minnesota Duluth | L, 0-4",
 "Final Oct 9 Men's · LIU vs Canisius | L, 2-3",
 "Final Oct 10 Men's · LIU vs Canisius | W, 3-2",
 "Final Oct 16 Men's · LIU at RPI | L, 1-2",
 "Final Oct 17 Men's · LIU at RPI | L, 2-3",
 "Final Oct 20 Men's · LIU at St. Lawrence | W, 7-6",
 "Today Oct 23, 7:30 PM Men's · LIU vs USA National Team Development Program | ",
 "Upcoming Oct 29, 7:00 PM Men's · LIU at Western Michigan | ",
 "Upcoming Oct 30, 7:00 PM Men's · LIU at Western Michigan | ",
 "Upcoming Nov 6, 7:30 PM Men's · LIU vs Robert Morris | ",
 "Upcoming Nov 7, 7:30 PM Men's · LIU vs Robert Morris | ",
 "Upcoming Nov 20 Men's · LIU at Lindenwood | ",
 "Upcoming Nov 21 Men's · LIU at Lindenwood | ",
 "Upcoming Nov 28 Men's · LIU at Bentley | ",
 "Upcoming Nov 29 Men's · LIU at Bentley | ",
 "Upcoming Dec 4, 7:30 PM Men's · LIU vs Sacred Heart | ",
 "Upcoming Dec 5, 5:00 PM Men's · LIU at Sacred Heart | ",
 "Upcoming Dec 11, 11:00 PM Men's · LIU at Alaska Anchorage | ",
 "Upcoming Dec 12, 10:00 PM Men's · LIU at Alaska Anchorage | ",
 "Upcoming Dec 28, 7:00 PM Men's · LIU vs Army | ",
 "Upcoming Dec 29 Men's · LIU vs St. Lawrence / Ferris State | ",
 "Upcoming Jan 2, 8:00 PM Men's · LIU vs Northeastern | ",
 "Upcoming Jan 15, 7:30 PM Men's · LIU vs Alaska Fairbanks | ",
 "Upcoming Jan 16, 7:30 PM Men's · LIU vs Alaska Fairbanks | ",
 "Upcoming Jan 22, 2:00 PM Men's · LIU vs Alaska Anchorage | ",
 "Upcoming Jan 23, 2:00 PM Men's · LIU vs Alaska Anchorage | ",
 "Upcoming Jan 29, 7:30 PM Men's · LIU vs Lindenwood | ",
 "Upcoming Jan 30, 7:30 PM Men's · LIU vs Lindenwood | ",
 "Upcoming Feb 6 Men's · LIU at Providence | ",
 "Upcoming Feb 12, 7:00 PM Men's · LIU at Stonehill | ",
 "Upcoming Feb 13, 7:00 PM Men's · LIU at Stonehill | ",
 "Upcoming Feb 19, 2:00 PM Men's · LIU vs Stonehill | ",
 "Upcoming Feb 20, 2:00 PM Men's · LIU vs Stonehill | ",
 "Upcoming Mar 5 Men's · LIU vs UCHC Playoff Game 1 | ",
 "Upcoming Mar 6 Men's · LIU vs UCHC Playoff Game 2 | ",
 "Upcoming Mar 7 Men's · LIU vs UCHC Playoff Game 3 | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 LIU at Iona | L, 0-3",
 "Final Aug 16 LIU vs Manhattan | L, 1-3",
 "Final Aug 20 LIU at Temple | L, 0-3",
 "Final Aug 26 LIU at Saint Peter's | L, 1-2",
 "Final Sep 6 LIU at UCONN | L, 1-5",
 "Final Sep 10 LIU at New Jersey Institute of Technology | L, 0-3",
 "Final Sep 13 LIU vs St. Bonaventure | T, 0-0",
 "Final Sep 17 LIU vs CCSU | L, 0-1",
 "Final Sep 20 LIU at Mercyhurst | W, 2-1",
 "Final Sep 24 LIU vs Delaware State | W, 3-2",
 "Final Oct 4 LIU vs Chicago State | W, 1-0",
 "Final Oct 8 LIU at Le Moyne | L, 1-2",
 "Final Oct 11 LIU vs Wagner | L, 0-4",
 "Final Oct 18 LIU vs Howard | T, 3-3",
 "Upcoming Oct 25, 1:00 PM LIU at New Haven | ",
 "Upcoming Nov 1, 12:00 PM LIU at FDU | ",
 "Upcoming Nov 8, 1:00 PM LIU at Stonehill | ",
 "Upcoming Nov 12 LIU at NEC Semifinals | ",
 "Upcoming Nov 15 LIU vs NEC Finals | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 17 Women's · LIU vs Manhattan | W, 197-47",
 "Upcoming Oct 30, 5:00 PM Women's · LIU vs Saint Peter's | ",
 "Upcoming Nov 7, 11:00 AM Women's · LIU vs Wagner College | ",
 "Upcoming Dec 4 Women's · LIU at ECAC | ",
 "Upcoming Jan 15, 4:00 PM Women's · LIU at Bridgeport | ",
 "Upcoming Jan 15, 4:00 PM Women's · LIU at Sacred Heart | ",
 "Upcoming Jan 23 Women's · LIU at Monmouth | ",
 "Upcoming Jan 23 Women's · LIU at Saint Peter's | ",
 "Upcoming Jan 29, 5:00 PM Women's · LIU at Wagner College | ",
 "Upcoming Feb 17 Women's · LIU at NEC Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · LIU at Binghamton Championships | Completed",
 "Final Oct 15 Women's · LIU at ITA Regional Tournament | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · LIU at Michigan | L, 0-3",
 "Final Aug 29 Women's · LIU at Michigan State | L, 0-3",
 "Final Sep 4 Women's · LIU at Oregon | L, 0-3",
 "Final Sep 5 Women's · LIU vs Washington State | L, 0-3",
 "Final Sep 8 Women's · LIU at Rutgers | L, 1-3",
 "Final Sep 11 Women's · LIU vs Green Bay | L, 1-3",
 "Final Sep 12 Women's · LIU at Northwestern | L, 0-3",
 "Final Sep 13 Women's · LIU vs Virginia Tech | W, 3-1",
 "Final Sep 19 Women's · LIU vs Duke | W, 3-2",
 "Final Sep 20 Women's · LIU at Butler | W, 3-0",
 "Final Sep 23 Women's · LIU at Saint Peter's | W, 3-0",
 "Final Oct 2 Women's · LIU vs Le Moyne | W, 3-0",
 "Final Oct 3 Women's · LIU vs Le Moyne | W, 3-0",
 "Final Oct 9 Women's · LIU at Chicago State | W, 3-0",
 "Final Oct 10 Women's · LIU at Chicago State | W, 3-0",
 "Final Oct 16 Women's · LIU vs New Haven | W, 3-0",
 "Final Oct 17 Women's · LIU vs New Haven | W, 3-0",
 "Today Oct 23, 6:00 PM Women's · LIU at FDU | ",
 "Upcoming Oct 24, 1:00 PM Women's · LIU at FDU | ",
 "Upcoming Oct 30, 6:00 PM Women's · LIU vs Central Connecticut State | ",
 "Upcoming Oct 31, 1:00 PM Women's · LIU vs Central Connecticut State | ",
 "Upcoming Nov 6, 6:00 PM Women's · LIU at Stonehill | ",
 "Upcoming Nov 7, 1:00 PM Women's · LIU at Stonehill | ",
 "Upcoming Nov 13, 6:00 PM Women's · LIU at Mercyhurst | ",
 "Upcoming Nov 14, 1:00 PM Women's · LIU at Mercyhurst | ",
 "Upcoming Nov 20 Women's · LIU at NEC Tournament | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  ownRecapsOnly(v_acrobaticsandtumbling,"Acrobatics & Tumbling acrobatics-and-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("LIU module checks passed");
