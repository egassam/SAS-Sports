// Shared rules found onboarding the Big South (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const winthrop="(?:Eagles|Winthrop|(?:Men's|Women's) Golf)";

// Golf stories. Mutation: without each rule the final reads "Completed".
// A results block: "Place (Winthrop): T-8th of 15" ("it finished T8" in the text).
assert.equal(golfStoryPlace(fixture('winthrop-module/story-2026-10-19-mens-golf-eagles-finish-t8-kucia-t16-as-.html.gz'),{team:winthrop}),'T8th');
// "Place (Winthrop): 4th" (the headline: "Mendonca T3, Eagles 4th at UNCG Collegiate").
assert.equal(golfStoryPlace(fixture('winthrop-module/story-2026-10-20-womens-golf-mendonca-t3-eagles-4th-at-un.html.gz'),{team:winthrop}),'4th');
// A results block: "Place (Winthrop): 16th (896/+44)".
assert.equal(golfStoryPlace(fixture('winthrop-module/story-2026-9-29-mens-golf-finishes-play-at-bryan-bros-co.html.gz'),{team:winthrop}),'16th');
// "Place (Winthrop): 1 of 12" names no place (its top five has ETSU first):
// not read.
assert.equal(golfStoryPlace(fixture('winthrop-module/story-2026-10-13-womens-golf-mendonca-t16-finish-leads-ea.html.gz'),{team:winthrop}),null);
// "The Panthers had three individuals compete" (High Point): no team score.
assert.equal(golfStoryPlace(fixture('high-point-module/recap-2026-10-20-womens-golf-trio-of-panthers-conclude-un.html.gz'),{team:"(?:Panthers|High Point|HPU|(?:Men's|Women's) Golf)"}),'No team score (individuals only)');

// Onboarding: SIDEARM's "General Schedule" is no team's page even with games
// (Winthrop's "2018 General Schedule").
assert.match(read('../scripts/fetch-school-fixtures.mjs'),/!games\.length&&!\/schedule\/i\.test\(title\)\|\|\/\\bGeneral Schedule\\b\/i\.test\(title\)/);
// Big South women's lacrosse counts Wofford, Mercer and Furman.
assert.match(read('../src/conference-games.mjs'),/'Big South':\[\{names:\['wofford'/);

console.log('Big South shared checks passed');
