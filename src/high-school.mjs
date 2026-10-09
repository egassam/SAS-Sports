// High school schedules and scores (user, October 9: "Let's do some
// highschool ... we will start with Kansas, and just the 6A for now").
//
// Two sources per school, chosen by the user ("Calendar + MaxPreps"):
// - the school's own calendar (ParentSquare Smart Sites publish it as JSON at
//   /api/calendars/<id>/events): the official schedule, every varsity game
//   and meet with its date, time, opponent and HOME/AWAY;
// - MaxPreps team schedules: the final scores the coaches report, whether the
//   game counted in the league, the game page and its box score.
// High school athletes are minors: no featured athletes or social links
// (user, October 9: "No athletes for HS").
//
// MaxPreps serves each schedule's contests as compact arrays inside
// __NEXT_DATA__. Fields are found by their shape, not their position: the
// team rows (by school id), the game page (/game/), the contest date, and the
// one-line summary ("On 9/18, the Manhattan varsity football team won ...").

const decode=s=>String(s??'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const clean=s=>decode(s).replace(/\s+/g,' ').trim();
export const nameKey=s=>clean(s).toLowerCase().replace(/\(.*?\)/g,' ').replace(/\b(?:high school|hs|hs\.|varsity)\b/g,' ').replace(/\bst\.?\s/g,'saint ').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const ISO_LOCAL=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/;

// One calendar entry: "MHS Varsity Football - Junction City - AWAY".
// Returns the team ("Varsity Football"), what follows it (an opponent or an
// event name such as "Manhattan Invite") and the site.
export function parseCalendarTitle(title,prefix){
  let s=clean(title);
  if(!s.toLowerCase().startsWith(prefix.toLowerCase()+' '))return null;
  s=s.slice(prefix.length).trim();
  let site=null;
  const siteMatch=s.match(/\s*-\s*(HOME|AWAY|NEUTRAL)\s*$/i);
  if(siteMatch){site=siteMatch[1].toUpperCase();s=s.slice(0,siteMatch.index).trim();}
  const dash=s.match(/^(.+?)\s*-\s*(.+)$/);
  if(!dash)return null;
  return{team:dash[1].trim(),name:dash[2].trim(),site};
}

// Calendar events for one varsity team (team: a RegExp on the team words).
export function calendarEvents(payload,{prefix,team}){
  const events=(payload?.data?.events||payload?.events||[]);
  const out=[];
  for(const e of events){
    const parsed=parseCalendarTitle(e.title,prefix);
    if(!parsed||!team.test(parsed.team))continue;
    const date=String(e.start_date||'').slice(0,10);if(!/^\d{4}-\d\d-\d\d$/.test(date))continue;
    const time=e.all_day?null:String(e.start_time||'').slice(0,5)||null;
    const endDate=String(e.end_date||'').slice(0,10);
    out.push({date,time,end_date:endDate&&endDate>date?endDate:null,name:parsed.name,site:parsed.site,address:clean(e.address)||null,calendar_id:e.id||null});
  }
  return out;
}

// A calendar name that is an event, not an opponent: tournaments, invitationals,
// league and state rounds, multi-team days ("MHS TRI", "Manhattan Quad").
export function isNamedEvent(name){
  return /\b(?:invit(?:e|ational)?|tourn(?:ament|\.)?|classic|festival|regionals?|sub-?state|state|league|quad|tri|triangular|dual|meet|relays|showcase|jamboree|scrimmage|centennial|championships?)\b/i.test(name);
}

function nextData(html){
  const m=String(html||'').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if(!m)return null;
  try{return JSON.parse(m[1])}catch{return null}
}
const isTeamRow=row=>Array.isArray(row)&&typeof row[1]==='string'&&row.some(x=>typeof x==='string'&&/^https:\/\/www\.maxpreps\.com\/[a-z]{2}\//.test(x));
const teamName=row=>row.find((x,i)=>i>=13&&typeof x==='string'&&x&&!/^https?:/.test(x))||'';

// Contests on a MaxPreps team schedule page, from the school's side.
export function maxprepsContests(html,schoolId){
  const data=nextData(html),contests=data?.props?.pageProps?.contests;
  if(!Array.isArray(contests))return[];
  const out=[];
  for(const c of contests){
    if(!Array.isArray(c)||!Array.isArray(c[0]))continue;
    if(c.some(x=>typeof x==='string'&&/ContestState is Deleted/i.test(x)))continue;
    const teams=c[0].filter(isTeamRow),own=teams.find(t=>t[1]===schoolId),opp=teams.find(t=>t[1]!==schoolId);
    if(!own)continue;
    const dates=c.filter(x=>typeof x==='string'&&ISO_LOCAL.test(x));
    // The contest's own date follows its created/modified stamps.
    const start=dates.at(-1)||null;if(!start)continue;
    const gameUrl=c.find(x=>typeof x==='string'&&/^https:\/\/www\.maxpreps\.com\/[a-z]{2}\/[^/]+\/game\//.test(x))||null;
    const summary=c.find(x=>typeof x==='string'&&/^On \d{1,2}\/\d{1,2}, the /.test(x))||null;
    const stream=c.find(x=>typeof x==='string'&&/^https:\/\/www\.nfhsnetwork\.com\//.test(x))||null;
    const result=typeof own[5]==='string'&&/^[WLT]$/.test(own[5])?own[5]:null;
    const score=Number.isFinite(own[6])?own[6]:null,oppScore=opp&&Number.isFinite(opp[6])?opp[6]:null;
    // "won their away conference game"; "non-conference" is not.
    const conference=summary?/\b(?:home|away|neutral)?\s*conference\b/i.test(summary)&&!/non-conference/i.test(summary):null;
    const tournament=summary?/\btournament\b/i.test(summary):false;
    out.push({start,date:start.slice(0,10),time:start.slice(11,16)==='00:00'?null:start.slice(11,16),opponent:opp?clean(teamName(opp)):null,opponent_id:opp?.[1]||null,result,score,opponent_score:oppScore,game_url:gameUrl,summary,stream_url:stream,conference,tournament});
  }
  return out;
}

// A game page's box score: the period headings and each team's line.
export function maxprepsBoxScore(html){
  const table=String(html||'').match(/<table[^>]*data-testid="box-score-table"[^>]*>([\s\S]*?)<\/table>/);
  if(!table)return null;
  const rows=[...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(r=>[...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(c=>clean(c[1].replace(/<[^>]+>/g,' '))));
  if(rows.length<3)return null;
  const [head,...teams]=rows;
  const periods=head.slice(1);
  if(!periods.length||teams.some(t=>t.length!==head.length))return null;
  return{periods,teams:teams.map(t=>({name:t[0],scores:t.slice(1)}))};
}
