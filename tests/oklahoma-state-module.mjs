import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers,oklahomaStateMeetSport} from '../src/schools/oklahoma-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fixture=path=>gunzipSync(readFileSync(new URL('./fixtures/oklahoma-state-module/'+path,import.meta.url))).toString('utf8');
const sources=JSON.parse(read('./fixtures/oklahoma-state-module/sources.json'));
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const certification=JSON.parse(read('./certified-schools.json'));
const school=schools.find(s=>s.id==='oklahoma-state'),now=new Date('2026-09-29T17:00:00Z');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Unlisted URLs are refused; tests can never silently contact okstate.com.
let responses=new Map(),requests=[];
const fetch=async url=>{requests.push(String(url));return responses.has(String(url))?new Response(responses.get(String(url))):new Response('not found',{status:404});};
const deps={kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {parseHtml,fetchLive,groupEvents,makeEvent,candidateUrls,rosterUrls,featuredAthletes,VERIFIED_TEAM_TAG_INSTAGRAM,schoolCombinedSports,teamLabelForSource};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit official routes.
const sports=sponsoredSports['oklahoma-state'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',oklahomaStateSchool.scheduleUrls],['roster',oklahomaStateSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('oklahoma-state|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'okstate.com',`${key} must stay on okstate.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(oklahomaStateSchool.scheduleUrls[`oklahoma-state|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(oklahomaStateSchool.rosterUrls[`oklahoma-state|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'oklahoma-state\|/.test(read('../src/index.js')),'Oklahoma State configuration must live in its module, not shared code');
for(const sport of ['Basketball','Golf','Tennis'])assert.ok(worker.schoolCombinedSports(school).has(sport),`${sport} loads both divisions`);
assert.equal(worker.teamLabelForSource(school,'Golf','https://okstate.com/sports/mens-golf/schedule'),"Men's");
assert.equal(worker.teamLabelForSource(school,'Golf','https://okstate.com/sports/womens-golf/schedule'),"Women's");
assert.equal(worker.teamLabelForSource(school,'Tennis','https://okstate.com/sports/mens-tennis/schedule'),"Men's");
assert.ok(!worker.schoolCombinedSports(schools.find(s=>s.id==='utah')).has('Golf'),'other schools keep the shared combination policy');
assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get('oklahoma-state|Cross Country|Denis Kipngetich'),'https://www.instagram.com/deniskipngetich604/');
assert.equal(worker.VERIFIED_TEAM_TAG_INSTAGRAM.get('oklahoma-state|Cross Country|Brian Musau'),'https://www.instagram.com/brianmuangemusau/');
assert.equal([...worker.VERIFIED_TEAM_TAG_INSTAGRAM.keys()].filter(key=>key.startsWith('oklahoma-state|')).length,2,'no new Oklahoma State identities are inferred');

// Shared cross-country/track schedule: the six published meets are all
// cross country. Production showed them under Track & Field before this fix.
const mxct='https://okstate.com/sports/mxct/schedule',handlers=createOklahomaStateHandlers();
const meetEvent=(meet,sport)=>worker.makeEvent({school,sport,status:meet.status,relation:'at',opponent:meet.name,date:new Date(`${meet.date}T12:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}),time:null,schoolScore:null,oppScore:null,resultText:meet.status==='Final'?'Completed':null,sourceUrl:mxct,now});
assert.equal(sources.shared_program_meets.meets.length,6);
for(const meet of sources.shared_program_meets.meets)assert.equal(oklahomaStateMeetSport(meetEvent(meet,'Cross Country')),'Cross Country',`${meet.name} is a cross-country meet`);
const xcEvents=sources.shared_program_meets.meets.map(meet=>meetEvent(meet,'Cross Country')),tfEvents=sources.shared_program_meets.meets.map(meet=>meetEvent(meet,'Track & Field'));
assert.equal(handlers.filterEvents(xcEvents,school,'Cross Country',mxct).length,6,'Cross Country keeps every published meet');
assert.equal(handlers.filterEvents(tfEvents,school,'Track & Field',mxct).length,0,'Track & Field must not display cross-country meets');
for(const [name,date,sport] of [['Arkansas Invitational','2027-01-23','Track & Field'],['Big 12 Indoor Championships','2027-02-26','Track & Field'],['John Jacobs Invitational','2027-04-17','Track & Field'],['Cowboy Relays','2026-10-03','Track & Field'],['Big 12 Cross Country Championships','2026-12-01','Cross Country']]){
  assert.equal(oklahomaStateMeetSport({opponent:name,start_time:`${date}T12:00:00Z`}),sport,`${name} classification`);
}
assert.equal(oklahomaStateMeetSport({opponent:'Unknown',start_time:null}),null);
assert.equal(handlers.filterEvents(tfEvents,{id:'kstate'},'Track & Field',mxct).length,6,'other schools are never filtered');
assert.equal(handlers.filterEvents(tfEvents,school,'Track & Field','https://okstate.com/sports/track-and-field/schedule').length,6,'only the shared program page is split');
assert.equal(handlers.filterEvents(tfEvents,school,'Track & Field',mxct.replace('okstate.com','example.org')).length,6,'unofficial hosts are never treated as the shared page');
// Through the Worker parser, using a minimal page with the same meets.
const textRow=(date,name)=>`<tr><td>${date}</td><td>TBA</td><td>Away</td><td>${name}</td><td></td><td></td><td></td></tr>`;
const programPage=`<h1>2026-27 Cross Country/Track & Field Schedule</h1><table>${textRow('Oct 17','Weis-Crockett Invitational')}${textRow('Oct 31','Big 12 Cross Country Championships')}${textRow('Jan 23','Arkansas Invitational')}${textRow('Feb 26','Big 12 Indoor Championships')}</table>`;
assert.deepEqual(worker.parseHtml(programPage,school,'Cross Country',mxct,now).map(e=>e.opponent),['Weis-Crockett Invitational','Big 12 Cross Country Championships']);
assert.deepEqual(worker.parseHtml(programPage,school,'Track & Field',mxct,now).map(e=>e.opponent),['Arkansas Invitational','Big 12 Indoor Championships']);
assert.equal(worker.parseHtml(programPage,schools.find(s=>s.id==='utah'),'Track & Field','https://utahutes.com/sports/cross-country/schedule',now).length,4,'other schools keep shared parsing');

