import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {uscSchool,USC_TFRRS_TEAMS,uscGolfStoryPlace} from '../src/schools/usc.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='usc');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,uscHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/usc-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit usctrojans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['usc'];
assert.equal(sports.length,14);
for(const [name,map] of [['schedule',uscSchool.scheduleUrls],['roster',uscSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('usc|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'usctrojans.com',`${key} must stay on usctrojans.com`);
  }
}
const parity={"Baseball":{"schedule":["https://usctrojans.com/sports/baseball/schedule"],"roster":["https://usctrojans.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://usctrojans.com/sports/mens-basketball/schedule","https://usctrojans.com/sports/womens-basketball/schedule"],"roster":["https://usctrojans.com/sports/mens-basketball/roster","https://usctrojans.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://usctrojans.com/sports/beach-volleyball/schedule"],"roster":["https://usctrojans.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://usctrojans.com/sports/cross-country/schedule"],"roster":["https://usctrojans.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://usctrojans.com/sports/football/schedule"],"roster":["https://usctrojans.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://usctrojans.com/sports/womens-golf/schedule","https://usctrojans.com/sports/mens-golf/schedule"],"roster":["https://usctrojans.com/sports/womens-golf/roster","https://usctrojans.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://usctrojans.com/sports/womens-lacrosse/schedule"],"roster":["https://usctrojans.com/sports/womens-lacrosse/roster"],"combined":false},"Rowing":{"schedule":["https://usctrojans.com/sports/womens-rowing/schedule"],"roster":["https://usctrojans.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://usctrojans.com/sports/womens-soccer/schedule"],"roster":["https://usctrojans.com/sports/womens-soccer/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://usctrojans.com/sports/womens-swimming-and-diving/schedule","https://usctrojans.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://usctrojans.com/sports/womens-swimming-and-diving/roster","https://usctrojans.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://usctrojans.com/sports/womens-tennis/schedule","https://usctrojans.com/sports/mens-tennis/schedule"],"roster":["https://usctrojans.com/sports/womens-tennis/roster","https://usctrojans.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://usctrojans.com/sports/track-and-field/schedule"],"roster":["https://usctrojans.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://usctrojans.com/sports/womens-volleyball/schedule"],"roster":["https://usctrojans.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://usctrojans.com/sports/womens-water-polo/schedule","https://usctrojans.com/sports/mens-water-polo/schedule"],"roster":["https://usctrojans.com/sports/womens-water-polo/roster","https://usctrojans.com/sports/mens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'usc|"+sport+"':"),`${sport} routes must live in the USC module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-14T15:00:00Z");
const page=slug=>`https://usctrojans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.uscHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=usc)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 9 Men's · USC vs North Carolina (Exhibition) | L, 70-88",
 "Upcoming Oct 17, 7:00 PM Men's · USC at UC San Diego (Exhibition) | ",
 "Upcoming Oct 23 Men's · USC at San Diego State (Exhibition) | ",
 "Upcoming Nov 2, 7:30 PM Men's · USC vs Milwaukee | ",
 "Upcoming Nov 8, 8:00 PM Men's · USC vs Wichita State | ",
 "Upcoming Nov 11, 8:00 PM Men's · USC at California | ",
 "Upcoming Nov 15, 4:00 PM Men's · USC vs Arkansas-Pine Bluff | ",
 "Upcoming Nov 19, 8:00 PM Men's · USC vs Tarleton State | ",
 "Upcoming Nov 22, 5:00 PM Men's · USC vs Louisiana | ",
 "Upcoming Nov 25, 1:30 PM Men's · USC vs South Carolina | ",
 "Upcoming Nov 26, 1:30 PM Men's · USC vs Utah State | ",
 "Upcoming Dec 2, 7:30 PM Men's · USC vs Washington | ",
 "Upcoming Dec 5, 1:00 PM Men's · USC at Oregon | ",
 "Upcoming Dec 8, 6:30 PM Men's · USC at San Diego | ",
 "Upcoming Dec 13, 11:00 AM Men's · USC vs Texas Tech | ",
 "Upcoming Dec 19, 1:30 PM Men's · USC vs Jacksonville | ",
 "Upcoming Dec 22, 7:00 PM Men's · USC vs Western Michigan | ",
 "Upcoming Dec 30, 3:00 PM Men's · USC at Purdue | ",
 "Upcoming Jan 2, 11:00 AM Men's · USC at Indiana | ",
 "Upcoming Jan 5, 5:00 PM Men's · USC at Maryland | ",
 "Upcoming Jan 8, 4:00 PM Men's · USC at Rutgers | ",
 "Upcoming Jan 12, 7:00 PM Men's · USC vs Michigan State | ",
 "Upcoming Jan 16, 3:00 PM Men's · USC vs Wisconsin | ",
 "Upcoming Jan 23, 12:00 PM Men's · USC vs Michigan | ",
 "Upcoming Jan 27, 6:00 PM Men's · USC at Illinois | ",
 "Upcoming Jan 30, 11:00 AM Men's · USC at Northwestern | ",
 "Upcoming Feb 3, 7:30 PM Men's · USC vs Iowa | ",
 "Upcoming Feb 6, 1:00 PM Men's · USC vs Minnesota | ",
 "Upcoming Feb 10, 7:30 PM Men's · USC at Washington | ",
 "Upcoming Feb 13, 2:30 PM Men's · USC vs UCLA | ",
 "Upcoming Feb 20, 12:00 PM Men's · USC vs Ohio State | ",
 "Upcoming Feb 23, 3:00 PM Men's · USC at Nebraska | ",
 "Upcoming Feb 27, 3:00 PM Men's · USC vs Oregon | ",
 "Upcoming Mar 2, 6:00 PM Men's · USC vs Penn State | ",
 "Upcoming Mar 6, 2:30 PM Men's · USC at UCLA | ",
 "Upcoming Mar 10 Men's · USC at Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 2:00 PM Women's · USC vs Cal (Exhibition) | ",
 "Upcoming Nov 2, 1:00 PM Women's · USC vs UNLV | ",
 "Upcoming Nov 8, 5:00 PM Women's · USC vs Utah State | ",
 "Upcoming Nov 10, 7:30 PM Women's · USC vs College of Charleston | ",
 "Upcoming Nov 15, 10:00 AM Women's · USC vs South Carolina | ",
 "Upcoming Nov 20, 8:00 PM Women's · USC vs Baylor | ",
 "Upcoming Nov 23, 7:00 PM Women's · USC vs Northern Arizona | ",
 "Upcoming Nov 27, 10:30 AM Women's · USC vs Saint Joseph's | ",
 "Upcoming Nov 29, 10:30 AM Women's · USC vs Iowa State | ",
 "Upcoming Dec 5, 3:00 PM Women's · USC at Washington | ",
 "Upcoming Dec 8, 7:00 PM Women's · USC vs Grambling State | ",
 "Upcoming Dec 13, 2:00 PM Women's · USC vs Youngstown State | ",
 "Upcoming Dec 16, 6:30 PM Women's · USC vs Miami | ",
 "Upcoming Dec 19, 8:00 PM Women's · USC vs Notre Dame | ",
 "Upcoming Dec 20, 7:00 PM Women's · USC vs Duke | ",
 "Upcoming Dec 29, 12:00 PM Women's · USC at Wisconsin | ",
 "Upcoming Jan 2, 2:00 PM Women's · USC vs Northwestern | ",
 "Upcoming Jan 5, 7:00 PM Women's · USC vs Nebraska | ",
 "Upcoming Jan 8, 5:00 PM Women's · USC at Maryland | ",
 "Upcoming Jan 11, 4:00 PM Women's · USC at Rutgers | ",
 "Upcoming Jan 15, 7:00 PM Women's · USC vs Minnesota | ",
 "Upcoming Jan 18, 1:00 PM Women's · USC vs Penn State | ",
 "Upcoming Jan 24, 9:00 AM Women's · USC at Purdue | ",
 "Upcoming Jan 27, 4:00 PM Women's · USC at Indiana | ",
 "Upcoming Jan 30, 2:30 PM Women's · USC vs Michigan | ",
 "Upcoming Feb 2, 7:00 PM Women's · USC vs Illinois | ",
 "Upcoming Feb 7, 5:00 PM Women's · USC at UCLA | ",
 "Upcoming Feb 11, 4:00 PM Women's · USC at Iowa | ",
 "Upcoming Feb 18, 7:00 PM Women's · USC vs Michigan State | ",
 "Upcoming Feb 21, 1:00 PM Women's · USC vs Ohio State | ",
 "Upcoming Feb 25, 6:30 PM Women's · USC vs UCLA | ",
 "Upcoming Feb 28, 1:00 PM Women's · USC at Oregon | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 USC at Pepperdine Waves Invite | Completed",
 "Final Sep 19 USC at UC Riverside Invitational | Completed",
 "Final Oct 3 USC at Master's University Invite | Completed",
 "Upcoming Oct 17, 8:40 AM USC at Highlander Invitational | ",
 "Upcoming Oct 30, 7:35 AM USC at Big Ten Championships | ",
 "Upcoming Nov 13 USC at NCAA West Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 USC vs San José State | W, 42-26",
 "Final Sep 4 USC vs Fresno State | W, 39-0",
 "Final Sep 12 USC vs Louisiana | W, 49-30",
 "Final Sep 19 USC at Rutgers | W, 42-35",
 "Final Sep 26 USC vs Oregon | L, 27-41",
 "Final Oct 3 USC vs Washington | W, 25-21",
 "Final Oct 10 USC at Penn State | W, 31-23",
 "Upcoming Oct 24, 4:30 PM USC at Wisconsin | ",
 "Upcoming Oct 31 USC vs Ohio State | ",
 "Upcoming Nov 14 USC at Indiana | ",
 "Upcoming Nov 21 USC vs Maryland | ",
 "Upcoming Nov 28 USC at UCLA | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · USC at Annika Intercollegiate | Completed",
 "Final Sep 21 Women's · USC at Golfweek Red Sky Classic | Completed",
 "Upcoming Oct 16 Women's · USC at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · USC at East Lake Cup | ",
 "Upcoming Jan 22 Women's · USC at Battle of LA | ",
 "Upcoming Jan 31 Women's · USC at Therese Hession Regional Challenge | ",
 "Upcoming Feb 13 Women's · USC at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Feb 22 Women's · USC at Bruin Wave Invitational | ",
 "Upcoming Mar 15 Women's · USC at GameAbove Invitational | ",
 "Upcoming Mar 25 Women's · USC at PING ASU Invitational | ",
 "Upcoming Apr 23 Women's · USC at Big Ten Women's Championships | ",
 "Upcoming May 11 Women's · USC at NCAA Regionals | ",
 "Upcoming May 21 Women's · USC at NCAA Women's Golf Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 7 Men's · USC at Bombs Darts Birds Collegiate | Completed",
 "Final Sep 14 Men's · USC at Vuori Invitational | Completed",
 "Final Oct 4 Men's · USC at Trinity Forest Invitational | Completed",
 "Upcoming Oct 16 Men's · USC at Golf Club of Georgia Intercollegiate | ",
 "Upcoming Jan 25 Men's · USC at Southwestern Invitational | ",
 "Upcoming Feb 28 Men's · USC at TPC Summerlin Invitational | ",
 "Upcoming Mar 8 Men's · USC at The Desimone Invitational | ",
 "Upcoming Mar 22 Men's · USC at Valspar Collegiate Invitational | ",
 "Upcoming Apr 5 Men's · USC at Golfweek Invitational | ",
 "Upcoming Apr 12 Men's · USC at 80th Western Intercollegiate | ",
 "Upcoming Apr 30 Men's · USC at Big Ten Men's Golf Championships | ",
 "Upcoming May 18 Men's · USC at NCAA Regionals | ",
 "Upcoming May 28 Men's · USC at NCAA Men's Golf Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 USC vs Duke | L, 1-3",
 "Final Aug 16 USC at Pepperdine | T, 1-1",
 "Final Aug 22 USC at BYU | L, 0-2",
 "Final Aug 27 USC vs New Mexico State | W, 4-0",
 "Final Aug 30 USC vs Saint Mary's | L, 0-1",
 "Final Sep 3 USC at Stanford | T, 2-2",
 "Final Sep 10 USC vs Michigan State | L, 0-5",
 "Final Sep 13 USC vs Purdue | L, 0-2",
 "Final Sep 18 USC vs Oregon | T, 1-1",
 "Final Sep 24 USC at Ohio State | L, 0-2",
 "Final Sep 27 USC at Penn State | L, 0-1",
 "Final Oct 3 USC at Washington | L, 0-1",
 "Final Oct 8 USC vs Illinois | T, 1-1",
 "Final Oct 11 USC vs Indiana | T, 2-2",
 "Upcoming Oct 17, 11:00 AM USC at Northwestern | ",
 "Upcoming Oct 22, 5:00 PM USC at Nebraska | ",
 "Upcoming Oct 25, 11:00 AM USC at Iowa | ",
 "Upcoming Oct 30, 7:00 PM USC vs UCLA | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 8 Women's · USC vs TCU | W, 228-86",
 "Upcoming Oct 17 Women's · USC at MPSF Open Water Championship (Exhibition) | ",
 "Upcoming Oct 23, 11:00 AM Women's · USC at Indiana | ",
 "Upcoming Oct 23, 11:00 AM Women's · USC vs Kentucky | ",
 "Upcoming Oct 28 Women's · USC at Short Course World Championships Selection Meet | ",
 "Upcoming Oct 31 Women's · USC vs Alumni Relays (Exhibition) | ",
 "Upcoming Nov 6, 12:00 PM Women's · USC at Arizona, Arizona State & UCLA | ",
 "Upcoming Nov 12 Women's · USC at Trojan Diving Invitational | ",
 "Upcoming Nov 18 Women's · USC at Texas Hallf of Fame Invitational | ",
 "Upcoming Nov 19 Women's · USC at Texas Hall of Fame Invitational | ",
 "Upcoming Jan 8 Women's · USC at Bruin Diving Invitational | ",
 "Upcoming Jan 15, 1:00 PM Women's · USC vs Cal | ",
 "Upcoming Jan 16, 11:30 AM Women's · USC at Stanford | ",
 "Upcoming Jan 29, 1:00 PM Women's · USC vs Nevada | ",
 "Upcoming Jan 29, 1:00 PM Women's · USC vs UC San Diego | ",
 "Upcoming Feb 5, 1:00 PM Women's · USC vs UCLA | ",
 "Upcoming Feb 17 Women's · USC at Big Ten Swimming and Diving Championships | ",
 "Upcoming Mar 8 Women's · USC at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 17 Women's · USC at NCAA Swimming and Diving Championships | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 8 Men's · USC vs TCU | W, 239-76",
 "Upcoming Oct 17 Men's · USC at MPSF Open Water Championship | ",
 "Upcoming Oct 23, 11:00 AM Men's · USC at Indiana | ",
 "Upcoming Oct 23, 11:00 AM Men's · USC vs Kentucky | ",
 "Upcoming Oct 28 Men's · USC at Short Course World Championships Selection Meet | ",
 "Upcoming Oct 31 Men's · USC vs Alumni Relays | ",
 "Upcoming Nov 6, 12:00 PM Men's · USC at Arizona & Arizona State | ",
 "Upcoming Nov 14 Men's · USC at Trojan Diving Invitational | ",
 "Upcoming Nov 18 Men's · USC at Texas Hall of Fame Invitational | ",
 "Upcoming Jan 8 Men's · USC at Bruin Diving Invitational | ",
 "Upcoming Jan 15, 1:00 PM Men's · USC at Cal | ",
 "Upcoming Jan 16, 11:30 AM Men's · USC at Stanford | ",
 "Upcoming Jan 29, 1:00 PM Men's · USC vs UC San Diego | ",
 "Upcoming Feb 5, 1:00 PM Men's · USC vs Nevada | ",
 "Upcoming Feb 24 Men's · USC at Big Ten Swimming and Diving Championships | ",
 "Upcoming Mar 4 Men's · USC at Last Chance Qualifying Meet | ",
 "Upcoming Mar 8 Men's · USC at NCAA Zone E Diving Championships | ",
 "Upcoming Mar 24 Men's · USC at NCAA Swimming and Diving Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 14 Women's · USC at UTR Pro Fall Slam | Completed",
 "Final Oct 1 Women's · USC at Battle in the Bay | Completed",
 "Final Oct 10 Women's · USC at Hall of Fame Invite | Completed",
 "Upcoming Oct 16 Women's · USC at ITA Southwest Regionals | ",
 "Upcoming Nov 5 Women's · USC at ITA Conference Masters | ",
 "Upcoming Nov 5 Women's · USC at ITA West Sectional Championships | ",
 "Upcoming Nov 17 Women's · USC at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 23 Men's · USC at ITA All-American Championships | Completed",
 "Final Sep 25 Men's · USC at Sherwood Collegiate Cup | Completed",
 "Final Oct 9 Men's · USC at UCSB Classic | Completed",
 "Upcoming Oct 15 Men's · USC at Southwest ITA Regionals | ",
 "Upcoming Nov 5 Men's · USC at SoCal Intercollegiates | ",
 "Upcoming Nov 5 Men's · USC at ITA Masters Championships | ",
 "Upcoming Nov 6 Men's · USC at ITA Sectional Championships | ",
 "Upcoming Nov 17 Men's · USC at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 15 USC at UC Irvine (Exhibition) | W, 3-1",
 "Final Aug 19 USC vs Loyola Marymount (Exhibition) | L, 2-3",
 "Final Aug 29 USC vs Arizona State | W, 3-0",
 "Final Aug 30 USC vs Creighton | L, 1-3",
 "Final Sep 2 USC at Texas | L, 0-3",
 "Final Sep 6 USC at San Diego | W, 3-0",
 "Final Sep 11 USC vs Arizona | W, 3-1",
 "Final Sep 12 USC vs Colorado | L, 1-3",
 "Final Sep 13 USC vs Oregon State | W, 3-0",
 "Final Sep 18 USC vs UC Davis | W, 3-1",
 "Final Sep 19 USC vs Pepperdine | L, 0-3",
 "Final Sep 20 USC vs UC Santa Barbara | W, 3-0",
 "Final Sep 24 USC at Northwestern | W, 3-0",
 "Final Sep 26 USC at Illinois | L, 0-3",
 "Final Oct 2 USC vs Michigan | L, 1-3",
 "Final Oct 4 USC vs Michigan State | L, 2-3",
 "Final Oct 9 USC at Purdue | L, 0-3",
 "Final Oct 11 USC at Indiana | W, 3-0",
 "Upcoming Oct 16, 7:00 PM USC vs Ohio State | ",
 "Upcoming Oct 17, 4:00 PM USC vs Penn State | ",
 "Upcoming Oct 22, 6:00 PM USC at Iowa | ",
 "Upcoming Oct 24, 8:00 PM USC at Nebraska | ",
 "Upcoming Oct 30, 7:00 PM USC vs Wisconsin | ",
 "Upcoming Nov 1, 2:00 PM USC vs Minnesota | ",
 "Upcoming Nov 5, 7:00 PM USC at Maryland | ",
 "Upcoming Nov 7, 1:00 PM USC at Rutgers | ",
 "Upcoming Nov 12, 6:00 PM USC vs Oregon | ",
 "Upcoming Nov 14, 7:00 PM USC vs Washington | ",
 "Upcoming Nov 17, 7:30 PM USC at UCLA | ",
 "Upcoming Nov 20 USC at Big Ten Volleyball Tournament | "
]);
  const v_womenswaterpolo=parse("Water Polo","womens-water-polo");
  assert.deepEqual(v_womenswaterpolo.map(line),[]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 28 USC vs Saint Mary's | W, 22-9",
 "Final Aug 29 USC vs McKendree | W, 30-5",
 "Final Aug 29 USC vs Claremont-Mudd-Scripps | W, 28-9",
 "Final Aug 30 USC vs UC Santa Barbara | W, 27-10",
 "Final Sep 4 USC at Long Beach State | W, 17-11",
 "Final Sep 6 USC vs Pepperdine | W, 17-14",
 "Final Sep 12 USC vs UC Irvine | W, 24-15",
 "Final Sep 18 USC vs California Baptist University | W, 17-13",
 "Final Sep 19 USC vs San Jose State | W, 16-7",
 "Final Sep 19 USC vs Stanford | L, 8-10",
 "Final Sep 20 USC vs California | W, 13-12",
 "Final Sep 27 USC vs Pacific | W, 15-8",
 "Final Oct 3 USC vs California | W, 15-14",
 "Final Oct 4 USC vs Stanford | L, 12-16",
 "Final Oct 10 USC vs UC San Diego | W, 15-9",
 "Upcoming Oct 17, 1:00 PM USC vs UCLA | ",
 "Upcoming Oct 24, 12:00 PM USC vs Air Force | ",
 "Upcoming Oct 31, 1:00 PM USC at Stanford | ",
 "Upcoming Nov 1, 1:00 PM USC at California | ",
 "Upcoming Nov 7, 1:00 PM USC at UC Santa Barbara | ",
 "Upcoming Nov 14, 1:00 PM USC at UCLA | ",
 "Upcoming Nov 20 USC at MPSF Tournament | ",
 "Upcoming Dec 4 USC at NCAA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_womenswaterpolo,"Water Polo womens-water-polo");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country (women only): TFRRS names the UC Riverside Invitational
// (Sep 19) "UCR XC Invite": the team's only meet that day.
{
  fromTfrrs(USC_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.opponent,e.headline,Boolean(e.meet_results_verified)]),[["Pepperdine Waves Invite","Women's team: 2nd · 42 pts",true],["UC Riverside Invitational","Women's team: 11th · 326 pts",true],["Master's University Invite","Women's team: 9th · 242 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

// Golf: the final story's headline gives the team's place; a round's
// standing does not.
{
  const title=name=>fixture(`${name}.html.gz`).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)[1];
  assert.deepEqual(['recap-2026-9-9-womens-golf-no-2-usc-womens-golf-fires-l','recap-2026-9-23-womens-golf-no-2-usc-womens-golf-wins-th','recap-2026-9-8-mens-golf-usc-mens-golf-ties-for-fifth-a','recap-2026-9-15-mens-golf-no-22-usc-mens-golf-finishes-i','recap-2026-10-6-mens-golf-usc-mens-golf-gill-place-secon','recap-2026-9-7-mens-golf-usc-mens-golf-sits-in-third-at','recap-2026-9-7-womens-golf-no-2-usc-womens-golf-tied-fo'].map(name=>uscGolfStoryPlace(title(name))),["2nd","1st","T5th","3rd","2nd",null,null]);
}

// Records equal the published ones: football 6-1 (3-1), volleyball 8-8
// (2-4), soccer 1-8-5 (0-5-3), men's water polo 13-2 (MPSF 1-1).
{
  const records=(sport,slug)=>{const group=worker.groupEvents(parse(sport,slug),now).find(g=>g.records?.length);const own=group?.records.find(r=>!r.team||slug.startsWith(r.team==="Men's"?'mens-':'womens-'))||group?.records[0];return[own?.text||null,own?.conference?.text||null];};
  assert.deepEqual([['Football','football'],['Volleyball','womens-volleyball'],['Soccer','womens-soccer'],['Water Polo','mens-water-polo']].map(([sport,slug])=>records(sport,slug)),[["6-1","3-1"],["8-8","2-4"],["1-8-5","0-5-3"],["13-2","1-1"]]);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('USC module checks passed');
