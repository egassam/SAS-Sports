import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {iowaStateSchool} from '../src/schools/iowa-state.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='iowa-state');
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
const worker=Function(...Object.keys(deps),source+';return {candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,iowaStateHandlers,attachOfficialMeetResults,decodeHtml};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/iowa-state-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport has explicit cyclones.com routes, exactly
// the candidates production used before the module (route parity).
const sports=sponsoredSports['iowa-state'];
assert.equal(sports.length,12);
for(const [name,map] of [['schedule',iowaStateSchool.scheduleUrls],['roster',iowaStateSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('iowa-state|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value))assert.equal(new URL(url).hostname.replace(/^www\./,''),'cyclones.com',`${key} must stay on cyclones.com`);
  }
}
// Routes: the official pages only (the generic pages, /sports/mens-golf/ and
// the homepage render SIDEARM's empty "@season @sport" template); women's
// tennis, gymnastics and swimming & diving only; both basketball and golf
// teams, labeled (men's golf is /sports/golf/).
const page=slug=>`https://cyclones.com/sports/${slug}/schedule`,roster=slug=>`https://cyclones.com/sports/${slug}/roster`;
const routes={Basketball:['mens-basketball','womens-basketball'],'Cross Country':['cross-country'],Football:['football'],Golf:['golf','womens-golf'],Gymnastics:['womens-gymnastics'],Soccer:['womens-soccer'],Softball:['softball'],'Swimming & Diving':['womens-swimming-and-diving'],Tennis:['womens-tennis'],'Track & Field':['track-and-field'],Volleyball:['womens-volleyball'],Wrestling:['wrestling']};
const rosters={...routes,Basketball:['mens-basketball','womens-basketball','basketball'],Golf:['womens-golf','mens-golf','golf'],Gymnastics:['womens-gymnastics','mens-gymnastics','gymnastics'],'Track & Field':['track-and-field','track-field']};
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),routes[sport].map(page),`${sport} schedule routes`);
  assert.deepEqual(worker.rosterUrls(school,sport),rosters[sport].map(roster),`${sport} roster routes`);
  assert.equal(worker.schoolCombinedSports(school).has(sport),['Basketball','Golf'].includes(sport),`${sport} team combination`);
}
for(const slug of ['basketball','mens-golf','gymnastics','mens-gymnastics','tennis','mens-tennis','track-field','mens-swimming-and-diving','swimming-and-diving','swimming'])assert.match(fixture(`${slug}-schedule.html.gz`),/<title>@season @sport Schedule/,`${slug} is SIDEARM's empty template`);
for(const sport of sports)assert.ok(!read('../src/index.js').includes("'iowa-state|"+sport+"':"),`${sport} routes must live in the Iowa State module, not shared code`);

