// Geary County middle and high schools (November 3, 2026): Junction City HS,
// Junction City MS and Fort Riley MS on Bound; St. Xavier's games on MaxPreps
// and its meets on Bound. Fixtures are the real sources of November 3 (Bound
// trimmed to the acts tested).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boundSchedule,boundDedupe,maxprepsContests,meetProResults,googleCalendarPayload,googleCalendarUrl,calendarEvents,BOUND_ACTS} from '../src/high-school.mjs';
import {GEARY_HIGH_SCHOOLS,GEARY_MIDDLE_SCHOOLS,junctionCityKsSchool,junctionCityMsKsSchool,fortRileyMsKsSchool,stXavierKsSchool,stXavierJhKsSchool,stXavierCalendarTitles} from '../src/schools/geary-ks.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
import {anthonyMsSchool,eisenhowerMsSchool} from '../src/schools/manhattan-ks-middle.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const b=readFileSync(new URL('./fixtures/geary-ks/'+name,import.meta.url));return name.endsWith('.gz')?gunzipSync(b).toString('utf8'):b.toString('utf8');};
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const TZ='America/Chicago';

// Catalog: every school in Kansas, Geary County, at its level, with a theme
// and the sports its module reads.
const modules=[...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS];
assert.deepEqual(modules.map(m=>m.id),['junction-city-ks','st-xavier-ks','junction-city-ms-ks','fort-riley-ms-ks','st-xavier-jh-ks']);
for(const m of modules){
  const s=schools.find(x=>x.id===m.id);assert.ok(s,m.id);
  assert.equal(s.state,'Kansas');assert.equal(s.county,'Geary County',m.id);assert.ok(s.city,m.id);
  assert.equal(s.level,GEARY_HIGH_SCHOOLS.includes(m)?'high-school':'middle-school',m.id);
  assert.ok(themes[m.id],m.id);
  assert.deepEqual(sponsored[m.id],Object.keys(m.sports).sort(),m.id);
  for(const teams of Object.values(m.sports))for(const t of teams){
    assert.ok(t.boundSchedule?m.bound?.school:t.maxprepsSchedule&&m.maxpreps?.schoolId,`${m.id}: every team has a schedule source`);
    for(const act of t.boundSchedule?.acts||[])assert.ok(BOUND_ACTS[act],`${m.id}: ${act} has Bound ids`);
    if(t.maxpreps)assert.ok(m.maxpreps?.schoolId,m.id);
  }
}
assert.deepEqual(Object.keys(junctionCityKsSchool.sports).sort(),['Baseball','Basketball','Bowling','Cross Country','Football','Golf','Soccer','Softball','Swimming & Diving','Tennis','Track & Field','Volleyball','Wrestling']);
assert.deepEqual(junctionCityKsSchool.sports.Soccer.map(t=>[t.label,t.maxpreps]),[['Boys','soccer'],['Girls','soccer/girls/spring']],'girls soccer is a spring team on MaxPreps');
assert.deepEqual(junctionCityKsSchool.sports.Bowling.map(t=>t.label),['Girls','Boys','Unified']);
assert.deepEqual(junctionCityKsSchool.sports.Tennis.map(t=>t.tennisReporting.school),['Junction City HS','Junction City HS']);
assert.deepEqual(junctionCityKsSchool.prepGolf,{school:7,code:'JC'});
assert.equal(junctionCityKsSchool.sports['Cross Country'][0].milesplit.team,15714);
// The shared builders keep the Riley and Pottawatomie schools as they were.
assert.deepEqual(RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='wamego-ks').sports.Bowling.map(t=>t.label),['Unified'],'Wamego bowls Unified only');
assert.deepEqual(RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='st-marys-academy-ks').sports.Soccer.map(t=>t.label),['Boys']);
assert.ok(RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.every(m=>!m.sports.Tennis),'no Riley or Pottawatomie middle school gained tennis');

