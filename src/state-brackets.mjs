// KSHSAA state playoff brackets (user, November 18, 2026: "Start with 2":
// state playoff brackets with the app's schools highlighted, scores filled in
// as they are posted and the path to the title game).
//
// KSHSAA's own site (kshsaa.org/react) reads its brackets from its public
// API, kshsaa-api.kshsaa.org:
// - `/playoff-sites/state-sites/State/<Activity>/<ActivityID>` lists the
//   season's state sites, one per class, each with the id (`ID`) its bracket
//   is kept under;
// - `/Brackets/GameInfo/GetByWeekID/<ID>` is that class's bracket: every game
//   (`BracketsGameScores`) with its level (`PlayoffLevel`: football's "Week 9",
//   "Regional", "Sectional", "Sub-State", "State"), its round within the level
//   (`Round`: soccer's state semifinals 1 and final 2), its place in the round
//   (`BracketOrder`), both teams (`Team1Info.School`), seeds ("3W"), scores,
//   the game's status (final when it equals the payload's `FinalGameStatus`:
//   7 for football, 51 for soccer), `ExtraStatus` ("OT", "PKs") and
//   `GameInfo` ("Fri, 11/20 @ Derby", "Sat, 11/28 @ Butler CC - 1:00 pm").
// Fixtures of November 18, 2026 are in tests/fixtures/state-brackets.

export const KSHSAA_API='https://kshsaa-api.kshsaa.org';
export const KSHSAA_SITE='https://www.kshsaa.org';
// The app's sport, the activity KSHSAA keeps its bracket under, and the
// months its playoffs run (a bracket is shown from its first round until 60
// days after its state game).
export const KSHSAA_BRACKETS={
  Football:[{activity:'Football',id:1}],
  // Boys' soccer (fall): the state semifinals, third place and final.
  Soccer:[{activity:'Soccer',id:12,team:'Boys'}]
};
export const stateSitesUrl=({activity,id})=>`${KSHSAA_API}/playoff-sites/state-sites/State/${encodeURIComponent(activity)}/${id}`;
export const bracketUrl=weekId=>`${KSHSAA_API}/Brackets/GameInfo/GetByWeekID/${weekId}`;
export const bracketPage=weekId=>`${KSHSAA_SITE}/react/bracket/${weekId}`;

// The class brackets of the season's state sites.
export function stateSiteBrackets(payload){
  const sites=Array.isArray(payload?.siteData)?payload.siteData:[];
  return sites.filter(s=>s?.ID&&s.Class).map(s=>({weekId:s.ID,className:String(s.Class).trim(),date:s.GameDate||s.StartDate||null,site:s.SiteName||null,city:s.SiteCity||null}));
}

const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
// "Wichita-Northwest HS" and "Manhattan High School" both read by their
// name without "High School", "HS", "Jr/Sr"; "St." is "Saint", "Co" is
// "County".
export const bracketNameKey=s=>clean(s).toLowerCase().replace(/\(.*?\)/g,' ')
  .replace(/\b(?:junior\s*\/\s*senior|jr\.?\s*[-/]\s*sr\.?)\b/g,' ')
  .replace(/\b(?:high school|hs)\b/g,' ').replace(/\bst\.?\s/g,'saint ').replace(/\bco\b/g,'county')
  .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
// The name a card shows: "Derby HS" is "Derby".
export const bracketTeamName=s=>clean(s).replace(/\s+(?:HS|High School)$/i,'');
// A school's names: its catalog name, short name and aliases, exactly (an
// alias like "Blue Valley" must not match "Overland Park-Blue Valley HS").
export function bracketMatcher(school){
  const keys=new Set([school?.name,school?.short_name,...(school?.aliases||[])].filter(Boolean).map(bracketNameKey).filter(Boolean));
  return name=>!!name&&keys.has(bracketNameKey(name));
}

