// Riley County and Pottawatomie County, Kansas: every middle school and high
// school beside Manhattan's (user, October 25: "Let's add all of the middle
// schools and high schools of Riley county and Pottawatomie county of Kansas.
// Please check all available websites for these middle school and high school
// sports"). See docs/RILEY_POTTAWATOMIE_KS_MODULE.md.
//
// Schedules: Bound (the KSHSAA platform the schools enter their schedules
// in; src/high-school.mjs `boundSchedule`) for Riley County, Wamego, Rock
// Creek, St. Marys, Onaga and St. Mary's Academy; the district calendar for
// Blue Valley (Randolph) and Manhattan Catholic (ParentSquare, titles typed by
// hand: `parseFreeTitle`); the athletics sheet Flint Hills Christian links
// (`sheetCalendar`). Scores: MaxPreps and the finals entered on Bound; cross
// country from LetsGoRun Timing (MeetPro), golf from Prep.Golf, tennis from
// TennisReporting. A past game or meet no source has a result for is not
// listed (K-State's rule).
import {parseFreeTitle,sheetCalendar} from '../high-school.mjs';
import {LETSGORUN_MEETPRO} from './manhattan-ks.mjs';
import {VARSITY,bound,maxpreps,on,HS_TRACK_EXCLUDE,MS_TRACK,MS_XC_EXCLUDE,grade,boundHighSchool,boundMiddleSchool,stateXc,schoolsFromConfig} from '../high-school-builders.mjs';
import RILEY_POTTAWATOMIE_DATA from './data/ks-riley-pottawatomie.json' with {type:'json'};
// The builders moved to src/high-school-builders.mjs (November 4); kept
// here for the modules and tests that import them from this file.
export {VARSITY,bound,maxpreps,on,HS_TRACK_EXCLUDE,MS_TRACK,MS_XC_EXCLUDE,grade,boundHighSchool,boundMiddleSchool};
// The schools whose schedule is on Bound are data
// (src/schools/data/ks-riley-pottawatomie.json).
const DATA=schoolsFromConfig(RILEY_POTTAWATOMIE_DATA);

// --- Riley County


export const rileyCountyKsSchool=DATA['riley-county-ks'];
export const rileyCountyMsKsSchool=DATA['riley-county-ms-ks'];

// usd384.org and manhattancatholicschools.org (ParentSquare, like
// mhs.usd383.org) answered Cloudflare's production locations with 520 on
// November 3 (both cross country feeds read empty there): a location that
// cannot rebuild serves the last feed built elsewhere (`globalSavedCopy`, KV).
// Blue Valley USD 384 (Randolph): the district calendar ("HS Football- Home
// vs. Canton-Galva"; "MS/HS" entries count for both); Bound holds a few
// of its events only.
const USD384_ABBREVIATIONS={MHK:'Manhattan',VH:'Valley Heights',WaCo:'Washington County',JCN:'Jefferson County North',BVHS:'Blue Valley',BV:'Blue Valley',TVL:'Twin Valley League',BVL:'Blue Valley League'};
const usd384=level=>({url:'https://www.usd384.org/api/calendars/151215/events',parse:title=>parseFreeTitle(title,{level,abbreviations:USD384_ABBREVIATIONS,home:/^(?:Blue Valley|home)$/i})});
export const blueValleyRandolphKsSchool={id:'blue-valley-randolph-ks',calendar:usd384('HS'),globalSavedCopy:true,
  maxpreps:maxpreps('adf57bf4-2b09-4fdf-8fe7-867907f0ea03','randolph/blue-valley-rams'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{calendar:/^HS Football$/,maxpreps:'football'}],
    Volleyball:[{calendar:/^HS Volleyball$/,maxpreps:'volleyball',matches:true}],
    Basketball:[{calendar:/^HS Basketball$/,maxpreps:'basketball/girls',label:'Girls',matches:true},{calendar:/^HS Basketball$/,maxpreps:'basketball',label:'Boys',matches:true}],
    // Spring (on the calendar by October 30).
    Baseball:[{calendar:/^HS Baseball$/,maxpreps:'baseball'}],
    Softball:[{calendar:/^HS Softball$/,maxpreps:'softball'}],
    'Cross Country':[{calendar:/^HS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',races:/\bvarsity\b/i,exclude:/junior varsity/i},milesplit:{team:36605}}],
    'Track & Field':[{calendar:/^HS Track & Field$/,meet:true,meetPro:{team:'Blue Valley',track:true,exclude:HS_TRACK_EXCLUDE}}]
  },
  // Titus Cobb 1st and Kory Fowler 15th, Samantha Gibson 13th at the 1A
  // Cheney Lake sub-state (too few runners for a team score).
  midwestTiming:[stateXc('1A','blue-valley-randolph-ks',['Randolph Blue Valley High School','Blue Valley High School'],['Girls','Boys'])]};
export const blueValleyRandolphMsKsSchool={id:'blue-valley-randolph-ms-ks',calendar:usd384('MS'),globalSavedCopy:true,meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{calendar:/^MS Football$/}],
    Volleyball:[{calendar:/^MS Volleyball$/}],
    Basketball:[{calendar:/^MS Basketball$/}],
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',exclude:MS_XC_EXCLUDE},milesplit:{team:41984,middle:true,also:[36605]}}],
    'Track & Field':[{calendar:/^MS Track & Field$/,meet:true,meetPro:{team:'Blue Valley',track:true,meetHas:MS_TRACK}}]
  }};

