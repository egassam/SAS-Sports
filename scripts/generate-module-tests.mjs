// Writes the generated part of tests/<id>-module.mjs from the saved fixtures,
// the step every conversion did by hand or with a throwaway script:
//   - the route table (`const parity=...`) from the module's current routes;
//   - one block per schedule page: every event in K-State's wording (`line(e)`,
//     before any story or TFRRS is attached), and each final's own recap only
//     (ownRecapsOnly) when its story is saved.
// The block sits between `// BEGIN generated` and `// END generated` and is
// replaced on each run; hand-written checks (rules, TFRRS, live, records)
// stay outside it. Read the output before committing: it records what the
// module reads today, right or wrong (scripts/survey-school.mjs flags GATE).
//
//   node scripts/generate-module-tests.mjs --school=lsu [--date=2026-10-07]   (default: the test file's `now`)
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school');
if(!id){console.error('usage: node scripts/generate-module-tests.mjs --school=<id> [--date=YYYY-MM-DD]');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const schools=JSON.parse(read('src/schools.json')),sponsored=JSON.parse(read('src/sponsored-sports.json'));
const school=schools.find(s=>s.id===id);if(!school){console.error(`unknown school ${id}`);process.exit(2)}
const testPath=`tests/${id}-module.mjs`;if(!existsSync(new URL(testPath,root))){console.error(`${testPath} does not exist (scripts/scaffold-school.mjs writes it)`);process.exit(2)}
const source=read('src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports:sponsored,rosterSocialInstagrams,extractText:()=>{throw Error('no PDFs')},fetch:()=>{throw Error('no network')}};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,labelTeamEvents};')(...Object.values(deps));
const dir=`tests/fixtures/${id}-module/`,has=name=>existsSync(new URL(dir+name,root));
const fixture=name=>gunzipSync(readFileSync(new URL(dir+name,root))).toString('utf8');
// The test file's own clock (`const now=new Date("...")`) unless --date is
// given: today's date breaks the generated blocks after midnight UTC.
const fileNow=(read(testPath).match(/^const now=new Date\("(\d{4}-\d\d-\d\d)T/m)||[])[1];
const now=new Date(`${value('date')||fileNow||new Date().toISOString().slice(0,10)}T15:00:00Z`);
// Undated story addresses (Arkansas's /<slug>/) have no saved recap name.
const recapFile=url=>{const m=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);if(!m)return null;const [,y,m2,d,slug]=m;return`recap-${y}-${m2}-${d}-${slug.slice(0,40)}.html.gz`;};
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const sports=sponsored[id];

// The route table.
const parity=Object.fromEntries(sports.map(sport=>[sport,{schedule:worker.candidateUrls(school,sport),roster:worker.rosterUrls(school,sport),combined:worker.schoolCombinedSports(school).has(sport)}]));
let test=read(testPath).replace(/^const parity=.*;$/m,()=>`const parity=${JSON.stringify(parity)};`);

// One block per schedule page.
const blocks=[],recaps=[];let missing=0;
for(const sport of sports)for(const url of worker.candidateUrls(school,sport)){
  const slug=(new URL(url).pathname.match(/^\/sports?\/([^/]+)\/schedule/)||[])[1];
  if(!slug||!has(`${slug}-schedule.html.gz`))continue;
  const events=worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,url,now),school,sport,url);
  // One page can serve two sports (Texas's "Track & Field / Cross Country"):
  // the second takes its sport's name too.
  let name=`v_${slug.replace(/\W+/g,'')}`;
  if(blocks.some(block=>block.startsWith(`  const ${name}=`)))name+=`_${sport.replace(/\W+/g,'').toLowerCase()}`;
  blocks.push(`  const ${name}=parse(${JSON.stringify(sport)},${JSON.stringify(slug)});\n  assert.deepEqual(${name}.map(line),${JSON.stringify(events.map(line),null,1).replace(/\n/g,'\n')});`);
  const saved=events.filter(e=>e.recap_url).every(e=>recapFile(e.recap_url)&&has(recapFile(e.recap_url)));
  if(saved)recaps.push(`  ownRecapsOnly(${name},${JSON.stringify(`${sport} ${slug}`)});`);else missing++;
}
const generated=`// BEGIN generated (scripts/generate-module-tests.mjs --school=${id})\n// Every sport in K-State's results format, as the official pages publish it.\n{\n${blocks.join('\n')}\n${recaps.join('\n')}\n}\n// END generated\n`;
if(/\/\/ BEGIN generated[\s\S]*?\/\/ END generated\n/.test(test))test=test.replace(/\/\/ BEGIN generated[\s\S]*?\/\/ END generated\n/,()=>generated);
else test=test.replace(/^void \[parse,line,ownRecapsOnly,live\];\n/m,all=>`${all}\n${generated}`);
writeFileSync(new URL(testPath,root),test);
console.log(`${testPath}: route table and ${blocks.length} page blocks written (${recaps.length} with recap checks${missing?`; ${missing} pages lack a saved story, so their recaps are not checked`:''}).`);
