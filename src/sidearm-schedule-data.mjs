// SIDEARM (Nuxt) schedule pages embed every game as structured data in
// <script id="__NUXT_DATA__"> (a devalue-encoded array). The rendered game
// cards omit most of it: published W/L, recap links, golf placings and the
// local start time. School modules decide which sports use each part, after
// checking that sport against an official page.

// Decode the page data to plain game objects, each game once (a "next game"
// widget can repeat a game from the schedule).
export function sidearmScheduleGames(raw){
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

const MONTH_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// "2:45 p.m. CT", "11 a.m. CT", "11:30 AM (CDT)" with a matching payload date
// "2026-09-05T14:45:00" -> the school's local wall clock. TBA/TBD has no time.
export function sidearmStartTime(date,time){
  const d=String(date||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  const t=String(time||'').match(/^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?=[\s(]|$)/i);
  if(!d||!t)return null;
  const hour=Number(t[1])%12+(t[3].toLowerCase()==='p'?12:0),minute=Number(t[2]||0);
  if(hour!==Number(d[4])||minute!==Number(d[5]))return null;
  const month=Number(d[2]),day=Number(d[3]);
  return{start_time:`${d[1]}-${d[2]}-${d[3]}T${d[4]}:${d[5]}:00.000Z`,display_time:`${MONTH_ABBR[month-1]} ${day}, ${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`};
}

// "7th/16", "9th out of 12 teams", "T3rd of 10" -> "7th of 16". No score is
// added when the schedule publishes only the placing.
export function sidearmPlacing(value){
  const m=String(value||'').trim().match(/^(T-?)?(\d+)(st|nd|rd|th)\s*(?:\/|of|out of)\s*(\d+)(?:\s+teams)?\.?$/i);
  return m?`${m[1]?'T':''}${m[2]}${m[3].toLowerCase()} of ${m[4]}`:null;
}

// Apply the page data to one school's parsed events, matched by date and
// opponent. Each part applies only to the sports the school module lists:
// resultSports (W/L headline, one Result row, exact /news/ recap),
// placingSports (meet placing in K-State's wording) and timeSports
// (published start times). Anything ambiguous or unmatched is unchanged.
export function createScheduleDataEnricher({schoolId,host,slug,resultSports=new Set(),placingSports=new Set(),timeSports=new Set()}){
  const officialPath=url=>{
    try{const u=new URL(url);return u.protocol==='https:'&&u.hostname===host?u.pathname:null;}catch{return null;}
  };
  return function enrichScheduleEvents(events,raw,school,sport,sourceUrl){
    const enabled=resultSports.has(sport)||placingSports.has(sport)||timeSports.has(sport);
    const games=school?.id===schoolId&&enabled&&officialPath(sourceUrl)?sidearmScheduleGames(raw):[];
    if(!games.length)return events;
    for(const event of events){
      if(event.school_id!==schoolId)continue;
      const day=String(event.start_time||'').slice(0,10),opponent=slug(event.opponent||'');
      const matches=games.filter(game=>game.date.slice(0,10)===day&&slug(game.opponent.title||'')===opponent);
      if(matches.length!==1)continue;
      if(event.status!=='Final'){
        const start=timeSports.has(sport)?sidearmStartTime(matches[0].date,matches[0].time):null;
        if(start)Object.assign(event,start);
        continue;
      }
      const result=matches[0].result||{};
      if(placingSports.has(sport)&&event.event_type==='MEET'){
        const placing=sidearmPlacing(result.prescore_info);
        if(placing){event.headline=placing;event.results=[{label:'Result',value:placing}];event.result_count=1;}
        continue;
      }
      if(event.event_type!=='GAME'||!resultSports.has(sport))continue;
      const outcome=String(result.status||'').toUpperCase();
      const team=String(result.team_score??'').trim(),other=String(result.opponent_score??'').trim();
      if(!['W','L','T'].includes(outcome)||!/^\d+$/.test(team)||!/^\d+$/.test(other))continue;
      event.school_score=team;event.opponent_score=other;
      event.headline=`${outcome}, ${team}-${other}`;
      event.results=[{label:'Result',value:event.headline}];event.result_count=1;
      const recap=result.recap?.url;
      if(typeof recap==='string'){
        try{const url=new URL(recap,sourceUrl);if(url.hostname===host&&url.pathname.startsWith('/news/'))event.recap_url=url.href;}catch{}
      }
    }
    return events;
  };
}
