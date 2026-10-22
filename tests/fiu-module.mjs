import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fiuSchool} from '../src/schools/fiu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='fiu');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,fiuHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/fiu-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fiusports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['fiu'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',fiuSchool.scheduleUrls],['roster',fiuSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('fiu|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fiusports.com',`${key} must stay on fiusports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fiusports.com/sports/baseball/schedule"],"roster":["https://fiusports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fiusports.com/sports/mens-basketball/schedule","https://fiusports.com/sports/womens-basketball/schedule"],"roster":["https://fiusports.com/sports/mens-basketball/roster","https://fiusports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://fiusports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://fiusports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://fiusports.com/sports/womens-track-and-field/schedule","https://fiusports.com/sports/mens-track-and-field/schedule"],"roster":["https://fiusports.com/sports/womens-track-and-field/roster","https://fiusports.com/sports/mens-track-and-field/roster"],"combined":true},"Football":{"schedule":["https://fiusports.com/sports/football/schedule"],"roster":["https://fiusports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://fiusports.com/sports/womens-golf/schedule"],"roster":["https://fiusports.com/sports/womens-golf/roster"],"combined":false},"Soccer":{"schedule":["https://fiusports.com/sports/womens-soccer/schedule","https://fiusports.com/sports/mens-soccer/schedule"],"roster":["https://fiusports.com/sports/womens-soccer/roster","https://fiusports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://fiusports.com/sports/softball/schedule"],"roster":["https://fiusports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://fiusports.com/sports/womens-swimming-and-diving/schedule"],"roster":["https://fiusports.com/sports/womens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://fiusports.com/sports/womens-tennis/schedule"],"roster":["https://fiusports.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://fiusports.com/sports/womens-track-and-field/schedule","https://fiusports.com/sports/mens-track-and-field/schedule"],"roster":["https://fiusports.com/sports/womens-track-and-field/roster","https://fiusports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://fiusports.com/sports/womens-volleyball/schedule"],"roster":["https://fiusports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'fiu|"+sport+"':"),`${sport} routes must live in the FIU module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://fiusports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.fiuHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=fiu)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Mar 25 FIU vs New Mexico State | ",
 "Upcoming Mar 26 FIU vs New Mexico State | ",
 "Upcoming Mar 27 FIU vs New Mexico State | ",
 "Upcoming Apr 2 FIU at Middle Tennessee | ",
 "Upcoming Apr 3 FIU at Middle Tennessee | ",
 "Upcoming Apr 4 FIU at Middle Tennessee | ",
 "Upcoming Apr 9 FIU vs Liberty | ",
 "Upcoming Apr 10 FIU vs Liberty | ",
 "Upcoming Apr 11 FIU vs Liberty | ",
 "Upcoming Apr 16 FIU at Missouri State | ",
 "Upcoming Apr 17 FIU at Missouri State | ",
 "Upcoming Apr 18 FIU at Missouri State | ",
 "Upcoming Apr 23 FIU vs Delaware | ",
 "Upcoming Apr 24 FIU vs Delaware | ",
 "Upcoming Apr 25 FIU vs Delaware | ",
 "Upcoming Apr 30 FIU vs Western Kentucky | ",
 "Upcoming May 1 FIU vs Western Kentucky | ",
 "Upcoming May 2 FIU vs Western Kentucky | ",
 "Upcoming May 7 FIU at Sam Houston | ",
 "Upcoming May 8 FIU at Sam Houston | ",
 "Upcoming May 9 FIU at Sam Houston | ",
 "Upcoming May 14 FIU at Kennesaw State | ",
 "Upcoming May 15 FIU at Kennesaw State | ",
 "Upcoming May 16 FIU at Kennesaw State | ",
 "Upcoming May 20 FIU vs Jacksonville State | ",
 "Upcoming May 21 FIU vs Jacksonville State | ",
 "Upcoming May 22 FIU vs Jacksonville State | ",
 "Upcoming May 26 FIU at CUSA Championship | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Today Oct 22, 6:00 PM Men's · FIU vs Murray State (Exhibition) | ",
 "Upcoming Oct 29, 5:00 PM Men's · FIU vs Hoopla | ",
 "Upcoming Nov 2, 7:00 PM Men's · FIU vs New College of Florida | ",
 "Upcoming Nov 6, 5:00 PM Men's · FIU vs West Florida | ",
 "Upcoming Nov 13, 7:00 PM Men's · FIU at FGCU | ",
 "Upcoming Nov 17 Men's · FIU at UAB | ",
 "Upcoming Nov 23, 1:00 PM Men's · FIU vs Long Beach State | ",
 "Upcoming Nov 24, 1:00 PM Men's · FIU vs Southern Utah | ",
 "Upcoming Nov 25, 3:30 PM Men's · FIU vs Arkansas State | ",
 "Upcoming Dec 2, 7:00 PM Men's · FIU vs Florida Atlantic | ",
 "Upcoming Dec 5, 3:00 PM Men's · FIU at Jacksonville | ",
 "Upcoming Dec 12, 6:00 PM Men's · FIU at Xavier | ",
 "Upcoming Dec 16, 7:00 PM Men's · FIU at UCF | ",
 "Upcoming Dec 20, 2:00 PM Men's · FIU vs Lehigh | ",
 "Upcoming Dec 21, 2:00 PM Men's · FIU vs Trinity College of Jacksonville | ",
 "Upcoming Dec 31, 4:00 PM Men's · FIU at New Mexico State | ",
 "Upcoming Jan 2, 3:30 PM Men's · FIU at Sam Houston | ",
 "Upcoming Jan 7, 9:00 PM Men's · FIU vs Liberty | ",
 "Upcoming Jan 9, 2:00 PM Men's · FIU vs Delaware | ",
 "Upcoming Jan 16, 2:00 PM Men's · FIU vs Missouri State | ",
 "Upcoming Jan 21, 7:30 PM Men's · FIU at Middle Tennessee | ",
 "Upcoming Jan 23, 7:00 PM Men's · FIU at Western Kentucky | ",
 "Upcoming Jan 28, 7:00 PM Men's · FIU vs Jax State | ",
 "Upcoming Jan 30, 3:00 PM Men's · FIU vs Kennesaw State | ",
 "Upcoming Feb 4, 7:00 PM Men's · FIU at Delaware | ",
 "Upcoming Feb 6, 6:00 PM Men's · FIU at Liberty | ",
 "Upcoming Feb 13, 3:00 PM Men's · FIU at Missouri State | ",
 "Upcoming Feb 18, 7:00 PM Men's · FIU vs Western Kentucky | ",
 "Upcoming Feb 20, 2:00 PM Men's · FIU vs Middle Tennessee | ",
 "Upcoming Feb 25, 7:00 PM Men's · FIU at Jax State | ",
 "Upcoming Feb 27, 2:00 PM Men's · FIU at Kennesaw State | ",
 "Upcoming Mar 4, 7:00 PM Men's · FIU vs Sam Houston | ",
 "Upcoming Mar 6, 2:00 PM Men's · FIU vs New Mexico State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 29, 5:00 PM Women's · FIU vs Hoopla | ",
 "Upcoming Nov 3, 7:00 PM Women's · FIU vs Jacksonville | ",
 "Upcoming Nov 10, 7:00 PM Women's · FIU vs Stetson | ",
 "Upcoming Nov 15 Women's · FIU at USF | ",
 "Upcoming Nov 19, 7:00 PM Women's · FIU at Miami | ",
 "Upcoming Nov 27, 11:00 AM Women's · FIU vs North Dakota | ",
 "Upcoming Nov 29, 11:00 AM Women's · FIU at FIU Thanksgiving Tournament | ",
 "Upcoming Nov 29, 1:30 PM Women's · FIU at FIU Thanksgiving Tournament | ",
 "Upcoming Dec 5, 1:00 PM Women's · FIU vs Florida Atlantic | ",
 "Upcoming Dec 12, 1:00 PM Women's · FIU at Georgia Southern | ",
 "Upcoming Dec 18, 11:00 AM Women's · FIU vs Morgan State | ",
 "Upcoming Dec 19, 11:00 AM Women's · FIU vs North Carolina Central | ",
 "Upcoming Jan 2, 12:00 PM Women's · FIU vs New Mexico State | ",
 "Upcoming Jan 4, 7:00 PM Women's · FIU vs Sam Houston | ",
 "Upcoming Jan 8, 7:00 PM Women's · FIU at Liberty | ",
 "Upcoming Jan 10, 1:00 PM Women's · FIU at Delaware | ",
 "Upcoming Jan 16, 12:00 PM Women's · FIU at Missouri State | ",
 "Upcoming Jan 21, 7:00 PM Women's · FIU vs Middle Tennessee | ",
 "Upcoming Jan 23, 1:00 PM Women's · FIU vs Western Kentucky | ",
 "Upcoming Jan 28, 7:00 PM Women's · FIU at Jacksonville State | ",
 "Upcoming Jan 30, 1:00 PM Women's · FIU at Kennesaw State | ",
 "Upcoming Feb 4, 7:00 PM Women's · FIU vs Delaware | ",
 "Upcoming Feb 6, 1:00 PM Women's · FIU vs Liberty | ",
 "Upcoming Feb 13, 1:00 PM Women's · FIU vs Missouri State | ",
 "Upcoming Feb 18, 7:30 PM Women's · FIU at Western Kentucky | ",
 "Upcoming Feb 20, 3:00 PM Women's · FIU at Middle Tennessee | ",
 "Upcoming Feb 25, 11:00 AM Women's · FIU vs Jacksonville State | ",
 "Upcoming Feb 27, 1:00 PM Women's · FIU vs Kennesaw State | ",
 "Upcoming Mar 4, 7:30 PM Women's · FIU at Sam Houston | ",
 "Upcoming Mar 6, 3:00 PM Women's · FIU at New Mexico State | ",
 "Upcoming Mar 9 Women's · FIU at Conference USA Championships | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Final Oct 3 FIU at Palm Beach State College | Completed",
 "Final Oct 3 FIU at Palm Beach Atlantic | Completed",
 "Final Oct 10 FIU at FAU Invite | Completed",
 "Upcoming Oct 24 FIU at AVCA East Qualification Tournament | ",
 "Upcoming Nov 6 FIU at AVCA Pairs Championships | "
]);
  const v_womenstrackandfield=parse("Cross Country","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Final Sep 4 Women's · FIU at UNF Intercollegiate | 6th of 19",
 "Final Sep 18 Women's · FIU at FSU Pre-Regional Invitational | 9th of 28",
 "Final Oct 16 Women's · FIU at Arturo Barrios Invitational | 38th of 48",
 "Upcoming Oct 31, 9:20 AM Women's · FIU at Conference USA Championships | ",
 "Upcoming Nov 13, 9:30 AM Women's · FIU at NCAA South Regional | "
]);
  const v_menstrackandfield=parse("Cross Country","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Final Sep 4 Men's · FIU at UNF Intercollegiate | 6th of 19",
 "Final Sep 18 Men's · FIU at FSU Pre-Regional Invitational | 14th of 23",
 "Final Oct 16 Men's · FIU at Arturo Barrios Invitational | Completed",
 "Upcoming Oct 31, 8:30 AM Men's · FIU at Conference USA Championships | ",
 "Upcoming Nov 13, 8:30 AM Men's · FIU at NCAA South Regional | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 FIU at USF | L, 9-19",
 "Final Sep 12 FIU vs Buffalo | W, 33-20",
 "Final Sep 19 FIU at Florida Atlantic | L, 10-16",
 "Final Sep 26 FIU vs LIU | W, 20-3",
 "Final Oct 7 FIU vs New Mexico State | W, 22-3",
 "Final Oct 13 FIU at Jax State | L, 24-27",
 "Final Oct 20 FIU vs Middle Tennessee | L, 23-26",
 "Upcoming Oct 31, 3:30 PM FIU at Liberty | ",
 "Upcoming Nov 7, 4:00 PM FIU vs Missouri State | ",
 "Upcoming Nov 14, 3:00 PM FIU at Delaware | ",
 "Upcoming Nov 21, 3:00 PM FIU at Kennesaw State | ",
 "Upcoming Nov 28, 2:00 PM FIU vs Sam Houston | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 13 FIU at Badger Invitational | T11th of 16",
 "Final Sep 20 FIU at Mary Fossum Invitational | T9th of 15",
 "Final Oct 4 FIU at Mercedes Benz Intercollegiate | 9th of 15",
 "Upcoming Oct 26 FIU at Pat Bradley Invitational | ",
 "Upcoming Feb 1 FIU at FAU Paradise Invitational | ",
 "Upcoming Feb 14 FIU at Spartan Suncoast Invitational | ",
 "Upcoming Mar 6 FIU at Gators Invitational | ",
 "Upcoming Mar 20 FIU at Florida State Match-Up | ",
 "Upcoming Mar 29 FIU at Coach Mo Classic | ",
 "Upcoming May 10 FIU at NCAA Regionals | ",
 "Upcoming May 21 FIU at NCAA Championships | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · FIU at Florida Atlantic | T, 1-1",
 "Final Aug 16 Women's · FIU vs Florida State | L, 0-2",
 "Final Aug 20 Women's · FIU at Duke | L, 0-4",
 "Final Aug 23 Women's · FIU vs North Florida | T, 1-1",
 "Final Aug 27 Women's · FIU at Florida Gulf Coast | T, 2-2",
 "Final Aug 30 Women's · FIU vs Howard | W, 5-1",
 "Final Sep 6 Women's · FIU vs Miami | L, 0-1",
 "Final Sep 11 Women's · FIU at Stetson | W, 3-0",
 "Final Sep 13 Women's · FIU vs Jacksonville | W, 1-0",
 "Final Sep 27 Women's · FIU at New Mexico State | L, 0-1",
 "Final Oct 1 Women's · FIU vs Delaware | L, 0-1",
 "Final Oct 4 Women's · FIU vs Jacksonville State | W, 2-1",
 "Final Oct 11 Women's · FIU at Liberty | L, 0-1",
 "Final Oct 18 Women's · FIU vs Western Kentucky | T, 1-1",
 "Today Oct 22, 8:00 PM Women's · FIU at Sam Houston | ",
 "Upcoming Oct 25, 2:00 PM Women's · FIU at Missouri State | ",
 "Upcoming Nov 1, 1:00 PM Women's · FIU vs Kennesaw State | ",
 "Upcoming Nov 8 Women's · FIU at Conference USA Tournament | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · FIU at Creighton | L, 2-6",
 "Final Aug 23 Men's · FIU at Omaha | T, 0-0",
 "Final Aug 27 Men's · FIU vs NC State | W, 2-1",
 "Final Aug 31 Men's · FIU vs St. Thomas (Fla.) | W, 2-0",
 "Final Sep 6 Men's · FIU at St. John's | L, 0-1",
 "Final Sep 11 Men's · FIU at Missouri State | L, 1-2",
 "Final Sep 19 Men's · FIU vs Drake | W, 1-0",
 "Final Sep 25 Men's · FIU vs Memphis | T, 2-2",
 "Final Sep 29 Men's · FIU at FGCU | W, 4-2",
 "Final Oct 2 Men's · FIU at USF | W, 1-0",
 "Final Oct 6 Men's · FIU vs North Florida | W, 2-0",
 "Final Oct 11 Men's · FIU vs UAB | T, 2-2",
 "Final Oct 17 Men's · FIU at Charlotte | T, 1-1",
 "Upcoming Oct 23, 7:00 PM Men's · FIU vs Florida Atlantic | ",
 "Upcoming Oct 28, 7:00 PM Men's · FIU vs Tulsa | ",
 "Upcoming Nov 1, 7:00 PM Men's · FIU at Temple | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 24, 1:00 PM FIU vs Nova Southeastern | ",
 "Upcoming Oct 30, 6:00 PM FIU vs St. Thomas | "
]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 2 Women's · FIU at TYR Fall Classic | 2nd · 1060.5 pts",
 "Upcoming Oct 23 Women's · FIU at Vanderbilt | ",
 "Upcoming Oct 24, 10:00 AM Women's · FIU at Miami | ",
 "Upcoming Oct 24, 3:00 PM Women's · FIU at Liberty | ",
 "Upcoming Nov 6 Women's · FIU at South Florida Diving Invitational | ",
 "Upcoming Nov 6, 4:00 PM Women's · FIU at Tri-Meet at NSU | ",
 "Upcoming Nov 6, 4:00 PM Women's · FIU at Tri-Meet at NSU | ",
 "Upcoming Nov 18, 11:00 AM Women's · FIU at SMU Invite | ",
 "Upcoming Dec 16, 10:00 AM Women's · FIU at Marshall | ",
 "Upcoming Dec 16, 10:00 AM Women's · FIU at Indiana State | ",
 "Upcoming Jan 6, 10:00 AM Women's · FIU at FIU Sprint Invite | ",
 "Upcoming Jan 14, 5:00 PM Women's · FIU at Miami | ",
 "Upcoming Jan 23, 11:00 AM Women's · FIU at FGCU | ",
 "Upcoming Jan 30, 11:00 AM Women's · FIU vs Florida Atlantic | ",
 "Upcoming Feb 17, 10:00 AM Women's · FIU at American Swimming & Diving Championship | ",
 "Upcoming Feb 27, 10:00 AM Women's · FIU vs Last Chance Meet | ",
 "Upcoming Mar 5 Women's · FIU at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 11 Women's · FIU at CSCAA National Invitational Championships | ",
 "Upcoming Mar 16 Women's · FIU at NCAA Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 19 FIU at ITA All-American Championship | Completed",
 "Final Sep 25 FIU at Bedford Cup | Completed",
 "Final Oct 7 FIU at ITA Regional Championship | Completed",
 "Upcoming Nov 5 FIU at ITA Sectional Championship | ",
 "Upcoming Nov 16 FIU at UTR Pro Slam | ",
 "Upcoming Nov 17 FIU at NCAA Singles and Doubles Championship | "
]);
  const v_womenstrackandfield_trackfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield_trackfield.map(line),[]);
  const v_menstrackandfield_trackfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 12 FIU at Miami (Exhibition) | W, 3-2",
 "Final Aug 22 FIU vs Barry (Exhibition) | W, 3-1",
 "Final Aug 28 FIU vs Stetson | W, 3-2",
 "Final Aug 28 FIU vs Merrimack | W, 3-0",
 "Final Aug 29 FIU at Florida Atlantic | L, 0-3",
 "Final Sep 3 FIU at North Florida | L, 1-3",
 "Final Sep 4 FIU vs Tulane | L, 2-3",
 "Final Sep 5 FIU vs Duke | L, 0-3",
 "Final Sep 11 FIU vs Hampton | W, 3-0",
 "Final Sep 11 FIU at Florida A&M | W, 3-0",
 "Final Sep 12 FIU vs Louisiana | W, 3-2",
 "Final Sep 13 FIU at Florida State | W, 3-0",
 "Final Sep 18 FIU vs Central Michigan | W, 3-0",
 "Final Sep 18 FIU vs Alabama A&M | W, 3-2",
 "Final Sep 19 FIU vs Jacksonville | W, 3-0",
 "Final Sep 25 FIU at Missouri State | L, 1-3",
 "Final Sep 26 FIU at Missouri State | L, 0-3",
 "Final Oct 2 FIU vs Kennesaw State | W, 3-2",
 "Final Oct 3 FIU vs Kennesaw State | L, 0-3",
 "Final Oct 9 FIU at Middle Tennessee | L, 1-3",
 "Final Oct 10 FIU at Middle Tennessee | L, 0-3",
 "Final Oct 16 FIU vs Liberty | W, 3-0",
 "Final Oct 17 FIU vs Liberty | W, 3-0",
 "Upcoming Oct 23, 7:00 PM FIU at Jax State | ",
 "Upcoming Oct 24, 2:00 PM FIU at Jax State | ",
 "Upcoming Oct 30, 6:00 PM FIU vs Western Kentucky | ",
 "Upcoming Oct 31, 12:00 PM FIU vs Western Kentucky | ",
 "Upcoming Nov 6, 6:00 PM FIU at Delaware | ",
 "Upcoming Nov 7, 2:00 PM FIU at Delaware | ",
 "Upcoming Nov 13, 6:00 PM FIU vs New Mexico State | ",
 "Upcoming Nov 14, 1:00 PM FIU vs New Mexico State | ",
 "Upcoming Nov 20 FIU at Conference USA Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenstrackandfield,"Cross Country womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Cross Country mens-track-and-field");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_womenstrackandfield_trackfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield_trackfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("FIU module checks passed");
