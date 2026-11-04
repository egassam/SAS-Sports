// The middle and high school discovery script (scripts/onboard-hs.mjs; user,
// November 4, 2026: "Do 1-3 now"). Fixtures, recorded November 4: the Census
// Kansas county list, NCES CCD 2022 rows for Riley, Geary and Pottawatomie
// counties, KSHSAA's directory answer for Junction City (school fields
// only), Bound's Kansas schools page, Prep.Golf's school list and Junction
// City's MaxPreps school page. Geary County is the reference: the schools and
// ids the November 3 session found by hand.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {milesplitFor,countyFips,ccdCounty,kshsaaSchools,boundStateSchools,prepGolfSchools,maxprepsSchoolPage,maxprepsGuesses,matchSchools,draftEntry,boundSportsHas,schoolKey,levelOf,appId,addressKey,MS_LEVEL,VARSITY_LEVEL} from '../scripts/onboard-hs.mjs';
import {schoolFromConfig} from '../src/high-school-builders.mjs';

const read=(name,gz=name.endsWith('.gz'))=>{const b=readFileSync(new URL(`./fixtures/onboard-hs/${name}`,import.meta.url));return gz?gunzipSync(b).toString('utf8'):b.toString('utf8');};

// Names: level words out; the level; the app's id.
assert.deepEqual(['Junction City Sr High','Junction City HS','Junction City High School','Junction City MS'].map(schoolKey),['junction city','junction city','junction city','junction city']);
assert.equal(schoolKey('St. Marys Jr/Sr High'),'saint marys');
assert.deepEqual(['Junction City MS','Fort Riley Middle School','St. Marys Jr/Sr High','Riley County High School','St. Xavier HS'].map(n=>levelOf({name:n})),['middle-school','middle-school','high-school','high-school','high-school']);
assert.equal(levelOf({name:'Flint Hills Christian',high:12}),'high-school');
assert.deepEqual([appId('Junction City Sr High','high-school','KS'),appId('Fort Riley Middle School','middle-school','KS'),appId('St. Xavier HS','high-school','KS')],['junction-city-ks','fort-riley-ms-ks','st-xavier-ks']);
assert.deepEqual([addressKey('1100 Blue Jay Way'),addressKey('1100 Blue Jay Wy'),addressKey('200 N Washington St'),addressKey('PO Box 9')],['1100 blue','1100 blue','200 washington',null]);

// County → FIPS.
assert.deepEqual(countyFips(read('census-ks-counties.txt'),'Geary'),{state:'KS',fips:'20061',name:'Geary County'});
assert.equal(countyFips(read('census-ks-counties.txt'),'pottawatomie county').fips,'20149');
assert.equal(countyFips(read('census-ks-counties.txt'),'Nowhere'),null);

// NCES CCD: Geary's middle and high schools (no elementary, no virtual) and its towns.
const ccdRows=JSON.parse(read('ccd-ks-2022-riley-geary-pottawatomie.json.gz')).results;
const geary=ccdCounty(ccdRows,'20061');
assert.deepEqual(geary.schools.map(s=>`${s.name} ${s.level}`).sort(),['Fort Riley Middle School middle-school','Junction City Middle School middle-school','Junction City Sr High high-school']);
assert.ok(geary.towns.includes('Junction City')&&geary.towns.includes('Milford'));
const riley=ccdCounty(ccdRows,'20161');
assert.ok(riley.schools.some(s=>/Riley County High/i.test(s.name))&&riley.schools.every(s=>!/Elem/.test(s.name)));

// KSHSAA: school fields only.
const kshsaa=kshsaaSchools(JSON.parse(read('kshsaa-junction-city-2026-11-04.json')));
assert.deepEqual(kshsaa.map(s=>`${s.name} ${s.class} ${s.league||'-'}`).slice(0,2),['Junction City HS 6A Centennial','St. Xavier HS 1A Independent - HS']);
for(const s of kshsaa)assert.deepEqual(Object.keys(s).sort(),['address','class','enrollment','grades','kshsaa','kshsaaId','league','name','private','town','type','website'],'school fields only');
// Even from the full answer (principal, athletic director, e-mail, phone), only those fields are kept.
assert.deepEqual(Object.keys(kshsaaSchools([{SchoolName:'X HS',PrincipalName:'A B',ADEmail:'a@b',ADCell:'1',Email:'c@d'}])[0]).sort(),['address','class','enrollment','grades','kshsaa','kshsaaId','league','name','private','town','type','website']);

// Bound's Kansas page: every school with id, slug, town, address, mascot, colors.
const bound=boundStateSchools(read('bound-ks-schools-2026-11-04.html.gz'));
assert.ok(bound.length>500);
const jc=bound.find(b=>b.slug==='junctioncityhs');
assert.deepEqual([jc.bound,jc.name,jc.town,jc.mascot,jc.colors[0]],['h20250204045159822386f317805064a','Junction City HS','Junction City','Blue Jays','#00599d']);
assert.equal(bound.find(b=>b.bound==='h202502040452054647fae500274d446').name,'St. Francis Xavier Catholic');

