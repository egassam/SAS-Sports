// The download page and feedback (user, November 23, 2026: "We need to make a
// download page for this app with instructions on how it works and how you
// customize so I can start sharing it. I need to start getting more
// feedback.").
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanFeedback,feedbackRoute,FEEDBACK_LIMITS} from '../src/feedback.mjs';

const page=readFileSync(new URL('../public/get/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');

// The page: install steps for each device, how it works, customizing, feedback.
for(const id of ['install','how','customize','faq','feedback','share'])assert.match(page,new RegExp(`<section id="${id}"`),`the page has a ${id} section`);
for(const text of ['Add to Home Screen','Install app','☆ Favorite','⚙ Customize','Alerts','Calendar','Show everything'])assert.ok(page.includes(text),`the page explains "${text}"`);
assert.ok(page.includes('<link rel="manifest" href="/manifest.webmanifest">'),'the page can install the app');
assert.match(page,/fetch\('\/api\/feedback',\{method:'POST'/,'the form posts to /api/feedback');
assert.match(page,/name="website"[^>]*tabindex="-1"/,'the form has a hidden field for bots');
assert.ok(!/<script[^>]+src=/.test(page),'the page loads no outside scripts');
// The app links to it.
assert.ok(app.includes('href="/get/#feedback"'),'the app header links to feedback');
assert.ok(app.includes('href="/get/"'),'the app footer links to the page');
assert.ok(app.includes('@media(max-width:600px){.brandbar:has(#installApp:not([hidden])) #feedbackLink{display:none}}'),'on a phone, the header shows Feedback only where Install app is hidden (the header has no room for both)');
assert.match(worker,/url\.pathname==='\/api\/feedback'\)return feedbackRoute/,'the Worker routes /api/feedback');
assert.ok(!/run_worker_first[^\]]*\/get/.test(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8')),'/get is a static asset');

// Cleaning
assert.deepEqual(cleanFeedback({message:'  Add Wamego tennis  ',kind:'missing',team:'Wamego',contact:''}),{kind:'missing',message:'Add Wamego tennis',contact:null,team:'Wamego',device:null});
assert.equal(cleanFeedback({message:'hi there',kind:'drop table'}).kind,'other');
assert.ok(cleanFeedback({message:'x'}).error);
assert.ok(cleanFeedback(null).error);
assert.deepEqual(cleanFeedback({message:'buy now',website:'http://spam'}),{spam:true});
assert.equal(cleanFeedback({message:'a'.repeat(5000)}).message.length,FEEDBACK_LIMITS.message);
assert.equal(cleanFeedback({message:'ok\u0000\u0007 fine'}).message,'ok fine');

// The route, on a stand-in D1
function fakeDb(){
  const rows=[];
  return{rows,prepare(sql){let args=[];const st={bind:(...a)=>{args=a;return st},
    run:async()=>{if(/^INSERT/.test(sql)){const [scope,at,kind,message,contact,team,device]=args;rows.push({id:rows.length+1,scope,at,kind,message,contact,team,device})}return{}},
    first:async()=>/COUNT/.test(sql)?{n:rows.filter(r=>r.scope===args[0]&&r.at>args[1]).length}:null,
    all:async()=>({results:rows.filter(r=>r.scope===args[0]).slice().reverse().map(({scope,...r})=>r)})};return st}};
}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const sameSecret=async(a,b)=>a===b;
const db=fakeDb(),env={CATALOG_DB:db,SOURCE_FETCH_KEY:'k'},url=new URL('https://sas.example/api/feedback');
const post=(body,headers={})=>feedbackRoute(new Request(url,{method:'POST',headers:{'content-type':'application/json',origin:'https://sas.example',...headers},body:typeof body==='string'?body:JSON.stringify(body)}),env,url,{json,sameSecret});

let r=await post({kind:'idea',message:'Dark mode toggle please',team:'Home'});
assert.equal(r.status,200);assert.deepEqual(await r.json(),{received:true});
assert.equal(db.rows.length,1);assert.equal(db.rows[0].scope,'sas.example');assert.equal(db.rows[0].message,'Dark mode toggle please');
assert.equal((await post({message:'spam',website:'x'})).status,200);assert.equal(db.rows.length,1,'bot notes are dropped');
assert.equal((await post({message:''})).status,400);
assert.equal((await post('not json')).status,400);
assert.equal((await post('x'.repeat(9000))).status,413);
assert.equal((await post({message:'from elsewhere'},{origin:'https://evil.example'})).status,403);
assert.equal((await feedbackRoute(new Request(url,{method:'PUT'}),env,url,{json,sameSecret})).status,405);
// Reading takes the source key.
assert.equal((await feedbackRoute(new Request(url),env,url,{json,sameSecret})).status,401);
assert.equal((await feedbackRoute(new Request(url,{headers:{authorization:'Bearer nope'}}),env,url,{json,sameSecret})).status,401);
r=await feedbackRoute(new Request(url,{headers:{authorization:'Bearer k'}}),env,url,{json,sameSecret});
assert.equal(r.status,200);const read=await r.json();assert.equal(read.feedback.length,1);assert.equal(read.feedback[0].kind,'idea');
// No key set: nobody reads.
assert.equal((await feedbackRoute(new Request(url,{headers:{authorization:'Bearer k'}}),{CATALOG_DB:db},url,{json,sameSecret})).status,401);
// The hourly cap.
for(let i=db.rows.length;i<FEEDBACK_LIMITS.perHour;i++)await post({message:`note ${i}`});
assert.equal((await post({message:'one too many'})).status,429);
// No database: a clear answer, not a crash.
assert.equal((await feedbackRoute(new Request(url,{method:'POST',body:'{}'}),{},url,{json,sameSecret})).status,503);
console.log('download page and feedback: ok');
