// When a live rebuild fails, the feed must fall back to the last good copy,
// labeled as saved with its age, and cached=1 must answer from saved copies
// without rebuilding. Drives the Worker's real feed route with an in-memory
// stand-in for Cloudflare's per-location cache.
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
import {arizonaSchool,createArizonaHandlers} from '../src/schools/arizona.mjs';
import {baylorSchool,createBaylorHandlers} from '../src/schools/baylor.mjs';
import {cincinnatiSchool,createCincinnatiHandlers} from '../src/schools/cincinnati.mjs';
import {coloradoSchool,createColoradoHandlers} from '../src/schools/colorado.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const footballPage=gunzipSync(readFileSync(new URL('./fixtures/utah-module/football-schedule.html.gz',import.meta.url))).toString('utf8');

class MemoryCache{
  constructor(){this.store=new Map();}
  async match(request){const hit=this.store.get(String(request.url??request));return hit?hit.clone():undefined;}
  async put(request,response){this.store.set(String(request.url??request),response.clone());}
}
const cache=new MemoryCache();
let upstreamUp=true,upstreamRequests=0;
let scoreboard=null;
const fetch=async url=>{
  if(String(url).startsWith('https://site.api.espn.com/'))return scoreboard?new Response(JSON.stringify(scoreboard),{status:200,headers:{'content-type':'application/json'}}):new Response('{"events":[]}',{status:200});
  upstreamRequests++;
  if(!upstreamUp)throw Error('upstream down');
  if(String(url)==='https://utahutes.com/sports/football/schedule')return new Response(footballPage,{status:200,headers:{'content-type':'text/html'}});
  return new Response('not found',{status:404});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,coloradoSchool,createColoradoHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches:{default:cache}};
const {handler}=Function(...Object.keys(deps),source+';return {handler};')(...Object.values(deps));
const base='https://sas-sports.example/live/feed/grouped?school=utah&sport=Football';
const call=async(query='')=>handler.fetch(new Request(base+query),{},{waitUntil(){}});

// 1. A live build succeeds and is saved twice: the normal feed entry and the
//    week-long last good copy.
const live=await call('&refresh=1');
assert.equal(live.status,200);
assert.equal(live.headers.get('x-sas-cache'),'live');
const liveBody=await live.json();
assert.equal(liveBody[0].sport,'Football');
const keys=[...cache.store.keys()];
assert.ok(keys.some(k=>k.includes('/__sas_cache/feed?'))&&keys.some(k=>k.includes('/__sas_cache/feed-last-good?')),'both copies are saved');

// 1b. A recent copy is answered at once (rebuilt in the background); an older
//     one is rebuilt before answering, so a finished game is not shown as
//     Today or Live (K-State vs BYU, Oct 1: a 16:16 copy served at 02:41).
{
  const feedKey=[...cache.store.keys()].find(k=>k.includes('/__sas_cache/feed?'));
  const original=new Map([...cache.store].filter(([k])=>k.includes('/__sas_cache/feed')).map(([k,v])=>[k,v.clone()]));
  const age=ms=>{const entry=cache.store.get(feedKey),copy=new Response(entry.clone().body,entry);copy.headers.set('x-sas-fetched-at',new Date(Date.now()-ms).toISOString());cache.store.set(feedKey,copy);};
  age(60*1000);
  assert.equal((await call()).headers.get('x-sas-cache'),'stale-refreshing','a one-minute-old copy is answered at once');
  age(10*60*1000);
  const rebuilt=await call();
  assert.equal(rebuilt.headers.get('x-sas-cache'),'live','a ten-minute-old copy is rebuilt before answering');
  age(10*60*1000);upstreamUp=false;
  for(const k of [...cache.store.keys()])if(k.includes('/__sas_cache/source'))cache.store.delete(k);
  assert.equal((await call()).headers.get('x-sas-cache'),'stale-fallback','if that rebuild fails, the older copy is still served');
  upstreamUp=true;
  for(const [k,v] of original)cache.store.set(k,v);
}

