// Shared builders for middle and high school modules (moved out of
// src/schools/riley-pottawatomie-ks.mjs on November 4, 2026; user: "Make a
// school mostly data, not code"). A school whose schedule is on Bound is
// described as data (src/schools/data/<state>-<county>.json) and built here
// by `schoolFromConfig`; schools with their own calendar readers stay in
// their county module. See docs/HIGH_SCHOOL_ONBOARDING.md.
import {LETSGORUN_MEETPRO} from './schools/manhattan-ks.mjs';
import {usd437ScheduleUrl} from './high-school.mjs';

export const VARSITY=/^Varsity$/i;
export const bound=(school,slug,state='ks')=>({school,page:`https://beta.gobound.com/${state}/schools/${slug}/calendar`});
export const maxpreps=(schoolId,path,state='ks')=>({schoolId,base:`https://www.maxpreps.com/${state}/${path}/`});
export const on=(acts,level=VARSITY)=>({boundSchedule:{acts:[].concat(acts),level}});

// Track meets name their divisions: a high school's varsity events have none
// or a class ("Class 3A/4A"); JV, freshman and middle school divisions are
// left out. A middle school reads only meets run by grade (or named for
// middle schools); a high school meet on the same day is not its own.
export const HS_TRACK_EXCLUDE=/\bJV\b|junior varsity|fresh|frosh|soph|\bgrade\b|middle|\bMS\b|\bJH\b/i,MS_TRACK=/\bgrade\b|middle|\bMS\b|\bJH\b|junior high/i;

// High school sports read from Bound. `has` lists the school's sports; each
// takes its MaxPreps page (games), or its meet source.
// Geary County (src/schools/geary-ks.mjs) adds girls' soccer, swimming and
// boys' and girls' bowling (Junction City); `paths` gives a MaxPreps path
// that differs from the usual one ("soccer/girls/spring").
// `maxprepsSchedule` (November 5, Wabaunsee and Mission Valley): a school
// that enters few of its own games on Bound (Wabaunsee: 1 of its 10 football
// games) takes its games' schedule from MaxPreps as well: Bound's entries,
// then every MaxPreps game Bound lacks (coming ones too).
export function boundHighSchool({has,meetTeam,trackTeam=meetTeam,tennis,milesplit,maxpreps:mp=true,paths={},maxprepsSchedule=false}){
  const game=(acts,path,label)=>({...on(acts),...(mp&&path?{maxpreps:paths[acts]||path,...(maxprepsSchedule?{maxprepsSchedule:true}:{})}:{}),...(label?{label}:{})});
  const sports={};
  if(has.includes('Football'))sports.Football=[game('Football','football')];
  if(has.includes('Flag Football'))sports['Flag Football']=[game('Girls Flag Football','flag-football/girls','Girls')];
  if(has.includes('Volleyball'))sports.Volleyball=[game('Volleyball','volleyball')];
  if(has.includes('Soccer'))sports.Soccer=[game('Boys Soccer','soccer','Boys'),...(has.includes('Girls Soccer')?[game('Girls Soccer','soccer/girls','Girls')]:[])];
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
  // Boys' and girls' bowling where the school has them (Junction City).
  if(has.includes('Bowling'))sports.Bowling=[...['Girls','Boys'].filter(g=>has.includes(`${g} Bowling`)).map(g=>({...on(`${g} Bowling`),meet:true,label:g})),{...on('Unified Bowling'),meet:true,label:'Unified'}];
  if(has.includes('Swimming & Diving'))sports['Swimming & Diving']=['Girls','Boys'].filter(g=>has.includes(`${g} Swimming`)).map(g=>({...on(`${g} Swim & Dive`),meet:true,label:g}));
  return sports;
}

