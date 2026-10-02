// Verified finished events are kept in Workers KV for 30 days, so the AI
// writes each final's highlights once. Drives the Worker's real
// /live/highlights route with in-memory stand-ins for KV, the cache and the AI.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ucf-module/'+name,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const pages=new Map([
  ['https://ucfknights.com/sports/football/schedule',fixture('football-schedule.html.gz')],
  ['https://ucfknights.com/news/2026/09/27/football-opens-big-12-play-with-21-13-win-over-tcu',fixture('recap-2026-09-26-tcu.html.gz')]
]);
let upstream=0;
const fetch=async url=>{
  url=String(url);
  if(url.startsWith('https://site.api.espn.com/'))return new Response('{"events":[]}',{status:200,headers:{'content-type':'application/json'}});
  upstream++;
  return pages.has(url)?new Response(pages.get(url),{status:200,headers:{'content-type':'text/html'}}):new Response('not found',{status:404});
};
class MemoryCache{constructor(){this.store=new Map();}async match(r){const hit=this.store.get(String(r.url??r));return hit?hit.clone():undefined;}async put(r,res){this.store.set(String(r.url??r),res.clone());}}
const caches={default:new MemoryCache()};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches};
const {handler,highlightStoreKey,HIGHLIGHT_STORE_TTL}=Function(...Object.keys(deps),source+';return {handler,highlightStoreKey,HIGHLIGHT_STORE_TTL};')(...Object.values(deps));

class MemoryKV{
  constructor(){this.map=new Map();this.puts=[];}
  async get(key,type){const value=this.map.get(key);return value==null?null:type==='json'?JSON.parse(value):value;}
  async put(key,value,options){this.puts.push({key,options});this.map.set(key,value);}
}
let aiCalls=0,aiDown=false;
const AI={run:async()=>{aiCalls++;if(aiDown)throw Error('Highlight generation timed out');return{response:JSON.stringify(['UCF forced a fumble on the third play of the game.','The Knights scored on a short field after the turnover.','UCF held TCU scoreless in the fourth quarter.','The Knights closed out a 21-13 win at home.'])};}};
const id='live-ucf-football-sep-26-2026-tcu-final';
const open=async(env,waits=[])=>{
  const response=await handler.fetch(new Request(`https://sas-sports.example/live/highlights?school=ucf&sport=Football&event_id=${id}`),env,{waitUntil:p=>waits.push(p)});
  await Promise.all(waits);
  return{response,body:await response.json()};
};

// 1. First open: built live, the AI writes the highlights once, and the
//    verified final is stored for 30 days.
const kv=new MemoryKV();
let first=await open({AI,HIGHLIGHTS:kv});
assert.equal(first.response.headers.get('x-sas-highlights'),'live');
assert.equal(first.body.highlight_state,'recap_generated');assert.equal(first.body.highlights.length,4);
assert.equal(aiCalls,1);
assert.deepEqual(kv.puts.map(p=>[p.key,p.options.expirationTtl]),[[highlightStoreKey('ucf','Football',id),HIGHLIGHT_STORE_TTL]]);
assert.equal(HIGHLIGHT_STORE_TTL,30*24*60*60);
// 2. Every later open, from any location: the stored copy, with no AI call
//    and no school download.
const before=upstream;
for(let i=0;i<3;i++){
  const again=await open({AI:{run:async()=>{throw Error('AI must not run');}},HIGHLIGHTS:kv});
  assert.equal(again.response.headers.get('x-sas-highlights'),'stored');
  assert.deepEqual(again.body,first.body);
  assert.equal(again.response.headers.get('cache-control'),'no-store, no-cache, must-revalidate');
}
assert.equal(upstream,before,'no school page is downloaded for a stored final');
assert.equal(kv.puts.length,1);
// 3. An AI timeout is answered as before but never stored, so the next open
//    asks again and stores the good answer.
const kv2=new MemoryKV();aiDown=true;
const failed=await open({AI,HIGHLIGHTS:kv2});
assert.equal(failed.body.highlight_state,'ai_failed');assert.equal(kv2.puts.length,0,'an unverified answer is never stored');
aiDown=false;
const retried=await open({AI,HIGHLIGHTS:kv2});
assert.equal(retried.response.headers.get('x-sas-highlights'),'live');assert.equal(retried.body.highlight_state,'recap_generated');assert.equal(kv2.puts.length,1);
// 4. Without the store (or if it fails) the route works exactly as before.
const plain=await open({AI});
assert.equal(plain.body.highlight_state,'recap_generated');
const broken={get:async()=>{throw Error('KV down');},put:async()=>{throw Error('KV down');}};
const resilient=await open({AI,HIGHLIGHTS:broken});
assert.equal(resilient.response.status,200);assert.equal(resilient.body.highlight_state,'recap_generated');
// 5. A stored entry that is not a verified final is ignored.
const kv3=new MemoryKV();kv3.map.set(highlightStoreKey('ucf','Football',id),JSON.stringify({...first.body,highlights_verified:false,meet_results_verified:false}));
assert.equal((await open({AI,HIGHLIGHTS:kv3})).response.headers.get('x-sas-highlights'),'live');
// The binding is configured.
assert.match(read('../wrangler.jsonc'),/"binding": "HIGHLIGHTS", "id": "38280ef8508844459bbe14735e825d7a"/);
console.log('Stored highlight checks passed');
