// Home's single request (user, November 10, 2026: "Do the home page"):
// /live/home answers every favorite's saved feed at once, never rebuilding,
// and the page reads again only the sports whose copy is not current.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const store=new Map(),kv=new Map();
globalThis.caches={default:{async match(r){return store.get(typeof r==='string'?r:r.url)?.clone()||undefined},async put(r,res){store.set(typeof r==='string'?r:r.url,res)}}};
const HIGHLIGHTS={async get(k){return kv.get(k)?.value??null},async getWithMetadata(k){return kv.get(k)||{value:null,metadata:null}},async put(){},async delete(){}};
let downloads=0;
const fetch=async url=>{downloads++;return{ok:false,status:404,url:String(url),headers:new Headers(),text:async()=>'',json:async()=>({})}};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {handler,feedCacheKey,lastGoodFeedKey,globalCopyKey,FEED_COPY_FORMAT}')(...Object.values(deps));
const origin='https://sas-sports.lovetogivepain.workers.dev',url=new URL(origin);
const ago=ms=>new Date(Date.now()-ms).toISOString(),MIN=60000;
const group=(sport,extra={})=>[{sport,live:[],results:[],upcoming:[],other:[],...extra}];
const put=(key,sport,fetchedAt,headers={},extra={})=>store.set(key.url,new Response(JSON.stringify(group(sport,extra)),{headers:{'content-type':'application/json','x-sas-fetched-at':fetchedAt,...headers}}));
put(worker.feedCacheKey(url,'kstate','Football'),'Football',ago(5000));                                  // fresh
put(worker.feedCacheKey(url,'kstate','Volleyball'),'Volleyball',ago(15000),{'x-sas-live':'1'},{live:[{id:'v'}]}); // live, older than 10 s
put(worker.feedCacheKey(url,'kstate','Golf'),'Golf',ago(30*MIN),{'x-sas-quiet':'1'});                     // quiet, within the hour
put(worker.feedCacheKey(url,'kstate','Soccer'),'Soccer',ago(5*MIN));                                     // active, past 25 s
put(worker.lastGoodFeedKey(url,'kansas','Football'),'Football',ago(3*24*60*MIN));                         // last good copy only
kv.set(worker.globalCopyKey('prod','manhattan-ks','Football',worker.FEED_COPY_FORMAT),{value:JSON.stringify(group('Football')),metadata:{fetched_at:ago(20*MIN),quiet:true}});
const ask=async q=>{const r=await worker.handler.fetch(new Request(`${origin}/live/home?pairs=${encodeURIComponent(q)}`),{HIGHLIGHTS},{waitUntil(){}});return{status:r.status,body:await r.json()}};

// 1. Every copy at once, each with what the page should do with it.
{
  const {status,body}=await ask('kstate|Football,kstate|Volleyball,kstate|Golf,kstate|Soccer,kansas|Football,manhattan-ks|Football,kstate|Basketball');
  assert.equal(status,200);
  const states=Object.fromEntries(body.feeds.map(f=>[`${f.school}|${f.sport}`,f.state]));
  assert.deepEqual(states,{'kstate|Football':'fresh','kstate|Volleyball':'stale','kstate|Golf':'recent','kstate|Soccer':'stale','kansas|Football':'stale','manhattan-ks|Football':'recent'});
  assert.ok(body.feeds.every(f=>Array.isArray(f.groups)&&f.fetched_at),'groups and their time');
  assert.equal(downloads,0,'no school download: a saved copy only, never a rebuild');
}
// 2. Bad asks are refused; a sport the school does not sponsor is left out.
{
  assert.equal((await ask('')).status,400);
  assert.equal((await ask('KState|Football')).status,400,'ids are lower case');
  assert.equal((await ask(Array.from({length:41},(_,i)=>`s${i}|Football`).join(','))).status,400,'40 at most');
  const unsponsored=Object.entries(sponsoredSports).find(([,list])=>!list.includes('Football'));
  const {status,body}=await ask(`${unsponsored[0]}|Football,kstate|Football`);
  assert.equal(status,200);assert.deepEqual(body.feeds.map(f=>f.school),['kstate']);
}

// 3. The page: current copies are kept, the rest read again; a failed
// request leaves every sport to be read; a forced refresh skips it.
{
  const page=read('../public/index.html');
  const pick=re=>{const m=page.match(re);assert.ok(m,`found ${re}`);return m[0]};
  const code=pick(/const HOME_COPY_PAIRS=[\s\S]*?\nasync function homeCopies\([\s\S]*?\n\}\n/);
  const saved=[];let asked=[],answer=null;
  const apiFetch=async path=>{asked.push(decodeURIComponent(path.split('pairs=')[1]));if(!answer)throw Error('HTTP 503');return{json:async()=>answer}};
  const homeCopies=Function('apiFetch','saveFeedCopy',code+';return homeCopies;')(apiFetch,(id,sp)=>saved.push(`${id}|${sp}`));
  const pairs=[['kstate','Football'],['kstate','Golf'],['kstate','Soccer'],['kansas','Football']];
  answer={feeds:[
    {school:'kstate',sport:'Football',state:'fresh',fetched_at:'t1',groups:group('Football')},
    {school:'kstate',sport:'Golf',state:'recent',fetched_at:'t2',groups:group('Golf')},
    {school:'kstate',sport:'Soccer',state:'stale',fetched_at:'t3',groups:group('Soccer')},
    {school:'other',sport:'Golf',state:'fresh',fetched_at:'t4',groups:group('Golf')}]};
  const r=await homeCopies(pairs,false,null);
  assert.deepEqual([...r.current],['kstate|Football','kstate|Golf'],'fresh and recent are current');
  assert.deepEqual([...r.groups.keys()],['kstate|Football','kstate|Golf','kstate|Soccer'],'a stale copy is still shown; an unasked sport is ignored');
  assert.equal(r.groups.get('kstate|Golf').fetched_at,'t2');
  assert.deepEqual(saved,['kstate|Football','kstate|Golf'],'current copies saved on the device');
  assert.deepEqual(asked,['kstate|Football,kstate|Golf,kstate|Soccer,kansas|Football'],'one request');
  asked=[];const many=await homeCopies(Array.from({length:45},(_,i)=>[`s${i}`,'Golf']),false,null);
  assert.equal(asked.length,2,'45 sports: two requests of 40 at most');assert.equal(many.current.size,0);
  asked=[];assert.equal((await homeCopies(pairs,true,null)).current.size,0);assert.equal(asked.length,0,'a forced refresh reads every sport');
  answer=null;asked=[];const failed=await homeCopies(pairs,false,null);
  assert.equal(failed.current.size,0,'a failed request: every sport is read as before');
  assert.match(page,/const reread=requested\.filter\(p=>!settled\.current\.has\(key\(p\)\)\);\n[^\n]*\n  await inBatches\(reread,4,/,'only the rest is read one by one');
}
console.log('home-copies: ok (one request for every saved copy, only the rest read again)');
