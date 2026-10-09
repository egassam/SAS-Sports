import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {oregonSchool,OREGON_TFRRS_TEAMS} from '../src/schools/oregon.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='oregon');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,oregonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/oregon-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit goducks.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['oregon'];
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',oregonSchool.scheduleUrls],['roster',oregonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('oregon|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'goducks.com',`${key} must stay on goducks.com`);
  }
}
const parity={"Acrobatics & Tumbling":{"schedule":["https://goducks.com/sports/acrobatics-tumbling/schedule"],"roster":["https://goducks.com/sports/acrobatics-tumbling/roster"],"combined":false},"Baseball":{"schedule":["https://goducks.com/sports/baseball/schedule"],"roster":["https://goducks.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://goducks.com/sports/mens-basketball/schedule","https://goducks.com/sports/womens-basketball/schedule"],"roster":["https://goducks.com/sports/mens-basketball/roster","https://goducks.com/sports/womens-basketball/roster"],"combined":true},"Beach Volleyball":{"schedule":["https://goducks.com/sports/beach-volleyball/schedule"],"roster":["https://goducks.com/sports/beach-volleyball/roster"],"combined":false},"Cross Country":{"schedule":["https://goducks.com/sports/cross-country/schedule"],"roster":["https://goducks.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://goducks.com/sports/football/schedule"],"roster":["https://goducks.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://goducks.com/sports/womens-golf/schedule","https://goducks.com/sports/mens-golf/schedule"],"roster":["https://goducks.com/sports/womens-golf/roster","https://goducks.com/sports/mens-golf/roster"],"combined":true},"Lacrosse":{"schedule":["https://goducks.com/sports/womens-lacrosse/schedule"],"roster":["https://goducks.com/sports/womens-lacrosse/roster"],"combined":false},"Soccer":{"schedule":["https://goducks.com/sports/womens-soccer/schedule"],"roster":["https://goducks.com/sports/womens-soccer/roster"],"combined":false},"Softball":{"schedule":["https://goducks.com/sports/softball/schedule"],"roster":["https://goducks.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://goducks.com/sports/womens-tennis/schedule","https://goducks.com/sports/mens-tennis/schedule"],"roster":["https://goducks.com/sports/womens-tennis/roster","https://goducks.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://goducks.com/sports/track-and-field/schedule"],"roster":["https://goducks.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://goducks.com/sports/womens-volleyball/schedule"],"roster":["https://goducks.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'oregon|"+sport+"':"),`${sport} routes must live in the Oregon module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-09T15:00:00Z");
const page=slug=>`https://goducks.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.oregonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=oregon)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_acrobaticstumbling=parse("Acrobatics & Tumbling","acrobatics-tumbling");
  assert.deepEqual(v_acrobaticstumbling.map(line),[]);
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Oct 15, 7:00 PM Men's · Oregon vs Seattle (Exhibition) | ",
 "Upcoming Oct 21, 5:30 PM Men's · Oregon at Utah (Exhibition) | ",
 "Upcoming Oct 25, 1:30 PM Men's · Oregon vs Stanford (Exhibition) | ",
 "Upcoming Nov 2, 7:00 PM Men's · Oregon vs Montana | ",
 "Upcoming Nov 6 Men's · Oregon vs Eastern Washington | ",
 "Upcoming Nov 11, 7:00 PM Men's · Oregon vs Mississippi Valley State | ",
 "Upcoming Nov 15, 2:00 PM Men's · Oregon vs Pepperdine | ",
 "Upcoming Nov 24 Men's · Oregon vs St. John's | ",
 "Upcoming Nov 26 Men's · Oregon at Players Era Festival | ",
 "Upcoming Dec 1, 7:00 PM Men's · Oregon at UCLA | ",
 "Upcoming Dec 5, 1:00 PM Men's · Oregon vs USC | ",
 "Upcoming Dec 12, 1:00 PM Men's · Oregon vs Indiana State | ",
 "Upcoming Dec 16, 7:30 PM Men's · Oregon vs Southern | ",
 "Upcoming Dec 20, 1:30 PM Men's · Oregon vs Portland State | ",
 "Upcoming Dec 30, 1:00 PM Men's · Oregon at Ohio State | ",
 "Upcoming Jan 2, 11:00 AM Men's · Oregon at Penn State | ",
 "Upcoming Jan 6, 7:30 PM Men's · Oregon vs Indiana | ",
 "Upcoming Jan 10, 3:30 PM Men's · Oregon vs Nebraska | ",
 "Upcoming Jan 16, 1:00 PM Men's · Oregon at Michigan State | ",
 "Upcoming Jan 19, 4:00 PM Men's · Oregon at Michigan | ",
 "Upcoming Jan 23, 4:00 PM Men's · Oregon vs Northwestern | ",
 "Upcoming Jan 27, 8:00 PM Men's · Oregon vs Rutgers | ",
 "Upcoming Jan 30 Men's · Oregon vs Gonzaga | ",
 "Upcoming Feb 3, 5:30 PM Men's · Oregon at Wisconsin | ",
 "Upcoming Feb 7, 1:30 PM Men's · Oregon vs Washington | ",
 "Upcoming Feb 10, 5:30 PM Men's · Oregon at Iowa | ",
 "Upcoming Feb 13, 11:00 AM Men's · Oregon at Minnesota | ",
 "Upcoming Feb 17, 6:00 PM Men's · Oregon vs Maryland | ",
 "Upcoming Feb 20, 2:00 PM Men's · Oregon vs Illinois | ",
 "Upcoming Feb 24, 7:30 PM Men's · Oregon vs Purdue | ",
 "Upcoming Feb 27, 3:00 PM Men's · Oregon at USC | ",
 "Upcoming Mar 3, 7:30 PM Men's · Oregon vs UCLA | ",
 "Upcoming Mar 6, 7:00 PM Men's · Oregon at Washington | ",
 "Upcoming Mar 9 Men's · Oregon at Big Ten Tournament | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Oct 20 Women's · Oregon vs Bushnell | ",
 "Upcoming Nov 2 Women's · Oregon vs Hawai'i | ",
 "Upcoming Nov 6 Women's · Oregon vs Washington State | ",
 "Upcoming Nov 9, 5:00 PM Women's · Oregon at Grand Canyon | ",
 "Upcoming Nov 11, 3:00 PM Women's · Oregon at Vermont | ",
 "Upcoming Nov 13, 4:00 PM Women's · Oregon at Maine | ",
 "Upcoming Nov 17 Women's · Oregon vs Murray State | ",
 "Upcoming Nov 19 Women's · Oregon vs Fairfield | ",
 "Upcoming Nov 26, 8:00 AM Women's · Oregon vs Maryland Eastern Shore | ",
 "Upcoming Nov 27, 8:00 AM Women's · Oregon vs Colorado | ",
 "Upcoming Nov 28, 10:30 AM Women's · Oregon vs Georgia | ",
 "Upcoming Dec 2 Women's · Oregon vs Southern | ",
 "Upcoming Dec 6, 3:00 PM Women's · Oregon vs UCLA | ",
 "Upcoming Dec 13 Women's · Oregon at Oregon State | ",
 "Upcoming Dec 16 Women's · Oregon vs Portland | ",
 "Upcoming Dec 19 Women's · Oregon vs Montana State | ",
 "Upcoming Dec 29, 3:30 PM Women's · Oregon at Ohio State | ",
 "Upcoming Jan 1, 1:00 PM Women's · Oregon at Penn State | ",
 "Upcoming Jan 5 Women's · Oregon vs Wisconsin | ",
 "Upcoming Jan 10, 9:00 AM Women's · Oregon at Michigan | ",
 "Upcoming Jan 13 Women's · Oregon at Michigan State | ",
 "Upcoming Jan 17 Women's · Oregon vs Maryland | ",
 "Upcoming Jan 20 Women's · Oregon vs Purdue | ",
 "Upcoming Jan 24, 3:00 PM Women's · Oregon vs Iowa | ",
 "Upcoming Jan 28, 6:00 PM Women's · Oregon at Minnesota | ",
 "Upcoming Jan 31, 11:00 AM Women's · Oregon at Nebraska | ",
 "Upcoming Feb 4, 7:00 PM Women's · Oregon vs Washington | ",
 "Upcoming Feb 10 Women's · Oregon vs Indiana | ",
 "Upcoming Feb 13 Women's · Oregon at Illinois | ",
 "Upcoming Feb 16, 5:00 PM Women's · Oregon at Northwestern | ",
 "Upcoming Feb 20 Women's · Oregon vs Rutgers | ",
 "Upcoming Feb 25, 7:30 PM Women's · Oregon at Washington | ",
 "Upcoming Feb 28, 1:00 PM Women's · Oregon vs USC | ",
 "Upcoming Mar 3 Women's · Oregon at Big Ten Tournament | "
]);
  const v_beachvolleyball=parse("Beach Volleyball","beach-volleyball");
  assert.deepEqual(v_beachvolleyball.map(line),[]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 26 Men's · Oregon at Cowboy Jamboree | Completed",
 "Final Sep 26 Women's · Oregon at Mike Johnson Classic | Completed",
 "Today Oct 9, 11:15 AM Oregon at Bill Dellinger Invitational | ",
 "Upcoming Oct 30, 8:45 AM Oregon at Big Ten Championships | ",
 "Upcoming Nov 13 Oregon at NCAA West Regional Championships | ",
 "Upcoming Nov 21 Oregon at NCAA Championships | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Sep 5 Oregon vs Boise State | W, 34-27",
 "Final Sep 12 Oregon at Oklahoma State | L, 31-39",
 "Final Sep 18 Oregon vs Portland State | W, 84-0",
 "Final Sep 26 Oregon at USC | W, 41-27",
 "Upcoming Oct 10, 12:30 PM Oregon vs UCLA | ",
 "Upcoming Oct 17 Oregon vs Nebraska | ",
 "Upcoming Oct 24 Oregon at Illinois | ",
 "Upcoming Oct 31 Oregon vs Northwestern | ",
 "Upcoming Nov 7 Oregon at Ohio State | ",
 "Upcoming Nov 14 Oregon vs Michigan | ",
 "Upcoming Nov 20, 5:00 PM Oregon at Michigan State | ",
 "Upcoming Nov 28 Oregon vs Washington | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Sep 7 Women's · Oregon at Annika Intercollegiate | 3rd of 12",
 "Final Sep 14 Women's · Oregon at Jackson T. Stephens Cup | Completed",
 "Final Oct 5 Women's · Oregon at Windy City Classic | 4th of 12",
 "Upcoming Oct 19 Women's · Oregon at Abilene Christian Intercollegiate | ",
 "Upcoming Jan 31 Women's · Oregon at Therese Hession Regional Challenge | ",
 "Upcoming Feb 13 Women's · Oregon at Alice & John Wallace Classic | ",
 "Upcoming Mar 1 Women's · Oregon at Darius Rucker Intercollegiate | ",
 "Upcoming Mar 22 Women's · Oregon at Charles Schwab Women's Collegiate Invitational | ",
 "Upcoming Apr 5 Women's · Oregon at Huntington Bank Collegiate | ",
 "Upcoming Apr 23 Women's · Oregon at Big Ten Championship | ",
 "Upcoming May 10 Women's · Oregon at NCAA Regional | ",
 "Upcoming May 21 Women's · Oregon at NCAA Championships | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 14 Men's · Oregon at Vuori Invitational | 6th of 12",
 "Final Oct 5 Men's · Oregon at OSU Invitational | 1st of 12",
 "Upcoming Oct 19 Men's · Oregon at Saint Mary's Invitational | ",
 "Upcoming Oct 26 Men's · Oregon at The Preserve Golf Club Collegiate | ",
 "Upcoming Feb 4 Men's · Oregon at Amer Ari Intercollegiate | ",
 "Upcoming Feb 15 Men's · Oregon at The Prestige | ",
 "Upcoming Mar 5 Men's · Oregon at Bandon Dunes Championship | ",
 "Upcoming Mar 22 Men's · Oregon at The Duck Invitational | ",
 "Upcoming Mar 25 Men's · Oregon at The Goodwin | ",
 "Upcoming Apr 12 Men's · Oregon at The Western Intercollegiate | ",
 "Upcoming Apr 30 Men's · Oregon at Big Ten Championships | "
]);
  const v_womenslacrosse=parse("Lacrosse","womens-lacrosse");
  assert.deepEqual(v_womenslacrosse.map(line),[]);
  const v_womenssoccer=parse("Soccer","womens-soccer");
  assert.deepEqual(v_womenssoccer.map(line),[
 "Final Aug 8 Oregon at Idaho (Exhibition) | W, 2-1",
 "Final Aug 13 Oregon at Portland State | W, 3-0",
 "Final Aug 16 Oregon vs Gonzaga | W, 3-0",
 "Final Aug 20 Oregon at Santa Clara | T, 1-1",
 "Final Aug 23 Oregon at San Francisco | W, 3-0",
 "Final Aug 27 Oregon vs Oregon State | W, 6-0",
 "Final Sep 3 Oregon vs Utah | W, 1-0",
 "Final Sep 10 Oregon vs Rutgers | L, 0-1",
 "Final Sep 13 Oregon vs Maryland | W, 1-0",
 "Final Sep 18 Oregon at USC | T, 1-1",
 "Final Sep 24 Oregon at Northwestern | L, 0-1",
 "Final Sep 27 Oregon at Illinois | L, 0-2",
 "Final Oct 2 Oregon vs UCLA | L, 0-1",
 "Final Oct 8 Oregon vs Penn State | L, 0-1",
 "Upcoming Oct 11, 1:00 PM Oregon vs Iowa | ",
 "Upcoming Oct 16, 6:00 PM Oregon vs Michigan | ",
 "Upcoming Oct 22, 5:00 PM Oregon at Wisconsin | ",
 "Upcoming Oct 25, 11:00 AM Oregon at Minnesota | ",
 "Upcoming Oct 30, 8:00 PM Oregon at Washington | ",
 "Upcoming Nov 5 Oregon at Big Ten Tournament | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[
 "Upcoming Oct 11, 12:00 PM Oregon vs Clackamas CC (Exhibition) | ",
 "Upcoming Oct 14, 5:30 PM Oregon vs Western Oregon (Exhibition) | ",
 "Upcoming Oct 18, 11:00 AM Oregon vs Western Washington (Exhibition) | ",
 "Upcoming Oct 24, 1:30 PM Oregon vs Oregon Tech (Exhibition) | ",
 "Upcoming Oct 24, 4:00 PM Oregon vs Mt. Hood CC (Exhibition) | ",
 "Upcoming Oct 25, 11:00 AM Oregon vs Southwestern Oregon CC (Exhibition) | ",
 "Upcoming Oct 25, 1:30 PM Oregon vs Southern Oregon (Exhibition) | "
]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Oct 2 Women's · Oregon at Duck Invitational | Completed",
 "Today Oct 8 Women's · Oregon at ITA Northwest Regionals | ",
 "Upcoming Nov 5 Women's · Oregon at ITA Sectional Championships | ",
 "Upcoming Nov 6 Women's · Oregon at Duck Invitational | ",
 "Upcoming Nov 17 Women's · Oregon at NCAA Individual Championships | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Oct 2 Men's · Oregon at San Diego Veterans Classic | Completed",
 "Upcoming Oct 15 Men's · Oregon at ITA Regionals | ",
 "Upcoming Oct 23 Men's · Oregon at Duck Invite | ",
 "Upcoming Oct 30 Men's · Oregon at Dennis Rizza Classic | ",
 "Upcoming Nov 5 Men's · Oregon at ITA Sectional Championships | ",
 "Upcoming Nov 6 Men's · Oregon at Gonzaga Fall Invite | ",
 "Upcoming Nov 18 Men's · Oregon at NCAA Individual Championships | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 Oregon vs Western Kentucky | W, 3-0",
 "Final Aug 29 Oregon at Southeast Missouri | W, 3-1",
 "Final Sep 1 Oregon at Missouri | W, 3-1",
 "Final Sep 4 Oregon vs LIU | W, 3-0",
 "Final Sep 6 Oregon vs Washington State | W, 3-1",
 "Final Sep 11 Oregon at Arizona State | L, 1-3",
 "Final Sep 12 Oregon vs UC Davis | W, 3-0",
 "Final Sep 13 Oregon vs San Diego | W, 3-1",
 "Final Sep 17 Oregon vs Portland State | W, 3-0",
 "Final Sep 20 Oregon vs Oregon State | W, 3-0",
 "Final Sep 24 Oregon at Wisconsin | L, 1-3",
 "Final Sep 26 Oregon at Minnesota | W, 3-1",
 "Final Oct 2 Oregon vs Purdue | W, 3-2",
 "Final Oct 4 Oregon vs Illinois | W, 3-1",
 "Today Oct 9, 4:30 PM Oregon at Michigan State | ",
 "Upcoming Oct 10, 4:00 PM Oregon at Michigan | ",
 "Upcoming Oct 16, 6:00 PM Oregon vs Indiana | ",
 "Upcoming Oct 18, 1:00 PM Oregon vs Rutgers | ",
 "Upcoming Oct 23, 4:00 PM Oregon at Penn State | ",
 "Upcoming Oct 24, 4:00 PM Oregon at Ohio State | ",
 "Upcoming Oct 30, 6:00 PM Oregon vs Maryland | ",
 "Upcoming Nov 1, 1:00 PM Oregon vs Iowa | ",
 "Upcoming Nov 7, 7:00 PM Oregon vs Nebraska | ",
 "Upcoming Nov 8, 6:00 PM Oregon vs Northwestern | ",
 "Upcoming Nov 12, 6:00 PM Oregon at USC | ",
 "Upcoming Nov 14, 5:00 PM Oregon at UCLA | ",
 "Upcoming Nov 17, 6:00 PM Oregon vs Washington | ",
 "Upcoming Nov 20 Oregon at Big Ten Tournament | "
]);
  ownRecapsOnly(v_acrobaticstumbling,"Acrobatics & Tumbling acrobatics-tumbling");
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_beachvolleyball,"Beach Volleyball beach-volleyball");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_womenslacrosse,"Lacrosse womens-lacrosse");
  ownRecapsOnly(v_womenssoccer,"Soccer womens-soccer");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

