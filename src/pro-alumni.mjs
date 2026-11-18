// Pros from a school (user, November 18, 2026: "What should we add in pro
// that's unique?", then "Start 1-4"): every college school's Football,
// Basketball, Baseball and Hockey sections list its former players now on an
// NFL, NBA, WNBA, MLB or NHL roster, with each one's line from the team's
// latest game, and the school's picks in the latest draft.
//
// Sources (no key, the same reads a browser makes):
// - ESPN's team rosters (`/teams/<id>/roster`): every player names his or
//   her college by ESPN's college id, which is the id the app's college
//   standings already map to each school (src/college-standings.json).
// - ESPN's league scoreboards and game summaries: each finished game's box
//   score gives every player's line. A final is read once (it does not change).
// - Drafts: ESPN's draft pages for the NFL, NBA and WNBA (each pick's ESPN
//   player id joins the roster, so the college is the roster's; else the
//   college named on the pick), and MLB's own draft API for MLB (each pick
//   names its school and the school's state; high schools too).
//
// The rosters and drafts of a league are one index, kept in KV and rebuilt
// once a day; the latest lines of a league are a second, rebuilt every 15
// minutes when asked. Both are shared by every school and every location.

export const ALUMNI_LEAGUES=[
  {id:'nfl',league:'NFL',path:'football/nfl',sport:'Football',draft:'espn',draftMonth:4,weekly:true},
  {id:'nba',league:'NBA',path:'basketball/nba',sport:'Basketball',gender:'men',draft:'espn',draftMonth:6},
  {id:'wnba',league:'WNBA',path:'basketball/wnba',sport:'Basketball',gender:'women',draft:'espn',draftMonth:4},
  {id:'mlb',league:'MLB',path:'baseball/mlb',sport:'Baseball',draft:'mlb',draftMonth:7},
  {id:'nhl',league:'NHL',path:'hockey/nhl',sport:'Hockey',draft:null},
];
export const alumniLeaguesFor=sport=>ALUMNI_LEAGUES.filter(l=>l.sport===sport);
export const ALUMNI_ROSTER_MS=24*3600e3,ALUMNI_LINES_MS=15*60e3,ALUMNI_LINE_DAYS=21;
export const alumniRosterKey=id=>`pros:v1:roster:${id}`;
export const alumniLinesKey=id=>`pros:v1:lines:${id}`;
export const MLB_STATS='https://statsapi.mlb.com/api/v1/';

// One team's roster: ESPN groups players by position (NFL, MLB, NHL) or
// lists them flat (NBA, WNBA).
export function rosterPlayers(payload,team){
  let list=Array.isArray(payload?.athletes)?payload.athletes:[];
  if(list.some(x=>Array.isArray(x?.items)))list=list.flatMap(x=>Array.isArray(x?.items)?x.items:[]);
  return list.filter(a=>a&&a.id&&a.displayName).map(a=>({
    i:String(a.id),n:String(a.displayName),p:a.position?.abbreviation||'',j:a.jersey||'',
    c:a.college?.id?String(a.college.id):'',cn:a.college?.name||a.college?.shortName||'',
    bc:a.birthPlace?.city||'',bs:a.birthPlace?.state||'',x:Number(a.experience?.years)||0,
    t:team.id,
  }));
}

// The latest draft held: this year's once its month has come and picks are
// made, else last year's.
export function draftYears(now,league){
  const y=now.getUTCFullYear(),m=now.getUTCMonth()+1;
  return m>=league.draftMonth?[y,y-1]:[y-1];
}
export const espnDraftUrl=(league,year)=>`https://site.api.espn.com/apis/site/v2/sports/${league.path}/draft?season=${year}`;
export const mlbDraftUrl=year=>`${MLB_STATS}draft/${year}`;

