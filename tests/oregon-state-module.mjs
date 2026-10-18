import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {oregonStateSchool} from '../src/schools/oregon-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='oregon-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,oregonStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/oregon-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit osubeavers.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['oregon-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',oregonStateSchool.scheduleUrls],['roster',oregonStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('oregon-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'osubeavers.com',`${key} must stay on osubeavers.com`);
  }
}
const parity={"Baseball":{"schedule":["https://osubeavers.com/sports/baseball/schedule"],"roster":["https://osubeavers.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://osubeavers.com/sports/mens-basketball/schedule","https://osubeavers.com/sports/womens-basketball/schedule"],"roster":["https://osubeavers.com/sports/mens-basketball/roster","https://osubeavers.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://osubeavers.com/sports/womens-cross-country/schedule"],"roster":["https://osubeavers.com/sports/womens-cross-country/roster"],"combined":false},"Football":{"schedule":["https://osubeavers.com/sports/football/schedule"],"roster":["https://osubeavers.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://osubeavers.com/sports/womens-golf/schedule","https://osubeavers.com/sports/mens-golf/schedule"],"roster":["https://osubeavers.com/sports/womens-golf/roster","https://osubeavers.com/sports/mens-golf/roster"],"combined":true},"Gymnastics":{"schedule":["https://osubeavers.com/sports/womens-gymnastics/schedule"],"roster":["https://osubeavers.com/sports/womens-gymnastics/roster"],"combined":false},"Rowing":{"schedule":["https://osubeavers.com/sports/mens-rowing/schedule","https://osubeavers.com/sports/womens-rowing/schedule"],"roster":["https://osubeavers.com/sports/mens-rowing/roster","https://osubeavers.com/sports/womens-rowing/roster"],"combined":true},"Soccer":{"schedule":["https://osubeavers.com/sports/womens-soccer/schedule","https://osubeavers.com/sports/mens-soccer/schedule"],"roster":["https://osubeavers.com/sports/womens-soccer/roster","https://osubeavers.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://osubeavers.com/sports/softball/schedule"],"roster":["https://osubeavers.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://osubeavers.com/sports/track-and-field/schedule"],"roster":["https://osubeavers.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://osubeavers.com/sports/womens-volleyball/schedule"],"roster":["https://osubeavers.com/sports/womens-volleyball/roster"],"combined":false},"Wrestling":{"schedule":["https://osubeavers.com/sports/wrestling/schedule"],"roster":["https://osubeavers.com/sports/wrestling/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'oregon-state|"+sport+"':"),`${sport} routes must live in the Oregon State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-18T15:00:00Z");
const page=slug=>`https://osubeavers.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.oregonStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=oregon-state)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[
 "Upcoming Oct 24, 12:00 PM Oregon State vs Lower Columbia CC (Exhibition) | ",
 "Upcoming Feb 19, 3:30 PM Oregon State vs Vanderbilt | ",
 "Upcoming Feb 20, 3:30 PM Oregon State vs Nebraska | ",
 "Upcoming Feb 21, 3:30 PM Oregon State vs UC Santa Barbara | ",
 "Upcoming Feb 22, 4:30 PM Oregon State vs Kent State | ",
 "Upcoming Feb 26, 1:00 PM Oregon State vs Baylor | ",
 "Upcoming Feb 27, 5:00 PM Oregon State vs Arkansas | ",
 "Upcoming Feb 28, 4:30 PM Oregon State vs Oklahoma State | ",
 "Upcoming Mar 5, 6:00 PM Oregon State vs LSU | ",
 "Upcoming Mar 6, 2:00 PM Oregon State vs Iowa | ",
 "Upcoming Mar 7, 1:00 PM Oregon State vs Arizona State | ",
 "Upcoming Mar 8, 1:00 PM Oregon State vs BYU | ",
 "Upcoming Apr 16 Oregon State vs Washington State | ",
 "Upcoming Apr 17 Oregon State vs Washington State | ",
 "Upcoming Apr 18 Oregon State vs Washington State | ",
 "Upcoming Apr 23 Oregon State at Gonzaga | ",
 "Upcoming Apr 24 Oregon State at Gonzaga | ",
 "Upcoming Apr 25 Oregon State at Gonzaga | ",
 "Upcoming Apr 30 Oregon State at Fresno State | ",
 "Upcoming May 1 Oregon State at Fresno State | ",
 "Upcoming May 2 Oregon State at Fresno State | ",
 "Upcoming May 7 Oregon State vs Texas State | ",
 "Upcoming May 8 Oregon State vs Texas State | ",
 "Upcoming May 9 Oregon State vs Texas State | ",
 "Upcoming May 14 Oregon State vs San Diego State | ",
 "Upcoming May 15 Oregon State vs San Diego State | ",
 "Upcoming May 16 Oregon State vs San Diego State | ",
 "Upcoming May 20 Oregon State at DBU | ",
 "Upcoming May 21 Oregon State at DBU | ",
 "Upcoming May 22 Oregon State at DBU | "
]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 16 Men's · Oregon State at Michigan (Exhibition) | L, 93-98",
 "Upcoming Oct 24, 7:00 PM Men's · Oregon State vs California (Exhibition) | ",
 "Upcoming Nov 2, 6:30 PM Men's · Oregon State vs Weber State | ",
 "Upcoming Nov 6, 6:30 PM Men's · Oregon State vs Cal Baptist | ",
 "Upcoming Nov 9, 6:30 PM Men's · Oregon State vs Eastern Washington | ",
 "Upcoming Nov 13, 6:30 PM Men's · Oregon State vs Mississippi Valley State | ",
 "Upcoming Nov 16, 6:30 PM Men's · Oregon State vs East Texas A&M | ",
 "Upcoming Nov 19, 6:00 PM Men's · Oregon State vs Oregon | ",
 "Upcoming Nov 23, 11:00 AM Men's · Oregon State vs Tulsa | ",
 "Upcoming Nov 24, 11:00 AM Men's · Oregon State vs San Francisco | ",
 "Upcoming Nov 29, 11:00 AM Men's · Oregon State vs Milwaukee | ",
 "Upcoming Dec 5, 5:30 PM Men's · Oregon State vs Southern Mississippi | ",
 "Upcoming Dec 11, 6:30 PM Men's · Oregon State vs Lamar | ",
 "Upcoming Dec 14, 7:00 PM Men's · Oregon State vs Arizona State | ",
 "Upcoming Dec 17, 6:30 PM Men's · Oregon State vs Cleveland State | ",
 "Upcoming Dec 21 Men's · Oregon State vs New Mexico | ",
 "Upcoming Dec 23, 3:00 PM Men's · Oregon State vs Santa Clara | ",
 "Upcoming Dec 30, 7:00 PM Men's · Oregon State vs Western Oregon | ",
 "Upcoming Jan 6, 7:00 PM Men's · Oregon State vs San Diego State | ",
 "Upcoming Jan 9, 6:00 PM Men's · Oregon State at Boise State | ",
 "Upcoming Jan 14, 4:00 PM Men's · Oregon State at Texas State | ",
 "Upcoming Jan 16, 3:45 PM Men's · Oregon State vs Utah State | ",
 "Upcoming Jan 24, 11:00 AM Men's · Oregon State vs Gonzaga | ",
 "Upcoming Jan 27, 7:00 PM Men's · Oregon State at Washington State | ",
 "Upcoming Jan 30, 1:45 PM Men's · Oregon State at Utah State | ",
 "Upcoming Feb 4, 8:00 PM Men's · Oregon State vs Boise State | ",
 "Upcoming Feb 6, 1:30 PM Men's · Oregon State at Colorado State | ",
 "Upcoming Feb 10 Men's · Oregon State vs Washington State | ",
 "Upcoming Feb 14, 12:30 PM Men's · Oregon State vs Texas State | ",
 "Upcoming Feb 20, 7:30 PM Men's · Oregon State at Fresno State | ",
 "Upcoming Feb 25, 7:30 PM Men's · Oregon State at San Diego State | ",
 "Upcoming Feb 27, 7:15 PM Men's · Oregon State vs Colorado State | ",
 "Upcoming Mar 3, 6:00 PM Men's · Oregon State at Gonzaga | ",
 "Upcoming Mar 6, 3:30 PM Men's · Oregon State vs Fresno State | ",
 "Upcoming Mar 9 Men's · Oregon State at Pac-12 Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 1, 2:00 PM Women's · Oregon State vs Seattle Pacific (Exhibition) | ",
 "Upcoming Nov 4, 6:00 PM Women's · Oregon State vs California Baptist | ",
 "Upcoming Nov 8, 2:00 PM Women's · Oregon State vs Eastern Washington | ",
 "Upcoming Nov 11, 6:00 PM Women's · Oregon State vs Northwest Nazarene | ",
 "Upcoming Nov 15, 6:00 PM Women's · Oregon State at Arizona | ",
 "Upcoming Nov 18, 11:00 AM Women's · Oregon State vs UC Riverside | ",
 "Upcoming Nov 21 Women's · Oregon State vs Fairfield | ",
 "Upcoming Nov 23, 9:00 AM Women's · Oregon State vs Middle Tennessee | ",
 "Upcoming Nov 25, 3:30 PM Women's · Oregon State vs Vanderbilt | ",
 "Upcoming Nov 30, 6:00 PM Women's · Oregon State vs Southern | ",
 "Upcoming Dec 5, 1:30 PM Women's · Oregon State vs BYU | ",
 "Upcoming Dec 13, 1:00 PM Women's · Oregon State vs Oregon | ",
 "Upcoming Dec 18, 8:00 PM Women's · Oregon State vs Idaho State | ",
 "Upcoming Dec 19, 8:00 PM Women's · Oregon State vs Ball State | ",
 "Upcoming Dec 29, 4:00 PM Women's · Oregon State at Columbia | ",
 "Upcoming Jan 1, 10:00 AM Women's · Oregon State at Princeton | ",
 "Upcoming Jan 6 Women's · Oregon State at Gonzaga | ",
 "Upcoming Jan 9, 8:00 PM Women's · Oregon State at Utah State | ",
 "Upcoming Jan 13, 7:00 PM Women's · Oregon State vs San Diego State | ",
 "Upcoming Jan 17, 1:00 PM Women's · Oregon State vs Washington State | ",
 "Upcoming Jan 23, 8:00 PM Women's · Oregon State at Fresno State | ",
 "Upcoming Jan 27, 6:00 PM Women's · Oregon State vs Boise State | ",
 "Upcoming Jan 30, 2:00 PM Women's · Oregon State vs Utah State | ",
 "Upcoming Feb 7, 1:00 PM Women's · Oregon State at Washington State | ",
 "Upcoming Feb 11, 8:00 PM Women's · Oregon State vs Gonzaga | ",
 "Upcoming Feb 13, 2:00 PM Women's · Oregon State at Texas State | ",
 "Upcoming Feb 17 Women's · Oregon State at San Diego State | ",
 "Upcoming Feb 21, 11:00 AM Women's · Oregon State vs Colorado State | ",
 "Upcoming Feb 24, 6:30 PM Women's · Oregon State at Boise State | ",
 "Upcoming Feb 28, 2:00 PM Women's · Oregon State vs Texas State | ",
 "Upcoming Mar 3, 6:00 PM Women's · Oregon State vs Fresno State | ",
 "Upcoming Mar 6, 5:30 PM Women's · Oregon State at Colorado State | ",
 "Upcoming Mar 9 Women's · Oregon State at Pac-12 | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 4 Oregon State at Linfield Opener | 1st of 13",
 "Final Sep 25 Oregon State at 47th Sean Earl Loyola Lakefront Invitational | 11th of 17",
 "Final Sep 26 Oregon State at Mike Johnson Classic | 3rd of 13",
 "Final Oct 9 Oregon State at Nuttycombe Invitational | 24th of 34",
 "Final Oct 9 Oregon State at Bill Dellinger Invitational | 13th of 13",
 "Final Oct 17 Oregon State at George Oja Invite | Completed",
 "Upcoming Oct 30 Oregon State at Pac-12 Championships | ",
 "Upcoming Nov 13 Oregon State at NCAA West Regionals | ",
 "Upcoming Nov 21 Oregon State at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Oregon State at Houston | L, 20-33",
 "Final Sep 12 Oregon State vs Texas Tech | L, 24-35",
 "Final Sep 19 Oregon State vs Montana | W, 52-17",
 "Final Sep 26 Oregon State at UTEP | W, 33-7",
 "Final Oct 3 Oregon State at Colorado State | W, 56-26",
 "Final Oct 10 Oregon State vs San Diego State | W, 66-14",
 "Final Oct 17 Oregon State vs Washington State | W, 48-30",
 "Upcoming Oct 31, 8:00 PM Oregon State at Fresno State | ",
 "Upcoming Nov 7, 7:30 PM Oregon State vs Texas State | ",
 "Upcoming Nov 14, 3:00 PM Oregon State at Boise State | ",
 "Upcoming Nov 21, 7:30 PM Oregon State vs Utah State | ",
 "Upcoming Nov 28 Oregon State at Flex Game | ",
 "Upcoming Dec 4 Oregon State vs Pac-12 Championship Game | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 14 Women's · Oregon State at Leadership & Golf Invitational | T4th",
 "Final Oct 2 Women's · Oregon State at Ron Moore Intercollegiate | T13th",
 "Today Oct 16 Women's · Oregon State at Stanford Intercollegiate | ",
 "Upcoming Oct 26 Women's · Oregon State at Nanea Invitational | ",
 "Upcoming Feb 13 Women's · Oregon State at Alice and John Wallace Women's Golf Classic | ",
 "Upcoming Feb 22 Women's · Oregon State at Bruin Wave Invitational | ",
 "Upcoming Mar 9 Women's · Oregon State at Juli Inkster Invitational | ",
 "Upcoming Mar 25 Women's · Oregon State at PING/ASU Invitational | ",
 "Upcoming Apr 5 Women's · Oregon State at Silverado Showdown | ",
 "Upcoming Apr 25 Women's · Oregon State at Pac-12 Championship | ",
 "Upcoming May 10 Women's · Oregon State at NCAA Regionals | ",
 "Upcoming May 21 Women's · Oregon State at NCAA National Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 21 Men's · Oregon State at CDA National Reserve Invitational | 10th",
 "Final Oct 5 Men's · Oregon State at Oregon State Invitational | T3rd",
 "Final Oct 12 Men's · Oregon State at The Bryson | 9th",
 "Upcoming Feb 4 Men's · Oregon State at Amer Ari Invitational | ",
 "Upcoming Feb 15 Men's · Oregon State at The Prestige | ",
 "Upcoming Mar 5 Men's · Oregon State at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Men's · Oregon State at Duck Invitational | ",
 "Upcoming Apr 5 Men's · Oregon State at UCSB Gaucho Invite | ",
 "Upcoming Apr 16 Men's · Oregon State at Thunderbird Collegiate | ",
 "Upcoming Apr 30 Men's · Oregon State at Pac-12 Championships | "
]);
  const v_womensgymnastics=parse("Gymnastics","womens-gymnastics");
  assert.deepEqual(v_womensgymnastics.map(line),[]);
  const v_mensrowing=parse("Rowing","mens-rowing");
  assert.deepEqual(v_mensrowing.map(line),[]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Oregon State at South Carolina | L, 0-2",
 "Final Aug 16 Women's · Oregon State at Lipscomb | L, 0-2",
 "Final Aug 19 Women's · Oregon State vs Bushnell | W, 5-0",
 "Final Aug 23 Women's · Oregon State at Weber State | L, 1-2",
 "Final Aug 27 Women's · Oregon State at Oregon | L, 0-6",
 "Final Aug 30 Women's · Oregon State vs Washington | L, 1-2",
 "Final Sep 6 Women's · Oregon State vs Utah | T, 1-1",
 "Final Sep 10 Women's · Oregon State vs Seattle U | L, 0-4",
 "Final Sep 13 Women's · Oregon State at Portland | L, 0-1",
 "Final Sep 18 Women's · Oregon State vs LMU | T, 0-0",
 "Final Sep 25 Women's · Oregon State at Eastern Washington | L, 1-2",
 "Final Oct 1 Women's · Oregon State at Washington State | L, 1-3",
 "Final Oct 8 Women's · Oregon State vs San Diego State | T, 2-2",
 "Final Oct 11 Women's · Oregon State vs Texas State | T, 3-3",
 "Final Oct 17 Women's · Oregon State at Boise State | L, 1-2",
 "Upcoming Oct 22, 7:00 PM Women's · Oregon State at Fresno State | ",
 "Upcoming Oct 25, 1:00 PM Women's · Oregon State vs Colorado State | ",
 "Upcoming Oct 30, 6:00 PM Women's · Oregon State vs Utah State | ",
 "Upcoming Nov 5, 6:00 PM Women's · Oregon State at Gonzaga | ",
 "Upcoming Nov 11 Women's · Oregon State at Pac-12 Semifinal | ",
 "Upcoming Nov 14 Women's · Oregon State at Pac-12 Final | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Oregon State at UC Irvine | T, 3-3",
 "Final Aug 23 Men's · Oregon State at California State Fullerton | W, 3-0",
 "Final Aug 30 Men's · Oregon State vs Washington | W, 4-3",
 "Final Sep 4 Men's · Oregon State at Georgetown | L, 0-3",
 "Final Sep 8 Men's · Oregon State at Virginia | T, 1-1",
 "Final Sep 13 Men's · Oregon State at Portland | T, 0-0",
 "Final Sep 20 Men's · Oregon State at UC Santa Barbara | W, 3-1",
 "Final Sep 23 Men's · Oregon State vs Seattle U | W, 3-1",
 "Final Sep 30 Men's · Oregon State vs San Diego State | T, 2-2",
 "Final Oct 3 Men's · Oregon State vs UC Riverside | W, 4-1",
 "Final Oct 7 Men's · Oregon State at Cal Baptist | W, 4-1",
 "Final Oct 10 Men's · Oregon State at UC San Diego | W, 1-0",
 "Final Oct 14 Men's · Oregon State vs CSU Bakersfield | L, 0-1",
 "Final Oct 17 Men's · Oregon State at Cal Poly | L, 3-4",
 "Upcoming Oct 21, 7:00 PM Men's · Oregon State vs Sacramento State | ",
 "Upcoming Oct 24, 5:00 PM Men's · Oregon State at Utah Valley | ",
 "Upcoming Oct 31, 7:00 PM Men's · Oregon State vs Gonzaga | ",
 "Upcoming Nov 7 Men's · Oregon State at Pac-12 Semifinal | ",
 "Upcoming Nov 13 Men's · Oregon State at Pac-12 Final | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 20, 5:00 PM Oregon State vs Western Oregon (Exhibition) | ",
 "Upcoming Oct 24, 1:00 PM Oregon State vs Warner Pacific (Exhibition) | ",
 "Upcoming Oct 30, 2:00 PM Oregon State vs Southern Oregon (Exhibition) | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Oregon State vs Utah Tech | L, 0-3",
 "Final Aug 29 Oregon State at Utah Valley | W, 3-1",
 "Final Aug 30 Oregon State at Utah | L, 0-3",
 "Final Sep 3 Oregon State vs California Baptist | W, 3-0",
 "Final Sep 4 Oregon State vs Montana | W, 3-1",
 "Final Sep 5 Oregon State vs Seattle U | W, 3-0",
 "Final Sep 11 Oregon State vs Colorado | L, 0-3",
 "Final Sep 12 Oregon State vs Arizona | L, 1-3",
 "Final Sep 13 Oregon State at USC | L, 0-3",
 "Final Sep 18 Oregon State vs Portland State | W, 3-0",
 "Final Sep 20 Oregon State at Oregon | L, 0-3",
 "Final Sep 26 Oregon State vs Washington State | W, 3-2",
 "Final Oct 1 Oregon State vs Texas State | W, 3-1",
 "Final Oct 3 Oregon State vs Fresno State | W, 3-2",
 "Final Oct 8 Oregon State at San Diego State | L, 0-3",
 "Final Oct 10 Oregon State at Colorado State | L, 1-3",
 "Final Oct 14 Oregon State at Texas State | W, 3-0",
 "Upcoming Oct 22, 6:00 PM Oregon State at Fresno State | ",
 "Upcoming Oct 24, 12:00 PM Oregon State vs Utah State | ",
 "Upcoming Oct 29, 6:00 PM Oregon State vs Gonzaga | ",
 "Upcoming Oct 31, 12:00 PM Oregon State vs Colorado State | ",
 "Upcoming Nov 4, 5:00 PM Oregon State at Boise State | ",
 "Upcoming Nov 6, 6:00 PM Oregon State at Utah State | ",
 "Upcoming Nov 12, 6:00 PM Oregon State at Gonzaga | ",
 "Upcoming Nov 14, 12:00 PM Oregon State at Washington State | ",
 "Upcoming Nov 17, 6:00 PM Oregon State vs San Diego State | ",
 "Upcoming Nov 19, 6:00 PM Oregon State vs Boise State | "
]);
  const v_wrestling=parse("Wrestling","wrestling");
  assert.deepEqual(v_wrestling.map(line),[]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensgymnastics,"Gymnastics womens-gymnastics");
  ownRecapsOnly(v_mensrowing,"Rowing mens-rowing");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_wrestling,"Wrestling wrestling");
}
// END generated