// TFRRS: the team pages and every saved meet page they link.
const fromTfrrs=teams=>{
  for(const [team,url] of Object.entries(teams)){
    if(!url)continue;const page=fixture(`tfrrs-team-${team==='Women'?'f':'m'}.html.gz`);recapFixtures.set(url,page);
    for(const [href,meet] of page.matchAll(/(?:https:\/\/www\.tfrrs\.org)?\/results\/xc\/(\d+)\/[^"'\s>]*/g))try{recapFixtures.set(new URL(href,'https://www.tfrrs.org').href,fixture(`tfrrs-${meet}.html.gz`));}catch{}
  }
};

// Cross Country: one page, a card per team's meet ("Cowboy Jamboree (m)",
// "Mike Johnson Classic (w)", Sep 26): each reads as its team's meet, with
// its TFRRS team result.
{
  fromTfrrs(OREGON_TFRRS_TEAMS);
  const xc=parse('Cross Country','cross-country').filter(e=>e.status==='Final');
  for(const meet of xc)await worker.attachOfficialMeetResults(meet);
  assert.deepEqual(xc.map(e=>[e.team_label||null,e.title,e.headline,Boolean(e.meet_results_verified)]),[["Men's","Men's · Oregon at Cowboy Jamboree","Men's team: 6th · 162 pts",true],["Women's","Women's · Oregon at Mike Johnson Classic","Women's team: 1st · 18 pts",true]]);
  recapFixtures.clear();requests.length=0;
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Oregon module checks passed');
