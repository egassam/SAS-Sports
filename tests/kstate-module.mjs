import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {createFeedStore} from '../src/feed-store.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {kansasSchool,createKansasHandlers} from '../src/schools/kansas.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/kansas-cross-country.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const baseline=JSON.parse(read('./fixtures/kstate-module-baseline.json'));
const schools=JSON.parse(read('../src/schools.json'));
const sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kstate');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
let responses=new Map(),requests=[];
const fetch=async url=>{requests.push(String(url));assert.ok(responses.has(String(url)),`Unexpected fetch ${url}`);return new Response(responses.get(String(url)));};
const worker=Function('createSourceFetch','SOURCE_TTL','createFeedStore','oklahomaStateSchool','createOklahomaStateHandlers','utahSchool','createUtahHandlers','arizonaStateSchool','createArizonaStateHandlers','kansasSchool','createKansasHandlers','kstateSchool','createKStateHandlers','schools','sponsoredSports','rosterSocialInstagrams','extractText','isKansasCrossCountry','applyVerifiedKansasMeet','attachKansasRaceDocuments','fetch',`${source}\nreturn {recapMatchesEvent,candidateUrls,rosterUrls,enrichGameEvent,enrichMeetEvent,featuredAthletes,officialCardInstagram,VERIFIED_TEAM_TAG_INSTAGRAM,KNOWN_URLS,schoolCombinedSports,teamLabelForSource,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,makeEvent,groupEvents,schoolTimeZone};`)(createSourceFetch,SOURCE_TTL,createFeedStore,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,kansasSchool,createKansasHandlers,kstateSchool,createKStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,()=>{throw Error('Unexpected PDF');},isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,fetch);

// Frozen from the pre-module application commit, never regenerated during tests.
assert.equal(Object.keys(baseline.routes).length,10);
assert.deepEqual(Object.keys(baseline.routes),sponsoredSports.kstate);
for(const [sport,expected] of Object.entries(baseline.routes)){
  assert.deepEqual(worker.candidateUrls(school,sport),expected.schedule,`${sport} schedule parity`);
  assert.deepEqual(worker.rosterUrls(school,sport),expected.roster,`${sport} roster parity`);
}
assert.deepEqual([...kstateSchool.combinedSports].sort(),['Basketball','Golf']);
assert.equal(worker.schoolCombinedSports(school).has('Golf'),true);
assert.equal(worker.teamLabelForSource(school,'Golf','https://www.kstatesports.com/sports/womens-golf/schedule'),"Women's");
assert.equal(worker.teamLabelForSource(school,'Golf','https://www.kstatesports.com/sports/mens-golf/schedule'),"Men's");
assert.equal(worker.teamLabelForSource(school,'Tennis','https://www.kstatesports.com/sports/womens-tennis/schedule'),null,'K-State only sponsors women\'s tennis');
assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(x=>x.path),['football/college-football']);
assert.deepEqual(worker.liveScoreboardProviders(school,'Basketball').map(x=>[x.path,x.team_label]),[
  ['basketball/mens-college-basketball',"Men's"],
  ['basketball/womens-college-basketball',"Women's"]
]);

const scoreboardPayload=(state,detail)=>({events:[{date:'2026-01-17T20:00:00Z',competitions:[{
  date:'2026-01-17T20:00:00Z',status:{type:{state,completed:state==='post',shortDetail:detail}},competitors:[
    {homeAway:'home',score:'71',team:{id:'2306',location:'Kansas State',displayName:'Kansas State Wildcats',shortDisplayName:'Kansas State'}},
    {homeAway:'away',score:'68',team:{id:'999',location:'Iowa State',displayName:'Iowa State Cyclones',shortDisplayName:'Iowa State'}}
  ]}]}]});
