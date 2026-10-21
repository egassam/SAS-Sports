import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {easternWashingtonSchool} from '../src/schools/eastern-washington.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='eastern-washington');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,easternWashingtonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/eastern-washington-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goeags.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['eastern-washington'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',easternWashingtonSchool.scheduleUrls],['roster',easternWashingtonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('eastern-washington|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goeags.com',`${key} must stay on goeags.com`);
  }
}
const parity={"Basketball":{"schedule":["https://goeags.com/sports/mens-basketball/schedule","https://goeags.com/sports/womens-basketball/schedule"],"roster":["https://goeags.com/sports/mens-basketball/roster","https://goeags.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://goeags.com/sports/cross-country/schedule"],"roster":["https://goeags.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goeags.com/sports/football/schedule"],"roster":["https://goeags.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goeags.com/sports/womens-golf/schedule","https://goeags.com/sports/mens-golf/schedule"],"roster":["https://goeags.com/sports/womens-golf/roster","https://goeags.com/sports/mens-golf/roster"],"combined":true},"Soccer":{"schedule":["https://goeags.com/sports/womens-soccer/schedule"],"roster":["https://goeags.com/sports/womens-soccer/roster"],"combined":false},"Tennis":{"schedule":["https://goeags.com/sports/womens-tennis/schedule"],"roster":["https://goeags.com/sports/womens-tennis/roster"],"combined":false},"Track & Field":{"schedule":["https://goeags.com/sports/track-and-field/schedule"],"roster":["https://goeags.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goeags.com/sports/womens-volleyball/schedule"],"roster":["https://goeags.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'eastern-washington|"+sport+"':"),`${sport} routes must live in the Eastern Washington module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-21T15:00:00Z");
const page=slug=>`https://goeags.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.easternWashingtonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=eastern-washington)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 18 Men's · Eastern Washington vs CSU Bakersfield (Exhibition) | W, 71-65",
 "Upcoming Oct 23, 7:00 PM Men's · Eastern Washington at Arizona (Exhibition) | ",
 "Upcoming Oct 27, 6:00 PM Men's · Eastern Washington vs Western Washington (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Eastern Washington at Stanford | ",
 "Upcoming Nov 6, 3:00 PM Men's · Eastern Washington at Oregon | ",
 "Upcoming Nov 9, 6:30 PM Men's · Eastern Washington at Oregon State | ",
 "Upcoming Nov 13, 6:00 PM Men's · Eastern Washington vs Corban | ",
 "Upcoming Nov 17, 5:30 PM Men's · Eastern Washington at Utah | ",
 "Upcoming Nov 23, 7:00 PM Men's · Eastern Washington at UNLV | ",
 "Upcoming Nov 25, 6:00 PM Men's · Eastern Washington at LMU | ",
 "Upcoming Nov 29, 12:00 PM Men's · Eastern Washington at Wyoming | ",
 "Upcoming Dec 3, 7:00 PM Men's · Eastern Washington at Portland State | ",
 "Upcoming Dec 5, 1:00 PM Men's · Eastern Washington at Northern Colorado | ",
 "Upcoming Dec 8, 6:00 PM Men's · Eastern Washington vs Northwest | ",
 "Upcoming Dec 13, 2:00 PM Men's · Eastern Washington at Portland | ",
 "Upcoming Dec 17, 6:00 PM Men's · Eastern Washington vs Seattle Pacific | ",
 "Upcoming Dec 22 Men's · Eastern Washington vs Washington State | ",
 "Upcoming Dec 31, 6:00 PM Men's · Eastern Washington vs Southern Utah | ",
 "Upcoming Jan 2, 2:00 PM Men's · Eastern Washington vs Utah Tech | ",
 "Upcoming Jan 7, 6:00 PM Men's · Eastern Washington vs Northern Arizona | ",
 "Upcoming Jan 14, 6:00 PM Men's · Eastern Washington at Montana State | ",
 "Upcoming Jan 16, 3:00 PM Men's · Eastern Washington at Montana | ",
 "Upcoming Jan 18, 6:00 PM Men's · Eastern Washington vs Idaho State | ",
 "Upcoming Jan 23, 2:00 PM Men's · Eastern Washington at Idaho | ",
 "Upcoming Jan 25, 6:00 PM Men's · Eastern Washington vs Weber State | ",
 "Upcoming Jan 28, 6:00 PM Men's · Eastern Washington vs Northern Colorado | ",
 "Upcoming Jan 30, 2:00 PM Men's · Eastern Washington vs Portland State | ",
 "Upcoming Feb 4, 6:00 PM Men's · Eastern Washington at Utah Tech | ",
 "Upcoming Feb 6, 5:30 PM Men's · Eastern Washington at Southern Utah | ",
 "Upcoming Feb 11, 6:00 PM Men's · Eastern Washington vs Montana | ",
 "Upcoming Feb 13, 2:00 PM Men's · Eastern Washington vs Montana State | ",
 "Upcoming Feb 20, 5:00 PM Men's · Eastern Washington at Northern Arizona | ",
 "Upcoming Feb 22, 6:00 PM Men's · Eastern Washington at Idaho State | ",
 "Upcoming Feb 27, 2:00 PM Men's · Eastern Washington vs Idaho | ",
 "Upcoming Mar 1, 5:00 PM Men's · Eastern Washington at Weber State | ",
 "Upcoming Mar 5 Men's · Eastern Washington at Big Sky Conference Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 25, 3:00 PM Women's · Eastern Washington vs Northwest (Exhibition) | ",
 "Upcoming Nov 3, 5:00 PM Women's · Eastern Washington at Utah | ",
 "Upcoming Nov 6, 1:00 PM Women's · Eastern Washington vs UC Davis | ",
 "Upcoming Nov 8, 2:00 PM Women's · Eastern Washington at Oregon State | ",
 "Upcoming Nov 13, 12:00 PM Women's · Eastern Washington vs Walla Walla | ",
 "Upcoming Nov 15, 2:00 PM Women's · Eastern Washington vs UC Irvine | ",
 "Upcoming Nov 22, 12:00 PM Women's · Eastern Washington at Southern Utah | ",
 "Upcoming Nov 24, 6:00 PM Women's · Eastern Washington vs Whitworth | ",
 "Upcoming Nov 29, 2:00 PM Women's · Eastern Washington vs Gonzaga | ",
 "Upcoming Dec 3, 6:00 PM Women's · Eastern Washington vs Portland State | ",
 "Upcoming Dec 5, 2:00 PM Women's · Eastern Washington vs Northern Colorado | ",
 "Upcoming Dec 8, 6:00 PM Women's · Eastern Washington at Washington State | ",
 "Upcoming Dec 12, 12:00 PM Women's · Eastern Washington at Cal Poly | ",
 "Upcoming Dec 18, 7:00 AM Women's · Eastern Washington vs Chicago State | ",
 "Upcoming Dec 20, 7:00 AM Women's · Eastern Washington vs Cleveland State | ",
 "Upcoming Dec 31 Women's · Eastern Washington at Southern Utah | ",
 "Upcoming Jan 2, 12:00 PM Women's · Eastern Washington at Utah Tech | ",
 "Upcoming Jan 7 Women's · Eastern Washington at Northern Arizona | ",
 "Upcoming Jan 14, 6:00 PM Women's · Eastern Washington vs Montana State | ",
 "Upcoming Jan 16, 2:00 PM Women's · Eastern Washington vs Montana | ",
 "Upcoming Jan 18, 6:00 PM Women's · Eastern Washington at Idaho State | ",
 "Upcoming Jan 23, 2:00 PM Women's · Eastern Washington vs Idaho | ",
 "Upcoming Jan 25, 5:00 PM Women's · Eastern Washington at Weber State | ",
 "Upcoming Jan 28, 11:00 AM Women's · Eastern Washington at Northern Colorado | ",
 "Upcoming Jan 30, 2:00 PM Women's · Eastern Washington at Portland State | ",
 "Upcoming Feb 4, 11:00 AM Women's · Eastern Washington vs Utah Tech | ",
 "Upcoming Feb 6, 2:00 PM Women's · Eastern Washington vs Southern Utah | ",
 "Upcoming Feb 11, 6:00 PM Women's · Eastern Washington at Montana | ",
 "Upcoming Feb 13, 1:00 PM Women's · Eastern Washington at Montana State | ",
 "Upcoming Feb 20, 2:00 PM Women's · Eastern Washington vs Northern Arizona | ",
 "Upcoming Feb 22, 6:00 PM Women's · Eastern Washington vs Idaho State | ",
 "Upcoming Feb 27 Women's · Eastern Washington at Idaho | ",
 "Upcoming Mar 1, 6:00 PM Women's · Eastern Washington vs Weber State | ",
 "Upcoming Mar 5 Women's · Eastern Washington at Big Sky Conference Tournament | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 Eastern Washington at Clash of the Inland Northwest | Women's team: 3rd / Men's team: 2nd",
 "Final Sep 18 Eastern Washington at Montana Invite | Women's team: 3rd / Men's team: 4th",
 "Final Oct 3 Eastern Washington at Frank Knott Classic | Women's team: 3rd / Men's team: 5th",
 "Final Oct 17 Eastern Washington at George Oja Invite | Women's team: 1st / Men's team: 4th",
 "Upcoming Oct 30 Eastern Washington at Big Sky Conference Championship | ",
 "Upcoming Nov 13 Eastern Washington at NCAA West Regional | ",
 "Upcoming Nov 21 Eastern Washington at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 Eastern Washington at Northern Arizona | L, 27-34",
 "Final Sep 5 Eastern Washington vs Northern Iowa | W, 34-24",
 "Final Sep 12 Eastern Washington at South Dakota | L, 23-41",
 "Final Sep 19 Eastern Washington at Washington | L, 16-48",
 "Final Sep 26 Eastern Washington vs Cal Poly | L, 27-31",
 "Final Oct 3 Eastern Washington at UC Davis | L, 38-49",
 "Final Oct 10 Eastern Washington vs Northern Colorado | W, 31-22",
 "Final Oct 17 Eastern Washington vs Montana State | L, 20-56",
 "Upcoming Oct 31, 1:00 PM Eastern Washington vs Montana | ",
 "Upcoming Nov 7, 2:00 PM Eastern Washington at Idaho | ",
 "Upcoming Nov 14, 1:00 PM Eastern Washington at Utah Tech | ",
 "Upcoming Nov 21, 1:00 PM Eastern Washington vs Portland State | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Eastern Washington at Wolverine Invitational | T8th of 10",
 "Final Sep 21 Women's · Eastern Washington at Kalispel Invitational | 11th of 14",
 "Final Sep 28 Women's · Eastern Washington at Sun Mountain Intercollegiate | 4th of 4",
 "Final Oct 5 Women's · Eastern Washington at Pat Lesser Harbottle Invitational | 12th of 16",
 "Upcoming Mar 2 Women's · Eastern Washington at GCU Invitational | ",
 "Upcoming Mar 6 Women's · Eastern Washington at Pizza Hut Lady Thunderbird Invite | ",
 "Upcoming Mar 22 Women's · Eastern Washington at Nashville Invitational | ",
 "Upcoming Apr 6 Women's · Eastern Washington at Cowgirl Classic | ",
 "Upcoming Apr 12 Women's · Eastern Washington at Bobcat Desert Classic | ",
 "Upcoming Apr 21 Women's · Eastern Washington at Big Sky Conference Championship | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Eastern Washington at CDA National Reserve Invitational | 8th of 16",
 "Final Oct 5 Men's · Eastern Washington at Oregon State Invitational | T3rd of 12",
 "Final Oct 12 Men's · Eastern Washington at Visit Stockton Pacific Invitational | 9th of 18",
 "Upcoming Oct 26 Men's · Eastern Washington at Monterrey Collegiate Classic | ",
 "Upcoming Feb 22 Men's · Eastern Washington at Wyoming Desert Intercollegiate | ",
 "Upcoming Mar 5 Men's · Eastern Washington at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Men's · Eastern Washington at The Duck Invitational | ",
 "Upcoming Apr 5 Men's · Eastern Washington at Memphis Intercollegiate: Spirited by Old Dominick | ",
 "Upcoming Apr 19 Men's · Eastern Washington at SeattleU Redhawk Invitational | ",
 "Upcoming Apr 26 Men's · Eastern Washington at Big Sky Conference Championship | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Eastern Washington vs Mount Royal | W, 2-0",
 "Final Aug 16 Eastern Washington vs Bucknell | W, 1-0",
 "Final Aug 20 Eastern Washington at UIC | W, 1-0",
 "Final Aug 23 Eastern Washington at Western Illinois | W, 3-1",
 "Final Aug 30 Eastern Washington vs CSU Bakersfield | W, 2-0",
 "Final Sep 6 Eastern Washington vs Wyoming | L, 0-2",
 "Final Sep 13 Eastern Washington vs Grand Canyon | L, 0-2",
 "Final Sep 20 Eastern Washington at Air Force | T, 2-2",
 "Final Sep 25 Eastern Washington vs Oregon State | W, 2-1",
 "Final Oct 1 Eastern Washington vs Idaho State | T, 0-0",
 "Final Oct 4 Eastern Washington vs Weber State | L, 2-3",
 "Final Oct 8 Eastern Washington at Northern Arizona | L, 0-1",
 "Final Oct 11 Eastern Washington at Northern Colorado | L, 0-1",
 "Upcoming Oct 22, 3:00 PM Eastern Washington vs Southern Utah | ",
 "Upcoming Oct 25, 1:00 PM Eastern Washington vs Utah Tech | ",
 "Upcoming Oct 29, 2:00 PM Eastern Washington at Montana | ",
 "Upcoming Nov 1, 1:00 PM Eastern Washington at Portland State | ",
 "Upcoming Nov 5, 12:00 PM Eastern Washington vs Idaho | ",
 "Upcoming Nov 11 Eastern Washington at Big Sky Conference | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 26 Eastern Washington at EWU Showcase Tournament (vs. Seattle U) | Completed",
 "Final Oct 2 Eastern Washington at Weber State Invitational | Completed",
 "Final Oct 8 Eastern Washington at ITA Northwest Regional | Completed",
 "Upcoming Oct 30 Eastern Washington at Gonzaga Invitational | ",
 "Upcoming Nov 6 Eastern Washington at Peak Health & Wellness Tournament | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[
 "Upcoming Jan 15 Eastern Washington at Spokane Sports Showcase | ",
 "Upcoming Jan 15 Eastern Washington at Whitworth Winter Classic | ",
 "Upcoming Jan 22 Eastern Washington at Lauren McClusky Memorial | ",
 "Upcoming Jan 29 Eastern Washington at Idaho Invite | ",
 "Upcoming Feb 5 Eastern Washington at Riverfront Invite and Multis | ",
 "Upcoming Feb 12 Eastern Washington at Husky Classic | ",
 "Upcoming Feb 12 Eastern Washington at Whitworth Indoor Invite | ",
 "Upcoming Feb 25 Eastern Washington at Big Sky Indoor Championship | ",
 "Upcoming Mar 12 Eastern Washington at Big Sky Outdoor Championship | ",
 "Upcoming Mar 19 Eastern Washington at Sam Adams Classic | ",
 "Upcoming Apr 2 Eastern Washington at Peace Meet | ",
 "Upcoming Apr 2 Eastern Washington at UNLV Rebel Elite | ",
 "Upcoming Apr 9 Eastern Washington at Jeff Rahn Classic | ",
 "Upcoming Apr 15 Eastern Washington at Whitworth Twilight | ",
 "Upcoming Apr 23 Eastern Washington at 48th Annual Eastern Washington Twilight | ",
 "Upcoming May 1 Eastern Washington at Oregon State High-Performance Invite | ",
 "Upcoming May 1 Eastern Washington at Desert Heat Classic | ",
 "Upcoming May 13 Eastern Washington at Big Sky Outdoor Championship | ",
 "Upcoming May 26 Eastern Washington at NCAA First Round | ",
 "Upcoming Jun 9 Eastern Washington at NCAA Outdoor Championship | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Eastern Washington vs North Dakota | W, 3-0",
 "Final Aug 29 Eastern Washington vs Chicago State | W, 3-0",
 "Final Aug 30 Eastern Washington at Seattle | W, 3-1",
 "Final Sep 3 Eastern Washington vs Oral Roberts | W, 3-2",
 "Final Sep 4 Eastern Washington vs California State Fullerton | L, 2-3",
 "Final Sep 5 Eastern Washington at Gonzaga | W, 3-2",
 "Final Sep 10 Eastern Washington vs Saint Mary's | L, 0-3",
 "Final Sep 11 Eastern Washington vs Sacramento State | W, 3-2",
 "Final Sep 12 Eastern Washington at Boise State | L, 0-3",
 "Final Sep 17 Eastern Washington vs Nevada | L, 1-3",
 "Final Sep 18 Eastern Washington vs CSU Bakersfield | L, 2-3",
 "Final Sep 19 Eastern Washington vs Portland | L, 0-3",
 "Final Sep 24 Eastern Washington vs Weber State | W, 3-1",
 "Final Sep 26 Eastern Washington vs Idaho State | L, 0-3",
 "Final Oct 1 Eastern Washington at Montana | W, 3-1",
 "Final Oct 3 Eastern Washington at Montana State | L, 1-3",
 "Final Oct 6 Eastern Washington vs Idaho | L, 1-3",
 "Final Oct 8 Eastern Washington at Northern Colorado | L, 0-3",
 "Final Oct 15 Eastern Washington vs Northern Arizona | L, 2-3",
 "Final Oct 17 Eastern Washington vs Portland State | L, 0-3",
 "Upcoming Oct 22, 5:30 PM Eastern Washington at Southern Utah | ",
 "Upcoming Oct 24, 2:00 PM Eastern Washington vs Utah Tech | ",
 "Upcoming Oct 29, 7:00 PM Eastern Washington at Portland State | ",
 "Upcoming Oct 31, 1:00 PM Eastern Washington at Northern Arizona | ",
 "Upcoming Nov 6, 6:00 PM Eastern Washington vs Northern Colorado | ",
 "Upcoming Nov 7 Eastern Washington at Idaho | ",
 "Upcoming Nov 12, 6:00 PM Eastern Washington vs Montana State | ",
 "Upcoming Nov 14, 2:00 PM Eastern Washington vs Montana | ",
 "Upcoming Nov 18, 6:00 PM Eastern Washington at Idaho State | ",
 "Upcoming Nov 20, 6:00 PM Eastern Washington at Weber State | ",
 "Upcoming Nov 23 Eastern Washington at Big Sky Conference Tournament | "
]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// A department story the schedule links as a game's recap ("general-the-
// flight-report-september-21-episode", a podcast, for the Washington game,
// Sep 19) is no recap.
{
  const washington=parse("Football","football").find(e=>e.opponent==='Washington');
  assert.equal(washington.status,'Final');
  assert.equal(washington.recap_url,undefined);
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Eastern Washington module checks passed");
