// Major League Soccer (user, October 17, 2026: "Let's add soccer to the pro
// section"): Pro → Soccer → MLS → all 30 clubs by conference. Fixtures of
// October 17, 2026 from ESPN: Sporting Kansas City's results and fixtures,
// the SKC–Portland (3-3) and Nashville–SKC (4-0) match summaries, the Oct 14
// scoreboard's Nashville–SKC game, and Inter Miami's 2025 playoff run.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {PRO_TEAMS,proTeam,espnTeamGames,espnGameHighlights,applyEspnLive,soccerGoals} from '../src/pro-sports.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/pro-sports/${name}.gz`,import.meta.url))).toString('utf8'));
const schools=JSON.parse(read('../src/schools.json')),sponsored=JSON.parse(read('../src/sponsored-sports.json')),themes=JSON.parse(read('../src/team-themes.json'));
const worker=read('../src/index.js'),page=read('../public/index.html');
const CENTRAL='America/Chicago',now=new Date('2026-10-17T16:00:00Z');

// Catalog: 30 clubs, 15 per conference, each a Soccer entry with its colors,
// an ESPN team id and its club's schedule page.
const mls=schools.filter(s=>s.league==='MLS');
assert.equal(mls.length,30);
assert.deepEqual([...new Set(mls.map(s=>s.conference))],['Eastern Conference','Western Conference']);
assert.equal(mls.filter(s=>s.conference==='Eastern Conference').length,15);
for(const s of mls){
  assert.equal(s.level,'pro');assert.equal(s.pro_sport,'Soccer');
  assert.deepEqual(sponsored[s.id],['Soccer']);
  assert.ok(themes[s.id]?.primary,s.id);
  const config=proTeam(s.id);
  assert.equal(config.kind,'espn-team');assert.equal(config.sport,'Soccer');assert.equal(config.espn.path,'soccer/usa.1');
  assert.ok(Number.isInteger(config.espn.id),s.id);assert.equal(config.fixtures,true);assert.match(config.schedule,/^https:\/\/[^/]+\/schedule\/$/);
}
assert.equal(new Set(mls.map(s=>proTeam(s.id).espn.team)).size,30);
const skc=mls.find(s=>s.id==='sporting-kansas-city');
assert.deepEqual([skc.name,skc.short_name,skc.conference,skc.state],['Sporting Kansas City','Sporting KC','Western Conference','Kansas']);
// Vancouver's white primary gives way to its blue; its games are in Pacific time.
assert.equal(themes['vancouver-whitecaps'].primary,'#12284C');
assert.ok(worker.includes("'British Columbia':'America/Vancouver'"));
// The Team box groups clubs under their conference, as it does NFL divisions.
assert.ok(page.includes("sectionOf:s=>['NFL','MLS','MLB'].includes(s.league)?s.conference:s.league}"));

// The Worker reads results and fixtures (ESPN's numeric id in the URL), the
// NFL-only postseason read stays the NFL's, and MLS is in season Feb-Dec.
assert.ok(worker.includes('/teams/${config.espn.id??config.espn.team}/schedule'));
assert.ok(worker.includes('if(config.fixtures)urls.push(`${base}?fixture=true`);'));
assert.ok(worker.includes("if(config.sport==='Football'&&month<=2)urls.push(`${base}?seasontype=3`);"));
assert.ok(worker.includes('const PRO_SEASONS={Soccer:[[2,12]],'));
assert.ok(worker.includes('inSeason(sport,now.getUTCMonth()+1,isPro(groupSchool))'));