// Sports converted to K-State's format follow, one block per sport, each with
// fixtures from the official pages (scripts/fetch-school-fixtures.mjs) and a
// mutation that fails it; read each sport first with
// scripts/survey-school.mjs. The helpers below are Houston's
// (tests/houston-module.mjs shows every sport's block).
const now=new Date("2026-10-07T15:00:00Z");
const parse=(sport,slug,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),at),school,sport,page(slug));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}`;
const recapFile=url=>{const [,y,m,d,slug]=url.match(/\/news\/(\d+)\/(\d+)\/(\d+)\/([A-Za-z0-9-]+)/);return`recap-${y}-${m}-${d}-${slug.slice(0,40)}.html.gz`;};
// Each final matches only its own recap (a shared story matches both of its games).
function ownRecapsOnly(events,label){
  const finals=events.filter(e=>e.recap_url),raws=finals.map(e=>fixture(recapFile(e.recap_url)));
  finals.forEach(event=>finals.forEach((other,j)=>assert.equal(worker.iowaStateHandlers.matchesRecap(raws[j],event,other.recap_url),other.recap_url===event.recap_url,`${label}: ${event.display_time} ${event.opponent} against ${other.display_time} ${other.opponent}'s recap`)));
  return finals.length;
}
// An ESPN payload joins the official card for this school only.
function live(sport,payloadFile,events,at,expected){
  const payload=JSON.parse(fixture(payloadFile)),scored=[];
  for(const provider of worker.liveScoreboardProviders(school,sport))scored.push(...worker.parseScoreboardPayload(payload,school,sport,provider,`https://site.api.espn.com/apis/site/v2/sports/${provider.path}/scoreboard`,at));
  assert.deepEqual(scored.map(e=>[e.title,e.status,e.headline]),expected);
  const reconciled=worker.reconcileScoreboardEvents(events,scored);
  assert.equal(reconciled.length,events.length,`${sport}: the scoreboard joins the official card; no second card`);
}
void [parse,line,ownRecapsOnly,live];
// Football: 5 finals with their own recaps; upcoming games with published
// Central times or the date alone (TBA); the Big 12 Championship (no opponent
// yet) reads as an event Iowa State is at.
{
  const fb=parse('Football','football');
  assert.deepEqual(fb.map(line),[
    "Final Sep 5 Iowa State vs Southeast Missouri | W, 38-10",
    "Final Sep 12 Iowa State at Iowa | L, 13-16",
    "Final Sep 19 Iowa State vs Bowling Green | W, 55-7",
    "Final Sep 26 Iowa State vs Utah | L, 17-31",
    "Final Oct 3 Iowa State vs West Virginia | W, 45-42",
    "Upcoming Oct 9, 9:15 PM Iowa State at BYU | ",
    "Upcoming Oct 24 Iowa State at Arizona | ",
    "Upcoming Oct 31 Iowa State vs Oklahoma State | ",
    "Upcoming Nov 7 Iowa State at Baylor | ",
    "Upcoming Nov 14 Iowa State vs Cincinnati | ",
    "Upcoming Nov 20, 5:00 PM Iowa State at UCF | ",
    "Upcoming Nov 28 Iowa State vs Kansas State | ",
    "Upcoming Dec 4, 7:00 PM Iowa State at Big 12 Football Championship | "
  ]);
  assert.equal(ownRecapsOnly(fb,'Football'),5);
  // The whole pipeline (download, parse) keeps the page data.
  recapFixtures.set(page('football'),fixture('football-schedule.html.gz'));
  const {events}=await worker.fetchLive('iowa-state','Football');
  assert.equal(events.filter(e=>e.status==='Final').length,5);
  recapFixtures.clear();
  // ESPN: Iowa State's game only; Iowa (the Hawkeyes) is never Iowa State.
  live('Football','football-espn-2026-10-03.json.gz',fb,new Date('2026-10-04T12:00:00Z'),[['Iowa State vs West Virginia','Final','W, 45-42']]);
}

// Volleyball: 15 finals with their own recaps, 14 upcoming; rankings dropped.
{
  const vb=parse('Volleyball','womens-volleyball');
  assert.deepEqual(vb.map(line),[
    "Final Aug 28 Iowa State vs Loyola | W, 3-0",
    "Final Aug 29 Iowa State vs Georgia Tech | L, 0-3",
    "Final Aug 30 Iowa State vs UNI | W, 3-1",
    "Final Sep 3 Iowa State at UCSB | W, 3-1",
    "Final Sep 4 Iowa State vs Utah State | W, 3-1",
    "Final Sep 8 Iowa State vs Iowa | L, 0-3",
    "Final Sep 11 Iowa State vs Villanova | W, 3-0",
    "Final Sep 12 Iowa State at American | L, 0-3",
    "Final Sep 18 Iowa State vs UCLA | L, 0-3",
    "Final Sep 19 Iowa State vs Hawaii | L, 2-3",
    "Final Sep 20 Iowa State vs Texas A&M - Corpus Christi | W, 3-0",
    "Final Sep 25 Iowa State at Texas Tech | W, 3-2",
    "Final Sep 27 Iowa State vs UCF | W, 3-2",
    "Final Oct 2 Iowa State at Arizona | W, 3-1",
    "Final Oct 4 Iowa State at Arizona State | L, 1-3",
    "Upcoming Oct 9, 6:30 PM Iowa State vs Kansas State | ",
    "Upcoming Oct 11, 12:00 PM Iowa State at Cincinnati | ",
    "Upcoming Oct 15, 6:30 PM Iowa State vs Colorado | ",
    "Upcoming Oct 17, 2:00 PM Iowa State vs Utah | ",
    "Upcoming Oct 25, 1:00 PM Iowa State at Houston | ",
    "Upcoming Oct 30, 6:30 PM Iowa State vs West Virginia | ",
    "Upcoming Nov 1, 12:00 PM Iowa State vs Kansas | ",
    "Upcoming Nov 5, 5:00 PM Iowa State at UCF | ",
    "Upcoming Nov 7, 2:00 PM Iowa State vs BYU | ",
    "Upcoming Nov 16, 6:30 PM Iowa State vs Cincinnati | ",
    "Upcoming Nov 20, 7:00 PM Iowa State at Baylor | ",
    "Upcoming Nov 22, 2:00 PM Iowa State at TCU | ",
    "Upcoming Nov 25, 6:30 PM Iowa State vs Houston | ",
    "Upcoming Nov 27, 2:00 PM Iowa State at Colorado | "
  ]);
  assert.equal(ownRecapsOnly(vb,'Volleyball'),15);
  live('Volleyball','volleyball-espn-2026-10-04.json.gz',vb,new Date('2026-10-05T12:00:00Z'),[['Iowa State at Arizona St','Final','L, 1-3']]);
}

