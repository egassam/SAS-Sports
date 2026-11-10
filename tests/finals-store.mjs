// Stored finals (user, November 4, 2026: "Once we have results from anywhere
// shouldn't we just be saving them in a database? Results do not change.").
// The merge rules (src/finals-store.mjs), then the Worker's D1 reads and
// writes against an in-memory stand-in for the four statements it runs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {isStoredFinal,finalSig,finalKeys,sameFinal,exactFinal,mergeFinals,retractedFinal,RETRACTED_FINALS} from '../src/finals-store.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const game=(date,opponent,extra={})=>({id:`g-${date}-${opponent}`,event_type:'GAME',status:'Final',start_time:`${date}T19:00:00.000Z`,opponent,title:`Wamego vs ${opponent}`,...extra});
const scored=(date,opponent,us,them,extra={})=>game(date,opponent,{school_score:String(us),opponent_score:String(them),headline:`${us>them?'W':'L'}, ${us}-${them}`,...extra});
const unscored=(date,opponent,extra={})=>game(date,opponent,{no_result_posted:true,headline:'No score posted',...extra});
const meet=(date,name,rows,extra={})=>({id:`m-${date}`,event_type:'MEET',status:'Final',start_time:`${date}T12:00:00.000Z`,opponent:name,headline:'Girls 4th of 6',results:rows,...extra});

// What counts as a final.
assert.ok(isStoredFinal(scored('2026-09-04','Abilene',35,14)));
assert.ok(isStoredFinal(meet('2026-09-10','Fort Riley Invite',[{group:'Girls',participant:'A',result:'1st'}])));
assert.ok(!isStoredFinal(unscored('2026-09-04','Abilene')),'"No score posted" is not a final');
assert.ok(!isStoredFinal({...scored('2026-11-04','Abilene',7,3),status:'Live'}),'a live game is not');
assert.ok(!isStoredFinal(meet('2026-09-10','Invite',[])),'a meet with no results is not');
assert.ok(!isStoredFinal({...meet('2026-09-10','Invite',[{group:'Girls'}]),meet_live:true}),'a live meet is not');
// Keys: a doubleheader's second game is its own row.
assert.deepEqual(finalKeys([scored('2026-04-10','Clay Center',3,1),scored('2026-04-10','Clay Center',2,5),{...scored('2026-04-10','Clay Center',1,0),team_label:'Girls'}]),['2026-04-10||clay center','2026-04-10||clay center#2','2026-04-10|Girls|clay center']);
// One game: same day and team, compatible opponents; a meet: same day and team.
assert.ok(sameFinal(scored('2026-09-04','Topeka',1,0),unscored('2026-09-04','Topeka High')));
assert.ok(exactFinal(scored('2026-09-04','Topeka',1,0),unscored('2026-09-04','topeka'))&&!exactFinal(scored('2026-09-04','Topeka',1,0),unscored('2026-09-04','Topeka West')));
assert.ok(!sameFinal(scored('2026-09-04','Topeka',1,0),unscored('2026-09-05','Topeka')));
assert.ok(sameFinal(meet('2026-10-03','Blue Jay Invitational',[{}]),meet('2026-10-03','Bob Schmoekel Invitational',[{}])));

