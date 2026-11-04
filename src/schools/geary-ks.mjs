// Geary County, Kansas: every middle school and high school (user, November
// 3: "Let's add another county in Kansas", then "Geary"). See
// docs/GEARY_KS_MODULE.md.
//
// Junction City High School, Junction City Middle School and Fort Riley
// Middle School (Geary County USD 475) keep their schedules on Bound (JCHS's
// own site links its Bound calendar). St. Francis Xavier Catholic School
// (St. Xavier, Junction City, PreK-12) enters only part of its season on
// Bound; its games are on MaxPreps. Its Google Calendar holds the whole
// season, but calendar.google.com's robots.txt disallows every automated
// read, so it is not read. Scores: MaxPreps and the finals entered on Bound;
// cross country from LetsGoRun Timing (MeetPro) and MileSplit Live, track
// from MeetPro, golf from Prep.Golf, tennis from TennisReporting.
import {LETSGORUN_MEETPRO} from './manhattan-ks.mjs';
import {maxpreps,on,unpaged,HS_TRACK_EXCLUDE,MS_XC_EXCLUDE,schoolsFromConfig} from '../high-school-builders.mjs';
import GEARY_DATA from './data/ks-geary.json' with {type:'json'};
// Junction City HS, Junction City MS and Fort Riley MS are data
// (src/schools/data/ks-geary.json): Bound schedules, MaxPreps, LetsGoRun,
// MileSplit Live, Prep.Golf and TennisReporting, with the notes once kept here.
const DATA=schoolsFromConfig(GEARY_DATA);

// --- Geary County USD 475

export const junctionCityKsSchool=DATA['junction-city-ks'];
export const junctionCityMsKsSchool=DATA['junction-city-ms-ks'];
export const fortRileyMsKsSchool=DATA['fort-riley-ms-ks'];

// --- St. Francis Xavier Catholic School (St. Xavier Rams, 1A)

