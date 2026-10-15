import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// Virginia Tech school module. Shared publisher utilities stay in the Worker;
// this file owns hokiesports.com's schedule source, Virginia Tech's program
// combinations and its verified Instagram tags.
//
// hokiesports.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-15).
const HOST='hokiesports.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'cross-country':2,'football':3,'lacrosse':5,'mens-basketball':6,'mens-golf':7,'mens-soccer':8,'mens-tennis':9,'softball':10,'swimming-diving':11,'track-field':12,'volleyball':13,'womens-basketball':14,'womens-golf':15,'womens-soccer':16,'womens-tennis':17,'wrestling':18};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Cross Country':['cross-country'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Lacrosse':['lacrosse'],
  'Soccer':['womens-soccer','mens-soccer'],
  'Softball':['softball'],
  'Swimming & Diving':['swimming-diving'],
  'Tennis':['womens-tennis','mens-tennis'],
  'Track & Field':['track-field'],
  'Volleyball':['volleyball'],
  'Wrestling':['wrestling']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-soccer':"Women's",'mens-soccer':"Men's",'womens-tennis':"Women's",'mens-tennis':"Men's"};
// Virginia Tech's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const VIRGINIA_TECH_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/VA_college_f_Virginia_Tech.html',Men:'https://www.tfrrs.org/teams/xc/VA_college_m_Virginia_Tech.html'};
const VIRGINIA_TECH_API={id:'virginia-tech',schoolName:'Virginia Tech',host:HOST,timeZone:'America/New_York',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:VIRGINIA_TECH_TFRRS_TEAMS,conferenceNames:{},
  // Swimming's Hokie Belt Challenge (Sep 19) is the team's intrasquad: Maroon
  // 114, Orange 111.
  internal:/^Hokie Belt Challenge$/i};
const routes=wmtApiSchoolRoutes(VIRGINIA_TECH_API);

export const virginiaTechSchool={
  id:'virginia-tech',
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
  combinedSports:new Set(['Basketball','Golf','Soccer','Tennis']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    // Tennis profiles link 10 of 21 accounts: three pinned from the profiles.
    'virginia-tech|Tennis|Gevorg Mnatsakanyan':'https://www.instagram.com/gev_mnats09/',
    'virginia-tech|Tennis|Patrik Jurina':'https://www.instagram.com/patrik_jurina/',
    'virginia-tech|Tennis|Nicolas Iantosca':'https://www.instagram.com/nico.iantosca/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'virginia-tech|Baseball':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Basketball':['https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'virginia-tech|Cross Country':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Football':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Golf':['https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'virginia-tech|Lacrosse':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Soccer':['https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'virginia-tech|Softball':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Swimming & Diving':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Tennis':['https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'virginia-tech|Track & Field':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Volleyball':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'virginia-tech|Wrestling':'https://hokiesports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'virginia-tech|Baseball':'https://hokiesports.com/sports/baseball/roster',
    'virginia-tech|Basketball':['https://hokiesports.com/sports/womens-basketball/roster','https://hokiesports.com/sports/mens-basketball/roster'],
    'virginia-tech|Cross Country':'https://hokiesports.com/sports/cross-country/roster',
    'virginia-tech|Football':'https://hokiesports.com/sports/football/roster',
    'virginia-tech|Golf':['https://hokiesports.com/sports/womens-golf/roster','https://hokiesports.com/sports/mens-golf/roster'],
    'virginia-tech|Lacrosse':'https://hokiesports.com/sports/lacrosse/roster',
    'virginia-tech|Soccer':['https://hokiesports.com/sports/womens-soccer/roster','https://hokiesports.com/sports/mens-soccer/roster'],
    'virginia-tech|Softball':'https://hokiesports.com/sports/softball/roster',
    'virginia-tech|Swimming & Diving':'https://hokiesports.com/sports/swimming-diving/roster',
    'virginia-tech|Tennis':['https://hokiesports.com/sports/womens-tennis/roster','https://hokiesports.com/sports/mens-tennis/roster'],
    'virginia-tech|Track & Field':'https://hokiesports.com/sports/track-field/roster',
    'virginia-tech|Volleyball':'https://hokiesports.com/sports/volleyball/roster',
    'virginia-tech|Wrestling':'https://hokiesports.com/sports/wrestling/roster'
  }
};

export function createVirginiaTechHandlers(deps){
  return createWmtApiHandlers(VIRGINIA_TECH_API,deps);
}
