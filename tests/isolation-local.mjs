import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const manifest=JSON.parse(read('./certified-schools.json'));
const sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const worker=read('../src/index.js');
const required=['kstate','kansas','florida','arizona','arizona-state','oklahoma-state','texas-tech','baylor','byu'];

assert.deepEqual(manifest.schools.map(s=>s.id).slice(0,required.length),required,'required nine-school baseline changed');
assert.match(worker,/function feedCacheKey\(url,school,sport\)[^}]*set\('school',school\)[^}]*set\('sport',sport\)[^}]*set\('feed_cache',VERSION\)/,'feed cache key must include school, sport, and version');
assert.match(worker,/versionedUrl\.searchParams\.set\('athlete_cache',VERSION\)/,'athlete cache must be versioned');
assert.ok(worker.includes('return`${e.school_id}|${e.sport}|${e.team_label'), 'event merge identity must include school and sport');
assert.match(worker,/Highlights are event-specific[\s\S]*cache-control/,'highlight cache policy is missing');
assert.equal(worker.split('const unsupported=sponsoredSportError(school,sport);if(unsupported)return unsupported;').length-1,3,'all three live endpoints must enforce sponsored sports');

const cacheKeys=new Set();
for(const school of manifest.schools){
  assert.ok(Array.isArray(sponsored[school.id]),`${school.id} lacks a sponsored-sports guard`);
  for(const sport of school.critical_sports){
    assert.ok(sponsored[school.id].includes(sport),`${school.id} ${sport} is certified but not sponsored`);
    const key=new URL('https://local.test/__sas_cache/feed');
    key.searchParams.set('school',school.id);key.searchParams.set('sport',sport);key.searchParams.set('feed_cache','test');
    assert.ok(!cacheKeys.has(key.href),`duplicate cache identity for ${school.id} ${sport}`);
    cacheKeys.add(key.href);
  }
}

console.log(`Deterministic isolation passed for ${cacheKeys.size} critical school-sport cache identities across ${manifest.schools.length} schools.`);
