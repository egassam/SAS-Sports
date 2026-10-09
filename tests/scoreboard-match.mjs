import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {parseScoreboardPayload,scoreboardTeamMatchesSchool,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,arizonaHandlers,fetchUrl,fetchLive,attachOfficialMeetResults,attachOfficialHighlights:attachOfficialHighlights,fetchLiveScoreboards,decodeHtml,fetchLive};')(...Object.values(deps));



// ESPN scoreboard team matching for every catalog school, on real payloads
// (Arizona fixtures: FBS football Sep 26, 2026; women's volleyball Sep 27;
// Division I basketball Feb 14, 2026). Before October 2 the matcher also took
// a name prefix ("kansas" + anything) and abbreviations, so KU took Kansas
// State, Texas took Texas Tech, Iowa took Iowa State, Oklahoma State took
// Ohio State ("OSU") and Mississippi State took Michigan State ("MSU").
const load=name=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/arizona-module/'+name,import.meta.url))).toString('utf8'));
const pairs=new Set();
for(const name of ['football-espn-2026-09-26.json.gz','volleyball-espn-2026-09-27.json.gz','basketball-espn-mens-2026-02-14.json.gz','basketball-espn-womens-2026-02-14.json.gz','soccer-espn-2026-09-27.json.gz'])
  for(const event of load(name).events)for(const competitor of event.competitions[0].competitors)
    for(const school of schools)if(worker.scoreboardTeamMatchesSchool(competitor.team,school))pairs.add(`${school.id} => ${competitor.team.displayName}`);
const has=pair=>pairs.has(pair);
for(const pair of ['kansas => Kansas Jayhawks','kstate => Kansas State Wildcats','arizona => Arizona Wildcats','iowa-state => Iowa State Cyclones','texas-tech => Texas Tech Red Raiders','ohio-state => Ohio State Buckeyes','utah => Utah Utes','arizona-state => Arizona State Sun Devils'])assert.ok(has(pair),`${pair} must match`);
for(const pair of ['kansas => Kansas State Wildcats','arizona => Arizona State Sun Devils','iowa => Iowa State Cyclones','texas => Texas Tech Red Raiders','oklahoma-state => Ohio State Buckeyes','kstate => Kentucky Wildcats','kstate => New Hampshire Wildcats','arizona => Northern Arizona Lumberjacks'])assert.ok(!has(pair),`${pair} must not match`);
// Each ESPN team belongs to at most one catalog school.
const owners=new Map();for(const pair of pairs){const [id,team]=pair.split(' => ');owners.set(team,[...(owners.get(team)||[]),id]);}
for(const [team,ids] of owners)assert.equal(ids.length,1,`${team} matched ${ids.join(', ')}`);

// Scoreboard finals read like the official results for every school ("L,
// 26-31"), never a bare "26–31" that would replace the official headline.
{
  const kstate=schools.find(s=>s.id==='kstate'),football={path:'football/college-football',sourceName:'Live college football scoreboard'};
  const [game]=worker.parseScoreboardPayload(load('football-espn-2026-09-26.json.gz'),kstate,'Football',football,'https://site.api.espn.com/x',new Date('2026-09-27T12:00:00Z'));
  assert.deepEqual([game.title,game.status,game.headline,game.results],['K-State at Cincinnati','Final','L, 26-31',[{label:'Result',value:'L, 26-31'}]]);
  const houston=schools.find(s=>s.id==='houston'),men={path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:'x'};
  const [hoops]=worker.parseScoreboardPayload(load('basketball-espn-mens-2026-02-14.json.gz'),houston,'Basketball',men,'https://site.api.espn.com/x',new Date('2026-02-15T12:00:00Z'));
  assert.deepEqual([hoops.title,hoops.headline],["Men's · Houston vs Kansas St",'W, 78-64']);
  const kansas=schools.find(s=>s.id==='kansas'),soccer={path:'soccer/usa.ncaa.w.1',sourceName:'x'};
  const [match]=worker.parseScoreboardPayload(load('soccer-espn-2026-09-27.json.gz'),kansas,'Soccer',soccer,'https://site.api.espn.com/x',new Date('2026-09-28T12:00:00Z'));
  assert.deepEqual([match.title,match.headline],['KU vs Arizona','W, 2-0']);
}
console.log(`Scoreboard team match checks passed (${pairs.size} school-team pairs, each team one school; finals in the official wording)`);

