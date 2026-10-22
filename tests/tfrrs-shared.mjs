// Shared TFRRS cross country rules (Oct 22: meets that showed only a team
// place or "Completed" though TFRRS published them). Real pages saved Oct 22.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {findTfrrsMeet,parseTfrrsResults,tfrrsTeamName} from '../src/tfrrs-results.mjs';
import {createTfrrsMeetResults} from '../src/sidearm-school-kit.mjs';

const page=name=>gunzipSync(readFileSync(new URL(`./fixtures/tfrrs-shared/${name}.html.gz`,import.meta.url))).toString();
const decodeHtml=s=>String(s??'').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&uarr;/g,'');
const ordinal=v=>{const n=Number(v),m=n%100;return Number.isFinite(n)?`${n}${m>=11&&m<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th')}`:String(v)};
const PITT={Women:'https://www.tfrrs.org/teams/xc/PA_college_f_Pittsburgh.html',Men:'https://www.tfrrs.org/teams/xc/PA_college_m_Pittsburgh.html'};
const VT={Women:'https://www.tfrrs.org/teams/xc/VA_college_f_Virginia_Tech.html',Men:'https://www.tfrrs.org/teams/xc/VA_college_m_Virginia_Tech.html'};
const pages=new Map([[PITT.Women,'pitt-f'],[PITT.Men,'pitt-m'],[VT.Women,'vt-f'],[VT.Men,'vt-m'],
  ['https://www.tfrrs.org/results/xc/28955/Under_Armour_Pre-National_Invitational','pre-nationals'],
  ['https://www.tfrrs.org/results/xc/28954/Panorama_Farms_Invitational','panorama-farms']]);
const fetch=async url=>{const name=pages.get(String(url));return name?new Response(page(name)):new Response('',{status:404})};
const meet=(id,opponent,date,headline)=>({school_id:id,sport:'Cross Country',event_type:'MEET',status:'Final',opponent,start_time:`${date}T12:00:00.000Z`,headline,source:{}});

// A plural and its singular are one word: "Pre-Nationals" finds TFRRS's
// "Under Armour Pre-National Invitational". Mutation: without the plural rule, null.
assert.equal(findTfrrsMeet(page('pitt-f'),{decodeHtml,date:'2026-10-16',name:'Pre-Nationals Invitational'}),'https://www.tfrrs.org/results/xc/28955/Under_Armour_Pre-National_Invitational');

// TFRRS's own name for the school, from its team page.
assert.equal(tfrrsTeamName(page('pitt-m'),decodeHtml),'Pittsburgh');
assert.equal(tfrrsTeamName(page('vt-f'),decodeHtml),'Virginia Tech');

// Several races of one distance (the Pre-National's Blue and White) stay
// apart when the school ran both. Mutation: without the race names Pitt's
// women had one "Women's 6K" with the White race's 12th place.
assert.deepEqual(parseTfrrsResults(page('pre-nationals'),{decodeHtml,ordinal,team:'Pittsburgh'}).map(r=>`${r.group}: ${r.result?.place??'-'}`),
  ["Women's Blue 6K: 29","Women's White 6K: 12","Men's Blue 8K: 22","Men's White 8K: -"]);

// Pitt: the module's "Pitt" is "Pittsburgh" on TFRRS, and the schedule's
// places (29th, 22nd: the Blue races) pick the race that leads.
{
  const xc=createTfrrsMeetResults({id:'pitt',schoolName:'Pitt',teams:PITT,decodeHtml,ordinal,fetch});
  const event=meet('pitt','Pre-Nationals Invitational','2026-10-16',"Women's team: 29th / Men's team: 22nd");
  await xc.attach(event);
  assert.equal(event.meet_results_verified,true);
  assert.equal(event.headline,"Women's team: 29th · 749 pts / Men's team: 22nd · 606 pts");
  assert.deepEqual([...new Set(event.results.map(r=>r.group))],["Women's Blue 6K","Women's White 6K","Men's Blue 8K","Men's White 8K"]);
  assert.equal(event.results[0].participant,'Pitt team');
  // A place naming the smaller race (12th: the White race's 344 points)
  // puts that race first.
  const white=meet('pitt','Pre-Nationals Invitational','2026-10-16',"Women's team: 12th");
  await xc.attach(white);
  assert.equal(white.headline,"Women's team: 12th · 344 pts / Men's team: 22nd · 606 pts");
}

// Virginia Tech's schedule names the meet by its host ("Virginia"): the
// team's only TFRRS meet that day (Panorama Farms), confirmed by the
// schedule's places. Mutation: without the default, "No results".
{
  const xc=createTfrrsMeetResults({id:'virginia-tech',schoolName:'Virginia Tech',teams:VT,decodeHtml,ordinal,fetch});
  const event=meet('virginia-tech','Virginia','2026-10-16',"Men's team: 1st / Women's team: 1st");
  await xc.attach(event);
  assert.equal(event.headline,"Women's team: 1st · 20 pts / Men's team: 1st · 31 pts");
  assert.equal(event.results_source_url,'https://www.tfrrs.org/results/xc/28954/Panorama_Farms_Invitational');
  // Without places to confirm it, the only meet that day is not taken (a
  // school may run two meets a day: Boise State's Oct 9).
  const unchecked=meet('virginia-tech','Virginia','2026-10-16','Completed');
  await xc.attach(unchecked);
  assert.equal(unchecked.meet_results_verified,false);
  // A place TFRRS does not show is refused.
  const wrong=meet('virginia-tech','Virginia','2026-10-16',"Men's team: 2nd / Women's team: 1st");
  await xc.attach(wrong);
  assert.equal(wrong.meet_results_verified,false);
}

console.log('Shared TFRRS checks passed (plural names, TFRRS team names, named races, only meet that day when confirmed)');
