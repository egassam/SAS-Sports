import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {kstateSchool,createKStateHandlers} from '../src/schools/kstate.mjs';
import {kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../src/schools/kansas.mjs';
import {oklahomaStateSchool,createOklahomaStateHandlers} from '../src/schools/oklahoma-state.mjs';
import {utahSchool,createUtahHandlers} from '../src/schools/utah.mjs';
import {arizonaStateSchool,createArizonaStateHandlers} from '../src/schools/arizona-state.mjs';
import {byuSchool,createByuHandlers} from '../src/schools/byu.mjs';
import {ucfSchool,createUcfHandlers} from '../src/schools/ucf.mjs';
import {arizonaSchool,createArizonaHandlers} from '../src/schools/arizona.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='utah');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official recaps served from fixtures; any other request fails the test.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,headers:new Map([['content-type','text/html']]),text:async()=>body};
};
const deps={createSourceFetch,SOURCE_TTL,kstateSchool,createKStateHandlers,kansasSchool,createKansasHandlers,isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments,oklahomaStateSchool,createOklahomaStateHandlers,utahSchool,createUtahHandlers,arizonaStateSchool,createArizonaStateHandlers,byuSchool,createByuHandlers,ucfSchool,createUcfHandlers,arizonaSchool,createArizonaHandlers,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,teamLabelForSource,parseHtml,attachOfficialMeetResults,attachOfficialHighlights,fetchUrl,groupEvents,mergeEvents};')(...Object.values(deps));

