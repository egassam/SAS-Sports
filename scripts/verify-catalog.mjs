// Compares the catalog's menu answers from D1 with the bundled copy, for
// every menu step (docs/CATALOG.md):
//   NODE_USE_ENV_PROXY=1 node scripts/verify-catalog.mjs --prod [--expect=d1]
//   NODE_USE_ENV_PROXY=1 node scripts/verify-catalog.mjs --branch=<branch> [--expect=bundled]
// Each step is read twice: as served (D1 when it holds the revision) and with
// ?source=bundled. The answers must be equal; --expect names the source the
// served answers must come from.
const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const base=args.includes('--prod')?'https://sas-sports.lovetogivepain.workers.dev':value('branch')?`https://${value('branch')}-sas-sports.lovetogivepain.workers.dev`:null;
if(!base){console.error('usage: verify-catalog.mjs (--prod | --branch=<branch>) [--expect=d1|bundled]');process.exit(2)}
const expect=value('expect');
const get=async path=>{const r=await fetch(base+path,{headers:{'cache-control':'no-cache'}});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return{body:await r.json(),source:(r.headers.get('x-sas-catalog')||'').split(' ')}};
const failures=[];let steps=0;const sources=new Set();
const step=async(level,group='',middle='')=>{
  const path=`/catalog/menu?level=${encodeURIComponent(level)}&group=${encodeURIComponent(group)}&middle=${encodeURIComponent(middle)}`;
  const [served,bundled]=await Promise.all([get(path),get(path+'&source=bundled')]);
  steps++;sources.add(served.source.join(' '));
  if(JSON.stringify(served.body)!==JSON.stringify(bundled.body))failures.push(`${level} / ${group||'All'} / ${middle||'All'}: served (${served.source[0]}) differs from bundled`);
  if(expect&&served.source[0]!==expect)failures.push(`${level} / ${group||'All'} / ${middle||'All'}: served from ${served.source[0]}, expected ${expect}`);
  return served.body;
};
for(const level of ['high-school','college','pro']){
  const top=await step(level);
  for(const group of top.groups){
    const menu=await step(level,group);
    for(const middle of menu.middles)await step(level,group,middle);
  }
}
const ids=['kstate','manhattan-ks','nascar-cup-series','imsa-weathertech','nobody'].join(',');
const [a,b]=await Promise.all([get(`/catalog/entries?ids=${ids}`),get(`/catalog/entries?ids=${ids}&source=bundled`)]);
if(JSON.stringify(a.body)!==JSON.stringify(b.body))failures.push('entries by id differ');
console.log(`${base}: ${steps} menu steps, source ${[...sources].join(', ')}; entries by id ${a.body.length}`);
for(const f of failures)console.log(`FAIL ${f}`);
console.log(failures.length?`${failures.length} failures`:'Catalog checks passed: served answers equal the bundled copy.');
process.exit(failures.length?1:0);
