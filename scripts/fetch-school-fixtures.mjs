// Saves every official page a SIDEARM school conversion needs as test
// fixtures, in one command (Houston took ~30 separate fetches by hand):
//   - each sport's schedule candidates (tests/fixtures/<id>-module/<slug>-schedule.html.gz),
//     with a summary: page title, games, finals, and SIDEARM's empty
//     "@season @sport" template marked as such;
//   - every current-season final's linked story (recap-<y>-<m>-<d>-<slug>.html.gz,
//     the name tests/houston-module.mjs's recapFile() expects);
//   - the sport's /archives page when a scored final links no story, and the
//     archive stories dated within each past meet or tournament without one;
//   - ESPN scoreboard payloads for the latest final of each live sport;
//   - TFRRS team and meet pages for cross country (--tfrrs-f=, --tfrrs-m=
//     team page URLs; the summary prints the likely ones).
// Pages that refuse the sandbox come through the private source route
// (SAS_SOURCE_KEY, as scripts/fetch-official.mjs); others are fetched directly.
//
//   NODE_USE_ENV_PROXY=1 node scripts/fetch-school-fixtures.mjs --school=iowa-state [--sports=Football,Soccer] [--tfrrs-f=... --tfrrs-m=...]
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,unlinkSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';
import {findTfrrsMeet} from '../src/tfrrs-results.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school');
if(!id){console.error('usage: node scripts/fetch-school-fixtures.mjs --school=<id> [--sports=A,B] [--tfrrs-f=<url> --tfrrs-m=<url>] [--date=YYYY-MM-DD] [--prune]');process.exit(2)}
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,parseHtml};')(...Object.values(deps));

const key=process.env.SAS_SOURCE_KEY,base=(process.env.SAS_SPORTS_BASE_URL||'https://sas-sports.lovetogivepain.workers.dev').replace(/\/$/,'');
const blocked=new Set();
async function download(url){
  const host=new URL(url).hostname;
  if(!blocked.has(host)){
    try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(r.ok)return{status:r.status,body:await r.text()};if(r.status!==403)return{status:r.status,body:null};}catch{}
    blocked.add(host);
  }
  if(!key)return{status:403,body:null};
  // A dropped connection (ECONNRESET through the proxy) is retried; it must
  // not end the whole run (Georgia's first run stopped after 56 pages).
  for(let attempt=1;;attempt++){
    try{
      const r=await fetch(`${base}/api/source?url=${encodeURIComponent(url)}`,{headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
      return{status:r.status,body:r.ok?await r.text():null};
    }catch(error){if(attempt>=3)return{status:`failed (${error.cause?.code||error.name})`,body:null};await new Promise(done=>setTimeout(done,2000*attempt));}
  }
}
const save=(name,body)=>writeFileSync(new URL(name,dir),gzipSync(Buffer.from(body),{level:9}));
const have=name=>existsSync(new URL(name,dir));
export const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};

