// Major League Baseball (user, October 19, 2026: "Let's add MLB in the pro
// section including playoff games"): Pro → Baseball → MLB → all 30 teams by
// division. Fixtures of October 19, 2026 from ESPN: Cleveland's regular
// season and postseason (ALDS over the White Sox, ALCS with Tampa Bay 3-2),
// Milwaukee's postseason (World Series opponent not yet decided), the ALCS
// Game 5 and Game 4 summaries and the Oct 17 scoreboard.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,applyEspnLive,mlbRound} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),page=read('../public/index.html');
const EASTERN='America/New_York',now=new Date('2026-10-19T14:00:00Z');

// Catalog: 30 teams, five per division (AL East … NL West), each a Baseball
// entry with its colors, its four division rivals and its mlb.com schedule.
const mlb=schools.filter(s=>s.league==='MLB');
assert.equal(mlb.length,30);
const divisions=['AL East','AL Central','AL West','NL East','NL Central','NL West'];
assert.deepEqual([...new Set(mlb.map(s=>s.conference))],divisions);
for(const d of divisions)assert.equal(mlb.filter(s=>s.conference===d).length,5,d);
for(const s of mlb){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Baseball');
  assert.deepEqual(sponsored[s.id],['Baseball']);
  assert.ok(themes[s.id]?.primary,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'espn-team');assert.equal(config.sport,'Baseball');assert.equal(config.espn.path,'baseball/mlb');
  assert.equal(config.division.name,s.conference);assert.equal(config.division.members.length,4);
  assert.match(config.schedule,/^https:\/\/www\.mlb\.com\/[a-z]+\/schedule$/);
}
assert.equal(new Set(mlb.map(s=>proTeam(s.id).espn.team)).size,30);
const cle=mlb.find(s=>s.id==='cleveland-guardians'),mil=mlb.find(s=>s.id==='milwaukee-brewers');
assert.deepEqual([cle.name,cle.short_name,cle.conference,cle.state],['Cleveland Guardians','Guardians','AL Central','Ohio']);
assert.deepEqual(PRO_TEAMS['kansas-city-royals'].division.members,['CHW','CLE','DET','MIN']);
// The Team box groups teams under their division, as it does the NFL's.
assert.ok(page.includes("sectionOf:s=>['NFL','MLS','MLB'].includes(s.league)?s.conference:s.league}"));

// The Worker reads the regular season by name and the postseason in its
// months; MLB is in season March to November, and every month's games count.
assert.ok(worker.includes("if(config.sport==='Baseball'){urls[0]=`${base}?seasontype=2`;if(month>=9&&month<=11)urls.push(`${base}?seasontype=3`);}"));
assert.ok(worker.includes('const PRO_SEASONS={Soccer:[[2,12]],Baseball:[[3,11]]};'));
assert.ok(worker.includes('const months=e.pro?null:RECORD_MONTHS[e.sport]'));

// Postseason rounds from ESPN's game notes.
assert.deepEqual(mlbRound('ALCS - Game 5'),{series:'ALCS',game:5,label:'ALCS · Game 5'});
assert.deepEqual(mlbRound('NLWC - Game 2'),{series:'NL Wild Card Series',game:2,label:'NL Wild Card Series · Game 2'});
assert.equal(mlbRound('World Series - Game 7 If Necessary').label,'World Series · Game 7 (if necessary)');

