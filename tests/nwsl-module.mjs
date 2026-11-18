// National Women's Soccer League (user, November 18, 2026: "Add NWSL next"):
// Pro → Soccer → NWSL → all 16 clubs of 2026, read from ESPN like MLS.
// Fixtures from ESPN, saved Nov 18, 2026: the Kansas City Current's results
// (30 league matches, 16-9-5; quarterfinal 1-0 in extra time over Angel City,
// semifinal 2-1 at Gotham) and fixtures (the NWSL Championship at Washington,
// Nov 21), the semifinal's summary, and the league table.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,espnLeagueStandings} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}-2026-11-18.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js');
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,inSeason,liveNowBoards,schoolTimeZone,groupEvents,scoreboardTeamMatchesSchool};')(...Object.values(deps));
const CENTRAL='America/Chicago',now=new Date('2026-11-18T18:00:00Z');

// Catalog: 16 clubs, one table (the Team box heads them "NWSL").
const nwsl=schools.filter(s=>s.league==='NWSL');
assert.equal(nwsl.length,16);
for(const s of nwsl){
  assert.deepEqual([s.level,s.pro_sport,s.conference,s.division],['pro','Soccer','NWSL','NWSL'],s.id);
  assert.deepEqual(sponsoredSports[s.id],['Soccer']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.deepEqual([config.kind,config.sport,config.espn.path,config.fixtures],['espn-team','Soccer','soccer/usa.nwsl',true],s.id);
  assert.equal(s.providers[0].provider_school_id,String(config.espn.id),s.id);
  assert.match(config.schedule,/^https:\/\//,s.id);
}
assert.equal(new Set(nwsl.map(s=>proTeam(s.id).espn.team)).size,16);
assert.deepEqual(['boston-legacy-fc','denver-summit-fc'].map(id=>PRO_TEAMS[id].espn.id),[131562,131563]);
const kc=nwsl.find(s=>s.id==='kansas-city-current');
assert.equal(w.schoolTimeZone(kc),CENTRAL);
assert.equal(w.schoolTimeZone(nwsl.find(s=>s.id==='racing-louisville-fc')),'America/New_York');
// In season with MLS (February to December); Home reads the NWSL board then.
assert.ok(w.liveNowBoards(now).some(b=>b.path==='soccer/usa.nwsl'&&b.level==='pro'));
assert.ok(!w.liveNowBoards(new Date('2027-01-10T20:00:00Z')).some(b=>b.path==='soccer/usa.nwsl'));

// Kansas City: 30 league matches, 16-9-5 (ESPN's table), the playoffs by
// round and out of the record, the Championship coming with its TV.
const config=PRO_TEAMS['kansas-city-current'];
const games=espnTeamGames([json('nwsl-kc-2026'),json('nwsl-kc-2026-fixtures')],{school:kc,config,timeZone:CENTRAL,now});
assert.equal(games.length,33);
assert.equal(w.seasonRecords(games)[0].text,'16-9-5');
assert.deepEqual(games.filter(e=>e.postseason).map(e=>[e.status,e.title,e.headline,e.round]),[
  ['Final','KC Current at Gotham FC','W 2-1','NWSL Playoffs · Semifinals'],
  ['Final','KC Current vs Angel City FC','W 1-0 (AET)','NWSL Playoffs · Quarterfinals'],
  ['Upcoming','KC Current at Washington Spirit',null,'NWSL Championship']
]);
const final=games.find(e=>e.round==='NWSL Championship');
assert.deepEqual([final.start_time,final.display_time,final.broadcast,final.venue],['2026-11-21T19:00:00.000Z','Nov 21, 7:00 PM','CBS, Paramount+','Audi Field']);
assert.equal(w.groupEvents(games,now)[0].in_season,true);

// The semifinal's expanded view: the result, halftime, the club's scorers;
// score by half, team stats and every goal (an own goal named as one).
const semi=games.find(e=>/Semifinals/.test(e.round));
const details=espnGameHighlights(semi,json('nwsl-sum-401933740'),config);
assert.deepEqual(details.lines,[
  'Kansas City Current beat Gotham FC 2-1 away (Icahn Stadium), NWSL Playoffs · Semifinals.',
  'Kansas City Current led 1-0 at halftime.',
  "Kansas City Current goals: Croix Bethune 20'; Haley Hopkins 89'."
]);
assert.deepEqual(details.box_score.line.map(p=>[p.label,p.ours,p.theirs]),[['1st','1','0'],['2nd','1','1']]);
assert.deepEqual(details.box_score.stats[0],{label:'Possession',ours:'35.4%',theirs:'64.6%'});
assert.deepEqual(details.box_score.scoring.map(g=>[g.clock,g.text,g.score]),[["20'",'Croix Bethune','1-0'],["69'",'Laney Rouse (own goal)','1-1'],["89'",'Haley Hopkins (assist: Izzy Rodriguez)','2-1']]);

// The league table: one, "NWSL", by ESPN's seed, W-L-D and points.
const standings=espnLeagueStandings(json('espn-standings-soccer-usa-nwsl'),{config});
assert.deepEqual(standings.map(t=>[t.title,t.rows.length]),[['NWSL',16]]);
assert.deepEqual(standings[0].columns.map(c=>c.label),['GP','W-L-D','Pts']);
assert.deepEqual(standings[0].rows.slice(0,4).map(r=>[r.pos,r.name,r.values.record,r.values.pts,Boolean(r.own)]),[[1,'Gotham FC','18-5-7','61',false],[2,'San Diego Wave FC','18-8-4','58',false],[3,'Washington Spirit','17-9-4','55',false],[4,'Kansas City Current','16-9-5','53',true]]);
assert.equal(standings[0].source.url,'https://www.espn.com/soccer/standings/_/league/usa.nwsl');
// MLS keeps its own: the conferences and its standings address.
const mls=espnLeagueStandings(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/pro-sports/espn-standings-soccer-usa-2026-11-11.json.gz',import.meta.url))).toString('utf8')),{config:PRO_TEAMS['sporting-kansas-city']});
assert.deepEqual(mls.map(t=>t.title),['Western Conference','Eastern Conference']);
assert.equal(mls[0].source.url,'https://www.espn.com/soccer/standings/_/league/usa.1');
// Names: the Washington Spirit is not MLS's "Washington" anything, and the
// Current's ESPN id must agree.
assert.ok(w.scoreboardTeamMatchesSchool({id:'20907',location:'Kansas City',name:'Current',displayName:'Kansas City Current',shortDisplayName:'KC Current'},kc));
assert.ok(!w.scoreboardTeamMatchesSchool({id:'186',location:'Sporting Kansas City',name:'Sporting KC',displayName:'Sporting Kansas City',shortDisplayName:'Sporting KC'},kc));
console.log('NWSL module: 16 clubs, results, playoffs, the Championship, expanded final and table OK');
