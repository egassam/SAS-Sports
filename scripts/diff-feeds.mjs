// Compare a branch preview's feeds with production, card by card (user,
// November 5: "What can we learn from this to optimize the next", then "Yes,
// do all of them"). Run it whenever a change touches a shared source or
// reader of schools already in production (a timer's folders, an alias, a
// race filter): on PR #525 it found middle schools taking the high school's
// places and a Topeka school's runners on Manhattan's Eisenhower MS, which no
// test caught.
//
//   npm run diff:feeds -- --branch=<branch> [--sport="Cross Country"|"Football,Volleyball"|all]
//     [--level=high-school,middle-school] [--school=a,b] [--parallel=4] [--out=diff.json]
//
// Faster since November 6 (user: "These builds keep taking a long time. How
// can we speed this up?", then "Go ahead with 1-4"): production is read
// first, and a feed production does not have (a school new in the branch) is
// not built on the preview, since there is nothing to compare it with (the
// all-sports run of #534 built 326 of those, most of its 78 minutes); feeds
// are read --parallel at a time (default 4); --sport takes a list, so a
// change is compared for the sports it touches only.
//
// The preview builds afresh (`refresh=1`) and without its stored finals
// (`stored=0`, so a wrong final saved by an earlier preview build does not
// hide a fix); production is read as visitors see it. Cards are matched by
// day and title; a card that differs prints both headlines. Exit 1 when any
// feed differs, 2 on a read error.
import {readFileSync,writeFileSync} from 'node:fs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const branch=value('branch');
if(!branch){console.error('usage: npm run diff:feeds -- --branch=<branch> [--sport="Cross Country"|"A,B"|all] [--level=high-school,middle-school] [--school=a,b] [--parallel=4] [--out=diff.json]');process.exit(2)}
const PREVIEW=`https://${branch}-sas-sports.lovetogivepain.workers.dev`,PROD='https://sas-sports.lovetogivepain.workers.dev';
const schools=JSON.parse(readFileSync(new URL('../src/schools.json',import.meta.url),'utf8'));
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const levels=(value('level')||'high-school,middle-school').split(','),only=value('school')?.split(','),sportArg=value('sport')||'Cross Country';
const ids=only||schools.filter(s=>levels.includes(s.level)).map(s=>s.id);
const sportList=sportArg==='all'?null:sportArg.split(',').map(x=>x.trim()).filter(Boolean),parallel=Math.max(1,Number(value('parallel')||4));
const pairs=ids.flatMap(id=>(sportList||sponsored[id]||[]).filter(sport=>(sponsored[id]||[]).includes(sport)).map(sport=>[id,sport]));
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
// One feed: production first; the preview is built only when production has the feed.
async function compare(id,sport){
  const q=`school=${encodeURIComponent(id)}&sport=${encodeURIComponent(sport)}`;
  const prod=await get(`${PROD}/live/feed/grouped?${q}`);
  // A school new in this branch has no production feed yet: nothing to compare.
  if(!(Array.isArray(prod)&&prod.length))return{kind:'new',lines:[`NEW ${id} ${sport}: not in production yet (not built)`]};
  const preview=await get(`${PREVIEW}/live/feed/grouped?${q}&refresh=1&stored=0`);
  if(!Array.isArray(preview))return{kind:'error',lines:[`ERROR ${id} ${sport}: no feed`]};
  const a=cards(prod),b=cards(preview),changes=[];
  for(const key of [...new Set([...a.keys(),...b.keys()])].sort()){
    const x=a.get(key),y=b.get(key);
    if(!same(x,y))changes.push({card:key,prod:x?{headline:x.headline,rows:x.rows.length,first:x.rows.slice(0,3)}:null,preview:y?{headline:y.headline,rows:y.rows.length,first:y.rows.slice(0,3)}:null});
  }
  if(!changes.length)return{kind:'same',lines:[]};
  return{kind:'differ',changes,lines:[`DIFF ${id} ${sport}`,...changes.map(c=>`  ${c.card}\n    production: ${c.prod?`${c.prod.headline||'-'} (${c.prod.rows} rows)`:'(no card)'}\n    preview:    ${c.preview?`${c.preview.headline||'-'} (${c.preview.rows} rows)`:'(no card)'}`)]};
}
// --parallel feeds at a time; each feed's lines print together.
let next=0;
await Promise.all(Array.from({length:Math.min(parallel,pairs.length)},async()=>{
  while(next<pairs.length){
    const [id,sport]=pairs[next++],r=await compare(id,sport);
    if(r.kind==='new')(out.added??=[]).push(`${id} ${sport}`);
    else if(r.kind==='error')out.errors.push(`${id} ${sport}`);
    else{out.compared++;if(r.kind==='same')out.same++;else out.differ.push({school:id,sport,changes:r.changes});}
    if(r.lines.length)console.log(r.lines.join('\n'));
  }
}));
console.log(`\n${out.compared} feeds compared: ${out.same} the same, ${out.differ.length} differ, ${out.errors.length} not read${out.added?.length?`, ${out.added.length} new in the preview (not built)`:''}.`);
const file=value('out');if(file)writeFileSync(file,JSON.stringify(out,null,1)+'\n');
process.exit(out.errors.length?2:out.differ.length?1:0);
