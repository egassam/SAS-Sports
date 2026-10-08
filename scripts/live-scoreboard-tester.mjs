// Live scoreboard tester. Every school-sport with a live scoreboard (the
// converted school modules' `liveScoreboards`, plus Football's default) is
// watched until one of its games has been seen working on the deployed app:
//
//   ON   a game of a sport still under test is in progress on ESPN (or has
//        just ended and its final is being checked);
//   OFF  idle: no game of a sport under test is in progress;
//   FAIL a game sport the app reads no scoreboard for has a game live on
//        ESPN (checked on ESPN's default board for the sport);
//   DONE the sport passed: it is never tested again (until --reset).
//
// A sport passes when, for one game:
//   1. the app's feed (/live/feed/grouped, read as the app reads it, no
//      refresh) answers 200 with a fresh build (x-sas-fetched-at < 90 s old);
//   2. the game is in the group's `live` list exactly once, joined to the
//      official schedule (no second card for it in upcoming), with ESPN's
//      score and a status line, and for football who has the ball when ESPN
//      names a team; this holds on two polls at least 60 s apart;
//   3. after ESPN marks it final, the card leaves `live` and appears in
//      `results` with ESPN's final score ("W, 3-1").
// A score behind ESPN is retried (the feed is cached 10 s, ESPN 15 s); still
// behind after the retries, or any other broken rule, fails the sport, which
// stays ON for its next game and makes the run exit 1.
//
// State (which sports are DONE, which game is being followed) is a JSON file,
// --state (default live-scoreboard-state.json). The GitHub workflow keeps it
// on the `live-scoreboard-state` branch.
//
//   node scripts/live-scoreboard-tester.mjs                 one pass, then keep polling up to 8 min while ON
//   node scripts/live-scoreboard-tester.mjs --minutes=240   follow tonight's games (sleeps while OFF)
//   node scripts/live-scoreboard-tester.mjs --status        print the state only
//   --schools=a,b  --sports="Football,Soccer"  --base=<url>  --branch=<preview branch>  --reset=all|<school>[:<sport>]
import {readFileSync,writeFileSync,existsSync,appendFileSync} from 'node:fs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from '../tests/school-module-deps.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('The tester reads ESPN itself')}};
export const worker=Function(...Object.keys(deps),source+';return {VERSION,SCHOOL_MODULES,liveScoreboardProviders,parseScoreboardPayload,scoreboardTeamMatchesSchool,scoreboardQuery,scoreboardDates,scoreboardDateKey};')(...Object.values(deps));

export const LIVE_POLLS=2,LIVE_SPACING_MS=60*1000,MAX_FEED_AGE_MS=90*1000,FINAL_GRACE_MS=15*60*1000,GAME_FORGET_MS=12*60*60*1000;
const sportKey=(school,sport)=>`${school}|${sport}`;
export const gameKey=game=>`${game.school_id}|${game.sport}|${game.team_label||''}|${worker.scoreboardDateKey(game.start_time)}|${game.game_number||1}`;

export const ESPN_BOARDS={
  Football:[{path:'football/college-football'}],
  Basketball:[{path:'basketball/mens-college-basketball',team_label:"Men's"},{path:'basketball/womens-college-basketball',team_label:"Women's"}],
  Volleyball:[{path:'volleyball/womens-college-volleyball'}],
  Soccer:[{path:'soccer/usa.ncaa.w.1'},{path:'soccer/usa.ncaa.m.1',team_label:"Men's"}],
  Baseball:[{path:'baseball/college-baseball'}],
  Softball:[{path:'baseball/college-softball'}]
};
// Every converted school-sport with games: those the Worker reads a live
// scoreboard for, and game sports it reads none for (`noScoreboard`).
export function watchedSports({schoolIds=null,sports=null}={}){
  const out=[];
  for(const {school:{id}} of worker.SCHOOL_MODULES){
    if(schoolIds&&!schoolIds.includes(id))continue;
    const school=schools.find(s=>s.id===id);if(!school)continue;
    for(const sport of sponsoredSports[id]||[]){
      if(sports&&!sports.includes(sport))continue;
      const providers=worker.liveScoreboardProviders(school,sport);
      if(providers.length)out.push({school,sport,providers});
      // A game sport the app reads no scoreboard for is watched on ESPN's
      // default board: a live game there fails it (K-State soccer, Oct 8,
      // stayed "Today" in upcoming while ESPN showed it live).
      else if(ESPN_BOARDS[sport])out.push({school,sport,providers:ESPN_BOARDS[sport],noScoreboard:true});
    }
  }
  return out;
}

