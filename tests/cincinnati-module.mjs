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
const school=schools.find(s=>s.id==='cincinnati');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,baylorHandlers,cincinnatiHandlers,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));


// Module ownership: every sponsored sport has explicit gobearcats.com routes,
// exactly the candidates production used before the module (route parity,
// 219/219 catalog routes identical).
const sports=sponsoredSports.cincinnati;
assert.equal(sports.length,10);
for(const [name,map] of [['schedule',cincinnatiSchool.scheduleUrls],['roster',cincinnatiSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('cincinnati|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'gobearcats.com',`${key} must stay on gobearcats.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(cincinnatiSchool.scheduleUrls[`cincinnati|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(cincinnatiSchool.rosterUrls[`cincinnati|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'cincinnati\|/.test(read('../src/index.js')),'Cincinnati configuration must live in its module, not shared code');

// Football: gobearcats.com (WMT) cards carry the Eastern start with its
// offset, the result or published time, and the game's own Recap link. The
// shared parsers also read the page's UTC schema data: the Oct 3 night game
// at Arizona showed on Oct 3 and Oct 4, and a phantom Nov 28 BYU game reused
// the Sep 5 recap.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/cincinnati-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://gobearcats.com/sports/football/schedule',now=new Date('2026-10-03T17:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,12,'one event per official game');
assert.equal(new Set(football.map(e=>e.id)).size,12,'no duplicate events');
const finals=football.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 5','Cincinnati vs Boston College','W, 34-15','34','15'],['Sep 12','Cincinnati vs Western Carolina','W, 62-10','62','10'],
  ['Sep 19','Cincinnati vs Miami (OH)','W, 35-31','35','31'],['Sep 26','Cincinnati vs Kansas State','W, 31-26','31','26']
],"finals read as K-State's: W/L and the date only");
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),[
  '2026/09/5/cincinnati-extends-home-opener-win-streak-to-25-games-with-34-15-victory-over-boston-college','2026/09/13/bearcats-throttle-catamounts-in-62-10-victory',
  '2026/09/19/cincinnati-overcomes-21-point-deficit-claims-battle-for-the-victory-bell-with-35-31-win','2026/09/27/bearcats-win-big-12-opener-take-down-k-state-31-20-at-home'
].map(path=>`https://gobearcats.com/news/${path}`),'every final links its own official recap (not the game book PDF)');
const upcoming=football.filter(e=>e.status!=='Final');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'Cincinnati at Arizona Oct 3, 11:00 PM','Cincinnati at West Virginia Oct 17','Cincinnati vs Texas Tech Oct 24','Cincinnati vs Utah Oct 31',
  'Cincinnati at Houston Nov 7','Cincinnati at Iowa State Nov 14','Cincinnati vs Colorado Nov 21','Cincinnati at BYU Nov 28'
],'the published Eastern start ("11:00 PM EDT"); unscheduled games show the date only');
assert.equal(upcoming[0].start_time,'2026-10-03T23:00:00.000Z','start times are Cincinnati wall clock');
assert.equal(upcoming[0].status,'Today');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[4,8]);
assert.deepEqual(group.results.map(e=>e.display_time),['Sep 26','Sep 19','Sep 12','Sep 5'],'results newest first, as K-State');
// Pages from any other host or path are left to the shared parsers; other
// schools never reach the Cincinnati reader.
assert.equal(worker.cincinnatiHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://gobearcats.com/',now),null);
assert.equal(worker.cincinnatiHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='tcu'),'Football',footballUrl,now),null);

