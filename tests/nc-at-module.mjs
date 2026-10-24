import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ncAtSchool} from '../src/schools/nc-at.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='nc-at');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,ncAtHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/nc-at-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ncataggies.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['nc-at'];
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',ncAtSchool.scheduleUrls],['roster',ncAtSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('nc-at|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'ncataggies.com',`${key} must stay on ncataggies.com`);
  }
}
const parity={"Baseball":{"schedule":["https://ncataggies.com/sports/baseball/schedule"],"roster":["https://ncataggies.com/sports/baseball/roster"],"combined":false},"Basketball":{"schedule":["https://ncataggies.com/sports/mens-basketball/schedule","https://ncataggies.com/sports/womens-basketball/schedule"],"roster":["https://ncataggies.com/sports/mens-basketball/roster","https://ncataggies.com/sports/womens-basketball/roster"],"combined":true},"Bowling":{"schedule":["https://ncataggies.com/sports/womens-bowling/schedule"],"roster":["https://ncataggies.com/sports/womens-bowling/roster"],"combined":false},"Cross Country":{"schedule":["https://ncataggies.com/sports/cross-country/schedule"],"roster":["https://ncataggies.com/sports/cross-country/roster"],"combined":false},"Football":{"schedule":["https://ncataggies.com/sports/football/schedule"],"roster":["https://ncataggies.com/sports/football/roster"],"combined":false},"Golf":{"schedule":["https://ncataggies.com/sports/womens-golf/schedule","https://ncataggies.com/sports/mens-golf/schedule"],"roster":["https://ncataggies.com/sports/womens-golf/roster","https://ncataggies.com/sports/mens-golf/roster"],"combined":true},"Softball":{"schedule":["https://ncataggies.com/sports/softball/schedule"],"roster":["https://ncataggies.com/sports/softball/roster"],"combined":false},"Tennis":{"schedule":["https://ncataggies.com/sports/womens-tennis/schedule","https://ncataggies.com/sports/mens-tennis/schedule"],"roster":["https://ncataggies.com/sports/womens-tennis/roster","https://ncataggies.com/sports/mens-tennis/roster"],"combined":true},"Track & Field":{"schedule":["https://ncataggies.com/sports/track-and-field/schedule"],"roster":["https://ncataggies.com/sports/track-and-field/roster"],"combined":false},"Volleyball":{"schedule":["https://ncataggies.com/sports/womens-volleyball/schedule"],"roster":["https://ncataggies.com/sports/womens-volleyball/roster"],"combined":false}};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,`${sport} schedule routes must match route parity (update this table when a sport is corrected)`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,`${sport} roster routes must match route parity`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,`${sport} team combination must match`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'nc-at|"+sport+"':"),`${sport} routes must live in the North Carolina A&T module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-23T15:00:00Z");
const page=slug=>`https://ncataggies.com/sports/${slug}/schedule`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.ncAtHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=nc-at)
// Every sport in K-State's results format, as the official pages publish it.
{
  const v_baseball=parse("Baseball","baseball");
  assert.deepEqual(v_baseball.map(line),[]);
  const v_mensbasketball=parse("Basketball","mens-basketball");
  assert.deepEqual(v_mensbasketball.map(line),[
 "Upcoming Nov 3, 7:00 PM Men's · NC A&T vs Warren Wilson | ",
 "Upcoming Nov 7, 1:00 PM Men's · NC A&T at Ohio | ",
 "Upcoming Nov 11, 4:00 PM Men's · NC A&T at East Carolina | ",
 "Upcoming Nov 14, 2:00 PM Men's · NC A&T vs Cheyney University of Pennsylvania | ",
 "Upcoming Nov 18, 7:00 PM Men's · NC A&T vs Morgan State | ",
 "Upcoming Nov 23, 7:00 PM Men's · NC A&T at South Carolina State | ",
 "Upcoming Nov 28, 2:00 PM Men's · NC A&T vs Delaware State | ",
 "Upcoming Dec 1, 4:00 PM Men's · NC A&T vs Washington Adventist | ",
 "Upcoming Dec 5, 2:00 PM Men's · NC A&T at Maryland Eastern Shore | ",
 "Upcoming Dec 9, 7:00 PM Men's · NC A&T vs James Madison | ",
 "Upcoming Dec 12, 6:30 PM Men's · NC A&T at Furman | ",
 "Upcoming Dec 17, 7:00 PM Men's · NC A&T at Howard | ",
 "Upcoming Dec 22 Men's · NC A&T at Charlotte | ",
 "Upcoming Dec 31, 2:00 PM Men's · NC A&T at Elon | ",
 "Upcoming Jan 2, 4:00 PM Men's · NC A&T at College of Charleston | ",
 "Upcoming Jan 7, 7:00 PM Men's · NC A&T vs North Carolina Wilmington | ",
 "Upcoming Jan 9, 2:00 PM Men's · NC A&T at Campbell | ",
 "Upcoming Jan 14, 7:00 PM Men's · NC A&T vs Stony Brook | ",
 "Upcoming Jan 16, 2:00 PM Men's · NC A&T vs College of Charleston | ",
 "Upcoming Jan 18, 9:00 PM Men's · NC A&T vs Hampton | ",
 "Upcoming Jan 21, 7:00 PM Men's · NC A&T at Towson | ",
 "Upcoming Jan 23 Men's · NC A&T at Drexel | ",
 "Upcoming Jan 28, 7:00 PM Men's · NC A&T vs Monmouth | ",
 "Upcoming Feb 4 Men's · NC A&T at Hofstra | ",
 "Upcoming Feb 6 Men's · NC A&T at Northeastern | ",
 "Upcoming Feb 11 Men's · NC A&T vs Elon | ",
 "Upcoming Feb 13 Men's · NC A&T vs Drexel | ",
 "Upcoming Feb 18 Men's · NC A&T at Hampton | ",
 "Upcoming Feb 20 Men's · NC A&T vs William & Mary | ",
 "Upcoming Feb 25, 8:30 PM Men's · NC A&T at North Carolina Wilmington | ",
 "Upcoming Feb 27, 2:00 PM Men's · NC A&T vs Campbell | "
]);
  const v_womensbasketball=parse("Basketball","womens-basketball");
  assert.deepEqual(v_womensbasketball.map(line),[
 "Upcoming Nov 2, 7:00 PM Women's · NC A&T vs Wingate | ",
 "Upcoming Nov 6, 6:00 PM Women's · NC A&T at Marshall | ",
 "Upcoming Nov 10, 8:00 PM Women's · NC A&T at Nebraska | ",
 "Upcoming Nov 13, 6:00 PM Women's · NC A&T vs Guilford College | ",
 "Upcoming Nov 17, 7:00 PM Women's · NC A&T vs Liberty | ",
 "Upcoming Nov 20, 6:00 PM Women's · NC A&T at Navy | ",
 "Upcoming Nov 27, 11:00 AM Women's · NC A&T vs Abilene Christian | ",
 "Upcoming Nov 28, 1:30 PM Women's · NC A&T at North Florida | ",
 "Upcoming Dec 1, 7:00 PM Women's · NC A&T vs Bowling Green | ",
 "Upcoming Dec 12, 2:00 PM Women's · NC A&T vs Kennesaw State | ",
 "Upcoming Dec 16, 6:00 PM Women's · NC A&T at North Carolina Central | ",
 "Upcoming Dec 19, 2:00 PM Women's · NC A&T vs Saint Francis | ",
 "Upcoming Dec 29, 2:00 PM Women's · NC A&T vs Lander | ",
 "Upcoming Jan 1, 2:00 PM Women's · NC A&T vs Hampton | ",
 "Upcoming Jan 3, 1:00 PM Women's · NC A&T at North Carolina Wilmington | ",
 "Upcoming Jan 8, 7:00 PM Women's · NC A&T vs Stony Brook | ",
 "Upcoming Jan 10, 1:00 PM Women's · NC A&T vs Drexel | ",
 "Upcoming Jan 15, 6:00 PM Women's · NC A&T at College of Charleston | ",
 "Upcoming Jan 17, 1:00 PM Women's · NC A&T at Elon | ",
 "Upcoming Jan 24, 1:00 PM Women's · NC A&T at Northeastern | ",
 "Upcoming Jan 29, 7:00 PM Women's · NC A&T vs Monmouth | ",
 "Upcoming Jan 31, 2:00 PM Women's · NC A&T vs North Carolina Wilmington | ",
 "Upcoming Feb 5, 7:00 PM Women's · NC A&T at Hampton | ",
 "Upcoming Feb 7, 1:00 PM Women's · NC A&T at William & Mary | ",
 "Upcoming Feb 12, 7:00 PM Women's · NC A&T vs Hofstra | ",
 "Upcoming Feb 14, 2:00 PM Women's · NC A&T at Campbell | ",
 "Upcoming Feb 21, 2:00 PM Women's · NC A&T vs William & Mary | ",
 "Upcoming Feb 26, 7:00 PM Women's · NC A&T vs Elon | ",
 "Upcoming Feb 28, 2:00 PM Women's · NC A&T vs Campbell | ",
 "Upcoming Mar 4, 6:30 PM Women's · NC A&T at Towson | ",
 "Upcoming Mar 6, 2:00 PM Women's · NC A&T at Hofstra | "
]);
  const v_womensbowling=parse("Bowling","womens-bowling");
  assert.deepEqual(v_womensbowling.map(line),[
 "Final Oct 9 NC A&T at Colonial Classic | W, 966-945",
 "Final Oct 9 NC A&T vs Texas Southern | W, 850-833",
 "Final Oct 9 NC A&T vs Southern | W, 918-756",
 "Final Oct 9 NC A&T vs Prairie View A&M | W, 986-840",
 "Final Oct 9 NC A&T vs Oklahoma Christian | W, 930-875",
 "Final Oct 10 NC A&T vs Louisiana Tech | W, 1063-979",
 "Final Oct 10 NC A&T vs Sam Houston | W, 1027-960",
 "Final Oct 10 NC A&T vs Emmanuel (Ga.) | W, 982-900",
 "Final Oct 10 NC A&T vs Alabama State | W, 1050-904",
 "Final Oct 10 NC A&T vs Jackson State | W, 969-783",
 "Final Oct 11 NC A&T vs Louisiana Tech (Game 1) | L, 1-4",
 "Final Oct 11 NC A&T vs Tulane | W, 4-3",
 "Final Oct 11 NC A&T vs Louisiana Tech (Game 2) | L, 2-4",
 "Final Oct 16 NC A&T at Penguin Classic | W, 1097-1014",
 "Final Oct 16 NC A&T vs Niagara | W, 987-888",
 "Final Oct 16 NC A&T vs Mercyhurst | W, 953-928",
 "Final Oct 16 NC A&T vs Vanderbilt | L, 1085-1169",
 "Final Oct 16 NC A&T vs Nebraska | L, 1005-1125",
 "Final Oct 17 NC A&T vs Wright State | L, 864-946",
 "Final Oct 17 NC A&T vs Sacred Heart | L, 923-982",
 "Final Oct 17 NC A&T vs Maryville | W, 1086-1004",
 "Final Oct 17 NC A&T vs William Smith College | W, 1031-975",
 "Final Oct 17 NC A&T vs Duquesne | W, 1013-872",
 "Final Oct 18 NC A&T vs Sacred Heart | W, 4-1",
 "Final Oct 18 NC A&T vs Arkansas State | W, 4-2",
 "Final Oct 18 NC A&T vs Wright State | W, 4-3",
 "Upcoming Oct 30 NC A&T at Destination/ Orlando | ",
 "Upcoming Nov 13 NC A&T at Kat Klash | ",
 "Upcoming Jan 15 NC A&T at NE Classic | ",
 "Upcoming Jan 22 NC A&T at PVAMU Invite | ",
 "Upcoming Feb 5 NC A&T at MEAC Meet #2 | ",
 "Upcoming Feb 19 NC A&T at Big Red Invite | ",
 "Upcoming Feb 26 NC A&T at Stallings Invite | ",
 "Upcoming Mar 5 NC A&T at Music City Classic | ",
 "Upcoming Mar 12 NC A&T at USBC Sectional Championships | ",
 "Upcoming Mar 19 NC A&T at Mid-Eastern Athletic Conference Championship | ",
 "Upcoming Apr 6 NC A&T at NCAA Nationals | ",
 "Upcoming Apr 12 NC A&T at USBC National Championships | "
]);
  const v_crosscountry=parse("Cross Country","cross-country");
  assert.deepEqual(v_crosscountry.map(line),[
 "Final Sep 4 NC A&T at Elon | Completed",
 "Final Sep 11 NC A&T at Livingstone College | Completed",
 "Final Sep 26 NC A&T at Catawba College | Completed",
 "Final Oct 2 NC A&T at UNC Greensboro | Completed",
 "Upcoming Oct 30 NC A&T at Coastal Athletic Association | "
]);
  const v_football=parse("Football","football");
  assert.deepEqual(v_football.map(line),[
 "Final Aug 29 NC A&T vs Morgan State | L, 7-17",
 "Final Sep 4 NC A&T at Georgia State | L, 10-59",
 "Final Sep 12 NC A&T at North Carolina Central | L, 22-30",
 "Final Sep 19 NC A&T at Campbell | L, 14-42",
 "Final Sep 26 NC A&T vs Rhode Island | W, 22-18",
 "Final Oct 3 NC A&T at Bryant | L, 30-31",
 "Final Oct 10 NC A&T vs New Hampshire | W, 30-27",
 "Final Oct 17 NC A&T vs Chicago State | W, 27-12",
 "Upcoming Oct 31, 1:00 PM NC A&T vs Elon | ",
 "Upcoming Nov 7, 12:00 PM NC A&T at Monmouth | ",
 "Upcoming Nov 14, 1:00 PM NC A&T at Hampton | ",
 "Upcoming Nov 21, 12:00 PM NC A&T vs University at Albany | "
]);
  const v_womensgolf=parse("Golf","womens-golf");
  assert.deepEqual(v_womensgolf.map(line),[
 "Final Aug 24 Women's · NC A&T at Truist Championship | 6th",
 "Final Sep 7 Women's · NC A&T at Folds of Honor Collegiate | Completed",
 "Final Sep 14 Women's · NC A&T at Elon Invitational | Completed",
 "Final Oct 17 Women's · NC A&T at SAS HBCU Championship | Completed",
 "Today Oct 23 Women's · NC A&T at Fripp Island Intercollegiate | ",
 "Upcoming Feb 7 Women's · NC A&T at Treasure Coast Invitational | ",
 "Upcoming Feb 21 Women's · NC A&T at Arcis HBCU | ",
 "Upcoming Mar 1 Women's · NC A&T at River Landing Classic | ",
 "Upcoming Mar 21 Women's · NC A&T at City of Oaks Collegiate | ",
 "Upcoming Mar 29 Women's · NC A&T at Mimosa Hills Intercollegiate | ",
 "Upcoming Apr 4 Women's · NC A&T at Carolina Challenge Cup | ",
 "Upcoming Apr 18 Women's · NC A&T at CAA Championship | ",
 "Upcoming May 5 Women's · NC A&T at NCAA Regionals | "
]);
  const v_mensgolf=parse("Golf","mens-golf");
  assert.deepEqual(v_mensgolf.map(line),[
 "Final Sep 12 Men's · NC A&T at Bryan National Collegiate | Completed",
 "Final Sep 21 Men's · NC A&T at River Run Collegiate | Completed",
 "Final Sep 28 Men's · NC A&T at Ironwood Collegiate Classic | Completed",
 "Final Oct 17 Men's · NC A&T at SAS HBCU Invitational | Completed",
 "Today Oct 23 Men's · NC A&T at Fripp Island Intercollegiate | ",
 "Upcoming Feb 12 Men's · NC A&T at UNCG Palmas del Mar Collegiate | ",
 "Upcoming Feb 20 Men's · NC A&T at Savannah Intercollegiate | ",
 "Upcoming Mar 8 Men's · NC A&T at Surf Club Invitational | ",
 "Upcoming Mar 21 Men's · NC A&T at GCAA Invitational | ",
 "Upcoming Apr 5 Men's · NC A&T at Memphis Intercollegiate | ",
 "Upcoming Apr 25 Men's · NC A&T at CAA Championship | "
]);
  const v_softball=parse("Softball","softball");
  assert.deepEqual(v_softball.map(line),[]);
  const v_womenstennis=parse("Tennis","womens-tennis");
  assert.deepEqual(v_womenstennis.map(line),[
 "Final Sep 25 Women's · NC A&T at College of Coastal Georgia Tournament | Completed",
 "Final Oct 8 Women's · NC A&T at ITA Carolina Regionals | Completed",
 "Today Oct 23 Women's · NC A&T at Georgia Southern Tournament | ",
 "Upcoming Oct 30 Women's · NC A&T at UNC Wilmington Invitational | "
]);
  const v_menstennis=parse("Tennis","mens-tennis");
  assert.deepEqual(v_menstennis.map(line),[
 "Final Sep 18 Men's · NC A&T at Tennessee Wesleyan University UTR | Completed",
 "Final Sep 18 Men's · NC A&T at UNC Wilmington UTR Invitational | Completed",
 "Final Oct 8 Men's · NC A&T at ITA Carolina Regionals | Completed",
 "Upcoming Oct 30 Men's · NC A&T at Wake Forest Invitational | "
]);
  const v_trackandfield=parse("Track & Field","track-and-field");
  assert.deepEqual(v_trackandfield.map(line),[]);
  const v_womensvolleyball=parse("Volleyball","womens-volleyball");
  assert.deepEqual(v_womensvolleyball.map(line),[
 "Final Aug 28 NC A&T vs Appalachian State | W, 3-2",
 "Final Aug 29 NC A&T vs Bryant | W, 3-1",
 "Final Aug 30 NC A&T at Charlotte | L, 0-3",
 "Final Sep 3 NC A&T vs Queens University of Charlotte | W, 3-0",
 "Final Sep 4 NC A&T vs Presbyterian College | L, 1-3",
 "Final Sep 5 NC A&T at Furman | W, 3-1",
 "Final Sep 10 NC A&T vs North Carolina Central | W, 3-0",
 "Final Sep 11 NC A&T vs UNC Greensboro | L, 1-3",
 "Final Sep 12 NC A&T vs Davidson College | L, 1-3",
 "Final Sep 17 NC A&T vs Wake Forest | L, 0-3",
 "Final Sep 18 NC A&T at High Point | L, 2-3",
 "Final Sep 25 NC A&T at Northeastern | L, 1-3",
 "Final Sep 26 NC A&T at Northeastern | L, 2-3",
 "Final Oct 2 NC A&T vs College of Charleston | L, 2-3",
 "Final Oct 3 NC A&T vs College of Charleston | L, 1-3",
 "Final Oct 9 NC A&T at William & Mary | W, 3-0",
 "Final Oct 10 NC A&T at William & Mary | W, 3-1",
 "Final Oct 16 NC A&T vs North Carolina Wilmington | W, 3-0",
 "Final Oct 17 NC A&T vs North Carolina Wilmington | W, 3-1",
 "Today Oct 23, 6:00 PM NC A&T at Campbell | ",
 "Upcoming Oct 24, 4:00 PM NC A&T at Campbell | ",
 "Upcoming Oct 29, 6:00 PM NC A&T vs Towson | ",
 "Upcoming Oct 30, 4:00 PM NC A&T vs Towson | ",
 "Upcoming Nov 6, 6:00 PM NC A&T vs Elon | ",
 "Upcoming Nov 7, 3:00 PM NC A&T vs Elon | ",
 "Upcoming Nov 13, 3:00 PM NC A&T at Hofstra | ",
 "Upcoming Nov 14, 2:00 PM NC A&T at Hofstra | ",
 "Upcoming Nov 19 NC A&T at Colonial Athletic Association Tournament | "
]);
  ownRecapsOnly(v_baseball,"Baseball baseball");
  ownRecapsOnly(v_mensbasketball,"Basketball mens-basketball");
  ownRecapsOnly(v_womensbasketball,"Basketball womens-basketball");
  ownRecapsOnly(v_womensbowling,"Bowling womens-bowling");
  ownRecapsOnly(v_crosscountry,"Cross Country cross-country");
  ownRecapsOnly(v_football,"Football football");
  ownRecapsOnly(v_womensgolf,"Golf womens-golf");
  ownRecapsOnly(v_mensgolf,"Golf mens-golf");
  ownRecapsOnly(v_softball,"Softball softball");
  ownRecapsOnly(v_womenstennis,"Tennis womens-tennis");
  ownRecapsOnly(v_menstennis,"Tennis mens-tennis");
  ownRecapsOnly(v_trackandfield,"Track & Field track-and-field");
  ownRecapsOnly(v_womensvolleyball,"Volleyball womens-volleyball");
}
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log("North Carolina A&T module checks passed");
