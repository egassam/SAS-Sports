import {sidearmScheduleGames,sidearmStartTime} from '../sidearm-schedule-data.mjs';
// Arizona school module. Shared publisher utilities stay in the Worker; this
// file owns arizonawildcats.com routes, Arizona's program combinations and its
// schedule reader. Routes started as the exact candidates production used
// before the module existed (route parity); each sport is then corrected and
// verified one at a time.
export const arizonaSchool={
  id:'arizona',
  // Sports whose official schedule this module reads itself, from the page
  // data (see parseSchedule). Every other sport keeps the shared parsers.
  pageDataSports:new Set(['Football']),
  // Live game state comes from an independent scoreboard, as for K-State;
  // the official schedule stays the results source of record. ESPN's college
  // football scoreboard lists only ~25 featured games for "limit=1000" (Arizona
  // at Washington State was missing on Sep 26); the FBS group (80) lists all.
  liveScoreboards:{
    Football:[{path:'football/college-football',query:'groups=80&limit=300',sourceName:'Live college football scoreboard'}]
  },
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  scheduleUrls:{
    'arizona|Baseball':['https://arizonawildcats.com/sports/baseball/schedule','https://arizonawildcats.com/'],
    'arizona|Basketball':['https://arizonawildcats.com/sports/mens-basketball/schedule','https://arizonawildcats.com/sports/womens-basketball/schedule','https://arizonawildcats.com/sports/basketball/schedule','https://arizonawildcats.com/'],
    'arizona|Beach Volleyball':['https://arizonawildcats.com/sports/beach-volleyball/schedule','https://arizonawildcats.com/'],
    'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/schedule',
    'arizona|Football':'https://arizonawildcats.com/sports/football/schedule',
    'arizona|Golf':['https://arizonawildcats.com/sports/womens-golf/schedule','https://arizonawildcats.com/sports/mens-golf/schedule','https://arizonawildcats.com/sports/golf/schedule','https://arizonawildcats.com/'],
    'arizona|Gymnastics':['https://arizonawildcats.com/sports/womens-gymnastics/schedule','https://arizonawildcats.com/sports/mens-gymnastics/schedule','https://arizonawildcats.com/sports/gymnastics/schedule','https://arizonawildcats.com/'],
    'arizona|Soccer':'https://arizonawildcats.com/sports/womens-soccer/schedule',
    'arizona|Softball':['https://arizonawildcats.com/sports/softball/schedule','https://arizonawildcats.com/'],
    'arizona|Swimming & Diving':['https://arizonawildcats.com/sports/mens-swimming-and-diving/schedule','https://arizonawildcats.com/sports/womens-swimming-and-diving/schedule'],
    'arizona|Tennis':['https://arizonawildcats.com/sports/womens-tennis/schedule','https://arizonawildcats.com/sports/mens-tennis/schedule','https://arizonawildcats.com/sports/tennis/schedule','https://arizonawildcats.com/'],
    'arizona|Track & Field':['https://arizonawildcats.com/sports/track-and-field/schedule','https://arizonawildcats.com/sports/track-field/schedule','https://arizonawildcats.com/'],
    'arizona|Volleyball':'https://arizonawildcats.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'arizona|Baseball':'https://arizonawildcats.com/sports/baseball/roster',
    'arizona|Basketball':['https://arizonawildcats.com/sports/mens-basketball/roster','https://arizonawildcats.com/sports/womens-basketball/roster','https://arizonawildcats.com/sports/basketball/roster'],
    'arizona|Beach Volleyball':'https://arizonawildcats.com/sports/beach-volleyball/roster',
    'arizona|Cross Country':'https://arizonawildcats.com/sports/cross-country/roster',
    'arizona|Football':'https://arizonawildcats.com/sports/football/roster',
    'arizona|Golf':['https://arizonawildcats.com/sports/womens-golf/roster','https://arizonawildcats.com/sports/mens-golf/roster','https://arizonawildcats.com/sports/golf/roster'],
    'arizona|Gymnastics':['https://arizonawildcats.com/sports/womens-gymnastics/roster','https://arizonawildcats.com/sports/mens-gymnastics/roster','https://arizonawildcats.com/sports/gymnastics/roster'],
    'arizona|Soccer':['https://arizonawildcats.com/sports/womens-soccer/roster','https://arizonawildcats.com/sports/wsoc/roster','https://arizonawildcats.com/sports/soccer/roster','https://arizonawildcats.com/sports/mens-soccer/roster'],
    'arizona|Softball':'https://arizonawildcats.com/sports/softball/roster',
    'arizona|Swimming & Diving':['https://arizonawildcats.com/sports/womens-swimming-and-diving/roster','https://arizonawildcats.com/sports/mens-swimming-and-diving/roster','https://arizonawildcats.com/sports/womens-swimming-diving/roster','https://arizonawildcats.com/sports/mens-swimming-diving/roster','https://arizonawildcats.com/sports/swimming-and-diving/roster','https://arizonawildcats.com/sports/swimming-diving/roster','https://arizonawildcats.com/sports/swimming/roster'],
    'arizona|Tennis':['https://arizonawildcats.com/sports/womens-tennis/roster','https://arizonawildcats.com/sports/mens-tennis/roster','https://arizonawildcats.com/sports/tennis/roster'],
    'arizona|Track & Field':['https://arizonawildcats.com/sports/track-and-field/roster','https://arizonawildcats.com/sports/track-field/roster'],
    'arizona|Volleyball':['https://arizonawildcats.com/sports/womens-volleyball/roster','https://arizonawildcats.com/sports/wvball/roster','https://arizonawildcats.com/sports/volleyball/roster']
  }
};

