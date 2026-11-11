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
const COLUMNS=[{key:'conf',label:'Conf'},{key:'overall',label:'Overall'},{key:'streak',label:'Strk'}];
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