// Expanded view: each final matches only its own recap, and its highlights
// are written from that article.
const recaps=['recap-football-2026-9-5-boston-college.html.gz','recap-football-2026-9-12-western-carolina.html.gz','recap-football-2026-9-19-miami.html.gz','recap-football-2026-9-26-kansas-state.html.gz'].map(fixture);
finals.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
finals.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.recapMatchesEvent(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
for(const [i,expected] of [[0,'Boston College'],[1,'Western Carolina'],[2,'Miami'],[3,'K-State']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Cincinnati scored on its first drive of the game against the visitors.','The Bearcats defense forced two turnovers in the first half of play.','Cincinnati added two more touchdowns in the third quarter to pull away.','The Bearcats closed out the game with a long drive in the fourth quarter.'])};}}};
  const events=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
  const target=events.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time))[i];
  await worker.attachOfficialHighlights(events,fixture('football-schedule.html.gz'),school,'Football',footballUrl,now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated',`${expected}: highlights come from the official recap`);
  assert.equal(target.recap_url,finals[i].recap_url,`${expected}: the game's own recap is kept`);
  assert.equal(target.highlights.length,4);
  assert.equal(prompts.length,1);
  assert.ok(prompts[0].includes(expected),`${expected}: the AI is given that game's article`);
}
assert.ok(requests.every(url=>finals.some(e=>e.recap_url===url)),'only the game recaps are downloaded');

// Live score: ESPN's college football scoreboard (the shared FBS-group
// request). Kansas State at Cincinnati joins the official card.
{
  assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(p=>p.path),['football/college-football']);
  const payload=JSON.parse(fixture('football-espn-2026-09-26.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Football'),scoreUrl='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=20260926';
  const scored=worker.parseScoreboardPayload(payload,school,'Football',provider,scoreUrl,new Date('2026-09-27T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.school_score,e.opponent_score,e.headline]),[['Cincinnati vs Kansas St','Final','31','26','W, 31-26']]);
  const reconciled=worker.reconcileScoreboardEvents(football,scored);
  assert.equal(reconciled.length,football.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Cincinnati vs Kansas State','W, 31-26']]);
}

// Volleyball: the same card reader. Production showed rankings ("#11 TCU",
// "#RV Kansas State"), listed every ranked upcoming match twice ("at #24
// Colorado" Oct 29 and "at Colorado" Oct 30) and showed no times.
{
  const vbUrl='https://gobearcats.com/sports/womens-volleyball/schedule',vbNow=new Date('2026-10-04T01:00:00Z');
  const vb=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,vbNow);
  assert.equal(vb.length,28,'one event per official match');
  assert.equal(new Set(vb.map(e=>e.start_time.slice(0,10)+e.opponent)).size,28,'no match listed twice');
  assert.ok(vb.every(e=>!/#|\bRV\b/.test(e.title)),'rankings dropped');
  const vbFinals=vb.filter(e=>e.status==='Final');
  assert.equal(vbFinals.length,13);
  assert.ok(vbFinals.every(e=>/^[WL], [0-3]-[0-3]$/.test(e.headline)&&e.display_time===e.display_time.replace(/,.*$/,'')&&e.recap_url?.startsWith('https://gobearcats.com/news/2026/')),"every final in K-State's wording, date only, with its own recap");
  assert.deepEqual(vbFinals.filter(e=>['Sep 25','Oct 2'].includes(e.display_time)).map(e=>`${e.title} ${e.headline}`),['Cincinnati vs TCU L, 0-3','Cincinnati at Houston L, 1-3']);
  const vbUpcoming=vb.filter(e=>e.status!=='Final');
  assert.equal(vbUpcoming.length,15);
  assert.ok(vbUpcoming.every(e=>/, \d{1,2}:\d{2} [AP]M$/.test(e.display_time)&&!e.recap_url&&!e.headline),'every upcoming match shows its published time, no result or recap');
  assert.deepEqual(vbUpcoming.filter(e=>/Kansas State|Colorado/.test(e.opponent)).map(e=>`${e.title} ${e.display_time}`),['Cincinnati vs Kansas State Oct 22, 6:30 PM','Cincinnati at Colorado Oct 29, 9:00 PM','Cincinnati at Kansas State Nov 6, 6:00 PM']);
  // Recaps: the card's own link is checked for opponent and date only (the
  // Houston story never says "volleyball"); any other candidate must name the
  // opponent in its headline (the shared matcher took the Sep 4 Valparaiso
  // story for Michigan and Oakland, and the Sep 10 Morehead State story for
  // Michigan State).
  const names=[['Sep 4','recap-volleyball-2026-9-5-valparaiso.html.gz'],['Sep 5','recap-volleyball-2026-9-5-michigan.html.gz'],['Sep 6','recap-volleyball-2026-9-6-oakland.html.gz'],['Sep 10','recap-volleyball-2026-9-10-morehead-state.html.gz'],['Sep 11','recap-volleyball-2026-9-11-michigan-state.html.gz'],['Oct 2','recap-volleyball-2026-10-3-houston.html.gz']];
  const picked=names.map(([day,file])=>({event:vbFinals.find(e=>e.display_time===day),raw:fixture(file)}));
  picked.forEach(({event},i)=>picked.forEach(({event:other,raw},j)=>assert.equal(worker.cincinnatiHandlers.matchesRecap(raw,event,other.recap_url),i===j,`${event.opponent} must match only its own recap (${other.opponent})`)));
  assert.equal(worker.recapMatchesEvent(picked[0].raw,picked[1].event,picked[0].event.recap_url),true,'the shared matcher alone takes the neighbouring story');
  assert.equal(worker.recapMatchesEvent(picked[5].raw,picked[5].event,picked[5].event.recap_url),false,'the shared matcher alone refuses the Houston story');
  // The expanded view writes highlights from the Houston story.
  recapFixtures.set(picked[5].event.recap_url,picked[5].raw);
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Cincinnati won the second set after dropping the first set on the road.','The Bearcats were led in kills by their outside hitters in the match.','Houston took the third and fourth sets to close out the match at home.','Cincinnati continues Big 12 play on the road the following weekend.'])};}}};
  const events=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,vbNow);
  const target=events.find(e=>e.status==='Final'&&e.display_time==='Oct 2');
  await worker.attachOfficialHighlights(events,fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,vbNow,env,target.id);
  assert.equal(target.highlight_state,'recap_generated');
  assert.equal(target.recap_url,picked[5].event.recap_url);
  assert.ok(prompts[0].includes('Houston'));
  // Live score: ESPN's women's college volleyball scoreboard, as K-State's.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>p.path),['volleyball/womens-college-volleyball']);
  const payload=JSON.parse(fixture('volleyball-espn-2026-10-02.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Volleyball');
  const scored=worker.parseScoreboardPayload(payload,school,'Volleyball',provider,'https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?limit=1000&dates=20261002',new Date('2026-10-03T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.opponent,e.status,e.headline]),[['Houston','Final','L, 1-3']]);
  const reconciled=worker.reconcileScoreboardEvents(vb,scored);
  assert.equal(reconciled.length,vb.length,'the scoreboard joins the official match; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Cincinnati at Houston','L, 1-3']]);
}

console.log('Cincinnati module checks passed');
