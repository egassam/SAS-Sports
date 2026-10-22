// Shared rules found onboarding the Atlantic 10 (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');

// Golf stories (the cards publish no place). Mutation: without each form
// the final reads "Completed" or a player's place.
// A headline naming the team as just "Golf" (George Washington).
assert.equal(golfStoryPlace(fixture('george-washington-module/recap-2026-9-13-mens-golf-golf-finishes-11th-in-season-o.html.gz'),{team:"(?:Revolutionaries|George Washington|(?:Men's|Women's) Golf)"}),'11th');
// A dateline ending in "--" (George Mason's Nemacolin: "finish tied for ninth").
assert.equal(golfStoryPlace(fixture('george-mason-module/recap-2026-10-6-mens-golf-patriots-finish-mid-pact-at-th.html.gz'),{team:"(?:Patriots|George Mason|(?:Men's|Women's) Golf)"}),'T9th');
// "led the Patriots to a fifth-place finish" (Rod Myers).
assert.equal(golfStoryPlace(fixture('george-mason-module/recap-2026-9-22-mens-golf-powell-claims-first-collegiate.html.gz'),{team:"(?:Patriots|George Mason|(?:Men's|Women's) Golf)"}),'5th');
// "with a fifth-place finish" (Davidson's Furman).
assert.equal(golfStoryPlace(fixture('davidson-module/story-2026-10-19-mens-golf-cats-conclude-fall-with-5th-pl.html.gz'),{team:"(?:Wildcats|Davidson|(?:Men's|Women's) Golf)"}),'5th');
// The team's possessive before a best score is a player's ("the Hawks'
// lowest score ... tied for 81st"); "As a team, Saint Joseph's placed 18th".
assert.equal(golfStoryPlace(fixture('saint-josephs-module/recap-2026-9-8-womens-golf-hawks-cap-play-at-the-nittan.html.gz'),{team:"(?:Hawks|Saint Joseph's|(?:Men's|Women's) Golf)"}),'18th');
// "Ties For Fourth" in the headline; the story opens with a player's "Ohio's
// top finisher, finishing ... tied for 6th" (Ohio, Oct 6).
assert.equal(golfStoryPlace(fixture('ohio-module/recap-2026-10-6-womens-golf-ohio-womens-golf-places-sixt.html.gz'),{team:"(?:Bobcats|Ohio|(?:Men's|Women's) Golf)"}),'T4th');
assert.equal(golfStoryPlace('<meta property="og:title" content="Ohio Women\'s Golf Ties For Fourth at Butler Invitational">',{team:"(?:Bobcats|Ohio|(?:Men's|Women's) Golf)"}),'T4th');

// Onboarding finds TFRRS names without apostrophes and with "_U"
// (PA_college_f_St_Josephs_PA, MO_college_f_St_Louis_U).
const start=read('../scripts/start-schools.mjs');
assert.match(start,/\.replace\(\/\['’\]\/g,''\)/);
assert.match(start,/`\$\{name\}_U`/);

// Atlantic 10 games by membership: "GW", "Bonnies", "St. Joseph's",
// "SLU", "URI", "Loyola (Ill.)", "Mason", "Virginia Commonwealth".
// Mutation: without the names these games leave the record.
const schools=JSON.parse(read('../src/schools.json'));
assert.equal(schools.filter(s=>s.conference==='Atlantic 10').length,14);
const {markConferenceGames}=createConferenceGames({schools});
const fordham=schools.find(s=>s.id==='fordham');
const games=markConferenceGames(['GW','Bonnies',"St. Joseph's",'SLU','URI','Loyola (Ill.)','Mason','Virginia Commonwealth','Loyola Marymount'].map((opponent,i)=>({sport:'Volleyball',opponent,status:'Final',start_time:`2026-10-${String(i+1).padStart(2,'0')}T18:00:00Z`,title:`Fordham vs ${opponent}`})),'',fordham);
assert.deepEqual(games.map(g=>g.conference_game),[true,true,true,true,true,true,true,true,false]);
console.log('Atlantic 10 shared checks passed');

// A roster rendered in the browser lists its players as page data (George
// Mason): each player's name, portrait, Instagram and official profile
// (<roster>/<first-last>/<rp_id>). Mutation: without the reader the roster
// has no athletes.
{
  const {rosterSocialInstagrams}=await import('../src/roster-socials.js');
  const {createSourceFetch,SOURCE_TTL}=await import('../src/source-fetch.mjs');
  const {schoolModuleDeps}=await import('./school-module-deps.mjs');
  const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
  const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports:JSON.parse(read('../src/sponsored-sports.json')),rosterSocialInstagrams,extractText:()=>null,fetch:async()=>{throw Error('no network')}};
  const {rosterProfiles}=Function(...Object.keys(deps),source+';return {rosterProfiles}')(...Object.values(deps));
  const page='<script>window.x={"roster":{"players":[{"rp_id":9843,"first_name":"Ady","last_name":"Bollinger","rp_hide":false,"image":{"fullpath":"/images/2026/8/17/16_AdyBollinger.jpg"},"socials":{"Instagram":{"handle":"ady.bollinger"}}},{"rp_id":9827,"first_name":"Avery","last_name":"Booker","rp_hide":false,"image":null,"instagram_username":"averyybookerr","socials":null}]}}</script>';
  assert.deepEqual(rosterProfiles(page,'https://gomason.com/sports/womens-volleyball/roster'),[
    {name:'Ady Bollinger',url:'https://gomason.com/sports/womens-volleyball/roster/ady-bollinger/9843',image_url:'https://gomason.com/images/2026/8/17/16_AdyBollinger.jpg',instagram_url:'https://www.instagram.com/ady.bollinger/'},
    {name:'Avery Booker',url:'https://gomason.com/sports/womens-volleyball/roster/avery-booker/9827',image_url:null,instagram_url:'https://www.instagram.com/averyybookerr/'}]);
  console.log('Browser-rendered roster checks passed');
}
