// Shared rules found onboarding Conference USA (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {swimDualScores} from '../src/sidearm-school-kit.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// A swim dual per team with the team word and no colon: "Men: W 196-157;
// Women L 152-199" (Missouri State at Southern Illinois, Oct 2), "Men W
// 189.5-70.5 | Women W 188-69" (Louisville vs Xavier, Oct 2). Mutation:
// with the colon required only the men's dual (or neither) reads.
assert.deepEqual(swimDualScores('Men: W 196-157; Women L 152-199'),[{team:'Men',value:'W, 196-157'},{team:'Women',value:'L, 152-199'}]);
assert.deepEqual(swimDualScores('Men W 189.5-70.5 | Women W 188-69'),[{team:'Men',value:'W, 189.5-70.5'},{team:'Women',value:'W, 188-69'}]);
// A plain dual with no team stays unread as a team result ("W, 253-33").
assert.deepEqual(swimDualScores('W, 253-33'),[]);

// The port names the target's mascot in its golf story pattern, the last
// catalog alias that is not "Lady ..." (UAB's "Alabama-Birmingham" comes
// before "Blazers"; Liberty's "Lady Flames" after "Flames"). Mutation:
// without the reverse or the "Lady" filter the wrong word is the mascot.
const port=read('../scripts/port-handlers.mjs');
assert.match(port,/\.reverse\(\)\.find\(/);
assert.match(port,/!\/\^Lady\\b\/\.test\(w\)/);
assert.match(read('../src/schools/delaware.mjs'),/team:"\(\?:Blue Hens\|Delaware\|/);
assert.match(read('../src/schools/uab.mjs'),/team:"\(\?:Blazers\|UAB\|/);

// TFRRS shortens "International" (FIU: FL_college_f_Florida_Intl).
assert.match(read('../scripts/start-schools.mjs'),/International\\b\/g,'Intl'/);

// Conference USA games by membership: "Jax State", "MTSU", "NMSU", "Western
// Ky.", "Sam Houston State", "Fla. International", "Kennesaw". The league sponsors no field
// hockey or lacrosse (Delaware's and Liberty's play elsewhere).
const schools=JSON.parse(read('../src/schools.json'));
assert.deepEqual(schools.filter(s=>s.conference==='Conference USA').map(s=>s.id).sort(),['delaware','fiu','jacksonville-state','kennesaw-state','liberty','middle-tennessee','missouri-state','new-mexico-state','sam-houston','western-kentucky']);
const {markConferenceGames}=createConferenceGames({schools});
const liberty=schools.find(s=>s.id==='liberty');
const games=markConferenceGames(['Jax State','MTSU','NMSU','Western Ky.','Sam Houston State','Fla. International','Kennesaw','Virginia Tech'].map((opponent,i)=>({sport:'Volleyball',opponent,status:'Final',start_time:`2026-10-${String(i+1).padStart(2,'0')}T18:00:00Z`,title:`Liberty vs ${opponent}`})),'',liberty);
assert.deepEqual(games.map(g=>g.conference_game),[true,true,true,true,true,true,true,false]);
console.log('Conference USA shared checks passed');
