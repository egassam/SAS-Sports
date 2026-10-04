// Sets up a school module for an unconverted catalog school, the step every
// conversion started with by hand ("Setup", route parity):
//   - src/schools/<id>.mjs with the exact schedule and roster routes, program
//     combinations and verified Instagram tags production uses today, and
//     the shared SIDEARM schedule reader (src/sidearm-schedule-reader.mjs)
//     with no sports enabled yet, so the shared parsers still read every page;
//   - the school's entries moved out of src/index.js and the module wired in
//     (import, handlers, one SCHOOL_MODULES entry);
//   - tests/<id>-module.mjs checking route parity and module ownership, added
//     to `npm test` and `npm run test:release`.
// Output is unchanged for every school: the new module only restates
// today's routes. Then convert one sport at a time: add it to pageDataSports
// with fixtures and tests, and change a reader setting only where the site
// differs (Colorado, Baylor and Arizona show the settings in use). A site
// that is not SIDEARM (WMT: Cincinnati, UCF) needs its own reader instead.
// The script prints the hooks other schools use, for the sports that need
// them.
//
//   node scripts/scaffold-school.mjs --school=houston            (dry run: prints the plan)
//   node scripts/scaffold-school.mjs --school=houston --write
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school'),write=args.includes('--write');
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
if(!id){console.error('usage: node scripts/scaffold-school.mjs --school=<id> [--write]');process.exit(2)}
const schools=JSON.parse(read('src/schools.json')),sponsoredSports=JSON.parse(read('src/sponsored-sports.json'));
const school=schools.find(s=>s.id===id);
if(!school){console.error(`unknown school ${id}`);process.exit(2)}
if(existsSync(new URL(`src/schools/${id}.mjs`,root))){console.error(`src/schools/${id}.mjs already exists`);process.exit(2)}
const sports=sponsoredSports[id]||[];
if(!sports.length){console.error(`${id} has no sponsored sports`);process.exit(2)}

// Names: houston -> houstonSchool, createHoustonHandlers; west-virginia -> westVirginiaSchool.
const camel=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),Pascal=camel[0].toUpperCase()+camel.slice(1);
const schoolVar=`${camel}School`,handlersVar=`${camel}Handlers`,factory=`create${Pascal}Handlers`;
const quote=value=>`'${String(value).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'`;

// Today's routes, exactly as production computes them.
function evaluate(indexSource){
  const source=indexSource.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('no PDFs')},fetch:()=>{throw Error('no network')}};
  return Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,VERIFIED_TEAM_TAG_INSTAGRAM,schoolTimeZone};')(...Object.values(deps));
}
const index=read('src/index.js'),before=evaluate(index);
const routes=worker=>Object.fromEntries(sports.map(sport=>[sport,{schedule:worker.candidateUrls(school,sport),roster:worker.rosterUrls(school,sport),combined:worker.schoolCombinedSports(school).has(sport)}]));
const today=routes(before);
const tags=[...before.VERIFIED_TEAM_TAG_INSTAGRAM].filter(([key])=>key.startsWith(`${id}|`));
const combined=[...before.schoolCombinedSports(school)].sort();
const timeZone=before.schoolTimeZone(school),pageHost=new URL(today[sports.find(sport=>today[sport].schedule.length)].schedule[0]).hostname;
const host=new URL(school.athletics_url||today[sports[0]].schedule[0]).hostname.replace(/^www\./,'');

const routeMap=kind=>sports.filter(sport=>today[sport][kind].length).map(sport=>{
  const list=today[sport][kind];
  return`    ${quote(`${id}|${sport}`)}:${list.length===1?quote(list[0]):`[${list.map(quote).join(',')}]`}`;
}).join(',\n');