// Tennis: a stale women's page used to stop the loop and empty the feed.
// Pages are synthetic orchestration inputs (the official HTML was unavailable).
const localNow=new Date(),startYear=localNow.getUTCMonth()+1>=7?localNow.getUTCFullYear():localNow.getUTCFullYear()-1,yy=n=>String(n%100).padStart(2,'0');
const womensTennis=`<h1>${startYear-1}-${yy(startYear)} Women's Tennis Schedule</h1><table>${textRow('Feb 7','Tulsa')}${textRow('Mar 14','Baylor')}</table>`;
const mensTennis=`<h1>${startYear}-${yy(startYear+1)} Men's Tennis Schedule</h1><table>${textRow('Mar 20','Texas Tech')}</table>`;
responses=new Map([['https://okstate.com/sports/womens-tennis/schedule',womensTennis],['https://okstate.com/sports/mens-tennis/schedule',mensTennis]]);requests=[];
const tennis=await worker.fetchLive('oklahoma-state','Tennis');
assert.deepEqual(requests,['https://okstate.com/sports/womens-tennis/schedule','https://okstate.com/sports/mens-tennis/schedule'],'both Tennis divisions are loaded');
assert.deepEqual([...new Set(tennis.events.map(e=>e.team_label))].sort(),["Men's","Women's"]);
const tennisGroups=worker.groupEvents(tennis.events);
assert.equal(tennisGroups.length,1,'a current men\'s schedule must keep the Tennis feed populated');
assert.deepEqual([...tennisGroups[0].upcoming,...tennisGroups[0].results].map(e=>e.title),["Men's · Oklahoma State at Texas Tech"]);
// Real official women's page (retrieved 2026-09-29): still the 2025-26
// season, so an empty current Tennis feed is a source gap, not a parser bug.
const womensTennisPage=fixture('womens-tennis-schedule.html.gz');
assert.match(womensTennisPage,/2025-26 Cowgirl Tennis Schedule/);
const womensTennisEvents=worker.parseHtml(womensTennisPage,school,'Tennis','https://okstate.com/sports/womens-tennis/schedule',now);
assert.equal(womensTennisEvents.length,21,'every published women\'s match is parsed');
assert.ok(womensTennisEvents.every(e=>e.start_time>='2026-01-23'&&e.start_time<'2026-04-13'),'published matches keep their 2025-26 season dates');
assert.deepEqual(worker.groupEvents(womensTennisEvents,now),[],'no stale-season matches are presented as the current season');
// Golf: both divisions are merged and labeled.
responses=new Map([['https://okstate.com/sports/womens-golf/schedule',`<h1>${startYear}-${yy(startYear+1)} Women's Golf Schedule</h1><table>${textRow('Oct 5','The Ally')}</table>`],['https://okstate.com/sports/mens-golf/schedule',`<h1>${startYear}-${yy(startYear+1)} Men's Golf Schedule</h1><table>${textRow('Oct 12','Big 12 Match Play')}</table>`]]);requests=[];
const golf=await worker.fetchLive('oklahoma-state','Golf');
assert.deepEqual(golf.events.map(e=>e.team_label).sort(),["Men's","Women's"],'Golf must include the men\'s program');

