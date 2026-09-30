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

// Sports whose schedule-payload results have been checked against K-State's format.
const PAYLOAD_RESULT_SPORTS=new Set(['Football']);
// Sports whose published start times (local wall clock) are shown as K-State shows them.
const PAYLOAD_TIME_SPORTS=new Set(['Football','Soccer','Softball']);
const MONTH_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// "2:45 p.m. CT", "11 a.m. CT", "11:30 AM (CDT)" with a matching payload date
// "2026-09-05T14:45:00" -> the school's local wall clock. TBA/TBD has no time.
export function oklahomaStateStartTime(date,time){
  const d=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  const t=String(time||'').match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?=[\s(]|$)/i);
  if(!d||!t)return null;
  const hour=Number(t[1])%12+(t[3].toLowerCase()==='p'?12:0),minute=Number(t[2]||0);
  if(hour!==Number(d[4])||minute!==Number(d[5]))return null;
  const month=Number(d[2]),day=Number(d[3]);
  return{start_time:`${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}:00.000Z`,display_time:`${MONTH_ABBR[month-1]} ${day}, ${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`};
}
// Meet sports whose published team placing is rewritten to K-State's wording.
const PAYLOAD_PLACING_SPORTS=new Set(['Golf']);
// "7th/16", "9th out of 12 teams", "T3rd of 10" -> "7th of 16". No score is
// added: okstate.com publishes only the placing on the schedule.
export function oklahomaStatePlacing(value){
  const m=String(value||'').trim().match(/^(T-?)?(\d+)(st|nd|rd|th)\s*(?:\/|of|out of)\s*(\d+)(?:\s+teams)?\.?$/i);
  return m?`${m[1]?'T':''}${m[2]}${m[3].toLowerCase()} of ${m[4]}`:null;
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

// okstate.com schedule pages embed every game as structured Nuxt data
// (<script id="__NUXT_DATA__">, a devalue-encoded array). Decode it to plain
// game objects; the rendered cards omit W/L and recap links.
export function oklahomaStateScheduleGames(raw){
  const script=String(raw||'').match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!script)return[];
  let data;try{data=JSON.parse(script[1]);}catch{return[];}
  if(!Array.isArray(data))return[];
  const wrappers=new Set(['Reactive','ShallowReactive','Ref','ShallowRef','EmptyRef','EmptyShallowRef']);
  const resolve=(index,depth)=>{
    if(depth>8||typeof index!=='number'||index<0||index>=data.length)return null;
    const value=data[index];
    if(Array.isArray(value)){
      if(typeof value[0]==='string'&&wrappers.has(value[0]))return resolve(value[1],depth);
      return value.map(item=>resolve(item,depth+1));
    }
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,typeof item==='number'?resolve(item,depth+1):item]));
    return value;
  };
  // A game can appear twice (the schedule and a "next game" widget); keep one.
  const games=[],seen=new Set();
  data.forEach((value,index)=>{
    if(!value||Array.isArray(value)||typeof value!=='object'||!('result' in value)||!('opponent' in value)||!('date' in value))return;
    const game=resolve(index,0);
    if(!game||typeof game.date!=='string'||!game.opponent||typeof game.opponent!=='object')return;
    const key=game.id??`${game.date}|${game.opponent.title}`;
    if(seen.has(key))return;seen.add(key);games.push(game);
  });
  return games;
}

export function createOklahomaStateHandlers({ordinal,slug,recapMatchesEvent,fetchPdfText,fetch,headers}={}){
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
  // A page whose meets all belong to the other sport is a valid, empty
  // schedule (e.g. no track meets published yet), not a failed source.
  const emptiedBySplit=new WeakSet();
  function filterEvents(events,school,sport,sourceUrl){
    if(school?.id!=='oklahoma-state'||!['Cross Country','Track & Field'].includes(sport))return events;
    const path=officialPath(sourceUrl);
    if(!path||!SHARED_PROGRAM_PATH.test(path))return events;
    const kept=events.filter(event=>event.school_id==='oklahoma-state'&&oklahomaStateMeetSport(event)===sport);
    if(events.length&&!kept.length)emptiedBySplit.add(kept);
    return kept;
  }
  const isEmptyProgramSchedule=events=>Array.isArray(events)&&!events.length&&emptiedBySplit.has(events);
  // Published W/L result, scores and the exact recap from the schedule's own
  // game data, matched by date and opponent. Only verified sports opt in.
  function enrichScheduleEvents(events,raw,school,sport,sourceUrl){
    const enabled=PAYLOAD_RESULT_SPORTS.has(sport)||PAYLOAD_PLACING_SPORTS.has(sport)||PAYLOAD_TIME_SPORTS.has(sport);
    const games=school?.id==='oklahoma-state'&&enabled&&officialPath(sourceUrl)?oklahomaStateScheduleGames(raw):[];
    if(!games.length)return events;
    for(const event of events){
      if(event.school_id!=='oklahoma-state')continue;
      const day=String(event.start_time||'').slice(0,10),opponent=slug(event.opponent||'');
      const matches=games.filter(game=>game.date.slice(0,10)===day&&slug(game.opponent.title||'')===opponent);
      if(matches.length!==1)continue;
      if(event.status!=='Final'){
        const start=PAYLOAD_TIME_SPORTS.has(sport)?oklahomaStateStartTime(matches[0].date,matches[0].time):null;
        if(start)Object.assign(event,start);
        continue;
      }
      const result=matches[0].result||{};
      if(PAYLOAD_PLACING_SPORTS.has(sport)&&event.event_type==='MEET'){
        const placing=oklahomaStatePlacing(result.prescore_info);
        if(placing){event.headline=placing;event.results=[{label:'Result',value:placing}];event.result_count=1;}
        continue;
      }
      if(event.event_type!=='GAME'||!PAYLOAD_RESULT_SPORTS.has(sport))continue;
      const outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      if(!['W','L','T'].includes(outcome)||!/^\d+$/.test(team)||!/^\d+$/.test(other))continue;
      event.school_score=team;event.opponent_score=other;
      event.headline=`${outcome}, ${team}-${other}`;
      event.results=[{label:'Result',value:event.headline}];event.result_count=1;
      const recap=result.recap?.url;
      if(typeof recap==='string'){
        try{const url=new URL(recap,sourceUrl);if(url.hostname==='okstate.com'&&url.pathname.startsWith('/news/'))event.recap_url=url.href;}catch{}
      }
    }
    return events;
  }
  return{filterEvents,isEmptyProgramSchedule,enrichScheduleEvents,isOklahomaStateCrossCountry,attachMeetResults};
}
