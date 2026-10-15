import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {notreDameSchool,notreDameLocalTime,notreDameScore,notreDameMeetResult} from '../src/schools/notre-dame.mjs';
import {rosterSocialInstagrams} from '../src/roster-socials.js';
import {createSourceFetch,SOURCE_TTL} from '../src/source-fetch.mjs';
import {schoolModuleDeps} from './school-module-deps.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const schools=JSON.parse(read('../src/schools.json')),sponsoredSports=JSON.parse(read('../src/sponsored-sports.json'));
const school=schools.find(s=>s.id==='notre-dame');
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
const worker=Function(...Object.keys(deps),source+';return {officialCardInstagram,verifiedInstagram,verifiedInstagram,featuredAthletes,rosterPositions,rosterProfiles,candidateUrls,rosterUrls,schoolCombinedSports,parseHtml,groupEvents,attachOfficialHighlights,recapMatchesEvent,liveScoreboardProviders,parseScoreboardPayload,reconcileScoreboardEvents,labelTeamEvents,fetchLive,notreDameHandlers,attachOfficialMeetResults,decodeHtml,schoolModule,rosterProfiles};')(...Object.values(deps));
const fixture=name=>gunzipSync(readFileSync(new URL('./fixtures/notre-dame-module/'+name,import.meta.url))).toString('utf8');

// Module ownership: every sponsored sport reads fightingirish.com's schedule
// API, one address per team (its sport id), and its roster pages.
const sports=sponsoredSports['notre-dame'];
assert.equal(sports.length,15);
assert.deepEqual(Object.keys(notreDameSchool.scheduleUrls).map(key=>key.split('|')[1]).sort(),[...sports].sort());
for(const [name,map] of [['schedule',notreDameSchool.scheduleUrls],['roster',notreDameSchool.rosterUrls]]){
  for(const [key,value] of Object.entries(map)){
    assert.ok(key.startsWith('notre-dame|'),'module keys must carry the exact school identity');
    assert.ok(sports.includes(key.split('|')[1]),`${key} must be a sponsored sport`);
    for(const url of [].concat(value)){
      assert.equal(new URL(url).hostname,'fightingirish.com',`${key} must stay on fightingirish.com`);
      if(name==='schedule')assert.match(url,/^https:\/\/fightingirish\.com\/website-api\/schedule-events\?filter%5Bschedule\.sport_id%5D=\d+&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament$/);
    }
  }
}
for(const sport of sports){
  assert.deepEqual(worker.candidateUrls(school,sport),[].concat(notreDameSchool.scheduleUrls[`notre-dame|${sport}`]));
  assert.ok(!read('../src/index.js').includes("'notre-dame|"+sport+"':"),`${sport} routes must live in the Notre Dame module, not shared code`);
}
assert.deepEqual(sports.filter(sport=>worker.schoolCombinedSports(school).has(sport)),['Basketball','Golf','Lacrosse','Soccer','Tennis']);

const now=new Date("2026-10-15T15:00:00Z");
// Each team's API address; its fixture is api-<sport id>-schedule.html.gz.
const address=id=>Object.values(notreDameSchool.scheduleUrls).flat().find(url=>url.includes(`sport_id%5D=${id}&`));
const parse=(sport,id,at=now)=>worker.labelTeamEvents(worker.parseHtml(fixture(`api-${id}-schedule.html.gz`),school,sport,address(id),at),school,sport,address(id));
const line=e=>`${e.status} ${e.display_time} ${e.title} | ${e.headline||''}${e.recap_url?' | '+new URL(e.recap_url).pathname:''}`;

