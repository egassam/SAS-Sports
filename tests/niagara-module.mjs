import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {niagaraSchool} from '../src/schools/niagara.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='niagara');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,niagaraHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/niagara-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit purpleeagles.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['niagara'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',niagaraSchool.scheduleUrls],['roster',niagaraSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('niagara|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'purpleeagles.com',`${key} must stay on purpleeagles.com`);
  }
}
const parity={"Baseball":{"schedule":["https://purpleeagles.com/sports/baseball/schedule"],"roster":["https://purpleeagles.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://purpleeagles.com/sports/mens-basketball/schedule","https://purpleeagles.com/sports/womens-basketball/schedule"],"roster":["https://purpleeagles.com/sports/mens-basketball/roster","https://purpleeagles.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://purpleeagles.com/sports/womens-bowling/schedule"],"roster":["https://purpleeagles.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://purpleeagles.com/sports/womens-cross-country/schedule","https://purpleeagles.com/sports/mens-cross-country/schedule"],"roster":["https://purpleeagles.com/sports/womens-cross-country/roster","https://purpleeagles.com/sports/mens-cross-country/roster"],"combined":true},"Golf":{"schedule":["https://purpleeagles.com/sports/womens-golf/schedule","https://purpleeagles.com/sports/mens-golf/schedule"],"roster":["https://purpleeagles.com/sports/womens-golf/roster","https://purpleeagles.com/sports/mens-golf/roster"],"combined":true},"Hockey":{"schedule":["https://purpleeagles.com/sports/mens-ice-hockey/schedule"],"roster":["https://purpleeagles.com/sports/mens-ice-hockey/roster"],"combined":false},"Lacrosse":{"schedule":["https://purpleeagles.com/sports/womens-lacrosse/schedule"],"roster":["https://purpleeagles.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://purpleeagles.com/sports/womens-soccer/schedule","https://purpleeagles.com/sports/mens-soccer/schedule"],"roster":["https://purpleeagles.com/sports/womens-soccer/roster","https://purpleeagles.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://purpleeagles.com/sports/softball/schedule"],"roster":["https://purpleeagles.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://purpleeagles.com/sports/womens-swimming-and-diving/schedule","https://purpleeagles.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://purpleeagles.com/sports/womens-swimming-and-diving/roster","https://purpleeagles.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://purpleeagles.com/sports/womens-tennis/schedule","https://purpleeagles.com/sports/mens-tennis/schedule"],"roster":["https://purpleeagles.com/sports/womens-tennis/roster","https://purpleeagles.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://purpleeagles.com/sports/track-and-field/schedule"],"roster":["https://purpleeagles.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://purpleeagles.com/sports/womens-volleyball/schedule"],"roster":["https://purpleeagles.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'niagara|"+sport+"':"),`${sport} routes must live in the Niagara module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://purpleeagles.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.niagaraHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=niagara)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 24, 3:00 PM Men's · Niagara vs Syracuse (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Niagara at West Virginia | ",
 "Upcoming Nov 7, 6:30 PM Men's · Niagara vs Morgan State | ",
 "Upcoming Nov 12, 7:00 PM Men's · Niagara at Bowling Green | ",
 "Upcoming Nov 15, 12:00 PM Men's · Niagara at Iowa State | ",
 "Upcoming Nov 20 Men's · Niagara at Delaware State | ",
 "Upcoming Nov 27, 4:30 PM Men's · Niagara at Lafayette | ",
 "Upcoming Nov 28, 2:00 PM Men's · Niagara vs Le Moyne | ",
 "Upcoming Nov 29, 12:00 PM Men's · Niagara vs Maine | ",
 "Upcoming Dec 4, 6:30 PM Men's · Niagara vs Mount St. Mary's | ",
 "Upcoming Dec 6, 2:00 PM Men's · Niagara vs Rider | ",
 "Upcoming Dec 13, 2:00 PM Men's · Niagara vs Mansfield | ",
 "Upcoming Dec 18, 6:30 PM Men's · Niagara vs Binghamton | ",
 "Upcoming Dec 20, 2:00 PM Men's · Niagara at Duquesne | ",
 "Upcoming Jan 1, 2:00 PM Men's · Niagara at Sacred Heart | ",
 "Upcoming Jan 3, 2:00 PM Men's · Niagara at Marist | ",
 "Upcoming Jan 8, 6:30 PM Men's · Niagara vs Iona | ",
 "Upcoming Jan 10, 2:00 PM Men's · Niagara vs Saint Peter's | ",
 "Upcoming Jan 16, 2:00 PM Men's · Niagara at Quinnipiac | ",
 "Upcoming Jan 18, 1:00 PM Men's · Niagara at Merrimack | ",
 "Upcoming Jan 22, 6:30 PM Men's · Niagara vs Siena | ",
 "Upcoming Jan 24, 12:30 PM Men's · Niagara vs Canisius | ",
 "Upcoming Jan 29, 7:00 PM Men's · Niagara at Manhattan | ",
 "Upcoming Jan 31, 2:00 PM Men's · Niagara at Saint Peter's | ",
 "Upcoming Feb 5, 6:30 PM Men's · Niagara vs Marist | ",
 "Upcoming Feb 7, 2:00 PM Men's · Niagara vs Quinnipiac | ",
 "Upcoming Feb 11, 7:00 PM Men's · Niagara at Canisius | ",
 "Upcoming Feb 13, 1:00 PM Men's · Niagara at Iona | ",
 "Upcoming Feb 19, 6:30 PM Men's · Niagara vs Merrimack | ",
 "Upcoming Feb 21, 2:00 PM Men's · Niagara vs Fairfield | ",
 "Upcoming Feb 26, 7:00 PM Men's · Niagara at Rider | ",
 "Upcoming Feb 28, 2:00 PM Men's · Niagara at Mount St. Mary's | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Today Oct 23, 4:00 PM Women's · Niagara vs Alfred (Exhibition) | ",
 "Upcoming Nov 2, 6:00 PM Women's · Niagara at Fordham | ",
 "Upcoming Nov 5, 7:00 PM Women's · Niagara at Massachusetts Lowell | ",
 "Upcoming Nov 8, 1:00 PM Women's · Niagara vs New Hampshire | ",
 "Upcoming Nov 11, 6:00 PM Women's · Niagara vs Stony Brook | ",
 "Upcoming Nov 14, 1:00 PM Women's · Niagara vs Sacramento State | ",
 "Upcoming Nov 18, 7:00 PM Women's · Niagara at Michigan | ",
 "Upcoming Nov 21, 1:00 PM Women's · Niagara vs Le Moyne | ",
 "Upcoming Nov 24, 6:00 PM Women's · Niagara at Duquesne | ",
 "Upcoming Nov 29, 1:00 PM Women's · Niagara vs Monroe | ",
 "Upcoming Dec 2, 6:00 PM Women's · Niagara vs Cornell | ",
 "Upcoming Dec 6, 1:00 PM Women's · Niagara at Mercyhurst | ",
 "Upcoming Dec 19, 1:00 PM Women's · Niagara at Mount St. Mary's (Md.) | ",
 "Upcoming Dec 21, 4:00 PM Women's · Niagara at Rider | ",
 "Upcoming Jan 1, 1:00 PM Women's · Niagara vs Sacred Heart | ",
 "Upcoming Jan 3, 12:00 PM Women's · Niagara vs Marist | ",
 "Upcoming Jan 7, 6:00 PM Women's · Niagara at Iona | ",
 "Upcoming Jan 9, 2:00 PM Women's · Niagara at Saint Peter's | ",
 "Upcoming Jan 16, 1:00 PM Women's · Niagara vs Quinnipiac | ",
 "Upcoming Jan 18, 1:00 PM Women's · Niagara vs Merrimack | ",
 "Upcoming Jan 21, 6:00 PM Women's · Niagara at Siena | ",
 "Upcoming Jan 23, 1:00 PM Women's · Niagara at Canisius | ",
 "Upcoming Jan 28, 6:00 PM Women's · Niagara vs Manhattan | ",
 "Upcoming Jan 30, 1:00 PM Women's · Niagara vs Saint Peter's | ",
 "Upcoming Feb 4, 7:00 PM Women's · Niagara at Marist | ",
 "Upcoming Feb 6, 2:00 PM Women's · Niagara at Quinnipiac | ",
 "Upcoming Feb 11, 6:00 PM Women's · Niagara vs Canisius | ",
 "Upcoming Feb 13, 1:00 PM Women's · Niagara vs Iona | ",
 "Upcoming Feb 18, 11:00 AM Women's · Niagara at Merrimack | ",
 "Upcoming Feb 20, 2:00 PM Women's · Niagara at Fairfield | ",
 "Upcoming Feb 25, 6:00 PM Women's · Niagara vs Rider | ",
 "Upcoming Feb 27, 1:00 PM Women's · Niagara vs Mount St. Mary's (Md.) | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 3 Niagara at Duquesne | W, 962-902",
 "Final Oct 3 Niagara at D'Youville | W, 859-821",
 "Final Oct 3 Niagara at Daemen | W, 1027-787",
 "Final Oct 3 Niagara at Mercyhurst | L, 937-1003",
 "Final Oct 3 Niagara at William Smith | W, 924-840",
 "Final Oct 4 Niagara at Hilbert | W, 908-800",
 "Final Oct 4 Niagara at Roberts Wesleyan | W, 955-862",
 "Final Oct 4 Niagara at Le Moyne | W, 956-861",
 "Final Oct 4 Niagara at Duquesne | W, 4-3",
 "Final Oct 16 Niagara at North Carolina A&T State | L, 888-987",
 "Final Oct 16 Niagara at Jacksonville State | L, 830-962",
 "Final Oct 16 Niagara at Western Illinois | L, 875-909",
 "Final Oct 16 Niagara at Bryant | W, 988-963",
 "Final Oct 16 Niagara at Wright State | L, 1063-1072",
 "Final Oct 17 Niagara at Maryville | W, 849-829",
 "Final Oct 17 Niagara at Maryland Eastern Shore | W, 986-965",
 "Final Oct 17 Niagara at Valparaiso | W, 986-941",
 "Final Oct 17 Niagara at Arkansas State | L, 977-1043",
 "Final Oct 17 Niagara at Mount St. Mary's | L, 926-971",
 "Final Oct 18 Niagara at Maryland Eastern Shore (Game 1) | L, 3-4",
 "Final Oct 18 Niagara at Duquesne | W, 4-0",
 "Final Oct 18 Niagara at Maryland Eastern Shore (Game 2) | L, 2-4",
 "Upcoming Oct 24 Niagara at NU Fall Open | ",
 "Upcoming Oct 30 Niagara at Destination Florida | ",
 "Upcoming Nov 13 Niagara at NEC Meet 1 | ",
 "Upcoming Nov 21 Niagara at Hilbert Hammer | ",
 "Upcoming Jan 15 Niagara at Day One | ",
 "Upcoming Jan 16 Niagara at Day Two | ",
 "Upcoming Jan 17 Niagara at Day Three | ",
 "Upcoming Jan 31 Niagara at Blizzard Cup | ",
 "Upcoming Feb 12 Niagara at NEC Meet 2 | ",
 "Upcoming Feb 20 Niagara at NU Spring Classic | ",
 "Upcoming Mar 5 Niagara at Music City Classic | ",
 "Upcoming Mar 19 Niagara at NEC Conference Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Niagara at Little Three Championships | 3rd",
 "Final Sep 18 Women's · Niagara at National Catholic Invite | 10th",
 "Final Oct 17 Women's · Niagara at Canisius Alumni Classic | 3rd",
 "Upcoming Oct 31 Women's · Niagara at Metro Championships | ",
 "Upcoming Nov 13 Women's · Niagara at NCAA Northeast Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Niagara at Little Three Championships | 3rd",
 "Final Sep 18 Men's · Niagara at National Catholic Invite | 14th",
 "Final Oct 17 Men's · Niagara at Canisius Alumni Classic | 11th",
 "Upcoming Oct 31 Men's · Niagara at Metro Championships | ",
 "Upcoming Nov 13 Men's · Niagara at NCAA Northeast Regionals | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Niagara at Tribe Invitational | 8th",
 "Final Sep 28 Women's · Niagara at Golf Galaxy Collegiate | 5th",
 "Final Oct 12 Women's · Niagara at Evann Parker Memorial | 3rd",
 "Upcoming Feb 13 Women's · Niagara at Battle at the Beach | ",
 "Upcoming Mar 12 Women's · Niagara at 2027 NKU Spring Fling | ",
 "Upcoming Mar 22 Women's · Niagara at Kingsmill Intercollegiate | ",
 "Upcoming Apr 12 Women's · Niagara at Spring Spectacular | ",
 "Upcoming Apr 20 Women's · Niagara at Metro Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 5 Men's · Niagara at Alex Lagowitz Memorial | 13th",
 "Final Sep 8 Men's · Niagara at Little Three Championship | 3rd",
 "Final Sep 12 Men's · Niagara at Brock Dual Meet | Completed",
 "Final Sep 21 Men's · Niagara at Temple Invitational | 11th",
 "Final Oct 3 Men's · Niagara at Columbia Autumn Invitational | 9th",
 "Final Oct 11 Men's · Niagara at Bucknell Invitational | 14th",
 "Upcoming Apr 11 Men's · Niagara at Sandy Edinger Collegiate | ",
 "Upcoming Apr 27 Men's · Niagara at Metro Championships | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Niagara vs RIT | W, 4-1",
 "Final Oct 3 Niagara at RIT | L, 2-4",
 "Final Oct 8 Niagara at Notre Dame | L, 1-3",
 "Final Oct 9 Niagara at Notre Dame | L, 0-4",
 "Final Oct 16 Niagara at Bowling Green | W, 3-2",
 "Final Oct 17 Niagara at Bowling Green | W, 2-1",
 "Today Oct 23, 7:00 PM Niagara vs Union College | ",
 "Upcoming Oct 24, 6:00 PM Niagara vs Union College | ",
 "Upcoming Oct 30, 7:00 PM Niagara at Clarkson | ",
 "Upcoming Oct 31, 4:00 PM Niagara at Clarkson | ",
 "Upcoming Nov 13, 7:00 PM Niagara vs Holy Cross | ",
 "Upcoming Nov 14, 6:00 PM Niagara vs Holy Cross | ",
 "Upcoming Nov 20, 7:00 PM Niagara vs Canisius | ",
 "Upcoming Nov 21, 7:00 PM Niagara at Canisius | ",
 "Upcoming Nov 24, 7:00 PM Niagara vs Canisius | ",
 "Upcoming Nov 27, 7:00 PM Niagara at Robert Morris | ",
 "Upcoming Nov 28, 7:00 PM Niagara at Robert Morris | ",
 "Upcoming Dec 4, 9:05 PM Niagara at Air Force | ",
 "Upcoming Dec 5, 7:05 PM Niagara at Air Force | ",
 "Upcoming Dec 12, 5:05 PM Niagara at RIT | ",
 "Upcoming Dec 31, 7:00 PM Niagara at Penn State | ",
 "Upcoming Jan 2, 7:00 PM Niagara vs Penn State | ",
 "Upcoming Jan 8, 7:00 PM Niagara vs Bentley | ",
 "Upcoming Jan 9, 5:00 PM Niagara vs Bentley | ",
 "Upcoming Jan 15, 7:00 PM Niagara at Holy Cross | ",
 "Upcoming Jan 16, 6:00 PM Niagara at Holy Cross | ",
 "Upcoming Jan 22, 7:00 PM Niagara vs Air Force | ",
 "Upcoming Jan 23, 6:00 PM Niagara vs Air Force | ",
 "Upcoming Feb 5, 7:00 PM Niagara at Army | ",
 "Upcoming Feb 6, 4:00 PM Niagara at Army | ",
 "Upcoming Feb 19, 7:00 PM Niagara vs Sacred Heart | ",
 "Upcoming Feb 20, 5:00 PM Niagara vs Sacred Heart | ",
 "Upcoming Feb 25, 7:00 PM Niagara vs RIT | ",
 "Upcoming Feb 26, 6:30 PM Niagara at Canisius | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Niagara at University at Buffalo | L, 0-2",
 "Final Aug 20 Women's · Niagara at Le Moyne | W, 2-0",
 "Final Aug 27 Women's · Niagara at Syracuse | W, 2-1",
 "Final Aug 31 Women's · Niagara at St. Bonaventure | W, 3-1",
 "Final Sep 5 Women's · Niagara at Quinnipiac | W, 3-2",
 "Final Sep 12 Women's · Niagara vs Iona | W, 3-1",
 "Final Sep 19 Women's · Niagara at Manhattan | L, 0-1",
 "Final Sep 23 Women's · Niagara vs Siena | W, 1-0",
 "Final Sep 26 Women's · Niagara at Marist | L, 0-3",
 "Final Oct 3 Women's · Niagara vs Saint Peter's | W, 3-0",
 "Final Oct 7 Women's · Niagara vs Mount St. Mary's | W, 2-1",
 "Final Oct 10 Women's · Niagara at Sacred Heart | W, 1-0",
 "Final Oct 17 Women's · Niagara vs Fairfield | W, 2-1",
 "Final Oct 21 Women's · Niagara at Canisius | W, 3-2",
 "Upcoming Oct 24, 11:00 AM Women's · Niagara vs Merrimack | ",
 "Upcoming Oct 31, 1:00 PM Women's · Niagara at Rider | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Niagara vs St. Bonaventure | L, 0-2",
 "Final Aug 27 Men's · Niagara at Michigan | L, 1-3",
 "Final Aug 30 Men's · Niagara at 24 Michigan State | L, 1-4",
 "Final Sep 5 Men's · Niagara at Le Moyne | W, 1-0",
 "Final Sep 9 Men's · Niagara at Mercyhurst | T, 0-0",
 "Final Sep 19 Men's · Niagara at Saint Peter's | L, 1-2",
 "Final Sep 26 Men's · Niagara vs Merrimack | T, 1-1",
 "Final Sep 30 Men's · Niagara vs Siena | T, 0-0",
 "Final Oct 3 Men's · Niagara at Rider | L, 0-3",
 "Final Oct 10 Men's · Niagara at Manhattan | W, 2-1",
 "Final Oct 17 Men's · Niagara vs Sacred Heart | W, 3-2",
 "Upcoming Oct 24, 2:00 PM Men's · Niagara vs Iona | ",
 "Upcoming Oct 28, 2:00 PM Men's · Niagara at Mount St. Mary's | ",
 "Upcoming Oct 31, 2:00 PM Men's · Niagara vs Fairfield | ",
 "Upcoming Nov 4, 6:00 PM Men's · Niagara at Canisius | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Niagara vs McMaster | W, 159-103",
 "Final Oct 9 Women's · Niagara at Colgate Invite | Completed",
 "Final Oct 17 Women's · Niagara at Buffalo | L, 78-216",
 "Final Oct 17 Women's · Niagara at Cornell | Completed",
 "Today Oct 23 Women's · Niagara at Le Moyne | ",
 "Upcoming Nov 20 Women's · Niagara at UB Invite | ",
 "Upcoming Dec 4 Women's · Niagara at St. Bonaventure | ",
 "Upcoming Jan 16 Women's · Niagara at Canisius | ",
 "Upcoming Jan 23, 12:00 PM Women's · Niagara vs Youngstown State | ",
 "Upcoming Feb 17 Women's · Niagara at Metro Championships | ",
 "Upcoming Mar 11 Women's · Niagara at National Invitational Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Niagara vs McMaster | Completed",
 "Final Oct 9 Men's · Niagara at Colgate Invite | Completed",
 "Final Oct 17 Men's · Niagara vs Cornell | Completed",
 "Today Oct 23 Men's · Niagara at Le Moyne | ",
 "Upcoming Nov 20 Men's · Niagara at UB Invite | ",
 "Upcoming Dec 4 Men's · Niagara at St. Bonaventure | ",
 "Upcoming Jan 16 Men's · Niagara at Canisius | ",
 "Upcoming Jan 23, 12:00 PM Men's · Niagara vs Youngstown State | ",
 "Upcoming Feb 17 Men's · Niagara at Metro Championships | ",
 "Upcoming Mar 11 Men's · Niagara at National Invitational Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Niagara at Metro Masters | Completed",
 "Final Oct 9 Women's · Niagara vs University at Buffalo | L, 0-7",
 "Final Oct 9 Women's · Niagara vs St. Bonaventure | W, 5-2",
 "Upcoming Jan 24 Women's · Niagara at Cornell | ",
 "Upcoming Jan 29 Women's · Niagara at Buffalo | ",
 "Upcoming Feb 6 Women's · Niagara at Cleveland State | ",
 "Upcoming Feb 14 Women's · Niagara at Duquesne | ",
 "Upcoming Feb 20 Women's · Niagara at Bucknell | ",
 "Upcoming Mar 6 Women's · Niagara vs Quinnipiac | ",
 "Upcoming Mar 13 Women's · Niagara at Iona | ",
 "Upcoming Mar 14 Women's · Niagara at Merrimack | ",
 "Upcoming Mar 21 Women's · Niagara at Siena | ",
 "Upcoming Mar 27 Women's · Niagara at Mount St. Mary's | ",
 "Upcoming Apr 3 Women's · Niagara vs Fairfield | ",
 "Upcoming Apr 9 Women's · Niagara at Sacred Heart | ",
 "Upcoming Apr 16 Women's · Niagara vs Sacred Heart | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · Niagara at Metro Masters | Completed",
 "Final Oct 18 Men's · Niagara at St. Bonaventure | W, 4-3",
 "Upcoming Jan 30 Men's · Niagara vs Colgate | ",
 "Upcoming Jan 31 Men's · Niagara at Cleveland State | ",
 "Upcoming Feb 14 Men's · Niagara at Duquesne | ",
 "Upcoming Feb 19 Men's · Niagara at Youngstown State | ",
 "Upcoming Mar 6 Men's · Niagara vs Quinnipiac | ",
 "Upcoming Mar 13 Men's · Niagara at Iona | ",
 "Upcoming Mar 14 Men's · Niagara at Merrimack | ",
 "Upcoming Mar 21 Men's · Niagara at Siena | ",
 "Upcoming Mar 27 Men's · Niagara at Mount St. Mary's | ",
 "Upcoming Apr 3 Men's · Niagara vs Fairfield | ",
 "Upcoming Apr 9 Men's · Niagara at Sacred Heart | ",
 "Upcoming Apr 16 Men's · Niagara vs Marist | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Niagara at Marshall | L, 0-3",
 "Final Aug 28 Niagara vs Ohio | L, 0-3",
 "Final Aug 29 Niagara vs Bucknell | L, 1-3",
 "Final Sep 11 Niagara vs Kent State | L, 0-3",
 "Final Sep 11 Niagara vs Columbia | L, 1-3",
 "Final Sep 12 Niagara at Mercyhurst | L, 0-3",
 "Final Sep 18 Niagara vs Valparaiso | L, 0-3",
 "Final Sep 19 Niagara vs Le Moyne | W, 3-0",
 "Final Sep 25 Niagara vs Fairfield | L, 1-3",
 "Final Sep 26 Niagara vs Sacred Heart | L, 1-3",
 "Final Sep 29 Niagara vs Canisius | L, 0-3",
 "Final Oct 2 Niagara at Saint Peter's | L, 0-3",
 "Final Oct 3 Niagara at Rider | L, 1-3",
 "Final Oct 9 Niagara at Manhattan | L, 2-3",
 "Final Oct 10 Niagara at Iona | L, 0-3",
 "Final Oct 16 Niagara vs Merrimack | W, 3-1",
 "Final Oct 17 Niagara vs Quinnipiac | L, 0-3",
 "Today Oct 23, 6:00 PM Niagara at Siena | ",
 "Upcoming Oct 24, 6:00 PM Niagara at Marist | ",
 "Upcoming Oct 27, 6:00 PM Niagara at Canisius | ",
 "Upcoming Oct 30, 6:00 PM Niagara vs Rider | ",
 "Upcoming Oct 31, 2:00 PM Niagara vs Saint Peter's | ",
 "Upcoming Nov 6, 6:00 PM Niagara vs Marist | ",
 "Upcoming Nov 7, 2:00 PM Niagara vs Siena | ",
 "Upcoming Nov 13, 7:00 PM Niagara at Sacred Heart | ",
 "Upcoming Nov 14, 1:00 PM Niagara at Fairfield | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Niagara module checks passed");
