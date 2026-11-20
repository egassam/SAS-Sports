// The week ahead (user, November 20, 2026: "make upcoming college and pro
// games more obvious so you know who's playing a weekend in advance", Monday
// to Sunday "because of Monday night and Thursday night football", then "Can
// we also make them look like this?" with ESPN's matchup card).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const worker=Function(...Object.keys(deps),source+';return {weekGamesFromBoards,weekDayKey,weekLine,WEEK_MAX_DAYS};')(...Object.values(deps));
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/'+name,import.meta.url))).toString('utf8'));
const cfbBoard={path:'football/college-football',sport:'Football',level:'college'},nflBoard={path:'football/nfl',sport:'Football',level:'pro'};

// 1. Server: Saturday's college football board, Nov 21 (saved from ESPN).
{
  const payload=fixture('football-espn-2026-11-21-week.json.gz');
  const games=worker.weekGamesFromBoards([{board:cfbBoard,payload},{board:cfbBoard,payload}]);
  assert.equal(new Set(games.map(g=>g.id)).size,games.length,'each game once, even read twice');
  const ku=games.find(g=>g.home.id==='kansas');
  assert.ok(ku,'BYU at Kansas is listed');
  assert.equal(ku.away.id,'byu');assert.equal(ku.away.name,'BYU');assert.equal(ku.home.name,'Kansas','ESPN\'s own name, not the catalog\'s "KU"');
  assert.equal(ku.away.rank,10);assert.equal(ku.home.rank,undefined,'unranked (ESPN 99) shows no rank');
  assert.equal(ku.away.record,'8-2');assert.equal(ku.away.abbr,'BYU');assert.ok(!JSON.stringify(games).includes('espncdn'),'no logos (user, October 15 and November 20)');
  assert.deepEqual(ku.odds,{line:'-5.5',favorite:'away',total:46.5},'the line on the favorite, and the total');
  assert.deepEqual(ku.tv,['ABC']);assert.equal(ku.featured,true);assert.equal(ku.start_utc,'2026-11-21T17:00:00.000Z');
  assert.ok(games.some(g=>g.home.id==='kstate'&&g.away.id==='arizona'),'Arizona at Kansas State');
  assert.ok(games.every(g=>g.level==='college'&&g.sport==='Football'&&(g.home.id||g.away.id)));
  // A game under way or finished is not "ahead".
  const live=structuredClone(payload);live.events.find(e=>/@ KU/.test(e.shortName)).competitions[0].status.type.state='in';
  assert.ok(!worker.weekGamesFromBoards([{board:cfbBoard,payload:live}]).some(g=>g.home.id==='kansas'),'a live game leaves the week ahead');
  assert.deepEqual(games.map(g=>g.start_utc),[...games.map(g=>g.start_utc)].sort(),'by start');
}
// 2. Server: Thanksgiving's NFL board, Nov 26: three games, the league named.
{
  const games=worker.weekGamesFromBoards([{board:nflBoard,payload:fixture('nfl-espn-2026-11-26-week.json.gz')}]);
  assert.equal(games.length,3,'Bears at Lions, Eagles at Cowboys, Chiefs at Bills');
  const kc=games.find(g=>g.away.id==='kansas-city-chiefs');
  assert.ok(kc,'the Chiefs (pro catalog) at Buffalo');
  assert.equal(kc.league,'NFL');assert.equal(kc.away.name,'Chiefs');assert.equal(kc.odds.favorite,'home');assert.equal(kc.odds.line,'-3');
  assert.ok(games.every(g=>g.featured),'every pro game is featured');
}
// 3. Server helpers: the day asked for, and the line read from ESPN's text.
assert.equal(worker.weekDayKey('2026-11-21'),'2026-11-21');
for(const bad of [null,'','2026-11-2','20261121','2026-13-40','x'])assert.equal(worker.weekDayKey(bad),null,String(bad));
assert.equal(worker.weekLine('BYU -5.5','BYU'),'-5.5');assert.equal(worker.weekLine('EVEN',null),'EVEN');assert.equal(worker.weekLine('',null),null);
assert.equal(worker.WEEK_MAX_DAYS,14);
const index=read('../src/index.js');
assert.match(index,/if\(url\.pathname==='\/live\/week'\)/,'the route');
assert.match(index,/offset<-1\|\|offset>WEEK_MAX_DAYS/,'only yesterday through two weeks ahead');

