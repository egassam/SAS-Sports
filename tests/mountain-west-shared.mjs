// Shared rules found onboarding the Mountain West (Oct 22).
import assert from 'node:assert/strict';
import {golfPlacing,swimDualScores} from '../src/sidearm-school-kit.mjs';
import {wmtMeetResult} from '../src/wmt-api-kit.mjs';

// A swimming dual whose page puts the winner's score first: the written W or
// L decides (UNLV at Arizona State, Oct 2). Mutation: without it both read
// "W, 231-68".
assert.deepEqual(swimDualScores('Women: L, 231-68 | Men: L, 245-55'),[{team:'Women',value:'L, 68-231'},{team:'Men',value:'L, 55-245'}]);
// The scores still decide when the letter is no outcome ("M" for a win) or
// missing (North Carolina's "M: 149-108").
assert.deepEqual(swimDualScores('Women: W, 253-33 | Men: M, 248-41'),[{team:'Women',value:'W, 253-33'},{team:'Men',value:'W, 248-41'}]);
assert.deepEqual(swimDualScores('M: 149-108 | W: 156-101'),[{team:'Men',value:'W, 149-108'},{team:'Women',value:'W, 156-101'}]);

// Golf places with the rounds, total and score to par in brackets (UC Davis's
// women's cards). Mutation: without the to-par form each is null (the story
// gave a player's "T68th").
assert.equal(golfPlacing('7th Of 17 (286-299-296 - 881, +17)'),'7th of 17');
assert.equal(golfPlacing('T4th Of 13 (285-286-292 - 863, -1)'),'T4th of 13');
assert.equal(golfPlacing('10th Of 17 (293, +9)'),'10th of 17');

// The WMT kit's results (New Mexico, San José State). Mutation: each form
// removed reads the raw text.
assert.equal(wmtMeetResult('1-2-0 record','Golf').headline,'Match play: 1-2');
assert.equal(wmtMeetResult('0-2-1 record','Golf').headline,'Match play: 0-2-1');
assert.equal(wmtMeetResult('Individuals Only','Cross Country').headline,'No team score (individuals only)');
assert.equal(wmtMeetResult('6th out of 17 teams','Golf').headline,'6th of 17');
assert.equal(wmtMeetResult('4th/2nd among American Universities','Golf').headline,'4th (2nd among American Universities)');

console.log('Mountain West shared checks passed');
