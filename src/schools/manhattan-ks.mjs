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
  },
  // Trial track meets for the live reader: {date, folder, name, schools}.
  trials:[],
  // Meets the timer posts to AthleticLIVE (live.letsgorun.com), live on the
  // day: `meet` is the AthleticLIVE id; `schools` gives each school's team
  // names there. User, October 28: "Results: live.letsgorun.com/meets/79638
  // ... Host school: Flint Hills Christian School" (run at Warner Memorial
  // Park, Manhattan; the 2025 meet, id 58501, wrote "St Mary's Academy").
  athleticLive:[
    {date:'2026-10-31',time:'09:45',meet:79638,sport:'Cross Country',name:'Kansas Approved Schools State X-C Championships',exclude:/\bkids\b/i,
      schools:{'flint-hills-christian-ks':['Flint Hills Christian'],'st-marys-academy-ks':["St Mary's Academy","St Mary's"],
        // The 2025 meet's names for the four added October 29 (src/schools/kas-ks.mjs).
        'christ-prep-ks':['Christ Preparatory Academy','Christ Prep Academy','Christ Prep'],'veritas-christian-ks':['Veritas Christian School','Veritas Christian'],
        'kc-metro-academy-ks':['KC Metro Academy','Metro Academy'],'kickapoo-nation-ks':['Kickapoo Nation','Kickapoo Nation School']}}
  ]
};

export const manhattanKsSchool={
  id:'manhattan-ks',
  calendar:{url:'https://mhs.usd383.org/api/calendars/128516/events',prefix:'MHS'},
  // mhs.usd383.org answers Cloudflare's European locations with 520: a
  // location that cannot rebuild serves the last feed built elsewhere (KV).
  globalSavedCopy:true,
  prepGolf:{school:11,code:'MAN'},
  // Bound: the school's own finals, for games MaxPreps has no score for and
  // meets no timer or Prep.Golf page covers (`bound`, `boundMeet` below).
  bound:{school:'h20250204045200696bcbb2cc6f78a4e',page:'https://beta.gobound.com/ks/schools/manhattanhs/scores'},
  meetPro:LETSGORUN_MEETPRO,
  // KSHSAA state cross country, timed by Midwest Timing & Results (user,
  // October 29: "Do 1 and 2 with the understanding that I would prefer live
  // if I can get in contact with them"). Both teams qualified (6A Sub-State
  // Manhattan, KSHSAA's 6A qualifier list); races and site from KSHSAA's
  // state schedule. `place` matches the row on Midwest Timing's results page;
  // `milesplit` is the meet on MileSplit Live, where the timer posts live
  // results (public; user, October 29: "create the reader").
  midwestTiming:[
    {date:'2026-10-31',sport:'Cross Country',name:'KSHSAA 6A State Championship',site:'Rim Rock Farm, Lawrence',place:/^Lawrence\b/i,
      races:[{label:'Girls',time:'10:00'},{label:'Boys',time:'11:45'}],
      milesplit:787763,live:'https://milesplit.live/meets/787763',
      schools:{'manhattan-ks':['Manhattan High School']}}
  ],
  maxpreps:{schoolId:'41006ce9-cfb3-492a-a951-d320637bc985',base:'https://www.maxpreps.com/ks/manhattan/manhattan-indians/'},
  // Each sport: its varsity teams. `calendar` matches the team words of a
  // calendar title; `maxpreps` is the team's MaxPreps path; `label` is the
  // team of a sport played by boys and girls.
  // `meet` marks a sport whose calendar entries are all meets or tournaments
  // (named for the host); `matches` reads each match from MaxPreps
  // (volleyball triangulars and tournaments); `tennisReporting` finds the
  // team's draws on TennisReporting by date.
  sports:{
    Football:[{calendar:/^Varsity Football$/i,maxpreps:'football',bound:['Football']}],
    Soccer:[{calendar:/^Varsity Boys Soccer$/i,maxpreps:'soccer',label:'Boys',bound:['Boys Soccer']},{calendar:/^Varsity Girls Soccer$/i,maxpreps:'soccer/girls',label:'Girls',bound:['Girls Soccer']}],
    Volleyball:[{calendar:/^Varsity Volleyball$/i,maxpreps:'volleyball',matches:true}],
    // Varsity races only (the JV and C races are run at the same meets).
    // MileSplit Live: Manhattan High School's MileSplit team id.
    'Cross Country':[{calendar:/^Cross Country$/i,meet:true,meetPro:{team:'Manhattan',races:/\bvarsity\b/i,exclude:/junior/i},milesplit:{team:21783},boundMeet:{acts:{Girls:'Girls Cross Country',Boys:'Boys Cross Country'},lowWins:true,unit:'pts'}}],
    Tennis:[{calendar:/^Varsity Girls Tennis$/i,meet:true,label:'Girls',tennisReporting:{stateId:23,genderId:2,school:'Manhattan HS'}},{calendar:/^Varsity Boys Tennis$/i,meet:true,label:'Boys',tennisReporting:{stateId:23,genderId:1,school:'Manhattan HS'}}],
    // Golf results from Prep.Golf (school 11; golfers' school code MAN).
    Golf:[{calendar:/^Varsity Girls Golf$/i,meet:true,label:'Girls',boundMeet:{acts:{Girls:'Girls Golf'},lowWins:true,unit:'strokes'}},{calendar:/^Varsity Boys Golf$/i,meet:true,label:'Boys',boundMeet:{acts:{Boys:'Boys Golf'},lowWins:true,unit:'strokes'}}]
  },
  // Intrasquad scrimmages are practice, not games.
  skip:/\binter[- ]?squad\b|\bintra[- ]?squad\b/i
};
