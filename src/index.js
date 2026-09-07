import schools from './schools.json';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SAS-Sports/2.3.3; Cloudflare-Worker)',
  'Accept': 'text/html,application/xhtml+xml'
};

const SPORT_PATHS = {
  'Football':['football'], 'Volleyball':['womens-volleyball','volleyball'],
  "Women's Volleyball":['womens-volleyball','volleyball'], "Men's Volleyball":['mens-volleyball','volleyball'],
  'Soccer':['womens-soccer','soccer','mens-soccer'], "Women's Soccer":['womens-soccer','soccer'], "Men's Soccer":['mens-soccer','soccer'],
  'Cross Country':['cross-country'], 'Track & Field':['track-and-field','track-field'],
  'Basketball':['mens-basketball','womens-basketball','basketball'], "Men's Basketball":['mens-basketball','basketball'], "Women's Basketball":['womens-basketball','basketball'],
  'Baseball':['baseball'], 'Softball':['softball'], 'Wrestling':['wrestling'],
  'Swimming & Diving':['swimming-and-diving','swimming-diving','swimming'], 'Tennis':['womens-tennis','mens-tennis','tennis'],
  'Golf':['mens-golf','womens-golf','golf'], 'Rowing':['rowing'], 'Lacrosse':['womens-lacrosse','mens-lacrosse','lacrosse'],
  'Field Hockey':['field-hockey'], 'Hockey':['mens-ice-hockey','womens-ice-hockey','ice-hockey','hockey'],
  'Gymnastics':['womens-gymnastics','mens-gymnastics','gymnastics'], 'Beach Volleyball':['beach-volleyball'],
  'Water Polo':['womens-water-polo','mens-water-polo','water-polo'], 'Fencing':['fencing'], 'Bowling':['bowling'],
  'Equestrian':['equestrian'], 'Rifle':['rifle'], 'Skiing':['skiing'], 'Triathlon':['triathlon'],
  'Acrobatics & Tumbling':['acrobatics-tumbling','acrobatics-and-tumbling'], 'STUNT':['stunt']
};

const KNOWN_URLS = new Map(Object.entries({
  'kstate|Volleyball':'https://www.kstatesports.com/sports/womens-volleyball/schedule',
  'kstate|Soccer':'https://www.kstatesports.com/sports/womens-soccer/schedule',
  'kstate|Cross Country':'https://www.kstatesports.com/sports/cross-country/schedule',
  'kstate|Track & Field':'https://www.kstatesports.com/sports/track-and-field/schedule',
  'kstate|Football':'https://www.kstatesports.com/sports/football/schedule',
  'kansas|Volleyball':'https://kuathletics.com/sports/womens-volleyball/schedule/2026',
  'kansas|Soccer':'https://kuathletics.com/sports/womens-soccer/schedule/text',
  'kansas|Cross Country':'https://kuathletics.com/sports/cross-country/schedule',
  'kansas|Track & Field':'https://kuathletics.com/sports/track-and-field/schedule',
  'nebraska|Volleyball':'https://huskers.com/sports/volleyball/schedule?view=list',
  'nebraska|Soccer':'https://huskers.com/sports/soccer/schedule',
  'nebraska|Cross Country':'https://huskers.com/sports/cross-country/schedule/season/2026',
  'nebraska|Track & Field':'https://huskers.com/sports/track-and-field/schedule'
}));

const SEASONS = {
  'Football':[[8,1]], 'Volleyball':[[8,12]], "Men's Volleyball":[[1,5]], 'Soccer':[[8,12]],
  'Cross Country':[[8,11]], 'Field Hockey':[[8,11]], 'Golf':[[8,11],[2,6]], 'Tennis':[[9,11],[1,5]],
  'Swimming & Diving':[[9,3]], 'Wrestling':[[10,3]], 'Basketball':[[10,4]], 'Hockey':[[10,4]],
  'Gymnastics':[[1,4]], 'Track & Field':[[12,6]], 'Baseball':[[2,6]], 'Softball':[[2,6]],
  'Lacrosse':[[2,5]], 'Rowing':[[3,6],[9,11]], 'Beach Volleyball':[[2,5]], 'Water Polo':[[1,5],[8,12]],
  'Fencing':[[10,3]], 'Bowling':[[10,4]], 'Equestrian':[[9,11],[2,4]], 'Rifle':[[9,3]],
  'Skiing':[[1,3]], 'Triathlon':[[8,11]], 'Acrobatics & Tumbling':[[2,4]], 'STUNT':[[2,5]]
};

