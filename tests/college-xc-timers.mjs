// College cross country meets timed by PrimeTime Timing (user, October 30,
// 2026: "Add live results for college cross country too", then "Yes build
// what you can"). PrimeTime's terms bar apps from reading its live results,
// so the meet's day card carries the host's race times and PrimeTime's event
// page. Names are the ones each school's schedule published (production
// feeds, October 30).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyCollegeXcTimerMeets,COLLEGE_XC_TIMER_MEETS} from '../src/college-xc-timers.mjs';

const ev=(opponent,start_time,extra={})=>({status:'Upcoming',opponent,start_time,results:[],result_count:0,...extra});
const big12={conference:'Big 12'},american={conference:'American'},acc={conference:'ACC'};

// The Big 12 meet, every school's spelling: race times from Oklahoma State's
// meet page (10:00 AM CT women's 6K, 11:00 AM CT men's 8K) and the link.
for(const name of ['Big 12 Championship','Big 12 Championships','Big 12 Cross Country Championships']){
  const [e]=applyCollegeXcTimerMeets([ev(name,'2026-10-31T10:00:00.000Z')],big12);
  assert.deepEqual(e.results,[{group:'Stillwater, OK',participant:"Women's 6K race",result:'10:00 AM CT'},{group:'Stillwater, OK',participant:"Men's 8K race",result:'11:00 AM CT'}],name);
  assert.equal(e.result_count,2);
  assert.equal(e.recap_url,'https://www.pttiming.com/event/fda0d982-abfd-43af-ae80-684ab8d21f62');
  assert.equal(e.recap_label,'Live results (PrimeTime Timing)');
  assert.match(e.highlight_status,/^Timed by PrimeTime Timing\. .*does not allow apps to read its live results/);
}
// On the day ("Today") too; a team listed on its own shows its own race (BYU).
{
  const [w,m]=applyCollegeXcTimerMeets([ev('Big 12 Championships','2026-10-31T09:00:00.000Z',{status:'Today',team_label:"Women's"}),ev('Big 12 Championships','2026-10-31T10:00:00.000Z',{team_label:"Men's"})],big12);
  assert.deepEqual(w.results.map(r=>r.participant),["Women's 6K race"]);
  assert.deepEqual(m.results.map(r=>r.participant),["Men's 8K race"]);
}
// The American and the NCAA meet: the link, no race times yet.
for(const [name,school,date] of [['American Conference Championships',american,'2026-10-31'],['American Cross Country Championships',american,'2026-10-31'],['American Conference Cross Country Championship',american,'2026-10-31'],['NCAA Championship',big12,'2026-11-21'],['NCAA Cross Country Championships',acc,'2026-11-21'],['NCAA National Championships',american,'2026-11-21'],['NCAA Cross Country National Championships',american,'2026-11-21']]){
  const [e]=applyCollegeXcTimerMeets([ev(name,`${date}T12:00:00.000Z`)],school);
  assert.ok(/^https:\/\/www\.pttiming\.com\/event\//.test(e.recap_url),name);
  assert.deepEqual(e.results,[],name);
}
// Left alone: regionals, another day, another conference's meet, a meet
// already final, other sports' timers.
for(const [name,school,date,status] of [['NCAA Midwest Regional',big12,'2026-11-13','Upcoming'],['NCAA Midwest Regional Championships',big12,'2026-11-21','Upcoming'],['NCAA South Central Regional Cross Country Championships',american,'2026-11-21','Upcoming'],['Big 12 Championship',big12,'2025-10-31','Upcoming'],['Big 12 Championship',american,'2026-10-31','Upcoming'],['American Conference Championships',big12,'2026-10-31','Upcoming'],['Big 12 Championship',big12,'2026-10-31','Final']]){
  const [e]=applyCollegeXcTimerMeets([ev(name,`${date}T12:00:00.000Z`,{status})],school);
  assert.equal(e.recap_url,undefined,`${name} ${date} ${status}`);
  assert.deepEqual(e.results,[]);
}
// Nothing here reads PrimeTime: every meet links its public event page only.
for(const m of COLLEGE_XC_TIMER_MEETS)assert.match(m.url,/^https:\/\/www\.pttiming\.com\/event\/[0-9a-f-]{36}$/);
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
assert.doesNotMatch(worker,/live\.pttiming\.com/);
assert.match(worker,/if\(sport==='Cross Country'\)applyCollegeXcTimerMeets\(events,school\);/);
console.log('college-xc-timers: ok');
