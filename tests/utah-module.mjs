import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool} from '../src/schools/utah.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const fetch=async url=>{throw Error(`Unexpected network request: ${url}`);};
const deps={kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,teamLabelForSource};')(...Object.values(deps));

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

console.log('Utah module checks passed: 15 sports route to utahutes.com through the module, no Utah configuration in shared code, unchanged program combinations.');