// --- Pottawatomie County

export const wamegoKsSchool=DATA['wamego-ks'];
export const wamegoMsKsSchool=DATA['wamego-ms-ks'];

export const rockCreekKsSchool=DATA['rock-creek-ks'];
export const rockCreekMsKsSchool=DATA['rock-creek-ms-ks'];

// St. Marys Junior/Senior High (Kaw Valley USD 321): one Bound school for
// both, the junior high's teams under grade levels.
export const stMarysKsSchool=DATA['st-marys-ks'];
export const stMarysJhKsSchool=DATA['st-marys-jh-ks'];

// Onaga (USD 322): one Bound school for the high school and middle school.
// Onaga enters part of its season on Bound; its district calendar (Apptegy:
// "HS Basketball @ Northern Heights", "JH Boys Wrestling at Doniphan West")
// adds the coming dates Bound lacks.
const ONAGA=bound('h20250204045201797b1e73ae8e3d04d','onagahs');
const ONAGA_ABBREVIATIONS={TVL:'Twin Valley League',OTL:'Old Trail League',SPPS:'Sts. Peter & Paul',ACCMS:'Atchison County Community MS'};
const onagaCalendar=level=>({url:'https://thrillshare-cmsv2.services.thrillshare.com/api/v4/o/2099/cms/events',pages:3,parse:title=>parseFreeTitle(title,{level,abbreviations:ONAGA_ABBREVIATIONS,home:/^(?:onaga|home)$/i})});
// The calendar's teams for each sport ("Baseball/Softball" days count for both).
const withUpcoming=(sports,level,map)=>{for(const [sport,teams] of Object.entries(sports))for(const team of teams){const re=map[sport];if(re)team.upcoming=typeof re==='function'?re(team):re;}return sports;};
const genderTeam=sport=>team=>new RegExp(`^${team.boundSchedule.level===VARSITY?'HS':'MS'} (?:${team.label?.match(/Girls|Boys/)?.[0]||'(?:Girls|Boys)'} )?${sport}$`);
export const onagaKsSchool={id:'onaga-ks',bound:ONAGA,upcoming:onagaCalendar('HS'),
  maxpreps:maxpreps('1572292e-afd2-444a-bed6-45b5b3f4b17d','onaga/onaga-buffaloes'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:303,code:'ONA'},
  sports:withUpcoming(boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Onaga',milesplit:22005}),'HS',
    {Football:/^HS Football$/,Volleyball:/^HS Volleyball$/,Basketball:genderTeam('Basketball'),Baseball:/^HS Baseball(?:\/Softball)?$/,Softball:/^HS (?:Baseball\/)?Softball$/,'Cross Country':/^HS Cross Country$/,Golf:/^HS Golf$/,Wrestling:genderTeam('Wrestling'),'Track & Field':/^HS Track & Field$/}),
  // Miken Wheeler, 5th at the 1A Cheney Lake sub-state (the team 4th).
  midwestTiming:[stateXc('1A','onaga-ks',['Onaga High School'],['Boys'])]};
