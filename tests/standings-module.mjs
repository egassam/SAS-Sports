// Standings (user, November 11, 2026: "Something we should add to auto racing
// and probably other sports is the overall team/driver standings"). Fixtures
// of November 11, 2026: formula1.com's 2026 drivers' and teams' standings
// (trimmed to the table), NASCAR's Cup Series points feed, IMSA's Road Atlanta
// WeatherTech folder, its official points folder and the GTP drivers' and
// teams' standings (sessions trimmed).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {f1Standings,nascarStandings,imsaPointsFolders,imsaStandingsFiles,imsaStandingsTable,standingsTable} from '../src/pro-sports.mjs';
const raw=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8');
const json=name=>JSON.parse(raw(name).replace(/^﻿/,''));
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const worker=read('../src/index.js'),page=read('../public/index.html');

// Formula 1: drivers (with team) and constructors, from formula1.com.
const f1=f1Standings(raw('f1-standings-drivers-2026-11-11.html'),raw('f1-standings-teams-2026-11-11.html'),{year:2026});
assert.deepEqual(f1.map(t=>t.title),['Drivers','Constructors']);
assert.deepEqual(f1[0].rows.slice(0,3),[
  {pos:'1',name:'Kimi Antonelli',detail:'Mercedes',points:390},
  {pos:'2',name:'Max Verstappen',detail:'Red Bull Racing',points:279},
  {pos:'3',name:'George Russell',detail:'Mercedes',points:262}]);
assert.equal(f1[0].rows.length,25);
assert.deepEqual(f1[1].rows[0],{pos:'1',name:'Mercedes',detail:'',points:652});
assert.equal(f1[1].rows.length,11);
assert.equal(f1[0].source.url,'https://www.formula1.com/en/results/2026/drivers');
assert.deepEqual(f1Standings('','',{year:2026}),[],'an unread page is no table');

// NASCAR: the points feed the races already read; car, make and wins.
const cup=nascarStandings(json('nascar-points-2026-11-11.json'),{url:'https://cf.nascar.com/cacher/2026/1/racinginsights-points-feed.json'});
assert.equal(cup.length,1);assert.equal(cup[0].title,'Drivers');assert.equal(cup[0].wins,true);
assert.deepEqual(cup[0].rows.slice(0,2),[
  {pos:1,name:'Kyle Larson',detail:'#5 · Chevrolet',points:2501,wins:3},
  {pos:2,name:'Christopher Bell',detail:'#20 · Toyota',points:2452,wins:1}]);
assert.equal(cup[0].rows.length,41);
assert.deepEqual(nascarStandings(null),[]);

// IMSA: the points folders (official first), the championship's drivers' and
// teams' files by class (no bronze or award files), and each table.
assert.deepEqual(imsaPointsFolders(raw('imsa-road-atlanta-weathertech-2026.html')).map(e=>e.name),['POINTS DATA - Official','Points Data - Provisional']);
const files=imsaStandingsFiles(raw('imsa-road-atlanta-points-official-2026.html'),'weathertech');
assert.deepEqual(files.map(f=>f.name),['IWSC 01 GTP Drivers.json','IWSC 02 GTP Teams.json','IWSC 04 LMP2 Drivers.json','IWSC 05 LMP2 Teams.json','IWSC 08 GTDPRO Drivers.json','IWSC 09 GTDPRO Teams.json','IWSC 11 GTD Drivers.json','IWSC 12 GTD Teams.json']);
assert.deepEqual(imsaStandingsFiles(raw('imsa-road-atlanta-points-official-2026.html'),'pilotChallenge'),[],'IMPC files are the Pilot Challenge\'s');
const championship='IMSA WeatherTech SportsCar Championship';
const gtp=imsaStandingsTable(json('imsa-iwsc-gtp-drivers-2026.json'),{championship});
assert.equal(gtp.title,'GTP Drivers');assert.deepEqual(gtp.rows[0],{pos:1,name:'Jack Aitken',detail:'',points:3020});
const gtpTeams=imsaStandingsTable(json('imsa-iwsc-gtp-teams-2026.json'),{championship});
assert.equal(gtpTeams.title,'GTP Teams');assert.deepEqual(gtpTeams.rows[0],{pos:1,name:'Cadillac Whelen',detail:'#31',points:3020});
assert.equal(imsaStandingsTable({championship:{main_title:'x'},classification:[]}),null);
assert.equal(imsaStandingsTable({championship:{main_title:'IMSA WeatherTech SportsCar Championship GTDPRO Drivers'},classification:[{position:1,key:'A',total_points:1}]},{championship}).title,'GTD PRO Drivers');
assert.equal(standingsTable('Drivers',[{name:'',points:1}]),null,'no named row: no table');

// The Worker: each series' build returns its standings, and the grouped feed
// carries them for the sport (saved copies included).
assert.ok(worker.includes('const standings=nascarStandings(points,{url:pointsUrl});'));
assert.ok(worker.includes('const standings=f1Standings(driversHtml,teamsHtml,{year});'));
assert.ok(worker.includes('const standings=await imsaStandingsOf(seriesFolders,config);'));
assert.ok(worker.includes('if(Array.isArray(result.standings)&&result.standings.length)for(const group of groups)group.standings=result.standings;'));

// The page: the block's markup from the page's own function.
const start=page.indexOf('const STANDINGS_SHOWN=5'),end=page.indexOf('feed.addEventListener(\'click\',ev=>{\n  const button=ev.target.closest(\'[data-st-tab],[data-st-all]\')');
assert.ok(start>0&&end>start);
const ctx={esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),Map};
vm.runInNewContext(`${page.slice(start,end)};this.standingsBlock=standingsBlock;this.standingsState=standingsState;`,ctx);
const group={school_id:'formula-1',school:'Formula 1 World Championship',sport:'Auto Racing',standings:f1};
let html=ctx.standingsBlock(group);
assert.match(html,/Standings/);assert.match(html,/data-st-tab="1">Constructors</);
assert.equal((html.match(/<tr><td class="st-pos">/g)||[]).length,5,'top 5');
assert.match(html,/Kimi Antonelli<\/b><span>Mercedes<\/span>/);
assert.match(html,/<b>279<\/b><span>−111<\/span>/,'points behind the leader');
assert.match(html,/Show all 25/);
ctx.standingsState.set('formula-1|Auto Racing',{tab:1,all:true});
html=ctx.standingsBlock(group);
assert.equal((html.match(/<tr><td class="st-pos">/g)||[]).length,11,'all constructors');
assert.match(html,/<th>Team<\/th>/);assert.match(html,/Show top 5/);
assert.match(ctx.standingsBlock({school_id:'nascar-cup-series',sport:'Auto Racing',standings:cup}),/<th class="st-num">Wins<\/th>/);
assert.equal(ctx.standingsBlock({sport:'Auto Racing'}),'','no standings: nothing');
assert.ok(page.includes("${standingsBlock(g)}${section('Recent Results',g.results,'results')}"));

console.log('standings: ok (F1 25 drivers and 11 constructors, NASCAR 41 drivers, IMSA GTP drivers and teams)');
