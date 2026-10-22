// Shared rules found onboarding the WCC (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const team="(?:Broncos|Santa Clara|(?:Men's|Women's) Golf)";

// A golf story's headline "Broncos Capture Bomb Darts Birds Collegiate" is
// the team's win; "As a team, the Broncos ... secure a third-place finish"
// is its place (Santa Clara, Sep 8 and Sep 15; the cards publish none).
// Mutation: without each form the final reads "Completed".
assert.equal(golfStoryPlace(fixture('santa-clara-module/recap-2026-9-8-mens-golf-broncos-capture-bomb-darts-bir.html.gz'),{team}),'1st');
assert.equal(golfStoryPlace(fixture('santa-clara-module/recap-2026-9-15-mens-golf-nielsen-finishes-runner-up-at-.html.gz'),{team}),'3rd');
// "Capture" followed by a place or an individual honor is not a team win.
assert.equal(golfStoryPlace('<meta property="og:title" content="Broncos Capture Third Place at Wolf Run">',{team}),null);

// TFRRS shortens "Saint" (Saint Mary's: CA_college_f_St_Marys_CA).
assert.match(read('../scripts/start-schools.mjs'),/\\bSaint\\b\/g,'St'/);

// WCC games by membership: "Saint Mary's (Calif.)", "St. Mary's", "USF"
// (San Francisco, not South Florida), "Seattle", "LMU". Mutation: without
// the names these games leave the record.
const schools=JSON.parse(read('../src/schools.json'));
assert.deepEqual(schools.filter(s=>s.conference==='WCC').map(s=>s.id).sort(),['denver','lmu','pacific','pepperdine','portland','saint-marys','san-diego','san-francisco','santa-clara','seattle-u']);
const {markConferenceGames}=createConferenceGames({schools});
const portland=schools.find(s=>s.id==='portland');
const games=markConferenceGames(["Saint Mary's (Calif.)","St. Mary's",'USF','Seattle','Loyola Marymount','Oregon State'].map((opponent,i)=>({sport:'Volleyball',opponent,status:'Final',start_time:`2026-10-${String(i+1).padStart(2,'0')}T18:00:00Z`,title:`Portland vs ${opponent}`})),'',portland);
assert.deepEqual(games.map(g=>g.conference_game),[true,true,true,true,true,false]);
console.log('WCC shared checks passed');
