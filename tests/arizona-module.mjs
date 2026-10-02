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
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='arizona');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));


// Module ownership: every sponsored sport has explicit arizonawildcats.com
// routes, exactly the candidates production used before the module (route
// parity, 219/219 catalog routes identical).
const sports=sponsoredSports.arizona;
assert.equal(sports.length,13);
for(const [name,map] of [['schedule',arizonaSchool.scheduleUrls],['roster',arizonaSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('arizona|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'arizonawildcats.com',`${key} must stay on arizonawildcats.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(arizonaSchool.scheduleUrls[`arizona|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(arizonaSchool.rosterUrls[`arizona|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'arizona\|/.test(read('../src/index.js')),'Arizona configuration must live in its module, not shared code');
// Arizona State is a different school with its own module.
assert.equal(worker.candidateUrls(schools.find(s=>s.id==='arizona-state'),'Football')[0],'https://thesundevils.com/sports/football/schedule');

// Football: arizonawildcats.com (SIDEARM) embeds every game as page data with
// its local start, home/away, result and recap. The shared parsers read only
// the rendered cards, which omit the start time.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/arizona-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://arizonawildcats.com/sports/football/schedule',now=new Date('2026-10-02T19:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,13,'one event per official game');
assert.equal(new Set(football.map(e=>e.id)).size,13,'no duplicate events');
const finals=football.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score,e.start_time]),[
  ['Sep 5','Arizona vs Northern Arizona','W, 35-7','35','7','2026-09-05T12:00:00.000Z'],['Sep 12','Arizona at BYU','L, 17-28','17','28','2026-09-12T12:00:00.000Z'],
  ['Sep 19','Arizona vs Northern Illinois','W, 42-17','42','17','2026-09-19T12:00:00.000Z'],['Sep 26','Arizona at Washington State','W, 34-24','34','24','2026-09-26T12:00:00.000Z']
],'finals read as K-State\'s: W/L and the date only');
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),[
  'https://arizonawildcats.com/news/2026/9/5/football-noah-fifita-throws-for-2-tds-arizona-opens-season-with-35-7-blowout-of-northern-arizona',
  'https://arizonawildcats.com/news/2026/9/12/football-arizona-drops-road-battle-at-no-15-byu-28-17',
  'https://arizonawildcats.com/news/2026/9/19/football-noah-fifita-breaks-arizonas-all-time-passing-mark-as-wildcats-roll-over-northern-illinois-42-17',
  'https://arizonawildcats.com/news/2026/9/26/football-fifita-throws-4-touchdown-passes-in-arizonas-34-24-win-over-washington-state'
],'every final links its own official recap (not the game book PDF)');
const upcoming=football.filter(e=>e.status!=='Final');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'Arizona vs Cincinnati Oct 3, 8:00 PM','Arizona at West Virginia Oct 10, 9:00 AM','Arizona vs Iowa State Oct 24','Arizona at Texas Tech Oct 31',
  'Arizona vs TCU Nov 6, 8:15 PM','Arizona vs Utah Nov 14','Arizona at Kansas State Nov 21','Arizona vs Arizona State Nov 28','Arizona vs Big 12 Football Championship Dec 4'
],'published local (Arizona) start times; "TBA" shows the date only');
assert.equal(upcoming[0].start_time,'2026-10-03T20:00:00.000Z','start times are Arizona wall clock');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[4,9]);
assert.deepEqual(group.results.map(e=>e.display_time),['Sep 26','Sep 19','Sep 12','Sep 5'],'results newest first, as K-State');
// Pages from any other host or path are left to the shared parsers.
assert.equal(worker.arizonaHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://arizonawildcats.com/',now),null);

// Expanded view: each final matches only its own recap, and its highlights
// are written from that article.
const recaps=['recap-football-2026-09-05-northern-arizona.html.gz','recap-football-2026-09-12-byu.html.gz','recap-football-2026-09-19-northern-illinois.html.gz','recap-football-2026-09-26-washington-state.html.gz'].map(fixture);
finals.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
finals.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.recapMatchesEvent(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
for(const [i,expected] of [[0,'Northern Arizona'],[1,'BYU'],[2,'Northern Illinois'],[3,'Washington State']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Arizona scored on its first drive of the game against the visitors.','The Wildcats defense forced two turnovers in the first half of play.','Arizona added two more touchdowns in the third quarter to pull away.','The Wildcats closed out the game with a long drive in the fourth quarter.'])};}}};
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

// Live scores: ESPN's college football scoreboard lists only ~25 featured
// games for "limit=1000"; Arizona's provider asks for the FBS group. The Sep 26
// payload also holds Kansas State and Kentucky (both "Wildcats") and Arizona
// State; only Arizona at Washington State is Arizona's.
{
  assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(p=>[p.path,p.query]),[['football/college-football','groups=80&limit=300']]);
  const payload=JSON.parse(fixture('football-espn-2026-09-26.json.gz'));
  const names=payload.events.map(e=>e.name);
  assert.ok(names.includes('Kansas State Wildcats at Cincinnati Bearcats')&&names.includes('South Alabama Jaguars at Kentucky Wildcats'));
  const provider=arizonaSchool.liveScoreboards.Football[0],scoreUrl='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=20260926';
  const scored=worker.parseScoreboardPayload(payload,school,'Football',provider,scoreUrl,new Date('2026-09-27T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.school_score,e.opponent_score]),[['Arizona at Washington St','Final','34','24']],'ESPN names the opponent; the official card keeps its own title');
  const reconciled=worker.reconcileScoreboardEvents(football,scored);
  assert.equal(reconciled.length,football.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Arizona at Washington State','W, 34-24']]);
  // The provider's own query is what is requested.
  const asked=[];
  const scoreboardFetch=Function(...Object.keys(deps),source+';return fetchLiveScoreboards;')(...Object.values({...deps,fetch:async url=>{asked.push(String(url));return{ok:true,json:async()=>payload};}}));
  const live=await scoreboardFetch(school,'Football',new Date('2026-09-26T23:00:00Z'));
  assert.deepEqual(asked,['20260925','20260926','20260927'].map(day=>`https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=${day}`));
  assert.equal(live.length,1);
  // Other schools keep the default request.
  assert.deepEqual(worker.liveScoreboardProviders(schools.find(s=>s.id==='kstate'),'Football').map(p=>p.query),[undefined]);
}

// Volleyball: the same page data. Production showed rankings in opponent
// names ("Arizona at #21 Colorado") and dates without times. The Red-Blue
// scrimmage and the two exhibitions played without a published score are
// left out.
{
  const url='https://arizonawildcats.com/sports/womens-volleyball/schedule';
  const volleyball=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',url,now);
  assert.equal(volleyball.length,29,'32 page games less the scrimmage and two unscored exhibitions');
  assert.equal(new Set(volleyball.map(e=>e.id)).size,29,'no duplicate events');
  assert.ok(!volleyball.some(e=>/Scrimmage|Exhibition|\(Exh/i.test(e.opponent)));
  const played=volleyball.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
  assert.equal(played.length,12);
  assert.deepEqual(played.slice(-4).map(e=>[e.display_time,e.title,e.headline]),[
    ['Sep 17','Arizona at San Diego','L, 0-3'],['Sep 18','Arizona at San Diego State','W, 3-2'],['Sep 22','Arizona at UTEP','W, 3-1'],['Sep 27','Arizona at Colorado','L, 2-3']
  ],'rankings ("#21 Colorado") are dropped; results read as K-State\'s');
  assert.deepEqual(played.filter(e=>/USC|Creighton/.test(e.opponent)).map(e=>e.title),['Arizona at Creighton','Arizona at USC']);
  // Neutral-site tournament games read as the page's own vs./at.
  assert.deepEqual(played.filter(e=>['Tulsa','Pepperdine','Oregon State'].includes(e.opponent)).map(e=>e.title),['Arizona vs Tulsa','Arizona vs Pepperdine','Arizona vs Oregon State']);
  assert.ok(played.every(e=>/^https:\/\/arizonawildcats\.com\/news\/2026\/\d+\/\d+\/[\w-]+$/.test(e.recap_url)),'every final links its own recap');
  const next=volleyball.filter(e=>e.status!=='Final');
  assert.equal(next.length,17);
  assert.deepEqual(next.slice(0,4).map(e=>`${e.title} ${e.display_time}`),['Arizona vs Iowa State Oct 2, 6:00 PM','Arizona vs Texas Tech Oct 4, 12:00 PM','Arizona at TCU Oct 9, 4:30 PM','Arizona at Baylor Oct 11, 12:00 PM']);
  assert.equal(next[0].status,'Today');
  assert.ok(next.every(e=>!e.recap_url&&!e.headline),'no upcoming match inherits a result');
  // Each recap matches its own match only (the Oregon State story's address
  // does not say "volleyball").
  const pairs=[['recap-volleyball-2026-09-27-colorado.html.gz','Colorado'],['recap-volleyball-2026-09-22-utep.html.gz','UTEP'],['recap-volleyball-2026-09-12-oregon-state.html.gz','Oregon State']].map(([name,opponent])=>[fixture(name),played.find(e=>e.opponent===opponent)]);
  for(const [raw,event] of pairs)for(const [,other] of pairs)assert.equal(worker.arizonaHandlers.matchesRecap(raw,other,event.recap_url),event===other,`${other.opponent} must match only its own recap`);
  // "Arizona Falls to UCSB in Three Sets": the opponent's initials count for
  // the game's own recap only.
  const ucsb=fixture('recap-volleyball-2026-08-30-uc-santa-barbara.html.gz'),ucsbEvent=played.find(e=>e.opponent==='UC Santa Barbara');
  assert.equal(worker.recapMatchesEvent(ucsb,ucsbEvent,ucsbEvent.recap_url),false);
  assert.equal(worker.arizonaHandlers.matchesRecap(ucsb,ucsbEvent,ucsbEvent.recap_url),true);
  assert.equal(worker.arizonaHandlers.matchesRecap(ucsb,ucsbEvent,'https://arizonawildcats.com/news/2026/8/30/other'),false);
  for(const other of played.filter(e=>e!==ucsbEvent))assert.equal(worker.arizonaHandlers.matchesRecap(ucsb,other,ucsbEvent.recap_url),false,`${other.opponent} must not take the UCSB recap`);
  const [oregon,oregonEvent]=pairs[2];
  assert.equal(worker.recapMatchesEvent(oregon,oregonEvent,oregonEvent.recap_url),false,'the shared matcher needs the sport word');
  assert.equal(worker.arizonaHandlers.matchesRecap(oregon,oregonEvent,'https://arizonawildcats.com/news/2026/9/12/other'),false,'only the game\'s own recap skips the sport word');
  // The expanded view keeps the game's own recap and writes from it.
  recapFixtures.set(oregonEvent.recap_url,oregon);
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Arizona beat Oregon State in four sets at the USC Tournament.','The Wildcats hit well in the second and third sets of the match.','Arizona closed out the fourth set to earn the victory over the Beavers.','The win snapped a losing streak for the Wildcats on the weekend.'])};}}};
  const events=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',url,now);
  const target=events.find(e=>e.opponent==='Oregon State');
  await worker.attachOfficialHighlights(events,fixture('volleyball-schedule.html.gz'),school,'Volleyball',url,now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated');
  assert.equal(target.recap_url,oregonEvent.recap_url);
  assert.ok(prompts[0].includes('Oregon State'));
  // Live: ESPN's volleyball scoreboard (as K-State's). The Sep 27 payload
  // holds five other "Wildcats" (Kentucky, Kansas State, New Hampshire,
  // Bethune-Cookman, and Arizona State's opponent); only Arizona at Colorado
  // is Arizona's.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>p.path),['volleyball/womens-college-volleyball']);
  const payload=JSON.parse(fixture('volleyball-espn-2026-09-27.json.gz'));
  assert.ok(payload.events.some(e=>e.name==='Arizona State Sun Devils at Cincinnati Bearcats'),'Arizona State played the same day: it must not be taken for Arizona');
  const scoreUrl='https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?limit=1000&dates=20260927';
  const scored=worker.parseScoreboardPayload(payload,school,'Volleyball',arizonaSchool.liveScoreboards.Volleyball[0],scoreUrl,new Date('2026-09-28T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Arizona at Colorado','Final','L, 2-3']]);
  const reconciled=worker.reconcileScoreboardEvents(volleyball,scored);
  assert.equal(reconciled.length,volleyball.length,'the scoreboard joins the official match; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Arizona at Colorado','L, 2-3']]);
}

// Soccer: Arizona sponsors women's soccer only. Production showed rankings
// ("No. 23 BYU", "No. 9 UNC") and dates without times, and the Big 12
// tournament game as "Arizona vs TBA".
{
  const url='https://arizonawildcats.com/sports/womens-soccer/schedule';
  const soccer=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',url,now);
  assert.equal(soccer.length,21,'one event per official game');
  assert.equal(new Set(soccer.map(e=>e.id)).size,21);
  const played=soccer.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
  assert.equal(played.length,12);
  assert.deepEqual(played.map(e=>`${e.display_time} ${e.title} ${e.headline}`),[
    'Aug 5 Arizona at UC Irvine (Exhibition) T, 0-0','Aug 12 Arizona at GCU L, 0-2','Aug 15 Arizona vs New Mexico State W, 2-0','Aug 20 Arizona at Gonzaga W, 2-1',
    'Aug 30 Arizona vs LSU T, 1-1','Sep 3 Arizona vs UNC L, 1-2','Sep 6 Arizona vs Dartmouth L, 0-1','Sep 10 Arizona vs NAU W, 3-0',
    'Sep 13 Arizona at Pepperdine L, 0-2','Sep 18 Arizona vs BYU T, 1-1','Sep 24 Arizona at Kansas State T, 1-1','Sep 27 Arizona at Kansas L, 0-2'
  ],'rankings dropped; the scored exhibition is labeled; ties read T');
  // Three finals have no recap on the page; none is invented.
  assert.deepEqual(played.filter(e=>!e.recap_url).map(e=>e.opponent),['LSU','NAU','Pepperdine']);
  const next=soccer.filter(e=>e.status!=='Final');
  assert.deepEqual(next.map(e=>`${e.title} ${e.display_time}`),[
    'Arizona at Oklahoma State Oct 2, 5:00 PM','Arizona vs Houston Oct 8, 7:00 PM','Arizona vs Iowa State Oct 11, 1:00 PM','Arizona at Utah Oct 16, 6:00 PM',
    'Arizona vs Colorado Oct 22, 7:00 PM','Arizona vs Baylor Oct 25, 12:00 PM','Arizona at Arizona State Oct 30, 7:00 PM','Arizona at TCU Nov 5, 5:00 PM',
    'Arizona vs Big 12 Soccer Championship Nov 9'
  ],'published times; the unknown bracket opponent is named after its tournament');
  // Kansas (Sep 27) and Kansas State (Sep 24): each recap matches its own game only.
  const pairs=[['recap-soccer-2026-09-27-kansas.html.gz','Kansas'],['recap-soccer-2026-09-24-kansas-state.html.gz','Kansas State'],['recap-soccer-2026-08-05-uc-irvine.html.gz','UC Irvine (Exhibition)']].map(([name,opponent])=>[fixture(name),played.find(e=>e.opponent===opponent)]);
  for(const [raw,event] of pairs)for(const [,other] of pairs)assert.equal(worker.arizonaHandlers.matchesRecap(raw,other,event.recap_url),event===other,`${other.opponent} must match only its own recap`);
  // NAU (Sep 10) and Pepperdine (Sep 13) have no recap link on the schedule.
  // Arizona's stories are in the sport's archive (/news is a 404 there); the
  // NAU story names "Northern Arizona", the full name from the page data.
  const archive='https://arizonawildcats.com/sports/womens-soccer/archives';
  recapFixtures.set(archive,fixture('soccer-archives.html.gz'));
  recapFixtures.set('https://arizonawildcats.com/news/2026/9/10/soccer-arizona-blanks-northern-arizona-3-0',fixture('recap-soccer-2026-09-10-nau.html.gz'));
  recapFixtures.set('https://arizonawildcats.com/news/2026/9/13/soccer-arizona-falls-at-pepperdine-2-0',fixture('recap-soccer-2026-09-13-pepperdine.html.gz'));
  for(const [opponent,expected] of [['NAU','https://arizonawildcats.com/news/2026/9/10/soccer-arizona-blanks-northern-arizona-3-0'],['Pepperdine','https://arizonawildcats.com/news/2026/9/13/soccer-arizona-falls-at-pepperdine-2-0']]){
    const prompts=[];
    const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Arizona controlled possession for most of the first half of the match.','The Wildcats generated several chances in the second half of play.','The goalkeeper made key saves to keep the match within reach late.','Arizona finished the nonconference schedule with the result on the road.'])};}}};
    const events=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',url,now);
    const target=events.find(e=>e.opponent===opponent);
    const before=requests.length;
    await worker.attachOfficialHighlights(events,fixture('soccer-schedule.html.gz'),school,'Soccer',url,now,env,target.id);
    assert.equal(target.highlight_state,'recap_generated',`${opponent}: highlights from Arizona's own story`);
    assert.equal(target.recap_url,expected);
    assert.ok(requests.slice(before).includes(archive),`${opponent}: the archive is read`);
    assert.ok(!requests.slice(before).some(url=>/\/news\/2026\/9\/(?:9|12)\//.test(url)&&url.includes('arizonawildcats')),'previews dated the day before are never candidates');
  }
  // Live: ESPN's women's college soccer scoreboard. On Sep 27 it lists
  // "Arizona at Kansas" and "Arizona State at Kansas State"; only the first is Arizona's.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Soccer').map(p=>p.path),['soccer/usa.ncaa.w.1']);
  const payload=JSON.parse(fixture('soccer-espn-2026-09-27.json.gz'));
  assert.ok(payload.events.some(e=>e.name==='Arizona State at Kansas State'));
  const scoreUrl='https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/scoreboard?limit=1000&dates=20260927';
  const scored=worker.parseScoreboardPayload(payload,school,'Soccer',arizonaSchool.liveScoreboards.Soccer[0],scoreUrl,new Date('2026-09-28T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Arizona at Kansas','Final','L, 0-2']]);
  const reconciled=worker.reconcileScoreboardEvents(soccer,scored);
  assert.equal(reconciled.length,soccer.length);
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Arizona at Kansas','L, 0-2']]);
  // Other schools have no soccer scoreboard.
  assert.deepEqual(worker.liveScoreboardProviders(schools.find(s=>s.id==='kstate'),'Soccer'),[]);
}

// Cross Country: the page data gives each meet's team places ("Men: 1st
// Women: 12th"); each recap ends with Arizona's results per race ("Arizona
// Men's Results (8K)", "2. Evans Tanui - 22:41.54") and states the points in
// prose. Production showed the raw "Men: 1st Women: 12th" with no race rows.
{
  const url='https://arizonawildcats.com/sports/cross-country/schedule';
  const meets=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now);
  assert.deepEqual(meets.map(e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`),[
    "Final Sep 4 Arizona at Dave Murray Invitational | Women's team: 1st / Men's team: 1st",
    "Final Sep 25 Arizona at Sean Earl Lakefront Invitational | Women's team: 12th / Men's team: 1st",
    'Upcoming Oct 16 Arizona at Pre-National Invitational | ','Upcoming Oct 31 Arizona at Big 12 Championships | ',
    'Upcoming Nov 13 Arizona at NCAA West Regional | ','Upcoming Nov 21 Arizona at NCAA Championships | '
  ]);
  const [murray,earl]=meets;
  const dm=fixture('recap-cross-country-2026-09-04-dave-murray.html.gz'),se=fixture('recap-cross-country-2026-09-25-sean-earl.html.gz');
  const parsed=parseArizonaRecapResults(se,{decodeHtml:value=>String(value).replace(/&#x27;/g,"'").replace(/&amp;/g,'&'),ordinal:n=>`${n}${['th','st','nd','rd'][n%100>10&&n%100<14?0:n%10]||'th'}`});
  assert.deepEqual(parsed.map(r=>[r.group,r.points,r.rows.length]),[["Women's 6K",'280',8],["Men's 8K",'85',10]],'women first; points from the prose');
  recapFixtures.set(murray.recap_url,dm);recapFixtures.set(earl.recap_url,se);
  // Feed: the official race rows replace the raw team text.
  const feed=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now);
  await Promise.all(feed.filter(e=>e.status==='Final').map(e=>worker.attachOfficialMeetResults(e)));
  const [a,b]=feed;
  assert.equal(a.headline,"Women's team: 1st · 28 pts / Men's team: 1st · 15 pts");
  assert.equal(b.headline,"Women's team: 12th · 280 pts / Men's team: 1st · 85 pts");
  assert.equal(a.results.length,18,'2 team rows, 8 women, 8 men');
  assert.equal(b.results.length,20,'2 team rows, 8 women, 10 men');
  assert.deepEqual(b.results.slice(0,3),[
    {group:"Women's 6K",participant:'Arizona team',result:'12th · 280 pts'},
    {group:"Women's 6K",participant:'Mercy Chepkemoi',result:'1st · 19:02.52'},
    {group:"Women's 6K",participant:'Praise Chepkemoi',result:'34th · 20:08.63'}
  ]);
  assert.deepEqual(b.results.slice(9,11),[
    {group:"Men's 8K",participant:'Arizona team',result:'1st · 85 pts'},
    {group:"Men's 8K",participant:'Evans Tanui',result:'2nd · 22:41.54'}
  ]);
  assert.deepEqual(b.results.at(-1),{group:"Men's 8K",participant:'Kai Espinosa Golinski',result:'115th · 24:25.02'});
  // The results list is used, not the prose (Urbanski: 18:10.0 listed, 18:10.1 in the text).
  assert.ok(a.results.some(r=>r.participant==='Michael Urbanski'&&r.result==='6th · 18:10.0'));
  assert.deepEqual(a.results.filter(r=>r.group==="Women's 4K").map(r=>r.participant).slice(0,3),['Arizona team','Praise Chepkemboi','Laina Friedmann']);
  assert.ok(a.meet_results_verified&&b.meet_results_verified&&a.highlights_verified);
  assert.deepEqual(b.highlights,[
    "Arizona's women placed 12th with 280 points.","Arizona's men placed 1st with 85 points.",
    "Mercy Chepkemoi led Arizona in the women's 6K, finishing 1st in 19:02.52.","Evans Tanui led Arizona in the men's 8K, finishing 2nd in 22:41.54."
  ]);
  // Expanded view: the same rows, no AI.
  const events=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now);
  const target=events.find(e=>e.opponent==='Sean Earl Lakefront Invitational');
  await worker.attachOfficialHighlights(events,fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now,{AI:{run:async()=>{throw Error('AI must not read these recaps');}}},target.id);
  assert.deepEqual(target.results,b.results);
  assert.equal(target.highlight_state,'official_recap_results');
  // A recap that is not this meet's is refused.
  const swapped=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now)[1];
  swapped.recap_url=murray.recap_url;
  await worker.attachOfficialMeetResults(swapped);
  assert.equal(swapped.meet_results_verified,false);
  assert.equal(swapped.headline,"Women's team: 12th / Men's team: 1st",'the official places stay');
}

// Basketball: the men's and women's pages only (production also loaded the
// generic page and the homepage), both labeled. Production showed
// "(Exhib.)"/"Exhibition ..." names and dates without times.
{
  assert.deepEqual(worker.candidateUrls(school,'Basketball'),['https://arizonawildcats.com/sports/mens-basketball/schedule','https://arizonawildcats.com/sports/womens-basketball/schedule']);
  const menUrl='https://arizonawildcats.com/sports/mens-basketball/schedule',womenUrl='https://arizonawildcats.com/sports/womens-basketball/schedule';
  const men=worker.labelTeamEvents(worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball',menUrl,now),school,'Basketball',menUrl);
  const women=worker.labelTeamEvents(worker.parseHtml(fixture('womens-basketball-schedule.html.gz'),school,'Basketball',womenUrl,now),school,'Basketball',womenUrl);
  assert.equal(men.length,39,'40 games less the Red-Blue Showcase');
  assert.equal(women.length,33);
  const all=[...men,...women];
  assert.equal(new Set(all.map(e=>e.id)).size,72,'both teams play at Kansas State on Jan 9: ids stay apart');
  assert.ok(!all.some(e=>/Red-Blue|Exhib\.|^Exhibition/i.test(e.opponent)));
  assert.deepEqual(men.filter(e=>e.status==='Final').map(e=>`${e.title} ${e.headline}`),[
    'Men\'s · Arizona at Lithuania "B" Team L, 88-99','Men\'s · Arizona vs Ukraine Senior National Team W, 107-85','Men\'s · Arizona at Lithuania Senior National Team W, 88-74'
  ],'the summer tour was played with scores and recaps');
  assert.deepEqual(men.slice(3,8).map(e=>`${e.title} ${e.display_time}`),[
    "Men's · Arizona vs San Francisco (Exhibition) Oct 13, 7:00 PM","Men's · Arizona vs San Diego State (Exhibition) Oct 16, 7:00 PM","Men's · Arizona vs Eastern Washington (Exhibition) Oct 23, 7:00 PM",
    "Men's · Arizona vs UCLA Nov 2, 8:00 PM","Men's · Arizona vs Cal Poly Nov 5"
  ]);
  assert.deepEqual(women.slice(0,3).map(e=>`${e.title} ${e.display_time}`),[
    "Women's · Arizona vs Embry-Riddle (Ariz.) (Exhibition) Oct 22, 6:00 PM","Women's · Arizona vs Cal State Monterey Bay (Exhibition) Oct 27, 6:00 PM","Women's · Arizona vs Stanford Nov 2, 10:30 AM"
  ]);
  // Conference tournaments: named after the event, ending on their last day.
  assert.deepEqual([men.at(-1),women.at(-1)].map(e=>[e.opponent,e.start_time.slice(0,10),e.end_time]),[
    ['Big 12 Tournament','2027-03-09','2027-03-13T23:59:59Z'],["Phillips 66 Big 12 Women's Basketball Tournament",'2027-03-03','2027-03-08T23:59:59Z']
  ]);
  const finals=men.filter(e=>e.status==='Final');
  const pairs=[['recap-mens-basketball-2026-08-19-lithuania-b.html.gz',0],['recap-mens-basketball-2026-08-20-ukraine.html.gz',1],['recap-mens-basketball-2026-08-22-lithuania.html.gz',2]].map(([name,i])=>[fixture(name),finals[i]]);
  for(const [raw,event] of pairs)for(const [,other] of pairs)assert.equal(worker.arizonaHandlers.matchesRecap(raw,other,event.recap_url),event===other,`${other.opponent} must match only its own recap`);
  // Live: ESPN's men's and women's scoreboards, Division I group. Feb 14,
  // 2026: men's Texas Tech at Arizona among ten "Wildcats" games and Northern
  // Arizona; women's Arizona State at Arizona.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Basketball').map(p=>[p.path,p.query,p.team_label]),[
    ['basketball/mens-college-basketball','groups=50&limit=300',"Men's"],['basketball/womens-college-basketball','groups=50&limit=300',"Women's"]
  ]);
  const [menProvider,womenProvider]=arizonaSchool.liveScoreboards.Basketball;
  const mensScores=worker.parseScoreboardPayload(JSON.parse(fixture('basketball-espn-mens-2026-02-14.json.gz')),school,'Basketball',menProvider,'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=300&dates=20260214',new Date('2026-02-15T12:00:00Z'));
  assert.deepEqual(mensScores.map(e=>[e.title,e.headline,e.team_label]),[["Men's · Arizona vs Texas Tech",'L, 75-78',"Men's"]]);
  const womensScores=worker.parseScoreboardPayload(JSON.parse(fixture('basketball-espn-womens-2026-02-14.json.gz')),school,'Basketball',womenProvider,'https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard?groups=50&limit=300&dates=20260214',new Date('2026-02-15T12:00:00Z'));
  assert.deepEqual(womensScores.map(e=>[e.title,e.headline,e.school_score,e.opponent_score]),[["Women's · Arizona vs Arizona St",'L, 69-75','69','75']],'Arizona, not Arizona State, is the school');
}

// Baseball: "2027 Baseball Schedule". Production read only the spring games
// (55) with dates alone; the fall exhibitions were missing.
{
  assert.deepEqual(worker.candidateUrls(school,'Baseball'),['https://arizonawildcats.com/sports/baseball/schedule']);
  const url='https://arizonawildcats.com/sports/baseball/schedule';
  const baseball=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball',url,now);
  assert.equal(baseball.length,59,'60 page games less the Oct 1 exhibition played without a published score');
  assert.equal(new Set(baseball.map(e=>e.id)).size,59);
  assert.ok(baseball.every(e=>e.status!=='Final'));
  assert.deepEqual(baseball.slice(0,6).map(e=>`${e.title} ${e.display_time}`),[
    'Arizona vs Naranjeros de Hermosillo (Exhibition) Oct 9, 6:00 PM','Arizona vs Pima Community College (Exhibition) Oct 17, 1:00 PM',
    'Arizona vs Central Arizona College (Exhibition) Oct 23, 6:00 PM','Arizona vs Vanderbilt (Exhibition) Nov 1, 11:00 AM',
    'Arizona vs Oklahoma Feb 19, 10:00 AM','Arizona vs Virginia Feb 20, 10:00 AM'
  ],'fall games are labeled exhibitions; published times');
  assert.equal(baseball.find(e=>e.opponent==='Oklahoma').start_time,'2027-02-19T10:00:00.000Z','spring games are in 2027');
  assert.deepEqual(baseball.filter(e=>e.opponent==='UCLA').map(e=>e.display_time),['Feb 26','Feb 27','Feb 28'],'a three-game series is three games');
  // A doubleheader (same opponent twice on one day) stays two games.
  const raw=fixture('baseball-schedule.html.gz').replace('"2027-02-27T00:00:00"','"2027-02-26T00:00:00"');
  const doubled=worker.parseHtml(raw,school,'Baseball',url,now).filter(e=>e.opponent==='UCLA');
  assert.deepEqual(doubled.map(e=>[e.display_time,e.game_number??null,e.title]),[['Feb 26',1,'Arizona at UCLA (Game 1)'],['Feb 26',2,'Arizona at UCLA (Game 2)'],['Feb 28',null,'Arizona at UCLA']]);
  assert.equal(new Set(doubled.map(e=>e.id)).size,3);
  // Live: ESPN's college baseball scoreboard. Apr 10, 2026: Arizona at TCU
  // (W, 4-3) and Utah at Arizona State the same day.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Baseball').map(p=>p.path),['baseball/college-baseball']);
  const payload=JSON.parse(fixture('baseball-espn-2026-04-10.json.gz'));
  assert.ok(payload.events.some(e=>e.name==='Utah Utes at Arizona State Sun Devils'));
  const scored=worker.parseScoreboardPayload(payload,school,'Baseball',arizonaSchool.liveScoreboards.Baseball[0],'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?limit=1000&dates=20260410',new Date('2026-04-11T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status]),[['Arizona at TCU','Final']]);
  assert.equal(scored[0].headline,'W, 4-3','finals read as K-State\'s');
}

// Softball: "2027 Softball Schedule". Production also loaded the homepage and
// showed only the 28 spring games, dates alone.
{
  assert.deepEqual(worker.candidateUrls(school,'Softball'),['https://arizonawildcats.com/sports/softball/schedule']);
  const url='https://arizonawildcats.com/sports/softball/schedule';
  const softball=worker.parseHtml(fixture('softball-schedule.html.gz'),school,'Softball',url,now);
  assert.equal(softball.length,35,'37 page games less the two Red vs. Blue scrimmages');
  assert.equal(new Set(softball.map(e=>e.id)).size,35);
  assert.deepEqual(softball.slice(0,4).map(e=>`${e.title} ${e.display_time}`),[
    'Arizona vs UTEP (Exhibition) (Game 1) Oct 17, 2:00 PM','Arizona vs UTEP (Exhibition) (Game 2) Oct 17, 4:00 PM',
    'Arizona vs Phoenix College (Exhibition) Oct 23, 5:30 PM','Arizona vs Pima (Exhibition) Oct 23, 7:30 PM'
  ],'the fall doubleheader stays two games; fall games are exhibitions');
  assert.deepEqual(softball.slice(-4).map(e=>[e.opponent,e.start_time.slice(0,10),e.end_time]),[
    ['Big 12 Softball Tournament','2027-05-13','2027-05-15T23:59:59Z'],['NCAA Regionals','2027-05-21','2027-05-23T23:59:59Z'],
    ['NCAA Super Regionals','2027-05-28','2027-05-30T23:59:59Z'],["Women's College World Series",'2027-06-03','2027-06-11T23:59:59Z']
  ],'postseason events end on their last day');
  // Live: ESPN's college softball scoreboard. Apr 10, 2026: Arizona at LSU
  // (L, 1-4) and UCF at Arizona State the same day.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Softball').map(p=>p.path),['baseball/college-softball']);
  const payload=JSON.parse(fixture('softball-espn-2026-04-10.json.gz'));
  assert.ok(payload.events.some(e=>e.name==='UCF Knights at Arizona State Sun Devils'));
  const scored=worker.parseScoreboardPayload(payload,school,'Softball',arizonaSchool.liveScoreboards.Softball[0],'https://site.api.espn.com/apis/site/v2/sports/baseball/college-softball/scoreboard?limit=1000&dates=20260410',new Date('2026-04-11T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Arizona at LSU','Final','L, 1-4']]);
}

// Beach Volleyball: production returned 502. Its routes were
// /sports/beach-volleyball/, SIDEARM's empty "@season @sport" template (the
// saved page has no games); the sport's pages are womens-beach-volleyball.
{
  assert.deepEqual(worker.candidateUrls(school,'Beach Volleyball'),['https://arizonawildcats.com/sports/womens-beach-volleyball/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Beach Volleyball'),['https://arizonawildcats.com/sports/womens-beach-volleyball/roster']);
  assert.match(fixture('beach-volleyball-empty-template.html.gz'),/<title>@season @sport Schedule/);
  assert.deepEqual(worker.parseHtml(fixture('beach-volleyball-empty-template.html.gz'),school,'Beach Volleyball','https://arizonawildcats.com/sports/beach-volleyball/schedule',now),[]);
  const url='https://arizonawildcats.com/sports/womens-beach-volleyball/schedule';
  const beach=worker.parseHtml(fixture('beach-volleyball-schedule.html.gz'),school,'Beach Volleyball',url,now);
  assert.deepEqual(beach.map(e=>[e.title,e.display_time,e.end_time||null]),[
    ['Arizona vs Sand Court Experts Collegiate Beach Fall Classic','Oct 9','2026-10-11T23:59:59Z'],
    ['Arizona vs AVCA Collegiate Beach West Bid Tournament','Oct 17','2026-10-18T23:59:59Z'],
    ['Arizona at Arizona State','Oct 30',null],
    ['Arizona vs Pairs Championship','Nov 6','2026-11-08T23:59:59Z'],
    ['Arizona at Grand Canyon','Nov 7','2026-11-08T23:59:59Z']
  ],'fall 2026 events; "TBD" opponents named after their tournament; multi-day events end on their last day');
  assert.ok(beach.every(e=>e.status==='Upcoming'));
  const [group]=worker.groupEvents(beach,now);
  assert.equal(group.upcoming.length,5);
}

// Golf: both teams' pages (production showed the women's only, one event per
// round: "7th; 284 (-4)", "6th; 563 (-13)", "7th; 844 (-20)"). One event per
// tournament; the tournament's own story gives K-State's "12th of 12 (909)"
// and Arizona's individual scores.
{
  assert.deepEqual(worker.candidateUrls(school,'Golf'),['https://arizonawildcats.com/sports/mens-golf/schedule','https://arizonawildcats.com/sports/womens-golf/schedule']);
  assert.ok(worker.schoolCombinedSports(school).has('Golf'));
  const menUrl='https://arizonawildcats.com/sports/mens-golf/schedule',womenUrl='https://arizonawildcats.com/sports/womens-golf/schedule';
  const parse=()=>[...worker.labelTeamEvents(worker.parseHtml(fixture('mens-golf-schedule.html.gz'),school,'Golf',menUrl,now),school,'Golf',menUrl),...worker.labelTeamEvents(worker.parseHtml(fixture('womens-golf-schedule.html.gz'),school,'Golf',womenUrl,now),school,'Golf',womenUrl)];
  const golf=parse();
  assert.equal(golf.length,27,'15 men\'s and 12 women\'s tournaments (35 and 30 round entries)');
  assert.equal(new Set(golf.map(e=>e.id)).size,27);
  const finals=golf.filter(e=>e.status==='Final');
  assert.deepEqual(finals.map(e=>[e.title,e.display_time,e.end_time,e.headline,Boolean(e.recap_url)]),[
    ["Men's · Arizona at Sahalee Players Championship",'Sep 12','2026-09-13T23:59:59Z','12th (909)',true],
    ["Men's · Arizona at The Tucker Intercollegiate",'Sep 25','2026-09-26T23:59:59Z','Completed',false],
    ["Women's · Arizona at Folds of Honor Collegiate",'Sep 7','2026-09-09T23:59:59Z','4th (866)',true],
    ["Women's · Arizona at Golfweek Red Sky Classic",'Sep 21','2026-09-23T23:59:59Z','7th (844)',true]
  ],'one event per tournament with the last round\'s place, total and recap');
  assert.ok(finals.every(e=>!/after-day-1|first-round|round-two/.test(e.recap_url||'')),'a day-one story is not the result');
  const upcoming=golf.filter(e=>e.status!=='Final');
  assert.deepEqual(upcoming.slice(0,2).map(e=>[e.title,e.display_time,e.end_time]),[["Men's · Arizona at Big 12 Match Play",'Oct 12','2026-10-14T23:59:59Z'],["Men's · Arizona at Abilene Christian Intercollegiate",'Oct 19','2026-10-21T23:59:59Z']]);
  assert.deepEqual(golf.filter(e=>/NCAA Regional/.test(e.opponent)).map(e=>[e.team_label,e.end_time]),[["Men's",'2027-05-19T23:59:59Z'],["Women's",'2027-05-12T23:59:59Z']],'NCAA rounds publish their last day in the time field');
  // A tournament in progress shows its next round.
  const during=worker.parseHtml(fixture('womens-golf-schedule.html.gz'),school,'Golf',womenUrl,new Date('2026-10-06T15:00:00Z')).find(e=>e.opponent==='Windy City Classic');
  assert.deepEqual([during.status,during.display_time,during.end_time??null],['Today','Oct 6',null]);
  // Stories: Sahalee, Folds of Honor and Red Sky are linked from the last
  // round; the Tucker story is in the men's golf archive, dated on the last day.
  const stories={
    'https://arizonawildcats.com/news/2026/9/13/mens-golf-arizona-closes-sahalee-players-championship-in-12th':'recap-mens-golf-2026-09-13-sahalee.html.gz',
    'https://arizonawildcats.com/news/2026/9/26/mens-golf-arizona-finishes-ninth-at-william-h-tucker-intercollegiate':'recap-mens-golf-2026-09-26-tucker.html.gz',
    'https://arizonawildcats.com/news/2026/9/9/womens-golf-trio-of-wildcats-finish-inside-the-top-six-at-folds-of-honor-collegiate':'recap-womens-golf-2026-09-09-folds-of-honor.html.gz',
    'https://arizonawildcats.com/news/2026/9/23/womens-golf-wildcats-finish-seventh-at-golfweek-red-sky-classic-behind-charlotte-backs-bogey-free-66':'recap-womens-golf-2026-09-23-red-sky.html.gz'
  };
  for(const [url,name] of Object.entries(stories))recapFixtures.set(url,fixture(name));
  recapFixtures.set('https://arizonawildcats.com/sports/mens-golf/archives',fixture('mens-golf-archives.html.gz'));
  const parsed=parseArizonaGolfRecap(fixture('recap-womens-golf-2026-09-09-folds-of-honor.html.gz'),{decodeHtml:worker.decodeHtml});
  assert.deepEqual(parsed.team,{place:'4',total:'866',field:12});
  assert.deepEqual(parsed.players.map(p=>`${p.place} ${p.participant} ${p.total} ${p.par}`),['5 Olivia Hung 213 -3','T6 Charlotte Back 214 -2','T6 Nagore Martinez 214 -2','T38 Cloe Amion Villarino 225 +9','T47 Kinsley Ni 233 +17']);
  const fed=parse().filter(e=>e.status==='Final');
  await Promise.all(fed.map(e=>worker.attachOfficialMeetResults(e)));
  assert.deepEqual(fed.map(e=>[e.opponent,e.headline]),[
    ['Sahalee Players Championship','12th of 12 (909)'],['The Tucker Intercollegiate','9th of 15 (857)'],
    ['Folds of Honor Collegiate','4th of 12 (866)'],['Golfweek Red Sky Classic','7th (844)']
  ],'K-State\'s "Nth of N (total)"; the Red Sky story lists only the top 10, so no field size is claimed');
  const tucker=fed[1];
  assert.equal(tucker.recap_url,'https://arizonawildcats.com/news/2026/9/26/mens-golf-arizona-finishes-ninth-at-william-h-tucker-intercollegiate','the story from the archive');
  assert.deepEqual(tucker.results.slice(0,3),[{label:'Result',value:'9th of 15 (857)'},{group:"Men's Individual Results",participant:'Tianyi Xiong',result:'T11th · 210 (-6)'},{group:"Men's Individual Results",participant:'Jorge Sampedro',result:'T20th · 213 (-3)'}]);
  assert.equal(tucker.highlights[0],'Arizona finished 9th of 15 at the Tucker Intercollegiate with a team total of 857.');
  assert.ok(fed.every(e=>e.meet_results_verified&&e.highlights_verified));
  // Arizona, not Arizona State (6th at Sahalee), is the team row.
  assert.ok(/Arizona State/.test(fixture('recap-mens-golf-2026-09-13-sahalee.html.gz')));
}

// Gymnastics: the page still shows the 2025-26 season ("2025-26 Gymnastics
// Schedule", Dec 13, 2025 - Apr 1, 2026). Production's routes included the
// empty "@season @sport" template (mens-gymnastics, gymnastics) and the
// homepage.
{
  assert.deepEqual(worker.candidateUrls(school,'Gymnastics'),['https://arizonawildcats.com/sports/womens-gymnastics/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Gymnastics'),['https://arizonawildcats.com/sports/womens-gymnastics/roster']);
  const url='https://arizonawildcats.com/sports/womens-gymnastics/schedule';
  const current=worker.parseHtml(fixture('gymnastics-schedule.html.gz'),school,'Gymnastics',url,now);
  assert.deepEqual(current,[],'only a past season: an empty schedule');
  assert.equal(worker.arizonaHandlers.isEmptySchedule(current),true,'flagged as a valid empty schedule, not a failed source');
  assert.equal(worker.arizonaHandlers.isEmptySchedule([]),false);
  // The same page in season (read as of Mar 15, 2026): K-State-style results.
  const season=worker.parseHtml(fixture('gymnastics-schedule.html.gz'),school,'Gymnastics',url,new Date('2026-03-15T19:00:00Z'));
  const finals=season.filter(e=>e.status==='Final');
  assert.deepEqual(finals.slice(0,4).map(e=>`${e.display_time} ${e.title} | ${e.headline}`),[
    'Dec 13 Arizona at GymCat Showcase | Completed','Jan 9 Arizona at Washington | W · 195.425','Jan 16 Arizona at TWU with Denver | 3rd · 193.350','Jan 23 Arizona at Towson | W · 196.800'
  ]);
  assert.ok(!season.some(e=>e.opponent==='Iowa State'),'the canceled Feb 27 meet is left out');
  assert.ok(finals.filter(e=>e.headline!=='Completed').every(e=>/\/news\/20(25|26)\//.test(e.recap_url)),'every scored meet links its recap');
  assert.equal(finals.length,14,'15 meets less the canceled one; every one carries its published score');
  assert.deepEqual(finals.slice(-2).map(e=>e.headline),['4th \u00b7 194.725','L \u00b7 194.900']);
  // Other Arizona sports are not affected by the season filter.
  assert.equal(worker.arizonaHandlers.isEmptySchedule(worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now)),false);
}

// Swimming & Diving: production showed 81 "upcoming" entries: one per meet
// day, both teams, and the Red vs. Blue Intrasquad. One event per meet now.
{
  const menUrl='https://arizonawildcats.com/sports/mens-swimming-and-diving/schedule',womenUrl='https://arizonawildcats.com/sports/womens-swimming-and-diving/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Swimming & Diving'),[menUrl,womenUrl]);
  const men=worker.labelTeamEvents(worker.parseHtml(fixture('mens-swimming-diving-schedule.html.gz'),school,'Swimming & Diving',menUrl,now),school,'Swimming & Diving',menUrl);
  const women=worker.labelTeamEvents(worker.parseHtml(fixture('womens-swimming-diving-schedule.html.gz'),school,'Swimming & Diving',womenUrl,now),school,'Swimming & Diving',womenUrl);
  assert.equal(men.length,13,'40 day entries: 13 meets less the intrasquad');
  assert.equal(women.length,14,'the women also host Northern Arizona');
  assert.equal(new Set([...men,...women].map(e=>e.id)).size,27);
  assert.ok(![...men,...women].some(e=>/Intrasquad/i.test(e.opponent)));
  assert.deepEqual(men.slice(0,3).map(e=>[e.title,e.display_time,e.end_time??null]),[
    ["Men's · Arizona at SMU Classic",'Oct 9, 5:00 PM','2026-10-10T23:59:59Z'],
    ["Men's · Arizona vs Southern Methodist University",'Oct 23, 12:30 PM',null],
    ["Men's · Arizona vs USC, UCLA, Arizona State",'Nov 6, 1:00 PM','2026-11-07T23:59:59Z']
  ]);
  assert.deepEqual(men.find(e=>/USA Diving/.test(e.opponent)).end_time,'2026-12-15T23:59:59Z','a seven-day meet is one event');
  // A published dual score reads as a game; an unscored meet as a meet.
  const scoredRaw=fixture('mens-swimming-diving-schedule.html.gz');
  const smuDual=worker.parseHtml(scoredRaw,school,'Swimming & Diving',menUrl,new Date('2026-10-24T19:00:00Z')).find(e=>e.opponent==='Southern Methodist University');
  assert.deepEqual([smuDual.status,smuDual.headline],['Final','Completed'],'a past meet with no published score reads Completed, as UCF\'s');
}

// Tennis: both teams' pages (production showed the women's page only, every
// tournament as "Arizona vs ..."). Fall tennis is individual tournaments: no
// team score. Past ones read Completed; the ones in progress stay on today's
// schedule; Arizona's story about a tournament becomes its recap.
{
  const menUrl='https://arizonawildcats.com/sports/mens-tennis/schedule',womenUrl='https://arizonawildcats.com/sports/womens-tennis/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Tennis'),[menUrl,womenUrl]);
  const parse=()=>[...worker.labelTeamEvents(worker.parseHtml(fixture('mens-tennis-schedule.html.gz'),school,'Tennis',menUrl,now),school,'Tennis',menUrl),...worker.labelTeamEvents(worker.parseHtml(fixture('womens-tennis-schedule.html.gz'),school,'Tennis',womenUrl,now),school,'Tennis',womenUrl)];
  const tennis=parse();
  assert.equal(tennis.length,20);
  assert.equal(new Set(tennis.map(e=>e.id)).size,20);
  assert.deepEqual(tennis.slice(0,4).map(e=>[e.title,e.status,e.headline||null,e.display_time,e.end_time]),[
    ["Men's · Arizona at Kinlen & Vivian Gee Wildcat Invite",'Final','Completed','Sep 11','2026-09-13T23:59:59Z'],
    ["Men's · Arizona at ITA All Americans",'Final','Completed','Sep 19','2026-09-27T23:59:59Z'],
    ["Men's · Arizona at University of Arkansas M15 Open",'Today',null,'Sep 28','2026-10-04T23:59:59Z'],
    ["Men's · Arizona at Battle of the Bay",'Today',null,'Oct 1','2026-10-04T23:59:59Z']
  ],'tournaments in progress (Sep 28 - Oct 4, Oct 1 - 4) stay on the schedule as today\'s');
  const [group]=worker.groupEvents(tennis,now);
  assert.deepEqual(group.upcoming.slice(0,2).map(e=>e.opponent),['University of Arkansas M15 Open','Battle of the Bay']);
  assert.equal(group.results.length,4);
  // The Kinlen story (Sep 14, the day after) names the tournament; it also
  // mentions the ITA All American Tournament, which is outside its dates.
  recapFixtures.set('https://arizonawildcats.com/sports/mens-tennis/archives',fixture('mens-tennis-archives.html.gz'));
  recapFixtures.set('https://arizonawildcats.com/sports/womens-tennis/archives',fixture('womens-tennis-archives.html.gz'));
  for(const path of ['/news/2026/9/10/arizona-mens-tennis-kicks-off-fall-season-at-home','/news/2026/9/16/mens-tennis-the-wildcats-send-eight-players-to-compete-in-the-ita-all-american-championships'])recapFixtures.set(`https://arizonawildcats.com${path}`,'<html><meta property="og:title" content="Preview"><div id="story-x">A preview.</div></html>');
  recapFixtures.set('https://arizonawildcats.com/news/2026/9/14/mens-tennis-wildcats-close-out-a-successful-weekend-at-home',fixture('recap-mens-tennis-2026-09-14-kinlen.html.gz'));
  const fed=parse().filter(e=>e.status==='Final');
  await Promise.all(fed.map(e=>worker.arizonaHandlers.attachTennisStory(e)));
  assert.deepEqual(fed.map(e=>[e.opponent,e.recap_url||null]),[
    ['Kinlen & Vivian Gee Wildcat Invite','https://arizonawildcats.com/news/2026/9/14/mens-tennis-wildcats-close-out-a-successful-weekend-at-home'],
    ['ITA All Americans',null],['ITA All-Americans',null],['W50 Berkeley',null]
  ],'only the Kinlen Invite has a story; the Sep 16 preview is not a recap');
  // The feed keeps only the past tournaments with a story (K-State lists no
  // past tournament without a team result).
  const asked=[];
  const feedFetch=async url=>{asked.push(String(url));const body=String(url).endsWith('/mens-tennis/schedule')?fixture('mens-tennis-schedule.html.gz'):String(url).endsWith('/womens-tennis/schedule')?fixture('womens-tennis-schedule.html.gz'):recapFixtures.get(String(url));if(body==null)return new Response('missing',{status:404});return new Response(body,{status:200,headers:{'content-type':'text/html'}});};
  const live=Function(...Object.keys(deps),source+';return fetchLive;')(...Object.values({...deps,fetch:feedFetch}));
  const feed=await live('arizona','Tennis');
  // (fetchLive reads the real clock: tournaments now in progress may have ended.)
  const kept=feed.events.filter(e=>e.status==='Final');
  assert.ok(kept.some(e=>e.opponent==='Kinlen & Vivian Gee Wildcat Invite'&&e.recap_url==='https://arizonawildcats.com/news/2026/9/14/mens-tennis-wildcats-close-out-a-successful-weekend-at-home'));
  assert.ok(!kept.some(e=>['ITA All Americans','ITA All-Americans','W50 Berkeley'].includes(e.opponent)),'past tournaments without a story are not listed');
  assert.ok(kept.every(e=>e.recap_url));
  assert.ok(feed.events.some(e=>e.opponent==='NCAA National Championship'),'upcoming tournaments stay');
  // Expanded view: highlights from that story.
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Arizona earned six wins in singles and doubles on the opening day.','Stelse, Sekachov, Berard and Sivertsen each won again in singles on day two.','Stelse, Sekachov and Sivertsen each won their singles brackets on Sunday.','Sekachov and Stelse closed the tournament with a doubles victory.'])};}}};
  const events=parse();
  const target=events.find(e=>e.opponent==='Kinlen & Vivian Gee Wildcat Invite');
  assert.equal(target.recap_url,undefined,'the expanded view finds the story itself (it runs before the feed hook)');
  await worker.attachOfficialHighlights(events,fixture('mens-tennis-schedule.html.gz'),school,'Tennis',menUrl,now,env,target.id);
  assert.equal(target.recap_url,'https://arizonawildcats.com/news/2026/9/14/mens-tennis-wildcats-close-out-a-successful-weekend-at-home');
  assert.equal(target.highlight_state,'recap_generated');
  assert.ok(prompts[0].includes('Kinlen'));
}

// Track & Field: the page still shows "2025-26 Track and Field Schedule"
// (Dec 6, 2025 - Jun 14, 2026). Production also tried track-field and the
// homepage.
{
  assert.deepEqual(worker.candidateUrls(school,'Track & Field'),['https://arizonawildcats.com/sports/track-and-field/schedule']);
  assert.deepEqual(worker.rosterUrls(school,'Track & Field'),['https://arizonawildcats.com/sports/track-and-field/roster']);
  const url='https://arizonawildcats.com/sports/track-and-field/schedule';
  const current=worker.parseHtml(fixture('track-and-field-schedule.html.gz'),school,'Track & Field',url,now);
  assert.deepEqual(current,[]);
  assert.equal(worker.arizonaHandlers.isEmptySchedule(current),true,'a valid empty schedule until 2026-27 is published');
  // In season (read as of Apr 10, 2026): one event per meet, the two canceled
  // home meets left out, recaps dated with their meet.
  const season=worker.parseHtml(fixture('track-and-field-schedule.html.gz'),school,'Track & Field',url,new Date('2026-04-10T19:00:00Z'));
  assert.equal(season.length,21,'23 meets less the canceled Willie Williams Classic and Jim Click Invitational');
  assert.ok(!season.some(e=>/Willie Williams|Jim Click/.test(e.opponent)));
  const indoor=season.find(e=>e.opponent==='Big 12 Championships');
  assert.deepEqual([indoor.title,indoor.end_time,indoor.recap_url??null],['Arizona at Big 12 Championships','2026-02-28T23:59:59Z',null],'the indoor championships do not take the May outdoor story');
  assert.equal(season.find(e=>e.opponent==="Axe'em Open").recap_url,'https://arizonawildcats.com/news/2026/1/10/track-and-field-wildcats-win-four-events-in-indoor-season-opener','a story dated the day after its meet is kept');
  assert.ok(season.filter(e=>e.recap_url).every(e=>{const [,y,m,d]=e.recap_url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\//);const day=Date.UTC(y,m-1,d);return day>=Date.parse(e.start_time.slice(0,10))&&day<=Date.parse((e.end_time||e.start_time).slice(0,10))+3*86400000;}));
  assert.deepEqual(season.filter(e=>e.status!=='Final').slice(0,2).map(e=>e.opponent),['Dual In the Desert (Arizona vs Arizona State)','Bryan Clay Invitational']);
}

console.log('Arizona module checks passed');
