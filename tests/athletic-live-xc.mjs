// Cross country the timer posts to AthleticLIVE (live.letsgorun.com,
// October 28, 2026): the Kansas Approved Schools state meet, Oct 31, hosted by
// Flint Hills Christian (user: "Results: live.letsgorun.com/meets/79638").
// Fixtures are the real documents read on October 28: the 2025 meet (58501,
// Nov 1, 2025: results and team scores; one girl "NT", not placed) and the 2026 meet (79638: entries,
// no results yet).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {athleticLiveXcRaces,ATHLETIC_LIVE_DOCS,ATHLETIC_LIVE_FIREBASE,athleticLiveFirebaseRaces} from '../src/high-school.mjs';
import {LETSGORUN_MEETPRO} from '../src/schools/manhattan-ks.mjs';
import {flintHillsChristianKsSchool} from '../src/schools/riley-pottawatomie-ks.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const docs=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/athletic-live/letsgorun-kas-state-xc-2025-2026.json.gz',import.meta.url))).toString('utf8'));
const src=path=>docs[path]?._source;

// The configured meet: the user's details.
const [meet]=LETSGORUN_MEETPRO.athleticLive;
assert.deepEqual([meet.date,meet.time,meet.meet,meet.sport,meet.name],['2026-10-31','09:45',79638,'Cross Country','Kansas Approved Schools State X-C Championships']);
assert.deepEqual(Object.keys(meet.schools),['flint-hills-christian-ks','st-marys-academy-ks','christ-prep-ks','veritas-christian-ks','kc-metro-academy-ks','kickapoo-nation-ks']);
assert.deepEqual(src('live_results_meet_list/_doc/79638').xcp.map(r=>r.n),['Boys 5000 Meters','Girls 5000 Meters','Kids 1 Mile Run']);

// The parser: the 2025 meet, the school's runners and team place.
{
  const info=src('live_results_meet_list/_doc/58501');
  const races=info.xcp.map(r=>({results:src(`ind_res_list/_doc/${r.i}`),score:src(`xc_score_report/_doc/xcSR%7C${r.i}`)}));
  const fhc=athleticLiveXcRaces(info,races,['Flint Hills Christian']);
  assert.deepEqual(fhc.map(r=>[r.race,r.team.place,r.team.score,r.teams,r.runners.length,r.field]),[['Boys 5000 Meter Run',6,'187',7,8,71],['Girls 5000 Meter Run',4,'97',6,7,55]]);
  assert.deepEqual(fhc[0].runners[0],{place:29,athlete:'Jonathan Basel',year:'FR',team:'Flint Hills Christian',time:'19:24.5'});
  assert.equal(fhc[0].runners[1].athlete,"Sam O'Neal");
  // 2025 wrote "St Mary's Academy", 2026 enters "St Mary's"; St. Marys High
  // School (the public school) is not at this meet.
  const sma=athleticLiveXcRaces(info,races,meet.schools['st-marys-academy-ks']);
  assert.deepEqual(sma.map(r=>[r.race,r.team.place,r.team.score,r.runners[0].athlete,r.runners[0].place]),[['Boys 5000 Meter Run',4,'78','Ambrose Childs',1]]);
  // 2026 before the race: entries only.
  const now=src('live_results_meet_list/_doc/79638');
  const entered=athleticLiveXcRaces(now,now.xcp.map(r=>({results:src(`ind_res_list/_doc/${r.i}`),entries:src(`ind_ent_list/_doc/${r.i}`)})),meet.schools['st-marys-academy-ks']);
  assert.deepEqual(entered.map(r=>[r.race,r.runners.length,r.entered,r.entries]),[['Boys 5000 Meters',0,8,83]]);
}

// The Worker's reader, from fixtures only.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const pages=new Map(Object.entries(docs).map(([path,doc])=>[ATHLETIC_LIVE_DOCS+path,JSON.stringify(doc)]));
const requests=[];
const fetch=async url=>{const key=String(url);requests.push(key);let body=pages.get(key);if(body==null&&/gobound\.com/.test(key))body='[]';if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>''};return{ok:true,status:200,url:key,headers:new Headers({'content-type':'application/json'}),text:async()=>body,json:async()=>JSON.parse(body)};};
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {athleticLiveResultsFor,meetProReader,MEETPRO_LIVE_TTL,fetchLive,groupEvents,featuredMeets}')(...Object.values(deps));
const school=id=>schools.find(s=>s.id===id);
const line=r=>`${r.group} | ${r.participant} | ${r.result}`;
const last={...meet,meet:58501,date:'2025-11-01'};

