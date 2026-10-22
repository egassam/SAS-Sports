import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// San Jose State school module. Shared publisher utilities stay in the Worker;
// this file owns sjsuspartans.com's schedule source, San Jose State's program
// combinations and its verified Instagram tags.
//
// sjsuspartans.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-22).
const HOST='sjsuspartans.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'football':3,'mens-basketball':5,'mens-golf':7,'mens-soccer':8,'mens-water-polo':10,'softball':11,'womens-basketball':13,'womens-beach-volleyball':14,'womens-golf':16,'womens-gymnastics':17,'womens-soccer':18,'womens-swimming-and-diving':19,'womens-tennis':20,'womens-volleyball':22,'womens-water-polo':23,'cross-country':36,'track-and-field':37};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Beach Volleyball':['womens-beach-volleyball'],
  'Cross Country':['cross-country'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Gymnastics':['womens-gymnastics'],
  'Soccer':['womens-soccer','mens-soccer'],
  'Softball':['softball'],
  'Swimming & Diving':['womens-swimming-and-diving'],
  'Tennis':['womens-tennis'],
  'Track & Field':['track-and-field'],
  'Volleyball':['womens-volleyball'],
  'Water Polo':['womens-water-polo','mens-water-polo']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-soccer':"Women's",'mens-soccer':"Men's",'womens-water-polo':"Women's",'mens-water-polo':"Men's"};
// San Jose State's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const SAN_JOSE_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/CA_college_f_San_Jose_State.html',Men:'https://www.tfrrs.org/teams/xc/CA_college_m_San_Jose_State.html'};
const SAN_JOSE_STATE_API={id:'san-jose-state',schoolName:'San Jose State',host:HOST,timeZone:'America/Los_Angeles',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:SAN_JOSE_STATE_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(SAN_JOSE_STATE_API);

export const sanJoseStateSchool={
  id:'san-jose-state',
  // The school's INFLCR Exchange, its official NIL marketplace (linked from
  // sjsuspartans.com): athlete Instagram for a sport still short of three (src/inflcr.mjs).
  inflcr:{school:'san-jose-state-university'},
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
  combinedSports:new Set(['Basketball','Golf','Soccer','Water Polo']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    'san-jose-state|Baseball|Trevor Wilson':'https://www.instagram.com/trevor_wils0n/',
    'san-jose-state|Baseball|Alex Fernandes':'https://www.instagram.com/fernie10_/',
    'san-jose-state|Baseball|Rocco Caballero':'https://www.instagram.com/roccocabllero7/',
    'san-jose-state|Cross Country|Nathan Lau':'https://www.instagram.com/nathaanlau/',
    'san-jose-state|Golf|Tessa Kremser':'https://www.instagram.com/tessakremser/',
    'san-jose-state|Golf|Moa Andersson':'https://www.instagram.com/anderssonmoaaaa/',
    'san-jose-state|Golf|Brady Foster':'https://www.instagram.com/brady__foster/',
    'san-jose-state|Softball|Haley Reeve':'https://www.instagram.com/haleyy.reeve/',
    'san-jose-state|Swimming & Diving|Sahara Dalbik':'https://www.instagram.com/sahara.dalbik/',
    'san-jose-state|Swimming & Diving|Laís e Silva':'https://www.instagram.com/laisgasparinii/',
    'san-jose-state|Swimming & Diving|Ashley Jackson':'https://www.instagram.com/jackson__ashley_/',
    'san-jose-state|Tennis|Soledad Fayos Capilla':'https://www.instagram.com/solete_capilla/',
    'san-jose-state|Tennis|Cristina Mateos Losada':'https://www.instagram.com/cristinamateoss_/',
    'san-jose-state|Tennis|Duru Durgun':'https://www.instagram.com/duru_yagmur_durgun/',
    'san-jose-state|Track & Field|Riley Costales':'https://www.instagram.com/riley_costales/',
    'san-jose-state|Track & Field|Nereyda Alvarez-Gonzalez':'https://www.instagram.com/nereydaa.alvarezz/',
    'san-jose-state|Track & Field|Savana Dutton':'https://www.instagram.com/savii.rosee/',
    'san-jose-state|Water Polo|Darcy Spark':'https://www.instagram.com/darcy.spark/',
    'san-jose-state|Water Polo|Tatianna Raffin':'https://www.instagram.com/tatyraffinn/',
    'san-jose-state|Water Polo|Mackenzy Clark':'https://www.instagram.com/mackenzyclark/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'san-jose-state|Baseball':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Basketball':['https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-jose-state|Beach Volleyball':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Cross Country':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=36&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Football':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Golf':['https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-jose-state|Gymnastics':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Soccer':['https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-jose-state|Softball':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Swimming & Diving':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Tennis':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Track & Field':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=37&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Volleyball':'https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-jose-state|Water Polo':['https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=23&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://sjsuspartans.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament']
  },
  rosterUrls:{
    'san-jose-state|Baseball':'https://sjsuspartans.com/sports/baseball/roster',
    'san-jose-state|Basketball':['https://sjsuspartans.com/sports/womens-basketball/roster','https://sjsuspartans.com/sports/mens-basketball/roster'],
    'san-jose-state|Beach Volleyball':'https://sjsuspartans.com/sports/womens-beach-volleyball/roster',
    'san-jose-state|Cross Country':'https://sjsuspartans.com/sports/cross-country/roster',
    'san-jose-state|Football':'https://sjsuspartans.com/sports/football/roster',
    'san-jose-state|Golf':['https://sjsuspartans.com/sports/womens-golf/roster','https://sjsuspartans.com/sports/mens-golf/roster'],
    'san-jose-state|Gymnastics':'https://sjsuspartans.com/sports/womens-gymnastics/roster',
    'san-jose-state|Soccer':['https://sjsuspartans.com/sports/womens-soccer/roster','https://sjsuspartans.com/sports/mens-soccer/roster'],
    'san-jose-state|Softball':'https://sjsuspartans.com/sports/softball/roster',
    'san-jose-state|Swimming & Diving':'https://sjsuspartans.com/sports/womens-swimming-and-diving/roster',
    'san-jose-state|Tennis':'https://sjsuspartans.com/sports/womens-tennis/roster',
    'san-jose-state|Track & Field':'https://sjsuspartans.com/sports/track-and-field/roster',
    'san-jose-state|Volleyball':'https://sjsuspartans.com/sports/womens-volleyball/roster',
    'san-jose-state|Water Polo':['https://sjsuspartans.com/sports/womens-water-polo/roster','https://sjsuspartans.com/sports/mens-water-polo/roster']
  }
};

export function createSanJoseStateHandlers(deps){
  return createWmtApiHandlers(SAN_JOSE_STATE_API,deps);
}
