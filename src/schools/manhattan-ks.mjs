// Manhattan High School (Manhattan, Kansas; KSHSAA 6A, Centennial League).
// The first high school (user, October 9: "We will focus on Manhattan high
// school first"). Built and verified one sport at a time.
//
// Schedule: the school's own calendar (mhs.usd383.org, ParentSquare calendar
// 128516), titled "MHS <level> <sport> - <opponent or event> - HOME|AWAY".
// Only varsity entries are read; JV, 9th grade and C-team entries are not.
// Scores: the team's MaxPreps schedule (school 41006ce9-...).
// See docs/MANHATTAN_KS_MODULE.md.

export const manhattanKsSchool={
  id:'manhattan-ks',
  calendar:{url:'https://mhs.usd383.org/api/calendars/128516/events',prefix:'MHS'},
  maxpreps:{schoolId:'41006ce9-cfb3-492a-a951-d320637bc985',base:'https://www.maxpreps.com/ks/manhattan/manhattan-indians/'},
  // Each sport: its varsity teams. `calendar` matches the team words of a
  // calendar title; `maxpreps` is the team's MaxPreps path; `label` is the
  // team of a sport played by boys and girls.
  sports:{
    Football:[{calendar:/^Varsity Football$/i,maxpreps:'football'}]
  },
  // Intrasquad scrimmages are practice, not games.
  skip:/\binter[- ]?squad\b|\bintra[- ]?squad\b/i
};
