// Rules found onboarding the Summit League (Oct 24).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createConferenceGames} from '../src/conference-games.mjs';
import {golfCardPlace} from '../src/sidearm-school-kit.mjs';
import {createSouthDakotaStateHandlers} from '../src/schools/south-dakota-state.mjs';
import {createOmahaHandlers} from '../src/schools/omaha.mjs';
import {labelCodedTeamPages} from '../scripts/onboard-school.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL(`./fixtures/${path}`,import.meta.url))).toString('utf8');
const schools=JSON.parse(read('../src/schools.json'));

// The 2026-27 Summit League; Oral Roberts and North Dakota are blocked
// (docs/BLOCKED_SCHOOLS.md) but keep their catalog entries.
const members=['kansas-city','north-dakota','north-dakota-state','omaha','oral-roberts','south-dakota','south-dakota-state','st-thomas'];
assert.deepEqual(schools.filter(s=>s.conference==='Summit League').map(s=>s.id).sort(),members);
assert.equal(schools.find(s=>s.id==='denver').conference,'WCC');

// Members' games count by the names opponents write ("UMKC", "UND", "NDSU",
// "Nebraska Omaha", "ORU", "St. Thomas (Minn.)"); the Summit sponsors no
// football, so a football game against a member is in no league here.
{
  const ndsu=schools.find(s=>s.id==='north-dakota-state');
  const at=day=>`2026-10-${day}T18:00:00Z`;
  const events=[['Soccer','UND','01'],['Soccer','UMKC','02'],['Soccer','Nebraska Omaha','03'],['Soccer','ORU','04'],['Soccer','St. Thomas (Minn.)','05'],['Soccer','St. Thomas','09'],['Soccer','South Dakota St.','06'],['Soccer','Drake','07'],['Football','South Dakota State','08']].map(([sport,opponent,day])=>({sport,opponent,start_time:at(day)}));
  createConferenceGames({schools}).markConferenceGames(events,'',ndsu,'https://gobison.com/sports/womens-soccer/schedule');
  assert.deepEqual(events.map(event=>event.conference_game),[true,true,true,true,true,true,true,false,false]);
}

// Sports in other leagues, as each school's pages and stories name them:
// NDSU football in the Mountain West since 2026 ("first Mountain West
// victory", Air Force), St. Thomas men's hockey in the NCHC.
assert.match(read('../src/schools/north-dakota-state.mjs'),/const league=\{'Football':'Mountain West','Wrestling':'Big 12'\}\[sport\]/);
assert.match(read('../src/schools/south-dakota-state.mjs'),/const league=\{'Football':'Missouri Valley Football Conference','Wrestling':'Big 12'\}\[sport\]/);
assert.match(read('../src/schools/south-dakota.mjs'),/const league=\{'Football':'Missouri Valley Football Conference'\}\[sport\]/);
assert.match(read('../src/schools/omaha.mjs'),/const league=\{'Hockey':'NCHC'\}\[sport\]/);
assert.match(read('../src/schools/st-thomas.mjs'),/sport==='Hockey'\?\(url\?\.pathname\.startsWith\('\/sports\/whockey\/'\)\?'WCHA':'NCHC'\):\{'Football':'Pioneer Football League'\}/);

// A golf card with the score first ("911 (+47) / 1st", Omaha's Big O
// Classic); the place-first card still reads.
assert.equal(golfCardPlace('911 (+47) / 1st'),'1st');
assert.equal(golfCardPlace('875 (+23) / 9th '),'9th');
assert.equal(golfCardPlace('880 (E) / T3rd'),'T3rd');
assert.equal(golfCardPlace('8th / 926 (+74)'),'8th');
assert.equal(golfCardPlace('911 (+47)'),null);