// Prep.Golf and MaxPreps.
const pg=prepGolfSchools(read('prepgolf-ks-schools-2026-11-04.html.gz'));
assert.deepEqual(pg.find(p=>p.name==='Junction City'),{id:7,name:'Junction City'});
assert.deepEqual(maxprepsGuesses('KS',{name:'Junction City HS',town:'Junction City',mascot:'Blue Jays'}),['ks/junction-city/junction-city-blue-jays','ks/junction-city/junction-city-bluejays']);
const mp=maxprepsSchoolPage(read('maxpreps-junction-city-2026-11-04.html.gz'),'ks/junction-city/junction-city-bluejays');
assert.equal(mp.id,'0db83983-6aab-46c9-9989-88ee256551be');
assert.ok(['football','volleyball','soccer/girls/spring','basketball/girls'].every(t=>mp.teams.includes(t)),mp.teams.join(','));

// Matching: Geary's schools across CCD, KSHSAA and Bound (St. Xavier by address).
const rows=matchSchools({ccd:geary.schools,kshsaa,bound,state:'KS'});
const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
assert.equal(byId['junction-city-ks'].bound.bound,'h20250204045159822386f317805064a');
assert.equal(byId['junction-city-ms-ks'].bound.bound,'h20251215030233573aee5a5046f2741');
assert.equal(byId['fort-riley-ms-ks'].bound.bound,'h20250612074705722fb6ff5c7484f42');
assert.equal(byId['st-xavier-ks'].bound.bound,'h202502040452054647fae500274d446','St. Xavier by its street address');
assert.equal(byId['junction-city-ks'].kshsaa.class,'6A');

// Bound sports by level, and a draft entry that builds.
assert.deepEqual(boundSportsHas({'Girls Golf':3,'Boys Golf':0,'Girls Cross Country':5,'Unified Bowling':2,'Girls Swim & Dive':1},'high-school'),['Cross Country','Golf','Girls Golf','Swimming & Diving','Girls Swimming','Bowling']);
assert.deepEqual(boundSportsHas({Football:4,'Girls Soccer':2,'Girls Tennis':1},'middle-school'),['Football','Tennis']);
// Last school year: two days or more (spring sports); one stray entry is not a sport.
assert.deepEqual(boundSportsHas({Baseball:{current:0,last:9},'Girls Flag Football':{current:0,last:1},Volleyball:{current:3,last:0}},'high-school'),['Volleyball','Baseball']);
assert.ok(MS_LEVEL.test('7th Grade')&&MS_LEVEL.test('8th Grade A')&&MS_LEVEL.test('Middle School')&&!MS_LEVEL.test('Varsity')&&VARSITY_LEVEL.test('Varsity'));
const row=byId['junction-city-ks'];
Object.assign(row,{has:['Football','Volleyball','Cross Country'],milesplit:{id:'15714'},prepGolf:{id:7},maxpreps:{path:'ks/junction-city/junction-city-bluejays',...mp}});
const entry=draftEntry(row);
assert.deepEqual(entry.bound,{school:'h20250204045159822386f317805064a',slug:'junctioncityhs'});
assert.deepEqual(entry.maxpreps,{schoolId:'0db83983-6aab-46c9-9989-88ee256551be',path:'junction-city/junction-city-bluejays'});
assert.deepEqual(entry.sports,{has:['Football','Volleyball','Cross Country'],meetTeam:'Junction City',milesplit:15714});
const built=schoolFromConfig({state:'ks',...entry});
assert.deepEqual(Object.keys(built.sports),['Football','Volleyball','Cross Country']);
assert.equal(built.sports['Cross Country'][0].milesplit.team,15714);
// MileSplit team ids by Bound's short names ("Fort Riley MS").
{
  const {milesplitSeasonIndex,milesplitTeamsNamed}=await import('../src/high-school.mjs');
  const index=milesplitSeasonIndex(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/milesplit-season/ks-cc-2026-11-04.json.gz',import.meta.url))).toString('utf8')));
  assert.deepEqual(milesplitTeamsNamed(index,'Fort Riley MS').map(t=>t.id),['40677']);
  assert.ok(milesplitTeamsNamed(index,'Junction City MS').some(t=>t.id==='39340'));
  assert.equal(milesplitFor(index,byId['st-xavier-ks'])?.id,'26138','by KSHSAA\'s name when Bound\'s names no team');
  assert.equal(milesplitFor(index,byId['fort-riley-ms-ks'])?.id,'40677');
  assert.deepEqual(maxprepsGuesses('KS',{name:'St. Xavier HS',town:'Junction City',mascot:'Rams'}),['ks/junction-city/st-xavier-rams']);
}
console.log(`onboard-hs: ok (Geary: ${rows.length} schools matched)`);
