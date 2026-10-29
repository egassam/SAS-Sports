// The four KAS state cross country teams added October 29, 2026 (Christ
// Prep, Veritas Christian, Kickapoo Nation, KC Metro Academy): MaxPreps is
// their only schedule. Fixtures are the MaxPreps pages of October 29.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {maxprepsContests} from '../src/high-school.mjs';
import {KAS_KS_HIGH_SCHOOLS,christPrepKsSchool} from '../src/schools/kas-ks.mjs';
import {LETSGORUN_MEETPRO} from '../src/schools/manhattan-ks.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gz=path=>gunzipSync(readFileSync(new URL(path,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));

// Catalog: Kansas high schools in their counties, each with a theme, the
// sports its module reads, a MaxPreps id and the state meet.
const counties={'christ-prep-ks':'Johnson County','veritas-christian-ks':'Douglas County','kickapoo-nation-ks':'Brown County','kc-metro-academy-ks':'Johnson County'};
assert.deepEqual(KAS_KS_HIGH_SCHOOLS.map(m=>m.id),Object.keys(counties));
const meet=LETSGORUN_MEETPRO.athleticLive[0];
for(const m of KAS_KS_HIGH_SCHOOLS){
  const s=schools.find(x=>x.id===m.id);assert.ok(s,m.id);
  assert.deepEqual([s.state,s.county,s.level],['Kansas',counties[m.id],'high-school'],m.id);assert.ok(s.city,m.id);
  assert.ok(themes[m.id],m.id);
  assert.deepEqual(sponsoredSports[m.id],Object.keys(m.sports).sort(),m.id);
  assert.ok(!m.calendar&&!m.bound&&/^[0-9a-f-]{36}$/.test(m.maxpreps.schoolId),`${m.id}: a MaxPreps-only school`);
  assert.equal(s.providers.find(p=>p.provider==='MAXPREPS').provider_school_id,m.maxpreps.schoolId,m.id);
  assert.ok(meet.schools[m.id]?.length,`${m.id}: in the KAS state meet`);
  for(const [sport,teams] of Object.entries(m.sports))for(const t of teams)assert.ok(t.maxpreps||sport==='Cross Country',`${m.id} ${sport}: a MaxPreps team`);
}

// MaxPreps team rows give home/away (0 home, 1 away, 2 neutral); it agrees
// with the game summaries ("the Christ Prep Academy ... won their away game").
const cpVolleyball=gz('./fixtures/kas-ks/maxpreps-christ-prep-ks-volleyball-2026-10-29.html.gz');
const contests=maxprepsContests(cpVolleyball,christPrepKsSchool.maxpreps.schoolId);
for(const c of contests.filter(c=>c.summary)){
  const m=c.summary.match(/^On [\d/]+, the (.+?) varsity .*?\btheir (home|away|neutral)\b/);
  const ours=m[1]==='Christ Prep Academy',side=m[2]==='neutral'?'NEUTRAL':(m[2]==='away')===ours?'AWAY':'HOME';
  assert.equal(c.site,side,`${c.date} ${c.opponent}`);
}
const manhattan=maxprepsContests(read('./fixtures/manhattan-ks-module/maxpreps-football-schedule.html'),'41006ce9-cfb3-492a-a951-d320637bc985');
assert.deepEqual(manhattan.filter(c=>['2026-09-11','2026-09-25'].includes(c.date)).map(c=>`${c.opponent} ${c.site}`),['Mill Valley AWAY','North HOME']);

// The Worker on the saved pages, on October 29 in Kansas.
const pages=new Map([
  ['https://www.maxpreps.com/ks/lenexa/christ-prep-academy-patriots/volleyball/schedule/',cpVolleyball],
  ['https://www.maxpreps.com/ks/lenexa/christ-prep-academy-patriots/football/schedule/',gz('./fixtures/kas-ks/maxpreps-christ-prep-ks-football-2026-10-29.html.gz')],
  ['https://www.maxpreps.com/ks/shawnee-mission/metro-academy-mavericks/volleyball/schedule/',gz('./fixtures/kas-ks/maxpreps-kc-metro-academy-ks-volleyball-2026-10-29.html.gz')]
]);
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const fetch=async url=>{const key=String(url),body=pages.get(key);if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>''};return{ok:true,status:200,url:key,headers:new Headers({'content-type':'text/html'}),text:async()=>body};};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents}')(...Object.values(deps));
const RealDate=Date,at=new RealDate('2026-10-29T17:00:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
try{
  const vb=await worker.fetchLive('christ-prep-ks','Volleyball');
  assert.equal(vb.error,null);
  const line=e=>`${e.start_time.slice(0,10)} ${e.status} ${e.title}${e.headline?` | ${e.headline}`:''}`;
  const all=vb.events.map(line).sort();
  assert.equal(all.length,14,'every match on MaxPreps');
  assert.ok(all.includes('2026-09-05 Final Christ Prep at Center Place | W, 2-0'),'an away final reads "at"');
  assert.ok(all.includes('2026-09-03 Final Christ Prep vs Summit Christian Academy | L, 1-3'),'a home final reads "vs"');
  assert.ok(all.includes('2026-09-10 Final Christ Prep at Barstow | No score posted'),'played with no score (AGENTS.md 5c)');
  const fb=await worker.fetchLive('christ-prep-ks','Football');
  const coming=fb.events.filter(e=>e.status==='Upcoming').map(e=>`${e.title} ${e.display_time}`);
  assert.deepEqual(coming,["Christ Prep at St. Mary's Academy Oct 31, 2:30 PM"],'the coming game; playoff slots with no opponent are not listed');
  assert.equal(fb.events.filter(e=>e.status==='Final'&&e.school_score!=null).length,8);
  assert.equal(fb.events.find(e=>e.status==='Upcoming').source.name,'MaxPreps (team schedule)');
  const metro=await worker.fetchLive('kc-metro-academy-ks','Volleyball');
  assert.equal(metro.error,null);assert.equal(metro.events.length,4);
  // A failed MaxPreps read is a failed build (no schedule at all), not an empty one.
  const veritas=await worker.fetchLive('veritas-christian-ks','Volleyball');
  assert.ok(veritas.scores_missing||veritas.error,'Veritas volleyball (no page saved) is marked');
}finally{globalThis.Date=RealDate;}
console.log('KAS schools (MaxPreps-only) checks passed');