const moduleText=`import {createSidearmScheduleReader,sidearmToday,withoutRanking} from '../sidearm-schedule-reader.mjs';
// ${school.name} school module. Shared publisher utilities stay in the Worker;
// this file owns ${host} routes, ${school.name}'s program combinations, its
// verified Instagram tags and its schedule reader. Routes start as the exact
// candidates production used before the module existed (route parity,
// scripts/scaffold-school.mjs); each sport is then corrected and verified.
export const ${schoolVar}={
  id:${quote(id)},
  // Sports whose official schedule this module reads itself, from the
  // SIDEARM page data (see the reader below). Every other sport keeps the
  // shared parsers. Add a sport only with its fixture tests.
  pageDataSports:new Set([]),
  // Live game state from an independent scoreboard, per sport. Football uses
  // the shared default (ESPN's FBS group).
  liveScoreboards:{},
  // Men's and women's teams publish separate pages; both are shown, labeled
  // by team.
  combinedSports:new Set([${combined.map(quote).join(',')}]),
  verifiedInstagrams:{${tags.length?'\n'+tags.map(([key,url])=>`    ${quote(key)}:${quote(url)}`).join(',\n')+'\n  ':''}},
  scheduleUrls:{
${routeMap('schedule')}
  },
  rosterUrls:{
${routeMap('roster')}
  }
};

const HOST=${quote(pageHost)};
// ${school.name}'s calendar day.
const ${camel}Today=sidearmToday(${quote(timeZone)});
// ${host} is a SIDEARM (Nuxt) site: the shared reader turns its schedule
// page data into events in K-State's results format. Settings start at the
// shared defaults; change one only for something this site does differently,
// with a fixture test (see the Colorado, Baylor and Arizona modules).
export function ${factory}({makeEvent,recapMatchesEvent,eventType=()=>'GAME',decodeHtml=value=>String(value||''),ordinal=value=>String(value),fetch,headers}){
  const {parseSchedule,isEmptySchedule}=createSidearmScheduleReader({
    id:${quote(id)},host:HOST,sports:${schoolVar}.pageDataSports,squadSports:${schoolVar}.combinedSports,
    today:${camel}Today,
    // The opponent as K-State shows it: no ranking; an unknown opponent
    // ("TBA") is left out.
    opponent(game){
      const opponent=withoutRanking(game.opponent?.title);
      return!opponent||/^TB[AD]$/i.test(opponent)?'':opponent;
    },
    // As K-State's, a past tennis tournament is listed only with a story.
    tennisNeedsStory:true
  },{makeEvent,eventType});
  return{parseSchedule,isEmptySchedule};
}
`;

// src/index.js: move the school's entries out, wire the module in.
let next=index;
const removed=[];
next=next.split('\n').filter(line=>{
  // One-line routes and tags only ('id|Sport':'url', 'id|Sport':[...],
  // 'id|Sport|Name':'url'); multi-line entries (saved results) stay shared.
  if(new RegExp(`^\\s*,?\\s*'${id.replace(/-/g,'\\-')}\\|[^']*':\\s*(?:'[^']*'|\\[[^\\]]*\\])\\s*,?\\s*$`).test(line)){removed.push(line.trim());return false}
  return true;
}).join('\n');
// A map whose first entry was removed may now start with ",'other|..."; and
// one whose last entry was removed may end with a trailing comma, which is fine.
next=next.replace(/(\{\n(?:\s*\.\.\.[^\n]*\n)*)(\s*),'/g,"$1$2'");
const insertAfterLast=(text,pattern,line,label)=>{
  const hits=[...text.matchAll(pattern)];
  if(!hits.length)throw Error(`could not find where to add ${label} in src/index.js`);
  const at=hits.at(-1).index+hits.at(-1)[0].length;
  return text.slice(0,at)+'\n'+line+text.slice(at);
};
next=insertAfterLast(next,/^import \{[^}]*\} from '\.\/schools\/[^']+';$/gm,`import {${schoolVar},${factory}} from './schools/${id}.mjs';`,'the import');
next=insertAfterLast(next,/^const \w+Handlers=create\w+Handlers\([^\n]*\);$/gm,`const ${handlersVar}=${factory}({makeEvent,recapMatchesEvent,eventType,decodeHtml,ordinal,fetch:(...args)=>sourceFetch(...args),headers:HEADERS});`,'the handlers');
// One SCHOOL_MODULES entry: its routes, tags and combined sports come from the
// module's school data; the schedule reader and its empty-schedule check are
// the hooks to start with.
next=insertAfterLast(next,/^  \{school:\w+School[\s\S]*?\}(?=\n\];\nconst schoolModule=)/gm,`  ,{school:${schoolVar},parseSchedule:(...args)=>${handlersVar}.parseSchedule(...args),isEmptySchedule:(events,parsed)=>${handlersVar}.isEmptySchedule(parsed)}`,'the SCHOOL_MODULES entry');

