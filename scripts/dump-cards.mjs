// Prints one line per WMT schedule card in a saved fixture: heading, days
// (with datetime), divider, name, result slot and story links. Faster than
// reading the page's HTML when a WMT site's cards differ from LSU's or
// Missouri's (scripts/survey-school.mjs shows what the module makes of them).
// Approximate: the heading is the nearest title before the card, and a
// card's slice can run into the next card's dates.
//
//   node scripts/dump-cards.mjs tests/fixtures/missouri-module/womens-golf-schedule.html.gz [pattern]
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const [file,pattern]=process.argv.slice(2);
const raw=gunzipSync(readFileSync(file)).toString();
const vt=s=>s.replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' ').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const heads=[...raw.matchAll(/class="schedule-events-by-tournament__title[^"]*"[^>]*>([\s\S]*?)<\//g)].map(m=>[m.index,vt(m[1])]);
const starts=[...raw.matchAll(/<div class="schedule-event-item(?=[ "])[^"]*"[^>]*>/g)].map(m=>m.index);
starts.forEach((s,i)=>{const b=raw.slice(s,starts[i+1]||s+8000).slice(0,9000);
 const head=heads.filter(h=>h[0]<s).at(-1)?.[1]||'';
 const days=[...b.matchAll(/<time\b[^>]*datetime="([^"]*)"[^>]*class="schedule-event-date__(?:month-)?day"[^>]*>([^<]*)/g)].map(m=>m[1].slice(0,16)+' '+m[2]).join(' - ');
 const div=vt((b.match(/schedule-default-event__divider"[^>]*>([\s\S]*?)<\/strong>/)||[])[1]||'');
 const name=vt((b.match(/schedule-default-event__name"[^>]*>([\s\S]*?)<\/span>\s*<\/span>/)||[])[1]||'');
 const slot=vt((b.match(/schedule-event-item-result__label[^>]*>([\s\S]*?)<\/div>/)||[])[1]||'');
 const links=[...b.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*aria-label="([^"]*)"[^>]*class="schedule-event-item-links__link[^"]*"/g)].filter(m=>/recap|result|story/i.test(m[2])).map(m=>m[2].split(' - ')[0]+'='+m[1].replace(/^https:\/\/[^/]+/,'')).join(' ; ');
 const line=`${head?'['+head+'] ':''}${days} | ${div} | ${name} | ${slot} | ${links}`;
 if(!pattern||new RegExp(pattern,'i').test(line))console.log(line);});
