import {createWmtApiHandlers,wmtApiSchoolRoutes} from '../wmt-api-kit.mjs';

// Stanford school module. Shared publisher utilities stay in the Worker;
// this file owns gostanford.com's schedule source, Stanford's program
// combinations and its verified Instagram tags.
//
// gostanford.com is a WMT (Nuxt) site whose schedule cards are a seventh
// generation (`schedule-event-item-team__opponent-name`, checked Oct 15); the
// page loads them from the site's own JSON API (/website-api/schedule-events),
// as Notre Dame's does. The shared API reader (src/wmt-api-kit.mjs) reads it.
const HOST='gostanford.com';
// The site's sport ids (/website-api/sports): one per team. Artistic
// Swimming, Sailing and Squash are not in the app's catalog.
const SPORT_IDS={baseball:2,'beach-volleyball':3,'cross-country':4,fencing:6,'field-hockey':7,football:8,'mens-basketball':9,'mens-golf':10,'mens-gymnastics':11,'mens-rowing':12,'mens-soccer':13,'mens-swimming-diving':14,'mens-tennis':15,'mens-volleyball':16,'mens-water-polo':17,softball:19,'track-field':21,'womens-basketball':22,'womens-golf':23,'womens-gymnastics':24,'womens-lacrosse':25,'lightweight-rowing':26,'womens-rowing':27,'womens-soccer':28,'womens-swimming-diving':29,'womens-tennis':30,'womens-volleyball':31,'womens-water-polo':32,wrestling:33};
const SLUGS={
  'Baseball':['baseball'],'Basketball':['mens-basketball','womens-basketball'],'Beach Volleyball':['beach-volleyball'],'Cross Country':['cross-country'],
  'Fencing':['fencing'],'Field Hockey':['field-hockey'],'Football':['football'],'Golf':['womens-golf','mens-golf'],'Gymnastics':['womens-gymnastics','mens-gymnastics'],
  'Lacrosse':['womens-lacrosse'],'Rowing':['womens-rowing','lightweight-rowing','mens-rowing'],'Soccer':['womens-soccer','mens-soccer'],'Softball':['softball'],
  'Swimming & Diving':['womens-swimming-diving','mens-swimming-diving'],'Tennis':['womens-tennis','mens-tennis'],'Track & Field':['track-field'],
  'Volleyball':['womens-volleyball','mens-volleyball'],'Water Polo':['womens-water-polo','mens-water-polo'],'Wrestling':['wrestling']
};
// Women's lightweight rowing is its own team (as Wisconsin's).
const TEAMS={'mens-basketball':"Men's",'womens-basketball':"Women's",'mens-golf':"Men's",'womens-golf':"Women's",'mens-gymnastics':"Men's",'womens-gymnastics':"Women's",
  'womens-rowing':"Women's",'lightweight-rowing':'Lightweight','mens-rowing':"Men's",'mens-soccer':"Men's",'womens-soccer':"Women's",
  'mens-swimming-diving':"Men's",'womens-swimming-diving':"Women's",'mens-tennis':"Men's",'womens-tennis':"Women's",
  'mens-volleyball':"Men's",'womens-volleyball':"Women's",'mens-water-polo':"Men's",'womens-water-polo':"Women's"};
// Stanford's TFRRS cross country team pages (complete races and team scores;
// the schedule gives the team places).
export const STANFORD_TFRRS_TEAMS={Women:'https://www.tfrrs.org/teams/xc/CA_college_f_Stanford.html',Men:'https://www.tfrrs.org/teams/xc/CA_college_m_Stanford.html'};
const STANFORD_API={id:'stanford',schoolName:'Stanford',host:HOST,timeZone:'America/Los_Angeles',sportIds:SPORT_IDS,slugs:SLUGS,teams:TEAMS,tfrrsTeams:STANFORD_TFRRS_TEAMS,
  // Water polo, men's volleyball, men's gymnastics and beach volleyball play
  // in the MPSF (the site's conference 6; 2 is the ACC).
  conferenceNames:{6:'MPSF'}};
const routes=wmtApiSchoolRoutes(STANFORD_API);

