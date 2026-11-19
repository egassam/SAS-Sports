// Calendar subscription (user, November 18, 2026: item 5 of "What unique
// things should we add now?"): /live/calendar.ics as iCalendar (RFC 5545).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {calendarIcs,calendarEvents,icsText,foldLine,hasClock,CALENDAR_PAIRS_MAX} from '../src/calendar-ics.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const now=new Date('2026-11-19T01:00:00Z');
const game=(id,extra)=>({id,event_type:'GAME',sport:'Football',status:'Upcoming',...extra});
const feeds=[{school:'kstate',schoolName:'Kansas State University',sport:'Football',timeZone:'America/Chicago',groups:[{
  live:[],
  upcoming:[
    game('ksu-arizona',{title:'K-State vs Arizona',start_time:'2026-11-21T18:00:00.000Z',display_time:'Nov 21, 6:00 PM',broadcast:'FS1',site:{place:'Manhattan, Kan.'},series:{record:'Arizona leads 6-2-1',streak:'Arizona won the last meeting'}}),
    game('ksu-isu',{title:'K-State at Iowa State',start_time:'2026-11-28T12:00:00.000Z',display_time:'Nov 28'})
  ],
  results:[
    game('ksu-ku',{status:'Final',title:'K-State vs Kansas',start_time:'2026-11-08T14:30:00.000Z',display_time:'Nov 8, 2:30 PM',headline:'W, 35-24'}),
    game('ksu-old',{status:'Final',title:'K-State vs North Dakota',start_time:'2026-08-29T18:00:00.000Z',display_time:'Aug 29, 6:00 PM',headline:'W, 45-10'})
  ]}]}];

// Text and lines.
assert.equal(icsText('Win, 35-24; home\nnext'),'Win\\, 35-24\\; home\\nnext');
assert.equal(foldLine('x'.repeat(75)),'x'.repeat(75));
assert.equal(foldLine('x'.repeat(80)),`${'x'.repeat(75)}\r\n ${'x'.repeat(5)}`);
assert.equal(hasClock({display_time:'Nov 21, 6:00 PM'}),true);assert.equal(hasClock({display_time:'Nov 28'}),false);
assert.equal(CALENDAR_PAIRS_MAX,12);

// The past 30 days' finals and every coming game, in order.
assert.deepEqual(calendarEvents(feeds,{now}).map(x=>x.event.id),['ksu-ku','ksu-arizona','ksu-isu']);
const ics=calendarIcs(feeds,{name:'K-State · SAS Sports',appUrl:'https://sas.example',now});
const lines=ics.split('\r\n');
assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
assert.equal(lines[0],'BEGIN:VCALENDAR');assert.ok(lines.includes('X-WR-CALNAME:K-State · SAS Sports'));
assert.ok(lines.every(l=>new TextEncoder().encode(l).length<=75),'every line folded at 75 octets');
const unfolded=ics.replace(/\r\n /g,'');
const vevent=id=>unfolded.split('BEGIN:VEVENT').find(b=>b.includes(`UID:${id}@sas-sports`));
// A timed game: its local clock with the school's time zone, three hours.
const az=vevent('ksu-arizona');
assert.match(az,/\r\nDTSTART;TZID=America\/Chicago:20261121T180000\r\nDURATION:PT3H\r\n/);
assert.match(az,/\r\nSUMMARY:K-State vs Arizona\r\n/);
assert.match(az,/\r\nLOCATION:Manhattan\\, Kan\.\r\n/);
assert.match(az,/DESCRIPTION:Kansas State University Football\\nTV: FS1\\nSeries: Arizona leads 6-2-1 · Arizona won the last meeting\\nScores and results: https:\/\/sas\.example\/\?school=kstate/);
// No published time: an all-day event.
assert.match(vevent('ksu-isu'),/\r\nDTSTART;VALUE=DATE:20261128\r\nDTEND;VALUE=DATE:20261129\r\n/);
// A final carries its score.
assert.match(vevent('ksu-ku'),/\r\nSUMMARY:K-State vs Kansas \(W\\, 35-24\)\r\n/);
assert.equal(vevent('ksu-old'),undefined,'older than 30 days: left out');
// A final with no score posted keeps its plain title.
assert.match(calendarIcs([{...feeds[0],groups:[{results:[game('hs',{status:'Final',title:'Manhattan at Derby',start_time:'2026-11-18T19:00:00.000Z',display_time:'Nov 18, 7:00 PM',headline:'No score posted',no_result_posted:true})]}]}],{now}).replace(/\r\n /g,''),/SUMMARY:Manhattan at Derby\r\n/);

// Through the Worker: a saved copy answers; a bad request is refused.
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
class MemoryCache{constructor(){this.store=new Map()}async match(r){const hit=this.store.get(String(r.url??r));return hit?hit.clone():undefined}async put(r,res){this.store.set(String(r.url??r),res.clone())}}
const cache=new MemoryCache();
const fetch=async()=>new Response('',{status:404});
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch,caches:{default:cache}};
const {handler,feedCacheKey}=Function(...Object.keys(deps),source+';return {handler,feedCacheKey};')(...Object.values(deps));
const origin='https://sas.example';
const saved=new Response(JSON.stringify(feeds[0].groups.map(g=>({...g,school_id:'kstate',school:'Kansas State University',sport:'Football'}))),{headers:{'content-type':'application/json','x-sas-fetched-at':new Date().toISOString()}});
await cache.put(feedCacheKey(new URL(`${origin}/live/feed/grouped?school=kstate&sport=Football`),'kstate','Football'),saved);
const waits=[];const ask=q=>handler.fetch(new Request(`${origin}/live/calendar.ics${q}`),{},{waitUntil:p=>waits.push(p)});
const r=await ask('?pairs=kstate%7CFootball');
assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/calendar/);
const body=await r.text();
assert.match(body,/X-WR-CALNAME:K-State · SAS Sports/);
assert.match(body.replace(/\r\n /g,''),/UID:ksu-arizona@sas-sports/);
assert.equal((await ask('')).status,400);
assert.equal((await ask(`?pairs=${encodeURIComponent(Array.from({length:13},(_,i)=>`kstate|Sport${i}`).join(','))}`)).status,400);

// The page: an "Add to calendar" button with Apple/Outlook, Google and a link.
const html=read('../public/index.html');
assert.match(html,/id="calendarButton"/);
assert.match(html,/\/live\/calendar\.ics\?pairs=/);
assert.match(html,/calendar\.google\.com\/calendar\/r\?cid=/);
console.log('calendar-ics: ok');
