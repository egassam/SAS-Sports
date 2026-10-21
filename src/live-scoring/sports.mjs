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

// --- Every other school sport (user, October 21: "prepare all sports for live
// results"). Each one also describes its own display (view) and the scorer's
// buttons (controls), so the scorer app, the TV, the overlay and the public
// card draw any sport without sport-specific code.

const cleanText=(v,max)=>String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const other=side=>side==='home'?'away':'home';
// A clock that counts down from limit_ms (limit_ms null: counts up, or no
// clock when off).
const clockOf=(limitMs)=>({running:false,elapsed_ms:0,started_at:null,limit_ms:limitMs,off:limitMs==null});
const clockElapsed=(c,now)=>c.elapsed_ms+(c.running?Math.max(0,now-c.started_at):0);
function clockStop(s,now){if(s.clock?.running)s.clock={...s.clock,running:false,elapsed_ms:clockElapsed(s.clock,now),started_at:null}}
const clockActions={
  clock_start(s,a,now){if(s.clock&&!s.clock.off&&!s.clock.running)s.clock={...s.clock,running:true,started_at:now}},
  clock_stop(s,a,now){clockStop(s,now)},
  // The scorer types the time shown: time left on a countdown clock.
  clock_set(s,a,now){if(!s.clock||s.clock.off)return;const shown=clampInt(a.seconds,0,200*60)*1000;const ms=s.clock.limit_ms!=null?Math.max(0,s.clock.limit_ms-shown):shown;s.clock={...s.clock,elapsed_ms:ms,started_at:s.clock.running?now:null}},
};
const clockButtons=s=>s.clock&&!s.clock.off?[{label:s.clock.running?'Stop clock':'Start clock',action:s.clock.running?'clock_stop':'clock_start',style:s.clock.running?'b-out':'b-ball'},{label:'Set clock',action:'clock_set',prompt:'clock'}]:[];
const sideButtons=(names,label,action,extra={},style='b-run')=>['away','home'].map(side=>({label,sub:names[side],action,side,style,...extra}));

