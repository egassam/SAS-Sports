// Shared rules found onboarding the Horizon League (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {golfPlacing} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// Youngstown State's bowling writes the match record first ("1-2 / 4th of 18
// Teams", Chelsea Gilliam Penguin Classic); Valparaiso's last ("9th/18
// (2-3)"). A score is no record.
assert.equal(golfPlacing('1-2 / 4th of 18 Teams'),'4th of 18 (1-2)');
assert.equal(golfPlacing('9th/18 (2-3)'),'9th of 18 (2-3)');
assert.equal(golfPlacing('13th/20'),'13th of 20');
assert.equal(golfPlacing('1-2'),null);

// Leagues per team: men's lacrosse in the NEC, women's in the MAC (Detroit
// Mercy, Robert Morris); Purdue Fort Wayne's men's volleyball in the MIVA.
for(const id of ['detroit-mercy','robert-morris'])
  assert.match(read(`../src/schools/${id}.mjs`),/sport==='Lacrosse'\?\(\/\^\\\/sports\\\/womens-\/\.test\(url\?\.pathname\|\|''\)\?'MAC':'NEC'\)/);
assert.match(read('../src/schools/purdue-fort-wayne.mjs'),/\/\^\\\/sports\\\/mens-volleyball\\\/\/\.test\(url\?\.pathname\|\|''\)\?'MIVA'/);
assert.match(read('../src/schools/youngstown-state.mjs'),/'Football':'Missouri Valley Football Conference'/);

// The Horizon League sponsors no football, lacrosse, wrestling, hockey or
// rowing.
assert.match(read('../src/conference-games.mjs'),/'Horizon League':new Set\(\['Football','Lacrosse','Field Hockey','Wrestling','Gymnastics','Hockey','Rowing'/);

// Multi-day meets are one event: fencing championships (Cleveland State,
// Detroit Mercy), and Youngstown State's bowling days by the page's opponent
// record (the Nov 20 title reads "Jersey Jamboreee").
for(const id of ['cleveland-state','detroit-mercy'])
  assert.match(read(`../src/schools/${id}.mjs`),/sport==='Bowling'\|\|sport==='Fencing'\)return mergeMeetDays\(games\)/);
assert.match(read('../src/schools/youngstown-state.mjs'),/if\(sport==='Bowling'\)return mergeMeetDays\(games,\{name:game=>game\.opponent\?\.id!=null/);

console.log('Horizon League shared checks passed');
