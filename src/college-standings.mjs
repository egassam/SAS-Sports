// College conference standings (user, November 11, 2026: "Start the college
// conference standings"). ESPN publishes each conference's table next to its
// college scoreboards (`/apis/v2/sports/<board>/standings?group=<id>`): one
// read per conference (about 300 KB, kept 30 minutes and shared by every
// school of the conference). Which group a school is in comes from
// src/college-standings.json (scripts/make-college-standings.mjs), because
// the whole-division payloads (2.4 to 6 MB) cost too much CPU to parse in a
// feed build.
//
// A school's page shows its division first when the conference has them
// (Sun Belt and SWAC football), then the whole conference by ESPN's seed
// (its own tie-breaks). Columns: conference record, overall record, streak;
// the detail line is the home and away record. The school's own row is
// marked (`own`) and stays visible below the top 5.

import COLLEGE_STANDINGS_GROUPS from './college-standings.json' with {type:'json'};

// The boards read, their sport, and the whole-division reads the generator
// uses (FBS is ESPN's default; FCS is group 81). Basketball's two boards are
// the men's and women's teams of one sport.
export const COLLEGE_STANDINGS_BOARDS={
  'football/college-football':{sport:'Football',reads:['','group=81'],site:'college-football'},
  'basketball/mens-college-basketball':{sport:'Basketball',reads:[''],site:'mens-college-basketball',label:"Men's"},
  'basketball/womens-college-basketball':{sport:'Basketball',reads:[''],site:'womens-college-basketball',label:"Women's"}
};
export const COLLEGE_STANDINGS_URL='https://site.api.espn.com/apis/v2/sports/';
export const collegeStandingsUrl=(board,group)=>`${COLLEGE_STANDINGS_URL}${board}/standings?group=${encodeURIComponent(group)}`;
// Independents are no conference: they have no table.
export const independentGroup=name=>/\bindependents?\b/i.test(String(name||''));

const byType=entry=>{const by={};for(const s of entry?.stats||[]){for(const k of [s.type,s.name])if(k&&!(k in by))by[k]=s;}return by};
const value=s=>{const n=Number(s?.value);return Number.isFinite(n)?n:null};
const shown=s=>String(s?.displayValue??'').trim();
const pct=record=>{const [w,l]=String(record||'').split('-').map(Number);return Number.isFinite(w)&&Number.isFinite(l)&&w+l?w/(w+l):null};
// Football names them homerecord/awayrecord, basketball home/road.
function row(entry){
  const s=byType(entry),conf=shown(s.vsconf)||'0-0',overall=shown(s.total)||shown(s.overall);
  const home=shown(s.homerecord)||shown(s.home),away=shown(s.awayrecord)||shown(s.road);
  const seed=value(s.playoffseed);
  return{team:entry.team||{},seed:seed>0?seed:null,confPct:pct(conf),overallPct:pct(overall),
    values:{conf,overall,streak:shown(s.streak)==='-'?'':shown(s.streak)},
    detail:[home&&`Home ${home}`,away&&`Away ${away}`].filter(Boolean).join(' · ')};
}
// ESPN's seed when every team has one; else conference, then overall record.
function ordered(rows){
  if(rows.every(r=>r.seed!=null))return rows.slice().sort((a,b)=>a.seed-b.seed);
  return rows.slice().sort((a,b)=>(b.confPct??-1)-(a.confPct??-1)||(b.overallPct??-1)-(a.overallPct??-1));
}
const COLUMNS=[{key:'conf',label:'Conf'},{key:'overall',label:'Ovr'},{key:'streak',label:'Strk'}];
function table(title,entries,{own,source}){
  const rows=ordered(entries.map(row));if(!rows.length)return null;
  return{title,columns:COLUMNS,source,rows:rows.map((r,i)=>({pos:i+1,name:r.team.location||r.team.shortDisplayName||r.team.displayName||r.team.abbreviation,
    detail:r.detail,values:r.values,...(own(r.team)?{own:true}:{})}))};
}
// One conference's payload (`?group=`) → the school's tables, or [] when
// the school is not in it (realignment: rerun the generator).
export function collegeConferenceStandings(payload,{board,team,group}={}){
  const spec=COLLEGE_STANDINGS_BOARDS[board];if(!payload||!spec||team==null)return[];
  if(independentGroup(payload.name))return[];
  const own=t=>String(t?.id)===String(team);
  const divisions=(payload.children||[]).filter(d=>d?.standings?.entries?.length);
  const all=[...(payload.standings?.entries||[]),...divisions.flatMap(d=>d.standings.entries)];
  if(!all.some(e=>own(e.team)))return[];
  const season=payload.standings?.seasonDisplayName||divisions.find(d=>d.standings?.seasonDisplayName)?.standings?.seasonDisplayName||'';
  const source={name:`ESPN standings${season?` (${season} season)`:''}`,url:`https://www.espn.com/${spec.site}/standings${group!=null?`/_/group/${encodeURIComponent(group)}`:''}`};
  const name=payload.shortName||payload.name||'Conference',prefix=spec.label?`${spec.label} `:'',tables=[];
  const mine=divisions.find(d=>d.standings.entries.some(e=>own(e.team)));
  if(mine)tables.push(table(`${prefix}${mine.shortName||mine.name}`,mine.standings.entries,{own,source}));
  tables.push(table(`${prefix}${name}`,all,{own,source}));
  return tables.filter(Boolean);
}
// The boards a college sport reads, for a school in src/college-standings.json.
export function collegeStandingsReads(schoolId,sport,groupsFile=COLLEGE_STANDINGS_GROUPS){
  const out=[];
  for(const [board,spec] of Object.entries(COLLEGE_STANDINGS_BOARDS)){
    if(spec.sport!==sport)continue;
    const hit=groupsFile?.boards?.[board]?.[schoolId];
    if(hit)out.push({board,group:hit[0],team:hit[1],url:collegeStandingsUrl(board,hit[0])});
  }
  return out;
}