const scoreUrl='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?limit=1000&dates=20260117';
const liveMen=worker.parseScoreboardPayload(scoreboardPayload('in','2nd Half - 4:12'),school,'Basketball',kstateSchool.liveScoreboards.Basketball[0],scoreUrl,new Date('2026-01-17T21:00:00Z'));
assert.equal(liveMen.length,1);
assert.equal(liveMen[0].status,'Live');
assert.equal(liveMen[0].team_label,"Men's");
assert.equal(liveMen[0].school_score,'71');
assert.equal(liveMen[0].opponent_score,'68');
assert.equal(liveMen[0].headline,'2nd Half - 4:12');
assert.equal(liveMen[0].verification_state,'live_scoreboard');
const womenSchedule={...liveMen[0],id:'women-schedule',team_label:"Women's",title:"Women's · K-State vs Iowa State",status:'Upcoming',school_score:null,opponent_score:null,verification_state:'live_source'};
const menSchedule={...womenSchedule,id:'men-schedule',team_label:"Men's",title:"Men's · K-State vs Iowa State"};
const reconciled=worker.reconcileScoreboardEvents([womenSchedule,menSchedule],liveMen);
assert.equal(reconciled.length,2,'a men\'s score must not create or overwrite a women\'s event');
assert.equal(reconciled.find(x=>x.team_label==="Women's").status,'Upcoming');
assert.equal(reconciled.find(x=>x.team_label==="Men's").verification_state,'official_schedule+live_scoreboard');
// A 7 PM Central tip-off is 01:00 UTC the next day. The official card and the
// ESPN score must still reconcile, and tonight's game must stay in Upcoming
// after 00:00 UTC.
assert.equal(worker.schoolTimeZone(school),'America/Chicago');
const eveningScoreboard=(state,detail,ours,theirs)=>({events:[{date:'2026-01-18T01:00Z',competitions:[{date:'2026-01-18T01:00Z',status:{type:{state,completed:state==='post',shortDetail:detail}},competitors:[
  {homeAway:'home',score:ours,team:{id:'2306',location:'Kansas State',displayName:'Kansas State Wildcats',shortDisplayName:'Kansas State'}},
  {homeAway:'away',score:theirs,team:{id:'999',location:'Iowa State',displayName:'Iowa State Cyclones',shortDisplayName:'Iowa State'}}
]}]}]});
const eveningOfficial=(now,status='Upcoming',schoolScore=null,oppScore=null)=>({...worker.makeEvent({school,sport:'Basketball',status,relation:'vs',opponent:'Iowa State',date:'January 17, 2026',time:'7:00 PM',schoolScore,oppScore,resultText:null,sourceUrl:'https://www.kstatesports.com/sports/mens-basketball/schedule',now}),team_label:"Men's"});
const beforeTip=new Date('2026-01-18T00:30:00Z');
const pregame=worker.groupEvents([eveningOfficial(beforeTip)],beforeTip)[0];
assert.equal(pregame.upcoming.length,1,'a 7 PM game stays upcoming at 6:30 PM Central');
assert.equal(pregame.upcoming[0].status,'Today');
const duringGame=new Date('2026-01-18T02:00:00Z');
const eveningLive=worker.parseScoreboardPayload(eveningScoreboard('in','1st Half - 2:10','30','28'),school,'Basketball',kstateSchool.liveScoreboards.Basketball[0],scoreUrl,duringGame);
assert.equal(eveningLive[0].start_time,'2026-01-17T19:00:00.000Z','ESPN UTC time is expressed in K-State local time');
const eveningOfficialCard=eveningOfficial(duringGame);
const eveningReconciled=worker.reconcileScoreboardEvents([eveningOfficialCard],eveningLive);
assert.equal(eveningReconciled.length,1,'an evening score must update the official card, not add a duplicate');
assert.equal(eveningReconciled[0].id,eveningOfficialCard.id);
assert.equal(eveningReconciled[0].status,'Live');
assert.equal(eveningReconciled[0].verification_state,'official_schedule+live_scoreboard');
const liveGroup=worker.groupEvents(eveningReconciled,duringGame)[0];
assert.equal(liveGroup.live.length,1);
assert.equal(liveGroup.upcoming.length,0);
const nextMorning=new Date('2026-01-18T15:00:00Z');
const eveningFinal=worker.parseScoreboardPayload(eveningScoreboard('post','Final','71','68'),school,'Basketball',kstateSchool.liveScoreboards.Basketball[0],scoreUrl,nextMorning);
const finalGroup=worker.groupEvents(worker.reconcileScoreboardEvents([eveningOfficial(nextMorning,'Final','71','68')],eveningFinal),nextMorning)[0];
assert.equal(finalGroup.results.length,1,'the finished evening game appears once in Results');
const tbd=worker.parseScoreboardPayload({events:[{...eveningScoreboard('in','Live','10','8').events[0],date:'2026-01-17T05:00Z',competitions:[{...eveningScoreboard('in','Live','10','8').events[0].competitions[0],date:'2026-01-17T05:00Z',timeValid:false}]}]},school,'Basketball',kstateSchool.liveScoreboards.Basketball[0],scoreUrl,duringGame);
assert.equal(tbd[0].start_time.slice(0,10),'2026-01-17','an unconfirmed ESPN time keeps its published calendar day');
assert.deepEqual(Object.fromEntries([...worker.VERIFIED_TEAM_TAG_INSTAGRAM].filter(([key])=>key.startsWith('kstate|'))),baseline.verified_instagrams);
assert.equal(worker.officialCardInstagram('https://instagram.com/kstatesports/'),null);
assert.equal(worker.officialCardInstagram('https://instagram.com/sundevilathletics/'),null);
assert.equal(baseline.soccer.length,5);
for(const {input,expected} of baseline.soccer){
  assert.deepEqual(worker.enrichGameEvent(structuredClone(input)),expected);
  for(const changed of [{school_id:'kansas'},{sport:'Volleyball'},{start_time:'2027-09-03T12:00:00Z'},{status:'Upcoming'}]){
    const event={...input,...changed},before=structuredClone(event);
    worker.enrichGameEvent(event);assert.deepEqual(event,before,'saved soccer facts must not leak to another event');
  }
}
for(const records of [kstateSchool.scheduleUrls,kstateSchool.verifiedGameDetails,kstateSchool.verifiedInstagrams])assert.ok(Object.keys(records).every(key=>key.startsWith('kstate|')));

