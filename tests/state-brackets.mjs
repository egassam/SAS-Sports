// KSHSAA state playoff brackets (user, November 18, 2026: "Start with 2", the
// state playoff brackets). Fixtures of November 18, 2026: the football state
// sites and all nine class brackets, and the 4-1A boys' soccer state bracket
// (kshsaa-api.kshsaa.org).
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {schoolModuleDeps} from './school-module-deps.mjs';
import {parseKshsaaBracket,bracketMatcher,ownBracketGames,stateSiteBrackets,bracketCurrent,parseGameInfo,bracketNameKey,stateSitesUrl,bracketUrl,KSHSAA_BRACKETS} from '../src/state-brackets.mjs';

const dir=new URL('./fixtures/state-brackets/',import.meta.url);
const json=name=>JSON.parse(gunzipSync(readFileSync(new URL(name,dir))).toString('utf8'));
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=id=>schools.find(s=>s.id===id);

// The season's state sites: one bracket per class.
const sites=stateSiteBrackets(json('football-state-sites-2026-11-18.json.gz'));
assert.deepEqual(sites.map(s=>s.className),['6A','5A','4A','3A','2A','1A','8P DI','8P DII','6-Player']);
assert.deepEqual(sites[0],{weekId:6452,className:'6A',date:'2026-11-28',site:'BG Products Veterans Stadium',city:'El Dorado'});
assert.equal(stateSitesUrl(KSHSAA_BRACKETS.Football[0]),'https://kshsaa-api.kshsaa.org/playoff-sites/state-sites/State/Football/1');
assert.equal(bracketUrl(6452),'https://kshsaa-api.kshsaa.org/Brackets/GameInfo/GetByWeekID/6452');

// Names: "High School", "HS", "Jr/Sr", "St.", "Co" read alike; an alias is
// never a part of a longer name.
assert.equal(bracketNameKey('Manhattan High School'),bracketNameKey('Manhattan HS'));
assert.equal(bracketNameKey('St. Marys Junior/Senior High School'),bracketNameKey('St. Marys HS'));
assert.equal(bracketNameKey('Salina Central High School'),bracketNameKey('Salina-Central HS'));
assert.equal(bracketMatcher(school('blue-valley-randolph-ks'))('Overland Park-Blue Valley HS'),false);

// "Fri, 11/20 @ Derby"; "Sat, 11/28 @ Butler CC - 1:00 pm"; "6 PM".
assert.deepEqual(parseGameInfo('Fri, 11/20 @ Derby','2026-11-20'),{date:'2026-11-20',time:null,site:'Derby',dated:true});
assert.deepEqual(parseGameInfo('Sat, 11/28 @ Butler CC - 1:00 pm','2026-11-28'),{date:'2026-11-28',time:'13:00',site:'Butler CC',dated:true});
assert.deepEqual(parseGameInfo('Thurs, 11/5 @ Olathe - ODAC 6 PM','2026-11-07'),{date:'2026-11-05',time:'18:00',site:'Olathe - ODAC',dated:true});

// 6A football: Manhattan's path to the Sub-State at Derby.
const own=bracketMatcher(school('manhattan-ks'));
const b6=parseKshsaaBracket(json('bracket-6452-2026-11-18.json.gz'),{own,sport:'Football'});
assert.equal(b6.title,'KSHSAA 6A Football Playoffs');
assert.deepEqual(b6.rounds.map(r=>`${r.name} ${r.date} ${r.games.length}`),['First Round 2026-10-30 16','Regional 2026-11-06 8','Sectional 2026-11-13 4','Sub-State 2026-11-20 2','State Championship 2026-11-28 1']);
assert.equal(b6.status,'in');assert.equal(b6.champion,null);
assert.equal(b6.source.url,'https://www.kshsaa.org/react/bracket/6452');
assert.deepEqual(b6.rounds[0].games[6].teams.map(t=>`${t.seed} ${t.name} ${t.score}${t.winner?' W':''}${t.own?' own':''}`),['3W Manhattan 67 W own','14W Topeka 7']);
// A seed is carried from the first round to later rounds where it is blank.
assert.deepEqual(b6.rounds[3].games[0].teams.map(t=>`${t.seed} ${t.name} ${t.score}`),['1W Derby null','3W Manhattan null']);
assert.equal(b6.rounds[3].games[0].status,'Scheduled');
// The state game: no teams yet.
assert.deepEqual(b6.rounds[4].games[0].teams,[null,null]);
assert.equal(b6.rounds[4].games[0].time,'13:00');
assert.deepEqual(ownBracketGames(b6).map(g=>`${g.round} ${g.date} ${g.relation} ${g.opponent} ${g.status}${g.result?` ${g.result} ${g.score}-${g.opponent_score}`:''}`),[
  'First Round 2026-10-30 vs Topeka Final W 67-7',
  'Regional 2026-11-06 vs Garden City Final W 36-14',
  'Sectional 2026-11-13 at Maize Final W 28-24',
  'Sub-State 2026-11-20 at Derby Scheduled']);