const ESPN={Football:'football/college-football/scoreboard?groups=80&limit=300',Volleyball:'volleyball/womens-college-volleyball/scoreboard?limit=1000',Soccer:'soccer/usa.ncaa.w.1/scoreboard?limit=1000',Basketball:'basketball/mens-college-basketball/scoreboard?groups=50&limit=400',Baseball:'baseball/college-baseball/scoreboard?limit=400',Softball:'baseball/college-softball/scoreboard?limit=400'};
const summary=[],dropped=[];
// Sports are fetched six at a time, and each sport's stories at once: the
// private source answers in about a second, so one page after another took
// ten minutes a school (Illinois, Indiana). Each sport keeps its own summary
// lines, printed in the sports' order.
async function mapLimit(items,limit,work){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await work(items[i]);}}));return out;}
const perSport=await mapLimit(sports,6,async sport=>{
  const summary=[];
  const titles=new Set();
  for(const url of worker.candidateUrls(school,sport)){
    const path=new URL(url).pathname,slug=(path.match(/^\/sports?\/([^/]+)\/schedule/)||[])[1];
    if(!slug){summary.push(`${sport}: ${url} is not a schedule page (homepage?) — drop it from the routes`);dropped.push(url);continue}
    const name=`${slug}-schedule.html.gz`;
    const page=await download(url);
    if(!page.body){summary.push(`${sport}: ${slug} HTTP ${page.status}`);continue}
    save(name,page.body);
    const title=(page.body.match(/<title>([^<]*)/)||[])[1]?.trim()||'';
    let games=sidearmScheduleGames(page.body);
    // A site without SIDEARM page data (WMT: LSU, Cincinnati) is read by the
    // school's own module, offline; its events are mapped to the same shape.
    if(!games.length){try{games=(worker.parseHtml(page.body,school,sport,url,new Date(`${today}T15:00:00Z`))||[]).map(e=>({date:String(e.start_time).slice(0,10),enddate:e.end_time?String(e.end_time).slice(0,10):null,opponent:{title:e.opponent},result:e.status==='Final'?{status:/^[WLT],/.test(e.headline||'')?e.headline[0]:'N',postscore_info:e.headline,recap:e.recap_url?{url:e.recap_url}:null}:null}));}catch{games=[]}}
    const current=games.filter(g=>String(g.date).slice(0,10)>=seasonStart);
    // "@season @sport", or "@season Women's Swimming & Diving" (Tennessee).
    if(/@season\b/.test(title)){summary.push(`${sport}: ${slug} — SIDEARM's empty template; drop it from the routes`);dropped.push(url);continue}
    // A second address for the same page ("wsoc" for "womens-soccer").
    if(titles.has(title)){summary.push(`${sport}: ${slug} — the same page as an earlier route ("${title}"); drop it from the routes`);dropped.push(url);continue}
    titles.add(title);
    const finals=current.filter(g=>g.result&&(g.result.status||g.result.prescore_info||g.result.postscore_info)&&String(g.date).slice(0,10)<=today);
    let stories=0,missing=0;
    await Promise.all(finals.map(async game=>{
      const recap=game.result?.recap?.url;
      if(typeof recap!=='string'||!/\/news\//.test(recap)){if(['W','L','T'].includes(String(game.result.status).toUpperCase()))missing++;return}
      const link=new URL(recap,url).href,file=recapFile(link);
      if(!have(file)){const story=await download(link);if(story.body){save(file,story.body);stories++}}else stories++;
    }));
    // Past meets and tournaments the schedule links no story for (Iowa State's
    // cross country; a golf tournament with no result yet): the archive
    // stories dated from their first day to the day after their last are
    // saved too (story-<y>-<m>-<d>-<slug>.html.gz), for createArchiveStory's
    // meetSports.
    const lastDay=g=>String(g.enddate||g.date).slice(0,10);
    const unlinked=current.filter(g=>lastDay(g)<today&&!g.noplay_text&&!(typeof g.result?.recap?.url==='string'&&/\/news\//.test(g.result.recap.url))&&!['W','L','T'].includes(String(g.result?.status||'').toUpperCase()));
    // A WMT site lists a sport's stories at /sports/<slug>/news (Iowa,
    // Nebraska); it is saved under the same name.
    if((missing||unlinked.length)&&!have(`${slug}-archives.html.gz`)){let list=await download(`https://${new URL(url).hostname}/sports/${slug}/archives`);if(!list.body)list=await download(`https://${new URL(url).hostname}/sports/${slug}/news`);if(list.body)save(`${slug}-archives.html.gz`,list.body)}
    let meetStories=0;
    if(unlinked.length&&have(`${slug}-archives.html.gz`)){
      const listing=gunzipSync(readFileSync(new URL(`${slug}-archives.html.gz`,dir))).toString('utf8').replace(/\\u002F/gi,'/');
      const paths=[...new Set(listing.match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])];
      for(const game of unlinked){
        const first=Date.parse(`${String(game.date).slice(0,10)}T00:00:00Z`),last=Date.parse(`${lastDay(game)}T00:00:00Z`)+86400000;
        for(const path of paths){
          const [y,m,d,name]=path.split('/').slice(2);const day=Date.UTC(+y,+m-1,+d);if(day<first||day>last)continue;
          const file=`story-${y}-${m}-${d}-${name.slice(0,40)}.html.gz`;
          if(!have(file)){const story=await download(`https://${new URL(url).hostname}${path}`);if(story.body){save(file,story.body);meetStories++}}else meetStories++;
        }
      }
    }
    summary.push(`${sport}: ${slug} — "${title.replace(/ - .*$/,'')}", ${games.length} entries, ${current.length} this season, ${finals.length} with a result, ${stories} stories saved${missing?`, ${missing} scored finals without a story (archives saved)`:''}${unlinked.length?`, ${unlinked.length} past meets/tournaments without a story (${meetStories} archive stories saved)`:''}`);
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
        // Every past meet: one the schedule gives no result yet (Texas Tech's
        // Nike XC Town Twilight) is final on TFRRS.
        for(const game of current.filter(g=>String(g.date).slice(0,10)<today)){
          const meet=findTfrrsMeet(listing.body,{decodeHtml:s=>String(s).replace(/&amp;/g,'&'),date:String(game.date).slice(0,10),name:game.opponent?.title});
          const number=meet&&(meet.match(/\/results\/xc\/(\d+)/)||[])[1];
          if(number&&!have(`tfrrs-${number}.html.gz`)){const page=await download(meet);if(page.body){save(`tfrrs-${number}.html.gz`,page.body);summary.push(`  TFRRS ${game.opponent?.title}: ${meet}`)}}
        }
      }
    }
  }
  return summary;
});
summary.push(...perSport.flat());
// --prune: the flagged routes (and their roster twins) leave the module.
if(args.includes('--prune')&&dropped.length){
  const moduleUrl=new URL(`src/schools/${id}.mjs`,root);let text=readFileSync(moduleUrl,'utf8');
  const quoted=url=>`'${url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`;
  for(const url of dropped)for(const target of [url,url.replace(/\/schedule$/,'/roster')])text=text.replace(new RegExp(`,${quoted(target)}(?=[,\\]])|${quoted(target)},(?=')`,'g'),'');
  // A one-route array reads as its route.
  text=text.replace(/(\n\s*'[^'\n]+\|[^'\n]+':)\[('[^'\]]+')\]/g,'$1$2');
  writeFileSync(moduleUrl,text);
  summary.push(`--prune: ${dropped.length} routes removed from src/schools/${id}.mjs (check combinedSports when one team page is left)`);
}
// --prune: schedule pages no route uses any more (a candidate from an earlier
// run, Minnesota's 22 template pages) leave the fixtures too.
if(args.includes('--prune')){
  const used=new Set([...readFileSync(new URL(`src/schools/${id}.mjs`,root),'utf8').matchAll(/\/sports\/([a-z0-9-]+)\/schedule\b/g)].map(m=>m[1]));
  const dir=new URL(`tests/fixtures/${id}-module/`,root),stale=existsSync(dir)?readdirSync(dir).filter(name=>{const slug=(name.match(/^(.+)-schedule\.html\.gz$/)||[])[1];return slug&&!used.has(slug);}):[];
  for(const name of stale)unlinkSync(new URL(name,dir));
  if(stale.length)summary.push(`--prune: ${stale.length} schedule fixtures no route uses removed`);
}
console.log(`${school.name} fixtures in tests/fixtures/${id}-module/ (season from ${seasonStart}, today ${today}):\n  ${summary.join('\n  ')}`);
