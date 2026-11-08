// National Hockey League (user, November 8, 2026: "Add NBA then NHL"):
// Pro → Hockey → NHL → all 32 teams by division. Fixtures from ESPN: St.
// Louis's and Buffalo's 2026-27 regular seasons (Nov 8), the Blues' overtime
// loss at New Jersey (Nov 5) and Boston's shootout win over Vegas (Nov 1)
// summaries, the Nov 8 board with Golden Knights at Sabres live (14:17 of
// the 3rd) and its summary, and an Apr 20, 2026 playoff board.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,applyEspnLive,hockeyPeriod,mlbRound} from '../src/pro-sports.mjs';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json')),teamThemes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js');
const source=worker.replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,teamThemes,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF')},fetch:()=>{throw Error('Unexpected network request')}};
const w=Function(...Object.keys(deps),source+';return {seasonRecords,inSeason,liveNowBoards,schoolTimeZone};')(...Object.values(deps));
const CENTRAL='America/Chicago',EASTERN='America/New_York',now=new Date('2026-11-08T22:00:00Z');

// Catalog: 32 teams, eight per division (ESPN's division names, apart from
// the NBA's "Atlantic", "Central" and "Pacific" in the Team box).
const nhl=schools.filter(s=>s.league==='NHL');
assert.equal(nhl.length,32);
const divisions=['Atlantic Division','Metropolitan Division','Central Division','Pacific Division'];
assert.deepEqual([...new Set(nhl.map(s=>s.conference))],divisions);
for(const d of divisions)assert.equal(nhl.filter(s=>s.conference===d).length,8,d);
const nbaSections=new Set(schools.filter(s=>s.league==='NBA').map(s=>s.conference));
assert.ok(divisions.every(d=>!nbaSections.has(d)),'NHL and NBA divisions never share a Team box section');
for(const s of nhl){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Hockey');assert.equal(s.division,`NHL · ${s.conference}`);
  assert.deepEqual(sponsoredSports[s.id],['Hockey']);
  assert.match(teamThemes[s.id]?.primary||'',/^#[0-9A-F]{6}$/,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'espn-team');assert.equal(config.sport,'Hockey');assert.equal(config.espn.path,'hockey/nhl');
  assert.ok(Number.isInteger(config.espn.id),s.id);
  assert.equal(config.division.name,s.conference);assert.equal(config.division.members.length,7);
  assert.match(config.schedule,/^https:\/\/www\.nhl\.com\/[a-z]+\/schedule$/,s.id);
}
assert.equal(new Set(nhl.map(s=>proTeam(s.id).espn.team)).size,32);
// Utah's schedules name the Mammoth UTA (ESPN's team list says UTAH); the
// address uses the numeric id.
assert.deepEqual(PRO_TEAMS['utah-mammoth'].espn,{path:'hockey/nhl',team:'uta',id:129764});
assert.deepEqual(PRO_TEAMS['st-louis-blues'].division.members,['CHI','COL','DAL','MIN','NSH','UTA','WPG']);
// Canadian teams keep their own time zones.
const zone=id=>w.schoolTimeZone(nhl.find(s=>s.id===id));
assert.deepEqual(['calgary-flames','edmonton-oilers','winnipeg-jets','vancouver-canucks','montreal-canadiens','vegas-golden-knights','st-louis-blues'].map(zone),['America/Edmonton','America/Edmonton','America/Winnipeg','America/Vancouver',EASTERN,'America/Los_Angeles',CENTRAL]);
assert.ok(w.inSeason('Hockey',6,true)&&!w.inSeason('Hockey',8,true));
assert.ok(w.liveNowBoards(now).some(b=>b.path==='hockey/nhl'&&b.level==='pro'));

// St. Louis, Nov 8: 17 finals; two overtime losses are their own column of
// the record (W-L-OTL); division games count in the division record.
const stl=nhl.find(s=>s.id==='st-louis-blues'),config=PRO_TEAMS['st-louis-blues'];
const games=espnTeamGames([json('nhl-stl-2027.json')],{school:stl,config,timeZone:CENTRAL,now});
const finals=games.filter(e=>e.status==='Final');
assert.equal(finals.length,17);
assert.deepEqual(finals.filter(e=>e.ot_loss).map(e=>[e.title,e.headline]),[['Blues vs San Jose Sharks','L 2-3 (OT)'],['Blues at New Jersey Devils','L 4-5 (OT)']]);
const records=w.seasonRecords(finals);
assert.equal(records[0].text,'7-8-2');
assert.deepEqual([records[0].conference.name,records[0].conference.text],['Central Division','2-5-0']);
const next=games.find(e=>e.status==='Upcoming');
assert.deepEqual([next.title,next.display_time,next.broadcast,next.venue],['Blues vs Detroit Red Wings','Nov 10, 7:00 PM','TNT, truTV','Enterprise Center']);
// Buffalo: a shootout loss is an OTL too, and the record equals ESPN's own
// (the Nov 8 board: 8-5-3).
const buf=nhl.find(s=>s.id==='buffalo-sabres'),bufConfig=PRO_TEAMS['buffalo-sabres'];
const bufGames=espnTeamGames([json('nhl-buf-2027.json')],{school:buf,config:bufConfig,timeZone:EASTERN,now:new Date('2026-11-08T22:38:00Z')});
assert.ok(bufGames.some(e=>e.headline==='L 3-4 (SO)'&&e.ot_loss));
assert.ok(bufGames.some(e=>e.headline==='W 3-2 (OT)'&&!e.ot_loss));
assert.equal(w.seasonRecords(bufGames.filter(e=>e.status==='Final'))[0].text,'8-5-3');
const board=json('nhl-board-20261108.json');
assert.equal(board.events.flatMap(g=>g.competitions[0].competitors).find(t=>t.team.abbreviation==='BUF').records[0].summary,'8-5-3');
// Other sports' records are unchanged: no OTL column.
assert.equal(w.seasonRecords([{pro:true,sport:'Basketball',headline:'L 101-104 (OT)',school_id:'oklahoma-city-thunder',start_time:'2026-11-01T19:00:00.000Z'}])[0].text,'0-1');

// Periods by name; playoff overtimes are numbered, a regular-season fifth
// period is the shootout. Playoff notes read as the MLB's do.
assert.deepEqual([1,2,3,4,5].map(n=>hockeyPeriod(n)),['1st','2nd','3rd','OT','SO']);
assert.deepEqual([4,5,6].map(n=>hockeyPeriod(n,{postseason:true})),['OT','2OT','3OT']);
const playoffs=json('nhl-board-20260420.json');
assert.deepEqual(playoffs.events.map(g=>mlbRound(g.competitions[0].notes[0].headline).label),['East 1st Round · Game 2','East 1st Round · Game 2','West 1st Round · Game 2','West 1st Round · Game 1']);

// The expanded view: overtime loss at New Jersey.
const otGame=finals.find(e=>e.espn_event_id==='401892651');
const details=espnGameHighlights(otGame,json('nhl-sum-401892651.json'),config);
assert.deepEqual(details.lines.slice(0,3),[
  'The Blues lost to the Devils 5-4 in overtime on the road (Prudential Center).',
  'Winning goalie: Connor Hellebuyck. Losing goalie: Jordan Binnington.',
  'Three stars: 1. Anthony Mantha, 2. Luke Hughes, 3. Jesper Bratt.'
]);
assert.deepEqual(details.box_score.line.map(p=>[p.label,p.ours,p.theirs]),[['1st','0','1'],['2nd','1','3'],['3rd','3','0'],['OT','0','1']]);
assert.equal(details.box_score.line_title,'Score by Period');assert.equal(details.box_score.scoring_title,'Goals');
assert.deepEqual(details.box_score.stats.slice(0,3),[{label:'Shots on goal',ours:'32',theirs:'37'},{label:'Power play',ours:'1/3',theirs:'0/3'},{label:'Faceoffs won',ours:'49.2%',theirs:'50.8%'}]);
const goals=details.box_score.scoring;
assert.equal(goals.length,9);
assert.deepEqual(goals[2],{period:'2nd Period',clock:'16:04',team:'STL',ours:true,text:'Robert Thomas Goal (3) Snap Shot, assists: Mason McTavish (5), Philip Broberg (8) (power play)',score:'1-2'});
assert.deepEqual([goals.at(-1).period,goals.at(-1).team,goals.at(-1).score],['Overtime','NJ','4-5']);
assert.equal(details.recap,'https://www.espn.com/nhl/recap?gameId=401892651');
// A shootout, from both sides: the line's SO column and the winning goal.
const so=json('nhl-sum-401892629.json');
const bos=espnGameHighlights({title:'Bruins vs Vegas Golden Knights',school:'Boston Bruins'},so,PRO_TEAMS['boston-bruins']);
assert.equal(bos.lines[0],'The Bruins beat the Golden Knights 3-2 in a shootout at home (TD Garden).');
assert.deepEqual(bos.box_score.line.map(p=>p.label),['1st','2nd','3rd','OT','SO']);
assert.deepEqual(bos.box_score.scoring.at(-1),{period:'Shootout',clock:'',team:'BOS',ours:true,text:'David Pastrnak Goal Wrist Shot (shootout winner)',score:'3-2'});
const vgk=espnGameHighlights({title:'Golden Knights at Boston Bruins',school:'Vegas Golden Knights'},so,PRO_TEAMS['vegas-golden-knights']);
assert.equal(vgk.lines[0],'The Golden Knights lost to the Bruins 3-2 in a shootout on the road (TD Garden).');
assert.equal(vgk.box_score.scoring.at(-1).score,'2-3');

// Live, Nov 8: Golden Knights at Sabres, 14:17 of the 3rd.
const live=bufGames.find(e=>e.espn_event_id==='401892675');
assert.equal(live.status,'Live');
applyEspnLive(live,board,json('nhl-live-sum-401892675.json'),bufConfig);
assert.deepEqual([live.status,live.recency_label,live.headline],['Live','14:17 - 3rd','1-2']);
const d=live.live_details;
assert.deepEqual(d.line.map(p=>[p.label,p.ours,p.theirs]),[['1st','0','0'],['2nd','0','2'],['3rd','1','0']]);
assert.deepEqual(d.records,{ours:'8-5-3',theirs:'11-5-2'});
assert.deepEqual(d.stats.find(s=>s.label==='Shots on goal'),{label:'Shots on goal',ours:'24',theirs:'20'});
assert.deepEqual(d.scoring,[
  '2nd Period 12:17 · VGK: Mitch Marner Goal (3) Wrist Shot, assists: none (short-handed) (0-1)',
  '2nd Period 13:43 · VGK: Jack Eichel Goal (8) Wrist Shot, assists: Ivan Barbashev (10) (0-2)',
  '3rd Period 4:26 · BUF: Beck Malenstyn Goal (1) Wrist Shot, assists: none (1-2)'
]);
assert.equal(d.broadcast,'ESPN+, MSGB, Scripps Sports');
console.log('NHL module: 32 teams, W-L-OTL records, overtime and shootouts, finals and live cards OK');
