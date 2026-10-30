// Cross country on MileSplit Live (milesplit.live; user, October 29: "So
// create the raider to read it", then "Can we fill in other cross country
// meets from milesplit now? Can we add other state of Kansas schools that are
// going to be timed at this meet?"). Fixture: MileSplit's Firestore answers
// to the reader's own reads on October 29, 2026, by URL (and query): the 2025
// KSHSAA 3A/5A/6A state meet (698496, replayed as the 2026 meet 787763) and
// the 2026 days of the Riley County Invitational (Oct 10), the Baldwin and
// Junction City meets (Oct 3) and the Rim Rock Classic (Sep 26).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {firestoreDocs,firestoreQuery,milesplitMeetFor,milesplitTeamCode,milesplitTeamNames,milesplitVarsityRaces,milesplitRaceName,MILESPLIT_LIVE_ROOT,MIDWEST_TIMING_RESULTS} from '../src/high-school.mjs';
import {manhattanKsSchool} from '../src/schools/manhattan-ks.mjs';
import {RILEY_POTTAWATOMIE_HIGH_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const recorded=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/milesplit-live/milesplit-live-2026-10-29.json.gz',import.meta.url))).toString('utf8'));
const answer=(test)=>JSON.parse(Object.entries(recorded).find(([k])=>test(k))[1].text);
const day=date=>firestoreDocs(answer(k=>k.includes('"collectionId":"meets"')&&k.includes(`"stringValue":"${date}"`)));
const events=meet=>firestoreDocs(answer(k=>k.includes(`/meets/${meet}/events?`)));

// Queries: equality filters, a list as IN, the fields returned.
assert.deepEqual(JSON.parse(firestoreQuery('entries',{event:5},['result.place'],10)),{structuredQuery:{from:[{collectionId:'entries'}],where:{fieldFilter:{field:{fieldPath:'event'},op:'EQUAL',value:{integerValue:'5'}}},select:{fields:[{fieldPath:'result.place'}]},limit:10}});
assert.equal(JSON.parse(firestoreQuery('entries',{'athlete.team.name':['A','B']},['event'])).structuredQuery.where.fieldFilter.op,'IN');

// Schools by MileSplit team id: Randolph's Blue Valley (36605) is not
// Stilwell's Blue Valley High School (19036); runners' names are cut to 30
// characters or drop "High School".
{
  const riley=day('2026-10-10').find(m=>m.id==='780908');
  const bv=milesplitTeamCode(riley,36605);
  assert.deepEqual([bv.code,bv.name],['BVLY','Randolph Blue Valley High School']);
  assert.ok(bv.others.includes('Riley County High School')&&!bv.others.includes(bv.name));
  assert.equal(milesplitTeamCode(riley,19036),null);
  assert.deepEqual(milesplitTeamNames('Randolph Blue Valley High School'),['Randolph Blue Valley High School','Randolph Blue Valley High Scho','Randolph Blue Valley']);
}

// The day's meet the calendar entry names: by name, venue or city; a
// regional is a sub-state; none when nothing matches.
{
  const oct10=day('2026-10-10'),oct3=day('2026-10-03');
  assert.equal(milesplitMeetFor(oct10,21857,'Riley County Invitational').id,'780908');
  assert.equal(milesplitMeetFor(oct10,36605,'Riley County Meet at Riley County').id,'780908');
  assert.equal(milesplitMeetFor(oct10,21783,'Haskell Invite'),null,'Manhattan ran at Salina that day too, not the Haskell Invite');
  assert.deepEqual([milesplitMeetFor(oct3,21783,'Baldwin Invite')].map(m=>[m.id,m.meet,m.timer]),[['775245','Maple Leaf XC Classic','Ticker Timing']]);
  const jc=milesplitMeetFor(oct3,25986,'Junction City');
  assert.deepEqual([jc.id,jc.code,jc.name],['772766','FHCH','Flinthills Christian High School']);
  // A short name another team of the meet shortens to is not used.
  assert.deepEqual(milesplitTeamNames('Wamego Middle School',['Wamego High School']),['Wamego Middle School','Wamego MS']);
  assert.equal(milesplitMeetFor([{id:'1',name:'KSHSAA 6A Sub-State Manhattan',season:'CC',venue:{city:'Manhattan',name:'Manhattan - Warner Park'},teams:{MANH:{id:'21783'}}}],21783,'Regional Meet - WARNER PARK').id,'1');
  assert.equal(milesplitMeetFor([{id:'1',name:'KSHSAA 4A Sub-State Baldwin',season:'CC',venue:{city:'Baldwin City'},teams:{WAME:{id:'21804'}}}],21804,'KSHSAA Regionals').id,'1');
  assert.equal(milesplitMeetFor([{id:'1',name:'Riley County Invitational',season:'Outdoor',teams:{RILE:{id:'21857'}}}],21857,'Riley County Invitational'),null,'track meets are not cross country');
}

// Varsity races only: the JV, C team, grade and combined results are left
// out; two races both named "5k Run" (Ticker Timing): the first run.
{
  const pick=(meet,list)=>milesplitVarsityRaces(events(meet),list.map(n=>({event:String(n)}))).map(e=>[e.number,milesplitRaceName(e)]);
  assert.deepEqual(pick('770421',[1,3,4,9,10,11,13]),[['3','Girls Gold 5k'],['4','Boys Gold 5k']]);
  assert.deepEqual(pick('775245',[1,2,3,4]),[['2','Girls 5k Run'],['1','Boys 5k Run']]);
  assert.deepEqual(pick('775245',[3,4]),[['4','Girls 5k Run'],['3','Boys 5k Run']]);
  assert.deepEqual(pick('780908',[1,2,3,4,31,32,41,42]),[['41','Girls 5k Run'],['42','Boys 5k Run']]);
  assert.equal(milesplitRaceName({name:'• 5 Kilometers (3.11 Miles)',gender:{sex:'F'}}),'Girls 5 Kilometers');
  assert.equal(milesplitRaceName({name:'6A Girls 5k Run (6A)',gender:{sex:'F'}}),'6A Girls 5k Run');
}

// Modules: each high school's MileSplit team id; the state meets of the
// schools that qualified at their sub-states (top three teams, top 15
// runners), with KSHSAA's race times and Midwest Timing's site rows.
{
  const xc=id=>[manhattanKsSchool,...RILEY_POTTAWATOMIE_HIGH_SCHOOLS].find(s=>s.id===id||(id==='manhattan-ks'&&s===manhattanKsSchool)).sports['Cross Country'][0].milesplit?.team;
  assert.deepEqual(['manhattan-ks','riley-county-ks','blue-valley-randolph-ks','wamego-ks','rock-creek-ks','st-marys-ks','onaga-ks','flint-hills-christian-ks','st-marys-academy-ks'].map(xc),[21783,21857,36605,21804,21882,25984,22005,25986,41084]);
  const state=Object.fromEntries(RILEY_POTTAWATOMIE_HIGH_SCHOOLS.filter(s=>s.midwestTiming).map(s=>[s.id,s.midwestTiming.map(m=>[m.name,m.milesplit,m.site,m.races.map(r=>`${r.label} ${r.time}`).join(', ')])]));
  assert.deepEqual(state,{
    'riley-county-ks':[['KSHSAA 3A State Championship',787763,'Rim Rock Farm, Lawrence','Girls 11:10, Boys 12:55']],
    'blue-valley-randolph-ks':[['KSHSAA 1A State Championship',787762,'Wamego Country Club, Wamego','Girls 11:10, Boys 12:55']],
    'wamego-ks':[['KSHSAA 4A State Championship',787762,'Wamego Country Club, Wamego','Girls 10:00, Boys 11:45']],
    'rock-creek-ks':[['KSHSAA 4A State Championship',787762,'Wamego Country Club, Wamego','Girls 10:00, Boys 11:45']],
    'onaga-ks':[['KSHSAA 1A State Championship',787762,'Wamego Country Club, Wamego','Boys 12:55']]});
  const wamego=RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(s=>s.id==='wamego-ks').midwestTiming[0];
  assert.ok(wamego.place.test('Wamego, KS')&&!wamego.place.test('Lawrence, KS'));
  assert.equal(wamego.live,'https://milesplit.live/meets/787762');
  const [manhattan]=manhattanKsSchool.midwestTiming;
  assert.deepEqual([manhattan.milesplit,manhattan.live],[787763,'https://milesplit.live/meets/787763']);
}

// The Worker, from the fixture only. A read is its URL, and a query's body.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const CALENDAR=`${manhattanKsSchool.calendar.url}?start_date=2026-07-01&end_date=2027-06-30`;
const pages=new Map([[CALENDAR,read('./fixtures/midwest-timing/mhs-calendar-xc-2026-10-29.json')],[`${MIDWEST_TIMING_RESULTS}2026`,gunzipSync(readFileSync(new URL('./fixtures/midwest-timing/results-2026-2026-10-29.html.gz',import.meta.url))).toString('utf8')]]);
const replay=(edit=(key,text)=>text)=>{for(const [key,{text}] of Object.entries(recorded)){const k=key.replace('/meets/698496','/meets/787763');pages.set(k,edit(k,text));}};
replay();
const requests=[];
const fetch=async(url,init={})=>{
  const key=init.body?`${url}#${init.body}`:String(url);requests.push(key);
  let body=pages.get(key);if(body==null&&/gobound\.com/.test(key))body='[]';
  if(body==null)return{ok:false,status:404,url:String(url),headers:new Headers(),text:async()=>''};
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':/\.json|calendars|firestore/.test(key)?'application/json':'text/html'}),text:async()=>body,json:async()=>JSON.parse(body)};
};
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {milesplitLiveResultsFor,meetProReader,fetchLive,groupEvents,MEETPRO_LIVE_TTL}')(...Object.values(deps));
const school=id=>schools.find(s=>s.id===id);
const line=r=>`${r.group} | ${r.participant} | ${r.result}`;
const card=(id,team,date,name,extra={})=>worker.milesplitLiveResultsFor(school(id),{team,...extra},{date,name},worker.meetProReader());

// Meets found by day: team place (the table that scores the school), every
// varsity runner, the field; the timer named.
{
  const riley=await card('riley-county-ks',21857,'2026-10-10','Riley County Invitational');
  assert.equal(riley.headline,'Girls 3rd of 7 · Boys 3rd of 13');
  assert.deepEqual(riley.rows.slice(0,2).map(line),['Girls | Riley County team | 3rd of 7 · 109 pts','Girls | Kinley Henle (FR) | 4th of 58 · 21:10.18']);
  assert.deepEqual([riley.url,riley.label,riley.source_name,riley.note],['https://milesplit.live/meets/780908','View full results (MileSplit Live)','Midwest Timing & Results (MileSplit Live)','Results as posted by Midwest Timing & Results on MileSplit Live.']);
  // Blue Valley (Randolph): four runners, no team score.
  const bv=await card('blue-valley-randolph-ks',36605,'2026-10-10','Riley County Meet at Riley County');
  assert.equal(bv.headline,'4 runners');
  assert.deepEqual(bv.rows.map(line).slice(0,2),['Girls | Samantha Gibson (FR) | 56th of 58 · 28:56.98','Boys | Kory Fowler (SO) | 39th of 85 · 19:58.69']);
  assert.equal(await card('manhattan-ks',21783,'2026-10-10','Haskell Invite'),null);
  // Ticker Timing's "5k Run" races; a MeetPro meet whose runners carry another code.
  const baldwin=await card('manhattan-ks',21783,'2026-10-03','Baldwin Invite');
  assert.equal(baldwin.headline,'Girls 1st of 9 · Boys 1st of 12');
  assert.deepEqual(baldwin.rows.slice(0,2).map(line),['Girls | Manhattan team | 1st of 9 · 28 pts','Girls | Gabrielle Converse (SR) | 1st of 87 · 17:57.00']);
  const fhc=await card('flint-hills-christian-ks',25986,'2026-10-03','Junction City');
  assert.equal(fhc.headline,'Girls 5th of 6 · Boys 7th of 7');
  assert.equal(fhc.source_name,'LetsGoRun Timing (MileSplit Live)');
  // Rim Rock: Manhattan's table of 25 (beside an empty one).
  const rim=await card('manhattan-ks',21783,'2026-09-26','Rim Rock');
  assert.equal(rim.headline,'Girls 1st of 25 · Boys 7th of 29');
  assert.equal(rim.rows.length,2+7+7);
  // No team score on MileSplit: the team place entered on Bound.
  pages.forEach((v,k)=>{if(k.includes('/meets/770421:runQuery')&&k.includes('teamScores'))pages.set(k,'[]');});
  const bound=await card('manhattan-ks',21783,'2026-09-26','Rim Rock',{teamPlaces:{Girls:{place:1,teams:10,score:90}}});
  assert.equal(bound.headline,'Girls 1st of 10');
  assert.equal(bound.note,'Results as posted by Midwest Timing & Results on MileSplit Live; team places as entered on Bound by the school.');
  replay();
}

// Middle schools (user, October 30: "Let's do the middle schools"): every
// race the school ran, both grades; a race run by girls and boys together is
// read as two by the runners' sex, the whole race's places, the team table
// of that sex; the grade from the division ("• 2 Miles", "7th Grade"); an
// entry that names nothing takes the day's only meet with the school.
{
  const mixed=[{number:'1',name:'7th Grade Two Mile ',gender:{sex:'C'}},{number:'2',name:'8th Grade Two Mile ',gender:{sex:'C'}},{number:'3',name:'High School Girls',gender:{sex:'F'}},{number:'9',name:'Girls Blue (Combined)',gender:{sex:'F'}}];
  const ran=[{event:'1',athlete:{sex:'m'}},{event:'2',athlete:{sex:'f'}},{event:'2',athlete:{sex:'m'}},{event:'3',athlete:{sex:'f'}},{event:'9',athlete:{sex:'f'}}];
  const {milesplitMiddleSchoolRaces}=await import('../src/high-school.mjs');
  assert.deepEqual(milesplitMiddleSchoolRaces(mixed,ran).map(e=>[e.number,milesplitRaceName(e)]),[['1','Boys 7th Grade Two Mile'],['2','Girls 8th Grade Two Mile'],['2','Boys 8th Grade Two Mile']]);
  assert.equal(milesplitRaceName({name:'• 2 Miles (3.22 Kilometers)',gender:{sex:'F'},division:{name:'7th Grade'}}),'Girls 7th Grade 2 Miles');
  assert.deepEqual(milesplitTeamNames('Eisenhower Middle School'),['Eisenhower Middle School','Eisenhower','Eisenhower MS']);
  assert.equal(milesplitMeetFor(day('2026-09-18'),40690,'Home event').id,'772781');
  assert.equal(milesplitMeetFor(day('2026-09-18'),40690,'Clay Center'),null);
  const wamego=await card('wamego-ms-ks',39314,'2026-10-15','MS XC',{middle:true});
  assert.equal(wamego.headline,'8th Girls 3rd of 4 · 8th Boys 2nd of 5');
  assert.deepEqual(wamego.rows.slice(0,2).map(line),['7th Girls | Ashlynn Hermesch | 36th of 55 · 16:02.64','7th Boys | Eli Jager | 2nd of 55 · 12:30.42']);
  assert.deepEqual(wamego.rows.slice(8,10).map(line),['8th Girls | Wamego team | 3rd of 4 · 41 pts','8th Girls | Myla McMurray | 18th of 62 · 13:07.48']);
  const anthony=await card('anthony-ms-ks',40691,'2026-09-22','McPherson- Wall Park',{middle:true});
  assert.equal(anthony.headline,'7th Girls 1st of 3 · 7th Boys 1st of 4 · 8th Boys 1st of 2');
  const eisenhower=await card('eisenhower-ms-ks',40690,'2026-09-18','Home event',{middle:true});
  assert.equal(eisenhower.headline,'21 runners');
  assert.equal(eisenhower.rows[0].group,'7th Girls');
  // A high school reads only its varsity races at the same meet.
  assert.equal(await card('wamego-ms-ks',39314,'2026-10-15','MS XC'),null);
  // Randolph's middle schoolers run the grade races under the high school's
  // code: the middle school takes them (`also`), the high school does not.
  const bvms=await card('blue-valley-randolph-ms-ks',41984,'2026-09-03','Abilene Meet at Great Life Golf & Fitness',{middle:true,also:[36605]});
  assert.deepEqual(bvms.rows.map(r=>r.group),['7th Girls','7th Boys','7th Boys','8th Girls','8th Boys']);
  const bvhs=await card('blue-valley-randolph-ks',36605,'2026-09-03','Abilene Meet at Great Life Golf & Fitness');
  assert.deepEqual(bvhs.rows.map(r=>r.group),['Girls','Girls','Boys','Boys','Boys']);
  assert.equal(await card('blue-valley-randolph-ms-ks',41984,'2026-09-03','Abilene Meet at Great Life Golf & Fitness',{middle:true}),null);
}

// Manhattan's state meet (the 2025 documents as the 2026 meet), in the feed.
const RealDate=Date;
const at=async(iso,fn)=>{const t=new RealDate(iso);globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[t.getTime()]))}static now(){return t.getTime()}};try{return await fn(t)}finally{globalThis.Date=RealDate;}};
const feed=t=>worker.fetchLive('manhattan-ks','Cross Country').then(r=>{assert.equal(r.error,null);return worker.groupEvents(r.events,t);});
const stateDay=group=>[...group.live,...group.upcoming,...group.results].find(x=>x.start_time.startsWith('2026-10-31'));
const state={...manhattanKsSchool.midwestTiming[0]},config={team:21783,meet:state.milesplit};

