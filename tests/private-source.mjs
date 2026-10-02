// The private source route (/api/source): locked by the Worker secret, limited
// to official athletics sites and TFRRS, fetched exactly as the app fetches.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers} from '../src/schools/arizona.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const page='<html><body>Arizona football schedule</body></html>';
const requests=[];
const fetch=async(url,init={})=>{
  url=String(url);requests.push({url,ua:new Headers(init.headers||{}).get('user-agent')});
  if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nDisallow: /private/\n',{status:200,headers:{'content-type':'text/plain'}});
  if(url==='https://arizonawildcats.com/sports/football/schedule')return new Response(page,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  if(url==='https://arizonawildcats.com/leave'){const r=new Response('elsewhere',{status:200});Object.defineProperty(r,'url',{value:'https://example.com/landing'});return r;}
  return new Response('not found',{status:404});
};
class MemoryCache{constructor(){this.store=new Map();}async match(r){const hit=this.store.get(String(r.url??r));return hit?hit.clone():undefined;}async put(r,res){this.store.set(String(r.url??r),res.clone());}}
const caches={default:new MemoryCache()};globalThis.caches=caches;
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,caches};
const {handler}=Function(...Object.keys(deps),source+';return {handler};')(...Object.values(deps));
const KEY='test-key-0123456789abcdef';
const call=(target,{key=KEY,env={SOURCE_FETCH_KEY:KEY}}={})=>handler.fetch(new Request(`https://sas-sports.example/api/source?url=${encodeURIComponent(target)}`,{headers:key?{authorization:`Bearer ${key}`}:{}}),env,{waitUntil(){}});
const arizona='https://arizonawildcats.com/sports/football/schedule';

// Without the Worker secret the route does not exist.
assert.equal((await call(arizona,{env:{}})).status,404);
// Missing or wrong key: refused before any download.
assert.equal((await call(arizona,{key:null})).status,401);
assert.equal((await call(arizona,{key:'wrong'})).status,401);
assert.equal((await call(arizona,{key:KEY+'x'})).status,401);
assert.equal(requests.length,0,'nothing is downloaded without the key');
// Only https pages on official athletics sites (and TFRRS).
for(const target of ['https://example.com/','http://arizonawildcats.com/sports/football/schedule','https://evil.arizonawildcats.com.example.com/','https://storage.googleapis.com/x','not a url'])assert.equal((await call(target)).status,400,target);
assert.equal(requests.length,0);
// The real page, fetched as the app fetches it: honest identity and robots.txt.
const ok=await call(arizona);
assert.equal(ok.status,200);assert.equal(await ok.text(),page);
assert.match(ok.headers.get('content-type'),/text\/html/);
assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal(ok.headers.get('x-robots-tag'),'noindex');
assert.equal(ok.headers.get('x-sas-final-url'),arizona);
const download=requests.find(r=>r.url===arizona);
assert.match(download.ua,/^Mozilla\/5\.0 \(compatible; SAS-Sports\/.+\/bot\)$/,'the same honest identity as the app');
assert.ok(requests.some(r=>r.url==='https://arizonawildcats.com/robots.txt'),'robots.txt is consulted');
// robots.txt is obeyed.
const blocked=await call('https://arizonawildcats.com/private/page');
assert.notEqual(blocked.status,200);
assert.ok(!requests.some(r=>r.url==='https://arizonawildcats.com/private/page'),'a disallowed page is never downloaded');
// A redirect that leaves the official sites is refused.
assert.equal((await call('https://arizonawildcats.com/leave')).status,502);
// TFRRS, which the app reads for meet results, is allowed.
assert.notEqual((await call('https://www.tfrrs.org/results/xc/1/x')).status,400);
// The client script exists and needs the key.
assert.match(read('../scripts/fetch-official.mjs'),/SAS_SOURCE_KEY/);
console.log('Private source route checks passed');
