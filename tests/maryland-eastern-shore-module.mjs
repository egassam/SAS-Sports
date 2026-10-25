import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {marylandEasternShoreSchool} from '../src/schools/maryland-eastern-shore.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='maryland-eastern-shore');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,marylandEasternShoreHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/maryland-eastern-shore-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit umeshawksports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['maryland-eastern-shore'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',marylandEasternShoreSchool.scheduleUrls],['roster',marylandEasternShoreSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('maryland-eastern-shore|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'umeshawksports.com',`${key} must stay on umeshawksports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://umeshawksports.com/sports/baseball/schedule"],"roster":["https://umeshawksports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://umeshawksports.com/sports/mens-basketball/schedule","https://umeshawksports.com/sports/womens-basketball/schedule"],"roster":["https://umeshawksports.com/sports/mens-basketball/roster","https://umeshawksports.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://umeshawksports.com/sports/womens-bowling/schedule"],"roster":["https://umeshawksports.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://umeshawksports.com/sports/womens-cross-country/schedule","https://umeshawksports.com/sports/mens-cross-country/schedule"],"roster":["https://umeshawksports.com/sports/womens-cross-country/roster","https://umeshawksports.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://umeshawksports.com/sports/womens-golf/schedule","https://umeshawksports.com/sports/mens-golf/schedule"],"roster":["https://umeshawksports.com/sports/womens-golf/roster","https://umeshawksports.com/sports/mens-golf/roster"],"combined":true},"Softball":{"schedule":["https://umeshawksports.com/sports/softball/schedule"],"roster":["https://umeshawksports.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://umeshawksports.com/sports/womens-indoor-track/schedule","https://umeshawksports.com/sports/mens-indoor-track/schedule","https://umeshawksports.com/sports/wot/schedule","https://umeshawksports.com/sports/mot/schedule"],"roster":["https://umeshawksports.com/sports/womens-indoor-track/roster","https://umeshawksports.com/sports/mens-indoor-track/roster","https://umeshawksports.com/sports/wot/roster","https://umeshawksports.com/sports/mot/roster"],"combined":true},"Volleyball":{"schedule":["https://umeshawksports.com/sports/womens-volleyball/schedule"],"roster":["https://umeshawksports.com/sports/womens-volleyball/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'maryland-eastern-shore|"+sport+"':"),`${sport} routes must live in the Maryland Eastern Shore module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://umeshawksports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.marylandEasternShoreHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=maryland-eastern-shore)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2 Men's · UMES at Wake Forest | ",
 "Upcoming Nov 4, 7:00 PM Men's · UMES at High Point | ",
 "Upcoming Nov 7, 4:30 PM Men's · UMES vs Cheyney University of Pennsylvania | Homecoming | ",
 "Upcoming Nov 10 Men's · UMES at Boston College | ",
 "Upcoming Nov 12, 7:00 PM Men's · UMES at Rhode Island | ",
 "Upcoming Nov 17 Men's · UMES at DePaul | ",
 "Upcoming Nov 20, 12:00 PM Men's · UMES vs Bloomfield College | ",
 "Upcoming Nov 22 Men's · UMES vs IU Indy | ",
 "Upcoming Nov 23 Men's · UMES at Youngstown State | ",
 "Upcoming Nov 29, 3:00 PM Men's · UMES at Longwood | ",
 "Upcoming Dec 2 Men's · UMES at Stony Brook | ",
 "Upcoming Dec 5, 2:00 PM Men's · UMES vs North Carolina A&T State | ",
 "Upcoming Dec 10 Men's · UMES at Virginia Tech | ",
 "Upcoming Dec 13, 2:00 PM Men's · UMES vs American | ",
 "Upcoming Dec 16 Men's · UMES at Saint Joseph's | ",
 "Upcoming Dec 19 Men's · UMES at Hampton | ",
 "Upcoming Dec 22 Men's · UMES at Liberty | ",
 "Upcoming Jan 2 Men's · UMES at Morgan State | ",
 "Upcoming Jan 9 Men's · UMES at Howard | ",
 "Upcoming Jan 11, 6:00 PM Men's · UMES vs Norfolk State | ",
 "Upcoming Jan 16 Men's · UMES at Coppin State | ",
 "Upcoming Jan 23, 3:30 PM Men's · UMES vs South Carolina State | ",
 "Upcoming Jan 25, 6:00 PM Men's · UMES vs North Carolina Central | ",
 "Upcoming Jan 30, 3:30 PM Men's · UMES vs Delaware State | ",
 "Upcoming Feb 6, 3:30 PM Men's · UMES vs Morgan State | ",
 "Upcoming Feb 13, 3:30 PM Men's · UMES vs Howard | ",
 "Upcoming Feb 15 Men's · UMES at Norfolk State | ",
 "Upcoming Feb 20, 3:30 PM Men's · UMES vs Coppin State | ",
 "Upcoming Feb 27 Men's · UMES at South Carolina State | ",
 "Upcoming Mar 1 Men's · UMES at North Carolina Central | ",
 "Upcoming Mar 4 Men's · UMES at Delaware State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2 Women's · UMES at Virginia | ",
 "Upcoming Nov 7, 2:00 PM Women's · UMES vs District of Columbia | Homecoming | ",
 "Upcoming Nov 12 Women's · UMES at Georgia Tech | ",
 "Upcoming Nov 15, 2:30 PM Women's · UMES vs Cincinnati | ",
 "Upcoming Nov 19, 11:00 AM Women's · UMES at Rutgers | ",
 "Upcoming Nov 21 Women's · UMES at Monmouth | ",
 "Upcoming Nov 26 Women's · UMES vs Oregon | ",
 "Upcoming Nov 27 Women's · UMES vs Georgia | ",
 "Upcoming Nov 28 Women's · UMES vs Colorado | ",
 "Upcoming Nov 30, 6:00 PM Women's · UMES vs Mount St. Mary's (Md.) | ",
 "Upcoming Dec 3, 6:00 PM Women's · UMES vs Pennsylvania | ",
 "Upcoming Dec 6 Women's · UMES at East Carolina | ",
 "Upcoming Dec 12, 1:00 PM Women's · UMES vs Virginia University of Lynchburg | ",
 "Upcoming Dec 15 Women's · UMES at La Salle | ",
 "Upcoming Dec 20 Women's · UMES at George Mason | ",
 "Upcoming Dec 29 Women's · UMES at Towson | ",
 "Upcoming Jan 2 Women's · UMES at Morgan State | ",
 "Upcoming Jan 7, 6:00 PM Women's · UMES vs Norfolk State | ",
 "Upcoming Jan 9 Women's · UMES at Howard | ",
 "Upcoming Jan 16 Women's · UMES at Coppin State | ",
 "Upcoming Jan 21, 6:00 PM Women's · UMES vs North Carolina Central | ",
 "Upcoming Jan 23, 1:00 PM Women's · UMES vs South Carolina State | ",
 "Upcoming Jan 30, 1:00 PM Women's · UMES vs Delaware State | ",
 "Upcoming Feb 6, 1:00 PM Women's · UMES vs Morgan State | ",
 "Upcoming Feb 11 Women's · UMES at Norfolk State | ",
 "Upcoming Feb 13, 1:00 PM Women's · UMES vs Howard | ",
 "Upcoming Feb 20, 1:00 PM Women's · UMES vs Coppin State | ",
 "Upcoming Feb 25 Women's · UMES at North Carolina Central | ",
 "Upcoming Feb 27 Women's · UMES at South Carolina State | ",
 "Upcoming Mar 4 Women's · UMES at Delaware State | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 16 UMES at Chelsea Gilliam Penguin Classic | L, 910-1073",
 "Final Oct 16 UMES vs Sacred Heart | W, 1000-953",
 "Final Oct 16 UMES vs Maryville | L, 983-993",
 "Final Oct 16 UMES vs William Smith College | W, 898-885",
 "Final Oct 16 UMES vs Duquesne | L, 890-911",
 "Final Oct 17 UMES vs Bryant | W, 973-872",
 "Final Oct 17 UMES vs Niagara | L, 965-986",
 "Final Oct 17 UMES vs Mercyhurst | W, 926-923",
 "Final Oct 17 UMES vs Vanderbilt | L, 910-1097",
 "Final Oct 17 UMES vs Youngstown State | L, 933-1085",
 "Final Oct 18 UMES vs Niagara (Game 1) | W, 1245-1176",
 "Final Oct 18 UMES vs Valparaiso | L, 1114-1065",
 "Final Oct 18 UMES vs Niagara (Game 2) | W, 1284-1184",
 "Upcoming Oct 30 UMES at Destination: FLorida | ",
 "Upcoming Nov 6 UMES at Duquesne Invitational | ",
 "Upcoming Nov 13 UMES at Track Kat Klash | ",
 "Upcoming Jan 15 UMES at Northeast Classic | ",
 "Upcoming Jan 30 UMES at Griffin Baker Classic | ",
 "Upcoming Feb 5 UMES at MEAC No. 1 | ",
 "Upcoming Feb 12 UMES at TNBA Open | ",
 "Upcoming Feb 26 UMES at Stallings Invitational | ",
 "Upcoming Mar 5 UMES at Music City Classic | ",
 "Upcoming Mar 12 UMES at USBC Collegiate Sectionals | ",
 "Upcoming Mar 19 UMES at MEAC Bowling Championship | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · UMES at Salisbury University Fall Classic | 6th",
 "Final Sep 19 Women's · UMES at UMES Invitational | 4th",
 "Final Oct 16 Women's · UMES at Maryland Eastern Shore | Soaring Hawk Cross Country Classic | 1st",
 "Final Oct 22 Women's · UMES at Coppin State - UMES Dual Meet | Completed",
 "Upcoming Oct 30 Women's · UMES at Mid-Eastern Athletic Conference | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 11 Men's · UMES at Delaware State Invite | 4th",
 "Final Sep 19 Men's · UMES at UMES Invitational | 3rd",
 "Final Oct 3 Men's · UMES at Don Cathcart Invitational | 3rd",
 "Final Oct 16 Men's · UMES at Maryland Eastern Shore | Soaring Hawk Cross Country Classic | 1st",
 "Final Oct 22 Men's · UMES at Coppin Statev- UMES | Completed",
 "Upcoming Oct 30 Men's · UMES at Mid-Eastern Athletic Conference | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 30 Women's · UMES at Youngstown State University Roseann Schwartz Invitational | 11th",
 "Final Sep 7 Women's · UMES at William & Mary Tribe Invitational | 6th",
 "Final Sep 13 Women's · UMES at Sacred Heart University Charge at Quail Valley Classic | Completed",
 "Final Sep 28 Women's · UMES at Stonehill College \"The Hill\" Invitational | 7th"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Men's · UMES at U.S. Naval Academy \"The Goat\" Invitational | Completed",
 "Final Sep 28 Men's · UMES at Maryland Individual Invitational | No team score (individuals only)",
 "Final Oct 5 Men's · UMES at Maryland Testudo Cup | 12th",
 "Final Oct 11 Men's · UMES at Bucknell University Invitational | 17th",
 "Final Oct 19 Men's · UMES at Delaware Blue Hen Intercollegiate | 11th",
 "Upcoming Oct 24 Men's · UMES at Lehigh University Invitational | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensindoortrack=parse("Track & Field","womens-indoor-track");
  assert.deepEqual(v_womensindoortrack.map(line),[]);
  const v_mensindoortrack=parse("Track & Field","mens-indoor-track");
  assert.deepEqual(v_mensindoortrack.map(line),[]);
  const v_wot=parse("Track & Field","wot");
  assert.deepEqual(v_wot.map(line),[]);
  const v_mot=parse("Track & Field","mot");
  assert.deepEqual(v_mot.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Women's · UMES vs Alabama A&M | L, 0-3",
 "Final Aug 28 Women's · UMES vs Mississippi Valley State | W, 3-0",
 "Final Aug 29 Women's · UMES vs Florida A&M | L, 0-3",
 "Final Sep 5 Women's · UMES vs George Mason | L, 1-3",
 "Final Sep 5 Women's · UMES vs Hampton | L, 0-3",
 "Final Sep 6 Women's · UMES vs Maryland | L, 0-3",
 "Final Sep 12 Women's · UMES vs Navy | L, 1-3",
 "Final Sep 13 Women's · UMES vs Old Dominion | L, 1-3",
 "Final Sep 18 Women's · UMES vs Siena College | L, 0-3",
 "Final Sep 18 Women's · UMES vs Duquesne | L, 0-3",
 "Final Sep 19 Women's · UMES vs Robert Morris | L, 0-3",
 "Final Sep 25 Women's · UMES vs South Carolina State | W, 3-1",
 "Final Sep 27 Women's · UMES vs North Carolina Central | L, 2-3",
 "Final Oct 2 Women's · UMES at Norfolk State | L, 1-3",
 "Final Oct 4 Women's · UMES vs Howard | L, 2-3",
 "Final Oct 9 Women's · UMES at Coppin State | L, 0-3",
 "Final Oct 11 Women's · UMES vs Morgan State | L, 1-3",
 "Final Oct 16 Women's · UMES vs Delaware State | L, 1-3",
 "Today Oct 23, 6:00 PM Women's · UMES at South Carolina State | ",
 "Upcoming Oct 25, 1:00 PM Women's · UMES at North Carolina Central | ",
 "Upcoming Oct 30, 6:00 PM Women's · UMES vs Norfolk State | ",
 "Upcoming Nov 1, 1:00 PM Women's · UMES at Howard | ",
 "Upcoming Nov 5, 6:00 PM Women's · UMES vs Coppin State | ",
 "Upcoming Nov 8, 1:00 PM Women's · UMES at Morgan State | ",
 "Upcoming Nov 13, 7:00 PM Women's · UMES at Delaware State | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensindoortrack,"Track & Field womens-indoor-track");
  ownRecapsOnly(v_mensindoortrack,"Track & Field mens-indoor-track");
  ownRecapsOnly(v_wot,"Track & Field wot");
  ownRecapsOnly(v_mot,"Track & Field mot");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Maryland Eastern Shore module checks passed");