// SDSU's USF Invitational was played as individuals: "Eaton, one of four
// Jackrabbits competing individually".
{
  const raw=fixture('south-dakota-state-module/recap-2026-10-13-mens-golf-eaton-wins-individual-title-at.html.gz');
  const handlers=createSouthDakotaStateHandlers({makeEvent:()=>({}),recapMatchesEvent:()=>false,fetch:async()=>({ok:true,text:async()=>raw}),headers:{}});
  const event={sport:'Golf',status:'Final',headline:'Completed',recap_url:'https://gojacks.com/news/2026/10/13/mens-golf-eaton-wins-individual-title-at-usf-invitational',start_time:'2026-10-12T05:00:00Z',end_time:'2026-10-13T05:00:00Z',opponent:'USF Invitational'};
  await handlers.attachGolfPlace(event);
  assert.equal(event.headline,'No team score (individuals only)');
  // A team story keeps the kit's place.
  const kemper=fixture('south-dakota-state-module/recap-2026-10-6-mens-golf-sdsu-finishes-third-at-kemper-.html.gz');
  const team=createSouthDakotaStateHandlers({makeEvent:()=>({}),recapMatchesEvent:()=>false,fetch:async()=>({ok:true,text:async()=>kemper}),headers:{}});
  const placed={...event,headline:'Completed',opponent:'Kemper Lakes Intercollegiate',start_time:'2026-10-05T05:00:00Z',end_time:'2026-10-06T05:00:00Z',recap_url:'https://gojacks.com/news/2026/10/6/mens-golf-sdsu-finishes-third-at-kemper-lakes-intercollegiate'};
  await team.attachGolfPlace(placed);
  assert.equal(placed.headline,'3rd');
}
// Omaha's stories call the team "the Mavs": "The Mavs finished in 9th place
// as a team" (Zach Johnson Invitational, Oct 19-20).
{
  const raw=fixture('omaha-module/story-2026-10-20-mavs-mens-golf-finishes-ninth-one-player.html.gz');
  const handlers=createOmahaHandlers({makeEvent:()=>({}),recapMatchesEvent:()=>false,fetch:async()=>({ok:true,text:async()=>raw}),headers:{}});
  const event={sport:'Golf',status:'Final',headline:'Completed',opponent:'Zach Johnson Invitational',start_time:'2026-10-19T05:00:00Z',end_time:'2026-10-20T05:00:00Z',recap_url:'https://omahamavs.com/news/2026/10/20/mavs-mens-golf-finishes-ninth-one-player-finishing-tied-for-third-at-zach-johnson-invitational'};
  await handlers.attachGolfPlace(event);
  assert.equal(event.headline,'9th');
}
// SDSU's women split on Sep 25: the Augustana Invitational is not on TFRRS,
// so the only TFRRS meet that day (Gans Creek) is taken only when the
// schedule's place agrees.
assert.match(read('../src/schools/south-dakota-state.mjs'),/onlyMeetThatDay:'checked'/);

// Code-named team pages get their team (St. Thomas `wcross`/`mcross`,
// Omaha `mswim`); gendered slugs and single pages are left alone.
{
  const module=routes=>`  combinedSports:new Set(['Cross Country']),\n  verifiedInstagrams:{},\n  scheduleUrls:{\n    'x|Cross Country':${routes}\n  },\n`;
  assert.match(labelCodedTeamPages(module("['https://x.com/sports/wcross/schedule','https://x.com/sports/mcross/schedule']")),/teamLabels:\{'\/sports\/wcross\/schedule':"Women's",'\/sports\/mcross\/schedule':"Men's"\}/);
  const gendered=module("['https://x.com/sports/womens-cross-country/schedule','https://x.com/sports/mens-cross-country/schedule']");
  assert.equal(labelCodedTeamPages(gendered),gendered);
  const single=module("'https://x.com/sports/wcross/schedule'");
  assert.equal(labelCodedTeamPages(single),single);
  // An existing label is kept and a page's label is not written twice.
  const labeled=labelCodedTeamPages(`  combinedSports:new Set(['Cross Country']),\n  teamLabels:{'/sports/cross-country/schedule':"Men's",'/sports/wcross/schedule':"Women's"},\n  scheduleUrls:{\n    'x|Cross Country':['https://x.com/sports/wcross/schedule','https://x.com/sports/mcross/schedule']\n  },\n`);
  assert.match(labeled,/teamLabels:\{'\/sports\/cross-country\/schedule':"Men's",'\/sports\/wcross\/schedule':"Women's",'\/sports\/mcross\/schedule':"Men's"\}/);
}
const setup=read('../scripts/start-schools.mjs');
assert.match(setup,/labelCodedTeamPages\(text\)/);
assert.match(read('../scripts/set-sport-routes.mjs'),/mod=labelCodedTeamPages\(mod\)/);
for(const [id,labels] of Object.entries({'st-thomas':['wcross','mcross','whockey','mhockey','wsoc','msoc','mswim'],omaha:['mswim']}))
  for(const slug of labels)assert.match(read(`../src/schools/${id}.mjs`),new RegExp(`'/sports/${slug}/schedule':"(?:Women|Men)'s"`),`${id} ${slug}`);
console.log('Summit shared checks passed');
