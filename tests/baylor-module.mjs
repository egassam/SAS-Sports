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
const school=schools.find(s=>s.id==='baylor');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,baylorHandlers,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));


// Module ownership: every sponsored sport has explicit baylorbears.com routes,
// exactly the candidates production used before the module (route parity,
// 219/219 catalog routes identical).
const sports=sponsoredSports.baylor;
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',baylorSchool.scheduleUrls],['roster',baylorSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('baylor|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'baylorbears.com',`${key} must stay on baylorbears.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(baylorSchool.scheduleUrls[`baylor|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(baylorSchool.rosterUrls[`baylor|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'baylor\|/.test(read('../src/index.js')),'Baylor configuration must live in its module, not shared code');

// Football: baylorbears.com (SIDEARM) embeds every game as page data with its
// local start ("9:30 p.m."), home/away, result and recap. The shared parsers
// read only the rendered cards, which omit the start time.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/baylor-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://baylorbears.com/sports/football/schedule',now=new Date('2026-10-03T17:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
assert.equal(football.length,13,'one event per official game');
assert.equal(new Set(football.map(e=>e.id)).size,13,'no duplicate events');
const finals=football.filter(e=>e.status==='Final').sort((a,b)=>a.start_time.localeCompare(b.start_time));
assert.deepEqual(finals.map(e=>[e.display_time,e.title,e.headline,e.school_score,e.opponent_score]),[
  ['Sep 5','Baylor vs Auburn','L, 16-17','16','17'],['Sep 12','Baylor vs Prairie View A&M','W, 44-3','44','3'],
  ['Sep 19','Baylor vs Louisiana Tech','W, 36-19','36','19'],['Sep 26','Baylor vs Colorado','W, 23-13','23','13']
],'finals read as K-State\'s: W/L and the date only');
assert.ok(finals.every(e=>e.results.length===1&&e.results[0].value===e.headline),'every final has one Result row');
assert.deepEqual(finals.map(e=>e.recap_url),['2026/9/5/football-recap-vs-auburn','2026/9/12/football-recap-vs-pvamu','2026/9/19/football-recap-vs-la-tech','2026/9/26/football-recap-vs-colorado'].map(path=>`https://baylorbears.com/news/${path}`),'every final links its own official recap (not the game book PDF)');
const upcoming=football.filter(e=>e.status!=='Final');
assert.deepEqual(upcoming.map(e=>`${e.title} ${e.display_time}`),[
  'Baylor at Arizona State Oct 3, 9:30 PM','Baylor vs TCU Oct 17','Baylor at Kansas Oct 24','Baylor at UCF Oct 30, 6:30 PM','Baylor vs Iowa State Nov 7',
  'Baylor at BYU Nov 14','Baylor vs Texas Tech Nov 21','Baylor at Houston Nov 28','Baylor vs Big 12 Championship Dec 4, 7:00 PM'
],'published Baylor (Central) start times, "9:30 p.m." and "7 p.m."; "TBD" shows the date only');
assert.equal(upcoming[0].start_time,'2026-10-03T21:30:00.000Z','start times are Baylor wall clock');
assert.equal(upcoming[0].status,'Today');
assert.ok(upcoming.every(e=>!e.recap_url&&!e.headline&&!e.school_score),'no upcoming game inherits a result or recap');
const [group]=worker.groupEvents(football,now);
assert.deepEqual([group.results.length,group.upcoming.length],[4,9]);
assert.deepEqual(group.results.map(e=>e.display_time),['Sep 26','Sep 19','Sep 12','Sep 5'],'results newest first, as K-State');
// Pages from any other host or path are left to the shared parsers; other
// schools never reach the Baylor reader.
assert.equal(worker.baylorHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://baylorbears.com/',now),null);
assert.equal(worker.baylorHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='tcu'),'Football',footballUrl,now),null);
// Every sponsored sport is read by the module.
assert.deepEqual([...baylorSchool.pageDataSports].sort(),[...sports].sort());

// Expanded view: each final matches only its own recap, and its highlights
// are written from that article.
const recaps=['recap-football-2026-9-5-auburn.html.gz','recap-football-2026-9-12-pvamu.html.gz','recap-football-2026-9-19-la-tech.html.gz','recap-football-2026-9-26-colorado.html.gz'].map(fixture);
finals.forEach((event,i)=>recapFixtures.set(event.recap_url,recaps[i]));
finals.forEach((event,i)=>recaps.forEach((raw,j)=>assert.equal(worker.recapMatchesEvent(raw,event,finals[j].recap_url),i===j,`${event.opponent} must match only its own recap`)));
for(const [i,expected] of [[0,'Auburn'],[1,'Prairie View'],[2,'Louisiana Tech'],[3,'Colorado']]){
  const prompts=[];
  const env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Baylor scored on its first drive of the game against the visitors.','The Bears defense forced two turnovers in the first half of play.','Baylor added two more touchdowns in the third quarter to pull away.','The Bears closed out the game with a long drive in the fourth quarter.'])};}}};
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
// request). The Sep 26 payload also holds Missouri State and Central Arkansas
// (both "Bears"); only Colorado at Baylor is Baylor's.
{
  assert.deepEqual(worker.liveScoreboardProviders(school,'Football').map(p=>p.path),['football/college-football']);
  const payload=JSON.parse(fixture('football-espn-2026-09-26.json.gz'));
  const names=payload.events.map(e=>e.name);
  assert.ok(names.includes('Missouri State Bears at SMU Mustangs')&&names.includes('Central Arkansas Bears at Florida State Seminoles'));
  const [provider]=worker.liveScoreboardProviders(school,'Football'),scoreUrl='https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&dates=20260926';
  const scored=worker.parseScoreboardPayload(payload,school,'Football',provider,scoreUrl,new Date('2026-09-27T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.school_score,e.opponent_score,e.headline]),[['Baylor vs Colorado','Final','23','13','W, 23-13']]);
  const reconciled=worker.reconcileScoreboardEvents(football,scored);
  assert.equal(reconciled.length,football.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Baylor vs Colorado','W, 23-13']]);
}

// Volleyball: page-data reader. Production showed rankings in the opponents
// ("#17 Florida", "RV Georgia Tech", "#1 Nebraska") and dates without times.
{
  const vbUrl='https://baylorbears.com/sports/womens-volleyball/schedule';
  const vb=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,now);
  assert.equal(vb.length,28);
  assert.equal(new Set(vb.map(e=>e.id)).size,28,'the two Aug 30 matches stay two events');
  const vbFinals=vb.filter(e=>e.status==='Final');
  assert.equal(vbFinals.length,13);
  assert.ok(vbFinals.every(e=>/^[WL], [0-3]-[0-3]$/.test(e.headline)&&e.recap_url?.startsWith('https://baylorbears.com/news/2026/')),'every final in K-State wording with its own recap');
  assert.deepEqual(vbFinals.filter(e=>['Sep 5','Sep 10','Sep 11','Sep 25'].includes(e.display_time)).map(e=>`${e.title} ${e.headline}`),['Baylor vs Florida L, 0-3','Baylor vs Georgia Tech W, 3-0','Baylor at Nebraska L, 0-3','Baylor at BYU L, 2-3'],'rankings dropped');
  assert.ok(vb.every(e=>!/#\d|\bRV\b|No\. \d/.test(e.title)));
  // The Sep 25 match at BYU (9 p.m.) is recapped the next day.
  assert.equal(vbFinals.find(e=>e.display_time==='Sep 25').recap_url,'https://baylorbears.com/news/2026/9/26/volleyball-no-17-vb-drops-heartbreaker-at-no-22-byu');
  const vbUpcoming=vb.filter(e=>e.status!=='Final');
  assert.equal(vbUpcoming.length,15);
  assert.ok(vbUpcoming.every(e=>/, \d{1,2}:\d{2} [AP]M$/.test(e.display_time)),'every upcoming match shows its published time ("2 p.m.", "7 pm", "9:00 PM")');
  assert.deepEqual(vbUpcoming.slice(0,2).map(e=>`${e.title} ${e.display_time}`),['Baylor vs Colorado Oct 4, 2:00 PM','Baylor at Texas Tech Oct 8, 6:00 PM']);
  // Expanded view: each recap matches only its own match (two on Aug 30).
  const own=[['Sep 25','recap-volleyball-2026-9-26-byu.html.gz'],['Aug 30|Hawaii','recap-volleyball-2026-8-30-hawaii.html.gz'],['Aug 30|Georgia Southern','recap-volleyball-2026-8-30-georgia-southern.html.gz']];
  const pick=key=>{const [day,opp]=key.split('|');return vbFinals.find(e=>e.display_time===day&&(!opp||e.opponent===opp));};
  for(const [key,file] of own)for(const [other] of own){
    const event=pick(other),raw=fixture(file),url=pick(key).recap_url;
    assert.equal(worker.baylorHandlers.matchesRecap(raw,event,url),key===other,`${other} vs recap of ${key}`);
  }
  // The shared matcher alone took each Aug 30 story for the other match: the
  // Hawaii story's "WHAT'S NEXT" names Georgia Southern, and the Georgia
  // Southern story's dateline is "HONOLULU, Hawaii".
  assert.equal(worker.recapMatchesEvent(fixture('recap-volleyball-2026-8-30-hawaii.html.gz'),pick('Aug 30|Georgia Southern'),pick('Aug 30|Hawaii').recap_url),true);
  assert.equal(worker.recapMatchesEvent(fixture('recap-volleyball-2026-8-30-georgia-southern.html.gz'),pick('Aug 30|Hawaii'),pick('Aug 30|Georgia Southern').recap_url),true);
  // The card's own link needs no headline: the PVAMU football story's
  // headline names no opponent.
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-football-2026-9-12-pvamu.html.gz'),finals[1],finals[1].recap_url),true);
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-football-2026-9-12-pvamu.html.gz'),{...finals[1],recap_url:null},finals[1].recap_url),false,'another candidate must name the opponent in its headline');
  // End to end: each Aug 30 match's expanded view uses its own story.
  for(const [key,file,expected] of [['Aug 30|Hawaii','recap-volleyball-2026-8-30-hawaii.html.gz','Hawaii'],['Aug 30|Georgia Southern','recap-volleyball-2026-8-30-georgia-southern.html.gz','Georgia Southern']]){
    recapFixtures.set(pick(key).recap_url,fixture(file));
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Baylor won the opening set behind a strong serving run.','The Bears blocked well at the net throughout the match.','Baylor closed out the deciding set with a late run.','The Bears finished the tournament with a win on the day.'])};}}};
    const events=worker.parseHtml(fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,now);
    const target=events.find(e=>e.id===pick(key).id);
    await worker.attachOfficialHighlights(events,fixture('volleyball-schedule.html.gz'),school,'Volleyball',vbUrl,now,env,target.id);
    assert.equal(target.highlight_state,'recap_generated',`${expected}: highlights from the official recap`);
    assert.equal(target.recap_url,pick(key).recap_url);
    assert.ok(prompts[0].includes(file.includes("hawaii")?"five-set":"3-1 win over Georgia Southern")&&!prompts[0].includes(file.includes("hawaii")?"3-1 win over Georgia Southern":"five-set"),`${expected}: the AI is given that match's story`);
  }
  // Live: ESPN's women's college volleyball scoreboard. The Sep 25 payload
  // also holds California Golden Bears, Morgan State, Mercer and Missouri
  // State Bears; only Baylor at BYU is Baylor's.
  assert.deepEqual(worker.liveScoreboardProviders(school,'Volleyball').map(p=>p.path),['volleyball/womens-college-volleyball']);
  const payload=JSON.parse(fixture('volleyball-espn-2026-09-25.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Volleyball');
  const scored=worker.parseScoreboardPayload(payload,school,'Volleyball',provider,'https://site.api.espn.com/apis/site/v2/sports/volleyball/womens-college-volleyball/scoreboard?limit=1000&dates=20260925',new Date('2026-09-26T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Baylor at BYU','Final','L, 2-3']]);
  const reconciled=worker.reconcileScoreboardEvents(vb,scored);
  assert.equal(reconciled.length,vb.length,'the scoreboard joins the official match; no second card');
}

// Soccer: page-data reader. Production showed dates without times and
// rankings ("#9 West Virginia", "#10 Arkansas"); the postseason events run
// several days.
{
  const socUrl='https://baylorbears.com/sports/womens-soccer/schedule';
  const soc=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',socUrl,now);
  assert.equal(soc.length,24);
  const socFinals=soc.filter(e=>e.status==='Final');
  assert.equal(socFinals.length,12);
  assert.ok(socFinals.every(e=>/^[WLT], \d+-\d+$/.test(e.headline)&&e.recap_url?.startsWith('https://baylorbears.com/news/2026/')),'every final in K-State wording with its own recap');
  assert.deepEqual(socFinals.filter(e=>['Aug 12','Sep 18'].includes(e.display_time)).map(e=>`${e.title} ${e.headline}`),['Baylor at Arkansas W, 4-1','Baylor at West Virginia T, 1-1'],'ties read "T, 1-1"; rankings dropped');
  const socUpcoming=soc.filter(e=>e.status!=='Final');
  assert.deepEqual(socUpcoming.slice(0,2).map(e=>`${e.title} ${e.display_time}`),['Baylor at Colorado Oct 8, 8:00 PM','Baylor vs Kansas State Oct 11, 12:00 PM']);
  assert.ok(socUpcoming.slice(0,7).every(e=>/, \d{1,2}:\d{2} [AP]M$/.test(e.display_time)),'regular-season games show their published times');
  const big12=socUpcoming.find(e=>e.opponent==='Big 12 Tournament');
  assert.deepEqual([big12.display_time,big12.end_time],['Nov 9','2026-11-14T23:59:59Z'],'postseason events end on their last day');
  // During the tournament it is today's event, not a passed date.
  const during=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer',socUrl,new Date('2026-11-11T17:00:00Z')).find(e=>e.opponent==='Big 12 Tournament');
  assert.deepEqual([during?.status,during?.recency_label],['Today','In progress']);
  // Recaps: the card's own link, and the headline rule for any other
  // candidate ("SOC Tops Texas A&M, 2-1").
  const am=socFinals.find(e=>e.opponent==='Texas A&M'),ku=socFinals.find(e=>e.opponent==='Kansas');
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-soccer-2026-8-16-texas-am.html.gz'),{...am,recap_url:null},am.recap_url),true,'"Texas A&M" in the headline');
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-soccer-2026-10-2-kansas.html.gz'),ku,ku.recap_url),true);
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-soccer-2026-10-2-kansas.html.gz'),am,ku.recap_url),false);
  // Live: ESPN's women's college soccer scoreboard; Kansas at Baylor (Oct 2).
  assert.deepEqual(worker.liveScoreboardProviders(school,'Soccer').map(p=>p.path),['soccer/usa.ncaa.w.1']);
  const payload=JSON.parse(fixture('soccer-espn-2026-10-02.json.gz'));
  const [provider]=worker.liveScoreboardProviders(school,'Soccer');
  const scored=worker.parseScoreboardPayload(payload,school,'Soccer',provider,'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.ncaa.w.1/scoreboard?limit=1000&dates=20261002',new Date('2026-10-03T12:00:00Z'));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),[['Baylor vs Kansas','Final','W, 3-1']]);
  const reconciled=worker.reconcileScoreboardEvents(soc,scored);
  assert.equal(reconciled.length,soc.length,'the scoreboard joins the official game; no second card');
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),[['Baylor vs Kansas','W, 3-1']]);
}

// Cross Country: page-data reader plus complete results from TFRRS. Production
// read "Completed" for two of three meets, with no race rows; Baylor's recaps
// name only some runners, the Texas A&M Invitational has none, and the
// schedule's "Results" links go to Flash Results and XpressTiming.
{
  const xcUrl='https://baylorbears.com/sports/cross-country/schedule';
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/TX_college_f_Baylor.html','tfrrs-team-women.html.gz'],['https://www.tfrrs.org/teams/xc/TX_college_m_Baylor.html','tfrrs-team-men.html.gz'],['https://www.tfrrs.org/results/xc/28140/Aggie_Opener','tfrrs-xc-28140.html.gz'],['https://www.tfrrs.org/results/xc/28142/Texas_AM_Invitational_College_Entries','tfrrs-xc-28142.html.gz'],['https://www.tfrrs.org/results/xc/27306/Southern_Showcase_University_College_','tfrrs-xc-27306.html.gz']])recapFixtures.set(url,fixture(file));
  const xc=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now);
  assert.deepEqual(xc.map(e=>`${e.status} ${e.title}`),['Final Baylor at Aggie Opener','Final Baylor at Texas A&M Invitational','Final Baylor at The Southern Showcase','Today Baylor at Chile Pepper Festival','Upcoming Baylor at Arturo Barrios Invitational','Upcoming Baylor at Big 12 Championship','Upcoming Baylor at NCAA South Central Regional','Upcoming Baylor at NCAA Championship'],'meets read "Baylor at ..." as K-State\'s');
  const [opener,aggies,showcase]=xc;
  assert.equal(opener.headline,"Women's team: 3rd / Men's team: 4th",'the schedule\'s "Women 3rd, Men 4th", women first');
  // Recaps come from the schedule's "Recap" files (not the result's recap).
  assert.deepEqual(xc.slice(0,3).map(e=>e.recap_url||null),['https://baylorbears.com/news/2026/9/4/cross-country-women-3rd-men-4th-at-aggie-opener',null,'https://baylorbears.com/news/2026/9/18/cross-country-kimeli-records-top-10-finish-in-season-debut']);
  for(const event of [opener,aggies,showcase])await worker.attachOfficialMeetResults(event);
  assert.equal(opener.headline,"Women's team: 3rd · 88 pts / Men's team: 4th · 97 pts");
  assert.deepEqual(opener.results.slice(0,3).map(r=>[r.group,r.participant,r.result]),[["Women's 2 Mile",'Baylor team','3rd · 88 pts'],["Women's 2 Mile",'Ella Perry','9th · 11:13.2'],["Women's 2 Mile",'Eva Jacobsen','12th · 11:17.7']]);
  assert.deepEqual([opener.results.length,opener.results.filter(r=>r.group==="Men's 5K").length],[13,6],'every Baylor runner, both races');
  assert.equal(opener.results_source_url,'https://www.tfrrs.org/results/xc/28140/Aggie_Opener');
  assert.equal(opener.source.url,opener.recap_url,'the source link stays on baylorbears.com');
  // No team score (too few runners): the headline names each first finisher.
  assert.equal(aggies.headline,"Women's: Lucy Benton 68th / Men's: Matthew King 36th");
  assert.deepEqual(aggies.results.map(r=>`${r.group} ${r.participant} ${r.result}`),["Women's 5K Lucy Benton 68th · 19:13.2","Women's 5K Jenna Jacobsen 82nd · 19:41.8","Men's 8K Matthew King 36th · 25:35.9","Men's 8K Caleb Larsen 61st · 26:14.1","Men's 8K Caden Biltz 80th · 26:50.0"]);
  assert.equal(aggies.source.url,xcUrl);
  assert.deepEqual(aggies.highlights,["Lucy Benton led Baylor in the women's 5K, finishing 68th in 19:13.2.","Matthew King led Baylor in the men's 8K, finishing 36th in 25:35.9.","Jenna Jacobsen finished 82nd in 19:41.8 in the women's 5K.","Caleb Larsen finished 61st in 26:14.1 in the men's 8K."]);
  assert.equal(showcase.headline,"Women's team: 12th · 348 pts / Men's: Jack Sterrett 76th");
  assert.ok(!showcase.results.some(r=>r.participant==='Baylor Wolfe'),'App State\'s Baylor Wolfe is not a Baylor runner');
  assert.equal(showcase.results.find(r=>r.participant==='Ruth Kimeli').result,'9th · 16:18.8','the recap\'s "ninth in 16:18.8"');
  for(const event of [opener,aggies,showcase]){
    assert.equal(event.highlight_state,'official_recap_results');
    assert.ok(event.highlights.length===4&&event.highlights.every(line=>event.results.some(r=>line.includes(r.participant))||/^Baylor's (wo)?men placed/.test(line)),'highlights only from the verified rows');
  }
  // A schedule place that disagrees with TFRRS is not overwritten.
  const wrong=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now)[0];
  wrong.headline="Women's team: 2nd / Men's team: 4th";
  await worker.attachOfficialMeetResults(wrong);
  assert.deepEqual([wrong.meet_results_verified,wrong.headline],[false,"Women's team: 2nd / Men's team: 4th"]);
  // The feed attaches the same rows; the expanded view reuses them.
  const feed=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now);
  await worker.attachOfficialHighlights(feed,fixture('cross-country-schedule.html.gz'),school,'Cross Country',xcUrl,now,{AI:{run:async()=>{throw Error('the AI must not write meet highlights');}}},feed[2].id);
  assert.deepEqual([feed[2].headline,feed[2].result_count],[showcase.headline,showcase.result_count]);
}

// Stored expanded views written before the cross country highlights grew to
// four lines are not served again: Baylor's store keys carry its revision;
// other schools' keys are unchanged.
{
  const {highlightStoreKey}=Function(...Object.keys(deps),source+';return {highlightStoreKey};')(...Object.values(deps));
  assert.equal(highlightStoreKey('baylor','Cross Country','x'),'v1:baylor|Cross Country|x|r2');
  assert.equal(highlightStoreKey('ucf','Football','x'),'v1:ucf|Football|x');
}

// Basketball: the two official pages only (production also tried the generic
// page and the homepage), both labeled; exhibitions written "(EXH)" read
// "(Exhibition)"; published times ("1 pm", "2 p.m. CT").
{
  assert.deepEqual(worker.candidateUrls(school,'Basketball'),['https://baylorbears.com/sports/mens-basketball/schedule','https://baylorbears.com/sports/womens-basketball/schedule']);
  const mensUrl='https://baylorbears.com/sports/mens-basketball/schedule',womensUrl='https://baylorbears.com/sports/womens-basketball/schedule';
  const mens=worker.labelTeamEvents(worker.parseHtml(fixture('basketball-mens-schedule.html.gz'),school,'Basketball',mensUrl,now),school,'Basketball',mensUrl);
  const womens=worker.labelTeamEvents(worker.parseHtml(fixture('basketball-womens-schedule.html.gz'),school,'Basketball',womensUrl,now),school,'Basketball',womensUrl);
  assert.deepEqual([mens.length,womens.length],[36,33]);
  const all=[...mens,...womens];
  assert.equal(new Set(all.map(e=>e.id)).size,69,'both teams play Jan 2; their ids stay apart');
  assert.deepEqual(mens.slice(0,3).map(e=>`${e.title} ${e.display_time}`),["Men's · Baylor vs Florida (Exhibition) Oct 18, 1:00 PM","Men's · Baylor at Illinois (Exhibition) Oct 23","Men's · Baylor vs Northwestern State Nov 2, 8:30 PM"]);
  assert.deepEqual(womens.slice(0,2).map(e=>`${e.title} ${e.display_time}`),["Women's · Baylor vs West Texas A&M (Exhibition) Oct 25, 2:00 PM","Women's · Baylor vs Fairleigh Dickinson Nov 2, 6:00 PM"]);
  // "4:30 or 7 p.m. CT" is not a published time: the date alone.
  assert.equal(womens.find(e=>e.opponent==='Seton Hall or South Florida').display_time,'Nov 28');
  assert.deepEqual([mens.at(-1).opponent,mens.at(-1).end_time],['Big 12 Championship','2027-03-13T23:59:59Z']);
  // Live: ESPN's men's and women's scoreboards, labeled. Feb 21, 2026: Arizona
  // State at Baylor (men) and Arizona at Baylor (women), among eight other
  // "Bears" games each.
  const providers=worker.liveScoreboardProviders(school,'Basketball');
  assert.deepEqual(providers.map(p=>[p.path,p.team_label]),[['basketball/mens-college-basketball',"Men's"],['basketball/womens-college-basketball',"Women's"]]);
  const scored=providers.flatMap((provider,i)=>worker.parseScoreboardPayload(JSON.parse(fixture(`basketball-${i?'womens':'mens'}-espn-2026-02-21.json.gz`)),school,'Basketball',provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard?groups=50&limit=300&dates=20260221`,new Date('2026-02-22T12:00:00Z')));
  assert.deepEqual(scored.map(e=>[e.title,e.headline]),[["Men's · Baylor vs Arizona St","W, 73-68"],["Women's · Baylor vs Arizona","W, 74-60"]]);
}

// Baseball: the official page only (production also tried the homepage);
// spring 2027 with published times ("4 PM"); postseason ranges end on their
// last day; doubleheaders kept as Game 1 / Game 2.
{
  const baseUrl='https://baylorbears.com/sports/baseball/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Baseball'),[baseUrl]);
  const baseball=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball',baseUrl,now);
  assert.equal(baseball.length,59);
  assert.equal(new Set(baseball.map(e=>e.id)).size,59);
  assert.deepEqual(baseball.slice(0,2).map(e=>`${e.title} ${e.display_time}`),['Baylor vs UIC Feb 19, 4:00 PM','Baylor vs UIC Feb 20, 3:00 PM']);
  assert.deepEqual(baseball.slice(-1).map(e=>[e.opponent,e.end_time]),[["NCAA Men's College World Series",'2027-06-28T23:59:59Z']]);
  // A doubleheader (moved here: the 2027 page has none yet): the second UIC
  // game on Feb 19.
  const doubled=fixture('baseball-schedule.html.gz').replace('"2027-02-20T15:00:00"','"2027-02-19T19:00:00"');
  const pair=worker.parseHtml(doubled,school,'Baseball',baseUrl,now).filter(e=>e.opponent==='UIC'&&e.display_time.startsWith('Feb 19'));
  assert.deepEqual(pair.map(e=>[e.title,e.game_number]),[['Baylor vs UIC (Game 1)',1],['Baylor vs UIC (Game 2)',2]]);
  assert.equal(new Set(pair.map(e=>e.id)).size,2);
  // Live: ESPN's college baseball scoreboard (Apr 10, 2026: Baylor at
  // Cincinnati among four "Bears" games).
  const [provider]=worker.liveScoreboardProviders(school,'Baseball');
  assert.equal(provider.path,'baseball/college-baseball');
  const scored=worker.parseScoreboardPayload(JSON.parse(fixture('baseball-espn-2026-04-10.json.gz')),school,'Baseball',provider,'https://site.api.espn.com/',new Date('2026-04-11T12:00:00Z'));
  assert.deepEqual(scored.map(e=>e.title),['Baylor at Cincinnati']);
}

// Softball: the official page only (production also tried the homepage);
// spring 2027 with published times ("3:30 pm"); a tournament's "TBD" games
// named after it; postseason ranges end on their last day.
{
  const softUrl='https://baylorbears.com/sports/softball/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Softball'),[softUrl]);
  const softball=worker.parseHtml(fixture('softball-schedule.html.gz'),school,'Softball',softUrl,now);
  assert.equal(softball.length,54);
  assert.equal(new Set(softball.map(e=>e.id)).size,54);
  assert.deepEqual(softball.filter(e=>/Getterman|TBD/.test(e.title)).map(e=>`${e.title} ${e.display_time}`),['Baylor vs Getterman Classic Feb 20','Baylor vs Getterman Classic Feb 21'],'"TBD" games named after their tournament');
  assert.equal(softball[0].display_time,'Feb 11, 3:30 PM');
  assert.deepEqual(softball.filter(e=>e.opponent==='Aggie Classic').map(e=>e.end_time),['2027-02-28T23:59:59Z']);
  assert.deepEqual(softball.slice(-1).map(e=>[e.opponent,e.end_time]),[["Women's College World Series",'2027-06-11T23:59:59Z']]);
  // Live: ESPN's college softball scoreboard (Apr 10, 2026: Baylor at Kansas,
  // a doubleheader).
  const [provider]=worker.liveScoreboardProviders(school,'Softball');
  assert.equal(provider.path,'baseball/college-softball');
  const scored=worker.parseScoreboardPayload(JSON.parse(fixture('softball-espn-2026-04-10.json.gz')),school,'Softball',provider,'https://site.api.espn.com/',new Date('2026-04-11T12:00:00Z'));
  // That day was a doubleheader: ESPN lists both games. The shared parser gave
  // them one id and kept one; they are Game 1 and Game 2 in start order (shared
  // code, every school; user: "Fix both").
  assert.deepEqual(scored.map(e=>[e.title,e.headline,e.game_number]),[['Baylor at Kansas (Game 1)','W, 8-7',1],['Baylor at Kansas (Game 2)','L, 0-1',2]]);
  assert.equal(new Set(scored.map(e=>e.id)).size,2);
  // Each joins its own official game (Game 1 / Game 2), not both the first.
  const official=worker.parseHtml(fixture('baseball-schedule.html.gz').replace('"2027-02-20T15:00:00"','"2027-02-19T19:00:00"'),school,'Baseball','https://baylorbears.com/sports/baseball/schedule',now).filter(e=>e.opponent==='UIC'&&e.display_time.startsWith('Feb 19')).map(e=>({...e,sport:'Softball',opponent:'Kansas',start_time:e.start_time.replace('2027-02-19','2026-04-10')}));
  const joined=worker.reconcileScoreboardEvents(official,scored);
  assert.equal(joined.length,2,'no extra card');
  assert.deepEqual(joined.map(e=>[e.game_number,e.headline,e.verification_state]),[[1,'W, 8-7','official_schedule+live_scoreboard'],[2,'L, 0-1','official_schedule+live_scoreboard']]);
  // Two scores on one day never overwrite one official game: the second
  // becomes its own card.
  const single=worker.reconcileScoreboardEvents([official[0]].map(e=>({...e,game_number:undefined})),scored);
  assert.deepEqual(single.map(e=>e.headline),['W, 8-7','L, 0-1']);
}

// Golf: both teams' official pages (production showed the women's page only),
// labeled; one event per tournament (production showed every round); K-State's
// "9th (844)" from the schedule's "9th (+4, 844)".
{
  assert.deepEqual(worker.candidateUrls(school,'Golf'),['https://baylorbears.com/sports/womens-golf/schedule','https://baylorbears.com/sports/mens-golf/schedule']);
  const golfFiles={'cougar-classic':'recap-golf-2026-9-8-cougar-classic.html.gz','schooner':'recap-golf-2026-9-21-schooner.html.gz','first-event-in-arizona':'recap-golf-2026-9-8-bomb-darts.html.gz','fighting-illini':'recap-golf-2026-9-19-fighting-illini.html.gz'};
  recapFixtures.set('https://baylorbears.com/sports/womens-golf/archives',fixture('golf-womens-archives.html.gz'));
  const read=team=>{const url=`https://baylorbears.com/sports/${team}-golf/schedule`;return worker.labelTeamEvents(worker.parseHtml(fixture(`golf-${team}-schedule.html.gz`),school,'Golf',url,now),school,'Golf',url);};
  const womens=read('womens'),mens=read('mens');
  assert.deepEqual([womens.length,mens.length],[13,12],'34 and 33 round entries become 13 and 12 tournaments');
  assert.deepEqual(womens.filter(e=>e.status==='Final').map(e=>[e.title,e.headline,e.end_time]),[["Women's · Baylor at Charleston Intercollegiate",'3rd (845)','2026-09-08T23:59:59Z'],["Women's · Baylor at Schooner Fall Classic",'9th (844)','2026-09-21T23:59:59Z']]);
  // The Fighting Illini's first entry ("15th (+7, 287)") was a day's
  // standing; the last round's is the result.
  assert.deepEqual(mens.filter(e=>e.status==='Final').map(e=>[e.title,e.headline]),[["Men's · Baylor at Bomb Darts Birds Collegiate",'T7th (832)'],["Men's · Baylor at Fighting Illini Invitational",'15th (851)']]);
  assert.deepEqual([womens[2].title,womens[2].status,womens[2].end_time],["Women's · Baylor at Tennessee Intercollegiate",'Upcoming','2026-10-05T23:59:59Z']);
  assert.equal(new Set([...womens,...mens].map(e=>e.id)).size,25);
  // The Charleston Intercollegiate links no story; Baylor's is in the archive
  // as "Cougar Classic", dated on the last day, with the schedule's own place
  // and score to par ("third-place finish", "5-under").
  const charleston=womens[0];
  assert.equal(worker.baylorHandlers.isBaylorGolfWithoutStory(charleston),true);
  recapFixtures.set('https://baylorbears.com/news/2026/9/8/womens-golf-baylor-wgolf-finishes-in-3rd-at-cougar-classic',fixture(golfFiles['cougar-classic']));
  await worker.baylorHandlers.attachGolfStory(charleston);
  assert.equal(charleston.recap_url,'https://baylorbears.com/news/2026/9/8/womens-golf-baylor-wgolf-finishes-in-3rd-at-cougar-classic');
  // A different place is not this story.
  const other=read('womens')[0];other.headline='4th (845)';
  await worker.baylorHandlers.attachGolfStory(other);
  assert.equal(other.recap_url,undefined);
  // Expanded view: every final's highlights come from its own story.
  for(const [team,index,key] of [['womens',0,'cougar-classic'],['womens',1,'schooner'],['mens',0,'first-event-in-arizona'],['mens',1,'fighting-illini']]){
    const url=`https://baylorbears.com/sports/${team}-golf/schedule`,events=read(team),target=events.filter(e=>e.status==='Final')[index];
    if(target.recap_url)recapFixtures.set(target.recap_url,fixture(golfFiles[key]));
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Baylor opened the tournament with a strong first round of play.','The Bears moved up the leaderboard during the second round today.','A Baylor golfer posted the low round for the team this week.','Baylor closed the event with a steady final round on the course.'])};}}};
    await worker.attachOfficialHighlights(events,fixture(`golf-${team}-schedule.html.gz`),school,'Golf',url,now,env,target.id);
    assert.equal(target.highlight_state,'recap_generated',`${target.title}: highlights from its own story`);
    assert.ok(target.recap_url.includes(key));
    assert.equal(prompts.length,1);
  }
}

// Tennis: both teams' official pages (production showed the women's page
// only), labeled; tournaments read "Baylor at ..."; the fall scrimmage is
// internal; a past tournament is listed only with Baylor's story (the women's
// Rice Invitational has none, on the schedule or in the archive); a tournament
// in progress is today's event.
{
  assert.deepEqual(worker.candidateUrls(school,'Tennis'),['https://baylorbears.com/sports/womens-tennis/schedule','https://baylorbears.com/sports/mens-tennis/schedule']);
  const read=team=>{const url=`https://baylorbears.com/sports/${team}-tennis/schedule`;return worker.labelTeamEvents(worker.parseHtml(fixture(`tennis-${team}-schedule.html.gz`),school,'Tennis',url,now),school,'Tennis',url);};
  const womens=read('womens'),mens=read('mens');
  assert.deepEqual([womens.length,mens.length],[8,11]);
  assert.ok(!womens.some(e=>/Scrimmage|Rice Invitational/.test(e.title)));
  assert.deepEqual(womens.slice(0,2).map(e=>[e.title,e.status,e.recency_label,e.end_time]),[["Women's · Baylor at ITA All-American Championships",'Final','Final','2026-09-27T23:59:59Z'],["Women's · Baylor at Blue Gray Tennis Classic",'Today','In progress','2026-10-04T23:59:59Z']]);
  assert.equal(mens[0].title,"Men's · Baylor at ITA All-American Championships");
  assert.equal(new Set([...womens,...mens].map(e=>e.id)).size,19,'both teams at the ITA All-Americans keep their own ids');
  // Expanded view: each team's ITA story, dated on the last day (Sep 27, the
  // tournament began Sep 19); neither team takes the other's.
  for(const [team,events] of [['womens',womens],['mens',mens]]){
    const target=events[0],url=`https://baylorbears.com/sports/${team}-tennis/schedule`;
    recapFixtures.set(target.recap_url,fixture(`recap-tennis-2026-9-27-${team}-ita.html.gz`));
    const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Baylor reached the doubles quarterfinals at the tournament this week.','A Baylor player won two singles matches in the main draw this week.','The Bears earned a qualifying spot for the national championship.','Baylor closed the tournament with several strong performances overall.'])};}}};
    await worker.attachOfficialHighlights(events,fixture(`tennis-${team}-schedule.html.gz`),school,'Tennis',url,now,env,target.id);
    assert.equal(target.highlight_state,'recap_generated',`${team}: highlights from the team's own story`);
    assert.equal(prompts.length,1);
  }
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-tennis-2026-9-27-womens-ita.html.gz'),{...mens[0],recap_url:null,end_time:null,start_time:'2026-09-27T12:00:00.000Z'},womens[0].recap_url),false,"the men's event refuses the women's story");
  assert.equal(worker.baylorHandlers.matchesRecap(fixture('recap-tennis-2026-9-27-mens-ita.html.gz'),{...mens[0],recap_url:null,end_time:null,start_time:'2026-09-27T12:00:00.000Z'},mens[0].recap_url),true,'its own team\'s story on that day matches');
}

// Equestrian: the official page only (production also tried the homepage);
// rankings dropped ("#10 UT Martin"); published times ("11 AM"); the Oct 2
// doubleheader against two opponents stays two meets with the one story; the
// championships named after the event ("Big 12" is the Big 12 Equestrian
// Championship).
{
  const eqUrl='https://baylorbears.com/sports/equestrian/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Equestrian'),[eqUrl]);
  const eq=worker.parseHtml(fixture('equestrian-schedule.html.gz'),school,'Equestrian',eqUrl,now);
  assert.equal(eq.length,14);
  assert.deepEqual(eq.filter(e=>e.status==='Final').map(e=>`${e.display_time} ${e.title} ${e.headline}`),['Sep 17 Baylor vs South Dakota State L, 8-12','Oct 2 Baylor at Delaware State W, 12-8','Oct 2 Baylor vs UT Martin W, 9-6']);
  assert.equal(new Set(eq.filter(e=>e.status==='Final').map(e=>e.recap_url)).size,2,'both Oct 2 meets link the one doubleheader story');
  assert.equal(eq[3].display_time,'Oct 9, 11:00 AM');
  assert.deepEqual(eq.slice(-2).map(e=>[e.opponent,e.end_time]),[['Big 12 Equestrian Championship','2027-03-27T23:59:59Z'],['NCEA National Championship','2027-04-17T23:59:59Z']]);
}

// Acrobatics & Tumbling: the sport's page only (acrobatics-and-tumbling is
// SIDEARM's empty template); the page still shows the 2026 season, so the
// current season (July-June) is empty: a valid empty schedule, not a failed
// source. In season the scores read "W, 277.415-256.590".
{
  const atUrl='https://baylorbears.com/sports/acrobatics-tumbling/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Acrobatics & Tumbling'),[atUrl]);
  const raw=fixture('acrobatics-tumbling-schedule.html.gz');
  const empty=worker.baylorHandlers.parseSchedule(raw,school,'Acrobatics & Tumbling',atUrl,now);
  assert.deepEqual([empty.length,worker.baylorHandlers.isEmptySchedule(empty)],[0,true]);
  // A page that answers with no games at all is not "verified empty".
  assert.equal(worker.baylorHandlers.isEmptySchedule([]),false);
  const inSeason=worker.parseHtml(raw,school,'Acrobatics & Tumbling',atUrl,new Date('2026-04-26T17:00:00Z'));
  assert.equal(inSeason.length,12);
  assert.deepEqual(inSeason.slice(0,2).map(e=>`${e.title} ${e.headline}`),['Baylor at Saint Leo W, 277.415-256.590','Baylor at Azusa Pacific W, 283.375-260.500'],'decimal scores; rankings dropped');
  assert.ok(inSeason.every(e=>e.recap_url?.startsWith('https://baylorbears.com/news/2026/')));
}

