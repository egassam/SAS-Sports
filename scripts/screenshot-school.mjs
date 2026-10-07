// Screenshots each sport of a school on a preview (or production) page, the
// "page by eye" step of the release gate, in one command:
//   node scripts/screenshot-school.mjs --school=iowa-state --branch=<branch> [--sports="A,B"] [--out=<dir>]
//   node scripts/screenshot-school.mjs --school=iowa-state --prod  [--tz=America/Denver]
// Writes <out>/<school>-<sport>.png (390px wide, the phone layout) and prints
// each sport's first lines of text. Uses the sandbox's Chromium and trusts the
// agent proxy's CA (see docs/SAS_SPORTS_CURRENT_SESSION.md, Working notes).
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash,X509Certificate} from 'node:crypto';
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school');
if(!id||!(value('branch')||args.includes('--prod'))){console.error('usage: node scripts/screenshot-school.mjs --school=<id> (--branch=<branch> | --prod) [--sports="A,B"] [--out=<dir>]');process.exit(2)}
const base=args.includes('--prod')?'https://sas-sports.lovetogivepain.workers.dev':`https://${value('branch')}-sas-sports.lovetogivepain.workers.dev`;
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const sports=value('sports')?.split(',').map(s=>s.trim())||sponsored[id];
const out=value('out')||'screenshots';mkdirSync(out,{recursive:true});

// Playwright: the project's, else the globally installed one.
let playwright;
try{playwright=await import('playwright');}catch{playwright=createRequire(execSync('npm root -g').toString().trim()+'/')('playwright');}
const launchArgs=[];
const ca='/root/.ccr/agent-proxy-ca.crt';
if(existsSync(ca)){
  const key=new X509Certificate(readFileSync(ca)).publicKey.export({type:'spki',format:'der'});
  launchArgs.push(`--ignore-certificate-errors-spki-list=${createHash('sha256').update(key).digest('base64')}`);
}
const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
const browser=await playwright.chromium.launch({channel:'chromium',args:launchArgs,...(proxy?{proxy:{server:proxy}}:{})});
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:value('tz')||'America/Chicago'});
await page.goto(`${base}/?school=${encodeURIComponent(id)}`,{waitUntil:'networkidle',timeout:90000});
for(const sport of sports){
  await page.selectOption('#sportFilter',sport).catch(()=>{});
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle',{timeout:60000}).catch(()=>{});
  // The page's default sport is already selected (no change event): wait
  // for its first load to finish.
  await page.waitForFunction(()=>!/Loading the selected sport/.test(document.querySelector('#feed')?.innerText||''),null,{timeout:60000}).catch(()=>{});
  const file=`${out}/${id}-${sport.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;
  await page.screenshot({path:file,fullPage:true});
  const text=(await page.locator('#feed').innerText().catch(()=>'')).split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8).join(' | ');
  console.log(`${sport}: ${file}\n  ${text}`);
}
await browser.close();