const games=(m,payload,team)=>boundDedupe(boundSchedule([payload],{school:m.bound.school,acts:team.boundSchedule.acts,level:team.boundSchedule.level,timeZone:TZ,noun:team.meet?'Meet':'Tournament'}),{meet:!!team.meet});
const line=g=>`${g.date} ${g.time||'--'} ${g.site||'-'} ${g.name}${g.final?` ${g.final.result} ${g.final.score}-${g.final.opponent_score}`:''}`;

// Junction City HS: varsity football from Bound with the finals entered there.
const jc=JSON.parse(fixture('bound-junction-city-2026-11-03.json.gz'));
assert.deepEqual(games(junctionCityKsSchool,jc,junctionCityKsSchool.sports.Football[0]).map(line),[
  '2026-09-04 19:30 HOME Hays L 7-28','2026-09-11 19:00 HOME Lawrence L 7-31','2026-09-18 19:00 AWAY Wichita Northwest L 14-26','2026-09-25 19:00 AWAY Emporia W 32-6',
  '2026-10-02 19:00 HOME Manhattan','2026-10-09 19:00 HOME Topeka','2026-10-16 19:00 AWAY Washburn Rural','2026-10-23 19:00 HOME Great Bend W 55-14','2026-10-30 19:00 HOME Washburn Rural']);
const [girlsSwim]=junctionCityKsSchool.sports['Swimming & Diving'];
assert.equal(girlsSwim.label,'Girls');
assert.deepEqual(games(junctionCityKsSchool,jc,girlsSwim).map(line),['2027-04-23 15:30 AWAY Salina Girls Swim Invitational','2027-04-27 16:00 AWAY Hays High Invitational','2027-05-06 15:30 AWAY Salina Girls Swim Meet 3'],'girls swim in the spring');
const boysBowling=junctionCityKsSchool.sports.Bowling.find(t=>t.label==='Boys');
assert.equal(games(junctionCityKsSchool,jc,boysBowling).length,10);

