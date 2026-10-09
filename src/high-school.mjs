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
export function calendarEvents(payload,{prefix,team,parse=null}){
  const events=(payload?.data?.events||payload?.events||[]);
  const out=[];
  for(const e of events){
    const parsed=parse?parse(e.title):parseCalendarTitle(e.title,prefix);
    if(!parsed||!team.test(parsed.team))continue;
    const date=String(e.start_date||'').slice(0,10);if(!/^\d{4}-\d\d-\d\d$/.test(date))continue;
    // Midnight is the calendar's "no time set".
    const clock=String(e.start_time||'').slice(0,5),time=e.all_day||!clock||clock==='00:00'?null:clock;
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
    const gameUrl=c.find(x=>typeof x==='string'&&/^https:\/\/www\.maxpreps\.com\/[a-z]{2}\/[^/]+\/(?:game|match)\//.test(x))||null;
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

// Two names for one school: "Wichita North" and "North", "Topeka High" and
// "Topeka" (every word of one is in the other). "Blue Valley West" and
// "Blue Valley Northwest" are different schools.
export function namesCompatible(a,b){
  const x=nameKey(a).split(' ').filter(w=>w!=='high'),y=nameKey(b).split(' ').filter(w=>w!=='high');
  if(!x.length||!y.length)return false;
  const xs=new Set(x),ys=new Set(y);
  return x.every(w=>ys.has(w))||y.every(w=>xs.has(w));
}

// TennisReporting (user, October 9: "Try this site for high school tennis"):
// KSHSAA regionals, state and some invitationals publish their brackets
// there, live. Its public site reads api.tennisreporting.com: the event list
// (POST /events), an event's divisions and host sites (GET /event/<id>), the
// schools at a host (GET /event/<id>/host/<host>/schools), each draw
// (POST /event/<id>/host/<host>/bracket/get) and its seeded players with
// names (POST /event/<id>/seed_list_by_params).
export const TENNIS_REPORTING='https://api.tennisreporting.com/';
export function tennisReportingEvents(payload,{stateId,genderId,date}){
  return(payload?.rows||[]).filter(e=>e.stateId===stateId&&e.genderId===genderId&&String(e.dateEventStart||'').slice(0,10)===date&&!e.isNotVarsity&&!/^JV\b|\bJV-/i.test(e.name||'')).map(e=>({id:e.id,name:clean(e.name),state:!!e.isStateTournament||/state championship/i.test(e.name||'')}));
}
export const tennisHosts=event=>(event?.divisions||[]).flatMap(d=>(d.hosts||[]).map(h=>({division:clean(d.name),id:h.id,name:clean(h.name)})));
const roundName=(round,draw)=>{const left=draw/2**(round-1);return left===2?'Final':left===4?'Semifinal':left===8?'Quarterfinal':`Round of ${left}`;};
// The school's matches in one draw (Singles or Doubles), from its side.
export function tennisMatches({bracket,seeds,matchType,school}){
  const players=new Map();
  for(const seed of seeds||[])for(const p of seed.players||[])players.set(p.playerId,{name:clean(`${p.player?.firstName||''} ${p.player?.lastName||''}`),school:clean(p.player?.school?.name),seed:seed.seed,placement:p.winnerReportPlacement||null,qualified:!!p.isQualified});
  const config=bracket?.configuration,draw=Number(config?.bracketType)||16,out=[];
  for(const item of config?.bracketItems||[]){
    const sides=(item.teams||[]).map(team=>({winner:!!team.isWinner,players:(team.items||[]).map(x=>players.get(x.id)).filter(Boolean)}));
    // Both sides when two of the school's entries meet.
    for(const ours of [0,1]){
    const us=sides[ours],them=sides[1-ours];
    if(!us?.players.length||!us.players.every(p=>p.school===school)||!them?.players.length)continue;
    // Scores are written winner first ("6 - 2"); a loss reads from our side.
    const sets=(item.score||[]).map(s=>clean(s).replace(/\s*-\s*/,'-')).filter(Boolean);
    const done=us.winner||them.winner;
    const fromUs=sets.map(s=>us.winner?s:s.split('-').reverse().join('-'));
    out.push({matchType,round:item.round,round_name:roundName(item.round,draw),players:us.players.map(p=>p.name),seed:us.players[0]?.seed??null,opponents:them.players.map(p=>p.name),opponent_school:them.players[0]?.school||null,won:done?us.winner:null,score:done?fromUs.join(', '):null,placement:us.players[0]?.placement||null,qualified:us.players.every(p=>p.qualified)});
    }
  }
  return out.sort((a,b)=>a.round-b.round);
}
// Team standings from the draws' team points (one row per player entry).
export function tennisTeamStanding(teamPoints,school){
  const teams=new Map();
  for(const row of teamPoints||[]){const name=clean(row.teamName);teams.set(name,(teams.get(name)||0)+Number(row.points||0));}
  if(!teams.has(school))return null;
  const points=teams.get(school),ranked=[...teams.values()].sort((a,b)=>b-a);
  return{points,place:ranked.indexOf(points)+1,teams:teams.size,tied:ranked.filter(p=>p===points).length>1};
}

// Middle school calendars (user, October 9: "let's add the Manhattan area
// middle schools as well") are typed by hand: "7th VB @SH", "8th Football vs.
// Junction City", "7th Girls BB League Tournament 2nd Round @ AMS",
// "Cross Country @ HOME", "Boys Wrestling @ Fort Riley". The team reads
// "<grade> [Boys|Girls] <sport>" or "[Boys|Girls] <sport>"; B-team days,
// scrimmages, tryouts, practices and pictures are not games.
const MS_SPORTS={vb:'Volleyball',volleyball:'Volleyball',fb:'Football',football:'Football',bb:'Basketball',basketball:'Basketball','cross country':'Cross Country',wrestling:'Wrestling',track:'Track & Field'};
export function expandAbbreviations(text,abbreviations={}){
  return clean(text).replace(/\b[A-Z]{2,5}\b/g,word=>abbreviations[word]||word).replace(/\s*\/\s*/g,' / ');
}
export function parseMiddleSchoolTitle(title,{abbreviations={}}={}){
  const s=clean(title);
  if(/scrimmage|picture|tryout|practice|parent|\bbegin|\bJV\b|\bB[- ]?Team\b|\bB Tourn/i.test(s))return null;
  let m=s.match(/^(7th|8th|8h)(?:\s+grade)?\s+(?:(Boys|Girls)\s+)?(VB|Volleyball|FB|Football|BB|Basketball)\b\s*(.*)$/i),grade=null,gender=null,sport,rest;
  if(m){grade=m[1].toLowerCase()==='8h'?'8th':m[1].toLowerCase();gender=m[2]||null;sport=MS_SPORTS[m[3].toLowerCase()];rest=m[4];}
  else{m=s.match(/^(?:(Boys|Girls)\s+)?(Cross Country|Wrestling|Track)\b\s*(.*)$/i);if(!m)return null;gender=m[1]||null;sport=MS_SPORTS[m[2].toLowerCase()];rest=m[3];}
  gender=gender&&gender[0].toUpperCase()+gender.slice(1).toLowerCase();
  const team=[grade,gender,sport].filter(Boolean).join(' ');
  rest=rest.trim();if(!rest)return null;
  let site=null,name;
  const versus=rest.match(/^(?:vs\.?|versus)\s*(.+)$/i),away=rest.match(/^(?:@|at)\s*(.+)$/i);
  if(versus){site='HOME';name=versus[1];}
  else if(away){const place=away[1];if(/^home\b/i.test(place)){site='HOME';name=place.replace(/^home\s*/i,'')||'Home';}else{site='AWAY';name=place;}}
  else{
    // "League Tournament @ Junction City", "Home Triangular",
    // "League Tournament 1st Round".
    const at=rest.match(/^(.*?)\s*(?:@|\bat\b)\s*(.+)$/i);
    if(at){site=/^home$/i.test(at[2])?'HOME':'AWAY';name=site==='HOME'?at[1]:`${expandAbbreviations(at[2],abbreviations)} ${at[1]}`;}
    else{site=/^home\b/i.test(rest)?'HOME':null;name=rest.replace(/^home\s+/i,'');}
  }
  // A second "@" names the venue: "@ Washburn Rural @ Washburn Rural North".
  name=expandAbbreviations(name.replace(/\s*@.*$/,''),abbreviations).replace(/\s+(?:inv\.?)$/i,' Invitational').trim();
  // "Cross Country @ HOME": a home meet with no opponent named.
  if(/^home$/i.test(name))name='Home event';
  return name?{team,name,site}:null;
}