// Quarters with a countdown clock: football and basketball.
function quarterSport({label,periodMinutes,otMinutes,scoring,fouls,timeouts,downs}){
  const periodName=(s,p=s.period)=>p<=4?`Q${p}`:`OT${p-4>1?p-4:''}`;
  const line=(s)=>{while(s.line.length<s.period)s.line.push({away:0,home:0});return s.line[s.period-1]};
  const add=(s,side,n)=>{const f=line(s);const next=Math.max(0,f[side]+n);s.points[side]+=next-f[side];f[side]=next};
  return{
    label,kind:'clock',
    initial:()=>({period_minutes:periodMinutes,ot_minutes:otMinutes,period:1,clock:clockOf(periodMinutes*60000),line:[{away:0,home:0}],points:{away:0,home:0},possession:null,
      ...(fouls?{fouls:{away:0,home:0}}:{}),timeouts:{away:timeouts.perHalf??timeouts.perGame,home:timeouts.perHalf??timeouts.perGame},...(downs?{down:null,to_go:null,ball_on:''}:{})}),
    configure(s,b){if(Number(b.period_minutes)>=1){s.period_minutes=Math.min(20,Math.trunc(Number(b.period_minutes)));s.clock=clockOf(s.period_minutes*60000)}},
    start(s){line(s)},
    actions:{
      ...clockActions,
      score(s,a){if(!sideOk(a.side))return;const n=scoring.find(x=>x.key===a.kind)?.points;if(n)add(s,a.side,n)},
      points_minus(s,a){if(sideOk(a.side))add(s,a.side,-1)},
      possession(s,a){s.possession=sideOk(a.side)?a.side:null},
      timeout(s,a){if(sideOk(a.side))s.timeouts[a.side]=Math.max(0,s.timeouts[a.side]-1)},
      timeout_back(s,a){if(sideOk(a.side))s.timeouts[a.side]+=1},
      ...(fouls?{foul(s,a){if(sideOk(a.side))s.fouls[a.side]+=1},foul_minus(s,a){if(sideOk(a.side))s.fouls[a.side]=Math.max(0,s.fouls[a.side]-1)}}:{}),
      ...(downs?{
        set_down(s,a){s.down=a.down==null||a.down===''?null:clampInt(a.down,1,4);s.to_go=a.to_go==null||a.to_go===''?null:cleanText(a.to_go,6);s.ball_on=cleanText(a.ball_on,12)},
        next_down(s){s.down=s.down==null?1:Math.min(4,s.down+1)},
        first_down(s){s.down=1;s.to_go='10'},
      }:{}),
      next_period(s,a,now){
        clockStop(s,now);s.period+=1;line(s);
        // Kansas football overtime has no clock; basketball plays timed overtimes.
        s.clock=s.period<=4?clockOf(s.period_minutes*60000):otMinutes?clockOf(otMinutes*60000):clockOf(null);
        if(fouls)s.fouls={away:0,home:0};
        if(timeouts.perHalf&&s.period===3)s.timeouts={away:timeouts.perHalf,home:timeouts.perHalf};
        if(timeouts.perOt&&s.period>4)s.timeouts={away:timeouts.perOt,home:timeouts.perOt};
        if(downs){s.down=null;s.to_go=null;s.ball_on=''}
      },
    },
    summary(s,status){if(status==='scheduled')return'Scheduled';if(status==='final')return s.period>4?'Final/OT':'Final';return periodName(s)},
    score:s=>({away:s.points.away,home:s.points.home}),
    view(s,status,names){
      const chips=[];
      if(s.possession)chips.push(`${label==='Basketball'?'Arrow':'Ball'}: ${names[s.possession]}`);
      if(downs&&s.down)chips.push(`${ordinal(s.down)}${s.to_go?` & ${s.to_go}`:''}${s.ball_on?` · ${s.ball_on}`:''}`);
      if(fouls)for(const side of['away','home'])if(s.fouls[side]>=fouls.bonus)chips.push(`Bonus: ${names[other(side)]}`);
      return{kind:'clock',period:status==='live'?periodName(s):null,
        table:{columns:[...s.line.map((_,i)=>periodName(s,i+1)),'T'],away:[...s.line.map(f=>f.away),s.points.away],home:[...s.line.map(f=>f.home),s.points.home]},
        stats:[{label:'Timeouts left',away:s.timeouts.away,home:s.timeouts.home},...(fouls?[{label:'Team fouls',away:s.fouls.away,home:s.fouls.home}]:[])],
        possession:s.possession,chips};
    },
    controls(s,names){
      return[
        ...scoring.map(x=>({buttons:sideButtons(names,x.label,'score',{kind:x.key})})),
        {buttons:[...clockButtons(s),{label:s.period>=4?'Overtime →':'Next quarter →',action:'next_period',style:'b-neutral'}]},
        {buttons:[...sideButtons(names,label==='Basketball'?'Arrow':'Ball','possession',{},'b-neutral'),...(downs?[{label:'Next down',action:'next_down',style:'b-neutral'},{label:'1st & 10',action:'first_down',style:'b-neutral'},{label:'Set down',action:'set_down',style:'b-neutral',form:[{name:'down',label:'Down (1–4)',type:'number'},{name:'to_go',label:'To go',type:'text'},{name:'ball_on',label:'Ball on',type:'text'}]}]:[])]},
        {buttons:[...sideButtons(names,'Timeout','timeout',{},'b-neutral'),...(fouls?sideButtons(names,'Foul','foul',{},'b-neutral'):[])]},
        {fix:true,buttons:[...sideButtons(names,'Points −1','points_minus',{},'b-neutral'),...sideButtons(names,'Timeout back','timeout_back',{},'b-neutral'),...(fouls?sideButtons(names,'Foul −1','foul_minus',{},'b-neutral'):[])]},
      ];
    },
  };
}

