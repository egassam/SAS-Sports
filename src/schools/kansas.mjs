import verifiedGolf from './kansas-golf-results.json' with {type:'json'};
// Kansas owns its sources, publisher payload, result identity, and verified athletes.
// Shared transport, cache, display, and event structures remain in the Worker.
export {isKansasCrossCountry,applyVerifiedKansasMeet,attachKansasRaceDocuments} from '../kansas-cross-country.mjs';

export const kansasSchool={
  id:'kansas',
  combinedSports:new Set(['Basketball','Golf']),
  liveScoreboards:{
    Football:[{path:'football/college-football',teamId:'2305',sourceName:'Live college football scoreboard'}],
    Basketball:[
      {path:'basketball/mens-college-basketball',teamId:'2305',team_label:"Men's",sourceName:"Live men's college basketball scoreboard"},
      {path:'basketball/womens-college-basketball',teamId:'2305',team_label:"Women's",sourceName:"Live women's college basketball scoreboard"}
    ]
  },
  scheduleUrls:{
  'kansas|Volleyball':'https://kuathletics.com/sports/wvball/schedule',
  'kansas|Soccer':'https://kuathletics.com/sports/wsoc/schedule',
  'kansas|Cross Country':'https://kuathletics.com/sports/cross-country/schedule',
  'kansas|Track & Field':'https://kuathletics.com/sports/track-and-field/schedule',
  'kansas|Football':'https://kuathletics.com/sports/football/schedule',
  'kansas|Swimming & Diving':'https://kuathletics.com/sports/womens-swimming-and-diving/schedule',
  'kansas|Rowing':'https://kuathletics.com/sports/womens-rowing/schedule',
    'kansas|Baseball':'https://kuathletics.com/sports/baseball/schedule',
    'kansas|Basketball':['https://kuathletics.com/sports/mens-basketball/schedule','https://kuathletics.com/sports/womens-basketball/schedule'],
    'kansas|Golf':['https://kuathletics.com/sports/womens-golf/schedule','https://kuathletics.com/sports/mens-golf/schedule'],
    'kansas|Softball':'https://kuathletics.com/sports/softball/schedule',
    'kansas|Tennis':'https://kuathletics.com/sports/womens-tennis/schedule'
  },
  verifiedInstagrams:{
  'kansas|Cross Country|Emmah Jemutai':'https://www.instagram.com/emmah_jemutai/',
  'kansas|Cross Country|Mia Murray':'https://www.instagram.com/_mia.murray/',
  'kansas|Soccer|Sophie Dawe':'https://www.instagram.com/sophia.dawe/',
  'kansas|Soccer|Marit McLaughlin':'https://www.instagram.com/marit.mclaughlin/',
  'kansas|Soccer|Livvy Moore':'https://www.instagram.com/livvy.moore/',
  'kansas|Golf|Lyla Louderbaugh':'https://www.instagram.com/lyla_louderbaugh/',
  'kansas|Golf|Ebba Nordstedt':'https://www.instagram.com/ebbaanordstedt/',
  'kansas|Golf|Anna Wallin':'https://www.instagram.com/annawalliinn/',
  }
};

// Read only the selected schedule object, never the unrelated scoreboard/news
// widgets also present in Nuxt's reference-indexed payload. No eval or recursion
// through the entire application graph; publisher cycles/deep data are bounded.
export function kansasScheduleData(raw){
  const match=String(raw).match(/<script\b[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if(!match)return null;
  try{
    const data=JSON.parse(match[1]);
    if(!Array.isArray(data))return null;
    const item=data.find(value=>value&&typeof value==='object'&&!Array.isArray(value)&&'games' in value&&'season' in value&&'sport' in value);
    if(!item)return null;
    const decode=(ref,depth=0)=>{
      if(!Number.isInteger(ref)||ref<0||ref>=data.length||depth>18)return null;
      const value=data[ref];
      if(Array.isArray(value))return value.map(index=>decode(index,depth+1));
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,index])=>[key,decode(index,depth+1)]));
      return value;
    };
    const schedule=Object.fromEntries(['sport','season','games'].map(key=>[key,decode(item[key])]));
    return Array.isArray(schedule.games)?schedule:null;
  }catch{return null;}
}

