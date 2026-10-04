// Release gate for AGENTS.md item 6, in one command. Runs against a branch
// preview (before merging) or production (after merging) and prints the
// lines the handoff records:
//   - /api/status answers (and carries --version when given);
//   - K-State XC keeps 18/20 rows and KU XC 26/21;
//   - every changed sport: N forced refreshes (refresh=1), all HTTP 200 JSON,
//     no Cloudflare 1102 or 503;
//   - every changed sport's results in K-State's form (Final status, a
//     headline) and every final's expanded view answering 200.
// The visual check of the page itself stays manual.
//
//   NODE_USE_ENV_PROXY=1 node scripts/verify-release.mjs --branch=<branch> --school=colorado --sports="Football,Soccer"
//   NODE_USE_ENV_PROXY=1 node scripts/verify-release.mjs --prod --school=colorado --sports=all --refreshes=3
import {readFileSync} from 'node:fs';

const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const args=process.argv.slice(2),flag=name=>args.includes(`--${name}`),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const PROD='https://sas-sports.lovetogivepain.workers.dev';
// Preview hosts are the branch name, lower-cased, with anything but letters,
// digits and dashes turned into dashes (Workers Builds' alias rule).
const previewBase=branch=>`https://${branch.toLowerCase().replace(/[^a-z0-9-]/g,'-')}-sas-sports.lovetogivepain.workers.dev`;
const base=(value('base')||(value('branch')?previewBase(value('branch')):flag('prod')?PROD:'')).replace(/\/$/,'');
const school=value('school'),sportsArg=value('sports')||'';
const refreshes=Number(value('refreshes')||(flag('prod')?3:36)),spacing=Number(value('spacing-ms')||400),expectVersion=value('version');
if(!base||!school||!sportsArg){
  console.error('usage: verify-release.mjs (--branch=<branch> | --prod | --base=<url>) --school=<id> --sports=<Sport,Sport|all> [--refreshes=36] [--version=<v>] [--no-expanded]');
  process.exit(2);
}
if(!sponsored[school]){console.error(`unknown school ${school}`);process.exit(2)}
const sports=sportsArg==='all'?sponsored[school]:sportsArg.split(',').map(s=>s.trim()).filter(Boolean);
for(const sport of sports)if(!sponsored[school].includes(sport)){console.error(`${school} does not sponsor ${sport}`);process.exit(2)}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[],lines=[];
const report=(ok,text)=>{lines.push(`${ok?'PASS':'FAIL'} ${text}`);console.log(`${ok?'PASS':'FAIL'} ${text}`);if(!ok)failures.push(text)};
async function get(path,{tries=1}={}){
  let last;
  for(let attempt=1;attempt<=tries;attempt++){
    const started=Date.now();
    try{
      const response=await fetch(base+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(60000)});
      const text=await response.text();let body=null;try{body=JSON.parse(text)}catch{}
      last={status:response.status,body,text,ms:Date.now()-started,cpu:/error code:\s*1102|error-1102/i.test(text)};
    }catch(error){last={status:0,body:null,text:String(error?.message||error),ms:Date.now()-started,cpu:false}}
    if(last.status===200&&last.body)return last;
    if(attempt<tries)await sleep(1500*attempt);
  }
  return last;
}
const feedPath=(id,sport,refresh)=>`/live/feed/grouped?school=${encodeURIComponent(id)}&sport=${encodeURIComponent(sport)}${refresh?'&refresh=1':''}`;
const finals=body=>(Array.isArray(body)?body:[]).flatMap(g=>g.results||[]);
const count=body=>(Array.isArray(body)?body:[]).reduce((n,g)=>n+['live','results','upcoming','other'].reduce((m,k)=>m+(g[k]||[]).length,0),0);

console.log(`Base: ${base}\nSchool: ${school}\nSports: ${sports.join(', ')}\n`);

