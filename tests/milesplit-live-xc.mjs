// Cross country on MileSplit Live (milesplit.live/meets/<id>; user, October
// 29: "If that database that they publish is going to be the live that
// anybody can see then it's perfectly fine. So create the raider to read
// it"). Fixture: the 2025 KSHSAA 3A/5A/6A state meet (698496), as its
// Firestore documents answered the reader's own URLs on October 29, 2026
// (the meet, its races, its runners in three pages, and the team scores of
// Manhattan's two races). Replayed below as the 2026 meet (787763).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {firestoreDocs,milesplitLiveXcRaces,milesplitLiveRace,MILESPLIT_LIVE_DOCS,MIDWEST_TIMING_RESULTS} from '../src/high-school.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const docs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/milesplit-live/kshsaa-state-xc-2025-698496.json.gz',import.meta.url))).toString('utf8'));
const doc=prefix=>Object.entries(docs).filter(([k])=>k.startsWith(prefix)).map(([,v])=>JSON.parse(v));

// The documents: Manhattan's two 6A races, team place and every finisher.
{
  const events=firestoreDocs(doc('698496/events')[0]),entries=doc('698496/entries').flatMap(firestoreDocs),scores=doc('698496/teamScores').map(d=>firestoreDocs({documents:[d]})[0]);
  assert.deepEqual(events.map(e=>milesplitLiveRace(e.name)),['3A Boys 5k Run','6A Girls 5k Run','5A Boys 5k Run','3A Girls 5k Run','6A Boys 5k Run','5A Girls 5k Run']);
  assert.equal(entries.length,794);
  // A runner repeated across two pages counts once.
  assert.equal(milesplitLiveXcRaces(events,[...entries,...entries.filter(e=>String(e.event)==='2')],scores,['Manhattan High School'])[0].field,97);
  const races=milesplitLiveXcRaces(events,entries,scores,['Manhattan High School']);
  assert.deepEqual(races.map(r=>[r.race,r.team,r.teams,r.field,r.runners.length,r.entered]),[['6A Girls 5k Run',{place:1,team:'Manhattan',score:'61'},12,97,7,10],['6A Boys 5k Run',{place:7,team:'Manhattan',score:'166'},12,105,7,10]]);
  assert.deepEqual(races[0].runners.slice(0,2),[{place:3,athlete:'Gabrielle Converse',year:'JR',team:'Manhattan',time:'18:51.49'},{place:7,athlete:'Zara Koehn',year:'FR',team:'Manhattan',time:'19:07.94'}]);
  assert.equal(races[1].runners[0].year,'','no grade entered');
  // No team scores yet: runners only. Another school; no documents.
  assert.equal(milesplitLiveXcRaces(events,entries,[],['Manhattan High School'])[0].team,null);
  assert.deepEqual(milesplitLiveXcRaces(events,entries,scores,['Free State High School']).map(r=>r.race),['6A Girls 5k Run','6A Boys 5k Run']);
  assert.deepEqual(milesplitLiveXcRaces(events,entries,scores,['Nowhere High School']),[]);
  assert.deepEqual(firestoreDocs(null),[]);
}

// Manhattan's state meet in the module: the 2026 meet on MileSplit Live.
const [state]=manhattanKsSchool.midwestTiming;
assert.equal(state.milesplit,787763);
assert.equal(state.live,'https://milesplit.live/meets/787763');

// The Worker, from fixtures only: the 2025 documents under the 2026 meet.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const CALENDAR=`${manhattanKsSchool.calendar.url}?start_date=2026-07-01&end_date=2027-06-30`;
const pages=new Map([[CALENDAR,read('./fixtures/midwest-timing/mhs-calendar-xc-2026-10-29.json')],[`${MIDWEST_TIMING_RESULTS}2026`,gunzipSync(readFileSync(new URL('./fixtures/midwest-timing/results-2026-2026-10-29.html.gz',import.meta.url))).toString('utf8')]]);
const asMeet=(id,edit=(path,body)=>body)=>{for(const [path,body] of Object.entries(docs))pages.set(`${MILESPLIT_LIVE_DOCS}${path.replace(/^698496/,id)}`,edit(path,body));};
const requests=[];
const fetch=async url=>{
  const key=String(url);requests.push(key);
  let body=pages.get(key);if(body==null&&/gobound\.com/.test(key))body='[]';
  if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>''};
  return{ok:true,status:200,url:key,headers:new Headers({'content-type':/\.json|calendars|firestore/.test(key)?'application/json':'text/html'}),text:async()=>body,json:async()=>JSON.parse(body)};
};
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {milesplitLiveResultsFor,meetProReader,fetchLive,groupEvents,MEETPRO_LIVE_TTL}')(...Object.values(deps));
const school=schools.find(s=>s.id==='manhattan-ks');
const line=r=>`${r.group} | ${r.participant} | ${r.result}`;
const RealDate=Date;
const at=async(iso,fn)=>{const t=new RealDate(iso);globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[t.getTime()]))}static now(){return t.getTime()}};try{return await fn(t)}finally{globalThis.Date=RealDate;}};
const feed=t=>worker.fetchLive('manhattan-ks','Cross Country').then(r=>{assert.equal(r.error,null);return worker.groupEvents(r.events,t);})
const day=group=>[...group.live,...group.upcoming,...group.results].find(x=>x.start_time.startsWith('2026-10-31'));

