// Shared rules found onboarding the NEC (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {golfPlacing} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// Cross country places: "4th - 115 points" (Chicago State) and the points
// first, "261 Points | 9th of 16" (Le Moyne). A bare golf total is no place.
assert.equal(golfPlacing('4th - 115 points'),'4th · 115 pts');
assert.equal(golfPlacing('261 Points | 9th of 16'),'9th of 16 · 261 pts');
assert.equal(golfPlacing('12th - 870'),null);
assert.match(read('../scripts/survey-school.mjs'),/\(\?:T-\?\)\?\\d\+\(\?:st\|nd\|rd\|th\)\(\?: of \\d\+\)\? \\u00b7 \[\\d\.\]\+ pts\$/);

// Le Moyne's meets name their host after a bar ("Harry Lang Invitational |
// Colgate"); host-named meets take their stories' names (Chicago State's
// Windy City Classic, Stonehill's Bryant Invitational).
assert.match(read('../src/schools/le-moyne.mjs'),/opponent=String\(opponent\)\.split\(\/\\s\+\\\|\\s\+\/\)\[0\];/);
assert.match(read('../src/schools/chicago-state.mjs'),/opponent='Windy City Classic'/);
assert.match(read('../src/schools/stonehill.mjs'),/opponent='Bryant Invitational'/);

// LIU's men's pages are short codes, labelled; leagues per team page.
const liu=read('../src/schools/liu.mjs');
assert.match(liu,/teamLabels:\{'\/sports\/mrow\/schedule':"Men's"/);
assert.match(liu,/\/\^\\\/sports\\\/mwpolo\\\/\/\.test\(url\?\.pathname\|\|''\)\?'NWPC':'Metro Conference'/);

console.log('NEC shared checks passed');
