// Professional sports (user, October 15): Pro level with Sport → League →
// Team menus; Football → NFL → Pittsburgh Steelers, Kansas City Chiefs;
// Auto Racing → NASCAR → Cup Series races. Fixtures are the real feeds of
// October 15, 2026 (ESPN team schedules and game summary; NASCAR's race
// list, standings and the Bank of America 400 weekend feed).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,wallClock,displayTime,espnTeamGames,espnGameHighlights,nascarRaces,nascarDrivers,nascarRaceDetails,nascarPodium} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const page=read('../public/index.html'),worker=read('../src/index.js');
const now=new Date('2026-10-15T18:00:00Z'),EASTERN='America/New_York',CENTRAL='America/Chicago';

// Catalog: three pro entries, each with its sport and league for the menus.
const pro=schools.filter(s=>s.level==='pro');
assert.deepEqual(pro.map(s=>[s.id,s.pro_sport,s.league,s.name]),[
  ['pittsburgh-steelers','Football','NFL','Pittsburgh Steelers'],
  ['kansas-city-chiefs','Football','NFL','Kansas City Chiefs'],
  ['nascar-cup-series','Auto Racing','NASCAR','NASCAR Cup Series']
]);
for(const s of pro){assert.ok(proTeam(s.id),s.id);assert.deepEqual(sponsored[s.id],[proTeam(s.id).sport],s.id);}
// The page: Pro menus are Sport, League, then Team (Races for racing); the
// levels run High School, College, Pro; the packaged catalog has the teams.
assert.ok(page.includes("{id:'pro',label:'Pro',group:'Sport',groups:'All sports',team:'Team'"),'Pro level menus');
assert.ok(page.includes("teamFor:sport=>sport==='Auto Racing'?'Races'"),'racing third menu is Races');
assert.ok(page.includes("cityOf:s=>s.league||'',middle:'League',middles:'All leagues'"),'League is the middle menu');
const levelOrder=[...page.matchAll(/\{id:'(high-school|college|pro)',label:/g)].map(m=>m[1]);
assert.deepEqual(levelOrder,['high-school','college','pro']);
const boot=JSON.parse(page.match(/const BOOTSTRAP_SCHOOLS=(\[.*?\]);\n/)[1]);
for(const s of pro){assert.ok(boot.some(b=>b.id===s.id&&b.level==='pro'),s.id);assert.ok(page.includes(`'${s.id}':{primary:`),`${s.id} theme`);}
assert.ok(page.includes("'nascar-cup-series':['Auto Racing']"));
// One Sport box on Pro: the sport filter is hidden (a team plays one sport).
assert.ok(page.includes("$('#sportField').hidden=level.id==='pro';"));
// Worker: pro feeds skip the college season filter; no featured athletes.
assert.ok(worker.includes('if(isPro(school))return fetchPro(school,sport,now,aiTargetId);'));
assert.ok(worker.includes('if(!isHighSchool(catalogSchool)&&!isPro(catalogSchool))events=filterActiveSeason'));
assert.ok(worker.includes('if(e.not_in_record)continue;'),'NFL playoffs are out of the season record');
// ESPN refuses a user agent carrying a web address (found on the preview).
assert.ok(worker.includes("url.startsWith(ESPN_SITE)?{headers:{'User-Agent':SCOREBOARD_USER_AGENT"),'ESPN reads use the scoreboard identity');
assert.ok(worker.includes('const r=await sourceFetch(url,init,{ttl,staleOnError:true});'),'a refused pro read serves the last copy');

// Times: ESPN gives UTC; the app keeps the team's wall clock.
assert.equal(wallClock('2026-10-02T00:15Z',EASTERN),'2026-10-01T20:15:00.000Z');
assert.equal(wallClock('2026-10-18T20:25Z',CENTRAL),'2026-10-18T15:25:00.000Z');
assert.equal(displayTime('2026-10-01T20:15:00.000Z'),'Oct 1, 8:15 PM');
assert.equal(displayTime('2026-12-27T00:00:00.000Z',{timed:false}),'Dec 27');

// Steelers: five finals, the rest upcoming; division games marked.
const steelers=schools.find(s=>s.id==='pittsburgh-steelers');
const pit=espnTeamGames([fixture('pit')],{school:steelers,config:PRO_TEAMS['pittsburgh-steelers'],timeZone:EASTERN,now});
const line=e=>`${e.status} | ${e.title} | ${e.display_time} | ${e.headline||''}${e.conference_game?' | AFC North':''}`;
assert.deepEqual(pit.slice(0,8).map(line),[
  'Final | Steelers vs Atlanta Falcons | Sep 13, 1:00 PM | W 20-13',
  'Final | Steelers at New England Patriots | Sep 20, 1:00 PM | L 3-20',
  'Final | Steelers vs Cincinnati Bengals | Sep 27, 1:00 PM | W 30-27 | AFC North',
  'Final | Steelers at Cleveland Browns | Oct 1, 8:15 PM | L 24-27 | AFC North',
  'Final | Steelers vs Indianapolis Colts | Oct 11, 1:00 PM | W 34-22',
  'Upcoming | Steelers at Tampa Bay Buccaneers | Oct 18, 1:00 PM | ',
  // Paris (Stade de France): a neutral site reads "vs".
  'Upcoming | Steelers vs New Orleans Saints | Oct 25, 9:30 AM | ',
  'Upcoming | Steelers vs Cleveland Browns | Nov 1, 1:00 PM |  | AFC North'
]);
assert.equal(pit.length,17);
// A kickoff ESPN has not set (flexed late-season games) is date only.
assert.equal(pit.find(e=>e.start_time.startsWith('2026-12-27')).display_time,'Dec 27');
assert.deepEqual(pit[5].results,[{label:'Week',value:'Week 6'},{label:'TV',value:'CBS'}]);
assert.deepEqual(pit[0].results,[{label:'Result',value:'W 20-13'},{label:'Week',value:'Week 1'}]);
assert.equal(pit[0].recap_url,'https://www.espn.com/nfl/recap?gameId=401872658');
assert.equal(pit[0].school_score,'20');assert.equal(pit[0].opponent_score,'13');

// Chiefs (Central time): 4-0, AFC West 2-0 so far.
const chiefs=schools.find(s=>s.id==='kansas-city-chiefs');
const kc=espnTeamGames([fixture('kc')],{school:chiefs,config:PRO_TEAMS['kansas-city-chiefs'],timeZone:CENTRAL,now});
const kcFinals=kc.filter(e=>e.status==='Final');
assert.deepEqual(kcFinals.map(e=>`${e.title} ${e.headline} ${e.conference_name||''}`.trim()),[
  'Chiefs vs Denver Broncos W 31-10 AFC West',
  'Chiefs vs Indianapolis Colts W 33-30 (OT)',
  'Chiefs at Miami Dolphins W 24-10',
  'Chiefs at Las Vegas Raiders W 30-27 AFC West'
]);
assert.equal(kc.find(e=>e.status==='Upcoming').display_time,'Oct 18, 3:25 PM');

// A game under way and a postponed one (shapes from ESPN's schedule).
const game=(state,name,home,away,extra={})=>({id:`g-${state}-${name}`,date:'2026-10-15T23:15Z',week:{text:'Week 7'},seasonType:{type:extra.type||2,name:extra.type===3?'Wild Card':'Regular Season'},competitions:[{timeValid:true,status:{type:{state,name,shortDetail:extra.detail||''}},competitors:[{homeAway:'home',team:{abbreviation:home,displayName:home==='PIT'?'Pittsburgh Steelers':'Baltimore Ravens'},score:extra.home!=null?{displayValue:String(extra.home)}:undefined},{homeAway:'away',team:{abbreviation:away,displayName:away==='PIT'?'Pittsburgh Steelers':'Baltimore Ravens'},score:extra.away!=null?{displayValue:String(extra.away)}:undefined}]}]});
const [live]=espnTeamGames([{events:[game('in','STATUS_IN_PROGRESS','PIT','BAL',{home:14,away:10,detail:'5:12 - 3rd'}),game('post','STATUS_POSTPONED','PIT','BAL')]}],{school:steelers,config:PRO_TEAMS['pittsburgh-steelers'],timeZone:EASTERN,now});
assert.equal(live.status,'Live');assert.equal(live.recency_label,'5:12 - 3rd');assert.equal(live.school_score,'14');assert.equal(live.title,'Steelers vs Baltimore Ravens');
const [playoff]=espnTeamGames([{events:[game('post','STATUS_FINAL','BAL','PIT',{type:3,home:17,away:24})]}],{school:steelers,config:PRO_TEAMS['pittsburgh-steelers'],timeZone:EASTERN,now});
assert.equal(playoff.headline,'W 24-17');assert.equal(playoff.not_in_record,true);assert.equal(playoff.conference_game,undefined);assert.equal(playoff.round,'Wild Card');
// A past game ESPN never scored is not listed.
assert.equal(espnTeamGames([{events:[{...game('pre','STATUS_SCHEDULED','PIT','BAL'),date:'2026-10-01T17:00Z'}]}],{school:steelers,config:PRO_TEAMS['pittsburgh-steelers'],timeZone:EASTERN,now}).length,0);

// Expanded final: ESPN's summary, from the Steelers' side.
const details=espnGameHighlights(pit[0],fixture('sum'),PRO_TEAMS['pittsburgh-steelers']);
assert.deepEqual(details.lines,[
  'The Steelers beat the Atlanta Falcons 20-13 at home (Acrisure Stadium), Week 1.',
  'The Steelers led 13-7 at halftime.',
  'Passing Yards: Aaron Rodgers, 24/40, 221 YDS, 1 TD.',
  'Rushing Yards: Jaylen Warren, 10 CAR, 46 YDS.',
  'Receiving Yards: Michael Pittman Jr., 3 REC, 58 YDS.'
]);
assert.deepEqual(details.stats.slice(0,5).map(s=>`${s.label}: ${s.value}`),['Q1: Steelers 3 · Falcons 7','Q2: Steelers 10 · Falcons 0','Q3: Steelers 0 · Falcons 3','Q4: Steelers 7 · Falcons 3','Total yards: Steelers 264 · Falcons 238']);
assert.equal(details.scoring.length,7);
assert.equal(details.scoring[5],'Q4 14:05 · PIT: T.J. Watt 35 Yd Interception Return (Chris Boswell Kick)');
assert.equal(details.recap,'https://www.espn.com/nfl/recap?gameId=401872658');

// NASCAR: the 2026 Cup Series, 40 races (36 run, 4 to go).
const series=schools.find(s=>s.id==='nascar-cup-series');
const drivers=nascarDrivers(fixture('pts'));
const races=nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now,drivers});
assert.equal(races.length,40);
assert.equal(races.filter(r=>r.status==='Final').length,36);
const raceLine=r=>`${r.status} | ${r.title} | ${r.opponent} | ${r.display_time} | ${r.headline||''}`;
assert.deepEqual(races.slice(-6).map(raceLine),[
  'Final | South Point 400 | Las Vegas Motor Speedway | Oct 4, 5:30 PM | Winner: Chase Briscoe (#19)',
  'Final | Bank of America 400 | Charlotte Motor Speedway | Oct 11, 3:00 PM | Winner: Chase Briscoe (#19)',
  'Upcoming | Freeway Insurance 500 | Phoenix Raceway | Oct 18, 3:00 PM | ',
  'Upcoming | YellaWood 500 | Talladega Superspeedway | Oct 25, 2:00 PM | ',
  'Upcoming | Xfinity 500 | Martinsville Speedway | Nov 1, 2:00 PM | ',
  'Upcoming | NASCAR Championship Race | Homestead-Miami Speedway | Nov 8, 3:00 PM | '
]);
assert.equal(races[0].title,'Cook Out Clash at Bowman Gray (non-points)');assert.equal(races[0].exhibition,true);
assert.equal(races.find(r=>r.title==='Hollywood Casino 400').headline,'Winner: Kyle Larson (#5)');
assert.deepEqual(races.find(r=>r.race_id===5629).results,[{label:'Winner',value:'Chase Briscoe · #19'},{label:'Laps',value:'267'},{label:'Lead changes',value:'11 among 5 drivers'},{label:'Cautions',value:'6 for 33 laps'},{label:'Margin of victory',value:'0.029 s'}]);
assert.deepEqual(races.find(r=>r.race_id===5633).results,[{label:'Distance',value:'312 laps · 312 mi'},{label:'TV',value:'USA'}]);
// Part-time winners (driver 4387) are not in the standings: named from their
// race's own results; until then the race reads "Final".
const unnamed=races.filter(r=>r.status==='Final'&&!r.winner);
assert.deepEqual(unnamed.map(r=>r.title),['Anduril 250','Brickyard 400 presented by PPG']);
assert.equal(unnamed[0].headline,'Final');
const named=nascarDrivers(fixture('pts'),[{weekend_race:[{results:[{driver_id:4387,driver_fullname:'Shane van Gisbergen (i)',car_number:'88'}]}]}]);
assert.deepEqual(named.get(4387),{name:'Shane van Gisbergen',car:'88'});
// Live timing on race day.
const raceDay=new Date('2026-10-18T19:00:00Z');
const liveFeed={race_id:5633,run_type:3,flag_state:2,lap_number:120,laps_in_race:312,vehicles:[{running_position:2,vehicle_number:'5',driver:{full_name:'Kyle Larson'}},{running_position:1,vehicle_number:'19',driver:{full_name:'Chase Briscoe'}}]};
const liveRace=nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now:raceDay,drivers,live:liveFeed}).find(r=>r.race_id===5633);
assert.equal(liveRace.status,'Live');assert.equal(liveRace.recency_label,'Lap 120 of 312 · Caution');assert.equal(liveRace.headline,'Leader: Chase Briscoe (#19)');
assert.deepEqual(liveRace.results.map(r=>r.participant),['1st Chase Briscoe','2nd Kyle Larson']);
assert.equal(liveRace.event_type,'RACE');
// Before the green flag the race reads Today.
assert.equal(nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now:raceDay,drivers,live:{...liveFeed,flag_state:9,lap_number:0}}).find(r=>r.race_id===5633).status,'Today');