// ESPN's draft: picks made, with the player's ESPN id (`alternativeId`, the
// roster's id), position and college as ESPN names it.
export function espnDraftPicks(payload,{teamsByEspnId=new Map()}={}){
  const positions=new Map((payload?.positions||[]).map(p=>[String(p.id),p.abbreviation||p.displayName||'']));
  const picks=(payload?.picks||[]).filter(p=>p?.athlete?.displayName&&(p.status==='SELECTION_MADE'||p.status?.name==='SELECTION_MADE'));
  return picks.map(p=>{
    const team=teamsByEspnId.get(String(p.teamId))||null,college=p.athlete.team||{};
    return{o:Number(p.overall)||0,r:String(p.round??''),p:Number(p.pick)||0,n:String(p.athlete.displayName),pos:positions.get(String(p.athlete.position?.id))||'',
      ai:p.athlete.alternativeId?String(p.athlete.alternativeId):'',t:team?.id||'',tn:team?.name||'',
      sch:{location:college.location||'',name:college.name||'',displayName:[college.location,college.name].filter(Boolean).join(' '),shortDisplayName:college.shortDisplayName||''}};
  }).filter(p=>p.o>0);
}
// MLB's draft: every pick names its school, the school's state and the
// player's home state.
export function mlbDraftPicks(payload,{teamsByName=new Map()}={}){
  const rounds=payload?.drafts?.rounds||[];
  return rounds.flatMap(r=>r.picks||[]).filter(p=>p?.person?.fullName&&p.isDrafted!==false&&!p.isPass).map(p=>{
    const team=teamsByName.get(String(p.team?.name||'').toLowerCase())||null;
    return{o:Number(p.pickNumber)||0,r:String(p.pickRound||''),p:Number(p.roundPickNumber)||0,n:String(p.person.fullName),pos:p.person.primaryPosition?.abbreviation||'',
      ai:'',t:team?.id||'',tn:team?.name||String(p.team?.name||''),hs:/^HS\b/.test(String(p.school?.schoolClass||'')),
      sch:{location:String(p.school?.name||''),name:'',displayName:String(p.school?.name||''),shortDisplayName:String(p.school?.name||''),state:String(p.school?.state||'')},
      home:String(p.home?.state||'')};
  }).filter(p=>p.o>0).sort((a,b)=>a.o-b.o);
}

