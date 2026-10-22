import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// Old Dominion school module. Shared publisher utilities stay in the Worker;
// this file owns odusports.com's schedule source, Old Dominion's program
// combinations and its verified Instagram tags.
//
// odusports.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-22).
const HOST='odusports.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'womens-basketball':1,'mens-basketball':2,'mens-tennis':3,'swimming':4,'baseball':6,'field-hockey':15,'football':16,'mens-golf':19,'mens-soccer':20,'volleyball':25,'womens-golf':26,'womens-lacrosse':27,'womens-rowing':28,'womens-soccer':29,'womens-tennis':30};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Field Hockey':['field-hockey'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Lacrosse':['womens-lacrosse'],
  'Rowing':['womens-rowing'],
  'Soccer':['womens-soccer','mens-soccer'],
  'Tennis':['womens-tennis','mens-tennis'],
  'Volleyball':['volleyball'],
  'Swimming & Diving':['swimming']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-tennis':"Women's",'mens-tennis':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-soccer':"Women's",'mens-soccer':"Men's"};
// Old Dominion's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const OLD_DOMINION_TFRRS_TEAMS={Women:null,Men:null};
const OLD_DOMINION_API={id:'old-dominion',schoolName:'Old Dominion',host:HOST,timeZone:'America/New_York',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:OLD_DOMINION_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(OLD_DOMINION_API);

export const oldDominionSchool={
  id:'old-dominion',
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
  combinedSports:new Set(['Basketball','Golf','Soccer','Tennis']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{},
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'old-dominion|Baseball':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Basketball':['https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'old-dominion|Field Hockey':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Football':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Golf':['https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=26&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'old-dominion|Lacrosse':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=27&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Rowing':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=28&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Soccer':['https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=29&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'old-dominion|Tennis':['https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=30&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'old-dominion|Swimming & Diving':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'old-dominion|Volleyball':'https://odusports.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=25&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'old-dominion|Baseball':'https://odusports.com/sports/baseball/roster',
    'old-dominion|Basketball':['https://odusports.com/sports/womens-basketball/roster','https://odusports.com/sports/mens-basketball/roster'],
    'old-dominion|Field Hockey':'https://odusports.com/sports/field-hockey/roster',
    'old-dominion|Football':'https://odusports.com/sports/football/roster',
    'old-dominion|Golf':['https://odusports.com/sports/womens-golf/roster','https://odusports.com/sports/mens-golf/roster'],
    'old-dominion|Lacrosse':'https://odusports.com/sports/womens-lacrosse/roster',
    'old-dominion|Rowing':'https://odusports.com/sports/womens-rowing/roster',
    'old-dominion|Soccer':['https://odusports.com/sports/womens-soccer/roster','https://odusports.com/sports/mens-soccer/roster'],
    'old-dominion|Tennis':['https://odusports.com/sports/womens-tennis/roster','https://odusports.com/sports/mens-tennis/roster'],
    'old-dominion|Swimming & Diving':'https://odusports.com/sports/swimming/roster',
    'old-dominion|Volleyball':'https://odusports.com/sports/volleyball/roster'
  }
};

export function createOldDominionHandlers(deps){
  return createWmtApiHandlers(OLD_DOMINION_API,deps);
}