// Cleveland: the 162-game regular season (85-77, AL Central 29-23), extra
// innings and doubleheaders, then the postseason game by game with the
// series as each game left it.
const config=PRO_TEAMS['cleveland-guardians'];
const games=espnTeamGames([json('mlb-cle-2026.json'),json('mlb-cle-post.json')],{school:cle,config,timeZone:EASTERN,now});
const regular=games.filter(e=>e.status==='Final'&&!e.postseason);
assert.equal(regular.length,162);
const tally=list=>list.reduce((t,e)=>(t[e.headline[0]]++,t),{W:0,L:0});
assert.deepEqual(tally(regular),{W:85,L:77});
assert.deepEqual(tally(regular.filter(e=>e.conference_game)),{W:29,L:23});
assert.ok(regular.filter(e=>e.conference_game).every(e=>e.conference_name==='AL Central'));
assert.ok(regular.some(e=>e.headline==='W 6-5 (10 inn)'));
assert.ok(regular.every(e=>!e.results.some(r=>r.label==='Week')),'ESPN\'s MLB "week" is not shown');
// A doubleheader's games keep apart (one game number each).
const doubles=regular.filter(e=>e.game_number);
assert.ok(doubles.length>=2&&doubles.length%2===0);
assert.equal(new Set(doubles.map(e=>`${e.start_time.slice(0,10)}|${e.game_number}`)).size,doubles.length);
const line=e=>`${e.status} | ${e.title} | ${e.display_time} | ${e.headline||''} | ${e.results.filter(r=>r.label!=='Result'&&r.label!=='TV').map(r=>`${r.label}: ${r.value}`).join(' · ')}`;
assert.deepEqual(games.filter(e=>e.postseason).map(line),[
  'Final | Guardians vs Chicago White Sox | Oct 3, 1:00 PM | L 0-3 | Round: ALDS · Game 1 · Series: White Sox lead 1-0',
  'Final | Guardians vs Chicago White Sox | Oct 5, 5:00 PM | L 3-4 | Round: ALDS · Game 2 · Series: White Sox lead 2-0',
  'Final | Guardians at Chicago White Sox | Oct 7, 4:00 PM | W 9-3 | Round: ALDS · Game 3 · Series: White Sox lead 2-1',
  'Final | Guardians at Chicago White Sox | Oct 8, 8:00 PM | W 9-5 | Round: ALDS · Game 4 · Series: Tied 2-2',
  'Final | Guardians vs Chicago White Sox | Oct 10, 8:00 PM | W 2-0 | Round: ALDS · Game 5 · Series: Guardians won 3-2',
  'Final | Guardians at Tampa Bay Rays | Oct 12, 8:00 PM | W 7-3 | Round: ALCS · Game 1 · Series: Guardians lead 1-0',
  'Final | Guardians at Tampa Bay Rays | Oct 13, 8:00 PM | L 1-3 | Round: ALCS · Game 2 · Series: Tied 1-1',
  'Final | Guardians vs Tampa Bay Rays | Oct 15, 1:00 PM | W 3-2 | Round: ALCS · Game 3 · Series: Guardians lead 2-1',
  'Final | Guardians vs Tampa Bay Rays | Oct 17, 8:00 PM | L 3-7 | Round: ALCS · Game 4 · Series: Tied 2-2',
  'Final | Guardians vs Tampa Bay Rays | Oct 18, 5:00 PM | L 1-3 | Round: ALCS · Game 5 · Series: Rays lead 3-2',
  'Today | Guardians at Tampa Bay Rays | Oct 19, 8:00 PM |  | Round: ALCS · Game 6 · Series: Rays lead 3-2',
  'Upcoming | Guardians at Tampa Bay Rays | Oct 20, 8:00 PM |  | Round: ALCS · Game 7 (if necessary) · Series: Rays lead 3-2'
]);
// The playoffs are listed but stay out of the season record; the rain-out
// (Game 4 first set for Oct 16) is not listed.
assert.ok(games.filter(e=>e.postseason).every(e=>e.not_in_record));
assert.equal(games.filter(e=>e.round==='ALCS · Game 4').length,1);
assert.equal(games.find(e=>e.round==='ALCS · Game 6').broadcast,'TBS, truTV, ERADM');
assert.equal(games[0].source.name,'ESPN team schedule (MLB)');
// Once a series is decided its "if necessary" games are not listed.
{
  const won=json('mlb-cle-post.json'),g6=won.events.find(e=>e.id==='401908028');
  const c=g6.competitions[0];c.status={type:{state:'post',name:'STATUS_FINAL',shortDetail:'Final'}};
  c.competitors.forEach(t=>{t.score={displayValue:t.team.abbreviation==='CLE'?'2':'5'};});
  const after=espnTeamGames([won],{school:cle,config,timeZone:EASTERN,now:new Date('2026-10-20T14:00:00Z')});
  assert.equal(after.find(e=>e.espn_event_id==='401908028').series_status,'Rays won 4-2');
  assert.ok(!after.some(e=>e.espn_event_id==='401908029'));
}

// Milwaukee waits on the AL champion: the World Series games name it, with
// the "if necessary" games labeled.
const brewers=espnTeamGames([json('mlb-mil-post.json')],{school:mil,config:PRO_TEAMS['milwaukee-brewers'],timeZone:'America/Chicago',now});
assert.equal(brewers.filter(e=>e.round?.startsWith('NLCS')).at(-1).series_status,'Brewers won 4-0');
assert.deepEqual(brewers.filter(e=>e.series_name==='World Series').map(e=>`${e.title} | ${e.display_time} | ${e.round}`),[
  'Brewers vs AL champion | Oct 23, 7:00 PM | World Series · Game 1',
  'Brewers vs AL champion | Oct 24, 7:00 PM | World Series · Game 2',
  'Brewers at AL champion | Oct 26, 7:00 PM | World Series · Game 3',
  'Brewers at AL champion | Oct 27, 7:00 PM | World Series · Game 4',
  'Brewers at AL champion | Oct 28, 7:00 PM | World Series · Game 5 (if necessary)',
  'Brewers vs AL champion | Oct 30, 7:00 PM | World Series · Game 6 (if necessary)',
  'Brewers vs AL champion | Oct 31, 7:00 PM | World Series · Game 7 (if necessary)'
]);

