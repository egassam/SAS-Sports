// A middle or high school's saved copy from an earlier day (user, November
// 10, 2026: "Fix those next"; Nov 9 games read "Today" on Nov 10 from a copy
// saved the night before while Bound refused the rebuilds): a past game reads
// played, a past placeholder round is dropped, today's games are left, and a
// college copy is untouched.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const store=new Map();
globalThis.caches={default:{async match(r){return store.get(typeof r==='string'?r:r.url)?.clone()||undefined},async put(r,res){store.set(typeof r==='string'?r:r.url,res)}}};
const fetch=async url=>({ok:false,status:404,url:String(url),headers:new Headers(),text:async()=>'',json:async()=>({})});
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const w=Function(...Object.keys(deps),source+';return {handler,lastGoodFeedKey,agedHighSchoolGroups,agedCopy}')(...Object.values(deps));
const origin='https://sas-sports.lovetogivepain.workers.dev',url=new URL(origin);

// Local (Central) dates: the test's "today" is the Kansas date now.
const local=d=>new Date(d.getTime()-6*3600e3).toISOString().slice(0,10);
const now=new Date(),today=local(now),yesterday=local(new Date(now.getTime()-86400e3)),tomorrow=local(new Date(now.getTime()+86400e3));
const ev=(id,date,status,extra={})=>({id,event_type:'GAME',status,start_time:`${date}T16:30:00.000Z`,title:id,opponent:'Atchison',school_score:null,opponent_score:null,headline:null,results:[],...extra});
const groups=()=>[{school_id:'manhattan-ks',sport:'Basketball',live:[ev('live-yesterday',yesterday,'Live')],
  results:[ev('final-before',yesterday,'Final',{school_score:'40',opponent_score:'30',headline:'W, 40-30',start_time:`${yesterday}T10:00:00.000Z`})],
  upcoming:[ev('today-yesterday',yesterday,'Today'),ev('placeholder',yesterday,'Upcoming',{opponent:'State Championship - TBD'}),ev('today-now',today,'Today'),ev('next',tomorrow,'Upcoming'),ev('tournament',yesterday,'Today',{end_time:`${tomorrow}T23:59:00.000Z`})],other:[]}];

// 1. The rule.
{
  const aged=w.agedHighSchoolGroups(groups(),'manhattan-ks',now)[0];
  assert.deepEqual(aged.live.map(e=>e.id),[],'yesterday\'s live game is over');
  assert.deepEqual(aged.upcoming.map(e=>e.id),['today-now','next','tournament'],'today, tomorrow and a tournament still running stay');
  assert.deepEqual(aged.results.map(e=>[e.id,e.status,e.headline]).sort(),[['final-before','Final','W, 40-30'],['live-yesterday','Final','No score posted'],['today-yesterday','Final','No score posted']].sort());
  assert.ok(aged.results.every(e=>e.id==='final-before'||e.no_result_posted),'played without a score');
  assert.ok(!aged.results.some(e=>e.id==='placeholder')&&!aged.upcoming.some(e=>e.id==='placeholder'),'a past placeholder round is dropped');
  assert.equal(w.agedHighSchoolGroups(groups(),'kstate',now),null,'college copies are left as they are');
  assert.equal(w.agedHighSchoolGroups([{...groups()[0],live:[],upcoming:[ev('a',today,'Today')]}],'manhattan-ks',now),null,'nothing past: unchanged');
}
// 2. The feed route: a saved copy from the night before is aged; one built today is passed on as it is.
{
  const put=at=>store.set(w.lastGoodFeedKey(url,'manhattan-ks','Basketball').url,new Response(JSON.stringify(groups()),{headers:{'content-type':'application/json','x-sas-fetched-at':at}}));
  put(new Date(now.getTime()-30*3600e3).toISOString());
  const r=await w.handler.fetch(new Request(`${origin}/live/feed/grouped?school=manhattan-ks&sport=Basketball&cached=1`),{},{waitUntil(){}});
  assert.equal(r.headers.get('x-sas-cache'),'saved');
  const g=(await r.json())[0];
  assert.deepEqual(g.upcoming.map(e=>e.id),['today-now','next','tournament']);
  assert.equal(g.results.find(e=>e.id==='today-yesterday').headline,'No score posted');
  const fresh=new Response(JSON.stringify(groups()),{headers:{'x-sas-fetched-at':now.toISOString()}});
  assert.equal(await w.agedCopy(fresh,'manhattan-ks',now),fresh,'a copy built today is passed on untouched');
}
console.log('aged-copies: ok (a past game in a saved copy reads played, placeholders dropped, today and college untouched)');
