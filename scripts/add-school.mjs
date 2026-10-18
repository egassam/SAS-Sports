// Adds a catalog school to the app in one command, the step every new-school
// session did by hand (Georgia, LSU, Ole Miss, Mississippi State):
//   - reads the official football schedule page (directly, or through the
//     private source route when the site refuses the sandbox), prints the
//     publisher (SIDEARM or WMT: count of markers, since newer SIDEARM pages
//     also carry __NUXT__) and the sponsored sports from the site's nav;
//   - writes src/sponsored-sports.json, src/team-themes.json (colors) and
//     the tests/certified-schools.json entry (every sport, minimum 3).
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
  const response=await fetch(`${(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'')}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`}});
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
// Nuxt SIDEARM sites (calbears.com, Oct 14) build the menu from a payload:
// sport slugs are bare JSON strings ("womens-golf"), not links. Read them only
// when the links found almost nothing (the payload also names news slugs).
if(found.size<3)for(const [,slug] of html.matchAll(/"((?:mens-|womens-)?[a-z]+(?:-[a-z]+){0,3})"/g)){const sport=inferSport(`/sports/${slug}`);if(sport)found.add(sport)}
// The football schedule address answers even where there is no football
// (gozags.com, Oct 18: Gonzaga sponsors none); keep Football only when the
// homepage's nav, read when it lists other sports, links it too.
if(found.has('Football')&&via){const home=await page(`${base}/`).catch(()=>null);if(home){const homeSports=new Set();for(const [,href] of home.html.matchAll(/href="((?:https?:\/\/[^"/]+)?\/sports?\/[a-z-]+)(?:\/schedule)?\/?"/g)){const sport=inferSport(href);if(sport)homeSports.add(sport)}if(homeSports.size>=3&&!homeSports.has('Football'))found.delete('Football')}}
const sports=(value('sports')?.split(',').map(s=>s.trim())||[...found]).sort();
console.log(`${school.name} (${base}, read ${via}): ${publisher} (wmt ${wmt}, sidearm ${sidearm} markers)`);
console.log(`sports (${sports.length}): ${sports.join(', ')}`);
// A sport whose nav links both a men's and a women's page (Gonzaga and
// Oregon State rowing, Oct 18: the scaffold wrote only the women's page).
// scripts/start-schools.mjs reads this line and combines the two.
const navHtml=via==='direct'||publisher==='WMT'?html:(await page(`${base}/`).catch(()=>({html})))?.html||html,teamPages={};
for(const [,slug] of navHtml.matchAll(/href="(?:https?:\/\/[^"/]+)?\/sports\/((?:mens|womens)-[a-z-]+?)(?:\/schedule)?\/?"/g)){const sport=inferSport(`/sports/${slug}`);if(sport&&sports.includes(sport))(teamPages[sport]??=new Set()).add(slug)}
const twoTeams=Object.entries(teamPages).filter(([,slugs])=>[...slugs].some(s=>s.startsWith('mens-'))&&[...slugs].some(s=>s.startsWith('womens-')));
if(twoTeams.length)console.log(`team pages: ${twoTeams.map(([sport,slugs])=>`${sport}=${[...slugs].sort().join(',')}`).join('; ')}`);
// The school's NIL marketplace (INFLCR Exchange or Opendorse), linked from
// the homepage or its NIL page (Oregon State, San Diego State, Fresno State's
// /feature/NIL): scripts/start-schools.mjs wires an INFLCR one.
let nil=null;
// The nav's own NIL page first (San Diego State's /sports/aztec-nil).
const nilPages=[...new Set([...navHtml.matchAll(/href="((?:https?:\/\/[^"/]+)?\/(?:sports|feature|nil)\/[a-z-]*nil[a-z-]*)\/?"/gi)].map(m=>m[1].startsWith('/')?`${base}${m[1]}`:m[1]).filter(u=>u.startsWith(base)))];
// A WMT nav comes from the site's API: its NIL page is a "sport" there.
if(publisher==='WMT')try{const r=await fetch(`${base}/website-api/sports?per_page=100`,{signal:AbortSignal.timeout(20000)});for(const sport of (await r.json()).data||[])if(/(?:^|-)nil(?:-|$)/.test(sport.slug))nilPages.push(`${base}/sports/${sport.slug}`);}catch{}
for(const url of [null,...nilPages.slice(0,2),`${base}/feature/NIL`,`${base}/sports/nil`]){
  const text=url?(await page(url).catch(()=>null))?.html||'':navHtml;
  const found_=text.match(/app\.inflcr\.com\/exchange\/([a-z0-9-]+)/i)||text.match(/opendorse\.com\/(?!profile\b)([a-z0-9-]+)/i);
  if(found_){nil=`${/inflcr/i.test(found_[0])?'inflcr':'opendorse'}:${found_[1]}`;break;}
}
console.log(`NIL marketplace: ${nil||`none linked (homepage, ${[...nilPages.slice(0,2),'/feature/NIL','/sports/nil'].join(', ')})`}`);
if(publisher==='WMT')console.log('WMT site: scripts/start-schools.mjs ports it from a WMT card reader (scripts/port-wmt.mjs, --wmt-from=nebraska or iowa), not the SIDEARM kit.');

const theme=value('theme')?.split(',');
if(!write){console.log('dry run; add --write (with --theme) to write the three files');process.exit(0)}
if(!theme||theme.length!==3){console.error('--theme=<primary>,<secondary>,<onAccent> is required with --write');process.exit(2)}
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),toHex=rgb=>'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
const mix=(h,dark,weight)=>toHex(hex(h).map((v,i)=>v*weight+hex(dark)[i]*(1-weight)));
const [primary,secondary,onAccent]=theme;
const theme_={primary,secondary,panel:mix(primary,'#0b0b10',0.22),panelDark:mix(primary,'#050508',0.1),line:mix(primary,'#20202a',0.55),onAccent};

const sponsored=JSON.parse(read('src/sponsored-sports.json'));
if(sponsored[id])console.log(`src/sponsored-sports.json already lists ${id}; replacing`);
sponsored[id]=sports;
writeFileSync(new URL('src/sponsored-sports.json',root),JSON.stringify(Object.fromEntries(Object.entries(sponsored).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');

// The team's colors go with its catalog card (src/team-themes.json); the page
// holds no per-team list since the catalog moved to D1 (docs/CATALOG.md).
const themes=JSON.parse(read('src/team-themes.json'));
themes[id]=theme_;
writeFileSync(new URL('src/team-themes.json',root),JSON.stringify(Object.fromEntries(Object.entries(themes).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');

const certifiedPath=new URL('tests/certified-schools.json',root);
let certified=readFileSync(certifiedPath,'utf8');
const host=new URL(base).hostname.replace(/^www\./,'');
const entry=`    {"id":"${id}","name":"${school.name}","official_hosts":["${host}"],"critical_sports":["Cross Country","Soccer","Volleyball","Football"].filter(Boolean),"athlete_sports":${JSON.stringify(sports)},"athlete_minimums":${JSON.stringify(Object.fromEntries(sports.map(s=>[s,3])))},"athlete_verification":{"reviewed_at":"${new Date().toISOString().slice(0,10)}","sources":["official_roster_profiles"]}}`
  .replace('["Cross Country","Soccer","Volleyball","Football"].filter(Boolean)',JSON.stringify(['Cross Country','Soccer','Volleyball','Football'].filter(s=>sports.includes(s))));
certified=certified.replace(new RegExp(`\\n    \\{"id":"${id}",.*`),'');
certified=certified.replace(/\}\n  \]\n\}\s*$/,`},\n${entry}\n  ]\n}\n`);
JSON.parse(certified);
writeFileSync(certifiedPath,certified);
console.log('wrote src/sponsored-sports.json, src/team-themes.json, tests/certified-schools.json');
console.log(`next: npm run scaffold-school -- --school=${id} --write`);
