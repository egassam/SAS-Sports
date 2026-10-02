#!/usr/bin/env node
// Download an official athletics page through the live app's private source
// route (/api/source), for pages whose bot defense refuses the development
// sandbox. Usage:
//   SAS_SOURCE_KEY=... node scripts/fetch-official.mjs <url> [output-file] [--gzip] [--base=https://...]
// The key is the Worker secret SOURCE_FETCH_KEY. The page is fetched exactly
// as the app fetches it (honest identity, robots.txt, caching, backoff).
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const args=process.argv.slice(2),flag=name=>args.find(a=>a.startsWith(`--${name}`));
const [url,output]=args.filter(a=>!a.startsWith('--'));
const base=(flag('base')?.split('=')[1]||process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const key=process.env.SAS_SOURCE_KEY;
if(!url){console.error('usage: node scripts/fetch-official.mjs <url> [output-file] [--gzip] [--base=...]');process.exit(2);}
if(!key){console.error('SAS_SOURCE_KEY is not set (the value of the Worker secret SOURCE_FETCH_KEY).');process.exit(2);}
const response=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`}});
const body=Buffer.from(await response.arrayBuffer());
console.error(`${response.status} ${response.headers.get('x-sas-final-url')||url} (${body.length} bytes, ${response.headers.get('x-sas-source')||'?'})`);
if(!response.ok){console.error(body.toString('utf8').slice(0,300));process.exit(1);}
if(output)writeFileSync(output,flag('gzip')?gzipSync(body,{level:9}):body);else process.stdout.write(body);