// One ESPN read per scoreboard and date, shared by every school.
export async function readScoreboards(watched,now,fetchJson){
  const urls=new Set();
  for(const {providers} of watched)for(const p of providers)for(const date of worker.scoreboardDates(now))urls.add(`https://site.api.espn.com/apis/site/v2/sports/${p.path}/scoreboard?${worker.scoreboardQuery(p)}&dates=${date}`);
  const payloads=new Map();
  await Promise.all([...urls].map(async url=>{try{payloads.set(url,await fetchJson(url))}catch(error){payloads.set(url,{error:String(error?.message||error)})}}));
  return payloads;
}

// The games ESPN shows for each watched sport, parsed by the Worker's own
// reader (so the expected card is what the app should show), plus the next
// start time of a game not yet begun (to know when to switch ON).
export function scoreboardGames(watched,payloads,now){
  const games=[];let nextStart=null;
  for(const {school,sport,providers} of watched)for(const provider of providers)for(const date of worker.scoreboardDates(now)){
    const url=`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard?${worker.scoreboardQuery(provider)}&dates=${date}`,payload=payloads.get(url);
    if(!payload?.events)continue;
    for(const game of worker.parseScoreboardPayload(payload,school,sport,provider,url,now))games.push({...game,school_id:school.id,key:gameKey({...game,school_id:school.id})});
    for(const item of payload.events){
      const competition=item?.competitions?.[0],state=String(competition?.status?.type?.state||item?.status?.type?.state||'').toLowerCase();
      if(state!=='pre'||!(competition?.competitors||[]).some(c=>worker.scoreboardTeamMatchesSchool(c?.team,school)))continue;
      const start=Date.parse(competition?.date||item?.date||'');
      if(Number.isFinite(start)&&start>=now.getTime()-3*60*60*1000&&(!nextStart||start<nextStart.at))nextStart={at:start,label:`${school.id} ${sport}: ${item.shortName||item.name}`};
    }
  }
  const unique=new Map();for(const game of games)if(!unique.has(game.key))unique.set(game.key,game);
  return {games:[...unique.values()],nextStart};
}

const sameGame=(card,game)=>(card.team_label||null)===(game.team_label||null)&&worker.scoreboardDateKey(card.start_time)===worker.scoreboardDateKey(game.start_time)&&(!game.game_number||card.game_number===game.game_number);
const scoreOf=x=>`${x.school_score??''}-${x.opponent_score??''}`;

