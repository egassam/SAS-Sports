// Starts a freshly scaffolded WMT school on the shared JSON-API kit
// (src/wmt-api-kit.mjs), the steps Stanford took by hand (Oct 15, about 20
// minutes): a WMT (Nuxt) site that serves /website-api/sports needs no card
// reader, only its config.
//   - the school module, from the site's own sport list: one sport id per
//     team, the catalog sport from its slug (inferSport), the team label from
//     its mens-/womens- slug, combined sports where a sport has two or more
//     teams, other leagues by conference id (named by hand: printed as NOTE);
//     the routes written out literally (the certification checks read the
//     file's text); the scaffold's live boards and TFRRS teams kept;
//   - src/index.js: Stanford's SCHOOL_MODULES entry and handlers line, renamed,
//     in place of the scaffold's SIDEARM ones;
//   - tests/<id>-module.mjs: an API harness (routes checked against
//     wmtApiSchoolRoutes) with an empty block for
//     scripts/generate-module-tests.mjs (fixtures are api-<sport id>).
// scripts/start-schools.mjs runs it for a WMT site whose /website-api/sports
// answers (Virginia Tech, Oct 15); otherwise it ports a card reader
// (scripts/port-wmt.mjs).
//
//   NODE_USE_ENV_PROXY=1 node scripts/port-wmt-api.mjs --to=virginia-tech
import {readFileSync,writeFileSync} from 'node:fs';
import {inferSport} from './onboard-school.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const to=value('to');
if(!to){console.error('usage: node scripts/port-wmt-api.mjs --to=<scaffolded id>');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),write=(path,text)=>writeFileSync(new URL(path,root),text);
const schools=JSON.parse(read('src/schools.json')),sponsored=JSON.parse(read('src/sponsored-sports.json'));
const names=id=>{const camel=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return{id,camel,Pascal:camel[0].toUpperCase()+camel.slice(1),CONST:id.replace(/-/g,'_').toUpperCase(),name:schools.find(s=>s.id===id)?.name}};
const a=names('stanford'),b=names(to),school=schools.find(s=>s.id===to);
if(!school||!sponsored[to]){console.error(`${to}: not in src/schools.json and src/sponsored-sports.json (run add-school first)`);process.exit(2)}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const host=new URL(school.athletics_url).hostname.replace(/^www\./,'');
const ZONES={Arizona:'America/Phoenix',California:'America/Los_Angeles',Oregon:'America/Los_Angeles',Washington:'America/Los_Angeles',Utah:'America/Denver',Colorado:'America/Denver',
  Texas:'America/Chicago',Oklahoma:'America/Chicago',Kansas:'America/Chicago',Iowa:'America/Chicago',Nebraska:'America/Chicago',Minnesota:'America/Chicago',Wisconsin:'America/Chicago',Illinois:'America/Chicago',Missouri:'America/Chicago',Arkansas:'America/Chicago',Louisiana:'America/Chicago',Mississippi:'America/Chicago',Alabama:'America/Chicago',Tennessee:'America/Chicago'};
const timeZone=ZONES[school.state]||'America/New_York';

