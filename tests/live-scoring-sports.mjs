// Live scoring for every school sport (user, October 21: "prepare all sports
// for live results"): football, basketball, volleyball, wrestling and tennis
// duals, and meets (cross country, track, golf, swimming, bowling, and
// wrestling or tennis tournaments). Each sport's rules, its display (view)
// and the scorer's buttons (controls).
import assert from 'node:assert/strict';
import {SPORTS,SPORT_OPTIONS,initialState,applyAction,gameSummary,gameView} from '../src/live-scoring/sports.mjs';

const names={away:'Junction City',home:'Manhattan',school:'Manhattan'};
function play(sport,steps,{configure={},t0=1_000_000}={}){
  let state=initialState(sport),status='scheduled',now=t0;
  SPORTS[sport].configure?.(state,configure);
  for(const step of [{type:'start'},...steps]){
    if(step.wait){now+=step.wait;continue}
    ({state,status}=applyAction(sport,state,status,step,now));
  }
  return{state,status,now,...gameSummary(sport,state,status,names),...gameView(sport,state,status,names)};
}
const buttons=controls=>controls.flatMap(row=>row.buttons);

// Football: scoring plays by quarter, a countdown clock, downs, possession,
// timeouts back at the half, untimed overtime.
{
  const g=play('Football',[
    {type:'score',side:'home',kind:'td'},{type:'score',side:'home',kind:'pat'},
    {type:'clock_start'},{wait:90_000},{type:'clock_stop'},
    {type:'possession',side:'away'},{type:'first_down'},{type:'next_down'},{type:'set_down',down:3,to_go:'4',ball_on:'MHS 35'},
    {type:'timeout',side:'away'},
    {type:'next_period'},{type:'score',side:'away',kind:'fg'},{type:'next_period'},{type:'timeout',side:'home'},
    {type:'score',side:'home',kind:'safety'},
  ]);
  assert.deepEqual(g.score,{away:3,home:9});
  assert.equal(g.label,'Q3');
  assert.deepEqual(g.view.table,{columns:['Q1','Q2','Q3','T'],away:[0,3,0,3],home:[7,0,2,9]});
  assert.deepEqual(g.view.stats[0],{label:'Timeouts left',away:3,home:2},'timeouts reset at the half, then one used');
  assert.equal(g.state.clock.limit_ms,12*60_000,'a new quarter starts a full 12-minute clock');
  assert.equal(g.state.down,null,'a new quarter clears the down');
  const q1=play('Football',[{type:'clock_start'},{wait:90_000},{type:'clock_stop'},{type:'possession',side:'away'},{type:'set_down',down:3,to_go:'4',ball_on:'MHS 35'}]);
  assert.equal(q1.state.clock.elapsed_ms,90_000);
  assert.deepEqual(q1.view.chips,['Ball: Junction City','3rd & 4 · MHS 35']);
  // The scorer types the time shown on a countdown clock.
  const set=play('Football',[{type:'clock_set',seconds:5*60+30}]);
  assert.equal(set.state.clock.elapsed_ms,(12*60-330)*1000);
  // Four quarters, then overtime with no clock; the final says so.
  const ot=play('Football',[{type:'next_period'},{type:'next_period'},{type:'next_period'},{type:'next_period'},{type:'final'}]);
  assert.equal(ot.state.clock.off,true);assert.equal(ot.label,'Final/OT');assert.equal(ot.controls,null,'no buttons once final');
  // Middle school sets its own quarter length.
  assert.equal(play('Football',[],{configure:{period_minutes:8}}).state.clock.limit_ms,8*60_000);
  assert.ok(buttons(q1.controls).some(b=>b.action==='score'&&b.kind==='td'&&b.side==='home'));
  assert.throws(()=>applyAction('Football',initialState('Football'),'scheduled',{type:'score',side:'home',kind:'td'}),/start the game first/);
}

