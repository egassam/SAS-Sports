// Rules found onboarding the Southland Conference (Oct 24).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createConferenceGames} from '../src/conference-games.mjs';
import {withoutRanking,withoutOpponentPrefix} from '../src/sidearm-schedule-reader.mjs';
import {sidearmScheduleGames} from '../src/sidearm-schedule-data.mjs';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json'));

// Rankings the Southland's pages write without "#" are the page data's
// opponent prefix: cut when the prefix is a ranking ("17/21", "RV/NR",
// "#4/2/2", "(RP)"), kept otherwise.
assert.equal(withoutOpponentPrefix('17/21 Mercer','17/21'),'Mercer');
assert.equal(withoutOpponentPrefix('RV/NR McNeese State','RV/NR'),'McNeese State');
assert.equal(withoutOpponentPrefix('#4/2/2 Stephen F. Austin','#4/2/2'),'Stephen F. Austin');
assert.equal(withoutOpponentPrefix('(RP) Houston Christian','(RP)'),'Houston Christian');
assert.equal(withoutOpponentPrefix('RP/#25 Southeastern','RP/#25'),'Southeastern');
assert.equal(withoutOpponentPrefix('#3 Seed Kansas','#3 Seed'),'#3 Seed Kansas');
assert.equal(withoutOpponentPrefix('Mercer',null),'Mercer');
// A classic row's ranking span is that prefix (East Texas A&M football).
{
  const html=gunzipSync(readFileSync(new URL('./fixtures/east-texas-am-module/football-schedule.html.gz',import.meta.url))).toString('utf8');
  const game=sidearmScheduleGames(html).find(game=>/Mercer/.test(game.opponent.title));
  assert.deepEqual(game.opponent,{title:'17/21 Mercer',prefix:'17/21'});
}
// "RV/RV UTRGV" written into the name (Nicholls football).
assert.equal(withoutRanking('RV/RV UTRGV'),'UTRGV');
assert.equal(withoutRanking('RVA Club'),'RVA Club');

// Golf story places (Houston Christian, LSU New Orleans, UTRGV).
{
  const story=(title,text)=>`<meta property="og:title" content="${title}"><meta property="og:description" content="${text}">`;
  const hcu="(?:HCU|Huskies|Houston Christian|(?:Men's|Women's) Golf)";
  assert.equal(golfStoryPlace(story('MGOLF: Gonzalez Leads Huskies','DESTIN, Fla. – The HCU men\'s golf team closed out its first tournament on Wednesday, tying for 10th place in a 14 team field.'),{team:hcu}),'T10th');
  assert.equal(golfStoryPlace(story('Privateers Show Improvement','NEW ORLEANS – The LSU New Orleans golf team improved each round to shoot a 909, good for a 14th-place finish.'),{team:"(?:UNO|Privateers|New Orleans)"}),'14th');
  assert.equal(golfStoryPlace(story("Gonzalez Secures Top-Three Finish, Men's Golf Claims Fourth at Bayou City Collegiate",''),{team:'(?:UTRGV|Vaqueros)'}),'4th');
  assert.equal(golfStoryPlace(story("Golf Claims Commander-In-Chief's Cup at Oakmont",''),{team:'(?:Army|Black Knights)'}),'1st');
  // A player "tying for" a place gives the team none.
  assert.equal(golfStoryPlace(story('Vikings Close Fall','The Ong sisters led the way for the Vikings, tying for 32nd overall.'),{team:'(?:Vikings)'}),null);
}

// The Southland sponsors no swimming: UTRGV's meets count under no league;
// its soccer games against members ("UIW", "SFA") do.
{
  const utrgv=schools.find(s=>s.id==='utrgv');
  const events=[{sport:'Swimming & Diving',opponent:'Incarnate Word',start_time:'2026-11-01T18:00:00Z'},{sport:'Soccer',opponent:'UIW',start_time:'2026-10-01T18:00:00Z'},{sport:'Soccer',opponent:'SFA',start_time:'2026-10-05T18:00:00Z'}];
  createConferenceGames({schools}).markConferenceGames(events,'',utrgv,'https://goutrgv.com/sports/womens-soccer/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[false,true,true]);
}
// New Orleans is "LSU New Orleans" at privateersports.com.
{
  const uno=schools.find(s=>s.id==='new-orleans');
  assert.equal(uno.name,'LSU New Orleans');assert.equal(uno.athletics_url,'https://privateersports.com');
}

const ids=['east-texas-am','houston-christian','incarnate-word','lamar','mcneese','new-orleans','nicholls','northwestern-state','southeastern-louisiana','stephen-f-austin','utrgv'];
for(const id of ids){
  const text=read(`../src/schools/${id}.mjs`);
  // A season with the sport's name is no tournament ("Fall Golf").
  const season=new RegExp(text.match(/const SEASON_TITLE=\/(.*)\/i;/)[1],'i');
  assert.ok(season.test('Fall Golf')&&season.test('Fall Tennis Schedule')&&!season.test('Fall Classic'),id);
  // Volleyball before the last Friday of August is an exhibition.
  assert.match(text,/if\(sport==='Volleyball'\)games=games\.map\(game=>game\.type\|\|!beforeVolleyballSeason\(game\.date\)/,id);
  assert.match(text,/withoutOpponentPrefix\(String\(game\.opponent\?\.title\|\|''\),game\.opponent\?\.prefix\)/,id);
}
{
  const helper=read('../src/schools/southeastern-louisiana.mjs').match(/const beforeVolleyballSeason=(.*);\n/)[1];
  const before=eval(helper);
  assert.equal(before('2026-08-19T18:30:00'),true);assert.equal(before('2026-08-28T18:30:00'),false);assert.equal(before('2027-08-26'),true);assert.equal(before('2027-08-27'),false);
}
// A pairs qualifier with no result line or story is not listed.
for(const id of ['houston-christian','mcneese','new-orleans','nicholls','southeastern-louisiana','stephen-f-austin'])assert.match(read(`../src/schools/${id}.mjs`),/event\.sport==='Beach Volleyball'\|\|event\.sport==='Rowing'/,id);

// UTRGV writes scores winner first: the team's score follows its letter.
assert.match(read('../src/schools/utrgv.mjs'),/result\.status==='L'&&mine>theirs\|\|result\.status==='W'&&mine<theirs/);

// Setup: --resume, a held interval against a silent exit, TFRRS names that
// keep a closing "A&M" or shorten a compass word (SE_Louisiana).
const setup=read('../scripts/start-schools.mjs');
assert.match(setup,/const keepAlive=setInterval/);assert.match(setup,/clearInterval\(keepAlive\)/);
assert.match(setup,/args\.includes\('--resume'\)/);
assert.match(setup,/all\.filter\(n=>\/A&M\$\/\.test\(n\)\)/);
assert.match(setup,/\(South\|North\)\(east\|west\)ern/);
console.log('Southland shared checks passed');
