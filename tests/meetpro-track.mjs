// Track and field from LetsGoRun Timing's MeetPro pages (October 25, 2026):
// a meet's index (team scores, one link per event) and its event pages.
// Fixtures are the real 2026 meets read on October 25: Rock Creek MS
// Invitational (Apr 7; "Riley Co", grade divisions), Wabaunsee Middle School
// Invitational (May 8; the other index layout, "Riley County", "Flint
// Hills"), Beloit Relays (May 1; class divisions, prelims and finals) and
// Washington County Invitational (Apr 28; team scores, no event pages).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {meetProTrackIndex,meetProTrackEvent,meetProTrackTeam,meetProTrackGroup,meetProTrackEventName} from '../src/high-school.mjs';
import {rileyCountyKsSchool,rileyCountyMsKsSchool,flintHillsChristianMsKsSchool,stMarysJhKsSchool,wamegoMsKsSchool,RILEY_POTTAWATOMIE_HIGH_SCHOOLS,RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS} from '../src/schools/riley-pottawatomie-ks.mjs';
import {anthonyMsSchool,eisenhowerMsSchool} from '../src/schools/manhattan-ks-middle.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const gz=name=>gunzipSync(readFileSync(new URL('./fixtures/meetpro-track/'+name,import.meta.url))).toString('utf8');
const meets=Object.fromEntries(['2026_Rock_Creek_MS_Invitational','2026_Wabaunsee_Middle_School_Invitational','2026_Beloit_Relays','2026_Washington_County_Invitational'].map(m=>[m,JSON.parse(gz(`${m}.json.gz`))]));
const BASE='http://results.tfmeetpro.com/LetsGoRun_Timing/',LISTING='https://letsgoruncom.rsupartner.com/race-results';

// Every Track & Field team of the county schools and Manhattan's middle
// schools reads the timer's track meets.
for(const m of [...RILEY_POTTAWATOMIE_HIGH_SCHOOLS,...RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS,anthonyMsSchool,eisenhowerMsSchool])for(const t of m.sports['Track & Field']||[]){
  assert.ok(t.meetPro?.track&&t.meetPro.team,`${m.id}: track reads MeetPro`);assert.ok(m.meetPro?.base,`${m.id}: the timer's pages`);
}

// Names as meets write them.
assert.deepEqual(['Riley Co','Riley County',"St. Mary's",'St Marys','St. Marys','Rock Creek MS','Wamego Middle School'].map(meetProTrackTeam),['riley county','riley county','saint marys','saint marys','saint marys','rock creek','wamego']);
assert.deepEqual(meetProTrackEventName("#4 Women's 100 Meters (Class 1A/2A)"),{sex:'Girls',event:'100 Meters',division:'Class 1A/2A'});
assert.deepEqual(meetProTrackEventName('Boys 4 x 100m Relay (7th Grade Boys)'),{sex:'Boys',event:'4 x 100m Relay',division:'7th Grade Boys'});
assert.deepEqual(meetProTrackEventName("7th Grade Girls Thrower's Relay (7th Grade)"),{sex:'Girls',event:"Thrower's Relay",division:'7th Grade'},'the Washburn Rural Relays name the grade first');
assert.deepEqual(meetProTrackEventName("4X100 Thrower's Relay"),{sex:null,event:"4X100 Thrower's Relay",division:''},'no gender (Wabaunsee HS lists it twice): not read');
assert.deepEqual(['7th Grade Girls','7th Grade','Class 3A/4A',''].map(d=>meetProTrackGroup('Girls',d)),['7th Girls','7th Girls','Girls Class 3A/4A','Girls']);

// The index: both layouts, team tables and events.
const rc=meetProTrackIndex(meets['2026_Rock_Creek_MS_Invitational']['']);
assert.deepEqual([rc.name,rc.date,rc.events.length],['2026 Rock Creek MS Invitational','2026-04-07',72]);
assert.deepEqual(rc.tables.map(t=>`${t.group}:${t.rows.length}`),['7th Girls:8','7th Boys:8','8th Boys:8','8th Girls:8','Boys:8','Girls:8']);
const wab=meetProTrackIndex(meets['2026_Wabaunsee_Middle_School_Invitational']['']);
assert.deepEqual([wab.date,wab.events.length,wab.events[0].title,wab.events[0].page],['2026-05-08',64,'Boys 100 Meters (7th Grade)','results_5.html'],'the index with event numbers');
const wash=meetProTrackIndex(meets['2026_Washington_County_Invitational']['']);
assert.deepEqual([wash.events.length,wash.tables.map(t=>t.group).join()],[0,'Boys,Girls'],'scored, no event pages posted');

