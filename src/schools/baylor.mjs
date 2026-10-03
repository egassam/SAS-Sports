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
  pageDataSports:new Set(['Football','Volleyball','Soccer']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    Football:[{path:'football/college-football',sourceName:'Live college football scoreboard'}],
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // ESPN's women's college soccer scoreboard (Baylor sponsors women's soccer
    // only); it lists every Division I match.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}]
  },
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
// A story's headline (og:title): "No. 21 VB Tops Hawaii in Five-Set Thriller".
export function baylorStoryHeadline(raw){
  const m=String(raw||'').match(/<meta\b[^>]*property=["']og:title["'][^>]*content=(["'])(.*?)\1/i)||String(raw||'').match(/<meta\b[^>]*content=(["'])(.*?)\1[^>]*property=["']og:title["']/i);
  return m?m[2]:'';
}

export function createBaylorHandlers({makeEvent,recapMatchesEvent}){
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
      // result nor upcoming; a multi-day event counts until its last day.
      const firstDay=game.date.slice(0,10),lastDay=String(game.enddate||'').slice(0,10)>firstDay?String(game.enddate).slice(0,10):firstDay;
      if(!scored&&lastDay<today)continue;
      // H: home, A: away; a neutral site keeps the page's own vs./at.
      const relation=game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBD" shows the date alone).
      const start=scored?null:sidearmStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:scored?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      // Multi-day events (the Big 12 Tournament, Nov 9-14; NCAA rounds) end on
      // their last day; while one is in progress it is today's event.
      if(lastDay>firstDay)event.end_time=`${lastDay}T23:59:59Z`;
      if(!scored&&firstDay<today&&lastDay>=today){
        event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
        event.start_time=`${today}T12:00:00.000Z`;
      }
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
  // The card's own recap link is checked by the shared matcher. Any other
  // candidate must also name the opponent in its headline: Baylor's stories
  // name the next opponent ("WHAT'S NEXT ... against Georgia Southern") and
  // their dateline ("HONOLULU, Hawaii"), so on a tournament day the shared
  // matcher took each Aug 30 story for the other match.
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='baylor'||!recapMatchesEvent(raw,event,url))return false;
    if(url&&url===event.recap_url)return true;
    const key=value=>` ${String(value).toLowerCase().replace(/&amp;|&#38;/g,'&').replace(/&#x27;|&#39;|\u2019/g,"'").replace(/[^a-z0-9&']+/g,' ').trim()} `;
    const opponent=key(String(event.opponent||'').replace(/\(.*?\)/g,' ')).trim();
    return opponent.length>=2&&key(baylorStoryHeadline(raw)).includes(` ${opponent} `);
  }
  return{parseSchedule,matchesRecap};
}
