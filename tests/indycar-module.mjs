// IndyCar (user, November 23, 2026: "Add more pro", then "1 then 4"):
// Pro → Auto Racing → IndyCar → NTT IndyCar Series, its races. Fixtures saved
// Nov 23, 2026: ESPN's IndyCar board (the 2026 calendar), the race-day boards
// of the Indianapolis 500 (May 24) and the Grand Prix of Illinois (June 7,
// listed by ESPN's calendar on June 8 UTC), ESPN's driver standings, and
// indycar.com's schedule (the 2027 season's 17 races; the page trimmed to
// its event cards).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,indycarCalendar,indycarBoardDay,indycarRace,indycarSchedule,indycarRaces,indycarRaceDetails,indycarStandings} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const raw=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}`,import.meta.url))).toString('utf8');
const json=name=>JSON.parse(raw(`${name}-2026-11-23.json.gz`));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js');
const EASTERN='America/New_York',now=new Date('2026-11-23T18:00:00Z');

// Catalog: one Races entry under Auto Racing → IndyCar, after Formula 1.
const school=schools.find(s=>s.id==='indycar-series');
assert.deepEqual([school.level,school.pro_sport,school.league,school.name],['pro','Auto Racing','IndyCar','NTT IndyCar Series']);
const racing=schools.filter(s=>s.level==='pro'&&s.pro_sport==='Auto Racing').map(s=>s.id);
assert.equal(racing[racing.indexOf('formula-1')+1],'indycar-series');
assert.deepEqual(sponsored['indycar-series'],['Auto Racing']);
assert.match(themes['indycar-series'].primary,/^#[0-9A-F]{6}$/);
const config=proTeam('indycar-series');
assert.deepEqual([config.kind,config.sport,config.schedule],['indycar','Auto Racing','https://www.indycar.com/Schedule']);
assert.match(worker,/if\(config\.kind==='indycar'\)return fetchIndycar\(/);

// ESPN's calendar: 18 races of 2026. Its listed times run three hours after
// the race-day board's start, so each board is read for the Eastern day
// three hours earlier (the Grand Prix of Illinois: listed June 8 04:00 UTC,
// raced June 7 at 9 PM Eastern).
const calendar=indycarCalendar(json('indycar-board'));
assert.equal(calendar.length,18);
assert.deepEqual(calendar[6],{round:7,name:'Indianapolis 500',listed:'2026-05-24T19:00Z',year:2026});
assert.equal(indycarBoardDay(calendar[6]),'20260524');
assert.equal(indycarBoardDay(calendar.find(r=>r.name==='Grand Prix of Illinois')),'20260607');
const results=new Map();
for(const race of calendar)for(const day of ['20260524','20260607']){const found=indycarRace(json(`indycar-board-${day}`),race);if(found)results.set(race.round,found);}
assert.deepEqual([...results.keys()],[7,9]);
const indy=results.get(7);
assert.deepEqual([indy.start,indy.state,indy.rows.length,indy.rows[0]],['2026-05-24T16:00Z','post',33,{pos:1,driver:'Felix Rosenqvist',country:'Sweden',winner:true}]);

// indycar.com's schedule: the 2027 season, 17 races with track, place and TV.
const schedule=indycarSchedule(raw('indycar-schedule-2026-11-23.html.gz'));
assert.equal(schedule.length,17);
assert.deepEqual(schedule[0],{year:2027,date:'2027-03-07',clock:null,name:'Streets of St. Petersburg',track:'Streets of St. Petersburg',place:'St. Petersburg, Florida',tv:['Fox','FOX One'],url:'https://www.indycar.com/Schedule/2027/St-Petersburg'});
assert.ok(schedule.some(r=>r.name==='111th Running of the Indianapolis 500'&&r.date==='2027-05-30'));
assert.ok(schedule.some(r=>r.place==='Barcelona, Spain'));

// The races: 2026 finals with ESPN's order (a past race without its board
// is not listed), then 2027 from indycar.com, dates without times.
const events=indycarRaces(calendar,{school,config,timeZone:EASTERN,now,results,schedule});
assert.equal(events.length,19);
assert.deepEqual(events.slice(0,2).map(e=>[e.status,e.display_time,e.title,e.headline,e.has_more_results,e.result_count]),[
  ['Final','May 24, 12:00 PM','Indianapolis 500','Winner: Felix Rosenqvist',true,33],
  ['Final','Jun 7, 9:00 PM','Grand Prix of Illinois','Winner: Josef Newgarden',true,25]
]);
assert.deepEqual(events[0].results,[{participant:'Felix Rosenqvist',result:'1st · Sweden'},{participant:'David Malukas',result:'2nd · USA'},{participant:'Scott McLaughlin',result:'3rd · New Zealand'}]);
assert.deepEqual(events[0].race_table.map(r=>[r.pos,r.driver]),[[1,'Felix Rosenqvist'],[2,'David Malukas'],[3,'Scott McLaughlin']]);
const next=events[2];
assert.deepEqual([next.status,next.display_time,next.title,next.broadcast,next.results],['Upcoming','Mar 7','Streets of St. Petersburg','Fox, FOX One',[
  {label:'Track',value:'Streets of St. Petersburg'},{label:'Location',value:'St. Petersburg, Florida'},{label:'Round',value:'1 of 17'},{label:'Start',value:'Time to be announced'}]]);
assert.ok(events.some(e=>e.title==='Milwaukee Mile (Race 1)'));
// The race window: the podium line and the whole field.
const details=indycarRaceDetails(events[0],indy.rows);
assert.deepEqual(details.lines,['Felix Rosenqvist won the Indianapolis 500, ahead of David Malukas and Scott McLaughlin.']);
assert.equal(details.rows.length,33);
assert.deepEqual(details.rows.at(-1),{participant:'Katherine Legge',result:'33rd · England'});
// A race under way: the board's running order.
const live=indycarRaces(calendar.slice(6,7),{school,config,timeZone:EASTERN,now:new Date('2026-05-24T17:30:00Z'),results:new Map([[7,{...indy,state:'in',lap:120}]])});
assert.deepEqual([live[0].status,live[0].recency_label,live[0].headline,live[0].live_details.order.length],['Live','Lap 120','Leader: Felix Rosenqvist',33]);

// ESPN's driver standings: 33 drivers by rank and points.
const standings=indycarStandings(json('indycar-standings'));
assert.equal(standings[0].title,'Drivers');
assert.equal(standings[0].rows.length,33);
assert.deepEqual(standings[0].rows.slice(0,2),[{pos:1,name:'Álex Palou',detail:'Spain',points:631},{pos:2,name:'Kyle Kirkwood',detail:'USA',points:545}]);
assert.equal(standings[0].source.name,'ESPN IndyCar standings (2026 season)');
assert.ok(PRO_TEAMS['indycar-series']);
console.log('IndyCar module: catalog, ESPN calendar and race-day boards, indycar.com 2027 schedule, race window, live order and standings OK');
