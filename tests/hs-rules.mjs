// The reference rules (docs/HIGH_SCHOOL_REFERENCE.md) run on the other
// counties' schools (user, November 7, 2026: "Run the checks on the other
// counties"; scripts/check-reference-rules.mjs read all 99 of them). What it
// found, rebuilt through the Worker's own fetchLive from the real sources of
// that day (scripts/record-reference.mjs --dir=hs-rules):
//   - two matches with one opponent on one day made one id (Wamego and
//     Sabetha twice on Oct 10, Cair Paravel and Osage City on Sep 22);
//   - MaxPreps' unscored copies of a day's matches were listed as more
//     matches (Hanover's 9:00 match with Marais des Cygnes Valley, Frankfort's
//     "White City" slots beside its Rural Vista matches, Hartford's Oct 13
//     dual four times; Hartford's unscored Lebo match stays, once);
//   - junior varsity events filed as varsity on Bound (Rock Creek's
//     "Wabaunsee Track Meet - RC JV", Baldwin's "Louisburg JV Mixer");
//   - Bound's capitals ("EMPORIA Bowling Meet", "LADY COUGAR HOLIDAY
//     WRESTLING CLASSIC");
//   - a round not drawn read "Silver Lake vs TBD", and a blank Bound opponent
//     read "Silver Lake vs " beside the game MaxPreps had;
//   - a middle school's October basketball finals made no record.
// The cards must match the ones read by eye (expected-<date>.json); run with
// --update to rewrite them from these sources, and read every change.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {cardLine} from './hs-reference-lib.mjs';
import {nameCase,juniorVarsityOnly} from '../src/high-school.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const dir=new URL('./fixtures/hs-rules/',import.meta.url);
const date=readdirSync(dir).filter(f=>/^expected-\d{4}-\d\d-\d\d\.json$/.test(f)).sort().at(-1).slice(9,19);
const saved=JSON.parse(gunzipSync(readFileSync(new URL(`sources-${date}.json.gz`,dir))).toString('utf8'));
const expectedFile=new URL(`expected-${date}.json`,dir),expected=JSON.parse(readFileSync(expectedFile,'utf8'));
const requestKey=(url,init={})=>`${String(init.method||'GET').toUpperCase()} ${url}${init.body?` #${createHash('sha1').update(String(init.body)).digest('hex').slice(0,12)}`:''}`;
const unsaved=new Set();
const fetch=async(url,init={})=>{
  const k=requestKey(String(url?.url||url),init),hit=saved[k];
  if(!hit){unsaved.add(k);return new Response('',{status:404});}
  return new Response(hit.status?Buffer.from(hit.body,'base64'):null,{status:hit.status||599,headers:{'content-type':hit.type||'text/plain'}});
};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents,isHighSchoolPlaceholder}')(...Object.values(deps));

// The title rules on their own.
assert.equal(nameCase('EMPORIA Bowling Meet'),'Emporia Bowling Meet');
assert.equal(nameCase('WILL ENSLEY INVITATIONAL'),'Will Ensley Invitational');
assert.equal(nameCase('NCAA LEAGUE TOURNAMENT'),'NCAA League Tournament','a league code stays');
assert.equal(nameCase('WCHS Invite'),'WCHS Invite','a school code stays');
assert.equal(nameCase('CCCMS Triangular'),'CCCMS Triangular');
// Capital words together in a mixed title (Manhattan's calendar, November 7, 2026).
assert.equal(nameCase('Regional Meet - WARNER PARK'),'Regional Meet - Warner Park');
assert.equal(nameCase('KSHSAA STATE Meet'),'KSHSAA State Meet');
for(const t of ['Wabaunsee Track Meet - RC JV','St. Marys JV Golf Tournament','Louisburg JV Mixer','Junior Varsity Classic','2027 Titan Wrestling Invitational- Boys Non-Varsity','Non Varsity Invite'])assert.ok(juniorVarsityOnly(t),t);
for(const t of ['Centennial League JV/V','Varsity & JV Invite','Louisburg Varsity Girls Mixer','Topeka Invite','2027 Titan Wrestling Invitational - Girls Varsity'])assert.ok(!juniorVarsityOnly(t),t);

// "Wichita State University tournament" is a tournament, not a state round.
assert.ok(!worker.isHighSchoolPlaceholder('Wichita State University tournament'));
assert.ok(!worker.isHighSchoolPlaceholder('Emporia State University Invitational'));
for(const t of ['State Championship - TBD','Sub-State','State Tournament','Quarterfinals'])assert.ok(worker.isHighSchoolPlaceholder(t),t);

