import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const fetch=async url=>{throw Error(`Unexpected network request: ${url}`);};
const deps={kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,teamLabelForSource,parseHtml};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit official utahutes.com routes.
const sports=sponsoredSports.utah;
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',utahSchool.scheduleUrls],['roster',utahSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utah|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'utahutes.com',`${key} must stay on utahutes.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(utahSchool.scheduleUrls[`utah|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(utahSchool.rosterUrls[`utah|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'utah\|/.test(read('../src/index.js')),'Utah configuration must live in its module, not shared code');
// Program combinations are unchanged from the shared policy Utah used before.
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Swimming & Diving']);
assert.equal(worker.teamLabelForSource(school,'Basketball','https://utahutes.com/sports/womens-basketball/schedule'),"Women's");
assert.ok(!worker.schoolCombinedSports(schools.find(s=>s.id==='kstate')).has('Swimming & Diving'),'other schools keep their own combination policy');

// Football: the official page's game data supplies K-State's result format
// and each game's exact recap; the rendered cards show only the two scores.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utah-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://utahutes.com/sports/football/schedule',now=new Date('2026-09-30T16:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
const finals2026=football.filter(e=>e.status==='Final'&&e.start_time.startsWith('2026'));
assert.deepEqual(finals2026.map(e=>[e.opponent,e.headline,e.school_score,e.opponent_score]),[
  ['Iowa State','W, 31-17','31','17'],['Utah State','W, 33-0','33','0'],['Arkansas','W, 43-10','43','10'],['Idaho','W, 66-14','66','14']
]);
assert.ok(finals2026.every(e=>e.results.length===1&&e.results[0].value===e.headline&&/^https:\/\/utahutes\.com\/news\/2026\/9\/\d+\/football-/.test(e.recap_url)),'every final has one Result row and its own official recap');
const upcoming=football.filter(e=>e.status!=='Final');
assert.equal(upcoming.length,9,'upcoming games are unchanged');
assert.deepEqual(upcoming.filter(e=>/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),['Kansas Oct 10, 8:15 PM','West Virginia Nov 27, 7:00 PM','Big 12 Championship Game Dec 4, 6:00 PM']);
const bare=worker.parseHtml(fixture('football-schedule.html.gz').replace(/<script\b[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,''),school,'Football',footballUrl,now);
assert.deepEqual(bare.filter(e=>e.status==='Final'&&e.start_time.startsWith('2026')).map(e=>e.headline),['31-17','33-0','43-10','66-14'],'without page data the cards keep their previous output');
const soccerSame=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Soccer',footballUrl,now).filter(e=>e.status==='Final'&&e.start_time.startsWith('2026'));
assert.deepEqual(soccerSame.map(e=>e.headline),['31-17','33-0','43-10','66-14'],'sports not yet verified are unchanged');

console.log('Utah module checks passed: 15 sports route to utahutes.com through the module, no Utah configuration in shared code, unchanged program combinations, Football W/L results, recaps and start times from page data.');