// Soccer: 12 finals (ties read T) with their own recaps, 7 upcoming.
{
  const sc=parse('Soccer','womens-soccer');
  assert.deepEqual(sc.map(line),[
    "Final Aug 12 Iowa State at Omaha | W, 1-0",
    "Final Aug 16 Iowa State vs Kansas City | W, 4-0",
    "Final Aug 20 Iowa State at Drake | L, 0-2",
    "Final Aug 23 Iowa State vs Creighton | T, 0-0",
    "Final Aug 27 Iowa State vs Iowa | L, 0-2",
    "Final Aug 30 Iowa State vs UNI | W, 5-0",
    "Final Sep 3 Iowa State vs Missouri State | W, 2-0",
    "Final Sep 10 Iowa State at Loyola Maryland | T, 1-1",
    "Final Sep 17 Iowa State vs Colorado | L, 0-1",
    "Final Sep 24 Iowa State at Houston | L, 1-2",
    "Final Sep 27 Iowa State vs West Virginia | L, 0-2",
    "Final Oct 1 Iowa State vs Utah | T, 1-1",
    "Upcoming Oct 8, 9:00 PM Iowa State at Arizona State | ",
    "Upcoming Oct 11, 3:00 PM Iowa State at Arizona | ",
    "Upcoming Oct 16, 6:00 PM Iowa State at Kansas | ",
    "Upcoming Oct 22, 6:00 PM Iowa State vs Kansas State | ",
    "Upcoming Oct 26, 6:00 PM Iowa State vs BYU | ",
    "Upcoming Oct 29, 6:00 PM Iowa State vs Oklahoma State | ",
    "Upcoming Nov 5, 6:00 PM Iowa State at UCF | "
  ]);
  assert.equal(ownRecapsOnly(sc,'Soccer'),12);
  live('Soccer','soccer-espn-2026-10-01.json.gz',sc,new Date('2026-10-02T12:00:00Z'),[['Iowa State vs Utah','Final','T, 1-1']]);
}