const at=new Date(expected.recorded_at),RealDate=Date;
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
const built={},got={recorded_at:expected.recorded_at,schools:{}};
try{
  for(const [id,sports] of Object.entries(expected.schools))for(const sport of Object.keys(sports)){
    const result=await worker.fetchLive(id,sport),[g]=worker.groupEvents(result.events,at);
    (built[id]??={})[sport]=g;
    (got.schools[id]??={})[sport]={error:result.error||null,rankings:(result.rankings||[]).map(r=>`${r.team_label?`${r.team_label} `:''}No. ${r.rank} ${r.poll}`),live:(g?.live||[]).map(cardLine),results:(g?.results||[]).map(cardLine),upcoming:(g?.upcoming||[]).map(cardLine)};
  }
}finally{globalThis.Date=RealDate;}
assert.equal(unsaved.size,0,`every source read was saved: ${[...unsaved].slice(0,5).join(', ')}`);
if(process.argv.includes('--update')){writeFileSync(expectedFile,JSON.stringify(got,null,1)+'\n');console.log(`hs-rules: rewrote expected-${date}.json`);}
else for(const [id,sports] of Object.entries(expected.schools))for(const sport of Object.keys(sports))assert.deepEqual(got.schools[id][sport],expected.schools[id][sport],`${id} ${sport}: the cards of ${date}`);

const cards=(id,sport)=>{const g=built[id][sport];return[...g.live,...g.results,...g.upcoming];};
const titles=(id,sport,re)=>cards(id,sport).filter(e=>re.test(`${e.start_time.slice(0,10)} ${e.title}`));
// Every card's id is its own.
for(const [id,sports] of Object.entries(built))for(const sport of Object.keys(sports)){
  const ids=cards(id,sport).map(e=>e.id);
  assert.equal(new Set(ids).size,ids.length,`${id} ${sport}: every card has its own id`);
}
// Wamego played Sabetha twice on Oct 10 (two MaxPreps match pages).
const sabetha=titles('wamego-ks','Volleyball',/^2026-10-10 Wamego vs Sabetha$/);
assert.equal(sabetha.length,2,'both Sabetha matches');
assert.deepEqual(sabetha.map(e=>e.id).sort(),['live-wamego-ks-volleyball-oct-10-2026-sabetha-final','live-wamego-ks-volleyball-oct-10-2026-sabetha-final-2']);
// MaxPreps' unscored copies are not more matches.
assert.deepEqual(titles('hanover-ks','Volleyball',/^2026-10-31 /).map(e=>`${e.title} ${e.headline}`),['Hanover vs Argonia W, 2-0','Hanover vs Marais des Cygnes Valley W, 2-0']);
// Frankfort's "White City" slots are its matches with Rural Vista [Hope/White
// City] on Oct 3 and 20; Oct 13 has no such match and reads as played.
assert.deepEqual(titles('frankfort-ks','Volleyball',/White City\b/).map(e=>`${e.start_time.slice(0,10)} ${e.title} ${e.headline}`),['2026-10-20 Frankfort at Rural Vista [Hope/White City] L, 0-2','2026-10-13 Frankfort at White City No score posted','2026-10-03 Frankfort vs Rural Vista [Hope/White City] L, 0-2']);
assert.deepEqual(titles('hartford-ks','Volleyball',/^2026-10-13 /).map(e=>`${e.title} ${e.headline}`),['Hartford vs Northern Heights No score posted'],'one dual, listed once');
assert.deepEqual(titles('hartford-ks','Volleyball',/Lebo$/).map(e=>`${e.title} ${e.headline}`),['Hartford vs Lebo No score posted'],'an unscored match with no scored match against that opponent is played, listed once');
// Junior varsity events on Bound are not listed.
assert.deepEqual(titles('rock-creek-ks','Track & Field',/\bJV\b/),[]);
assert.deepEqual(titles('baldwin-ks','Wrestling',/\bJV\b/),[]);
assert.equal(titles('baldwin-ks','Wrestling',/Louisburg Varsity Girls Mixer/).length,1,'the varsity mixer stays');
// Capitals read as names.
assert.ok(titles('emporia-ks','Bowling',/Emporia Bowling Meet$/).length&&!titles('emporia-ks','Bowling',/EMPORIA/).length);
assert.equal(titles('lawrence-ks','Wrestling',/Lady Cougar Holiday Wrestling Classic$/).length,1);
// Rounds not drawn read "·"; a blank opponent is no card.
assert.deepEqual(titles('silver-lake-ks','Football',/^2026-11-/).map(e=>`${e.status} ${e.title}`),['Final Silver Lake vs Humboldt','Upcoming Silver Lake · TBD','Upcoming Silver Lake · TBD','Upcoming Silver Lake · TBD']);
assert.ok(titles('holton-ks','Baseball',/TBD/).every(e=>e.title==='Holton · TBD'));
// October middle school basketball counts toward the record.
assert.ok(built['wamego-ms-ks'].Basketball.records.some(r=>r.text==='0-1'),'Wamego MS 7th Girls 0-1');
console.log(`hs-rules: ok (${Object.values(built).reduce((n,s)=>n+Object.keys(s).length,0)} feeds from the sources of ${date})`);
