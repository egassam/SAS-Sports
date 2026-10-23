import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {quinnipiacSchool} from '../src/schools/quinnipiac.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='quinnipiac');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,quinnipiacHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/quinnipiac-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit gobobcats.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['quinnipiac'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',quinnipiacSchool.scheduleUrls],['roster',quinnipiacSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('quinnipiac|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'gobobcats.com',`${key} must stay on gobobcats.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://gobobcats.com/sports/acrobatics-tumbling/schedule"],"roster":["https://gobobcats.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://gobobcats.com/sports/baseball/schedule"],"roster":["https://gobobcats.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://gobobcats.com/sports/mens-basketball/schedule","https://gobobcats.com/sports/womens-basketball/schedule"],"roster":["https://gobobcats.com/sports/mens-basketball/roster","https://gobobcats.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://gobobcats.com/sports/womens-cross-country/schedule","https://gobobcats.com/sports/mens-cross-country/schedule"],"roster":["https://gobobcats.com/sports/womens-cross-country/roster","https://gobobcats.com/sports/mens-cross-country/roster"],"combined":true},"Field Hockey":{"schedule":["https://gobobcats.com/sports/field-hockey/schedule"],"roster":["https://gobobcats.com/sports/field-hockey/roster"],"combined":false},"Golf":{"schedule":["https://gobobcats.com/sports/womens-golf/schedule"],"roster":["https://gobobcats.com/sports/womens-golf/roster"],"combined":false},"Hockey":{"schedule":["https://gobobcats.com/sports/mens-ice-hockey/schedule","https://gobobcats.com/sports/womens-ice-hockey/schedule"],"roster":["https://gobobcats.com/sports/mens-ice-hockey/roster","https://gobobcats.com/sports/womens-ice-hockey/roster"],"combined":true},"Lacrosse":{"schedule":["https://gobobcats.com/sports/womens-lacrosse/schedule","https://gobobcats.com/sports/mens-lacrosse/schedule"],"roster":["https://gobobcats.com/sports/womens-lacrosse/roster","https://gobobcats.com/sports/mens-lacrosse/roster"],"combined":true},"Soccer":{"schedule":["https://gobobcats.com/sports/womens-soccer/schedule","https://gobobcats.com/sports/mens-soccer/schedule"],"roster":["https://gobobcats.com/sports/womens-soccer/roster","https://gobobcats.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://gobobcats.com/sports/softball/schedule"],"roster":["https://gobobcats.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://gobobcats.com/sports/womens-tennis/schedule","https://gobobcats.com/sports/mens-tennis/schedule"],"roster":["https://gobobcats.com/sports/womens-tennis/roster","https://gobobcats.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://gobobcats.com/sports/womens-track-and-field/schedule"],"roster":["https://gobobcats.com/sports/womens-track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://gobobcats.com/sports/womens-volleyball/schedule"],"roster":["https://gobobcats.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'quinnipiac|"+sport+"':"),`${sport} routes must live in the Quinnipiac module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://gobobcats.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.quinnipiacHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=quinnipiac)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[
 "Upcoming Feb 14, 12:00 PM Quinnipiac vs Oregon | ",
 "Upcoming Feb 21, 1:00 PM Quinnipiac at Iona | ",
 "Upcoming Mar 6, 1:00 PM Quinnipiac vs Baylor | ",
 "Upcoming Mar 14, 1:00 PM Quinnipiac at Presbyterian College | ",
 "Upcoming Apr 3, 1:00 PM Quinnipiac vs Morgan State | ",
 "Upcoming Apr 9, 6:00 PM Quinnipiac at Manhattan | ",
 "Upcoming Apr 22 Quinnipiac at NCAA Collegiate Championships | "
]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Men's · Quinnipiac at Michigan State | ",
 "Upcoming Nov 5, 7:00 PM Men's · Quinnipiac vs Bryant | ",
 "Upcoming Nov 8, 2:00 PM Men's · Quinnipiac at Vermont | ",
 "Upcoming Nov 12, 7:00 PM Men's · Quinnipiac vs Monmouth | ",
 "Upcoming Nov 15 Men's · Quinnipiac at CCSU | ",
 "Upcoming Nov 19, 7:00 PM Men's · Quinnipiac vs Maine | ",
 "Upcoming Nov 24, 5:30 PM Men's · Quinnipiac vs Emerson | ",
 "Upcoming Nov 29, 2:00 PM Men's · Quinnipiac at Yale | ",
 "Upcoming Dec 4, 7:00 PM Men's · Quinnipiac at Iona | ",
 "Upcoming Dec 6, 2:00 PM Men's · Quinnipiac vs Siena | ",
 "Upcoming Dec 12, 2:00 PM Men's · Quinnipiac vs Hofstra | ",
 "Upcoming Dec 19, 4:30 PM Men's · Quinnipiac at UCLA | ",
 "Upcoming Dec 21 Men's · Quinnipiac at Pepperdine | ",
 "Upcoming Dec 29, 7:00 PM Men's · Quinnipiac at Rider | ",
 "Upcoming Jan 1, 2:00 PM Men's · Quinnipiac vs Saint Peter's | ",
 "Upcoming Jan 3, 1:00 PM Men's · Quinnipiac at Merrimack | ",
 "Upcoming Jan 8, 7:00 PM Men's · Quinnipiac at Manhattan | ",
 "Upcoming Jan 10, 2:00 PM Men's · Quinnipiac vs Marist | ",
 "Upcoming Jan 16, 2:00 PM Men's · Quinnipiac vs Niagara | ",
 "Upcoming Jan 18, 2:00 PM Men's · Quinnipiac at Sacred Heart | ",
 "Upcoming Jan 22, 7:00 PM Men's · Quinnipiac vs Iona | ",
 "Upcoming Jan 24, 2:00 PM Men's · Quinnipiac vs Fairfield | ",
 "Upcoming Jan 29, 7:00 PM Men's · Quinnipiac at Siena | ",
 "Upcoming Jan 31, 2:00 PM Men's · Quinnipiac vs Rider | ",
 "Upcoming Feb 5, 7:00 PM Men's · Quinnipiac at Canisius | ",
 "Upcoming Feb 7, 2:00 PM Men's · Quinnipiac at Niagara | ",
 "Upcoming Feb 11, 7:00 PM Men's · Quinnipiac vs Manhattan | ",
 "Upcoming Feb 13, 7:00 PM Men's · Quinnipiac at Fairfield | ",
 "Upcoming Feb 21, 2:00 PM Men's · Quinnipiac vs Mount St. Mary's | ",
 "Upcoming Feb 26, 7:00 PM Men's · Quinnipiac at Saint Peter's | ",
 "Upcoming Feb 28, 2:00 PM Men's · Quinnipiac vs Merrimack | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:30 PM Women's · Quinnipiac vs St. Joseph's (LI) | ",
 "Upcoming Nov 5, 6:00 PM Women's · Quinnipiac at Vermont | ",
 "Upcoming Nov 8, 2:00 PM Women's · Quinnipiac vs UMBC | ",
 "Upcoming Nov 11, 2:00 PM Women's · Quinnipiac at St. John's | ",
 "Upcoming Nov 14, 2:00 PM Women's · Quinnipiac vs Boston University | ",
 "Upcoming Nov 16, 6:30 PM Women's · Quinnipiac vs Yale | ",
 "Upcoming Nov 19, 6:00 PM Women's · Quinnipiac at Colgate | ",
 "Upcoming Nov 28, 2:00 PM Women's · Quinnipiac vs Wake Forest | ",
 "Upcoming Nov 29, 12:00 PM Women's · Quinnipiac vs CSU Bakersfield | ",
 "Upcoming Dec 6, 1:00 PM Women's · Quinnipiac at Maine | ",
 "Upcoming Dec 13, 2:00 PM Women's · Quinnipiac vs Boston College | ",
 "Upcoming Dec 19, 2:00 PM Women's · Quinnipiac vs Iona | ",
 "Upcoming Dec 21, 11:00 AM Women's · Quinnipiac at Siena | ",
 "Upcoming Dec 29, 6:30 PM Women's · Quinnipiac vs Rider | ",
 "Upcoming Jan 1, 6:00 PM Women's · Quinnipiac at Saint Peter's | ",
 "Upcoming Jan 3, 2:00 PM Women's · Quinnipiac vs Merrimack | ",
 "Upcoming Jan 7, 6:30 PM Women's · Quinnipiac vs Manhattan | ",
 "Upcoming Jan 9, 7:00 PM Women's · Quinnipiac at Marist | ",
 "Upcoming Jan 16, 1:00 PM Women's · Quinnipiac at Niagara | ",
 "Upcoming Jan 18, 2:00 PM Women's · Quinnipiac vs Sacred Heart | ",
 "Upcoming Jan 21, 11:00 AM Women's · Quinnipiac at Iona | ",
 "Upcoming Jan 23, 2:00 PM Women's · Quinnipiac at Fairfield | ",
 "Upcoming Jan 28, 6:30 PM Women's · Quinnipiac vs Siena | ",
 "Upcoming Jan 30, 1:00 PM Women's · Quinnipiac at Rider | ",
 "Upcoming Feb 4, 6:30 PM Women's · Quinnipiac vs Canisius | ",
 "Upcoming Feb 6, 2:00 PM Women's · Quinnipiac vs Niagara | ",
 "Upcoming Feb 11, 7:00 PM Women's · Quinnipiac at Manhattan | ",
 "Upcoming Feb 13, 2:00 PM Women's · Quinnipiac vs Fairfield | ",
 "Upcoming Feb 20, 1:00 PM Women's · Quinnipiac at Mount St. Mary's | ",
 "Upcoming Feb 25, 6:30 PM Women's · Quinnipiac vs Saint Peter's | ",
 "Upcoming Feb 27, 12:00 PM Women's · Quinnipiac at Merrimack | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Quinnipiac at Stony Brook Season Opener | 1st of 4",
 "Final Sep 19 Women's · Quinnipiac at Manhattan Invite | 2nd of 12",
 "Final Oct 2 Women's · Quinnipiac at Paul Short Invite | Completed",
 "Final Oct 16 Women's · Quinnipiac at Under Armour Pre-National Invite | Completed",
 "Upcoming Oct 31 Women's · Quinnipiac at METRO Championships | ",
 "Upcoming Nov 13 Women's · Quinnipiac at NCAA Northeast Regional | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Quinnipiac at Stony Brook Season Opener | 3rd of 4",
 "Final Sep 19 Men's · Quinnipiac at Manhattan Invite | 5th of 12",
 "Final Oct 17 Men's · Quinnipiac at ECAC Championships | Completed",
 "Upcoming Oct 31 Men's · Quinnipiac at METRO Championships | ",
 "Upcoming Nov 13 Men's · Quinnipiac at NCAA Northeast Regional | "
]);
  const v_fieldhockey=parse("Field Hockey","field-hockey");
  assert.deepEqual(v_fieldhockey.map(line),[
 "Final Aug 28 Quinnipiac vs Bryant | W, 2-1",
 "Final Aug 30 Quinnipiac vs Vermont | L, 0-3",
 "Final Sep 4 Quinnipiac at Bucknell | L, 1-2",
 "Final Sep 6 Quinnipiac at Brown | L, 2-4",
 "Final Sep 11 Quinnipiac vs Hofstra | W, 2-1",
 "Final Sep 18 Quinnipiac vs Sacred Heart | W, 2-1",
 "Final Sep 20 Quinnipiac at Columbia | W, 2-1",
 "Final Sep 27 Quinnipiac vs Rider | W, 5-1",
 "Final Oct 2 Quinnipiac vs Wagner | L, 1-2",
 "Final Oct 9 Quinnipiac at LIU | W, 7-1",
 "Final Oct 11 Quinnipiac vs Dartmouth | W, 3-2",
 "Final Oct 16 Quinnipiac at Mercyhurst | W, 5-1",
 "Final Oct 18 Quinnipiac vs Merrimack | W, 7-1",
 "Today Oct 23, 12:00 PM Quinnipiac at New Haven | ",
 "Upcoming Oct 25, 12:00 PM Quinnipiac vs Yale | ",
 "Upcoming Oct 30, 1:00 PM Quinnipiac vs Stonehill | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Quinnipiac at Nittany Lion Invitational | T6th of 18",
 "Final Sep 21 Quinnipiac at Red Bandana Invitational | 6th of 15",
 "Final Oct 12 Quinnipiac at Quinnipiac Classic | 1st of 10",
 "Upcoming Oct 24 Quinnipiac at Lady Blue Hen Invitational | "
]);
  const v_mensicehockey=parse("Hockey","mens-ice-hockey");
  assert.deepEqual(v_mensicehockey.map(line),[
 "Final Oct 2 Men's · Quinnipiac vs New Hampshire | W, 10-2",
 "Final Oct 3 Men's · Quinnipiac vs Merrimack | W, 6-3",
 "Final Oct 9 Men's · Quinnipiac at Maine | W, 2-1",
 "Final Oct 10 Men's · Quinnipiac at Maine | L, 3-5",
 "Final Oct 16 Men's · Quinnipiac at Penn State | W, 6-3",
 "Today Oct 23, 7:00 PM Men's · Quinnipiac vs Army | ",
 "Upcoming Oct 31, 12:00 PM Men's · Quinnipiac vs Providence | ",
 "Upcoming Nov 6, 7:00 PM Men's · Quinnipiac at Cornell | ",
 "Upcoming Nov 7, 7:00 PM Men's · Quinnipiac at Colgate | ",
 "Upcoming Nov 13, 7:00 PM Men's · Quinnipiac vs Dartmouth | ",
 "Upcoming Nov 14, 7:00 PM Men's · Quinnipiac vs Harvard | ",
 "Upcoming Nov 18, 7:00 PM Men's · Quinnipiac at Boston University | ",
 "Upcoming Nov 21, 3:30 PM Men's · Quinnipiac vs Holy Cross | ",
 "Upcoming Nov 29, 4:00 PM Men's · Quinnipiac at Princeton | ",
 "Upcoming Dec 4, 7:00 PM Men's · Quinnipiac vs St. Lawrence | ",
 "Upcoming Dec 5, 7:00 PM Men's · Quinnipiac vs Clarkson | ",
 "Upcoming Dec 12, 7:00 PM Men's · Quinnipiac vs Stonehill | ",
 "Upcoming Jan 2, 4:00 PM Men's · Quinnipiac vs Maryville (Exhibition) | ",
 "Upcoming Jan 3, 4:00 PM Men's · Quinnipiac vs Guelph (Exhibition) | ",
 "Upcoming Jan 8, 7:00 PM Men's · Quinnipiac at Harvard | ",
 "Upcoming Jan 9, 7:00 PM Men's · Quinnipiac at Dartmouth | ",
 "Upcoming Jan 15, 7:00 PM Men's · Quinnipiac vs Colgate | ",
 "Upcoming Jan 16, 7:00 PM Men's · Quinnipiac vs Cornell | ",
 "Upcoming Jan 22, 7:00 PM Men's · Quinnipiac at Brown | ",
 "Upcoming Jan 23, 7:00 PM Men's · Quinnipiac at Yale | ",
 "Upcoming Jan 26, 7:00 PM Men's · Quinnipiac vs Princeton | ",
 "Upcoming Jan 29, 4:00 PM Men's · Quinnipiac vs Yale | ",
 "Upcoming Jan 30, 3:30 PM Men's · Quinnipiac at CT Ice | ",
 "Upcoming Feb 5, 7:00 PM Men's · Quinnipiac vs RPI | ",
 "Upcoming Feb 6, 4:00 PM Men's · Quinnipiac vs Union | ",
 "Upcoming Feb 12, 7:00 PM Men's · Quinnipiac at Clarkson | ",
 "Upcoming Feb 13, 7:00 PM Men's · Quinnipiac at St. Lawrence | ",
 "Upcoming Feb 19, 7:00 PM Men's · Quinnipiac at Union | ",
 "Upcoming Feb 20, 7:00 PM Men's · Quinnipiac at RPI | ",
 "Upcoming Feb 26, 7:00 PM Men's · Quinnipiac vs Yale | ",
 "Upcoming Feb 27, 7:00 PM Men's · Quinnipiac vs Brown | "
]);
  const v_womensicehockey=parse("Hockey","womens-ice-hockey");
  assert.deepEqual(v_womensicehockey.map(line),[
 "Final Sep 19 Women's · Quinnipiac at Connecticut (Exhibition) | W, 3-2",
 "Final Sep 25 Women's · Quinnipiac at Maine | W, 2-1",
 "Final Sep 26 Women's · Quinnipiac at Maine | W, 4-1",
 "Final Oct 2 Women's · Quinnipiac vs Providence College | W, 3-1",
 "Final Oct 3 Women's · Quinnipiac at Providence College | W, 6-1",
 "Final Oct 6 Women's · Quinnipiac vs Post | W, 10-0",
 "Final Oct 16 Women's · Quinnipiac vs Northeastern | T, 2-2",
 "Final Oct 17 Women's · Quinnipiac vs Northeastern | L, 1-5",
 "Today Oct 23, 6:00 PM Women's · Quinnipiac at Union College | ",
 "Upcoming Oct 24, 3:00 PM Women's · Quinnipiac at Rensselaer Polytechnic Institute | ",
 "Upcoming Oct 30, 6:00 PM Women's · Quinnipiac vs Yale | ",
 "Upcoming Oct 31, 3:00 PM Women's · Quinnipiac vs Brown | ",
 "Upcoming Nov 6, 6:00 PM Women's · Quinnipiac vs Cornell | ",
 "Upcoming Nov 7, 3:00 PM Women's · Quinnipiac vs Colgate | ",
 "Upcoming Nov 10, 11:00 AM Women's · Quinnipiac at Sacred Heart | ",
 "Upcoming Nov 20, 6:00 PM Women's · Quinnipiac at St. Lawrence | ",
 "Upcoming Nov 21, 3:00 PM Women's · Quinnipiac at Clarkson | ",
 "Upcoming Nov 27, 3:00 PM Women's · Quinnipiac vs Yale | ",
 "Upcoming Nov 28 Women's · Quinnipiac at Nutmeg Classic | ",
 "Upcoming Dec 4, 6:00 PM Women's · Quinnipiac at Dartmouth College | ",
 "Upcoming Dec 5, 3:00 PM Women's · Quinnipiac at Harvard | ",
 "Upcoming Jan 2, 6:00 PM Women's · Quinnipiac at Minnesota Duluth | ",
 "Upcoming Jan 3, 3:00 PM Women's · Quinnipiac at Minnesota Duluth | ",
 "Upcoming Jan 8, 6:00 PM Women's · Quinnipiac vs Rensselaer Polytechnic Institute | ",
 "Upcoming Jan 9, 3:00 PM Women's · Quinnipiac vs Union College | ",
 "Upcoming Jan 14, 6:00 PM Women's · Quinnipiac vs Princeton | ",
 "Upcoming Jan 16, 3:00 PM Women's · Quinnipiac at Princeton | ",
 "Upcoming Jan 22, 6:00 PM Women's · Quinnipiac vs Harvard | ",
 "Upcoming Jan 23, 3:00 PM Women's · Quinnipiac vs Dartmouth College | ",
 "Upcoming Jan 29, 6:00 PM Women's · Quinnipiac at Brown | ",
 "Upcoming Jan 30, 3:00 PM Women's · Quinnipiac at Yale | ",
 "Upcoming Feb 5, 6:00 PM Women's · Quinnipiac at Colgate | ",
 "Upcoming Feb 6, 3:00 PM Women's · Quinnipiac at Cornell | ",
 "Upcoming Feb 12, 6:00 PM Women's · Quinnipiac vs Clarkson | ",
 "Upcoming Feb 13, 3:00 PM Women's · Quinnipiac vs St. Lawrence | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_menslacrosse=parse("Lacrosse","mens-lacrosse");
  assert.deepEqual(v_menslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 12 Women's · Quinnipiac at Holy Cross | T, 2-2",
 "Final Aug 16 Women's · Quinnipiac at North Carolina | L, 0-8",
 "Final Aug 23 Women's · Quinnipiac vs Yale | W, 1-0",
 "Final Aug 29 Women's · Quinnipiac at UAlbany | W, 2-1",
 "Final Sep 5 Women's · Quinnipiac vs Niagara | L, 2-3",
 "Final Sep 12 Women's · Quinnipiac at Mount St. Mary's | W, 4-1",
 "Final Sep 19 Women's · Quinnipiac vs Marist | W, 2-1",
 "Final Sep 23 Women's · Quinnipiac vs Merrimack | W, 2-1",
 "Final Sep 28 Women's · Quinnipiac at Manhattan | L, 0-2",
 "Final Oct 3 Women's · Quinnipiac at Canisius | W, 1-0",
 "Final Oct 7 Women's · Quinnipiac vs Sacred Heart | W, 1-0",
 "Final Oct 10 Women's · Quinnipiac vs Iona | W, 4-0",
 "Final Oct 17 Women's · Quinnipiac at Rider | W, 1-0",
 "Final Oct 21 Women's · Quinnipiac at Fairfield | W, 1-0",
 "Upcoming Oct 31, 12:00 PM Women's · Quinnipiac vs Siena | ",
 "Upcoming Nov 4, 2:00 PM Women's · Quinnipiac at Saint Peter's | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Quinnipiac at Missouri State | L, 1-3",
 "Final Aug 24 Men's · Quinnipiac vs Providence | W, 3-2",
 "Final Aug 28 Men's · Quinnipiac at Yale | W, 4-3",
 "Final Sep 2 Men's · Quinnipiac at New Haven | L, 0-2",
 "Final Sep 9 Men's · Quinnipiac vs Stony Brook | L, 1-2",
 "Final Sep 19 Men's · Quinnipiac at Rider | W, 1-0",
 "Final Sep 30 Men's · Quinnipiac at Manhattan | W, 3-1",
 "Final Oct 3 Men's · Quinnipiac vs Canisius | W, 5-0",
 "Final Oct 7 Men's · Quinnipiac vs Fairfield | L, 1-2",
 "Final Oct 10 Men's · Quinnipiac at Saint Peter's | T, 2-2",
 "Final Oct 14 Men's · Quinnipiac at Sacred Heart | T, 1-1",
 "Upcoming Oct 24, 1:00 PM Men's · Quinnipiac vs Mount St. Mary's | ",
 "Upcoming Oct 28, 2:00 PM Men's · Quinnipiac vs Iona | ",
 "Upcoming Oct 31, 2:00 PM Men's · Quinnipiac at Siena | ",
 "Upcoming Nov 4, 2:00 PM Men's · Quinnipiac vs Merrimack | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 11 Women's · Quinnipiac at New Haven | Completed",
 "Final Sep 12 Women's · Quinnipiac at Army | Completed",
 "Final Sep 25 Women's · Quinnipiac at West Point Hidden Duals | Completed",
 "Final Oct 2 Women's · Quinnipiac at Metro Masters Tournament | Completed",
 "Final Oct 8 Women's · Quinnipiac at ITA Regional Championship (at Yale) | Completed",
 "Upcoming Oct 24 Women's · Quinnipiac at URI Hidden Duals | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Quinnipiac at Fairfield Invitational | Completed",
 "Final Sep 25 Men's · Quinnipiac at Bulldog Invitational | Completed",
 "Final Oct 2 Men's · Quinnipiac at Metro Masters Tournament | Completed",
 "Final Oct 8 Men's · Quinnipiac at ITA Regionals (at Harvard) | Completed",
 "Upcoming Oct 30 Men's · Quinnipiac at Army Shootout | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 29 Quinnipiac vs Air Force | L, 0-3",
 "Final Aug 30 Quinnipiac at Boston College | L, 0-3",
 "Final Sep 4 Quinnipiac vs Lehigh | L, 1-3",
 "Final Sep 5 Quinnipiac at Delaware State | L, 2-3",
 "Final Sep 5 Quinnipiac vs NJIT | W, 3-0",
 "Final Sep 12 Quinnipiac vs Penn | L, 1-3",
 "Final Sep 13 Quinnipiac at Lafayette | L, 0-3",
 "Final Sep 13 Quinnipiac vs Rhode Island | L, 1-3",
 "Final Sep 18 Quinnipiac vs Boston College | L, 2-3",
 "Final Sep 19 Quinnipiac at Dartmouth | L, 1-3",
 "Final Sep 20 Quinnipiac vs Binghamton | L, 2-3",
 "Final Sep 25 Quinnipiac at Iona | L, 1-3",
 "Final Sep 26 Quinnipiac at Manhattan | W, 3-1",
 "Final Sep 29 Quinnipiac vs Merrimack | W, 3-2",
 "Final Oct 2 Quinnipiac at Fairfield | L, 0-3",
 "Final Oct 3 Quinnipiac at Sacred Heart | W, 3-0",
 "Final Oct 9 Quinnipiac vs Siena | L, 1-3",
 "Final Oct 10 Quinnipiac vs Marist | W, 3-2",
 "Final Oct 16 Quinnipiac at Canisius | W, 3-1",
 "Final Oct 17 Quinnipiac at Niagara | W, 3-0",
 "Today Oct 23, 5:00 PM Quinnipiac vs Rider | ",
 "Upcoming Oct 24, 3:00 PM Quinnipiac vs Saint Peter's | ",
 "Upcoming Oct 27, 7:00 PM Quinnipiac at Merrimack | ",
 "Upcoming Oct 30, 5:00 PM Quinnipiac vs Sacred Heart | ",
 "Upcoming Oct 31, 3:00 PM Quinnipiac vs Fairfield | ",
 "Upcoming Nov 6, 5:00 PM Quinnipiac vs Manhattan | ",
 "Upcoming Nov 7, 3:00 PM Quinnipiac vs Iona | ",
 "Upcoming Nov 13, 7:00 PM Quinnipiac at Marist | ",
 "Upcoming Nov 14, 2:00 PM Quinnipiac at Siena | "
]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_fieldhockey,"Field Hockey field-hockey");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensicehockey,"Hockey mens-ice-hockey");
  ownRecapsOnly(v_womensicehockey,"Hockey womens-ice-hockey");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_menslacrosse,"Lacrosse mens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Quinnipiac module checks passed");