// Golf cards: the place (men's without a suffix), the score to par, each
// round and the total: "10th (+18, 288-292-302—882)". Mutation: without the
// rule the CDA National Reserve Invitational read "Completed" (its story is
// an individual's win).
{
  const results=(slug,name)=>parse('Golf',slug).find(e=>e.opponent===name).results.map(r=>`${r.label}: ${r.value}`);
  assert.deepEqual(results('mens-golf','CDA National Reserve Invitational'),["Result: 10th","Team score: 882 (+18; 288-292-302)"]);
  assert.deepEqual(results('mens-golf','Oregon State Invitational'),["Result: T3rd","Team score: 842 (-10; 280-278-284)"]);
  assert.deepEqual(results('womens-golf','Leadership & Golf Invitational'),["Result: T4th","Team score: 875 (+11; 283-292-300)"]);
}
// Rowing: both teams' pages from the nav (start-schools now combines them);
// both are 2025-26 pages, a valid empty schedule until 2026-27 is published.
assert.ok(oregonStateSchool.combinedSports.has('Rowing'));
assert.deepEqual(oregonStateSchool.scheduleUrls['oregon-state|Rowing'],['https://osubeavers.com/sports/mens-rowing/schedule','https://osubeavers.com/sports/womens-rowing/schedule']);
// Men's soccer's "(Big West Crossover)" is not part of the opponent's name.
{
  const men=parse('Soccer','mens-soccer');
  assert.ok(men.some(e=>e.opponent==='CSU Bakersfield')&&!men.some(e=>/Crossover/.test(e.opponent)));
}
assert.deepEqual(oregonStateSchool.inflcr,{school:'oregon-state-university'});

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Oregon State module checks passed');
