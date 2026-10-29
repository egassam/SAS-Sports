import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const worker=Function(...Object.keys(deps),source+';return {liveNowBoards,liveNowGames};')(...Object.values(deps));
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/'+name,import.meta.url))).toString('utf8'));

// Every live game on the home screen's "Everywhere" (user, Oct 28): each ESPN
// board read once, matched to the catalog. October reads the fall and winter
// boards and the NFL, MLB (postseason) and MLS; not lacrosse or softball.
const october=worker.liveNowBoards(new Date('2026-10-28T20:00:00Z')).map(b=>b.path);
for(const path of ['football/college-football','volleyball/womens-college-volleyball','soccer/usa.ncaa.w.1','soccer/usa.ncaa.m.1','basketball/mens-college-basketball','hockey/womens-college-hockey','football/nfl','baseball/mlb','soccer/usa.1'])assert.ok(october.includes(path),path);
for(const path of ['lacrosse/mens-college-lacrosse','baseball/college-softball','baseball/college-baseball'])assert.ok(!october.includes(path),path);
assert.equal(new Set(october).size,october.length,'each board once');

// College soccer, Oct 8: KU at K-State is one game, named by the home side.
const now=new Date('2026-10-08T23:47:00Z');
const soccer=worker.liveNowGames([{board:{path:'soccer/usa.ncaa.w.1',sport:'Soccer',team_label:"Women's",level:'college'},payload:fixture('soccer-espn-2026-10-08-live.json.gz'),url:'https://site.api.espn.com/x'}],now);
const ksu=soccer.filter(g=>/Kansas St|K-State|KU/.test(g.title));
assert.equal(ksu.length,1,'one card for one game');
assert.equal(ksu[0].school_id,'kstate');assert.equal(ksu[0].status,'Live');assert.equal(ksu[0].team_label,"Women's");
assert.ok(soccer.every(g=>g.status==='Live'&&g.level==='college'&&sponsoredSports[g.school_id].includes('Soccer')),'only live games of schools that play the sport');
assert.equal(new Set(soccer.map(g=>g.espn_event_id)).size,soccer.length,'each game once');
// Home colors each card (user, Oct 29: "The live boxes should have the team colors"):
// the school's own colors, the opponent's as ESPN publishes them.
assert.equal(ksu[0].school_colors.primary,teamThemes.kstate.primary,'the school\'s colors ride on the game');
assert.match(ksu[0].opponent_colors?.primary||'',/^#[0-9a-f]{6}$/i,'the opponent\'s ESPN color rides on the game');

// College football, Oct 3 (live payload): live games only, catalog schools only.
const football=worker.liveNowGames([{board:{path:'football/college-football',sport:'Football',level:'college'},payload:fixture('football-espn-2026-10-03-live.json.gz'),url:'https://site.api.espn.com/y'}],new Date('2026-10-04T01:00:00Z'));
assert.ok(football.length>0,'live college football games are found');
assert.ok(football.every(g=>g.sport==='Football'&&g.status==='Live'&&schools.some(s=>s.id===g.school_id&&(s.level||'college')==='college')));

// NFL: a league board names its own teams by ESPN abbreviation; the Chiefs'
// "Kansas City" is never the college Kansas City.
const team=(abbreviation,location,name,homeAway,score)=>({homeAway,score,team:{abbreviation,location,name,displayName:`${location} ${name}`,shortDisplayName:name}});
const nfl={events:[{id:'401',name:'Steelers at Chiefs',competitions:[{date:'2026-11-01T17:00Z',status:{type:{state:'in',shortDetail:'2nd 4:12'}},competitors:[team('KC','Kansas City','Chiefs','home','14'),team('PIT','Pittsburgh','Steelers','away','10')]}]},{id:'402',competitions:[{date:'2026-11-01T17:00Z',status:{type:{state:'pre'}},competitors:[team('BUF','Buffalo','Bills','home','0'),team('MIA','Miami','Dolphins','away','0')]}]}]};
const pro=worker.liveNowGames([{board:{path:'football/nfl',sport:'Football',level:'pro'},payload:nfl,url:'https://site.api.espn.com/z'}],new Date('2026-11-01T18:00:00Z'));
assert.deepEqual(pro.map(g=>[g.school_id,g.status,g.school_score,g.opponent_score,g.level]),[['kansas-city-chiefs','Live','14','10','pro']]);
console.log(`Live now: ${october.length} October boards; soccer ${soccer.length} live games, football ${football.length}, NFL 1 (home side named, each game once)`);
