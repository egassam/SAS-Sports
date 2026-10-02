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
import {arizonaSchool,createArizonaHandlers,parseArizonaRecapResults} from '../src/schools/arizona.mjs';
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards};')(...Object.values(deps));


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

console.log('Arizona module checks passed');
