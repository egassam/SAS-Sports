// Rules found onboarding the SWAC (Oct 24).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createConferenceGames} from '../src/conference-games.mjs';
import {golfStoryPlace,mergeMeetDays} from '../src/sidearm-school-kit.mjs';
import {findTfrrsMeet,onlyTfrrsMeetOn,tfrrsDays} from '../src/tfrrs-results.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json'));

// The 2026-27 SWAC; Grambling State and Texas Southern are blocked
// (docs/BLOCKED_SCHOOLS.md) but keep their catalog entries.
const members=['alabama-am','alabama-state','alcorn-state','arkansas-pine-bluff','bethune-cookman','florida-am','grambling-state','jackson-state','mississippi-valley-state','prairie-view-am','southern','texas-southern'];
assert.deepEqual(schools.filter(s=>s.conference==='SWAC').map(s=>s.id).sort(),members);

// Members' games count by the names opponents write ("Southern (La.)",
// "Arkansas - Pine Bluff", "Grambling State Univ.", "Mississippi Valley",
// "Alcorn", "B-CU"); "TSU" and "JSU" are also Tennessee State and
// Jacksonville State, and the SWAC sponsors no swimming.
{
  const famu=schools.find(s=>s.id==='florida-am');
  const at=day=>`2026-10-${day}T18:00:00Z`;
  const events=[['Volleyball','Southern (La.)','01'],['Volleyball','Arkansas - Pine Bluff','02'],['Volleyball','Grambling State Univ.','03'],['Volleyball','Mississippi Valley','04'],['Volleyball','Alcorn','05'],['Volleyball','B-CU','06'],['Volleyball','Prairie View','07'],['Volleyball','TSU','08'],['Volleyball','JSU','09'],['Volleyball','Tennessee State','10'],['Volleyball','Southern Miss','11'],['Swimming & Diving','Alabama A&M','12']].map(([sport,opponent,day])=>({sport,opponent,start_time:at(day)}));
  createConferenceGames({schools}).markConferenceGames(events,'',famu,'https://famuathletics.com/sports/womens-volleyball/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[true,true,true,true,true,true,true,false,false,false,false,false]);
}

// Golf stories that tell the team's place in the SWAC's words: "opened the
// 2026-27 season with a 11th-place performance" (Alabama State, The Velvet)
// and "She helped pace the team to an 11th-place finish overall" (Jackson
// State, Tulane Classic). A story that names only the team's score has none
// (Prairie View A&M at the Bayou City Collegiate).
assert.equal(golfStoryPlace(fixture('alabama-state-module/story-2026-9-15-womens-golf-asu-womens-golf-takes-the-co.html.gz'),{team:"(?:Hornets|Alabama State|(?:Men's|Women's) Golf)"}),'11th');
assert.equal(golfStoryPlace(fixture('jackson-state-module/story-2026-9-9-womens-golf-christy-finishes-in-top-25-i.html.gz'),{team:"(?:JSU|Tigers|Jackson State|(?:Men's|Women's) Golf)"}),'11th');
assert.equal(golfStoryPlace(fixture('jackson-state-module/story-2026-9-22-womens-golf-jackson-state-wins-first-tou.html.gz'),{team:"(?:JSU|Tigers|Jackson State|(?:Men's|Women's) Golf)"}),'1st');
assert.equal(golfStoryPlace(fixture('prairie-view-am-module/story-2026-9-22-mens-golf-completes-the-bayou-city-colle.html.gz'),{team:"(?:PVAMU|Panthers|Prairie View A&M|(?:Men's|Women's) Golf)"}),null);

// TFRRS dates a two-day meet "October 2- 3, 2026" (the Chile Pepper XC
// Festival), and may date a two-day meet by its last day (the Watson
// Collegiate XC Classic: Oct 15-16 on uapblionsroar.com, Oct 16 on TFRRS).
assert.deepEqual(tfrrsDays('October 2- 3, 2026'),['2026-10-02','2026-10-03']);
assert.deepEqual(tfrrsDays('Oct 30-Nov 1, 2026'),['2026-10-30','2026-10-31','2026-11-01']);
assert.deepEqual(tfrrsDays('October 16, 2026'),['2026-10-16']);
assert.deepEqual(tfrrsDays('TBA'),[]);
{
  const team=fixture('arkansas-pine-bluff-module/tfrrs-team-f.html.gz'),decodeHtml=s=>String(s).replace(/&amp;/g,'&');
  assert.match(findTfrrsMeet(team,{decodeHtml,date:'2026-10-02',name:'Chili Pepper Invitational'}),/\/28826\//);
  assert.match(findTfrrsMeet(team,{decodeHtml,date:'2026-10-15',end:'2026-10-16',name:'Watson Collegiate XC Classic'}),/\/27682\//);
  assert.equal(findTfrrsMeet(team,{decodeHtml,date:'2026-10-15',name:'Watson Collegiate XC Classic'}),null);
  // The last day takes a meet only by its name.
  assert.equal(findTfrrsMeet(team,{decodeHtml,date:'2026-10-15',end:'2026-10-16',name:'Delta Devil Invite'}),null);
  assert.match(onlyTfrrsMeetOn(team,{decodeHtml,date:'2026-10-03'}),/\/28826\//);
}

// A bowling tournament lists each match: two scored matches against one
// opponent (Sam Houston on Oct 9 and in the Oct 11 bracket, Alabama State's
// Tulane Colonial Invite) stay two matches; other sports' days still merge.
{
  const game=(date,title,team,opp)=>({date:`2026-10-${date}T00:00:00`,opponent:{title},tournament:{title:'Tulane Colonial Invite'},result:{status:Number(team)>Number(opp)?'W':'L',team_score:team,opponent_score:opp}});
  const games=[game('09','#8 Sam Houston','928','1122'),game('11','#8 Sam Houston','0','4')];
  assert.equal(mergeMeetDays(games,{matches:true}).length,2);
  assert.equal(mergeMeetDays(games).length,1);
  const days=[{date:'2026-10-09T00:00:00',opponent:{title:'Augusta Invitational'},result:{}},{date:'2026-10-10T00:00:00',opponent:{title:'Augusta Invitational'},result:{status:'W',team_score:'1',opponent_score:'0'}}];
  assert.equal(mergeMeetDays(days,{matches:true}).length,1);
}
for(const id of ['alabama-am','alabama-state','florida-am','jackson-state','prairie-view-am','southern'])
  assert.match(read(`../src/schools/${id}.mjs`),/return mergeMeetDays\(games,\{matches:sport==='Bowling'\}\)/);

// "Southern" alone also starts and ends other schools' names in a golf story
// ("just behind Southern Miss", "Texas Southern").
{
  const team=read('../src/schools/southern.mjs').match(/createGolfStoryPlace\(\{host:HOST,team:"([^"]+)"/)[1],named=new RegExp(`\\b${team}\\b`);
  assert.deepEqual(['Southern finished fifth','the Jags placed','Southern Miss won','Texas Southern finished'].map(text=>named.test(text)),[true,true,false,false]);
}

// The Birmingham Football Classic (Alabama State vs Southern, Aug 29) is
// outside the SWAC in both schools' records.
for(const id of ['alabama-state','southern'])
  assert.match(read(`../src/schools/${id}.mjs`),/sport==='Football'&&\/\^birmingham football classic\$\/i\.test\(String\(game\.tournament\?\.title\|\|''\)\.trim\(\)\)\)event\.conference_game=false/);

console.log('SWAC shared checks passed');
