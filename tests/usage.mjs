// How many people use the app (user, November 23, 2026: "Can we track how many
// people are using the app?"; our own counter only).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {cleanPing,usageDay,usageRoute,usageStats,USAGE_MAX_PER_DAY} from '../src/usage.mjs';

function fakeD1(){
  const sqlite=new DatabaseSync(':memory:');
  const st=(sql,args=[])=>({bind:(...a)=>st(sql,a),async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return{results:sqlite.prepare(sql).all(...args)}},async run(){sqlite.prepare(sql).run(...args);return{}}});
  return{sqlite,prepare:sql=>st(sql)};
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

// Days are Central: 3 AM UTC on Nov 24 is still Nov 23 in Kansas.
assert.equal(usageDay(new Date('2026-11-24T03:00:00Z')),'2026-11-23');
assert.equal(usageDay(new Date('2026-11-24T07:00:00Z')),'2026-11-24');
assert.equal(usageDay(new Date('2026-11-24T07:00:00Z'),-1),'2026-11-23');

assert.deepEqual(cleanPing({id:'0123456789abcdef-x',page:'app',installed:true}),{id:'0123456789abcdef-x',page:'app',installed:1});
assert.equal(cleanPing({id:'0123456789abcdef',page:'app'}).installed,0);
for(const bad of [null,{},{id:'short',page:'app'},{id:'0123456789abcdef',page:'admin'},{id:'<script>0123456789',page:'app'}])assert.equal(cleanPing(bad),null);

const db=fakeD1(),env={CATALOG_DB:db},url=new URL('https://sas.example/api/ping');
let clock=new Date('2026-11-23T18:00:00Z');
const ping=(body,{origin='https://sas.example',at=url}={})=>usageRoute(new Request(at,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)}),env,at,{json,now:()=>clock});
const A='aaaaaaaaaaaaaaaaaaaa',B='bbbbbbbbbbbbbbbbbbbb',C='cccccccccccccccccccc';

assert.deepEqual(await (await ping({id:A,page:'app'})).json(),{counted:true});
await ping({id:A,page:'app',installed:true});
await ping({id:A,page:'app'});
assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM usage_days').get().n,1,'one row per device, day and page');
assert.equal(db.sqlite.prepare('SELECT installed FROM usage_days').get().installed,1,'installed once is installed for the day');
assert.ok(!db.sqlite.prepare('SELECT device FROM usage_days').get().device.includes(A),'the id is stored hashed');
await ping({id:B,page:'app'});await ping({id:B,page:'get'});await ping({id:C,page:'get'});
assert.equal((await ping({id:C,page:'app'},{origin:'https://evil.example'})).status,403);
assert.equal((await ping({id:'x',page:'app'})).status,400);
assert.equal((await usageRoute(new Request(url),env,url,{json})).status,405);
assert.equal((await usageRoute(new Request(url,{method:'POST',body:'{}'}),{},url,{json})).status,503);
// A preview's check-ins are its own.
await ping({id:C,page:'app'},{origin:'https://branch.example',at:new URL('https://branch.example/api/ping')});

// Next day: A again; 10 days later: C.
clock=new Date('2026-11-24T18:00:00Z');await ping({id:A,page:'app'});
clock=new Date('2026-12-03T18:00:00Z');await ping({id:C,page:'app',installed:true});

let s=await usageStats(db,'sas.example',clock);
assert.deepEqual(s.app,{today:1,week:1,month:3,installed_month:2});
assert.deepEqual(s.install_page,{today:0,week:0,month:2});
assert.equal(s.counting_since,'2026-11-23');
assert.equal(s.days.length,14);assert.equal(s.days.at(-1).day,'2026-12-03');assert.equal(s.days.at(-1).devices,1);
assert.equal(s.days.find(d=>d.day==='2026-11-23').devices,2);
s=await usageStats(db,'sas.example',new Date('2026-11-24T18:00:00Z'));
assert.deepEqual([s.app.today,s.app.week],[1,2]);
assert.equal((await usageStats(db,'branch.example',clock)).app.month,1,'per host');
assert.equal((await usageStats(db,'nobody.example',clock)).app.month,0);

// The daily cap.
clock=new Date('2026-12-04T18:00:00Z');
const day=usageDay(clock),ins=db.sqlite.prepare("INSERT INTO usage_days (scope,day,device,page,installed) VALUES ('sas.example',?,?,'app',0)");
for(let i=0;i<USAGE_MAX_PER_DAY;i++)ins.run(day,'d'+i);
assert.deepEqual(await (await ping({id:A,page:'app'})).json(),{counted:false});

// The pages.
const app=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),get=readFileSync(new URL('../public/get/index.html',import.meta.url),'utf8'),worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
for(const [html,page] of [[app,'app'],[get,'get']]){
  assert.ok(html.includes(`const page='${page}'`),`${page} checks in as ${page}`);
  assert.match(html,/if\(navigator\.webdriver\)return;/,'automated browsers are not counted');
  assert.match(html,/fetch\('\/api\/ping'/);
}
assert.match(app,/post\('\/api\/push\/stats',\{endpoint:s\.endpoint\}\)/,'the owner view reads the totals');
assert.match(worker,/url\.pathname==='\/api\/ping'\)return usageRoute/);
assert.match(worker,/if\(path==='\/api\/push\/stats'\)\{\n    const owner=/,'totals are for the owner only');
console.log('usage: check-ins, Central days, totals, owner-only, cap and pages OK');
