// Rules found onboarding the Patriot League (Oct 24).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json'));
const page=(id,slug)=>gunzipSync(readFileSync(new URL(`./fixtures/${id}-module/${slug}-schedule.html.gz`,import.meta.url))).toString('utf8');

// Army football plays in the American: its page marks Tulane (Oct 10) a
// league game and Air Force (Nov 7) not, and the module names the league.
{
  const game=(opponent,date)=>({sport:'Football',opponent,start_time:`${date}T18:00:00Z`,conference_name:'American'});
  const events=[game('Tulane','2026-10-10'),game('Air Force','2026-11-07'),game('Bryant','2026-09-05')];
  createConferenceGames({schools}).markConferenceGames(events,page('army','football'),schools.find(s=>s.id==='army'),'https://goarmywestpoint.com/sports/football/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[true,false,false]);
}
// The Patriot League sponsors no wrestling: a wrestling event counts only
// under the league its module names (the EIWA).
{
  const events=[{sport:'Wrestling',opponent:'Lehigh',start_time:'2026-12-01T18:00:00Z'}];
  createConferenceGames({schools}).markConferenceGames(events,'',schools.find(s=>s.id==='bucknell'),'https://bucknellbison.com/sports/wrestling/schedule');
  assert.equal(events[0].conference_game,false);
}

// Army: a cross country dual written winner first is turned (lower score
// wins), page-data type "X" is an exhibition, and the Army Invitational's
// unscored tennis sessions are one tournament.
const army=read('../src/schools/army.mjs');
assert.match(army,/result\.status==='L'&&mine<theirs\|\|result\.status==='W'&&mine>theirs/);
assert.match(army,/game\.type==='X'\?\{\.\.\.game,type:'S'\}:game/);
assert.match(army,/opponent:\{\.\.\.game\.opponent,title:String\(game\.tournament\.title\)\.trim\(\)\},tournament:null/);
assert.match(army,/\{'Football':'American','Hockey':'Atlantic Hockey America','Rifle':'GARC','Wrestling':'EIWA','Gymnastics':'ECAC'\}\[sport\]/);

// Leagues per team page; names and trips.
assert.match(read('../src/schools/bucknell.mjs'),/mens-water-polo\\\/\/\.test\(url\?\.pathname\|\|''\)\?'MAWPC':'CWPA'/);
assert.match(read('../src/schools/bucknell.mjs'),/opponent=String\(opponent\)\.replace\(\/\^\\\(D-\?III\\\)\\s\+\/i,''\);/);
assert.match(read('../src/schools/holy-cross.mjs'),/womens-ice-hockey\\\/\/\.test\(url\?\.pathname\|\|''\)\?'Hockey East':'Atlantic Hockey America'/);
assert.match(read('../src/schools/boston-university.mjs'),/\{'Hockey':'Hockey East'\}\[sport\]/);
assert.match(read('../src/schools/lafayette.mjs'),/const INTERNAL=\/\\btraining trip\\b\|/);
assert.match(read('../src/schools/lehigh.mjs'),/teamLabels:\{'\/sports\/rowing\/schedule':"Men's"\}/);

console.log('Patriot League shared checks passed');
