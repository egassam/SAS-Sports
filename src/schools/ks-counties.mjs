// Kansas counties whose middle and high schools are all data (user,
// November 5, 2026: "Change the rule to we can add as many counties we think
// one session can handle. Add counties of your choosing. Skip any schools
// that will slow down the process"). Each county is a data file
// (src/schools/data/ks-<county>.json, docs/HIGH_SCHOOL_ONBOARDING.md) built
// by `schoolsFromConfig`; adding a county is its data file and one line
// here. Schools that need a reader of their own stay out (listed in
// docs/NORTH_CENTRAL_KS_COUNTIES_MODULE.md). Geary, Riley and Pottawatomie
// keep their own modules (they also hold coded schools).
import {schoolsFromConfig} from '../high-school-builders.mjs';
import DICKINSON from './data/ks-dickinson.json' with {type:'json'};
import WABAUNSEE from './data/ks-wabaunsee.json' with {type:'json'};
import MORRIS from './data/ks-morris.json' with {type:'json'};
import CLAY from './data/ks-clay.json' with {type:'json'};
import MARSHALL from './data/ks-marshall.json' with {type:'json'};
import WASHINGTON from './data/ks-washington.json' with {type:'json'};
import REPUBLIC from './data/ks-republic.json' with {type:'json'};
import CLOUD from './data/ks-cloud.json' with {type:'json'};
import OTTAWA from './data/ks-ottawa.json' with {type:'json'};
import JACKSON from './data/ks-jackson.json' with {type:'json'};
import NEMAHA from './data/ks-nemaha.json' with {type:'json'};
import LYON from './data/ks-lyon.json' with {type:'json'};
import SHAWNEE from './data/ks-shawnee.json' with {type:'json'};
import DOUGLAS from './data/ks-douglas.json' with {type:'json'};
import SALINE from './data/ks-saline.json' with {type:'json'};
import JEFFERSON from './data/ks-jefferson.json' with {type:'json'};
import OSAGE from './data/ks-osage.json' with {type:'json'};
import FRANKLIN from './data/ks-franklin.json' with {type:'json'};
import MARION from './data/ks-marion.json' with {type:'json'};
import MCPHERSON from './data/ks-mcpherson.json' with {type:'json'};
import CHASE from './data/ks-chase.json' with {type:'json'};
import ATCHISON from './data/ks-atchison.json' with {type:'json'};
import BROWN from './data/ks-brown.json' with {type:'json'};
import COFFEY from './data/ks-coffey.json' with {type:'json'};
import ANDERSON from './data/ks-anderson.json' with {type:'json'};
import GREENWOOD from './data/ks-greenwood.json' with {type:'json'};
import HARVEY from './data/ks-harvey.json' with {type:'json'};
import RICE from './data/ks-rice.json' with {type:'json'};
import ELLSWORTH from './data/ks-ellsworth.json' with {type:'json'};

export const KS_COUNTY_FILES=[DICKINSON,WABAUNSEE,MORRIS,CLAY,MARSHALL,WASHINGTON,REPUBLIC,CLOUD,OTTAWA,JACKSON,NEMAHA,LYON,SHAWNEE,DOUGLAS,SALINE,JEFFERSON,OSAGE,FRANKLIN,MARION,MCPHERSON,CHASE,ATCHISON,BROWN,COFFEY,ANDERSON,GREENWOOD,HARVEY,RICE,ELLSWORTH];
const built=KS_COUNTY_FILES.map(file=>({file,schools:schoolsFromConfig(file)}));
const atLevel=level=>built.flatMap(({file,schools})=>file.schools.filter(entry=>entry.level===level).map(entry=>schools[entry.id]));
export const KS_COUNTY_HIGH_SCHOOLS=atLevel('high-school');
export const KS_COUNTY_MIDDLE_SCHOOLS=atLevel('middle-school');