// Box score lines. Each league's line names what a fan looks for first.
const n=v=>{const x=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(x)?x:0};
const plural=(v,one,many=`${one}s`)=>`${v} ${Number(v)===1?one:many}`;
function statOf(group,athlete,key){const i=(group.keys||[]).indexOf(key);return i>=0?athlete.stats?.[i]:undefined}
function footballPart(group,a){
  const s=k=>statOf(group,a,k);
  switch(group.name){
    case'passing':{const [c,att]=String(s('completions/passingAttempts')||'').split('/');if(!n(att))return'';return[`${c}/${att}`,`${n(s('passingYards'))} yds`,n(s('passingTouchdowns'))?`${n(s('passingTouchdowns'))} TD`:'',n(s('interceptions'))?`${n(s('interceptions'))} INT`:''].filter(Boolean).join(', ')}
    case'rushing':{const c=n(s('rushingAttempts'));if(!c)return'';return[plural(c,'carry','carries'),`${n(s('rushingYards'))} yds`,n(s('rushingTouchdowns'))?`${n(s('rushingTouchdowns'))} TD`:''].filter(Boolean).join(', ')}
    case'receiving':{const c=n(s('receptions'));if(!c)return'';return[`${c} rec`,`${n(s('receivingYards'))} yds`,n(s('receivingTouchdowns'))?`${n(s('receivingTouchdowns'))} TD`:''].filter(Boolean).join(', ')}
    case'defensive':{const t=n(s('totalTackles')),k=n(s('sacks')),pd=n(s('passesDefended'));if(!t&&!k&&!pd)return'';return[t?plural(t,'tackle'):'',k?plural(k,'sack'):'',pd?`${pd} PD`:''].filter(Boolean).join(', ')}
    case'interceptions':{const i=n(s('interceptions'));return i?plural(i,'interception'):''}
    case'kicking':{const fg=String(s('fieldGoalsMade/fieldGoalAttempts')||''),xp=String(s('extraPointsMade/extraPointAttempts')||'');return[fg&&fg!=='0/0'?`FG ${fg}`:'',xp&&xp!=='0/0'?`XP ${xp}`:''].filter(Boolean).join(', ')}
    case'punting':{const p=n(s('punts'));return p?`${plural(p,'punt')}, ${s('grossAvgPuntYards')} avg`:''}
    default:return'';
  }
}
function basketballLine(group,a){
  if(a.didNotPlay)return'Did not play';
  const s=k=>statOf(group,a,k),min=n(s('minutes'));if(!min&&!n(s('points')))return'';
  return[`${n(s('points'))} pts`,`${n(s('rebounds'))} reb`,`${n(s('assists'))} ast`,`${min} min`].join(', ');
}
function hockeyLine(group,a){
  const s=k=>statOf(group,a,k);
  if(group.name==='goalies'){const sa=n(s('shotsAgainst'));if(!sa)return'';return`${n(s('saves'))} saves on ${sa} shots`}
  const toi=s('timeOnIce');if(!toi||toi==='0:00')return'';
  const g=n(s('goals')),as=n(s('assists')),pm=String(s('plusMinus')??'');
  return[g?plural(g,'goal'):'',as?plural(as,'assist'):'',`${n(s('shotsTotal'))} SOG`,pm&&pm!=='0'?(/^[+-]/.test(pm)?pm:`+${pm}`):'',`${toi} TOI`].filter(Boolean).join(', ');
}
function baseballLine(group,a){
  const s=k=>statOf(group,a,k);
  if(group.type==='pitching'||group.name==='pitching'){const ip=s('fullInnings.partInnings');if(ip==null)return'';return[`${ip} IP`,`${n(s('hits'))} H`,`${n(s('earnedRuns'))} ER`,`${n(s('strikeouts'))} K`].join(', ')}
  const hab=s('hits-atBats');if(hab==null)return'';const [,ab]=String(hab).split('-');if(!n(ab)&&!n(s('walks')))return'';
  return[String(hab),n(s('homeRuns'))?`${n(s('homeRuns'))} HR`:'',n(s('RBIs'))?`${n(s('RBIs'))} RBI`:'',n(s('runs'))?`${n(s('runs'))} R`:'',n(s('walks'))?`${n(s('walks'))} BB`:''].filter(Boolean).join(', ');
}
// A finished game's summary: its date, both teams and every player's line.
export function summaryLines(summary,league){
  const competition=summary?.header?.competitions?.[0];if(!competition)return null;
  if(competition.status?.type?.completed===false)return null;
  const competitors=competition.competitors||[];
  const teams=new Map(competitors.map(c=>[String(c.team?.id||c.id),{id:String(c.team?.id||c.id),abbr:c.team?.abbreviation||'',home:c.homeAway==='home',score:c.score,winner:Boolean(c.winner)}]));
  const lines=new Map();
  for(const side of summary?.boxscore?.players||[]){
    const teamId=String(side.team?.id||'');
    for(const group of side.statistics||[]){
      for(const a of group.athletes||[]){
        const id=a?.athlete?.id;if(!id)continue;
        const text=league.id==='nfl'?footballPart(group,a):league.sport==='Basketball'?basketballLine(group,a):league.id==='nhl'?hockeyLine(group,a):league.id==='mlb'?baseballLine(group,a):'';
        if(!text)continue;
        const prev=lines.get(String(id));
        lines.set(String(id),{team:teamId,text:prev?`${prev.text} · ${text}`:text});
      }
    }
  }
  const out={};
  for(const [id,{team,text}] of lines){
    const own=teams.get(team),opp=[...teams.values()].find(t=>t.id!==team);
    if(!own||!opp)continue;
    const result=own.score!=null&&opp.score!=null?`${own.winner?'W':opp.winner?'L':'T'} ${own.score}-${opp.score}`:'';
    out[id]={d:competition.date||'',g:String(summary.header?.id||competition.id||''),o:`${own.home?'vs':'at'} ${opp.abbr}`,r:result,s:text};
  }
  return out;
}

