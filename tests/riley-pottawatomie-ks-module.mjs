// Riley County and Pottawatomie County middle and high schools (October 25,
// 2026): Bound schedules, hand-typed district calendars and Flint Hills
// Christian's athletics sheet. Fixtures are the real sources of October 25
// (Bound trimmed to the acts tested).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {boundSchedule,boundDedupe,boundTeamPlace,parseFreeTitle,sheetCalendar,calendarEvents,parseCsv,BOUND_ACTS,isNamedEvent} from '../src/high-school.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS,wamegoKsSchool,rockCreekMsKsSchool,blueValleyRandolphKsSchool,manhattanCatholicKsSchool,flintHillsChristianKsSchool,stMarysJhKsSchool} from '../src/schools/riley-pottawatomie-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const b=readFileSync(new URL('./fixtures/riley-pottawatomie-ks/'+name,import.meta.url));return name.endsWith('.gz')?gunzipSync(b).toString('utf8'):b.toString('utf8');};
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const TZ='America/Chicago',VARSITY=/^Varsity$/i;

// Catalog: every school in Kansas, in its county, at its level, with its
// town, a theme and the sports its module reads.
const modules=[...RILEY_POTTAWATOMIE_HIGH_SCHOOLS,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS];
assert.equal(modules.length,17);
for(const m of modules){
  const s=schools.find(x=>x.id===m.id);assert.ok(s,m.id);
  assert.equal(s.state,'Kansas');assert.ok(['Riley County','Pottawatomie County'].includes(s.county),m.id);assert.ok(s.city,m.id);
  assert.equal(s.level,RILEY_POTTAWATOMIE_HIGH_SCHOOLS.includes(m)?'high-school':'middle-school',m.id);
  assert.ok(themes[m.id],m.id);
  assert.deepEqual(sponsored[m.id],Object.keys(m.sports).sort(),m.id);
  for(const teams of Object.values(m.sports))for(const t of teams){
    assert.ok(t.boundSchedule?m.bound?.school:m.calendar?.url,`${m.id}: every team has a schedule source`);
    for(const act of t.boundSchedule?.acts||[])assert.ok(BOUND_ACTS[act],`${m.id}: ${act} has Bound ids`);
    if(t.maxpreps)assert.ok(m.maxpreps?.schoolId,m.id);
  }
}
assert.equal(schools.find(s=>s.id==='flint-hills-christian-ks').county,'Pottawatomie County','3905 Green Valley Rd is east of the Big Blue');
assert.ok(read('../public/index.html').includes("'Football','Flag Football'"),'Wamego girls flag football has a sport');

// Bound: Wamego's own events of an act and level; home flags; finals; the
// placeholders beside real entries.
const wamego=JSON.parse(fixture('bound-wamego-2026-10-25.json.gz')),W=wamegoKsSchool.bound.school;
const games=acts=>boundDedupe(boundSchedule([wamego],{school:W,acts,level:VARSITY,timeZone:TZ,noun:'Tournament'}),{meet:false});
const line=g=>`${g.date} ${g.time||'--'} ${g.site||'-'} ${g.name}${g.final?` ${g.final.result} ${g.final.score}-${g.final.opponent_score}`:''}${g.end_date?` to ${g.end_date}`:''}`;
assert.deepEqual(games(['Football']).map(line),[
  '2026-09-04 20:00 HOME Clay Center W 35-7','2026-09-11 19:00 AWAY Abilene W 57-13','2026-09-18 19:00 HOME Rock Creek','2026-09-25 19:00 HOME Mulvane',
  '2026-10-09 19:00 AWAY Concordia','2026-10-16 19:00 AWAY Hesston W 42-14','2026-10-23 19:00 HOME Jefferson West','2026-10-30 19:00 HOME TBD',
  '2026-11-06 -- - Regional Football','2026-11-13 -- - Regional Football','2026-11-20 -- - Sub-State Football','2026-11-27 -- - State Football'
],'times in Kansas time (Sep 4 kickoff is 01:00 UTC Sep 5); a playoff day naming only Wamego is neutral');
const vb=games(['Volleyball']);
assert.equal(vb.filter(g=>g.date==='2026-10-24').map(line).join(),'2026-10-24 13:00 AWAY Sub State','the empty "Sub-State Volleyball" placeholder gives way to the day at Paola');
assert.equal(vb.filter(g=>g.date==='2026-09-01').map(line).join(),'2026-09-01 17:15 AWAY Concordia W 2-0','the same match twice: the one with a time');
assert.deepEqual(vb.filter(g=>g.date==='2026-09-26').map(line),['2026-09-26 09:00 HOME Royal Valley L 0-2','2026-09-26 16:00 HOME Clearwater W 2-0'],'a tournament whose matches are listed shows the matches');
assert.equal(vb.at(-1).name,'State Volleyball');assert.equal(vb.at(-1).end_date,'2026-11-01','two days in a row: one entry');
const xc=boundDedupe(boundSchedule([wamego],{school:W,acts:['Girls Cross Country','Boys Cross Country'],level:VARSITY,timeZone:TZ}),{meet:true});
assert.equal(xc.length,12,'one entry per meet day for both teams');
assert.equal(xc.find(g=>g.date==='2026-10-31').name,'KHSAA State XC Meet','state day: the meet, not the "Conway Springs vs Wamego" placeholder');
assert.equal(xc.find(g=>g.date==='2026-10-15').name,'Great Life Golf Course meet','a meet titled "Event" is named for its venue');
const golf=boundDedupe(boundSchedule([wamego],{school:W,acts:['Girls Golf'],level:VARSITY,timeZone:TZ}),{meet:true});
assert.deepEqual(boundTeamPlace(golf.find(g=>g.date==='2026-09-22')),{place:8,teams:8,score:351,tied:false},'BVSW Varsity Golf: 8th of the 8 teams with a score entered on Bound (low wins)');

