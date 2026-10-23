// Sets one sport's routes in a converted SIDEARM school, or removes the
// sport, everywhere it is registered at once: the module's scheduleUrls,
// rosterUrls, pageDataSports and combinedSports, src/sponsored-sports.json,
// the school's line in tests/certified-schools.json (athlete sports and
// minimums) and the sport count in tests/<id>-module.mjs. Onboarding the
// American, Conference USA, WCC and Atlantic 10 (Oct 22) set about sixty
// routes from each site's menu this way (the scaffold's routes were the
// homepage, an old season or SIDEARM's empty template).
//   node scripts/set-sport-routes.mjs <id> set "<Sport>" <slug>[,<slug>...]
//   node scripts/set-sport-routes.mjs <id> remove "<Sport>"
// Two slugs make the sport combined (labeled by team). Fetch the new pages
// after (scripts/fetch-school-fixtures.mjs --sports=) and regenerate the
// module's tests.
import {readFileSync,writeFileSync} from 'node:fs';

const [id,op,sport,slugList]=process.argv.slice(2);
if(!id||!['set','remove'].includes(op)||!sport||op==='set'&&!slugList){console.error('usage: set-sport-routes.mjs <id> (set <Sport> <slug>[,<slug>] | remove <Sport>)');process.exit(2)}
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8'),write=(p,t)=>writeFileSync(new URL(p,root),t);
let mod=read(`src/schools/${id}.mjs`);
const host=(mod.match(/const HOST='([^']+)'/)||[])[1];if(!host){console.error(`${id}: no HOST in the module`);process.exit(1)}
const key=`'${id}|${sport}'`,slugs=op==='set'?slugList.split(','):[];
function setRoutes(text,kind,urls){
  const re=new RegExp(`(${kind}Urls:\\{\\n)([\\s\\S]*?)(\\n  \\})`);
  return text.replace(re,(all,open,body,close)=>{
    const entries=body.split('\n').filter(l=>l.trim().startsWith("'")&&!l.trim().startsWith(key)).map(l=>l.replace(/,\s*$/,''));
    if(urls.length)entries.push(`    ${key}:${urls.length===1?`'${urls[0]}'`:`[${urls.map(u=>`'${u}'`).join(',')}]`}`);
    const sportOf=l=>(l.match(/^\s*'[^|]+\|([^'|]+)'/)||[])[1]||'';
    entries.sort((a,b)=>sportOf(a).localeCompare(sportOf(b)));
    return open+entries.join(',\n')+close;
  });
}
mod=setRoutes(mod,'schedule',slugs.map(s=>`https://${host}/sports/${s}/schedule`));
mod=setRoutes(mod,'roster',slugs.map(s=>`https://${host}/sports/${s}/roster`));
if(op==='remove')mod=mod.split('\n').filter(l=>!l.trim().startsWith(`'${id}|${sport}|`)).join('\n');
const setOf=(text,name,update)=>text.replace(new RegExp(`${name}:new Set\\(\\[([^\\]]*)\\]\\)`),(all,list)=>{const items=new Set(list.split(',').map(x=>x.trim().replace(/^'|'$/g,'')).filter(Boolean));update(items);return`${name}:new Set([${[...items].sort().map(x=>`'${x}'`).join(',')}])`;});
mod=setOf(mod,'pageDataSports',items=>op==='remove'?items.delete(sport):items.add(sport));
mod=setOf(mod,'combinedSports',items=>slugs.length>1?items.add(sport):items.delete(sport));
write(`src/schools/${id}.mjs`,mod);
const sponsored=JSON.parse(read('src/sponsored-sports.json'));
sponsored[id]=[...new Set(op==='remove'?sponsored[id].filter(s=>s!==sport):[...sponsored[id],sport])].sort();
write('src/sponsored-sports.json',JSON.stringify(sponsored,null,2)+'\n');
// Only the school's own line (a bare string replace once changed three schools).
write('tests/certified-schools.json',read('tests/certified-schools.json').split('\n').map(line=>{
  if(!line.trim().startsWith(`{"id":"${id}"`))return line;
  const trail=line.trimEnd().endsWith(',')?',':'',o=JSON.parse(line.trim().replace(/,$/,''));
  for(const field of ['athlete_sports','critical_sports','athlete_profile_fallback_sports'])if(o[field])o[field]=o[field].filter(s=>s!==sport);
  delete o.athlete_minimums[sport];
  if(op==='set'){o.athlete_sports=[...o.athlete_sports,sport].sort();o.athlete_minimums[sport]=3;o.athlete_minimums=Object.fromEntries(Object.entries(o.athlete_minimums).sort());}
  return line.match(/^\s*/)[0]+JSON.stringify(o)+trail;
}).join('\n'));
try{write(`tests/${id}-module.mjs`,read(`tests/${id}-module.mjs`).replace(/assert\.equal\(sports\.length,\d+\);/,`assert.equal(sports.length,${sponsored[id].length});`));}catch{}
console.log(`${id}: ${op} ${sport}${slugs.length?` → ${slugs.join(', ')}`:''}; sports: ${sponsored[id].join(', ')}`);
