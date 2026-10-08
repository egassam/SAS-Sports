// A school whose official site refuses some Cloudflare locations
// (gamecocksonline.com answers Paris with 403, Oct 8) keeps a global saved
// copy of each feed in KV: a location that cannot rebuild and has no copy of
// its own serves the feed another location built, labeled saved-global with
// its age. Two Worker instances, each with its own per-location cache, share
// one in-memory KV.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const pages={
  'https://gamecocksonline.com/sports/football/schedule/':gunzipSync(readFileSync(new URL('./fixtures/south-carolina-module/football-schedule.html.gz',import.meta.url))).toString('utf8'),
  'https://utahutes.com/sports/football/schedule':gunzipSync(readFileSync(new URL('./fixtures/utah-module/football-schedule.html.gz',import.meta.url))).toString('utf8')
};
class MemoryCache{
  constructor(){this.store=new Map();}
  async match(request){const hit=this.store.get(String(request.url??request));return hit?hit.clone():undefined;}
  async put(request,response){this.store.set(String(request.url??request),response.clone());}
}
class MemoryKV{
  constructor(){this.store=new Map();this.writes=0;}
  async getWithMetadata(key){const hit=this.store.get(key);return hit?{value:hit.value,metadata:hit.metadata}:{value:null,metadata:null};}
  async get(key,type){const hit=this.store.get(key);return hit?(type==='json'?JSON.parse(hit.value):hit.value):null;}
  async put(key,value,options={}){this.writes++;this.store.set(key,{value,metadata:options.metadata||null});}
}
const kv=new MemoryKV(),source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// One Cloudflare location: its own cache, and whether the official sites answer it.
function location(answered){
  const fetch=async url=>{
    if(String(url).startsWith('https://site.api.espn.com/'))return new Response('{"events":[]}',{status:200});
    if(!answered)return new Response('<html>403 Forbidden</html>',{status:403});
    const page=pages[String(url)];
    return page?new Response(page,{status:200,headers:{'content-type':'text/html'}}):new Response('not found',{status:404});
  };
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches:{default:new MemoryCache()}};
  const {handler}=Function(...Object.keys(deps),source+';return {handler};')(...Object.values(deps));
  return(school,sport,query='')=>handler.fetch(new Request(`https://sas-sports.example/live/feed/grouped?school=${school}&sport=${sport}${query}`),{HIGHLIGHTS:kv},{waitUntil(){}});
}
const atlanta=location(true),paris=location(false);

// Paris before any copy exists: the official site refuses it, nothing is saved.
assert.equal((await paris('south-carolina','Football','&refresh=1')).status,502);

// Atlanta builds the feed and saves the global copy.
const live=await atlanta('south-carolina','Football','&refresh=1');
assert.equal(live.headers.get('x-sas-cache'),'live');
const liveBody=await live.json();
assert.equal(kv.writes,1,'the global copy is written');
// Further rebuilds within the hour write nothing more.
await atlanta('south-carolina','Football','&refresh=1');
assert.equal(kv.writes,1,'at most one write an hour per sport');

// Paris cannot rebuild and has no copy of its own: it serves Atlanta's copy.
for(const query of ['&refresh=1','','&cached=1']){
  const saved=await paris('south-carolina','Football',query);
  assert.equal(saved.status,200,`Paris ${query||'(plain)'}`);
  assert.equal(saved.headers.get('x-sas-cache'),'saved-global');
  assert.ok(saved.headers.get('x-sas-fetched-at'),'the copy carries its age');
  assert.deepEqual(await saved.json(),liveBody);
}

// A copy older than the week-long last-good limit is not served.
const key=[...kv.store.keys()][0];
kv.store.get(key).metadata.fetched_at=new Date(Date.now()-8*24*60*60*1000).toISOString();
assert.equal((await paris('south-carolina','Football','&refresh=1')).status,502);
// An hour-old copy is replaced by the next build.
kv.store.get(key).metadata.fetched_at=new Date(Date.now()-61*60*1000).toISOString();
await atlanta('south-carolina','Football','&refresh=1');
assert.equal(kv.writes,2,'a copy older than an hour is rewritten');

// A school that has not opted in writes and reads no global copy.
assert.equal((await atlanta('utah','Football','&refresh=1')).status,200);
assert.equal(kv.writes,2,'no copy for schools without globalSavedCopy');
assert.equal((await paris('utah','Football','&refresh=1')).status,502);

console.log('Global saved copy checks passed: a refused location serves the feed another built (saved-global), one write an hour per sport, week-long limit, opt-in schools only');
