import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// New Mexico school module. Shared publisher utilities stay in the Worker;
// this file owns golobos.com's schedule source, New Mexico's program
// combinations and its verified Instagram tags.
//
// golobos.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-22).
const HOST='golobos.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'cross':2,'football':3,'mgolf':4,'mbball':5,'mten':6,'track':7,'softball':8,'wbball':9,'wgolf':10,'wsoc':11,'wswim':12,'wten':13,'wvball':14};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['mbball','wbball'],
  'Cross Country':['cross'],
  'Football':['football'],
  'Golf':['mgolf','wgolf'],
  'Soccer':['wsoc'],
  'Softball':['softball'],
  'Swimming & Diving':['wswim'],
  'Tennis':['mten','wten'],
  'Track & Field':['track'],
  'Volleyball':['wvball']
};
const TEAMS={'mgolf':"Men's",'wgolf':"Women's",'mbball':"Men's",'wbball':"Women's",'mten':"Men's",'wten':"Women's"};
// New Mexico's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const NEW_MEXICO_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/NM_college_f_New_Mexico.html',Men:'https://www.tfrrs.org/teams/xc/NM_college_m_New_Mexico.html'};
const NEW_MEXICO_API={id:'new-mexico',schoolName:'New Mexico',host:HOST,timeZone:'America/Denver',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:NEW_MEXICO_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(NEW_MEXICO_API);

export const newMexicoSchool={
  id:'new-mexico',
  // Sports whose official schedule this module reads itself (the site's
  // schedule API). Every other sport keeps the shared parsers.
  apiSports:new Set(Object.keys(SLUGS)),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.w.1',sourceName:'Live college soccer scoreboard'}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate schedules; both are shown,
  // labeled by team.
  combinedSports:new Set(['Basketball','Golf','Tennis']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    'new-mexico|Baseball|Shane Miller':'https://www.instagram.com/shane5miller/',
    'new-mexico|Baseball|Diego Alvarez':'https://www.instagram.com/alvarez_d101/',
    'new-mexico|Baseball|Cristian Mogen':'https://www.instagram.com/cristian_mogen/',
    'new-mexico|Golf|Ava Cepeda':'https://www.instagram.com/ava_cepeda/',
    'new-mexico|Golf|Juliette Holé':'https://www.instagram.com/juliette.hole/',
    'new-mexico|Volleyball|Uliana Yastrub':'https://www.instagram.com/ulia_yyaastrub/',
    'new-mexico|Volleyball|Amanda Tremeroli':'https://www.instagram.com/amandatrem5/',
    'new-mexico|Volleyball|Reagan Miller':'https://www.instagram.com/reaganamiller/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'new-mexico|Baseball':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Basketball':['https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'new-mexico|Cross Country':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Football':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Golf':['https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'new-mexico|Soccer':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Softball':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Swimming & Diving':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Tennis':['https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'new-mexico|Track & Field':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'new-mexico|Volleyball':'https://golobos.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'new-mexico|Baseball':'https://golobos.com/sports/baseball/roster',
    'new-mexico|Basketball':['https://golobos.com/sports/mbball/roster','https://golobos.com/sports/wbball/roster'],
    'new-mexico|Cross Country':'https://golobos.com/sports/cross/roster',
    'new-mexico|Football':'https://golobos.com/sports/football/roster',
    'new-mexico|Golf':['https://golobos.com/sports/mgolf/roster','https://golobos.com/sports/wgolf/roster'],
    'new-mexico|Soccer':'https://golobos.com/sports/wsoc/roster',
    'new-mexico|Softball':'https://golobos.com/sports/softball/roster',
    'new-mexico|Swimming & Diving':'https://golobos.com/sports/wswim/roster',
    'new-mexico|Tennis':['https://golobos.com/sports/mten/roster','https://golobos.com/sports/wten/roster'],
    'new-mexico|Track & Field':'https://golobos.com/sports/track/roster',
    'new-mexico|Volleyball':'https://golobos.com/sports/wvball/roster'
  }
};

export function createNewMexicoHandlers(deps){
  return createWmtApiHandlers(NEW_MEXICO_API,deps);
}
