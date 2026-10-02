import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {kansasSchool,createKansasHandlers} from '../src/schools/kansas.mjs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyVerifiedKansasMeet,applyKansasRows,isKansasCrossCountry,kansasRaceDocuments,parseKansasRacePdf,attachKansasRaceDocuments} from '../src/kansas-cross-country.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const women=read('./fixtures/kansas-bob-timmons-2026-women.txt');
const men=read('./fixtures/kansas-bob-timmons-2026-men.txt');
const event=()=>({id:'ku-bob-timmons',school_id:'kansas',school:'Kansas',sport:'Cross Country',event_type:'MEET',status:'Final',start_time:'2026-09-05T00:00:00Z',opponent:'Bob Timmons Classic',results:[]});
const snapshot=JSON.parse(read('../src/kansas-cross-country-results.json'))[0];
const recap=snapshot.recap_url;
const [womenUrl,menUrl]=snapshot.result_urls;
const link=(url,label)=>`<a href="${url}">${label}</a>`;
const html=link('/documents/2026/9/5/2026_KU_Season_Stats.pdf','Kansas Results ONLY')+link(womenUrl,"Full Women's 5K Results")+link(menUrl,"Full Men's 6K Results")+link(womenUrl,"Full Women's 5K Results")+link('https://example.com/untrusted.pdf',"Women's Results");

assert.deepEqual(kansasRaceDocuments(html,recap),[womenUrl,menUrl]);
const womenRows=parseKansasRacePdf(women,event()),menRows=parseKansasRacePdf(men,event());
assert.equal(womenRows.length,8,'seven women plus the team row');
assert.equal(menRows.length,13,'twelve men plus the team row');
assert.deepEqual([...womenRows,...menRows],snapshot.rows,'verified fast-path rows must equal independently parsed official table fixtures');
assert.equal(womenRows[0].result,'1st · 31 pts');
assert.equal(menRows[0].result,'1st · 24 pts');
assert.equal(womenRows.find(row=>row.participant==='Naomi Hunter').result,'5th · 18:45.6');
assert.equal(menRows.find(row=>row.participant==='Samuel Trumble').result,'5th · 18:28.5');
assert.ok(![...womenRows,...menRows].some(row=>/Harper Barlow|MJ Foster|Sophomore Naomi|Yazid Vazquez/.test(row.participant)),'exclude Kansas City, KU Running Club, and prose fragments');
assert.ok(womenRows.every(row=>row.group==="Women's 5K"));
assert.ok(menRows.every(row=>row.group==="Men's 6K"));
assert.equal(parseKansasRacePdf(women.replace('1 Jepkirui, Irine FR Kansas 5:34.6 17:19.6 1','-- Jepkirui, Irine FR Kansas DNS'),event()).find(row=>row.participant==='Irine Jepkirui').result,'DNS');
for(const change of [{school_id:'kstate'},{sport:'Track & Field'},{status:'Upcoming'},{event_type:'GAME'},{start_time:'2025-09-05T00:00:00Z'},{opponent:'Different Meet'}]){
  const target={...event(),...change},before=structuredClone(target);
  assert.equal(applyVerifiedKansasMeet(target),false);
  assert.deepEqual(target,before,'nonmatching events must remain untouched');
  assert.deepEqual(parseKansasRacePdf(women,target),[]);
}
const seeded=event();assert.equal(applyVerifiedKansasMeet(seeded),true);
assert.equal(seeded.result_count,21);assert.equal(seeded.highlights.length,4);
assert.ok(seeded.headline.includes("Women's team: 1st · 31 pts"));
assert.ok(seeded.headline.includes("Men's team: 1st · 24 pts"));
seeded.results[0].result='changed';const second=event();applyVerifiedKansasMeet(second);assert.equal(second.results[0].result,'1st · 31 pts','do not mutate the stored snapshot');

// The same publisher format must work for a later meet without a saved record.
const later={...event(),start_time:'2026-10-02T00:00:00Z'};
const laterText=text=>text.replaceAll('9/5/2026','10/2/2026');
assert.equal(applyVerifiedKansasMeet(later),false);
const reads=[];
assert.equal(await attachKansasRaceDocuments(later,html,recap,async url=>{reads.push(url);return laterText(url===womenUrl?women:men);}),true);
assert.deepEqual(reads,[womenUrl,menUrl]);
assert.deepEqual(later.results,snapshot.rows);
const partial=event();partial.results=[{group:"Men's Team",participant:'Kansas team',result:'1st (24)'}];
await attachKansasRaceDocuments(partial,html,recap,async url=>{if(url===menUrl)throw Error('unavailable');return women;});
assert.equal(partial.results.filter(row=>!row.participant.endsWith('team')).length,7);
assert.ok(partial.results.some(row=>row.group==="Men's Team"));
assert.match(partial.highlight_status,/Some official race results/);
const unavailable=event();assert.equal(await attachKansasRaceDocuments(unavailable,html,recap,async()=>null),false);assert.deepEqual(unavailable.results,[]);