// Volleyball: rally scoring, sets to 25 (win by two), the deciding set to
// its own target. A set ends by itself; the scorer ends the match.
const volleyball={
  label:'Volleyball',kind:'sets',
  initial:()=>({best_of:3,set_points:25,last_set_points:25,set:1,sets:[{away:0,home:0}],sets_won:{away:0,home:0},serving:null,timeouts:{away:0,home:0},decided:null}),
  configure(s,b){
    if([3,5].includes(Number(b.best_of)))s.best_of=Number(b.best_of);
    if(Number(b.set_points)>=5)s.set_points=Math.min(30,Math.trunc(Number(b.set_points)));
    s.last_set_points=Number(b.last_set_points)>=5?Math.min(30,Math.trunc(Number(b.last_set_points))):s.best_of===5?15:s.set_points;
  },
  actions:{
    point(s,a){
      if(!sideOk(a.side)||s.decided)return;
      const cur=s.sets[s.set-1];cur[a.side]+=1;s.serving=a.side;
      const target=s.set===s.best_of?s.last_set_points:s.set_points;
      if(cur[a.side]>=target&&cur[a.side]-cur[other(a.side)]>=2)volleyball.endSet(s,a.side);
    },
    point_minus(s,a){if(sideOk(a.side)){const cur=s.sets[s.set-1];cur[a.side]=Math.max(0,cur[a.side]-1)}},
    serve(s,a){s.serving=sideOk(a.side)?a.side:null},
    timeout(s,a){if(sideOk(a.side))s.timeouts[a.side]+=1},
    // A set the scorer closes by hand (a forfeit, a typo): the leader wins it.
    end_set(s){if(s.decided)return;const cur=s.sets[s.set-1];if(cur.away===cur.home)return;volleyball.endSet(s,cur.away>cur.home?'away':'home')},
  },
  endSet(s,winner){
    s.sets_won[winner]+=1;
    if(s.sets_won[winner]>s.best_of/2){s.decided=winner;return}
    s.set+=1;s.sets.push({away:0,home:0});s.timeouts={away:0,home:0};
  },
  summary(s,status){if(status==='scheduled')return'Scheduled';if(status==='final')return`Final · ${s.sets.filter(x=>x.away||x.home).map(x=>`${x.away}-${x.home}`).join(', ')}`;if(s.decided)return'Match decided';const c=s.sets[s.set-1];return`Set ${s.set} · ${c.away}-${c.home}`},
  score:s=>({away:s.sets_won.away,home:s.sets_won.home}),
  view(s,status,names){
    const played=s.sets.filter((x,i)=>x.away||x.home||i===s.set-1);
    return{kind:'sets',period:status==='live'&&!s.decided?`Set ${s.set}`:null,score_label:'Sets',
      current:status==='live'&&!s.decided?s.sets[s.set-1]:null,
      table:{columns:[...played.map((_,i)=>`Set ${i+1}`),'Sets'],away:[...played.map(x=>x.away),s.sets_won.away],home:[...played.map(x=>x.home),s.sets_won.home]},
      stats:[{label:'Timeouts this set',away:s.timeouts.away,home:s.timeouts.home}],
      possession:s.serving,possession_label:'Serving',chips:s.serving?[`Serving: ${names[s.serving]}`]:[]};
  },
  controls(s,names){
    return[
      {buttons:sideButtons(names,'Point','point',{},'b-run').map(b=>({...b,big:true}))},
      {buttons:[...sideButtons(names,'Serve','serve',{},'b-neutral'),...sideButtons(names,'Timeout','timeout',{},'b-neutral')]},
      {fix:true,buttons:[...sideButtons(names,'Point −1','point_minus',{},'b-neutral'),{label:'End this set now',action:'end_set',style:'b-neutral'}]},
    ];
  },
};

