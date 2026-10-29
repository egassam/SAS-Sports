// Cross country timed by Midwest Timing & Results (midwesttiming.com, the
// KSHSAA state meets; user, October 29: "Do 1 and 2 with the understanding
// that I would prefer live if I can get in contact with them"). Fixtures:
// its 2026 results page of October 29 (table rows only), the text unpdf
// reads from its 5A Sub-State PDF (Great Bend, October 24) and Manhattan's
// calendar of October 29 (cross country only). The state results are not
// posted yet: the Manhattan run below is the sub-state with Salina Central's
// names written as Manhattan's.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {midwestTimingMeets,hytekXcResults,MIDWEST_TIMING_RESULTS} from '../src/high-school.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>{const bytes=readFileSync(new URL('./fixtures/midwest-timing/'+name,import.meta.url));return(name.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8');};
const listing=fixture('results-2026-2026-10-29.html.gz'),subState=fixture('2026-5a-great-bend-sub-state.unpdf.txt.gz');

// The results page: every meet by day and place, the PDF once posted.
{
  const meets=midwestTimingMeets(listing,'2026');
  assert.equal(meets.length,345);
  const state=meets.filter(m=>m.date==='2026-10-31'&&/Championship/.test(m.name));
  assert.deepEqual(state.map(m=>[m.place,m.pdf,m.milesplit]),[['Wamego, KS',null,'https://ks.milesplit.com/meets/787762-kshsaa-state-championship-1a-2a-4a-2026'],['Lawrence, KS',null,'https://ks.milesplit.com/meets/787763-kshsaa-state-championship-3a-5a-6a-2026']]);
  const gb=meets.find(m=>m.name==='KSHSAA 5A Sub-State');
  assert.equal(gb.date,'2026-10-24');assert.equal(gb.place,'Great Bend, KS');
  assert.equal(gb.pdf,'https://wkyzbfnhunrtyqjewpna.supabase.co/storage/v1/object/public/results/2026/1792865241172-2026%205A%20Great%20Bend%20SS%20Results.pdf');
  // Other years write "11/2/24" and "12/5 - 12/6/25".
  assert.deepEqual(midwestTimingMeets('<tr><td>11/2/24</td><td>A</td><td>Wamego, KS</td><td></td><td></td></tr><tr><td>12/5 - 12/6/25</td><td>B</td><td>Pittsburg, KS</td><td><a href="x.pdf">Results</a></td><td></td></tr>','2026').map(m=>[m.date,m.pdf]),[['2024-11-02',null],['2025-12-05','x.pdf']]);
}

// A Hy-Tek PDF: team place, every runner of the school, the field. Team
// names are cut to the column ("Salina Centr", "Salina Central High Schoo").
{
  const races=hytekXcResults(subState,['Salina Central High School']);
  assert.deepEqual(races.map(r=>[r.race,r.team,r.teams,r.field,r.runners.length]),[['Girls 5k Run CC Race A',{place:6,team:'Salina Central High Schoo',score:'118'},8,59,7],['Boys 5k Run CC Race B',{place:6,team:'Salina Central High Schoo',score:'142'},7,55,7]]);
  assert.deepEqual(races[0].runners[0],{place:2,athlete:'Kaylie Shultz',year:'',team:'Salina Centr',time:'17:40.47'});
  const kapaun=hytekXcResults(subState,['Kapaun Mt. Carmel High School']);
  assert.deepEqual(kapaun.map(r=>[r.team.place,r.team.score,r.runners[0].athlete,r.runners[0].time]),[[1,'45','Ava Claassen','16:50.93'],[1,'22','Jack Sauer','15:59.82']]);
  // A grade before the team; a school not in the meet; no PDF text.
  assert.deepEqual(hytekXcResults('Event 1 Boys 5k Run CC 6A\n1 Doe, John Paul 12 Manhattan High 15:59.82 1\n2 Roe, Al Free State High 16:01.00 2','Manhattan High School')[0].runners,[{place:1,athlete:'John Paul Doe',year:'SR',team:'Manhattan High',time:'15:59.82'}]);
  assert.deepEqual(hytekXcResults(subState,['Manhattan High School']),[]);
  assert.deepEqual(hytekXcResults('',['Manhattan High School']),[]);
}

// Manhattan's state meet in the module: both teams qualified.
const [state]=manhattanKsSchool.midwestTiming;
assert.equal(state.date,'2026-10-31');
assert.deepEqual(state.races,[{label:'Girls',time:'10:00'},{label:'Boys',time:'11:45'}]);
assert.ok(state.place.test('Lawrence, KS')&&!state.place.test('Wamego, KS'));