// ---- College hockey (user, November 12, 2026: "Add the hockey conference
// standings") ----
// ESPN's men's hockey standings group teams by conference but carry only the
// overall W-L-T (no conference record, points 0, no seeds), and its women's
// standings have no conferences, so neither ranks a hockey conference.
// College Hockey News publishes every Division I conference's table on one
// page per gender (about 120 KB men's, 70 KB women's; robots.txt allows
// /reports/ and /women/): conference GP, points, regulation and overtime
// wins and losses, then the overall record. One read per gender serves every
// school, kept 30 minutes. Which team is a school's comes from
// src/college-standings.json (`chn/<gender>`: [conference, CHN team id]).
export const COLLEGE_HOCKEY_PAGES={
  'chn/mens-hockey':{label:"Men's",url:'https://www.collegehockeynews.com/reports/standings.php'},
  'chn/womens-hockey':{label:"Women's",url:'https://www.collegehockeynews.com/women/standings.php'}
};
const cellText=html=>String(html||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
// An empty cell (a tied team's rank) is no number, not 0.
const num=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
// The page → [{conference, teams:[{rank, name, slug, id, gp, pts, rw, rl,
// ow, ol, w, l, t}]}] in CHN's order. A tied team's rank cell is blank: it
// shares the rank above. Independents are no conference.
export function parseChnStandings(html){
  const out=[];
  const sections=String(html||'').split(/<tr class="stats-section">/).slice(1);
  for(const section of sections){
    const name=cellText((section.match(/<td[^>]*>([\s\S]*?)<\/td>/)||[])[1]);
    if(!name||independentGroup(name))continue;
    const teams=[];let rank=null;
    for(const [,row] of section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
      const link=row.match(/href="[^"]*\/team\/([^/"]+)\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/);if(!link)continue;
      const cells=[...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>cellText(m[1]));
      // rank, team, GP, PTS, Pt%, RW, RL, OW, OL, |, GP, W, L, T, ...
      if(cells.length<14)continue;
      if(num(cells[0])!=null)rank=num(cells[0]);
      teams.push({rank,name:cellText(link[3]),slug:link[1],id:link[2],gp:num(cells[2]),pts:num(cells[3]),rw:num(cells[5]),rl:num(cells[6]),ow:num(cells[7]),ol:num(cells[8]),w:num(cells[11]),l:num(cells[12]),t:num(cells[13])});
    }
    if(teams.length)out.push({conference:name,teams});
  }
  return out;
}
const HOCKEY_COLUMNS=[{key:'gp',label:'GP'},{key:'pts',label:'Pts'},{key:'overall',label:'Ovr'}];
// The school's conference table from one gender's page, or [] when the team
// is not on it (the map is stale: rerun the generator).
export function collegeHockeyStandings(html,{board,team}={}){
  const spec=COLLEGE_HOCKEY_PAGES[board];if(!spec||team==null)return[];
  const conference=parseChnStandings(html).find(c=>c.teams.some(t=>t.id===String(team)));if(!conference)return[];
  // The title reads "2026&#8209;27 Standings" (a non-breaking hyphen).
  const season=((String(html).match(/<title>\s*(20\d\d)(?:&#8209;|&#x2011;|\u2011|-)(\d\d) Standings/i)||[]).slice(1,3).join('-'));
  const source={name:`College Hockey News standings${season?` (${season} season)`:''}`,url:spec.url};
  return[{title:`${spec.label} ${conference.conference}`,columns:HOCKEY_COLUMNS,source,rows:conference.teams.map(t=>({
    pos:t.rank??'',name:t.name,
    detail:[`Reg ${t.rw??0}-${t.rl??0}`,`OT ${t.ow??0}-${t.ol??0}`].join(' · '),
    values:{gp:String(t.gp??0),pts:String(t.pts??0),overall:`${t.w??0}-${t.l??0}-${t.t??0}`},
    ...(t.id===String(team)?{own:true}:{})}))}];
}
// The hockey pages a school reads.
export function collegeHockeyReads(schoolId,sport,groupsFile=COLLEGE_STANDINGS_GROUPS){
  if(sport!=='Hockey')return[];
  const out=[];
  for(const [board,spec] of Object.entries(COLLEGE_HOCKEY_PAGES)){
    const hit=groupsFile?.boards?.[board]?.[schoolId];
    if(hit)out.push({board,team:hit[1],url:spec.url});
  }
  return out;
}
