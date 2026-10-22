import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// UTSA school module. Shared publisher utilities stay in the Worker;
// this file owns goutsa.com's schedule source, UTSA's program
// combinations and its verified Instagram tags.
//
// goutsa.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-22).
const HOST='goutsa.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':2,'football':4,'mens-basketball':5,'mens-golf':7,'mens-tennis':8,'soccer':10,'softball':11,'volleyball':15,'womens-basketball':16,'womens-golf':18,'womens-tennis':19,'cross-country':54,'track-fieldcross-country':14};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Cross Country':['cross-country'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Soccer':['soccer'],
  'Softball':['softball'],
  'Tennis':['womens-tennis','mens-tennis'],
  // One page for track and cross country through 2025-26; cross country has
  // its own since (id 54), so this one is the track season.
  'Track & Field':['track-fieldcross-country'],
  'Volleyball':['volleyball']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-tennis':"Women's",'mens-tennis':"Men's"};
// UTSA's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const UTSA_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/TX_college_f_UTSA.html',Men:'https://www.tfrrs.org/teams/xc/TX_college_m_UTSA.html'};
const UTSA_API={id:'utsa',schoolName:'UTSA',host:HOST,timeZone:'America/Chicago',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:UTSA_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(UTSA_API);

export const utsaSchool={
  id:'utsa',
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
    'utsa|Baseball|Diego Diaz':'https://www.instagram.com/diegodiaz1022/',
    'utsa|Baseball|Tye Odom':'https://www.instagram.com/tyeodom_/',
    'utsa|Baseball|Ryan Jester':'https://www.instagram.com/ry.jester/',
    'utsa|Basketball|Idara Udo':'https://www.instagram.com/idaraudoo/',
    'utsa|Basketball|Maya Linton':'https://www.instagram.com/maya_linton/',
    'utsa|Softball|Taryn Madlock':'https://www.instagram.com/taryn_madlock/',
    'utsa|Tennis|Diana Khaydarshina':'https://www.instagram.com/dianakhaydarshina_official/',
    'utsa|Tennis|Aoka Nagasawa':'https://www.instagram.com/a0rin_tennis1228/',
    'utsa|Tennis|Celine Absawi':'https://www.instagram.com/celine_absawi/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'utsa|Baseball':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Basketball':['https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'utsa|Cross Country':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=54&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Football':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Golf':['https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'utsa|Soccer':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Softball':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Tennis':['https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'utsa|Track & Field':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'utsa|Volleyball':'https://goutsa.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'utsa|Baseball':'https://goutsa.com/sports/baseball/roster',
    'utsa|Basketball':['https://goutsa.com/sports/womens-basketball/roster','https://goutsa.com/sports/mens-basketball/roster'],
    'utsa|Cross Country':'https://goutsa.com/sports/cross-country/roster',
    'utsa|Football':'https://goutsa.com/sports/football/roster',
    'utsa|Golf':['https://goutsa.com/sports/womens-golf/roster','https://goutsa.com/sports/mens-golf/roster'],
    'utsa|Soccer':'https://goutsa.com/sports/soccer/roster',
    'utsa|Softball':'https://goutsa.com/sports/softball/roster',
    'utsa|Tennis':['https://goutsa.com/sports/womens-tennis/roster','https://goutsa.com/sports/mens-tennis/roster'],
    'utsa|Track & Field':'https://goutsa.com/sports/track-fieldcross-country/roster',
    'utsa|Volleyball':'https://goutsa.com/sports/volleyball/roster'
  }
};

export function createUtsaHandlers(deps){
  return createWmtApiHandlers(UTSA_API,deps);
}
