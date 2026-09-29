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
    // The men's cross country/track program page lists every meet, and each
    // meet's results document covers both collegiate races. The women's
    // program page is only a fallback if the primary page is unusable.
    'oklahoma-state|Cross Country':['https://okstate.com/sports/mxct/schedule','https://okstate.com/sports/womens-cross-country-track/schedule'],
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

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const TEAM_ROW=/^(\d+)\s+Oklahoma\s+State\s+(\d+)\s+[\d(]/i;
// Both published formats: "44 RODRIGUEZ, Adelynn SO Oklahoma Stat (37) 21:36.0"
// (DirectAthletics MeetPro, team column truncated) and
// "3 3 #1511 Kipkemboi, Laban Sr OKLAHOMA STATE 15:13.4" (bib-number format).
const ATHLETE_ROW=/^(\d+)\s+(?:(?:\(\d+\)|\d+|--)\s+#\d+\s+)?(.+?)\s+(?:(?:FR|SO|JR|SR|GR|RS)\s+)?Oklahoma\s+Stat(?:e)?\s+(?:(?:\(\d+\)|\d+|-)\s+)?(\d{1,2}:\d{2}(?:\.\d+)?)(?=\s|$)/i;
// MeetPro prints the race title after each page; other formats print it first.
const RACE_FOOTER=/Race\s*#\d+\s*\n\s*([^\n]+?)\s+Final Results/gi;
const RACE_HEADER=/^((?:Wo)?Men(?:'s|s)?)\s+([\d,.]+)\s*(K|km|meters|m|miles?)\b.*$/gim;

function raceGroup(title){
  const m=String(title||'').replace(/[’‘]/g,"'").match(/^((?:Wo)?Men)(?:'s|s)?\s+([\d,.]+)\s*(K|km|meters|m|miles?)\b(.*)$/i);
  // High-school and other non-collegiate races are not Oklahoma State races.
  if(!m||/\b(?:school|boys|girls|high|middle|junior high)\b/i.test(title))return null;
  const division=/^women$/i.test(m[1])?"Women's":"Men's",value=Number(m[2].replace(/,/g,''));
  if(!value)return null;
  const unit=m[3].toLowerCase();
  const distance=/^mile/.test(unit)?`${value} Mile`:`${/^(?:meters|m)$/.test(unit)?value/1000:value}K`;
  return`${division} ${distance}${/\bopen\b/i.test(m[4])?' Open':''}`;
}
function titleCase(value){
  const text=String(value||'').trim();
  if(/[a-z]/.test(text))return text;
  return text.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(_,a,b)=>a+b.toUpperCase()).replace(/\bMc(\p{L})/gu,(_,b)=>'Mc'+b.toUpperCase());
}
function athleteName(value){
  const [last,...first]=String(value||'').split(',');
  return first.length?`${titleCase(first.join(','))} ${titleCase(last)}`:titleCase(last);
}
function raceSegments(text){
  const source=String(text||'').replace(/\r/g,'').replace(/[’‘]/g,"'"),segments=[];
  const footers=[...source.matchAll(RACE_FOOTER)];
  if(footers.length){
    let start=0;
    for(const footer of footers){segments.push({group:raceGroup(footer[1]),text:source.slice(start,footer.index)});start=footer.index+footer[0].length;}
    return segments;
  }
  const headers=[...source.matchAll(RACE_HEADER)];
  headers.forEach((header,i)=>segments.push({group:raceGroup(header[0]),text:source.slice(header.index+header[0].length,headers[i+1]?.index??source.length)}));
  return segments;
}
// Official meet results document -> K-State's result contract: one group per
// collegiate race, team row first, then every placed Oklahoma State athlete.
// Scratched or unplaced entrants have no published place/time and are omitted.
export function parseOklahomaStateMeetResults(text,ordinal){
  const races=new Map();
  for(const segment of raceSegments(text)){
    if(!segment.group)continue;
    const race=races.get(segment.group)||{team:null,athletes:new Map()};races.set(segment.group,race);
    for(const raw of segment.text.split('\n')){
      const line=raw.replace(/\s+/g,' ').trim();
      const team=line.match(TEAM_ROW);
      if(team){race.team??={group:segment.group,participant:'Oklahoma State team',result:`${ordinal(team[1])} · ${team[2]} pts`};continue;}
      const athlete=line.match(ATHLETE_ROW);if(!athlete)continue;
      const participant=athleteName(athlete[2]);
      if(!participant||/^oklahoma\b/i.test(participant)||race.athletes.has(participant))continue;
      race.athletes.set(participant,{place:Number(athlete[1]),row:{group:segment.group,participant,result:`${ordinal(athlete[1])} · ${athlete[3]}`}});
    }
  }
  const order=group=>(group.startsWith("Women's")?0:1);
  return[...races.entries()].filter(([,race])=>race.team||race.athletes.size)
    .sort(([a],[b])=>order(a)-order(b))
    .flatMap(([,race])=>[...(race.team?[race.team]:[]),...[...race.athletes.values()].sort((a,b)=>a.place-b.place).map(x=>x.row)]);
}
export function oklahomaStateResultsComplete(rows){
  return["Women's","Men's"].every(division=>{
    const group=(rows||[]).filter(row=>row.group?.startsWith(division));
    return group.some(row=>/ team$/.test(row.participant))&&group.some(row=>!/ team$/.test(row.participant));
  });
}
// The linked document must be the results for this meet's date.
function documentMatchesDate(text,event){
  const day=String(event?.start_time||'').slice(0,10),[y,m,d]=day.split('-').map(Number);
  if(!y||!m||!d)return false;
  const month=MONTHS[m-1];
  return new RegExp(`\\b(?:${month}|${month.slice(0,3)})\\.?\\s+0?${d},\\s+${y}\\b|\\b0?${m}/0?${d}/${y}\\b`,'i').test(String(text||''));
}
function officialDocumentUrl(value){
  try{
    const u=new URL(value);if(u.protocol!=='https:')return null;
    if(u.hostname==='okstate.com'&&/^\/documents\//i.test(u.pathname))return u.href;
    if(u.hostname==='s3.us-east-2.amazonaws.com'&&/^\/sidearm\.nextgen\.sites\/okstate\.com\/documents\//i.test(u.pathname))return u.href;
  }catch{}
  return null;
}

export function createOklahomaStateHandlers({ordinal,recapMatchesEvent,fetchPdfText,fetch,headers}={}){
  const officialPath=url=>{
    try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='okstate.com'?u.pathname:null;}catch{return null;}
  };
  function isOklahomaStateCrossCountry(event){
    return event?.school_id==='oklahoma-state'&&event.sport==='Cross Country'&&event.event_type==='MEET'&&event.status==='Final';
  }
  // The recap link comes from the event's schedule card. Keep it only if the
  // article is the official recap for this exact meet.
  async function verifiedRecap(event){
    const path=officialPath(event.recap_url);
    if(!path||!path.startsWith('/news/'))return null;
    try{
      const response=await fetch(event.recap_url,{headers,redirect:'follow',signal:AbortSignal.timeout(6500)});
      if(!response.ok)return null;
      return recapMatchesEvent(await response.text(),event,event.recap_url)?event.recap_url:null;
    }catch{return null;}
  }
  // Feed and expanded view both call this; the second call is a no-op.
  async function attachMeetResults(event){
    if(!isOklahomaStateCrossCountry(event))return event;
    if(event.recap_result_count&&oklahomaStateResultsComplete(event.results))return event;
    const incomplete=()=>{
      event.meet_results_verified=false;event.highlights_verified=false;event.highlights=[];
      event.highlight_state='official_results_partial';
      event.highlight_status='Some official race results could not be loaded. Open the official results for both divisions.';
      return event;
    };
    const url=officialDocumentUrl(event.result_url);if(!url)return incomplete();
    let text=null;try{text=await fetchPdfText(url);}catch{}
    if(!text||!documentMatchesDate(text,event))return incomplete();
    const rows=parseOklahomaStateMeetResults(text,ordinal);
    if(!rows.length)return incomplete();
    const complete=oklahomaStateResultsComplete(rows),recap=await verifiedRecap(event);
    if(recap)event.recap_url=recap;else delete event.recap_url;
    event.results=rows;event.result_count=rows.length;event.has_more_results=rows.length>3;
    event.recap_result_count=rows.length;event.result_url=url;
    event.source={...event.source,name:'Official meet results',url};
    const teams=rows.filter(row=>/ team$/.test(row.participant));
    event.headline=teams.map(row=>`${row.group.startsWith("Women's")?"Women's":"Men's"} team: ${row.result}`).join(' / ')||event.headline;
    event.highlights=teams.map(row=>`Oklahoma State's ${row.group.toLowerCase()} team finished ${row.result.replace(' · ',' with ')}.`);
    for(const group of[...new Set(rows.map(row=>row.group))]){
      const leader=rows.find(row=>row.group===group&&!/ team$/.test(row.participant));
      if(leader)event.highlights.push(`${leader.participant} led Oklahoma State in the ${group.toLowerCase()}, finishing ${leader.result.replace(' · ',' in ')}.`);
    }
    event.highlights_verified=complete;event.meet_results_verified=complete;
    event.highlight_state=complete?'official_meet_results':'official_results_partial';
    event.highlight_status=complete?null:'Some official race results could not be loaded. Open the official results for both divisions.';
    return event;
  }
  // The shared page serves both Cross Country and Track & Field. Keep only
  // the meets that belong to the requested sport; other pages are unchanged.
  function filterEvents(events,school,sport,sourceUrl){
    if(school?.id!=='oklahoma-state'||!['Cross Country','Track & Field'].includes(sport))return events;
    const path=officialPath(sourceUrl);
    if(!path||!SHARED_PROGRAM_PATH.test(path))return events;
    return events.filter(event=>event.school_id==='oklahoma-state'&&oklahomaStateMeetSport(event)===sport);
  }
  return{filterEvents,isOklahomaStateCrossCountry,attachMeetResults};
}
