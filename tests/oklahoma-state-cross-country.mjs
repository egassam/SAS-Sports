import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers,parseOklahomaStateMeetResults} from '../src/schools/oklahoma-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {createFeedStore} from '../src/feed-store.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const pdf=name=>readFileSync(new URL('./fixtures/oklahoma-state-module/'+name,import.meta.url));
// Text as the Worker's unpdf call extracts it from each official PDF. CI runs
// without installed packages, so the stub is keyed to the exact PDF bytes and
// the text is re-extracted and compared whenever unpdf is available.
const pdfText=name=>gunzipSync(pdf(name.replace(/\.pdf$/,'.txt.gz'))).toString('utf8');
const pdfFiles=['cowboy-preview-2026-results.pdf','cowboy-jamboree-2026-results.pdf'];
const extractText=async(bytes,options)=>{
  assert.deepEqual(options,{mergePages:true});
  const name=pdfFiles.find(file=>Buffer.from(bytes).equals(pdf(file)));
  assert.ok(name,'only the official PDF fixtures are extracted');
  return{totalPages:0,text:pdfText(name)};
};
const unpdf=await import('unpdf').catch(()=>null);
if(unpdf)for(const file of pdfFiles)assert.equal((await unpdf.extractText(new Uint8Array(pdf(file)),{mergePages:true})).text,pdfText(file),`${file}: committed text must equal unpdf extraction`);
const sources=JSON.parse(read('./fixtures/oklahoma-state-module/sources.json')).cross_country_results;
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='oklahoma-state');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');

// Official documents: okstate.com's /documents/ page links the PDF on SIDEARM's
// S3 host. The PDFs are the unmodified official files. The document pages and
// recaps are minimal wrappers because okstate.com returned HTTP 403 for them.
const meets={
  preview:{file:'cowboy-preview-2026-results.pdf',date:'2026-09-05',opponent:'Cowboy Preview',schedule:'1st - 31 pts.',recapTitle:'Top-Ranked Cowboys Open Season with Dominant Victory at Cowboy Preview'},
  jamboree:{file:'cowboy-jamboree-2026-results.pdf',date:'2026-09-26',opponent:'Cowboy Jamboree',schedule:'2nd - 44 pts.',recapTitle:'Cowboy Cross Country Places Second at 88th Annual Cowboy Jamboree'}
};
let responses,requests;
const reset=()=>{
  responses=new Map();requests=[];
  for(const meet of Object.values(meets)){
    const info=sources[meet.file];
    responses.set(info.document_page,()=>new Response(`<html><title>Results</title><a href="${info.file}">Download</a></html>`,{headers:{'content-type':'text/html'}}));
    responses.set(info.file,()=>new Response(pdf(meet.file),{headers:{'content-type':'application/pdf'}}));
    responses.set(info.recap,()=>new Response(`<html><head><title>${meet.recapTitle} - Oklahoma State University Athletics</title></head><body><article><h1>${meet.recapTitle}</h1><p>Oklahoma State cross country competed at the ${meet.opponent} in Stillwater.</p></article></body></html>`));
  }
};
const fetch=async url=>{requests.push(String(url));const make=responses.get(String(url));return make?make():new Response('not found',{status:404});};
const deps={createSourceFetch,SOURCE_TTL,createFeedStore,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText,fetch};
const worker=Function(...Object.keys(deps),source+';return {attachOfficialMeetResults,attachOfficialHighlights,ordinal};')(...Object.values(deps));

// The event as production's official schedule card presents it today.
const event=(key,change={})=>{
  const meet=meets[key],info=sources[meet.file];
  return{id:`live-oklahoma-state-cross-country-${key}`,school_id:'oklahoma-state',school:'Oklahoma State',sport:'Cross Country',event_type:'MEET',status:'Final',
    title:`Oklahoma State at ${meet.opponent}`,start_time:`${meet.date}T12:00:00.000Z`,opponent:meet.opponent,headline:meet.schedule,
    results:[{label:'Result',value:meet.schedule}],result_url:info.document_page,recap_url:info.recap,
    source:{name:'Official athletics live schedule',url:'https://okstate.com/sports/mxct/schedule'},...change};
};
const athletes=(rows,group)=>rows.filter(r=>r.group===group&&!r.participant.endsWith(' team'));
const team=(rows,group)=>rows.find(r=>r.group===group&&r.participant==='Oklahoma State team')?.result;

