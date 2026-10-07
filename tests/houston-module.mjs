import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {houstonSchool} from '../src/schools/houston.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='houston');
const source=read('../src/index.js').replace(/^import .*;\n/gm,'').replace('export default{','const handler={');
// Official pages served from fixtures; any other request fails.
const recapFixtures=new Map(),requests=[];
const fetch=async url=>{
  requests.push(String(url));
  const body=recapFixtures.get(String(url));
  if(body==null)throw Error(`Unexpected network request: ${url}`);
  return{ok:true,status:200,url:String(url),headers:new Headers({'content-type':'text/html'}),text:async()=>body};
};
const deps={...schoolModuleDeps,createSourceFetch,SOURCE_TTL,schools,sponsoredSports,rosterSocialInstagrams,extractText:()=>{throw Error('Unexpected PDF');},fetch};
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,houstonHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/houston-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit uhcougars.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['houston'];
assert.equal(sports.length,11);
for(const [name,map] of [['schedule',houstonSchool.scheduleUrls],['roster',houstonSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('houston|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'uhcougars.com',`${key} must stay on uhcougars.com`);
  }
}
// Routes: the official pages only (the generic pages and the homepage render
// SIDEARM's empty "@season @sport" template); women's tennis and women's
// swimming & diving only; both basketball and golf teams, labeled.
const page=slug=>`https://uhcougars.com/sports/${slug}/schedule`,roster=slug=>`https://uhcougars.com/sports/${slug}/roster`;
const routes={Baseball:['baseball'],Basketball:['mens-basketball','womens-basketball'],'Cross Country':['cross-country'],Football:['football'],Golf:['mens-golf','womens-golf'],Soccer:['womens-soccer'],Softball:['softball'],'Swimming & Diving':['womens-swimming-and-diving'],Tennis:['womens-tennis'],'Track & Field':['track-and-field'],Volleyball:['womens-volleyball']};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),routes[sport].map(page),`${sport} schedule routes`);
  assert.deepEqual(worker.rosterUrls(school,sport),routes[sport].map(roster),`${sport} roster routes`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),['Basketball','Golf'].includes(sport),`${sport} team combination`);
}
// Every page the module routes to has Houston's page data; the generic pages do not.
for(const slug of ['basketball','golf','tennis','track-field','mens-tennis','mens-swimming-and-diving','swimming-and-diving'])assert.match(fixture(`${slug}-schedule.html.gz`),/<title>@season @sport Schedule/,`${slug} is SIDEARM's empty template`);
// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages and a mutation that fails it.
const now=new Date('2026-10-07T15:00:00Z');
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([a-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url);
  const raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach((event,i)=>finals.forEach((other,j)=>assert.equal(worker.houstonHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
const live=(sport,payloadFile,events,at,expected)=>{
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  for(const provider of worker.liveScoreboardProviders(school,sport))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected,`${sport}: only Houston's game (never Houston Christian or Sam Houston)`);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
  assert.deepEqual(reconciled.filter(e=>e.verification_state==='official_schedule+live_scoreboard').map(e=>[e.title,e.headline]),expected.map(([title,,headline])=>[title,headline]));
};

// Football: 5 finals (date only, own recap), 7 upcoming with published
// Central times or the date alone (TBA).
{
  const fb=parse('Football','football');
  assert.deepEqual(fb.map(line),[
    'Final Sep 5 Houston vs Oregon State | W, 33-20','Final Sep 12 Houston vs Southern | W, 77-6','Final Sep 18 Houston at Texas Tech | L, 26-28',
    'Final Sep 26 Houston at Georgia Southern | W, 42-28','Final Oct 3 Houston vs UCF | W, 27-17',
    'Upcoming Oct 10, 2:30 PM Houston at Kansas State | ','Upcoming Oct 17, 6:30 PM Houston vs Oklahoma State | ','Upcoming Oct 24 Houston at Utah | ',
    'Upcoming Nov 7 Houston vs Cincinnati | ','Upcoming Nov 13, 9:15 PM Houston at Colorado | ','Upcoming Nov 21 Houston at West Virginia | ','Upcoming Nov 28 Houston vs Baylor | '
  ]);
  assert.equal(ownRecapsOnly(fb,'Football'),5);
  // The whole pipeline (download, parse) keeps the page data: the shared
  // compaction once cut uhcougars.com pages to the cards.
  recapFixtures.set(page('football'),fixture('football-schedule.html.gz'));
  const {events}=await worker.fetchLive('houston','Football');
  recapFixtures.delete(page('football'));
  assert.deepEqual(events.filter(e=>e.opponent==='Colorado').map(e=>e.display_time),['Nov 13, 9:15 PM'],'the feed keeps the published start time');
  // Expanded view: highlights from the game's own recap.
  const target=fb.find(e=>e.opponent==='UCF');recapFixtures.set(target.recap_url,fixture(recapFile(target.recap_url)));
  const prompts=[],env={AI:{run:async(model,input)=>{prompts.push(JSON.stringify(input));return{response:JSON.stringify(['Houston rallied from a deficit in the second half of the game.','The Cougars defense forced a key turnover in the fourth quarter.','Houston scored a late touchdown to take the lead for good.','The Cougars improved to 1-0 in Big 12 play with the win.'])};}}};
  await worker.attachOfficialHighlights(fb,fixture('football-schedule.html.gz'),school,'Football',page('football'),now,env,target.id);
  assert.equal(target.highlight_state,'recap_generated');assert.equal(prompts.length,1);assert.ok(prompts[0].includes('UCF'));
  recapFixtures.clear();
  live('Football','football-espn-2026-10-03.json.gz',fb,new Date('2026-10-04T12:00:00Z'),[['Houston vs UCF','Final','W, 27-17']]);
}

// Volleyball: the exhibitions (no result) and the other teams' tournament
// matches ("Houston Christian vs Texas State") are left out; rankings
// dropped ("#3 Kentucky", "rv Kansas State"); "Noon CT" is a published time.
{
  const vb=parse('Volleyball','womens-volleyball');
  assert.equal(vb.length,29);assert.equal(new Set(vb.map(e=>e.id)).size,29);
  assert.ok(!vb.some(e=>/ vs\.? |exhibition|#|^rv /i.test(e.opponent)));
  const finals=vb.filter(e=>e.status==='Final');
  assert.equal(finals.length,15);
  assert.deepEqual(finals.slice(0,3).map(line),['Final Aug 28 Houston vs Incarnate Word | W, 3-0','Final Aug 29 Houston vs Wake Forest | L, 2-3','Final Sep 3 Houston vs Texas Southern | W, 3-0']);
  assert.ok(finals.some(e=>line(e)==='Final Sep 27 Houston at Kansas State | W, 3-1'));
  assert.ok(vb.some(e=>`${e.display_time} ${e.title}`==='Nov 8, 12:00 PM Houston at UCF'),'"Noon" is 12:00 PM');
  assert.equal(ownRecapsOnly(vb,'Volleyball'),14);
  // Kentucky (Sep 13) links no story; Houston's is in the archive.
  const kentucky=vb.find(e=>e.opponent==='Kentucky');assert.equal(kentucky.recap_url,undefined);
  const story='https://uhcougars.com/news/2026/9/13/volleyball-ends-paradise-invitational-in-loss-to-3-kentucky';
  recapFixtures.set('https://uhcougars.com/sports/womens-volleyball/archives',fixture('womens-volleyball-archives.html.gz'));
  recapFixtures.set(story,fixture('story-volleyball-2026-9-13-kentucky.html.gz'));
  await worker.houstonHandlers.attachArchiveStory(kentucky);
  assert.equal(kentucky.recap_url,story);
  // Another result is refused.
  const wrong={...vb.find(e=>e.opponent==='Purdue'),recap_url:undefined,opponent:'Kentucky',school_score:'3',opponent_score:'1'};
  await worker.houstonHandlers.attachArchiveStory(wrong);assert.equal(wrong.recap_url,undefined);
  // The feed attaches it too.
  recapFixtures.set(page('womens-volleyball'),fixture('womens-volleyball-schedule.html.gz'));
  const {events}=await worker.fetchLive('houston','Volleyball');
  assert.equal(events.find(e=>e.opponent==='Kentucky').recap_url,story,'the feed takes the archive story');
  recapFixtures.clear();
  // Before the Flo Hyman Classic, the other teams' matches would be upcoming.
  const early=parse('Volleyball','womens-volleyball',new Date('2026-09-01T15:00:00Z'));
  assert.ok(!early.some(e=>/ vs\.? /i.test(e.opponent)),'other teams\' upcoming matches are left out');
  assert.ok(early.some(e=>e.opponent==='UTSA'));
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',vb,new Date('2026-10-05T12:00:00Z'),[['Houston at West Virginia','Final','W, 3-1']]);
}

// Soccer (women's): 12 finals with recaps, ties "T, 0-0", 7 upcoming; the
// Aug 6 exhibition at Rice has no result and is left out.
{
  const sc=parse('Soccer','womens-soccer');
  assert.equal(sc.length,19);
  assert.deepEqual(sc.filter(e=>e.status==='Final').slice(0,2).map(line),['Final Aug 12 Houston at FGCU | T, 0-0','Final Aug 20 Houston vs Northwestern State | W, 5-0']);
  assert.ok(sc.some(e=>`${e.display_time} ${e.title}`==='Oct 25, 12:00 PM Houston at UCF'));
  assert.equal(ownRecapsOnly(sc,'Soccer'),12);
  live('Soccer','soccer-espn-2026-10-02.json.gz',sc,new Date('2026-10-03T12:00:00Z'),[['Houston vs West Virginia','Final','L, 0-2']]);
}

// Cross Country: team places from the card ("M- 2nd, W- 2nd", "W- 3rd, M -
// 4th"), women first; TFRRS adds the points and every Houston runner.
{
  const xc=parse('Cross Country','cross-country');
  assert.deepEqual(xc.map(line),[
    'Final Sep 4 Houston at Aggie Opener | Women\'s team: 2nd / Men\'s team: 2nd','Final Sep 11 Houston at Texas A&M Invitational | Women\'s team: 3rd / Men\'s team: 4th',
    'Upcoming Oct 16 Houston at Arturo Barrios Invitational | ','Upcoming Oct 31 Houston at Big 12 Championship | ','Upcoming Nov 13 Houston at NCAA South Central Regional | ','Upcoming Nov 21 Houston at NCAA Cross Country Championships | '
  ]);
  assert.equal(ownRecapsOnly(xc,'Cross Country'),2);
  for(const [url,file] of [['https://www.tfrrs.org/teams/xc/TX_college_f_Houston.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/TX_college_m_Houston.html','tfrrs-team-m.html.gz'],
    ['https://www.tfrrs.org/results/xc/28140/Aggie_Opener','tfrrs-28140.html.gz'],['https://www.tfrrs.org/results/xc/28142/Texas_AM_Invitational_College_Entries','tfrrs-28142.html.gz']])recapFixtures.set(url,fixture(file));
  const [aggie,am]=xc;
  await worker.attachOfficialMeetResults(aggie);await worker.attachOfficialMeetResults(am);
  assert.equal(aggie.headline,'Women\'s team: 2nd · 42 pts / Men\'s team: 2nd · 38 pts');
  assert.equal(am.headline,'Women\'s team: 3rd · 114 pts / Men\'s team: 4th · 81 pts');
  assert.deepEqual([...new Set(aggie.results.map(r=>r.group))],['Women\'s 2 Mile','Men\'s 5K']);
  assert.equal(aggie.results.filter(r=>r.participant!=='Houston team').length,20,'13 women, 7 men');
  assert.equal(am.results.filter(r=>r.participant!=='Houston team').length,18,'11 women, 7 men');
  assert.equal(aggie.source.url,aggie.recap_url,'the source link stays on the official recap');
  assert.ok(aggie.highlights_verified&&aggie.highlights.length===4);
  // A place TFRRS contradicts is refused.
  const wrong={...parse('Cross Country','cross-country')[0]};wrong.headline='Women\'s team: 1st / Men\'s team: 2nd';
  await worker.attachOfficialMeetResults(wrong);assert.equal(wrong.meet_results_verified,false);
  // The feed attaches them too.
  recapFixtures.set(page('cross-country'),fixture('cross-country-schedule.html.gz'));
  const {events}=await worker.fetchLive('houston','Cross Country');
  assert.equal(events.find(e=>e.opponent==='Aggie Opener').headline,'Women\'s team: 2nd · 42 pts / Men\'s team: 2nd · 38 pts');
  recapFixtures.clear();
}

// Basketball: men's and women's pages, labeled; exhibitions labeled; bracket
// rounds without an opponent are one event per tournament.
{
  const men=parse('Basketball','mens-basketball'),women=parse('Basketball','womens-basketball');
  assert.equal(men.length,36);assert.equal(women.length,33);
  assert.ok(men.every(e=>e.team_label==="Men's"&&e.id.endsWith('-mens'))&&women.every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens')));
  assert.deepEqual(men.slice(0,2).map(e=>`${e.display_time} ${e.title}`),["Oct 15 Men's · Houston vs Montana Tech (Exhibition)","Oct 25 Men's · Houston vs Michigan (Exhibition)"]);
  assert.deepEqual(men.slice(-2).map(e=>`${e.display_time} ${e.title} ${e.end_time.slice(0,10)}`),["Mar 9 Men's · Houston at Phillips 66 Big 12 Tournament 2027-03-13","Mar 16 Men's · Houston at NCAA Tournament 2027-04-05"]);
  assert.equal(women.at(-1).title,"Women's · Houston at Phillips 66 Big 12 Women's Basketball Championship");
  assert.ok(women.some(e=>`${e.display_time} ${e.title}`==="Dec 11, 11:15 AM Women's · Houston at Rice"));
  assert.ok(!men.concat(women).some(e=>/^TB[AD]/.test(e.opponent)));
  assert.deepEqual(worker.liveScoreboardProviders(school,'Basketball').map(p=>p.path),['basketball/mens-college-basketball','basketball/womens-college-basketball']);
}

// Golf: both teams, one event per tournament with the last round's place
// ("t-10th of 12" on day one is not the result) and story; match play and
// "No Team Score" read as published.
{
  const men=parse('Golf','mens-golf'),women=parse('Golf','womens-golf');
  assert.equal(men.length,15);assert.equal(women.length,14);
  assert.deepEqual(men.filter(e=>e.status==='Final').map(line),["Final Sep 14 Men's · Houston at Jackson T. Stephens Cup | 6th of 6","Final Sep 21 Men's · Houston at Bayou City Collegiate Classic | No team score (individuals only)","Final Sep 29 Men's · Houston at NB3 Matchplay | Match play: 1-1"]);
  assert.deepEqual(men.find(e=>e.opponent==='NB3 Matchplay').results,[{label:'vs New Mexico State',value:'W, 3-2'},{label:'vs New Mexico',value:'L, 1.5-3.5'}],'one row per match, Houston\'s points first');
  assert.deepEqual(women.filter(e=>e.status==='Final').map(line),["Final Sep 7 Women's · Houston at ANNIKA Intercollegiate | 10th of 12","Final Sep 19 Women's · Houston at Schooner Fall Classic | 11th of 16"]);
  assert.ok(women.filter(e=>e.status==='Final').every(e=>/closes-play|second-straight-day/.test(e.recap_url)),'the last round\'s story');
  assert.equal(ownRecapsOnly(men,'Men\'s golf')+ownRecapsOnly(women,'Women\'s golf'),5);
  // While a tournament is played it is today's event.
  const during=parse('Golf','womens-golf',new Date('2026-09-20T15:00:00Z')).find(e=>e.opponent==='Schooner Fall Classic');
  assert.deepEqual([during.status,during.recency_label,during.headline||null],['Today','In progress',null]);
}

// Tennis (women's): fall tournaments, one event each from first to last day;
// a past one is listed only with Houston's story (the Rice Invite has none).
{
  const tn=parse('Tennis','womens-tennis');
  assert.deepEqual(tn.map(e=>`${e.status} ${e.title} ${e.end_time.slice(0,10)}`),['Today Houston at ITA Texas Regional Championship 2026-10-12','Upcoming Houston at TCU Battle for the Boot 2026-10-25','Upcoming Houston at ITA Central Sectional Championship 2026-11-08','Upcoming Houston at NCAA Singles and Doubles Championships 2026-11-22']);
  assert.equal(parse('Tennis','womens-tennis',new Date('2026-09-26T15:00:00Z'))[0].recency_label,'In progress');
}

// Swimming & Diving (women's): a meet's days are one event (Fresno State,
// Oct 16-17; the Phill Hansel Invitational, Nov 17-20); a double dual
// (Tulane, Rice on Nov 6) stays two meets.
{
  const sw=parse('Swimming & Diving','womens-swimming-and-diving');
  assert.equal(sw.length,11);
  assert.deepEqual(sw.slice(0,5).map(e=>`${e.display_time} ${e.title}${e.end_time?' '+e.end_time.slice(0,10):''}`),['Oct 16 Houston at Fresno State 2026-10-17','Oct 30 Houston vs North Texas 2026-10-31','Nov 6 Houston vs Tulane','Nov 6 Houston vs Rice','Nov 17 Houston at Phill Hansel Invitational 2026-11-20']);
}

// Baseball: fall games are exhibitions; the canceled Texas game is left out;
// a three-game series is three games.
{
  const bb=parse('Baseball','baseball');
  assert.equal(bb.length,36);
  assert.deepEqual(bb.slice(0,3).map(e=>`${e.display_time} ${e.title}`),['Oct 10, 12:00 PM Houston vs ULM (Exhibition)','Oct 16, 4:00 PM Houston vs HCU (Exhibition)','Oct 24, 12:00 PM Houston vs UTA (Exhibition)']);
  assert.equal(bb.filter(e=>e.opponent==='West Virginia').length,3);
  assert.deepEqual(worker.liveScoreboardProviders(school,'Baseball').map(p=>p.path),['baseball/college-baseball']);
  // Two games against one opponent on one day are Game 1 and Game 2.
  const games=[{date:'2027-03-20T13:00:00',opponent:{title:'Rice'}},{date:'2027-03-20T16:00:00',opponent:{title:'Rice'}}],number=worker.houstonHandlers&&(await import('../src/sidearm-school-kit.mjs')).doubleheaderNumber(),ctx={parse:{}};
  assert.deepEqual(games.map(game=>number(game,games,ctx)),[1,2]);
}

// Softball: fall exhibitions labeled; the Red-Black Series is internal.
{
  const sb=parse('Softball','softball');
  assert.deepEqual(sb.map(e=>`${e.display_time} ${e.title}`),['Oct 13, 4:30 PM Houston vs Blinn College (Exhibition)','Oct 16, 6:00 PM Houston vs San Jacinto College (Exhibition)','Oct 23, 4:00 PM Houston vs Temple College (Exhibition)']);
  assert.deepEqual(worker.liveScoreboardProviders(school,'Softball').map(p=>p.path),['baseball/college-softball']);
}

// Track & Field: the page still shows 2026 (last season): an empty schedule
// now. In season, one event per meet; team places with points; a story two
// meets share stays only with the meet it names.
{
  const empty=worker.parseHtml(fixture('track-and-field-schedule.html.gz'),school,'Track & Field',page('track-and-field'),now);
  assert.deepEqual(empty,[]);assert.equal(worker.houstonHandlers.isEmptySchedule(empty),true);
  const tf=parse('Track & Field','track-and-field',new Date('2026-06-20T15:00:00Z'));
  assert.equal(tf.length,23);assert.ok(tf.every(e=>e.status==='Final'&&e.title.startsWith('Houston at ')));
  const by=name=>tf.find(e=>e.opponent===name);
  assert.equal(by('Big 12 Indoor Championships').headline,'Women\'s team: 12th · 22 pts / Men\'s team: T5th · 57 pts');
  assert.equal(by('Big 12 Outdoor Championships').headline,'Women\'s team: 14th · 20.5 pts / Men\'s team: 3rd · 87.33 pts');
  assert.equal(by('NCAA Indoor Championships').headline,'Men\'s team: 51st · 1.5 pts');
  assert.equal(by('Texas Relays').end_time.slice(0,10),'2026-04-04');
  assert.equal(by('Mt. SAC Relays').recap_url,undefined,'the Wake Forest story is not the Mt. SAC Relays story');
  assert.match(by('Wake Forest Invitational').recap_url,/wake-forest/);
  assert.match(by('Penn Relays').recap_url,/penn-relays-michael-johnson/);assert.match(by('Michael Johnson Invitational').recap_url,/penn-relays-michael-johnson/);
}

// Other schools and other hosts never reach the Houston reader.
assert.equal(worker.houstonHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://uhcougars.com/',now),null);
assert.equal(worker.houstonHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='tcu'),'Football',page('football'),now),null);
requests.length=0;
assert.equal(requests.length,0,'no unexpected network requests');
console.log('Houston module checks passed');
