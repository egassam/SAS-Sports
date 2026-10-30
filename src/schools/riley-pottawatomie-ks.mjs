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

// Track meets name their divisions: a high school's varsity events have none
// or a class ("Class 3A/4A"); JV, freshman and middle school divisions are
// left out. A middle school reads only meets run by grade (or named for
// middle schools); a high school meet on the same day is not its own.
const HS_TRACK_EXCLUDE=/\bJV\b|junior varsity|fresh|frosh|soph|\bgrade\b|middle|\bMS\b|\bJH\b/i,MS_TRACK=/\bgrade\b|middle|\bMS\b|\bJH\b|junior high/i;

// High school sports read from Bound. `has` lists the school's sports; each
// takes its MaxPreps page (games), or its meet source.
function boundHighSchool({has,meetTeam,trackTeam=meetTeam,tennis,milesplit,maxpreps:mp=true}){
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
  // Meets the timer posts only to MileSplit Live: the school's MileSplit team id.
  if(has.includes('Cross Country'))sports['Cross Country']=[{...on(['Girls Cross Country','Boys Cross Country']),meet:true,meetPro:{team:meetTeam,races:/\bvarsity\b/i,exclude:/junior varsity/i},...(milesplit?{milesplit:{team:milesplit}}:{})}];
  if(has.includes('Golf'))sports.Golf=['Girls','Boys'].filter(g=>has.includes(`${g} Golf`)).map(g=>({...on(`${g} Golf`),meet:true,label:g}));
  if(has.includes('Tennis'))sports.Tennis=['Girls','Boys'].filter(g=>has.includes(`${g} Tennis`)).map(g=>({...on(`${g} Tennis`),meet:true,label:g,...(tennis?{tennisReporting:{stateId:23,genderId:g==='Girls'?2:1,school:tennis}}:{})}));
  if(has.includes('Wrestling'))sports.Wrestling=['Girls','Boys'].filter(g=>has.includes(`${g} Wrestling`)).map(g=>({...on(`${g} Wrestling`),meet:true,label:g}));
  // Track: the timer's MeetPro meets, varsity events only.
  if(has.includes('Track & Field'))sports['Track & Field']=[{...on(['Girls Track & Field','Boys Track & Field']),meet:true,meetPro:{team:trackTeam,track:true,exclude:HS_TRACK_EXCLUDE}}];
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
function boundMiddleSchool({has,meetTeam,trackTeam=meetTeam,milesplit}){
  const games=(acts,gender='')=>[
    {...on(acts,grade('7th')),label:`7th${gender?` ${gender}`:''}`},
    {...on(acts,grade('8th')),label:`8th${gender?` ${gender}`:''}`},
    {...on(acts,WHOLE),...(gender?{label:gender}:{})}];
  const sports={};
  if(has.includes('Football'))sports.Football=games('Football');
  if(has.includes('Volleyball'))sports.Volleyball=games('Volleyball');
  if(has.includes('Basketball'))sports.Basketball=[...games('Girls Basketball','Girls'),...games('Boys Basketball','Boys')];
  if(has.includes('Cross Country'))sports['Cross Country']=[{...on(['Girls Cross Country','Boys Cross Country'],ANY_MS),meet:true,meetPro:{team:meetTeam,exclude:/varsity|\bJV\b/i},...(milesplit?{milesplit:{team:milesplit,middle:true}}:{})}];
  if(has.includes('Wrestling'))sports.Wrestling=['Girls','Boys'].filter(g=>has.includes(`${g} Wrestling`)).map(g=>({...on(`${g} Wrestling`,ANY_MS),meet:true,label:g}));
  if(has.includes('Track & Field'))sports['Track & Field']=[{...on(['Girls Track & Field','Boys Track & Field'],ANY_MS),meet:true,meetPro:{team:trackTeam,track:true,meetHas:MS_TRACK}}];
  if(has.includes('Golf'))sports.Golf=[{...on(['Girls Golf','Boys Golf'],ANY_MS),meet:true}];
  return sports;
}

// --- Riley County

// KSHSAA state cross country, October 31 (KSHSAA's state sites and time
// schedule; user, October 29: "Can we add other state of Kansas schools that
// are going to be timed at this meet?"). Midwest Timing & Results times both
// sites and posts live on MileSplit Live. A school's qualifiers come from its
// October 24 sub-state on MileSplit Live: the top three teams and the top 15
// runners (KSHSAA). `place` is the site's row on Midwest Timing's results
// page; `schools` gives the names its results PDF prints.
const STATE_XC_SITES={
  lawrence:{site:'Rim Rock Farm, Lawrence',place:/^Lawrence\b/i,milesplit:787763,live:'https://milesplit.live/meets/787763'},
  wamego:{site:'Wamego Country Club, Wamego',place:/^Wamego\b/i,milesplit:787762,live:'https://milesplit.live/meets/787762'}};
const STATE_XC_TIMES={'1A':{Girls:'11:10',Boys:'12:55'},'2A':{Girls:'12:20',Boys:'10:35'},'3A':{Girls:'11:10',Boys:'12:55'},'4A':{Girls:'10:00',Boys:'11:45'}};
const stateXc=(cls,id,names,sexes)=>({date:'2026-10-31',sport:'Cross Country',name:`KSHSAA ${cls} State Championship`,...STATE_XC_SITES[cls==='3A'?'lawrence':'wamego'],
  races:sexes.map(label=>({label,time:STATE_XC_TIMES[cls][label]})).sort((a,b)=>a.time.localeCompare(b.time)),schools:{[id]:names}});

export const rileyCountyKsSchool={id:'riley-county-ks',bound:bound('h2025020404520421139a7c22372f045','rileycountyhs'),
  maxpreps:maxpreps('5cdb37b2-ad68-43ee-96f4-0f48d54919fa','riley/riley-county-falcons'),meetPro:LETSGORUN_MEETPRO,
  // Prep.Golf gives Riley County's golfers the code RC, as it gives Rock
  // Creek's: when both play one tournament the golfers are not listed.
  prepGolf:{school:177,code:'RC',sharesCodeWith:'Rock Creek'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Riley County',milesplit:21857}),
  midwestTiming:[stateXc('3A','riley-county-ks',['Riley County High School'],['Girls','Boys'])]};
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
    // Spring (on the calendar by October 30).
    Baseball:[{calendar:/^HS Baseball$/,maxpreps:'baseball'}],
    Softball:[{calendar:/^HS Softball$/,maxpreps:'softball'}],
    'Cross Country':[{calendar:/^HS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',races:/\bvarsity\b/i,exclude:/junior varsity/i},milesplit:{team:36605}}],
    'Track & Field':[{calendar:/^HS Track & Field$/,meet:true,meetPro:{team:'Blue Valley',track:true,exclude:HS_TRACK_EXCLUDE}}]
  },
  // Titus Cobb 1st and Kory Fowler 15th, Samantha Gibson 13th at the 1A
  // Cheney Lake sub-state (too few runners for a team score).
  midwestTiming:[stateXc('1A','blue-valley-randolph-ks',['Randolph Blue Valley High School','Blue Valley High School'],['Girls','Boys'])]};
export const blueValleyRandolphMsKsSchool={id:'blue-valley-randolph-ms-ks',calendar:usd384('MS'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{calendar:/^MS Football$/}],
    Volleyball:[{calendar:/^MS Volleyball$/}],
    Basketball:[{calendar:/^MS Basketball$/}],
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'Blue Valley',exclude:/varsity|\bJV\b/i},milesplit:{team:41984,middle:true,also:[36605]}}],
    'Track & Field':[{calendar:/^MS Track & Field$/,meet:true,meetPro:{team:'Blue Valley',track:true,meetHas:MS_TRACK}}]
  }};

