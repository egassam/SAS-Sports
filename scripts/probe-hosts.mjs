// Reads each school's homepage and volleyball schedule through the private
// source route, the way production reads them, before any setup (every
// conference session since the Big East did this by hand: a blocked school
// goes in docs/BLOCKED_SCHOOLS.md and is not built). Run it three times,
// spaced about 15-20 minutes apart, before calling a school blocked.
//
//   SAS_SOURCE_KEY=... SAS_SPORTS_BASE_URL=<branch preview> NODE_USE_ENV_PROXY=1 \
//     node scripts/probe-hosts.mjs <id> ...
// The school must be in the catalog the base URL serves (a school new to the
// catalog: push the entry and wait for the branch preview first).
import {readFileSync} from 'node:fs';

const ids=process.argv.slice(2).filter(a=>!a.startsWith('--')),key=process.env.SAS_SOURCE_KEY;
const base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
if(!ids.length||!key){console.error('usage: SAS_SOURCE_KEY=... node scripts/probe-hosts.mjs <id> ...');process.exit(2)}
const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8'));
const read=async url=>{
  try{
    const response=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
    const text=await response.text();
    return response.ok?`${response.status} ${Math.round(text.length/1024)} KB`:`${response.status} ${(text.match(/"detail":"([^"]{0,90})/)?.[1]||text.slice(0,90)).replace(/\s+/g,' ')}`;
  }catch(error){return `failed (${error.message})`}
};
let blocked=0;
await Promise.all(ids.map(async id=>{
  const school=schools.find(s=>s.id===id);
  if(!school){console.log(`${id}: not in the catalog`);blocked++;return}
  const host=school.athletics_url.replace(/\/$/,''),answers=await Promise.all(['/','/sports/womens-volleyball/schedule'].map(path=>read(host+path)));
  const ok=answers.some(a=>a.startsWith('200'));if(!ok)blocked++;
  console.log(`${ok?'READS  ':'REFUSED'} ${id} (${new URL(host).host}) at ${new Date().toISOString().slice(11,16)} UTC: homepage ${answers[0]}; volleyball ${answers[1]}`);
}));
process.exit(blocked?1:0);