// Middle school teams on Bound: the grades (7th, 8th; their A teams), and the
// entries a school files under the whole team ("Middle School", "Junior
// High", "JH A"). B teams are not listed (as in Manhattan's middle schools).
// Middle school cross country: the grade races. Varsity and JV races are
// left out, and so are the 1-mile races (the Fort Riley meet's "1 Mile Run
// 7th Grade Girls" is its junior varsity race; St. Xavier's notes for the
// day: "All JV Race - 1 mile"; no other 2026 LetsGoRun meet runs one).
// LetsGoRun's Abilene Invitational (Sep 3) names its varsity races "High
// School Boys" and "High School Girls", with no "varsity": those are left
// out too (November 5).
export const MS_XC_EXCLUDE=/varsity|\bJV\b|\b1 mile\b|high school/i;
export const grade=g=>new RegExp(`^${g}(?: Grade)?(?: A(?:-Team)?)?$`,'i');
const WHOLE=/^(?:Middle School|Junior High|JH)(?: A)?$/i;
const ANY_MS=/^(?:(?:7th|8th)(?: Grade)?|Middle School|Junior High|JH)(?: A(?:-Team)?)?$/i;
// `grades` reads other forms of a grade's A team ("7th Grade - A - 1",
// "7A": Junction City and Fort Riley); `Tennis` is a middle school team in
// the Centennial League.
const MS_TENNIS=/^(?:(?:7th|8th)(?: Grade)?|Middle School|MS|Junior High|JH)(?: A(?:[- ]Team)?)?$/i;
export function boundMiddleSchool({has,meetTeam,trackTeam=meetTeam,milesplit,grades=grade}){
  const games=(acts,gender='')=>[
    {...on(acts,grades('7th')),label:`7th${gender?` ${gender}`:''}`},
    {...on(acts,grades('8th')),label:`8th${gender?` ${gender}`:''}`},
    {...on(acts,WHOLE),...(gender?{label:gender}:{})}];
  const sports={};
  if(has.includes('Football'))sports.Football=games('Football');
  if(has.includes('Volleyball'))sports.Volleyball=games('Volleyball');
  if(has.includes('Basketball'))sports.Basketball=[...games('Girls Basketball','Girls'),...games('Boys Basketball','Boys')];
  if(has.includes('Cross Country'))sports['Cross Country']=[{...on(['Girls Cross Country','Boys Cross Country'],ANY_MS),meet:true,meetPro:{team:meetTeam,exclude:MS_XC_EXCLUDE},...(milesplit?{milesplit:{team:milesplit,middle:true}}:{})}];
  if(has.includes('Wrestling'))sports.Wrestling=['Girls','Boys'].filter(g=>has.includes(`${g} Wrestling`)).map(g=>({...on(`${g} Wrestling`,ANY_MS),meet:true,label:g}));
  if(has.includes('Track & Field'))sports['Track & Field']=[{...on(['Girls Track & Field','Boys Track & Field'],ANY_MS),meet:true,meetPro:{team:trackTeam,track:true,meetHas:MS_TRACK}}];
  if(has.includes('Golf'))sports.Golf=[{...on(['Girls Golf','Boys Golf'],ANY_MS),meet:true}];
  if(has.includes('Tennis'))sports.Tennis=[{...on(['Girls Tennis','Boys Tennis'],MS_TENNIS),meet:true}];
  return sports;
}


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
export const stateXc=(cls,id,names,sexes)=>({date:'2026-10-31',sport:'Cross Country',name:`KSHSAA ${cls} State Championship`,...STATE_XC_SITES[cls==='3A'?'lawrence':'wamego'],
  races:sexes.map(label=>({label,time:STATE_XC_TIMES[cls][label]})).sort((a,b)=>a.time.localeCompare(b.time)),schools:{[id]:names}});

