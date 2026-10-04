// One schedule reader for SIDEARM (Nuxt) school sites. Their schedule pages
// embed every game as page data (src/sidearm-schedule-data.mjs): the local
// start, home/away/neutral, the result (status W/L/T, both scores, placings)
// and the game's own recap link. This reader turns those games into events in
// K-State's results format; a school module passes only what differs on its
// site. Colorado, Baylor and Arizona use it.
//
// Every game goes through the same steps, each a setting:
//   listed(games)                     drop entries that are not games
//   merge(sport,games,today)          rounds/meet days become one event
//   seasonDay(game)                   the day the current-season check uses
//   opponent(game,sport)              the name shown, or '' to leave the game out
//   score                             what a published score looks like
//   meet(sport,game,scored)           the entry is a meet (places, not a score)
//   days(game)                        {firstDay,lastDay,listedDay}
//   final(ctx)                        the result is in
//   keep(ctx)                         a past entry without a result stays listed
//   relation(sport,game,meet)         'vs' or 'at'
//   startTime(date,time)              the published local start
//   result(event,ctx)                 sport results: golf places, team finishes
//   recapLinks(game,result)           candidate story links, first valid wins
//   onRecap(event,href,ctx)           after the story link is set
//   tennisNeedsStory                  a past tennis tournament is listed only with a story
//   gameNumber(game,games,ctx)        doubleheaders: Game 1 / Game 2 (0: not one)
//   afterEvent(event,ctx)             anything else, before the event is kept
import {sidearmScheduleGames,sidearmStartTime} from './sidearm-schedule-data.mjs';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// The school's calendar day in its own time zone ("2026-10-04").
export const sidearmToday=timeZone=>now=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);

// Rankings describe the week, not the opponent: "#21 Baylor", "No. 23 BYU",
// "RV Utah".
export const withoutRanking=title=>String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');

// H: home, A: away; a neutral site keeps the page's own vs./at.
export const sidearmRelation=game=>game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';

// A meet's published team finishes as text ("Women 3rd, Men 4th").
export const sidearmMeetPlacing=result=>String(result.prescore_info||result.postscore_info||'').replace(/\s+/g,' ').trim();

export function createSidearmScheduleReader(config,{makeEvent,eventType=()=>'GAME'}){
  const {id,host,sports,today:todayOf,squadSports=new Set()}=config;
  const listed=config.listed||(games=>games);
  const merge=config.merge||((sport,games)=>games);
  const seasonDay=config.seasonDay||(game=>game.date.slice(0,10));
  const score=config.score||/^\d+$/;
  const meetOf=config.meet||((sport,game,scored)=>eventType(sport)!=='GAME'&&!scored);
  // A multi-day event (a conference tournament) runs to its last day.
  const daysOf=config.days||(game=>{const firstDay=game.date.slice(0,10),last=String(game.enddate||'').slice(0,10);return{firstDay,lastDay:last>firstDay?last:firstDay,listedDay:firstDay};});
  const finalOf=config.final||(ctx=>ctx.scored||ctx.meet&&ctx.lastDay<ctx.today);
  // A day that has passed with no published score is neither a result nor
  // upcoming.
  const keep=config.keep||(ctx=>ctx.lastDay>=ctx.today);
  const relationOf=config.relation||((sport,game,meet)=>eventType(sport)==='MEET'||sport==='Tennis'&&meet?'at':sidearmRelation(game));
  const startTime=config.startTime||sidearmStartTime;
  const recapLinks=config.recapLinks||((game,result)=>[result?.recap?.url]);
  const emptiedBySeason=new WeakSet();

  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!==id||!sports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==host||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const pageGames=sidearmScheduleGames(raw);
    if(!pageGames.length)return null;
    const today=todayOf(now),events=[],parse={};
    const games=merge(sport,listed(pageGames),today);
    // Pages keep showing last season until the next is published ("2025-26
    // Track and Field Schedule"). Only the current academic year (July-June,
    // the school's time) is current; a page with none is a valid empty
    // schedule.
    const seasonStart=`${Number(today.slice(5,7))>=7?today.slice(0,4):Number(today.slice(0,4))-1}-07-01`;
    let pastSeason=0;
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      if(seasonDay(game)<seasonStart){pastSeason++;continue;}
      const opponent=config.opponent(game,sport);
      if(!opponent)continue;
      // Canceled and postponed games are not on K-State's schedule.
      if(/^(?:Cancel+ed|Postponed)\b/i.test(String(game.noplay_text||'').trim()))continue;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const scored=['W','L','T'].includes(outcome)&&score.test(team)&&score.test(other);
      const meet=meetOf(sport,game,scored);
      const placing=meet?sidearmMeetPlacing(result):'';
      const {firstDay,lastDay,listedDay}=daysOf(game);
      const ctx={sport,game,games,opponent,result,outcome,team,other,scored,meet,placing,firstDay,lastDay,listedDay,today,url,sourceUrl,parse};
      ctx.final=finalOf(ctx);
      if(!ctx.final&&!keep(ctx))continue;
      const final=ctx.final;
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBA" shows the date alone).
      const start=final?null:startTime(game.date,game.time);
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation:relationOf(sport,game,meet),opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:scored?team:null,oppScore:scored?other:null,resultText:scored?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      // Multi-day events end on their last day; while one is in progress it
      // is today's event, not a past one that drops off the schedule.
      if(lastDay>listedDay)event.end_time=`${lastDay}T23:59:59Z`;
      if(!final&&listedDay<today&&lastDay>=today){
        event.status='Today';event.priority_bucket='today';event.recency_label='In progress';
        event.start_time=`${today}T12:00:00.000Z`;
      }
      config.result?.(event,ctx);
      if(final){
        // The event's own /news/ story, dated from its first day to three
        // days after its last (never the game-book PDF or the notes page).
        for(const candidate of recapLinks(game,result)){
          try{
            const link=new URL(candidate,sourceUrl),dated=link.pathname.match(/^\/news\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
            const published=dated?Date.UTC(Number(dated[1]),Number(dated[2])-1,Number(dated[3])):NaN;
            if(link.hostname===host&&dated&&published>=Date.parse(`${firstDay}T00:00:00Z`)&&published<=Date.parse(`${lastDay}T00:00:00Z`)+3*86400000){
              event.recap_url=link.href;config.onRecap?.(event,link.href,ctx);break;
            }
          }catch{}
        }
      }
      // As K-State's, a past tennis tournament (no team result) is listed only
      // with the school's story about it.
      if(config.tennisNeedsStory&&sport==='Tennis'&&meet&&final&&!event.recap_url)continue;
      // A doubleheader lists the same opponent twice on one day: Game 1 and
      // Game 2 stay two games.
      const number=config.gameNumber?.(game,games,ctx)||0;
      if(number){event.game_number=number;event.id=`${event.id}-game-${number}`;event.title=`${event.title} (Game ${number})`;}
      // Separate men's and women's pages can list the same opponent on the
      // same day; the team keeps their event ids apart.
      const squad=squadSports.has(sport)?(url.pathname.match(/^\/sports\/(mens|womens)-/)||[])[1]:null;
      if(squad)event.id=`${event.id}-${squad}`;
      config.afterEvent?.(event,ctx);
      events.push(event);
    }
    if(!events.length&&pastSeason)emptiedBySeason.add(events);
    return events;
  }
  const isEmptySchedule=events=>Array.isArray(events)&&!events.length&&emptiedBySeason.has(events);
  return{parseSchedule,isEmptySchedule};
}
