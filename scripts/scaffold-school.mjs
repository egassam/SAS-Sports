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

// ESPN scoreboards for the sponsored live sports (as Houston's).
const LIVE={
  Volleyball:[`{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}`],
  Soccer:[`{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}`],
  Basketball:[`{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"}`,`{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}`],
  Baseball:[`{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}`],
  Softball:[`{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}`]
};
const liveLines=Object.entries(LIVE).filter(([sport])=>sports.includes(sport)).map(([sport,list])=>`    ${quote(sport)}:[${list.join(',')}]`).join(',\n');
const moduleText=`import {createSidearmScheduleReader,sidearmToday,withoutRanking,sidearmRelation} from '../sidearm-schedule-reader.mjs';
import {sidearmStartTimeText,mergeTournamentRounds,mergeMeetDays,mergeTbaBracket,writeMeetPlaces,golfPlacing,golfMatchPlay,doubleheaderNumber,createRecapMatcher,createArchiveStory,createTfrrsMeetResults} from '../sidearm-school-kit.mjs';
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
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  // Turn a sport's scoreboard on with the sport (lines ready below).
  liveScoreboards:{${liveLines?'\n'+liveLines.replace(/^    /gm,'    // ')+'\n  ':''}},
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

`+readFileSync(new URL('templates/sidearm-handlers.mjs.txt',import.meta.url),'utf8')
  .replace(/__CONST__/g,camel.replace(/[A-Z]/g,c=>'_'+c).toUpperCase()).replace(/__CAMEL__/g,camel).replace(/__FACTORY__/g,factory).replace(/__SCHOOLVAR__/g,schoolVar)
  .replace(/__ID__/g,quote(id)).replace(/__HOST__/g,quote(pageHost)).replace(/__HOSTNAME__/g,host).replace(/__TIMEZONE__/g,quote(timeZone)).replace(/__NAMEQ__/g,quote(school.name)).replace(/__NAME__/g,school.name);


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
next=insertAfterLast(next,/^  \{school:\w+School[\s\S]*?\}(?=\n\];\nconst schoolModule=)/gm,`  ,{school:${schoolVar},parseSchedule:(...args)=>${handlersVar}.parseSchedule(...args),isEmptySchedule:(events,parsed)=>${handlersVar}.isEmptySchedule(parsed),matchesRecap:(...args)=>${handlersVar}.matchesRecap(...args),crossCountry:{matches:event=>${handlersVar}.isCrossCountry(event),attach:event=>${handlersVar}.attachMeetResults(event)},\n    // Finals the schedule links no story for take theirs from the sport's\n    // archive.\n    beforeHighlights:async event=>{if(${handlersVar}.isFinalWithoutStory(event))await ${handlersVar}.attachArchiveStory(event);},\n    feed:async events=>{await Promise.all(events.filter(${handlersVar}.isFinalWithoutStory).map(event=>${handlersVar}.attachArchiveStory(event)));return events;}}`,'the SCHOOL_MODULES entry');

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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,${handlersVar},attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
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
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date(${JSON.stringify(new Date().toISOString().slice(0,10)+'T15:00:00Z')});
const page=slug=>\`https://${pageHost}/sports/\${slug}/schedule\`;
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(\`\${slug}-schedule.html.gz\`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>\`\${e.status} \${e.display_time} \${e.title} | \${e.headline||''}\`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\\/news\\/(\\d+)\\/(\\d+)\\/(\\d+)\\/([A-Za-z0-9-]+)/);return\`recap-\${y}-\${m}-\${d}-\${slug.slice(0,40)}.html.gz\`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.${handlersVar}.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,\`\${label}: \${event.display_time} \${event.opponent} against \${other.display_time} \${other.opponent}'s recap\`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  for(const provider of worker.liveScoreboardProviders(school,sport))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,\`https://site.api.espn.com/apis/site/v2/sports/\${provider.path}/scoreboard\`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,\`\${sport}: the scoreboard joins the official card; no second card\`);
}
void [parse,line,ownRecapsOnly,live];

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
console.log(`Next: NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=${id}; node scripts/survey-school.mjs --school=${id} --sport=<Sport>; add the sport to pageDataSports with its test block in tests/${id}-module.mjs; npm run test:release.`);
console.log(`The module starts with Houston's settings and every hook wired (recap matcher, archive stories, TFRRS cross country), each applying only to the sports in pageDataSports; uncomment a sport's live scoreboard when it is turned on, and set the TFRRS team pages for cross country.`);