// Cowboy Preview: the correct 31 rows, now in K-State's race-group format.
reset();
const preview=event('preview');await worker.attachOfficialMeetResults(preview);
assert.deepEqual([...new Set(preview.results.map(r=>r.group))],["Women's 3K","Men's 5K"],'one group per race, women first');
assert.equal(preview.results.length,31);
assert.deepEqual(preview.results.filter(r=>r.participant==='Oklahoma State team').map(r=>r.result),['1st · 26 pts','1st · 31 pts']);
assert.equal(preview.results[0].participant,'Oklahoma State team','team row leads the women\'s race');
assert.equal(preview.results[15].participant,'Oklahoma State team','team row leads the men\'s race');
assert.equal(athletes(preview.results,"Women's 3K").length,14);
assert.equal(athletes(preview.results,"Men's 5K").length,15);
assert.deepEqual(athletes(preview.results,"Women's 3K").at(0),{group:"Women's 3K",participant:'Victoria Lagat',result:'2nd · 10:18.9'});
assert.deepEqual(athletes(preview.results,"Women's 3K").at(-1),{group:"Women's 3K",participant:"Aubrey O'Connell",result:'27th · 11:43.7'});
assert.deepEqual(athletes(preview.results,"Men's 5K").at(0),{group:"Men's 5K",participant:'Laban Kipkemboi',result:'3rd · 15:13.4'});
assert.deepEqual(athletes(preview.results,"Men's 5K").at(-1),{group:"Men's 5K",participant:'David Mora',result:'32nd · 17:13.4'});
assert.ok(!preview.results.some(r=>/Stockton|Johnson|Wilmes|Bristow/.test(r.participant)),'scratched entrants have no published result');
assert.equal(preview.headline,"Women's team: 1st · 26 pts / Men's team: 1st · 31 pts");
assert.equal(preview.recap_result_count,31);assert.equal(preview.result_count,31);assert.equal(preview.has_more_results,true);
assert.equal(preview.meet_results_verified,true);assert.equal(preview.highlights_verified,true);
assert.equal(preview.highlight_state,'official_meet_results');assert.equal(preview.highlight_status,null);
assert.deepEqual(preview.highlights,[
  "Oklahoma State's women's 3k team finished 1st with 26 pts.",
  "Oklahoma State's men's 5k team finished 1st with 31 pts.",
  "Victoria Lagat led Oklahoma State in the women's 3k, finishing 2nd in 10:18.9.",
  "Laban Kipkemboi led Oklahoma State in the men's 5k, finishing 3rd in 15:13.4."
]);
assert.equal(preview.recap_url,sources[meets.preview.file].recap,'the card\'s exact recap is kept');
assert.deepEqual(preview.source,{name:'Official meet results',url:sources[meets.preview.file].document_page});

// Cowboy Jamboree: previously one schedule row; now every placed athlete.
reset();
const jamboree=event('jamboree');await worker.attachOfficialMeetResults(jamboree);
assert.deepEqual([...new Set(jamboree.results.map(r=>r.group))],["Women's 6K","Men's 8K"]);
assert.equal(jamboree.results.length,37);
assert.equal(team(jamboree.results,"Women's 6K"),'2nd · 64 pts');
assert.equal(team(jamboree.results,"Men's 8K"),'2nd · 44 pts','matches the schedule card\'s 2nd - 44 pts.');
assert.equal(athletes(jamboree.results,"Women's 6K").length,15);
assert.equal(athletes(jamboree.results,"Men's 8K").length,20);
assert.deepEqual(athletes(jamboree.results,"Women's 6K").slice(0,2).map(r=>`${r.participant} ${r.result}`),['Billah Jepkirui 1st · 19:24.4','Maureen Cherotich 2nd · 19:28.6']);
assert.deepEqual(athletes(jamboree.results,"Women's 6K").at(-1),{group:"Women's 6K",participant:'Kadence Huck',result:'87th · 22:55.5'});
assert.deepEqual(athletes(jamboree.results,"Men's 8K").slice(0,2).map(r=>`${r.participant} ${r.result}`),['Denis Kipngetich 2nd · 23:25.4','Brian Musau 4th · 23:43.0']);
assert.deepEqual(athletes(jamboree.results,"Men's 8K").at(-1),{group:"Men's 8K",participant:'Wilson Schmidt',result:'149th · 27:09.6'});
assert.ok(!jamboree.results.some(r=>/Stockton/.test(r.participant)),'an entrant listed without place or time is not given a result');
assert.ok(!jamboree.results.some(r=>/Cheruto|Hassnaoui|Gray|Kirk|Strohman, Ryder|Ryder Strohman/.test(r.participant)),'Oklahoma and Oklahoma Christian athletes are excluded');
assert.ok(!jamboree.results.some(r=>/School|Boys|Girls/.test(r.group)),'high-school races are excluded');
assert.equal(jamboree.headline,"Women's team: 2nd · 64 pts / Men's team: 2nd · 44 pts");
assert.equal(jamboree.recap_result_count,37);assert.equal(jamboree.meet_results_verified,true);assert.equal(jamboree.highlights.length,4);

