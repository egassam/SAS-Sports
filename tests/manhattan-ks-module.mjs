// Manhattan High School (the first high school): the school calendar is the
// schedule, MaxPreps the scores. Fixtures are the real pages of October 9,
// 2026 (calendar trimmed to the sports read so far; MaxPreps pages trimmed to
// their contest data and box score).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {parseCalendarTitle,calendarEvents,maxprepsContests,maxprepsBoxScore,isNamedEvent} from '../src/high-school.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>read('./fixtures/manhattan-ks-module/'+name);
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='manhattan-ks');
const MAXPREPS='https://www.maxpreps.com/ks/manhattan/manhattan-indians/';
const CALENDAR='https://mhs.usd383.org/api/calendars/128516/events';
const SCHOOL_ID='41006ce9-cfb3-492a-a951-d320637bc985';

// Catalog: a Kansas 6A high school, with no featured athletes (minors).
assert.equal(school.level,'high-school');
assert.equal(school.state,'Kansas');
assert.equal(school.classification,'6A');
assert.equal(school.conference,'Centennial League');
assert.deepEqual(sponsoredSports['manhattan-ks'],['Football']);

// Calendar titles.
assert.deepEqual(parseCalendarTitle('MHS Varsity Football - Junction City - AWAY','MHS'),{team:'Varsity Football',name:'Junction City',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS JV Boys Soccer -Wichita Northwest - AWAY','MHS'),{team:'JV Boys Soccer',name:'Wichita Northwest',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS Varsity Girls Tennis - Regionals -AWAY','MHS'),{team:'Varsity Girls Tennis',name:'Regionals',site:'AWAY'});
assert.deepEqual(parseCalendarTitle('MHS Varsity Football - District - TBD','MHS'),{team:'Varsity Football',name:'District - TBD',site:null});
assert.equal(parseCalendarTitle('MHS - Orchestra Concert','MHS'),null);
assert.equal(parseCalendarTitle('Board of Education Meeting','MHS'),null);
for(const name of ['Manhattan Invite','League Tourn.','6A State Tourn.','MHS TRI','Manhattan Quad','Centennial League','Regionals','Baldwin Invite'])assert.ok(isNamedEvent(name),name);
for(const name of ['Junction City','Wichita North','Topeka High','Washburn Rural','Emporia'])assert.ok(!isNamedEvent(name),name);

// Varsity only: JV and 9th grade football are not read.
const calendar=JSON.parse(fixture('calendar-2026-27.json'));
const football=calendarEvents(calendar,{prefix:'MHS',team:/^Varsity Football$/i});
assert.equal(football.length,10);
assert.ok(calendar.data.events.some(e=>/MHS JV Football/.test(e.title))&&calendar.data.events.some(e=>/9th Grade Football/.test(e.title)),'the fixture holds JV and 9th grade games');
assert.deepEqual(football.map(g=>`${g.date} ${g.time} ${g.name} ${g.site}`),[
  '2026-08-27 19:00 Inter Squad Scrimmage HOME','2026-09-04 19:30 Rockhurst HOME','2026-09-11 19:00 Mill Valley AWAY','2026-09-18 19:00 Dodge City AWAY','2026-09-25 19:00 Wichita North HOME',
  '2026-10-02 19:00 Junction City AWAY','2026-10-09 19:00 Emporia HOME','2026-10-15 19:00 Topeka High AWAY','2026-10-23 19:00 Washburn Rural HOME','2026-10-30 19:00 District - TBD null'
]);

