// Dickinson, Wabaunsee, Morris, Clay and Marshall counties, Kansas
// (November 5, 2026; user: "Add counties of your choosing. Skip any schools
// that will slow down the process"). Every school is a data file
// (src/schools/data/ks-<county>.json) registered in src/schools/ks-counties.mjs.
// Fixtures are the real sources of November 5 (Bound trimmed to the acts tested).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boundSchedule,boundDedupe,maxprepsContests,BOUND_ACTS} from '../src/high-school.mjs';
import {KS_COUNTY_FILES,KS_COUNTY_HIGH_SCHOOLS,KS_COUNTY_MIDDLE_SCHOOLS} from '../src/schools/ks-counties.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const b=gunzipSync(readFileSync(new URL('./fixtures/ks-counties/'+name,import.meta.url))).toString('utf8');return name.endsWith('.json.gz')?JSON.parse(b):b;};
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const index=read('../src/index.js');
const TZ='America/Chicago';

// The schools, by county and level.
const modules=[...KS_COUNTY_HIGH_SCHOOLS,...KS_COUNTY_MIDDLE_SCHOOLS];
assert.deepEqual(KS_COUNTY_FILES.map(f=>f.counties[0]),['Dickinson','Wabaunsee','Morris','Clay','Marshall']);
assert.deepEqual(KS_COUNTY_HIGH_SCHOOLS.map(m=>m.id),['abilene-ks','chapman-ks','herington-ks','solomon-ks','wabaunsee-ks','mission-valley-ks','council-grove-ks','clay-center-ks','wakefield-ks','marysville-ks','valley-heights-ks','frankfort-ks','axtell-ks']);
assert.deepEqual(KS_COUNTY_MIDDLE_SCHOOLS.map(m=>m.id),['abilene-ms-ks','clay-center-ms-ks','marysville-ms-ks']);
assert.match(index,/\.\.\.KS_COUNTY_HIGH_SCHOOLS,\.\.\.KS_COUNTY_MIDDLE_SCHOOLS\]/,'the Worker reads them');

// Catalog: in Kansas, in its county, at its level, with a theme and the
// sports its module reads; every team has a schedule source.
for(const file of KS_COUNTY_FILES)for(const entry of file.schools){
  const m=modules.find(x=>x.id===entry.id),s=schools.find(x=>x.id===entry.id);
  assert.ok(m&&s,entry.id);
  assert.equal(s.state,'Kansas');assert.equal(s.county,`${file.counties[0]} County`,entry.id);assert.ok(s.city,entry.id);
  assert.equal(s.level,entry.level,entry.id);
  assert.ok(themes[entry.id],entry.id);
  assert.deepEqual(sponsored[entry.id],Object.keys(m.sports).sort(),entry.id);
  assert.ok(s.providers.some(p=>p.provider==='BOUND'&&p.provider_school_id===entry.bound.school),entry.id);
  for(const teams of Object.values(m.sports))for(const t of teams){
    assert.ok(t.boundSchedule&&m.bound?.school,`${entry.id}: Bound schedule`);
    for(const act of t.boundSchedule.acts)assert.ok(BOUND_ACTS[act],`${entry.id}: ${act} has Bound ids`);
    if(t.maxpreps)assert.ok(m.maxpreps?.schoolId,entry.id);
  }
}

// Schools that enter few of their own games on Bound also read MaxPreps'
// schedule (`maxprepsSchedule`); the others read Bound alone.
const SPARSE=['solomon-ks','wabaunsee-ks','mission-valley-ks','council-grove-ks','wakefield-ks','valley-heights-ks','frankfort-ks','axtell-ks'];
for(const m of KS_COUNTY_HIGH_SCHOOLS){
  const flags=Object.values(m.sports).flat().filter(t=>t.maxpreps).map(t=>!!t.maxprepsSchedule);
  assert.ok(flags.length,`${m.id}: MaxPreps teams`);
  assert.ok(flags.every(f=>f===SPARSE.includes(m.id)),`${m.id}: maxprepsSchedule ${SPARSE.includes(m.id)}`);
  assert.ok(Object.values(m.sports).flat().filter(t=>t.meet).every(t=>!t.maxprepsSchedule),`${m.id}: meets stay on Bound`);
}
// Results sources found by the survey.
const by=id=>modules.find(m=>m.id===id);
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.prepGolf).map(m=>[m.id,m.prepGolf.code])),{'abilene-ks':'ABI','chapman-ks':'CHAP','herington-ks':'HER','solomon-ks':'SLM','council-grove-ks':'CG','clay-center-ks':'CC','marysville-ks':'MVL','valley-heights-ks':'VH','frankfort-ks':'FRA'});
assert.deepEqual(Object.fromEntries(KS_COUNTY_HIGH_SCHOOLS.filter(m=>m.sports.Tennis).map(m=>[m.id,[...new Set(m.sports.Tennis.map(t=>t.tennisReporting?.school))]])),{'abilene-ks':['Abilene HS'],'chapman-ks':['Chapman HS'],'wabaunsee-ks':['Wabaunsee HS'],'clay-center-ks':['Clay Center Community HS'],'marysville-ks':['Marysville HS']});
assert.equal(by('abilene-ks').sports['Cross Country'][0].milesplit.team,21806);
assert.deepEqual(by('abilene-ms-ks').sports['Cross Country'][0].milesplit,{team:33030,middle:true});
assert.equal(by('marysville-ms-ks').bound.school,by('marysville-ks').bound.school,'Marysville JH reads the high school\'s Bound id at its grade levels');
assert.equal(by('herington-ks').sports.Swimming,undefined);
assert.ok(!by('herington-ks').sports['Swimming & Diving'],'no swimming: Bound answered Herington\'s events with every sport (survey fixed)');

