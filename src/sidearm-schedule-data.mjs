// SIDEARM (Nuxt) schedule pages embed every game as structured data in
// <script id="__NUXT_DATA__"> (a devalue-encoded array). The rendered game
// cards omit most of it: published W/L, recap links, golf placings and the
// local start time. School modules decide which sports use each part, after
// checking that sport against an official page.

// Decode the page data to plain game objects, each game once (a "next game"
// widget can repeat a game from the schedule).
export function sidearmScheduleGames(raw){
  const script=String(raw||'').match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!script)return classicScheduleGames(raw);
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

// The older SIDEARM schedule page (Utah State, Oct 19: "sidearm-schedule-game"
// rows, a Vue/knockout script) embeds the same game objects as plain JSON:
// `"games":[{"id":16753,"date":"2026-09-05T17:00:00",...,"opponent":{...},
// "result":{...}}]`. The array is cut out by bracket depth (strings skipped)
// and parsed; nothing is evaluated.
function classicScheduleGames(raw){
  // Only a schedule page (its `var schedule_id`): the site's other pages
  // carry a scoreboard widget with a "games" list too.
  const text=String(raw||'');
  if(!/\bvar\s+schedule_id\s*=\s*\d+/.test(text))return[];
  if(!text.includes('"games":['))return classicHtmlScheduleGames(text);
  for(let at=text.indexOf('"games":[');at>=0;at=text.indexOf('"games":[',at+9)){
    const start=at+8;let depth=0,inString=false,end=-1;
    for(let i=start;i<text.length&&i<start+5000000;i++){
      const c=text[i];
      if(inString){if(c==='\\')i++;else if(c==='"')inString=false;continue;}
      if(c==='"')inString=true;else if(c==='['||c==='{')depth++;else if(c===']'||c==='}'){depth--;if(!depth){end=i+1;break;}}
    }
    if(end<0)continue;
    let games;try{games=JSON.parse(text.slice(start,end));}catch{continue;}
    if(Array.isArray(games)&&games.every(g=>g&&typeof g==='object'&&typeof g.date==='string'&&'opponent' in g&&'result' in g))return games.filter(g=>g.opponent&&typeof g.opponent==='object');
  }
  return[];
}

