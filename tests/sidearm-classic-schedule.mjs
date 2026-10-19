import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';

// The older SIDEARM schedule page (Utah State's football page, saved Oct 19)
// embeds its games as plain JSON in a Vue/knockout script, not __NUXT_DATA__:
// the shared reader cuts the array out and reads the same game objects.
// Mutation: without the classic reader the page gives no games.
const page=gunzipSync(readFileSync(new URL('./fixtures/sidearm-classic/utah-state-football-schedule.html.gz',import.meta.url))).toString('utf8');
const games=sidearmScheduleGames(page);
assert.equal(games.length,13);
assert.deepEqual(games.slice(0,2).map(g=>[g.date.slice(0,10),g.opponent.title,g.result?.status,g.result?.team_score,g.result?.opponent_score]),[['2026-09-05','Idaho State','L','17','29'],['2026-09-12','#19 Washington','L','14','16']]);
// Another page of the site (its scoreboard widget also lists "games"): no
// schedule_id, no games.
assert.deepEqual(sidearmScheduleGames(page.replace(/\bvar\s+schedule_id\s*=\s*\d+/,'')),[]);
console.log('Classic SIDEARM schedule checks passed');
