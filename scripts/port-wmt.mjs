// Starts a freshly scaffolded WMT school from a converted WMT card reader, the
// steps Iowa and Nebraska took by hand (about 25 minutes each):
//   - the school object in the WMT shape (cardSports, combinedSports,
//     teamLabels, routes): each sport keeps the scaffold's candidate routes
//     that the site's own menu links (/sports/<slug>/schedule), the homepage
//     and guessed addresses dropped; two team pages make a combined sport,
//     labeled by their mens-/womens- (or m/w) prefixes;
//   - the reader itself: scripts/port-handlers.mjs from the source module
//     (renamed; host and TFRRS line kept from the scaffold);
//   - src/index.js: the source's SCHOOL_MODULES entry and handlers line,
//     renamed, in place of the scaffold's SIDEARM ones;
//   - tests/<id>-module.mjs: the source's test harness, renamed, with an
//     empty generated block for scripts/generate-module-tests.mjs.
// scripts/start-schools.mjs runs it for a WMT site (--wmt-from=, default
// nebraska: Nebraska's card generation, schedule-event-item-default__*, is
// also Miami's and Virginia's; iowa for Vanderbilt's schedule-item-team cards).
//
//   NODE_USE_ENV_PROXY=1 node scripts/port-wmt.mjs --from=nebraska --to=miami
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const from=value('from')||'nebraska',to=value('to');
if(!to){console.error('usage: node scripts/port-wmt.mjs --from=<converted WMT id> --to=<scaffolded id>');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),write=(path,text)=>writeFileSync(new URL(path,root),text);
const schools=JSON.parse(read('src/schools.json')),sponsored=JSON.parse(read('src/sponsored-sports.json'));
const names=id=>{const camel=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return{id,camel,Pascal:camel[0].toUpperCase()+camel.slice(1),CONST:id.replace(/-/g,'_').toUpperCase(),name:schools.find(s=>s.id===id)?.name}};
const a=names(from),b=names(to),school=schools.find(s=>s.id===to);
if(!school||!sponsored[to]){console.error(`${to}: not in src/schools.json and src/sponsored-sports.json (run add-school first)`);process.exit(2)}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const host=new URL(school.athletics_url).hostname.replace(/^www\./,'');

// 1. Routes: the scaffold's candidates the site's menu links.
const scaffold=read(`src/schools/${to}.mjs`);
const mod=await import(new URL(`src/schools/${to}.mjs?scaffold=${Date.now()}`,root));
const object=mod[`${b.camel}School`];
let nav=new Set();
try{const r=await fetch(school.athletics_url,{signal:AbortSignal.timeout(20000)});if(r.ok)nav=new Set([...(await r.text()).matchAll(/\/sports\/([a-z0-9-]+)\/schedule\b/gi)].map(m=>m[1].toLowerCase()));}catch{}
const slugOf=url=>{try{return(new URL(url).pathname.match(/^\/sports\/([^/]+)\/schedule\/?$/)||[])[1]||null;}catch{return null}};
const sports=sponsored[to],schedule={},roster={},combined=[],labels={},notes=[];
for(const sport of sports){
  const candidates=[].concat(object.scheduleUrls?.[`${to}|${sport}`]||[]).map(slugOf).filter(Boolean);
  let slugs=[...new Set(candidates)].filter(slug=>!nav.size||nav.has(slug));
  // A one-team sport the menu links under its team prefix only
  // (Northwestern's womens-cross-country, womens-fencing).
  if(!slugs.length&&nav.size)slugs=[...new Set(candidates.flatMap(slug=>[`womens-${slug}`,`mens-${slug}`]))].filter(slug=>nav.has(slug)).slice(0,2);
  if(!slugs.length){slugs=candidates.slice(0,1);notes.push(`${sport}: no route in the site's menu; kept ${slugs[0]?`/sports/${slugs[0]}/schedule`:'nothing'} (check by eye)`)}
  // Two team pages: men's and women's (mens-golf/womens-golf, mbball/wbball).
  if(slugs.length>2)slugs=slugs.filter(s=>/^(?:mens|womens)-/.test(s)).slice(0,2);
  schedule[sport]=slugs;roster[sport]=slugs;
  if(slugs.length===2){
    combined.push(sport);
    for(const slug of slugs){const women=/^womens?-|^w(?=[a-z]{3,})(?!restl)/.test(slug);labels[`/sports/${slug}/schedule`]=women?"Women's":"Men's";}
  }
}
const list=slugs=>slugs.length===1?`'https://${host}/sports/${slugs[0]}/%s'`:`[${slugs.map(s=>`'https://${host}/sports/${s}/%s'`).join(',')}]`;
const routes=(kind)=>sports.filter(s=>schedule[s].length).map(s=>`    '${to}|${s}':${list(schedule[s]).replaceAll('%s',kind)}`).join(',\n');
const live=(scaffold.match(/  liveScoreboards:\{[\s\S]*?\n  \},\n/)||[''])[0];
const head=`// ${school.name} school module. Shared publisher utilities stay in the Worker;
// this file owns ${host} routes, ${school.name}'s program combinations, its
// verified Instagram tags and its schedule reader (WMT cards, ${a.name}'s
// reader: src/schools/${from}.mjs; scripts/port-wmt.mjs).
export const ${b.camel}School={
  id:'${to}',
  // Sports whose official schedule cards this module reads itself. Every
  // other sport keeps the shared parsers.
  cardSports:new Set([${sports.map(s=>`'${s}'`).join(',')}]),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
${live}  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set([${combined.map(s=>`'${s}'`).join(',')}]),
  teamLabels:{${Object.entries(labels).map(([k,v])=>`'${k}':"${v}"`).join(',')}},
  verifiedInstagrams:{},
  scheduleUrls:{
${routes('schedule')}
  },
  rosterUrls:{
${routes('roster')}
  }
};
`;
const tail=scaffold.slice(scaffold.indexOf('\nconst HOST=')+1);
const imports=scaffold.split('\n').filter(l=>l.startsWith('import ')).join('\n');
write(`src/schools/${to}.mjs`,`${imports}\n\n${head}\n${tail}`);

