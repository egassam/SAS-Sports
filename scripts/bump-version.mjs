// Bumps the Worker's VERSION before a push, so /api/status tells every
// preview build apart (Oct 18: a fix pushed under the same version could
// not be told from the build before it).
//
//   node scripts/bump-version.mjs                       4.111.1-x -> 4.111.2-x
//   node scripts/bump-version.mjs --label=texas-state   4.111.2-x -> 4.112.0-texas-state
//   node scripts/bump-version.mjs --wait=<branch>       then wait until the branch preview serves it
import {readFileSync,writeFileSync} from 'node:fs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const file=new URL('../src/index.js',import.meta.url),text=readFileSync(file,'utf8');
const match=text.match(/const VERSION='(\d+)\.(\d+)\.(\d+)-([^']+)';/);
if(!match){console.error('VERSION not found in src/index.js');process.exit(2)}
const [,major,minor,patch,label]=match,wait=value('wait');
let version=match[0].slice(15,-2);
if(!args.includes('--keep')){
  version=value('label')?`${major}.${Number(minor)+1}.0-${value('label')}`:`${major}.${minor}.${Number(patch)+1}-${label}`;
  writeFileSync(file,text.replace(match[0],`const VERSION='${version}';`));
  console.log(`VERSION ${match[0].slice(15,-2)} -> ${version}`);
}
if(wait){
  // The branch preview deploys after the push; give it up to 15 minutes.
  const url=`https://${wait}-sas-sports.lovetogivepain.workers.dev/api/status`,started=Date.now();
  for(;;){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(r.ok&&(await r.json()).version===version){console.log(`preview serves ${version} after ${Math.round((Date.now()-started)/1000)} s`);break;}}catch{}
    if(Date.now()-started>15*60000){console.error(`preview did not serve ${version} within 15 minutes`);process.exit(1)}
    await new Promise(done=>setTimeout(done,10000));
  }
}
