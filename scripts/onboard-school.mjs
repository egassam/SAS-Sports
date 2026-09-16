import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const SPORT_SLUGS={
  'Football':['football'],'Volleyball':['womens-volleyball','volleyball','wvball'],
  'Soccer':['womens-soccer','soccer','wsoc'],'Cross Country':['cross-country','xc'],
  'Basketball':['mens-basketball','womens-basketball','basketball'],
  'Swimming & Diving':['swimming-and-diving','swimming-diving','swimming'],
  'Wrestling':['wrestling'],'Tennis':['womens-tennis','mens-tennis','tennis'],
  'Golf':['womens-golf','mens-golf','golf'],'Rowing':['womens-rowing','rowing'],
  'Track & Field':['track-and-field','track-field'],'Baseball':['baseball'],
  'Softball':['softball'],'Lacrosse':['womens-lacrosse','mens-lacrosse','lacrosse'],
  'Field Hockey':['field-hockey'],'Hockey':['ice-hockey','hockey'],
  'Gymnastics':['gymnastics'],'Beach Volleyball':['beach-volleyball'],
  'Water Polo':['water-polo'],'Fencing':['fencing'],'Bowling':['bowling'],
  'Equestrian':['equestrian'],'Rifle':['rifle'],'Skiing':['skiing'],
  'Triathlon':['triathlon'],'Acrobatics & Tumbling':['acrobatics-tumbling','acrobatics-and-tumbling'],
  'STUNT':['stunt']
};

export function detectPublisher(html,url=''){
  const text=String(html||''),host=new URL(url||'https://example.test').hostname.toLowerCase();
  if(/wmt\.digital|wmt-digital|__next_data__|__nuxt__/i.test(text)||/(?:kuathletics|byucougars|gobearcats)\.com$/.test(host))return'WMT';
  if(/sidearm|s-game-card|sidearmsports/i.test(text))return'SIDEARM';
  if(/prestosports|prestosports\.com/i.test(text))return'PRESTO';
  return'CUSTOM';
}

export function absoluteUrl(href,base){
  try{const url=new URL(href,base);return /^https?:$/.test(url.protocol)?url.href:null}catch{return null}
}