// Gans Creek uses Karmarush instead of Hy-Tek. Overall place and the first
// TIME column must win over scoring place and intermediate split columns.
const gans=JSON.parse(read('../src/kansas-cross-country-results.json'))[1];
const gansEvent=()=>({...event(),opponent:gans.event,start_time:gans.date+'T12:00:00Z'});
const gansWomen=read('./fixtures/kansas-gans-creek-2026-women.txt');
const gansMen=read('./fixtures/kansas-gans-creek-2026-men.txt');
const gansRows=[...parseKansasRacePdf(gansWomen,gansEvent(),gans.result_urls[0]),...parseKansasRacePdf(gansMen,gansEvent(),gans.result_urls[1])];
assert.deepEqual(gansRows,gans.rows);
assert.equal(gansRows.length,26);
assert.equal(gansRows.filter(row=>/^\d+\w+ · [\d:]+\./.test(row.result)).length,20);
assert.equal(gansRows.find(row=>row.participant==='Barnabas Ndiwa').result,'22nd · 23:22.3');
assert.equal(gansRows.find(row=>row.participant==='Samuel Trumble').result,'132nd · 24:34.9');
assert.equal(gansRows.find(row=>row.participant==='Carter Cline').result,'DNF');
assert.equal(gansRows.filter(row=>row.result==='DNS').length,3);
assert.ok(!gansRows.some(row=>row.participant==='Max Larson'));
const extraDnf=gansMen+'\nPL BIB NAME YR TEAM TIME PTS\nDNF 9999 Other Runner FR Kansas State\n';
assert.ok(!parseKansasRacePdf(extraDnf,gansEvent(),gans.result_urls[1]).some(row=>row.participant==='Other Runner'));
assert.deepEqual(parseKansasRacePdf(gansWomen,gansEvent(),gans.result_urls[0].replace('/2026/','/2025/')),[]);
assert.deepEqual(parseKansasRacePdf(gansWomen,gansEvent(),gans.result_urls[0].replace('kuathletics.com','example.com')),[]);
assert.deepEqual(parseKansasRacePdf(gansWomen,{...gansEvent(),opponent:'Different Meet'},gans.result_urls[0]),[]);
const gansLater={...gansEvent(),start_time:'2027-09-25T12:00:00Z'};
assert.equal(applyVerifiedKansasMeet(gansLater),false);
const laterUrls=gans.result_urls.map(url=>url.replace('/2026/','/2027/'));
await attachKansasRaceDocuments(gansLater,link(laterUrls[0],"Women's 6K Results")+link(laterUrls[1],"Men's 8K Results"),gans.recap_url,async url=>url===laterUrls[0]?gansWomen:gansMen);
assert.deepEqual(gansLater.results,gans.rows,'later meets must parse without the snapshot');

// Exercise the actual worker integration with deterministic network responses.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json'));
let requests=[];
const worker=Function('createSourceFetch','SOURCE_TTL','oklahomaStateSchool','createOklahomaStateHandlers','utahSchool','createUtahHandlers','arizonaStateSchool','createArizonaStateHandlers','byuSchool','createByuHandlers','ucfSchool','createUcfHandlers','kansasSchool','createKansasHandlers','kstateSchool','createKStateHandlers','schools','sponsoredSports','rosterSocialInstagrams','extractText','isKansasCrossCountry','applyVerifiedKansasMeet','attachKansasRaceDocuments','fetch',`${source}\nreturn {enrichMeetEvent,attachOfficialHighlights,fetchLive,parseHtml};`)(createSourceFetch,SOURCE_TTL,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,kansasSchool,createKansasHandlers,kstateSchool,createKStateHandlers,schools,{},()=>[],()=>{throw Error('unexpected PDF extraction');},isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,async url=>{requests.push(String(url));throw Error('unexpected request');});
const current=event();worker.enrichMeetEvent(current);
await worker.attachOfficialHighlights([current],'',schools.find(s=>s.id==='kansas'),'Cross Country','https://kuathletics.com/sports/cross-country/schedule',new Date('2026-09-25'),null,current.id);
assert.deepEqual(requests,[],'verified KU modal must not fetch cumulative PDF or AI/prose results');
assert.deepEqual(current.results,snapshot.rows);
const kstate={...event(),school_id:'kstate',school:'Kansas State',start_time:'2026-09-04T00:00:00Z',opponent:'Platte River Rumble Gold'};
worker.enrichMeetEvent(kstate);
assert.equal(kstate.results.length,20,'existing K-State verified record preserved');
assert.equal(kstate.results[0].result,'1st · 20 pts');
assert.equal(kstate.results.find(row=>row.participant==='Max Larson').result,'1st · 18:27.2');
assert.equal(kstate.highlights.length,4);
assert.equal(kstate.kansas_results_verified,undefined);

const gansCurrent=gansEvent();worker.enrichMeetEvent(gansCurrent);
await worker.attachOfficialHighlights([gansCurrent],'',schools.find(s=>s.id==='kansas'),'Cross Country','https://kuathletics.com/sports/cross-country/schedule',new Date('2026-09-26'),null,gansCurrent.id);
assert.deepEqual(requests,[]);
assert.deepEqual(gansCurrent.results,gans.rows);

console.log('Kansas XC: Bob Timmons and Gans Creek complete results, both teams, exact finish times/places, DNF/DNS, school/date isolation, later-meet parsing, partial failures, modal fast paths, and K-State baseline passed.');
