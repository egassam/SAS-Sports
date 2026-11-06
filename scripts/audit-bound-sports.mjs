// Every Bound-scheduled middle and high school against the app's sports list
// (user, November 6, 2026: "Start the winter session"). `npm run
// audit:sports` reads the schools with their own calendars; schools whose
// schedule is on Bound were not audited. This asks Bound, act by act, for
// each data-file school's events this school year at its level (Varsity, or
// the middle school grades) and reports:
//   - a Bound sport with events this year that the school's `sports.has`
//     (src/schools/data/*.json) leaves out;
//   - a listed sport src/sponsored-sports.json leaves out.
// The same reads and rules as the county survey (scripts/onboard-hs.mjs:
// each event's own act, the school as a host team, `boundSportsHas`).
//   npm run audit:bound [-- --season=winter|all] [--school=a,b]
// Default `winter`: basketball, wrestling, swimming and bowling. Reads are
// 3 s apart, with curl: Bound's guard answered 202 with no body after
// about 350 reads 0.4 s apart (November 6). About 13 reads a school for winter.
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {BOUND_ACTS,boundEventsUrl} from '../src/high-school.mjs';
import {boundSportsHas,VARSITY_LEVEL,MS_LEVEL} from './onboard-hs.mjs';

const args=process.argv.slice(2),value=n=>{const hit=args.find(x=>x.startsWith(`--${n}=`));return hit?hit.slice(n.length+3):null};
const season=value('season')||'winter',only=value('school')?.split(',');
const WINTER=/Basketball|Wrestling|Swim|Bowling/;
const acts=Object.entries(BOUND_ACTS).filter(([act])=>season==='all'||WINTER.test(act));
const dir=new URL('../src/schools/data/',import.meta.url);
const entries=readdirSync(dir).filter(f=>/^[a-z]{2}-.+\.json$/.test(f)&&f!=='ks-aliases.json')
  .flatMap(f=>(JSON.parse(readFileSync(new URL(f,dir),'utf8')).schools||[]).map(e=>({...e,file:f})))
  .filter(e=>e.bound?.school&&(!only||only.includes(e.id)));
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const UA='Mozilla/5.0 (compatible; SAS-Sports onboarding)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=new Date(),y=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
// Top-level sports of `has` (the names src/sponsored-sports.json uses).
const TOP=new Set(['Football','Flag Football','Volleyball','Soccer','Basketball','Baseball','Softball','Cross Country','Golf','Tennis','Wrestling','Track & Field','Swimming & Diving','Bowling']);
let found=0,failed=0;
for(const entry of entries){
  const counts={},level=entry.level==='middle-school'?MS_LEVEL:VARSITY_LEVEL;
  let errors=0;
  for(const [act,ids] of acts){
    const days=new Set();
    for(const id of ids){
      await sleep(3000);
      try{
        // curl: on November 6 Bound's guard answered Node's client with 202
        // and no body while it answered curl, the same name and headers.
        const out=execFileSync('curl',['-sS','--max-time','60','-w','\n%{http_code}','-A',UA,'-H','Accept: application/json',boundEventsUrl(entry.bound.school,{start:`${y}-07-01`,end:`${y+1}-06-30`,act:id})],{maxBuffer:1e8}).toString();
        const cut=out.lastIndexOf('\n'),status=out.slice(cut+1);
        // Bound's guard answers a burst with 202 and no body.
        if(status!=='200')throw Error(`HTTP ${status}`);
        const p=JSON.parse(out.slice(0,cut));
        for(const g of Array.isArray(p)?p:[])for(const e of g?.Events||[])
          if(e?.RecordType==='comp'&&(e.IDAct===id||(e.IDActs||[]).includes(id))&&(e.Teams||[]).some(t=>t.HostSchoolID===entry.bound.school)&&level.test(String(e.LevelDisplay||'').trim()))days.add(String(e.StartDateTime||'').slice(0,10));
      }catch{errors++;}
    }
    counts[act]={current:days.size,last:0};
  }
  const bound=boundSportsHas(counts,entry.level),has=new Set(entry.sports?.has||[]),list=new Set(sponsored[entry.id]||[]);
  const lines=[
    ...bound.filter(s=>!has.has(s)).map(s=>`on Bound, not in ${entry.file} has: ${s} (${Object.entries(counts).filter(([a])=>a.includes(s.replace(/^(?:Girls|Boys) /,'').replace('Swimming & Diving','Swim').replace('Swimming','Swim'))).map(([a,n])=>`${a} ${n.current}`).join(', ')})`),
    ...[...has].filter(s=>TOP.has(s)&&!list.has(s)&&(season==='all'||WINTER.test(s.replace('Swimming','Swim')))).map(s=>`in has, not in src/sponsored-sports.json: ${s}`)
  ];
  if(errors){lines.push(`${errors} Bound read(s) failed`);failed++;}
  const winterCounts=Object.entries(counts).filter(([,n])=>n.current).map(([a,n])=>`${a} ${n.current}`).join(', ');
  console.log(`${entry.id}: ${lines.length?'':'ok'}${winterCounts?` (${winterCounts})`:''}`);
  for(const line of lines)console.log(`  ${line}`);
  found+=lines.length;
}
console.log(found?`\n${found} finding(s) in ${entries.length} schools: add the sport to the data file's has and src/sponsored-sports.json, or explain it in the module doc.`:`\n${entries.length} schools: every ${season} Bound sport is read and listed.`);
if(failed)console.log(`${failed} school(s) not fully read: Bound refused (202 with no body) or failed; rerun them with --school= after a pause.`);
process.exit(failed?2:found?1:0);