// Bound gives some schools no page of their own (no calendar slug; their
// events are read by Bound id): the feed links Bound's state page.
export const unpaged=(school,state='ks')=>({school,page:`https://beta.gobound.com/${state}`});
// Junction City's and Fort Riley's Bound levels also write a grade's A team
// "7th Grade - A - 1" and "7A" (B teams are not listed).
export const usd475Grade=g=>new RegExp(`^(?:${g}(?: Grade)?(?:\\s*-?\\s*A(?:-Team)?(?:\\s*-\\s*1)?)?|${g[0]}A)$`,'i');
// How a school's Bound levels write its grade teams, by name (a data file
// cannot hold a regular expression).
export const GRADE_FORMS={default:grade,usd475:usd475Grade};
// Shared sources a data file names by key.
export const SHARED_SOURCES={letsgorun:LETSGORUN_MEETPRO};

// One school from its data entry (src/schools/data/*.json; the format is
// docs/HIGH_SCHOOL_ONBOARDING.md):
//   {"id","level":"high-school"|"middle-school",
//    "bound":{"school","slug"} (or {"school"} with no page of its own),
//    "maxpreps":{"schoolId","path"}, "meetPro":"letsgorun",
//    "prepGolf":{"school","code","sharesCodeWith"}, "globalSavedCopy":true,
//    "sports":{"has":[...],"meetTeam","trackTeam","tennis","milesplit","paths","grades":"usd475","maxprepsSchedule":true},
//    "milesplitNames":{"<schedule name>":"<MileSplit Live name>"},
//    "extraMeets":{"<sport>":[{"date","name"}]},
//    "stateXc":{"class":"3A","names":[...],"sexes":["Girls","Boys"]},
//    "usd437":"wrms"|"wrn" (basketball schedule PDFs from USD 437)}
// A module built from data is the same object its hand-written module was
// (tests/hs-config.mjs compares them).
export function schoolFromConfig(entry,{shared={}}={}){
  const bounds=shared.bound||new Map();
  let b=null;
  if(entry.bound){
    const key=entry.bound.school;
    b=bounds.get(key)||(entry.bound.slug?bound(entry.bound.school,entry.bound.slug,entry.state):unpaged(entry.bound.school,entry.state));
    bounds.set(key,b);
  }
  const module={id:entry.id};
  if(entry.globalSavedCopy)module.globalSavedCopy=true;
  if(b)module.bound=b;
  if(entry.maxpreps)module.maxpreps=maxpreps(entry.maxpreps.schoolId,entry.maxpreps.path,entry.state);
  if(entry.meetPro)module.meetPro=SHARED_SOURCES[entry.meetPro];
  if(entry.prepGolf)module.prepGolf={...entry.prepGolf};
  const {grades,...spec}=entry.sports||{};
  module.sports=entry.level==='middle-school'?boundMiddleSchool({...spec,...(grades?{grades:GRADE_FORMS[grades]}:{})}):boundHighSchool(spec);
  for(const [sport,meets] of Object.entries(entry.extraMeets||{}))if(module.sports[sport])module.sports[sport][0].extraMeets=meets.map(m=>({...m}));
  if(entry.milesplitNames&&module.sports['Cross Country']?.[0]?.milesplit)module.sports['Cross Country'][0].milesplit.names={...entry.milesplitNames};
  if(entry.stateXc)module.midwestTiming=[stateXc(entry.stateXc.class,entry.id,entry.stateXc.names,entry.stateXc.sexes)];
  // "usd437": "wrms" | "wrn": each grade's basketball schedule PDF from the
  // district (Bound lists only a few of the games; November 9, 2026).
  if(entry.usd437)for(const team of module.sports.Basketball||[]){
    const m=String(team.label||'').match(/^(7th|8th) (Girls|Boys)$/);
    if(m)team.pdfSchedule={url:usd437ScheduleUrl(`${m[2].toLowerCase()}-basketball`,`${m[1]}-grade`,entry.usd437),school:entry.usd437};
  }
  return module;
}
// Every school of a data file, by id.
export function schoolsFromConfig(file){
  const shared={bound:new Map()};
  return Object.fromEntries((file.schools||[]).map(entry=>[entry.id,schoolFromConfig({state:file.state||'ks',...entry},{shared})]));
}