// Sporting KC: 29 finals (W-L-T from the club's side), today's match and four
// more coming, in Central time.
const config=PRO_TEAMS['sporting-kansas-city'];
const games=espnTeamGames([json('mls-skc.json'),json('mls-skc-fixtures.json')],{school:skc,config,timeZone:CENTRAL,now});
const line=e=>`${e.status} | ${e.title} | ${e.display_time} | ${e.headline||''}`;
assert.equal(games.length,34);
assert.equal(games.filter(e=>e.status==='Final').length,29);
assert.deepEqual(games.slice(0,2).map(line),['Final | Sporting KC at Nashville SC | Oct 14, 7:30 PM | L 0-4','Final | Sporting KC vs Portland Timbers | Oct 10, 7:30 PM | T 3-3']);
assert.deepEqual(games.slice(-5).map(line),[
  'Today | Sporting KC vs Real Salt Lake | Oct 17, 7:30 PM | ',
  'Upcoming | Sporting KC vs Austin FC | Oct 24, 7:30 PM | ',
  'Upcoming | Sporting KC at Minnesota United FC | Oct 28, 7:30 PM | ',
  'Upcoming | Sporting KC vs FC Dallas | Oct 31, 2:00 PM | ',
  'Upcoming | Sporting KC at San Diego FC | Nov 7, 6:00 PM | '
]);
assert.equal(games[0].source.name,'ESPN team schedule (MLS)');assert.equal(games[0].venue,'GEODIS Park');
assert.equal(games.at(-1).broadcast,'Apple TV');
// The season record: 6 wins, 19 losses, 4 draws (ESPN lists it 6-4-19, W-D-L).
const tally=games.filter(e=>e.status==='Final').reduce((t,e)=>(t[e.headline[0]]++,t),{W:0,L:0,T:0});
assert.deepEqual(tally,{W:6,L:19,T:4});
assert.ok(games.every(e=>!e.conference_game&&!e.not_in_record));

// Playoff rounds are their own season types: labeled, out of the record.
const mia=mls.find(s=>s.id==='inter-miami');
const run=espnTeamGames([json('mls-mia-2025.json')],{school:mia,config:PRO_TEAMS['inter-miami'],timeZone:'America/New_York',now:new Date('2025-12-10T00:00:00Z')});
assert.deepEqual(run.map(e=>`${e.headline} | ${e.round||''} | ${e.not_in_record?'playoff':''}`),[
  'W 3-1 | MLS Cup | playoff',
  'W 5-1 | Eastern Conference Playoffs - Final | playoff',
  'W 4-0 | Eastern Conference Playoffs - Semifinals | playoff',
  'W 4-0 | Eastern Conference Playoffs - Round One | playoff',
  'L 1-2 | Eastern Conference Playoffs - Round One | playoff',
  'W 3-1 | Eastern Conference Playoffs - Round One | playoff',
  'W 5-2 |  | '
]);
assert.deepEqual(run[0].results,[{label:'Result',value:'W 3-1'},{label:'Round',value:'MLS Cup'}]);
// A playoff draw settled on penalties reads from the shootout.
{
  const g=json('mls-mia-2025.json');const c=g.events[0].competitions[0];
  c.competitors.forEach((t,i)=>{t.score={displayValue:'1'};t.shootoutScore=i?3:4;});
  assert.equal(espnTeamGames([{events:[g.events[0]]}],{school:mia,config:PRO_TEAMS['inter-miami'],timeZone:'America/New_York',now:new Date('2025-12-10T00:00:00Z')})[0].headline,'W 1-1 (4-3 PK)');
}

