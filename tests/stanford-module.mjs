import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {stanfordSchool} from '../src/schools/stanford.mjs';
import {wmtLocalTime,wmtScore,wmtMeetResult,mergeWmtMeetEntries,wmtApiSchoolRoutes} from '../src/wmt-api-kit.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='stanford');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,featuredAthletes,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,labelTeamEvents,stanfordHandlers,schoolModule}')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/stanford-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads gostanford.com's schedule
// API, one address per team (its sport id), and its roster pages.
const sports=sponsoredSports['stanford'];
assert.equal(sports.length,19);
assert.deepEqual(Object.keys(stanfordSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',stanfordSchool.scheduleUrls],['roster',stanfordSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('stanford|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'gostanford.com',`${key} must stay on gostanford.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/gostanford\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
      else assert.match(url,/^https:\/\/gostanford\.com\/sports\/[a-z-]+\/roster$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(stanfordSchool.scheduleUrls[`stanford|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'stanford|"+sport+"':"),`${sport} routes must live in the Stanford module, not shared code`);
}
// The written-out routes are the kit's, from the module's sport ids.
{
  const ids=Object.fromEntries(Object.values(stanfordSchool.scheduleUrls).flat().map((url,i)=>[i,url]));
  const expected=wmtApiSchoolRoutes({id:'stanford',host:'gostanford.com',sportIds:Object.fromEntries(Object.entries(stanfordSchool.rosterUrls).flatMap(([key,value])=>[].concat(value).map((roster,i)=>[roster.split('/')[4],Number(new URL([].concat(stanfordSchool.scheduleUrls[key])[i]).searchParams.get('filter[schedule.sport_id]'))]))),slugs:Object.fromEntries(Object.entries(stanfordSchool.rosterUrls).map(([key,value])=>[key.split('|')[1],[].concat(value).map(roster=>roster.split('/')[4])]))});
  assert.ok(Object.keys(ids).length===29);
  assert.deepEqual(expected.scheduleUrls,stanfordSchool.scheduleUrls);
  assert.deepEqual(expected.rosterUrls,stanfordSchool.rosterUrls);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),['Basketball','Golf','Gymnastics','Rowing','Soccer','Swimming & Diving','Tennis','Volleyball','Water Polo']);