export const stanfordSchool={
  id:'stanford',
  // Sports whose official schedule this module reads itself (the site's
  // schedule API). Every other sport keeps the shared parsers.
  apiSports:new Set(Object.keys(SLUGS)),
  // Live game state from an independent scoreboard, per sport; the official
  // schedule stays the results source of record. Football uses the shared
  // default (ESPN's FBS group).
  liveScoreboards:{
    'Volleyball':[{path:'volleyball/womens-college-volleyball',team_label:"Women's",sourceName:'Live college volleyball scoreboard'}],
    'Soccer':[{path:'soccer/usa.ncaa.m.1',team_label:"Men's",sourceName:"Live men's college soccer scoreboard"},{path:'soccer/usa.ncaa.w.1',team_label:"Women's",sourceName:"Live women's college soccer scoreboard"}],
    'Basketball':[{path:'basketball/mens-college-basketball',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},{path:'basketball/womens-college-basketball',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}],
    'Baseball':[{path:'baseball/college-baseball',sourceName:'Live college baseball scoreboard'}],
    'Softball':[{path:'baseball/college-softball',sourceName:'Live college softball scoreboard'}]
  },
  // Men's and women's teams publish separate schedules; both are shown,
  // labeled by team.
  combinedSports:new Set(['Basketball','Golf','Gymnastics','Rowing','Soccer','Swimming & Diving','Tennis','Volleyball','Water Polo']),
  // Every team reads the same API address with its own sport id: the team is
  // named by the whole address.
  teamLabels:routes.teamLabels,
  verifiedInstagrams:{
    // Rosters that link few athletes' accounts (Golf 9, Water Polo 8 of 54
    // profiles; Ryan Ohl's link is broken): three pinned from the profiles.
    'stanford|Golf|Meja Örtengren':'https://www.instagram.com/mejaortengren/',
    'stanford|Golf|Leigh Chien':'https://www.instagram.com/leigh.chien/',
    'stanford|Golf|Anna Song':'https://www.instagram.com/_anna.song/',
    'stanford|Swimming & Diving|Charlotte Hook':'https://www.instagram.com/charlottehhook/',
    'stanford|Water Polo|Konstantinos Mathiopoulos':'https://www.instagram.com/konmath__/',
    'stanford|Water Polo|Harrison Rohlen':'https://www.instagram.com/hrohlen/',
    'stanford|Water Polo|Gavin West':'https://www.instagram.com/gwest2003/'
  },
  // Each team's API address (one sport id per team) and roster page,
  // written out: the certification checks read the routes in this file
  // (tests check them against wmtApiSchoolRoutes).
  scheduleUrls:{
    'stanford|Baseball':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=2&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Basketball':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=9&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=22&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Beach Volleyball':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=3&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Cross Country':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=4&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Fencing':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=6&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Field Hockey':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=7&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Football':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=8&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Golf':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=23&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=10&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Gymnastics':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=24&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=11&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Lacrosse':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=25&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Rowing':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=27&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=26&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=12&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Soccer':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=28&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=13&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Softball':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=19&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Swimming & Diving':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=29&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=14&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Tennis':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=30&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=15&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Track & Field':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=21&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament',
    'stanford|Volleyball':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=31&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=16&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Water Polo':['https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=32&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament','https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=17&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'],
    'stanford|Wrestling':'https://gostanford.com/website-api/schedule-events?filter%5Bschedule.sport_id%5D=33&per_page=100&sort=-datetime&include=scheduleEventResult,postEventArticle,scheduleEventLinks,tournament'
  },
  rosterUrls:{
    'stanford|Baseball':'https://gostanford.com/sports/baseball/roster',
    'stanford|Basketball':['https://gostanford.com/sports/mens-basketball/roster','https://gostanford.com/sports/womens-basketball/roster'],
    'stanford|Beach Volleyball':'https://gostanford.com/sports/beach-volleyball/roster',
    'stanford|Cross Country':'https://gostanford.com/sports/cross-country/roster',
    'stanford|Fencing':'https://gostanford.com/sports/fencing/roster',
    'stanford|Field Hockey':'https://gostanford.com/sports/field-hockey/roster',
    'stanford|Football':'https://gostanford.com/sports/football/roster',
    'stanford|Golf':['https://gostanford.com/sports/womens-golf/roster','https://gostanford.com/sports/mens-golf/roster'],
    'stanford|Gymnastics':['https://gostanford.com/sports/womens-gymnastics/roster','https://gostanford.com/sports/mens-gymnastics/roster'],
    'stanford|Lacrosse':'https://gostanford.com/sports/womens-lacrosse/roster',
    'stanford|Rowing':['https://gostanford.com/sports/womens-rowing/roster','https://gostanford.com/sports/lightweight-rowing/roster','https://gostanford.com/sports/mens-rowing/roster'],
    'stanford|Soccer':['https://gostanford.com/sports/womens-soccer/roster','https://gostanford.com/sports/mens-soccer/roster'],
    'stanford|Softball':'https://gostanford.com/sports/softball/roster',
    'stanford|Swimming & Diving':['https://gostanford.com/sports/womens-swimming-diving/roster','https://gostanford.com/sports/mens-swimming-diving/roster'],
    'stanford|Tennis':['https://gostanford.com/sports/womens-tennis/roster','https://gostanford.com/sports/mens-tennis/roster'],
    'stanford|Track & Field':'https://gostanford.com/sports/track-field/roster',
    'stanford|Volleyball':['https://gostanford.com/sports/womens-volleyball/roster','https://gostanford.com/sports/mens-volleyball/roster'],
    'stanford|Water Polo':['https://gostanford.com/sports/womens-water-polo/roster','https://gostanford.com/sports/mens-water-polo/roster'],
    'stanford|Wrestling':'https://gostanford.com/sports/wrestling/roster'
  }
};

export function createStanfordHandlers(deps){
  return createWmtApiHandlers(STANFORD_API,deps);
}