// Junction City MS: a grade's A team also reads "7th Grade - A - 1"; B teams are not listed.
const jcms=JSON.parse(fixture('bound-junction-city-ms-2026-11-03.json.gz'));
const [boys7]=junctionCityMsKsSchool.sports.Basketball.filter(t=>t.label==='7th Boys');
const b7=games(junctionCityMsKsSchool,jcms,boys7);
assert.equal(b7.length,12);
assert.ok(b7.some(g=>g.level==='7th Grade - A - 1'&&g.name==='Topeka Seaman MS'),'"7th Grade - A - 1" is the 7th grade A team');
assert.ok(b7.every(g=>!/\bB\b/.test(g.level)));
const tennis=games(junctionCityMsKsSchool,jcms,junctionCityMsKsSchool.sports.Tennis[0]);
assert.deepEqual(tennis.map(g=>g.date),['2027-04-06','2027-04-08','2027-04-20','2027-04-27','2027-04-30','2027-05-04'],'middle school tennis: one entry per meet day');
// Fort Riley MS: "7A" and "7th Grade A-Team" are the 7th grade.
const frms=JSON.parse(fixture('bound-fort-riley-ms-2026-11-03.json.gz'));
const g7=games(fortRileyMsKsSchool,frms,fortRileyMsKsSchool.sports.Basketball.find(t=>t.label==='7th Girls'));
assert.ok(g7.some(g=>g.level==='7A'&&g.name==='Wamego MS')&&g7.some(g=>g.level==='7th Grade A-Team'&&g.name==='Chapman'));
assert.ok(g7.every(g=>!/8|B$/.test(g.level)),'no 8th grade or B team');
assert.deepEqual(fortRileyMsKsSchool.sports['Cross Country'][0].meetPro.team,['Ft Riley','Fort Riley'],'LetsGoRun writes "Ft Riley7G" and "Fort Riley Middle School"');
// LetsGoRun Timing (MeetPro): a meet's runners under any of the school's names.
const meetPro=section=>`<section id="event1"><p class="bold-cell">7th Grade Girls 2 Mile</p><table><tr><td class="team-place">2</td><td class="team">Fort Riley Middle School</td><td class="team-score">61</td></tr>${section}</table></section>`;
const row=(place,team)=>`<tr><td class="place">${place}</td><td class="athlete">DOE, Jane</td><td class="year">7</td><td class="ath-team">${team}</td><td class="time">14:02.1</td></tr>`;
const races=meetProResults(meetPro(row(3,'Fort Riley Middle School')+row(5,'Ft Riley7G')+row(6,'Clay Center')),['Ft Riley','Fort Riley']);
assert.deepEqual(races.map(r=>[r.runners.map(x=>x.place),r.team?.place]),[[[3,5],2]]);
assert.equal(meetProResults(meetPro(row(3,'Riley County')),['Ft Riley','Fort Riley']).length,0,'Riley County is not Fort Riley');
// The 1-mile races at Fort Riley's meet are the junior varsity race: left out
// for every Kansas middle school (Anthony and Eisenhower ran it too).
for(const m of [junctionCityMsKsSchool,fortRileyMsKsSchool,stXavierJhKsSchool,anthonyMsSchool,eisenhowerMsSchool,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.filter(x=>x.sports['Cross Country'])]){
  const ex=m.sports['Cross Country'][0].meetPro.exclude;
  assert.ok(ex.test('1 Mile Run 7th Grade Girls')&&!ex.test('7th Grade Girls Two Mile Run')&&!ex.test('8th Grade Boys Two MIle')&&!ex.test('7th Grade  Girls'),m.id);
}
// Junction City's home meet: "Blue Jay Invitational" on Bound, "Bob Schmoekel" on MileSplit Live.
// Since November 4 the alias is the state's (src/schools/data/ks-aliases.json).
import('../src/high-school.mjs').then(({milesplitMeetFor})=>{
  const meets=[{id:'772766',name:'Bob Schmoekel Cross Country Invitational',venue:{name:'Milford Lake',city:'Junction City'},teams:{JUNC:{id:15714,name:'Junction City High School'}}},{id:'1',name:'Other Invite',venue:{city:'Salina'},teams:{JUNC:{id:15714,name:'Junction City High School'}}}];
  const names=JSON.parse(read('../src/schools/data/ks-aliases.json')).meets;
  assert.equal(milesplitMeetFor(meets,15714,names['Blue Jay Invitational Cross Country Meet'])?.id,'772766');
  assert.equal(milesplitMeetFor(meets,15714,'Blue Jay Invitational Cross Country Meet'),null,'without the alias nothing matches');
});

// St. Xavier: its junior high reads JHA (not JHB), Junior High and grade entries.
const sfx=JSON.parse(fixture('bound-st-xavier-2026-11-03.json.gz'));
assert.deepEqual(games(stXavierJhKsSchool,sfx,stXavierJhKsSchool.sports.Volleyball[0]).map(g=>`${g.date} ${g.level}`),['2026-09-07 JHA','2026-09-12 7th Grade','2026-09-14 Middle School']);
assert.deepEqual(games(stXavierJhKsSchool,sfx,stXavierJhKsSchool.sports.Basketball[0]).map(line),['2026-10-19 16:30 HOME Wathena-Riverside','2026-11-30 16:30 AWAY Wathena-Riverside']);
const sxXc=stXavierKsSchool.sports['Cross Country'][0];
assert.deepEqual(games(stXavierKsSchool,sfx,sxXc).map(g=>g.name),['WCHS Invitational','Karr Classic at The Orchard'],'Bound lists two varsity meets');
// The meets Bound leaves out come from the statewide MileSplit Live index
// (tests/milesplit-season-index.mjs): no hand-kept list remains.
assert.ok([sxXc,junctionCityKsSchool.sports['Cross Country'][0],fortRileyMsKsSchool.sports['Cross Country'][0]].every(t=>!t.extraMeets&&t.milesplit.team),'MileSplit team ids, no extra meets');
// Its games are on MaxPreps (school 2eb435d3-...): the 2026 volleyball finals.
assert.ok(stXavierKsSchool.sports.Basketball.every(t=>t.maxprepsSchedule&&t.maxpreps),'basketball: the MaxPreps schedule');
assert.deepEqual(games(stXavierKsSchool,sfx,stXavierKsSchool.sports.Volleyball[0]).map(line),['2026-10-19 18:30 HOME Veritas Christian'],'volleyball: Bound\'s one varsity entry beside the MaxPreps finals');
const vb=maxprepsContests(fixture('maxpreps-st-xavier-volleyball-2026-11-03.html.gz'),stXavierKsSchool.maxpreps.schoolId);
assert.deepEqual(vb.map(c=>`${c.date} ${c.opponent} ${c.result} ${c.score}-${c.opponent_score}`),['2026-09-08 Flint Hills Christian L 0-3','2026-09-21 Peabody-Burns L 0-2','2026-10-13 Cornerstone Family L 0-3']);

