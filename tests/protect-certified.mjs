import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const readJson=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const manifest=readJson('./certified-schools.json');
const catalog=readJson('../src/schools.json');
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const sponsored=readJson('../src/sponsored-sports.json');
const REQUIRED_BASELINE=['kstate','kansas','florida','arizona','arizona-state','oklahoma-state','texas-tech','baylor','byu'];
const fallbackSource=page.match(/let SCHOOL_SPORTS=(\{[\s\S]*?\n\});/)?.[1];
assert.ok(fallbackSource,'packaged UI sponsored-sports fallback is missing');
const fallbackSports=Function(`"use strict";return (${fallbackSource})`)();

assert.equal(manifest.schema_version,1,'unsupported certification manifest version');
assert.deepEqual(manifest.schools.map(x=>x.id).slice(0,REQUIRED_BASELINE.length),REQUIRED_BASELINE,'the protected nine-school baseline was removed, reordered, or weakened');
assert.equal(new Set(manifest.schools.map(x=>x.id)).size,manifest.schools.length,'certified school IDs must be unique');

for(const protectedSchool of manifest.schools){
  const school=catalog.find(x=>x.id===protectedSchool.id);
  assert.ok(school,`${protectedSchool.name} was removed from the school catalog`);
  const catalogHost=new URL(school.athletics_url).hostname.replace(/^www\./,'');
  assert.ok(protectedSchool.official_hosts.includes(catalogHost),`${protectedSchool.name} official domain changed without recertification`);
  assert.ok(Array.isArray(sponsored[protectedSchool.id]),`${protectedSchool.name} is missing its authoritative sponsored-sports guard`);
  assert.deepEqual(fallbackSports[protectedSchool.id],sponsored[protectedSchool.id],`${protectedSchool.name} UI fallback differs from the authoritative sponsored-sports manifest`);
  for(const sport of protectedSchool.critical_sports)assert.ok(sponsored[protectedSchool.id].includes(sport),`${protectedSchool.name} ${sport} is certified but absent from its sponsored-sports guard`);
  for(const sport of protectedSchool.critical_sports){
    const routePrefix=`'${protectedSchool.id}|${sport}':`;
    assert.ok(worker.includes(routePrefix),`${protectedSchool.name} ${sport} lost its explicit official schedule route`);
    const routeStart=worker.indexOf(routePrefix);
    const routeText=worker.slice(routeStart,routeStart+500);
    assert.ok(protectedSchool.official_hosts.some(host=>routeText.includes(host)),`${protectedSchool.name} ${sport} route no longer uses its certified official domain`);
  }
}

console.log(`Protected-school guard passed for ${manifest.schools.length} certified schools; required 9/9 baseline intact.`);
