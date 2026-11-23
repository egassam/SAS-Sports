// European soccer (user, November 23, 2026: "Add more pro", then "1 then 4"):
// Pro → Soccer → Premier League (20 clubs of 2026-27) and Champions League
// (the 36 clubs of the 2026-27 league phase), read from ESPN like MLS.
// Fixtures from ESPN, saved Nov 23, 2026: Arsenal's Premier League results
// (11 matches, 9-1-1) and fixtures, the 2-2 at Newcastle's summary, the
// Premier League table; Arsenal's Champions League 2026-27 (league phase) and
// 2025-26 (league phase through the final, lost on penalties), and the
// league phase table.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,espnLeagueStandings} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}-2026-11-23.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js');
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,inSeason,liveNowBoards,schoolTimeZone,groupEvents,scoreboardTeamMatchesSchool};')(...Object.values(deps));
const LONDON='Europe/London',now=new Date('2026-11-23T18:00:00Z');

// Catalog: 20 Premier League clubs and 36 Champions League clubs, one table
// each (the Team box heads them by league). The five English clubs in the
// Champions League are entries of both leagues, `-ucl` for the second.
const epl=schools.filter(s=>s.league==='Premier League'),ucl=schools.filter(s=>s.league==='Champions League');
assert.equal(epl.length,20);
assert.equal(ucl.length,36);
for(const [list,league,path] of [[epl,'Premier League','soccer/eng.1'],[ucl,'Champions League','soccer/uefa.champions']])for(const s of list){
  assert.deepEqual([s.level,s.pro_sport,s.conference,s.division],['pro','Soccer',league,league],s.id);
  assert.deepEqual(sponsoredSports[s.id],['Soccer']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  assert.notEqual(teamThemes[s.id].primary,'#FFFFFF',s.id);
  const config=proTeam(s.id);
  assert.deepEqual([config.kind,config.sport,config.espn.path,config.fixtures],['espn-team','Soccer',path,true],s.id);
  assert.equal(s.providers[0].provider_school_id,String(config.espn.id),s.id);
  assert.match(config.schedule,/^https:\/\//,s.id);
  assert.match(w.schoolTimeZone(s),/^(?:Europe|Asia)\//,s.id);
}
assert.equal(new Set(epl.map(s=>proTeam(s.id).espn.team)).size,20);
assert.equal(new Set(ucl.map(s=>proTeam(s.id).espn.team)).size,36);
assert.ok(ucl.every(s=>s.id.endsWith('-ucl')));
assert.deepEqual(ucl.filter(s=>epl.some(e=>`${e.id}-ucl`===s.id)).map(s=>s.name),['Arsenal','Aston Villa','Liverpool','Manchester City','Manchester United']);
const arsenal=epl.find(s=>s.id==='arsenal'),arsenalUcl=ucl.find(s=>s.id==='arsenal-ucl');
assert.equal(w.schoolTimeZone(arsenal),LONDON);
assert.equal(w.schoolTimeZone(ucl.find(s=>s.id==='real-madrid-ucl')),'Europe/Madrid');
assert.equal(w.schoolTimeZone(ucl.find(s=>s.id==='sabah-ucl')),'Asia/Baku');
// In season: the Premier League August to May, the Champions League
// September to June (its final); Home reads both boards then.
for(const path of ['soccer/eng.1','soccer/uefa.champions'])assert.ok(w.liveNowBoards(now).some(b=>b.path===path&&b.level==='pro'),path);
assert.ok(!w.liveNowBoards(new Date('2027-07-10T20:00:00Z')).some(b=>b.path==='soccer/eng.1'||b.path==='soccer/uefa.champions'));
assert.ok(w.liveNowBoards(new Date('2027-05-29T20:00:00Z')).some(b=>b.path==='soccer/uefa.champions'));
// A board's Arsenal is the entry of that board's league.
assert.ok(w.scoreboardTeamMatchesSchool({id:'359',location:'Arsenal',name:'Arsenal',displayName:'Arsenal',shortDisplayName:'Arsenal',abbreviation:'ARS'},arsenal));

// Arsenal in the Premier League: 11 results (9-1-1, as ESPN's table), 27
// coming matches, home and away, TV and grounds.
const config=PRO_TEAMS.arsenal;
const games=espnTeamGames([json('epl-ars-2026'),json('epl-ars-2026-fixtures')],{school:arsenal,config,timeZone:LONDON,now});
assert.equal(games.length,38);
assert.equal(w.seasonRecords(games)[0].text,'9-1-1');
assert.deepEqual(games.slice(0,2).map(e=>[e.status,e.title,e.headline,e.home_away,e.venue]),[
  ['Final','Arsenal at Newcastle United','T 2-2','away',"St. James' Park"],
  ['Final','Arsenal vs Hull City','W 1-0','home','Emirates Stadium']
]);
const next=games.find(e=>e.status==='Upcoming');
assert.deepEqual([next.title,next.display_time,next.start_time],['Arsenal vs Manchester City','Nov 29, 4:30 PM','2026-11-29T16:30:00.000Z']);
assert.ok(games.every(e=>!e.postseason&&!e.round));
assert.equal(w.groupEvents(games,now)[0].in_season,true);

// The expanded view of the 2-2 at Newcastle: result, halftime, scorers;
// score by half, team stats and every goal with its assist.
const details=espnGameHighlights(games[0],json('epl-sum-401879232'),config);
assert.deepEqual(details.lines,[
  "Arsenal drew with Newcastle United 2-2 away (St. James' Park).",
  'Arsenal led 1-0 at halftime.',
  "Arsenal goals: Eberechi Eze 33'; Noni Madueke 78'."
]);
assert.deepEqual(details.box_score.line.map(p=>[p.label,p.ours,p.theirs]),[['1st','1','0'],['2nd','1','2']]);
assert.deepEqual(details.box_score.stats[0],{label:'Possession',ours:'66.4%',theirs:'33.6%'});
assert.deepEqual(details.box_score.scoring.map(g=>[g.clock,g.text,g.score]),[
  ["33'",'Eberechi Eze (assist: Kai Havertz)','1-0'],["49'",'Harvey Barnes (assist: William Osula)','1-1'],
  ["62'",'Malick Thiaw (assist: Joe Willock)','1-2'],["78'",'Noni Madueke (assist: Martin Ødegaard)','2-2']
]);

// The Premier League table: one, by ESPN's rank, W-L-D and points.
const table=espnLeagueStandings(json('espn-standings-soccer-eng-1'),{config});
assert.deepEqual(table.map(t=>[t.title,t.rows.length]),[['Premier League',20]]);
assert.deepEqual(table[0].columns.map(c=>c.label),['GP','W-L-D','Pts']);
assert.deepEqual(table[0].rows.slice(0,2).map(r=>[r.pos,r.name,r.values.record,r.values.pts,Boolean(r.own)]),[[1,'Arsenal','9-1-1','28',true],[2,'Brighton & Hove Albion','7-3-1','22',false]]);
assert.deepEqual(table[0].source,{name:'ESPN standings (2026-27 season)',url:'https://www.espn.com/soccer/standings/_/league/eng.1'});

// Arsenal in the Champions League, 2026-27: the league phase's eight
// matches, four played (3-0-1), each labeled as the league phase.
const uclConfig=PRO_TEAMS['arsenal-ucl'];
const league=espnTeamGames([json('ucl-ars-2026'),json('ucl-ars-2026-fixtures')],{school:arsenalUcl,config:uclConfig,timeZone:LONDON,now});
assert.equal(league.length,8);
assert.equal(w.seasonRecords(league)[0].text,'3-0-1');
assert.ok(league.every(e=>e.round==='Champions League · League Phase'&&!e.postseason));
assert.deepEqual(league.filter(e=>e.status==='Upcoming').map(e=>e.title),['Arsenal vs Borussia Dortmund','Arsenal vs Real Madrid','Arsenal at Real Betis','Arsenal vs Sabah FK']);
const uclTable=espnLeagueStandings(json('espn-standings-soccer-uefa-champions'),{config:uclConfig});
assert.deepEqual(uclTable.map(t=>[t.title,t.rows.length]),[['League Phase',36]]);
assert.ok(uclTable[0].rows.some(r=>r.own&&r.name==='Arsenal'&&r.values.record==='3-0-1'));
assert.equal(uclTable[0].source.url,'https://www.espn.com/soccer/standings/_/league/uefa.champions');

// 2025-26 (the season read by name holds every stage): the knockout rounds
// by round and leg, out of the record (the league phase's 8-0), the
// aggregate on the second leg, and the final at a neutral ground, lost on
// penalties (ESPN gives the shootout only in its note).
const june=new Date('2026-06-10T12:00:00Z');
const past=espnTeamGames([json('ucl-ars-2025')],{school:arsenalUcl,config:uclConfig,timeZone:LONDON,now:june});
assert.equal(past.length,15);
assert.equal(w.seasonRecords(past)[0].text,'8-0');
assert.deepEqual(past.filter(e=>e.postseason).map(e=>[e.title,e.headline,e.round,e.results.find(r=>r.label==='Aggregate')?.value||null]),[
  ['Arsenal vs Paris Saint-Germain','L 1-1 (3-4 PK)','Champions League · Final',null],
  ['Arsenal vs Atlético Madrid','W 1-0','Champions League · Semifinals · 2nd leg','Arsenal advance 2-1 on aggregate'],
  ['Arsenal at Atlético Madrid','T 1-1','Champions League · Semifinals · 1st leg',null],
  ['Arsenal vs Sporting CP','T 0-0','Champions League · Quarterfinals · 2nd leg','Arsenal advance 1-0 on aggregate'],
  ['Arsenal at Sporting CP','W 1-0','Champions League · Quarterfinals · 1st leg',null],
  ['Arsenal vs Bayer Leverkusen','W 2-0','Champions League · Round of 16 · 2nd leg','Arsenal advance 3-1 on aggregate'],
  ['Arsenal at Bayer Leverkusen','T 1-1','Champions League · Round of 16 · 1st leg',null]
]);
assert.deepEqual([past[0].home_away,past[0].venue],['neutral','Puskás Aréna']);
console.log('European soccer module: 20 Premier League and 36 Champions League clubs, results, knockouts, expanded final and tables OK');
