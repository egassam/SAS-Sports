import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {georgiaTechSchool,georgiaTechGolfPlace,georgiaTechGolfStoryPlace} from '../src/schools/georgia-tech.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='georgia-tech');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,georgiaTechHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/georgia-tech-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ramblinwreck.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['georgia-tech'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',georgiaTechSchool.scheduleUrls],['roster',georgiaTechSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('georgia-tech|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ramblinwreck.com',`${key} must stay on ramblinwreck.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ramblinwreck.com/sports/m-basebl/schedule"],"roster":["https://ramblinwreck.com/sports/m-basebl/roster"],"combined":false},"Basketball":{"schedule":["https://ramblinwreck.com/sports/m-baskbl/schedule","https://ramblinwreck.com/sports/w-baskbl/schedule"],"roster":["https://ramblinwreck.com/sports/m-baskbl/roster","https://ramblinwreck.com/sports/w-baskbl/roster"],"combined":true},"Cross Country":{"schedule":["https://ramblinwreck.com/sports/m-xc/schedule","https://ramblinwreck.com/sports/w-xc/schedule"],"roster":["https://ramblinwreck.com/sports/m-xc/roster","https://ramblinwreck.com/sports/w-xc/roster"],"combined":true},"Football":{"schedule":["https://ramblinwreck.com/sports/m-footbl/schedule"],"roster":["https://ramblinwreck.com/sports/m-footbl/roster"],"combined":false},"Golf":{"schedule":["https://ramblinwreck.com/sports/m-golf/schedule"],"roster":["https://ramblinwreck.com/sports/m-golf/roster"],"combined":false},"Softball":{"schedule":["https://ramblinwreck.com/sports/w-softbl/schedule"],"roster":["https://ramblinwreck.com/sports/w-softbl/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://ramblinwreck.com/sports/c-swim/schedule"],"roster":["https://ramblinwreck.com/sports/c-swim/roster"],"combined":false},"Tennis":{"schedule":["https://ramblinwreck.com/sports/m-tennis/schedule","https://ramblinwreck.com/sports/w-tennis/schedule"],"roster":["https://ramblinwreck.com/sports/m-tennis/roster","https://ramblinwreck.com/sports/w-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ramblinwreck.com/sports/m-track/schedule","https://ramblinwreck.com/sports/w-track/schedule"],"roster":["https://ramblinwreck.com/sports/m-track/roster","https://ramblinwreck.com/sports/w-track/roster"],"combined":true},"Volleyball":{"schedule":["https://ramblinwreck.com/sports/w-volley/schedule"],"roster":["https://ramblinwreck.com/sports/w-volley/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'georgia-tech|"+sport+"':"),`${sport} routes must live in the Georgia Tech module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-15T15:00:00Z");
const page=slug=>`https://ramblinwreck.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.georgiaTechHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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






// BEGIN generated (scripts/generate-module-tests.mjs --school=georgia-tech)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mbasebl=parse("Baseball","m-basebl");
  assert.deepEqual(v_mbasebl.map(line),[
 "Upcoming Oct 17, 1:00 PM Georgia Tech vs Alabama (Exhibition) | ",
 "Upcoming Oct 31, 1:00 PM Georgia Tech vs Clemson (Exhibition) | ",
 "Upcoming Nov 1, 1:00 PM Georgia Tech at Clemson (Exhibition) | ",
 "Upcoming Nov 8, 2:00 PM Georgia Tech vs Tennessee (Exhibition) | "
]);
  const v_mbaskbl=parse("Basketball","m-baskbl");
  assert.deepEqual(v_mbaskbl.map(line),[
 "Final Oct 11 Men's · Georgia Tech vs Maryland (Exhibition) | L, 70-85",
 "Upcoming Oct 24, 12:00 PM Men's · Georgia Tech at Providence College (Exhibition) | ",
 "Upcoming Nov 3, 7:00 PM Men's · Georgia Tech vs Hampton | ",
 "Upcoming Nov 6, 7:00 PM Men's · Georgia Tech vs Georgia Southern | ",
 "Upcoming Nov 10, 7:00 PM Men's · Georgia Tech vs Eastern Kentucky | ",
 "Upcoming Nov 14 Men's · Georgia Tech vs UNC Asheville | ",
 "Upcoming Nov 17, 7:00 PM Men's · Georgia Tech vs Norfolk State | ",
 "Upcoming Nov 20, 8:00 PM Men's · Georgia Tech vs Georgia | ",
 "Upcoming Nov 24, 7:00 PM Men's · Georgia Tech vs Samford | ",
 "Upcoming Nov 28 Men's · Georgia Tech vs Alcorn State | ",
 "Upcoming Dec 2, 9:15 PM Men's · Georgia Tech at Mississippi State (SEC/ACC Challenge) | ",
 "Upcoming Dec 6, 4:00 PM Men's · Georgia Tech vs Murray State | ",
 "Upcoming Dec 9, 7:00 PM Men's · Georgia Tech vs The Citadel | ",
 "Upcoming Dec 12, 12:00 PM Men's · Georgia Tech vs Florida | ",
 "Upcoming Dec 19, 3:00 PM Men's · Georgia Tech vs Butler | ",
 "Upcoming Dec 22, 7:00 PM Men's · Georgia Tech vs Longwood | ",
 "Upcoming Dec 30, 7:00 PM Men's · Georgia Tech vs Duke | ",
 "Upcoming Jan 2, 12:00 PM Men's · Georgia Tech at Syracuse | ",
 "Upcoming Jan 5, 7:00 PM Men's · Georgia Tech vs Miami | ",
 "Upcoming Jan 9, 12:30 PM Men's · Georgia Tech vs Notre Dame | ",
 "Upcoming Jan 12, 9:00 PM Men's · Georgia Tech at Clemson | ",
 "Upcoming Jan 19, 9:00 PM Men's · Georgia Tech vs NC State | ",
 "Upcoming Jan 23, 4:30 PM Men's · Georgia Tech at SMU | ",
 "Upcoming Jan 27, 8:00 PM Men's · Georgia Tech at Virginia | ",
 "Upcoming Jan 30, 12:00 PM Men's · Georgia Tech vs Louisville | ",
 "Upcoming Feb 3, 7:00 PM Men's · Georgia Tech vs Stanford | ",
 "Upcoming Feb 6, 2:15 PM Men's · Georgia Tech at North Carolina | ",
 "Upcoming Feb 9, 9:00 PM Men's · Georgia Tech at Boston College | ",
 "Upcoming Feb 16, 7:00 PM Men's · Georgia Tech vs Clemson | ",
 "Upcoming Feb 20, 8:00 PM Men's · Georgia Tech at Pittsburgh | ",
 "Upcoming Feb 23, 6:00 PM Men's · Georgia Tech at Florida State | ",
 "Upcoming Feb 27, 12:00 PM Men's · Georgia Tech vs SMU | ",
 "Upcoming Mar 3, 8:30 PM Men's · Georgia Tech at Wake Forest | ",
 "Upcoming Mar 6, 12:00 PM Men's · Georgia Tech vs Virginia Tech | ",
 "Upcoming Mar 9 Men's · Georgia Tech at ACC Tournament | "
]);
  const v_wbaskbl=parse("Basketball","w-baskbl");
  assert.deepEqual(v_wbaskbl.map(line),[
 "Upcoming Nov 2, 10:30 AM Women's · Georgia Tech vs Hofstra | ",
 "Upcoming Nov 5, 7:00 PM Women's · Georgia Tech vs Samford | ",
 "Upcoming Nov 8, 2:00 PM Women's · Georgia Tech vs West Virginia | ",
 "Upcoming Nov 12, 7:00 PM Women's · Georgia Tech vs Maryland Eastern Shore | ",
 "Upcoming Nov 15, 2:00 PM Women's · Georgia Tech vs Georgia State | ",
 "Upcoming Nov 18, 6:00 PM Women's · Georgia Tech vs Georgia | ",
 "Upcoming Nov 22, 1:00 PM Women's · Georgia Tech at Princeton | ",
 "Upcoming Nov 27, 1:30 PM Women's · Georgia Tech vs TCU | ",
 "Upcoming Nov 28, 1:30 PM Women's · Georgia Tech vs Indiana | ",
 "Upcoming Dec 3, 7:00 PM Women's · Georgia Tech at Alabama | ",
 "Upcoming Dec 6, 2:00 PM Women's · Georgia Tech vs Lipscomb | ",
 "Upcoming Dec 13, 2:00 PM Women's · Georgia Tech vs Pitt | ",
 "Upcoming Dec 17, 7:00 PM Women's · Georgia Tech at North Carolina | ",
 "Upcoming Dec 21, 1:00 PM Women's · Georgia Tech vs West Georgia | ",
 "Upcoming Dec 31, 2:00 PM Women's · Georgia Tech vs Florida State | ",
 "Upcoming Jan 3, 12:00 PM Women's · Georgia Tech at Virginia | ",
 "Upcoming Jan 7, 7:00 PM Women's · Georgia Tech vs Clemson | ",
 "Upcoming Jan 10, 4:00 PM Women's · Georgia Tech vs Wake Forest | ",
 "Upcoming Jan 14, 7:00 PM Women's · Georgia Tech at Notre Dame | ",
 "Upcoming Jan 18, 4:00 PM Women's · Georgia Tech vs NC State | ",
 "Upcoming Jan 21, 7:00 PM Women's · Georgia Tech vs SMU | ",
 "Upcoming Jan 24, 2:00 PM Women's · Georgia Tech at Boston College | ",
 "Upcoming Jan 31, 6:00 PM Women's · Georgia Tech vs Syracuse | ",
 "Upcoming Feb 4, 10:00 PM Women's · Georgia Tech at Stanford | ",
 "Upcoming Feb 7, 6:00 PM Women's · Georgia Tech at California | ",
 "Upcoming Feb 11, 8:00 PM Women's · Georgia Tech vs Duke | ",
 "Upcoming Feb 14, 2:00 PM Women's · Georgia Tech at Louisville | ",
 "Upcoming Feb 21, 2:00 PM Women's · Georgia Tech vs Virginia Tech | ",
 "Upcoming Feb 25, 7:00 PM Women's · Georgia Tech at Clemson | ",
 "Upcoming Feb 28, 2:00 PM Women's · Georgia Tech at Miami | ",
 "Upcoming Mar 3 Women's · Georgia Tech at 2027 ACC Tournament | "
]);
  const v_mxc=parse("Cross Country","m-xc");
  assert.deepEqual(v_mxc.map(line),[
 "Final Sep 4 Men's · Georgia Tech at Stan Sims XC Opener | Men's team: 2nd · 39 pts",
 "Final Sep 18 Men's · Georgia Tech at Southern Showcase | Men's team: 3rd · 124 pts",
 "Final Oct 2 Men's · Georgia Tech at Georgia Tech XC Invitational | Men's team: 1st · 20 pts",
 "Upcoming Oct 16, 9:30 AM Men's · Georgia Tech at Crimson Classic | ",
 "Upcoming Oct 30 Men's · Georgia Tech at ACC Championships | ",
 "Upcoming Nov 13 Men's · Georgia Tech at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Men's · Georgia Tech at NCAA National Championships | "
]);
  const v_wxc=parse("Cross Country","w-xc");
  assert.deepEqual(v_wxc.map(line),[
 "Final Sep 4 Women's · Georgia Tech at Stan Sims XC Opener | Women's team: 2nd · 44 pts",
 "Final Sep 18 Women's · Georgia Tech at Southern Showcase | Women's team: 8th · 231 pts",
 "Final Oct 2 Women's · Georgia Tech at Georgia Tech XC Invitational | Women's team: 1st · 25 pts",
 "Upcoming Oct 16, 10:20 AM Women's · Georgia Tech at Crimson Classic | ",
 "Upcoming Oct 30 Women's · Georgia Tech at ACC Championships | ",
 "Upcoming Nov 13 Women's · Georgia Tech at NCAA South Regional Championships | ",
 "Upcoming Nov 21 Women's · Georgia Tech at NCAA National Championships | "
]);
  const v_mfootbl=parse("Football","m-footbl");
  assert.deepEqual(v_mfootbl.map(line),[
 "Final Sep 3 Georgia Tech vs Colorado | L, 13-14",
 "Final Sep 12 Georgia Tech vs Tennessee | L, 24-45",
 "Final Sep 19 Georgia Tech vs Mercer | W, 44-11",
 "Final Sep 26 Georgia Tech at Stanford | L, 27-34",
 "Final Oct 10 Georgia Tech vs Duke | W, 28-25",
 "Upcoming Oct 17, 3:30 PM Georgia Tech at Virginia Tech | ",
 "Upcoming Oct 24, 3:30 PM Georgia Tech vs Boston College | ",
 "Upcoming Oct 31 Georgia Tech at Pitt | ",
 "Upcoming Nov 7 Georgia Tech vs Louisville | ",
 "Upcoming Nov 14 Georgia Tech at Clemson | ",
 "Upcoming Nov 21 Georgia Tech vs Wake Forest | ",
 "Upcoming Nov 28 Georgia Tech at Georgia | "
]);
  const v_mgolf=parse("Golf","m-golf");
  assert.deepEqual(v_mgolf.map(line),[
 "Final Sep 7 Georgia Tech at Folds of Honor Collegiate | Completed",
 "Final Sep 18 Georgia Tech at Olympia Fields/Fighting Illini Invitational | Completed",
 "Final Sep 28 Georgia Tech at Ben Hogan Collegiate Invitational | Completed",
 "Upcoming Oct 16 Georgia Tech at Golf Club of Georgia Collegiate Invitational | ",
 "Upcoming Oct 31 Georgia Tech at Steelwood Collegiate | ",
 "Upcoming Feb 4 Georgia Tech at Amer Ari Invitational | ",
 "Upcoming Feb 28 Georgia Tech at Cabo Collegiate | ",
 "Upcoming Mar 15 Georgia Tech at The Johnnie-O at Sea Island | ",
 "Upcoming Mar 25 Georgia Tech at The Goodwin | ",
 "Upcoming Apr 12 Georgia Tech at The Ford Collegiate | ",
 "Upcoming Apr 22 Georgia Tech at Atlantic Coast Conference Championship | ",
 "Upcoming May 17 Georgia Tech at NCAA Regionals | ",
 "Upcoming May 28 Georgia Tech at NCAA Championship | "
]);
  const v_wsoftbl=parse("Softball","w-softbl");
  assert.deepEqual(v_wsoftbl.map(line),[
 "Upcoming Oct 17, 2:00 PM Georgia Tech at Mercer (DH) | ",
 "Upcoming Oct 25, 1:00 PM Georgia Tech at Kennesaw (DH) | ",
 "Upcoming Nov 4, 5:00 PM Georgia Tech vs Georgia State (DH) | ",
 "Upcoming Nov 11, 5:00 PM Georgia Tech vs Atlanta Smoke | ",
 "Upcoming Nov 12, 5:00 PM Georgia Tech vs Atlanta Smoke | "
]);
  const v_cswim=parse("Swimming & Diving","c-swim");
  assert.deepEqual(v_cswim.map(line),[
 "Final Sep 19 Georgia Tech at Atlanta Open Water Swim | Completed",
 "Final Sep 26 Georgia Tech vs Emory | Completed",
 "Upcoming Oct 16, 8:30 AM Georgia Tech vs Florida State | ",
 "Upcoming Oct 16, 3:00 PM Georgia Tech vs South Carolina/Minnesota | ",
 "Upcoming Oct 17 Georgia Tech vs Round 3 | ",
 "Upcoming Oct 24, 9:00 AM Georgia Tech vs Alumni Meet | ",
 "Upcoming Oct 31, 11:00 AM Georgia Tech vs East Carolina | ",
 "Upcoming Oct 31, 11:00 AM Georgia Tech vs Boston College | ",
 "Upcoming Nov 19 Georgia Tech at Georgia Fall Invitational | ",
 "Upcoming Jan 8, 3:00 PM Georgia Tech vs Georgia | ",
 "Upcoming Jan 15 Georgia Tech at Duke | ",
 "Upcoming Jan 29, 2:00 PM Georgia Tech at South Carolina | ",
 "Upcoming Feb 16 Georgia Tech at ACC Championships | ",
 "Upcoming Mar 7 Georgia Tech at NCAA Zone B Diving Championship | ",
 "Upcoming Mar 17 Georgia Tech at NCAA Women's Championships | ",
 "Upcoming Mar 24 Georgia Tech at NCAA Men's Championships | "
]);
  const v_mtennis=parse("Tennis","m-tennis");
  assert.deepEqual(v_mtennis.map(line),[
 "Final Sep 11 Men's · Georgia Tech at Grizzly Invite | Completed",
 "Final Sep 13 Men's · Georgia Tech at Grizzly Invite | Completed",
 "Final Oct 2 Men's · Georgia Tech at Blue Gray National Tennis Classic | Completed",
 "Final Oct 3 Men's · Georgia Tech at Blue Gray National Tennis Classic | Completed",
 "Final Oct 14 Men's · Georgia Tech at ITA Southeast Regional Championships | Completed",
 "Today Oct 15 Men's · Georgia Tech at ITA Southeast Regional Championships | ",
 "Upcoming Oct 16 Men's · Georgia Tech at ITA Southeast Regional Championships | ",
 "Upcoming Oct 17 Men's · Georgia Tech at ITA Southeast Regional Championships | ",
 "Upcoming Oct 18 Men's · Georgia Tech at ITA Southeast Regional Championships | ",
 "Upcoming Oct 19 Men's · Georgia Tech at ITA Southeast Regional Championships | ",
 "Upcoming Nov 5 Men's · Georgia Tech at ITA South Sectional Championships | ",
 "Upcoming Nov 6 Men's · Georgia Tech at Alabama Four-in-the-Fall | ",
 "Upcoming Nov 17 Men's · Georgia Tech at NCAA Singles & Doubles Championships | "
]);
  const v_wtennis=parse("Tennis","w-tennis");
  assert.deepEqual(v_wtennis.map(line),[
 "Final Sep 11 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 12 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed",
 "Final Sep 13 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed",
 "Final Oct 8 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed",
 "Final Oct 9 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed",
 "Final Oct 10 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed",
 "Upcoming Oct 23 Women's · Georgia Tech at Rome Collegiate Invite | ",
 "Upcoming Oct 24 Women's · Georgia Tech at Rome Collegiate Invite | ",
 "Upcoming Oct 25 Women's · Georgia Tech at Rome Collegiate Invite | ",
 "Upcoming Oct 30 Women's · Georgia Tech at Roberta Alison Fall Classic | ",
 "Upcoming Oct 31 Women's · Georgia Tech at Roberta Alison Fall Classic | ",
 "Upcoming Nov 5 Women's · Georgia Tech at ITA Sectional Championships | ",
 "Upcoming Nov 6 Women's · Georgia Tech at ITA Sectional Championships | ",
 "Upcoming Nov 7 Women's · Georgia Tech at ITA Sectional Championships | ",
 "Upcoming Nov 8 Women's · Georgia Tech at ITA Sectional Championships | ",
 "Upcoming Nov 17 Women's · Georgia Tech at NCAA Individual Championships | "
]);
  const v_mtrack=parse("Track & Field","m-track");
  assert.deepEqual(v_mtrack.map(line),[]);
  const v_wtrack=parse("Track & Field","w-track");
  assert.deepEqual(v_wtrack.map(line),[]);
  const v_wvolley=parse("Volleyball","w-volley");
  assert.deepEqual(v_wvolley.map(line),[
 "Final Aug 28 Georgia Tech vs UNI | W, 3-0",
 "Final Aug 29 Georgia Tech at Iowa State | W, 3-0",
 "Final Aug 30 Georgia Tech vs Loyola | W, 3-1",
 "Final Sep 4 Georgia Tech vs Southern Indiana | W, 3-0",
 "Final Sep 5 Georgia Tech vs Campbell | W, 3-1",
 "Final Sep 6 Georgia Tech vs Xavier | W, 3-0",
 "Final Sep 8 Georgia Tech vs Oklahoma | W, 3-1",
 "Final Sep 10 Georgia Tech vs Baylor | L, 0-3",
 "Final Sep 11 Georgia Tech vs New Mexico | W, 3-0",
 "Final Sep 12 Georgia Tech at Nebraska | L, 1-3",
 "Final Sep 19 Georgia Tech at Georgia | L, 2-3",
 "Final Sep 25 Georgia Tech vs Virginia Tech | W, 3-0",
 "Final Sep 27 Georgia Tech vs Virginia | W, 3-0",
 "Final Oct 2 Georgia Tech at Duke | W, 3-1",
 "Final Oct 4 Georgia Tech at North Carolina | L, 2-3",
 "Final Oct 11 Georgia Tech at Miami | L, 2-3",
 "Upcoming Oct 16, 7:00 PM Georgia Tech vs Syracuse | ",
 "Upcoming Oct 18, 1:00 PM Georgia Tech vs Boston College | ",
 "Upcoming Oct 23, 7:00 PM Georgia Tech vs Pittsburgh | ",
 "Upcoming Oct 25, 1:30 PM Georgia Tech vs SMU | ",
 "Upcoming Oct 30, 6:30 PM Georgia Tech at Notre Dame | ",
 "Upcoming Nov 1, 1:00 PM Georgia Tech at Louisville | ",
 "Upcoming Nov 6, 7:00 PM Georgia Tech vs NC State | ",
 "Upcoming Nov 8, 1:00 PM Georgia Tech vs Wake Forest | ",
 "Upcoming Nov 13, 10:00 PM Georgia Tech at California | ",
 "Upcoming Nov 14, 10:00 PM Georgia Tech at Stanford | ",
 "Upcoming Nov 18, 7:00 PM Georgia Tech vs Clemson | ",
 "Upcoming Nov 20, 6:00 PM Georgia Tech at Clemson | ",
 "Upcoming Nov 25, 2:00 PM Georgia Tech at SMU | ",
 "Upcoming Nov 28, 3:00 PM Georgia Tech vs Stanford | "
]);
  ownRecapsOnly(v_mbasebl,"Baseball m-basebl");
  ownRecapsOnly(v_mbaskbl,"Basketball m-baskbl");
  ownRecapsOnly(v_wbaskbl,"Basketball w-baskbl");
  ownRecapsOnly(v_mxc,"Cross Country m-xc");
  ownRecapsOnly(v_wxc,"Cross Country w-xc");
  ownRecapsOnly(v_mfootbl,"Football m-footbl");
  ownRecapsOnly(v_mgolf,"Golf m-golf");
  ownRecapsOnly(v_wsoftbl,"Softball w-softbl");
  ownRecapsOnly(v_cswim,"Swimming & Diving c-swim");
  ownRecapsOnly(v_mtennis,"Tennis m-tennis");
  ownRecapsOnly(v_wtennis,"Tennis w-tennis");
  ownRecapsOnly(v_mtrack,"Track & Field m-track");
  ownRecapsOnly(v_wtrack,"Track & Field w-track");
}
// END generated

// Golf: the cards publish no place. It comes from the final story's headline
// ("Emberson, Jackets Champions at Folds of Honor Collegiate", "Jackets Finish
// Ben Hogan Collegiate Invitational in 12th"), else from its text when the
// headline is a player's ("Emberson Co-Champion at OFCC/Fighting Illini
// Invitational": "the Yellow Jackets slipped into an eighth-place finish for
// the tournament (818, -22)"; "entered the final round ... in fifth place" is
// not the finish).
{
  const h=worker.georgiaTechHandlers,listed=[];
  for(const event of parse('Golf','m-golf').filter(e=>e.status==='Final')){
    recapFixtures.set(event.recap_url,fixture(recapFile(event.recap_url)));
    if(h.isGeorgiaTechGolf(event))await h.attachGolfPlace(event);
    listed.push([line(event),event.results.map(r=>`${r.label}: ${r.value}`)]);
  }
  assert.deepEqual(listed,[["Final Sep 7 Georgia Tech at Folds of Honor Collegiate | 1st",["Result: 1st"]],["Final Sep 18 Georgia Tech at Olympia Fields/Fighting Illini Invitational | 8th",["Result: 8th","Team score: 818"]],["Final Sep 28 Georgia Tech at Ben Hogan Collegiate Invitational | 12th",["Result: 12th"]]]);
  assert.deepEqual(['Yellow Jackets Finish Third at Hogan','Jackets Tie for 5th at Puerto Rico Classic','Jackets Win Carpet Capital','Weaver Leads Jackets at Hogan','Smith Finishes 5th at Hogan'].map(georgiaTechGolfPlace),["3","T5","1",null,null]);
  assert.deepEqual(['Smith finished in eighth place. Georgia Tech placed 3rd overall.','Georgia Tech tied for fourth (850, +10).','Georgia Tech entered the final round in fifth place.'].map(georgiaTechGolfStoryPlace),[{"place":"3rd","score":null},{"place":"T4th","score":"850"},null]);
  recapFixtures.clear();requests.length=0;
}

// Women's tennis publishes one card a day and links no story; each day takes
// its own day's archive story, which names the tournament in its own words
// ("Debbie Southern Fall Classic"), the host ("at Furman Saturday") or only the
// team ("Carneiro Captures Singles Title as Jackets Wrap Opening Weekend"); the
// Hall of Fame gallery (Oct 10) is not a tennis story.
{
  const h=worker.georgiaTechHandlers,listing=fixture('w-tennis-archives.html.gz');
  recapFixtures.set('https://ramblinwreck.com/sports/w-tennis/news',listing);
  for(const [path] of listing.replace(/\\u002F/gi,'/').matchAll(/\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\/([A-Za-z0-9-]+)/g)){const [y,m,d,slug]=path.split('/').slice(2);const name=`story-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;try{recapFixtures.set(`https://ramblinwreck.com${path}`,fixture(name));}catch{}}
  const rows=[];
  for(const event of parse('Tennis','w-tennis').filter(e=>e.status==='Final')){
    if(h.isFinalWithoutStory(event))await h.attachArchiveStory(event);
    rows.push([line(event),event.recap_url||null,h.isTournamentWithoutStory(event)]);
  }
  assert.deepEqual(rows,[["Final Sep 11 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed","https://ramblinwreck.com/news/2026/09/11/jackets-secure-seven-wins-at-debbie-southern-fall-classic",false],["Final Sep 12 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed","https://ramblinwreck.com/news/2026/09/12/tech-earns-five-victories-at-furman-saturday",false],["Final Sep 13 Women's · Georgia Tech at Debbie Southern Furman Fall Classic | Completed","https://ramblinwreck.com/news/2026/09/13/carneiro-captures-singles-title-as-jackets-wrap-opening-weekend",false],["Final Oct 8 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed","https://ramblinwreck.com/news/2026/10/8/three-jackets-advance-to-singles-main-draw-at-ita-southeast-regional",false],["Final Oct 9 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed","https://ramblinwreck.com/news/2026/10/9/yellow-jackets-advance-in-main-draw-friday",false],["Final Oct 10 Women's · Georgia Tech at ITA Southeast Regional Championships | Completed","https://ramblinwreck.com/news/2026/10/10/yellow-jackets-conclude-day-three-at-the-ita-southeast-regional",false]]);
  // A day without its own story takes none from a later day that names only
  // words every tournament shares ("Fall Classic"), nor the Hall of Fame
  // gallery (Oct 10) on its own day.
  recapFixtures.clear();
  const page=(title,path)=>[`https://ramblinwreck.com${path}`,`<html><head><meta property="og:title" content="${title}"></head><body></body></html>`];
  recapFixtures.set('https://ramblinwreck.com/sports/w-tennis/news','"/news/2026/09/12/tech-fall-classic-notes" "/news/2026/10/10/gallery-2026-hall-of-fame-induction-ceremony"');
  for(const [url,body] of [page('Tech Notes from the Fall Classic','/news/2026/09/12/tech-fall-classic-notes'),page('GALLERY: Jackets at the 2026 Hall of Fame Induction Ceremony','/news/2026/10/10/gallery-2026-hall-of-fame-induction-ceremony')])recapFixtures.set(url,body);
  const days=parse('Tennis','w-tennis').filter(e=>e.status==='Final'&&/Sep 11|Oct 10/.test(e.display_time));
  for(const event of days)await h.attachArchiveStory(event);
  assert.deepEqual(days.map(e=>[e.display_time,e.recap_url||null]),[['Sep 11',null],['Oct 10',null]]);
  recapFixtures.clear();requests.length=0;
}

