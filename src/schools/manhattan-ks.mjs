// Manhattan High School (Manhattan, Kansas; KSHSAA 6A, Centennial League).
// The first high school (user, October 9: "We will focus on Manhattan high
// school first"). Built and verified one sport at a time.
//
// Schedule: the school's own calendar (mhs.usd383.org, ParentSquare calendar
// 128516), titled "MHS <level> <sport> - <opponent or event> - HOME|AWAY".
// Only varsity entries are read; JV, 9th grade and C-team entries are not.
// Scores: the team's MaxPreps schedule (school 41006ce9-...).
// See docs/MANHATTAN_KS_MODULE.md.

// Cross country results: the timer's MeetPro pages (user, October 10: "Here
// is where my timer puts the cross country races", bit.ly/LetsGoRunMHK).
// Meets found by date; the results list does not link every meet (the 2026
// Manhattan, Wamego, Fort Riley and Rock Creek meets were found under last
// year's names), so the meets known to include Manhattan schools are listed.
export const LETSGORUN_MEETPRO={
  base:'http://results.tfmeetpro.com/LetsGoRun_Timing/',
  listing:'https://letsgoruncom.rsupartner.com/race-results',
  folders:{
    '2026-09-05':['2026_Manhattan_XC_Invitational'],
    '2026-09-08':['2026_Wamego_Middle_School_Invitational'],
    '2026-09-10':['2026_Fort_Riley_XC_Invitational'],
    '2026-09-15':['2026_Clay_Center_XC_Invitational'],
    '2026-09-29':['2026_Rock_Creek_Cross_Country_Invitational'],
    '2026-10-02':['2026_Centennial_League_Middle_School_XC_Championships']
  }
};

export const manhattanKsSchool={
  id:'manhattan-ks',
  calendar:{url:'https://mhs.usd383.org/api/calendars/128516/events',prefix:'MHS'},
  meetPro:LETSGORUN_MEETPRO,
  maxpreps:{schoolId:'41006ce9-cfb3-492a-a951-d320637bc985',base:'https://www.maxpreps.com/ks/manhattan/manhattan-indians/'},
  // Each sport: its varsity teams. `calendar` matches the team words of a
  // calendar title; `maxpreps` is the team's MaxPreps path; `label` is the
  // team of a sport played by boys and girls.
  // `meet` marks a sport whose calendar entries are all meets or tournaments
  // (named for the host); `matches` reads each match from MaxPreps
  // (volleyball triangulars and tournaments); `tennisReporting` finds the
  // team's draws on TennisReporting by date.
  sports:{
    Football:[{calendar:/^Varsity Football$/i,maxpreps:'football'}],
    Soccer:[{calendar:/^Varsity Boys Soccer$/i,maxpreps:'soccer',label:'Boys'},{calendar:/^Varsity Girls Soccer$/i,maxpreps:'soccer/girls',label:'Girls'}],
    Volleyball:[{calendar:/^Varsity Volleyball$/i,maxpreps:'volleyball',matches:true}],
    // Varsity races only (the JV and C races are run at the same meets).
    'Cross Country':[{calendar:/^Cross Country$/i,meet:true,meetPro:{team:'Manhattan',races:/\bvarsity\b/i,exclude:/junior/i}}],
    Tennis:[{calendar:/^Varsity Girls Tennis$/i,meet:true,label:'Girls',tennisReporting:{stateId:23,genderId:2,school:'Manhattan HS'}},{calendar:/^Varsity Boys Tennis$/i,meet:true,label:'Boys',tennisReporting:{stateId:23,genderId:1,school:'Manhattan HS'}}],
    Golf:[{calendar:/^Varsity Girls Golf$/i,meet:true,label:'Girls'},{calendar:/^Varsity Boys Golf$/i,meet:true,label:'Boys'}]
  },
  // Intrasquad scrimmages are practice, not games.
  skip:/\binter[- ]?squad\b|\bintra[- ]?squad\b/i
};
