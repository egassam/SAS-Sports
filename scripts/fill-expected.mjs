// Fills the expected values of hand-written test checks: write
// `assert.deepEqual(actual,__FILL_NAME__)` (or pass __FILL_NAME__ to a helper that
// ends in assert.deepEqual), run this, and each placeholder is replaced by
// the value the code gives today. Read every filled value against the
// official page before committing: it records what the module reads, right
// or wrong.
//
//   node scripts/fill-expected.mjs tests/tennessee-module.mjs
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=process.argv[2];
if(!file){console.error('usage: node scripts/fill-expected.mjs <test file>');process.exit(2)}
const text=readFileSync(file,'utf8'),names=[...new Set(text.match(/__FILL_[A-Z0-9_]+__/g)||[])];
if(!names.length){console.log('no __FILL_NAME__ placeholders');process.exit(0)}
// A copy beside the original (its relative imports and fixtures resolve),
// whose placeholders are markers that assert.deepEqual records instead of
// comparing.
const probe=file.replace(/\.mjs$/,'.fill-probe.mjs');
const hook=`import __assert from 'node:assert/strict';{const deep=__assert.deepEqual;__assert.deepEqual=(actual,expected,...rest)=>{if(expected&&expected.__fill){console.log('FILL '+expected.__fill+' '+JSON.stringify(actual));return;}return deep(actual,expected,...rest);};}\n`;
writeFileSync(probe,hook+text.replace(/(__FILL_[A-Z0-9_]+__)/g,(all,name)=>`({__fill:'${name}'})`));
let run;try{run=spawnSync(process.execPath,[probe],{encoding:'utf8'})}finally{unlinkSync(probe)}
const values=new Map();
for(const line of run.stdout.split('\n')){const m=line.match(/^FILL (__FILL_\w+?__) (.*)$/);if(m)values.set(m[1],m[2])}
let next=text;
for(const name of names)if(values.has(name))next=next.split(name).join(values.get(name));
writeFileSync(file,next);
const missing=names.filter(name=>!values.has(name));
for(const name of names)if(values.has(name))console.log(`${name}: ${values.get(name).slice(0,300)}`);
if(missing.length){console.error(`not reached: ${missing.join(', ')}\n${run.stderr.split('\n').filter(l=>!/Warning|Reparsing|type.*module|trace-warnings/.test(l)).slice(0,12).join('\n')}`);process.exit(1)}
