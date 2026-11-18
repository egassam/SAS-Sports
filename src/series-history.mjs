// Rivalry and series history (user, November 18, 2026: item 3 of "What
// unique things should we add now?", "Start with 2 then work your way through
// the rest"): a college game's all-time series with its opponent, the current
// streak, the last ten, and the last meetings.
//
// Source: the school's own SIDEARM "Opponent History" page
// (`/sports/<sport>/opponent-history`). Its `__NUXT_DATA__` (a flat array
// whose objects point at values by index) holds one record per opponent the
// program has played: `opponentName`, `allTotalRecords` {wins, losses, ties},
// `currentStreak`, `lastTenGameRecords`, and every game (`results`:
// gameDate, resultStatus W/L/T, teamScore, opponentScore,
// gameLocationIndicator H/A/N). K-State football, Nov 18, 2026: 142
// opponents, 1,489 games; Kansas: 124 games since 1902, 55-64-5, 18 straight
// wins. Not every SIDEARM site publishes the page (Missouri and Nebraska
// answered 404); the series is shown where it is.

export const SERIES_MS=24*3600e3,SERIES_LAST=5;
export const seriesKey=(school,sport)=>`series:v1:${school}|${sport}`;
// The history page next to a roster or schedule page.
export const opponentHistoryUrl=url=>String(url||'').replace(/\/(?:roster|schedule)(?:\/.*)?$/,'/opponent-history');

const record=r=>r&&typeof r==='object'?{wins:Number(r.wins)||0,losses:Number(r.losses)||0,ties:Number(r.ties)||0}:{wins:0,losses:0,ties:0};
// Every opponent on the page: the all-time record, streak, last ten and the
// last meetings (newest first).
export function parseOpponentHistory(html){
  const m=String(html||'').match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);if(!m)return[];
  let data;try{data=JSON.parse(m[1])}catch{return[]}
  const at=v=>typeof v==='number'&&v>=0&&v<data.length?data[v]:v;
  const obj=v=>{const o=at(v);if(!o||typeof o!=='object'||Array.isArray(o))return null;const out={};for(const [k,x] of Object.entries(o))out[k]=at(x);return out};
  const out=[];
  for(const raw of data){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!('opponentName' in raw)||!('allTotalRecords' in raw))continue;
    const name=String(at(raw.opponentName)||'').trim();if(!name)continue;
    const games=(at(raw.results)||[]).map(obj).filter(g=>g&&g.gameDate).map(g=>({date:String(g.gameDate).slice(0,10),result:String(g.resultStatus||'').toUpperCase().slice(0,1)||null,us:g.teamScore!=null&&g.teamScore!==''?String(g.teamScore):null,them:g.opponentScore!=null&&g.opponentScore!==''?String(g.opponentScore):null,site:{H:'home',A:'away',N:'neutral'}[String(g.gameLocationIndicator||'').toUpperCase()]||null}))
      .sort((a,b)=>b.date.localeCompare(a.date));
    const total=record(obj(raw.allTotalRecords)),streak=record(obj(raw.currentStreak));
    out.push({name,record:total,streak,last10:record(obj(raw.lastTenGameRecords)),games:games.length,first:games.at(-1)?.date||null,last:games.slice(0,SERIES_LAST)});
  }
  return out;
}

// "University of Kansas", "Kansas" and "KU": the opponent's names without
// "University", "The" and punctuation.
export const seriesNameKey=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/\bthe\b/g,' ')
  .replace(/^\s*university of\s+/,'').replace(/\s+university\s*$/,'').replace(/\buniv\.?\b/g,' ')
  .replace(/\bst\.?(?=\s|$)/g,'state').replace(/[^a-z0-9]+/g,' ').trim();
// The opponent's series: an exact name match only ("Kansas" is never "Kansas
// State"), by the opponent's catalog names when it is a school the app has.
export function seriesFor(entries,names){
  const keys=new Set((names||[]).filter(Boolean).map(seriesNameKey).filter(Boolean));
  return(entries||[]).find(e=>keys.has(seriesNameKey(e.name)))||null;
}

// The line a card shows, from the school's side: "Kansas leads 64-55-5",
// "K-State has won 18 straight", "Last 10: 10-0".
export function seriesSummary(entry,{school='',opponent=''}={}){
  if(!entry)return null;
  const r=entry.record,played=r.wins+r.losses+r.ties;if(!played)return null;
  const score=(a,b,t)=>`${a}-${b}${t?`-${t}`:''}`;
  const lead=r.wins>r.losses?`${school} leads ${score(r.wins,r.losses,r.ties)}`:r.losses>r.wins?`${opponent} leads ${score(r.losses,r.wins,r.ties)}`:`Series tied ${score(r.wins,r.losses,r.ties)}`;
  const s=entry.streak,streak=s.wins>1?`${school} has won ${s.wins} straight`:s.losses>1?`${opponent} has won ${s.losses} straight`:s.wins===1?`${school} won the last meeting`:s.losses===1?`${opponent} won the last meeting`:null;
  const l=entry.last10,tenPlayed=l.wins+l.losses+l.ties;
  return{record:lead,streak,last10:tenPlayed>=10?`Last 10: ${score(l.wins,l.losses,l.ties)}`:null,games:entry.games,since:entry.first?Number(entry.first.slice(0,4)):null,last:entry.last};
}