// The merge.
{
  const now='2026-11-04T22:00:00.000Z';
  // First build: every final is written.
  const first=mergeFinals([scored('2026-09-04','Abilene',35,14),unscored('2026-09-11','Clay Center'),{...game('2026-11-06','Marysville'),status:'Upcoming'}],[],{now});
  assert.deepEqual(first.writes.map(w=>[w.op,w.key]),[['insert','2026-09-04||abilene']]);
  assert.equal(first.events.length,3);
  const stored=first.writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
  // A refused MaxPreps read: the game reads "No score posted"; the stored final takes its place, nothing written.
  const refused=mergeFinals([unscored('2026-09-04','Abilene'),{...game('2026-11-06','Marysville'),status:'Upcoming'}],stored,{now});
  assert.deepEqual(refused.writes,[]);
  assert.deepEqual(refused.events.map(e=>[e.opponent,e.headline,!!e.stored_final]),[['Abilene','W, 35-14',true],['Marysville',undefined,false]]);
  // The source no longer lists it at all: it is listed again.
  const dropped=mergeFinals([{...game('2026-11-06','Marysville'),status:'Upcoming'}],stored,{now});
  assert.deepEqual(dropped.events.map(e=>[e.opponent,e.headline]),[['Marysville',undefined],['Abilene','W, 35-14']]);
  // The same final again: nothing written.
  assert.deepEqual(mergeFinals([scored('2026-09-04','Abilene',35,14)],stored,{now}).writes,[]);
  // An official correction (35-14 → 35-17): updated, the old reading kept in history; the corrected one shown.
  const fixed=mergeFinals([scored('2026-09-04','Abilene',35,17)],stored,{now});
  assert.deepEqual(fixed.writes.map(w=>[w.op,w.key,w.event.headline,w.history.length,w.history[0].event.headline]),[['update','2026-09-04||abilene','W, 35-17',1,'W, 35-14']]);
  assert.equal(fixed.events[0].headline,'W, 35-17');
  // A game today, still going, is left as the build has it.
  const today=mergeFinals([{...game('2026-09-04','Abilene'),status:'Live',school_score:'7',opponent_score:'3'}],stored,{now});
  assert.equal(today.events[0].status,'Live');
  // Doubleheader: game 1 scored now, game 2 refused → game 2 takes its own stored row.
  const dh=[scored('2026-04-10','Clay Center',3,1),scored('2026-04-10','Clay Center',2,5)];
  const dhRows=mergeFinals(dh,[],{now}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
  const dhNext=mergeFinals([scored('2026-04-10','Clay Center',3,1),unscored('2026-04-10','Clay Center')],dhRows,{now});
  assert.deepEqual(dhNext.events.map(e=>e.headline),['W, 3-1','L, 2-5']);
  assert.deepEqual(dhNext.writes,[]);
  // An extra stored row for a game the build has once (November 10: Linn,
  // Emporia, Baldwin): not listed again. Two MaxPreps match pages are two
  // games: game 2 is listed again when the build drops it.
  {
    const mp=c=>`https://www.maxpreps.com/ks/volleyball/match/linn-vs-x/10-30-2026/?c=${c}`;
    const twice=[scored('2026-10-30','Tipton',2,0,{recap_url:mp('6742b950')}),scored('2026-10-30','Tipton',2,0,{recap_url:mp('6742b950')})];
    const twiceRows=mergeFinals(twice,[],{now}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
    assert.equal(twiceRows.length,2,'the old build stored the game twice');
    assert.deepEqual(mergeFinals([twice[0]],twiceRows,{now}).events.map(e=>e.headline),['W, 2-0'],'listed once');
    const bound=scored('2026-09-16','Osage City',14,0,{recap_url:'https://beta.gobound.com/ks/schools/baldwinhs/calendar'});
    const rows=mergeFinals([scored('2026-09-16','Osage City',30,12),bound],[],{now}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
    assert.deepEqual(mergeFinals([scored('2026-09-16','Osage City',30,12)],rows,{now}).events.map(e=>e.headline),['W, 30-12'],'Bound\'s second reading of MaxPreps\' one game');
    const dh2=[scored('2026-10-10','Sabetha',2,0,{recap_url:mp('aaa1')}),scored('2026-10-10','Sabetha',0,2,{recap_url:mp('bbb2')})];
    const dh2Rows=mergeFinals(dh2,[],{now}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
    assert.deepEqual(mergeFinals([dh2[0]],dh2Rows,{now}).events.map(e=>e.headline),['W, 2-0','L, 0-2'],'a doubleheader\'s dropped game 2 is listed again');
    assert.deepEqual(mergeFinals([],dh2Rows,{now}).events.length,2,'nothing built: both listed again');
  }
  // A triangular: Topeka and Topeka West the same day never trade scores
  // (loose names match "Topeka" to both), refused or not.
  {
    const {namesCompatible}=await import('../src/high-school.mjs');
    const tri=[scored('2026-09-15','Topeka West',2,1),scored('2026-09-15','Topeka',0,2)];
    const triRows=mergeFinals(tri,[],{now,compatible:namesCompatible}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
    const triRefused=mergeFinals([unscored('2026-09-15','Topeka West'),unscored('2026-09-15','Topeka')],triRows,{now,compatible:namesCompatible});
    assert.deepEqual(triRefused.events.map(e=>`${e.opponent} ${e.headline}`),['Topeka West W, 2-1','Topeka L, 0-2']);
    const triAgain=mergeFinals([scored('2026-09-15','Topeka',0,2),scored('2026-09-15','Topeka West',2,1)],triRows,{now,compatible:namesCompatible});
    assert.deepEqual(triAgain.writes,[],'listed in the other order: still the same two finals');
  }
  // Never a downgrade: a verified meet result stays over a build whose
  // results step failed (TFRRS refusals, November 4).
  {
    const rich=meet('2026-09-04','Aggie Opener',[{group:'Women',participant:'Houston team',result:'2nd · 42 pts'},{group:'Women',participant:'A',result:'5th · 17:01'}],{headline:"Women's team: 2nd · 42 pts",meet_results_verified:true});
    const richRows=mergeFinals([rich],[],{now}).writes.map(w=>({key:w.key,event:JSON.stringify(w.event),sig:w.sig,history:'[]'}));
    const partial=meet('2026-09-04','Aggie Opener',[{group:'Women',participant:'Houston team',result:'2nd'}],{headline:"Women's team: 2nd",meet_results_verified:false,highlight_state:'official_results_partial'});
    const kept=mergeFinals([partial],richRows,{now});
    assert.deepEqual([kept.writes.length,kept.events[0].headline,kept.events[0].stored_final],[0,"Women's team: 2nd · 42 pts",true]);
    // A verified build that differs is a correction (a timer's re-posted results).
    const reposted=mergeFinals([{...rich,results:[...rich.results,{group:'Women',participant:'B',result:'9th · 17:40'}]}],richRows,{now});
    assert.deepEqual(reposted.writes.map(w=>w.op),['update']);
  }
  // A meet's results rows are part of what it says.
  assert.notEqual(finalSig(meet('2026-09-10','X',[{group:'Girls',participant:'A',result:'1st of 50 · 20:00'}])),finalSig(meet('2026-09-10','X',[{group:'Girls',participant:'A',result:'2nd of 50 · 20:00'}])));
}

// The Worker: D1 stand-in with the statements withStoredFinals runs.
function fakeD1(){
  const rows=new Map(),log=[];
  const k=(scope,school,sport,key)=>[scope,school,sport,key].join('\u0000');
  const run=(sql,args)=>{
    log.push(sql.split(/\s+/)[0]);
    if(/^CREATE/.test(sql))return{results:[]};
    if(/^SELECT/.test(sql)){const [scope,school,sport,start,end]=args;return{results:[...rows.values()].filter(r=>r.scope===scope&&r.school===school&&r.sport===sport&&r.date>=start&&r.date<=end).map(r=>({key:r.event_key,event:r.event,sig:r.sig,history:r.history}))};}
    if(/^INSERT/.test(sql)){const [scope,school,sport,event_key,date,event,sig,source,first_seen,last_changed,history]=args;const id=k(scope,school,sport,event_key);if(!rows.has(id))rows.set(id,{scope,school,sport,event_key,date,event,sig,source,first_seen,last_changed,history});return{results:[]};}
    if(/^UPDATE/.test(sql)){const [date,event,sig,source,last_changed,history,scope,school,sport,event_key]=args;const r=rows.get(k(scope,school,sport,event_key));if(r)Object.assign(r,{date,event,sig,source,last_changed,history});return{results:[]};}
    throw Error(`unexpected ${sql}`);
  };
  const prepare=sql=>{const st={sql,args:[],bind:(...a)=>({...st,args:a,all:async()=>run(sql,a),run:async()=>run(sql,a)}),all:async()=>run(sql,[]),run:async()=>run(sql,[])};return st;};
  return{rows,log,prepare,batch:async list=>list.map(s=>run(s.sql,s.args))};
}
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const fetch=async url=>({ok:false,status:404,url:String(url),headers:new Headers(),text:async()=>'',json:async()=>({})});
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {withStoredFinals,setScope:url=>{requestCatalog={env:null,url:new URL(url)}},PRODUCTION_HOST}')(...Object.values(deps));
{
  const db=fakeD1(),env={CATALOG_DB:db},school=schools.find(s=>s.id==='wamego-ks'),now=new Date('2026-11-04T22:00:00Z');
  worker.setScope(`https://${worker.PRODUCTION_HOST}/live/feed/grouped`);
  // A good build stores its finals.
  const good=await worker.withStoredFinals({events:[scored('2026-09-04','Abilene',35,14),scored('2026-09-11','Clay Center',21,28)],error:null,scores_missing:false},school,'Football',env,now);
  assert.deepEqual(good.finals_store,{read:0,written:2,filled:0});
  assert.equal(db.rows.size,2);
  assert.ok([...db.rows.values()].every(r=>r.scope==='prod'&&r.school==='wamego-ks'&&r.sport==='Football'));
  // MaxPreps refused: both games unscored, scores_missing; the store fills both and the build is whole again.
  const refused=await worker.withStoredFinals({events:[unscored('2026-09-04','Abilene'),unscored('2026-09-11','Clay Center')],error:null,scores_missing:true},school,'Football',env,now);
  assert.deepEqual(refused.events.map(e=>e.headline),['W, 35-14','L, 21-28']);
  assert.equal(refused.scores_missing,false,'the stored finals complete the build');
  assert.deepEqual(refused.finals_store,{read:2,written:0,filled:2});
  // A new game the store does not have yet keeps the build marked as missing scores.
  const newer=await worker.withStoredFinals({events:[unscored('2026-09-04','Abilene'),unscored('2026-09-18','Rock Creek')],error:null,scores_missing:true},school,'Football',env,now);
  assert.equal(newer.scores_missing,true);
  // A correction updates the row and keeps the old reading.
  await worker.withStoredFinals({events:[scored('2026-09-04','Abilene',35,17)],error:null},school,'Football',env,now);
  const row=[...db.rows.values()].find(r=>r.event_key==='2026-09-04||abilene');
  assert.equal(JSON.parse(row.event).headline,'W, 35-17');assert.equal(JSON.parse(row.history)[0].event.headline,'W, 35-14');
  // A failed build is left alone (no read, no write).
  const before=db.log.length;
  const failed=await worker.withStoredFinals({events:[],error:'HTTP 520',scores_missing:false},school,'Football',env,now);
  assert.deepEqual([failed.events.length,failed.finals_store,db.log.length],[0,undefined,before]);
  // A branch preview keeps its own rows and never reads production's.
  worker.setScope('https://ccr-x-sas-sports.lovetogivepain.workers.dev/live/feed/grouped');
  const preview=await worker.withStoredFinals({events:[unscored('2026-09-04','Abilene')],error:null,scores_missing:true},school,'Football',env,now);
  assert.deepEqual([preview.events[0].headline,preview.finals_store.read],['No score posted',0]);
  // Only this school year's finals are read.
  worker.setScope(`https://${worker.PRODUCTION_HOST}/live/feed/grouped`);
  db.rows.set('old',{scope:'prod',school:'wamego-ks',sport:'Football',event_key:'2025-09-05||abilene',date:'2025-09-05',event:JSON.stringify(scored('2025-09-05','Abilene',1,0)),sig:'x',history:'[]'});
  const year=await worker.withStoredFinals({events:[],error:null},school,'Football',env,now);
  assert.ok(!year.events.some(e=>e.start_time.startsWith('2025')),'last season stays stored, not shown');
  // No database bound: the build as it was.
  const plain={events:[unscored('2026-09-04','Abilene')],error:null};
  assert.equal(await worker.withStoredFinals(plain,school,'Football',{},now),plain);
}
// Colleges (user, November 4: "Fix them both"): the same store, with the
// school's highlightRevision in its rows' scope, read-only expanded views,
// and a game's added rows not counted as a changed result.
{
  const db=fakeD1(),env={CATALOG_DB:db},now=new Date('2026-11-04T22:00:00Z');
  worker.setScope(`https://${worker.PRODUCTION_HOST}/live/feed/grouped`);
  const kstate=schools.find(s=>s.id==='kstate'),baylor=schools.find(s=>s.id==='baylor');
  const ks=scored('2026-11-03','South Dakota State',66,68,{team_label:"Men's"});
  const first=await worker.withStoredFinals({events:[ks],error:null},kstate,'Basketball',env,now);
  assert.deepEqual(first.finals_store,{read:0,written:1,filled:0});
  assert.equal([...db.rows.values()][0].scope,'prod','no revision: production\'s scope');
  // A build that dropped it (its page listed it without a result that day): listed again.
  const dropped=await worker.withStoredFinals({events:[],error:null,live_source_used:true},kstate,'Basketball',env,now);
  assert.deepEqual(dropped.events.map(e=>[e.title,e.headline,e.stored_final]),[['Wamego vs South Dakota State','L, 66-68',true]]);
  // A box score's rows added to the same game: not a new result, nothing written.
  const before=db.rows.size,log=db.log.length;
  const boxed=await worker.withStoredFinals({events:[{...ks,results:[{label:'1st Half',value:'28-35'}]}],error:null},kstate,'Basketball',env,now);
  assert.equal(boxed.finals_store.written,0);assert.equal(db.rows.size,before);
  // An expanded view's build only reads, even with a corrected score.
  const view=await worker.withStoredFinals({events:[scored('2026-11-03','South Dakota State',66,69,{team_label:"Men's"})],error:null},kstate,'Basketball',env,now,'any-event-id');
  assert.equal(view.finals_store.written,0);
  assert.equal(JSON.parse([...db.rows.values()][0].event).headline,'L, 66-68');
  // A school with a highlightRevision (Baylor 2) keeps its own rows: raising it starts its store afresh.
  await worker.withStoredFinals({events:[scored('2026-10-03','Texas Tech',1,0)]},baylor,'Soccer',env,now);
  assert.ok([...db.rows.values()].some(r=>r.school==='baylor'&&r.scope==='prod|r2'));
  // fetchLive wraps college builds; a build whose official page failed is left alone.
  assert.ok(source.includes('if(!school||isHighSchool(school)||isPro(school)||result.official_failed)return result;\n  return withStoredFinals(result,school,sport,env,new Date(),aiTargetId);'));
}
// The scheduled refresh records why a scores read failed (user, November 4:
// "Fix them both"): the page and the HTTP code, or the refusal the source
// layer is still waiting out.
{
  const fn=Function('return '+source.match(/function sourceFailure\(url,r\)\{[\s\S]*?\n\}/)[0])();
  const r=(status,headers={})=>({status,headers:new Headers(headers)});
  assert.equal(fn('https://www.maxpreps.com/x/',r(403,{'x-sas-source':'network'})),'https://www.maxpreps.com/x/: HTTP 403');
  assert.equal(fn('u',r(503,{'x-sas-source':'backoff','x-sas-upstream-status':'403'})),'u: HTTP 503 (waiting out an earlier HTTP 403 refusal; no request sent)');
  assert.ok(source.includes('scoresErrors.push(sourceFailure(url,r))'));
  assert.ok(source.includes("`scores source failed${built?'':' (saved copy kept)'}: ${(report.scores_errors||['reason not recorded']).join('; ')}`"));
}
// A stored final shown to be wrong is not listed again (November 5: Junction
// City's Greg Wilson Classic had been stored with the Manhattan XC
// Invitational's places).
{
  assert.ok(RETRACTED_FINALS.every(r=>r.school&&r.sport&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.reason));
  assert.equal(retractedFinal('junction-city-ks','Cross Country',{start_time:'2026-09-05T13:00:00.000Z'}),true);
  assert.equal(retractedFinal('junction-city-ks','Cross Country',{start_time:'2026-09-19T13:00:00.000Z'}),false);
  assert.equal(retractedFinal('junction-city-ks','Football',{start_time:'2026-09-05T23:00:00.000Z'}),false);
  const db=fakeD1(),env={CATALOG_DB:db},now=new Date('2026-11-05T22:00:00Z'),jc=schools.find(s=>s.id==='junction-city-ks');
  worker.setScope(`https://${worker.PRODUCTION_HOST}/live/feed/grouped`);
  const meet=(date,name,headline)=>({...game(date,name),event_type:'MEET',status:'Final',headline,results:[{group:'Boys',participant:'Junction City team',result:headline}],meet_results_verified:true});
  db.rows.set('a',{scope:'prod',school:'junction-city-ks',sport:'Cross Country',event_key:'2026-09-05||greg wilson classic',date:'2026-09-05',event:JSON.stringify(meet('2026-09-05','Greg Wilson Classic','Boys 6th of 11')),sig:'x',history:'[]'});
  db.rows.set('b',{scope:'prod',school:'junction-city-ks',sport:'Cross Country',event_key:'2026-10-03||blue jay',date:'2026-10-03',event:JSON.stringify(meet('2026-10-03','Blue Jay Invitational','Boys 2nd of 7')),sig:'y',history:'[]'});
  const out=await worker.withStoredFinals({events:[],error:null},jc,'Cross Country',env,now);
  assert.deepEqual(out.events.map(e=>e.start_time.slice(0,10)),['2026-10-03'],'the retracted Sep 5 final is not listed; Oct 3 still is');
}
// Wired into every middle and high school build, and reported on /live/status.
assert.ok(source.includes('if(isHighSchool(school))return withStoredFinals(await fetchHighSchool(school,sport,now,aiTargetId,env),school,sport,env,now,aiTargetId);'));
assert.ok(source.includes('...(result.finals_store?{finals_store:result.finals_store}:{})'));
console.log('finals-store: ok');
