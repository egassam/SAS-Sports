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

const VARSITY=/^Varsity$/i;
const bound=(school,slug)=>({school,page:`https://beta.gobound.com/ks/schools/${slug}/calendar`});
const maxpreps=(schoolId,path)=>({schoolId,base:`https://www.maxpreps.com/ks/${path}/`});
const on=(acts,level=VARSITY)=>({boundSchedule:{acts:[].concat(acts),level}});

// High school sports read from Bound. `has` lists the school's sports; each
// takes its MaxPreps page (games), or its meet source.
function boundHighSchool({has,meetTeam,tennis,maxpreps:mp=true}){
  const game=(acts,path,label)=>({...on(acts),...(mp&&path?{maxpreps:path}:{}),...(label?{label}:{})});
  const sports={};
  if(has.includes('Football'))sports.Football=[game('Football','football')];
  if(has.includes('Flag Football'))sports['Flag Football']=[game('Girls Flag Football','flag-football/girls','Girls')];
  if(has.includes('Volleyball'))sports.Volleyball=[game('Volleyball','volleyball')];
  if(has.includes('Soccer'))sports.Soccer=[game('Boys Soccer','soccer','Boys')];
  if(has.includes('Basketball'))sports.Basketball=[game('Girls Basketball','basketball/girls','Girls'),game('Boys Basketball','basketball','Boys')];
  if(has.includes('Baseball'))sports.Baseball=[game('Baseball','baseball')];
  if(has.includes('Softball'))sports.Softball=[game('Softball','softball')];
  // Varsity races only (the junior varsity and middle school races share the day).
  if(has.includes('Cross Country'))sports['Cross Country']=[{...on(['Girls Cross Country','Boys Cross Country']),meet:true,meetPro:{team:meetTeam,races:/\bvarsity\b/i,exclude:/junior|\bJV\b/i}}];
  if(has.includes('Golf'))sports.Golf=['Girls','Boys'].filter(g=>has.includes(`${g} Golf`)).map(g=>({...on(`${g} Golf`),meet:true,label:g}));
  if(has.includes('Tennis'))sports.Tennis=['Girls','Boys'].filter(g=>has.includes(`${g} Tennis`)).map(g=>({...on(`${g} Tennis`),meet:true,label:g,...(tennis?{tennisReporting:{stateId:23,genderId:g==='Girls'?2:1,school:tennis}}:{})}));
  if(has.includes('Wrestling'))sports.Wrestling=['Girls','Boys'].filter(g=>has.includes(`${g} Wrestling`)).map(g=>({...on(`${g} Wrestling`),meet:true,label:g}));
  if(has.includes('Track & Field'))sports['Track & Field']=[{...on(['Girls Track & Field','Boys Track & Field']),meet:true}];
  // KSHSAA Unified Bowling (students with and without disabilities together).
  if(has.includes('Bowling'))sports.Bowling=[{...on('Unified Bowling'),meet:true,label:'Unified'}];
  return sports;
}

// Middle school teams on Bound: the grades (7th, 8th; their A teams), and the
// entries a school files under the whole team ("Middle School", "Junior
// High", "JH A"). B teams are not listed (as in Manhattan's middle schools).
const grade=g=>new RegExp(`^${g}(?: Grade)?(?: A(?:-Team)?)?$`,'i');
const WHOLE=/^(?:Middle School|Junior High|JH)(?: A)?$/i;
const ANY_MS=/^(?:(?:7th|8th)(?: Grade)?|Middle School|Junior High|JH)(?: A(?:-Team)?)?$/i;
function boundMiddleSchool({has,meetTeam}){
  const games=(acts,gender='')=>[
    {...on(acts,grade('7th')),label:`7th${gender?` ${gender}`:''}`},
    {...on(acts,grade('8th')),label:`8th${gender?` ${gender}`:''}`},
    {...on(acts,WHOLE),...(gender?{label:gender}:{})}];
  const sports={};
  if(has.includes('Football'))sports.Football=games('Football');
  if(has.includes('Volleyball'))sports.Volleyball=games('Volleyball');
  if(has.includes('Basketball'))sports.Basketball=[...games('Girls Basketball','Girls'),...games('Boys Basketball','Boys')];
  if(has.includes('Cross Country'))sports['Cross Country']=[{...on(['Girls Cross Country','Boys Cross Country'],ANY_MS),meet:true,meetPro:{team:meetTeam,exclude:/varsity|\bJV\b/i}}];
  if(has.includes('Wrestling'))sports.Wrestling=['Girls','Boys'].filter(g=>has.includes(`${g} Wrestling`)).map(g=>({...on(`${g} Wrestling`,ANY_MS),meet:true,label:g}));
  if(has.includes('Track & Field'))sports['Track & Field']=[{...on(['Girls Track & Field','Boys Track & Field'],ANY_MS),meet:true}];
  if(has.includes('Golf'))sports.Golf=[{...on(['Girls Golf','Boys Golf'],ANY_MS),meet:true}];
  return sports;
}