// The site's times are Eastern; midnight, and an event marked all day or TBA,
// publish no time.
assert.deepEqual([['2026-10-10T19:30:00.000000Z'],['2026-10-30T04:00:00.000000Z'],['2026-12-05T05:00:00.000000Z'],['2026-11-14T14:05:00Z'],['2026-11-14T14:05:00Z',{untimed:true}]].map(([iso,options])=>{const t=notreDameLocalTime(iso,options);return[t.date,t.time];}),[['Oct 10, 2026','3:30 PM'],['Oct 30, 2026',null],['Dec 5, 2026',null],['Nov 14, 2026','9:05 AM'],['Nov 14, 2026',null]]);
// Scores: the site stores the winner's and the loser's; the team's comes first.
assert.deepEqual([{result:'win',winning_score:'41.0000',losing_score:'13.0000'},{result:'loss',winning_score:'4.0000',losing_score:'1.0000'},{result:'tie',winning_score:'1.0000',losing_score:'1.0000'},{result:'win',winning_score:'2.0000',losing_score:'1.0000',text:'OT'},{result:'no_result',text:'T-2nd, 839 (-13)'}].map(r=>notreDameScore(r)?.text??null),['W, 41-13','L, 1-4','T, 1-1','W, 2-1 (OT)',null]);
// Meets: golf's place with the team score; cross country's team places.
assert.deepEqual([['T-2nd, 839 (-13)','Golf'],['5th, 880 (+16)','Golf'],['W - 2nd | M - 1st','Cross Country']].map(([text,sport])=>notreDameMeetResult(text,sport)),[{headline:'T2nd',results:[{label:'Result',value:'T2nd'},{label:'Team score',value:'839 (-13)'}]},{headline:'5th',results:[{label:'Result',value:'5th'},{label:'Team score',value:'880 (+16)'}]},{headline:"Women's team: 2nd / Men's team: 1st",results:[{label:"Women's team",value:'2nd'},{label:"Men's team",value:'1st'}]}]);