// Scoreboard payloads: the finished games (ESPN ids).
export function finishedGames(payloads){
  const seen=new Set(),out=[];
  for(const p of payloads)for(const e of p?.events||[]){
    if(!e?.id||seen.has(e.id)||!e.status?.type?.completed)continue;
    if(/postponed|canceled|cancelled/i.test(e.status?.type?.name||''))continue;
    seen.add(e.id);out.push({id:String(e.id),date:e.date||''});
  }
  return out.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
// The scoreboard reads for a lines rebuild: the NFL's current week and the one
// before; any other league its last days (Eastern dates), three on a first
// build, else today and yesterday.
export function scoreboardUrls(league,{now,first=false,board=null}={}){
  const base=`https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard`;
  if(league.weekly){
    if(!board)return[base];
    const week=Number(board.week?.number),type=Number(board.season?.type);
    return week>1?[`${base}?seasontype=${type}&week=${week-1}`]:[];
  }
  // The last four days every build: a first build's games past its 20
  // summaries are read by the next builds (each final once).
  const days=4,out=[];
  for(let i=0;i<days;i++){const d=new Date(now.getTime()-i*864e5-5*3600e3).toISOString().slice(0,10).replaceAll('-','');out.push(`${base}?dates=${d}&limit=100`)}
  return out;
}
// Merge newly read finals into a league's lines: the latest line per player,
// lines older than ALUMNI_LINE_DAYS dropped, finals remembered so a game is
// read once.
export function mergeLines(doc,games,{now}){
  const lines={...(doc?.lines||{})},read=new Set(doc?.read||[]);
  for(const {id,lines:found} of games){
    read.add(id);
    for(const [athlete,line] of Object.entries(found||{})){const prev=lines[athlete];if(!prev||String(line.d)>=String(prev.d))lines[athlete]=line}
  }
  const cutoff=now.getTime()-ALUMNI_LINE_DAYS*864e5;
  for(const [k,v] of Object.entries(lines))if(!(Date.parse(v.d)>=cutoff))delete lines[k];
  return{built:now.toISOString(),read:[...read].slice(-400),lines};
}

// A school's pros in one league: roster players whose college is the school,
// most recent line first, then by years in the league.
export function schoolPros(index,lines,collegeId,{teamsById=new Map(),all=false}={}){
  if(!index||!collegeId&&!all)return[];
  const out=(index.players||[]).filter(p=>all||p.c===String(collegeId)).map(p=>{
    const team=teamsById.get(p.t)||null,line=lines?.lines?.[p.i]||null;
    return{id:p.i,name:p.n,position:p.p,jersey:p.j,team_id:team?.id||'',team:team?.name||'',team_short:team?.short_name||'',years:p.x,
      ...(line?{last_game:{date:line.d,opponent:line.o,result:line.r,line:line.s}}:{})};
  });
  const seen=new Set();
  return out.filter(p=>!seen.has(p.id)&&seen.add(p.id)).sort((a,b)=>(b.last_game?1:0)-(a.last_game?1:0)||String(b.last_game?.date||'').localeCompare(String(a.last_game?.date||''))||b.years-a.years||a.name.localeCompare(b.name));
}
// A school's picks in the league's latest draft. A pick on a roster takes the
// roster's college id; any other pick is matched by the college's name.
export function schoolDraft(index,school,collegeId,matches){
  const draft=index?.draft;if(!draft?.picks?.length)return null;
  const byId=new Map((index.players||[]).map(p=>[p.i,p]));
  const picks=draft.picks.filter(p=>{
    const rostered=p.ai&&byId.get(p.ai);
    if(rostered&&rostered.c)return rostered.c===String(collegeId);
    return matches(p.sch,school);
  }).map(p=>({overall:p.o,round:p.r,pick:p.p,name:p.n,position:p.pos,team_id:p.t,team:p.tn}));
  return picks.length?{year:draft.year,picks}:null;
}

// Each college school's ESPN id: the id its ESPN standings boards use, the
// same in every sport (Cincinnati is 2132 in football and basketball).
import COLLEGE_BOARDS from './college-standings.json' with {type:'json'};
export const COLLEGE_ESPN_IDS=(()=>{const out=new Map();for(const [board,map] of Object.entries(COLLEGE_BOARDS.boards||{})){if(board.startsWith('chn/'))continue;for(const [id,value] of Object.entries(map||{}))if(Array.isArray(value)&&value[1]&&!out.has(id))out.set(id,String(value[1]))}return out})();
export const collegeEspnId=schoolId=>COLLEGE_ESPN_IDS.get(schoolId)||null;
export const US_STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
export const stateName=v=>US_STATES[String(v||'').toUpperCase()]||String(v||'');

// A pro hub's players (Kansas & Kansas City, user, November 18: "Start 1-4"):
// everyone on a league's rosters who played college ball at one of the hub's
// colleges or was born in its state, each with the college and birthplace.
export function hubPros(index,lines,{collegeIds=[],birthState=null,collegeNames=new Map()}={},{teamsById=new Map()}={}){
  if(!index)return[];
  const ids=new Set(collegeIds.map(String));
  const wanted=(index.players||[]).filter(p=>ids.has(p.c)||birthState&&p.bs===birthState);
  const listed=schoolPros({players:wanted},lines,null,{teamsById,all:true});
  const byId=new Map(wanted.map(p=>[p.i,p]));
  return listed.map(p=>{const r=byId.get(p.id);return{...p,college:collegeNames.get(r.c)||r.cn||'',...(birthState&&r.bs===birthState&&r.bc?{born:`${r.bc}, ${r.bs}`}:{})}});
}
// A hub's draft picks: from its colleges (by roster id or name), and MLB's
// picks from any school in its state (colleges, junior colleges and high
// schools: MLB names the school's state).
export function hubDraft(index,colleges,{collegeIds=[],state=null,matches}={}){
  const draft=index?.draft;if(!draft?.picks?.length)return null;
  const ids=new Set(collegeIds.map(String)),byId=new Map((index.players||[]).map(p=>[p.i,p]));
  const picks=draft.picks.map(p=>{
    const rostered=p.ai&&byId.get(p.ai);
    let school=null;
    if(rostered&&rostered.c)school=ids.has(rostered.c)?colleges.find(c=>String(c.espn_id)===rostered.c)?.short_name||rostered.cn:null;
    else school=colleges.find(c=>matches(p.sch,c))?.short_name||(state&&p.sch.state===state?p.sch.displayName:null);
    return school?{overall:p.o,round:p.r,pick:p.p,name:p.n,position:p.pos,team_id:p.t,team:p.tn,school}:null;
  }).filter(Boolean);
  return picks.length?{year:draft.year,picks}:null;
}

// A pro team's own roster (user, November 18: "I'm not seeing the pro roster
// on the pro pages"): every player on its ESPN roster with position, number,
// college (the app's college page when the app has the school) and the line
// from the team's latest game.
export const ALUMNI_LEAGUE_BY_NAME=new Map(ALUMNI_LEAGUES.map(l=>[l.league,l]));
export function teamRoster(index,lines,teamId,{collegeSchools=new Map()}={}){
  if(!index||!teamId)return[];
  const seen=new Set();
  return(index.players||[]).filter(p=>p.t===teamId&&!seen.has(p.i)&&seen.add(p.i)).map(p=>{
    const college=collegeSchools.get(p.c)||null,line=lines?.lines?.[p.i]||null;
    return{id:p.i,name:p.n,position:p.p,jersey:p.j,years:p.x,college:college?.short_name||p.cn||'',...(college?{college_id:college.id}:{}),
      ...(line?{last_game:{date:line.d,opponent:line.o,result:line.r,line:line.s}}:{})};
  }).sort((a,b)=>(b.last_game?1:0)-(a.last_game?1:0)||a.name.localeCompare(b.name));
}
