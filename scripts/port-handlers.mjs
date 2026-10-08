// Starts a freshly scaffolded school module from a converted school's
// handlers (the fast path since Texas Tech: "copy everything from
// `const HOST=` down and rename"), in one command:
//   - keeps the target's school object (routes, combined sports) and its
//     scaffolded host, time zone and TFRRS team line;
//   - renames the source's id, identifiers, constants and school name;
//   - prints every remaining line naming the source school (its own rules,
//     TFRRS team name, nicknames) for a by-eye decision.
// Run it before the fixture fetch, so the fetch reads the module's routes.
//
//   node scripts/port-handlers.mjs --from=mississippi-state --to=tennessee [--nickname=Bulldogs:Volunteers]
import {readFileSync,writeFileSync} from 'node:fs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const from=value('from'),to=value('to');
if(!from||!to){console.error('usage: node scripts/port-handlers.mjs --from=<converted id> --to=<scaffolded id> [--nickname=Old:New]');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const schools=JSON.parse(read('src/schools.json')),name=id=>schools.find(s=>s.id===id)?.name;
const names=id=>{const camel=id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return{id,camel,Pascal:camel[0].toUpperCase()+camel.slice(1),CONST:id.replace(/-/g,'_').toUpperCase(),name:name(id)}};
const a=names(from),b=names(to);
const source=read(`src/schools/${from}.mjs`),target=read(`src/schools/${to}.mjs`);
const cut=text=>{const at=text.indexOf("\nconst HOST=");if(at<0)throw Error('no `const HOST=` line');return[text.slice(0,at+1),text.slice(at+1)]};
const [head,scaffolded]=cut(target),[,handlers]=cut(source);
const line=(text,re)=>text.split('\n').find(l=>re.test(l));
const host=line(scaffolded,/^const HOST=/),todayLine=line(scaffolded,/^const \w+Today=sidearmToday\(/),tfrrsLine=line(scaffolded,/^export const \w+_TFRRS_TEAMS=/);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let out=handlers
  .replace(new RegExp(escape(a.Pascal),'g'),b.Pascal)
  .replace(new RegExp(`\\b${escape(a.camel)}`,'g'),b.camel)
  .replace(new RegExp(`\\b${escape(a.CONST)}_`,'g'),`${b.CONST}_`)
  .replace(new RegExp(`'${escape(a.id)}'`,'g'),`'${b.id}'`)
;
// The school's name changes in code and in the module's own lines (its
// calendar day, TFRRS pages, site); other comments cite the source school's
// examples and keep its name.
out=out.split('\n').map(l=>!/^\s*\/\//.test(l)||/calendar day|TFRRS cross country team pages|\(Nuxt\) site/.test(l)?l.replace(new RegExp(escape(a.name),'g'),b.name):l).join('\n');
const lines=out.split('\n');
const swap=(re,replacement)=>{const i=lines.findIndex(l=>re.test(l));if(i>=0&&replacement)lines[i]=replacement};
swap(/^const HOST=/,host);swap(/^const \w+Today=sidearmToday\(/,todayLine);swap(/^export const \w+_TFRRS_TEAMS=/,tfrrsLine);
out=lines.join('\n');
const [oldNick,newNick]=(value('nickname')||':').split(':');
// Nicknames in code only; comments keep the source school's examples.
if(oldNick&&newNick)out=out.split('\n').map(l=>/^\s*\/\//.test(l)?l:l.replace(new RegExp(`\\b${escape(oldNick)}\\b`,'g'),newNick)).join('\n');
writeFileSync(new URL(`src/schools/${to}.mjs`,root),head+out);
// The import line must carry every kit helper the handlers use.
const imports=source.split('\n').filter(l=>l.startsWith('import '));
const kept=(head.split('\n').filter(l=>l.startsWith('import ')));
if(imports.join('\n')!==kept.join('\n')){
  let next=read(`src/schools/${to}.mjs`);for(const [i,l] of kept.entries())next=next.replace(l,imports[i]??'');writeFileSync(new URL(`src/schools/${to}.mjs`,root),next);
}
console.log(`src/schools/${to}.mjs: ${from}'s handlers, renamed (${a.name} -> ${b.name}); host, time zone and TFRRS line kept from the scaffold.`);
const sourceWords=[from,a.name,...(schools.find(s=>s.id===from)?.aliases||[]),new URL(schools.find(s=>s.id===from).athletics_url).hostname.replace(/^www\./,'')].filter(Boolean);
// Per-school options carried over (a TFRRS team name, opt-in kit rules) are
// listed too.
const left=out.split('\n').map((l,i)=>[i,l]).filter(([,l])=>sourceWords.some(w=>l.includes(w))||/\btfrrsTeam:|volleyballSetScores:true|_TFRRS_TEAMS=\{Women:null,Men:null\}/.test(l));
console.log(left.length?`Lines still naming ${a.name} (decide each by eye):\n`+left.map(([i,l])=>`  ${l.trim().slice(0,160)}`).join('\n'):`No line still names ${a.name}.`);