function golfFacts(article,record){
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const names=new Map();for(const row of record.rows){names.set(row.participant.toLowerCase(),row.participant);names.set(row.participant.split(' ').at(-1).toLowerCase(),row.participant);}
 const re=new RegExp(`\\b(?:${[...names.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')}|T?\\d+(?:[.:]\\d+)*(?:st|nd|rd|th)?)(?!\\w)`,'gi');
 return [...article.matchAll(re)].map(m=>names.get(m[0].toLowerCase())||m[0].toLowerCase());
}
function golfFingerprint(article,record){let hash=2166136261;for(const c of golfFacts(article,record).join('|'))hash=Math.imul(hash^c.codePointAt(0),16777619)>>>0;return String(hash);}

export function createKansasHandlers({makeEvent,clean,sportMatches,recapMatchesEvent,recapArticleText,visibleText,ordinal}){
  const officialUrl=(value,base)=>{
    try{const url=new URL(value,base);return url.protocol==='https:'&&url.hostname==='kuathletics.com'?url.href:null;}catch{return null;}
  };
  function parseSchedule(raw,school,sport,sourceUrl,now){
    if(school.id!=='kansas'||!officialUrl(sourceUrl,sourceUrl))return null;
    const data=kansasScheduleData(raw);
    if(!data?.sport?.title||!sportMatches(data.sport.title,sport))return null;
    const events=[];
    const division=/^Women's/i.test(data.sport.title)?"Women's":/^Men's/i.test(data.sport.title)?"Men's":null;
    for(const game of data.games){
      const day=game?.date?.slice(0,10),opponent=clean(game?.opponent?.title);
      if(!opponent||!/^20\d{2}-\d{2}-\d{2}$/.test(day||''))continue;
      const future=day>now.toISOString().slice(0,10);
      const result=future?{}:game.result||{},ours=clean(result.team_score),theirs=clean(result.opponent_score),scored=ours!==null&&theirs!==null;
      const summary=clean([result.prescore_info,scored?`${result.status==='N'?'':result.status||''} ${ours}-${theirs}`:null,result.postscore_info].filter(Boolean).join(' '));
      const end=game.enddate?.slice(0,10),endDay=end&&end>=day?end:day;
      const past=Date.parse(endDay+'T23:59:59Z')<now.getTime();
      const meet=['Cross Country','Golf','Track & Field'].includes(sport)||((sport==='Tennis'||sport==='Rowing')&&endDay>day);
      const complete=!future&&(scored||Boolean(summary)||game.game_state_display==='GAMECOMPLETE');
      const status=complete?'Final':past&&meet?'Final':past?'Unknown':'Upcoming';
      const date=new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
      const event=makeEvent({school,sport,status,relation:game.at_vs||'vs',opponent,date,time:game.time,schoolScore:ours,oppScore:theirs,resultText:summary||(past&&meet?'Completed':null),sourceUrl,now});
      if(!future&&/INPROGRESS|IN_PROGRESS|LIVE/.test(game.game_state_display||'')){event.status='Live';event.priority_bucket='live';event.recency_label='Live now';}
      event.end_time=endDay+'T23:59:59Z';
      event.official_event_id=String(game.id);
      // Separate same-day doubleheaders and gender-specific competitions.
      event.id=`live-kansas-${sport.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${game.id}`;
      if(division){event.team_label=division;event.title=`${division} · ${event.title}`;}
      if(meet&&event.event_type==='DUAL')event.event_type='MEET';
      if(past&&!complete&&!meet){event.status='Unknown';event.priority_bucket='other';event.recency_label='Result pending';event.headline='Official result not yet published';}
      if(endDay>day&&!past&&!complete&&day<now.toISOString().slice(0,10)){event.status='Live';event.priority_bucket='live';event.recency_label='Tournament in progress';}
      if(/cancel|postpon|abandon/i.test(game.noplay_text||'')){
        event.status='Unknown';event.priority_bucket='other';event.recency_label=clean(game.noplay_text);event.headline=clean(game.noplay_text);event.results=[];event.result_count=0;
      }
      const recap=result.recap?.url?officialUrl(result.recap.url,sourceUrl):null;
      if(result.recap?.url&&recap)event.recap_url=recap;
      // KU's 9/11/2026 SDSU card points to the later Wichita State recap.
      // Repair only this exact published mistake; corrected or future cards
      // keep their own source. The normal fetched-article identity check still
      // validates the replacement before any highlights are accepted.
      if(sport==='Volleyball'&&event.official_event_id==='20586'&&day==='2026-09-11'&&opponent==='South Dakota State'&&division==="Women's"&&recap==='https://kuathletics.com/news/2026/9/15/womens-volleyball-jayhawks-earn-fourth-straight-sweep-in-win-over-shockers'){
        event.recap_url='https://kuathletics.com/news/2026/9/11/womens-volleyball-kansas-earns-second-straight-sweep-in-win-over-south-dakota-state';
      }
      const boxscore=result.boxscore?.url;
      if(boxscore)event.boxscore_url=officialUrl(boxscore,sourceUrl);
      if(sport==='Golf'&&summary&&event.status==='Final'){
        event.results=[{group:`${division||''} Team`.trim(),participant:'Kansas team',result:summary}];event.result_count=1;
      }
      if(past&&meet&&!summary&&!event.kansas_results_verified)event.highlight_status='The event has ended; detailed official results are pending.';
      events.push(event);
    }
    return events;
  }
  function matchesRecap(raw,event,url){
    if(event.school_id!=='kansas')return false;
    if(!officialUrl(url,url))return false;
    const division=event.team_label;
    const path=new URL(url).pathname;
    if(division==="Women's"&&/\/mens-/.test(path)||division==="Men's"&&/\/womens-/.test(path))return false;
    // Final tournament recaps are dated at the END of the published range.
    // Never relax a game to an arbitrary nearby tournament or another year.
    const identity=event.event_type==='MEET'&&event.end_time?{...event,start_time:event.end_time}:event;
    return recapMatchesEvent(raw,identity,url);
  }
  function applyGolfRecap(event,raw,url){
    if(event.school_id!=='kansas'||event.sport!=='Golf'||event.status!=='Final'||!matchesRecap(raw,event,url))return false;
    const record=verifiedGolf.find(item=>item.official_event_id===event.official_event_id&&item.date===event.start_time?.slice(0,10)&&item.event===event.opponent&&item.division===event.team_label&&item.recap_url===url);
    if(!record)return false;
    // Exact-event reviewed facts must not survive a changed/corrected article.
    const article=recapArticleText(raw);
    if(golfFingerprint(article,record)!==record.article_fingerprint)return false;
    const team=(event.results||[]).filter(row=>/\bteam$/i.test(row.participant||''));
    event.results=[...team,...record.rows.map(row=>({...row}))];
    event.result_count=event.results.length;event.has_more_results=event.results.length>3;event.recap_result_count=event.results.length;event.meet_results_verified=true;
    event.highlights=[`Kansas ${event.team_label.toLowerCase()} team result: ${event.headline}.`,`${record.rows[0].participant} led the listed Kansas finishers with a finish of ${record.rows[0].result}.`,`${record.rows.length} Kansas golfers have individual placings in the official recap.`];
    event.highlights_verified=true;event.highlight_state='verified';event.results_verified_at=record.verified_at;
    event.highlight_status='Individual placings are from the official recap. Open the recap for round scores and additional detail.';
    // The Red Sky schedule reports a first-round score in its team-total field.
    // Preserve the placing/relative-to-par figures and explain the discrepancy.
    if(event.official_event_id==='20711'){
      event.headline='8th · -12';event.results[0].result=event.headline;
      event.highlights[0]="Kansas women's team finished eighth at 12 under par.";
      event.highlight_status='The schedule lists 291 in its total field; the recap lists rounds of 291–283–278. Individual placings below are verified from the recap.';
    }
    return true;
  }
  return {parseSchedule,matchesRecap,applyGolfRecap,hasReviewedGolf:event=>event.school_id==='kansas'&&event.sport==='Golf'&&event.status==='Final'&&verifiedGolf.some(record=>record.official_event_id===event.official_event_id&&record.date===event.start_time?.slice(0,10)&&record.event===event.opponent&&record.division===event.team_label)};
}
