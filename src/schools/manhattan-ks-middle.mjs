// Manhattan's middle schools (USD 383): Susan B. Anthony and Dwight D.
// Eisenhower (user, October 9: "My timer friend also does middle schools so
// let's add the Manhattan area middle schools as well"). Listed under Kansas
// with a "Middle School" heading. Schedules come from each school's own
// calendar (ParentSquare, titles typed by hand: parseMiddleSchoolTitle).
// No source publishes middle school scores; past games and meets are not
// listed until one does (K-State's rule). See docs/MANHATTAN_KS_MODULE.md.
import {parseMiddleSchoolTitle} from '../high-school.mjs';
import {LETSGORUN_MEETPRO} from './manhattan-ks.mjs';

// The calendars' short names for league schools.
export const USD383_ABBREVIATIONS={SH:'Shawnee Heights',SHMS:'Shawnee Heights',WR:'Washburn Rural',WRMS:'Washburn Rural',WRN:'Washburn Rural North',JC:'Junction City',JCMS:'Junction City',EMS:'Eisenhower',AMS:'Anthony',FR:'Fort Riley',LWMS:'Lakewood',WRNMS:'Washburn Rural North',SMS:'Seaman',WMS:'Wamego',RCMS:'Rock Creek',ABMS:'Abilene',CCCMS:'Clay Center',JCHS:'Junction City',FRMS:'Fort Riley',EMPMS:'Emporia',MHS:'Manhattan'};
const parse=title=>parseMiddleSchoolTitle(title,{abbreviations:USD383_ABBREVIATIONS});
// Anthony's calendar writes its winter teams in short (October 30: "7GBB@
// SHMS", "8BBB v WRNMS", "GBB vs CCCMS", "BWR Dual vs EMS", "GWR LEAGUE @
// SHMS", "7BBB Tny @ ..."): read as Eisenhower's ("7th Girls BB @ SHMS",
// "Boys Wrestling vs EMS", "... League Tournament @ Home").
export function anthonyTitle(title){
  let t=String(title||'').replace(/\s+/g,' ').trim();
  t=t.replace(/^([78])([GB])BB\b\s*/i,(_,grade,sex)=>`${grade}th ${/g/i.test(sex)?'Girls':'Boys'} BB `)
    .replace(/^([GB])WR\b\s*/i,(_,sex)=>`${/g/i.test(sex)?'Girls':'Boys'} Wrestling `)
    .replace(/^((?:Boys|Girls) Wrestling) (?:Double Dual|Dual|Tri|Mixer)\s+(?=vs?\b)/i,'$1 ')
    .replace(/\s+v\s+/i,' vs ').replace(/@(?=\S)/,'@ ').replace(/@ AMS\b/i,'@ Home')
    .replace(/\bTny\b/i,'Tournament').replace(/\bLEAGUE\b/,'League Tournament').replace(/\bInv Home$/i,'Home Invitational').replace(/\bInv\b/i,'Invitational')
    .replace(/\b[A-Za-z]{1,3}MS\b/g,code=>code.toUpperCase());
  return t;
}
const anthonyParse=title=>parse(anthonyTitle(title));
const grades=(sport,extra='')=>['7th','8th'].map(grade=>({calendar:new RegExp(`^${grade} ${extra}${sport}$`,'i'),label:`${grade}${extra?' '+extra.trim():''}`}));
// Each school's runners are listed under its short name in MeetPro results;
// on MileSplit Live by its MileSplit team id (`milesplit`).
const sports=(team,trackTeam=team,milesplit)=>({
  Football:grades('Football'),
  Volleyball:grades('Volleyball'),
  'Cross Country':[{calendar:/^Cross Country$/i,meet:true,meetPro:{team,exclude:/junior varsity|\bJV\b/i},...(milesplit?{milesplit:{team:milesplit,middle:true}}:{})}],
  Basketball:[...grades('Basketball','Girls '),...grades('Basketball','Boys ')],
  // Girls teams are always named; "Little Apple Grapple Wrestling @ MHS" is the boys'.
  Wrestling:[{calendar:/^(?:Boys )?Wrestling$/i,meet:true,label:'Boys'},{calendar:/^Girls Wrestling$/i,meet:true,label:'Girls'}],
  // Track: the timer's MeetPro meets ("Susan B Anthony" at Fort Riley).
  'Track & Field':[{calendar:/^Track & Field$/i,meet:true,meetPro:{team:trackTeam,track:true,meetHas:/\bgrade\b|middle|\bMS\b|\bJH\b|junior high/i}}],
  // Spring tennis: one team for Anthony and Eisenhower ("AMS/EMS Varsity Tennis").
  Tennis:[{calendar:/^Tennis$/i,meet:true}]
});
// "GBB vs CCCMS" names no grade: not a team the app lists.
export const anthonyMsSchool={id:'anthony-ms-ks',calendar:{url:'https://ams.usd383.org/api/calendars/128968/events',parse:anthonyParse,ignore:/^[GB]BB\b/i},globalSavedCopy:true,meetPro:LETSGORUN_MEETPRO,sports:sports('Anthony',['Anthony','Susan B Anthony'],40691)};
export const eisenhowerMsSchool={id:'eisenhower-ms-ks',calendar:{url:'https://ems.usd383.org/api/calendars/128776/events',parse},globalSavedCopy:true,meetPro:LETSGORUN_MEETPRO,sports:sports('Eisenhower','Eisenhower',40690)};