export function discoverLinks(html,base){
  const schedules=new Set(),rosters=new Set(),all=[];
  const re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;let match;
  while((match=re.exec(String(html||'')))){
    const url=absoluteUrl(match[1],base);if(!url)continue;
    all.push(url);
    if(/\/schedule\/?(?:[?#]|$)/i.test(url))schedules.add(url);
    if(/\/roster\/?(?:[?#]|$)/i.test(url))rosters.add(url);
  }
  return{schedules:[...schedules],rosters:[...rosters],all:[...new Set(all)]};
}

export function inferSport(url){
  const value=String(url||'').toLowerCase();
  for(const [sport,slugs] of Object.entries(SPORT_SLUGS)){
    if(slugs.some(slug=>new RegExp(`/(?:sports/)?${slug}(?:/|$)`,'i').test(value)))return sport;
  }
  return null;
}

export function buildSources(discovered,sports=[]){
  const output={};
  for(const sport of sports)output[sport]={schedule_urls:[],roster_urls:[]};
  for(const [kind,field] of [['schedules','schedule_urls'],['rosters','roster_urls']]){
    for(const url of discovered[kind]||[]){
      const sport=inferSport(url);if(!sport)continue;
      output[sport]??={schedule_urls:[],roster_urls:[]};
      if(!output[sport][field].includes(url))output[sport][field].push(url);
    }
  }
  return output;
}

export function validateDraft(draft){
  const errors=[],warnings=[];
  if(!draft?.school?.id)errors.push('school.id is required');
  if(!draft?.school?.name)errors.push('school.name is required');
  if(!/^https:\/\//.test(draft?.school?.athletics_url||''))errors.push('school.athletics_url must use HTTPS');
  if(!['SIDEARM','WMT','PRESTO','CUSTOM'].includes(draft?.publisher))errors.push('publisher is invalid');
  if(!Array.isArray(draft?.sponsored_sports)||!draft.sponsored_sports.length)errors.push('at least one sponsored sport is required');
  for(const sport of draft?.sponsored_sports||[]){
    const source=draft.sources?.[sport];
    if(!source?.schedule_urls?.length)warnings.push(`${sport}: schedule URL needs review`);
    if(!source?.roster_urls?.length)warnings.push(`${sport}: roster URL needs review`);
  }
  return{valid:errors.length===0,errors,warnings};
}

function parseArgs(argv){
  const args={apply:false,certify:false,deep:false};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(token==='--apply'||token==='--certify'||token==='--deep')args[token.slice(2)]=true;
    else if(token.startsWith('--'))args[token.slice(2)]=argv[++i];
  }
  return args;
}
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit',shell:process.platform==='win32'});child.on('exit',code=>code===0?resolve():reject(new Error(`${command} exited ${code}`)));child.on('error',reject)})}
async function jsonFile(path){return JSON.parse(await readFile(new URL(`../${path}`,import.meta.url),'utf8'))}
async function fetchHtml(url){const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; SAS-Sports-Onboarding/1.0)','Accept':'text/html'}});if(!response.ok)throw new Error(`HTTP ${response.status} for ${url}`);return response.text()}

export async function onboardSchool(args){
  if(!args.school)throw new Error('Usage: npm run onboard-school -- --school SCHOOL_ID [--sports "Football,Soccer"] [--apply] [--certify]');
  const schools=await jsonFile('src/schools.json');
  const sponsored=await jsonFile('src/sponsored-sports.json');
  const school=schools.find(item=>item.id===args.school);
  if(!school)throw new Error(`Unknown school "${args.school}". Add its identity to src/schools.json first.`);
  const athleticsUrl=args.url||school.athletics_url;
  const home=await fetchHtml(athleticsUrl),homeLinks=discoverLinks(home,athleticsUrl);
  const sports=(args.sports?args.sports.split(',').map(x=>x.trim()).filter(Boolean):sponsored[school.id]||[...new Set([...homeLinks.schedules,...homeLinks.rosters].map(inferSport).filter(Boolean))]).sort();
  const sources=buildSources(homeLinks,sports);
  const draft={
    schema_version:1,status:'candidate',generated_at:new Date().toISOString(),
    school:{id:school.id,name:school.name,short_name:school.short_name,conference:school.conference,state:school.state,athletics_url:athleticsUrl},
    publisher:detectPublisher(home,athleticsUrl),sponsored_sports:sports,sources,
    certification:{release_tests:false,deep_live:false,isolation:false,mobile_switching:false,all_existing_schools:false},
    notes:['Review every discovered URL before applying. Empty schedules may be legitimate for unpublished seasons.']
  };
  const validation=validateDraft(draft);
  await mkdir(new URL('../onboarding/drafts/',import.meta.url),{recursive:true});
  const draftUrl=new URL(`../onboarding/drafts/${school.id}.json`,import.meta.url);
  await writeFile(draftUrl,JSON.stringify({...draft,validation},null,2)+'\n');
  console.log(`Created ${draftUrl.pathname}`);
  for(const warning of validation.warnings)console.warn(`Review: ${warning}`);
  if(!validation.valid)throw new Error(validation.errors.join('; '));
  if(args.apply){
    if(!sports.length)throw new Error('Refusing --apply without reviewed sponsored sports');
    sponsored[school.id]=sports;
    await writeFile(new URL('../src/sponsored-sports.json',import.meta.url),JSON.stringify(sponsored,null,2)+'\n');
    console.log(`Applied sponsored sports for ${school.id}. Source overrides remain review-only until certification.`);
  }
  if(args.certify){
    await run(process.execPath,['tests/onboarding.mjs']);
    await run('npm',['run','test:release']);
    if(args.apply){const liveArgs=['tests/validate-schools.mjs',`--schools=${school.id}`];if(args.deep)liveArgs.push('--deep');await run(process.execPath,liveArgs);}
    else console.log('Live certification skipped until the reviewed draft is applied.');
  }
  return{draft,validation};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  onboardSchool(parseArgs(process.argv.slice(2))).catch(error=>{console.error(error.message);process.exitCode=1});
}
