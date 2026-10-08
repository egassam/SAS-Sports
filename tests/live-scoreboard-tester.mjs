// The live scoreboard tester's rules (scripts/live-scoreboard-tester.mjs) on a
// real ESPN payload saved during the October 3, 2026 games (KU vs Middle
// Tennessee live in the 1st quarter), with app feeds built by hand.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {watchedSports,scoreboardGames,checkCard,advance,LIVE_POLLS} from '../scripts/live-scoreboard-tester.mjs';

const payload=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/football-espn-2026-10-03-live.json.gz',import.meta.url))).toString('utf8'));
const now=new Date('2026-10-03T16:14:00Z'),later=ms=>new Date(now.getTime()+ms);

// Watched: every converted school-sport with a scoreboard, and only those.
const all=watchedSports();
const has=(school,sport)=>all.some(w=>w.school.id===school&&w.sport===sport);
assert.ok(has('kstate','Football')&&has('kstate','Volleyball')&&has('indiana','Volleyball')&&has('kansas','Football'));
assert.ok(!has('kstate','Cross Country')&&!has('kstate','Golf'),'meets have no live scoreboard');
assert.ok(all.every(w=>w.providers.length));
// Game sports the app reads no scoreboard for are watched too (on ESPN's
// default board, flagged noScoreboard); K-State Soccer reads one since 4.69.2.
const ks=all.find(w=>w.school.id==='kstate'&&w.sport==='Soccer');
assert.ok(ks&&!ks.noScoreboard);
for(const w of all.filter(w=>w.noScoreboard))assert.ok(['Football','Basketball','Volleyball','Soccer','Baseball','Softball'].includes(w.sport));
const ku=watchedSports({schoolIds:['kansas'],sports:['Football']});
assert.equal(ku.length,1);

// The KU game read by the Worker's own scoreboard reader: ON.
const payloads=new Map();for(const p of ku[0].providers)for(const d of ['20261002','20261003','20261004'])payloads.set(`https://site.api.espn.com/apis/site/v2/sports/${p.path}/scoreboard?groups=80&limit=300&dates=${d}`,d==='20261003'?payload:{events:[]});
const {games}=scoreboardGames(ku,payloads,now);
assert.equal(games.length,1);
const game=games[0];
assert.deepEqual([game.status,game.school_id,game.possession],['Live','kansas','opponent']);

// App feeds built by hand around that game.
const card={...game,verification_state:'official_schedule+live_scoreboard'};
const feed=(group,fetchedAt=now.toISOString())=>({status:200,body:[{sport:'Football',live:[],results:[],upcoming:[],other:[],...group}],fetchedAt,cache:'live'});
const ok=checkCard(feed({live:[card]}),[game],now);
assert.ok(ok.ok,ok.detail);
// Behind ESPN, not yet live, a stale build, a failed read: read again (lag).
for(const [name,f] of [
  ['score behind',feed({live:[{...card,school_score:String(Number(game.school_score)+7)}]})],
  ['not yet live',feed({upcoming:[{...card,status:'Scheduled'}]})],
  ['stale build',feed({live:[card]},new Date(now.getTime()-5*60*1000).toISOString())],
  ['HTTP 503',{status:503,body:null}],
  ['no ball',feed({live:[{...card,possession:null}]})],
]){const r=checkCard(f,[game],now);assert.deepEqual([r.ok,r.lag],[false,true],name)}
// Matching the second ESPN reading (the score moved during the read) is current.
assert.ok(checkCard(feed({live:[{...card,school_score:'3'}]}),[game,{...game,school_score:'3'}],now).ok);
// Broken, not lag: a duplicate card, or the scoreboard not joined to the schedule.
for(const [name,f] of [
  ['two live cards',feed({live:[card,card]})],
  ['live and upcoming',feed({live:[card],upcoming:[{...card,status:'Scheduled'}]})],
  ['no status line',feed({live:[{...card,headline:'',recency_label:''}]})],
]){const r=checkCard(f,[game],now);assert.deepEqual([r.ok,r.lag],[false,false],name)}

// ON → two live polls a minute apart → final checked → DONE (off for good).
let rec={state:'off'};
rec=advance(rec,game,ok,now);assert.deepEqual([rec.state,rec.game.live_passes.length],['on',1]);
rec=advance(rec,game,ok,later(20*1000));assert.equal(rec.game.live_passes.length,1,'polls under a minute apart count once');
rec=advance(rec,game,ok,later(61*1000));assert.equal(rec.game.live_passes.length,LIVE_POLLS);
const final={...game,status:'Final',school_score:'24',opponent_score:'17',headline:'W, 24-17'};
assert.deepEqual(checkCard(feed({live:[card]},later(3*60*60*1000).toISOString()),[final],later(3*60*60*1000)).lag,true,'still live after ESPN final: lag');
const finalCard={...final,results:[{label:'Result',value:'W, 24-17'}]};
const wrong=checkCard(feed({results:[{...finalCard,headline:'W, 21-17',results:[]}]},later(3*60*60*1000).toISOString()),[final],later(3*60*60*1000));assert.equal(wrong.ok,false);
const done=checkCard(feed({results:[finalCard]},later(3*60*60*1000).toISOString()),[final],later(3*60*60*1000));assert.ok(done.ok,done.detail);
rec=advance(rec,final,done,later(3*60*60*1000));
assert.deepEqual([rec.state,rec.game,rec.verified_game],['done',null,game.title]);

// A final whose live phase was not seen twice proves nothing: off, waits.
assert.equal(advance({state:'off'},final,done,now).state,'off');
// A broken rule fails the sport; it stays watched and passes on a later game.
const broken=advance({state:'on',game:{key:game.key,live_passes:[]}},game,{ok:false,lag:false,detail:'2 live cards'},now);
assert.deepEqual([broken.state,broken.failures],['failing',1]);
assert.equal(advance(broken,game,ok,later(61*1000)).state,'on');
// Lag alone keeps it ON; a final still wrong after the grace period fails.
assert.equal(advance({state:'on'},game,{ok:false,lag:true,detail:'behind'},now).state,'on');
const due={state:'on',game:{key:game.key,live_passes:[now.toISOString(),later(61000).toISOString()],final_due:later(60*60*1000).toISOString()}};
assert.equal(advance(due,final,{ok:false,lag:true,detail:'still live'},later(30*60*1000)).state,'on');
assert.equal(advance(due,final,{ok:false,lag:true,detail:'still live'},later(2*60*60*1000)).state,'failing');

console.log(`Live scoreboard tester checks passed (${all.length} school-sports watched; on → ${LIVE_POLLS} live polls → final → done)`);
