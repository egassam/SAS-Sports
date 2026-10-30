// School calendars against the app's sports list (user, October 30: "We need
// to look at Anthony Middle School. It's not showing any sports except for
// three", then "You need to learn from this and optimize!"). Titles below are
// from the calendars as read on October 30, 2026.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarSportsAudit,parseFreeTitle,parseMiddleSchoolTitle} from '../src/high-school.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
import {anthonyMsSchool,eisenhowerMsSchool,anthonyTitle,USD383_ABBREVIATIONS} from '../src/schools/manhattan-ks-middle.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
const sponsored=JSON.parse(readFileSync(new URL('../src/sponsored-sports.json',import.meta.url),'utf8'));
const cal=titles=>({data:{events:titles.map((title,i)=>({title,start_date:`2026-11-${String(i+1).padStart(2,'0')}`,start_time:'16:00:00'}))}});
const read=(module,title)=>module.calendar.parse(title);

// Anthony's winter shorthand reads as Eisenhower's long form.
{
  const cases={
    '7GBB@ SHMS':['7th Girls Basketball','Shawnee Heights','AWAY'],
    '8GBB v SHMS':['8th Girls Basketball','Shawnee Heights','HOME'],
    '8BBB vs WRNMS':['8th Boys Basketball','Washburn Rural North','HOME'],
    '7BBB @ EmpMS':['7th Boys Basketball','Emporia','AWAY'],
    'BWR Dual vs EMS':['Boys Wrestling','Eisenhower','HOME'],
    'BWR Tny @ SMS':['Boys Wrestling','Seaman Tournament','AWAY'],
    'GWR @ AbMS':['Girls Wrestling','Abilene','AWAY'],
    'GWR Inv Home':['Girls Wrestling','Invitational','HOME'],
    '7GBB LEAGUE @ AMS':['7th Girls Basketball','League Tournament','HOME']};
  for(const [title,want] of Object.entries(cases)){const p=read(anthonyMsSchool,title);assert.deepEqual([p.team,p.name,p.site],want,title);}
  assert.equal(anthonyTitle('8GBB v SHMS'),'8th Girls BB vs SHMS');
  // The fall titles still read as before.
  assert.deepEqual(read(anthonyMsSchool,'7th VB @Emporia'),parseMiddleSchoolTitle('7th VB @Emporia',{abbreviations:USD383_ABBREVIATIONS}));
}

// Eisenhower: spring tennis (one team with Anthony) and a meet named first.
assert.deepEqual(read(eisenhowerMsSchool,'AMS/EMS Varsity Tennis @ Cico Park'),{team:'Tennis',name:'Cico Park',site:'AWAY'});
assert.deepEqual(read(eisenhowerMsSchool,'Tennis @ Emporia'),{team:'Tennis',name:'Emporia',site:'AWAY'});
assert.equal(read(eisenhowerMsSchool,'Little Apple Grapple Wrestling @ MHS').team,'Wrestling');
assert.ok(eisenhowerMsSchool.sports.Wrestling[0].calendar.test('Wrestling'),'the boys team');

// A league word before the sport, any case ("BVL Basketball Tournament @ Hanover").
assert.deepEqual(parseFreeTitle('BVL Basketball Tournament @ Hanover [Manhattan Catholic Schools] [Public calendar]',{abbreviations:{BVL:'Blue Valley League'}}),{team:'Basketball',name:'Blue Valley League Tournament at Hanover',site:'AWAY'});

// The audit: a sport the module reads but the list leaves out; a calendar
// team no sport reads; a title in shorthand the reader cannot read. B teams,
// pictures, postseason rounds without the team and titles naming no game are
// not reported.
{
  const anthony=calendarSportsAudit(cal(['7GBB@ SHMS','BWR Dual vs EMS','7th VB B Tourney @WR North','GBB vs CCCMS','Picture Re-Take Day']),anthonyMsSchool,['Cross Country','Football','Volleyball']);
  assert.deepEqual(anthony,{unlisted:[{name:'Basketball',events:1},{name:'Wrestling',events:1}],unread:[],unparsed:[]});
  const before=calendarSportsAudit(cal(['7GBB@ SHMS']),{...anthonyMsSchool,calendar:{...anthonyMsSchool.calendar,parse:title=>parseMiddleSchoolTitle(title,{abbreviations:USD383_ABBREVIATIONS})}},[]);
  assert.deepEqual(before.unparsed,[{name:'7GBB@ SHMS',events:1}],'the reader before Anthony\'s shorthand');
  const mhs=calendarSportsAudit(cal(['MHS Varsity Boys Basketball - Hays - HOME','MHS JV Boys Basketball - Hays - HOME','MHS Varsity Boys Soccer - Regionals - TBD']),{...manhattanKsSchool,sports:{Soccer:manhattanKsSchool.sports.Soccer}},['Soccer']);
  assert.deepEqual(mhs,{unlisted:[],unread:[{name:'Varsity Boys Basketball',events:1}],unparsed:[]});
  const bv=RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='blue-valley-randolph-ks'),bvms=RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.find(m=>m.id==='blue-valley-randolph-ms-ks');
  assert.deepEqual(calendarSportsAudit(cal(['Substate Basketball','State VB @TBD','8th Girls BB','MS Volleyball- Away vs. Frankfort']),bv,sponsored[bv.id],[bvms]),{unlisted:[],unread:[],unparsed:[]},'a shared calendar: the other school\'s titles');
}

// Every sport a module reads on these calendars is listed (October 30).
for(const [module,titles] of [[anthonyMsSchool,['7GBB@ SHMS','BWR Dual vs EMS','7th VB @Emporia']],[manhattanKsSchool,['MHS Varsity Girls Basketball - Hays - HOME','MHS Varsity Girls Wrestling - Bonner Springs - AWAY','MHS Boys Swimming - Lansing Relay - AWAY','MHS Bowling - Hayden Invite - AWAY']],[eisenhowerMsSchool,['Tennis @ Emporia']]])
  assert.deepEqual(calendarSportsAudit(cal(titles),module,sponsored[module.id]).unlisted,[],module.id);

// A game typed at "03:30" is 3:30 PM.
{
  const {calendarEvents}=await import('../src/high-school.mjs');
  const games=calendarEvents({data:{events:[{title:'7GBB@ SHMS',start_date:'2026-11-02',start_time:'03:30:00'},{title:'8GBB v SHMS',start_date:'2026-11-02',start_time:'16:15:00'}]}},{team:/Girls Basketball/,parse:anthonyMsSchool.calendar.parse});
  assert.deepEqual(games.map(g=>g.time),['15:30','16:15']);
}

console.log('school-sports-audit: ok');
