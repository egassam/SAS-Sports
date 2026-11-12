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

// ---- Conference sites (user, November 12, 2026: "Find another source for
// the other sports", then "Start with volleyball") ----
// ESPN has no conference tables for volleyball (one Division I table),
// soccer or softball, and NCAA.com's standings pages for them are empty. The
// conferences publish their own: 31 of the 32 the app's schools play in run
// SIDEARM, whose standings page is the same everywhere
// (`/standings.aspx?path=<sport>`, the current season by default; robots.txt
// allows it). One read per conference and sport, kept 30 minutes and shared
// by every school of the conference. The SEC's site is not SIDEARM (its
// standings load by script): no table yet.
export const CONFERENCE_SITES={
  'ACC':'theacc.com','ASUN':'asunsports.org','America East':'americaeast.com','American':'theamerican.org',
  'Atlantic 10':'atlantic10.com','Big 12':'big12sports.com','Big East':'www.bigeast.com','Big Sky':'bigskyconf.com',
  'Big South':'bigsouthsports.com','Big Ten':'bigten.org','Big West':'bigwest.org','CAA':'caasports.com',
  'Conference USA':'conferenceusa.com','Horizon League':'horizonleague.org','Ivy League':'ivyleague.com','MAC':'getsomemaction.com',
  'MEAC':'meacsports.com','Metro Conference':'themetro.org','Missouri Valley':'mvc-sports.com','Mountain West':'themw.com',
  'NEC':'northeastconference.org','OVC':'ovcsports.com','Pac-12':'pac-12.com','Patriot League':'patriotleague.org',
  'SWAC':'swac.org','Southern Conference':'soconsports.com','Southland Conference':'southland.org','Summit League':'thesummitleague.org',
  'Sun Belt':'sunbeltsports.org','UAC':'uacsports.com','WCC':'wccsports.com'
};
// The sports read from the conference sites, by SIDEARM path.
export const CONFERENCE_STANDINGS_SPORTS={'Volleyball':'wvball'};
export const conferenceStandingsUrl=(conference,sport)=>CONFERENCE_SITES[conference]&&CONFERENCE_STANDINGS_SPORTS[sport]?`https://${CONFERENCE_SITES[conference]}/standings.aspx?path=${CONFERENCE_STANDINGS_SPORTS[sport]}`:null;

const decode=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#0?39;|&apos;|&#8217;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
// "Cornell *", "Fairfield *#", "Manhattan E": the conference's clinched and
// eliminated marks are not the name.
export const sidearmTeamName=name=>decode(name).replace(/(?:\s*[*#†‡]+|\s+[A-Z])+$/,'').trim();
// The page → {title, groups:[{name, rows:[{name, conf, overall, streak,
// home, away}]}]}. The table carries a narrow-screen column set
// (`hide-on-large`) and the full one (`hide-on-medium-down`); the full set's
// headers name the columns, which each conference chooses: the conference
// record is "Conf", "Conference", "W-L" or the conference's own name ("ACC",
// "Metro"), never "Division"; the overall record "Overall"; the last
// "Streak" is the overall streak; Home and Away after Overall are overall.
export function parseSidearmStandings(html){
  const page=String(html||''),start=page.search(/<table[^>]*sidearm-standings-table/);if(start<0)return null;
  const table=page.slice(start,page.indexOf('</table>',start));
  const [head,body='']=table.split(/<\/thead>/);
  const headers=[...head.matchAll(/<th class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g)].filter(m=>/hide-on-medium-down/.test(m[1])).map(m=>decode(m[2]));
  const mobile=[...head.matchAll(/<th class="([^"]*)"[^>]*>([\s\S]*?)<\/th>/g)].filter(m=>/hide-on-large/.test(m[1])).map(m=>decode(m[2]));
  if(headers.length<3)return null;
  const find=(test,from=1)=>{for(let i=from;i<headers.length;i++)if(test(headers[i]))return i;return -1};
  let conf=find(h=>/^(conf\.?|conference|w-l)$/i.test(h));
  if(conf<0&&mobile[1])conf=find(h=>h.toLowerCase()===mobile[1].toLowerCase()&&!/division|overall/i.test(h));
  const overall=find(h=>/^overall$/i.test(h));
  let streak=-1;for(let i=headers.length-1;i>0;i--)if(/^streak$/i.test(headers[i])){streak=i;break;}
  const home=overall>0?find(h=>/^home$/i.test(h),overall+1):-1,away=overall>0?find(h=>/^away$/i.test(h),overall+1):-1;
  if(conf<0||overall<0)return null;
  const groups=[];let group={name:null,rows:[]};
  for(const [,row] of body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
    const label=row.match(/<th scope="colgroup" class="hide-on-medium-down"[^>]*>([\s\S]*?)<\/th>/);
    if(label){if(group.rows.length)groups.push(group);group={name:decode(label[1]),rows:[]};continue;}
    const cells=[...row.matchAll(/<td class="([^"]*)"[^>]*>([\s\S]*?)<\/td>/g)].filter(m=>/hide-on-medium-down/.test(m[1])).map(m=>m[2]);
    if(cells.length<headers.length)continue;
    const name=sidearmTeamName(cells[0]);if(!name)continue;
    const at=i=>i>=0?decode(cells[i]):'';
    group.rows.push({name,conf:at(conf),overall:at(overall),streak:at(streak).replace(/^-+$/,''),home:at(home),away:at(away)});
  }
  if(group.rows.length)groups.push(group);
  const title=decode((page.match(/<title>([\s\S]*?)<\/title>/)||[])[1]);
  return groups.length?{title,groups}:null;
}
// The school's tables from its conference's page: its division first when
// the conference has them (then the whole conference by conference record,
// then overall), else the conference in the page's order. `own(name)` says
// which row is the school's; no row is the school's, no table.
export function conferenceSiteStandings(html,{conference,sport,url,own}={}){
  const parsed=parseSidearmStandings(html);if(!parsed||typeof own!=='function')return[];
  const all=parsed.groups.flatMap(g=>g.rows);if(!all.some(r=>own(r.name)))return[];
  const season=(parsed.title.match(/^(20\d\d(?:-\d\d)?)\b/)||[])[1]||'';
  const source={name:`${conference} standings${season?` (${season} season)`:''}`,url};
  const make=(title,rows)=>({title,columns:COLUMNS,source,rows:rows.map((r,i)=>({pos:i+1,name:r.name,
    detail:[r.home&&`Home ${r.home}`,r.away&&`Away ${r.away}`].filter(Boolean).join(' · '),
    values:{conf:r.conf,overall:r.overall,streak:r.streak},...(own(r.name)?{own:true}:{})}))});
  if(parsed.groups.length<2||parsed.groups.some(g=>!g.name))return[make(conference,all)];
  const mine=parsed.groups.find(g=>g.rows.some(r=>own(r.name)));
  const whole=all.slice().sort((a,b)=>(pct(b.conf)??-1)-(pct(a.conf)??-1)||(pct(b.overall)??-1)-(pct(a.overall)??-1));
  return[make(`${conference} - ${mine.name.replace(/\s+Division$/i,'')}`,mine.rows),make(conference,whole)];
}