// Before the meet: the card links the public live page; nothing is read.
await at('2026-10-29T18:00:00Z',async t=>{
  const e=stateDay((await feed(t))[0]);
  assert.equal(e.recap_url,'https://milesplit.live/meets/787763');
  assert.equal(e.recap_label,'Live results (MileSplit Live)');
  assert.ok(!requests.some(u=>u.includes('/meets/787763')),'nothing read before the day');
});

// Meet day, the meet not set up yet: the race times stay.
const saved=new Map(pages);
for(const k of [...pages.keys()])if(k.includes('/meets/787763'))pages.delete(k);
await at('2026-10-31T14:00:00Z',async t=>{
  assert.equal(await worker.milesplitLiveResultsFor(school('manhattan-ks'),config,{date:state.date},worker.meetProReader(),true),null);
  const e=stateDay((await feed(t))[0]);
  assert.equal(e.status,'Today');
  assert.deepEqual(e.results.map(line),['Rim Rock Farm, Lawrence | Girls race | 10:00 AM','Rim Rock Farm, Lawrence | Boys race | 11:45 AM']);
});

// Live: the girls' race run, the boys' not started (no places, no team
// scores). Everything is read again after a minute; the latest finishers first.
replay((key,text)=>{
  if(!key.includes('/meets/787763:runQuery'))return text;
  if(key.includes('"collectionId":"teamScores"')&&key.includes('"integerValue":"5"'))return'[]';
  if(!key.includes('"collectionId":"entries"'))return text;
  // The boys' runners, and the boys' race's places (a query on race 5).
  const race5=key.includes('"fieldPath":"event"},"op":"EQUAL","value":{"integerValue":"5"}');
  const rows=JSON.parse(text);for(const r of rows)if(race5||r.document?.fields?.event?.integerValue==='5')delete r.document?.fields?.result;return JSON.stringify(rows);
});
await at('2026-10-31T16:30:00Z',async t=>{
  const ttls=[],base=worker.meetProReader(),readAt=(url,ttl,body)=>{ttls.push(ttl);return base(url,ttl,body);};
  const r=await worker.milesplitLiveResultsFor(school('manhattan-ks'),config,{date:state.date},readAt,true);
  assert.ok(ttls.length>=7&&ttls.every(ttl=>ttl===worker.MEETPRO_LIVE_TTL),'every read again after a minute');
  assert.equal(r.live,true);
  assert.equal(r.live_label,'Girls: 97 finished · Boys: not started');
  assert.equal(r.headline,'Girls 1st of 12');
  assert.deepEqual(r.latest.slice(0,2).map(line),['Girls | Valeria Villoria | 56th of 97 · 20:41.48','Girls | Allison Knopp (FR) | 52nd of 97 · 20:33.82']);
  const [group]=await feed(t);
  assert.equal(group.live.length,1);
  const [e]=group.live;
  assert.deepEqual([e.status,e.meet_live,e.recap_url,e.live_score_source],['Live',true,'https://milesplit.live/meets/787763','Midwest Timing & Results (MileSplit Live)']);
  assert.equal(e.recency_label,'Girls: 97 finished · Boys: not started');
});

// Final, a day later: both races, before the timer's PDF.
replay();
await at('2026-11-01T15:00:00Z',async t=>{
  const r=await worker.milesplitLiveResultsFor(school('manhattan-ks'),config,{date:state.date},worker.meetProReader());
  assert.equal(r.headline,'Girls 1st of 12 · Boys 7th of 12');
  assert.deepEqual(r.rows.slice(0,2).map(line),['Girls | Manhattan team | 1st of 12 · 61 pts','Girls | Gabrielle Converse (JR) | 3rd of 97 · 18:51.49']);
  assert.equal(r.highlights[0],'Girls: Manhattan won the team title with 61 points; Gabrielle Converse led Manhattan in 3rd (18:51.49).');
  const e=(await feed(t))[0].results.find(x=>x.start_time.startsWith('2026-10-31'));
  assert.equal(e.status,'Final');
  assert.equal(e.headline,'Girls 1st of 12 · Boys 7th of 12');
  assert.equal(e.recap_url,'https://milesplit.live/meets/787763');
  assert.equal(e.meet_results_verified,true);
  assert.equal(e.results.length,16);
});
assert.ok(saved.size>0);

console.log('milesplit-live-xc: ok');
