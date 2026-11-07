// The reference rules (docs/HIGH_SCHOOL_REFERENCE.md) read off any middle or
// high school's live feeds, as tests/hs-reference.mjs reads them off
// Manhattan's saved ones (user, November 7, 2026: "Run the checks on the
// other counties"). Every sponsored sport's feed is read from the given
// deployment (its saved copy; no forced refresh) and each card is checked.
// Cards that need reading by eye (all-capital words, "TBD" still ahead) are
// listed as NOTE, not FAIL.
//
//   node scripts/check-reference-rules.mjs [--base=<url>] [--school=<ids>|--county=<name>] [--sports=<names>] [--refresh] [--cards=<file>]
//
// With no --school or --county every middle and high school but the three
// reference schools is read. --refresh rebuilds each feed (on a preview,
// without its stored finals: `refresh=1&stored=0`, as diff:feeds does);
// without it the saved copy answers, which after a deploy may predate it.
// --cards writes every card line to a file.
import {readFileSync,writeFileSync} from 'node:fs';
import {REFERENCE_SCHOOLS,cardLine} from '../tests/hs-reference-lib.mjs';
import {nameCase} from '../src/high-school.mjs';

const arg=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const base=(arg('base')||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const schools=read('../src/schools.json'),sponsored=read('../src/sponsored-sports.json');
const hs=schools.filter(s=>/^(?:high|middle)-school$/.test(s.level||''));
const ids=arg('school')?arg('school').split(','):arg('county')?hs.filter(s=>arg('county').split(',').includes(s.county)).map(s=>s.id):hs.map(s=>s.id).filter(id=>!REFERENCE_SCHOOLS.includes(id));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date());
const dayOf=t=>t?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(t)):'';
const fails=[],notes=[],lines=[];
const fail=(where,text)=>{fails.push(`${where}: ${text}`);};
const note=(where,text)=>{notes.push(`${where}: ${text}`);};
const PLACEHOLDER=/\b(?:TBD|Sub-?\s?State|Quarter-?\s?Finals?|Semi-?\s?Finals?|State Champ\w*|State Tourn\w*|Regionals?|1st Round|First Round)\b/i;

async function feed(id,sport){
  for(let attempt=0;attempt<3;attempt++){
    try{
      const r=await fetch(`${base}/live/feed/grouped?school=${id}&sport=${encodeURIComponent(sport)}${process.argv.includes('--refresh')?'&refresh=1&stored=0':''}`,{signal:AbortSignal.timeout(90000)});
      if(r.ok){const b=await r.json();return{group:Array.isArray(b)?b[0]:null,status:r.status};}
      if(attempt===2)return{error:`HTTP ${r.status}`};
    }catch(e){if(attempt===2)return{error:String(e.message||e)};}
    await new Promise(r=>setTimeout(r,2000*(attempt+1)));
  }
}

const only=arg('sports')?.split(',');
const sportsOf=id=>(sponsored[id]||[]).filter(s=>!only||only.includes(s));
const jobs=ids.flatMap(id=>sportsOf(id).map(sport=>({id,sport})));
const out={};
let next=0;
await Promise.all(Array.from({length:4},async()=>{
  while(next<jobs.length){
    const {id,sport}=jobs[next++];
    out[`${id}|${sport}`]=await feed(id,sport);
  }
}));

