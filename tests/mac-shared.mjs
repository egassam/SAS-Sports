// Shared rules found onboarding the MAC (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {golfCardPlace} from '../src/sidearm-school-kit.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
import {inferSport} from '../scripts/onboard-school.mjs';

// A golf card's place with the team's scores beside it, in each MAC school's
// own form. Mutation: without golfCardPlace these finals read "Completed"
// (Ball State's twelve were left out) or a player's place from the story.
assert.equal(golfCardPlace('14th of 16 Teams / 928 (+64)'),'14th of 16');
assert.equal(golfCardPlace('12th of 14, 289-291 -- 580 (+12)'),'12th of 14');
assert.equal(golfCardPlace('T9 of 16, 292 -- 867 (+27)'),'T9th of 16');
assert.equal(golfCardPlace('9th of 12, 309-317 — 626 (+50)'),'9th of 12');
assert.equal(golfCardPlace('3rd of 15, 302'),'3rd of 15');
assert.equal(golfCardPlace('T-5th (830/-34)'),'T5th');
assert.equal(golfCardPlace('1st (863, -1)'),'1st');
assert.equal(golfCardPlace('T-12th / 13 teams (+61, 913)'),'T12th of 13');
assert.equal(golfCardPlace('2nd, 842'),'2nd');
assert.equal(golfCardPlace('864/T-2nd'),'T2nd');
assert.equal(golfCardPlace('12th, (+57, 312-301-308 – 921)'),'12th');
// Anything else is no place: match play, no team score, a bare place (the
// module reads those itself), a place bigger than its field.
for(const text of ['CMU 10, Alabama State 2','No Team Score','-- (NTS)','Individuals Only','12th','',null,'15th of 12, 290'])assert.equal(golfCardPlace(text),null,String(text));

// MAC conference games by membership: opponents write "Miami (Ohio)",
// "Miami University (OH)", "Massachusetts". Mutation: without the names
// these games leave the conference record.
const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8'));
const mac=schools.filter(s=>s.conference==='MAC').map(s=>s.id).sort();
assert.deepEqual(mac,['akron','ball-state','bowling-green','buffalo','central-michigan','eastern-michigan','kent-state','miami-oh','ohio','toledo','umass','western-michigan']);
const {markConferenceGames}=createConferenceGames({schools});
const cmu=schools.find(s=>s.id==='central-michigan');
const games=markConferenceGames(['Miami (Ohio)','Miami University (OH)','Massachusetts','Bowling Green State','Miami (Fla.)','MAC Championship'].map((opponent,i)=>({sport:'Football',opponent,start_time:`2026-10-${10+i}T19:00:00Z`})),'',cmu);
assert.deepEqual(games.map(e=>e.conference_game),[true,true,true,true,false,false]);
// The MAC sponsors no hockey: Miami's and Bowling Green's games against each
// other have no MAC record (CCHA/NCHC).
const hockey=markConferenceGames([{sport:'Hockey',opponent:'Bowling Green',start_time:'2026-11-06T19:00:00Z'}],'',schools.find(s=>s.id==='miami-oh'));
assert.equal(hockey[0].conference_game,false);

// Onboarding: a menu that links teams by code (UMass's `index.aspx?path=`)
// names hockey and women's wrestling too (Kent State's `wwrestling`).
assert.equal(inferSport('/sports/mhockey'),'Hockey');
assert.equal(inferSport('/sports/wwrestling'),'Wrestling');
assert.equal(inferSport('/sports/fhockey'),'Field Hockey');

console.log('MAC shared checks passed');
