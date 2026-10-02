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
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='ucf');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit ucfknights.com routes,
// exactly the candidates production used before the module (route parity).
const sports=sponsoredSports.ucf;
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',ucfSchool.scheduleUrls],['roster',ucfSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('ucf|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'ucfknights.com',`${key} must stay on ucfknights.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(ucfSchool.scheduleUrls[`ucf|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(ucfSchool.rosterUrls[`ucf|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'ucf\|/.test(read('../src/index.js')),'UCF configuration must live in its module, not shared code');
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Swimming & Diving'],'the shared program combinations are unchanged');
// The neighbouring schools keep their own routes.
assert.equal(worker.candidateUrls(schools.find(s=>s.id==='cincinnati'),'Football')[0],'https://gobearcats.com/sports/football/schedule');
assert.equal(worker.candidateUrls(schools.find(s=>s.id==='byu'),'Football')[0],'https://byucougars.com/sports/football/schedule');

// Football: ucfknights.com cards show "Thu, Sep" / "3" with no year, a vs./at
// divider, the opponent, and one slot holding the result ("W Win 73-6") or the
// published time ("12:00 PM EDT", "Time TBA"). The shared parsers read the
// cards and the schema data separately, so every upcoming game appeared twice
// and a phantom "Nov 28 at Colorado W, 73-6" final reused the Sep 3 recap.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/ucf-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://ucfknights.com/sports/football/schedule',now=new Date('2026-10-02T12:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,12,'one event per official card');
assert.equal(new Set(football.map(e=>e.id)).size,12,'no duplicate events');
const finals=football.filter(e=>e.status==='Final');
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 3','UCF vs Bethune-Cookman','W, 73-6','73','6'],['Sep 12','UCF at Pittsburgh','L, 7-12','7','12'],
  ['Sep 19','UCF vs Georgia State','W, 44-30','44','30'],['Sep 26','UCF vs TCU','W, 21-13','21','13']
]);
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),[
  'https://ucfknights.com/news/2026/09/4/football-opens-20th-season-of-bounce-house-with-73-6-victory',
  'https://ucfknights.com/news/2026/09/13/football-falls-in-pittsburgh-12-7',
  'https://ucfknights.com/news/2026/09/20/watson-runs-wild-as-football-rallies-past-georgia-state-44-30',
  'https://ucfknights.com/news/2026/09/27/football-opens-big-12-play-with-21-13-win-over-tcu'
],'every final links its own official recap, not the photo gallery or press conference');
const upcoming=football.filter(e=>e.status==='Upcoming');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'UCF at Houston Oct 3, 12:00 PM','UCF at Oklahoma St. Oct 10, 12:00 PM','UCF vs BYU Oct 24','UCF vs Baylor Oct 30, 7:30 PM',
  'UCF at Kansas Nov 7','UCF vs Arizona St. Nov 14','UCF vs Iowa St. Nov 20, 6:00 PM','UCF at Colorado Nov 28'
],'rankings ("#20/20", "#19/-") are dropped; "Time TBA" shows the date only');
assert.equal(upcoming[3].start_time,'2026-10-30T19:30:00.000Z','published times are Eastern wall clock, on the published day (Friday Oct 30)');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[4,8]);
assert.deepEqual(group.results.map(e=>e.display_time),['Sep 26','Sep 19','Sep 12','Sep 3'],'results newest first, as K-State');

// Expanded view: each final matches only its own recap, and its highlights
// are written from that article.
const recaps=['recap-2026-09-03-bethune-cookman.html.gz','recap-2026-09-12-pittsburgh.html.gz','recap-2026-09-19-georgia-state.html.gz','recap-2026-09-26-tcu.html.gz'].map(fixture);
finals.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
finals.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.recapMatchesEvent(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
for(const [i,expected] of [[0,'Bethune-Cookman'],[1,'Pitt'],[2,'Georgia State'],[3,'TCU']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['UCF scored on its first drive of the game against the visitors.','The Knights defense forced two turnovers in the first half of play.','UCF added two more touchdowns in the third quarter to pull away.','The Knights closed out the game with a long drive in the fourth quarter.'])};}}};
  const events=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
  const target=events.filter(e=>e.status==='Final')[i];
  await worker.attachOfficialHighlights(events,fixture('football-schedule.html.gz'),school,'Football',footballUrl,now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated',`${expected}: highlights come from the official recap`);
  assert.equal(target.recap_url,finals[i].recap_url,`${expected}: the card's own recap is kept`);
  assert.equal(target.highlights.length,4);
  assert.equal(prompts.length,1);
  assert.ok(prompts[0].includes(expected),`${expected}: the AI is given that game's article`);
}
assert.ok(requests.every(url=>finals.some(e=>e.recap_url===url)),'only the card recaps are downloaded');

// Volleyball: the same card layout. Production (shared parsers) showed 13
// results and 27 upcoming for 12 played and 16 scheduled matches.
{
  const url='https://ucfknights.com/sports/volleyball/schedule';
  const volleyball=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',url,now);
  assert.equal(volleyball.length,28,'one event per official card');
  assert.equal(new Set(volleyball.map(e=>e.id)).size,28,'no duplicate events');
  const played=volleyball.filter(e=>e.status==='Final');
  assert.equal(played.length,12);
  assert.deepEqual(played.slice(-3).map(e=>[e.display_time,e.title,e.headline]),[
    ['Sep 19','UCF at Purdue','L, 0-3'],['Sep 24','UCF vs Kansas St.','L, 2-3'],['Sep 27','UCF at Iowa St.','L, 2-3']
  ],'rankings ("#10 Purdue") are dropped; results read as K-State\'s');
  assert.ok(played.every(e=>/^https:\/\/ucfknights\.com\/news\/2026\/\d+\/\d+\/[\w-]*volleyball[\w-]*$/.test(e.recap_url)),'every final links its own volleyball recap');
  const next=volleyball.filter(e=>e.status!=='Final');
  assert.equal(next.length,16);
  assert.deepEqual(next.slice(0,3).map(e=>`${e.title} ${e.display_time}`),['UCF at Baylor Oct 2, 8:00 PM','UCF at TCU Oct 4, 3:00 PM','UCF vs Cincinnati Oct 9, 6:00 PM']);
  assert.ok(next.every(e=>!e.recap_url&&!e.headline),'no upcoming match inherits a result');
  // Each recap matches its own match only.
  const recaps=[['recap-volleyball-2026-09-24-kansas-state.html.gz','Kansas St.'],['recap-volleyball-2026-09-27-iowa-state.html.gz','Iowa St.']].map(([name,opponent])=>[fixture(name),played.find(e=>e.opponent===opponent)]);
  for(const [raw,event] of recaps)for(const [,other] of recaps)assert.equal(worker.recapMatchesEvent(raw,other,event.recap_url),event===other,`${other.opponent} must match only its own recap`);
  // Live score: ESPN's Oct 2 scoreboard, UCF at Baylor (8:00 PM EDT). Three
  // other Knights (Army Black Knights, Fairleigh Dickinson, Bellarmine) play
  // the same day and must not match on the nickname.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>p.path),['volleyball/womens-college-volleyball']);
  assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(p=>p.path),['football/college-football'],'Football keeps the shared scoreboard');
  const payload=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/ucf-module/volleyball-espn-2026-10-02.json.gz',import.meta.url))).toString('utf8'));
  const scoreUrl='https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?limit=1000&dates=20261002';
  // Scheduled matches are skipped until they start, so every event is set in
  // progress here; only UCF's goes Live.
  assert.deepEqual(worker.parseScoreboardPayload(payload,school,'Volleyball',ucfSchool.liveScoreboards.Volleyball[0],scoreUrl,now),[],'nothing before the first serve');
  for(const item of payload.events)item.competitions[0].status.type={...item.competitions[0].status.type,state:'in',completed:false,shortDetail:'1st Set'};
  const scored=worker.parseScoreboardPayload(payload,school,'Volleyball',ucfSchool.liveScoreboards.Volleyball[0],scoreUrl,new Date('2026-10-03T00:20:00Z'));
  assert.deepEqual(scored.map(e=>[e.status,e.title,e.start_time]),[['Live','UCF at Baylor','2026-10-02T20:00:00.000Z']],'only UCF\'s own match, at Eastern wall clock');
  const reconciled=worker.reconcileScoreboardEvents(volleyball,scored);
  assert.equal(reconciled.length,volleyball.length,'the scoreboard joins the official card; no second card');
  assert.deepEqual(reconciled.filter(e=>e.status==='Live').map(e=>[e.title,e.verification_state]),[['UCF at Baylor','official_schedule+live_scoreboard']]);
}

// Only Football reads the cards so far; every other sport keeps the shared parsers.
assert.equal(createUcfHandlers({makeEvent:()=>{throw Error('unused');},visibleText:x=>x,absoluteUrl:x=>x}).parseSchedule(fixture('football-schedule.html.gz'),school,'Soccer',footballUrl,now),null);
console.log('UCF module checks passed');