const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean = s => s == null ? null : (String(s).replace(/\s+/g,' ').replace(/^[ ,\t\r\n]+|[ ,\t\r\n]+$/g,'') || null);
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const decodeHtml = s => String(s).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'\"').replace(/&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');

function sportMatches(a,b){
  const n=s=>String(s).toLowerCase().replace(/\b(men's|women's|mens|womens)\b/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').trim();
  a=n(a); b=n(b); return a===b || a.includes(b) || b.includes(a);
}

function candidateUrls(school,sport){
  const out=[];
  const known=KNOWN_URLS.get(`${school.id}|${sport}`);
  if(known) out.push(known);
  const base=school.athletics_url.replace(/\/$/,'');
  for(const p of (SPORT_PATHS[sport] || [slug(sport)])) out.push(`${base}/sports/${p}/schedule`);
  // The athletics homepage/scoreboard is often fresher than a sport schedule page
  // immediately after an event ends. Merge it rather than trusting one page alone.
  out.push(`${base}/`);
  return [...new Set(out)];
}

function parseDate(dateText,timeText){
  if(!dateText) return null;
  const raw=`${dateText}${timeText?` ${timeText.replace(/\./g,'')}`:''}`.trim();
  const d=new Date(raw); return Number.isNaN(d.getTime())?null:d.toISOString();
}

function eventType(sport){
  if(['Cross Country','Track & Field','Golf','Gymnastics','Fencing','Bowling','Rifle','Skiing','Triathlon'].includes(sport)) return 'MEET';
  if(['Wrestling','Tennis','Swimming & Diving','Rowing','Equestrian','Beach Volleyball','Acrobatics & Tumbling','STUNT'].includes(sport)) return 'DUAL';
  return 'GAME';
}

function makeEvent({school,sport,status,relation,opponent,date,time,schoolScore,oppScore,resultText,sourceUrl,now}){
  const start=parseDate(date,time); let effective=status;
  if(status==='Upcoming' && start){
    const a=new Date(start), b=now;
    if(a.getUTCFullYear()===b.getUTCFullYear()&&a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()===b.getUTCDate()) effective='Today';
  }

  const id='live-'+slug(`${school.id}|${sport}|${date||''}|${opponent}|${effective}`).slice(0,180);
  const resultLabel=clean(resultText);

  return {
    id, school_id:school.id, school:school.name, sport, event_type:eventType(sport), status:effective,
    title:`${school.short_name} ${String(relation).toLowerCase()==='at'?'at':'vs'} ${opponent}`,
    start_time:start, opponent, school_score:schoolScore||null, opponent_score:oppScore||null,
    headline:resultLabel || (schoolScore&&oppScore?`${schoolScore}–${oppScore}`:null),
    team_summaries:[],
    results:resultLabel?[{label:'Result',value:resultLabel}]:[],
    source:{name:'Official athletics live schedule',url:sourceUrl,updated_at:now.toISOString()},
    result_count:resultLabel?1:0,
    has_more_results:false,enrichment_warning:null,
    priority_bucket:{Live:'live',Today:'today',Upcoming:'upcoming',Final:'recent_final'}[effective]||'other',
    recency_label:{Live:'Live now',Today:'Today',Upcoming:'Upcoming',Final:'Final'}[effective]||effective,
    last_verified_at:now.toISOString(), freshness_seconds:0, verification_state:'live_source', source_count:1, conflicting_sources:false
  };
}

function parseHtml(raw,school,sport,sourceUrl,now=new Date()){
  const text=decodeHtml(raw); const events=[]; const seen=new Set();

  const specs=[
    {status:'Live',kind:'live',re:/Live Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)(?:\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}))?(?=[\"<])/gi},
    {status:'Upcoming',kind:'upcoming',re:/Upcoming Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:\s+at\s+([^\"<]{1,20}))?(?=[\"<])/gi},
    {status:'Final',kind:'meet',re:/Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*,\s*([^\"<]+?)(?=[\"<])/gi},
    {status:'Final',kind:'score',re:/Completed Event:\s*(.+?)\s+(versus|vs\.?|at)\s+(.+?)\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*,\s*(?:(Win|Loss|Tie|Draw)?\s*,?\s*)?(\d+(?:\.\d+)?)?\s*,?\s*(?:to|-)?\s*,?\s*(\d+(?:\.\d+)?)?(?=[\"<])/gi}
  ];

  for(const spec of specs){
    let m;
    while((m=spec.re.exec(text))){
      const parsedSport=clean(m[1])||sport;
      if(!sportMatches(sport,parsedSport)) continue;

      const opponent=clean(m[3]);
      if(!opponent) continue;
      // Sidearm tournament pages can include neutral-site matches between other teams.
      if(/\b(?:vs\.?|versus)\b/i.test(opponent)) continue;

      const e=makeEvent({
        school,
        sport,
        status:spec.status,
        relation:clean(m[2])||'vs',
        opponent,
        date:clean(m[4]),
        time:spec.kind==='upcoming'?clean(m[5]):null,
        schoolScore:spec.kind==='score'?clean(m[6]):null,
        oppScore:spec.kind==='score'?clean(m[7]):null,
        resultText:spec.kind==='meet'?clean(m[5]):null,
        sourceUrl,
        now
      });

      if(!seen.has(e.id)){
        seen.add(e.id);
        events.push(e);
      }
    }
  }

  const rank={Live:0,Today:1,Upcoming:2,Final:3,Unknown:4};
  return events.sort((a,b)=>{
    const r=(rank[a.status]??4)-(rank[b.status]??4);
    if(r) return r;
    const ta=a.start_time?Date.parse(a.start_time):0, tb=b.start_time?Date.parse(b.start_time):0;
    return a.status==='Final'?tb-ta:ta-tb;
  });
}

function eventMergeKey(e){
  const day=e.start_time?e.start_time.slice(0,10):'';
  return `${e.school_id}|${e.sport}|${slug(e.opponent||'')}|${day}`;
}

function mergeEvents(eventLists){
  const statusWeight={Unknown:0,Upcoming:1,Today:2,Live:3,Final:4};
  const byKey=new Map();
  for(const events of eventLists){
    for(const e of events){
      const key=eventMergeKey(e);
      const prev=byKey.get(key);
      if(!prev){byKey.set(key,e);continue;}
      const ew=statusWeight[e.status]??0, pw=statusWeight[prev.status]??0;
      const eDetail=(e.school_score&&e.opponent_score?2:0)+(e.result_count||0);
      const pDetail=(prev.school_score&&prev.opponent_score?2:0)+(prev.result_count||0);
      if(ew>pw || (ew===pw && eDetail>pDetail)) byKey.set(key,e);
    }
  }
  return [...byKey.values()];
}

function inSeason(sport,month){
  const windows=SEASONS[sport]; if(!windows) return true;
  return windows.some(([a,b])=>a<=b ? month>=a&&month<=b : month>=a||month<=b);
}

function groupEvents(events,now=new Date()){
  if(!events.length) return [];
  const sport=events[0].sport, school=events[0]; const live=[],results=[],upcoming=[],other=[];

  for(const e of events){
    if(e.status==='Live')live.push(e);
    else if(e.status==='Final')results.push(e);
    else if(e.status==='Upcoming'||e.status==='Today')upcoming.push(e);
    else other.push(e);
  }

  results.sort((a,b)=>(Date.parse(b.start_time)||0)-(Date.parse(a.start_time)||0));
  upcoming.sort((a,b)=>(Date.parse(a.start_time)||Infinity)-(Date.parse(b.start_time)||Infinity));

  const active=inSeason(sport,now.getUTCMonth()+1);
  const latest=results.map(e=>e.start_time).filter(Boolean).sort().at(-1)||null;
  const next=upcoming.map(e=>e.start_time).filter(Boolean).sort()[0]||null;

  return [{school_id:school.school_id,school:school.school,sport,in_season:active,season_label:active?'In season':'Out of season',live,results,upcoming,other,latest_activity_at:latest,next_activity_at:next}];
}

async function fetchLive(schoolId,sport){
  const school=schools.find(s=>s.id===schoolId); const now=new Date();
  if(!school) return {events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:'School not found'};

  const urls=candidateUrls(school,sport);
  const errors=[];
  const successful=[];

  const responses=await Promise.allSettled(urls.map(async url=>{
    const r=await fetch(url,{headers:HEADERS,redirect:'follow'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const html=await r.text();
    const finalUrl=r.url||url;
    return {url:finalUrl,events:parseHtml(html,school,sport,finalUrl,now)};
  }));

  for(let i=0;i<responses.length;i++){
    const item=responses[i];
    if(item.status==='fulfilled'){
      if(item.value.events.length) successful.push(item.value);
      else errors.push(`No schedule events parsed from ${item.value.url}`);
    }else{
      errors.push(`${urls[i]}: ${item.reason?.message||item.reason?.name||'FetchError'}`);
    }
  }

  const events=mergeEvents(successful.map(x=>x.events));
  if(events.length){
    return {
      events,
      source_url:successful[0]?.url||null,
      source_urls:successful.map(x=>x.url),
      fetched_at:now.toISOString(),
      live_source_used:true,
      error:null
    };
  }

  return {events:[],source_url:null,source_urls:[],fetched_at:now.toISOString(),live_source_used:false,error:errors.slice(-4).join('; ')||'No live source available'};
}

export default {
  async fetch(request, env){
    const url=new URL(request.url);

    if(url.pathname==='/web') return env.ASSETS.fetch(new Request(new URL('/index.html',url),request));

    if(url.pathname==='/api/status') return json({name:'SAS Sports API',version:'2.3.3',mode:'cloudflare-worker-live',web_live_mode:true,school_catalog_count:schools.length,web_path:'/'});

    if(url.pathname==='/schools'){
      let list=schools;
      const q=(url.searchParams.get('q')||'').toLowerCase(),
            conference=url.searchParams.get('conference'),
            state=url.searchParams.get('state');

      if(q) list=list.filter(s=>[s.id,s.name,s.short_name,...(s.aliases||[])].join(' ').toLowerCase().includes(q));
      if(conference) list=list.filter(s=>s.conference.toLowerCase()===conference.toLowerCase());
      if(state) list=list.filter(s=>s.state.toLowerCase()===state.toLowerCase());

      return json(list);
    }

    if(url.pathname==='/live/feed/grouped'){
      const school=url.searchParams.get('school'), sport=url.searchParams.get('sport');
      if(!school||!sport) return json({detail:'school and sport are required'},400);

      const result=await fetchLive(school,sport);
      if(!result.events.length) return json({detail:{message:'Live source returned no usable events',source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,error:result.error}},502);

      return json(groupEvents(result.events));
    }

    if(url.pathname==='/live/status'){
      const school=url.searchParams.get('school'), sport=url.searchParams.get('sport');
      if(!school||!sport) return json({detail:'school and sport are required'},400);

      const result=await fetchLive(school,sport);
      return json({school,sport,live_source_used:result.live_source_used,source_url:result.source_url,source_urls:result.source_urls,fetched_at:result.fetched_at,event_count:result.events.length,error:result.error});
    }

    return env.ASSETS.fetch(request);
  }
};