export const onagaMsKsSchool={id:'onaga-ms-ks',bound:ONAGA,upcoming:onagaCalendar('MS'),meetPro:LETSGORUN_MEETPRO,
  sports:withUpcoming(boundMiddleSchool({has:['Volleyball','Basketball','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Onaga'}),'MS',
    {Volleyball:team=>team.label?null:/^MS Volleyball$/,Basketball:team=>/^(?:Girls|Boys)$/.test(team.label||'')?new RegExp(`^MS (?:${team.label} )?Basketball$`):null,Wrestling:genderTeam('Wrestling'),'Track & Field':/^MS Track & Field$/})};

// Flint Hills Christian School (Manhattan, east of the Big Blue: Pottawatomie
// County). Its athletics page links a Google Sheet with every team's season
// ("2026-2027 Athletics Calendars"); MaxPreps holds its scores.
const FHCS_SHEET='https://docs.google.com/spreadsheets/d/1LxkYCULrsl0J_D5bw7sX9hxGAwD1gs5wC1yUx1N6qcs/export?format=csv';
const FHCS_TRACK=['Flinthills Christian','Flint Hills Christian','FH Christian','Flint Hills'];
const fhcsCalendar={url:FHCS_SHEET,prefix:'FHCS',read:text=>sheetCalendar(text,{prefix:'FHCS',abbreviations:{MHK:'Manhattan',Lucky:'Luckey'}})};
export const flintHillsChristianKsSchool={id:'flint-hills-christian-ks',calendar:fhcsCalendar,
  maxpreps:maxpreps('3450c0af-ce38-4aa7-88c7-b1b19f49cac3','manhattan/flint-hills-christian-warriors'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:347,code:'FHC'},
  sports:{
    Volleyball:[{calendar:/^HS Volleyball$/,maxpreps:'volleyball',matches:true}],
    // The sheet lists one basketball schedule for both teams.
    Basketball:[{calendar:/^HS Basketball$/,maxpreps:'basketball/girls',label:'Girls',matches:true},{calendar:/^HS Basketball$/,maxpreps:'basketball',label:'Boys',matches:true}],
    'Cross Country':[{calendar:/^HS Cross Country$/,meet:true,meetPro:{team:'Flinthills Christian',races:/\bvarsity\b/i,exclude:/junior varsity/i},milesplit:{team:25986}}],
    Golf:[{calendar:/^HS Golf$/,meet:true,label:'Boys'}],
    // Track meets write the school "Flinthills Christian", "Flint Hills
    // Christian" or "Flint Hills" (the 2026 Wabaunsee middle school meet: the
    // same athletes as Flint Hills Christian's at Rock Creek).
    'Track & Field':[{calendar:/^HS Track$/,meet:true,meetPro:{team:FHCS_TRACK,track:true,exclude:HS_TRACK_EXCLUDE}}]
  }};
export const flintHillsChristianMsKsSchool={id:'flint-hills-christian-ms-ks',calendar:fhcsCalendar,meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{calendar:/^MS Volleyball$/}],
    Basketball:[{calendar:/^MS Basketball$/}],
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'FH Christian MS',exclude:MS_XC_EXCLUDE},milesplit:{team:51951,middle:true}}],
    'Track & Field':[{calendar:/^MS Track$/,meet:true,meetPro:{team:FHCS_TRACK,track:true,meetHas:MS_TRACK}}]
  }};

// St. Mary's Academy (St. Marys; the Society of St. Pius X school, not a
// KSHSAA member): Bound holds its schedule (smac.edu answers robots 403).
const SMA=bound('h2025020404520561456ac772684c34f','saintmarysacademy');
export const stMarysAcademyKsSchool=DATA['st-marys-academy-ks'];
export const stMarysAcademyJhKsSchool={id:'st-marys-academy-jh-ks',bound:SMA,
  sports:{Basketball:[{...on('Boys Basketball',grade('7th')),label:'7th Boys'},{...on('Boys Basketball',grade('8th')),label:'8th Boys'}]}};

// Manhattan Catholic Schools (Luckey campus, grades 6-8; Riley County): its
// calendar ("Volleyball Away Game at Valley Heights", "XC @ Clay Center");
// meets list its runners as "Luckey".
export const manhattanCatholicKsSchool={id:'manhattan-catholic-ks',globalSavedCopy:true,
  calendar:{url:'https://www.manhattancatholicschools.org/api/calendars/152066/events',parse:title=>parseFreeTitle(title,{abbreviations:{BVL:'Blue Valley League','St. X':'St. Xavier'}})},meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{calendar:/^Volleyball$/}],
    Basketball:[{calendar:/^Basketball$/}],
    'Cross Country':[{calendar:/^Cross Country$/,meet:true,meetPro:{team:'Luckey',exclude:MS_XC_EXCLUDE},milesplit:{team:47720,middle:true}}],
    'Track & Field':[{calendar:/^Track & Field$/,meet:true,meetPro:{team:['Luckey','Manhattan Catholic'],track:true,meetHas:MS_TRACK}}]
  }};

export const RILEY_POTTAWATOMIE_HIGH_SCHOOLS=[rileyCountyKsSchool,blueValleyRandolphKsSchool,wamegoKsSchool,rockCreekKsSchool,stMarysKsSchool,onagaKsSchool,flintHillsChristianKsSchool,stMarysAcademyKsSchool];
export const RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS=[rileyCountyMsKsSchool,blueValleyRandolphMsKsSchool,wamegoMsKsSchool,rockCreekMsKsSchool,stMarysJhKsSchool,onagaMsKsSchool,flintHillsChristianMsKsSchool,manhattanCatholicKsSchool,stMarysAcademyJhKsSchool];
