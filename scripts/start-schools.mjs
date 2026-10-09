// Starts one or more new SIDEARM schools in one command: every setup step a
// session ran by hand, one after another (Illinois + Indiana took about an
// hour to reach the first survey; most of it waiting between steps):
//   1. add-school --write (sports from the site's nav, theme), scaffold-school,
//      port-handlers from a converted SIDEARM school; one school after the
//      other, since each writes src/index.js and package.json;
//   2. TFRRS team pages found by trying the usual addresses
//      (`<ST>_college_f_<Name>.html`, then `..._<Name>_<ST>.html`) and written
//      into the module; every sport turned on in pageDataSports;
//   3. for all schools at once: fixtures (--prune) and athlete evidence
//      (--pins, every sport) side by side, then the survey.
// Each step's output goes to <log-dir>/<id>-<step>.log; the summary lists
// what is left to decide by eye (combinedSports, GATE lines, profile-card
// sports).
//
//   NODE_USE_ENV_PROXY=1 node scripts/start-schools.mjs --from=oklahoma --log-dir=<dir> \
//     iowa=#FFCD00,#000000,#07111f maryland=#E03A3E,#FFD520,#ffffff
// A WMT site is ported from a converted WMT card reader instead
// (scripts/port-wmt.mjs; --wmt-from=, default nebraska) and goes on to the
// fixtures, athletes and survey like any other.
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const from=value('from')||'oklahoma',wmtFrom=value('wmt-from')||'nebraska',logDir=value('log-dir');
const targets=args.filter(a=>!a.startsWith('--')).map(a=>{const [id,theme]=a.split('=');return{id,theme}});
if(!targets.length||!logDir||targets.some(t=>!t.theme)){console.error('usage: node scripts/start-schools.mjs --from=<converted SIDEARM id> --log-dir=<dir> <id>=<primary>,<secondary>,<onAccent> ...');process.exit(2)}
mkdirSync(logDir,{recursive:true});
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const env={...process.env,NODE_USE_ENV_PROXY:'1'};
const run=(id,step,cmd)=>new Promise(done=>{
  const log=`${logDir}/${id}-${step}.log`,fd=openSync(log,'w');
  const child=spawn(process.execPath,cmd,{cwd:new URL('.',root).pathname,env,stdio:['ignore',fd,fd]});
  child.on('close',code=>{closeSync(fd);done({code,log,text:readFileSync(log,'utf8').split('\n').filter(l=>!/Warning|Reparsing|type.*module|trace-warnings/.test(l)).join('\n')})});
});
const started=Date.now(),clock=()=>`${Math.round((Date.now()-started)/1000)}s`;

