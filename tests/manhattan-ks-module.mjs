// Manhattan High School (the first high school): the school calendar is the
// schedule, MaxPreps the scores. Fixtures are the real pages of October 9,
// 2026 (calendar trimmed to the sports read so far; MaxPreps pages trimmed to
// their contest data and box score).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
import {USD383_ABBREVIATIONS} from '../src/schools/manhattan-ks-middle.mjs';
import {parseMiddleSchoolTitle,parseCalendarTitle,calendarEvents,maxprepsContests,maxprepsBoxScore,isNamedEvent,namesCompatible,tennisTeamStanding} from '../src/high-school.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>read('./fixtures/manhattan-ks-module/'+name);
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='manhattan-ks');
const MAXPREPS='https://www.maxpreps.com/ks/manhattan/manhattan-indians/';
const CALENDAR='https://mhs.usd383.org/api/calendars/128516/events';
const SCHOOL_ID='41006ce9-cfb3-492a-a951-d320637bc985';

// Catalog: a Kansas 6A high school, with no featured athletes (minors).
assert.equal(school.level,'high-school');
assert.equal(school.state,'Kansas');
assert.equal(school.classification,'6A');
// High school: State, then City, then School (user, October 9).
for(const id of ['manhattan-ks','anthony-ms-ks','eisenhower-ms-ks'])assert.equal(schools.find(x=>x.id===id).city,'Manhattan');
const page=read('../public/index.html');
assert.ok(page.includes("cityOf:s=>s.city||''"),'high school has a City box');
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
for(const id of ['anthony-ms-ks','eisenhower-ms-ks']){const s=schools.find(x=>x.id===id);assert.equal(s.level,'high-school');assert.equal(s.classification,'Middle School');assert.equal(s.state,'Kansas');}
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
  // published result is not listed (K-State's rule), so only coming meets show
  // until results are published. Midnight means no time was set.
  const xc=lines(await feed('Cross Country'));
  assert.deepEqual(xc.results,[],'six past meets, none with published results');
  assert.deepEqual(xc.upcoming,['Upcoming Oct 10 Manhattan at Haskell Invite | ','Upcoming Oct 17, 10:00 AM Manhattan at Centennial League JV/V | ','Upcoming Oct 24 Manhattan at Regional Meet - WARNER PARK | ','Upcoming Oct 31, 9:30 AM Manhattan at State Meet | ']);
  assert.deepEqual(lines(await feed('Golf')).upcoming,['Upcoming Oct 12 Girls · Manhattan at Regionals | ','Upcoming Oct 19 Girls · Manhattan at State Golf | ']);

  // Soccer: boys in the fall (girls in the spring), records by team.
  const soccer=lines(await feed('Soccer'));
  assert.equal(soccer.results.length,9);
  assert.equal(soccer.results[0],'Final Oct 8, 6:15 PM Boys · Manhattan at Washburn Rural | L, 0-5');
  // The calendar names the tournament host (Blue Valley West); MaxPreps the opponent.
  assert.ok(soccer.results.includes('Final Sep 3, 6:00 PM Boys · Manhattan at Blue Valley Northwest | T, 0-0'));
  // No calendar site: MaxPreps says Lawrence Free State played away.
  assert.ok(soccer.results.includes('Final Sep 8, 8:00 PM Boys · Manhattan vs Lawrence Free State | L, 2-4'));
  assert.deepEqual(soccer.records,['Boys 3-5-1 · Centennial League 2-2']);
  assert.equal(soccer.upcoming[0],'Upcoming Oct 13, 6:15 PM Boys · Manhattan at Wichita Northwest | ');

  // Volleyball: every match from MaxPreps (triangulars, tournaments);
  // placeholders without results are not matches.
  const vb=lines(await feed('Volleyball'));
  assert.equal(vb.results.length,28);
  assert.deepEqual(vb.records,['21-7 · Centennial League 9-1']);
    assert.ok(!vb.results.some(x=>/T, 0-0/.test(x)),'pool placeholders are not results');
  assert.deepEqual(vb.upcoming,['Upcoming Oct 10, 9:00 AM Manhattan · Manhattan Invite | ','Upcoming Oct 15, 5:00 PM Manhattan at Maize South TRI | ','Upcoming Oct 20, 5:00 PM Manhattan at St. Thomas Aquinas HS | ','Upcoming Oct 24 Manhattan at Sub State | ','Upcoming Oct 30 Manhattan at 6A State Tourn. | ']);
  // Expanded views: soccer halves, volleyball sets (a tournament match has
  // no home or road).
  const expand=async(sport,event)=>(await worker.fetchLive('manhattan-ks',sport,null,event.id)).events.find(e=>e.id===event.id);
  const topeka=await expand('Soccer',(await feed('Soccer')).results.at(-1));
  assert.deepEqual(topeka.highlights,['Manhattan lost to Topeka High 2-1 on the road in a Centennial League game.','The teams were tied 1-1 at halftime.']);
  assert.deepEqual(topeka.game_stats.map(x=>`${x.label}: ${x.value}`),['1st half: Manhattan 1 · Topeka High 1','2nd half: Manhattan 0 · Topeka High 1']);
  const carroll=await expand('Volleyball',(await feed('Volleyball')).results.at(-1));
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
  // Past invitationals TennisReporting does not carry are not listed.
  assert.deepEqual(tennis.results,[]);

  // Middle schools: schedules only (no source publishes their scores), so a
  // past game is not listed; grades are the teams.
  const msFeed=async(id,sport)=>{const r=await worker.fetchLive(id,sport);assert.equal(r.error,null,`${id} ${sport}`);return worker.groupEvents(r.events,at)[0]||null;};
  assert.deepEqual((await msFeed('anthony-ms-ks','Football')).upcoming.map(line),['Upcoming Oct 13, 4:15 PM 7th · Anthony vs Junction City | ','Upcoming Oct 13, 4:30 PM 8th · Anthony at Junction City | ']);
  assert.equal(await msFeed('anthony-ms-ks','Volleyball'),null,'the season is over and no scores were published');
  const ike=await msFeed('eisenhower-ms-ks','Basketball');
  assert.deepEqual(ike.upcoming.slice(0,3).map(line),['Upcoming Oct 29, 4:15 PM 7th Girls · Eisenhower vs Rock Creek | ','Upcoming Oct 29, 4:15 PM 8th Girls · Eisenhower vs Rock Creek | ','Upcoming Nov 3, 4:30 PM 7th Girls · Eisenhower at Wamego | ']);
  assert.ok(ike.upcoming.some(e=>e.team_label==='7th Boys'&&/Wamego/.test(e.title)),'boys basketball is in the same sport');
  const wrestling=await msFeed('eisenhower-ms-ks','Wrestling');
  assert.equal(line(wrestling.upcoming[0]),'Upcoming Nov 10, 4:30 PM Boys · Eisenhower · Home event | ');
  assert.equal(wrestling.upcoming[0].event_type,'DUAL');
  assert.ok(wrestling.upcoming.some(e=>e.team_label==='Girls'));
  assert.ok((await msFeed('eisenhower-ms-ks','Track & Field')).upcoming.every(e=>e.event_type==='MEET'));
  const athletesMs=await worker.handler.fetch(new Request('https://x.test/live/athletes?school=eisenhower-ms-ks&sport=Football'),{},{});
  assert.deepEqual(await athletesMs.json(),[]);
}finally{globalThis.Date=RealDate;}
console.log('Manhattan (KS) module: high school football, soccer, volleyball, tennis, cross country, golf and both middle schools verified (schedules, scores, records, TennisReporting draws, expanded views)');