const LEVEL_NAMES={'Week 9':'First Round',State:'State Championship'};
const roundTitle=(level,round,rounds,games)=>{
  if(rounds<=1)return LEVEL_NAMES[level]||level;
  // A level of several rounds (soccer's state: semifinals, then the final).
  if(round===rounds)return level==='State'?'State Championship':`${level} Final`;
  const n=games*2;const name=n===4?'Semifinals':n===8?'Quarterfinals':`Round of ${n}`;
  return level==='State'?`State ${name}`:`${level} ${name}`;
};
// "Fri, 11/20 @ Derby" → 2026-11-20, "Derby"; "Sat, 11/28 @ Butler CC - 1:00 pm" → 13:00.
export function parseGameInfo(info,fallbackDate){
  const text=clean(info),year=Number(String(fallbackDate||'').slice(0,4))||null;
  const m=text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  let date=fallbackDate||null;
  if(m&&year){
    let y=m[3]?Number(m[3].length===2?`20${m[3]}`:m[3]):year;
    // A first-round game in the year before a January level date.
    const fm=Number(String(fallbackDate).slice(5,7));if(!m[3]&&fm&&Number(m[1])-fm>6)y-=1;
    date=`${y}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  }
  const t=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/i);
  const time=t?`${String((Number(t[1])%12)+(t[3].toLowerCase()==='p'?12:0)).padStart(2,'0')}:${t[2]||'00'}`:null;
  const at=text.match(/@\s*(.+?)(?:\s+-\s+\d{1,2}:\d{2}.*|\s+\d{1,2}(?::\d{2})?\s*[AP]M.*)?$/i);
  return{date,time,site:at?clean(at[1]):null,dated:!!(m&&year)};
}

// One class's bracket: its rounds in order, each game's teams, seeds, scores
// and winner, and the school's own games (`own`: a name matcher).
export function parseKshsaaBracket(payload,{own=null,sport=null}={}){
  const g=payload?.GameData?.[0];if(!g||!Array.isArray(g.BracketsGameScores))return null;
  const finalStatus=String(payload.FinalGameStatus??''),levelDates=payload.PlayoffLevelDates||{};
  const levels=Object.entries(levelDates).sort((a,b)=>String(a[1]).localeCompare(String(b[1]))).map(([name])=>name);
  const className=clean(g.class?.classdescription||g.Class),weekId=g.ID;
  const raw=g.BracketsGameScores.filter(x=>x&&x.PlayoffLevel);
  for(const x of raw)if(!levels.includes(x.PlayoffLevel))levels.push(x.PlayoffLevel);
  // A team's seed from its first game ("3W"); later rounds often leave it blank.
  const seeds=new Map();
  for(const x of [...raw].sort((a,b)=>levels.indexOf(a.PlayoffLevel)-levels.indexOf(b.PlayoffLevel)))for(const [info,seed] of [[x.Team1Info,x.Team1Seed],[x.Team2Info,x.Team2Seed]])if(info?.School&&seed!=null&&seed!==''&&!seeds.has(info.School))seeds.set(info.School,String(seed));
  const rounds=[];
  for(const level of levels){
    const inLevel=raw.filter(x=>x.PlayoffLevel===level);if(!inLevel.length)continue;
    const numbers=[...new Set(inLevel.map(x=>Number(x.Round)||0))].sort((a,b)=>a-b);
    numbers.forEach((number,i)=>{
      const list=inLevel.filter(x=>(Number(x.Round)||0)===number).sort((a,b)=>(Number(a.ThirdPlaceGame)||0)-(Number(b.ThirdPlaceGame)||0)||(Number(a.BracketOrder)||0)-(Number(b.BracketOrder)||0));
      const main=list.filter(x=>!Number(x.ThirdPlaceGame)).length;
      const games=list.map(x=>{
        // A game with no date of its own takes its round's ("Thurs, 11/5"
        // on the other semifinal; the level's date is the final's).
        let at=parseGameInfo(x.GameInfo,levelDates[level]||null);
        if(!at.dated){const twin=list.map(y=>parseGameInfo(y.GameInfo,levelDates[level]||null)).find(y=>y.dated);if(twin)at={...at,date:twin.date};}
        const final=finalStatus!==''&&String(x.StatusOfGame)===finalStatus&&!!x.Team1Info?.School&&!!x.Team2Info?.School;
        const s1=Number(x.Team1Score),s2=Number(x.Team2Score),p1=Number(x.Team1PKs)||0,p2=Number(x.Team2PKs)||0;
        const pks=/^pks?$/i.test(clean(x.ExtraStatus));
        const win1=final&&(s1>s2||s1===s2&&pks&&p1>p2),win2=final&&(s2>s1||s1===s2&&pks&&p2>p1);
        const team=(info,score,pk,win)=>info?.School?{name:bracketTeamName(info.School),source_name:info.School,seed:seeds.get(info.School)||null,score:final?score:null,...(final&&pks?{pks:pk}:{}),winner:win,own:!!own&&own(info.School)}:null;
        return{level,date:at.date,time:at.time,site:at.site,info:clean(x.GameInfo)||null,status:final?'Final':'Scheduled',extra:clean(x.ExtraStatus)||null,third_place:!!Number(x.ThirdPlaceGame),
          teams:[team(x.Team1Info,s1,p1,win1),team(x.Team2Info,s2,p2,win2)]};
      });
      rounds.push({name:roundTitle(level,i+1,numbers.length,main),level,date:levelDates[level]||games.find(x=>x.date)?.date||null,games});
    });
  }
  if(!rounds.length)return null;
  const mine=rounds.flatMap(r=>r.games.filter(x=>x.teams.some(t=>t?.own)).map(x=>({...x,round:r.name})));
  const lastFinal=rounds.at(-1).games.find(x=>!x.third_place);
  let state='in';
  if(mine.length){
    // The last game played decides: a semifinal loser who wins the
    // third-place game is third.
    const last=mine.filter(x=>x.status==='Final').at(-1);
    if(last?.third_place)state=last.teams.find(t=>t?.own).winner?'third':'fourth';
    else if(mine.some(x=>x.status==='Final'&&x.teams.some(t=>t?.own&&!t.winner)))state='out';
    else if(lastFinal&&lastFinal.status==='Final'&&lastFinal.teams.some(t=>t?.own&&t.winner))state='champion';
  }
  const champion=lastFinal?.status==='Final'?lastFinal.teams.find(t=>t?.winner)?.name||null:null;
  return{title:`KSHSAA ${className} ${sport||''} Playoffs`.replace(/\s+/g,' '),class_name:className,week_id:weekId,state_date:levelDates.State||rounds.at(-1).date,
    rounds,own_games:mine.length,status:mine.length?state:null,champion,
    source:{name:'KSHSAA (official bracket)',url:bracketPage(weekId)}};
}

// The school's games in the bracket, as the schedule needs them: date, time,
// opponent, home or away, and the score once final.
export function ownBracketGames(bracket){
  if(!bracket)return[];
  return bracket.rounds.flatMap(r=>r.games.filter(x=>x.teams.some(t=>t?.own)&&x.teams.every(Boolean)&&x.date).map(x=>{
    const i=x.teams.findIndex(t=>t.own),me=x.teams[i],them=x.teams[1-i];
    // Team1 is the host ("Fri, 11/20 @ Derby": Derby vs Manhattan; a
    // district stadium such as "CBAC" is still Team1's home); a state game
    // is at a neutral site.
    const relation=r.level==='State'||i===0?'vs':'at';
    return{round:r.name,date:x.date,time:x.time,site:x.site,opponent:them.name,opponent_seed:them.seed,relation,status:x.status,
      ...(x.status==='Final'?{result:me.winner?'W':them.winner?'L':'T',score:me.score,opponent_score:them.score,extra:x.extra}:{})};
  }));
}

// The bracket the page shows: kept from the first round until 60 days after
// the state game, and only when the school is in it.
export function bracketCurrent(bracket,today){
  if(!bracket?.own_games)return false;
  const first=bracket.rounds[0]?.date,last=bracket.state_date||bracket.rounds.at(-1)?.date;
  if(!first||!last)return false;
  const day=Date.parse(`${String(today).slice(0,10)}T00:00:00Z`),start=Date.parse(`${first}T00:00:00Z`),end=Date.parse(`${last}T00:00:00Z`)+60*86400000;
  return day>=start-7*86400000&&day<=end;
}
