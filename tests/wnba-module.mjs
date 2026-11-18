// Women's National Basketball Association (user, November 18, 2026: "Let's
// add more pro. Start with wnba"): Pro → Basketball → WNBA → all 15 teams by
// conference. Fixtures from ESPN, saved Nov 18, 2026: Atlanta's 2026 regular
// season (30-14, six Commissioner's Cup games) and postseason (First Round
// 2-0, Semifinals 3-0, Finals lost 4-3 to Golden State), New York's regular
// season (the Commissioner's Cup Championship, Jun 30), the Finals Game 7
// summary and the league standings.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,applyEspnLive,espnLeagueStandings} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}-2026-11-18.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),page=read('../public/index.html');
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,inSeason,liveNowBoards,schoolTimeZone,groupEvents,scoreboardTeamMatchesSchool};')(...Object.values(deps));
const EASTERN='America/New_York',now=new Date('2026-11-18T18:00:00Z');

// Catalog: 15 teams, 7 in the East and 8 in the West, each a Basketball
// entry with its colors, its conference rivals, ESPN's numeric id and its
// wnba.com schedule.
const wnba=schools.filter(s=>s.league==='WNBA');
assert.equal(wnba.length,15);
assert.deepEqual([...new Set(wnba.map(s=>s.conference))],['Eastern Conference','Western Conference']);
assert.equal(wnba.filter(s=>s.conference==='Eastern Conference').length,7);
for(const s of wnba){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Basketball');assert.equal(s.division,`WNBA · ${s.conference}`);
  assert.deepEqual(sponsoredSports[s.id],['Basketball']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'espn-team');assert.equal(config.sport,'Basketball');assert.equal(config.espn.path,'basketball/wnba');
  assert.ok(Number.isInteger(config.espn.id),s.id);
  assert.equal(s.providers[0].provider_school_id,String(config.espn.id),s.id);
  assert.equal(config.division.name,s.conference);
  assert.deepEqual(config.division.members.slice().sort(),wnba.filter(t=>t.conference===s.conference&&t!==s).map(t=>proTeam(t.id).espn.team.toUpperCase()).sort(),s.id);
  assert.match(config.schedule,/^https:\/\/[a-z]+\.wnba\.com\/schedule$/,s.id);
}
assert.equal(new Set(wnba.map(s=>proTeam(s.id).espn.team)).size,15);
assert.deepEqual(['golden-state-valkyries','toronto-tempo','portland-fire'].map(id=>PRO_TEAMS[id].espn.id),[129689,131935,132052]);
const atl=wnba.find(s=>s.id==='atlanta-dream');
assert.equal(w.schoolTimeZone(atl),EASTERN);
assert.equal(w.schoolTimeZone(wnba.find(s=>s.id==='minnesota-lynx')),'America/Chicago');
assert.equal(w.schoolTimeZone(wnba.find(s=>s.id==='toronto-tempo')),EASTERN);
// The Team box heads WNBA teams "WNBA · Eastern Conference" (MLS has an
// Eastern Conference too).
assert.ok(page.includes("sectionOf:s=>s.league==='WNBA'?s.division:"));

// Liberty University's "Liberty Flames" (ESPN id 2335) is not the New York
// Liberty (id 9): a pro team's ESPN id must agree as well as its name.
const nyLiberty=wnba.find(s=>s.id==='new-york-liberty');
assert.ok(!w.scoreboardTeamMatchesSchool({id:'2335',location:'Liberty',name:'Flames',displayName:'Liberty Flames',shortDisplayName:'Liberty'},nyLiberty));
assert.ok(w.scoreboardTeamMatchesSchool({id:'9',location:'New York',name:'Liberty',displayName:'New York Liberty',shortDisplayName:'Liberty'},nyLiberty));

// The Worker reads the regular season by name and the playoffs from
// September until the next season; the WNBA is in season May to October
// (the NBA keeps October to June).
assert.ok(worker.includes("if(wnba){urls[0]=`${base}?seasontype=2`;if(month>=9||month<=4)urls.push(`${base}?seasontype=3`);}"));
assert.ok(w.inSeason('Basketball',7,true,'basketball/wnba')&&!w.inSeason('Basketball',11,true,'basketball/wnba'));
assert.ok(w.inSeason('Basketball',11,true,'basketball/nba')&&!w.inSeason('Basketball',7,true,'basketball/nba'));
assert.ok(!w.liveNowBoards(now).some(b=>b.path==='basketball/wnba'),'Home reads no WNBA board in November');
assert.ok(w.liveNowBoards(new Date('2026-07-10T20:00:00Z')).some(b=>b.path==='basketball/wnba'&&b.level==='pro'),'Home reads the WNBA board in July');

