import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers,parseUcfRecapResults} from '../src/schools/ucf.mjs';
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights};')(...Object.values(deps));

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
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Soccer','Swimming & Diving'],'both teams are shown for these sports');
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

// Soccer: UCF has a women's (Big 12) and a men's (Sun Belt) team; production
// loaded only the women's page and showed duplicates. Both pages now load,
// labeled by team. Preseason exhibitions ("Completed", no score) and the
// postponed Sep 3 FIU game are left out; bracket cards are named after their
// tournament.
{
  const soccer={};
  for(const team of ['womens','mens']){
    const url=`https://ucfknights.com/sports/${team}-soccer/schedule`;
    soccer[team]=worker.labelTeamEvents(worker.parseHtml(fixture(`${team}-soccer-schedule.html.gz`),school,'Soccer',url,now),school,'Soccer',url);
  }
  assert.deepEqual(worker.candidateUrls(school,'Soccer'),['https://ucfknights.com/sports/womens-soccer/schedule','https://ucfknights.com/sports/mens-soccer/schedule']);
  assert.deepEqual([soccer.womens.length,soccer.mens.length],[20,17],'one event per card with a result or a date to come');
  const all=[...soccer.womens,...soccer.mens];
  assert.equal(new Set(all.map(e=>e.id)).size,all.length,'no duplicate events across the two teams');
  assert.ok(soccer.womens.every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens'))&&soccer.mens.every(e=>e.team_label==="Men's"&&e.id.endsWith('-mens')),'every event is labeled by team');
  assert.ok(!all.some(e=>['Jacksonville','FGCU','FIU','Daytona State','North Florida'].includes(e.opponent)&&!e.headline&&e.status!=='Upcoming'),'no result-less exhibition or postponed game');
  assert.ok(!all.some(e=>e.opponent==='FIU'),'the postponed FIU game is left out');
  const finals=team=>soccer[team].filter(e=>e.status==='Final').map(e=>`${e.display_time} ${e.opponent} ${e.headline}`);
  assert.deepEqual(finals('womens'),['Aug 13 Florida W, 4-3','Aug 20 LSU W, 2-1','Aug 23 South Florida W, 2-0','Aug 27 UAB W, 3-1','Sep 6 Brown L, 0-7','Sep 10 North Florida W, 1-0','Sep 17 Texas Tech T, 2-2','Sep 24 BYU L, 1-3','Sep 27 Utah L, 0-2'],'rankings ("-/#21 LSU") dropped; ties read "T, 2-2"');
  assert.deepEqual(finals('mens'),['Aug 20 Boston U. W, 1-0','Aug 23 Florida Atlantic T, 0-0','Aug 28 South Florida W, 2-0','Sep 1 Clemson L, 1-4','Sep 6 Florida Polytechnic W, 6-0','Sep 11 VCU W, 2-0','Sep 18 James Madison L, 0-1','Sep 22 Stetson T, 1-1','Sep 27 Kentucky T, 1-1']);
  assert.ok(all.filter(e=>e.status==='Final').every(e=>e.recap_url&&e.recap_url.includes(e.team_label==="Men's"?'/mens-soccer':'womens-soccer')),'every final links its own team\'s recap');
  assert.deepEqual(soccer.womens.slice(-3).map(e=>`${e.title} ${e.display_time}`),[
    "Women's · UCF vs Big 12 Soccer Tournament · Quarterfinal Round Nov 9","Women's · UCF vs Big 12 Soccer Tournament · Semifinal Round Nov 11","Women's · UCF vs Big 12 Soccer Tournament · Championship Match Nov 14"
  ]);
  assert.equal(soccer.mens.at(-1).opponent,"2026 Sun Belt Conference Men's Soccer Championship",'a TBD bracket card takes its tournament name');
  assert.equal(soccer.womens.find(e=>e.opponent==='Colorado').display_time,'Oct 2, 7:00 PM','"#17/17 Colorado" keeps its published time');
  // Sep 27: the women at Utah and the men vs Kentucky; each recap matches its own game only.
  const utah=soccer.womens.find(e=>e.opponent==='Utah'),kentucky=soccer.mens.find(e=>e.opponent==='Kentucky');
  const utahRecap=fixture('recap-womens-soccer-2026-09-27-utah.html.gz'),kentuckyRecap=fixture('recap-mens-soccer-2026-09-27-kentucky.html.gz');
  assert.equal(worker.recapMatchesEvent(utahRecap,utah,utah.recap_url),true);
  assert.equal(worker.recapMatchesEvent(kentuckyRecap,kentucky,kentucky.recap_url),true);
  assert.equal(worker.recapMatchesEvent(kentuckyRecap,utah,kentucky.recap_url),false,'the men\'s same-day recap is not the women\'s');
  assert.equal(worker.recapMatchesEvent(utahRecap,kentucky,utah.recap_url),false,'the women\'s same-day recap is not the men\'s');
}

// Cross Country (women only): the card gives the team place ("1st", "6th");
// the recap is prose, with each runner's name linked to the roster. Production
// read the prose with the AI and showed Southern Showcase as "1st · 199 pts"
// (the card says 6th). Rows now come only from the recap text, deterministically.
{
  const url='https://ucfknights.com/sports/cross-country/schedule';
  const meets=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now);
  assert.deepEqual(meets.map(e=>`${e.status} ${e.display_time} ${e.title} ${e.headline||''}`.trim()),[
    "Final Sep 4 UCF at Florida Intercollegiate Women's team: 1st","Final Sep 18 UCF at Southern Showcase Women's team: 6th",
    'Upcoming Oct 16, 10:15 AM UCF at Arturo Barrios Invite','Upcoming Oct 31 UCF at Big 12 Championship','Upcoming Nov 13 UCF at NCAA South Regional Championship'
  ],'one event per card, meets read "UCF at ...", team place from the card');
  const [florida,showcase]=meets;
  assert.ok(florida.recap_url.endsWith('/news/2026/09/4/raquet-leads-knights-to-florida-intercollegiate-crown-in-season-opener'),'a Recap link with "Opens in a new window" still counts');
  recapFixtures.set(florida.recap_url,fixture('recap-cross-country-2026-09-04-florida-intercollegiate.html.gz'));
  recapFixtures.set(showcase.recap_url,fixture('recap-cross-country-2026-09-18-southern-showcase.html.gz'));
  await worker.attachOfficialMeetResults(florida);await worker.attachOfficialMeetResults(showcase);
  const rows=event=>event.results.map(row=>`${row.participant} ${row.result}`);
  assert.equal(florida.headline,"Women's team: 1st · 43 pts");
  assert.deepEqual(rows(florida),['UCF team 1st · 43 pts','Alexandra Raquet 1st · 16:52.88','Caroline Moon 6th · 17:58.09','Madison Patchan 7th · 17:59.24','Bella Brick 12th · 18:13.17','Daisy Ross 13th · 18:13.84','Emily Wheldon 19th · 18:21.70','Bailey McLain 20th · 18:22.46','Sarah Rose 29th · 18:36.02'],
    'the 2013 record holder named in the story (16:50.19) is not a row');
  assert.equal(showcase.headline,"Women's team: 6th · 199 pts",'the place stays the card\'s 6th');
  assert.deepEqual(rows(showcase),['UCF team 6th · 199 pts','Alexandra Raquet 12th · 16:54.2','Caroline Moon 30th · 17:32.8','Emily Wheldon 51st · 17:52.0','Madison Patchan 53rd · 17:54.3','Bailey McLain 56th · 17:56.6','Daisy Ross 79th · 18:13.5','Bella Brick 81st · 18:14.4','Sarah Rose 104th · 18:30.0','Yvone Sandui 19:36.8'],
    '"personal-best 17:32.8" is the race time; "previous best of 17:58.09" is not');
  assert.ok([florida,showcase].every(e=>e.results.every(row=>row.group==="Women's race")&&e.recap_result_count===e.results.length&&e.meet_results_verified&&e.highlight_state==='official_recap_results'));
  assert.deepEqual(showcase.highlights,['UCF placed 6th with 199 points at Southern Showcase.','Alexandra Raquet led UCF in the women\'s race, finishing 12th in 16:54.2.']);
  // The expanded view uses the same rows and never asks the AI.
  const events=worker.parseHtml(fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now);
  let aiCalls=0;
  await worker.attachOfficialHighlights(events,fixture('cross-country-schedule.html.gz'),school,'Cross Country',url,now,{AI:{run:async()=>{aiCalls++;throw Error('AI must not run');}}},events[1].id);
  const listingRequests=requests.filter(u=>!recapFixtures.has(u)).length;
  assert.equal(aiCalls,0,'the AI never reads cross country recaps');
  assert.deepEqual(rows(events[1]),rows(showcase));
  assert.equal(events[1].highlight_state,'official_recap_results','the expanded view keeps the recap rows and highlights');
  // An earlier mark beside a place ("12th ... with a best of 17:19.0") is not
  // the race time.
  const ord=n=>`${n}${['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th'}`;
  const sample='<div class="embed-html"><p><a href="/sports/cross-country/roster/player/a-b">Ann Bee</a>, 12th at the opener with a best of 17:19.0, finished 20th in 17:10.1.</p></div>';
  assert.deepEqual(parseUcfRecapResults(sample,{decodeHtml:x=>x,ordinal:ord,group:'g'}),[{group:'g',participant:'Ann Bee',result:'20th \u00b7 17:10.1'}]);
  // A recap for the other meet is refused, not read.
  const wrong=meets.map(e=>({...e,meet_results_verified:false}))[0];
  recapFixtures.set(wrong.recap_url,fixture('recap-cross-country-2026-09-18-southern-showcase.html.gz'));
  await worker.attachOfficialMeetResults(wrong);
  assert.equal(wrong.highlight_state,'official_results_partial','another meet\'s recap is refused');
  recapFixtures.set(florida.recap_url,fixture('recap-cross-country-2026-09-04-florida-intercollegiate.html.gz'));
}