const now=new Date("2026-10-15T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=id=>Object.values(stanfordSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${id}&`));
const parse=(sport,id,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`api-${id}-schedule.html.gz`),school,sport,address(id),at),school,sport,address(id));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}${e.recap_url?' | '+new URL(e.recap_url).pathname:''}`;

// The kit's pieces. Times are the school's (Pacific here); midnight, and an
// event marked all day or TBA, publish no time.
assert.deepEqual([['2026-10-03T00:30:00.000000Z'],['2026-10-17T07:00:00.000000Z'],['2026-09-28T19:00:00.000000Z',{untimed:true}]].map(([iso,options])=>{const t=wmtLocalTime(iso,'America/Los_Angeles',options);return[t.date,t.time];}),[["Oct 2, 2026","5:30 PM"],["Oct 17, 2026",null],["Sep 28, 2026",null]]);
// Scores: the winner's and the loser's, the team's first; "(OT)" as Stanford
// writes it, "OT" as Notre Dame does.
assert.deepEqual([{result:'win',winning_score:'3.0000',losing_score:'2.0000',text:'(OT)'},{result:'loss',winning_score:'58.0000',losing_score:'7.0000'},{result:'tie',winning_score:'0.0000',losing_score:'0.0000'},{result:'win',winning_score:'2.0000',losing_score:'1.0000',text:'OT'},{result:'no_result',winning_score:null,losing_score:null}].map(r=>wmtScore(r)?.text??null),["W, 3-2 (OT)","L, 7-58","T, 0-0","W, 2-1 (OT)",null]);
// Meets: golf in its field, swimming's place and points, cross country's team
// places with points and race, fencing's and swimming's individual meets,
// Notre Dame's shapes.
assert.deepEqual([['4th of 13','Golf'],['T14th of 16','Golf'],['1st of 4 (550 pts)','Swimming & Diving'],['1st of 4 (550)','Swimming & Diving'],['W: 6th (145); M: 5th (150)','Cross Country'],['W: 1st (18 Open); M: 4th (205 Championship)','Cross Country'],['Ind. results','Fencing'],['No Team Score','Swimming & Diving'],['Completed','Tennis'],['T-2nd, 839 (-13)','Golf'],['W - 2nd | M - 1st','Cross Country']].map(([text,sport])=>wmtMeetResult(text,sport)),[{"headline":"4th of 13","results":[{"label":"Result","value":"4th of 13"}]},{"headline":"T14th of 16","results":[{"label":"Result","value":"T14th of 16"}]},{"headline":"1st of 4","results":[{"label":"Result","value":"1st of 4"},{"label":"Team score","value":"550 pts"}]},{"headline":"1st of 4","results":[{"label":"Result","value":"1st of 4"},{"label":"Team score","value":"550 pts"}]},{"headline":"Women's team: 6th · 145 pts / Men's team: 5th · 150 pts","results":[{"label":"Women's team","value":"6th · 145 pts"},{"label":"Men's team","value":"5th · 150 pts"}]},{"headline":"Women's team: 1st · 18 pts (Open race) / Men's team: 4th · 205 pts","results":[{"label":"Women's team","value":"1st · 18 pts (Open race)"},{"label":"Men's team","value":"4th · 205 pts"}]},{"headline":"Individual results","results":[{"label":"Result","value":"Individual results"}]},{"headline":"No team score (individuals only)","results":[{"label":"Result","value":"No team score (individuals only)"}]},{"headline":"Completed","results":[{"label":"Result","value":"Completed"}]},{"headline":"T2nd","results":[{"label":"Result","value":"T2nd"},{"label":"Team score","value":"839 (-13)"}]},{"headline":"Women's team: 2nd / Men's team: 1st","results":[{"label":"Women's team","value":"2nd"},{"label":"Men's team","value":"1st"}]}]);

// Every team, read from the API as the schedule page shows it: finals with
// their scores and stories, meets with their places, upcoming events with
// their Pacific times. Exhibitions are labeled; internal events (water polo's
// "Cardinal & Black Intrasquad") are not listed.
assert.deepEqual(parse('Football',8).map(line),["Final Aug 29 Stanford vs Hawai'i | W, 37-27 | /news/2026/08/30/stanford-gets-late-td-from-micah-ford-in-37-27-win-vs-hawaii","Final Sep 4 Stanford vs Miami | L, 6-45 | /news/2026/09/05/stanford-falls-to-no-7-miami","Final Sep 19 Stanford at Duke | L, 7-35 | /news/2026/09/19/cardinal-falls-in-first-road-acc-test","Final Sep 26 Stanford vs Georgia Tech | W, 34-27 | /news/2026/09/27/warrens-career-night-powers-cardinal-to-victory-over-yellow-jackets","Final Oct 3 Stanford at Wake Forest | L, 3-57 | /news/2026/10/03/cardinal-halted-at-wake-forest","Final Oct 10 Stanford at Notre Dame | L, 7-58 | /news/2026/10/10/stanford-falls-to-no-3-notre-dame-in-south-bend","Upcoming Oct 17, 4:30 PM Stanford vs Elon | ","Upcoming Oct 23, 7:30 PM Stanford vs North Carolina St. | ","Upcoming Oct 31 Stanford at Louisville | ","Upcoming Nov 14 Stanford at Virginia Tech | ","Upcoming Nov 21 Stanford at California | ","Upcoming Nov 28 Stanford vs SMU | "]);
assert.deepEqual(parse('Soccer',28).filter(e=>e.status!=='Upcoming').map(line),["Final Aug 8 Women's · Stanford vs Pacific (Exhibition) | W, 3-0 | /news/2026/08/08/balanced-effort-in-exhibition-win","Final Aug 16 Women's · Stanford at Cal Poly | W, 1-0 | /news/2026/08/16/top-ranked-cardinal-opens-season-with-shutout-win","Final Aug 20 Women's · Stanford vs Georgetown | W, 2-0 | /news/2026/08/21/early-goals-guide-no-1-stanford-to-ranked-win","Final Aug 23 Women's · Stanford vs UC Irvine | W, 6-0 | /news/2026/08/24/no-1-stanford-cruises-past-uc-irvine","Final Aug 27 Women's · Stanford vs UCLA | W, 3-0 | /news/2026/08/28/no-1-stanford-bests-no-17-ucla","Final Aug 30 Women's · Stanford vs Cal State Fullerton | W, 7-0 | /news/2026/08/31/no-1-stanford-scores-five-second-half-goals-routs-fullerton-7-0","Final Sep 3 Women's · Stanford vs USC | T, 2-2 | /news/2026/09/04/cardinal-retires-meyers-no-19-draws-usc","Final Sep 6 Women's · Stanford at Santa Clara | W, 4-0 | /news/2026/09/06/thomas-hat-trick-leads-no-1-stanford-past-santa-clara","Final Sep 13 Women's · Stanford at Duke | L, 0-5 | /news/2026/09/13/cardinal-suffers-first-loss-of-season","Final Sep 17 Women's · Stanford vs Louisville | L, 0-1 | /news/2026/09/18/louisville-stuns-no-6-stanford","Final Sep 20 Women's · Stanford vs Wake Forest | W, 2-0 | /news/2026/09/20/no-6-stanford-upends-no-3-wake-forest","Final Sep 25 Women's · Stanford at SMU | T, 0-0 | /news/2026/09/26/stanford-plays-to-scoreless-draw-at-smu","Final Oct 8 Women's · Stanford at Syracuse | W, 2-0 | /news/2026/10/09/no-8-cardinal-tops-orange"]);
assert.deepEqual(parse('Soccer',13).filter(e=>e.status!=='Upcoming').map(line),["Final Aug 8 Men's · Stanford vs CSU Bakersfield (Exhibition) | W, 3-1","Final Aug 12 Men's · Stanford vs Sacramento State (Exhibition) | W, 1-0","Final Aug 15 Men's · Stanford vs Cal Poly (Exhibition) | W, 2-0","Final Aug 20 Men's · Stanford vs Grand Canyon | W, 2-1 | /news/2026/08/21/stanford-opens-with-statement-win","Final Aug 23 Men's · Stanford vs Denver | W, 3-1 | /news/2026/08/24/no-9-stanford-scores-three-unanswered-to-down-denver","Final Aug 27 Men's · Stanford vs San Diego | W, 1-0 | /news/2026/08/28/no-1-stanford-snatches-late-victory-over-no-2-san-diego","Final Aug 30 Men's · Stanford vs UC Davis | W, 2-1 | /news/2026/08/31/top-ranked-cardinal-downs-uc-davis","Final Sep 4 Men's · Stanford at San Jose State | W, 1-0 | /news/2026/09/05/no-1-card-collects-clean-sheet-over-san-jose-state","Final Sep 7 Men's · Stanford vs CSUN | W, 4-0 | /news/2026/09/08/fitzgerald-boes-bags-hat-trick-top-ranked-cardinal-routs-csun","Final Sep 11 Men's · Stanford at North Carolina | T, 2-2 | /news/2026/09/12/top-ranked-cardinal-draws-tar-heels","Final Sep 15 Men's · Stanford vs Santa Clara | W, 1-0 | /news/2026/09/16/no-1-stanford-blanks-santa-clara","Final Sep 20 Men's · Stanford vs Notre Dame | L, 1-3 | /news/2026/09/21/stanford-suffers-first-setback","Final Sep 25 Men's · Stanford vs Virginia | L, 2-3 | /news/2026/09/26/cardinal-drops-stunner-to-virginia","Final Oct 2 Men's · Stanford at Duke | W, 3-2 | /news/2026/10/03/comeback-complete-msoc26","Final Oct 11 Men's · Stanford vs Clemson | L, 2-3 | /news/2026/10/12/cardinal-falls-in-ranked-clash"]);
assert.deepEqual(parse('Volleyball',31).filter(e=>e.status==='Final').map(line),["Final Aug 28 Women's · Stanford vs Wisconsin | W, 3-1 | /news/2026/08/29/slow-start-strong-finish","Final Aug 30 Women's · Stanford vs Kansas | W, 3-1 | /news/2026/08/30/stanford-tops-kansas","Final Sep 3 Women's · Stanford vs South Florida | W, 3-1 | /news/2026/09/04/andrew-powers-card-past-south-florida","Final Sep 6 Women's · Stanford vs Marquette | W, 3-1 | /news/2026/09/07/stanford-downs-marquette","Final Sep 9 Women's · Stanford vs Texas A&M | L, 1-3 | /news/2026/09/10/cardinal-falls-in-accsec-challenge","Final Sep 11 Women's · Stanford vs Penn State | L, 0-3 | /news/2026/09/12/stanford-swept-by-penn-state","Final Sep 13 Women's · Stanford vs Ohio | W, 3-0 | /news/2026/09/13/cardinal-sweeps-bobcats","Final Sep 17 Women's · Stanford vs Arizona State | L, 0-3 | /news/2026/09/18/stanford-falls-in-top-15-battle","Final Sep 18 Women's · Stanford vs Santa Clara | W, 3-1 | /news/2026/09/19/card-defeats-santa-clara-in-slo-classic","Final Sep 20 Women's · Stanford at Cal Poly | W, 3-1 | /news/2026/09/21/stanford-downs-cal-poly","Final Sep 25 Women's · Stanford at SMU | L, 0-3 | /news/2026/09/26/cardinal-falls-in-acc-opener","Final Sep 27 Women's · Stanford at Pittsburgh | L, 0-3 | /news/2026/09/28/cardinal-comes-up-short-at-pitt","Final Oct 2 Women's · Stanford vs Virginia Tech | W, 3-0 | /news/2026/10/03/stanford-secures-first-acc-win-wvb-2026","Final Oct 3 Women's · Stanford vs Virginia | W, 3-0 | /news/2026/10/04/blyashov-powers-card-past-virginia","Final Oct 9 Women's · Stanford at Notre Dame | W, 3-1 | /news/2026/10/09/stanford-fights-off-notre-dame","Final Oct 11 Women's · Stanford at Louisville | L, 0-3 | /news/2026/10/11/louisville-tops-stanford-in-top-15-battle"]);
assert.deepEqual(parse('Field Hockey',7).map(line),["Final Aug 28 Stanford vs Massachusetts-Lowell | W, 2-1 | /news/2026/08/29/comeback-cardinal-secures-season-opening-win","Final Aug 30 Stanford vs American | W, 3-1 | /news/2026/08/30/first-half-siege-secures-second-win","Final Aug 31 Stanford vs Central Mich. | W, 2-1 | /news/2026/08/31/horlock-secures-3-0-start","Final Sep 4 Stanford vs Bellarmine | W, 5-0 | /news/2026/09/04/cardinal-remains-perfect-following-friday-rout","Final Sep 11 Stanford at Holy Cross | W, 3-0 | /news/2026/09/12/cardinal-continues-hot-start","Final Sep 13 Stanford at Northeastern | W, 4-1 | /news/2026/09/13/fourth-quarter-flurry-propels-cardinal","Final Sep 17 Stanford vs Northwestern | L, 1-3 | /news/2026/09/18/stanford-stymied-by-top-ranked-northwestern","Final Sep 22 Stanford vs UC Davis | W, 4-1 | /news/2026/09/23/horlocks-brace-downs-davis","Final Sep 25 Stanford vs North Carolina | L, 1-8 | /news/2026/09/26/stanford-falls-in-acc-opener","Final Oct 2 Stanford at Virginia | L, 2-5 | /news/2026/10/02/cardinal-falls-in-road-acc-opener","Final Oct 4 Stanford at Louisville | L, 0-1 | /news/2026/10/04/comeback-bid-stalls-at-louisville","Final Oct 9 Stanford vs Duke | W, 3-2 (OT) | /news/2026/10/10/down-goes-no-3-duke","Final Oct 11 Stanford vs Wake Forest | L, 1-4 | /news/2026/10/11/stanford-falls-to-no-8-wake-forest","Upcoming Oct 16, 1:00 PM Stanford at UC Davis | ","Upcoming Oct 23, 2:00 PM Stanford at Syracuse | ","Upcoming Oct 25, 9:00 AM Stanford at Boston College | ","Upcoming Oct 29, 6:00 PM Stanford vs California | "]);
assert.deepEqual(parse('Water Polo',17).filter(e=>e.status!=='Upcoming').map(line),["Final Aug 29 Men's · Stanford vs Cal St. Fullerton | W, 16-4 | /news/2026/08/29/two-wins-to-open-2026","Final Aug 29 Men's · Stanford at UC Irvine | W, 22-12 | /news/2026/08/29/two-wins-to-open-2026","Final Sep 5 Men's · Stanford at Pepperdine | W, 14-6 | /news/2026/09/05/chatzis-scores-six-in-win-at-no-9-pepperdine","Final Sep 6 Men's · Stanford at UCSB | W, 24-13 | /news/2026/09/06/strong-second-half-powers-win","Final Sep 13 Men's · Stanford at Pacific | W, 19-6 | /news/2026/09/13/another-dominant-second-half","Final Sep 18 Men's · Stanford vs Santa Clara | W, 21-4 | /news/2026/09/19/cardinal-cruises-past-no-17-santa-clara","Final Sep 19 Men's · Stanford vs USC | W, 10-8 | /news/2026/09/20/cardinal-takes-down-no-2-trojans","Final Sep 19 Men's · Stanford vs Long Beach St. | W, 17-13 | /news/2026/09/20/cardinal-takes-down-no-2-trojans","Final Sep 20 Men's · Stanford vs UCLA | L, 10-11 | /news/2026/09/20/last-second-loss-to-no-1-ucla","Final Sep 25 Men's · Stanford vs San José St. | W, 16-10 | /news/2026/09/25/strong-second-half-sends-stanford-past-spartans","Final Sep 27 Men's · Stanford at UC Davis | W, 15-8 | /news/2026/09/27/cardinal-tops-no-16-aggies-to-move-to-10-1","Final Oct 3 Men's · Stanford at UCLA | W, 19-15 | /news/2026/10/03/top-ranked-bruins-taken-down-in-la","Final Oct 4 Men's · Stanford at USC | W, 16-12 | /news/2026/10/04/cardinal-completes-two-win-los-angeles-weekend","Final Oct 10 Men's · Stanford vs Santa Clara | W, 22-9 | /news/2026/10/10/spread-the-wealth"]);
// Golf: each round is an entry; a tournament's rounds are one event with its
// last round's place ("Rounds 1-2" and "Round 3" of the Windy City
// Collegiate). The Big Match is match play: a score.
assert.deepEqual(parse('Golf',23).map(line),["Final Sep 14 Women's · Stanford at The Jackson T. Stephens Cup | 6th of 6 | /news/2026/09/16/meja-makes-impressive-run-in-frisco","Final Sep 24 Women's · Stanford at Big Match | W, 4-0 | /news/2026/09/25/dominant-showing-in-big-match","Final Oct 5 Women's · Stanford at Windy City Collegiate | 1st of 12 | /news/2026/10/06/first-team-title-of-the-season-wgolf","Upcoming Oct 16, 11:45 AM Women's · Stanford at Stanford Intercollegiate | ","Upcoming Oct 26 Women's · Stanford at Nanea Invitational | ","Upcoming Feb 22 Women's · Stanford at Bruin Wave Invitational | ","Upcoming Mar 11 Women's · Stanford at The Nanea Cup | ","Upcoming Mar 22 Women's · Stanford at Charles Schwab Women's Collegiate | ","Upcoming Mar 22 Women's · Stanford at Silicon Valley Showcase | ","Upcoming Apr 5 Women's · Stanford at Silverado Showdown | ","Upcoming Apr 15 Women's · Stanford at ACC Championship | ","Upcoming May 10 Women's · Stanford at NCAA Stanford Regional | ","Upcoming May 21 Women's · Stanford at NCAA Championship | "]);
assert.deepEqual(parse('Golf',10).filter(e=>e.status==='Final').map(line),["Final Sep 7 Men's · Stanford at Bombs Darts Birds Collegiate | 4th of 13 | /news/2026/09/08/stanford-places-fourth-in-season-opener","Final Sep 18 Men's · Stanford at The Fighting Illini Invitational | 7th of 15 | /news/2026/09/20/stanford-seventh-at-olympia-fields","Final Sep 24 Men's · Stanford at The Big Match | W, 4-0 | /news/2026/09/25/dominant-showing-in-big-match","Final Sep 28 Men's · Stanford at Ben Hogan Collegiate Invitational | T14th of 16 | /news/2026/09/29/cardinal-wraps-up-at-colonial"]);
assert.deepEqual(parse('Golf',10).filter(e=>e.status==='Final').map(e=>e.end_time||null),["2026-09-08T23:59:59Z","2026-09-19T23:59:59Z",null,"2026-09-29T23:59:59Z"]);
// Swimming: the College Swimming League's opponents are one meet a day; its
// later rounds are later meets.
assert.deepEqual(parse('Swimming & Diving',29).slice(0,4).map(line),["Final Oct 2 Women's · Stanford at College Swimming League | 1st of 4 | /news/2026/10/03/late-wins-lift-cardinal-to-csl-victory","Upcoming Oct 16 Women's · Stanford at Cal / NC State Diving Meet | ","Upcoming Oct 16, 5:30 PM Women's · Stanford at College Swimming League | ","Upcoming Nov 5 Women's · Stanford at College Swimming League | "]);
assert.deepEqual(parse('Swimming & Diving',14).slice(0,6).map(line),["Final Oct 2 Men's · Stanford at CSL Match 1 | 1st of 4 | /news/2026/10/03/card-claims-dramatic-csl-win","Final Oct 3 Men's · Stanford at PAC Invite | No team score (individuals only) | /news/2026/10/03/card-claims-dramatic-csl-win","Upcoming Oct 16, 11:00 AM Men's · Stanford at Cal / NC State Diving Meet | ","Upcoming Oct 16, 3:00 PM Men's · Stanford at Slug Shootout | ","Upcoming Oct 16, 5:30 PM Men's · Stanford at CSL Match 2 | ","Upcoming Nov 5 Men's · Stanford at CSL Wild Card | "]);
assert.deepEqual(parse('Cross Country',4).map(line),["Final Sep 4 Stanford at USF Invitational | Women's team: 6th · 145 pts / Men's team: 5th · 150 pts | /news/2026/09/04/flynn-flies-to-victory","Final Sep 19 Stanford at John McNichols Invitational | Women's team: 1st · 18 pts (Open race) / Men's team: 4th · 205 pts | /news/2026/09/19/1-2-3-and-fourth","Final Oct 9 Stanford at Nuttycombe Invitational | Women's team: 12th · 417 pts / Men's team: 8th · 328 pts | /news/2026/10/09/fast-times-at-the-nutty","Upcoming Oct 17 Stanford at Bronco Invitational | ","Upcoming Oct 30 Stanford at ACC Championships | ","Upcoming Nov 13 Stanford at NCAA West Regional | ","Upcoming Nov 21 Stanford at NCAA Championships | "]);
assert.deepEqual(parse('Fencing',6).slice(0,2).map(line),["Final Oct 9 Stanford at October NAC | Individual results | /news/2026/10/12/four-medalists-at-october-nac","Upcoming Nov 7 Stanford at Western Invitational | "]);
assert.deepEqual(parse('Tennis',30).map(line),["Final Sep 21 Women's · Stanford at ITA All-American Championships | Completed | /news/2026/09/28/first-week-of-fall-concludes-for-womens-tennis","Final Sep 24 Women's · Stanford at USTA SoCal Intercollegiate Championships | Completed | /news/2026/09/28/first-week-of-fall-concludes-for-womens-tennis","Final Oct 8 Women's · Stanford at ITA Regional Championships | Completed | /news/2026/10/12/ahn-earns-ncaa-singles-berth","Upcoming Nov 5 Women's · Stanford at ITA Sectional Championships | ","Upcoming Nov 5 Women's · Stanford at Aztec Fall Invitational | ","Upcoming Nov 5 Women's · Stanford at ITA Conference Masters | ","Upcoming Nov 17 Women's · Stanford at NCAA Individual Championships | "]);
assert.deepEqual(parse('Tennis',15).slice(0,3).map(line),["Final Sep 19 Men's · Stanford at ITA All-American Championships | Completed | /news/2026/09/25/mens-tennis-concludes-opening-fall-tournament","Final Oct 1 Men's · Stanford at Battle in the Bay | Completed | /news/2026/10/04/grumet-krupkin-reach-doubles-semifinals-at-battle-in-the-bay","Today Oct 15 Men's · Stanford at ITA Regional Championships | "]);
assert.deepEqual(parse('Wrestling',33).slice(0,3).map(line),["Upcoming Nov 1 Stanford at Princeton Open | ","Upcoming Nov 13, 6:30 PM Stanford at CSU Bakersfield | ","Upcoming Nov 15, 1:00 PM Stanford vs Wyoming | "]);
assert.deepEqual(parse('Rowing',26).slice(0,2).map(line),["Upcoming Nov 8 Lightweight · Stanford at San Diego Fall Classic | ","Upcoming Mar 13 Lightweight · Stanford vs Saint Mary's | "]);
assert.deepEqual(parse('Basketball',9).slice(0,2).map(line),["Upcoming Oct 17, 7:00 PM Men's · Stanford at Santa Clara (Exhibition) | ","Upcoming Oct 25, 1:30 PM Men's · Stanford at Oregon (Exhibition) | "]);
// A tournament under way (the men's ITA Regional, Oct 15-20) is today's event
// with its last day.
{
  const regional=parse('Tennis',15).find(e=>/ITA Regional/.test(e.title));
  assert.deepEqual([regional.status,regional.recency_label,regional.end_time],['Today','In progress','2026-10-20T23:59:59Z']);
}
// Rules the season's data shows rarely, on the API's own shapes: a cancelled
// or hidden event, an intrasquad, an exhibition, a second opponent.
{
  const game=(name,extra={})=>({datetime:'2026-10-10T19:00:00.000000Z',status:'completed',venue_type:'home',opponent_name:name,schedule_event_result:{result:'win',winning_score:'3.0000',losing_score:'1.0000'},...extra});
  const readGames=(sport,id,games)=>worker.parseHtml(JSON.stringify({data:games}),school,sport,address(id),now).map(line);
  assert.deepEqual(readGames('Volleyball',31,[game('Oregon',{status:'canceled',datetime:'2026-10-20T23:00:00.000000Z',schedule_event_result:null}),game('Utah',{hide_from_specific_sport_schedule:true}),game('Cardinal & White Scrimmage'),game('Pacific',{is_exhibition:true})]),["Final Oct 10 Stanford vs Pacific (Exhibition) | W, 3-1"]);
  assert.deepEqual(readGames('Swimming & Diving',29,[game('UCLA',{second_opponent_name:'UC Santa Barbara',schedule_event_result:{result:'win',winning_score:'180.0000',losing_score:'120.0000'}})]),["Final Oct 10 Stanford vs UCLA and UC Santa Barbara | W, 180-120"]);
  // Entries of one tournament days apart are separate meets; a scored entry
  // is never merged.
  const entry=(datetime,text,extra={})=>({id:datetime,datetime,status:'completed',opponent_name:'X',tournament:{name:'League'},schedule_event_result:{result:'no_result',text},...extra});
  assert.deepEqual(mergeWmtMeetEntries([entry('2026-09-02T18:00:00Z','2nd'),entry('2026-09-01T18:00:00Z','5th'),entry('2026-09-20T18:00:00Z','1st'),entry('2026-09-20T19:00:00Z',null,{schedule_event_result:{result:'win',winning_score:'4.0000',losing_score:'0.0000'}})]).map(g=>[g.opponent_name,g.datetime,g.datetime_end??null,g.schedule_event_result.text??null]),[["League","2026-09-01T18:00:00Z","2026-09-02T18:00:00Z","2nd"],["X","2026-09-20T18:00:00Z",null,"1st"],["X","2026-09-20T19:00:00Z",null,null]]);
}

// A team with nothing this season yet is a valid empty schedule.
for(const [sport,id] of [['Baseball',2],['Beach Volleyball',3],['Gymnastics',24],['Lacrosse',25],['Softball',19],['Track & Field',21]]){const events=worker.parseHtml(fixture(`api-${id}-schedule.html.gz`),school,sport,address(id),now);assert.equal(events.length,0);assert.equal(worker.schoolModule('stanford').isEmptySchedule([],events),true,`${sport} is a valid empty schedule`);}
// Combined sports' events carry their team in the id as well as the label.
assert.ok(parse('Soccer',28).every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens')));
assert.ok(parse('Soccer',13).every(e=>e.team_label==="Men's"&&e.id.endsWith('-mens')));
assert.ok(parse('Rowing',26).every(e=>e.team_label==='Lightweight'&&e.id.endsWith('-lightweight')));

// Conference games are the site's own flags: field hockey's ACC games; water
// polo's league is the MPSF (UCLA, USC away Oct 3-4; not the September
// tournament games).
assert.deepEqual(parse('Field Hockey',7).filter(e=>e.status==='Final').map(e=>[e.opponent,e.conference_game,e.conference_name||null]),[["Massachusetts-Lowell",false,null],["American",false,null],["Central Mich.",false,null],["Bellarmine",false,null],["Holy Cross",false,null],["Northeastern",false,null],["Northwestern",false,null],["UC Davis",false,null],["North Carolina",true,null],["Virginia",true,null],["Louisville",true,null],["Duke",true,null],["Wake Forest",true,null]]);
assert.deepEqual(parse('Water Polo',17).filter(e=>e.status==='Final').map(e=>[e.opponent,e.conference_game,e.conference_name||null]),[["Cal St. Fullerton",false,null],["UC Irvine",false,null],["Pepperdine",false,null],["UCSB",false,null],["Pacific",false,null],["Santa Clara",false,null],["USC",false,null],["Long Beach St.",false,null],["UCLA",false,null],["San José St.",false,null],["UC Davis",false,null],["UCLA",true,"MPSF"],["USC",true,"MPSF"],["Santa Clara",false,null]]);

// Each final's story is the site's own, dated the day it was played or within
// three days after; another event's story is not.
{
  const h=worker.stanfordHandlers,finals=parse('Volleyball',31).filter(e=>e.recap_url);
  for(const event of finals)for(const other of finals)assert.equal(h.matchesRecap('',event,other.recap_url),event===other,`${event.opponent} against ${other.opponent}'s story`);
  const [game]=finals;
  assert.equal(h.matchesRecap('',{...game,recap_url:'https://gostanford.com/news/2026/09/30/late-story'},'https://gostanford.com/news/2026/09/30/late-story'),false,'a story days after the game is not its own');
  // The cross country meets read their TFRRS races.
  assert.ok(parse('Cross Country',4).filter(e=>e.status==='Final').every(e=>h.isCrossCountry(e)));
}

// Athletes: Golf and Water Polo pin three from their profiles; Swimming one.
assert.deepEqual(Object.keys(stanfordSchool.verifiedInstagrams).map(key=>key.split('|').slice(1).join('|')),["Golf|Meja Örtengren","Golf|Leigh Chien","Golf|Anna Song","Swimming & Diving|Charlotte Hook","Water Polo|Konstantinos Mathiopoulos","Water Polo|Harrison Rohlen","Water Polo|Gavin West"]);

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Stanford module checks passed');
