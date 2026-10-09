// Manhattan's middle schools (USD 383): Susan B. Anthony and Dwight D.
// Eisenhower (user, October 9: "My timer friend also does middle schools so
// let's add the Manhattan area middle schools as well"). Listed under Kansas
// with a "Middle School" heading. Schedules come from each school's own
// calendar (ParentSquare, titles typed by hand: parseMiddleSchoolTitle).
// No source publishes middle school scores; past games and meets are not
// listed until one does (K-State's rule). See docs/MANHATTAN_KS_MODULE.md.
import {parseMiddleSchoolTitle} from '../high-school.mjs';

// The calendars' short names for league schools.
export const USD383_ABBREVIATIONS={SH:'Shawnee Heights',SHMS:'Shawnee Heights',WR:'Washburn Rural',WRMS:'Washburn Rural',WRN:'Washburn Rural North',JC:'Junction City',JCMS:'Junction City',EMS:'Eisenhower',AMS:'Anthony',FR:'Fort Riley',LWMS:'Lakewood'};
const parse=title=>parseMiddleSchoolTitle(title,{abbreviations:USD383_ABBREVIATIONS});
const grades=(sport,extra='')=>['7th','8th'].map(grade=>({calendar:new RegExp(`^${grade} ${extra}${sport}$`,'i'),label:`${grade}${extra?' '+extra.trim():''}`}));
const SPORTS={
  Football:grades('Football'),
  Volleyball:grades('Volleyball'),
  'Cross Country':[{calendar:/^Cross Country$/i,meet:true}],
  Basketball:[...grades('Basketball','Girls '),...grades('Basketball','Boys ')],
  Wrestling:[{calendar:/^Boys Wrestling$/i,meet:true,label:'Boys'},{calendar:/^Girls Wrestling$/i,meet:true,label:'Girls'}],
  'Track & Field':[{calendar:/^Track & Field$/i,meet:true}]
};
export const anthonyMsSchool={id:'anthony-ms-ks',calendar:{url:'https://ams.usd383.org/api/calendars/128968/events',parse},sports:SPORTS};
export const eisenhowerMsSchool={id:'eisenhower-ms-ks',calendar:{url:'https://ems.usd383.org/api/calendars/128776/events',parse},sports:SPORTS};