// 2. cached=1 answers from the saved copy and never rebuilds.
let before=upstreamRequests;
const saved=await call('&cached=1');
assert.equal(saved.status,200);
assert.equal(saved.headers.get('x-sas-cache'),'saved');
assert.ok(saved.headers.get('x-sas-fetched-at'),'the copy carries its age');
assert.ok(saved.headers.get('access-control-expose-headers').includes('x-sas-fetched-at'));
assert.deepEqual(await saved.json(),liveBody);
assert.equal(upstreamRequests,before,'cached=1 makes no upstream request');

// 3. The official source fails and the normal entry is gone (e.g. expired):
//    the last good copy is served, labeled saved.
upstreamUp=false;
for(const k of keys)if(k.includes('/__sas_cache/feed?'))cache.store.delete(k);
const fallback=await call('&refresh=1');
assert.equal(fallback.status,200);
assert.equal(fallback.headers.get('x-sas-cache'),'saved');
assert.deepEqual(await fallback.json(),liveBody);

// 4. Older than a week, or never saved: no copy is invented.
const lastGoodKey=keys.find(k=>k.includes('feed-last-good'));
const old=cache.store.get(lastGoodKey),aged=new Response(await old.clone().text(),old);
aged.headers.set('x-sas-fetched-at',new Date(Date.now()-8*24*60*60*1000).toISOString());
cache.store.set(lastGoodKey,aged);
assert.equal((await call('&cached=1')).status,404,'a copy older than a week is not served');
assert.equal((await call('&refresh=1')).status,502,'a failed rebuild with no usable copy still reports unavailable');
before=upstreamRequests;
assert.equal((await handler.fetch(new Request('https://sas-sports.example/live/feed/grouped?school=utah&sport=Soccer&cached=1'),{},{waitUntil(){}})).status,404);
assert.equal(upstreamRequests,before,'a missing copy is not rebuilt either');

// 5. The official page fails while a live scoreboard answers (seen for
//    K-State Volleyball, Oct 1): the live game is laid over the last good full
//    schedule, never replacing it, and that partial feed is not saved as the
//    last good copy.
cache.store.set(lastGoodKey,old);
const liveCount=g=>[g.live.length,g.results.length,g.upcoming.length];
const savedGroups=liveBody[0];
scoreboard={events:[{date:new Date().toISOString(),competitions:[{date:new Date().toISOString(),status:{type:{state:'in',completed:false,shortDetail:'2nd - 5:00'}},competitors:[
  {homeAway:'home',score:'14',team:{location:'Utah',displayName:'Utah Utes',shortDisplayName:'Utah',abbreviation:'UTAH',name:'Utes'}},
  {homeAway:'away',score:'7',team:{location:'Test State',displayName:'Test State Testers',shortDisplayName:'Test State',abbreviation:'TST',name:'Testers'}}]}]}]};
const partial=await call('&refresh=1');
assert.equal(partial.status,200);
const partialBody=await partial.json();
assert.equal(partialBody[0].live.length,1,'the live game is shown');
assert.equal(partialBody[0].live[0].school_score,'14');
assert.equal(partialBody[0].results.length,savedGroups.results.length,'the saved results stay');
assert.ok(partialBody[0].upcoming.length+partialBody[0].live.length>=savedGroups.upcoming.length,'the saved schedule stays');
assert.equal(await cache.store.get(lastGoodKey).clone().text(),await old.clone().text(),'the partial feed is not saved as the last good copy');
// With no saved schedule, a scoreboard game alone is not served as the feed.
cache.store.delete(lastGoodKey);
for(const k of [...cache.store.keys()])if(k.includes('/__sas_cache/feed?'))cache.store.delete(k);
assert.equal((await call('&refresh=1')).status,502,'no saved schedule: unavailable, not a one-game feed');
scoreboard=null;

// 6. The app labels saved copies and keeps one per sport on the device.
const app=read('../public/index.html');
assert.match(app,/&cached=1/,'the app asks for the saved copy after a failed load');
assert.match(app,/Saved schedule · updated/,'saved copies are labeled with their age');
assert.match(app,/localStorage\.setItem\(`sas-feed:\$\{id\}\|\$\{sp\}`/,'the device keeps its own last good copy');
console.log('Last good feed checks passed: live builds are saved, cached=1 never rebuilds, failed rebuilds fall back to a labeled copy up to a week old, a live score is laid over the saved schedule when the official page fails, and nothing older or missing is invented.');
