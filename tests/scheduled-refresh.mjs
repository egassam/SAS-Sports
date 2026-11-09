// The scheduled refresh of middle and high school feeds (user, November 4,
// 2026: "Do the schedule refreshed"; src/scheduled-refresh.mjs). Batches walk
// the feed list, a run records every feed's result and reason, a pause stops
// the Cron Trigger's runs, and a run asked for on a branch preview keeps to
// the preview's own keys (never production's saved copies or record).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {REFRESH_BATCH,REFRESH_STATUS_KEY,REFRESH_PAUSE_KEY,refreshFeeds,nextBatch,nextStatus} from '../src/scheduled-refresh.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// Pure parts.
{
  const feeds=refreshFeeds([{id:'b',sports:{Volleyball:[],Football:[]}},{id:'a',sports:{Golf:[]}}]);
  assert.deepEqual(feeds,[{school:'b',sport:'Football'},{school:'b',sport:'Volleyball'},{school:'a',sport:'Golf'}]);
  assert.deepEqual(nextBatch(feeds,0,2),{batch:feeds.slice(0,2),cursor:2});
  assert.deepEqual(nextBatch(feeds,2,2),{batch:[feeds[2],feeds[0]],cursor:1},'wraps around');
  assert.deepEqual(nextBatch(feeds,7,5).batch.length,3,'never more than the list');
  assert.deepEqual(nextBatch([],4),{batch:[],cursor:0});
  const first=nextStatus(null,{at:'t1',version:'v',feeds:3,cursor:2,results:[{ok:true},{ok:false,error:'x'}]});
  assert.deepEqual([first.totals.runs,first.totals.built,first.totals.failed,first.totals.since,first.last_run.failed],[1,1,1,'t1',1]);
  const second=nextStatus(first,{at:'t2',version:'v',feeds:3,cursor:1,results:[{ok:true}]});
  assert.deepEqual([second.totals.runs,second.totals.built,second.totals.failed,second.totals.since],[2,2,1,'t1']);
  assert.equal(nextStatus(second,{at:'t3',version:'v',feeds:4,cursor:0,results:[]}).totals.runs,1,'a new feed list starts the counters again');
}

// The Worker, with a fake KV and every source answering 404 (each build fails
// and says why).
const kv=new Map(),writes=[];
const HIGHLIGHTS={
  async get(key,type){const v=kv.get(key);return v==null?null:type==='json'?JSON.parse(v):v},
  async getWithMetadata(key){return{value:kv.get(key)??null,metadata:null}},
  async put(key,value){writes.push(key);kv.set(key,value)},
  async delete(key){kv.delete(key)}
};
const store=new Map();
globalThis.caches={default:{async match(r){return store.get(typeof r==='string'?r:r.url)?.clone()||undefined},async put(r,res){store.set(typeof r==='string'?r:r.url,res)}}};
const fetch=async url=>({ok:false,status:404,url:String(url),headers:new Headers(),text:async()=>'',json:async()=>({})});
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {handler,runRefreshBatch,HIGH_SCHOOL_MODULES,PRODUCTION_HOST}')(...Object.values(deps));
const env={HIGHLIGHTS,SOURCE_FETCH_KEY:'secret'};
const all=refreshFeeds(worker.HIGH_SCHOOL_MODULES);
assert.ok(all.length>100,`middle and high school feeds: ${all.length}`);

{
  const status=await worker.runRefreshBatch(env,{size:3,gap:0});
  assert.equal(status.last_run.results.length,3);
  assert.deepEqual(status.last_run.results.map(r=>`${r.school}|${r.sport}`),all.slice(0,3).map(f=>`${f.school}|${f.sport}`));
  assert.ok(status.last_run.results.every(r=>r.ok===false&&r.error&&typeof r.ms==='number'),'each failure says why');
  assert.deepEqual([status.cursor,status.feeds,status.totals.runs,status.totals.failed],[3,all.length,1,3]);
  assert.ok(kv.has(REFRESH_STATUS_KEY),'production record');
  const next=await worker.runRefreshBatch(env,{size:2,gap:0});
  assert.deepEqual(next.last_run.results.map(r=>`${r.school}|${r.sport}`),all.slice(3,5).map(f=>`${f.school}|${f.sport}`),'the next batch');
  assert.equal(next.totals.runs,2);
}
// Paused: the scheduled run does nothing; a forced one still runs.
{
  kv.set(REFRESH_PAUSE_KEY,'now');
  assert.deepEqual(await worker.runRefreshBatch(env,{size:1,gap:0}),{skipped:'paused'});
  assert.equal((await worker.runRefreshBatch(env,{size:1,gap:0,force:true})).last_run.results.length,1);
  kv.delete(REFRESH_PAUSE_KEY);
}
// A branch preview's run keeps to its own record; production's is untouched.
{
  const before=kv.get(REFRESH_STATUS_KEY),host='ccr-x-sas-sports.lovetogivepain.workers.dev';
  await worker.runRefreshBatch(env,{size:1,gap:0,origin:`https://${host}`});
  assert.equal(kv.get(REFRESH_STATUS_KEY),before);
  assert.ok(kv.has(`${REFRESH_STATUS_KEY}|${host}`));
  assert.ok(writes.every(k=>!k.startsWith('feed:v2:prod|')),'no production copy written by these runs');
}
// The endpoints: the record is public; control needs the key and POST.
{
  const status=await (await worker.handler.fetch(new Request(`https://${worker.PRODUCTION_HOST}/api/refresh-status`),env,{waitUntil(){}})).json();
  assert.equal(status.batch,REFRESH_BATCH);assert.equal(status.feeds,all.length);assert.equal(status.paused,false);assert.ok(status.status.last_run);
  const control=(init,q='action=pause')=>worker.handler.fetch(new Request(`https://${worker.PRODUCTION_HOST}/api/refresh-control?${q}`,init),env,{waitUntil(){}});
  assert.equal((await control({method:'POST'})).status,401);
  assert.equal((await control({method:'GET',headers:{authorization:'Bearer secret'}})).status,401);
  assert.deepEqual(await (await control({method:'POST',headers:{authorization:'Bearer secret'}})).json(),{paused:true});
  assert.equal((await (await worker.handler.fetch(new Request(`https://${worker.PRODUCTION_HOST}/api/refresh-status`),env,{waitUntil(){}})).json()).paused,true);
  assert.deepEqual(await (await control({method:'POST',headers:{authorization:'Bearer secret'}},'action=resume')).json(),{paused:false});
}
// The Cron Triggers: the refresh every 10 minutes, wired to the run; push
// alerts every 2 minutes on their own trigger (tests/push-alerts.mjs).
assert.match(read('../wrangler.jsonc'),/"crons":\s*\["\*\/10 \* \* \* \*", "\*\/2 \* \* \* \*"\]/);
assert.ok(source.includes("if(event?.cron===PUSH_CRON){ctx.waitUntil(runPushAlerts(env).catch(()=>null));return}\n    ctx.waitUntil(runRefreshBatch(env).catch(()=>null));"));
{
  const ran=[];const runs={waitUntil:p=>ran.push(p)};
  await worker.handler.scheduled({cron:'*/2 * * * *'},{},runs);
  assert.deepEqual(await ran[0],{skipped:'not configured'},'the 2-minute trigger runs push alerts (off without keys), not the refresh');
}
console.log(`scheduled-refresh: ok (${all.length} feeds, ${REFRESH_BATCH} a run)`);
