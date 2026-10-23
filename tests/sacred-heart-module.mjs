import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sacredHeartSchool} from '../src/schools/sacred-heart.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='sacred-heart');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,sacredHeartHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/sacred-heart-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit sacredheartpioneers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['sacred-heart'];
assert.equal(sports.length,19);
for(const [name,map] of [['schedule',sacredHeartSchool.scheduleUrls],['roster',sacredHeartSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('sacred-heart|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'sacredheartpioneers.com',`${key} must stay on sacredheartpioneers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://sacredheartpioneers.com/sports/baseball/schedule"],"roster":["https://sacredheartpioneers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://sacredheartpioneers.com/sports/mens-basketball/schedule","https://sacredheartpioneers.com/sports/womens-basketball/schedule"],"roster":["https://sacredheartpioneers.com/sports/mens-basketball/roster","https://sacredheartpioneers.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://sacredheartpioneers.com/sports/womens-bowling/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://sacredheartpioneers.com/sports/womens-cross-country/schedule","https://sacredheartpioneers.com/sports/mens-cross-country/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-cross-country/roster","https://sacredheartpioneers.com/sports/mens-cross-country/roster"],"combined":true},"Equestrian":{"schedule":["https://sacredheartpioneers.com/sports/equestrian/schedule"],"roster":["https://sacredheartpioneers.com/sports/equestrian/roster"],"combined":false},"Fencing":{"schedule":["https://sacredheartpioneers.com/sports/womens-fencing/schedule","https://sacredheartpioneers.com/sports/mens-fencing/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-fencing/roster","https://sacredheartpioneers.com/sports/mens-fencing/roster"],"combined":true},"Field Hockey":{"schedule":["https://sacredheartpioneers.com/sports/field-hockey/schedule"],"roster":["https://sacredheartpioneers.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://sacredheartpioneers.com/sports/football/schedule"],"roster":["https://sacredheartpioneers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://sacredheartpioneers.com/sports/womens-golf/schedule","https://sacredheartpioneers.com/sports/mens-golf/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-golf/roster","https://sacredheartpioneers.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://sacredheartpioneers.com/sports/mens-ice-hockey/schedule","https://sacredheartpioneers.com/sports/womens-ice-hockey/schedule"],"roster":["https://sacredheartpioneers.com/sports/mens-ice-hockey/roster","https://sacredheartpioneers.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://sacredheartpioneers.com/sports/womens-lacrosse/schedule","https://sacredheartpioneers.com/sports/mens-lacrosse/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-lacrosse/roster","https://sacredheartpioneers.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://sacredheartpioneers.com/sports/womens-rowing/schedule","https://sacredheartpioneers.com/sports/womens-lightweight-rowing/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-rowing/roster","https://sacredheartpioneers.com/sports/womens-lightweight-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://sacredheartpioneers.com/sports/womens-soccer/schedule","https://sacredheartpioneers.com/sports/mens-soccer/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-soccer/roster","https://sacredheartpioneers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://sacredheartpioneers.com/sports/softball/schedule"],"roster":["https://sacredheartpioneers.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://sacredheartpioneers.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://sacredheartpioneers.com/sports/womens-tennis/schedule","https://sacredheartpioneers.com/sports/mens-tennis/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-tennis/roster","https://sacredheartpioneers.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://sacredheartpioneers.com/sports/womens-track-and-field/schedule","https://sacredheartpioneers.com/sports/mens-track-and-field/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-track-and-field/roster","https://sacredheartpioneers.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://sacredheartpioneers.com/sports/womens-volleyball/schedule","https://sacredheartpioneers.com/sports/mens-volleyball/schedule"],"roster":["https://sacredheartpioneers.com/sports/womens-volleyball/roster","https://sacredheartpioneers.com/sports/mens-volleyball/roster"],"combined":true},"Wrestling":{"schedule":["https://sacredheartpioneers.com/sports/wrestling/schedule","https://sacredheartpioneers.com/sports/wwrest/schedule"],"roster":["https://sacredheartpioneers.com/sports/wrestling/roster","https://sacredheartpioneers.com/sports/wwrest/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'sacred-heart|"+sport+"':"),`${sport} routes must live in the Sacred Heart module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://sacredheartpioneers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.sacredHeartHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=sacred-heart)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Sacred Heart vs Coast Guard | ",
 "Upcoming Nov 5, 7:00 PM Men's · Sacred Heart vs Maine | ",
 "Upcoming Nov 8, 2:00 PM Men's · Sacred Heart at New Hampshire | ",
 "Upcoming Nov 12, 7:00 PM Men's · Sacred Heart vs Central Connecticut | ",
 "Upcoming Nov 17, 7:00 PM Men's · Sacred Heart at Providence | ",
 "Upcoming Nov 24, 6:00 PM Men's · Sacred Heart at Rutgers | ",
 "Upcoming Nov 29, 2:00 PM Men's · Sacred Heart vs NJIT | ",
 "Upcoming Dec 4, 7:00 PM Men's · Sacred Heart at Marist | ",
 "Upcoming Dec 6, 2:00 PM Men's · Sacred Heart at Saint Peter's | ",
 "Upcoming Dec 9, 11:00 AM Men's · Sacred Heart vs UMass Lowell | ",
 "Upcoming Dec 14, 11:00 AM Men's · Sacred Heart vs Queens (N.C.) | ",
 "Upcoming Dec 16, 6:30 PM Men's · Sacred Heart at Georgetown | ",
 "Upcoming Dec 20, 2:00 PM Men's · Sacred Heart at Dartmouth | ",
 "Upcoming Dec 22, 1:00 PM Men's · Sacred Heart at Kentucky | ",
 "Upcoming Jan 1, 2:00 PM Men's · Sacred Heart vs Niagara | ",
 "Upcoming Jan 3, 2:00 PM Men's · Sacred Heart vs Canisius | ",
 "Upcoming Jan 8, 7:00 PM Men's · Sacred Heart at Siena | ",
 "Upcoming Jan 10, 2:00 PM Men's · Sacred Heart vs Manhattan | ",
 "Upcoming Jan 13, 6:00 PM Men's · Sacred Heart vs Mount St. Mary's (Md.) | ",
 "Upcoming Jan 16, 1:00 PM Men's · Sacred Heart at Iona | ",
 "Upcoming Jan 18, 2:00 PM Men's · Sacred Heart vs Quinnipiac | ",
 "Upcoming Jan 22, 7:00 PM Men's · Sacred Heart at Canisius | ",
 "Upcoming Jan 24, 7:00 PM Men's · Sacred Heart vs Marist | ",
 "Upcoming Jan 29, 7:00 PM Men's · Sacred Heart at Rider | ",
 "Upcoming Jan 31, 12:00 PM Men's · Sacred Heart vs Iona | ",
 "Upcoming Feb 5, 7:00 PM Men's · Sacred Heart vs Fairfield | ",
 "Upcoming Feb 7, 2:00 PM Men's · Sacred Heart at Manhattan | ",
 "Upcoming Feb 13, 4:00 PM Men's · Sacred Heart at Mount St. Mary's (Md.) | ",
 "Upcoming Feb 19, 6:00 PM Men's · Sacred Heart vs Saint Peter's | ",
 "Upcoming Feb 21, 12:00 PM Men's · Sacred Heart vs Siena | ",
 "Upcoming Feb 26, 7:00 PM Men's · Sacred Heart at Merrimack | ",
 "Upcoming Feb 28, 2:00 PM Men's · Sacred Heart at Fairfield | ",
 "Upcoming Mar 4 Men's · Sacred Heart at Metro Conference Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 3, 6:00 PM Women's · Sacred Heart at Syracuse | ",
 "Upcoming Nov 6, 7:00 PM Women's · Sacred Heart vs Mercy | ",
 "Upcoming Nov 11, 7:00 PM Women's · Sacred Heart vs Northeastern | ",
 "Upcoming Nov 15, 1:00 PM Women's · Sacred Heart at Stony Brook | ",
 "Upcoming Nov 19, 6:30 PM Women's · Sacred Heart at Michigan State | ",
 "Upcoming Nov 21, 1:00 PM Women's · Sacred Heart at Detroit Mercy | ",
 "Upcoming Nov 24, 2:00 PM Women's · Sacred Heart at New Haven | ",
 "Upcoming Nov 30, 7:00 PM Women's · Sacred Heart vs Holy Cross | ",
 "Upcoming Dec 3, 7:00 PM Women's · Sacred Heart vs Central Connecticut | ",
 "Upcoming Dec 6, 2:00 PM Women's · Sacred Heart at Pittsburgh | ",
 "Upcoming Dec 13, 1:00 PM Women's · Sacred Heart at NJIT | ",
 "Upcoming Dec 19, 2:00 PM Women's · Sacred Heart vs Marist | ",
 "Upcoming Dec 21, 11:30 AM Women's · Sacred Heart vs Saint Peter's | ",
 "Upcoming Jan 1, 6:00 PM Women's · Sacred Heart at Niagara | ",
 "Upcoming Jan 3, 1:00 PM Women's · Sacred Heart at Canisius | ",
 "Upcoming Jan 7, 7:00 PM Women's · Sacred Heart vs Siena | ",
 "Upcoming Jan 9, 6:00 PM Women's · Sacred Heart at Manhattan | ",
 "Upcoming Jan 13, 7:00 PM Women's · Sacred Heart at Mount St. Mary's | ",
 "Upcoming Jan 16, 2:00 PM Women's · Sacred Heart vs Iona | ",
 "Upcoming Jan 18, 2:00 PM Women's · Sacred Heart at Quinnipiac | ",
 "Upcoming Jan 21, 7:00 PM Women's · Sacred Heart vs Canisius | ",
 "Upcoming Jan 23, 7:00 PM Women's · Sacred Heart at Marist | ",
 "Upcoming Jan 28, 6:00 PM Women's · Sacred Heart vs Rider | ",
 "Upcoming Jan 30, 1:00 PM Women's · Sacred Heart at Iona | ",
 "Upcoming Feb 4, 7:00 PM Women's · Sacred Heart at Fairfield | ",
 "Upcoming Feb 6, 1:00 PM Women's · Sacred Heart vs Manhattan | ",
 "Upcoming Feb 13, 2:00 PM Women's · Sacred Heart vs Mount St. Mary's | ",
 "Upcoming Feb 18, 6:00 PM Women's · Sacred Heart at Saint Peter's | ",
 "Upcoming Feb 20, 2:00 PM Women's · Sacred Heart at Siena | ",
 "Upcoming Feb 25, 7:00 PM Women's · Sacred Heart vs Merrimack | ",
 "Upcoming Feb 27, 2:00 PM Women's · Sacred Heart vs Fairfield | ",
 "Upcoming Mar 4 Women's · Sacred Heart at Metro Conference Championship | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 10 Sacred Heart at Bud Whitman Memorial | W, 4-0",
 "Final Oct 10 Sacred Heart at Bud Whitman Memorial | W, 4-1",
 "Final Oct 10 Sacred Heart vs Wilmington | W, 959-705",
 "Final Oct 10 Sacred Heart vs Delaware State | W, 956-872",
 "Final Oct 10 Sacred Heart vs Mount St. Mary's | L, 777-951",
 "Final Oct 11 Sacred Heart vs Felician | L, 807-852",
 "Final Oct 11 Sacred Heart vs FDU | L, 868-882",
 "Final Oct 16 Sacred Heart vs Wright State | W, 1011-882",
 "Final Oct 16 Sacred Heart vs Maryland Eastern Shore | L, 953-1000",
 "Final Oct 16 Sacred Heart vs Valparaiso | W, 1109-1006",
 "Final Oct 16 Sacred Heart vs Arkansas State | L, 914-1101",
 "Final Oct 16 Sacred Heart at Chelsea Gilliam Penguin Classic | L, 3.5-4.5",
 "Final Oct 17 Sacred Heart vs Youngstown State | L, 927-1052",
 "Final Oct 17 Sacred Heart at Chelsea Gilliam Penguin Classic | L, 1-4",
 "Final Oct 17 Sacred Heart vs Jacksonville State | L, 974-1190",
 "Final Oct 17 Sacred Heart vs Western Illinois | W, 1043-804",
 "Final Oct 17 Sacred Heart at Chelsea Gilliam Penguin Classic | L, 3-4",
 "Upcoming Oct 30 Sacred Heart at Destination Florida | ",
 "Upcoming Nov 14 Sacred Heart at Lady Eagles Invitational | ",
 "Upcoming Nov 20 Sacred Heart at Jersey Jamboree | ",
 "Upcoming Jan 29 Sacred Heart at Hammer Saints Invite | ",
 "Upcoming Feb 5 Sacred Heart at Flyer Classic | ",
 "Upcoming Feb 19 Sacred Heart at Big Red Invite | ",
 "Upcoming Mar 5 Sacred Heart at Music City Classic | ",
 "Upcoming Mar 12 Sacred Heart at USBC Collegiate Selects | ",
 "Upcoming Mar 17 Sacred Heart at Conference USA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Sacred Heart at Stony Brook University Cross Country Invitational | 4th of 4",
 "Final Sep 19 Women's · Sacred Heart at Manhattan University Jasper Fall Invitational | 6th of 12",
 "Final Sep 26 Women's · Sacred Heart at 22nd Annual Central Connecticut State University Ted Owen Invitational | 1st of 3",
 "Final Oct 9 Women's · Sacred Heart at 114th Annual New England Cross Country Championships | 7th of 18",
 "Final Oct 18 Women's · Sacred Heart at Vermont Fall Foliage Invitational | 2nd of 3",
 "Today Oct 23, 3:30 PM Women's · Sacred Heart at 21st Annual Central Connecticut State University Mini-Meet | ",
 "Upcoming Oct 31, 11:00 AM Women's · Sacred Heart at The Metro Conference Cross Country Championships | ",
 "Upcoming Nov 13, 11:00 AM Women's · Sacred Heart at NCAA Division I Northeast Regional Cross Country Championships | ",
 "Upcoming Nov 21 Women's · Sacred Heart at NCAA Division I National Cross Country Championships | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Sacred Heart at Stony Brook University Cross Country Invitational | 4th of 4",
 "Final Sep 19 Men's · Sacred Heart at Manhattan University Jasper Fall Invitational | 9th of 12",
 "Final Sep 26 Men's · Sacred Heart at 22nd Annual Central Connecticut State Univ. Ted Owen Invitational | 3rd of 4",
 "Final Oct 9 Men's · Sacred Heart at 114th Annual New England Cross Country Championships | 11th of 18",
 "Final Oct 18 Men's · Sacred Heart at Vermont Fall Foliage Invitational | 1st of 3",
 "Today Oct 23, 4:00 PM Men's · Sacred Heart at 21st Annual Central Connecticut State University Mini-Meet | ",
 "Upcoming Oct 31, 11:00 AM Men's · Sacred Heart at The Metro Conference Cross Country Championships | ",
 "Upcoming Nov 13, 11:00 AM Men's · Sacred Heart at NCAA Division I Northeast Regional Cross Country Championships | ",
 "Upcoming Nov 21 Men's · Sacred Heart at NCAA Division I National Cross Country Championships | "
]);
  const v_equestrian=parse("Equestrian","equestrian");
  assert.deepEqual(v_equestrian.map(line),[
 "Final Sep 26 Sacred Heart vs College of Charleston | W, 5-4",
 "Final Oct 9 Sacred Heart vs Centenary (New Jersey) | L, 4-6",
 "Upcoming Oct 25 Sacred Heart at Dartmouth College | ",
 "Upcoming Oct 25 Sacred Heart vs IHSA Zone II Region IV Show | ",
 "Upcoming Oct 31 Sacred Heart vs Dartmouth College | ",
 "Upcoming Nov 1 Sacred Heart vs IHSA Zone II Region IV Show | ",
 "Upcoming Nov 8 Sacred Heart vs IHSA Zone II Region IV Show | ",
 "Upcoming Feb 7 Sacred Heart at College of Charleston | ",
 "Upcoming Feb 13 Sacred Heart at Centenary (New Jersey) | ",
 "Upcoming Mar 6 Sacred Heart at Sweet Briar College | ",
 "Upcoming Mar 6 Sacred Heart at Lynchburg | ",
 "Upcoming Mar 7 Sacred Heart vs IHSA Zone II Region IV Show | ",
 "Upcoming Mar 14 Sacred Heart vs IHSA Zone II Region IV Show | ",
 "Upcoming Mar 25 Sacred Heart at ECAC SD Championship | ",
 "Upcoming Apr 4 Sacred Heart at IHSA Regional Championship | ",
 "Upcoming Apr 10 Sacred Heart at IHSA Zone Championship | ",
 "Upcoming Apr 15 Sacred Heart at NCEA National Championship | ",
 "Upcoming May 7 Sacred Heart at IHSA National Championship | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[
 "Upcoming Oct 24, 9:00 AM Women's · Sacred Heart at Nikki Franke Classic | ",
 "Upcoming Nov 1, 9:00 AM Women's · Sacred Heart at The Big One | ",
 "Upcoming Nov 15, 11:00 AM Women's · Sacred Heart at NFC Women's Meet | ",
 "Upcoming Nov 22, 9:00 AM Women's · Sacred Heart at Vassar Invitational | ",
 "Upcoming Dec 6, 10:00 AM Women's · Sacred Heart at The Tradition Meet | ",
 "Upcoming Jan 16, 10:00 AM Women's · Sacred Heart at UPenn Invitational | ",
 "Upcoming Jan 23, 10:00 AM Women's · Sacred Heart at NFC Championships | ",
 "Upcoming Feb 17, 4:00 PM Women's · Sacred Heart at NYC Duel | ",
 "Upcoming Feb 28, 9:00 AM Women's · Sacred Heart at New England Intercollegiate Fencing Championship | ",
 "Upcoming Mar 14, 9:00 AM Women's · Sacred Heart at NCAA Regionals | ",
 "Upcoming Mar 25 Women's · Sacred Heart at NCAA Championships | "
]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[
 "Upcoming Oct 24, 9:00 AM Men's · Sacred Heart at Nikki Franke Classic | ",
 "Upcoming Nov 1, 9:00 AM Men's · Sacred Heart at The Big One | ",
 "Upcoming Nov 22, 9:00 AM Men's · Sacred Heart at Vassar Invitational | ",
 "Upcoming Dec 6, 10:00 AM Men's · Sacred Heart at The Tradition Meet | ",
 "Upcoming Jan 16, 10:00 AM Men's · Sacred Heart at UPenn Invitational | ",
 "Upcoming Jan 23, 10:00 AM Men's · Sacred Heart at NFC Championships | ",
 "Upcoming Feb 17, 4:00 PM Men's · Sacred Heart at NYC Duel | ",
 "Upcoming Feb 28, 9:00 AM Men's · Sacred Heart at New England Intercollegiate Fencing Championship | ",
 "Upcoming Mar 14, 9:00 AM Men's · Sacred Heart at NCAA Regionals | ",
 "Upcoming Mar 25 Men's · Sacred Heart at NCAA Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 29 Sacred Heart vs Ball State | L, 2-3",
 "Final Aug 30 Sacred Heart at Bucknell | L, 1-2",
 "Final Sep 4 Sacred Heart at Yale | L, 0-3",
 "Final Sep 11 Sacred Heart vs Providence College | L, 1-4",
 "Final Sep 13 Sacred Heart at Dartmouth College | W, 2-1",
 "Final Sep 18 Sacred Heart vs Quinnipiac | L, 1-2",
 "Final Sep 20 Sacred Heart at Bryant | L, 0-4",
 "Final Sep 25 Sacred Heart at Stonehill College | W, 2-1",
 "Final Sep 27 Sacred Heart at Merrimack College | W, 3-0",
 "Final Oct 2 Sacred Heart vs New Haven | W, 5-2",
 "Final Oct 4 Sacred Heart vs UC Davis | W, 3-2",
 "Final Oct 9 Sacred Heart at Wagner College | L, 0-2",
 "Final Oct 11 Sacred Heart at Massachusetts Lowell | L, 2-3",
 "Final Oct 16 Sacred Heart vs Hofstra | W, 5-1",
 "Final Oct 18 Sacred Heart at Rider | W, 3-2",
 "Today Oct 23, 11:00 AM Sacred Heart vs LIU | ",
 "Upcoming Oct 30, 12:00 PM Sacred Heart vs Mercyhurst | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Sacred Heart at Monmouth | L, 24-31",
 "Final Sep 12 Sacred Heart at Massachusetts | L, 10-37",
 "Final Sep 19 Sacred Heart at Elon | L, 21-24",
 "Final Sep 26 Sacred Heart vs New Hampshire | W, 20-13",
 "Final Oct 3 Sacred Heart at Maine | W, 24-16",
 "Final Oct 10 Sacred Heart vs Stonehill College | L, 7-28",
 "Final Oct 17 Sacred Heart vs Hampton | W, 35-21",
 "Upcoming Oct 31, 12:00 PM Sacred Heart at Stony Brook | ",
 "Upcoming Nov 7, 12:00 PM Sacred Heart vs Towson | ",
 "Upcoming Nov 14, 12:00 PM Sacred Heart vs Bryant | ",
 "Upcoming Nov 21, 12:00 PM Sacred Heart at Merrimack College | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Sacred Heart at Charge at Quail Valley | 5th of 9",
 "Final Sep 21 Women's · Sacred Heart at Red Bandanna Invitational | 8th of 15",
 "Final Sep 28 Women's · Sacred Heart at SHU Fall Classic | 1st of 8",
 "Final Oct 3 Women's · Sacred Heart at Yale Invitational | 6th of 8",
 "Upcoming Oct 24 Women's · Sacred Heart at Lady Blue Hen Invite | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · Sacred Heart at Red Bandanna Invitational | 2nd of 11",
 "Final Sep 19 Men's · Sacred Heart at Ryan Lee Intercollegiate | 7th of 18",
 "Final Sep 27 Men's · Sacred Heart at UConn Invitational | 11th of 14",
 "Final Oct 5 Men's · Sacred Heart at Testudo Cup | 11th of 14",
 "Final Oct 12 Men's · Sacred Heart at SHU Fall Classic | 1st of 11"
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Sacred Heart vs Merrimack (Exhibition) | L, 1-3",
 "Final Oct 4 Men's · Sacred Heart vs Carleton (Exhibition) | W, 3-0",
 "Final Oct 9 Men's · Sacred Heart vs Bowling Green | L, 2-3",
 "Final Oct 10 Men's · Sacred Heart vs Penn State | W, 6-3",
 "Final Oct 16 Men's · Sacred Heart vs Ohio State | W, 5-3",
 "Final Oct 17 Men's · Sacred Heart vs Ohio State | L, 1-5",
 "Today Oct 23, 7:00 PM Men's · Sacred Heart at Holy Cross | ",
 "Upcoming Oct 24, 5:00 PM Men's · Sacred Heart vs Holy Cross | ",
 "Upcoming Oct 30, 7:00 PM Men's · Sacred Heart at Cornell | ",
 "Upcoming Oct 31, 7:00 PM Men's · Sacred Heart at Cornell | ",
 "Upcoming Nov 6, 7:00 PM Men's · Sacred Heart vs Canisius | ",
 "Upcoming Nov 7, 6:00 PM Men's · Sacred Heart vs Canisius | ",
 "Upcoming Nov 13, 7:00 PM Men's · Sacred Heart at Army | ",
 "Upcoming Nov 14, 7:00 PM Men's · Sacred Heart at Army | ",
 "Upcoming Nov 20, 7:00 PM Men's · Sacred Heart vs Robert Morris | ",
 "Upcoming Nov 21, 5:00 PM Men's · Sacred Heart vs Robert Morris | ",
 "Upcoming Dec 1, 7:00 PM Men's · Sacred Heart at Brown | ",
 "Upcoming Dec 4, 7:30 PM Men's · Sacred Heart at LIU | ",
 "Upcoming Dec 5, 5:00 PM Men's · Sacred Heart vs LIU | ",
 "Upcoming Dec 29, 4:00 PM Men's · Sacred Heart vs Yale | ",
 "Upcoming Jan 2, 5:00 PM Men's · Sacred Heart at Canisius | ",
 "Upcoming Jan 3, 3:00 PM Men's · Sacred Heart at Canisius | ",
 "Upcoming Jan 8, 7:00 PM Men's · Sacred Heart vs Air Force | ",
 "Upcoming Jan 9, 5:00 PM Men's · Sacred Heart vs Air Force | ",
 "Upcoming Jan 15, 7:00 PM Men's · Sacred Heart at Bentley | ",
 "Upcoming Jan 16, 6:00 PM Men's · Sacred Heart at Bentley | ",
 "Upcoming Jan 22, 7:00 PM Men's · Sacred Heart at Robert Morris | ",
 "Upcoming Jan 23, 4:00 PM Men's · Sacred Heart at Robert Morris | ",
 "Upcoming Jan 29 Men's · Sacred Heart at CT Ice Tournament | ",
 "Upcoming Jan 30 Men's · Sacred Heart at CT Ice Tournament | ",
 "Upcoming Feb 5, 7:00 PM Men's · Sacred Heart vs RIT | ",
 "Upcoming Feb 6, 5:00 PM Men's · Sacred Heart vs RIT | ",
 "Upcoming Feb 12, 7:00 PM Men's · Sacred Heart vs Army | ",
 "Upcoming Feb 13, 5:00 PM Men's · Sacred Heart vs Army | ",
 "Upcoming Feb 19, 7:00 PM Men's · Sacred Heart at Niagara | ",
 "Upcoming Feb 20, 5:00 PM Men's · Sacred Heart at Niagara | ",
 "Upcoming Feb 26, 7:00 PM Men's · Sacred Heart vs Holy Cross | ",
 "Upcoming Feb 27, 7:00 PM Men's · Sacred Heart at Holy Cross | ",
 "Upcoming Mar 2 Men's · Sacred Heart at AHA First Round | ",
 "Upcoming Mar 5 Men's · Sacred Heart at AHA Tournament | ",
 "Upcoming Mar 12 Men's · Sacred Heart at AHA Tournament | ",
 "Upcoming Mar 20 Men's · Sacred Heart at AHA Championship Game | ",
 "Upcoming Mar 23 Men's · Sacred Heart at NCAA Regionals | ",
 "Upcoming Apr 8 Men's · Sacred Heart at NCAA Tournament | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 25 Women's · Sacred Heart vs Providence College | L, 2-4",
 "Final Sep 26 Women's · Sacred Heart at Providence College | L, 0-3",
 "Final Oct 9 Women's · Sacred Heart at Assumption | L, 0-2",
 "Final Oct 10 Women's · Sacred Heart at Assumption | L, 2-3",
 "Final Oct 16 Women's · Sacred Heart vs LIU | W, 6-1",
 "Final Oct 17 Women's · Sacred Heart at LIU | L, 0-2",
 "Upcoming Oct 30, 7:00 PM Women's · Sacred Heart at Franklin Pierce | ",
 "Upcoming Oct 31, 4:00 PM Women's · Sacred Heart at Franklin Pierce | ",
 "Upcoming Nov 6, 5:00 PM Women's · Sacred Heart at Stonehill College | ",
 "Upcoming Nov 7, 2:00 PM Women's · Sacred Heart at Stonehill College | ",
 "Upcoming Nov 10, 11:00 AM Women's · Sacred Heart vs Quinnipiac | ",
 "Upcoming Nov 13, 6:00 PM Women's · Sacred Heart vs Saint Anselm College | ",
 "Upcoming Nov 14, 6:00 PM Women's · Sacred Heart vs Saint Anselm College | ",
 "Upcoming Nov 20, 7:00 PM Women's · Sacred Heart at Saint Michael's College | ",
 "Upcoming Nov 21, 3:30 PM Women's · Sacred Heart at Saint Michael's College | ",
 "Upcoming Nov 27, 6:30 PM Women's · Sacred Heart vs Connecticut | ",
 "Upcoming Nov 28 Women's · Sacred Heart at Nutmeg Classic | ",
 "Upcoming Dec 4, 1:00 PM Women's · Sacred Heart at Post | ",
 "Upcoming Dec 5, 1:00 PM Women's · Sacred Heart vs Post | ",
 "Upcoming Jan 1, 3:00 PM Women's · Sacred Heart vs Brown | ",
 "Upcoming Jan 8, 2:00 PM Women's · Sacred Heart vs LIU | ",
 "Upcoming Jan 9, 7:30 PM Women's · Sacred Heart at LIU | ",
 "Upcoming Jan 15, 7:00 PM Women's · Sacred Heart vs Assumption | ",
 "Upcoming Jan 16, 2:00 PM Women's · Sacred Heart vs Assumption | ",
 "Upcoming Jan 22, 7:00 PM Women's · Sacred Heart vs Franklin Pierce | ",
 "Upcoming Jan 23, 2:00 PM Women's · Sacred Heart vs Franklin Pierce | ",
 "Upcoming Jan 29, 7:00 PM Women's · Sacred Heart vs Stonehill College | ",
 "Upcoming Jan 30, 2:00 PM Women's · Sacred Heart vs Stonehill College | ",
 "Upcoming Feb 5, 4:00 PM Women's · Sacred Heart at Saint Anselm College | ",
 "Upcoming Feb 6, 1:00 PM Women's · Sacred Heart at Saint Anselm College | ",
 "Upcoming Feb 12, 2:00 PM Women's · Sacred Heart vs Saint Michael's College | ",
 "Upcoming Feb 13, 1:00 PM Women's · Sacred Heart vs Saint Michael's College | ",
 "Upcoming Feb 19, 1:30 PM Women's · Sacred Heart at Post | ",
 "Upcoming Feb 20, 2:00 PM Women's · Sacred Heart vs Post | ",
 "Upcoming Feb 26 Women's · Sacred Heart at NEWHA Tournament | ",
 "Upcoming Mar 3, 7:00 PM Women's · Sacred Heart at NEWHA Tournament Semi-Finals | ",
 "Upcoming Mar 6 Women's · Sacred Heart at NEWHA Tournament Championship Game | ",
 "Upcoming Mar 11 Women's · Sacred Heart at NCAA Tournament | ",
 "Upcoming Mar 19 Women's · Sacred Heart at NCAA Tournament | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Women's · Sacred Heart at Head of the Schuylkill | "
]);
  const v_womenslightweightrowing=parse("Rowing","womens-lightweight-rowing");
  assert.deepEqual(v_womenslightweightrowing.map(line),[
 "Upcoming Oct 24 Women's Lightweight · Sacred Heart at Head of the Schuylkill | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Sacred Heart vs Central Connecticut State | W, 4-1",
 "Final Aug 16 Women's · Sacred Heart at Vermont | W, 2-0",
 "Final Aug 23 Women's · Sacred Heart at Maine | W, 2-1",
 "Final Aug 27 Women's · Sacred Heart vs New Haven | W, 1-0",
 "Final Aug 30 Women's · Sacred Heart vs Hofstra | W, 2-0",
 "Final Sep 5 Women's · Sacred Heart at Canisius | W, 2-0",
 "Final Sep 12 Women's · Sacred Heart vs Marist | L, 2-3",
 "Final Sep 20 Women's · Sacred Heart at Yale | L, 1-2",
 "Final Sep 23 Women's · Sacred Heart vs Saint Peter's | W, 2-0",
 "Final Oct 3 Women's · Sacred Heart vs Siena | L, 2-3",
 "Final Oct 7 Women's · Sacred Heart at Quinnipiac | L, 0-1",
 "Final Oct 10 Women's · Sacred Heart vs Niagara | L, 0-1",
 "Final Oct 14 Women's · Sacred Heart at Merrimack | W, 2-1",
 "Final Oct 17 Women's · Sacred Heart at Manhattan | T, 0-0",
 "Final Oct 21 Women's · Sacred Heart at Rider | W, 4-1",
 "Upcoming Oct 24, 12:00 PM Women's · Sacred Heart vs Mount St. Mary's (Md.) | ",
 "Upcoming Oct 31, 12:00 PM Women's · Sacred Heart at Iona | ",
 "Upcoming Nov 4, 7:00 PM Women's · Sacred Heart vs Fairfield | ",
 "Upcoming Nov 7 Women's · Sacred Heart at Metro Conference Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Sacred Heart at Providence | L, 1-4",
 "Final Aug 24 Men's · Sacred Heart vs Stony Brook | T, 1-1",
 "Final Aug 28 Men's · Sacred Heart at Rutgers | L, 1-4",
 "Final Sep 1 Men's · Sacred Heart vs LIU | W, 2-0",
 "Final Sep 5 Men's · Sacred Heart vs Vermont | L, 0-2",
 "Final Sep 9 Men's · Sacred Heart at UConn | T, 1-1",
 "Final Sep 15 Men's · Sacred Heart at FDU | W, 2-1",
 "Final Sep 19 Men's · Sacred Heart at Merrimack | T, 1-1",
 "Final Sep 30 Men's · Sacred Heart vs Marist | L, 0-1",
 "Final Oct 6 Men's · Sacred Heart at Seton Hall | T, 1-1",
 "Final Oct 10 Men's · Sacred Heart at Iona | T, 0-0",
 "Final Oct 14 Men's · Sacred Heart vs Quinnipiac | T, 1-1",
 "Final Oct 17 Men's · Sacred Heart at Niagara | L, 2-3",
 "Final Oct 21 Men's · Sacred Heart vs Saint Peter's | W, 2-1",
 "Upcoming Oct 24, 3:30 PM Men's · Sacred Heart vs Siena | ",
 "Upcoming Oct 28, 6:00 PM Men's · Sacred Heart at Manhattan | ",
 "Upcoming Oct 31, 12:00 PM Men's · Sacred Heart vs Rider | ",
 "Upcoming Nov 4, 6:00 PM Men's · Sacred Heart at Fairfield | ",
 "Upcoming Nov 7 Men's · Sacred Heart at Metro Championship First Round | ",
 "Upcoming Nov 11 Men's · Sacred Heart at Metro Championship Semifinal | ",
 "Upcoming Nov 14 Men's · Sacred Heart at Metro Championship Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Sacred Heart at Fairfield Invitational (Diving) | Completed",
 "Final Oct 3 Women's · Sacred Heart at Fairfield Invitational (Swimming) | Completed",
 "Final Oct 16 Women's · Sacred Heart vs Wagner College (Diving) | W, 32-0",
 "Final Oct 16 Women's · Sacred Heart at Iona (Diving) | W, 32-4",
 "Final Oct 17 Women's · Sacred Heart vs Wagner College | W, 184-51",
 "Final Oct 17 Women's · Sacred Heart at Iona | W, 133-108",
 "Upcoming Oct 31, 12:30 PM Women's · Sacred Heart vs Stonehill College | ",
 "Upcoming Nov 6, 4:00 PM Women's · Sacred Heart vs Siena College | ",
 "Upcoming Nov 6, 4:00 PM Women's · Sacred Heart vs Rider | ",
 "Upcoming Nov 21, 12:00 PM Women's · Sacred Heart at Stony Brook | ",
 "Upcoming Dec 4 Women's · Sacred Heart at Gompei Invitational (Swimming) | ",
 "Upcoming Dec 4 Women's · Sacred Heart at ECAC Winter Championships (Diving) | ",
 "Upcoming Dec 12 Women's · Sacred Heart at CSCAA National Open Water Championships | ",
 "Upcoming Jan 15, 12:00 PM Women's · Sacred Heart at Bridgeport | ",
 "Upcoming Jan 15, 12:00 PM Women's · Sacred Heart vs LIU | ",
 "Upcoming Jan 22, 5:00 PM Women's · Sacred Heart at Central Connecticut State | ",
 "Upcoming Jan 30, 12:30 PM Women's · Sacred Heart vs Merrimack College | ",
 "Upcoming Feb 17 Women's · Sacred Heart at Metro Championships | ",
 "Upcoming Mar 8 Women's · Sacred Heart at NCAA Zone Qualifier (Diving) | ",
 "Upcoming Mar 9 Women's · Sacred Heart at NCAA Zone A Qualifier (Diving) | ",
 "Upcoming Mar 11 Women's · Sacred Heart at CSCAA National Invitational Championship | ",
 "Upcoming Mar 17, 10:00 AM Women's · Sacred Heart at NCAA Tournament | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Sacred Heart at Quinnipiac University Duals | Completed",
 "Final Sep 25 Women's · Sacred Heart at Army Invitational | Completed",
 "Final Oct 2 Women's · Sacred Heart at Metro Masters | Completed",
 "Final Oct 8 Women's · Sacred Heart at ITA Regional | Completed",
 "Upcoming Oct 24 Women's · Sacred Heart at Rhode Island | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Sacred Heart at Fairfield Invitational | Completed",
 "Final Oct 2 Men's · Sacred Heart at Army Invite | Completed",
 "Final Oct 2 Men's · Sacred Heart at Metro Masters | Completed",
 "Final Oct 8 Men's · Sacred Heart at ITA Regional Championship | Completed",
 "Upcoming Oct 30 Men's · Sacred Heart at Army Shootout | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Women's · Sacred Heart at Army | L, 1-3",
 "Final Aug 29 Women's · Sacred Heart vs UAlbany | W, 3-0",
 "Final Aug 30 Women's · Sacred Heart vs Iowa | L, 0-3",
 "Final Sep 4 Women's · Sacred Heart vs Le Moyne | W, 3-0",
 "Final Sep 5 Women's · Sacred Heart vs Binghamton | L, 2-3",
 "Final Sep 5 Women's · Sacred Heart vs CCSU | W, 3-1",
 "Final Sep 10 Women's · Sacred Heart vs Idaho | W, 3-2",
 "Final Sep 11 Women's · Sacred Heart vs North Dakota | L, 2-3",
 "Final Sep 11 Women's · Sacred Heart at Cal Baptist | W, 3-1",
 "Final Sep 15 Women's · Sacred Heart vs Fairleigh Dickinson | W, 3-0",
 "Final Sep 19 Women's · Sacred Heart vs Providence | W, 3-2",
 "Final Sep 20 Women's · Sacred Heart at Harvard | L, 0-3",
 "Final Sep 25 Women's · Sacred Heart at Canisius | W, 3-0",
 "Final Sep 26 Women's · Sacred Heart at Niagara | W, 3-1",
 "Final Sep 29 Women's · Sacred Heart vs Fairfield | L, 2-3",
 "Final Oct 2 Women's · Sacred Heart vs Merrimack | W, 3-0",
 "Final Oct 3 Women's · Sacred Heart vs Quinnipiac | L, 0-3",
 "Final Oct 9 Women's · Sacred Heart vs Rider | W, 3-2",
 "Final Oct 10 Women's · Sacred Heart vs Saint Peter's | W, 3-2",
 "Final Oct 16 Women's · Sacred Heart at Siena | L, 2-3",
 "Final Oct 17 Women's · Sacred Heart at Marist | L, 1-3",
 "Today Oct 23, 7:00 PM Women's · Sacred Heart vs Iona | ",
 "Upcoming Oct 24, 6:00 PM Women's · Sacred Heart vs Manhattan | ",
 "Upcoming Oct 27, 6:00 PM Women's · Sacred Heart at Fairfield | ",
 "Upcoming Oct 30, 7:00 PM Women's · Sacred Heart at Quinnipiac | ",
 "Upcoming Oct 31, 2:00 PM Women's · Sacred Heart at Merrimack | ",
 "Upcoming Nov 6, 6:00 PM Women's · Sacred Heart at Saint Peter's | ",
 "Upcoming Nov 7, 2:00 PM Women's · Sacred Heart at Rider | ",
 "Upcoming Nov 13, 7:00 PM Women's · Sacred Heart vs Niagara | ",
 "Upcoming Nov 14, 6:00 PM Women's · Sacred Heart vs Canisius | ",
 "Upcoming Nov 17 Women's · Sacred Heart at Metro Championship First Round | ",
 "Upcoming Nov 21 Women's · Sacred Heart at Metro Championship Semifinal | ",
 "Upcoming Nov 22 Women's · Sacred Heart at Metro Championship Final | ",
 "Upcoming Dec 3 Women's · Sacred Heart at NCAA Championship First & Second Rounds | ",
 "Upcoming Dec 10 Women's · Sacred Heart at NCAA Championship Regionals | ",
 "Upcoming Dec 17 Women's · Sacred Heart at NCAA Championship Finals | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Oct 31, 2:00 PM Men's · Sacred Heart at Hofstra | ",
 "Upcoming Nov 7 Men's · Sacred Heart at Journeymen Duals | ",
 "Upcoming Nov 8 Men's · Sacred Heart at Journeymen Classic | ",
 "Upcoming Nov 14, 11:00 AM Men's · Sacred Heart at Davidson College | ",
 "Upcoming Nov 22, 9:00 AM Men's · Sacred Heart at Big Red Invite | ",
 "Upcoming Nov 22, 5:00 PM Men's · Sacred Heart vs Mercyhurst | ",
 "Upcoming Dec 4 Men's · Sacred Heart at Cliff Keen Invitational | ",
 "Upcoming Dec 20, 2:00 PM Men's · Sacred Heart vs Virginia Military Institute | ",
 "Upcoming Dec 20, 10:00 AM Men's · Sacred Heart vs Bloomsburg | ",
 "Upcoming Jan 7, 2:30 PM Men's · Sacred Heart vs Bridgeport | ",
 "Upcoming Jan 16, 1:00 PM Men's · Sacred Heart at Drexel | ",
 "Upcoming Jan 17, 2:00 PM Men's · Sacred Heart at Clarion | ",
 "Upcoming Jan 24, 12:30 PM Men's · Sacred Heart at Franklin and Marshall College | ",
 "Upcoming Jan 24, 11:00 AM Men's · Sacred Heart vs Gardner-Webb | ",
 "Upcoming Jan 30 Men's · Sacred Heart at Presbyterian College | ",
 "Upcoming Feb 6, 5:30 PM Men's · Sacred Heart at Binghamton | ",
 "Upcoming Feb 14, 3:00 PM Men's · Sacred Heart vs Morgan State | ",
 "Upcoming Feb 20, 4:30 PM Men's · Sacred Heart vs Brown | ",
 "Upcoming Feb 21, 6:00 PM Men's · Sacred Heart vs LIU | ",
 "Upcoming Mar 5 Men's · Sacred Heart at EIWA Championship | ",
 "Upcoming Mar 18 Men's · Sacred Heart at NCAA Championship | "
]);
  const v_wwrest=parse("Wrestling","wwrest");
  assert.deepEqual(v_wwrest.map(line),[
 "Upcoming Nov 1, 9:00 AM Women's · Sacred Heart at ESU Open | ",
 "Upcoming Nov 8 Women's · Sacred Heart at Ursinus College | ",
 "Upcoming Nov 8 Women's · Sacred Heart vs Frostburg State | ",
 "Upcoming Nov 14, 10:00 AM Women's · Sacred Heart at Adrian Dual Tournament | ",
 "Upcoming Nov 15, 10:00 AM Women's · Sacred Heart at Adrian Invitational | ",
 "Upcoming Nov 21, 10:00 AM Women's · Sacred Heart at UB Open | ",
 "Upcoming Nov 22, 9:00 AM Women's · Sacred Heart at ESU Warrior Duals | ",
 "Upcoming Dec 5, 3:00 PM Women's · Sacred Heart at Bridgeport | ",
 "Upcoming Dec 13, 10:00 AM Women's · Sacred Heart at NCC Open | ",
 "Upcoming Jan 8 Women's · Sacred Heart at NWCA National Duals | ",
 "Upcoming Jan 17, 12:00 PM Women's · Sacred Heart vs Felician | ",
 "Upcoming Jan 17, 2:00 PM Women's · Sacred Heart vs Bridgeport | ",
 "Upcoming Jan 23, 1:00 PM Women's · Sacred Heart vs Mercyhurst | ",
 "Upcoming Jan 23, 11:00 AM Women's · Sacred Heart vs Delaware State | ",
 "Upcoming Jan 31, 5:00 PM Women's · Sacred Heart vs New England College | ",
 "Upcoming Feb 5, 6:30 PM Women's · Sacred Heart at Western New England | ",
 "Upcoming Feb 20 Women's · Sacred Heart at NCAA Region 1 Championship | ",
 "Upcoming Mar 5 Women's · Sacred Heart at NCAA National Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_equestrian,"Equestrian equestrian");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenslightweightrowing,"Rowing womens-lightweight-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
  ownRecapsOnly(v_wwrest,"Wrestling wwrest");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Sacred Heart module checks passed");