// The four teams added October 29 (src/schools/kas-ks.mjs) read the same
// meet: Christ Prep won both 2025 races; a team with no score lists its runners.
{
  const r=async id=>(await worker.athleticLiveResultsFor(school(id),last,{date:last.date},worker.meetProReader())).headline;
  assert.equal(await r('christ-prep-ks'),'Boys 1st of 7 · Girls 1st of 6');
  assert.equal(await r('kc-metro-academy-ks'),'Girls 6th of 6');
  assert.equal(await r('veritas-christian-ks'),'6 runners');
  assert.equal(await r('kickapoo-nation-ks'),'1 runner');
}
// A finished meet: team places, every runner, the timer's page.
{
  const r=await worker.athleticLiveResultsFor(school('flint-hills-christian-ks'),last,{date:last.date},worker.meetProReader());
  assert.equal(r.url,'https://live.letsgorun.com/meets/58501');
  assert.equal(r.label,'View full results (LetsGoRun Timing)');
  assert.equal(r.headline,'Boys 6th of 7 · Girls 4th of 6');
  assert.equal(r.rows.length,2+8+7);
  assert.deepEqual(r.rows.slice(0,2).map(line),['Boys | Flint Hills Christian team | 6th of 7 · 187 pts','Boys | Jonathan Basel (FR) | 29th of 71 · 19:24.5']);
  assert.ok(r.rows.some(x=>line(x)==='Girls | Kelsey Brent (SO) | 8th of 55 · 21:29.7'));
  assert.deepEqual(r.highlights,['Boys: Flint Hills Christian placed 6th of 7 with 187 points; Jonathan Basel led Flint Hills Christian in 29th (19:24.5).','Girls: Flint Hills Christian placed 4th of 6 with 97 points; Kelsey Brent led Flint Hills Christian in 8th (21:29.7).']);
  assert.equal(r.live,undefined,'not live on a later day');
  const sma=await worker.athleticLiveResultsFor(school('st-marys-academy-ks'),last,{date:last.date},worker.meetProReader());
  assert.equal(sma.headline,'Boys 4th of 7');
  assert.equal(sma.highlights[0],"Boys: St. Mary's Academy placed 4th of 7 with 78 points; Ambrose Childs led St. Mary's Academy in 1st (16:39.1).");
}

// Live: the boys' race half posted, the girls' not started. Every document
// is read again after a minute; the school's latest finishers come first.
const half=()=>{
  const boys=structuredClone(docs['ind_res_list/_doc/2153072']);boys._source.r=boys._source.r.slice(0,45);
  const girls=structuredClone(docs['ind_res_list/_doc/2153073']);girls._source.r=[];
  pages.set(`${ATHLETIC_LIVE_DOCS}ind_res_list/_doc/2153072`,JSON.stringify(boys));pages.set(`${ATHLETIC_LIVE_DOCS}ind_res_list/_doc/2153073`,JSON.stringify(girls));
  pages.delete(`${ATHLETIC_LIVE_DOCS}xc_score_report/_doc/xcSR%7C2153072`);pages.delete(`${ATHLETIC_LIVE_DOCS}xc_score_report/_doc/xcSR%7C2153073`);
};
const restore=()=>{for(const [path,doc] of Object.entries(docs))pages.set(ATHLETIC_LIVE_DOCS+path,JSON.stringify(doc));};
{
  half();
  const ttls=[],base=worker.meetProReader(),read=(url,ttl)=>{ttls.push([url,ttl]);return base(url,ttl);};
  const r=await worker.athleticLiveResultsFor(school('flint-hills-christian-ks'),last,{date:last.date},read,true);
  assert.ok(ttls.length>=7&&ttls.every(([,ttl])=>ttl===worker.MEETPRO_LIVE_TTL),'every document is read again after a minute');
  assert.equal(r.live,true);
  assert.equal(r.live_label,'Boys: 45 of 71 finished · Girls: not started');
  assert.equal(r.headline,'3 runners','no team score until the race is scored');
  assert.deepEqual(r.latest.map(line),['Boys | Thomas Basel (SR) | 45th of 45 · 21:00.5',"Boys | Sam O'Neal (JR) | 42nd of 45 · 20:11.9",'Boys | Jonathan Basel (FR) | 29th of 45 · 19:24.5']);
  restore();
}

