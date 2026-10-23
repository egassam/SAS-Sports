// Shared rules found onboarding the Missouri Valley (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfPlacing,golfStoryMatchPlay} from '../src/sidearm-school-kit.mjs';
import {classicHtmlScheduleGames} from '../src/sidearm-schedule-data.mjs';
import {isSidearmSplash} from '../scripts/onboard-school.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');

// A golf dual told only by its story (Evansville and USI's Battle of the
// Expressway, Oct 22: "The Screaming Eagles defeated the Purple Aces 9 ½ -
// 4 ½"). Mutation: without golfStoryMatchPlay the final reads "Completed".
const evansville="(?:Purple Aces|Evansville|(?:Men's|Women's) Golf)",decode=value=>String(value||'').replace(/&#189;|&frac12;/g,'½').replace(/&nbsp;|&#160;/g,' ');
assert.deepEqual(golfStoryMatchPlay(fixture('evansville-module/recap-2026-10-22-mens-golf-ue-golf-completes-battle-of-th.html.gz'),{team:evansville,decode}),{headline:'Match play: 0-1',results:[{label:'Result',value:'L, 4.5-9.5'}]});
assert.deepEqual(golfStoryMatchPlay('<p>The Purple Aces defeated USI 9 ½ - 4 ½.</p>',{team:evansville}),{headline:'Match play: 1-0',results:[{label:'Result',value:'W, 9.5-4.5'}]});
assert.equal(golfStoryMatchPlay('<p>The Purple Aces finished fifth of 12 teams.</p>',{team:evansville}),null);
const kit=read('../src/sidearm-school-kit.mjs');
assert.match(kit,/else\{const dual=raw&&golfStoryMatchPlay\(raw,\{team,decode:decodeHtml\}\)/);

// Valparaiso's bowling places carry the match record: "9th/18 (2-3)".
// Mutation: without the record the place is not read at all.
assert.equal(golfPlacing('9th/18 (2-3)'),'9th of 18 (2-3)');
assert.equal(golfPlacing('11th/18 (6-7)'),'11th of 18 (6-7)');
assert.equal(golfPlacing('1st of 16 (280-277-204=835)'),'1st of 16');
assert.equal(golfPlacing('T-3rd (844) / 15'),'T3rd of 15');

// A classic SIDEARM tournament header names the course and town after bars
// (Illinois State: "Purdue Fall Invitational | Kampen-Cosler Course | West
// Lafayette, Ind."). Mutation: without the split the meet's name keeps them.
const isu=classicHtmlScheduleGames(fixture('illinois-state-module/mens-golf-schedule.html.gz'));
assert.ok(isu.some(game=>game.tournament?.title==='Purdue Fall Invitational'));
assert.ok(!isu.some(game=>/\|/.test(game.tournament?.title||'')));

// Belmont's homepage is a landing page without the splash.aspx link and
// without one sport link: a splash page. A page with sport links is not.
assert.equal(isSidearmSplash(fixture('belmont-module/stunt-schedule.html.gz')),true);
assert.equal(isSidearmSplash(fixture('belmont-module/womens-volleyball-schedule.html.gz')),false);

// Belmont's STUNT schedule (no season published) answers with the homepage:
// a valid empty schedule, not a failed source. Another sport's homepage
// answer is not.
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const belmont=schools.find(s=>s.id==='belmont');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch:async url=>{throw Error(`Unexpected network request: ${url}`);}};
const worker=Function(...Object.keys(deps),source+';return {parseHtml,compactScheduleHtml,belmontHandlers};')(...Object.values(deps));
const homepage=fixture('belmont-module/stunt-schedule.html.gz'),url='https://belmontbruins.com/sports/stunt/schedule';
const stunt=worker.parseHtml(worker.compactScheduleHtml(homepage,url),belmont,'STUNT',url);
assert.deepEqual(stunt,[]);
assert.equal(worker.belmontHandlers.isEmptySchedule(stunt),true);
const baseball=worker.parseHtml(worker.compactScheduleHtml(homepage,url),belmont,'Baseball',url);
assert.equal(worker.belmontHandlers.isEmptySchedule(baseball),false);

// A read schedule whose every event the listing rules drop (George Mason's
// six storyless tennis tournaments, Oct 23) is an empty schedule, not a
// failed source (the Worker answered 502).
assert.match(read('../src/index.js'),/if\(successful\.length\)return\{events:\[\],source_url:successful\[0\]\.url/);

// Onboarding: a generic route that is the homepage moves to the team pages
// (Evansville cross country), and a sport left with none is named.
const fixtures=read('../scripts/fetch-school-fixtures.mjs');
assert.match(fixtures,/if\(!kept&&!template&&generic\)template=generic;/);
assert.match(fixtures,/NO SCHEDULE PAGE among the routes/);
assert.match(read('../scripts/start-schools.mjs'),/filter\(l=>\/NO SCHEDULE PAGE\/\.test\(l\)\)/);
// set-sport-routes keeps a sport's critical and profile-card marks on set.
assert.match(read('../scripts/set-sport-routes.mjs'),/op==='remove'\?\['athlete_sports','critical_sports','athlete_profile_fallback_sports'\]:\['athlete_sports'\]/);

console.log('Missouri Valley shared checks passed');