const games=(m,payload,team)=>boundDedupe(boundSchedule([payload],{school:m.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone:TZ,noun:team.meet?'Meet':'Tournament'}),{meet:!!team.meet});
const line=g=>`${g.date} ${g.time||'--'} ${g.site||'-'} ${g.name}${g.final?` ${g.final.result} ${g.final.score}-${g.final.opponent_score}`:''}`;

// Abilene HS: varsity football from Bound with the finals entered there
// (the playoff "TBD" rows are placeholders the feed leaves out).
const abilene=by('abilene-ks');
assert.deepEqual(games(abilene,fixture('bound-abilene-2026-11-05.json.gz'),abilene.sports.Football[0]).map(line).slice(0,10),[
  '2026-08-28 18:00 AWAY Jamboree','2026-09-04 19:00 AWAY Concordia L 0-33','2026-09-11 19:00 HOME Wamego L 13-57','2026-09-18 19:00 HOME Chapman L 7-42','2026-09-25 19:00 AWAY Rock Creek',
  '2026-10-02 19:00 HOME Clay Center W 17-14','2026-10-09 19:00 HOME Augusta L 7-19','2026-10-16 19:00 AWAY Circle L 14-33','2026-10-23 19:00 AWAY Marysville','2026-10-29 19:00 AWAY Wamego']);

// Wabaunsee: Bound has one of its football games; MaxPreps has all ten.
const wab=by('wabaunsee-ks'),wabFb=wab.sports.Football[0];
assert.equal(wabFb.maxprepsSchedule,true);assert.equal(wabFb.maxpreps,'football');
assert.deepEqual(games(wab,fixture('bound-wabaunsee-2026-11-05.json.gz'),wabFb).map(line),['2026-10-02 19:00 AWAY Jackson Heights L 14-18']);
const contests=maxprepsContests(fixture('maxpreps-wabaunsee-football-2026-11-05.html.gz'),wab.maxpreps.schoolId);
assert.deepEqual(contests.map(c=>`${c.date} ${c.opponent}${c.result?` ${c.result} ${c.score}-${c.opponent_score}`:''}`),[
  '2026-09-04 West Franklin W 45-3','2026-09-11 Olpe L 14-35','2026-09-18 Onaga L 8-14','2026-09-25 Atchison County W 24-8','2026-10-02 Jackson Heights L 14-18',
  '2026-10-09 Rossville L 0-49','2026-10-16 St. Marys L 14-45','2026-10-23 Mission Valley W 30-14','2026-10-30 Valley Heights W 26-19','2026-11-06 Olpe']);

// The Worker lists MaxPreps' unscored games Bound lacks for such a team (the
// Bound game-sports path returned before them: Wabaunsee's Nov 6 playoff
// game at Olpe was missing on the first preview). Here that is Olpe alone.
assert.ok(index.includes("if(team.maxprepsSchedule){\n        const onBound=c=>games.some("),'Bound game sports read MaxPreps\' coming games');
const wabGames=games(wab,fixture('bound-wabaunsee-2026-11-05.json.gz'),wabFb);
assert.deepEqual(contests.filter(c=>c.opponent&&!(c.result&&c.score!=null)&&!wabGames.some(g=>g.date===c.date)).map(c=>`${c.date} ${c.opponent}`),['2026-11-06 Olpe']);

// Bound names the NCKL championship (October 15, Abilene) for its course:
// the state's alias table gives MileSplit Live's name (Abilene, Chapman, Clay
// Center, Marysville, and Wamego and Rock Creek already in the app).
const ALIASES=JSON.parse(read('../src/schools/data/ks-aliases.json'));
assert.equal(ALIASES.meets['Great Life Golf Course meet'],'NCKL Cross Country Championships');

// Abilene MS: the grade teams (7th, 8th; their A teams), B teams left out.
const ams=by('abilene-ms-ks');
const [boys7,boys8]=ams.sports.Basketball.filter(t=>/^(?:7th|8th) Boys$/.test(t.label));
const amsPayload=fixture('bound-abilene-ms-2026-11-05.json.gz');
assert.deepEqual(games(ams,amsPayload,boys7).map(line).slice(0,3),['2027-01-07 16:30 AWAY Clay Center Community MS',"2027-01-11 16:30 HOME St. Mary's Academy",'2027-01-14 16:30 AWAY Marysville']);
assert.ok(games(ams,amsPayload,boys8).length>=10,'the 8th grade boys have their season');
for(const t of [boys7,boys8])assert.ok(!t.boundSchedule.level.test('8th Grade B')&&!t.boundSchedule.level.test('7th Grade B'),'B teams are not listed');

console.log(`ks-counties module: ok (${modules.length} schools, ${KS_COUNTY_FILES.length} counties)`);
