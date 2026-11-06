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
import {maxprepsFromLinks,maxprepsLinks,prepGolfCode,tennisReportingName,boundCoverage,letsGoRunGuesses,letsGoRunSchools,milesplitFor,countyFips,ccdCounty,kshsaaSchools,boundStateSchools,prepGolfSchools,maxprepsSchoolPage,maxprepsGuesses,matchSchools,draftEntry,boundSportsHas,schoolKey,levelOf,appId,addressKey,MS_LEVEL,VARSITY_LEVEL} from '../scripts/onboard-hs.mjs';
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
// November 5 additions (user: "What can we learn from this to optimize the
// next", then "Yes, do all of them").
const ksc=name=>gunzipSync(readFileSync(new URL(`./fixtures/ks-counties/${name}`,import.meta.url))).toString('utf8');
// Prep.Golf code: the one every posted tournament has; two left, the one the name starts with.
assert.equal(prepGolfCode([{players:[{school:'CHAP'},{school:'ABI'}]},{players:[{school:'CHAP'},{school:'WAM'}]}],'Chapman'),'CHAP');
assert.equal(prepGolfCode([{players:[{school:'WR'},{school:'JC'}]},{players:[{school:'JC'},{school:'WR'}]}],'Junction City'),'JC');
assert.equal(prepGolfCode([],'Abilene'),null);
// Royal Valley: PLHS was in all three tournaments, RV in two (no Royal Valley golfer at the 3A state tournament).
assert.equal(prepGolfCode([{players:[{school:'PLHS'},{school:'HOLT'}]},{players:[{school:'PLHS'},{school:'RV'}]},{players:[{school:'PLHS'},{school:'RV'}]}],'Royal Valley'),'RV');
assert.equal(prepGolfCode([{players:[{school:'RPC'},{school:'SSH'}]},{players:[{school:'PL'},{school:'RPC'}]}],'Republic County'),'RPC');
assert.equal(prepGolfCode([{players:[{school:'WACO'},{school:'HAN'}]}],'Washington County'),'WACO');
// TennisReporting's name.
assert.equal(tennisReportingName(['Clay Center Community HS','Concordia HS'],{key:schoolKey('Clay Center Community High')}),'Clay Center Community HS');
assert.equal(tennisReportingName(['Salina-Central HS','Salina-South HS'],{key:schoolKey('Salina Central High School')}),'Salina-Central HS');
assert.equal(tennisReportingName(['Abilene HS'],{key:'chapman'}),null);
// Bound coverage: Wabaunsee had 1 of its 10 football games on Bound.
assert.deepEqual(boundCoverage(1,10),{checked:true,bound:1,maxpreps:10,sparse:true});
assert.equal(boundCoverage(14,15).sparse,false);
assert.equal(boundCoverage(7,10).sparse,true,'Nemaha Central: 7 of 10 is missing games');assert.equal(boundCoverage(9,10).sparse,false);
assert.equal(boundCoverage(1,2).checked,false,'too few MaxPreps games to judge');
// LetsGoRun: this year's listed folders and last years' names for this year.
const listing='<a href="http://results.tfmeetpro.com/LetsGoRun_Timing/2026_Clay_Center_XC_Invitational/">x</a><a href="http://results.tfmeetpro.com/LetsGoRun_Timing/2025_NCKL_Cross_Country_Championships/">y</a><a href="http://results.tfmeetpro.com/LetsGoRun_Timing/Junction_City_Invitational/">z</a>';
assert.deepEqual(letsGoRunGuesses(listing,2026),['2026_Clay_Center_XC_Invitational','2026_NCKL_Cross_Country_Championships']);
assert.deepEqual(letsGoRunSchools(ksc('meetpro-2026_NCKL_Cross_Country_Championships.html.gz'),[{id:'chapman-ks',sports:{meetTeam:'Chapman'}},{id:'axtell-ks',sports:{meetTeam:'Axtell'}},{id:'fort-riley-ms-ks',sports:{meetTeam:['Ft Riley','Fort Riley']}}]),['chapman-ks','fort-riley-ms-ks']);
// MaxPreps id from a page with no mascot image: its most frequent schoolId.
assert.equal(maxprepsSchoolPage(ksc('maxpreps-wabaunsee-football-2026-11-05.html.gz'),'alma/wabaunsee-chargers').id,JSON.parse(readFileSync(new URL('../src/schools/data/ks-wabaunsee.json',import.meta.url),'utf8')).schools.find(e=>e.id==='wabaunsee-ks').maxpreps.schoolId);
// MaxPreps paths the guesses miss, from the links on the county's other
// school pages (November 6: Shawnee and Douglas counties).
{
  const links=['ks/topeka/west-chargers','ks/carbondale/santa-fe-trail-chargers','ks/topeka/cair-paravel-lions','ks/rossville/rossville-bulldogs','ks/baldwin/baldwin-bulldogs',
    'ks/lawrence/bishop-seabury-academy-seahawks','ks/perry/perry-lecompton-bishop-seabury-academy','ks/lawrence/lawrence-chesty-lions','ks/lawrence/lawrence-free-state-firebirds','ks/topeka/highland-park-scots','ks/football/game'];
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Topeka West High',town:'Topeka',mascot:'Chargers'}),'ks/topeka/west-chargers');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Cair Paravel Latin School',town:'Topeka',mascot:'Rampant Red Lion'}),'ks/topeka/cair-paravel-lions');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Rossville Jr.-Sr. High School',town:'Rossville',mascot:'Bulldawgs'}),'ks/rossville/rossville-bulldogs');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Baldwin High School',town:'Baldwin City',mascot:'Bulldogs'}),'ks/baldwin/baldwin-bulldogs');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Bishop Seabury Academy',town:'Lawrence',mascot:'Seahawks'}),'ks/lawrence/bishop-seabury-academy-seahawks');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Lawrence High',town:'Lawrence',mascot:'Chesty Lions'}),'ks/lawrence/lawrence-chesty-lions');
  assert.equal(maxprepsFromLinks(links,'KS',{name:'Hope Street Academy',town:'Topeka',mascot:'Panthers'}),null,'no link fits');
  assert.deepEqual(maxprepsLinks('<a href="https://www.maxpreps.com/ks/topeka/west-chargers/football/">'),['ks/topeka/west-chargers']);
}
// One school under two names, with one Bound school: one row (Free State).
{
  const b={name:'Lawrence Free State',town:'Lawrence',bound:'hFS',address:'4700 Overland Dr'};
  const two=matchSchools({ccd:[{name:'Lawrence Free State High',town:'Lawrence',level:'high-school',address:'4700 Overland Dr'}],kshsaa:[{name:'Free State HS',town:'Lawrence',address:'4700 Overland Drive'}],bound:[b],state:'KS'});
  assert.equal(two.filter(r=>r.bound).length,1);assert.ok(two[0].kshsaa&&two[0].ccd,'both sources kept');
}
// Few Bound games: MaxPreps' game sports join the draft (Cair Paravel, November 6).
{
  const e=draftEntry({id:'cair-paravel-latin-ks',level:'high-school',name:'Cair Paravel Latin School',bound:{bound:'h1',slug:'cplatin',name:'Cair Paravel Latin'},has:['Football','Volleyball','Basketball','Cross Country','Track & Field'],
    maxpreps:{id:'0214e66b-7ee7-4dd5-9c77-b72e148aa811',path:'ks/topeka/cair-paravel-lions',teams:['baseball','basketball','football','soccer','tennis/girls','volleyball','volleyball/boys','wrestling']},coverage:{sparse:true}});
  assert.deepEqual(e.sports.has,['Football','Volleyball','Soccer','Basketball','Baseball','Cross Country','Track & Field']);assert.equal(e.sports.maxprepsSchedule,true);
  assert.equal(e.maxpreps.path,'topeka/cair-paravel-lions');
}
console.log(`onboard-hs: ok (Geary: ${rows.length} schools matched)`);