// The module's known accounts must still be attached to exact roster identities
// by the production featured-athlete path, not just present in a config object.
const roster=Object.keys(baseline.verified_instagrams).map(key=>{
  const name=key.split('|')[2],slug=name.toLowerCase().replaceAll(' ','-');
  return `<li class="roster-list-item"><a href="/sports/womens-tennis/roster/player/${slug}">${name}</a><img alt="${name}" src="https://www.kstatesports.com/images/${slug}.jpg"></li>`;
}).join('');
responses.set(baseline.routes.Tennis.roster[0],roster);
const athletes=await worker.featuredAthletes('kstate','Tennis');
assert.equal(athletes.length,3);
for(const athlete of athletes){
  assert.equal(athlete.instagram_url,baseline.verified_instagrams[`kstate|Tennis|${athlete.name}`]);
  assert.ok(athlete.image_url,'keep identity-bound portraits');
}
assert.deepEqual(requests,[baseline.routes.Tennis.roster[0]],'known tags should retain the fast roster path');
// A similarly named athlete at another school must not inherit K-State tags.
assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get('kansas|Tennis|Mallory Renfro'),undefined);

// Seeded result mutations must not contaminate another request.
const first=()=>({school_id:'kstate',school:'Kansas State',sport:'Cross Country',event_type:'MEET',status:'Final',start_time:'2026-09-04T12:00:00Z',opponent:'Platte River Rumble Gold',results:[]});
const one=first();worker.enrichMeetEvent(one);one.results[0].result='changed';
const two=first();worker.enrichMeetEvent(two);assert.equal(two.results[0].result,'1st · 20 pts');
assert.equal(two.results.length,20);
// Multi-day golf: K-State published the Schooner Fall Classic recap on the
// final day (Sep 21), two days after the listed start (Sep 19). The official
// recap must still match; games keep the +/-1 day window.
const schoonerRecap=gunzipSync(readFileSync(new URL('./fixtures/kstate-module/golf-schooner-2026-recap.html.gz',import.meta.url))).toString('utf8');
const schoonerUrl='https://www.kstatesports.com/news/2026/9/21/womens-golf-wildcats-finish-seventh-at-schooner-fall-classic';
const golfMeet=(start,change={})=>({school_id:'kstate',school:'Kansas State',sport:'Golf',event_type:'MEET',status:'Final',opponent:'Schooner Fall Classic',start_time:start,...change});
assert.equal(worker.recapMatchesEvent(schoonerRecap,golfMeet('2026-09-19T12:00:00.000Z'),schoonerUrl),true,'a final-day recap matches a multi-day tournament');
assert.equal(worker.recapMatchesEvent(schoonerRecap,golfMeet('2026-09-14T12:00:00.000Z'),schoonerUrl),false,'a recap a week after the start is not this event');
assert.equal(worker.recapMatchesEvent(schoonerRecap,golfMeet('2026-09-28T12:00:00.000Z',{opponent:'Powercat Classic'}),schoonerUrl),false,'the next tournament (Powercat, Sep 28), which this article previews, does not take its recap');
assert.equal(worker.recapMatchesEvent(schoonerRecap,golfMeet('2026-09-19T12:00:00.000Z',{event_type:'GAME'}),schoonerUrl),false,'games keep the one-day window');

console.log('K-State module: all 10 sport source routes, both basketball/golf teams, independent football/basketball scoreboards, evening-game local-time reconciliation, 5 exact soccer records, 3 verified tennis accounts through the athlete path, multi-day golf recap matching, school/event isolation, and independent result snapshots passed.');
