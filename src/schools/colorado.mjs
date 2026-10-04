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
  pageDataSports:new Set(['Football','Volleyball','Soccer']),
  // Live game state comes from an independent scoreboard; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    // Volleyball scores are sets won; the live detail names the current set.
    Volleyball:[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    // ESPN's women's college soccer scoreboard (Colorado sponsors women's
    // soccer only); it lists every Division I match.
    Soccer:[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}]
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

// The published start. The page shows the time text ("5:30 p.m."); the page
// data's clock usually agrees, but not always (soccer at Kansas State, Oct 16:
// "5:30 p.m." with 18:00 in the data). The text is what the page shows, so a
// clock in it wins; "TBA" has none.
export function coloradoStartTime(date,time){
  const exact=sidearmStartTime(date,time);if(exact)return exact;
  const d=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/),t=String(time||'').match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?=[\s(]|$)/i);
  if(!d||!t||Number(t[1])<1||Number(t[1])>12)return null;
  const hour=String(Number(t[1])%12+(t[3].toLowerCase()==='p'?12:0)).padStart(2,'0'),minute=t[2]||'00';
  return sidearmStartTime(`${d[1]}-${d[2]}-${d[3]}T${hour}:${minute}:00`,time);
}

// cubuffs.com is a SIDEARM (Nuxt) site. Its schedule pages embed every game
// as page data: the local start ("2026-11-13T20:15:00", "8:15 PM"),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. Production read the rendered cards, which omit the start time,
// so every upcoming game showed its date alone.
export function createColoradoHandlers({makeEvent,recapMatchesEvent,decodeHtml=value=>String(value||''),fetch,headers}){
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
      let opponent=coloradoOpponent(game.opponent?.title);
      if(!opponent||/^TB[AD]$/i.test(opponent)||INTERNAL.test(opponent))continue;
      // Tournament pages also list the other teams' matches ("Denver vs.
      // Central Arkansas" at the Buffs Classic); they are not Colorado's.
      if(/\S\s+vs\.?\s+\S/i.test(opponent))continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      // An exhibition (page-data type "S" against another school) reads as
      // K-State labels exhibitions: "Utah (Exhibition)".
      if(game.type==='S')opponent=`${opponent} (Exhibition)`;
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
      const start=scored?null:coloradoStartTime(game.date,game.time);
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
  // A final the schedule links no story for (soccer at Western Michigan, Aug
  // 27) takes Colorado's story from the sport's archive: dated on the game day
  // or the day after, naming the opponent in the article and stating the
  // result (the score either way round, never part of a record such as
  // "3-0-1"; a tie may be told as a draw). The
  // headline may name neither ("Buffs' First Road Match Ends In A Draw").
  const download=async url=>{try{const response=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});return response.ok?await response.text():null;}catch{return null;}};
  const storyText=raw=>decodeHtml((String(raw).match(/<div\b[^>]*id=["']story-[\s\S]*?(?=<div\b[^>]*class=["'][^"']*related|$)/i)?.[0]||'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
  const isColoradoFinalWithoutStory=event=>event?.school_id==='colorado'&&event.event_type==='GAME'&&event.status==='Final'&&!event.recap_url&&/^\d+$/.test(String(event.school_score??''))&&/^\d+$/.test(String(event.opponent_score??''));
  async function attachArchiveStory(event){
    if(!isColoradoFinalWithoutStory(event))return event;
    const slug=(String(event.source?.url||'').match(/^https:\/\/cubuffs\.com\/sports\/([a-z-]+)\/schedule/)||[])[1];if(!slug)return event;
    const listing=await download(`https://${HOST}/sports/${slug}/archives`);if(!listing)return event;
    const first=Date.parse(`${String(event.start_time).slice(0,10)}T00:00:00Z`);
    const days=[0,1].map(offset=>new Date(first+offset*86400000)).map(day=>`/news/${day.getUTCFullYear()}/${day.getUTCMonth()+1}/${day.getUTCDate()}/`);
    const paths=[...new Set(listing.replace(/\\u002F/gi,'/').match(/\/news\/\d{4}\/\d{1,2}\/\d{1,2}\/[A-Za-z0-9-]+/g)||[])].filter(path=>days.some(day=>path.startsWith(day)));
    const a=String(event.school_score),b=String(event.opponent_score),opponent=String(event.opponent||'').replace(/\s*\(.*?\)\s*/g,' ').trim();
    const score=new RegExp(`(?<![\\d-])(?:${a}-${b}|${b}-${a})(?![\\d-])`),tie=a===b?/\b(?:draw|tie|tied|scoreless)\b/i:null;
    for(const path of paths.slice(0,4)){
      const url=`https://${HOST}${path}`,raw=await download(url);if(!raw)continue;
      const text=storyText(raw);
      if(!opponent||!text.toLowerCase().includes(opponent.toLowerCase()))continue;
      if(score.test(text)||tie&&tie.test(text)){event.recap_url=url;event.archive_story_verified=url;return event;}
    }
    return event;
  }
  return{parseSchedule,matchesRecap,isColoradoFinalWithoutStory,attachArchiveStory};
}