// 2. The reader: port-handlers keeps this head and the scaffold's host and
// TFRRS line, and carries the source's imports.
const port=spawnSync(process.execPath,['scripts/port-handlers.mjs',`--from=${from}`,`--to=${to}`],{cwd:new URL('.',root).pathname,encoding:'utf8'});
if(port.status){console.error(port.stderr||port.stdout);process.exit(1)}

// 3. src/index.js: the source's entry and handlers line, renamed.
// create<Source>Handlers too (Northwestern's first port kept createNebraskaHandlers).
const rename=text=>text.replace(new RegExp(`\\bcreate${escape(a.Pascal)}Handlers\\b`,'g'),`create${b.Pascal}Handlers`).replace(new RegExp(`\\b${escape(a.camel)}(?=Handlers|School)`,'g'),b.camel).replace(new RegExp(`\\bis${escape(a.Pascal)}(?=[A-Z])`,'g'),`is${b.Pascal}`).replace(new RegExp(`'${escape(a.id)}'`,'g'),`'${b.id}'`);
let index=read('src/index.js');
const entry=id=>{const n=names(id),start=index.indexOf(`  ,{school:${n.camel}School,`);if(start<0)return null;const rest=index.slice(start+3),end=rest.search(/\n  ,\{school:|\n\];\nconst schoolModule=/);return index.slice(start,start+3+end)};
const sourceEntry=entry(from),targetEntry=entry(to);
if(!sourceEntry||!targetEntry){console.error('SCHOOL_MODULES entries not found');process.exit(1)}
index=index.replace(targetEntry,rename(sourceEntry));
const handlersLine=id=>(index.match(new RegExp(`^const ${escape(names(id).camel)}Handlers=create\\w+Handlers\\([^\\n]*\\);$`,'m'))||[])[0];
index=index.replace(handlersLine(to),rename(handlersLine(from)));
write('src/index.js',index);

// 4. Tests: the source's harness, renamed, with an empty generated block.
const sourceTest=read(`tests/${from}-module.mjs`),cut=sourceTest.indexOf('\n// BEGIN generated');
let test=sourceTest.slice(0,cut)
  .replace(new RegExp(`\\b${escape(a.camel)}(?=[A-Z])`,'g'),b.camel)
  .replace(new RegExp(`'${escape(a.id)}'`,'g'),`'${b.id}'`).replace(new RegExp(`'${escape(a.id)}\\|`,'g'),`'${b.id}|`).replace(new RegExp(`"'${escape(a.id)}\\|"`,'g'),`"'${b.id}|"`)
  .replace(new RegExp(`fixtures/${escape(a.id)}-module/`,'g'),`fixtures/${b.id}-module/`).replace(`schools/${a.id}.mjs`,`schools/${b.id}.mjs`)
  .replace(new RegExp(escape(new URL(schools.find(s=>s.id===from).athletics_url).hostname.replace(/^www\./,'')),'g'),host)
  .replace(new RegExp(`in the ${escape(a.name)} module`,'g'),`in the ${b.name} module`)
  .replace(/assert\.equal\(sports\.length,\d+\)/,`assert.equal(sports.length,${sports.length})`)
  .replace(/const now=new Date\("[^"]*"\)/,`const now=new Date("${new Date().toISOString().slice(0,10)}T15:00:00Z")`)
  // The source's own helpers (golf place parsers) are imported by name only
  // where the target module exports them.
  .replace(new RegExp(`import \\{${b.camel}School[^}]*\\}`),`import {${b.camel}School}`);
test+=`\n\n// BEGIN generated (scripts/generate-module-tests.mjs --school=${to})\n// END generated\n\nassert.equal(requests.length,0,'no unexpected network requests');\nconsole.log('${b.name} module checks passed');\n`;
write(`tests/${to}-module.mjs`,test);

console.log(`src/schools/${to}.mjs: WMT school object (${sports.length} sports, combined: ${combined.join(', ')||'none'}) and ${from}'s reader; src/index.js entry and tests/${to}-module.mjs from ${from}'s.`);
for(const sport of sports)console.log(`  ${sport}: ${schedule[sport].map(s=>`/sports/${s}/schedule`).join(', ')||'(none)'}${labels[`/sports/${schedule[sport][0]}/schedule`]?` (${schedule[sport].map(s=>labels[`/sports/${s}/schedule`]).join(', ')})`:''}`);
for(const note of notes)console.log(`  NOTE ${note}`);
console.log((port.stdout||'').split('\n').slice(1).join('\n'));
