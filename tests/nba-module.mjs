// National Basketball Association (user, November 8, 2026: "Add NBA then
// NHL"): Pro → Basketball → NBA → all 30 teams by division. Fixtures from
// ESPN: Oklahoma City's 2026-27 regular season (Nov 8: ten finals, an NBA Cup
// group game), its 2026 postseason (West Finals lost 4-3 to San Antonio),
// the Oct 20 Thunder at Spurs summary, the Nov 8 board with 76ers at Bulls
// live (2:40 left in the 4th) and its summary, and the Apr 15, 2026 play-in.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,applyEspnLive,basketballPeriod} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),page=read('../public/index.html');
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,inSeason,liveNowBoards,schoolTimeZone};')(...Object.values(deps));
const CENTRAL='America/Chicago',now=new Date('2026-11-08T22:00:00Z');

// Catalog: 30 teams, five per division, each a Basketball entry with its
// colors, its four division rivals, ESPN's numeric id and its nba.com page.
const nba=schools.filter(s=>s.league==='NBA');
assert.equal(nba.length,30);
const divisions=['Atlantic','Central','Southeast','Northwest','Pacific','Southwest'];
assert.deepEqual([...new Set(nba.map(s=>s.conference))],divisions);
for(const d of divisions)assert.equal(nba.filter(s=>s.conference===d).length,5,d);
for(const s of nba){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Basketball');assert.equal(s.division,`NBA · ${s.conference}`);
  assert.deepEqual(sponsoredSports[s.id],['Basketball']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'espn-team');assert.equal(config.sport,'Basketball');assert.equal(config.espn.path,'basketball/nba');
  assert.ok(Number.isInteger(config.espn.id),s.id);
  assert.equal(s.providers[0].provider_school_id,String(config.espn.id),s.id);
  assert.equal(config.division.name,s.conference);
  assert.deepEqual(config.division.members.slice().sort(),nba.filter(t=>t.conference===s.conference&&t!==s).map(t=>proTeam(t.id).espn.team.toUpperCase()).sort(),s.id);
  assert.match(config.schedule,/^https:\/\/www\.nba\.com\/[a-z]+\/schedule$/,s.id);
}
assert.equal(new Set(nba.map(s=>proTeam(s.id).espn.team)).size,30);
// Dallas's nba.com page is /mavs (the /mavericks address redirects there).
assert.equal(PRO_TEAMS['dallas-mavericks'].schedule,'https://www.nba.com/mavs/schedule');
const okc=nba.find(s=>s.id==='oklahoma-city-thunder');
assert.deepEqual([okc.name,okc.short_name,okc.conference,okc.state],['Oklahoma City Thunder','Thunder','Northwest','Oklahoma']);
assert.deepEqual(PRO_TEAMS['oklahoma-city-thunder'].division.members,['DEN','MIN','POR','UTAH']);
assert.equal(w.schoolTimeZone(okc),CENTRAL);
assert.equal(w.schoolTimeZone(nba.find(s=>s.id==='toronto-raptors')),'America/New_York');
assert.ok(page.includes("sectionOf:s=>['NFL','MLS','MLB','NBA','NHL'].includes(s.league)?s.conference:s.league}"));

// The Worker reads the regular season by name, the playoffs in April to
// June and the play-in in April; the NBA is in season October to June.
assert.ok(worker.includes("if(winter){urls[0]=`${base}?seasontype=2`;if(month>=4&&month<=6)urls.push(`${base}?seasontype=3`);if(config.sport==='Basketball'&&month===4)urls.push(`${base}?seasontype=5`);}"));
assert.ok(w.inSeason('Basketball',6,true)&&!w.inSeason('Basketball',8,true));
assert.ok(!w.inSeason('Basketball',6,false),'college basketball keeps its own season');
assert.ok(w.liveNowBoards(now).some(b=>b.path==='basketball/nba'&&b.level==='pro'),'Home reads the NBA board in season');
assert.ok(!w.liveNowBoards(new Date('2026-08-10T20:00:00Z')).some(b=>b.path==='basketball/nba'));

// Oklahoma City, Nov 8: ten finals, 8-2 (ESPN's record), one division game
// (Denver, a win); the Cup game names its stage; 70 games to come.
const config=PRO_TEAMS['oklahoma-city-thunder'];
const games=espnTeamGames([json('nba-okc-2027.json')],{school:okc,config,timeZone:CENTRAL,now});
const finals=games.filter(e=>e.status==='Final');
assert.equal(finals.length,10);assert.equal(games.filter(e=>e.status==='Upcoming').length,70);
assert.deepEqual(finals.map(e=>e.headline[0]).join(''),'WWWWLLWWWW');
const records=w.seasonRecords(finals);
assert.equal(records[0].text,'8-2');
assert.deepEqual([records[0].conference.name,records[0].conference.text],['Northwest','1-0']);
const opener=finals[0];
assert.deepEqual([opener.title,opener.headline,opener.start_time,opener.venue,opener.source.url],['Thunder at San Antonio Spurs','W 116-104','2026-10-20T20:50:00.000Z','Frost Bank Center','https://www.nba.com/thunder/schedule']);
const cup=finals.find(e=>e.round);
assert.deepEqual([cup.title,cup.round,cup.not_in_record],['Thunder at Memphis Grizzlies','NBA Cup · Group Play',undefined]);
assert.deepEqual(cup.results.find(r=>r.label==='Round'),{label:'Round',value:'NBA Cup · Group Play'});
const next=games.find(e=>e.status==='Upcoming');
assert.deepEqual([next.title,next.display_time,next.broadcast,next.venue],['Thunder at Portland Trail Blazers','Nov 10, 10:00 PM','NBC, KSBI, Thunder App','Moda Center']);
// The Cup's championship game is not in the standings, so not in the record.
const cupFinal=structuredClone(json('nba-okc-2027.json'));
cupFinal.events=[cupFinal.events.find(g=>g.id===cup.espn_event_id)];cupFinal.events[0].competitions[0].notes=[{headline:'NBA Cup - Championship'}];
assert.equal(espnTeamGames([cupFinal],{school:okc,config,timeZone:CENTRAL,now})[0].not_in_record,true);

