import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {detroitMercySchool} from '../src/schools/detroit-mercy.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='detroit-mercy');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,detroitMercyHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/detroit-mercy-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit detroittitans.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['detroit-mercy'];
assert.equal(sports.length,8);
for(const [name,map] of [['schedule',detroitMercySchool.scheduleUrls],['roster',detroitMercySchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('detroit-mercy|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'detroittitans.com',`${key} must stay on detroittitans.com`);
  }
}
const parity={"Basketball":{"schedule":["https://detroittitans.com/sports/mens-basketball/schedule","https://detroittitans.com/sports/womens-basketball/schedule"],"roster":["https://detroittitans.com/sports/mens-basketball/roster","https://detroittitans.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://detroittitans.com/sports/womens-cross-country/schedule","https://detroittitans.com/sports/mens-cross-country/schedule"],"roster":["https://detroittitans.com/sports/womens-cross-country/roster","https://detroittitans.com/sports/mens-cross-country/roster"],"combined":true},"Fencing":{"schedule":["https://detroittitans.com/sports/womens-fencing/schedule","https://detroittitans.com/sports/mens-fencing/schedule"],"roster":["https://detroittitans.com/sports/womens-fencing/roster","https://detroittitans.com/sports/mens-fencing/roster"],"combined":true},"Golf":{"schedule":["https://detroittitans.com/sports/womens-golf/schedule","https://detroittitans.com/sports/mens-golf/schedule"],"roster":["https://detroittitans.com/sports/womens-golf/roster","https://detroittitans.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://detroittitans.com/sports/womens-lacrosse/schedule","https://detroittitans.com/sports/mens-lacrosse/schedule"],"roster":["https://detroittitans.com/sports/womens-lacrosse/roster","https://detroittitans.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://detroittitans.com/sports/womens-soccer/schedule","https://detroittitans.com/sports/mens-soccer/schedule"],"roster":["https://detroittitans.com/sports/womens-soccer/roster","https://detroittitans.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://detroittitans.com/sports/softball/schedule"],"roster":["https://detroittitans.com/sports/softball/roster"],"combined":false},"Track & Field":{"schedule":["https://detroittitans.com/sports/womens-track-and-field/schedule","https://detroittitans.com/sports/mens-track-and-field/schedule"],"roster":["https://detroittitans.com/sports/womens-track-and-field/roster","https://detroittitans.com/sports/mens-track-and-field/roster"],"combined":true}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'detroit-mercy|"+sport+"':"),`${sport} routes must live in the Detroit Mercy module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://detroittitans.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.detroitMercyHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=detroit-mercy)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 4:30 PM Men's · Detroit Mercy vs Alabama A&M (Exh. at Wayne State) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Detroit Mercy vs Wayne State (Exhibition) | ",
 "Upcoming Nov 6, 8:00 PM Men's · Detroit Mercy at Marquette | ",
 "Upcoming Nov 10, 7:00 PM Men's · Detroit Mercy at Xavier | ",
 "Upcoming Nov 14, 4:00 PM Men's · Detroit Mercy vs Toledo | ",
 "Upcoming Nov 18, 6:30 PM Men's · Detroit Mercy at Eastern Michigan | ",
 "Upcoming Nov 21 Men's · Detroit Mercy at Michigan State | ",
 "Upcoming Nov 24, 3:00 PM Men's · Detroit Mercy vs North Dakota (at Hard Rock Hotel Riviera Maya Convention Center) | ",
 "Upcoming Nov 25 Men's · Detroit Mercy vs vs. Northern Colorado/Southeastern Louisiana (at Hard Rock Hotel Riviera Maya Convention Center) | ",
 "Upcoming Dec 2, 7:00 PM Men's · Detroit Mercy at Purdue Fort Wayne | ",
 "Upcoming Dec 5, 1:00 PM Men's · Detroit Mercy vs NKU | ",
 "Upcoming Dec 13, 4:00 PM Men's · Detroit Mercy vs Cleary | ",
 "Upcoming Dec 21, 4:00 PM Men's · Detroit Mercy at Michigan | ",
 "Upcoming Dec 30, 7:00 PM Men's · Detroit Mercy vs Milwaukee | ",
 "Upcoming Jan 3, 1:00 PM Men's · Detroit Mercy vs Green Bay | ",
 "Upcoming Jan 6, 7:00 PM Men's · Detroit Mercy at Robert Morris | ",
 "Upcoming Jan 9, 2:00 PM Men's · Detroit Mercy at Youngstown State | ",
 "Upcoming Jan 14, 7:00 PM Men's · Detroit Mercy vs NIU | ",
 "Upcoming Jan 17, 3:00 PM Men's · Detroit Mercy at Oakland | ",
 "Upcoming Jan 21, 7:00 PM Men's · Detroit Mercy at Wright State | ",
 "Upcoming Jan 23, 5:00 PM Men's · Detroit Mercy at NKU | ",
 "Upcoming Jan 27, 7:00 PM Men's · Detroit Mercy vs Youngstown State | ",
 "Upcoming Jan 30, 4:00 PM Men's · Detroit Mercy vs IU Indy | ",
 "Upcoming Feb 4, 7:30 PM Men's · Detroit Mercy at Green Bay | ",
 "Upcoming Feb 7, 1:00 PM Men's · Detroit Mercy vs Wright State | ",
 "Upcoming Feb 11, 7:00 PM Men's · Detroit Mercy vs Robert Morris | ",
 "Upcoming Feb 13, 4:00 PM Men's · Detroit Mercy at IU Indy | ",
 "Upcoming Feb 17, 7:00 PM Men's · Detroit Mercy at NIU | ",
 "Upcoming Feb 21, 1:00 PM Men's · Detroit Mercy vs Oakland | ",
 "Upcoming Feb 24, 7:00 PM Men's · Detroit Mercy vs Purdue Fort Wayne | ",
 "Upcoming Feb 27, 3:30 PM Men's · Detroit Mercy at Cleveland State | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 11:00 AM Women's · Detroit Mercy vs Michigan-Dearborn (Mich.) | ",
 "Upcoming Nov 4, 7:00 PM Women's · Detroit Mercy at Illinois | ",
 "Upcoming Nov 7, 2:00 PM Women's · Detroit Mercy at Valparaiso | ",
 "Upcoming Nov 10, 7:00 PM Women's · Detroit Mercy at Notre Dame | ",
 "Upcoming Nov 14, 1:00 PM Women's · Detroit Mercy vs North Dakota | ",
 "Upcoming Nov 19, 7:00 PM Women's · Detroit Mercy vs Toledo | ",
 "Upcoming Nov 21, 1:00 PM Women's · Detroit Mercy vs Sacred Heart | ",
 "Upcoming Nov 27 Women's · Detroit Mercy vs Omaha | ",
 "Upcoming Nov 28, 3:00 PM Women's · Detroit Mercy at Drake | ",
 "Upcoming Dec 3, 7:00 PM Women's · Detroit Mercy at Wright State | ",
 "Upcoming Dec 6, 1:00 PM Women's · Detroit Mercy at Northern Kentucky | ",
 "Upcoming Dec 10, 4:00 PM Women's · Detroit Mercy vs Buffalo | ",
 "Upcoming Dec 13, 1:00 PM Women's · Detroit Mercy vs St. Thomas | ",
 "Upcoming Dec 21, 12:00 PM Women's · Detroit Mercy at Michigan | ",
 "Upcoming Dec 31, 1:00 PM Women's · Detroit Mercy vs Robert Morris | ",
 "Upcoming Jan 3, 4:00 PM Women's · Detroit Mercy vs IU Indy | ",
 "Upcoming Jan 7, 7:00 PM Women's · Detroit Mercy vs Milwaukee | ",
 "Upcoming Jan 10, 2:00 PM Women's · Detroit Mercy at Cleveland State | ",
 "Upcoming Jan 13, 7:30 PM Women's · Detroit Mercy at Green Bay | ",
 "Upcoming Jan 16, 1:00 PM Women's · Detroit Mercy vs Oakland | ",
 "Upcoming Jan 21, 6:00 PM Women's · Detroit Mercy at Robert Morris | ",
 "Upcoming Jan 23, 2:00 PM Women's · Detroit Mercy at Youngstown State | ",
 "Upcoming Jan 27, 7:00 PM Women's · Detroit Mercy at Purdue Fort Wayne | ",
 "Upcoming Jan 30, 12:00 PM Women's · Detroit Mercy vs Northern Kentucky | ",
 "Upcoming Feb 3, 12:00 PM Women's · Detroit Mercy at Northern Illinois | ",
 "Upcoming Feb 6, 1:00 PM Women's · Detroit Mercy vs Green Bay | ",
 "Upcoming Feb 10, 7:00 PM Women's · Detroit Mercy vs Wright State | ",
 "Upcoming Feb 13, 1:00 PM Women's · Detroit Mercy at IU Indy | ",
 "Upcoming Feb 17, 7:00 PM Women's · Detroit Mercy vs Northern Illinois | ",
 "Upcoming Feb 20, 2:00 PM Women's · Detroit Mercy vs Cleveland State | ",
 "Upcoming Feb 25, 7:00 PM Women's · Detroit Mercy vs Purdue Fort Wayne | ",
 "Upcoming Feb 27, 2:00 PM Women's · Detroit Mercy at Oakland | ",
 "Upcoming Mar 3 Women's · Detroit Mercy at Horizon League Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 18 Women's · Detroit Mercy at National Catholic Championships (hosted by Notre Dame at Burke Memorial Golf Course) | 5th - 163 points",
 "Final Oct 3 Women's · Detroit Mercy at Swags Louisville Cross Country Classic (at EP “Tom” Sawyer Park) | 1st - 54 points",
 "Final Oct 17 Women's · Detroit Mercy at Canisius Alumni Classic (hosted by Canisius At Delaware Park Golf Course) | 1st - 45 Points",
 "Upcoming Oct 31, 11:00 AM Women's · Detroit Mercy at Horizon League Championship (hosted by Robert Morris at Youthtowne Fields) | ",
 "Upcoming Nov 13 Women's · Detroit Mercy at NCAA Great Lakes Regionals (hosted by Michigan State at Forest Akers East Golf Course) | ",
 "Upcoming Nov 21 Women's · Detroit Mercy at NCAA Division I Championships (hosted by Indiana State at LaVern Gibson Championship XC Course) | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 18 Men's · Detroit Mercy at National Catholic Championships (hosted by Notre Dame at Burke Memorial Golf Course) | 5th - 147 points",
 "Final Oct 3 Men's · Detroit Mercy at Swags Louisville Cross Country Classic (at EP “Tom” Sawyer Park) | 9th - 291 Points",
 "Final Oct 17 Men's · Detroit Mercy at Canisius Alumni Classic (hosted by Canisius At Delaware Park Golf Course) | T2nd - 71 Points",
 "Upcoming Oct 31, 11:00 AM Men's · Detroit Mercy at Horizon League Championship (hosted by Robert Morris at Youthtowne Fields) | ",
 "Upcoming Nov 13 Men's · Detroit Mercy at NCAA Great Lakes Regionals (hosted by Michigan State at Forest Akers East Golf Course) | ",
 "Upcoming Nov 21 Men's · Detroit Mercy at NCAA Division I Championships (hosted by Indiana State at LaVern Gibson Championship XC Course) | "
]);
  const v_womensfencing=parse("Fencing","womens-fencing");
  assert.deepEqual(v_womensfencing.map(line),[]);
  const v_mensfencing=parse("Fencing","mens-fencing");
  assert.deepEqual(v_mensfencing.map(line),[]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 31 Women's · Detroit Mercy at Midwest Match Play (The Grande GC) | Completed",
 "Final Sep 6 Women's · Detroit Mercy at A-Ga-Ming Invitational (A-Ga-Ming Golf Resort) | 11th",
 "Final Sep 28 Women's · Detroit Mercy at NKU Fall Invite (Belterra CC) | 5th",
 "Final Oct 5 Women's · Detroit Mercy at Butler Invitational (Highland CC) | 8th"
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Aug 29 Men's · Detroit Mercy at Virtues Intercollegiate (Virtues GC) | T11th",
 "Final Sep 14 Men's · Detroit Mercy at Joe Feaganes Marshall Invitational (Guyan CC) | 9th",
 "Final Oct 5 Men's · Detroit Mercy at Tom Tontimonia Invitational (Lakewood CC) | 10th",
 "Final Oct 19 Men's · Detroit Mercy at Xavier Invitational (Maketewah CC) | 5th"
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Detroit Mercy at Kentucky | L, 0-6",
 "Final Aug 16 Women's · Detroit Mercy vs Eastern Michigan | W, 1-0",
 "Final Aug 20 Women's · Detroit Mercy vs Toledo | L, 0-1",
 "Final Aug 23 Women's · Detroit Mercy at Valparaiso | W, 3-2",
 "Final Aug 30 Women's · Detroit Mercy vs Wayne State | L, 0-1",
 "Final Sep 6 Women's · Detroit Mercy vs Western Michigan | T, 0-0",
 "Final Sep 10 Women's · Detroit Mercy at Bowling Green | L, 0-2",
 "Final Sep 19 Women's · Detroit Mercy vs Purdue Fort Wayne | W, 3-0",
 "Final Sep 24 Women's · Detroit Mercy at Green Bay | L, 0-1",
 "Final Sep 27 Women's · Detroit Mercy at Milwaukee | L, 0-3",
 "Final Oct 1 Women's · Detroit Mercy vs Robert Morris | T, 0-0",
 "Final Oct 4 Women's · Detroit Mercy vs Youngstown State | L, 0-3",
 "Final Oct 10 Women's · Detroit Mercy at Cleveland State | L, 0-1",
 "Final Oct 15 Women's · Detroit Mercy at Northern Illinois | W, 2-0",
 "Final Oct 18 Women's · Detroit Mercy at IU Indy | L, 2-4",
 "Final Oct 22 Women's · Detroit Mercy vs Northern Kentucky | L, 1-2",
 "Upcoming Oct 25, 1:00 PM Women's · Detroit Mercy vs Wright State | ",
 "Upcoming Oct 31, 7:00 PM Women's · Detroit Mercy at Oakland | ",
 "Upcoming Nov 7 Women's · Detroit Mercy vs Horizon League | ",
 "Upcoming Nov 11 Women's · Detroit Mercy vs Horizon League | ",
 "Upcoming Nov 14 Women's · Detroit Mercy vs Horizon League | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Detroit Mercy at St. Thomas | W, 2-0",
 "Final Aug 24 Men's · Detroit Mercy vs Adrian College | L, 1-2",
 "Final Aug 28 Men's · Detroit Mercy at Dayton | L, 1-5",
 "Final Sep 1 Men's · Detroit Mercy at Mercyhurst | T, 2-2",
 "Final Sep 5 Men's · Detroit Mercy vs Duquesne | L, 1-2",
 "Final Sep 9 Men's · Detroit Mercy vs Robert Morris | L, 2-5",
 "Final Sep 12 Men's · Detroit Mercy at Cleveland State | L, 0-2",
 "Final Sep 15 Men's · Detroit Mercy at Notre Dame | L, 0-4",
 "Final Sep 26 Men's · Detroit Mercy vs Purdue Fort Wayne | W, 2-1",
 "Final Sep 29 Men's · Detroit Mercy vs Western Michigan | T, 1-1",
 "Final Oct 3 Men's · Detroit Mercy at Green Bay | L, 0-1",
 "Final Oct 7 Men's · Detroit Mercy at Northern Illinois | T, 2-2",
 "Final Oct 10 Men's · Detroit Mercy vs Wright State | L, 1-6",
 "Final Oct 17 Men's · Detroit Mercy vs Oakland | W, 1-0",
 "Upcoming Oct 24, 6:00 PM Men's · Detroit Mercy at Northern Kentucky | ",
 "Upcoming Oct 30, 3:00 PM Men's · Detroit Mercy vs Milwaukee | ",
 "Upcoming Nov 3, 2:00 PM Men's · Detroit Mercy at IU Indy | ",
 "Upcoming Nov 8 Men's · Detroit Mercy vs Horizon League | ",
 "Upcoming Nov 11 Men's · Detroit Mercy vs Horizon League | ",
 "Upcoming Nov 14 Men's · Detroit Mercy vs Horizon League | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[]);
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensfencing,"Fencing womens-fencing");
  ownRecapsOnly(v_mensfencing,"Fencing mens-fencing");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Detroit Mercy module checks passed");