// An event filed under the wrong act is not that sport's (Bound: Wamego's
// "Flag Football Triangular" of Sep 14 filed as girls' wrestling).
const misfiled=[{Title:'Flag Football Triangular',IDEvent:'g1',Events:[{RecordID:'r1',RecordType:'comp',Title:'Flag Football Triangular',ActName:'Girls Wrestling',IDAct:BOUND_ACTS['Girls Wrestling'][0],LevelDisplay:'Varsity',StartDateTime:'2026-09-14T21:00:00.000Z',EndDateTime:'2026-09-14T23:00:00.000Z',Teams:[{Name:'Wamego',HostSchoolID:W,HomeFlag:true,Score:0}],VenueLocationsDisplay:''}]},{Title:'Wamego Red Raider Classic',IDEvent:'g2',Events:[{RecordID:'r2',RecordType:'comp',Title:'Wamego Red Raider Classic',ActName:'Girls Wrestling',IDAct:BOUND_ACTS['Girls Wrestling'][0],LevelDisplay:'Varsity',StartDateTime:'2026-12-05T15:00:00.000Z',EndDateTime:'2026-12-05T22:00:00.000Z',Teams:[{Name:'Wamego',HostSchoolID:W,HomeFlag:true,Score:0}],VenueLocationsDisplay:'Wamego High School'}]}];
assert.deepEqual(boundSchedule([misfiled],{school:W,acts:['Girls Wrestling'],level:VARSITY,timeZone:TZ}).map(g=>g.name),['Wamego Red Raider Classic']);
const xcAtGolfCourse=boundSchedule([wamego],{school:W,acts:['Girls Cross Country','Boys Cross Country'],level:VARSITY,timeZone:TZ});
assert.ok(xcAtGolfCourse.some(g=>/Wamego Country Club|Great Life Golf/.test(g.address||'')),'a cross country meet at a golf course is still cross country');

// Middle school levels: the grade's A team is the grade; B teams are not listed.
const rcms=JSON.parse(fixture('bound-rock-creek-ms-2026-10-25.json.gz'));
const [seventh]=rockCreekMsKsSchool.sports.Volleyball;
const ms=boundSchedule([rcms],{school:rockCreekMsKsSchool.bound.school,acts:seventh.boundSchedule.acts,level:seventh.boundSchedule.level,timeZone:TZ,noun:'Tournament'});
assert.equal(seventh.label,'7th');
assert.ok(ms.length>=7&&ms.every(g=>/^7th(?: Grade)?(?: A)?$/.test(g.level)),'7th Grade and 7th Grade A');
assert.ok(!ms.some(g=>/B$/.test(g.level)),'7th Grade B is not listed');
assert.equal(stMarysJhKsSchool.bound.school,'h20250204045205533eddae2a4d03e42','the junior high reads St. Marys\' own Bound school');