// Every team, read from the API as the schedule page shows it: finals with
// their scores and stories, meets with their places, upcoming events with
// their Eastern times. Exhibitions are labeled; a past game or meet with no
// result and no story is not listed (soccer's exhibitions, fencing's October
// NAC, women's tennis's ITA Midwest Regionals); the tennis pages' pro events
// ("M15 Ann Arbor", "Sumter W15") are not the team's.
assert.deepEqual(parse('Football',8).map(line),["Final Sep 6 Notre Dame vs Wisconsin | W, 41-13 | /news/2026/09/07/irish-dominate-badgers-41-13","Final Sep 12 Notre Dame vs Rice | W, 52-0 | /news/2026/09/12/irish-bowl-over-rice-52-0","Final Sep 19 Notre Dame vs Michigan State | W, 27-10 | /news/2026/09/20/irish-post-another-stellar-second-half-in-27-10-victory","Final Sep 26 Notre Dame at Purdue | W, 49-10 | /news/2026/09/26/irish-crush-purdue-49-10","Final Oct 3 Notre Dame at North Carolina | W, 37-26 | /news/2026/10/03/irish-reign-in-the-rain-defeat-north-carolina-37-26","Final Oct 10 Notre Dame vs Stanford | W, 58-7 | /news/2026/10/10/irish-run-past-stanford-58-7","Upcoming Oct 17, 7:30 PM Notre Dame at BYU | ","Upcoming Oct 31, 12:00 PM Notre Dame vs Navy | ","Upcoming Nov 7, 7:30 PM Notre Dame vs Miami (FL) | ","Upcoming Nov 14, 3:30 PM Notre Dame vs Boston College | ","Upcoming Nov 21, 7:30 PM Notre Dame vs SMU | ","Upcoming Nov 28 Notre Dame at Syracuse | "]);
assert.deepEqual(parse('Soccer',16).filter(e=>e.status!=='Upcoming').map(line),["Final Aug 12 Women's · Notre Dame vs Samford | T, 0-0 | /news/2026/08/13/irish-draw-in-season-opener","Final Aug 16 Women's · Notre Dame vs Penn State | T, 2-2 | /news/2026/08/16/2-irish-finish-with-2-2-draw-against-penn-state","Final Aug 20 Women's · Notre Dame at Nebraska | T, 1-1 | /news/2026/08/21/irish-draw-1-1-at-nebraska","Final Aug 23 Women's · Notre Dame vs Murray State | W, 3-0 | /news/2026/08/23/8-irish-defeat-racers-in-3-0-victory","Final Aug 27 Women's · Notre Dame at Michigan | T, 1-1 | /news/2026/08/28/irish-draw-against-michigan-wolverines","Final Sep 3 Women's · Notre Dame vs Michigan State | T, 2-2 | /news/2026/09/04/canada-and-codd-score-in-2-2-draw-against-4-michigan-state","Final Sep 6 Women's · Notre Dame vs IU Indy | W, 8-0 | /news/2026/09/06/irish-dominate-in-8-0-win-over-iu-indy-on-senior-day","Final Sep 11 Women's · Notre Dame vs Clemson | W, 2-1 | /news/2026/09/12/irish-take-down-24-clemson-in-2-1-win","Final Sep 18 Women's · Notre Dame vs Boston College | W, 4-0 | /news/2026/09/19/17-irish-defeat-boston-college-in-4-0-victory","Final Sep 24 Women's · Notre Dame at Duke | T, 1-1 | /news/2026/09/25/no-15-irish-battle-to-1-1-draw-at-4-duke","Final Oct 2 Women's · Notre Dame at North Carolina | L, 1-4 | /news/2026/10/03/12-irish-fall-at-1-north-carolina","Final Oct 8 Women's · Notre Dame vs Virginia | W, 1-0 | /news/2026/10/09/18-irish-take-down-14-virginia-cavaliers-in-1-0-victory","Today Oct 15, 7:00 PM Women's · Notre Dame vs Pitt | "]);
assert.deepEqual(parse('Soccer',15).filter(e=>e.status!=='Upcoming').map(line),["Final Aug 20 Men's · Notre Dame at Indiana | L, 1-3 | /news/2026/08/21/irish-fall-3-1-to-22-indiana-in-season-opener","Final Aug 23 Men's · Notre Dame vs Northwestern | T, 1-1 | /news/2026/08/24/capretto-scores-in-1-1-draw-against-northwestern","Final Aug 28 Men's · Notre Dame vs Saint Louis | T, 1-1 | /news/2026/08/29/irish-battle-for-1-1-draw-against-8-saint-louis-with-late-equalizer-from-tropeano","Final Aug 31 Men's · Notre Dame vs Harvard | W, 3-1 | /news/2026/09/01/irish-take-down-harvard-in-3-1-victory","Final Sep 6 Men's · Notre Dame vs Michigan | W, 2-1 | /news/2026/09/06/late-goals-from-zimmermann-and-shaul-secure-2-1-victory-over-michigan","Final Sep 11 Men's · Notre Dame at Clemson | W, 1-0 | /news/2026/09/12/tropeano-game-winning-goal-secures-1-0-win-at-17-clemson","Final Sep 15 Men's · Notre Dame vs Detroit Mercy | W, 4-0 | /news/2026/09/16/20-irish-remain-undefeated-at-home-with-4-0-win-over-detroit-mercy","Final Sep 20 Men's · Notre Dame at Stanford | W, 3-1 | /news/2026/09/21/20-irish-take-down-1-stanford-on-the-road","Final Sep 25 Men's · Notre Dame vs Syracuse | L, 0-1 | /news/2026/09/26/10-irish-fall-to-syracuse","Final Sep 29 Men's · Notre Dame at UIC | T, 1-1 | /news/2026/09/30/13-irish-finish-with-1-1-draw-at-uic","Final Oct 3 Men's · Notre Dame vs Cal | L, 0-2 | /news/2026/10/04/13-irish-fall-to-cal-golden-bears","Final Oct 10 Men's · Notre Dame at North Carolina | L, 1-7 | /news/2026/10/11/irish-fall-at-north-carolina"]);
assert.deepEqual(parse('Volleyball',22).filter(e=>e.status==='Final').map(line),["Final Aug 28 Notre Dame vs Ball State | L, 2-3 | /news/2026/08/29/irish-fall-to-ball-state-in-season-opener","Final Aug 30 Notre Dame vs Xavier | L, 1-3 | /news/2026/08/30/irish-come-up-short-to-xavier","Final Sep 5 Notre Dame at Toledo | W, 3-1 | /news/2026/09/05/helmers-career-day-lifts-irish-over-toledo-for-first-win-of-the-season","Final Sep 8 Notre Dame at Georgia | L, 1-3 | /news/2026/09/09/irish-drop-midweek-match-at-georgia","Final Sep 11 Notre Dame vs Northern Kentucky | L, 1-3 | /news/2026/09/11/irish-fall-short-to-northern-kentucky","Final Sep 12 Notre Dame vs Duquesne | L, 2-3 | /news/2026/09/12/irish-drop-five-setter-to-duquesne","Final Sep 13 Notre Dame at College of Charleston | L, 0-3 | /news/2026/09/13/irish-fall-to-college-of-charleston","Final Sep 18 Notre Dame vs Eastern Illinois | W, 3-0 | /news/2026/09/19/irish-sweep-eastern-illinois-to-get-back-in-win-column","Final Sep 20 Notre Dame at Eastern Illinois | W, 3-0 | /news/2026/09/20/irish-sweep-eiu-to-close-perfect-weekend","Final Sep 25 Notre Dame at Boston College | L, 1-3 | /news/2026/09/25/irish-drop-conference-opener-to-boston-college","Final Sep 27 Notre Dame at Syracuse | W, 3-0 | /news/2026/09/27/irish-dominate-orange-in-three-sets","Final Sep 30 Notre Dame at Louisville | L, 0-3 | /news/2026/10/01/irish-fall-at-4-louisville","Final Oct 3 Notre Dame vs Louisville | L, 0-3 | /news/2026/10/03/irish-come-up-short-against-4-louisville","Final Oct 9 Notre Dame vs Stanford | L, 1-3 | /news/2026/10/09/irish-fall-short-to-14-stanford","Final Oct 11 Notre Dame vs Cal | L, 0-3 | /news/2026/10/11/irish-fall-sunday-to-cal"]);
assert.deepEqual(parse('Golf',9).map(line),["Final Sep 7 Men's · Notre Dame at Folds of Honor Collegiate | T2nd | /news/2026/09/10/irish-tie-for-second-at-folds-of-honor-collegiate","Final Sep 13 Men's · Notre Dame at Canadian Collegiate Invitational | 2nd | /news/2026/09/15/irish-complete-canadian-collegiate-invitational-with-second-place-finish","Final Sep 28 Men's · Notre Dame at Windon Memorial Classic | 3rd | /news/2026/09/29/irish-mens-golf-finishes-third-at-windon-memorial","Final Oct 4 Men's · Notre Dame at Fighting Irish Classic | 3rd | /news/2026/10/05/notre-dame-finishes-third-at-fighting-irish-classic","Upcoming Oct 18 Men's · Notre Dame at Williams Cup | "]);
assert.deepEqual(parse('Golf',10).map(line),["Final Sep 13 Women's · Notre Dame at Badger Invitational | 5th | /news/2026/09/15/irish-place-fifth-at-season-opening-badger-invitational","Final Sep 26 Women's · Notre Dame at Fighting Irish Classic | T4th | /news/2026/09/27/irish-tie-for-fourth-at-fighting-irish-classic","Final Oct 2 Women's · Notre Dame at Ron Moore Invitational | T5th | /news/2026/10/04/irish-log-top-five-finish-at-ron-moore-intercollegiate","Upcoming Oct 18 Women's · Notre Dame at Jim West Challenge | "]);
assert.deepEqual(parse('Cross Country',6).map(line),["Final Sep 18 Notre Dame at National Catholic Invite | Women's team: 1st / Men's team: 1st","Final Oct 2 Notre Dame at Joe Piane Notre Dame Invite | Women's team: 2nd / Men's team: 1st | /news/2026/10/2/irish-men-claim-joe-piane-team-title-irish-women-finish-runner-up","Upcoming Oct 16, 10:30 AM Notre Dame at Pre-Nationals | ","Upcoming Oct 30 Notre Dame at ACC Championship | ","Upcoming Nov 13 Notre Dame at NCAA Regional | ","Upcoming Nov 21 Notre Dame at NCAA Championship | "]);
assert.deepEqual(parse('Tennis',19).filter(e=>e.status!=='Upcoming').map(line),["Final Sep 11 Men's · Notre Dame at Milwaukee Classic | Completed | /news/2026/09/14/irish-kickstart-fall-action-at-milwaukee-classic","Final Sep 19 Men's · Notre Dame at ITA All-American Championships | Completed | /news/2026/09/21/ita-all-american-championship-updates","Final Sep 25 Men's · Notre Dame at Fighting Irish Mini Duals | Completed | /news/2026/09/28/freshman-alex-suhanitski-goes-3-1-at-fighting-irish-mini-duals","Final Oct 2 Men's · Notre Dame at Hope RSM Dual for the Shoe | Completed | /news/2026/10/5/thompsonmagimay-are-dual-for-the-shoe-champs","Today Oct 15 Men's · Notre Dame at ITA Midwest Regional Championships | "]);
assert.deepEqual(parse('Tennis',20).map(line),["Final Sep 19 Women's · Notre Dame at ITA All-Americans | Completed | /news/2026/09/21/ita-all-american-updates","Upcoming Oct 22 Women's · Notre Dame at TCU Jae Foundation Open | ","Upcoming Nov 5 Women's · Notre Dame at Sectional Championships | ","Upcoming Nov 5 Women's · Notre Dame at Conference Masters | ","Upcoming Nov 6 Women's · Notre Dame at MSU Invitational | ","Upcoming Nov 17 Women's · Notre Dame at Individual NCAA Championships | "]);
assert.deepEqual(parse('Hockey',11).filter(e=>e.status==='Final'||/Quarterfinals/.test(e.title)).map(line),["Final Oct 2 Notre Dame vs USNTDP (Exhibition) | W, 4-2 | /news/2026/10/03/irish-defeat-usntdp-in-preseason-tuneup-4-2","Final Oct 3 Notre Dame vs Toronto (Exhibition) | W, 2-1 (OT) | /news/2026/10/03/irish-win-final-preseason-tuneup-over-toronto-2-1","Final Oct 8 Notre Dame vs Niagara | W, 3-1 | /news/2026/10/8/irish-down-niagara-in-season-opening-win-3-1","Final Oct 9 Notre Dame vs Niagara | W, 4-0 | /news/2026/10/10/irish-shutout-niagara-in-4-0-victory","Upcoming Mar 10 Notre Dame at Big Ten Quarterfinals | "]);
assert.deepEqual(parse('Basketball',4).filter(e=>/Exhibition|Players Era|Villanova/.test(e.title)).map(line),["Upcoming Oct 17, 7:00 PM Men's · Notre Dame at Dayton (Exhibition) | ","Upcoming Oct 23, 7:00 PM Men's · Notre Dame at DePaul (Exhibition) | ","Upcoming Nov 1, 9:30 AM Men's · Notre Dame vs Villanova | ","Upcoming Nov 18 Men's · Notre Dame at Players Era 8 | ","Upcoming Nov 19 Men's · Notre Dame at Players Era 8 | "]);
assert.deepEqual(parse('Fencing',7).slice(0,3).map(line),["Upcoming Nov 14 Notre Dame at Elite Invitational | ","Upcoming Nov 20 Notre Dame at USA Fencing NAC | ","Upcoming Jan 8 Notre Dame at USA Fencing NAC & Junior Olympics | "]);
assert.deepEqual(parse('Swimming & Diving',18).slice(0,4).map(line),["Upcoming Oct 17, 1:00 PM Notre Dame at Wisconsin | ","Upcoming Oct 22, 2:30 PM Notre Dame vs Louisville | ","Upcoming Oct 23, 3:00 PM Notre Dame at Northwestern | ","Upcoming Oct 28 Notre Dame at USA Short Course World Championship Trials | "]);
assert.deepEqual(parse('Baseball',3).map(line),["Upcoming Oct 17, 1:00 PM Notre Dame at UIC (Exhibition) | ","Upcoming Oct 24, 1:00 PM Notre Dame at Valpo (Exhibition) | "]);
assert.deepEqual(parse('Lacrosse',13).map(line),["Upcoming Oct 18, 9:30 AM Women's · Notre Dame at Penn (Exhibition) | ","Upcoming Oct 18, 11:30 AM Women's · Notre Dame vs Syracuse (Exhibition) | ","Upcoming Nov 6, 8:00 PM Women's · Notre Dame vs Northwestern (Exhibition) | "]);
// Rules the season's data shows rarely, on the API's own shapes: a
// cancelled or hidden event, an intrasquad, an exhibition labeled only in its
// name, a second opponent (a double dual; fencing's "Women's Team Meet" names
// the team instead), and a tournament under way (the men's ITA Midwest
// Regional, Oct 15-19, on Oct 16) with its last day.
{
  const game=(name,extra={})=>({datetime:'2026-10-10T17:00:00.000000Z',status:'completed',venue_type:'home',opponent_name:name,schedule_event_result:{result:'win',winning_score:'3.0000',losing_score:'1.0000'},...extra});
  const read=(sport,id,games)=>worker.parseHtml(JSON.stringify({data:games}),school,sport,address(id),now).map(line);
  assert.deepEqual(read('Volleyball',22,[game('Bradley',{status:'canceled',datetime:'2026-10-20T23:00:00.000000Z',schedule_event_result:null}),game('Butler',{status:'postponed',datetime:'2026-10-21T23:00:00.000000Z',schedule_event_result:null}),game('Dayton',{hide_from_specific_sport_schedule:true}),game('Blue-Gold Scrimmage'),game('Intrasquad'),game('Valpo (Exh.)'),game('Toledo')]),["Final Oct 10 Notre Dame vs Valpo (Exhibition) | W, 3-1","Final Oct 10 Notre Dame vs Toledo | W, 3-1"]);
  assert.deepEqual(read('Swimming & Diving',18,[game('Purdue',{second_opponent_name:'Illinois',schedule_event_result:{result:'win',winning_score:'180.0000',losing_score:'120.0000'}})]),["Final Oct 10 Notre Dame vs Purdue and Illinois | W, 180-120"]);
  assert.deepEqual(parse('Fencing',7).filter(e=>/Beguinet|Miller/.test(e.title)).map(e=>e.opponent),['Alex & Elizabeth Beguinet Classic','Ron Miller Invitational']);
  const regional=parse('Tennis',19,new Date('2026-10-16T15:00:00Z')).find(e=>/ITA Midwest/.test(e.title));
  assert.deepEqual([regional.status,regional.recency_label,regional.end_time],['Today','In progress','2026-10-19T23:59:59Z']);
  assert.deepEqual(parse('Golf',9).filter(e=>e.status==='Final').map(e=>e.end_time),['2026-09-09T23:59:59Z','2026-09-15T23:59:59Z','2026-09-29T23:59:59Z','2026-10-05T23:59:59Z']);
}

