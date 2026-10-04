import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers} from '../src/schools/arizona.mjs';
import {baylorSchool,createBaylorHandlers} from '../src/schools/baylor.mjs';
import {cincinnatiSchool,createCincinnatiHandlers} from '../src/schools/cincinnati.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,kansasScheduleData} from '../src/schools/kansas.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>read('./fixtures/kansas-module/'+path);
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kansas'),now=new Date('2026-09-28T12:00:00Z');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
let responses=new Map(),requests=[];
const fetch=async url=>{requests.push(String(url));assert.ok(responses.has(String(url)),`Unexpected network request: ${url}`);return new Response(responses.get(String(url)));};
const deps={createSourceFetch,SOURCE_TTL,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,baylorSchool,createBaylorHandlers,cincinnatiSchool,createCincinnatiHandlers,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {parseHtml,fetchLive,fetchUrl,groupEvents,mergeEvents,attachOfficialHighlights,kansasHandlers,candidateUrls,rosterUrls,featuredAthletes,VERIFIED_TEAM_TAG_INSTAGRAM,KNOWN_URLS};')(...Object.values(deps));
const expectedCounts={'baseball':38,'mens-basketball':36,'womens-basketball':34,'cross-country':6,'football':12,'womens-golf':12,'mens-golf':14,'womens-rowing':9,'wsoc':21,'softball':33,'womens-swimming-and-diving':13,'womens-tennis':8,'track-and-field':34,'wvball':28};
const byPath=new Map();
assert.deepEqual(Object.keys(kansasSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sponsoredSports.kansas].sort());
for(const [key,value] of Object.entries(kansasSchool.scheduleUrls)){
  const sport=key.split('|')[1];
  for(const url of [].concat(value)){
    const path=url.split('/').at(-2),raw=`<script id="__NUXT_DATA__" type="application/json">${fixture(path+'.json')}</script>`;
    responses.set(url,raw);
    const events=worker.parseHtml(raw,school,sport,url,now);
    assert.equal(events.length,expectedCounts[path],`${path} must retain every published event`);
    assert.ok(events.every(e=>e.school_id==='kansas'&&e.sport===sport&&e.start_time&&e.official_event_id));
    assert.equal(new Set(events.map(e=>e.id)).size,events.length,'official IDs must preserve doubleheaders');
    assert.ok(events.every(e=>e.status!=='Final'||e.start_time.slice(0,10)<=now.toISOString().slice(0,10)));
    assert.equal(worker.kansasHandlers.parseSchedule(raw,{...school,id:'kstate'},sport,url,now),null,'KU parser cannot claim another school');
    assert.equal(worker.kansasHandlers.parseSchedule(raw,school,sport,url.replace('kuathletics.com','example.org'),now),null);
    byPath.set(path,events);
  }
}
assert.equal(kansasScheduleData('malformed'),null);
assert.equal(kansasScheduleData('<script id="__NUXT_DATA__">[null]</script>'),null);
const xc=byPath.get('cross-country');
assert.deepEqual(xc.filter(e=>e.status==='Final').map(e=>e.result_count),[21,26]);
assert.equal(byPath.get('football')[0].school_score,'51');assert.equal(byPath.get('football')[0].opponent_score,'6');
assert.equal(byPath.get('wsoc').find(e=>e.official_event_id==='20543').opponent_score,'0','a shutout is a real zero');
const softball=byPath.get('softball');
assert.equal(softball[0].start_time.slice(0,10),'2026-09-26','2027 season heading must not move fall games into next year');
assert.equal(worker.mergeEvents([softball]).length,33,'same-day Nebraska doubleheader must survive merging');
assert.equal(softball[0].status,'Unknown','past unpublished scores are pending, not invented finals');
assert.match(softball[0].headline,/not yet published/);
assert.ok(byPath.get('mens-basketball').some(e=>e.start_time.startsWith('2027-')));
assert.ok(byPath.get('mens-basketball').every(e=>e.team_label==="Men's"));
assert.ok(byPath.get('womens-basketball').every(e=>e.team_label==="Women's"));
assert.equal(byPath.get('womens-rowing')[0].end_time.slice(0,10),'2026-10-17','reject an official end date before the start');
assert.equal(worker.groupEvents(byPath.get('track-and-field'),now).length,0,'old-season track results stay out of the current feed');
assert.ok(byPath.get('womens-swimming-and-diving').length>0,'swimming must use the working women’s route');

const sources=JSON.parse(fixture('sources.json'));
for(const [name,url] of Object.entries(sources.recaps))responses.set(url,fixture(name+'-recap.html'));

// A publisher's erroneous recap link must never redirect an older match to a
// different opponent. Exercise schedule parsing through the expanded endpoint.
const sdsu=structuredClone(byPath.get('wvball').find(e=>e.official_event_id==='20586'));
const sdsuUrl='https://kuathletics.com/news/2026/9/11/womens-volleyball-kansas-earns-second-straight-sweep-in-win-over-south-dakota-state';
assert.equal(sdsu.recap_url,sdsuUrl);
const sdsuArticle='<title>Kansas Earns Second-Straight Sweep in Win over South Dakota State</title><div id="storyPageContentBody">Kansas volleyball defeated South Dakota State on September 11, 2026. Taylor Stanley led Kansas with 16 kills and five aces in the three-set victory.</div></section>';
responses.set(sdsuUrl,sdsuArticle);
requests=[];
await worker.attachOfficialHighlights([sdsu],'',school,'Volleyball',kansasSchool.scheduleUrls['kansas|Volleyball'],now,null,sdsu.id);
assert.deepEqual(requests,[sdsuUrl],'the corrected exact recap must be fetched and accepted without unrelated fallback requests');
assert.equal(sdsu.recap_url,sdsuUrl);
assert.equal(sdsu.source.name,'Official athletics game recap');
assert.equal(worker.kansasHandlers.matchesRecap(sdsuArticle,{...sdsu,opponent:'Wichita State'},sdsuUrl),false);
assert.equal(worker.kansasHandlers.matchesRecap(sdsuArticle,{...sdsu,start_time:'2027-09-11T12:00:00Z'},sdsuUrl),false);
const volleyballRaw=`<script id="__NUXT_DATA__" type="application/json">${fixture('wvball.json')}</script>`;
const wrongRecap='https://kuathletics.com/news/2026/9/15/womens-volleyball-jayhawks-earn-fourth-straight-sweep-in-win-over-shockers';
const updatedRecap=sdsuUrl+'-corrected';
const updatedRaw=volleyballRaw.replaceAll(new URL(wrongRecap).pathname,new URL(updatedRecap).pathname);
assert.notEqual(updatedRaw,volleyballRaw,'test must actually replace the published source link');
const updatedEvents=worker.parseHtml(updatedRaw,school,'Volleyball',kansasSchool.scheduleUrls['kansas|Volleyball'],now);
assert.equal(updatedEvents.find(e=>e.official_event_id==='20586').recap_url,updatedRecap,'later publisher corrections must not be overwritten');

// Combined feeds must include both teams; identical tournament names/dates cannot merge.
for(const [sport,count] of [['Golf',26],['Basketball',70]]){
  const result=await worker.fetchLive('kansas',sport);
  assert.equal(result.events.length,count);
  // fetchLive runs on the real clock, but the fixtures were captured at \`now\`.
  // Only tournaments that had finished by then can carry reviewed placings; a
  // later one (Windon Memorial, Sep 28-29) correctly shows as Completed.
  if(sport==='Golf')assert.ok(result.events.filter(e=>e.status==='Final'&&Date.parse(e.end_time||e.start_time)<=now.getTime()).every(e=>e.result_count>=6),'feed and expanded cards must both retain detailed placings');
  assert.deepEqual([...new Set(result.events.map(e=>e.team_label))].sort(),["Men's","Women's"]);
}
const expectedGolf={'mens-golf-20683':['T-1st','3rd','T-13th','T-17th','T-34th','T-47th'],'mens-golf-20684':['3rd','T-12th','T-40th','T-46th','58th'],'womens-golf-20710':['T-12th','T-12th','T-20th','T-32nd','T-32nd'],'womens-golf-20711':['T-10th','T-47th','T-51st','T-54th','T-54th','T-86th']};
for(const [name,url] of Object.entries(sources.recaps)){
  const path=name.replace(/-\d+$/,''),event=structuredClone(byPath.get(path).find(e=>e.official_event_id===name.match(/\d+$/)[0]));
  const raw=fixture(name+'-recap.html');
  assert.equal(worker.kansasHandlers.matchesRecap(raw,event,url),true,`${name} exact recap must match, including end-dated tournaments`);
  assert.equal(worker.kansasHandlers.matchesRecap(raw,{...event,school_id:'kstate'},url),false);
  assert.equal(worker.kansasHandlers.matchesRecap(raw,{...event,start_time:'2025-09-01T00:00Z',end_time:'2025-09-03T00:00Z'},url),false);
  assert.equal(worker.kansasHandlers.matchesRecap(raw,event,url.replace('kuathletics.com','example.org')),false);
  if(name in expectedGolf){
    const before=structuredClone(event),other=event.team_label==="Men's"?"Women's":"Men's";
    assert.equal(worker.kansasHandlers.applyGolfRecap({...event,team_label:other},raw,url),false,'gender identity is mandatory');
    assert.equal(worker.kansasHandlers.applyGolfRecap({...event,official_event_id:'different'},raw,url),false);
    assert.equal(worker.kansasHandlers.applyGolfRecap(structuredClone(event),raw.replace('</div>',' 999th corrected results.</div>'),url),false,'changed article must invalidate reviewed facts');
    requests=[];
    await worker.attachOfficialHighlights([event],'',school,'Golf','https://kuathletics.com/sports/'+path+'/schedule',now,null,event.id);
    assert.equal(event.result_count,expectedGolf[name].length+1);
    assert.deepEqual(event.results.slice(1).map(row=>row.result),expectedGolf[name]);
    assert.equal(event.recap_url,url);assert.equal(event.highlight_state,'verified');assert.ok(event.highlights.length>=3);
    assert.deepEqual(requests,[url],'use only the exact official recap');
    if(name==='womens-golf-20711'){assert.equal(event.headline,'8th · -12');assert.match(event.highlight_status,/291–283–278/);}
    event.results[1].result='mutated';assert.equal(worker.kansasHandlers.applyGolfRecap(before,raw,url),true);assert.equal(before.results[1].result,expectedGolf[name][0]);
  }
}
// Future tournament identity is not tied to a saved record; changed prose remains
// available via the generic verified recap/highlight path, not stale saved rows.
const future={...byPath.get('womens-golf')[0],official_event_id:'future',start_time:'2027-09-07T12:00Z',end_time:'2027-09-09T23:59Z'};
const futureUrl=sources.recaps['womens-golf-20710'].replace('/2026/','/2027/');
assert.equal(worker.kansasHandlers.matchesRecap(fixture('womens-golf-20710-recap.html'),future,futureUrl),true);
assert.equal(worker.kansasHandlers.applyGolfRecap(future,fixture('womens-golf-20710-recap.html'),futureUrl),false);

// Existing verified athletes still flow through the real roster identity path.
const names=['Lyla Louderbaugh','Ebba Nordstedt','Anna Wallin'];
const roster=names.map(name=>`<li class="roster-list-item"><a href="/sports/womens-golf/roster/player/${name.toLowerCase().replaceAll(' ','-')}">${name}</a><img alt="${name}" src="https://kuathletics.com/images/${name.toLowerCase().replaceAll(' ','-')}.jpg"></li>`).join('');
responses.set(worker.rosterUrls(school,'Golf')[0],roster);
const athletes=await worker.featuredAthletes('kansas','Golf');
assert.equal(athletes.length,3);
for(const athlete of athletes)assert.equal(athlete.instagram_url,kansasSchool.verifiedInstagrams[`kansas|Golf|${athlete.name}`]);
assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get('kstate|Golf|Lyla Louderbaugh'),undefined);
console.log('Kansas module: 12 sports / 14 official schedules, both golf/basketball teams, exact years and doubleheaders, current XC 21/26 rows, 14 recap identities, 22 reviewed golfer placings, future/changed-article guards, and verified athlete isolation passed.');
