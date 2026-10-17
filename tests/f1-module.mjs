// Formula 1 (user, October 16, 2026: "Add formula one under auto racing"):
// Auto Racing → Formula 1 → World Championship. Fixtures of October 16, 2026:
// formula1.com's official 2026 results page, the Singapore Grand Prix's race
// result, starting grid and fastest laps, and the Chinese Grand Prix sprint
// (each trimmed to its heading and results table); the Jolpica F1 calendar
// and its Singapore and China sprint results; ESPN's F1 board for Singapore.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {proTeam,f1SeasonResults,f1SeasonRow,f1Classification,f1JolpicaClassification,f1DriverTable,f1Calendar,f1Races,f1RaceDetails,f1LiveDetails,f1FinishTable} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const raw=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8');
const json=name=>JSON.parse(raw(name));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const worker=read('../src/index.js');
const EASTERN='America/New_York',now=new Date('2026-10-16T18:00:00Z');

// Catalog: one entry under Auto Racing → Formula 1 (Races), in Eastern time.
const f1=schools.filter(s=>s.league==='Formula 1');
assert.deepEqual(f1.map(s=>s.id),['formula-1']);
const [series]=f1;
assert.equal(series.level,'pro');assert.equal(series.pro_sport,'Auto Racing');assert.equal(series.conference,'Formula 1');
assert.deepEqual(sponsored['formula-1'],['Auto Racing']);
assert.equal(proTeam('formula-1').kind,'f1');assert.equal(proTeam('formula-1').sport,'Auto Racing');
assert.ok(JSON.parse(read('../src/team-themes.json'))['formula-1']?.primary);
assert.ok(worker.includes("if(config.kind==='f1')return fetchF1(school,config,now,timeZone,aiTargetId,failed);"));
assert.ok(worker.includes("'formula-1':'America/New_York'"));
// Jolpica answers 406 to the HTML Accept header school pages are read with
// (the first preview read nothing); its reads ask for JSON.
assert.ok(worker.includes("url.startsWith(JOLPICA_F1)?{headers:{'Accept':'application/json'}}"));

// formula1.com's season page: 17 Grands Prix run, each with its winner and link.
const season=f1SeasonResults(raw('f1-season.html'),2026);
assert.equal(season.length,17);
assert.deepEqual(season[0],{name:'Australia',date:'2026-03-08',winner:'George Russell',team:'Mercedes',laps:58,time:'1:23:06.801',href:'https://www.formula1.com/en/results/2026/races/1279/australia/'});
assert.deepEqual(season.at(-1),{name:'Singapore',date:'2026-10-11',winner:'Max Verstappen',team:'Red Bull Racing',laps:62,time:'1:42:00.785',href:'https://www.formula1.com/en/results/2026/races/1296/singapore/'});

// The calendar (Jolpica): 23 rounds with UTC starts, sprints on six weekends.
const calendar=f1Calendar(json('f1-calendar.json'));
assert.equal(calendar.length,23);
assert.deepEqual(calendar[1],{round:2,name:'Chinese Grand Prix',start:'2026-03-15T07:00:00Z',timed:true,sprint:'2026-03-14T03:00:00Z',circuit:'Shanghai International Circuit',place:'Shanghai, China'});
assert.equal(calendar.filter(r=>r.sprint).length,6);
// Every past round finds its season row, the Las Vegas night race included
// (its UTC date is the day after the local one).
assert.deepEqual(calendar.slice(0,17).map(r=>f1SeasonRow(season,r)?.name),season.map(r=>r.name));
assert.equal(f1SeasonRow([{date:'2026-11-21'}],calendar.find(r=>r.round===21)).date,'2026-11-21');
assert.equal(f1SeasonRow(season,calendar.find(r=>r.round===18)),null);