// Cross Country: team places from the card ("Men: 3rd, Women: 5th"), women
// first; the canceled home meet left out; TFRRS adds the points and every
// Iowa State runner; each meet's story comes from the archive (the schedule
// links none).
{
  const xc=parse('Cross Country','cross-country');
  assert.deepEqual(xc.map(line),[
    "Final Sep 4 Iowa State at Cyclone Preview | Women's team: 5th / Men's team: 3rd",
    "Final Sep 18 Iowa State at Roy Griak Invitational | Women's team: 7th / Men's team: 1st",
    "Upcoming Oct 9, 10:30 AM Iowa State at Nuttycombe Invitational | ",
    "Upcoming Oct 31, 10:00 AM Iowa State at Big 12 Championships | ",
    "Upcoming Nov 13, 11:00 AM Iowa State at NCAA Midwest Regional | ",
    "Upcoming Nov 21 Iowa State at NCAA Championships | "
  ]);
  const tfrrs=[['https://www.tfrrs.org/teams/xc/IA_college_f_Iowa_State.html','tfrrs-team-f.html.gz'],['https://www.tfrrs.org/teams/xc/IA_college_m_Iowa_State.html','tfrrs-team-m.html.gz'],
    ['https://www.tfrrs.org/results/xc/28496/Cyclone_Preview','tfrrs-28496.html.gz'],['https://www.tfrrs.org/results/xc/27958/Roy_Griak_Invitational_-_D1_Teams_Only','tfrrs-27958.html.gz']];
  const stories=['https://cyclones.com/sports/cross-country/archives','cross-country-archives.html.gz'];
  const story=path=>[`https://cyclones.com/news/${path}`,`story-${path.split('/').slice(0,3).join('-')}-${path.split('/')[3].slice(0,40)}.html.gz`];
  const preview='2026/9/4/iowa-state-mens-cross-country-racers-gain-experience-at-cyclone-preview',preview2='2026/9/4/cross-country-iowa-state-women-open-season-with-cyclone-preview';
  const griak='2026/9/18/cross-country-five-men-finish-in-top-10-to-secure-griak-invitational-team-title',griak2='2026/9/18/cross-country-iowa-state-women-run-second-race-at-griak-invitational';
  for(const [url,file] of [...tfrrs,stories,...[preview,preview2,griak,griak2].map(story)])recapFixtures.set(url,fixture(file));
  const [cyclone,roy]=xc;
  for(const meet of [cyclone,roy]){assert.equal(worker.iowaStateHandlers.isFinalWithoutStory(meet),true);await worker.iowaStateHandlers.attachArchiveStory(meet);}
  assert.equal(cyclone.recap_url,`https://cyclones.com/news/${preview}`);
  assert.equal(roy.recap_url,`https://cyclones.com/news/${griak2}`,"the men's story says only \"Griak Invitational\"");
  await worker.attachOfficialMeetResults(cyclone);await worker.attachOfficialMeetResults(roy);
  assert.equal(cyclone.headline,"Women's team: 5th · 117 pts / Men's team: 3rd · 84 pts");
  assert.equal(roy.headline,"Women's team: 7th · 193 pts / Men's team: 1st · 24 pts");
  assert.deepEqual([...new Set(cyclone.results.map(r=>r.group))],["Women's 5K","Men's 6K"]);
  assert.equal(cyclone.source.url,cyclone.recap_url,'the source link is the official recap');
  assert.ok(cyclone.highlights_verified&&roy.highlights_verified);
  // A story that does not name the meet is not its story.
  const other={...parse('Cross Country','cross-country')[0],opponent:'Nuttycombe Invitational'};
  await worker.iowaStateHandlers.attachArchiveStory(other);assert.equal(other.recap_url,undefined);
  // A place TFRRS contradicts is refused.
  const wrong={...parse('Cross Country','cross-country')[0]};wrong.headline="Women's team: 1st / Men's team: 3rd";
  await worker.attachOfficialMeetResults(wrong);assert.equal(wrong.meet_results_verified,false);
  // The feed attaches story and results.
  recapFixtures.set(page('cross-country'),fixture('cross-country-schedule.html.gz'));
  const {events}=await worker.fetchLive('iowa-state','Cross Country');
  const fed=events.find(e=>e.opponent==='Roy Griak Invitational');
  assert.equal(fed.recap_url,`https://cyclones.com/news/${griak2}`);assert.equal(fed.headline,roy.headline);
  recapFixtures.clear();
}