// Chloe Hooker's profile links "https://instagram.com/www.instagram.com/chloe._.hooker/"
// (volleyball, Oct 15): the inner handle, on the roster card and the profile.
assert.equal(worker.officialCardInstagram('https://instagram.com/www.instagram.com/chloe._.hooker/'),'https://www.instagram.com/chloe._.hooker/');
assert.equal(worker.verifiedInstagram('<a href="https://instagram.com/www.instagram.com/chloe._.hooker/">x</a>'),'https://www.instagram.com/chloe._.hooker/');

// A team with nothing this season yet is a valid empty schedule.
for(const [sport,id] of [['Lacrosse',12],['Rowing',14],['Softball',17],['Track & Field',21]]){const events=worker.parseHtml(fixture(`api-${id}-schedule.html.gz`),school,sport,address(id),now);assert.equal(events.length,0);assert.equal(worker.schoolModule('notre-dame').isEmptySchedule([],events),true,`${sport} is a valid empty schedule`);}
// Combined sports' events carry their team in the id as well as the label.
assert.ok(parse('Soccer',16).every(e=>e.team_label==="Women's"&&e.id.endsWith('-womens')));
assert.ok(parse('Soccer',15).every(e=>e.team_label==="Men's"&&e.id.endsWith('-mens')));

