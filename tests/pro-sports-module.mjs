// Professional sports (user, October 15): Pro level with Sport → League →
// Team menus; Football → NFL → Pittsburgh Steelers, Kansas City Chiefs;
// Auto Racing → NASCAR → Cup Series races. Fixtures are the real feeds of
// October 15, 2026 (ESPN team schedules and game summary; NASCAR's race
// list, standings and the Bank of America 400 weekend feed).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,wallClock,displayTime,espnTeamGames,espnGameHighlights,nascarRaces,nascarDrivers,nascarRaceDetails,nascarFinishRows,nascarLiveDetails,applyEspnLive,espnLiveDetails,nascarFinishTable} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.json.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json'));
const page=read('../public/index.html'),worker=read('../src/index.js');
const now=new Date('2026-10-15T18:00:00Z'),EASTERN='America/New_York',CENTRAL='America/Chicago';

// Catalog: the whole NFL (user, October 16: "Add the entire NFL. Group them
// by division"), 32 teams in their eight divisions, then the Cup Series.
const pro=schools.filter(s=>s.level==='pro');
// IMSA's two championships follow (user, October 16: "Let's add IMSA racing
// series under auto racing"; tests/imsa-module.mjs).
assert.equal(pro.length,35);
assert.deepEqual(pro.slice(-3).map(s=>s.id),['nascar-cup-series','imsa-weathertech','imsa-pilot-challenge']);
const nfl=pro.filter(s=>s.league==='NFL'),divisions={};
for(const s of nfl)(divisions[s.conference]??=[]).push(s.short_name);
assert.deepEqual(divisions,{
  'AFC East':['Bills','Dolphins','Patriots','Jets'],'AFC North':['Ravens','Bengals','Browns','Steelers'],
  'AFC South':['Texans','Colts','Jaguars','Titans'],'AFC West':['Broncos','Chiefs','Raiders','Chargers'],
  'NFC East':['Cowboys','Giants','Eagles','Commanders'],'NFC North':['Bears','Lions','Packers','Vikings'],
  'NFC South':['Falcons','Panthers','Saints','Buccaneers'],'NFC West':['Cardinals','Rams','49ers','Seahawks']
});
// Each team reads its own ESPN schedule; its division rivals are the other
// three teams of its catalog division (the header's division record).
const abbr=s=>PRO_TEAMS[s.id].espn.team.toUpperCase();
assert.equal(new Set(nfl.map(abbr)).size,32);
for(const s of nfl){
  const config=PRO_TEAMS[s.id];
  assert.equal(s.division,`NFL · ${s.conference}`,s.id);assert.equal(s.pro_sport,'Football');
  assert.equal(config.division.name,s.conference,s.id);
  assert.deepEqual(config.division.members.slice().sort(),nfl.filter(t=>t.conference===s.conference&&t!==s).map(abbr).sort(),s.id);
  assert.equal(s.providers[0].slug,`football/nfl/teams/${config.espn.team}`,s.id);
  assert.match(config.schedule,/^https:\/\/www\.[a-z0-9]+\.com\/schedule\/$/,s.id);
}
// The Raiders play in Las Vegas (Pacific time), not the Eastern default.
assert.ok(worker.includes("Nevada:'America/Los_Angeles'"));
for(const s of pro){assert.ok(proTeam(s.id),s.id);assert.deepEqual(sponsored[s.id],[proTeam(s.id).sport],s.id);}
// The page: Pro menus are Sport, League, then Team (Races for racing); the
// levels run High School, College, Pro; the packaged catalog has the teams.
assert.ok(page.includes("{id:'pro',label:'Pro',group:'Sport',groups:'All sports',team:'Team'"),'Pro level menus');
assert.ok(page.includes("teamFor:sport=>sport==='Auto Racing'?'Races'"),'racing third menu is Races');
assert.ok(page.includes("cityOf:s=>s.league||'',middle:'League',middles:'All leagues'"),'League is the middle menu');
const levelOrder=[...page.matchAll(/\{id:'(high-school|college|pro)',label:/g)].map(m=>m[1]);
assert.deepEqual(levelOrder,['high-school','college','pro']);
// The menus, colors and sports come with the catalog cards
// (tests/catalog-module.mjs; colors in src/team-themes.json).
const themes=JSON.parse(read('../src/team-themes.json'));
for(const s of pro)assert.ok(themes[s.id]?.primary,`${s.id} theme`);
// The Team box groups NFL teams under their division, always (user, October
// 16: "Group them by division"); NASCAR's series sits under NASCAR.
assert.ok(page.includes("sectionOf:s=>s.league==='NFL'?s.conference:s.league}"));
assert.ok(page.includes("const sectioned=!conf||level.id==='high-school'||level.id==='pro';"));
// One Sport box on Pro: the sport filter is hidden (a team plays one sport).
assert.ok(page.includes("$('#sportField').hidden=level.id==='pro';"));
// Worker: pro feeds skip the college season filter; no featured athletes.
assert.ok(worker.includes('if(isPro(school))return fetchPro(school,sport,now,aiTargetId);'));
assert.ok(worker.includes('if(!isHighSchool(groupSchool)&&!isPro(groupSchool))events=filterActiveSeason'));
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
// The expanded view's own layout (user, October 16: "can we clean up the
// card please": scoring plays were squeezed into label/value rows and
// overtime read "Q5"). Score by quarter, team stats, scoring plays by quarter
// with the running score from the team's side.
const box=details.box_score;
assert.deepEqual([box.teams,box.totals],[{ours:'PIT',theirs:'ATL'},{ours:'20',theirs:'13'}]);
assert.deepEqual(box.line.map(p=>`${p.label} ${p.ours}-${p.theirs}`),['Q1 3-7','Q2 10-0','Q3 0-3','Q4 7-3']);
assert.equal(box.stats.length,11);assert.deepEqual(box.stats[0],{label:'Total yards',ours:'264',theirs:'238'});
assert.deepEqual(box.scoring[1],{period:'Q1',clock:'1:13',team:'ATL',ours:false,text:'Bijan Robinson 23 Yd pass from Cooper Rush (Nick Folk Kick)',score:'3-7'});
assert.deepEqual(box.scoring.at(-1),{period:'Q4',clock:'10:35',team:'ATL',ours:false,text:'Nick Folk 43 Yd Field Goal',score:'20-13'});
{
  const ot=JSON.parse(JSON.stringify(fixture('sum')));ot.scoringPlays.push({...ot.scoringPlays[0],period:{number:5},clock:{displayValue:'1:55'}});
  const withOt=espnGameHighlights(pit[0],ot,PRO_TEAMS['pittsburgh-steelers']);
  assert.equal(withOt.box_score.scoring.at(-1).period,'OT');assert.match(withOt.scoring.at(-1),/^OT 1:55 · PIT:/);
}
// The Worker gives the final its box score and keeps the scoring plays out
// of the result rows.
assert.ok(worker.includes('target.box_score=details.box_score;'));
assert.ok(!worker.includes("details.scoring.map(value=>({label:'Scoring',value}))"));
assert.ok(worker.includes("${proTeam(school)?'|box2':''}"),'saved pro expanded views are rebuilt once');
{
  const fn=name=>{const at=page.indexOf(`function ${name}(`);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n}\n',at)+2);};
  const line=start=>{const at=page.indexOf(start);assert.ok(at>=0,start);return page.slice(at,page.indexOf('\n',at));};
  const boxScoreHtml=Function(`${line('const esc=')}\n${fn('boxScoreHtml')};return boxScoreHtml;`)();
  const html=boxScoreHtml({box_score:box});
  assert.match(html.line,/<th>Q1<\/th><th>Q2<\/th><th>Q3<\/th><th>Q4<\/th><th>T<\/th><\/tr><tr class="won"><th scope="row">PIT<\/th><td>3<\/td><td>10<\/td><td>0<\/td><td>7<\/td><td class="total">20<\/td>/);
  assert.match(html.stats,/<td>Time of possession<\/td><td>28:53<\/td><td>31:07<\/td>/);
  assert.match(html.plays,/<div class="play-head">1st Quarter<\/div><div class="play-row ours"><span class="play-team">PIT<\/span><span class="play-text">Chris Boswell 43 Yd Field Goal<\/span><span class="play-score">3-0<\/span><span class="play-clock">8:30<\/span><\/div>/);
  assert.equal((html.plays.match(/play-head/g)||[]).length,4);
  assert.deepEqual(boxScoreHtml({}),{line:'',stats:'',plays:''});
  assert.ok(page.includes("${box.line}${highlights}${!highlights?recapButton:''}${gameStats}${box.stats}${box.plays}"));
}

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
// Without the race's own results, the card shows the winner from the standings.
assert.deepEqual(races.find(r=>r.race_id===5629).results,[{participant:'Chase Briscoe (#19)',result:'1st'}]);
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
// The live card shows the whole live timing feed (user, October 16: "update
// all live cards to show all the data"): stage, laps to go, cautions, lead
// changes, and every car's gap, make, laps led and last-lap speed. Field
// names are the live feed's (read idle on Oct 15; the first live race is
// Phoenix, Oct 18).
const fullFeed={...liveFeed,laps_to_go:192,number_of_caution_segments:3,number_of_caution_laps:17,number_of_lead_changes:6,number_of_leaders:4,stage:{stage_num:2,finish_at_lap:185,laps_in_stage:140},vehicles:[
  {running_position:1,vehicle_number:'19',driver:{full_name:'Chase Briscoe'},delta:0,vehicle_manufacturer:'Tyt',laps_led:[{start_lap:1,end_lap:40},{start_lap:101,end_lap:120}],last_lap_speed:131.2,is_on_track:true},
  {running_position:2,vehicle_number:'5',driver:{full_name:'Kyle Larson'},delta:1.204,vehicle_manufacturer:'Chv',laps_led:[{start_lap:41,end_lap:100}],last_lap_speed:130.95,is_on_track:true},
  {running_position:3,vehicle_number:'88',driver:{full_name:'Shane van Gisbergen (i)'},delta:-1,vehicle_manufacturer:'Chv',laps_led:[],last_lap_speed:0,is_on_track:false}
]};
const raceLive=nascarLiveDetails(fullFeed);
assert.equal(raceLive.stage,'Stage 2 · ends lap 185');assert.equal(raceLive.laps_to_go,192);
assert.deepEqual(raceLive.numbers,[{label:'Cautions',value:'3 for 17 laps'},{label:'Lead changes',value:'6 among 4 drivers'}]);
assert.deepEqual(raceLive.order,[
  {position:1,driver:'Chase Briscoe',car:'#19',gap:'Leader',make:'Toyota',laps_led:60,last_lap_speed:'131.200 mph',pit:null},
  {position:2,driver:'Kyle Larson',car:'#5',gap:'+1.204 s',make:'Chevrolet',laps_led:60,last_lap_speed:'130.950 mph',pit:null},
  {position:3,driver:'Shane van Gisbergen',car:'#88',gap:'1 lap down',make:'Chevrolet',laps_led:null,last_lap_speed:null,pit:'Pit road'}
]);
assert.equal(nascarLiveDetails(null),null);
assert.deepEqual(nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now:raceDay,drivers,live:fullFeed}).find(r=>r.race_id===5633).live_details,raceLive);
// Before the green flag the race reads Today.
assert.equal(nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now:raceDay,drivers,live:{...liveFeed,flag_state:9,lap_number:0}}).find(r=>r.race_id===5633).status,'Today');

