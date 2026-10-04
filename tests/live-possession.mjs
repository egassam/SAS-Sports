import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers,parseArizonaRecapResults,parseArizonaGolfRecap} from '../src/schools/arizona.mjs';
import {baylorSchool,createBaylorHandlers} from '../src/schools/baylor.mjs';
import {cincinnatiSchool,createCincinnatiHandlers} from '../src/schools/cincinnati.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {parseScoreboardPayload,scoreboardTeamMatchesSchool,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));

// Who has the ball, from ESPN's live football scoreboard (real payload saved
// during the October 3, 2026 games: Middle Tennessee had the ball at KU's 47
// on 4th & 13; Houston at its own 30 on 2nd & 5 after UCF's touchdown).
const payload=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/football-espn-2026-10-03-live.json.gz',import.meta.url))).toString('utf8'));
const football={path:'football/college-football',sourceName:'Live college football scoreboard'},now=new Date('2026-10-03T16:14:00Z');
const live=id=>worker.parseScoreboardPayload(payload,schools.find(s=>s.id===id),'Football',football,'https://site.api.espn.com/x',now)[0];
const ku=live('kansas'),ucf=live('ucf');
assert.deepEqual([ku.status,ku.possession,ku.down_distance,ku.red_zone],['Live','opponent','4th & 13 at KU 47',false]);
assert.deepEqual([ucf.status,ucf.school_score,ucf.opponent_score,ucf.possession,ucf.down_distance],['Live','7','0','opponent','2nd & 5 at HOU 30']);
// The team with the ball as the school's own side.
const swapped=JSON.parse(JSON.stringify(payload));
for(const e of swapped.events)if(/Kansas Jay/.test(e.name)){e.competitions[0].situation.possession='2305';e.competitions[0].situation.isRedZone=true;}
const kuBall=worker.parseScoreboardPayload(swapped,schools.find(s=>s.id==='kansas'),'Football',football,'https://site.api.espn.com/x',now)[0];
assert.deepEqual([kuBall.possession,kuBall.red_zone],['school',true]);
// No team named (after a score, at breaks) or a team not in the game: nothing shown.
for(const value of [undefined,'9999']){
  const copy=JSON.parse(JSON.stringify(payload));
  for(const e of copy.events)if(/Kansas Jay/.test(e.name)){if(value===undefined)delete e.competitions[0].situation.possession;else e.competitions[0].situation.possession=value;}
  const game=worker.parseScoreboardPayload(copy,schools.find(s=>s.id==='kansas'),'Football',football,'https://site.api.espn.com/x',now)[0];
  assert.deepEqual([game.possession,game.down_distance],[undefined,undefined],`possession ${value}`);
}
// BYU's game had not started: not live, no possession.
assert.equal(live('byu'),undefined);
// Joined to the official card, the possession travels with the live score.
{
  const official={id:'official-ku',sport:'Football',status:'Today',start_time:'2026-10-03T12:00:00.000Z',title:'KU vs Middle Tennessee',team_label:null};
  const [joined]=worker.reconcileScoreboardEvents([official],[ku]);
  assert.deepEqual([joined.id,joined.status,joined.possession,joined.down_distance,joined.red_zone],['official-ku','Live','opponent','4th & 13 at KU 47',false]);
}

// The page draws a football beside the team with the ball and the down and
// distance under the board.
{
  const page=read('../public/index.html');
  const fn=name=>{const at=page.indexOf(`function ${name}(`);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n}\n',at)+2);};
  const line=start=>{const at=page.indexOf(start);assert.ok(at>=0,start);return page.slice(at,page.indexOf('\n',at));};
  const liveCard=Function(`${line('const esc=')}\n${line('const lastLiveScores=')}\n${fn('liveSides')}\n${line('function monogram(')}\n${fn('liveCard')};return liveCard;`)();
  const base={id:'x',sport:'Football',title:'KU vs Middle Tennessee',opponent:'Middle Tennessee',school_score:'0',opponent_score:'0',recency_label:'10:50 - 1st',live_score_source:'https://site.api.espn.com/x'};
  const theirs=liveCard({...base,possession:'opponent',down_distance:'4th & 13 at KU 47',red_zone:false});
  const rows=theirs.split('<div class="live-team ').slice(1);
  assert.ok(!rows[0].includes('live-ball')&&rows[1].includes('live-ball')&&rows[1].startsWith('them'),'the ball is beside Middle Tennessee');
  assert.match(theirs,/<div class="live-situation"><span>Middle Tennessee ball<\/span><span>4th &amp; 13 at KU 47<\/span><\/div>/);
  assert.match(theirs,/aria-label="Live: KU 0, Middle Tennessee 0, 10:50 - 1st, Middle Tennessee has the ball, 4th &amp; 13 at KU 47"/);
  const ours=liveCard({...base,id:'y',possession:'school',down_distance:'1st & Goal at MTSU 4',red_zone:true});
  assert.ok(ours.split('<div class="live-team ')[1].startsWith('ours')&&ours.split('<div class="live-team ')[1].includes('live-ball'));
  assert.match(ours,/live-situation red-zone[^]*Red zone/);
  // The traveling glow: the card's delay follows the clock (the 15 s redraw
  // does not restart it), and reduced motion stops it.
  assert.match(theirs,/style="--sas-glow-delay:-\d+ms"/);
  assert.match(page,/@property --sas-glow-angle/);
  assert.match(page,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.live-card-board::before,\.live-card-board::after\{animation:none\}\}/);
  const none=liveCard({...base,id:'z'});
  assert.ok(!none.includes('live-ball')&&!none.includes('live-situation'),'no possession: nothing drawn');
}
console.log('Live possession checks passed (real Oct 3 scoreboard: KU and UCF games; page draws the ball and down & distance; traveling glow)');