// K-State soccer reads ESPN's live scoreboard (real payload, Oct 8, 2026:
// Kansas at K-State live in the 13th minute). Before 4.69.2 K-State had no
// soccer scoreboard and the game stayed "Today" in upcoming. The live score
// joins the official schedule's game that day (stored as K-State's wall
// clock, 6:30 PM) instead of adding a second card.
{
  const kstate=schools.find(s=>s.id==='kstate'),[provider]=worker.liveScoreboardProviders(kstate,'Soccer');
  assert.equal(provider.path,'soccer/usa.ncaa.w.1');
  const payload=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/soccer-espn-2026-10-08-live.json.gz',import.meta.url))).toString('utf8'));
  const [game]=worker.parseScoreboardPayload(payload,kstate,'Soccer',provider,'https://site.api.espn.com/x',new Date('2026-10-08T23:47:00Z'));
  assert.deepEqual([game.status,game.title,game.school_score,game.opponent_score,game.headline],['Live','K-State vs Kansas','0','0',"13'"]);
  const official={id:'kstate-soccer-kansas',sport:'Soccer',status:'Today',title:'K-State vs Kansas',start_time:'2026-10-08T18:30:00.000Z'};
  const joined=worker.reconcileScoreboardEvents([official],[game]);
  assert.equal(joined.length,1);
  assert.deepEqual([joined[0].id,joined[0].status,joined[0].verification_state],['kstate-soccer-kansas','Live','official_schedule+live_scoreboard']);
  assert.ok(worker.liveScoreboardProviders(kstate,'Baseball').length,'K-State baseball reads a scoreboard too');
}
console.log('K-State soccer live scoreboard checks passed');

// Every sport with an ESPN live board reads it (user, Oct 8: "It should read
// any sport that has a live feed"). Defaults are join-only: KU's side of the
// same Oct 8 game joins KU's official "Women's" soccer game; with no official
// game that day the score adds no card.
{
  const kansas=schools.find(s=>s.id==='kansas'),providers=worker.liveScoreboardProviders(kansas,'Soccer');
  assert.deepEqual(providers.map(p=>[p.path,p.joinOnly]),[['soccer/usa.ncaa.w.1',true]]);
  const payload=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live/soccer-espn-2026-10-08-live.json.gz',import.meta.url))).toString('utf8'));
  const [game]=worker.parseScoreboardPayload(payload,kansas,'Soccer',providers[0],'https://site.api.espn.com/x',new Date('2026-10-08T23:47:00Z'));
  assert.deepEqual([game.title,game.status,game.join_only],['KU at Kansas St','Live',true]);
  const official={id:'ku-soccer-kstate',sport:'Soccer',status:'Today',team_label:"Women's",title:"Women's · KU at K-State",start_time:'2026-10-08T18:30:00.000Z'};
  const later={id:'ku-soccer-later',sport:'Soccer',status:'Upcoming',team_label:"Women's",start_time:'2026-10-11T18:00:00.000Z'};
  const joined=worker.reconcileScoreboardEvents([official,later],[game]);
  assert.deepEqual(joined.map(e=>[e.id,e.status]),[['ku-soccer-kstate','Live'],['ku-soccer-later','Upcoming']]);
  assert.deepEqual(worker.reconcileScoreboardEvents([later],[game]).map(e=>e.id),['ku-soccer-later'],'no official game that day: no card');
  assert.equal(worker.reconcileScoreboardEvents([],[game],{keepUnjoined:true}).length,1,'official page failed: the score is kept for the last good feed');
  // A module's own board still adds a card when no official game joins (K-State).
  const kstate=schools.find(s=>s.id==='kstate'),[ks]=worker.parseScoreboardPayload(payload,kstate,'Soccer',worker.liveScoreboardProviders(kstate,'Soccer')[0],'https://site.api.espn.com/x',new Date('2026-10-08T23:47:00Z'));
  assert.equal(worker.reconcileScoreboardEvents([],[ks]).length,1);
  // Every live-feed sport has a board for every school that plays it.
  const ucf=schools.find(s=>s.id==='ucf'),asu=schools.find(s=>s.id==='arizona-state'),utah=schools.find(s=>s.id==='utah'),indiana=schools.find(s=>s.id==='indiana');
  assert.deepEqual(worker.liveScoreboardProviders(ucf,'Soccer').map(p=>p.team_label),["Men's","Women's"],'UCF soccer: both teams labeled');
  assert.deepEqual(worker.liveScoreboardProviders(asu,'Hockey').map(p=>p.path),['hockey/mens-college-hockey','hockey/womens-college-hockey']);
  assert.ok(worker.liveScoreboardProviders(utah,'Lacrosse').length&&worker.liveScoreboardProviders(indiana,'Field Hockey').length&&worker.liveScoreboardProviders(indiana,'Water Polo').length);
  for(const school of [kansas,utah,asu])for(const sport of ['Basketball','Volleyball','Baseball','Softball'])assert.ok(worker.liveScoreboardProviders(school,sport).length,`${school.id} ${sport}`);
  assert.deepEqual(worker.liveScoreboardProviders(kansas,'Golf'),[]);
}
console.log('Default live scoreboards: every live-feed sport, join-only, single-team labels adopted');
