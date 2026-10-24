// Rules found onboarding the Southern Conference (Oct 24).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConferenceGames} from '../src/conference-games.mjs';
import {withoutRanking} from '../src/sidearm-schedule-reader.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json'));

// "NR/RV Chattanooga" (The Citadel's football page, Sep 26): unranked in one
// poll, receiving votes in the other; a name that starts "NR" stays.
assert.equal(withoutRanking('NR/RV Chattanooga'),'Chattanooga');
assert.equal(withoutRanking('NR/12 Furman'),'Furman');
assert.equal(withoutRanking('NRG Park'),'NRG Park');

// The SoCon sponsors no swimming: VMI's meets count under no league; its
// soccer games against members do.
{
  const vmi=schools.find(s=>s.id==='vmi');
  const events=[{sport:'Swimming & Diving',opponent:'Mercer',start_time:'2026-11-01T18:00:00Z'},{sport:'Soccer',opponent:'UNCG',start_time:'2026-10-01T18:00:00Z'}];
  createConferenceGames({schools}).markConferenceGames(events,'',vmi,'https://vmikeydets.com/sports/mens-soccer/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[false,true]);
}

// Chattanooga names golf rounds after the tournament and wrestling sessions
// after the event; the women's golf card puts the team place first; a beach
// volleyball qualifier is a tournament. The Citadel's rifle card places each
// team. The page blocks in each module test check the lines themselves.
const chattanooga=read('../src/schools/chattanooga.mjs');
assert.match(chattanooga,/\(\?:Day\\s\+\\d\+\|Round\\s\+\\d\+\|Final\\s\+Round\)\$\/i/);
assert.match(chattanooga,/golfCardPlace\(card\)\|\|golfCardPlace\(text\)/);
assert.match(chattanooga,/sport==='Beach Volleyball'&&EVENT_NAME\.test/);
assert.match(read('../src/schools/citadel.mjs'),/\(Mixed\|Women's\|Men's\)\(\?: Rifle\)\?/);
// Chattanooga and East Tennessee State keep Eastern time (Tennessee's other
// schools are Central).
assert.match(read('../src/index.js'),/chattanooga:'America\/New_York','east-tennessee-state':'America\/New_York'/);
// TFRRS can shorten the state that starts a name (VMI: Va_Military_Institute).
assert.match(read('../scripts/start-schools.mjs'),/stateShort=/);
console.log('SoCon shared checks passed');
