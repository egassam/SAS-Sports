// Oklahoma State school module. Shared publisher utilities stay in the Worker;
// this file owns okstate.com routes, program combinations, the shared
// cross-country/track schedule split, and existing verified athlete identities.
export const oklahomaStateSchool={
  id:'oklahoma-state',
  // okstate.com publishes separate men's and women's pages for these sports.
  // Load and label both; a stale or empty division must not hide the other.
  combinedSports:new Set(['Basketball','Golf','Tennis']),
  scheduleUrls:{
    'oklahoma-state|Baseball':['https://okstate.com/sports/baseball/schedule','https://okstate.com/'],
    'oklahoma-state|Basketball':[
      'https://okstate.com/sports/mens-basketball/schedule',
      'https://okstate.com/sports/womens-basketball/schedule',
      'https://okstate.com/sports/basketball/schedule',
      'https://okstate.com/'
    ],
    // The men's cross country/track program page lists both divisions' meets.
    'oklahoma-state|Cross Country':'https://okstate.com/sports/mxct/schedule',
    'oklahoma-state|Track & Field':'https://okstate.com/sports/mxct/schedule',
    'oklahoma-state|Football':'https://okstate.com/sports/football/schedule',
    'oklahoma-state|Golf':['https://okstate.com/sports/womens-golf/schedule','https://okstate.com/sports/mens-golf/schedule'],
    'oklahoma-state|Tennis':['https://okstate.com/sports/womens-tennis/schedule','https://okstate.com/sports/mens-tennis/schedule'],
    'oklahoma-state|Wrestling':'https://okstate.com/sports/wrestling/schedule',
    'oklahoma-state|Equestrian':['https://okstate.com/sports/equestrian/schedule','https://okstate.com/'],
    'oklahoma-state|Soccer':'https://okstate.com/sports/womens-soccer/schedule',
    'oklahoma-state|Softball':['https://okstate.com/sports/softball/schedule','https://okstate.com/']
  },
  rosterUrls:{
    'oklahoma-state|Baseball':'https://okstate.com/sports/baseball/roster',
    'oklahoma-state|Basketball':['https://okstate.com/sports/mens-basketball/roster','https://okstate.com/sports/womens-basketball/roster','https://okstate.com/sports/basketball/roster'],
    'oklahoma-state|Cross Country':'https://okstate.com/sports/mxct/roster',
    'oklahoma-state|Track & Field':'https://okstate.com/sports/mxct/roster',
    'oklahoma-state|Football':'https://okstate.com/sports/football/roster',
    'oklahoma-state|Golf':['https://okstate.com/sports/womens-golf/roster','https://okstate.com/sports/mens-golf/roster'],
    'oklahoma-state|Tennis':['https://okstate.com/sports/womens-tennis/roster','https://okstate.com/sports/mens-tennis/roster'],
    'oklahoma-state|Wrestling':'https://okstate.com/sports/wrestling/roster',
    'oklahoma-state|Equestrian':'https://okstate.com/sports/equestrian/roster',
    'oklahoma-state|Soccer':'https://okstate.com/sports/womens-soccer/roster',
    'oklahoma-state|Softball':'https://okstate.com/sports/softball/roster'
  },
  // Identities verified earlier through official team-account tags. No new
  // accounts are inferred; rosters without published links use official
  // profiles with no Instagram destination.
  verifiedInstagrams:{
    'oklahoma-state|Cross Country|Denis Kipngetich':'https://www.instagram.com/deniskipngetich604/',
    'oklahoma-state|Cross Country|Brian Musau':'https://www.instagram.com/brianmuangemusau/'
  }
};

const SHARED_PROGRAM_PATH=/^\/sports\/(?:mxct|womens-cross-country-track)\//i;
const CROSS_COUNTRY_NAME=/\bcross[\s-]*country\b|\bXC\b/i;
const TRACK_NAME=/\b(?:indoor|outdoor|relays?|track|field|pentathlon|heptathlon|decathlon)\b/i;

// Classify a meet from the shared program schedule. An explicit event name
// wins; otherwise NCAA seasons decide (cross country runs August–November).
export function oklahomaStateMeetSport(event){
  const name=`${event?.opponent||''} ${event?.title||''}`;
  if(CROSS_COUNTRY_NAME.test(name))return'Cross Country';
  if(TRACK_NAME.test(name))return'Track & Field';
  const month=Number(String(event?.start_time||'').slice(5,7));
  if(!month)return null;
  return month>=8&&month<=11?'Cross Country':'Track & Field';
}

export function createOklahomaStateHandlers(){
  const officialPath=url=>{
    try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='okstate.com'?u.pathname:null;}catch{return null;}
  };
  // The shared page serves both Cross Country and Track & Field. Keep only
  // the meets that belong to the requested sport; other pages are unchanged.
  function filterEvents(events,school,sport,sourceUrl){
    if(school?.id!=='oklahoma-state'||!['Cross Country','Track & Field'].includes(sport))return events;
    const path=officialPath(sourceUrl);
    if(!path||!SHARED_PROGRAM_PATH.test(path))return events;
    return events.filter(event=>event.school_id==='oklahoma-state'&&oklahomaStateMeetSport(event)===sport);
  }
  return{filterEvents};
}
