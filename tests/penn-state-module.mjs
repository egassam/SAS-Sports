import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pennStateSchool,PENN_STATE_TFRRS_TEAMS} from '../src/schools/penn-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='penn-state');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,pennStateHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/penn-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gopsusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['penn-state'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',pennStateSchool.scheduleUrls],['roster',pennStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('penn-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gopsusports.com',`${key} must stay on gopsusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://gopsusports.com/sports/baseball/schedule"],"roster":["https://gopsusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gopsusports.com/sports/mens-basketball/schedule","https://gopsusports.com/sports/womens-basketball/schedule"],"roster":["https://gopsusports.com/sports/mens-basketball/roster","https://gopsusports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gopsusports.com/sports/cross-country/schedule"],"roster":["https://gopsusports.com/sports/cross-country/roster"],"combined":false},"Fencing":{"schedule":["https://gopsusports.com/sports/fencing/schedule"],"roster":["https://gopsusports.com/sports/fencing/roster"],"combined":false},"Field Hockey":{"schedule":["https://gopsusports.com/sports/field-hockey/schedule"],"roster":["https://gopsusports.com/sports/field-hockey/roster"],"combined":false},"Football":{"schedule":["https://gopsusports.com/sports/football/schedule"],"roster":["https://gopsusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://gopsusports.com/sports/womens-golf/schedule","https://gopsusports.com/sports/mens-golf/schedule"],"roster":["https://gopsusports.com/sports/womens-golf/roster","https://gopsusports.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://gopsusports.com/sports/womens-gymnastics/schedule","https://gopsusports.com/sports/mens-gymnastics/schedule"],"roster":["https://gopsusports.com/sports/womens-gymnastics/roster","https://gopsusports.com/sports/mens-gymnastics/roster"],"combined":true},"Hockey":{"schedule":["https://gopsusports.com/sports/mens-ice-hockey/schedule","https://gopsusports.com/sports/womens-ice-hockey/schedule"],"roster":["https://gopsusports.com/sports/mens-ice-hockey/roster","https://gopsusports.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://gopsusports.com/sports/womens-lacrosse/schedule","https://gopsusports.com/sports/mens-lacrosse/schedule"],"roster":["https://gopsusports.com/sports/womens-lacrosse/roster","https://gopsusports.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://gopsusports.com/sports/womens-soccer/schedule","https://gopsusports.com/sports/mens-soccer/schedule"],"roster":["https://gopsusports.com/sports/womens-soccer/roster","https://gopsusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gopsusports.com/sports/softball/schedule"],"roster":["https://gopsusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://gopsusports.com/sports/womens-swimming-and-diving/schedule","https://gopsusports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://gopsusports.com/sports/womens-swimming-and-diving/roster","https://gopsusports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://gopsusports.com/sports/womens-tennis/schedule","https://gopsusports.com/sports/mens-tennis/schedule"],"roster":["https://gopsusports.com/sports/womens-tennis/roster","https://gopsusports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gopsusports.com/sports/track-field/schedule"],"roster":["https://gopsusports.com/sports/track-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gopsusports.com/sports/womens-volleyball/schedule","https://gopsusports.com/sports/mens-volleyball/schedule"],"roster":["https://gopsusports.com/sports/womens-volleyball/roster","https://gopsusports.com/sports/mens-volleyball/roster"],"combined":true},"Wrestling":{"schedule":["https://gopsusports.com/sports/wrestling/schedule"],"roster":["https://gopsusports.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'penn-state|"+sport+"':"),`${sport} routes must live in the Penn State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://gopsusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.pennStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected,team=null){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  // A payload goes only through its own team's board (team: "Women's").
  for(const provider of worker.liveScoreboardProviders(school,sport).filter(p=>!team||p.team_label===team))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];




// BEGIN generated (scripts/generate-module-tests.mjs --school=penn-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Today Oct 9, 5:00 PM Penn State vs St. Bonaventure (Exhibition) | ",
 "Upcoming Oct 16, 5:00 PM Penn State vs Team Ontario (Exhibition) | ",
 "Upcoming Oct 17, 2:00 PM Penn State vs Delaware (Exhibition) | ",
 "Upcoming Oct 24, 2:00 PM Penn State at Bucknell (Exhibition) | ",
 "Upcoming Oct 30, 5:00 PM Penn State vs Niagara CC (Exhibition) | ",
 "Upcoming Feb 19 Penn State vs Auburn | ",
 "Upcoming Feb 20 Penn State vs Auburn | ",
 "Upcoming Feb 21 Penn State vs Auburn | ",
 "Upcoming Mar 5, 4:00 PM Penn State vs Ole Miss | ",
 "Upcoming Mar 6, 12:00 PM Penn State vs Wake Forest | ",
 "Upcoming Mar 7, 7:30 PM Penn State vs DBU | ",
 "Upcoming Mar 12 Penn State at Washington | ",
 "Upcoming Mar 13 Penn State at Washington | ",
 "Upcoming Mar 14 Penn State at Washington | ",
 "Upcoming Mar 26 Penn State vs Michigan State | ",
 "Upcoming Mar 27 Penn State vs Michigan State | ",
 "Upcoming Mar 28 Penn State vs Michigan State | ",
 "Upcoming Apr 2 Penn State vs Maryland | ",
 "Upcoming Apr 3 Penn State vs Maryland | ",
 "Upcoming Apr 4 Penn State vs Maryland | ",
 "Upcoming Apr 9 Penn State at Iowa | ",
 "Upcoming Apr 10 Penn State at Iowa | ",
 "Upcoming Apr 11 Penn State at Iowa | ",
 "Upcoming Apr 16 Penn State at Indiana | ",
 "Upcoming Apr 17 Penn State at Indiana | ",
 "Upcoming Apr 18 Penn State at Indiana | ",
 "Upcoming Apr 23 Penn State vs Oregon | ",
 "Upcoming Apr 24 Penn State vs Oregon | ",
 "Upcoming Apr 25 Penn State vs Oregon | ",
 "Upcoming Apr 30 Penn State vs Northwestern | ",
 "Upcoming May 1 Penn State vs Northwestern | ",
 "Upcoming May 2 Penn State vs Northwestern | ",
 "Upcoming May 7 Penn State at Rutgers | ",
 "Upcoming May 8 Penn State at Rutgers | ",
 "Upcoming May 9 Penn State at Rutgers | ",
 "Upcoming May 14 Penn State vs Michigan | ",
 "Upcoming May 15 Penn State vs Michigan | ",
 "Upcoming May 16 Penn State vs Michigan | ",
 "Upcoming May 20 Penn State at Illinois | ",
 "Upcoming May 21 Penn State at Illinois | ",
 "Upcoming May 22 Penn State at Illinois | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 17 Men's · Penn State vs St. Bonaventure (Exhibition) | ",
 "Upcoming Oct 26 Men's · Penn State at Drexel (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · Penn State vs Canisius | ",
 "Upcoming Nov 5, 6:00 PM Men's · Penn State vs Chattanooga | ",
 "Upcoming Nov 8, 8:00 PM Men's · Penn State vs Pittsburgh | ",
 "Upcoming Nov 12, 6:30 PM Men's · Penn State vs Mercyhurst | ",
 "Upcoming Nov 15, 4:30 PM Men's · Penn State vs New Haven | ",
 "Upcoming Nov 18, 6:30 PM Men's · Penn State vs IU Indy | ",
 "Upcoming Nov 25, 5:00 PM Men's · Penn State vs Memphis | ",
 "Upcoming Nov 27 Men's · Penn State vs Wake Forest/Mississippi State | ",
 "Upcoming Dec 1, 7:00 PM Men's · Penn State vs UAlbany | ",
 "Upcoming Dec 8, 8:00 PM Men's · Penn State vs Nebraska | ",
 "Upcoming Dec 12, 2:00 PM Men's · Penn State at Illinois | ",
 "Upcoming Dec 16, 6:30 PM Men's · Penn State vs UT Martin | ",
 "Upcoming Dec 19, 2:30 PM Men's · Penn State vs Lafayette | ",
 "Upcoming Dec 22 Men's · Penn State vs Saint Joseph's | ",
 "Upcoming Jan 2, 2:00 PM Men's · Penn State vs Oregon | ",
 "Upcoming Jan 6, 8:30 PM Men's · Penn State at Minnesota | ",
 "Upcoming Jan 10, 12:00 PM Men's · Penn State vs Northwestern | ",
 "Upcoming Jan 13, 7:00 PM Men's · Penn State at Wisconsin | ",
 "Upcoming Jan 17, 12:00 PM Men's · Penn State at Ohio State | ",
 "Upcoming Jan 20, 6:30 PM Men's · Penn State vs Purdue | ",
 "Upcoming Jan 23, 4:00 PM Men's · Penn State at Iowa | ",
 "Upcoming Jan 26, 7:00 PM Men's · Penn State at Michigan State | ",
 "Upcoming Jan 30, 12:00 PM Men's · Penn State vs Maryland | ",
 "Upcoming Feb 2, 6:00 PM Men's · Penn State vs Indiana | ",
 "Upcoming Feb 6, 12:00 PM Men's · Penn State vs Ohio State | ",
 "Upcoming Feb 12, 9:30 PM Men's · Penn State at Nebraska | ",
 "Upcoming Feb 17, 7:00 PM Men's · Penn State vs Washington | ",
 "Upcoming Feb 20, 1:00 PM Men's · Penn State at Rutgers | ",
 "Upcoming Feb 23, 6:00 PM Men's · Penn State vs Michigan | ",
 "Upcoming Feb 27, 10:30 PM Men's · Penn State at UCLA | ",
 "Upcoming Mar 2, 9:00 PM Men's · Penn State at USC | ",
 "Upcoming Mar 7, 3:00 PM Men's · Penn State vs Rutgers | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 27, 6:00 PM Women's · Penn State vs UPJ (Exhibition) | ",
 "Upcoming Nov 2, 5:00 PM Women's · Penn State vs Cleveland State | ",
 "Upcoming Nov 7, 2:00 PM Women's · Penn State at Cincinnati | ",
 "Upcoming Nov 9 Women's · Penn State at Dayton | ",
 "Upcoming Nov 15, 6:00 PM Women's · Penn State at Arizona State | ",
 "Upcoming Nov 19, 11:00 AM Women's · Penn State vs Bowling Green | ",
 "Upcoming Nov 22, 1:00 PM Women's · Penn State vs Saint Joseph's | ",
 "Upcoming Nov 27, 5:30 PM Women's · Penn State vs Baylor | ",
 "Upcoming Nov 28 Women's · Penn State vs USF/Seton Hall | ",
 "Upcoming Dec 2, 6:00 PM Women's · Penn State vs James Madison | ",
 "Upcoming Dec 6, 4:00 PM Women's · Penn State at Michigan State | ",
 "Upcoming Dec 10, 6:00 PM Women's · Penn State vs Army | ",
 "Upcoming Dec 13, 3:00 PM Women's · Penn State at TCU | ",
 "Upcoming Dec 20, 12:00 PM Women's · Penn State vs Fordham | ",
 "Upcoming Dec 29 Women's · Penn State vs Purdue | ",
 "Upcoming Jan 1, 4:00 PM Women's · Penn State vs Oregon | ",
 "Upcoming Jan 5 Women's · Penn State at Minnesota | ",
 "Upcoming Jan 8 Women's · Penn State vs Rutgers | ",
 "Upcoming Jan 12 Women's · Penn State vs Indiana | ",
 "Upcoming Jan 15 Women's · Penn State at UCLA | ",
 "Upcoming Jan 18, 4:00 PM Women's · Penn State at USC | ",
 "Upcoming Jan 27 Women's · Penn State at Michigan | ",
 "Upcoming Jan 31 Women's · Penn State vs Ohio State | ",
 "Upcoming Feb 4, 8:00 PM Women's · Penn State at Northwestern | ",
 "Upcoming Feb 7 Women's · Penn State vs Maryland | ",
 "Upcoming Feb 10 Women's · Penn State at Rutgers | ",
 "Upcoming Feb 13 Women's · Penn State vs Washington | ",
 "Upcoming Feb 18, 6:00 PM Women's · Penn State vs Iowa | ",
 "Upcoming Feb 21 Women's · Penn State at Nebraska | ",
 "Upcoming Feb 25, 8:30 PM Women's · Penn State at Illinois | ",
 "Upcoming Feb 28 Women's · Penn State vs Wisconsin | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Penn State at Dolan Duals | Completed",
 "Final Sep 11 Penn State at Harry Groves Spiked Shoe Invitational | Completed",
 "Final Sep 26 Penn State at Princeton Fall Classic | Completed",
 "Final Oct 2 Penn State at Paul Short Run | Completed",
 "Today Oct 9 Penn State at Nuttycombe Invitational | ",
 "Upcoming Oct 16, 11:00 AM Penn State at NCAA Pre National Invitational | ",
 "Upcoming Oct 30, 10:45 AM Penn State at Big Ten Championships | ",
 "Upcoming Nov 13, 12:00 PM Penn State at NCAA Mid-Atlantic Regional Championships | ",
 "Upcoming Nov 21, 10:00 AM Penn State at NCAA Cross Country Championships | "
]);
  const v_fencing=parse("Fencing","fencing");
  assert.deepEqual(v_fencing.map(line),[
 "Upcoming Oct 25 Penn State at Nikki Franke Invitational at Temple | ",
 "Upcoming Oct 26 Penn State at Nikki Franke Invitational at Temple | ",
 "Upcoming Nov 14 Penn State at Elite Invitational | ",
 "Upcoming Nov 15 Penn State at Elite Invitational | ",
 "Upcoming Dec 6 Penn State at Brandeis Invitational | ",
 "Upcoming Jan 16 Penn State at Penn Invitational | ",
 "Upcoming Jan 17 Penn State at Penn Invitational | ",
 "Upcoming Jan 23 Penn State at Penn State Invitational | ",
 "Upcoming Jan 31 Penn State at Brian Palestis Memorial Invitational | ",
 "Upcoming Feb 6 Penn State at Duke Invitational | ",
 "Upcoming Feb 7 Penn State at Duke Invitational | ",
 "Upcoming Feb 21 Penn State at Temple Invitational | ",
 "Upcoming Mar 13 Penn State at NCAA Mid-Atlantic/South Regional Championships | ",
 "Upcoming Mar 25 Penn State at NCAA National Fencing Championships | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Penn State vs Virginia | L, 3-4",
 "Final Aug 30 Penn State vs Lock Haven | W, 8-0",
 "Final Sep 4 Penn State vs Villanova | W, 2-0",
 "Final Sep 6 Penn State vs Delaware | W, 2-1",
 "Final Sep 13 Penn State vs Princeton | L, 1-2",
 "Final Sep 17 Penn State vs Maryland | L, 1-4",
 "Final Sep 20 Penn State at Monmouth | L, 1-2",
 "Final Sep 28 Penn State at Bucknell | W, 3-0",
 "Final Oct 2 Penn State at Rutgers | W, 1-0",
 "Final Oct 4 Penn State vs Lafayette | W, 3-2",
 "Today Oct 9, 3:00 PM Penn State at Michigan State | ",
 "Upcoming Oct 11, 12:00 PM Penn State at Kent State | ",
 "Upcoming Oct 16, 5:00 PM Penn State vs Ohio State | ",
 "Upcoming Oct 18, 12:00 PM Penn State vs Michigan | ",
 "Upcoming Oct 23, 3:00 PM Penn State at Indiana | ",
 "Upcoming Oct 25, 12:00 PM Penn State at Iowa | ",
 "Upcoming Oct 30, 3:00 PM Penn State vs Northwestern | ",
 "Upcoming Nov 4 Penn State at Big Ten Quarterfinals | ",
 "Upcoming Nov 6 Penn State at Big Ten Semifinals | ",
 "Upcoming Nov 8 Penn State at Big Ten Championship | ",
 "Upcoming Nov 13 Penn State at NCAA First Round | ",
 "Upcoming Nov 15 Penn State at NCAA Second Round | ",
 "Upcoming Nov 20 Penn State at NCAA Final Four | ",
 "Upcoming Nov 22 Penn State at NCAA Championship | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Penn State vs Marshall | W, 45-0",
 "Final Sep 12 Penn State at Temple | W, 27-9",
 "Final Sep 19 Penn State vs Buffalo | W, 55-13",
 "Final Sep 26 Penn State vs Wisconsin | L, 20-24",
 "Final Oct 2 Penn State at Northwestern | L, 13-34",
 "Upcoming Oct 10, 7:30 PM Penn State vs USC | ",
 "Upcoming Oct 17, 3:30 PM Penn State at Michigan | ",
 "Upcoming Oct 31 Penn State vs Purdue | ",
 "Upcoming Nov 7 Penn State at Washington | ",
 "Upcoming Nov 14 Penn State vs Minnesota | ",
 "Upcoming Nov 21 Penn State vs Rutgers | ",
 "Upcoming Nov 28 Penn State at Maryland | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Penn State at Nittany Lion Invitational | T3rd of 18",
 "Final Sep 21 Women's · Penn State at Bettie Lou Evans Invitational | 2nd of 13",
 "Today Oct 9 Women's · Penn State at Evie Odom Invitational | ",
 "Upcoming Oct 26 Women's · Penn State at French Board Collegiate Invitational | ",
 "Upcoming Apr 23, 8:00 AM Women's · Penn State at Big Ten Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 13 Men's · Penn State at Canadian Intercollegiate | 8th of 13",
 "Final Sep 28 Men's · Penn State at Windon Memorial | 16th of 16",
 "Final Oct 5 Men's · Penn State at Cullan Brown Intercollegiate | 5th of 15",
 "Upcoming Oct 12 Men's · Penn State at Moraine Intercollegiate | ",
 "Upcoming Oct 18 Men's · Penn State at Quail Valley Intercollegiate | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensgymnastics=parse("Gymnastics","mens-gymnastics");
  assert.deepEqual(v_mensgymnastics.map(line),[]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Today Oct 9, 7:00 PM Men's · Penn State at UConn | ",
 "Upcoming Oct 10, 7:00 PM Men's · Penn State at Sacred Heart | ",
 "Upcoming Oct 16, 7:00 PM Men's · Penn State vs Quinnipiac | ",
 "Upcoming Oct 20, 6:00 PM Men's · Penn State vs Robert Morris | ",
 "Upcoming Oct 23, 7:00 PM Men's · Penn State vs Canisius | ",
 "Upcoming Oct 24, 5:00 PM Men's · Penn State vs Canisius | ",
 "Upcoming Oct 30 Men's · Penn State at Minnesota | ",
 "Upcoming Oct 31 Men's · Penn State at Minnesota | ",
 "Upcoming Nov 6 Men's · Penn State vs Notre Dame | ",
 "Upcoming Nov 7 Men's · Penn State vs Notre Dame | ",
 "Upcoming Nov 13 Men's · Penn State at Michigan | ",
 "Upcoming Nov 14 Men's · Penn State at Michigan | ",
 "Upcoming Nov 20 Men's · Penn State at Wisconsin | ",
 "Upcoming Nov 21 Men's · Penn State at Wisconsin | ",
 "Upcoming Nov 27, 5:00 PM Men's · Penn State vs Princeton | ",
 "Upcoming Dec 10, 7:00 PM Men's · Penn State at Army | ",
 "Upcoming Dec 12, 5:00 PM Men's · Penn State vs Army | ",
 "Upcoming Dec 31, 7:00 PM Men's · Penn State vs Niagara | ",
 "Upcoming Jan 2, 7:00 PM Men's · Penn State at Niagara | ",
 "Upcoming Jan 8 Men's · Penn State vs Ohio State | ",
 "Upcoming Jan 9 Men's · Penn State vs Ohio State | ",
 "Upcoming Jan 15 Men's · Penn State at Michigan State | ",
 "Upcoming Jan 16 Men's · Penn State at Michigan State | ",
 "Upcoming Jan 21 Men's · Penn State vs Wisconsin | ",
 "Upcoming Jan 22 Men's · Penn State vs Wisconsin | ",
 "Upcoming Jan 29 Men's · Penn State at Notre Dame | ",
 "Upcoming Jan 30 Men's · Penn State at Notre Dame | ",
 "Upcoming Feb 7, 2:00 PM Men's · Penn State at Robert Morris | ",
 "Upcoming Feb 12 Men's · Penn State vs Minnesota | ",
 "Upcoming Feb 13 Men's · Penn State vs Minnesota | ",
 "Upcoming Feb 19 Men's · Penn State vs Michigan State | ",
 "Upcoming Feb 20 Men's · Penn State vs Michigan State | ",
 "Upcoming Feb 26 Men's · Penn State at Ohio State | ",
 "Upcoming Feb 27 Men's · Penn State at Ohio State | ",
 "Upcoming Mar 4 Men's · Penn State vs Michigan | ",
 "Upcoming Mar 5 Men's · Penn State vs Michigan | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 24 Women's · Penn State vs Ohio State | L, 1-2",
 "Final Sep 25 Women's · Penn State vs Ohio State | L, 1-2",
 "Final Oct 2 Women's · Penn State vs Robert Morris | W, 5-3",
 "Final Oct 3 Women's · Penn State vs Robert Morris | W, 4-1",
 "Today Oct 9, 6:00 PM Women's · Penn State at Syracuse | ",
 "Upcoming Oct 10, 3:00 PM Women's · Penn State at Syracuse | ",
 "Upcoming Oct 16, 2:00 PM Women's · Penn State vs Lindenwood | ",
 "Upcoming Oct 17, 12:00 PM Women's · Penn State vs Lindenwood | ",
 "Upcoming Oct 23, 6:00 PM Women's · Penn State at St. Lawrence | ",
 "Upcoming Oct 24, 3:00 PM Women's · Penn State at St. Lawrence | ",
 "Upcoming Oct 30, 6:00 PM Women's · Penn State at RIT | ",
 "Upcoming Oct 31, 2:00 PM Women's · Penn State at RIT | ",
 "Upcoming Nov 13, 6:00 PM Women's · Penn State at Mercyhurst | ",
 "Upcoming Nov 14, 1:00 PM Women's · Penn State at Mercyhurst | ",
 "Upcoming Nov 19, 6:00 PM Women's · Penn State vs Delaware | ",
 "Upcoming Nov 20, 4:00 PM Women's · Penn State vs Delaware | ",
 "Upcoming Nov 27, 5:00 PM Women's · Penn State vs Boston College | ",
 "Upcoming Nov 28, 5:00 PM Women's · Penn State vs Minnesota | ",
 "Upcoming Dec 4, 6:00 PM Women's · Penn State vs Syracuse | ",
 "Upcoming Dec 5, 2:00 PM Women's · Penn State vs Syracuse | ",
 "Upcoming Dec 9, 6:00 PM Women's · Penn State at Princeton | ",
 "Upcoming Jan 1, 3:00 PM Women's · Penn State vs Cornell | ",
 "Upcoming Jan 2, 1:00 PM Women's · Penn State vs Cornell | ",
 "Upcoming Jan 6, 6:00 PM Women's · Penn State vs Princeton | ",
 "Upcoming Jan 15, 3:00 PM Women's · Penn State at Robert Morris | ",
 "Upcoming Jan 16, 3:00 PM Women's · Penn State at Robert Morris | ",
 "Upcoming Jan 22, 2:00 PM Women's · Penn State vs Mercyhurst | ",
 "Upcoming Jan 23, 1:00 PM Women's · Penn State vs Mercyhurst | ",
 "Upcoming Jan 29, 6:00 PM Women's · Penn State at Delaware | ",
 "Upcoming Jan 30, 2:00 PM Women's · Penn State at Delaware | ",
 "Upcoming Feb 5, 6:00 PM Women's · Penn State vs RIT | ",
 "Upcoming Feb 6, 2:00 PM Women's · Penn State vs RIT | ",
 "Upcoming Feb 12, 3:00 PM Women's · Penn State at Lindenwood | ",
 "Upcoming Feb 13, 2:00 PM Women's · Penn State at Lindenwood | ",
 "Upcoming Feb 26 Women's · Penn State at Atlantic Hockey America | ",
 "Upcoming Feb 27 Women's · Penn State at Atlantic Hockey America | ",
 "Upcoming Feb 28 Women's · Penn State at Atlantic Hockey America | ",
 "Upcoming Mar 6 Women's · Penn State at Atlantic Hockey America | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[
 "Upcoming Oct 17, 11:11 AM Women's · Penn State vs James Madison (Exhibition) | ",
 "Upcoming Oct 17, 1:33 PM Women's · Penn State vs Army (Exhibition) | ",
 "Upcoming Oct 17, 2:44 PM Women's · Penn State vs Delaware (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Women's · Penn State at Navy (Exhibition) | "
]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 16 Women's · Penn State at Notre Dame | T, 2-2",
 "Final Aug 20 Women's · Penn State at West Virginia | L, 1-2",
 "Final Aug 27 Women's · Penn State vs Bucknell | W, 5-0",
 "Final Aug 30 Women's · Penn State vs Brown | W, 6-0",
 "Final Sep 3 Women's · Penn State vs Virginia Tech | T, 1-1",
 "Final Sep 10 Women's · Penn State at Ohio State | L, 0-1",
 "Final Sep 13 Women's · Penn State vs Minnesota | W, 1-0",
 "Final Sep 18 Women's · Penn State at Maryland | W, 2-0",
 "Final Sep 24 Women's · Penn State vs Iowa | T, 1-1",
 "Final Sep 27 Women's · Penn State vs USC | W, 1-0",
 "Final Oct 3 Women's · Penn State vs Purdue | T, 2-2",
 "Final Oct 8 Women's · Penn State at Oregon | W, 1-0",
 "Upcoming Oct 11, 4:00 PM Women's · Penn State at Washington | ",
 "Upcoming Oct 17, 4:00 PM Women's · Penn State vs Rutgers | ",
 "Upcoming Oct 22, 6:00 PM Women's · Penn State at Michigan State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Penn State at Michigan | ",
 "Upcoming Oct 30, 7:00 PM Women's · Penn State vs Indiana | ",
 "Upcoming Nov 4 Women's · Penn State at Quarterfinal | ",
 "Upcoming Nov 8 Women's · Penn State at Semifinal | ",
 "Upcoming Nov 13 Women's · Penn State at Championship | ",
 "Upcoming Nov 20 Women's · Penn State at First Round | ",
 "Upcoming Nov 26 Women's · Penn State at Second Round | ",
 "Upcoming Nov 29 Women's · Penn State at Third Round | ",
 "Upcoming Dec 4 Women's · Penn State at Quarterfinal | ",
 "Upcoming Dec 10 Women's · Penn State at Women's College Cup | ",
 "Upcoming Dec 13 Women's · Penn State at Women's College Cup | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Penn State vs Mercyhurst | W, 3-2",
 "Final Aug 23 Men's · Penn State at Missouri State | L, 1-3",
 "Final Aug 28 Men's · Penn State vs Pittsburgh | L, 1-2",
 "Final Sep 4 Men's · Penn State vs Yale | W, 1-0",
 "Final Sep 11 Men's · Penn State at Washington | L, 2-4",
 "Final Sep 18 Men's · Penn State vs Michigan State | L, 0-1",
 "Final Sep 25 Men's · Penn State at Indiana | L, 1-2",
 "Final Sep 28 Men's · Penn State vs UCLA | L, 2-4",
 "Final Oct 2 Men's · Penn State vs Ohio State | L, 1-2",
 "Today Oct 9, 7:00 PM Men's · Penn State at Michigan | ",
 "Upcoming Oct 16, 7:30 PM Men's · Penn State at Northwestern | ",
 "Upcoming Oct 20, 7:00 PM Men's · Penn State vs Rutgers | ",
 "Upcoming Oct 24, 7:00 PM Men's · Penn State vs Wisconsin | ",
 "Upcoming Oct 28, 7:00 PM Men's · Penn State vs Duquesne | ",
 "Upcoming Nov 4, 7:00 PM Men's · Penn State at Maryland | ",
 "Upcoming Nov 8 Men's · Penn State at Big Ten Quarterfinals | ",
 "Upcoming Nov 11 Men's · Penn State at Big Ten Semifinals | ",
 "Upcoming Nov 15 Men's · Penn State at Big Ten Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 16, 4:00 PM Penn State vs West Liberty | ",
 "Upcoming Oct 17, 4:30 PM Penn State vs Army (Exhibition) | ",
 "Upcoming Oct 18, 11:30 AM Penn State vs Virginia (Exhibition) | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · Penn State vs Liberty | L, 111-240",
 "Final Oct 2 Women's · Penn State vs Virginia Tech | L, 41-312",
 "Upcoming Oct 16, 10:30 AM Women's · Penn State vs Kentucky | ",
 "Upcoming Oct 16, 5:00 PM Women's · Penn State vs Auburn or George Washington | ",
 "Upcoming Oct 17 Women's · Penn State vs TBD | ",
 "Upcoming Oct 30, 4:30 PM Women's · Penn State vs Pitt | ",
 "Upcoming Nov 6, 4:30 PM Women's · Penn State vs Villanova | ",
 "Upcoming Nov 17, 9:30 AM Women's · Penn State at Ohio State Invitational | ",
 "Upcoming Dec 5, 11:00 AM Women's · Penn State vs Virginia | ",
 "Upcoming Dec 10 Women's · Penn State at Diving Nationals | ",
 "Upcoming Jan 8 Women's · Penn State at Buffalo Diving Invite | ",
 "Upcoming Jan 8 Women's · Penn State at Yale | ",
 "Upcoming Jan 30, 12:00 PM Women's · Penn State vs West Virginia | ",
 "Upcoming Feb 17 Women's · Penn State at Big Ten Championships | ",
 "Upcoming Feb 27 Women's · Penn State at Last Chance Meet | ",
 "Upcoming Mar 8 Women's · Penn State at NCAA Diving Zones | ",
 "Upcoming Mar 17 Women's · Penn State at NCAA Championships | ",
 "Upcoming Apr 24 Women's · Penn State at Fort Lauderdale Open | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 2 Men's · Penn State vs West Virginia | L, 141-212",
 "Final Oct 2 Men's · Penn State at Virginia Tech | Completed",
 "Upcoming Oct 16, 10:30 AM Men's · Penn State vs Kentucky | ",
 "Upcoming Oct 16, 5:00 PM Men's · Penn State vs Auburn/George Washington | ",
 "Upcoming Oct 17 Men's · Penn State vs TBD | ",
 "Upcoming Oct 30, 4:30 PM Men's · Penn State vs Pitt | ",
 "Upcoming Nov 6, 4:30 PM Men's · Penn State vs Villanova | ",
 "Upcoming Nov 17, 9:30 AM Men's · Penn State at Ohio State Invitational | ",
 "Upcoming Dec 5, 11:00 AM Men's · Penn State vs Virginia | ",
 "Upcoming Dec 10 Men's · Penn State at Diving Nationals | ",
 "Upcoming Jan 8 Men's · Penn State at Buffalo Diving Invite | ",
 "Upcoming Jan 8 Men's · Penn State at Yale | ",
 "Upcoming Jan 30, 12:00 PM Men's · Penn State vs West Virginia | ",
 "Upcoming Feb 24 Men's · Penn State at Big Ten Championships | ",
 "Upcoming Mar 6 Men's · Penn State at Last Chance Meet | ",
 "Upcoming Mar 8 Men's · Penn State at NCAA Diving Zones | ",
 "Upcoming Mar 24 Men's · Penn State at NCAA Championships | ",
 "Upcoming Apr 21 Men's · Penn State at Fort Lauderdale Open | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 Women's · Penn State at ITA All-American Championships | Completed",
 "Final Oct 2 Women's · Penn State at Martha Thorn Invitational | Completed",
 "Upcoming Oct 15 Women's · Penn State at ITA Regional Championships | ",
 "Upcoming Nov 5 Women's · Penn State at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Penn State at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 19 Men's · Penn State at ITA All-American Championships | Completed",
 "Final Oct 2 Men's · Penn State at Penn State Men's Tennis Invitational | Completed",
 "Upcoming Oct 15 Men's · Penn State at ITA Regional Championships | ",
 "Upcoming Oct 29 Men's · Penn State at Big Ten Indoor Championships | ",
 "Upcoming Nov 5 Men's · Penn State at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · Penn State at NCAA Individual Championships | "
]);
  const v_trackfield=parse("Track & Field","track-field");
  assert.deepEqual(v_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Women's · Penn State vs UConn | W, 3-0",
 "Final Aug 30 Women's · Penn State vs High Point | W, 3-2",
 "Final Aug 30 Women's · Penn State vs Hofstra | W, 3-0",
 "Final Sep 6 Women's · Penn State vs Kentucky | L, 1-3",
 "Final Sep 7 Women's · Penn State at DePaul | W, 3-0",
 "Final Sep 11 Women's · Penn State vs Stanford | W, 3-0",
 "Final Sep 12 Women's · Penn State vs Ohio | W, 3-0",
 "Final Sep 15 Women's · Penn State vs Villanova | W, 3-1",
 "Final Sep 18 Women's · Penn State vs South Florida | W, 3-0",
 "Final Sep 20 Women's · Penn State vs Tennessee | L, 1-3",
 "Final Sep 25 Women's · Penn State at Michigan | W, 3-1",
 "Final Sep 27 Women's · Penn State at Michigan State | L, 1-3",
 "Final Oct 1 Women's · Penn State vs Nebraska | L, 0-3",
 "Final Oct 3 Women's · Penn State vs Iowa | W, 3-1",
 "Today Oct 9, 7:30 PM Women's · Penn State vs Northwestern | ",
 "Upcoming Oct 11, 12:00 PM Women's · Penn State vs Washington | ",
 "Upcoming Oct 16, 10:00 PM Women's · Penn State at UCLA | ",
 "Upcoming Oct 17, 7:00 PM Women's · Penn State at Southern California | ",
 "Upcoming Oct 23, 7:00 PM Women's · Penn State vs Oregon | ",
 "Upcoming Oct 25, 3:00 PM Women's · Penn State at Indiana | ",
 "Upcoming Oct 29, 7:00 PM Women's · Penn State vs Ohio State | ",
 "Upcoming Oct 31 Women's · Penn State vs Purdue | ",
 "Upcoming Nov 6, 7:00 PM Women's · Penn State at Minnesota | ",
 "Upcoming Nov 8 Women's · Penn State at Wisconsin | ",
 "Upcoming Nov 11, 7:00 PM Women's · Penn State at Maryland | ",
 "Upcoming Nov 14, 7:00 PM Women's · Penn State at Illinois | ",
 "Upcoming Nov 17, 7:00 PM Women's · Penn State vs Rutgers | ",
 "Upcoming Nov 20 Women's · Penn State at Big Ten Tournament | "
]);
  const v_mensvolleyball=parse("Volleyball","mens-volleyball");
  assert.deepEqual(v_mensvolleyball.map(line),[]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[
 "Upcoming Nov 12 Penn State vs Bloomsburg | ",
 "Upcoming Nov 15 Penn State at Oklahoma | ",
 "Upcoming Nov 22 Penn State at Black Knight Invite | ",
 "Upcoming Dec 6 Penn State at Lehigh | ",
 "Upcoming Dec 13 Penn State vs West Virginia | ",
 "Upcoming Dec 20 Penn State vs Oregon State | ",
 "Upcoming Dec 20 Penn State vs Duke | ",
 "Upcoming Dec 20 Penn State at Binghamton | ",
 "Upcoming Jan 9 Penn State at Rutgers | ",
 "Upcoming Jan 15 Penn State vs Michigan | ",
 "Upcoming Jan 17 Penn State vs Maryland | ",
 "Upcoming Jan 22 Penn State at Michigan State | ",
 "Upcoming Jan 24 Penn State vs Wisconsin | ",
 "Upcoming Jan 29 Penn State at Minnesota | ",
 "Upcoming Feb 5 Penn State vs Iowa | ",
 "Upcoming Feb 12 Penn State at Ohio State | ",
 "Upcoming Feb 19 Penn State vs Northern Colorado | ",
 "Upcoming Mar 6 Penn State at Big Ten Championships | ",
 "Upcoming Mar 18 Penn State at NCAA Championships | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_fencing,"Fencing fencing");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensgymnastics,"Gymnastics mens-gymnastics");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackfield,"Track & Field track-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_mensvolleyball,"Volleyball mens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: one card per meet for both teams; both TFRRS team pages are
// read. The card's own line agrees: Dolan Duals "1st - Women; 1st - Men",
// Spiked Shoe "2nd - Women; 3rd Men", Princeton "7th - Women", Paul Short
// "2nd - Men" (the men ran the Gold race alone).
{
  fromTfrrs(PENN_STATE_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.team_label||null,e.opponent,e.headline,Boolean(e.meet_results_verified)]),[[null,"Dolan Duals","Women's team: 1st · 15 pts / Men's team: 1st · 15 pts",true],[null,"Harry Groves Spiked Shoe Invitational","Women's team: 2nd · 36 pts / Men's team: 3rd · 94 pts",true],[null,"Princeton Fall Classic","Women's team: 7th · 222 pts",true],[null,"Paul Short Run","Men's team: 2nd · 129 pts",true]]);
  // A race with a team score is listed first (Paul Short: the Gold race, not the 8K Open).
  assert.deepEqual(xc.map(e=>e.results[0].participant+' '+e.results[0].result),["Penn State team 1st · 15 pts","Penn State team 2nd · 36 pts","Penn State team 7th · 222 pts","Penn State team 2nd · 129 pts"]);
  recapFixtures.clear();requests.length=0;
}

// Records: each page publishes its Overall and Conf. records; the app counts
// its own from the finals and the cards' conference logos (women's hockey's
// are Atlantic Hockey America's: Ohio State, Sep 24-25, is non-conference).
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  const published=slug=>{const raw=fixture(`${slug}-schedule.html.gz`).replace(/ data-v-\w+/g,''),stat=label=>(raw.match(new RegExp(`schedule-statistics-item__label">${label}</span><strong class="schedule-statistics-item__value">([^<]*)`))||[])[1]||null;return[stat('Overall'),stat('Conf\\.')];};
  const pages=[['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Soccer','mens-soccer'],['Field Hockey','field-hockey'],['Hockey','womens-ice-hockey']];
  assert.deepEqual(pages.map(([sport,slug])=>[slug,...records(sport,slug)]),pages.map(([,slug])=>[slug,...published(slug)]));
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Penn State module checks passed');