// The same older page with no game data at all (Big Sky, Oct 21: Eastern
// Washington, Idaho State, Northern Arizona, Portland State, Southern Utah,
// Utah Tech): each game is only its rendered row, <li class="sidearm-schedule-game
// sidearm-schedule-<home|away|neutral>-game ...">. The row gives the day
// ("Aug 29 (Sat)", an "enddate" span " - Sep 15 (Tue)"), the published time
// ("2 pm", "6:30 PM MT", "TBA"), "at"/"vs", the opponent (rank first: "#24/25
// Northern Arizona"), the result spans ("L," "27-34"; a meet's "3rd of 10")
// and the recap link; a tournament is a "sidearm-schedule-tournament" block
// around its games. The year comes from the season heading ("2026 Football
// Schedule", in an h2, or an h1 at Portland State; "2026-27": July-December
// the first year). Rows become the page data's game objects, so every reader
// setting applies unchanged. A season used as a tournament block ("Indoor
// Season", "2026 Fall Schedule", "Fall Season") is no tournament; an
// opponent marked "(Exh.)", or a row whose promotion line reads
// "Exhibition" (Northern Arizona soccer vs Embry-Riddle, Aug 9), is an
// exhibition (type "S", as the page data types one).
const SEASON_BLOCK=/^(?:\d{4}(?:-\d{2,4})?\s+)?(?:fall|spring|winter|summer|indoor|outdoor)(?:\s+(?:season|schedule))?$/i;
const MONTH_INDEX={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const htmlText=html=>String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&#x27;|&rsquo;|’/gi,"'").replace(/&quot;/gi,'"').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g,' ').trim();
// The end of the element opened at `start` (nested elements of the same tag
// counted).
function elementEnd(text,start,tag){
  const pattern=new RegExp(`<${tag}\\b|</${tag}\\s*>`,'gi');pattern.lastIndex=start+1;
  let depth=1,match;
  while((match=pattern.exec(text))){
    if(match[0][1]==='/'){if(!--depth)return pattern.lastIndex;}else depth++;
  }
  return text.length;
}
// The first element whose class list starts with `name` (exactly that class).
// A promotion line that makes the game an exhibition.
const EXHIBITION_PROMOTION=/^(?:exhibition\b|exh\.?$|(?:pre-?season\s+)?friendly\b|scrimmage\b)/i;
function classBlock(html,name,tag='[a-z][a-z0-9]*'){
  const open=new RegExp(`<(${tag})\\b[^>]*\\bclass="${name}(?:\\s[^"]*)?"[^>]*>`,'i').exec(html);
  if(!open)return'';
  return html.slice(open.index,elementEnd(html,open.index,open[1]));
}
const spanTexts=html=>[...String(html||'').matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(m=>htmlText(m[1]));
export function classicHtmlScheduleGames(raw){
  const text=String(raw||'');
  const heading=htmlText(classBlock(text,'sidearm-schedule-title').match(/<h([12])\b[^>]*>([\s\S]*?)<\/h\1>/i)?.[2]||'');
  const season=heading.match(/\b(20\d{2})(?:\s*-\s*(\d{2,4}))?\b/);
  if(!season)return[];
  const firstYear=Number(season[1]),secondYear=season[2]?firstYear+1:firstYear;
  const dayOf=value=>{
    const m=String(value||'').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/i);
    if(!m)return null;
    const month=MONTH_INDEX[m[1].toLowerCase()],year=month>=7?firstYear:secondYear;
    return`${year}-${String(month).padStart(2,'0')}-${String(Number(m[2])).padStart(2,'0')}`;
  };
  // Tournament blocks: [start, end, title].
  const tournaments=[];
  for(const m of text.matchAll(/<div\b[^>]*class="sidearm-schedule-tournament\b[^"]*"[^>]*>/gi)){
    const end=elementEnd(text,m.index,'div'),block=text.slice(m.index,end);
    const title=htmlText((block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)||[])[1]||'');
    if(title&&!SEASON_BLOCK.test(title))tournaments.push([m.index,end,title]);
  }
  const games=[],seen=new Set();
  for(const m of text.matchAll(/<li\b[^>]*class="sidearm-schedule-game\s([^"]*)"[^>]*>/gi)){
    const row=text.slice(m.index,elementEnd(text,m.index,'li')),classes=` ${m[1]} `;
    const id=(m[0].match(/data-game-id="(\d+)"/)||[])[1]||null;
    if(id&&seen.has(id))continue;
    const dates=classBlock(row,'sidearm-schedule-game-opponent-date');
    const firstDay=dayOf(spanTexts(dates)[0]||htmlText(dates));
    if(!firstDay)continue;
    const endText=htmlText((dates.match(/<span\b[^>]*class="enddate"[^>]*>([\s\S]*?)<\/span>/i)||[])[1]||'');
    const lastDay=endText?dayOf(endText):null;
    const timeText=htmlText(classBlock(row,'sidearm-schedule-game-time'))||spanTexts(dates).find(t=>/^\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?\b|^TB[AD]\b/i.test(t))||'';
    const clock=timeText.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i);
    const hour=clock?Number(clock[1])%12+(clock[3].toLowerCase()==='p'?12:0):0,minute=clock?Number(clock[2]||0):0;
    const opponent=htmlText(classBlock(row,'sidearm-schedule-game-opponent-name'));
    if(!opponent)continue;
    const atVs=htmlText((row.match(/<span\b[^>]*class="sidearm-schedule-game-(?:away|home)"[^>]*>([\s\S]*?)<\/span>/i)||[])[1]||'').toLowerCase();
    const parts=spanTexts(classBlock(row,'sidearm-schedule-game-result')).filter(Boolean);
    const statusAt=parts.findIndex(t=>/^[WLT],?$/i.test(t)),scoreAt=parts.findIndex(t=>/^\d+\s*-\s*\d+$/.test(t));
    const score=scoreAt>=0?parts[scoreAt].split('-').map(s=>s.trim()):['',''];
    const known=statusAt>=0&&scoreAt>statusAt;
    const result={status:known?parts[statusAt].replace(',','').toUpperCase():'',team_score:known?score[0]:'',opponent_score:known?score[1]:'',
      prescore_info:known?parts.slice(0,statusAt).join(' '):parts.join(' '),postscore_info:known?parts.slice(scoreAt+1).join(' '):''};
    const recap=(row.match(/<li\b[^>]*class="sidearm-schedule-game-links-recap[^"]*"[^>]*>\s*<a\b[^>]*href="([^"]+)"/i)||[])[1];
    if(recap)result.recap={url:recap.replace(/&amp;/g,'&')};
    const tournament=tournaments.find(([start,end])=>m.index>start&&m.index<end);
    const noplay=/^(?:cancel+ed|postponed)\b/i.test(result.prescore_info)?result.prescore_info:'';
    // The row's promotion line: "Exhibition"; "Pre-Season Friendly / Gaucho
    // Soccer Camp Night" (UCSB men's soccer vs LMU, Aug 14, out of the
    // published 8-3-4); "Pac-12 Crossover" (src/conference-games.mjs).
    const promotion=htmlText(classBlock(row,'sidearm-schedule-game-promotion-name')||classBlock(row,'sidearm-schedule-game-opponent-promotion'));
    if(id)seen.add(id);
    games.push({id:id?Number(id):null,date:`${firstDay}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`,
      enddate:lastDay&&lastDay>firstDay?`${lastDay}T00:00:00`:null,time:clock?`${hour%12||12}:${String(minute).padStart(2,'0')} ${hour>=12?'PM':'AM'}`:(timeText.match(/^TB[AD]/i)||[''])[0].toUpperCase(),
      location_indicator:/\ssidearm-schedule-home-game\s/.test(classes)?'H':/\ssidearm-schedule-away-game\s/.test(classes)?'A':/\ssidearm-schedule-neutral-game\s/.test(classes)?'N':'',
      at_vs:atVs==='at'?'at':'vs',opponent:{title:opponent},tournament:tournament?{title:tournament[2]}:null,
      result,noplay_text:noplay,type:/\sexhibition\s/i.test(classes)||/\((?:exh\.?|exhibition)\)\s*$/i.test(opponent)||EXHIBITION_PROMOTION.test(promotion)?'S':'',conference:/<span\b[^>]*class="sidearm-schedule-game-conference[\s"][^>]*>\s*[^<\s]/.test(row),
        // The row's promotion line ("Pac-12 Crossover", Utah Valley men's
        // soccer at Cal Poly, Oct 14: a series with another league).
        promotion});
  }
  return games;
}
