import {createScheduleDataEnricher} from '../sidearm-schedule-data.mjs';
// Utah school module. Shared publisher utilities stay in the Worker; this file
// owns utahutes.com routes and Utah's program combinations. Routes start as the
// exact candidates production used before the module existed (route parity);
// each sport is then corrected and verified one at a time.
export const utahSchool={
  id:'utah',
  // Basketball and Swimming & Diving publish separate men's and women's pages.
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  scheduleUrls:{
    'utah|Baseball':['https://utahutes.com/sports/baseball/schedule','https://utahutes.com/'],
    'utah|Basketball':['https://utahutes.com/sports/mens-basketball/schedule','https://utahutes.com/sports/womens-basketball/schedule','https://utahutes.com/sports/basketball/schedule','https://utahutes.com/'],
    'utah|Beach Volleyball':['https://utahutes.com/sports/beach-volleyball/schedule','https://utahutes.com/'],
    'utah|Cross Country':'https://utahutes.com/sports/cross-country/schedule',
    'utah|Football':'https://utahutes.com/sports/football/schedule',
    'utah|Golf':['https://utahutes.com/sports/womens-golf/schedule','https://utahutes.com/sports/mens-golf/schedule','https://utahutes.com/sports/golf/schedule','https://utahutes.com/'],
    'utah|Gymnastics':['https://utahutes.com/sports/womens-gymnastics/schedule','https://utahutes.com/sports/mens-gymnastics/schedule','https://utahutes.com/sports/gymnastics/schedule','https://utahutes.com/'],
    'utah|Lacrosse':['https://utahutes.com/sports/womens-lacrosse/schedule','https://utahutes.com/sports/mens-lacrosse/schedule','https://utahutes.com/sports/lacrosse/schedule','https://utahutes.com/'],
    'utah|Skiing':['https://utahutes.com/sports/skiing/schedule','https://utahutes.com/'],
    'utah|Soccer':'https://utahutes.com/sports/womens-soccer/schedule',
    'utah|Softball':['https://utahutes.com/sports/softball/schedule','https://utahutes.com/'],
    'utah|Swimming & Diving':['https://utahutes.com/sports/womens-swimming-and-diving/schedule','https://utahutes.com/sports/mens-swimming-and-diving/schedule','https://utahutes.com/sports/womens-swimming-diving/schedule','https://utahutes.com/sports/mens-swimming-diving/schedule','https://utahutes.com/sports/swimming-and-diving/schedule','https://utahutes.com/sports/swimming-diving/schedule','https://utahutes.com/sports/swimming/schedule','https://utahutes.com/'],
    'utah|Tennis':['https://utahutes.com/sports/womens-tennis/schedule','https://utahutes.com/sports/mens-tennis/schedule','https://utahutes.com/sports/tennis/schedule','https://utahutes.com/'],
    'utah|Track & Field':['https://utahutes.com/sports/track-and-field/schedule','https://utahutes.com/sports/track-field/schedule','https://utahutes.com/'],
    'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/schedule'
  },
  rosterUrls:{
    'utah|Baseball':'https://utahutes.com/sports/baseball/roster',
    'utah|Basketball':['https://utahutes.com/sports/mens-basketball/roster','https://utahutes.com/sports/womens-basketball/roster','https://utahutes.com/sports/basketball/roster'],
    'utah|Beach Volleyball':'https://utahutes.com/sports/beach-volleyball/roster',
    'utah|Cross Country':'https://utahutes.com/sports/cross-country/roster',
    'utah|Football':'https://utahutes.com/sports/football/roster',
    'utah|Golf':['https://utahutes.com/sports/womens-golf/roster','https://utahutes.com/sports/mens-golf/roster','https://utahutes.com/sports/golf/roster'],
    'utah|Gymnastics':['https://utahutes.com/sports/womens-gymnastics/roster','https://utahutes.com/sports/mens-gymnastics/roster','https://utahutes.com/sports/gymnastics/roster'],
    'utah|Lacrosse':['https://utahutes.com/sports/womens-lacrosse/roster','https://utahutes.com/sports/mens-lacrosse/roster','https://utahutes.com/sports/lacrosse/roster'],
    'utah|Skiing':'https://utahutes.com/sports/skiing/roster',
    'utah|Soccer':'https://utahutes.com/sports/womens-soccer/roster',
    'utah|Softball':'https://utahutes.com/sports/softball/roster',
    'utah|Swimming & Diving':['https://utahutes.com/sports/womens-swimming-and-diving/roster','https://utahutes.com/sports/mens-swimming-and-diving/roster','https://utahutes.com/sports/womens-swimming-diving/roster','https://utahutes.com/sports/mens-swimming-diving/roster','https://utahutes.com/sports/swimming-and-diving/roster','https://utahutes.com/sports/swimming-diving/roster','https://utahutes.com/sports/swimming/roster'],
    'utah|Tennis':['https://utahutes.com/sports/womens-tennis/roster','https://utahutes.com/sports/mens-tennis/roster','https://utahutes.com/sports/tennis/roster'],
    'utah|Track & Field':['https://utahutes.com/sports/track-and-field/roster','https://utahutes.com/sports/track-field/roster'],
    'utah|Volleyball':'https://utahutes.com/sports/womens-volleyball/roster'
  }
};

// utahutes.com schedule page data (see src/sidearm-schedule-data.mjs), applied
// only to sports checked against an official Utah page.
// W/L headline, one Result row and exact recap, as K-State shows results.
const PAYLOAD_RESULT_SPORTS=new Set(['Football']);
// Published start times (local wall clock).
const PAYLOAD_TIME_SPORTS=new Set(['Football']);

export function createUtahHandlers({slug}={}){
  const enrichScheduleEvents=createScheduleDataEnricher({schoolId:'utah',host:'utahutes.com',slug,resultSports:PAYLOAD_RESULT_SPORTS,timeSports:PAYLOAD_TIME_SPORTS});
  return{enrichScheduleEvents};
}
