// Runs a package.json test chain ("a && b && c") with several commands at a
// time (user, November 6, 2026: "These builds keep taking a long time. How
// can we speed this up?", then "Go ahead with 1-4"). The list stays the
// script named on the command line, so adding a test is unchanged: append
// "&& node tests/<name>.mjs" to it. Each command's output is printed whole
// when it ends; a failed command's output is printed again at the end, and
// the run exits 1 if any failed (every command still runs, as CI would want
// the whole list). The slowest commands are listed, to find what to split.
//
//   node scripts/run-tests.mjs <script> [--jobs=N]   (default: the machine's CPUs)
//
// The test files share no files or ports (checked November 6: no server,
// no writes outside the OS temp directory).
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';

const args=process.argv.slice(2),name=args.find(a=>!a.startsWith('--'));
const jobs=Math.max(1,Number((args.find(a=>a.startsWith('--jobs='))||'').slice(7))||availableParallelism());
const scripts=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
if(!name||!scripts[name]){console.error('usage: node scripts/run-tests.mjs <package.json script> [--jobs=N]');process.exit(2)}
export const commandsOf=chain=>chain.split('&&').map(c=>c.trim()).filter(Boolean);
const commands=commandsOf(scripts[name]);

function run(command){
  return new Promise(resolve=>{
    const started=Date.now(),child=spawn(command,{shell:true,cwd:new URL('..',import.meta.url),env:process.env});
    let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
    child.on('close',code=>resolve({command,code,output,ms:Date.now()-started}));
  });
}
const started=Date.now(),results=[];
// Syntax checks first (quick, and nothing else is worth running if they fail).
for(const c of commands.filter(c=>/^node --check\b/.test(c))){const r=await run(c);results.push(r);process.stdout.write(r.output);if(r.code){console.error(`FAILED: ${c}`);process.exit(1)}}
const queue=commands.filter(c=>!/^node --check\b/.test(c));
let next=0;
await Promise.all(Array.from({length:Math.min(jobs,queue.length)},async()=>{
  while(next<queue.length){const r=await run(queue[next++]);results.push(r);process.stdout.write(r.output);if(r.code)console.error(`FAILED (${r.code}): ${r.command}`);}
}));
const failed=results.filter(r=>r.code);
console.log(`\n${results.length} commands, ${jobs} at a time, ${Math.round((Date.now()-started)/1000)} s.`);
console.log('Slowest: '+[...results].sort((a,b)=>b.ms-a.ms).slice(0,8).map(r=>`${r.command.replace(/^node (?:--\S+ )*/,'')} ${Math.round(r.ms/1000)} s`).join(', '));
if(failed.length){
  for(const r of failed)console.error(`\n--- FAILED (${r.code}): ${r.command}\n${r.output}`);
  console.error(`\n${failed.length} of ${results.length} failed: ${failed.map(r=>r.command).join('; ')}`);
  process.exit(1);
}
