import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fordhamSchool} from '../src/schools/fordham.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='fordham');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,fordhamHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/fordham-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit fordhamsports.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['fordham'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',fordhamSchool.scheduleUrls],['roster',fordhamSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('fordham|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'fordhamsports.com',`${key} must stay on fordhamsports.com`);
  }
}
const parity={"Baseball":{"schedule":["https://fordhamsports.com/sports/baseball/schedule"],"roster":["https://fordhamsports.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://fordhamsports.com/sports/mens-basketball/schedule","https://fordhamsports.com/sports/womens-basketball/schedule"],"roster":["https://fordhamsports.com/sports/mens-basketball/roster","https://fordhamsports.com/sports/womens-basketball/roster"],"combined":true},"Cross Country":{"schedule":["https://fordhamsports.com/sports/womens-cross-country/schedule","https://fordhamsports.com/sports/mens-cross-country/schedule"],"roster":["https://fordhamsports.com/sports/womens-cross-country/roster","https://fordhamsports.com/sports/mens-cross-country/roster"],"combined":true},"Football":{"schedule":["https://fordhamsports.com/sports/football/schedule"],"roster":["https://fordhamsports.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://fordhamsports.com/sports/mens-golf/schedule"],"roster":["https://fordhamsports.com/sports/mens-golf/roster"],"combined":false},"Rowing":{"schedule":["https://fordhamsports.com/sports/womens-rowing/schedule"],"roster":["https://fordhamsports.com/sports/womens-rowing/roster"],"combined":false},"Soccer":{"schedule":["https://fordhamsports.com/sports/womens-soccer/schedule","https://fordhamsports.com/sports/mens-soccer/schedule"],"roster":["https://fordhamsports.com/sports/womens-soccer/roster","https://fordhamsports.com/sports/mens-soccer/roster"],"combined":true},"Softball":{"schedule":["https://fordhamsports.com/sports/softball/schedule"],"roster":["https://fordhamsports.com/sports/softball/roster"],"combined":false},"Swimming & Diving":{"schedule":["https://fordhamsports.com/sports/womens-swimming-and-diving/schedule","https://fordhamsports.com/sports/mens-swimming-and-diving/schedule"],"roster":["https://fordhamsports.com/sports/womens-swimming-and-diving/roster","https://fordhamsports.com/sports/mens-swimming-and-diving/roster"],"combined":true},"Tennis":{"schedule":["https://fordhamsports.com/sports/womens-tennis/schedule","https://fordhamsports.com/sports/mens-tennis/schedule"],"roster":["https://fordhamsports.com/sports/womens-tennis/roster","https://fordhamsports.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://fordhamsports.com/sports/womens-track-and-field/schedule","https://fordhamsports.com/sports/mens-track-and-field/schedule"],"roster":["https://fordhamsports.com/sports/womens-track-and-field/roster","https://fordhamsports.com/sports/mens-track-and-field/roster"],"combined":true},"Volleyball":{"schedule":["https://fordhamsports.com/sports/womens-volleyball/schedule"],"roster":["https://fordhamsports.com/sports/womens-volleyball/roster"],"combined":false},"Water Polo":{"schedule":["https://fordhamsports.com/sports/mens-water-polo/schedule"],"roster":["https://fordhamsports.com/sports/mens-water-polo/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'fordham|"+sport+"':"),`${sport} routes must live in the Fordham module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-22T15:00:00Z");
const page=slug=>`https://fordhamsports.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.fordhamHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=fordham)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Final Oct 21 Men's · Fordham vs UMBC (Exhibition) | W, 87-67",
 "Upcoming Oct 24, 7:00 PM Men's · Fordham at Fairfield (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Fordham at Kansas | ",
 "Upcoming Nov 5, 7:30 PM Men's · Fordham vs Stonehill | ",
 "Upcoming Nov 10, 7:00 PM Men's · Fordham vs Iona | ",
 "Upcoming Nov 13, 7:00 PM Men's · Fordham vs LIU | ",
 "Upcoming Nov 17, 7:00 PM Men's · Fordham at Manhattan | ",
 "Upcoming Nov 21, 11:00 AM Men's · Fordham vs Portland | ",
 "Upcoming Nov 22 Men's · Fordham vs San Diego | ",
 "Upcoming Nov 25, 11:00 AM Men's · Fordham vs Mercy | ",
 "Upcoming Nov 28, 2:00 PM Men's · Fordham at Harvard | ",
 "Upcoming Dec 1, 7:00 PM Men's · Fordham vs Boston University | ",
 "Upcoming Dec 3, 7:00 PM Men's · Fordham vs St. Francis (Ill.) | ",
 "Upcoming Dec 7, 7:00 PM Men's · Fordham vs FDU | ",
 "Upcoming Dec 10, 7:00 PM Men's · Fordham vs Bryant | ",
 "Upcoming Dec 20, 2:00 PM Men's · Fordham vs Central Connecticut State | ",
 "Upcoming Dec 30, 7:00 PM Men's · Fordham vs Saint Louis | ",
 "Upcoming Jan 2, 4:00 PM Men's · Fordham at La Salle | ",
 "Upcoming Jan 6, 7:00 PM Men's · Fordham at George Mason | ",
 "Upcoming Jan 9, 2:00 PM Men's · Fordham vs St. Bonaventure | ",
 "Upcoming Jan 13, 7:00 PM Men's · Fordham vs Saint Joseph's | ",
 "Upcoming Jan 16, 7:00 PM Men's · Fordham at Duquesne | ",
 "Upcoming Jan 20, 7:00 PM Men's · Fordham at Davidson | ",
 "Upcoming Jan 27, 7:00 PM Men's · Fordham vs La Salle | ",
 "Upcoming Jan 30, 2:30 PM Men's · Fordham vs George Washington | ",
 "Upcoming Feb 3, 7:00 PM Men's · Fordham at Rhode Island | ",
 "Upcoming Feb 6, 4:30 PM Men's · Fordham vs Dayton | ",
 "Upcoming Feb 9, 7:00 PM Men's · Fordham at Saint Joseph's | ",
 "Upcoming Feb 13, 4:00 PM Men's · Fordham at St. Bonaventure | ",
 "Upcoming Feb 16, 7:00 PM Men's · Fordham vs VCU | ",
 "Upcoming Feb 20, 2:00 PM Men's · Fordham vs Rhode Island | ",
 "Upcoming Feb 27, 3:00 PM Men's · Fordham at Loyola Chicago | ",
 "Upcoming Mar 3, 7:00 PM Men's · Fordham vs Davidson | ",
 "Upcoming Mar 6, 6:00 PM Men's · Fordham at Richmond | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 6:00 PM Women's · Fordham vs Niagara | ",
 "Upcoming Nov 5, 5:00 PM Women's · Fordham vs St. Thomas Aquinas | ",
 "Upcoming Nov 8, 3:00 PM Women's · Fordham vs Monroe | ",
 "Upcoming Nov 11, 6:00 PM Women's · Fordham at Bucknell | ",
 "Upcoming Nov 15, 2:00 PM Women's · Fordham at Manhattan | ",
 "Upcoming Nov 17, 6:00 PM Women's · Fordham at Campbell | ",
 "Upcoming Nov 19, 11:00 AM Women's · Fordham at Duke | ",
 "Upcoming Nov 22, 1:00 PM Women's · Fordham vs Buffalo | ",
 "Upcoming Nov 29, 3:00 PM Women's · Fordham vs Hofstra | ",
 "Upcoming Dec 2, 6:00 PM Women's · Fordham vs Davidson | ",
 "Upcoming Dec 5, 3:00 PM Women's · Fordham vs Central Connecticut State | ",
 "Upcoming Dec 8, 5:00 PM Women's · Fordham at Delaware State | ",
 "Upcoming Dec 12, 2:00 PM Women's · Fordham vs Colgate | ",
 "Upcoming Dec 20, 12:00 PM Women's · Fordham at Penn State | ",
 "Upcoming Dec 30, 6:30 PM Women's · Fordham at Rhode Island | ",
 "Upcoming Jan 2, 3:00 PM Women's · Fordham vs La Salle | ",
 "Upcoming Jan 6, 11:00 AM Women's · Fordham vs VCU | ",
 "Upcoming Jan 9, 2:00 PM Women's · Fordham at Duquesne | ",
 "Upcoming Jan 13, 6:00 PM Women's · Fordham at George Washington | ",
 "Upcoming Jan 16, 3:00 PM Women's · Fordham vs George Mason | ",
 "Upcoming Jan 20, 7:00 PM Women's · Fordham at Saint Joseph's | ",
 "Upcoming Jan 23, 3:00 PM Women's · Fordham vs Richmond | ",
 "Upcoming Jan 30, 2:00 PM Women's · Fordham at St. Bonaventure | ",
 "Upcoming Feb 3, 8:00 PM Women's · Fordham at Loyola Chicago | ",
 "Upcoming Feb 7, 3:00 PM Women's · Fordham vs Rhode Island | ",
 "Upcoming Feb 10, 7:00 PM Women's · Fordham at George Mason | ",
 "Upcoming Feb 13, 3:00 PM Women's · Fordham vs Saint Louis | ",
 "Upcoming Feb 17, 6:00 PM Women's · Fordham vs George Washington | ",
 "Upcoming Feb 21, 2:00 PM Women's · Fordham at La Salle | ",
 "Upcoming Feb 24, 7:00 PM Women's · Fordham at Dayton | ",
 "Upcoming Feb 27, 3:00 PM Women's · Fordham vs St. Bonaventure | ",
 "Upcoming Mar 3 Women's · Fordham at Atlantic 10 Championships | "
]);
  const v_womenscrosscountry=parse("Cross Country","womens-cross-country");
  assert.deepEqual(v_womenscrosscountry.map(line),[
 "Final Sep 5 Women's · Fordham at Stony Brook Season Opener | 3rd of 4",
 "Final Sep 19 Women's · Fordham at Jasper Fall XC Invite | 9th of 12",
 "Final Oct 2 Women's · Fordham at Paul Short Run | 33rd of 37",
 "Final Oct 17 Women's · Fordham at ECAC Championship | 16th of 26",
 "Upcoming Oct 31, 10:00 AM Women's · Fordham at Atlantic 10 Championship | ",
 "Upcoming Nov 13 Women's · Fordham at NCAA Regionals | "
]);
  const v_menscrosscountry=parse("Cross Country","mens-cross-country");
  assert.deepEqual(v_menscrosscountry.map(line),[
 "Final Sep 5 Men's · Fordham at Stony Brook Season Opener | 2nd of 4",
 "Final Sep 19 Men's · Fordham at Jasper Fall XC Invite | 2nd of 12",
 "Final Oct 2 Men's · Fordham at Paul Short Run | 20th of 35",
 "Final Oct 17 Men's · Fordham at IC4A Championship | 14th of 25",
 "Upcoming Oct 31, 10:50 AM Men's · Fordham at Atlantic 10 Championship | ",
 "Upcoming Nov 13 Men's · Fordham at NCAA Regionals | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 28 Fordham vs Colgate | L, 14-24",
 "Final Sep 5 Fordham at North Dakota State | L, 0-38",
 "Final Sep 12 Fordham at Coastal Carolina | L, 7-45",
 "Final Sep 19 Fordham at William & Mary | W, 52-27",
 "Final Sep 26 Fordham vs Stony Brook | L, 16-31",
 "Final Oct 3 Fordham at Lehigh | L, 0-34",
 "Final Oct 10 Fordham vs Richmond | W, 20-14",
 "Final Oct 17 Fordham vs Villanova | L, 17-38",
 "Upcoming Oct 24, 1:00 PM Fordham vs Lafayette College | ",
 "Upcoming Nov 7, 1:00 PM Fordham at Bucknell | ",
 "Upcoming Nov 14, 12:00 PM Fordham vs Georgetown | ",
 "Upcoming Nov 21, 12:00 PM Fordham at Holy Cross | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 19 Fordham at Ryan Lee Memorial | Completed",
 "Final Oct 3 Fordham at Columbia Autumn Invitational | 12th of 13",
 "Final Oct 12 Fordham at Metropolis Intercollegiate | 10th of 12",
 "Final Oct 19 Fordham at Blue Hen Intercollegiate | T11th of 14",
 "Upcoming Oct 26 Fordham at Iona Invitational | ",
 "Upcoming Feb 27 Fordham at In Good Standing Classic | ",
 "Upcoming Mar 23 Fordham at In Good Standing Classic | ",
 "Upcoming Mar 21 Fordham at UC San Diego Invitational | ",
 "Upcoming Mar 26 Fordham at Battle at Rum Pointe | ",
 "Upcoming Apr 5 Fordham at Jasper Spring Collegiate | ",
 "Upcoming Apr 11 Fordham at ABARTA Collegiate Invitational | ",
 "Upcoming Apr 17 Fordham at Roar-EE Invitational | ",
 "Upcoming Apr 26 Fordham at Atlantic 10 Championship | "
]);
  const v_womensrowing=parse("Rowing","womens-rowing");
  assert.deepEqual(v_womensrowing.map(line),[
 "Upcoming Oct 24 Fordham at Head of the Schuykill | ",
 "Upcoming Nov 1 Fordham at Princeton Chase | "
]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 13 Women's · Fordham at Georgetown | L, 1-4",
 "Final Aug 16 Women's · Fordham at Maryland | L, 0-1",
 "Final Aug 23 Women's · Fordham at Marist | W, 2-1",
 "Final Aug 27 Women's · Fordham at Hofstra | W, 1-0",
 "Final Sep 6 Women's · Fordham at Stonehill | T, 1-1",
 "Final Sep 10 Women's · Fordham at Columbia | W, 2-1",
 "Final Sep 13 Women's · Fordham at Yale | L, 1-5",
 "Final Sep 20 Women's · Fordham vs Loyola Chicago | L, 0-3",
 "Final Sep 24 Women's · Fordham at George Mason | L, 2-4",
 "Final Sep 27 Women's · Fordham vs Davidson | L, 1-2",
 "Final Oct 4 Women's · Fordham at St. Bonaventure | W, 5-0",
 "Final Oct 8 Women's · Fordham vs VCU | W, 2-0",
 "Final Oct 11 Women's · Fordham at Saint Joseph's | L, 0-2",
 "Final Oct 18 Women's · Fordham vs La Salle | T, 2-2",
 "Today Oct 22, 7:00 PM Women's · Fordham at Dayton | ",
 "Upcoming Oct 25, 1:00 PM Women's · Fordham vs George Washington | ",
 "Upcoming Nov 1, 1:30 PM Women's · Fordham at Richmond | "
]);
  const v_menssoccer=parse("Soccer","mens-soccer");
  assert.deepEqual(v_menssoccer.map(line),[
 "Final Aug 20 Men's · Fordham at Gonzaga | T, 0-0",
 "Final Aug 23 Men's · Fordham at Santa Clara | L, 0-2",
 "Final Aug 28 Men's · Fordham at Bucknell | W, 2-0",
 "Final Sep 1 Men's · Fordham at Villanova | L, 0-1",
 "Final Sep 5 Men's · Fordham at Lafayette College | W, 2-0",
 "Final Sep 9 Men's · Fordham vs Columbia | L, 0-1",
 "Final Sep 13 Men's · Fordham at St. John's | L, 0-2",
 "Final Sep 19 Men's · Fordham vs Loyola University Chicago | W, 2-0",
 "Final Sep 26 Men's · Fordham at VCU | W, 2-1",
 "Final Oct 3 Men's · Fordham at St. Bonaventure | T, 2-2",
 "Final Oct 7 Men's · Fordham vs Saint Louis | W, 2-1",
 "Final Oct 11 Men's · Fordham vs Rhode Island | L, 3-4",
 "Final Oct 17 Men's · Fordham at Dayton | L, 1-2",
 "Final Oct 21 Men's · Fordham at Davidson College | L, 0-1",
 "Upcoming Oct 31, 5:00 PM Men's · Fordham vs Saint Joseph's | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womensswimminganddiving=parse("Swimming & Diving","womens-swimming-and-diving");
  assert.deepEqual(v_womensswimminganddiving.map(line),[
 "Final Oct 3 Women's · Fordham at Seton Hall | W, 183-115",
 "Final Oct 10 Women's · Fordham at Rutgers Invitational | Completed",
 "Upcoming Oct 23, 4:00 PM Women's · Fordham vs Richmond | ",
 "Upcoming Oct 31, 1:00 PM Women's · Fordham vs Columbia | ",
 "Upcoming Nov 19 Women's · Fordham at Bruno Invitational | ",
 "Upcoming Jan 12, 5:00 PM Women's · Fordham vs Rider | ",
 "Upcoming Jan 16, 12:00 PM Women's · Fordham at Massachusetts | ",
 "Upcoming Jan 23, 12:00 PM Women's · Fordham vs La Salle | ",
 "Upcoming Feb 17 Women's · Fordham at Atlantic 10 Championship | ",
 "Upcoming Mar 17 Women's · Fordham at NCAA Championship | "
]);
  const v_mensswimminganddiving=parse("Swimming & Diving","mens-swimming-and-diving");
  assert.deepEqual(v_mensswimminganddiving.map(line),[
 "Final Oct 3 Men's · Fordham at Seton Hall | Completed",
 "Final Oct 10 Men's · Fordham at Rutgers Invitational | Completed",
 "Upcoming Oct 23, 4:00 PM Men's · Fordham vs Columbia (Scr.) (Exhibition) | ",
 "Upcoming Oct 31, 1:00 PM Men's · Fordham vs NJIT | ",
 "Upcoming Nov 19 Men's · Fordham at Bruno Invitational | ",
 "Upcoming Jan 12, 5:00 PM Men's · Fordham vs Rider | ",
 "Upcoming Jan 16, 12:00 PM Men's · Fordham at Massachusetts | ",
 "Upcoming Jan 23, 12:00 PM Men's · Fordham vs La Salle | ",
 "Upcoming Feb 17 Men's · Fordham at Atlantic 10 Championship | ",
 "Upcoming Mar 24 Men's · Fordham at NCAA Championship | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Fordham at Fordham Four Invite 1 | Completed",
 "Final Oct 2 Women's · Fordham at Atlantic 10 Individual Championships | Completed",
 "Final Oct 15 Women's · Fordham at ITA Northeast Regionals | Completed",
 "Upcoming Oct 23 Women's · Fordham at Fordham Four Invite 2 | ",
 "Upcoming Oct 29 Women's · Fordham at UTR Invitational | ",
 "Upcoming Nov 4 Women's · Fordham at ITA Conference Masters Championships | ",
 "Upcoming Nov 7 Women's · Fordham vs UTR Prize Money | ",
 "Upcoming Nov 17 Women's · Fordham at NCAA Singles and Doubles Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · Fordham at Fairfield Invitational | Completed",
 "Final Sep 25 Men's · Fordham at Hofstra Invitational | Completed",
 "Final Oct 2 Men's · Fordham at Atlantic 10 Individual Championships | Completed",
 "Final Oct 10 Men's · Fordham at Fordham Fall Invitational | Completed",
 "Final Oct 15 Men's · Fordham at ITA Northeast Regionals | Completed",
 "Today Oct 19 Men's · Fordham at WTT M15 | "
]);
  const v_womenstrackandfield=parse("Track & Field","womens-track-and-field");
  assert.deepEqual(v_womenstrackandfield.map(line),[
 "Upcoming Dec 4 Women's · Fordham at Fast Track Season Opener | ",
 "Upcoming Dec 5 Women's · Fordham at Youree Spence-Garcia Invitational | ",
 "Upcoming Jan 9 Women's · Fordham at West Point Invitational | ",
 "Upcoming Jan 15 Women's · Fordham at NYC Gotham Cup | ",
 "Upcoming Jan 22 Women's · Fordham at Ramapo College Indoor Opener | ",
 "Upcoming Jan 29 Women's · Fordham at Dr. Sander Scorcher | ",
 "Upcoming Feb 5 Women's · Fordham at IC4A Championship | ",
 "Upcoming Feb 12 Women's · Fordham at David Hemery Valentine Invitational | ",
 "Upcoming Feb 13 Women's · Fordham at Giegengack Invitational | ",
 "Upcoming Feb 19 Women's · Fordham at Armory Collegiate Last Chance | ",
 "Upcoming Feb 26 Women's · Fordham at Betterment Atlantic 10 Indoor Track & Field Championships | ",
 "Upcoming Mar 25 Women's · Fordham at Raleigh Relays | ",
 "Upcoming Mar 26 Women's · Fordham at Hurricane Collegiate Invitational | ",
 "Upcoming Mar 31 Women's · Fordham at Texas Relays | ",
 "Upcoming Apr 3 Women's · Fordham at Sam Howell Invitational | ",
 "Upcoming Apr 3 Women's · Fordham at Dalton Ebanks Invitational | ",
 "Upcoming Apr 10 Women's · Fordham at Rutgers Relays | ",
 "Upcoming Apr 17 Women's · Fordham at IC4A Championships | ",
 "Upcoming Apr 22 Women's · Fordham at Penn Relays | ",
 "Upcoming Apr 30 Women's · Fordham at Larry Ellis Invitational | ",
 "Upcoming May 6 Women's · Fordham at West Point Twilight | ",
 "Upcoming May 14 Women's · Fordham at Atlantic 10 Outdoor Track & Field Championships | ",
 "Upcoming May 26 Women's · Fordham at NCAA East Regional | ",
 "Upcoming Jun 9 Women's · Fordham at NCAA Outdoor Track & Field Championships | "
]);
  const v_menstrackandfield=parse("Track & Field","mens-track-and-field");
  assert.deepEqual(v_menstrackandfield.map(line),[
 "Upcoming Dec 4 Men's · Fordham at Fast Track Season Opener | ",
 "Upcoming Dec 5 Men's · Fordham at Youree Spence-Garcia Invitational | ",
 "Upcoming Jan 9 Men's · Fordham at West Point Invitational | ",
 "Upcoming Jan 15 Men's · Fordham at NYC Gotham Cup | ",
 "Upcoming Jan 22 Men's · Fordham at Ramapo College Indoor Opener | ",
 "Upcoming Jan 29 Men's · Fordham at Dr. Sander Scorcher | ",
 "Upcoming Feb 5 Men's · Fordham at IC4A Championship | ",
 "Upcoming Feb 12 Men's · Fordham at David Hemery Valentine Invitational | ",
 "Upcoming Feb 13 Men's · Fordham at Giegengack Invitational | ",
 "Upcoming Feb 19 Men's · Fordham at Armory Collegiate Last Chance | ",
 "Upcoming Feb 26 Men's · Fordham at Betterment Atlantic 10 Indoor Track & Field Championships | ",
 "Upcoming Mar 25 Men's · Fordham at Raleigh Relays | ",
 "Upcoming Mar 26 Men's · Fordham at Hurricane Collegiate Invitational | ",
 "Upcoming Mar 31 Men's · Fordham at Texas Relays | ",
 "Upcoming Apr 3 Men's · Fordham at Sam Howell Invitational | ",
 "Upcoming Apr 3 Men's · Fordham at Dalton Ebanks Invitational | ",
 "Upcoming Apr 10 Men's · Fordham at Rutgers Relays | ",
 "Upcoming Apr 17 Men's · Fordham at IC4A Championships | ",
 "Upcoming Apr 22 Men's · Fordham at Penn Relays | ",
 "Upcoming Apr 30 Men's · Fordham at Larry Ellis Invitational | ",
 "Upcoming May 6 Men's · Fordham at West Point Twilight | ",
 "Upcoming May 14 Men's · Fordham at Atlantic 10 Outdoor Track & Field Championships | ",
 "Upcoming May 26 Men's · Fordham at NCAA East Regional | ",
 "Upcoming Jun 9 Men's · Fordham at NCAA Outdoor Track & Field Championships | "
]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Fordham vs Rider | L, 2-3",
 "Final Aug 29 Fordham at Temple | W, 3-1",
 "Final Aug 29 Fordham vs Manhattan | W, 3-2",
 "Final Sep 1 Fordham vs FDU | W, 3-0",
 "Final Sep 4 Fordham vs New Haven | W, 3-1",
 "Final Sep 4 Fordham at Delaware | L, 2-3",
 "Final Sep 8 Fordham vs St. John's | L, 0-3",
 "Final Sep 11 Fordham vs Marist | L, 1-3",
 "Final Sep 12 Fordham vs Merrimack | W, 3-1",
 "Final Sep 12 Fordham at Bryant | W, 3-0",
 "Final Sep 18 Fordham vs North Florida | L, 0-3",
 "Final Sep 18 Fordham vs Kennesaw St. | L, 0-3",
 "Final Sep 19 Fordham at Georgia Southern | L, 0-3",
 "Final Sep 25 Fordham at Duquesne | L, 2-3",
 "Final Sep 26 Fordham at Duquesne | L, 1-3",
 "Final Oct 2 Fordham vs Dayton | L, 0-3",
 "Final Oct 3 Fordham vs Dayton | L, 0-3",
 "Final Oct 7 Fordham at Rhode Island | W, 3-0",
 "Final Oct 10 Fordham vs George Mason | W, 3-1",
 "Final Oct 11 Fordham vs George Mason | W, 3-1",
 "Final Oct 16 Fordham vs Saint Louis | L, 2-3",
 "Final Oct 17 Fordham vs Saint Louis | L, 0-3",
 "Upcoming Oct 23, 6:00 PM Fordham at George Washington | ",
 "Upcoming Oct 24, 1:00 PM Fordham at George Washington | ",
 "Upcoming Oct 28, 5:00 PM Fordham vs Rhode Island | ",
 "Upcoming Oct 30, 6:00 PM Fordham at Loyola Chicago | ",
 "Upcoming Oct 31, 1:00 PM Fordham at Loyola Chicago | ",
 "Upcoming Nov 6, 6:00 PM Fordham vs VCU | ",
 "Upcoming Nov 7, 2:00 PM Fordham vs VCU | ",
 "Upcoming Nov 13, 7:00 PM Fordham at Davidson | ",
 "Upcoming Nov 14, 1:00 PM Fordham at Davidson | "
]);
  const v_menswaterpolo=parse("Water Polo","mens-water-polo");
  assert.deepEqual(v_menswaterpolo.map(line),[
 "Final Aug 29 Fordham vs Pacific | W, 15-14",
 "Final Aug 29 Fordham vs Gannon | W, 26-5",
 "Final Aug 30 Fordham vs UC Davis | W, 13-10",
 "Final Aug 30 Fordham vs Iona | W, 23-7",
 "Final Sep 11 Fordham vs Pepperdine | W, 16-12",
 "Final Sep 13 Fordham vs San Jose State | W, 14-10",
 "Final Sep 19 Fordham at Bucknell | W, 21-11",
 "Final Sep 19 Fordham vs Mt. St. Mary's | W, 23-5",
 "Final Sep 19 Fordham vs Mercyhurst | W, 26-3",
 "Final Sep 25 Fordham at UCLA | L, 11-16",
 "Final Sep 27 Fordham at Long Beach State | W, 14-10",
 "Final Sep 28 Fordham at Cal Baptist | W, 10-6",
 "Final Oct 9 Fordham vs Wagner | W, 20-8",
 "Final Oct 10 Fordham vs Princeton | W, 16-14",
 "Final Oct 10 Fordham vs Navy | W, 16-13",
 "Final Oct 11 Fordham vs George Washington | W, 17-12",
 "Final Oct 15 Fordham vs Iona | W, 24-10",
 "Final Oct 17 Fordham vs Bucknell | W, 19-5",
 "Final Oct 17 Fordham vs Mt. St. Mary's | W, 24-8",
 "Final Oct 17 Fordham vs Mercyhurst | W, 26-4",
 "Upcoming Oct 24, 12:00 PM Fordham at Wagner | ",
 "Upcoming Oct 25, 10:00 AM Fordham at Navy | ",
 "Upcoming Oct 25, 2:00 PM Fordham vs George Washington | ",
 "Upcoming Oct 30, 6:00 PM Fordham at Princeton | ",
 "Upcoming Nov 6, 7:00 PM Fordham at Cal | ",
 "Upcoming Nov 8, 11:00 AM Fordham at Stanford | ",
 "Upcoming Nov 20 Fordham at Mid-Atlantic Water Polo Championship | ",
 "Upcoming Dec 4 Fordham at National Collegiate Men's Water Polo Championship | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womenscrosscountry,"Cross Country womens-cross-country");
  ownRecapsOnly(v_menscrosscountry,"Cross Country mens-cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womensrowing,"Rowing womens-rowing");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_menssoccer,"Soccer mens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womensswimminganddiving,"Swimming & Diving womens-swimming-and-diving");
  ownRecapsOnly(v_mensswimminganddiving,"Swimming & Diving mens-swimming-and-diving");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_womenstrackandfield,"Track & Field womens-track-and-field");
  ownRecapsOnly(v_menstrackandfield,"Track & Field mens-track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
  ownRecapsOnly(v_menswaterpolo,"Water Polo mens-water-polo");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("Fordham module checks passed");
