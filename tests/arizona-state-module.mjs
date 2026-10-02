import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers,parseArizonaStateRecapResults} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers} from '../src/schools/arizona.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arizona-state');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails the test.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,headers:new Map([['content-type','text/html']]),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,teamLabelForSource,parseHtml,groupEvents,arizonaStateHandlers,attachOfficialMeetResults};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit official thesundevils.com routes.
const sports=sponsoredSports['arizona-state'];
assert.equal(sports.length,17);
for(const [name,map] of [['schedule',arizonaStateSchool.scheduleUrls],['roster',arizonaStateSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('arizona-state|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'thesundevils.com',`${key} must stay on thesundevils.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(arizonaStateSchool.scheduleUrls[`arizona-state|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(arizonaStateSchool.rosterUrls[`arizona-state|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'arizona-state\|/.test(read('../src/index.js')),'Arizona State configuration must live in its module, not shared code');
// Program combinations are unchanged from the shared policy.
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Golf','Swimming & Diving','Tennis']);
assert.equal(worker.teamLabelForSource(school,'Swimming & Diving','https://thesundevils.com/sports/womens/swimming-diving/schedule'),"Women's");
// The neighbouring Arizona school keeps its own routes in shared code.
assert.equal(worker.candidateUrls(schools.find(s=>s.id==='arizona'),'Football')[0],'https://arizonawildcats.com/sports/football/schedule');

// Football: the official cards give each game's opponent, result, recap and
// published local time. The shared card reader turned these into "ASU vs vs."
// events with "Sep, 2026, 5" dates, and moved evening games to the next day.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/arizona-state-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://thesundevils.com/sports/football/schedule',now=new Date('2026-10-01T16:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,13,'one event per official card');
const finals=football.filter(e=>e.status==='Final');
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 5','ASU vs Morgan State','W, 70-7','70','7'],['Sep 12','ASU at Texas A&M','L, 20-48','20','48'],['Sep 19','ASU at Kansas','W, 24-17','24','17']
]);
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url.split('/').slice(3,7).join('/')),['news/2026/09/6','news/2026/09/12','news/2026/09/19'],'every final links its own official recap');
const upcoming=football.filter(e=>e.status==='Upcoming');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'ASU vs Baylor Oct 3, 7:30 PM','ASU vs Hawaii Oct 10, 7:30 PM','ASU at Texas Tech Oct 17','ASU vs Kansas State Oct 24','ASU at BYU Oct 31',
  'ASU vs Colorado Nov 7','ASU at UCF Nov 14','ASU vs Oklahoma State Nov 21','ASU at Arizona Nov 28','ASU vs Big 12 Championship Dec 4'
]);
assert.equal(upcoming[0].start_time,'2026-10-03T19:30:00.000Z','published times are Arizona wall clock, on the published day');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[3,10]);
// Scope: only Football uses the module reader; other sports and schools keep
// the shared parsers on the same page.
const arizona=schools.find(s=>s.id==='arizona');
assert.ok(worker.parseHtml(fixture('football-schedule.html.gz'),arizona,'Football','https://arizonawildcats.com/sports/football/schedule',now).some(e=>e.opponent==='vs.'),'other schools are unchanged');
const handlers=createArizonaStateHandlers({makeEvent:()=>{throw Error('unexpected');},visibleText:x=>x,scheduleYearForDate:()=>2026,absoluteUrl:x=>x});
assert.equal(handlers.parseSchedule('<html>no cards</html>',school,'Football',footballUrl,now),null,'a page without cards falls back to the shared parsers');

