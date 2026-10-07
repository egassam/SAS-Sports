// Prints what the Worker makes of a school's saved schedule pages, one line
// per event in K-State's wording, so a conversion can be read sport by sport
// before writing its test (Houston's were read this way):
//   Final    Sep 5            Houston vs Oregon State | W, 33-20 | 2026/9/5/football-rolls-in-...
//   Upcoming Oct 10, 2:30 PM  Houston at Kansas State |  | -
// Pages come from tests/fixtures/<id>-module/<slug>-schedule.html.gz (saved by
// scripts/fetch-school-fixtures.mjs), one per schedule route; nothing is
// downloaded. --date sets the clock (a past season's page reads as in season).
//
//   node scripts/survey-school.mjs --school=houston [--sport="Track & Field"] [--date=2026-06-20]
//   node scripts/survey-school.mjs --school=houston --raw --sport=Golf     (the page-data entries)
//   node scripts/survey-school.mjs --school=houston --lines                (test-ready arrays of `line(e)`)
// A final with neither a result line nor a story fails the release gate
// (scripts/verify-release.mjs); the survey flags it (GATE) so it is fixed
// before the first push. Exit code 1 when any is flagged.
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';

const args=process.argv.slice(2),value=name=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};
const id=value('school');
if(!id){console.error('usage: node scripts/survey-school.mjs --school=<id> [--sport=<Sport>] [--date=YYYY-MM-DD] [--raw]');process.exit(2)}
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const schools=JSON.parse(read('src/schools.json')),sponsored=JSON.parse(read('src/sponsored-sports.json'));
const school=schools.find(s=>s.id===id);if(!school){console.error(`unknown school ${id}`);process.exit(2)}
const source=read('src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports:sponsored,rosterSocialInstagrams,extractText:()=>{throw Error('no PDFs')},fetch:async()=>{throw Error('no network')}};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,parseHtml,labelTeamEvents};')(...Object.values(deps));
const now=new Date(value('date')?`${value('date')}T15:00:00Z`:Date.now());
const pad=(text,width)=>String(text).padEnd(width);
// The gate's rule: a final needs a result line other than Completed, or a story.
const gateMiss=e=>e.status==='Final'&&!e.recap_url&&(!e.headline||e.headline==='Completed');
let flagged=0;

for(const sport of value('sport')?[value('sport')]:sponsored[id]){
  for(const url of worker.candidateUrls(school,sport)){
    const slug=(new URL(url).pathname.match(/^\/sports\/([^/]+)\/schedule/)||[])[1];
    const file=new URL(`tests/fixtures/${id}-module/${slug}-schedule.html.gz`,root);
    if(!slug||!existsSync(file)){console.log(`== ${sport} ${url}: no saved page (run scripts/fetch-school-fixtures.mjs)`);continue}
    const raw=gunzipSync(readFileSync(file)).toString('utf8');
    if(args.includes('--raw')){
      console.log(`== ${sport} ${slug}: page data`);
      for(const g of sidearmScheduleGames(raw))console.log(' '+JSON.stringify({date:g.date,end:g.enddate,time:g.time,type:g.type,loc:g.location_indicator,opponent:g.opponent?.title,tournament:g.tournament?.title,noplay:g.noplay_text||undefined,result:g.result&&{status:g.result.status,team:g.result.team_score,opp:g.result.opponent_score,pre:g.result.prescore_info||undefined,post:g.result.postscore_info||undefined,recap:g.result.recap?.url}}));
      continue;
    }
    const events=worker.labelTeamEvents(worker.parseHtml(raw,school,sport,url,now),school,sport,url);
    if(args.includes('--lines')){console.log(`// ${sport} ${slug}\n${JSON.stringify(events.map(e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`),null,1)}`);continue;}
    console.log(`== ${sport} ${slug}: ${events.length} events`);
    for(const e of events)console.log(` ${pad(e.status,8)} ${pad(e.display_time,16)} ${e.title} | ${e.headline||''} | ${e.recap_url?e.recap_url.replace(/^.*\/news\//,''):'-'}${e.end_time?` (to ${e.end_time.slice(0,10)})`:''}${e.recency_label&&e.recency_label!==e.status?` ${e.recency_label}`:''}${gateMiss(e)?'  << GATE: final without a result line or story (look in /archives: fetch-school-fixtures saves it only for scored finals)':''}`);
    flagged+=events.filter(gateMiss).length;
  }
}
if(flagged){console.log(`\n${flagged} final(s) without a result line or story: the release gate fails them.`);process.exitCode=1;}