const status=await get('/api/status',{tries:3});
const version=status.body?.version;
report(status.status===200&&(!expectVersion||version===expectVersion),`/api/status HTTP ${status.status} · ${version||status.text.slice(0,80)}${expectVersion?` (expected ${expectVersion})`:''}`);

// The two cross-country baselines every gate carries. A first read right
// after a deploy has twice lacked K-State's meets on a preview, so each gets
// up to three reads before it counts as failing.
const xcBaselines=[
  {id:'kstate',label:'K-State XC',want:{'Gans Creek':18,'Platte River':20}},
  {id:'kansas',label:'KU XC',want:{'Gans Creek':26,'Bob Timmons':21}},
];
for(const xc of xcBaselines){
  let got=null;
  for(let attempt=1;attempt<=3;attempt++){
    const res=await get(feedPath(xc.id,'Cross Country',true),{tries:2});
    const rows=Object.fromEntries(Object.keys(xc.want).map(name=>[name,finals(res.body).find(e=>(e.title||'').includes(name))?.results?.length??0]));
    got=rows;if(Object.entries(xc.want).every(([k,v])=>rows[k]===v))break;
    await sleep(2000);
  }
  const text=Object.keys(xc.want).map(k=>got[k]).join('/'),want=Object.values(xc.want).join('/');
  report(text===want,`${xc.label} ${text} (want ${want})`);
}

for(const sport of sports){
  // Forced refreshes: every one must be a 200 JSON array.
  let ok=0,cpu=0,s503=0,other=[],slowest=0,events=null;
  for(let i=0;i<refreshes;i++){
    const res=await get(feedPath(school,sport,true));
    slowest=Math.max(slowest,res.ms);
    if(res.status===200&&Array.isArray(res.body)){ok++;events=count(res.body)}
    else{if(res.cpu)cpu++;else if(res.status===503)s503++;else other.push(res.status)}
    await sleep(spacing);
  }
  report(ok===refreshes,`${school} ${sport}: ${ok}/${refreshes} forced refreshes HTTP 200${cpu?` · ${cpu}× 1102`:''}${s503?` · ${s503}× 503`:''}${other.length?` · other ${[...new Set(other)].join(',')}`:''} · ${events??'?'} events · slowest ${slowest} ms`);

  // K-State's form for results: every final has a status and a headline
  // (`W, 31-17`, `Women's team: 1st · 15 pts`, `13th of 20`).
  const feed=await get(feedPath(school,sport,false),{tries:3});
  const results=finals(feed.body);
  const bare=results.filter(e=>!e.headline||/^(completed|final)$/i.test(String(e.headline).trim()));
  report(feed.status===200&&!bare.length,`${school} ${sport}: ${results.length} results${bare.length?`, ${bare.length} without a result line (${bare.slice(0,3).map(e=>e.title).join('; ')})`:', each with a result line'}`);

  if(flag('no-expanded'))continue;
  // Every final's expanded view answers 200 with its own event. AI timeouts
  // (`ai_failed`) are listed, not failed: the page asks once more.
  const states={};let bad=[];
  for(const event of results){
    const res=await get(`/live/highlights?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}&event_id=${encodeURIComponent(event.id)}`,{tries:2});
    if(res.status!==200||res.body?.id!==event.id){bad.push(`${event.title}: HTTP ${res.status}`);continue}
    const state=res.body.highlight_state||'none';states[state]=(states[state]||0)+1;
    await sleep(spacing);
  }
  const summary=Object.entries(states).map(([k,v])=>`${k} ${v}`).join(', ')||'no finals';
  report(!bad.length,`${school} ${sport}: expanded views ${results.length-bad.length}/${results.length} (${summary})${bad.length?` · ${bad.slice(0,3).join('; ')}`:''}`);
}

console.log(`\n${failures.length?`${failures.length} check(s) failed`:'All checks passed'} on ${base}. Still check the sport's cards and expanded views on the page itself.`);
process.exit(failures.length?1:0);
