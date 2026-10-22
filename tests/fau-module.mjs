import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fauSchool} from '../src/schools/fau.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='fau');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,fauHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/fau-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fausports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['fau'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',fauSchool.scheduleUrls],['roster',fauSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('fau|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fausports.com',`${key} must stay on fausports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fausports.com/sports/baseball/schedule"],"roster":["https://fausports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fausports.com/sports/mens-basketball/schedule","https://fausports.com/sports/womens-basketball/schedule"],"roster":["https://fausports.com/sports/mens-basketball/roster","https://fausports.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://fausports.com/sports/womens-beach-volleyball/schedule"],"roster":["https://fausports.com/sports/womens-beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://fausports.com/sports/womens-track-and-field/schedule","https://fausports.com/sports/mens-cross-country/schedule"],"roster":["https://fausports.com/sports/womens-track-and-field/roster","https://fausports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://fausports.com/sports/football/schedule"],"roster":["https://fausports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://fausports.com/sports/womens-golf/schedule","https://fausports.com/sports/mens-golf/schedule"],"roster":["https://fausports.com/sports/womens-golf/roster","https://fausports.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://fausports.com/sports/womens-soccer/schedule","https://fausports.com/sports/mens-soccer/schedule"],"roster":["https://fausports.com/sports/womens-soccer/roster","https://fausports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://fausports.com/sports/softball/schedule"],"roster":["https://fausports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://fausports.com/sports/swimming-and-diving/schedule"],"roster":["https://fausports.com/sports/swimming-and-diving/roster"],"combined":false},"Tennis":{"schedule":["https://fausports.com/sports/womens-tennis/schedule","https://fausports.com/sports/mens-tennis/schedule"],"roster":["https://fausports.com/sports/womens-tennis/roster","https://fausports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://fausports.com/sports/womens-track-and-field/schedule"],"roster":["https://fausports.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://fausports.com/sports/womens-volleyball/schedule"],"roster":["https://fausports.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'fau|"+sport+"':"),`${sport} routes must live in the Florida Atlantic module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://fausports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.fauHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=fau)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 11:00 AM FAU vs Scout Day | ",
 "Upcoming Oct 31, 1:00 PM FAU at Miami (Exhibition) | ",
 "Upcoming Nov 13, 4:00 PM FAU vs Nova Southeastern (Exhibition) | ",
 "Upcoming Nov 14, 4:00 PM FAU vs Lynn (Exhibition) | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · FAU vs Keiser (Exhibition) | W, 87-76",
 "Upcoming Oct 25, 2:00 PM Men's · FAU vs The Citadel (Exhibition) | ",
 "Upcoming Nov 2 Men's · FAU vs LIU | ",
 "Upcoming Nov 6 Men's · FAU at Wright State | ",
 "Upcoming Nov 11 Men's · FAU vs William & Mary | ",
 "Upcoming Nov 14 Men's · FAU vs Coastal Georgia | ",
 "Upcoming Nov 18 Men's · FAU vs Florida Gulf Coast | ",
 "Upcoming Nov 24 Men's · FAU vs Mercer | ",
 "Upcoming Nov 29 Men's · FAU vs Davidson | ",
 "Upcoming Dec 2 Men's · FAU at FIU | ",
 "Upcoming Dec 5 Men's · FAU at St. Bonaventure | ",
 "Upcoming Dec 9 Men's · FAU vs Barry | ",
 "Upcoming Dec 12, 2:30 PM Men's · FAU vs VCU | ",
 "Upcoming Dec 18, 2:00 PM Men's · FAU vs Loyola Chicago | ",
 "Upcoming Dec 20, 6:00 PM Men's · FAU vs Colorado State | ",
 "Upcoming Dec 28 Men's · FAU vs St. Thomas (Fla.) | ",
 "Upcoming Dec 31 Men's · FAU vs Charlotte | ",
 "Upcoming Jan 3 Men's · FAU at Tulsa | ",
 "Upcoming Jan 6 Men's · FAU at North Texas | ",
 "Upcoming Jan 10 Men's · FAU vs Memphis | ",
 "Upcoming Jan 14 Men's · FAU at UAB | ",
 "Upcoming Jan 20 Men's · FAU vs Tulsa | ",
 "Upcoming Jan 23 Men's · FAU vs Rice | ",
 "Upcoming Jan 28 Men's · FAU at East Carolina | ",
 "Upcoming Jan 31 Men's · FAU vs South Florida | ",
 "Upcoming Feb 4 Men's · FAU at UTSA | ",
 "Upcoming Feb 7 Men's · FAU vs Wichita State | ",
 "Upcoming Feb 10 Men's · FAU vs Temple | ",
 "Upcoming Feb 14 Men's · FAU at Tulane | ",
 "Upcoming Feb 17 Men's · FAU at Charlotte | ",
 "Upcoming Feb 21 Men's · FAU vs North Texas | ",
 "Upcoming Feb 28 Men's · FAU at Rice | ",
 "Upcoming Mar 4 Men's · FAU at South Florida | ",
 "Upcoming Mar 7 Men's · FAU vs UAB | ",
 "Upcoming Mar 10 Men's · FAU at American Championship | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · FAU at Miami | ",
 "Upcoming Nov 7, 2:00 PM Women's · FAU vs Kennesaw State | ",
 "Upcoming Nov 11, 1:00 PM Women's · FAU vs South Alabama | ",
 "Upcoming Nov 14, 2:00 PM Women's · FAU at FGCU | ",
 "Upcoming Nov 19, 6:00 PM Women's · FAU at Florida | ",
 "Upcoming Nov 27, 2:00 PM Women's · FAU vs WKU | ",
 "Upcoming Nov 28, 2:00 PM Women's · FAU vs Buffalo | ",
 "Upcoming Dec 5, 1:00 PM Women's · FAU at FIU | ",
 "Upcoming Dec 8, 11:00 AM Women's · FAU vs Stony Brook | ",
 "Upcoming Dec 15, 6:30 PM Women's · FAU at UCF | ",
 "Upcoming Dec 19, 2:00 PM Women's · FAU vs North Florida | ",
 "Upcoming Dec 20, 2:00 PM Women's · FAU vs Kent State | ",
 "Upcoming Dec 30 Women's · FAU vs UTSA | ",
 "Upcoming Jan 3 Women's · FAU at North Texas | ",
 "Upcoming Jan 6 Women's · FAU at Rice | ",
 "Upcoming Jan 9 Women's · FAU vs Tulsa | ",
 "Upcoming Jan 13 Women's · FAU at Memphis | ",
 "Upcoming Jan 16 Women's · FAU at Tulane | ",
 "Upcoming Jan 21 Women's · FAU vs East Carolina | ",
 "Upcoming Jan 24 Women's · FAU at South Florida | ",
 "Upcoming Jan 30 Women's · FAU vs Wichita State | ",
 "Upcoming Feb 3 Women's · FAU vs Tulane | ",
 "Upcoming Feb 6 Women's · FAU at Charlotte | ",
 "Upcoming Feb 9 Women's · FAU at East Carolina | ",
 "Upcoming Feb 13 Women's · FAU vs UAB | ",
 "Upcoming Feb 17 Women's · FAU at Temple | ",
 "Upcoming Feb 24 Women's · FAU vs South Florida | ",
 "Upcoming Feb 27 Women's · FAU vs Memphis | ",
 "Upcoming Mar 3 Women's · FAU at UTSA | ",
 "Upcoming Mar 6 Women's · FAU vs Temple | ",
 "Upcoming Mar 9 Women's · FAU at American Championship | "
]);
  const v_womensbeachvolleyball=parse("Beach Volleyball","womens-beach-volleyball");
  assert.deepEqual(v_womensbeachvolleyball.map(line),[
 "Upcoming Oct 24 FAU at AVCA Collegiate Beach East Qualifier | ",
 "Upcoming Nov 6 FAU at AVCA Fall Pairs Championship | "
]);
  const v_womenstrackandfield=parse("Cross Country","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Final Sep 4 Women's · FAU at Florida Intercollegiate XC Invitational | Completed",
 "Final Sep 18 Women's · FAU at Pre-Regionals | Completed",
 "Final Oct 9 Women's · FAU at FSU XC Invitational | Completed",
 "Upcoming Oct 31 Women's · FAU at American Cross Country Championships | ",
 "Upcoming Nov 13 Women's · FAU at NCAA South Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 4 Men's · FAU at Florida Intercollegiate XC Invitational | Completed",
 "Final Sep 18 Men's · FAU at Pre-Regionals | Completed",
 "Final Oct 9 Men's · FAU at FSU XC Invitational | Completed",
 "Upcoming Oct 31 Men's · FAU at American Cross Country Championships | ",
 "Upcoming Nov 13 Men's · FAU at NCAA South Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 FAU at Florida | L, 21-66",
 "Final Sep 12 FAU vs Navy | W, 38-30",
 "Final Sep 19 FAU vs FIU | W, 16-10",
 "Final Sep 26 FAU at ULM | W, 45-17",
 "Final Oct 3 FAU vs Texas Southern | W, 66-10",
 "Final Oct 17 FAU at Army | L, 24-56",
 "Upcoming Oct 24, 12:00 PM FAU vs Rice | ",
 "Upcoming Oct 29, 7:30 PM FAU at North Texas | ",
 "Upcoming Nov 5, 8:00 PM FAU vs UTSA | ",
 "Upcoming Nov 14 FAU at Tulsa | ",
 "Upcoming Nov 21 FAU vs South Florida | ",
 "Upcoming Nov 28 FAU at East Carolina | ",
 "Upcoming Dec 5, 8:00 PM FAU at American Conference Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 18 Women's · FAU at Mason Rudolph Championship | 14th of 15",
 "Final Oct 19 Women's · FAU at Spider Invitational | T1st of 7",
 "Upcoming Oct 26 Women's · FAU at FIU Pat Bradley Invitational | ",
 "Upcoming Feb 1 Women's · FAU at CIEE Paradise Invitational | ",
 "Upcoming Feb 20 Women's · FAU at Space Coast Classic | ",
 "Upcoming Mar 6 Women's · FAU at Gators Invitational | ",
 "Upcoming Mar 25 Women's · FAU at PING/ASU Invitational | ",
 "Upcoming Apr 12 Women's · FAU at Strutting Gus Shootout | ",
 "Upcoming Apr 19 Women's · FAU at American Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 6 Men's · FAU at Myrtle Beach Golf Trips Intercollegiate | 7th of 16",
 "Final Sep 21 Men's · FAU at Florida Atlantic Invitational | 1st of 11",
 "Final Oct 5 Men's · FAU at West Bay Collegiate Invitational | 8th of 15",
 "Final Oct 18 Men's · FAU at Quail Valley Collegiate Invitational | T11th of 15",
 "Upcoming Feb 1 Men's · FAU at Sea Best Invitational | ",
 "Upcoming Feb 15 Men's · FAU at The Prestige | ",
 "Upcoming Mar 1 Men's · FAU at Sam Ryder Intercollegiate | ",
 "Upcoming Mar 12 Men's · FAU at Seminole Intercollegiate | ",
 "Upcoming Mar 30 Men's · FAU at Maridoe Collegiate | ",
 "Upcoming Apr 10 Men's · FAU at Tar Heel Intercollegiate | ",
 "Upcoming Apr 25 Men's · FAU at American Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · FAU vs FIU | T, 1-1",
 "Final Aug 16 Women's · FAU vs Miami | L, 0-3",
 "Final Aug 20 Women's · FAU at Florida State | L, 0-3",
 "Final Aug 27 Women's · FAU vs Howard | W, 7-0",
 "Final Aug 30 Women's · FAU vs Florida | T, 1-1",
 "Final Sep 3 Women's · FAU vs Jacksonville | W, 3-0",
 "Final Sep 6 Women's · FAU at Florida Gulf Coast | T, 3-3",
 "Final Sep 10 Women's · FAU at North Dakota State | T, 1-1",
 "Final Sep 13 Women's · FAU at North Dakota | L, 0-2",
 "Final Sep 17 Women's · FAU vs Charlotte | W, 3-2",
 "Final Sep 24 Women's · FAU at UAB | L, 0-1",
 "Final Sep 27 Women's · FAU vs Memphis | L, 0-5",
 "Final Oct 1 Women's · FAU vs South Florida | W, 3-0",
 "Final Oct 8 Women's · FAU at North Texas | W, 2-0",
 "Final Oct 11 Women's · FAU at Tulsa | W, 3-0",
 "Final Oct 15 Women's · FAU vs East Carolina | L, 0-1",
 "Today Oct 22, 7:00 PM Women's · FAU at Temple | ",
 "Upcoming Oct 25, 1:00 PM Women's · FAU vs Rice | ",
 "Upcoming Nov 3, 8:00 PM Women's · FAU at UTSA | ",
 "Upcoming Nov 8 Women's · FAU at American Women's Soccer Championship | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · FAU at Mercer | W, 3-0",
 "Final Aug 23 Men's · FAU vs UCF | T, 0-0",
 "Final Aug 27 Men's · FAU vs North Florida | W, 2-0",
 "Final Aug 30 Men's · FAU vs NC State | T, 3-3",
 "Final Sep 5 Men's · FAU at Cleveland State | T, 0-0",
 "Final Sep 11 Men's · FAU vs Charlotte | T, 1-1",
 "Final Sep 20 Men's · FAU at Memphis | T, 2-2",
 "Final Sep 26 Men's · FAU at Tulsa | W, 4-3",
 "Final Oct 2 Men's · FAU vs Temple | L, 1-2",
 "Final Oct 6 Men's · FAU at Florida Gulf Coast | T, 1-1",
 "Final Oct 13 Men's · FAU at Stetson | W, 3-2",
 "Final Oct 18 Men's · FAU vs Missouri State | T, 0-0",
 "Upcoming Oct 23, 7:00 PM Men's · FAU at FIU | ",
 "Upcoming Oct 28, 7:00 PM Men's · FAU vs USF | ",
 "Upcoming Nov 1, 8:00 PM Men's · FAU at UAB | ",
 "Upcoming Nov 6 Men's · FAU at American Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 30, 6:00 PM FAU vs Lynn (10 Innings) (Exhibition) | ",
 "Upcoming Oct 31, 1:00 PM FAU vs Keiser (10 Innings) (Exhibition) | ",
 "Upcoming Nov 1, 1:00 PM FAU vs Eastern Florida (10 Innings) (Exhibition) | ",
 "Upcoming Nov 6, 6:00 PM FAU vs Miami Dade (10 Innings) (Exhibition) | ",
 "Upcoming Nov 7, 1:00 PM FAU vs Florida Southwestern (10 Innings) (Exhibition) | ",
 "Upcoming Nov 13, 6:00 PM FAU at Nova Southeastern (10 Innings) (Exhibition) | ",
 "Upcoming Nov 14, 12:00 PM FAU vs Palm Beach Atlantic (10 Innings) (Exhibition) | "
]);
  const v_swimminganddiving=parse("Swimming & Diving","swimming-and-diving");
  assert.deepEqual(v_swimminganddiving.map(line),[
 "Final Sep 18 FAU at Indian River | Completed",
 "Final Sep 26 FAU vs Florida | Completed",
 "Final Oct 2 FAU at TYR Fall Classic | Completed",
 "Upcoming Oct 23, 10:00 AM FAU at Keiser | ",
 "Upcoming Nov 7, 12:00 PM FAU at South Florida Diving Invitational | ",
 "Upcoming Nov 18, 5:00 PM FAU at Patriot Invitational | ",
 "Upcoming Dec 2 FAU at Toyota U.S. Open Championships | ",
 "Upcoming Dec 9 FAU at USA Diving Winter National Championships | ",
 "Upcoming Dec 12, 8:30 AM FAU at CSCAA Open Water Championship | ",
 "Upcoming Jan 30, 11:00 AM FAU at FIU | ",
 "Upcoming Feb 17 FAU at Atlantic Sun Conference Championships | ",
 "Upcoming Feb 17 FAU at American Conference Championships | ",
 "Upcoming Mar 8 FAU at NCAA Zone B Diving Championships | ",
 "Upcoming Mar 11 FAU at CSCAA National Invitational Championships | ",
 "Upcoming Mar 17 FAU at NCAA Women's National Championships | ",
 "Upcoming Mar 24 FAU at NCAA Men's National Championships | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · FAU at Bedford Cup | Completed",
 "Final Oct 8 Women's · FAU at Regionals | Completed",
 "Today Oct 22 Women's · FAU at American Conference Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · FAU at Bedford Cup | Completed",
 "Final Oct 5 Men's · FAU at PTT | Completed",
 "Final Oct 14 Men's · FAU at Southeast Regionals | Completed",
 "Today Oct 22 Men's · FAU at American Individual Championship | ",
 "Upcoming Nov 5 Men's · FAU at ITA South Sectional Championship | ",
 "Upcoming Nov 6 Men's · FAU at Bonita Bay | ",
 "Upcoming Nov 16 Men's · FAU at PTT Miami | ",
 "Upcoming Nov 17 Men's · FAU at NCAA Individual Championships | "
]);
  const v_womenstrackandfield_trackfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield_trackfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 FAU vs Merrimack | W, 3-0",
 "Final Aug 28 FAU vs Stetson | W, 3-0",
 "Final Aug 29 FAU vs FIU | W, 3-0",
 "Final Sep 3 FAU at FGCU | L, 1-3",
 "Final Sep 4 FAU vs WVU | L, 2-3",
 "Final Sep 11 FAU at Florida | L, 1-3",
 "Final Sep 12 FAU vs Troy | W, 3-1",
 "Final Sep 13 FAU vs Dayton | L, 2-3",
 "Final Sep 18 FAU vs Alabama State | W, 3-0",
 "Final Sep 18 FAU vs Stetson | W, 3-0",
 "Final Sep 19 FAU vs Alabama State | W, 3-0",
 "Final Sep 25 FAU at North Texas | L, 2-3",
 "Final Sep 27 FAU at UTSA | W, 3-2",
 "Final Oct 2 FAU vs Temple | W, 3-1",
 "Final Oct 4 FAU vs Rice | L, 1-3",
 "Final Oct 9 FAU at Temple | W, 3-2",
 "Final Oct 11 FAU at East Carolina | W, 3-2",
 "Final Oct 16 FAU vs Tulane | W, 3-2",
 "Final Oct 18 FAU vs Charlotte | W, 3-0",
 "Final Oct 21 FAU at South Florida | L, 2-3",
 "Upcoming Oct 23, 6:00 PM FAU vs Memphis | ",
 "Upcoming Oct 30, 7:00 PM FAU at Tulsa | ",
 "Upcoming Nov 1, 1:00 PM FAU at Wichita State | ",
 "Upcoming Nov 4, 6:00 PM FAU vs South Florida | ",
 "Upcoming Nov 6, 6:00 PM FAU vs UAB | ",
 "Upcoming Nov 13, 6:00 PM FAU vs East Carolina | ",
 "Upcoming Nov 15, 1:00 PM FAU at Charlotte | ",
 "Upcoming Nov 20 FAU at American Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbeachvolleyball,"Beach Volleyball womens-beach-volleyball");
  ownRecapsOnly(v_womenstrackandfield,"Cross Country womens-track-and-field");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_swimminganddiving,"Swimming & Diving swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield_trackfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Florida Atlantic module checks passed");
