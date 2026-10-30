// Every middle and high school calendar against the app's sports list (user,
// October 30: "You need to learn from this and optimize!", after Anthony's
// girls basketball was missing). A school publishes a season's teams on its
// calendar weeks before the games; this reads each calendar for the school
// year and reports (src/high-school.mjs `calendarSportsAudit`):
//   - sports the module reads that src/sponsored-sports.json leaves out;
//   - sport teams on the calendar no sport of the module reads;
//   - titles in a sport's shorthand the title reader cannot read.
// Schools scheduled from Bound list every sport they enter there.
//   npm run audit:sports            (exit 1 when anything is found)
// Run daily by .github/workflows/live-health.yml.
import {readFileSync} from 'node:fs';
import {calendarSportsAudit} from '../src/high-school.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
import {anthonyMsSchool,eisenhowerMsSchool} from '../src/schools/manhattan-ks-middle.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
import {KAS_KS_HIGH_SCHOOLS} from '../src/schools/kas-ks.mjs';

const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const modules=[manhattanKsSchool,anthonyMsSchool,eisenhowerMsSchool,...RILEY_POTTAWATOMIE_HIGH_SCHOOLS,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS,...KAS_KS_HIGH_SCHOOLS].filter(m=>m.calendar?.url);
// The school year in Kansas: July to June.
const now=new Date(),year=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
const range=`start_date=${year}-07-01&end_date=${year+1}-06-30`;
const payloads=new Map();
async function payload(calendar){
  const url=`${calendar.url}${calendar.url.includes('?')?'&':'?'}${range}`;
  if(!payloads.has(url))payloads.set(url,fetch(url,{headers:{'User-Agent':'SAS-Sports audit (+https://sas-sports.lovetogivepain.workers.dev)'},signal:AbortSignal.timeout(30000)}).then(async r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);const text=await r.text();return calendar.read?calendar.read(text):JSON.parse(text);}));
  return payloads.get(url);
}
let found=0;
for(const module of modules){
  let data;
  try{data=await payload(module.calendar);}catch(error){console.log(`${module.id}: calendar unreadable (${error.message})`);found++;continue;}
  const siblings=modules.filter(m=>m!==module&&m.calendar.url===module.calendar.url);
  const {unlisted,unread,unparsed}=calendarSportsAudit(data,module,sponsored[module.id]||[],siblings);
  const lines=[...unlisted.map(x=>`not in the sports list: ${x.name} (${x.events} events)`),...unread.map(x=>`no sport reads team "${x.name}" (${x.events} events)`),...unparsed.slice(0,8).map(x=>`title not read: "${x.name}"`)];
  if(unparsed.length>8)lines.push(`... ${unparsed.length-8} more titles not read`);
  console.log(`${module.id}: ${lines.length?'':'ok'}`);for(const line of lines)console.log(`  ${line}`);
  found+=lines.length;
}
console.log(found?`\n${found} finding(s): add the sport (module and src/sponsored-sports.json) or teach the title reader.`:'\nEvery published team is read and listed.');
process.exit(found?1:0);