// Atlanta 2026: 44 regular-season finals, 30-14 with 15-5 in the Eastern
// Conference (ESPN's own "vs. Conf."); six Commissioner's Cup games name
// the Cup and count; a postponed game (none here) and the preseason are
// not listed.
const config=PRO_TEAMS['atlanta-dream'];
const games=espnTeamGames([json('wnba-atl-2026-regular'),json('wnba-atl-2026-postseason')],{school:atl,config,timeZone:EASTERN,now});
assert.equal(games.length,56);assert.ok(games.every(e=>e.status==='Final'));
const records=w.seasonRecords(games);
assert.deepEqual([records[0].text,records[0].conference.name,records[0].conference.text],['30-14','Eastern Conference','15-5']);
const cup=games.filter(e=>e.round==="Commissioner's Cup");
assert.equal(cup.length,6);assert.ok(cup.every(e=>!e.not_in_record&&!e.postseason));
assert.deepEqual(cup[0].results.find(r=>r.label==='Round'),{label:'Round',value:"Commissioner's Cup"});
// The playoffs, game by game, with the series: First Round best of three,
// Semifinals best of five, Finals best of seven.
const post=games.filter(e=>e.postseason);
assert.equal(post.length,12);assert.ok(post.every(e=>e.not_in_record));
assert.deepEqual(post.map(e=>[e.round,e.headline,e.series_status]),[
  ['First Round · Game 1','W 92-77','Dream lead 1-0'],['First Round · Game 2','W 93-75','Dream won 2-0'],
  ['WNBA Semifinals · Game 1','W 92-82','Dream lead 1-0'],['WNBA Semifinals · Game 2','W 101-98 (OT)','Dream lead 2-0'],['WNBA Semifinals · Game 3','W 85-83','Dream won 3-0'],
  ['WNBA Finals · Game 1','L 64-68','Valkyries lead 1-0'],['WNBA Finals · Game 2','W 79-65','Tied 1-1'],['WNBA Finals · Game 3','W 97-71','Dream lead 2-1'],
  ['WNBA Finals · Game 4','L 62-67','Tied 2-2'],['WNBA Finals · Game 5','L 55-64','Valkyries lead 3-2'],['WNBA Finals · Game 6','W 80-69','Tied 3-3'],['WNBA Finals · Game 7','L 63-68','Valkyries won 4-3']
]);
const g7=post.at(-1);
assert.deepEqual([g7.title,g7.start_time,g7.venue,g7.source.url],['Dream at Golden State Valkyries','2026-10-31T20:00:00.000Z','Chase Center','https://dream.wnba.com/schedule']);
// The section is "Out of season" in November and keeps every final.
const [group]=w.groupEvents(games,now);
assert.deepEqual([group.in_season,group.results.length],[false,56]);
assert.equal(w.groupEvents(games,new Date('2026-07-10T20:00:00Z'))[0].in_season,true);

// The Commissioner's Cup Championship is not in the standings, so not in
// the record (New York beat Las Vegas 93-85, Jun 30): 26-18 as ESPN lists.
const ny=wnba.find(s=>s.id==='new-york-liberty');
const nyGames=espnTeamGames([json('wnba-ny-2026-regular')],{school:ny,config:PRO_TEAMS['new-york-liberty'],timeZone:EASTERN,now});
const cupFinal=nyGames.find(e=>/Championship/.test(e.round||''));
assert.deepEqual([cupFinal.title,cupFinal.headline,cupFinal.round,cupFinal.not_in_record],['Liberty vs Las Vegas Aces','W 93-85',"Commissioner's Cup Championship",true]);
assert.equal(nyGames.length,45,'the postponed Jul 16 game at Dallas is not listed');
assert.equal(w.seasonRecords(nyGames)[0].text,'26-18');

// The expanded view of the Finals' Game 7: the result, the series,
// halftime and the team's leaders; the score by quarter and team stats.
const summary=json('wnba-finals-game7-summary');
const details=espnGameHighlights(g7,summary,config);
assert.deepEqual(details.lines,[
  'The Dream lost to the Valkyries 68-63 on the road (Chase Center), Game 7 of the WNBA Finals.',
  'The Valkyries won the series 4-3.',
  'The Dream led 30-24 at halftime.',
  'Points: Jordin Canada, 18.','Assists: Jordin Canada, 5.','Rebounds: Angel Reese, 12.'
]);
assert.deepEqual(details.box_score.line.map(p=>[p.label,p.ours,p.theirs]),[['Q1','12','14'],['Q2','18','10'],['Q3','14','21'],['Q4','19','23']]);
assert.equal(details.box_score.line_title,'Score by Quarter');
assert.deepEqual(details.box_score.stats.slice(0,3),[{label:'Field goals',ours:'23-69',theirs:'24-64'},{label:'Field goal %',ours:'33%',theirs:'38%'},{label:'3-pointers',ours:'6-30',theirs:'5-20'}]);

// Live: the board's shape is the NBA's (no WNBA game is played in
// November): Game 7 turned "in" reads the quarter, clock, line and leaders.
const board=structuredClone(json('wnba-atl-2026-postseason'));
const ev=board.events.find(g=>g.id===g7.espn_event_id),comp=ev.competitions[0];
comp.status={clock:154,displayClock:'2:34',period:4,type:{state:'in',name:'STATUS_IN_PROGRESS',detail:'2:34 - 4th Quarter',shortDetail:'2:34 - 4th'}};
for(const c of comp.competitors){c.score=c.score.displayValue;c.linescores=(summary.header.competitions[0].competitors.find(x=>x.id===c.id)?.linescores)||[];}
const live=structuredClone(g7);live.status='Live';
applyEspnLive(live,{events:[ev]},summary,config);
assert.equal(live.status,'Live');assert.equal(live.recency_label,'2:34 - 4th');
assert.deepEqual(live.live_details.line.map(p=>p.label),['Q1','Q2','Q3','Q4']);

// Standings: the team's conference first, then the other, by ESPN's seed.
const standings=espnLeagueStandings(json('espn-standings-basketball-wnba'),{config});
assert.deepEqual(standings.map(t=>[t.title,t.rows.length]),[['Eastern Conference',7],['Western Conference',8]]);
assert.deepEqual(standings[0].columns.map(c=>c.label),['W-L','Pct','GB']);
assert.deepEqual([standings[0].rows[0].name,standings[0].rows[0].own,standings[0].rows[0].values.record,standings[0].rows[0].detail],['Atlanta Dream',true,'30-14','Streak W5 · Last\u00a010\u00a09\u20111']);
assert.equal(standings[0].source.url,'https://www.espn.com/wnba/standings');
console.log('WNBA module: 15 teams, Commissioner\'s Cup, playoffs, finals, live and standings OK');
