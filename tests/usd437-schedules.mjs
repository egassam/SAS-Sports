// Washburn Rural's middle schools (USD 437): each grade's basketball schedule
// from the district's PDF, since Bound lists only a few games (user,
// November 9, 2026: "Fix all problems"; Washburn Rural MS's Bound page had no
// Nov 10 game with Anthony, which both schools' schedules list). Fixtures are
// the PDFs' text as the app's PDF reader gives it (November 9, 2026).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {usd437ScheduleRows,usd437ScheduleUrl} from '../src/high-school.mjs';
import {KS_COUNTY_MIDDLE_SCHOOLS} from '../src/schools/ks-counties.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const text=name=>gunzipSync(readFileSync(new URL(`./fixtures/usd437/${name}.txt.gz`,import.meta.url))).toString('utf8');
const rows=(name,school)=>usd437ScheduleRows(text(name),{school}).map(r=>`${r.date} ${r.time||'-'} ${r.site||'-'} ${r.h2h?'vs':'event'} ${r.name}`);

// Girls, 8th grade, Washburn Rural MS: every row, Anthony at home on Nov 10.
assert.deepEqual(rows('girls-basketball-8th-grade-schedule-wrms','wrms'),[
  '2026-10-29 15:45 AWAY vs Emporia','2026-11-03 15:30 HOME vs Seaman','2026-11-05 15:30 HOME vs Shawnee Heights',
  '2026-11-07 08:30 AWAY event 8th Grade Tournament','2026-11-09 15:30 AWAY event 8th Grade Tournament',
  '2026-11-10 15:30 HOME vs Anthony','2026-11-11 15:30 HOME vs Lawrence SW','2026-11-12 16:30 AWAY vs Junction City',
  '2026-11-17 15:30 HOME vs Eisenhower','2026-11-19 15:30 AWAY vs Washburn Rural North','2026-12-01 15:30 HOME vs Emporia',
  '2026-12-03 15:30 AWAY vs Seaman','2026-12-10 15:30 - event CML Tournament 1st round','2026-12-12 09:00 HOME event CML Tournament']);
// 7th grade: at Anthony on Nov 10 (4:15); a tournament's field is not its name.
const g7=rows('girls-basketball-7th-grade-schedule-wrms','wrms');
assert.equal(g7.length,14);
assert.ok(g7.includes('2026-11-10 16:15 AWAY vs Anthony'));
assert.ok(g7.includes('2026-11-07 08:30 AWAY event 7th Grade Tournament'));
assert.ok(g7.includes('2026-11-17 16:15 AWAY vs Eisenhower'),'"Manhattan Eisenhower" is Eisenhower');
// North: the mixer is an event; the CML first round ("7th A followed by 8th A") is a home event; the footer is not a site.
const n7=rows('girls-basketball-7th-grade-schedule-wrn','wrn');
assert.equal(n7.length,14);
assert.ok(n7.includes('2026-10-27 15:45 AWAY event Mass Street Mixer'));
assert.ok(n7.includes('2026-11-05 15:30 HOME vs Anthony'));
assert.ok(n7.includes('2026-12-10 15:30 HOME event CML Tournament 1st Round'));
assert.ok(n7.includes('2026-11-19 15:30 AWAY vs Washburn Rural'),'WRMS is Washburn Rural');
assert.equal(rows('girls-basketball-8th-grade-schedule-wrn','wrn').length,14);
// Boys (January): single-digit dates in a footer ("SAT 2/20/27") are rows too.
const b7=usd437ScheduleRows(text('boys-basketball-7th-grade-schedule-wrms'),{school:'wrms'});
assert.equal(b7.length,15);
assert.deepEqual([b7.at(-1).date,b7.at(-1).name,b7.at(-1).address],['2027-02-20','CML Tournament','Eisenhower Middle School']);
assert.equal(rows('boys-basketball-8th-grade-schedule-wrms','wrms').length,15);
assert.equal(rows('boys-basketball-7th-grade-schedule-wrn','wrn').length,12);
assert.equal(rows('boys-basketball-8th-grade-schedule-wrn','wrn').length,12);

