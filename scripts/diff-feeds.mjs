// Compare a branch preview's feeds with production, card by card (user,
// November 5: "What can we learn from this to optimize the next", then "Yes,
// do all of them"). Run it whenever a change touches a shared source or
// reader of schools already in production (a timer's folders, an alias, a
// race filter): on PR #525 it found middle schools taking the high school's
// places and a Topeka school's runners on Manhattan's Eisenhower MS, which no
// test caught.
//
//   npm run diff:feeds -- --branch=<branch> [--sport="Cross Country"|all]
//     [--level=high-school,middle-school] [--school=a,b] [--out=diff.json]
//
// The preview builds afresh (`refresh=1`) and without its stored finals
// (`stored=0`, so a wrong final saved by an earlier preview build does not
// hide a fix); production is read as visitors see it. Cards are matched by
// day and title; a card that differs prints both headlines. Exit 1 when any
// feed differs, 2 on a read error.
import {readFileSync,writeFileSync} from 'node:fs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const branch=value('branch');
if(!branch){console.error('usage: npm run diff:feeds -- --branch=<branch> [--sport="Cross Country"|all] [--level=high-school,middle-school] [--school=a,b] [--out=diff.json]');process.exit(2)}
const PREVIEW=`https://${branch}-sas-sports.lovetogivepain.workers.dev`,PROD='https://sas-sports.lovetogivepain.workers.dev';
const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8'));
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const levels=(value('level')||'high-school,middle-school').split(','),only=value('school')?.split(','),sportArg=value('sport')||'Cross Country';
const ids=only||schools.filter(s=>levels.includes(s.level)).map(s=>s.id);
const pairs=ids.flatMap(id=>(sportArg==='all'?sponsored[id]||[]:[sportArg]).filter(sport=>(sponsored[id]||[]).includes(sport)).map(sport=>[id,sport]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// A generic client name: production's bot rules refuse some default ones
// (Python's urllib answered 403 on November 5).
const get=async url=>{
  for(let attempt=0;attempt<3;attempt++){
    try{const r=await fetch(url,{headers:{'User-Agent':'SAS-Sports diff-feeds','Accept':'application/json'},signal:AbortSignal.timeout(120000)});if(r.ok)return await r.json();}catch{}
    await sleep(2000*(attempt+1));
  }
  return null;
};
const rows=e=>(e.results||[]).map(r=>[r.group||'',r.participant||r.label||'',r.result||r.value||'']);
const cards=feed=>new Map(feed.flatMap(group=>[...(group.results||[]),...(group.upcoming||[]),...(group.live||[])]).map(e=>[`${e.start_time.slice(0,10)} ${e.title}`,{headline:e.headline||'',status:e.status,rows:rows(e)}]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const out={preview:PREVIEW,compared:0,same:0,differ:[],errors:[]};
for(const [id,sport] of pairs){
  const q=`school=${encodeURIComponent(id)}&sport=${encodeURIComponent(sport)}`;
  const [preview,prod]=await Promise.all([get(`${PREVIEW}/live/feed/grouped?${q}&refresh=1&stored=0`),get(`${PROD}/live/feed/grouped?${q}`)]);
  // A school new in this branch has no production feed yet.
  if(Array.isArray(preview)&&!(Array.isArray(prod)&&prod.length)){(out.added??=[]).push(`${id} ${sport}`);console.log(`NEW ${id} ${sport}: ${preview[0]?.results?.length??0} results, ${preview[0]?.upcoming?.length??0} upcoming (not in production yet)`);continue;}
  if(!Array.isArray(preview)||!Array.isArray(prod)){out.errors.push(`${id} ${sport}`);console.log(`ERROR ${id} ${sport}: no feed`);continue;}
  out.compared++;
  const a=cards(prod),b=cards(preview),changes=[];
  for(const key of [...new Set([...a.keys(),...b.keys()])].sort()){
    const x=a.get(key),y=b.get(key);
    if(!same(x,y))changes.push({card:key,prod:x?{headline:x.headline,rows:x.rows.length,first:x.rows.slice(0,3)}:null,preview:y?{headline:y.headline,rows:y.rows.length,first:y.rows.slice(0,3)}:null});
  }
  if(!changes.length){out.same++;continue;}
  out.differ.push({school:id,sport,changes});
  console.log(`DIFF ${id} ${sport}`);
  for(const c of changes)console.log(`  ${c.card}\n    production: ${c.prod?`${c.prod.headline||'-'} (${c.prod.rows} rows)`:'(no card)'}\n    preview:    ${c.preview?`${c.preview.headline||'-'} (${c.preview.rows} rows)`:'(no card)'}`);
  await sleep(1000);
}
console.log(`\n${out.compared} feeds compared: ${out.same} the same, ${out.differ.length} differ, ${out.errors.length} not read${out.added?.length?`, ${out.added.length} new in the preview`:''}.`);
const file=value('out');if(file)writeFileSync(file,JSON.stringify(out,null,1)+'\n');
process.exit(out.errors.length?2:out.differ.length?1:0);
