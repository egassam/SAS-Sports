// Middle and high school discovery: a county in, a draft data file and a
// coverage report out (user, November 4, 2026: "Do 1-3 now"; idea 1: "A
// discovery script: county → draft config in one command"). It does the
// look-ups each county session did by hand (Geary, November 3):
//   1. the county's FIPS code (Census county list);
//   2. its public middle and high schools (NCES Common Core of Data, through
//      the Urban Institute's Education Data API) and their towns;
//   3. KSHSAA's member directory for each town (public and private member
//      schools: class, league, KSHSAA id, website). Read at most once every
//      30 s (kshsaa.org robots.txt: Crawl-delay 30). Only school fields are
//      kept: never a person's name, phone or e-mail;
//   4. Bound's Kansas schools page (Bound id, page slug, town, mascot,
//      colors) and, for each school found there, which Bound sports have
//      events at its level in the last two school years;
//   5. the statewide MileSplit Live index (team id by name);
//   6. Prep.Golf's school list (school id by name);
//   7. MaxPreps through the app's private source route (SAS_SOURCE_KEY), at
//      most once every 30 s (MaxPreps refuses bursts): the school page from
//      its town and mascot, its MaxPreps id and team pages.
// Nothing is written to the app: the draft goes to --out (default: stdout)
// and the report to --report. Review both, then copy the draft to
// src/schools/data/<state>-<county>.json (docs/HIGH_SCHOOL_ONBOARDING.md).
//
//   NODE_USE_ENV_PROXY=1 node scripts/onboard-hs.mjs --county=Geary [--state=KS]
//     [--out=draft.json] [--report=report.md] [--no-maxpreps] [--no-kshsaa]
import {writeFileSync} from 'node:fs';
import {LETSGORUN_MEETPRO} from '../src/schools/manhattan-ks.mjs';
import {pathToFileURL} from 'node:url';
import {tennisHosts as tennisHostsOf,meetProResults,meetProDate,meetProName,prepGolfTournaments,prepGolfResults,maxprepsContests,nameKey,milesplitSeasonQuery,milesplitSeasonIndex,milesplitTeamsNamed,MILESPLIT_LIVE_ROOT,BOUND_API,BOUND_ACTS,boundEventsUrl} from '../src/high-school.mjs';

export const STATE_FIPS={KS:'20',MO:'29',NE:'31',OK:'40',CO:'08',IA:'19',TX:'48',AR:'05'};
const UA='Mozilla/5.0 (compatible; SAS-Sports onboarding)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// --- Names

// A school's name without its level words, for matching across sources:
// "Junction City Sr High", "Junction City HS" and "Junction City High
// School" are all "junction city".
export const schoolKey=name=>nameKey(String(name||'').replace(/\b(?:jr\.?\s*\/\s*sr\.?|junior\s*\/\s*senior|sr\.?|senior|jr\.?|junior)\s+high(?:\s+school)?\b/gi,' ').replace(/\b(?:high school|middle school|junior high|high|middle|elementary|school|hs|ms|jh|jhs|academy)\b/gi,' ').replace(/\s*-\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)?$/,''))
  .replace(/\b(?:high|middle|school|hs|ms|jh|sr|jr|academy)\b/g,' ').replace(/\s+/g,' ').trim();
