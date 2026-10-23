import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {bryantSchool} from '../src/schools/bryant.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='bryant');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,bryantHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/bryant-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit bryantbulldogs.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['bryant'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',bryantSchool.scheduleUrls],['roster',bryantSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('bryant|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'bryantbulldogs.com',`${key} must stay on bryantbulldogs.com`);
  }
}
const parity={"Baseball":{"schedule":["https://bryantbulldogs.com/sports/baseball/schedule"],"roster":["https://bryantbulldogs.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://bryantbulldogs.com/sports/mens-basketball/schedule","https://bryantbulldogs.com/sports/womens-basketball/schedule"],"roster":["https://bryantbulldogs.com/sports/mens-basketball/roster","https://bryantbulldogs.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://bryantbulldogs.com/sports/womens-bowling/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://bryantbulldogs.com/sports/cross-country/schedule"],"roster":["https://bryantbulldogs.com/sports/cross-country/roster"],"combined":false},"Field Hockey":{"schedule":["https://bryantbulldogs.com/sports/field-hockey/schedule"],"roster":["https://bryantbulldogs.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://bryantbulldogs.com/sports/football/schedule"],"roster":["https://bryantbulldogs.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://bryantbulldogs.com/sports/womens-golf/schedule","https://bryantbulldogs.com/sports/mens-golf/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-golf/roster","https://bryantbulldogs.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://bryantbulldogs.com/sports/womens-lacrosse/schedule","https://bryantbulldogs.com/sports/mens-lacrosse/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-lacrosse/roster","https://bryantbulldogs.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://bryantbulldogs.com/sports/womens-rowing/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://bryantbulldogs.com/sports/womens-soccer/schedule","https://bryantbulldogs.com/sports/mens-soccer/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-soccer/roster","https://bryantbulldogs.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://bryantbulldogs.com/sports/softball/schedule"],"roster":["https://bryantbulldogs.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://bryantbulldogs.com/sports/womens-swimming-and-diving/schedule","https://bryantbulldogs.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-swimming-and-diving/roster","https://bryantbulldogs.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://bryantbulldogs.com/sports/womens-tennis/schedule","https://bryantbulldogs.com/sports/mens-tennis/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-tennis/roster","https://bryantbulldogs.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://bryantbulldogs.com/sports/track-and-field/schedule"],"roster":["https://bryantbulldogs.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://bryantbulldogs.com/sports/womens-volleyball/schedule"],"roster":["https://bryantbulldogs.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'bryant|"+sport+"':"),`${sport} routes must live in the Bryant module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://bryantbulldogs.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.bryantHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=bryant)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Feb 19 Bryant at Davidson College | ",
 "Upcoming Feb 20 Bryant at Davidson College | ",
 "Upcoming Feb 21 Bryant at Davidson College | ",
 "Upcoming Feb 23, 2:00 PM Bryant vs Merrimack College | ",
 "Upcoming Feb 26 Bryant at Liberty | ",
 "Upcoming Feb 27 Bryant at Liberty | ",
 "Upcoming Feb 28 Bryant at Liberty | ",
 "Upcoming Mar 2 Bryant at Northeastern | ",
 "Upcoming Mar 5 Bryant at Ohio | ",
 "Upcoming Mar 6 Bryant at Ohio | ",
 "Upcoming Mar 7 Bryant at Ohio | ",
 "Upcoming Mar 9, 2:00 PM Bryant vs Stonehill College | ",
 "Upcoming Mar 12 Bryant at Vanderbilt | ",
 "Upcoming Mar 13 Bryant at Vanderbilt | ",
 "Upcoming Mar 14 Bryant at Vanderbilt | ",
 "Upcoming Mar 16, 3:00 PM Bryant vs Holy Cross | ",
 "Upcoming Mar 20, 12:00 PM Bryant vs Brown (Game 1) | ",
 "Upcoming Mar 20, 3:00 PM Bryant vs Brown (Game 2) | ",
 "Upcoming Mar 21 Bryant at Brown | ",
 "Upcoming Mar 23 Bryant at Merrimack College | ",
 "Upcoming Mar 26, 3:00 PM Bryant vs Maine | ",
 "Upcoming Mar 27, 1:00 PM Bryant vs Maine | ",
 "Upcoming Mar 28, 1:00 PM Bryant vs Maine | ",
 "Upcoming Mar 30, 3:00 PM Bryant vs Rhode Island | ",
 "Upcoming Apr 2 Bryant at UMBC | ",
 "Upcoming Apr 3 Bryant at UMBC | ",
 "Upcoming Apr 4 Bryant at UMBC | ",
 "Upcoming Apr 7, 3:00 PM Bryant at Fairfield | ",
 "Upcoming Apr 9, 3:00 PM Bryant vs Massachusetts Lowell | ",
 "Upcoming Apr 10, 1:00 PM Bryant vs Massachusetts Lowell | ",
 "Upcoming Apr 11, 1:00 PM Bryant vs Massachusetts Lowell | ",
 "Upcoming Apr 13 Bryant at Connecticut | ",
 "Upcoming Apr 16 Bryant at University at Albany | ",
 "Upcoming Apr 17 Bryant at University at Albany | ",
 "Upcoming Apr 18 Bryant at University at Albany | ",
 "Upcoming Apr 20 Bryant at Rhode Island | ",
 "Upcoming Apr 23, 3:00 PM Bryant vs UMBC | ",
 "Upcoming Apr 24, 1:00 PM Bryant vs UMBC | ",
 "Upcoming Apr 25, 1:00 PM Bryant vs UMBC | ",
 "Upcoming Apr 27, 3:00 PM Bryant vs Merrimack College | ",
 "Upcoming Apr 30 Bryant at New Jersey Institute of Technology | ",
 "Upcoming May 1 Bryant at New Jersey Institute of Technology | ",
 "Upcoming May 2 Bryant at New Jersey Institute of Technology | ",
 "Upcoming May 5 Bryant at Holy Cross | ",
 "Upcoming May 8 Bryant at Yale (Game 1) | ",
 "Upcoming May 8 Bryant at Yale (Game 2) | ",
 "Upcoming May 11 Bryant at Stonehill College | ",
 "Upcoming May 14, 3:00 PM Bryant vs Binghamton | ",
 "Upcoming May 15, 1:00 PM Bryant vs Binghamton | ",
 "Upcoming May 16, 1:00 PM Bryant vs Binghamton | ",
 "Upcoming May 20 Bryant at Maine | ",
 "Upcoming May 21 Bryant at Maine | ",
 "Upcoming May 22 Bryant at Maine | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 8:00 PM Men's · Bryant vs Siena | ",
 "Upcoming Nov 5, 7:00 PM Men's · Bryant at Quinnipiac | ",
 "Upcoming Nov 8, 1:00 PM Men's · Bryant vs Fairfield | ",
 "Upcoming Nov 10, 7:00 PM Men's · Bryant at Providence College | ",
 "Upcoming Nov 13, 6:00 PM Men's · Bryant at Rutgers | ",
 "Upcoming Nov 17, 7:00 PM Men's · Bryant at Massachusetts | ",
 "Upcoming Nov 20, 6:00 PM Men's · Bryant vs Worcester State | ",
 "Upcoming Nov 24, 7:00 PM Men's · Bryant at Marist | ",
 "Upcoming Nov 29, 4:00 PM Men's · Bryant vs Iona | ",
 "Upcoming Dec 1, 6:00 PM Men's · Bryant vs Vassar College | ",
 "Upcoming Dec 4, 6:00 PM Men's · Bryant vs Brown | ",
 "Upcoming Dec 8, 7:30 PM Men's · Bryant at Kentucky | ",
 "Upcoming Dec 10, 7:00 PM Men's · Bryant at Fordham | ",
 "Upcoming Dec 20, 1:00 PM Men's · Bryant vs Delaware | ",
 "Upcoming Dec 22, 7:00 PM Men's · Bryant at George Mason | ",
 "Upcoming Dec 29, 2:00 PM Men's · Bryant vs Harvard | ",
 "Upcoming Jan 2, 4:00 PM Men's · Bryant vs Maine | ",
 "Upcoming Jan 7 Men's · Bryant at University at Albany | ",
 "Upcoming Jan 9, 2:00 PM Men's · Bryant at Massachusetts Lowell | ",
 "Upcoming Jan 14, 6:00 PM Men's · Bryant vs UMBC | ",
 "Upcoming Jan 18, 2:00 PM Men's · Bryant at Vermont | ",
 "Upcoming Jan 21, 6:00 PM Men's · Bryant vs New Jersey Institute of Technology | ",
 "Upcoming Jan 28, 6:00 PM Men's · Bryant at New Hampshire | ",
 "Upcoming Jan 30, 4:00 PM Men's · Bryant vs Binghamton | ",
 "Upcoming Feb 4, 6:00 PM Men's · Bryant at UMBC | ",
 "Upcoming Feb 6, 4:00 PM Men's · Bryant vs Vermont | ",
 "Upcoming Feb 11, 6:00 PM Men's · Bryant vs University at Albany | ",
 "Upcoming Feb 17, 6:00 PM Men's · Bryant at Maine | ",
 "Upcoming Feb 20, 2:00 PM Men's · Bryant at Binghamton | ",
 "Upcoming Feb 25, 6:00 PM Men's · Bryant vs Massachusetts Lowell | ",
 "Upcoming Feb 27, 4:00 PM Men's · Bryant at New Jersey Institute of Technology | ",
 "Upcoming Mar 2, 6:00 PM Men's · Bryant vs New Hampshire | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 5:00 PM Women's · Bryant vs MIT | ",
 "Upcoming Nov 5, 6:00 PM Women's · Bryant vs Marist | ",
 "Upcoming Nov 8, 2:00 PM Women's · Bryant at Manhattan | ",
 "Upcoming Nov 11, 7:00 PM Women's · Bryant at Providence College | ",
 "Upcoming Nov 16, 6:00 PM Women's · Bryant at Holy Cross | ",
 "Upcoming Nov 21, 1:00 PM Women's · Bryant at Northeastern | ",
 "Upcoming Nov 24, 6:00 PM Women's · Bryant vs Stonehill College | ",
 "Upcoming Nov 29, 1:00 PM Women's · Bryant vs Boston University | ",
 "Upcoming Nov 30, 6:00 PM Women's · Bryant vs American International College | ",
 "Upcoming Dec 8, 6:00 PM Women's · Bryant vs Merrimack College | ",
 "Upcoming Dec 10, 11:00 AM Women's · Bryant at Boston College | ",
 "Upcoming Dec 13, 1:00 PM Women's · Bryant at Central Connecticut State | ",
 "Upcoming Dec 21, 6:00 PM Women's · Bryant vs Brown | ",
 "Upcoming Dec 31, 4:00 PM Women's · Bryant at New Hampshire | ",
 "Upcoming Jan 2, 1:00 PM Women's · Bryant at Maine | ",
 "Upcoming Jan 7, 6:00 PM Women's · Bryant vs University at Albany | ",
 "Upcoming Jan 9, 2:00 PM Women's · Bryant vs Massachusetts Lowell | ",
 "Upcoming Jan 14, 12:00 PM Women's · Bryant at Maryland Baltimore County | ",
 "Upcoming Jan 16, 2:00 PM Women's · Bryant vs Vermont | ",
 "Upcoming Jan 21, 6:00 PM Women's · Bryant at New Jersey Institute of Technology | ",
 "Upcoming Jan 28, 6:00 PM Women's · Bryant vs New Hampshire | ",
 "Upcoming Jan 30, 2:00 PM Women's · Bryant at Binghamton | ",
 "Upcoming Feb 4, 11:00 AM Women's · Bryant vs Maryland Baltimore County | ",
 "Upcoming Feb 6, 6:00 PM Women's · Bryant at Vermont | ",
 "Upcoming Feb 11, 11:00 AM Women's · Bryant at University at Albany | ",
 "Upcoming Feb 18, 6:00 PM Women's · Bryant vs Maine | ",
 "Upcoming Feb 20, 2:00 PM Women's · Bryant vs Binghamton | ",
 "Upcoming Feb 25, 6:00 PM Women's · Bryant at Massachusetts Lowell | ",
 "Upcoming Feb 27, 12:00 PM Women's · Bryant vs New Jersey Institute of Technology | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 16 Bryant at Chelsea Gilliam Penguin Classic | Completed",
 "Upcoming Oct 24 Bryant at Niagara University Brunswick Fall Open | ",
 "Upcoming Oct 30 Bryant at Destination: Orlando | ",
 "Upcoming Nov 20 Bryant at The Jersey Jamboree | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Bryant at Adelphi Panthers XC Invitational | Completed",
 "Final Sep 12 Bryant at Shawn M. Nassaney Invitational | Completed",
 "Final Sep 19 Bryant at UMass Dartmouth Cross Country Invitational | Completed",
 "Final Oct 2 Bryant at 52nd Paul Short Run | Completed",
 "Final Oct 9 Bryant at NEICAAA Championships | Completed",
 "Final Oct 18 Bryant at Vermont Fall Foliage Invitational | Completed",
 "Today Oct 23 Bryant at Rothenberg Run | ",
 "Upcoming Oct 30 Bryant at America East Championships | ",
 "Upcoming Nov 13 Bryant at NCAA Cross Country Regional Championships | ",
 "Upcoming Nov 21 Bryant at NCAA Cross Country National Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Bryant at Quinnipiac | L, 1-2",
 "Final Aug 30 Bryant at Hofstra | W, 2-1",
 "Final Sep 4 Bryant vs Merrimack College | W, 10-1",
 "Final Sep 6 Bryant vs Providence College | L, 0-3",
 "Final Sep 11 Bryant vs Stonehill College | W, 3-1",
 "Final Sep 13 Bryant at Holy Cross | L, 1-3",
 "Final Sep 18 Bryant vs Boston University | W, 4-1",
 "Final Sep 20 Bryant vs Sacred Heart | W, 4-0",
 "Final Oct 2 Bryant at Massachusetts Lowell | L, 0-1",
 "Final Oct 4 Bryant vs Brown | W, 2-1",
 "Final Oct 9 Bryant at University at Albany | L, 0-2",
 "Final Oct 11 Bryant vs Towson | L, 0-3",
 "Final Oct 16 Bryant vs Maine | L, 0-3",
 "Final Oct 18 Bryant vs LIU | W, 6-2",
 "Today Oct 23, 3:00 PM Bryant at Vermont | ",
 "Upcoming Oct 25, 1:00 PM Bryant at Dartmouth College | ",
 "Upcoming Oct 29, 1:00 PM Bryant vs New Hampshire | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Bryant at Stonehill College | W, 24-6",
 "Final Sep 5 Bryant at Army | L, 3-59",
 "Final Sep 12 Bryant at Hampton | W, 31-3",
 "Final Sep 19 Bryant vs Princeton | W, 21-14",
 "Final Oct 3 Bryant vs North Carolina A&T State | W, 31-30",
 "Final Oct 10 Bryant at Brown | L, 13-28",
 "Final Oct 17 Bryant at Maine | W, 17-14",
 "Upcoming Oct 24, 2:00 PM Bryant vs Stony Brook | ",
 "Upcoming Oct 31, 1:00 PM Bryant at Monmouth | ",
 "Upcoming Nov 7, 1:00 PM Bryant vs University at Albany | ",
 "Upcoming Nov 14, 12:00 PM Bryant at Sacred Heart | ",
 "Upcoming Nov 21, 1:00 PM Bryant vs Rhode Island | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Bryant at Warrior Invitational | 7th of 9",
 "Final Sep 28 Women's · Bryant at SHU Fall Classic | 6th of 8",
 "Final Oct 12 Women's · Bryant at Quinnipiac Classic | 8th of 10",
 "Final Oct 19 Women's · Bryant at Crusader Invitational | 4th of 13",
 "Upcoming Feb 22 Women's · Bryant at Stetson Hatter Invitational | ",
 "Upcoming Mar 8 Women's · Bryant at Orange Tree Invitational | ",
 "Upcoming Mar 25 Women's · Bryant at Intercollegiate at Prospect Bay | ",
 "Upcoming Apr 12 Women's · Bryant at Spring Spectacular | ",
 "Upcoming Apr 14 Women's · Bryant at Senior Showdown | ",
 "Upcoming Apr 18 Women's · Bryant at Ohio Valley Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · Bryant at Doc Gimmler Invitational | 11th of 14",
 "Final Sep 19 Men's · Bryant at Ryan T. Lee Memorial Collegiate | 1st of 18",
 "Final Sep 27 Men's · Bryant at UConn Invitational | 3rd of 14",
 "Final Oct 12 Men's · Bryant at The Metropolis Intercollegiate | Completed",
 "Final Oct 19 Men's · Bryant at Nassau Intercollegiate | 2nd of 7",
 "Upcoming Feb 12 Men's · Bryant at Palmas del Mar Collegiate | ",
 "Upcoming Mar 20 Men's · Bryant at Carpetbagger Classic | ",
 "Upcoming Mar 29 Men's · Bryant at Columbia Spring Invitational | ",
 "Upcoming Apr 5 Men's · Bryant at Jaspers Spring Collegiate | ",
 "Upcoming Apr 25 Men's · Bryant at Ohio Valley Conference Championship | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Mar 20 Bryant at La Salle | ",
 "Upcoming Apr 3 Bryant at Iona University & Fairfield | ",
 "Upcoming Apr 10 Bryant at Knecht Cup | ",
 "Upcoming Apr 11 Bryant at Knecht Cup | ",
 "Upcoming May 1 Bryant at New England Rowing Championship | ",
 "Upcoming May 15 Bryant at CAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Bryant vs Stonehill College | T, 0-0",
 "Final Aug 23 Women's · Bryant vs Siena | L, 0-1",
 "Final Aug 27 Women's · Bryant vs Central Connecticut State | W, 2-0",
 "Final Aug 30 Women's · Bryant at Merrimack College | L, 1-2",
 "Final Sep 3 Women's · Bryant vs Rhode Island | T, 1-1",
 "Final Sep 6 Women's · Bryant at New Haven | W, 1-0",
 "Final Sep 13 Women's · Bryant vs Boston University | L, 1-2",
 "Final Sep 20 Women's · Bryant at Dartmouth College | L, 0-4",
 "Final Sep 27 Women's · Bryant at Binghamton | L, 0-3",
 "Final Oct 1 Women's · Bryant at New Hampshire | W, 2-0",
 "Final Oct 4 Women's · Bryant vs New Jersey Institute of Technology | W, 1-0",
 "Final Oct 11 Women's · Bryant vs Vermont | T, 0-0",
 "Final Oct 18 Women's · Bryant at University at Albany | L, 0-1",
 "Final Oct 22 Women's · Bryant vs Maine | W, 1-0",
 "Upcoming Oct 25, 1:00 PM Women's · Bryant vs UMBC | ",
 "Upcoming Nov 1, 1:00 PM Women's · Bryant at Massachusetts Lowell | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Bryant vs Massachusetts | T, 2-2",
 "Final Aug 25 Men's · Bryant at Rhode Island | W, 1-0",
 "Final Aug 29 Men's · Bryant at Lafayette College | W, 3-0",
 "Final Sep 2 Men's · Bryant vs Western Michigan | W, 5-1",
 "Final Sep 6 Men's · Bryant vs Colgate | T, 1-1",
 "Final Sep 12 Men's · Bryant vs Providence College | W, 3-2",
 "Final Sep 15 Men's · Bryant vs Dartmouth College | W, 1-0",
 "Final Sep 19 Men's · Bryant vs Princeton | L, 1-2",
 "Final Sep 26 Men's · Bryant at Vermont | L, 0-4",
 "Final Oct 2 Men's · Bryant vs Maryland Baltimore County | W, 1-0",
 "Final Oct 6 Men's · Bryant at Connecticut | W, 1-0",
 "Final Oct 10 Men's · Bryant at University at Albany | W, 2-1",
 "Final Oct 17 Men's · Bryant at Massachusetts Lowell | T, 0-0",
 "Final Oct 20 Men's · Bryant vs Hofstra | W, 2-1",
 "Upcoming Oct 25, 4:00 PM Men's · Bryant vs Binghamton | ",
 "Upcoming Oct 30, 7:00 PM Men's · Bryant at New Jersey Institute of Technology | ",
 "Upcoming Nov 3, 7:00 PM Men's · Bryant vs New Hampshire | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 9 Women's · Bryant vs Fairfield | Completed",
 "Final Oct 16 Women's · Bryant at Binghamton | L, 147-206",
 "Today Oct 23 Women's · Bryant vs Dartmouth College | ",
 "Upcoming Oct 30 Women's · Bryant at Providence College | ",
 "Upcoming Nov 6 Women's · Bryant vs Holy Cross | ",
 "Upcoming Nov 20 Women's · Bryant at Terrier Invite | ",
 "Upcoming Dec 4, 5:00 PM Women's · Bryant at Brown | ",
 "Upcoming Jan 16, 1:00 PM Women's · Bryant at Marist | ",
 "Upcoming Jan 23, 1:30 PM Women's · Bryant at Boston University | ",
 "Upcoming Jan 29 Women's · Bryant vs Massachusetts | ",
 "Upcoming Feb 6, 1:00 PM Women's · Bryant vs NJIT / Stony Brook | ",
 "Upcoming Feb 24 Women's · Bryant at America East Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 9 Men's · Bryant vs Fairfield | W, 189-111",
 "Final Oct 16 Men's · Bryant at Binghamton | L, 171-182",
 "Today Oct 23 Men's · Bryant vs Dartmouth College | ",
 "Upcoming Oct 30 Men's · Bryant at Providence College | ",
 "Upcoming Nov 6 Men's · Bryant vs Holy Cross | ",
 "Upcoming Nov 20 Men's · Bryant at Terrier Invite | ",
 "Upcoming Dec 4, 5:00 PM Men's · Bryant at Brown | ",
 "Upcoming Jan 16, 1:00 PM Men's · Bryant at Marist | ",
 "Upcoming Jan 23, 1:30 PM Men's · Bryant at Boston University | ",
 "Upcoming Jan 29 Men's · Bryant vs Massachusetts | ",
 "Upcoming Feb 6, 1:00 PM Men's · Bryant vs NJIT / Stony Brook | ",
 "Upcoming Feb 24 Men's · Bryant at America East Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 12 Women's · Bryant at Bryant Invitational | Completed",
 "Final Sep 18 Women's · Bryant at UConn Invitational | Completed",
 "Final Sep 19 Women's · Bryant at ITA All-American Championships | Completed",
 "Final Sep 25 Women's · Bryant at OVC Fall Invitational | Completed",
 "Final Oct 8 Women's · Bryant at ITA New England Regional Championship | Completed",
 "Final Oct 17 Women's · Bryant at Brown Classic | Completed",
 "Upcoming Oct 24 Women's · Bryant at URI Fall Invite | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 8 Men's · Bryant at ITA New England Regional Championship | Completed",
 "Today Oct 23 Men's · Bryant at Big South Fall Individual Championships | ",
 "Upcoming Oct 30 Men's · Bryant at Dartmouth Invite | ",
 "Upcoming Jan 16 Men's · Bryant vs Oral Roberts | ",
 "Upcoming Jan 17 Men's · Bryant at Oklahoma | ",
 "Upcoming Jan 18 Men's · Bryant at Tulsa | ",
 "Upcoming Jan 23 Men's · Bryant at Yale | ",
 "Upcoming Jan 24 Men's · Bryant vs Delaware | ",
 "Upcoming Feb 6 Men's · Bryant at Dartmouth College | ",
 "Upcoming Feb 7 Men's · Bryant at Harvard | ",
 "Upcoming Feb 10 Men's · Bryant vs Boston University | ",
 "Upcoming Feb 13 Men's · Bryant vs Fairfield | ",
 "Upcoming Feb 14 Men's · Bryant vs Holy Cross | ",
 "Upcoming Feb 17 Men's · Bryant at Quinnipiac | ",
 "Upcoming Feb 19 Men's · Bryant at Monmouth | ",
 "Upcoming Feb 20 Men's · Bryant at Temple | ",
 "Upcoming Feb 27 Men's · Bryant at Navy | ",
 "Upcoming Feb 28 Men's · Bryant vs Richmond | ",
 "Upcoming Mar 1 Men's · Bryant vs Longwood | ",
 "Upcoming Mar 6 Men's · Bryant vs New Jersey Institute of Technology | ",
 "Upcoming Mar 12 Men's · Bryant vs Iona | ",
 "Upcoming Mar 16 Men's · Bryant at North Carolina Wilmington | ",
 "Upcoming Mar 16 Men's · Bryant at William & Mary | ",
 "Upcoming Mar 27 Men's · Bryant at Buffalo | ",
 "Upcoming Apr 2 Men's · Bryant at UNC Asheville | ",
 "Upcoming Apr 3 Men's · Bryant vs Presbyterian College | ",
 "Upcoming Apr 7 Men's · Bryant vs Merrimack College | ",
 "Upcoming Apr 18 Men's · Bryant vs Le Moyne | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Bryant at Charlotte | L, 0-3",
 "Final Aug 29 Bryant vs North Carolina A&T State | L, 1-3",
 "Final Aug 30 Bryant vs Appalachian State | L, 0-3",
 "Final Sep 2 Bryant vs Stonehill College | W, 3-0",
 "Final Sep 4 Bryant at Rhode Island | W, 3-0",
 "Final Sep 5 Bryant vs Providence College | L, 1-3",
 "Final Sep 6 Bryant vs Brown | W, 3-1",
 "Final Sep 8 Bryant at Connecticut | L, 0-3",
 "Final Sep 11 Bryant vs Marist | L, 1-3",
 "Final Sep 11 Bryant vs Merrimack College | W, 3-1",
 "Final Sep 12 Bryant vs Marist | L, 1-3",
 "Final Sep 12 Bryant vs Fordham | L, 0-3",
 "Final Sep 16 Bryant vs Manhattan | W, 3-1",
 "Final Sep 18 Bryant vs Rutgers | L, 2-3",
 "Final Sep 18 Bryant at St. John's | L, 0-3",
 "Final Sep 19 Bryant vs Pennsylvania | L, 0-3",
 "Final Sep 22 Bryant at Central Connecticut State | W, 3-0",
 "Final Sep 25 Bryant vs New Jersey Institute of Technology | W, 3-1",
 "Final Sep 27 Bryant vs Maryland Baltimore County | L, 0-3",
 "Final Oct 3 Bryant at Binghamton | W, 3-2",
 "Final Oct 6 Bryant at Holy Cross | L, 0-3",
 "Final Oct 9 Bryant at New Hampshire | W, 3-2",
 "Final Oct 17 Bryant vs University at Albany | W, 3-2",
 "Upcoming Oct 24, 1:00 PM Bryant at Maryland Baltimore County | ",
 "Upcoming Oct 30, 2:00 PM Bryant at New Jersey Institute of Technology | ",
 "Upcoming Nov 1, 1:00 PM Bryant vs Binghamton | ",
 "Upcoming Nov 8 Bryant at University at Albany | ",
 "Upcoming Nov 13, 6:00 PM Bryant vs New Hampshire | ",
 "Upcoming Nov 20 Bryant at America East Volleyball Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Bryant module checks passed");
