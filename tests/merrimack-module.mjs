import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {merrimackSchool} from '../src/schools/merrimack.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='merrimack');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,merrimackHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/merrimack-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit merrimackathletics.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['merrimack'];
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',merrimackSchool.scheduleUrls],['roster',merrimackSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('merrimack|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'merrimackathletics.com',`${key} must stay on merrimackathletics.com`);
  }
}
const parity={"Baseball":{"schedule":["https://merrimackathletics.com/sports/baseball/schedule"],"roster":["https://merrimackathletics.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://merrimackathletics.com/sports/mens-basketball/schedule","https://merrimackathletics.com/sports/womens-basketball/schedule"],"roster":["https://merrimackathletics.com/sports/mens-basketball/roster","https://merrimackathletics.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://merrimackathletics.com/sports/womens-cross-country/schedule","https://merrimackathletics.com/sports/mens-cross-country/schedule"],"roster":["https://merrimackathletics.com/sports/womens-cross-country/roster","https://merrimackathletics.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://merrimackathletics.com/sports/field-hockey/schedule"],"roster":["https://merrimackathletics.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://merrimackathletics.com/sports/football/schedule"],"roster":["https://merrimackathletics.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://merrimackathletics.com/sports/womens-golf/schedule","https://merrimackathletics.com/sports/mens-golf/schedule"],"roster":["https://merrimackathletics.com/sports/womens-golf/roster","https://merrimackathletics.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://merrimackathletics.com/sports/mens-ice-hockey/schedule","https://merrimackathletics.com/sports/womens-ice-hockey/schedule"],"roster":["https://merrimackathletics.com/sports/mens-ice-hockey/roster","https://merrimackathletics.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://merrimackathletics.com/sports/womens-lacrosse/schedule","https://merrimackathletics.com/sports/mens-lacrosse/schedule"],"roster":["https://merrimackathletics.com/sports/womens-lacrosse/roster","https://merrimackathletics.com/sports/mens-lacrosse/roster"],"combined":true},"Rowing":{"schedule":["https://merrimackathletics.com/sports/womens-rowing/schedule"],"roster":["https://merrimackathletics.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://merrimackathletics.com/sports/womens-soccer/schedule","https://merrimackathletics.com/sports/mens-soccer/schedule"],"roster":["https://merrimackathletics.com/sports/womens-soccer/roster","https://merrimackathletics.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://merrimackathletics.com/sports/softball/schedule"],"roster":["https://merrimackathletics.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://merrimackathletics.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://merrimackathletics.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://merrimackathletics.com/sports/womens-tennis/schedule","https://merrimackathletics.com/sports/mens-tennis/schedule"],"roster":["https://merrimackathletics.com/sports/womens-tennis/roster","https://merrimackathletics.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://merrimackathletics.com/sports/womens-track-and-field/schedule","https://merrimackathletics.com/sports/mens-track-and-field/schedule"],"roster":["https://merrimackathletics.com/sports/womens-track-and-field/roster","https://merrimackathletics.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://merrimackathletics.com/sports/womens-volleyball/schedule","https://merrimackathletics.com/sports/mens-volleyball/schedule"],"roster":["https://merrimackathletics.com/sports/womens-volleyball/roster","https://merrimackathletics.com/sports/mens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'merrimack|"+sport+"':"),`${sport} routes must live in the Merrimack module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://merrimackathletics.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.merrimackHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=merrimack)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 AM Men's · Merrimack vs Appalachian State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Merrimack vs Massachusetts Lowell | ",
 "Upcoming Nov 8, 2:00 PM Men's · Merrimack at University at Albany | ",
 "Upcoming Nov 13, 7:00 PM Men's · Merrimack at Florida | ",
 "Upcoming Nov 18, 7:00 PM Men's · Merrimack vs Boston University | ",
 "Upcoming Nov 27, 1:00 PM Men's · Merrimack vs Vermont | ",
 "Upcoming Nov 28, 3:30 PM Men's · Merrimack at Hofstra | ",
 "Upcoming Nov 29, 12:00 PM Men's · Merrimack vs Colgate | ",
 "Upcoming Dec 4, 7:00 PM Men's · Merrimack at Siena | ",
 "Upcoming Dec 6, 1:00 PM Men's · Merrimack vs Fairfield | ",
 "Upcoming Dec 10, 7:00 PM Men's · Merrimack vs Vermont | ",
 "Upcoming Dec 12, 2:00 PM Men's · Merrimack at Michigan State | ",
 "Upcoming Dec 21, 2:00 PM Men's · Merrimack at Maine | ",
 "Upcoming Dec 29, 7:00 PM Men's · Merrimack vs Iona | ",
 "Upcoming Jan 1, 2:00 PM Men's · Merrimack at Manhattan | ",
 "Upcoming Jan 3, 1:00 PM Men's · Merrimack vs Quinnipiac | ",
 "Upcoming Jan 8, 7:00 PM Men's · Merrimack vs Marist | ",
 "Upcoming Jan 10, 2:00 PM Men's · Merrimack at Fairfield | ",
 "Upcoming Jan 13, 7:00 PM Men's · Merrimack at Saint Peter's | ",
 "Upcoming Jan 16, 3:00 PM Men's · Merrimack vs Canisius | ",
 "Upcoming Jan 18, 1:00 PM Men's · Merrimack vs Niagara | ",
 "Upcoming Jan 22, 7:00 PM Men's · Merrimack at Marist | ",
 "Upcoming Jan 24, 1:00 PM Men's · Merrimack vs Manhattan | ",
 "Upcoming Jan 29, 7:00 PM Men's · Merrimack at Mount St. Mary's (Md.) | ",
 "Upcoming Feb 5, 7:00 PM Men's · Merrimack vs Saint Peter's | ",
 "Upcoming Feb 7, 2:00 PM Men's · Merrimack at Rider | ",
 "Upcoming Feb 11, 7:00 PM Men's · Merrimack vs Siena | ",
 "Upcoming Feb 19, 6:30 PM Men's · Merrimack at Niagara | ",
 "Upcoming Feb 21, 1:00 PM Men's · Merrimack at Canisius | ",
 "Upcoming Feb 26, 7:00 PM Men's · Merrimack vs Sacred Heart | ",
 "Upcoming Feb 28, 2:00 PM Men's · Merrimack at Quinnipiac | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Merrimack at Florida State | ",
 "Upcoming Nov 5 Women's · Merrimack at New Jersey Institute of Technology | ",
 "Upcoming Nov 8, 1:00 PM Women's · Merrimack vs Maine | ",
 "Upcoming Nov 12, 7:00 PM Women's · Merrimack at Villanova | ",
 "Upcoming Nov 17, 6:00 PM Women's · Merrimack at Boston College | ",
 "Upcoming Nov 19, 7:00 PM Women's · Merrimack at Brown | ",
 "Upcoming Nov 22, 1:00 PM Women's · Merrimack vs Massachusetts Lowell | ",
 "Upcoming Nov 28, 1:00 PM Women's · Merrimack at Northeastern | ",
 "Upcoming Dec 8, 6:00 PM Women's · Merrimack at Bryant | ",
 "Upcoming Dec 12, 2:00 PM Women's · Merrimack vs Dartmouth College | ",
 "Upcoming Dec 19, 6:00 PM Women's · Merrimack vs Siena | ",
 "Upcoming Dec 21, 7:00 PM Women's · Merrimack at Fairfield | ",
 "Upcoming Dec 29, 6:00 PM Women's · Merrimack at Iona | ",
 "Upcoming Jan 1, 1:00 PM Women's · Merrimack vs Manhattan | ",
 "Upcoming Jan 3, 2:00 PM Women's · Merrimack at Quinnipiac | ",
 "Upcoming Jan 7, 11:00 AM Women's · Merrimack at Marist | ",
 "Upcoming Jan 9, 2:00 PM Women's · Merrimack vs Fairfield | ",
 "Upcoming Jan 13, 7:00 PM Women's · Merrimack vs Saint Peter's | ",
 "Upcoming Jan 16, 1:00 PM Women's · Merrimack at Canisius | ",
 "Upcoming Jan 18, 1:00 PM Women's · Merrimack at Niagara | ",
 "Upcoming Jan 21, 7:00 PM Women's · Merrimack vs Marist | ",
 "Upcoming Jan 23, 6:00 PM Women's · Merrimack at Manhattan | ",
 "Upcoming Jan 28, 7:00 PM Women's · Merrimack vs Mount St. Mary's (Md.) | ",
 "Upcoming Feb 4, 6:00 PM Women's · Merrimack at Saint Peter's | ",
 "Upcoming Feb 6, 12:00 PM Women's · Merrimack vs Rider | ",
 "Upcoming Feb 11, 6:00 PM Women's · Merrimack at Siena | ",
 "Upcoming Feb 18, 11:00 AM Women's · Merrimack vs Niagara | ",
 "Upcoming Feb 20, 1:00 PM Women's · Merrimack vs Canisius | ",
 "Upcoming Feb 25, 7:00 PM Women's · Merrimack at Sacred Heart | ",
 "Upcoming Feb 27, 12:00 PM Women's · Merrimack vs Quinnipiac | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 12 Women's · Merrimack at Shawn Nassaney Invitational | Completed",
 "Final Sep 19 Women's · Merrimack at UMass Dartmouth Invitational | Completed",
 "Final Oct 9 Women's · Merrimack at New England Championships | 9th of 20",
 "Today Oct 23, 3:30 PM Women's · Merrimack at Central Connecticut State | ",
 "Upcoming Oct 31 Women's · Merrimack at Metro Conference | ",
 "Upcoming Nov 13 Women's · Merrimack at NCAA Division 1 Northeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 12 Men's · Merrimack at Shawn Nassaney Invitational | 4th of 4",
 "Final Sep 19 Men's · Merrimack at UMass Dartmouth Invitational | Completed",
 "Final Oct 9 Men's · Merrimack at New England Championships | 6th of 20",
 "Today Oct 23, 4:00 PM Men's · Merrimack at Central Connecticut State | ",
 "Upcoming Oct 31 Men's · Merrimack at Metro Conference | ",
 "Upcoming Nov 13 Men's · Merrimack at NCAA Division 1 Northeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Merrimack at Boston University | L, 2-7",
 "Final Sep 4 Merrimack at Bryant | L, 1-10",
 "Final Sep 6 Merrimack at College of the Holy Cross | L, 0-3",
 "Final Sep 11 Merrimack at Dartmouth College | L, 2-4",
 "Final Sep 13 Merrimack at Massachusetts Lowell | L, 0-3",
 "Final Sep 18 Merrimack at Stonehill College | L, 1-4",
 "Final Sep 22 Merrimack at Vermont | L, 0-6",
 "Final Sep 25 Merrimack vs Mercyhurst | W, 2-1",
 "Final Sep 27 Merrimack vs Sacred Heart | L, 0-3",
 "Final Oct 2 Merrimack at Rider | L, 2-3",
 "Final Oct 11 Merrimack at Maine | L, 0-3",
 "Final Oct 16 Merrimack at New Haven | L, 1-2",
 "Final Oct 18 Merrimack at Quinnipiac | L, 1-7",
 "Today Oct 23, 7:00 PM Merrimack vs Wagner College | ",
 "Upcoming Oct 25, 12:00 PM Merrimack at Lock Haven | ",
 "Upcoming Oct 30, 5:00 PM Merrimack vs LIU | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Merrimack vs Rhode Island | L, 7-34",
 "Final Sep 3 Merrimack at Delaware | L, 7-42",
 "Final Sep 12 Merrimack at Maine | W, 23-14",
 "Final Sep 19 Merrimack at Tarleton State | L, 20-45",
 "Final Sep 26 Merrimack vs New Haven | W, 17-10",
 "Final Oct 3 Merrimack at Yale | L, 24-41",
 "Final Oct 17 Merrimack at Dartmouth College | L, 21-27",
 "Upcoming Oct 24, 12:00 PM Merrimack vs New Hampshire | ",
 "Upcoming Oct 31, 12:00 PM Merrimack vs Wagner College | ",
 "Upcoming Nov 7, 12:00 PM Merrimack at Wake Forest | ",
 "Upcoming Nov 14, 12:00 PM Merrimack at Monmouth | ",
 "Upcoming Nov 21, 12:00 PM Merrimack vs Sacred Heart | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Merrimack at Warrior Invitational | 2nd of 9",
 "Final Sep 28 Women's · Merrimack at The Hill | Completed",
 "Final Oct 19 Women's · Merrimack at Crusader Invitational | 3rd of 13",
 "Upcoming Oct 26 Women's · Merrimack at Pat Bradley Invitational | ",
 "Upcoming Mar 1 Women's · Merrimack at Huntsville.org Intercollegiate | ",
 "Upcoming Mar 22 Women's · Merrimack at Bentwater Women's Collegiate | ",
 "Upcoming Apr 12 Women's · Merrimack at Spring Spectacular | ",
 "Upcoming Apr 20 Women's · Merrimack at Metro Conference | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 10 Men's · Merrimack at Ram Masters Invitational | 16th",
 "Final Sep 27 Men's · Merrimack at UConn Invitational | 13th of 14",
 "Final Oct 3 Men's · Merrimack at The Autumn Invitational | T6th of 13",
 "Final Oct 12 Men's · Merrimack at SHU Men's Fall Classic | 2nd of 11",
 "Upcoming Feb 12 Men's · Merrimack at Palmas del Mar Collegiate | ",
 "Upcoming Mar 15 Men's · Merrimack at SHU Spring Break Invite | ",
 "Upcoming Apr 5 Men's · Merrimack at Jasper Spring Collegiate | ",
 "Upcoming Apr 17 Men's · Merrimack at Roar-EE Invitational | ",
 "Upcoming Apr 27 Men's · Merrimack at Metro Champonship | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Merrimack at Sacred Heart | W, 3-1",
 "Final Oct 3 Men's · Merrimack at Quinnipiac | L, 3-6",
 "Final Oct 8 Men's · Merrimack vs New Hampshire | T, 3-3",
 "Final Oct 16 Men's · Merrimack vs Minnesota State University, Mankato | W, 4-3",
 "Final Oct 17 Men's · Merrimack vs Minnesota State University, Mankato | W, 8-2",
 "Today Oct 23, 7:00 PM Men's · Merrimack at Notre Dame | ",
 "Upcoming Oct 24, 5:00 PM Men's · Merrimack at Notre Dame | ",
 "Upcoming Oct 30, 7:00 PM Men's · Merrimack vs Connecticut | ",
 "Upcoming Oct 31, 4:30 PM Men's · Merrimack vs Connecticut | ",
 "Upcoming Nov 6, 7:00 PM Men's · Merrimack vs College of the Holy Cross | ",
 "Upcoming Nov 13, 7:00 PM Men's · Merrimack at Providence College | ",
 "Upcoming Nov 14, 7:00 PM Men's · Merrimack vs Providence College | ",
 "Upcoming Nov 20, 7:00 PM Men's · Merrimack vs Boston University | ",
 "Upcoming Nov 21, 6:00 PM Men's · Merrimack at Boston University | ",
 "Upcoming Nov 27 Men's · Merrimack vs Clarkson / St. Lawrence / RIT | ",
 "Upcoming Nov 28 Men's · Merrimack vs Clarkson / St. Lawrence / RIT | ",
 "Upcoming Dec 5, 6:00 PM Men's · Merrimack vs Brown | ",
 "Upcoming Dec 11, 7:00 PM Men's · Merrimack vs Massachusetts | ",
 "Upcoming Dec 12, 7:00 PM Men's · Merrimack at Massachusetts | ",
 "Upcoming Jan 2 Men's · Merrimack at Connecticut | ",
 "Upcoming Jan 9, 4:00 PM Men's · Merrimack at New Hampshire | ",
 "Upcoming Jan 15, 7:00 PM Men's · Merrimack at Vermont | ",
 "Upcoming Jan 16, 5:00 PM Men's · Merrimack at Vermont | ",
 "Upcoming Jan 22, 7:00 PM Men's · Merrimack vs Northeastern | ",
 "Upcoming Jan 23, 6:00 PM Men's · Merrimack vs Northeastern | ",
 "Upcoming Jan 29, 7:00 PM Men's · Merrimack at New Hampshire | ",
 "Upcoming Jan 31, 2:00 PM Men's · Merrimack vs Dartmouth College | ",
 "Upcoming Feb 5, 7:15 PM Men's · Merrimack at Massachusetts Lowell | ",
 "Upcoming Feb 6, 7:00 PM Men's · Merrimack vs Massachusetts Lowell | ",
 "Upcoming Feb 12, 7:00 PM Men's · Merrimack vs Maine | ",
 "Upcoming Feb 13, 6:00 PM Men's · Merrimack vs Maine | ",
 "Upcoming Feb 19, 7:00 PM Men's · Merrimack vs Boston College | ",
 "Upcoming Feb 20, 7:00 PM Men's · Merrimack at Boston College | ",
 "Upcoming Feb 27, 7:00 PM Men's · Merrimack vs Vermont | ",
 "Upcoming Mar 5, 7:15 PM Men's · Merrimack at Massachusetts Lowell | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 19 Women's · Merrimack vs Stonehill College | W, 7-1",
 "Final Sep 24 Women's · Merrimack vs Lindenwood | L, 2-3",
 "Final Sep 25 Women's · Merrimack vs Lindenwood | W, 3-0",
 "Final Oct 2 Women's · Merrimack vs Union College | L, 2-4",
 "Final Oct 3 Women's · Merrimack vs Union College | L, 2-4",
 "Final Oct 14 Women's · Merrimack at Boston College | L, 0-5",
 "Today Oct 23, 5:00 PM Women's · Merrimack vs Post | ",
 "Upcoming Oct 24, 6:00 PM Women's · Merrimack vs Saint Michael's College | ",
 "Upcoming Oct 30, 2:00 PM Women's · Merrimack vs New Hampshire | ",
 "Upcoming Oct 31, 2:00 PM Women's · Merrimack at New Hampshire | ",
 "Upcoming Nov 6, 7:00 PM Women's · Merrimack at Holy Cross | ",
 "Upcoming Nov 7, 2:00 PM Women's · Merrimack vs Holy Cross | ",
 "Upcoming Nov 13, 3:00 PM Women's · Merrimack vs Northeastern | ",
 "Upcoming Nov 14, 1:00 PM Women's · Merrimack vs Northeastern | ",
 "Upcoming Nov 20, 2:00 PM Women's · Merrimack vs Boston College | ",
 "Upcoming Nov 27, 11:30 AM Women's · Merrimack at St. Lawrence | ",
 "Upcoming Nov 28, 11:30 AM Women's · Merrimack at St. Lawrence | ",
 "Upcoming Dec 4, 5:00 PM Women's · Merrimack vs Providence College | ",
 "Upcoming Dec 5, 2:00 PM Women's · Merrimack at Providence College | ",
 "Upcoming Jan 2, 2:00 PM Women's · Merrimack vs Brown | ",
 "Upcoming Jan 8, 2:00 PM Women's · Merrimack at Vermont | ",
 "Upcoming Jan 9, 2:00 PM Women's · Merrimack at Vermont | ",
 "Upcoming Jan 15, 5:00 PM Women's · Merrimack vs Connecticut | ",
 "Upcoming Jan 16, 3:00 PM Women's · Merrimack at Connecticut | ",
 "Upcoming Jan 22, 2:00 PM Women's · Merrimack vs Maine | ",
 "Upcoming Jan 23, 1:00 PM Women's · Merrimack vs Maine | ",
 "Upcoming Jan 29, 6:00 PM Women's · Merrimack at Boston University | ",
 "Upcoming Jan 30, 2:00 PM Women's · Merrimack vs Boston University | ",
 "Upcoming Feb 5, 5:00 PM Women's · Merrimack at Providence College | ",
 "Upcoming Feb 7, 2:00 PM Women's · Merrimack at Boston College | ",
 "Upcoming Feb 12, 6:00 PM Women's · Merrimack at New Hampshire | ",
 "Upcoming Feb 13, 1:00 PM Women's · Merrimack vs Vermont | ",
 "Upcoming Feb 18, 6:00 PM Women's · Merrimack vs Boston University | ",
 "Upcoming Feb 20, 5:00 PM Women's · Merrimack at Maine | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Merrimack at Vermont | T, 2-2",
 "Final Aug 16 Women's · Merrimack vs Northeastern | L, 0-2",
 "Final Aug 23 Women's · Merrimack at Massachusetts Lowell | L, 2-5",
 "Final Aug 27 Women's · Merrimack at Maine | W, 2-1",
 "Final Aug 30 Women's · Merrimack vs Bryant | W, 2-1",
 "Final Sep 2 Women's · Merrimack vs New Hampshire | L, 2-4",
 "Final Sep 5 Women's · Merrimack at Marist | L, 0-1",
 "Final Sep 12 Women's · Merrimack vs Saint Peter's | T, 0-0",
 "Final Sep 19 Women's · Merrimack at Iona | L, 1-2",
 "Final Sep 23 Women's · Merrimack at Quinnipiac | L, 1-2",
 "Final Sep 30 Women's · Merrimack vs Rider | L, 1-2",
 "Final Oct 3 Women's · Merrimack vs Manhattan | T, 1-1",
 "Final Oct 10 Women's · Merrimack at Fairfield | L, 1-7",
 "Final Oct 14 Women's · Merrimack vs Sacred Heart | L, 1-2",
 "Final Oct 17 Women's · Merrimack vs Canisius | T, 0-0",
 "Final Oct 21 Women's · Merrimack vs Siena | L, 1-2",
 "Upcoming Oct 24, 12:00 PM Women's · Merrimack at Niagara | ",
 "Upcoming Oct 31, 12:00 PM Women's · Merrimack at Mount St. Mary's (Md.) | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Merrimack at Boston College | L, 0-4",
 "Final Aug 23 Men's · Merrimack at College of the Holy Cross | T, 2-2",
 "Final Aug 27 Men's · Merrimack at Stonehill College | T, 1-1",
 "Final Sep 2 Men's · Merrimack at Rhode Island | W, 3-1",
 "Final Sep 8 Men's · Merrimack vs Central Connecticut State | W, 1-0",
 "Final Sep 11 Men's · Merrimack vs Dartmouth College | T, 0-0",
 "Final Sep 15 Men's · Merrimack vs Massachusetts Lowell | L, 0-1",
 "Final Sep 19 Men's · Merrimack vs Sacred Heart | T, 1-1",
 "Final Sep 26 Men's · Merrimack at Niagara | T, 1-1",
 "Final Oct 3 Men's · Merrimack at Mount St. Mary's (Md.) | T, 1-1",
 "Final Oct 10 Men's · Merrimack vs Rider | W, 1-0",
 "Final Oct 14 Men's · Merrimack vs Iona | T, 0-0",
 "Final Oct 17 Men's · Merrimack at Marist | T, 1-1",
 "Upcoming Oct 24, 6:00 PM Men's · Merrimack vs Manhattan | ",
 "Upcoming Oct 28, 3:00 PM Men's · Merrimack at Siena | ",
 "Upcoming Oct 31, 4:00 PM Men's · Merrimack vs Canisius | ",
 "Upcoming Nov 4, 2:00 PM Men's · Merrimack at Quinnipiac | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Upcoming Oct 31 Women's · Merrimack at New Hampshire | ",
 "Upcoming Oct 31 Women's · Merrimack at Siena | ",
 "Upcoming Nov 7 Women's · Merrimack at Wellesley College | ",
 "Upcoming Dec 4 Women's · Merrimack at Gompei Invitational | ",
 "Upcoming Jan 16 Women's · Merrimack at Rider | ",
 "Upcoming Jan 16 Women's · Merrimack at New Jersey Institute of Technology | ",
 "Upcoming Jan 23 Women's · Merrimack vs Stonehill College | ",
 "Upcoming Jan 30 Women's · Merrimack at Sacred Heart | ",
 "Upcoming Feb 16 Women's · Merrimack at Metro Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 9 Women's · Merrimack vs Southern New Hampshire | L, 0-5",
 "Final Sep 17 Women's · Merrimack vs Assumption | L, 1-6",
 "Final Oct 2 Women's · Merrimack at Metro Conference Tournament | Completed",
 "Final Oct 20 Women's · Merrimack at Franklin Pierce | L, 2-5",
 "Upcoming Oct 22, 3:00 PM Women's · Merrimack vs Saint Anselm College | ",
 "Upcoming Jan 30 Women's · Merrimack at Stonehill College | ",
 "Upcoming Feb 6 Women's · Merrimack vs Saint Michael's College | ",
 "Upcoming Feb 12 Women's · Merrimack vs Colgate | ",
 "Upcoming Feb 19 Women's · Merrimack vs Iona | ",
 "Upcoming Feb 27 Women's · Merrimack vs Sacred Heart | ",
 "Upcoming Mar 13 Women's · Merrimack vs Marist | ",
 "Upcoming Mar 14 Women's · Merrimack vs Niagara | ",
 "Upcoming Mar 20 Women's · Merrimack at Providence College | ",
 "Upcoming Mar 24 Women's · Merrimack at Holy Cross | ",
 "Upcoming Mar 28 Women's · Merrimack at Siena | ",
 "Upcoming Apr 4 Women's · Merrimack at Quinnipiac | ",
 "Upcoming Apr 10 Women's · Merrimack vs RPI Rensselaer Polytechnic Institute | ",
 "Upcoming Apr 11 Women's · Merrimack at Fairfield | ",
 "Upcoming Apr 13 Women's · Merrimack vs New Haven | ",
 "Upcoming Apr 18 Women's · Merrimack at Mount St. Mary's (Md.) | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Merrimack at BU Invite | Completed",
 "Final Sep 23 Men's · Merrimack at Assumption | W, 4-3",
 "Final Sep 29 Men's · Merrimack at Southern New Hampshire | L, 3-4",
 "Final Oct 2 Men's · Merrimack at Metro Conference | Completed",
 "Final Oct 8 Men's · Merrimack at ITA'S | Completed"
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · Merrimack at Florida Atlantic | L, 0-3",
 "Final Aug 28 Women's · Merrimack vs Florida International | L, 0-3",
 "Final Aug 29 Women's · Merrimack vs Stetson | L, 1-3",
 "Final Sep 4 Women's · Merrimack vs Saint Louis | L, 0-3",
 "Final Sep 4 Women's · Merrimack at Southern Illinois | L, 1-3",
 "Final Sep 5 Women's · Merrimack vs Southeast Missouri State | L, 0-3",
 "Final Sep 8 Women's · Merrimack vs New Hampshire | L, 1-3",
 "Final Sep 11 Women's · Merrimack at Bryant | L, 1-3",
 "Final Sep 12 Women's · Merrimack vs Fordham | L, 1-3",
 "Final Sep 15 Women's · Merrimack vs Harvard | L, 0-3",
 "Final Sep 18 Women's · Merrimack vs Rhode Island | L, 0-3",
 "Final Sep 19 Women's · Merrimack at Connecticut | L, 1-3",
 "Final Sep 19 Women's · Merrimack vs Coppin State | L, 0-3",
 "Final Sep 25 Women's · Merrimack at Manhattan | L, 1-3",
 "Final Sep 26 Women's · Merrimack at Iona | L, 0-3",
 "Final Sep 29 Women's · Merrimack at Quinnipiac | L, 2-3",
 "Final Oct 2 Women's · Merrimack at Sacred Heart | L, 0-3",
 "Final Oct 3 Women's · Merrimack at Fairfield | L, 1-3",
 "Final Oct 9 Women's · Merrimack vs Marist | W, 3-2",
 "Final Oct 10 Women's · Merrimack vs Siena College | W, 3-1",
 "Final Oct 16 Women's · Merrimack at Niagara | L, 1-3",
 "Final Oct 17 Women's · Merrimack at Canisius | L, 1-3",
 "Today Oct 23, 6:00 PM Women's · Merrimack vs Saint Peter's | ",
 "Upcoming Oct 24, 2:00 PM Women's · Merrimack vs Rider | ",
 "Upcoming Oct 27, 7:00 PM Women's · Merrimack vs Quinnipiac | ",
 "Upcoming Oct 30, 6:00 PM Women's · Merrimack vs Fairfield | ",
 "Upcoming Oct 31, 2:00 PM Women's · Merrimack vs Sacred Heart | ",
 "Upcoming Nov 6, 6:00 PM Women's · Merrimack vs Iona | ",
 "Upcoming Nov 7, 2:00 PM Women's · Merrimack vs Manhattan | ",
 "Upcoming Nov 13 Women's · Merrimack at Siena College | ",
 "Upcoming Nov 14 Women's · Merrimack at Marist | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Merrimack module checks passed");