// Expanded final race: the finishing order and the race's numbers.
const race=nascarRaceDetails(races.find(r=>r.race_id===5629),fixture('wf'));
assert.equal(race.rows.length,39);
assert.deepEqual(race.rows.slice(0,3),[{participant:'Chase Briscoe (#19)',result:'1st · Joe Gibbs Racing · Toyota · 62 laps led'},{participant:'Christopher Bell (#20)',result:'2nd · Joe Gibbs Racing · Toyota · 93 laps led'},{participant:'Ryan Blaney (#12)',result:'3rd · Team Penske · Ford · 4 laps led'}]);
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
// Cross-country layout (user, October 15): one row per driver; the card the
// top three, the expanded view the whole field.
const finish=nascarFinishRows(fixture('wf'));
assert.equal(finish.length,39);
assert.deepEqual(finish[38],{participant:'William Byron (#24)',result:'39th · Hendrick Motorsports · Chevrolet · Accident'});
assert.deepEqual(nascarFinishRows(null),[]);
const withRows=nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now,drivers,finishes:new Map([[5629,finish]])});
const charlotte=withRows.find(r=>r.race_id===5629);
assert.deepEqual(charlotte.results,finish.slice(0,3));
assert.equal(charlotte.result_count,39);assert.equal(charlotte.has_more_results,true);
assert.equal(charlotte.headline,'Winner: Chase Briscoe (#19)');
assert.ok(worker.includes('const feeds=new Map(await Promise.all(finals.map(async r=>[r.race_id,await readJson(weekend(r.race_id),SOURCE_TTL.document)])));'),'every final reads its results');
assert.ok(worker.includes('if(!Array.isArray(list)||!list.some(r=>r.series_id===config.seriesId))return failed('),'an empty race list is a failed read');
// The page: the next game or race leads (All view, nothing live) and is not
// repeated in the upcoming list; race finals lead with the winner.
// The next-game spotlight is for football; races keep the cross-country lists.
assert.ok(page.includes("const spotlightOf=g=>(g.upcoming[0]?.pro&&g.upcoming[0].event_type!=='RACE'&&!g.live.length&&currentView==='all')?g.upcoming[0]:null;"));
assert.ok(page.includes("section('Upcoming Schedule',spotlightOf(g)?g.upcoming.slice(1):g.upcoming,'upcoming')"));
assert.ok(!page.includes('raceFinalCard'),'race finals use the shared result card');