// Volleyball: the Nebraska card (Sep 12) pastes its box score's address onto
// its story's; the Baylor card (Sep 10) writes its 0-3 loss "L 3-0".
{
  const events=parse('Volleyball','w-volley');
  assert.equal(events.find(e=>/Nebraska/.test(e.title)).recap_url,'https://ramblinwreck.com/news/2026/09/12/ameritas-players-challenge-concludes-with-loss-to-no-1-nebraska');
  assert.equal(line(events.find(e=>/Baylor/.test(e.title))),'Final Sep 10 Georgia Tech vs Baylor | L, 0-3');
}

// Track & Field: both team pages render the schedule app with no season yet
// (Oct 15): a valid empty schedule, not a failed source; a page without the
// schedule app is still a failure.
{
  const h=worker.georgiaTechHandlers;
  for(const slug of ['m-track','w-track']){const events=h.parseSchedule(fixture(`${slug}-schedule.html.gz`),school,'Track & Field',page(slug),now);assert.ok(Array.isArray(events)&&!events.length&&h.isEmptySchedule(events),slug);}
  assert.equal(h.parseSchedule('<html><body>Service unavailable</body></html>',school,'Track & Field',page('m-track'),now),null);
}

// Swimming: the "White vs. Gold" intrasquad (Sep 18) is not listed, and the
// Atlanta Open Water Swim (Sep 19) publishes no result or story.
{
  const h=worker.georgiaTechHandlers,events=parse('Swimming & Diving','c-swim').filter(e=>e.status==='Final');
  assert.deepEqual(events.map(e=>[line(e),h.isTournamentWithoutStory(e)]),[["Final Sep 19 Georgia Tech at Atlanta Open Water Swim | Completed",true],["Final Sep 26 Georgia Tech vs Emory | Completed",false]]);
}

