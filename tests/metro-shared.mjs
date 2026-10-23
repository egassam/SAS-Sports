// Shared rules found onboarding the Metro Conference (the MAAC's 2026-27
// name, as its members' pages mark it), Oct 23.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const catalog=JSON.parse(read('../src/schools.json'));

// The members carry the league's current name.
assert.deepEqual(catalog.filter(s=>s.conference==='Metro Conference').map(s=>s.id).sort(),['canisius','fairfield','iona','manhattan','marist','merrimack','mount-st-marys','niagara','quinnipiac','rider','sacred-heart','saint-peters','siena']);
assert.match(read('../src/conference-games.mjs'),/'Metro Conference':new Set\(\['Football','Wrestling','Hockey','Fencing','Gymnastics','Field Hockey'/);

// Its tournaments ("Metro Championship (First Round)", "Metro First Round",
// "2026 Metro Men's Basketball Championships") are events, "at".
for(const id of ['manhattan','mount-st-marys'])assert.match(read(`../src/schools/${id}.mjs`),/\|\^\(\?:\\d\{4\} \)\?metro\\b\/i\.test/);

// Mount St. Mary's bowling: "8-1, Third Place" -> "3rd (8-1)".
assert.match(read('../src/schools/mount-st-marys.mjs'),/if\(sport==='Bowling'\)\{\n\s*const m=text\.match\(\/\^\(\\d\{1,2\}-\\d\{1,2\}/);

// Leagues per team page: Fairfield men's lacrosse (CAA), Mount St. Mary's
// men's water polo (MAWPC), Sacred Heart women's hockey (NEWHA).
assert.match(read('../src/schools/fairfield.mjs'),/sport==='Lacrosse'&&\/\^\\\/sports\\\/mens-\/\.test\(url\?\.pathname\|\|''\)\?'CAA'/);
assert.match(read('../src/schools/sacred-heart.mjs'),/\?'NEWHA':'Atlantic Hockey America'/);

// Siena's acrobatics season is unpublished: its address answers with the
// homepage, read as an empty schedule (North Alabama's rule).
assert.match(read('../src/schools/siena.mjs'),/const unpublished=args\[2\]==='Acrobatics & Tumbling'/);

console.log('Metro Conference shared checks passed');