// 1. The site's own sport list.
const response=await fetch(`https://${host}/website-api/sports?per_page=100`,{signal:AbortSignal.timeout(20000)});
if(!response.ok){console.error(`${host}/website-api/sports answered ${response.status}: not an API site (use scripts/port-wmt.mjs)`);process.exit(1)}
const listed=(await response.json()).data.filter(s=>s.schedule_id&&!s.hide_from_dropdown);
const notes=[],sportIds={},slugs={},teams={};
for(const entry of listed){
  const sport=inferSport(`/sports/${entry.slug}/schedule`);
  if(!sport){notes.push(`${entry.name} (/sports/${entry.slug}, id ${entry.id}): not in the app's catalog; left out`);continue}
  if(!sponsored[to].includes(sport)){notes.push(`${entry.name} (${entry.slug}) reads as ${sport}, not in sponsored-sports.json for ${to} (add it there, in public/index.html and certified-schools.json, then re-run)`);continue}
  sportIds[entry.slug]=entry.id;(slugs[sport]||=[]).push(entry.slug);
}
for(const sport of sponsored[to])if(!slugs[sport])notes.push(`${sport}: sponsored but not in the site's sport list (remove it, or find its team)`);
// Women's team first, as every module lists a combined sport.
const women=slug=>/^womens?-|^w-/.test(slug)||/^women/i.test(listed.find(s=>s.slug===slug)?.gender||'');
for(const sport of Object.keys(slugs)){
  slugs[sport].sort((x,y)=>Number(women(y))-Number(women(x)));
  if(slugs[sport].length>1)for(const slug of slugs[sport])teams[slug]=women(slug)?"Women's":/^mens?-|^m-/.test(slug)?"Men's":(notes.push(`${slug}: team label not known from the slug (set TEAMS by hand)`),slug);
}
// The main conference is the one most teams play in; others are named by hand.
const count={};for(const entry of listed)if(entry.conference_id!=null&&Object.values(sportIds).includes(entry.id))count[entry.conference_id]=(count[entry.conference_id]||0)+1;
const main=Object.entries(count).sort((x,y)=>y[1]-x[1])[0]?.[0];
for(const entry of listed)if(entry.conference_id!=null&&String(entry.conference_id)!==main&&Object.values(sportIds).includes(entry.id))notes.push(`${entry.name}: conference id ${entry.conference_id} (not the main ${main}): name its league in conferenceNames`);
const sports=Object.keys(slugs).sort();

// 2. The module.
const scaffold=read(`src/schools/${to}.mjs`);
const live=(scaffold.match(/  liveScoreboards:\{[\s\S]*?\n  \},\n/)||[''])[0];
const tfrrs=(scaffold.match(new RegExp(`export const ${b.CONST}_TFRRS_TEAMS=\\{[^\\n]*\\};`))||[`export const ${b.CONST}_TFRRS_TEAMS={Women:null,Men:null};`])[0];
const config={id:to,host,sportIds,slugs};
const routes=wmtApiSchoolRoutes(config);
const list=value=>Array.isArray(value)?`[${value.map(v=>`'${v}'`).join(',')}]`:`'${value}'`;
const table=map=>sports.map(sport=>`    '${to}|${sport}':${list(map[`${to}|${sport}`])}`).join(',\n');
const combined=sports.filter(sport=>slugs[sport].length>1);
const text=`import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// ${school.name} school module. Shared publisher utilities stay in the Worker;
// this file owns ${host}'s schedule source, ${school.name}'s program
// combinations and its verified Instagram tags.
//
// ${host} is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (${new Date().toISOString().slice(0,10)}).
const HOST='${host}';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={${Object.entries(sportIds).map(([k,v])=>`'${k}':${v}`).join(',')}};
const SLUGS={
${sports.map(sport=>`  '${sport}':[${slugs[sport].map(s=>`'${s}'`).join(',')}]`).join(',\n')}
};
const TEAMS={${Object.entries(teams).map(([k,v])=>`'${k}':"${v}"`).join(',')}};
// ${school.name}'s TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
${tfrrs.replace(`${b.CONST}_TFRRS_TEAMS`,`${b.CONST}_TFRRS_TEAMS`)}
const ${b.CONST}_API={id:'${to}',schoolName:'${school.short_name||school.name}',host:HOST,timeZone:'${timeZone}',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:${b.CONST}_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(${b.CONST}_API);

export const ${b.camel}School={
  id:'${to}',
  // Sports whose official schedule this module reads itself (the site's
  // schedule API). Every other sport keeps the shared parsers.
  apiSports:new Set(Object.keys(SLUGS)),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
${live}  // Men's and women's teams publish separate schedules; both are shown,
  // labeled by team.
  combinedSports:new Set([${combined.map(s=>`'${s}'`).join(',')}]),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{},
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
${table(routes.scheduleUrls)}
  },
  rosterUrls:{
${table(routes.rosterUrls)}
  }
};

export function create${b.Pascal}Handlers(deps){
  return createWmtApiHandlers(${b.CONST}_API,deps);
}
`;
write(`src/schools/${to}.mjs`,text);