const testText=`import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {${schoolVar}} from '../src/schools/${id}.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id===${quote(id)});
const source=read('../src/index.js').replace(/^import .*;\\n/gm,'').replace('export default{','const handler={');
// Official pages served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(\`Unexpected network request: \${url}\`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/${id}-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit ${host} routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports[${quote(id)}];
assert.equal(sports.length,${sports.length});
for(const [name,map] of [['schedule',${schoolVar}.scheduleUrls],['roster',${schoolVar}.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith(${quote(id+'|')}),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),\`\${key} must be a sponsored sport\`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\\./,''),${quote(host)},\`\${key} must stay on ${host}\`);
  }
}
const parity=${JSON.stringify(today,null,0)};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),parity[sport].schedule,\`\${sport} schedule routes must match route parity (update this table when a sport is corrected)\`);
  assert.deepEqual(worker.rosterUrls(school,sport),parity[sport].roster,\`\${sport} roster routes must match route parity\`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),parity[sport].combined,\`\${sport} team combination must match\`);
}
for(const sport of sports)assert.ok(!read('../src/index.js').includes(${JSON.stringify("'"+id+'|')}+sport+"':"),\`\${sport} routes must live in the ${school.name} module, not shared code\`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages and a mutation that fails it.
assert.equal(requests.length,0,'no unexpected network requests');
console.log('${school.name} module checks passed');
`;

console.log(`School: ${school.name} (${id}), ${host}; ${sports.length} sports: ${sports.join(', ')}`);
console.log(`Moved out of src/index.js (${removed.length} lines):\n  ${removed.join('\n  ')||'(none)'}`);
const leftover=next.split('\n').filter(line=>line.includes(`'${id}|`)).map(line=>line.trim());
if(leftover.length)console.log(`Left in src/index.js (multi-line entries; move them when that sport is converted):\n  ${leftover.join('\n  ')}`);
console.log(`Combined sports: ${combined.join(', ')||'(none)'}; verified Instagram tags: ${tags.length}`);
if(!write){console.log('\nDry run. Add --write to create the files.');process.exit(0)}

writeFileSync(new URL(`src/schools/${id}.mjs`,root),moduleText);
writeFileSync(new URL('src/index.js',root),next);
writeFileSync(new URL(`tests/${id}-module.mjs`,root),testText);
const pkg=JSON.parse(read('package.json'));
for(const script of ['test','test:release']){
  const anchor=/node tests\/colorado-module\.mjs/;
  if(!pkg.scripts[script].includes(`tests/${id}-module.mjs`))pkg.scripts[script]=pkg.scripts[script].replace(anchor,match=>`${match} && node tests/${id}-module.mjs`);
}
writeFileSync(new URL('package.json',root),JSON.stringify(pkg,null,2)+'\n');

// The module must restate today's routes exactly.
const {schoolModuleDeps:fresh}=await import(`../tests/school-module-deps.mjs?${Date.now()}`);
Object.assign(schoolModuleDeps,fresh);
const after=routes(evaluate(next));
const diff=sports.filter(sport=>JSON.stringify(after[sport])!==JSON.stringify(today[sport]));
if(diff.length){console.error(`Route parity FAILED for ${diff.join(', ')}; check src/index.js and the module`);process.exit(1)}
console.log(`\nWrote src/schools/${id}.mjs, tests/${id}-module.mjs; wired src/index.js and package.json. Route parity: ${sports.length}/${sports.length} sports identical.`);
console.log(`Next: node tests/${id}-module.mjs, then npm run test:release.`);
console.log(`Hooks for the sports that need them go in the school's SCHOOL_MODULES entry in src/index.js (listed above it): crossCountry (TFRRS: src/tfrrs-results.mjs), matchesRecap, isEmptySchedule, beforeHighlights/feed (archive stories), results; scoreboards go in the module's liveScoreboards.`);
