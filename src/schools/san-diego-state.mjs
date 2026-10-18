import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// San Diego State school module. Shared publisher utilities stay in the Worker;
// this file owns goaztecs.com's schedule source, San Diego State's program
// combinations and its verified Instagram tags.
//
// goaztecs.com is a WMT (Nuxt) site whose schedule page loads its events from the
// site's own JSON API (/website-api/schedule-events), as Stanford's does: the
// shared API reader (src/wmt-api-kit.mjs) reads it. Written by
// scripts/port-wmt-api.mjs from /website-api/sports (2026-10-18).
const HOST='goaztecs.com';
// The site's sport ids (/website-api/sports): one per team.
const SPORT_IDS={'baseball':1,'football':5,'mens-basketball':7,'mens-golf':8,'mens-soccer':9,'mens-tennis':10,'softball':12,'womens-basketball':13,'womens-cross-country':14,'womens-golf':15,'womens-lacrosse':16,'womens-soccer':18,'swimming-and-diving':19,'womens-tennis':20,'track-and-field':21,'volleyball':22,'water-polo':23};
const SLUGS={
  'Baseball':['baseball'],
  'Basketball':['womens-basketball','mens-basketball'],
  'Cross Country':['womens-cross-country'],
  'Football':['football'],
  'Golf':['womens-golf','mens-golf'],
  'Lacrosse':['womens-lacrosse'],
  'Soccer':['womens-soccer','mens-soccer'],
  'Softball':['softball'],
  'Swimming & Diving':['swimming-and-diving'],
  'Tennis':['womens-tennis','mens-tennis'],
  'Track & Field':['track-and-field'],
  'Volleyball':['volleyball'],
  'Water Polo':['water-polo']
};
const TEAMS={'womens-basketball':"Women's",'mens-basketball':"Men's",'womens-golf':"Women's",'mens-golf':"Men's",'womens-soccer':"Women's",'mens-soccer':"Men's",'womens-tennis':"Women's",'mens-tennis':"Men's"};
// San Diego State's TFRRS cross country team pages (complete races and team
// scores; the schedule gives the team places).
export const SAN_DIEGO_STATE_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/CA_college_f_San_Diego_State.html',Men:'https://www.tfrrs.org/teams/xc/CA_college_m_San_Diego_State.html'};
const SAN_DIEGO_STATE_API={id:'san-diego-state',schoolName:'San Diego State',host:HOST,timeZone:'America/Los_Angeles',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:SAN_DIEGO_STATE_TFRRS_TEAMS,conferenceNames:{}};
const routes=wmtApiSchoolRoutes(SAN_DIEGO_STATE_API);

export const sanDiegoStateSchool={
  id:'san-diego-state',
  // The school's INFLCR Exchange, its official NIL marketplace (goaztecs.com/sports/aztec-nil,
  // checked Oct 18): athlete Instagram for a sport still short of three (src/inflcr.mjs).
  inflcr:{school:'san-diego-state-university'},
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
    'san-diego-state|Baseball|Drew Rutter':'https://www.instagram.com/drewruttter/',
    'san-diego-state|Baseball|Alito McBean':'https://www.instagram.com/alitomcb_/',
    'san-diego-state|Baseball|Chris Canavan':'https://www.instagram.com/chrislcanavan/',
    'san-diego-state|Cross Country|Emilia Greenway':'https://www.instagram.com/itsemiliawhat/',
    'san-diego-state|Cross Country|Ginger Oberg':'https://www.instagram.com/gingeroberg/',
    'san-diego-state|Cross Country|Emily Russo':'https://www.instagram.com/em.ily_russo/',
    'san-diego-state|Golf|Kaylee Chung':'https://www.instagram.com/kayleec_golf/',
    'san-diego-state|Golf|Emilia Nordström':'https://www.instagram.com/emilia.nordstrom_/',
    'san-diego-state|Golf|Manon Martin':'https://www.instagram.com/manon._.mrtn_/',
    'san-diego-state|Lacrosse|Liv Tramontana':'https://www.instagram.com/livtramontana/',
    'san-diego-state|Lacrosse|Macie Buell':'https://www.instagram.com/buell.macie/',
    'san-diego-state|Lacrosse|Megan McDevitt':'https://www.instagram.com/megan_mcdevitt_/',
    'san-diego-state|Swimming & Diving|Alina Skrocki':'https://www.instagram.com/alinaskrocki/',
    'san-diego-state|Swimming & Diving|Charlotte Sevin':'https://www.instagram.com/charlotttesevin/',
    'san-diego-state|Swimming & Diving|Alyssa Schiller':'https://www.instagram.com/alyssa_schiller/',
    'san-diego-state|Tennis|Vesa Gjinaj':'https://www.instagram.com/vesagjinaj/',
    'san-diego-state|Tennis|Liisa Varul':'https://www.instagram.com/liisavarul/',
    'san-diego-state|Volleyball|Gianna Bender':'https://www.instagram.com/gianna.bender/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'san-diego-state|Baseball':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=1&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Basketball':['https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-diego-state|Cross Country':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Football':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=5&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Golf':['https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-diego-state|Lacrosse':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Soccer':['https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=18&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-diego-state|Softball':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Swimming & Diving':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Tennis':['https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=20&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'san-diego-state|Track & Field':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=21&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Volleyball':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'san-diego-state|Water Polo':'https://goaztecs.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=23&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'san-diego-state|Baseball':'https://goaztecs.com/sports/baseball/roster',
    'san-diego-state|Basketball':['https://goaztecs.com/sports/womens-basketball/roster','https://goaztecs.com/sports/mens-basketball/roster'],
    'san-diego-state|Cross Country':'https://goaztecs.com/sports/womens-cross-country/roster',
    'san-diego-state|Football':'https://goaztecs.com/sports/football/roster',
    'san-diego-state|Golf':['https://goaztecs.com/sports/womens-golf/roster','https://goaztecs.com/sports/mens-golf/roster'],
    'san-diego-state|Lacrosse':'https://goaztecs.com/sports/womens-lacrosse/roster',
    'san-diego-state|Soccer':['https://goaztecs.com/sports/womens-soccer/roster','https://goaztecs.com/sports/mens-soccer/roster'],
    'san-diego-state|Softball':'https://goaztecs.com/sports/softball/roster',
    'san-diego-state|Swimming & Diving':'https://goaztecs.com/sports/swimming-and-diving/roster',
    'san-diego-state|Tennis':['https://goaztecs.com/sports/womens-tennis/roster','https://goaztecs.com/sports/mens-tennis/roster'],
    'san-diego-state|Track & Field':'https://goaztecs.com/sports/track-and-field/roster',
    'san-diego-state|Volleyball':'https://goaztecs.com/sports/volleyball/roster',
    'san-diego-state|Water Polo':'https://goaztecs.com/sports/water-polo/roster'
  }
};

export function createSanDiegoStateHandlers(deps){
  return createWmtApiHandlers(SAN_DIEGO_STATE_API,deps);
}
