// Saves every official page a SIDEARM school conversion needs as test
// fixtures, in one command (Houston took ~30 separate fetches by hand):
//   - each sport's schedule candidates (tests/fixtures/<id>-module/<slug>-schedule.html.gz),
//     with a summary: page title, games, finals, and SIDEARM's empty
//     "@season @sport" template marked as such;
//   - every current-season final's linked story (recap-<y>-<m>-<d>-<slug>.html.gz,
//     the name tests/houston-module.mjs's recapFile() expects);
//   - the sport's /archives page when a scored final links no story;
//   - ESPN scoreboard payloads for the latest final of each live sport;
//   - TFRRS team and meet pages for cross country (--tfrrs-f=, --tfrrs-m=
//     team page URLs; the summary prints the likely ones).
// Pages that refuse the sandbox come through the private source route
// (SAS_SOURCE_KEY, as scripts/fetch-official.mjs); others are fetched directly.
//
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=iowa-state [--sports=Football,Soccer] [--tfrrs-f=... --tfrrs-m=...]
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';
import {findTfrrsMeet} from '../src/tfrrs-results.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school');
if(!id){console.error('usage: node scripts/fetch-school-fixtures.mjs --school=<id> [--sports=A,B] [--tfrrs-f=<url> --tfrrs-m=<url>] [--date=YYYY-MM-DD]');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const schools=JSON.parse(read('src/schools.json')),sponsored=JSON.parse(read('src/sponsored-sports.json'));
const school=schools.find(s=>s.id===id);if(!school){console.error(`unknown school ${id}`);process.exit(2)}
const sports=value('sports')?.split(',').map(s=>s.trim())||sponsored[id];
const dir=new URL(`tests/fixtures/${id}-module/`,root);mkdirSync(dir,{recursive:true});
const today=value('date')||new Date().toISOString().slice(0,10);
const seasonStart=`${Number(today.slice(5,7))>=7?today.slice(0,4):Number(today.slice(0,4))-1}-07-01`;

// Today's routes, exactly as the Worker computes them.
const source=read('src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports:sponsored,rosterSocialInstagrams,extractText:()=>{throw Error('no PDFs')},fetch:()=>{throw Error('no network')}};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls};')(...Object.values(deps));

const key=process.env.SAS_SOURCE_KEY,base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const blocked=new Set();
async function download(url){
  const host=new URL(url).hostname;
  if(!blocked.has(host)){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(r.ok)return{status:r.status,body:await r.text()};if(r.status!==403)return{status:r.status,body:null};}catch{}
    blocked.add(host);
  }
  if(!key)return{status:403,body:null};
  const r=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
  return{status:r.status,body:r.ok?await r.text():null};
}
const save=(name,body)=>writeFileSync(new URL(name,dir),gzipSync(Buffer.from(body),{level:9}));
const have=name=>existsSync(new URL(name,dir));
export const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};

const ESPN={Football:'football/college-football/scoreboard?groups=80&limit=300',Volleyball:'volleyball/womens-college-volleyball/scoreboard?limit=1000',Soccer:'soccer/usa.ncaa.w.1/scoreboard?limit=1000',Basketball:'basketball/mens-college-basketball/scoreboard?groups=50&limit=400',Baseball:'baseball/college-baseball/scoreboard?limit=400',Softball:'baseball/college-softball/scoreboard?limit=400'};
const summary=[];
for(const sport of sports){
  for(const url of worker.candidateUrls(school,sport)){
    const path=new URL(url).pathname,slug=(path.match(/^\/sports\/([^/]+)\/schedule/)||[])[1];
    if(!slug){summary.push(`${sport}: ${url} is not a schedule page (homepage?) — drop it from the routes`);continue}
    const name=`${slug}-schedule.html.gz`;
    const page=await download(url);
    if(!page.body){summary.push(`${sport}: ${slug} HTTP ${page.status}`);continue}
    save(name,page.body);
    const title=(page.body.match(/<title>([^<]*)/)||[])[1]?.trim()||'';
    const games=sidearmScheduleGames(page.body),current=games.filter(g=>String(g.date).slice(0,10)>=seasonStart);
    if(/@season @sport/.test(title)){summary.push(`${sport}: ${slug} — SIDEARM's empty template; drop it from the routes`);continue}
    const finals=current.filter(g=>g.result&&(g.result.status||g.result.prescore_info||g.result.postscore_info)&&String(g.date).slice(0,10)<=today);
    let stories=0,missing=0;
    for(const game of finals){
      const recap=game.result?.recap?.url;
      if(typeof recap!=='string'||!/\/news\//.test(recap)){if(['W','L','T'].includes(String(game.result.status).toUpperCase()))missing++;continue}
      const link=new URL(recap,url).href,file=recapFile(link);
      if(!have(file)){const story=await download(link);if(story.body){save(file,story.body);stories++}}else stories++;
    }
    if(missing&&!have(`${slug}-archives.html.gz`)){const list=await download(`https://${new URL(url).hostname}/sports/${slug}/archives`);if(list.body)save(`${slug}-archives.html.gz`,list.body)}
    summary.push(`${sport}: ${slug} — "${title.replace(/ - .*$/,'')}", ${games.length} entries, ${current.length} this season, ${finals.length} with a result, ${stories} stories saved${missing?`, ${missing} scored finals without a story (archives saved)`:''}`);
    // The latest final of a live sport: its ESPN scoreboard day.
    const last=finals.filter(g=>['W','L','T'].includes(String(g.result.status).toUpperCase())).at(-1);
    if(ESPN[sport]&&last){
      const day=String(last.date).slice(0,10).replace(/-/g,''),file=`${sport.toLowerCase().replace(/\W+/g,'-')}-espn-${String(last.date).slice(0,10)}.json.gz`;
      const path=slug.startsWith('womens-')&&sport==='Basketball'?ESPN[sport].replace('mens-college','womens-college'):ESPN[sport];
      if(!have(file)){const r=await download(`https://site.api.espn.com/apis/site/v2/sports/${path}&dates=${day}`);if(r.body)save(file,r.body)}
    }
    // Cross country: the TFRRS team pages, and each final meet's page.
    if(sport==='Cross Country'){
      const teams={f:value('tfrrs-f'),m:value('tfrrs-m')};
      if(!teams.f||!teams.m)summary.push(`  TFRRS: pass --tfrrs-f= and --tfrrs-m= (likely https://www.tfrrs.org/teams/xc/<STATE>_college_f_${school.name.replace(/\W+/g,'_')}.html)`);
      for(const [team,teamUrl] of Object.entries(teams)){
        if(!teamUrl)continue;
        const listing=await download(teamUrl);if(!listing.body){summary.push(`  TFRRS ${team}: HTTP ${listing.status}`);continue}
        save(`tfrrs-team-${team}.html.gz`,listing.body);
        for(const game of finals){
          const meet=findTfrrsMeet(listing.body,{decodeHtml:s=>String(s).replace(/&amp;/g,'&'),date:String(game.date).slice(0,10),name:game.opponent?.title});
          const number=meet&&(meet.match(/\/results\/xc\/(\d+)/)||[])[1];
          if(number&&!have(`tfrrs-${number}.html.gz`)){const page=await download(meet);if(page.body){save(`tfrrs-${number}.html.gz`,page.body);summary.push(`  TFRRS ${game.opponent?.title}: ${meet}`)}}
        }
      }
    }
  }
}
console.log(`${school.name} fixtures in tests/fixtures/${id}-module/ (season from ${seasonStart}, today ${today}):\n  ${summary.join('\n  ')}`);