// Basketball: men's and women's pages, labeled; exhibitions labeled ("(Ex.)"
// is the site's short label); the Players Era final (no opponent yet) and the
// Big 12 tournaments read as events Iowa State is at.
{
  const men=parse('Basketball','mens-basketball'),women=parse('Basketball','womens-basketball');
  assert.equal(men.length,36);assert.equal(women.length,33);
  assert.ok(men.every(e=>e.team_label==="Men's"&&e.id.endsWith('-mens'))&&women.every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens')));
  assert.deepEqual(men.slice(0,2).map(e=>`${e.display_time} ${e.title}`),["Oct 18, 12:00 PM Men's · Iowa State vs Creighton (Exhibition)","Oct 25, 12:00 PM Men's · Iowa State at Northwestern (Exhibition)"]);
  assert.equal(women[0].title,"Women's · Iowa State vs Upper Iowa (Exhibition)");
  assert.ok(men.some(e=>`${e.display_time} ${e.title}`==="Nov 28, 9:30 PM Men's · Iowa State at Players Era Men's Championship Game"));
  assert.ok(men.some(e=>e.title==="Men's · Iowa State vs Tennessee or Maryland"),'a bracket game names the possible opponents as published');
  assert.deepEqual(men.at(-1).title+' '+men.at(-1).end_time.slice(0,10),"Men's · Iowa State at Phillips 66 Big 12 Tournament 2027-03-13");
  assert.equal(women.at(-1).title,"Women's · Iowa State at Phillips 66 Big 12 Women's Basketball Tournament");
}

// Golf: both teams, labeled (men's golf is /sports/golf/); one event per
// tournament with its last round's place and story; a tournament whose
// result is not yet published reads Completed.
{
  const men=parse('Golf','golf'),women=parse('Golf','womens-golf');
  assert.deepEqual(men.map(line),[
    "Final Sep 14 Men's · Iowa State at Bearcat Invitational | 11th of 17",
    "Final Sep 20 Men's · Iowa State at Gopher Invitational | 10th of 15",
    "Final Oct 5 Men's · Iowa State at Cullan Brown Collegiate | Completed",
    "Upcoming Oct 12 Men's · Iowa State at Big 12 Conference Match Play | ",
    "Upcoming Oct 31 Men's · Iowa State at Steelwood Collegiate Invitational | ",
    "Upcoming Feb 1 Men's · Iowa State at National Invitational Tournament | ",
    "Upcoming Feb 15 Men's · Iowa State at Battle at Briar's Creek | ",
    "Upcoming Mar 7 Men's · Iowa State at Colleton River Collegiate | ",
    "Upcoming Mar 22 Men's · Iowa State at Bell Bank Collegiate | ",
    "Upcoming Apr 2 Men's · Iowa State at Mason Rudolph Championship | ",
    "Upcoming Apr 12 Men's · Iowa State at Everett Buick GMC Classic | ",
    "Upcoming Apr 26 Men's · Iowa State at Big 12 Championship | ",
    "Upcoming May 17 Men's · Iowa State at NCAA Regionals | ",
    "Upcoming May 28 Men's · Iowa State at NCAA Championships | "
  ]);
  assert.deepEqual(women.map(line),[
    "Final Sep 13 Women's · Iowa State at Badger Invitational | 1st of 16",
    "Final Sep 19 Women's · Iowa State at Schooner Fall Classic | 1st of 16",
    "Final Oct 5 Women's · Iowa State at Windy City Classic | 10th of 12",
    "Upcoming Oct 16 Women's · Iowa State at Stanford Intercollegiate | ",
    "Upcoming Jan 31 Women's · Iowa State at Tropical Classic | ",
    "Upcoming Feb 15 Women's · Iowa State at Texas Golf Throwdown | ",
    "Upcoming Feb 22 Women's · Iowa State at The Chevron Collegiate | ",
    "Upcoming Mar 13 Women's · Iowa State at MountainView Collegiate | ",
    "Upcoming Apr 5 Women's · Iowa State at Silverado Showdown | ",
    "Upcoming Apr 21 Women's · Iowa State at Big 12 Championship | ",
    "Upcoming May 10 Women's · Iowa State at NCAA Regionals | ",
    "Upcoming May 21 Women's · Iowa State at NCAA Championships | "
  ]);
  assert.ok(men.every(e=>e.team_label==="Men's")&&women.every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens')));
  assert.equal(men[0].end_time.slice(0,10),'2026-09-15');
  assert.match(men[0].final_story,/bearcat-invitational/);
  assert.equal(ownRecapsOnly([...men,...women],'Golf'),5);
  // Cullan Brown (Oct 5-6) links no story and publishes no place: its story
  // comes from the golf archive, the last day's (not the day-one story).
  const cullan=men.find(e=>e.opponent==='Cullan Brown Collegiate'),story='https://cyclones.com/news/2026/10/6/mens-golf-cyclones-place-11th-in-first-cullan-brown-collegiate';
  recapFixtures.set('https://cyclones.com/sports/golf/archives',fixture('golf-archives.html.gz'));
  recapFixtures.set(story,fixture('story-2026-10-6-mens-golf-cyclones-place-11th-in-first-c.html.gz'));
  recapFixtures.set('https://cyclones.com/news/2026/10/5/mens-golf-ben-wheeler-in-top-10-after-day-one',fixture('story-2026-10-5-mens-golf-ben-wheeler-in-top-10-after-da.html.gz'));
  assert.equal(worker.iowaStateHandlers.isFinalWithoutStory(cullan),true);
  await worker.iowaStateHandlers.attachArchiveStory(cullan);
  assert.equal(cullan.recap_url,story);
  // Listed oldest first, the last day's story still wins.
  recapFixtures.set('https://cyclones.com/sports/golf/archives','<a href="/news/2026/10/5/mens-golf-ben-wheeler-in-top-10-after-day-one">1</a><a href="/news/2026/10/6/mens-golf-cyclones-place-11th-in-first-cullan-brown-collegiate">2</a>');
  const again={...men.find(e=>e.opponent==='Cullan Brown Collegiate')};await worker.iowaStateHandlers.attachArchiveStory(again);assert.equal(again.recap_url,story);
  recapFixtures.set(page('golf'),fixture('golf-schedule.html.gz'));
  const {events}=await worker.fetchLive('iowa-state','Golf');
  assert.equal(events.find(e=>e.opponent==='Cullan Brown Collegiate').recap_url,story,'the feed takes the archive story');
  recapFixtures.clear();
}

// Tennis: fall tournaments, one event each from first to last day, each past
// one with Iowa State's story.
{
  const tn=parse('Tennis','womens-tennis');
  assert.deepEqual(tn.map(line),[
    "Final Sep 19 Iowa State at ITA All-American Championships | Completed",
    "Final Sep 25 Iowa State at Husker Invitational | Completed",
    "Final Oct 2 Iowa State at Blue Gray National Tennis Classic | Completed",
    "Upcoming Oct 14 Iowa State at ITA Regionals | ",
    "Upcoming Oct 26 Iowa State at ITF Sumter W15 | ",
    "Upcoming Oct 30 Iowa State at H-E-B Invitational | ",
    "Upcoming Nov 5 Iowa State at ITA Sectionals | ",
    "Upcoming Nov 17 Iowa State at NCAA Singles and Doubles Championships | "
  ]);
  assert.equal(tn[0].end_time.slice(0,10),'2026-09-27');
  assert.ok(tn.slice(0,3).every(e=>e.recap_url));
}

// Swimming & Diving: women's only; the intrasquad Cardinal & Gold meet is
// internal; a dual meet's score reads as a game; a meet's days are one event;
// a multi-day event at a neutral site reads "at".
{
  const sw=parse('Swimming & Diving','womens-swimming-and-diving');
  assert.deepEqual(sw.map(line),[
    "Final Oct 2 Iowa State at Nebraska | L, 101-197",
    "Upcoming Oct 9 Iowa State at Florida State Invite | ",
    "Upcoming Oct 16, 5:00 PM Iowa State at Illinois | ",
    "Upcoming Nov 6, 5:00 PM Iowa State vs South Dakota | ",
    "Upcoming Nov 17 Iowa State at Hawkeye Invite | ",
    "Upcoming Dec 3 Iowa State at Minnesota Invitational (Dive) | ",
    "Upcoming Jan 9, 2:00 PM Iowa State vs UNI | ",
    "Upcoming Jan 16 Iowa State at Big 12 Duals | ",
    "Upcoming Jan 29, 3:00 PM Iowa State vs St. Thomas | ",
    "Upcoming Jan 30, 1:00 PM Iowa State at Iowa | ",
    "Upcoming Feb 5, 3:00 PM Iowa State at Kansas | ",
    "Upcoming Feb 23 Iowa State at Big 12 Championships | ",
    "Upcoming Mar 8 Iowa State at NCAA Zone Diving Qualifications | ",
    "Upcoming Mar 11 Iowa State at National Invitational Championships | ",
    "Upcoming Mar 17 Iowa State at NCAA Women's Swimming & Diving Championships | "
  ]);
  assert.ok(!sw.some(e=>/Cardinal/.test(e.title)));
  assert.equal(ownRecapsOnly(sw,'Swimming & Diving'),1);
}

// Softball: fall exhibitions labeled (the played ones published no score and
// are left out); the Big 12 tournament is named after its tournament ("Big
// 12" on the card).
{
  const sb=parse('Softball','softball');
  assert.deepEqual(sb.map(line),[
    "Upcoming Oct 6, 3:30 PM Iowa State vs NIACC (Exhibition) | ",
    "Upcoming Oct 9, 4:00 PM Iowa State at Drake (Exhibition) | ",
    "Upcoming Oct 10, 12:00 PM Iowa State at Iowa (Exhibition) | ",
    "Upcoming Oct 11, 11:00 AM Iowa State vs UNI (Exhibition) | ",
    "Upcoming Mar 12 Iowa State at Arizona | ",
    "Upcoming Mar 13 Iowa State at Arizona | ",
    "Upcoming Mar 14 Iowa State at Arizona | ",
    "Upcoming Mar 25 Iowa State at Houston | ",
    "Upcoming Mar 26 Iowa State at Houston | ",
    "Upcoming Mar 27 Iowa State at Houston | ",
    "Upcoming Apr 2 Iowa State vs Texas Tech | ",
    "Upcoming Apr 3 Iowa State vs Texas Tech | ",
    "Upcoming Apr 4 Iowa State vs Texas Tech | ",
    "Upcoming Apr 9 Iowa State at Oklahoma State | ",
    "Upcoming Apr 10 Iowa State at Oklahoma State | ",
    "Upcoming Apr 11 Iowa State at Oklahoma State | ",
    "Upcoming Apr 16 Iowa State vs Kansas | ",
    "Upcoming Apr 17 Iowa State vs Kansas | ",
    "Upcoming Apr 18 Iowa State vs Kansas | ",
    "Upcoming Apr 23 Iowa State at Arizona State | ",
    "Upcoming Apr 24 Iowa State at Arizona State | ",
    "Upcoming Apr 25 Iowa State at Arizona State | ",
    "Upcoming Apr 29 Iowa State vs BYU | ",
    "Upcoming Apr 30 Iowa State vs BYU | ",
    "Upcoming May 1 Iowa State vs BYU | ",
    "Upcoming May 7 Iowa State vs Utah | ",
    "Upcoming May 8 Iowa State vs Utah | ",
    "Upcoming May 9 Iowa State vs Utah | ",
    "Upcoming May 13 Iowa State at Big 12 Softball Tournament | "
  ]);
  assert.deepEqual(worker.liveScoreboardProviders(school,'Softball').map(p=>p.path),['baseball/college-softball']);
}

// Wrestling: duals; multi-day tournaments at a neutral site read "at".
{
  const wr=parse('Wrestling','wrestling');
  assert.deepEqual(wr.map(line),[
    "Upcoming Nov 1, 6:00 PM Iowa State vs Bucknell | ",
    "Upcoming Nov 6 Iowa State at Utah Valley | ",
    "Upcoming Nov 14, 12:00 PM Iowa State at North Dakota State | ",
    "Upcoming Nov 14, 2:00 PM Iowa State at Penn | ",
    "Upcoming Nov 22 Iowa State at Iowa | ",
    "Upcoming Dec 12 Iowa State at National Duals Invitational | ",
    "Upcoming Jan 2 Iowa State at Soldier Salute | ",
    "Upcoming Jan 10, 2:00 PM Iowa State vs Arizona State | ",
    "Upcoming Jan 17, 2:00 PM Iowa State vs Wyoming | ",
    "Upcoming Jan 22 Iowa State at West Virginia | ",
    "Upcoming Jan 23 Iowa State at Lock Haven | ",
    "Upcoming Jan 29, 7:00 PM Iowa State vs Oklahoma | ",
    "Upcoming Jan 31, 2:00 PM Iowa State vs Oklahoma State | ",
    "Upcoming Feb 5, 7:00 PM Iowa State vs Stanford | ",
    "Upcoming Feb 12 Iowa State at UNI | ",
    "Upcoming Feb 14, 12:00 PM Iowa State vs Cornell | ",
    "Upcoming Feb 17 Iowa State at Missouri | ",
    "Upcoming Mar 5 Iowa State at Big 12 Championship | ",
    "Upcoming Mar 18 Iowa State at NCAA Championships | "
  ]);
}

// Track & Field and Gymnastics: the pages still show 2026 (last season): an
// empty schedule now. In season, one event per meet, and gymnastics meets
// read as games with their scores.
{
  for(const [sport,slug] of [['Track & Field','track-and-field'],['Gymnastics','womens-gymnastics']]){
    const empty=worker.parseHtml(fixture(`${slug}-schedule.html.gz`),school,sport,page(slug),now);
    assert.deepEqual(empty,[]);assert.equal(worker.iowaStateHandlers.isEmptySchedule(empty),true,`${sport}: last season's page is an empty schedule`);
  }
  const tf=parse('Track & Field','track-and-field',new Date('2026-06-20T15:00:00Z'));
  assert.equal(tf.length,30);assert.ok(tf.every(e=>e.status==='Final'&&e.title.startsWith('Iowa State at ')));
  assert.equal(tf.find(e=>e.opponent==='Drake Relays').end_time.slice(0,10),'2026-04-25');
  const gym=parse('Gymnastics','womens-gymnastics',new Date('2026-04-20T15:00:00Z'));
  assert.equal(gym.find(e=>e.opponent==='Missouri').headline,'L, 191.325-196.850');
}

// Records: each sport's overall record, counted from its finals, equals the
// record the official page publishes in its page data ("3 - 2", "4 - 5 - 3").
{
  const published=slug=>{
    const raw=fixture(`${slug}-schedule.html.gz`),data=JSON.parse(raw.match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)[1]);
    const holder=data.find(value=>value&&!Array.isArray(value)&&typeof value==='object'&&'overall' in value&&'conference' in value);
    return String(data[holder.overall]).replace(/<[^>]+>/g,'').replace(/\s+/g,'');
  };
  const record=(sport,slug)=>worker.groupEvents(parse(sport,slug),now)[0].records;
  for(const [sport,slug,text] of [['Football','football','3-2'],['Volleyball','womens-volleyball','9-6'],['Soccer','womens-soccer','4-5-3'],['Swimming & Diving','womens-swimming-and-diving','0-1']]){
    assert.equal(published(slug),text,`${sport}: the official page publishes ${text}`);
    assert.deepEqual(record(sport,slug).map(r=>[r.team_label,r.text]),[[null,text]],`${sport}: the computed record is the official one`);
  }
  assert.deepEqual(record('Soccer','womens-soccer')[0],{team_label:null,wins:4,losses:5,ties:3,text:'4-5-3'});
  // Meets and tournaments (places, not wins) have no record.
  assert.deepEqual(record('Cross Country','cross-country'),[]);
  assert.deepEqual(worker.groupEvents([...parse('Golf','golf'),...parse('Golf','womens-golf')],now)[0].records,[]);
  assert.deepEqual(record('Tennis','womens-tennis'),[]);
  // Exhibitions do not count; a combined sport keeps each team's record.
  const base=parse('Football','football')[0];
  const game=(over)=>({...base,id:Math.random().toString(36),...over});
  const mixed=[game({sport:'Basketball',start_time:'2026-11-12T01:00:00Z',team_label:"Men's",headline:'W, 70-60',opponent:'Drake'}),game({sport:'Basketball',start_time:'2026-11-12T01:00:00Z',team_label:"Men's",headline:'W, 80-50',opponent:'Creighton (Exhibition)'}),game({sport:'Basketball',start_time:'2026-11-12T01:00:00Z',team_label:"Women's",headline:'L, 60-70',opponent:'Iowa'}),game({sport:'Basketball',start_time:'2026-11-12T01:00:00Z',team_label:"Women's",headline:'W, 90-40',opponent:'Upper Iowa (Exh.)'})];
  const hoops=over=>game({sport:'Basketball',team_label:"Men's",opponent:'Drake',headline:'W, 70-60',...over});
  assert.deepEqual(worker.groupEvents([hoops({start_time:'2026-11-10T19:00:00Z'}),hoops({start_time:'2027-01-10T19:00:00Z',headline:'L, 60-70'}),hoops({start_time:'2026-08-20T19:00:00Z',opponent:'Ukraine Senior National Team'})],now)[0].records.map(r=>[r.team_label,r.text]),[["Men's",'1-1']],'a summer tour is not in the record');
  const ball=over=>game({sport:'Softball',opponent:'Wichita State',headline:'L, 3-5',...over});
  assert.deepEqual(worker.groupEvents([ball({start_time:'2026-10-04T19:00:00Z'})],now)[0]?.records||[],[],'fall ball is not in the record');
  assert.deepEqual(worker.groupEvents([ball({start_time:'2027-03-04T19:00:00Z'})],new Date('2027-03-10T12:00:00Z'))[0].records.map(r=>r.text),['0-1']);
}

// Other schools and other hosts never reach the Iowa State reader.
assert.equal(worker.iowaStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),school,'Football','https://cyclones.com/',now),null);
assert.equal(worker.iowaStateHandlers.parseSchedule(fixture('football-schedule.html.gz'),schools.find(s=>s.id==='tcu'),'Football',page('football'),now),null);
requests.length=0;
assert.equal(requests.length,0,'no unexpected network requests');
console.log('Iowa State module checks passed');