// Wrestling dual: each bout's result gives team points (NFHS: fall, forfeit,
// disqualification 6; technical fall 5; major decision 4; decision 3).
const BOUT_RESULTS={fall:['Fall',6],forfeit:['Forfeit',6],dq:['Disqualification',6],tech:['Tech fall',5],major:['Major decision',4],decision:['Decision',3]};
const wrestlingDual={
  label:'Wrestling',kind:'dual',
  initial:()=>({format:'dual',bouts:[],adjust:{away:0,home:0}}),
  actions:{
    bout(s,a){
      const r=BOUT_RESULTS[a.result];if(!sideOk(a.side)||!r)return;
      s.bouts.push({weight:cleanText(a.weight,8),side:a.side,result:a.result,points:r[1],winner:cleanText(a.winner,40),loser:cleanText(a.loser,40),detail:cleanText(a.detail,16)});
    },
    remove_bout(s,a){const i=clampInt(a.index,0,999);if(i<s.bouts.length)s.bouts.splice(i,1)},
    // A team point deduction (unsportsmanlike conduct): -1 for that team.
    deduct(s,a){if(sideOk(a.side))s.adjust[a.side]-=1},
    deduct_back(s,a){if(sideOk(a.side))s.adjust[a.side]=Math.min(0,s.adjust[a.side]+1)},
  },
  totals(s){const t={away:s.adjust.away,home:s.adjust.home};for(const b of s.bouts)t[b.side]+=b.points;return t},
  summary(s,status){if(status==='scheduled')return'Scheduled';if(status==='final')return'Final';const last=s.bouts.at(-1);return last?`After ${last.weight||`bout ${s.bouts.length}`}`:'Dual under way'},
  score:s=>wrestlingDual.totals(s),
  view(s,status,names){
    return{kind:'dual',log:s.bouts.map(b=>({label:b.weight,side:b.side,text:`${b.winner?`${b.winner} (${names[b.side]})`:names[b.side]}${b.loser?` over ${b.loser}`:''} · ${BOUT_RESULTS[b.result][0]}${b.detail?` ${b.detail}`:''}`,points:b.points})),
      chips:[s.adjust.away?`${names.away} ${s.adjust.away} team pt`:'',s.adjust.home?`${names.home} ${s.adjust.home} team pt`:''].filter(Boolean)};
  },
  controls(s,names){
    return[
      {buttons:[{label:'Add bout result',action:'bout',style:'b-run',big:true,form:[{name:'weight',label:'Weight',type:'text'},{name:'side',label:'Winner',type:'side'},{name:'winner',label:'Winner name',type:'text'},{name:'loser',label:'Loser name',type:'text'},{name:'result',label:'Result',type:'select',options:Object.entries(BOUT_RESULTS).map(([value,[label,points]])=>({value,label:`${label} (${points})`}))},{name:'detail',label:'Score or time (8-3, 1:24)',type:'text'}]}]},
      {fix:true,buttons:[...(s.bouts.length?[{label:`Remove last bout (${s.bouts.at(-1).weight||s.bouts.length})`,action:'remove_bout',index:s.bouts.length-1,style:'b-neutral'}]:[]),...sideButtons(names,'Team point −1','deduct',{},'b-neutral'),...sideButtons(names,'Team point back','deduct_back',{},'b-neutral')]},
    ];
  },
};

// Tennis dual: each flight's winner and score; the team with more wins wins.
const tennisDual={
  label:'Tennis',kind:'dual',
  initial:()=>({format:'dual',matches:[]}),
  actions:{
    match(s,a){if(!sideOk(a.side))return;s.matches.push({label:cleanText(a.label,24),side:a.side,score:cleanText(a.score,32),winner:cleanText(a.winner,60)})},
    remove_match(s,a){const i=clampInt(a.index,0,999);if(i<s.matches.length)s.matches.splice(i,1)},
  },
  summary(s,status){if(status==='scheduled')return'Scheduled';if(status==='final')return'Final';return`${s.matches.length} match${s.matches.length===1?'':'es'} done`},
  score(s){const t={away:0,home:0};for(const m of s.matches)t[m.side]+=1;return t},
  view(s,status,names){return{kind:'dual',log:s.matches.map(m=>({label:m.label,side:m.side,text:`${m.winner?`${m.winner} (${names[m.side]})`:names[m.side]}${m.score?` · ${m.score}`:''}`,points:1})),chips:[]}},
  controls(s){
    return[
      {buttons:[{label:'Add match result',action:'match',style:'b-run',big:true,form:[{name:'label',label:'Flight (#1 Singles)',type:'text'},{name:'side',label:'Winner',type:'side'},{name:'winner',label:'Winner names',type:'text'},{name:'score',label:'Score (6-3, 6-4)',type:'text'}]}]},
      {fix:true,buttons:s.matches.length?[{label:`Remove last match (${s.matches.at(-1).label||s.matches.length})`,action:'remove_match',index:s.matches.length-1,style:'b-neutral'}]:[]},
    ];
  },
};