// The 2026 postseason game by game, the series as each game left it; the
// playoffs stay out of the season record.
const post=espnTeamGames([json('nba-okc-post-2026.json')],{school:okc,config,timeZone:CENTRAL,now:new Date('2026-06-01T12:00:00Z')});
assert.equal(post.length,15);assert.ok(post.every(e=>e.postseason&&e.not_in_record));
assert.deepEqual(post.map(e=>e.round).slice(0,2),['West 1st Round · Game 1','West 1st Round · Game 2']);
assert.deepEqual(post.slice(-3).map(e=>[e.headline,e.series_status]),[['W 127-114','Thunder lead 3-2'],['L 91-118','Tied 3-3'],['L 103-111','Spurs won 4-3']]);
assert.equal(post.find(e=>e.round==='West Finals · Game 1').headline,'L 115-122 (2OT)');
assert.deepEqual(w.seasonRecords(post),[]);
// A play-in game is postseason too (ESPN's season type 5).
const playIn=json('nba-board-20260415.json');
const pi=playIn.events[0],side=pi.competitions[0].competitors[0].team,piTeam=nba.find(s=>proTeam(s.id).espn.team===side.abbreviation.toLowerCase());
// (A board gives scores as strings; the team schedule, as objects.)
const piEvent=structuredClone(pi);for(const c of piEvent.competitions[0].competitors)c.score={displayValue:String(c.score)};
const piGame=espnTeamGames([{events:[{...piEvent,seasonType:{id:'5',type:5,name:'Play-In Season'}}]}],{school:piTeam,config:proTeam(piTeam.id),timeZone:w.schoolTimeZone(piTeam),now:new Date('2026-04-16T12:00:00Z')})[0];
assert.ok(piGame.postseason&&piGame.not_in_record);assert.match(piGame.round,/^Play-In · (East|West) · \d+th Place vs \d+th Place$/);

// The expanded view of a final: result, halftime, the team's leaders; the
// score by quarter and the team stats in the box.
const summary=json('nba-sum-401909090.json');
const details=espnGameHighlights(opener,summary,config);
assert.deepEqual(details.lines,[
  'The Thunder beat the Spurs 116-104 on the road (Frost Bank Center).',
  'The Thunder led 65-44 at halftime.',
  'Points: Shai Gilgeous-Alexander, 32.','Assists: Ajay Mitchell, 6.','Rebounds: Chet Holmgren, 7.'
]);
assert.deepEqual(details.box_score.line.map(p=>[p.label,p.ours,p.theirs]),[['Q1','34','28'],['Q2','31','16'],['Q3','28','36'],['Q4','23','24']]);
assert.equal(details.box_score.line_title,'Score by Quarter');assert.deepEqual(details.box_score.totals,{ours:'116',theirs:'104'});
assert.deepEqual(details.box_score.stats.slice(0,3),[{label:'Field goals',ours:'43-95',theirs:'36-93'},{label:'Field goal %',ours:'45%',theirs:'39%'},{label:'3-pointers',ours:'14-31',theirs:'10-37'}]);
assert.deepEqual(details.box_score.stats.find(r=>r.label==='Rebounds'),{label:'Rebounds',ours:'47',theirs:'45'});
assert.deepEqual(details.box_score.scoring,[],'no basket-by-basket list');
assert.equal(details.recap,'https://www.espn.com/nba/recap?gameId=401909090');
// Overtimes by name.
assert.deepEqual([1,4,5,6,7].map(basketballPeriod),['Q1','Q4','OT','2OT','3OT']);

// Live, Nov 8: 76ers at Bulls with 2:40 left in the 4th. The team schedule
// already reads it live; the board and the summary give the line, records,
// the last play, win probability, each side's leaders and the team stats.
const phi=nba.find(s=>s.id==='philadelphia-76ers'),phiConfig=PRO_TEAMS['philadelphia-76ers'];
const live=espnTeamGames([json('nba-phi-2027.json')],{school:phi,config:phiConfig,timeZone:'America/New_York',now:new Date('2026-11-08T22:38:00Z')}).find(e=>e.espn_event_id==='401909945');
assert.deepEqual([live.status,live.title],['Live','76ers at Chicago Bulls']);
applyEspnLive(live,json('nba-board-20261108.json'),json('nba-live-sum-401909945.json'),phiConfig);
assert.deepEqual([live.status,live.recency_label,live.headline],['Live','2:40 - 4th','118-116']);
const d=live.live_details;
assert.deepEqual(d.line.map(p=>p.label),['Q1','Q2','Q3','Q4']);
assert.deepEqual(d.records,{ours:'8-2',theirs:'1-7'});
assert.equal(d.win_probability,85.1);assert.equal(d.last_play,'Isaac Okoro shooting foul');
assert.deepEqual(d.leaders.slice(0,3).map(l=>l.value),['Jaylen Brown (PHI), 25','Jabari Walker (PHI), 11','Tyrese Maxey (PHI), 7']);
assert.ok(!d.leaders.some(l=>/rating/i.test(l.label)),'no repeated rating line');
assert.deepEqual(d.stats[0],{label:'Field goals',ours:'45-95',theirs:'45-84'});
assert.equal(d.venue,'United Center');
console.log('NBA module: 30 teams, schedule, Cup, playoffs, finals and live cards OK');
