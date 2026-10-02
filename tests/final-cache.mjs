import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The device cache for finished events (public/index.html, FINAL-CACHE block),
// run against an in-memory store.
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const block=page.match(/\/\/ FINAL-CACHE:BEGIN([\s\S]*?)\/\/ FINAL-CACHE:END/)?.[1];
assert.ok(block,'the final-cache block must exist');
const store=()=>{const map=new Map();return{get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};
const api=Function('localStorage',`${block};return{sweepFinalCache,cachedFinal,keepFinal,finalCacheKey,FINAL_CACHE_MS};`)(store());
const final={id:'live-ucf-football-sep-26-2026-tcu-final',school_id:'ucf',sport:'Football',status:'Final',headline:'W, 21-13',highlights_verified:true,highlights:['a','b','c','d'],recap_url:'https://ucfknights.com/news/x'};

// A verified final is kept and comes back whole.
let s=store();
assert.equal(api.keepFinal(final,s),true);
assert.deepEqual(api.cachedFinal({id:final.id,school_id:'ucf',sport:'Football'},s),final);
// Unverified answers (the AI timed out) and unfinished events are never kept,
// so the next open asks again.
s=store();
assert.equal(api.keepFinal({...final,highlights_verified:false,highlight_state:'ai_failed',highlights:[]},s),false);
assert.equal(api.keepFinal({...final,status:'Upcoming'},s),false);
assert.equal(api.keepFinal({...final,highlights_verified:false},s),false,'highlights that were not verified are not kept');
assert.equal(s.map.size,0);
// Meets verified from official results are kept too.
assert.equal(api.keepFinal({...final,id:'xc',sport:'Cross Country',highlights_verified:true,meet_results_verified:true},s),true);
// Keys are per school, sport and event: another school's event never matches.
assert.equal(api.cachedFinal({id:final.id,school_id:'byu',sport:'Football'},s),null);
// Monthly clear: the first sweep clears and records the time; within 30 days
// nothing is removed; after 30 days everything kept is cleared again.
s=store();const t0=Date.parse('2026-10-02T00:00:00Z');
assert.equal(api.sweepFinalCache(s,t0),true);
api.keepFinal(final,s);
s.setItem('sas-feed:ucf|Football','{}');
assert.equal(api.sweepFinalCache(s,t0+29*86400000),false);
assert.ok(api.cachedFinal(final,s),'kept within the month');
assert.equal(api.sweepFinalCache(s,t0+api.FINAL_CACHE_MS),true);
assert.equal(api.cachedFinal(final,s),null,'cleared after a month');
assert.equal(s.getItem('sas-feed:ucf|Football'),'{}','other saved data is untouched');
// A full or blocked store never breaks opening an event.
const broken={length:0,key:()=>null,getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('quota')},removeItem:()=>{}};
assert.equal(api.keepFinal(final,broken),false);assert.equal(api.cachedFinal(final,broken),null);assert.equal(api.sweepFinalCache(broken,t0),false);
// The page uses it: a kept final opens without the network, a fresh verified
// answer is kept, and the sweep runs on load.
assert.match(page,/const kept=e\.status==='Final'&&!e\.demo&&e\.school_id&&e\.sport\?cachedFinal\(e\):null;\s*if\(kept\)e=\{\.\.\.e,\.\.\.kept\};\s*else if/);
assert.match(page,/Object\.assign\(e,enriched\);keepFinal\(e\)/);
assert.match(page,/\nsweepFinalCache\(\);\n/);
console.log('Final-event device cache checks passed');