// Event pages: the final round; relays with their runners; field marks.
const lj=meetProTrackEvent(meets['2026_Rock_Creek_MS_Invitational']['results_260.html']);
assert.deepEqual([lj.event,lj.round,lj.rows.length,lj.rows[0].athlete,lj.rows[0].team,lj.rows[0].mark],['Long Jump','Finals',17,'Amileo Herrea-Tiritilli','Riley Co',`18' 4"`]);
const relay=meetProTrackEvent(meets['2026_Rock_Creek_MS_Invitational']['results_267.html']);
assert.deepEqual([relay.rows[1].team,relay.rows[1].mark,relay.rows[1].relay.join()],['Riley Co','57.20','Woodworth,Roesler,Mitoska,Davies']);
const dash=meetProTrackEvent(meets['2026_Beloit_Relays']['results_552.html']);
assert.deepEqual([dash.round,dash.rows.length,dash.rows[0].athlete],['Finals',8,'Sevy Wurtz'],'the final, not the prelims before it');

// The Worker's reader, from fixtures only.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const pages=new Map([[LISTING,gz('letsgorun-race-results-2026-10-25.html.gz')]]);
for(const [m,files] of Object.entries(meets))for(const [f,html] of Object.entries(files))pages.set(`${BASE}${m}/${f}`,html);
const requests=[];
const fetch=async url=>{const key=String(url);requests.push(key);const body=pages.get(key);if(body==null)return{ok:false,status:404,url:key,headers:new Headers(),text:async()=>''};return{ok:true,status:200,url:key,headers:new Headers({'content-type':'text/html'}),text:async()=>body};};
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {meetProResultsFor,meetProReader,MEETPRO_TRACK_PAGES}')(...Object.values(deps));
const school=id=>schools.find(s=>s.id===id);
const track=async(module,date,name,read=worker.meetProReader())=>worker.meetProResultsFor(school(module.id),module,module.sports['Track & Field'][0],{date,name},read);
const line=r=>`${r.group} | ${r.participant} | ${r.result}`;