const HOST='arizonawildcats.com';
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// Rankings describe the week, not the opponent: "#21 Colorado", "No. 23 BYU".
export const arizonaOpponent=title=>String(title||'').replace(/\s+/g,' ').trim().replace(/^(?:#\d+|No\.\s*\d+|RV)\s+/i,'');

// arizonawildcats.com is a SIDEARM (Nuxt) site. Its schedule pages embed every
// game as page data: the local start ("2026-09-05T18:30:00", "6:30 PM MST"),
// home/away/neutral, the result (status W/L/T, both scores) and the game's own
// recap link. The shared parsers read only the rendered cards, which omit the
// start time, so every upcoming game showed its date alone.
export function createArizonaHandlers({makeEvent}){
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school?.id!=='arizona'||!arizonaSchool.pageDataSports.has(sport))return null;
    let url;try{url=new URL(sourceUrl);}catch{return null;}
    if(url.hostname!==HOST||!/^\/sports\/[^/]+\/schedule\/?$/.test(url.pathname))return null;
    const games=sidearmScheduleGames(raw);
    if(!games.length)return null;
    const events=[];
    for(const game of games){
      const day=String(game.date||'').match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if(!day)continue;
      const opponent=arizonaOpponent(game.opponent?.title);
      if(!opponent)continue;
      const result=game.result||{},outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      const final=['W','L','T'].includes(outcome)&&/^\d+$/.test(team)&&/^\d+$/.test(other);
      // H: home, A: away; a neutral site keeps the page's own vs./at.
      const relation=game.location_indicator==='A'?'at':game.location_indicator==='H'?'vs':String(game.at_vs||'vs').toLowerCase()==='at'?'at':'vs';
      // K-State's results show the date only; upcoming games show the
      // published local time ("TBA" shows the date alone).
      const start=final?null:sidearmStartTime(game.date,game.time);
      const event=makeEvent({school,sport,status:final?'Final':'Upcoming',relation,opponent,
        date:`${MONTHS[Number(day[2])-1]} ${Number(day[3])}, ${day[1]}`,time:start?start.display_time.replace(/^.*, /,''):null,
        schoolScore:final?team:null,oppScore:final?other:null,resultText:final?`${outcome}, ${team}-${other}`:null,sourceUrl,now});
      if(final){
        const recap=result.recap?.url;
        if(typeof recap==='string'){
          try{const link=new URL(recap,sourceUrl);if(link.hostname===HOST&&link.pathname.startsWith('/news/'))event.recap_url=link.href;}catch{}
        }
      }
      events.push(event);
    }
    return events;
  }
  return{parseSchedule};
}
