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

// Soccer: the same card reader. Production listed ranked upcoming games twice
// (Colorado Oct 30 and 31, West Virginia Nov 5 and 6), showed a phantom
// recap on Nov 5 and no times.
{
  const socUrl='https://gobearcats.com/sports/womens-soccer/schedule',socNow=new Date('2026-10-04T02:00:00Z');
  const soc=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',socUrl,socNow);
  assert.equal(soc.length,18,'one event per official game; the unscored Aug 8 exhibition is left out');
  assert.ok(!soc.some(e=>/EXH|Evansville/.test(e.title)));
  assert.ok(soc.every(e=>!/#/.test(e.title)),'rankings dropped ("#25 Texas Tech", "#11 Baylor")');
  const socFinals=soc.filter(e=>e.status==='Final');
  assert.equal(socFinals.length,11);
  assert.deepEqual(socFinals.map(e=>e.headline),['W, 3-0','L, 1-2','T, 0-0','L, 0-1','T, 1-1','W, 2-1','T, 0-0','T, 1-1','L, 0-2','L, 1-2','L, 0-2'],"K-State's wording, ties as T");
  assert.ok(socFinals.every(e=>e.recap_url?.startsWith('https://gobearcats.com/news/2026/')&&!/,/.test(e.display_time)));
  const socUpcoming=soc.filter(e=>e.status!=='Final');
  assert.deepEqual(socUpcoming.map(e=>`${e.title} ${e.display_time}`),['Cincinnati vs Utah Oct 8, 7:00 PM','Cincinnati vs BYU Oct 12, 7:00 PM','Cincinnati vs Houston Oct 16, 7:00 PM','Cincinnati at UCF Oct 22, 7:00 PM','Cincinnati vs Kansas State Oct 25, 1:00 PM','Cincinnati at Colorado Oct 30, 9:00 PM','Cincinnati vs West Virginia Nov 5, 7:00 PM'],'published Eastern times, each game once');
  assert.ok(socUpcoming.every(e=>!e.recap_url&&!e.headline));
  // A game from yesterday without a result yet stays (a night game can run
  // past midnight); two days past, it is left out.
  const tcu=fixture('soccer-schedule.html.gz').replace(/(Oct 2<\/time>[\s\S]*?schedule-event-item__result[^>]*>)[\s\S]*?(<div class="schedule-event-item__dashboard-link)/,'$1$2');
  assert.ok(worker.parseHtml(tcu,school,'Soccer',socUrl,new Date('2026-10-03T16:00:00Z')).some(e=>e.opponent==='TCU'&&e.status!=='Final'));
  assert.ok(!worker.parseHtml(tcu,school,'Soccer',socUrl,new Date('2026-10-04T16:00:00Z')).some(e=>e.opponent==='TCU'));
  // Expanded view: the TCU final writes highlights from its own recap.
  const tcuFinal=socFinals.find(e=>e.opponent==='TCU');
  assert.equal(tcuFinal.recap_url,'https://gobearcats.com/news/2026/10/3/cincinnati-falls-to-tcu-on-friday-night');
  recapFixtures.set(tcuFinal.recap_url,fixture('recap-soccer-2026-10-3-tcu.html.gz'));
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['TCU scored once in each half to win the Big 12 match at home.','Cincinnati goalkeeper made several saves to keep the game close.','The Bearcats had their best chances early in the second half.','Cincinnati returns home to face Utah in its next match.'])};}}};
  const events=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',socUrl,socNow);
  const target=events.find(e=>e.status==='Final'&&e.opponent==='TCU');
  await worker.attachOfficialHighlights(events,fixture('soccer-schedule.html.gz'),school,'Soccer',socUrl,socNow,env,target.id);
  assert.equal(target.highlight_state,'recap_generated');
  assert.ok(prompts[0].includes('TCU'));
  // Live score: ESPN's women's college soccer scoreboard; Cincinnati at TCU
  // (Oct 2) joins the official card.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Soccer').map(p=>p.path),['soccer/usa.ncaa.w.1']);
  const payload=JSON.parse(fixture('soccer-espn-2026-10-02.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Soccer');
  const scored=worker.parseScoreboardPayload(payload,school,'Soccer',provider,'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/scoreboard?limit=1000&dates=20261002',new Date('2026-10-03T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.opponent,e.status,e.headline]),[['TCU','Final','L, 0-2']]);
  const reconciled=worker.reconcileScoreboardEvents(soc,scored);
  assert.equal(reconciled.length,soc.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Cincinnati at TCU','L, 0-2']]);
}

// Cross Country: the cards publish each team's place ("2nd (M), 2nd (W)");
// production showed "Completed" with no race rows. Complete results come
// from TFRRS (every Cincinnati runner; the recaps list only the top ones).
{
  const tfrrs={'https://www.tfrrs.org/teams/xc/OH_college_f_Cincinnati.html':'tfrrs-team-women.html.gz','https://www.tfrrs.org/teams/xc/OH_college_m_Cincinnati.html':'tfrrs-team-men.html.gz',
    'https://www.tfrrs.org/results/xc/28714/Gans_Creek_Classic':'tfrrs-2026-gans-creek.html.gz','https://www.tfrrs.org/results/xc/28392/All-Ohio_InterCollegiate_Challenge':'tfrrs-2026-all-ohio.html.gz','https://www.tfrrs.org/results/xc/27952/Redhawk_Rumble':'tfrrs-2026-redhawk-rumble.html.gz'};
  for(const [url,file] of Object.entries(tfrrs))recapFixtures.set(url,fixture(file));
  const xcUrl='https://gobearcats.com/sports/cross-country/schedule',xcNow=new Date('2026-10-04T02:00:00Z');
  const xc=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,xcNow);
  assert.deepEqual(xc.map(e=>`${e.title} ${e.display_time} ${e.status} ${e.headline}`),[
    "Cincinnati at Redhawk Rumble Sep 4 Final Women's team: 2nd / Men's team: 2nd",
    "Cincinnati at All-Ohio Intercollegiate Classic Sep 18 Final Women's team: 1st",
    "Cincinnati at Gans Creek Classic Sep 25 Final Women's team: 24th / Men's team: 15th",
    'Cincinnati at Bradley Pink Classic Oct 16 Upcoming null','Cincinnati vs Big 12 Championships Oct 31 Upcoming null',
    'Cincinnati at NCAA Great Lakes Regional Nov 13 Upcoming null','Cincinnati at NCAA Championships Nov 21 Upcoming null'
  ],"the cards' team places in K-State's headline, women first; dates only");
  const finals=xc.filter(e=>e.status==='Final');
  assert.ok(finals.every(e=>e.recap_url?.startsWith('https://gobearcats.com/news/2026/09/')));
  for(const event of finals)await worker.attachOfficialMeetResults(event);
  const [rumble,allOhio,gans]=finals;
  assert.deepEqual(finals.map(e=>e.headline),["Women's team: 2nd · 43 pts / Men's team: 2nd · 40 pts","Women's team: 1st · 24 pts","Women's team: 24th · 575 pts / Men's team: 15th · 396 pts"],"K-State's headline with TFRRS points");
  assert.deepEqual(finals.map(e=>e.results.length),[18,11,15],'every Cincinnati runner plus the team rows');
  assert.deepEqual([...new Set(gans.results.map(r=>r.group))],["Women's 6K","Men's 8K"],'one group per race, women first; races Cincinnati did not run are left out');
  assert.deepEqual([...new Set(rumble.results.map(r=>r.group))],["Women's 5K","Men's 6K"]);
  assert.deepEqual(gans.results.slice(0,2),[{group:"Women's 6K",participant:'Cincinnati team',result:'24th · 575 pts'},{group:"Women's 6K",participant:'Eloane Le Corre',result:'88th · 21:09.5'}]);
  // TFRRS places are overall ("Deana Hudson 192nd"; the recap listed her
  // team-scoring position, 173); a DNS row is not a result.
  assert.ok(gans.results.some(r=>r.participant==='Deana Hudson'&&r.result==='192nd · 22:06.4'));
  assert.ok(!gans.results.some(r=>/Sarah Madix|DNS|0th/.test(r.participant+r.result)));
  // "All-Ohio Intercollegiate Classic" on the schedule is "All-Ohio
  // InterCollegiate Challenge" on TFRRS: same date, shared name.
  assert.equal(allOhio.results_source_url,'https://www.tfrrs.org/results/xc/28392/All-Ohio_InterCollegiate_Challenge');
  assert.ok(finals.every(e=>e.meet_results_verified&&e.highlights_verified&&e.highlights.length>=3&&e.recap_result_count===e.results.length));
  assert.ok(finals.every(e=>e.source.url===e.recap_url&&/results from TFRRS/.test(e.source.name)),'the source link stays the official recap');
  assert.deepEqual(rumble.highlights.slice(0,3),["Cincinnati's women placed 2nd with 43 points.","Cincinnati's men placed 2nd with 40 points.","Christina Allen led Cincinnati in the women's 5K, finishing 4th in 18:33.1."]);
  // A place TFRRS disagrees with refuses its rows (the schedule's stays).
  const wrong=worker.parseHtml(fixture('cross-country-schedule.html.gz').replace('15th (M), 24th (W)','14th (M), 24th (W)'),school,'Cross Country',xcUrl,xcNow).find(e=>e.opponent==='Gans Creek Classic');
  await worker.attachOfficialMeetResults(wrong);
  assert.equal(wrong.meet_results_verified,false);
  assert.equal(wrong.headline,"Women's team: 24th / Men's team: 14th");
  // The expanded view reaches the same rows.
  const events=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,xcNow);
  const target=events.find(e=>e.opponent==='Gans Creek Classic');
  await worker.attachOfficialHighlights(events,fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,xcNow,{},target.id);
  assert.deepEqual(target.results,gans.results);
  assert.equal(target.highlight_state,'official_recap_results');
  // ESPN publishes no cross country scoreboard (K-State has none).
  assert.deepEqual(worker.liveScoreboardProviders(school,'Cross Country'),[]);
}

// Basketball: the two official pages only (production also loaded the
// generic /sports/basketball/ page and the homepage), labeled by team.
{
  assert.deepEqual(worker.candidateUrls(school,'Basketball'),['https://gobearcats.com/sports/mens-basketball/schedule','https://gobearcats.com/sports/womens-basketball/schedule']);
  assert.ok(worker.schoolCombinedSports(school).has('Basketball'));
  const bbNow=new Date('2026-10-04T02:00:00Z');
  const men=worker.parseHtml(fixture('basketball-mens-schedule.html.gz'),school,'Basketball','https://gobearcats.com/sports/mens-basketball/schedule',bbNow);
  const women=worker.parseHtml(fixture('basketball-womens-schedule.html.gz'),school,'Basketball','https://gobearcats.com/sports/womens-basketball/schedule',bbNow);
  assert.deepEqual([men.length,women.length],[37,32],'one event per official game');
  assert.ok(men.every(e=>e.id.endsWith('-mens'))&&women.every(e=>e.id.endsWith('-womens')),'team ids keep same-day games apart');
  // The men's August Bahamas tour games are the only finals, with their recaps.
  assert.deepEqual(men.filter(e=>e.status==='Final').map(e=>`${e.title} ${e.display_time} ${e.headline}`),['Cincinnati vs Victoria Aug 4 W, 110-63','Cincinnati vs Calgary Aug 5 W, 107-66']);
  assert.ok(men.filter(e=>e.status==='Final').every(e=>e.recap_url?.startsWith('https://gobearcats.com/news/2026/08/')));
  // Published Eastern times; "TBA" shows the date only.
  assert.deepEqual(men.slice(2,6).map(e=>`${e.title} ${e.display_time}`),['Cincinnati vs Ohio State Oct 7, 3:00 PM','Cincinnati vs Illinois Oct 17, 7:00 PM','Cincinnati vs Oakland Oct 27, 7:00 PM','Cincinnati vs American Nov 2']);
  // The women's page heads its first game "Exhibition".
  assert.deepEqual(women.slice(0,2).map(e=>`${e.title} ${e.display_time}`),['Cincinnati vs Georgetown College (Exhibition) Oct 28, 6:30 PM','Cincinnati vs East Texas A&M Nov 4, 6:30 PM']);
  assert.equal(women.filter(e=>/Exhibition/.test(e.title)).length,1);
  // Live scores: ESPN's men's and women's scoreboards, labeled to match the
  // official cards. Binghamton (also "Bearcats") is never Cincinnati.
  const providers=worker.liveScoreboardProviders(school,'Basketball');
  assert.deepEqual(providers.map(p=>[p.path,p.team_label]),[['basketball/mens-college-basketball',"Men's"],['basketball/womens-college-basketball',"Women's"]]);
  const scored=[['basketball-mens-espn-2026-02-21.json.gz',providers[0]],['basketball-womens-espn-2026-02-21.json.gz',providers[1]]].flatMap(([file,provider])=>worker.parseScoreboardPayload(JSON.parse(fixture(file)),school,'Basketball',provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard?groups=50&limit=300&dates=20260221`,new Date('2026-02-22T12:00:00Z')));
  assert.deepEqual(scored.map(e=>[e.team_label,e.opponent,e.status]),[["Men's",'Kansas','Final'],["Women's",'UCF','Final']]);
  const payload=JSON.parse(fixture('basketball-mens-espn-2026-02-21.json.gz'));
  assert.ok(payload.events.some(e=>/Binghamton Bearcats/.test(e.name)));
}

// Baseball: the official page only (production also loaded the homepage).
// The page publishes the 2027 spring season.
{
  assert.deepEqual(worker.candidateUrls(school,'Baseball'),['https://gobearcats.com/sports/baseball/schedule']);
  const bsUrl='https://gobearcats.com/sports/baseball/schedule';
  const bs=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball',bsUrl,new Date('2026-10-04T02:00:00Z'));
  assert.equal(bs.length,57,'one event per official game');
  assert.equal(new Set(bs.map(e=>e.id)).size,57,'series games on consecutive days stay apart');
  assert.ok(bs.every(e=>e.status==='Upcoming'&&!e.headline&&!e.recap_url));
  assert.deepEqual(bs.filter(e=>/Utah|Tennessee/.test(e.opponent)).map(e=>`${e.title} ${e.display_time}`),['Cincinnati vs Tennessee Feb 26, 6:00 PM','Cincinnati at Utah Mar 19, 8:00 PM','Cincinnati at Utah Mar 20, 8:00 PM','Cincinnati at Utah Mar 21, 2:00 PM'],'published Eastern times');
  assert.equal(bs[0].display_time,'Feb 19','"TBA" shows the date only');
  // The Big 12 Tournament runs May 25-29 and stays listed while it is played.
  const tournament=bs.find(e=>e.opponent==='Big 12 Tournament');
  assert.equal(tournament.end_time,'2027-05-29T23:59:59Z');
  assert.deepEqual(worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball',bsUrl,new Date('2027-05-28T16:00:00Z')).map(e=>e.opponent),['Big 12 Tournament'],'a tournament in progress stays');
  // After it, nothing on the page is current: a valid empty schedule, never
  // handed to the shared parsers.
  const after=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball',bsUrl,new Date('2027-06-15T16:00:00Z'));
  assert.deepEqual(after,[]);
  assert.ok(worker.cincinnatiHandlers.isEmptySchedule(worker.cincinnatiHandlers.parseSchedule(fixture('baseball-schedule.html.gz'),school,'Baseball',bsUrl,new Date('2027-06-15T16:00:00Z'))));
  // Live score: ESPN's college baseball scoreboard. Apr 10, 2026: Baylor at
  // Cincinnati.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Baseball').map(p=>p.path),['baseball/college-baseball']);
  const [provider]=worker.liveScoreboardProviders(school,'Baseball');
  const scored=worker.parseScoreboardPayload(JSON.parse(fixture('baseball-espn-2026-04-10.json.gz')),school,'Baseball',provider,'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?limit=1000&dates=20260410',new Date('2026-04-11T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.opponent,e.status,/^[WL], \d+-\d+$/.test(e.headline)]),[['Baylor','Final',true]]);
}

// Golf: both teams' official pages only (production loaded the women's page
// alone and showed one event per round), labeled, one event per tournament.
{
  assert.deepEqual(worker.candidateUrls(school,'Golf'),['https://gobearcats.com/sports/mens-golf/schedule','https://gobearcats.com/sports/womens-golf/schedule']);
  assert.ok(worker.schoolCombinedSports(school).has('Golf'));
  const gNow=new Date('2026-10-04T02:00:00Z'),menUrl='https://gobearcats.com/sports/mens-golf/schedule',womenUrl='https://gobearcats.com/sports/womens-golf/schedule';
  const men=worker.parseHtml(fixture('golf-mens-schedule.html.gz'),school,'Golf',menUrl,gNow);
  const women=worker.parseHtml(fixture('golf-womens-schedule.html.gz'),school,'Golf',womenUrl,gNow);
  assert.deepEqual([men.length,women.length],[11,12],'25 and 28 round cards become one event per tournament');
  assert.ok(men.every(e=>e.id.endsWith('-mens'))&&women.every(e=>e.id.endsWith('-womens')));
  assert.ok([...men,...women].every(e=>/^Cincinnati at /.test(e.title)),'tournaments read "at" (the women\'s cards say "vs.")');
  const finals=[...men,...women].filter(e=>e.status==='Final');
  assert.deepEqual(finals.map(e=>`${e.opponent} ${e.display_time} ${e.headline} ${e.end_time.slice(0,10)}`),[
    'Folds of Honor Collegiate Sep 7 4th of 14 2026-09-09','Bearcat Invitational Sep 14 3rd of 17 2026-09-15','Gopher Invitational Sep 20 4th of 15 2026-09-21',
    'Bettie Lou Evans Invitational Sep 21 6th of 13 2026-09-22','Powercat Invitational Sep 28 2nd of 12 2026-09-29'
  ],"the last round's place and field, K-State's \"1st of 12\" form (no team total is published)");
  // Each tournament links its final story, not a day-one story ("Bearcats
  // sit eighth after 18 holes").
  assert.deepEqual(finals.map(e=>e.recap_url.replace('https://gobearcats.com/news/','')),[
    '2026/09/10/bearcats-finish-fourth-at-folds-of-honor-collegiate','2026/09/15/cincinnati-climbs-to-third-to-conclude-bearcat-invitational','2026/09/21/cincinnati-finishes-fourth-at-gopher-invitational',
    '2026/09/22/rymer-bearcats-finish-sixth-at-bettie-lou-evans-invitational','2026/09/29/cincinnati-earns-runner-up-finish-at-powercat-classic']);
  // The Blessings Collegiate (Oct 3-5) is under way after one round: today's
  // event, no result yet. Once over, it is a final.
  const blessings=women.find(e=>e.opponent==='Blessings Collegiate Invitational');
  assert.deepEqual([blessings.status,blessings.recency_label,blessings.headline,blessings.end_time],['Today','In progress',undefined,'2026-10-05T23:59:59Z']);
  assert.ok(blessings.id.endsWith('-today-womens'));
  assert.equal(worker.parseHtml(fixture('golf-womens-schedule.html.gz'),school,'Golf',womenUrl,new Date('2026-10-06T16:00:00Z')).find(e=>e.opponent==='Blessings Collegiate Invitational').status,'Final');
  assert.deepEqual(men.filter(e=>e.status!=='Final').slice(0,2).map(e=>`${e.title} ${e.display_time} ${e.end_time.slice(0,10)}`),['Cincinnati at Cullan Brown Collegiate Oct 5 2026-10-06','Cincinnati at Big 12 Match Play Oct 12 2026-10-14'],'upcoming tournaments, dates only');
  // Expanded view: the final story, checked against the last day (Sep 10
  // for Sep 7-9).
  const folds=finals[0],powercat=finals[4];
  assert.ok(worker.cincinnatiHandlers.matchesRecap(fixture('recap-golf-2026-9-10-folds-of-honor.html.gz'),folds,folds.recap_url));
  assert.ok(worker.cincinnatiHandlers.matchesRecap(fixture('recap-golf-2026-9-29-powercat.html.gz'),powercat,powercat.recap_url),'"Powercat Classic" in the story');
  assert.ok(!worker.cincinnatiHandlers.matchesRecap(fixture('recap-golf-2026-9-29-powercat.html.gz'),folds,powercat.recap_url));
  recapFixtures.set(folds.recap_url,fixture('recap-golf-2026-9-10-folds-of-honor.html.gz'));
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Cincinnati finished fourth in the 14-team field at the Folds of Honor Collegiate.','The Bearcats climbed from eighth after the first round to finish the event.','A Cincinnati golfer posted a top-10 individual finish for the tournament.','Cincinnati returns to action at its home event the following week.'])};}}};
  const events=worker.parseHtml(fixture('golf-mens-schedule.html.gz'),school,'Golf',menUrl,gNow);
  const target=events.find(e=>e.opponent==='Folds of Honor Collegiate');
  await worker.attachOfficialHighlights(events,fixture('golf-mens-schedule.html.gz'),school,'Golf',menUrl,gNow,env,target.id);
  assert.equal(target.highlight_state,'recap_generated');
  assert.ok(prompts[0].includes('Folds of Honor'));
  // ESPN publishes no college golf scoreboard (K-State has none).
  assert.deepEqual(worker.liveScoreboardProviders(school,'Golf'),[]);
}

// Lacrosse: the women's official page only (production also tried men's and
// generic pages and the homepage). In October 2026 the page still shows the
// spring 2026 season, which production showed as current results.
{
  assert.deepEqual(worker.candidateUrls(school,'Lacrosse'),['https://gobearcats.com/sports/womens-lacrosse/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Lacrosse'),['https://gobearcats.com/sports/womens-lacrosse/roster']);
  const laxUrl='https://gobearcats.com/sports/womens-lacrosse/schedule';
  const now2026=worker.cincinnatiHandlers.parseSchedule(fixture('lacrosse-schedule.html.gz'),school,'Lacrosse',laxUrl,new Date('2026-10-04T02:00:00Z'));
  assert.deepEqual(now2026,[],'only the current academic year (July-June) is current');
  assert.ok(worker.cincinnatiHandlers.isEmptySchedule(now2026),'a valid empty schedule: the app shows its empty-schedule note');
  // In season (the same page read on Apr 25, 2026): 17 finals in K-State's
  // wording with their recaps.
  const spring=worker.parseHtml(fixture('lacrosse-schedule.html.gz'),school,'Lacrosse',laxUrl,new Date('2026-04-25T16:00:00Z'));
  assert.equal(spring.length,17);
  assert.ok(spring.every(e=>e.status==='Final'&&/^[WL], \d+-\d+$/.test(e.headline)&&e.recap_url?.startsWith('https://gobearcats.com/news/2026/')));
  assert.deepEqual(spring.filter(e=>/Louisville|Colorado|Florida/.test(e.opponent)).map(e=>`${e.title} ${e.headline}`),['Cincinnati vs Louisville L, 10-11','Cincinnati at Colorado L, 5-10','Cincinnati vs Florida L, 5-16'],'rankings dropped; overtime results read as K-State\'s');
}

// Swimming & Diving: one official page for both teams (production tried
// seven men's/women's/generic routes and the homepage).
{
  assert.deepEqual(worker.candidateUrls(school,'Swimming & Diving'),['https://gobearcats.com/sports/swimming-and-diving/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Swimming & Diving'),['https://gobearcats.com/sports/swimming-and-diving/roster']);
  assert.ok(!worker.schoolCombinedSports(school).has('Swimming & Diving'),'one page lists both teams');
  const sw=worker.parseHtml(fixture('swimming-diving-schedule.html.gz'),school,'Swimming & Diving','https://gobearcats.com/sports/swimming-and-diving/schedule',new Date('2026-10-04T02:00:00Z'));
  assert.deepEqual(sw.map(e=>`${e.title} ${e.display_time}${e.end_time?' - '+e.end_time.slice(5,10):''}`),[
    'Cincinnati vs Northern Ky. Oct 10, 9:00 AM','Cincinnati at Miami (OH) Oct 16, 2:00 PM','Cincinnati at West Virginia and Delaware Oct 23, 5:00 PM - 10-24',
    'Cincinnati at Ohio State Invitational Nov 17 - 11-20','Cincinnati at CSCAA Open Water Championships Dec 12, 8:00 AM','Cincinnati at Big 12 East Dual Meet Championships Jan 16 - 01-17',
    'Cincinnati vs Xavier Jan 22, 12:00 PM','Cincinnati vs Kentucky Jan 29, 11:30 AM','Cincinnati at Louisville Jan 30, 12:00 PM',
    'Cincinnati at Big 12 Championships Feb 23 - 02-27','Cincinnati at NCAA Zone Diving Championships Mar 8 - 03-10',"Cincinnati at Women's NCAA Championships Mar 17 - 03-20","Cincinnati at Men's NCAA Championships Mar 24 - 03-27"
  ],'dual meets with their published times; invitationals named after their heading ("at Ohio St." is the Ohio State Invitational), ending on their last day');
  assert.ok(sw.every(e=>e.status==='Upcoming'&&!e.headline));
  assert.deepEqual(worker.liveScoreboardProviders(school,'Swimming & Diving'),[]);
}

// Track & Field: the official track-field page only (production also tried
// track-and-field and the homepage). In October 2026 it still shows 2025-26.
{
  assert.deepEqual(worker.candidateUrls(school,'Track & Field'),['https://gobearcats.com/sports/track-field/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Track & Field'),['https://gobearcats.com/sports/track-field/roster']);
  const tfUrl='https://gobearcats.com/sports/track-field/schedule';
  const current=worker.cincinnatiHandlers.parseSchedule(fixture('track-field-schedule.html.gz'),school,'Track & Field',tfUrl,new Date('2026-10-04T02:00:00Z'));
  assert.deepEqual(current,[]);
  assert.ok(worker.cincinnatiHandlers.isEmptySchedule(current),'a valid empty schedule until 2026-27 is published');
  // In season (the same page read as of Jun 15, 2026): one event per meet,
  // ending on its last day, each with its story; team places in K-State's form.
  const season=worker.parseHtml(fixture('track-field-schedule.html.gz'),school,'Track & Field',tfUrl,new Date('2026-06-15T16:00:00Z'));
  assert.equal(season.length,22);
  assert.ok(season.every(e=>e.status==='Final'&&e.recap_url?.startsWith('https://gobearcats.com/news/')));
  assert.deepEqual(season.filter(e=>/team/.test(e.headline)).map(e=>`${e.title} ${e.headline}`),["Cincinnati at Big 12 Indoor Championships Women's team: 10th / Men's team: 10th","Cincinnati at Big 12 Outdoor Championship Women's team: 7th / Men's team: 12th"]);
  assert.equal(season.find(e=>e.opponent==='NCAA Outdoor Championships').end_time,'2026-06-13T23:59:59Z');
  assert.ok(season.every(e=>e.headline),'meets without a published place read "Completed"');
  assert.deepEqual(worker.liveScoreboardProviders(school,'Track & Field'),[]);
}

console.log('Cincinnati module checks passed');
