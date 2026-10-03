import {sidearmScheduleGames,sidearmStartTime} from '../sidearm-schedule-data.mjs';
// Baylor school module. Shared publisher utilities stay in the Worker; this
// file owns baylorbears.com routes, Baylor's program combinations and its
// schedule reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const baylorSchool={
  id:'baylor',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{},
  combinedSports:new Set(['Basketball']),
  scheduleUrls:{
    'baylor|Acrobatics & Tumbling':['https://baylorbears.com/sports/acrobatics-tumbling/schedule','https://baylorbears.com/sports/acrobatics-and-tumbling/schedule','https://baylorbears.com/'],
    'baylor|Baseball':['https://baylorbears.com/sports/baseball/schedule','https://baylorbears.com/'],
    'baylor|Basketball':['https://baylorbears.com/sports/mens-basketball/schedule','https://baylorbears.com/sports/womens-basketball/schedule','https://baylorbears.com/sports/basketball/schedule','https://baylorbears.com/'],
    'baylor|Cross Country':'https://baylorbears.com/sports/cross-country/schedule',
    'baylor|Equestrian':['https://baylorbears.com/sports/equestrian/schedule','https://baylorbears.com/'],
    'baylor|Football':'https://baylorbears.com/sports/football/schedule',
    'baylor|Golf':['https://baylorbears.com/sports/womens-golf/schedule','https://baylorbears.com/sports/mens-golf/schedule','https://baylorbears.com/sports/golf/schedule','https://baylorbears.com/'],
    'baylor|Soccer':'https://baylorbears.com/sports/womens-soccer/schedule',
    'baylor|Softball':['https://baylorbears.com/sports/softball/schedule','https://baylorbears.com/'],
    'baylor|Tennis':['https://baylorbears.com/sports/womens-tennis/schedule','https://baylorbears.com/sports/mens-tennis/schedule','https://baylorbears.com/sports/tennis/schedule','https://baylorbears.com/'],
    'baylor|Track & Field':['https://baylorbears.com/sports/track-and-field/schedule','https://baylorbears.com/sports/track-field/schedule','https://baylorbears.com/'],
    'baylor|Volleyball':'https://baylorbears.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'baylor|Acrobatics & Tumbling':['https://baylorbears.com/sports/acrobatics-tumbling/roster','https://baylorbears.com/sports/acrobatics-and-tumbling/roster'],
    'baylor|Baseball':'https://baylorbears.com/sports/baseball/roster',
    'baylor|Basketball':['https://baylorbears.com/sports/mens-basketball/roster','https://baylorbears.com/sports/womens-basketball/roster','https://baylorbears.com/sports/basketball/roster'],
    'baylor|Cross Country':'https://baylorbears.com/sports/cross-country/roster',
    'baylor|Equestrian':'https://baylorbears.com/sports/equestrian/roster',
    'baylor|Football':'https://baylorbears.com/sports/football/roster',
    'baylor|Golf':['https://baylorbears.com/sports/womens-golf/roster','https://baylorbears.com/sports/mens-golf/roster','https://baylorbears.com/sports/golf/roster'],
    'baylor|Soccer':['https://baylorbears.com/sports/womens-soccer/roster','https://baylorbears.com/sports/wsoc/roster','https://baylorbears.com/sports/soccer/roster','https://baylorbears.com/sports/mens-soccer/roster'],
    'baylor|Softball':'https://baylorbears.com/sports/softball/roster',
    'baylor|Tennis':['https://baylorbears.com/sports/womens-tennis/roster','https://baylorbears.com/sports/mens-tennis/roster','https://baylorbears.com/sports/tennis/roster'],
    'baylor|Track & Field':['https://baylorbears.com/sports/track-and-field/roster','https://baylorbears.com/sports/track-field/roster'],
    'baylor|Volleyball':['https://baylorbears.com/sports/womens-volleyball/roster','https://baylorbears.com/sports/wvball/roster','https://baylorbears.com/sports/volleyball/roster']
  }
};

const HOST='baylorbears.com';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Baylor's calendar day (Waco, America/Chicago).
const baylorToday=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
// Rankings describe the week, not the opponent: "#21 Colorado", "No. 23 BYU",
// "RV Georgia Tech".
export function baylorOpponent(title){
  return String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');
}

// baylorbears.com is a SIDEARM (Nuxt) site. Its schedule pages embed every
// game as page data: the local start ("2026-10-03T21:30:00", "9:30 p.m."),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. The shared parsers read only the rendered cards, which omit the
// start time, so every upcoming game showed its date alone.
export function createBaylorHandlers({makeEvent}){
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='baylor'||!baylorSchool.pageDataSports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const games=sidearmScheduleGames(raw);
    if(!games.length)return null;
    const today=baylorToday(now),events=[];
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      const opponent=baylorOpponent(game.opponent?.title);
      if(!opponent)continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const scored=['W','L','T'].includes(outcome)&&/^\d+$/.test(team)&&/^\d+$/.test(other);
      // A game day that has passed with no published score is neither a
      // result nor upcoming.
      if(!scored&&game.date.slice(0,10)<today)continue;
      // H: home, A: away; a neutral site keeps the page's own vs./at.
      const relation=game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBD" shows the date alone).
      const start=scored?null:sidearmStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:scored?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      if(scored){
        // The game's own /news/ recap, dated from the game day to three days
        // after (never the game-book PDF).
        try{
          const link=new URL(result?.recap?.url,sourceUrl),dated=link.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
          const published=dated?Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])):NaN;
          const played=Date.parse(`${game.date.slice(0,10)}T00:00:00Z`);
          if(link.hostname===HOST&&dated&&published>=played&&published<=played+3*86400000)event.recap_url=link.href;
        }catch{}
      }
      events.push(event);
    }
    return events;
  }
  return{parseSchedule};
}
