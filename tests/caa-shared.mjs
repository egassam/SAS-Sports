// Shared rules found onboarding the CAA (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');

// "... to lead the Monmouth University men's golf team to a seventh-place
// finish" (Blue Hen Intercollegiate). Mutation: without the wider rule the
// final reads "Completed".
assert.equal(golfStoryPlace(fixture('monmouth-module/recap-2026-10-21-mens-golf-scenna-leads-monmouth-mens-gol.html.gz'),{team:"(?:Hawks|Monmouth|(?:Men's|Women's) Golf)"}),'7th');

const kit=read('../src/sidearm-school-kit.mjs');
// A weekly award story ("...-caa-weekly-honor") is never a meet's story.
assert.match(kit,/-of-the-\(\?:week\|month\)\$\|-weekly-honors\?\$/);
// TFRRS names a host-named meet only where the module asks (NC A&T): other
// schools keep their own names ("Battle for New Orleans").
assert.match(kit,/if\(hostMeetName&&tfrrsName&&event\.opponent&&!HOST_EVENT_WORD\.test\(event\.opponent\)/);
assert.match(read('../src/schools/nc-at.mjs'),/hostMeetName:true/);

// Onboarding matches TFRRS's shortened names (N_Carolina_AT, Col_of_Charleston,
// William__Mary), not NC State's North_Carolina_St for NC A&T, and reads the
// TFRRS meets the repository already saved.
const start=read('../scripts/start-schools.mjs');
assert.match(start,/const SHORT=\{n:'north',s:'south',e:'east',w:'west',col:'college',st:'state',u:'university'\}/);
assert.match(start,/return nameWords\.some\(list=>list\.length&&list\.every\(word=>parts\.some\(part=>covers\(part,word\)\)\)\)/);
assert.match(start,/\/\^tfrrs-\\d\+\\\.html\\\.gz\$\//);

// Fairfield is a CAA member in field hockey and men's lacrosse.
assert.match(read('../src/conference-games.mjs'),/'CAA':\[\{names:\['fairfield'/);

// William & Mary football plays in the Patriot League (its page data marks
// the Patriot League games), as Richmond's.
assert.match(read('../src/schools/william-mary.mjs'),/const league=\{'Football':'Patriot League'\}\[sport\]/);

console.log('CAA shared checks passed');
