import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arizona-state');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const fetch=async url=>{throw Error(`Unexpected network request: ${url}`);};
const deps={kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,teamLabelForSource,parseHtml,groupEvents};')(...Object.values(deps));

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
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Swimming & Diving']);
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
const volleyballShared=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Volleyball',footballUrl,now);
assert.ok(volleyballShared.some(e=>e.opponent==='vs.'),'other Arizona State sports are unchanged until their own fix');
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
console.log('Arizona State module checks passed: 17 sports route to thesundevils.com through the module, no Arizona State configuration in shared code, program combinations, Football cards (3 finals W/L with exact recaps, 10 upcoming with published times on the right day), Football-only scope, Soccer cards (11 finals, 9 upcoming, JSON-LD years).');