// The Worker: a team whose games are on MaxPreps reads them as its schedule;
// a team's extra meets join its schedule.
const worker=read('../src/index.js');
assert.ok(worker.includes(':maxprepsOnly||team.maxprepsSchedule?[]:calendarEvents('),'a maxprepsSchedule team reads no calendar');
assert.ok(worker.includes('if(maxprepsOnly||team.maxprepsSchedule)for(const contest of contests'),'its unscored MaxPreps games are its schedule');
assert.ok(worker.includes('for(const meet of team.extraMeets||[]){'),'extra meets join the schedule');
assert.ok(worker.includes('config.names?.[game.name]||config.aliases?.[game.name]||game.name'),'a MileSplit meet alias is read');
assert.ok(worker.includes('...GEARY_HIGH_SCHOOLS,...GEARY_MIDDLE_SCHOOLS'),'the Geary modules are registered');

// A location that cannot rebuild serves the last feed built elsewhere:
// the MaxPreps high schools here, and the ParentSquare calendars that answered 520.
for(const m of [junctionCityKsSchool,stXavierKsSchool,...RILEY_POTTAWATOMIE_HIGH_SCHOOLS.filter(x=>x.id==='blue-valley-randolph-ks'),...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.filter(x=>['blue-valley-randolph-ms-ks','manhattan-catholic-ks'].includes(x.id))])assert.equal(m.globalSavedCopy,true,m.id);
// St. Xavier's Google Calendar (through the Calendar API): entries as the
// calendar writes them (2026 season; summary and location only).
const sx=(summary,location='')=>stXavierCalendarTitles({summary,location});
assert.deepEqual(sx('MS/HS VB vs. Veritas - leave at 3:30','Veritas Christian School Gym, 960 E 1296 Rd, Lawrence, KS 66047, USA'),['SX HS Volleyball - Veritas - AWAY','SX MS Volleyball - Veritas - AWAY'],'"MS/HS" counts for both');
assert.deepEqual(sx('HS VB - dismiss at 3:25, leave at 3:35','810 N Sycamore St, Peabody, KS 66866, USA'),['SX HS Volleyball - Peabody - AWAY'],'a street address names its town');
assert.deepEqual(sx('MS Volleyball - we play at 5:30/6:30 - leave at 4:30pm','Luckey Catholic Junior High School, 306 S Juliette Ave, Manhattan, KS 66502, USA'),['SX MS Volleyball - Luckey Catholic - AWAY']);
assert.deepEqual(sx('MS Volleyball Tournament - leave at 8:00','Chapman Middle School, 624 Marshall Ave, Chapman, KS 67431, USA'),['SX MS Volleyball - Tournament at Chapman - AWAY']);
assert.deepEqual(sx('MS VB Tri @ St. X'),['SX MS Volleyball - Tri at St. Xavier - HOME']);
assert.deepEqual(sx('MS BB vs. Wakefield @ St. X'),['SX MS Basketball - Wakefield - HOME']);
assert.deepEqual(sx('HS BB @ FHC'),['SX HS Basketball - Flint Hills Christian - AWAY']);
assert.deepEqual(sx('HS Cross Country Meet - leave at 2:15pm','Cedar Hills Golf Course, 1314 Quivira Rd, Washington, KS 66968, USA'),['SX HS Cross Country - Washington Meet at Cedar Hills Golf Course - AWAY']);
assert.deepEqual(sx('XC Sub-State Competition - time tentative','Spring Lake Playground @ Cheney Lake'),['SX HS Cross Country - Sub-State at Spring Lake Playground @ Cheney Lake - AWAY'],'a sub-state is the high school\'s');
assert.equal(sx('MS/HS VB','St. Francis Xavier Catholic School, 200 N Washington St, Junction City, KS 66441, USA'),null,'a home game naming no opponent is left to MaxPreps and Bound');
for(const t of ['CANCELLED MS/HS XC - leave at 1:45','HS JV Track @ Tescott','Basketball Parent Meeting','First Basketball Practice - time TBD','HS Forensics @ Rock Creek','Homecoming Basketball Games','XC End of Season Celebration & Coach\'s Baby Shower','Cheer to HS Cross Country - dismiss 2:45'])assert.equal(sx(t),null,t);
// The Calendar API's events (singleEvents) as calendar entries in Kansas time.
const gcal=googleCalendarPayload([{items:[
  {id:'a',status:'confirmed',summary:'MS/HS VB vs. Veritas - leave at 3:30',location:'Veritas Christian School Gym, 960 E 1296 Rd, Lawrence, KS 66047, USA',start:{dateTime:'2026-09-07T17:30:00-05:00'},end:{dateTime:'2026-09-07T19:30:00-05:00'},description:'not read'},
  {id:'b',status:'cancelled',summary:'HS VB @ Wakefield',start:{dateTime:'2026-09-09T17:30:00-05:00'}},
  {id:'c',status:'confirmed',summary:'Homecoming Basketball Games',start:{date:'2027-01-28'},end:{date:'2027-01-29'}}]}],{normalize:stXavierCalendarTitles});