// The official classification: 22 cars, classified or out.
const singapore=f1Classification(raw('f1-singapore.html'));
assert.equal(singapore.length,22);
assert.deepEqual(singapore[0],{pos:'1',number:'3',driver:'Max Verstappen',code:'VER',team:'Red Bull Racing',laps:62,time:'1:42:00.785',status:'',points:25});
assert.deepEqual(singapore[1],{pos:'2',number:'16',driver:'Charles Leclerc',code:'LEC',team:'Ferrari',laps:62,time:'+7.335s',status:'',points:18});
assert.deepEqual(singapore.at(-1),{pos:'NC',number:'5',driver:'Gabriel Bortoleto',code:'BOR',team:'Audi',laps:7,time:'',status:'DNF',points:0});
const sprint=f1Classification(raw('f1-china-sprint.html'));
assert.equal(sprint.length,22);assert.equal(sprint[0].driver,'George Russell');assert.equal(sprint[0].points,8);
// Jolpica's results (until formula1.com lists a race) read the same; its
// names are the drivers' full names ("Andrea Kimi Antonelli", "Hülkenberg").
const fallback=f1JolpicaClassification(json('f1-jolpica-singapore.json'));
assert.deepEqual(fallback.map(r=>[r.pos,r.number,r.laps,r.status,r.points]),singapore.map(r=>[r.pos,r.number,r.laps,r.status,r.points]));
assert.equal(fallback[0].driver,'Max Verstappen');assert.equal(fallback[2].driver,'Andrea Kimi Antonelli');
assert.deepEqual(f1JolpicaClassification(json('f1-jolpica-china-sprint.json')).map(r=>r.number),sprint.map(r=>r.number));
assert.deepEqual(f1JolpicaClassification({MRData:{RaceTable:{Races:[]}}}),[]);

// The races on October 16: China's sprint and Singapore final (the others
// have no classification in this test, so they are not listed: K-State's
// rule), then the six Grands Prix still to come, in Eastern time.
const results=new Map([['17|gp',singapore],['2|sprint',sprint]]);
const events=f1Races(calendar,{school:series,config:proTeam('formula-1'),timeZone:EASTERN,now,results,sources:new Map([['17|gp',{name:'Formula 1 official results (formula1.com)',url:'https://www.formula1.com/en/results/2026/races/1296/singapore/race-result'}]])});
assert.deepEqual(events.map(e=>`${e.status} ${e.title} ${e.display_time}`),[
  'Final Chinese Grand Prix Sprint Mar 13, 11:00 PM',
  'Final Singapore Grand Prix Oct 11, 8:00 AM',
  'Upcoming United States Grand Prix Oct 25, 4:00 PM',
  'Upcoming Mexico City Grand Prix Nov 1, 3:00 PM',
  'Upcoming Brazilian Grand Prix Nov 8, 12:00 PM',
  'Upcoming Las Vegas Grand Prix Nov 21, 11:00 PM',
  'Upcoming Qatar Grand Prix Nov 29, 11:00 AM',
  'Upcoming Abu Dhabi Grand Prix Dec 6, 8:00 AM'
]);
const final=events[1];
assert.equal(final.event_type,'RACE');assert.equal(final.headline,'Winner: Max Verstappen (Red Bull Racing)');
assert.equal(final.source.url,'https://www.formula1.com/en/results/2026/races/1296/singapore/race-result');
// The card: the top three in the race window's layout (team as the tag,
// time or gap, points).
assert.deepEqual(final.race_table,[
  {pos:1,driver:'Max Verstappen',car:'#3',make:'Red Bull Racing',team:'1:42:00.785',laps_led:0,status:'',note:'25 pts'},
  {pos:2,driver:'Charles Leclerc',car:'#16',make:'Ferrari',team:'+7.335s',laps_led:0,status:'',note:'18 pts'},
  {pos:3,driver:'Kimi Antonelli',car:'#12',make:'Mercedes',team:'+24.573s',laps_led:0,status:'',note:'15 pts'}
]);
assert.deepEqual(final.results[0],{participant:'Max Verstappen (#3)',result:'1st · Red Bull Racing · 1:42:00.785 · 25 pts'});
assert.equal(final.result_count,22);assert.equal(final.has_more_results,true);
assert.equal(events[0].sprint,true);assert.equal(events[0].headline,'Winner: George Russell (Mercedes)');
const austin=events[2];
assert.deepEqual(austin.results,[{label:'Circuit',value:'Circuit of the Americas'},{label:'Location',value:'Austin, USA'},{label:'Round',value:'18 of 23'}]);
// A past race with no result is not listed; one under way is Live.
assert.ok(!events.some(e=>e.title==='Japanese Grand Prix'));
const raceDay=new Date('2026-10-25T21:00:00Z');
assert.equal(f1Races(calendar,{school:series,config:proTeam('formula-1'),timeZone:EASTERN,now:raceDay}).find(e=>e.f1_round===18).status,'Live');
assert.equal(f1Races(calendar,{school:series,config:proTeam('formula-1'),timeZone:EASTERN,now:new Date('2026-10-25T14:00:00Z')}).find(e=>e.f1_round===18).status,'Today');

