import {sidearmScheduleGames,sidearmStartTime} from '../sidearm-schedule-data.mjs';
// Colorado school module. Shared publisher utilities stay in the Worker; this
// file owns cubuffs.com routes, Colorado's program combinations, its verified
// Instagram tags and its schedule reader. Routes started as the exact
// candidates production used before the module existed (route parity); each
// sport is then corrected and verified one at a time.
export const coloradoSchool={
  id:'colorado',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football','Volleyball']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}]
  },
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  verifiedInstagrams:{
    'colorado|Football|Ben Finneseth':'https://www.instagram.com/ben.finneseth/'
  },
  scheduleUrls:{
    'colorado|Basketball':['https://cubuffs.com/sports/mens-basketball/schedule','https://cubuffs.com/sports/womens-basketball/schedule','https://cubuffs.com/sports/basketball/schedule','https://cubuffs.com/'],
    'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/schedule',
    'colorado|Football':'https://cubuffs.com/sports/football/schedule',
    'colorado|Golf':['https://cubuffs.com/sports/womens-golf/schedule','https://cubuffs.com/sports/mens-golf/schedule','https://cubuffs.com/sports/golf/schedule','https://cubuffs.com/'],
    'colorado|Skiing':['https://cubuffs.com/sports/skiing/schedule','https://cubuffs.com/'],
    'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/schedule',
    'colorado|Tennis':['https://cubuffs.com/sports/womens-tennis/schedule','https://cubuffs.com/sports/mens-tennis/schedule','https://cubuffs.com/sports/tennis/schedule','https://cubuffs.com/'],
    'colorado|Track & Field':['https://cubuffs.com/sports/track-and-field/schedule','https://cubuffs.com/sports/track-field/schedule','https://cubuffs.com/'],
    'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'colorado|Basketball':['https://cubuffs.com/sports/mens-basketball/roster','https://cubuffs.com/sports/womens-basketball/roster','https://cubuffs.com/sports/basketball/roster'],
    'colorado|Cross Country':'https://cubuffs.com/sports/cross-country/roster',
    'colorado|Football':'https://cubuffs.com/sports/football/roster',
    'colorado|Golf':['https://cubuffs.com/sports/womens-golf/roster','https://cubuffs.com/sports/mens-golf/roster','https://cubuffs.com/sports/golf/roster'],
    'colorado|Skiing':'https://cubuffs.com/sports/skiing/roster',
    'colorado|Soccer':'https://cubuffs.com/sports/womens-soccer/roster',
    'colorado|Tennis':['https://cubuffs.com/sports/womens-tennis/roster','https://cubuffs.com/sports/mens-tennis/roster','https://cubuffs.com/sports/tennis/roster'],
    'colorado|Track & Field':['https://cubuffs.com/sports/track-and-field/roster','https://cubuffs.com/sports/track-field/roster'],
    'colorado|Volleyball':'https://cubuffs.com/sports/womens-volleyball/roster'
  }
};

const HOST='cubuffs.com';
// Internal events: "Black & Gold Spring Game", scrimmages, intrasquads.
const INTERNAL=/\bscrimmage\b|\bintrasquad\b|\bblack\s*(?:&|and|vs\.?|-)\s*gold\b/i;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Colorado's calendar day (Boulder, America/Denver).
const coloradoToday=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
// Rankings describe the week, not the opponent: "#21 Baylor", "No. 23 BYU",
// "RV Utah".
export function coloradoOpponent(title){
  return String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');
}

// cubuffs.com is a SIDEARM (Nuxt) site. Its schedule pages embed every game
// as page data: the local start ("2026-11-13T20:15:00", "8:15 PM"),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. Production read the rendered cards, which omit the start time,
// so every upcoming game showed its date alone.
export function createColoradoHandlers({makeEvent,recapMatchesEvent,decodeHtml=value=>String(value||'')}){
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='colorado'||!coloradoSchool.pageDataSports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const games=sidearmScheduleGames(raw);
    if(!games.length)return null;
    const today=coloradoToday(now),events=[];
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      const opponent=coloradoOpponent(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))continue;
      // Tournament pages also list the other teams' matches ("Denver vs.
      // Central Arkansas" at the Buffs Classic); they are not Colorado's.
      if(/\S\s+vs\.?\s+\S/i.test(opponent))continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const scored=['W','L','T'].includes(outcome)&&/^\d+$/.test(team)&&/^\d+$/.test(other);
      // A game day that has passed with no published score is neither a
      // result nor upcoming; yesterday's stays (a late game in another time
      // zone ends after midnight in Boulder and its score is posted after).
      const firstDay=game.date.slice(0,10);
      if(!scored&&Date.parse(firstDay)<Date.parse(today)-86400000)continue;
      // H: home, A: away; a neutral site keeps the page's own vs./at.
      const relation=game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBA" shows the date alone).
      const start=scored?null:sidearmStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:scored?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      if(scored){
        // The game's own /news/ recap, dated from the game day to three days
        // after (never the game-book PDF or the notes page).
        try{
          const link=new URL(result.recap?.url,sourceUrl),dated=link.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
          const published=dated?Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])):NaN;
          if(link.hostname===HOST&&dated&&published>=Date.parse(`${firstDay}T00:00:00Z`)&&published<=Date.parse(`${firstDay}T00:00:00Z`)+3*86400000)event.recap_url=link.href;
        }catch{}
      }
      events.push(event);
    }
    return events;
  }
  // The card's own recap link is already bound to its game: it is checked
  // for opponent and date only (Colorado's stories need not name the sport).
  // Any other candidate must also name the opponent in its headline: a
  // tournament story names the next day's opponent ("... will face Central
  // Arkansas on Saturday"), so the shared matcher took the Aug 28 CSUN story
  // for the Aug 29 Central Arkansas match.
  const headlineKey=value=>` ${decodeHtml(String(value||'')).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\bst\./g,'state').replace(/[^a-z0-9&]+/g,' ').trim()} `;
  function matchesRecap(raw,event,url){
    if(event?.school_id!=='colorado')return false;
    let parsed;try{parsed=new URL(url);}catch{return false;}
    const own=url===event.recap_url&&parsed.protocol==='https:'&&parsed.hostname===HOST&&parsed.pathname.startsWith('/news/');
    if(own)return recapMatchesEvent(raw,{...event,sport:''},url);
    // A game the schedule links its own recap for takes only that one: the
    // Sep 18 story at Colorado State names the same opponent the day after
    // the Sep 17 match.
    if(event.recap_url)return false;
    if(!recapMatchesEvent(raw,event,url))return false;
    const title=(String(raw).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
    const opponent=headlineKey(event.opponent).trim();
    return opponent.length>=2&&headlineKey(title).includes(` ${opponent} `);
  }
  return{parseSchedule,matchesRecap};
}
