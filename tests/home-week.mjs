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
const api=Function('esc','countdownAt','homeTeams','catalogEntry','knownColors','search','marqueeOf','slug','sectionHead','homeSectionOpen','comingDay','apiFetch','homeMode','render','displayedGroups','viewerTimeZone','env','document',
  block.replace(/\bhomeView\b/g,'env.homeView').replace(/\bcurrentView\b/g,'env.view')+';return{weekSections,weekTile,weekHero,weekSpotlight,withoutWeek,weekRequestDays,weekBounds,weekSection,set:m=>{weekDays=m},setDay:d=>{weekPickDay=d}};')(
  esc,t=>{const ms=t-Date.now();return ms>0?{t,d:Math.floor(ms/864e5),h:Math.floor(ms%864e5/36e5),m:Math.floor(ms%36e5/6e4),s:Math.floor(ms%6e4/1e3)}:null},()=>env.teams,id=>catalog[id],()=>null,{get value(){return env.q}},()=>['#fff','●'],s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-'),(t,sub)=>`<h2>${t}</h2><p>${sub}</p>`,t=>`<section id="${t}">`,x=>({day:x.day,at:x.at??Date.parse(`${x.day}T18:00:00Z`),time:x.time??null}),null,()=>true,()=>{},()=>[],'America/Chicago',env,{querySelector:()=>({hidden:false,classList:{contains:()=>false}})});
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
  {id:'a',sport:'Football',level:'college',start_utc:iso(2),away:side('arizona','Arizona',{rank:19,color:'#AB0520'}),home:side('kstate','Kansas State'),odds:{line:'-7.5',favorite:'away',total:51.5},tv:['FS1'],featured:true},
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
  // A tile: both teams in their own colors (no logos), the favorite highlighted.
  const tile=api.weekTile(mine.find(x=>x.g.id==='a'));
  assert.match(tile,/class="wk-tile fav"[^>]*data-open-team="kstate"[^>]*data-open-sport="Football"/,'the favorite\'s tile, highlighted, opens its football');
  assert.match(tile,/class="wk-bar"><i style="background:#AB0520"><\/i>/,'the away team\'s ESPN color on the bar');
  assert.match(tile,/style="background:#AB0520;color:#fff">ARI<\/span><b><small>19<\/small>Arizona<\/b>/,'away: color badge, rank, name');
  assert.match(tile,/>KAN<\/span><b class="me">Kansas State<\/b>/,'home: the favorite in gold');
  assert.match(tile,/wk-when">\d{1,2}:\d{2} [AP]M<\/span><span class="wk-pill">FS1</,'time and TV');
  assert.match(tile,/wk-odds">ARI -7\.5 · O\/U 51\.5</,'the line on the favored team, the total');
  assert.match(api.weekTile(mine.find(x=>x.g.id==='b')),/wk-tag"><span class="wk-star"[^>]*>★<\/span>NFL</,'a pro game names its league');
  const other=api.weekTile(others.find(x=>x.g.id==='c'));
  assert.match(other,/class="wk-tile"/,'another team\'s game is not highlighted');
  assert.match(other,/background:#3b4a5e/,'no color known: gray');
  // Coming up drops a game the week ahead shows.
  const coming=[{school_id:'kstate',sport:'Football',e:{},day:mine.find(x=>x.g.id==='a').day},{school_id:'kstate',sport:'Volleyball',e:{},day:mine[0].day}];
  assert.deepEqual(api.withoutWeek(coming,mine).map(x=>x.sport),['Volleyball']);
  // One list: the day buttons, then the day's games, the viewer's first.
  const section=api.weekSection({mine,others});
  assert.match(section,/class="wk-hero"/,'the spotlight leads');
  assert.match(section,/class="wk-days"[\s\S]*data-week-day="[\d-]+"[^>]*aria-pressed="true"/,'day buttons, the first chosen');
  assert.match(section,/<u>★1<\/u>/,'a day with a favorite game shows the star count');
  assert.match(section,/data-week-alerts>[\s\S]*?Get alerts</,'the alerts bell');
  assert.equal(api.weekSection({mine:[],others:[]}),'','no games, no section');
  const aDayHtml=(api.setDay(mine.find(x=>x.g.id==='a').day),api.weekSection({mine:mine.filter(x=>x.g.id!=='a'||true),others}));
  const order=[...aDayHtml.matchAll(/class="wk-tile( fav)?"/g)].map(m=>Boolean(m[1]));
  assert.ok(order.indexOf(false)<0||order.lastIndexOf(true)<order.indexOf(false),'the viewer\'s games come first');
  assert.ok(aDayHtml.includes('Duke')&&!aDayHtml.includes('Alpha'),'featured games first; the rest behind Show all');
  assert.match(aDayHtml,/data-week-more="[\d-]+\|college\|Basketball">Show all 2 Basketball games/,'Show all for that day and sport');
  assert.match(aDayHtml,/class="mq-group wk-sport"[^>]*><div class="sport-marquee"[^>]*id="week-college-basketball"[\s\S]*mq-name">Basketball<\/span><span class="mq-count">2 games</,'each sport under its marquee sign (user, November 21)');
  assert.match(aDayHtml,/<section class="wk-level wk-lv-college"[^>]*><div class="wk-lhead" id="week-college"[^>]*><span class="wk-lname">College<\/span>/,'each level under its own banner (user, November 21: "sections by middle school, highschool, college, and pro")');
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
    {school_id:'manhattan-ks',school:'Manhattan High School',sport:'Wrestling',e:{id:'m4',title:'Boys · Manhattan at Junction City',opponent:'Junction City',team_label:'Boys',event_type:'GAME'},day:local(0),time:'11:59 PM'},
    {school_id:'manhattan-ks',school:'Manhattan High School',sport:'Basketball',e:{id:'m3',title:'Boys · Manhattan vs Salina South',opponent:'Salina South',team_label:'Boys',event_type:'GAME'},day:local(40),time:'7:00 PM'},
    {school_id:'not-a-favorite',school:'Other',sport:'Football',e:{id:'o1',title:'Other vs X',opponent:'X'},day:local(3)}
  ];
  const {mine}=api.weekSections(feed);
  assert.equal(mine.filter(x=>x.g?.id==='a').length,1,'the official game and ESPN\'s are one card');
  assert.equal(mine.find(x=>x.g?.id==='a').fid,'k1','ESPN\'s card stands for the official game');
  assert.ok(mine.some(x=>x.g?.id==='b'),'a game only ESPN lists still shows');
  assert.deepEqual(mine.filter(x=>x.f).map(x=>x.f.e.id).sort(),['m1','m2','m4'],'high school game and meet, today\'s game too (Today folded in); not beyond next Sunday, not other teams');
  const hs=api.weekTile(mine.find(x=>x.f?.e.id==='m1'));
  assert.match(hs,/class="wk-tile fav"[^>]*data-open-team="manhattan-ks" data-open-sport="Basketball"/,'a favorite\'s tile is highlighted and opens the team');
  assert.match(hs,/wk-tag"><span class="wk-star"[^>]*>★<\/span>Girls Basketball</);
  assert.match(hs,/class="wk-chip long"[^>]*>MHS<\/span><b class="me">Manhattan<\/b>[\s\S]*class="wk-chip"[^>]*>HAYS<|class="wk-chip"[^>]*>MHS<\/span><b class="me">Manhattan<\/b>[\s\S]*>HAYS</,'"Manhattan at Hays": the school first, in gold');
  assert.match(hs,/wk-when">6:00 PM</);
  const meet=api.weekTile(mine.find(x=>x.f?.e.id==='m2'));
  assert.equal((meet.match(/class="wk-tm"/g)||[]).length,1,'a meet is one row: its name');
  assert.match(meet,/Flint Hills Invitational[\s\S]*wk-when tba">TBA</);
  assert.ok(!/<img/.test(hs+meet+api.weekTile(mine.find(x=>x.g?.id==='a'))),'no logos');
  const coming=[{school_id:'kstate',sport:'Football',e:{id:'k1'},day:aDay},{school_id:'manhattan-ks',sport:'Basketball',e:{id:'m1'},day:local(3)},{school_id:'manhattan-ks',sport:'Basketball',e:{id:'m3'},day:local(40)}];
  assert.deepEqual(api.withoutWeek(coming,mine).map(x=>x.e.id),['m3'],'Coming up keeps only what is after next Sunday');
  // The spotlight: the next favorite game with a time (Manhattan wrestling tonight, 11:59 PM).
  const spot=api.weekSpotlight(mine);
  assert.ok(spot,'a spotlight');assert.ok(mine.every(x=>!(x.at>Date.now())||(x.g?x.g.time_tba:!x.time)||x.at>=spot.at),'the soonest');
  const hero=api.weekHero(spot);
  assert.match(hero,/class="wk-hero"[^>]*aria-label="Next up: /);
  assert.match(hero,/data-countdown-at="\d+"[\s\S]*data-unit="h"[\s\S]*data-unit="m"[\s\S]*data-unit="s"/,'a live countdown');
  // Levels: those with the viewer's games first, then college, pro, high school, middle school.
  api.setDay(local(3));
  const lvHtml=api.weekSection({mine,others:[]});
  assert.match(lvHtml,/wk-lv-high-school/,'a high school level');
  const levelOrder=[...lvHtml.matchAll(/<section class="wk-level wk-lv-([a-z-]+)"/g)].map(m=>m[1]);
  assert.ok(levelOrder.includes('high-school'),'the high school game\'s day has a High school section');
  env.teams=['kstate','kansas-city-chiefs'];
}
assert.match(page,/homeSection\(mine,live,'live'\)\+weekHtml\+\(spot\?'':nextUpBox\(todays,coming\)\)/,'the week ahead right after Live now; its spotlight stands in for the countdown box');
assert.ok(!/The week ahead · Everywhere/.test(page),'one combined section (user, November 21)');
assert.ok(!/'The week ahead':\['upcoming'/.test(page),'not a My Teams-only banner: everyone\'s games are in it');
assert.match(page,/loadWeek\(signal\)/,'loaded with Home');
assert.match(page,/const HOME_AHEAD_DAYS=14,/,'Home reads every favorite sport playing through next Sunday');
assert.match(page,/feed\.querySelectorAll\('\[data-week-day\]'\)/,'day buttons wired');
assert.match(page,/feed\.querySelectorAll\('\[data-week-more\]'\)/,'Show all wired');
assert.match(page,/feed\.querySelectorAll\('\.wk-tile\[data-open-team\],\.wk-hero\[data-open-team\]'\)/,'tiles and the spotlight open the team');
assert.match(page,/feed\.querySelectorAll\('\[data-week-alerts\]'\)/,'the bell opens Alerts');
console.log('home-week: ok (ESPN boards a day at a time; design B: spotlight, day buttons, tiles in team colors, favorites highlighted)');
