// Home's live grid (user, November 8, 2026: "You need to fix it all but you
// missed the worst one"): Maine vs Manhattan College basketball showed, and
// opened, as the favorite Manhattan High School; the Chiefs' badge read
// "CHI"; live games were ordered by wall clocks from different time zones.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const pick=re=>{const m=page.match(re);assert.ok(m,`found ${re}`);return m[0]};
const sections=pick(/function homeSections\(groups\)\{[\s\S]*?\n\}\n/);
const zoned=pick(/function zonedWallClockToInstant\(wallIso,timeZone\)\{[\s\S]*?\n\}\n/);
const clock=pick(/const hasPublishedClock=[^\n]+/);
const consts=[pick(/const HOME_SPORT_PRIORITY=[^\n]+/),pick(/const EVERYWHERE_SHOWN=[^\n]+/)].join('\n');
const catalog=new Map([
  ['manhattan-ks',{id:'manhattan-ks',name:'Manhattan High School',short_name:'Manhattan',aliases:['Manhattan'],level:'high-school',time_zone:'America/Chicago'}],
  ['kstate',{id:'kstate',name:'Kansas State',short_name:'K-State',level:'college',time_zone:'America/Chicago'}],
  ['manhattan',{id:'manhattan',name:'Manhattan',short_name:'Manhattan',level:'college',time_zone:'America/New_York'}],
  ['princeton',{id:'princeton',name:'Princeton',short_name:'Princeton',level:'college',time_zone:'America/New_York'}]
]);
const build=(teams,everywhereGames)=>Function('homeTeams','search','catalogEntry','homeView','everywhereGames','currentView','schoolToday',
  `${consts}\nconst schoolTimeZoneOf=id=>catalogEntry(id)?.time_zone||null;\n${clock}\n${zoned}\n${sections};return homeSections;`)(
  ()=>teams,{value:''},id=>catalog.get(id)||null,true,everywhereGames,'all',()=> '2026-11-08');
const board=(id,school,sport,opponent,start_time,start_utc,extra={})=>({id:`live-${id}-${opponent}`,school_id:id,school,sport,status:'Live',title:`${school} vs ${opponent}`,opponent,start_time,start_utc,level:'college',...extra});
const maine=board('maine','Maine','Basketball','Manhattan','2026-11-08T13:00:00.000Z','2026-11-08T18:00:00.000Z',{team_label:"Men's"});
const siena=board('siena','Siena','Soccer','Manhattan','2026-11-08T12:00:00.000Z','2026-11-08T17:00:00.000Z',{team_label:"Women's"});
const ksu=board('kstate','Kansas State','Basketball','UT Rio Grande','2026-11-08T12:00:00.000Z','2026-11-08T18:00:00.000Z',{team_label:"Women's"});
const pri=board('princeton','Princeton','Basketball','Murray St','2026-11-08T12:00:00.000Z','2026-11-08T17:00:00.000Z',{team_label:"Women's"});

// 1. A college opponent named "Manhattan" is not the favorite high school.
{
  const homeSections=build(['manhattan-ks','kstate'],[maine,siena,ksu]);
  const {live,everywhere}=homeSections([]);
  assert.deepEqual(live.map(x=>x.school_id),['kstate'],'only K-State is one of the favorites\' live games');
  assert.ok(!live.some(x=>x.school_id==='manhattan-ks'),'nothing opens Manhattan High School');
  assert.deepEqual(everywhere.map(x=>x.school_id).sort(),['maine','siena'],'Maine and Siena stay under Everywhere');
}
// The favorite Manhattan College still takes its game.
{
  const {live}=build(['manhattan'],[maine])([]);
  assert.deepEqual(live.map(x=>[x.school_id,x.e.opponent]),[['manhattan','Manhattan']]);
}
// 2. Everywhere: by real start, not by each school's wall clock (K-State's
// noon Central tip is an hour after Princeton's noon Eastern one).
{
  const {everywhere}=build([],[ksu,pri])([]);
  assert.deepEqual(everywhere.map(x=>x.school_id),['princeton','kstate']);
}
// 3. The badge is the board's own abbreviation.
{
  const card=pick(/function liveCard\(e\)\{[\s\S]*?\n\}\n/);
  assert.match(card,/const liveMono=\(i,name\)=>\{const t=e\.live_details\?\.teams\?\.\[i===0\?'ours':'theirs'\]/);
  assert.match(card,/\$\{esc\(liveMono\(i,name\)\)\}/);
  const monogram=Function(pick(/function monogram\(name\)\{[^\n]+/)+';return monogram;')();
  const liveMono=Function('monogram','e',card.match(/const liveMono=[^\n]+/)[0]+';return liveMono;');
  const e={live_details:{teams:{ours:'KC',theirs:'NYJ'}}};
  assert.deepEqual([liveMono(monogram,e)(0,'Chiefs'),liveMono(monogram,e)(1,'Jets')],['KC','NYJ']);
  assert.equal(liveMono(monogram,{})(0,'Chiefs'),'CHI','no board abbreviation: letters from the name');
}
// 4. /live/now carries each game's UTC start from the board.
assert.match(readFileSync(new URL('../src/index.js',import.meta.url),'utf8'),/start_utc:new Date\(item\.date\)\.toISOString\(\)/);
console.log('home-live: ok (favorites matched at their own level, board abbreviations, live order by real start)');