// Expanded final race: the finishing order and the race's numbers.
const race=nascarRaceDetails(races.find(r=>r.race_id===5629),fixture('wf'));
assert.equal(race.rows.length,39);
assert.deepEqual(race.rows.slice(0,3),[{participant:'1st Chase Briscoe',result:'#19 · Joe Gibbs Racing · 62 laps led'},{participant:'2nd Christopher Bell',result:'#20 · Joe Gibbs Racing · 93 laps led'},{participant:'3rd Ryan Blaney',result:'#12 · Team Penske · 4 laps led'}]);
assert.deepEqual(race.lines,[
  'Chase Briscoe (#19, Joe Gibbs Racing) won the Bank of America 400 at Charlotte Motor Speedway, ahead of Christopher Bell by 0.029 s.',
  'Chase Briscoe started 2nd and led 62 laps.',
  'Kyle Larson led the most laps (97).',
  'Stage 1: won by Kyle Larson.',
  'Stage 2: won by Christopher Bell.',
  '11 lead changes among 5 drivers; 6 cautions for 33 laps.'
]);
assert.deepEqual(race.stats,[{label:'Laps',value:'267'},{label:'Average speed',value:'139.561 mph'},{label:'Race time',value:'2:52:11'},{label:'Cars in the field',value:'39'}]);