// St. Xavier's Google Calendar (linked from saintxrams.org's Calendar/News
// page) holds the whole season, read through the Google Calendar API (its
// calendar.google.com feeds are robots-disallowed). Entries name the level
// and sport, and the opponent or only the place: "MS/HS VB vs. Veritas -
// leave at 3:30" at "Veritas Christian School Gym, ..., Lawrence, KS",
// "HS VB - dismiss at 3:25" at "810 N Sycamore St, Peabody, KS", "MS VB
// Tournament @ Chapman", "MS BB vs. Wakefield @ St. X", "HS Cross Country
// Meet - leave at 2:15pm" at "Cedar Hills Golf Course, ..., Washington, KS".
// The calendar's notes (who drives, dismissal times, students' names) are
// never read. Its entries fill only the days MaxPreps and Bound leave empty
// (team `googleCalendar`).
const SFX_CALENDAR_ID='k27ts8fuijnopevpe379j6dqtk@group.calendar.google.com';
const SFX_SKIP=/cancel|postpone|practice|camp|open gym|parent|meeting|celebration|conditioning|begins|\bcheer|scholars|forensics|banquet|retreat|fundraiser|physical|shower|stations|\bmass\b|ribbon|starbase|taco|bbq|auction|\bJV\b|\bC team\b|\bB team\b/i;
const SFX_HOME=/\b(?:st\.? ?x(?:avier)?|st\.? francis xavier|200 n washington)\b/i;
const SFX_NAMES={FHC:'Flint Hills Christian',CHIEF:'C.H.I.E.F.',MCS:'Manhattan Catholic','St. X':'St. Xavier'};
const SFX_SPORTS=[[/^(?:(girls|boys)\s+)?(?:vb|volleyball)\b/i,'Volleyball'],[/^(?:(girls|boys)\s+)?(?:bb|basketball)\b/i,'Basketball'],[/^(?:xc|cross country)\b/i,'Cross Country'],[/^track(?:\s*(?:&|and)\s*field)?\b/i,'Track & Field']];
const SFX_EVENT=/\b(?:tournament|tourney|tri|triangular|quad|invitational|invite|meet|jamboree|sub-?state|regionals?|state|league|classic|festival)\b/i;
const expandSfx=t=>Object.entries(SFX_NAMES).reduce((x,[k,v])=>x.replace(new RegExp(`(^|[^A-Za-z])${k.replace(/[.]/g,'\\.')}(?![A-Za-z])`,'g'),`$1${v}`),t);
// A place from the entry's location: the school or venue named first ("Luckey
// Catholic Junior High School" reads "Luckey Catholic"), else the town of a
// street address ("810 N Sycamore St, Peabody, KS 66866" reads "Peabody").
function sfxPlace(location){
  const parts=String(location||'').split(',').map(x=>x.trim()).filter(Boolean);if(!parts.length)return{place:null,city:null};
  const ks=parts.findIndex(x=>/^KS\b/.test(x)),city=ks>0?parts[ks-1]:null;
  const first=parts[0],place=/^\d/.test(first)?null:first.replace(/\s+(?:Jr\.?\/Sr\.?|Junior Senior|Junior\/Senior)\s+High School$|\s+Junior High School$|\s+Middle School$|\s+High School$|\s+School Gym$|\s+Gym$|\s+School$/i,'').trim();
  return{place:place||null,city:city&&!/^\d/.test(city)?city:null};
}
export function stXavierCalendarTitles({summary,location}){
  let s=String(summary||'').trim();if(!s||SFX_SKIP.test(s))return null;
  const lv=s.match(/^(MS\/HS|HS\/MS|HS|MS|JH|Varsity)\b\s*/i);
  let levels;
  if(lv){levels=/\//.test(lv[1])?['HS','MS']:[/^(?:HS|Varsity)$/i.test(lv[1])?'HS':'MS'];s=s.slice(lv[0].length);}
  else if(/\bsub-?state\b|\bregionals?\b|\bstate\b/i.test(s))levels=['HS'];else return null;
  let sport=null,gender=null;
  for(const [re,name] of SFX_SPORTS){const m=s.match(re);if(m){sport=name;gender=m[1]?m[1][0].toUpperCase()+m[1].slice(1).toLowerCase():null;s=s.slice(m[0].length);break;}}
  if(!sport)return null;
  const meet=sport==='Cross Country'||sport==='Track & Field';
  const rest=expandSfx(s.split(/\s+-\s+/)[0].replace(/^\s*[-:]\s*/,'').replace(/\b(?:game|games|competition|match)\b/gi,' ').replace(/\s+/g,' ').trim());
  const {place,city}=sfxPlace(location),homeLoc=SFX_HOME.test(location||'');
  let name,site;
  const vs=rest.match(/^(?:vs\.?|versus)\s+(.+?)(?:\s*@\s*(.+))?$/i),at=rest.match(/^(.*?)\s*@\s*(.+)$/);
  if(vs){name=vs[1].trim();site=vs[2]?(SFX_HOME.test(vs[2])||/^St\. Xavier$/.test(vs[2])?'HOME':'AWAY'):homeLoc?'HOME':'AWAY';}
  else if(at){
    const pre=at[1].trim(),where=at[2].trim(),home=/^St\. Xavier$/.test(where)||SFX_HOME.test(where);
    site=home?'HOME':'AWAY';
    name=pre&&SFX_EVENT.test(pre)?`${pre} at ${where}`:meet?`${where} Meet`:where;
  }else{
    site=homeLoc?'HOME':'AWAY';
    const label=homeLoc?'St. Xavier':place||city;
    if(rest&&SFX_EVENT.test(rest)&&!/^meet$/i.test(rest))name=label?`${rest} at ${label}`:rest;
    else if(meet)name=label?`${city&&city!==label?`${city} Meet at ${label}`:`${label} Meet`}`:null;
    // A game with no opponent named: the place it is played at, never a
    // made-up opponent; a home game with none is left to MaxPreps and Bound.
    else name=homeLoc?null:label;
  }
  name=name&&name.replace(/\s+-\s+/g,' ').replace(/\s+/g,' ').trim();
  if(!name)return null;
  return levels.map(level=>`SX ${level} ${gender&&sport==='Basketball'?`${gender} `:''}${sport} - ${name} - ${site}`);
}
const sfxCalendar={id:SFX_CALENDAR_ID,prefix:'SX',normalize:stXavierCalendarTitles,page:'https://www.saintxrams.org/calendarnews.html'};

// Its games are on MaxPreps (`maxprepsSchedule`: the coming games and the
// finals from the team's MaxPreps schedule); its meets on Bound. LetsGoRun
// writes it "St Xavier" ("St Xavier7B").
const SFX=unpaged('h202502040452054647fae500274d446');
const SFX_TRACK=['St Xavier','St. Xavier','St. Francis Xavier'];
export const stXavierKsSchool={id:'st-xavier-ks',globalSavedCopy:true,bound:SFX,googleCalendar:sfxCalendar,
  maxpreps:maxpreps('2eb435d3-ebb7-4924-8a91-b479053f94eb','junction-city/st-xavier-rams'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    // Volleyball: MaxPreps' finals, then Bound's varsity entries (October 19 vs Veritas Christian).
    Volleyball:[{...on('Volleyball'),maxpreps:'volleyball',googleCalendar:/^HS Volleyball$/}],
    // "HS BB" counts for both teams.
    Basketball:[{maxpreps:'basketball/girls',label:'Girls',maxprepsSchedule:true,googleCalendar:/^HS (?:Girls )?Basketball$/},{maxpreps:'basketball',label:'Boys',maxprepsSchedule:true,googleCalendar:/^HS (?:Boys )?Basketball$/}],
    // Bound lists two of its 2026 meets; the statewide MileSplit Live index
    // adds the three more it has St. Xavier's runners at (October 3, 8 and
    // 24; Council Grove, October 1, lists the team but no runner).
    'Cross Country':[{...on(['Girls Cross Country','Boys Cross Country']),meet:true,meetPro:{team:'St Xavier',races:/\bvarsity\b/i,exclude:/junior varsity/i},milesplit:{team:26138},googleCalendar:/^HS Cross Country$/}],
    'Track & Field':[{...on(['Girls Track & Field','Boys Track & Field']),meet:true,meetPro:{team:SFX_TRACK,track:true,exclude:HS_TRACK_EXCLUDE},googleCalendar:/^HS Track & Field$/}]
  }};
// The junior high (grades 6-8): Bound's "JHA", "Junior High", "Middle
// School" and grade entries (JHB is the B team).
const SFX_JH=/^(?:JH ?A|JH|Junior High|Middle School|(?:7th|8th)(?: Grade)?(?: A)?)$/i;
export const stXavierJhKsSchool={id:'st-xavier-jh-ks',bound:SFX,googleCalendar:sfxCalendar,meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{...on('Volleyball',SFX_JH),googleCalendar:/^MS Volleyball$/}],
    Basketball:[{...on('Girls Basketball',SFX_JH),label:'Girls',googleCalendar:/^MS (?:Girls )?Basketball$/},{...on('Boys Basketball',SFX_JH),label:'Boys',googleCalendar:/^MS (?:Boys )?Basketball$/}],
    // Its junior high runners run under the high school's MileSplit team.
    'Cross Country':[{...on(['Girls Cross Country','Boys Cross Country'],SFX_JH),meet:true,meetPro:{team:'St Xavier',exclude:MS_XC_EXCLUDE},milesplit:{team:26138,middle:true},googleCalendar:/^MS Cross Country$/}],
    'Track & Field':[{...on(['Girls Track & Field','Boys Track & Field'],SFX_JH),meet:true,meetPro:{team:SFX_TRACK,track:true,meetHas:/\bgrade\b|middle|\bMS\b|\bJH\b|junior high/i},googleCalendar:/^MS Track & Field$/}]
  }};

export const GEARY_HIGH_SCHOOLS=[junctionCityKsSchool,stXavierKsSchool];
export const GEARY_MIDDLE_SCHOOLS=[junctionCityMsKsSchool,fortRileyMsKsSchool,stXavierJhKsSchool];