// Soccer: same cards. Card years come from the page's JSON-LD start times.
const soccer=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer','https://thesundevils.com/sports/soccer/schedule',now);
assert.equal(soccer.length,20,'one event per official card');
const soccerFinals=soccer.filter(e=>e.status==='Final');
assert.equal(soccerFinals.length,11);
assert.deepEqual(soccerFinals.slice(0,3).map(e=>[e.display_time,e.title,e.headline]),[['Aug 12','ASU at New Mexico St.','W, 3-1'],['Aug 20','ASU vs Texas','T, 1-1'],['Aug 23','ASU vs Buffalo','W, 5-0']]);
assert.deepEqual(soccerFinals.slice(-2).map(e=>[e.display_time,e.title,e.headline]),[['Sep 24','ASU at Kansas','L, 0-2'],['Sep 27','ASU at Kansas St.','W, 2-0']]);
assert.ok(soccerFinals.every(e=>e.results.length===1&&/^https:\/\/thesundevils\.com\/news\/2026\//.test(e.recap_url)),'every final has one Result row and its own recap');
assert.equal(soccer.find(e=>e.display_time.startsWith('Nov 5')).title,'ASU at BYU','"#RV" rankings are dropped from the opponent');
assert.deepEqual(soccer.filter(e=>e.status==='Upcoming').map(e=>e.display_time).slice(0,2),['Oct 2, 5:00 PM','Oct 8, 7:00 PM']);
// Volleyball: same cards; 13 finals with recaps, 16 upcoming with times.
const volleyball=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball','https://thesundevils.com/sports/volleyball/schedule',now);
assert.equal(volleyball.length,29,'one event per official card');
const volleyballFinals=volleyball.filter(e=>e.status==='Final');
assert.equal(volleyballFinals.length,13);
assert.deepEqual([volleyballFinals[0],volleyballFinals.at(-1)].map(e=>[e.display_time,e.title,e.headline]),[['Aug 22','ASU vs Texas','W, 3-1'],['Sep 27','ASU at Cincinnati','W, 3-1']]);
assert.ok(volleyballFinals.every(e=>e.results.length===1&&/^https:\/\/thesundevils\.com\/news\/2026\//.test(e.recap_url)),'every final has one Result row and its own recap');
assert.equal(volleyball.find(e=>e.status==='Upcoming').display_time,'Oct 4, 2:00 PM');
// Basketball: both official pages, labeled by team. Neutral-site games between
// two other teams (Wake Forest vs Quinnipiac) are not Arizona State games.
assert.deepEqual(arizonaStateSchool.scheduleUrls['arizona-state|Basketball'],['https://thesundevils.com/sports/mens-basketball/schedule','https://thesundevils.com/sports/womens-basketball/schedule']);
const mensBasketball=worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball','https://thesundevils.com/sports/mens-basketball/schedule',now);
const womensBasketball=worker.parseHtml(fixture('womens-basketball-schedule.html.gz'),school,'Basketball','https://thesundevils.com/sports/womens-basketball/schedule',now);
assert.deepEqual([mensBasketball.length,womensBasketball.length],[34,33]);
assert.ok(![...mensBasketball,...womensBasketball].some(e=>/Quinnipiac|^vs\.?$|^at$/.test(e.opponent)),'only Arizona State games, with real opponents');
assert.deepEqual([mensBasketball[0],womensBasketball[0]].map(e=>`${e.display_time} ${e.title}`),['Oct 25 ASU at New Mexico','Nov 2, 5:00 PM ASU vs Jackson State']);
assert.equal(mensBasketball.at(-1).start_time.slice(0,10),'2027-03-09','spring games take the next calendar year');
// Hockey: the official page is ice-hockey; 36 games, weekend series on
// consecutive days stay separate games.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Hockey'],'https://thesundevils.com/sports/ice-hockey/schedule');
const hockey=worker.parseHtml(fixture('ice-hockey-schedule.html.gz'),school,'Hockey','https://thesundevils.com/sports/ice-hockey/schedule',now);
assert.equal(hockey.length,36);
assert.deepEqual(hockey.slice(0,2).map(e=>`${e.display_time} ${e.title}`),['Oct 2, 5:00 PM ASU at Lindenwood','Oct 3, 3:00 PM ASU at Lindenwood']);
assert.equal(hockey.find(e=>e.opponent==='Omaha').start_time,'2027-01-08T18:00:00.000Z');
// Wrestling: two published events; the Oklahoma State dual is on Nov 20 (MST),
// not the UTC Nov 21 production showed.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Wrestling'],'https://thesundevils.com/sports/wrestling/schedule');
const wrestling=worker.parseHtml(fixture('wrestling-schedule.html.gz'),school,'Wrestling','https://thesundevils.com/sports/wrestling/schedule',now);
assert.deepEqual(wrestling.map(e=>`${e.display_time} ${e.title}`),['Nov 20, 6:00 PM ASU vs Oklahoma St.','Dec 12 ASU vs National Duals Invitational']);
// Beach Volleyball: the page still shows the spring 2026 season (Feb 13 -
// Apr 24), the previous academic year. It is a valid empty schedule, not a
// failed source, and not current results.
const beach=worker.parseHtml(fixture('beach-volleyball-schedule.html.gz'),school,'Beach Volleyball','https://thesundevils.com/sports/beach-volleyball/schedule',now);
assert.deepEqual(beach,[]);
assert.ok(worker.arizonaStateHandlers.isEmptySchedule(beach),'a past-season page is an empty schedule');
assert.ok(!worker.arizonaStateHandlers.isEmptySchedule([]),'only the reader can flag an empty schedule');
const beachInSeason=worker.parseHtml(fixture('beach-volleyball-schedule.html.gz'),school,'Beach Volleyball','https://thesundevils.com/sports/beach-volleyball/schedule',new Date('2026-04-30T16:00:00Z'));
assert.equal(beachInSeason.filter(e=>e.status==='Final').length,34,'in its own season the same page shows every match');
assert.ok(beachInSeason.some(e=>e.title==='ASU vs Arizona'),'tournament seeds are dropped from the opponent');
// The season filter keeps July-December of the season's first year and
// January-June of its second: every merged sport above is unaffected.
// Lacrosse: the official lacrosse page still shows the spring 2026 season, the previous academic
// year; it is an empty schedule until the next season is published.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Lacrosse'],'https://thesundevils.com/sports/lacrosse/schedule');
const lacrossePast=worker.parseHtml(fixture('lacrosse-schedule.html.gz'),school,'Lacrosse','https://thesundevils.com/sports/lacrosse/schedule',now);
assert.deepEqual(lacrossePast,[]);
assert.ok(worker.arizonaStateHandlers.isEmptySchedule(lacrossePast));
// Water Polo: the official water-polo page still shows the spring 2026 season, the previous academic
// year; it is an empty schedule until the next season is published.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Water Polo'],'https://thesundevils.com/sports/water-polo/schedule');
const waterPoloPast=worker.parseHtml(fixture('water-polo-schedule.html.gz'),school,'Water Polo','https://thesundevils.com/sports/water-polo/schedule',now);
assert.deepEqual(waterPoloPast,[]);
assert.ok(worker.arizonaStateHandlers.isEmptySchedule(waterPoloPast));
// Gymnastics: the official gymnastics page still shows the 2026 season (Jan 4 - Apr 2, 2026), the previous academic
// year; it is an empty schedule until the next season is published.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Gymnastics'],'https://thesundevils.com/sports/gymnastics/schedule');
const gymnasticsPast=worker.parseHtml(fixture('gymnastics-schedule.html.gz'),school,'Gymnastics','https://thesundevils.com/sports/gymnastics/schedule',now);
assert.deepEqual(gymnasticsPast,[]);
assert.ok(worker.arizonaStateHandlers.isEmptySchedule(gymnasticsPast));
// Track & Field: the official track-field page still shows the 2025-26 season (Jan 9 - Jun 10, 2026), the previous academic
// year; it is an empty schedule until the next season is published.
assert.equal(arizonaStateSchool.scheduleUrls['arizona-state|Track & Field'],'https://thesundevils.com/sports/track-field/schedule');
const trackFieldPast=worker.parseHtml(fixture('track-field-schedule.html.gz'),school,'Track & Field','https://thesundevils.com/sports/track-field/schedule',now);
assert.deepEqual(trackFieldPast,[]);
assert.ok(worker.arizonaStateHandlers.isEmptySchedule(trackFieldPast));
// Cross Country: race rows from the meet's own official recap ("Women's 4K
// Run" / "1:" / "Kelli Gaffney" / "(13:47.3)"), grouped as K-State does.
const xcUrl='https://thesundevils.com/sports/cross-country/schedule';
const xc=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now);
assert.deepEqual(xc.map(e=>`${e.status} ${e.display_time} ${e.title}`),['Final Sep 4 ASU at Dave Murray Invitational','Final Sep 26 ASU at Meadows Challenge','Upcoming Oct 16 ASU at Arturo Barrios Invitational','Upcoming Oct 31 ASU at Big 12 Championships','Upcoming Nov 13 ASU at NCAA West Regionals','Upcoming Nov 21 ASU at NCAA National Championships']);
const [daveMurray,meadows]=xc;
recapFixtures.set(daveMurray.recap_url,fixture('xc-recap-dave-murray-invitational.html.gz'));
await worker.attachOfficialMeetResults(daveMurray);
assert.equal(daveMurray.meet_results_verified,true);
assert.equal(daveMurray.headline,'Completed','the recap publishes no team scores');
assert.deepEqual([...new Set(daveMurray.results.map(r=>r.group))],["Women's 4K","Men's 6K"],'women first, labeled by distance');
assert.deepEqual([daveMurray.results.filter(r=>r.group==="Women's 4K").length,daveMurray.results.filter(r=>r.group==="Men's 6K").length],[12,6]);
assert.deepEqual(daveMurray.results[0],{group:"Women's 4K",participant:'Kelli Gaffney',result:'1st · 13:47.3'});
assert.deepEqual(daveMurray.results.at(-1),{group:"Men's 6K",participant:'Ryan Lish',result:'25th · 19.22.9'},'times are kept exactly as published');
assert.equal(daveMurray.recap_result_count,18);
assert.deepEqual(daveMurray.highlights,["Kelli Gaffney led Arizona State in the women's 4K race, finishing 1st in 13:47.3.","Tyler Daillak led Arizona State in the men's 6K race, finishing 11th in 18:19.2."]);
const fetched=requests.length;await worker.attachOfficialMeetResults(daveMurray);
assert.equal(requests.length,fetched,'the expanded view reuses verified rows');
await worker.attachOfficialMeetResults(meadows);
assert.deepEqual([meadows.headline,meadows.meet_results_verified,meadows.highlight_status],['Completed',false,'No official recap or results are published for this meet on thesundevils.com.'],'a meet without an official recap says so and invents nothing');
assert.deepEqual(parseArizonaStateRecapResults('<p>Women’s 4K Run</p><p>1:</p><p>A Runner</p><p>13:47</p>',{decodeHtml:x=>x,ordinal:n=>n}),[],'rows need a parenthesized time');
// Golf: both official pages, labeled by team; the card's team finish
// ("1st, -40/800", "T2, -1 (851)") in K-State's wording without the
// unpublished field size.
assert.deepEqual(arizonaStateSchool.scheduleUrls['arizona-state|Golf'],['https://thesundevils.com/sports/mens-golf/schedule','https://thesundevils.com/sports/womens-golf/schedule']);
assert.ok(worker.schoolCombinedSports(school).has('Golf'));
assert.equal(worker.teamLabelForSource(school,'Golf','https://thesundevils.com/sports/womens-golf/schedule'),"Women's");
const mensGolf=worker.parseHtml(fixture('mens-golf-schedule.html.gz'),school,'Golf','https://thesundevils.com/sports/mens-golf/schedule',now);
const womensGolf=worker.parseHtml(fixture('womens-golf-schedule.html.gz'),school,'Golf','https://thesundevils.com/sports/womens-golf/schedule',now);
assert.deepEqual(mensGolf.filter(e=>e.status==='Final').map(e=>[e.display_time,e.title,e.headline]),[['Sep 12','ASU at Sahalee Players Invitational','T6th (896)'],['Sep 18','ASU at Fighting Illini Invitational','1st (800)'],['Sep 28','ASU at Ben Hogan Collegiate','Completed']]);
assert.deepEqual(womensGolf.filter(e=>e.status==='Final').map(e=>[e.display_time,e.title,e.headline]),[['Sep 18','ASU at Mason Rudolph Championship','T2nd (851)']]);
assert.deepEqual([mensGolf.length,womensGolf.length],[14,12]);
assert.ok(womensGolf.every(e=>e.title.startsWith('ASU at ')),'tournament cards without a divider read "ASU at", as K-State\'s do');
assert.equal(mensGolf.find(e=>/Augusta/.test(e.opponent)).title,'ASU vs Augusta/Haskins Invitational','a published "vs." is kept');
// Tennis: both official pages, labeled by team. The men's page still shows
// the 2025-26 season (an empty schedule); the women's page has the fall 2026
// individual tournaments, which publish no team result.
assert.deepEqual(arizonaStateSchool.scheduleUrls['arizona-state|Tennis'],['https://thesundevils.com/sports/mens-tennis/schedule','https://thesundevils.com/sports/womens-tennis/schedule']);
assert.ok(worker.schoolCombinedSports(school).has('Tennis'));
const mensTennis=worker.parseHtml(fixture('mens-tennis-schedule.html.gz'),school,'Tennis','https://thesundevils.com/sports/mens-tennis/schedule',now);
assert.deepEqual(mensTennis,[]);assert.ok(worker.arizonaStateHandlers.isEmptySchedule(mensTennis));
const womensTennis=worker.parseHtml(fixture('womens-tennis-schedule.html.gz'),school,'Tennis','https://thesundevils.com/sports/womens-tennis/schedule',now);
assert.equal(womensTennis.length,12);
assert.deepEqual(womensTennis.filter(e=>e.status==='Final').map(e=>[e.display_time,e.title,e.headline]),[['Sep 19','ASU at ITA All-American Championships','Completed'],['Sep 24','ASU at USTA SoCal Championships','Completed']]);
assert.equal(womensTennis.filter(e=>e.display_time==='Oct 26').length,2,'two tournaments in the same week stay separate');
// Swimming & Diving: the inherited routes (/sports/mens/swimming-diving/)
// do not exist (production 502). Both official pages, labeled by team.
assert.deepEqual(arizonaStateSchool.scheduleUrls['arizona-state|Swimming & Diving'],['https://thesundevils.com/sports/mens-swimming-diving/schedule','https://thesundevils.com/sports/womens-swimming-diving/schedule']);
assert.equal(worker.teamLabelForSource(school,'Swimming & Diving','https://thesundevils.com/sports/mens-swimming-diving/schedule'),"Men's");
const mensSwim=worker.parseHtml(fixture('mens-swimming-diving-schedule.html.gz'),school,'Swimming & Diving','https://thesundevils.com/sports/mens-swimming-diving/schedule',now);
const womensSwim=worker.parseHtml(fixture('womens-swimming-diving-schedule.html.gz'),school,'Swimming & Diving','https://thesundevils.com/sports/womens-swimming-diving/schedule',now);
assert.deepEqual([mensSwim.length,womensSwim.length],[16,17]);
assert.deepEqual(womensSwim.slice(0,4).map(e=>`${e.status} ${e.display_time} ${e.title}`),['Final Sep 25 ASU vs Intrasquad Scrimmage','Upcoming Oct 2, 6:00 PM ASU vs UNLV','Upcoming Oct 9 ASU at SMU Classic','Upcoming Oct 9, 3:30 PM ASU at Northern Arizona']);
assert.equal(mensSwim.at(-1).start_time.slice(0,10),'2027-03-24');
assert.notEqual(mensSwim[0].id,womensSwim[0].id,'the same meet on both teams\' pages keeps separate event ids');
assert.ok(mensSwim[0].id.endsWith('-mens')&&womensSwim[0].id.endsWith('-womens'));
// Every sponsored sport reads the official cards through the module.
assert.deepEqual([...arizonaStateSchool.cardSports].sort(),[...sports].sort());
console.log(`Arizona State module checks passed: 17 sports route to thesundevils.com through the module, no Arizona State configuration in shared code, program combinations, official cards for ${[...arizonaStateSchool.cardSports].join(', ')} (K-State results, recaps, published times, JSON-LD years, current season), other sports and schools unchanged.`);
