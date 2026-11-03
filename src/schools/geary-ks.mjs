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
import {bound,maxpreps,on,boundHighSchool,boundMiddleSchool,HS_TRACK_EXCLUDE} from './riley-pottawatomie-ks.mjs';

// Junction City's and Fort Riley's Bound levels also write a grade's A team
// "7th Grade - A - 1" and "7A" (B teams are not listed).
const usd475Grade=g=>new RegExp(`^(?:${g}(?: Grade)?(?:\\s*-?\\s*A(?:-Team)?(?:\\s*-\\s*1)?)?|${g[0]}A)$`,'i');

// --- Geary County USD 475

export const junctionCityKsSchool={id:'junction-city-ks',bound:bound('h20250204045159822386f317805064a','junctioncityhs'),
  maxpreps:maxpreps('0db83983-6aab-46c9-9989-88ee256551be','junction-city/junction-city-bluejays'),meetPro:LETSGORUN_MEETPRO,
  prepGolf:{school:7,code:'JC'},
  sports:boundHighSchool({has:['Football','Volleyball','Soccer','Girls Soccer','Basketball','Baseball','Softball','Cross Country','Golf','Girls Golf','Boys Golf','Tennis','Girls Tennis','Boys Tennis','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Swimming & Diving','Girls Swimming','Boys Swimming','Bowling','Girls Bowling','Boys Bowling'],
    meetTeam:'Junction City',tennis:'Junction City HS',milesplit:15714,paths:{'Girls Soccer':'soccer/girls/spring'}})};

// Bound gives Junction City MS and St. Xavier no page of their own (no
// calendar slug; their events are read by Bound id): the feed links Bound's
// Kansas page.
const unpaged=school=>({school,page:'https://beta.gobound.com/ks'});
export const junctionCityMsKsSchool={id:'junction-city-ms-ks',bound:unpaged('h20251215030233573aee5a5046f2741'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Golf','Tennis'],meetTeam:'Junction City',milesplit:39340,grades:usd475Grade})};

// Fort Riley Middle School (on the post; Geary County): LetsGoRun writes it
// "Ft Riley" ("Ft Riley7G").
export const fortRileyMsKsSchool={id:'fort-riley-ms-ks',bound:bound('h20250612074705722fb6ff5c7484f42','fortrileyms'),meetPro:LETSGORUN_MEETPRO,
  sports:boundMiddleSchool({has:['Football','Volleyball','Basketball','Cross Country','Wrestling','Girls Wrestling','Boys Wrestling','Track & Field','Golf','Tennis'],meetTeam:'Ft Riley',trackTeam:['Ft Riley','Fort Riley'],milesplit:40677,grades:usd475Grade})};

// --- St. Francis Xavier Catholic School (St. Xavier Rams, 1A)

// Its games are on MaxPreps (`maxprepsSchedule`: the coming games and the
// finals from the team's MaxPreps schedule); its meets on Bound. LetsGoRun
// writes it "St Xavier" ("St Xavier7B").
const SFX=unpaged('h202502040452054647fae500274d446');
const SFX_TRACK=['St Xavier','St. Xavier','St. Francis Xavier'];
export const stXavierKsSchool={id:'st-xavier-ks',bound:SFX,
  maxpreps:maxpreps('2eb435d3-ebb7-4924-8a91-b479053f94eb','junction-city/st-xavier-rams'),meetPro:LETSGORUN_MEETPRO,
  sports:{
    // Volleyball: MaxPreps' finals, then Bound's varsity entries (October 19 vs Veritas Christian).
    Volleyball:[{...on('Volleyball'),maxpreps:'volleyball'}],
    Basketball:[{maxpreps:'basketball/girls',label:'Girls',maxprepsSchedule:true},{maxpreps:'basketball',label:'Boys',maxprepsSchedule:true}],
    // Bound lists two of its 2026 meets; MileSplit Live has its runners at
    // three more (the Council Grove Invitational of October 1 lists the team
    // but no runner: not added).
    'Cross Country':[{...on(['Girls Cross Country','Boys Cross Country']),meet:true,meetPro:{team:'St Xavier',races:/\bvarsity\b/i,exclude:/junior varsity/i},milesplit:{team:26138},
      extraMeets:[{date:'2026-10-03',name:'Bob Schmoekel Cross Country Invitational'},{date:'2026-10-08',name:'Goessel XC Invitational'},{date:'2026-10-24',name:'KSHSAA 1A Sub-State Cheney Lake'}]}],
    'Track & Field':[{...on(['Girls Track & Field','Boys Track & Field']),meet:true,meetPro:{team:SFX_TRACK,track:true,exclude:HS_TRACK_EXCLUDE}}]
  }};
// The junior high (grades 6-8): Bound's "JHA", "Junior High", "Middle
// School" and grade entries (JHB is the B team).
const SFX_JH=/^(?:JH ?A|JH|Junior High|Middle School|(?:7th|8th)(?: Grade)?(?: A)?)$/i;
export const stXavierJhKsSchool={id:'st-xavier-jh-ks',bound:SFX,meetPro:LETSGORUN_MEETPRO,
  sports:{
    Volleyball:[{...on('Volleyball',SFX_JH)}],
    Basketball:[{...on('Girls Basketball',SFX_JH),label:'Girls'},{...on('Boys Basketball',SFX_JH),label:'Boys'}],
    // Its junior high runners run under the high school's MileSplit team.
    'Cross Country':[{...on(['Girls Cross Country','Boys Cross Country'],SFX_JH),meet:true,meetPro:{team:'St Xavier',exclude:/varsity|\bJV\b/i},milesplit:{team:26138,middle:true}}],
    'Track & Field':[{...on(['Girls Track & Field','Boys Track & Field'],SFX_JH),meet:true,meetPro:{team:SFX_TRACK,track:true,meetHas:/\bgrade\b|middle|\bMS\b|\bJH\b|junior high/i}}]
  }};

export const GEARY_HIGH_SCHOOLS=[junctionCityKsSchool,stXavierKsSchool];
export const GEARY_MIDDLE_SCHOOLS=[junctionCityMsKsSchool,fortRileyMsKsSchool,stXavierJhKsSchool];
