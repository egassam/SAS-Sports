import {kansasSchool,createKansasHandlers} from '../src/schools/kansas.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/kansas-cross-country.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const baseline=JSON.parse(read('./fixtures/kstate-module-baseline.json'));
const schools=JSON.parse(read('../src/schools.json'));
const sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='kstate');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
let responses=new Map(),requests=[];
const fetch=async url=>{requests.push(String(url));assert.ok(responses.has(String(url)),`Unexpected fetch ${url}`);return new Response(responses.get(String(url)));};
const worker=Function('kansasSchool','createKansasHandlers','kstateSchool','createKStateHandlers','schools','sponsoredSports','rosterSocialInstagrams','extractText','isKansasCrossCountry','applyVerifiedKansasMeet','attachKansasRaceDocuments','fetch',`${source}\nreturn {candidateUrls,rosterUrls,enrichGameEvent,enrichMeetEvent,featuredAthletes,officialCardInstagram,VERIFIED_TEAM_TAG_INSTAGRAM,KNOWN_URLS};`)(kansasSchool,createKansasHandlers,kstateSchool,createKStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,()=>{throw Error('Unexpected PDF');},isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,fetch);

// Frozen from the pre-module application commit, never regenerated during tests.
assert.equal(Object.keys(baseline.routes).length,10);
assert.deepEqual(Object.keys(baseline.routes),sponsoredSports.kstate);
for(const [sport,expected] of Object.entries(baseline.routes)){
  assert.deepEqual(worker.candidateUrls(school,sport),expected.schedule,`${sport} schedule parity`);
  assert.deepEqual(worker.rosterUrls(school,sport),expected.roster,`${sport} roster parity`);
}
assert.deepEqual(Object.fromEntries([...worker.VERIFIED_TEAM_TAG_INSTAGRAM].filter(([key])=>key.startsWith('kstate|'))),baseline.verified_instagrams);
assert.equal(worker.officialCardInstagram('https://instagram.com/kstatesports/'),null);
assert.equal(worker.officialCardInstagram('https://instagram.com/sundevilathletics/'),null);
assert.equal(baseline.soccer.length,5);
for(const {input,expected} of baseline.soccer){
  assert.deepEqual(worker.enrichGameEvent(structuredClone(input)),expected);
  for(const changed of [{school_id:'kansas'},{sport:'Volleyball'},{start_time:'2027-09-03T12:00:00Z'},{status:'Upcoming'}]){
    const event={...input,...changed},before=structuredClone(event);
    worker.enrichGameEvent(event);assert.deepEqual(event,before,'saved soccer facts must not leak to another event');
  }
}
for(const records of [kstateSchool.scheduleUrls,kstateSchool.verifiedGameDetails,kstateSchool.verifiedInstagrams])assert.ok(Object.keys(records).every(key=>key.startsWith('kstate|')));

// The module's known accounts must still be attached to exact roster identities
// by the production featured-athlete path, not just present in a config object.
const roster=Object.keys(baseline.verified_instagrams).map(key=>{
  const name=key.split('|')[2],slug=name.toLowerCase().replaceAll(' ','-');
  return `<li class="roster-list-item"><a href="/sports/womens-tennis/roster/player/${slug}">${name}</a><img alt="${name}" src="https://www.kstatesports.com/images/${slug}.jpg"></li>`;
}).join('');
responses.set(baseline.routes.Tennis.roster[0],roster);
const athletes=await worker.featuredAthletes('kstate','Tennis');
assert.equal(athletes.length,3);
for(const athlete of athletes){
  assert.equal(athlete.instagram_url,baseline.verified_instagrams[`kstate|Tennis|${athlete.name}`]);
  assert.ok(athlete.image_url,'keep identity-bound portraits');
}
assert.deepEqual(requests,[baseline.routes.Tennis.roster[0]],'known tags should retain the fast roster path');
// A similarly named athlete at another school must not inherit K-State tags.
assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get('kansas|Tennis|Mallory Renfro'),undefined);

// Seeded result mutations must not contaminate another request.
const first=()=>({school_id:'kstate',school:'Kansas State',sport:'Cross Country',event_type:'MEET',status:'Final',start_time:'2026-09-04T12:00:00Z',opponent:'Platte River Rumble Gold',results:[]});
const one=first();worker.enrichMeetEvent(one);one.results[0].result='changed';
const two=first();worker.enrichMeetEvent(two);assert.equal(two.results[0].result,'1st · 20 pts');
assert.equal(two.results.length,20);
console.log('K-State module: all 10 sport source routes, 5 exact soccer records, 3 verified tennis accounts through the athlete path, school/event isolation, and independent result snapshots passed.');
