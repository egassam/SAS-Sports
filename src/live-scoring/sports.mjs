// Live scoring rules for school-entered games (user, October 14: "an interface
// that is for the highschools that would 1 update their score boards and 2
// broadcast out live results to the receiving app at the same time").
//
// Each sport is a pure reducer: apply(state, action, now) -> new state. The
// API stores the result; the scorer app, the TV scoreboard and the public app
// all read the same state, so one tap updates every screen.

const clampInt=(n,min,max)=>Math.max(min,Math.min(max,Math.trunc(Number(n)||0)));
const sideOk=s=>s==='home'||s==='away';
const ordinal=n=>{const v=n%100;return n+(v>=11&&v<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'))};

// Baseball and softball (KSHSAA: seven innings for both).
function diamondSport({label,innings}){
  const initial=()=>({innings_scheduled:innings,inning:1,half:'top',balls:0,strikes:0,outs:0,bases:[false,false,false],line:[{away:null,home:null}],runs:{away:0,home:0},hits:{away:0,home:0},errors:{away:0,home:0}});
  const batting=s=>s.half==='top'?'away':'home';
  const fielding=s=>s.half==='top'?'home':'away';
  const resetCount=s=>{s.balls=0;s.strikes=0};
  const frame=s=>{while(s.line.length<s.inning)s.line.push({away:null,home:null});const f=s.line[s.inning-1];if(f[batting(s)]==null)f[batting(s)]=0;return f};
  const endHalf=s=>{
    frame(s);resetCount(s);s.outs=0;s.bases=[false,false,false];
    if(s.half==='top')s.half='bottom';else{s.half='top';s.inning+=1}
  };
  const addRuns=(s,side,n)=>{
    const f=frame(s);const target=side||batting(s);
    // A run always belongs to the batting team's current inning; a correction
    // for the other side lands on its latest inning with runs entered.
    let cell=f;
    if(target!==batting(s)){for(let i=s.inning-1;i>=0;i--){if(s.line[i]?.[target]!=null){cell=s.line[i];break}}if(cell[target]==null)return}
    const next=Math.max(0,(cell[target]||0)+n);s.runs[target]+=next-(cell[target]||0);cell[target]=next;
  };
  const out=s=>{s.outs+=1;resetCount(s);if(s.outs>=3)endHalf(s)};
  const actions={
    ball(s){s.balls+=1;if(s.balls>=4){resetCount(s);advanceForced(s)}},
    strike(s){s.strikes+=1;if(s.strikes>=3)out(s)},
    foul(s){if(s.strikes<2)s.strikes+=1},
    out,
    run(s,a){addRuns(s,sideOk(a.side)?a.side:null,1)},
    run_minus(s,a){addRuns(s,sideOk(a.side)?a.side:null,-1)},
    hit(s,a){const side=sideOk(a.side)?a.side:batting(s);s.hits[side]+=1;resetCount(s)},
    hit_minus(s,a){const side=sideOk(a.side)?a.side:batting(s);s.hits[side]=Math.max(0,s.hits[side]-1)},
    error(s,a){const side=sideOk(a.side)?a.side:fielding(s);s.errors[side]+=1},
    error_minus(s,a){const side=sideOk(a.side)?a.side:fielding(s);s.errors[side]=Math.max(0,s.errors[side]-1)},
    walk(s){resetCount(s);advanceForced(s)},
    next_batter(s){resetCount(s)},
    base(s,a){const i=clampInt(a.base,1,3)-1;s.bases[i]=!s.bases[i]},
    clear_bases(s){s.bases=[false,false,false]},
    end_half:endHalf,
    set_count(s,a){s.balls=clampInt(a.balls,0,3);s.strikes=clampInt(a.strikes,0,2);s.outs=clampInt(a.outs,0,2)},
  };
  // A walk moves the batter to first and pushes forced runners; a runner
  // forced home is not scored automatically (the scorer taps Run).
  function advanceForced(s){
    const [b1,b2,b3]=s.bases;
    if(b1&&b2&&b3)return;
    if(b1&&b2)s.bases=[true,true,true];else if(b1)s.bases=[true,true,b3];else s.bases=[true,b2,b3];
  }
  return{
    label,
    initial,
    actions,
    start(s){frame(s)},
    summary(state,status){
      const s=state;
      if(status==='scheduled')return'Scheduled';
      if(status==='final')return s.line.length>s.innings_scheduled?`Final/${s.line.length}`:'Final';
      const outs=`${s.outs} out${s.outs===1?'':'s'}`;
      return`${s.half==='top'?'Top':'Bot'} ${ordinal(s.inning)} · ${outs}`;
    },
    score:s=>({away:s.runs.away,home:s.runs.home}),
  };
}

// Soccer (KSHSAA: two 40-minute halves; the clock counts up).
const SOCCER_PERIODS=['1st Half','2nd Half','OT 1','OT 2','PKs'];
const soccer={
  label:'Soccer',
  initial:()=>({half_minutes:40,ot_minutes:10,period:1,goals:{away:0,home:0},clock:{running:false,elapsed_ms:0,started_at:null},pks:{away:0,home:0}}),
  start(s,now){s.clock={running:true,elapsed_ms:0,started_at:now}},
  actions:{
    goal(s,a){if(!sideOk(a.side))return;if(s.period===5)s.pks[a.side]+=1;else s.goals[a.side]+=1},
    goal_minus(s,a){if(!sideOk(a.side))return;const bucket=s.period===5?s.pks:s.goals;bucket[a.side]=Math.max(0,bucket[a.side]-1)},
    clock_start(s,a,now){if(!s.clock.running)s.clock={running:true,elapsed_ms:s.clock.elapsed_ms,started_at:now}},
    clock_stop(s,a,now){if(s.clock.running)s.clock={running:false,elapsed_ms:s.clock.elapsed_ms+Math.max(0,now-s.clock.started_at),started_at:null}},
    clock_set(s,a,now){const ms=clampInt(a.seconds,0,200*60)*1000;s.clock={running:s.clock.running,elapsed_ms:ms,started_at:s.clock.running?now:null}},
    next_period(s){
      if(s.period>=5)return;
      s.period+=1;
      // The clock picks up where the period starts: 40:00 in the second half.
      const start=s.period===2?s.half_minutes*60:s.period===3?s.half_minutes*120:s.period===4?s.half_minutes*120+s.ot_minutes*60:0;
      s.clock={running:false,elapsed_ms:start*1000,started_at:null};
    },
  },
  summary(s,status){if(status==='scheduled')return'Scheduled';if(status==='final')return s.period>=5?'Final (PKs)':s.period>=3?'Final (OT)':'Final';return SOCCER_PERIODS[s.period-1]},
  score:s=>({away:s.goals.away,home:s.goals.home}),
};

export const SPORTS={
  Baseball:diamondSport({label:'Baseball',innings:7}),
  Softball:diamondSport({label:'Softball',innings:7}),
  Soccer:soccer,
};
export const SCORING_SPORTS=Object.keys(SPORTS);

export function initialState(sport){
  const def=SPORTS[sport];if(!def)throw new Error(`unsupported sport ${sport}`);
  return def.initial();
}

// Applies one scorer action. Returns {state,status} or throws for a bad action.
// Game-level actions (start, final, reopen) are shared by every sport.
export function applyAction(sport,state,status,action,now=Date.now()){
  const def=SPORTS[sport];if(!def)throw new Error(`unsupported sport ${sport}`);
  const type=String(action?.type||'');
  const s=structuredClone(state);
  if(type==='start'){if(status!=='scheduled')return{state:s,status};def.start?.(s,now);return{state:s,status:'live'}}
  if(type==='final'){if(s.clock?.running)SPORTS.Soccer.actions.clock_stop(s,{},now);return{state:s,status:'final'}}
  if(type==='reopen'){return{state:s,status:status==='final'?'live':status}}
  const fn=def.actions[type];
  if(!fn)throw new Error(`unknown action ${type}`);
  if(status!=='live')throw new Error('start the game first');
  fn(s,action,now);
  return{state:s,status};
}

export function gameSummary(sport,state,status){
  const def=SPORTS[sport];
  return{label:def.summary(state,status),score:def.score(state)};
}
