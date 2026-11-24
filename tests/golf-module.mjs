// Pro golf (user, November 24, 2026: "Add more pro golf"): Pro → Golf → six
// tours, each one entry of its tournaments. Fixtures saved Nov 24, 2026 from
// ESPN: the PGA Tour, LPGA and DP World Tour boards for that day (each
// season's calendar), the PGA Tour's 2027 calendar, and the leaderboards of
// the RSM Classic (won in a playoff), the Sony Open, the Zurich Classic (two-
// player teams), the Presidents Cup (no stroke-play board), the Hero World
// Challenge (coming), the LPGA's CME Group Tour Championship and the DP World
// Tour's BMW Australian PGA Championship (coming).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {proTeam,golfBoardDay,golfCalendar,golfLeaderboard,golfDays,golfEvents,golfDetails,golfLeaderboardUrl,GOLF_BOARD,golfCupLeaderboard,golfCupDetails,lpgaResultsUrl,lpgaTeamResults,pgatourStandings,lpgaRaceToCme} from '../src/pro-sports.mjs';
const html=name=>gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/golf-${name}-2026-11-24.html.gz`,import.meta.url))).toString('utf8');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/golf-${name}-2026-11-24.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),page=read('../public/index.html');
const EASTERN='America/New_York',now=new Date('2026-11-24T18:00:00Z');

// Catalog: Pro → Golf → one entry per tour, after IndyCar.
const TOURS={'pga-tour':['PGA Tour','pga'],'lpga-tour':['LPGA','lpga'],'dp-world-tour':['DP World Tour','eur'],'pga-tour-champions':['PGA Tour Champions','champions-tour'],'korn-ferry-tour':['Korn Ferry Tour','ntw'],'liv-golf':['LIV Golf','liv']};
const golf=schools.filter(s=>s.level==='pro'&&s.pro_sport==='Golf');
assert.deepEqual(golf.map(s=>s.id),Object.keys(TOURS));
assert.equal(schools.findIndex(s=>s.id==='pga-tour'),schools.findIndex(s=>s.id==='indycar-series')+1);
for(const s of golf){
  const [league,espn]=TOURS[s.id],config=proTeam(s.id);
  assert.deepEqual([s.league,s.conference,s.state&&true,s.city&&true],[league,league,true,true],s.id);
  assert.deepEqual(sponsored[s.id],['Golf'],s.id);
  assert.match(themes[s.id].primary,/^#[0-9A-Fa-f]{6}$/,s.id);
  assert.deepEqual([config.kind,config.sport,config.espn],['golf','Golf',espn],s.id);
  assert.match(config.schedule,/^https:\/\//);
}
assert.match(worker,/if\(config\.kind==='golf'\)return fetchGolf\(/);
// A new season with no final yet keeps last season's (the DP World Tour's,
// Nov 24): its calendar is a board 10, then 40 days before the season.
assert.match(worker,/for\(const back of \[10,40\]\)\{/);assert.match(worker,/if\(prev\.length&&prev\[0\]\.season<current\)\{calendar\.unshift\(/);
assert.match(worker,/const PRO_SEASONS=\{[^}]*Golf:\[\[1,12\]\]\};/,'pro golf is in season all year');

assert.match(page,/sport==='Golf'\?'Tours'/);assert.match(page,/e\.golf_event\?'Next tournament'/);assert.match(page,/e\.golf_cup\?'Every Match':e\.golf_event\?'Full Leaderboard'/);assert.match(page,/g\.sport==='Golf'\?'Player':'Driver'/);assert.match(page,/if\(d\.golf\)\{/);
assert.equal(golfLeaderboardUrl('pga','401850981'),'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=401850981');
assert.equal(`${GOLF_BOARD('eur')}?dates=${golfBoardDay(now,EASTERN)}`,'https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard?dates=20261124');
assert.equal(golfDays('2026-11-19T00:00:00.000Z','2026-11-22T00:00:00.000Z'),'Nov 19-22');
assert.equal(golfDays('2026-10-30T00:00:00.000Z','2026-11-02T00:00:00.000Z'),'Oct 30 - Nov 2');

// Calendars: the season holding the day; the DP World Tour's turned to
// 2026-27 (its first event Nov 26). The PGA Tour's 2027 is read in the last
// 60 days of 2026.
const pga=golfCalendar(json('pga-day')),next=golfCalendar(json('pga-2027'));
assert.equal(pga.length,49);assert.deepEqual([pga[0].name,pga[0].season,pga.at(-1).name],['The Sentry',2026,'PGA TOUR Q-School presented by Korn Ferry']);
assert.equal(next.length,37);assert.deepEqual([next[0].name,next[0].season],['The American Express',2027]);
assert.equal(golfCalendar(json('lpga-day')).length,32);
const eur=golfCalendar(json('eur-day'));assert.deepEqual([eur[0].name,eur[0].season],['BMW Australian PGA Championship',2027]);
assert.deepEqual(golfCalendar(null),[]);

// Leaderboards.
const rsm=golfLeaderboard(json('pga-rsm'));
assert.deepEqual([rsm.name,rsm.completed,rsm.rows.length,rsm.purse,rsm.course.name,rsm.course.par,rsm.cut],['The RSM Classic',true,147,'$7,400,000','Sea Island Golf Club (Seaside Course)',70,{round:2,score:'-2',count:66}]);
assert.deepEqual(rsm.rows.slice(0,4).map(r=>[r.pos,r.player,r.toPar,r.total]),[['1','Marco Penge','-16',266],['T2','Michael Thorbjornsen','-16',266],['T2','Haotong Li','-16',266],['T2','Max Greyserman','-16',266]]);
assert.deepEqual(rsm.rows[0].rounds,[68,65,68,65],'the playoff is not a round');
const cut=rsm.rows.find(r=>r.status==='CUT');assert.deepEqual([cut.pos,cut.place,cut.rounds.length],['CUT',null,2]);
const zurich=golfLeaderboard(json('pga-zurich'));
assert.equal(zurich.team,true);assert.equal(zurich.rows[0].player,'M. Fitzpatrick / A. Fitzpatrick');
assert.equal(golfLeaderboard(json('pga-presidents')).rows.length,0,'a match-play cup has no stroke-play board');
const hero=golfLeaderboard(json('pga-hero'));
assert.deepEqual([hero.state,hero.purse,hero.defending,hero.course.place,hero.tv],['pre','$5,000,000','Hideki Matsuyama','New Providence, Bahamas',['NBC','Golf Chnl','Peacock']]);
assert.equal(golfLeaderboard(null),null);

// Events: finals with the top three, a coming tournament with its course and
// purse, a past one without a leaderboard (the Presidents Cup) not listed.
const boards=new Map(['pga-rsm','pga-sony','pga-zurich','pga-hero','pga-presidents'].map(n=>{const lb=golfLeaderboard(json(n));return[lb.id,lb]}));
const school=schools.find(s=>s.id==='pga-tour'),config=proTeam('pga-tour');
const events=golfEvents([...pga,...next],{school,config,timeZone:EASTERN,now,boards});
assert.ok(!events.some(e=>e.title==='Presidents Cup'||e.title==='The Sentry'&&e.season===2026),'no board, not listed; cancelled, not listed');
const final=events.find(e=>e.golf_event==='401850981');
assert.deepEqual([final.status,final.event_type,final.display_time,final.start_time,final.end_time,final.opponent,final.headline],['Final','MEET','Nov 19-23','2026-11-19T00:00:00.000Z','2026-11-23T23:59:00.000Z','Sea Island Golf Club (Seaside Course)','Winner: Marco Penge (-16)']);
assert.deepEqual(final.race_table.map(r=>[r.pos,r.place,r.driver,r.car,r.make,r.team,r.note]),[
  ['1',1,'Marco Penge','England','-16','68-65-68-65 · 266','$1,332,000'],
  ['T2',2,'Michael Thorbjornsen','USA','-16','64-69-66-67 · 266','$559,933'],
  ['T2',2,'Haotong Li','China','-16','66-68-67-65 · 266','$559,933']]);
assert.equal(final.has_more_results,true);assert.equal(final.result_count,147);
assert.deepEqual(final.source,{name:'ESPN golf leaderboard',url:'https://www.espn.com/golf/leaderboard?tournamentId=401850981',updated_at:now.toISOString()});
const sony=events.find(e=>e.golf_event==='401811928');assert.deepEqual([sony.status,sony.headline,sony.broadcast],['Final','Winner: Chris Gotterup (-16)','ESPN+, Golf Chnl']);
const coming=events.find(e=>e.golf_event==='401850982');
assert.deepEqual([coming.status,coming.display_time,coming.opponent],['Upcoming','Dec 3-6','Albany GC']);
assert.deepEqual(coming.results,[{label:'Course',value:'Albany GC'},{label:'Location',value:'New Providence, Bahamas'},{label:'Purse',value:'$5,000,000'},{label:'Defending champion',value:'Hideki Matsuyama'},{label:'Tournament',value:'48 of 49 (2026 season)'}]);
const amex=events.find(e=>e.title==='The American Express');assert.deepEqual([amex.status,amex.display_time,amex.results.at(-1).value],['Upcoming','Jan 21-24','1 of 37 (2027 season)']);
assert.ok(events.every(e=>e.sport==='Golf'));
assert.equal(new Set(events.map(e=>e.id)).size,events.length);

// The expanded view: the winner and how, the numbers, the whole field.
const details=golfDetails(final,boards.get('401850981'));
assert.equal(details.lines[0],'Marco Penge won the RSM Classic at 16 under (266), in a playoff over Michael Thorbjornsen, Haotong Li and Max Greyserman.');
assert.ok(details.lines.includes('66 players made the cut at -2.'));
assert.deepEqual(details.stats.slice(0,5),[{label:'Players',value:'147'},{label:'Made cut',value:'66'},{label:'Cut',value:'-2'},{label:'Purse',value:'$7,400,000'},{label:'Winner\'s share',value:'$1,332,000'}]);
assert.equal(details.table.length,147);assert.equal(details.table.find(r=>r.status==='CUT').pos,'CUT');
assert.equal(golfDetails(sony,boards.get('401811928')).lines[0],'Chris Gotterup won the Sony Open in Hawaii at 16 under (264), two shots ahead of Ryan Gerard.');
assert.equal(golfDetails(events.find(e=>e.golf_event==='401811943'),boards.get('401811943')).lines[0],'M. Fitzpatrick / A. Fitzpatrick won the Zurich Classic of New Orleans at 31 under (257), one shot ahead of A. Smalley / H. Springer and K. Reitan / K. Ventura.');

// LPGA: the CME Group Tour Championship final.
const lpgaBoards=new Map([['401835177',golfLeaderboard(json('lpga-cme'))]]);
const cme=golfEvents(golfCalendar(json('lpga-day')),{school:schools.find(s=>s.id==='lpga-tour'),config:proTeam('lpga-tour'),timeZone:EASTERN,now,boards:lpgaBoards});
assert.equal(cme.length,1,'the LPGA season is over: only finals with a leaderboard');
assert.deepEqual([cme[0].title,cme[0].headline,cme[0].race_table[0].note],['CME Group Tour Championship','Winner: Jeeno Thitikul (-24)','$4,000,000']);

// Live: a tournament under way (the RSM Classic's final round, replayed as
// in progress) shows its places, today's round and holes played.
const live=structuredClone(json('pga-rsm'));
live.events[0].status.type={name:'STATUS_IN_PROGRESS',state:'in',completed:false,description:'In Progress'};
live.events[0].competitions[0].status={period:4,type:{name:'STATUS_IN_PROGRESS',state:'in',description:'In Progress',detail:'Round 4 - In Progress'}};
for(const c of live.events[0].competitions[0].competitors.filter(c=>c.sortOrder<=3)){c.status.type={name:'STATUS_IN_PROGRESS',state:'in'};c.status.displayThru='12';c.status.period=4;}
const liveNow=new Date('2026-11-22T19:00:00Z'),liveEvents=golfEvents(pga,{school,config,timeZone:EASTERN,now:liveNow,boards:new Map([['401850981',golfLeaderboard(live)]])});
const underWay=liveEvents.find(e=>e.golf_event==='401850981');
assert.deepEqual([underWay.status,underWay.meet_live,underWay.recency_label,underWay.live_score_source],['Live',true,'Round 4','ESPN golf leaderboard']);
assert.match(underWay.headline,/^Leader: Marco Penge \(-16\)$/);
assert.deepEqual(underWay.live_details.order[0],{position:'1',driver:'Marco Penge',car:'England',gap:'-16',today:'-5',thru:'12'});
assert.equal(underWay.results[0].result,'-16 · Thru 12');

// Cups and team events (user, November 24: "Can we look elsewhere for cup,
// team events and season standings?"). The Presidents Cup and Solheim Cup
// from their ESPN leaderboards (sessions of matches, each side's players).
const presidents=golfCupLeaderboard(json('pga-presidents-cup'));
assert.deepEqual(presidents.teams.map(t=>[t.name,t.score]),[['USA','17'],['International','13']]);
assert.equal(presidents.matches.length,30);
assert.ok(presidents.matches.every(m=>m.sides.every(s=>s.players.length)),'every match names its players');
assert.deepEqual([...new Set(presidents.matches.map(m=>m.format))],['Four-ball','Foursomes','Singles']);
assert.equal(golfCupLeaderboard(json('pga-rsm')),null,'a stroke-play leaderboard is not a cup');
const cupEvents=golfEvents(pga,{school,config,timeZone:EASTERN,now,boards:new Map(),cups:new Map([['401824815',presidents]])});
const pc=cupEvents.find(e=>e.golf_event==='401824815');
assert.deepEqual([pc.status,pc.title,pc.display_time,pc.headline,pc.opponent,pc.golf_cup],['Final','Presidents Cup','Sep 24-27','USA wins 17-13','USA vs International',true]);
assert.deepEqual(pc.results,[{participant:'USA',result:'17'},{participant:'International',result:'13'}]);
const pcd=golfCupDetails(pc,presidents,EASTERN);
assert.deepEqual(pcd.lines,['USA won the Presidents Cup, 17-13.','Singles: USA won 9, International 2, 1 halved.']);
assert.deepEqual(pcd.rows[0],{group:'Thursday, Sep 24 · Four-ball',participant:'Scottie Scheffler / Sam Burns (USA) vs Sungjae Im / Min Woo Lee (International)',result:'USA 1 Up'});
assert.equal(pcd.rows.filter(r=>r.result==='Halved').length,2);
assert.match(pcd.rows.at(-1).group,/^Sunday, Sep 27 · Singles$/);
// ESPN's sentence for the Solheim Cup reads "USA beats EUR 15-13"; the
// team points and the matches (Europe 14 wins, 2 halved) say Europe 15-13.
const solheim=golfCupLeaderboard(json('lpga-solheim-cup'));
assert.deepEqual(solheim.teams.map(t=>[t.name,t.score,t.winner]),[['Europe','15',true],['USA','13',false]]);
assert.equal(solheim.matches.length,28);
// A coming cup (no matches played) lists as a coming tournament.
const coming2=structuredClone(json('pga-presidents-cup'));coming2.events[0].status.type={name:'STATUS_SCHEDULED',state:'pre',completed:false};
const pre=golfEvents(pga,{school,config,timeZone:EASTERN,now:new Date('2026-09-01T12:00:00Z'),boards:new Map(),cups:new Map([['401824815',golfCupLeaderboard(coming2)]])}).find(e=>e.golf_event==='401824815');
assert.equal(pre.status,'Upcoming');
assert.match(worker,/cup=golfCupLeaderboard\(payload\)/);

// The Dow Championship (two-player teams; no ESPN board): lpga.com's results
// page, the top ten teams, only for the season the page names.
assert.equal(lpgaResultsUrl('Dow Championship'),'https://www.lpga.com/tournaments/dow-championship/results');
const dow=lpgaTeamResults(html('lpga-dow'),{season:2026});
assert.equal(dow.length,10);
assert.deepEqual(dow.slice(0,3).map(r=>[r.pos,r.player,r.country,r.toPar,r.points]),[['1','Gina Kim / Yana Wilson','USA','-17',820],['2','Hye-Jin Choi / Hyo Joo Kim','KOR','-15',410],['T3','Jin Hee Im / Somi Lee','KOR','-14',227.5]]);
assert.equal(lpgaTeamResults(html('lpga-dow'),{season:2027}),null,'another season\'s page is not used');
const dowEvent=golfEvents([{id:'401835159',name:'Dow Championship',start:'2026-06-11T07:00Z',end:'2026-06-14T07:00Z',season:2026,status:''}],{school:schools.find(s=>s.id==='lpga-tour'),config:proTeam('lpga-tour'),timeZone:EASTERN,now,boards:new Map([['401835159',{id:'401835159',name:'Dow Championship',start:'2026-06-11T04:00Z',end:'2026-06-14T04:00Z',state:'post',status:'STATUS_FINAL',completed:true,tv:[],rows:dow,topOnly:true,source:{name:'LPGA results (lpga.com) · top 10',url:lpgaResultsUrl('Dow Championship')}}]])})[0];
assert.deepEqual([dowEvent.status,dowEvent.headline,dowEvent.source.name,dowEvent.race_table[0].note],['Final','Winner: Gina Kim / Yana Wilson (-17)','LPGA results (lpga.com) · top 10','820 points']);
assert.equal(proTeam('lpga-tour').teamResults,'lpga');

// Season standings from the tours' own pages.
const schwab=pgatourStandings(html('pgatour-schwabcup'),{url:'https://www.pgatour.com/pgatour-champions/schwabcup'});
assert.deepEqual([schwab.title,schwab.rows.length,schwab.rows[0]],['Charles Schwab Cup Points',140,{pos:1,name:'Stewart Cink',detail:'USA',points:4999830}]);
assert.match(schwab.source.name,/^PGA TOUR \(pgatour\.com\) · Through the Charles Schwab Cup Championship, November 15$/);
const kft=pgatourStandings(html('pgatour-kft-points'),{url:'x'});assert.deepEqual([kft.title,kft.rows[0].name,kft.rows[0].points],['Korn Ferry Tour Points List','Ross Steelman',2221.371]);
const fall=pgatourStandings(html('pgatour-fedexcup'),{url:'x'});assert.deepEqual([fall.title,fall.rows[0].pos,fall.rows[0].name],['FedExCup Fall Standings',51,'Austin Smotherman']);
const cmeRace=lpgaRaceToCme(html('lpga-cme-race'),{url:'x'});
assert.equal(cmeRace.rows.length,15,'the page\'s top 15 (its second, repeated copy is not read again)');
assert.deepEqual(cmeRace.rows[0],{pos:1,name:'Nelly Korda',detail:'USA',points:4043.875},'the leader\'s exact points, not "4.0 K"');
assert.deepEqual(cmeRace.rows[14],{pos:15,name:'A Lim Kim',detail:'KOR',points:1419.735});
assert.deepEqual(['pga-tour','lpga-tour','pga-tour-champions','korn-ferry-tour','dp-world-tour','liv-golf'].map(id=>(proTeam(id).standings||[]).map(s=>s.kind).join()),['pgatour','lpga-cme','pgatour','pgatour','','']);
assert.equal(pgatourStandings('<html></html>'),null);assert.equal(lpgaRaceToCme(''),null);

console.log('golf module tests passed');