// Checks one game against the app's group. `expected` holds one or two ESPN
// readings (before and after the feed read): matching either is current.
// Returns {ok, lag, detail}: lag means "behind ESPN, read again".
export function checkCard(feed,expected,now){
  const game=expected[0];
  if(feed.status!==200||!Array.isArray(feed.body))return{ok:false,lag:true,detail:`feed HTTP ${feed.status}${feed.error?` (${feed.error})`:''}`};
  const group=feed.body.find(g=>g.sport===game.sport)||feed.body[0];
  if(!group)return{ok:false,lag:false,detail:'feed has no group for the sport'};
  const age=feed.fetchedAt?now.getTime()-Date.parse(feed.fetchedAt):null;
  if(age!=null&&age>MAX_FEED_AGE_MS)return{ok:false,lag:true,detail:`feed built ${Math.round(age/1000)} s ago (cache ${feed.cache||'?'})`};
  const where=list=>(group[list]||[]).filter(card=>sameGame(card,game));
  const live=where('live'),results=where('results'),upcoming=where('upcoming');
  if(game.status==='Live'){
    if(!live.length)return{ok:false,lag:true,detail:`ESPN shows ${game.title} live (${game.headline}) but the app has no live card${results.length?' (it is in results)':upcoming.length?' (still in upcoming)':''}`};
    if(live.length>1)return{ok:false,lag:false,detail:`${live.length} live cards for one game`};
    if(upcoming.length)return{ok:false,lag:false,detail:`the game is live and also still in upcoming (scoreboard not joined to the official schedule)`};
    const card=live[0];
    if(card.status!=='Live')return{ok:false,lag:false,detail:`live card status "${card.status}"`};
    if(!String(card.headline||card.recency_label||'').trim())return{ok:false,lag:false,detail:'live card has no status line'};
    if(!expected.some(e=>scoreOf(e)===scoreOf(card)))return{ok:false,lag:true,detail:`score ${scoreOf(card)}, ESPN ${expected.map(scoreOf).join(' / ')}`};
    if(game.sport==='Football'&&expected.every(e=>e.possession)&&!card.possession)return{ok:false,lag:true,detail:`ESPN names who has the ball (${game.down_distance||'—'}), the card does not`};
    return{ok:true,detail:`live ${scoreOf(card)} · ${card.headline||card.recency_label}${card.possession?` · ball: ${card.possession}${card.down_distance?` (${card.down_distance})`:''}`:''} · ${card.verification_state}`};
  }
  if(live.length)return{ok:false,lag:true,detail:`ESPN shows the game final (${game.headline}) but the app still shows it live (${scoreOf(live[0])})`};
  if(!results.length)return{ok:false,lag:true,detail:`final ${game.headline} not in the app's results`};
  const score=`${game.school_score}-${game.opponent_score}`,card=results[0],line=[card.headline,...(card.results||[]).map(r=>r.value)].join(' ');
  if(game.sport==='Volleyball'?!line.includes(String(game.headline).replace(/^[WL], /,'')):!line.includes(score))return{ok:false,lag:true,detail:`result reads "${card.headline}", ESPN final ${game.headline}`};
  return{ok:true,detail:`final ${card.headline}`};
}

// Moves one sport's record forward after a check. Returns the new record.
export function advance(record,game,result,now){
  const t=now.toISOString(),next={...record,last_check:t,last_detail:result.detail};
  const follow=next.game?.key===game.key?{...next.game}:{key:game.key,title:game.title,started_seen:t,live_passes:[],final_ok:false};
  if(!result.ok){
    const failed=!result.lag||(game.status!=='Live'&&follow.final_due&&now.getTime()>Date.parse(follow.final_due));
    return failed?{...next,state:'failing',game:follow,failures:(next.failures||0)+1,last_failure:{at:t,game:game.title,detail:result.detail}}:{...next,state:'on',game:follow};
  }
  if(game.status==='Live'){
    const last=follow.live_passes.at(-1);
    if(!last||now.getTime()-Date.parse(last)>=LIVE_SPACING_MS)follow.live_passes=[...follow.live_passes,t];
    return{...next,state:'on',game:follow};
  }
  if(follow.live_passes.length>=LIVE_POLLS)return{...next,state:'done',verified_at:t,verified_game:follow.title,verified_detail:result.detail,game:null};
  // A final whose live phase this tester did not see twice proves only the
  // results card; the sport waits for its next game.
  return{...next,state:next.state==='failing'?'failing':'off',game:null,last_detail:`${result.detail} (live phase not observed ${LIVE_POLLS}×; waits for the next game)`};
}

const value=(args,name)=>{const hit=args.find(x=>x.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):null};

