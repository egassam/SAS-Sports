// Live high school games on Home for everyone (user, November 7, 2026: "Do
// both"): MaxPreps' Kansas football scores page saved at 8 PM on November 6,
// matched to the app's high schools by MaxPreps school id.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {maxprepsScoreboard} from '../src/high-school.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const html=gunzipSync(readFileSync(new URL('./fixtures/maxpreps-scores/ks-football-2026-11-06.html.gz',import.meta.url))).toString('utf8');
const fetch=async url=>{if(String(url).includes('/ks/football/scores/'))return new Response(html,{status:200});return new Response('',{status:404});};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches:{default:{match:async()=>undefined,put:async()=>{}}}};
const w=Function(...Object.keys(deps),source+';return {hsScoreboardEvents,hsLiveGames,HS_SCOREBOARDS};')(...Object.values(deps));

// The page: 74 games, 36 live; each team's MaxPreps school id from its mascot image.
const contests=maxprepsScoreboard(html);
assert.equal(contests.length,74);assert.equal(contests.filter(c=>c.live).length,36);
const mhs=contests.find(c=>c.id==='b1ac60a2-3a9a-4781-818a-1d77f144d06d');
assert.deepEqual([mhs.home.name,mhs.home.score,mhs.home.rank,mhs.home.schoolId,mhs.away.name,mhs.away.score,mhs.period],['Manhattan',22,10,'41006ce9-cfb3-492a-a951-d320637bc985','Garden City',7,'2nd Quarter']);

// The app's schools that were live, once each, with their own score first.
const games=w.hsScoreboardEvents(contests,w.HS_SCOREBOARDS[0],'2026-11-06');
assert.deepEqual(games.map(g=>g.school_id).sort(),['council-grove-ks','hayden-ks','lawrence-free-state-ks','manhattan-ks','riley-county-ks','rossville-ks','salina-central-ks','st-marys-ks','wamego-ks','washburn-rural-ks','washington-county-ks']);
const m=games.find(g=>g.school_id==='manhattan-ks');
assert.deepEqual([m.title,m.school_score,m.opponent_score,m.recency_label,m.status,m.level,m.sport],['Manhattan vs Garden City','22','7','2nd Quarter','Live','high-school','Football']);
const wr=games.find(g=>g.school_id==='washburn-rural-ks');
assert.deepEqual([wr.title,wr.school_score,wr.opponent_score],['Washburn Rural vs Maize','3','15'],'"vs": the page claims no home side');
assert.ok(games.every(g=>g.recap_url?.startsWith('https://www.maxpreps.com/ks/football/game/')));
// A game between two of the app's schools shows once.
const both={id:'x',live:true,period:'Q3',url:null,away:{schoolId:mhs.home.schoolId,name:'Manhattan',score:7},home:{schoolId:contests.find(c=>c.home.name==='Hayden'||c.away.name==='Hayden').home.name==='Hayden'?contests.find(c=>c.home.name==='Hayden').home.schoolId:contests.find(c=>c.away.name==='Hayden').away.schoolId,name:'Hayden',score:3}};
assert.equal(w.hsScoreboardEvents([both,both],w.HS_SCOREBOARDS[0],'2026-11-06').length,1);
// Through the reader: in November, football's page is read (and basketball's, which this stand-in does not have).
assert.equal((await w.hsLiveGames(new Date('2026-11-07T02:00:00Z'))).length,11);
console.log('hs-live-now: ok (MaxPreps state scores: 11 of the app\'s high schools live on Nov 6, by school id)');