// Basketball: both official pages only. Production also loaded the generic
// /sports/basketball/ page and the homepage, and showed 132 upcoming games for
// 35 men's and 34 women's cards.
{
  assert.deepEqual(worker.candidateUrls(school,'Basketball'),['https://ucfknights.com/sports/mens-basketball/schedule','https://ucfknights.com/sports/womens-basketball/schedule']);
  const hoops={};
  for(const team of ['mens','womens']){
    const url=`https://ucfknights.com/sports/${team}-basketball/schedule`;
    hoops[team]=worker.labelTeamEvents(worker.parseHtml(fixture(`${team}-basketball-schedule.html.gz`),school,'Basketball',url,now),school,'Basketball',url);
  }
  assert.deepEqual([hoops.mens.length,hoops.womens.length],[35,34],'one event per official card');
  const all=[...hoops.mens,...hoops.womens];
  assert.equal(new Set(all.map(e=>e.id)).size,69,'no duplicates across the two teams');
  assert.ok(all.every(e=>e.status==='Upcoming'&&!e.headline&&!e.recap_url),'the season has not started');
  assert.deepEqual(hoops.mens.slice(0,2).map(e=>`${e.title} ${e.display_time}`),["Men's · UCF at LSU Oct 14, 8:00 PM","Men's · UCF at Kentucky Oct 28"]);
  assert.deepEqual(hoops.womens.slice(0,2).map(e=>`${e.title} ${e.display_time}`),["Women's · UCF vs Auburn Oct 14, 1:00 PM","Women's · UCF vs St. Leo Oct 25"]);
  assert.equal(hoops.mens.at(-1).title,"Men's · UCF vs Phillips 66 Big 12 Men's Basketball Championship",'the tournament card is named after its heading, without the stale "2025"');
  assert.equal(hoops.mens.at(-1).start_time.slice(0,10),'2027-03-09','spring games take the next year from the schema dates');
  // Live scores: ESPN's men's and women's scoreboards, labeled to match the
  // official cards. Fixtures: Oklahoma State at UCF (men, Mar 3, 2026, 104-111,
  // with Army Black Knights at Bucknell the same night) and UCF at Houston
  // (women, Mar 1, 2026, 72-62).
  assert.deepEqual(worker.liveScoreboardProviders(school,'Basketball').map(p=>[p.path,p.team_label]),[['basketball/mens-college-basketball',"Men's"],['basketball/womens-college-basketball',"Women's"]]);
  const load=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/ucf-module/${name}`,import.meta.url))).toString('utf8'));
  const [menProvider,womenProvider]=ucfSchool.liveScoreboards.Basketball,scoreUrl='https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?limit=1000&dates=20260303';
  const men=worker.parseScoreboardPayload(load('basketball-espn-mens-20260303.json.gz'),school,'Basketball',menProvider,scoreUrl,new Date('2026-03-04T12:00:00Z'));
  assert.deepEqual(men.map(e=>[e.status,e.title,e.team_label,e.school_score,e.opponent_score]),[['Final',"Men's · UCF vs Oklahoma St","Men's",'104','111']],'UCF\'s side only; Army Black Knights do not match');
  const women=worker.parseScoreboardPayload(load('basketball-espn-womens-20260301.json.gz'),school,'Basketball',womenProvider,scoreUrl,new Date('2026-03-02T12:00:00Z'));
  assert.deepEqual(women.map(e=>[e.title,e.school_score,e.opponent_score]),[["Women's · UCF at Houston",'72','62']]);
}

// Only the converted sports read the cards so far; every other sport keeps the shared parsers.
assert.equal(createUcfHandlers({makeEvent:()=>{throw Error('unused');},visibleText:x=>x,absoluteUrl:x=>x}).parseSchedule(fixture('football-schedule.html.gz'),school,'Baseball',footballUrl,now),null);
console.log('UCF module checks passed');