// Track & Field: the official page only (production also tried another slug
// and the homepage); the page still shows "2025-26 Track & Field Schedule",
// so the current season is a verified empty schedule. In season, meets read
// "Baylor at ..." with the team places written several ways.
{
  const tfUrl='https://baylorbears.com/sports/track-and-field/schedule';
  assert.deepEqual(worker.candidateUrls(school,'Track & Field'),[tfUrl]);
  const raw=fixture('track-field-schedule.html.gz');
  const empty=worker.baylorHandlers.parseSchedule(raw,school,'Track & Field',tfUrl,now);
  assert.deepEqual([empty.length,worker.baylorHandlers.isEmptySchedule(empty)],[0,true]);
  const inSeason=worker.parseHtml(raw,school,'Track & Field',tfUrl,new Date('2026-06-20T17:00:00Z'));
  assert.equal(inSeason.length,17);
  const place=name=>inSeason.find(e=>e.opponent===name).headline;
  assert.equal(place('Big 12 Indoor Championship'),"Women's team: T7th / Men's team: 11th",'"Women T7th (16); Men 11th (of 13)"');
  assert.equal(place('NCAA Indoor Championships'),"Women's team: T21st · 11 pts / Men's team: T38th · 6 pts",'"Women T-21st (11 points); Men T-38th (6 points)"');
  assert.equal(place('Big 12 Outdoor Championship'),"Women's team: 5th · 61 pts / Men's team: 10th · 37 pts",'"Women 5th of 16 (61 points); M 10th of 13 (37 points)"');
  assert.equal(inSeason.find(e=>e.opponent==='Michael Johnson Invitational').recap_url,'https://baylorbears.com/news/2026/4/26/track-field-t-f-bears-close-michael-johnson-with-4x400-sweep','a story the day after the last day');
}

console.log('Baylor module checks passed');
