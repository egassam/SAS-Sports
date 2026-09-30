import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers,oklahomaStateMeetSport,oklahomaStateScheduleGames,oklahomaStatePlacing,oklahomaStateStartTime} from '../src/schools/oklahoma-state.mjs';
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
const worker=Function(...Object.keys(deps),source+';return {parseHtml,fetchLive,freshGroupedFeed,groupEvents,makeEvent,candidateUrls,rosterUrls,featuredAthletes,VERIFIED_TEAM_TAG_INSTAGRAM,schoolCombinedSports,teamLabelForSource};')(...Object.values(deps));

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

// Track & Field: the shared program page currently lists only cross-country
// meets. That is a valid empty schedule (200 []), as K-State's track feed is,
// not the 502 "no usable events" of a failed source.
const xcOnlyPage=`<h1>2026-27 Cross Country/Track & Field Schedule</h1><table>${textRow('Oct 17','Weis-Crockett Invitational')}${textRow('Oct 31','Big 12 Cross Country Championships')}</table>`;
responses=new Map([[mxct,xcOnlyPage]]);requests=[];
const track=await worker.fetchLive('oklahoma-state','Track & Field');
assert.deepEqual(track.events,[]);assert.equal(track.live_source_used,true);assert.equal(track.error,null);assert.equal(track.source_url,mxct);
let stored=null;const fakeCache={put:async(key,response)=>{stored=await response.clone().json();}};
const trackFeed=await worker.freshGroupedFeed(new URL('https://example.test/live/feed/grouped'),'oklahoma-state','Track & Field',null,fakeCache,'key');
assert.ok(trackFeed,'an empty official schedule is a response, not a failure');assert.equal(trackFeed.status,200);
assert.deepEqual(await trackFeed.json(),[]);assert.deepEqual(stored,[]);
assert.equal((await worker.fetchLive('oklahoma-state','Cross Country')).events.length,2,'the same page still serves Cross Country');
responses=new Map();
const failedTrack=await worker.fetchLive('oklahoma-state','Track & Field');
assert.equal(failedTrack.live_source_used,false,'an unavailable page is still a failed source');
assert.equal(await worker.freshGroupedFeed(new URL('https://example.test/live/feed/grouped'),'oklahoma-state','Track & Field',null,fakeCache,'key'),null);
responses=new Map([['https://utahutes.com/sports/track-and-field/schedule','<h1>Track</h1><table></table>']]);
assert.equal((await worker.fetchLive('utah','Track & Field')).live_source_used,false,'other schools keep the failed-source behavior');

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
// Football: the official page's game data supplies K-State's result format
// (W/L, school score first) and each game's exact recap. The rendered cards
// show only the two scores, opponent first, and no recap link.
const footballUrl='https://okstate.com/sports/football/schedule',footballPage=fixture('football-schedule.html.gz');
assert.equal(oklahomaStateScheduleGames(footballPage).length,12,'every published game is decoded once (the next-game widget repeats UCF)');
const football=worker.parseHtml(footballPage,school,'Football',footballUrl,now),footballFinals=football.filter(e=>e.status==='Final');
assert.equal(football.filter(e=>e.status!=='Final').length,8,'upcoming games are unchanged');
// Published start times, as K-State shows them; TBA games stay date-only.
const ucf=football.find(e=>e.opponent==='UCF');
assert.equal(ucf.start_time,'2026-10-10T11:00:00.000Z');assert.equal(ucf.display_time,'Oct 10, 11:00 AM');
assert.ok(football.filter(e=>e.status!=='Final'&&e.opponent!=='UCF').every(e=>/T12:00:00\.000Z$/.test(e.start_time)&&!/,/.test(e.display_time)),'TBA games have no invented time');
for(const [date,time,expected] of [
  ['2026-09-05T14:45:00','2:45 p.m. CT',['2026-09-05T14:45:00.000Z','Sep 5, 2:45 PM']],
  ['2026-09-12T11:00:00','11 a.m. CT',['2026-09-12T11:00:00.000Z','Sep 12, 11:00 AM']],
  ['2026-10-11T11:30:00','11:30 AM (CDT)',['2026-10-11T11:30:00.000Z','Oct 11, 11:30 AM']],
  ['2026-10-17T00:00:00','TBA',null],['2026-10-17T19:00:00','6 p.m. CT',null],['bad','7 p.m.',null]
])assert.deepEqual(oklahomaStateStartTime(date,time)&&[oklahomaStateStartTime(date,time).start_time,oklahomaStateStartTime(date,time).display_time],expected,`start time ${date} ${time}`);
assert.deepEqual(footballFinals.map(e=>[e.opponent,e.headline,e.school_score,e.opponent_score]),[
  ['West Virginia','W, 41-24','41','24'],['Murray State','W, 59-0','59','0'],['Oregon','W, 39-31','39','31'],['Tulsa','L, 10-24','10','24']
]);
assert.ok(footballFinals.every(e=>e.results.length===1&&e.results[0].label==='Result'&&e.results[0].value===e.headline),'one Result row, as K-State shows');
assert.equal(footballFinals.find(e=>e.opponent==='Tulsa').recap_url,'https://okstate.com/news/2026/9/5/cowboy-football-tulsa-spoils-morris-debut');
assert.ok(footballFinals.every(e=>/^https:\/\/okstate\.com\/news\/2026\/9\/\d+\/cowboy-football-/.test(e.recap_url)),'every final links its own official recap');
const payloadHandlers=createOklahomaStateHandlers({slug:value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')});
const bare=()=>worker.parseHtml(footballPage.replace(/<script\b[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,''),school,'Football',footballUrl,now).filter(e=>e.status==='Final');
assert.deepEqual(bare().map(e=>e.headline),['41-24','59-0','39-31','10-24'],'without page data the cards keep their previous output');
for(const [target,sport,url] of [[{id:'kstate'},'Football',footballUrl],[school,'Soccer',footballUrl],[school,'Football','https://example.org/sports/football/schedule']]){
  const events=bare().map(e=>({...e}));
  assert.deepEqual(payloadHandlers.enrichScheduleEvents(events,footballPage,target,sport,url),bare(),'other schools, sports not yet verified, and unofficial hosts are unchanged');
}

// Soccer: published start times; results keep the K-State format they had.
const soccer=worker.parseHtml(fixture('soccer-schedule.html.gz'),school,'Soccer','https://okstate.com/sports/womens-soccer/schedule',now);
const soccerUpcoming=soccer.filter(e=>e.status!=='Final'),soccerFinals=soccer.filter(e=>e.status==='Final');
assert.equal(soccerUpcoming.length,13);assert.equal(soccerFinals.length,12);
assert.deepEqual(soccerUpcoming.filter(e=>/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),[
  'Arizona Oct 2, 7:00 PM','Texas Tech Oct 8, 7:00 PM','UCF Oct 11, 11:30 AM','Arizona State Oct 16, 7:00 PM',
  'Utah Oct 22, 7:00 PM','West Virginia Oct 25, 1:00 PM','Iowa State Oct 29, 6:00 PM','Colorado Nov 5, 8:00 PM'
]);
assert.equal(soccerUpcoming.find(e=>e.opponent==='Arizona').start_time,'2026-10-02T19:00:00.000Z');
assert.ok(soccerUpcoming.filter(e=>e.opponent==='TBD').every(e=>!/,/.test(e.display_time)),'TBA postseason dates have no invented time');
assert.deepEqual(soccerFinals.slice(0,3).map(e=>e.headline),['L, 0-1','L, 1-2','W, 3-1'],'soccer results are unchanged');

// Softball: published start times; "Time TBA" stays date-only.
const softball=worker.parseHtml(fixture('softball-schedule.html.gz'),school,'Softball','https://okstate.com/sports/softball/schedule',now);
assert.deepEqual(softball.filter(e=>e.status!=='Final').map(e=>`${e.opponent} ${e.display_time}`),[
  'Seminole State Sep 30, 6:00 PM','Wichita State Oct 4','Oklahoma Christian Oct 7, 6:00 PM','Langston Oct 11',
  'Oklahoma Baptist Oct 13, 6:00 PM','Arkansas Oct 17','Murray State Oct 27, 6:00 PM'
]);
assert.deepEqual(softball.filter(e=>e.status==='Final').map(e=>e.headline),['W, 6-0'],'softball result is unchanged');

// Baseball: 16 of 60 games have published times; TBA games stay date-only.
const baseball=worker.parseHtml(fixture('baseball-schedule.html.gz'),school,'Baseball','https://okstate.com/sports/baseball/schedule',now);
assert.equal(baseball.length,60);
const timedBaseball=baseball.filter(e=>/,/.test(e.display_time));
assert.equal(timedBaseball.length,16);
assert.deepEqual(timedBaseball.slice(0,3).map(e=>`${e.opponent} ${e.display_time}`),['Texas State Feb 24, 6:00 PM','Iowa Feb 26, 11:00 AM','Oregon Feb 27, 3:00 PM']);
assert.equal(timedBaseball.find(e=>e.opponent==='Utah'&&e.start_time.startsWith('2027-04-09')).display_time,'Apr 9, 7:00 PM');
assert.ok(baseball.filter(e=>!/,/.test(e.display_time)).every(e=>/T12:00:00\.000Z$/.test(e.start_time)),'TBA games have no invented time');

// Basketball (men's page): published start times; TBD games stay date-only.
const mensBasketball=worker.parseHtml(fixture('mens-basketball-schedule.html.gz'),school,'Basketball','https://okstate.com/sports/mens-basketball/schedule',now);
assert.equal(mensBasketball.length,50);
assert.deepEqual(mensBasketball.filter(e=>e.status!=='Final'&&/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),[
  'New Mexico Oct 11, 2:00 PM','Tulsa Oct 23, 2:30 PM','Wisconsin Oct 27, 6:00 PM','Minnesota Nov 20, 11:30 AM','Virginia Tech Nov 22, 2:30 PM'
]);
assert.deepEqual(mensBasketball.filter(e=>e.status==='Final').map(e=>e.headline),['W, 100-92','W, 120-92','W, 94-88'],'results are unchanged');

// Wrestling: published times only; TBA, "All Day" and blank times stay date-only.
const wrestling=worker.parseHtml(fixture('wrestling-schedule.html.gz'),school,'Wrestling','https://okstate.com/sports/wrestling/schedule',now);
assert.equal(wrestling.length,17);
assert.deepEqual(wrestling.filter(e=>/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),[
  'OSU Invite Nov 1, 10:00 AM','Drexel Nov 8, 2:00 PM','Nebraska Nov 13, 7:00 PM','Arizona State Nov 20, 7:00 PM','Missouri Jan 10, 2:00 PM',
  'West Virginia Jan 17, 2:00 PM','Northern Iowa Jan 29, 7:00 PM','Iowa State Jan 31, 2:00 PM','Utah Valley Feb 13, 7:00 PM'
]);
assert.equal(wrestling.find(e=>e.opponent==='Wyoming').display_time,'Feb 12','a date-field time without published time text is not shown');

// Equestrian: only TCU and Baylor have published times (12 p.m.).
const equestrian=worker.parseHtml(fixture('equestrian-schedule.html.gz'),school,'Equestrian','https://okstate.com/sports/equestrian/schedule',now);
assert.equal(equestrian.length,13);
assert.deepEqual(equestrian.filter(e=>e.start_time>='2026-10'&&/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),['TCU Oct 30, 12:00 PM','Baylor Nov 13, 12:00 PM']);
assert.equal(worker.groupEvents(equestrian,now)[0].upcoming.length,12,'the past intrasquad is not listed as upcoming');

// Golf: the published team placing in K-State's wording ("7th of 16").
// okstate.com publishes no team score on the schedule, so none is added.
for(const [value,expected] of [['7th/16','7th of 16'],['9th out of 12 teams','9th of 12'],['T3rd of 10','T3rd of 10'],['1st/12','1st of 12'],['Completed',null],['',null]])assert.equal(oklahomaStatePlacing(value),expected,`placing ${value}`);
const golfFinals=[];
for(const [division,label,count] of [['mens',"Men's",12],['womens',"Women's",12]]){
  const events=worker.parseHtml(fixture(`${division}-golf-schedule.html.gz`),school,'Golf',`https://okstate.com/sports/${division}-golf/schedule`,now);
  assert.equal(events.filter(e=>e.status!=='Final').length,count,`${label} upcoming golf events are unchanged`);
  golfFinals.push(...events.filter(e=>e.status==='Final'));
}
assert.deepEqual(golfFinals.map(e=>[e.opponent,e.headline]),[
  ['Ben Hogan Collegiate','7th of 16'],['Fighting Illini Invitational','5th of 15'],['Sahalee Players Championship','1st of 12'],
  ['Schooner Fall Classic','6th of 16'],['Folds of Honor Collegiate','9th of 12']
]);
assert.ok(golfFinals.every(e=>e.results.length===1&&e.results[0].label==='Result'&&e.results[0].value===e.headline&&/^https:\/\/okstate\.com\/news\//.test(e.recap_url)));

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

console.log('Oklahoma State module checks passed: 11 routes, shared XC/track split, empty Track & Field schedule as 200 [], Football W/L results, recaps and start times from page data, Soccer, Softball, Baseball, Basketball, Wrestling and Equestrian start times, Golf placings in the K-State wording, both Tennis/Golf divisions, official roster athletes.');
