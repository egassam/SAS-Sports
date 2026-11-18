// Minor league baseball near home (user, November 18, 2026: "What should we
// add in pro that's unique?", then "Start 1-4"): Pro → Baseball → MiLB, the
// Wichita Wind Surge (Double-A) and the Royals' Triple-A and Double-A teams,
// read from MLB's stats API.
// Fixtures (with the team hydrate), saved Nov 18, 2026: the Wind Surge's 2026 season (140 games: 136
// finals, 55-81 as MLB's standings; one postponed, two cancelled) and its 2027
// schedule.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {proTeam,mlbStatsSeasons,mlbStatsScheduleUrl,mlbStatsGames,mlbStatsHighlights} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fix=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}-2026-11-18.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,schoolTimeZone,groupEvents};')(...Object.values(deps));
const CENTRAL='America/Chicago';

// Catalog: three teams under Baseball → MiLB, each its level as the section.
const milb=schools.filter(s=>s.league==='MiLB');
assert.deepEqual(milb.map(s=>[s.id,s.conference]),[['omaha-storm-chasers','Triple-A'],['northwest-arkansas-naturals','Double-A'],['wichita-wind-surge','Double-A']]);
for(const s of milb){
  assert.deepEqual([s.level,s.pro_sport],['pro','Baseball'],s.id);
  assert.deepEqual(sponsoredSports[s.id],['Baseball']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'mlb-stats');assert.ok(config.mlb.sportId&&config.mlb.teamId,s.id);
  assert.equal(w.schoolTimeZone(s),CENTRAL,s.id);
}
assert.deepEqual(['wichita-wind-surge','omaha-storm-chasers','northwest-arkansas-naturals'].map(id=>proTeam(id).mlb.teamId),[3898,541,1350]);
assert.equal(mlbStatsScheduleUrl(proTeam('wichita-wind-surge'),{season:2026}),'https://statsapi.mlb.com/api/v1/schedule?sportId=12&teamId=3898&season=2026&hydrate=linescore,venue,decisions,team');
assert.deepEqual(mlbStatsSeasons(new Date('2026-11-18T12:00:00Z')),[2026,2027],'fall: this season and the next one published');
assert.deepEqual(mlbStatsSeasons(new Date('2027-02-01T12:00:00Z')),[2026,2027],'winter: last season and the coming one');
assert.deepEqual(mlbStatsSeasons(new Date('2027-06-01T12:00:00Z')),[2027]);

// The 2026 season: every final, the record as MLB's standings (55-81).
const school=milb.find(s=>s.id==='wichita-wind-surge'),config=proTeam(school.id),now=new Date('2026-11-18T18:00:00Z');
const events=mlbStatsGames([fix('milb-wichita-2026'),fix('milb-wichita-2027')],{school,config,timeZone:CENTRAL,now});
const finals=events.filter(e=>e.status==='Final');
assert.equal(finals.length,136,'postponed and cancelled games are not listed');
assert.equal(events.filter(e=>e.status==='Upcoming').length,138,'the 2027 schedule');
const record=w.seasonRecords(events,'Baseball');
assert.match(JSON.stringify(record),/55-81/,JSON.stringify(record));
const opener=finals[0];
assert.deepEqual([opener.title,opener.display_time,opener.headline,opener.venue],['Wind Surge vs Northwest Arkansas Naturals','Apr 2, 6:35 PM','W 10-6','Equity Bank Park']);
assert.deepEqual(opener.results,[{label:'Result',value:'W 10-6'},{label:'Win',value:'Mike Paredes'},{label:'Loss',value:'Chase Jessee'}]);
assert.deepEqual(opener.box_score.teams,{ours:'WCH',theirs:'NWA'},'abbreviations keep the line score narrow');
assert.equal(opener.box_score.line.length,9);assert.deepEqual(opener.box_score.totals,{ours:'10',theirs:'6'});
assert.deepEqual(opener.box_score.columns.map(c=>[c.label,c.ours,c.theirs]),[['H','9','8'],['E','2','1']]);
// Extra innings name them; a seven-inning doubleheader game does not.
assert.equal(finals.find(e=>e.display_time==='Apr 12, 1:35 PM').headline,'W 5-3 (11 inn)');
const dh=finals.filter(e=>e.start_time.startsWith('2026-04-26'));
assert.deepEqual(dh.map(e=>[e.headline,e.game_number]),[['L 5-6',1],['W 3-2',2]]);
assert.deepEqual(mlbStatsHighlights(finals.at(-1)).lines,['The Wichita Wind Surge lost to the Frisco RoughRiders 10-8 at home (Equity Bank Park).','Win: Joey Danielson. Loss: Preston Johnson.']);

// A game under way: the inning and outs, the score from the team's side.
{
  const payload=fix('milb-wichita-2027'),game=payload.dates[0].games[0];
  game.status={abstractGameState:'Live',detailedState:'In Progress'};
  const home=Number(game.teams.home.team.id)===3898;
  game.teams.home.score=home?4:2;game.teams.away.score=home?2:4;
  game.linescore={currentInning:5,inningState:'Bottom',outs:1,innings:[1,2,3,4,5].map(n=>({num:n,home:{runs:n===5?undefined:1},away:{runs:0}})),teams:{home:{hits:6,errors:0},away:{hits:3,errors:1}}};
  const at=new Date(Date.parse(game.gameDate)+90*6e4);
  const live=mlbStatsGames([payload],{school,config,timeZone:CENTRAL,now:at}).find(e=>e.mlb_game_pk===game.gamePk);
  assert.equal(live.status,'Live');assert.deepEqual([live.school_score,live.opponent_score,live.recency_label],['4','2','Bottom 5th · 1 out']);
  assert.equal(live.box_score.line.at(-1)[home?'ours':'theirs'],'X','a half-inning not played yet');
}
console.log('MiLB module: three teams, the 2026 season (55-81), extra innings, doubleheaders, live inning OK');