// Blue Valley (USD 384): titles typed by hand.
const bv=t=>parseFreeTitle(t,{level:'HS',abbreviations:{MHK:'Manhattan',BVHS:'Blue Valley',BV:'Blue Valley',TVL:'Twin Valley League',WaCo:'Washington County'},home:/^(?:Blue Valley|home)$/i});
assert.deepEqual(bv('HS Football- Home vs. Canton-Galva'),{team:'HS Football',name:'Canton-Galva',site:'HOME'});
assert.deepEqual(bv('Time Change!! HS FB @Clifton Clyde (Away)'),{team:'HS Football',name:'Clifton Clyde',site:'AWAY'});
assert.deepEqual(bv('HS Football vs Lakeside- Homecoming (Home)'),{team:'HS Football',name:'Lakeside',site:'HOME'});
assert.deepEqual(bv('MS/HS Cross Country- Abilene Meet at Great Life Golf & Fitness'),{team:'HS Cross Country',name:'Abilene Meet at Great Life Golf & Fitness',site:'AWAY'},'"MS/HS" counts for the high school');
assert.deepEqual(bv('HS Volleyball-  C Team, JV, Varsity Tournament at Onaga'),{team:'HS Volleyball',name:'Tournament at Onaga',site:'AWAY'});
assert.deepEqual(bv('HS Volleyball Regionals @BVHS (Home)'),{team:'HS Volleyball',name:'Regionals at Blue Valley',site:'HOME'});
assert.deepEqual(bv('HS Cross Country @Wamego - 1A State'),{team:'HS Cross Country',name:'1A State at Wamego',site:'AWAY'});
assert.deepEqual(bv('HS Basketball vs. Frankfort- Winter Royalty and Senior Night'),{team:'HS Basketball',name:'Frankfort',site:'HOME'});
assert.deepEqual(bv('HS Basketball- TVL Tournament at Frankfort'),{team:'HS Basketball',name:'Twin Valley League Tournament at Frankfort',site:'AWAY'});
assert.equal(bv('MS Volleyball- vs. Bennington at Home'),null,'a middle school entry is not the high school\'s');
assert.equal(bv('First Day VB & FB Practices'),null);
const usd384=JSON.parse(fixture('usd384-calendar-2026-10-25.json.gz'));
const bvFootball=calendarEvents(usd384,{team:/^HS Football$/,parse:blueValleyRandolphKsSchool.calendar.parse,timeZone:TZ});
assert.deepEqual(bvFootball.slice(0,6).map(g=>`${g.date} ${g.site} ${g.name}`),['2026-09-04 AWAY Clifton Clyde','2026-09-11 HOME Canton-Galva','2026-09-18 HOME Lakeside','2026-09-25 HOME Axtell','2026-10-02 HOME Linn','2026-10-09 AWAY Frankfort']);

// Manhattan Catholic: no level prefix; its calendar is in UTC.
const mcs=JSON.parse(fixture('mcs-calendar-2026-10-25.json.gz'));
const mcsVb=calendarEvents(mcs,{team:/^Volleyball$/,parse:manhattanCatholicKsSchool.calendar.parse,timeZone:TZ});
assert.equal(mcsVb.find(g=>g.date==='2026-09-10').time,'17:00','22:00 UTC is 5:00 PM in Kansas');
assert.deepEqual(mcsVb.map(g=>g.name).slice(0,3),['Blue Valley & Bennington','Valley Heights','Manhattan Chiefs & St. Xavier']);
assert.ok(mcsVb.some(g=>g.name==='Quad at Hanover'),'"(A Team Only)" and "- Quad"');
const mcsXc=calendarEvents(mcs,{team:/^Cross Country$/,parse:manhattanCatholicKsSchool.calendar.parse,timeZone:TZ});
assert.equal(mcsXc.length,5);

// Flint Hills Christian: the sheet's blocks.
const sheet=sheetCalendar(fixture('fhcs-sheet-2026-10-25.csv'),{prefix:'FHCS',abbreviations:{MHK:'Manhattan'}});
const fh=team=>calendarEvents(sheet,{prefix:'FHCS',team});
assert.deepEqual(fh(/^HS Cross Country$/).map(g=>g.name),['Manhattan','Wamego','Clay Center','Wabaunsee','Nemaha Central','Junction City','Riley Co','Jackson Heights','KASC State'],'"(HS & MS)" meets count for both');
assert.equal(fh(/^MS Cross Country$/).length,7);
const vbHome=fh(/^HS Volleyball$/).find(g=>g.date==='2026-08-25');
assert.deepEqual([vbHome.name,vbHome.site,vbHome.time],['Cornerstone','HOME','18:30'],'the last time is varsity\'s');
assert.deepEqual(fh(/^HS Golf$/)[0],{date:'2027-04-01',time:'13:00',end_date:null,name:'WAHAA / Veritas',site:'HOME',address:'Stagg Hill Golf Course - Manhattan',calendar_id:'HS Golf|2027-04-01|WAHAA / Veritas'},'"FHCS Host - WAHAA/Veritas" is a home meet');
assert.equal(flintHillsChristianKsSchool.calendar.read(fixture('fhcs-sheet-2026-10-25.csv')).events.length,sheet.events.length);
assert.deepEqual(parseCsv('a,"b, c",d\n"e ""f"""\n'),[['a','b, c','d'],['e "f"']]);
assert.ok(isNamedEvent('Sectionals'));

console.log('riley-pottawatomie-ks-module: ok');
