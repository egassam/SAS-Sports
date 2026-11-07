// The browser check for the middle and high school reference (user, November
// 6, 2026: "There's been too many mess ups"; #544: Manhattan's page showed
// only soccer and cross country because a device's old saved copy hid the
// other sports). Each reference school's team page is opened at phone width
// with a realistic device state: every sport's saved copy two days old, one
// of them (football) holding only an old game. The page must then show every
// in-season sport the Worker lists, with its ranks where MaxPreps ranks it.
//
//   node scripts/check-reference-page.mjs --base=https://<branch>-sas-sports.lovetogivepain.workers.dev
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {readFileSync} from 'node:fs';
import {REFERENCE_SCHOOLS} from '../tests/hs-reference-lib.mjs';

const arg=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const base=(arg('base')||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const failures=[];const report=(ok,text)=>{console.log(`${ok?'PASS':'FAIL'} ${text}`);if(!ok)failures.push(text);};
const browser=await chromium.launch();
try{
  for(const id of REFERENCE_SCHOOLS){
    // What the Worker lists for each sport now.
    const feeds=await Promise.all(sponsored[id].map(async sport=>{
      const r=await fetch(`${base}/live/feed/grouped?school=${id}&sport=${encodeURIComponent(sport)}`,{signal:AbortSignal.timeout(60000)});
      const body=r.ok?await r.json():[];return{sport,group:Array.isArray(body)?body[0]:null};
    }));
    const inSeason=feeds.filter(f=>f.group?.in_season&&['live','results','upcoming'].some(k=>f.group[k]?.length)).map(f=>f.sport);
    const old=new Date(Date.now()-2*864e5).toISOString();
    const seed=Object.fromEntries(feeds.filter(f=>f.group).map(({sport,group})=>[`sas-feed:${id}|${sport}`,JSON.stringify({at:old,groups:[sport==='Football'?{...group,live:[],upcoming:[],results:(group.results||[]).slice(-1)}:group]})]));
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.addInitScript(entries=>{try{for(const [k,v] of Object.entries(entries))localStorage.setItem(k,v)}catch{}},seed);
    await page.goto(`${base}/?school=${id}`,{waitUntil:'domcontentloaded',timeout:60000});
    // The team page ("All in-season sports") reads every in-season sport and
    // says so: "… · 9/9 sports reached". Each sport with a game or meet in the
    // last or next 7 days (Home's window) is on the page.
    await page.waitForFunction(()=>/\d+\/\d+ sports reached/.test(document.body.innerText),null,{timeout:120000}).catch(()=>{});
    const status=await page.evaluate(()=>(document.body.innerText.match(/(\d+)\/(\d+) sports reached[^\n]*/)||[''])[0]);
    const [,ok,asked]=status.match(/(\d+)\/(\d+)/)||[];
    report(Number(ok)===inSeason.length&&Number(asked)===inSeason.length,`${id}: ${status||'no status line'} (in season: ${inSeason.length})`);
    const near=feeds.filter(({sport,group})=>inSeason.includes(sport)&&['live','results','upcoming'].some(k=>(group[k]||[]).some(e=>Math.abs(Date.parse(e.start_time)-Date.now())<=7*864e5))).map(f=>f.sport);
    const text=(await page.evaluate(()=>document.body.innerText)).toLowerCase();
    const missing=near.filter(s=>!text.includes(s.toLowerCase()));
    report(!missing.length,`${id}: every sport with a game this week is shown (${near.join(', ')||'none'})${missing.length?`; missing ${missing.join(', ')}`:''}`);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    report(width<=390,`${id}: no sideways scroll at 390 px (${width})`);
    // One sport's own page shows its ranks after the record.
    for(const {sport,group} of feeds)if(group?.rankings?.length){
      await page.selectOption('#sportFilter',sport).catch(()=>{});
      await page.waitForSelector(`section.sport .sport-record`,{timeout:60000}).catch(()=>{});
      const record=await page.$eval('section.sport .sport-record',x=>x.textContent).catch(()=>'');
      report(/No\.\s*\d+/.test(record),`${id} ${sport}: ranks shown ("${record.trim().slice(0,80)}")`);
    }
    await page.close();
  }
}finally{await browser.close();}
console.log(failures.length?`\n${failures.length} FAIL`:'\nAll reference page checks passed');
process.exit(failures.length?1:0);
