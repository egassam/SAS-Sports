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
const localParts=(iso,timeZone)=>{
  try{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));return{date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};}catch{return null}
};
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
export function calendarEvents(payload,{prefix,team,parse=null,timeZone=null}){
  const events=(payload?.data?.events||payload?.events||[]);
  const out=[];
  for(const e of events){
    const parsed=parse?parse(e.title):parseCalendarTitle(e.title,prefix);
    if(!parsed||!team.test(parsed.team))continue;
    // A calendar fed from Google in UTC (Manhattan Catholic's) gives UTC
    // dates and times: they are read in the school's zone.
    const local=!e.all_day&&/^utc$/i.test(e.timezone||'')&&timeZone&&e.start_datetime?localParts(e.start_datetime,timeZone):null;
    const date=local?.date||String(e.start_date||'').slice(0,10);if(!/^\d{4}-\d\d-\d\d$/.test(date))continue;
    // Midnight is the calendar's "no time set".
    const clock=local?.time||String(e.start_time||'').slice(0,5),time=e.all_day||!clock||clock==='00:00'?null:clock;
    const endDate=String(e.end_date||'').slice(0,10);
    out.push({date,time,end_date:endDate&&endDate>date?endDate:null,name:parsed.name,site:parsed.site,address:clean(e.address)||null,calendar_id:e.id||null});
  }
  return out;
}