// Cross country: the cards give each team's place and points ("M: 2ND
// (39PTS)"); TFRRS's races replace them where it publishes the meet (the Stan
// Sims XC Opener, Sep 4, is TFRRS's "Kennesaw State Stan Sims Opener"; the
// Southern Showcase is not on TFRRS).
{
  const h=worker.georgiaTechHandlers;
  recapFixtures.set('https://www.tfrrs.org/teams/xc/GA_college_f_Georgia_Tech.html',fixture('tfrrs-team-f.html.gz'));
  recapFixtures.set('https://www.tfrrs.org/teams/xc/GA_college_m_Georgia_Tech.html',fixture('tfrrs-team-m.html.gz'));
  for(const [number,name] of [['28057','Kennesaw_State_Stan_Sims_Opener'],['28052','Georgia_Tech_XC_Invitational']])for(const url of [`https://www.tfrrs.org/results/xc/${number}/${name}`,`https://www.tfrrs.org/results/xc/${number}/${name}/`])recapFixtures.set(url,fixture(`tfrrs-${number}.html.gz`));
  const rows=[];
  for(const slug of ['w-xc','m-xc'])for(const event of parse('Cross Country',slug).filter(e=>e.status==='Final')){
    if(h.isCrossCountry(event))await h.attachMeetResults(event);
    rows.push([line(event),Boolean(event.meet_results_verified)]);
  }
  assert.deepEqual(rows,[["Final Sep 4 Women's · Georgia Tech at Stan Sims XC Opener | Women's team: 2nd · 44 pts",true],["Final Sep 18 Women's · Georgia Tech at Southern Showcase | Women's team: 8th · 231 pts",false],["Final Oct 2 Women's · Georgia Tech at Georgia Tech XC Invitational | Women's team: 1st · 25 pts",true],["Final Sep 4 Men's · Georgia Tech at Stan Sims XC Opener | Men's team: 2nd · 39 pts",true],["Final Sep 18 Men's · Georgia Tech at Southern Showcase | Men's team: 3rd · 124 pts",false],["Final Oct 2 Men's · Georgia Tech at Georgia Tech XC Invitational | Men's team: 1st · 20 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Georgia Tech module checks passed');
