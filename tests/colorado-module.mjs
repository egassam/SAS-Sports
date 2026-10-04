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
import {coloradoSchool,createColoradoHandlers} from '../src/schools/colorado.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='colorado');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,coloradoSchool,createColoradoHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,baylorHandlers,cincinnatiHandlers,coloradoHandlers,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));


// Module ownership: every sponsored sport has explicit cubuffs.com routes,
// exactly the candidates production used before the module (route parity,
// 220/220 catalog routes identical), and the verified Football Instagram tag.
const sports=sponsoredSports.colorado;
assert.equal(sports.length,9);
for(const [name,map] of [['schedule',coloradoSchool.scheduleUrls],['roster',coloradoSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('colorado|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'cubuffs.com',`${key} must stay on cubuffs.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(coloradoSchool.scheduleUrls[`colorado|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(coloradoSchool.rosterUrls[`colorado|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'colorado\|/.test(read('../src/index.js')),'Colorado configuration must live in its module, not shared code');

// Football: cubuffs.com (SIDEARM) embeds every game as page data with its
// local start ("8:15 PM"), home/away, result and recap. Production read the
// rendered cards, which omit the start time.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/colorado-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://cubuffs.com/sports/football/schedule',now=new Date('2026-10-04T15:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,13,'one event per official game');
assert.equal(new Set(football.map(e=>e.id)).size,13,'no duplicate events');
const finals=football.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 3','Colorado at Georgia Tech','W, 14-13','14','13'],['Sep 12','Colorado vs Weber State','W, 52-21','52','21'],
  ['Sep 19','Colorado at Northwestern','L, 7-41','7','41'],['Sep 26','Colorado at Baylor','L, 13-23','13','23'],
  ['Oct 3','Colorado vs Texas Tech','L, 7-29','7','29']
],'finals read as K-State\'s: W/L and the date only');
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),[
  '2026/9/3/football-late-td-boo-block-gives-buffs-thrilling-win-at-georgia-tech','2026/9/12/football-offensive-outburst-guides-buffaloes-over-weber-state',
  '2026/9/19/football-giveaways-costly-as-buffs-suffer-defeat-to-northwestern','2026/9/26/football-buffaloes-fall-in-waco-to-open-big-12-conference-play',undefined
].map(path=>path&&`https://cubuffs.com/news/${path}`),'every final links its own official recap (not the game book or notes); Oct 3 has none yet');
const upcoming=football.filter(e=>e.status!=='Final');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'Colorado vs Utah Oct 17','Colorado at Oklahoma State Oct 24','Colorado vs Kansas State Oct 31','Colorado at Arizona State Nov 7',
  'Colorado vs Houston Nov 13, 8:15 PM','Colorado at Cincinnati Nov 21','Colorado vs UCF Nov 28','Colorado vs Big 12 Championship Game Dec 4, 6:00 PM'
],'published Colorado (Mountain) start times; "TBA" shows the date only');
assert.equal(upcoming[4].start_time,'2026-11-13T20:15:00.000Z','start times are Colorado wall clock');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[5,8]);
assert.deepEqual(group.results.map(e=>e.display_time),['Oct 3','Sep 26','Sep 19','Sep 12','Sep 3'],'results newest first, as K-State');
// A past game day without a published score is neither a result nor
// upcoming (yesterday's stays: its score can be posted after midnight).
{
  const unscored=fixture('football-schedule.html.gz');
  const later=worker.parseHtml(unscored,school,'Football',footballUrl,new Date('2026-10-19T15:00:00Z'));
  assert.ok(!later.some(e=>e.opponent==='Utah'),'Oct 17 without a score is gone two days later');
  const nextDay=worker.parseHtml(unscored,school,'Football',footballUrl,new Date('2026-10-18T15:00:00Z'));
  assert.ok(nextDay.some(e=>e.opponent==='Utah'&&e.status!=='Final'),'the day after, it stays');
}
// The whole pipeline (download, compaction, parse) keeps the page data: the
// shared schedule compaction once cut cubuffs.com football pages after the
// cards, and the published times were lost.
{
  recapFixtures.set(footballUrl,fixture('football-schedule.html.gz'));
  const {events}=await worker.fetchLive('colorado','Football');
  recapFixtures.delete(footballUrl);requests.length=0;
  assert.deepEqual(events.filter(e=>e.opponent==='Houston').map(e=>e.display_time),['Nov 13, 8:15 PM'],'the feed keeps the published start time');
  assert.equal(events.length,13);
}
// Pages from any other host or path are left to the shared parsers; other
// schools never reach the Colorado reader.
assert.equal(worker.coloradoHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://cubuffs.com/',now),null);
assert.equal(worker.coloradoHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='tcu'),'Football',footballUrl,now),null);
// Sports not yet converted keep the shared parsers.
assert.equal(worker.coloradoHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Skiing','https://cubuffs.com/sports/skiing/schedule',now),null);

// Expanded view: each final matches only its own recap, and its highlights
// are written from that article.
const recapped=finals.filter(e=>e.recap_url);
const recaps=['recap-football-2026-9-3-georgia-tech.html.gz','recap-football-2026-9-12-weber-state.html.gz','recap-football-2026-9-19-northwestern.html.gz','recap-football-2026-9-26-baylor.html.gz'].map(fixture);
recapped.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
recapped.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.recapMatchesEvent(raw,event,recapped[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
for(const [i,expected] of [[0,'Georgia Tech'],[1,'Weber State'],[2,'Northwestern'],[3,'Baylor']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Colorado scored on its first drive of the game against the hosts.','The Buffaloes defense forced two turnovers in the first half of play.','Colorado added a touchdown in the third quarter of the game.','The Buffaloes closed the game with a long drive in the fourth quarter.'])};}}};
  const events=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
  const target=events.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time))[i];
  await worker.attachOfficialHighlights(events,fixture('football-schedule.html.gz'),school,'Football',footballUrl,now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated',`${expected}: highlights come from the official recap`);
  assert.equal(target.recap_url,recapped[i].recap_url,`${expected}: the game's own recap is kept`);
  assert.equal(target.highlights.length,4);
  assert.equal(prompts.length,1);
  assert.ok(prompts[0].includes(expected),`${expected}: the AI is given that game's article`);
}
assert.ok(requests.every(url=>recapped.some(e=>e.recap_url===url)),'only the game recaps are downloaded');

// Live score: ESPN's college football scoreboard (the shared FBS-group
// request). Colorado at Baylor (Sep 26) joins the official card; Colorado
// State is never taken for Colorado.
{
  assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(p=>p.path),['football/college-football']);
  const payload=JSON.parse(fixture('football-espn-2026-09-26.json.gz'));
  assert.ok(payload.events.some(e=>/Colorado State/.test(e.name)),'the payload also holds Colorado State');
  const [provider]=worker.liveScoreboardProviders(school,'Football'),scoreUrl='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=20260926';
  const scored=worker.parseScoreboardPayload(payload,school,'Football',provider,scoreUrl,new Date('2026-09-27T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.school_score,e.opponent_score,e.headline]),[['Colorado at Baylor','Final','13','23','L, 13-23']]);
  const reconciled=worker.reconcileScoreboardEvents(football,scored);
  assert.equal(reconciled.length,football.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Colorado at Baylor','L, 13-23']]);
}

// Volleyball: 34 page-data entries. The Black and Gold scrimmage and the
// other teams' tournament matches ("Denver vs. Central Arkansas") are not
// Colorado's; 13 finals as K-State's (date only, sets won), 15 upcoming with
// published Mountain times.
{
  const vbUrl='https://cubuffs.com/sports/womens-volleyball/schedule';
  const vb=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,now);
  assert.equal(vb.length,28,'one event per Colorado match');
  assert.equal(new Set(vb.map(e=>e.id)).size,28);
  assert.ok(!vb.some(e=>/ vs\.? |scrimmage/i.test(e.opponent)),'no scrimmage or other teams\' match');
  const vbFinals=vb.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
  assert.deepEqual(vbFinals.map(e=>`${e.display_time} ${e.title} ${e.headline}`),[
    'Aug 28 Colorado vs CSUN W, 3-0','Aug 29 Colorado vs Central Arkansas W, 3-0','Aug 30 Colorado vs Denver W, 3-0',
    'Sep 4 Colorado vs Wichita State W, 3-0','Sep 5 Colorado vs New Mexico W, 3-2','Sep 6 Colorado vs Northern Colorado W, 3-2',
    'Sep 11 Colorado vs Oregon State W, 3-0','Sep 12 Colorado at USC W, 3-1','Sep 17 Colorado vs Colorado State W, 3-1',
    'Sep 18 Colorado at Colorado State L, 0-3','Sep 25 Colorado vs Utah L, 0-3','Sep 27 Colorado vs Arizona W, 3-2','Oct 2 Colorado at TCU L, 1-3'
  ]);
  const vbUp=vb.filter(e=>e.status!=='Final');
  assert.equal(vbUp.length,15);
  assert.deepEqual(vbUp.slice(0,3).map(e=>`${e.title} ${e.display_time}`),['Colorado at Baylor Oct 4, 1:00 PM','Colorado at Arizona State Oct 9, 8:00 PM','Colorado vs Kansas State Oct 11, 1:00 PM'],'published times; trailing spaces in names trimmed');
  assert.equal(vbUp[0].status,'Today');
  // Before the Buffs Classic, the other teams' matches would be upcoming.
  const early=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,new Date('2026-08-20T15:00:00Z'));
  assert.ok(!early.some(e=>/ vs\.? /i.test(e.opponent)),'other teams\' upcoming matches are left out');
  assert.equal(early.length,28);
  // Each final matches only its own recap, including the two Colorado State
  // matches on consecutive days.
  const vbRecaps=vbFinals.map(e=>{const [,y,m,d]=e.recap_url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\//);return fixture(`recap-volleyball-${y}-${m}-${d}.html.gz`);});
  vbFinals.forEach((event,i)=>vbRecaps.forEach((raw,j)=>assert.equal(worker.coloradoHandlers.matchesRecap(raw,event,vbFinals[j].recap_url),i===j,`${event.display_time} ${event.opponent} must match only its own recap (checked against ${vbFinals[j].display_time})`)));
  // Without its own link (a search candidate), a story must name the
  // opponent in its headline: the Aug 28 CSUN story previews Central Arkansas.
  const unlinked={...vbFinals[1],recap_url:undefined};
  assert.equal(worker.coloradoHandlers.matchesRecap(vbRecaps[0],unlinked,vbFinals[0].recap_url),false,'the CSUN story is not the Central Arkansas recap');
  assert.equal(worker.coloradoHandlers.matchesRecap(vbRecaps[1],unlinked,vbFinals[1].recap_url),true,'the Central Arkansas story names its opponent');
  // Other schools never reach the Colorado matcher.
  assert.equal(worker.coloradoHandlers.matchesRecap(vbRecaps[0],{...vbFinals[0],school_id:'baylor'},vbFinals[0].recap_url),false);
  // Expanded view: Central Arkansas (Aug 29) writes its highlights from its
  // own story, not the CSUN story the day before; the Worker dispatches
  // Colorado finals to the Colorado matcher.
  {
    const target=vb.find(e=>e.opponent==='Central Arkansas');
    recapFixtures.set(target.recap_url,vbRecaps[1]);
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Colorado won the first set behind a strong serving run.','The Buffaloes hit over .300 as a team in the match.','Colorado closed the third set with a block.','The Buffaloes improved to 2-0 at the Buffs Classic.'])};}}};
    await worker.attachOfficialHighlights(vb,fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,now,env,target.id);
    assert.equal(target.highlight_state,'recap_generated');
    assert.ok(prompts[0].includes('Central Arkansas'));
    assert.ok(/coloradoHandlers\.matchesRecap\(html,target,candidate\)/.test(read('../src/index.js')),'Colorado finals use the Colorado matcher');
  }
  // Live score: ESPN's women's college volleyball scoreboard. The Oct 2
  // payload (120 matches) holds Colorado at TCU; it joins the official card.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>p.path),['volleyball/womens-college-volleyball']);
  const payload=JSON.parse(fixture('volleyball-espn-2026-10-02.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Volleyball');
  const scored=worker.parseScoreboardPayload(payload,school,'Volleyball',provider,'https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?limit=1000&dates=20261002',new Date('2026-10-03T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Colorado at TCU','Final','L, 1-3']]);
  const reconciled=worker.reconcileScoreboardEvents(vb,scored);
  assert.equal(reconciled.length,vb.length,'the scoreboard joins the official match; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Colorado at TCU','L, 1-3']]);
}

console.log('Colorado module checks passed');
