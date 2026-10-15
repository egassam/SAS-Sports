import {createTfrrsMeetResults} from '../sidearm-school-kit.mjs';

// Notre Dame school module. Shared publisher utilities stay in the Worker;
// this file owns fightingirish.com's schedule source, Notre Dame's program
// combinations, its verified Instagram tags and its schedule reader.
//
// fightingirish.com is a WMT (Nuxt) site whose schedule pages render no
// events: the page loads them from the site's own JSON API
// (/website-api/schedule-events, checked Oct 15). The reader reads that API,
// the same official data the page shows: each event's date, venue, opponent,
// conference flag, result (win/loss/tie with both scores, or a meet's text
// such as golf's "T-2nd, 839 (-13)"), its story (post-event article) and its
// links ("Recap").
const HOST='fightingirish.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={baseball:3,mbball:4,wbball:5,cross:6,fencing:7,football:8,mgolf:9,wgolf:10,mhockey:11,mlax:12,wlax:13,wrow:14,msoc:15,wsoc:16,softball:17,swim:18,mten:19,wten:20,track:21,wvball:22};
// The latest 100 events of a team, newest first: the whole current season
// (the most is men's tennis, 43 in 2026-27) and the end of the last.
const api=slug=>`https://${HOST}/website-api/schedule-events?filter%5Bschedule.sport_id%5D=${SPORT_IDS[slug]}&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament`;
const schedulePage=slug=>`https://${HOST}/sports/${slug}/schedule`;
const SLUGS={
  'Baseball':['baseball'],'Basketball':['mbball','wbball'],'Cross Country':['cross'],'Fencing':['fencing'],'Football':['football'],
  'Golf':['mgolf','wgolf'],'Hockey':['mhockey'],'Lacrosse':['mlax','wlax'],'Rowing':['wrow'],'Soccer':['wsoc','msoc'],'Softball':['softball'],
  'Swimming & Diving':['swim'],'Tennis':['mten','wten'],'Track & Field':['track'],'Volleyball':['wvball']
};
const TEAMS={mbball:"Men's",wbball:"Women's",mgolf:"Men's",wgolf:"Women's",mlax:"Men's",wlax:"Women's",msoc:"Men's",wsoc:"Women's",mten:"Men's",wten:"Women's"};

