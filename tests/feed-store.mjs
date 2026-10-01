// Scheduled feed refresh: visitors are served the stored copy and cause no
// school downloads; the Cron Trigger keeps viewed feeds fresh; previews and
// production never share copies. Drives the store directly, then the
// Worker's real feed route and scheduled handler with in-memory KV and cache.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createFeedStore,isHotFeed,FEED_STORE} from '../src/feed-store.mjs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';

class MemoryKV{
  constructor(){this.entries=new Map();this.puts=0;this.lists=0}
  async getWithMetadata(key){const e=this.entries.get(key);return e?{value:e.value,metadata:e.metadata}:{value:null,metadata:null}}
  async put(key,value,{metadata=null}={}){this.puts++;this.entries.set(key,{value:String(value),metadata})}
  async list({prefix=''}={}){this.lists++;return{keys:[...this.entries].filter(([k])=>k.startsWith(prefix)).map(([name,e])=>({name,metadata:e.metadata})),list_complete:true}}
  keys(prefix){return[...this.entries.keys()].filter(k=>k.startsWith(prefix))}
}
const MIN=60*1000;

// 1. Store: copies are served only while recent enough for their kind.
{
  const clock={t:Date.parse('2026-10-01T18:00:00Z')},kv=new MemoryKV();
  const store=createFeedStore({kv,version:'v1',now:()=>clock.t});
  const cool=[{live:[],results:[],upcoming:[{priority_bucket:'upcoming'}],other:[]}],hot=[{live:[],results:[],upcoming:[{priority_bucket:'today'}],other:[]}];
  assert.equal(isHotFeed(cool),false);assert.equal(isHotFeed(hot),true);assert.equal(isHotFeed([{live:[{}]}]),true);
  await store.write('utah','Football','[1]',cool);await store.write('kstate','Soccer','[2]',hot);
  assert.equal((await store.read('utah','Football')).body,'[1]');
  assert.equal(await store.read('utah','Golf'),null);
  clock.t+=FEED_STORE.hotServeMs+1;
  assert.equal(store.servable(await store.read('kstate','Soccer')),false,'a hot copy goes stale after 5 min');
  assert.equal(store.servable(await store.read('utah','Football')),true);
  clock.t+=FEED_STORE.coolServeMs;
  assert.equal(store.servable(await store.read('utah','Football')),false,'a cool copy goes stale after 45 min');
}

// 2. Store: the Cron Trigger refreshes viewed feeds that are due, oldest first, at most perRun.
{
  const clock={t:Date.parse('2026-10-01T18:00:00Z')},kv=new MemoryKV();
  const store=createFeedStore({kv,version:'v1',now:()=>clock.t,settings:{...FEED_STORE,perRun:2}});
  const hot=[{live:[{}]}],cool=[{live:[]}];
  await store.write('a','Hot',`[]`,hot);clock.t+=1000;await store.write('b','Cool','[]',cool);await store.write('c','Unviewed','[]',cool);
  for(const[school,sport]of[['a','Hot'],['b','Cool'],['d','Missing']])await store.noteView(school,sport);
  assert.deepEqual((await store.due()).map(f=>f.school),['d'],'only a missing copy is due right away');
  clock.t+=FEED_STORE.hotEveryMs;
  assert.deepEqual((await store.due()).map(f=>f.school),['d','a'],'hot copies are due every 2 min; perRun caps the batch');
  clock.t+=FEED_STORE.coolEveryMs;
  assert.deepEqual((await store.due()).map(f=>`${f.school}|${f.hot}`),['d|false','a|true']);
  assert.ok(!(await store.due()).some(f=>f.school==='c'),'feeds nobody viewed are never refreshed');
  clock.t+=FEED_STORE.wantedForMs;
  assert.deepEqual(await store.due(),[],'refreshing stops 6 h after the last view');
  await store.noteRun({due:0,built:0,failed:0});
  const status=await store.status();
  assert.equal(status.last_run.built,0);assert.equal(status.viewed_feeds,0);assert.equal(status.stored_feeds,3);
}

// 3. Store: one location records a view at most every 10 min.
{
  const kv=new MemoryKV(),cacheStore=new Map();
  const cache={async match(r){return cacheStore.get(r.url)},async put(r,res){cacheStore.set(r.url,res)}};
  const store=createFeedStore({kv,version:'v1',cache:()=>cache,cacheOrigin:()=>'https://sas.test'});
  assert.equal(await store.noteView('utah','Football'),true);
  for(let i=0;i<20;i++)assert.equal(await store.noteView('utah','Football'),false);
  assert.equal(kv.puts,1,'twenty more views cost no KV writes');
}

// 4. Without a KV binding everything is a no-op (Node tests, previews without one).
{
  const store=createFeedStore({kv:undefined,version:'v1'});
  assert.equal(await store.read('utah','Football'),null);assert.equal(await store.write('utah','Football','[]',[]),false);
  assert.deepEqual(await store.due(),[]);assert.deepEqual(await store.status(),{enabled:false});
}

