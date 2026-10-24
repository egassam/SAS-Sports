import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {armySchool} from '../src/schools/army.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='army');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,armyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/army-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goarmywestpoint.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['army'];
assert.equal(sports.length,16);
for(const [name,map] of [['schedule',armySchool.scheduleUrls],['roster',armySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('army|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goarmywestpoint.com',`${key} must stay on goarmywestpoint.com`);
  }
}
const parity={"Baseball":{"schedule":["https://goarmywestpoint.com/sports/baseball/schedule"],"roster":["https://goarmywestpoint.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goarmywestpoint.com/sports/mens-basketball/schedule","https://goarmywestpoint.com/sports/womens-basketball/schedule"],"roster":["https://goarmywestpoint.com/sports/mens-basketball/roster","https://goarmywestpoint.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goarmywestpoint.com/sports/mens-cross-country/schedule","https://goarmywestpoint.com/sports/womens-cross-country/schedule"],"roster":["https://goarmywestpoint.com/sports/mens-cross-country/roster","https://goarmywestpoint.com/sports/womens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://goarmywestpoint.com/sports/football/schedule"],"roster":["https://goarmywestpoint.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goarmywestpoint.com/sports/mens-golf/schedule"],"roster":["https://goarmywestpoint.com/sports/mens-golf/roster"],"combined":false},"Gymnastics":{"schedule":["https://goarmywestpoint.com/sports/mens-gymnastics/schedule"],"roster":["https://goarmywestpoint.com/sports/mens-gymnastics/roster"],"combined":false},"Hockey":{"schedule":["https://goarmywestpoint.com/sports/mens-ice-hockey/schedule"],"roster":["https://goarmywestpoint.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://goarmywestpoint.com/sports/womens-lacrosse/schedule","https://goarmywestpoint.com/sports/mens-lacrosse/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-lacrosse/roster","https://goarmywestpoint.com/sports/mens-lacrosse/roster"],"combined":true},"Rifle":{"schedule":["https://goarmywestpoint.com/sports/rifle/schedule"],"roster":["https://goarmywestpoint.com/sports/rifle/roster"],"combined":false},"Soccer":{"schedule":["https://goarmywestpoint.com/sports/womens-soccer/schedule","https://goarmywestpoint.com/sports/mens-soccer/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-soccer/roster","https://goarmywestpoint.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://goarmywestpoint.com/sports/softball/schedule"],"roster":["https://goarmywestpoint.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://goarmywestpoint.com/sports/womens-swimming-and-diving/schedule","https://goarmywestpoint.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-swimming-and-diving/roster","https://goarmywestpoint.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://goarmywestpoint.com/sports/womens-tennis/schedule","https://goarmywestpoint.com/sports/mens-tennis/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-tennis/roster","https://goarmywestpoint.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goarmywestpoint.com/sports/womens-track-and-field/schedule","https://goarmywestpoint.com/sports/mens-track-and-field/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-track-and-field/roster","https://goarmywestpoint.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://goarmywestpoint.com/sports/womens-volleyball/schedule"],"roster":["https://goarmywestpoint.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://goarmywestpoint.com/sports/wrestling/schedule"],"roster":["https://goarmywestpoint.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'army|"+sport+"':"),`${sport} routes must live in the Army module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-24T15:00:00Z");
const page=slug=>`https://goarmywestpoint.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.armyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=army)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Men's · Army at Duke | ",
 "Upcoming Nov 5, 6:00 PM Men's · Army vs Mount Saint Mary | ",
 "Upcoming Nov 10, 7:00 PM Men's · Army at New Haven | ",
 "Upcoming Nov 14, 1:00 PM Men's · Army vs St. Thomas | ",
 "Upcoming Nov 17, 6:00 PM Men's · Army vs Marist | ",
 "Upcoming Nov 21, 3:30 PM Men's · Army at Binghamton | ",
 "Upcoming Nov 24, 4:00 PM Men's · Army vs Air Force | ",
 "Upcoming Nov 26, 12:00 PM Men's · Army at UTSA | ",
 "Upcoming Nov 28, 1:00 PM Men's · Army vs Rider | ",
 "Upcoming Dec 2, 11:00 AM Men's · Army vs UMBC | ",
 "Upcoming Dec 5 Men's · Army at UAlbany | ",
 "Upcoming Dec 7, 6:00 PM Men's · Army vs York College | ",
 "Upcoming Dec 11, 7:00 PM Men's · Army at Columbia | ",
 "Upcoming Dec 20, 12:00 PM Men's · Army at Rutgers | ",
 "Upcoming Dec 30, 2:00 PM Men's · Army at Holy Cross | ",
 "Upcoming Jan 2, 5:00 PM Men's · Army at Loyola Maryland | ",
 "Upcoming Jan 6, 6:00 PM Men's · Army vs Lehigh | ",
 "Upcoming Jan 9, 2:00 PM Men's · Army at Colgate | ",
 "Upcoming Jan 13, 6:00 PM Men's · Army vs Bucknell | ",
 "Upcoming Jan 17, 2:00 PM Men's · Army vs Lafayette | ",
 "Upcoming Jan 20, 7:00 PM Men's · Army at Lehigh | ",
 "Upcoming Jan 23, 1:30 PM Men's · Army vs Navy | ",
 "Upcoming Jan 27, 6:00 PM Men's · Army vs Holy Cross | ",
 "Upcoming Jan 30, 5:00 PM Men's · Army at Bucknell | ",
 "Upcoming Feb 3, 6:00 PM Men's · Army vs American | ",
 "Upcoming Feb 6, 1:00 PM Men's · Army vs Boston University | ",
 "Upcoming Feb 10, 7:00 PM Men's · Army at Lafayette | ",
 "Upcoming Feb 13, 1:00 PM Men's · Army vs Colgate | ",
 "Upcoming Feb 17, 7:00 PM Men's · Army at American | ",
 "Upcoming Feb 20, 1:30 PM Men's · Army at Navy | ",
 "Upcoming Feb 24, 3:30 PM Men's · Army vs Loyola Maryland | ",
 "Upcoming Feb 27 Men's · Army at Boston University | ",
 "Upcoming Mar 2 Men's · Army at Patriot League Tournament First Round | ",
 "Upcoming Mar 4 Men's · Army at Patriot League Tournament Quarterfinals | ",
 "Upcoming Mar 7 Men's · Army at Patriot League Tournament Semifinals | ",
 "Upcoming Mar 10, 7:00 PM Men's · Army at Patriot League Tournament Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 4:00 PM Women's · Army at UConn (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Army vs St. Thomas Aquinas | ",
 "Upcoming Nov 5, 7:00 PM Women's · Army at Brown | ",
 "Upcoming Nov 11, 6:00 PM Women's · Army vs George Mason | ",
 "Upcoming Nov 14, 3:30 PM Women's · Army vs St. Thomas | ",
 "Upcoming Nov 17, 5:00 PM Women's · Army at UMass | ",
 "Upcoming Nov 19, 6:00 PM Women's · Army at Siena | ",
 "Upcoming Nov 27, 7:00 PM Women's · Army at North Carolina | ",
 "Upcoming Nov 29, 2:00 PM Women's · Army at High Point | ",
 "Upcoming Dec 2, 3:00 PM Women's · Army vs Binghamton | ",
 "Upcoming Dec 5, 3:00 PM Women's · Army at Air Force | ",
 "Upcoming Dec 10, 6:00 PM Women's · Army at Penn State | ",
 "Upcoming Dec 30, 6:00 PM Women's · Army vs Holy Cross | ",
 "Upcoming Jan 2, 1:00 PM Women's · Army vs Loyola University Maryland | ",
 "Upcoming Jan 6 Women's · Army at Lehigh | ",
 "Upcoming Jan 9, 1:00 PM Women's · Army vs Colgate | ",
 "Upcoming Jan 13 Women's · Army at Bucknell | ",
 "Upcoming Jan 16 Women's · Army at Lafayette College | ",
 "Upcoming Jan 20, 6:00 PM Women's · Army vs Lehigh | ",
 "Upcoming Jan 23 Women's · Army vs Navy | ",
 "Upcoming Jan 27, 6:00 PM Women's · Army at Holy Cross | ",
 "Upcoming Jan 30, 1:00 PM Women's · Army vs Bucknell | ",
 "Upcoming Feb 3, 6:00 PM Women's · Army at American | ",
 "Upcoming Feb 6 Women's · Army at Boston University | ",
 "Upcoming Feb 10, 6:00 PM Women's · Army vs Lafayette College | ",
 "Upcoming Feb 13, 2:00 PM Women's · Army at Colgate | ",
 "Upcoming Feb 17, 6:00 PM Women's · Army vs American | ",
 "Upcoming Feb 20 Women's · Army at Navy | ",
 "Upcoming Feb 23 Women's · Army at Loyola University Maryland | ",
 "Upcoming Feb 26, 6:00 PM Women's · Army vs Boston University | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · Army at Maine Dual | L, 35-25",
 "Final Sep 11 Men's · Army at Iona Meet of Champions | 2nd of 4",
 "Final Sep 19 Men's · Army at Jasper Invitational | 1st of 12",
 "Final Oct 2 Men's · Army at Paul Short Invitational | 7th of 35",
 "Final Oct 10 Men's · Army at NJIT Highlander Invite | 1st of 22",
 "Final Oct 17 Men's · Army at Navy | L, 42-19",
 "Upcoming Oct 31 Men's · Army at Patriot League Championships | ",
 "Upcoming Nov 13 Men's · Army at Northeast Regional Championships | ",
 "Upcoming Nov 21 Men's · Army at NCAA Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Women's · Army at Maine Dual | L, 37-20",
 "Final Sep 11 Women's · Army at Iona Meet of Champions | 2nd of 6",
 "Final Sep 19 Women's · Army at Jasper Invitational | 1st of 12",
 "Final Oct 2 Women's · Army at Paul Short Invitational | 5th of 37",
 "Final Oct 10 Women's · Army at NJIT Highlander Invite | 1st of 24",
 "Final Oct 17 Women's · Army at Navy | W, 21-35",
 "Upcoming Oct 31 Women's · Army at Patriot League Championships | ",
 "Upcoming Nov 13 Women's · Army at Northeast Regional Championships | ",
 "Upcoming Nov 21 Women's · Army at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Army vs Bryant | W, 59-3",
 "Final Sep 12 Army vs South Florida | L, 24-28",
 "Final Sep 25 Army at Temple | W, 21-17",
 "Final Oct 3 Army at Louisiana Tech | L, 29-31",
 "Final Oct 10 Army vs Tulane | W, 20-17",
 "Final Oct 17 Army vs Florida Atlantic | W, 56-24",
 "Upcoming Oct 23, 8:30 PM Army at Tulsa | ",
 "Upcoming Oct 31, 8:00 PM Army at Memphis | ",
 "Upcoming Nov 7, 7:30 PM Army vs Air Force | ",
 "Upcoming Nov 21, 12:00 PM Army vs East Carolina | ",
 "Upcoming Nov 28 Army at Rice | ",
 "Upcoming Dec 5 Army at American Conference Championship Game | ",
 "Upcoming Dec 12, 3:00 PM Army vs Navy | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Army at Folds of Honor Collegiate | 12th",
 "Final Sep 14 Army at Jackson T. Stephens Cup | 32nd",
 "Final Sep 21 Army at Bush Cup | Match play: 0-0-1",
 "Final Oct 3 Army at Army-Navy | Match play: 0-1-1",
 "Final Oct 13 Army at Commander-in-Chief's Cup | Completed",
 "Today Oct 24 Army at Lehigh Invitational | ",
 "Upcoming Nov 4 Army at Pearl at Kalauao Invitational | ",
 "Upcoming Feb 7 Army at Dorado Beach Collegiate | ",
 "Upcoming Mar 8 Army at Palmetto Intercollegiate | ",
 "Upcoming Mar 19 Army at Schenkel Invitational | ",
 "Upcoming Apr 3 Army at Haskins Award Invitational | ",
 "Upcoming Apr 12 Army at Wofford Invitational | ",
 "Upcoming Apr 30 Army at Patriot League Championship | "
]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 3 Army vs Union | L, 2-4",
 "Final Oct 11 Army vs Royal Military College of Canada (Exhibition) | W, 6-1",
 "Final Oct 17 Army at Holy Cross | W, 5-2",
 "Final Oct 18 Army at Holy Cross | W, 3-1",
 "Upcoming Oct 23, 7:00 PM Army at Quinnipiac | ",
 "Today Oct 24, 7:00 PM Army vs United States National Team Development Program (Exhibition) | ",
 "Upcoming Oct 30, 7:00 PM Army vs RIT | ",
 "Upcoming Oct 31, 4:00 PM Army vs RIT | ",
 "Upcoming Nov 6, 9:00 PM Army at Air Force | ",
 "Upcoming Nov 7, 7:00 PM Army at Air Force | ",
 "Upcoming Nov 13, 7:00 PM Army vs Sacred Heart | ",
 "Upcoming Nov 14, 7:00 PM Army vs Sacred Heart | ",
 "Upcoming Nov 27, 7:00 PM Army at RPI | ",
 "Upcoming Nov 28, 4:00 PM Army vs RPI | ",
 "Upcoming Dec 4, 7:00 PM Army vs Bentley | ",
 "Upcoming Dec 5, 4:00 PM Army vs Bentley | ",
 "Upcoming Dec 10, 7:00 PM Army vs Penn State | ",
 "Upcoming Dec 12, 7:00 PM Army at Penn State | ",
 "Upcoming Dec 19, 4:00 PM Army at Maine | ",
 "Upcoming Dec 28, 7:00 PM Army vs Long Island | ",
 "Upcoming Dec 29 Army vs Ferris State/St.Lawrence | ",
 "Upcoming Jan 5, 7:00 PM Army at Brown | ",
 "Upcoming Jan 15, 7:00 PM Army at Robert Morris | ",
 "Upcoming Jan 16, 7:00 PM Army at Robert Morris | ",
 "Upcoming Jan 22, 7:00 PM Army vs Canisius | ",
 "Upcoming Jan 23, 7:00 PM Army vs Canisius | ",
 "Upcoming Jan 29, 7:00 PM Army at RIT | ",
 "Upcoming Jan 30, 5:00 PM Army at RIT | ",
 "Upcoming Feb 5, 7:00 PM Army vs Niagara | ",
 "Upcoming Feb 6, 4:00 PM Army vs Niagara | ",
 "Upcoming Feb 12, 7:00 PM Army at Sacred Heart | ",
 "Upcoming Feb 13, 5:00 PM Army at Sacred Heart | ",
 "Upcoming Feb 19, 7:00 PM Army vs Air Force | ",
 "Upcoming Feb 20, 4:00 PM Army vs Air Force | ",
 "Upcoming Feb 26, 7:00 PM Army at Bentley | ",
 "Upcoming Feb 27, 6:00 PM Army at Bentley | ",
 "Upcoming Mar 2 Army at Atlantic Hockey Tournament | ",
 "Upcoming Mar 25 Army at NCAA Tournament | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_rifle=parse("Rifle","rifle");
  assert.deepEqual(v_rifle.map(line),[
 "Final Oct 3 Army vs West Virginia | L, 4665-4750",
 "Final Oct 10 Army vs Schreiner | W, 4666-3526",
 "Final Oct 11 Army at TCU | L, 4657-4732",
 "Today Oct 24, 8:00 AM Army at John Jay College | ",
 "Today Oct 24, 8:00 AM Army at Rhode Island | ",
 "Upcoming Nov 7, 8:00 AM Army at Air Force | ",
 "Upcoming Nov 8, 9:00 AM Army at President's Trophy (Air Force, Coast Guard, and Navy) | ",
 "Upcoming Nov 15, 10:00 AM Army at MIT | ",
 "Upcoming Jan 16, 8:00 AM Army at Akron | ",
 "Upcoming Jan 16, 8:00 AM Army at Jacksonville State | ",
 "Upcoming Jan 23 Army at Akron | ",
 "Upcoming Jan 30 Army at Kentucky | ",
 "Upcoming Feb 6 Army at Navy | ",
 "Upcoming Feb 13 Army at Memphis | ",
 "Upcoming Feb 20 Army at NCAA Qualifiers | ",
 "Upcoming Feb 27 Army at GARC Championships (Game 1) | ",
 "Upcoming Feb 27 Army at GARC Championships (Game 2) | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Army at Air Force | L, 1-4",
 "Final Aug 16 Women's · Army at Colorado | L, 0-6",
 "Final Aug 20 Women's · Army vs William & Mary | W, 3-2",
 "Final Aug 23 Women's · Army vs Vermont | W, 3-0",
 "Final Aug 27 Women's · Army vs Monmouth | L, 0-3",
 "Final Aug 30 Women's · Army vs West Virginia | L, 1-2",
 "Final Sep 3 Women's · Army at Maine | L, 1-2",
 "Final Sep 6 Women's · Army vs Boston College | L, 1-2",
 "Final Sep 10 Women's · Army vs Cornell | W, 1-0",
 "Final Sep 19 Women's · Army vs American | W, 3-0",
 "Final Sep 26 Women's · Army vs Lehigh | W, 2-0",
 "Final Sep 30 Women's · Army at Boston U. | W, 2-0",
 "Final Oct 3 Women's · Army at Colgate | W, 3-0",
 "Final Oct 9 Women's · Army vs Navy | T, 0-0",
 "Final Oct 17 Women's · Army vs Lafayette | W, 4-0",
 "Today Oct 24, 1:00 PM Women's · Army at Bucknell | ",
 "Upcoming Oct 31, 1:00 PM Women's · Army at Loyola Maryland | ",
 "Upcoming Nov 4, 6:00 PM Women's · Army vs Holy Cross | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Army vs Air Force | T, 1-1",
 "Final Aug 24 Men's · Army at Akron | T, 0-0",
 "Final Aug 28 Men's · Army at Columbia | W, 4-2",
 "Final Aug 31 Men's · Army vs Yale | L, 0-2",
 "Final Sep 3 Men's · Army vs Stonehill | T, 2-2",
 "Final Sep 12 Men's · Army at Boston University | L, 0-4",
 "Final Sep 15 Men's · Army vs Stony Brook | L, 1-4",
 "Final Sep 19 Men's · Army at Lehigh | L, 0-1",
 "Final Oct 3 Men's · Army vs Lafayette | L, 0-1",
 "Final Oct 9 Men's · Army vs Navy | L, 3-4",
 "Final Oct 17 Men's · Army at Holy Cross | L, 0-3",
 "Final Oct 21 Men's · Army vs American | L, 0-2",
 "Upcoming Oct 25, 4:00 PM Men's · Army vs Bucknell | ",
 "Upcoming Oct 30, 6:00 PM Men's · Army vs Loyola Md. | ",
 "Upcoming Nov 3, 6:00 PM Men's · Army at Colgate | ",
 "Upcoming Nov 7 Men's · Army at Patriot League Quarterfinals | ",
 "Upcoming Nov 10 Men's · Army at Patriot League Semifinals | ",
 "Upcoming Nov 14 Men's · Army at Patriot League Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Aug 29 Women's · Army vs Kelley Lemmon Challenge (Intersquad) | Completed",
 "Final Sep 12 Women's · Army vs Bernstein Challenge (Intersquad) | Completed",
 "Final Sep 24 Women's · Army vs Marist | W, 1003-545",
 "Final Sep 24 Women's · Army vs UConn | W, 1003-779",
 "Final Oct 9 Women's · Army at Rutgers Invite | Completed",
 "Final Oct 23 Women's · Army vs Navy | L, 96-204",
 "Upcoming Nov 20 Women's · Army at Princeton Invite | ",
 "Upcoming Jan 9, 11:00 AM Women's · Army at Ice Cold Invite | ",
 "Upcoming Jan 16, 12:00 PM Women's · Army at Bucknell | ",
 "Upcoming Jan 23, 11:00 AM Women's · Army vs Loyola (Md.) | ",
 "Upcoming Feb 4 Women's · Army at Cavalier Invite | ",
 "Upcoming Feb 5 Women's · Army at Army Invite | ",
 "Upcoming Feb 17 Women's · Army at Patriot League Championships | ",
 "Upcoming Mar 17 Women's · Army at Women's NCAA Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Aug 29 Men's · Army vs Kelley Lemmon Challenge (Intersquad) | Completed",
 "Final Sep 12 Men's · Army vs Bernstein Challenge (Intersquad) | Completed",
 "Final Sep 24 Men's · Army vs Marist | W, 1080-705",
 "Final Oct 9 Men's · Army at Rutgers Invite | Completed",
 "Final Oct 23 Men's · Army vs Navy | L, 112-188",
 "Upcoming Nov 20, 10:00 AM Men's · Army at Princeton Invite | ",
 "Upcoming Jan 8, 3:00 PM Men's · Army vs Harvard | ",
 "Upcoming Jan 9, 11:00 AM Men's · Army at Ice Cold Invite | ",
 "Upcoming Jan 16, 12:00 PM Men's · Army at Bucknell | ",
 "Upcoming Jan 23, 11:00 AM Men's · Army vs Loyola (Md.) | ",
 "Upcoming Feb 4 Men's · Army at Cavalier Invite | ",
 "Upcoming Feb 5 Men's · Army at Army Invite | ",
 "Upcoming Feb 17 Men's · Army at Patriot League Championships | ",
 "Upcoming Mar 24 Men's · Army at Men's NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Army at Commander-in-Chief's Tennis Challenge | Completed",
 "Final Sep 11 Women's · Army at Quinnipiac Invite | Completed",
 "Final Sep 18 Women's · Army at UConn Invite | Completed",
 "Final Sep 19 Women's · Army at Army Invite | Completed",
 "Final Sep 25 Women's · Army at West Point Invite | Completed",
 "Final Oct 2 Women's · Army at Delaware Invite | Completed",
 "Final Oct 2 Women's · Army at Fordham Invite | Completed",
 "Final Oct 8 Women's · Army at ITA Regionals | Completed",
 "Today Oct 23 Women's · Army at Patriot League Masters Qualifier | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 11 Men's · Army at Commander-in-Chief's Tennis Challenge | Completed",
 "Final Sep 19 Men's · Army at Army Men's & Women's Invite | Completed",
 "Final Oct 3 Men's · Army at Army Invitational | Completed",
 "Today Oct 23 Men's · Army at Patriot League Masters Tournament | ",
 "Upcoming Oct 30 Men's · Army at Army Shootout | ",
 "Upcoming Nov 6 Men's · Army at FGCU Invitational | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Army vs Iowa | L, 0-3",
 "Final Aug 29 Army vs Sacred Heart | W, 3-1",
 "Final Aug 30 Army vs UAlbany | W, 3-2",
 "Final Sep 4 Army vs Sam Houston State | W, 3-0",
 "Final Sep 4 Army vs Kent State | W, 3-0",
 "Final Sep 5 Army at UT Arlington | W, 3-0",
 "Final Sep 11 Army vs Liberty | W, 3-0",
 "Final Sep 11 Army vs Fairfield | L, 0-3",
 "Final Sep 12 Army at Hofstra | L, 2-3",
 "Final Sep 18 Army vs Loyola Maryland | W, 3-1",
 "Final Sep 19 Army vs American | L, 0-3",
 "Final Sep 25 Army vs Colgate | W, 3-0",
 "Final Sep 27 Army at Holy Cross | W, 3-1",
 "Final Oct 2 Army at Bucknell | L, 1-3",
 "Final Oct 3 Army vs Lafayette | W, 3-0",
 "Final Oct 9 Army vs Navy | L, 1-3",
 "Final Oct 10 Army vs Lehigh | L, 1-3",
 "Final Oct 17 Army at Navy | L, 2-3",
 "Final Oct 23 Army at American | L, 0-3",
 "Today Oct 24, 4:00 PM Army at Loyola Maryland | ",
 "Upcoming Oct 30, 7:00 PM Army vs Holy Cross | ",
 "Upcoming Nov 1, 2:00 PM Army at Colgate | ",
 "Upcoming Nov 6, 6:00 PM Army vs Bucknell | ",
 "Upcoming Nov 8, 1:00 PM Army at Lafayette | ",
 "Upcoming Nov 13, 7:00 PM Army at Lehigh | ",
 "Upcoming Nov 17 Army at Quarterfinal Round | ",
 "Upcoming Nov 20 Army at Semifinal Round | ",
 "Upcoming Nov 22 Army at Patriot League Tournament Championship | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 1, 9:00 AM Army at Princeton Open | ",
 "Upcoming Nov 9, 6:00 PM Army at Wisconsin | ",
 "Upcoming Nov 15, 1:00 PM Army vs Air Force | ",
 "Upcoming Nov 22, 10:00 AM Army at C.J. Morgan Invitational | ",
 "Upcoming Dec 4 Army at Cliff Keen Las Vegas Invite | ",
 "Upcoming Dec 11, 7:00 PM Army at Hofstra | ",
 "Upcoming Jan 8 Army at NWCA National Duals | ",
 "Upcoming Jan 15, 6:00 PM Army at Bucknell | ",
 "Upcoming Jan 17, 1:00 PM Army at American | ",
 "Upcoming Jan 29, 7:30 PM Army at Lehigh | ",
 "Upcoming Jan 30, 6:00 PM Army vs Cornell | ",
 "Upcoming Feb 7 Army vs The Citadel | ",
 "Upcoming Feb 19, 6:00 PM Army vs Navy | ",
 "Upcoming Feb 21, 2:00 PM Army vs Morgan State | ",
 "Upcoming Mar 5 Army at EIWA Championships | ",
 "Upcoming Mar 18 Army at NCAA Wrestling Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_rifle,"Rifle rifle");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Army module checks passed");