assert.deepEqual(gcal.events.map(e=>[e.title,e.start_date,e.start_time]),[['SX HS Volleyball - Veritas - AWAY','2026-09-07','17:30:00'],['SX MS Volleyball - Veritas - AWAY','2026-09-07','17:30:00']]);
assert.ok(!JSON.stringify(gcal).includes('not read'),'the notes are never kept');
assert.deepEqual(calendarEvents(gcal,{prefix:'SX',team:stXavierKsSchool.sports.Volleyball[0].googleCalendar,timeZone:TZ}).map(g=>`${g.date} ${g.time} ${g.site} ${g.name}`),['2026-09-07 17:30 AWAY Veritas']);
assert.ok(googleCalendarUrl(stXavierKsSchool.googleCalendar.id,{start:'2026-07-01',end:'2027-06-30'}).startsWith('https://www.googleapis.com/calendar/v3/calendars/k27ts8fuijnopevpe379j6dqtk%40group.calendar.google.com/events?singleEvents=true'));
assert.ok(Object.values(stXavierKsSchool.sports).flat().every(t=>t.googleCalendar)&&Object.values(stXavierJhKsSchool.sports).flat().every(t=>t.googleCalendar));
assert.ok(worker.includes("const key=env?.GOOGLE_API_KEY||env?.YOUTUBE_API_KEY"),'the Google key, never in a listed URL');
assert.ok(worker.includes('read:googleCalendar.read'),'/live/status reports the calendar read');
console.log(`Geary County module passed: ${modules.length} schools, ${modules.reduce((n,m)=>n+Object.keys(m.sports).length,0)} school-sports.`);
