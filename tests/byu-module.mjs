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
const fetch=async url=>{throw Error(`Unexpected network request: ${url}`);};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,VERIFIED_TEAM_TAG_INSTAGRAM};')(...Object.values(deps));

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
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Swimming & Diving'],'program combinations are unchanged');
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
// Scope: only Football uses the module reader; other sports and schools keep
// the shared parsers on the same page.
assert.deepEqual([...byuSchool.cardSports],['Football']);
const utah=schools.find(s=>s.id==='utah');
const handlers=createByuHandlers({makeEvent:()=>{throw Error('unexpected');},visibleText:x=>x,absoluteUrl:x=>x});
assert.equal(handlers.parseSchedule('<html>no cards</html>',school,'Football',footballUrl,now),null,'a page without cards falls back to the shared parsers');
assert.equal(handlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Soccer',footballUrl,now),null,'other BYU sports keep the shared parsers');
assert.equal(handlers.parseSchedule(fixture('football-schedule.html.gz'),utah,'Football',footballUrl,now),null,'other schools keep the shared parsers');
console.log(`BYU module checks passed: 12 sports route to byucougars.com through the module, no BYU configuration in shared code, program combinations and verified Instagram tags unchanged, official cards for ${[...byuSchool.cardSports].join(', ')} (K-State results, recaps, published times), other sports and schools unchanged.`);
