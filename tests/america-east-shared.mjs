// Shared rules found onboarding the America East (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {golfPlacing} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// Cross country places with their points (UAlbany, New Hampshire). Mutation:
// without the rule they read as written, not in K-State's format.
assert.equal(golfPlacing('2nd, 52 points'),'2nd · 52 pts');
assert.equal(golfPlacing('1st place, 36 points'),'1st · 36 pts');
assert.equal(golfPlacing('Gold (5th place, 192 points) • Navy (3rd place, 96 points)'),'Gold team: 5th · 192 pts / Navy team: 3rd · 96 pts');
// A bare number may be a golf total: not read as points.
assert.equal(golfPlacing('12th, 323'),null);
assert.equal(golfPlacing('9th/18 (2-3)'),'9th of 18 (2-3)');

// Onboarding finds TFRRS team pages in every state (Maine, New Hampshire and
// Vermont were missing), by a one-word alias (NY_college_f_Albany), and from
// the meets the school's schedule links when no address answers
// (NJ_college_f_New_Jersey_Institute_Technolog).
const start=read('../scripts/start-schools.mjs');
for(const state of ["Maine:'ME'","'New Hampshire':'NH'","Vermont:'VT'","Alaska:'AK'","'North Dakota':'ND'"])assert.ok(start.includes(state),state);
assert.match(start,/const single=\(school\.aliases\|\|\[\]\)\.slice\(0,-1\)/);
assert.match(start,/return tfrrsFromMeets\(school,moduleText,st\);/);
// The Opendorse team is the one the marketplace's athletes list most
// ("Massachusetts Lowell River Hawks", not a name guessed from the school's).
assert.match(start,/matchAll\(\/"currentTeams":\\\["\(\[\^"\]\+\)"\/g\)/);

// The port source (Evansville) carries the rules new modules need: bowling
// days merged and storyless bowling left out (Bryant), alumnae meets internal
// (NJIT). Evansville sponsors neither sport, so its output is unchanged.
const evansville=read('../src/schools/evansville.mjs');
assert.match(evansville,/sport==='Wrestling'\|\|sport==='Bowling'\)return mergeMeetDays\(games\)/);
assert.match(evansville,/event\.sport==='Bowling'\|\|event\.sport==='Triathlon'\)&&event\.headline==='Completed'/);
assert.match(evansville,/alumn\(\?:i\|ae\) meet/);

console.log('America East shared checks passed');
