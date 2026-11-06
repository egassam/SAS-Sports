// A surveyed county into the app in one step (user, November 5: "Learn and
// optimize"). From scripts/onboard-hs.mjs's draft and catalog files it
// writes src/schools/data/<state>-<county>.json, registers the file in
// src/schools/ks-counties.mjs, and adds each school's catalog entry
// (src/schools.json), sponsored sports and team colors. Review the draft
// first: drop schools to skip (or pass --skip), fix names and ids.
//
//   node scripts/add-county.mjs --draft=<County>-draft.json [--catalog=<County>-catalog.json]
//     --doc=docs/<DOC>.md [--skip=id,id] [--rename=old:new,...] [--dry-run]
import {readFileSync,writeFileSync} from 'node:fs';
import {schoolsFromConfig} from '../src/high-school-builders.mjs';

const args=process.argv.slice(2),value=n=>{const hit=args.find(x=>x.startsWith(`--${n}=`));return hit?hit.slice(n.length+3):null};
const draftPath=value('draft');
if(!draftPath||!value('doc')){console.error('usage: node scripts/add-county.mjs --draft=<draft.json> --doc=docs/<DOC>.md [--catalog=<catalog.json>] [--skip=id,...] [--rename=old:new,...] [--dry-run]');process.exit(2)}
const draft=JSON.parse(readFileSync(draftPath,'utf8'));
const catalog=JSON.parse(readFileSync(value('catalog')||draftPath.replace(/-draft\.json$/,'-catalog.json'),'utf8'));
const skip=new Set((value('skip')||'').split(',').filter(Boolean));
const rename=new Map((value('rename')||'').split(',').filter(Boolean).map(p=>p.split(':')));
const root=new URL('../',import.meta.url),file=p=>new URL(p,root);
const county=draft.counties[0],state=draft.state||'ks',dry=args.includes('--dry-run');