assert.equal(bracketCurrent(b6,'2026-11-18'),true);
assert.equal(bracketCurrent(b6,'2026-10-01'),false,'before the playoffs');
assert.equal(bracketCurrent(b6,'2027-02-01'),false,'two months after the state game');
// A team that lost: out in its round.
const jc=parseKshsaaBracket(json('bracket-6452-2026-11-18.json.gz'),{own:bracketMatcher(school('junction-city-ks')),sport:'Football'});
assert.equal(jc.status,'out');assert.equal(jc.own_games,1);
// A school in no bracket of the class is not shown.
assert.equal(parseKshsaaBracket(json('bracket-6452-2026-11-18.json.gz'),{own:bracketMatcher(school('wamego-ks')),sport:'Football'}).own_games,0);

// Every catalog school with football in the playoffs is found in exactly one
// class bracket, its own name (no alias reaches another school).
const brackets=readdirSync(dir).filter(f=>/^bracket-64(4\d|5[0-2])-/.test(f)).map(f=>json(f));
const found={};
for(const s of schools.filter(s=>s.level==='high-school'&&(sponsoredSports[s.id]||[]).includes('Football'))){
  const hits=brackets.map(p=>parseKshsaaBracket(p,{own:bracketMatcher(s),sport:'Football'})).filter(b=>b?.own_games);
  assert.ok(hits.length<=1,`${s.id} is in ${hits.length} brackets`);
  if(hits.length)found[s.id]=hits[0].class_name;
}
// 89 until the sixth county batch (November 19) added 19: Louisburg, Paola and
// Spring Hill among them, Great Bend in 4A football, the small schools in 8-Player.
// The seventh batch (November 20) adds 16 (124): Lansing and Bonner Springs in 4A football (KSHSAA lists "Lansing HS" there).
assert.equal(Object.keys(found).length,124);
assert.equal(found['lansing-ks'],'4A');assert.equal(found['leavenworth-ks'],'5A');
assert.equal(found['great-bend-ks'],'4A');assert.equal(found['sylvan-lucas-unified-ks'],'8P DII');
assert.equal(found['manhattan-ks'],'6A');assert.equal(found['wamego-ks'],'4A');assert.equal(found['onaga-ks'],'1A');

// A bye is a game against "KSHSAA" (6-Player): not a game. A forfeit stays
// in the bracket ("Forfeit", no score) but is not put on the schedule.
const six=parseKshsaaBracket(json('bracket-6442-2026-11-18.json.gz'),{own:bracketMatcher(school('tescott-ks')),sport:'Football'});
assert.ok(six.rounds.every(r=>r.games.every(g=>g.teams.every(t=>!t||t.name!=='KSHSAA'))));
assert.deepEqual(ownBracketGames(six).map(g=>`${g.round} ${g.opponent}`),['Regional Pawnee Heights','Sectional Centre','Sub-State Otis-Bison']);
const one=parseKshsaaBracket(json('bracket-6441-2026-11-18.json.gz'),{own:bracketMatcher(school('sterling-ks')),sport:'Football'});
const forfeit=one.rounds[0].games.find(g=>g.teams.some(t=>t?.own));
assert.equal(forfeit.forfeit,true);assert.equal(forfeit.extra,'Forfeit');assert.equal(forfeit.site,'Sterling');
assert.deepEqual(forfeit.teams.map(t=>`${t.name} ${t.score}${t.winner?' W':''}`),['Sterling null W','Syracuse null']);
assert.deepEqual(ownBracketGames(one).map(g=>g.round),['Regional','Sectional','Sub-State']);

