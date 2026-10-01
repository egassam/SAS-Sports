// CPU budget for schedule parsing. Large official pages (~900 KB SIDEARM
// pages) once cost 177-417 ms of CPU each because the whole page was
// re-read for every game card, which intermittently exceeded the Worker's
// CPU limit (Cloudflare 1102, "LIVE SOURCE UNAVAILABLE" in the app).
// Every saved official page is parsed for every school module whose site it
// belongs to. The deterministic guard counts whole-page text conversions per
// parse; the time budget is a generous backstop that does not depend on a
// fast machine.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
// Count every visibleText call on a large input (a whole page, not a card).
const LARGE=100000;
let largeReads=0;
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={')
  .replace('function visibleText(raw){','function visibleText(raw){if(typeof raw==="string"&&raw.length>'+LARGE+')__largeRead();');
assert.ok(source.includes('__largeRead()'),'visibleText instrumentation must apply');
const fetch=async url=>{throw Error(`Unexpected network request: ${url}`);};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch,__largeRead:()=>{largeReads++;}};
const worker=Function(...Object.keys(deps),source+';return {parseHtml};')(...Object.values(deps));

// Official pages by the site they come from. Roster pages are never parsed
// as schedules, so they are not part of this budget.
const hosts={kstate:'kstatesports.com',kansas:'kuathletics.com','oklahoma-state':'okstate.com',utah:'utahutes.com','arizona-state':'thesundevils.com',byu:'byucougars.com'};
const pages=[];
const walk=dir=>{for(const name of readdirSync(dir)){const path=`${dir}/${name}`;if(statSync(path).isDirectory())walk(path);else if(/\.html(?:\.gz)?$/.test(name)&&!/roster/i.test(name))pages.push(path);}};
walk(new URL('./fixtures',import.meta.url).pathname);
const MAX_LARGE_READS=4,MAX_MS=Number(process.env.PARSE_BUDGET_MS||400),now=new Date('2026-09-30T18:00:00Z');
let checked=0,worst={ms:0};
for(const path of pages){
  const bytes=readFileSync(path),raw=path.endsWith('.gz')?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8');
  for(const [id,host] of Object.entries(hosts)){
    if(!raw.includes(host))continue;
    const school=schools.find(s=>s.id===id);
    for(const sport of ['Football','Cross Country','Golf']){
      const url=`https://${id==='kstate'?'www.':''}${host}/sports/${sport.toLowerCase().replace(/ /g,'-')}/schedule`;
      largeReads=0;
      worker.parseHtml(raw,school,sport,url,now);
      const reads=largeReads,start=process.hrtime.bigint();
      worker.parseHtml(raw,school,sport,url,now);
      const ms=Number(process.hrtime.bigint()-start)/1e6;
      const label=`${path.split('/fixtures/')[1]} as ${id} ${sport}`;
      assert.ok(reads<=MAX_LARGE_READS,`${label}: ${reads} whole-page text conversions in one parse (max ${MAX_LARGE_READS}); something re-reads the page per card`);
      assert.ok(ms<=MAX_MS,`${label}: ${ms.toFixed(0)} ms to parse (budget ${MAX_MS} ms)`);
      if(ms>worst.ms)worst={ms,label,reads,kb:raw.length>>10};
      checked++;
    }
  }
}
assert.ok(checked>=20,`expected to parse the saved official pages, parsed ${checked}`);
console.log(`Parse budget checks passed: ${checked} page parses; slowest ${worst.ms.toFixed(0)} ms (${worst.label}, ${worst.kb} KB, ${worst.reads} whole-page reads).`);