// Expanded final: the score by half, the club's scorers, team stats and each
// goal with its running score (an own goal or penalty is labeled).
const draw=games.find(e=>e.espn_event_id==='761855');
const details=espnGameHighlights(draw,json('mls-sum.json'),config);
assert.deepEqual(details.lines,[
  'Sporting Kansas City drew with Portland Timbers 3-3 at home (Sporting Park).',
  'Portland Timbers led 2-1 at halftime.',
  "Sporting Kansas City goals: André Luiz 45'+7', 72'; Justin Reynolds 70'."
]);
const box=details.box_score;
assert.deepEqual([box.line_title,box.scoring_title],['Score by Half','Goals']);
assert.deepEqual(box.line,[{label:'1st',ours:'1',theirs:'2'},{label:'2nd',ours:'2',theirs:'1'}]);
assert.deepEqual(box.totals,{ours:'3',theirs:'3'});
assert.deepEqual(box.stats.slice(0,4),[{label:'Possession',ours:'45.6%',theirs:'54.4%'},{label:'Shots',ours:'12',theirs:'9'},{label:'Shots on target',ours:'5',theirs:'5'},{label:'Corners',ours:'6',theirs:'1'}]);
assert.deepEqual(box.scoring.map(g=>`${g.period} ${g.clock} ${g.team} ${g.text} ${g.score}`),[
  "1st Half 10' POR David Da Costa (assist: Ariel Lassiter) 0-1",
  "1st Half 45'+4' POR Vincent Janssen (penalty) 0-2",
  "1st Half 45'+7' SKC André Luiz 1-2",
  "2nd Half 64' POR Ariel Lassiter (assist: Jimer Fory) 1-3",
  "2nd Half 70' SKC Justin Reynolds (assist: Taylor Calheira) 2-3",
  "2nd Half 72' SKC André Luiz (assist: Seymour Reid) 3-3"
]);
const loss=games.find(e=>e.espn_event_id==='761866');
assert.deepEqual(espnGameHighlights(loss,json('mls-sum-866.json'),config).lines,['Sporting Kansas City lost to Nashville SC 4-0 away (GEODIS Park).','Nashville SC led 3-0 at halftime.']);
// An own goal counts for the side the score says it helped.
{
  const sum=json('mls-sum.json'),[home,away]=sum.header.competitions[0].competitors;
  const own={...sum.keyEvents.find(k=>k.scoringPlay),type:{text:'Own Goal'},team:{id:home.team.id},text:'Own Goal by Logan Farrington, Sporting Kansas City. Sporting Kansas City 0, Portland Timbers 1.',participants:[{athlete:{displayName:'Logan Farrington'}}]};
  assert.deepEqual(soccerGoals([own],home,away).map(g=>[g.ours,g.text,g.score]),[[false,'Logan Farrington (own goal)','0-1']]);
}
// The page names the soccer headings; football keeps its own.
assert.ok(page.includes("${esc(b.line_title||'Score by Quarter')}"));
assert.ok(page.includes("${esc(b.scoring_title||'Scoring Plays')}"));
assert.ok(worker.includes("config.sport==='Soccer'?'Score by half, goals and team stats from ESPN\\'s match summary.'"));

// Live: the league board and the match summary over today's card (the Oct 14
// board's final turned "in" at 67'): the clock, the score, both records as
// W-L-T, soccer's team stats and each goal.
{
  const board=json('mls-board.json'),c=board.events[0].competitions[0];
  c.status={displayClock:"67'",period:2,type:{state:'in',name:'STATUS_SECOND_HALF',shortDetail:"67'"}};
  const event=applyEspnLive({...loss,status:'Today',results:[]},board,json('mls-sum-866.json'),config);
  assert.deepEqual([event.status,event.recency_label,event.headline],['Live',"67'",'0-4']);
  const d=event.live_details;
  assert.deepEqual(d.records,{ours:'6-19-4',theirs:'20-3-6'});
  assert.deepEqual(d.stats.slice(0,2),[{label:'Possession',ours:'51.1%',theirs:'48.9%'},{label:'Shots',ours:'8',theirs:'18'}]);
  assert.deepEqual(d.scoring,["10' · NSH: Hany Mukhtar (assist: Andy Nájar) (0-1)","17' · NSH: Sam Surridge (assist: Hany Mukhtar) (0-2)","29' · NSH: Andy Nájar (assist: Cristian Espinoza) (0-3)","90'+5' · NSH: Warren Madrigal (penalty) (0-4)"]);
  assert.equal(d.broadcast,'Apple TV');assert.equal(event.possession,null);
  // Full time on the board turns a card the team schedule still shows as today Final.
  const ft=json('mls-board.json');
  const final=applyEspnLive({...loss,status:'Today',results:[],id:'live-x-today'},ft,null,config);
  assert.deepEqual([final.status,final.headline,final.id],['Final','L 0-4','live-x-final']);
}
console.log('MLS module: 30 clubs, schedule, playoffs, expanded finals and live cards pass');
