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
import {f1Standings,nascarStandings,imsaPointsFolders,imsaStandingsFiles,imsaStandingsTable,standingsTable,espnLeagueStandings,espnStandingsUrl,proTeam} from '../src/pro-sports.mjs';
const raw=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8');
const json=name=>JSON.parse(raw(name).replace(/^﻿/,''));
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const worker=read('../src/index.js'),page=read('../public/index.html');
const PRO_TEAM_IDS=[...read('../src/pro-sports.mjs').matchAll(/^  '([a-z0-9-]+)':\{kind:'espn-team'/gm)].map(m=>m[1]);

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

// Team leagues (ESPN's league standings, fixtures of November 11, 2026, trimmed
// to the fields read): the team's division, its conference and the other one
// by seed; MLS's two conferences by rank. The team's own row is marked.
const league=name=>json(`espn-standings-${name}-2026-11-11.json`);
const of=(name,id)=>espnLeagueStandings(league(name),{config:proTeam(id)});
assert.equal(espnStandingsUrl('football/nfl'),'https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3');
const chiefs=of('football-nfl','kansas-city-chiefs');
assert.deepEqual(chiefs.map(t=>`${t.title} ${t.rows.length}`),['AFC West 4','AFC 16','NFC 16']);
assert.deepEqual(chiefs[0].columns.map(c=>c.label),['W-L','Pct','Div']);
assert.deepEqual(chiefs[0].rows.map(r=>r.name),['Denver Broncos','Kansas City Chiefs','Las Vegas Raiders','Los Angeles Chargers']);
assert.deepEqual(chiefs[0].rows[1],{pos:2,name:'Kansas City Chiefs',detail:'Streak W1',values:{record:'6-2',pct:'.750',div:'3-1',gp:'8',pts:'',gb:'0.5'},own:true});
assert.deepEqual(chiefs[1].rows.slice(0,3).map(r=>`${r.pos} ${r.name}`),['1 Buffalo Bills','2 Denver Broncos','3 Jacksonville Jaguars'],'conference by seed');
assert.equal(chiefs[0].source.name,'ESPN standings (2026 season)');assert.equal(chiefs[0].source.url,'https://www.espn.com/nfl/standings');
const celtics=of('basketball-nba','boston-celtics');
assert.deepEqual(celtics.map(t=>t.title),['Atlantic','Eastern Conference','Western Conference']);
assert.deepEqual(celtics[0].rows.map(r=>`${r.name} ${r.values.record} ${r.values.gb}`),['Boston Celtics 9-2 —','Philadelphia 76ers 9-3 0.5','New York Knicks 6-4 2.5','Toronto Raptors 5-5 3.5','Brooklyn Nets 2-8 6.5']);
assert.equal(celtics[0].rows[0].detail,'Streak W4 · Last\u00a010\u00a09\u20111');
const kraken=of('hockey-nhl','seattle-kraken');
assert.deepEqual(kraken.map(t=>`${t.title} ${t.rows.length}`),['Pacific Division 8','Western Conference 16','Eastern Conference 16']);
assert.deepEqual(kraken[0].columns.map(c=>c.label),['GP','W-L-OT','Pts']);
assert.deepEqual(kraken[0].rows[3],{pos:4,name:'Seattle Kraken',detail:'Streak L1',values:{record:'9-6-1',pct:'',div:'3-3-0, 0 PTS',gp:'16',pts:'19',gb:'3.5'},own:true});
const royals=of('baseball-mlb','kansas-city-royals');
assert.deepEqual(royals.map(t=>t.title),['American League Central','AL','NL']);
assert.deepEqual(royals[0].rows.map(r=>`${r.pos} ${r.name} ${r.values.record} ${r.values.gb}`),['1 Cleveland Guardians 85-77 —','2 Chicago White Sox 84-78 1','3 Minnesota Twins 77-85 8','4 Detroit Tigers 76-86 9','5 Kansas City Royals 69-93 16']);
assert.equal(royals[0].rows[4].own,true);
const sporting=of('soccer-usa','sporting-kansas-city');
assert.deepEqual(sporting.map(t=>`${t.title} ${t.rows.length}`),['Western Conference 15','Eastern Conference 15'],'MLS: no divisions');
assert.deepEqual(sporting[0].columns.map(c=>c.label),['GP','W-L-D','Pts']);
assert.deepEqual(sporting[0].rows[0],{pos:1,name:'Vancouver Whitecaps',detail:'Goal difference +40',values:{record:'19-8-7',pct:'',div:'',gp:'34',pts:'64',gb:'—'}});
assert.equal(sporting[0].rows[14].name,'Sporting Kansas City');assert.equal(sporting[0].rows[14].own,true);
assert.equal(sporting[0].source.url,'https://www.espn.com/soccer/standings/_/league/usa.1');
// Every team of the five leagues finds its own row, once, in its first table.
for(const [name,path] of [['football-nfl','football/nfl'],['basketball-nba','basketball/nba'],['hockey-nhl','hockey/nhl'],['baseball-mlb','baseball/mlb'],['soccer-usa','soccer/usa.1']]){
  const payload=league(name);
  let teams=0;
  for(const id of PRO_TEAM_IDS.filter(id=>proTeam(id).espn?.path===path)){
    const tables=espnLeagueStandings(payload,{config:proTeam(id)});teams++;
    assert.equal(tables[0].rows.filter(r=>r.own).length,1,`${id}: own row`);
    assert.equal(tables.reduce((n,t)=>n+t.rows.filter(r=>r.own).length,0),path==='soccer/usa.1'?1:2,`${id}: division and conference`);
  }
  assert.equal(teams,{'football/nfl':32,'basketball/nba':30,'hockey/nhl':32,'baseball/mlb':30,'soccer/usa.1':30}[path]);
}
assert.deepEqual(espnLeagueStandings(null,{config:proTeam('kansas-city-chiefs')}),[],'an unread league is no table');
assert.deepEqual(espnLeagueStandings(league('football-nfl'),{config:proTeam('formula-1')}),[],'not a team league');

// The Worker: each series' build returns its standings, and the grouped feed
// carries them for the sport (saved copies included).
assert.ok(worker.includes('const standings=nascarStandings(points,{url:pointsUrl});'));
assert.ok(worker.includes('const standings=f1Standings(driversHtml,teamsHtml,{year});'));
assert.ok(worker.includes('const standings=await imsaStandingsOf(seriesFolders,config);'));
assert.ok(worker.includes('const standings=espnLeagueStandings(standingsPayload,{config});'));
assert.ok(worker.includes("readJson(standingsUrl,SOURCE_TTL.article)"),'one league read, kept 30 minutes');
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
// A team league's table: its columns, the own row marked and kept below the top 5.
const sportingGroup={school_id:'sporting-kansas-city',sport:'Soccer',standings:sporting};
html=ctx.standingsBlock(sportingGroup);
assert.match(html,/<th class="st-num st-c-gp">GP<\/th><th class="st-num st-c-record">W-L-D<\/th><th class="st-num st-c-pts">Pts<\/th>/);
assert.match(html,/<th>Team<\/th>/);assert.match(html,/st-table st-cols/);
assert.equal((html.match(/<tr( class="st-own")?><td class="st-pos">/g)||[]).length,6,'top 5 and the team');
assert.match(html,/<tr class="st-own"><td class="st-pos">15<\/td><td class="st-name"><b>Sporting Kansas City<\/b><span>Goal difference -41<\/span><\/td><td class="st-num st-c-gp">34<\/td><td class="st-num st-c-record">7-22-5<\/td><td class="st-num st-c-pts">26<\/td><\/tr>/);
assert.match(html,/Show all 15/);assert.match(html,/data-st-tab="1">Eastern Conference</);
html=ctx.standingsBlock({school_id:'kansas-city-chiefs',sport:'Football',standings:chiefs});
assert.equal((html.match(/<tr( class="st-own")?><td class="st-pos">/g)||[]).length,4,'a division of 4');
assert.match(html,/data-st-tab="0">AFC West</);
assert.ok(page.includes("${standingsBlock(g)}${section('Recent Results',g.results,'results')}"));

console.log('standings: ok (F1 25 drivers and 11 constructors, NASCAR 41 drivers, IMSA GTP drivers and teams; NFL, NBA, NHL, MLB, MLS: 154 teams)');
