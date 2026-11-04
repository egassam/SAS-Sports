// Middle and high schools as data (src/schools/data/*.json, built by
// src/high-school-builders.mjs `schoolFromConfig`; user, November 4: "Make a
// school mostly data, not code"). Every module built from data must be the
// object its hand-written module was on November 4 (saved before the move:
// tests/fixtures/hs-config/modules-2026-11-04.json.gz), so moving a school
// to data changes nothing in its feeds.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
import {GEARY_HIGH_SCHOOLS,GEARY_MIDDLE_SCHOOLS} from '../src/schools/geary-ks.mjs';
import {schoolFromConfig,schoolsFromConfig,GRADE_FORMS,SHARED_SOURCES} from '../src/high-school-builders.mjs';

const ser=v=>JSON.parse(JSON.stringify(v,(k,x)=>x instanceof RegExp?`/${x.source}/${x.flags}`:typeof x==='function'?`fn:${x.toString().length}`:x));
const sorted=v=>Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])])):v;
const before=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/hs-config/modules-2026-11-04.json.gz',import.meta.url))).toString('utf8'));
const now=[...RILEY_POTTAWATOMIE_HIGH_SCHOOLS,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS,...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS];
assert.deepEqual(now.map(m=>m.id).sort(),Object.keys(before).sort(),'the same schools');
// The one change made on purpose (November 4): the hand-kept cross country
// `extraMeets` and MileSplit `names` left the modules for the statewide
// MileSplit Live index and the state's alias table (checked below and in
// tests/milesplit-season-index.mjs).
const MOVED={};
for(const [id,module] of Object.entries(before))for(const team of module.sports?.['Cross Country']||[]){
  if(team.extraMeets){(MOVED[id]??={}).extraMeets=team.extraMeets;delete team.extraMeets;}
  if(team.milesplit?.names){(MOVED[id]??={}).names=team.milesplit.names;delete team.milesplit.names;}
}
assert.deepEqual(Object.keys(MOVED).sort(),['fort-riley-ms-ks','junction-city-ks','st-xavier-ks']);
for(const module of now){
  const same=JSON.stringify(sorted(ser(module)))===JSON.stringify(sorted(before[module.id]));
  if(!same)assert.deepEqual(sorted(ser(module)),sorted(before[module.id]),`${module.id} is the module it was`);
}
// Every MileSplit name a module kept is in the state's alias table.
const aliases=JSON.parse(readFileSync(new URL('../src/schools/data/ks-aliases.json',import.meta.url),'utf8'));
for(const {names} of Object.values(MOVED))for(const [from,to] of Object.entries(names||{}))assert.equal(aliases.meets[from],to,`alias ${from}`);

// Every data file: the format's keys only, ids unique, a level, sports listed.
const KEYS=new Set(['id','name','level','note','bound','maxpreps','meetPro','prepGolf','globalSavedCopy','sports','extraMeets','milesplitNames','stateXc','town','county','sources']);
const SPORT_KEYS=new Set(['has','meetTeam','trackTeam','tennis','milesplit','paths','grades','maxpreps']);
const dir=new URL('../src/schools/data/',import.meta.url),ids=new Set();
let count=0;
for(const name of readdirSync(dir).filter(f=>/^[a-z]{2}-.+\.json$/.test(f)&&!/aliases/.test(f))){
  const file=JSON.parse(readFileSync(new URL(name,dir),'utf8'));
  assert.ok(Array.isArray(file.schools)&&file.schools.length,`${name}: schools`);
  for(const entry of file.schools){
    for(const k of Object.keys(entry))assert.ok(KEYS.has(k),`${name} ${entry.id}: unknown key ${k}`);
    for(const k of Object.keys(entry.sports||{}))assert.ok(SPORT_KEYS.has(k),`${name} ${entry.id}: unknown sports key ${k}`);
    assert.ok(!ids.has(entry.id),`${entry.id} once`);ids.add(entry.id);
    assert.match(entry.level,/^(?:high|middle)-school$/,`${entry.id}: level`);
    assert.ok(entry.sports?.has?.length,`${entry.id}: sports`);
    if(entry.sports.grades)assert.ok(GRADE_FORMS[entry.sports.grades],`${entry.id}: grade form ${entry.sports.grades}`);
    if(entry.meetPro)assert.ok(SHARED_SOURCES[entry.meetPro],`${entry.id}: shared source ${entry.meetPro}`);
    count++;
  }
  // The whole file builds.
  const built=schoolsFromConfig(file);
  assert.equal(Object.keys(built).length,file.schools.length);
}
assert.ok(count>=12,`data schools: ${count}`);

// A school sharing a Bound id shares one Bound object (St. Marys HS and JH).
const rp=schoolsFromConfig(JSON.parse(readFileSync(new URL('ks-riley-pottawatomie.json',dir),'utf8')));
assert.equal(rp['st-marys-ks'].bound,rp['st-marys-jh-ks'].bound);
// A school with no Bound page links Bound's state page; another state builds its own links.
const ok=schoolFromConfig({id:'x-ok',state:'ok',level:'high-school',bound:{school:'h1'},maxpreps:{schoolId:'m',path:'town/x'},sports:{has:['Football'],meetTeam:'X'}});
assert.equal(ok.bound.page,'https://beta.gobound.com/ok');
assert.equal(ok.maxpreps.base,'https://www.maxpreps.com/ok/town/x/');
assert.deepEqual(Object.keys(ok.sports),['Football']);
console.log(`hs-config: ok (${now.length} modules unchanged, ${count} schools as data)`);