// The feed on the meet's day: Flint Hills Christian's sheet lists "KASC
// State" on Oct 31; the meet joins that day (no second card). St. Mary's
// Academy's Bound page leaves it out: the meet is added. Replayed with the
// 2025 documents under the 2026 meet's ids, half run, at 10:30 AM in Kansas.
{
  pages.set(`${flintHillsChristianKsSchool.calendar.url}&start_date=2026-07-01&end_date=2027-06-30`,read('./fixtures/riley-pottawatomie-ks/fhcs-sheet-2026-10-25.csv'));
  half();
  const ids={2153072:2940219,2153073:2940220};
  const info=structuredClone(docs['live_results_meet_list/_doc/79638']);info._source.xcp=info._source.xcp.slice(0,2);
  pages.set(`${ATHLETIC_LIVE_DOCS}live_results_meet_list/_doc/79638`,JSON.stringify(info));
  for(const [from,to] of Object.entries(ids))for(const kind of ['ind_res_list/_doc/','xc_score_report/_doc/xcSR%7C','ind_ent_list/_doc/']){const body=pages.get(`${ATHLETIC_LIVE_DOCS}${kind}${from}`);if(body)pages.set(`${ATHLETIC_LIVE_DOCS}${kind}${to}`,body);else pages.delete(`${ATHLETIC_LIVE_DOCS}${kind}${to}`);}
  const RealDate=Date,at=new RealDate('2026-10-31T15:30:00Z');
  globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
  try{
    const feed=await worker.fetchLive('flint-hills-christian-ks','Cross Country');
    assert.equal(feed.error,null);
    const [group]=worker.groupEvents(feed.events,at);
    assert.equal(group.live.length,1);
    const [e]=group.live;
    assert.deepEqual([e.status,e.title,e.meet_live,e.recap_url,e.live_score_source],['Live','Flint Hills Christian at KASC State',true,'https://live.letsgorun.com/meets/79638','LetsGoRun Timing (AthleticLIVE)']);
    assert.equal(e.recency_label,'Boys: 45 of 71 finished · Girls: not started');
    assert.equal(e.display_time,'Oct 31, 9:45 AM','the meet\'s start, not the sheet\'s 10:00');
    assert.equal(e.live_latest.length,3);
    assert.ok(!group.upcoming.some(x=>x.start_time.startsWith('2026-10-31')),'one card for the day');
    const sma=await worker.fetchLive('st-marys-academy-ks','Cross Country');
    assert.equal(sma.error,null);
    const [g2]=worker.groupEvents(sma.events,at);
    assert.deepEqual(g2.live.map(x=>[x.title,x.display_time]),[["St. Mary's Academy at Kansas Approved Schools State X-C Championships",'Oct 31, 9:45 AM']]);
    assert.equal(g2.live[0].live_latest[0].participant,'Jack McCarthy (SO)');
    // Another school does not get the meet.
    const other=await worker.fetchLive('riley-county-ks','Cross Country');
    assert.ok(!other.events.some(x=>/Approved Schools/.test(x.title)));
  }finally{globalThis.Date=RealDate;restore();}
  // Race day before the first finisher (October 31: the timer's documents
  // hold entries only): the card keeps the start time and the live link.
  {
    for(const to of Object.values(ids)){const doc=JSON.parse(pages.get(`${ATHLETIC_LIVE_DOCS}ind_res_list/_doc/${to}`));doc._source.r=[];pages.set(`${ATHLETIC_LIVE_DOCS}ind_res_list/_doc/${to}`,JSON.stringify(doc));pages.delete(`${ATHLETIC_LIVE_DOCS}xc_score_report/_doc/xcSR%7C${to}`);}
    pages.set(`${ATHLETIC_LIVE_DOCS}live_results_meet_list/_doc/79638`,JSON.stringify(info));
    const early=new RealDate('2026-10-31T14:50:00Z');
    globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[early.getTime()]))}static now(){return early.getTime()}};
    try{
      const feed=await worker.fetchLive('flint-hills-christian-ks','Cross Country');
      const e=feed.events.find(x=>x.start_time.startsWith('2026-10-31'));
      assert.deepEqual([e.status,e.recap_url,e.recap_label],['Today','https://live.letsgorun.com/meets/79638','Live results (LetsGoRun Timing)']);
      assert.deepEqual(e.results.map(line),['Warner Memorial Park, Manhattan | Races begin | 9:45 AM']);
      assert.ok(/as runners finish/.test(e.highlight_status));
    }finally{globalThis.Date=RealDate;restore();}
  }
  // A day later with the full results: Final.
  const after=new RealDate('2026-11-01T15:00:00Z');
  for(const [from,to] of Object.entries(ids))for(const kind of ['ind_res_list/_doc/','xc_score_report/_doc/xcSR%7C'])pages.set(`${ATHLETIC_LIVE_DOCS}${kind}${to}`,pages.get(`${ATHLETIC_LIVE_DOCS}${kind}${from}`));
  pages.set(`${ATHLETIC_LIVE_DOCS}live_results_meet_list/_doc/79638`,JSON.stringify(info));
  globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[after.getTime()]))}static now(){return after.getTime()}};
  try{
    const feed=await worker.fetchLive('flint-hills-christian-ks','Cross Country');
    const [group]=worker.groupEvents(feed.events,after);
    const e=group.results.find(x=>x.start_time.startsWith('2026-10-31'));
    assert.deepEqual([e.status,e.headline,e.meet_live],['Final','Boys 6th of 7 · Girls 4th of 6',undefined]);
  }finally{globalThis.Date=RealDate;restore();}
}
// October 31, 10:27 AM: the girls' race document still held no finishers
// while the timer's live database had 58 (the real documents read then):
// the card goes Live from the database. Flint Hills Christian's seven girls.
{
  const live=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/athletic-live/letsgorun-kas-state-xc-2026-live.json.gz',import.meta.url))).toString('utf8'));
  const fire=athleticLiveFirebaseRaces(live.firebase['meet_79638/liveRunEventList.json'],live.firebase['meet_79638/liveBySplit.json']);
  assert.deepEqual(Object.keys(fire),['2940220']);
  assert.equal(fire['2940220'].results.r.length,58);
  for(const [path,doc] of Object.entries(live.docs))pages.set(ATHLETIC_LIVE_DOCS+path,JSON.stringify(doc));
  for(const [path,doc] of Object.entries(live.firebase))pages.set(ATHLETIC_LIVE_FIREBASE+path,JSON.stringify(doc));
  const RealDate=Date,at=new RealDate('2026-10-31T15:27:00Z');
  globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
  try{
    const feed=await worker.fetchLive('flint-hills-christian-ks','Cross Country');
    assert.equal(feed.error,null);
    const [group]=worker.groupEvents(feed.events,at);
    assert.equal(group.live.length,1,'Live from the timer\'s database');
    const [e]=group.live;
    assert.equal(e.recency_label,'Boys: not started · Girls: 58 of 64 finished');
    assert.deepEqual(e.live_latest.map(line).slice(0,2),['Girls | Evy Ring (JR) | 54th of 58 · 28:39.75','Girls | Julianna Basel (JR) | 53rd of 58 · 28:20.88']);
    assert.ok(e.live_latest.length===5);
    const r=await worker.athleticLiveResultsFor({id:'flint-hills-christian-ks',name:'Flint Hills Christian School'},meet,{date:meet.date},worker.meetProReader(),true);
    assert.ok(r.rows.some(x=>line(x)==='Girls | Kelsey Brent (JR) | 6th of 58 · 20:29.92'));
    // Not on a later day: the race documents alone.
    const later=await worker.athleticLiveResultsFor({id:'flint-hills-christian-ks',name:'Flint Hills Christian School'},meet,{date:meet.date},worker.meetProReader(),false);
    assert.equal(later,null);
    assert.ok(!requests.some(u=>u.startsWith(ATHLETIC_LIVE_FIREBASE)&&!u.endsWith('.json')&&!u.endsWith('robots.txt')),'only .json paths');
  }finally{globalThis.Date=RealDate;restore();}
}
// Home shows the meet to everyone (user, October 28: "Show it on Home even if
// not starred"): /live/now names it from a week before its day through the
// day after.
{
  const at=iso=>worker.featuredMeets(new Date(iso)).map(f=>`${f.school_id}|${f.sport}`);
  const KAS_TEAMS=['flint-hills-christian-ks','st-marys-academy-ks','christ-prep-ks','veritas-christian-ks','kc-metro-academy-ks','kickapoo-nation-ks'].map(id=>`${id}|Cross Country`);
  assert.deepEqual(at('2026-10-28T23:00:00Z'),KAS_TEAMS);
  assert.deepEqual(at('2026-11-01T23:00:00Z'),KAS_TEAMS,'the day after: its results');
  assert.deepEqual(at('2026-10-23T23:00:00Z'),[],'more than a week before');
  assert.deepEqual(at('2026-11-02T06:00:00Z'),[],'two days after');
  assert.ok(read('../src/index.js').includes('featured:featuredMeets(now),'),'/live/now carries the featured meets');
}
console.log('athletic-live-xc: ok');