// The Worker, from fixtures only.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const CALENDAR=`${manhattanKsSchool.calendar.url}?start_date=2026-07-01&end_date=2027-06-30`;
const PDF='https://wkyzbfnhunrtyqjewpna.supabase.co/storage/v1/object/public/results/2026/1793000000000-2026%20KSHSAA%20State%203-5-6A%20Results.pdf';
// Posted: the Lawrence row with a PDF; Salina Central's names as Manhattan's.
const posted=listing.replace(/(<td>Lawrence, KS<\/td><td>)(<\/td>)/,`$1<a href="${PDF}">Results</a>$2`);
const manhattan=subState.replace(/Salina Central High Schoo/g,'Manhattan High School').replace(/Salina Centr/g,'Manhattan Hi');
const pages=new Map([[CALENDAR,fixture('mhs-calendar-xc-2026-10-29.json')],[`${MIDWEST_TIMING_RESULTS}2026`,listing]]);
let pdfText=manhattan;
const requests=[];
const fetch=async url=>{
  const key=String(url);requests.push(key);
  if(key===PDF)return{ok:true,status:200,url:key,headers:new Headers({'content-type':'application/pdf'}),arrayBuffer:async()=>new TextEncoder().encode('%PDF-1.4 fixture').buffer,text:async()=>''};
  let body=pages.get(key);if(body==null&&/gobound\.com/.test(key))body='[]';
  if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>''};
  return{ok:true,status:200,url:key,headers:new Headers({'content-type':/\.json|calendars/.test(key)?'application/json':'text/html'}),text:async()=>body,json:async()=>JSON.parse(body)};
};
const extractText=async()=>({text:pdfText});
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText,fetch};
const worker=Function(...Object.keys(deps),source+';return {midwestTimingResultsFor,meetProReader,fetchLive,groupEvents}')(...Object.values(deps));
const school=schools.find(s=>s.id==='manhattan-ks');
const line=r=>`${r.group} | ${r.participant} | ${r.result}`;
const RealDate=Date;
const at=async(iso,fn)=>{const t=new RealDate(iso);globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[t.getTime()]))}static now(){return t.getTime()}};try{return await fn(t)}finally{globalThis.Date=RealDate;}};
const feed=t=>worker.fetchLive('manhattan-ks','Cross Country').then(r=>{assert.equal(r.error,null);return worker.groupEvents(r.events,t)[0];});

// Before the meet (October 29): the state meet on the calendar day, named,
// at the first race's start, with both race times, the site and the
// timer's live page. No results are read before the day.
await at('2026-10-29T18:00:00Z',async t=>{
  const group=await feed(t);
  const e=group.upcoming.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.title,'Manhattan at KSHSAA 6A State Championship');
  assert.equal(e.display_time,'Oct 31, 10:00 AM','the first race, not the calendar\'s 9:30');
  assert.deepEqual(e.results.map(line),['Rim Rock Farm, Lawrence | Girls race | 10:00 AM','Rim Rock Farm, Lawrence | Boys race | 11:45 AM']);
  assert.equal(e.recap_url,state.live);
  assert.equal(e.recap_label,'Live results (MileSplit Live)');
  assert.ok(!e.meet_results_verified);
  assert.equal(group.upcoming.filter(x=>x.start_time.startsWith('2026-10-31')).length,1,'one card for the day');
  assert.ok(!requests.some(u=>u.startsWith(MIDWEST_TIMING_RESULTS)),'nothing read before the day');
});

// Meet day, results not posted yet: the race times stay, the list is read
// again after two minutes.
await at('2026-10-31T16:00:00Z',async t=>{
  const ttls=[],base=worker.meetProReader(),readAt=(url,ttl)=>{ttls.push([url,ttl]);return base(url,ttl);};
  assert.equal(await worker.midwestTimingResultsFor(school,state,{date:state.date},readAt,true),null);
  assert.deepEqual(ttls,[[`${MIDWEST_TIMING_RESULTS}2026`,SOURCE_TTL.schedule]]);
  const e=(await feed(t)).upcoming.concat((await feed(t)).results).find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.status,'Today');
  assert.equal(e.results.length,2);
  assert.equal(e.recap_url,state.live);
});

// Posted: team places and every runner, from the timer's PDF.
pages.set(`${MIDWEST_TIMING_RESULTS}2026`,posted);
await at('2026-11-01T15:00:00Z',async t=>{
  const r=await worker.midwestTimingResultsFor(school,state,{date:state.date},worker.meetProReader());
  assert.equal(r.url,PDF);
  assert.equal(r.label,'View full results (Midwest Timing & Results)');
  assert.equal(r.headline,'Girls 6th of 8 · Boys 6th of 7');
  assert.equal(r.rows.length,2+14);
  assert.deepEqual(r.rows.slice(0,2).map(line),['Girls | Manhattan team | 6th of 8 · 118 pts','Girls | Kaylie Shultz | 2nd of 59 · 17:40.47']);
  assert.equal(r.highlights[0],'Girls: Manhattan placed 6th of 8 with 118 points; Kaylie Shultz led Manhattan in 2nd (17:40.47).');
  const group=await feed(t);
  const e=group.results.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.status,'Final');
  assert.equal(e.headline,'Girls 6th of 8 · Boys 6th of 7');
  assert.equal(e.recap_url,PDF);
  assert.equal(e.meet_results_verified,true);
  assert.equal(e.results.length,16);
});

// Posted as a PDF the app cannot read (2025's state results were scanned
// pages): listed with the PDF's link, not "No results posted".
pdfText='';
await at('2026-11-01T15:00:00Z',async t=>{
  const e=(await feed(t)).results.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.status,'Final');
  assert.equal(e.headline,'Results posted (PDF)');
  assert.equal(e.recap_url,PDF);
  assert.deepEqual(e.results.map(line),['Results | Midwest Timing & Results | Posted (PDF)']);
});

// Never posted: a state meet the school qualified for reads as run.
pages.set(`${MIDWEST_TIMING_RESULTS}2026`,listing);
await at('2026-11-02T15:00:00Z',async t=>{
  const e=(await feed(t)).results.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.headline,'No results posted');
});

console.log('midwest-timing-xc: ok');