// Module ownership: every sponsored sport has explicit official utahutes.com routes.
const sports=sponsoredSports.utah;
assert.equal(sports.length,15);
for(const [name,map] of [['schedule',utahSchool.scheduleUrls],['roster',utahSchool.rosterUrls]]){
  assert.deepEqual(Object.keys(map).map(key=>key.split('|')[1]).sort(),[...sports].sort(),`every sponsored sport needs a ${name} route`);
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('utah|'),'module keys must carry the exact school identity');
    for(const url of [].concat(value))assert.equal(new URL(url).hostname,'utahutes.com',`${key} must stay on utahutes.com`);
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(utahSchool.scheduleUrls[`utah|${sport}`]),`${sport} schedule must come from the module`);
  assert.deepEqual(worker.rosterUrls(school,sport),[].concat(utahSchool.rosterUrls[`utah|${sport}`]),`${sport} roster must come from the module`);
}
assert.ok(!/'utah\|/.test(read('../src/index.js')),'Utah configuration must live in its module, not shared code');
// Program combinations: Tennis joins Basketball and Swimming & Diving (Utah
// publishes separate men's and women's tennis pages).
assert.deepEqual([...worker.schoolCombinedSports(school)].sort(),['Basketball','Swimming & Diving','Tennis']);
assert.equal(worker.teamLabelForSource(school,'Basketball','https://utahutes.com/sports/womens-basketball/schedule'),"Women's");
assert.ok(!worker.schoolCombinedSports(schools.find(s=>s.id==='kstate')).has('Swimming & Diving'),'other schools keep their own combination policy');

// Football: the official page's game data supplies K-State's result format
// and each game's exact recap; the rendered cards show only the two scores.
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/utah-module/'+name,import.meta.url))).toString('utf8');
const footballUrl='https://utahutes.com/sports/football/schedule',now=new Date('2026-09-30T16:00:00Z');
const football=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now);
const finals2026=football.filter(e=>e.status==='Final'&&e.start_time.startsWith('2026'));
assert.deepEqual(finals2026.map(e=>[e.opponent,e.headline,e.school_score,e.opponent_score]),[
  ['Iowa State','W, 31-17','31','17'],['Utah State','W, 33-0','33','0'],['Arkansas','W, 43-10','43','10'],['Idaho','W, 66-14','66','14']
]);
assert.ok(finals2026.every(e=>e.results.length===1&&e.results[0].value===e.headline&&/^https:\/\/utahutes\.com\/news\/2026\/9\/\d+\/football-/.test(e.recap_url)),'every final has one Result row and its own official recap');
const upcoming=football.filter(e=>e.status!=='Final');
assert.equal(upcoming.length,9,'upcoming games are unchanged');
assert.deepEqual(upcoming.filter(e=>/,/.test(e.display_time)).map(e=>`${e.opponent} ${e.display_time}`),['Kansas Oct 10, 8:15 PM','West Virginia Nov 27, 7:00 PM','Big 12 Championship Game Dec 4, 6:00 PM']);
const bare=worker.parseHtml(fixture('football-schedule.html.gz').replace(/<script\b[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,''),school,'Football',footballUrl,now);
assert.deepEqual(bare.filter(e=>e.status==='Final'&&e.start_time.startsWith('2026')).map(e=>e.headline),['31-17','33-0','43-10','66-14'],'without page data the cards keep their previous output');
const soccerSame=worker.parseHtml(fixture('football-schedule.html.gz'),school,'Soccer',footballUrl,now).filter(e=>e.status==='Final'&&e.start_time.startsWith('2026'));
assert.deepEqual(soccerSame.map(e=>e.headline),['31-17','33-0','43-10','66-14'],'sports not yet verified are unchanged');

// Cross Country: each final meet's official recap publishes Utah's results
// table(s); rows follow K-State's contract (team row first, then each runner).
const xcUrl='https://utahutes.com/sports/cross-country/schedule';
const xcRaw=fixture('cross-country-schedule.html.gz');
const recapBase='https://utahutes.com/news/2026/9/';
const uvuRecap=recapBase+'4/utah-cross-country-places-third-in-season-opener-at-uvu-invitational';
const mcnicholsRecap=recapBase+'19/vringer-paces-no-20-utah-cross-country-to-runner-up-finish-at-john-mcnichols-invitational';
recapFixtures.set(uvuRecap,fixture('xc-recap-uvu-invitational.html.gz'));
recapFixtures.set(mcnicholsRecap,fixture('xc-recap-john-mcnichols-invitational.html.gz'));
const xcFinals=()=>worker.parseHtml(xcRaw,school,'Cross Country',xcUrl,now).filter(e=>e.status==='Final');
const xc=xcFinals();
assert.deepEqual(xc.map(e=>[e.opponent,e.headline]),[['John McNichols Invitational','2nd / 28'],['Beehive Invitational','No Score'],['UVU Invitational','3rd / 8']],'schedule cards before results');
await Promise.all(xc.map(e=>worker.attachOfficialMeetResults(e)));
const [mcnichols,beehive,uvu]=xc;
assert.deepEqual(uvu.results,[
  {group:"Women's",participant:'Utah team',result:'3rd · 76 pts'},
  {group:"Women's",participant:'Mackenzie Rogers',result:'13th · 16:44.82'},
  {group:"Women's",participant:'Bri Rinn',result:'18th · 17:02.26'},
  {group:"Women's",participant:'Zoey Nilsson',result:'23rd · 17:27.74'},
  {group:"Women's",participant:'Brielle Nilsson',result:'27th · 17:37.82'},
  {group:"Women's",participant:'Piper Simpson',result:'28th · 17:38.90'},
  {group:"Women's",participant:'Allie Bruce',result:'40th · 18:09.41'},
  {group:"Women's",participant:'Lauren Ayers',result:'47th · 18:28.22'}
]);
assert.equal(uvu.headline,"Women's team: 3rd · 76 pts");
assert.equal(uvu.source.url,uvuRecap);
assert.ok(uvu.meet_results_verified&&uvu.highlights_verified&&uvu.result_count===8&&uvu.has_more_results);
assert.deepEqual(uvu.highlights,["Utah's women's team finished 3rd with 76 pts.","Mackenzie Rogers led Utah in the women's race, finishing 13th in 16:44.82."]);
assert.equal(mcnichols.headline,"Women's team: 2nd · 107 pts");
assert.deepEqual(mcnichols.results.map(r=>`${r.group}|${r.participant}|${r.result}`),[
  "Women's|Utah team|2nd · 107 pts","Women's|Erin Vringer|10th · 20:12.6","Women's|Annastasia Peters|21st · 20:36.3",
  "Women's|Tayla Gunton|23rd · 20:42.4","Women's|Josie Fale|26th · 20:44.8","Women's|Millie Wilcox|27th · 20:46.7",
  "Women's|Bri Rinn|41st · 20:59.5","Women's|Mackenzie Rogers|63rd · 21:22.5","Women's|Marika Couture|73rd · 21:31.4",
  "Women's Open|Piper Simpson|14th · 22:11.3","Women's Open|Zoey Nilsson|31st · 22:40.5"
],'championship race first, then the open race; the alumna\'s result elsewhere is not a Utah row');
// The Beehive recap is not a fixture: its fetch fails, so the card keeps the
// schedule's own result and is marked partial rather than guessed.
assert.deepEqual([beehive.headline,beehive.results,beehive.meet_results_verified,beehive.highlight_state],['No Score',[{label:'Result',value:'No Score'}],false,'official_results_partial']);
// Expanded view: same rows, no refetch once verified.
const before=requests.length;
const expanded=xcFinals(),target=expanded.find(e=>e.opponent==='UVU Invitational');
await worker.attachOfficialHighlights(expanded,xcRaw,school,'Cross Country',xcUrl,now,null,target.id);
assert.deepEqual(target.results,uvu.results,'expanded view matches the feed');
await worker.attachOfficialMeetResults(target);
assert.equal(requests.length,before+1,'a verified meet is not fetched again');
// A recap for a different meet on the same card is rejected.
const wrong=xcFinals().find(e=>e.opponent==='UVU Invitational');wrong.recap_url=mcnicholsRecap;
await worker.attachOfficialMeetResults(wrong);
assert.deepEqual([wrong.headline,wrong.meet_results_verified],['3rd / 8',false]);

// Beach Volleyball: the real page (womens-beach-volleyball) still shows the
// 2025 spring season. Past seasons are not current: the page is a valid empty
// schedule, so the app shows its empty-schedule note instead of old matches.
assert.deepEqual(worker.candidateUrls(school,'Beach Volleyball'),['https://utahutes.com/sports/womens-beach-volleyball/schedule'],'no fallback to the site-wide ticker');
const beachUrl='https://utahutes.com/sports/womens-beach-volleyball/schedule',beachRaw=fixture('beach-volleyball-schedule.html.gz');
assert.equal(worker.parseHtml(beachRaw,school,'Beach Volleyball',beachUrl,new Date('2025-04-01T12:00:00Z')).filter(e=>e.start_time.startsWith('2025')).length>=30,true,'in its own season the matches are kept');
const beachNow=worker.parseHtml(beachRaw,school,'Beach Volleyball',beachUrl,now);
assert.deepEqual(beachNow,[],'no 2025 matches in the 2026-27 season, and no indoor matches from the site-wide ticker');
assert.equal(worker.parseHtml(beachRaw,school,'Volleyball','https://utahutes.com/sports/womens-volleyball/schedule',now).length>0,true,'indoor Volleyball keeps its own parsing');
recapFixtures.set(beachUrl,beachRaw);
const beachSource=await worker.fetchUrl(beachUrl,school,'Beach Volleyball',now);
assert.equal(beachSource.empty_schedule,true,'an official page with only a past season is an empty schedule');
// A slug utahutes.com does not have renders an empty template: no events.
assert.deepEqual(worker.parseHtml(fixture('missing-sport-template.html.gz'),school,'Beach Volleyball',beachUrl,now),[]);
// Other sports on Utah pages are not season-filtered by this rule.
assert.equal(worker.parseHtml(fixture('football-schedule.html.gz'),school,'Football',footballUrl,now).length,football.length);

// Lacrosse: Utah's only page is mens-lacrosse, which still shows the 2026
// spring season (2025-26). It is not current in 2026-27: empty schedule.
assert.deepEqual(worker.candidateUrls(school,'Lacrosse'),['https://utahutes.com/sports/mens-lacrosse/schedule']);
const laxUrl='https://utahutes.com/sports/mens-lacrosse/schedule',laxRaw=fixture('lacrosse-schedule.html.gz');
const laxSpring=worker.parseHtml(laxRaw,school,'Lacrosse',laxUrl,new Date('2026-05-02T12:00:00Z')).filter(e=>e.status==='Final');
assert.ok(laxSpring.length>=13&&laxSpring.some(e=>e.opponent==='Air Force'),'in its own season the games are kept');
assert.deepEqual(worker.parseHtml(laxRaw,school,'Lacrosse',laxUrl,now),[],'no 2026 spring games in the 2026-27 season');
recapFixtures.set(laxUrl,laxRaw);
assert.equal((await worker.fetchUrl(laxUrl,school,'Lacrosse',now)).empty_schedule,true);

// Skiing: the real page is alpine-skiing (the old slug is the empty
// template, which made the feed 502). Each race is labeled with its meet.
assert.deepEqual(worker.candidateUrls(school,'Skiing'),['https://utahutes.com/sports/alpine-skiing/schedule']);
const skiUrl='https://utahutes.com/sports/alpine-skiing/schedule',skiRaw=fixture('skiing-schedule.html.gz');
const ski=worker.parseHtml(skiRaw,school,'Skiing',skiUrl,now);
assert.equal(ski.length,31,'all 31 races of the 2027 season');
assert.ok(ski.every(e=>e.status==='Upcoming'&&e.start_time.startsWith('2027')));
assert.deepEqual(ski.slice(0,5).map(e=>`${e.display_time} ${e.opponent}`),[
  'Jan 2 Utah Invitational · 10K Freestyle (I)','Jan 4 Utah Invitational · Classic Sprints',
  'Jan 6 RMISA Qualifiers · 20K Classic (M)','Jan 7 RMISA Qualifiers · Freestyle Sprints',
  'Jan 15 Denver Invitational · Giant Slalom'
]);
assert.ok(ski.every(e=>e.title.endsWith(e.opponent)&&/ · /.test(e.opponent)),'every race names its meet');
assert.equal(new Set(ski.map(e=>e.id)).size,31,'race ids stay unique');
// The page served to the Worker also lists last season's finals (March
// 2026) outside its schedule data; they are not current.
const lastSeason='<a aria-label="Completed Event: Skiing vs Slalom on March 13, 2026, , 2nd">x</a><a aria-label="Completed Event: Skiing vs 20K Freestyle (M) on March 14, 2026, , 1st">x</a>';
assert.ok(worker.parseHtml(lastSeason,school,'Skiing','https://example.com/',now).length===2,'the injected labels parse as finals');
assert.deepEqual(worker.parseHtml(skiRaw.replace('</body>',lastSeason+'</body>'),school,'Skiing',skiUrl,now).map(e=>e.id),ski.map(e=>e.id),'last season is not current');

// Golf: Utah's only page is mens-golf, which lists each round day. K-State
// shows one event per tournament; the page publishes no placings.
assert.deepEqual(worker.candidateUrls(school,'Golf'),['https://utahutes.com/sports/mens-golf/schedule']);
const golfUrl='https://utahutes.com/sports/mens-golf/schedule',golfRaw=fixture('golf-schedule.html.gz'),golfNow=new Date('2026-09-30T18:00:00Z');
const golf=worker.parseHtml(golfRaw,school,'Golf',golfUrl,golfNow);
assert.deepEqual(golf.map(e=>`${e.status} ${e.display_time} ${e.opponent}`),[
  'Today Sep 30 Mark Simpson Collegiate','Upcoming Oct 5 Hamptons Intercollegiate','Upcoming Oct 12 Big 12 Match Play',
  'Upcoming Oct 18 Williams Cup','Upcoming Feb 11 John Burns Collegiate','Upcoming Feb 28 Las Vegas Collegiate',
  'Upcoming Mar 15 Black Desert Collegiate','Upcoming Mar 19 The Schenkel','Upcoming Apr 16 The Thunderbird',
  'Upcoming Apr 26 Big 12 Championships','Upcoming May 15 NCAA Regionals','Upcoming May 28 NCAA Championships',
  'Final Sep 14 Jackson Stephens Cup'
],'one event per tournament');
const stephens=golf.at(-1),simpson=golf[0];
assert.equal(stephens.recap_url,'https://utahutes.com/news/2026/9/16/mens-golf-utah-golf-ties-for-second-place-in-match-play','the final round\'s recap');
assert.equal(stephens.id,'live-utah-golf-sep-14-2026-jackson-stephens-cup-final');
assert.deepEqual([simpson.headline,simpson.recap_url,simpson.results],[null,undefined,[]],'a tournament in progress has no result yet');
assert.equal(new Set(golf.map(e=>e.id)).size,golf.length);
const golfGroup=worker.groupEvents(golf,golfNow)[0];
assert.deepEqual([golfGroup.results.length,golfGroup.upcoming.length,golfGroup.upcoming[0].opponent],[1,12,'Mark Simpson Collegiate'],'the tournament in progress is listed');

// Tennis: both official team pages, each event labeled by team.
assert.deepEqual(worker.candidateUrls(school,'Tennis'),['https://utahutes.com/sports/womens-tennis/schedule','https://utahutes.com/sports/mens-tennis/schedule']);
const mensTennisUrl='https://utahutes.com/sports/mens-tennis/schedule',mensTennisRaw=fixture('mens-tennis-schedule.html.gz');
recapFixtures.set(mensTennisUrl,mensTennisRaw);
const mensTennis=await worker.fetchUrl(mensTennisUrl,school,'Tennis',now);
assert.equal(mensTennis.events.length,22,'all 22 men\'s events');
assert.ok(mensTennis.events.every(e=>e.team_label==="Men's"&&e.title.startsWith("Men's · ")),'men\'s events are labeled');
assert.equal(worker.teamLabelForSource(school,'Tennis','https://utahutes.com/sports/womens-tennis/schedule'),"Women's");
assert.equal(worker.teamLabelForSource(schools.find(s=>s.id==='kstate'),'Tennis','https://www.kstatesports.com/sports/womens-tennis/schedule'),null,'other schools keep their own policy');

// Volleyball: published start times from the page data (the rendered cards
// show a time for only some games). Results are unchanged.
const vbUrl='https://utahutes.com/sports/womens-volleyball/schedule',vbRaw=fixture('volleyball-schedule.html.gz');
const vb=worker.parseHtml(vbRaw,school,'Volleyball',vbUrl,now);
const vbUpcoming=vb.filter(e=>e.status!=='Final');
assert.equal(vbUpcoming.length,18);
assert.ok(vbUpcoming.every(e=>/, \d{1,2}:\d{2} [AP]M$/.test(e.display_time)),'every upcoming match shows its start time');
assert.deepEqual(vbUpcoming.slice(2,7).map(e=>`${e.display_time} ${e.opponent}`),['Oct 1, 5:00 PM #19 Kansas','Oct 3, 5:30 PM Kansas State','Oct 8, 7:00 PM West Virginia','Oct 15, 7:00 PM #22 BYU','Oct 17, 1:00 PM Iowa State']);
assert.equal(vbUpcoming.find(e=>e.opponent==='UCF').start_time,'2026-11-27T11:30:00.000Z','local wall clock, as for Football');
const vbBare=worker.parseHtml(vbRaw.replace(/<script\b[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,''),school,'Volleyball',vbUrl,now);
assert.deepEqual(vb.filter(e=>e.status==='Final').map(e=>[e.id,e.headline,e.recap_url]),vbBare.filter(e=>e.status==='Final').map(e=>[e.id,e.headline,e.recap_url]),'results are unchanged');

// Soccer: published start times from the page data; postseason placeholders
// have no published time and keep their date only.
const socUrl='https://utahutes.com/sports/womens-soccer/schedule',socRaw=fixture('soccer-schedule.html.gz');
const soc=worker.parseHtml(socRaw,school,'Soccer',socUrl,now),socUpcoming=soc.filter(e=>e.status!=='Final');
assert.deepEqual(socUpcoming.map(e=>e.display_time),['Oct 1, 5:00 PM','Oct 8, 5:00 PM','Oct 11, 10:00 AM','Oct 16, 7:00 PM','Oct 22, 6:00 PM','Oct 25, 12:00 PM','Oct 30, 7:00 PM','Nov 5, 7:00 PM','Nov 9','Nov 20','Nov 26','Dec 4','Dec 10']);
const socBare=worker.parseHtml(socRaw.replace(/<script\b[^>]*id="__NUXT_DATA__"[\s\S]*?<\/script>/,''),school,'Soccer',socUrl,now);
assert.deepEqual(soc.filter(e=>e.status==='Final').map(e=>[e.id,e.headline,e.recap_url]),socBare.filter(e=>e.status==='Final').map(e=>[e.id,e.headline,e.recap_url]),'results are unchanged');

// Softball: the Oct 11 doubleheader is two games. Both survive the shared
// merge, labeled Game 1 and Game 2 with their published times.
const sbUrl='https://utahutes.com/sports/softball/schedule',sbRaw=fixture('softball-schedule.html.gz');
const sb=worker.mergeEvents([worker.parseHtml(sbRaw,school,'Softball',sbUrl,now)]);
assert.deepEqual(worker.groupEvents(sb,now)[0].upcoming.map(e=>`${e.display_time} ${e.title}`),[
  'Oct 1, 4:00 PM Utah vs Utah Valley','Oct 2, 4:00 PM Utah vs Weber State','Oct 7, 6:30 PM Utah vs Utah State',
  'Oct 11, 1:00 PM Utah vs Southern Utah · Game 1','Oct 11, 3:00 PM Utah vs Southern Utah · Game 2'
]);
assert.equal(new Set(sb.map(e=>e.id)).size,5);
assert.equal(worker.parseHtml(sbRaw,school,'Soccer',sbUrl,now).some(e=>e.game_number),false,'only Softball and Baseball split doubleheaders');

// Every route is a sport page the official site itself links to. A slug the
// site lacks renders SIDEARM's empty template, whose site-wide ticker put
// other sports' events on the wrong sport; the homepage has the same ticker.
// The site's menu links (/sports/<slug>/) and its sport list in the page data
// ("wbvball","womens-beach-volleyball","beachvb","Beach Volleyball").
const sitePage=fixture('lacrosse-schedule.html.gz');
const siteSlugs=new Set([...sitePage.matchAll(/\/sports\/([a-z][a-z0-9-]+)\//g),...sitePage.matchAll(/"[a-z]+","([a-z][a-z0-9]*(?:-[a-z0-9]+)+)","[a-z0-9]+","[A-Z][^"]{2,40}"/g)].map(m=>m[1]));
for(const [name,map] of [['schedule',utahSchool.scheduleUrls],['roster',utahSchool.rosterUrls]]){
  for(const [key,urls] of Object.entries(map)){
    for(const url of [].concat(urls)){
      const m=url.match(/^https:\/\/utahutes\.com\/sports\/([a-z0-9-]+)\/(?:schedule|roster)$/);
      assert.ok(m,`${key} ${name} route must be an official sport page, not ${url}`);
      assert.ok(siteSlugs.has(m[1]),`${key} ${name} route uses /sports/${m[1]}/, which utahutes.com does not link to`);
    }
  }
}

console.log('Utah module checks passed: 15 sports route to utahutes.com through the module, no Utah configuration in shared code, program combinations (Tennis now combined), Football W/L results, recaps and start times from page data, Cross Country race results from official recaps, Beach Volleyball and Lacrosse routes and past-season empty schedules, Skiing route and meet names, Golf route and one event per tournament, both Tennis teams, Volleyball and Soccer start times, Softball doubleheaders, every route an official sport page.');