// --- Pottawatomie County

export const wamegoKsSchool={id:'wamego-ks',bound:bound('h202502040452088515ce32279a6bd46','wamegohs'),
  maxpreps:maxpreps('85994f3a-51f3-45de-8eb1-88106d80733b','wamego/wamego-red-raiders'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:124,code:'WAM'},
  sports:boundHighSchool({has:['Football','Flag Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Tennis','Girls Tennis','Boys Tennis','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Bowling'],meetTeam:'Wamego',tennis:'Wamego HS',milesplit:21804}),
  midwestTiming:[stateXc('4A','wamego-ks',['Wamego High School'],['Girls','Boys'])]};
export const wamegoMsKsSchool={id:'wamego-ms-ks',bound:bound('h20250612075742474f79cb40e4a7f40','wamegoms'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Golf'],meetTeam:'Wamego Middle School',milesplit:39314})};

export const rockCreekKsSchool={id:'rock-creek-ks',bound:bound('h2025020404520445615614e419a374c','rockcreekhs'),
  maxpreps:maxpreps('96110ea0-a0ac-4f8d-b7b3-49a4b725e38f','st-george/rock-creek-mustangs'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:119,code:'RC',sharesCodeWith:'Riley County'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Rock Creek',milesplit:21882}),
  midwestTiming:[stateXc('4A','rock-creek-ks',['Rock Creek High School'],['Girls','Boys'])]};
export const rockCreekMsKsSchool={id:'rock-creek-ms-ks',bound:bound('h20260103125538297053dfabf06614f','rockcreekms'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:'Rock Creek MS',milesplit:39062})};

// St. Marys Junior/Senior High (Kaw Valley USD 321): one Bound school for
// both, the junior high's teams under grade levels.
const ST_MARYS=bound('h20250204045205533eddae2a4d03e42','stmaryshs');
export const stMarysKsSchool={id:'st-marys-ks',bound:ST_MARYS,
  maxpreps:maxpreps('0f0ebc9e-4330-405a-a173-f298b055973a','st-marys/st-marys-bears'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:186,code:'STM'},
  sports:boundHighSchool({has:['Football','Volleyball','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Bowling'],meetTeam:'St. Marys',milesplit:25984})};
export const stMarysJhKsSchool={id:'st-marys-jh-ks',bound:ST_MARYS,meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field'],meetTeam:"St. Mary's",milesplit:41215})};

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
    'Cross Country':[{calendar:/^MS Cross Country$/,meet:true,meetPro:{team:'FH Christian MS',exclude:/varsity|\bJV\b/i},milesplit:{team:51951,middle:true}}],
    'Track & Field':[{calendar:/^MS Track$/,meet:true,meetPro:{team:FHCS_TRACK,track:true,meetHas:MS_TRACK}}]
  }};

// St. Mary's Academy (St. Marys; the Society of St. Pius X school, not a
// KSHSAA member): Bound holds its schedule (smac.edu answers robots 403).
const SMA=bound('h2025020404520561456ac772684c34f','saintmarysacademy');
export const stMarysAcademyKsSchool={id:'st-marys-academy-ks',bound:SMA,
  maxpreps:maxpreps('72046133-0241-43db-a9b8-71b3f3b6ae10','st-marys/st-marys-academy-crusaders'),meetPro:LETSGORUN_MEETPRO,prepGolf:{school:366,code:'SMA'},
  sports:boundHighSchool({has:['Football','Soccer','Basketball','Baseball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Golf','Boys Golf'],meetTeam:"St. Mary's Academy",milesplit:41084})};
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
    'Cross Country':[{calendar:/^Cross Country$/,meet:true,meetPro:{team:'Luckey',exclude:/varsity|\bJV\b/i},milesplit:{team:47720,middle:true}}],
    'Track & Field':[{calendar:/^Track & Field$/,meet:true,meetPro:{team:['Luckey','Manhattan Catholic'],track:true,meetHas:MS_TRACK}}]
  }};

export const RILEY_POTTAWATOMIE_HIGH_SCHOOLS=[rileyCountyKsSchool,blueValleyRandolphKsSchool,wamegoKsSchool,rockCreekKsSchool,stMarysKsSchool,onagaKsSchool,flintHillsChristianKsSchool,stMarysAcademyKsSchool];
export const RILEY_POTTAWATOMIE_MIDDLE_SCHOOLS=[rileyCountyMsKsSchool,blueValleyRandolphMsKsSchool,wamegoMsKsSchool,rockCreekMsKsSchool,stMarysJhKsSchool,onagaMsKsSchool,flintHillsChristianMsKsSchool,manhattanCatholicKsSchool,stMarysAcademyJhKsSchool];
