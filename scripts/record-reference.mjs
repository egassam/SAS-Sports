// Records every source the reference schools' feeds read (user, November 6,
// 2026: "We need to make the Manhattan schools the next that they can be so
// we can create rules for every other school ... Like we did with KSTATE
// being the base for all of college"). Each school's every sponsored sport is
// built once through the Worker's own fetchLive; every request it makes is
// answered by the real source (directly, or through the app's /api/source
// route when the source refuses the sandbox) and saved. tests/
// hs-reference.mjs then rebuilds the feeds from the saved copy at the same
// moment and compares them card by card with the expected cards saved here.
//
//   SAS_SOURCE_KEY=… node scripts/record-reference.mjs [--date=YYYY-MM-DD]
//
// Writes tests/fixtures/hs-reference/sources-<date>.json.gz and
// expected-<date>.json. Read the expected cards before committing them.
//
// --feeds=<school>:<sport>,… --dir=<fixtures folder> records other feeds
// the same way (tests/hs-rules.mjs: the cases the reference rules found on
// the other counties, November 7, 2026).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';
import {REFERENCE_SCHOOLS,cardLine} from '../tests/hs-reference-lib.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const PROXY='https://sas-sports.lovetogivepain.workers.dev/api/source?url=';
const key=process.env.SAS_SOURCE_KEY;
const saved={};
const requestKey=(url,init={})=>`${String(init.method||'GET').toUpperCase()} ${url}${init.body?` #${createHash('sha1').update(String(init.body)).digest('hex').slice(0,12)}`:''}`;
const realFetch=globalThis.fetch;
const fetch=async(url,init={})=>{
  const href=String(url?.url||url),k=requestKey(href,init);
  let status=0,body='',type='',final=href;
  try{
    const headers=new Headers(init.headers||{});
    let r=await realFetch(href,{method:init.method||'GET',headers,body:init.body,redirect:'follow',signal:AbortSignal.timeout(30000)});
    if([202,403,429,503].includes(r.status)&&key&&!init.body){
      const p=await realFetch(PROXY+encodeURIComponent(href),{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(45000)});
      if(p.status!==400&&p.status!==401)r=p,final=p.headers.get('x-sas-final-url')||href;
    }
    status=r.status;type=r.headers.get('content-type')||'';body=Buffer.from(await r.arrayBuffer()).toString('base64');
    // Bound answers Node's fetch with 202 or 503 while it answers curl
    // (November 5, 2026; production's reads are unaffected): read with curl.
    if(status!==200&&/gobound\.com$/.test(new URL(href).hostname)&&!init.body){
      const ua=headers.get('user-agent')||'Mozilla/5.0 (compatible; SAS-Sports)';
      const out=execFileSync('curl',['-sS','-A',ua,'-H','Accept: application/json','-w','\n%{http_code}',href],{maxBuffer:64<<20});
      const text=out.toString('utf8'),cut=text.lastIndexOf('\n');status=Number(text.slice(cut+1));type='application/json';body=Buffer.from(text.slice(0,cut)).toString('base64');
    }
  }catch(error){status=0;body='';type=`error ${error?.message||error}`;}
  saved[k]={status,type,url:final,body};
  return new Response(status?Buffer.from(body,'base64'):null,{status:status||599,headers:{'content-type':type||'text/plain'}});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents}')(...Object.values(deps));

const at=new Date(),date=process.argv.find(a=>a.startsWith('--date='))?.slice(7)||at.toISOString().slice(0,10);
const RealDate=Date;
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
const expected={recorded_at:at.toISOString(),schools:{}};
const feedsArg=process.argv.find(a=>a.startsWith('--feeds='))?.slice(8);
const feeds=feedsArg?feedsArg.split(',').map(f=>f.split(':')):REFERENCE_SCHOOLS.flatMap(id=>sponsoredSports[id].map(sport=>[id,sport]));
for(const [id,sport] of feeds){
  expected.schools[id]??={};
  {
    const result=await worker.fetchLive(id,sport);
    const [g]=worker.groupEvents(result.events,at);
    expected.schools[id][sport]={error:result.error||null,rankings:(result.rankings||[]).map(r=>`${r.team_label?`${r.team_label} `:''}No. ${r.rank} ${r.poll}`),
      live:(g?.live||[]).map(cardLine),results:(g?.results||[]).map(cardLine),upcoming:(g?.upcoming||[]).map(cardLine)};
    console.log(id,sport,result.error||'ok',`${g?.results?.length||0} results, ${g?.upcoming?.length||0} upcoming`);
  }
}
globalThis.Date=RealDate;
const dir=new URL(`../tests/fixtures/${process.argv.find(a=>a.startsWith('--dir='))?.slice(6)||'hs-reference'}/`,import.meta.url);mkdirSync(dir,{recursive:true});
writeFileSync(new URL(`sources-${date}.json.gz`,dir),gzipSync(JSON.stringify(saved)));
writeFileSync(new URL(`expected-${date}.json`,dir),JSON.stringify(expected,null,1)+'\n');
console.log(`saved ${Object.keys(saved).length} sources; ${Object.values(saved).filter(s=>s.status!==200).length} not 200`);