// Boys' soccer, 4-1A state: a shootout and the third-place game.
const soccer=parseKshsaaBracket(json('bracket-6455-2026-11-18.json.gz'),{own:bracketMatcher({name:'Rose Hill High School'}),sport:'Soccer'});
assert.deepEqual(soccer.rounds.map(r=>r.name),['State Semifinals','State Championship']);
assert.equal(soccer.status,'champion');assert.equal(soccer.champion,'Rose Hill');
assert.deepEqual(soccer.rounds[0].games[0].teams.map(t=>`${t.name} ${t.score} (${t.pks})${t.winner?' W':''}`),['Rose Hill 3 (4) W','Bishop Miege 2 (3)']);
assert.equal(soccer.rounds[0].games[0].extra,'PKs');
assert.equal(soccer.rounds[0].games[0].date,'2026-11-05','a game with no date takes its round\'s');
assert.deepEqual(soccer.rounds[1].games.map(g=>g.third_place),[false,true]);
assert.equal(parseKshsaaBracket(json('bracket-6455-2026-11-18.json.gz'),{own:bracketMatcher({name:'Bishop Miege High School'}),sport:'Soccer'}).status,'third');
assert.equal(parseKshsaaBracket(null),null);

// Through the Worker: Manhattan football on November 18, 2026. The bracket
// goes on the feed, a final with no score takes KSHSAA's, and the Sub-State
// at Derby (on no other source that day) is listed.
const files={[stateSitesUrl(KSHSAA_BRACKETS.Football[0])]:'football-state-sites-2026-11-18.json.gz'};
for(const f of readdirSync(dir).filter(f=>/^bracket-\d+-/.test(f)))files[bracketUrl(Number(f.split('-')[1]))]=f;
const fetch=async url=>{const f=files[String(url?.url||url)];return f?new Response(gunzipSync(readFileSync(new URL(f,dir))),{status:200,headers:{'content-type':'application/json'}}):new Response('',{status:404});};
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:async()=>({text:''}),fetch};
const worker=Function(...Object.keys(deps),source+';return {withStateBracket,groupEvents,catalogSchool}')(...Object.values(deps));
const at=new Date('2026-11-18T19:00:00Z'),manhattan=worker.catalogSchool('manhattan-ks');
const listed={id:'x',school_id:'manhattan-ks',school:'Manhattan High School',sport:'Football',event_type:'GAME',status:'Final',title:'Manhattan vs Garden City',start_time:'2026-11-06T19:00:00.000Z',opponent:'Garden City',school_score:null,opponent_score:null,headline:'No score posted',results:[],source:{name:'Official school calendar',url:'https://mhs.usd383.org/api/calendars/128516/events'}};
const scored={...listed,id:'y',title:'Manhattan vs Maize',start_time:'2026-11-13T19:00:00.000Z',opponent:'Maize',school_score:'28',opponent_score:'24',headline:'W, 28-24'};
const out=await worker.withStateBracket({events:[listed,scored],source_urls:[]},manhattan,'Football',at);
assert.equal(out.bracket.title,'KSHSAA 6A Football Playoffs');
assert.ok(out.source_urls.includes(bracketUrl(6452)));
const line=e=>`${e.start_time.slice(0,10)} ${e.title} ${e.status} ${e.headline||''} ${e.playoff_round||''} ${e.score_source?.name||''}`.trim();
assert.deepEqual(out.events.map(line),[
  '2026-10-30 Manhattan vs Topeka Final W, 67-7 First Round KSHSAA (official bracket)',
  '2026-11-06 Manhattan vs Garden City Final W, 36-14 Regional KSHSAA (official bracket)',
  '2026-11-13 Manhattan vs Maize Final W, 28-24 Sectional',
  '2026-11-20 Manhattan at Derby Upcoming  Sub-State']);
assert.equal(out.events[3].source.url,'https://www.kshsaa.org/react/bracket/6452');
assert.equal(out.events[1].source.url,listed.source.url,'a filled game keeps its schedule source');
// A sport with no KSHSAA bracket, or a school in none, is unchanged.
const none={events:[listed]};
assert.equal(await worker.withStateBracket(none,manhattan,'Volleyball',at),none);
assert.equal((await worker.withStateBracket(none,worker.catalogSchool('hiawatha-ks'),'Football',at)).bracket,undefined);

// The page shows the bracket before the standings.
const page=read('../public/index.html');
assert.match(page,/\$\{bracketBlock\(g\)\}\$\{standingsBlock\(g\)\}/);
assert.match(page,/data-br-open/);
console.log(`state-brackets: ok (${Object.keys(found).length} catalog schools in the 2026 football brackets)`);
