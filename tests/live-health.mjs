// Daily live health check for the finished school modules. Every sponsored
// sport's feed is force-refreshed against production, spaced out, and must
// answer 200 with a JSON array (an empty array is a valid empty schedule).
// A sport that still fails after retries fails the run. First-attempt CPU
// limit errors (Cloudflare 1102) are counted too: above a small rate they
// fail the run even when retries succeed, because the app shows each one as
// "LIVE SOURCE UNAVAILABLE".
import {readFileSync,appendFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const base=(value('base')||process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const schoolIds=(value('schools')||'kstate,kansas,oklahoma-state,utah').split(',').filter(Boolean);
const MAX_FIRST_ATTEMPT_1102_RATE=Number(value('max-1102-rate')||0.05),ATTEMPTS=3,SPACING_MS=1500;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function feed(school,sport){
  const started=Date.now();
  try{
    const response=await fetch(`${base}/live/feed/grouped?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}&refresh=1`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(60000)});
    const text=await response.text();let body=null;try{body=JSON.parse(text)}catch{}
    const ok=response.status===200&&Array.isArray(body);
    const events=ok?body.reduce((n,g)=>n+['live','results','upcoming','other'].reduce((m,k)=>m+(g[k]||[]).length,0),0):null;
    return{ok,status:response.status,cpu:/error code:\s*1102|error-1102/i.test(text),detail:ok?`${events} events`:text.replace(/\s+/g,' ').slice(0,120),ms:Date.now()-started};
  }catch(error){return{ok:false,status:0,cpu:false,detail:String(error?.message||error).slice(0,120),ms:Date.now()-started}}
}
const rows=[];let first1102=0,requests=0;
for(const school of schoolIds){
  for(const sport of sponsored[school]||[]){
    let result,attempts=0,cpuErrors=0;
    while(attempts<ATTEMPTS){
      attempts++;result=await feed(school,sport);
      if(attempts===1){requests++;if(result.cpu)first1102++;}
      if(result.cpu)cpuErrors++;
      if(result.ok)break;
      console.log(`  retry ${school} ${sport}: HTTP ${result.status} · ${result.detail} (${result.ms} ms)`);
      await sleep(SPACING_MS*attempts*2);
    }
    rows.push({school,sport,ok:result.ok,status:result.status,attempts,cpuErrors,ms:result.ms,detail:result.detail});
    console.log(`${result.ok?'PASS':'FAIL'} ${school} ${sport}: HTTP ${result.status} after ${attempts} attempt(s)${cpuErrors?`, ${cpuErrors}× 1102`:''} · ${result.detail}`);
    await sleep(SPACING_MS);
  }
}
const failed=rows.filter(r=>!r.ok),rate=requests?first1102/requests:0;
const summary=[
  `## SAS Sports live health — ${new Date().toISOString()}`,``,`Base: ${base}`,``,
  `- Feeds: ${rows.length}, failing after ${ATTEMPTS} attempts: **${failed.length}**`,
  `- First-attempt Cloudflare 1102: **${first1102}/${requests}** (${(rate*100).toFixed(1)}%, limit ${(MAX_FIRST_ATTEMPT_1102_RATE*100).toFixed(0)}%)`,``,
  `| School | Sport | Result | HTTP | Attempts | 1102s | Time | Detail |`,`| --- | --- | --- | --- | --- | --- | --- | --- |`,
  ...rows.map(r=>`| ${r.school} | ${r.sport} | ${r.ok?'✅':'❌'} | ${r.status} | ${r.attempts} | ${r.cpuErrors} | ${r.ms} ms | ${r.detail.replace(/\|/g,'/')} |`)
].join('\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
console.log(`\n${rows.length} feeds; ${failed.length} failing; first-attempt 1102 ${first1102}/${requests}.`);
if(failed.length||rate>MAX_FIRST_ATTEMPT_1102_RATE){
  console.error(failed.length?`Failing feeds: ${failed.map(r=>`${r.school} ${r.sport}`).join(', ')}`:`Cloudflare 1102 rate ${(rate*100).toFixed(1)}% exceeds ${(MAX_FIRST_ATTEMPT_1102_RATE*100).toFixed(0)}%`);
  process.exit(1);
}
