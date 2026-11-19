// Kansas tonight (user, November 18, 2026: item 7 of "What unique things
// should we add now?"): every middle or high school game of today, grouped by
// county, from the saved feed copies.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {tonightGames,tonightCounties,TONIGHT_LEVELS} from '../src/kansas-tonight.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const ev=(id,extra)=>({id,event_type:'GAME',sport:'Football',status:'Upcoming',title:id,start_time:'2026-11-20T19:00:00.000Z',display_time:'Nov 20, 7:00 PM',...extra});
const manhattan={id:'manhattan-ks',name:'Manhattan High School',short_name:'Manhattan',county:'Riley County'};
const groups=[{live:[],upcoming:[ev('Manhattan at Derby'),ev('Manhattan vs Next Week',{start_time:'2026-11-27T19:00:00.000Z'})],results:[ev('Manhattan vs Maize',{status:'Final',start_time:'2026-11-13T19:00:00.000Z',school_score:'28',opponent_score:'24',headline:'W, 28-24'})]}];
const games=tonightGames(groups,{today:'2026-11-20',school:manhattan});
assert.deepEqual(games.map(g=>[g.title,g.school,g.county,g.status]),[['Manhattan at Derby','Manhattan','Riley County','Upcoming']],'today only');
// A tournament over several days is today on each of its days.
assert.equal(tonightGames([{upcoming:[ev('Tournament',{start_time:'2026-11-19T12:00:00.000Z',end_time:'2026-11-21T23:59:00.000Z'})]}],{today:'2026-11-20',school:manhattan}).length,1);
// Counties A to Z; within one, live first, then by start, then finals.
const list=[
  {...games[0],county:'Riley County',school:'Manhattan',status:'Final',start_time:'2026-11-20T19:00:00.000Z'},
  {...games[0],county:'Riley County',school:'Riley County',status:'Live',start_time:'2026-11-20T19:00:00.000Z'},
  {...games[0],county:'Geary County',school:'Junction City',status:'Upcoming',start_time:'2026-11-20T18:00:00.000Z'}];
const counties=tonightCounties(list);
assert.deepEqual(counties.map(c=>[c.county,c.live,c.games.map(g=>g.school)]),[['Geary County',0,['Junction City']],['Riley County',1,['Riley County','Manhattan']]]);
assert.ok(TONIGHT_LEVELS.has('high-school')&&TONIGHT_LEVELS.has('middle-school')&&!TONIGHT_LEVELS.has('college'));

// Through the Worker: Manhattan's saved football copy answers; nothing is read.
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
class MemoryCache{constructor(){this.store=new Map()}async match(r){const hit=this.store.get(String(r.url??r));return hit?hit.clone():undefined}async put(r,res){this.store.set(String(r.url??r),res.clone())}}
const cache=new MemoryCache();let reads=0;
const fetch=async()=>{reads++;return new Response('',{status:404})};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch,caches:{default:cache}};
const {handler,feedCacheKey}=Function(...Object.keys(deps),source+';return {handler,feedCacheKey};')(...Object.values(deps));
const origin='https://sas.example',RealDate=Date,at=new RealDate('2026-11-21T01:30:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
try{
  const copy=[{school_id:'manhattan-ks',school:'Manhattan High School',sport:'Football',live:[ev('Manhattan at Derby',{status:'Live',school_score:'14',opponent_score:'7',recency_label:'Q2 3:12'})],upcoming:[],results:[],other:[]}];
  await cache.put(feedCacheKey(new URL(`${origin}/live/feed/grouped?school=manhattan-ks&sport=Football`),'manhattan-ks','Football'),new Response(JSON.stringify(copy),{headers:{'content-type':'application/json','x-sas-fetched-at':new Date().toISOString()}}));
  const r=await handler.fetch(new Request(`${origin}/live/tonight?level=high-school`),{},{waitUntil(){}});
  assert.equal(r.status,200);
  const d=await r.json();
  assert.equal(d.date,'2026-11-20','Kansas evening: still Nov 20');
  assert.ok(d.feeds>50,'every high school in-season feed is looked up');
  assert.equal(d.live,1);
  const riley=d.counties.find(c=>c.county==='Riley County');
  assert.deepEqual(riley.games.map(g=>[g.title,g.status,g.live,g.school_score]),[['Manhattan at Derby','Live','Q2 3:12','14']]);
  assert.equal(reads,0,'no source is read');
  assert.equal((await handler.fetch(new Request(`${origin}/live/tonight?level=college`),{},{waitUntil(){}})).status,400);
}finally{globalThis.Date=RealDate}

// The page: a Tonight tab for the middle and high school levels.
const html=read('../public/index.html');
assert.match(html,/data-view="tonight"[^>]*hidden>Tonight</);
assert.match(html,/function renderTonight\(\)/);
console.log('kansas-tonight: ok');
