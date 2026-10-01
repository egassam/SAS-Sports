// Arizona State school module. Shared publisher utilities stay in the Worker;
// this file owns thesundevils.com routes and Arizona State's program
// combinations. Routes start as the exact candidates production used before the
// module existed (route parity); each sport is then corrected and verified one
// at a time.
export const arizonaStateSchool={
  id:'arizona-state',
  // Basketball and Swimming & Diving publish separate men's and women's pages.
  combinedSports:new Set(['Basketball','Swimming & Diving']),
  scheduleUrls:{
    'arizona-state|Baseball':['https://thesundevils.com/sports/baseball/schedule','https://thesundevils.com/'],
    'arizona-state|Basketball':['https://thesundevils.com/sports/mens-basketball/schedule','https://thesundevils.com/sports/womens-basketball/schedule','https://thesundevils.com/sports/basketball/schedule','https://thesundevils.com/'],
    'arizona-state|Beach Volleyball':['https://thesundevils.com/sports/beach-volleyball/schedule','https://thesundevils.com/'],
    'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/schedule',
    'arizona-state|Football':'https://thesundevils.com/sports/football/schedule',
    'arizona-state|Golf':['https://thesundevils.com/sports/womens-golf/schedule','https://thesundevils.com/sports/mens-golf/schedule','https://thesundevils.com/sports/golf/schedule','https://thesundevils.com/'],
    'arizona-state|Gymnastics':['https://thesundevils.com/sports/womens-gymnastics/schedule','https://thesundevils.com/sports/mens-gymnastics/schedule','https://thesundevils.com/sports/gymnastics/schedule','https://thesundevils.com/'],
    'arizona-state|Hockey':['https://thesundevils.com/sports/mens-ice-hockey/schedule','https://thesundevils.com/sports/womens-ice-hockey/schedule','https://thesundevils.com/sports/ice-hockey/schedule','https://thesundevils.com/sports/hockey/schedule','https://thesundevils.com/'],
    'arizona-state|Lacrosse':['https://thesundevils.com/sports/womens-lacrosse/schedule','https://thesundevils.com/sports/mens-lacrosse/schedule','https://thesundevils.com/sports/lacrosse/schedule','https://thesundevils.com/'],
    'arizona-state|Soccer':'https://thesundevils.com/sports/soccer/schedule',
    'arizona-state|Softball':['https://thesundevils.com/sports/softball/schedule','https://thesundevils.com/'],
    'arizona-state|Swimming & Diving':['https://thesundevils.com/sports/mens/swimming-diving/schedule','https://thesundevils.com/sports/womens/swimming-diving/schedule'],
    'arizona-state|Tennis':['https://thesundevils.com/sports/womens-tennis/schedule','https://thesundevils.com/sports/mens-tennis/schedule','https://thesundevils.com/sports/tennis/schedule','https://thesundevils.com/'],
    'arizona-state|Track & Field':['https://thesundevils.com/sports/track-and-field/schedule','https://thesundevils.com/sports/track-field/schedule','https://thesundevils.com/'],
    'arizona-state|Volleyball':'https://thesundevils.com/sports/volleyball/schedule',
    'arizona-state|Water Polo':['https://thesundevils.com/sports/womens-water-polo/schedule','https://thesundevils.com/sports/mens-water-polo/schedule','https://thesundevils.com/sports/water-polo/schedule','https://thesundevils.com/'],
    'arizona-state|Wrestling':['https://thesundevils.com/sports/wrestling/schedule','https://thesundevils.com/']
  },
  rosterUrls:{
    'arizona-state|Baseball':'https://thesundevils.com/sports/baseball/roster',
    'arizona-state|Basketball':['https://thesundevils.com/sports/mens-basketball/roster','https://thesundevils.com/sports/womens-basketball/roster','https://thesundevils.com/sports/basketball/roster'],
    'arizona-state|Beach Volleyball':'https://thesundevils.com/sports/beach-volleyball/roster',
    'arizona-state|Cross Country':'https://thesundevils.com/sports/cross-country/roster',
    'arizona-state|Football':'https://thesundevils.com/sports/football/roster',
    'arizona-state|Golf':['https://thesundevils.com/sports/womens-golf/roster','https://thesundevils.com/sports/mens-golf/roster','https://thesundevils.com/sports/golf/roster'],
    'arizona-state|Gymnastics':['https://thesundevils.com/sports/womens-gymnastics/roster','https://thesundevils.com/sports/mens-gymnastics/roster','https://thesundevils.com/sports/gymnastics/roster'],
    'arizona-state|Hockey':['https://thesundevils.com/sports/mens-ice-hockey/roster','https://thesundevils.com/sports/womens-ice-hockey/roster','https://thesundevils.com/sports/ice-hockey/roster','https://thesundevils.com/sports/hockey/roster'],
    'arizona-state|Lacrosse':['https://thesundevils.com/sports/womens-lacrosse/roster','https://thesundevils.com/sports/mens-lacrosse/roster','https://thesundevils.com/sports/lacrosse/roster'],
    'arizona-state|Soccer':['https://thesundevils.com/sports/womens-soccer/roster','https://thesundevils.com/sports/wsoc/roster','https://thesundevils.com/sports/soccer/roster','https://thesundevils.com/sports/mens-soccer/roster'],
    'arizona-state|Softball':'https://thesundevils.com/sports/softball/roster',
    'arizona-state|Swimming & Diving':['https://thesundevils.com/sports/womens-swimming-and-diving/roster','https://thesundevils.com/sports/mens-swimming-and-diving/roster','https://thesundevils.com/sports/womens-swimming-diving/roster','https://thesundevils.com/sports/mens-swimming-diving/roster','https://thesundevils.com/sports/swimming-and-diving/roster','https://thesundevils.com/sports/swimming-diving/roster','https://thesundevils.com/sports/swimming/roster'],
    'arizona-state|Tennis':['https://thesundevils.com/sports/womens-tennis/roster','https://thesundevils.com/sports/mens-tennis/roster','https://thesundevils.com/sports/tennis/roster'],
    'arizona-state|Track & Field':['https://thesundevils.com/sports/track-and-field/roster','https://thesundevils.com/sports/track-field/roster'],
    'arizona-state|Volleyball':['https://thesundevils.com/sports/womens-volleyball/roster','https://thesundevils.com/sports/wvball/roster','https://thesundevils.com/sports/volleyball/roster'],
    'arizona-state|Water Polo':['https://thesundevils.com/sports/womens-water-polo/roster','https://thesundevils.com/sports/mens-water-polo/roster','https://thesundevils.com/sports/water-polo/roster'],
    'arizona-state|Wrestling':'https://thesundevils.com/sports/wrestling/roster'
  }
};
