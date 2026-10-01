import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='byu');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,VERIFIED_TEAM_TAG_INSTAGRAM,attachOfficialHighlights,byuHandlers,labelTeamEvents,mergeEvents,attachOfficialMeetResults};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit byucougars.com routes.
const sports=sponsoredSports.byu;
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',byuSchool.scheduleUrls],['roster',byuSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('byu|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'byucougars.com',`${key} must stay on byucougars.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(byuSchool.scheduleUrls[`byu|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(byuSchool.rosterUrls[`byu|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'byu\|/.test(read('../src/index.js')),'BYU configuration must live in its module, not shared code');
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Cross Country','Golf','Swimming & Diving'],'both teams are shown for these sports');
for(const [key,url] of Object.entries(byuSchool.verifiedInstagrams))assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get(key),url,'verified Instagram tags are still used');
// The neighbouring schools keep their own routes.
assert.equal(worker.candidateUrls(schools.find(s=>s.id==='ucf'),'Football')[0],'https://ucfknights.com/sports/football/schedule');

// Football: the official cards give each game's opponent, result, recap and
// published local time. The shared parsers read the cards and the page's
// schema data separately, so every upcoming game appeared twice and a phantom
// Nov 28 final reused the Sep 5 score and recap.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/byu-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://byucougars.com/sports/football/schedule',now=new Date('2026-10-01T16:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,12,'one event per official card');
assert.equal(new Set(football.map(e=>e.id)).size,12,'no duplicate events');
const finals=football.filter(e=>e.status==='Final');
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 5','BYU vs Utah Tech','W, 63-7','63','7'],['Sep 12','BYU vs Arizona','W, 28-17','28','17'],['Sep 19','BYU at Colorado State','W, 41-23','41','23']
]);
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),[
  'https://byucougars.com/news/2026/09/05/byu-utah-tech','https://byucougars.com/news/2026/09/12/byu-arizona',
  'https://byucougars.com/news/2026/09/19/no-11-byu-overpowers-colorado-state-41-23'
],'every final links its own official recap, not the Preview');
const upcoming=football.filter(e=>e.status==='Upcoming');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'BYU at TCU Oct 3, 5:00 PM','BYU vs Iowa State Oct 9, 8:15 PM','BYU vs Notre Dame Oct 17','BYU at UCF Oct 24','BYU vs Arizona State Oct 31',
  'BYU at Utah Nov 7','BYU vs Baylor Nov 14','BYU at Kansas Nov 21','BYU vs Cincinnati Nov 28'
]);
assert.equal(upcoming[1].start_time,'2026-10-09T20:15:00.000Z','published times are Mountain wall clock, on the published day (Friday Oct 9)');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[3,9]);
assert.deepEqual(group.results.map(e=>e.display_time),['Sep 19','Sep 12','Sep 5'],'results newest first, as K-State');
// Expanded view: BYU recaps rarely say "football" (title "No. 14 BYU Opens
// Season with 63-7 Win over Utah Tech", URL /news/2026/09/05/byu-utah-tech), so
// the shared matcher rejected every card recap and production built
// highlights from other teams' games. The card-bound recap now matches its own
// game only, and the highlights are written from that article.
const recaps=['recap-2026-09-05-utah-tech.html.gz','recap-2026-09-12-arizona.html.gz','recap-2026-09-19-colorado-state.html.gz'].map(fixture);
finals.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
finals.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.byuHandlers.matchesRecap(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
assert.equal(worker.byuHandlers.matchesRecap(recaps[0],finals[0],'https://byucougars.com/news/2026/09/05/another-story'),false,'a link that is not the card recap still needs the sport named');
for(const [i,expected] of [[0,'Utah Tech'],[1,'Arizona'],[2,'Colorado State']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['BYU scored on its first drive of the game against the visitors.','The Cougar defense forced two turnovers in the first half of play.','BYU added two more touchdowns in the third quarter to pull away.','The Cougars closed out the win with a long drive in the fourth quarter.'])};}}};
  const events=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
  const target=events.filter(e=>e.status==='Final')[i];
  await worker.attachOfficialHighlights(events,fixture('football-schedule.html.gz'),school,'Football',footballUrl,now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated',`${expected}: highlights come from the official recap`);
  assert.equal(target.recap_url,finals[i].recap_url,`${expected}: the card's own recap is kept`);
  assert.equal(target.highlights.length,4);
  assert.equal(prompts.length,1);
  assert.ok(prompts[0].includes(expected)&&prompts[0].includes(target.headline.slice(3)),`${expected}: the AI is given that game's article`);
}
// A card recap for a different game is rejected; nothing else is invented.
{
  const events=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
  const target=events.find(e=>e.status==='Final');
  recapFixtures.set(target.recap_url,recaps[1]);
  await worker.attachOfficialHighlights(events,fixture('football-schedule.html.gz'),school,'Football',footballUrl,now,{AI:{run:async()=>{throw Error('AI must not run');}}},target.id);
  assert.equal(target.highlight_state,'recap_not_found');
  assert.ok(!target.recap_url&&!target.highlights.length);
  recapFixtures.set(target.recap_url||finals[0].recap_url,recaps[0]);
}
// Volleyball: production listed every match twice (Oct 1 and "Wed. Oct. 1,
// 2026"). Rankings read "No. 2 Pittsburgh"; Recap links are plain relative
// "/news/..." links; the Aug 15 Blue-White Scrimmage is internal.
const volleyballUrl='https://byucougars.com/sports/womens-volleyball/schedule';
const volleyball=worker.parseHtml(fixture('womens-volleyball-schedule.html.gz'),school,'Volleyball',volleyballUrl,now);
assert.equal(volleyball.length,28,'28 matches; the Blue-White Scrimmage is skipped');
assert.equal(new Set(volleyball.map(e=>e.id)).size,28,'no duplicate matches');
const volleyballFinals=volleyball.filter(e=>e.status==='Final');
assert.equal(volleyballFinals.length,11);
assert.deepEqual(volleyballFinals.slice(3,5).map(e=>[e.display_time,e.title,e.headline]),[['Sep 3','BYU vs Eastern Illinois','W, 3-0'],['Sep 4','BYU vs Pittsburgh','L, 1-3']],'"No. 2" rankings are dropped');
assert.ok(volleyballFinals.every(e=>/^https:\/\/byucougars\.com\/news\/2026\//.test(e.recap_url)),'every final links its own official recap');
assert.equal(volleyballFinals[0].recap_url,'https://byucougars.com/news/2026/08/22/no-24-cougars-sweep-trailblazers-in-exhibition-match');
assert.ok(!volleyball.some(e=>/scrimmage/i.test(e.title)));
assert.deepEqual(volleyball.filter(e=>e.status!=='Final').slice(0,2).map(e=>`${e.status} ${e.title} ${e.display_time}`),['Today BYU at Kansas State Oct 1, 5:30 PM','Upcoming BYU at Kansas Oct 2, 5:00 PM']);
assert.equal(volleyball.at(-1).start_time,'2026-11-27T18:30:00.000Z','November times are Mountain Standard wall clock');
{const [g]=worker.groupEvents(volleyball,now);assert.deepEqual([g.results.length,g.upcoming.length],[11,17]);}
// Soccer: same duplication in production. The Aug 1 intrasquad lists BYU
// against itself; the Big 12 tournament card's opponent is "TBA"; the Sep 3
// Colorado State card links the Aug 28 Minnesota recap, which is refused.
const soccer=worker.parseHtml(fixture('womens-soccer-schedule.html.gz'),school,'Soccer','https://byucougars.com/sports/womens-soccer/schedule',now);
assert.equal(soccer.length,20,'the intrasquad is skipped');
assert.ok(!soccer.some(e=>e.opponent==='BYU'));
const soccerFinals=soccer.filter(e=>e.status==='Final');
assert.equal(soccerFinals.length,11);
assert.deepEqual(soccerFinals.filter(e=>/^T/.test(e.headline)).map(e=>`${e.display_time} ${e.title} ${e.headline}`),['Sep 5 BYU vs Oklahoma T, 1-1','Sep 18 BYU at Arizona T, 1-1'],'ties keep K-State\'s format');
const colorado=soccerFinals.find(e=>e.opponent==='Colorado State');
assert.equal(colorado.recap_url,undefined,'a recap dated before the game belongs to another game');
assert.equal(soccerFinals.filter(e=>e.recap_url).length,10);
assert.equal(soccerFinals.find(e=>e.opponent==='Minnesota').recap_url,'https://byucougars.com/news/2026/08/28/cougs-capitalize-on-own-goal-defeat-minnesota-1-0');
assert.deepEqual(soccer.at(-1)&&[soccer.at(-1).title,soccer.at(-1).display_time],['BYU vs Big 12 Soccer Tournament','Nov 9'],'a TBA opponent takes its tournament heading');
{const [g]=worker.groupEvents(soccer,now);assert.deepEqual([g.results.length,g.upcoming.length],[11,9]);}
// A recap must name BYU. Production's opponent-site fallback matched a
// cubuffs.com story (Colorado vs New Mexico) to the Sep 3 Colorado State game.
// cubuffs.com refuses the sandbox, so this is a minimal stand-in page with the
// same title, not the official article.
const otherTeamsStory='<meta property="og:title" content="Soccer: Early Goals Power Buffs Past New Mexico"><script type="application/ld+json">{"articleBody":"BOULDER, Colo. - Colorado State transfer Ruby Hayward scored in the 7th minute on September 3, 2026 as the Buffs beat New Mexico in soccer."}</script>';
assert.equal(worker.byuHandlers.matchesRecap(otherTeamsStory,{...colorado,start_time:'2026-09-03T12:00:00.000Z'},'https://cubuffs.com/news/2026/9/3/soccer-early-goals-power-buffs-past-new-mexico'),false,'a story that never names BYU is not a BYU recap');
assert.ok(finals.every((event,i)=>worker.byuHandlers.matchesRecap(recaps[i],event,event.recap_url)),'BYU\'s own recaps still match');
// Cross Country: production read only the women's page and showed meets as
// "Completed". Both teams' pages are read (labeled, separate ids); the card
// gives the team finish; race rows come from the meet's own recap tables.
const xc={};
for(const team of ['womens','mens']){
  const url=`https://byucougars.com/sports/${team}-cross-country/schedule`;
  xc[team]=worker.labelTeamEvents(worker.parseHtml(fixture(`${team}-cross-country-schedule.html.gz`),school,'Cross Country',url,now),school,'Cross Country',url);
}
const xcEvents=worker.mergeEvents([xc.womens,xc.mens]);
assert.equal(xcEvents.length,12,'six meets per team; the shared Big 12 and NCAA meets stay separate per team');
assert.deepEqual(xcEvents.filter(e=>e.status==='Final').map(e=>[e.display_time,e.title,e.headline]),[
  ['Sep 4',"Women's · BYU at UVU Invitational","Women's team: 1st · 19 pts"],['Sep 26',"Women's · BYU at Cowboy Jamboree","Women's team: 1st · 32 pts"],
  ['Sep 4',"Men's · BYU at Utah Valley Invitational","Men's team: 1st · 17 pts"],['Sep 19',"Men's · BYU at John McNichols Invitational","Men's team: 1st · 71 pts"]
]);
assert.deepEqual(xcEvents.filter(e=>e.status!=='Final').map(e=>`${e.title} ${e.display_time}`).slice(0,2),["Women's · BYU at Pre-Nationals Oct 16, 8:00 AM","Women's · BYU at Big 12 Championships Oct 31"]);
const xcRecaps={
  'https://byucougars.com/news/2026/09/4/no-4-byu-dominates-uvu-invitational-hedengren-takes-first':'xc-recap-2026-09-04-uvu-invitational-women.html.gz',
  'https://byucougars.com/news/2026/09/26/no-3-byu-secures-second-win-of-the-season-at-cowboy-jamboree-taking-down-no-2-new-mexico':'xc-recap-2026-09-26-cowboy-jamboree-women.html.gz',
  'https://byucougars.com/news/2026/09/4/no-9-byu-dominate-utah-valley-invitational-open-season-with-a-win':'xc-recap-2026-09-04-utah-valley-invitational-men.html.gz',
  'https://byucougars.com/news/2026/09/19/kitchen-leads-byu-to-win-in-john-mcnichols-invitational':'xc-recap-2026-09-19-john-mcnichols-men.html.gz'
};
for(const [url,name] of Object.entries(xcRecaps))recapFixtures.set(url,fixture(name));
const xcFinals=xcEvents.filter(e=>e.status==='Final');
for(const event of xcFinals)await worker.attachOfficialMeetResults(event);
const rowsOf=event=>event.results.map(r=>`${r.group} | ${r.participant} | ${r.result}`);
assert.deepEqual(rowsOf(xcFinals[0]),["Women's race | BYU team | 1st · 19 pts","Women's race | Jane Hedengren | 1st · 15:08.62","Women's race | Jenna Hutchins | 3rd · 15:44.65","Women's race | Taylor Lovell | 4th · 16:04.57","Women's race | Lexi Goff-Thompson | 5th · 16:10.28","Women's race | Nelah Roberts | 6th · 16:13.16","Women's race | Zariel Macchia | 7th · 16:19.61","Women's race | Karrie Baloga | 8th · 16:20.65"],'only BYU runners from the top-10 table; other schools are left out');
assert.deepEqual(rowsOf(xcFinals[1]).slice(0,3),["Women's race | BYU team | 1st · 32 pts","Women's race | Jane Hedengren | 3rd · 19:32.5","Women's race | Jenna Hutchins | 5th · 19:56.9"],'the team-score table is skipped; no distance is claimed from recap prose');
assert.ok(rowsOf(xcFinals[2]).slice(1).every(row=>/\| \d{1,2}:\d{2}\.\d$/.test(row)),'a table without a place column gives times only, never guessed places');
assert.deepEqual(rowsOf(xcFinals[3]).slice(0,3),["Men's race | BYU team | 1st · 71 pts","Men's race | Tayvon Kitchen | 3rd · 23:23.1","Men's race | Noah Jenkins | 14th · 24:01.5"]);
assert.deepEqual(xcFinals.map(e=>e.highlights[0]),["Jane Hedengren led BYU in the women's race, finishing 1st in 15:08.62.","Jane Hedengren led BYU in the women's race, finishing 3rd in 19:32.5.","Tayvon Kitchen led BYU in the men's race, finishing in 13:21.4.","Tayvon Kitchen led BYU in the men's race, finishing 3rd in 23:23.1."]);
assert.ok(xcFinals.every(e=>e.meet_results_verified&&e.highlight_state==='official_recap_results'&&e.recap_result_count===e.results.length));
// Basketball: production listed 128 upcoming games (duplicates) from
// inherited generic routes. Both official pages only, labeled by team.
assert.deepEqual(byuSchool.scheduleUrls['byu|Basketball'],['https://byucougars.com/sports/mens-basketball/schedule','https://byucougars.com/sports/womens-basketball/schedule']);
const hoops={};
for(const team of ['mens','womens']){
  const url=`https://byucougars.com/sports/${team}-basketball/schedule`;
  hoops[team]=worker.labelTeamEvents(worker.parseHtml(fixture(`${team}-basketball-schedule.html.gz`),school,'Basketball',url,now),school,'Basketball',url);
}
assert.deepEqual([hoops.mens.length,hoops.womens.length],[34,33]);
const hoopsEvents=worker.mergeEvents([hoops.mens,hoops.womens]);
assert.equal(hoopsEvents.length,67,'no duplicate games; the teams keep separate ids');
assert.ok(hoops.mens.every(e=>e.id.endsWith('-mens')&&e.title.startsWith("Men's · "))&&hoops.womens.every(e=>e.id.endsWith('-womens')&&e.title.startsWith("Women's · ")));
assert.deepEqual(hoops.mens.slice(7,10).map(e=>`${e.title} ${e.display_time}`),["Men's · BYU vs Washington Nov 23, 3:00 PM","Men's · BYU vs Clemson/Ole Miss Nov 24","Men's · BYU vs Southwest Maui Invitational Nov 25"],'a "TBD" bracket game takes its tournament heading');
assert.deepEqual(hoops.womens.slice(0,2).map(e=>`${e.title} ${e.display_time}`),["Women's · BYU vs Western Colorado Oct 27, 7:00 PM","Women's · BYU vs Idaho State Nov 3, 7:00 PM"]);
// Baseball: the "Fall 2026" page lists five fall games; production showed
// ten (duplicates). The Oct 30 "vs. BYU" intrasquad is internal.
assert.equal(byuSchool.scheduleUrls['byu|Baseball'],'https://byucougars.com/sports/baseball/schedule','the homepage fallback is gone');
const baseball=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball','https://byucougars.com/sports/baseball/schedule',now);
assert.deepEqual(baseball.map(e=>`${e.status} ${e.title} ${e.display_time}`),['Upcoming BYU vs Utah Oct 2, 4:00 PM','Upcoming BYU vs SLCC Oct 7, 5:30 PM','Upcoming BYU at Air Force Oct 24','Upcoming BYU at UNLV Nov 7']);
// Softball: the "2026 (Fall)" page; production showed 17 games (duplicates).
// The Oct 10 noon card names no opponent and is skipped; the Sep 30 Weber
// State game publishes no result, so it is not shown as a final.
assert.equal(byuSchool.scheduleUrls['byu|Softball'],'https://byucougars.com/sports/softball/schedule');
const softball=worker.parseHtml(fixture('softball-schedule.html.gz'),school,'Softball','https://byucougars.com/sports/softball/schedule',now);
assert.equal(softball.length,8);
assert.ok(!softball.some(e=>e.status==='Final'),'no result is invented for an unreported game');
{const [g]=worker.groupEvents(softball,now);assert.deepEqual(g.upcoming.map(e=>`${e.title} ${e.display_time}`).slice(0,3),['BYU vs Idaho State Oct 2, 6:00 PM','BYU vs SLCC Oct 8, 6:00 PM','BYU vs Utah Tech Oct 10, 3:00 PM']);assert.equal(g.upcoming.length,7);}
// Golf: production showed only the women's page (first route) with no
// placings. Both teams, labeled; the card's team place ("9th (María José ...
// - T-6th)") is the result. Field size and score are not published.
assert.deepEqual(byuSchool.scheduleUrls['byu|Golf'],['https://byucougars.com/sports/mens-golf/schedule','https://byucougars.com/sports/womens-golf/schedule']);
const golf={};
for(const team of ['mens','womens']){
  const url=`https://byucougars.com/sports/${team}-golf/schedule`;
  golf[team]=worker.labelTeamEvents(worker.parseHtml(fixture(`${team}-golf-schedule.html.gz`),school,'Golf',url,now),school,'Golf',url);
}
assert.deepEqual([golf.mens.length,golf.womens.length],[14,13]);
assert.deepEqual([...golf.mens,...golf.womens].filter(e=>e.status==='Final').map(e=>`${e.display_time} ${e.title} ${e.headline}`),["Sep 14 Men's · BYU at Vuori Invitational 4th","Sep 25 Men's · BYU at William H. Tucker Invitational 3rd","Sep 8 Women's · BYU at The Bruzzy 9th","Sep 22 Women's · BYU at Red Raider Invitational 1st"]);
assert.equal(worker.mergeEvents([golf.mens,golf.womens]).length,27);
// Scope: only the card sports use the module reader; other sports and schools keep
// the shared parsers on the same page.
assert.deepEqual([...byuSchool.cardSports],['Football','Volleyball','Soccer','Cross Country','Basketball','Baseball','Softball','Golf']);
const utah=schools.find(s=>s.id==='utah');
const handlers=createByuHandlers({makeEvent:()=>{throw Error('unexpected');},visibleText:x=>x,absoluteUrl:x=>x});
assert.equal(handlers.parseSchedule('<html>no cards</html>',school,'Football',footballUrl,now),null,'a page without cards falls back to the shared parsers');
assert.equal(handlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Tennis',footballUrl,now),null,'other BYU sports keep the shared parsers');
assert.equal(handlers.parseSchedule(fixture('football-schedule.html.gz'),utah,'Football',footballUrl,now),null,'other schools keep the shared parsers');
console.log(`BYU module checks passed: 12 sports route to byucougars.com through the module, no BYU configuration in shared code, program combinations and verified Instagram tags unchanged, official cards for ${[...byuSchool.cardSports].join(', ')} (K-State results, recaps, published times), other sports and schools unchanged.`);