// Basketball: 1, 2 and 3 points, team fouls per quarter and the bonus.
{
  const g=play('Basketball',[
    {type:'score',side:'away',kind:'three'},{type:'score',side:'home',kind:'two'},{type:'score',side:'home',kind:'one'},
    ...Array(5).fill({type:'foul',side:'away'}),{type:'possession',side:'home'},
  ]);
  assert.deepEqual(g.score,{away:3,home:3});assert.equal(g.label,'Q1');
  assert.deepEqual(g.view.chips,['Arrow: Manhattan','Bonus: Manhattan']);
  assert.equal(g.state.clock.limit_ms,8*60_000);
  const q2=play('Basketball',[...Array(5).fill({type:'foul',side:'away'}),{type:'next_period'}]);
  assert.deepEqual(q2.state.fouls,{away:0,home:0},'team fouls reset each quarter');
  const ot=play('Basketball',[{type:'next_period'},{type:'next_period'},{type:'next_period'},{type:'next_period'}]);
  assert.equal(ot.label,'OT');assert.equal(ot.state.clock.limit_ms,4*60_000,'a 4-minute overtime');
  assert.equal(play('Basketball',[],{configure:{period_minutes:6}}).state.clock.limit_ms,6*60_000);
}

// Volleyball: a set ends at 25 by two, the match at two sets; the scorer posts the final.
{
  const points=(side,n)=>Array(n).fill({type:'point',side});
  const g=play('Volleyball',[...points('home',24),...points('away',24),...points('home',2),...points('away',10)]);
  assert.deepEqual(g.state.sets,[{away:24,home:26},{away:10,home:0}]);
  assert.equal(g.label,'Set 2 · 10-0');assert.deepEqual(g.score,{away:0,home:1});assert.equal(g.state.serving,'away');
  const won=play('Volleyball',[...points('home',25),...points('home',25),{type:'final'}]);
  assert.equal(won.state.decided,'home');assert.equal(won.label,'Final · 0-25, 0-25');assert.deepEqual(won.score,{away:0,home:2});
  // A best-of-five plays its fifth set to 15.
  const five=play('Volleyball',[...points('home',25),...points('away',25),...points('home',25),...points('away',25),...points('home',15)],{configure:{best_of:5}});
  assert.equal(five.state.decided,'home');assert.deepEqual(five.score,{away:2,home:3});
  // Points after the match is decided are ignored.
  assert.deepEqual(play('Volleyball',[...points('home',50),...points('away',3)]).state.sets.at(-1),{away:0,home:25});
}

// Wrestling dual: team points by result; a deduction; tournaments are meets.
{
  const g=play('Wrestling',[
    {type:'bout',weight:'106',side:'home',winner:'A. Smith',loser:'B. Jones',result:'fall',detail:'1:24'},
    {type:'bout',weight:'113',side:'away',result:'major',detail:'12-3'},
    {type:'bout',weight:'120',side:'home',result:'decision',detail:'5-2'},
    {type:'deduct',side:'home'},
  ]);
  assert.deepEqual(g.score,{away:4,home:8});assert.equal(g.label,'After 120');
  assert.equal(g.view.log[0].text,'A. Smith (Manhattan) over B. Jones · Fall 1:24');
  assert.deepEqual(g.view.chips,['Manhattan -1 team pt']);
  const fixed=play('Wrestling',[{type:'bout',weight:'106',side:'home',result:'fall'},{type:'remove_bout',index:0}]);
  assert.deepEqual(fixed.score,{away:0,home:0});
  assert.deepEqual(play('Wrestling',[{type:'bout',weight:'106',side:'home',result:'pin'}]).score,{away:0,home:0},'unknown results are refused');
  const tournament=play('Wrestling',[{type:'team',name:'Manhattan',value:'142.5'},{type:'team',name:'Maize',value:'160'}],{configure:{format:'meet'}});
  assert.equal(tournament.view.kind,'meet');assert.equal(tournament.view.school_line,'2nd of 2 · 142.5 points');
}

// Tennis dual: one point per flight won; tournaments are meets.
{
  const g=play('Tennis',[{type:'match',label:'#1 Singles',side:'home',winner:'C. Lee',score:'6-3, 6-4'},{type:'match',label:'#1 Doubles',side:'away',score:'8-6'}]);
  assert.deepEqual(g.score,{away:1,home:1});assert.equal(g.view.log[0].text,'C. Lee (Manhattan) · 6-3, 6-4');
  assert.equal(play('Tennis',[],{configure:{format:'meet'}}).view.kind,'meet');
}

