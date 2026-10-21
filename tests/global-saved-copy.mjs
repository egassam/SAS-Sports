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
function location(answered,{host='sas-sports.example',version=null,cache=new MemoryCache()}={}){
  const fetch=async url=>{
    if(String(url).startsWith('https://site.api.espn.com/'))return new Response('{"events":[]}',{status:200});
    if(!answered)return new Response('<html>403 Forbidden</html>',{status:403});
    const page=pages[String(url)];
    return page?new Response(page,{status:200,headers:{'content-type':'text/html'}}):new Response('not found',{status:404});
  };
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches:{default:new MemoryCache()}};
  deps.caches={default:cache};
  const code=version?source.replace(/^const VERSION='[^']*';/m,`const VERSION='${version}';`):source;
  const {handler}=Function(...Object.keys(deps),code+';return {handler};')(...Object.values(deps));
  return(school,sport,query='')=>handler.fetch(new Request(`https://${host}/live/feed/grouped?school=${school}&sport=${sport}${query}`),{HIGHLIGHTS:kv},{waitUntil(){}});
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
// Unless the number of events changed (new results posted): the copy saved
// before them would otherwise stand for the hour.
{
  const key=[...kv.store.keys()][0],saved=kv.store.get(key);
  kv.store.set(key,{value:'[]',metadata:{...saved.metadata,events:0}});
  await atlanta('south-carolina','Football','&refresh=1');
  assert.equal(kv.writes,2,'a copy with a different number of events is rewritten within the hour');
  const ids=body=>JSON.parse(body).flatMap(g=>g.results.map(e=>e.id));
  assert.deepEqual(ids(kv.store.get(key).value),ids(JSON.stringify(liveBody)));
  kv.store.set(key,saved);kv.writes=1;
}

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

// High school entries opt in through their own module (the Manhattan USD 383
// sites answer Cloudflare's European locations with 520; Oct 16).
assert.ok(read('../src/index.js').includes('const usesGlobalCopy=school=>Boolean(schoolModule(school)?.school.globalSavedCopy||highSchoolModule(school)?.globalSavedCopy);'));
{const {manhattanKsSchool}=await import('../src/schools/manhattan-ks.mjs'),{anthonyMsSchool,eisenhowerMsSchool}=await import('../src/schools/manhattan-ks-middle.mjs');
for(const m of [manhattanKsSchool,anthonyMsSchool,eisenhowerMsSchool])assert.equal(m.globalSavedCopy,true,m.id);}
// Saved copies outlive a deploy (Oct 21): a new version at the same
// location, with the site down, serves the copy the old version saved.
{
  const PROD='sas-sports.lovetogivepain.workers.dev',shared=new MemoryCache();
  const at=(answered,opts)=>{const call=location(answered,{host:PROD,...opts});return(school,sport,query)=>call(school,sport,query)};
  // Fresh copies for this block.
  kv.store.clear();
  const before=at(true,{version:'1.0.0-old',cache:shared});
  assert.equal((await before('south-carolina','Football','&refresh=1')).status,200);
  const afterSameLocation=at(false,{version:'2.0.0-new',cache:shared});
  const local=await afterSameLocation('south-carolina','Football','&refresh=1');
  assert.equal(local.status,200,'the last good copy survives a new version');
  assert.equal(local.headers.get('x-sas-cache'),'saved');
  const afterElsewhere=at(false,{version:'2.0.0-new'});
  const global=await afterElsewhere('south-carolina','Football','&refresh=1');
  assert.equal(global.status,200,'the global copy survives a new version');
  assert.equal(global.headers.get('x-sas-cache'),'saved-global');
  // A branch preview writes its own copy and never replaces production's;
  // with none of its own it reads production's.
  const prodKey=[...kv.store.keys()].find(k=>k.startsWith('feed:v2:prod|south-carolina|Football|'));
  assert.ok(prodKey,'production writes under its own scope');
  const prodCopy=kv.store.get(prodKey).value;
  const previewDown=location(false,{host:'branch-sas-sports.lovetogivepain.workers.dev'});
  const fromProd=await previewDown('south-carolina','Football','&refresh=1');
  assert.equal(fromProd.status,200,'a preview with no copy reads production\'s');
  assert.equal(fromProd.headers.get('x-sas-cache'),'saved-global');
  const previewUp=location(true,{host:'branch-sas-sports.lovetogivepain.workers.dev'});
  assert.equal((await previewUp('south-carolina','Football','&refresh=1')).status,200);
  assert.ok(kv.store.has(prodKey.replace('feed:v2:prod|','feed:v2:branch-sas-sports.lovetogivepain.workers.dev|')),'the preview saves under its own host');
  assert.equal(kv.store.get(prodKey).value,prodCopy,'production\'s copy is untouched by the preview');
}
console.log('Global saved copy checks passed: a refused location serves the feed another built (saved-global), one write an hour per sport, week-long limit, opt-in schools only, copies survive a deploy, previews keep their own');