// The race window: the whole field, the winner's margin, the grid and the
// fastest lap from formula1.com.
const grid=f1DriverTable(raw('f1-singapore-grid.html')),fastest=f1DriverTable(raw('f1-singapore-fastest.html'));
assert.deepEqual(grid[0],{pos:'1',driver:'Max Verstappen',team:'Red Bull Racing',lap:null,time:'1:31.373'});
assert.deepEqual(fastest[0],{pos:'1',driver:'Charles Leclerc',team:'Ferrari',lap:41,time:'1:35.202'});
const details=f1RaceDetails(final,singapore,{grid,fastest});
assert.deepEqual(details.lines,[
  'Max Verstappen (Red Bull Racing) won the Singapore Grand Prix at Marina Bay Street Circuit, 62 laps in 1:42:00.785, 7.335 s ahead of Charles Leclerc (Ferrari).',
  'Max Verstappen started 1st (pole position).',
  'Fastest lap: 1:35.202 by Charles Leclerc (Ferrari), lap 41.',
  'Did not finish: Alexander Albon (DNF), Lance Stroll (DNF), Franco Colapinto (DNF), Gabriel Bortoleto (DNF).'
]);
assert.deepEqual(details.stats.map(s=>`${s.label}: ${s.value}`),['Laps: 62','Race time: 1:42:00.785','Cars: 22','Classified: 19','Fastest lap: 1:35.202 (Charles Leclerc)']);
assert.equal(details.table.length,22);
assert.deepEqual(details.table.at(-1),{pos:'NC',driver:'Gabriel Bortoleto',car:'#5',make:'Audi',team:'7 laps',laps_led:0,status:'DNF',note:''});
assert.equal(details.table[9].note,'1 pt');
assert.equal(f1FinishTable([]).length,0);assert.equal(f1RaceDetails(final,[]),null);
const sprintDetails=f1RaceDetails(events[0],sprint);
assert.ok(sprintDetails.lines[0].startsWith('George Russell (Mercedes) won the Chinese Grand Prix Sprint at Shanghai International Circuit, 19 laps in 33:38.998'));

// Live: ESPN's board (the Singapore final turned "in" on lap 30) gives the
// running order, with each driver's team and number from the last result.
const board=json('f1-espn-singapore.json');
assert.equal(f1LiveDetails(board,{start:'2026-10-11T12:00:00Z'}),null,'a final session is not live');
const race=board.events[0].competitions.find(c=>c.type.abbreviation==='Race');
race.status={period:30,type:{state:'in',name:'STATUS_IN_PROGRESS'}};
const live=f1LiveDetails(board,{start:'2026-10-11T12:00:00Z',drivers:new Map(singapore.map(r=>[r.driver,r]))});
assert.equal(live.lap,30);assert.equal(live.order.length,22);
assert.deepEqual(live.order[0],{position:1,driver:'Max Verstappen',car:'#3',gap:'Leader',make:'Red Bull Racing',laps_led:null,last_lap_speed:null,pit:null});
assert.equal(f1LiveDetails(board,{sprint:true,start:'2026-10-11T12:00:00Z'}),null,'no sprint in Singapore');
const liveEvent=f1Races(calendar,{school:series,config:proTeam('formula-1'),timeZone:EASTERN,now:new Date('2026-10-11T13:00:00Z'),live:new Map([['17|gp',live]])}).find(e=>e.f1_round===17&&!e.sprint);
assert.equal(liveEvent.status,'Live');assert.equal(liveEvent.recency_label,'Lap 30');assert.equal(liveEvent.headline,'Leader: Max Verstappen');
assert.equal(liveEvent.live_details.order.length,22);assert.equal(liveEvent.results.length,10);
assert.deepEqual(liveEvent.results[0],{participant:'1st Max Verstappen',result:'Red Bull Racing · #3'});

console.log('Formula 1 module checks passed');
