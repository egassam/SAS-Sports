// Shared rules found onboarding the OVC (Oct 23).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {withoutRanking} from '../src/sidearm-schedule-reader.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

// A ranking with a space after its mark: Eastern Illinois football at
// "# 4/5 Illinois State" (Sep 19).
assert.equal(withoutRanking('# 4/5 Illinois State'),'Illinois State');
assert.equal(withoutRanking('#9/#10 Iowa'),'Iowa');
assert.equal(withoutRanking('# Team'),'# Team');

// OVC football is the Big South-OVC association: UT Martin's page marks its
// league games, Gardner-Webb (Oct 17) among them, Memphis (Sep 19) outside.
{
  const schools=JSON.parse(read('../src/schools.json'));
  const raw=gunzipSync(readFileSync(new URL('./fixtures/ut-martin-module/football-schedule.html.gz',import.meta.url))).toString('utf8');
  const game=(opponent,date)=>({sport:'Football',opponent,start_time:`${date}T18:00:00Z`});
  const events=[game('Gardner-Webb','2026-10-17'),game('Memphis','2026-09-19'),game('Tennessee State','2026-10-10')];
  createConferenceGames({schools}).markConferenceGames(events,raw,schools.find(s=>s.id==='ut-martin'),'https://utmsports.com/sports/football/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[true,false,true]);
}

// Morehead State: scores written winner first are turned, an "Exhibition
// Match" tournament is an exhibition, and football counts its Pioneer
// Football League opponents (its page marks none).
const morehead=read('../src/schools/morehead-state.mjs');
assert.match(morehead,/result\.status==='L'&&mine>theirs\|\|result\.status==='W'&&mine<theirs/);
assert.match(morehead,/\/\^exhibition\\b\/i\.test\(String\(game\.tournament\?\.title\|\|''\)\.trim\(\)\)/);
assert.match(morehead,/const league=\{'Football':'Pioneer Football League'\}\[sport\];/);
assert.match(morehead,/event\.conference_game=PFL\.test\(/);

// Meet names: Southern Indiana's races ("38th of 44 teams (Blue Race); 3rd
// of 16 teams (White Race)"), Tennessee State's "| host" suffix, UT Martin's
// rifle championship days, SEMO's Bradley Pink Classic, TFRRS names for
// Western Illinois's host-named meets.
assert.match(read('../src/schools/southern-indiana.mjs'),/\$\{first\[1\]\} \(\$\{\[first\[2\],\.\.\.rest\.map\(race=>`\$\{race\[1\]\} in \$\{race\[2\]\}`\)\]\.join\('; '\)\}\)/);
assert.match(read('../src/schools/tennessee-state.mjs'),/opponent=String\(opponent\)\.split\(\/\\s\+\\\|\\s\+\/\)\[0\];/);
assert.match(read('../src/schools/ut-martin.mjs'),/\/\^\(\?:Smallbore\|Air Rifle\)\$\/i/);
assert.match(read('../src/schools/southeast-missouri.mjs'),/opponent='Bradley Pink Classic'/);
assert.match(read('../src/schools/western-illinois.mjs'),/schoolName:'Western Illinois',hostMeetName:true,/);

// Lindenwood's other leagues per team page; SIUE wrestling in the MAC.
const lindenwood=read('../src/schools/lindenwood.mjs');
assert.match(lindenwood,/mens-volleyball\\\/\/\.test\(team\)\?'MIVA'/);
assert.match(lindenwood,/womens-ice-hockey\\\/\/\.test\(team\)\?'Atlantic Hockey America'/);
assert.match(lindenwood,/teamLabels:\{'\/sports\/mhockey-ncaa\/schedule':"Men's"\}/);
assert.match(read('../src/schools/siue.mjs'),/const league=\{'Wrestling':'MAC'\}\[sport\];/);

console.log('OVC shared checks passed');
