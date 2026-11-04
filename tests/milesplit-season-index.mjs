// The statewide MileSplit Live index (user, November 4: "Index by source,
// not by school"). One query per state, season and year returns every meet
// with its teams. Fixture: the query's answer on November 4, 2026 (Kansas
// cross country, 172 meets; team entries kept to id and name). It replaced
// the hand-kept `extraMeets` of St. Xavier, Junction City HS and Fort Riley
// MS: the meets Bound leaves out are found from the index by MileSplit team
// id, and kept only when the school's runners are in the results.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {milesplitSeasonQuery,milesplitSeasonIndex,milesplitTeamMeets,milesplitIndexGames,milesplitTeamsNamed,boundSchedule,boundDedupe} from '../src/high-school.mjs';
import {GEARY_HIGH_SCHOOLS,GEARY_MIDDLE_SCHOOLS} from '../src/schools/geary-ks.mjs';

const gz=path=>gunzipSync(readFileSync(new URL(path,import.meta.url))).toString('utf8');
const index=milesplitSeasonIndex(JSON.parse(gz('./fixtures/milesplit-season/ks-cc-2026-11-04.json.gz')));
const byId=Object.fromEntries([...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS].map(m=>[m.id,m]));

// The query: equality filters only (state, year, season), no college meets kept.
{
  const q=JSON.parse(milesplitSeasonQuery('ks',2026));
  assert.deepEqual(q.structuredQuery.where.compositeFilter.filters.map(f=>[f.fieldFilter.field.fieldPath,f.fieldFilter.op,Object.values(f.fieldFilter.value)[0]]),[['venue.state','EQUAL','KS'],['seasonYear','EQUAL','2026'],['season','EQUAL','CC']]);
  assert.ok(q.structuredQuery.select.fields.some(f=>f.fieldPath==='teams'));
  assert.equal(index.length,163,'172 meets, 9 of them college');
  assert.ok(index.every(m=>m.id&&/^\d{4}-\d\d-\d\d$/.test(m.date)&&Array.isArray(m.teams)));
}

// A team's meets: St. Xavier (26138) is entered in five.
assert.deepEqual(milesplitTeamMeets(index,26138).map(m=>`${m.date} ${m.name}`),[
  '2026-09-22 McPherson Middle School Invitational','2026-10-01 Council Grove Invitational','2026-10-03 Bob Schmoekel Cross Country Invitational',
  '2026-10-08 Goessel XC Invitational','2026-10-24 KSHSAA 1A Sub-State Cheney Lake']);

// What each schedule gains: the meets Bound leaves out, by November 4. The
// hand-kept lists were St. Xavier Oct 3, 8 and 24; Junction City Oct 24; Fort
// Riley MS Sep 15. The index finds each of them (plus meets the results
// step then keeps or drops by the school's runners).
const TZ='America/Chicago';
const schedule=(id,file)=>{
  const m=byId[id],team=m.sports['Cross Country'][0];
  const games=boundDedupe(boundSchedule([JSON.parse(gz(`./fixtures/geary-ks/${file}`))],{school:m.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone:TZ,noun:'Meet'}),{meet:true});
  return milesplitIndexGames(index,[team.milesplit.team,...(team.milesplit.also||[])],games,'2026-11-04');
};
const dates=list=>list.map(g=>g.date);
{
  const sx=schedule('st-xavier-ks','bound-st-xavier-2026-11-03.json.gz');
  for(const d of ['2026-10-03','2026-10-08','2026-10-24'])assert.ok(dates(sx).includes(d),`St. Xavier ${d}`);
  // Entered with no runner (Council Grove) or a middle school meet (McPherson):
  // added here, then dropped when the varsity results have none of its runners.
  assert.ok(dates(sx).includes('2026-10-01')&&dates(sx).includes('2026-09-22'));
  const g=sx.find(x=>x.date==='2026-10-24');
  assert.deepEqual([g.name,g.site,g.milesplitMeet,g.fromIndex],['KSHSAA 1A Sub-State Cheney Lake','AWAY',g.milesplitMeet,true]);
  assert.match(g.milesplitMeet,/^\d+$/);
  // A day the schedule already has is never added twice.
  assert.ok(!dates(sx).includes('2026-09-10'));
}
assert.ok(dates(schedule('junction-city-ks','bound-junction-city-2026-11-03.json.gz')).includes('2026-10-24'),'Junction City: its 6A sub-state');
assert.ok(dates(schedule('fort-riley-ms-ks','bound-fort-riley-ms-2026-11-03.json.gz')).includes('2026-09-15'),'Fort Riley MS: Clay Center');
// A meet still to come is not added (its runners are not known yet).
assert.deepEqual(milesplitIndexGames(index,26138,[],'2026-09-30').map(g=>g.date),['2026-09-22']);
// A multi-day schedule entry covers its days; the host's meet reads as home.
assert.deepEqual(milesplitIndexGames([{id:'1',name:'A',date:'2026-10-02',end:null,host:'9',teams:[{id:'9'}]}],[9],[{date:'2026-10-01',end_date:'2026-10-03'}],'2026-11-01'),[]);
assert.equal(milesplitIndexGames([{id:'1',name:'A',date:'2026-10-02',end:null,host:'9',teams:[{id:'9'}]}],[9],[],'2026-11-01')[0].site,'HOME');

// Onboarding: a school's MileSplit team id from its name.
assert.deepEqual(milesplitTeamsNamed(index,'Junction City High School').map(t=>t.id),['15714','39340']);
assert.deepEqual(milesplitTeamsNamed(index,'Fort Riley Middle School').map(t=>[t.id,t.code]),[['40677','FRMM']]);

// The Worker reads the index for every cross country team with a MileSplit
// team id, keeps an index meet only when its results list the school's
// runners, and reads it by its MileSplit meet id.
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
assert.ok(worker.includes('const extra=milesplitIndexGames(index,ids,games,today);'));
assert.ok(worker.includes('if(game.fromIndex&&!gameResults[index]?.rows?.length)continue;'));
assert.ok(worker.includes('meet:game.midwestTiming?.milesplit||game.milesplitMeet'));
console.log(`milesplit-season-index: ok (${index.length} meets)`);
