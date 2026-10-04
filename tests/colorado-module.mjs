import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {coloradoSchool,findColoradoTfrrsMeet} from '../src/schools/colorado.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
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
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,baylorHandlers,cincinnatiHandlers,coloradoHandlers,arizonaHandlers,fetchUrl,fetchLive,featuredAthletes,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));


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
// Sports the module does not read keep the shared parsers.
assert.equal(worker.coloradoHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Lacrosse','https://cubuffs.com/sports/lacrosse/schedule',now),null);

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
    assert.ok(/\{school:coloradoSchool,[^\n]*matchesRecap:\(\.\.\.args\)=>coloradoHandlers\.matchesRecap\(\.\.\.args\)/.test(read('../src/index.js')),'Colorado finals use the Colorado matcher (SCHOOL_MODULES)');
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

// Soccer (women's only): 20 games. The Aug 5 exhibition against Utah reads
// as K-State labels exhibitions; ties read "T, 0-0"; the Aug 12 night game's
// recap is dated the next day. Upcoming games show the published time text
// even where the page data's clock disagrees (Oct 16 at Kansas State:
// "5:30 p.m.", 18:00 in the data).
{
  const scUrl='https://cubuffs.com/sports/womens-soccer/schedule';
  const sc=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',scUrl,now);
  assert.equal(sc.length,20);
  assert.equal(new Set(sc.map(e=>e.id)).size,20);
  const scFinals=sc.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
  assert.deepEqual(scFinals.map(e=>`${e.display_time} ${e.title} ${e.headline}`),[
    'Aug 5 Colorado vs Utah (Exhibition) W, 1-0','Aug 12 Colorado vs Colorado State W, 2-1','Aug 16 Colorado vs Army W, 6-0',
    'Aug 20 Colorado vs Cal State Fullerton W, 3-2','Aug 27 Colorado at Western Michigan T, 0-0','Aug 30 Colorado at Michigan State L, 2-3',
    'Sep 3 Colorado vs New Mexico W, 3-0','Sep 6 Colorado vs Utah State W, 2-0','Sep 11 Colorado vs Denver W, 6-0',
    'Sep 17 Colorado at Iowa State W, 1-0','Sep 24 Colorado vs West Virginia W, 2-0','Sep 27 Colorado at Texas Tech L, 1-3','Oct 2 Colorado at UCF L, 0-2'
  ]);
  assert.equal(scFinals.filter(e=>e.recap_url).length,12,'every final but the Western Michigan tie links its recap');
  assert.equal(scFinals[1].recap_url,'https://cubuffs.com/news/2026/8/13/soccer-zamoranos-first-collegiate-goal-being-the-game-winner');
  assert.deepEqual(sc.filter(e=>e.status!=='Final').map(e=>`${e.title} ${e.display_time}`),[
    'Colorado vs Baylor Oct 8, 7:00 PM','Colorado vs Kansas Oct 11, 1:00 PM','Colorado at Kansas State Oct 16, 5:30 PM','Colorado at Arizona Oct 22, 8:00 PM',
    'Colorado at Arizona State Oct 25, 2:00 PM','Colorado vs Cincinnati Oct 30, 7:00 PM','Colorado vs Oklahoma State Nov 5, 7:00 PM'
  ]);
  assert.equal(sc.find(e=>e.opponent==='Kansas State').start_time,'2026-10-16T17:30:00.000Z','the published text sets the wall clock');
  const linked=scFinals.filter(e=>e.recap_url);
  const scRecaps=linked.map(e=>{const [,y,m,d]=e.recap_url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\//);return fixture(`recap-soccer-${y}-${m}-${d}.html.gz`);});
  linked.forEach((event,i)=>scRecaps.forEach((raw,j)=>assert.equal(worker.coloradoHandlers.matchesRecap(raw,event,linked[j].recap_url),i===j,`${event.display_time} ${event.opponent} must match only its own recap (checked against ${linked[j].display_time})`)));
  // The Western Michigan tie (Aug 27) links no story; Colorado's story is in
  // the soccer archive ("Buffs' First Road Match Ends In A Draw"): dated that
  // day, naming Western Michigan, telling the scoreless draw. The feed and
  // the expanded view both take it.
  {
    const wm=sc.find(e=>e.opponent==='Western Michigan');
    const storyUrl='https://cubuffs.com/news/2026/8/27/soccer-buffs-first-road-match-ends-in-a-draw';
    recapFixtures.set('https://cubuffs.com/sports/womens-soccer/archives',fixture('soccer-archives.html.gz'));
    recapFixtures.set(storyUrl,fixture('story-soccer-2026-8-27-western-michigan.html.gz'));
    assert.ok(worker.coloradoHandlers.isColoradoFinalWithoutStory(wm));
    // A different result is refused: "3-0-1" (the record) is not a 0-1 score.
    const wrong={...wm,school_score:'1',opponent_score:'0',headline:'W, 1-0'};
    await worker.coloradoHandlers.attachArchiveStory(wrong);
    assert.equal(wrong.recap_url,undefined,'a story with another result is not this game\'s');
    // Another opponent on the same day is refused.
    const other={...wm,opponent:'Western Illinois'};
    await worker.coloradoHandlers.attachArchiveStory(other);
    assert.equal(other.recap_url,undefined);
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Colorado played Western Michigan to a scoreless draw in Kalamazoo.','Colorado outshot the Broncos 12-8 with seven shots on goal.','Brooke Goerish made her first collegiate start and recorded two saves.','Jamie Campbell made the crucial save in the final seconds.'])};}}};
    await worker.attachOfficialHighlights(sc,fixture('soccer-schedule.html.gz'),school,'Soccer',scUrl,now,env,wm.id);
    assert.equal(wm.recap_url,storyUrl,'the archive story becomes the recap');
    assert.equal(wm.highlight_state,'recap_generated');
    assert.ok(prompts[0].includes('scoreless draw'));
    // The feed takes it too.
    recapFixtures.set(scUrl,fixture('soccer-schedule.html.gz'));
    const feed=await worker.fetchLive('colorado','Soccer');
    recapFixtures.delete(scUrl);
    assert.equal(feed.events.find(e=>e.opponent==='Western Michigan').recap_url,storyUrl,'the feed links the archive story');
    // Games with their own recap are never searched.
    assert.ok(!worker.coloradoHandlers.isColoradoFinalWithoutStory(sc.find(e=>e.opponent==='Army')));
    assert.ok(!worker.coloradoHandlers.isColoradoFinalWithoutStory({...wm,recap_url:undefined,school_id:'baylor'}));
  }
  // Live score: ESPN's women's college soccer scoreboard; Colorado at UCF
  // (Oct 2) joins the official card.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Soccer').map(p=>p.path),['soccer/usa.ncaa.w.1']);
  const payload=JSON.parse(fixture('soccer-espn-2026-10-02.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Soccer');
  const scored=worker.parseScoreboardPayload(payload,school,'Soccer',provider,'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/scoreboard?limit=1000&dates=20261002',new Date('2026-10-03T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Colorado at UCF','Final','L, 0-2']]);
  const reconciled=worker.reconcileScoreboardEvents(sc,scored);
  assert.equal(reconciled.length,sc.length);
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>e.title),['Colorado at UCF']);
}

// Cross Country: the cards publish team places only ("M-3rd/W-NTS",
// "M-1st/W-1st"); TFRRS adds the points and every Colorado runner.
{
  const xcUrl='https://cubuffs.com/sports/cross-country/schedule';
  const xc=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now);
  assert.deepEqual(xc.map(e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`).sort(),[
    'Final Sep 19 Colorado at Roadrunners Invitational | Women\'s team: 1st / Men\'s team: 1st',
    'Final Sep 4 Colorado at Wyoming Invitational | Men\'s team: 3rd',
    'Upcoming Nov 13 Colorado at NCAA Mountain Region | ','Upcoming Nov 21 Colorado at NCAA Championships | ',
    'Upcoming Oct 31 Colorado at Big 12 Championships | ','Upcoming Oct 9 Colorado at Nuttycombe Invitational | '
  ].sort(),'meets read as K-State\'s: "at", team places women first, no team without a score');
  assert.ok(xc.every(e=>e.event_type==='MEET'));
  const tfrrs={
    'https://www.tfrrs.org/teams/xc/CO_college_f_Colorado.html':fixture('tfrrs-team-women.html.gz'),
    'https://www.tfrrs.org/teams/xc/CO_college_m_Colorado.html':fixture('tfrrs-team-men.html.gz'),
    'https://www.tfrrs.org/results/xc/27698/2026_Roadrunners_Invitational':fixture('tfrrs-xc-roadrunners.html.gz'),
    'https://www.tfrrs.org/results/xc/28504/Wyoming_Invitational':fixture('tfrrs-xc-wyoming.html.gz')
  };
  for(const [url,body] of Object.entries(tfrrs))recapFixtures.set(url,body);
  // The meet is found by date and a shared distinctive word; another meet's
  // name on the same day is not it.
  assert.equal(findColoradoTfrrsMeet(fixture('tfrrs-team-women.html.gz'),{decodeHtml:worker.decodeHtml,date:'2026-09-19',name:'Roadrunners Invitational'}),'https://www.tfrrs.org/results/xc/27698/2026_Roadrunners_Invitational');
  assert.equal(findColoradoTfrrsMeet(fixture('tfrrs-team-women.html.gz'),{decodeHtml:worker.decodeHtml,date:'2026-09-19',name:'Nuttycombe Invitational'}),null);
  const [roadrunners,wyoming]=['Roadrunners Invitational','Wyoming Invitational'].map(name=>xc.find(e=>e.opponent===name));
  await worker.attachOfficialMeetResults(roadrunners);
  assert.equal(roadrunners.headline,'Women\'s team: 1st · 15 pts / Men\'s team: 1st · 15 pts');
  assert.deepEqual([...new Set(roadrunners.results.map(r=>r.group))],['Women\'s 6K','Men\'s 8K']);
  assert.equal(roadrunners.results.filter(r=>r.participant!=='Colorado team').length,15,'every Colorado finisher: 6 women, 9 men (DNF and DNS rows are not results)');
  assert.ok(!roadrunners.results.some(r=>/^0th|DN[FS]/.test(r.result)));
  assert.deepEqual(roadrunners.results.slice(0,2),[{group:'Women\'s 6K',participant:'Colorado team',result:'1st · 15 pts'},{group:'Women\'s 6K',participant:'Adrianna Buitelaar',result:'1st · 20:41.9'}]);
  assert.equal(roadrunners.results_source_url,'https://www.tfrrs.org/results/xc/27698/2026_Roadrunners_Invitational');
  assert.equal(roadrunners.source.url,roadrunners.recap_url,'the source link stays on the official recap');
  assert.ok(roadrunners.highlights_verified&&roadrunners.highlights.length>=3);
  // Wyoming: the women ran without a team score ("W-NTS"; TFRRS lists them
  // 5th with 0 points): no team place, the first finisher instead.
  await worker.attachOfficialMeetResults(wyoming);
  assert.equal(wyoming.headline,'Women\'s: Ella Hagen 2nd / Men\'s team: 3rd · 57 pts');
  assert.ok(!wyoming.results.some(r=>r.group==='Women\'s 5K'&&r.participant==='Colorado team'),'no women\'s team result');
  assert.equal(wyoming.results.filter(r=>r.participant!=='Colorado team').length,9,'4 women, 5 men finished');
  // A team place TFRRS contradicts is refused (the card's headline stays).
  const wrong={...xc.find(e=>e.opponent==='Roadrunners Invitational'),meet_results_verified:false};
  wrong.headline='Women\'s team: 2nd / Men\'s team: 1st';
  await worker.attachOfficialMeetResults(wrong);
  assert.equal(wrong.meet_results_verified,false);
  assert.equal(wrong.headline,'Women\'s team: 2nd / Men\'s team: 1st');
  // The feed attaches them too.
  recapFixtures.set(xcUrl,fixture('cross-country-schedule.html.gz'));
  const feed=await worker.fetchLive('colorado','Cross Country');
  recapFixtures.delete(xcUrl);
  assert.equal(feed.events.find(e=>e.opponent==='Roadrunners Invitational').results.length,17);
  for(const url of Object.keys(tfrrs))recapFixtures.delete(url);
}

// Basketball: the two official pages only (production also loaded the
// generic page and the homepage), labeled; exhibitions read "(Exhibition)";
// published times; the Big 12 Championship runs Mar 9-13.
{
  const urls={mens:'https://cubuffs.com/sports/mens-basketball/schedule',womens:'https://cubuffs.com/sports/womens-basketball/schedule'};
  assert.deepEqual(worker.candidateUrls(school,'Basketball'),[urls.mens,urls.womens]);
  const men=worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball',urls.mens,now);
  const women=worker.parseHtml(fixture('womens-basketball-schedule.html.gz'),school,'Basketball',urls.womens,now);
  assert.deepEqual([men.length,women.length],[34,31]);
  assert.ok([...men,...women].every(e=>e.status==='Upcoming'));
  assert.ok(men.every(e=>e.id.endsWith('-mens'))&&women.every(e=>e.id.endsWith('-womens')),'team ids kept apart');
  assert.deepEqual(men.slice(0,2).map(e=>`${e.title} ${e.display_time}`),['Colorado vs North Texas (Exhibition) Oct 18, 1:00 PM','Colorado vs Abilene Christian Nov 2']);
  assert.equal(women[0].title,'Colorado vs Adams State (Exhibition)');
  const big12=men.at(-1);
  assert.deepEqual([big12.title,big12.display_time,big12.end_time],['Colorado vs Big 12 Championship','Mar 9','2027-03-13T23:59:59Z']);
  // While the tournament is played it is today's event; two days after its
  // last day without a result it is gone.
  const during=worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball',urls.mens,new Date('2027-03-11T18:00:00Z')).find(e=>e.opponent==='Big 12 Championship');
  assert.deepEqual([during.status,during.recency_label],['Today','In progress']);
  assert.ok(!worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball',urls.mens,new Date('2027-03-15T18:00:00Z')).some(e=>e.opponent==='Big 12 Championship'));
  // The feed labels both teams.
  recapFixtures.set(urls.mens,fixture('mens-basketball-schedule.html.gz'));recapFixtures.set(urls.womens,fixture('womens-basketball-schedule.html.gz'));
  const feed=await worker.fetchLive('colorado','Basketball');
  recapFixtures.delete(urls.mens);recapFixtures.delete(urls.womens);
  assert.equal(feed.events.length,65);
  assert.deepEqual(feed.events.filter(e=>e.opponent==='Adams State (Exhibition)').map(e=>e.title),["Women's · Colorado vs Adams State (Exhibition)"]);
  // Live scores: ESPN's men's and women's scoreboards, labeled. On Feb 21,
  // 2026 both teams played at home; Colorado State and Northern Colorado are
  // never taken for Colorado.
  const providers=worker.liveScoreboardProviders(school,'Basketball');
  assert.deepEqual(providers.map(p=>[p.path,p.team_label]),[['basketball/mens-college-basketball',"Men's"],['basketball/womens-college-basketball',"Women's"]]);
  const found=providers.flatMap(provider=>worker.parseScoreboardPayload(JSON.parse(fixture(`basketball-${provider.team_label==="Men's"?'mens':'womens'}-espn-2026-02-21.json.gz`)),school,'Basketball',provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard?groups=50&limit=300&dates=20260221`,new Date('2026-02-22T12:00:00Z')));
  assert.deepEqual(found.map(e=>[e.team_label,e.opponent,e.status]),[["Men's",'Oklahoma St','Final'],["Women's",'Texas Tech','Final']]);
}

// Golf: both teams' pages only, labeled; one event per tournament from its
// rounds, named after it, "Colorado at ..."; the last round's place and
// field ("13th of 20"); only the final story (never "after day one"); a
// tournament under way is today's event, In progress, with no result.
{
  const urls={womens:'https://cubuffs.com/sports/womens-golf/schedule',mens:'https://cubuffs.com/sports/mens-golf/schedule'};
  assert.deepEqual(worker.candidateUrls(school,'Golf'),[urls.womens,urls.mens]);
  assert.ok(worker.schoolCombinedSports(school).has('Golf'));
  const golfNow=new Date('2026-10-03T20:00:00Z');
  const women=worker.parseHtml(fixture('womens-golf-schedule.html.gz'),school,'Golf',urls.womens,golfNow);
  const men=worker.parseHtml(fixture('mens-golf-schedule.html.gz'),school,'Golf',urls.mens,golfNow);
  assert.deepEqual([women.length,men.length],[14,13],'40 and 38 round entries become 14 and 13 tournaments');
  const finals=[...women,...men].filter(e=>e.status==='Final');
  assert.deepEqual(finals.map(e=>`${e.display_time} ${e.title} ${e.headline} ${e.end_time.slice(0,10)}`),[
    'Sep 14 Colorado at Leadership and Golf Invitational 2nd of 17 2026-09-15','Sep 21 Colorado at Golfweek Red Sky Challenge 13th of 20 2026-09-23',
    'Sep 14 Colorado at Vuori Invitational 2nd of 12 2026-09-15','Sep 19 Colorado at Gene Miranda Falcon Invitational 1st of 18 2026-09-21',
    'Sep 25 Colorado at William H. Tucker Intercollegiate 7th of 15 2026-09-26','Sep 29 Colorado at Mark Simpson Colorado Invitational 3rd of 17 2026-09-30'
  ]);
  assert.deepEqual(finals.map(e=>e.recap_url.replace('https://cubuffs.com/news/','')),[
    '2026/9/15/womens-golf-mcvey-buffs-log-second-place-finishes','2026/9/23/womens-golf-buffs-finish-13th-at-red-sky',
    '2026/9/15/mens-golf-buffs-open-season-finishing-second-in-vuori-invitational','2026/9/21/mens-golf-men-golfers-claim-air-forces-miranda-invitational',
    '2026/9/26/mens-golf-golfers-finish-seventh-in-unm-tucker','2026/9/30/mens-golf-golfers-take-third-in-mark-simpson-cu-invitational'
  ],'each tournament links its final story');
  const ronMoore=women.find(e=>e.opponent==='Ron Moore Intercollegiate');
  assert.deepEqual([ronMoore.status,ronMoore.recency_label,ronMoore.headline??null,ronMoore.recap_url??null],['Today','In progress',null,null],'under way: no day-one place or story');
  assert.ok(women.every(e=>e.id.endsWith('-womens'))&&men.every(e=>e.id.endsWith('-mens')));
  // Two days after its last round, a finished tournament with no last-round
  // place reads Completed, never the day-one standing.
  const after=worker.parseHtml(fixture('womens-golf-schedule.html.gz'),school,'Golf',urls.womens,new Date('2026-10-06T20:00:00Z')).find(e=>e.opponent==='Ron Moore Intercollegiate');
  assert.deepEqual([after.status,after.headline,after.recap_url??null],['Final','Completed',null]);
  // Expanded view: each final matches its own story only.
  const stories={'Leadership and Golf Invitational':'leadership','Golfweek Red Sky Challenge':'red-sky','Vuori Invitational':'vuori','Gene Miranda Falcon Invitational':'miranda','William H. Tucker Intercollegiate':'tucker','Mark Simpson Colorado Invitational':'simpson'};
  const raws=finals.map(e=>fixture(`recap-golf-${e.recap_url.match(/\/news\/(\d+\/\d+\/\d+)\//)[1].replace(/\//g,'-')}-${stories[e.opponent]}.html.gz`));
  {
    const redSky=women.find(e=>e.opponent==='Golfweek Red Sky Challenge');
    recapFixtures.set(redSky.recap_url,raws[1]);
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Colorado finished 13th at the Red Sky Classic.','The Buffs improved from 18th after the first round.','A Colorado golfer led the team in the final round.','Colorado moved up five spots over the last two rounds.'])};}}};
    await worker.attachOfficialHighlights(women,fixture('womens-golf-schedule.html.gz'),school,'Golf',urls.womens,golfNow,env,redSky.id);
    assert.equal(redSky.highlight_state,'recap_generated','Red Sky writes its highlights from its final story');
    assert.ok(prompts[0].includes('13th'));
  }
  finals.forEach((event,i)=>raws.forEach((raw,j)=>assert.equal(worker.coloradoHandlers.matchesRecap(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own story (checked against ${finals[j].opponent})`)));
}

// Skiing: the official page only (production also loaded the homepage and
// showed last season's race days as current results). One event per run of
// race days, named after its carnival; a carnival whose alpine and nordic
// races are weeks apart is two events named by discipline. The page's place
// on each day is the standing after it: only a carnival's last run carries
// the final place. The 2027 page has no results yet; the 2026 page (fixture)
// shows a season in K-State's format.
{
  const skiUrl='https://cubuffs.com/sports/skiing/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Skiing'),[skiUrl]);
  const upcoming=worker.parseHtml(fixture('skiing-schedule.html.gz'),school,'Skiing',skiUrl,now);
  assert.equal(upcoming.length,13,'31 race days become 13 events');
  assert.ok(upcoming.every(e=>e.status==='Upcoming'));
  assert.deepEqual(upcoming.slice(0,3).map(e=>`${e.title} ${e.display_time} ${e.end_time.slice(0,10)}`),['Colorado at Utah Invitational (Nordic) Jan 2 2027-01-04','Colorado at RMISA Nordic Qualifier Jan 6 2027-01-07','Colorado at Denver Invitational (Alpine) Jan 15 2027-01-17']);
  assert.ok(upcoming.some(e=>e.opponent==='Utah Invitational (Alpine)'));
  const season=worker.parseHtml(fixture('skiing-schedule-2026.html.gz'),school,'Skiing',skiUrl,new Date('2026-03-20T12:00:00Z'));
  assert.equal(season.length,13,'the next-event widget copy (type "upcoming") is left out');
  const by=name=>season.find(e=>e.opponent===name);
  assert.deepEqual(['Denver Invitational (Alpine)','Denver Invitational (Nordic)','RMISA Nordic Qualifier','NCAA Championships'].map(name=>[by(name).status,by(name).headline,by(name).results[0].label,by(name).results[0].value]),[
    ['Final','Completed','Team standing after these races','1st of 8'],
    ['Final','1st of 9','Result','1st of 9'],
    ['Final','Completed','Result','Completed'],
    ['Final','2nd of 22','Result','2nd of 22']
  ],'the final place only on the carnival\'s last run; a qualifier without team scoring has none');
  assert.equal(by('NCAA Championships').recap_url,'https://cubuffs.com/news/2026/3/14/skiing-buffs-finish-second-at-ncaa-ski-championships','each event links its last day\'s story');
  // Each event's bound story matches it (the story says "DU Invitational").
  const picked=['Denver Invitational (Alpine)','Denver Invitational (Nordic)','NCAA Championships'].map(by);
  const raws=['recap-ski-2026-1-14.html.gz','recap-ski-2026-2-8.html.gz','recap-ski-2026-3-14.html.gz'].map(fixture);
  picked.forEach((event,i)=>raws.forEach((raw,j)=>assert.equal(worker.coloradoHandlers.matchesRecap(raw,event,picked[j].recap_url),i===j,`${event.opponent} must match only its own story`)));
}

// Tennis (women's only): the official page only. Fall tournaments (one
// entry per day) are one event each, "Colorado at ...", with the last day's
// story; a past tournament is listed only with Colorado's story; the one
// under way is In progress; spring duals are games ("W, 4-2"); a tournament
// played in stretches names each by its first round.
{
  const tnUrl='https://cubuffs.com/sports/womens-tennis/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Tennis'),[tnUrl]);
  assert.deepEqual(worker.rosterUrls(school,'Tennis'),['https://cubuffs.com/sports/womens-tennis/roster']);
  const tn=worker.parseHtml(fixture('womens-tennis-schedule.html.gz'),school,'Tennis',tnUrl,now);
  assert.equal(tn.length,34,'72 entries: 9 fall tournaments, 21 duals, Big 12 and 3 NCAA stretches (TBD left out)');
  const finals=tn.filter(e=>e.status==='Final');
  assert.deepEqual(finals.map(e=>`${e.display_time} ${e.title} ${e.headline} ${e.end_time.slice(0,10)} ${e.recap_url.split('/').pop()}`),[
    'Sep 11 Colorado at Milwaukee Classic Completed 2026-09-13 buffs-defeat-wisconsin-to-conclude-milwaukee-tennis-classic',
    'Sep 25 Colorado at Bedford Cup Completed 2026-09-27 tennis-ikeko-gretsch-close-weekend-play-with-pair-of-wins'
  ],'tournaments with their last day\'s story, never a day-one story');
  const bay=tn.find(e=>e.opponent==='Battle in the Bay Classic');
  assert.deepEqual([bay.status,bay.recency_label],['Today','In progress']);
  assert.deepEqual(tn.filter(e=>/^NCAA Team/.test(e.opponent)).map(e=>e.opponent),['NCAA Team Championships (First & Second Rounds)','NCAA Team Championships (Super Regionals)','NCAA Team Championships (Round of 16)']);
  assert.deepEqual(['Portland State','UNLV'].map(name=>tn.find(e=>e.opponent===name).title),['Colorado vs Portland State','Colorado at UNLV'],'duals keep home and away');
  assert.ok(!tn.some(e=>/^TB[AD]$/.test(e.opponent)));
  // A past tournament without a story is left out.
  const storyless=fixture('womens-tennis-schedule.html.gz').replaceAll('\\u002Fnews\\u002F2026\\u002F9\\u002F27\\u002Ftennis-ikeko-gretsch-close-weekend-play-with-pair-of-wins','');
  assert.notEqual(storyless,fixture('womens-tennis-schedule.html.gz'));
  assert.ok(!worker.parseHtml(storyless,school,'Tennis',tnUrl,now).some(e=>e.opponent==='Bedford Cup'));
  // Each tournament's story matches it only.
  const raws=['recap-tennis-2026-9-13-milwaukee.html.gz','recap-tennis-2026-9-27-bedford.html.gz'].map(fixture);
  finals.forEach((event,i)=>raws.forEach((raw,j)=>assert.equal(worker.coloradoHandlers.matchesRecap(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own story`)));
  // Spring duals (the 2025-26 page): W/L finals in K-State's wording, each
  // with its own story.
  const spring=worker.parseHtml(fixture('womens-tennis-schedule-2025-26.html.gz'),school,'Tennis',tnUrl,new Date('2026-04-15T15:00:00Z')).filter(e=>e.start_time>='2026-01');
  const osu=spring.find(e=>e.opponent==='Oklahoma State');
  assert.deepEqual([osu.title,osu.headline,osu.display_time,osu.recap_url],['Colorado vs Oklahoma State','W, 4-2','Mar 8','https://cubuffs.com/news/2026/3/8/tennis-colorado-corrales-cowgirls']);
  assert.ok(worker.coloradoHandlers.matchesRecap(fixture('recap-tennis-2026-3-8-oklahoma-state.html.gz'),osu,osu.recap_url));
  assert.equal(spring.filter(e=>/^[WL], \d-\d$/.test(e.headline||'')).length,23);
}

// Track & Field: the official page only (track-field is SIDEARM's empty
// template). The page still shows 2025-26: a valid empty schedule (every
// Colorado sport keeps only the current July-June season). In season, one
// event per meet ("Colorado at Potts Invitational", Jan 16-17), team places
// women first ("M 12th, W 13th" -> "Women's team: 13th / Men's team: 12th"),
// "Completed" without team scoring.
{
  const tfUrl='https://cubuffs.com/sports/track-and-field/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Track & Field'),[tfUrl]);
  const empty=worker.parseHtml(fixture('track-and-field-schedule.html.gz'),school,'Track & Field',tfUrl,now);
  assert.deepEqual(empty,[]);
  assert.ok(worker.coloradoHandlers.isEmptySchedule(empty),'a verified empty schedule');
  recapFixtures.set(tfUrl,fixture('track-and-field-schedule.html.gz'));
  const live=await worker.fetchLive('colorado','Track & Field');
  recapFixtures.delete(tfUrl);
  assert.equal(live.events.length,0);
  assert.equal(live.error,null,'empty, not unavailable');
  const season=worker.parseHtml(fixture('track-and-field-schedule.html.gz'),school,'Track & Field',tfUrl,new Date('2026-06-20T15:00:00Z'));
  assert.equal(season.length,24,'46 meet days become 24 meets');
  assert.ok(season.every(e=>e.status==='Final'&&e.title.startsWith('Colorado at ')));
  const by=name=>season.find(e=>e.opponent===name);
  assert.deepEqual([by('Potts Invitational').display_time,by('Potts Invitational').end_time.slice(0,10)],['Jan 16','2026-01-17']);
  assert.deepEqual([by('Kit Mayer Classic').display_time,by('Kit Mayer Classic').end_time.slice(0,10)],['Apr 8','2026-04-11']);
  assert.equal(by('Big 12 Indoor Championships').headline,'Women\'s team: 13th / Men\'s team: 12th');
  assert.equal(by('Potts Invitational').headline,'Completed');
  assert.match(by('Potts Invitational').recap_url,/soil-records-as-buffs-conclude-potts-invitational$/,'the last day\'s story');
  assert.match(by('NCAA Indoor Championships').recap_url,/ncaa-indoor-championships$/,'the latest story any day links');
}

// Featured athletes: the official ski roster publishes only two personal
// Instagram links; the third slot takes an official roster profile with its
// portrait (Golf rosters publish none and already fill all three).
{
  const rosterUrl='https://cubuffs.com/sports/skiing/roster';
  recapFixtures.set(rosterUrl,fixture('skiing-roster.html.gz'));
  const athletes=await worker.featuredAthletes('colorado','Skiing');
  recapFixtures.delete(rosterUrl);
  assert.equal(athletes.length,3);
  assert.deepEqual(athletes.filter(a=>a.instagram_url).map(a=>a.name).sort(),['Cathinka Lunder','Justin Bigatel']);
  const profileOnly=athletes.find(a=>!a.instagram_url);
  assert.match(profileOnly.profile_url,/^https:\/\/cubuffs\.com\/sports\/skiing\/roster\//);
  assert.ok(profileOnly.image_url,'an official portrait');
  assert.ok(coloradoSchool.profileFillSports.has('Skiing')&&coloradoSchool.profileFillSports.size===1);
}

console.log('Colorado module checks passed');
