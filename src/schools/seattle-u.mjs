import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// Seattle U school module. Shared publisher utilities stay in the Worker;
// this file owns goseattleu.com's schedule source, Seattle U's program
// combinations and its verified Instagram tags.
//
// goseattleu.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-22).
const HOST='goseattleu.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'cross-country':2,'mens-basketball':3,'mens-golf':4,'mens-soccer':5,'mens-swimming':6,'softball':8,'track-and-field':9,'volleyball':10,'womens-basketball':11,'womens-golf':12,'womens-rowing':13,'womens-soccer':14,'womens-swimming':15,'womens-tennis':16};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Cross Country':['cross-country'],
  'Golf':['womens-golf','mens-golf'],
  'Rowing':['womens-rowing'],
  'Soccer':['womens-soccer','mens-soccer'],
  'Softball':['softball'],
  'Swimming & Diving':['womens-swimming','mens-swimming'],
  'Tennis':['womens-tennis'],
  'Track & Field':['track-and-field'],
  'Volleyball':['volleyball']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-soccer':"Women's",'mens-soccer':"Men's",'womens-swimming':"Women's",'mens-swimming':"Men's"};
// Seattle U's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const SEATTLE_U_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/WA_college_f_Seattle_U.html',Men:'https://www.tfrrs.org/teams/xc/WA_college_m_Seattle_U.html'};
const SEATTLE_U_API={id:'seattle-u',schoolName:'Seattle U',host:HOST,timeZone:'America/Los_Angeles',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:SEATTLE_U_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(SEATTLE_U_API);

export const seattleUSchool={
  id:'seattle-u',
  // The school's INFLCR Exchange, its official NIL marketplace (linked from
  // goseattleu.com): athlete Instagram for a sport still short of three (src/inflcr.mjs).
  inflcr:{school:'seattle-university'},
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
  combinedSports:new Set(['Basketball','Golf','Soccer','Swimming & Diving']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    'seattle-u|Baseball|Brandon Stinnett':'https://www.instagram.com/brandon.stinnett/',
    'seattle-u|Baseball|Josh Cunnigan':'https://www.instagram.com/j.cunnigan/',
    'seattle-u|Baseball|Micah Hagler':'https://www.instagram.com/mjhag04/',
    'seattle-u|Cross Country|Nathaniel Laursen':'https://www.instagram.com/nathaniel_laursen/',
    'seattle-u|Cross Country|Jovanny Lieb':'https://www.instagram.com/jojo.lieb08/',
    'seattle-u|Cross Country|Khalid Hirsi':'https://www.instagram.com/khalidow1/',
    'seattle-u|Golf|Carly Ikei':'https://www.instagram.com/ikei_golf25/',
    'seattle-u|Golf|Blayne Brown':'https://www.instagram.com/blaynebgolfin/',
    'seattle-u|Golf|Niya Friesen':'https://www.instagram.com/niyafriesen_golf/',
    'seattle-u|Softball|Karen Spadafora':'https://www.instagram.com/_karenspadafora/',
    'seattle-u|Softball|Mikee Morris':'https://www.instagram.com/michaela_morris_/',
    'seattle-u|Softball|Avari Morris':'https://www.instagram.com/avarimorris/',
    'seattle-u|Swimming & Diving|Mia David':'https://www.instagram.com/miacdavid4/',
    'seattle-u|Swimming & Diving|Jacquelyn Horning':'https://www.instagram.com/jacquelyn.h.e/',
    'seattle-u|Swimming & Diving|Delaney Johns':'https://www.instagram.com/delaney_0_0_/',
    'seattle-u|Tennis|Patricia Gui':'https://www.instagram.com/patriicia.gui/',
    'seattle-u|Tennis|Costanca Catalao':'https://www.instagram.com/costanca.m.catalao/',
    'seattle-u|Tennis|Kristina Vasileva':'https://www.instagram.com/krisi_vassileva/',
    'seattle-u|Track & Field|Khalid Hirsi':'https://www.instagram.com/khalidow1/',
    'seattle-u|Track & Field|Kristina Shkalenkova':'https://www.instagram.com/kris_so_cute/',
    'seattle-u|Track & Field|Jordan White':'https://www.instagram.com/_jordy.white/',
    'seattle-u|Volleyball|Adee Butler':'https://www.instagram.com/adee.butler05/',
    'seattle-u|Volleyball|Grace Jones':'https://www.instagram.com/gracejones.10/',
    'seattle-u|Volleyball|Taniyah Pruitt':'https://www.instagram.com/taniyahsp/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'seattle-u|Baseball':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Basketball':['https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'seattle-u|Cross Country':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Golf':['https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'seattle-u|Rowing':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Soccer':['https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'seattle-u|Softball':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Swimming & Diving':['https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'seattle-u|Tennis':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Track & Field':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'seattle-u|Volleyball':'https://goseattleu.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'seattle-u|Baseball':'https://goseattleu.com/sports/baseball/roster',
    'seattle-u|Basketball':['https://goseattleu.com/sports/womens-basketball/roster','https://goseattleu.com/sports/mens-basketball/roster'],
    'seattle-u|Cross Country':'https://goseattleu.com/sports/cross-country/roster',
    'seattle-u|Golf':['https://goseattleu.com/sports/womens-golf/roster','https://goseattleu.com/sports/mens-golf/roster'],
    'seattle-u|Rowing':'https://goseattleu.com/sports/womens-rowing/roster',
    'seattle-u|Soccer':['https://goseattleu.com/sports/womens-soccer/roster','https://goseattleu.com/sports/mens-soccer/roster'],
    'seattle-u|Softball':'https://goseattleu.com/sports/softball/roster',
    'seattle-u|Swimming & Diving':['https://goseattleu.com/sports/womens-swimming/roster','https://goseattleu.com/sports/mens-swimming/roster'],
    'seattle-u|Tennis':'https://goseattleu.com/sports/womens-tennis/roster',
    'seattle-u|Track & Field':'https://goseattleu.com/sports/track-and-field/roster',
    'seattle-u|Volleyball':'https://goseattleu.com/sports/volleyball/roster'
  }
};

export function createSeattleUHandlers(deps){
  return createWmtApiHandlers(SEATTLE_U_API,deps);
}