// 5. The Worker: visitors are served the stored copy, the Cron Trigger rebuilds it.
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const footballPage=gunzipSync(readFileSync(new URL('./fixtures/utah-module/football-schedule.html.gz',import.meta.url))).toString('utf8');
class MemoryCache{
  constructor(){this.store=new Map()}
  async match(request){const hit=this.store.get(String(request.url??request));return hit?hit.clone():undefined}
  async put(request,response){this.store.set(String(request.url??request),response.clone())}
  clearFeeds(){for(const k of[...this.store.keys()])if(k.includes('/__sas_cache/feed'))this.store.delete(k)}
}
const cache=new MemoryCache();
let upstreamUp=true,upstreamRequests=0;
const fetch=async url=>{
  upstreamRequests++;
  if(!upstreamUp)throw Error('upstream down');
  if(String(url)==='https://utahutes.com/sports/football/schedule')return new Response(footballPage,{status:200,headers:{'content-type':'text/html'}});
  return new Response('not found',{status:404});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={createSourceFetch,SOURCE_TTL,createFeedStore,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch,caches:{default:cache}};
const {handler,VERSION}=Function(...Object.keys(deps),source+';return {handler,VERSION};')(...Object.values(deps));
const kv=new MemoryKV(),env={FEEDS:kv},waits=[];
const ctx={waitUntil(p){waits.push(p)}};
const settle=async()=>{await Promise.all(waits.splice(0))};
const PROD='https://sas-sports.lovetogivepain.workers.dev',PREVIEW='https://my-branch-sas-sports.lovetogivepain.workers.dev';
const call=async(origin,query='')=>{const r=await handler.fetch(new Request(`${origin}/live/feed/grouped?school=utah&sport=Football${query}`),env,ctx);await settle();return r};
const feedKey=`feed|prod|${VERSION}|utah|Football`,wantKey=`want|prod|${VERSION}|utah|Football`;

// First view: nothing stored, so it is built on request, stored, and the view noted.
const first=await call(PROD);
assert.equal(first.status,200);assert.equal(first.headers.get('x-sas-cache'),'live');
const body=await first.text();
assert.equal(kv.entries.get(feedKey).value,body,'the stored copy is the exact feed');
assert.ok(kv.entries.has(wantKey),'the view is noted for the Cron Trigger');

// Later views at any location: the stored copy, with no school download, even when the school is down.
cache.clearFeeds();upstreamUp=false;let before=upstreamRequests;
for(let i=0;i<5;i++){
  const r=await call(PROD);cache.clearFeeds();
  assert.equal(r.status,200);assert.equal(r.headers.get('x-sas-cache'),'stored');assert.equal(await r.text(),body);
  assert.ok(Date.parse(r.headers.get('x-sas-fetched-at'))<=Date.now(),'the stored copy carries its build time');
}
assert.equal(upstreamRequests,before,'visitors cause no school downloads');
upstreamUp=true;

// The Cron Trigger: nothing due while the copy is fresh; an overdue copy is rebuilt.
before=upstreamRequests;
await handler.scheduled({},env,ctx);
assert.equal(upstreamRequests,before,'a fresh copy is not rebuilt');
const runKey=`cron|prod|${VERSION}`;
assert.deepEqual({...kv.entries.get(runKey).metadata,t:0,ms:0},{due:0,built:0,failed:0,t:0,ms:0});
const entry=kv.entries.get(feedKey);entry.metadata={...entry.metadata,b:Date.now()-FEED_STORE.coolEveryMs-MIN};
await handler.scheduled({},env,ctx);
assert.ok(upstreamRequests>before,'an overdue copy is rebuilt from the school');
assert.ok(Date.now()-kv.entries.get(feedKey).metadata.b<MIN,'and stored again');
assert.equal(kv.entries.get(runKey).metadata.built,1);

// A copy the Cron Trigger let go stale is not served; the visitor rebuilds as before.
kv.entries.get(feedKey).metadata.b=Date.now()-FEED_STORE.coolServeMs-MIN;cache.clearFeeds();
const overdue=await call(PROD);
assert.equal(overdue.headers.get('x-sas-cache'),'live');

// Forced refreshes (refresh button, health check) rebuild and store, but are not counted as views.
kv.entries.delete(wantKey);
assert.equal((await call(PROD,'&refresh=1')).headers.get('x-sas-cache'),'live');
assert.ok(!kv.entries.has(wantKey),'forced refreshes do not keep a feed refreshing');

// Previews keep their own copies and never touch production keys.
const prodKeys=JSON.stringify([...kv.entries.keys()].filter(k=>k.includes('|prod|')).sort());
cache.clearFeeds();await call(PREVIEW);
assert.ok(kv.entries.has(`feed|preview|${VERSION}|utah|Football`));
assert.equal(JSON.stringify([...kv.entries.keys()].filter(k=>k.includes('|prod|')).sort()),prodKeys);

// Without a KV binding the route behaves exactly as before.
cache.clearFeeds();
const plain=await handler.fetch(new Request(`${PROD}/live/feed/grouped?school=utah&sport=Football`),{},ctx);
assert.equal(plain.headers.get('x-sas-cache'),'live');
const untimed=text=>text.replace(/"(updated_at|last_verified_at)":"[^"]*"/g,'');
assert.equal(untimed(await plain.text()),untimed(body),'same feed apart from build times');

// Status endpoint.
const status=await (await handler.fetch(new Request(`${PROD}/api/feed-store`),env,ctx)).json();
assert.equal(status.enabled,true);assert.equal(status.scope,'prod');assert.equal(status.last_run.built,1);

// Configuration: the binding and the every-minute trigger are deployed.
const wrangler=read('../wrangler.jsonc');
assert.match(wrangler,/"binding":\s*"FEEDS"/);assert.match(wrangler,/"crons":\s*\["\* \* \* \* \*"\]/);
console.log('Feed store checks passed: visitors are served stored copies with no school downloads, the Cron Trigger rebuilds only viewed and overdue feeds, stale copies fall back to a rebuild, previews stay separate.');