// --- Names and colors
const TITLE={'high-school':'High School','middle-school':'Middle School'};
// "Hanover High", "Republic County Jr./Sr. High School" -> "Hanover High School";
// a middle school keeps its kind ("Junior High", "Middle School").
export function displayName(entry,facts){
  // KSHSAA's "Salina-Central HS", "Lawrence-West MS": the town and the name (November 6).
  const raw=String(facts.kshsaaName||facts.name||entry.name).replace(/\s+/g,' ').trim();const town=String(facts.town||'').split(/\s+/)[0];
  const named=town&&raw.startsWith(`${town}-`)&&/^[A-Z]/.test(raw.slice(town.length+1))?`${town} ${raw.slice(town.length+1)}`:raw;
  if(entry.level==='middle-school'){
    const base=named.replace(/\b(?:MS|Middle School|Middle|JH|Jr\.? High(?: School)?|Junior High(?: School)?)$/i,'').trim();
    return `${base} ${/\b(?:JH|Jr\.? High|Junior High)(?: School)?$/i.test(named)?'Junior High':'Middle School'}`;
  }
  // A name that is already a school's ("Cair Paravel Latin School", "Bishop Seabury Academy").
  if(/\b(?:School|Academy)$/.test(named)&&!/\bHigh School$/.test(named))return named;
  const base=named.replace(/\b(?:HS|High School|High|Jr\.?\s*\/\s*Sr\.?\s*High(?: School)?|Junior\s*\/\s*Senior High(?: School)?|Sr\.? High)$/i,'').trim();
  return `${base} ${TITLE[entry.level]}`;
}
export const shortName=name=>name.replace(/\s+(?:High School|Middle School|Junior High)$/,'');
const hex=h=>h.replace('#','').match(/../g).map(x=>parseInt(x,16)),toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const lum=h=>{const [r,g,b]=hex(h).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
const plain=h=>lum(h)>0.85||lum(h)<0.02||Math.max(...hex(h))-Math.min(...hex(h))<24;
// Bound's colors: the first that is a color (not white, black or gray) leads.
export function themeFor(colors){
  const list=(colors||[]).filter(c=>/^#[0-9a-f]{6}$/i.test(c));
  const primary=list.find(c=>!plain(c))||list[0]||'#444444',secondary=list.find(c=>c!==primary&&lum(c)<0.85)||list.find(c=>c!==primary)||'#ffffff';
  return{primary:primary.toUpperCase(),secondary:secondary.toUpperCase(),panel:toHex(hex(primary).map(v=>v*.45)),panelDark:toHex(hex(primary).map(v=>v*.2)),line:toHex(hex(primary).map(v=>v+(255-v)*.25)),onAccent:lum(primary)>0.45?'#111111':'#ffffff'};
}
// KSHSAA writes a junior high league "<league> Jr."; "NCAA" is the North
// Central Activities Association.
const LEAGUE_NAMES={NCAA:'North Central Activities Association'};
// KSHSAA's "Independent - JH" is no league (November 6: Lawrence's and Salina's middle schools).
const leagueName=l=>{if(!l||/^Independent\b/i.test(l))return null;const base=l.replace(/\s+Jr\.?$/,'').trim();return LEAGUE_NAMES[base]||(/league|association|conference/i.test(base)?base:`${base} League`);};
const website=w=>!w?null:/^https?:/i.test(w)?w.replace(/\/$/,''):`https://${w.replace(/\/$/,'')}`;

// --- The data file
const entries=draft.schools.filter(e=>!skip.has(e.id)).map(e=>{const id=rename.get(e.id)||e.id;return{...e,id};});
const factsFor=e=>catalog.schools[[...rename].find(([,n])=>n===e.id)?.[0]||e.id]||{};
for(const e of entries)e.name=displayName(e,factsFor(e));
const dataName=`${state}-${county.toLowerCase().replace(/\s+/g,'-')}.json`;
const data={state,counties:[county],module_doc:value('doc'),note:`Schools whose schedule is on Bound, as data (src/high-school-builders.mjs schoolFromConfig), from scripts/onboard-hs.mjs and scripts/add-county.mjs. Schools left out are listed in the module doc.`,schools:entries.map(({note,...e})=>({...e,...(e.sports?.maxprepsSchedule?{note:"Enters few of its own games on Bound: its games also read MaxPreps' schedule (sports.maxprepsSchedule)."}:{})}))};
const built=schoolsFromConfig(data);

// --- Catalog, sponsored sports, colors
const schools=JSON.parse(readFileSync(file('src/schools.json'),'utf8')),sponsored=JSON.parse(readFileSync(file('src/sponsored-sports.json'),'utf8')),themes=JSON.parse(readFileSync(file('src/team-themes.json'),'utf8'));
const taken=new Set(schools.map(s=>s.id));
const added=[];
for(const e of entries){
  if(taken.has(e.id)){console.error(`${e.id} is already in src/schools.json`);process.exit(1)}
  const f=factsFor(e),short=shortName(e.name),ms=e.level==='middle-school';
  const providers=[{provider:'BOUND',slug:e.bound.slug?`${state}/schools/${e.bound.slug}`:`${state}`,provider_school_id:e.bound.school}];
  if(e.maxpreps)providers.push({provider:'MAXPREPS',slug:`${state}/${e.maxpreps.path}`,provider_school_id:e.maxpreps.schoolId});
  added.push({id:e.id,name:e.name,short_name:short,state:'Kansas',city:f.town||null,county:`${county} County`,conference:leagueName(f.league),classification:ms?'Middle School':f.class||null,level:e.level,
    division:ms?'Middle school':`KSHSAA ${f.class||''}`.trim(),athletics_url:website(f.website)||(e.bound.slug?`https://beta.gobound.com/${state}/schools/${e.bound.slug}`:null),
    aliases:[...new Set([e.name,short,f.boundName,f.mascot?`${short} ${f.mascot}`:null].filter(Boolean))],providers});
  sponsored[e.id]=Object.keys(built[e.id].sports).sort();
  themes[e.id]=themeFor(f.colors);
}
let at=-1;schools.forEach((s,i)=>{if(s.level==='high-school'||s.level==='middle-school')at=i});
schools.splice(at+1,0,...added);

// --- Registration (src/schools/ks-counties.mjs)
const regPath=file('src/schools/ks-counties.mjs');let reg=readFileSync(regPath,'utf8');
const constName=county.toUpperCase().replace(/[^A-Z0-9]+/g,'_');
if(!reg.includes(`./data/${dataName}`)){
  reg=reg.replace(/(import [A-Z_]+ from '\.\/data\/[^']+' with \{type:'json'\};\n)(?!import [A-Z_]+ from '\.\/data)/,`$1import ${constName} from './data/${dataName}' with {type:'json'};\n`);
  reg=reg.replace(/export const KS_COUNTY_FILES=\[([^\]]*)\];/,(m,list)=>`export const KS_COUNTY_FILES=[${list},${constName}];`);
}
console.log(`${county}: ${entries.length} schools (${entries.map(e=>e.id).join(', ')})${skip.size?`; skipped ${[...skip].join(', ')}`:''}`);
for(const a of added)console.log(`  ${a.id}: ${a.name} · ${a.city} · ${a.classification} · ${a.conference||'-'} · ${sponsored[a.id].join(', ')} · ${themes[a.id].primary}`);
if(dry){console.log('(dry run: nothing written)');process.exit(0)}
writeFileSync(file(`src/schools/data/${dataName}`),JSON.stringify(data,null,1)+'\n');
writeFileSync(file('src/schools.json'),JSON.stringify(schools,null,2)+'\n');
writeFileSync(file('src/sponsored-sports.json'),JSON.stringify(sponsored,null,2)+'\n');
writeFileSync(file('src/team-themes.json'),JSON.stringify(themes,null,2)+'\n');
writeFileSync(regPath,reg);