// Formatting (user, October 15). No logos or car-number art anywhere
// ("Leave the logos out": trademarks not licensed here).
assert.ok(!/logo/i.test(JSON.stringify([...pit,...kc,...races])),'no logo fields in pro events');
assert.ok(!/espncdn\.com|carbadges|<img[^>]*logo/i.test(page),'the page shows no team logos or car badges');
// The spotlight's TV line and the next race's.
assert.equal(pit.find(e=>e.status==='Upcoming').broadcast,'CBS');
assert.equal(races.find(r=>r.race_id===5633).broadcast,'USA');
// Winner-first race cards: the top three from a race's own results.
assert.deepEqual(nascarPodium(fixture('wf')),[
  {place:1,name:'Chase Briscoe',car:'19',team:'Joe Gibbs Racing'},
  {place:2,name:'Christopher Bell',car:'20',team:'Joe Gibbs Racing'},
  {place:3,name:'Ryan Blaney',car:'12',team:'Team Penske'}
]);
assert.deepEqual(nascarPodium(null),[]);
const withPodium=nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now,drivers,podiums:new Map([[5629,nascarPodium(fixture('wf'))]])});
assert.equal(withPodium.find(r=>r.race_id===5629).podium.length,3);
assert.equal(withPodium.find(r=>r.race_id===5630).podium,undefined,'races without a read keep the winner line only');
assert.ok(worker.includes('.slice(0,5);')&&worker.includes('nascarPodium(await readJson(weekend(r.race_id),SOURCE_TTL.document))'),'the five latest finals read their top three');
// The page: the next game or race leads (All view, nothing live) and is not
// repeated in the upcoming list; race finals lead with the winner.
assert.ok(page.includes("const spotlightOf=g=>(g.upcoming[0]?.pro&&!g.live.length&&currentView==='all')?g.upcoming[0]:null;"));
assert.ok(page.includes("section('Upcoming Schedule',spotlightOf(g)?g.upcoming.slice(1):g.upcoming,'upcoming')"));
assert.ok(page.includes("if(e.event_type==='RACE'&&e.status==='Final'){const r=raceFinalCard(e);if(r)return r}"));

console.log('pro sports module tests passed');