// The level a name or a grade span says.
export function levelOf({name='',low=null,high=null,type=''}={}){
  if(/\bmiddle\b|\bjunior high\b|\bjr\.? high\b|\bJH\b|\bMS\b|\bintermediate\b/i.test(`${name} ${type}`)&&!/\bjr\.?\s*\/\s*sr\.?|junior\s*\/\s*senior/i.test(name))return'middle-school';
  if(/\bhigh\b|\bHS\b|\bsr\.? high\b/i.test(`${name} ${type}`))return'high-school';
  if(high!=null&&Number(high)>=10)return'high-school';
  if(high!=null&&Number(high)>=7)return'middle-school';
  return null;
}
export const slug=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/['’.]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
// The app's id for a school: its name without level words, "-ms" for a
// middle school, then the state ("junction-city-ks", "fort-riley-ms-ks").
export const appId=(name,level,state)=>`${slug(schoolKey(name).replace(/\bsaint\b/g,'st'))}${level==='middle-school'?'-ms':''}-${state.toLowerCase()}`;

// --- Sources (pure readers, tested with fixtures in tests/onboard-hs.mjs)

// Census county list: "KS|20|061|00484999|Geary County|H1|A".
export function countyFips(text,county){
  const want=county.toLowerCase().replace(/\s+county$/,'').trim();
  for(const line of String(text||'').split(/\r?\n/).slice(1)){
    const [st,sf,cf,,name]=line.split('|');
    if(name&&name.toLowerCase().replace(/\s+county$/,'').trim()===want)return{state:st,fips:`${sf}${cf}`,name};
  }
  return null;
}
// NCES CCD (Education Data API): the county's open, non-virtual middle and
// high schools (school_level 2 middle, 3 high, 4 other spans that reach
// grade 7), and every town with a school (elementary too).
export function ccdCounty(results,fips){
  const all=(results||[]).filter(s=>String(s.county_code)===String(fips)&&s.school_status!==2&&s.school_status!==6);
  const towns=[...new Set(all.map(s=>String(s.city_location||'').trim()).filter(Boolean))].sort();
  const schools=all.filter(s=>[2,3,4].includes(Number(s.school_level))&&Number(s.highest_grade_offered)>=7&&!(s.virtual===1||/virtual|online|alternative|academy online/i.test(s.school_name)))
    .map(s=>({name:s.school_name,town:String(s.city_location||'').trim(),address:s.street_location||null,grades:`${s.lowest_grade_offered}-${s.highest_grade_offered}`,level:levelOf({name:s.school_name,high:s.highest_grade_offered}),nces:String(s.ncessch),enrollment:s.enrollment??null}));
  return{towns,schools};
}
// KSHSAA's directory search: school fields only.
export function kshsaaSchools(list){
  return(Array.isArray(list)?list:[]).map(s=>({name:String(s.SchoolName||'').trim(),kshsaa:s.Identifier||null,kshsaaId:s.Id??null,town:String(s.PhysicalCity||s.MailingCity||'').trim(),address:s.PhysicalAddress||null,
    class:s.Class||null,league:String(s.LeagueName||'').trim()||null,type:s.SchoolType||null,grades:s.SchoolSubType||null,private:/private|parochial|catholic|christian/i.test(`${s.Private||''} ${s.SchoolName||''}`)||null,website:s.WebSite||null,enrollment:s.Enrollment??null}));
}
// Bound's state schools page: the Nuxt page data holds every school (id,
// name, slug, town, mascot, colors). Each value is an index into the page
// data's list.
export function boundStateSchools(html){
  const m=String(html||'').match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)return[];
  let data;try{data=JSON.parse(m[1])}catch{return[]}
  const at=i=>typeof i==='number'?data[i]:i;
  const out=[],seen=new Set();
  for(const x of data){
    if(!x||typeof x!=='object'||Array.isArray(x)||!('IDSchool' in x)||!('Slug' in x))continue;
    const id=at(x.IDSchool);if(typeof id!=='string'||seen.has(id))continue;seen.add(id);
    out.push({bound:id,name:String(at(x.Name)||''),slug:typeof at(x.Slug)==='string'?at(x.Slug):null,town:String(at(x.City)||''),address:at(x.Address)||null,mascot:typeof at(x.Mascot)==='string'?at(x.Mascot):null,
      colors:[at(x.PrimaryColor),at(x.SecondaryColor),at(x.TertiaryColor)].filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c))});
  }
  return out;
}
// Prep.Golf's school list: id and name.
export function prepGolfSchools(html){
  return[...String(html||'').matchAll(/href="https:\/\/[a-z]{2}\.prep\.golf\/schools\/(\d+)"[^>]*>\s*([^<]+?)\s*<\/a>/g)].map(m=>({id:Number(m[1]),name:m[2].replace(/&amp;/g,'&').replace(/&#039;/g,"'").trim()}));
}
// A MaxPreps school page: its id (in the mascot image path) and its team pages.
export function maxprepsSchoolPage(html,path){
  // The school's id is its mascot image's name; a page with no mascot (e.g.
  // Wakefield, November 5) names it as the page data's most frequent
  // "schoolId".
  const counts=new Map();for(const m of String(html||'').matchAll(/"schoolId":"([0-9a-f-]{36})"/gi))counts.set(m[1],(counts.get(m[1])||0)+1);
  const id=(String(html||'').match(/school-mascot\/[0-9a-f]\/[0-9a-f]\/[0-9a-f]\/([0-9a-f-]{36})\./)||[])[1]||[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const base=`/${path.replace(/^\/|\/$/g,'')}/`,teams=new Set();
  for(const m of String(html||'').matchAll(new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([a-z-]+(?:/(?:girls|boys))?(?:/(?:fall|winter|spring))?)/(?:schedule/)?["?]`,'g')))if(!/^(?:news|photos|videos|rankings|staff|roster|stats|schedule|standings|events|teams)$/.test(m[1]))teams.add(m[1]);
  return{id,teams:[...teams].sort()};
}
// MaxPreps paths to try for a school: its town and name with the mascot
// ("junction-city/junction-city-bluejays", "-blue-jays").
export function maxprepsGuesses(state,{name,town,mascot}){
  const base=schoolKey(name).replace(/\bsaint\b/g,'st'),t=slug(town);
  const forms=[...new Set([slug(mascot),slug(mascot).replace(/-/g,'')])].filter(Boolean);
  return[...new Set(forms.map(f=>`${state.toLowerCase()}/${t}/${slug(base)}-${f}`))];
}

// Bound act names → the sports list a data entry's `sports.has` takes.
const ACT_HAS={Football:['Football'],'Girls Flag Football':['Flag Football'],Volleyball:['Volleyball'],'Boys Soccer':['Soccer'],'Girls Soccer':['Soccer','Girls Soccer'],
  'Boys Basketball':['Basketball'],'Girls Basketball':['Basketball'],Baseball:['Baseball'],Softball:['Softball'],'Boys Cross Country':['Cross Country'],'Girls Cross Country':['Cross Country'],
  'Boys Golf':['Golf','Boys Golf'],'Girls Golf':['Golf','Girls Golf'],'Boys Tennis':['Tennis','Boys Tennis'],'Girls Tennis':['Tennis','Girls Tennis'],
  'Boys Wrestling':['Wrestling','Boys Wrestling'],'Girls Wrestling':['Wrestling','Girls Wrestling'],'Boys Track & Field':['Track & Field'],'Girls Track & Field':['Track & Field'],
  'Boys Swim & Dive':['Swimming & Diving','Boys Swimming'],'Girls Swim & Dive':['Swimming & Diving','Girls Swimming'],'Boys Bowling':['Bowling','Boys Bowling'],'Girls Bowling':['Bowling','Girls Bowling'],'Unified Bowling':['Bowling']};
const HAS_ORDER=['Football','Flag Football','Volleyball','Soccer','Girls Soccer','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Tennis','Girls Tennis','Boys Tennis','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Swimming & Diving','Girls Swimming','Boys Swimming','Bowling','Girls Bowling','Boys Bowling'];
// Middle schools read football, volleyball, basketball, cross country,
// wrestling, track, golf and tennis (src/high-school-builders.mjs).
const MS_HAS=new Set(['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Golf','Tennis']);
export const VARSITY_LEVEL=/^varsity$/i,MS_LEVEL=/^(?:(?:6th|7th|8th)(?: Grade)?|Middle School|MS|Junior High|JH)(?:\s*(?:A|-\s*A.*)(?:[- ]Team)?)?$/i;
// The sports a school has on Bound: acts with events at its level this
// school year, or on two days or more last school year (spring sports are
// not on Bound yet in the fall). One stray entry last year is not a sport:
// Junction City's only "Girls Flag Football" entry, May 14, 2026, is a
// "Varsity League Meet" with Topeka Highland Park and Washburn Rural. A
// number is this year's count (last year none).
export function boundSportsHas(countsByAct,level){
  const has=new Set();
  for(const [act,n] of Object.entries(countsByAct)){
    const {current=0,last=0}=typeof n==='number'?{current:n}:n;
    if(current>0||last>=2)for(const h of ACT_HAS[act]||[])has.add(h);
  }
  return HAS_ORDER.filter(h=>has.has(h)&&(level!=='middle-school'||MS_HAS.has(h)));
}

// A street address as a key: its number and first street word ("1100 Blue
// Jay Way" and "1100 Blue Jay Wy" are "1100 blue"; "200 N Washington St" is
// "200 washington").
export function addressKey(address){
  const words=String(address||'').toLowerCase().replace(/[.,#]/g,' ').split(/\s+/).filter(Boolean);
  if(!/^\d+$/.test(words[0]||''))return null;
  const street=words.slice(1).find(w=>!/^(?:n|s|e|w|ne|nw|se|sw|north|south|east|west)$/.test(w));
  return street?`${words[0]} ${street}`:null;
}
// The schools of a county, matched across sources (by name key, town and
// level; a Bound school by its street address when its name differs:
// "St. Francis Xavier Catholic" is KSHSAA's "St. Xavier HS").
export function matchSchools({ccd,kshsaa,bound,state}){
  const rows=[];
  const add=(src,level)=>{
    const key=schoolKey(src.name);
    let row=rows.find(r=>r.key===key&&r.level===level)||rows.find(r=>r.key===key&&!r.level);
    if(!row){row={key,level,name:src.name,town:src.town,sources:{}};rows.push(row);}
    if(!row.level)row.level=level;
    return row;
  };
  for(const s of ccd)add(s,s.level).ccd=s;
  for(const s of kshsaa){const level=levelOf({name:s.name,type:s.type})||'high-school';const row=add(s,level);row.kshsaa=s;if(/HS$|High School/.test(s.name))row.name=row.name||s.name;}
  for(const row of rows){
    const near=bound.filter(b=>schoolKey(b.name)===row.key&&(levelOf({name:b.name})||'high-school')===row.level);
    row.bound=near.find(b=>slug(b.town)===slug(row.town))||near[0]||null;
    if(!row.bound){
      const keys=[row.kshsaa?.address,row.ccd?.address].map(addressKey).filter(Boolean);
      const at=bound.filter(b=>slug(b.town)===slug(row.town)&&keys.includes(addressKey(b.address)));
      row.bound=at.find(b=>(levelOf({name:b.name})||row.level)===row.level)||at[0]||null;
    }
  }
  for(const row of rows)row.id=appId(row.kshsaa?.name||row.ccd?.name||row.name,row.level,state);
  return rows.sort((a,b)=>(a.level||'').localeCompare(b.level||'')||a.id.localeCompare(b.id));
}

// A school's MileSplit team: the first of its names (KSHSAA's, Bound's,
// NCES's) that names a team at its level (Bound's "St. Francis Xavier
// Catholic" names none; KSHSAA's "St. Xavier HS" names 26138).
export function milesplitFor(index,row){
  for(const name of [...new Set([row.kshsaa?.name,row.bound?.name,row.ccd?.name,row.name].filter(Boolean))]){
    const named=milesplitTeamsNamed(index,name).filter(t=>(levelOf({name:t.name})||'high-school')===row.level);
    if(named.length)return named.find(t=>slug(t.name).includes(slug(row.town)))||named[0];
  }
  return null;
}
// Prep.Golf golfers' code: the school code every one of the school's posted
// varsity tournaments has (November 5: ABI, CHAP, HER, ...). `results` are
// the parsed results pages. More than one left: the one whose letters start
// the school's name, else none.
export function prepGolfCode(results,name=''){
  const sets=results.map(r=>new Set((r.players||[]).map(p=>p.school).filter(Boolean))).filter(x=>x.size);
  if(!sets.length)return null;
  let common=[...sets[0]].filter(c=>sets.every(x=>x.has(c)));
  if(common.length>1){
    const words=nameKey(name).split(' ').filter(Boolean),joined=words.join(''),initials=words.map(w=>w[0]).join('');
    common=common.filter(c=>{const k=c.toLowerCase();return initials===k||initials.startsWith(k)||joined.startsWith(k.slice(0,3));});
  }
  return common.length===1?common[0]:null;
}
// TennisReporting's name for a school, from every school its state's events
// list ("Clay Center Community HS").
export function tennisReportingName(names,row){
  // "Salina-Central HS" is Salina Central; "Topeka-Highland Park HS" is
  // Highland Park in Topeka (the town before the hyphen).
  const key=row.key,forms=n=>[schoolKey(n.replace(/-/g,' ')),schoolKey(n.replace(/^[A-Z][a-z]+(?: [A-Z][a-z]+)?-(?=[A-Z])/,''))];
  const list=[...new Set(names)];
  return list.find(n=>forms(n)[0]===key)||list.find(n=>forms(n)[1]===key)||null;
}
// Bound coverage for a game sport: the school's own Bound games this school
// year against MaxPreps' schedule for the team. Fewer than 60%: its games
// also read MaxPreps' schedule (`sports.maxprepsSchedule`; November 5:
// Wabaunsee had 1 of 10 football games on Bound).
export function boundCoverage(boundGames,maxprepsGames){
  if(!(maxprepsGames>=4))return{checked:false};
  const ratio=boundGames/maxprepsGames;
  return{checked:true,bound:boundGames,maxpreps:maxprepsGames,sparse:ratio<0.6};
}
// LetsGoRun (MeetPro) folders to try for this season: the listing's own
// folders for the year, and last years' names with this year's
// (2025_NCKL_Cross_Country_Championships -> 2026_...). November 5: the
// listing showed one 2026 cross country meet; six more were found this way.
export function letsGoRunGuesses(listing,year){
  const links=[...String(listing||'').matchAll(/LetsGoRun_Timing\/([^/"'\s]+)\/?/g)].map(m=>m[1]);
  const out=new Set(links.filter(f=>f.startsWith(`${year}_`)));
  for(const f of links){const m=f.match(/^(\d{4})_(.+)$/);if(m&&Number(m[1])<year)out.add(`${year}_${m[2]}`);}
  return[...out].sort();
}
// The schools of a draft that ran a LetsGoRun meet: a team name in the page
// that is the school's meet team.
export function letsGoRunSchools(html,entries){
  return entries.filter(e=>[].concat(e.sports?.meetTeam||[]).some(team=>meetProResults(html,team).some(r=>r.runners.length))).map(e=>e.id);
}

// The draft data entry for one matched school.
export function draftEntry(row){
  const name=row.ccd?.name||row.kshsaa?.name||row.name;
  const entry={id:row.id,name:row.displayName||name,level:row.level};
  if(row.bound)entry.bound=row.bound.slug?{school:row.bound.bound,slug:row.bound.slug}:{school:row.bound.bound};
  if(row.maxpreps?.id)entry.maxpreps={schoolId:row.maxpreps.id,path:row.maxpreps.path.replace(/^[a-z]{2}\//,'')};
  entry.meetPro='letsgorun';
  if(row.prepGolf&&(row.has||[]).includes('Golf'))entry.prepGolf={school:row.prepGolf.id,code:row.prepGolfCode||'?'};
  const meetTeam=(row.bound?.name||name).replace(/\s+(?:HS|High School|Sr\.? High)$/i,'').trim();
  entry.sports={has:row.has||[],meetTeam,...((row.has||[]).includes('Tennis')&&row.tennis&&row.level==='high-school'?{tennis:row.tennis}:{}),...(row.milesplit?{milesplit:Number(row.milesplit.id)}:{}),...(row.coverage?.sparse&&row.maxpreps?{maxprepsSchedule:true}:{})};
  return entry;
}

// --- Network

async function get(url,{json=false,headers={},method='GET',body=null}={}){
  const r=await fetch(url,{method,headers:{'User-Agent':UA,...headers,...(body?{'content-type':'application/json'}:{})},body,signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);
  return json?r.json():r.text();
}
async function viaSource(url){
  const key=process.env.SAS_SOURCE_KEY;if(!key)return null;
  const base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
  const r=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
  return{status:r.status,text:r.ok?await r.text():''};
}

async function main(){
  const args=process.argv.slice(2),value=n=>{const hit=args.find(x=>x.startsWith(`--${n}=`));return hit?hit.slice(n.length+3):null};
  const state=(value('state')||'KS').toUpperCase(),county=value('county');
  if(!county||!STATE_FIPS[state]){console.error('usage: NODE_USE_ENV_PROXY=1 node scripts/onboard-hs.mjs --county=<name> [--state=KS] [--out=draft.json] [--report=report.md] [--no-maxpreps] [--no-kshsaa]');process.exit(2)}
  const log=(...x)=>console.error(...x),notes=[];
  const fipsText=await get(`https://www2.census.gov/geo/docs/reference/codes2020/cou/st${STATE_FIPS[state]}_${state.toLowerCase()}_cou2020.txt`);
  const c=countyFips(fipsText,county);if(!c){console.error(`no county ${county} in ${state}`);process.exit(2)}
  log(`${c.name} (${c.fips})`);
  // NCES CCD: the latest year the API has.
  let ccd=null;
  for(const year of [2023,2022,2021]){try{const j=await get(`https://educationdata.urban.org/api/v1/schools/ccd/directory/${year}/?fips=${Number(STATE_FIPS[state])}`,{json:true});if(j?.results?.length){ccd={year,...ccdCounty(j.results,c.fips)};break;}}catch(e){log(`CCD ${year}: ${e.message}`)}}
  if(!ccd){console.error('NCES CCD did not answer');process.exit(1)}
  log(`NCES CCD ${ccd.year}: ${ccd.schools.length} middle/high schools; towns ${ccd.towns.join(', ')}`);
  // KSHSAA directory by town (Kansas only), 30 s apart.
  const kshsaa=[];
  if(state==='KS'&&!args.includes('--no-kshsaa'))for(const [i,town] of ccd.towns.entries()){
    if(i)await sleep(30000);
    try{kshsaa.push(...kshsaaSchools(await get(`https://kshsaa-api.kshsaa.org/directory/search/city/${encodeURIComponent(town)}`,{json:true})));log(`KSHSAA ${town}: ok`);}catch(e){log(`KSHSAA ${town}: ${e.message}`);notes.push(`KSHSAA directory for ${town}: ${e.message}`)}
  }
  // Bound's state page.
  const bound=boundStateSchools(await get(`https://beta.gobound.com/${state.toLowerCase()}/schools`));
  log(`Bound: ${bound.length} ${state} schools`);
  const rows=matchSchools({ccd:ccd.schools,kshsaa:[...new Map(kshsaa.map(s=>[s.kshsaa||s.name,s])).values()].filter(s=>ccd.towns.some(t=>slug(t)===slug(s.town))),bound,state});
  // Bound sports by level, two school years.
  const now=new Date(),y=now.getUTCMonth()>=6?now.getUTCFullYear():now.getUTCFullYear()-1;
  for(const row of rows.filter(r=>r.bound)){
    const counts={};
    for(const [act,ids] of Object.entries(BOUND_ACTS)){
      const current=new Set(),last=new Set();
      // Bound answers some schools' events with every sport whatever `idAct`
      // asks (Herington and Solomon, November 5: volleyball under swimming),
      // so each event's own act is checked, as `boundSchedule` does.
      for(const id of ids){
        try{const p=JSON.parse(await get(boundEventsUrl(row.bound.bound,{start:`${y-1}-07-01`,end:`${y+1}-06-30`,act:id}),{headers:{Accept:'application/json'}}));
          for(const g of Array.isArray(p)?p:[])for(const e of g?.Events||[])if(e?.RecordType==='comp'&&(e.IDAct===id||(e.IDActs||[]).includes(id))&&(e.Teams||[]).some(t=>t.HostSchoolID===row.bound.bound)&&(row.level==='middle-school'?MS_LEVEL:VARSITY_LEVEL).test(String(e.LevelDisplay||'').trim())){
            const day=String(e.StartDateTime||'').slice(0,10);(day>=`${y}-07-01`?current:last).add(day);}}catch{}
      }
      counts[act]={current:current.size,last:last.size};
    }
    row.boundCounts=counts;row.has=boundSportsHas(counts,row.level);
    log(`Bound ${row.id}: ${row.has.join(', ')||'no events at its level'}`);
  }
  // MileSplit Live index (this fall's cross country).
  const index=milesplitSeasonIndex(JSON.parse(await get(`${MILESPLIT_LIVE_ROOT}:runQuery`,{method:'POST',body:milesplitSeasonQuery(state,y)})));
  for(const row of rows){
    row.milesplit=milesplitFor(index,row);
  }
  // Prep.Golf (high schools).
  if(state==='KS'){
    const pg=prepGolfSchools(await get('https://ks.prep.golf/schools'));
    // Prep.Golf may use the shorter name Bound gives ("Clay Center" for Clay
    // Center Community High, November 5).
    for(const row of rows.filter(r=>r.level==='high-school'))row.prepGolf=pg.find(p=>schoolKey(p.name)===row.key)||(row.bound?.name&&pg.find(p=>schoolKey(p.name)===schoolKey(row.bound.name)))||null;
  }
  // MaxPreps (high schools), 30 s apart, through the private source route.
  if(!args.includes('--no-maxpreps')){
    if(!process.env.SAS_SOURCE_KEY)notes.push('MaxPreps not checked: SAS_SOURCE_KEY is not set.');
    else{let first=true;for(const row of rows.filter(r=>r.level==='high-school')){
      const names=[...new Set([row.kshsaa?.name,row.bound?.name,row.ccd?.name].filter(Boolean))];
      for(const path of [...new Set(names.flatMap(name=>maxprepsGuesses(state,{name,town:row.town,mascot:row.bound?.mascot})))]){
        if(!first)await sleep(30000);first=false;
        const r=await viaSource(`https://www.maxpreps.com/${path}/`);
        log(`MaxPreps ${path}: ${r?.status}`);
        if(r?.status===200){const page=maxprepsSchoolPage(r.text,path);if(page.id){row.maxpreps={path,...page};break;}}
      }
    }}
  }
  // Prep.Golf golfers' codes (high schools with golf), 1.5 s apart.
  for(const row of rows.filter(r=>r.prepGolf&&(r.has||[]).includes('Golf'))){
    try{
      const list=prepGolfTournaments(await get(`https://ks.prep.golf/schools/${row.prepGolf.id}`)).filter(t=>/^varsity$/i.test(t.type)).slice(0,4),results=[];
      for(const t of list){await sleep(1500);results.push(prepGolfResults(await get(`https://ks.prep.golf/tournaments/results/${t.id}`)));}
      row.prepGolfCode=prepGolfCode(results,row.bound?.name||row.name);log(`Prep.Golf ${row.id}: ${row.prepGolfCode||'no code found'} (${results.length} tournaments)`);
    }catch(e){log(`Prep.Golf ${row.id}: ${e.message}`)}
  }
  // TennisReporting school names (Kansas events), when a school has tennis.
  if(state==='KS'&&rows.some(r=>(r.has||[]).includes('Tennis'))){
    const T='https://api.tennisreporting.com/',H={'content-type':'application/json',accept:'application/json'},names=[];
    try{
      const events=JSON.parse(await get(`${T}events`,{method:'POST',headers:H,body:JSON.stringify({page:0,pageSize:200,sorted:[],filtered:{stateId:23}})}));
      for(const e of events.data||events.rows||events||[]){
        const ev=JSON.parse(await get(`${T}event/${e.id}`,{headers:H}).catch(()=>'null'));await sleep(250);
        for(const h of tennisHostsOf(ev)){const list=JSON.parse(await get(`${T}event/${e.id}/host/${h.id}/schools`,{headers:H}).catch(()=>'[]'));names.push(...(list||[]).map(x=>String(x.name).trim()));await sleep(250);}
      }
    }catch(e){notes.push(`TennisReporting: ${e.message}`)}
    for(const row of rows.filter(r=>(r.has||[]).includes('Tennis')))row.tennis=tennisReportingName(names,row);
    log(`TennisReporting: ${new Set(names).size} Kansas school names`);
  }
  // Bound coverage against MaxPreps (high schools with football or
  // volleyball), through the source route, 30 s apart.
  if(process.env.SAS_SOURCE_KEY&&!args.includes('--no-maxpreps'))for(const row of rows.filter(r=>r.maxpreps?.id&&r.bound)){
    const sport=(row.has||[]).includes('Football')?['Football','football']:(row.has||[]).includes('Volleyball')?['Volleyball','volleyball']:null;if(!sport)continue;
    await sleep(30000);
    const r=await viaSource(`https://www.maxpreps.com/${row.maxpreps.path}/${sport[1]}/schedule/`);
    if(r?.status!==200){notes.push(`MaxPreps ${sport[0]} schedule for ${row.id}: ${r?.status}`);continue;}
    const games=new Set(maxprepsContests(r.text,row.maxpreps.id).filter(c=>c.opponent&&c.date>=`${y}-07-01`&&c.date<=`${y+1}-06-30`).map(c=>c.date)).size;
    row.coverage={sport:sport[0],...boundCoverage(row.boundCounts?.[sport[0]]?.current||0,games)};
    log(`Coverage ${row.id} ${sport[0]}: Bound ${row.coverage.bound} of MaxPreps ${row.coverage.maxpreps}${row.coverage.sparse?' (sparse: maxprepsSchedule)':''}`);
  }
  // LetsGoRun (MeetPro): this season's folders and the county's schools in them.
  const lgr=[];
  if(state==='KS'){
    try{
      const known=new Set(Object.values(LETSGORUN_MEETPRO.folders||{}).flat());
      // Fall meets are filed under the school year's first year, spring
      // meets under the second.
      const listing=await get(LETSGORUN_MEETPRO.listing);
      const entries=rows.filter(r=>r.bound).map(draftEntry);
      for(const folder of [...new Set([...letsGoRunGuesses(listing,y),...letsGoRunGuesses(listing,y+1)])]){
        await sleep(1000);
        let html='';try{html=await get(`${LETSGORUN_MEETPRO.base}${folder}/`)}catch{continue}
        const date=meetProDate(html);if(!date||date<`${y}-07-01`||date>`${y+1}-06-30`)continue;
        const schools=letsGoRunSchools(html,entries);
        lgr.push({folder,date,name:meetProName(html),schools,known:known.has(folder)});
      }
      log(`LetsGoRun: ${lgr.length} folders this season, ${lgr.filter(m=>m.schools.length).length} with the county's schools`);
    }catch(e){notes.push(`LetsGoRun: ${e.message}`)}
  }
  // The draft and the report.
  const draft={state:state.toLowerCase(),counties:[c.name.replace(/\s+County$/,'')],module_doc:`docs/${slug(c.name.replace(/\s+County$/,'')).toUpperCase().replace(/-/g,'_')}_${state}_MODULE.md`,
    note:`Draft from scripts/onboard-hs.mjs on ${now.toISOString().slice(0,10)}: review every entry before use (docs/HIGH_SCHOOL_ONBOARDING.md).`,
    schools:rows.filter(r=>r.bound).map(draftEntry)};
  const yes=x=>x?'yes':'—';
  const report=[`# ${c.name}, ${state}: onboarding survey (${now.toISOString().slice(0,10)})`,'',
    `NCES CCD ${ccd.year}: ${ccd.schools.length} middle and high schools; towns with any school: ${ccd.towns.join(', ')}.`,'',
    '| id | School | Level | Town | KSHSAA (class, league) | Bound | Bound sports | MaxPreps | MileSplit | Prep.Golf |','| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(r=>`| \`${r.id}\` | ${r.ccd?.name||r.kshsaa?.name||r.name} | ${r.level||'?'} | ${r.town} | ${r.kshsaa?`${r.kshsaa.class||'?'}, ${r.kshsaa.league||'no league'}`:'—'} | ${r.bound?`${r.bound.slug||'(no page)'} \`${r.bound.bound}\``:'—'} | ${(r.has||[]).join(', ')||'—'} | ${r.maxpreps?`${r.maxpreps.path} (${r.maxpreps.teams.length} teams)`:'—'} | ${r.milesplit?`${r.milesplit.id} ${r.milesplit.code} (${r.milesplit.meets} meets)`:'—'} | ${r.prepGolf?r.prepGolf.id:'—'} |`),
    ...(rows.some(r=>r.coverage?.checked)?['','## Bound coverage (against MaxPreps)','','| School | Sport | Bound games | MaxPreps games | Reads MaxPreps\' schedule |','| --- | --- | --- | --- | --- |',
      ...rows.filter(r=>r.coverage?.checked).map(r=>`| \`${r.id}\` | ${r.coverage.sport} | ${r.coverage.bound} | ${r.coverage.maxpreps} | ${r.coverage.sparse?'yes':'no'} |`)]:[]),
    ...(lgr.length?['','## LetsGoRun (MeetPro) this season','','Add a folder to `LETSGORUN_MEETPRO.folders` (src/schools/manhattan-ks.mjs) by its date; when schools already in the app ran it, compare first (`npm run diff:feeds`).','','| Date | Folder | Title | County schools | Read already |','| --- | --- | --- | --- | --- |',
      ...lgr.sort((a,b)=>a.date.localeCompare(b.date)).map(m=>`| ${m.date} | \`${m.folder}\` | ${m.name||''} | ${m.schools.join(', ')||'—'} | ${m.known?'yes':'no'} |`)]:[]),
    '','## Still to check by hand','',
    '- Each school\'s own calendar (district site: ParentSquare, Apptegy, Finalsite, Google Calendar) for games Bound lacks; a school with no Bound events stays out of the draft.',
    '- Private and non-member schools (not in NCES CCD or KSHSAA: Kansas Approved Schools, homeschool programs) and schools listed by KSHSAA under another town.',
    '- TennisReporting names and Prep.Golf codes the survey could not find (`"code":"?"`, no `tennis`); LetsGoRun (MeetPro) team names (the draft uses Bound\'s name); a LetsGoRun meet\'s date when its page prints another (the 2026 Abilene page printed a Manhattan header and 9/5 for a September 3 meet).',
    '- MaxPreps team pages a school\'s draft names, and spring sports not yet on Bound.',
    ...(notes.length?['','## Notes','',...notes.map(n=>`- ${n}`)]:[])].join('\n');
  const out=value('out'),rep=value('report');
  if(out)writeFileSync(out,JSON.stringify(draft,null,1)+'\n');else console.log(JSON.stringify(draft,null,1));
  if(rep)writeFileSync(rep,report+'\n');else console.error('\n'+report);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
