// Geary County middle and high schools (November 3, 2026): Junction City HS,
// Junction City MS and Fort Riley MS on Bound; St. Xavier's games on MaxPreps
// and its meets on Bound. Fixtures are the real sources of November 3 (Bound
// trimmed to the acts tested).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boundSchedule,boundDedupe,maxprepsContests,BOUND_ACTS} from '../src/high-school.mjs';
import {GEARY_HIGH_SCHOOLS,GEARY_MIDDLE_SCHOOLS,junctionCityKsSchool,junctionCityMsKsSchool,fortRileyMsKsSchool,stXavierKsSchool,stXavierJhKsSchool} from '../src/schools/geary-ks.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const b=readFileSync(new URL('./fixtures/geary-ks/'+name,import.meta.url));return name.endsWith('.gz')?gunzipSync(b).toString('utf8'):b.toString('utf8');};
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const TZ='America/Chicago';

// Catalog: every school in Kansas, Geary County, at its level, with a theme
// and the sports its module reads.
const modules=[...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS];
assert.deepEqual(modules.map(m=>m.id),['junction-city-ks','st-xavier-ks','junction-city-ms-ks','fort-riley-ms-ks','st-xavier-jh-ks']);
for(const m of modules){
  const s=schools.find(x=>x.id===m.id);assert.ok(s,m.id);
  assert.equal(s.state,'Kansas');assert.equal(s.county,'Geary County',m.id);assert.ok(s.city,m.id);
  assert.equal(s.level,GEARY_HIGH_SCHOOLS.includes(m)?'high-school':'middle-school',m.id);
  assert.ok(themes[m.id],m.id);
  assert.deepEqual(sponsored[m.id],Object.keys(m.sports).sort(),m.id);
  for(const teams of Object.values(m.sports))for(const t of teams){
    assert.ok(t.boundSchedule?m.bound?.school:t.maxprepsSchedule&&m.maxpreps?.schoolId,`${m.id}: every team has a schedule source`);
    for(const act of t.boundSchedule?.acts||[])assert.ok(BOUND_ACTS[act],`${m.id}: ${act} has Bound ids`);
    if(t.maxpreps)assert.ok(m.maxpreps?.schoolId,m.id);
  }
}
assert.deepEqual(Object.keys(junctionCityKsSchool.sports).sort(),['Baseball','Basketball','Bowling','Cross Country','Football','Golf','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']);
assert.deepEqual(junctionCityKsSchool.sports.Soccer.map(t=>[t.label,t.maxpreps]),[['Boys','soccer'],['Girls','soccer/girls/spring']],'girls soccer is a spring team on MaxPreps');
assert.deepEqual(junctionCityKsSchool.sports.Bowling.map(t=>t.label),['Girls','Boys','Unified']);
assert.deepEqual(junctionCityKsSchool.sports.Tennis.map(t=>t.tennisReporting.school),['Junction City HS','Junction City HS']);
assert.deepEqual(junctionCityKsSchool.prepGolf,{school:7,code:'JC'});
assert.equal(junctionCityKsSchool.sports['Cross Country'][0].milesplit.team,15714);
// The shared builders keep the Riley and Pottawatomie schools as they were.
assert.deepEqual(RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='wamego-ks').sports.Bowling.map(t=>t.label),['Unified'],'Wamego bowls Unified only');
assert.deepEqual(RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='st-marys-academy-ks').sports.Soccer.map(t=>t.label),['Boys']);
assert.ok(RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.every(m=>!m.sports.Tennis),'no Riley or Pottawatomie middle school gained tennis');

const games=(m,payload,team)=>boundDedupe(boundSchedule([payload],{school:m.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone:TZ,noun:team.meet?'Meet':'Tournament'}),{meet:!!team.meet});
const line=g=>`${g.date} ${g.time||'--'} ${g.site||'-'} ${g.name}${g.final?` ${g.final.result} ${g.final.score}-${g.final.opponent_score}`:''}`;

// Junction City HS: varsity football from Bound with the finals entered there.
const jc=JSON.parse(fixture('bound-junction-city-2026-11-03.json.gz'));
assert.deepEqual(games(junctionCityKsSchool,jc,junctionCityKsSchool.sports.Football[0]).map(line),[
  '2026-09-04 19:30 HOME Hays L 7-28','2026-09-11 19:00 HOME Lawrence L 7-31','2026-09-18 19:00 AWAY Wichita Northwest L 14-26','2026-09-25 19:00 AWAY Emporia W 32-6',
  '2026-10-02 19:00 HOME Manhattan','2026-10-09 19:00 HOME Topeka','2026-10-16 19:00 AWAY Washburn Rural','2026-10-23 19:00 HOME Great Bend W 55-14','2026-10-30 19:00 HOME Washburn Rural']);
const [girlsSwim]=junctionCityKsSchool.sports['Swimming & Diving'];
assert.equal(girlsSwim.label,'Girls');
assert.deepEqual(games(junctionCityKsSchool,jc,girlsSwim).map(line),['2027-04-23 15:30 AWAY Salina Girls Swim Invitational','2027-04-27 16:00 AWAY Hays High Invitational','2027-05-06 15:30 AWAY Salina Girls Swim Meet 3'],'girls swim in the spring');
const boysBowling=junctionCityKsSchool.sports.Bowling.find(t=>t.label==='Boys');
assert.equal(games(junctionCityKsSchool,jc,boysBowling).length,10);