// 4. The page: the week-ahead block, run with the page's own code.
const page=read('../public/index.html');
const block=page.slice(page.indexOf('// The week ahead (user, November 20, 2026'),page.indexOf("// The overview's countdown box"));
assert.ok(block.length>2000,'the block is found');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>`&#${c.charCodeAt(0)};`);
const catalog={'manhattan-ks':{level:'high-school',name:'Manhattan High School',short_name:'Manhattan'},kstate:{level:'college',name:'Kansas State',short_name:'K-State',theme:{}},kansas:{level:'college'},'kansas-city-chiefs':{level:'pro'},byu:{level:'college'}};
const env={homeView:true,teams:['kstate','kansas-city-chiefs'],view:'all',q:''};
const api=Function('esc','homeTeams','catalogEntry','knownColors','search','marqueeOf','slug','sectionHead','homeSectionOpen','comingDay','apiFetch','homeMode','render','displayedGroups','viewerTimeZone','env','document',
  block.replace(/\bhomeView\b/g,'env.homeView').replace(/\bcurrentView\b/g,'env.view')+';return{weekSections,weekCard,withoutWeek,weekEverywhere,weekRequestDays,weekBounds,weekSection,set:m=>{weekDays=m}};')(
  esc,()=>env.teams,id=>catalog[id],()=>null,{get value(){return env.q}},()=>['#fff','●'],s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-'),(t,sub)=>`<h2>${t}</h2><p>${sub}</p>`,t=>`<section id="${t}">`,x=>({day:x.day,at:x.at??Date.parse(`${x.day}T18:00:00Z`),time:x.time??null}),null,()=>true,()=>{},()=>[],'America/Chicago',env,{querySelector:()=>({hidden:false,classList:{contains:()=>false}})});
// The days asked for: today through next week's Sunday (Eastern).
{
  const fri=api.weekRequestDays(Date.parse('2026-11-20T18:00:00Z'));
  assert.equal(fri[0],'2026-11-20');assert.equal(fri.at(-1),'2026-11-29');assert.equal(fri.length,10,'Friday: this weekend and next week');
  const mon=api.weekRequestDays(Date.parse('2026-11-23T18:00:00Z'));
  assert.equal(mon.length,14);assert.equal(mon.at(-1),'2026-12-06','Monday: this week and next');
  const sunNight=api.weekRequestDays(Date.parse('2026-11-23T03:30:00Z'));
  assert.equal(sunNight[0],'2026-11-22','Sunday 10:30 PM Eastern is still Sunday');
}
const day=n=>new Date(Date.now()+n*864e5);
const iso=n=>day(n).toISOString();
const side=(id,name,extra={})=>({id,name,abbr:name.slice(0,3).toUpperCase(),...extra});
const games=[
  {id:'a',sport:'Football',level:'college',start_utc:iso(2),away:side('arizona','Arizona',{rank:19}),home:side('kstate','Kansas State'),odds:{line:'-7.5',favorite:'away',total:51.5},tv:['FS1'],featured:true},
  {id:'b',sport:'Football',level:'pro',league:'NFL',start_utc:iso(3),away:side('kansas-city-chiefs','Chiefs'),home:side('buffalo-bills','Bills'),odds:{line:'-3',favorite:'home',total:50.5},tv:['CBS'],featured:true},
  {id:'c',sport:'Basketball',team_label:"Men's",level:'college',start_utc:iso(2),away:side('duke','Duke',{rank:5}),home:side('byu','BYU'),featured:true},
  {id:'d',sport:'Basketball',team_label:"Men's",level:'college',start_utc:iso(2),away:side('a1','Alpha'),home:side('b1','Beta'),featured:false},
  {id:'e',sport:'Basketball',team_label:"Men's",level:'college',start_utc:new Date(Date.now()-36e5).toISOString(),away:side('c1','Gamma'),home:side('d1','Delta'),featured:true},
  {id:'f',sport:'Football',level:'college',start_utc:iso(30),away:side('kstate','Kansas State'),home:side('x','X'),featured:true}
];
api.set(new Map([['d1',{at:Date.now(),games}],['d2',{at:Date.now(),games:[games[0]]}]]));
{
  const {mine,others}=api.weekSections();
  assert.deepEqual(mine.map(x=>x.g.id).sort(),['a','b'],'every college and pro game a favorite plays, once each; not beyond next Sunday');
  assert.equal(mine.find(x=>x.g.id==='a').team,'kstate');
  assert.deepEqual(others.map(x=>x.g.id).sort(),['c','d'],'the rest; a game already started is gone');
  env.q='duke';assert.deepEqual(api.weekSections().others.map(x=>x.g.id),['c'],'search narrows it');env.q='';
  env.view='results';assert.deepEqual(api.weekSections(),{mine:[],others:[]},'not on Results');env.view='all';
  env.homeView=false;assert.equal(api.weekSections().others.length,0,'a team\'s own page shows only its own games');env.homeView=true;
  // The card: ESPN's look.
  const card=api.weekCard(mine.find(x=>x.g.id==='a'));
  assert.match(card,/class="wk-card"[^>]*data-open-team="kstate"[^>]*data-open-sport="Football"/,'opens the favorite\'s football');
  const rows=card.match(/<div class="wk-row">[\s\S]*?<\/span><\/div>/g);
  assert.equal(rows.length,2,'two team rows, away on top');
  assert.match(rows[0],/wk-rank">19<\/span>Arizona[\s\S]*wk-odds">-7\.5<[\s\S]*wk-time">\d{1,2}:\d{2} [AP]M</,'away: rank, name, the line, the time');
  assert.match(rows[1],/wk-name mine">Kansas State[\s\S]*wk-odds">T:51\.5</,'home: the favorite in gold, the total');
  assert.match(card,/class="wk-tv">[\s\S]*FS1</,'the TV chip');
  assert.match(card,/aria-label="Arizona at Kansas State, Football, /);
  const nfl=api.weekCard(mine.find(x=>x.g.id==='b'));
  assert.match(nfl,/wk-tag">NFL · Football</,'a pro game names its league');
  assert.match(nfl.match(/<div class="wk-row">[\s\S]*?<\/span><\/div>/g)[1],/Bills[\s\S]*wk-odds">-3</,'the home favorite\'s line on the home row');
  // Coming up drops a game the week ahead shows.
  const coming=[{school_id:'kstate',sport:'Football',e:{},day:mine.find(x=>x.g.id==='a').day},{school_id:'kstate',sport:'Volleyball',e:{},day:mine[0].day}];
  assert.deepEqual(api.withoutWeek(coming,mine).map(x=>x.sport),['Volleyball']);
  // Everywhere: a day at a time, featured first.
  const html=api.weekEverywhere(others);
  assert.match(html,/class="wk-days"[\s\S]*data-week-day="[\d-]+"[^>]*aria-pressed="true"/,'day buttons, the first chosen');
  assert.ok(html.includes('Duke')&&!html.includes('Alpha'),'featured games first');
  assert.match(html,/data-week-sport="[\d-]+\|Basketball">Show all 2 Basketball games/,'Show all for that day and sport');
  const section=api.weekSection('The week ahead',mine);
  assert.match(section,/through next Sunday/);
  assert.match(section,/<div class="wk-week">(?:This|Next) week<\/div>/,'the week heading');
  assert.match(section,/data-week-alerts>[\s\S]*?Get alerts</,'each day carries the alerts bell');
  assert.equal(api.weekSection('The week ahead',[]),'','no games, no section');
}
// All levels from the official schedules (user, November 20: "No logos and
// all levels"): ESPN's same game lends its line; a high school game, a meet.
{
  env.teams=['kstate','kansas-city-chiefs','manhattan-ks'];
  const local=n=>new Date(Date.now()+n*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const aDay=api.weekSections().mine.find(x=>x.g?.id==='a').day;
  const feed=[
    {school_id:'kstate',school:'Kansas State',sport:'Football',e:{id:'k1',title:'K-State vs Arizona',opponent:'Arizona',event_type:'GAME'},day:aDay},
    {school_id:'manhattan-ks',school:'Manhattan High School',sport:'Basketball',e:{id:'m1',title:'Girls · Manhattan at Hays',opponent:'Hays',team_label:'Girls',event_type:'GAME'},day:local(3),time:'6:00 PM'},
    {school_id:'manhattan-ks',school:'Manhattan High School',sport:'Cross Country',e:{id:'m2',title:'Flint Hills Invitational',event_type:'MEET'},day:local(4)},
    {school_id:'manhattan-ks',school:'Manhattan High School',sport:'Basketball',e:{id:'m3',title:'Boys · Manhattan vs Salina South',opponent:'Salina South',team_label:'Boys',event_type:'GAME'},day:local(40),time:'7:00 PM'},
    {school_id:'not-a-favorite',school:'Other',sport:'Football',e:{id:'o1',title:'Other vs X',opponent:'X'},day:local(3)}
  ];
  const {mine}=api.weekSections(feed);
  assert.equal(mine.filter(x=>x.g?.id==='a').length,1,'the official game and ESPN\'s are one card');
  assert.equal(mine.find(x=>x.g?.id==='a').fid,'k1','ESPN\'s card stands for the official game');
  assert.ok(mine.some(x=>x.g?.id==='b'),'a game only ESPN lists still shows');
  assert.deepEqual(mine.filter(x=>x.f).map(x=>x.f.e.id).sort(),['m1','m2'],'high school game and meet; not beyond next Sunday, not other teams');
  const hs=api.weekCard(mine.find(x=>x.f?.e.id==='m1'));
  const rows=hs.match(/<div class="wk-row">[\s\S]*?<\/span><\/div>/g);
  assert.match(rows[0],/wk-mono[^>]*>MHS<[\s\S]*wk-name mine">Manhattan<[\s\S]*wk-time">6:00 PM</,'the school away, on top, in gold, with its initials');
  assert.match(rows[1],/wk-mono[^>]*>HAYS<[\s\S]*wk-name">Hays</);
  assert.match(hs,/wk-tag">Girls Basketball · High school</);
  assert.match(hs,/data-open-team="manhattan-ks" data-open-sport="Basketball"/);
  const meet=api.weekCard(mine.find(x=>x.f?.e.id==='m2'));
  assert.equal((meet.match(/class="wk-row"/g)||[]).length,1,'a meet is one row');
  assert.match(meet,/Flint Hills Invitational[\s\S]*wk-time tba">TBA</);
  assert.ok(!/<img/.test(hs+meet+api.weekCard(mine.find(x=>x.g?.id==='a'))),'no logos');
  const coming=[{school_id:'kstate',sport:'Football',e:{id:'k1'},day:aDay},{school_id:'manhattan-ks',sport:'Basketball',e:{id:'m1'},day:local(3)},{school_id:'manhattan-ks',sport:'Basketball',e:{id:'m3'},day:local(40)}];
  assert.deepEqual(api.withoutWeek(coming,mine).map(x=>x.e.id),['m3'],'Coming up keeps only what is after next Sunday');
  env.teams=['kstate','kansas-city-chiefs'];
}
assert.match(page,/weekSection\('The week ahead',week\.mine\)/,'My Teams after Today');
assert.match(page,/weekSection\('The week ahead · Everywhere',week\.others,true\)/,'Everywhere');
assert.match(page,/'The week ahead':\['upcoming','The week ahead'/,'the My Teams banner');
assert.match(page,/loadWeek\(signal\)/,'loaded with Home');
assert.match(page,/const HOME_AHEAD_DAYS=14,/,'Home reads every favorite sport playing through next Sunday');
assert.match(page,/feed\.querySelectorAll\('\[data-week-day\]'\)/,'day buttons wired');
assert.match(page,/feed\.querySelectorAll\('\[data-week-alerts\]'\)/,'the bell opens Alerts');
console.log('home-week: ok (ESPN boards a day at a time, My Teams and Everywhere, ESPN\'s matchup card, day buttons)');