// Before the meet: the card links the public live page; nothing is read.
await at('2026-10-29T18:00:00Z',async t=>{
  const [group]=await feed(t),e=day(group);
  assert.equal(e.recap_url,'https://milesplit.live/meets/787763');
  assert.equal(e.recap_label,'Live results (MileSplit Live)');
  assert.ok(!requests.some(u=>u.startsWith(MILESPLIT_LIVE_DOCS)),'nothing read before the day');
});

// Meet day, the meet not set up on MileSplit Live yet: one read, the race
// times stay.
await at('2026-10-31T14:00:00Z',async t=>{
  assert.equal(await worker.milesplitLiveResultsFor(school,state,{date:state.date},worker.meetProReader(),true),null);
  const e=day((await feed(t))[0]);
  assert.equal(e.status,'Today');
  assert.deepEqual(e.results.map(line),['Rim Rock Farm, Lawrence | Girls race | 10:00 AM','Rim Rock Farm, Lawrence | Boys race | 11:45 AM']);
});

// Live: the girls' race run, the boys' not started (no places, no team
// scores). Everything is read again after a minute; the school's latest
// finishers come first.
asMeet('787763',(path,body)=>{
  if(path.startsWith('698496/teamScores/6_M'))return null;
  if(!path.startsWith('698496/entries'))return body;
  const json=JSON.parse(body);for(const d of json.documents||[])if(d.fields.event.integerValue==='5')delete d.fields.result;return JSON.stringify(json);
});
for(const [k,v] of pages)if(v==null)pages.delete(k);
await at('2026-10-31T16:30:00Z',async t=>{
  const ttls=[],base=worker.meetProReader(),readAt=(url,ttl)=>{ttls.push([url,ttl]);return base(url,ttl);};
  const r=await worker.milesplitLiveResultsFor(school,state,{date:state.date},readAt,true);
  assert.equal(ttls.length,2+3+2);
  assert.ok(ttls.every(([,ttl])=>ttl===worker.MEETPRO_LIVE_TTL),'every document is read again after a minute');
  assert.equal(r.live,true);
  assert.equal(r.live_label,'Girls: 97 finished · Boys: not started');
  assert.equal(r.headline,'Girls 1st of 12');
  assert.equal(r.url,'https://milesplit.live/meets/787763');
  assert.deepEqual(r.latest.slice(0,2).map(line),['Girls | Valeria Villoria | 56th of 97 · 20:41.48','Girls | Allison Knopp (FR) | 52nd of 97 · 20:33.82']);
  const [group]=await feed(t);
  assert.equal(group.live.length,1);
  const [e]=group.live;
  assert.deepEqual([e.status,e.meet_live,e.recap_url,e.live_score_source],['Live',true,'https://milesplit.live/meets/787763','Midwest Timing & Results (MileSplit Live)']);
  assert.equal(e.recency_label,'Girls: 97 finished · Boys: not started');
});

// Final, a day later: both races, read before the timer's PDF.
asMeet('787763');
await at('2026-11-01T15:00:00Z',async t=>{
  const r=await worker.milesplitLiveResultsFor(school,state,{date:state.date},worker.meetProReader());
  assert.equal(r.headline,'Girls 1st of 12 · Boys 7th of 12');
  assert.equal(r.rows.length,2+7+7);
  assert.deepEqual(r.rows.slice(0,2).map(line),['Girls | Manhattan team | 1st of 12 · 61 pts','Girls | Gabrielle Converse (JR) | 3rd of 97 · 18:51.49']);
  assert.equal(r.highlights[0],'Girls: Manhattan won the team title with 61 points; Gabrielle Converse led Manhattan in 3rd (18:51.49).');
  const e=(await feed(t))[0].results.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.status,'Final');
  assert.equal(e.headline,'Girls 1st of 12 · Boys 7th of 12');
  assert.equal(e.recap_url,'https://milesplit.live/meets/787763');
  assert.equal(e.meet_results_verified,true);
  assert.equal(e.results.length,16);
});

console.log('milesplit-live-xc: ok');
