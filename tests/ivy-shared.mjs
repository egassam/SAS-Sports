// Shared rules found onboarding the Ivy League (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withoutRanking} from '../src/sidearm-schedule-reader.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// A ranking with no number: "#--/RV Dartmouth College" (Cornell football,
// Nov 14). Mutation: without "--" the name keeps its prefix.
assert.equal(withoutRanking('#--/RV Dartmouth College'),'Dartmouth College');
assert.equal(withoutRanking('#8/7 Villanova'),'Villanova');
assert.equal(withoutRanking('RV Yale'),'Yale');

// Rowing cards name the boat ("V8: 10th out of 19") and can write the field
// as a place ("4th out of 48th"), Cornell at the Head of the Charles.
assert.match(read('../src/schools/cornell.mjs'),/if\(sport==='Rowing'\)\{\n\s*const boat=text\.match\(\/\^\(\\d\?V\\d\\\+\?\):/);
assert.match(read('../scripts/survey-school.mjs'),/\\d\?V\\d\\\+\?: \(\?:T-\?\)\?\\d\+/);
// Rowing pages whose address does not name the team carry a label.
assert.match(read('../src/schools/cornell.mjs'),/teamLabels:\{'\/sports\/rowing\/schedule':"Men's Heavyweight"/);

// The Big 5 Classic is an event, "at" (Penn, as Drexel).
assert.match(read('../src/schools/penn.mjs'),/\|\^big 5\\b\/i\.test/);

// The Ivy League's own sports include wrestling (its pages mark the Ivy
// duals); hockey is ECAC Hockey's.
assert.match(read('../src/conference-games.mjs'),/'Ivy League':new Set\(\['Hockey','Rifle',/);
for(const id of ['brown','cornell','dartmouth','princeton'])assert.match(read(`../src/schools/${id}.mjs`),/'Hockey':'ECAC Hockey'/);

console.log('Ivy League shared checks passed');