// Meets and tournaments (cross country, track, golf, swimming, bowling, and
// wrestling or tennis tournaments): team standings by points, strokes or pins
// (low wins for cross country and golf) and individual results as they post.
// The game's opponent field holds the meet's name.
function meetSport({label,lowWins,valueLabel,eventLabel='Event',markLabel='Mark'}){
  const ranked=s=>{
    const scored=s.teams.filter(t=>t.value!=null).slice().sort((a,b)=>lowWins?a.value-b.value:b.value-a.value);
    let place=0,prev=null;
    return[...scored.map((t,i)=>{if(t.value!==prev){place=i+1;prev=t.value}return{...t,place}}),...s.teams.filter(t=>t.value==null).map(t=>({...t,place:null}))];
  };
  return{
    label,kind:'meet',
    initial:()=>({format:'meet',low_wins:lowWins,value_label:valueLabel,teams:[],results:[],round:''}),
    actions:{
      team(s,a){
        const name=cleanText(a.name,40);if(!name)return;
        const raw=String(a.value??'').trim(),value=raw===''?null:Number(raw);
        if(value!=null&&!Number.isFinite(value))return;
        const t=s.teams.find(x=>x.name.toLowerCase()===name.toLowerCase());
        if(t)t.value=value;else if(s.teams.length<60)s.teams.push({name,value});
      },
      team_remove(s,a){const name=cleanText(a.name,40).toLowerCase();s.teams=s.teams.filter(t=>t.name.toLowerCase()!==name)},
      result(s,a){
        const name=cleanText(a.name,60);if(!name)return;
        s.results.push({event:cleanText(a.event,40),name,team:cleanText(a.team,40),mark:cleanText(a.mark,24),place:a.place==null||a.place===''?null:clampInt(a.place,1,999)});
        if(s.results.length>200)s.results.shift();
      },
      remove_result(s,a){const i=clampInt(a.index,0,999);if(i<s.results.length)s.results.splice(i,1)},
      round(s,a){s.round=cleanText(a.text,40)},
    },
    ranked,
    // The school's own line: "2nd of 11 · 65 pts".
    schoolLine(s,schoolName){const all=ranked(s),me=all.find(t=>t.name.toLowerCase()===String(schoolName).toLowerCase());if(!me||me.place==null)return null;return`${ordinal(me.place)} of ${all.filter(t=>t.place!=null).length} · ${me.value} ${valueLabel.toLowerCase()}`},
    summary(s,status,names){if(status==='scheduled')return'Scheduled';const line=names?this.schoolLine(s,names.school):null;return`${status==='final'?'Final':s.round||'Under way'}${line?` · ${line}`:''}`},
    score:()=>({away:null,home:null}),
    view(s,status,names){
      return{kind:'meet',value_label:valueLabel,low_wins:lowWins,round:s.round||null,
        standings:ranked(s).map(t=>({place:t.place,name:t.name,value:t.value,is_school:t.name.toLowerCase()===String(names.school).toLowerCase()})),
        results:s.results.map((r,i)=>({...r,index:i})).slice(-40).reverse(),school_line:this.schoolLine(s,names.school)};
    },
    controls(s,names){
      return[
        {buttons:[
          {label:`Team ${valueLabel.toLowerCase()}`,action:'team',style:'b-run',big:true,form:[{name:'name',label:'Team',type:'text',value:names.school},{name:'value',label:`${valueLabel}${lowWins?' (low wins)':''}`,type:'number'}]},
          {label:'Add result',action:'result',style:'b-ball',big:true,form:[{name:'event',label:eventLabel,type:'text'},{name:'name',label:'Athlete',type:'text'},{name:'team',label:'Team',type:'text',value:names.school},{name:'mark',label:markLabel,type:'text'},{name:'place',label:'Place',type:'number'}]},
        ]},
        {buttons:[{label:'Round or status',action:'round',style:'b-neutral',form:[{name:'text',label:'Shown under the meet name (Round 1, Varsity boys running)',type:'text'}]}]},
        {fix:true,buttons:[
          ...(s.results.length?[{label:`Remove last result (${s.results.at(-1).name})`,action:'remove_result',index:s.results.length-1,style:'b-neutral'}]:[]),
          {label:'Remove a team',action:'team_remove',style:'b-neutral',form:[{name:'name',label:'Team',type:'text'}]},
        ]},
      ];
    },
  };
}

// A sport played as a dual or as a tournament, chosen when the game is made.
function formatSport(dual,meet){
  const pick=s=>s?.format==='meet'?meet:dual;
  return{
    label:dual.label,formats:['dual','meet'],
    initial:()=>dual.initial(),
    configure(s,b){if(b.format==='meet'){for(const k of Object.keys(s))delete s[k];Object.assign(s,meet.initial())}},
    kindOf:s=>pick(s).kind,
    get actions(){return null},
    actionFor:(s,type)=>pick(s).actions[type],
    summary:(s,status,names)=>pick(s).summary(s,status,names),
    score:s=>pick(s).score(s),
    view:(s,status,names)=>pick(s).view(s,status,names),
    controls:(s,names)=>pick(s).controls(s,names),
  };
}