const STATES={Alabama:'AL',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Florida:'FL',Georgia:'GA',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Nebraska:'NE','New Jersey':'NJ','New York':'NY','North Carolina':'NC',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','South Carolina':'SC',Tennessee:'TN',Texas:'TX',Utah:'UT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI'};
async function tfrrsTeams(school){
  const st=STATES[school.state],names=[school.short_name,school.name].map(n=>n.replace(/&/g,'').replace(/\W+/g,'_').replace(/^_|_$/g,''));
  for(const name of [...new Set(names)])for(const tail of [name,`${name}_${st}`]){
    const url=g=>`https://www.tfrrs.org/teams/xc/${st}_college_${g}_${tail}.html`;
    try{const r=await fetch(url('f'),{signal:AbortSignal.timeout(20000)});if(r.ok&&/Cross Country/i.test(await r.text()))return{Women:url('f'),Men:url('m')};}catch{}
  }
  return null;
}

const schools=JSON.parse(read('src/schools.json')),ready=[],notes=[];
for(const {id,theme} of targets){
  const school=schools.find(s=>s.id===id);if(!school){notes.push(`${id}: not in src/schools.json`);continue}
  const add=await run(id,'add',['scripts/add-school.mjs',`--school=${id}`,`--theme=${theme}`,'--write']);
  console.log(`[${clock()}] ${id}: ${add.text.split('\n').slice(0,2).join(' · ')}`);
  if(add.code){notes.push(`${id}: add-school failed (${add.log})`);continue}
  const scaffold=await run(id,'scaffold',['scripts/scaffold-school.mjs',`--school=${id}`,'--write']);
  if(scaffold.code){notes.push(`${id}: scaffold failed (${scaffold.log})`);continue}
  if(/: WMT /.test(add.text)){
    const wmt=await run(id,'port',['scripts/port-wmt.mjs',`--from=${wmtFrom}`,`--to=${id}`]);
    if(wmt.code){notes.push(`${id}: port-wmt failed (${wmt.log})`);continue}
    notes.push(`${id}: WMT site, ported from ${wmtFrom}'s card reader; routes and lines to decide: ${wmt.log}`);
    ready.push(school);continue;
  }
  const port=await run(id,'port',['scripts/port-handlers.mjs',`--from=${from}`,`--to=${id}`]);
  if(port.code){notes.push(`${id}: port-handlers failed (${port.log})`);continue}
  notes.push(`${id}: ported from ${from}; lines to decide: ${port.log}`);
  ready.push(school);
}

// TFRRS, sports on (module edits, one file per school).
const sponsored=JSON.parse(read('src/sponsored-sports.json'));
await Promise.all(ready.map(async school=>{
  const file=new URL(`src/schools/${school.id}.mjs`,root);let text=readFileSync(file,'utf8');
  text=text.replace('pageDataSports:new Set([]),',`pageDataSports:new Set([${sponsored[school.id].map(s=>`'${s}'`).join(',')}]),`);
  const teams=sponsored[school.id].includes('Cross Country')?await tfrrsTeams(school):null;
  if(teams)text=text.replace(/(_TFRRS_TEAMS=)\{Women:null,Men:null\};/,`$1{Women:'${teams.Women}',Men:'${teams.Men}'};`);
  else if(sponsored[school.id].includes('Cross Country'))notes.push(`${school.id}: TFRRS team page not found by address; find it on a conference meet page (Big Ten: /results/xc/27246) and pass --tfrrs-f/--tfrrs-m`);
  school.tfrrs=teams;writeFileSync(file,text);
}));
console.log(`[${clock()}] modules ready: ${ready.map(s=>`${s.id} (${sponsored[s.id].length} sports${s.tfrrs?', TFRRS':''})`).join(', ')}`);

// Fixtures and athlete evidence side by side, then the survey.
await Promise.all(ready.map(async school=>{
  const id=school.id,sports=sponsored[id];
  const tfrrs=school.tfrrs?[`--tfrrs-f=${school.tfrrs.Women}`,`--tfrrs-m=${school.tfrrs.Men}`]:[];
  const [fixtures,athletes]=await Promise.all([
    run(id,'fixtures',['scripts/fetch-school-fixtures.mjs',`--school=${id}`,'--prune',...tfrrs]),
    run(id,'athletes',['scripts/athlete-evidence.mjs',`--school=${id}`,'--pins',...sports])
  ]);
  console.log(`[${clock()}] ${id}: fixtures ${fixtures.code?'FAILED':'saved'}, athlete evidence ${athletes.code?'FAILED':'read'}`);
  const none=[...athletes.text.matchAll(/^([^:\n]+): \d+ profile pages read; athlete Instagram on 0\b/gm)].map(m=>m[1]);
  const few=[...athletes.text.matchAll(/^([^:\n]+): \d+ profile pages read; athlete Instagram on ([1-9]|1[0-2])\b/gm)].map(m=>`${m[1]} (${m[2]})`);
  if(none.length)notes.push(`${id}: profile-card sports (0 links): ${none.join(', ')} → athlete_profile_fallback_sports`);
  if(few.length)notes.push(`${id}: pin these (12 links or fewer; lines in ${athletes.log}): ${few.join(', ')}`);
  const pruned=fixtures.text.match(/--prune: .*/);if(pruned)notes.push(`${id}: ${pruned[0]}`);
  const survey=await run(id,'survey',['scripts/survey-school.mjs',`--school=${id}`]);
  const gates=survey.text.split('\n').filter(l=>/GATE/.test(l));
  notes.push(`${id}: survey ${survey.log}${gates.length?` — ${gates.length} GATE:\n    ${gates.join('\n    ')}`:' — no GATE'}`);
}));
// Soccer with both team pages left after --prune reads one labeled ESPN board
// per team (the scaffold's single women's board did not join Northwestern's
// labeled cards: an unlabeled duplicate final, Oct 9).
for(const school of ready){
  const file=new URL(`src/schools/${school.id}.mjs`,root);let text=readFileSync(file,'utf8');
  const unlabeled="'Soccer':[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}]";
  if(/\/sports\/mens-soccer\/schedule/.test(text)&&/\/sports\/womens-soccer\/schedule/.test(text)&&text.includes(unlabeled)){
    text=text.replace(unlabeled,`'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}]`);
    if(!/combinedSports:new Set\(\[[^\]]*'Soccer'/.test(text))notes.push(`${school.id}: two soccer pages: add Soccer to combinedSports`);
    writeFileSync(file,text);notes.push(`${school.id}: soccer reads one labeled ESPN board per team`);
  }
}

console.log(`[${clock()}] done\n${notes.map(n=>`- ${n}`).join('\n')}`);
