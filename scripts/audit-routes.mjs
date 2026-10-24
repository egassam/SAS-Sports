// Reads a converted SIDEARM school's routes against its site's menu, the
// check every conference session since the WCC made by hand ("set every
// route from the site's menu"; Oct 24: Northwestern State's plain cross
// country page was the men's, SFA's men's golf page 2024-25 and off the
// menu). For each school it prints:
//   - the menu's team slugs, and those no route reads (a missing sport or
//     team);
//   - each route with its page title and the season the title names,
//     flagged when the page is off the menu, names an old season or is not a
//     schedule (the survey shows each page's events).
// Pages come through the private source route, as production reads them.
//
//   SAS_SOURCE_KEY=... SAS_SPORTS_BASE_URL=<branch preview> NODE_USE_ENV_PROXY=1 \
//     node scripts/audit-routes.mjs <id> ...
import {readFileSync} from 'node:fs';

const ids=process.argv.slice(2).filter(a=>!a.startsWith('--')),key=process.env.SAS_SOURCE_KEY;
const base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
if(!ids.length||!key){console.error('usage: SAS_SOURCE_KEY=... node scripts/audit-routes.mjs <id> ...');process.exit(2)}
const page=async url=>{
  try{const response=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});return{status:response.status,html:response.ok?await response.text():''}}
  catch(error){return{status:0,html:'',error:error.message}}
};
// Slugs every SIDEARM menu links that are no team.
const NOT_TEAMS=/^(?:general|all-sports|team-makers|academic-support|spirit(?:-squad)?|cheer\w*|dance|esports|club-\w+|intramurals?|recreation)$/;
const currentYear=new Date().getUTCFullYear();
const season=title=>{const years=[...String(title).matchAll(/\b(20\d{2})(?:-(\d{2,4}))?\b/g)].map(m=>Math.max(Number(m[1]),m[2]?Number(m[2].length===2?`20${m[2]}`:m[2]):0));return years.length?Math.max(...years):null};
const decode=text=>text.replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&');

for(const id of ids){
  const text=readFileSync(new URL(`../src/schools/${id}.mjs`,import.meta.url),'utf8');
  const host=(text.match(/const HOST='([^']+)'/)||[])[1];
  const block=(text.match(/scheduleUrls:\{\n([\s\S]*?)\n  \}/)||[])[1]||'';
  const routes=[...block.matchAll(/'[^|]+\|([^']+)':(\[[^\]]*\]|'[^']*')/g)].flatMap(([,sport,list])=>[...list.matchAll(/'([^']+)'/g)].map(([,url])=>({sport,url})));
  const home=await page(`https://${host}/`);
  const menu=new Set([...home.html.matchAll(/href="(?:https?:\/\/[^"/]+)?\/sports\/([a-z0-9-]+)(?:\/(?:schedule|roster)?)?\/?"/g)].map(m=>m[1]).filter(slug=>!NOT_TEAMS.test(slug)));
  const routeSlugs=new Set(routes.map(r=>(r.url.match(/\/sports\/([^/]+)\//)||[])[1]));
  console.log(`== ${id} (${host}): homepage ${home.status}, menu: ${[...menu].sort().join(' ')}`);
  const unread=[...menu].filter(slug=>!routeSlugs.has(slug));
  if(unread.length)console.log(`  MENU NOT READ: ${unread.join(', ')}`);
  const rows=await Promise.all(routes.map(async ({sport,url})=>{
    const {status,html}=await page(url),title=decode((html.match(/<title>([^<]*)<\/title>/i)||[])[1]?.replace(/\s+/g,' ').trim()||''),year=season(title),slug=(url.match(/\/sports\/([^/]+)\//)||[])[1];
    const flags=[status!==200&&`HTTP ${status}`,menu.size&&!menu.has(slug)&&'OFF MENU',year&&year<currentYear&&`OLD SEASON ${year}`,status===200&&!/schedule/i.test(title)&&'NOT A SCHEDULE'].filter(Boolean);
    return `  ${flags.length?'!!':'ok'} ${sport.padEnd(18)} ${slug.padEnd(26)} ${title.slice(0,80)}${flags.length?`  << ${flags.join(', ')}`:''}`;
  }));
  console.log(rows.join('\n'));
}