for(const id of ids){
  const school=schools.find(s=>s.id===id);
  if(!school){fail(id,'not in the catalog');continue;}
  for(const sport of sportsOf(id)){
    const where=`${id} ${sport}`,{group:g,error}=out[`${id}|${sport}`]||{};
    if(error){fail(where,`feed not read (${error})`);continue;}
    const events=g?[...(g.live||[]),...(g.results||[]),...(g.upcoming||[])]:[];
    lines.push(`## ${where}${g?.records?.length?` (${g.records.map(r=>`${r.team_label?`${r.team_label} `:''}${r.text}`).join('; ')})`:''}${g?.rankings?.length?` [${g.rankings.map(r=>`No. ${r.rank} ${r.poll}`).join(' · ')}]`:''}`);
    for(const e of events)lines.push(`  ${cardLine(e)}`);
    // 1. Every sponsored sport lists its schedule (a sport whose season has
    // not been published yet lists nothing and is noted, not failed).
    if(!events.length){(g?.in_season?fail:note)(where,`no schedule listed${g?.in_season?' while in season':` (${g?.season_label||'out of season'})`}`);continue;}
    const seen=new Map(),ids=new Set();
    for(const e of events){
      const day=dayOf(e.start_time),end=e.end_time?dayOf(e.end_time):day,title=e.title||'';
      // 2. A past game or meet is a result, or played with no result posted.
      if(end<today&&e.status!=='Final')fail(where,`${day} "${title}" is past and reads ${e.status}`);
      if(e.no_result_posted&&!/^No (?:score|results) posted$/.test(e.headline||''))fail(where,`${day} "${title}" reads "${e.headline}"`);
      if(e.status==='Final'&&!e.no_result_posted&&!e.headline&&e.school_score==null&&!e.result_count)fail(where,`${day} "${title}" is final with nothing on it`);
      // 3. Titles read as names: no site notes, times or known slips.
      if(/ - (?:HOME|AWAY)\b|\d(?::\d\d)?\s?(?:AM|PM)\b|\bNorht\b|\bStare Park\b|\bJV League\b/i.test(title))fail(where,`${day} title reads as typed: "${title}"`);
      if(e.event_type==='GAME'&&(!String(e.opponent||'').trim()||/\b(?:vs|at)\s*$/.test(title)))fail(where,`${day} no opponent named: "${title}"`);
      // Words typed in capitals (league and school codes stay).
      if(nameCase(title)!==title.trim())note(where,`${day} capitals in "${title}"`);
      if(/\bJV\b|\bjunior varsity\b|\bC[- ]Team\b/i.test(title)&&!/\bJV\s*\/\s*V(?:arsity)?\b|\bVarsity\b|\bV\s*\/\s*JV\b/i.test(title))fail(where,`${day} junior varsity listed: "${title}"`);
      // 4. Rounds never reached: gone after their day or a playoff loss; a named round reads "·".
      const placeholder=PLACEHOLDER.test(e.opponent||'')||(/\bTBD\b/.test(title));
      if(placeholder&&e.event_type==='GAME'){
        if(day<today&&e.school_score==null&&!e.result_count)fail(where,`${day} placeholder "${title}" still listed after its day`);
        if(/\b(?:vs|at)\.? .*\bTBD\b/i.test(title)&&!/·/.test(title))fail(where,`${day} placeholder reads "at"/"vs": "${title}"`);
      }
      // 5. No college ranks.
      for(const r of [e.school_rank,e.opponent_rank].filter(Boolean))if(!/MaxPreps/i.test(`${r.source||''} ${r.poll||''}`))fail(where,`${day} "${title}" carries a ${r.poll} rank`);
      // One card per id. The same start and title twice with two ids is two
      // matches when the source has two (Wamego and Sabetha on Oct 10, two
      // MaxPreps match pages): read by eye.
      if(ids.has(e.id))fail(where,`${day} "${title}" listed twice (one id)`);
      ids.add(e.id);
      const key=`${e.start_time}|${title}|${e.team_label||''}`;
      if(seen.has(key)){const a=seen.get(key);(a.recap_url&&e.recap_url&&a.recap_url!==e.recap_url?note:fail)(where,`${day} "${title}" twice (${a.headline} · ${e.headline})`);}
      seen.set(key,e);
    }
    for(const r of g?.rankings||[])if(!/MaxPreps/i.test(r.source||''))fail(where,`team rank from ${r.source} ${r.poll}`);
    // 6. Records come from the finals.
    if((g?.results||[]).some(e=>e.event_type==='GAME'&&e.school_score!=null&&e.opponent_score!=null)&&!g.records?.length)fail(where,'scored games but no record');
    // 7. No featured athletes.
    if(g?.featured_athletes?.length)fail(where,`${g.featured_athletes.length} featured athletes (minors)`);
  }
}
if(arg('cards'))writeFileSync(arg('cards'),lines.join('\n')+'\n');
for(const n of notes)console.log(`NOTE ${n}`);
for(const f of fails)console.log(`FAIL ${f}`);
console.log(`\n${ids.length} schools, ${jobs.length} feeds, ${lines.filter(l=>l.startsWith('  ')).length} cards: ${fails.length} FAIL, ${notes.length} NOTE`);
process.exit(fails.length?1:0);
