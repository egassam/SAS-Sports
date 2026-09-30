import {utahSchool} from '../src/schools/utah.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {kansasSchool,createKansasHandlers} from '../src/schools/kansas.mjs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/kansas-cross-country.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const schools=JSON.parse(read('../src/schools.json'));
const gansUrl='https://www.kstatesports.com/news/2026/9/25/cross-country-wildcats-showcase-significant-personal-improvement-at-gans-creek-classic';
const fixture=read('./fixtures/kstate-gans-2026-results.txt');
const html=(text=fixture,title='Gans Creek Classic')=>`<title>Cross Country ${title}</title><article>${text}</article>`;
const event=()=>({id:'gans',school_id:'kstate',school:'Kansas State',sport:'Cross Country',event_type:'MEET',status:'Final',start_time:'2026-09-25T12:00:00Z',opponent:'Gans Creek Classic',recap_url:gansUrl,result_url:'https://www.kstatesports.com/documents/2026/9/25/women.pdf',results:[]});
let requests=[],responseHtml=html(),fail=false;
const worker=Function('oklahomaStateSchool','createOklahomaStateHandlers','utahSchool','kansasSchool','createKansasHandlers','kstateSchool','createKStateHandlers','schools','sponsoredSports','rosterSocialInstagrams','extractText','isKansasCrossCountry','applyVerifiedKansasMeet','attachKansasRaceDocuments','fetch',`${source}\nreturn {enrichMeetEvent,attachOfficialMeetResults,attachOfficialHighlights,parseKStateRecapTable,attachKStateRecapResults,groupEvents};`)(oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,kansasSchool,createKansasHandlers,kstateSchool,createKStateHandlers,schools,{},()=>[],()=>{throw Error('K-State must not take the first-PDF path');},isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,async url=>{
  requests.push(String(url));if(fail)throw Error('unavailable');assert.equal(String(url),gansUrl);return new Response(responseHtml);
});
const rows=worker.parseKStateRecapTable(html(),event());
assert.equal(rows.length,18);
assert.equal(rows.filter(r=>r.group==="Women's 6K").length,10);
assert.equal(rows.filter(r=>r.group==="Men's 8K").length,8);
assert.deepEqual(rows.filter(r=>r.participant==='K-State team').map(r=>r.result),['18th · 499 pts','17th · 449 pts']);
assert.equal(rows.find(r=>r.participant==='Max Larson').result,'61st · 23:56.6');
assert.equal(rows.find(r=>r.participant==='Jacob Norris').result,'235th · 25:53.3');
assert.equal(rows.find(r=>r.participant==='Joyce Kiptabut').result,'65th · 20:54.2');
assert.equal(rows.find(r=>r.participant==='Sage Siegrist').result,'226th · 22:42.9');
assert.ok(!rows.some(r=>/Missouri|Arkansas|Junior Brock/.test(r.participant)));

// Confirm the parser reconstructs the successful FIRST race's exact contract.
const first={...event(),start_time:'2026-09-04T12:00:00Z',opponent:'Platte River Rumble Gold'};
worker.enrichMeetEvent(first);
assert.equal(first.results.length,20);
assert.deepEqual(worker.parseKStateRecapTable(html(read('./fixtures/kstate-platte-2026-results.txt'),'Platte River Rumble Gold'),first),first.results);
const firstRows=structuredClone(first.results);
await worker.attachOfficialMeetResults(first);
await worker.attachOfficialHighlights([first],'',schools[0],'Cross Country','',new Date(),null,first.id);
assert.deepEqual(first.results,firstRows,'feed and modal must not overwrite the original verified event');
assert.deepEqual(requests,[]);

// Feed and expansion take the same recap-table path even with a women's PDF.
const feed=event();await worker.attachOfficialMeetResults(feed);
assert.deepEqual(requests,[gansUrl]);assert.deepEqual(feed.results,rows);
assert.equal(feed.meet_results_verified,true);assert.equal(feed.highlights.length,4);
assert.match(feed.headline,/Women's team: 18th · 499 pts \/ Men's team: 17th · 449 pts/);
const modal=event();await worker.attachOfficialHighlights([modal],'',schools[0],'Cross Country','',new Date(),{AI:{run(){throw Error('AI is not needed for published result tables');}}},modal.id);
assert.deepEqual(modal.results,feed.results);
assert.deepEqual(requests,[gansUrl,gansUrl]);
await worker.attachOfficialMeetResults(modal);assert.equal(requests.length,2,'do not fetch or overwrite complete recap rows again');

// A future race with the same publisher format needs no hand-entered record.
const later={...event(),start_time:'2027-09-25T12:00:00Z'};
await worker.attachKStateRecapResults(later,html(),gansUrl.replace('/2026/','/2027/'));
assert.deepEqual(later.results,rows);
for(const change of [{school_id:'kansas'},{sport:'Golf'},{status:'Upcoming'}]){
  const other={...event(),...change},before=structuredClone(other);
  await worker.attachKStateRecapResults(other,html(),gansUrl);assert.deepEqual(other,before);
  assert.deepEqual(worker.parseKStateRecapTable(html(),other),[]);
}
for(const [raw,url] of [[html(),'https://example.com/news/2026/9/25/recap'],[html(),gansUrl.replace('/2026/','/2025/')],[html(fixture,'Other Invitational'),gansUrl]]){
  const wrong=event();await worker.attachKStateRecapResults(wrong,raw,url);assert.deepEqual(wrong.results,[]);assert.equal(wrong.meet_results_verified,false);
}
const partial=event();partial.results=[{group:"Men's Team",participant:'Kansas State team',result:'17th'}];
await worker.attachKStateRecapResults(partial,html(fixture.split("Men's Team Finishes")[0]),gansUrl);
assert.equal(partial.meet_results_verified,false);assert.equal(partial.highlights_verified,false);
assert.equal(partial.results.filter(r=>!r.participant.endsWith('team')).length,9);
assert.ok(partial.results.some(r=>r.group==="Men's Team"));assert.match(partial.highlight_status,/Some official/);
fail=true;const unavailable=event();await worker.attachOfficialMeetResults(unavailable);
assert.equal(unavailable.meet_results_verified,false);assert.deepEqual(unavailable.results,[]);
console.log('K-State XC: 18 Gans Creek rows, 20 original rows, feed/modal parity, future recaps, school/date isolation, incomplete and failed sources passed.');