// The modules: both schools' grade teams read their PDF.
const module=id=>KS_COUNTY_MIDDLE_SCHOOLS.find(m=>m.id===id);
assert.deepEqual(module('washburn-rural-ms-ks').sports.Basketball.filter(t=>t.pdfSchedule).map(t=>`${t.label} ${t.pdfSchedule.url}`),[
  `7th Girls ${usd437ScheduleUrl('girls-basketball','7th-grade','wrms')}`,`8th Girls ${usd437ScheduleUrl('girls-basketball','8th-grade','wrms')}`,
  `7th Boys ${usd437ScheduleUrl('boys-basketball','7th-grade','wrms')}`,`8th Boys ${usd437ScheduleUrl('boys-basketball','8th-grade','wrms')}`]);
assert.equal(usd437ScheduleUrl('girls-basketball','8th-grade','wrms'),'https://usd437.net/assets/documents/student/sports/girls-basketball/8th-grade-schedule/wrms');
assert.equal(module('washburn-rural-north-ms-ks').sports.Basketball.filter(t=>t.pdfSchedule).length,4);
assert.ok(KS_COUNTY_MIDDLE_SCHOOLS.filter(m=>m.sports.Basketball?.some(t=>t.pdfSchedule)).every(m=>/^washburn-rural/.test(m.id)),'only USD 437');

// The feed (Bound empty; the PDFs only), on Nov 9 at 9:28 PM.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const PDF=new Map(['girls','boys'].flatMap(g=>['7th','8th'].flatMap(gr=>['wrms','wrn'].map(s=>[usd437ScheduleUrl(`${g}-basketball`,`${gr}-grade`,s),`${g}-basketball-${gr}-grade-schedule-${s}`]))));
const requests=[];
const fetch=async(url)=>{
  url=String(url);requests.push(url);
  if(url.startsWith('https://beta.gobound.com/'))return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
  if(PDF.has(url))return new Response(new TextEncoder().encode(text(PDF.get(url))),{status:200,headers:{'content-type':'application/pdf'}});
  return new Response('',{status:404});
};
const extractText=async bytes=>({text:new TextDecoder().decode(bytes)});
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText,fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents}')(...Object.values(deps));
const RealDate=Date,at=new RealDate('2026-11-10T03:28:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
try{
  const live=await worker.fetchLive('washburn-rural-ms-ks','Basketball');
  assert.equal(live.error,null);
  const [group]=worker.groupEvents(live.events,at);
  const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
  const girls=list=>list.filter(e=>/Girls/.test(e.title)).map(line);
  assert.deepEqual(girls(group.upcoming).slice(0,6),[
    // A tournament day is "Today" until the day is over (several games, no set end).
    'Today Nov 9, 3:30 PM 7th Girls · Washburn Rural at 7th Grade Tournament | ','Today Nov 9, 3:30 PM 8th Girls · Washburn Rural at 8th Grade Tournament | ',
    'Upcoming Nov 10, 3:30 PM 8th Girls · Washburn Rural vs Anthony | ','Upcoming Nov 10, 4:15 PM 7th Girls · Washburn Rural at Anthony | ',
    'Upcoming Nov 11, 3:30 PM 8th Girls · Washburn Rural vs Lawrence SW | ','Upcoming Nov 12, 3:30 PM 7th Girls · Washburn Rural vs Junction City | ']);
  // Past games no source has a score for are played (middle school rule).
  assert.ok(girls(group.results).includes('Final Oct 29, 3:45 PM 8th Girls · Washburn Rural at Emporia | No score posted'));
  assert.ok(girls(group.results).includes('Final Nov 7, 8:30 AM 8th Girls · Washburn Rural at 8th Grade Tournament | No score posted'),'a past tournament day is played');
  const nov10=group.upcoming.find(e=>/8th Girls · Washburn Rural vs Anthony/.test(e.title));
  assert.equal(nov10.source.name,'District schedule (USD 437, PDF)');
  assert.equal(nov10.source.url,usd437ScheduleUrl('girls-basketball','8th-grade','wrms'));
  assert.ok(live.source_urls.includes(usd437ScheduleUrl('boys-basketball','7th-grade','wrms')));
}finally{globalThis.Date=RealDate;}
console.log('USD 437 schedules: Washburn Rural MS and North basketball from the district PDFs verified');
