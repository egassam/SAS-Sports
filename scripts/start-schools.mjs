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
// fixtures, athletes and survey like any other; one whose /website-api/sports
// answers goes on the shared JSON-API kit (scripts/port-wmt-api.mjs).
import {readFileSync,writeFileSync,mkdirSync,openSync,closeSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
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

// Every state (Oct 23: Maine, New Hampshire and Vermont were missing, and
// their TFRRS pages were never tried).
const STATES={Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE','District of Columbia':'DC',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY'};
async function tfrrsTeams(school,moduleText=''){
  // TFRRS can name the team by its institution, "State" cut to "St"
  // (NC State: NC_college_f_North_Carolina_St, from "North Carolina State
  // University").
  const institutions=(school.aliases||[]).filter(n=>/\bUniversity\b/.test(n)).map(n=>n.replace(/^University of\s+|\s+University$/g,'')).flatMap(n=>[n,n.replace(/\bState$/,'St')]);
  // Or by another alias, any "State" cut to "St" (Big West, Oct 22:
  // CA_college_f_Cal_St_Fullerton, Cal_St_Northridge from "Cal State
  // Northridge", Long_Beach_St).
  // TFRRS also shortens "International" (FIU: FL_college_f_Florida_Intl)
  // and "Saint" (Saint Mary's: CA_college_f_St_Marys_CA).
  const others=[school.short_name,school.name,...(school.aliases||[])].filter(n=>/\b(?:State|International|Saint)\b/.test(n)).map(n=>n.replace(/\bState\b/g,'St').replace(/\bInternational\b/g,'Intl').replace(/\bSaint\b/g,'St'));
  // A hyphenated alias names the team too (UT Arlington:
  // TX_college_f_Texas_Arlington from "Texas-Arlington").
  const hyphenated=(school.aliases||[]).filter(n=>/^[A-Z][a-z]+-[A-Z][a-z]+/.test(n));
  // A one-word alias other than the mascot (UAlbany: NY_college_f_Albany).
  const single=(school.aliases||[]).slice(0,-1).filter(n=>/^[A-Z][a-z]+$/.test(n));
  const st=STATES[school.state],names=[school.short_name,school.name,...institutions,...others,...hyphenated,...single].map(n=>n.replace(/&/g,'').replace(/['’]/g,'').replace(/\W+/g,'_').replace(/^_|_$/g,''));
  // An apostrophe is dropped (Saint Joseph's: PA_college_f_St_Josephs_PA);
  // a university can carry "_U" (Saint Louis: MO_college_f_St_Louis_U).
  for(const name of [...new Set(names)])for(const tail of [name,`${name}_${st}`,`${name}_U`]){
    const url=g=>`https://www.tfrrs.org/teams/xc/${st}_college_${g}_${tail}.html`;
    try{const r=await fetch(url('f'),{signal:AbortSignal.timeout(20000)});if(r.ok&&/Cross Country/i.test(await r.text()))return{Women:url('f'),Men:url('m')};}catch{}
  }
  return tfrrsFromMeets(school,moduleText,st);
}
// No address answered (NJIT, Oct 23: TFRRS writes NJ_college_f_New_Jersey_
// Institute_Technolog): the TFRRS meets the school's own cross country
// schedule links list every team's page; the one in the school's state whose
// words best match its names (a truncated word counts) is taken.
async function tfrrsFromMeets(school,moduleText,st){
  const pages=[...new Set((String(moduleText).match(/'[^']*\|Cross Country':(?:\[[^\]]*\]|'[^']*')/)?.[0]||'').match(/https:[^']+\/schedule/g)||[])];
  const base=process.env.SAS_SPORTS_BASE_URL,key=process.env.SAS_SOURCE_KEY;
  const get=async url=>{try{const r=base&&key&&!/tfrrs\.org/.test(url)?await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)}):await fetch(url,{signal:AbortSignal.timeout(20000)});return r.ok?await r.text():''}catch{return''}};
  const meets=new Set();for(const page of pages)for(const m of (await get(page)).matchAll(/https?:\/\/(?:www\.)?tfrrs\.org\/results\/xc\/\d+[^"'\s<]*/g))meets.add(m[0]);
  // Words of the school's names, "&" dropped ("A&T" -> "at"); TFRRS shortens
  // some (N_Carolina_AT, Col_of_Charleston, William__Mary: Oct 23).
  const words=new Set([school.name,school.short_name,...(school.aliases||[]).slice(0,-1)].join(' ').replace(/&/g,'').toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=2&&!['the','of','university','and'].includes(w)));
  const SHORT={n:'north',s:'south',e:'east',w:'west',col:'college',st:'state',u:'university'};
  // Every part names one of the school's words, and the parts name every word
  // of one of its names (NC A&T is not NC_college_f_North_Carolina_St: "St"
  // is a word of "North Carolina A&T State University", "A&T" is in no part).
  const nameWords=[school.name,school.short_name,...(school.aliases||[]).slice(0,-1)].map(n=>n.replace(/&/g,'').toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=2&&!['the','of','and'].includes(w)));
  const covers=(part,word)=>word.startsWith(SHORT[part]||part)||Boolean(SHORT[part])&&word===part;
  const fits=name=>{const parts=name.toLowerCase().split(/[_.]+/).filter(w=>w&&w!=='of');if(!parts.some(part=>part.length>2))return 0;if(!parts.every(part=>[...words].some(word=>covers(part,word))))return 0;return nameWords.some(list=>list.length&&list.every(word=>parts.some(part=>covers(part,word))))?parts.length:0;};
  let best=null;
  const consider=html=>{for(const [,name] of String(html).matchAll(new RegExp(`teams\\/xc\\/${st}_college_f_([A-Za-z_.]+)\\.html`,'g'))){const score=fits(name);if(score&&(!best||score>best.score))best={name,score};}};
  for(const meet of [...meets].slice(0,3)){consider(await get(meet));if(best)break;}
  // Then the TFRRS meets the repository already saved (a school's own
  // schedule may link none).
  if(!best)for(const dir of readdirSync(new URL('tests/fixtures/',root)).filter(d=>d.endsWith('-module')))for(const file of readdirSync(new URL(`tests/fixtures/${dir}/`,root)).filter(f=>/^tfrrs-\d+\.html\.gz$/.test(f)))consider(gunzipSync(readFileSync(new URL(`tests/fixtures/${dir}/${file}`,root))).toString('utf8'));
  return best?{Women:`https://www.tfrrs.org/teams/xc/${st}_college_f_${best.name}.html`,Men:`https://www.tfrrs.org/teams/xc/${st}_college_m_${best.name}.html`}:null;
}

const schools=JSON.parse(read('src/schools.json')),ready=[],notes=[];
for(const {id,theme} of targets){
  const school=schools.find(s=>s.id===id);if(!school){notes.push(`${id}: not in src/schools.json`);continue}
  const add=await run(id,'add',['scripts/add-school.mjs',`--school=${id}`,`--theme=${theme}`,'--write']);
  console.log(`[${clock()}] ${id}: ${add.text.split('\n').slice(0,2).join(' · ')}`);
  if(add.code){notes.push(`${id}: add-school failed (${add.log})`);continue}
  const scaffold=await run(id,'scaffold',['scripts/scaffold-school.mjs',`--school=${id}`,'--write']);
  if(scaffold.code){notes.push(`${id}: scaffold failed (${scaffold.log})`);continue}
  school.nil=add.text.match(/^NIL marketplace: ((?:inflcr|opendorse):\S+)/m)?.[1]||null;
  school.teamPages=Object.fromEntries((add.text.match(/^team pages: (.*)$/m)?.[1]||'').split('; ').filter(Boolean).map(x=>{const [sport,slugs]=x.split('=');return[sport,slugs.split(',')]}));
  if(/: WMT /.test(add.text)){
    // A WMT site with its own JSON schedule API (Stanford, Virginia Tech)
    // needs only the shared API kit's config: no card reader to port.
    let api=false;
    try{const r=await fetch(`${school.athletics_url.replace(/\/$/,'')}/website-api/sports?per_page=100`,{signal:AbortSignal.timeout(20000)});api=r.ok&&Array.isArray((await r.json()).data);}catch{}
    if(api){
      const port=await run(id,'port',['scripts/port-wmt-api.mjs',`--to=${id}`]);
      if(port.code){notes.push(`${id}: port-wmt-api failed (${port.log})`);continue}
      notes.push(`${id}: WMT site with a JSON API: shared API kit (scripts/port-wmt-api.mjs); NOTE lines to decide: ${port.log}`);
      ready.push(school);continue;
    }
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
  const teams=sponsored[school.id].includes('Cross Country')?await tfrrsTeams(school,text):null;
  if(teams)text=text.replace(/(_TFRRS_TEAMS=)\{Women:null,Men:null\};/,`$1{Women:'${teams.Women}',Men:'${teams.Men}'};`);
  else if(sponsored[school.id].includes('Cross Country'))notes.push(`${school.id}: TFRRS team page not found by address; find it on a conference meet page (Big Ten: /results/xc/27246) and pass --tfrrs-f/--tfrrs-m`);
  // Both team pages of a sport the nav links twice (add-school's "team
  // pages" line), combined: the scaffold's candidates kept only one.
  for(const [sport,slugs] of Object.entries(school.teamPages||{})){
    // Only a module that lists team pages (a WMT API module lists sport ids).
    const has=slugs.map(slug=>text.includes(`/sports/${slug}/schedule`));
    if(has.every(Boolean)||!has.some(Boolean))continue;
    const host=new URL(school.athletics_url).origin;
    for(const kind of ['schedule','roster'])text=text.replace(new RegExp(`('${school.id}\\|${sport.replace(/&/g,'&')}':)'[^']*'`,'g'),(line,key)=>line.includes(`/${kind}'`)?`${key}[${slugs.map(slug=>`'${host}/sports/${slug}/${kind}'`).join(',')}]`:line);
    text=text.replace(/combinedSports:new Set\(\[([^\]]*)\]\)/,(all,list)=>list.includes(`'${sport}'`)?all:`combinedSports:new Set([${[list,`'${sport}'`].filter(Boolean).join(',')}])`);
    notes.push(`${school.id}: ${sport} combined from the nav's team pages (${slugs.join(', ')})`);
  }
  // The INFLCR Exchange add-school found (an Opendorse marketplace needs its
  // team name: by hand, as Colorado State's).
  const nil=school.nil?.match(/^(inflcr|opendorse):(.+)$/);
  if(nil?.[1]==='inflcr'&&!text.includes('inflcr:{'))text=text.replace(`  id:'${school.id}',\n`,`  id:'${school.id}',\n  // The school's INFLCR Exchange, its official NIL marketplace (linked from\n  // ${new URL(school.athletics_url).hostname}): athlete Instagram for a sport still short of three (src/inflcr.mjs).\n  inflcr:{school:'${nil[2]}'},\n`);
  // An Opendorse marketplace also needs its team name, read from the
  // marketplace page ("Washington State Cougars").
  if(nil?.[1]==='opendorse'&&!text.includes('opendorse:{')){
    // The team the marketplace's athletes list first, the most common
    // (Oct 23: a name match missed Bryant's and gave UMass Lowell's as "UMass
    // Lowell River Hawks "; Opendorse writes "Massachusetts Lowell River Hawks").
    let team=null;try{const r=await fetch(`https://opendorse.com/${nil[2]}`,{signal:AbortSignal.timeout(20000)});const counts=new Map();for(const [,name] of (await r.text()).matchAll(/"currentTeams":\["([^"]+)"/g))counts.set(name.trim(),(counts.get(name.trim())||0)+1);team=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}catch{}
    if(team)text=text.replace(`  id:'${school.id}',\n`,`  id:'${school.id}',\n  // The school's Opendorse marketplace, its official NIL marketplace (linked\n  // from ${new URL(school.athletics_url).hostname}): athlete Instagram for a sport still short of three (src/opendorse.mjs).\n  opendorse:{marketplace:'${nil[2]}',team:'${team.replace(/'/g,"\\'")}'},\n`);
    else notes.push(`${school.id}: Opendorse marketplace ${nil[2]}: add opendorse:{marketplace:'${nil[2]}',team:'<its team name>'} (Colorado State's)`);
  }
  if(nil)notes.push(`${school.id}: NIL marketplace ${school.nil}`);
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
  // The pins athlete-evidence printed go into the module at once (every
  // session pasted them by hand); check them for three distinct names.
  const pins=athletes.text.split('\n').filter(line=>line.startsWith(`    '${id}|`));
  if(pins.length){
    const file=new URL(`src/schools/${id}.mjs`,root),text=readFileSync(file,'utf8');
    if(text.includes('verifiedInstagrams:{},')){writeFileSync(file,text.replace('verifiedInstagrams:{},',`verifiedInstagrams:{\n${pins.join('\n').replace(/,$/,'')}\n  },`));notes.push(`${id}: ${pins.length} Instagram pins written for ${few.join(', ')} (check the names)`);}
    else notes.push(`${id}: pin these (12 links or fewer; lines in ${athletes.log}): ${few.join(', ')}`);
  }
  const pruned=fixtures.text.match(/--prune: .*/);if(pruned)notes.push(`${id}: ${pruned[0]}`);
  // A sport left with no schedule page (Oct 23: three schools' cross country
  // and track routes were the homepage, and nothing said so).
  for(const line of fixtures.text.split('\n').filter(l=>/NO SCHEDULE PAGE/.test(l)))notes.push(`${id}: ${line.trim()}`);
  const survey=await run(id,'survey',['scripts/survey-school.mjs',`--school=${id}`]);
  const gates=survey.text.split('\n').filter(l=>/GATE|ODD NAME|FORMAT:/.test(l));
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
    if(!/combinedSports:new Set\(\[[^\]]*'Soccer'/.test(text))notes.push(`${school.id}: two soccer pages: Soccer is not in combinedSports (check)`);
    writeFileSync(file,text);notes.push(`${school.id}: soccer reads one labeled ESPN board per team`);
  }
}

console.log(`[${clock()}] done\n${notes.map(n=>`- ${n}`).join('\n')}`);
