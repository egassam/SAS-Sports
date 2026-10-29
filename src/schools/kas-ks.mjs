// Kansas Approved Schools state cross country teams beyond Flint Hills
// Christian and St. Mary's Academy (user, October 29: "Is there any other
// schools in that race that we could add to the app? This could be determined
// from last year's results", then "Add the four schools"). The 2025 KAS State
// X-C Championship (AthleticLIVE meet 58501) also ran Christ Preparatory
// Academy, Veritas Christian School, KC Metro Academy and Kickapoo Nation; the
// rest of its field were homeschool associations. See docs/KAS_KS_MODULE.md.
//
// None of the four keeps a calendar the app can read or a Bound page: MaxPreps
// is their schedule and their scores (`maxprepsOnly` in fetchHighSchool), and
// cross country is the KAS state meet from AthleticLIVE (LETSGORUN_MEETPRO).
import {LETSGORUN_MEETPRO} from './manhattan-ks.mjs';

const maxpreps=(schoolId,path)=>({schoolId,base:`https://www.maxpreps.com/ks/${path}/`});
// Cross country: the KAS state meet (its team names are in the meet's
// `schools`, LETSGORUN_MEETPRO.athleticLive).
const xc=team=>[{meet:true,meetPro:{team}}];

// Christ Preparatory Academy (Lenexa, Johnson County; the Patriots).
export const christPrepKsSchool={id:'christ-prep-ks',
  maxpreps:maxpreps('af82426a-4cb2-4171-9f57-4caba0094406','lenexa/christ-prep-academy-patriots'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Football:[{maxpreps:'football'}],
    Volleyball:[{maxpreps:'volleyball',label:'Girls'},{maxpreps:'volleyball/boys',label:'Boys'}],
    Soccer:[{maxpreps:'soccer',label:'Boys'},{maxpreps:'soccer/girls/spring',label:'Girls'}],
    Basketball:[{maxpreps:'basketball/girls',label:'Girls'},{maxpreps:'basketball',label:'Boys'}],
    Baseball:[{maxpreps:'baseball'}],
    'Cross Country':xc('Christ Preparatory Academy')
  }};

// Veritas Christian School (Lawrence, Douglas County; the Eagles).
export const veritasChristianKsSchool={id:'veritas-christian-ks',
  maxpreps:maxpreps('6536123d-e7cf-4910-87fa-1f4736215249','lawrence/veritas-christian-eagles'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{maxpreps:'volleyball'}],
    Basketball:[{maxpreps:'basketball/girls',label:'Girls'},{maxpreps:'basketball',label:'Boys'}],
    Baseball:[{maxpreps:'baseball'}],
    'Cross Country':xc('Veritas Christian School')
  }};

// Kickapoo Nation School (Powhattan, Brown County; the Warriors).
export const kickapooNationKsSchool={id:'kickapoo-nation-ks',
  maxpreps:maxpreps('KICKAPOO_ID','powhattan/kickapoo-nation-warriors'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{maxpreps:'volleyball'}],
    Basketball:[{maxpreps:'basketball/girls',label:'Girls'},{maxpreps:'basketball',label:'Boys'}],
    Baseball:[{maxpreps:'baseball'}],
    'Cross Country':xc('Kickapoo Nation')
  }};

// KC Metro Academy (the Metro Academy Mavericks: a homeschool sports
// program in the Kansas City area, Johnson County; MaxPreps "Shawnee Mission").
export const kcMetroAcademyKsSchool={id:'kc-metro-academy-ks',
  maxpreps:maxpreps('METRO_ID','shawnee-mission/metro-academy-mavericks'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{maxpreps:'volleyball'}],
    Basketball:[{maxpreps:'basketball/girls',label:'Girls'},{maxpreps:'basketball',label:'Boys'}],
    'Cross Country':xc('KC Metro Academy')
  }};

export const KAS_KS_HIGH_SCHOOLS=[christPrepKsSchool,veritasChristianKsSchool,kickapooNationKsSchool,kcMetroAcademyKsSchool];