// Conference games are the site's own flags: women's soccer's ACC games, not
// its non-conference ones or exhibitions; football is independent; hockey
// plays in the Big Ten.
assert.deepEqual(parse('Soccer',16).filter(e=>e.status==='Final').map(e=>[e.opponent,e.conference_game]),[["Samford",false],["Penn State",false],["Nebraska",false],["Murray State",false],["Michigan",false],["Michigan State",false],["IU Indy",false],["Clemson",true],["Boston College",true],["Duke",true],["North Carolina",true],["Virginia",true]]);
assert.ok(parse('Football',8).every(e=>e.conference_game===false));
assert.deepEqual(parse('Hockey',11).filter(e=>e.status==='Final').map(e=>[e.opponent,e.conference_game,e.conference_name]),[["USNTDP (Exhibition)",false,"Big Ten"],["Toronto (Exhibition)",false,"Big Ten"],["Niagara",false,"Big Ten"],["Niagara",false,"Big Ten"]]);

// Each final's story is the site's own (its post-event article or "Recap"
// link), dated the day it was played or within three days after; another
// event's story is not.
{
  const h=worker.notreDameHandlers,finals=parse('Soccer',16).filter(e=>e.recap_url);
  for(const event of finals)for(const other of finals)assert.equal(h.matchesRecap('',event,other.recap_url),event===other,`${event.opponent} against ${other.opponent}'s story`);
  const [game]=finals;
  assert.equal(h.matchesRecap('',{...game,recap_url:'https://fightingirish.com/news/2026/09/30/late-story'},'https://fightingirish.com/news/2026/09/30/late-story'),false,'a story days after the game is not its own');
  // The cross country meets read their TFRRS races.
  assert.ok(parse('Cross Country',6).filter(e=>e.status==='Final').every(e=>h.isCrossCountry(e)));
}

assert.equal(requests.length,0,'no unexpected network requests');
console.log('Notre Dame module checks passed');
