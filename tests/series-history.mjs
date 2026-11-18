// Series history (user, November 18, 2026: item 3 of "What unique things
// should we add now?", rivalry pages). Fixture: K-State football's opponent
// history page data (kstatesports.com/sports/football/opponent-history,
// read through the Worker on Nov 18, 2026).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {parseOpponentHistory,seriesFor,seriesSummary,seriesNameKey,opponentHistoryUrl,seriesKey} from '../src/series-history.mjs';

const nuxt=gunzipSync(readFileSync(new URL('./fixtures/series-history/kstate-football-opponent-history-2026-11-18.nuxt.json.gz',import.meta.url))).toString('utf8');
const page=`<html><body><script type="application/json" id="__NUXT_DATA__" data-ssr="true">${nuxt}</script></body></html>`;
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));

const entries=parseOpponentHistory(page);
assert.equal(entries.length,142);
const ku=seriesFor(entries,['Kansas']);
assert.equal(ku.name,'University of Kansas');
assert.deepEqual([ku.record,ku.streak,ku.last10,ku.games,ku.first],[{wins:55,losses:64,ties:5},{wins:18,losses:0,ties:0},{wins:10,losses:0,ties:0},124,'1902-10-07']);
assert.deepEqual(ku.last[0],{date:'2026-10-17',result:'W',us:'35',them:'24',site:'home'});
assert.equal(ku.last.length,5);
assert.deepEqual(seriesSummary(ku,{school:'K-State',opponent:'Kansas'}),{record:'Kansas leads 64-55-5',streak:'K-State has won 18 straight',last10:'Last 10: 10-0',games:124,since:1902,last:ku.last});
// Exact names only: "Kansas State" is not Kansas; "Iowa St." is Iowa State.
assert.equal(seriesFor(entries,['Kansas State']),null);
assert.equal(seriesFor(entries,['Iowa St.']).name,'Iowa State University');
assert.equal(seriesNameKey('The University of Kansas'),'kansas');
assert.equal(seriesFor(entries,['Air Force']).record.wins,3);
// One meeting and a series led by the school.
const af=seriesSummary(seriesFor(entries,['Air Force']),{school:'K-State',opponent:'Air Force'});
assert.equal(af.record,'K-State leads 3-0');assert.equal(af.last10,null,'fewer than ten games: no last-ten line');
assert.deepEqual(parseOpponentHistory('<html></html>'),[]);
assert.equal(seriesSummary(null),null);
assert.equal(opponentHistoryUrl('https://www.kstatesports.com/sports/football/roster'),'https://www.kstatesports.com/sports/football/opponent-history');
assert.equal(opponentHistoryUrl('https://cyclones.com/sports/mens-basketball/schedule/2026-27'),'https://cyclones.com/sports/mens-basketball/opponent-history');

// Through the Worker: K-State football's coming game with Kansas carries the
// series; the page is read once and kept in KV.
let reads=0;
const fetch=async url=>{reads++;return String(url?.url||url)==='https://www.kstatesports.com/sports/football/opponent-history'?new Response(page,{status:200,headers:{'content-type':'text/html'}}):new Response('',{status:404});};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {attachSeries,catalogSchool}')(...Object.values(deps));
const kv=new Map(),env={HIGHLIGHTS:{get:async(k,t)=>kv.has(k)?(t==='json'?JSON.parse(kv.get(k)):kv.get(k)):null,put:async(k,v)=>{kv.set(k,v)}}};
const kstate=worker.catalogSchool('kstate');
const game=(opponent,extra={})=>({id:opponent,event_type:'GAME',status:'Upcoming',opponent,...extra});
const groups=[{sport:'Football',live:[],upcoming:[game('Kansas'),game('Iowa State'),game('Kansas State Alumni')],results:[{...game('Arizona'),status:'Final'}]}];
await worker.attachSeries(groups,kstate,'Football',env);
assert.equal(groups[0].upcoming[0].series.record,'Kansas leads 64-55-5');
assert.equal(groups[0].upcoming[0].series.source.url,'https://www.kstatesports.com/sports/football/opponent-history');
assert.ok(groups[0].upcoming[1].series.record);
assert.equal(groups[0].upcoming[2].series,undefined,'an unknown opponent has none');
assert.equal(groups[0].results[0].series,undefined,'finals are not given one');
assert.ok(kv.has(seriesKey('kstate','Football')));
const before=reads;
await worker.attachSeries([{sport:'Football',live:[],upcoming:[game('Kansas')],results:[]}],kstate,'Football',env);
assert.equal(reads,before,'kept in KV: no new read');
// A high school and a pro team: none.
const hs=[{sport:'Football',live:[],upcoming:[game('Topeka')],results:[]}];
await worker.attachSeries(hs,worker.catalogSchool('manhattan-ks'),'Football',env);
assert.equal(hs[0].upcoming[0].series,undefined);

// The page: a coming card's series line, the next game's last meetings.
const html=read('../public/index.html');
assert.match(html,/function seriesBlock\(e,full\)/);
assert.match(html,/\$\{count\}\$\{seriesBlock\(e,true\)\}/);
console.log(`series-history: ok (K-State football ${entries.length} opponents; Kansas ${ku.games} games)`);
