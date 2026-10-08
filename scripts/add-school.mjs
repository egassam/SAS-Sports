// Adds a catalog school to the app in one command, the step every new-school
// session did by hand (Georgia, LSU, Ole Miss, Mississippi State):
//   - reads the official football schedule page (directly, or through the
//     private source route when the site refuses the sandbox), prints the
//     publisher (SIDEARM or WMT: count of markers, since newer SIDEARM pages
//     also carry __NUXT__) and the sponsored sports from the site's nav;
//   - writes src/sponsored-sports.json, SCHOOL_SPORTS and TEAM_THEMES in
//     public/index.html, and the tests/certified-schools.json entry (every
//     sport, minimum 3).
// Then run scripts/scaffold-school.mjs.
//
//   NODE_USE_ENV_PROXY=1 node scripts/add-school.mjs --school=tennessee --theme=#FF8200,#58595B,#07111f [--sports=A,B] [--write]
// --theme is primary,secondary,onAccent (on-accent: #ffffff on dark
// primaries, #07111f on light ones); panel colors are derived from primary.
import {readFileSync,writeFileSync} from 'node:fs';
import {inferSport} from './onboard-school.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school'),write=args.includes('--write');
if(!id){console.error('usage: node scripts/add-school.mjs --school=<id> --theme=<primary>,<secondary>,<onAccent> [--sports=A,B] [--write]');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const school=JSON.parse(read('src/schools.json')).find(s=>s.id===id);
if(!school){console.error(`unknown school ${id}`);process.exit(2)}
const base=school.athletics_url.replace(/\/$/,'');

async function page(url){
  try{const response=await fetch(url,{headers:{'user-agent':'SAS-Sports onboarding (+https://sas-sports.lovetogivepain.workers.dev)'}});if(response.ok)return{html:await response.text(),via:'direct'}}catch{}
  const key=process.env.SAS_SOURCE_KEY;if(!key)throw Error(`${url} refused the sandbox and SAS_SOURCE_KEY is not set`);
  const response=await fetch(`https://sas-sports.lovetogivepain.workers.dev/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`}});
  if(!response.ok)throw Error(`${url}: ${response.status} through the private source`);
  return{html:await response.text(),via:'private source'};
}

// Some sites (Arkansas, WordPress) have no /sports/football/schedule: read
// the homepage, whose nav lists every sport.
const {html,via}=await page(`${base}/sports/football/schedule`).catch(()=>page(`${base}/`));
const count=re=>(html.match(re)||[]).length,wmt=count(/wmt/gi),sidearm=count(/sidearm/gi);
const publisher=wmt>sidearm?'WMT':'SIDEARM';
const found=new Set();
for(const [,href] of html.matchAll(/href="([^"]*\/sports?\/[a-z-]+\/schedule)\/?"/g)){const sport=inferSport(href);if(sport)found.add(sport)}
// Newer SIDEARM navs link each sport's home (`/sports/womens-soccer`), not its
// schedule (Illinois and Indiana listed only Football): read those too.
for(const [,href] of html.matchAll(/href="((?:https?:\/\/[^"/]+)?\/sports?\/[a-z-]+)\/?"/g)){const sport=inferSport(href);if(sport)found.add(sport)}
const sports=(value('sports')?.split(',').map(s=>s.trim())||[...found]).sort();
console.log(`${school.name} (${base}, read ${via}): ${publisher} (wmt ${wmt}, sidearm ${sidearm} markers)`);
console.log(`sports (${sports.length}): ${sports.join(', ')}`);
if(publisher==='WMT')console.log('WMT site: after scaffolding, start the module from src/schools/lsu.mjs (own card reader), not the SIDEARM kit.');

const theme=value('theme')?.split(',');
if(!write){console.log('dry run; add --write (with --theme) to write the four files');process.exit(0)}
if(!theme||theme.length!==3){console.error('--theme=<primary>,<secondary>,<onAccent> is required with --write');process.exit(2)}
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),toHex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const mix=(h,dark,weight)=>toHex(hex(h).map((v,i)=>v*weight+hex(dark)[i]*(1-weight)));
const [primary,secondary,onAccent]=theme;
const themeLine=`  ${/-/.test(id)?`'${id}'`:id}:{primary:'${primary}',secondary:'${secondary}',panel:'${mix(primary,'#0b0b10',0.22)}',panelDark:'${mix(primary,'#050508',0.1)}',line:'${mix(primary,'#20202a',0.55)}',onAccent:'${onAccent}'},`;

const sponsored=JSON.parse(read('src/sponsored-sports.json'));
if(sponsored[id])console.log(`src/sponsored-sports.json already lists ${id}; replacing`);
sponsored[id]=sports;
writeFileSync(new URL('src/sponsored-sports.json',root),JSON.stringify(Object.fromEntries(Object.entries(sponsored).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');

let index=read('public/index.html');
const key=`'${id}'`;
index=index.replace(new RegExp(`^\\s*(?:${key}|${id}):\\{primary:.*\\n`,'m'),'').replace(new RegExp(`^\\s*${key}:\\[.*\\n`,'m'),'');
index=index.replace(/(\n  lsu:\{primary:)/,`\n${themeLine}$1`);
index=index.replace(/(\n  'lsu':\[)/,`\n  ${key}:[${sports.map(s=>`'${s}'`).join(',')}],$1`);
if(!index.includes(themeLine)||!index.includes(`${key}:[`))throw Error('could not place the theme or sports line in public/index.html');
writeFileSync(new URL('public/index.html',root),index);

const certifiedPath=new URL('tests/certified-schools.json',root);
let certified=readFileSync(certifiedPath,'utf8');
const host=new URL(base).hostname.replace(/^www\./,'');
const entry=`    {"id":"${id}","name":"${school.name}","official_hosts":["${host}"],"critical_sports":["Cross Country","Soccer","Volleyball","Football"].filter(Boolean),"athlete_sports":${JSON.stringify(sports)},"athlete_minimums":${JSON.stringify(Object.fromEntries(sports.map(s=>[s,3])))},"athlete_verification":{"reviewed_at":"${new Date().toISOString().slice(0,10)}","sources":["official_roster_profiles"]}}`
  .replace('["Cross Country","Soccer","Volleyball","Football"].filter(Boolean)',JSON.stringify(['Cross Country','Soccer','Volleyball','Football'].filter(s=>sports.includes(s))));
certified=certified.replace(new RegExp(`\\n    \\{"id":"${id}",.*`),'');
certified=certified.replace(/\}\n  \]\n\}\s*$/,`},\n${entry}\n  ]\n}\n`);
JSON.parse(certified);
writeFileSync(certifiedPath,certified);
console.log('wrote src/sponsored-sports.json, public/index.html (SCHOOL_SPORTS, TEAM_THEMES), tests/certified-schools.json');
console.log(`next: npm run scaffold-school -- --school=${id} --write`);