// Feed and expanded view take the same path and return identical events.
for(const key of Object.keys(meets)){
  reset();const feed=event(key);await worker.attachOfficialMeetResults(feed);
  reset();const modal=event(key);
  await worker.attachOfficialHighlights([modal],'<html>schedule</html>',school,'Cross Country','https://okstate.com/sports/mxct/schedule',new Date('2026-09-29T17:00:00Z'),{AI:{run(){throw Error('AI must not replace official result documents');}}},modal.id);
  assert.deepEqual(modal,feed,`${key}: expanded view must equal the feed`);
  const fetched=requests.length;await worker.attachOfficialMeetResults(modal);
  assert.equal(requests.length,fetched,'complete results are not fetched or rebuilt again');
}

// The same parser handles a future meet in either published format.
const future=parseOklahomaStateMeetResults(pdfText(meets.jamboree.file),worker.ordinal);
assert.deepEqual(future,jamboree.results);

// Missing, wrong or unofficial documents are explicitly partial; no rows are invented.
reset();responses.delete(sources[meets.jamboree.file].file);
const unavailable=event('jamboree');await worker.attachOfficialMeetResults(unavailable);
assert.deepEqual(unavailable.results,[{label:'Result',value:'2nd - 44 pts.'}]);
assert.equal(unavailable.meet_results_verified,false);assert.equal(unavailable.highlight_state,'official_results_partial');
assert.match(unavailable.highlight_status,/Some official race results could not be loaded/);
// The expanded view must stay partial too, never falling back to recap prose or AI rows.
reset();responses.delete(sources[meets.jamboree.file].file);
const unavailableModal=event('jamboree');
await worker.attachOfficialHighlights([unavailableModal],'<html>schedule</html>',school,'Cross Country','https://okstate.com/sports/mxct/schedule',new Date('2026-09-29T17:00:00Z'),{AI:{run(){throw Error('AI must not invent results');}}},unavailableModal.id);
assert.deepEqual(unavailableModal,unavailable,'feed and expanded view agree when a document is missing');
assert.ok(!requests.includes(sources[meets.jamboree.file].recap),'recap prose is not parsed for results');
reset();
const wrongDate=event('jamboree',{result_url:sources[meets.preview.file].document_page});await worker.attachOfficialMeetResults(wrongDate);
assert.equal(wrongDate.results.length,1,'another meet\'s document must not be attached');assert.equal(wrongDate.meet_results_verified,false);
reset();
const unofficial=event('jamboree',{result_url:'https://example.com/documents/2026/9/26/2026_Cowboy_Jamboree_Results.pdf'});await worker.attachOfficialMeetResults(unofficial);
assert.equal(unofficial.meet_results_verified,false);assert.deepEqual(requests,[],'unofficial hosts are never fetched');
reset();
const noRecap=event('preview',{recap_url:'https://okstate.com/news/2026/9/5/soccer-cowgirls-beat-tulsa'});
await worker.attachOfficialMeetResults(noRecap);
assert.equal(noRecap.results.length,31);assert.equal(noRecap.recap_url,undefined,'a recap that is not this meet\'s article is removed');

// Other schools, sports and states are untouched by the Oklahoma State handler.
const handlers=createOklahomaStateHandlers({ordinal:worker.ordinal,recapMatchesEvent:()=>true,fetchPdfText:()=>{throw Error('must not fetch');},fetch,headers:{}});
for(const change of [{school_id:'kstate'},{sport:'Track & Field'},{status:'Upcoming'},{event_type:'GAME'}]){
  const other=event('jamboree',change),before=structuredClone(other);
  await handlers.attachMeetResults(other);assert.deepEqual(other,before);
}

console.log(`Oklahoma State XC: Cowboy Preview 31 rows and Cowboy Jamboree 37 rows from the official results PDFs (${unpdf?'text re-extracted with unpdf':'committed unpdf text'}), women first, K-State headline, feed/modal parity, partial and isolation checks passed.`);