async function main(){
  const args=process.argv.slice(2);
  const branch=value(args,'branch'),base=(value(args,'base')||(branch?`https://${branch}-sas-sports.lovetogivepain.workers.dev`:'https://sas-sports.lovetogivepain.workers.dev')).replace(/\/$/,'');
  const statePath=value(args,'state')||'live-scoreboard-state.json',minutes=Number(value(args,'minutes')??8);
  const list=name=>value(args,name)?.split(',').map(x=>x.trim()).filter(Boolean)||null;
  const watched=watchedSports({schoolIds:list('schools'),sports:list('sports')});
  const state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{sports:{}};
  state.sports||={};
  for(const {school,sport} of watched)state.sports[sportKey(school.id,sport)]||={state:'off'};
  const reset=value(args,'reset');
  if(reset)for(const key of Object.keys(state.sports)){const [s,sp]=key.split('|'),[rs,rsp]=reset.split(':');if(reset==='all'||(s===rs&&(!rsp||sp===rsp)))state.sports[key]={state:'off',reset_at:new Date().toISOString()};}
  const save=()=>{state.updated_at=new Date().toISOString();state.base=base;writeFileSync(statePath,JSON.stringify(state,null,1)+'\n')};
  const pending=()=>watched.filter(({school,sport})=>state.sports[sportKey(school.id,sport)].state!=='done');
  const counts=()=>{const c={done:0,on:0,off:0,failing:0};for(const {school,sport} of watched)c[state.sports[sportKey(school.id,sport)].state]++;return c};
  if(args.includes('--status')){printStatus(watched,state,counts());return}

  const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Mozilla/5.0 (compatible; SAS-Sports-live-tester)'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json()};
  const readFeed=async(school,sport)=>{
    try{const r=await fetch(`${base}/live/feed/grouped?school=${encodeURIComponent(school)}&sport=${encodeURIComponent(sport)}`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(60000)});const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}return{status:r.status,body,cache:r.headers.get('x-sas-cache'),fetchedAt:r.headers.get('x-sas-fetched-at'),error:body?null:text.replace(/\s+/g,' ').slice(0,100)}}
    catch(error){return{status:0,body:null,error:String(error?.message||error).slice(0,100)}}
  };
  const version=await fetchJson(`${base}/api/status`).then(s=>s.version).catch(()=>null);
  state.version=version;
  const log=[],failures=[],sleep=ms=>new Promise(r=>setTimeout(r,ms)),end=Date.now()+minutes*60*1000;
  console.log(`Live scoreboard tester · ${base} (${version||'version unknown'}) · ${watched.length} sports watched, ${watched.length-pending().length} done`);

  while(true){
    const now=new Date(),todo=pending();
    if(!todo.length){console.log('DONE: every watched sport has passed. The tester stays off (--reset to test again).');break}
    const payloads=await readScoreboards(todo,now,fetchJson);
    const {games,nextStart}=scoreboardGames(todo,payloads,now);
    // ON: games in progress, and finals of games this tester followed live.
    const active=games.filter(game=>{const rec=state.sports[sportKey(game.school_id,game.sport)];return game.status==='Live'||(rec.game?.key===game.key)});
    // Every game at once. The app may be up to ~25 s behind ESPN (feed cache
    // 10 s, scoreboard cache 15 s), and volleyball points move faster than
    // that: the card is current when it equals any ESPN reading taken in the
    // 45 s before the feed read.
    await Promise.all(active.map(async game=>{
      const key=sportKey(game.school_id,game.sport),rec=state.sports[key],mine=todo.filter(w=>w.school.id===game.school_id&&w.sport===game.sport);
      if(rec.game?.key===game.key&&game.status!=='Live'&&!rec.game.final_due)rec.game.final_due=new Date(now.getTime()+FINAL_GRACE_MS).toISOString();
      const readings=[{at:now.getTime(),game}];
      const readEspn=async()=>{const at=Date.now(),g=scoreboardGames(mine,await readScoreboards(mine,new Date(at),fetchJson),new Date(at)).games.find(g=>g.key===game.key);if(g)readings.push({at,game:g})};
      let result=mine[0]?.noScoreboard&&game.status==='Live'?{ok:false,lag:false,detail:`ESPN shows ${game.title} live (${game.headline}) but the app reads no ${game.sport} scoreboard for ${game.school_id} (add liveScoreboards.${game.sport} to its module)`}:null;
      if(!result)for(let attempt=1;attempt<=3;attempt++){
        if(attempt>1)await readEspn();
        const readAt=Date.now(),feed=await readFeed(game.school_id,game.sport);
        await readEspn();
        const expected=readings.filter(r=>r.at>=readAt-45000&&r.game.status===game.status).map(r=>r.game);
        result=checkCard(feed,expected.length?expected:[game],new Date());
        if(result.ok||!result.lag)break;
        if(attempt<3)await sleep(20000);
      }
      state.sports[key]=advance(rec,game,result,new Date());
      if(mine[0]?.noScoreboard)state.sports[key].game=null;
      const after=state.sports[key],line=`${result.ok?'PASS':after.state==='failing'?'FAIL':'WAIT'} ${game.school_id} ${game.sport} · ${game.title} · ${result.detail} → ${after.state.toUpperCase()}${after.game?` (live polls ${after.game.live_passes.length}/${LIVE_POLLS})`:''}`;
      console.log(line);log.push(line);
      if(after.state==='failing'&&!result.ok)failures.push(line);
    }));
    save();
    // Followed games ESPN no longer lists (postponed, removed) are dropped.
    for(const {school,sport} of todo){const rec=state.sports[sportKey(school.id,sport)];if(rec.game&&!games.some(g=>g.key===rec.game.key)&&now.getTime()-Date.parse(rec.game.started_seen)>GAME_FORGET_MS){rec.game=null;if(rec.state==='on')rec.state='off'}}
    for(const {school,sport} of todo){const rec=state.sports[sportKey(school.id,sport)];if(rec.state==='on'&&!rec.game)rec.state='off'}
    save();
    const on=todo.filter(({school,sport})=>state.sports[sportKey(school.id,sport)].game);
    const c=counts();
    console.log(`${new Date().toISOString()} · ${on.length?`ON for ${on.map(w=>`${w.school.id} ${w.sport}`).join(', ')}`:'OFF (no game of a sport under test in progress)'} · done ${c.done}/${watched.length}${nextStart?` · next start ${new Date(nextStart.at).toISOString()} ${nextStart.label}`:''}`);
    // ON: poll every minute. OFF: sleep until the next game of a sport under
    // test starts (a game past its start time but not begun: every minute).
    const wait=on.length?LIVE_SPACING_MS:nextStart?Math.min(Math.max(nextStart.at-Date.now(),LIVE_SPACING_MS),30*60*1000):null;
    if(wait==null||Date.now()+wait>end)break;
    await sleep(Math.max(wait,LIVE_SPACING_MS));
  }
  save();
  const c=counts();
  const summary=[`## Live scoreboard tester — ${new Date().toISOString()}`,'',`Base: ${base} (${version||'?'})`,'',`- Done (tester off for good): **${c.done}/${watched.length}**`,`- On (game being followed): ${c.on} · Off (waiting for a game): ${c.off} · Failing: **${c.failing}**`,'',...(log.length?['```',...log,'```']:['No game of a sport under test was in progress.']),'',statusTable(watched,state)].join('\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary+'\n');
  console.log(`\nDone ${c.done}/${watched.length}; on ${c.on}; off ${c.off}; failing ${c.failing}. State: ${statePath}`);
  if(failures.length){console.error(`Failing:\n${failures.join('\n')}`);process.exit(1)}
}

function statusTable(watched,state){
  const rows=watched.map(({school,sport})=>{const r=state.sports[sportKey(school.id,sport)];return{school:school.id,sport,...r}}).sort((a,b)=>['failing','on','off','done'].indexOf(a.state)-['failing','on','off','done'].indexOf(b.state)||a.school.localeCompare(b.school));
  return['| School | Sport | Tester | Detail |','| --- | --- | --- | --- |',...rows.map(r=>`| ${r.school} | ${r.sport} | ${{done:'✅ off (passed)',on:'🔴 on',off:'⚪ off (waiting)',failing:'❌ failing'}[r.state]} | ${String(r.state==='done'?`${r.verified_game} · ${r.verified_at}`:r.last_failure&&r.state==='failing'?`${r.last_failure.game}: ${r.last_failure.detail}`:r.last_detail||'').replace(/\|/g,'/')} |`)].join('\n');
}
function printStatus(watched,state,c){console.log(statusTable(watched,state));console.log(`\nDone ${c.done}/${watched.length}; on ${c.on}; off ${c.off}; failing ${c.failing}.`)}

if(import.meta.url===`file://${process.argv[1]}`)await main();
