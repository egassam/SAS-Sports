import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// Washington State school module. Shared publisher utilities stay in the Worker;
// this file owns wsucougars.com's schedule source, Washington State's program
// combinations and its verified Instagram tags.
//
// wsucougars.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-19).
const HOST='wsucougars.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'cross-country':2,'football':3,'mens-basketball':4,'mens-golf':5,'womens-rowing':6,'womens-soccer':7,'womens-swimming':8,'womens-tennis':9,'track-and-field':10,'womens-volleyball':11,'womens-basketball':12,'womens-golf':13};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Cross Country':['cross-country'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Rowing':['womens-rowing'],
  'Soccer':['womens-soccer'],
  'Swimming & Diving':['womens-swimming'],
  'Tennis':['womens-tennis'],
  'Track & Field':['track-and-field'],
  'Volleyball':['womens-volleyball']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's"};
// Washington State's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const WASHINGTON_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/WA_college_f_Washington_State.html',Men:'https://www.tfrrs.org/teams/xc/WA_college_m_Washington_State.html'};
const WASHINGTON_STATE_API={id:'washington-state',schoolName:'Washington State',host:HOST,timeZone:'America/Los_Angeles',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:WASHINGTON_STATE_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(WASHINGTON_STATE_API);

export const washingtonStateSchool={
  id:'washington-state',
  // The school's Opendorse marketplace, its official NIL marketplace (linked
  // from wsucougars.com): athlete Instagram for a sport still short of three (src/opendorse.mjs).
  opendorse:{marketplace:'washingtonstate-cougars',team:'Washington State Cougars'},
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
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}]
  },
  // Men's and women's teams publish separate schedules; both are shown,
  // labeled by team.
  combinedSports:new Set(['Basketball','Golf']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    'washington-state|Basketball|Jaylen Harrell':'https://www.instagram.com/jaylen._.harrell/',
    'washington-state|Basketball|Dio Blakely':'https://www.instagram.com/omgg.dioo/',
    'washington-state|Basketball|Lazerek Houston':'https://www.instagram.com/zerek12_/',
    'washington-state|Soccer|Kylie Briscoe':'https://www.instagram.com/kyliekayb/',
    'washington-state|Soccer|Isabella Amado':'https://www.instagram.com/isamado_13/',
    'washington-state|Tennis|Gabriella Harper':'https://www.instagram.com/gabi_jazzmarie/',
    'washington-state|Tennis|Ava-Monet Sycamore':'https://www.instagram.com/ava_sycamore/',
    'washington-state|Tennis|Clara Schön':'https://www.instagram.com/clara_ms06/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'washington-state|Baseball':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Basketball':['https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'washington-state|Cross Country':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Football':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Golf':['https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'washington-state|Rowing':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Soccer':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Swimming & Diving':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Tennis':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Track & Field':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'washington-state|Volleyball':'https://wsucougars.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'washington-state|Baseball':'https://wsucougars.com/sports/baseball/roster',
    'washington-state|Basketball':['https://wsucougars.com/sports/womens-basketball/roster','https://wsucougars.com/sports/mens-basketball/roster'],
    'washington-state|Cross Country':'https://wsucougars.com/sports/cross-country/roster',
    'washington-state|Football':'https://wsucougars.com/sports/football/roster',
    'washington-state|Golf':['https://wsucougars.com/sports/womens-golf/roster','https://wsucougars.com/sports/mens-golf/roster'],
    'washington-state|Rowing':'https://wsucougars.com/sports/womens-rowing/roster',
    'washington-state|Soccer':'https://wsucougars.com/sports/womens-soccer/roster',
    'washington-state|Swimming & Diving':'https://wsucougars.com/sports/womens-swimming/roster',
    'washington-state|Tennis':'https://wsucougars.com/sports/womens-tennis/roster',
    'washington-state|Track & Field':'https://wsucougars.com/sports/track-and-field/roster',
    'washington-state|Volleyball':'https://wsucougars.com/sports/womens-volleyball/roster'
  }
};

export function createWashingtonStateHandlers(deps){
  return createWmtApiHandlers(WASHINGTON_STATE_API,deps);
}
