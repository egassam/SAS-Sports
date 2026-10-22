// Shared rules found onboarding the Big West (Oct 22).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {golfCardPlace,golfStoryPlace} from '../src/sidearm-school-kit.mjs';
import {createConferenceGames} from '../src/conference-games.mjs';
import {isSidearmSplash} from '../scripts/onboard-school.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');

// Golf cards in Big West forms. Mutation: without each form the final reads
// "Completed" (UC Irvine's CDA National Reserve then took a player's
// "T79th" from its story; Long Beach State's Mark Simpson a player's "T11th"
// instead of the card's "2nd/17").
assert.equal(golfCardPlace('Final - 15th (905)'),'15th');
assert.equal(golfCardPlace('Final - 11th (896)'),'11th');
assert.equal(golfCardPlace('2nd/17; Huggins, T4th'),'2nd of 17');
assert.equal(golfCardPlace('T13th/18; Albers, T15th'),'T13th of 18');
assert.equal(golfCardPlace('7th/15; Sor/Phi, T20th'),'7th of 15');
assert.equal(golfCardPlace('Ninth'),'9th');
assert.equal(golfCardPlace('Seventh'),'7th');
// A round's standing is not the final place; a place bigger than its field
// is no place.
for(const text of ['Two Rounds - T15 (603)','First Round - 14th (295)','Final','15th/12; Gohm, T17th','Ninety'])assert.equal(golfCardPlace(text),null,text);

// A golf story's team move on the final day (Cal Poly at the Saint Mary's
// Invitational, Oct 21: "slipped from fifth to eighth during the final
// round"; its card has no place). Mutation: without the form it reads null.
assert.equal(golfStoryPlace(fixture('cal-poly-module/recap-2026-10-21-mens-golf-egnatios-finishes-as-runner-up.html.gz'),{team:"(?:Mustangs|Cal Poly|(?:Men's|Women's) Golf)"}),'8th');

// Big West conference games by membership: opponents write "Long Beach
// St.", "LBSU", "Cal State Northridge", "CSUB", "UCSB". The Big West sponsors no
// football: Sacramento State's (MAC) and Cal Poly's (Big Sky) games have no
// Big West record. Mutation: without the names these games leave the record.
const schools=JSON.parse(read('../src/schools.json'));
const bigWest=schools.filter(s=>s.conference==='Big West').map(s=>s.id).sort();
assert.deepEqual(bigWest,['cal-baptist','cal-poly','cal-state-fullerton','csu-bakersfield','csun','long-beach-state','sacramento-state','uc-irvine','uc-riverside','uc-san-diego','uc-santa-barbara','utah-valley']);
const {markConferenceGames}=createConferenceGames({schools});
const uvu=schools.find(s=>s.id==='utah-valley');
const games=markConferenceGames(['Long Beach St.','LBSU','Cal State Northridge','CSUB','UCSB','UC Irvine','California Baptist','Sac State','Utah Tech','Big West Championship'].map((opponent,i)=>({sport:'Soccer',opponent,start_time:`2026-10-${10+i}T19:00:00Z`})),'',uvu);
assert.deepEqual(games.map(e=>e.conference_game),[true,true,true,true,true,true,true,true,false,false]);
const football=markConferenceGames([{sport:'Football',opponent:'Cal Poly',start_time:'2026-11-07T19:00:00Z'}],'',schools.find(s=>s.id==='sacramento-state'));
assert.equal(football[0].conference_game,false);

// Hawaii (Mountain West) stays a Big West member for men's volleyball, beach
// volleyball and women's water polo; the team is told by the schedule page.
// Mutation: without the affiliates UCSB's (unflagged) men's volleyball games
// against Hawaii leave the Big West record.
const ucsb=schools.find(s=>s.id==='uc-santa-barbara');
const hawaii=(sport,slug)=>markConferenceGames([{sport,opponent:'Hawai‘i',start_time:'2027-02-10T19:00:00Z'}],'',ucsb,`https://ucsbgauchos.com/sports/${slug}/schedule`)[0].conference_game;
assert.deepEqual([hawaii('Volleyball','mens-volleyball'),hawaii('Water Polo','womens-water-polo'),hawaii('Beach Volleyball','womens-beach-volleyball'),hawaii('Volleyball','womens-volleyball'),hawaii('Water Polo','mens-water-polo')],[true,true,true,false,false]);

// Onboarding: a SIDEARM splash homepage (gorunners.com) carries no menu, so
// add-school reads a sport page's instead. Mutation: CSU Bakersfield then
// read no sports at all.
assert.equal(isSidearmSplash(fixture('big-west-shared/gorunners-splash.html.gz')),true);
assert.equal(isSidearmSplash('<a href="/splash.aspx?skip=true">x</a><a href="/sports/baseball">Baseball</a>'),false);

// Instagram's embed script ("instagram.com/embed.js" in Cal Baptist's
// profile bios) is no athlete's handle. Mutation: without the block it reads
// as the account "embed.js".
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
const sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch:async url=>{throw Error(`Unexpected network request: ${url}`)}};
const worker=Function(...Object.keys(deps),source+';return {verifiedInstagram,officialCardInstagram,distanceRunners}')(...Object.values(deps));
assert.equal(worker.verifiedInstagram('<script async src="//www.instagram.com/embed.js"></script>'),null);
assert.equal(worker.officialCardInstagram('https://www.instagram.com/embed.js'),null);
assert.equal(worker.verifiedInstagram('<a href="https://www.instagram.com/kylie.phi/">IG</a>'),'https://www.instagram.com/kylie.phi/');

// Cross country features distance runners from a roster shared with track,
// but only when the athletes carry event groups: Cal Baptist's gives
// positions to its coaches alone. Mutation: filtering anyway leaves none.
const runners=[{url:'a'},{url:'b'}];
assert.equal(worker.distanceRunners(runners,new Map([['coach','Head Cross-Country/Track Coach']])).length,2);
assert.deepEqual(worker.distanceRunners(runners,new Map([['a','Distance'],['b','Sprints']])).map(p=>p.url),['a']);

console.log('Big West shared checks passed');