// Expanded final: the result, the series and the pitchers of record; the
// line score with R, H and E, team stats and each scoring play by
// half-inning with the running score.
const game5=games.find(e=>e.espn_event_id==='401930515');
const details=espnGameHighlights(game5,json('mlb-sum-401930515.json'),config);
assert.deepEqual(details.lines,[
  'The Guardians lost to the Rays 3-1 at home (Progressive Field), Game 5 of the ALCS.',
  'The Rays lead the series 3-2.',
  'Win: Drew Rasmussen (2-0). Loss: Parker Messick (0-3). Save: Bryan Baker (5).'
]);
const box=details.box_score;
assert.deepEqual([box.line_title,box.total_label,box.scoring_title],['Line Score','R','Scoring Plays']);
assert.deepEqual(box.line.map(i=>`${i.ours}${i.theirs}`).join(' '),'01 01 01 00 00 10 00 00 00');
assert.deepEqual(box.totals,{ours:'1',theirs:'3'});
assert.deepEqual(box.columns,[{label:'H',ours:'5',theirs:'12'},{label:'E',ours:'0',theirs:'0'}]);
assert.deepEqual(box.stats.slice(0,3),[{label:'Hits',ours:'5',theirs:'12'},{label:'Home runs',ours:'0',theirs:'0'},{label:'Doubles',ours:'0',theirs:'2'}]);
assert.deepEqual(box.scoring.map(p=>`${p.period} ${p.team} ${p.score}`),['Top 1st TB 0-1','Top 2nd TB 0-2','Top 3rd TB 0-3','Bottom 6th CLE 1-3']);
assert.equal(details.recap,'https://www.espn.com/mlb/recap?gameId=401930515');
// The page shows the R/H/E columns and the half-inning headings.
assert.ok(page.includes("<th>${esc(b.total_label||'T')}</th>${extra.map(c=>`<th>${esc(c.label)}</th>`).join('')}"));
assert.ok(worker.includes("config.sport==='Baseball'?'Line score, pitchers of record, team stats and scoring plays from ESPN\\'s game summary.'"));

// Live: the league board and the game summary over the day's card (the Oct
// 17 board's final turned "in" in the top of the 7th, with a count, runners
// and the batter and pitcher): the inning, score, R/H/E, the situation,
// team stats and every scoring play so far.
{
  const game4=games.find(e=>e.espn_event_id==='401908027');
  const board=json('mlb-board-20261017.json'),c=board.events[0].competitions[0];
  c.status={period:7,type:{state:'in',name:'STATUS_IN_PROGRESS',shortDetail:'Top 7th'}};
  c.situation={balls:2,strikes:1,outs:1,onFirst:true,onSecond:false,onThird:true,batter:{athlete:{displayName:'Junior Caminero'}},pitcher:{athlete:{displayName:'Cade Smith'}},lastPlay:{text:'Simpson singled to right.'}};
  const event=applyEspnLive({...game4,status:'Today',results:[]},board,json('mlb-sum-401908027.json'),config);
  assert.deepEqual([event.status,event.recency_label,event.headline],['Live','Top 7th','3-7']);
  const d=event.live_details;
  assert.deepEqual(d.count,{balls:2,strikes:1,outs:1});
  assert.deepEqual(d.bases,['1st','3rd']);
  assert.equal(d.matchup,'At bat: Junior Caminero · Pitching: Cade Smith');
  assert.equal(d.last_play,'Simpson singled to right.');
  assert.deepEqual(d.columns,[{label:'H',ours:'8',theirs:'11'},{label:'E',ours:'2',theirs:'0'}]);
  assert.deepEqual(d.records,{ours:'85-77',theirs:'98-64'});
  assert.equal(d.line.length,9);assert.equal(d.line[0].label,'1');
  assert.equal(d.stats[0].label,'Hits');
  assert.equal(d.scoring.length,8);assert.match(d.scoring[0],/^(Top|Bottom) \d+(st|nd|rd|th) · (CLE|TB): .+ \(\d+-\d+\)$/);
  assert.equal(event.possession,null);
  // The page shows the count, outs, runners and matchup.
  assert.ok(page.includes("if(d.count)facts.push(`Count <b>${esc(d.count.balls)}-${esc(d.count.strikes)}</b>`"));
  // A final on the board turns a card the team schedule still shows as today.
  const final=applyEspnLive({...game4,status:'Today',results:[],id:'live-x-today'},json('mlb-board-20261017.json'),null,config);
  assert.deepEqual([final.status,final.headline,final.id],['Final','L 3-7','live-x-final']);
}
console.log('MLB module: 30 teams, regular season, postseason series, expanded finals and live cards pass');