// Junction City MS: a grade's A team also reads "7th Grade - A - 1"; B teams are not listed.
const jcms=JSON.parse(fixture('bound-junction-city-ms-2026-11-03.json.gz'));
const [boys7]=junctionCityMsKsSchool.sports.Basketball.filter(t=>t.label==='7th Boys');
const b7=games(junctionCityMsKsSchool,jcms,boys7);
assert.equal(b7.length,12);
assert.ok(b7.some(g=>g.level==='7th Grade - A - 1'&&g.name==='Topeka Seaman MS'),'"7th Grade - A - 1" is the 7th grade A team');
assert.ok(b7.every(g=>!/\bB\b/.test(g.level)));
const tennis=games(junctionCityMsKsSchool,jcms,junctionCityMsKsSchool.sports.Tennis[0]);
assert.deepEqual(tennis.map(g=>g.date),['2027-04-06','2027-04-08','2027-04-20','2027-04-27','2027-04-30','2027-05-04'],'middle school tennis: one entry per meet day');
// Fort Riley MS: "7A" and "7th Grade A-Team" are the 7th grade.
const frms=JSON.parse(fixture('bound-fort-riley-ms-2026-11-03.json.gz'));
const g7=games(fortRileyMsKsSchool,frms,fortRileyMsKsSchool.sports.Basketball.find(t=>t.label==='7th Girls'));
assert.ok(g7.some(g=>g.level==='7A'&&g.name==='Wamego MS')&&g7.some(g=>g.level==='7th Grade A-Team'&&g.name==='Chapman'));
assert.ok(g7.every(g=>!/8|B$/.test(g.level)),'no 8th grade or B team');
assert.equal(fortRileyMsKsSchool.sports['Cross Country'][0].meetPro.team,'Ft Riley','LetsGoRun writes "Ft Riley7G"');

// St. Xavier: its junior high reads JHA (not JHB), Junior High and grade entries.
const sfx=JSON.parse(fixture('bound-st-xavier-2026-11-03.json.gz'));
assert.deepEqual(games(stXavierJhKsSchool,sfx,stXavierJhKsSchool.sports.Volleyball[0]).map(g=>`${g.date} ${g.level}`),['2026-09-07 JHA','2026-09-12 7th Grade','2026-09-14 Middle School']);
assert.deepEqual(games(stXavierJhKsSchool,sfx,stXavierJhKsSchool.sports.Basketball[0]).map(line),['2026-10-19 16:30 HOME Wathena-Riverside','2026-11-30 16:30 AWAY Wathena-Riverside']);
const sxXc=stXavierKsSchool.sports['Cross Country'][0];
assert.deepEqual(games(stXavierKsSchool,sfx,sxXc).map(g=>g.name),['WCHS Invitational','Karr Classic at The Orchard'],'Bound lists two varsity meets');
assert.deepEqual(sxXc.extraMeets.map(m=>m.date),['2026-10-03','2026-10-08','2026-10-24'],'MileSplit Live has its runners at three more');
// Its games are on MaxPreps (school 2eb435d3-...): the 2026 volleyball finals.
assert.ok(stXavierKsSchool.sports.Basketball.every(t=>t.maxprepsSchedule&&t.maxpreps),'basketball: the MaxPreps schedule');
assert.deepEqual(games(stXavierKsSchool,sfx,stXavierKsSchool.sports.Volleyball[0]).map(line),['2026-10-19 18:30 HOME Veritas Christian'],'volleyball: Bound\'s one varsity entry beside the MaxPreps finals');
const vb=maxprepsContests(fixture('maxpreps-st-xavier-volleyball-2026-11-03.html.gz'),stXavierKsSchool.maxpreps.schoolId);
assert.deepEqual(vb.map(c=>`${c.date} ${c.opponent} ${c.result} ${c.score}-${c.opponent_score}`),['2026-09-08 Flint Hills Christian L 0-3','2026-09-21 Peabody-Burns L 0-2','2026-10-13 Cornerstone Family L 0-3']);

// The Worker: a team whose games are on MaxPreps reads them as its schedule;
// a team's extra meets join its schedule.
const worker=read('../src/index.js');
assert.ok(worker.includes(':maxprepsOnly||team.maxprepsSchedule?[]:calendarEvents('),'a maxprepsSchedule team reads no calendar');
assert.ok(worker.includes('if(maxprepsOnly||team.maxprepsSchedule)for(const contest of contests'),'its unscored MaxPreps games are its schedule');
assert.ok(worker.includes('for(const meet of team.extraMeets||[]){'),'extra meets join the schedule');
assert.ok(worker.includes('...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS'),'the Geary modules are registered');

console.log(`Geary County module passed: ${modules.length} schools, ${modules.reduce((n,m)=>n+Object.keys(m.sports).length,0)} school-sports.`);
