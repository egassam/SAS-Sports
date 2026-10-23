// Shared rules found onboarding the MEAC (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// The MEAC sponsors no baseball: its members' baseball pages mark NEC games.
assert.match(read('../src/conference-games.mjs'),/'MEAC':new Set\(\['Baseball','Lacrosse',/);
for(const id of ['coppin-state','delaware-state','maryland-eastern-shore','norfolk-state'])assert.match(read(`../src/schools/${id}.mjs`),/'Baseball':'NEC'/);

// A story headline in a meet's result line is no result (NC Central's
// adidas Challenge, Sep 18): the meet keeps "Completed" and its story.
assert.match(read('../src/schools/nc-central.mjs'),/\/\\b\(\?:wins\?\|stays\?\|leads\?\|claims\?\|takes\?\|sets\?\|paces\?\|earns\?\)\\b\/i\.test\(text\)\)return;/);

// A team that did not race ("DNP") has no event (UMES men, Sep 5); a meet
// named by its host takes TFRRS's name ("Delaware State University Sting
// Invite").
const umes=read('../src/schools/maryland-eastern-shore.mjs');
assert.match(umes,/games=games\.filter\(game=>!\/\^DNP\$\/i\.test/);
assert.match(umes,/createTeamTfrrsMeetResults\(\{id:'maryland-eastern-shore',schoolName:'Maryland Eastern Shore',hostMeetName:true,/);
assert.match(umes,/teamLabels:\{'\/sports\/wot\/schedule':"Women's",'\/sports\/mot\/schedule':"Men's"\}/);

console.log('MEAC shared checks passed');