// Meets: standings rank low-wins for cross country and golf, high-wins for
// track, swimming and bowling; ties share a place; results post newest first.
{
  const xc=play('Cross Country',[
    {type:'team',name:'Manhattan',value:'65'},{type:'team',name:'Emporia',value:'40'},{type:'team',name:'Hayden',value:'65'},{type:'team',name:'Topeka',value:''},
    {type:'result',event:'Varsity Boys 5K',name:'Jaxon Wheeler',team:'Manhattan',mark:'17:06.1',place:'3'},
    {type:'round',text:'Varsity girls running'},
  ]);
  assert.deepEqual(xc.view.standings.map(t=>[t.place,t.name,t.value]),[[1,'Emporia',40],[2,'Manhattan',65],[2,'Hayden',65],[null,'Topeka',null]]);
  assert.equal(xc.label,'Varsity girls running · 2nd of 3 · 65 points');
  assert.deepEqual(xc.view.results[0],{event:'Varsity Boys 5K',name:'Jaxon Wheeler',team:'Manhattan',mark:'17:06.1',place:3,index:0});
  assert.deepEqual(xc.score,{away:null,home:null});
  // A team posted again is updated, not added twice.
  const again=play('Golf',[{type:'team',name:'Manhattan',value:'350'},{type:'team',name:'manhattan',value:'343'},{type:'team',name:'Garden City',value:'320'}]);
  assert.deepEqual(again.view.standings.map(t=>[t.place,t.name,t.value]),[[1,'Garden City',320],[2,'Manhattan',343]]);
  assert.equal(again.view.value_label,'Strokes');
  const track=play('Track & Field',[{type:'team',name:'Manhattan',value:'125.5'},{type:'team',name:'Free State',value:'98'},{type:'final'}]);
  assert.equal(track.label,'Final · 1st of 2 · 125.5 points');
  assert.deepEqual(play('Bowling',[{type:'team',name:'Manhattan',value:'abc'}]).state.teams,[],'a value must be a number');
  const removed=play('Swimming & Diving',[{type:'result',name:'A',event:'50 Free'},{type:'result',name:'B'},{type:'remove_result',index:0},{type:'team',name:'X',value:'1'},{type:'team_remove',name:'x'}]);
  assert.deepEqual(removed.state.results.map(r=>r.name),['B']);assert.deepEqual(removed.state.teams,[]);
}

// The game form's options for every sport.
assert.deepEqual(Object.keys(SPORT_OPTIONS),['Baseball','Softball','Soccer','Football','Basketball','Volleyball','Wrestling','Tennis','Cross Country','Track & Field','Golf','Swimming & Diving','Bowling']);
assert.deepEqual(SPORT_OPTIONS.Football.length,{field:'period_minutes',label:'Minutes per quarter',value:12});
assert.deepEqual(SPORT_OPTIONS.Wrestling.formats,['dual','meet']);
assert.equal(SPORT_OPTIONS.Golf.kind,'meet');
// Baseball, softball and soccer keep their own screens (no generic view).
for(const sport of ['Baseball','Softball','Soccer'])assert.deepEqual(gameView(sport,initialState(sport),'live',names),{view:null,controls:null});
// Every generic sport gives the scorer buttons while live, and every button
// names an action the sport knows.
for(const sport of Object.keys(SPORTS).filter(s=>!['Baseball','Softball','Soccer'].includes(s))){
  for(const format of SPORTS[sport].formats||[null]){
    const state=initialState(sport);SPORTS[sport].configure?.(state,{format});
    const {controls}=gameView(sport,state,'live',names);
    assert.ok(buttons(controls).length>=1,`${sport} ${format||""} buttons`);
    for(const b of buttons(controls)){
      const {state:after}=applyAction(sport,state,'live',{type:b.action,...(b.side?{side:b.side}:{}),...(b.kind?{kind:b.kind}:{}),...(b.index!=null?{index:b.index}:{})},1);
      assert.ok(after,`${sport} ${b.action}`);
    }
  }
}
console.log('Live scoring sports passed: football, basketball, volleyball, wrestling and tennis duals, meets (cross country, track, golf, swimming, bowling, tournaments)');