// A calendar name that is an event, not an opponent: tournaments, invitationals,
// league and state rounds, multi-team days ("MHS TRI", "Manhattan Quad").
export function isNamedEvent(name){
  return /\b(?:invit(?:e|ational)?|tourn(?:ament|\.)?|classic|festival|regionals?|sectionals?|playoffs?|sub-?state|state|league|quad|tri|triangular|duals?|meet|relays|showcase|jamboree|scrimmage|centennial|championships?)\b/i.test(name);
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

// MeetPro results (user, October 10: "Here is where my timer puts the cross
// country races": bit.ly/LetsGoRunMHK, LetsGoRun Timing). Each meet is a
// static page at results.tfmeetpro.com/LetsGoRun_Timing/<folder>/ with one
// section per race: its team standings (td.team-place, td.team,
// td.team-score) and individual results (td.place, td.athlete, td.year,
// td.ath-team, td.time). The timer's race-results page links most meets.
const cell=(row,name)=>{const m=row.match(new RegExp(`<td class="${name}"[^>]*>([\\s\\S]*?)</td>`));return m?clean(m[1].replace(/<[^>]+>/g,' ')):null;};
const displayName=name=>{const m=String(name||'').match(/^([^,]+),\s*(.+)$/);const fix=s=>s.toLowerCase().replace(/(^|[\s'-])([a-z])/g,(_,a,b)=>a+b.toUpperCase());return m?`${fix(m[2])} ${fix(m[1])}`:fix(name);};
export function meetProDate(html){
  const m=clean(String(html||'').replace(/<[^>]+>/g,' ')).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:null;
}
export function meetProName(html){const m=String(html||'').match(/<h\d[^>]*>\s*([^<]*?\d{4}[^<]*?)\s*<\/h\d>/)||String(html||'').match(/<title>([^<]*)<\/title>/);return m?clean(m[1]):null;}
export function meetProLinks(html,prefix='LetsGoRun_Timing'){
  return[...new Set([...String(html||'').matchAll(new RegExp(`https?://results\\.tfmeetpro\\.com/${prefix}/([^"'/<>\\s]+)/?`,'g'))].map(m=>m[1]))];
}
// One school, as meets write it: "Anthony", "Anthony Middle School",
// "Anthony7G" (Fort Riley adds the grade and gender to the team).
export const meetProTeam=name=>nameKey(String(name||'').replace(/\d+\s*[BG]$/i,'')).replace(/\b(?:middle school|middle|ms|junior high|jh)\b/g,' ').replace(/\s+/g,' ').trim();
// The school's races at one meet: team place and its runners.
export function meetProResults(html,team){
  const ours=meetProTeam(team),isOurs=name=>meetProTeam(name)===ours;
  const races=[];
  for(const section of String(html||'').split(/<section id="event\d+"/).slice(1)){
    const header=[...section.matchAll(/<p class="bold-cell">([\s\S]*?)<\/p>/g)].map(m=>clean(m[1]));
    const name=header.find(h=>!/^Race #/i.test(h))||header[0]||'';
    const teamRows=[...section.matchAll(/<tr>(?=<td class="team-place")([\s\S]*?)<\/tr>/g)].map(m=>m[1]);
    const teams=teamRows.map(r=>({place:Number(cell(r,'team-place')),team:cell(r,'team'),score:cell(r,'team-score')}));
    const runners=[...section.matchAll(/<tr>(?=<td class="place")([\s\S]*?)<\/tr>/g)].map(m=>m[1]).map(r=>({place:Number(cell(r,'place')),athlete:displayName(cell(r,'athlete')),year:cell(r,'year'),team:cell(r,'ath-team'),time:cell(r,'time')}));
    const mine=runners.filter(r=>isOurs(r.team));
    if(!mine.length)continue;
    races.push({race:name,team:teams.find(t=>isOurs(t.team))||null,teams:teams.length,runners:mine,field:runners.length});
  }
  return races;
}

// Track and field on MeetPro: the meet's index lists every event with a link
// to its results page (results_<id>.html) and, when the meet is scored, the
// team scores (div#scores: "7th Grade  Female Teams", "Class 3A/4A  Male
// Teams"). Each event page holds its rounds (prelims, then finals); a row
// gives place, athlete ("GEYER, Roman"), year, team and time or mark; a relay
// row gives the team, squad, time and its four runners.
// One school across meets: "Riley Co", "St. Mary's", "St Marys".
export const meetProTrackTeam=name=>meetProTeam(String(name||'').replace(/['’.]/g,'')).replace(/\bco\b/g,'county');
const TRACK_SEX=[[/^(?:girls|women'?s?|female)\b/i,'Girls'],[/^(?:boys|men'?s?|male)\b/i,'Boys'],[/^mixed\b/i,'Mixed']];
// A group for an event or a team table: "7th Girls", "Girls Class 3A/4A", "Boys".
export function meetProTrackGroup(sex,division){
  const d=clean(division),grade=d.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+grade\b/i);
  if(grade)return`${ORD(Number(grade[1]))} ${sex}`;
  const rest=d.replace(/\b(?:girls|boys|women'?s?|men'?s?|female|male)\b/gi,' ').replace(/\s+/g,' ').trim();
  return rest?`${sex} ${rest}`:sex;
}
const ORD=n=>`${n}${n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th'}`;
// "Boys 3200 Meters (7th Grade Boys)" → {sex:'Boys', event:'3200 Meters', division:'7th Grade Boys'}.
export function meetProTrackEventName(title){
  let t=clean(String(title||'').replace(/<[^>]+>/g,' ')).replace(/^#\d+\s+/,'').replace(/\s+Results$/i,''),division='';
  const paren=t.match(/\s*\(([^)]*)\)\s*$/);if(paren){division=paren[1];t=t.slice(0,paren.index);}
  // "7th Grade Girls Thrower's Relay (7th Grade)": the grade before the gender.
  const grade=t.match(/^(\d{1,2}(?:st|nd|rd|th)\s+grade)\s+/i);if(grade){t=t.slice(grade[0].length);division||=grade[1];}
  const sex=TRACK_SEX.find(([re])=>re.test(t));
  return{sex:sex?sex[1]:null,event:sex?t.replace(sex[0],'').trim():t,division:clean(division)};
}
export function meetProTrackIndex(html){
  const text=String(html||''),[main,scores='']=text.split(/<div id="scores">/);
  // Every event on the program; those with results link their page.
  const events=[];let scheduled=0;
  for(const m of main.matchAll(/<tr>([\s\S]*?)<\/tr>/g)){
    const name=cell(m[1],'event'),link=m[1].match(/href='(results_\d+\.html)/);
    if(name)scheduled++;
    if(name&&link&&!events.some(e=>e.page===link[1]))events.push({...meetProTrackEventName(name),title:name,page:link[1]});
  }
  const tables=[];
  for(const part of scores.split(/<h3 class="team-scores-hdr">/).slice(1)){
    const header=clean(part.slice(0,part.indexOf('</h3>')).replace(/<[^>]+>/g,' ')),m=header.match(/^(.*?)\s*\b(Female|Male|Mixed)\s+Teams$/i);
    if(!m)continue;
    const sex=TRACK_SEX.find(([re])=>re.test(m[2]))[1];
    const rows=[...part.matchAll(/<tr>(?=\s*<td class="place")([\s\S]*?)<\/tr>/g)].map(r=>({place:Number(cell(r[1],'place')),team:cell(r[1],'team'),points:cell(r[1],'points')})).filter(r=>r.place&&r.team);
    if(rows.length)tables.push({sex,division:m[1],group:meetProTrackGroup(sex,m[1]),rows});
  }
  return{name:(meetProName(text)||'').replace(/\s*\|\s*MeetPro\b.*$/i,''),date:meetProDate(text),events,scheduled,tables};
}
// The meet's live list (results.json, which the index polls every 5 s): each
// finished heat, latest first ("r" grows as heats finish). Pages by recency.
export function meetProTrackRecent(json){
  let list=json;if(typeof list==='string')try{list=JSON.parse(list)}catch{list=null}
  const latest=new Map();
  for(const h of Array.isArray(list)?list:[]){const page=`results_${h.event_id}.html`,r=Number(h.r)||0;if(!latest.has(page)||latest.get(page)<r)latest.set(page,r);}
  return[...latest].sort((a,b)=>b[1]-a[1]).map(([page])=>page);
}
// An event page: its final round (or the last round run) and every placed row.
export function meetProTrackEvent(html){
  const text=String(html||''),title=(text.match(/<h3 class="event-results-hdr">([\s\S]*?)<\/h3>/)||[])[1]||'';
  const rounds=text.split(/<h4 class="round-results-hdr">/).slice(1).map(r=>({name:clean(r.slice(0,r.indexOf('</h4>'))),body:r}));
  const round=rounds.find(r=>/^finals?$/i.test(r.name))||rounds.at(-1);
  const rows=[];
  if(round)for(const chunk of round.body.split(/<td class="place">/).slice(1)){
    const place=Number(clean(chunk.slice(0,chunk.indexOf('</td>'))));if(!place)continue;
    const row=`<td class="place">${chunk}`,relay=[1,2,3,4].map(n=>{const m=row.match(new RegExp(`<td class="relay-athlete-${n}"[^>]*>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`));return m?clean(m[1].replace(/<[^>]+>/g,' ')):null;}).filter(Boolean);
    const mark=cell(row,'time')||cell(row,'mark'),english=cell(row,'english');
    rows.push({place,athlete:cell(row,'athlete')?displayName(cell(row,'athlete')):null,year:cell(row,'year'),team:cell(row,'team'),squad:cell(row,'squad'),
      mark:/^\d+(?:\.\d+)?m$/i.test(mark||'')&&english?english:mark,points:cell(row,'points'),relay:relay.length?relay.map(n=>displayName(n)):null});
  }
  return{...meetProTrackEventName(title),round:round?.name||null,rows};
}

// --- Golf: Prep.Golf (ks.prep.golf), where Kansas coaches and KSHSAA post
// tournament results (user, October 21: "look for alternate websites for
// getting official results"). robots.txt allows every page.
export const PREP_GOLF='https://ks.prep.golf/';
const cellText=html=>clean(String(html||"").replace(/<[^>]+>/g," "));
const tableRows=html=>[...String(html||'').matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)].map(m=>({attrs:m[1],cells:[...m[2].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(c=>c[1])}));
const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
// The school page: each tournament of the season (girls, then boys), with the
// team's place and score: "4th", "687 (+111)".
export function prepGolfTournaments(html){
  const out=[],text=String(html||'');
  for(const gender of ['girls','boys']){
    const start=text.indexOf(`x-show="tab === '${gender}'"`);if(start<0)continue;
    const end=text.indexOf('</table>',start);
    for(const row of tableRows(text.slice(start,end))){
      if(row.cells.length<6)continue;
      const link=row.cells[0].match(/tournaments\/results\/(\d+)/);if(!link)continue;
      const [name,date,course,type,place,score]=row.cells.map(cellText);
      const d=date.match(/^([A-Za-z]{3})\w*\s+(\d{1,2})$/);if(!d)continue;
      out.push({gender:gender==='girls'?'Girls':'Boys',id:link[1],name:name.replace(/\s*[✓!]\s*$/,'').trim(),month:MONTHS[d[1].toLowerCase()],day:Number(d[2]),course,type,place:/^\d+(?:st|nd|rd|th)$/i.test(place.replace(/^\D+/,''))?place.replace(/^\D+/,''):null,score:/^\d/.test(score)?score:null});
    }
  }
  return out;
}
// A tournament's results page: the team table (place, team, score; teams
// short of four players have no score) and the individual table (place,
// player, school code, rounds, total, to par).
export function prepGolfResults(html){
  const text=String(html||''),teams=[],players=[];
  const teamStart=text.indexOf('Team Results'),teamEnd=teamStart<0?-1:text.indexOf('</table>',teamStart);
  if(teamStart>=0)for(const row of tableRows(text.slice(teamStart,teamEnd))){
    const cells=row.cells.map(cellText);if(cells.length<3)continue;
    const m=cells[1].match(/^(.*?)\s+-\s+(.+)$/);if(!m)continue;
    const place=Number(cells[0].replace(/\D+/g,''))||null,score=Number(cells.at(-1))||null;
    teams.push({place,name:m[1].replace(/^👑\s*/,'').trim(),squad:m[2].replace(/\s*Not enough players.*$/i,'').trim(),score:place?score:null});
  }
  const indStart=text.indexOf('individualResultsTable-desktop'),indEnd=indStart<0?-1:text.indexOf('</table>',indStart);
  if(indStart>=0)for(const row of tableRows(text.slice(indStart,indEnd))){
    const cells=row.cells.map(cellText);if(cells.length<5)continue;
    const place=cells[0].replace(/[^\dT]/g,'');
    // A "Q" badge after the name marks a state qualifier.
    const qualified=/\sQ$/.test(cells[1]);
    players.push({place:place||null,name:cells[1].replace(/\s+Q$/,''),qualified,school:(row.attrs.match(/data-school="([^"]+)"/)||[])[1]||cells[2],rounds:cells.slice(3,-2).filter(Boolean),total:cells.at(-2),to_par:cells.at(-1)});
  }
  return{teams,players};
}

// --- Bound (beta.gobound.com), the KSHSAA scheduling platform a school uses
// for its own schedule and tickets: finals the school enters itself (user,
// October 21: "Build the Bound fallback for missing scores"). Read only for
// what MaxPreps and the meet sources leave without a result. The school's
// scores list also holds other teams' matches at its tournaments: only
// events with the school's own team count. Times are UTC.
export const BOUND_API='https://beta.gobound.com/api/schools/';
const localDay=(iso,timeZone)=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso))}catch{return null}};
export function boundFinals(payload,{school,timeZone}){
  const out=[];
  for(const group of Array.isArray(payload)?payload:[])for(const e of group?.Events||[]){
    if(!e?.FinalFlag||!/^varsity$/i.test(e.LevelDisplay||''))continue;
    const teams=(e.Teams||[]).map(t=>({name:clean(t.Name),score:Number.isFinite(Number(t.Score))?Number(t.Score):null,own:t.HostSchoolID===school}));
    if(!teams.some(t=>t.own))continue;
    const date=localDay(e.StartDateTime,timeZone);if(!date)continue;
    out.push({act:clean(e.ActName),date,title:clean(group.Title),teams});
  }
  return out;
}
// A game: two teams, the school one of them, a score entered (0-0 is how an
// unentered game reads, so it is not taken).
export function boundGame(finals,{acts,date,opponent,compatible}){
  for(const f of finals){
    if(!acts.includes(f.act)||f.date!==date||f.teams.length!==2)continue;
    const own=f.teams.find(t=>t.own),other=f.teams.find(t=>!t.own);
    if(!own||!other||own.score==null||other.score==null||own.score+other.score===0)continue;
    if(opponent&&!compatible(opponent,other.name))continue;
    return{opponent:other.name,score:own.score,opponent_score:other.score,result:own.score>other.score?'W':own.score<other.score?'L':'T'};
  }
  return null;
}
// A meet: the school's place among the teams with a score (low wins for
// cross country and golf).
export function boundMeet(finals,{act,date,lowWins}){
  const f=finals.find(x=>x.act===act&&x.date===date);if(!f)return null;
  const scored=f.teams.filter(t=>t.score>0),own=scored.find(t=>t.own);if(!own||scored.length<2)return null;
  const place=1+scored.filter(t=>lowWins?t.score<own.score:t.score>own.score).length;
  return{place,teams:scored.length,score:own.score,tied:scored.filter(t=>t.score===own.score).length>1};
}

// --- Bound schedules (user, October 25: "add all of the middle schools and
// high schools of Riley county and Pottawatomie county"). Every school in the
// two counties keeps its schedule on Bound, the KSHSAA platform (Wamego's own
// calendar page links its Bound calendars; Riley County's and Rock Creek's
// sites answer robots with a challenge page). One read per act:
// GET /api/schools/<id>/events?startDate&endDate&includePractices=false&ticket=false&idAct=<act>
// gives the school year's events of that act with every team, level, home
// flag and the finals the schools enter. An act has one id for every Kansas
// school; events another state's host made carry that state's id (Onaga's own
// wrestling invite was entered under it), so those are read too.
export const BOUND_ACTS={
  Football:['h2024100707123073936cd04cd63fd48'],
  'Girls Flag Football':['h20250618033017340864ffa398feb48'],
  Volleyball:['h2024100202321791193779c86253c4e','h202405150543599258320581d524240'],
  'Boys Basketball':['h20241007070513021b77fd0a50c814d','h20190925080224747ba7e8df11e9342'],
  'Girls Basketball':['h20241007070423650c4e62159981b49','h20190925080127147db69125dded241'],
  'Boys Soccer':['h2025020308534307202abf33d368a48'],
  'Girls Soccer':['h2025020309364598301d4886357b049','h20240425070159426bfe6eb6fa6ba47'],
  Baseball:['h202502030933371773875566ab15045'],
  Softball:['h202502030938586433eb269c0813b4c'],
  'Boys Cross Country':['h20250203091835128ba63b5fefee34e'],
  'Girls Cross Country':['h20250203091712780574ccbd171854c'],
  'Boys Golf':['h20250203093456470c6ba2e3388d040'],
  'Girls Golf':['h20250203091922735c126968ae59340'],
  'Boys Tennis':['h202502030935470597d700d86a8304d'],
  'Girls Tennis':['h2025020309195800382ed4106308d45','h2024051505413073602a70be9463d49'],
  'Boys Track & Field':['h202410070706093727470fb6d3ca047'],
  'Girls Track & Field':['h2024042511433982474e23f5c1e0247'],
  'Boys Wrestling':['h20240426020928945c9acf126fade47','h2019092508051811671bd18c90f3f4d'],
  'Girls Wrestling':['h20240520120020666fd407ba14fec4f','h20240528042647438f458375a138041'],
  'Boys Swim & Dive':['h202502030938188603c9b78ae239440'],
  'Girls Swim & Dive':['h20250203093741419ebeeaaea4d334b'],
  'Boys Bowling':['h2025020309290453437b9dd49bc8547'],
  'Girls Bowling':['h2025020309282609707834e4a23b649'],
  'Unified Bowling':['h202502030923461926d26d4c97b4e40']
};
export const boundEventsUrl=(school,{start,end,act})=>`${BOUND_API}${school}/events?startDate=${start}&endDate=${end}&includePractices=false&ticket=false&idAct=${act}`;
const SPORT_WORDS=[['football',/\bfootball\b/i],['volleyball',/\bvolleyball\b/i],['basketball',/\bbasketball\b/i],['soccer',/\bsoccer\b/i],['baseball',/\bbaseball\b/i],['softball',/\bsoftball\b/i],['cross country',/\bcross country\b|\bxc\b/i],['golf',/\bgolf\b/i],['tennis',/\btennis\b/i],['track',/\btrack\b/i],['wrestling',/\bwrestling\b/i],['swim',/\bswim/i],['bowling',/\bbowling\b/i]];
function namesOtherSport(title,act){
  const named=SPORT_WORDS.filter(([,re])=>re.test(title)).map(([w])=>w);
  if(!named.length)return false;
  const own=SPORT_WORDS.filter(([,re])=>re.test(String(act||''))).map(([w])=>w);
  // "Flag Football" is football; a golf course or a track venue in a title is not a sport.
  return own.length>0&&!named.some(w=>own.includes(w))&&!(own.includes('cross country')&&named.every(w=>w==='golf'||w==='track'));
}
// Titles Bound gives an event whose host typed none ("Event") or a placeholder.
const GENERIC_TITLE=/^(?:(?:event|meet|game|match|tbd|tba|tournament|7th|8th|grade|varsity|jv|junior varsity|junior high|middle school|ms|hs|boys|girls|a|b|c|team|volleyball|football|basketball|cross country|golf|tennis|wrestling|track|field|&|and|soccer|baseball|softball|bowling)\s*)*$/i;
// The school's events of one act and level, as calendar entries: the date and
// time in the school's zone, the opponent (a game) or the event's name (a
// tournament or meet), HOME/AWAY from the home flags, the final the schools
// entered, and the event group (a tournament's matches share it).
export function boundSchedule(payloads,{school,acts,level,timeZone,noun='Meet'}){
  const ids=new Set(acts.flatMap(a=>BOUND_ACTS[a]||[])),seen=new Set(),out=[];
  for(const payload of payloads)for(const group of Array.isArray(payload)?payload:[])for(const e of group?.Events||[]){
    if(e?.RecordType!=='comp'||e.Status==='cancelled'||seen.has(e.RecordID))continue;
    if(!(ids.has(e.IDAct)||(e.IDActs||[]).some(id=>ids.has(id))))continue;
    if(!level.test(clean(e.LevelDisplay)))continue;
    const own=(e.Teams||[]).find(t=>t.HostSchoolID===school||(t.CoopSchoolIDs||[]).includes(school));if(!own)continue;
    // An event filed under the wrong act ("Flag Football Triangular" as
    // Wamego girls' wrestling, Sep 14): its title names another sport.
    if(namesOtherSport(`${group.Title||''} ${e.Title||''}`,e.ActName))continue;
    seen.add(e.RecordID);
    const start=localParts(e.StartDateTime,timeZone);if(!start)continue;
    const end=localParts(e.EndDateTime,timeZone);
    const others=(e.Teams||[]).filter(t=>t!==own);
    // Two teams make a game ("Clay Center vs Wamego"); a cross country "game"
    // is a meet entered as one (the caller decides by sport).
    const h2h=!!e.HeadToHeadFlag&&others.length===1;
    // A state or regional day lists the school alone, flagged home: where it
    // is played is not known (Bound's host says, when it names one).
    const home=others.length?own.HomeFlag||(!others.some(t=>t.HomeFlag)&&e.HostID===school):false;
    const site=home?'HOME':!others.length?null:others.some(t=>t.HomeFlag)||(e.HostID&&e.HostID!==school)?'AWAY':null;
    const groupTitle=clean(group.Title),title=clean(e.Title),venue=clean(e.VenueLocationsDisplay).split(',')[0].trim();
    const eventName=[groupTitle,title].find(t=>!GENERIC_TITLE.test(t)&&!/\bvs\.?\b/i.test(t))||(venue?`${venue} ${noun.toLowerCase()}`:noun);
    const score=n=>Number.isFinite(Number(n))?Number(n):null;
    const us=score(own.Score),them=h2h?score(others[0].Score):null;
    // 0-0 is how a game nobody entered reads.
    const final=e.FinalFlag&&h2h&&us!=null&&them!=null&&us+them>0?{result:us>them?'W':us<them?'L':'T',score:us,opponent_score:them}:null;
    out.push({date:start.date,time:start.time==='00:00'?null:start.time,end_date:end&&end.date>start.date?end.date:null,
      name:h2h?clean(others[0].Name):eventName,event_name:eventName,site,address:venue||null,h2h,
      group:group.IDEvent||e.IDEvent,record:e.RecordID,level:clean(e.LevelDisplay),act:clean(e.ActName),final,
      teams:(e.Teams||[]).map(t=>({name:clean(t.Name),score:score(t.Score),place:score(t.Place)||null,own:t===own})),
      final_flag:!!e.FinalFlag});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
}
// Bound lists placeholders beside the real entries: a state or sub-state day
// with only the school on it ("4A State Golf" on both days, "Sub-State
// Volleyball" next to "Sub State" at Paola), the same game twice (one with
// no time and no venue), a "Conway Springs vs Wamego" cross country entry on
// state day. One entry per day is kept for a meet; a game keeps every
// opponent once (a doubleheader keeps both games: two times).
export function boundDedupe(entries,{meet}){
  const days=new Map();
  for(const e of entries){const key=`${e.date}|${e.act.replace(/^(?:Boys|Girls) /,'')}`;if(!days.has(key))days.set(key,[]);days.get(key).push(e);}
  const out=[];
  for(const list of days.values()){
    if(meet){
      // A meet: the entry with the most teams (then a venue, then a time).
      const rank=e=>(e.h2h?0:1)*1000+e.teams.length*10+(e.address?2:0)+(e.time?1:0);
      const best=[...list].sort((a,b)=>rank(b)-rank(a))[0];
      out.push(best);continue;
    }
    // A tournament day: its group once, unless its matches are listed (each
    // match is then its own entry); one tournament entry per day at most.
    const tournaments=list.filter(e=>!e.h2h&&!list.some(x=>x.h2h&&x.group===e.group)).sort((a,b)=>b.teams.length-a.teams.length||(b.address?1:0)-(a.address?1:0));
    if(tournaments.length)out.push(tournaments[0]);
    for(const e of list.filter(x=>x.h2h)){
      const same=list.filter(x=>x.h2h&&namesCompatible(x.name,e.name));
      if(same.length>1){
        // The same game twice: keep the one with a time (a doubleheader has two).
        if(!e.time&&same.some(x=>x.time)){const timed=same.find(x=>x.time&&!x.final);if(e.final&&timed)timed.final=e.final;continue;}
        if(out.some(x=>x.h2h&&x.date===e.date&&x.time===e.time&&namesCompatible(x.name,e.name)))continue;
      }
      out.push(e);
    }
  }
  out.sort((a,b)=>a.date.localeCompare(b.date)||String(a.time||'').localeCompare(String(b.time||'')));
  // One event on two days in a row ("State Volleyball" Oct 31 and Nov 1):
  // one entry that runs both days.
  const merged=[];
  for(const e of out){
    const prev=merged.findLast(x=>!x.h2h&&!e.h2h&&x.name===e.name&&!x.final&&!e.final);
    const last=prev&&(prev.end_date||prev.date),next=last&&new Date(Date.parse(`${last}T00:00:00Z`)+864e5).toISOString().slice(0,10);
    if(prev&&(e.date===next||e.date===last)){prev.end_date=e.end_date||e.date;if(e.teams.length>prev.teams.length)prev.teams=e.teams;continue;}
    merged.push(e);
  }
  return merged;
}
// A meet's team place from the scores Bound holds for it (golf strokes and
// cross country points: low wins). Teams without a score are not placed.
export function boundTeamPlace(entry,{lowWins=true}={}){
  const own=entry.teams.find(t=>t.own);if(!own)return null;
  if(own.place){const placed=entry.teams.filter(t=>t.place);return{place:own.place,teams:placed.length,score:own.score||null,tied:placed.filter(t=>t.place===own.place).length>1};}
  const scored=entry.teams.filter(t=>t.score>0);if(!(own.score>0)||scored.length<2)return null;
  const place=1+scored.filter(t=>lowWins?t.score<own.score:t.score>own.score).length;
  return{place,teams:scored.length,score:own.score,tied:scored.filter(t=>t.score===own.score).length>1};
}

// --- Calendars typed by hand without a fixed form (Blue Valley USD 384:
// "HS Football- Home vs. Canton-Galva", "MS/HS Cross Country- Abilene Meet at
// Great Life Golf & Fitness", "Time Change!! HS FB @Clifton Clyde (Away)";
// Manhattan Catholic: "Volleyball Away Game at Valley Heights", "XC @ Clay
// Center", "Basketball vs Washington Co."). `levels` are the title prefixes
// the school's teams take ("HS", "MS"; "MS/HS" counts for both); a school
// whose titles carry none passes `levels:[null]`. The team reads
// "<level> <sport>" ("HS Volleyball") or the sport alone.
const FREE_SPORTS=[[/^(?:volley ?ball|vb)\b/i,'Volleyball'],[/^(?:football|fb)\b/i,'Football'],[/^(?:(girls|boys)\s+)?(?:basketball|bb)\b/i,'Basketball'],[/^(?:cross country|xc|cc)\b/i,'Cross Country'],[/^track(?: (?:&|and) field)?\b/i,'Track & Field'],[/^(?:(girls|boys)\s+)?(?:wrestling|wr)\b/i,'Wrestling'],[/^golf\b/i,'Golf'],[/^baseball\s*\/\s*softball\b/i,'Baseball/Softball'],[/^baseball\b/i,'Baseball'],[/^softball\b/i,'Softball']];
const FREE_SKIP=/cancel+ed|postponed|practice|picture|photo|first day|rain date|banquet|parent meeting|signup|sign up|physicals?|tryout|scrimmage|eligibility/i;
const FREE_LOWER_ONLY=s=>/\b(?:JV|C Team|B Team)\b/i.test(s)&&!/\bvarsity\b|\bA Team\b/i.test(s);
const FREE_NOISE=/\b(?:C Team|JV|B Team),\s*|time change!*|\(change of start time\)|\(theme[^)]*\)|\[[^\]]*\]|-?\s*homecoming\b|-?\s*senior night.*$|\bstarting at .*$|\(tentative\)|\(?\b(?:varsity\/jv|varsity|v)\b\)?/gi;
export function parseFreeTitle(title,{level=null,abbreviations={},home=null}={}){
  const homeName=home||/^$/;
  let s=clean(title).replace(/\[[^\]]*\]/g,' ').replace(/\bVarsity(?=[A-Z])/g,'Varsity ').replace(/^(?:time change|change|update|updated|new time|rescheduled)\s*!*\s*:?\s*/i,'').trim();
  if(FREE_SKIP.test(s)||FREE_LOWER_ONLY(s))return null;
  let titleLevel=null;
  const lv=s.match(/^(MS\/HS|HS\/MS|HS|MS|JH)\b\s*/i);
  // Onaga writes its junior high "JH".
  if(lv){titleLevel=lv[1].toUpperCase().replace('JH','MS');s=s.slice(lv[0].length);}
  if(level&&!(titleLevel===level||(titleLevel&&titleLevel.includes('/')&&titleLevel.split('/').includes(level))))return null;
  if(!level&&titleLevel)return null;
  s=s.replace(/^varsity\s+/i,'');
  // A league or event word may come before the sport ("BVL Basketball Tournament @ Hanover").
  const lead=s.match(/^((?:BVL|TVL|NCKL|MEL)\s+)(?=(?:volley|basket|bb|vb|football|track|cross|xc|golf|wrestling))/);
  const leadWord=lead?lead[1].trim():'';if(lead)s=s.slice(lead[0].length);
  let sport=null,gender=null;
  for(const [re,name] of FREE_SPORTS){const m=s.match(re);if(m){sport=name;gender=m[1]?m[1][0].toUpperCase()+m[1].slice(1).toLowerCase():null;s=s.slice(m[0].length);break;}}
  if(!sport)return null;
  let rest=s.replace(/^\s*[-–:]\s*/,'').replace(FREE_NOISE,' ').replace(/\s+/g,' ').replace(/^[\s,:-]+|[\s,:-]+$/g,'').trim();
  if(leadWord)rest=`${leadWord} ${rest}`.trim();
  if(!rest)return null;
  // Only the first part of "Game at Blue Valley vs Bennington / C game ...".
  rest=rest.split(/\s+\/\s+/)[0].trim();
  let site=null;
  if(/\(home\)|\bat home\b|^home\b/i.test(rest))site='HOME';
  else if(/\(away\)|^away\b/i.test(rest))site='AWAY';
  rest=rest.replace(/\((?:home|away)\)/gi,' ').replace(/\bat home\b/gi,' ').replace(/^(?:home|away)\s+(?:game\s+)?/i,'').replace(/^game\s+/i,'').replace(/\s+/g,' ').trim();
  const expand=x=>Object.entries(abbreviations).reduce((t,[k,v])=>t.replace(new RegExp(`(^|[^A-Za-z])${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![A-Za-z])`,'g'),`$1${v}`),clean(x)).replace(/\s+/g,' ').trim();
  const opponent=x=>x.split(/\s+-\s*|-\s+/)[0].replace(/\s*\([^)]*\)?/g,'').trim();
  // Notes in brackets ("(A Team Only)", "(Parents Night)", "(WaCo & BV)").
  rest=expand(rest.replace(/\s*\([^)]*\)?/g,' ').replace(/\s+/g,' ').trim()).replace(/^dual\s+/i,'');
  let name;
  const at=rest.match(/^(?:@|at)\s*(.+?)(?:\s+(?:vs\.?|versus)\s+(.+))?$/i),vs=rest.match(/^(?:vs\.?|versus)\s*(.+)$/i);
  if(vs&&!isNamedEvent(vs[1])){name=opponent(vs[1]);site=site||'HOME';}
  else if(at&&!isNamedEvent(at[1])){name=at[2]?`${opponent(at[1])} & ${opponent(at[2])}`:opponent(at[1]);site=site||(homeName.test(at[1])?'HOME':'AWAY');}
  else{
    // An event: "Abilene Meet at Great Life Golf & Fitness", "Varsity
    // Tournament at Wakefield", "Regionals @BVHS", "Tri vs Clifton-Clyde &
    // Frankfort", "@Wamego - 1A State".
    const lead=rest.match(/^(?:@|at)\s*(.+?)\s+-\s+(.+)$/i);
    name=lead?`${lead[2]} at ${lead[1]}`:rest.replace(/\s*@\s*/g,' at ').replace(/\s+-\s+/g,' ');
    const place=name.match(/\bat\s+([^]+?)\s*$/i);
    if(!site&&place)site=homeName.test(place[1].trim())?'HOME':'AWAY';
    if(!isNamedEvent(name))name=`${name} event`;
  }
  name=name.replace(/\s*-\s*$/,'').trim();
  if(!name||/^tbd$/i.test(name))return null;
  const team=[level,gender,sport].filter(Boolean).join(' ');
  return{team,name,site};
}

// --- A season schedule kept as a Google Sheet (Flint Hills Christian: its
// athletics page links "2026-2027 Athletics Calendars"; the sheet's CSV export
// is read). Blocks sit side by side: a heading "HS Volleyball Schedule 2026",
// a header row (Date, Opponent or Meet, Location, Start time, Details), then
// rows to the first blank one. Each row becomes a calendar entry titled
// "<prefix> <block> - <opponent or meet> - HOME|AWAY", read like a
// ParentSquare calendar. Teams in brackets ("(MS, JV, V)", "(Boys A, B)")
// decide the level: a high school block keeps rows naming V (or none), a
// middle school block rows naming A or MS (or none).
export function parseCsv(text){
  const rows=[];let row=[],cellText='',quoted=false;
  const s=String(text||'');
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(quoted){if(c==='"'){if(s[i+1]==='"'){cellText+='"';i++;}else quoted=false;}else cellText+=c;continue;}
    if(c==='"')quoted=true;else if(c===','){row.push(cellText);cellText='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cellText);rows.push(row);row=[];cellText='';}else cellText+=c;
  }
  if(cellText||row.length){row.push(cellText);rows.push(row);}
  return rows;
}
const sheetDate=(text,season)=>{const m=clean(text).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);if(!m)return null;const y=m[3].length===2?2000+Number(m[3]):Number(m[3]);return`${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;};
// "5:30/6:30 PM", "4/5/6/7:30 PM", "6/7:30pm": the last time is varsity's.
const sheetTime=text=>{const s=clean(text).toLowerCase();const ap=(s.match(/([ap])\.?m\b/)||[])[1];if(!ap)return null;const last=s.replace(/\s*[ap]\.?m\b.*$/,'').split('/').pop().trim();const m=last.match(/^(\d{1,2})(?::(\d\d))?$/);if(!m)return null;let h=Number(m[1])%12;if(ap==='p')h+=12;return`${String(h).padStart(2,'0')}:${m[2]||'00'}`;};
export function sheetCalendar(text,{prefix,home=/^(?:fhcs)\b/i,abbreviations={}}){
  const rows=parseCsv(text),events=[];
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
    const head=clean(rows[r][c]).match(/^(HS|MS)\s+(.+?)\s+Schedule\b/i);if(!head)continue;
    const level=head[1].toUpperCase(),block=`${level} ${head[2]}`;
    for(let i=r+2;i<rows.length;i++){
      const cells=rows[i].slice(c,c+5).map(clean);
      if(!cells[0])break;
      const date=sheetDate(cells[0]);if(!date)continue;
      let name=cells[1],away=/^@\s*/.test(name),host=/^\w+ host\s*-\s*/i.test(name)&&home.test(name);name=name.replace(/^@\s*/,'').replace(/^\w+ host\s*-\s*/i,'');
      const teams=(name.match(/\(([^)]*)\)/g)||[]).join(' ');
      name=expandAbbreviations(name.replace(/\s*\([^)]*\)/g,'').replace(/\?+/g,''),abbreviations).trim();
      if(teams){
        const t=teams.replace(/[()]/g,' ');
        if(level==='HS'&&!/\bV\b|varsity|\bHS\b|\bgirls\b|\bboys\b/i.test(t))continue;
        if(level==='MS'&&!/\bA\b|\bMS\b|\bgirls\b|\bboys\b/i.test(t))continue;
      }
      const site=away?'AWAY':host||home.test(cells[2])?'HOME':cells[2]?'AWAY':'';
      const time=sheetTime(cells[3]);
      events.push({id:`${block}|${date}|${name}`,title:`${prefix} ${block} - ${name}${site?` - ${site}`:''}`,start_date:date,start_time:time?`${time}:00`:'00:00:00',end_date:date,all_day:!time,address:cells[2]||''});
    }
  }
  return{events};
}

// Apptegy (Thrillshare) district calendars (Onaga USD 322: "HS Basketball @
// Northern Heights", "JH Boys Wrestling at Doniphan West"): the coming events
// in pages of 100, as ParentSquare-shaped entries for `calendarEvents`.
export function apptegyCalendar(payloads){
  const events=[];
  for(const p of payloads)for(const e of p?.events||[]){
    const start=String(e.start_at||''),end=String(e.end_at||'');
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(start))continue;
    events.push({id:e.id,title:e.title,start_date:start.slice(0,10),start_time:e.all_day?'00:00:00':start.slice(11,19),end_date:end.slice(0,10)||start.slice(0,10),all_day:!!e.all_day,address:e.location||''});
  }
  return{events};
}