// 3. src/index.js: Stanford's entry and handlers line, renamed.
const rename=t=>t.replace(new RegExp(`\\bcreate${escape(a.Pascal)}Handlers\\b`,'g'),`create${b.Pascal}Handlers`).replace(new RegExp(`\\b${escape(a.camel)}(?=Handlers|School)`,'g'),b.camel);
let index=read('src/index.js');
const entry=id=>{const n=names(id),start=index.indexOf(`  ,{school:${n.camel}School,`);if(start<0)return null;const rest=index.slice(start+3),end=rest.search(/\n  ,\{school:|\n\];\nconst schoolModule=/);return index.slice(start,start+3+end)};
const sourceEntry=entry('stanford'),targetEntry=entry(to);
if(!sourceEntry||!targetEntry){console.error('SCHOOL_MODULES entries not found');process.exit(1)}
index=index.replace(targetEntry,rename(sourceEntry));
const handlersLine=id=>(index.match(new RegExp(`^const ${escape(names(id).camel)}Handlers=create\\w+Handlers\\([^\\n]*\\);$`,'m'))||[])[0];
index=index.replace(handlersLine(to),rename(handlersLine('stanford')));
write('src/index.js',index);

// 4. Tests: the API harness with an empty generated block.
const test=`import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {${b.camel}School} from '../src/schools/${to}.mjs';
import {wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='${to}');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,${b.camel}Handlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/${to}-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads ${host}'s schedule API, one
// address per team (its sport id), and its roster pages.
const sports=sponsoredSports['${to}'];
assert.equal(sports.length,${sports.length});
assert.deepEqual(Object.keys(${b.camel}School.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',${b.camel}School.scheduleUrls],['roster',${b.camel}School.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('${to}|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),\`\${key} must be a sponsored sport\`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'${host}',\`\${key} must stay on ${host}\`);
      if(name==='schedule')assert.match(url,/^https:\\/\\/${escape(host).replace(/\//g,'\\/')}\\/website-api\\/schedule-events\\?filter%5Bschedule\\.sport_id%5D=\\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\\/\\/${escape(host).replace(/\//g,'\\/')}\\/sports\\/[a-z-]+\\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(${b.camel}School.scheduleUrls[\`${to}|\${sport}\`]));
  assert.ok(!read('../src/index.js').includes("'${to}|"+sport+"':"),\`\${sport} routes must live in the ${school.name} module, not shared code\`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const expected=wmtApiSchoolRoutes({id:'${to}',host:'${host}',sportIds:Object.fromEntries(Object.entries(${b.camel}School.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(${b.camel}School.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(${b.camel}School.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.deepEqual(expected.scheduleUrls,${b.camel}School.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,${b.camel}School.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),${JSON.stringify(combined)});
const parity={};void parity;

const now=new Date("${new Date().toISOString().slice(0,10)}T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=slug=>Object.values(${b.camel}School.scheduleUrls).flat().find(url=>url.includes(\`sport_id%5D=\${slug.replace(/^api-/,'')}&\`));
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(\`\${slug}-schedule.html.gz\`),school,sport,address(slug),at),school,sport,address(slug));
const line=e=>\`\${e.status} \${e.display_time} \${e.title} | \${e.headline||''}\`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\\/news\\/(\\d+)\\/(\\d+)\\/(\\d+)\\/([A-Za-z0-9-]+)/);return\`recap-\${y}-\${m}-\${d}-\${slug.slice(0,40)}.html.gz\`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.${b.camel}Handlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,\`\${label}: \${event.display_time} \${event.opponent} against \${other.display_time} \${other.opponent}'s recap\`)));
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

// BEGIN generated (scripts/generate-module-tests.mjs --school=${to})
// END generated

assert.equal(requests.length,0,'no unexpected network requests');
console.log('${school.name} module checks passed');
`;
write(`tests/${to}-module.mjs`,test);

console.log(`src/schools/${to}.mjs: WMT API school (${sports.length} sports, ${Object.keys(sportIds).length} teams, combined: ${combined.join(', ')||'none'}, ${timeZone}); src/index.js entry from Stanford's; tests/${to}-module.mjs API harness.`);
for(const sport of sports)console.log(`  ${sport}: ${slugs[sport].map(s=>`${s} (${sportIds[s]}${teams[s]?`, ${teams[s]}`:''})`).join(', ')}`);
for(const note of notes)console.log(`  NOTE ${note}`);