// MaxPreps contests from the school's side; the deleted one is skipped.
const contests=maxprepsContests(fixture('maxpreps-football-schedule.html'),SCHOOL_ID);
assert.deepEqual(contests.map(c=>`${c.date} ${c.opponent} ${c.result||'-'} ${c.score??''}-${c.opponent_score??''} ${c.conference}`),[
  '2026-09-04 Rockhurst L 28-32 false','2026-09-11 Mill Valley L 7-21 false','2026-09-18 Dodge City W 42-14 false','2026-09-25 North W 70-6 false',
  '2026-10-02 Junction City W 34-7 true','2026-10-09 Emporia - - null','2026-10-15 Topeka - - null','2026-10-23 Washburn Rural - - null'
]);
assert.ok(!contests.some(c=>/East Christian/.test(c.opponent)),'a deleted contest is not read');
assert.equal(contests[2].game_url,'https://www.maxpreps.com/ks/football/game/dodge-city-vs-manhattan/9-18-2026/?c=5a58d13b-212b-490c-b54d-ce254ddba381');
assert.match(contests[2].stream_url,/^https:\/\/www\.nfhsnetwork\.com\//);
const box=maxprepsBoxScore(fixture('maxpreps-football-game-2026-09-18.html'));
assert.deepEqual(box,{periods:['Q1','Q2','Q3','Q4','Final'],teams:[{name:'Manhattan',scores:['7','12','16','7','42']},{name:'Dodge City',scores:['0','7','0','7','14']}]});

// The Worker's feed, from fixtures only.
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const pages=new Map([[`${CALENDAR}?start_date=2026-07-01&end_date=2027-06-30`,fixture('calendar-2026-27.json')],[`${MAXPREPS}football/schedule/`,fixture('maxpreps-football-schedule.html')],[contests[2].game_url,fixture('maxpreps-football-game-2026-09-18.html')]]);
const requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=pages.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {fetchLive,groupEvents,handler}')(...Object.values(deps));

// Oct 9, 2026, 2 PM in Manhattan: Emporia is tonight.
const RealDate=Date,at=new RealDate('2026-10-09T19:00:00Z');
globalThis.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[at.getTime()]))}static now(){return at.getTime()}};
try{
  const live=await worker.fetchLive('manhattan-ks','Football');
  assert.equal(live.error,null);
  const [group]=worker.groupEvents(live.events,at);
  const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
  assert.deepEqual(group.results.map(line),[
    'Final Oct 2, 7:00 PM Manhattan at Junction City | W, 34-7',
    'Final Sep 25, 7:00 PM Manhattan vs Wichita North | W, 70-6',
    'Final Sep 18, 7:00 PM Manhattan at Dodge City | W, 42-14',
    'Final Sep 11, 7:00 PM Manhattan at Mill Valley | L, 7-21',
    'Final Sep 4, 7:30 PM Manhattan vs Rockhurst | L, 28-32'
  ],'five finals, newest first; the intrasquad scrimmage is not a game');
  assert.deepEqual(group.upcoming.map(line),[
    'Today Oct 9, 7:00 PM Manhattan vs Emporia | ',
    'Upcoming Oct 15, 7:00 PM Manhattan at Topeka High | ',
    'Upcoming Oct 23, 7:00 PM Manhattan vs Washburn Rural | ',
    'Upcoming Oct 30, 7:00 PM Manhattan at District - TBD | '
  ]);
  assert.deepEqual(group.records,[{team_label:null,wins:3,losses:2,ties:0,conference:{name:'Centennial League',wins:1,losses:0,ties:0,text:'1-0'},text:'3-2'}]);
  const dodge=group.results[2];
  assert.equal(dodge.recap_url,contests[2].game_url);
  assert.equal(dodge.recap_label,'View MaxPreps game page');
  assert.equal(dodge.conference_game,false);
  assert.equal(group.results[0].conference_game,true);
  assert.equal(group.results[4].recap_url,undefined,'Rockhurst has no MaxPreps game page');
  assert.equal(dodge.highlights,undefined,'the feed does not read game pages');
  assert.ok(!requests.includes(contests[2].game_url));

  // Expanded view: facts from the score and the box score.
  const expanded=(await worker.fetchLive('manhattan-ks','Football',null,dodge.id)).events.find(e=>e.id===dodge.id);
  assert.deepEqual(expanded.highlights,['Manhattan beat Dodge City 42-14 on the road.','Manhattan led 19-7 at halftime.','Manhattan won the 3rd quarter 16-0.']);
  assert.equal(expanded.highlights_verified,true);
  assert.deepEqual(expanded.game_stats.map(s=>`${s.label}: ${s.value}`),['Q1: Manhattan 7 · Dodge City 0','Q2: Manhattan 12 · Dodge City 7','Q3: Manhattan 16 · Dodge City 0','Q4: Manhattan 7 · Dodge City 7']);
  assert.equal(expanded.highlight_status,'Score and box score as reported to MaxPreps by the team.');
  const jc=(await worker.fetchLive('manhattan-ks','Football',null,group.results[0].id)).events.find(e=>e.id===group.results[0].id);
  assert.equal(jc.highlights[0],'Manhattan beat Junction City 34-7 on the road in a Centennial League game.');

  // No athletes for high school (minors).
  const athletes=await worker.handler.fetch(new Request('https://x.test/live/athletes?school=manhattan-ks&sport=Football'),{},{});
  assert.deepEqual(await athletes.json(),[]);

  // Mutations: a calendar that names the game "Wichita North" still joins
  // MaxPreps "North" on its day; a second game that day must match by name.
  const twoGames=[{date:'2026-09-25',opponent:'North',result:'W',score:1,opponent_score:0},{date:'2026-09-25',opponent:'Hays',result:'L',score:0,opponent_score:1}];
  const matchContest=Function(...Object.keys(deps),source+';return matchContest')(...Object.values(deps));
  assert.equal(matchContest({date:'2026-09-25',name:'Wichita North'},twoGames,new Set()).opponent,'North');
  assert.equal(matchContest({date:'2026-09-25',name:'Hays'},twoGames,new Set()).opponent,'Hays');
  assert.equal(matchContest({date:'2026-09-25',name:'Salina Central'},twoGames,new Set()),null);
}finally{globalThis.Date=RealDate;}
console.log('Manhattan (KS) module: football schedule, MaxPreps scores, records and expanded view verified');
