// Reads every roster card and athlete profile page of the named sports and
// lists the athlete Instagram links they publish: the evidence a sport needs
// before it joins `athlete_profile_fallback_sports` (AGENTS.md 5a). Handles
// that appear on every page (the site's own accounts in its menus) are left
// out. Pages come through the private source route (SAS_SOURCE_KEY), as the
// app fetches them. Georgia's 370 pages took about two minutes.
//
//   SAS_SOURCE_KEY=... NODE_USE_ENV_PROXY=1 node scripts/athlete-evidence.mjs --school=georgia Football "Track & Field"
//   (--check=Volleyball first: a sport that publishes links must show them;
//   --pins prints verifiedInstagrams lines for sports with 12 links or fewer)
const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school'),sports=[value('check'),...args.filter(a=>!a.startsWith('--'))].filter(Boolean);
const key=process.env.SAS_SOURCE_KEY,base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
if(!id||!sports.length||!key){console.error('usage: SAS_SOURCE_KEY=... node scripts/athlete-evidence.mjs --school=<id> [--check=<Sport>] <Sport> ...');process.exit(2)}
const camel=id.replace(/-(\w)/g,(all,c)=>c.toUpperCase());
const school=(await import(`../src/schools/${id}.mjs`))[`${camel}School`];
const get=async url=>{
  for(let attempt=1;attempt<=3;attempt++){
    try{const r=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});if(r.ok)return r.text();if(r.status===404)return'';}catch{}
    await new Promise(done=>setTimeout(done,2000*attempt));
  }
  return'';
};
// A handle ends the link ("instagram.com/Alex Gatto._" is broken, not "alex");
// a link written inside another is the inner one (Michigan's profiles).
const handles=raw=>new Set([...String(raw).matchAll(/instagram\.com\/(?:https?:\/\/(?:www\.)?instagram\.com\/)?@?([A-Za-z0-9._]+)(?=["'\/?#\\]|$)/gi)].map(x=>x[1].toLowerCase()).filter(h=>!['p','reel','explore','accounts','https:','http:'].includes(h)));
// The site's own accounts: on two different rosters' pages.
const rosters=Object.values(school.rosterUrls).flat();
const [a,b]=await Promise.all([get(rosters[0]),get(rosters.at(-1))]);
const site=new Set([...handles(a)].filter(h=>handles(b).has(h)));
for(const sport of sports){
  const found=[];let read=0;
  for(const url of [].concat(school.rosterUrls[`${id}|${sport}`]||[])){
    const raw=await get(url),host=new URL(url).hostname,slug=new URL(url).pathname.split('/')[2];
    // SIDEARM: /sports/<slug>/roster/<name>/<id>; WMT: /sports/<slug>/roster/[season/<s>/]player/<name>.
    const links=[...new Set(raw.match(new RegExp(`/sports/${slug}/roster/(?:(?:season/[^/"']+/)?player/[a-z0-9-]+|[a-z0-9-]+/\\d+)`,'g'))||[])];
    // Arkansas (WordPress): /roster/<name>/ on the site's host.
    if(!links.length)links.push(...new Set([...String(raw).matchAll(new RegExp(`https://${host.replace(/\./g,'\\.')}(/roster/[a-z0-9-]+/)`,'g'))].map(m=>m[1])));
    for(let i=0;i<links.length;i+=8)await Promise.all(links.slice(i,i+8).map(async path=>{
      const page=await get(`https://${host}${path}`),own=[...handles(page)].filter(h=>!site.has(h));read++;
      // The athlete's name: the page title's first part ("Blake Grimmer -
      // Baseball - University of Tennessee Athletics").
      const name=((String(page).match(/<title>([^<]*)/i)||[])[1]||'').replace(/&#8211;/g,'–').split(/\s+[-|–]\s+/)[0].replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
      if(own.length)found.push({path,name,own,label:`${path.split('/').pop()}${name?` (${name})`:''}`});
    }));
  }
  // A team's own account is on every athlete's page (Michigan State's menu
  // links msu_baseball on each baseball profile): a handle on three or more
  // athletes' pages is no athlete's.
  const pages=[...new Map(found.map(f=>[f.path,f])).values()],shared=new Map();
  for(const f of pages)for(const h of f.own)shared.set(h,(shared.get(h)||0)+1);
  const unique=pages.map(f=>{const own=f.own.filter(h=>shared.get(h)<3);return own.length?{...f,handle:own[0],text:`${f.label}: ${own.join(',')}`}:null;}).filter(Boolean);
  console.log(`${sport}: ${read} profile pages read; athlete Instagram on ${unique.length}${unique.length?`: ${unique.map(f=>f.text).join(' | ')}`:''}`);
  // --pins: ready verifiedInstagrams lines for a sport with few links (the
  // app reads roster cards, then up to 24 profile pages; Ole Miss pinned
  // Baseball's 3 of 42).
  if(args.includes('--pins')&&unique.length&&unique.length<=12)for(const f of unique.slice(0,3).filter(f=>f.name))console.log(`    '${id}|${sport}|${f.name.replace(/'/g,"\\'")}':'https://www.instagram.com/${f.handle}/',`);
}