// Riley County Middle School at Rock Creek: found on the results list by
// name and date; team places by grade and the whole meet, then every placer.
{
  const r=await track(rileyCountyMsKsSchool,'2026-04-07','Rock Creek MS Invitational');
  assert.equal(r.url,`${BASE}2026_Rock_Creek_MS_Invitational/`);
  assert.equal(r.label,'View full results (LetsGoRun Timing)');
  assert.equal(r.headline,'7th Girls 3rd of 8 · 7th Boys 3rd of 8 · 8th Girls 1st of 8 · 8th Boys 3rd of 8 · Girls 2nd of 8 · Boys 3rd of 8');
  const groups=[...new Set(r.rows.map(x=>x.group))];
  assert.deepEqual(groups,['7th Girls','7th Boys','8th Girls','8th Boys','Girls','Boys'],'grades in order, girls first, the whole meet last');
  assert.ok(r.rows.includes(r.rows.find(x=>line(x)===`7th Boys | Amileo Herrea-Tiritilli (7) | Long Jump · 1st of 17 · 18' 4"`)));
  assert.ok(r.rows.some(x=>line(x)==='7th Girls | 4 x 100m Relay (Woodworth, Roesler, Mitoska, Davies) | 2nd of 6 · 57.20'));
  assert.ok(r.rows.every(x=>x.participant==='Riley County team'||!/Rock Creek|Wamego/.test(x.participant)),'only Riley County\'s rows');
  assert.equal(r.highlights[0],'7th Girls: Riley County placed 3rd of 8 with 109 points; 3 event wins: Hattie Thayer (100m Hurdles, 19.12); 4 x 200m Relay (2:02.46); Annaleise Altwegg (800 Meters, 2:59.35).');
  assert.equal(r.highlights.find(h=>h.startsWith('8th Girls')).slice(0,46),'8th Girls: Riley County won the team title wit');
  assert.match(r.highlights.find(h=>h.startsWith('7th Boys')),/^7th Boys: Riley County placed 3rd of 8 with 99 points; \d+ event wins: .*Amileo Herrea-Tiritilli \(Long Jump, 18' 4"\)/);
}
// The other index layout: "Riley County" at Wabaunsee.
{
  const r=await track(rileyCountyMsKsSchool,'2026-05-08','Wabaunsee Middle School Invitational');
  assert.equal(r.url,`${BASE}2026_Wabaunsee_Middle_School_Invitational/`);
  assert.deepEqual([...new Set(r.rows.map(x=>x.group))],['7th Girls','7th Boys','8th Girls','8th Boys']);
  assert.ok(r.rows.filter(x=>x.participant!=='Riley County team').length>20);
}
// Flint Hills Christian MS is "Flint Hills" at Wabaunsee; St. Marys JH is "St. Mary's".
{
  const fh=await track(flintHillsChristianMsKsSchool,'2026-05-08','Wabaunsee');
  assert.ok(fh.rows.some(x=>line(x)==='7th Boys | Dustin Flint (7) | Shot Put · 1st of 32 · 37\' 4"'));
  const sm=await track(stMarysJhKsSchool,'2026-05-08','Wabaunsee MS Invitational');
  assert.ok(sm.rows.some(x=>line(x)==='7th Boys | Jackson Hutley (7) | Shot Put · 2nd of 32 · 34\' 3"'));
  const wm=await track(wamegoMsKsSchool,'2026-04-07','Rock Creek Invitational');
  assert.ok(wm.rows.some(x=>/^7th Boys \| Bo Price \(7\) \| 3200 Meters · 2nd of \d+ · 11:55\.54$/.test(line(x))));
}
// Riley County High School at the Beloit Relays: its class and the whole
// meet; finals, not prelims.
{
  const r=await track(rileyCountyKsSchool,'2026-05-01','Beloit Relays');
  assert.equal(r.url,`${BASE}2026_Beloit_Relays/`);
  assert.deepEqual([...new Set(r.rows.map(x=>x.group))],['Girls Class 3A/4A','Girls','Boys Class 3A/4A','Boys']);
  assert.equal(r.rows.find(x=>x.group==='Boys Class 3A/4A').result,'6th of 11 · 46 pts');
  assert.equal(r.rows.find(x=>x.group==='Boys'&&/team/.test(x.participant)).result,'13th of 29 · 38 pts');
  assert.equal(r.rows.find(x=>x.group==='Girls Class 3A/4A').result,'4th of 12 · 50 pts');
  assert.ok(!r.rows.some(x=>/1A\/2A/.test(x.group)));
}
// Ties read "T3rd" (three teams scored 78 at Beloit).
{
  const chapman={...rileyCountyKsSchool,sports:{'Track & Field':[{...rileyCountyKsSchool.sports['Track & Field'][0],meetPro:{...rileyCountyKsSchool.sports['Track & Field'][0].meetPro,team:'Chapman'}}]}};
  const r=await track(chapman,'2026-05-01','Beloit Relays');
  assert.equal(r.rows.find(x=>x.group==='Boys'&&/team/.test(x.participant)).result,'T3rd of 29 · 78 pts');
}
// Scored with no event pages: team places only. A date with no meet, or a
// meet without Riley County, is no result ("No results posted").
{
  const blue=RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS.find(m=>m.id==='blue-valley-randolph-ms-ks');
  assert.equal(await track(blue,'2026-04-28','Washington County Invitational'),null,'a high school meet (no grade divisions): Blue Valley\'s high school, not its middle school');
  const bvhs=RILEY_POTTAWATOMIE_HIGH_SCHOOLS.find(m=>m.id==='blue-valley-randolph-ks');
  const r=await track(bvhs,'2026-04-28','Washington County Invitational');
  assert.deepEqual(r.rows.map(line).map(l=>l.replace(/\d+(st|nd|rd|th) of \d+ · [\d.]+ pts/,'PLACE')),['Girls | Blue Valley team | PLACE','Boys | Blue Valley team | PLACE']);
  assert.equal(r.headline,'Girls 9th of 11 · Boys 8th of 11');
  assert.equal(await track(rileyCountyMsKsSchool,'2026-04-08','Rock Creek MS Invitational'),null,'a different day');
  assert.equal(await track(rileyCountyKsSchool,'2026-05-08','Wabaunsee Middle School Invitational'),null,'grade divisions are not the high school\'s');
}
// One refresh reads at most MEETPRO_TRACK_PAGES event pages; past that, a
// meet shows its team scores only.
{
  const read=worker.meetProReader();read.trackPages=10;
  const r=await track(rileyCountyMsKsSchool,'2026-04-07','Rock Creek MS Invitational',read);
  assert.ok(r.rows.every(x=>x.participant==='Riley County team'));
  assert.match(r.note,/Team scores/);
  assert.equal(worker.MEETPRO_TRACK_PAGES,300);
}
console.log('meetpro-track: ok');
