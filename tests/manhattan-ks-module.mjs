// Manhattan High School (the first high school): the school calendar is the
// schedule, MaxPreps the scores. Fixtures are the real pages of October 9,
// 2026 (calendar trimmed to the sports read so far; MaxPreps pages trimmed to
// their contest data and box score).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
import {USD383_ABBREVIATIONS} from '../src/schools/manhattan-ks-middle.mjs';
import {boundFinals,boundGame,boundMeet,parseMiddleSchoolTitle,parseCalendarTitle,calendarEvents,maxprepsContests,maxprepsBoxScore,isNamedEvent,namesCompatible,tennisTeamStanding} from '../src/high-school.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>name.endsWith('.gz')?gunzipSync(readFileSync(new URL('./fixtures/manhattan-ks-module/'+name,import.meta.url))).toString('utf8'):read('./fixtures/manhattan-ks-module/'+name);
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='manhattan-ks');
const MAXPREPS='https://www.maxpreps.com/ks/manhattan/manhattan-indians/';
const CALENDAR='https://mhs.usd383.org/api/calendars/128516/events';
const SCHOOL_ID='41006ce9-cfb3-492a-a951-d320637bc985';

// Catalog: a Kansas 6A high school, with no featured athletes (minors).
assert.equal(school.level,'high-school');
assert.equal(school.state,'Kansas');
assert.equal(school.classification,'6A');
// Middle and high school: State, then County, then School, with the town
// shown beside the name (user, October 21; City from October 9).
for(const id of ['manhattan-ks','anthony-ms-ks','eisenhower-ms-ks']){const s=schools.find(x=>x.id===id);assert.equal(s.city,'Manhattan');assert.equal(s.county,'Riley County');}
const page=read('../public/index.html');
assert.equal(page.split("cityOf:s=>s.county||'',middle:'County',middles:'All counties',townOf:s=>s.city||''").length-1,2,'middle and high school have a County box and show the town');
assert.ok(page.includes('return town?`${s.name} — ${town}`:s.name'),'the School box shows the town');
assert.ok(page.includes('<select id="city"'),'the City select exists');
assert.equal(school.conference,'Centennial League');
// Intrasquad scrimmages are practice (an upcoming one is not listed either).
for(const name of ['Inter Squad Scrimmage','Intrasquad','Intra-Squad Scrimmage'])assert.ok(manhattanKsSchool.skip.test(name),name);
assert.ok(!manhattanKsSchool.skip.test('Junction City'));
assert.deepEqual(sponsoredSports['manhattan-ks'],['Cross Country','Football','Golf','Soccer','Tennis','Volleyball']);