export const notreDameSchool={
  id:'notre-dame',
  // Sports whose official schedule this module reads itself (the site's
  // schedule API). Every other sport keeps the shared parsers.
  apiSports:new Set(Object.keys(SLUGS)),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Hockey':[{path:'hockey/mens-college-hockey',sourceName:'Live college hockey scoreboard'}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate schedules; both are shown,
  // labeled by team.
  combinedSports:new Set(['Basketball','Golf','Lacrosse','Soccer','Tennis']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:Object.fromEntries(Object.entries(TEAMS).map(([slug,team])=>[api(slug),team])),
  verifiedInstagrams:{
    'notre-dame|Cross Country|Daelen Ackley':'https://www.instagram.com/daelenackley/',
    'notre-dame|Cross Country|Ethan Coleman':'https://www.instagram.com/ethanmc04/',
    'notre-dame|Cross Country|Brody Hartley':'https://www.instagram.com/brody_hartley/',
    'notre-dame|Golf|Jacob Modleski':'https://www.instagram.com/jmods9/',
    'notre-dame|Golf|Pavel Tsar':'https://www.instagram.com/pavel_tsar25/',
    'notre-dame|Golf|Lance Hollingshead':'https://www.instagram.com/launcedeboumb/',
    'notre-dame|Softball|Lily Hagan':'https://www.instagram.com/lily.hagann/',
    'notre-dame|Softball|Sydny Poeck':'https://www.instagram.com/sydny.poeck/',
    'notre-dame|Softball|Molly Conner':'https://www.instagram.com/mollyyconner/'
  },
  // Each team's API address (api() above, one sport id per team).
  scheduleUrls:{
    'notre-dame|Baseball':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Basketball':['https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'notre-dame|Cross Country':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Fencing':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Football':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Golf':['https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'notre-dame|Hockey':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Lacrosse':['https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'notre-dame|Rowing':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Soccer':['https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'notre-dame|Softball':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Swimming & Diving':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Tennis':['https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'notre-dame|Track & Field':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=21&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'notre-dame|Volleyball':'https://fightingirish.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'notre-dame|Baseball':'https://fightingirish.com/sports/baseball/roster',
    'notre-dame|Basketball':['https://fightingirish.com/sports/mbball/roster','https://fightingirish.com/sports/wbball/roster'],
    'notre-dame|Cross Country':'https://fightingirish.com/sports/cross/roster',
    'notre-dame|Fencing':'https://fightingirish.com/sports/fencing/roster',
    'notre-dame|Football':'https://fightingirish.com/sports/football/roster',
    'notre-dame|Golf':['https://fightingirish.com/sports/mgolf/roster','https://fightingirish.com/sports/wgolf/roster'],
    'notre-dame|Hockey':'https://fightingirish.com/sports/mhockey/roster',
    'notre-dame|Lacrosse':['https://fightingirish.com/sports/mlax/roster','https://fightingirish.com/sports/wlax/roster'],
    'notre-dame|Rowing':'https://fightingirish.com/sports/wrow/roster',
    'notre-dame|Soccer':['https://fightingirish.com/sports/wsoc/roster','https://fightingirish.com/sports/msoc/roster'],
    'notre-dame|Softball':'https://fightingirish.com/sports/softball/roster',
    'notre-dame|Swimming & Diving':'https://fightingirish.com/sports/swim/roster',
    'notre-dame|Tennis':['https://fightingirish.com/sports/mten/roster','https://fightingirish.com/sports/wten/roster'],
    'notre-dame|Track & Field':'https://fightingirish.com/sports/track/roster',
    'notre-dame|Volleyball':'https://fightingirish.com/sports/wvball/roster'
  }
};

// Notre Dame's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const NOTRE_DAME_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/IN_college_f_Notre_Dame_IN.html',Men:'https://www.tfrrs.org/teams/xc/IN_college_m_Notre_Dame_IN.html'};
const TIME_ZONE='America/New_York';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// A game sport's event named after a tournament ("ACC Championship") is
// "Notre Dame at ...", as K-State's tournaments are; so is a bracket game
// named after its tournament ("Players Era 8", men's basketball, Nov 18-19).
const GAME_EVENT=/\b(?:tournament|championships?|final four|regionals?|rounds?|(?:quarter|semi)?finals?|bowl)\b/i;
// An event, not a team: a dual is "vs"/"at" its opponent, a meet "at".
const EVENT_NAME=/\b(?:invit\w*|invite|classic|championships?|open|relays|duals|collegiate|intercollegiate|tournament|festival|cup|regionals?|nationals?|trials|NAC|olympics|series|fest|meet)\b/i;
// The tennis pages list players' pro events ("M15 Ann Arbor", "Sumter W15").
const PRO_EVENT=/^(?:\d{4}\s+)?(?:ITF|ATP|WTA)\b|\bFutures\b|\b[MW]\d{2,3}\b|\bUTR\b/i;
// Internal events: intrasquads, scrimmages, "Blue-Gold".
const INTERNAL=/\bintrasquad\b|\bscrimmages?\b|^blue\s*(?:&|and|-|\/|vs\.?)\s*gold\b/i;

// The event's wall clock in South Bend (Eastern): "Oct 3, 2026" and "12:00
// PM". Midnight is a day without a time, as is an event the site marks all
// day or TBA (the page shows any other time as stored).
export function notreDameLocalTime(iso,{untimed=false}={}){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
  const year=Number(parts.year),month=Number(parts.month),day=Number(parts.day),hour=Number(parts.hour)%24,minute=Number(parts.minute);
  const timed=!untimed&&(hour||minute);
  return{year,month,day,day_ms:Date.UTC(year,month-1,day),date:`${MONTHS[month-1]} ${day}, ${year}`,time:timed?`${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`:null};
}
// A score as the site stores it ("41.0000").
const points=value=>{const n=Number(value);return value!=null&&value!==''&&Number.isFinite(n)?String(n):null;};
// The team's score first: the site stores the winner's and the loser's.
export function notreDameScore(result){
  const won=points(result?.winning_score),lost=points(result?.losing_score);
  if(!result||won==null||lost==null)return null;
  const outcome={win:'W',loss:'L',tie:'T'}[result.result];if(!outcome)return null;
  const [mine,theirs]=outcome==='L'?[lost,won]:[won,lost];
  // Extra time ("OT", "2OT") or a shootout after the score.
  const note=String(result.text||'').trim();
  return{outcome,mine,theirs,text:`${outcome}, ${mine}-${theirs}${/^(?:\d?OT|SO|\d+ inn(?:ings)?)$/i.test(note)?` (${note})`:''}`};
}
// A meet's result text. Golf: "T-2nd, 839 (-13)" (the place, the team score
// and its score to par). Cross country: "W - 1st | M - 1st".
export function notreDameMeetResult(text,sport){
  const value=String(text||'').replace(/\s+/g,' ').trim();if(!value)return null;
  const golf=sport==='Golf'&&value.match(/^(T-?)?(\d+)(st|nd|rd|th),?\s*(\d{3,4})\s*\(([+-]?\d+|E)\)$/i);
  if(golf){const place=`${golf[1]?'T':''}${golf[2]}${golf[3].toLowerCase()}`;return{headline:place,results:[{label:'Result',value:place},{label:'Team score',value:`${golf[4]} (${golf[5]})`}]};}
  const teams=[...value.matchAll(/\b([MW])\s*[-:]\s*(T-?)?(\d+)(st|nd|rd|th)\b/gi)].map(m=>({label:`${m[1].toUpperCase()==='W'?"Women's":"Men's"} team`,value:`${m[2]?'T':''}${m[3]}${m[4].toLowerCase()}`}));
  if(teams.length)return{headline:teams.map(row=>`${row.label}: ${row.value}`).join(' / '),results:teams};
  return{headline:value,results:[{label:'Result',value}]};
}
// The event's own story: its post-event article, else a "Recap" link on the
// site's news pages.
function storyOf(game){
  const own=game.post_event_article?.permalink;
  const linked=(game.schedule_event_links||[]).find(link=>/\brecap\b/i.test(link?.title||'')&&/^https:\/\/fightingirish\.com\/news\//.test(link?.link||''))?.link;
  const url=[own,linked].find(href=>{try{const u=new URL(href);return u.protocol==='https:'&&u.hostname===HOST&&u.pathname.startsWith('/news/');}catch{return false;}});
  return url?{url,title:own===url?String(game.post_event_article.title||'').trim():''}:null;
}

export function createNotreDameHandlers({makeEvent,recapMatchesEvent,decodeHtml=value=>String(value||''),eventType=()=>'GAME',ordinal=value=>String(value),fetch,headers}){
  const converted=event=>event?.school_id==='notre-dame'&&notreDameSchool.apiSports.has(event.sport);
  const emptied=new WeakSet();
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='notre-dame'||!notreDameSchool.apiSports.has(sport))return null;
    let page;try{page=new URL(sourceUrl);}catch{return null;}
    if(page.hostname!==HOST||page.pathname!=='/website-api/schedule-events')return null;
    let games;try{games=JSON.parse(String(raw||'')).data;}catch{return null;}
    if(!Array.isArray(games))return null;
    const slug=Object.keys(SPORT_IDS).find(key=>String(SPORT_IDS[key])===page.searchParams.get('filter[schedule.sport_id]'));
    const team=TEAMS[slug]?.startsWith('W')?'womens':TEAMS[slug]?'mens':null;
    const today=notreDameLocalTime(now.toISOString()).day_ms;
    const local=new Date(today),season=local.getUTCMonth()+1>=7?local.getUTCFullYear():local.getUTCFullYear()-1;
    const meet=eventType(sport)!=='GAME',events=[];
    for(const game of games){
      if(!game?.datetime||game.hide_from_specific_sport_schedule)continue;
      // A cancelled or postponed event is not listed.
      if(!['completed','as_scheduled'].includes(game.status))continue;
      const start=notreDameLocalTime(game.datetime,{untimed:Boolean(game.is_all_day||game.tba)});
      // Only the current academic year (July-June) is current.
      if((start.month>=7?start.year:start.year-1)!==season)continue;
      const finish=game.datetime_end?notreDameLocalTime(game.datetime_end):start;
      const lastDay=Math.max(start.day_ms,finish.day_ms);
      let name=decodeHtml(String(game.opponent_name||'')).replace(/\s+/g,' ').trim();
      if(!name||INTERNAL.test(name))continue;
      if(sport==='Tennis'&&PRO_EVENT.test(name))continue;
      // A second opponent is a second team ("Wisconsin and Iowa"); fencing's
      // "Women's Team Meet" says which team competes.
      const second=decodeHtml(String(game.second_opponent_name||'')).trim();
      if(second&&!/\bteam (?:meet|event)\b/i.test(second))name=`${name} and ${second}`;
      // Exhibitions read as K-State labels them ("Dayton (Exhibition)"; the
      // site writes "(Exh.)" or "(EXH.)" or nothing).
      const exhibition=Boolean(game.is_exhibition)||/\((?:exh\.?|exhibition)\)$/i.test(name);
      let opponent=name.replace(/\s*\((?:exh\.?|exhibition)\)$/i,'').trim();
      if(exhibition)opponent=`${opponent} (Exhibition)`;
      const score=game.status==='completed'?notreDameScore(game.schedule_event_result):null;
      const text=String(game.schedule_event_result?.text||'').trim();
      const story=storyOf(game);
      const placed=!score&&meet&&game.status==='completed'?notreDameMeetResult(text,sport):null;
      // A past meet is final with its result (a place, or its story); a past
      // game without a score is not listed. Yesterday's game stays: a night
      // game can end after midnight.
      const over=!score&&meet&&lastDay<today;
      if(over&&!placed&&!story)continue;
      if(!score&&!meet&&lastDay<today-86400000)continue;
      const final=Boolean(score)||over;
      const dual=meet&&!game.datetime_end&&!EVENT_NAME.test(opponent);
      const tournament=decodeHtml(String(game.tournament?.name||'')).trim();
      const relation=meet?(dual&&game.venue_type!=='away'?'vs':'at'):game.venue_type==='away'||GAME_EVENT.test(opponent)||Boolean(tournament)&&name===tournament?'at':'vs';
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation,opponent,date:start.date,
        // K-State's results show the date only; upcoming games show the published time.
        time:final?null:start.time,
        schoolScore:score?score.mine:null,oppScore:score?score.theirs:null,resultText:score?score.text:null,sourceUrl:schedulePage(slug),now});
      if(lastDay>start.day_ms)event.end_time=new Date(lastDay).toISOString().slice(0,10)+'T23:59:59Z';
      // A tournament under way (tennis's ITA Regional, Oct 15-19): today's event.
      if(!final&&lastDay>start.day_ms&&start.day_ms<=today){event.status='Today';event.priority_bucket='today';event.recency_label='In progress';event.id=event.id.replace(/-(?:final|upcoming|today)$/,'-today');}
      if(over){
        event.event_type='MEET';
        const result=placed||{headline:'Completed',results:[{label:'Result',value:'Completed'}]};
        event.headline=result.headline;event.results=result.results;event.result_count=result.results.length;
      }
      if(final&&story){event.recap_url=story.url;if(story.title)event.recap_title=story.title;}
      if(team)event.id=`${event.id}-${team}`;
      // The site marks each conference game (football, independent, has
      // none); hockey plays in the Big Ten (the ACC sponsors none).
      event.conference_game=Boolean(game.is_conference);
      if(sport==='Hockey')event.conference_name='Big Ten';
      events.push(event);
    }
    events.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)));
    // A team with nothing this season yet (baseball, lacrosse, rowing and
    // track publish 2026-27 later) is a valid empty schedule.
    if(!events.length)emptied.add(events);
    return events;
  }
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptied.has(events);

  // The event's own story is bound to it by the site (its post-event article
  // or its "Recap" link): it is checked for the opponent and date only. A
  // tournament is checked against its last day, or the story's own day when
  // that falls while it is played.
  function matchesRecap(raw,event,url){
    if(!converted(event))return recapMatchesEvent(raw,event,url);
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    if(!own)return false;
    const storyDay=(parsed.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//)||[]).slice(1).map(Number);
    if(!storyDay.length)return false;
    const day=Date.UTC(storyDay[0],storyDay[1]-1,storyDay[2]),first=Date.parse(String(event.start_time).slice(0,10)),last=Date.parse(String(event.end_time||event.start_time).slice(0,10));
    // The story comes the day it is played or within three days after.
    return day>=first&&day<=last+3*86400000;
  }
  const crossCountry=createTfrrsMeetResults({id:'notre-dame',schoolName:'Notre Dame',teams:NOTRE_DAME_TFRRS_TEAMS,decodeHtml,ordinal,fetch,headers});
  return{parseSchedule,isEmptySchedule,matchesRecap,
    isCrossCountry:event=>converted(event)&&crossCountry.matches(event),
    attachMeetResults:crossCountry.attach};
}