// --- Riley County

export const rileyCountyKsSchool={id:'riley-county-ks',bound:bound('h2025020404520421139a7c22372f045','rileycountyhs'),
  maxpreps:maxpreps('5cdb37b2-ad68-43ee-96f4-0f48d54919fa','riley/riley-county-falcons'),meetPro:LETSGORUN_MEETPRO,
  // Prep.Golf gives Riley County's golfers the code RC, as it gives Rock
  // Creek's: when both play one tournament the golfers are not listed.
  prepGolf:{school:177,code:'RC',sharesCodeWith:'Rock Creek'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Riley County'})};
export const rileyCountyMsKsSchool={id:'riley-county-ms-ks',bound:bound('h20251014075040360c6677198a0a040','rcmsks'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Riley County'})};

// Blue Valley USD 384 (Randolph): the district calendar ("HS Football- Home
// vs. Canton-Galva"; "MS/HS" entries count for both); Bound holds a few
// of its events only.
const USD384_ABBREVIATIONS={MHK:'Manhattan',VH:'Valley Heights',WaCo:'Washington County',JCN:'Jefferson County North',BVHS:'Blue Valley',BV:'Blue Valley',TVL:'Twin Valley League',BVL:'Blue Valley League'};
const usd384=level=>({url:'https://www.usd384.org/api/calendars/151215/events',parse:title=>parseFreeTitle(title,{level,abbreviations:USD384_ABBREVIATIONS,home:/^(?:Blue Valley|home)$/i})});
export const blueValleyRandolphKsSchool={id:'blue-valley-randolph-ks',calendar:usd384('HS'),
  maxpreps:maxpreps('adf57bf4-2b09-4fdf-8fe7-867907f0ea03','randolph/blue-valley-rams'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{calendar:/^HS Football$/,maxpreps:'football'}],
    Volleyball:[{calendar:/^HS Volleyball$/,maxpreps:'volleyball',matches:true}],
    Basketball:[{calendar:/^HS Basketball$/,maxpreps:'basketball/girls',label:'Girls',matches:true},{calendar:/^HS Basketball$/,maxpreps:'basketball',label:'Boys',matches:true}],
    'Cross Country':[{calendar:/^HS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',races:/\bvarsity\b/i,exclude:/junior|\bJV\b/i}}],
    'Track & Field':[{calendar:/^HS Track & Field$/,meet:true}]
  }};
export const blueValleyRandolphMsKsSchool={id:'blue-valley-randolph-ms-ks',calendar:usd384('MS'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{calendar:/^MS Football$/}],
    Volleyball:[{calendar:/^MS Volleyball$/}],
    Basketball:[{calendar:/^MS Basketball$/}],
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',exclude:/varsity|\bJV\b/i}}],
    'Track & Field':[{calendar:/^MS Track & Field$/,meet:true}]
  }};

// --- Pottawatomie County

export const wamegoKsSchool={id:'wamego-ks',bound:bound('h202502040452088515ce32279a6bd46','wamegohs'),
  maxpreps:maxpreps('85994f3a-51f3-45de-8eb1-88106d80733b','wamego/wamego-red-raiders'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:124,code:'WAM'},
  sports:boundHighSchool({has:['Football','Flag Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Tennis','Girls Tennis','Boys Tennis','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Bowling'],meetTeam:'Wamego',tennis:'Wamego HS'})};
export const wamegoMsKsSchool={id:'wamego-ms-ks',bound:bound('h20250612075742474f79cb40e4a7f40','wamegoms'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Golf'],meetTeam:'Wamego Middle School'})};

export const rockCreekKsSchool={id:'rock-creek-ks',bound:bound('h2025020404520445615614e419a374c','rockcreekhs'),
  maxpreps:maxpreps('96110ea0-a0ac-4f8d-b7b3-49a4b725e38f','st-george/rock-creek-mustangs'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:119,code:'RC',sharesCodeWith:'Riley County'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Rock Creek'})};
export const rockCreekMsKsSchool={id:'rock-creek-ms-ks',bound:bound('h20260103125538297053dfabf06614f','rockcreekms'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Rock Creek MS'})};

// St. Marys Junior/Senior High (Kaw Valley USD 321): one Bound school for
// both, the junior high's teams under grade levels.
const ST_MARYS=bound('h20250204045205533eddae2a4d03e42','stmaryshs');
export const stMarysKsSchool={id:'st-marys-ks',bound:ST_MARYS,
  maxpreps:maxpreps('0f0ebc9e-4330-405a-a173-f298b055973a','st-marys/st-marys-bears'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:186,code:'STM'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Bowling'],meetTeam:'St. Marys'})};
export const stMarysJhKsSchool={id:'st-marys-jh-ks',bound:ST_MARYS,meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:"St. Mary's"})};

// Onaga (USD 322): one Bound school for the high school and middle school.
const ONAGA=bound('h20250204045201797b1e73ae8e3d04d','onagahs');
export const onagaKsSchool={id:'onaga-ks',bound:ONAGA,
  maxpreps:maxpreps('1572292e-afd2-444a-bed6-45b5b3f4b17d','onaga/onaga-buffaloes'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:303,code:'ONA'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Softball','Cross Country','Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Onaga'})};
export const onagaMsKsSchool={id:'onaga-ms-ks',bound:ONAGA,
  sports:boundMiddleSchool({has:['Volleyball','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Onaga'})};

// Flint Hills Christian School (Manhattan, east of the Big Blue: Pottawatomie
// County). Its athletics page links a Google Sheet with every team's season
// ("2026-2027 Athletics Calendars"); MaxPreps holds its scores.
const FHCS_SHEET='https://docs.google.com/spreadsheets/d/1LxkYCULrsl0J_D5bw7sX9hxGAwD1gs5wC1yUx1N6qcs/export?format=csv';
const fhcsCalendar={url:FHCS_SHEET,prefix:'FHCS',read:text=>sheetCalendar(text,{prefix:'FHCS',abbreviations:{MHK:'Manhattan'}})};
export const flintHillsChristianKsSchool={id:'flint-hills-christian-ks',calendar:fhcsCalendar,
  maxpreps:maxpreps('3450c0af-ce38-4aa7-88c7-b1b19f49cac3','manhattan/flint-hills-christian-warriors'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:347,code:'FHC'},
  sports:{
    Volleyball:[{calendar:/^HS Volleyball$/,maxpreps:'volleyball',matches:true}],
    // The sheet lists one basketball schedule for both teams.
    Basketball:[{calendar:/^HS Basketball$/,maxpreps:'basketball/girls',label:'Girls',matches:true},{calendar:/^HS Basketball$/,maxpreps:'basketball',label:'Boys',matches:true}],
    'Cross Country':[{calendar:/^HS Cross Country$/,meet:true,meetPro:{team:'Flinthills Christian',races:/\bvarsity\b/i,exclude:/junior|\bJV\b/i}}],
    Golf:[{calendar:/^HS Golf$/,meet:true,label:'Boys'}],
    'Track & Field':[{calendar:/^HS Track$/,meet:true}]
  }};
export const flintHillsChristianMsKsSchool={id:'flint-hills-christian-ms-ks',calendar:fhcsCalendar,meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{calendar:/^MS Volleyball$/}],
    Basketball:[{calendar:/^MS Basketball$/}],
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'FH Christian MS',exclude:/varsity|\bJV\b/i}}],
    'Track & Field':[{calendar:/^MS Track$/,meet:true}]
  }};

// St. Mary's Academy (St. Marys; the Society of St. Pius X school, not a
// KSHSAA member): Bound holds its schedule (smac.edu answers robots 403).
const SMA=bound('h2025020404520561456ac772684c34f','saintmarysacademy');
export const stMarysAcademyKsSchool={id:'st-marys-academy-ks',bound:SMA,
  maxpreps:maxpreps('72046133-0241-43db-a9b8-71b3f3b6ae10','st-marys/st-marys-academy-crusaders'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:366,code:'SMA'},
  sports:boundHighSchool({has:['Football','Soccer','Basketball','Baseball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Golf','Boys Golf'],meetTeam:"St. Mary's Academy"})};
export const stMarysAcademyJhKsSchool={id:'st-marys-academy-jh-ks',bound:SMA,
  sports:{Basketball:[{...on('Boys Basketball',grade('7th')),label:'7th Boys'},{...on('Boys Basketball',grade('8th')),label:'8th Boys'}]}};

// Manhattan Catholic Schools (Luckey campus, grades 6-8; Riley County): its
// calendar ("Volleyball Away Game at Valley Heights", "XC @ Clay Center");
// meets list its runners as "Luckey".
export const manhattanCatholicKsSchool={id:'manhattan-catholic-ks',
  calendar:{url:'https://www.manhattancatholicschools.org/api/calendars/152066/events',parse:title=>parseFreeTitle(title,{abbreviations:{BVL:'Blue Valley League','St. X':'St. Xavier'}})},meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{calendar:/^Volleyball$/}],
    Basketball:[{calendar:/^Basketball$/}],
    'Cross Country':[{calendar:/^Cross Country$/,meet:true,meetPro:{team:'Luckey',exclude:/varsity|\bJV\b/i}}],
    'Track & Field':[{calendar:/^Track & Field$/,meet:true}]
  }};

export const RILEY_POTTAWATOMIE_HIGH_SCHOOLS=[rileyCountyKsSchool,blueValleyRandolphKsSchool,wamegoKsSchool,rockCreekKsSchool,stMarysKsSchool,onagaKsSchool,flintHillsChristianKsSchool,stMarysAcademyKsSchool];
export const RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS=[rileyCountyMsKsSchool,blueValleyRandolphMsKsSchool,wamegoMsKsSchool,rockCreekMsKsSchool,stMarysJhKsSchool,onagaMsKsSchool,flintHillsChristianMsKsSchool,manhattanCatholicKsSchool,stMarysAcademyJhKsSchool];