// Live cards show everything ESPN publishes (user, October 16: "update all
// live cards to show all the data"). Real scoreboard and summary of Seattle at
// Denver, Oct 15 (13:44 left in the 3rd, Denver ball, 3rd & 11 at DEN 44).
{
  const board=fixture('live-sb'),summary=fixture('live-sum');
  const today=()=>({id:'live-x-401872995-today',status:'Today',results:[{label:'Week',value:'Week 7'},{label:'TV',value:'Prime Video'}],espn_event_id:'401872995'});
  const den=applyEspnLive(today(),board,summary,PRO_TEAMS['denver-broncos']);
  assert.deepEqual([den.id,den.status,den.school_score,den.opponent_score,den.recency_label,den.possession,den.down_distance,den.red_zone],['live-x-401872995-live','Live','14','3','13:44 - 3rd','school','3rd & 11 at DEN 44',false]);
  const d=den.live_details;
  assert.deepEqual(d.line,[{label:'Q1',ours:'0',theirs:'3'},{label:'Q2',ours:'14',theirs:'0'},{label:'Q3',ours:'0',theirs:'0'}]);
  assert.deepEqual([d.teams,d.records,d.timeouts,d.win_probability],[{ours:'DEN',theirs:'SEA'},{ours:'3-2',theirs:'3-2'},{ours:3,theirs:3},82.4]);
  assert.equal(d.last_play,'J.Dobbins left guard to DEN 44 for no gain (D.Lawrence).');assert.equal(d.drive,'3 plays, 9 yards, 1:16');
  assert.deepEqual(d.leaders.map(l=>`${l.label}: ${l.value}`),['Passing: Bo Nix (DEN), 11/16, 88 YDS','Rushing: J.K. Dobbins (DEN), 13 CAR, 34 YDS, 1 TD','Receiving: Cooper Kupp (SEA), 4 REC, 33 YDS']);
  assert.equal(d.stats.length,11);assert.deepEqual(d.stats[0],{label:'Total yards',ours:'139',theirs:'91'});assert.deepEqual(d.stats.at(-1),{label:'Time of possession',ours:'17:25',theirs:'13:51'});
  assert.deepEqual(d.scoring,['Q1 6:31 · SEA: Jason Myers 55 Yd Field Goal','Q2 12:52 · DEN: J.K. Dobbins 4 Yd Rush (Wil Lutz Kick)','Q2 5:15 · DEN: RJ Harvey 1 Yd Rush (Wil Lutz Kick)']);
  assert.deepEqual([d.broadcast,d.venue],['Prime Video','Empower Field at Mile High']);
  // From Seattle's side everything turns around.
  const sea=applyEspnLive(today(),board,summary,PRO_TEAMS['seattle-seahawks']);
  assert.deepEqual([sea.school_score,sea.opponent_score,sea.possession,sea.live_details.win_probability,sea.live_details.stats[0].ours,sea.live_details.line[0].ours],['3','14','opponent',17.7,'91','3']);
  // Without the summary the board's details still show.
  const bare=applyEspnLive(today(),board,null,PRO_TEAMS['denver-broncos']);
  assert.equal(bare.live_details.stats,undefined);assert.equal(bare.live_details.last_play,d.last_play);
  // Timeouts by side (Denver is home), overtime periods by name.
  const tweaked=JSON.parse(JSON.stringify(board)),tc=tweaked.events[0].competitions[0];tc.situation.homeTimeouts=1;tc.competitors.forEach(t=>t.linescores.push({value:3,displayValue:'3',period:5}));
  assert.deepEqual(applyEspnLive(today(),tweaked,null,PRO_TEAMS['seattle-seahawks']).live_details.timeouts,{ours:3,theirs:1});
  assert.equal(applyEspnLive(today(),tweaked,null,PRO_TEAMS['denver-broncos']).live_details.line.at(-1).label,'OT');
  // A game that ends between team-schedule reads turns Final from the board.
  const ended=JSON.parse(JSON.stringify(board));const c=ended.events[0].competitions[0];c.status.type={state:'post',shortDetail:'Final'};c.competitors.find(t=>t.team.abbreviation==='DEN').score='24';c.competitors.find(t=>t.team.abbreviation==='SEA').score='10';
  const final=applyEspnLive(today(),ended,null,PRO_TEAMS['denver-broncos']);
  assert.deepEqual([final.id,final.status,final.headline,final.results],['live-x-401872995-final','Final','W 24-10',[{label:'Result',value:'W 24-10'},{label:'Week',value:'Week 7'}]]);
  // Another team's game (not on this board) is left alone.
  assert.equal(applyEspnLive(today(),board,summary,PRO_TEAMS['pittsburgh-steelers']).status,'Today');
  // The Worker reads the board and summary only for a game past its kickoff.
  assert.ok(worker.includes("for(const event of events.filter(e=>(e.status==='Live'||e.status==='Today')&&Date.parse(e.espn_date)<=now.getTime())){"));
  assert.ok(worker.includes('readJson(board,15),readJson(game,30)'));
  // The page: score by quarter, facts, last play, leaders, folded team stats
  // and scoring plays; NASCAR: stage, numbers and every car.
  const fn=name=>{const at=page.indexOf(`function ${name}(`);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n}\n',at)+2);};
  const line=start=>{const at=page.indexOf(start);assert.ok(at>=0,start);return page.slice(at,page.indexOf('\n',at));};
  const [liveMore,raceMore]=Function(`${line('const esc=')}\n${line('function monogram(')}\n${fn('liveMore')}\n${fn('raceMore')};return [liveMore,raceMore];`)();
  const html=liveMore(den,'Broncos','Seattle Seahawks');
  assert.match(html,/<th>Q1<\/th><th>Q2<\/th><th>Q3<\/th><th>T<\/th>/);
  assert.match(html,/<th scope="row">DEN <small>\(3-2\)<\/small><\/th><td>0<\/td><td>14<\/td><td>0<\/td><td class="total">14<\/td>/);
  assert.match(html,/Timeouts <b>DEN 3 · SEA 3<\/b>[^]*Win probability <b>DEN 82\.4%<\/b>[^]*TV <b>Prime Video<\/b>[^]*Empower Field at Mile High/);
  assert.match(html,/<details><summary>Team stats<\/summary>[^]*<td>Time of possession<\/td><td>17:25<\/td><td>13:51<\/td>/);
  assert.match(html,/<details><summary>Scoring plays \(3\)<\/summary>/);
  assert.equal(liveMore({},'a','b'),'');
  const race=raceMore({live_details:raceLive});
  assert.match(race,/Stage 2 · ends lap 185[^]*192 laps to go[^]*Cautions: 3 for 17 laps/);
  assert.match(race,/<td>3<\/td><td>Shane van Gisbergen #88 <small>Pit road<\/small><\/td><td>1 lap down<\/td><td>Chevrolet<\/td>/);
  assert.ok(!race.includes('Rest of the field'),'ten cars or fewer: nothing folded');
  const many=raceMore({live_details:{order:Array.from({length:38},(_,i)=>({position:i+1,driver:`D${i+1}`,car:`#${i+1}`}))}});
  assert.match(many,/Rest of the field \(28\)/);
  assert.ok(page.includes("if(ev.target.closest('.live-more details'))return;"),'opening a fold does not open the event window');
}

// The race window's results table (user, October 16: "NASCAR full results
// is still not showing car manufacturer and the layout is messy"): the phone
// showed a copy kept on the device from before the make was added, in the
// old "1st Chase Briscoe | #19 · Joe Gibbs Racing" rows.
{
  const table=nascarFinishTable(fixture('wf'));
  assert.equal(table.length,39);
  assert.deepEqual(table[0],{pos:1,driver:'Chase Briscoe',car:'#19',team:'Joe Gibbs Racing',make:'Toyota',laps_led:62,status:''});
  assert.deepEqual(table[38],{pos:39,driver:'William Byron',car:'#24',team:'Hendrick Motorsports',make:'Chevrolet',laps_led:0,status:'Accident'});
  assert.equal(table.filter(r=>!r.make).length,0,'every car has its make');
  assert.deepEqual(nascarRaceDetails(races.find(r=>r.race_id===5629),fixture('wf')).table,table);
  assert.ok(worker.includes('target.race_table=details.table;'));
  const fn=name=>{const at=page.indexOf(`function ${name}(`);assert.ok(at>=0,name);return page.slice(at,page.indexOf('\n}\n',at)+2);};
  const line=start=>{const at=page.indexOf(start);assert.ok(at>=0,start);return page.slice(at,page.indexOf('\n',at));};
  const raceTableHtml=Function(`${line('const esc=')}\n${fn('raceTableHtml')};return raceTableHtml;`)();
  const html=raceTableHtml({race_table:table});
  assert.match(html,/^<div class="race-table"><div class="race-row podium"><span class="race-pos">1<\/span><span class="race-driver">Chase Briscoe<small>#19<\/small><\/span><span class="race-make">Toyota<\/span><span class="race-team">Joe Gibbs Racing<\/span><span class="race-note">62 laps led<\/span><\/div>/);
  assert.match(html,/<span class="race-pos">39<\/span><span class="race-driver">William Byron<small>#24<\/small><\/span><span class="race-make">Chevrolet<\/span><span class="race-team">Hendrick Motorsports<\/span><span class="race-note out">Accident<\/span>/);
  assert.equal(raceTableHtml({}),'');
  // The list card shows the top three in the same layout.
  const listed=nascarRaces(fixture('nascar'),{school:series,config:PRO_TEAMS['nascar-cup-series'],timeZone:EASTERN,now,drivers,tables:new Map([[5629,table]])}).find(r=>r.race_id===5629);
  assert.deepEqual(listed.race_table,table.slice(0,3));
  assert.ok(page.includes("if(e.race_table?.length&&kind!=='live')return raceCard(e);"));
  assert.ok(page.includes('${raceTableHtml({race_table:e.race_card?.length?e.race_card:e.race_table.slice(0,3)})}'));
  assert.ok(page.includes('const rows=e.race_table?.length?raceTableHtml(e):displayResults.map('));
  // Finals kept on the phone before this layout are read again.
  assert.ok(page.includes("const FINAL_CACHE_PREFIX='sas-final:v2:',"));
}
console.log('pro sports module tests passed');