// Calendar titles.
assert.deepEqual(parseCalendarTitle('MHS Varsity Football - Junction City - AWAY','MHS'),{team:'Varsity Football',name:'Junction City',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS JV Boys Soccer -Wichita Northwest - AWAY','MHS'),{team:'JV Boys Soccer',name:'Wichita Northwest',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS Varsity Girls Tennis - Regionals -AWAY','MHS'),{team:'Varsity Girls Tennis',name:'Regionals',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS Varsity Football - District - TBD','MHS'),{team:'Varsity Football',name:'District - TBD',site:null});
assert.equal(parseCalendarTitle('MHS - Orchestra Concert','MHS'),null);
assert.equal(parseCalendarTitle('Board of Education Meeting','MHS'),null);
for(const name of ['Manhattan Invite','League Tourn.','6A State Tourn.','MHS TRI','Manhattan Quad','Centennial League','Regionals','Baldwin Invite'])assert.ok(isNamedEvent(name),name);
for(const name of ['Junction City','Wichita North','Topeka High','Washburn Rural','Emporia'])assert.ok(!isNamedEvent(name),name);

// Team points add up across both draws (one row per entry); place among teams.
const points=[{teamName:'Manhattan HS',points:6},{teamName:'Junction City HS',points:9},{teamName:'Manhattan HS',points:4},{teamName:'Topeka HS',points:2},{teamName:'Derby HS',points:10}];
assert.deepEqual(tennisTeamStanding(points,'Manhattan HS'),{points:10,place:1,teams:4,tied:true});
assert.deepEqual(tennisTeamStanding(points.slice(0,4),'Manhattan HS'),{points:10,place:1,teams:3,tied:false});
assert.equal(tennisTeamStanding(points,'Hayden HS'),null);
for(const [a,b] of [['Wichita North','North'],['Topeka High','Topeka'],['Seaman HS','Seaman']])assert.ok(namesCompatible(a,b),`${a} / ${b}`);
for(const [a,b] of [['Blue Valley West','Blue Valley Northwest'],['Hays','Hayden']])assert.ok(!namesCompatible(a,b),`${a} / ${b}`);

// Middle school calendar titles (typed by hand).
const ms=title=>{const p=parseMiddleSchoolTitle(title,{abbreviations:USD383_ABBREVIATIONS});return p&&`${p.team} | ${p.name} | ${p.site}`;};
assert.equal(ms('7th VB vs SH/WRN'),'7th Volleyball | Shawnee Heights / Washburn Rural North | HOME');
assert.equal(ms('8th VB @SH Inv.'),'8th Volleyball | Shawnee Heights Invitational | AWAY');
assert.equal(ms('8TH FB @ Emporia'),'8th Football | Emporia | AWAY');
assert.equal(ms('8h Girls BB @ Washburn Rural'),'8th Girls Basketball | Washburn Rural | AWAY');
assert.equal(ms('7th Football @ AMS'),'7th Football | Anthony | AWAY');
assert.equal(ms('7th VB @ HOME Triangular'),'7th Volleyball | Triangular | HOME');
assert.equal(ms('8th VB Home Triangular'),'8th Volleyball | Triangular | HOME');
assert.equal(ms('Cross Country @ HOME'),'Cross Country | Home event | HOME');
assert.equal(ms('7th Girls BB League Tournament 2nd Round @ AMS'),'7th Girls Basketball | Anthony League Tournament 2nd Round | AWAY');
assert.equal(ms('7th Boys BB @ Washburn Rural @ Washburn Rural North'),'7th Boys Basketball | Washburn Rural | AWAY');
assert.equal(ms('Boys Wrestling @ Fort Riley'),'Boys Wrestling | Fort Riley | AWAY');
assert.equal(ms('Track @ McPherson'),'Track & Field | McPherson | AWAY');
for(const title of ['7th VB B Tourney @WR North','8th VB B Team Tournament at Shawnee Heights','8th Grade Football Scrimmage @ Bishop Stadium','Volleyball Team Pictures','Girls Basketball Tryouts Begin','Boys Wrestling Practice Begins','JV Track @ Junction City','8th Girls BB','Board of Education Meeting'])assert.equal(ms(title),null,title);
for(const id of ['anthony-ms-ks','eisenhower-ms-ks']){const s=schools.find(x=>x.id===id);assert.equal(s.level,'middle-school');assert.equal(s.classification,'Middle School');assert.equal(s.state,'Kansas');}
assert.deepEqual(sponsoredSports['eisenhower-ms-ks'],['Basketball','Cross Country','Football','Track & Field','Volleyball','Wrestling']);

// Varsity only: JV and 9th grade football are not read.
const calendar=JSON.parse(fixture('calendar-2026-27.json'));
const football=calendarEvents(calendar,{prefix:'MHS',team:/^Varsity Football$/i});
assert.equal(football.length,10);
assert.ok(calendar.data.events.some(e=>/MHS JV Football/.test(e.title))&&calendar.data.events.some(e=>/9th Grade Football/.test(e.title)),'the fixture holds JV and 9th grade games');
assert.deepEqual(football.map(g=>`${g.date} ${g.time} ${g.name} ${g.site}`),[
  '2026-08-27 19:00 Inter Squad Scrimmage HOME','2026-09-04 19:30 Rockhurst HOME','2026-09-11 19:00 Mill Valley AWAY','2026-09-18 19:00 Dodge City AWAY','2026-09-25 19:00 Wichita North HOME',
  '2026-10-02 19:00 Junction City AWAY','2026-10-09 19:00 Emporia HOME','2026-10-15 19:00 Topeka High AWAY','2026-10-23 19:00 Washburn Rural HOME','2026-10-30 19:00 District - TBD null'
]);

// MaxPreps contests from the school's side; the deleted one is skipped.
const contests=maxprepsContests(fixture('maxpreps-football-schedule.html'),SCHOOL_ID);
assert.deepEqual(contests.map(c=>`${c.date} ${c.opponent} ${c.result||'-'} ${c.score??''}-${c.opponent_score??''} ${c.conference}`),[
  '2026-09-04 Rockhurst L 28-32 false','2026-09-11 Mill Valley L 7-21 false','2026-09-18 Dodge City W 42-14 false','2026-09-25 North W 70-6 false',
  '2026-10-02 Junction City W 34-7 true','2026-10-09 Emporia - - null','2026-10-15 Topeka - - null','2026-10-23 Washburn Rural - - null'
]);
assert.ok(!contests.some(c=>/East Christian/.test(c.opponent)),'a deleted contest is not read');
assert.equal(contests[2].game_url,'https://www.maxpreps.com/ks/football/game/dodge-city-vs-manhattan/9-18-2026/?c=5a58d13b-212b-490c-b54d-ce254ddba381');
assert.match(contests[2].stream_url,/^https:\/\/www\.nfhsnetwork\.com\//);
const box=maxprepsBoxScore(fixture('maxpreps-football-game-2026-09-18.html'));
assert.deepEqual(box,{periods:['Q1','Q2','Q3','Q4','Final'],teams:[{name:'Manhattan',scores:['7','12','16','7','42']},{name:'Dodge City',scores:['0','7','0','7','14']}]});

// The Worker's feed, from fixtures only.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const TR='https://api.tennisreporting.com/';
const pages=new Map([[`${CALENDAR}?start_date=2026-07-01&end_date=2027-06-30`,fixture('calendar-2026-27.json')],[`${MAXPREPS}football/schedule/`,fixture('maxpreps-football-schedule.html')],[contests[2].game_url,fixture('maxpreps-football-game-2026-09-18.html')],
  ['https://ams.usd383.org/api/calendars/128968/events?start_date=2026-07-01&end_date=2027-06-30',fixture('calendar-ams-2026-27.json')],['https://ems.usd383.org/api/calendars/128776/events?start_date=2026-07-01&end_date=2027-06-30',fixture('calendar-ems-2026-27.json')],
  ['https://letsgoruncom.rsupartner.com/race-results',fixture('letsgorun-race-results.html.gz')],
  ['https://ks.prep.golf/schools/11',fixture('prepgolf-school-11.html.gz')],
  ['https://beta.gobound.com/api/schools/h20250204045200696bcbb2cc6f78a4e/scores?startDate=2026-07-01&endDate=2026-10-09&includePractices=false&pageSize=500&ticket=false',fixture('bound-scores-2026-10-09.json.gz')],
  ...[2431,2446,2453,2571,2577,2651,2663,2674].map(id=>[`https://ks.prep.golf/tournaments/results/${id}`,fixture(`prepgolf-results-${id}.html.gz`)]),
  ...['2026_Manhattan_XC_Invitational','2026_Wamego_Middle_School_Invitational','2026_Fort_Riley_XC_Invitational','2026_Clay_Center_XC_Invitational','2026_Rock_Creek_Cross_Country_Invitational','2026_Centennial_League_Middle_School_XC_Championships'].map(f=>[`http://results.tfmeetpro.com/LetsGoRun_Timing/${f}/`,fixture(`meetpro-${f}.html.gz`)]),
  [`${MAXPREPS}soccer/schedule/`,fixture('maxpreps-soccer-schedule.html')],['https://www.maxpreps.com/ks/soccer/match/manhattan-vs-topeka/8-28-2026/?c=fff1bf1a-f39c-46f0-ab4d-daa0f0f1758f',fixture('maxpreps-soccer-game.html')],['https://www.maxpreps.com/ks/volleyball/match/bishop-carroll-wichita-vs-manhattan/8-29-2026/?c=48cf0816-eb79-40be-bb0f-c7254c3b6392',fixture('maxpreps-volleyball-game.html')],[`${MAXPREPS}volleyball/schedule/`,fixture('maxpreps-volleyball-schedule.html')],
  [`${TR}events#${JSON.stringify({page:0,pageSize:200,sorted:[],filtered:{stateId:23}})}`,fixture('tennisreporting-events-ks.json')],[`${TR}event/975`,fixture('tennisreporting-event-975.json')],[`${TR}event/975/host/4139/schools`,fixture('tennisreporting-975-4139-schools.json')],
  ...['Singles','Doubles'].flatMap(t=>[[`${TR}event/975/host/4139/bracket/get#${JSON.stringify({matchType:t,isConsolation:false})}`,fixture(`tennisreporting-975-4139-${t}.json`)],[`${TR}event/975/seed_list_by_params#${JSON.stringify({host:4139,matchType:t})}`,fixture(`tennisreporting-975-seeds-${t}.json`)]])]);
const requests=[];
const fetch=async(url,init={})=>{
  const key=init.body?`${url}#${init.body}`:String(url);
  requests.push(key);
  const body=pages.get(key);
  if(body==null)throw Error(`Unexpected network request: ${key}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body,json:async()=>JSON.parse(body)};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents,handler}')(...Object.values(deps));

// Oct 9, 2026, 2 PM in Manhattan: Emporia is tonight.
const RealDate=Date,at=new RealDate('2026-10-09T19:00:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
try{
  const live=await worker.fetchLive('manhattan-ks','Football');
  assert.equal(live.error,null);
  const [group]=worker.groupEvents(live.events,at);
  const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
  assert.deepEqual(group.results.map(line),[
    'Final Oct 2, 7:00 PM Manhattan at Junction City | W, 34-7',
    'Final Sep 25, 7:00 PM Manhattan vs Wichita North | W, 70-6',
    'Final Sep 18, 7:00 PM Manhattan at Dodge City | W, 42-14',
    'Final Sep 11, 7:00 PM Manhattan at Mill Valley | L, 7-21',
    'Final Sep 4, 7:30 PM Manhattan vs Rockhurst | L, 28-32'
  ],'five finals, newest first; the intrasquad scrimmage is not a game');
  assert.deepEqual(group.upcoming.map(line),[
    'Today Oct 9, 7:00 PM Manhattan vs Emporia | ',
    'Upcoming Oct 15, 7:00 PM Manhattan at Topeka High | ',
    'Upcoming Oct 23, 7:00 PM Manhattan vs Washburn Rural | ',
    'Upcoming Oct 30, 7:00 PM Manhattan at District - TBD | '
  ]);
  assert.deepEqual(group.records,[{team_label:null,wins:3,losses:2,ties:0,conference:{name:'Centennial League',wins:1,losses:0,ties:0,text:'1-0'},text:'3-2'}]);
  const dodge=group.results[2];
  assert.equal(dodge.recap_url,contests[2].game_url);
  assert.equal(dodge.recap_label,'View MaxPreps game page');
  assert.equal(dodge.conference_game,false);
  assert.equal(group.results[0].conference_game,true);
  assert.equal(group.results[4].recap_url,undefined,'Rockhurst has no MaxPreps game page');
  assert.equal(dodge.highlights,undefined,'the feed does not read game pages');
  assert.ok(!requests.includes(contests[2].game_url));

  // Expanded view: facts from the score and the box score.
  const expanded=(await worker.fetchLive('manhattan-ks','Football',null,dodge.id)).events.find(e=>e.id===dodge.id);
  assert.deepEqual(expanded.highlights,['Manhattan beat Dodge City 42-14 on the road.','Manhattan led 19-7 at halftime.','Manhattan won the 3rd quarter 16-0.']);
  assert.equal(expanded.highlights_verified,true);
  assert.deepEqual(expanded.game_stats.map(s=>`${s.label}: ${s.value}`),['Q1: Manhattan 7 · Dodge City 0','Q2: Manhattan 12 · Dodge City 7','Q3: Manhattan 16 · Dodge City 0','Q4: Manhattan 7 · Dodge City 7']);
  assert.equal(expanded.highlight_status,'Score and box score as reported to MaxPreps by the team.');
  const jc=(await worker.fetchLive('manhattan-ks','Football',null,group.results[0].id)).events.find(e=>e.id===group.results[0].id);
  assert.equal(jc.highlights[0],'Manhattan beat Junction City 34-7 on the road in a Centennial League game.');

  // A failed MaxPreps read leaves every past game without its score: the
  // build is marked and the feed keeps its last good copy (Oct 16: Manhattan
  // football read 0 of 7 results on a forced refresh).
  {
    class MemoryCache{constructor(){this.store=new Map()}async match(r){const hit=this.store.get(String(r.url??r));return hit?hit.clone():undefined}async put(r,response){this.store.set(String(r.url??r),response.clone())}}
    let maxprepsDown=false;
    const flaky=async(url,init={})=>maxprepsDown&&String(url).startsWith(MAXPREPS)?{ok:false,status:503,url:String(url),headers:new Headers(),text:async()=>'',json:async()=>({})}:fetch(url,init);
    const d2={...deps,fetch:flaky,caches:{default:new MemoryCache()}},w2=Function(...Object.keys(d2),source+';return {fetchLive,handler}')(...Object.values(d2));
    const feed=async()=>{const r=await w2.handler.fetch(new Request('https://x.test/live/feed/grouped?school=manhattan-ks&sport=Football&refresh=1'),{},{waitUntil(){}});return{state:r.headers.get('x-sas-cache'),results:(await r.json())[0]?.results?.length??0}};
    assert.deepEqual(await feed(),{state:'live',results:5});
    maxprepsDown=true;
    assert.equal((await w2.fetchLive('manhattan-ks','Football')).scores_missing,true);
    const fallback=await feed();
    assert.notEqual(fallback.state,'live','a build without its scores does not replace the feed');
    assert.equal(fallback.results,5,'the last good copy keeps its five finals');
    maxprepsDown=false;
    assert.equal((await w2.fetchLive('manhattan-ks','Football')).scores_missing,false);
    assert.deepEqual(await feed(),{state:'live',results:5});
    // Only a team with past games needs its scores: the girls' soccer page
    // (spring; no fixture, so every read fails) does not mark the build, the
    // boys' page does (Oct 21: soccer was never saved as a good copy).
    assert.equal((await w2.fetchLive('manhattan-ks','Soccer')).scores_missing,false,'girls soccer has no past games');
    maxprepsDown=true;
    assert.equal((await w2.fetchLive('manhattan-ks','Soccer')).scores_missing,true,'boys soccer has past games');
    maxprepsDown=false;
    // With no saved copy at all, the schedule is still shown (not saved as last good).
    const d3={...deps,fetch:async(u,i)=>String(u).startsWith(MAXPREPS)?{ok:false,status:503,url:String(u),headers:new Headers(),text:async()=>'',json:async()=>({})}:fetch(u,i),caches:{default:new MemoryCache()}},w3=Function(...Object.keys(d3),source+';return {handler}')(...Object.values(d3));
    const first=await w3.handler.fetch(new Request('https://x.test/live/feed/grouped?school=manhattan-ks&sport=Football&refresh=1'),{},{waitUntil(){}});
    assert.equal(first.status,200);assert.equal((await first.json())[0].upcoming.length,4);
  }

  // No athletes for high school (minors).
  const athletes=await worker.handler.fetch(new Request('https://x.test/live/athletes?school=manhattan-ks&sport=Football'),{},{});
  assert.deepEqual(await athletes.json(),[]);

  // Mutations: a calendar that names the game "Wichita North" still joins
  // MaxPreps "North" on its day; a second game that day must match by name.
  const twoGames=[{date:'2026-09-25',opponent:'North',result:'W',score:1,opponent_score:0},{date:'2026-09-25',opponent:'Hays',result:'L',score:0,opponent_score:1}];
  const matchContest=Function(...Object.keys(deps),source+';return matchContest')(...Object.values(deps));
  assert.equal(matchContest({date:'2026-09-25',name:'Wichita North'},twoGames,new Set()).opponent,'North');
  assert.equal(matchContest({date:'2026-09-25',name:'Hays'},twoGames,new Set()).opponent,'Hays');
  assert.equal(matchContest({date:'2026-09-25',name:'Salina Central'},twoGames,new Set()),null);

  // ---- Other fall sports (one block each) ----
  const feed=async sport=>{const r=await worker.fetchLive('manhattan-ks',sport);assert.equal(r.error,null,sport);return worker.groupEvents(r.events,at)[0];};
  const lines=g=>({results:g.results.map(line),upcoming:g.upcoming.map(line),records:g.records.map(r=>`${r.team_label||''} ${r.text}${r.conference?` · ${r.conference.name} ${r.conference.text}`:''}`.trim())});
  // Cross country and golf: meets are named for the host; a past meet with no
  // published result reads "No results posted" (middle and high school rule,
  // October 25). Midnight means no time was set.
  // Cross country: results from the timer's MeetPro pages (LetsGoRun
  // Timing), varsity races only; meets without published results are not
  // listed. Midnight means no time was set.
  const xcGroup=await feed('Cross Country'),xc=lines(xcGroup);
  // Rim Rock (Sep 26) was timed by someone else: its team places come from
  // Bound, where the school entered them (October 21).
  assert.deepEqual(xc.results,['Final Oct 3, 9:00 AM Manhattan at Baldwin Invite | No results posted','Final Sep 26, 8:15 AM Manhattan at Rim Rock | Girls 1st of 10 · Boys 7th of 10','Final Sep 23, 5:45 PM Manhattan at Olathe North | No results posted','Final Sep 19 Manhattan at Missouri Southern Stampede | No results posted','Final Sep 12, 9:00 AM Manhattan at Emporia Invite | No results posted','Final Sep 5, 8:15 AM Manhattan · Manhattan Invite | Boys 2nd of 11 · Girls 1st of 5'],'the Manhattan Invitational (LetsGoRun) and Rim Rock (Bound) have results; the other four meets read as played with no results posted (middle and high school rule, Oct 25)');
  const rimRock=xcGroup.results.find(e=>/Rim Rock/.test(e.title));
  assert.deepEqual(rimRock.results.map(x=>`${x.group} | ${x.participant} | ${x.result}`),['Girls Varsity | Manhattan team | 1st of 10 · 90 pts','Boys Varsity | Manhattan team | 7th of 10 · 238 pts']);
  assert.deepEqual([rimRock.recap_label,rimRock.recap_url,rimRock.highlight_status],['View on Bound','https://beta.gobound.com/ks/schools/manhattanhs/scores','Team scores as entered on Bound by the school.']);
  assert.equal(rimRock.highlights[0],'Girls Varsity: Manhattan won the team title with 90 pts.');
  assert.deepEqual(xc.upcoming,['Upcoming Oct 10 Manhattan at Haskell Invite | ','Upcoming Oct 17, 10:00 AM Manhattan at Centennial League JV/V | ','Upcoming Oct 24 Manhattan at Regional Meet - WARNER PARK | ','Upcoming Oct 31, 10:00 AM Manhattan at KSHSAA 6A State Championship | ']);
  const invite=xcGroup.results.find(e=>/Manhattan Invite/.test(e.title));
  assert.deepEqual(invite.results.slice(0,3).map(x=>`${x.group} | ${x.participant} | ${x.result}`),['Boys Varsity | Manhattan team | 2nd of 11 · 65 pts','Boys Varsity | Jaxon Wheeler (SO) | 3rd of 81 · 17:06.1','Boys Varsity | Benjamin Huser (SR) | 7th of 81 · 17:21.1']);
  assert.ok(invite.results.some(x=>x.participant==='Gabrielle Converse (SR)'&&x.result==='1st of 49 · 19:03.3'));
  assert.ok(!invite.results.some(x=>/junior|jv|\bc\b/i.test(x.group)),'JV and C races are not varsity');
  assert.equal(invite.highlights[1],'Girls Varsity: Manhattan won the team title with 28 points; Gabrielle Converse led Manhattan in 1st (19:03.3).');
  assert.equal(invite.recap_url,'http://results.tfmeetpro.com/LetsGoRun_Timing/2026_Manhattan_XC_Invitational/');
  assert.equal(invite.recap_label,'View full results (LetsGoRun Timing)');
  assert.equal(invite.meet_results_verified,true);
  assert.deepEqual(lines(await feed('Golf')).upcoming,['Upcoming Oct 12 Girls · Manhattan at Regionals | ','Upcoming Oct 19 Girls · Manhattan at State Golf | ']);
  // Golf: results from Prep.Golf (October 21), varsity only, matched to the
  // calendar by day (and by name when two varsity tournaments share a day:
  // Centennial League and Clay Center on Sep 28). Salina Central (no place
  // posted) and Blue Valley Northwest (not on Prep.Golf) are not listed.
  {
    const golfGroup=await feed('Golf'),golf=lines(golfGroup);
    assert.deepEqual(golf.results,[
      'Final Oct 5, 1:00 PM Girls · Manhattan · Manhattan Invite | 3rd of 12 · 338 (+50)','Final Oct 1, 1:00 PM Girls · Manhattan at Blue Valley Northwest | No results posted',
      'Final Sep 30, 9:00 AM Girls · Manhattan at Lawrence Invite | 7th of 24 · 345 (+57)',
      'Final Sep 28, 1:00 PM Girls · Manhattan at Centennial League | 1st of 5 · 346 (+58)','Final Sep 24, 1:00 PM Girls · Manhattan at Salina Central | No results posted',
      'Final Sep 22, 11:00 AM Girls · Manhattan at BV Southwest - Sycamore Ridge | 7th of 12 · 346 (+58)',
      'Final Sep 16, 11:00 AM Girls · Manhattan at Washburn Rural Invite | 5th of 11 · 360 (+80)',
      'Final Aug 24, 1:00 PM Girls · Manhattan at Blue Valley Southwest | 4th of 10 · 348 (+60)']);
    const invite=golfGroup.results[0];
    assert.deepEqual(invite.results.slice(0,3).map(x=>`${x.participant} | ${x.result}`),['Manhattan team | 3rd of 12 · 338 (+50)','Maddie Myers | 1st · 66 (-6)','Brooke Jones | T15 · 87 (+15)']);
    assert.deepEqual(invite.highlights,['Manhattan placed 3rd of 12 with 338 (+50).','Maddie Myers led Manhattan in 1st with 66 (-6), the medalist.']);
    assert.equal(invite.recap_url,'https://ks.prep.golf/tournaments/results/2651');assert.equal(invite.recap_label,'View full results (Prep.Golf)');
    // After State: the calendar's "Regionals" (Oct 12) is Prep.Golf's 6A
    // Sub-State a day later; State's two rounds show per golfer.
    const later=new RealDate('2026-10-21T19:00:00Z');
    globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[later.getTime()]))}static now(){return later.getTime()}};
    try{
      const post=(await worker.fetchLive('manhattan-ks','Golf')).events.filter(e=>e.status==='Final').sort((a,b)=>b.start_time.localeCompare(a.start_time)).slice(0,2);
      assert.deepEqual(post.map(e=>`${e.opponent} | ${e.headline}`),['State Golf | 4th of 12 · 687 (+111)','Regionals | 2nd of 7 · 343 (+55)']);
      assert.equal(post[0].results[1].participant+' | '+post[0].results[1].result,'Maddie Myers | 1st · 136 (-8) · 63-73');
      assert.equal(post[0].highlights[1],'Maddie Myers led Manhattan in 1st with 136 (-8), the medalist.');
      assert.equal(post[1].results[1].participant+' | '+post[1].results[1].result,'Maddie Myers | 2nd · 72 (E) · Qualified for State','the state-qualifier badge is not part of the name');
    }finally{globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}}}
  }

  // Soccer: boys in the fall (girls in the spring), records by team.
  const soccerGroup=await feed('Soccer'),soccer=lines(soccerGroup);
  assert.equal(soccer.results.length,11);
  assert.equal(soccer.results[0],'Final Oct 8, 6:15 PM Boys · Manhattan at Washburn Rural | L, 0-5');
  // The calendar names the tournament host (Blue Valley West); MaxPreps the opponent.
  assert.ok(soccer.results.includes('Final Sep 3, 6:00 PM Boys · Manhattan at Blue Valley Northwest | T, 0-0'));
  // No calendar site: MaxPreps says Lawrence Free State played away.
  assert.ok(soccer.results.includes('Final Sep 8, 8:00 PM Boys · Manhattan vs Lawrence Free State | L, 2-4'));
  // MaxPreps has no score for Sep 1 at Blue Valley West: the school entered
  // it on Bound (October 21). Bound's Sep 5 tournament entry (six teams, no
  // scores) gives nothing: that game reads as played, no score posted.
  assert.ok(soccer.results.includes('Final Sep 1, 8:00 PM Boys · Manhattan at Blue Valley West | L, 0-5'));
  assert.ok(soccer.results.includes('Final Sep 5, 9:00 AM Boys · Manhattan at Blue Valley West | No score posted'));
  assert.ok(!soccer.results.some(r=>/Sep 8.*No score/.test(r)),'the Lawrence Free State game is MaxPreps\' final, not a second, unscored game');
  const sep1=soccerGroup.results.find(e=>e.start_time.startsWith('2026-09-01'));
  assert.deepEqual([sep1.score_source.name,sep1.recap_label,sep1.maxpreps_url],['Bound (score entered by the school)','View on Bound',undefined]);
  assert.deepEqual(soccer.records,['Boys 3-6-1 · Centennial League 2-2']);
  {
    const expanded=(await worker.fetchLive('manhattan-ks','Soccer',null,sep1.id)).events.find(e=>e.id===sep1.id);
    assert.equal(expanded.highlight_status,'Score as entered on Bound by the school.');
    // Only the school's own events; 0-0 reads as not entered; the opponent must match.
    const finals=boundFinals(JSON.parse(fixture('bound-scores-2026-10-09.json.gz')),{school:'h20250204045200696bcbb2cc6f78a4e',timeZone:'America/Chicago'});
    assert.ok(finals.every(f=>f.teams.some(t=>t.own)),'other teams\' matches at a tournament are left out');
    assert.equal(boundGame(finals,{acts:['Boys Soccer'],date:'2026-09-01',opponent:'Junction City',compatible:namesCompatible}),null,'a different opponent');
    assert.equal(boundGame([{act:'Boys Soccer',date:'2026-09-01',teams:[{name:'Manhattan',score:0,own:true},{name:'Blue Valley West',score:0,own:false}]}],{acts:['Boys Soccer'],date:'2026-09-01',opponent:'Blue Valley West',compatible:namesCompatible}),null,'0-0 is not an entered score');
    assert.equal(boundMeet(finals,{act:'Girls Tennis',date:'2026-09-25',lowWins:false}),null);
    // Bound refuses the full identity (403 for a user agent with the bot
    // page's address): it is read with the scoreboard identity (user, Oct 21).
    assert.ok(source.includes("sourceFetch(url,{headers:{'User-Agent':SCOREBOARD_USER_AGENT,'Accept':'application/json'}},{ttl:SOURCE_TTL.listing,staleOnError:true})"));
  }
  assert.equal(soccer.upcoming[0],'Upcoming Oct 13, 6:15 PM Boys · Manhattan at Wichita Northwest | ');

  // Volleyball: every match from MaxPreps (triangulars, tournaments);
  // placeholders without results are not matches.
  const vb=lines(await feed('Volleyball'));
  // The Aug 25 jamboree at Rock Creek has no score anywhere: played, no score posted.
  assert.equal(vb.results.length,29);assert.ok(vb.results.includes('Final Aug 25, 4:00 PM Manhattan at Jamboree - Rock Creek | No score posted'));
  assert.deepEqual(vb.records,['21-7 · Centennial League 9-1']);
    assert.ok(!vb.results.some(x=>/T, 0-0/.test(x)),'pool placeholders are not results');
  assert.deepEqual(vb.upcoming,['Upcoming Oct 10, 9:00 AM Manhattan · Manhattan Invite | ','Upcoming Oct 15, 5:00 PM Manhattan at Maize South TRI | ','Upcoming Oct 20, 5:00 PM Manhattan at St. Thomas Aquinas HS | ','Upcoming Oct 24 Manhattan at Sub State | ','Upcoming Oct 30 Manhattan at 6A State Tourn. | ']);
  // Expanded views: soccer halves, volleyball sets (a tournament match has
  // no home or road).
  const expand=async(sport,event)=>(await worker.fetchLive('manhattan-ks',sport,null,event.id)).events.find(e=>e.id===event.id);
  const topeka=await expand('Soccer',(await feed('Soccer')).results.at(-1));
  assert.deepEqual(topeka.highlights,['Manhattan lost to Topeka High 2-1 on the road in a Centennial League game.','The teams were tied 1-1 at halftime.']);
  assert.deepEqual(topeka.game_stats.map(x=>`${x.label}: ${x.value}`),['1st half: Manhattan 1 · Topeka High 1','2nd half: Manhattan 0 · Topeka High 1']);
  const carroll=await expand('Volleyball',(await feed('Volleyball')).results.find(e=>/Bishop Carroll/.test(e.title)));
  assert.deepEqual(carroll.highlights,['Manhattan beat Bishop Carroll 2-0 in a tournament match.','Set scores: 25-15, 25-17.']);
  assert.deepEqual(carroll.game_stats.map(x=>`${x.label}: ${x.value}`),['Set 1: Manhattan 25 · Bishop Carroll 15','Set 2: Manhattan 25 · Bishop Carroll 17']);

  // Tennis: today's KSHSAA regional (TennisReporting event 975, Washburn
  // Rural host), live: every Manhattan entry's matches, from its side.
  const tennis=await feed('Tennis'),regional=tennis.upcoming[0];
  assert.equal(line(regional),'Today Oct 9, 8:00 AM Girls · Manhattan at Regionals | Matches 5-1','a match between two Manhattan players is not in the record');
  assert.deepEqual(regional.results.map(x=>`${x.group} | ${x.participant} | ${x.result}`),[
    'Singles: Finley Bennett (seed 12) | Round of 16 | W 6-2, 6-1 vs Bryleigh Blue (Wichita-Heights HS)',
    'Singles: Finley Bennett (seed 12) | Quarterfinal | L 1-6, 0-6 vs Sutton Weixelman (Manhattan HS)',
    'Singles: Sutton Weixelman (seed 4) | Round of 16 | W 6-0, 6-1 vs Kendall Clement (Campus HS)',
    'Singles: Sutton Weixelman (seed 4) | Quarterfinal | W 6-1, 6-0 vs Finley Bennett (Manhattan HS)',
    'Singles: Sutton Weixelman (seed 4) | Semifinal | vs Hannah Micheel (Junction City HS) · not played yet',
    'Doubles: Audrey Geering / Sally Kastner (seed 4) | Round of 16 | W 6-0, 6-3 vs Paloma Campbell / Makayla McAbee (Topeka HS)',
    'Doubles: Audrey Geering / Sally Kastner (seed 4) | Quarterfinal | W 6-3, 6-3 vs Zoey Micheel / Maddi Sederlin (Junction City HS)',
    'Doubles: Sophie Karr / Grace Koo (seed 7) | Round of 16 | W 6-0, 6-1 vs Miriam Brown / Olivia Schultheiss (Wichita-Heights HS)',
    'Doubles: Sophie Karr / Grace Koo (seed 7) | Quarterfinal | L 0-6, 4-6 vs Annie Henderson / Kinley Ladd (Washburn Rural HS)'
  ]);
  assert.deepEqual(regional.highlights,['Finley Bennett (singles) won 1 of 2 matches, out in the quarterfinal.','Sutton Weixelman (singles) won 2 of 2 matches.','Audrey Geering / Sally Kastner (doubles) won 2 of 2 matches.','Sophie Karr / Grace Koo (doubles) won 1 of 2 matches, out in the quarterfinal.']);
  assert.equal(regional.recap_url,'https://tennisreporting.com/event/brackets/975?host=4139');
  assert.equal(regional.recap_label,'View TennisReporting bracket');
  assert.equal(line(tennis.upcoming[1]),'Upcoming Oct 16, 8:00 AM Girls · Manhattan at 6A State Tourn. | ');
  assert.ok(!requests.some(r=>/event\/974\b/.test(r)&&/host/.test(r)),'the other Oct 9 event has no Manhattan host');
  // Past invitationals TennisReporting does not carry read as played, no
  // results posted (middle and high school rule, October 25).
  assert.deepEqual(tennis.results.map(e=>`${e.display_time} ${e.title} | ${e.headline}`),["Oct 5, 9:00 AM Girls · Manhattan at Centennial League | No results posted","Oct 1, 3:00 PM Girls · Manhattan · Manhattan Quad | No results posted","Sep 29, 9:00 AM Girls · Manhattan at Topeka West Invite | No results posted","Sep 28, 1:30 PM Girls · Manhattan at Emporia Invite | No results posted","Sep 22, 9:00 AM Girls · Manhattan at Washburn Rural Invite | No results posted","Sep 21, 3:00 PM Girls · Manhattan at Varsity Quad | No results posted","Sep 12, 9:00 AM Girls · Manhattan at Emporia Invite | No results posted","Sep 9, 3:00 PM Girls · Manhattan at Seaman Invite | No results posted","Sep 3, 9:00 AM Girls · Manhattan at Junction City Quad | No results posted"]);

  // Middle schools: schedules only (no source publishes their scores), so a
  // past game reads as played with no score; grades are the teams.
  const msFeed=async(id,sport)=>{const r=await worker.fetchLive(id,sport);assert.equal(r.error,null,`${id} ${sport}`);return worker.groupEvents(r.events,at)[0]||null;};
  assert.deepEqual((await msFeed('anthony-ms-ks','Football')).upcoming.map(line),['Upcoming Oct 13, 4:15 PM 7th · Anthony vs Junction City | ','Upcoming Oct 13, 4:30 PM 8th · Anthony at Junction City | ']);
  // No source publishes middle school scores: past games read as played, no
  // score posted (middle and high school rule, October 25).
  const amsVb=await msFeed('anthony-ms-ks','Volleyball');
  assert.ok(amsVb.results.length>0&&amsVb.results.every(e=>e.headline==='No score posted'&&e.no_result_posted&&e.school_score==null),'the season is over and no scores were published');
  assert.deepEqual(amsVb.records,[],'games without a score count in no record');
  assert.deepEqual(amsVb.results[0].results,[{label:'Score',value:'Not posted yet'}]);
  const ike=await msFeed('eisenhower-ms-ks','Basketball');
  assert.deepEqual(ike.upcoming.slice(0,3).map(line),['Upcoming Oct 29, 4:15 PM 7th Girls · Eisenhower vs Rock Creek | ','Upcoming Oct 29, 4:15 PM 8th Girls · Eisenhower vs Rock Creek | ','Upcoming Nov 3, 4:30 PM 7th Girls · Eisenhower at Wamego | ']);
  assert.ok(ike.upcoming.some(e=>e.team_label==='7th Boys'&&/Wamego/.test(e.title)),'boys basketball is in the same sport');
  const wrestling=await msFeed('eisenhower-ms-ks','Wrestling');
  assert.equal(line(wrestling.upcoming[0]),'Upcoming Nov 10, 4:30 PM Boys · Eisenhower · Home event | ');
  assert.equal(wrestling.upcoming[0].event_type,'DUAL');
  assert.ok(wrestling.upcoming.some(e=>e.team_label==='Girls'));
  assert.ok((await msFeed('eisenhower-ms-ks','Track & Field')).upcoming.every(e=>e.event_type==='MEET'));
  // Middle school cross country: every grade race from LetsGoRun; team names
  // vary by meet ("Anthony Middle School", "Anthony7G"), race names too.
  const amsXc=await msFeed('anthony-ms-ks','Cross Country');
  assert.deepEqual(amsXc.results.map(line),[
    'Final Oct 2, 2:00 PM Anthony at Milford State Park | 7th Girls 1st of 5 · 7th Boys 1st of 8 · 8th Girls 1st of 4 · 8th Boys 1st of 6',
    'Final Sep 29, 4:00 PM Anthony at Rock Creek H. S. | 7th Boys 1st of 6 · 7th Girls 1st of 5 · 8th Boys 1st of 5 · 8th Girls 1st of 1',
    'Final Sep 22, 4:00 PM Anthony at McPherson- Wall Park | No results posted',
    'Final Sep 18, 10:00 AM Anthony at Warner Park | No results posted',
    'Final Sep 15, 4:00 PM Anthony at Clay Center | 7th Girls 1st of 5 · 7th Boys 1st of 8 · 8th Girls 1st of 3 · 8th Boys 1st of 6',
    'Final Sep 10, 4:30 PM Anthony at Milford State Park | 7th Girls 1st of 7 · 7th Boys 1st of 9 · 8th Girls 1st of 4 · 8th Boys 1st of 10',
    'Final Sep 8, 9:00 AM Anthony at Wamego M.S. | 7th Boys 1st of 6 · 7th Girls 1st of 3 · 8th Boys 1st of 4 · 8th Girls 1st of 3'
  ]);
  assert.equal(amsXc.results[0].results[1].participant,'Stella Snively (7)');
  const emsXc=await msFeed('eisenhower-ms-ks','Cross Country');
  assert.deepEqual(emsXc.results.map(line),[
    'Final Oct 2, 2:00 PM Eisenhower at Milford Stare Park League Tournament | 7th Boys 6th of 8 · 8th Boys 2nd of 6',
    'Final Sep 29, 4:00 PM Eisenhower at Rock Creek | 7th Boys 3rd of 6 · 8th Boys 2nd of 5','Final Sep 22, 4:00 PM Eisenhower at Clay Center | No results posted','Final Sep 18, 2:00 PM Eisenhower · Home event | No results posted',
    'Final Sep 15, 4:00 PM Eisenhower at Clay Center | 7th Boys 3rd of 8 · 8th Boys 3rd of 6',
    'Final Sep 10, 4:30 PM Eisenhower at Fort Riley | 7th Boys 7th of 9 · 8th Boys 6th of 10','Final Sep 2, 4:00 PM Eisenhower at Wamego | No results posted'
  ]);
  const rockCreek=emsXc.results.find(e=>/Rock Creek/.test(e.title));
  assert.ok(!rockCreek.results.some(x=>/Aurora Adams/.test(x.participant)),'middle school JV races are left out (at Rock Creek Aurora Adams ran the JV race)');
  const athletesMs=await worker.handler.fetch(new Request('https://x.test/live/athletes?school=eisenhower-ms-ks&sport=Football'),{},{});
  assert.deepEqual(await athletesMs.json(),[]);
}finally{globalThis.Date=RealDate;}
// A failed calendar or MaxPreps read serves the last copy (the school's site
// answered Cloudflare with an intermittent 520; Oct 16, 3 of 8 refreshes blank).
{const w=read('../src/index.js');
assert.ok(w.includes('const calendarResponse=await sourceFetch(calendarUrl,{},{ttl:SOURCE_TTL.schedule,staleOnError:true});'),'calendar read keeps its last copy');
assert.ok(w.includes('const r=await sourceFetch(url,{},{ttl:SOURCE_TTL.schedule,staleOnError:true});if(r.ok){contests=maxprepsContests('),'MaxPreps read keeps its last copy');}
console.log('Manhattan (KS) module: high school football, soccer, volleyball, tennis, cross country, golf and both middle schools verified (schedules, scores, records, TennisReporting draws, expanded views)');