export const SPORTS={
  Baseball:diamondSport({label:'Baseball',innings:7}),
  Softball:diamondSport({label:'Softball',innings:7}),
  Soccer:soccer,
  // KSHSAA: 12-minute quarters (middle school sets its own length when the
  // game is made); overtime is untimed.
  Football:quarterSport({label:'Football',periodMinutes:12,otMinutes:0,downs:true,timeouts:{perHalf:3,perOt:1},
    scoring:[{key:'td',label:'Touchdown +6',points:6},{key:'pat',label:'PAT kick +1',points:1},{key:'two',label:'2-pt try +2',points:2},{key:'fg',label:'Field goal +3',points:3},{key:'safety',label:'Safety +2',points:2}]}),
  // NFHS: 8-minute quarters (6 in middle school), 4-minute overtimes; team
  // fouls reset each quarter, the bonus from the fifth.
  Basketball:quarterSport({label:'Basketball',periodMinutes:8,otMinutes:4,fouls:{bonus:5},timeouts:{perGame:5},
    scoring:[{key:'one',label:'Free throw +1',points:1},{key:'two',label:'Field goal +2',points:2},{key:'three',label:'Three +3',points:3}]}),
  Volleyball:volleyball,
  Wrestling:formatSport(wrestlingDual,meetSport({label:'Wrestling',lowWins:false,valueLabel:'Points',eventLabel:'Weight',markLabel:'Result'})),
  Tennis:formatSport(tennisDual,meetSport({label:'Tennis',lowWins:false,valueLabel:'Points',eventLabel:'Flight',markLabel:'Score'})),
  'Cross Country':meetSport({label:'Cross Country',lowWins:true,valueLabel:'Points',eventLabel:'Race',markLabel:'Time'}),
  'Track & Field':meetSport({label:'Track & Field',lowWins:false,valueLabel:'Points',eventLabel:'Event',markLabel:'Mark'}),
  Golf:meetSport({label:'Golf',lowWins:true,valueLabel:'Strokes',eventLabel:'Round',markLabel:'Score'}),
  'Swimming & Diving':meetSport({label:'Swimming & Diving',lowWins:false,valueLabel:'Points',eventLabel:'Event',markLabel:'Time'}),
  Bowling:meetSport({label:'Bowling',lowWins:false,valueLabel:'Pins',eventLabel:'Game',markLabel:'Score'}),
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
  if(type==='final'){clockStop(s,now);return{state:s,status:'final'}}
  if(type==='reopen'){return{state:s,status:status==='final'?'live':status}}
  const fn=def.actionFor?def.actionFor(s,type):def.actions[type];
  if(!fn)throw new Error(`unknown action ${type}`);
  if(status!=='live')throw new Error('start the game first');
  fn(s,action,now);
  return{state:s,status};
}

// names: {away, home, school} (the school's own name, for meets).
export function gameSummary(sport,state,status,names={}){
  const def=SPORTS[sport];
  return{label:def.summary(state,status,names),score:def.score(state)};
}

// The sport's display and the scorer's buttons (null for baseball, softball
// and soccer, which the screens draw themselves).
export function gameView(sport,state,status,names){
  const def=SPORTS[sport];
  if(!def?.view)return{view:null,controls:null};
  return{view:def.view(state,status,names),controls:status==='live'?def.controls(state,names):null};
}

// What the game form asks for each sport: the length field and formats.
export const SPORT_OPTIONS=Object.fromEntries(Object.entries(SPORTS).map(([name,def])=>[name,{
  kind:def.kindOf?'dual':def.kind||(name==='Soccer'?'soccer':'diamond'),
  formats:def.formats||null,
  length:name==='Soccer'?{field:'half_minutes',label:'Minutes per half',value:40}
    :name==='Baseball'||name==='Softball'?{field:'innings',label:'Innings',value:7}
    :def.kind==='clock'?{field:'period_minutes',label:'Minutes per quarter',value:def.initial().period_minutes}
    :name==='Volleyball'?{field:'best_of',label:'Best of (3 or 5 sets)',value:3}:null,
}]));