// Athletes from the official rosters. The validator's rule is reproduced
// here: an Instagram destination, or an official profile where allowed.
const osuCertification=certification.schools.find(s=>s.id==='oklahoma-state');
assert.deepEqual(osuCertification.athlete_profile_fallback_sports,['Tennis','Equestrian','Track & Field']);
const validAthlete=(athlete,sport)=>athlete.instagram_url?athlete.instagram_url.startsWith('https://www.instagram.com/'):osuCertification.athlete_profile_fallback_sports.includes(sport)&&new URL(athlete.profile_url).hostname==='okstate.com'&&/\/roster\//.test(athlete.profile_url);
responses=new Map([[sources.rosters['mxct-roster.html.gz'],fixture('mxct-roster.html.gz')],[sources.rosters['wrestling-roster.html.gz'],fixture('wrestling-roster.html.gz')]]);
requests=[];
const xcAthletes=await worker.featuredAthletes('oklahoma-state','Cross Country');
assert.deepEqual(xcAthletes.map(a=>a.name).sort(),['Brian Musau','Denis Kipngetich'],'Cross Country uses the two team-tag verified identities');
assert.ok(xcAthletes.every(a=>validAthlete(a,'Cross Country')&&a.profile_url.includes('/sports/mxct/roster/')));
requests=[];
const tfAthletes=await worker.featuredAthletes('oklahoma-state','Track & Field');
assert.equal(tfAthletes.length,3,'Track & Field shows three official roster profiles');
assert.ok(tfAthletes.every(a=>a.instagram_url===null&&a.image_url&&validAthlete(a,'Track & Field')),'profile-only athletes carry no Instagram destination');
assert.ok(!tfAthletes.some(a=>['Brian Musau','Denis Kipngetich'].includes(a.name)&&a.instagram_url),'Cross Country identities are not copied to Track & Field');
assert.ok(tfAthletes.every(a=>!validAthlete({...a},'Soccer')),'profile-only athletes fail for sports without the fallback');
requests=[];
const wrestlers=await worker.featuredAthletes('oklahoma-state','Wrestling');
assert.equal(wrestlers.length,3);
assert.ok(wrestlers.every(a=>validAthlete(a,'Wrestling')&&a.instagram_url&&a.profile_url.includes('/sports/wrestling/roster/')),'Wrestling uses athlete-bound roster Instagram links');
assert.equal(new Set(wrestlers.map(a=>a.instagram_url.toLowerCase())).size,3);
assert.deepEqual(requests,[sources.rosters['wrestling-roster.html.gz']],'identity-bound roster links need no biography fetches');

console.log('Oklahoma State module checks passed: 11 routes, shared XC/track split, both Tennis/Golf divisions, official roster athletes.');
